-- ───────────────────────────────────────────────────────────
-- migration_cursor_v2.sql : BigQuery 이관 검증 상태 컬럼 추가 (2026-11-01 새 이관 로직용)
--
--   옛 방식(id 커서)은 id가 무작위 UUID라 시간순이 아니어서 이관이 거의 안 됐고,
--   "id <= 커서"로 판정하던 삭제 조건이 이관 안 된 행까지 지웠다(2026-08-28 ~ 09-25 소실).
--   새 방식은 시간(created_at / sent_at) 기준으로 이관하고, BigQuery의 실제 행 수를 세서
--   Supabase와 같을 때만 "여기까지 확인됨"으로 기록한다. 삭제는 이 기록을 믿고만 한다.
--
--   적용 순서: ① 이 SQL 실행 → ② node scripts/incremental-sync.js 로 이관·검증이 되는지 확인
--             → ③ 며칠 정상이면 supabase/migration_cleanup_v2.sql 실행(삭제 작업 재설정)
-- ───────────────────────────────────────────────────────────

-- ① 컬럼 추가 (여러 번 실행해도 안전). 옛 last_id 컬럼은 남겨 두지만 더 이상 안 쓴다.
alter table public.migration_cursor
  add column if not exists synced_until   timestamptz,   -- 여기까지 BigQuery에 넣고 행 수가 맞음을 확인(다음 이관의 시작점)
  add column if not exists verified_until timestamptz,   -- 삭제해도 되는 경계 — 이관 검증 + BigQuery 만료 없음 + 행 수 감소 없음일 때만 올라감
  add column if not exists verified_at    timestamptz,   -- 마지막으로 검증이 성공한 시각(삭제 작업이 3일 넘게 묵은 기록은 무시)
  add column if not exists bq_row_count   bigint,        -- 그때 BigQuery 테이블 총 행 수(다음 이관에서 줄어들었는지 비교)
  add column if not exists last_report    jsonb;         -- 마지막 실행 요약(Supabase 행 수 · BigQuery 행 수 · 적재 행 수 등)

comment on column public.migration_cursor.synced_until   is '이관 시작점: 이 시각까지 BigQuery 적재와 행 수 확인 완료';
comment on column public.migration_cursor.verified_until is '삭제 허용 경계: 이 시각 이전 행만 지워도 됨(검증·만료·행 수 감소 조건 통과 시에만 갱신)';
comment on column public.migration_cursor.verified_at    is '마지막 검증 성공 시각(3일 넘게 묵으면 삭제 작업이 아무것도 안 지움)';
comment on column public.migration_cursor.bq_row_count   is '마지막 이관 후 BigQuery 테이블 총 행 수';
comment on column public.migration_cursor.last_report    is '마지막 이관 실행 요약(JSON)';

-- ② 확인 (읽기 전용) — 이관 스크립트를 돌린 뒤 이걸로 눈으로 본다:
--    bq_row_count 가 이전 실행보다 늘었는지, verified_until 이 최근 시각인지, last_report 의 supabase_count 와 bq_count 가 같은지
select table_name, synced_until, verified_until, verified_at, bq_row_count, last_report
from public.migration_cursor
order by table_name;
