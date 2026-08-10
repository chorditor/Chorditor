-- ───────────────────────────────────────────────────────────
-- 8/7~현재, 30분 코호트별(그 구간 신규가입자만, 누적 아님) 지표
--   1.3.3 (온보딩 우회 경로 차단) 배포 시점 전후로 급변하는지 확인용.
--   각 30분 구간에 "새로 가입한 유저"만 모아서:
--     - nickname null 비율      (우회 경로로 온보딩 안 거친 유저 추정치)
--     - onboarding_completed_at null 비율 (온보딩 이탈률)
--   Supabase SQL Editor에서 실행. 필요시 시작일(START)만 바꿔서 재사용.
-- ───────────────────────────────────────────────────────────

select
  date_bin('30 minutes', created_at, timestamptz '2026-08-07 00:00:00+09') as bucket_30m,
  count(*)                                                                  as signups,
  count(*) filter (where nickname is null)                                  as null_nickname_cnt,
  round(100.0 * count(*) filter (where nickname is null)
        / nullif(count(*), 0), 1)                                          as null_nickname_pct,
  count(*) filter (where onboarding_completed_at is null)                  as onboarding_dropoff_cnt,
  round(100.0 * count(*) filter (where onboarding_completed_at is null)
        / nullif(count(*), 0), 1)                                          as onboarding_dropoff_pct
from public.pure_subscriptions
where created_at >= timestamptz '2026-08-07 00:00:00+09'
  and created_at < now()
group by 1
order by 1;
