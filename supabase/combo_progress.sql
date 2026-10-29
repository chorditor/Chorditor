-- ───────────────────────────────────────────────────────────
-- 리하모니 화성학 진행도 (combo_level_progress / combo_skip_passes)
--   - 레벨별 "직접 완주한 횟수"와 "건너뛰기 테스트를 통과한 챕터"를 서버가 기준으로 저장한다.
--   - 두 데이터는 일부러 분리: 퀘스트·보상은 완주 횟수(combo_level_progress)만 보고,
--     건너뛰기 통과(combo_skip_passes)는 해금 전용이라 완주 횟수를 절대 올리지 않는다.
--   - 클리어 판정은 서버가 한다: 일반 레벨 3회, 키 레벨(챕터 필수 구간 마지막 종합 레벨) 5회.
--     키 레벨 = 챕터 2만 N-8, 나머지는 N-6 (앱 chord-combo.js의 COMBO_V2_REQ와 같아야 함).
--   - 클라이언트는 테이블을 직접 쓰지 못하고(RLS: 본인 행 읽기만) 아래 RPC 3개로만 쓴다.
--   - 추가만 한다(기존 테이블·함수 변경 없음) → 앱보다 먼저 반영해도 구앱에 영향 없음.
--   Supabase SQL Editor에서 1회 실행 (반영은 앱 배포 전에 한꺼번에).
-- ───────────────────────────────────────────────────────────

-- 1) 테이블
create table if not exists public.combo_level_progress (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  level            text        not null,                       -- '1-1' ~ '9-14' (챕터 2는 '2-16'까지)
  done             integer     not null default 0 check (done >= 0),
  first_cleared_at timestamptz,                                -- 처음 클리어(일반 3회·키 레벨 5회)에 도달한 시각. 한 번 정해지면 안 바뀜
  updated_at       timestamptz not null default now(),
  primary key (user_id, level)
);

create table if not exists public.combo_skip_passes (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  chapter   integer     not null check (chapter between 2 and 9),   -- 건너뛰기 테스트로 들어간 대상 챕터
  passed_at timestamptz not null default now(),
  primary key (user_id, chapter)
);

-- 2) RLS — 본인 행 읽기만. 쓰기 정책을 만들지 않아 클라이언트 직접 쓰기는 막히고, security definer RPC만 쓴다.
alter table public.combo_level_progress enable row level security;
alter table public.combo_skip_passes    enable row level security;

drop policy if exists "own combo progress readable" on public.combo_level_progress;
create policy "own combo progress readable"
  on public.combo_level_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "own combo skips readable" on public.combo_skip_passes;
create policy "own combo skips readable"
  on public.combo_skip_passes
  for select
  using (auth.uid() = user_id);

-- 3) 레벨 번호 규칙 — 잘못된 번호가 행으로 쌓이지 않게 서버가 검증
--    챕터 1~9, 레벨 수: 챕터 2 = 16개, 나머지 = 14개
create or replace function public._combo_level_valid(p_level text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_ch integer;
  v_m  integer;
begin
  if p_level is null or p_level !~ '^[1-9]-[0-9]{1,2}$' then return false; end if;
  v_ch := split_part(p_level, '-', 1)::integer;
  v_m  := split_part(p_level, '-', 2)::integer;
  return v_m >= 1 and v_m <= case when v_ch = 2 then 16 else 14 end;
end;
$$;

--    클리어에 필요한 완주 횟수: 키 레벨 5, 일반 레벨 3
create or replace function public._combo_clear_at(p_level text)
returns integer
language plpgsql
immutable
as $$
declare
  v_ch integer := split_part(p_level, '-', 1)::integer;
  v_m  integer := split_part(p_level, '-', 2)::integer;
begin
  return case when v_m = case when v_ch = 2 then 8 else 6 end then 5 else 3 end;
end;
$$;

-- 4) 진행도 조회 — {ok, levels:{"1-1":2,...}, skips:[3,5]}
create or replace function public.get_combo_progress()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_levels jsonb;
  v_skips  jsonb;
