import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RevenueCat 웹훅 인증 토큰 (RevenueCat 대시보드에서 설정한 값)
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? ''

serve(async (req: Request) => {
  // RevenueCat Authorization 헤더 검증
  const auth = req.headers.get('Authorization') ?? ''
  if (WEBHOOK_AUTH && auth !== WEBHOOK_AUTH) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const event = body?.event
  if (!event) return new Response('No event', { status: 400 })

  const eventType: string  = event.type
  const expiresMs: number | null = event.expiration_at_ms ?? null
  const entitlementIds: string[] = event.entitlement_ids ??
    (event.entitlement_id ? [event.entitlement_id] : [])

  // TRANSFER 이벤트: app_user_id 없이 transferred_from/to 배열 사용
  let appUserId: string = event.app_user_id ?? ''
  if (!appUserId && eventType === 'TRANSFER') {
    const validId = (event.transferred_to ?? []).find(
      (id: string) => !id.startsWith('$RCAnonymousID')
    )
    appUserId = validId ?? ''
  }

  // app_user_id 없는 이벤트는 무시하고 200 반환 (RevenueCat 재시도 방지)
  if (!appUserId) {
    console.log(`[Webhook] ${eventType} | app_user_id 없음, 스킵`)
    return new Response('OK', { status: 200 })
  }

  // Supabase Admin Client (서비스 롤 키로 RLS 우회)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 플랜 결정 (이벤트의 entitlement_ids 기준)
  let plan = 'free'
  if (entitlementIds.includes('pro_entitlement'))           plan = 'pro'
  else if (entitlementIds.includes('standard_entitlement')) plan = 'standard'

  const ACTIVE_EVENTS   = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'TRANSFER']

  if (ACTIVE_EVENTS.includes(eventType)) {
    // ── 활성 이벤트: 플랜 활성화 ──────────────────────────────────────────
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan,
      status: 'active',
      current_period_end: expiresMs ? new Date(expiresMs).toISOString() : null,
      cancel_at_period_end: false,
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)

  } else if (eventType === 'CANCELLATION') {
    // ── 취소: 기간 만료 전까지 여전히 접근 가능 ────────────────────────────
    // status: 'active' 유지, cancel_at_period_end: true 로 표시
    // entitlement_ids가 비어있을 수 있으므로 현재 DB 플랜을 우선 유지
    const { data: current } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', appUserId)
      .single()
    const keepPlan = plan !== 'free' ? plan : (current?.plan ?? 'free')
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan: keepPlan,
      status: 'active',
      current_period_end: expiresMs ? new Date(expiresMs).toISOString() : null,
      cancel_at_period_end: true,
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)

  } else if (eventType === 'BILLING_ISSUE') {
    // ── 결제 실패: past_due ─────────────────────────────────────────────
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan,
      status: 'past_due',
      cancel_at_period_end: false,
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)

  } else if (eventType === 'EXPIRATION' || eventType === 'REFUND') {
    // ── 실제 종료: free로 다운그레이드 ────────────────────────────────────
    // 단, 더 높은 활성 플랜이 DB에 있으면 스킵 (업그레이드 시 구 플랜 만료 방지)
    const planRank: Record<string, number> = { free: 0, standard: 1, pro: 2 }
    const { data: current } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', appUserId)
      .single()
    const currentRank = planRank[current?.plan ?? 'free'] ?? 0
    const eventRank   = planRank[plan] ?? 0
    if (current?.status === 'active' && !current?.cancel_at_period_end && currentRank > eventRank) {
      console.log(`[Webhook] ${eventType} | user: ${appUserId} | DB 플랜(${current.plan}) > 이벤트 플랜(${plan}) → 스킵`)
      return new Response('OK', { status: 200 })
    }
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan: 'free',
      status: 'canceled',
      current_period_end: null,
      cancel_at_period_end: false,
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)

    // 결제 Pro 이용 중에 등록해 적립해 둔 프로모션 쿠폰이 있으면 여기서 활성화.
    // 적립분이 없으면 no-op이라 무조건 호출해도 안전하다.
    const { data: promo, error: promoErr } = await supabase.rpc('activate_pending_promo', {
      p_user_id: appUserId,
    })
    if (promoErr) console.error('[Webhook] activate_pending_promo 오류:', promoErr)
    else if (promo?.activated) console.log(`[Webhook] 적립 프로모션 활성화 | ${appUserId} | ${promo.days}일`)
  }

  console.log(`[Webhook] ${eventType} | user: ${appUserId} | plan: ${plan}`)
  return new Response('OK', { status: 200 })
})
