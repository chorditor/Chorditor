-- ═══════════════════════════════════════════════════════════════
-- Chorditor Analytics DB Migration
-- Supabase SQL Editor에서 실행하세요
-- ═══════════════════════════════════════════════════════════════

-- ── 이벤트 로그 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id      text        NOT NULL,
  session_id   uuid        NOT NULL,
  event_name   text        NOT NULL,
  event_category text      NOT NULL DEFAULT 'other',
  properties   jsonb       NOT NULL DEFAULT '{}',
  ab_variants  jsonb       NOT NULL DEFAULT '{}',
  screen       text,
  plan         text        CHECK (plan IN ('free','standard','pro')),
  app_version  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 인덱스: 분석 쿼리 성능 최적화
CREATE INDEX IF NOT EXISTS idx_ae_event_name   ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_ae_category     ON public.analytics_events (event_category);
CREATE INDEX IF NOT EXISTS idx_ae_anon_id      ON public.analytics_events (anon_id);
CREATE INDEX IF NOT EXISTS idx_ae_user_id      ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_ae_session_id   ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ae_created_at   ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_plan         ON public.analytics_events (plan);

-- ── 세션 테이블 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id       text        NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  duration_sec  int,
  entry_screen  text,
  exit_screen   text,
  event_count   int         DEFAULT 0,
  plan_at_start text,
  app_version   text,
  device_os     text
);

CREATE INDEX IF NOT EXISTS idx_as_anon_id    ON public.analytics_sessions (anon_id);
CREATE INDEX IF NOT EXISTS idx_as_started_at ON public.analytics_sessions (started_at DESC);

-- ── A/B 실험 정의 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id           text        PRIMARY KEY,  -- 'tutorial_v1', 'paywall_v2' 등
  name         text        NOT NULL,
  description  text,
  variants     jsonb       NOT NULL DEFAULT '["control","treatment"]',
  traffic_pct  int         NOT NULL DEFAULT 100 CHECK (traffic_pct BETWEEN 0 AND 100),
  status       text        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','running','paused','completed')),
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── A/B 배정 기록 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id  text        NOT NULL REFERENCES public.ab_experiments(id),
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id        text        NOT NULL,
  variant        text        NOT NULL,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, anon_id)  -- 한 사용자가 같은 실험에 두 번 배정되지 않도록
);

CREATE INDEX IF NOT EXISTS idx_aba_experiment ON public.ab_assignments (experiment_id);
CREATE INDEX IF NOT EXISTS idx_aba_anon_id    ON public.ab_assignments (anon_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security) 정책
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_assignments     ENABLE ROW LEVEL SECURITY;

-- analytics_events: anon/authenticated 모두 INSERT 가능, SELECT는 본인 데이터만
CREATE POLICY "events_insert_anon" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "events_select_own" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- analytics_sessions: INSERT 허용
CREATE POLICY "sessions_insert_anon" ON public.analytics_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ab_experiments: 누구나 읽기 가능 (클라이언트 배정 로직에서 필요)
CREATE POLICY "experiments_read_all" ON public.ab_experiments
  FOR SELECT TO anon, authenticated
  USING (status = 'running');

-- ab_assignments: 본인 배정 내역 읽기 + INSERT
CREATE POLICY "assignments_insert" ON public.ab_assignments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "assignments_read_own" ON public.ab_assignments
  FOR SELECT TO anon, authenticated
  USING (anon_id = current_setting('request.jwt.claims', true)::json->>'anon_id'
      OR user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 배치 이벤트 삽입 RPC 함수
-- 클라이언트에서 events 배열을 한 번에 전송
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.insert_analytics_batch(events jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ev jsonb;
BEGIN
  FOR ev IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    INSERT INTO public.analytics_events (
      user_id, anon_id, session_id, event_name, event_category,
      properties, ab_variants, screen, plan, app_version, created_at
    ) VALUES (
      NULLIF(ev->>'user_id', '')::uuid,
      ev->>'anon_id',
      (ev->>'session_id')::uuid,
      ev->>'event_name',
      COALESCE(ev->>'event_category', 'other'),
      COALESCE(ev->'properties', '{}'),
      COALESCE(ev->'ab_variants', '{}'),
      ev->>'screen',
      ev->>'plan',
      ev->>'app_version',
      COALESCE((ev->>'created_at')::timestamptz, now())
    );
  END LOOP;
END;
$$;

-- RPC 함수 실행 권한 (anon 사용자도 호출 가능)
GRANT EXECUTE ON FUNCTION public.insert_analytics_batch(jsonb) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 분석용 뷰 (SQL Editor에서 바로 조회 가능)
-- ═══════════════════════════════════════════════════════════════

-- 일별 이벤트 카테고리별 통계
CREATE OR REPLACE VIEW public.v_daily_event_stats AS
SELECT
  DATE(created_at) AS day,
  event_category,
  event_name,
  plan,
  COUNT(*) AS event_count,
  COUNT(DISTINCT anon_id) AS unique_users
FROM public.analytics_events
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 5 DESC;

-- 구독 전환 퍼널
CREATE OR REPLACE VIEW public.v_subscription_funnel AS
SELECT
  DATE(created_at) AS day,
  event_name,
  COUNT(*) AS count,
  COUNT(DISTINCT anon_id) AS unique_users,
  jsonb_agg(DISTINCT properties->>'trigger_source') FILTER (WHERE properties->>'trigger_source' IS NOT NULL) AS trigger_sources
FROM public.analytics_events
WHERE event_category = 'subscription'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- 기능별 사용률 (최근 30일)
CREATE OR REPLACE VIEW public.v_feature_usage_30d AS
SELECT
  event_category,
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT anon_id) AS unique_users,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY event_category), 1) AS pct_within_category
FROM public.analytics_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;

-- A/B 테스트 결과 요약
CREATE OR REPLACE VIEW public.v_ab_results AS
SELECT
  aa.experiment_id,
  aa.variant,
  COUNT(DISTINCT aa.anon_id) AS assigned_users,
  SUM(CASE WHEN ae.event_name = 'plan_upgrade_completed' THEN 1 ELSE 0 END) AS conversions,
  ROUND(
    SUM(CASE WHEN ae.event_name = 'plan_upgrade_completed' THEN 1 ELSE 0 END) * 100.0
    / NULLIF(COUNT(DISTINCT aa.anon_id), 0), 2
  ) AS conversion_rate_pct
FROM public.ab_assignments aa
LEFT JOIN public.analytics_events ae
  ON aa.anon_id = ae.anon_id
  AND ae.created_at >= aa.assigned_at
GROUP BY 1, 2
ORDER BY 1, 2;
