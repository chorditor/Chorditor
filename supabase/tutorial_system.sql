-- ───────────────────────────────────────────────────────────
-- 튜토리얼(퀘스트 체인) 진행 상태
--   tutorial_step         : 완료한 마지막 스텝 번호 (0 = 아무것도 안 함)
--   tutorial_skipped      : 건너뛰기 누른 적 있음 (자동 시작 중단 + 물음표 아이콘으로 재진입)
--   tutorial_completed_at : 전체 완료 시각 (최종 보상 지급 기준)
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists tutorial_step         integer not null default 0,
  add column if not exists tutorial_skipped      boolean not null default false,
  add column if not exists tutorial_completed_at timestamptz;

-- 조회: 클라 진입 시 자동 시작 여부 판정용
create or replace function public.get_tutorial_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step      integer;
  v_skipped   boolean;
  v_completed timestamptz;
begin
  select tutorial_step, tutorial_skipped, tutorial_completed_at
    into v_step, v_skipped, v_completed
    from public.subscriptions where user_id = auth.uid();

  return json_build_object(
    'step',      coalesce(v_step, 0),
    'skipped',   coalesce(v_skipped, false),
    'completed', v_completed
  );
end;
$$;

-- 스텝 진행 기록. 되돌아가지 않도록 GREATEST 병합 (로컬 값이 DB보다 낮아도 덮어쓰지 않음).
create or replace function public.set_tutorial_step(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step integer;
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set tutorial_step = greatest(coalesce(tutorial_step, 0), coalesce(p_step, 0))
    where user_id = auth.uid()
    returning tutorial_step into v_step;

  return json_build_object('ok', true, 'step', v_step);
end;
$$;

-- 건너뛰기: 자동 시작만 중단. 진행도(step)는 그대로 두어 나중에 이어서 할 수 있게 함.
create or replace function public.skip_tutorial()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set tutorial_skipped = true
    where user_id = auth.uid();

  return json_build_object('ok', true);
end;
$$;

-- 전체 완료: 최종 보상 지급 기준 시각 기록 (이미 완료면 시각 유지).
create or replace function public.complete_tutorial(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed timestamptz;
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set tutorial_step         = greatest(coalesce(tutorial_step, 0), coalesce(p_step, 0)),
        tutorial_completed_at = coalesce(tutorial_completed_at, now())
    where user_id = auth.uid()
    returning tutorial_completed_at into v_completed;

  return json_build_object('ok', true, 'completed', v_completed);
end;
$$;

-- 스텝별 완료 보상(피크상자). 값은 운영하며 조정 — 여기 한 곳만 고치면 된다.
create or replace function public._tutorial_step_reward(p_step integer)
returns integer
language sql
immutable
as $$
  select case p_step
    when 1 then 1   -- STEP1 코드 에디터
    else 0
  end;
$$;

-- 스텝 완료 처리 + 보상 지급. 이미 그 스텝을 넘긴 유저는 재지급되지 않는다.
create or replace function public.complete_tutorial_step(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur    integer;
  v_reward integer;
  v_box    integer;
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  select coalesce(tutorial_step, 0) into v_cur
    from public.subscriptions where user_id = auth.uid();

  if v_cur >= p_step then
    return json_build_object('ok', false, 'reason', 'already_claimed', 'step', v_cur, 'reward', 0);
  end if;

  v_reward := public._tutorial_step_reward(p_step);

  update public.subscriptions
    set tutorial_step = p_step,
        peakbox_count = peakbox_count + v_reward
    where user_id = auth.uid()
    returning peakbox_count into v_box;

  return json_build_object('ok', true, 'step', p_step, 'reward', v_reward, 'peakbox_count', v_box);
end;
$$;

grant execute on function public.get_tutorial_state()          to authenticated;
grant execute on function public.set_tutorial_step(integer)    to authenticated;
grant execute on function public.skip_tutorial()               to authenticated;
grant execute on function public.complete_tutorial(integer)      to authenticated;
grant execute on function public.complete_tutorial_step(integer) to authenticated;
