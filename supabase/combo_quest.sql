-- ───────────────────────────────────────────────────────────
-- 리하모니 화성학 퀘스트 (2026-10-30 개편) — subscriptions.combo_quest
--   이전 퀘스트(장 첫 완료 combo_lvl_quest_claimed / 장별 퍼펙트 반복 combo_perfect_claimed)는 앱에서 삭제됨.
--   그 컬럼·RPC(attendance_system.sql)는 구앱이 아직 쓰므로 건드리지 않는다.
--
--   1회성(각 장 1~9):
--     lecture : 미니강의 수강 완료 → 상자 1·2장=1, 3~5장=2, 6~9장=3          (XP는 앱 쪽: 50/100/200)
--     key     : 종합(키) 레벨 클리어 → 상자 1·2장=3, 3~5장=5, 6~9장=8        (XP는 앱 쪽: 200/350/600)
--   반복(장 무관):
--     clear   : 레벨 클리어 5회마다 상자 5                                    (XP는 앱 쪽: 400)
--   소급 없음 — 이 SQL 적용 후 앱이 보고한 이벤트만 쌓인다.
--
--   combo_quest 모양:
--     { "lec": {"1":1,"2":2}, "key": {"1":1}, "clears": 7, "clears_claimed": 1 }
--     lec/key 값: 1 = 달성(수령 가능), 2 = 수령 완료. 값이 없으면 미달성.
--   클라이언트는 report(달성 보고)·get(조회)·claim(수령) RPC 3개로만 쓴다. 보상 수량은 서버가 정한다.
--   추가만 한다(기존 함수 변경 없음) → 앱보다 먼저 반영해도 구앱에 영향 없음. Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists combo_quest jsonb not null default '{}'::jsonb;

create or replace function public._combo_quest_reward(p_kind text, p_chapter integer)
returns integer language sql immutable as $$
  select case p_kind
    when 'lecture' then case when p_chapter <= 2 then 1 when p_chapter <= 5 then 2 else 3 end
    when 'key'     then case when p_chapter <= 2 then 3 when p_chapter <= 5 then 5 else 8 end
    when 'clear'   then 5
    else 0 end;
$$;

-- 달성 보고: lecture/key 는 장 번호 필요(처음 1회만 기록), clear 는 +1.
create or replace function public.report_combo_quest_event(p_kind text, p_chapter integer default null)
returns json language plpgsql security definer set search_path = public
as $$
declare v_q jsonb; v_field text; v_clears integer;
begin
  if p_kind not in ('lecture', 'key', 'clear') then return json_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if p_kind <> 'clear' and (p_chapter is null or p_chapter < 1 or p_chapter > 9) then
    return json_build_object('ok', false, 'reason', 'bad_chapter');
  end if;
  select coalesce(combo_quest, '{}'::jsonb) into v_q
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;

  if p_kind = 'clear' then
    v_clears := coalesce((v_q ->> 'clears')::int, 0) + 1;
    v_q := jsonb_set(v_q, '{clears}', to_jsonb(v_clears));
  else
    v_field := case p_kind when 'lecture' then 'lec' else 'key' end;
    v_q := jsonb_set(v_q, array[v_field], coalesce(v_q -> v_field, '{}'::jsonb));
    if v_q -> v_field -> p_chapter::text is null then
      v_q := jsonb_set(v_q, array[v_field, p_chapter::text], to_jsonb(1));
    end if;
  end if;

  update public.subscriptions set combo_quest = v_q where user_id = auth.uid();
  return json_build_object('ok', true);
end;
$$;
grant execute on function public.report_combo_quest_event(text, integer) to authenticated;

-- 조회
create or replace function public.get_combo_quests()
returns json language plpgsql security definer set search_path = public
as $$
declare v_q jsonb;
begin
  select coalesce(combo_quest, '{}'::jsonb) into v_q
    from public.subscriptions where user_id = auth.uid();
  if not found then v_q := '{}'::jsonb; end if;
  return json_build_object(
    'ok', true,
    'lec',  coalesce(v_q -> 'lec', '{}'::jsonb),
    'key',  coalesce(v_q -> 'key', '{}'::jsonb),
    'clears',         coalesce((v_q ->> 'clears')::int, 0),
    'clears_claimed', coalesce((v_q ->> 'clears_claimed')::int, 0));
end;
$$;
grant execute on function public.get_combo_quests() to authenticated;

-- 수령: lecture/key 는 그 장이 달성(1)일 때만, clear 는 5회당 1번씩
create or replace function public.claim_combo_quest(p_kind text, p_chapter integer default null)
returns json language plpgsql security definer set search_path = public
as $$
declare v_q jsonb; v_field text; v_reward integer; v_clears integer; v_claimed integer;
begin
  if p_kind not in ('lecture', 'key', 'clear') then return json_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if p_kind <> 'clear' and (p_chapter is null or p_chapter < 1 or p_chapter > 9) then
    return json_build_object('ok', false, 'reason', 'bad_chapter');
  end if;
  select coalesce(combo_quest, '{}'::jsonb) into v_q
    from public.subscriptions where user_id = auth.uid() for update;
  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;

  if p_kind = 'clear' then
    v_clears  := coalesce((v_q ->> 'clears')::int, 0);
    v_claimed := coalesce((v_q ->> 'clears_claimed')::int, 0);
    if v_clears / 5 <= v_claimed then return json_build_object('ok', false, 'reason', 'not_reached'); end if;
    v_reward := public._combo_quest_reward('clear', 0);
    v_q := jsonb_set(v_q, '{clears_claimed}', to_jsonb(v_claimed + 1));
  else
    v_field := case p_kind when 'lecture' then 'lec' else 'key' end;
    if coalesce((v_q -> v_field ->> p_chapter::text)::int, 0) <> 1 then
      return json_build_object('ok', false, 'reason', 'not_reached');   -- 미달성이거나 이미 수령
    end if;
    v_reward := public._combo_quest_reward(p_kind, p_chapter);
    v_q := jsonb_set(v_q, array[v_field, p_chapter::text], to_jsonb(2));
  end if;

  update public.subscriptions
    set peakbox_count = peakbox_count + v_reward, combo_quest = v_q
    where user_id = auth.uid();
  return json_build_object('ok', true, 'reward', v_reward);
end;
$$;
grant execute on function public.claim_combo_quest(text, integer) to authenticated;
