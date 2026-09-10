// ───────────────────────────────────────────────────────────
// push-trial-expiry : 1만 다운로드 7일 체험권 — 만료 하루 전(클레임 6일차) 리마인드.
//   get_trial_expiry_targets() 대상에게 고정 문구 1회 발송(push_trial_expiry.sql).
//   pg_cron 이 매일 1회 HTTP POST (push_cron_trial_expiry.sql).
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 → FCM 로직 인라인.
// ───────────────────────────────────────────────────────────

import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';

// A안 확정 문구 (2026-09-11)
const PUSH_TITLE = 'Pro 체험이 곧 끝나요';
const PUSH_BODY  = '7일 체험권이 내일 종료돼요. 남은 시간 동안 마음껏 써보세요!';

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

interface Target {
  user_id: string;
  token: string;
  platform: string | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const rpcHeaders = {
  'apikey': SERVICE_ROLE,
  'Authorization': `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
};

async function fetchTargets(): Promise<Target[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_trial_expiry_targets`, {
    method: 'POST', headers: rpcHeaders, body: '{}',
  });
  if (!resp.ok) throw new Error(`targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// 응답 미확인 시 sent 처리돼 다음 크론에 중복발송 → 반드시 체크.
async function markNotified(userId: string, atIso: string): Promise<void> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_trial_expiry_notified`, {
    method: 'POST', headers: rpcHeaders,
    body: JSON.stringify({ p_user_id: userId, p_at: atIso }),
  });
  if (!resp.ok) throw new Error(`markNotified failed ${resp.status}: ${await resp.text()}`);
}

// 발송 1건 기록(CTR 분모, push_send_log). id를 FCM data.logId로 실어 클릭과 1:1 매칭.
async function logPush(row: {
  id: string; user_id: string; push_type: string;
  title: string; body: string; deeplink?: string | null;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_send_log`, {
      method: 'POST',
      headers: { ...rpcHeaders, 'Prefer': 'return=minimal' },
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

async function acquireLock(): Promise<boolean> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/acquire_trial_expiry_lock`, {
    method: 'POST', headers: rpcHeaders, body: '{}',
  });
  if (!resp.ok) return false;
  return await resp.json();
}

async function releaseLock(): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/release_trial_expiry_lock`, {
      method: 'POST', headers: rpcHeaders, body: '{}',
    });
  } catch (_e) { /* TTL(90초)로 자동 만료 */ }
}

// 법정 광고성 정보 발송 제한시간대: 21:00~08:00 KST
function isNightRestricted(): boolean {
  const kstHour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hour12: false }).format(new Date())
  ) % 24;
  return kstHour >= 21 || kstHour < 8;
}

Deno.serve(async (_req) => {
  let locked = false;
  try {
    const testUserId = new URL(_req.url).searchParams.get('user_id');

    if (isNightRestricted() && !testUserId) {
      return new Response(JSON.stringify({ skipped: 'night_restricted' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    locked = await acquireLock();
    if (!locked) {
      return new Response(JSON.stringify({ skipped: 'already_running' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const targets = (await fetchTargets())
      .filter(t => !testUserId || t.user_id === testUserId);
    let sent = 0, failed = 0, pruned = 0;

    for (const t of targets) {
      try {
        const logId = crypto.randomUUID();
        const r = await fcmSend(
          sa, accessToken, t.token, PUSH_TITLE, PUSH_BODY,
          { entry: 'trial_expiry', logId },
        );
        if (r.ok) {
          await markNotified(t.user_id, new Date().toISOString());
          await logPush({
            id: logId, user_id: t.user_id, push_type: 'trial_expiry',
            title: PUSH_TITLE, body: PUSH_BODY, deeplink: 'trial_expiry',
          });
          sent++;
        } else {
          failed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
            await deleteToken(t.token);
            pruned++;
          }
        }
      } catch (_e) {
        failed++; // markNotified 실패 등 → 다음 크론에 재시도, 나머지 대상은 계속
      }
    }

    return new Response(JSON.stringify({ targets: targets.length, sent, failed, pruned }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (locked) await releaseLock();
  }
});
