// ───────────────────────────────────────────────────────────
// push-dispatch : 중단인지형 + 성적형/연동형 + 넛지 자동 발송 디스패처 (cron 호출)
//   윈백은 push-winback 함수로 분리됨(2026-07-31) — 윈백은 하루 1회.
//   이 함수는 유저별 접속 시간대 패턴(16시조/2045조, get_user_time_slot())으로 개인화되어
//   하루 1인 1건만 발송됨 — cron이 16:00엔 ?time_slot=1600, 20:45엔 ?time_slot=2045로 호출,
//   유저는 자기 슬롯일 때만 대상에 포함되므로 겹치지 않음.
//   get_user_time_slot()은 매 호출 시 analytics_events를 다시 집계하므로, 유저의 접속
//   패턴이 바뀌면(예: 2045조였다가 16시대 위주로 전환) 자동으로 다음 호출부터 그룹이 갱신됨
//   (별도 캐시/저장 없음 — 항상 최신 패턴 기준).
//
//   1순위) get_quiz_abandoned_targets() + get_scale_abandoned_targets()
//          — 중단인지형, 퀴즈·스케일 동등 경쟁(2026-07-31 스케일 추가) 유저당 랜덤 1개
//   2순위) get_quiz_pattern_targets() + get_quiz_link_targets()
//          + get_scale_pattern_targets() + get_scale_link_targets()
//          — 성적형(누적평균 기준 레벨업/챌린지·재정비)과 연동형(마지막 세션 기준 →
//            나머지 훈련 랜덤 추천)을 퀴즈·스케일 4개 소스 동등 경쟁, 유저당 랜덤 1개
//   3순위) get_nudge_targets()          — 위 조건에 아무것도 해당 안 되는 유저 캐치올.
//          유휴 0~2일(3일↑은 push-winback 담당). 마지막 훈련 재유도(repeat) /
//          페르소나별 추천(persona, push_nudge_persona 테이블) 50:50.
//
//   같은 호출 안에서 하루 1인 1건: 위 순서대로 우선순위 적용, 이미 발송된 user_id는
//   다음 단계에서 스킵(sentUsers Set).
//
//   ⚠️ Supabase CLI 미사용 → Dashboard 에디터 직접 붙여넣기 배포.
//   Dashboard 배포는 단일 파일이라 ../_shared/fcm.ts import 불가 →
//   FCM 발송 로직을 이 파일 안에 인라인으로 포함 (self-contained).
//   호출:  pg_cron 이 매일 16:00 KST / 20:45 KST 에 각각 HTTP POST
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

interface NudgeTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nickname: string | null;
  last_training: string | null;   // 가장 최근 활동한 훈련(없으면 null)
  rec_training: string;           // 페르소나 추천 훈련
  rec_levels: string;             // 딥링크에 넘길 레벨값(콤마 다중값 가능)
  rec_difficulty: string | null;  // combo 전용 low/high
}

interface QuizPatternTarget {
  user_id: string;
  token: string;
  platform: string | null;
  category: 'quiz_level_up' | 'quiz_challenge' | 'quiz_reinforce';
  level_id: string;
  next_level_id: string | null;
  challenge_id: string | null;
}

interface QuizAbandonedTarget {
  user_id: string;
  token: string;
  platform: string | null;
  level_id: string;
}

interface QuizLinkTarget {
  user_id: string;
  token: string;
  platform: string | null;
  level_id: string;
}

interface ScaleAbandonedTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nickname: string | null;
  scale_key: string;
}

interface ScaleLinkTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nickname: string | null;
  scale_key: string;
}

