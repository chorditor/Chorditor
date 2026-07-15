-- ───────────────────────────────────────────────────────────
-- 출석 시스템 — 접속 시 1일 1회 서버 검증 후 "랜덤상자"로 일반피크 직접 지급.
--   claim_daily_attendance(): attendance_claimed_date(KST 기준) 로 1일 1회 보장.
--     보상 = 2~10 랜덤(기댓값 3, 최빈값 2) 일반피크를 peak_balance 에 직접 가산(오버충전 허용).
--     인벤토리 픽상자(peakbox_count)와 무관 — 출석은 즉시 소비되는 1회성 랜덤박스.
--   peak_system.sql 이 먼저 적용되어 있어야 함(peak_balance 컬럼 의존).
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists attendance_claimed_date date;

-- 출석 체크(접속 시 1일 1회, KST 기준) → 랜덤 2~10 일반피크 지급
drop function if exists public.claim_daily_attendance();
create function public.claim_daily_attendance()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_last    date;
  v_balance integer;
  v_reward  integer;
  v_roll    numeric := random() * 10000;
begin
  select attendance_claimed_date, peak_balance
    into v_last, v_balance
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if found and v_last = v_today then
    return json_build_object('ok', false, 'balance', v_balance);
  end if;

  -- 누적 가중치(2~10, 합 10000, 기댓값 3, 최빈값 2)
  v_reward := case
    when v_roll < 5000 then 2
    when v_roll < 7500 then 3
    when v_roll < 8750 then 4
    when v_roll < 9375 then 5
    when v_roll < 9688 then 6
    when v_roll < 9844 then 7
    when v_roll < 9922 then 8
    when v_roll < 9961 then 9
    else 10
  end;

  if not found then
    insert into public.subscriptions (user_id, plan, status, attendance_claimed_date, peak_balance, att_total)
    values (auth.uid(), 'free', 'active', v_today, 30 + v_reward, 1)
    on conflict (user_id) do update set user_id = excluded.user_id
    returning peak_balance into v_balance;
  else
    v_balance := v_balance + v_reward;
    update public.subscriptions
      set attendance_claimed_date = v_today, peak_balance = v_balance,
          att_total = att_total + 1
      where user_id = auth.uid();
  end if;

  return json_build_object('ok', true, 'reward', v_reward, 'balance', v_balance);
end;
$$;

grant execute on function public.claim_daily_attendance() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 출석 달력 (30일 도장판, 순환). claim_daily_attendance(랜덤피크)와 병행.
--   att_day        : 현재 사이클 진행칸(0~30, 연속 도장 수)
--   att_last_date  : 마지막 도장 날짜(KST)
--   att_makeup_left: 이번 사이클 남은 보충출석(기본 3)
--   5·10·15·20·25·30 칸 도달 시 피크상자(peakbox_count) 2·3·5·5·5·10 즉시 지급.
--   갭(어제 미출석) 발생 → 보충출석 버튼으로 1회 소진해 이어감. 보충 소진 후 또 갭 → 사이클 리셋.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists att_day         integer not null default 0,
  add column if not exists att_last_date   date,
  add column if not exists att_makeup_left integer not null default 3;

-- 마일스톤 보상(피크상자 개수). 5일 배수만.
create or replace function public._att_milestone(p_day integer)
returns integer language sql immutable as $$
  select case p_day
    when 5  then 2 when 10 then 3 when 15 then 5
    when 20 then 5 when 25 then 5 when 30 then 10
    else 0 end;
$$;

-- 접속 시 도장 진행(자동). 정상 연속만 즉시 도장, 갭은 보충 대기.
create or replace function public.advance_attendance()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_day    integer;
  v_last   date;
  v_makeup integer;
  v_reward integer := 0;
