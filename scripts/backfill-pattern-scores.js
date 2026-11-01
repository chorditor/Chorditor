// scripts/backfill-pattern-scores.js
// 패턴 갱신(백필) — BigQuery 월별 행동 점수를 모아 user_persona_profile 의 점수 컬럼과 pref_type 을 채운다.
// 컬럼 정의·분류 규칙은 supabase/user_persona_profile_scores.sql 머리말 참고 (먼저 그 SQL 을 실행해 둘 것).
//
//   대상: subscriptions 의 모든 유저 + user_persona_profile 에 이미 있는 유저 (행 없는 유저는 새로 만든다. persona 는 비워 둠)
//   기간: 2026-11-01 00:00 KST 이전 전부 (= 10월 31일 23:59:59 까지). 8/29~9/25 로그 유실 구간은 그냥 비어 있는 채로 계산.
//   결과: total_* = 모든 달 합, cur_* = 0 (score_month = 2026-11), last_* = 최고점 5점↑ 이었던 가장 최근 달
//
// 사용법: node scripts/backfill-pattern-scores.js --dry-run   계산·분포만 출력, 아무것도 쓰지 않음
//        node scripts/backfill-pattern-scores.js             Supabase 에 UPSERT

require('dotenv').config();
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: path.join(__dirname, '..', 'gcp-service-account.json'), location: 'asia-northeast3' });
const T = `\`${PROJECT_ID}.chorditor_analytics.analytics_events\``;
const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('[backfill] .env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음. 중단.'); process.exit(1); }

const CUTOFF_KST = '2026-11-01 00:00:00';   // 이 시각 이전 로그만 집계
const NEXT_MONTH = '2026-11';               // cur_* 가 가리키는 달(아직 로그 없음 → 0)
const MIN_SCORE = 5;                        // 한 달 최고점이 이 이상이면 "분류 가능한 달"

// scripts/compute-persona-profile.js 의 PREF_SCORES 와 같은 점수표 — [이벤트, 행동 점수, 월 상한(건)]
const SCORES = {
  comping: [['quiz_completed', 10, 100], ['strum_play_started', 6, 100], ['chordplay_play_started', 6, 100]],
  soloing: [['scale_test_submitted', 6, 100], ['scale_practice_stopped', 6, 100], ['scale_block_played', 1, 100], ['scale_listen_played', 1, 100], ['scale_tutorial_completed', 6, 20]],
  harmony: [['progression_detail_played', 6, 100], ['combo_training_completed', 10, 50], ['reharmony_level_completed', 10, 50]],
  toolkit: [['lib_chord_selected', 1, 200], ['lib_chord_played', 1, 100], ['chord_played', 1, 100], ['lib_search_result_selected', 1, 100], ['lib_searched', 4, 50], ['lib_fingering_changed', 1, 100], ['lib_finger_num_toggled', 1, 50], ['lib_chord_imported', 4, 50], ['lib_image_saved', 4, 50], ['chord_build', 0.3, 500], ['chord_applied', 1, 200], ['chord_added', 1, 100], ['chord_slot_placed', 1, 200], ['project_created', 5, 50], ['playall_started', 1, 100], ['image_saved', 4, 50], ['palette_dict_opened', 1, 50]],
};
const AREAS = ['comping', 'soloing', 'harmony', 'toolkit'];   // 동점이면 앞쪽(훈련 영역) 우선
const EVENTS = [...new Set(Object.values(SCORES).flat().map((x) => x[0]))];
const IDX = Object.fromEntries(EVENTS.map((e, i) => [e, i]));
const r1 = (n) => Math.round(n * 10) / 10;
const zero = () => ({ comping: 0, soloing: 0, harmony: 0, toolkit: 0 });
const maxOf = (sc) => Math.max(...AREAS.map((a) => sc[a]));
const argmax = (sc) => AREAS.find((a) => sc[a] === maxOf(sc));

async function fetchAll(table, select, orderCol) {
  const map = new Map();
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=${orderCol}.asc&limit=1000&offset=${offset}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    if (!res.ok) throw new Error(`${table} 조회 실패: ${await res.text()}`);
    const rows = await res.json();
    for (const r of rows) map.set(r.user_id, r);
    if (rows.length < 1000) break;
  }
  return map;
}

