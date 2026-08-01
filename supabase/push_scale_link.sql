-- ───────────────────────────────────────────────────────────
-- push_scale_link.sql : 스케일 연동형(3번) 타겟팅.
--   마지막 1회(누적 아님) scale_test_result.score_pct 90%↑ →
--   나머지 4개 훈련(퀴즈/진행/주법/조합) 중 랜덤 추천은 Edge Function 담당.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_scale_link_targets()
returns table(user_id uuid, token text, platform text, nickname text, scale_key text)
language sql
security definer
set search_path = public
as $$
  with last_result as (
    select distinct on (ae.user_id)
      ae.user_id,
      (ae.properties->>'score_pct')::int as score_pct,
      ae.properties->>'scale_key' as scale_key
    from analytics_events ae
    where ae.event_name = 'scale_test_result'
      and ae.properties->>'scale_key' is not null
    order by ae.user_id, ae.created_at desc
  )
  select pt.user_id, pt.token, pt.platform, sub.nickname, lr.scale_key
  from last_result lr
  join push_tokens pt on pt.user_id = lr.user_id
  left join subscriptions sub on sub.user_id = lr.user_id
  where lr.score_pct >= 90
    and pt.token is not null
    and pt.nudge_enabled = true;
$$;

grant execute on function public.get_scale_link_targets() to service_role;

-- 확인: select * from get_scale_link_targets();