begin
  select att_day, att_last_date, att_makeup_left
    into v_day, v_last, v_makeup
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then
    return json_build_object('advanced', false, 'day', 0, 'makeup_left', 3, 'reward', 0, 'needs_makeup', false);
  end if;

  if v_last = v_today then
    return json_build_object('advanced', false, 'day', v_day, 'makeup_left', v_makeup, 'reward', 0, 'needs_makeup', false, 'already', true);
  end if;

  -- 갭 판정: 어제 출석(gap=1)·첫 시작(last null)만 정상. gap>=2 는 보충 필요.
  if v_last is not null and (v_today - v_last) >= 2 then
    if v_makeup > 0 then
      return json_build_object('advanced', false, 'day', v_day, 'makeup_left', v_makeup, 'reward', 0, 'needs_makeup', true);
    end if;
    -- 보충 소진 → 사이클 리셋(오늘 = 새 사이클 1일)
    update public.subscriptions
      set att_day = 1, att_last_date = v_today, att_makeup_left = 3
      where user_id = auth.uid();
    return json_build_object('advanced', true, 'day', 1, 'makeup_left', 3, 'reward', 0, 'needs_makeup', false, 'reset', true);
  end if;

  -- 정상 도장 (30 도달 후엔 새 사이클로)
  if v_day >= 30 then
    v_day := 1; v_makeup := 3;
  else
    v_day := v_day + 1;
  end if;
  v_reward := public._att_milestone(v_day);
  update public.subscriptions
    set att_day = v_day, att_last_date = v_today, att_makeup_left = v_makeup,
        peakbox_count = peakbox_count + v_reward
    where user_id = auth.uid();
  return json_build_object('advanced', true, 'day', v_day, 'makeup_left', v_makeup, 'reward', v_reward, 'needs_makeup', false);
end;
$$;

-- 보충출석(수동, 사이클당 3회). 갭 상태에서만 유효 — 1회 소진해 오늘 도장 이어감.
create or replace function public.makeup_attendance()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_day    integer;
  v_last   date;
  v_makeup integer;
  v_reward integer := 0;
begin
  select att_day, att_last_date, att_makeup_left
    into v_day, v_last, v_makeup
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  if v_last = v_today then
    return json_build_object('ok', false, 'reason', 'already', 'day', v_day, 'makeup_left', v_makeup);
  end if;
  if v_last is null or (v_today - v_last) < 2 then
    return json_build_object('ok', false, 'reason', 'no_gap', 'day', v_day, 'makeup_left', v_makeup);
  end if;
  if v_makeup <= 0 then
    return json_build_object('ok', false, 'reason', 'no_left', 'day', v_day, 'makeup_left', 0);
  end if;

  v_makeup := v_makeup - 1;
  if v_day >= 30 then
    v_day := 1; v_makeup := 3;
  else
    v_day := v_day + 1;
  end if;
  v_reward := public._att_milestone(v_day);
  update public.subscriptions
    set att_day = v_day, att_last_date = v_today, att_makeup_left = v_makeup,
        peakbox_count = peakbox_count + v_reward
    where user_id = auth.uid();
  return json_build_object('ok', true, 'day', v_day, 'makeup_left', v_makeup, 'reward', v_reward);
end;
$$;

grant execute on function public.advance_attendance() to authenticated;
grant execute on function public.makeup_attendance() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 누적출석 (평생 총 출석일수, 리셋 없음 · 30일 순환달력과 별개)
--   att_total         : 평생 누적 출석일수(claim_daily_attendance 가 1일 1회 +1).
--   att_quest_claimed : 마지막으로 수령한 티어의 임계 일수(0=미수령).
--   티어: 3·7·14·30·100·200·365·500 → 피크상자 1·1·2·3·5·5·10·20.
--         500 이후 매 100일(600·700…) → 피크상자 5 무한 반복.
--   claim_attendance_quest(): 다음 티어 도달 시 1단계만 수령. 클라는 다음 티어 1개만 표시.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists att_total         integer not null default 0,
  add column if not exists att_quest_claimed integer not null default 0;

-- 마지막 수령 임계(p_claimed) 기준 다음 티어(도달 일수·상자 수).
create or replace function public._att_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 3   then 3
    when p_claimed < 7   then 7
    when p_claimed < 14  then 14
    when p_claimed < 30  then 30
    when p_claimed < 100  then 100
    when p_claimed < 200  then 200
    when p_claimed < 365  then 365
    when p_claimed < 500  then 500
    else p_claimed + 100
  end,
  case
    when p_claimed < 3   then 1
    when p_claimed < 7   then 1
    when p_claimed < 14  then 2
    when p_claimed < 30  then 3
    when p_claimed < 100  then 5
    when p_claimed < 200  then 5
    when p_claimed < 365  then 10
    when p_claimed < 500  then 20
    else 5
  end;
$$;

-- 누적출석 퀘스트 조회(수령 안 함). 진행·다음 티어 정보만 반환.
create or replace function public.get_attendance_quest()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total    integer;
  v_claimed  integer;
  v_next_day integer;
  v_next_rw  integer;
