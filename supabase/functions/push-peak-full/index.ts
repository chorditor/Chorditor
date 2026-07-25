// ───────────────────────────────────────────────────────────
// push-peak-full : Free 유저 픽(peak) 30 충전완료 알림 디스패처
//   get_peak_full_targets() 로 "지금 꽉 찬" 유저를 골라 FCM 발송.
//   야간(법정 광고성 정보 제한시간대 21:00~08:00 KST)엔 발송 보류 —
//   notified 마킹도 안 함 → 대상은 다음 크론(주간)에 자동 재시도.
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 →
//   FCM 발송 로직 인라인(self-contained), push-dispatch 와 동일 패턴.
//   호출: pg_cron 이 30분마다 HTTP POST (peak 회복 주기와 동일 간격)
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

interface PeakFullTarget {
  user_id: string;
  token: string;
  platform: string | null;
  candidate_full_at: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function fetchTargets(): Promise<PeakFullTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_peak_full_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`peak full targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// push_message_templates(category='peak_full')에서 랜덤 1개 조회. 실패/빈 테이블이면 기본 문구로 폴백.
async function fetchRandomMessage(): Promise<{ title: string; body: string }> {
  const fallback = { title: '픽이 가득 찼어요!', body: '픽 30개 완충! 지금 코드 연습을 시작해보세요.' };
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_random_push_message`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_category: 'peak_full' }),
    });
    if (!resp.ok) return fallback;
    const rows = await resp.json();
    return rows?.[0] ?? fallback;
  } catch (_) {
    return fallback;
  }
}

// 응답 status 미확인 시 실패해도 sent 처리되어 다음 사이클에 중복발송됨 → 반드시 체크.
async function markNotified(userId: string, candidateFullAt: string): Promise<void> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_peak_full_notified`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: userId, p_at: candidateFullAt }),
  });
  if (!resp.ok) throw new Error(`markNotified failed ${resp.status}: ${await resp.text()}`);
}

async function deleteToken(token: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
}

// cron(30분)과 수동 트리거, 또는 실행 지연으로 다음 cron과 겹치는 경우 같은 대상에게
// 중복발송될 수 있음 → 원자적 락으로 동시 실행 자체를 차단(TTL 90초로 자동 만료).
async function acquireLock(): Promise<boolean> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/acquire_peak_full_lock`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) return false; // 락 상태 불확실 → 안전하게 이번 실행은 스킵
  return await resp.json();
}

async function releaseLock(): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/release_peak_full_lock`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch (_e) { /* TTL(90초)로 자동 만료되므로 실패해도 영구 락 아님 */ }
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
    if (isNightRestricted()) {
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

    const targets = await fetchTargets();
    let sent = 0, failed = 0, pruned = 0;

    for (const t of targets) {
      try {
        const msg = await fetchRandomMessage();
        const r = await fcmSend(
          sa, accessToken, t.token,
          msg.title,
          msg.body,
          { entry: 'peak_full' },
        );
        if (r.ok) {
          await markNotified(t.user_id, t.candidate_full_at);
          sent++;
        } else {
          failed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
            await deleteToken(t.token);
            pruned++;
          }
        }
      } catch (_e) {
        // 이 유저 처리 중 예외(markNotified 실패 등) → 다음 사이클에 재시도되도록 실패로만 카운트,
        // 나머지 대상 처리는 중단하지 않음.
        failed++;
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
