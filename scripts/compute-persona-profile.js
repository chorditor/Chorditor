// scripts/compute-persona-profile.js
// 프로덕션 배치 — pref_type/skill_type/engagement_type 계산 후 Supabase
// user_persona_profile 테이블에 UPSERT. 30일마다 실행 예정(Task Scheduler 등록은 별도).
//
// persona(5단계)는 이 배치가 절대 안 건드림 — 승급/강등(onboarding.js·shared.js
// _syncPersonaToProfile)이 유일한 쓰기 경로. 여기서 같이 쓰면 30일마다 승급/강등이
// 원상복구되는 사고가 나므로 payload에서 반드시 제외한다(2026-08-31 subscriptions.persona
// 컬럼 자체 삭제와 함께 정리).
//
// pref_type(선호 유형)은 2026-11-01부터 "월별 행동 점수 누적"으로 계산한다(아래 PREF_SCORES, 컬럼 정의는 supabase/user_persona_profile_scores.sql).
// 매 실행마다 지난 달 점수는 total_*에 접어 넣고(이미 접힌 달은 건너뜀 = 같은 달 재실행해도 중복 합산 없음), 이번 달 점수는 cur_*를 덮어쓴다.
// 분류: 이번 달 최고점 5점↑ → 이번 달 / 아니면 최고점 5점↑이었던 가장 최근 달(last_*) / 아니면 total+cur 합계(0 초과) / 전부 0 → unclassified.
// 옛 방식(활동 유저 평균 대비 배수, 최근 30일 점수)은 폐기. skill_type(정답률)·engagement_type(접속 유형)은 그대로.
//
// 사용법: node scripts/compute-persona-profile.js            계산 후 Supabase에 UPSERT
//        node scripts/compute-persona-profile.js --dry-run   계산·분포만 출력하고 아무것도 쓰지 않음
//
// 설계 근거: persona_clustering_pipeline_plan.md 전체 참고.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const WINDOW_DAYS = 90;   // 접속 유형(세션)·정답률 계산 기간. 선호 유형은 아래 PREF_WINDOW_DAYS
const DRY_RUN = process.argv.includes('--dry-run');

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

// ── pref_type: 행동 점수 공식 (2026-11-01 확정) ──
// 영역 점수 = Σ 행동마다 [ min(최근 30일 건수, 월 상한) × 행동 점수 ].  패턴 = 점수가 가장 큰 영역(동점이면 앞쪽=훈련 영역 우선).
// 점수는 "행동 1건에 드는 노력"으로만 정한다(사전 코드 클릭 1회 = 1점 기준). 콘텐츠의 인기·희소성은 반영하지 않는다 —
// 안 하는 콘텐츠일수록 점수를 키우면, 코드맞추기를 훨씬 많이 한 유저가 코드조합 몇 번으로 화성학형이 되는 오류가 난다.
// 노력 근거: 시작→완료 시각 차(퀴즈 40초, 스케일 테스트 23초, 스케일 연습 24초, 코드조합 234초)와 행동 1건 체류시간.
// 시간을 못 재서 판단으로 넣은 값: 노트 생성 5, 시작 이벤트(주법·코드반주·진행 재생) 6. 데이터가 쌓이면 재검증할 것.
const PREF_MIN_SCORE = 5;   // 한 달 최고 영역 점수가 이 이상이면 그 달로 패턴을 정한다
const PREF_SCORES = {      // [이벤트, 행동 점수, 월 상한(건)] — 상한은 이상치 방지용으로 넉넉하게
  comping: [
    ['quiz_completed', 10, 100], ['strum_play_started', 6, 100], ['chordplay_play_started', 6, 100],
  ],
  soloing: [
    ['scale_test_submitted', 6, 100], ['scale_practice_stopped', 6, 100], ['scale_block_played', 1, 100],
    ['scale_listen_played', 1, 100], ['scale_tutorial_completed', 6, 20],
  ],
  harmony: [
    ['progression_detail_played', 6, 100],   // progression_played 아님(리스트페이지 미리듣기라 거의 안 찍힘)
    ['combo_training_completed', 10, 50],    // 옛 코드조합(예선) 레벨 완료
    ['reharmony_level_completed', 10, 50],   // 리하모니 화성학 레벨 완료(건너뛰기 테스트는 별도 이벤트라 제외)
  ],
  toolkit: [
    ['lib_chord_selected', 1, 200], ['lib_chord_played', 1, 100], ['chord_played', 1, 100], ['lib_search_result_selected', 1, 100],
    ['lib_searched', 4, 50], ['lib_fingering_changed', 1, 100], ['lib_finger_num_toggled', 1, 50],
    ['lib_chord_imported', 4, 50], ['lib_image_saved', 4, 50],
    ['chord_build', 0.3, 500], ['chord_applied', 1, 200], ['chord_added', 1, 100], ['chord_slot_placed', 1, 200],
    ['project_created', 5, 50], ['playall_started', 1, 100], ['image_saved', 4, 50], ['palette_dict_opened', 1, 50],
  ],
};
const PREF_AREAS = ['comping', 'soloing', 'harmony', 'toolkit'];
const PREF_EVENTS = [...new Set(Object.values(PREF_SCORES).flat().map((x) => x[0]))];
const PREF_IDX = Object.fromEntries(PREF_EVENTS.map((e, i) => [e, i]));
const PREF_SCORE_KEY = { comping: 'comp', soloing: 'solo', harmony: 'harm', toolkit: 'tool' };   // pref_scores JSON 키

