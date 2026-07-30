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
//   1순위) get_quiz_abandoned_targets() — 코드맞추기 중단인지형(풀다 나감) 발송
//   2순위) get_quiz_pattern_targets() + get_quiz_link_targets()
//          — 성적형(누적평균 기준 레벨업/챌린지/재정비)과 연동형(마지막 세션 90%↑ →
//            스케일/코드진행/주법/코드조합 중 랜덤 추천)은 동등 경쟁, 유저당 랜덤 1개
//   3순위) get_nudge_targets()          — 1~3일 유휴 유저 일반 넛지 발송(현재 quiz 타입 폐기됨, push_nudge_retire_quiz.sql)
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
  nudge_type: string;
  title: string;
  body: string;
  deeplink_val: string;
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

// ── 연동형(3번) 레벨 → 추천 콘텐츠 딥링크 매핑 ──────────────────
const SCALE_KEY_BY_LEVEL: Record<number, string> = {
  1: 'major', 2: 'pentatonic', 3: 'blues', 4: 'natural-minor', 5: 'harmonic-minor',
  6: 'secondary-iv', 7: 'secondary-v', 8: 'secondary-ii', 9: 'secondary-vi', 10: 'secondary-iii',
};
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// 코드맞추기 관련 넛지(2·3·4번) 공용 — 타이틀은 본문 카테고리와 무관하게 5개 중 랜덤(특정 타이틀 쏠림 방지)
const QUIZ_PUSH_TITLES = ['코드 맞추기', '스케일 훈련', '코드 진행 리스트', '주법 리듬 훈련', '코드 조합 훈련'];

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

