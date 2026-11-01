-- ───────────────────────────────────────────────────────────
-- user_persona_profile_scores.sql : 패턴 점수 누적 컬럼 추가 (2026-11-01)
--
--   유저 1명 = 1행 그대로. 월마다 새 행을 쌓지 않고 아래 컬럼만 덮어쓴다(행 수 = 유저 수 유지).
--   점수 = 영역별 Σ min(월 건수, 상한) × 행동 점수 (scripts/compute-persona-profile.js PREF_SCORES 와 같은 표)
--
--   total_*  : 지난 달들(score_month 이전 전부)의 영역별 점수 합 — 한 번 더해지면 고정
--   cur_*    : score_month(이번 달) 점수 — 배치가 돌 때마다 덮어씀. 달이 바뀌면 total_*에 더하고 새 달로 시작
--   last_*   : 4개 영역 중 최고점이 5점 이상이었던 가장 최근 달(last_month)의 영역별 점수
--
--   pref_type 분류 규칙:
--     1) last_month 가 있으면 → last_* 중 최고 영역 (동점이면 comping > soloing > harmony > toolkit)
--     2) 없으면 total_* 중 최고 영역이 0 초과면 → 그 영역
--     3) 모든 점수가 0 → pref_type = 'unclassified' (미분류)
-- ───────────────────────────────────────────────────────────

alter table public.user_persona_profile
  add column if not exists score_month    text,                       -- 'YYYY-MM' (KST) : cur_* 가 가리키는 달
  add column if not exists total_comping  numeric not null default 0,
  add column if not exists total_soloing  numeric not null default 0,
  add column if not exists total_harmony  numeric not null default 0,
  add column if not exists total_toolkit  numeric not null default 0,
  add column if not exists cur_comping    numeric not null default 0,
  add column if not exists cur_soloing    numeric not null default 0,
  add column if not exists cur_harmony    numeric not null default 0,
  add column if not exists cur_toolkit    numeric not null default 0,
  add column if not exists last_month     text,                       -- 'YYYY-MM' : 최고점 5점 이상이었던 가장 최근 달
  add column if not exists last_comping   numeric not null default 0,
  add column if not exists last_soloing   numeric not null default 0,
  add column if not exists last_harmony   numeric not null default 0,
  add column if not exists last_toolkit   numeric not null default 0;

-- 확인(읽기 전용): 13개 컬럼이 보이면 성공
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'user_persona_profile'
  and (column_name like 'total\_%' or column_name like 'cur\_%' or column_name like 'last\_%' or column_name = 'score_month')
order by column_name;