begin
  if v_uid is null then return json_build_object('ok', false); end if;

  select coalesce(jsonb_object_agg(level, done), '{}'::jsonb)
    into v_levels
    from public.combo_level_progress
   where user_id = v_uid;

  select coalesce(jsonb_agg(chapter order by chapter), '[]'::jsonb)
    into v_skips
    from public.combo_skip_passes
   where user_id = v_uid;

  return json_build_object('ok', true, 'levels', v_levels, 'skips', v_skips);
end;
$$;

-- 5) 레벨 완주 1회 기록 — {ok, done, cleared, first_clear}
--    done은 클리어 횟수(키 레벨 5, 일반 3)에서 멈춘다. first_clear = 이번 기록으로 처음 클리어에 도달했는가
--    (퀘스트·보상은 이 값 또는 first_cleared_at만 보면 되고, 같은 레벨로 두 번 받을 수 없다).
create or replace function public.record_combo_level(p_level text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_clear_at integer;
  v_before   integer;
  v_after    integer;
begin
  if v_uid is null or not public._combo_level_valid(p_level) then
    return json_build_object('ok', false);
  end if;
  v_clear_at := public._combo_clear_at(p_level);

  -- 같은 사용자·레벨의 동시 호출이 둘 다 "처음 클리어"로 판정되지 않게 직렬화
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_level, 0));

  select done into v_before
    from public.combo_level_progress
   where user_id = v_uid and level = p_level;
  v_before := coalesce(v_before, 0);
  v_after  := least(v_clear_at, v_before + 1);

  insert into public.combo_level_progress (user_id, level, done, first_cleared_at, updated_at)
  values (v_uid, p_level, v_after, case when v_after >= v_clear_at then now() end, now())
  on conflict (user_id, level) do update
    set done             = excluded.done,
        first_cleared_at = coalesce(public.combo_level_progress.first_cleared_at, excluded.first_cleared_at),
        updated_at       = now();

  return json_build_object(
    'ok',          true,
    'done',        v_after,
    'cleared',     v_after >= v_clear_at,
    'first_clear', v_before < v_clear_at and v_after >= v_clear_at
  );
end;
$$;

-- 6) 건너뛰기 테스트 통과 기록 — {ok, skips:[...]}
--    통과한 대상 챕터를 집합에 추가(멱등). 완주 횟수·퀘스트와 무관(해금 전용).
create or replace function public.record_combo_skip(p_chapter integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_skips jsonb;
begin
  if v_uid is null or p_chapter is null or p_chapter < 2 or p_chapter > 9 then
    return json_build_object('ok', false);
  end if;

  insert into public.combo_skip_passes (user_id, chapter)
  values (v_uid, p_chapter)
  on conflict (user_id, chapter) do nothing;

  select coalesce(jsonb_agg(chapter order by chapter), '[]'::jsonb)
    into v_skips
    from public.combo_skip_passes
   where user_id = v_uid;

  return json_build_object('ok', true, 'skips', v_skips);
end;
$$;

-- 7) 권한 — 로그인 사용자만 RPC 실행 (헬퍼 함수는 내부용이라 직접 호출 막음)
revoke all on function public.get_combo_progress()          from public, anon;
revoke all on function public.record_combo_level(text)      from public, anon;
revoke all on function public.record_combo_skip(integer)    from public, anon;
revoke all on function public._combo_level_valid(text)      from public, anon, authenticated;
revoke all on function public._combo_clear_at(text)         from public, anon, authenticated;

grant execute on function public.get_combo_progress()       to authenticated;
grant execute on function public.record_combo_level(text)   to authenticated;
grant execute on function public.record_combo_skip(integer) to authenticated;

-- 확인 (로그인한 계정으로):
--   select get_combo_progress();
--   select record_combo_level('1-1');   -- done 1 → 2 → 3 (3에서 first_clear=true, 이후 멈춤)
--   select record_combo_skip(3);        -- skips [3]
