// scripts/adhoc-engagement-quadrant.js
// 일회성 조사 스크립트 — engagement_quadrant_design.md 쿼리를 BigQuery
// 전체이력(analytics_events 76만행)으로 돌려서 산포도용 원본 데이터 뽑기.
// 프로덕션 파이프라인 아님, 결과 JSON만 뽑고 끝나면 지워도 됨.

const path = require('path');
const fs = require('fs');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

const query = `
WITH e AS (
  SELECT user_id, created_at,
    LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS prev_at
  FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
  WHERE user_id IS NOT NULL
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
),
per_user AS (
  SELECT user_id,
    COUNT(*) AS session_count,
    AVG(duration_min) AS mean_duration_min,
    APPROX_QUANTILES(duration_min, 100)[OFFSET(50)] AS median_duration_min
  FROM per_session
  GROUP BY user_id
)
SELECT user_id, session_count,
  ROUND(mean_duration_min, 2) AS mean_duration_min,
  ROUND(median_duration_min, 2) AS median_duration_min
FROM per_user
ORDER BY session_count DESC
`;

async function main() {
  const [rows] = await bigquery.query({ query });
  console.log(`[adhoc] 유저 ${rows.length}명 조회됨`);

  // session_count >= 3 서브셋으로 baseline(모집단 median) 계산
  const eligible = rows.filter((r) => r.session_count >= 3);
  const sortedSessionCount = eligible.map((r) => r.session_count).sort((a, b) => a - b);
  const sortedMedianDur = eligible.map((r) => r.median_duration_min).sort((a, b) => a - b);

  function median(arr) {
    if (arr.length === 0) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  const baseline = {
    eligibleCount: eligible.length,
    totalUsers: rows.length,
    baseSessionCount: Math.round(median(sortedSessionCount)),
    baseMedianDuration: Math.round(median(sortedMedianDur)),
  };

  console.log('[adhoc] baseline:', baseline);

  const out = { rows, baseline, generatedAt: new Date().toISOString() };
  const outPath = path.join(__dirname, '..', '.migration-tmp', 'engagement-quadrant.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');
  console.log(`[adhoc] 저장 완료: ${outPath}`);
}

main().catch((err) => {
  console.error('[adhoc] 실패:', err.message);
  process.exit(1);
});
