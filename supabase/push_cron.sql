-- ───────────────────────────────────────────────────────────
-- push_cron.sql : pg_cron 으로 push-dispatch Edge Function 매일 호출
--   발송 슬롯 = 17:00 KST = 08:00 UTC (cron 은 UTC 기준)
--   요일 게이트(월요일만 stage2~)는 함수 내부에서 처리 → cron 은 매일 실행.
--
-- 사전: Dashboard > Database > Extensions 에서 pg_cron, pg_net 활성화.
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 기존 동일 작업 있으면 제거(재실행 안전)
select cron.unschedule('push-winback-daily')
where exists (select 1 from cron.job where jobname = 'push-winback-daily');

-- 매일 08:00 UTC(17:00 KST) push-dispatch 호출
select cron.schedule(
  'push-winback-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-dispatch',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select * from cron.job;
