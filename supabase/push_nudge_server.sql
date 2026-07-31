-- ───────────────────────────────────────────────────────────
-- push_nudge_server.sql
-- 넛지 타겟팅 함수: 유휴 1~2일 유저에게 '코드맞추기(quiz)' 딥링크 발송.
--   - quiz 고정: 앱 초반 마케팅 = 코드맞추기 (전환율·페이월 진입 최고).
--     scale/progression/strum 행은 push_nudge 에 보존(미삭제), 발송만 제외.
--   - idle_days 는 KST 달력일 차이(자정 넘어가면 무조건 +1일). 어제 접속=1, 그제 접속=2.
--   - 하한 1일: 당일 접속(idle 0)은 제외. 상한 2일: idle 3+ 부터는 윈백이 담당.
--     → 미접속 지속 시 다음날·모레 넛지 2회 → 3일째부터 윈백 사다리(3/7/30/180일)로 인계.
--   - 매일 발송: 중복방지 로그 없음 → cron 이 도는 시간마다 조건 충족 시 발송.
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_nudge_targets()
 RETURNS TABLE(user_id uuid, token text, platform text, nudge_type text, title text, body text, deeplink_val text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT DISTINCT ON (pt.user_id)
    pt.user_id,
    pt.token,
    pt.platform,
    pn.nudge_type,
    COALESCE(
      pn.title_map->>dl.val,
      pn.title
    )                                        AS title,
    body_pool.val                            AS body,
    dl.val                                   AS deeplink_val
  FROM push_tokens pt

  JOIN (
    -- KST 달력일 기준 유휴일수(경과 시간이 아니라 날짜 차이 → 자정 넘으면 +1일)
    SELECT user_id,
           (now() AT TIME ZONE 'Asia/Seoul')::date
             - (MAX(created_at) AT TIME ZONE 'Asia/Seoul')::date AS idle_days
    FROM analytics_events
    GROUP BY user_id
  ) idle ON idle.user_id = pt.user_id

  JOIN subscriptions sub ON sub.user_id = pt.user_id

  JOIN push_nudge pn
    ON pn.persona    = sub.persona
   AND pn.active     = true
   AND pn.nudge_type = 'quiz'        -- 코드맞추기만 발송 (나머지 3종 데이터 보존)

  JOIN LATERAL (
    SELECT val
    FROM jsonb_array_elements_text(pn.deeplink_pool) AS t(val)
    ORDER BY random()
    LIMIT 1
  ) dl ON true

  JOIN LATERAL (
    SELECT val
    FROM jsonb_array_elements_text(pn.body_pool) AS t(val)
    ORDER BY random()
    LIMIT 1
  ) body_pool ON true

  WHERE idle.idle_days BETWEEN 1 AND 2   -- 어제·그제 접속자만 / 당일(0)은 제외, 3일↑은 윈백 담당
    AND pt.token IS NOT NULL
    AND pt.nudge_enabled = true      -- 설정 > 푸시알림 > 연습 알림 OFF 시 제외

  ORDER BY pt.user_id, random();
$function$;

grant execute on function public.get_nudge_targets() to service_role;
