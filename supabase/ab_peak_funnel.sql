-- ───────────────────────────────────────────────────────────
-- A/B 실험: 피크부족 → 구독 퍼널 (테이블 추가 없음, user_id 결정론적 분기)
--   그룹 배정 규칙(클라 shared.js _peakFunnelGroup() 과 100% 동일):
--     uuid 첫 hex 문자 짝수(0·2·4·6·8·a·c·e) → 'A', 홀수 → 'B'
--   A = 피크 부족 시 즉시 구독시트(paywall) — 기존 동작
--   B = 피크 부족 시 완충 모달 먼저 → 유저가 CTA 누를 때만 구독시트
--
--   ※ 이 SQL은 "분석 편의용" 참고본. 실제 배포 불필요(테이블/함수 없어도 됨).
--     직접 쿼리 짤 때 아래 CASE 식만 그대로 붙여 쓰면 됨.
--   ※ 클라가 각 이벤트에 ab_group 을 직접 실어 보내므로(peak_insufficient/
--     paywall_view/peak_buffer_*), 이벤트의 properties->>'ab_group' 을 그대로 써도 됨.
--     아래 user_id 기반 CASE 는 ab_group 이 없는 다른 이벤트까지 세그먼트할 때 사용.
--   ※ analytics_events 의 props jsonb 컬럼명은 실제로 'properties'. view 필터 등은
--     properties->>'view' = 'home' 형태로 사용.
-- ───────────────────────────────────────────────────────────

-- 그룹 배정 CASE 식 (재사용)
--   substr(user_id::text, 1, 1) in ('0','2','4','6','8','a','c','e') → 'A' else 'B'

-- ── 선택: 헬퍼 함수로 만들어두면 쿼리가 짧아짐 ──────────────
create or replace function public.ab_peak_group(p_user_id uuid)
returns text language sql immutable as $$
  select case
    when substr(p_user_id::text, 1, 1) in ('0','2','4','6','8','a','c','e') then 'A'
    else 'B'
  end;
$$;

-- ── 그룹별 인원 분포 확인 (균형 sanity check) ──────────────
-- select public.ab_peak_group(user_id) as grp, count(*)
-- from public.subscriptions
-- group by 1;

-- ───────────────────────────────────────────────────────────
-- 핵심 퍼널 지표: 그룹별 (피크부족 도달 유저) → (결제창 진입 유저) 전환율
--   분모 = peak_insufficient 를 1회 이상 발생시킨 distinct user
--   분자 = 그 중 plan_upgrade_started(결제창 진입) 를 1회 이상 발생시킨 user
--   analytics_events 스키마: (user_id uuid, event_name text, created_at, props jsonb)
--   ※ 컬럼명이 다르면(event/type 등) 맞게 바꿔서 사용.
-- ───────────────────────────────────────────────────────────
-- with insufficient as (
--   select distinct user_id
--   from public.analytics_events
--   where event_name = 'peak_insufficient' and user_id is not null
-- ),
-- converted as (
--   select distinct user_id
--   from public.analytics_events
--   where event_name = 'plan_upgrade_started' and user_id is not null
-- )
-- select
--   public.ab_peak_group(i.user_id) as grp,
--   count(*)                                      as reached_paywall_funnel, -- 분모
--   count(c.user_id)                              as proceeded_to_payment,   -- 분자
--   round(100.0 * count(c.user_id) / count(*), 2) as conv_pct
-- from insufficient i
-- left join converted c on c.user_id = i.user_id
-- group by 1
-- order by 1;

-- ───────────────────────────────────────────────────────────
-- B그룹 내부 드롭오프 (완충 모달 단계별)
--   peak_buffer_shown → peak_buffer_cta → paywall_view(trigger='peak_buffer')
-- ───────────────────────────────────────────────────────────
-- select event_name, count(distinct user_id)
-- from public.analytics_events
-- where event_name in ('peak_buffer_shown', 'peak_buffer_cta')
--    or (event_name = 'paywall_view' and properties->>'trigger' = 'peak_buffer')
-- group by 1;
