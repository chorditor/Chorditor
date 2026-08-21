-- ───────────────────────────────────────────────────────────
-- 튜토리얼 순서 A/B (experiment='tutorial_order') — 전체 배정분 집계 (컷오프 없음)
--   실험 폐기됨(신규 배정 중단, get_or_assign_variant 화이트리스트 제거).
--   더 이상 안 쌓이므로 전체 population 그대로 집계해서 보관/컬럼 절약용.
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

with pop as (
  select user_id, variant
  from public.experiment_assignments
  where experiment = 'tutorial_order'
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
