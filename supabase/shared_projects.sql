-- ───────────────────────────────────────────────────────────
-- shared_projects : 코드 진행 공유 페이로드 서버 저장
--   목적: 공유 링크/코드를 16자 랜덤 코드로 짧게 만들고, 페이로드는 DB에 저장.
--   기존(오프라인 base64 payload 통짜 인코딩) 방식은 유지 — 이 테이블은
--   신규 생성 건에만 사용, 과거 공유된 ?share= 링크는 그대로 계속 동작함.
--   로그인 여부와 무관하게(익명 포함) 만들고 볼 수 있어야 하므로 anon 허용.
-- ───────────────────────────────────────────────────────────

create table if not exists public.shared_projects (
  code        text primary key,     -- 클라이언트 생성 base62 16자
  payload     text not null,        -- buildSharePayload() JSON 문자열
  created_at  timestamptz not null default now()
);

alter table public.shared_projects enable row level security;

-- 누구나 새 공유 코드 생성 가능(익명 포함) — 공유 발행은 로그인 불필요
drop policy if exists shared_projects_insert on public.shared_projects;
create policy shared_projects_insert
  on public.shared_projects
  for insert
  to anon, authenticated
  with check (true);

-- 누구나 code로 조회 가능 — 공유받은 쪽은 로그인 여부와 무관하게 열람
drop policy if exists shared_projects_select on public.shared_projects;
create policy shared_projects_select
  on public.shared_projects
  for select
  to anon, authenticated
  using (true);
