-- ───────────────────────────────────────────────────────────
-- push_scale_abandoned.sql : 스케일 중단인지형(2번) 타겟팅.
--   quiz_abandoned 과 동일 판정 방식: 유저의 마지막 scale_test_started 이후,
--   같은 scale_key 로 scale_test_result 가 없으면 중단으로 판정.
--   (scale_test_started 는 bi/forward 정보가 없어 scale_key 단위로만 판정 가능
--    — 폼(bi)은 시작 버튼을 누른 뒤 셔플백에서 정해짐)
-- ───────────────────────────────────────────────────────────

create or replace function public.get_scale_abandoned_targets()
returns table(user_id uuid, token text, platform text, nickname text, scale_key text)
language sql
security definer
set search_path = public
as $$
  with last_started as (
    select distinct on (ae.user_id)
      ae.user_id, ae.created_at, ae.properties->>'scale_key' as scale_key
    from analytics_events ae
    where ae.event_name = 'scale_test_started'
      and ae.properties->>'scale_key' is not null
    order by ae.user_id, ae.created_at desc
  )
  select pt.user_id, pt.token, pt.platform, sub.nickname, ls.scale_key
  from last_started ls
  join push_tokens pt on pt.user_id = ls.user_id
  left join subscriptions sub on sub.user_id = ls.user_id
  where pt.token is not null
    and pt.nudge_enabled = true
    and not exists (
      select 1 from analytics_events r
      where r.user_id = ls.user_id
        and r.event_name = 'scale_test_result'
        and r.properties->>'scale_key' = ls.scale_key
        and r.created_at > ls.created_at
    );
$$;

grant execute on function public.get_scale_abandoned_targets() to service_role;

-- 확인: select * from get_scale_abandoned_targets();