// skill_type(정답률) 계산에 쓰는 이벤트
const EVENTS = {
  quiz: 'quiz_completed',                    // correct_count / total
  scale: 'scale_test_result',                // score_pct
  comboOld: 'combo_training_completed',      // 옛 코드조합 — correct / total
  comboNew: 'reharmony_level_completed',     // 리하모니 화성학 — (q_total - wrong_count) / q_total (본 문제 첫 시도 기준)
};

// ── BigQuery: 세션(접속 유형) + 정답률 합(90일)을 한 번에 조회. 선호 점수는 아래 fetchMonthlyScores 가 따로 월별로 조회 ──
const QUERY_EVENTS = Object.values(EVENTS).map((e) => `'${e}'`).join(', ');
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
    AND event_name IN (${QUERY_EVENTS})
),
per_user_events AS (
  SELECT
    user_id,
    SUM(IF(event_name = '${EVENTS.quiz}', CAST(JSON_EXTRACT_SCALAR(properties, '$.correct_count') AS FLOAT64), 0)) AS quiz_correct_sum,
    SUM(IF(event_name = '${EVENTS.quiz}', CAST(JSON_EXTRACT_SCALAR(properties, '$.total') AS FLOAT64), 0)) AS quiz_total_sum,

    AVG(IF(event_name = '${EVENTS.scale}', CAST(JSON_EXTRACT_SCALAR(properties, '$.score_pct') AS FLOAT64), NULL)) AS scale_score_avg,

    SUM(IF(event_name = '${EVENTS.comboOld}', CAST(JSON_EXTRACT_SCALAR(properties, '$.correct') AS FLOAT64), 0))
      + SUM(IF(event_name = '${EVENTS.comboNew}', CAST(JSON_EXTRACT_SCALAR(properties, '$.q_total') AS FLOAT64) - CAST(JSON_EXTRACT_SCALAR(properties, '$.wrong_count') AS FLOAT64), 0)) AS combo_correct_sum,
    SUM(IF(event_name = '${EVENTS.comboOld}', CAST(JSON_EXTRACT_SCALAR(properties, '$.total') AS FLOAT64), 0))
      + SUM(IF(event_name = '${EVENTS.comboNew}', CAST(JSON_EXTRACT_SCALAR(properties, '$.q_total') AS FLOAT64), 0)) AS combo_total_sum
  FROM raw_events
  GROUP BY user_id
)
SELECT
  COALESCE(s.user_id, pe.user_id) AS user_id,
  s.session_count, s.median_duration_min,
  pe.quiz_correct_sum, pe.quiz_total_sum,
  pe.scale_score_avg,
  pe.combo_correct_sum, pe.combo_total_sum
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

function classifyEngagement(sessionCount, medianDuration, ratePerWeek) {
  if (sessionCount == null || sessionCount < 3) return 'insufficient_data';
  const freqOk = ratePerWeek >= ENGAGEMENT_BASELINE.ratePerWeek;
  const durOk = medianDuration >= ENGAGEMENT_BASELINE.medianDuration;
  if (freqOk && durOk) return 'heavy_user';
  if (freqOk) return 'habitual';
  if (durOk) return 'immersive';
  return 'light_user';
}

const PROFILE_COLS = 'user_id,pref_type,score_month,last_month,'
  + PREF_AREAS.map((a) => `total_${a},last_${a}`).join(',');

const num = (v) => Number(v) || 0;
const r1 = (n) => Math.round(n * 10) / 10;
const zeroScores = () => Object.fromEntries(PREF_AREAS.map((a) => [a, 0]));
const maxOf = (sc) => Math.max(...PREF_AREAS.map((a) => sc[a]));
const argmaxOf = (sc) => PREF_AREAS.find((a) => sc[a] === maxOf(sc));   // 동점이면 앞쪽(훈련 영역) 우선
const kstMonth = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 7);   // 'YYYY-MM' (KST)

