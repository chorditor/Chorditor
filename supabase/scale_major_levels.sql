-- ═══════════════════════════════════════════════════════════════
-- 스케일 훈련 챕터1 신규 레벨 2개 (메이저 펜타토닉 / 메이저 블루스) 서버 반영
--   내부 레벨 번호(ID): 메이저 펜타토닉 = 25, 메이저 블루스 = 26  (화면 표시 번호는 2·3)
--   기존 레벨 1~20의 ID·기록·순차 퀘스트(scale_lvl_quest_claimed)는 건드리지 않음.
--   적용 대상 기능
--     1) 레벨 완료 기록(mark_scale_level_cleared)  — 25·26 허용
--     2) 레벨 첫 완료 보너스 퀘스트 — 순차 체인(1~20) 밖의 독립 1회성 퀘스트 2개(get/claim_scale_bonus_quest)
--     3) 레벨별 퍼펙트 퀘스트 — 25·26 포함(보상은 기본 레벨 1~5와 같은 구간), 목록은 화면 표시 순서로 정렬
--   ※ 21~24(챕터4 후반)는 기존대로 퀘스트/퍼펙트 대상이 아님.
--   ※ 구버전 앱: 25·26이 목록에 끼어도 이름이 '레벨 25' 폴백으로 표시될 뿐 동작은 정상.
--   적용: Supabase SQL Editor에서 이 파일 전체 실행(재실행해도 안전).
-- ═══════════════════════════════════════════════════════════════

-- ── 공용 헬퍼 ───────────────────────────────────────────────
-- 퀘스트 대상 레벨인지 (1~20, 25, 26)
create or replace function public._scale_level_valid(p_level integer)
returns boolean language sql immutable as $$
  select (p_level between 1 and 20) or p_level in (25, 26);
$$;

-- 화면 표시 순서 (메이저=1, 25→2, 26→3, 나머지 +2) — 목록 정렬용
create or replace function public._scale_display_order(p_level integer)
returns integer language sql immutable as $$
  select case when p_level = 25 then 2 when p_level = 26 then 3
              when p_level >= 2 then p_level + 2 else p_level end;
$$;

-- ── 보상 구간: 25·26은 기본 레벨(1~5) 구간 ─────────────────────
create or replace function public._scale_lvl_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 5 or p_level in (25, 26) then 1
              when p_level <= 10 then 2 when p_level <= 17 then 3 else 5 end;
$$;

create or replace function public._scale_perfect_reward(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 5 or p_level in (25, 26) then 3
              when p_level <= 17 then 5 else 8 end;
$$;

-- ── 1) 레벨 완료 기록 ────────────────────────────────────────
create or replace function public.mark_scale_level_cleared(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
begin
  if not public._scale_level_valid(p_level) then return json_build_object('ok', false); end if;
  update public.subscriptions
    set scale_cleared = jsonb_set(coalesce(scale_cleared, '{}'::jsonb), array[p_level::text], 'true'::jsonb)
    where user_id = auth.uid();
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.mark_scale_level_cleared(integer) to authenticated;

-- ── 2) 첫 완료 보너스 퀘스트 (25·26, 순차 체인과 독립) ─────────────
alter table public.subscriptions
  add column if not exists scale_bonus_claimed jsonb not null default '{}'::jsonb;

-- 두 레벨의 완료/수령 상태 배열 (화면 표시 순서)
create or replace function public.get_scale_bonus_quest()
returns json language plpgsql security definer set search_path = public
as $$
declare v_cleared jsonb; v_claimed jsonb;
begin
  select coalesce(scale_cleared, '{}'::jsonb), coalesce(scale_bonus_claimed, '{}'::jsonb)
    into v_cleared, v_claimed
    from public.subscriptions where user_id = auth.uid();
  if not found then v_cleared := '{}'::jsonb; v_claimed := '{}'::jsonb; end if;
  return (
    select coalesce(json_agg(json_build_object(
      'level',   L,
      'done',    coalesce((v_cleared ->> L::text)::boolean, false),
      'claimed', coalesce((v_claimed ->> L::text)::boolean, false),
      'reward',  public._scale_lvl_reward(L)
    ) order by public._scale_display_order(L)), '[]'::json)
    from unnest(array[25, 26]) L
  );
end;
$$;
grant execute on function public.get_scale_bonus_quest() to authenticated;

create or replace function public.claim_scale_bonus_quest(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare v_cleared jsonb; v_claimed jsonb; v_reward integer;
begin
  if p_level not in (25, 26) then return json_build_object('ok', false, 'reason', 'bad_level'); end if;
  select coalesce(scale_cleared, '{}'::jsonb), coalesce(scale_bonus_claimed, '{}'::jsonb)
    into v_cleared, v_claimed
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;
  if coalesce((v_claimed ->> p_level::text)::boolean, false) then
    return json_build_object('ok', false, 'reason', 'already');
  end if;
  if not coalesce((v_cleared ->> p_level::text)::boolean, false) then
    return json_build_object('ok', false, 'reason', 'not_reached');
  end if;
  v_reward := public._scale_lvl_reward(p_level);
  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward,
        scale_bonus_claimed = jsonb_set(coalesce(scale_bonus_claimed, '{}'::jsonb),
                                        array[p_level::text], 'true'::jsonb)
    where user_id = auth.uid();
  return json_build_object('ok', true, 'level', p_level, 'reward', v_reward);
end;
$$;
grant execute on function public.claim_scale_bonus_quest(integer) to authenticated;

-- ── 3) 레벨별 퍼펙트 퀘스트 (25·26 포함) ─────────────────────────
create or replace function public.increment_scale_perfect(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare v_cur integer;
begin
  if not public._scale_level_valid(p_level) then return json_build_object('ok', false); end if;
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

-- 전 레벨(1~20 + 25, 26) 퍼펙트 진행/수령 상태 배열 — 화면 표시 순서
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
    ) order by public._scale_display_order(L)), '[]'::json)
    from (select g as L from generate_series(1, 20) g union all select 25 union all select 26) t
  );
end;
$$;
grant execute on function public.get_scale_perfect_quest() to authenticated;

create or replace function public.claim_scale_perfect_quest(p_level integer)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_perfect jsonb; v_claimed jsonb; v_total integer; v_earned integer; v_c integer; v_reward integer;
begin
  if not public._scale_level_valid(p_level) then return json_build_object('ok', false, 'reason', 'bad_level'); end if;
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