begin
  select att_total, att_quest_claimed
    into v_total, v_claimed
    from public.subscriptions
    where user_id = auth.uid();

  if not found then
    v_total := 0; v_claimed := 0;
  end if;

  select next_day, next_reward into v_next_day, v_next_rw
    from public._att_quest_next(v_claimed);

  return json_build_object('total', v_total, 'claimed', v_claimed,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;

grant execute on function public.get_attendance_quest() to authenticated;

-- 누적출석 퀘스트 1단계 수령. 다음 티어 도달했을 때만 피크상자 지급.
create or replace function public.claim_attendance_quest()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total     integer;
  v_claimed   integer;
  v_claim_day integer;  -- 이번에 수령하는 티어 임계
  v_claim_rw  integer;  -- 이번에 수령하는 상자 수
  v_next_day  integer;  -- 수령 후 다음 티어
  v_next_rw   integer;
begin
  select att_total, att_quest_claimed
    into v_total, v_claimed
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'no_row');
  end if;

  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._att_quest_next(v_claimed);

  -- 아직 다음 티어 미도달 → 진행 정보만 반환
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;

  -- 수령: 상자 지급 + claimed 갱신
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw,
        att_quest_claimed = v_claim_day
    where user_id = auth.uid();

  -- 수령 후 그다음 티어 계산(카드 갱신용)
  select next_day, next_reward into v_next_day, v_next_rw
    from public._att_quest_next(v_claim_day);

  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;

grant execute on function public.claim_attendance_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드이미지 저장 (누적 저장 수, 1회성, 반복 없음)
--   진행값 = 기존 stat_images(순수 이미지 저장 누적, syncStatsToDB 가 갱신).
--   img_quest_claimed : 마지막 수령 티어 임계(0=미수령).
--   티어 1·5·15·30·50·100·200·500·1000 → 상자 1·1·1·2·2·3·3·5·10.
--   1000 이후 없음(종료). next_day=0 이면 완료.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists img_quest_claimed integer not null default 0;

create or replace function public._img_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 1    then 1
    when p_claimed < 5    then 5
    when p_claimed < 15   then 15
    when p_claimed < 30   then 30
    when p_claimed < 50   then 50
    when p_claimed < 100  then 100
    when p_claimed < 200  then 200
    when p_claimed < 500  then 500
    when p_claimed < 1000 then 1000
    else 0
  end,
  case
    when p_claimed < 1    then 1
    when p_claimed < 5    then 1
    when p_claimed < 15   then 1
    when p_claimed < 30   then 2
    when p_claimed < 50   then 2
    when p_claimed < 100  then 3
    when p_claimed < 200  then 3
    when p_claimed < 500  then 5
    when p_claimed < 1000 then 10
    else 0
  end;
$$;

-- 조회(수령 안 함). next_day=0 → 완료.
create or replace function public.get_image_quest()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select stat_images, img_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._img_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_image_quest() to authenticated;

-- 1단계 수령. 다음 티어 도달 시에만 상자 지급.
create or replace function public.claim_image_quest()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer;
  v_next_day integer; v_next_rw integer;
begin
  select stat_images, img_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);

  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._img_quest_next(v_claimed);

  if v_claim_day = 0 then
    return json_build_object('ok', false, 'reason', 'done', 'total', v_total);
  end if;
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;

  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw,
        img_quest_claimed = v_claim_day
    where user_id = auth.uid();

  select next_day, next_reward into v_next_day, v_next_rw
    from public._img_quest_next(v_claim_day);

  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_image_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 노트 생성 / 노트 공유 (누적, 1회성, 반복 없음)
--   생성 진행값 = stat_notes(프로젝트 생성 시 +1), 수령추적 = note_quest_claimed.
--   공유 진행값 = stat_shares(기존), 수령추적 = share_quest_claimed.
--   티어(생성·공유 동일) 1·3·5·10·15·20·30·50 → 상자 1·2·2·2·2·3·3·5. 50 종료.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists stat_notes          integer not null default 0,
  add column if not exists note_quest_claimed  integer not null default 0,
  add column if not exists share_quest_claimed integer not null default 0;

-- 생성·공유 공용 티어 계산. 종료 시 day=0.
create or replace function public._note_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 1  then 1
    when p_claimed < 3  then 3
    when p_claimed < 5  then 5
    when p_claimed < 10 then 10
    when p_claimed < 15 then 15
    when p_claimed < 20 then 20
    when p_claimed < 30 then 30
    when p_claimed < 50 then 50
    else 0
  end,
  case
    when p_claimed < 1  then 1
    when p_claimed < 3  then 2
    when p_claimed < 5  then 2
    when p_claimed < 10 then 2
    when p_claimed < 15 then 2
    when p_claimed < 20 then 3
    when p_claimed < 30 then 3
    when p_claimed < 50 then 5
    else 0
  end;
$$;

-- 노트 생성 조회/수령
create or replace function public.get_note_create_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select stat_notes, note_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._note_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_note_create_quest() to authenticated;

