-- ───────────────────────────────────────────────────────────
-- migration_cleanup_pause.sql : 30일 롤링 삭제 작업 즉시 중지 (긴급, 2026-11-01)
--
--   배경: 이관 커서가 무작위 UUID라 시간순이 아니어서 "이관 완료" 판정이 거의 모든 행에 참이 됨 →
--   BigQuery에 안 넘어간 행(2026-08-28 ~ 09-25)이 30일 지나 삭제됐다.
--   다음 실행은 일요일 18:00 UTC(월 03:00 KST) — 그 전에 이 SQL을 실행해 삭제를 멈출 것.
--   안전장치를 새로 만들어 검증이 끝나기 전에는 이 작업을 다시 걸지 말 것(supabase/migration_cursor.sql의 옛 정의로 되돌리지 말 것).
-- ───────────────────────────────────────────────────────────

-- ① 삭제 작업 해제 (이미 없으면 아무 일도 안 함)
select cron.unschedule('analytics-retention-cleanup')
where exists (select 1 from cron.job where jobname = 'analytics-retention-cleanup');

-- ② 확인 (읽기 전용) — 결과가 0행이면 해제된 것
select jobid, jobname, schedule, active from cron.job where jobname = 'analytics-retention-cleanup';
