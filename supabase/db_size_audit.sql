-- DB 용량 실측 (읽기 전용, 순서대로 하나씩 실행)
-- 목적: analytics_events 최적화 전 실제 비용 구조 파악
-- 실행: Supabase Dashboard > SQL Editor

-- ─────────────────────────────────────────────
-- Q1. 전체 DB 크기 (500MB 한도 대비 현재 위치)
-- ─────────────────────────────────────────────
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_total;


-- ─────────────────────────────────────────────
-- Q2. 테이블별 크기 순위 (본체 / 인덱스 / TOAST 분리)
--     → 어디가 진짜 범인인지 확정
-- ─────────────────────────────────────────────
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid))                        AS total,
  pg_size_pretty(pg_relation_size(c.oid))                              AS heap,
  pg_size_pretty(pg_indexes_size(c.oid))                               AS indexes,
  pg_size_pretty(COALESCE(pg_total_relation_size(c.reltoastrelid), 0)) AS toast,
  c.reltuples::bigint                                                  AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public'
ORDER BY pg_total_relation_size(c.oid) DESC;


-- ─────────────────────────────────────────────
-- Q3. analytics_events 인덱스 개별 크기 + 사용 횟수
--     → idx_scan = 0 인 인덱스는 삭제 후보 (즉시 용량 회수)
-- ─────────────────────────────────────────────
SELECT
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan     AS scans,
  idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE relname = 'analytics_events'
ORDER BY pg_relation_size(indexrelid) DESC;


-- ─────────────────────────────────────────────
-- Q4. 이벤트별 행수 + 최근 30일 증가분
--     → 어떤 이벤트가 row 폭증 주범인지
-- ─────────────────────────────────────────────
SELECT
  event_name,
  count(*)                                                        AS total_rows,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS rows_30d,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS rows_7d,
  min(created_at)::date AS first_seen,
  max(created_at)::date AS last_seen
FROM public.analytics_events
GROUP BY event_name
ORDER BY total_rows DESC;


-- ─────────────────────────────────────────────
-- Q5. 이벤트별 실제 차지 바이트 (properties jsonb 무게 포함)
--     → "행 수 많은 것"과 "용량 먹는 것"은 다를 수 있음
-- ─────────────────────────────────────────────
SELECT
  event_name,
  count(*)                                         AS rows,
  pg_size_pretty(sum(pg_column_size(t.*)))         AS bytes_total,
  avg(pg_column_size(t.*))::int                    AS avg_row_bytes,
  avg(pg_column_size(properties))::int             AS avg_props_bytes,
  max(pg_column_size(properties))                  AS max_props_bytes
FROM public.analytics_events t
GROUP BY event_name
ORDER BY sum(pg_column_size(t.*)) DESC;


-- ─────────────────────────────────────────────
-- Q6. 월별 행수 추이 (증가 가속도 / 유튜브 코호트 유입 영향)
-- ─────────────────────────────────────────────
SELECT
  date_trunc('month', created_at)::date AS month,
  count(*)                              AS rows,
  count(DISTINCT COALESCE(user_id::text, anon_id)) AS uniq_people
FROM public.analytics_events
GROUP BY 1
ORDER BY 1;


-- ─────────────────────────────────────────────
-- Q7. 낭비 컬럼 확인 — ab_variants 가 전부 빈 객체인지
--     (A/B 테이블은 2026-06-22 DROP됨)
-- ─────────────────────────────────────────────
SELECT
  count(*)                                        AS total,
  count(*) FILTER (WHERE ab_variants = '{}'::jsonb) AS empty_ab,
  count(*) FILTER (WHERE properties  = '{}'::jsonb) AS empty_props,
  count(*) FILTER (WHERE user_id IS NULL)           AS anon_rows
FROM public.analytics_events;


-- ─────────────────────────────────────────────
-- Q8. dead tuple / bloat 확인
--     → VACUUM FULL 만으로 회수 가능한 용량이 있는지
-- ─────────────────────────────────────────────
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC
LIMIT 10;
