-- ───────────────────────────────────────────────────────────
-- add_persona_write_policy.sql : 승급/강등 시 유저 본인이 자기 persona만
-- 즉시 upsert 할 수 있게 RLS 정책 추가.
--
--   setUserPersona()(shared.js)가 승급/강등 커밋 시점에 이 테이블에도
--   바로 씀 — user_persona_profile을 "persona=즉시, 나머지 3축=30일배치"
--   하이브리드 유저관리 총집합 테이블로 쓰기 위함.
-- ───────────────────────────────────────────────────────────

create policy "user_persona_profile_upsert_own_persona"
  on public.user_persona_profile for insert
  with check (auth.uid() = user_id);

create policy "user_persona_profile_update_own_persona"
  on public.user_persona_profile for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 확인: 본인 계정으로 로그인한 상태에서 클라이언트가
-- persona 필드만 담아 upsert(on_conflict=user_id) 요청 보내면 성공해야 함.
