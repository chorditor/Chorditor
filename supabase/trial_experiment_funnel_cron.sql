-- ───────────────────────────────────────────────────────────
-- trial_experiment_funnel_cron.sql : refresh_trial_experiment_funnel()를 매일 1회 실행.
--   순수 SQL 함수라 Edge Function 불필요 — pg_cron이 함수를 직접 호출.
--   trial_experiment_funnel.sql 먼저 실행(함수 의존).
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;

select cron.unschedule('trial-experiment-funnel-daily')
where exists (select 1 from cron.job where jobname = 'trial-experiment-funnel-daily');

-- 매일 20:10 UTC(다음날 05:10 KST) — 하루치 이벤트가 대부분 쌓인 새벽에 스냅샷
select cron.schedule(
  'trial-experiment-funnel-daily',
  '10 20 * * *',
  $$ select public.refresh_trial_experiment_funnel(); $$
);

-- 확인: select * from cron.job where jobname = 'trial-experiment-funnel-daily';