// level_id → 표시이름 맵 (quiz_level_names 테이블, 소프트코딩)
async function fetchLevelNames(): Promise<Record<string, string>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/quiz_level_names?select=level_id,display_name`, {
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
  if (!resp.ok) throw new Error(`quiz level names error ${resp.status}: ${await resp.text()}`);
  const rows: { level_id: string; display_name: string }[] = await resp.json();
  return Object.fromEntries(rows.map(r => [r.level_id, r.display_name]));
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

async function logNudgeSent(userId: string, nudgeType: string, deeplinkVal: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/push_nudge_log`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, nudge_type: nudgeType, deeplink_val: deeplinkVal }),
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

    // 레벨 표시이름(성적형·중단인지형 공용) — 한 번만 조회
    const levelNames = await fetchLevelNames();

    // ── 1순위: 코드맞추기 중단인지형 발송 ──────────────────────
    const abandonedTargetsRaw = await fetchQuizAbandonedTargets();
    const abandonedTargets = abandonedTargetsRaw.filter(t =>
      !sentUsers.has(t.user_id) && (!testUserId || t.user_id === testUserId) && matchesTimeSlot(t.user_id));
    let aSent = 0, aFailed = 0, aSkipped = 0;
    for (const t of abandonedTargets) {
      const msg = await fetchRandomMessage('quiz_abandoned');
      if (!msg) { aSkipped++; continue; }
      const body = msg.body.replaceAll('{레벨명}', levelLabel(t.level_id, levelNames));
      const logId = crypto.randomUUID();
      const title = pickRandom(QUIZ_PUSH_TITLES);
      const data = { entry: 'quiz_abandoned', quizLevel: t.level_id, logId };
      const r = await fcmSend(sa, accessToken, t.token, title, body, data);
      if (r.ok) {
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'quiz_abandoned',
          category: 'quiz_abandoned', template_id: msg.id,
          title, body, deeplink: `quiz:${t.level_id}`,
        });
        sentUsers.add(t.user_id);
        aSent++;
      } else {
        aFailed++;
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) {
          await deleteToken(t.token);
          pruned++;
        }
      }
    }

    // ── 2순위: 성적형·연동형 — 동등 경쟁, 유저당 랜덤 1개 (중단인지형 받은 유저 제외) ──
    type Pattern3Candidate =
      | { source: 'stat';  t: QuizPatternTarget }
      | { source: 'link';  t: QuizLinkTarget };

    const [quizTargetsRaw, linkTargetsRaw] = await Promise.all([
      fetchQuizPatternTargets(), fetchQuizLinkTargets(),
    ]);

    const byUser3 = new Map<string, Pattern3Candidate[]>();
    let quizTargetCount = 0, linkTargetCount = 0;
    const push3 = (userId: string, c: Pattern3Candidate) => {
      if (sentUsers.has(userId) || (testUserId && userId !== testUserId) || !matchesTimeSlot(userId)) return;
      if (c.source === 'stat') quizTargetCount++; else linkTargetCount++;
      const arr = byUser3.get(userId) ?? [];
      arr.push(c);
      byUser3.set(userId, arr);
    };
    for (const t of quizTargetsRaw) push3(t.user_id, { source: 'stat', t });
    for (const t of linkTargetsRaw) push3(t.user_id, { source: 'link', t });

    let qSent = 0, qFailed = 0, qSkipped = 0;
    let lSent = 0, lFailed = 0, lSkipped = 0;

    for (const [userId, candidates] of byUser3) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];

      if (pick.source === 'stat') {
        const t = pick.t;
        const msg = await fetchRandomMessage(t.category);
        if (!msg) { qSkipped++; continue; }
        const body = fillQuizPlaceholders(msg.body, t, levelNames);
        // 딥링크 대상: level_up→다음레벨 / challenge→해당 챌린지 / reinforce→현재 레벨
        const targetLevel =
          t.category === 'quiz_level_up' ? t.next_level_id :
          t.category === 'quiz_challenge' ? t.challenge_id :
          t.level_id;
        const logId = crypto.randomUUID();
        const title = pickRandom(QUIZ_PUSH_TITLES);
        const data = { entry: 'quiz_pattern', category: t.category, quizLevel: targetLevel ?? t.level_id, logId };
        const r = await fcmSend(sa, accessToken, t.token, title, body, data);
        if (r.ok) {
          await logPush({
            id: logId, user_id: userId, push_type: 'quiz_pattern',
            category: t.category, template_id: msg.id,
            title, body, deeplink: `quiz:${targetLevel ?? t.level_id}`,
          });
          sentUsers.add(userId); qSent++;
        }
        else {
          qFailed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) { await deleteToken(t.token); pruned++; }
        }
      } else {
        const t = pick.t;
        const quizLevel = parseInt(t.level_id, 10);
        // 연동형: 스케일/코드진행/코드조합은 항상 가능, 주법은 레벨9+에서 제외
        const contentTypes = ['scale', 'progression', 'combo'];
        if (resolveStrumLv(quizLevel) !== null) contentTypes.push('strum');
        const chosenType = pickRandom(contentTypes);

        const logId = crypto.randomUUID();
        let category = '';
        let deeplink = '';
        let data: Record<string, string> = { entry: 'quiz_link', logId };
        if (chosenType === 'scale') {
          category = 'quiz_link_scale';
          const scaleKey = resolveScaleKey(quizLevel);
          deeplink = `scale:${scaleKey}`;
          data = { ...data, scaleKey };
        } else if (chosenType === 'progression') {
          category = 'quiz_link_progression';
          const progNo = resolveProgressionNo(quizLevel);
          deeplink = `progression:${progNo}`;
          data = { ...data, progNo };
        } else if (chosenType === 'strum') {
          category = 'quiz_link_strum';
          const strumLv = resolveStrumLv(quizLevel)!;
          deeplink = `strum:${strumLv}`;
          data = { ...data, strumLv };
        } else {
          category = 'quiz_link_combo';
          const comboChapter = resolveComboChapter(quizLevel);
          deeplink = `combo:${comboChapter}`;
          data = { ...data, comboChapter, comboDifficulty: 'low' };
        }

        const msg = await fetchRandomMessage(category);
        if (!msg) { lSkipped++; continue; }
        const body = msg.body.replaceAll('{레벨명}', levelLabel(t.level_id, levelNames));
        const title = pickRandom(QUIZ_PUSH_TITLES);
        const r = await fcmSend(sa, accessToken, t.token, title, body, data);
        if (r.ok) {
          await logPush({
            id: logId, user_id: userId, push_type: 'quiz_link',
            category, template_id: msg.id, title, body, deeplink,
          });
          sentUsers.add(userId); lSent++;
        }
        else {
          lFailed++;
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.text)) { await deleteToken(t.token); pruned++; }
        }
      }
    }

    // ── 3순위: 일반 넛지 발송 (성적형·중단인지형 받은 유저 제외) ──
    const nudgeTargetsRaw = await fetchNudgeTargets();
    const nudgeTargets = nudgeTargetsRaw.filter(t =>
      !sentUsers.has(t.user_id) && (!testUserId || t.user_id === testUserId) && matchesTimeSlot(t.user_id));
    let nSent = 0, nFailed = 0;
    for (const t of nudgeTargets) {
      const logId = crypto.randomUUID();
      const data = { ...nudgeData(t.nudge_type, t.deeplink_val), logId };
      const r = await fcmSend(sa, accessToken, t.token, t.title, t.body, data);
      if (r.ok) {
        await logNudgeSent(t.user_id, t.nudge_type, t.deeplink_val);
        await logPush({
          id: logId, user_id: t.user_id, push_type: 'nudge',
          title: t.title, body: t.body,
          deeplink: `${t.nudge_type}:${t.deeplink_val}`,
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
      quiz_abandoned: { targets: abandonedTargets.length, sent: aSent, failed: aFailed, skipped: aSkipped },
      quiz_pattern: { targets: quizTargetCount, sent: qSent, failed: qFailed, skipped: qSkipped },
      quiz_link: { targets: linkTargetCount, sent: lSent, failed: lFailed, skipped: lSkipped },
      nudge:   { targets: nudgeTargets.length,   sent: nSent, failed: nFailed },
      pruned,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
