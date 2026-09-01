-- ───────────────────────────────────────────────────────────
-- push_broadcast : 공지성 푸시(고정 문구, 대량 일괄 발송) 관리 테이블.
--   윈백/넛지처럼 유저별 개인화가 아니라 "전체 or 조건 필터"로 같은 문구를
--   한 번 발송하는 캠페인용. 새 캠페인은 이 테이블에 행 1개 insert만 하면 됨.
--
--   min_version_exclude: 이 버전을 "이미 받은" 걸로 보고 제외. NULL이면 전체발송.
--     대상 판정은 subscriptions.app_version 기준 — 이 컬럼이 NULL인 유저(버전 동기화
--     이전 가입자/미접속자)는 "구버전일 가능성"으로 간주해 포함시킨다.
--
--   scheduled_at 지나면 push-broadcast Edge Function이 pg_cron으로 주기 호출되어
--   자동 발송 후 status를 sent로 갱신. 재발송 없음(1건당 1회).
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_broadcast (
  id                   bigint generated always as identity primary key,
  title                text not null,
  body                 text not null,
  min_version_exclude  text,
  scheduled_at         timestamptz not null,
  status               text not null default 'pending' check (status in ('pending','sending','sent')),
  sent_count           integer,
  failed_count         integer,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists idx_push_broadcast_pending
  on public.push_broadcast (scheduled_at)
  where status = 'pending';

-- 예정시각(scheduled_at) 지난 캠페인 중 대기중(pending) 또는 배치 처리 중이던(sending) 것
-- 1건을 원자적으로 집어옴(동시실행 방지). scheduled_at은 최초 발송 시점뿐 아니라
-- 배치 재개 시점도 함께 통제 — sending 상태여도 scheduled_at 지나기 전엔 재개 안 함.
-- for update skip locked: 겹치는 cron 호출이 있어도 같은 캠페인을 두 번 잡지 않음.
create or replace function public.claim_due_broadcast()
returns public.push_broadcast
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.push_broadcast;
begin
  update public.push_broadcast
  set status = 'sending'
  where id = (
    select id from public.push_broadcast
    where status in ('pending', 'sending') and scheduled_at <= now()
    order by scheduled_at asc
    limit 1
    for update skip locked
  )
  returning * into r;
  return r;
end;
$$;

grant execute on function public.claim_due_broadcast() to service_role;

-- 기존 1-arg 시그니처 제거(새 3-arg 버전으로 대체, overload 혼재 방지)
drop function if exists public.get_broadcast_targets(text);

-- 캠페인 대상 조회: 토큰 있는 유저 중 min_version_exclude 버전이 아닌(또는 버전 미확인) 유저,
-- 그리고 이 캠페인(p_broadcast_id)으로 이미 push_send_log에 발송기록 남은 유저는 제외
-- (배치 재개 시 중복발송 방지). p_limit로 배치 크기 제한.
create or replace function public.get_broadcast_targets(
  p_min_version_exclude text default null,
  p_broadcast_id bigint default null,
  p_limit int default 500
)
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
  from public.push_tokens pt
  left join public.subscriptions sub on sub.user_id = pt.user_id
  where (p_min_version_exclude is null
     or sub.app_version is distinct from p_min_version_exclude)
    and not exists (
      select 1 from public.push_send_log l
      where l.user_id = pt.user_id
        and l.category = 'broadcast_' || p_broadcast_id::text
    )
  limit p_limit;
$$;

grant execute on function public.get_broadcast_targets(text, bigint, int) to service_role;

-- 기존 3-arg 시그니처 제거(새 4-arg 버전으로 대체)
drop function if exists public.finish_broadcast(bigint, int, int);

-- 발송 마감(배치마다 호출). p_done=false면 카운트만 누적하고 status는 sending 유지
-- → 다음 틱에서 이어서 처리. p_done=true면 전량 처리 완료로 보고 status를 sent로 확정.
create or replace function public.finish_broadcast(p_id bigint, p_sent int, p_failed int, p_done boolean default true)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_broadcast
  set sent_count = coalesce(sent_count, 0) + p_sent,
      failed_count = coalesce(failed_count, 0) + p_failed,
      status = case when p_done then 'sent' else status end,
      sent_at = case when p_done then now() else sent_at end
  where id = p_id;
$$;

grant execute on function public.finish_broadcast(bigint, int, int, boolean) to service_role;

-- pg_cron: 5분마다 push-broadcast Edge Function 호출 (대기중인 캠페인 있으면 처리, 없으면 즉시 종료)
-- ⚠️ anon 헤더 없으면 게이트웨이가 401로 거부함(cron 401 버그, fcm_push_status 메모리 참고).
select cron.schedule(
  'push-broadcast-poll',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/push-broadcast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ───────────────────────────────────────────────────────────
-- 이번 캠페인: 튜너/메트로놈 신기능 공지 (1.3.4 미갱신 유저 대상)
-- 아래는 예시 — PROJECT_REF/ANON_KEY 채운 뒤 실행할 것.
-- ───────────────────────────────────────────────────────────
-- insert into public.push_broadcast (title, body, min_version_exclude, scheduled_at)
-- values (
--   '코디터에 새 기능이 생겼어요!',
--   '튜너/메트로놈이 추가됐어요. 오늘 튜닝 해보고 기타 연습 해보는 건 어때요~?',
--   '1.3.4',
--   '2026-08-25 18:00:00+09'
-- );
