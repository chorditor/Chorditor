-- 훈련 통계를 subscriptions 테이블로 통합
-- (연속기록 streak / 훈련시간 training_time_min / 훈련완료 total_completed)
-- Supabase SQL Editor에서 실행.

alter table public.subscriptions
  add column if not exists streak             integer  not null default 0,
  add column if not exists training_time_min  numeric  not null default 0,
  add column if not exists total_completed    integer  not null default 0,
  add column if not exists streak_synced_date date;

-- RLS: 본인 행 INSERT/UPDATE 허용 (SELECT 정책은 기존 가정)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='subscriptions'
      and policyname='subscriptions_insert_own'
  ) then
    create policy subscriptions_insert_own on public.subscriptions
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='subscriptions'
      and policyname='subscriptions_update_own'
  ) then
    create policy subscriptions_update_own on public.subscriptions
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
