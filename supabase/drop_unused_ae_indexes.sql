-- analytics_events 저효율 인덱스 4개 제거
-- 테이블/컬럼/행 손실 없음. 인덱스 오브젝트만 삭제.
-- 회수 예상: 약 13MB + 신규 행당 쓰기 비용 43B 감소
-- 실행: Supabase Dashboard > SQL Editor (전체 블록 한 번에)

-- 락 대기로 INSERT가 밀리지 않도록 3초 제한
SET lock_timeout = '3s';

DROP INDEX IF EXISTS public.idx_ae_plan;      -- 카디널리티 2~3 (free/pro)
DROP INDEX IF EXISTS public.idx_ae_platform;  -- 카디널리티 2~3 (android/web/ios)
DROP INDEX IF EXISTS public.idx_ae_category;  -- event_name 인덱스로 대체 가능
DROP INDEX IF EXISTS public.idx_ae_anon_id;   -- 분석 규칙이 login-only. anon 퍼널 볼 계획이면 이 줄만 빼고 실행

RESET lock_timeout;


-- ── 검증: 남은 인덱스 확인 (4개만 남아야 정상) ──────────────
SELECT
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan AS scans
FROM pg_stat_user_indexes
WHERE relname = 'analytics_events'
ORDER BY pg_relation_size(indexrelid) DESC;


-- ── 검증: 테이블 크기 변화 확인 ─────────────────────────────
SELECT
  pg_size_pretty(pg_total_relation_size('public.analytics_events')) AS total,
  pg_size_pretty(pg_relation_size('public.analytics_events'))       AS heap,
  pg_size_pretty(pg_indexes_size('public.analytics_events'))        AS indexes;


-- ── 되돌리기 (필요 시에만) ──────────────────────────────────
-- CREATE INDEX idx_ae_plan     ON public.analytics_events (plan);
-- CREATE INDEX idx_ae_platform ON public.analytics_events (platform);
-- CREATE INDEX idx_ae_category ON public.analytics_events (event_category);
-- CREATE INDEX idx_ae_anon_id  ON public.analytics_events (anon_id);
