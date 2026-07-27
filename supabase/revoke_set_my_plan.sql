-- ───────────────────────────────────────────────────────────
-- 보안: set_my_plan 자가 승급 차단
--   set_my_plan은 호출자 신원(auth.uid())만 확인하고 "실제 결제 여부"는
--   검증하지 않는다. authenticated/PUBLIC에 EXECUTE가 열려 있으면 로그인한
--   누구나 콘솔에서 set_my_plan('pro')로 자가 승급이 가능하다.
--   (웹 버전은 브라우저 콘솔로 즉시 재현 가능)
--
--   결제 후 plan 반영은 RevenueCat 웹훅(service_role, 테이블 직접 upsert)이
--   담당하므로 이 RPC를 막아도 결제 흐름은 깨지지 않는다.
--   클라의 updateSupabasePlan() 호출은 403이 되지만 console.error만 남고
--   로컬 setPlan()은 이미 선반영되어 UI도 정상.
--
--   Postgres는 함수 생성 시 PUBLIC에 EXECUTE를 기본 부여한다.
--   authenticated만 회수하면 PUBLIC 경로로 여전히 호출 가능하므로 셋 다 회수.
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'set_my_plan'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    raise notice 'revoked: %', r.sig;
  end loop;
end
$$;
