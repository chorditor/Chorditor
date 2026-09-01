// ───────────────────────────────────────────────────────────
// push-broadcast : 공지성 푸시(고정 문구 일괄 발송) 디스패처.
//   push_broadcast 테이블에 대기중(pending)이고 예정시각(scheduled_at) 지난
//   캠페인이 있으면 claim_due_broadcast()로 원자적으로 집어서 대상을 배치(BATCH_SIZE)
//   단위로 발송. 한 틱에 다 못 보내면 status='sending' 유지한 채 다음 틱(5분 후)에
//   이어서 처리(이미 push_send_log에 남은 유저는 get_broadcast_targets가 자동 제외).
//   새 캠페인은 코드 배포 없이 push_broadcast에 행 insert만 하면 됨.
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 →
//   FCM 발송 로직 인라인(self-contained), push-dispatch와 동일 패턴.
//   호출: pg_cron이 5분마다 HTTP POST(push_broadcast.sql 참고).
// ───────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

// 법정 광고성 정보 발송 제한시간대: 21:00~08:00 KST (push-peak-full과 동일 규칙)
function isNightRestricted(): boolean {
  const kstHour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hour12: false }).format(new Date())
  ) % 24;
  return kstHour >= 21 || kstHour < 8;
}

import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
  return JSON.parse(raw) as ServiceAccount;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(sa.private_key, 'RS256');
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`token error ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.access_token as string;
}

async function fcmSend(
  sa: ServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const message = {
    message: {
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'HIGH',
        notification: { channel_id: 'chorditor_push' },
      },
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  return { ok: resp.ok, status: resp.status, text: await resp.text() };
}

interface BroadcastRow {
  id: number;
  title: string;
  body: string;
  min_version_exclude: string | null;
  scheduled_at: string;
  status: string;
}

interface BroadcastTarget {
  user_id: string;
  token: string;
  platform: string | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function claimDueBroadcast(): Promise<BroadcastRow | null> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_due_broadcast`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`claim_due_broadcast error ${resp.status}: ${await resp.text()}`);
  const row = await resp.json();
  return row && row.id ? row as BroadcastRow : null;
}

async function fetchTargets(
  minVersionExclude: string | null,
  broadcastId: number,
  limit: number,
): Promise<BroadcastTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_broadcast_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_min_version_exclude: minVersionExclude, p_broadcast_id: broadcastId, p_limit: limit }),
  });
  if (!resp.ok) throw new Error(`get_broadcast_targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function finishBroadcast(id: number, sent: number, failed: number, done: boolean): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/finish_broadcast`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_id: id, p_sent: sent, p_failed: failed, p_done: done }),
  });
}

async function deleteToken(token: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
}

async function logPush(row: {
  id: string; user_id: string; push_type: string;
  category?: string | null; title: string; body: string; deeplink?: string | null;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_send_log`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (_) { /* 로깅 실패가 발송을 막으면 안 됨 */ }
}

Deno.serve(async (_req) => {
  try {
    if (isNightRestricted()) {
      return new Response(JSON.stringify({ skipped: 'night_restricted' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const broadcast = await claimDueBroadcast();
    if (!broadcast) {
      return new Response(JSON.stringify({ status: 'no due broadcast' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);
    // BATCH_SIZE + 1개 조회해서 남는 게 있는지(마지막 배치인지) 판별
    const fetched = await fetchTargets(broadcast.min_version_exclude, broadcast.id, BATCH_SIZE + 1);
    const isLastBatch = fetched.length <= BATCH_SIZE;
    const targets = fetched.slice(0, BATCH_SIZE);

    let sent = 0, failed = 0, pruned = 0;
    for (const t of targets) {
      const logId = crypto.randomUUID();
      // 딥링크: 홈 진입(기존 winback 키 재사용) — 강제업데이트 체크(checkForceUpdate)가
      // 앱 진입 시 먼저 돌아 구버전 유저는 업데이트 안내로 자연스럽게 막힘.
      const r = await fcmSend(sa, accessToken, t.token, broadcast.title, broadcast.body, {
        entry: 'winback', logId,
      });
      if (r.ok) {
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'broadcast',
          category: `broadcast_${broadcast.id}`, title: broadcast.title, body: broadcast.body,
          deeplink: 'winback',
        });
        sent++;
      } else {
        failed++;
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
          await deleteToken(t.token);
          pruned++;
        }
      }
    }

    await finishBroadcast(broadcast.id, sent, failed, isLastBatch);

    return new Response(JSON.stringify({
      broadcast_id: broadcast.id, targets: targets.length, sent, failed, pruned, done: isLastBatch,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
