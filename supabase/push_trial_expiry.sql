-- ───────────────────────────────────────────────────────────
-- push_trial_expiry.sql : 1만 다운로드 7일 체험권 — 만료 하루 전(클레임 6일차) 리마인드 푸시 타겟팅.
--   docs/trial-experiment-dashboard-plan.md §2, §8 참고.
--
--   개인별 카운트다운: promo_redemptions.redeemed_at + 7일 = 만료. 그 하루 전(6일차)에 1회 발송.
--   중복발송 방지: promo_redemptions.expiry_push_sent_at (발송 성공 시 Edge Function이 채움).
--   크론이 하루 1회 도므로, redeemed_at 기준 6~8일 구간 + 미발송인 대상만 잡는다
--   (크론이 하루 놓쳐도 늦게라도 1회는 나감. 8일 넘으면 이미 만료라 발송 안 함).
--
--   이미 결제 구독 중인 유저는 제외(체험 만료 알림이 의미 없음).
--   야간 발송 제한(21:00~08:00 KST)은 Edge Function(push-trial-expiry)에서 게이트.
--
--   사전: trial_experiment_promo_code.sql 실행 이후여야 대상이 잡힌다(코드 없으면 항상 0건).
--   Supabase SQL Editor에서 1회 실행.
-- ───────────────────────────────────────────────────────────

alter table public.promo_redemptions
  add column if not exists expiry_push_sent_at timestamptz;

-- 설정 > 푸시알림 토글(기본 ON)
alter table public.push_tokens
  add column if not exists trial_expiry_enabled boolean not null default true;

create or replace function public.get_trial_expiry_targets()
returns table (
  user_id  uuid,
  token    text,
  platform text
)
language sql
security definer
set search_path = public
as $$
  select pt.user_id, pt.token, pt.platform
  from public.promo_redemptions pr
  join public.push_tokens pt on pt.user_id = pr.user_id
  left join public.subscriptions sub on sub.user_id = pr.user_id
  where pr.code = '10K_TRIAL_7D'
    and pr.expiry_push_sent_at is null
    and pr.redeemed_at <= now() - interval '6 days'
    and pr.redeemed_at >  now() - interval '8 days'
    and pt.token is not null
    and pt.trial_expiry_enabled = true
    -- 결제 구독 중이면 제외(get_my_plan의 유료 판정과 동일 조건)
    and not (
      sub.status = 'active'
      and (sub.current_period_end is null or sub.current_period_end > now())
    );
$$;

grant execute on function public.get_trial_expiry_targets() to service_role;

-- 발송 완료 표시(Edge Function이 발송 성공 후 호출)
create or replace function public.mark_trial_expiry_notified(p_user_id uuid, p_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_redemptions
  set expiry_push_sent_at = p_at
  where code = '10K_TRIAL_7D' and user_id = p_user_id;
$$;

grant execute on function public.mark_trial_expiry_notified(uuid, timestamptz) to service_role;

-- ── 동시 실행 방지 락 (push_peak_full.sql과 동일 패턴) ──────────
create table if not exists public.push_trial_expiry_lock (
  id        boolean primary key default true,
  locked_at timestamptz,
  constraint push_trial_expiry_lock_single_row check (id)
);

insert into public.push_trial_expiry_lock (id, locked_at)
values (true, null)
on conflict (id) do nothing;

create or replace function public.acquire_trial_expiry_lock(p_ttl_seconds int default 90)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  acquired boolean;
begin
  update public.push_trial_expiry_lock
  set locked_at = now()
  where id = true
    and (locked_at is null or locked_at < now() - make_interval(secs => p_ttl_seconds))
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

grant execute on function public.acquire_trial_expiry_lock(int) to service_role;

create or replace function public.release_trial_expiry_lock()
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_trial_expiry_lock set locked_at = null where id = true;
$$;

grant execute on function public.release_trial_expiry_lock() to service_role;
