-- ───────────────────────────────────────────────────────────
-- 8/7~ 가입일 코호트별 D1/D2 리텐션 (하루 = 새벽 5시~다음날 새벽 5시, KST)
--   - 하루 경계를 05:00 KST로 이동: 자정 기준이면 새벽 늦게까지 쓰다 잔 유저가
--     다음날로 잘못 넘어가 리텐션이 부풀거나 깎이는 왜곡이 생김.
--   - active 판정은 아무 이벤트나 잡지 않고 "진짜 세션 시작" 신호만 씀
--     (app_open 또는 홈 진입 s1) — analytics_db.md에 이미 정의된 홈 진입 통합
--     정의 재사용. 단발성 오발화/디바운스 잔여 이벤트로 리텐션 부풀리는 것 방지.
--   - JOIN 1번으로 처리(D1/D2 각각 LEFT JOIN 하지 않고 FILTER로 분리) — 스캔 절감.
-- ───────────────────────────────────────────────────────────

with cohorts as (
  select
    user_id,
    ((created_at at time zone 'Asia/Seoul') - interval '5 hours')::date as cohort_day
  from public.subscriptions
  where created_at >= timestamptz '2026-08-07 05:00:00+09'
),
sessions as (
  select distinct
    user_id,
    ((created_at at time zone 'Asia/Seoul') - interval '5 hours')::date as active_day
  from public.analytics_events
  where user_id is not null
    and (
      event_name = 'app_open'
      or (event_name = 'screen_view' and properties ->> 'view' = 'home')
    )
)
select
  c.cohort_day,
  count(distinct c.user_id) as cohort_size,

  count(distinct s.user_id) filter (where s.active_day = c.cohort_day + 1) as d1_active,
  round(100.0 * count(distinct s.user_id) filter (where s.active_day = c.cohort_day + 1)
        / nullif(count(distinct c.user_id), 0), 1) as d1_retention_pct,

  count(distinct s.user_id) filter (where s.active_day = c.cohort_day + 2) as d2_active,
  round(100.0 * count(distinct s.user_id) filter (where s.active_day = c.cohort_day + 2)
        / nullif(count(distinct c.user_id), 0), 1) as d2_retention_pct
from cohorts c
left join sessions s
  on s.user_id = c.user_id
 and s.active_day in (c.cohort_day + 1, c.cohort_day + 2)
group by c.cohort_day
order by c.cohort_day;

-- ⚠ 최근 1~2일 코호트는 D1/D2 관측 기간이 아직 안 지났으므로(미래) 값이 낮게 나옴 — 정상.
--   해석 시 cohort_day + 2 < 오늘(05:00 경계 기준) 인 행만 볼 것.
