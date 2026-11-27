-- ───────────────────────────────────────────────────────────
-- experiment_refund_boost.sql : 2×2 관찰 실험 — 퀴즈 환급(+4 / +3) × 부스트(7일 / 1일) (2026-11-27)
--
--   그룹(experiment_assignments.variant): A = +4·7일 / B = +4·1일 / C = +3·7일 / D = +3·1일 (각 25%)
--   배정: hash(user_id + 실험 이름)로 4등분(이전 실험과 그룹이 겹치지 않게 — 실험 이름을 섞음)
--   배정 시점 = 부스트가 처음 시작되는 순간(get_or_start_boost — 신규는 가입 후 첫 홈, 기존은 1.5.0 첫 홈). 두 조건이 같은 시점에 시작됨
--   실험 전에 이미 부스트가 시작된 계정(TestFlight 테스트 계정 등)은 배정하지 않음 → 기본값(+4·7일)
--   Pro도 배정함(분석 때 plan_at_assign으로 뺌). 신규·기존 구분은 쿼리에서 signup_at < 1.5.0 배포 시각으로
--   켜고 끄기: experiment_config.active. 처음엔 꺼진 상태로 만들고 1.5.0 배포 때 켬. 끄면 새로 배정하지 않고 모두 default_* 값을 받음
--     (이미 시작된 부스트 종료 시각은 그대로 — 계정에 저장된 값)
--
--   ⚠ 이 파일의 get_or_start_boost가 journey_boost.sql의 같은 함수를 대신함(반환값에 group·refund·boost_days·assigned·signup_at 추가).
--     지금 앱(1.4.x)은 추가 값을 무시하므로 1.5.0 배포 전에 실행해도 됨.
-- ───────────────────────────────────────────────────────────

-- 1) 실험 설정 — 실험당 한 줄
create table if not exists public.experiment_config (
  experiment          text        primary key,
  active              boolean     not null default false,
  default_refund      integer     not null default 4,   -- 실험이 꺼졌을 때(또는 미배정 유저) 모두가 받는 환급량
  default_boost_days  integer     not null default 7,   -- 실험이 꺼졌을 때(또는 미배정 유저) 새로 시작하는 부스트 일수
  updated_at          timestamptz not null default now()
);
alter table public.experiment_config enable row level security;   -- 정책 없음 = 앱에서 직접 읽기·쓰기 불가(함수가 읽음)

insert into public.experiment_config (experiment, active) values ('refund_boost_2026_12', false)
on conflict (experiment) do nothing;

-- 2) 배정 기록 — 기존 공용 테이블 experiment_assignments(supabase/experiment_assignments.sql — 유저 × 실험당 한 줄, 그룹 = variant)를 그대로 쓰고
--    이 실험에 필요한 칸만 더한다(다른 실험 행은 비어 있음). 본인 행 읽기 정책·앱 직접 쓰기 불가는 기존 설정 그대로
alter table public.experiment_assignments
  add column if not exists refund          integer,       -- 퀴즈 환급(정답 5개당)
  add column if not exists boost_days      integer,       -- 부스트 일수
  add column if not exists signup_at       timestamptz,   -- auth.users.created_at — 신규·기존 구분용
  add column if not exists plan_at_assign  text,          -- subscriptions.plan
  add column if not exists peak_at_assign  integer;       -- subscriptions.peak_balance(회복 반영 전 값)
create index if not exists experiment_assignments_exp_variant_idx on public.experiment_assignments (experiment, variant);

-- 3) 부스트 시작·조회 + 실험 배정
--   기록이 없으면: (실험이 켜져 있으면 배정) → 그룹 부스트 일수로 시작. 있으면 그대로.
--   돌려주는 refund = 실험이 켜져 있고 배정된 유저면 그 그룹 값, 아니면 default_refund
create or replace function public.get_or_start_boost()
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  c          record;
  a          record;
  v_start    timestamptz;
  v_end      timestamptz;
  v_new      boolean := false;
  v_assigned boolean := false;
  v_active   boolean;
  v_bucket   integer;
  v_days     integer;
  v_refund   integer;
begin
  if v_uid is null then return json_build_object('ok', false, 'reason', 'no_auth'); end if;

  select * into c from public.experiment_config where experiment = 'refund_boost_2026_12';
  v_active := coalesce(c.active, false);

  if not exists (select 1 from public.journey_boost where user_id = v_uid) then
    v_days := coalesce(c.default_boost_days, 7);
    if v_active then
      v_bucket := ('x' || substr(md5(v_uid::text || c.experiment), 1, 7))::bit(28)::integer % 4;   -- 0~3
      v_days := case when v_bucket in (0, 2) then 7 else 1 end;                                      -- A·C = 7일 / B·D = 1일
      insert into public.experiment_assignments (user_id, experiment, variant, refund, boost_days, signup_at, plan_at_assign, peak_at_assign)
      select v_uid, c.experiment, (array['A', 'B', 'C', 'D'])[v_bucket + 1],
             case when v_bucket in (0, 1) then 4 else 3 end,                                         -- A·B = +4 / C·D = +3
             v_days, u.created_at, s.plan, s.peak_balance
      from auth.users u left join public.subscriptions s on s.user_id = u.id
      where u.id = v_uid
      on conflict (user_id, experiment) do nothing;
      v_assigned := found;
    end if;
    insert into public.journey_boost (user_id, started_at, ends_at)
    values (v_uid, now(), now() + make_interval(days => v_days))
    on conflict (user_id) do nothing;
    v_new := found;
  end if;

  select started_at, ends_at into v_start, v_end from public.journey_boost where user_id = v_uid;
  select * into a from public.experiment_assignments where user_id = v_uid and experiment = 'refund_boost_2026_12';

  v_refund := case when v_active and a.user_id is not null then a.refund else coalesce(c.default_refund, 4) end;

  return json_build_object(
    'ok', true,
    'started', v_new,
    'start', (extract(epoch from v_start) * 1000)::bigint,
    'end',   (extract(epoch from v_end) * 1000)::bigint,
    'now',   (extract(epoch from now()) * 1000)::bigint,
    'refund', v_refund,
    'experiment', case when v_active and a.user_id is not null then 'refund_boost_2026_12' else null end,
    'group', case when v_active then a.variant else null end,
    'boost_days', a.boost_days,
    'assigned', v_assigned,                                                                          -- 이번 호출에서 처음 배정됨(앱이 experiment_assigned 이벤트를 한 번 남김)
    'signup_at', case when a.signup_at is null then null else (extract(epoch from a.signup_at) * 1000)::bigint end
  );
end;
$$;
grant execute on function public.get_or_start_boost() to authenticated;

-- 켜기(1.5.0 배포 때):  update public.experiment_config set active = true,  updated_at = now() where experiment = 'refund_boost_2026_12';
-- 끄기(이긴 조합으로):  update public.experiment_config set active = false, default_refund = 4, default_boost_days = 7, updated_at = now() where experiment = 'refund_boost_2026_12';
-- 그룹 인원 확인:       select variant, count(*), count(*) filter (where signup_at >= '<1.5.0 배포 시각>') as new_users from public.experiment_assignments where experiment = 'refund_boost_2026_12' group by variant order by variant;
