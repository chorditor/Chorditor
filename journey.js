// ═══════════════════════════════════════════════════════════════
// journey.js — 나의 기타 여정 (경로 화면) — UI 껍데기
// 6줄 사인파 곡선 + 교차점 노드(눕힌 디스크). 노드 = 설명 노드(순번 숫자 — journey-numbers.js) · 퀴즈 노드('1-1' 작은 숫자) · 7개마다 피크상자 노드(노드 늘리기 2026-11-24, 별 호는 보류).
// 노드를 누르면 말풍선(제목 + 시작하기/퀴즈 풀기 → 노드 강의·퀴즈). 잠긴 노드 = 자물쇠, 타이머 노드 = 남은 시간(누르면 피크 즉시 해금).
// 노드 x/y와 줄 곡선은 같은 사인 함수로 계산한다.
// ═══════════════════════════════════════════════════════════════

const JNY_N = 4;          // 반 파장당 노드 수
const JNY_S = 96;         // 노드 간격(px)
const JNY_Y0 = 40;        // 첫 노드 y (헤더 카드 아래부터의 값)
const JNY_REF_W = 360;

// 코스 노드 내용 — 지금은 코드반주 1일차만. 순번(0부터) = 일차 - 1. 내용이 없는 노드는 눌러도 말풍선이 뜨지 않는다.
//  id = 노드 강의 파일 이름(journey-lessons/<id>.js)이자 별 저장 열쇠(localStorage jnyStars[id])
const JNY_COURSE_COMPING = [
  { title: '기타 지판 읽기', id: 'fretboard-reading' },
  { title: '음이름과 메이저스케일', id: 'note-names' },
  { title: '첫 코드 잡아보기', id: 'chord-first' },
  { title: '스트로크 기초', id: 'stroke-basics' },
  { title: '작은 별 연주하기', id: 'little-star' },
  { title: 'C,G코드 학습하기', id: 'cg-chords' },
  { title: '마이너 코드 학습하기', id: 'minor-chords' },
  { title: '약식 F코드 잡기', id: 'f-chord' },
  { title: '주법 확장하기', id: 'strum-expand' },
  { title: '왈츠리듬과 6/8리듬', id: 'waltz-68' },
  { title: '머니코드와 칼립소주법', id: 'money-calypso' },
  { title: '트라이어드 코드', id: 'triads' },
  { title: '다이어토닉 코드의 이해', id: 'diatonic' },
  { title: '도미넌트7 코드', id: 'dominant7' },
  { title: '펜타토닉 스케일 G폼', id: 'pentatonic-g' },   // D15~D19는 강의 파일 하나(journey-lessons/pentatonic-forms.js)를 같이 씀 — id는 별 저장 열쇠
  { title: '펜타토닉 스케일 C폼', id: 'pentatonic-c' },
  { title: '펜타토닉 스케일 A폼', id: 'pentatonic-a' },
  { title: '펜타토닉 스케일 E폼', id: 'pentatonic-e' },
  { title: '펜타토닉 스케일 D폼', id: 'pentatonic-d' },
  { title: '기타 필수 스킬', id: 'guitar-skills' },   // D20 해머링·풀링오프·슬라이드(journey-lessons/guitar-techniques.js)
  { title: '펜타토닉 대각 연결', id: 'pentatonic-diagonal' },   // D21 마지막 노드 — 대각 패턴 두 가지 + 여정 전체 복습(journey-lessons/pentatonic-diagonal.js)
];
// 솔로연주 비기너(언박싱 솔로잉, 2026-11-23 — docs/solo-beginner-curriculum.md). D1·D2·펜타토닉 다섯 폼·기타 필수 스킬·트라이어드·다이어토닉은 코드반주와 같은 파일·같은 별 열쇠(공통 노드)
const JNY_COURSE_SOLOING = [
  { title: '기타 지판 읽기', id: 'fretboard-reading' },
  { title: '음이름과 메이저스케일', id: 'note-names' },
  { title: 'TAB악보와 크로메틱', id: 'tab-chromatic' },
  { title: '기초 리듬 훈련', id: 'rhythm-basics' },
  { title: '펜타토닉 스케일 G폼', id: 'pentatonic-g' },
  { title: '펜타토닉 스케일 C폼', id: 'pentatonic-c' },
  { title: '펜타토닉 스케일 A폼', id: 'pentatonic-a' },
  { title: '펜타토닉 스케일 E폼', id: 'pentatonic-e' },
  { title: '펜타토닉 스케일 D폼', id: 'pentatonic-d' },
  { title: '펜타 수직 리듬 훈련', id: 'penta-rhythm' },
  { title: '크로메틱 리듬 훈련', id: 'chromatic-rhythm', noQuiz: true },   // 퀴즈 없는 노드(사용자 지정 2026-11-24) — 별 없음, 강의를 끝까지 보면 완료(jnyStars = 1, 강의가 기록)
  { title: '기타 필수 스킬', id: 'guitar-skills' },
  { title: '펜타 대각 이동 훈련', id: 'solo-diagonal' },
  { title: '메이저 스케일 C폼', id: 'major-c' },
  { title: '메이저 스케일 A,G폼', id: 'major-ag' },
  { title: '메이저 스케일 E,D폼', id: 'major-ed' },
  { title: '파워코드', id: 'power-chords' },   // CAGED 시스템(caged)은 언박싱 1일차에서 제외 — 파일은 남겨 둠(사용자 지정 2026-11-24)
  { title: '필수 코드 암기', id: 'solo-chords' },
  { title: '트라이어드 코드', id: 'triads' },
  { title: '도미넌트7 코드', id: 'dominant7' },
  { title: '다이어토닉 코드의 이해', id: 'diatonic' },
];
// 지금 걷는 코스 — 커리큘럼 선택 화면에서 고른 갈래(shared.js getCurrentCurriculum). 솔로잉이면 솔로 목록, 그 외는 코드반주
const JNY_COURSE_KIND = (typeof getCurrentCurriculum === 'function' && getCurrentCurriculum().kind === 'soloing') ? 'soloing' : 'comping';
const JNY_COURSE = JNY_COURSE_KIND === 'soloing' ? JNY_COURSE_SOLOING : JNY_COURSE_COMPING;
const JNY_COUNT = JNY_COURSE.length;   // 노드 수 = 코스 목록 길이(하드코딩 금지 — 사용자 지정 2026-11-20). 노드를 추가하면 목록만 늘리면 됨
const JNY_STARS_KEY = 'jnyStars';
const JNY_BUBBLE_W = 240;   // 말풍선 폭(px)
// ⚠ DEV ONLY(사용자 지정 2026-11-25) — dev 빌드(APP_VERSION에 '_dev')는 이 기기 여정 기록을 한 번 '전부 클리어(진행도 100%)'로 맞춤(확인용).
//  두 코스 모두: 모든 노드 설명 들음 + 퀴즈 1·2·3 클리어(퀴즈 없는 노드는 설명만), 완료 시각 7시간 전(타이머 없이 열린 상태).
//  상자 받음·강의 위치·처음 본 연출·이어 풀기 기록은 지움(상자는 받을 수 있는 상태로). 고른 여정(chorditor_curriculum)은 그대로.
//  (이전: 'n32-v1' = 3-2까지 클리어, 'reset-v1' = 전체 초기화)
//  한 번만(JNY_DEV_SEED 값이 바뀌면 다시) — 그 뒤 진행은 그대로 남음. 출시 때 _dev를 떼면 자동으로 꺼짐
const JNY_DEV_SEED = 'all-clear-v1';
function jnyDev() { return typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev'); }
(function jnyDevSeed() {
  if (!jnyDev()) return;
  try {
    if (localStorage.getItem('jnyDevSeed') === JNY_DEV_SEED) return;
    const stars = {}, lec = {}, done = {}, past = Date.now() - 7 * 60 * 60 * 1000;
    [JNY_COURSE_COMPING, JNY_COURSE_SOLOING].forEach(function (list) {
      list.forEach(function (it) {
        stars[it.id] = it.noQuiz ? 1 : 3; lec[it.id] = past; done[it.id] = past;
      });
    });
    localStorage.setItem('jnyStars', JSON.stringify(stars));
    localStorage.setItem('jnyLecDone', JSON.stringify(lec));
    localStorage.setItem('jnyDoneAt', JSON.stringify(done));
    ['jnyStar1At', 'jnyUnlockAt', 'jnyUnlockAtId', 'jnyBoxClaimed', 'jnyLessonHeard'].forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('jnyQuizSess:') === 0 || k.indexOf('jnySeen:') === 0) localStorage.removeItem(k); });
    localStorage.setItem('jnyDevSeed', JNY_DEV_SEED);
  } catch (e) {}
})();
function jnyStars(i) {
  const item = JNY_COURSE[i];
  if (!item) return 0;
  try { return JSON.parse(localStorage.getItem(JNY_STARS_KEY) || '{}')[item.id] || 0; } catch (e) { return 0; }
}

