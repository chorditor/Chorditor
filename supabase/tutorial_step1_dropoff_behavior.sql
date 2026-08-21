-- ───────────────────────────────────────────────────────────
-- tutorial_step1 실험: B군(새B, step1=훈련소) step1→step2 붕괴가
-- "이탈"인지 "체류 위치 변경(훈련소 안에서 계속 놀기)"인지 확인
--
-- 대상: step1(chapter='training') 완료 유저 전원
-- 판정: tutorial_step_continued(step=1, chapter='training') 발생 여부 = step2 시작 여부
-- 관찰: step1 완료 시각 이후 30분 내 발생 이벤트 전부(jsonb 집계)
-- ───────────────────────────────────────────────────────────

with step1_users as (
  select user_id, min(created_at) as step1_completed_at
  from public.analytics_events
  where event_name = 'tutorial_step_completed'
    and properties->>'chapter' = 'training'
    and (properties->>'step')::int = 1
    and user_id is not null
  group by user_id
),
step2_start as (
  select user_id, min(created_at) as step2_started_at
  from public.analytics_events
  where event_name = 'tutorial_step_continued'
    and properties->>'chapter' = 'training'
    and (properties->>'step')::int = 1
    and user_id is not null
  group by user_id
),
post_window_events as (
  select
    s.user_id,
    e.event_name,
    count(*) as cnt
  from step1_users s
  join public.analytics_events e
    on e.user_id = s.user_id
   and e.created_at > s.step1_completed_at
   and e.created_at <= s.step1_completed_at + interval '30 minutes'
  group by 1, 2
)
select
  s.user_id,
  s.step1_completed_at,
  (s2.user_id is not null)                      as started_step2,
  s2.step2_started_at,
  coalesce(
    jsonb_object_agg(pwe.event_name, pwe.cnt) filter (where pwe.event_name is not null),
    '{}'::jsonb
  )                                              as events_within_30min
from step1_users s
left join step2_start s2 on s2.user_id = s.user_id
left join post_window_events pwe on pwe.user_id = s.user_id
group by s.user_id, s.step1_completed_at, s2.user_id, s2.step2_started_at
order by s.step1_completed_at;

-- ───────────────────────────────────────────────────────────
-- 3) 이벤트별 합계: B군(step1=훈련소 완료자) 30분 내 무엇을 했는지
--    (유저 한 명당 나열 X, 이벤트명별 유니크 유저수만)
--    분모 참고: B 배정 974명 / step1(훈련소) 완료 443명
-- ───────────────────────────────────────────────────────────
with step1_users as (
  select user_id, min(created_at) as step1_completed_at
  from public.analytics_events
  where event_name = 'tutorial_step_completed'
    and properties->>'chapter' = 'training'
    and (properties->>'step')::int = 1
    and user_id is not null
  group by user_id
)
select
  e.event_name,
  count(distinct e.user_id)                                    as users_triggered,
  round(100.0 * count(distinct e.user_id) / 974, 2)             as pct_of_b_assigned,
  round(100.0 * count(distinct e.user_id) / (select count(*) from step1_users), 2) as pct_of_step1_completers
from step1_users s
join public.analytics_events e
  on e.user_id = s.user_id
 and e.created_at > s.step1_completed_at
 and e.created_at <= s.step1_completed_at + interval '30 minutes'
group by 1
order by 2 desc;

-- ───────────────────────────────────────────────────────────
-- 4) tutorial_skipped가 실제로 어느 step/chapter에서 눌렸는지
--    (step2=사전에서 터졌는지 검증)
-- ───────────────────────────────────────────────────────────
with step1_users as (
  select user_id, min(created_at) as step1_completed_at
  from public.analytics_events
  where event_name = 'tutorial_step_completed'
    and properties->>'chapter' = 'training'
    and (properties->>'step')::int = 1
    and user_id is not null
  group by user_id
)
select
  e.properties->>'step'    as skip_step,
  e.properties->>'chapter' as skip_chapter,
  count(distinct e.user_id) as users_skipped
from step1_users s
join public.analytics_events e
  on e.user_id = s.user_id
 and e.event_name = 'tutorial_skipped'
 and e.created_at > s.step1_completed_at
 and e.created_at <= s.step1_completed_at + interval '30 minutes'
group by 1, 2
order by 3 desc;

-- ───────────────────────────────────────────────────────────
-- 보조: step2 미시작(=이탈 후보) 유저만 놓고, 30분 내 이벤트명별 발생 유저수 집계
--   "이탈"인지 "체류"인지는 여기서 quiz_level_started/training_card_tapped 같은
--   훈련소 재진입성 이벤트 비중이 높은지로 판단
-- ───────────────────────────────────────────────────────────
-- with step1_users as (
--   select user_id, min(created_at) as step1_completed_at
--   from public.analytics_events
--   where event_name = 'tutorial_step_completed'
--     and properties->>'chapter' = 'training'
--     and (properties->>'step')::int = 1
--     and user_id is not null
--   group by user_id
-- ),
-- step2_start as (
--   select distinct user_id
--   from public.analytics_events
--   where event_name = 'tutorial_step_continued'
--     and properties->>'chapter' = 'training'
--     and (properties->>'step')::int = 1
-- ),
-- non_continuers as (
--   select s.user_id, s.step1_completed_at
--   from step1_users s
--   where s.user_id not in (select user_id from step2_start)
-- )
-- select
--   e.event_name,
--   count(distinct e.user_id) as users_triggered
-- from non_continuers n
-- join public.analytics_events e
--   on e.user_id = n.user_id
--  and e.created_at > n.step1_completed_at
--  and e.created_at <= n.step1_completed_at + interval '30 minutes'
-- group by 1
-- order by 2 desc;
