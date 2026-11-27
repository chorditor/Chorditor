import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RevenueCat 웹훅 인증 토큰 (RevenueCat 대시보드에서 설정한 값)
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? ''

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 상품 구분 — 스토어마다 상품 id 뒤에 기본 요금제가 붙을 수 있어(예: pro_monthly:base) 앞부분으로 판단
function productKind(productId: string): string {
  const id = (productId || '').split(':')[0]
  if (id.includes('pro_yearly')) return 'sub_yearly'
  if (id.includes('pro_monthly')) return 'sub_monthly'
  if (/^peakbox_(10|30|50|100)$/.test(id)) return id
  return 'other'
}
const msToIso = (ms: unknown) => (typeof ms === 'number' && ms > 0 ? new Date(ms).toISOString() : null)
const numOrNull = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null)

// 매출 기록 — revenue_events에 이벤트 한 줄(재전송은 event_id 충돌로 무시). 실패해도 throw하지 않음
async function recordRevenueEvent(supabase: any, event: Record<string, any>, eventType: string, appUserId: string) {
  const eventId: string = event.id ?? ''
  if (!eventId) { console.error(`[Webhook] 매출 기록 스킵 | event.id 없음 | ${eventType}`); return }
  try {
    const { error } = await supabase.from('revenue_events').upsert({
      event_id: eventId,
      event_type: eventType,
      user_id: UUID_RE.test(appUserId) ? appUserId : null,
      app_user_id: appUserId || null,
      product_id: event.product_id ?? null,
      product_kind: productKind(event.product_id ?? ''),
      period_type: event.period_type ?? null,
      store: event.store ?? null,
      environment: event.environment ?? null,
      price_in_purchased_currency: numOrNull(event.price_in_purchased_currency),
      currency: event.currency ?? null,
      price_usd: numOrNull(event.price),
      takehome_percentage: numOrNull(event.takehome_percentage),
      country_code: event.country_code ?? null,
      transaction_id: event.transaction_id ?? null,
      original_transaction_id: event.original_transaction_id ?? null,
      purchased_at: msToIso(event.purchased_at_ms),
      expiration_at: msToIso(event.expiration_at_ms),
      event_at: msToIso(event.event_timestamp_ms),
      raw: event,
    }, { onConflict: 'event_id', ignoreDuplicates: true })
    if (error) console.error('[Webhook] 매출 기록 오류:', error)
  } catch (e) {
    console.error('[Webhook] 매출 기록 예외:', e)
  }
}

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

  // Supabase Admin Client (서비스 롤 키로 RLS 우회)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // ── 매출 기록(2026-11-27, supabase/revenue_events.sql) — 모든 결제 이벤트를 아래 처리(플랜 변경·상자 지급)보다 먼저 한 줄씩 남김.
  //    app_user_id가 없는 이벤트도 남김(user_id = null). 같은 이벤트 재전송은 event_id로 한 번만. 기록이 실패해도 결제 처리는 막지 않음(로그만)
  await recordRevenueEvent(supabase, event, eventType, appUserId)

  // app_user_id 없는 이벤트는 무시하고 200 반환 (RevenueCat 재시도 방지)
  if (!appUserId) {
    console.log(`[Webhook] ${eventType} | app_user_id 없음, 스킵`)
    return new Response('OK', { status: 200 })
  }

  // ── 피크상자(소비성 상품, 2026-11-26 B6 — supabase/peakbox_purchase.sql) ─────────────
  // 구독 처리보다 먼저 가른다: 소비성 상품의 환불도 CANCELLATION으로 오는데, 아래 구독 분기로 흘러가면
  // 구독 상태(cancel_at_period_end 등)를 잘못 바꾼다.
  const productId: string = event.product_id ?? ''
  if (productId.startsWith('peakbox_')) {
    // 상자 지급은 위조되면 곧 돈이므로 인증 값이 설정돼 있지 않으면 처리하지 않는다(500 → RevenueCat이 재시도, 설정 후 처리됨)
    if (!WEBHOOK_AUTH) {
      console.error('[Webhook] REVENUECAT_WEBHOOK_AUTH 미설정 — 피크상자 이벤트 처리 거부')
      return new Response('Webhook auth not configured', { status: 500 })
    }
    // 앱은 구매 전에 Supabase 유저 id로 RevenueCat 로그인 — 익명 id($RCAnonymousID…)면 지급할 계정이 없음(재시도해도 같아서 200)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appUserId)) {
      console.error(`[Webhook] 피크상자 ${eventType} | 계정 아님(${appUserId}) — 수동 확인 필요 | ${productId}`)
      return new Response('OK', { status: 200 })
    }
    const txn: string = event.transaction_id ?? event.original_transaction_id ?? ''
    if (!txn) {
      console.error(`[Webhook] 피크상자 ${eventType} | transaction_id 없음 | user: ${appUserId}`)
      return new Response('OK', { status: 200 })
    }
    if (eventType === 'NON_RENEWING_PURCHASE') {
      const { data, error } = await supabase.rpc('grant_peakbox_purchase', {
        p_user_id: appUserId, p_transaction_id: txn, p_product_id: productId,
        p_environment: event.environment ?? null, p_event_id: event.id ?? null,
      })
      if (error) {   // DB 오류는 재시도 받도록 500
        console.error('[Webhook] grant_peakbox_purchase 오류:', error)
        return new Response('Grant failed', { status: 500 })
      }
      console.log(`[Webhook] 피크상자 지급 | ${appUserId} | ${productId} | ${txn} | ${JSON.stringify(data)}`)
    } else if (eventType === 'CANCELLATION' || eventType === 'REFUND') {
      const { data, error } = await supabase.rpc('refund_peakbox_purchase', { p_transaction_id: txn })
      if (error) {
        console.error('[Webhook] refund_peakbox_purchase 오류:', error)
        return new Response('Refund failed', { status: 500 })
      }
      console.log(`[Webhook] 피크상자 환불 회수 | ${appUserId} | ${productId} | ${txn} | ${JSON.stringify(data)}`)
    } else {
      console.log(`[Webhook] 피크상자 ${eventType} | 처리 안 함 | ${txn}`)
    }
    return new Response('OK', { status: 200 })
  }

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
