-- ───────────────────────────────────────────────────────────
-- 튜토리얼 step1 A/B (experiment='tutorial_step1') — 스텝별 퍼널 (원본 인원수)
--   배정인원 → 진입(시작하기) → 스텝1~5 완료 인원수. 전부 순수 인원수, 백분율 계산 안 함.
--
--   배정인원 population = experiment_assignments의 experiment='tutorial_step1' 행 전체.
--   이 실험명은 1.3.3.2 이상 클라에서만, 그리고 진행 이력 없는(step===0) 유저에게만
--   배정되도록 클라단에서 가드가 걸려 있어(tutorial.js openTutorialModal/_ensureVariant),
--   추가 노이즈 필터 없이 이 population 자체가 이미 깨끗하다 — 1차 실험(tutorial_order)과
--   섞이지 않도록 experiment 컬럼만 정확히 걸러주면 된다.
--
--   스텝n완료 = tutorial_step_completed 이벤트의 step >= n (누적 완료 인원수, 챕터 단위).
--   변형마다 자리번호가 가리키는 챕터가 다르므로(§6-1) 숫자 비교 시 챕터 매핑 확인할 것:
--     A(대조군) 순서: 1 editor, 2 library, 3 training, 4 note-create, 5 note-edit
--     B(신규)   순서: 1 training, 2 library, 3 editor, 4 note-create, 5 note-edit
-- ───────────────────────────────────────────────────────────

with pop as (
  select user_id, variant
  from public.experiment_assignments
  where experiment = 'tutorial_step1'
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
  variant                                              as "group",
  count(*)                                             as 배정인원,
  count(*) filter (where started)                      as 튜토리얼진입,
  count(*) filter (where reached_step >= 1)             as 스텝1완료,
  count(*) filter (where reached_step >= 2)             as 스텝2완료,
  count(*) filter (where reached_step >= 3)             as 스텝3완료,
  count(*) filter (where reached_step >= 4)             as 스텝4완료,
  count(*) filter (where reached_step >= 5)             as 스텝5완료
from per_user
group by variant
order by variant;
