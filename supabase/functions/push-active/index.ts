// ───────────────────────────────────────────────────────────
// push-active : 5번(적극형) 주간 결산 푸시 전용 디스패처 (cron 호출, 매주 월요일 1회)
//   push-dispatch(코드맞추기 넛지)와 별도 함수로 분리 — 발송 주기가 주 1회로 완전히 다름.
//
//   get_quiz_active_targets(): 5개 훈련(퀴즈/스케일/조합/진행/주법) 중 지난 7일간
//   "타 유저 대비 1.5배 이상" 활동한 훈련이 있는 유저를 대상으로, 배수가 가장 높은
//   훈련 하나(top_training)를 골라 보고. least_training(이번 주 기록이 가장 적은 훈련)은
//   추천형 문구에서 다른 훈련 유도용으로 사용.
//
//   문구 톤은 발송 시점에 50:50 랜덤 픽:
//     continue(하던 것 계속)  → 딥링크는 top_training
//     recommend(다른 것 추천) → 딥링크는 least_training
//   문구엔 배수(N배)만 노출, 실제 완료 횟수는 노출하지 않음(합의사항 — 역산 방지).
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 → FCM 발송 로직 인라인.
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

interface ActiveTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nickname: string | null;
  top_training: string;
  ratio: number;
  least_training: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function fetchActiveTargets(): Promise<ActiveTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_quiz_active_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`active targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchRandomMessage(category: string): Promise<{ id: number; title: string; body: string } | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_random_push_message`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_category: category }),
    });
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows?.[0] ?? null;
  } catch (_) {
    return null;
  }
}

// 훈련 id → 표시명 / 딥링크(각 훈련 메인 목록 페이지로 이동, 특정 레벨 지정 없음)
const TRAINING_NAME: Record<string, string> = {
  quiz: '코드 맞추기',
  scale: '스케일 훈련',
  combo: '코드 조합 훈련',
  progression: '코드 진행 리스트',
  strum: '주법 리듬 훈련',
};

function deeplinkByTraining(training: string): { data: Record<string, string>; deeplink: string } {
  return { data: { trainingHome: training }, deeplink: `${training}:home` };
}

async function logPush(row: {
  id: string; user_id: string; push_type: string;
  category?: string | null; template_id?: number | null;
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

function fillPlaceholders(text: string, t: ActiveTarget, tone: 'continue' | 'recommend'): string {
  let out = text;
  out = out.replaceAll('{닉네임}', t.nickname || '회원');
  out = out.replaceAll('{훈련명}', TRAINING_NAME[t.top_training] ?? t.top_training);
  out = out.replaceAll('{N}', String(t.ratio));
  if (tone === 'recommend') {
    out = out.replaceAll('{추천컨텐츠}', TRAINING_NAME[t.least_training] ?? t.least_training);
  }
  return out;
}

Deno.serve(async (_req) => {
  try {
    const testUserId = new URL(_req.url).searchParams.get('user_id');

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const targetsRaw = await fetchActiveTargets();
    const targets = targetsRaw.filter(t => !testUserId || t.user_id === testUserId);

    let sent = 0, failed = 0, skipped = 0, pruned = 0;

    for (const t of targets) {
      const tone: 'continue' | 'recommend' = Math.random() < 0.5 ? 'continue' : 'recommend';
      // 5배 이상은 놀라움+칭찬 톤(high) 티어로 분리
      const tier = t.ratio >= 5 ? 'high_' : '';
      const category = `quiz_active_${tier}${tone}`;

      const msg = await fetchRandomMessage(category);
      if (!msg) { skipped++; continue; }

      const body = fillPlaceholders(msg.body, t, tone);
      const dest = deeplinkByTraining(tone === 'continue' ? t.top_training : t.least_training);
      const logId = crypto.randomUUID();
      const data = { ...dest.data, entry: 'quiz_active', logId };

      const r = await fcmSend(sa, accessToken, t.token, msg.title, body, data);
      if (r.ok) {
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'quiz_active',
          category, template_id: msg.id, title: msg.title, body, deeplink: dest.deeplink,
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

    return new Response(JSON.stringify({ targets: targets.length, sent, failed, skipped, pruned }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