create or replace function public.claim_note_create_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select stat_notes, note_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._note_quest_next(v_claimed);
  if v_claim_day = 0 then return json_build_object('ok', false, 'reason', 'done', 'total', v_total); end if;
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, note_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._note_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_note_create_quest() to authenticated;

-- 노트 공유 조회/수령
create or replace function public.get_note_share_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select stat_shares, share_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._note_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_note_share_quest() to authenticated;

create or replace function public.claim_note_share_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select stat_shares, share_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._note_quest_next(v_claimed);
  if v_claim_day = 0 then return json_build_object('ok', false, 'reason', 'done', 'total', v_total); end if;
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, share_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._note_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_note_share_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 누적 훈련시간 (training_time_min, 분)
--   진행값 = training_time_min(기존, 소수 가능). 수령추적 = time_quest_claimed(분).
--   티어(분) 10·30·60·180·300·600·1800·3000·6000 → 상자 1·1·2·2·2·3·3·5·10.
--   6000분(100시간) 이후 매 600분(10시간) → 상자 5 무한 반복.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists time_quest_claimed integer not null default 0;

create or replace function public._time_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 10   then 10
    when p_claimed < 30   then 30
    when p_claimed < 60   then 60
    when p_claimed < 180  then 180
    when p_claimed < 300  then 300
    when p_claimed < 600  then 600
    when p_claimed < 1800 then 1800
    when p_claimed < 3000 then 3000
    when p_claimed < 6000 then 6000
    else p_claimed + 600
  end,
  case
    when p_claimed < 10   then 1
    when p_claimed < 30   then 1
    when p_claimed < 60   then 2
    when p_claimed < 180  then 2
    when p_claimed < 300  then 2
    when p_claimed < 600  then 3
    when p_claimed < 1800 then 3
    when p_claimed < 3000 then 5
    when p_claimed < 6000 then 10
    else 5
  end;
$$;

create or replace function public.get_time_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total numeric; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select training_time_min, time_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._time_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', floor(coalesce(v_total, 0)), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_time_quest() to authenticated;

create or replace function public.claim_time_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total numeric; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select training_time_min, time_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._time_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', floor(v_total), 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, time_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._time_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', floor(v_total),
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_time_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드맞추기 누적완료횟수 (quiz_level_stats.sessions_completed 전체 합)
--   진행값 = sum(sessions_completed) 전 레벨·전 모드. 수령추적 = quiz_quest_claimed.
--   티어 1·5·15·30·50·100·200·300·400·500 → 상자 1·1·2·2·2·3·3·3·3·5.
--   500 이후 매 50회 → 상자 2 무한 반복.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists quiz_quest_claimed integer not null default 0;

create or replace function public._quiz_quest_next(
  p_claimed integer, out next_day integer, out next_reward integer)
language sql immutable as $$
  select case
    when p_claimed < 1   then 1
    when p_claimed < 5   then 5
    when p_claimed < 15  then 15
    when p_claimed < 30  then 30
    when p_claimed < 50  then 50
    when p_claimed < 100 then 100
    when p_claimed < 200 then 200
    when p_claimed < 300 then 300
    when p_claimed < 400 then 400
    when p_claimed < 500 then 500
    else p_claimed + 50
  end,
  case
    when p_claimed < 1   then 1
    when p_claimed < 5   then 1
    when p_claimed < 15  then 2
    when p_claimed < 30  then 2
    when p_claimed < 50  then 2
    when p_claimed < 100 then 3
    when p_claimed < 200 then 3
    when p_claimed < 300 then 3
    when p_claimed < 400 then 3
    when p_claimed < 500 then 5
    else 2
  end;
$$;

