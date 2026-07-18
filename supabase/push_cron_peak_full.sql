-- ───────────────────────────────────────────────────────────
-- push_cron_peak_full.sql : pg_cron 으로 push-peak-full Edge Function
--   30분마다 호출(픽 회복 주기와 동일 간격, peak_system.sql 참고).
--   야간 제한(21:00~08:00 KST)은 Edge Function 내부에서 게이트하므로
--   cron 자체는 하루 종일 30분 간격으로 실행.
--
-- 사전: Dashboard > Database > Extensions 에서 pg_cron, pg_net 활성화.
--       push_peak_full.sql 을 먼저 실행(컬럼/함수 의존).
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('push-peak-full-30min')
where exists (select 1 from cron.job where jobname = 'push-peak-full-30min');

select cron.schedule(
  'push-peak-full-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-peak-full',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select * from cron.job;
