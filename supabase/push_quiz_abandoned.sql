-- ───────────────────────────────────────────────────────────
-- push_quiz_abandoned.sql : 코드맞추기 '중단 인지형(패턴2)' 넛지 타겟팅.
--   quiz_abandoned 이벤트는 인앱 뒤로가기 버튼을 눌러야만 기록됨(handleBack() 경유) →
--   스와이프·홈버튼·강제종료로 나가면 안 찍혀서 실제 이탈을 놓침(코드맞추기만 이렇게 좁게 설계됨, 2026-07-30 발견).
--   대신 유저별 최신 quiz_level_started 기준으로, 그 이후 같은 레벨 quiz_completed가
--   없으면 미완료로 판정 — 어떤 방식으로 나갔든 상관없이 감지됨.
--   레벨명 표시는 push_quiz_pattern.sql 의 quiz_level_names 재사용.
--   문구는 push_message_templates(category: quiz_abandoned)에서 랜덤 발송.
--
--   2026-11-02 발송 규칙: 중단 1건당 1회, 최근 7일 이내 중단만.
--     · 최신 시작이 7일보다 오래됐으면 제외(오래된 중단을 뒤늦게 알리지 않음)
--     · 그 시작 이후에 이미 quiz_abandoned 를 보낸 기록(push_send_log)이 있으면 제외
--       → 같은 중단에는 다시 안 보냄. 다시 시작했다가 또 그만두면 새 중단이라 다시 대상이 됨.
--     (이전에는 레벨을 끝낼 때까지 매일 반복 발송되어 한 유저가 최대 8회까지 받았음)
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
    -- 최근 7일 이내에 시작한 중단만
    and ls.created_at >= now() - interval '7 days'
    -- 이 중단에 대해 이미 보냈으면 제외(중단 1건당 1회)
    and not exists (
      select 1 from push_send_log l
      where l.user_id = ls.user_id
        and l.push_type = 'quiz_abandoned'
        and l.sent_at > ls.created_at
    )
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
