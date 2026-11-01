// scripts/incremental-sync.js
// 매일 자동 실행용 — Supabase의 새 행을 BigQuery에 추가하고, 행 수를 실제로 세어서 검증한다.
// 사용법:
//   node scripts/incremental-sync.js              평소 실행(Windows 작업 스케줄러가 매일 실행)
//   node scripts/incremental-sync.js --dry-run     읽기만 하고 아무것도 쓰지 않음(무엇을 할지 출력)
//   node scripts/incremental-sync.js --bootstrap   BigQuery에 테이블이 없으면 <이름>_restored 에서 복사해 만든 뒤 이어서 이관
//   --suffix=_restored                             테스트용: BigQuery 테이블 이름 뒤에 붙임(예: analytics_events_restored)
//
// 2026-11-01 전면 재작성. 옛 방식(id 커서)은 id가 무작위 UUID라 시간순이 아니어서 이관이 거의 안 됐고,
// "id <= 커서"로 판정한 삭제 조건이 이관 안 된 행까지 지웠다(2026-08-28 ~ 09-25 소실).
//
// 원리
//   · 읽기 기준은 시간(created_at / sent_at) + id. 이어받을 지점은 migration_cursor.synced_until(없으면 BigQuery의 마지막 시각).
//   · 이어받는 지점보다 6시간 앞에서 다시 읽고, BigQuery에 이미 있는 id는 빼고 넣는다(늦게 도착한 행·중복 방지).
//   · 적재 후 같은 구간의 행 수를 Supabase와 BigQuery에서 각각 세어 같을 때만 synced_until 을 올린다.
//   · verified_until(삭제 허용 경계)은 거기에 더해 ① BigQuery 테이블에 만료 설정이 없고 ② 행 수가 줄지 않았을 때만 올린다.
//     (삭제 작업은 verified_until 만 믿는다 — supabase/migration_cleanup_v2.sql)
//   · 실행마다 "Supabase 행 수 · BigQuery 행 수 · 적재 행 수"를 출력하고 migration_cursor.last_report 와
//     .migration-tmp/sync-report.log 에 남긴다.
//
// 필요한 것: .env(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), gcp-service-account.json, supabase/migration_cursor_v2.sql 적용

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROJECT_ID = 'chorditor-50f9f';
const DATASET_ID = 'chorditor_analytics';
const LOCATION = 'asia-northeast3';
const KEY_FILE = path.join(__dirname, '..', 'gcp-service-account.json');
const OUT_DIR = path.join(__dirname, '..', '.migration-tmp');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BOOTSTRAP = args.includes('--bootstrap');
const SUFFIX = (args.find((a) => a.startsWith('--suffix=')) || '').slice('--suffix='.length);

const PAGE_SIZE = 1000;                    // Supabase(PostgREST) db-max-rows 하드캡과 맞춤
const LOOKBACK_MS = 6 * 3600 * 1000;       // 이어받는 지점보다 이만큼 앞에서 다시 읽음
const CUTOFF_MARGIN_MS = 2 * 60 * 1000;    // 지금보다 2분 전까지만(막 들어오는 행 제외)

// 이관 대상: Supabase 테이블, 시간 컬럼, BigQuery 테이블
const TABLES = [
  { sb: 'push_send_log',    time: 'sent_at',    bq: 'push_send_log' },
  { sb: 'push_winback_log', time: 'sent_at',    bq: 'push_winback_log' },
  { sb: 'analytics_events', time: 'created_at', bq: 'analytics_events' },
];

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('[sync] .env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음. 중단.'); process.exit(1); }
if (!fs.existsSync(KEY_FILE)) { console.error('[sync] gcp-service-account.json 없음. 중단.'); process.exit(1); }

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE, location: LOCATION });
const SB_HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
const iso = (d) => new Date(d).toISOString();

function sanitizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = (v !== null && typeof v === 'object' && !Array.isArray(v)) ? JSON.stringify(v) : v;
  }
  return out;
}

// ── Supabase ───────────────────────────────────────────────
async function sbCursorRow(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/migration_cursor?select=*&table_name=eq.${table}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`[${table}] migration_cursor 조회 실패: ${await res.text()}`);
  return (await res.json())[0] || null;
}

async function sbSaveCursor(table, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/migration_cursor?on_conflict=table_name`, {
    method: 'POST',
    headers: { ...SB_HEADERS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ table_name: table, updated_at: new Date().toISOString(), ...patch }),
  });
  if (!res.ok) {
    const body = await res.text();
    const hint = /column|schema cache/i.test(body) ? '\n  → supabase/migration_cursor_v2.sql 을 먼저 실행했는지 확인하세요.' : '';
    throw new Error(`[${table}] migration_cursor 갱신 실패: ${body}${hint}`);
  }
}

async function sbCount(table, timeCol, fromIso, toIso) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&${timeCol}=gte.${encodeURIComponent(fromIso)}&${timeCol}=lte.${encodeURIComponent(toIso)}`,
    { headers: { ...SB_HEADERS, Prefer: 'count=exact', Range: '0-0' } }
  );
  if (!res.ok) throw new Error(`[${table}] 행 수 조회 실패: ${await res.text()}`);
  return Number((res.headers.get('content-range') || '').split('/')[1]);
}