create or replace function public.get_quiz_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  v_total := (select coalesce(sum(sessions_completed), 0)::integer
              from public.quiz_level_stats where user_id = auth.uid());
  v_claimed := coalesce((select quiz_quest_claimed from public.subscriptions
                         where user_id = auth.uid()), 0);
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(v_claimed);
  return json_build_object('total', v_total, 'claimed', v_claimed,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_quiz_quest() to authenticated;

create or replace function public.claim_quiz_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select quiz_quest_claimed into v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_claimed := coalesce(v_claimed, 0);
  v_total := (select coalesce(sum(sessions_completed), 0)::integer
              from public.quiz_level_stats where user_id = auth.uid());

  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._quiz_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, quiz_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_quiz_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드맞추기 레벨 첫 완료 (숫자 레벨 1~11, 순차, 1회성)
--   각 레벨 세션 1회 완료(정답 무관) 시 수령. 순차 갱신(레벨1 수령 → 레벨2).
--   보상 레벨1·2→상자1, 3~5→상자2, 6+→상자3. quiz_lvl_quest_claimed=마지막 수령 레벨.
--   MAX 레벨 11(9~11 미출시분은 완료 전까지 대기). 11 수령 후 종료(next_level=0).
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists quiz_lvl_quest_claimed integer not null default 0;

-- 레벨별 보상(피크상자). 1·2→1, 3~5→2, 6+→3.
create or replace function public._quiz_lvl_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 2 then 1 when p_level <= 5 then 2 else 3 end;
$$;

-- 다음 대상 레벨의 완료 세션 수 합(2모드).
create or replace function public._quiz_lvl_done(p_level integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(sessions_completed), 0)::integer
    from public.quiz_level_stats
    where user_id = auth.uid() and level_id = p_level;
$$;

create or replace function public.get_quiz_level_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_claimed integer; v_next integer; v_done integer;
begin
  v_claimed := coalesce((select quiz_lvl_quest_claimed from public.subscriptions
                         where user_id = auth.uid()), 0);
  v_next := v_claimed + 1;
  if v_next > 11 then
    return json_build_object('claimed', v_claimed, 'next_level', 0, 'reward', 0, 'done', 0);
  end if;
  v_done := public._quiz_lvl_done(v_next);
  return json_build_object('claimed', v_claimed, 'next_level', v_next,
    'reward', public._quiz_lvl_reward(v_next), 'done', v_done);
end;
$$;
grant execute on function public.get_quiz_level_quest() to authenticated;

create or replace function public.claim_quiz_level_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_claimed integer; v_next integer; v_done integer; v_reward integer;
begin
  select quiz_lvl_quest_claimed into v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_claimed := coalesce(v_claimed, 0);
  v_next := v_claimed + 1;
  if v_next > 11 then return json_build_object('ok', false, 'reason', 'done'); end if;
  v_done := public._quiz_lvl_done(v_next);
  if v_done < 1 then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'next_level', v_next, 'reward', public._quiz_lvl_reward(v_next));
  end if;
  v_reward := public._quiz_lvl_reward(v_next);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward, quiz_lvl_quest_claimed = v_next
    where user_id = auth.uid();
  return json_build_object('ok', true, 'claimed_level', v_next, 'reward', v_reward,
    'next_level', case when v_next + 1 > 11 then 0 else v_next + 1 end);
end;
$$;
grant execute on function public.claim_quiz_level_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드맞추기 레벨별 퍼펙트 (반복, 레벨 독립)
--   각 레벨 100%정답 세션 3회 누적마다 보상(무한 반복). 챌린지 제외(숫자 1~11).
--   진행값 = quiz_level_stats.perfect_sessions(모드합). 수령추적 = subscriptions.perfect_claimed(jsonb {level: 수령횟수}).
--   보상 레벨1·2→상자3, 3~8→상자5, 9~11→상자8.
-- ───────────────────────────────────────────────────────────

alter table public.quiz_level_stats
  add column if not exists perfect_sessions integer not null default 0;
alter table public.subscriptions
  add column if not exists perfect_claimed jsonb not null default '{}'::jsonb;

create or replace function public._perfect_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 2 then 3 when p_level <= 8 then 5 else 8 end;
$$;

-- 전 레벨(1~11) 퍼펙트 진행/수령 상태 배열 반환.
create or replace function public.get_perfect_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_claimed jsonb;
begin
  v_claimed := coalesce((select perfect_claimed from public.subscriptions
                         where user_id = auth.uid()), '{}'::jsonb);
  return (
    select coalesce(json_agg(json_build_object(
      'level',   L,
      'perfect', t.total,
      'earned',  t.total / 3,
      'claimed', coalesce((v_claimed ->> L::text)::int, 0),
      'reward',  public._perfect_reward(L)
    ) order by L), '[]'::json)
    from generate_series(1, 11) L
    cross join lateral (
      select coalesce(sum(perfect_sessions), 0)::int total
        from public.quiz_level_stats
        where user_id = auth.uid() and level_id = L
    ) t
  );
end;
$$;
grant execute on function public.get_perfect_quest() to authenticated;

