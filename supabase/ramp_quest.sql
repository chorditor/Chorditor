-- ───────────────────────────────────────────────────────────
-- 점진 가속 퀘스트 (코드반주 훈련) — 서버 작업 1단계
--
-- 내용
--   1) subscriptions 컬럼 추가: ramp_completed, ramp_quest_claimed
--   2) 티어 함수 _ramp_quest_next + get_ramp_quest / claim_ramp_quest
--   3) sync_training_stats 에 p_ramp_completed 추가 (7인자 → 8인자, 기본값 0)
--
-- ⚠ 실행 순서 (배포 순서와 같이 지킬 것)
--   ① 이 파일을 Supabase SQL Editor에서 먼저 실행 → 결과 확인
--   ② 그 다음에 클라이언트(shared.js 동기화 인자 추가) 배포
--   순서가 바뀌면 새 앱의 sync_training_stats 호출이 실패해서 모든 훈련 통계 동기화가 멈춘다.
--
-- ⚠ strum_completed → progression_completed 합산 이관은 이 파일에 없음 (새 앱 배포 시점에 1회만, 별도 파일).
--
-- 티어: 횟수는 코드맞추기(_quiz_quest_next)와 같고 보상(상자)만 다름.
--   1·5·15·30·50·100·200·300·400·500회 → 상자 2·2·3·3·3·4·4·4·4·6, 500회 이후 매 100회마다 3.
--   XP는 클라이언트(shared.js RAMP_QUEST_TIERS)에서 수령 시 지급 — 티어를 바꿀 땐 두 곳을 같이 수정.
-- ───────────────────────────────────────────────────────────

begin;

-- ── 1) 컬럼 ────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists ramp_completed     integer not null default 0,
  add column if not exists ramp_quest_claimed integer not null default 0;


