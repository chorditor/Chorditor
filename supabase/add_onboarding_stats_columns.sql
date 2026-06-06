-- subscriptions 테이블 온보딩/통계 컬럼 추가
-- _saveOnboardingData()가 저장하는 모든 컬럼 보장
-- Supabase SQL Editor에서 1회 실행

alter table public.subscriptions
  add column if not exists persona                 text,
  add column if not exists guitar_experience       text,
  add column if not exists gender                  text,
  add column if not exists birth_year              integer,
  add column if not exists nickname                text,
  add column if not exists consent_agreed_at       timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists stat_images             integer not null default 0,
  add column if not exists stat_shares             integer not null default 0;
