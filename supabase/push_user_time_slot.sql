-- ───────────────────────────────────────────────────────────
-- push_user_time_slot.sql : 유저별 접속 시간대 패턴(16시조/2045조) 판정 함수.
--   analytics_events 기준 14~17시(KST) vs 19~23시(KST) 이벤트 수 비교.
--   1.5배 이상 쏠려야 해당 조로 분류, 애매/무데이터는 2045조로 편입(다수파, 합의사항).
--   push-dispatch가 ?time_slot=1600|2045 필터링에 사용.
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_time_slot()
 RETURNS TABLE(user_id uuid, time_slot text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  WITH hourly AS (
    SELECT
      ae.user_id,
      EXTRACT(HOUR FROM ae.created_at AT TIME ZONE 'Asia/Seoul') AS hr
    FROM analytics_events ae
  ),
  bucketed AS (
    SELECT
      h.user_id,
      COUNT(*) FILTER (WHERE hr BETWEEN 14 AND 17) AS cnt_16,
      COUNT(*) FILTER (WHERE hr BETWEEN 19 AND 23) AS cnt_2045
    FROM hourly h
    GROUP BY h.user_id
  )
  SELECT
    b.user_id,
    CASE
      WHEN b.cnt_16 >= b.cnt_2045 * 1.5 THEN '1600'
      ELSE '2045'   -- 2045조 우세 + 애매 + 무데이터 전부 2045조 편입
    END AS time_slot
  FROM bucketed b;
$function$;

grant execute on function public.get_user_time_slot() to service_role;

-- 확인: select time_slot, count(*) from get_user_time_slot() group by time_slot;