// from 이상 ~ to 이하 행을 (시간, id) 순으로 전부 읽어 NDJSON 파일로 저장. 읽은 행 수를 반환.
async function sbDump(table, timeCol, fromIso, toIso, filePath) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let last = null;
  let total = 0;
  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=${timeCol}.asc,id.asc&limit=${PAGE_SIZE}&${timeCol}=lte.${encodeURIComponent(toIso)}`;
    if (!last) url += `&${timeCol}=gte.${encodeURIComponent(fromIso)}`;
    else {
      const t = encodeURIComponent(last.t), id = encodeURIComponent(last.id);
      url += `&or=(${timeCol}.gt.${t},and(${timeCol}.eq.${t},id.gt.${id}))`;
    }
    const res = await fetch(url, { headers: SB_HEADERS });
    if (!res.ok) { stream.close(); throw new Error(`[${table}] 조회 실패 (${res.status}): ${await res.text().catch(() => '')}`); }
    const page = await res.json();
    if (page.length === 0) break;
    for (const row of page) stream.write(JSON.stringify(sanitizeRow(row)) + '\n');
    total += page.length;
    const lr = page[page.length - 1];
    last = { t: lr[timeCol], id: lr.id };
    if (page.length < PAGE_SIZE) break;
  }
  await new Promise((resolve, reject) => stream.end((err) => (err ? reject(err) : resolve())));
  return total;
}

// ── BigQuery ───────────────────────────────────────────────
const bqRef = (name) => `\`${PROJECT_ID}.${DATASET_ID}.${name}\``;

async function bqInfo(name) {
  const table = bigquery.dataset(DATASET_ID).table(name);
  const [exists] = await table.exists();
  if (!exists) return { exists: false };
  const [m] = await table.getMetadata();
  return { exists: true, numRows: Number(m.numRows || 0), expiration: m.expirationTime ? new Date(Number(m.expirationTime)).toISOString() : null };
}

async function bqMaxTime(name, timeCol) {
  const [r] = await bigquery.query({ query: `SELECT MAX(${timeCol}) AS t FROM ${bqRef(name)}` });
  const t = r[0] && r[0].t;
  return t ? new Date(t.value || t) : null;
}

async function bqWindowCounts(name, timeCol, fromIso, toIso) {
  const [r] = await bigquery.query({
    query: `SELECT COUNT(*) AS n, COUNT(DISTINCT id) AS ids FROM ${bqRef(name)} WHERE ${timeCol} >= TIMESTAMP('${fromIso}') AND ${timeCol} <= TIMESTAMP('${toIso}')`,
  });
  return { n: Number(r[0].n), ids: Number(r[0].ids) };
}

async function bqWindowIds(name, timeCol, fromIso, toIso) {
  const [rows] = await bigquery.query({
    query: `SELECT id FROM ${bqRef(name)} WHERE ${timeCol} >= TIMESTAMP('${fromIso}') AND ${timeCol} <= TIMESTAMP('${toIso}')`,
  });
  return new Set(rows.map((r) => r.id));
}

async function bqAppend(name, filePath) {
  // 기존 테이블 스키마를 그대로 쓴다 — autodetect 는 값이 전부 null 인 컬럼(예: template_id)을 STRING 으로 잘못 추측해 적재가 실패했음(2026-11-01)
  const table = bigquery.dataset(DATASET_ID).table(name);
  const [tableMeta] = await table.getMetadata();
  const [meta] = await table.load(filePath, {
    sourceFormat: 'NEWLINE_DELIMITED_JSON',
    schema: tableMeta.schema,
    writeDisposition: 'WRITE_APPEND',
  });
  if (meta.status.errorResult) throw new Error(`[${name}] load job 실패: ${JSON.stringify(meta.status.errorResult)}`);
  return Number(meta.statistics.load.outputRows);
}

