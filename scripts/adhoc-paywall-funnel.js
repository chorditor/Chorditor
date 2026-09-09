// scripts/adhoc-paywall-funnel.js
// 일회성 조사 — 페이월(구독시트) 노출경로 전수 집계.
// 코드 grep으로 확인된 openPlanSheet trigger_source 12종 중 quiz_level/scale_premium은
// 코드상 dead(premium:false / PREMIUM_ENABLED=false)라 실측으로도 0건이 나오는지 교차검증.
// 피크 소진 도달률·소모량 인상 전후(코스트인상 배포일 2026-09-08) 비교도 같이 뽑는다.

const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const COST_HIKE_AT = '2026-09-08 00:00:00'; // 스케일1→2, 퀴즈1→2/2→3 배포일 (KST 기준 대략)

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

const TABLE = '`chorditor-50f9f.chorditor_analytics.analytics_events`';

async function run(label, query) {
  console.log(`\n=== ${label} ===`);
  const [rows] = await bigquery.query({ query });
  console.table(rows);
  return rows;
}

async function main() {
  // 1. 페이월(openPlanSheet) 노출 — trigger_source별 이벤트수·유저수
  await run('1. paywall_viewed — trigger_source별', `
    SELECT
      JSON_EXTRACT_SCALAR(properties, '$.trigger_source') AS trigger_source,
      COUNT(*) AS views,
      COUNT(DISTINCT user_id) AS distinct_users,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM ${TABLE}
    WHERE event_name = 'paywall_viewed'
    GROUP BY trigger_source
    ORDER BY views DESC
  `);

  // 2. 피크 소진 도달(peak_insufficient) — 인상 전/후 비교
  await run('2. peak_insufficient — 코스트인상 전후 비교', `
    SELECT
      CASE WHEN created_at < TIMESTAMP('${COST_HIKE_AT}') THEN 'before_hike' ELSE 'after_hike' END AS period,
      COUNT(*) AS hits,
      COUNT(DISTINCT user_id) AS distinct_users
    FROM ${TABLE}
    WHERE event_name = 'peak_insufficient'
    GROUP BY period
  `);

  // 3. 완충모달 퍼널 — shown → ad_clicked/plan_clicked → 실제 전환(recharged/upgrade)
  await run('3. 완충모달 퍼널 (전체기간)', `
    SELECT event_name, COUNT(*) AS n, COUNT(DISTINCT user_id) AS distinct_users
    FROM ${TABLE}
    WHERE event_name IN ('peak_buffer_shown', 'peak_buffer_ad_clicked', 'peak_recharged_by_ad', 'peak_buffer_plan_clicked')
    GROUP BY event_name
    ORDER BY n DESC
  `);

  // 4. 피크 소모량 — 인상 전/후 DAU당 평균, 유저당 세션내 최대소모(소진 근접도)
  await run('4. peak_consumed 총량/평균 — 코스트인상 전후 비교', `
    SELECT
      CASE WHEN created_at < TIMESTAMP('${COST_HIKE_AT}') THEN 'before_hike' ELSE 'after_hike' END AS period,
      COUNT(*) AS consume_events,
      COUNT(DISTINCT user_id) AS distinct_users,
      SUM(CAST(JSON_EXTRACT_SCALAR(properties, '$.cost') AS INT64)) AS total_cost,
      ROUND(SUM(CAST(JSON_EXTRACT_SCALAR(properties, '$.cost') AS INT64)) / COUNT(DISTINCT user_id), 2) AS avg_cost_per_user
    FROM ${TABLE}
    WHERE event_name = 'peak_consumed'
    GROUP BY period
  `);

  // 5. 실결제(plan_upgrade_completed) — 시점 나열, peak_buffer_plan_clicked와 수동 대조용
  await run('5. plan_upgrade_completed — 전체 나열', `
    SELECT created_at, user_id, JSON_EXTRACT_SCALAR(properties, '$.to_plan') AS to_plan, JSON_EXTRACT_SCALAR(properties, '$.cycle') AS cycle
    FROM ${TABLE}
    WHERE event_name = 'plan_upgrade_completed'
    ORDER BY created_at
  `);

  console.log('\n[paywall-funnel] 완료.');
}

main().catch((err) => {
  console.error('[paywall-funnel] 실패:', err.message);
  process.exit(1);
});