-- 특정 레벨 퍼펙트 보상 1회 수령(earned > claimed 일 때만).
create or replace function public.claim_perfect_quest(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_claimed jsonb; v_total integer; v_earned integer; v_claimed_n integer; v_reward integer;
begin
  if p_level < 1 or p_level > 11 then return json_build_object('ok', false, 'reason', 'bad_level'); end if;
  select perfect_claimed into v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_claimed := coalesce(v_claimed, '{}'::jsonb);
  v_total := (select coalesce(sum(perfect_sessions), 0)::int
              from public.quiz_level_stats where user_id = auth.uid() and level_id = p_level);
  v_earned := v_total / 3;
  v_claimed_n := coalesce((v_claimed ->> p_level::text)::int, 0);
  if v_earned <= v_claimed_n then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'level', p_level, 'earned', v_earned, 'claimed', v_claimed_n);
  end if;
  v_reward := public._perfect_reward(p_level);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward,
        perfect_claimed = jsonb_set(coalesce(perfect_claimed, '{}'::jsonb),
                                    array[p_level::text], to_jsonb(v_claimed_n + 1))
    where user_id = auth.uid();
  return json_build_object('ok', true, 'level', p_level, 'reward', v_reward,
    'claimed', v_claimed_n + 1, 'earned', v_earned);
end;
$$;
grant execute on function public.claim_perfect_quest(integer) to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드맞추기 챌린지 퍼펙트 (반복, 챌린지별 독립)
--   챌린지 c1(브론즈)·c2(실버)·c3(골드) 각 100%정답 3회 누적마다 보상.
--   quiz_level_stats(level_id integer)에 챌린지 미저장 → subscriptions jsonb로 관리.
--   challenge_perfect {c1:n} = 퍼펙트 누적(세션종료 시 +1), challenge_claimed {c1:n} = 수령 횟수.
--   보상 c1→상자10, c2→상자15, c3→상자20.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists challenge_perfect jsonb not null default '{}'::jsonb,
  add column if not exists challenge_claimed jsonb not null default '{}'::jsonb;

create or replace function public._challenge_reward(p_ch text)
returns integer language sql immutable as $$
  select case p_ch when 'c1' then 10 when 'c2' then 15 when 'c3' then 20 else 0 end;
$$;

-- 챌린지 퍼펙트 세션 1회 누적(세션 종료 시 클라가 호출).
create or replace function public.increment_challenge_perfect(p_ch text)
returns json language plpgsql security definer set search_path = public
as $$
declare v_cur integer;
begin
  if p_ch not in ('c1', 'c2', 'c3') then return json_build_object('ok', false); end if;
  select coalesce((challenge_perfect ->> p_ch)::int, 0) into v_cur
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  update public.subscriptions
    set challenge_perfect = jsonb_set(coalesce(challenge_perfect, '{}'::jsonb),
                                      array[p_ch], to_jsonb(coalesce(v_cur, 0) + 1))
    where user_id = auth.uid();
  return json_build_object('ok', true, 'perfect', coalesce(v_cur, 0) + 1);
end;
$$;
grant execute on function public.increment_challenge_perfect(text) to authenticated;

-- 3개 챌린지 진행/수령 상태 배열.
create or replace function public.get_challenge_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_perfect jsonb; v_claimed jsonb;
begin
  select coalesce(challenge_perfect, '{}'::jsonb), coalesce(challenge_claimed, '{}'::jsonb)
    into v_perfect, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_perfect := '{}'::jsonb; v_claimed := '{}'::jsonb; end if;
  return (
    select coalesce(json_agg(json_build_object(
      'ch',      ch,
      'perfect', coalesce((v_perfect ->> ch)::int, 0),
      'earned',  coalesce((v_perfect ->> ch)::int, 0) / 3,
      'claimed', coalesce((v_claimed ->> ch)::int, 0),
      'reward',  public._challenge_reward(ch)
    )), '[]'::json)
    from (values ('c1'), ('c2'), ('c3')) t(ch)
  );
end;
$$;
grant execute on function public.get_challenge_quest() to authenticated;

create or replace function public.claim_challenge_quest(p_ch text)
returns json language plpgsql security definer set search_path = public
as $$
declare v_perfect jsonb; v_claimed jsonb; v_p integer; v_earned integer; v_c integer; v_reward integer;
begin
  if p_ch not in ('c1', 'c2', 'c3') then return json_build_object('ok', false, 'reason', 'bad_ch'); end if;
  select coalesce(challenge_perfect, '{}'::jsonb), coalesce(challenge_claimed, '{}'::jsonb)
    into v_perfect, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_p := coalesce((v_perfect ->> p_ch)::int, 0);
  v_earned := v_p / 3;
  v_c := coalesce((v_claimed ->> p_ch)::int, 0);
  if v_earned <= v_c then
    return json_build_object('ok', false, 'reason', 'not_reached', 'ch', p_ch, 'earned', v_earned, 'claimed', v_c);
  end if;
  v_reward := public._challenge_reward(p_ch);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward,
        challenge_claimed = jsonb_set(coalesce(challenge_claimed, '{}'::jsonb),
                                      array[p_ch], to_jsonb(v_c + 1))
    where user_id = auth.uid();
  return json_build_object('ok', true, 'ch', p_ch, 'reward', v_reward, 'claimed', v_c + 1, 'earned', v_earned);
