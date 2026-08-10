-- ───────────────────────────────────────────────────────────
-- assigned 대비 step1(9.9%/12.5%)가 어디서 새는지 분해
--   assigned(모달 뜬 시점) → started(시작하기 클릭) → skipped(건너뛰기 클릭)
--   → step1 완료(1챕터 실제로 끝냄)
--   "선택 단계"(시작/건너뛰기)와 "실행 단계"(시작 후 1챕터 완주)를 갈라서 봐야
--   낮은 수치가 선택권 문제인지 실행 중 이탈인지 구분됨.
--   컷오프 1100명, tutorial_order_ab_analysis.sql과 동일 population.
-- ───────────────────────────────────────────────────────────

with cutoff as (
  select assigned_at as cutoff_at
  from public.experiment_assignments
  where experiment = 'tutorial_order'
  order by assigned_at
  offset 1099 limit 1
),
pop as (
  select ea.user_id, ea.variant
  from public.experiment_assignments ea, cutoff c
  where ea.experiment = 'tutorial_order'
    and ea.assigned_at <= c.cutoff_at
),
flags as (
  select
    p.user_id,
    p.variant,
    bool_or(e.event_name = 'tutorial_started')                                             as started,
    bool_or(e.event_name = 'tutorial_skipped')                                              as skipped,
    bool_or(e.event_name = 'tutorial_step_completed' and (e.properties ->> 'step')::int = 1) as step1_done
  from pop p
  left join public.analytics_events e on e.user_id = p.user_id
  group by p.user_id, p.variant
)
select
  variant                                                              as "group",
  count(*)                                                             as assigned,
  count(*) filter (where started)                                      as started,
  round(100.0 * count(*) filter (where started) / nullif(count(*), 0), 1) as started_pct_of_assigned,
  count(*) filter (where skipped)                                      as skipped,
  round(100.0 * count(*) filter (where skipped) / nullif(count(*) filter (where started), 0), 1) as skip_pct_of_started,
  count(*) filter (where step1_done)                                   as step1_done,
  round(100.0 * count(*) filter (where step1_done) / nullif(count(*) filter (where started), 0), 1) as step1_pct_of_started
from flags
group by variant
order by variant;
