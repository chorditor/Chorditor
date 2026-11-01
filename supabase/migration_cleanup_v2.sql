-- ───────────────────────────────────────────────────────────
-- migration_cleanup_v2.sql : 30일 롤링 삭제 재설정 (검증된 구간만 삭제)
--
--   ⛔ 지금 실행하지 말 것. 아래 조건이 모두 확인된 뒤에만 실행한다.
--     ① supabase/migration_cursor_v2.sql 적용 완료
--     ② node scripts/incremental-sync.js 가 며칠 연속 정상 종료되고,
--        select * from migration_cursor 에서 verified_until 이 매일 최근 시각으로 올라가고 verified_at 이 갱신됨
--     ③ BigQuery 결제 계정 연결 + 테이블 만료 해제(만료가 걸려 있으면 verified_until 이 올라가지 않아 이 작업은 아무것도 안 지움)
--
--   삭제 조건 (모두 만족해야 지움):
--     · created_at(sent_at) < verified_until - 1일   (BigQuery 행 수까지 확인된 구간, 하루 여유)
--     · created_at(sent_at) < 지금 - 30일
--     · verified_at 이 3일 이내 (이관이 멈췄으면 삭제도 멈춤)
--   옛 정의(id <= last_id)는 무작위 UUID에서 거의 모든 행이 참이 되는 결함이 있어 폐기했다.
-- ───────────────────────────────────────────────────────────

create extension if not exists pg_cron;

select cron.unschedule('analytics-retention-cleanup')
where exists (select 1 from cron.job where jobname = 'analytics-retention-cleanup');

-- 매주 일요일 18:00 UTC(월 03:00 KST)
select cron.schedule(
  'analytics-retention-cleanup',
  '0 18 * * 0',
  $$
  delete from public.analytics_events ae
  using public.migration_cursor mc
  where mc.table_name = 'analytics_events'
    and mc.verified_until is not null
    and mc.verified_at > now() - interval '3 days'
    and ae.created_at < mc.verified_until - interval '1 day'
    and ae.created_at < now() - interval '30 days';

  delete from public.push_send_log psl
  using public.migration_cursor mc
  where mc.table_name = 'push_send_log'
    and mc.verified_until is not null
    and mc.verified_at > now() - interval '3 days'
    and psl.sent_at < mc.verified_until - interval '1 day'
    and psl.sent_at < now() - interval '30 days';

  delete from public.push_winback_log pwl
  using public.migration_cursor mc
  where mc.table_name = 'push_winback_log'
    and mc.verified_until is not null
    and mc.verified_at > now() - interval '3 days'
    and pwl.sent_at < mc.verified_until - interval '1 day'
    and pwl.sent_at < now() - interval '30 days';
  $$
);

-- 확인 (읽기 전용)
select jobid, jobname, schedule, active from cron.job where jobname = 'analytics-retention-cleanup';
