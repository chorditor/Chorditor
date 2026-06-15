-- subscriptions RLS 정책: 인증 유저가 '본인' 행을 insert/update 가능하도록 허용
-- 증상: 계정 삭제 후 재로그인 시 신규 행 INSERT → 42501 (RLS 위반, 403)
-- 원인: SELECT 정책만 있고 INSERT/UPDATE 정책 없음
-- ⚠️ RLS = 보안 설정. 실행 전 기존 정책과 충돌(동일 이름) 여부 확인.
--    동일 이름 정책이 이미 있으면 해당 create 문은 건너뛰거나 먼저 drop.

-- RLS 활성 보장 (이미 켜져 있으면 무해)
alter table public.subscriptions enable row level security;

-- 본인 행 INSERT 허용
create policy "subscriptions_insert_own"
  on public.subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 본인 행 UPDATE 허용 (upsert merge-duplicates 대비)
create policy "subscriptions_update_own"
  on public.subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
