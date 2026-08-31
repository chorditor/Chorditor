// scripts/adhoc-engagement-quadrant-v2.js
// 일회성 조사 v2 — 3개월 트레일링 윈도우 + 세션빈도를 "가입일수 대비 비율"로 정규화.
// 프로덕션 파이프라인 아님, 일회성 분석용.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const WINDOW_DAYS = 90; // 3개월

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

const query = `
WITH e AS (
  SELECT user_id, created_at,
    LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS prev_at
  FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
  WHERE user_id IS NOT NULL
    AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${WINDOW_DAYS} DAY)
),
marked AS (
  SELECT user_id, created_at,
    CASE WHEN prev_at IS NULL OR TIMESTAMP_DIFF(created_at, prev_at, MINUTE) > 30
         THEN 1 ELSE 0 END AS is_new
  FROM e
),
numbered AS (
  SELECT user_id, created_at,
    SUM(is_new) OVER (PARTITION BY user_id ORDER BY created_at
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_seq
  FROM marked
),
per_session AS (
  SELECT user_id, session_seq,
    TIMESTAMP_DIFF(MAX(created_at), MIN(created_at), SECOND) / 60.0 AS duration_min
  FROM numbered
  GROUP BY user_id, session_seq
)
SELECT user_id,
  COUNT(*) AS session_count,
  ROUND(APPROX_QUANTILES(duration_min, 100)[OFFSET(50)], 2) AS median_duration_min
FROM per_session
GROUP BY user_id
`;

async function fetchSignupDates() {
  // subscriptions.created_at = 가입일. user_id, created_at만 최소 조회(개인정보 없음).
  // PostgREST 서버설정(db-max-rows)이 페이지당 1000행 하드캡이라 커서 페이지네이션 필요
  // (10k 규모라 OFFSET 방식도 안전하지만 일관성 위해 id 커서 사용).
  const map = new Map();
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?select=user_id,created_at&order=user_id.asc&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!res.ok) throw new Error(`subscriptions 조회 실패: ${await res.text()}`);
    const rows = await res.json();
    for (const r of rows) map.set(r.user_id, r.created_at);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return map;
}

async function main() {
  console.log('[v2] BigQuery 세션 쿼리 실행 중 (최근 90일)...');
  const [sessionRows] = await bigquery.query({ query });
  console.log(`[v2] 세션 데이터 ${sessionRows.length}명`);

  console.log('[v2] Supabase 가입일 조회 중...');
  const signupMap = await fetchSignupDates();
  console.log(`[v2] 가입일 ${signupMap.size}명`);

  const now = Date.now();
  const points = [];
  let missingSignup = 0;

  for (const r of sessionRows) {
    const signupAt = signupMap.get(r.user_id);
    if (!signupAt) { missingSignup++; continue; }
    const daysSinceSignup = (now - new Date(signupAt).getTime()) / 86400000;
    const denom = Math.max(Math.min(daysSinceSignup, WINDOW_DAYS), 1);
    const rate = r.session_count / denom;
    points.push({
      session_count: r.session_count,
      median_duration_min: r.median_duration_min,
      daysSinceSignup: Math.round(daysSinceSignup * 10) / 10,
      denom: Math.round(denom * 10) / 10,
      rate: Math.round(rate * 1000) / 1000,
    });
  }

  console.log(`[v2] 가입일 매칭 안 된 유저(스킵): ${missingSignup}`);

  // baseline: session_count >= 3 인 유저(정착군)만
  const eligible = points.filter((p) => p.session_count >= 3);
  function median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  const baseRate = median(eligible.map((p) => p.rate));
  const baseDuration = median(eligible.map((p) => p.median_duration_min));

  console.log('[v2] baseline (정착군 median):', { baseRate, baseDuration, eligibleCount: eligible.length, totalPoints: points.length });

  const outPath = path.join(__dirname, '..', '.migration-tmp', 'engagement-v2.json');
  fs.writeFileSync(outPath, JSON.stringify({
    points, baseRate, baseDuration, eligibleCount: eligible.length,
    totalPoints: points.length, windowDays: WINDOW_DAYS, generatedAt: new Date().toISOString(),
  }));
  console.log(`[v2] 저장 완료: ${outPath}`);
}

main().catch((err) => {
  console.error('[v2] 실패:', err.message);
  process.exit(1);
});
