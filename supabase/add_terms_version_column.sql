-- 이용약관/개인정보처리방침 재동의 버전 컬럼
-- 기존 가입자는 전부 0(미동의) → 앱이 온보딩 관문에서 재동의 요구
-- Supabase SQL Editor에서 1회 실행

alter table public.subscriptions
  add column if not exists terms_version integer not null default 0;
