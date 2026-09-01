// scripts/compute-persona-profile.js
// 프로덕션 배치 — pref_type/skill_type/engagement_type 계산 후 Supabase
// user_persona_profile 테이블에 UPSERT. 30일마다 실행 예정(Task Scheduler 등록은 별도).
//
// persona(5단계)는 이 배치가 절대 안 건드림 — 승급/강등(onboarding.js·shared.js
// _syncPersonaToProfile)이 유일한 쓰기 경로. 여기서 같이 쓰면 30일마다 승급/강등이
// 원상복구되는 사고가 나므로 payload에서 반드시 제외한다(2026-08-31 subscriptions.persona
// 컬럼 자체 삭제와 함께 정리).
//
// 설계 근거: persona_clustering_pipeline_plan.md 전체 참고.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const WINDOW_DAYS = 90;

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[persona] .env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음. 중단.');
  process.exit(1);
}

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

// ── engagement_type 절대 baseline (2026-08-28 수동 확정, persona_clustering_pipeline_plan.md 참고) ──
// 정착군(session_count>=3) IQR 이상치 제거 후 mean. 코호트 크게 뒤집힐 때만 사람이 재계산해서 교체.
const ENGAGEMENT_BASELINE = { ratePerWeek: 1.559, medianDuration: 2.553 };

// ── pref_type 가중치 (2026-08-28 도메인지식 확정, "몰입정도" 기준) ──
const PREF_WEIGHTS = { quiz: 0.4, strum: 0.6, combo: 0.7, prog: 0.3 };

const EVENTS = {
  quiz:  'quiz_completed',
  strum: 'strum_play_started',
  scale: 'scale_test_result',
  combo: 'combo_training_completed',
  prog:  'progression_detail_played', // progression_played 아님(리스트페이지 미리듣기라 거의 안 찍힘)
};

// ── BigQuery: 세션(몰입도) + 5개 이벤트 원본 카운트/정답률 한 번에 조회 ──
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
),
sessions AS (
  SELECT user_id,
    COUNT(*) AS session_count,
    APPROX_QUANTILES(duration_min, 100)[OFFSET(50)] AS median_duration_min
  FROM per_session
  GROUP BY user_id
),
raw_events AS (
  SELECT user_id, event_name, properties, created_at
  FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
  WHERE user_id IS NOT NULL
    AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${WINDOW_DAYS} DAY)
    AND event_name IN ('${EVENTS.quiz}', '${EVENTS.strum}', '${EVENTS.scale}', '${EVENTS.combo}', '${EVENTS.prog}')
),
per_user_events AS (
  SELECT
    user_id,
    COUNTIF(event_name = '${EVENTS.quiz}') AS quiz_n,
    SUM(IF(event_name = '${EVENTS.quiz}', CAST(JSON_EXTRACT_SCALAR(properties, '$.correct_count') AS FLOAT64), 0)) AS quiz_correct_sum,
    SUM(IF(event_name = '${EVENTS.quiz}', CAST(JSON_EXTRACT_SCALAR(properties, '$.total') AS FLOAT64), 0)) AS quiz_total_sum,

    COUNTIF(event_name = '${EVENTS.strum}') AS strum_n,

    COUNTIF(event_name = '${EVENTS.scale}') AS scale_n,
    AVG(IF(event_name = '${EVENTS.scale}', CAST(JSON_EXTRACT_SCALAR(properties, '$.score_pct') AS FLOAT64), NULL)) AS scale_score_avg,

    COUNTIF(event_name = '${EVENTS.combo}') AS combo_n,
    SUM(IF(event_name = '${EVENTS.combo}', CAST(JSON_EXTRACT_SCALAR(properties, '$.correct') AS FLOAT64), 0)) AS combo_correct_sum,
    SUM(IF(event_name = '${EVENTS.combo}', CAST(JSON_EXTRACT_SCALAR(properties, '$.total') AS FLOAT64), 0)) AS combo_total_sum,

    COUNTIF(event_name = '${EVENTS.prog}') AS prog_n
  FROM raw_events
  GROUP BY user_id
)
SELECT
  COALESCE(s.user_id, pe.user_id) AS user_id,
  s.session_count, s.median_duration_min,
  pe.quiz_n, pe.quiz_correct_sum, pe.quiz_total_sum,
  pe.strum_n,
  pe.scale_n, pe.scale_score_avg,
  pe.combo_n, pe.combo_correct_sum, pe.combo_total_sum,
  pe.prog_n
