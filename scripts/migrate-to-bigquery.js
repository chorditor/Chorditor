// scripts/migrate-to-bigquery.js
// Supabase의 로그성 테이블을 BigQuery로 이관(백필)한다.
// 사용법: node scripts/migrate-to-bigquery.js
//
// 필요한 것:
//   .env                    → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   gcp-service-account.json → BigQuery 쓰기 권한 있는 서비스계정 키
//
// 흐름: Supabase REST(service_role, 페이지네이션 전체 조회)
//       → 로컬 NDJSON 파일 저장
//       → BigQuery load job(무료, WRITE_TRUNCATE)로 적재

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

// .env에 SUPABASE_URL이 "...supabase.co/rest/v1/"까지 들어있어도, 순수 오리진만 남게 정규화.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROJECT_ID = 'chorditor-50f9f';
const DATASET_ID = 'chorditor_analytics';
const KEY_FILE   = path.join(__dirname, '..', 'gcp-service-account.json');
const OUT_DIR    = path.join(__dirname, '..', '.migration-tmp');

// 이관 대상: [Supabase 테이블명, BigQuery 테이블명, 페이지네이션 정렬 컬럼]
// 정렬 컬럼은 값이 유니크해야 페이지 경계에서 중복/누락이 안 생김(uuid pk 추천).
const TABLES = [
  ['push_send_log',    'push_send_log',    'id'],
  ['push_winback_log', 'push_winback_log', 'id'],
  ['analytics_events', 'analytics_events', 'id'],
];

// Supabase(PostgREST) 서버설정(db-max-rows)이 응답을 1000행으로 하드캡하는 것으로 확인됨.
// 그거보다 크게 요청해도 어차피 1000으로 잘려 오니, "요청보다 적게 왔다=끝"
// 판단이 정확하려면 요청값도 실제 캡과 똑같이 맞춰야 함.
const PAGE_SIZE = 1000;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[migrate] .env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음. 중단.');
  process.exit(1);
}
if (!fs.existsSync(KEY_FILE)) {
  console.error('[migrate] gcp-service-account.json 없음. 중단.');
  process.exit(1);
}

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

/**
 * jsonb 컬럼(properties, ab_variants 등)이 행마다 형태가 다르거나 빈 객체 {}면
 * BigQuery autodetect가 "empty struct" 에러를 냄 → 문자열로 직렬화해서 STRING으로 적재.
 * (배열/원시값/null은 그대로 둠, "순수 object"만 문자열화)
 */
function sanitizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = (v !== null && typeof v === 'object' && !Array.isArray(v))
      ? JSON.stringify(v)
      : v;
  }
  return out;
}

/**
 * Supabase REST에서 테이블 전체를 페이지네이션으로 긁어와 NDJSON으로 바로 스트리밍 저장.
 * (대용량 테이블 대비 — 전체를 메모리 배열에 안 쌓고 페이지 단위로 파일에 씀)
 */
async function fetchAllRowsToFile(table, orderCol, filePath) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let total = 0;
  let firstLine = true;
  let cursor = null; // orderCol의 마지막 값 — OFFSET 대신 이 값 기준으로 다음 페이지를 끊음(인덱스 타서 항상 빠름)

  while (true) {
    const filter = cursor !== null ? `&${orderCol}=gt.${encodeURIComponent(cursor)}` : '';
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=${orderCol}.asc&limit=${PAGE_SIZE}${filter}`,
      {
        headers: {
          apikey:        SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      const msg = await res.text().catch(() => res.status);
      stream.close();
      throw new Error(`[${table}] fetch 실패 (${res.status}): ${msg}`);
    }

    const page = await res.json();
    if (page.length === 0) break;

    for (const row of page) {
      stream.write((firstLine ? '' : '\n') + JSON.stringify(sanitizeRow(row)));
      firstLine = false;
    }
    total += page.length;
    process.stdout.write(`\r[migrate] ${table}: ${total}행 조회됨...`);

    cursor = page[page.length - 1][orderCol]; // 마지막 행의 orderCol 값을 다음 페이지 커서로
    if (page.length < PAGE_SIZE) break; // 서버가 준 게 요청보다 적으면 진짜 끝
  }
  console.log('');

  await new Promise((resolve, reject) => {
    stream.end((err) => (err ? reject(err) : resolve()));
  });

  return total;
}

async function loadIntoBigQuery(bqTable, filePath) {
  const dataset = bigquery.dataset(DATASET_ID);
  const table   = dataset.table(bqTable);

  const [metadata] = await table.load(filePath, {
    sourceFormat:     'NEWLINE_DELIMITED_JSON',
    autodetect:       true,
    writeDisposition: 'WRITE_TRUNCATE', // 재실행해도 중복 안 쌓이게 매번 전체 덮어쓰기
  });

  if (metadata.status.errorResult) {
    throw new Error(`[${bqTable}] load job 실패: ${JSON.stringify(metadata.status.errorResult)}`);
  }
  return metadata.statistics.load;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [srcTable, bqTable, orderCol] of TABLES) {
    console.log(`\n[migrate] ${srcTable} 조회 중...`);
    const filePath = path.join(OUT_DIR, `${srcTable}.ndjson`);
    const count = await fetchAllRowsToFile(srcTable, orderCol, filePath);
    console.log(`[migrate] ${filePath} 저장 완료 (${count}행)`);

    if (count === 0) {
      console.log(`[migrate] ${srcTable}: 데이터 없음, 스킵`);
      continue;
    }

    console.log(`[migrate] BigQuery ${bqTable} 적재 중...`);
    const stats = await loadIntoBigQuery(bqTable, filePath);
    console.log(`[migrate] ${bqTable}: ${stats.outputRows}행 적재 완료`);
  }

  console.log('\n[migrate] 전체 완료.');
}

main().catch((err) => {
  console.error('[migrate] 실패:', err.message);
  process.exit(1);
});
