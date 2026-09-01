-- ───────────────────────────────────────────────────────────
-- add_promo_attempts.sql : 승급시험 하루 도전 횟수를 user_persona_profile에 기록
--   무료1회 + 광고시청1회 = 총 2회/일, KST 자정 리셋(클라이언트 _kstToday() 기준).
--   생성 시점의 날짜와 다르면 클라이언트가 used=0으로 취급(별도 cron 리셋 불필요).
-- ───────────────────────────────────────────────────────────

alter table public.user_persona_profile
  add column if not exists promo_attempts_date date,
  add column if not exists promo_attempts_used smallint not null default 0;

-- 확인: select user_id, promo_attempts_date, promo_attempts_used from public.user_persona_profile limit 10;
