// scripts/adhoc-pref-type.js
// 일회성 조사 — pref_type(선호도) 계산 공식 실제 데이터로 검증.
// 컴핑=코드맞추기+주법훈련 / 솔로잉=스케일훈련 / 화성학=코드조합+진행리스트
// 페이지별 population평균 대비 배수로 단위변환 후, 능력별 평균, 유저 본인 안에서 argmax.

const path = require('path');
const fs = require('fs');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'chorditor-50f9f';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const WINDOW_DAYS = 90;

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

const EVENTS = {
  quiz:        'quiz_completed',          // 컴핑 - 코드맞추기
  strum:       'strum_play_started',      // 컴핑 - 주법훈련
  scale:       'scale_test_result',       // 솔로잉 - 스케일훈련
  combo:       'combo_training_completed',// 화성학 - 코드조합훈련
  progression: 'progression_detail_played', // 화성학 - 진행리스트 (progression_played는 리스트페이지 미리듣기라 거의 안 찍힘, 실제 재생행동은 상세페이지 이벤트)
};

const query = `
SELECT
  user_id,
  COUNTIF(event_name = '${EVENTS.quiz}') AS quiz_n,
  COUNTIF(event_name = '${EVENTS.strum}') AS strum_n,
  COUNTIF(event_name = '${EVENTS.scale}') AS scale_n,
  COUNTIF(event_name = '${EVENTS.combo}') AS combo_n,
  COUNTIF(event_name = '${EVENTS.progression}') AS prog_n,
FROM \`chorditor-50f9f.chorditor_analytics.analytics_events\`
WHERE user_id IS NOT NULL
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${WINDOW_DAYS} DAY)
  AND event_name IN ('${EVENTS.quiz}', '${EVENTS.strum}', '${EVENTS.scale}', '${EVENTS.combo}', '${EVENTS.progression}')
GROUP BY user_id
`;

async function main() {
  console.log('[pref] BigQuery 쿼리 실행 중...');
  const [rows] = await bigquery.query({ query });
  console.log(`[pref] 유저 ${rows.length}명 (5개 이벤트 중 하나라도 있는 유저)`);

  // population 평균(전체 유저 기준, 활동 없는 유저도 분모에 포함해야 "평균적으로 다들 이만큼 한다"는 진짜 평균이 됨)
  // 근데 여기 쿼리는 이미 5개 이벤트 중 하나라도 있는 유저만 뽑았음 -> 전체 유저수는 engagement 조사에서 나온 9,763명 사용
  const TOTAL_USERS = 9763;
  const sums = { quiz: 0, strum: 0, scale: 0, combo: 0, prog: 0 };
  for (const r of rows) {
    sums.quiz += r.quiz_n; sums.strum += r.strum_n; sums.scale += r.scale_n;
    sums.combo += r.combo_n; sums.prog += r.prog_n;
  }
  const avg = {
    quiz: sums.quiz / TOTAL_USERS,
    strum: sums.strum / TOTAL_USERS,
    scale: sums.scale / TOTAL_USERS,
    combo: sums.combo / TOTAL_USERS,
    prog: sums.prog / TOTAL_USERS,
  };
  console.log('[pref] population 평균(전체유저 분모):', avg);

  function ratio(n, populationAvg) {
    if (populationAvg === 0) return 0;
    return n / populationAvg;
  }

  const results = rows.map((r) => {
    const compRatio = [ratio(r.quiz_n, avg.quiz), ratio(r.strum_n, avg.strum)];
    const soloRatio = [ratio(r.scale_n, avg.scale)];
    const harmRatio = [ratio(r.combo_n, avg.combo), ratio(r.prog_n, avg.prog)];

    const compScore = compRatio.reduce((a, b) => a + b, 0) / compRatio.length;
    const soloScore = soloRatio.reduce((a, b) => a + b, 0) / soloRatio.length;
    const harmScore = harmRatio.reduce((a, b) => a + b, 0) / harmRatio.length;

    let pref = 'none';
    const max = Math.max(compScore, soloScore, harmScore);
    if (max > 0) {
      if (max === compScore) pref = '컴핑';
      else if (max === soloScore) pref = '솔로잉';
      else pref = '화성학';
    }

    return {
      user_id: r.user_id,
      raw: { quiz: r.quiz_n, strum: r.strum_n, scale: r.scale_n, combo: r.combo_n, prog: r.prog_n },
      score: { comp: Math.round(compScore * 100) / 100, solo: Math.round(soloScore * 100) / 100, harm: Math.round(harmScore * 100) / 100 },
      pref,
    };
  });

  const counts = {};
  for (const r of results) counts[r.pref] = (counts[r.pref] || 0) + 1;
  console.log('[pref] 분류 결과:', counts);

  // 샘플 10명 뽑아서 눈으로 확인 (활동량 다양하게 - score 내림차순 상위/중위/하위 섞어서)
  const sorted = [...results].sort((a, b) => Math.max(b.score.comp, b.score.solo, b.score.harm) - Math.max(a.score.comp, a.score.solo, a.score.harm));
  const sampleIdx = [0, 1, 2, Math.floor(sorted.length * 0.25), Math.floor(sorted.length * 0.5), Math.floor(sorted.length * 0.5) + 1, Math.floor(sorted.length * 0.75), sorted.length - 3, sorted.length - 2, sorted.length - 1];
  const sample = [...new Set(sampleIdx)].map((i) => sorted[i]).filter(Boolean);

  console.log('\n[pref] 샘플 유저 확인:');
  for (const s of sample) {
    console.log(`  ${s.user_id.slice(0, 8)}... | raw(quiz${s.raw.quiz},strum${s.raw.strum},scale${s.raw.scale},combo${s.raw.combo},prog${s.raw.prog}) | score(컴핑${s.score.comp},솔로${s.score.solo},화성${s.score.harm}) → ${s.pref}`);
  }

  const outPath = path.join(__dirname, '..', '.migration-tmp', 'pref-type.json');
  fs.writeFileSync(outPath, JSON.stringify({ results, avg, counts, totalUsers: TOTAL_USERS }));
  console.log(`\n[pref] 저장 완료: ${outPath}`);
}

main().catch((err) => {
  console.error('[pref] 실패:', err.message);
  process.exit(1);
});
