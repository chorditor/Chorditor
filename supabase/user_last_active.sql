-- ───────────────────────────────────────────────────────────
-- user_last_active.sql : 유저별 "마지막 활동시각" 영구 캐시
--
--   문제: get_winback_targets()가 analytics_events에서 max(created_at)을 매번
--   찾는데, 이제 30일 지난 행은 pg_cron으로 지워짐(migration_cursor.sql).
--   유휴 180일까지 판정해야 하는 윈백 사다리 특성상, 30일 넘게 떠난 유저는
--   바로 이 "마지막 활동 행"이 사라져버려서 판정 자체가 깨짐(=푸시 발송 누락).
--
--   해결: analytics_events INSERT 시점에 트리거로 이 값을 즉시 별도 테이블에
--   박아둠. 원본 이벤트 행이 나중에 지워져도 이 캐시는 영향 안 받음.
-- ───────────────────────────────────────────────────────────

create table if not exists public.user_last_active (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null
);

alter table public.user_last_active enable row level security;
-- service_role만 접근. 일반 정책 없음 = anon/authenticated 차단.

-- ── 트리거: analytics_events에 새 행 들어올 때마다 갱신 ──────
create or replace function public.trg_update_user_last_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.user_last_active (user_id, last_active_at)
    values (new.user_id, new.created_at)
    on conflict (user_id) do update
      set last_active_at = excluded.last_active_at
      where excluded.last_active_at > public.user_last_active.last_active_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ae_update_last_active on public.analytics_events;
create trigger trg_ae_update_last_active
after insert on public.analytics_events
for each row execute function public.trg_update_user_last_active();

-- ── 백필: 지금 있는 과거 데이터에서 유저별 마지막활동 한 번 채워넣기 ──
-- ⚠️ 반드시 30일 롤링 삭제(pg_cron)가 처음 도는 것보다 먼저 실행해야 함.
--    이미 지워진 뒤엔 그 유저의 진짜 마지막활동을 Supabase에서 복구 못 함
--    (BigQuery엔 남아있지만, 여긴 실시간 조회용 캐시라 굳이 거기서 끌어올 필요 없음).
insert into public.user_last_active (user_id, last_active_at)
select user_id, max(created_at)
from public.analytics_events
where user_id is not null
group by user_id
on conflict (user_id) do update
  set last_active_at = excluded.last_active_at
  where excluded.last_active_at > public.user_last_active.last_active_at;

-- 확인: select count(*) from public.user_last_active;
