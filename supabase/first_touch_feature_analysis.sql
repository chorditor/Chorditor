-- ───────────────────────────────────────────────────────────
-- 튜토리얼 없이 유입된(=퀘스트체인 튜토리얼 배포 전 가입) 기존 유저들이
-- 에디터/코드사전/훈련소/노트(프로젝트) 중 뭘 제일 먼저 만지는지 분석.
--   목적: "step1=에디터"가 앱 이름값 때문에 정한 임의 선택이었는지,
--   실제 유저가 자연스럽게 원하는 첫 행동과 맞는지 확인.
--   튜토리얼이 순서를 강제하기 전 시기의 유저만 봐야 "순수 organic" 신호임.
--
--   기준 이벤트(각 영역의 "진입"으로 볼 만한 것):
--     editor  : chord_build (event_category='editor')
--     library : library_opened
--     training: training_page_viewed
--     note    : project_created  (project_opened는 기존 프로젝트 재방문이라 제외)
-- ───────────────────────────────────────────────────────────

with launch as (
  -- 퀘스트체인 튜토리얼(순서 실험)이 시작되기 전 시점 = 최초 배정 시각
  select min(assigned_at) as launch_at
  from public.experiment_assignments
  where experiment = 'tutorial_order'
),
pre_launch_users as (
  select s.user_id
  from public.subscriptions s, launch l
  where s.created_at < l.launch_at
),
-- 후보 이벤트(4개 카테고리) 원본
candidate_events as (
  select
    e.user_id,
    e.created_at,
    case
      when e.event_name = 'chord_build' and e.event_category = 'editor' then 'editor'
      when e.event_name = 'library_opened'                              then 'library'
      when e.event_name = 'training_page_viewed'                        then 'training'
      when e.event_name = 'project_created'                             then 'note'
    end as category
  from public.analytics_events e
  join pre_launch_users p on p.user_id = e.user_id
  where (e.event_name = 'chord_build' and e.event_category = 'editor')
     or e.event_name in ('library_opened', 'training_page_viewed', 'project_created')
),
-- 직전 30분 내 홈 진입(app_open 또는 s1) 흔적이 있는 것만 "홈 경유(organic)"로 인정.
-- 없으면 푸시 딥링크로 그 페이지에 바로 떨어진 것으로 추정하고 제외
-- (push_entry_funnel.sql의 via_home 휴리스틱과 동일 원리).
organic_events as (
  select ce.*
  from candidate_events ce
  where exists (
    select 1
    from public.analytics_events h
    where h.user_id = ce.user_id
      and (
        h.event_name = 'app_open'
        or (h.event_name = 'screen_view' and h.properties ->> 'view' = 'home')
      )
      and h.created_at <  ce.created_at
      and h.created_at >= ce.created_at - interval '30 minutes'
  )
),
first_touch as (
  select
    user_id,
    min(created_at) filter (where category = 'editor')   as t_editor,
    min(created_at) filter (where category = 'library')  as t_library,
    min(created_at) filter (where category = 'training') as t_training,
    min(created_at) filter (where category = 'note')     as t_note
  from organic_events
  group by user_id
)
select
  category,
  count(*) as users,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from (
  select
    ft.user_id,
    (
      select cat
      from (values
        ('editor',   ft.t_editor),
        ('library',  ft.t_library),
        ('training', ft.t_training),
        ('note',     ft.t_note)
      ) as v(cat, ts)
      where ts is not null
      order by ts asc
      limit 1
    ) as category
  from first_touch ft
) x
where category is not null
group by category
order by users desc;