// BigQuery에 테이블이 없으면 <이름>_restored 에서 복사해 만든다(--bootstrap)
async function ensureTable(t) {
  const name = t.bq + SUFFIX;
  const info = await bqInfo(name);
  if (info.exists) return info;
  const src = `${t.bq}_restored`;
  const srcInfo = await bqInfo(src);
  if (!BOOTSTRAP) throw new Error(`BigQuery ${name} 테이블이 없습니다. ${srcInfo.exists ? `--bootstrap 으로 ${src} 에서 복사해 만들 수 있습니다.` : '복구 방법을 확인하세요.'}`);
  if (!srcInfo.exists) throw new Error(`BigQuery ${name} 도 ${src} 도 없습니다.`);
  if (DRY_RUN) { console.log(`  [dry-run] ${src} → ${name} 복사 예정(${srcInfo.numRows}행)`); return { exists: true, numRows: srcInfo.numRows, expiration: null, dry: true }; }
  console.log(`  ${src} → ${name} 복사 중...`);
  const [job] = await bigquery.dataset(DATASET_ID).table(src).createCopyJob(bigquery.dataset(DATASET_ID).table(name), { writeDisposition: 'WRITE_EMPTY' });
  await new Promise((resolve, reject) => job.on('complete', resolve).on('error', reject));
  const created = await bqInfo(name);
  if (created.numRows !== srcInfo.numRows) throw new Error(`복사 행 수 불일치: ${src} ${srcInfo.numRows} vs ${name} ${created.numRows}`);
  console.log(`  ✔ ${name} 생성 완료 (${created.numRows}행, 원본과 일치)`);
  return created;
}

