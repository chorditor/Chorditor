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

// 지금 현지 시각이 hhmi(예: '2030')인 user_id 집합 (get_push_users_at_local(), push_due_users.sql).
//   시간대 = 기기의 push_tokens.tz, 없으면 Asia/Seoul. isodow: 1=월 … 7=일, null 이면 요일 무관.
async function fetchUsersAtLocal(hhmi: string, isodow: number | null = null): Promise<Set<string>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_push_user_ids_at_local`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_hhmi: hhmi, p_isodow: isodow }),
  });
  if (!resp.ok) throw new Error(`users at local error ${resp.status}: ${await resp.text()}`);
  return new Set((await resp.json()) as string[]); // 배열 한 값 — 행수 제한에 안 잘림
}

// ── 영어 푸시 (push_templates_en) ───────────────────────────
//   기기 언어가 'en'(push_tokens.lang)이면 보내기 직전에 같은 category 의 영어 문구로 바꿔 끼움.
//   영어 문구를 못 찾으면 한국어 그대로 발송. (push-dispatch 의 같은 블록과 동일 규칙)
//   get_push_en_tokens() 는 배열 한 값으로 돌려줌 — 행 단위 응답은 최대 행수(기본 1000)에서 잘리기 때문.
async function fetchEnTokens(): Promise<Set<string>> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_push_en_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!resp.ok) return new Set();
    return new Set((await resp.json()) as string[]);
  } catch (_) {
    return new Set();
  }
}

// category 별 영어 문구(호출 1회 동안 캐시) → 랜덤 1개
const enTemplateCache = new Map<string, { title: string; body: string }[]>();
async function fetchRandomMessageEn(category: string): Promise<{ title: string; body: string } | null> {
  let rows = enTemplateCache.get(category);
  if (!rows) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/push_templates_en?select=title,body&active=is.true&category=eq.${encodeURIComponent(category)}`,
        { headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` } },
      );
      rows = resp.ok ? await resp.json() : [];
    } catch (_) {
      rows = [];
    }
    enTemplateCache.set(category, rows!);
  }
  return rows!.length ? rows![Math.floor(Math.random() * rows!.length)] : null;
}

// 영어 placeholder 치환. 닉네임이 없으면 호칭을 문장에서 빼냄
//   "Hey {name}" → "Hey there" / "{name}, your…" → "Your…"
function fillEn(text: string, ctx: Record<string, string | null | undefined>): string {
  let out = text;
  if (ctx.name) {
    out = out.replaceAll('{name}', ctx.name);
  } else {
    out = out
      .replace(/^Hey \{name\}/, 'Hey there')
      .replace(/, \{name\}/g, '')
      .replace(/^\{name\}, (.)/, (_m, c: string) => c.toUpperCase());
  }
  for (const [k, v] of Object.entries(ctx)) {
    if (k !== 'name' && v != null) out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}

async function localizeEn(
  category: string, ctx: Record<string, string | null | undefined> = {},
): Promise<{ title: string; body: string } | null> {
  const msg = await fetchRandomMessageEn(category);
  if (!msg) return null;
  return { title: fillEn(msg.title, ctx), body: fillEn(msg.body, ctx) };
}

Deno.serve(async (_req) => {
  try {
    const testUserId = new URL(_req.url).searchParams.get('user_id');

    // 현지 20:30 인 유저만 대상(cron 15분 간격). 없으면 바로 종료. ?user_id= 테스트는 시각 무관.
    const dueUsers = testUserId ? null : await fetchUsersAtLocal('2030');
    if (dueUsers && dueUsers.size === 0) {
      return new Response(JSON.stringify({ skipped: 'no_due_users' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const winbackTargets = (await fetchWinbackTargets())
      .filter(t => (!testUserId || t.user_id === testUserId) && (!dueUsers || dueUsers.has(t.user_id)));
    let sent = 0, failed = 0, pruned = 0;
    const enTokens = await fetchEnTokens();

    for (const t of winbackTargets) {
      const logId = crypto.randomUUID();
      const data = { winback: String(t.stage), entry: 'winback', logId };
      let title = t.title, body = t.body;
      if (enTokens.has(t.token)) {
        const en = await localizeEn(`winback_${t.stage}`);
        if (en) { title = en.title; body = en.body; }
      }
      const r = await fcmSend(sa, accessToken, t.token, title, body, data);
      if (r.ok) {
        await logSent(t.user_id, t.stage);
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'winback',
          title, body, deeplink: `winback:${t.stage}`,
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
