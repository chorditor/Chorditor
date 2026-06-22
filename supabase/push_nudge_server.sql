-- ───────────────────────────────────────────────────────────
-- push_nudge_server.sql
-- 넛지 타겟팅 함수: 유휴 0~2일대 유저에게 '코드맞추기(quiz)' 딥링크 발송.
--   - quiz 고정: 앱 초반 마케팅 = 코드맞추기 (전환율·페이월 진입 최고).
--     scale/progression/strum 행은 push_nudge 에 보존(미삭제), 발송만 제외.
--   - 하한 제거: 당일 접속(idle 0)도 대상. 앱 포그라운드면 알림 미표시(앱/시스템 처리).
--   - 상한 3일 미만: idle_days >= 3 은 윈백(get_winback_targets stage1)이 담당.
--   - 매일 발송: 중복방지 로그 없음 → cron 매일 20:30 KST 마다 발송.
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
    SELECT user_id,
           EXTRACT(EPOCH FROM (now() - MAX(created_at))) / 86400 AS idle_days
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

  WHERE idle.idle_days <  3          -- 하한 제거(당일 접속 포함) / 3일↑은 윈백 담당
    AND pt.token IS NOT NULL

  ORDER BY pt.user_id, random();
$function$;

grant execute on function public.get_nudge_targets() to service_role;
