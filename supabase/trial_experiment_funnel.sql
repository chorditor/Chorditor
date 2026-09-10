-- ───────────────────────────────────────────────────────────
-- trial_experiment_funnel.sql : 7일 체험권 실험 대시보드용 일별 스냅샷.
--   docs/trial-experiment-dashboard-plan.md §3, §7-3, §8 참고.
--   paywall_path_history 와 동일 패턴(delete-then-insert + pg_cron 매일 1회).
--
--   퍼널 4단계(클릭식 클레임 모델 기준으로 재정의, §8):
--     claimed      — promo_redemptions(code='10K_TRIAL_7D') 행 수 (= 지급 = 활성화)
--     reopened     — 클레임 후 app_open 1회 이상 (체험을 실제로 써봄)
--     notice_shown — 클레임 후 promo_expiry_notice_shown (만료 하루전 인앱 모달)
--     converted    — 클레임 후 plan_upgrade_completed AND
--                    paywall_viewed(trigger_source='promo_expiry_notice') (알림경유 결제)
--
--   코호트(각 segment_type):
--     overall / gender / age(10살단위) / persona(user_persona_profile) /
--     peak_bucket(클레임 이전 peak_insufficient+peak_buffer_shown 횟수: 0 / 1~4 / 5~9 / 10+)
--
--   Supabase SQL Editor에서 1회 실행. 크론은 trial_experiment_funnel_cron.sql.
-- ───────────────────────────────────────────────────────────

create table if not exists public.trial_experiment_funnel_daily (
  day          date        not null,
  segment_type text        not null,   -- overall | gender | age | persona | peak_bucket
  segment_key  text        not null,
  claimed      int         not null default 0,
  reopened     int         not null default 0,
  notice_shown int         not null default 0,
  converted    int         not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (day, segment_type, segment_key)
);

alter table public.trial_experiment_funnel_daily enable row level security;

revoke select on public.trial_experiment_funnel_daily from anon, authenticated;

drop policy if exists trial_experiment_funnel_daily_select_admin on public.trial_experiment_funnel_daily;
create policy trial_experiment_funnel_daily_select_admin
  on public.trial_experiment_funnel_daily
  for select
  to authenticated
  using (auth.uid() = '670dccca-b0bc-4ffa-9eb2-07380dcea27e');

-- ── 갱신 함수 ──────────────────────────────────────────────────
create or replace function public.refresh_trial_experiment_funnel()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := '10K_TRIAL_7D';
  v_day  date := (now() at time zone 'Asia/Seoul')::date;
begin
  -- 오늘 스냅샷 재작성(delete-then-insert — upsert만 쓰면 segment_key 바뀔 때 스테일 로우 잔존)
  delete from public.trial_experiment_funnel_daily where day = v_day;

  with claimed as (
    select
      pr.user_id,
      pr.redeemed_at,
      coalesce(nullif(trim(sub.gender), ''), '미상') as gender,
      case
        when sub.birth_year is null or sub.birth_year < 1900 then '미상'
        else (floor(((extract(year from now())::int - sub.birth_year)) / 10) * 10)::text || '대'
      end as age_bucket,
      coalesce(upp.persona, '미상') as persona,
      (
        select count(*) from public.analytics_events ae
        where ae.user_id = pr.user_id
          and ae.event_name in ('peak_insufficient', 'peak_buffer_shown')
          and ae.created_at < pr.redeemed_at
      ) as peak_hits,
      exists (
        select 1 from public.analytics_events ae
        where ae.user_id = pr.user_id and ae.event_name = 'app_open'
          and ae.created_at > pr.redeemed_at
      ) as reopened,
      exists (
        select 1 from public.analytics_events ae
        where ae.user_id = pr.user_id and ae.event_name = 'promo_expiry_notice_shown'
          and ae.created_at > pr.redeemed_at
      ) as notice_shown,
      (
        exists (
          select 1 from public.analytics_events ae
          where ae.user_id = pr.user_id and ae.event_name = 'plan_upgrade_completed'
            and ae.created_at > pr.redeemed_at
        )
        and exists (
          select 1 from public.analytics_events ae
          where ae.user_id = pr.user_id and ae.event_name = 'paywall_viewed'
            and ae.properties ->> 'trigger_source' = 'promo_expiry_notice'
            and ae.created_at > pr.redeemed_at
        )
      ) as converted
    from public.promo_redemptions pr
    left join public.subscriptions sub on sub.user_id = pr.user_id
    left join public.user_persona_profile upp on upp.user_id = pr.user_id
    where pr.code = v_code
  ),
  bucketed as (
    select *,
      case
        when peak_hits = 0 then '0회'
        when peak_hits between 1 and 4 then '1~4회'
        when peak_hits between 5 and 9 then '5~9회'
        else '10회+'
      end as peak_bucket
    from claimed
  ),
  rows_to_write as (
    select 'overall' as segment_type, 'overall' as segment_key,
           count(*) as claimed,
           count(*) filter (where reopened) as reopened,
           count(*) filter (where notice_shown) as notice_shown,
           count(*) filter (where converted) as converted
    from bucketed
    union all
    select 'gender', gender,
           count(*), count(*) filter (where reopened),
           count(*) filter (where notice_shown), count(*) filter (where converted)
    from bucketed group by gender
    union all
    select 'age', age_bucket,
           count(*), count(*) filter (where reopened),
           count(*) filter (where notice_shown), count(*) filter (where converted)
    from bucketed group by age_bucket
    union all
    select 'persona', persona,
           count(*), count(*) filter (where reopened),
           count(*) filter (where notice_shown), count(*) filter (where converted)
    from bucketed group by persona
    union all
    select 'peak_bucket', peak_bucket,
           count(*), count(*) filter (where reopened),
           count(*) filter (where notice_shown), count(*) filter (where converted)
    from bucketed group by peak_bucket
  )
  insert into public.trial_experiment_funnel_daily
    (day, segment_type, segment_key, claimed, reopened, notice_shown, converted)
  select v_day, segment_type, segment_key, claimed, reopened, notice_shown, converted
  from rows_to_write;
end;
$$;

grant execute on function public.refresh_trial_experiment_funnel() to service_role;

-- ── 진행카운터(§7-2) — 만료자 수 하나만 반환. 대시보드 프로그레스바 "N / 300" 용 ──
-- 개인별 카운트다운(redeemed_at + 7일)이라 promo_redemptions 기준으로 직접 계산.
create or replace function public.trial_experiment_progress()
returns int
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() = '670dccca-b0bc-4ffa-9eb2-07380dcea27e' then (
      select count(*)::int
      from public.promo_redemptions
      where code = '10K_TRIAL_7D'
        and redeemed_at + interval '7 days' < now()
    )
    else null
  end;
$$;

-- 대시보드는 admin uid 로그인 상태로 호출. 그 외 유저는 null 반환(함수 내부에서 uid 체크).
grant execute on function public.trial_experiment_progress() to authenticated;

-- 최초 1회 즉시 채우기
select public.refresh_trial_experiment_funnel();
