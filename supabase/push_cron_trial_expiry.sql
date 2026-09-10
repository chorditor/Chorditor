-- ───────────────────────────────────────────────────────────
-- push_cron_trial_expiry.sql : pg_cron 으로 push-trial-expiry Edge Function 매일 1회 호출.
--   1만 다운로드 7일 체험권 만료 하루 전(클레임 6일차) 리마인드.
--   push_trial_expiry.sql(타겟팅 함수/락) + push-trial-expiry Edge Function 먼저 배포.
--
--   사전: Dashboard > Database > Extensions 에서 pg_cron, pg_net 활성화.
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('push-trial-expiry-daily')
where exists (select 1 from cron.job where jobname = 'push-trial-expiry-daily');

-- 매일 23:30 UTC(다음날 08:30 KST) 호출 — 아침 발송. 08:00 정각은 야간게이트(<8시) 경계에
-- 붙어 실행지연 시 막힐 수 있어 08:30으로 여유를 둠.
select cron.schedule(
  'push-trial-expiry-daily',
  '30 23 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-trial-expiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select * from cron.job where jobname = 'push-trial-expiry-daily';
