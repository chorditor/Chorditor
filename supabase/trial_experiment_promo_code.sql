-- ───────────────────────────────────────────────────────────
-- 7일 체험권 실험 — 캠페인 전용 프로모 코드
--   기존 promo_code_system.sql(redeem_promo_code RPC) 그대로 재사용.
--   유저가 직접 입력하는 코드가 아니라 클라이언트(claimTrialOffer())가 고정 코드로
--   자동 호출 — promo_redemptions PK(code,user_id)가 "1인 1회"를 DB 제약으로
--   자동 보장하므로 별도 "이미 클레임했는지" 체크 로직이 필요 없다.
--
--   expires_at = 클레임 마감(30일, 캠페인 공지 시점 기준) — pro_days(7, 받은 뒤 실제
--   체험 기간)와는 다른 값이니 혼동 주의.
--
--   ── 실행 흐름 (pre 테스트 → 프로덕션) ──────────────────────
--   1. pre 실기기 테스트용: 아래 insert를 그대로 실행(expires_at = now()+2일, 짧게).
--   2. 프로덕션 배포일: on conflict do nothing 이라 insert 재실행으론 안 바뀜.
--      아래 UPDATE 문으로 마감일을 30일로 다시 세팅해야 캠페인 실제 시작:
--        update public.promo_codes
--        set expires_at = now() + interval '30 days', active = true
--        where code = '10K_TRIAL_7D';
-- ───────────────────────────────────────────────────────────

insert into public.promo_codes (code, peakbox_amount, pro_days, max_uses, expires_at, active, memo)
values (
  '10K_TRIAL_7D',
  0,
  7,
  null,                              -- 수량 무제한(MAU 전원 대상)
  now() + interval '2 days',         -- pre 테스트용 짧은 마감. 프로덕션 배포일에 UPDATE로 30일 재설정(위 주석)
  true,
  '1만 다운로드 기념 7일 체험권 (2026-09 캠페인)'
)
on conflict (code) do nothing;
