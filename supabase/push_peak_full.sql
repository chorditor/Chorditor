-- ───────────────────────────────────────────────────────────
-- push_peak_full.sql : Free 유저 픽(peak) 30 충전완료 푸시 타겟팅.
--   회복은 lazy 계산(peak_system.sql)이라 서버가 주기적으로 깨워보지 않으면
--   "꽉 찼다"는 이벤트 자체가 존재하지 않음 → subscriptions row 의
--   peak_balance/peak_updated_at 만으로 "꽉 찬 시각(candidate_full_at)"을
--   역산해서 판정(실제 recharge 함수 호출 없이도 계산 가능).
--
--   candidate_full_at:
--     balance >= cap  → peak_updated_at 그대로(캡 도달 시 타이머 고정되는 시점)
--     balance <  cap  → peak_updated_at + (cap-balance)*30분
--
--   중복발송 방지: peak_full_notified_at 을 별도 컬럼으로 저장, 다음 조건일 때만 대상:
--     candidate_full_at <= now() AND (notified_at is null OR notified_at < candidate_full_at)
--   재충전 사이클(소모 후 다시 꽉 참)마다 candidate_full_at 이 달라지므로 자동으로 재알림 가능.
--
--   야간 발송 제한(법정 광고성 정보 21:00~08:00)은 Edge Function(push-peak-full)에서
--   KST 기준으로 게이트 — 이 시간대엔 실제 발송을 보류하고 notified_at 갱신도 안 함(다음 크론에 재시도).
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions
  add column if not exists peak_full_notified_at timestamptz;

-- 설정 > 푸시알림 > "픽 충전 완료" 토글(기본 ON). push_tokens에 붙여 타겟팅 함수가 바로 필터.
alter table public.push_tokens
  add column if not exists peakfull_enabled boolean not null default true;

create or replace function public.get_peak_full_targets()
returns table (
  user_id  uuid,
  token    text,
  platform text,
  candidate_full_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pt.user_id, pt.token, pt.platform, c.candidate_full_at
  from public.subscriptions sub
  join public.push_tokens pt on pt.user_id = sub.user_id
  cross join lateral (
    select case
             when sub.peak_balance >= 30 then sub.peak_updated_at
             else sub.peak_updated_at + make_interval(mins => (30 - sub.peak_balance) * 30)
           end as candidate_full_at
  ) c
  where sub.plan = 'free'
    and pt.token is not null
    and pt.peakfull_enabled = true     -- 설정 > 푸시알림 > 픽 충전 완료 OFF 시 제외
    and c.candidate_full_at <= now()
    and (sub.peak_full_notified_at is null or sub.peak_full_notified_at < c.candidate_full_at);
$$;

grant execute on function public.get_peak_full_targets() to service_role;

-- 발송 완료 표시(Edge Function 이 발송 성공 후 호출)
create or replace function public.mark_peak_full_notified(p_user_id uuid, p_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions set peak_full_notified_at = p_at where user_id = p_user_id;
$$;

grant execute on function public.mark_peak_full_notified(uuid, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────
-- 동시 실행 방지 락(2026-07-22 추가): cron(30분)과 수동 트리거, 또는 실행이
-- 길어져 다음 cron과 겹치는 경우 같은 대상에게 중복발송될 수 있음 →
-- 단일 row UPDATE...WHERE 로 원자적 락 획득. TTL 지나면 자동 만료(함수가
-- 중간에 죽어도 영구 락 방지) → Edge Function 은 시작 시 이 RPC 먼저 호출,
-- false 면 즉시 종료.
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_peak_full_lock (
  id        boolean primary key default true,
  locked_at timestamptz,
  constraint push_peak_full_lock_single_row check (id)
);

insert into public.push_peak_full_lock (id, locked_at)
values (true, null)
on conflict (id) do nothing;

create or replace function public.acquire_peak_full_lock(p_ttl_seconds int default 90)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  acquired boolean;
begin
  update public.push_peak_full_lock
  set locked_at = now()
  where id = true
    and (locked_at is null or locked_at < now() - make_interval(secs => p_ttl_seconds))
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

grant execute on function public.acquire_peak_full_lock(int) to service_role;

-- 정상 종료 시 즉시 락 해제(다음 실행이 TTL 만료까지 기다리지 않도록)
create or replace function public.release_peak_full_lock()
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_peak_full_lock set locked_at = null where id = true;
$$;

grant execute on function public.release_peak_full_lock() to service_role;
