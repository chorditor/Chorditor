-- ───────────────────────────────────────────────────────────
-- push_due_users.sql : "지금 넛지를 받을 차례인 유저" 판정 (현지 시각 기준).
--   get_user_time_slot() 의 현지화 버전. push-dispatch 가 15분마다 호출.
--
--   1) 유저 시간대 = 가장 최근 갱신된 기기의 push_tokens.tz.
--      null·알 수 없는 값은 'Asia/Seoul' (구버전 앱은 tz 를 안 보냄 → 기존과 같은 동작).
--   2) p_now 를 15분 단위로 내림한 현지 시각이 16:00 또는 20:45 인 시간대만 후보.
--      해당 시간대가 없으면 analytics_events 를 건드리지 않고 빈 결과 → 대부분의 호출은 즉시 종료.
--   3) 후보 유저의 조(16시조/2045조)는 접속 기록을 "현지 시간"으로 집계해 판정
--      (14~17시 vs 19~23시, 16시대가 1.5배 이상이면 16시조 — 기준은 get_user_time_slot 과 동일).
--   4) 지금 시각이 자기 조와 맞는 유저만 반환.
--
--   get_user_time_slot() 은 라이브 구버전 push-dispatch 가 쓰므로 지우지 않고 둠.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_push_due_users(p_now timestamptz default now())
returns table (user_id uuid, time_slot text, tz text)
language sql
security definer
set search_path = public
as $$
  with user_tz as (
    select distinct on (pt.user_id)
      pt.user_id,
      coalesce(z.name, 'Asia/Seoul') as tz
    from push_tokens pt
    left join pg_timezone_names z on z.name = pt.tz
    where pt.user_id is not null
    order by pt.user_id, pt.updated_at desc
  ),
  due_tz as (
    select
      t.tz,
      to_char(date_bin('15 minutes', p_now at time zone t.tz, timestamp '2000-01-01'), 'HH24MI') as slot
    from (select distinct tz from user_tz) t
  ),
  cand as (
    select u.user_id, u.tz, d.slot
    from user_tz u
    join due_tz d on d.tz = u.tz
    where d.slot in ('1600', '2045')
  ),
  bucketed as (
    select
      c.user_id,
      count(*) filter (where extract(hour from ae.created_at at time zone c.tz) between 14 and 17) as cnt_16,
      count(*) filter (where extract(hour from ae.created_at at time zone c.tz) between 19 and 23) as cnt_2045
    from cand c
    join analytics_events ae on ae.user_id = c.user_id
    group by c.user_id
  )
  select c.user_id, c.slot, c.tz
  from cand c
  join bucketed b on b.user_id = c.user_id
  where c.slot = case when b.cnt_16 >= b.cnt_2045 * 1.5 then '1600' else '2045' end;
$$;

