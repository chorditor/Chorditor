-- ───────────────────────────────────────────────────────────
-- migration_cursor.sql : BigQuery 이관 진행상태 + 30일 롤링 삭제
--
--   테이블별로 "마지막으로 이관한 행의 id"만 기억 → 매일 증분이관 시
--   처음부터 다시 안 긁고 그 이후 것만 가져감(cursor pagination).
--   테이블 추가할 땐 여기 스키마 변경 없이 새 row(table_name)만 생기면 됨.
--
--   삭제 조건은 반드시 "created_at < 30일 전" AND "id <= 이미 이관 확인된 last_id"
--   둘 다 걸어야 함 — 이관 실패한 행을 먼저 지우는 사고 방지용 이중 안전장치.
-- ───────────────────────────────────────────────────────────

create table if not exists public.migration_cursor (
  table_name text primary key,          -- 'analytics_events', 'push_send_log' 등
  last_id    text,                      -- 마지막으로 BigQuery에 넣은 행의 id (uuid는 text로 저장)
  updated_at timestamptz not null default now()
);

alter table public.migration_cursor enable row level security;
-- service_role(Cloud Function)만 접근. 일반 정책 없음 = anon/authenticated 차단.

-- ── 30일 롤링 삭제 (매주 자동 실행) ──────────────────────────
create extension if not exists pg_cron;

select cron.unschedule('analytics-retention-cleanup')
where exists (select 1 from cron.job where jobname = 'analytics-retention-cleanup');

-- 매주 일요일 18:00 UTC(일 03:00 KST) 실행. 대상 테이블 늘리면 아래 DELETE 블록만 추가.
select cron.schedule(
  'analytics-retention-cleanup',
  '0 18 * * 0',
  $$
  delete from public.analytics_events ae
  using public.migration_cursor mc
  where mc.table_name = 'analytics_events'
    and mc.last_id is not null
    and ae.id::text <= mc.last_id
    and ae.created_at < now() - interval '30 days';

  delete from public.push_send_log psl
  using public.migration_cursor mc
  where mc.table_name = 'push_send_log'
    and mc.last_id is not null
    and psl.id::text <= mc.last_id
    and psl.sent_at < now() - interval '30 days';

  delete from public.push_winback_log pwl
  using public.migration_cursor mc
  where mc.table_name = 'push_winback_log'
    and mc.last_id is not null
    and pwl.id::text <= mc.last_id
    and pwl.sent_at < now() - interval '30 days';
  $$
);

-- 확인: select * from public.migration_cursor;
-- 확인: select * from cron.job where jobname = 'analytics-retention-cleanup';