// ── 노드 늘리기(2026-11-24, hub/submissions/2026-11-24_dev-plan_journey-node-expansion.md) ──
//  코스 노드(JNY_COURSE, 이하 '묶음') 하나 = 설명 노드 + 퀴즈 노드 1·2·3(퀴즈 노드 k = 예전 별 k 퀴즈). 퀴즈 없는 노드(noQuiz)는 설명 노드만.
//  설명·퀴즈 노드를 합쳐 7개마다 피크상자 노드(7개 셈에 안 넣음). 지도에 그리는 순서 = JNY_FLAT.
//  저장: 퀴즈 노드 k 클리어 = jnyStars[id] ≥ k(그대로) / 설명 들음 = jnyLecDone[id](강의 엔진이 기록) / 묶음 완료 시각 = jnyDoneAt[id](퀴즈 3 클리어, 퀴즈 없는 노드는 설명 끝) / 상자 수령 = jnyBoxClaimed['코스:순번']
const JNY_BOX_EVERY = 7;
const JNY_FLAT = (function () {
  const a = [];
  let run = 0, box = 0;
  function push(o) { a.push(o); if (++run === JNY_BOX_EVERY) { run = 0; a.push({ type: 'box', b: box++ }); } }
  JNY_COURSE.forEach(function (it, d) {
    push({ type: 'lec', d: d });
    if (!it.noQuiz) for (let k = 1; k <= 3; k++) push({ type: 'quiz', d: d, k: k });
  });
  return a;
})();
const JNY_LEC_KEY = 'jnyLecDone';
const JNY_BOX_KEY = 'jnyBoxClaimed';
function jnyBoxKey(b) { return JNY_COURSE_KIND + ':' + b; }
function jnyLecDone(d) { const it = JNY_COURSE[d]; return !!it && (jnyStars(d) >= 1 || !!jnyLoad(JNY_LEC_KEY)[it.id]); }
function jnyUnitDone(d) { const it = JNY_COURSE[d]; return !!it && (it.noQuiz ? jnyLecDone(d) : jnyStars(d) >= 3); }   // 묶음 완료 = 마지막 퀴즈 클리어(퀴즈 없는 노드는 설명 끝)
function jnyBoxClaimed(b) { return !!jnyLoad(JNY_BOX_KEY)[jnyBoxKey(b)]; }
function jnyItemDone(it) {
  if (it.type === 'lec') return jnyLecDone(it.d);
  if (it.type === 'quiz') return jnyStars(it.d) >= it.k;
  return jnyBoxClaimed(it.b);
}

