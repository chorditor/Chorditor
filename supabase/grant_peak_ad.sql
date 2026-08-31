-- ───────────────────────────────────────────────────────────
-- grant_peak_ad.sql : 피크 완전소진(0) 시 "광고 보고 충전하기" 보상 — +3, 오버충전 허용.
--   open_peakbox()와 동일 패턴(회복 반영 후 즉시 잔액에 더함). 콘텐츠 종류 무관 공용 게이트에서 호출.
-- ───────────────────────────────────────────────────────────

create or replace function public.grant_peak_ad()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_balance integer;
  v_reward      constant integer := 3;
begin
  select * into r from public._apply_peak_recharge(auth.uid());
  v_new_balance := r.balance + v_reward;
  update public.subscriptions set peak_balance = v_new_balance where user_id = auth.uid();
  return json_build_object('ok', true, 'balance', v_new_balance, 'peakbox_count', r.peakbox_count, 'cap', 30, 'reward', v_reward);
end;
$$;

grant execute on function public.grant_peak_ad() to authenticated;

-- 확인: select grant_peak_ad();