interface ScalePatternTarget {
  user_id: string;
  token: string;
  platform: string | null;
  nickname: string | null;
  category: 'scale_level_up' | 'scale_reinforce';
  scale_key: string;
  next_scale_key: string | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

async function fetchQuizPatternTargets(): Promise<QuizPatternTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_quiz_pattern_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`quiz pattern targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchQuizAbandonedTargets(): Promise<QuizAbandonedTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_quiz_abandoned_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`quiz abandoned targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchQuizLinkTargets(): Promise<QuizLinkTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_quiz_link_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`quiz link targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchScaleAbandonedTargets(): Promise<ScaleAbandonedTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_scale_abandoned_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`scale abandoned targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchScaleLinkTargets(): Promise<ScaleLinkTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_scale_link_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`scale link targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function fetchScalePatternTargets(): Promise<ScalePatternTarget[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_scale_pattern_targets`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`scale pattern targets error ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// level_id → 표시이름 맵 + 플레이 가능한 레벨 집합 (quiz_level_names 테이블, 소프트코딩)
//   playable=false 는 아직 미구현 레벨(9·10·11·c3) — 딥링크 대상에서 제외해야 함.
async function fetchLevelNames(): Promise<{ names: Record<string, string>; playable: Set<string> }> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/quiz_level_names?select=level_id,display_name,playable`, {
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
  if (!resp.ok) throw new Error(`quiz level names error ${resp.status}: ${await resp.text()}`);
  const rows: { level_id: string; display_name: string; playable: boolean }[] = await resp.json();
  return {
    names: Object.fromEntries(rows.map(r => [r.level_id, r.display_name])),
    playable: new Set(rows.filter(r => r.playable).map(r => r.level_id)),
  };
}

// scale_key → 표시이름 맵 (scale_level_names 테이블, 소프트코딩)
async function fetchScaleLevelNames(): Promise<Record<string, string>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/scale_level_names?select=scale_key,display_name`, {
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
  if (!resp.ok) throw new Error(`scale level names error ${resp.status}: ${await resp.text()}`);
  const rows: { scale_key: string; display_name: string }[] = await resp.json();
  return Object.fromEntries(rows.map(r => [r.scale_key, r.display_name]));
}

// ── 연동형(3번) 레벨 → 추천 콘텐츠 딥링크 매핑 ──────────────────
const SCALE_KEY_BY_LEVEL: Record<number, string> = {
  1: 'major', 2: 'pentatonic', 3: 'blues', 4: 'natural-minor', 5: 'harmonic-minor',
  6: 'secondary-iv', 7: 'secondary-v', 8: 'secondary-ii', 9: 'secondary-vi', 10: 'secondary-iii',
};
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ⚠️ 불변식: 푸시 목적지는 오직 title 에서만 파생된다.
//   push_message_templates.title = 그 문구가 유도하는 훈련 = 딥링크 대상.
//   목적지를 title 이외의 값(카테고리·랜덤 등)으로 정하면 타이틀과 실제 이동 화면이
//   어긋나므로, 딥링크 생성은 반드시 이 함수 한 곳만 거칠 것.
//   quizLevel = 코드맞추기 레벨(콘텐츠 난이도 매핑 기준), quizTarget = '코드 맞추기'일 때 이동할 레벨.
//   보낼 수 없는 조합(예: 레벨9+ 주법)은 null 반환.
function deeplinkByTitle(
  title: string,
  quizLevel: number,
  quizTarget: string | null,
): { data: Record<string, string>; deeplink: string } | null {
  if (title === '코드 맞추기') {
    const lv = quizTarget ?? String(quizLevel);
    return { data: { quizLevel: lv }, deeplink: `quiz:${lv}` };
  }
  if (title === '스케일 훈련') {
    const scaleKey = resolveScaleKey(quizLevel);
    return { data: { scaleKey }, deeplink: `scale:${scaleKey}` };
  }
  if (title === '코드 진행 리스트') {
    const progNo = resolveProgressionNo(quizLevel);
    return { data: { progNo }, deeplink: `progression:${progNo}` };
  }
  if (title === '주법 리듬 훈련') {
    const strumLv = resolveStrumLv(quizLevel);
    if (strumLv === null) return null; // 레벨9+ 매핑 없음
    return { data: { strumLv }, deeplink: `strum:${strumLv}` };
  }
  if (title === '코드 조합 훈련') {
    const comboChapter = resolveComboChapter(quizLevel);
    return { data: { comboChapter, comboDifficulty: 'low' }, deeplink: `combo:${comboChapter}` };
  }
  return null;
}

// title 별 후보 category (연동형). '코드 맞추기'는 유저 자격에 따라 동적으로 결정됨.
const LINK_TITLE_CATEGORY: Record<string, string> = {
  '스케일 훈련':      'quiz_link_scale',
  '코드 진행 리스트': 'quiz_link_progression',
  '주법 리듬 훈련':   'quiz_link_strum',
  '코드 조합 훈련':   'quiz_link_combo',
};

function resolveScaleKey(quizLevel: number): string {
  const lv =
    quizLevel <= 2 ? 1 :
    quizLevel <= 5 ? pickRandom([1, 2, 3, 4]) :
    quizLevel <= 8 ? pickRandom([1, 2, 3, 4, 5]) :
    pickRandom([5, 6, 7, 8, 9, 10]);
  return SCALE_KEY_BY_LEVEL[lv];
}
function resolveProgressionNo(quizLevel: number): string {
  return quizLevel <= 4 ? '1' : quizLevel <= 8 ? '2' : '2,4';
}
function resolveStrumLv(quizLevel: number): string | null {
  return quizLevel <= 2 ? '1' : quizLevel <= 5 ? '2' : quizLevel <= 8 ? '3,4,5' : null;
}
function resolveComboChapter(quizLevel: number): string {
  return quizLevel <= 5 ? pickRandom(['1', '2'])
    : quizLevel <= 8 ? pickRandom(['1', '2', '3', '4'])
    : pickRandom(['3', '4', '5', '6', '7', '8']);
}

// ── 스케일 연동형(3번) 레벨(1~25) → 추천 콘텐츠 딥링크 매핑 ──────
//   진행/주법은 문구에 레벨 언급이 없어 전체 범위로 고정(합의사항, 2026-07-31).
const SCALE_LINK_TITLE_CATEGORY: Record<string, string> = {
  '코드 맞추기':      'scale_link_quiz',
  '코드 진행 리스트': 'scale_link_progression',
  '주법 리듬 훈련':   'scale_link_strum',
  '코드 조합 훈련':   'scale_link_combo',
};

function resolveQuizFromScaleLevel(scaleLevel: number): string {
  return scaleLevel <= 5 ? pickRandom(['1', '2', '3', '4'])
    : scaleLevel <= 10 ? pickRandom(['3', '4', '5', '6', '7', '8'])
    : pickRandom(['6', '7', '8', 'c1', 'c2']);
}
function resolveComboFromScaleLevel(scaleLevel: number): string {
  return scaleLevel <= 5 ? pickRandom(['1', '2'])
    : scaleLevel <= 10 ? pickRandom(['1', '2', '3', '4'])
    : pickRandom(['3', '4', '5', '6', '7', '8']);
}
// 문구의 {레벨} 자리에 들어갈 표시값(퀴즈/조합만 레벨 언급, 진행/주법은 미사용)
function scaleLinkLevelText(chosenType: string, value: string): string {
  if (chosenType === 'quiz')  return value.startsWith('c') ? `${value} 챌린지` : `레벨${value}`;
  if (chosenType === 'combo') return `${value}장`;
  return value;
}

// 스케일 연동형(3번) 전용 딥링크. quiz/combo 는 스케일 레벨 기준 버킷(위 두 함수),
// 진행/주법은 레벨 무관 전체 추천(콤마 다중값, 클라이언트가 랜덤 선택).
function scaleLinkDeeplink(
  title: string, scaleLevel: number,
): { data: Record<string, string>; deeplink: string; levelText: string } | null {
  if (title === '코드 맞추기') {
    const lv = resolveQuizFromScaleLevel(scaleLevel);
    return { data: { quizLevel: lv }, deeplink: `quiz:${lv}`, levelText: scaleLinkLevelText('quiz', lv) };
  }
  if (title === '코드 진행 리스트') {
    return { data: { progNo: '1,2,4' }, deeplink: 'progression:1,2,4', levelText: '' };
  }
  if (title === '주법 리듬 훈련') {
    return { data: { strumLv: '1,2,3' }, deeplink: 'strum:1,2,3', levelText: '' };
  }
  if (title === '코드 조합 훈련') {
    const chapter = resolveComboFromScaleLevel(scaleLevel);
    return {
      data: { comboChapter: chapter, comboDifficulty: 'low' },
      deeplink: `combo:${chapter}`, levelText: scaleLinkLevelText('combo', chapter),
    };
  }
  return null;
}

// 스케일 자신을 목적지로 하는 문구(중단인지형/성적형) 전용 — scale_key 를 이미 알고 있으므로
// deeplinkByTitle 의 quizLevel 기반 버킷 로직을 거치지 않고 직접 구성.
function scaleOwnDest(scaleKey: string): { data: Record<string, string>; deeplink: string } {
  return { data: { scaleKey }, deeplink: `scale:${scaleKey}` };
}

// 스케일 표시명 — '메이저 스케일' 처럼 이름 자체로 레벨을 특정하기 충분해 따옴표만 감쌈
// (퀴즈의 levelLabel 은 'N - 이름' 형식이지만 스케일은 이름이 이미 레벨을 특정함).
function scaleLabel(scaleKey: string, names: Record<string, string>): string {
  return `'${names[scaleKey] ?? scaleKey}'`;
}

function fillScalePlaceholders(
  text: string, scaleKey: string, nextScaleKey: string | null,
  nickname: string | null, names: Record<string, string>,
): string {
  let out = text;
  out = out.replaceAll('{스케일명}', scaleLabel(scaleKey, names));
  out = out.replaceAll('{닉네임}', nickname || '회원');
  if (nextScaleKey) out = out.replaceAll('{다음레벨명}', scaleLabel(nextScaleKey, names));
  return out;
}

// user_id → 접속 시간대 그룹('1600'/'2045', get_user_time_slot()). time_slot 필터용.
async function fetchTimeSlots(): Promise<Record<string, '1600' | '2045'>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_time_slot`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) throw new Error(`time slot error ${resp.status}: ${await resp.text()}`);
  const rows: { user_id: string; time_slot: '1600' | '2045' }[] = await resp.json();
  return Object.fromEntries(rows.map(r => [r.user_id, r.time_slot]));
}

