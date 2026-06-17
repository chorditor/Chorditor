-- ───────────────────────────────────────────────────────────
-- push_entry_funnel.sql
-- 목적: 푸시 마커가 아직 없는 상태에서, 행동로그(analytics_events)만으로
--       "유저가 메인홈을 거치지 않고 컨텐츠 페이지로 바로 진입"한 건을
--       '푸시 추정 진입(push_inferred)'으로 분류해 퍼널 집계.
--
-- ⚠️ 휴리스틱(근사치)이다. 한계:
--   1) 세션 스티칭 불가 — session_id가 페이지마다 새로 발급됨(localStorage 미저장).
--      → anon_id + created_at 시간순으로만 여정 복원.
--   2) 콜드스타트 푸시는 home.html을 거쳐 app_open(home)을 먼저 찍으므로
--      '직접 접속'으로 오분류됨 → 푸시 과소집계.
--   3) GAP 임계값은 임의값. 아래 params.gap_minutes로 조정.
--
-- 도착(컨텐츠) 이벤트:
--   progression_detail_viewed / scale_level_viewed / strum_play_viewed / quiz_page_viewed
-- 홈맥락(직접 접속 신호) 이벤트:
--   app_open / home_block_tapped / tab_switched / notice_viewed / tutorial_viewed
--   training_page_viewed / training_card_tapped
-- ───────────────────────────────────────────────────────────

with params as (
  select
    timestamptz '2026-06-08 00:00:00+09' as start_kst,   -- 분석 시작(KST). 푸시 시작일로 조정
    timestamptz '2026-06-16 00:00:00+09' as end_kst,      -- 분석 끝(KST)
    5                                     as gap_minutes   -- 도착 직전 N분 내 홈맥락 없으면 푸시 추정
),

-- 컨텐츠 도착 이벤트
arrivals as (
  select
    ae.anon_id,
    ae.user_id,
    ae.event_name,
    ae.created_at,
    case ae.event_name
      when 'progression_detail_viewed' then 'progression'
      when 'scale_level_viewed'        then 'scale'
      when 'strum_play_viewed'         then 'strum'
      when 'quiz_page_viewed'          then 'quiz'
    end as content_type
  from public.analytics_events ae, params p
  where ae.event_name in
        ('progression_detail_viewed','scale_level_viewed','strum_play_viewed','quiz_page_viewed')
    and ae.created_at >= p.start_kst
    and ae.created_at <  p.end_kst
),

-- 각 도착에 대해: 같은 anon_id가 직전 gap분 내 홈맥락 이벤트를 찍었는가?
classified as (
  select
    a.*,
    exists (
      select 1
      from public.analytics_events h, params p
      where h.anon_id = a.anon_id
        and h.event_name in
            ('app_open','home_block_tapped','tab_switched','notice_viewed',
             'tutorial_viewed','training_page_viewed','training_card_tapped')
        and h.created_at <  a.created_at
        and h.created_at >= a.created_at - make_interval(mins => p.gap_minutes)
    ) as via_home
  from arrivals a
)

-- ── 결과 1: 컨텐츠별 진입경로 집계 ──
select
  content_type,
  count(*)                                              as arrivals_total,
  count(*) filter (where via_home)                      as via_home,            -- 직접 접속(홈 경유)
  count(*) filter (where not via_home)                  as push_inferred,        -- 푸시 추정(홈 미경유)
  round(100.0 * count(*) filter (where not via_home)
        / nullif(count(*), 0), 1)                       as push_inferred_pct,
  count(distinct anon_id)                               as unique_anon,
  count(distinct anon_id) filter (where not via_home)   as unique_anon_push
from classified
group by content_type
order by arrivals_total desc;
