-- ───────────────────────────────────────────────────────────
-- push_quiz_abandoned.sql : 코드맞추기 '중단 인지형(패턴2)' 넛지 타겟팅.
--   quiz_abandoned 이벤트는 인앱 뒤로가기 버튼을 눌러야만 기록됨(handleBack() 경유) →
--   스와이프·홈버튼·강제종료로 나가면 안 찍혀서 실제 이탈을 놓침(코드맞추기만 이렇게 좁게 설계됨, 2026-07-30 발견).
--   대신 유저별 최신 quiz_level_started 기준으로, 그 이후 같은 레벨 quiz_completed가
--   없으면 미완료로 판정 — 어떤 방식으로 나갔든 상관없이 감지됨.
--   레벨명 표시는 push_quiz_pattern.sql 의 quiz_level_names 재사용.
--   문구는 push_message_templates(category: quiz_abandoned)에서 랜덤 발송.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_quiz_abandoned_targets()
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
  with latest_started as (
    select distinct on (user_id)
      user_id,
      properties->>'level_id' as level_id,
      created_at
    from analytics_events
    where event_name = 'quiz_level_started'
      and user_id is not null
    order by user_id, created_at desc
  )
  select
    pt.user_id, pt.token, pt.platform,
    ls.level_id
  from latest_started ls
  join push_tokens pt on pt.user_id = ls.user_id
  where pt.token is not null
    and pt.nudge_enabled = true
    -- 그 이후 같은 레벨을 완료한 적 있으면 제외(이미 끝냈거나 재도전 완료)
    and not exists (
      select 1 from analytics_events e
      where e.event_name = 'quiz_completed'
        and e.user_id = ls.user_id
        and (e.properties->>'level_id') = ls.level_id
        and e.created_at > ls.created_at
    );
$$;

grant execute on function public.get_quiz_abandoned_targets() to service_role;