end;
$$;
grant execute on function public.claim_challenge_quest(text) to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 스케일 훈련 누적완료횟수 (코드맞추기 누적과 동일 티어)
--   진행값 = subscriptions.scale_completed(스케일 제출 완료 시 +1). 수령추적 = scale_quest_claimed.
--   티어 = _quiz_quest_next 재사용(1·5·15·30·50·100·200·300·400·500 → 1·1·2·2·2·3·3·3·3·5, 이후 매 50 → 2).
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists scale_completed    integer not null default 0,
  add column if not exists scale_quest_claimed integer not null default 0;

create or replace function public.get_scale_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select scale_completed, scale_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_scale_quest() to authenticated;

create or replace function public.claim_scale_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select scale_completed, scale_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._quiz_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, scale_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_scale_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 스케일 훈련 레벨 첫 완료 (레벨 1~20, 순차, 1회성)
--   각 레벨 1회 완료 시 clear. 순차 갱신. 보상 1~5→1, 6~10→2, 11~17→3, 18~20→5.
--   scale_cleared jsonb {level:true} = 완료 레벨. scale_lvl_quest_claimed = 마지막 수령 레벨. MAX 20.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists scale_cleared          jsonb   not null default '{}'::jsonb,
  add column if not exists scale_lvl_quest_claimed integer not null default 0;

create or replace function public._scale_lvl_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 5 then 1 when p_level <= 10 then 2 when p_level <= 17 then 3 else 5 end;
$$;

-- 스케일 레벨 완료 기록(제출 완료 시 클라가 호출).
create or replace function public.mark_scale_level_cleared(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
begin
  if p_level < 1 or p_level > 20 then return json_build_object('ok', false); end if;
  update public.subscriptions
    set scale_cleared = jsonb_set(coalesce(scale_cleared, '{}'::jsonb), array[p_level::text], 'true'::jsonb)
    where user_id = auth.uid();
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.mark_scale_level_cleared(integer) to authenticated;

create or replace function public.get_scale_level_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_claimed integer; v_cleared jsonb; v_next integer; v_done boolean;
begin
  select scale_lvl_quest_claimed, coalesce(scale_cleared, '{}'::jsonb)
    into v_claimed, v_cleared
    from public.subscriptions where user_id = auth.uid();
  if not found then v_claimed := 0; v_cleared := '{}'::jsonb; end if;
  v_claimed := coalesce(v_claimed, 0);
  v_next := v_claimed + 1;
  if v_next > 20 then
    return json_build_object('claimed', v_claimed, 'next_level', 0, 'reward', 0, 'done', false);
  end if;
  v_done := coalesce((v_cleared ->> v_next::text)::boolean, false);
  return json_build_object('claimed', v_claimed, 'next_level', v_next,
    'reward', public._scale_lvl_reward(v_next), 'done', v_done);
end;
$$;
grant execute on function public.get_scale_level_quest() to authenticated;

create or replace function public.claim_scale_level_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_claimed integer; v_cleared jsonb; v_next integer; v_done boolean; v_reward integer;
begin
  select scale_lvl_quest_claimed, coalesce(scale_cleared, '{}'::jsonb)
    into v_claimed, v_cleared
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_claimed := coalesce(v_claimed, 0);
  v_next := v_claimed + 1;
  if v_next > 20 then return json_build_object('ok', false, 'reason', 'done'); end if;
  v_done := coalesce((v_cleared ->> v_next::text)::boolean, false);
  if not v_done then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'next_level', v_next, 'reward', public._scale_lvl_reward(v_next));
  end if;
  v_reward := public._scale_lvl_reward(v_next);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward, scale_lvl_quest_claimed = v_next
    where user_id = auth.uid();
  return json_build_object('ok', true, 'claimed_level', v_next, 'reward', v_reward,
    'next_level', case when v_next + 1 > 20 then 0 else v_next + 1 end);
end;
$$;
grant execute on function public.claim_scale_level_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 스케일 훈련 레벨별 퍼펙트 (반복, 레벨 독립)
--   각 레벨 100%정답(오답0) 제출 3회 누적마다 보상(무한 반복). 레벨 1~20.
--   scale_perfect jsonb {level:n} = 퍼펙트 누적(제출 시 클라가 +1). scale_perfect_claimed jsonb {level:n} = 수령 횟수.
--   보상 1~5→상자3, 6~17→상자5, 18~20→상자8.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists scale_perfect         jsonb not null default '{}'::jsonb,
  add column if not exists scale_perfect_claimed  jsonb not null default '{}'::jsonb;

