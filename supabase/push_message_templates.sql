-- ───────────────────────────────────────────────────────────
-- push_message_templates : 카테고리별 푸시 문구 여러 개 등록 → 발송 시 랜덤 1개 선택.
--   SQL Editor / Table Editor에서 직접 행 추가·수정·삭제로 문구 관리.
--   category: 'peak_full' (픽 30 완충 알림) — 다른 타입 추가 시 새 category 값만 늘리면 됨.
--   active=false 로 끄면 해당 문구는 더 이상 뽑히지 않음(행 삭제 없이 보관 가능).
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_message_templates (
  id         bigint generated always as identity primary key,
  category   text        not null,
  title      text        not null,
  body       text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create index if not exists push_message_templates_category_idx
  on public.push_message_templates (category) where active;

-- 기존 하드코딩 문구를 기본값으로 등록 (최초 1회)
insert into public.push_message_templates (category, title, body)
select 'peak_full', '픽이 가득 찼어요!', '픽 30개 완충! 지금 코드 연습을 시작해보세요.'
where not exists (select 1 from public.push_message_templates where category = 'peak_full');

-- category 랜덤 1개 조회 (Edge Function에서 호출)
create or replace function public.get_random_push_message(p_category text)
returns table (title text, body text)
language sql
security definer
set search_path = public
as $$
  select title, body
  from public.push_message_templates
  where category = p_category and active
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_push_message(text) to service_role;
