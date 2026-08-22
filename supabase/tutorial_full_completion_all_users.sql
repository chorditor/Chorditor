-- ───────────────────────────────────────────────────────────
-- 전체 유저(실험군 무관) 중 튜토리얼 완주(step5=note-edit 완료) 유저
--   마지막 챕터 key='note-edit' 기준(새A/새B 둘 다 5번째 챕터가 note-edit)
-- ───────────────────────────────────────────────────────────

-- 1) 완주 유저 목록
select
  user_id,
  min(created_at) as completed_at
from public.analytics_events
where event_name = 'tutorial_step_completed'
  and properties->>'chapter' = 'note-edit'
  and user_id is not null
group by user_id
order by completed_at;

-- 2) 전체 유저 대비 완주 유저 수/비율
with completed as (
  select count(distinct user_id) as n
  from public.analytics_events
  where event_name = 'tutorial_step_completed'
    and properties->>'chapter' = 'note-edit'
    and user_id is not null
)
select
  c.n as completed_users,
  (select count(distinct user_id) from public.analytics_events where user_id is not null) as total_users,
  round(100.0 * c.n / (select count(distinct user_id) from public.analytics_events where user_id is not null), 2) as pct_of_total
from completed c;
