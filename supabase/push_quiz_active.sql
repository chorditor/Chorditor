-- ───────────────────────────────────────────────────────────
-- push_quiz_active.sql : 5번(적극형) — 주간 결산 푸시 타겟팅.
--   5개 훈련(퀴즈/스케일/조합/진행/주법) 각각 독립적으로 지난 7일 활동량 집계 →
--   훈련별 IQR 이상치 분리 → 이상치는 전체(본인제외) 평균과, 일반유저는
--   이상치 뺀 일반군(본인제외) 평균과 비교(옵션1, 2026-07-31 확정) →
--   1.5배 이상인 훈련이 여러 개면 배수 가장 높은 훈련 1개만 선택.
--   추천용(least_training) = 5개 중 이번 주 기록이 가장 적은 훈련(소프트코딩, 동률시 이름순 고정).
--   발송 주기: 주 1회(월요일), 문구엔 배수(N배)만 노출하고 실제 횟수는 노출 안 함.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_quiz_active_targets()
returns table (
  user_id        uuid,
  token          text,
  platform       text,
  nickname       text,
  top_training   text,
  ratio          numeric,
  least_training text
)
language sql
security definer
set search_path = public
as $$
  with counts as (
    select user_id, 'quiz' as training, count(*) as cnt
    from analytics_events
    where event_name = 'quiz_completed' and created_at >= now() - interval '7 days'
    group by user_id
    union all
    select user_id, 'scale', count(*)
    from analytics_events
    where event_name = 'scale_test_submitted' and created_at >= now() - interval '7 days'
    group by user_id
    union all
    select user_id, 'combo', count(*)
    from analytics_events
    where event_name = 'combo_training_completed' and created_at >= now() - interval '7 days'
    group by user_id
    union all
    select user_id, 'progression', count(*)
    from analytics_events
    where event_name = 'progression_detail_played' and created_at >= now() - interval '7 days'
    group by user_id
    union all
    select user_id, 'strum', count(*)
    from analytics_events
    where event_name = 'strum_play_started' and created_at >= now() - interval '7 days'
    group by user_id
  ),
  stats as (
    select
      training,
      percentile_cont(0.25) within group (order by cnt) as q1,
      percentile_cont(0.75) within group (order by cnt) as q3
    from counts
    group by training
  ),
  classified as (
    select
      c.user_id, c.training, c.cnt,
      (c.cnt > s.q3 + 1.5 * (s.q3 - s.q1)) as is_outlier
    from counts c
    join stats s using (training)
  ),
  normal_agg as (
    select training, sum(cnt) as sum_c, count(*) as n
    from classified where not is_outlier
    group by training
  ),
  overall_agg as (
    select training, sum(cnt) as sum_c, count(*) as n
    from classified
    group by training
  ),
  ratios as (
    select
      c.user_id, c.training, c.cnt,
      case when c.is_outlier
        then c.cnt::numeric / nullif((o.sum_c - c.cnt)::numeric / nullif(o.n - 1, 0), 0)
        else c.cnt::numeric / nullif((n.sum_c - c.cnt)::numeric / nullif(n.n - 1, 0), 0)
      end as ratio
    from classified c
    join overall_agg o using (training)
    join normal_agg  n using (training)
  ),
  top_pick as (
    select distinct on (user_id) user_id, training as top_training, ratio
    from ratios
    where ratio >= 1.5
    order by user_id, ratio desc
  ),
  -- 추천용: 유저별 5개 훈련 중 기록이 가장 적은 훈련(미기록=0, 동률시 이름순 고정으로 결정론적)
  all_trainings as (
    select unnest(array['combo', 'progression', 'quiz', 'scale', 'strum']) as training
  ),
  user_all as (
    select tp.user_id, t.training, coalesce(c.cnt, 0) as cnt
    from top_pick tp
    cross join all_trainings t
    left join counts c on c.user_id = tp.user_id and c.training = t.training
  ),
  least_pick as (
    select distinct on (user_id) user_id, training as least_training
    from user_all
    order by user_id, cnt asc, training
  )
  select
    tp.user_id,
    pt.token,
    pt.platform,
    sub.nickname,
    tp.top_training,
    round(tp.ratio, 0) as ratio,
    lp.least_training
  from top_pick tp
  join least_pick lp using (user_id)
  join push_tokens pt on pt.user_id = tp.user_id
  left join subscriptions sub on sub.user_id = tp.user_id
  where pt.token is not null
    and pt.nudge_enabled = true;
$$;

grant execute on function public.get_quiz_active_targets() to service_role;

-- 확인: select * from get_quiz_active_targets();