// fromMonth(KST) 1일부터의 월별 영역 점수 — { user_id: { 'YYYY-MM': {comping, soloing, harmony, toolkit} } }
async function fetchMonthlyScores(fromMonth) {
  const [rows] = await bigquery.query({ query: `
    SELECT user_id, FORMAT_DATE('%Y-%m', DATE(created_at, 'Asia/Seoul')) AS ym,
      ${PREF_EVENTS.map((e, i) => `COUNTIF(event_name = '${e}') AS p${i}`).join(',\n      ')}
    FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
    WHERE user_id IS NOT NULL AND created_at >= TIMESTAMP('${fromMonth}-01 00:00:00', 'Asia/Seoul')
      AND event_name IN (${PREF_EVENTS.map((e) => `'${e}'`).join(', ')})
    GROUP BY user_id, ym` });
  const map = new Map();
  for (const r of rows) {
    const sc = zeroScores();
    for (const a of PREF_AREAS) sc[a] = PREF_SCORES[a].reduce((s, [ev, pts, cap]) => s + Math.min(num(r['p' + PREF_IDX[ev]]), cap) * pts, 0);
    if (!map.has(r.user_id)) map.set(r.user_id, {});
    map.get(r.user_id)[r.ym] = sc;
  }
  return map;
}

async function main() {
  const nowMonth = kstMonth(Date.now());
  console.log('[persona] BigQuery 쿼리 실행 중 (최근 90일: 세션·정답률)...');
  const [rows] = await bigquery.query({ query });
  const mainMap = new Map(rows.map((r) => [r.user_id, r]));
  console.log(`[persona] 세션·정답률 유저 ${mainMap.size}명`);

  console.log('[persona] Supabase 가입일/닉네임·기존 프로필 조회 중...');
  const signupMap = await fetchSupabasePaginated('subscriptions', 'user_id,created_at,nickname', 'user_id');
  const profileMap = await fetchSupabasePaginated('user_persona_profile', PROFILE_COLS, 'user_id');
  const universe = new Set([...signupMap.keys(), ...profileMap.keys()]);   // 계정이 있는 유저 전부(없는 계정은 FK 때문에 제외)
  const noAccount = [...mainMap.keys()].filter((u) => !universe.has(u)).length;
  console.log(`[persona] 대상 ${universe.size}명 (프로필 행 있음 ${profileMap.size}), 계정 없는 로그 유저 ${noAccount}명 제외`);

  // 월별 점수: 가장 오래 안 접힌 유저의 score_month 부터 이번 달까지
  const starts = [...profileMap.values()].map((p) => p.score_month).filter(Boolean).sort();
  const fromMonth = starts.length && starts[0] < nowMonth ? starts[0] : nowMonth;
  console.log(`[persona] 월별 점수 조회: ${fromMonth} ~ ${nowMonth} (이번 달 ${nowMonth})`);
  const monthly = await fetchMonthlyScores(fromMonth);

  const now = Date.now();
  const results = [];
  const stat = { folded: 0, basis: { current_month: 0, last_month: 0, totals: 0, unclassified: 0 }, kept: 0 };

  for (const uid of universe) {
    const p = profileMap.get(uid);
    const signup = signupMap.get(uid);
    const r = mainMap.get(uid);

    // ── pref_type: 월별 점수 접기 + 분류 ──
    const start = p?.score_month || fromMonth;
    const mm = monthly.get(uid) || {};
    const total = Object.fromEntries(PREF_AREAS.map((a) => [a, num(p?.[`total_${a}`])]));
    let lastMonth = p?.last_month || null;
    let last = Object.fromEntries(PREF_AREAS.map((a) => [a, num(p?.[`last_${a}`])]));
    let foldedAny = false;
    for (const ym of Object.keys(mm).sort()) {
      if (ym < start || ym >= nowMonth) continue;   // 이미 접힌 달 / 이번 달은 건너뜀
      for (const a of PREF_AREAS) total[a] += mm[ym][a];
      foldedAny = true;
      if (maxOf(mm[ym]) >= PREF_MIN_SCORE && (!lastMonth || ym > lastMonth)) { lastMonth = ym; last = { ...mm[ym] }; }
    }
    if (foldedAny) stat.folded++;
    const cur = mm[nowMonth] || zeroScores();
    const sum = Object.fromEntries(PREF_AREAS.map((a) => [a, total[a] + cur[a]]));

    let prefType, basis;
    if (maxOf(cur) >= PREF_MIN_SCORE) { prefType = argmaxOf(cur); basis = 'current_month'; }
    else if (lastMonth) { prefType = argmaxOf(last); basis = 'last_month'; }
    else if (maxOf(sum) > 0) { prefType = argmaxOf(sum); basis = 'totals'; }
    else { prefType = 'unclassified'; basis = 'unclassified'; }
    stat.basis[basis]++;
    // 점수가 전부 0 인데 이미 pref_type 이 있으면(= 온보딩 설문 임시값) 지우지 않는다
    if (prefType === 'unclassified' && p?.pref_type && p.pref_type !== 'unclassified') { prefType = null; stat.kept++; }

    // engagement_type (세션 기반, 90일)
    let engagementType = 'insufficient_data';
    let engagementMetrics = null;
    if (r && r.session_count != null) {
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

    const row = {
      user_id: uid,
      pref_type: prefType,
      pref_scores: Object.fromEntries(PREF_AREAS.map((a) => [PREF_SCORE_KEY[a], r1(cur[a])])),   // 이번 달 점수
      score_month: nowMonth,
      last_month: lastMonth,
      engagement_type: engagementType, ...(engagementType === 'heavy_user' || engagementType === 'habitual' ? { ever_active: true } : {}),   // 한때 잘 쓰던 유저 표시 — true 만 쓰고 지우지 않음(윈백 대상 판정)
      computed_at: new Date().toISOString(),
    };
    for (const a of PREF_AREAS) {
      row[`total_${a}`] = r1(total[a]);
      row[`cur_${a}`] = r1(cur[a]);
      row[`last_${a}`] = r1(last[a]);
    }

    // skill_type (정답률, 본인 내부 argmax, population 무관) — 세션·정답률 조회에 잡힌 유저만
    if (r) {
      const quizAcc = r.quiz_total_sum > 0 ? (r.quiz_correct_sum / r.quiz_total_sum) * 100 : null;
      const scaleAcc = r.scale_score_avg != null ? r.scale_score_avg : null;
      const comboAcc = r.combo_total_sum > 0 ? (r.combo_correct_sum / r.combo_total_sum) * 100 : null;
      const skillCandidates = { comping: quizAcc, soloing: scaleAcc, harmony: comboAcc };
      let skillType = null;
      let skillMax = -1;
      for (const [k, v] of Object.entries(skillCandidates)) {
        if (v != null && v > skillMax) { skillMax = v; skillType = k; }
      }
      row.nickname = signup?.nickname ?? null;
      row.skill_type = skillType;
      row.skill_scores = {
        comp: quizAcc != null ? Math.round(quizAcc * 10) / 10 : null,
        solo: scaleAcc != null ? Math.round(scaleAcc * 10) / 10 : null,
        harm: comboAcc != null ? Math.round(comboAcc * 10) / 10 : null,
      };
      row.engagement_metrics = engagementMetrics;
    }
    results.push(row);
  }

  const counts = { pref: {}, engagement: {} };
  for (const row of results) {
    const eff = row.pref_type ?? profileMap.get(row.user_id)?.pref_type ?? 'null';
    counts.pref[eff] = (counts.pref[eff] || 0) + 1;
    counts.engagement[row.engagement_type] = (counts.engagement[row.engagement_type] || 0) + 1;
  }
  console.log('[persona] 분류 요약:', JSON.stringify(counts, null, 2));
  console.log(`[persona] 이번 달 ${nowMonth} | 지난 달 접힌 유저 ${stat.folded}명 | 분류 근거 ${JSON.stringify(stat.basis)} | 설문 임시값 유지 ${stat.kept}명`);
  if (DRY_RUN) {
    console.log('\n[persona] --dry-run: Supabase에 아무것도 쓰지 않고 종료.');
    return;
  }

  // ── Supabase UPSERT (500개씩 배치) ──
  // 실측 값이 없는 칸(선호 유형 null = 설문 임시값 유지, 접속 유형 insufficient_data)은 payload에서 뺀다.
  // PostgREST는 한 요청 안에서 키가 다르면 빠진 키를 null로 채우므로, 키 구성이 같은 유저끼리 묶어서 보낸다
  const groups = new Map();
  for (const r of results) {
    const row = { ...r };
    if (row.pref_type == null) delete row.pref_type;
    if (row.engagement_type === 'insufficient_data') delete row.engagement_type;
    const sig = Object.keys(row).sort().join(',');
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig).push(row);
  }
  const CHUNK = 500;
  let written = 0;
  for (const rows of groups.values()) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
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
  }

  console.log('\n[persona] 전체 완료.');
}

main().catch((err) => {
  console.error('[persona] 실패:', err.message);
  process.exit(1);
});