FROM sessions s
FULL OUTER JOIN per_user_events pe USING (user_id)
`;

async function fetchSupabasePaginated(table, select, orderCol) {
  const map = new Map();
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=${orderCol}.asc&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!res.ok) throw new Error(`${table} 조회 실패: ${await res.text()}`);
    const rows = await res.json();
    for (const r of rows) map.set(r.user_id, r);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return map;
}

function ratio(n, avg) { return avg === 0 || avg === undefined ? 0 : n / avg; }

function classifyEngagement(sessionCount, medianDuration, ratePerWeek) {
  if (sessionCount == null || sessionCount < 3) return 'insufficient_data';
  const freqOk = ratePerWeek >= ENGAGEMENT_BASELINE.ratePerWeek;
  const durOk = medianDuration >= ENGAGEMENT_BASELINE.medianDuration;
  if (freqOk && durOk) return 'heavy_user';
  if (freqOk) return 'habitual';
  if (durOk) return 'immersive';
  return 'light_user';
}

async function main() {
  console.log('[persona] BigQuery 쿼리 실행 중 (최근 90일)...');
  const [rows] = await bigquery.query({ query });
  console.log(`[persona] 유저 ${rows.length}명`);

  console.log('[persona] Supabase 가입일/닉네임 조회 중...');
  const signupMap = await fetchSupabasePaginated('subscriptions', 'user_id,created_at,nickname', 'user_id');
  console.log(`[persona] 가입정보 ${signupMap.size}명`);

  // ── pref_type: 활동자만의 population 평균(단위변환용) ──
  const activeAvg = (key) => {
    const active = rows.filter((r) => (r[key] || 0) > 0);
    if (active.length === 0) return 0;
    return active.reduce((a, r) => a + (r[key] || 0), 0) / active.length;
  };
  const avgQuiz = activeAvg('quiz_n');
  const avgStrum = activeAvg('strum_n');
  const avgScale = activeAvg('scale_n');
  const avgCombo = activeAvg('combo_n');
  const avgProg = activeAvg('prog_n');
  console.log('[persona] pref 활동자평균:', { avgQuiz, avgStrum, avgScale, avgCombo, avgProg });

  const now = Date.now();
  const results = [];

  for (const r of rows) {
    const signup = signupMap.get(r.user_id);
    const nickname = signup?.nickname ?? null;

    // engagement_type
    let engagementType = 'insufficient_data';
    let engagementMetrics = null;
    if (r.session_count != null) {
      const daysSinceSignup = signup ? (now - new Date(signup.created_at).getTime()) / 86400000 : WINDOW_DAYS;
      const denom = Math.max(Math.min(daysSinceSignup, WINDOW_DAYS), 1);
      const ratePerWeek = Math.round((r.session_count / denom) * 7 * 1000) / 1000;
      engagementType = classifyEngagement(r.session_count, r.median_duration_min, ratePerWeek);
      engagementMetrics = {
        rate_per_week: ratePerWeek,
        median_duration_min: r.median_duration_min != null ? Math.round(r.median_duration_min * 100) / 100 : null,
        session_count: r.session_count,
      };
    }

    // pref_type
    const quizN = r.quiz_n || 0, strumN = r.strum_n || 0, scaleN = r.scale_n || 0, comboN = r.combo_n || 0, progN = r.prog_n || 0;
    const compScore = PREF_WEIGHTS.quiz * ratio(quizN, avgQuiz) + PREF_WEIGHTS.strum * ratio(strumN, avgStrum);
    const soloScore = ratio(scaleN, avgScale);
    const harmScore = PREF_WEIGHTS.combo * ratio(comboN, avgCombo) + PREF_WEIGHTS.prog * ratio(progN, avgProg);
    let prefType = null;
    const maxPref = Math.max(compScore, soloScore, harmScore);
    if (maxPref > 0) {
      prefType = maxPref === compScore ? 'comping' : maxPref === soloScore ? 'soloing' : 'harmony';
    }
    const prefScores = { comp: Math.round(compScore * 1000) / 1000, solo: Math.round(soloScore * 1000) / 1000, harm: Math.round(harmScore * 1000) / 1000 };

    // skill_type (정답률, 본인 내부 argmax, population 무관)
    const quizAcc = r.quiz_total_sum > 0 ? (r.quiz_correct_sum / r.quiz_total_sum) * 100 : null;
    const scaleAcc = r.scale_score_avg != null ? r.scale_score_avg : null;
    const comboAcc = r.combo_total_sum > 0 ? (r.combo_correct_sum / r.combo_total_sum) * 100 : null;
    const skillCandidates = { comping: quizAcc, soloing: scaleAcc, harmony: comboAcc };
    let skillType = null;
    let skillMax = -1;
    for (const [k, v] of Object.entries(skillCandidates)) {
      if (v != null && v > skillMax) { skillMax = v; skillType = k; }
    }
    const skillScores = {
      comp: quizAcc != null ? Math.round(quizAcc * 10) / 10 : null,
      solo: scaleAcc != null ? Math.round(scaleAcc * 10) / 10 : null,
      harm: comboAcc != null ? Math.round(comboAcc * 10) / 10 : null,
    };

    results.push({
      user_id: r.user_id,
      nickname,
      pref_type: prefType,
      pref_scores: prefScores,
      skill_type: skillType,
      skill_scores: skillScores,
      engagement_type: engagementType,
      engagement_metrics: engagementMetrics,
      computed_at: new Date().toISOString(),
    });
  }

  const counts = { pref: {}, skill: {}, engagement: {} };
  for (const r of results) {
    counts.pref[r.pref_type ?? 'null'] = (counts.pref[r.pref_type ?? 'null'] || 0) + 1;
    counts.skill[r.skill_type ?? 'null'] = (counts.skill[r.skill_type ?? 'null'] || 0) + 1;
    counts.engagement[r.engagement_type] = (counts.engagement[r.engagement_type] || 0) + 1;
  }
  console.log('[persona] 분류 요약:', JSON.stringify(counts, null, 2));

  // ── Supabase UPSERT (500개씩 배치) ──
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < results.length; i += CHUNK) {
    const chunk = results.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_persona_profile?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`UPSERT 실패(offset ${i}): ${await res.text()}`);
    written += chunk.length;
    console.log(`[persona] UPSERT ${written}/${results.length}`);
  }

  console.log('\n[persona] 전체 완료.');
}

main().catch((err) => {
  console.error('[persona] 실패:', err.message);
  process.exit(1);
});
