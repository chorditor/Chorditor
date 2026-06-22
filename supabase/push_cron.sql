-- ───────────────────────────────────────────────────────────
-- push_cron.sql : pg_cron 으로 push-dispatch Edge Function 매일 호출
--   발송 슬롯 = 20:30 KST = 11:30 UTC (cron 은 UTC 기준)
--   넛지·윈백 공용 디스패처 → 둘 다 이 슬롯에 발송.
--   요일 게이트(월요일만 stage2~)는 함수 내부에서 처리 → cron 은 매일 실행.
--
-- 사전: Dashboard > Database > Extensions 에서 pg_cron, pg_net 활성화.
--
-- ⚠️ Authorization 헤더 필수: Supabase Functions 게이트웨이가 apikey/bearer 요구.
--    누락 시 401 UNAUTHORIZED_NO_AUTH_HEADER 로 거부되어 발송 안 됨(전례 있음).
--    anon 키는 공개값이라 박아도 안전 — 게이트웨이 통과용. dispatch 내부는 SERVICE_ROLE 동작.
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 기존 동일 작업 있으면 제거(재실행 안전)
select cron.unschedule('push-winback-daily')
where exists (select 1 from cron.job where jobname = 'push-winback-daily');

-- 매일 11:30 UTC(20:30 KST) push-dispatch 호출
select cron.schedule(
  'push-winback-daily',
  '30 11 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select * from cron.job;
