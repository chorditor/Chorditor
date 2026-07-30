// ───────────────────────────────────────────────────────────
// push-winback : 이탈 유저 윈백 전용 디스패처 (cron 호출)
//   push-dispatch(코드맞추기 넛지)에서 분리됨(2026-07-31) — 윈백은 하루 1회,
//   코드맞추기 넛지는 연령대별로 하루 여러 번 도는 구조라 용도가 달라 분리함.
//   get_winback_targets() — 이탈 유저에게 발송.
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 →
//   FCM 발송 로직 인라인(self-contained).
//   호출: pg_cron 이 매일 1회 HTTP POST
// ───────────────────────────────────────────────────────────

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

interface WinbackTarget {
  user_id: string;
  token: string;
  platform: string | null;
  stage: number;
  title: string;
  body: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function fetchWinbackTargets(): Promise<WinbackTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_winback_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`winback targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function logSent(userId: string, stage: number): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_winback_log`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, stage }),
  });
}

// 발송 1건 기록(CTR 분모, push_send_log). id를 FCM data.logId로 실어보내 클릭과 1:1 매칭.
async function logPush(row: {
  id: string; user_id: string; push_type: string;
  title: string; body: string; deeplink?: string | null;
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

async function deleteToken(token: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
}

Deno.serve(async (_req) => {
  try {
    const testUserId = new URL(_req.url).searchParams.get('user_id');

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const winbackTargets = (await fetchWinbackTargets())
      .filter(t => !testUserId || t.user_id === testUserId);
    let sent = 0, failed = 0, pruned = 0;

    for (const t of winbackTargets) {
      const logId = crypto.randomUUID();
      const data = { winback: String(t.stage), entry: 'winback', logId };
      const r = await fcmSend(sa, accessToken, t.token, t.title, t.body, data);
      if (r.ok) {
        await logSent(t.user_id, t.stage);
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'winback',
          title: t.title, body: t.body, deeplink: `winback:${t.stage}`,
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

    return new Response(JSON.stringify({ targets: winbackTargets.length, sent, failed, pruned }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
