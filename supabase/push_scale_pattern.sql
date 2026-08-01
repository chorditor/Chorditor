-- ───────────────────────────────────────────────────────────
-- push_scale_pattern.sql : 스케일 성적형(4번) 타겟팅.
--   레벨(scale_key)별 누적평균(scale_test_result.score_pct), 최소 3회 시도.
--   85% 이상 → 다음 레벨 유도(scale_level_up), 50% 미만 → 재정비 유도(scale_reinforce).
--   챌린지 트랙 없음(스케일엔 퀴즈의 c1/c2 같은 별도 챌린지 컨텐츠가 없음, 2026-07-31 합의).
--   재정비 하한(50%)은 퀴즈 패턴과 동일 기준 적용(스케일 전용 값 미지정이라 기존값 재사용).
-- ───────────────────────────────────────────────────────────

create or replace function public.get_scale_pattern_targets()
returns table(
  user_id       uuid,
  token         text,
  platform      text,
  nickname      text,
  category      text,
  scale_key     text,
  next_scale_key text
)
language sql
security definer
set search_path = public
as $$
  with last_key as (
    select distinct on (ae.user_id)
      ae.user_id, ae.properties->>'scale_key' as scale_key
    from analytics_events ae
    where ae.event_name = 'scale_test_result'
      and ae.properties->>'scale_key' is not null
    order by ae.user_id, ae.created_at desc
  ),
  stats as (
    select
      ae.user_id,
      ae.properties->>'scale_key' as scale_key,
      avg((ae.properties->>'score_pct')::numeric) as avg_pct,
      count(*) as attempts
    from analytics_events ae
    where ae.event_name = 'scale_test_result'
      and ae.properties->>'scale_key' is not null
    group by ae.user_id, ae.properties->>'scale_key'
  ),
  judged as (
    select
      lk.user_id,
      lk.scale_key,
      case
        when s.avg_pct >= 85 then 'scale_level_up'
        when s.avg_pct <  50 then 'scale_reinforce'
        else null
      end as category
    from last_key lk
    join stats s on s.user_id = lk.user_id and s.scale_key = lk.scale_key
    where s.attempts >= 3
  )
  select
    pt.user_id, pt.token, pt.platform, sub.nickname, j.category, j.scale_key,
    nxt.scale_key as next_scale_key
  from judged j
  join push_tokens pt on pt.user_id = j.user_id
  left join subscriptions sub on sub.user_id = j.user_id
  left join scale_level_names cur on cur.scale_key = j.scale_key
  left join scale_level_names nxt on nxt.level_id = cur.level_id + 1
  where j.category is not null
    and pt.token is not null
    and pt.nudge_enabled = true;
$$;

grant execute on function public.get_scale_pattern_targets() to service_role;

-- 확인: select * from get_scale_pattern_targets();
