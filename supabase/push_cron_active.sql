-- ───────────────────────────────────────────────────────────
-- push_cron_active.sql : 5번(적극형) 주간 결산 푸시, 매주 월요일 1회 호출.
--   월요일 선택 이유: "주간 결산=월요일" 관습적 멘탈모델과 일치해 유저 이해도 우선
--   (활동량 자체는 월요일이 최저 요일이지만, 이해도가 열람률보다 중요하다고 판단, 2026-07-31).
--   시간은 12:00 KST(점심시간) — 기존 슬롯(10:00 실험/16:00 공통/18:00 teen/20:30 윈백/
--   20:45 공통)과 전부 겹치지 않게 분리. 같은 시각에 겹치면 "특별한 결산"이 일반 넛지
--   더미에 묻혀버리는 문제 있어 별도 시간대로 뺌(2026-07-31).
-- ───────────────────────────────────────────────────────────

select cron.unschedule('push-quiz-active-monday')
where exists (select 1 from cron.job where jobname = 'push-quiz-active-monday');

-- 매주 월요일 12:00 KST = 03:00 UTC
select cron.schedule(
  'push-quiz-active-monday',
  '0 3 * * 1',
  $$
  select net.http_post(
    url     := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-active',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 확인: select jobid, jobname, schedule, active from cron.job where jobname = 'push-quiz-active-monday';