// ── 잠금·6시간 타이머 (노드 경제 기획안 §1-2 — 해금 시점만 노드 늘리기 기획안 §3으로 바뀜) ──
//  설명 노드: 잠금 = 직전 묶음 미완료. 직전 묶음을 끝낸 순간 + 6시간이 열림 시각, 그 전까지 타이머. 퀴즈 노드에는 타이머 없음(앞 노드만 끝내면 열림).
//  즉시 해금: 피크 5 → 7 → 10 → 10…(해금 단계). 타이머를 온전히 보낸 노드가 하나라도 생기면 단계는 처음(5)으로.
//  저장: 이 기기 localStorage — jnyDoneAt[노드 id](묶음 완료 시각, 노드 퀴즈·강의가 기록) / jnyUnlockAtId[노드 id](피크로 해제한 시각).
//  서버 동기화(B2, supabase/journey_progress.sql): 홈 진입 때 jnySyncProgress가 기기 기록을 올리고 서버 값(시각 = 서버에 처음 들어온 서버 시각)으로 덮는다.
//  타이머 비교는 jnyNow()(기기 시각 + 서버와의 차이)로 — 기기 시계를 돌려도 서버 시각 기준으로 계산. 피버타임(부스트)은 아직 없음
const JNY_STAR1_KEY = 'jnyDoneAt';   // 이름은 옛 그대로(별 1 시각 → 묶음 완료 시각으로 뜻이 바뀜)
const JNY_UNLOCK_KEY = 'jnyUnlockAtId';   // 노드 id 기준(2026-11-26). 옛 'jnyUnlockAt'은 과정 안 순번 기준이라 코드반주·솔로가 섞였음 → 아래에서 한 번 옮김
const JNY_SKEW_KEY = 'jnyClockSkew';      // 서버 시각 − 기기 시각(ms), 동기화 때 갱신
function jnyNow() { return Date.now() + (parseInt(localStorage.getItem(JNY_SKEW_KEY) || '0', 10) || 0); }
(function jnyMigrateUnlock() {   // 옛 순번 기록 → 지금 과정의 노드 id로(여정 미출시라 기록은 개발 기기에만 있음)
  try {
    const old = JSON.parse(localStorage.getItem('jnyUnlockAt') || 'null');
    if (!old) return;
    const cur = JSON.parse(localStorage.getItem(JNY_UNLOCK_KEY) || '{}') || {};
    Object.keys(old).forEach(function (i) { const it = JNY_COURSE[Number(i)]; if (it && !cur[it.id]) cur[it.id] = old[i]; });
    localStorage.setItem(JNY_UNLOCK_KEY, JSON.stringify(cur));
    localStorage.removeItem('jnyUnlockAt');
  } catch (e) {}
})();
const JNY_WAIT_MS = 6 * 60 * 60 * 1000;
const JNY_UNLOCK_COSTS = [5, 7, 10];   // 해금 단계별 비용, 넘어서면 마지막 값(10) 고정
function jnyLoad(key) { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } }
function jnyOpenAt(i) {   // 묶음 i 설명 노드의 열림 시각(ms). 0 = 제한 없음(첫 노드·Pro·기록 없음·피크 해제)
  if (i === 0 || (typeof getPlan === 'function' && getPlan() === 'pro')) return 0;
  if (JNY_COURSE[i] && jnyLoad(JNY_UNLOCK_KEY)[JNY_COURSE[i].id]) return 0;
  const prev = JNY_COURSE[i - 1];
  if (!prev || !jnyUnitDone(i - 1)) return 0;
  const t1s = jnyLoad(JNY_STAR1_KEY);
  if (t1s[prev.id] && !jnyDev() && t1s[prev.id] < jnyBoostEnd()) return 0;   // 7일 부스트 중에 끝낸 묶음 → 다음 노드 타이머 없음(끝나도 유지)
  if (!t1s[prev.id]) {   // 완료 시각 기록 전에 끝낸 묶음 — 지금을 완료 시각으로 채움(그때부터 6시간)
    t1s[prev.id] = jnyNow();
    try { localStorage.setItem(JNY_STAR1_KEY, JSON.stringify(t1s)); } catch (e) {}
  }
  return t1s[prev.id] + JNY_WAIT_MS;
}
// 묶음(설명 노드) 상태: 'locked' | 'timer' | 'open'
function jnyNodeState(i) {
  if (i > 0 && !jnyUnitDone(i - 1)) return 'locked';
  return jnyOpenAt(i) > jnyNow() ? 'timer' : 'open';
}
// 지도 노드 상태 — 설명: jnyNodeState / 퀴즈: 'locked' | 'open'(설명을 들었거나 앞 퀴즈 클리어) / 상자: 'locked'(7개 전) | 'ready'(받을 수 있음) | 'claimed'
function jnyItemState(it, p) {
  if (it.type === 'lec') return jnyNodeState(it.d);
  if (it.type === 'quiz') return (it.k === 1 ? jnyLecDone(it.d) : jnyStars(it.d) >= it.k - 1) ? 'open' : 'locked';
  if (jnyBoxClaimed(it.b)) return 'claimed';
  for (let q = p - 1, n = 0; n < JNY_BOX_EVERY; q--) {   // 바로 앞 설명·퀴즈 노드 7개가 모두 완료
    if (JNY_FLAT[q].type === 'box') continue;
    if (!jnyItemDone(JNY_FLAT[q])) return 'locked';
    n++;
  }
  return 'ready';
}
// 지금 해금 비용 — 마지막으로 타이머를 온전히 보낸 시각 이후에 피크로 해제한 횟수가 단계
function jnyUnlockCost() {
  const paid = jnyLoad(JNY_UNLOCK_KEY), t1s = jnyLoad(JNY_STAR1_KEY), now = jnyNow();
  let lastWaited = 0;
  JNY_COURSE.forEach(function (item, k) {   // 노드 k+1의 타이머가 피크 해제 없이 끝났으면 그 끝난 시각
    const t1 = t1s[item.id];
    if (t1 && !(JNY_COURSE[k + 1] && paid[JNY_COURSE[k + 1].id]) && t1 + JNY_WAIT_MS <= now) lastWaited = Math.max(lastWaited, t1 + JNY_WAIT_MS);
  });
  const step = Object.keys(paid).filter(function (k) { return paid[k] > lastWaited; }).length;
  return JNY_UNLOCK_COSTS[Math.min(step, JNY_UNLOCK_COSTS.length - 1)];
}
function jnyFmtLeft(ms) {   // 5:59:59
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
// 자물쇠 아이콘(lucide lock 모양을 인라인으로 — 리사이즈 다시 그리기에도 lucide.createIcons 없이 보이게)
// 퀴즈 노드 글자 크기 — 'N-k'(설명 노드 순번-퀴즈 단계)를 설명 노드 숫자(38)보다 살짝 작게(사용자 지정 2026-11-24, 덤벨 아이콘 대신)
const JNY_QUIZ_NUM_PX = 26;   // 2026-11-25 30 → 26(퀴즈 노드 디스크 58×44에 맞춰 조금 더 작게)
const JNY_LOCK_SVG ='<svg class="journey-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

// 타이머 글자 1초마다 갱신. 다 되면 경로를 다시 그려 열림 상태로
let _jnyTick = null;
function jnyTickStart() {
  clearInterval(_jnyTick);
  _jnyTick = null;
  if (!document.querySelector('#journey-nodes .journey-timer')) return;
  _jnyTick = setInterval(function () {
    const els = document.querySelectorAll('#journey-nodes .journey-timer');
    if (!els.length) { clearInterval(_jnyTick); _jnyTick = null; return; }
    if (document.hidden) return;
    const now = jnyNow();
    let ended = false;
    els.forEach(function (el) {
      const left = Number(el.dataset.openAt) - now;
      if (left <= 0) ended = true; else el.textContent = jnyFmtLeft(left);
    });
    if (ended) renderJourney();
  }, 1000);
}

// 타이머 중인 노드를 누름 → 앱 공용 피크 소모 확인 모달(리하모니·스케일 훈련 진입과 같은 방식: 제목 + 피크 아이콘 "-N" + [취소][시작하기])
function jnyAskUnlock(i) {
  if (typeof showLeavePracticeModal !== 'function') return;
  const cost = jnyUnlockCost();
  jnyTrack('journey_unlock_prompted', { node_id: JNY_COURSE[i] ? JNY_COURSE[i].id : null, day: i + 1, cost: cost });
  showLeavePracticeModal(function () { jnyUnlock(i, cost); }, {
    title: '지금 바로 열까요?',
    desc: '<span class="peak-confirm-body"><img src="image/peak.svg" alt="피크"><span class="peak-confirm-count">-' + cost + '</span></span>'
      + '<span class="journey-unlock-note">피크를 소모해서<br>기다림 없이 진도를 나가요!</span>',
    stopText: '취소',
    continueText: '시작하기',
    confirmOnPrimary: true,
    sfx: null,   // 노드 탭 소리가 이미 났음
  });
}
async function jnyUnlock(i, cost) {
  if (jnyNodeState(i) !== 'timer') { renderJourney(); return; }   // 시트를 띄운 사이 타이머가 끝남
  if (typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
    // DEV 빌드: 공용 consumePeak는 소모 없이 통과(shared.js 규칙) → 화면 숫자만 흉내(퀴즈와 같은 방식, 서버·로컬 잔액은 그대로)
    if (typeof _peakState !== 'undefined') {
      if ((_peakState.balance || 0) < cost) { if (typeof openPeakBuffer === 'function') openPeakBuffer('journey'); return; }
      _peakState = Object.assign({}, _peakState, { balance: (_peakState.balance || 0) - cost });
      if (typeof renderPeakBadge === 'function') renderPeakBadge();
    }
  } else if (typeof consumePeak === 'function' && !(await consumePeak(cost, 'journey'))) return;   // 부족하면 consumePeak가 부족 안내를 띄움
  const o = jnyLoad(JNY_UNLOCK_KEY);
  if (JNY_COURSE[i]) o[JNY_COURSE[i].id] = Date.now();   // 서버 동기화 때 서버 시각으로 바뀜
  jnyTrack('journey_unlocked_by_peak', { node_id: JNY_COURSE[i] ? JNY_COURSE[i].id : null, day: i + 1, cost: cost });
  try { localStorage.setItem(JNY_UNLOCK_KEY, JSON.stringify(o)); } catch (e) {}
  renderJourney();
  if (JNY_COURSE[i]) jnyStartNode(i);   // 내용이 있는 노드면 바로 시작
}
// ⏸ 별 표시 보류(노드 늘리기 2026-11-24) — 아래 별 호는 지금 그리지 않음(renderJourney에서 부르지 않음). 별 시스템을 되살릴 때 다시 씀
// 노드 아래 별 3개 — 노드 아래 테두리에 겹쳐(오버레이) 호(arc) 모양으로: 가운데 별이 가장 아래, 양옆 별은 노드 곡선을 따라 올라가며 안쪽으로 5° 기울임.
//  딴 별 = 노랑, 못 딴 별 = 빈 별(노드 옆면과 같은 회색 — 잠긴 노드에도 표시, 노드 경제 기획안 §1-7).
//  모양: 꼭짓점이 둥근 별(같은 색 굵은 선 + 둥근 이음). 입체감: 아래로 2px 내린 진한 바닥층 + 위가 밝은 그라데이션 앞면 + 왼쪽 위 반사광
const JNY_STAR_PATH = 'M12 3.2l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.5l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z';
function jnyStarDefs() {   // 그라데이션은 경로 화면에 한 번만
  return '<svg class="journey-star-defs" width="0" height="0" aria-hidden="true"><defs>' +
    '<linearGradient id="jstar-on" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE36B"/><stop offset="1" stop-color="#F2BE00"/></linearGradient>' +
    '<linearGradient id="jstar-off" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F5F2"/><stop offset="1" stop-color="#E3E1DC"/></linearGradient>' +
    '</defs></svg>';
}
function jnyStarsHtml(x, y, n) {
  let h = '';
  [[-24, 26, 5], [0, 32, 0], [24, 26, -5]].forEach(function (p, k) {   // [가로 위치, 노드 중심에서 아래로, 기울기°] — 노드(68×52) 아래 테두리(중심+26~34)에 걸침. 양옆 별만 안쪽(가운데 쪽)으로 5°
    const on = k < n;
    h += '<svg class="journey-star' + (on ? ' is-on' : '') + '" viewBox="0 0 24 24" aria-hidden="true" style="left:' + (x + p[0]).toFixed(1) + 'px;top:' + (y + p[1]) + 'px;transform:translate(-50%, -50%) rotate(' + p[2] + 'deg)">' +
      '<path class="journey-star-base" d="' + JNY_STAR_PATH + '" transform="translate(0 1.6)"/>' +
      '<path class="journey-star-face" d="' + JNY_STAR_PATH + '" fill="url(#jstar-' + (on ? 'on' : 'off') + ')" stroke="url(#jstar-' + (on ? 'on' : 'off') + ')"/>' +
      '<path class="journey-star-shine" d="M9.6 9.3l1.6-3.1"/>' +
      '</svg>';
  });
  return h;
}

function renderJourney() {
  const stage = document.getElementById('journey-stage');
  const svg = document.getElementById('journey-svg');
  const nodesEl = document.getElementById('journey-nodes');
  if (!stage || !svg || !nodesEl) return;

  const W = Math.min(stage.parentElement.clientWidth || JNY_REF_W, 420);
  const k = W / JNY_REF_W;
  const CX = W / 2;
  const A = Math.min(64 * k, W / 2 - 34 - 8); // 노드가 화면 밖으로 나가지 않게
  const G = 5;          // 줄 퍼짐
  const T = 1.4;        // 줄 두께(6번줄 기준)
  const LINES = 6;
  const H = JNY_N * JNY_S;
  const total = JNY_Y0 + (JNY_FLAT.length - 1) * JNY_S + JNY_Y0;   // 노드 늘리기: 설명·퀴즈·상자 노드 전부(JNY_FLAT)

  stage.style.width = W + 'px';
  stage.style.height = total + 'px';
  stage.dataset.h = total;   // 말풍선이 경로 끝 아래로 나가면 잠깐 늘렸다가 닫을 때 이 높이로 되돌림(jnyFitBubble)
  svg.setAttribute('width', W);
  svg.setAttribute('height', total);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + total);

  let paths = '';
  // 곡선 = 사인. 예전엔 4px마다 점을 찍은 꺾은선(줄당 점 2,000개+)이라 스크롤 때 새로 보이는 영역을 그릴 때마다 무거웠음(2026-11-25 홈 최적화).
  //  지금은 노드 간격(JNY_S)마다 3차 베지어 한 조각 — 양 끝의 위치·기울기를 사인과 똑같이 맞춰(에르미트) 모양은 같고 조각 수는 노드 수 정도
  const SEG = JNY_S;
  for (let i = 0; i < LINES; i++) {
    const amp = A + (i - (LINES - 1) / 2) * G;
    const fx = function (y) { return CX + amp * Math.sin(Math.PI * (y - JNY_Y0) / H); };
    const dx = function (y) { return amp * Math.cos(Math.PI * (y - JNY_Y0) / H) * Math.PI / H; };   // dx/dy
    let d = 'M' + fx(JNY_Y0).toFixed(1) + ' ' + JNY_Y0; // 첫 노드부터 시작 — 그 이전엔 줄 없음
    for (let y0 = JNY_Y0; y0 < total; y0 += SEG) {
      const y1 = Math.min(total, y0 + SEG), h = (y1 - y0) / 3;
      d += 'C' + (fx(y0) + dx(y0) * h).toFixed(1) + ' ' + (y0 + h).toFixed(1) + ' '
        + (fx(y1) - dx(y1) * h).toFixed(1) + ' ' + (y1 - h).toFixed(1) + ' '
        + fx(y1).toFixed(1) + ' ' + y1;
    }
    const w = T - T * 0.5 * (i / (LINES - 1));
    paths += '<path d="' + d + '" fill="none" stroke="#e3e1dc" stroke-width="' + w.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  svg.innerHTML = paths;

  let html = '';
  JNY_FLAT.forEach(function (it, p) {
    const y = JNY_Y0 + p * JNY_S;
    const x = CX + A * Math.sin(Math.PI * p / JNY_N);
    const st = jnyItemState(it, p);
    let inner, cls = 'journey-node journey-node--' + it.type + ' journey-node--' + st;
    if (it.type === 'box') {
      // 피크상자 노드 — 피크바 상자 이미지. 7개 전 = 흑백, 받을 수 있음 = 컬러 + 반짝임, 받은 뒤 = 수령 완료(옅게)
      inner = '<img class="journey-box-img" src="image/gift.png" alt="">' + (st === 'ready' ? '<span class="journey-box-spark" aria-hidden="true"></span>' : '');
    } else {
      // 설명 노드: 잠금 = 자물쇠 / 타이머 = 남은 시간(노드 위 오버레이, 노드 밖으로 넘쳐도 됨) / 그 외 = 설명 노드 순번(퀴즈 노드는 번호를 세지 않음)
      // 퀴즈 노드: '1-1'처럼 설명 노드 순번-퀴즈 단계, 숫자보다 살짝 작게. 잠금이면 설명 노드와 같은 자물쇠(사용자 지정 2026-11-25)
      inner = st === 'locked' ? JNY_LOCK_SVG
        : it.type === 'quiz' ? jnyNumSvg((it.d + 1) + '-' + it.k, JNY_QUIZ_NUM_PX)
        : st === 'timer' ? '<span class="journey-timer" data-open-at="' + jnyOpenAt(it.d) + '">' + jnyFmtLeft(jnyOpenAt(it.d) - jnyNow()) + '</span>'
        : jnyNumSvg(it.d + 1);
      // 클리어(설명 들음·퀴즈 클리어) = 채색(파랑 디스크 + 흰 글자) / 열림(아직 안 함) = 테두리만 연한 파랑(기획안 §1-7)
      const clear = jnyItemDone(it);
      if (clear) cls += ' journey-node--clear';
      else if (st === 'open') cls += ' journey-node--unlocked';
    }
    html += '<div class="' + cls + '" data-idx="' + p + '" data-sfx="pop2" style="left:' + x.toFixed(1) + 'px;top:' + y + 'px">' + inner + '</div>';
  });
  html += jnyTrainBannersHtml(W, CX, A, G);   // 곡선 반대편 빈 자리의 훈련 연계 배너
  nodesEl.innerHTML = html;   // 다시 그리면 열려 있던 말풍선도 함께 사라진다. 별 호는 보류(노드 늘리기 2026-11-24)
  _jnyBubbleIdx = -1;
  jnyWatchAnims(nodesEl);
  jnyTickStart();
  renderJourneyProgress();   // 노드 상태(열림·타이머 끝·피크 해제)가 바뀔 때마다 진행도 숫자도 같이
  if (jnyShowNews()) _jnyEntering = false; else jnyFocusIfExpired();   // 방금 클리어한 노드로 스크롤 + 새로 열린 노드 연출(지도를 다시 보는 순간 한 번). 없으면 홈 세션이 만료됐을 때 지금 할 노드로

  // 홈 탭의 '다른 커리큘럼 보기' 버튼(노드 영역 좌상단): 윗변을 1번 노드의 윗변에 맞춘다(스크롤 맨 위 기준 위치로 고정)
  const switchBtn = document.getElementById('journey-switch-btn');
  const firstNode = nodesEl.querySelector('.journey-node');
  if (switchBtn && firstNode && stage.offsetTop) {
    const top = (stage.offsetTop + firstNode.offsetTop) + 'px';
    switchBtn.style.top = top;
    const side = document.getElementById('journey-side');   // 우상단 세로 버튼 묶음도 같은 높이에서 시작
    if (side) side.style.top = top;
    const promoBtn = document.getElementById('journey-promo-btn');   // 승급시험 버튼 = 책 아래 24px(책 44px + 간격 24px)
    if (promoBtn) promoBtn.style.top = 'calc(' + top + ' + 44px + var(--space-6))';
  }
  jnyRenderPromoBtn();
  jnyRenderBoost();
  jnyLogHomeView();
}

// ── 분석 이벤트(2026-11-26 여정 텍소노미 — docs/analytics-journey-taxonomy.md) ──
function jnyTrack(name, props) {
  if (typeof analytics === 'undefined') return;
  analytics.track(name, Object.assign({ course_kind: JNY_COURSE_KIND }, props || {}));
}
function jnyItemProps(it) {   // 지도 노드 하나 → 공통 속성
  if (!it) return {};
  if (it.type === 'box') return { item_type: 'box', box_index: it.b };
  const item = JNY_COURSE[it.d];
  return { item_type: it.type === 'quiz' ? 'quiz' : 'lecture', node_id: item ? item.id : null, day: it.d + 1, quiz_k: it.type === 'quiz' ? it.k : null };
}
let _jnyViewLogged = false;   // 홈 지도 노출은 페이지 로드당 한 번
function jnyLogHomeView() {
  if (_jnyViewLogged) return;
  const nodesEl = document.getElementById('journey-nodes');
  if (!nodesEl || !nodesEl.parentElement.clientWidth) return;   // 숨은 홈 탭이면 보일 때(다시 그릴 때) 기록
  _jnyViewLogged = true;
  const c = jnyProgressCount();
  jnyTrack('journey_home_viewed', {
    journey_grade: typeof getJourneyGrade === 'function' ? getJourneyGrade() : null,
    progress_pct: c.all ? Math.floor(c.open / c.all * 100) : 0,
    boost_active: jnyBoostLeft() > 0,
  });
}

// ── 여정 진행도 서버 동기화(B2, supabase/journey_progress.sql) — 홈 진입 때 한 번(home.js _journeyGate) ──
//  기기 기록(퀴즈 단계·설명 들음·완료 시각·피크 해제) 전체를 노드 id별로 올리고, 서버가 합친 결과로 기기 기록을 덮는다.
//  서버 규칙: 퀴즈 단계는 큰 값, 시각은 서버에 처음 들어온 서버 시각(이후 불변). 서버 시각과 기기 시각 차이는 jnyClockSkew로 저장해 타이머(jnyNow)에 반영.
//  비로그인(_peakRpc가 null)·dev 빌드(가짜 진행도 시드가 실제 계정에 올라가지 않게)는 건너뜀. 실패해도 기기 기록 그대로
let _jnySyncing = false;
async function jnySyncProgress() {
  if (_jnySyncing || jnyDev() || typeof _peakRpc !== 'function') return;
  _jnySyncing = true;
  try {
    const stars = jnyLoad(JNY_STARS_KEY), lec = jnyLoad(JNY_LEC_KEY), done = jnyLoad(JNY_STAR1_KEY), unlock = jnyLoad(JNY_UNLOCK_KEY);
    const ids = {};
    [stars, lec, done, unlock].forEach(function (o) { Object.keys(o).forEach(function (k) { ids[k] = true; }); });
    const items = Object.keys(ids).filter(function (id) { return /^[a-z0-9-]{1,40}$/.test(id); }).slice(0, 100).map(function (id) {
      return { id: id, q: Math.max(0, Math.min(3, Number(stars[id]) || 0)), lec: !!lec[id], done: !!done[id], unlock: !!unlock[id] };
    });
    const t0 = Date.now();
    const r = await _peakRpc('sync_journey_progress', { p_items: items });
    if (!r || !r.ok || !Array.isArray(r.items)) return;
    if (typeof r.now === 'number') {   // 응답 왕복 절반을 빼서 서버 시각 − 기기 시각
      try { localStorage.setItem(JNY_SKEW_KEY, String(Math.round(r.now - (t0 + Date.now()) / 2))); } catch (e) {}
    }
    const ns = Object.assign({}, stars), nl = Object.assign({}, lec), nd = Object.assign({}, done), nu = Object.assign({}, unlock);
    r.items.forEach(function (it) {
      if (!it || !it.id) return;
      if ((it.q || 0) > (Number(ns[it.id]) || 0)) ns[it.id] = it.q;
      if (it.lec) nl[it.id] = it.lec;
      if (it.done) nd[it.id] = it.done;
      if (it.unlock) nu[it.id] = it.unlock;
    });
    try {
      localStorage.setItem(JNY_STARS_KEY, JSON.stringify(ns));
      localStorage.setItem(JNY_LEC_KEY, JSON.stringify(nl));
      localStorage.setItem(JNY_STAR1_KEY, JSON.stringify(nd));
      localStorage.setItem(JNY_UNLOCK_KEY, JSON.stringify(nu));
    } catch (e) {}
    if (document.getElementById('journey-nodes')) renderJourney();   // 다른 기기 진행·서버 시각 반영
  } catch (e) {
  } finally { _jnySyncing = false; }
}

// ── 화면 밖 노드의 반복 애니메이션 멈춤(2026-11-25 홈 최적화) ──
//  계속 움직이는 노드(열린 노드 둥둥·받을 수 있는 상자 흔들림·반짝임)는 화면에 보일 때만 움직이고, 스크롤로 벗어나면 .is-offscreen으로 멈춘다(CSS animation-play-state)
let _jnyAnimIO = null;
function jnyWatchAnims(nodesEl) {
  if (_jnyAnimIO) { _jnyAnimIO.disconnect(); _jnyAnimIO = null; }
  if (typeof IntersectionObserver === 'undefined') return;
  const els = nodesEl.querySelectorAll('.journey-node--unlocked, .journey-node--box.journey-node--ready');
  if (!els.length) return;
  _jnyAnimIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('is-offscreen', !e.isIntersecting); });
  }, { root: nodesEl.closest('.journey-body, .cd-body') || null, rootMargin: '80px 0px' });
  els.forEach(function (el) { el.classList.add('is-offscreen'); _jnyAnimIO.observe(el); });
}

