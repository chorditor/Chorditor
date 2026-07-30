-- ───────────────────────────────────────────────────────────
-- push_cron_winback.sql : pg_cron 으로 push-winback Edge Function 매일 1회 호출.
--   기존 push-winback-daily job이 push-dispatch를 불렀던 것을 push-winback으로 교체
--   (윈백은 하루 1회, 코드맞추기 넛지는 연령대별 다회 호출로 분리됨, 2026-07-31).
-- ───────────────────────────────────────────────────────────

select cron.unschedule('push-winback-daily')
where exists (select 1 from cron.job where jobname = 'push-winback-daily');

-- 매일 11:30 UTC(20:30 KST) push-winback 호출
select cron.schedule(
  'push-winback-daily',
  '30 11 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-winback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select * from cron.job where jobname = 'push-winback-daily';
