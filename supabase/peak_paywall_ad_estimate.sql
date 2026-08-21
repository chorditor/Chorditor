-- ───────────────────────────────────────────────────────────
-- 유저선택형 인앱광고 도입 사전조사: 피크 소진 → 페이월 도달 유저 규모
--   기간: 2026-08-07 ~ 현재
--   집계 대상: user_id NOT NULL (로그인 유저만, anon_id 병합 금지 — feedback_analytics_login_only)
--   페이월 도달 이벤트 = 'peak_insufficient' (shared.js consumePeak, 재화 부족 시 1회 발화)
--   DAU 기준 이벤트 = 'app_open'
-- ───────────────────────────────────────────────────────────

-- 1) 일자별: DAU / 페이월 도달 유니크 유저 / DAU 대비 비율
with dau as (
  select
    created_at::date as day,
    count(distinct user_id) as dau
  from public.analytics_events
  where event_name = 'app_open'
    and user_id is not null
    and created_at >= '2026-08-07'
  group by 1
),
paywall as (
  select
    created_at::date as day,
    count(distinct user_id) as paywall_users
  from public.analytics_events
  where event_name = 'peak_insufficient'
    and user_id is not null
    and created_at >= '2026-08-07'
  group by 1
)
select
  d.day,
  d.dau,
  coalesce(p.paywall_users, 0) as paywall_reached_users,
  round(100.0 * coalesce(p.paywall_users, 0) / nullif(d.dau, 0), 2) as paywall_pct_of_dau
from dau d
left join paywall p on p.day = d.day
order by d.day;

-- ───────────────────────────────────────────────────────────
-- 2) 기간 전체: 재화 다 쓰고 페이월 도달한 유니크 유저 총합 (8/7~현재, 중복인원 제거)
-- ───────────────────────────────────────────────────────────
select
  count(distinct user_id) as total_unique_paywall_users
from public.analytics_events
where event_name = 'peak_insufficient'
  and user_id is not null
  and created_at >= '2026-08-07';
