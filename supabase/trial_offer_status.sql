-- ───────────────────────────────────────────────────────────
-- 7일 체험권 캠페인 — 현재 유저가 아직 받을 수 있는지 + 클레임 마감일 조회
--   docs/trial-experiment-dashboard-plan.md §2, §8 참고.
--   프로필 "체험하기" 버튼 노출 여부 + 안내모달 노출 여부를 이 한 번의 호출로 판단.
--
--   eligible = (현재 유효플랜이 pro 아님) AND (코드가 active·마감 전) AND (아직 미클레임)
--   deadline = promo_codes.expires_at (캠페인 클레임 마감, 개인별 7일 체험기간과는 다름)
--
--   Supabase SQL Editor에서 1회 실행. trial_experiment_promo_code.sql 실행 이후여야
--   의미가 있음(코드 없으면 항상 eligible=false 반환).
-- ───────────────────────────────────────────────────────────

create or replace function public.trial_offer_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code    text := '10K_TRIAL_7D';
  v_expires timestamptz;
  v_active  boolean;
  v_claimed boolean;
  v_is_pro  boolean;
begin
  if auth.uid() is null then
    return json_build_object('eligible', false, 'deadline', null);
  end if;

  select expires_at, active
    into v_expires, v_active
    from public.promo_codes
   where code = v_code;

  -- 코드 자체가 없거나 꺼졌거나 마감 지났으면 대상 아님
  if v_active is distinct from true
     or (v_expires is not null and v_expires <= now()) then
    return json_build_object('eligible', false, 'deadline', v_expires);
  end if;

  select exists(
    select 1 from public.promo_redemptions
     where code = v_code and user_id = auth.uid()
  ) into v_claimed;

  v_is_pro := (public.get_my_plan() = 'pro');

  return json_build_object(
    'eligible', (not v_claimed) and (not v_is_pro),
    'deadline', v_expires
  );
end;
$$;

grant execute on function public.trial_offer_status() to authenticated;
