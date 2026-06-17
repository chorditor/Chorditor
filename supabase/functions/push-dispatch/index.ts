// ───────────────────────────────────────────────────────────
// push-dispatch : 윈백 + 넛지 자동 발송 디스패처 (cron 호출)
//   1) get_winback_targets() — 이탈 유저 윈백 발송
//   2) get_nudge_targets()   — 1~3일 유휴 유저 넛지 발송
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 →
//   FCM 발송 로직을 이 파일 안에 인라인으로 포함 (self-contained).
//   호출:  pg_cron 이 매일 17:00 KST 에 HTTP POST
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

interface NudgeTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nudge_type: string;
  title: string;
  body: string;
  deeplink_val: string;
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

async function fetchNudgeTargets(): Promise<NudgeTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_nudge_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`nudge targets error ${resp.status}: ${await resp.text()}`);
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

// 토큰 무효(UNREGISTERED/INVALID) 시 정리
async function deleteToken(token: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
}

function nudgeData(nudgeType: string, deeplinkVal: string): Record<string, string> {
  const base: Record<string, string> = { entry: 'nudge' };
  if (nudgeType === 'quiz')        return { ...base, quizLevel: deeplinkVal };
  if (nudgeType === 'scale')       return { ...base, scaleKey: deeplinkVal };
  if (nudgeType === 'progression') return { ...base, progNo: deeplinkVal };
  if (nudgeType === 'strum')       return { ...base, strumLv: deeplinkVal };
  return base;
}

Deno.serve(async (_req) => {
  try {
    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    // ── 윈백 발송 ─────────────────────────────────────────
    const winbackTargets = await fetchWinbackTargets();
    let wSent = 0, wFailed = 0, pruned = 0;
    for (const t of winbackTargets) {
      const data = { winback: String(t.stage), entry: 'winback' };
      const r = await fcmSend(sa, accessToken, t.token, t.title, t.body, data);
      if (r.ok) {
        await logSent(t.user_id, t.stage);
        wSent++;
      } else {
        wFailed++;
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
          await deleteToken(t.token);
          pruned++;
        }
      }
    }

    // ── 넛지 발송 ─────────────────────────────────────────
    const nudgeTargets = await fetchNudgeTargets();
    let nSent = 0, nFailed = 0;
    for (const t of nudgeTargets) {
      const data = nudgeData(t.nudge_type, t.deeplink_val);
      const r = await fcmSend(sa, accessToken, t.token, t.title, t.body, data);
      if (r.ok) {
        nSent++;
      } else {
        nFailed++;
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
          await deleteToken(t.token);
          pruned++;
        }
      }
    }

    return new Response(JSON.stringify({
      winback: { targets: winbackTargets.length, sent: wSent, failed: wFailed },
      nudge:   { targets: nudgeTargets.length,   sent: nSent, failed: nFailed },
      pruned,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
