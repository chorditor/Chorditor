-- ───────────────────────────────────────────────────────────
-- delete_own_account : 설정 페이지 "계정 삭제" 버튼에서 호출하는 RPC
--   auth.users에서 본인 행 삭제 → projects/push_tokens/구독 등 관련 테이블은
--   전부 "on delete cascade"로 FK 연결되어 있어 자동 정리됨.
--   security definer로 auth.users를 직접 지울 권한 확보, auth.uid()로 본인 것만 허용.
-- ───────────────────────────────────────────────────────────

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
