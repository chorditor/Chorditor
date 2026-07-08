-- ───────────────────────────────────────────────────────────
-- projects : 로컬(localStorage) 프로젝트의 서버 백업 미러 + 공유 코드
--   목적: 앱을 삭제해도 로그인만 하면 프로젝트(가사 포함)가 복구되게 함.
--   로컬이 계속 source of truth — 매 saveProjects() 호출 시 백그라운드로
--   이 테이블에 업서트/삭제만 따라감(읽기 경로는 그대로 로컬, 앱 흐름 안 바뀜).
--   code/payload는 "공유하기"를 실제로 눌렀을 때만 채워짐(가사 제외 payload).
--   이 테이블이 shared_projects.sql(구, 익명 1회성 공유)을 대체함 — 그쪽 테이블은
--   더 이상 신규 코드 생성에 쓰이지 않음(그대로 둬도 무해, 원하면 수동 drop).
-- ───────────────────────────────────────────────────────────

create table if not exists public.projects (
  project_id   text primary key,          -- 로컬 project.id(genId())와 동일 값 — 업서트 매칭 키
  user_id      uuid not null references auth.users(id) on delete cascade,
  code         text unique,               -- 공유 시에만 채워짐(16자 base62). 미공유면 null
  title        text not null default '',
  content      jsonb not null,            -- 로컬 project 객체 전체(가사 포함) — 백업/복구용
  payload      jsonb,                     -- 공유용 payload(가사 제외) — 공유한 적 있을 때만
  pinned       boolean not null default false,
  important    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects (user_id);

alter table public.projects enable row level security;

-- 본인 프로젝트만 CRUD 가능 (백업 데이터는 비공개)
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all
  on public.projects
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 공유 조회 전용: code로 payload만 반환(가사/제목/user_id 등은 노출 안 됨).
-- RLS 우회 필요 → security definer. 로그인 여부 무관하게 실행 가능해야 하므로 anon도 grant.
create or replace function public.get_shared_payload(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select payload from public.projects where code = p_code and payload is not null limit 1;
$$;

grant execute on function public.get_shared_payload(text) to anon, authenticated;