// 발송 1건 기록(CTR 분모). id를 FCM data.logId로 실어보내 클릭과 1:1 매칭.
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

// title 균등 배분 문구 조회(get_balanced_push_message).
//   ① 자격 있는 title 중 균등 랜덤 1개 → ② 그 title 안에서 행 랜덤.
//   문구 개수가 많은 훈련으로 발송이 쏠리는 것을 방지.
async function fetchBalancedMessage(
  titles: string[], categories: string[],
): Promise<{ id: number; category: string; title: string; body: string } | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_balanced_push_message`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_titles: titles, p_categories: categories }),
    });
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows?.[0] ?? null;
  } catch (_) {
    return null;
  }
}

// push_message_templates(category)에서 랜덤 1개 조회. 실패/빈 카테고리면 null(스킵).
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

// 볼드 미지원(플레인 알림 텍스트) 대신 '레벨N - 이름' 작은따옴표 강조 형식
function levelLabel(levelId: string, names: Record<string, string>): string {
  const name = names[levelId] ?? levelId;
  return `'레벨${levelId} - ${name}'`;
}

function fillQuizPlaceholders(text: string, t: QuizPatternTarget, names: Record<string, string>): string {
  let out = text;
  out = out.replaceAll('{레벨명}', levelLabel(t.level_id, names));
  if (t.next_level_id) out = out.replaceAll('{다음레벨명}', levelLabel(t.next_level_id, names));
  if (t.challenge_id)  out = out.replaceAll('{챌린지명}', names[t.challenge_id] ?? '챌린지');
  return out;
}

// 토큰 무효(UNREGISTERED/INVALID) 시 정리
async function deleteToken(token: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
}

// 훈련 id → 표시명. 일반넛지의 title(=목적지) 과 {훈련명}/{추천컨텐츠} 치환에 공용.
const TRAINING_NAME: Record<string, string> = {
  quiz: '코드 맞추기',
  scale: '스케일 훈련',
  progression: '코드 진행 리스트',
  strum: '주법 리듬 훈련',
  combo: '코드 조합 훈련',
};

// 스케일 훈련 레벨(1~25) → scale-level.html ?key= 슬러그 (scale-training.html data-key 와 동일)
const SCALE_SLUG_BY_LEVEL: Record<string, string> = {
  '1': 'major', '2': 'pentatonic', '3': 'blues', '4': 'natural-minor', '5': 'harmonic-minor',
  '6': 'secondary-iv', '7': 'secondary-v', '8': 'secondary-ii', '9': 'secondary-vi', '10': 'secondary-iii',
  '11': 'ionian', '12': 'dorian', '13': 'phrygian', '14': 'lydian', '15': 'mixolydian',
  '16': 'aeolian', '17': 'locrian', '18': 'melodic-minor', '19': 'altered', '20': 'phrygian-dominant',
  '21': 'lydian-dominant', '22': 'mixolydian-b9b13', '23': 'mixolydian-b13', '24': 'locrian-sharp2',
  '25': 'locrian-sharp6',
};
// scale_key → 레벨 숫자(위 맵의 역방향). 스케일 연동형(3번)에서 scale_key → 레벨버킷 계산에 사용.
const SCALE_LEVEL_BY_KEY: Record<string, number> = Object.fromEntries(
  Object.entries(SCALE_SLUG_BY_LEVEL).map(([lv, key]) => [key, parseInt(lv, 10)]),
);

// 일반넛지 딥링크: 훈련 + 레벨범위(push_nudge_persona.levels) → FCM data.
//   progression/strum/combo 는 콤마 다중값을 클라이언트가 직접 필터·랜덤 처리하므로 그대로 전달
//   (미구현 레벨이 섞여 있어도 클라이언트가 걸러냄 → 구현되면 자동 포함).
//   quiz/scale 은 단일값만 받으므로 여기서 1개 선택. quiz 는 미구현 레벨 제외 필요.
function nudgeDeeplink(
  training: string, levels: string, difficulty: string | null, playableQuiz: Set<string>,
): { data: Record<string, string>; deeplink: string } | null {
  const base: Record<string, string> = { entry: 'nudge' };
  const list = levels.split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return null;

  if (training === 'quiz') {
    const usable = list.filter(lv => playableQuiz.has(lv));
    if (!usable.length) return null;           // 전부 미구현 레벨이면 스킵
    const lv = pickRandom(usable);
    return { data: { ...base, quizLevel: lv }, deeplink: `quiz:${lv}` };
  }
  if (training === 'scale') {
    const usable = list.filter(lv => SCALE_SLUG_BY_LEVEL[lv]);
    if (!usable.length) return null;
    const slug = SCALE_SLUG_BY_LEVEL[pickRandom(usable)];
    return { data: { ...base, scaleKey: slug }, deeplink: `scale:${slug}` };
  }
  if (training === 'progression') {
    return { data: { ...base, progNo: levels }, deeplink: `progression:${levels}` };
  }
  if (training === 'strum') {
    return { data: { ...base, strumLv: levels }, deeplink: `strum:${levels}` };
  }
  if (training === 'combo') {
    return {
      data: { ...base, comboChapter: levels, comboDifficulty: difficulty || 'low' },
      deeplink: `combo:${levels}:${difficulty || 'low'}`,
    };
  }
  return null;
}

Deno.serve(async (_req) => {
  try {
    // 테스트용: ?user_id=xxx 붙이면 그 유저 하나로만 좁혀서 발송(운영 cron은 파라미터 없이 호출하므로 영향 없음)
    const testUserId = new URL(_req.url).searchParams.get('user_id');
    // ?time_slot=1600|2045 붙이면 해당 접속시간대 그룹만 대상. 없으면 전체(테스트용).
    const timeSlotParam = new URL(_req.url).searchParams.get('time_slot') as '1600' | '2045' | null;

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const timeSlots = timeSlotParam ? await fetchTimeSlots() : null;
    const matchesTimeSlot = (userId: string) => !timeSlotParam || timeSlots?.[userId] === timeSlotParam;

    // 하루 1인 1건(이 호출 안에서) 보장 — 발송 완료된 user_id 여기 누적, 이후 단계에서 스킵
    const sentUsers = new Set<string>();
    let pruned = 0;

    // 레벨 표시이름(성적형·중단인지형 공용) + 플레이 가능 레벨(일반넛지 딥링크용) — 한 번만 조회
    const { names: levelNames, playable: playableQuiz } = await fetchLevelNames();
    const scaleNames = await fetchScaleLevelNames();

    // ── 1순위: 중단인지형 — 퀴즈·스케일 동등 경쟁, 유저당 랜덤 1개 ──
    type AbandonedCandidate =
      | { source: 'quiz';  t: QuizAbandonedTarget }
      | { source: 'scale'; t: ScaleAbandonedTarget };

    const [quizAbandonedRaw, scaleAbandonedRaw] = await Promise.all([
      fetchQuizAbandonedTargets(), fetchScaleAbandonedTargets(),
    ]);

    const byUser1 = new Map<string, AbandonedCandidate[]>();
    let quizAbandonedCount = 0, scaleAbandonedCount = 0;
    const push1 = (userId: string, c: AbandonedCandidate) => {
      if (sentUsers.has(userId) || (testUserId && userId !== testUserId) || !matchesTimeSlot(userId)) return;
      if (c.source === 'quiz') quizAbandonedCount++; else scaleAbandonedCount++;
      const arr = byUser1.get(userId) ?? [];
      arr.push(c);
      byUser1.set(userId, arr);
    };
    for (const t of quizAbandonedRaw)  push1(t.user_id, { source: 'quiz',  t });
    for (const t of scaleAbandonedRaw) push1(t.user_id, { source: 'scale', t });

    let aSent = 0, aFailed = 0, aSkipped = 0;
    for (const [userId, candidates] of byUser1) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const token = pick.t.token;

      if (pick.source === 'quiz') {
        const t = pick.t;
        const msg = await fetchRandomMessage('quiz_abandoned');
        if (!msg) { aSkipped++; continue; }
        const body = msg.body.replaceAll('{레벨명}', levelLabel(t.level_id, levelNames));
        // 중단인지형은 "풀던 레벨로 돌아가기"라 title 은 항상 '코드 맞추기' 고정.
        // 목적지는 다른 경로와 동일하게 title 에서 파생시켜 불일치 가능성을 없앰.
        const dest = deeplinkByTitle(msg.title, parseInt(t.level_id, 10), t.level_id);
        if (!dest) { aSkipped++; continue; }
        const logId = crypto.randomUUID();
        const data = { ...dest.data, entry: 'quiz_abandoned', logId };
        const r = await fcmSend(sa, accessToken, token, msg.title, body, data);
        if (r.ok) {
          await logPush({
            id: logId, user_id: userId, push_type: 'quiz_abandoned',
            category: 'quiz_abandoned', template_id: msg.id,
            title: msg.title, body, deeplink: dest.deeplink,
          });
          sentUsers.add(userId); aSent++;
        } else {
          aFailed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) { await deleteToken(token); pruned++; }
        }
      } else {
        const t = pick.t;
        const msg = await fetchRandomMessage('scale_abandoned');
        if (!msg) { aSkipped++; continue; }
        const body = fillScalePlaceholders(msg.body, t.scale_key, null, t.nickname, scaleNames);
        const dest = scaleOwnDest(t.scale_key);
        const logId = crypto.randomUUID();
        const data = { ...dest.data, entry: 'scale_abandoned', logId };
        const r = await fcmSend(sa, accessToken, token, msg.title, body, data);
        if (r.ok) {
          await logPush({
            id: logId, user_id: userId, push_type: 'scale_abandoned',
            category: 'scale_abandoned', template_id: msg.id,
            title: msg.title, body, deeplink: dest.deeplink,
          });
          sentUsers.add(userId); aSent++;
        } else {
          aFailed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) { await deleteToken(token); pruned++; }
        }
      }
    }

    // ── 2순위: 성적형·연동형 — 퀴즈·스케일 4가지 소스 동등 경쟁, 유저당 랜덤 1개 ──
    //   (중단인지형 받은 유저 제외). 소스: quizStat/quizLink/scaleStat/scaleLink.
    type Pattern2Candidate =
      | { source: 'quizStat';  t: QuizPatternTarget }
      | { source: 'quizLink';  t: QuizLinkTarget }
      | { source: 'scaleStat'; t: ScalePatternTarget }
      | { source: 'scaleLink'; t: ScaleLinkTarget };

    const [quizStatRaw, quizLinkRaw, scaleStatRaw, scaleLinkRaw] = await Promise.all([
      fetchQuizPatternTargets(), fetchQuizLinkTargets(),
      fetchScalePatternTargets(), fetchScaleLinkTargets(),
    ]);

    const byUser2 = new Map<string, Pattern2Candidate[]>();
    let quizStatCount = 0, quizLinkCount = 0, scaleStatCount = 0, scaleLinkCount = 0;
    const push2 = (userId: string, c: Pattern2Candidate) => {
      if (sentUsers.has(userId) || (testUserId && userId !== testUserId) || !matchesTimeSlot(userId)) return;
      if (c.source === 'quizStat') quizStatCount++;
      else if (c.source === 'quizLink') quizLinkCount++;
      else if (c.source === 'scaleStat') scaleStatCount++;
      else scaleLinkCount++;
      const arr = byUser2.get(userId) ?? [];
      arr.push(c);
      byUser2.set(userId, arr);
    };
    for (const t of quizStatRaw)  push2(t.user_id, { source: 'quizStat',  t });
    for (const t of quizLinkRaw)  push2(t.user_id, { source: 'quizLink',  t });
    for (const t of scaleStatRaw) push2(t.user_id, { source: 'scaleStat', t });
    for (const t of scaleLinkRaw) push2(t.user_id, { source: 'scaleLink', t });

    let qSent = 0, qFailed = 0, qSkipped = 0;       // quiz_pattern
    let lSent = 0, lFailed = 0, lSkipped = 0;       // quiz_link
    let sqSent = 0, sqFailed = 0, sqSkipped = 0;    // scale_pattern
    let slSent = 0, slFailed = 0, slSkipped = 0;    // scale_link

    for (const [userId, candidates] of byUser2) {
      const quizStat  = candidates.find(c => c.source === 'quizStat')?.t  as QuizPatternTarget  | undefined;
      const quizLink  = candidates.find(c => c.source === 'quizLink')?.t  as QuizLinkTarget     | undefined;
      const scaleStat = candidates.find(c => c.source === 'scaleStat')?.t as ScalePatternTarget | undefined;
      const scaleLink = candidates.find(c => c.source === 'scaleLink')?.t as ScaleLinkTarget    | undefined;
      const token = (quizStat ?? quizLink ?? scaleStat ?? scaleLink)!.token;

      // 콘텐츠 난이도 매핑 기준: 퀴즈 쪽(연동형 우선, 없으면 성적형 레벨) / 스케일 쪽(scale_key→레벨숫자)
      const quizLevel = quizLink ? parseInt(quizLink.level_id, 10)
        : quizStat ? parseInt(quizStat.level_id, 10) : null;
      const scaleLevel = scaleLink ? SCALE_LEVEL_BY_KEY[scaleLink.scale_key]
        : scaleStat ? SCALE_LEVEL_BY_KEY[scaleStat.scale_key] : null;

      // '코드 맞추기'로 뽑혔을 때 이동할 레벨: level_up→다음레벨 / challenge→챌린지 / reinforce→현재
      const quizTarget = quizStat
        ? (quizStat.category === 'quiz_level_up'   ? quizStat.next_level_id :
           quizStat.category === 'quiz_challenge'  ? quizStat.challenge_id  :
           quizStat.level_id)
        : null;

      // 이 유저가 받을 자격이 있는 title/category 만 후보로 — 그 안에서 title 균등 랜덤
      const titles: string[] = [];
      const categories: string[] = [];
      if (quizStat)  { titles.push('코드 맞추기'); categories.push(quizStat.category); }
      if (scaleStat) { titles.push('스케일 훈련'); categories.push(scaleStat.category); }
      if (quizLink) {
        for (const [title, category] of Object.entries(LINK_TITLE_CATEGORY)) {
          if (deeplinkByTitle(title, quizLevel!, null) === null) continue; // 레벨9+ 주법 등 제외
          titles.push(title);
          categories.push(category);
        }
      }
      if (scaleLink) {
        for (const [title, category] of Object.entries(SCALE_LINK_TITLE_CATEGORY)) {
          titles.push(title);
          categories.push(category);
        }
      }
      if (!titles.length) continue;

      const msg = await fetchBalancedMessage(titles, categories);
      if (!msg) { qSkipped++; continue; }

      let dest: { data: Record<string, string>; deeplink: string } | null = null;
      let body = '';
      let pushType = '';

      if (msg.category === 'quiz_level_up' || msg.category === 'quiz_challenge' || msg.category === 'quiz_reinforce') {
        pushType = 'quiz_pattern';
        dest = deeplinkByTitle(msg.title, quizLevel!, quizTarget);
        body = fillQuizPlaceholders(msg.body, quizStat!, levelNames);
      } else if (msg.category === 'scale_level_up' || msg.category === 'scale_reinforce') {
        pushType = 'scale_pattern';
        const destKey = msg.category === 'scale_level_up'
          ? (scaleStat!.next_scale_key ?? scaleStat!.scale_key)
          : scaleStat!.scale_key;
        dest = scaleOwnDest(destKey);
        body = fillScalePlaceholders(msg.body, scaleStat!.scale_key, scaleStat!.next_scale_key, scaleStat!.nickname, scaleNames);
      } else if (msg.category.startsWith('scale_link_')) {
        pushType = 'scale_link';
        const linkDest = scaleLinkDeeplink(msg.title, scaleLevel!);
        if (linkDest) {
          dest = { data: linkDest.data, deeplink: linkDest.deeplink };
          body = msg.body.replaceAll('{닉네임}', scaleLink!.nickname || '회원').replaceAll('{레벨}', linkDest.levelText);
        }
      } else { // quiz_link_*
        pushType = 'quiz_link';
        dest = deeplinkByTitle(msg.title, quizLevel!, null);
        body = msg.body.replaceAll('{레벨명}', levelLabel(quizLink!.level_id, levelNames));
      }

      if (!dest) {
        if (pushType === 'quiz_pattern') qSkipped++;
        else if (pushType === 'scale_pattern') sqSkipped++;
        else if (pushType === 'scale_link') slSkipped++;
        else lSkipped++;
        continue;
      }

      const logId = crypto.randomUUID();
      const data = { ...dest.data, entry: pushType, category: msg.category, logId };
      const r = await fcmSend(sa, accessToken, token, msg.title, body, data);
      if (r.ok) {
        await logPush({
          id: logId, user_id: userId, push_type: pushType,
          category: msg.category, template_id: msg.id,
          title: msg.title, body, deeplink: dest.deeplink,
        });
        sentUsers.add(userId);
        if (pushType === 'quiz_pattern') qSent++;
        else if (pushType === 'scale_pattern') sqSent++;
        else if (pushType === 'scale_link') slSent++;
        else lSent++;
      } else {
        if (pushType === 'quiz_pattern') qFailed++;
        else if (pushType === 'scale_pattern') sqFailed++;
        else if (pushType === 'scale_link') slFailed++;
        else lFailed++;
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) { await deleteToken(token); pruned++; }
      }
    }

    // ── 3순위: 일반 넛지 발송 (성적형·중단인지형 받은 유저 제외) ──
    //   repeat(마지막 훈련 한 번 더) / persona(페르소나 추천) 50:50.
    //   단, 훈련 기록이 전혀 없으면 repeat 이 성립하지 않으므로 persona 로 발송.
    const nudgeTargetsRaw = await fetchNudgeTargets();
    const nudgeTargets = nudgeTargetsRaw.filter(t =>
      !sentUsers.has(t.user_id) && (!testUserId || t.user_id === testUserId) && matchesTimeSlot(t.user_id));
    let nSent = 0, nFailed = 0, nSkipped = 0;
    for (const t of nudgeTargets) {
      const kind: 'repeat' | 'persona' =
        (t.last_training && Math.random() < 0.5) ? 'repeat' : 'persona';

      // 목적지 훈련 → title. 다른 경로와 동일하게 title 이 곧 딥링크 대상.
      const training = kind === 'repeat' ? t.last_training! : t.rec_training;
      const dest = kind === 'repeat'
        ? { data: { entry: 'nudge', trainingHome: training }, deeplink: `${training}:home` }
        : nudgeDeeplink(t.rec_training, t.rec_levels, t.rec_difficulty, playableQuiz);
      if (!dest) { nSkipped++; continue; }

      const msg = await fetchRandomMessage(kind === 'repeat' ? 'nudge_repeat' : 'nudge_persona');
      if (!msg) { nSkipped++; continue; }

      const trainingName = TRAINING_NAME[training] ?? training;
      const body = msg.body
        .replaceAll('{닉네임}', t.nickname || '회원')
        .replaceAll('{훈련명}', trainingName)
        .replaceAll('{추천컨텐츠}', trainingName);

      const logId = crypto.randomUUID();
      const data = { ...dest.data, logId };
      // 일반넛지 title 은 훈련명이 아니라 DB의 중립 문구를 그대로 사용.
      // 훈련을 지칭하지 않으므로 어떤 딥링크가 붙어도 불일치가 생기지 않음.
      const r = await fcmSend(sa, accessToken, t.token, msg.title, body, data);
      if (r.ok) {
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'nudge',
          category: kind === 'repeat' ? 'nudge_repeat' : 'nudge_persona',
          template_id: msg.id, title: msg.title, body, deeplink: dest.deeplink,
        });
        sentUsers.add(t.user_id);
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
      time_slot: timeSlotParam ?? 'all',
      abandoned: { quiz: quizAbandonedCount, scale: scaleAbandonedCount, sent: aSent, failed: aFailed, skipped: aSkipped },
      quiz_pattern: { targets: quizStatCount, sent: qSent, failed: qFailed, skipped: qSkipped },
      quiz_link: { targets: quizLinkCount, sent: lSent, failed: lFailed, skipped: lSkipped },
      scale_pattern: { targets: scaleStatCount, sent: sqSent, failed: sqFailed, skipped: sqSkipped },
      scale_link: { targets: scaleLinkCount, sent: slSent, failed: slFailed, skipped: slSkipped },
      nudge:   { targets: nudgeTargets.length,   sent: nSent, failed: nFailed, skipped: nSkipped },
      pruned,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