// ── 7일 부스트(홈 우상단 퀘스트 아래, 백엔드 계획서 B5 — supabase/journey_boost.sql) ──
//  계정당 한 번: 이번 버전을 처음 연 순간(홈 진입 때 get_or_start_boost) 서버 시각으로 7일 시작. 요금제와 무관하게 시계는 흐른다
//  (Pro 중에 7일이 지나면 나중에 Free가 돼도 부스트 없음 — 사용자 지정 2026-11-26).
//  효과: 앞 묶음 완료 시각 < 종료 시각이면 다음 설명 노드의 6시간 타이머 없음(jnyOpenAt). 피크 소모는 그대로. 끝나도 그때 열린 노드는 계속 열림.
//  표시: 불꽃 아래 남은 '일:시:분'. Pro(원래 타이머 없음)·종료 뒤·서버 값을 아직 모를 때는 숨김.
//  dev 빌드(로그인 우회)는 서버를 부르지 않고 이 기기에서 처음 본 시각 + 7일로 표시만(효과 없음)
const JNY_BOOST_KEY = 'chorditor_boost_start';     // dev 표시용(기기 기준 시작 시각)
const JNY_BOOST_END_KEY = 'chorditor_boost_end';   // 서버 종료 시각(ms)
const JNY_BOOST_MS = 7 * 24 * 60 * 60 * 1000;
let _jnyBoostTick = null;
function jnyBoostEnd() {   // 서버 종료 시각(ms). 모르면 0
  return parseInt(localStorage.getItem(JNY_BOOST_END_KEY) || '0', 10) || 0;
}
function jnyBoostLeft() {   // 남은 시간(ms). 모르면 0(숨김)
  if (jnyDev()) {
    let start = parseInt(localStorage.getItem(JNY_BOOST_KEY) || '0', 10);
    if (!start) { start = Date.now(); try { localStorage.setItem(JNY_BOOST_KEY, String(start)); } catch (e) {} }
    return start + JNY_BOOST_MS - Date.now();
  }
  const end = jnyBoostEnd();
  return end ? end - jnyNow() : 0;
}
// 서버에서 시작(처음이면)·조회 — 홈 진입 때 한 번(home.js _journeyGate). 비로그인·dev는 건너뜀
let _jnyBoostFetching = false;
async function jnyFetchBoost() {
  if (_jnyBoostFetching || jnyDev() || typeof _peakRpc !== 'function') return;
  _jnyBoostFetching = true;
  try {
    const r = await _peakRpc('get_or_start_boost');
    if (!r || !r.ok || !r.end) return;
    if (r.started) jnyTrack('journey_boost_started', { boost_end: new Date(r.end).toISOString(), plan: typeof getPlan === 'function' ? getPlan() : null });
    const prev = jnyBoostEnd();
    try { localStorage.setItem(JNY_BOOST_END_KEY, String(r.end)); } catch (e) {}
    if (typeof r.now === 'number') { try { localStorage.setItem(JNY_SKEW_KEY, String(r.now - Date.now())); } catch (e) {} }
    if (document.getElementById('journey-nodes')) { if (prev !== r.end) renderJourney(); else jnyRenderBoost(); }   // 종료 시각을 처음 알게 되면 타이머 면제가 바뀌니 지도도 다시
  } catch (e) {
  } finally { _jnyBoostFetching = false; }
}
function jnyFmtBoost(ms) {   // 일:시:분 — 예) 6:23:59
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  return d + ':' + String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function jnyRenderBoost() {
  const btn = document.getElementById('hs-boost');
  const el = document.getElementById('hs-boost-time');
  if (!btn || !el) return;
  const left = jnyBoostLeft();
  const isPro = typeof getPlan === 'function' && getPlan() === 'pro';
  btn.hidden = left <= 0 || isPro;   // Pro는 원래 타이머가 없어 부스트를 보여 주지 않음(시계는 계속 흐름)
  el.textContent = jnyFmtBoost(left);
  if (left > 0 && !_jnyBoostTick) _jnyBoostTick = setInterval(jnyRenderBoost, 30 * 1000);   // 분 단위 표시라 30초마다 다시 셈
  if (left <= 0 && _jnyBoostTick) { clearInterval(_jnyBoostTick); _jnyBoostTick = null; }
}

// ── 승급시험 버튼(홈 책 버튼 아래) ──
//  '여정 등급'의 시험(사용자 지정 2026-11-25) — 칭호(페르소나)와 따로 관리하는 여정 등급(shared.js getJourneyGrade)의 다음 단계 시험.
//  → mission-session.html?promo=1&journey=1(출제·합격 처리 모두 여정 등급 기준). 합격하면 여정 등급이 오르고, 칭호가 그보다 낮으면 칭호도 같이 오른다.
//  열림(사용자 지정 2026-11-25): 여정 등급 < 칭호 = 언제든 / 여정 등급 = 칭호 = 지금 여정 진행도 100%(배너 진행도와 같은 값) 뒤 / 마지막 단계(기타마스터) = 잠김.
//  단, 다음 등급의 여정이 아직 없으면(준비중) 위 조건과 상관없이 잠김
//  잠김: 흑백 + 자물쇠, 눌러도 반응 없음.
function jnyPromoOpen() {
  const g = PERSONA_STAGES.indexOf(getJourneyGrade()), u = PERSONA_STAGES.indexOf(getUserPersona());
  if (g >= PERSONA_STAGES.length - 1) return false;
  if (!JOURNEY_GRADES_WITH_CONTENT.includes(PERSONA_STAGES[g + 1])) return false;   // 다음 등급 여정이 아직 없으면(라벨 '준비중') 잠김 — 사용자 지정 2026-11-25
  if (g < u) return true;
  // 같을 때: 지도에 깔린 코스가 그 등급의 여정일 때만 진행도를 본다. 등급의 여정이 아직 없어 아래 등급 코스를 걷는 중이면(준비 중) 잠김 —
  //  안 그러면 이미 100%인 아래 등급 지도로 다음 시험이 또 열려, 콘텐츠 없이 연달아 승급할 수 있음
  if (getCurrentCurriculum().stage !== getJourneyGrade()) return false;
  const c = jnyProgressCount();
  return c.all > 0 && c.open >= c.all;
}
function jnyRenderPromoBtn() {
  const btn = document.getElementById('journey-promo-btn');
  if (!btn) return;
  btn.classList.toggle('is-locked', !jnyPromoOpen());
  // 라벨: 다음 등급의 여정이 아직 없으면 '준비중'(사용자 지정 2026-11-25), 있으면 '승급시험'. 열림·잠김은 위 규칙 그대로
  const next = PERSONA_STAGES[PERSONA_STAGES.indexOf(getJourneyGrade()) + 1];
  const label = btn.querySelector('.journey-promo-label');
  if (label) label.textContent = next && !JOURNEY_GRADES_WITH_CONTENT.includes(next) ? '준비중' : '승급시험';
}
function jnyOpenPromo() {
  jnyTrack('journey_promo_btn_tapped', { open: jnyPromoOpen(), journey_grade: getJourneyGrade(), user_persona: getUserPersona() });
  if (!jnyPromoOpen()) return;   // 잠김: 아무 반응 없음(토스트 없음 — 사용자 지정 2026-11-25)
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-exit');
  setTimeout(() => { location.href = 'mission-session.html?promo=1&journey=1'; }, 260);
}

// ── 훈련 연계 배너(2026-11-25) — 관련 노드 옆, 6줄 곡선이 반대쪽 끝으로 휘어 비는 자리에 작은 카드. 누르면 그 훈련으로 ──
//  구성(사용자 지정): [타이틀] / [훈련 세부내용] (해금 조건 줄은 뺌 — 해금 전엔 옅게, 눌러도 반응 없음). 내용은 아래 표만 고치면 된다.
//   at = 배너를 둘 노드 번호(1부터, 범위면 가운데 노드), after = 이 노드(묶음)를 마치면 해금, title·detail = 화면 문구, url = 훈련 화면
//   money: true = 세부내용·이동을 머니코드 진행 랜덤으로(jnyMoneyPick)
//  자리: 노드 at의 묶음(설명 + 퀴즈 1·2·3) 안에서 곡선이 가장 멀리 휜 노드를 골라 그 반대편, 그 노드 높이 가운데
const JNY_TRAIN_BANNERS = {
  comping: [
    { at: 8,  after: 8,  title: '코드 맞추기',     detail: '필수 코드',               url: 'chord-name-quiz.html' },   // 레벨 1 이름(chord-name-quiz.js LEVEL_CONFIGS id '1')
    { at: 11, after: 11, title: '코드반주 훈련',   money: true },   // 세부내용·이동 = 노드 11에서 배운 머니코드 진행 중 하나(세션마다 랜덤, jnyMoneyPick)
    { at: 13, after: 13, title: '리하모니 화성학', detail: '다이어토닉 코드의 이해',  url: 'chord-combo.html' },
    { at: 17, after: 19, title: '스케일 훈련',     detail: '메이저 펜타토닉 스케일',  url: 'scale-training.html' },   // 노드 15~19
  ],
  soloing: [
    { at: 7,  after: 9,  title: '스케일 훈련',     detail: '메이저 펜타토닉 스케일',  url: 'scale-training.html' },   // 노드 5~9
    { at: 15, after: 16, title: '스케일 훈련',     detail: '메이저 스케일',           url: 'scale-training.html' },   // 노드 14~16
    { at: 18, after: 18, title: '코드 맞추기',     detail: '필수 코드',               url: 'chord-name-quiz.html' },
    { at: 21, after: 21, title: '리하모니 화성학', detail: '다이어토닉 코드의 이해',  url: 'chord-combo.html' },
  ],
};
const JNY_TRAIN_BANNER_MAX_W = 168;
// 머니코드 진행(노드 11 '머니코드와 칼립소주법'에서 배운 3가지 × 배운 키 C·G) — 코드반주 훈련 연습 화면(chordplay-practice.html)으로 바로.
//  고른 값은 세션(sessionStorage — 앱·탭을 새로 열 때까지) 동안 유지, 새 세션이면 다시 랜덤
const JNY_MONEY_PROGS = [
  { id: 'I-V-VIm-IV', C: 'C G Am F', G: 'G D Em C' },
  { id: 'I-VIm-IV-V', C: 'C Am F G', G: 'G Em C D' },
  { id: 'IV-V-VIm-I', C: 'F G Am C', G: 'C D Em G' },
];
const JNY_MONEY_KEY = 'jnyMoneyPick';
function jnyMoneyPick() {
  let pick = null;
  try { pick = JSON.parse(sessionStorage.getItem(JNY_MONEY_KEY) || 'null'); } catch (e) {}
  if (!pick || !JNY_MONEY_PROGS[pick.i] || (pick.k !== 'C' && pick.k !== 'G')) {
    pick = { i: Math.floor(Math.random() * JNY_MONEY_PROGS.length), k: Math.random() < 0.5 ? 'C' : 'G' };
    try { sessionStorage.setItem(JNY_MONEY_KEY, JSON.stringify(pick)); } catch (e) {}
  }
  const pr = JNY_MONEY_PROGS[pick.i];
  return { detail: pr[pick.k], url: 'chordplay-practice.html?id=' + encodeURIComponent(pr.id) + '&key=' + (pick.k === 'G' ? 7 : 0) + '&flat=0' };
}
function jnyTrainBannersHtml(W, CX, A, G) {
  let html = '';
  (JNY_TRAIN_BANNERS[JNY_COURSE_KIND] || []).forEach(function (bn) {
    if (bn.money) bn = Object.assign({}, bn, jnyMoneyPick());
    const d = bn.at - 1;
    if (!JNY_COURSE[d]) return;
    let best = -1, bestAbs = -1;
    JNY_FLAT.forEach(function (it, p) {
      if (it.type === 'box' || it.d !== d) return;
      const a = Math.abs(Math.sin(Math.PI * p / JNY_N));
      if (a > bestAbs) { bestAbs = a; best = p; }
    });
    if (best < 0) return;
    const sin = Math.sin(Math.PI * best / JNY_N);
    const curveX = CX + A * sin;
    const reach = 2.5 * G + 34 + 12;   // 곡선 바깥 줄(퍼짐 2.5×G) + 노드 반폭 34 + 여유 12
    // 곡선이 오른쪽에 있으면 왼쪽 [0, curveX − reach], 왼쪽에 있으면 오른쪽 [curveX + reach, W]
    const lo = sin >= 0 ? 0 : curveX + reach, hi = sin >= 0 ? curveX - reach : W;
    const free = hi - lo;
    if (free < 120) return;   // 너무 좁으면 생략(작은 화면 대비)
    const bw = Math.min(JNY_TRAIN_BANNER_MAX_W, free - 8);
    const left = lo + (free - bw) / 2;
    const y = JNY_Y0 + best * JNY_S;
    const open = jnyUnitDone(bn.after - 1);
    html += '<button type="button" class="journey-train-banner cd-card' + (open ? '' : ' is-locked') + '" style="left:' + left.toFixed(1) + 'px;top:' + y + 'px;width:' + bw.toFixed(1) + 'px"'
      + ' data-url="' + bn.url + '" onclick="jnyOpenTraining(this)">'
      + '<span class="jtb-title">' + bn.title + '</span>'
      + (bn.detail ? '<span class="jtb-detail">' + bn.detail + '</span>' : '')
      + '</button>';
  });
  return html;
}
function jnyOpenTraining(btn) {
  jnyCloseBubble();
  jnyTrack('journey_train_banner_tapped', { training_url: (btn.dataset.url || '').split('?')[0], locked: btn.classList.contains('is-locked') });
  if (btn.classList.contains('is-locked')) return;   // 해금 전엔 반응 없음
  const url = btn.dataset.url;
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-exit');
  setTimeout(() => { location.href = url; }, 260);
}

// 진행도(배너 오른쪽 큰 숫자 + '진행도' 라벨) = 활성화된 노드 수 / 전체 노드 수(사용자 지정 2026-11-20).
//  활성화 = 열린 노드(잠금·타이머가 아닌 것 — 클리어한 노드 + 지금 플레이할 수 있는 노드). 노드 상태가 바뀌면 renderJourney가 다시 부름
//  노드 늘리기(2026-11-24): 설명·퀴즈 노드를 셈(피크상자 노드는 보상이라 빼고)
function jnyProgressCount() {   // 진행도 = 열린 노드 수 / 전체(피크상자 노드 제외) — 배너 진행도와 승급시험 열림(100%)이 같이 씀
  let open = 0, all = 0;
  JNY_FLAT.forEach(function (it, p) { if (it.type === 'box') return; all++; if (jnyItemState(it, p) === 'open') open++; });
  return { open: open, all: all };
}
function renderJourneyProgress(done, total) {
  const c = jnyProgressCount();
  const d = done ?? c.open, t = total ?? c.all;
  // 퍼센트 + 게이지(2026-11-25 — 노드가 늘어 '81' 같은 전체 수는 학습자에게 부담이라 비율로만). 내림 — 다 열기 전엔 100%가 안 나오게
  const pct = t > 0 ? Math.floor(d / t * 100) : 0;
  const elPct = document.getElementById('jhs-pct');
  const elFill = document.getElementById('jhs-fill');
  if (elPct) elPct.textContent = pct + '%';
  if (elFill) elFill.style.width = pct + '%';
}

// ── 노드 말풍선: 노드를 누르면 아래에 [제목 + 시작하기]. 같은 노드를 다시 누르거나 바깥을 누르면 닫힌다 ──
let _jnyBubbleIdx = -1;

function jnyCloseBubble() {
  document.getElementById('journey-bubble')?.remove();
  _jnyBubbleIdx = -1;
  jnyFitBubble();
}
// 말풍선이 경로(스테이지) 아래 끝을 넘으면 스테이지를 말풍선 아래 끝까지 늘림 — 맨 아래 노드의 말풍선이 스크롤 영역 끝(하단 독바 바로 위)에서 잘리지 않게(사용자 지적 2026-11-20).
//  늘린 만큼 스크롤할 수 있게 되고, 그 아래 스크롤 영역 아래 여백(.journey-body padding-bottom 24px)이 독바와의 간격·그림자 자리. 닫으면 원래 높이
function jnyFitBubble() {
  const stage = document.getElementById('journey-stage');
  if (!stage || !stage.dataset.h) return;
  const base = +stage.dataset.h, b = document.getElementById('journey-bubble');
  const need = b ? b.offsetTop + b.offsetHeight : 0;
  stage.style.height = Math.max(base, need) + 'px';
}

function jnyOpenBubble(i) {
  const nodesEl = document.getElementById('journey-nodes');
  const node = nodesEl?.querySelector('.journey-node[data-idx="' + i + '"]');
  const fi = JNY_FLAT[i];   // i = 지도 노드 순번(JNY_FLAT)
  const item = fi && JNY_COURSE[fi.d];
  if (!node || !item || fi.type === 'box') return;
  jnyCloseBubble();
  const W = nodesEl.parentElement.clientWidth;
  const x = node.offsetLeft, y = node.offsetTop;   // 노드 중심(노드는 margin으로 중심 정렬)
  const bw = JNY_BUBBLE_W;
  const left = Math.max(8, Math.min(x - bw / 2, W - bw - 8));
  const el = document.createElement('div');
  el.id = 'journey-bubble';
  el.className = 'journey-bubble';
  el.style.left = left + 'px';
  el.style.width = bw + 'px';
  el.style.top = (y + 46) + 'px';   // 노드 아래끝(옆면 포함 약 y+34) 밑 + 꼬리 자리 12(별 호 보류 — 노드 늘리기 2026-11-24)
  el.style.setProperty('--jb-tail-x', (x - left) + 'px');
  // 말풍선(노드 늘리기 2026-11-24): 설명 노드 = 처음 [시작하기](설명 → 퀴즈 1), 들은 뒤 [설명 다시듣기] 하나 / 퀴즈 노드 = 제목 아래 '퀴즈 k' + [퀴즈 풀기], 클리어 뒤 [다시 풀기](그 노드 난이도 그대로)
  //  '퀴즈'는 따로 span(번역 사전이 숫자 없는 낱말로 찾게)
  const btn = function (label, args) { return '<button type="button" class="cd-btn cd-btn--blue journey-bubble-btn" onclick="jnyStartNode(' + args + ')">' + label + '</button>'; };
  el.innerHTML = '<div class="journey-bubble-head"><div class="journey-bubble-title">' + item.title + '</div>'
    + (fi.type === 'quiz' ? '<div class="journey-bubble-prog"><span>퀴즈</span> ' + fi.k + '</div>' : '') + '</div>'
    + (fi.type === 'quiz'
      ? btn(jnyItemDone(fi) ? '다시 풀기' : '퀴즈 풀기', fi.d + ', &quot;quiz&quot;, ' + fi.k)
      : jnyLecDone(fi.d) ? btn('설명 다시듣기', fi.d + ', &quot;replay&quot;') : btn('시작하기', fi.d));
  nodesEl.appendChild(el);
  _jnyBubbleIdx = i;
  jnyFitBubble();   // 스크롤(jnyScrollToNode)보다 먼저 — 늘린 높이로 스크롤 끝을 계산하게
}

// 시작하기 — 노드 강의 페이지(journey-lesson.html)로. 코스는 지금 코드반주만 있음.
// i = 묶음 순번(JNY_COURSE). mode: 없음 = 처음(강의 → 퀴즈 1) / 'quiz' = 퀴즈 노드 k(star=k — 그 단계 퀴즈만, journey-lesson.js quizStar) / 'replay' = 설명만 다시
function jnyStartNode(i, mode, k) {
  jnyCloseBubble();
  jnyTrack('journey_node_started', { node_id: JNY_COURSE[i] ? JNY_COURSE[i].id : null, day: i + 1, mode: mode || 'first', quiz_k: k || null });
  const url = 'journey-lesson.html?course=' + JNY_COURSE_KIND + '&day=' + (i + 1) + (mode ? '&' + mode + '=1' : '') + (k ? '&star=' + k : '');
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-exit');
  setTimeout(() => { location.href = url; }, 260);
}

// ── 지도로 돌아왔을 때: 방금 클리어한 노드로 스크롤 + 새로 열린 노드 연출(노드 늘리기 2026-11-24 — 퀴즈 1을 마치면 지도로 나옴) ──
//  지도에서 마지막으로 본 진행(완료한 노드 수 / 잠금이 풀린 노드 수 — 둘 다 앞에서부터 차례로 차는 값)을 코스별로 기억해 두고, 다시 그릴 때 늘었으면 한 번 보여 줌.
//  강의·퀴즈 어느 쪽에서 끝났든(퀴즈 1·2·3, 퀴즈 없는 노드의 설명) 같은 경로. 처음 보는 지도(기록 없음)는 지금 위치만 기록. 폭이 0(숨은 홈 탭)이면 건너뜀(보일 때 home.js가 다시 그림)
const JNY_SEEN_KEY = 'jnySeen:' + JNY_COURSE_KIND;
function jnyShowNews() {
  const nodesEl = document.getElementById('journey-nodes');
  if (!nodesEl || !nodesEl.parentElement.clientWidth) return false;
  let done = 0, unl = 0, lastDone = -1;
  const opened = [];
  JNY_FLAT.forEach(function (it, p) {
    if (it.type === 'box') return;
    if (jnyItemDone(it)) { done++; lastDone = p; }
    if (jnyItemState(it, p) !== 'locked') opened.push(p);
  });
  unl = opened.length;
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(JNY_SEEN_KEY) || 'null'); } catch (e) {}
  try { localStorage.setItem(JNY_SEEN_KEY, JSON.stringify({ done: done, unl: unl })); } catch (e) {}
  if (!seen || done <= seen.done || lastDone < 0) return false;
  const target = nodesEl.querySelector('.journey-node[data-idx="' + lastDone + '"]');
  const fresh = opened.slice(seen.unl || 0);   // 이번에 잠금이 풀린 노드(타이머 상태로 열린 설명 노드 포함)
  fresh.forEach(function (p) { nodesEl.querySelector('.journey-node[data-idx="' + p + '"]')?.classList.add('journey-node--pre'); });   // 연출 전에는 잠긴 모습처럼 숨겨 둠
  requestAnimationFrame(function () {
    if (target) jnyScrollToNode(target);
    setTimeout(function () {   // 스크롤이 거의 끝난 뒤 — 방금 클리어한 노드 다음의 새 노드가 '열리는' 연출
      fresh.forEach(function (p, n) {
        const el = nodesEl.querySelector('.journey-node[data-idx="' + p + '"]');
        if (!el) return;
        setTimeout(function () {
          el.classList.remove('journey-node--pre');
          el.classList.add('journey-node--opening');
          el.addEventListener('animationend', function h(e) { if (e.target !== el) return; el.removeEventListener('animationend', h); el.classList.remove('journey-node--opening'); });
        }, n * 160);
      });
    }, 520);
  });
  jnyHomeTouch();   // 연출로 보여 준 것도 홈 세션 시작
  return true;
}

