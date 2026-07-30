-- ───────────────────────────────────────────────────────────
-- push_cron_quiz_dispatch.sql : pg_cron 으로 push-dispatch(코드맞추기 넛지) 호출.
--   윈백은 push-winback으로 분리됨(push_cron_winback.sql) — 이 파일은 그 나머지
--   (중단인지형/성적형/연동형/일반넛지)만 담당하는 push-dispatch 전용.
--
--   연령대 분리(teen/adult) 대신 유저 개인별 접속 시간대 패턴(16시조/2045조,
--   get_user_time_slot())으로 개인화 — 하루 1인 1건만 발송됨(2026-07-31 변경).
--   16:00 KST 호출은 ?time_slot=1600 유저만, 20:45 KST 호출은 ?time_slot=2045 유저만 대상 →
--   겹치지 않으므로 유저당 하루 최대 1건.
-- ───────────────────────────────────────────────────────────

-- 기존 job 있으면 정리(재실행 안전) — 연령대 기반 4개 job 전부 폐기
select cron.unschedule(jobname)
from cron.job
where jobname in (
  'push-quiz-teen-1800',
  'push-quiz-adult-1600',
  'push-quiz-shared-2045',
  'push-quiz-adult-experiment-1000',
  'push-quiz-1600',
  'push-quiz-2045'
);

-- 16시조 16:00 KST = 07:00 UTC
select cron.schedule(
  'push-quiz-1600',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-dispatch?time_slot=1600',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 2045조 20:45 KST = 11:45 UTC
select cron.schedule(
  'push-quiz-2045',
  '45 11 * * *',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-dispatch?time_slot=2045',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select jobid, jobname, schedule, active from cron.job where jobname like 'push-quiz-%';
