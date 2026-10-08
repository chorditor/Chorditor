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

// ── 다국어 푸시 (push_templates_<lang>) ─────────────────────
//   대상 선정·딥링크는 한국어 문구(title=목적지) 기준으로 그대로 결정하고,
//   기기 언어(push_tokens.lang)가 아래 목록에 있으면 보내기 직전에 같은 category 의
//   그 언어 문구로 바꿔 끼움. category ↔ 목적지 훈련은 1:1 이라 title 이 딥링크와 어긋나지 않음.
//   문구를 못 찾으면 한국어 그대로 발송. 언어 추가 = 목록에 코드 추가 + push_templates_<lang> 테이블.
const PUSH_LANGS = ['en', 'ja', 'es'] as const;
type PushLang = typeof PUSH_LANGS[number];

const TRAINING_NAME_I18N: Record<PushLang, Record<string, string>> = {
  en: { quiz: 'Chord Quiz', scale: 'Scale Blocks', progression: 'Chord Loops', strum: 'Strumming Patterns', combo: 'Reharm Quiz' },
  ja: { quiz: 'コードクイズ', scale: 'スケールブロック', progression: 'コード進行', strum: 'ストロークパターン', combo: 'リハモクイズ' },
  es: { quiz: 'Quiz de Acordes', scale: 'Bloques de Escalas', progression: 'Progresiones', strum: 'Patrones de Rasgueo', combo: 'Quiz de Reharm' },
};

// 레벨·장 표기
const L10N: Record<PushLang, {
  level: (n: string) => string; chapter: (n: string) => string;
  levelLabel: (n: string, name: string) => string; challenge: string;
}> = {
  en: { level: n => `Level ${n}`, chapter: n => `Chapter ${n}`, levelLabel: (n, name) => `Level ${n}: ${name}`, challenge: 'Challenge' },
  ja: { level: n => `レベル${n}`, chapter: n => `第${n}章`, levelLabel: (n, name) => `レベル${n}「${name}」`, challenge: 'チャレンジ' },
  es: { level: n => `Nivel ${n}`, chapter: n => `Capítulo ${n}`, levelLabel: (n, name) => `Nivel ${n}: ${name}`, challenge: 'Desafío' },
};

// 기기 토큰 → 언어 (한국어가 아닌 기기만). get_push_token_langs() 는 { token: lang } 객체 한 값 —
// 행 단위 응답은 최대 행수(기본 1000)에서 잘리기 때문. 구버전 앱은 lang 을 안 보내 'ko' 로 남는다.
async function fetchTokenLangs(): Promise<Map<string, PushLang>> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_push_token_langs`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!resp.ok) return new Map();
    const obj = (await resp.json()) as Record<string, string>;
    const out = new Map<string, PushLang>();
    for (const [token, lang] of Object.entries(obj)) {
      if ((PUSH_LANGS as readonly string[]).includes(lang)) out.set(token, lang as PushLang);
    }
    return out;
  } catch (_) {
    return new Map();
  }
}

// 언어·category 별 문구(호출 1회 동안 캐시) → 랜덤 1개
const i18nTemplateCache = new Map<string, { title: string; body: string }[]>();
async function fetchRandomMessageI18n(lang: PushLang, category: string): Promise<{ title: string; body: string } | null> {
  const key = `${lang}:${category}`;
  let rows = i18nTemplateCache.get(key);
  if (!rows) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/push_templates_${lang}?select=title,body&active=is.true&category=eq.${encodeURIComponent(category)}`,
        { headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` } },
      );
      rows = resp.ok ? await resp.json() : [];
    } catch (_) {
      rows = [];
    }
    i18nTemplateCache.set(key, rows!);
  }
  return rows!.length ? rows![Math.floor(Math.random() * rows!.length)] : null;
}

type TplCtx = Record<string, string | null | undefined>;

// placeholder 치환. 닉네임 호칭은 문구에서 대괄호로 감싸 둔다: "[{name}, ]your week…", "[{name}さん、]…"
//   닉네임이 있으면 대괄호만 벗기고, 없으면 대괄호 구간을 통째로 뺀다(언어와 무관).
//   뺀 뒤 문장이 라틴 소문자로 시작하면 대문자로 올린다("your week…" → "Your week…").
function fillTpl(text: string, ctx: TplCtx): string {
  const name = ctx.name || '';
  let out = text.replace(/\[([^\[\]]*\{name\}[^\[\]]*)\]/g, (_m, seg: string) => (name ? seg : ''));
  out = out.replaceAll('{name}', () => name);
  for (const [k, v] of Object.entries(ctx)) {
    if (k !== 'name' && v != null) out = out.replaceAll(`{${k}}`, () => v);
  }
  if (!name) out = out.replace(/^[a-zà-öø-ÿ]/, c => c.toUpperCase());
  return out;
}

async function localize(lang: PushLang, category: string, ctx: TplCtx = {}): Promise<{ title: string; body: string } | null> {
  const msg = await fetchRandomMessageI18n(lang, category);
  if (!msg) return null;
  return { title: fillTpl(msg.title, ctx), body: fillTpl(msg.body, ctx) };
}

// 레벨 표시: "Level 3: Essential Chords" / "レベル3「必須コード」" (챌린지 c1~c3 은 이름만)
function levelLabelI18n(lang: PushLang, levelId: string, names: Record<string, string>): string {
  const name = names[levelId] ?? levelId;
  return levelId.startsWith('c') ? name : L10N[lang].levelLabel(levelId, name);
}
// 스케일 연동형 {level_short}: "Level 3" / "Chapter 3" / 챌린지는 이름
function levelShortI18n(lang: PushLang, type: string, value: string, names: Record<string, string>): string {
  if (type === 'quiz')  return value.startsWith('c') ? (names[value] ?? L10N[lang].challenge) : L10N[lang].level(value);
  if (type === 'combo') return L10N[lang].chapter(value);
  return value;
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
    const tokenLangs = await fetchTokenLangs();

    for (const t of winbackTargets) {
      const logId = crypto.randomUUID();
      const data = { winback: String(t.stage), entry: 'winback', logId };
      let title = t.title, body = t.body;
      const lang = tokenLangs.get(t.token);
      if (lang) {
        const en = await localize(lang, `winback_${t.stage}`);
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