create or replace function public._scale_perfect_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 5 then 3 when p_level <= 17 then 5 else 8 end;
$$;

-- 스케일 퍼펙트 제출 1회 누적(제출 시 클라가 호출).
create or replace function public.increment_scale_perfect(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare v_cur integer;
begin
  if p_level < 1 or p_level > 20 then return json_build_object('ok', false); end if;
  select coalesce((scale_perfect ->> p_level::text)::int, 0) into v_cur
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  update public.subscriptions
    set scale_perfect = jsonb_set(coalesce(scale_perfect, '{}'::jsonb),
                                   array[p_level::text], to_jsonb(coalesce(v_cur, 0) + 1))
    where user_id = auth.uid();
  return json_build_object('ok', true, 'perfect', coalesce(v_cur, 0) + 1);
end;
$$;
grant execute on function public.increment_scale_perfect(integer) to authenticated;

-- 전 레벨(1~20) 퍼펙트 진행/수령 상태 배열 반환.
create or replace function public.get_scale_perfect_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_perfect jsonb; v_claimed jsonb;
begin
  select coalesce(scale_perfect, '{}'::jsonb), coalesce(scale_perfect_claimed, '{}'::jsonb)
    into v_perfect, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_perfect := '{}'::jsonb; v_claimed := '{}'::jsonb; end if;
  return (
    select coalesce(json_agg(json_build_object(
      'level',   L,
      'perfect', coalesce((v_perfect ->> L::text)::int, 0),
      'earned',  coalesce((v_perfect ->> L::text)::int, 0) / 3,
      'claimed', coalesce((v_claimed ->> L::text)::int, 0),
      'reward',  public._scale_perfect_reward(L)
    ) order by L), '[]'::json)
    from generate_series(1, 20) L
  );
end;
$$;
grant execute on function public.get_scale_perfect_quest() to authenticated;

-- 특정 레벨 스케일 퍼펙트 보상 1회 수령(earned > claimed 일 때만).
create or replace function public.claim_scale_perfect_quest(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_perfect jsonb; v_claimed jsonb; v_total integer; v_earned integer; v_c integer; v_reward integer;
begin
  if p_level < 1 or p_level > 20 then return json_build_object('ok', false, 'reason', 'bad_level'); end if;
  select coalesce(scale_perfect, '{}'::jsonb), coalesce(scale_perfect_claimed, '{}'::jsonb)
    into v_perfect, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce((v_perfect ->> p_level::text)::int, 0);
  v_earned := v_total / 3;
  v_c := coalesce((v_claimed ->> p_level::text)::int, 0);
  if v_earned <= v_c then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'level', p_level, 'earned', v_earned, 'claimed', v_c);
  end if;
  v_reward := public._scale_perfect_reward(p_level);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward,
        scale_perfect_claimed = jsonb_set(coalesce(scale_perfect_claimed, '{}'::jsonb),
                                          array[p_level::text], to_jsonb(v_c + 1))
    where user_id = auth.uid();
  return json_build_object('ok', true, 'level', p_level, 'reward', v_reward,
    'claimed', v_c + 1, 'earned', v_earned);
end;
$$;
grant execute on function public.claim_scale_perfect_quest(integer) to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 코드진행 누적 재생횟수 (코드맞추기 누적과 동일 티어)
--   진행값 = subscriptions.progression_completed(재생 시작 시 클라 sync +1). 수령추적 = progression_quest_claimed.
--   티어 = _quiz_quest_next 재사용.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists progression_completed    integer not null default 0,
  add column if not exists progression_quest_claimed integer not null default 0;

create or replace function public.get_progression_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select progression_completed, progression_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_progression_quest() to authenticated;

create or replace function public.claim_progression_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select progression_completed, progression_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._quiz_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, progression_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_progression_quest() to authenticated;


-- ───────────────────────────────────────────────────────────
-- 퀘스트: 주법훈련 누적 재생횟수 (코드맞추기 누적과 동일 티어)
--   진행값 = subscriptions.strum_completed(재생 시작 시 클라 sync +1). 수령추적 = strum_quest_claimed.
--   티어 = _quiz_quest_next 재사용.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists strum_completed    integer not null default 0,
  add column if not exists strum_quest_claimed integer not null default 0;

create or replace function public.get_strum_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select strum_completed, strum_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_strum_quest() to authenticated;

create or replace function public.claim_strum_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select strum_completed, strum_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._quiz_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, strum_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._quiz_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_strum_quest() to authenticated;
