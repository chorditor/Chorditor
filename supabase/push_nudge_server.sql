-- ───────────────────────────────────────────────────────────
-- push_nudge_server.sql
-- 일반넛지 타겟팅 함수: 유휴 0~2일 유저 대상 (3일↑은 윈백이 담당).
--   idle_days 는 KST 달력일 차이(자정 넘어가면 무조건 +1일). 당일 접속(0)도 포함.
--
--   문구 2종을 Edge Function 이 코인플립으로 고름:
--     1) repeat  — 마지막에 한 훈련 한 번 더 유도 (last_training)
--     2) persona — 페르소나별 추천 커리큘럼 (push_nudge_persona)
--   last_training 이 없으면(훈련 기록 전무) 무조건 persona 로 발송.
--
--   추천 선정은 priority 가중 랜덤: `order by random() * priority` →
--   priority 1 이 가장 자주 뽑히되, 2·3 도 완전히 배제되진 않음.
--   기존 push_nudge(persona별 body_pool jsonb) 구조는 폐기 — push_nudge_persona 로 대체.
-- ───────────────────────────────────────────────────────────

drop function if exists public.get_nudge_targets();

create function public.get_nudge_targets()
 returns table(
   user_id        uuid,
   token          text,
   platform       text,
   nickname       text,
   last_training  text,
   rec_training   text,
   rec_levels     text,
   rec_difficulty text
 )
 language sql
 SECURITY DEFINER
 set search_path = public
AS $function$
  with idle as (
    -- KST 달력일 기준 유휴일수(경과 시간이 아니라 날짜 차이 → 자정 넘으면 +1일)
    select ae.user_id,
           (now() at time zone 'Asia/Seoul')::date
             - (max(ae.created_at) at time zone 'Asia/Seoul')::date as idle_days
    from analytics_events ae
    group by ae.user_id
  ),
  -- 5개 훈련의 활동 이벤트만 모아서 유저별 가장 최근 것 = last_training
  training_events as (
    select user_id, created_at, 'quiz'        as training from analytics_events where event_name = 'quiz_completed'
    union all
    select user_id, created_at, 'scale'       from analytics_events where event_name = 'scale_test_submitted'
    union all
    select user_id, created_at, 'combo'       from analytics_events where event_name = 'combo_training_completed'
    union all
    select user_id, created_at, 'progression' from analytics_events where event_name = 'progression_detail_played'
    union all
    select user_id, created_at, 'strum'       from analytics_events where event_name = 'strum_play_started'
  ),
  last_tr as (
    select distinct on (user_id) user_id, training
    from training_events
    order by user_id, created_at desc
  )
  select
    pt.user_id,
    pt.token,
    pt.platform,
    sub.nickname,
    lt.training as last_training,
    rec.training   as rec_training,
    rec.levels     as rec_levels,
    rec.difficulty as rec_difficulty
  from push_tokens pt

  join idle on idle.user_id = pt.user_id
  join subscriptions sub on sub.user_id = pt.user_id
  left join last_tr lt on lt.user_id = pt.user_id

  -- 페르소나 추천 1개: priority 가중 랜덤(낮은 priority 가 더 자주 뽑힘)
  join lateral (
    select p.training, p.levels, p.difficulty
    from push_nudge_persona p
    where p.persona = sub.persona
      and p.active
    order by random() * p.priority
    limit 1
  ) rec on true

  where idle.idle_days <= 2        -- 당일·어제·그제 접속자 / 3일↑은 윈백 담당
    and pt.token is not null
    and pt.nudge_enabled = true;   -- 설정 > 푸시알림 > 연습 알림 OFF 시 제외
$function$;

grant execute on function public.get_nudge_targets() to service_role;

-- 확인: select * from get_nudge_targets();
