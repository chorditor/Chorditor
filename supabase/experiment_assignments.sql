-- ───────────────────────────────────────────────────────────
-- A/B 실험 배정 (experiment_assignments)
--   실험이 늘어나도 컬럼이 아니라 행이 늘어나도록 별도 테이블로 둔다.
--   배정값은 한 번 정해지면 절대 다시 계산하지 않는다 — 재배정되면
--   subscriptions.tutorial_step(자리 번호)이 가리키는 챕터가 통째로 바뀐다.
--   그래서 (user_id, experiment) 복합 PK로 중복 배정을 DB가 막는다.
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

create table if not exists public.experiment_assignments (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  experiment  text        not null,
  variant     text        not null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, experiment)
);

alter table public.experiment_assignments enable row level security;

drop policy if exists "own assignments readable" on public.experiment_assignments;
create policy "own assignments readable"
  on public.experiment_assignments
  for select
  using (auth.uid() = user_id);

-- 배정 조회 + 없으면 생성.
--   hash(user_id + 실험명) 결정론적 분기 — 실험명을 섞어야 다음 실험에서
--   같은 유저가 또 같은 팔로 몰리지 않는다(직교성).
--   클라가 user_id를 넘기지 않고 auth.uid()만 쓰므로 남의 배정을 건드릴 수 없다.
create or replace function public.get_or_assign_variant(p_experiment text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_variant text;
begin
  if v_uid is null or p_experiment is null then return null; end if;

  -- 실험명을 자유 문자열로 받으면 인증된 유저가 임의 이름으로 행을 무한히 만들 수 있다
  -- (security definer라 RLS도 안 걸린다). 실험이 늘면 이 목록에 추가한다.
  if p_experiment not in ('tutorial_order') then return null; end if;

  select variant into v_variant
    from public.experiment_assignments
    where user_id = v_uid and experiment = p_experiment;
  if found then return v_variant; end if;

  v_variant := case
    when (('x' || substr(md5(v_uid::text || p_experiment), 1, 8))::bit(32)::bigint) % 2 = 0
    then 'A' else 'B'
  end;

  insert into public.experiment_assignments (user_id, experiment, variant)
    values (v_uid, p_experiment, v_variant)
    on conflict (user_id, experiment) do nothing;

  -- 동시 요청으로 다른 쪽이 먼저 넣었을 수 있으니 최종값을 다시 읽는다
  select variant into v_variant
    from public.experiment_assignments
    where user_id = v_uid and experiment = p_experiment;

  return v_variant;
end;
$$;

grant execute on function public.get_or_assign_variant(text) to authenticated;
