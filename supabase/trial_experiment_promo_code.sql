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
--   Supabase SQL Editor에서 1회 실행. 실제 배포 시점에 맞춰 expires_at 재확인할 것.
-- ───────────────────────────────────────────────────────────

insert into public.promo_codes (code, peakbox_amount, pro_days, max_uses, expires_at, active, memo)
values (
  '10K_TRIAL_7D',
  0,
  7,
  null,                              -- 수량 무제한(MAU 전원 대상)
  now() + interval '30 days',        -- 클레임 마감 — docs/trial-experiment-dashboard-plan.md §2 참고
  true,
  '1만 다운로드 기념 7일 체험권 (2026-09 캠페인)'
)
on conflict (code) do nothing;
