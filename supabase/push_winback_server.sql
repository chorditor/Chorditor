-- ───────────────────────────────────────────────────────────
-- push_winback_server.sql
-- 서버측 윈백 발송: 발송 이력 + 타겟팅 함수.
-- 마지막 활동(analytics_events) 기준 유휴 단계 산정 → 미발송 단계만 추출.
--
-- 사다리(마지막 접속 기준 누적):
--   stage1 +3일 / stage2 +7일 / stage3 +30일 / stage4 +180일
--   stage2~ 는 월요일에만 발송(요일 게이트). stage1 은 요일 무관.
-- ───────────────────────────────────────────────────────────

-- ── 발송 이력 (중복 발송 방지) ──────────────────────────────
create table if not exists public.push_winback_log (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  stage    int  not null,
  sent_at  timestamptz not null default now()
);
create index if not exists idx_pwl_user on public.push_winback_log (user_id, sent_at desc);

alter table public.push_winback_log enable row level security;
-- service_role(Edge Function)만 접근. 일반 정책 없음 = anon/authenticated 차단.

-- ── 타겟팅 함수: 지금 발송해야 할 윈백 대상 반환 ────────────
-- service_role 로 호출(Edge Function). KST 기준 판단.
create or replace function public.get_winback_targets()
returns table (
  user_id  uuid,
  token    text,
  platform text,
  stage    int,
  title    text,
  body     text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_kst timestamptz := now();
  is_monday boolean := (extract(dow from (now() at time zone 'Asia/Seoul')) = 1);
begin
  return query
  with last_active as (
    -- 유저별 마지막 활동 시각 (로그인 유저만, 토큰 보유자).
    -- 활동 이벤트 없으면 토큰 등록시각(pt.updated_at)을 바닥값으로 → 신규 유저 오판 방지.
    select pt.user_id, pt.token, pt.platform, pt.winback_enabled,
           greatest(coalesce(max(ae.created_at), pt.updated_at), pt.updated_at) as last_at
    from public.push_tokens pt
    left join public.analytics_events ae on ae.user_id = pt.user_id
    where pt.user_id is not null
    group by pt.user_id, pt.token, pt.platform, pt.winback_enabled, pt.updated_at
  ),
  staged as (
    -- 유휴일수 → 도달 단계(최고 임계 통과). 단계별 요일 게이트.
    select la.*,
           extract(epoch from (now() - la.last_at)) / 86400.0 as idle_days
    from last_active la
  ),
  target as (
    select s.user_id, s.token, s.platform, s.winback_enabled,
           case
             when s.idle_days >= 180 then 4
             when s.idle_days >= 30  then 3
             when s.idle_days >= 7   then 2
             when s.idle_days >= 3   then 1
             else 0
           end as stage
    from staged s
  )
  select
    t.user_id, t.token, t.platform, t.stage,
    w.title,
    -- 본문 풀에서 랜덤 1개
    (select elem #>> '{}' from jsonb_array_elements(w.body_pool) elem order by random() limit 1) as body
  from target t
  join public.push_winback w on w.stage = t.stage and w.active = true
  where t.stage > 0
    and t.winback_enabled = true     -- 설정 > 푸시알림 > 리마인드 OFF 시 제외
    -- 단계2~ 는 월요일만
    and (t.stage = 1 or is_monday)
    -- 이번 유휴기간(마지막활동 이후) 동안 해당 단계 미발송
    and not exists (
      select 1 from public.push_winback_log l
      where l.user_id = t.user_id
        and l.stage = t.stage
        and l.sent_at > (select last_at from last_active la2 where la2.user_id = t.user_id limit 1)
    );
end;
$$;

grant execute on function public.get_winback_targets() to service_role;