// ── 홈 세션 만료 → 지금 할 노드로(사용자 지정 2026-11-25) ──
//  세션 = 홈(여정 지도)에서 마지막으로 조작(스크롤·탭)한 뒤 30분 안(분석 세션 analytics-sdk.js SESSION_TIMEOUT_MS와 같은 기준). 페이지를 새로 불러오면(앱 재시작·강의에서 돌아옴) 기록이 없으니 만료.
//  만료 뒤 홈 탭을 보는 순간 '가장 마지막 활성 노드'(잠금이 풀린 마지막 설명·퀴즈 노드 = 지금 할 노드, 타이머 중인 설명 노드 포함)를 화면 가운데로 바로 옮김. 세션 안이면 보던 위치 그대로.
//  방금 클리어한 노드 연출(jnyShowNews)이 있으면 그쪽이 먼저(renderJourney)
const JNY_HOME_SESSION_MS = 30 * 60 * 1000;
let _jnyHomeLast = 0;   // 메모리에만 — 페이지를 새로 불러오면 0(= 만료)
let _jnyEntering = false;   // 홈 탭을 막 보여 주는 중(home.js switchTab·journey.html 진입이 jnyMarkEnter로 켬) — 그때만 판단. 크기 변경·타이머 끝·상자 수령 같은 다시 그리기에선 스크롤을 옮기지 않음
function jnyMarkEnter() { _jnyEntering = true; }
function jnyHomeTouch() { _jnyHomeLast = Date.now(); }
function jnyFocusIfExpired() {
  const nodesEl = document.getElementById('journey-nodes');
  if (!_jnyEntering || !nodesEl || !nodesEl.parentElement.clientWidth) return;   // 숨은 홈 탭(폭 0)은 건너뜀 — 보일 때 home.js가 다시 그림
  _jnyEntering = false;
  const expired = !_jnyHomeLast || Date.now() - _jnyHomeLast > JNY_HOME_SESSION_MS;
  jnyHomeTouch();
  if (!expired) return;
  let last = -1;
  JNY_FLAT.forEach(function (it, p) { if (it.type !== 'box' && jnyItemState(it, p) !== 'locked') last = p; });
  const node = last >= 0 && nodesEl.querySelector('.journey-node[data-idx="' + last + '"]');
  if (node) jnyScrollToNode(node, true);
}
// 홈 지도에서의 조작 = 세션 이어짐(스크롤은 거품이 안 올라와 캡처로 받음)
document.addEventListener('scroll', function (e) { if (e.target && e.target.closest && e.target.closest('.journey-body, .journey-page .cd-body')) jnyHomeTouch(); }, true);
document.addEventListener('pointerdown', function (e) { if (e.target.closest?.('.journey-body, .journey-page .cd-body')) jnyHomeTouch(); }, true);

