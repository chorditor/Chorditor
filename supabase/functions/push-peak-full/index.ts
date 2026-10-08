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
// 발송 1건 기록(CTR 분모, push_send_log). id를 FCM data.logId로 실어보내 클릭과 1:1 매칭.
async function logPush(row: {
  id: string; user_id: string; push_type: string;
  category?: string | null; template_id?: number | null;
  title: string; body: string;
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

async function fetchRandomMessage(): Promise<{ id: number | null; title: string; body: string }> {
  const fallback = { id: null, title: '픽이 가득 찼어요!', body: '픽 30개 완충! 지금 코드 연습을 시작해보세요.' };
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

// 법정 광고성 정보 발송 제한시간대: 21:00~08:00 — 받는 기기의 현지 시각 기준.
//   시간대 = push_tokens.tz, 없거나 알 수 없는 값이면 Asia/Seoul.
//   get_push_token_tz() = 서울이 아닌 기기만 담은 { token: tz } 객체 한 값(행수 제한에 안 잘림).
async function fetchTokenTz(): Promise<Map<string, string>> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_push_token_tz`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!resp.ok) return new Map();
    return new Map(Object.entries((await resp.json()) as Record<string, string>));
  } catch (_) {
    return new Map();
  }
}

function localHour(tz: string | undefined): number {
  const hourIn = (zone: string) => Number(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).format(new Date())
  ) % 24;
  try {
    return hourIn(tz || 'Asia/Seoul');
  } catch (_) {
    return hourIn('Asia/Seoul');
  }
}

function isNightRestricted(tz?: string): boolean {
  const h = localHour(tz);
  return h >= 21 || h < 8;
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
  let locked = false;
  try {
    locked = await acquireLock();
    if (!locked) {
      return new Response(JSON.stringify({ skipped: 'already_running' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    // 현지 야간(21~08시)인 기기는 이번엔 건너뜀 — notified 표시를 안 하므로 아침 이후 사이클에 발송됨.
    const tokenTz = await fetchTokenTz();
    const targets = (await fetchTargets()).filter(t => !isNightRestricted(tokenTz.get(t.token)));
    let sent = 0, failed = 0, pruned = 0;
    const tokenLangs = await fetchTokenLangs();

    for (const t of targets) {
      try {
        const msg = await fetchRandomMessage();
        const lang = tokenLangs.get(t.token);
        if (lang) {
          const en = await localize(lang, 'peak_full');
          if (en) { msg.title = en.title; msg.body = en.body; msg.id = null; }
        }
        const logId = crypto.randomUUID();
        const r = await fcmSend(
          sa, accessToken, t.token,
          msg.title,
          msg.body,
          { entry: 'peak_full', logId },
        );
        if (r.ok) {
          await markNotified(t.user_id, t.candidate_full_at);
          await logPush({
            id: logId, user_id: t.user_id, push_type: 'peak_full',
            category: 'peak_full', template_id: msg.id,
            title: msg.title, body: msg.body,
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
