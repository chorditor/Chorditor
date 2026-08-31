// scripts/incremental-sync.js
// 매일 자동 실행용 — 지난 실행 이후 새로 생긴 행만 BigQuery에 추가한다.
// 사용법: node scripts/incremental-sync.js
//
// 원리: migration_cursor 테이블에 저장된 "마지막으로 보낸 id"보다 큰 행만
//       커서 페이지네이션으로 가져와서 BigQuery에 WRITE_APPEND(추가적재).
//       끝나면 migration_cursor를 이번에 새로 보낸 마지막 id로 갱신.
//
// 필요한 것 (scripts/migrate-to-bigquery.js와 동일):
//   .env                     → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   gcp-service-account.json → BigQuery 쓰기 권한 있는 서비스계정 키
//   supabase/migration_cursor.sql 실행 완료 상태(커서 테이블 존재)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROJECT_ID = 'chorditor-50f9f';
const DATASET_ID = 'chorditor_analytics';
const KEY_FILE   = path.join(__dirname, '..', 'gcp-service-account.json');
const OUT_DIR    = path.join(__dirname, '..', '.migration-tmp');

// 이관 대상: [Supabase 테이블명, BigQuery 테이블명, 페이지네이션 정렬 컬럼]
// 새 테이블 추가할 땐 여기 한 줄만 추가하면 됨(migration_cursor는 스키마 변경 불필요).
const TABLES = [
  ['push_send_log',    'push_send_log',    'id'],
  ['push_winback_log', 'push_winback_log', 'id'],
  ['analytics_events', 'analytics_events', 'id'],
];

const PAGE_SIZE = 1000; // Supabase(PostgREST) 서버설정(db-max-rows) 하드캡과 맞춤

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[sync] .env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음. 중단.');
  process.exit(1);
}
if (!fs.existsSync(KEY_FILE)) {
  console.error('[sync] gcp-service-account.json 없음. 중단.');
  process.exit(1);
}

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

function sanitizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = (v !== null && typeof v === 'object' && !Array.isArray(v))
      ? JSON.stringify(v)
      : v;
  }
  return out;
}

/** migration_cursor에서 이 테이블의 마지막 이관 id를 읽는다. 없으면 null(=처음부터). */
async function getCursor(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/migration_cursor?select=last_id&table_name=eq.${table}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`[${table}] 커서 조회 실패: ${await res.text()}`);
  const rows = await res.json();
  return rows[0]?.last_id ?? null;
}

/** migration_cursor를 이번에 새로 보낸 마지막 id로 갱신(upsert). */
async function setCursor(table, lastId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/migration_cursor?on_conflict=table_name`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ table_name: table, last_id: lastId, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`[${table}] 커서 갱신 실패: ${await res.text()}`);
}

/** cursor 이후의 새 행만 가져와 NDJSON으로 스트리밍 저장. 마지막 id를 반환. */
async function fetchNewRowsToFile(table, orderCol, afterId, filePath) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let cursor = afterId;
  let total = 0;
  let firstLine = true;
  let lastSeenId = afterId;

  while (true) {
    const filter = cursor !== null ? `&${orderCol}=gt.${encodeURIComponent(cursor)}` : '';
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=${orderCol}.asc&limit=${PAGE_SIZE}${filter}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );

    if (!res.ok) {
      stream.close();
      throw new Error(`[${table}] fetch 실패 (${res.status}): ${await res.text().catch(() => res.status)}`);
    }

    const page = await res.json();
    if (page.length === 0) break;

    for (const row of page) {
      stream.write((firstLine ? '' : '\n') + JSON.stringify(sanitizeRow(row)));
      firstLine = false;
    }
    total += page.length;
    lastSeenId = page[page.length - 1][orderCol];
    cursor = lastSeenId;

    if (page.length < PAGE_SIZE) break;
  }

  await new Promise((resolve, reject) => stream.end((err) => (err ? reject(err) : resolve())));
  return { total, lastSeenId };
}

async function appendIntoBigQuery(bqTable, filePath) {
  const table = bigquery.dataset(DATASET_ID).table(bqTable);
  const [metadata] = await table.load(filePath, {
    sourceFormat:     'NEWLINE_DELIMITED_JSON',
    autodetect:       true,
    writeDisposition: 'WRITE_APPEND', // 백필과 다르게 여기는 추가적재 — 기존 데이터 안 지움
  });
  if (metadata.status.errorResult) {
    throw new Error(`[${bqTable}] load job 실패: ${JSON.stringify(metadata.status.errorResult)}`);
  }
  return metadata.statistics.load;
}

/**
 * daily_signups_agg는 개별 행이 아니라 "날짜별 집계"라 커서방식이 안 맞음
 * (매일 값이 재계산되고, 오늘 날짜 행은 계속 값이 바뀜) — 그냥 매번 전체를
 * 통째로 다시 긁어서 WRITE_TRUNCATE로 덮어씀. 74일치라 부담 없음.
 */
async function syncSignupsAgg() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_signups_agg?select=*&order=day.asc`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`daily_signups_agg 조회 실패: ${await res.text()}`);
  const rows = await res.json();
  if (rows.length === 0) {
    console.log('[sync] daily_signups_agg: 데이터 없음, 스킵');
    return;
  }

  const filePath = path.join(OUT_DIR, 'daily_signups.ndjson');
  fs.writeFileSync(filePath, rows.map((r) => JSON.stringify(sanitizeRow(r))).join('\n'), 'utf8');

  const [metadata] = await bigquery.dataset(DATASET_ID).table('daily_signups').load(filePath, {
    sourceFormat: 'NEWLINE_DELIMITED_JSON',
    autodetect: true,
    writeDisposition: 'WRITE_TRUNCATE',
  });
  if (metadata.status.errorResult) {
    throw new Error(`daily_signups load 실패: ${JSON.stringify(metadata.status.errorResult)}`);
  }
  console.log(`[sync] daily_signups: ${metadata.statistics.load.outputRows}행 갱신 완료`);
  fs.unlinkSync(filePath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await syncSignupsAgg();

  for (const [srcTable, bqTable, orderCol] of TABLES) {
    const afterId = await getCursor(srcTable);
    console.log(`[sync] ${srcTable}: 커서=${afterId ?? '(처음부터)'}`);

    const filePath = path.join(OUT_DIR, `${srcTable}.ndjson`);
    const { total, lastSeenId } = await fetchNewRowsToFile(srcTable, orderCol, afterId, filePath);

    if (total === 0) {
      console.log(`[sync] ${srcTable}: 새 행 없음, 스킵`);
      continue;
    }

    console.log(`[sync] ${srcTable}: 새 행 ${total}개 → BigQuery 적재 중...`);
    const stats = await appendIntoBigQuery(bqTable, filePath);
    console.log(`[sync] ${bqTable}: ${stats.outputRows}행 적재 완료`);

    await setCursor(srcTable, lastSeenId);
    console.log(`[sync] ${srcTable}: 커서 갱신 완료 → ${lastSeenId}`);

    fs.unlinkSync(filePath);
  }

  console.log('\n[sync] 전체 완료.');
}

main().catch((err) => {
  console.error('[sync] 실패:', err.message);
  process.exit(1);
});
