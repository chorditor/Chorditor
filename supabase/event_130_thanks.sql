-- ───────────────────────────────────────────────────────────
-- 1.3.0 업데이트 감사 이벤트 — 기존 유저에게 피크상자 50개 1회 지급
--   대상: 이 마이그레이션 실행 시점에 이미 가입되어 있던 유저만
--        (실행 이후 신규가입 유저는 대상 아님)
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists event_130_claimed boolean not null default false;

-- 대상 스냅샷: 실행 시점 기준 기존 유저 전원 (이후 가입자는 자동 제외)
create table if not exists public.event_130_eligible (
  user_id uuid primary key
);
insert into public.event_130_eligible (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 조회: 이 유저가 대상인지 + 이미 수령했는지
create or replace function public.get_event_130_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eligible boolean;
  v_claimed  boolean;
begin
  select exists(select 1 from public.event_130_eligible where user_id = auth.uid()) into v_eligible;
  select coalesce(event_130_claimed, false) into v_claimed
    from public.subscriptions where user_id = auth.uid();
  return json_build_object('eligible', v_eligible, 'claimed', coalesce(v_claimed, false));
end;
$$;

-- 수령: 대상 + 미수령이면 피크상자 +50 지급, 플래그 확정 (1회성)
create or replace function public.claim_event_130_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eligible boolean;
  v_claimed  boolean;
  v_reward   constant integer := 50;
  v_new_box  integer;
begin
  select exists(select 1 from public.event_130_eligible where user_id = auth.uid()) into v_eligible;
  if not v_eligible then
    return json_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  -- subscriptions row 보장 (없으면 기본값으로 생성)
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  select event_130_claimed into v_claimed from public.subscriptions where user_id = auth.uid();
  if v_claimed then
    return json_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward, event_130_claimed = true
    where user_id = auth.uid()
    returning peakbox_count into v_new_box;

  return json_build_object('ok', true, 'reward', v_reward, 'peakbox_count', v_new_box);
end;
$$;

grant execute on function public.get_event_130_status() to authenticated;
grant execute on function public.claim_event_130_reward() to authenticated;