// 피크상자 노드 받기 — 상자 1개(노드 늘리기 2026-11-24). 서버 RPC(계정당 키 1회 — supabase/journey_peakbox.sql) 우선, 로그인 전·DB 미감지면 기기 폴백(앱 공용 퀘스트 수령과 같은 방식)
let _jnyClaiming = false;
async function jnyClaimBox(b) {
  if (_jnyClaiming || jnyBoxClaimed(b)) return;
  _jnyClaiming = true;
  try {
    const key = jnyBoxKey(b);
    const r = typeof _peakRpc === 'function' ? await _peakRpc('claim_journey_peakbox', { p_key: key }) : null;
    let got = 0;
    jnyTrack('journey_box_claimed', { box_index: b, result: r ? (r.ok ? 'ok' : (r.reason || 'failed')) : (typeof getStoredAuth === 'function' && getStoredAuth().token && !jnyDev() ? 'network_failed' : 'local') });
    if (r) {
      if (!r.ok && r.reason !== 'already') return;   // 그 밖의 실패(계정 행 없음 등)는 받지 않은 채로 둠
      if (r.ok) { got = 1; if (typeof _peakState !== 'undefined') _peakState = Object.assign({}, _peakState, { peakbox_count: r.peakbox_count != null ? r.peakbox_count : (_peakState.peakbox_count || 0) + 1, loaded: true }); }
    } else if (typeof getStoredAuth === 'function' && getStoredAuth().token && !jnyDev()) {
      return;   // 로그인 유저인데 서버 응답 실패(네트워크 등) — 기기에만 주면 서버 값에 덮여 사라지므로(유령 상자) 받지 않은 채로 두고 다시 누르게 함
    } else if (typeof _localPeakGet === 'function') {   // 비로그인·dev: 기기 폴백
      const l = _localPeakGet();
      _localPeakSet(l.balance, l.peakbox_count + 1);
      if (typeof _peakState !== 'undefined') _peakState = Object.assign({}, _peakState, { peakbox_count: (_peakState.peakbox_count || 0) + 1, loaded: true });
      got = 1;
    }
    const o = jnyLoad(JNY_BOX_KEY);
    o[key] = Date.now();   // 'already'(다른 기기에서 받음)도 받은 것으로
    try { localStorage.setItem(JNY_BOX_KEY, JSON.stringify(o)); } catch (e) {}
    if (typeof renderPeakboxBadge === 'function') renderPeakboxBadge();
    renderJourney();
    if (got && typeof showPeakboxRewardModal === 'function') showPeakboxRewardModal(got);
  } finally { _jnyClaiming = false; }
}

