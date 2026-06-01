-- subscriptions 테이블 컬럼 추가
-- 1) nickname        : 온보딩 step5 닉네임 저장
-- 2) stat_images     : 이미지 저장 누적 횟수
-- 3) stat_shares     : 공유 누적 횟수
-- Supabase SQL Editor에서 1회 실행

alter table public.subscriptions
  add column if not exists nickname    text,
  add column if not exists stat_images integer not null default 0,
  add column if not exists stat_shares integer not null default 0;
