-- ───────────────────────────────────────────────────────────
-- 보충출석 v3 (2026-10-31) — makeup_attendance_v3(p_by_ad)
--   규칙: 일일 제한 없이 그 달 아무 때나 3회(정규출석을 한 날도, 같은 날 여러 번도 가능).
--         3회를 다 쓰면 광고를 끝까지 보고 1칸씩 더 채움(p_by_ad = true, 남은 횟수는 계속 0).
--         월 25칸 상한·달이 바뀌면 칸 0·보충 3회로 복구는 v2와 같다.
--   v2(makeup_attendance_v2)와의 차이: 'already_regular'(정규출석 한 날 불가), 'already_makeup'(하루 1회) 제한을 뺐다.
--   구앱은 v2를 계속 부르므로 v2는 그대로 둔다 — 새 함수만 추가(앱보다 먼저 반영해도 구앱에 영향 없음).
--   광고 시청 자체는 서버가 검증할 수 없어(grant_peak_ad와 같은 방식) 클라이언트가 보고하는 값을 믿는다.
--   att_makeup_last_date 는 v2 호환을 위해 오늘 날짜로 계속 기록한다(v3는 읽지 않음).
--   Supabase SQL Editor에서 1회 실행 (반영은 앱 배포 전에 한꺼번에).
-- ───────────────────────────────────────────────────────────

create or replace function public.makeup_attendance_v3(p_by_ad boolean default false)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date    := (now() at time zone 'Asia/Seoul')::date;
  v_month  integer := extract(year from v_today)::integer * 100 + extract(month from v_today)::integer;
  v_day    integer;
  v_makeup integer;
  v_amonth integer;
  v_reward integer := 0;
begin
  select att_day, att_makeup_left, att_month
    into v_day, v_makeup, v_amonth
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then return json_build_object('ok', false, 'reason', 'no_row'); end if;

  -- 달이 바뀌었으면 v2와 똑같이 리셋(칸 0, 보충 3회)
  if v_amonth is distinct from v_month then
    v_day := 0; v_makeup := 3; v_amonth := v_month;
  end if;

  if v_day >= 25 then
    return json_build_object('ok', false, 'reason', 'full', 'day', 25, 'makeup_left', v_makeup);
  end if;

  if v_makeup > 0 then
    v_makeup := v_makeup - 1;                       -- 남은 횟수로 채움
  elsif not coalesce(p_by_ad, false) then
    return json_build_object('ok', false, 'reason', 'no_left', 'day', v_day, 'makeup_left', 0);
  end if;                                           -- 횟수 0 + 광고 시청이면 횟수는 그대로 0으로 두고 1칸 채움

  v_day := v_day + 1;
  v_reward := public._att_milestone(v_day);
  update public.subscriptions
    set att_day = v_day, att_makeup_left = v_makeup, att_month = v_amonth, att_makeup_last_date = v_today,
        peakbox_count = peakbox_count + v_reward
    where user_id = auth.uid();
  return json_build_object('ok', true, 'day', v_day, 'makeup_left', v_makeup, 'reward', v_reward, 'full', v_day = 25);
end;
$$;

grant execute on function public.makeup_attendance_v3(boolean) to authenticated;
