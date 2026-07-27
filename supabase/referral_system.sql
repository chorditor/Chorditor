-- ───────────────────────────────────────────────────────────
-- 초대코드(리퍼럴) 시스템
--   subscriptions.invite_code : 유저별 고유 6자리 코드 (insert 트리거로 자동 발급)
--   referrals                 : "A가 B를 초대했다" 관계 1행. invitee_id PK = 1인 1회 강제.
--   확정 카운트 = confirmed_at is not null (피초대자 레벨2=누적 50XP 도달 시 채워짐)
--   확정 처리는 cron 없이 기존 sync_user_xp() 안에서 즉시 수행.
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

-- ── 1. 코드 컬럼 + 생성기 + 자동 발급 트리거 ────────────────
alter table public.subscriptions
  add column if not exists invite_code text unique;

-- 0/O/1/I/L 제외 32자. 32^6 = 10.7억 조합. unique 충돌 시 최대 10회 재시도.
create or replace function public._gen_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i integer;
begin
  for attempt in 1..10 loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * 32)::int + 1, 1);
    end loop;
    if not exists (select 1 from public.subscriptions where invite_code = v_code) then
      return v_code;
    end if;
  end loop;
  raise exception 'invite_code 생성 실패(충돌 10회)';
end;
$$;

create or replace function public._set_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null then
    new.invite_code := public._gen_invite_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invite_code on public.subscriptions;
create trigger trg_set_invite_code
  before insert on public.subscriptions
  for each row execute function public._set_invite_code();

-- 기존 유저 백필
do $$
declare r record;
begin
  for r in select user_id from public.subscriptions where invite_code is null loop
    update public.subscriptions
      set invite_code = public._gen_invite_code()
      where user_id = r.user_id;
  end loop;
end
$$;

-- ── 2. 초대 관계 테이블 ─────────────────────────────────────
create table if not exists public.referrals (
  invitee_id   uuid primary key references auth.users(id) on delete cascade,
  inviter_id   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists referrals_inviter_idx on public.referrals (inviter_id);

-- 클라 직접 접근 전면 차단. 모든 읽기/쓰기는 아래 security definer 함수 경유.
alter table public.referrals enable row level security;

-- ── 3. 코드 검증 (읽기 전용) ────────────────────────────────
-- 온보딩 Step7 "완료" 버튼용. 아직 보상 지급 안 함(subscriptions row가
-- 없을 수 있는 시점이라 지급 불가). 실제 지급은 redeem_invite_code().
create or replace function public.check_invite_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_inviter uuid;
begin
  select user_id into v_inviter
    from public.subscriptions where invite_code = upper(trim(p_code));
  if not found then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_inviter = v_me then
    return json_build_object('ok', false, 'reason', 'self');
  end if;
  if v_me is not null and exists (select 1 from public.referrals where invitee_id = v_me) then
    return json_build_object('ok', false, 'reason', 'already');
  end if;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.check_invite_code(text) to authenticated, anon;

-- ── 4. 코드 사용 확정 + 피초대자 보상 지급 ──────────────────
-- 온보딩 최종 저장(subscriptions row 생성) 이후에 호출할 것.
create or replace function public.redeem_invite_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_inviter uuid;
  v_reward  constant integer := 10; -- 피초대자 보상 피크상자
begin
  if v_me is null then
    return json_build_object('ok', false, 'reason', 'no_auth');
  end if;
  if not exists (select 1 from public.subscriptions where user_id = v_me) then
    return json_build_object('ok', false, 'reason', 'no_row');
  end if;
  if exists (select 1 from public.referrals where invitee_id = v_me) then
    return json_build_object('ok', false, 'reason', 'already');
  end if;

  select user_id into v_inviter
    from public.subscriptions where invite_code = upper(trim(p_code));
  if not found then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_inviter = v_me then
    return json_build_object('ok', false, 'reason', 'self');
  end if;

  insert into public.referrals (invitee_id, inviter_id) values (v_me, v_inviter);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward
    where user_id = v_me;

  return json_build_object('ok', true, 'reward', v_reward);
end;
$$;
grant execute on function public.redeem_invite_code(text) to authenticated;

-- ── 5. 레벨2 도달 확정 (sync_user_xp 교체) ──────────────────
-- 기존 xp_system.sql의 sync_user_xp에 확정 처리만 추가한 버전.
-- XP가 오르는 모든 경로가 이 함수를 지나므로 별도 cron 불필요.
-- 레벨2 = 누적 50XP (_xpNeed(1) = 50*1). 임계 조정은 v_confirm_xp 상수만 변경.
create or replace function public.sync_user_xp(p_xp integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer;
  v_confirm_xp constant integer := 50; -- 레벨2 임계
begin
  update public.subscriptions
    set user_xp = greatest(coalesce(user_xp, 0), coalesce(p_xp, 0))
    where user_id = auth.uid()
    returning user_xp into v_xp;
  if not found then return coalesce(p_xp, 0); end if;

  if v_xp >= v_confirm_xp then
    update public.referrals
      set confirmed_at = now()
      where invitee_id = auth.uid() and confirmed_at is null;
  end if;

  return v_xp;
end;
$$;
grant execute on function public.sync_user_xp(integer) to authenticated;

-- ── 6. 퀘스트: 초대 확정 수 ─────────────────────────────────
-- 티어 [확정수, 상자] = 1:3, 3:5, 5:8, 10:15, 이후 매 +5회당 8
alter table public.subscriptions
  add column if not exists invite_quest_claimed integer not null default 0;

create or replace function public._invite_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 1  then 1
    when p_claimed < 3  then 3
    when p_claimed < 5  then 5
    when p_claimed < 10 then 10
    else p_claimed + 5
  end,
  case
    when p_claimed < 1  then 3
    when p_claimed < 3  then 5
    when p_claimed < 5  then 8
    when p_claimed < 10 then 15
    else 8
  end;
$$;

create or replace function public.get_invite_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  v_total := (select count(*)::integer from public.referrals
              where inviter_id = auth.uid() and confirmed_at is not null);
  select invite_quest_claimed into v_claimed
    from public.subscriptions where user_id = auth.uid();
  v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_next_day, v_next_rw
    from public._invite_quest_next(v_claimed);
  return json_build_object('total', v_total, 'claimed', v_claimed,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_invite_quest() to authenticated;

create or replace function public.claim_invite_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select invite_quest_claimed into v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_claimed := coalesce(v_claimed, 0);
  v_total := (select count(*)::integer from public.referrals
              where inviter_id = auth.uid() and confirmed_at is not null);

  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._invite_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, invite_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._invite_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_invite_quest() to authenticated;
