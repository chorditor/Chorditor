-- ───────────────────────────────────────────────────────────
-- 누적 통계 병합 동기화 (되감기/초기화 방지)
--
-- 문제: 클라가 localStorage 값을 그대로 PATCH/upsert 하던 구조라
--       로컬이 비어있는 상태(재설치·웹뷰 데이터 삭제·다른 기기 첫 로그인)에서
--       훈련 페이지에 진입하면 서버의 누적값이 0 또는 낮은 값으로 덮어써짐.
-- 해결: sync_user_xp 와 동일하게 서버측 GREATEST 원자 병합.
--       반환값 = 병합 후 서버값. 클라는 반환값으로 로컬을 갱신한다.
--
-- Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

-- ── 1) 훈련 통계 ────────────────────────────────────────────
-- 누적 카운터는 GREATEST.
-- streak(연속기록)만 예외: 끊기면 1로 리셋되는 값이라 GREATEST 불가.
--   → 마지막 카운트 날짜(p_streak_date)가 더 최신인 쪽을 채택,
--     같은 날짜면 GREATEST.
create or replace function public.sync_training_stats(
  p_streak                integer,
  p_streak_date           date,
  p_training_time_min     numeric,
  p_total_completed       integer,
  p_scale_completed       integer,
  p_progression_completed integer,
  p_strum_completed       integer
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
    strum_completed       = greatest(coalesce(strum_completed, 0),       coalesce(p_strum_completed, 0))
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    insert into public.subscriptions (
      user_id, plan, status,
      streak, streak_synced_date, training_time_min, total_completed,
      scale_completed, progression_completed, strum_completed
    ) values (
      auth.uid(), 'free', 'active',
      coalesce(p_streak, 0), p_streak_date, coalesce(p_training_time_min, 0), coalesce(p_total_completed, 0),
      coalesce(p_scale_completed, 0), coalesce(p_progression_completed, 0), coalesce(p_strum_completed, 0)
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
    'strum_completed',       v_row.strum_completed
  );
end;
$$;
grant execute on function public.sync_training_stats(integer, date, numeric, integer, integer, integer, integer) to authenticated;


-- ── 2) 행동 통계 (이미지 저장 / 공유 / 노트 생성) ─────────────
create or replace function public.sync_user_stats(
  p_images integer,
  p_shares integer,
  p_notes  integer
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
    stat_images = greatest(coalesce(stat_images, 0), coalesce(p_images, 0)),
    stat_shares = greatest(coalesce(stat_shares, 0), coalesce(p_shares, 0)),
    stat_notes  = greatest(coalesce(stat_notes, 0),  coalesce(p_notes, 0))
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    insert into public.subscriptions (user_id, plan, status, stat_images, stat_shares, stat_notes)
    values (auth.uid(), 'free', 'active',
            coalesce(p_images, 0), coalesce(p_shares, 0), coalesce(p_notes, 0))
    on conflict (user_id) do nothing
    returning * into v_row;
    if not found then
      select * into v_row from public.subscriptions where user_id = auth.uid();
    end if;
  end if;

  return json_build_object(
    'images', v_row.stat_images,
    'shares', v_row.stat_shares,
    'notes',  v_row.stat_notes
  );
end;
$$;
grant execute on function public.sync_user_stats(integer, integer, integer) to authenticated;


-- ── 3) 코드맞추기 레벨별 통계 ────────────────────────────────
-- best_speed_sec 만 LEAST(빠를수록 좋음), 나머지는 GREATEST.
create or replace function public.sync_quiz_level_stat(
  p_level_id           integer,
  p_mode               text,
  p_total_played       integer,
  p_total_correct      integer,
  p_sessions_completed integer,
  p_perfect_sessions   integer,
  p_best_speed_sec     numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_played   integer;
  v_correct  integer;
  v_sessions integer;
  v_perfect  integer;
  v_best     numeric;
begin
  if auth.uid() is null then return null; end if;

  insert into public.quiz_level_stats (
    user_id, level_id, mode,
    total_played, total_correct, sessions_completed, perfect_sessions, best_speed_sec, updated_at
  ) values (
    auth.uid(), p_level_id, p_mode,
    coalesce(p_total_played, 0), coalesce(p_total_correct, 0),
    coalesce(p_sessions_completed, 0), coalesce(p_perfect_sessions, 0),
    p_best_speed_sec, now()
  )
  on conflict (user_id, level_id, mode) do update set
    total_played       = greatest(coalesce(quiz_level_stats.total_played, 0),       coalesce(excluded.total_played, 0)),
    total_correct      = greatest(coalesce(quiz_level_stats.total_correct, 0),      coalesce(excluded.total_correct, 0)),
    sessions_completed = greatest(coalesce(quiz_level_stats.sessions_completed, 0), coalesce(excluded.sessions_completed, 0)),
    perfect_sessions   = greatest(coalesce(quiz_level_stats.perfect_sessions, 0),   coalesce(excluded.perfect_sessions, 0)),
    best_speed_sec     = least(coalesce(quiz_level_stats.best_speed_sec, excluded.best_speed_sec),
                               coalesce(excluded.best_speed_sec, quiz_level_stats.best_speed_sec)),
    updated_at         = now()
  returning total_played, total_correct, sessions_completed, perfect_sessions, best_speed_sec
    into v_played, v_correct, v_sessions, v_perfect, v_best;

  return json_build_object(
    'total_played',       v_played,
    'total_correct',      v_correct,
    'sessions_completed', v_sessions,
    'perfect_sessions',   v_perfect,
    'best_speed_sec',     v_best
  );
end;
$$;
grant execute on function public.sync_quiz_level_stat(integer, text, integer, integer, integer, integer, numeric) to authenticated;
