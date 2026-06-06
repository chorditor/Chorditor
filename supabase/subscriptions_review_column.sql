-- 리뷰/평점 유도: 평가 완료 여부 (재설치 후 재노출 방지)
-- Supabase SQL Editor에서 실행.

alter table public.subscriptions
  add column if not exists review_rated boolean not null default false;
