-- ───────────────────────────────────────────────────────────
-- 프로모션 쿠폰 코드 시스템 (리딤 코드)
--   운영자가 SQL로 코드 발급 → 유저가 프로필에서 입력 → 보상 수령.
--   보상 2종: 피크상자 지급 / pro 플랜 기간제 부여 (둘 다 가능)
--   제한: 기간·수량 각각 독립 (없음 / 하나만 / 둘 다)
--
--   ⚠ 설계 핵심: subscriptions.plan 은 절대 건드리지 않는다.
--   plan 은 RevenueCat 웹훅의 소유물이라 직접 덮어쓰면
--     · 결제 만료(EXPIRATION) 시 웹훅이 free 로 강등 → 프로모션 기간까지 소실
--     · 프로모션 만료 시 원래 플랜(free/결제)이 뭐였는지 복원 불가
--   대신 promo_plan/promo_expires_at 에 따로 저장하고 get_my_plan 에서 합성한다.
--   → 만료되면 자동으로 원래 plan 이 반환되므로 강등 cron 자체가 불필요.
--
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

-- ── 1. 프로모션 상태 컬럼 ───────────────────────────────────
alter table public.subscriptions
  add column if not exists promo_plan       text,
  add column if not exists promo_expires_at timestamptz;

-- ── 2. get_my_plan 교체 (유효 플랜 합성) ────────────────────
-- 기존 정의:
--   SELECT COALESCE((SELECT plan FROM subscriptions
--     WHERE user_id = auth.uid() AND status = 'active'
--       AND (current_period_end IS NULL OR current_period_end > NOW())), 'free');
-- 결제 플랜 판정 로직은 그대로 두고, 프로모션이 유효할 때만 앞에서 가로챈다.
-- 프로모션 판정은 status/current_period_end 게이트와 무관하게 독립적으로 동작.
create or replace function public.get_my_plan()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    -- 1순위: 유효한 프로모션 플랜
    (select promo_plan from public.subscriptions
      where user_id = auth.uid()
        and promo_plan is not null
        and promo_expires_at is not null
        and promo_expires_at > now()),
    -- 2순위: 결제 플랜 (기존 로직 그대로)
    (select plan from public.subscriptions
      where user_id = auth.uid()
        and status = 'active'
        and (current_period_end is null or current_period_end > now())),
    'free'
  );
$$;
grant execute on function public.get_my_plan() to authenticated;

-- ── 3. 쿠폰 테이블 ──────────────────────────────────────────
create table if not exists public.promo_codes (
  code           text primary key,                    -- 대문자 저장
  peakbox_amount integer     not null default 0,      -- 지급 피크상자 수
  pro_days       integer     not null default 0,      -- 0 = pro 미지급
  max_uses       integer,                             -- null = 수량 무제한
  used_count     integer     not null default 0,
  expires_at     timestamptz,                         -- null = 기간 무제한
  active         boolean     not null default true,   -- 긴급 중단 스위치
  memo           text,                                -- '○○기타학원 2026-08 30명'
  created_at     timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code        text        not null references public.promo_codes(code) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)   -- 같은 코드 1인 1회를 DB 제약으로 강제
);

-- 클라 직접 접근 전면 차단(유효 코드 목록 유출 방지). 전부 아래 RPC 경유.
alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;

-- ── 4. 코드 사용 RPC ────────────────────────────────────────
-- 수량 제한은 반드시 UPDATE 한 문장으로 원자 처리한다.
-- select 후 update 로 나누면 동시 입력 시 수량 초과가 발생한다.
create or replace function public.redeem_promo_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_code    text := upper(trim(p_code));
  v_box     integer;
  v_days    integer;
  v_row     public.promo_codes%rowtype;
  v_plan    text := null;
begin
  if v_me is null then
    return json_build_object('ok', false, 'reason', 'no_auth');
  end if;
  if not exists (select 1 from public.subscriptions where user_id = v_me) then
    return json_build_object('ok', false, 'reason', 'no_row');
  end if;
  if exists (select 1 from public.promo_redemptions where code = v_code and user_id = v_me) then
    return json_build_object('ok', false, 'reason', 'already');
  end if;

  -- 검증 + 카운트 증가를 한 문장으로(원자적). 조건 불충족이면 0행.
  update public.promo_codes
     set used_count = used_count + 1
   where code = v_code
     and active
     and (max_uses   is null or used_count < max_uses)
     and (expires_at is null or expires_at > now())
  returning peakbox_amount, pro_days into v_box, v_days;

  -- 실패 사유 구분 (0행일 때만 조회)
  if not found then
    select * into v_row from public.promo_codes where code = v_code;
    if not found                                    then return json_build_object('ok', false, 'reason', 'invalid');  end if;
    if not v_row.active                             then return json_build_object('ok', false, 'reason', 'inactive'); end if;
    if v_row.expires_at is not null
       and v_row.expires_at <= now()                then return json_build_object('ok', false, 'reason', 'expired');  end if;
    return json_build_object('ok', false, 'reason', 'soldout');
  end if;

  -- 사용 기록 (PK 충돌 시 트랜잭션 롤백 → used_count도 원복)
  insert into public.promo_redemptions (code, user_id) values (v_code, v_me);

  -- 보상 지급
  if v_box > 0 then
    update public.subscriptions
       set peakbox_count = peakbox_count + v_box
     where user_id = v_me;
  end if;

  if v_days > 0 then
    -- 이미 프로모션 pro면 기존 만료일에 이어붙여 연장.
    -- 만료 시각은 한국시간(KST) 기준 그날 23:59:59로 올림 — 늦은 시간에 입력해도
    -- 손해가 없고, 프로필에 '○월 ○일까지'로 날짜만 표시하는 것과 정확히 일치한다.
    -- (DB now()는 UTC라 KST로 변환 후 잘라야 한국 자정이 경계가 됨)
    update public.subscriptions
       set promo_plan       = 'pro',
           promo_expires_at = (
             date_trunc('day',
               (greatest(coalesce(promo_expires_at, now()), now())
                 + (v_days || ' days')::interval) at time zone 'Asia/Seoul'
             ) + interval '1 day' - interval '1 second'
           ) at time zone 'Asia/Seoul'
     where user_id = v_me;
    v_plan := 'pro';
  end if;

  return json_build_object('ok', true, 'peakbox', v_box, 'pro_days', v_days, 'plan', v_plan);
end;
$$;
grant execute on function public.redeem_promo_code(text) to authenticated;
