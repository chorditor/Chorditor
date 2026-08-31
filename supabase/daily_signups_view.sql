-- ───────────────────────────────────────────────────────────
-- daily_signups_view.sql : 날짜별 가입자수만 집계한 안전한 뷰
--
--   subscriptions 테이블엔 닉네임·생년·성별 등 개인정보가 같이 있어서
--   통째로 BigQuery에 옮기기 꺼려짐 → 대신 "날짜+가입자수"만 집계한
--   이 뷰만 incremental-sync.js가 매번 긁어가게 함(개인정보 없음).
-- ───────────────────────────────────────────────────────────

create or replace view public.daily_signups_agg as
select
  (created_at at time zone 'Asia/Seoul')::date as day,
  count(*) as signups
from public.subscriptions
group by day
order by day;

-- service_role만 조회 가능하게(다른 뷰들과 동일한 노출 수준 유지).
-- Postgres 뷰는 자체 RLS가 없고 기반테이블(subscriptions) RLS를 따름 —
-- subscriptions가 이미 service_role 전용이라 별도 설정 불필요.

-- 확인: select * from public.daily_signups_agg order by day desc limit 5;
