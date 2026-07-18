-- ───────────────────────────────────────────────────────────
-- push_category_prefs : 설정 > 푸시알림 하위 페이지의 "연습 알림"(넛지) /
--   "리마인드"(윈백) 토글용 컬럼. push_tokens에 붙여서 서버 타겟팅 함수가
--   바로 필터링할 수 있게 함. 기본값 true(기존 유저 = 옵트아웃 안 한 상태 유지).
-- ───────────────────────────────────────────────────────────

alter table public.push_tokens
  add column if not exists nudge_enabled   boolean not null default true,
  add column if not exists winback_enabled boolean not null default true;
