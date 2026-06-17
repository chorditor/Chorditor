-- ───────────────────────────────────────────────────────────
-- push_tokens : FCM 기기 토큰 저장
--   목적: 서버(Edge Function)가 유저에게 푸시 보낼 때 쓸 "기기 주소".
--   한 유저가 여러 기기 가능 → (user_id, token) 단위 저장.
--   token UNIQUE → 같은 기기 재등록 시 갱신(upsert).
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  token       text not null unique,        -- FCM 등록 토큰
  platform    text,                          -- 'android' | 'ios' | 'web'
  updated_at  timestamptz not null default now()
);

create index if not exists idx_push_tokens_user_id on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- 본인 토큰만 등록/수정/조회. 발송은 service_role(Edge Function)이 RLS 우회.
drop policy if exists push_tokens_upsert on public.push_tokens;
create policy push_tokens_upsert
  on public.push_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_tokens_update on public.push_tokens;
create policy push_tokens_update
  on public.push_tokens
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_tokens_select on public.push_tokens;
create policy push_tokens_select
  on public.push_tokens
  for select
  to authenticated
  using (user_id = auth.uid());