// ── 테이블 하나 이관 + 검증 ─────────────────────────────────
async function syncTable(t) {
  const bqName = t.bq + SUFFIX;
  console.log(`\n=== ${t.sb} → ${bqName} ===`);
  const before = await ensureTable(t);
  const cursor = await sbCursorRow(t.sb);

  // 이어받을 지점: 기록된 synced_until, 없으면 BigQuery가 가진 마지막 시각
  let syncedUntil = cursor && cursor.synced_until ? new Date(cursor.synced_until) : null;
  let origin = '기록된 synced_until';
  if (!syncedUntil) {
    syncedUntil = await bqMaxTime(bqName, t.time);
    origin = 'BigQuery의 마지막 시각(처음 실행)';
    if (!syncedUntil) throw new Error(`[${t.sb}] BigQuery가 비어 있어 이어받을 지점이 없습니다. 백필이 필요합니다.`);
  }
  const from = iso(syncedUntil.getTime() - LOOKBACK_MS);
  const cutoff = iso(Date.now() - CUTOFF_MARGIN_MS);
  console.log(`  이어받는 지점: ${iso(syncedUntil)} (${origin}) | 읽는 구간: ${from} ~ ${cutoff}`);

  // 읽기 + BigQuery에 이미 있는 id 제외
  const dumpPath = path.join(OUT_DIR, `${t.sb}.sync.ndjson`);
  const loadPath = path.join(OUT_DIR, `${t.sb}.sync.load.ndjson`);
  const read = await sbDump(t.sb, t.time, from, cutoff, dumpPath);
  const existing = await bqWindowIds(bqName, t.time, from, cutoff);
  const lines = fs.readFileSync(dumpPath, 'utf8').split('\n').filter(Boolean);
  const out = fs.createWriteStream(loadPath, { encoding: 'utf8' });
  let toLoad = 0;
  for (const line of lines) {
    if (existing.has(JSON.parse(line).id)) continue;
    out.write(line + '\n');
    toLoad++;
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  console.log(`  Supabase에서 읽음: ${read}행 | BigQuery에 이미 있음: ${read - toLoad}행 | 새로 넣을 행: ${toLoad}행`);

  // 적재
  let loaded = 0;
  if (toLoad > 0) {
    if (DRY_RUN) console.log(`  [dry-run] ${toLoad}행 적재 건너뜀`);
    else loaded = await bqAppend(bqName, loadPath);
  }
  fs.unlinkSync(dumpPath);
  fs.unlinkSync(loadPath);

  // 검증: 같은 구간 행 수를 양쪽에서 세어 비교
  const sbN = await sbCount(t.sb, t.time, from, cutoff);
  const bq = await bqWindowCounts(bqName, t.time, from, cutoff);
  const after = DRY_RUN ? before : await bqInfo(bqName);
  const countsMatch = sbN === bq.ids;
  const dupes = bq.n - bq.ids;
  const prevRows = cursor && cursor.bq_row_count != null ? Number(cursor.bq_row_count) : null;
  const shrank = prevRows != null && after.numRows < prevRows;
  const hasExpiry = !!after.expiration;

  const problems = [];
  if (!countsMatch) problems.push(`구간 행 수 불일치(Supabase ${sbN} ≠ BigQuery ${bq.ids})`);
  if (shrank) problems.push(`BigQuery 행 수가 줄었음(${prevRows} → ${after.numRows})`);
  const ok = countsMatch && !shrank;
  const deleteSafe = ok && !hasExpiry;
  if (hasExpiry) problems.push(`BigQuery 테이블 만료 설정 있음(${after.expiration}) — 삭제 허용 경계를 올리지 않음`);

  console.log(`  ── 검증 ──`);
  console.log(`  구간 행 수   Supabase ${sbN} | BigQuery ${bq.ids}${dupes > 0 ? ` (중복 ${dupes})` : ''}  ${countsMatch ? '✔ 일치' : '✖ 불일치'}`);
  console.log(`  테이블 총 행  BigQuery ${before.numRows} → ${after.numRows} (${after.numRows - before.numRows >= 0 ? '+' : ''}${after.numRows - before.numRows})  ${shrank ? '✖ 줄었음' : '✔'}`);
  console.log(`  만료 설정    ${hasExpiry ? '⚠ 있음 ' + after.expiration : '✔ 없음'}`);
  console.log(`  삭제 허용 경계(verified_until): ${deleteSafe ? iso(cutoff) + ' 로 갱신' : '갱신 안 함'}`);
  if (problems.length) console.log(`  ⚠ ${problems.join(' / ')}`);

  const report = {
    run_at: new Date().toISOString(), dry_run: DRY_RUN, window_from: from, window_to: cutoff,
    supabase_count: sbN, bq_count: bq.ids, loaded, bq_rows_before: before.numRows, bq_rows_after: after.numRows,
    counts_match: countsMatch, shrank, has_expiry: hasExpiry, delete_safe: deleteSafe, problems,
  };

  if (!DRY_RUN) {
    const patch = { last_report: report, bq_row_count: after.numRows };
    if (ok) patch.synced_until = cutoff;
    if (deleteSafe) { patch.verified_until = cutoff; patch.verified_at = new Date().toISOString(); }
    await sbSaveCursor(t.sb, patch);
  }
  return { table: t.sb, ok, deleteSafe, report };
}

// ── daily_signups_agg: 날짜별 집계라 통째로 덮어씀(WRITE_TRUNCATE) ──
async function syncSignupsAgg() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_signups_agg?select=*&order=day.asc`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`daily_signups_agg 조회 실패: ${await res.text()}`);
  const rows = await res.json();
  if (rows.length === 0) { console.log('[sync] daily_signups_agg: 데이터 없음, 스킵'); return; }
  if (DRY_RUN) { console.log(`[sync] [dry-run] daily_signups: ${rows.length}행 갱신 예정`); return; }
  const filePath = path.join(OUT_DIR, 'daily_signups.ndjson');
  fs.writeFileSync(filePath, rows.map((r) => JSON.stringify(sanitizeRow(r))).join('\n'), 'utf8');
  const [metadata] = await bigquery.dataset(DATASET_ID).table('daily_signups').load(filePath, {
    sourceFormat: 'NEWLINE_DELIMITED_JSON', autodetect: true, writeDisposition: 'WRITE_TRUNCATE',
  });
  if (metadata.status.errorResult) throw new Error(`daily_signups load 실패: ${JSON.stringify(metadata.status.errorResult)}`);
  console.log(`[sync] daily_signups: ${metadata.statistics.load.outputRows}행 갱신 완료`);
  fs.unlinkSync(filePath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[sync] 시작 ${new Date().toISOString()}${DRY_RUN ? ' (dry-run: 아무것도 쓰지 않음)' : ''}${SUFFIX ? ` | BigQuery 테이블 접미사 ${SUFFIX}` : ''}`);

  await syncSignupsAgg();

  const results = [];
  let failed = false;
  for (const t of TABLES) {
    try { results.push(await syncTable(t)); }
    catch (err) { failed = true; console.error(`[sync] ✖ ${t.sb} 실패: ${err.message}`); results.push({ table: t.sb, ok: false, deleteSafe: false, error: err.message }); }
  }

  console.log('\n[sync] ═══ 요약 ═══');
  for (const r of results) {
    if (r.error) console.log(`  ✖ ${r.table}: 실패 — ${r.error}`);
    else console.log(`  ${r.ok ? '✔' : '✖'} ${r.table}: 구간 Supabase ${r.report.supabase_count} / BigQuery ${r.report.bq_count} | 총 ${r.report.bq_rows_before} → ${r.report.bq_rows_after}행 | 삭제 허용 경계 ${r.deleteSafe ? '갱신' : '유지'}`);
  }
  fs.appendFileSync(path.join(OUT_DIR, 'sync-report.log'), JSON.stringify({ at: new Date().toISOString(), dry_run: DRY_RUN, results }) + '\n');
  if (failed || results.some((r) => !r.ok)) { console.error('[sync] 일부 실패 또는 검증 불일치 — 위 내용 확인'); process.exit(1); }
  console.log('[sync] 전체 완료.');
}

main().catch((err) => { console.error('[sync] 실패:', err.message); process.exit(1); });
