-- ───────────────────────────────────────────────────────────
-- 온보딩 안 끝낸 유저가 보호 페이지(홈/훈련 9종)에 실제로 진입했는지
--   analytics_events로 직접 확인. subscriptions.nickname/onboarding_completed_at
--   null 비율은 이 버그(fail-open 라우트 가드)를 못 잡는다는 걸 확인했으므로 —
--   fail-open 자체가 남기는 흔적(=보호 페이지 이벤트 발생)을 직접 센다.
--   1.3.3 배포(8/9 14:00경, secure-by-default 가드) 전후로 이 이벤트가
--   꺾이는지가 진짜 검증 포인트.
-- ───────────────────────────────────────────────────────────

with protected_events as (
  select
    e.user_id,
    e.event_name,
    e.properties,
    e.created_at
  from public.analytics_events e
  join public.subscriptions s on s.user_id = e.user_id
  where e.user_id is not null
    -- 이벤트 발생 시점에 아직 온보딩 미완료였던 경우만
    -- (지금은 끝냈어도 과거 이벤트 시점엔 안 끝났을 수 있어 시점 비교 필수)
    and (s.onboarding_completed_at is null or e.created_at < s.onboarding_completed_at)
    -- 온보딩 안 거치고는 못 봤어야 할 화면들
    and (
      e.event_name in ('training_page_viewed', 'quiz_page_viewed')
      or (e.event_name = 'screen_view' and coalesce(e.properties ->> 'view', '') = 'home')
    )
)
select
  date_bin('30 minutes', created_at, timestamptz '2026-08-09 00:00:00+09') as bucket_30m,
  count(*)                     as bypass_events,
  count(distinct user_id)      as bypass_users
from protected_events
where created_at >= timestamptz '2026-08-08 00:00:00+09'  -- 배포 하루 전부터
group by 1
order by 1;

-- ── 요약: 배포 전/후 합산 (8/9 14:00 KST 기준) ──
-- with protected_events as ( ... 위와 동일 ... )
-- select
--   (created_at < timestamptz '2026-08-09 14:00:00+09') as is_pre_build,
--   count(*) as bypass_events,
--   count(distinct user_id) as bypass_users
-- from protected_events
-- group by 1;
