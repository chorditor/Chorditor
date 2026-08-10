-- ───────────────────────────────────────────────────────────
-- 테스트용 소표본 쿼리: 8/9 18:00~19:00 KST 튜토리얼 수행 유저의 스텝별 퍼널전환율
--   A/B 테스트와 무관 (variant 안 씀) — tutorial_step_completed { step, chapter } 수집 자체가
--   되는지 먼저 확인하는 용도.
--   "수행한 유저" = 그 1시간 동안 tutorial_step_completed 이벤트를 1회 이상 낸 유저.
--   퍼널은 그 유저들의 전체 이력(윈도 밖 포함)에서 도달한 최고 step 기준.
-- ───────────────────────────────────────────────────────────

with cohort as (
  select distinct
    e.user_id,
    coalesce(ea.variant, 'UNASSIGNED') as variant   -- 배정 안 됐으면 UNASSIGNED로 드러냄
  from public.analytics_events e
  left join public.experiment_assignments ea
    on ea.user_id = e.user_id and ea.experiment = 'tutorial_order'
  where e.event_name = 'tutorial_step_completed'
    and e.user_id is not null
    and e.created_at >= timestamptz '2026-08-09 18:00:00+09'
    and e.created_at <  timestamptz '2026-08-09 19:00:00+09'
),
max_step as (
  select cohort.user_id, cohort.variant, max((e.properties ->> 'step')::int) as reached_step
  from public.analytics_events e
  join cohort on cohort.user_id = e.user_id
  where e.event_name = 'tutorial_step_completed'
  group by cohort.user_id, cohort.variant
),
cohort_size as (
  select variant, count(*) as n from cohort group by variant
)
select
  m.variant                                                                     as "group",
  count(*) filter (where m.reached_step >= 1)                                   as step1,
  round(100.0 * count(*) filter (where m.reached_step >= 2)
        / nullif(count(*) filter (where m.reached_step >= 1), 0), 1)           as step2,
  round(100.0 * count(*) filter (where m.reached_step >= 3)
        / nullif(count(*) filter (where m.reached_step >= 1), 0), 1)           as step3,
  round(100.0 * count(*) filter (where m.reached_step >= 4)
        / nullif(count(*) filter (where m.reached_step >= 1), 0), 1)           as step4,
  round(100.0 * count(*) filter (where m.reached_step >= 5)
        / nullif(count(*) filter (where m.reached_step >= 1), 0), 1)           as step5
from max_step m
group by m.variant
order by m.variant;

-- 참고: variant별 cohort 인원수만 보고 싶으면
-- (위 cohort CTE까지만 떼서) select variant, count(*) from cohort group by variant;
