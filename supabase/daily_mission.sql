-- ───────────────────────────────────────────────────────────
-- 오늘의 미션 진행도 서버 저장 (2026-10-31) — sync_daily_mission(p_done, p_play_sec)
--   재설치·기기 변경 후에도 "오늘 완료한 미션"과 "코드반주 누적 시간"이 이어지게 한다.
--   앱은 기기에 먼저 저장하고(빠른 반응), 이 RPC 한 개로 서버와 맞춘다:
--     · 보낸 값과 서버 값을 합친다 — 완료 목록은 합집합, 누적 초는 큰 값(기기 두 대가 서로를 덮어쓰지 않음)
--     · KST 날짜가 바뀌면 서버 값은 먼저 비운다(하루 단위 진행도)
--     · 코드반주 누적이 300초(5분) 이상이면 'play' 완료로 본다
--   출석 도장 자체는 기존 advance_attendance_v2가 하루 1회로 보장한다(이 함수는 건드리지 않음).
--   추가만 한다(기존 함수·컬럼 변경 없음) → 앱보다 먼저 반영해도 구앱에 영향 없음.
--   Supabase SQL Editor에서 1회 실행 — 짧은 파일이니 끝까지(grant 줄까지) 붙여넣었는지 확인.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists dm_date     date,
  add column if not exists dm_done     text[]  not null default '{}',
  add column if not exists dm_play_sec integer not null default 0;

create or replace function public.sync_daily_mission(p_done text[] default '{}', p_play_sec integer default 0)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_date  date;
  v_done  text[];
  v_play  integer;
begin
  select dm_date, coalesce(dm_done, '{}'), coalesce(dm_play_sec, 0)
    into v_date, v_done, v_play
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;

  if v_date is distinct from v_today then
    v_done := '{}';
    v_play := 0;
  end if;

  select coalesce(array_agg(distinct k order by k), '{}')
    into v_done
    from unnest(v_done || coalesce(p_done, '{}')) as k
    where k in ('quiz', 'scale', 'combo', 'play');

  v_play := greatest(v_play, least(greatest(coalesce(p_play_sec, 0), 0), 86400));
  if v_play >= 300 and not ('play' = any(v_done)) then
    v_done := array_append(v_done, 'play');
  end if;

  update public.subscriptions
    set dm_date = v_today, dm_done = v_done, dm_play_sec = v_play
    where user_id = auth.uid();

  return json_build_object('ok', true, 'date', v_today, 'done', to_json(v_done), 'play_sec', v_play);
end;
$$;

grant execute on function public.sync_daily_mission(text[], integer) to authenticated;
