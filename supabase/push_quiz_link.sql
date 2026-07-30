-- ───────────────────────────────────────────────────────────
-- push_quiz_link.sql : 코드맞추기 '연동형(패턴3)' 넛지 타겟팅.
--   4번(성적형)과 다르게 "마지막 세션 1회"의 정답률만 봄(누적평균 아님).
--   조건: 최신 quiz_completed(숫자 레벨만) 정답률 >= 90%.
--   → 4번(get_quiz_pattern_targets)과 동등 경쟁 후보로 Edge Function에서 합쳐서 랜덤 1개 선택.
--   추천 콘텐츠(스케일/코드진행/주법/코드조합) 선택과 레벨→딥링크 매핑은 Edge Function(JS)에서 처리.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_quiz_link_targets()
returns table (
  user_id  uuid,
  token    text,
  platform text,
  level_id text
)
language sql
security definer
set search_path = public
as $$
  with latest_completed as (
    select distinct on (user_id)
      user_id,
      properties->>'level_id' as level_id,
      round(
        (properties->>'correct_count')::numeric
        / nullif((properties->>'total')::numeric, 0) * 100
      , 1) as accuracy_pct,
      created_at
    from analytics_events
    where event_name = 'quiz_completed'
      and user_id is not null
      and (properties->>'level_id') ~ '^[0-9]+$'
    order by user_id, created_at desc
  )
  select
    pt.user_id, pt.token, pt.platform,
    lc.level_id
  from latest_completed lc
  join push_tokens pt on pt.user_id = lc.user_id
  where pt.token is not null
    and pt.nudge_enabled = true
    and lc.accuracy_pct >= 90;
$$;

grant execute on function public.get_quiz_link_targets() to service_role;
