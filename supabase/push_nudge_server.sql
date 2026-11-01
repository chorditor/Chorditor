-- ───────────────────────────────────────────────────────────
-- push_nudge_server.sql
-- 일반넛지 타겟팅 함수: 유휴 0~2일 유저 대상 (3일↑은 윈백이 담당).
--   idle_days 는 KST 달력일 차이(자정 넘어가면 무조건 +1일). 당일 접속(0)도 포함.
--
--   문구 2종을 Edge Function 이 고름:
--     1) repeat  — 마지막에 한 훈련 한 번 더 유도 (last_training)
--     2) persona — 페르소나별 추천 커리큘럼 (push_nudge_persona)
--   last_training 이 없으면(훈련 기록 전무) 무조건 persona 로 발송.
--
--   추천 선정은 priority 가중 랜덤: `order by random() * priority` →
--   priority 1 이 가장 자주 뽑히되, 2·3 도 완전히 배제되진 않음.
--   기존 push_nudge(persona별 body_pool jsonb) 구조는 폐기 — push_nudge_persona 로 대체.
--
--   2026-11-02 유형 연계:
--     user_persona_profile 에서 persona / engagement_type / pref_type 을 읽어 같이 돌려준다.
--     (persona 는 subscriptions 가 아니라 user_persona_profile — subscriptions.persona 는 삭제됨)
--     · 잘 쓰는 유저(engagement_type = heavy_user·habitual)의 추천은 Edge Function 이 정한다.
--       선호 패턴 영역의 훈련을 평소 레벨 / 한 단계 위 / 덜 하는 영역으로 나눠 추천.
--     · rec_* 는 그 외 유저(잘 안 쓰는 유저, 툴킷·미분류)가 쓰는 기존 페르소나 추천.
--     · least_area = 선호 패턴을 뺀 comping/soloing/harmony 중 누적 점수(total+cur)가 가장 낮은 영역
--       = "덜 하는 콘텐츠". 동점이면 랜덤.
--
--   코드반주 훈련 통합(2026-11-02): 마지막 훈련 판정에서 코드진행·주법을 'progression' 하나로 본다.
--     새 앱은 chordplay_play_started, 옛 앱은 progression_detail_played / strum_play_started 를 찍으므로 셋 다 센다.
-- ───────────────────────────────────────────────────────────

drop function if exists public.get_nudge_targets();

create function public.get_nudge_targets()
 returns table(
   user_id         uuid,
   token           text,
   platform        text,
   nickname        text,
   last_training   text,
   rec_training    text,
   rec_levels      text,
   rec_difficulty  text,
   persona         text,
   engagement_type text,
   pref_type       text,
   least_area      text
 )
 language sql
 SECURITY DEFINER
 set search_path = public
AS $function$
  with idle as (
    -- KST 달력일 기준 유휴일수(경과 시간이 아니라 날짜 차이 → 자정 넘으면 +1일)
    -- user_last_active 캐시 사용(윈백과 동일) — analytics_events 전체를 group by 로 훑으면
    -- 캐시가 빈 첫 호출이 REST 시간 제한(8초)에 걸려 실패했음(2026-11-02 실측: 첫 호출 8.4초 → 이후 0.5초).
    select ula.user_id,
           (now() at time zone 'Asia/Seoul')::date
             - (ula.last_active_at at time zone 'Asia/Seoul')::date as idle_days
    from user_last_active ula
  ),
  -- 4개 훈련의 활동 이벤트만 모아서 유저별 가장 최근 것 = last_training
  training_events as (
    -- 최근 30일만: 이 함수의 대상은 접속 0~2일차라 마지막 훈련은 항상 최근 기록이고,
    -- 전체 이력을 훑으면 첫 호출이 REST 시간 제한(8초)에 걸려 실패했음(일반 넛지가 10-27부터 거의 안 나감)
    select user_id, created_at, 'quiz'        as training from analytics_events
      where event_name = 'quiz_completed' and created_at >= now() - interval '30 days'
    union all
    select user_id, created_at, 'scale'       from analytics_events
      where event_name = 'scale_test_submitted' and created_at >= now() - interval '30 days'
    union all
    select user_id, created_at, 'combo'       from analytics_events
      where event_name = 'reharmony_level_completed' and created_at >= now() - interval '30 days'
    union all
    select user_id, created_at, 'progression' from analytics_events
      where event_name in ('chordplay_play_started', 'progression_detail_played', 'strum_play_started')
        and created_at >= now() - interval '30 days'
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
    rec.difficulty as rec_difficulty,
    upp.persona,
    upp.engagement_type,
    upp.pref_type,
    (
      select v.area
      from (values
        ('comping', upp.total_comping + upp.cur_comping),
        ('soloing', upp.total_soloing + upp.cur_soloing),
        ('harmony', upp.total_harmony + upp.cur_harmony)
      ) as v(area, score)
      where v.area is distinct from upp.pref_type
      order by v.score, random()
      limit 1
    ) as least_area
  from push_tokens pt

  join idle on idle.user_id = pt.user_id
  join subscriptions sub on sub.user_id = pt.user_id
  join user_persona_profile upp on upp.user_id = pt.user_id
  left join last_tr lt on lt.user_id = pt.user_id

  -- 페르소나 추천 1개: priority 가중 랜덤(낮은 priority 가 더 자주 뽑힘)
  join lateral (
    select p.training, p.levels, p.difficulty
    from push_nudge_persona p
    where p.persona = upp.persona
      and p.active
    order by random() * p.priority
    limit 1
  ) rec on true

  where idle.idle_days <= 2        -- 당일·어제·그제 접속자 / 3일↑은 윈백 담당
    and pt.token is not null
    and pt.nudge_enabled = true;   -- 설정 > 푸시알림 > 연습 알림 OFF 시 제외
$function$;

grant execute on function public.get_nudge_targets() to service_role;

-- 확인: select user_id, persona, engagement_type, pref_type, least_area, rec_training from get_nudge_targets();
