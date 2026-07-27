-- ───────────────────────────────────────────────────────────
-- 픽(Peak) 인앱재화 시스템 — 유저별 DB 관리, 30분마다 +1 자동충전(cap 30)
--   회복 계산은 크론 없이 lazy 방식: get_peak_state/consume_peak/open_peakbox
--   호출 시점에 peak_updated_at 기준 경과시간으로 서버가 즉시 계산·반영.
--   cap 도달 시엔 peak_updated_at을 그대로 고정(건드리면 push-peak-full의
--   candidate_full_at도 매번 밀려 완충 유지 중에도 재발송되는 버그 발생),
--   cap 밑으로 소모되면 그 시점부터 다시 30분 카운트 시작.
--   피크상자 보상(+5)은 오버충전 허용(cap 무시) — 정규 회복 로직과 무관.
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists peak_balance    integer     not null default 30,
  add column if not exists peak_updated_at timestamptz not null default now(),
  add column if not exists peakbox_count   integer     not null default 0;

-- 내부 헬퍼: 회복 계산 후 최신 balance/peakbox_count/updated_at 반환 (row 없으면 생성)
drop function if exists public._apply_peak_recharge(uuid);
create function public._apply_peak_recharge(p_user_id uuid)
returns table(balance integer, peakbox_count integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance  integer;
  v_updated  timestamptz;
  v_peakbox  integer;
  v_cap      constant integer := 30;
  v_interval constant integer := 30; -- 분
  v_elapsed_min integer;
  v_increments  integer;
begin
  select s.peak_balance, s.peak_updated_at, s.peakbox_count
    into v_balance, v_updated, v_peakbox
    from public.subscriptions s
    where s.user_id = p_user_id
    for update;

  if not found then
    insert into public.subscriptions as s (user_id, plan, status, peak_balance, peak_updated_at, peakbox_count)
    values (p_user_id, 'free', 'active', v_cap, now(), 0)
    on conflict (user_id) do update set user_id = excluded.user_id
    returning s.peak_balance, s.peak_updated_at, s.peakbox_count into v_balance, v_updated, v_peakbox;
  end if;

  if v_balance >= v_cap then
    null; -- 캡 도달 시 peak_updated_at 고정(건드리면 push-peak-full의 candidate_full_at도 밀려 재발송 버그 발생, 2026-07-26 수정)
  else
    v_elapsed_min := floor(extract(epoch from (now() - v_updated)) / 60);
    v_increments  := floor(v_elapsed_min::numeric / v_interval);
    if v_increments > 0 then
      v_balance := least(v_balance + v_increments, v_cap);
      v_updated := v_updated + make_interval(mins => v_increments * v_interval);
      update public.subscriptions
        set peak_balance = v_balance, peak_updated_at = v_updated
        where user_id = p_user_id;
    end if;
  end if;

  return query select v_balance, v_peakbox, v_updated;
end;
$$;

-- 잔량 조회 (회복 반영 후) + 완전충전까지 남은 초(seconds_to_full)
create or replace function public.get_peak_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_cap constant integer := 30;
  v_seconds_to_full integer;
begin
  select * into r from public._apply_peak_recharge(auth.uid());
  if r.balance >= v_cap then
    v_seconds_to_full := 0;
  else
    v_seconds_to_full := (v_cap - r.balance) * 30 * 60
      - floor(extract(epoch from (now() - r.updated_at)));
    if v_seconds_to_full < 0 then v_seconds_to_full := 0; end if;
  end if;
  return json_build_object(
    'balance', r.balance, 'peakbox_count', r.peakbox_count,
    'cap', v_cap, 'seconds_to_full', v_seconds_to_full
  );
end;
$$;

-- 소모 (회복 반영 후 잔량 확인, 부족하면 ok:false)
create or replace function public.consume_peak(p_cost integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_balance integer;
begin
  select * into r from public._apply_peak_recharge(auth.uid());
  if r.balance < p_cost then
    return json_build_object('ok', false, 'balance', r.balance, 'peakbox_count', r.peakbox_count, 'cap', 30);
  end if;
  v_new_balance := r.balance - p_cost;
  update public.subscriptions set peak_balance = v_new_balance where user_id = auth.uid();
  return json_build_object('ok', true, 'balance', v_new_balance, 'peakbox_count', r.peakbox_count, 'cap', 30);
end;
$$;

-- 피크상자 개봉 (보상 +5, 오버충전 허용)
create or replace function public.open_peakbox()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_balance integer;
  v_new_box     integer;
  v_reward      constant integer := 5;
begin
  select * into r from public._apply_peak_recharge(auth.uid());
  if r.peakbox_count <= 0 then
    return json_build_object('ok', false, 'balance', r.balance, 'peakbox_count', r.peakbox_count, 'cap', 30);
  end if;
  v_new_balance := r.balance + v_reward;
  v_new_box     := r.peakbox_count - 1;
  update public.subscriptions
    set peak_balance = v_new_balance, peakbox_count = v_new_box
    where user_id = auth.uid();
  return json_build_object('ok', true, 'balance', v_new_balance, 'peakbox_count', v_new_box, 'cap', 30, 'reward', v_reward);
end;
$$;

grant execute on function public.get_peak_state() to authenticated;
grant execute on function public.consume_peak(integer) to authenticated;
grant execute on function public.open_peakbox() to authenticated;