-- ── 2) 퀘스트: 점진 가속 목표 BPM 도달 누적 횟수 ──────────────
create or replace function public._ramp_quest_next(
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
    else p_claimed + 100
  end,
  case
    when p_claimed < 1   then 2
    when p_claimed < 5   then 2
    when p_claimed < 15  then 3
    when p_claimed < 30  then 3
    when p_claimed < 50  then 3
    when p_claimed < 100 then 4
    when p_claimed < 200 then 4
    when p_claimed < 300 then 4
    when p_claimed < 400 then 4
    when p_claimed < 500 then 6
    else 3
  end;
$$;

create or replace function public.get_ramp_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_total integer; v_claimed integer; v_next_day integer; v_next_rw integer;
begin
  select ramp_completed, ramp_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_total := 0; v_claimed := 0; end if;
  select next_day, next_reward into v_next_day, v_next_rw
    from public._ramp_quest_next(coalesce(v_claimed, 0));
  return json_build_object('total', coalesce(v_total, 0), 'claimed', coalesce(v_claimed, 0),
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.get_ramp_quest() to authenticated;

create or replace function public.claim_ramp_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_total integer; v_claimed integer;
  v_claim_day integer; v_claim_rw integer; v_next_day integer; v_next_rw integer;
begin
  select ramp_completed, ramp_quest_claimed into v_total, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  v_total := coalesce(v_total, 0); v_claimed := coalesce(v_claimed, 0);
  select next_day, next_reward into v_claim_day, v_claim_rw
    from public._ramp_quest_next(v_claimed);
  if v_total < v_claim_day then
    return json_build_object('ok', false, 'reason', 'not_reached',
      'total', v_total, 'next_day', v_claim_day, 'next_reward', v_claim_rw);
  end if;
  update public.subscriptions
    set peakbox_count = peakbox_count + v_claim_rw, ramp_quest_claimed = v_claim_day
    where user_id = auth.uid();
  select next_day, next_reward into v_next_day, v_next_rw
    from public._ramp_quest_next(v_claim_day);
  return json_build_object('ok', true, 'total', v_total,
    'claimed_day', v_claim_day, 'reward', v_claim_rw,
    'next_day', v_next_day, 'next_reward', v_next_rw);
end;
$$;
grant execute on function public.claim_ramp_quest() to authenticated;


-- ── 3) sync_training_stats: p_ramp_completed 추가 ────────────
-- 같은 이름의 7인자 함수와 8인자 함수가 공존하면 옛 앱의 7인자 호출이 모호해져 오류가 나므로
-- 7인자 버전을 지우고, 새 인자에 기본값(0)을 둔 8인자 버전으로 대체한다 (옛 앱의 7인자 호출도 그대로 동작).
drop function if exists public.sync_training_stats(integer, date, numeric, integer, integer, integer, integer);

create or replace function public.sync_training_stats(
  p_streak                integer,
  p_streak_date           date,
  p_training_time_min     numeric,
  p_total_completed       integer,
  p_scale_completed       integer,
  p_progression_completed integer,
  p_strum_completed       integer,
  p_ramp_completed        integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions%rowtype;
begin
  if auth.uid() is null then return null; end if;

  update public.subscriptions set
    streak = case
      when p_streak_date is null then streak
      when streak_synced_date is null or p_streak_date > streak_synced_date then coalesce(p_streak, 0)
      when p_streak_date = streak_synced_date then greatest(coalesce(streak, 0), coalesce(p_streak, 0))
      else streak
    end,
    streak_synced_date = case
      when p_streak_date is null then streak_synced_date
      when streak_synced_date is null or p_streak_date >= streak_synced_date then p_streak_date
      else streak_synced_date
    end,
    training_time_min     = greatest(coalesce(training_time_min, 0),     coalesce(p_training_time_min, 0)),
    total_completed       = greatest(coalesce(total_completed, 0),       coalesce(p_total_completed, 0)),
    scale_completed       = greatest(coalesce(scale_completed, 0),       coalesce(p_scale_completed, 0)),
    progression_completed = greatest(coalesce(progression_completed, 0), coalesce(p_progression_completed, 0)),
    strum_completed       = greatest(coalesce(strum_completed, 0),       coalesce(p_strum_completed, 0)),
    ramp_completed        = greatest(coalesce(ramp_completed, 0),        coalesce(p_ramp_completed, 0))
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    insert into public.subscriptions (
      user_id, plan, status,
      streak, streak_synced_date, training_time_min, total_completed,
      scale_completed, progression_completed, strum_completed, ramp_completed
    ) values (
      auth.uid(), 'free', 'active',
      coalesce(p_streak, 0), p_streak_date, coalesce(p_training_time_min, 0), coalesce(p_total_completed, 0),
      coalesce(p_scale_completed, 0), coalesce(p_progression_completed, 0), coalesce(p_strum_completed, 0),
      coalesce(p_ramp_completed, 0)
    )
    on conflict (user_id) do nothing
    returning * into v_row;
    if not found then
      select * into v_row from public.subscriptions where user_id = auth.uid();
    end if;
  end if;

  return json_build_object(
    'streak',                v_row.streak,
    'streak_date',           v_row.streak_synced_date,
    'training_time_min',     v_row.training_time_min,
    'total_completed',       v_row.total_completed,
    'scale_completed',       v_row.scale_completed,
    'progression_completed', v_row.progression_completed,
    'strum_completed',       v_row.strum_completed,
    'ramp_completed',        v_row.ramp_completed
  );
end;
$$;
grant execute on function public.sync_training_stats(integer, date, numeric, integer, integer, integer, integer, integer) to authenticated;

commit;

-- PostgREST 스키마 캐시 재로딩 (함수 시그니처가 바뀌었으므로)
notify pgrst, 'reload schema';

-- ── 실행 후 확인 ─────────────────────────────────────────────
-- ① 컬럼:  select column_name from information_schema.columns
--           where table_name = 'subscriptions' and column_name in ('ramp_completed', 'ramp_quest_claimed');   -- 2행
-- ② 함수:  select proname, pg_get_function_identity_arguments(oid) from pg_proc
--           where proname in ('sync_training_stats', 'get_ramp_quest', 'claim_ramp_quest', '_ramp_quest_next');
--           -- sync_training_stats 는 8인자 1개만 있어야 함(7인자 버전이 남아 있으면 안 됨)
-- ③ 티어:  select * from public._ramp_quest_next(0);    -- 1, 2
--           select * from public._ramp_quest_next(500);  -- 600, 3
--           select * from public._ramp_quest_next(30);   -- 50, 3
