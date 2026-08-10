-- ───────────────────────────────────────────────────────────
-- 튜토리얼 순서 A/B (experiment='tutorial_order') — 스텝별 퍼널 (컷오프 1100명)
--   컷오프: 1100번째 배정자(assigned_at) 시점까지만. 사전에 1100으로 정했으니
--   지금 더 쌓였어도 그 이후분은 안 씀(사후에 유리한 시점 골라 자르는 것 방지).
--
--   assigned(배정) → started(시작하기 클릭, 명수) → step1(1챕터 완료, 명수)
--   → step2~5는 전부 "바로 앞 스텝 대비" 전환율(step-over-step, 누적 아님)
--   → completion_pct는 별도로 step1 대비 step5 전체 완주율.
--
--   Guardrail KPI(노트 이탈)는 "자리번호"가 아니라 "챕터"로 읽어야 함 — 아래 매핑표 참고.
--     A 순서: 1 editor, 2 library, 3 note-create, 4 note-edit, 5 training
--     B 순서: 1 editor, 2 library, 3 training,    4 note-create, 5 note-edit
--   즉 A는 step2→3, step3→4 구간이 노트 이탈이고, B는 step3→4, step4→5 구간이 노트 이탈.
-- ───────────────────────────────────────────────────────────

with cutoff as (
  select assigned_at as cutoff_at
  from public.experiment_assignments
  where experiment = 'tutorial_order'
  order by assigned_at
  offset 1099 limit 1   -- 1100번째 배정자 시점. 아직 1100명 안 됐으면 빈 결과.
),
pop as (
  select ea.user_id, ea.variant
  from public.experiment_assignments ea, cutoff c
  where ea.experiment = 'tutorial_order'
    and ea.assigned_at <= c.cutoff_at
),
per_user as (
  select
    pop.user_id,
    pop.variant,
    bool_or(e.event_name = 'tutorial_started')                             as started,
    max((e.properties ->> 'step')::int)
      filter (where e.event_name = 'tutorial_step_completed')              as reached_step
  from pop
  left join public.analytics_events e on e.user_id = pop.user_id
  group by pop.user_id, pop.variant
)
select
  variant                                                                      as "group",
  count(*)                                                                     as assigned,
  count(*) filter (where started)                                              as started,
  count(*) filter (where reached_step >= 1)                                    as step1,
  round(100.0 * count(*) filter (where reached_step >= 2)
        / nullif(count(*) filter (where reached_step >= 1), 0), 1)            as step2,
  round(100.0 * count(*) filter (where reached_step >= 3)
        / nullif(count(*) filter (where reached_step >= 2), 0), 1)            as step3,
  round(100.0 * count(*) filter (where reached_step >= 4)
        / nullif(count(*) filter (where reached_step >= 3), 0), 1)            as step4,
  round(100.0 * count(*) filter (where reached_step >= 5)
        / nullif(count(*) filter (where reached_step >= 4), 0), 1)            as step5,
  -- Primary KPI: step1 완료자 대비 step5(완주) 전체 전환율
  round(100.0 * count(*) filter (where reached_step >= 5)
        / nullif(count(*) filter (where reached_step >= 1), 0), 1)            as completion_pct
from per_user
group by variant
order by variant;