async function main() {
  console.log(`[backfill] BigQuery 월별 행동 건수 집계 중 (${CUTOFF_KST} KST 이전 전부)...`);
  const [rows] = await bigquery.query({ query: `
    SELECT user_id, FORMAT_DATE('%Y-%m', DATE(created_at, 'Asia/Seoul')) AS ym,
      ${EVENTS.map((e, i) => `COUNTIF(event_name = '${e}') AS p${i}`).join(',\n      ')}
    FROM ${T}
    WHERE user_id IS NOT NULL AND created_at < TIMESTAMP('${CUTOFF_KST}', 'Asia/Seoul')
      AND event_name IN (${EVENTS.map((e) => `'${e}'`).join(',')})
    GROUP BY user_id, ym` });

  const months = new Map();   // user_id → { 'YYYY-MM': {영역: 점수} }
  for (const r of rows) {
    const sc = zero();
    for (const a of AREAS) sc[a] = SCORES[a].reduce((s, [e, p, cap]) => s + Math.min(Number(r['p' + IDX[e]]) || 0, cap) * p, 0);
    if (!months.has(r.user_id)) months.set(r.user_id, {});
    months.get(r.user_id)[r.ym] = sc;
  }
  console.log(`[backfill] 행동 점수가 있는 로그인 유저 ${months.size}명, 달: ${[...new Set(rows.map((r) => r.ym))].sort().join(', ')}`);

  console.log('[backfill] Supabase 유저 목록 조회 중...');
  const subs = await fetchAll('subscriptions', 'user_id', 'user_id');
  const profiles = await fetchAll('user_persona_profile', 'user_id,pref_type', 'user_id');
  const universe = new Set([...subs.keys(), ...profiles.keys()]);
  const bqOnly = [...months.keys()].filter((u) => !universe.has(u)).length;
  console.log(`[backfill] 대상 ${universe.size}명 (이미 행 있음 ${profiles.size} / 새로 만들 행 ${universe.size - profiles.size}). 로그만 있고 계정 없는 유저 ${bqOnly}명은 제외`);

  const out = [];
  const stat = { basis: { latest_month: 0, totals: 0, unclassified: 0 }, dist: {}, lowTotals: 0, change: {} };
  for (const uid of universe) {
    const mm = months.get(uid) || {};
    const total = zero();
    for (const sc of Object.values(mm)) for (const a of AREAS) total[a] += sc[a];
    const qual = Object.keys(mm).filter((k) => maxOf(mm[k]) >= MIN_SCORE).sort();
    const lastMonth = qual.length ? qual[qual.length - 1] : null;
    const last = lastMonth ? mm[lastMonth] : zero();

    let pref, basis;
    if (lastMonth) { pref = argmax(last); basis = 'latest_month'; }
    else if (maxOf(total) > 0) { pref = argmax(total); basis = 'totals'; if (maxOf(total) < MIN_SCORE) stat.lowTotals++; }
    else { pref = 'unclassified'; basis = 'unclassified'; }

    stat.basis[basis]++;
    stat.dist[pref] = (stat.dist[pref] || 0) + 1;
    const before = profiles.has(uid) ? (profiles.get(uid).pref_type || 'null') : '(새 행)';
    const key = `${before} → ${pref}`;
    stat.change[key] = (stat.change[key] || 0) + 1;

    out.push({
      user_id: uid, pref_type: pref, score_month: NEXT_MONTH, last_month: lastMonth,
      total_comping: r1(total.comping), total_soloing: r1(total.soloing), total_harmony: r1(total.harmony), total_toolkit: r1(total.toolkit),
      cur_comping: 0, cur_soloing: 0, cur_harmony: 0, cur_toolkit: 0,
      last_comping: r1(last.comping), last_soloing: r1(last.soloing), last_harmony: r1(last.harmony), last_toolkit: r1(last.toolkit),
    });
  }

  const n = out.length;
  const pct = (v) => `${v}명 (${Math.round(v / n * 1000) / 10}%)`;
  console.log(`\n[분포] 전체 ${n}명`);
  for (const k of [...AREAS, 'unclassified']) console.log(`  ${k}: ${pct(stat.dist[k] || 0)}`);
  console.log('[분류 근거]');
  console.log(`  가장 최근 5점↑ 달 기준: ${pct(stat.basis.latest_month)}`);
  console.log(`  누적 합 기준(5점↑ 달 없음): ${pct(stat.basis.totals)}  (그중 합계도 5점 미만: ${stat.lowTotals}명)`);
  console.log(`  미분류(점수 전부 0): ${pct(stat.basis.unclassified)}`);
  console.log('[기존 pref_type → 새 값]');
  for (const [k, v] of Object.entries(stat.change).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

  if (DRY_RUN) { console.log('\n[backfill] --dry-run: 아무것도 쓰지 않고 종료.'); return; }

  // 컬럼이 아직 없으면 여기서 멈춘다
  const probe = await fetch(`${SUPABASE_URL}/rest/v1/user_persona_profile?select=score_month,total_comping&limit=1`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!probe.ok) throw new Error(`점수 컬럼 없음 — supabase/user_persona_profile_scores.sql 먼저 실행할 것: ${await probe.text()}`);

  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < out.length; i += CHUNK) {
    const chunk = out.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_persona_profile?on_conflict=user_id`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`UPSERT 실패(offset ${i}): ${await res.text()}`);
    written += chunk.length;
    console.log(`[backfill] UPSERT ${written}/${n}`);
  }
  console.log('\n[backfill] 완료.');
}

main().catch((e) => { console.error('[backfill] 실패:', e.message); process.exit(1); });