// 노드를 누르면 그 노드로 자동 스크롤(사용자 지정 2026-11-15) — 노드(+ 별 + 열린 말풍선) 묶음이 스크롤 영역의 세로 가운데에 오도록 부드럽게.
//  스크롤 영역 = 노드를 감싼 .journey-body(홈 탭) 또는 .cd-body(journey.html 단독 페이지). 맨 위·맨 아래 노드는 브라우저가 스크롤 끝에서 멈춤
function jnyScrollToNode(node, instant) {   // instant: 애니메이션 없이 바로(홈 세션 만료 뒤 처음 보여 줄 때)
  const sc = node.closest('.journey-body, .journey-page .cd-body');
  if (!sc) return;
  const scR = sc.getBoundingClientRect(), nR = node.getBoundingClientRect();
  const bubble = document.getElementById('journey-bubble');
  const top = nR.top;
  const bottom = bubble ? bubble.getBoundingClientRect().top + bubble.offsetHeight : nR.bottom + 20;   // 말풍선이 없으면 노드 아래 별 호까지(노드 아래 약 20px). 말풍선은 위쪽 기준으로 커지며 나타나 등장 중 높이가 작게 재지므로 실제 높이(offsetHeight)로
  const target = sc.scrollTop + (top + bottom) / 2 - (scR.top + scR.height / 2);
  sc.scrollTo({ top: Math.max(0, target), behavior: instant ? 'auto' : 'smooth' });
}

