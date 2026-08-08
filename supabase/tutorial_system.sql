-- ───────────────────────────────────────────────────────────
-- 튜토리얼(퀘스트 체인) 진행 상태
--   tutorial_step         : 완료한 마지막 스텝 번호 (0 = 아무것도 안 함)
--   tutorial_skipped      : 건너뛰기 누른 적 있음 (자동 시작 중단 + 물음표 아이콘으로 재진입)
--   tutorial_completed_at : 전체 완료 시각 (최종 보상 지급 기준)
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists tutorial_step         integer not null default 0,
  add column if not exists tutorial_skipped      boolean not null default false,
  add column if not exists tutorial_completed_at timestamptz;

-- 조회: 클라 진입 시 자동 시작 여부 판정용
create or replace function public.get_tutorial_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step      integer;
  v_skipped   boolean;
  v_completed timestamptz;
begin
  select tutorial_step, tutorial_skipped, tutorial_completed_at
    into v_step, v_skipped, v_completed
    from public.subscriptions where user_id = auth.uid();

  return json_build_object(
    'step',      coalesce(v_step, 0),
    'skipped',   coalesce(v_skipped, false),
    'completed', v_completed
  );
end;
$$;

-- 스텝 진행 기록. 되돌아가지 않도록 GREATEST 병합 (로컬 값이 DB보다 낮아도 덮어쓰지 않음).
create or replace function public.set_tutorial_step(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step integer;
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set tutorial_step = greatest(coalesce(tutorial_step, 0), coalesce(p_step, 0))
    where user_id = auth.uid()
    returning tutorial_step into v_step;

  return json_build_object('ok', true, 'step', v_step);
end;
$$;

-- 건너뛰기: 자동 시작만 중단. 진행도(step)는 그대로 두어 나중에 이어서 할 수 있게 함.
create or replace function public.skip_tutorial()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set tutorial_skipped = true
    where user_id = auth.uid();

  return json_build_object('ok', true);
end;
$$;

-- 전체 완료: 최종 보상 지급 기준 시각 기록 (이미 완료면 시각 유지) + 최초 완료 시 7일 Pro 체험 지급.
--   체험 지급은 새 로직을 짜지 않고 promo_code_system.sql의 redeem_promo_code를 그대로 태운다
--   (plan 강등/복원, 결제 Pro와의 충돌 시 적립 처리가 이미 거기서 검증돼 있다).
--   코드는 유저에게 절대 노출되지 않는 내부 전용 값이라 무의미한 무작위 문자열로 둔다 —
--   프로모션 입력창에 우연히 맞혀 부정 수령하는 걸 막는 목적. promo_codes에 한 번만 seed한다.
--   ⚠ p_step은 참고값일 뿐 진행도를 올리지 않는다. 올리면 이 함수 한 번으로
--   "진행도 위조 + 7일 Pro 수령"이 동시에 되는 우회로가 생긴다(누구나 부를 수 있는 RPC다).
--   진행도는 오직 complete_tutorial_step만 올리며, 그쪽은 한 칸씩만 받는다.
create or replace function public.complete_tutorial(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed timestamptz;
  v_step      integer;
  v_was_new   boolean;
  v_promo     json;
begin
  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  select coalesce(tutorial_step, 0), tutorial_completed_at is null
    into v_step, v_was_new
    from public.subscriptions where user_id = auth.uid();

  -- 마지막 스텝까지 실제로 통과한 유저만 완주로 인정한다.
  -- complete_tutorial_step이 순차(v_cur+1)만 받으므로 여기까지 오려면 1~5를 모두 거쳐야 한다.
  -- 챕터가 늘면 complete_tutorial_step의 상한과 함께 이 값도 올린다.
  if v_step < 5 then
    return json_build_object('ok', false, 'reason', 'not_finished', 'step', v_step);
  end if;

  update public.subscriptions
    set tutorial_completed_at = coalesce(tutorial_completed_at, now())
    where user_id = auth.uid()
    returning tutorial_completed_at into v_completed;

  -- redeem_promo_code 안에서 promo_redemptions(code, user_id) PK로도 재지급을 막으므로
  -- v_was_new 오판(동시 요청 등)이 있어도 이중 지급은 없다 — v_was_new는 불필요한 호출만 줄인다.
  if coalesce(v_was_new, false) then
    v_promo := public.redeem_promo_code('__TUTORIAL_COMPLETE_5f8a2c__');
  end if;

  return json_build_object('ok', true, 'completed', v_completed, 'promo', v_promo);
end;
$$;

-- 스텝별 완료 보상(피크상자). 값은 운영하며 조정 — 여기 한 곳만 고치면 된다.
--   상자 1개 = 피크 +5(오버충전 허용). 일반 유저 합 18상자(피크 90) + 7일 Pro 체험.
--   뒤로 갈수록 커진다 — 완주 유인. 마지막 스텝은 7일 Pro 체험과 동시에 지급된다.
--
--   p_paid_pro: 이미 결제 Pro인 유저. 이들에게 7일 체험은 눈에 보이는 혜택이 아니라
--   (적립만 되고 지금 달라지는 게 없다) 오히려 "지금 구독을 끊어도 되겠네"로 읽힐 수 있다.
--   그래서 마지막 스텝 보상을 상자로 크게 돌려준다 — 합 23상자(피크 115).
--
--   ⚠ 챕터(key)가 아니라 반드시 "자리 번호(p_step)" 기준으로 준다.
--   A/B 순서 실험에서 두 변형의 보상 스케줄이 같아야 순서 효과만 분리해서 볼 수 있다.
--   챕터 기준으로 주면 예컨대 훈련소가 A는 5번째·B는 3번째라 누적 보상 곡선이 갈려
--   "순서 때문인지 보상 타이밍 때문인지"를 구분할 수 없게 된다.
--   (플랜별 차등은 변형과 직교하므로 실험을 오염시키지 않는다.)
drop function if exists public._tutorial_step_reward(integer);
create or replace function public._tutorial_step_reward(p_step integer, p_paid_pro boolean)
returns integer
language sql
immutable
as $$
  select case p_step
    when 1 then 2
    when 2 then 3
    when 3 then 3
    when 4 then 5
    when 5 then case when p_paid_pro then 10 else 5 end
    else 0
  end;
$$;

-- 스텝 완료 처리 + 보상 지급. 이미 그 스텝을 넘긴 유저는 재지급되지 않는다.
create or replace function public.complete_tutorial_step(p_step integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur      integer;
  v_reward   integer;
  v_box      integer;
  v_paid_pro boolean;
begin
  -- 자리 번호는 챕터 수(현재 5) 안에서만 유효하다. 챕터가 늘면 이 상한도 같이 올린다.
  if p_step is null or p_step < 1 or p_step > 5 then
    return json_build_object('ok', false, 'reason', 'invalid_step', 'reward', 0);
  end if;

  insert into public.subscriptions as s (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict (user_id) do nothing;

  -- 결제 Pro 판정. 프로모션(promo_plan)은 일부러 제외한다 — 쿠폰으로 받은 Pro는
  -- 완주 시 기존 만료일에 7일이 이어붙어 눈에 보이는 혜택이 되므로 상자 보정이 필요 없다.
  -- 이 함수는 complete_tutorial보다 먼저 불리므로, 아직 완주 프로모가 붙기 전 상태로 판정된다.
  select coalesce(tutorial_step, 0),
         (plan = 'pro' and status = 'active'
          and (current_period_end is null or current_period_end > now()))
    into v_cur, v_paid_pro
    from public.subscriptions where user_id = auth.uid();

  if v_cur >= p_step then
    return json_build_object('ok', false, 'reason', 'already_claimed', 'step', v_cur, 'reward', 0);
  end if;

  -- 반드시 한 칸씩만 올라간다. 없으면 complete_tutorial_step(5) 한 번으로
  -- 중간 스텝의 보상을 건너뛴 채 진행도만 끝까지 올릴 수 있다(스텝별 보상이 붙는 순간 악용 경로).
  -- 클라가 오프라인으로 앞서간 경우엔 loadState가 밀린 번호를 순서대로 재전송한다.
  if p_step <> v_cur + 1 then
    return json_build_object('ok', false, 'reason', 'out_of_order', 'step', v_cur, 'reward', 0);
  end if;

  v_reward := public._tutorial_step_reward(p_step, coalesce(v_paid_pro, false));

  update public.subscriptions
    set tutorial_step = p_step,
        peakbox_count = peakbox_count + v_reward
    where user_id = auth.uid()
    returning peakbox_count into v_box;

  return json_build_object('ok', true, 'step', p_step, 'reward', v_reward, 'peakbox_count', v_box);
end;
$$;

grant execute on function public.get_tutorial_state()          to authenticated;
grant execute on function public.skip_tutorial()               to authenticated;

-- set_tutorial_step은 보상 없이 진행도만 올린다 — 살려두면 그걸로 5까지 올린 뒤
-- complete_tutorial을 불러 7일 Pro만 빼먹는 우회로가 된다. 클라도 더는 쓰지 않으므로 함수째 없앤다.
--   ⚠ revoke만으로는 못 막는다: Postgres는 함수 생성 시 PUBLIC에 EXECUTE를 기본 부여하므로
--   authenticated에서만 회수해도 PUBLIC 경로로 그대로 호출된다(revoke_set_my_plan.sql 참고).
drop function if exists public.set_tutorial_step(integer);
grant execute on function public.complete_tutorial(integer)      to authenticated;
grant execute on function public.complete_tutorial_step(integer) to authenticated;

-- ── 튜토리얼 완주 보상: 7일 Pro 체험 (promo_code_system.sql 필요, 반드시 먼저 실행) ──
--   promo_codes 행을 직접 심어서 complete_tutorial()이 내부적으로만 태운다.
--   클라에는 절대 이 코드를 넘기지 않는다 — 쿠폰 입력창에 이 값을 쳐서 부정 수령하는 걸
--   막기 위해 무작위 문자열로 두고(추측 불가), promo_codes 자체도 RLS로 클라 직접 조회가 막혀 있다.
insert into public.promo_codes (code, peakbox_amount, pro_days, max_uses, expires_at, active, memo)
values ('__TUTORIAL_COMPLETE_5f8a2c__', 0, 7, null, null, true,
        '튜토리얼 전체 완주 보상 — complete_tutorial() 내부 전용, 유저 미노출/미입력')
on conflict (code) do nothing;
