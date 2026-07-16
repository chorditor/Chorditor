-- ───────────────────────────────────────────────────────────
-- XP(레벨 경험치) 시스템 — subscriptions.user_xp 귀속.
--   sync_user_xp(p_xp): 클라 로컬 XP와 서버값을 GREATEST 병합(다기기 안전).
--   반환 = 병합 후 서버값. 클라는 반환값이 더 크면 로컬에 채택.
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists user_xp integer not null default 0;

create or replace function public.sync_user_xp(p_xp integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer;
begin
  update public.subscriptions
    set user_xp = greatest(coalesce(user_xp, 0), coalesce(p_xp, 0))
    where user_id = auth.uid()
    returning user_xp into v_xp;
  if not found then return coalesce(p_xp, 0); end if;
  return v_xp;
end;
$$;

grant execute on function public.sync_user_xp(integer) to authenticated;