document.addEventListener('click', e => {
  const node = e.target.closest?.('.journey-node');
  if (node && node.closest('#journey-nodes')) {
    const i = Number(node.dataset.idx);   // 지도 노드 순번(JNY_FLAT)
    const it = JNY_FLAT[i];
    if (!it) return;
    const st = jnyItemState(it, i);
    jnyTrack('journey_node_tapped', Object.assign(jnyItemProps(it), { state: st }));
    if (it.type === 'box') { jnyCloseBubble(); jnyScrollToNode(node); if (st === 'ready') jnyClaimBox(it.b); return; }   // 상자 노드는 말풍선 없음 — 받을 수 있으면 바로 받기, 아니면 스크롤만
    if (st === 'locked') { jnyCloseBubble(); jnyScrollToNode(node); return; }   // 잠긴 노드는 아무것도 열지 않음(스크롤만)
    if (st === 'timer') { jnyCloseBubble(); jnyScrollToNode(node); jnyAskUnlock(it.d); return; }   // 타이머는 설명 노드에만(묶음 순번으로 해제)
    if (i === _jnyBubbleIdx) jnyCloseBubble(); else { jnyOpenBubble(i); jnyScrollToNode(node); }   // 말풍선을 닫는 탭은 스크롤 안 함
    return;
  }
  if (_jnyBubbleIdx >= 0 && !e.target.closest?.('#journey-bubble')) jnyCloseBubble();
});

function closeJourney() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let _rt = null;
  window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(renderJourney, 120); });

  // 홈 탭(home.html)에 임베드된 경우: 페이지 초기화(커버·진입 애니메이션)는 home.js 몫이고,
  // 경로 렌더는 홈 탭이 보일 때 home.js가 renderJourney()를 부른다(숨겨진 동안은 폭이 0이라 재야 한다).
  if (!document.body.classList.contains('journey-page')) return;

  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  jnyMarkEnter();   // 단독 페이지 진입 = 새 홈 세션
  renderJourney();

  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
});
