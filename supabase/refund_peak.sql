-- ───────────────────────────────────────────────────────────
-- refund_peak.sql : 리하모니 화성학 피크 환급 — 정답 5개마다 1개씩 쌓인 것을 훈련을 나가거나 클리어할 때 한 번에 반영.
--   grant_peak_ad()와 동일 패턴(회복 반영 후 즉시 잔액에 더함, 오버충전 허용). 한도 없음 — p_amount는 1 이상이면 됨.
-- ───────────────────────────────────────────────────────────

create or replace function public.refund_peak(p_amount integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_balance integer;
begin
  if p_amount is null or p_amount < 1 then
    return json_build_object('ok', false);
  end if;

  select * into r from public._apply_peak_recharge(auth.uid());
  v_new_balance := r.balance + p_amount;
  update public.subscriptions set peak_balance = v_new_balance where user_id = auth.uid();
  return json_build_object('ok', true, 'balance', v_new_balance, 'peakbox_count', r.peakbox_count, 'cap', 30, 'amount', p_amount);
end;
$$;

grant execute on function public.refund_peak(integer) to authenticated;

-- 확인: select refund_peak(1);