revoke all on function public.get_push_due_users(timestamptz) from public, anon, authenticated;
grant execute on function public.get_push_due_users(timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────
-- get_push_users_at_local : 지금(15분 단위 내림) 현지 시각이 p_hhmi 인 유저.
--   윈백(현지 20:30), 주간 결산(현지 월요일 12:00) 처럼 조 구분 없이 "현지 몇 시"만 보는 발송용.
--   p_isodow: 1=월 … 7=일, null 이면 요일 무관. 시간대 규칙은 위 함수와 동일.
-- ───────────────────────────────────────────────────────────
create or replace function public.get_push_users_at_local(
  p_hhmi   text,
  p_isodow int default null,
  p_now    timestamptz default now()
)
returns table (user_id uuid, tz text)
language sql
security definer
set search_path = public
as $$
  with user_tz as (
    select distinct on (pt.user_id)
      pt.user_id,
      coalesce(z.name, 'Asia/Seoul') as tz
    from push_tokens pt
    left join pg_timezone_names z on z.name = pt.tz
    where pt.user_id is not null
    order by pt.user_id, pt.updated_at desc
  ),
  due_tz as (
    select t.tz
    from (select distinct tz from user_tz) t
    where to_char(date_bin('15 minutes', p_now at time zone t.tz, timestamp '2000-01-01'), 'HH24MI') = p_hhmi
      and (p_isodow is null or extract(isodow from p_now at time zone t.tz) = p_isodow)
  )
  select u.user_id, u.tz
  from user_tz u
  join due_tz d on d.tz = u.tz;
$$;

revoke all on function public.get_push_users_at_local(text, int, timestamptz) from public, anon, authenticated;
grant execute on function public.get_push_users_at_local(text, int, timestamptz) to service_role;

-- 확인(한국 시간 16:00 / 20:45 시점을 넣어 기존 조 분류와 인원이 같은지 비교):
--   select time_slot, count(*) from get_push_due_users('2026-10-08 16:00+09') group by 1;
--   select time_slot, count(*) from get_push_due_users('2026-10-08 20:45+09') group by 1;
--   select time_slot, count(*) from get_user_time_slot() where user_id in (select user_id from push_tokens) group by 1;
--   select count(*) from get_push_due_users('2026-10-08 13:00+09');   -- 0 이어야 함
--   select count(*) from get_push_users_at_local('2030', null, '2026-10-08 20:30+09');  -- 토큰 있는 유저 전원
--   select count(*) from get_push_users_at_local('1200', 1,    '2026-10-08 12:00+09');  -- 0 (목요일)
--   select count(*) from get_push_users_at_local('1200', 1,    '2026-10-05 12:00+09');  -- 토큰 있는 유저 전원(월요일)

-- ───────────────────────────────────────────────────────────
-- Edge Function 호출용 래퍼 — 결과를 한 값(배열/객체)으로 돌려줌.
--   PostgREST 는 행 단위 응답을 최대 행수(기본 1000)에서 자르므로, 유저 수천 명짜리 집합을
--   행으로 받으면 뒤쪽이 조용히 잘림. 배열 한 값으로 받으면 잘리지 않음.
-- ───────────────────────────────────────────────────────────
create or replace function public.get_push_due_user_ids(p_now timestamptz default now())
returns uuid[]
language sql security definer set search_path = public
as $$
  select coalesce(array_agg(user_id), '{}') from public.get_push_due_users(p_now);
$$;

create or replace function public.get_push_user_ids_at_local(
  p_hhmi text, p_isodow int default null, p_now timestamptz default now()
)
returns uuid[]
language sql security definer set search_path = public
as $$
  select coalesce(array_agg(user_id), '{}') from public.get_push_users_at_local(p_hhmi, p_isodow, p_now);
$$;

-- 앱 언어가 영어인 기기 토큰
create or replace function public.get_push_en_tokens()
returns text[]
language sql security definer set search_path = public
as $$
  select coalesce(array_agg(token), '{}') from public.push_tokens where lang = 'en';
$$;

-- 서울이 아닌 시간대의 기기: { token: tz }. 여기 없는 토큰은 Asia/Seoul 로 취급.
create or replace function public.get_push_token_tz()
returns jsonb
language sql security definer set search_path = public
as $$
  select coalesce(jsonb_object_agg(pt.token, pt.tz), '{}'::jsonb)
  from public.push_tokens pt
  join pg_timezone_names z on z.name = pt.tz
  where pt.tz <> 'Asia/Seoul';
$$;

revoke all on function public.get_push_due_user_ids(timestamptz)                from public, anon, authenticated;
revoke all on function public.get_push_user_ids_at_local(text, int, timestamptz) from public, anon, authenticated;
revoke all on function public.get_push_en_tokens()                               from public, anon, authenticated;
revoke all on function public.get_push_token_tz()                                from public, anon, authenticated;
grant execute on function public.get_push_due_user_ids(timestamptz)                to service_role;
grant execute on function public.get_push_user_ids_at_local(text, int, timestamptz) to service_role;
grant execute on function public.get_push_en_tokens()                               to service_role;
grant execute on function public.get_push_token_tz()                                to service_role;
