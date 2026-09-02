// ═══════════════════════════════════════════════════════════════
// mission-session.js — 데일리 미션 문제풀이 공용 세션 셸
// ═══════════════════════════════════════════════════════════════

// ── 세션 기록 ────────────────────────────────────────────────
// 결산 화면(msShowResultView)에서 점수/상세를 뽑아 쓰는 원본. 각 훈련 채점 시점에 push
const _msRecords = { quiz: [], scale: [], combo: [] };
// 페르소나 — id는 shared.js PERSONA_STAGES / DB(subscriptions.persona)와 동일 표기(언더스코어).
const MS_PERSONA_DEFAULT = 'unboxing';

// ⚠ DEV ONLY — 출시 전 제거할 것. 콘솔에서 페르소나를 강제로 바꿔 테스트하기 위한 훅.
//    msSetPersona('guitar_master') → 저장 후 새로고침 / msSetPersona(null) → 기본값(언박싱) 복귀
//    msPersonaList() → 사용 가능한 id 목록
// 2026-08-28: 별도 override 키(ms_persona_override) 폐지 — 항상 실제 저장값(user_persona,
// shared.js setUserPersona()와 동일 키)을 직접 씀. 프로필 화면과 미션 세션이 다른 값을 보는
// 사고(override값 기준으로 승급 커밋되는 등) 방지 — 무조건 프로필에 보이는 페르소나로 동작.
window.msSetPersona = function (id) {
  if (typeof _isAdminUser === 'function' && !_isAdminUser()) { console.error('[MissionSession] 관리자 계정에서만 사용 가능합니다.'); return; }
  if (id && !MS_PERSONA_POOLS[id]) {
    console.error(`[MissionSession] 없는 페르소나: "${id}"`, Object.keys(MS_PERSONA_POOLS));
    return;
  }
  if (typeof setUserPersona === 'function') setUserPersona(id || MS_PERSONA_DEFAULT);
  else localStorage.setItem('user_persona', id || MS_PERSONA_DEFAULT); // shared.js 미로딩 대비 폴백
  console.log(`[MissionSession] 페르소나 → ${id || MS_PERSONA_DEFAULT} (새로고침합니다)`);
  location.reload();
};
window.msPersonaList = function () {
  console.table(Object.entries(MS_PERSONA_POOLS).map(([id, p]) => ({
    id, 이름: p.label, 코드: p.chords.length, 스케일: p.scaleBlocks.length,
    조합장: p.comboChapters.join(','), 튜토리얼: p.tutorial ? 'O' : 'X',
  })));
};

// ⚠ DEV ONLY — 출시 전 제거할 것. 오늘 미션을 이미 끝낸 상태를 지워서 몇 번이든 다시
// 풀 수 있게 함. 지우는 키 4종:
//  ms_today_result       — 오늘 결산(daily-mission.js 게이트가 이걸로 "이미 끝냈나" 판정)
//  ms_today_result_seen  — 결산화면을 이미 봤는지(재접속 시 자동으로 다시 안 뜨게 하는 구분값)
//  ms_reward_claimed     — 오늘 보상 수령 여부(하루 1회 제한)
//  chorditor_dm_cleared_date — "나중에 할게요" 패스 여부
// msResetToday() → 콘솔에서 실행 후 mission-session.html 새로고침(또는 daily-mission.html부터 재진입)
window.msResetToday = function () {
  if (typeof _isAdminUser === 'function' && !_isAdminUser()) { console.error('[MissionSession] 관리자 계정에서만 사용 가능합니다.'); return; }
  ['ms_today_result', 'ms_today_result_seen', 'ms_reward_claimed', 'chorditor_dm_cleared_date'].forEach(k => localStorage.removeItem(k));
  console.log('[MissionSession] 오늘 미션 상태 초기화 완료 — 새로고침하면 처음부터 다시 풀 수 있습니다.');
  location.reload();
};

// 실제 소스는 shared.js getUserPersona()(localStorage 캐시, home.js가 DB subscriptions.persona에서
// 내려받아 동기화해둠) — 다른 유저 데이터(XP 등)와 동일하게 localStorage가 일상 source of truth.
// 프로필 화면(persona-track)이 보는 값과 항상 동일 — 별도 dev override 없음.
const MS_PERSONA = {
  id: typeof getUserPersona === 'function' ? getUserPersona() : MS_PERSONA_DEFAULT,
  canDowngrade: false, // 아래서 id 확정 후 갱신(언박싱1일차는 강등할 아래 단계가 없음)
};
// 문제풀은 mission-persona-pools.js에서 페르소나 id로 조회 (내용 추가는 그 파일에서만)
if (!MS_PERSONA_POOLS[MS_PERSONA.id]) {
  console.warn(`[MissionSession] getUserPersona()가 알 수 없는 id "${MS_PERSONA.id}" 반환 — 기본값으로 진행`);
  MS_PERSONA.id = MS_PERSONA_DEFAULT;
}
MS_PERSONA.canDowngrade = MS_PERSONA.id !== MS_PERSONA_DEFAULT;
const MS_POOL = MS_PERSONA_POOLS[MS_PERSONA.id];

// 페르소나별 데일리미션 문항 수(코드맞추기/스케일/코드조합) — 기본값(컴핑 선호 기준).
// null/comping 유저는 이 값 그대로 사용. soloing/harmony는 MS_DAILY_TOTALS_BY_PREF에
// override 있으면 그걸 쓰고 없으면 이 기본값으로 폴백(2026-08-29, [[persona_clustering_pipeline_plan]]).
const MS_DAILY_TOTALS = {
  unboxing:     { quiz: 10, scale: 2, combo: 3 },
  beginner:     { quiz: 12, scale: 3, combo: 5 },
  sheet_reader: { quiz: 15, scale: 5, combo: 5 },
  home_master:  { quiz: 15, scale: 5, combo: 5 },
  guitar_master:{ quiz: 15, scale: 7, combo: 8 },
};
// 성향별 override — soloing/harmony 확정(2026-08-29). scale 최대 8, combo 최대 12 상한,
// 각각 quiz에서 당겨와 재분배해 총합은 컴핑 기준과 동일하게 유지.
const MS_DAILY_TOTALS_BY_PREF = {
  soloing: {
    unboxing:      { quiz: 5,  scale: 7, combo: 3 },
    beginner:      { quiz: 7,  scale: 8, combo: 5 },
    sheet_reader:  { quiz: 12, scale: 8, combo: 5 },
    home_master:   { quiz: 12, scale: 8, combo: 5 },
    guitar_master: { quiz: 15, scale: 8, combo: 7 },
  },
  harmony: {
    unboxing:      { quiz: 7,  scale: 2, combo: 6 },
    beginner:      { quiz: 8,  scale: 3, combo: 9 },
    sheet_reader:  { quiz: 9,  scale: 5, combo: 11 },
    home_master:   { quiz: 9,  scale: 5, combo: 11 },
    guitar_master: { quiz: 11, scale: 7, combo: 12 },
  },
};
function _msGetDailyTotals(personaId) {
  const base = MS_DAILY_TOTALS[personaId] || MS_DAILY_TOTALS[MS_PERSONA_DEFAULT];
  const pref = localStorage.getItem('user_pref_type'); // null/'comping'이면 base 그대로
  const override = (pref && MS_DAILY_TOTALS_BY_PREF[pref]) ? MS_DAILY_TOTALS_BY_PREF[pref][personaId] : null;
  return override || base;
}
const _msDailyTotals = _msGetDailyTotals(MS_PERSONA.id);


// 디버그 플로팅 칩(🐞)은 shared.js _sharedInitDebugChip()으로 이전됨(2026-08-31) —
// home.html 포함 모든 페이지에서 뜨도록. 이 파일엔 승급시험 미리보기용 함수들만 남아있고,
// shared.js 쪽이 typeof 가드로 이 페이지에 있을 때만 그 버튼들을 노출한다.

// 튜토리얼 페이지는 언박싱 1일차 전용 — 그 외 페르소나는 각 파트에서 바로 문제풀이로 들어감
function _msEnterPart(tutorialFn, quizFn, stage) {
  if (stage) _msTrackStage(stage);
  _msTransitionView(MS_POOL.tutorial ? tutorialFn : quizFn);
}

// ── 퍼널 분석용 단계진입/이탈 로그(2026-08-29) ──────────────────
// 단계 하나(buffer/quiz/scale/combo)당 1회만 쏨. result는 daily_mission_completed가
// 대신함(완주=result 도달이라 별도 이벤트 불필요).
let _msLastStage = null;
const _msStageTracked = new Set();
function _msTrackStage(stage) {
  _msLastStage = stage;
  if (_msStageTracked.has(stage)) return; // 같은 단계 중복진입(리뷰 등) 방지
  _msStageTracked.add(stage);
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_stage_entered', { stage });
}

// 이탈 로그(daily_mission_abandoned)는 아래 _msSendAbandonLogs()에서 승급시험분과 함께 처리.

// ── 승급시험 퍼널 로그(2026-08-29) — 데일리미션과 별도 흐름이라 상태도 분리 ──
let _msPromoActive = false;      // msShowPersonaPromoIntro 진입~성공/실패화면 도달 사이 true
let _msPromoLastStage = null;    // intro/quiz/scale/combo
let _msPromoFromPersona = null;  // 시험 시작 시점의 현재 페르소나(성공해도 바뀌므로 미리 저장)
function _msTrackPromoStage(stage) {
  _msPromoActive = true;
  _msPromoLastStage = stage;
  if (typeof analytics !== 'undefined') analytics.track('persona_promo_stage_entered', { stage });
}
function _msTrackPromoSectionResult(section, correct, total) {
  if (typeof analytics === 'undefined') return;
  const sec = _msPromoSections().find(s => s.key === section);
  const cutoff = sec ? sec.cutoff : null;
  analytics.track('persona_promo_section_completed', {
    section, correct, total, cutoff,
    passed: cutoff != null ? correct >= cutoff : null,
  });
}
// ── 이탈 로그 전송(데일리미션 + 승급시험 공통, 2026-09-02 수정) ────────────────
// 기존엔 각각 pagehide에만 걸려 있었는데 두 가지 이유로 거의 안 찍혔다:
//  1) 안드로이드는 홈버튼/앱전환 시 pagehide가 안정적으로 안 뜬다 — SDK도 같은 이유로
//     네이티브에선 Capacitor appStateChange를 쓴다(analytics-sdk.js _setupLifecycleListeners).
//  2) 떠도 SDK의 pagehide 리스너가 먼저 등록돼 있어 큐를 먼저 비우고 가버려서,
//     그 뒤에 track()으로 들어간 이탈 이벤트는 전송되지 못한 채 폐기됐다.
// → 네이티브/웹 양쪽 진입점을 다 걸고, track() 직후 analytics.flush()로 직접 마무리한다.
let _msLeaveLogged = false; // 한 번의 이탈에서 pagehide/appStateChange 중복 발화 방지
function _msSendAbandonLogs() {
  if (_msLeaveLogged) return;
  if (typeof analytics === 'undefined') return;

  let sent = false;
  if (!_msResultReached && _msLastStage) {
    analytics.track('daily_mission_abandoned', { last_stage: _msLastStage });
    sent = true;
  }
  if (_msPromoActive && _msPromoLastStage) {
    analytics.track('persona_promo_abandoned', { last_stage: _msPromoLastStage, from_persona: _msPromoFromPersona });
    sent = true;
  }
  if (!sent) return;

  _msLeaveLogged = true;
  analytics.flush?.(); // SDK 리스너가 이미 큐를 비운 뒤일 수 있으므로 직접 전송
}

window.addEventListener('pagehide', _msSendAbandonLogs);

if (window.Capacitor?.Plugins?.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) _msLeaveLogged = false; // 복귀 후 다시 이탈하면 그 시점도 남긴다
    else _msSendAbandonLogs();
  });
}

// 코드 조합 훈련 대상 key(C/D/E/G/A) — 데일리미션 시작 시 1개만 랜덤 선택해서 세션 내내 고정
const MS_COMBO_KEY_IDX_MAP = { C: 0, D: 2, E: 4, G: 7, A: 9 };
let _msComboSessionKey = 'C';

// ── 단계 전환 슬라이드 ────────────────────────────────────────
// .ms-scroll-inner(타이틀+메인영역) 한 장을 왼쪽으로 밀어낸 뒤 콘텐츠를 교체하고
// 오른쪽에서 되들여옴. render()는 out 애니메이션이 끝난 뒤(=화면에 안 보일 때) 실행
const MS_VIEW_OUT_MS = 200; // style.css ms-view-out 길이와 동일해야 함
const MS_VIEW_IN_MS  = 260; // style.css ms-view-in 길이와 동일 — 튜토리얼 스태거를 이 뒤에 시작시키는 데 씀
function _msTransitionView(render) {
  // 페이지전환은 전부 여기 한 곳을 거치므로, 이전 화면에서 재생 중이던 사운드를 여기서
  // 끊는다. 일반 퀴즈흐름은 호출 직전에 개별로도 GuitarAudio.stop()을 부르지만(중복 호출,
  // 무해), 승급시험 흐름엔 그게 하나도 없어서 결과화면까지 소리가 이어지던 버그가 있었음(2026-08-31).
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  const inner = document.querySelector('.ms-scroll-inner');
  if (!inner) { render(); return; }
  inner.classList.remove('ms-view-in');
  inner.classList.add('ms-view-out');
  setTimeout(() => {
    render();
    const scroll = document.querySelector('.ms-scroll');
    if (scroll) scroll.scrollTop = 0;
    inner.classList.remove('ms-view-out');
    inner.classList.add('ms-view-in');
    // forwards로 남는 transform이 stacking context를 계속 만들지 않도록 끝나면 클래스 제거
    inner.addEventListener('animationend', () => inner.classList.remove('ms-view-in'), { once: true });
  }, MS_VIEW_OUT_MS);
}

// 문제 간 전환 — 뷰 전체가 아니라 문제영역 엘리먼트 하나만 빠르게 밀어냈다 되들임
const MS_Q_OUT_MS = 110; // style.css ms-q-out 길이와 동일해야 함
function _msTransitionQuestion(selector, render) {
  const el = document.querySelector(selector);
  if (!el) { render(); return; }
  el.classList.remove('ms-q-in');
  el.classList.add('ms-q-out');
  setTimeout(() => {
    render();
    el.classList.remove('ms-q-out');
    el.classList.add('ms-q-in');
    el.addEventListener('animationend', () => el.classList.remove('ms-q-in'), { once: true });
  }, MS_Q_OUT_MS);
}

// ── 준비/로딩 버퍼 뷰 ──────────────────────────────────────────
// 실제 로딩 시간과 무관하게 최소 MS_BUFFER_DURATION 동안 붙잡아두는 의도적 버퍼.
// 목적 ① 유저가 기타를 가지러 갈 시간 확보 ② (추후) 유저 성향 데이터 fetch
const MS_BUFFER_DURATION = 5000; // ms
const MS_BUFFER_STATUS = [
  '학습 데이터를 불러오는 중',
  '실력에 맞는 문제를 고르는 중',
  '오늘의 미션을 준비하는 중',
];
let _msBufferStatusTimer = null;
let _msBufferDoneTimer   = null;

function _msStartBuffer() {
  _msTrackStage('buffer');
  const statusEl = document.getElementById('ms-buffer-status');
  let i = 0;
  const stepMs = MS_BUFFER_DURATION / MS_BUFFER_STATUS.length;
  _msBufferStatusTimer = setInterval(() => {
    i++;
    if (i >= MS_BUFFER_STATUS.length) { clearInterval(_msBufferStatusTimer); return; }
    if (statusEl) statusEl.textContent = MS_BUFFER_STATUS[i];
  }, stepMs);

  _msBufferDoneTimer = setTimeout(() => {
    clearInterval(_msBufferStatusTimer);
    // 튜토리얼을 안 쓰는 페르소나는 시작버튼을 거치지 않으므로 세션 초기화를 여기서 직접 수행
    _msEnterPart(msShowChordTutorial, () => { _msBeginSession(); msShowPreQuizCountdown(); }, 'quiz');
  }, MS_BUFFER_DURATION);
}

// 타이틀 왼쪽 훈련 아이콘 — 파트별 홈배너/훈련카드와 같은 아이콘·컬러로 통일
function _msSetTitleIcon(iconClass, color) {
  const el = document.getElementById('ms-title-icon');
  if (!el) return;
  el.innerHTML = `<i class="${iconClass}" style="color:${color}"></i>`;
  el.style.display = '';
}
// 튜토리얼 뷰에서만 아이콘 노출 — 문제풀이/결산 뷰 진입 시 끔
function _msHideTitleIcon() {
  const el = document.getElementById('ms-title-icon');
  if (el) el.style.display = 'none';
}

// ── 튜토리얼: 타이틀→본문→메인 순차 등장 + 시작버튼 지연노출 ──────────
// 정보를 한번에 다 던지면 유저가 버튼만 보고 누른다는 지인테스트 관찰 → 위에서부터
// 순서대로 눈에 들어오게 하고, 시작버튼은 가로카드를 실제로 만져보거나(즉시) 아니면
// 일정 시간(fallback) 지나야 뜨게 해서 최소한의 열람을 유도한다. 완전 강제 게이트는
// 스크롤이 필요 없는 넓은 화면(태블릿/데스크탑)에서 영영 안 풀릴 수 있어 fallback 필수.
//
// 타이틀이 끝나야 본문 시작, 본문이 끝나야 메인 시작 — 진짜 순차(각자 애니메이션 재생
// 완료를 기다림). 요소별 재생시간·간격을 따로 튜닝할 수 있게 개별 상수로 뺌.
// 1초 간격을 그냥 대기시간으로 날리지 않고 애니메이션 자체가 거의 다 채우도록
// (재생 900ms + 여백 100ms = 1초) — 이징으로 천천히 올라오는 느낌을 줌
const MS_STAGGER_TITLE_DUR = 900; // ms — 타이틀 자체 애니메이션 길이
const MS_STAGGER_DESC_DUR  = 900;
const MS_STAGGER_MAIN_DUR  = 900;
const MS_STAGGER_GAP       = 100; // ms — 애니메이션 끝난 뒤 다음 시작까지의 짧은 여백

// 반환값: 메인까지 다 뜨는 데 걸리는 총 시간(ms) — 시작버튼 fallback 타이밍에 씀
// 스태거 대상 스텝 목록(타이틀+아이콘 / 본문 줄별 / 메인) — 구성만 만들고 아직 아무것도 안 건드림
function _msGetStaggerSteps() {
  const title     = document.getElementById('ms-title-text');
  const titleIcon = document.getElementById('ms-title-icon'); // 타이틀과 같이 뜸
  // 본문은 한 덩어리가 아니라 줄별로 쪼개 각자 순서대로 뜨게 함(.ms-desc-line, HTML에서 미리 분리)
  const descLines = Array.from(document.querySelectorAll('#ms-title-desc .ms-desc-line'));
  // 메인도 한 덩어리가 아니라 안내문구→카드열→힌트문구 순서로 쪼갬(.ms-chord-tutorial 바로 아래
  // 자식들). .ms-bottom-actions(시작버튼)는 여기 포함 안 됨 — 버튼은 자기만의 노출 로직을 씀
  const mainChildren = Array.from(document.querySelectorAll('#ms-main > .ms-chord-tutorial > *'));
  return [
    { els: [titleIcon, title], dur: MS_STAGGER_TITLE_DUR },
    ...descLines.map((el, i) => ({
      els: [el], dur: MS_STAGGER_DESC_DUR,
      gapAfter: i === descLines.length - 1 ? 500 : undefined, // 본문2 → 다음 간격 0.5s
    })),
    ...mainChildren.map((el, i) => ({
      els: [el], dur: MS_STAGGER_MAIN_DUR,
      gapAfter: [200, 500, 300][i], // 등장코드설명→카드 0.2s / 카드→클릭안내 0.5s / 클릭안내→버튼 0.3s
    })),
  ];
}

// 콘텐츠를 채운 직후(=슬라이드 들어오기 전) 즉시 호출 — 안 그러면 슬라이드 도중 레이아웃이
// 전부 보였다가 스태거 시작 시점에 갑자기 사라지는 깜빡임이 생김(2026-08-26 발견)
function _msHideForStagger() {
  _msGetStaggerSteps().forEach(s => s.els.forEach(el => {
    if (!el) return;
    // 두 번째 튜토리얼부터는 이전 재생이 남긴 .ms-stagger-in이 그대로 붙어있는데, CSS 선언
    // 순서상 이게 .ms-stagger-pending보다 나중이라 이겨버려서 숨김이 안 먹힘(타이틀이 잠깐
    // 다 보였다가 다시 처음부터 올라오는 "두 번 보임" 버그의 원인, 2026-08-26 발견) — 먼저 제거
    el.classList.remove('ms-stagger-in');
    el.classList.add('ms-stagger-pending');
  }));
}

// 스텝을 순서대로 하나씩 재생. onAllDone은 마지막 스텝까지 다 뜬 시점(스킵으로 앞당겨질
// 수도 있음)에 호출. 반환값 { skip } — skip()은 "현재 재생 중인 스텝 하나만" 다음으로
// 넘긴다(전체를 한 번에 끝내는 게 아니라, 탭할 때마다 딱 한 스텝씩만 앞당겨짐)
function _msPlayStaggerIn(onAllDone) {
  const steps = _msGetStaggerSteps();
  const reveal = (el, durMs) => {
    if (!el) return;
    el.classList.remove('ms-stagger-in');
    el.classList.remove('ms-stagger-pending');
    void el.offsetWidth; // 리플레이 트릭 — 클래스 재부착만으론 애니메이션 재생 안 됨
    el.style.setProperty('--ms-stagger-dur', durMs + 'ms');
    el.classList.add('ms-stagger-in');
  };

  let cur = -1;
  let timer = null;

  const playStep = i => {
    cur = i;
    if (i >= steps.length) { timer = null; if (typeof onAllDone === 'function') onAllDone(); return; }
    const s = steps[i];
    s.els.forEach(el => reveal(el, s.dur));
    // 진행 중이던 요소는 그대로 계속 재생돼도 무방 — animation…both라 끝나면 보인 채로
    // 멈추고, 여긴 "다음 스텝으로 넘어가기까지의 대기(gap)"만 스킵하는 것뿐이다
    timer = setTimeout(() => playStep(i + 1), s.dur + (s.gapAfter ?? MS_STAGGER_GAP));
  };

  const skip = () => {
    if (cur >= steps.length - 1) return; // 이미 마지막 스텝 — 더 넘길 게 없음
    if (timer) { clearTimeout(timer); timer = null; }
    playStep(cur + 1);
  };

  playStep(0);
  return { skip };
}

// ── 스태거 진행 중 화면 터치로 한 스텝씩 넘기기 ───────────────
// 화면 전체를 덮는 투명 캐처를 씌워서, 터치가 아래(코드카드/시작버튼 등)로 절대
// 전달되지 않게 막는다 — 그래서 스킵 도중엔 소리도 안 나고 버튼도 안 눌린다.
// 탭 한 번 = 지금 재생 중인 스텝의 대기시간만 스킵하고 다음 스텝으로. 전체를
// 한 번에 끝내지 않는다 — 여러 스텝 넘기려면 그만큼 여러 번 탭해야 한다.
let _msStaggerToken = 0; // 매 실행마다 증가 — 새 실행이 시작되면 이전 캐처의 콜백을 무효화
let _msStaggerCatcher = null;

function _msInstallStaggerSkipCatcher(onSkip) {
  _msRemoveStaggerSkipCatcher();
  const cap = document.createElement('div');
  cap.id = 'ms-stagger-skip-catcher';
  cap.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    onSkip();
  });
  document.body.appendChild(cap);
  _msStaggerCatcher = cap;
}
function _msRemoveStaggerSkipCatcher() {
  if (_msStaggerCatcher) { _msStaggerCatcher.remove(); _msStaggerCatcher = null; }
}

// 콘텐츠 채우자마자(동기) 즉시 숨기고, 슬라이드 전환(MS_VIEW_IN_MS)이 끝난 뒤에만 스태거
// 시퀀스를 시작한다. 실제로 다 뜬 시점(스킵으로 앞당겨질 수 있음)에 시작버튼을 노출한다.
function _msRunStaggerAndBindStartBtn(rowId, btnId) {
  _msHideForStagger();
  // 버튼도 렌더 직후 즉시 숨김 — 안 그러면 슬라이드 도중엔 그냥 보이다가 260ms 시점에
  // 갑자기 사라지는 깜빡임이 생김(위 title/desc/main과 같은 원인, 2026-08-26 발견)
  document.getElementById(btnId)?.classList.add('ms-btn-pending');

  const token = ++_msStaggerToken;
  let stagger = null; // { skip } — 아직 슬라이드 대기 중이면 null(탭해도 넘길 스텝이 없음)

  _msInstallStaggerSkipCatcher(() => {
    if (token !== _msStaggerToken) return;
    stagger?.skip();
  });

  setTimeout(() => {
    if (token !== _msStaggerToken) return; // 슬라이드 도중 다른 실행으로 넘어감
    // fallbackMs는 스텝 재생과 무관하게 도는 순수 안전장치일 뿐 — 실제 노출은
    // 스크롤 또는 아래 stagger 완료 콜백(revealBtnNow)이 맡는다. 기본값(2500ms)을 쓰면
    // 전체 스텝 재생시간(보통 이보다 김)보다 먼저 터져서 버튼이 중간에 튀어나와버린다.
    const revealBtnNow = _msRevealStartBtnOnScrollOrTimeout(
      document.getElementById(rowId), document.getElementById(btnId), 60000
    );
    stagger = _msPlayStaggerIn(() => {
      if (token !== _msStaggerToken) return;
      _msRemoveStaggerSkipCatcher(); // 다 떴으면 이제 터치가 정상적으로 통과해야 함
      revealBtnNow(); // 스킵으로 앞당겨졌든 자연 재생으로 끝났든, 끝난 그 시점에 즉시 노출
    });
  }, MS_VIEW_IN_MS);
}

// row: 가로 카드열(스크롤 감지용), btn: 시작 버튼. 스크롤하면 즉시, 안 해도 fallbackMs
// 뒤 자동으로 버튼을 보여준다. 반환값은 "지금 바로 보여줘" 강제 트리거 — 스태거가
// (스킵되든 안 되든) 실제로 다 끝난 시점에 호출해 fallback 시간과 무관하게 즉시 노출한다
function _msRevealStartBtnOnScrollOrTimeout(row, btn, fallbackMs = 2500) {
  if (!btn) return () => {};
  btn.classList.add('ms-btn-pending');
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    btn.classList.remove('ms-btn-pending');
    row?.removeEventListener('scroll', onScroll);
  };
  const onScroll = () => reveal();
  row?.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(reveal, fallbackMs);
  return reveal;
}

// 버퍼 → 코드맞추기 튜토리얼 뷰
function msShowChordTutorial() {
  document.getElementById('ms-title-text').textContent = '코드맞추기';
  _msSetTitleIcon('ph-fill ph-grid-nine', '#4B7BD6'); // 홈배너·훈련카드와 동일 아이콘·색(파스텔 블루)
  document.getElementById('ms-title-desc').innerHTML =
    '<span class="ms-desc-line ms-stagger-pending">헷갈리는 코드 암기를 재미있게 훈련해요</span>' +
    '<span class="ms-desc-line ms-stagger-pending">기타가 있다면 직접 잡아보면서 암기해봐요!</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-chord-lead ms-stagger-pending">이번 훈련에 등장할 코드예요</p>
      <div class="ms-chord-row ms-stagger-pending" id="ms-chord-row"></div>
      <p class="ms-chord-hint ms-stagger-pending">클릭하면 소리가 들려요!</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-start-btn" onpointerup="msStartTraining()">준비됐어요!</button>
    </div>
  `;
  renderTutorialChords();
  positionMsGradient();
  _msRunStaggerAndBindStartBtn('ms-chord-row', 'ms-start-btn');
}

// 세션 초기화 — 코드조합 key·스케일 타입 배정 + 기록 리셋. 튜토리얼을 건너뛰는 페르소나도
// 이 초기화는 반드시 거쳐야 하므로 시작버튼 핸들러에서 분리해둠
function _msBeginSession() {
  const keys = MS_POOL.comboKeys;
  _msComboSessionKey = keys[Math.floor(Math.random() * keys.length)];
  const scaleTypes = _msScaleTypesInPool();
  // soloing 선호 유저는 스케일 타입 2개까지 섞어서 출제(2026-08-29), 그 외는 기존대로 1개 고정
  const pref = localStorage.getItem('user_pref_type');
  const numTypes = pref === 'soloing' ? 2 : 1;
  const shuffled = [...scaleTypes].sort(() => Math.random() - 0.5);
  _msScaleSessionTypes = shuffled.slice(0, Math.min(numTypes, scaleTypes.length));
  _msScaleSessionType = _msScaleSessionTypes[0] ?? null; // 하위호환 대표값
  _msScaleSeenIds.length = 0; // 새 세션이면 이전 타입에서 본 폼 기록도 초기화
  _msRecords.quiz.length = 0;
  _msRecords.scale.length = 0;
  _msRecords.combo.length = 0;
}

function msStartTraining() {
  _playTap();
  _playConfirmSfx();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _msBeginSession();
  _msTransitionView(msShowPreQuizCountdown);
}

// 코드맞추기 시작 전 안내문구 2줄(아래서 위로 순차 등장, 사라지지 않고 그대로 유지) +
// 3-2-1 카운트다운 — 카운트 사운드는 코드 이름 맞추기(chord-name-quiz.js startCountdown)와
// 동일한 비프/벨을 그대로 재사용
function msShowPreQuizCountdown() {
  // 카운트다운 중엔 상하 스크롤 잠금 — 숫자 팝 애니메이션으로 컨텐츠 높이가 흔들려도
  // .ms-scroll이 스크롤되지 않게 함 (다음 뷰 진입 시 msShowQuizView에서 해제)
  document.getElementById('mission-session-page').classList.add('ms-countdown-lock');
  document.getElementById('ms-title-text').textContent = '';
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-precountdown">
      <div class="ms-precountdown-msgs">
        <p class="ms-precountdown-msg ms-stagger-pending" id="ms-precountdown-msg1">${_msExamMode ? `제한시간 ${_msExamSectionTimeSec}초 안에` : '최대한 빠르게 맞춰보세요!'}</p>
        <p class="ms-precountdown-msg ms-stagger-pending" id="ms-precountdown-msg2">${_msExamMode ? '맞춰주세요!' : '카운트가 시작됩니다.'}</p>
      </div>
      <div class="ms-countdown-num" id="ms-countdown-num"></div>
    </div>
  `;

  const msg1 = document.getElementById('ms-precountdown-msg1');
  const msg2 = document.getElementById('ms-precountdown-msg2');
  const numEl = document.getElementById('ms-countdown-num');

  const revealMsg = (el) => {
    el.classList.remove('ms-stagger-in');
    el.classList.remove('ms-stagger-pending');
    void el.offsetWidth; // 리플레이 트릭
    el.style.setProperty('--ms-stagger-dur', '0.9s');
    el.classList.add('ms-stagger-in');
  };
  // countdown-pop은 forwards라 끝나면 opacity:0으로 멈춤 — 매번 애니메이션을 처음부터
  // 재생시키려면 박스를 만든 상태에서 reflow 후 다시 걸어야 함(chord-name-quiz.js와 동일 이유)
  const showNum = (n) => {
    numEl.classList.remove('active');
    numEl.style.display = 'flex';
    numEl.style.animation = 'none';
    numEl.textContent = String(n);
    void numEl.offsetWidth;
    numEl.style.animation = '';
    numEl.classList.add('active');
  };

  if (_msExamMode) {
    // 시험모드 두 줄은 한 문장이 줄바꿈된 것뿐이라 순차 등장 대신 동시에 띄움
    revealMsg(msg1);
    revealMsg(msg2);
  } else {
    revealMsg(msg1);
    setTimeout(() => revealMsg(msg2), 1000);        // 본문1 끝(0.9s)+간격(0.1s)
  }
  setTimeout(() => { showNum(3); _msPlayBeep(600, 0.06); }, 2300); // 본문2 끝(0.9s)+여유(0.4s)
  setTimeout(() => { showNum(2); _msPlayBeep(600, 0.06); }, 3300);
  setTimeout(() => { showNum(1); _msPlayBeep(600, 0.06); }, 4300);
  setTimeout(() => {
    _msPlayBell(1046.50, 0, 0.20);
    _msTransitionView(msShowQuizView);
  }, 5300);
}

// 튜토리얼 뷰 → 문제풀이 뷰 전환. 탑바(X+인디케이터)/타이틀/메인영역 3단 구조는
// 그대로 재사용하고, 타이틀 텍스트와 메인영역 내부 콘텐츠만 교체함
function msShowQuizView() {
  document.getElementById('mission-session-page').classList.remove('ms-countdown-lock');
  document.getElementById('ms-title-text').textContent = '올바른 정답을 선택하세요';
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-quiz-view" id="ms-quiz-view">
      <div class="ms-quiz-question-card" id="ms-quiz-question-card">
        <span class="ms-quiz-timer" id="ms-quiz-timer">0.0s</span>
        <p class="ms-quiz-feedback" id="ms-quiz-feedback"></p>
        <div class="ms-quiz-canvas-wrap" id="ms-quiz-canvas-wrap">
          <div class="ms-quiz-canvas-slot" id="ms-quiz-canvas-slot"></div>
          <span class="ms-quiz-question-name" id="ms-quiz-question-name" style="display:none"></span>
        </div>
      </div>
      <div class="ms-quiz-choices" id="ms-quiz-choices"></div>
    </div>
  `;
  if (_msExamMode) {
    _msQuizIndex = 0; // 진행도바 자리는 남은시간 게이지가 쓰므로 msUpdateProgress는 안 부름
  } else if (!_msReviewMode) {
    msUpdateProgress(0); // 문제풀이 시작 시점 — 아직 푼 문제가 없으니 게이지는 비움
    _msQuizIndex = 0;
  }
  _msQuizNext();
  if (_msExamMode) msPersonaPromoTimerStart(_msExamSectionTimeSec, msPersonaPromoTimeoutPopup);
}

// ── 코드맞추기 N문제(페르소나별 MS_DAILY_TOTALS.quiz): "코드→운지"/"운지→코드" 랜덤 혼합 ──
const MS_QUIZ_TOTAL = _msDailyTotals.quiz;
let _msQuizIndex   = 0;
let _msQuizCurrent = null; // { mode, targetName, targetEntry, choices:[name...] }

// ── 승급시험 모드 — _msQuizNext/_msQuizAnswer의 완료판정·기록처만 분기해서 재사용
// (엔진 통째로 복제하는 대신 플래그로 분기. 데일리미션 상태(_msRecords 등)엔 안 건드림) ──
let _msExamMode           = false;
let _msExamSectionTotal   = 0;
let _msExamSectionTimeSec = 0;
let _msExamRecords        = []; // [{ name, isCorrect }]
const _msPromoRealResults = {}; // { quiz: {correct,total}, scale:..., combo:... } — 실제 채점 결과 누적
let _msQuizAnswered = false;
let _msQuizStartTime = 0;
let _msQuizTimerRAF  = null;

function _msQuizPickChoices(targetName) {
  // 운지가 정답과 완전히 같은 코드는 오답 후보에서 제외 — 다이어그램이 똑같아 문제가 성립 안 함.
  // (같은 폼을 공유하는 G7(b9)/G7(b13), 구성음이 같은 DM7(9)/A/D 같은 하이브리드 표기 등)
  const targetFrets = _msGetEntry(targetName)?.frets.join(',');
  const others = MS_TUTORIAL_CHORDS.filter(n =>
    n !== targetName && _msGetEntry(n)?.frets.join(',') !== targetFrets);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const choices = [targetName, ...others.slice(0, 3)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function _msQuizNext() {
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  if (_msExamMode) {
    if (_msQuizIndex >= _msExamSectionTotal) { _msPromoQuizSectionDone(); return; }
  } else if (!_msReviewMode && _msQuizIndex >= MS_QUIZ_TOTAL) {
    _msEnterPart(msShowScaleTutorial, msShowScaleQuizView, 'scale'); return;
  }
  _msQuizAnswered = false;

  // 오답 풀기는 틀렸던 문제(코드+출제방식)를 그대로 다시 낸다. 선택지 배치만 새로 섞임
  const reviewItem = _msReviewMode ? _msReviewPeek('quiz') : null;
  if (_msReviewMode && !reviewItem) { _msReviewNextStage(); return; }

  const mode = reviewItem ? reviewItem.mode
    : (Math.random() < 0.5 ? 'diagram' : 'name'); // diagram=문제가 다이어그램/선택지가 이름, name=문제가 이름/선택지가 다이어그램
  const targetName  = reviewItem ? reviewItem.name
    : MS_TUTORIAL_CHORDS[Math.floor(Math.random() * MS_TUTORIAL_CHORDS.length)];
  const targetEntry = _msGetEntry(targetName);
  const choices = _msQuizPickChoices(targetName);
  _msQuizCurrent = { mode, targetName, targetEntry, choices, reviewItem };

  document.getElementById('ms-quiz-feedback').textContent = '';

  const canvasSlot = document.getElementById('ms-quiz-canvas-slot');
  const nameEl     = document.getElementById('ms-quiz-question-name');
  const choicesWrap = document.getElementById('ms-quiz-choices');
  choicesWrap.innerHTML = '';

  if (mode === 'diagram') {
    // 문제: 다이어그램 / 선택지: 코드명 텍스트
    canvasSlot.style.display = '';
    nameEl.style.display = 'none';
    canvasSlot.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvasSlot.appendChild(canvas);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      // 슬롯 폭의 80%만 소프트코딩으로 사용, 높이는 VoicingCanvas 고정비율로 역산 —
      // offsetHeight를 따로 재면 레이아웃 타이밍에 따라 폭 기준 비율과 안 맞아 찌그러질 수 있음
      const w = Math.round(canvasSlot.offsetWidth * 0.8);
      const h = Math.round(w * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      _msDrawEntry(canvas, targetEntry, null);
    }));

    choices.forEach(name => {
      const card = document.createElement('button');
      card.className = 'ms-quiz-choice-card ms-quiz-choice-card--text';
      card.textContent = name;
      card.dataset.name = name;
      card.addEventListener('pointerup', () => _msQuizAnswer(card, name === targetName));
      choicesWrap.appendChild(card);
    });
  } else {
    // 문제: 코드명 텍스트 / 선택지: 다이어그램
    canvasSlot.style.display = 'none';
    nameEl.style.display = '';
    nameEl.textContent = targetName;

    const canvasItems = [];
    choices.forEach(name => {
      const entry = _msGetEntry(name);
      const card = document.createElement('div');
      card.className = 'ms-quiz-choice-card';
      const slot = document.createElement('div');
      slot.className = 'ms-quiz-choice-canvas-slot';
      const canvas = document.createElement('canvas');
      slot.appendChild(canvas);
      card.appendChild(slot);
      card.dataset.name = name;
      card.addEventListener('pointerup', () => _msQuizAnswer(card, name === targetName));
      choicesWrap.appendChild(card);
      canvasItems.push({ canvas, entry });
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      canvasItems.forEach(({ canvas, entry }) => {
        const w = canvas.offsetWidth;
        const h = Math.round(w * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W);
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        _msDrawEntry(canvas, entry, null);
      });
    }));
  }

  _msQuizStartTime = performance.now();
  // 오답 노트는 속도를 재지 않는다 — 통계에 안 들어가고, 타이머가 압박만 준다
  const timerEl = document.getElementById('ms-quiz-timer');
  if (timerEl) timerEl.style.display = _msReviewMode ? 'none' : '';
  if (!_msReviewMode) _msQuizStartTimer();
}

function _msQuizStartTimer() {
  const el = document.getElementById('ms-quiz-timer');
  const tick = () => {
    if (_msQuizAnswered) return;
    const sec = (performance.now() - _msQuizStartTime) / 1000;
    if (el) el.textContent = sec.toFixed(1) + 's';
    _msQuizTimerRAF = requestAnimationFrame(tick);
  };
  _msQuizTimerRAF = requestAnimationFrame(tick);
}

// chord-name-quiz.js FEEDBACK_MESSAGES 이식(정답/오답 문구, 반응속도 구간)
const MS_QUIZ_FEEDBACK = {
  correct: {
    s0_9: ['헉, 이렇게 빨리 맞추시다니 대단하신걸요...?', '엄청 빠르네요!! 혹시 찍으신 건 아니겠죠?! ', '탈인간적 속도입니다!!'],
    s1_2: ['정답입니다! 열심히 외우신게 느껴지네요~!', '와! 조금만 더 빨라지면 마스터 하시겠는걸요?!'],
    s2:   ['정답입니다. 조금만 더 빨라지면 충분히 연주하실 수 있겠어요!', '축하합니다, 정답이예요! 금방 코드를 다 외우시겠는걸요~?'],
    s3_5: ['정답입니다!! 포기하지 않고 결국 맞추셨네요!', '약간 헷갈리셨지만 정답이예요 축하합니다!'],
  },
  wrong: ['앗, 약간 헷갈리셨나봐요! 얼마든지 도전할 수 있어요', '아쉽게도 틀리셨네요ㅠㅠ 금방 외워질거예요!', '틀리셔도 괜찮아요! 시간은 많답니다~'],
};
function _msQuizPickFeedback(isCorrect, speedSec) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  if (!isCorrect) return pick(MS_QUIZ_FEEDBACK.wrong);
  const c = MS_QUIZ_FEEDBACK.correct;
  if (speedSec < 0.9) return pick(c.s0_9);
  if (speedSec < 2.0) return pick(c.s1_2);
  if (speedSec < 3.5) return pick(c.s2);
  return pick(c.s3_5);
}

// 정답/오답 벨 사운드 — chord-name-quiz.js _playBell/playSound 그대로 이식
let _msSfxAudioCtx  = null;
let _msSfxMaster    = null;
function _msGetAudioCtx() {
  if (!_msSfxAudioCtx) _msSfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_msSfxAudioCtx.state === 'suspended') _msSfxAudioCtx.resume();
  return _msSfxAudioCtx;
}
function _msGetSfxBus(ctx) {
  if (!_msSfxMaster) { _msSfxMaster = ctx.createGain(); _msSfxMaster.connect(ctx.destination); }
  _msSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _msSfxMaster;
}
function _msPlayBell(freq, startDelay, gainVal) {
  try {
    const ctx = _msGetAudioCtx();
    const t   = ctx.currentTime + startDelay;
    const bus = _msGetSfxBus(ctx);
    const partials = [
      { r: 1,      g: gainVal,        d: 0.8  },
      { r: 2.756,  g: gainVal * 0.55, d: 0.5  },
      { r: 5.404,  g: gainVal * 0.35, d: 0.3  },
      { r: 8.933,  g: gainVal * 0.18, d: 0.15 },
      { r: 13.46,  g: gainVal * 0.08, d: 0.08 },
    ];
    partials.forEach(({ r, g, d }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(bus);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * r * 1.015, t);
      osc.frequency.exponentialRampToValueAtTime(freq * r, t + 0.02);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(g, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);
      osc.start(t);
      osc.stop(t + d + 0.01);
    });
  } catch (e) {}
}

// 짧은 게임 비프 — chord-name-quiz.js _playBeep와 동일(카운트다운용, 사용자 요청으로 재사용)
function _msPlayBeep(freq, duration) {
  try {
    const ctx  = _msGetAudioCtx();
    const t    = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(_msGetSfxBus(ctx));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.20, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch (e) {}
}
function msPlaySound(type) {
  if (type === 'correct') {
    _msPlayBell(523.25, 0,    0.20);  // C5 → 상승
    _msPlayBell(698.46, 0.13, 0.20);  // F5
  } else if (type === 'wrong') {
    _msPlayBell(349.23, 0,    0.20);  // F4 → 하강
    _msPlayBell(261.63, 0.13, 0.20);  // C4
  }
}

function _msQuizAnswer(card, isCorrect) {
  if (_msQuizAnswered) return;
  _msQuizAnswered = true;
  if (_msQuizTimerRAF) cancelAnimationFrame(_msQuizTimerRAF);
  _playTap();
  msPlaySound(isCorrect ? 'correct' : 'wrong');

  const speedSec = (performance.now() - _msQuizStartTime) / 1000;
  document.getElementById('ms-quiz-feedback').textContent = _msQuizPickFeedback(isCorrect, speedSec);

  document.querySelectorAll('.ms-quiz-choice-card').forEach(c => {
    if (c.dataset.name === _msQuizCurrent.targetName) c.classList.add('ms-quiz-choice-card--correct');
    else if (c === card) c.classList.add('ms-quiz-choice-card--wrong');
  });

  if (_msExamMode) {
    _msExamRecords.push({ name: _msQuizCurrent.targetName, isCorrect });
    _msQuizIndex++;
    // 진행도바 자리는 승급시험 중엔 남은시간 게이지가 쓰고 있어서 msUpdateProgress 호출 안 함
  } else if (!_msReviewMode) {
    _msRecords.quiz.push({
      name:      _msQuizCurrent.targetName,
      mode:      _msQuizCurrent.mode,
      isCorrect,
      timeSec:   speedSec,
    });
    _msQuizIndex++;
    msUpdateProgress(_msQuizIndex);
  } else {
    _msReviewGrade('quiz', _msQuizCurrent.reviewItem, isCorrect);
  }

  setTimeout(() => {
    // 마지막 문제 뒤엔 뷰 자체가 바뀌므로 문제 슬라이드를 겹치지 않게 여기서 분기
    if (_msExamMode) {
      if (_msQuizIndex >= _msExamSectionTotal) { _msPromoQuizSectionDone(); return; }
      _msTransitionQuestion('.ms-quiz-view', _msQuizNext);
      return;
    }
    if (_msReviewMode) {
      if (!_msReviewStageRemaining('quiz')) { _msReviewNextStage(); return; }
      _msTransitionQuestion('.ms-quiz-view', _msQuizNext);
      return;
    }
    if (_msQuizIndex >= MS_QUIZ_TOTAL) { _msEnterPart(msShowScaleTutorial, msShowScaleQuizView, 'scale'); return; }
    _msTransitionQuestion('.ms-quiz-view', _msQuizNext);
  }, 1100);
}

// 스케일 훈련 튜토리얼 뷰 — 3단 구조(탑바/타이틀/메인영역) 뼈대만, 콘텐츠 없음
function msShowScaleTutorial() {
  document.getElementById('ms-title-text').textContent = '스케일 훈련';
  _msSetTitleIcon('ph-fill ph-music-notes', '#D06A94'); // 홈배너·훈련카드와 동일 아이콘·색
  const desc = document.getElementById('ms-title-desc');
  desc.style.display = '';
  desc.innerHTML =
    '<span class="ms-desc-line ms-stagger-pending">기타 솔로 연주에 필수 훈련!</span>' +
    '<span class="ms-desc-line ms-stagger-pending">스케일 블럭을 외우는 훈련이예요</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-chord-lead ms-stagger-pending">이번 훈련에 나올 5가지 블럭이예요</p>
      <div class="ms-scale-block-row ms-stagger-pending" id="ms-scale-block-row"></div>
      <p class="ms-chord-hint ms-stagger-pending">Tip. 2칸 차이, 3칸 차이에 주목해보세요!</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-scale-start-btn" onpointerup="msScaleStart()">준비됐어요!</button>
    </div>
  `;
  renderScaleBlockPreviews();
  _msRunStaggerAndBindStartBtn('ms-scale-block-row', 'ms-scale-start-btn');
}

// 스케일 블럭 미리보기 — scale-block-preview.js 모듈로 드로잉
// 표시 순서는 MS_POOL.scaleBlocks 배열 순서 그대로(펜타토닉은 C→A→G→E→D). scale-data.js
// 원본 배열 순서는 scale-level.js의 폼 전환 로직이 인접 인덱스로 참조하므로 건드리지 않고,
// 여기서만 id 기준 재배열한다.
const MS_SCALE_BLOCK_ORDER = MS_POOL.scaleBlocks;

// 스케일 종류 표시명 — scale-level.js SCALE_SHORT_NAMES 중 데일리미션 출제 대상만 추림
// (scale-level.js는 미션 페이지에서 로드하지 않으므로 여기 별도 보관)
const MS_SCALE_TITLES = {
  'pentatonic':        '마이너 펜타토닉',
  'major':             '메이저',
  'blues':             '마이너 블루스',
  'natural-minor':     '내추럴 마이너',
  'harmonic-minor':    '하모닉 마이너',
  'phrygian-dominant': '프리지안 도미넌트',
  'mixolydian-b9b13':  '믹솔리디안 b9 b13',
  'altered':           '얼터드',
};
// label이 없는 종류(메이저·프리지안 도미넌트 등)의 폼 이름 — scale-level.js FORM_NAMES와 동일
const MS_SCALE_FORM_NAMES = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼'];
// 이번 세션에 배정된 스케일 타입 — _msBeginSession에서 랜덤 배정, 세션 내내 고정.
// _msScaleSessionType은 하위호환용 대표값(배열의 첫번째)이고, 실제 출제 필터는
// _msScaleSessionTypes(배열)를 씀 — soloing 선호 유저는 2개 타입까지 섞임(2026-08-29).
let _msScaleSessionType = null;
let _msScaleSessionTypes = [];

// 페르소나마다 스케일 종류가 달라서 특정 종류로 한정하지 않고 전 종류를 훑는다
// (블럭 id는 종류 접두어가 붙어 전역 유일 — 예: pentatonic-cm / blues-cm / major-pos1)
function _msScaleBlockById() {
  const byId = new Map();
  ScaleData.getAllScaleKeys().forEach(scaleKey => {
    ScaleData.getBlocks(scaleKey).forEach((block, bi) => byId.set(block.id, { block, scaleKey, bi }));
  });
  return byId;
}

// 페르소나 풀 전체 블럭(정의 순서 유지) — 세션 스케일 타입을 고를 때만 이걸 씀
function _msScaleAllPoolEntries() {
  const byId = _msScaleBlockById();
  return MS_SCALE_BLOCK_ORDER.map(id => byId.get(id)).filter(Boolean);
}
// 풀에 등장하는 스케일 타입 목록(처음 등장 순서) — 세션 시작 시 이 중 1개를 뽑는다
function _msScaleTypesInPool() {
  return [...new Set(_msScaleAllPoolEntries().map(e => e.scaleKey))];
}

// 이번 세션이 출제 대상으로 삼는 블럭 목록 — 세션당 스케일 타입 1개로 고정
// (_msScaleSessionType, _msBeginSession에서 랜덤 배정. 5개 타입을 섞어 한 세션에서
// 산발적으로 내지 않고, 한 타입의 폼끼리만 연속 학습하게 하기 위함)
function _msScalePoolEntries() {
  const all = _msScaleAllPoolEntries();
  if (!_msScaleSessionTypes.length) return all;
  return all.filter(e => _msScaleSessionTypes.includes(e.scaleKey));
}
function _msScalePoolBlocks() {
  return _msScalePoolEntries().map(e => e.block);
}

// 결산 리스트에 쓸 폼 이름만 반환 — 결산은 세션 부제로 타입을 이미 따로 보여주므로 폼만 필요
function _msScaleBlockCaption(block) {
  // id로 비교(참조비교 금지) — 오답풀기 큐의 block은 결산 저장/복원(JSON 왕복)을 거치면
  // 원본 SCALE_BLOCKS 배열 객체와 참조가 끊긴 복사본이라 ===는 항상 실패함(2026-08-31)
  const entry = _msScalePoolEntries().find(e => e.block.id === block.id);
  if (!entry) return (block.label || '').split(' ').pop();
  return block.label
    ? block.label.split(' ').pop()
    : (MS_SCALE_FORM_NAMES[entry.bi] || `${entry.bi + 1}번폼`);
}

// 문제 지문에 쓸 이름 — "무엇을" 채워야 하는지 알 수 있게 타입+폼을 같이 밝힌다
// (폼 이름만 주면 "C폼"이 마이너 펜타토닉인지 메이저인지 알 길이 없어 문제가 안 풀림)
function _msScaleQuestionLabel(block) {
  // 타입 2개가 섞인 세션(soloing)일 수 있어 전역값 말고 이 블럭 자체의 타입을 찾음
  const entry = _msScaleAllPoolEntries().find(e => e.block.id === block.id); // 위와 동일 이유로 id 비교
  const scaleKey = entry ? entry.scaleKey : _msScaleSessionType;
  const typeTitle = MS_SCALE_TITLES[scaleKey] || scaleKey || '';
  return `${typeTitle} 스케일 ${_msScaleBlockCaption(block)}`;
}

function renderScaleBlockPreviews() {
  const row = document.getElementById('ms-scale-block-row');
  if (!row) return;
  const blocks = _msScalePoolBlocks();
  blocks.forEach(block => {
    const wrap = document.createElement('div');
    wrap.className = 'ms-scale-card';
    row.appendChild(wrap);
    ScaleBlockPreview.render(wrap, block);
  });
  _msInitRowMouseDrag(row, 'ms-scale-block-row--dragging');
}

function msScaleStart() {
  _playTap();
  _playConfirmSfx();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _msTransitionView(msShowScaleQuizView);
}

// 스케일 문제풀이 뷰 — scale-level.js의 실제 테스트 프로세스(근음 힌트→dot 탭 입력→채점)를
// C key 고정으로 이식. FRETS_VISIBLE/TOTAL_FRETS는 scale-data.js 전역 상수 재사용
const MS_SCALE_STRINGS          = 6;
const MS_SCALE_STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
const MS_SCALE_SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19]);
const MS_SCALE_DOUBLE_DOT_FRETS = new Set([12]);
const MS_SCALE_OPEN_MIDI        = [64, 59, 55, 50, 45, 40]; // 1번줄→6번줄 개방현 MIDI
const MS_SCALE_ROOT             = 0; // C 고정

const MS_SCALE_TOTAL  = _msDailyTotals.scale;    // 스케일 훈련 문제 수
let _msScaleIndex     = 0;    // 채점 완료한 스케일 문제 수
let _msScaleSeenIds   = [];   // 같은 폼 연속 출제 방지
let _msScaleItem      = null; // { block, startFret, hint:{s,col} }
let _msScalePlaced    = new Set(); // "s,col" 문자열
let _msScaleSubmitted = false;

function msShowScaleQuizView() {
  document.getElementById('ms-title-text').textContent = '올바른 곳을 채우세요!';
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-scale-question" id="ms-scale-question"></p>
      <div class="ms-scale-quiz-fb-wrap">
        <div class="fb-full-neck" id="ms-scale-quiz-neck"></div>
        <div class="fb-full-nums" id="ms-scale-quiz-nums"></div>
      </div>
      <div class="test-result-row" id="ms-scale-result-row" style="visibility:hidden">
        <span class="test-result-score" id="ms-scale-result-score">&nbsp;</span>
      </div>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue" id="ms-scale-submit-btn" onpointerup="msScaleSubmit()">제출하기</button>
    </div>
  `;
  _msScaleInitQuestion();
  _msScaleInitTap();
  if (_msExamMode) msPersonaPromoTimerStart(_msExamSectionTimeSec, msPersonaPromoTimeoutPopup);
}

function _msScalePlayNote(s, absFret) {
  if (typeof GuitarAudio === 'undefined' || absFret < 0) return;
  GuitarAudio.stop();
  GuitarAudio.playNote(MS_SCALE_OPEN_MIDI[s] + absFret, 2.5);
}

// 블럭 내 실제 음 중 가장 높은 1도(루트) 위치 — scale-level.js findHighestRoot와 동일 로직
function _msScaleFindHighestRoot(block, startFret) {
  const parsed = ScaleData.parseGrid(block.grid);
  let highest = null, highestMidi = -1;
  parsed.notes.filter(n => n.degree === 1).forEach(note => {
    const absF = startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    const midi = MS_SCALE_OPEN_MIDI[note.s] + absF;
    if (midi > highestMidi) { highestMidi = midi; highest = { s: note.s, col: note.col }; }
  });
  return highest;
}

function _msScaleInitQuestion() {
  _msScalePlaced.clear();
  _msScaleSubmitted = false;

  // 오답 풀기는 틀렸던 블럭·시작프렛을 그대로 다시 낸다
  const reviewItem = _msReviewMode ? _msReviewPeek('scale') : null;
  if (_msReviewMode && !reviewItem) { _msReviewNextStage(); return; }

  let block;
  if (reviewItem) {
    _msScaleItem = reviewItem;
    block = reviewItem.block;
  } else {
    const allBlocks = _msScalePoolBlocks();
    const blocks = allBlocks.filter(b => !_msScaleSeenIds.includes(b.id));
    const pool   = blocks.length ? blocks : allBlocks;
    block = pool[Math.floor(Math.random() * pool.length)];
    _msScaleSeenIds.push(block.id);
    const starts = ScaleData.getStartFrets(block, MS_SCALE_ROOT);
    const startFret = starts.length ? starts[Math.floor(Math.random() * starts.length)] : 0;
    const hint = _msScaleFindHighestRoot(block, startFret);
    _msScaleItem = { block, startFret, hint };
  }

  document.getElementById('ms-scale-question').textContent =
    `${_msScaleQuestionLabel(block)} 블럭을 채워주세요`;

  document.getElementById('ms-scale-result-row').style.visibility = 'hidden';
  document.getElementById('ms-scale-submit-btn').textContent = '제출하기';

  _msScaleRenderNeck();

  // 오답 노트: 지난 사이클에 이미 맞힌 자리는 정답색으로 미리 찍어두고 지울 수 없게 잠근다
  if (_msReviewMode && Array.isArray(_msScaleItem.prefilled)) {
    _msScaleItem.prefilled.forEach(key => {
      _msScalePlaced.add(key); // 채점 대상에 그대로 포함 — 잠긴 자리도 정답으로 집계돼야 함
      _msScaleAddDot(key, true);
    });
  }
}

// 7프렛 고정창 넥 렌더 — scale-level.js renderTestNeck 이식 (줄/너트/프렛선/포지션마커/개방현힌트/근음힌트)
function _msScaleRenderNeck() {
  const neckEl = document.getElementById('ms-scale-quiz-neck');
  const numsEl = document.getElementById('ms-scale-quiz-nums');
  if (!neckEl || !numsEl) return;
  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  // scale-block-preview.js와 동일한 --fb-ratio(2.3) 공식으로 넥 크기를 컨테이너 실측 폭 기준 절대 px 산출
  const wrap = document.querySelector('.ms-scale-quiz-fb-wrap');
  const w = wrap?.offsetWidth || 300;
  const fbSpan = w / 2.3;
  const fbu = ((fbSpan - 2.25) * 6 / 5) / 160;
  wrap.style.setProperty('--fbu', fbu + 'px');

  const { startFret, hint } = _msScaleItem;
  const showNut    = startFret <= 0;
  const nutLeftPct = showNut ? (1 - startFret) / FRETS_VISIBLE * 100 : 0;

  for (let s = 0; s < MS_SCALE_STRINGS; s++) {
    const topPct = (s + 0.5) / MS_SCALE_STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${MS_SCALE_STRING_THICKNESS[s]}px; left:${showNut ? nutLeftPct : 0}%;`;
    neckEl.appendChild(el);
  }
  if (showNut) {
    const nutEl = document.createElement('div');
    nutEl.className = 'fb-nut-line';
    nutEl.style.left = `${nutLeftPct}%`;
    neckEl.appendChild(nutEl);
  }
  for (let col = 1; col < FRETS_VISIBLE; col++) {
    const absFret = startFret + col;
    if (showNut ? absFret <= 1 : absFret <= 0) continue;
    const leftPct = col / FRETS_VISIBLE * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }
  for (let col = 0; col < FRETS_VISIBLE; col++) {
    const fretNum = startFret + col;
    if (fretNum < 0) continue;
    const cx = (col + 0.5) / FRETS_VISIBLE * 100;
    if (MS_SCALE_SINGLE_DOT_FRETS.has(fretNum)) {
      const dot = document.createElement('div');
      dot.className = 'fb-dot';
      dot.style.cssText = `left:${cx}%; top:50%;`;
      neckEl.appendChild(dot);
      const num = document.createElement('div');
      num.className = 'fb-fret-num';
      num.style.left = `${cx}%`;
      num.textContent = fretNum;
      numsEl.appendChild(num);
    } else if (MS_SCALE_DOUBLE_DOT_FRETS.has(fretNum)) {
      [33, 67].forEach(y => {
        const dot = document.createElement('div');
        dot.className = 'fb-dot';
        dot.style.cssText = `left:${cx}%; top:${y}%;`;
        neckEl.appendChild(dot);
      });
      const num = document.createElement('div');
      num.className = 'fb-fret-num';
      num.style.left = `${cx}%`;
      num.textContent = fretNum;
      numsEl.appendChild(num);
    }
  }
  if (startFret <= 0) {
    const openCol = -startFret;
    for (let s = 0; s < MS_SCALE_STRINGS; s++) {
      const leftPct = (openCol + 0.5) / FRETS_VISIBLE * 100;
      const topPct  = (s + 0.5) / MS_SCALE_STRINGS * 100;
      const el = document.createElement('div');
      el.className = 'fb-open-hint';
      el.dataset.openHint = `${s},${openCol}`;
      el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
      neckEl.appendChild(el);
    }
  }

  // 근음 힌트(1개, 미리 표시·클릭 불가)
  if (hint) {
    const leftPct = (hint.col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (hint.s + 0.5) / MS_SCALE_STRINGS * 100;
    neckEl.querySelector(`.fb-open-hint[data-open-hint="${hint.s},${hint.col}"]`)?.style.setProperty('display', 'none');
    const el = document.createElement('div');
    const isOpen = (startFret + hint.col) === 0;
    el.className = 'fb-note fb-note--root' + (isOpen ? ' fb-note--open' : '');
    el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:auto; cursor:pointer;`;
    el.addEventListener('pointerup', e => { e.stopPropagation(); _msScalePlayNote(hint.s, startFret + hint.col); });
    neckEl.appendChild(el);
  }
}

// locked=true (오답 노트에서 이미 맞힌 자리) — 못 지우고, 누르면 소리만 난다
function _msScaleAddDot(key, locked = false) {
  const neckEl = document.getElementById('ms-scale-quiz-neck');
  const [s, col] = key.split(',').map(Number);
  const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct  = (s + 0.5) / MS_SCALE_STRINGS * 100;
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)?.style.setProperty('display', 'none');
  const el = document.createElement('div');
  el.className = 'fb-note fb-note--placed' + (locked ? ' fb-note--locked' : '');
  el.dataset.key = key;
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
  if (locked) {
    el.addEventListener('pointerup', e => {
      e.stopPropagation();
      _msScalePlayNote(s, _msScaleItem.startFret + col);
    });
  } else {
    el.addEventListener('pointerdown', e => { e.stopPropagation(); el.classList.add('fb-note--pressed'); });
    el.addEventListener('pointerup', e => { e.stopPropagation(); _msScaleRemoveDot(key); });
    el.addEventListener('pointerleave', () => el.classList.remove('fb-note--pressed'));
  }
  neckEl.appendChild(el);
}

function _msScaleRemoveDot(key) {
  const neckEl = document.getElementById('ms-scale-quiz-neck');
  neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`)?.remove();
  _msScalePlaced.delete(key);
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)?.style.removeProperty('display');
}

function _msScaleInitTap() {
  const neckEl = document.getElementById('ms-scale-quiz-neck');
  if (!neckEl || neckEl._tapInit) return;
  neckEl._tapInit = true;
  let startX = 0, startY = 0;
  neckEl.addEventListener('pointerdown', e => { startX = e.clientX; startY = e.clientY; });
  neckEl.addEventListener('pointerup', e => {
    if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) return;
    if (_msScaleSubmitted) return;

    const rect = neckEl.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / rect.width  * FRETS_VISIBLE);
    const s   = Math.floor((e.clientY - rect.top)  / rect.height * MS_SCALE_STRINGS);
    if (col < 0 || col >= FRETS_VISIBLE || s < 0 || s >= MS_SCALE_STRINGS) return;

    const { hint, startFret } = _msScaleItem;
    if (hint && hint.s === s && hint.col === col) return; // 힌트 자리는 입력 불가

    const key = `${s},${col}`;
    if (neckEl.querySelector(`.fb-note--locked[data-key="${key}"]`)) return; // 잠긴 자리는 입력 불가
    if (_msScalePlaced.has(key)) {
      _msScaleRemoveDot(key);
    } else {
      _msScalePlaced.add(key);
      _msScaleAddDot(key);
      _msScalePlayNote(s, startFret + col);
    }
  });
}

function msScaleSubmit() {
  if (_msScaleSubmitted) {
    _playTap();
    _playConfirmSfx();
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
    if (_msExamMode) {
      if (_msScaleIndex < _msExamSectionTotal) {
        _msTransitionQuestion('#ms-main .ms-chord-tutorial', _msScaleInitQuestion);
      } else {
        _msPromoScaleSectionDone();
      }
    } else if (_msReviewMode) {
      if (_msReviewStageRemaining('scale')) {
        _msTransitionQuestion('#ms-main .ms-chord-tutorial', _msScaleInitQuestion);
      } else {
        _msReviewNextStage();
      }
    } else if (_msScaleIndex < MS_SCALE_TOTAL) {
      _msTransitionQuestion('#ms-main .ms-chord-tutorial', _msScaleInitQuestion);
    } else {
      // 스케일 문제를 다 풀었으면 다음 훈련(코드 조합 훈련)으로 이동
      _msEnterPart(msShowChordComboTutorial, msShowComboQuizView, 'combo');
    }
    return;
  }
  _playTap();
  _playConfirmSfx();
  _msScaleSubmitted = true;

  const { block, startFret, hint } = _msScaleItem;
  const parsed = ScaleData.parseGrid(block.grid);
  const correctSet = new Set();
  parsed.notes.forEach(note => {
    const absF = startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    if (hint && note.s === hint.s && note.col === hint.col) return; // 힌트로 이미 준 자리는 채점 제외
    correctSet.add(`${note.s},${note.col}`);
  });

  // 정답/오답/놓침 노트 클릭 시 사운드+리플 — scale-level.js checkAnswer의 확인용 재생 장치 이식
  function _msScaleAttachPlayback(el, s, absF) {
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.addEventListener('pointerup', () => {
      if (absF >= 0) _msScalePlayNote(s, absF);
      const r = document.createElement('span');
      r.className = 'fb-note-ripple';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  }

  const neckEl = document.getElementById('ms-scale-quiz-neck');
  let nCorrect = 0;
  const correctKeys = []; // 이번에 맞힌 자리 — 오답 노트에서 잠긴 dot으로 미리 찍어준다
  _msScalePlaced.forEach(key => {
    const el = neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`);
    if (!el) return;
    if (correctSet.has(key)) correctKeys.push(key);
    el.classList.remove('fb-note--placed', 'fb-note--locked');
    if (correctSet.has(key)) { el.classList.add('fb-note--correct'); nCorrect++; }
    else el.classList.add('fb-note--wrong');
    const [ps, pcol] = key.split(',').map(Number);
    _msScaleAttachPlayback(el, ps, startFret + pcol);
  });

  correctSet.forEach(key => {
    if (_msScalePlaced.has(key)) return;
    const [s, col] = key.split(',').map(Number);
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (s + 0.5) / MS_SCALE_STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-note fb-note--missed';
    el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
    neckEl.appendChild(el);
    _msScaleAttachPlayback(el, s, startFret + col);
  });

  const _isPerfectRun = nCorrect === correctSet.size && _msScalePlaced.size === nCorrect;
  _msScaleItem.prefilled = correctKeys; // 다음 사이클에 그대로 얹는다(맞힌 자리는 다시 안 지워짐)
  if (_msExamMode) {
    // 승급시험: 한 자리도 안 틀리고(오답0·놓침0) 완벽해야 이 문제를 "정답"으로 침
    _msExamRecords.push({ isCorrect: _isPerfectRun });
    _msScaleIndex++;
  } else if (!_msReviewMode) {
    _msRecords.scale.push({
      formName: _msScaleBlockCaption(block),
      nCorrect,
      nWrong:   _msScalePlaced.size - nCorrect,
      nMissed:  correctSet.size - nCorrect,
      total:    correctSet.size,
      item:     _msScaleItem, // 오답 풀기에서 같은 블럭·시작프렛을 그대로 다시 내기 위해 보관
    });
    _msScaleIndex++;
    msUpdateProgress(MS_QUIZ_TOTAL + _msScaleIndex); // 코드맞추기(MS_QUIZ_TOTAL) + 스케일(1~MS_SCALE_TOTAL)
  } else {
    _msReviewGrade('scale', _msScaleItem, _isPerfectRun);
  }

  const nWrong  = _msScalePlaced.size - nCorrect;
  const nMissed = correctSet.size - nCorrect;
  const resultRow = document.getElementById('ms-scale-result-row');
  const scoreEl   = document.getElementById('ms-scale-result-score');
  resultRow.style.visibility = 'visible';
  const isPerfect = nWrong === 0 && nMissed === 0;
  scoreEl.textContent = `오답 ${nWrong + nMissed}개`;
  msPlaySound(isPerfect ? 'correct' : 'wrong');

  document.getElementById('ms-scale-submit-btn').textContent = '다음';
}

// ── 완료 결산 뷰 ──────────────────────────────────────────────
// 점수는 전부 _msRecords(실제 풀이 기록)에서 계산. 평가 문구는 mission-result-messages.js

// 정답률 → 0~100 정수. 스케일만 오답 페널티 있음(찍어서 다 채우는 걸 막기 위해)
function _msComputeScores() {
  const q = _msRecords.quiz;
  const quiz = q.length
    ? Math.round(q.filter(r => r.isCorrect).length / q.length * 100) : 0;

  const sc = _msRecords.scale;
  const scale = sc.length
    ? Math.round(sc.reduce((a, r) => a + (r.total ? Math.max(0, r.nCorrect - r.nWrong) / r.total : 0), 0) / sc.length * 100)
    : 0;

  const cb = _msRecords.combo;
  const combo = cb.length
    ? Math.round(cb.reduce((a, r) => a + (r.totalSlots ? r.correctSlots / r.totalSlots : 0), 0) / cb.length * 100)
    : 0;

  return { quiz, scale, combo };
}

// ── 데일리미션 문항수 배정 재보정용 원본데이터 수집(2026-08-29) ──
// _msComputeScores()는 결산화면 표시용 0~100점이라 여기선 원본 정답/전체수·반응속도를 따로 뽑음.
function _msComputeSessionStats() {
  const q = _msRecords.quiz;
  const speeds = q.map(r => r.timeSec).filter(t => typeof t === 'number');
  const quiz = {
    correct: q.filter(r => r.isCorrect).length,
    total:   q.length,
    avg_speed_sec: speeds.length
      ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 1000) / 1000
      : null,
  };

  const sc = _msRecords.scale;
  const scale = {
    correct: sc.reduce((a, r) => a + (r.nCorrect || 0), 0),
    total:   sc.reduce((a, r) => a + (r.total || 0), 0),
  };

  const cb = _msRecords.combo;
  const combo = {
    correct: cb.reduce((a, r) => a + (r.correctSlots || 0), 0),
    total:   cb.reduce((a, r) => a + (r.totalSlots || 0), 0),
  };

  return { quiz, scale, combo };
}

// 실제 완주 시점(1회, 리뷰/재진입/목업 제외)에만 쏨 — assigned는 그날 배정받은 문항수
// (MS_DAILY_TOTALS/BY_PREF), pref_type/skill_type은 그 순간 스냅샷(나중에 바뀌어도 이력 보존).
function _msTrackDailyMissionCompleted() {
  if (typeof analytics === 'undefined') return;
  const stats = _msComputeSessionStats();
  analytics.track('daily_mission_completed', {
    persona:    MS_PERSONA.id,
    pref_type:  localStorage.getItem('user_pref_type') || null,
    skill_type: localStorage.getItem('user_skill_type') || null,
    assigned:   { quiz: _msDailyTotals.quiz, scale: _msDailyTotals.scale, combo: _msDailyTotals.combo },
    quiz:  stats.quiz,
    scale: stats.scale,
    combo: stats.combo,
  });
}

// ── 정규분포 막대그래프 ──────────────────────────────────────
// 표준정규를 ±3σ 구간에서 25개 막대로 이산화. 내 z가 들어가는 칸만 강조색
const MS_CHART_BARS = 11;
const MS_CHART_RANGE = 3; // ±3σ
function _msNormalChartHTML(z) {
  const step = (MS_CHART_RANGE * 2) / MS_CHART_BARS;
  const clamped = Math.max(-MS_CHART_RANGE, Math.min(MS_CHART_RANGE, z));
  const myIdx = Math.min(MS_CHART_BARS - 1, Math.floor((clamped + MS_CHART_RANGE) / step));
  let bars = '';
  for (let i = 0; i < MS_CHART_BARS; i++) {
    const center = -MS_CHART_RANGE + (i + 0.5) * step;
    const pdf = Math.exp(-center * center / 2) * 100; // pdf를 최대값 100% 기준으로 정규화
    // 통계적 정확도보다 시각적 균형이 목적 — 양끝단이 너무 납작해 보이지 않도록
    // 바닥을 10%까지 끌어올려 펑퍼짐하게 눌러줌(0→10, 100→100 선형 리스케일)
    const h = 10 + pdf * 0.9;
    // 내 막대 오른쪽(나보다 빠른/잘한 구간)은 연한 틴트로 "이만큼 위에 있다"는 영역감을 주고,
    // 왼쪽은 중립 회색으로 남겨 대비시킴
    const cls = i === myIdx ? ' ms-normal-bar--me' : (i > myIdx ? ' ms-normal-bar--above' : '');
    bars += `<div class="ms-normal-bar${cls}" style="height:${h.toFixed(1)}%"></div>`;
  }
  return `
    <div class="ms-normal-chart">${bars}</div>
    <div class="ms-normal-axis"><span>낮음</span><span>평균</span><span>높음</span></div>
  `;
}

const MS_GAUGE_SEGMENTS = 5; // 5칸 막대게이지, 20점당 1칸
function _msGaugeHTML(score) {
  const segSpan = 100 / MS_GAUGE_SEGMENTS; // 20
  let html = '';
  for (let i = 0; i < MS_GAUGE_SEGMENTS; i++) {
    // 칸 전체를 on/off로 켜는 게 아니라, 걸쳐있는 칸은 그 안에서 남은 비율만큼만 채움
    const pct = Math.max(0, Math.min(100, (score - i * segSpan) / segSpan * 100));
    html += `<div class="ms-result-gauge-seg"><div class="ms-result-gauge-seg-fill" style="width:${pct}%"></div></div>`;
  }
  return html;
}

// tone: 'blue' | 'red' | 'purple' — daily-mission 게이트 카드 색 순서와 동일
function _msScoreRowHTML(label, score, tone) {
  return `
    <div class="ms-result-score-row ms-result-score-row--${tone}">
      <span class="ms-result-score-name">${label}</span>
      <div class="ms-result-gauge-row">
        <div class="ms-result-gauge">${_msGaugeHTML(score)}</div>
        <span class="ms-result-score-value">${score}점</span>
      </div>
    </div>
  `;
}

function _msResultQuizStatHTML() {
  const st = MissionPercentile.quiz(_msRecords.quiz, MS_PERSONA.id);
  if (st.topPct === null) {
    return `<p class="ms-result-section-sub ms-result-stub">정답이 없어 통계를 낼 수 없어요</p>`;
  }
  // 1% 밑은 반올림하면 전부 "0%"가 되어버려서 소수점 한 자리까지 보여줌(하한 0.1%)
  const _pctText = pct => pct < 1 ? Math.max(0.1, pct).toFixed(1) : Math.round(pct);
  const countLine = `<b>${_pctText(st.atLeastPct)}%</b>가 ${st.n}개 이상 맞췄어요!`;
  const speedLine = `<b>${_pctText(st.fasterPct)}%</b>가 평균 ${st.rtSec.toFixed(2)}초만에 맞췄어요!`;
  const topText = _pctText(st.topPct);

  return `
    <div class="ms-result-stat-card">
      <div class="ms-result-stat-headline">상위 <b>${topText}%</b></div>
      ${_msNormalChartHTML(st.chartZ)}
      <p class="ms-result-stat-line">${countLine}</p>
      <p class="ms-result-stat-line">${speedLine}</p>
    </div>
  `;
}

function _msResultQuizSectionHTML() {
  const items = _msRecords.quiz.map((r, i) => `
    <li class="ms-result-quiz-chip ms-result-quiz-chip--${r.isCorrect ? 'correct' : 'wrong'}">
      <span class="ms-result-quiz-chip-num">${i + 1}</span>
      <span class="ms-result-quiz-chip-mark">${r.isCorrect ? 'O' : 'X'}</span>
      <span class="ms-result-quiz-chip-name">${r.name}</span>
      <span class="ms-result-quiz-chip-time">${r.timeSec.toFixed(1)}s</span>
    </li>
  `).join('');
  return `
    <section class="ms-result-section">
      ${_msResultSectionTitleHTML('코드맞추기', 'ph-fill ph-grid-nine', '#4B7BD6')}
      ${_msResultQuizStatHTML()}
      <ul class="ms-result-quiz-row" id="ms-result-quiz-row">${items}</ul>
    </section>
  `;
}

// 섹션 타이틀 왼쪽 아이콘 — 튜토리얼 타이틀·홈배너·훈련카드와 동일 아이콘/색
function _msResultSectionTitleHTML(text, iconClass, color) {
  return `
    <div class="ms-result-section-title-row">
      <i class="${iconClass}" style="color:${color}"></i>
      <h3 class="ms-result-section-title">${text}</h3>
    </div>
  `;
}

function _msResultScaleSectionHTML() {
  const items = _msRecords.scale.map(r => {
    const wrong = r.nWrong + r.nMissed;
    return `
      <li class="ms-result-scale-item">
        <span class="ms-result-scale-item-name">${r.formName}</span>
        <span class="ms-result-scale-item-stat">맞춘 노트 <b>${r.nCorrect}/${r.total}</b></span>
        <span class="ms-result-scale-item-stat">틀린 노트 <b>${wrong}/${r.total}</b></span>
      </li>
    `;
  }).join('');
  const typeTitle = MS_SCALE_TITLES[_msScaleSessionType] || _msScaleSessionType || '';
  return `
    <section class="ms-result-section">
      ${_msResultSectionTitleHTML('스케일 훈련', 'ph-fill ph-music-notes', '#D06A94')}
      <p class="ms-result-section-sub">${typeTitle} 스케일</p>
      <ul class="ms-result-scale-list">${items}</ul>
    </section>
  `;
}

function _msResultComboSectionHTML() {
  const items = _msRecords.combo.map((r, qi) => {
    const diagrams = r.labels.map((label, si) => {
      const degree = (r.degrees || [])[si];
      const roman    = (typeof CC_DEGREE_TRIAD !== 'undefined' && CC_DEGREE_TRIAD[degree]?.alwaysLabel) || degree || '';
      const isCorrect = (r.slotResults || [])[si];
      // == null로 undefined/null 둘 다 "채점 대상 아님(잠긴 슬롯)"으로 처리 — JSON.stringify가
      // 배열 안의 undefined를 null로 바꿔버려서, 결과를 저장했다가 복원(재진입)하면 잠긴 슬롯이
      // null이 되어 있었음. === undefined만 걸러서 그 경우 그대로 오답(빨강)으로 잘못 표시되던 버그(2026-08-31)
      const ringCls   = isCorrect == null ? '' : (isCorrect ? ' ms-result-combo-diagram--correct' : ' ms-result-combo-diagram--wrong');
      return `
        <div class="ms-result-combo-diagram${ringCls}">
          <span class="ms-result-combo-diagram-roman">${roman}</span>
          <canvas id="ms-result-combo-canvas-${qi}-${si}"></canvas>
          <span class="ms-result-combo-diagram-name">${label}</span>
        </div>
      `;
    }).join('');
    return `
      <li class="ms-result-list-item ms-result-combo-item">
        <div class="ms-result-combo-diagrams" id="ms-result-combo-diagrams-${qi}">${diagrams}</div>
      </li>
    `;
  }).join('');
  return `
    <section class="ms-result-section">
      ${_msResultSectionTitleHTML('코드 조합 훈련', 'ph-fill ph-pencil', '#7B52CC')}
      <p class="ms-result-section-sub">이번에 학습한 Key : ${_msComboSessionKey}</p>
      <ul class="ms-result-list">${items}</ul>
    </section>
  `;
}

// 코드 조합 결과 항목의 4개 코드 다이어그램 — innerHTML 삽입 후 canvas가 실제로 DOM에
// 붙은 다음 그려야 함(_msComboDrawSlotDiagram과 동일 패턴, source 표시는 결과 화면이라 생략)
function _msResultDrawComboDiagrams() {
  if (typeof VoicingCanvas === 'undefined') return;
  const dpr = window.devicePixelRatio || 1;
  const gap = 12; // .ms-result-combo-diagrams gap과 일치해야 함
  _msRecords.combo.forEach((r, qi) => {
    const row = document.getElementById(`ms-result-combo-diagrams-${qi}`);
    if (!row) return;
    // 영역을 꽉 채우되(4등분), 전체 폭은 600px 캡
    const w = Math.min(600, row.clientWidth - gap * 3) / 4;
    (r.degrees || []).forEach((degree, si) => {
      const canvas = document.getElementById(`ms-result-combo-canvas-${qi}-${si}`);
      if (!canvas) return;
      const voicing = _msComboResolveVoicing(degree, r.labels[si], MS_COMBO_KEY_IDX_MAP[r.key], r.chapter);
      if (!voicing) return;
      VoicingCanvas.draw(canvas, voicing, { ratio: (w * dpr) / VoicingCanvas.BASE_W, transparent: true });
      canvas.style.width  = w + 'px';
      canvas.style.height = Math.round(w * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W) + 'px';
    });
  });
}

// 결산 디자인 작업용 목업 데이터 — ?mock=result 진입로 전용. 실제 기록 형식과 동일하게 채움
function _msLoadMockResultData() {
  _msRecords.quiz = [
    { isCorrect: true,  name: 'C',  mode: 'diagram', timeSec: 1.4 },
    { isCorrect: true,  name: 'G',  mode: 'name',    timeSec: 1.1 },
    { isCorrect: true,  name: 'Am', mode: 'diagram', timeSec: 2.0 },
    { isCorrect: false, name: 'Em', mode: 'name',    timeSec: 3.2 },
    { isCorrect: true,  name: 'D',  mode: 'diagram', timeSec: 1.6 },
    { isCorrect: true,  name: 'A',  mode: 'name',    timeSec: 1.3 },
    { isCorrect: true,  name: 'E',  mode: 'diagram', timeSec: 1.8 },
    { isCorrect: false, name: 'Dm', mode: 'name',    timeSec: 2.9 },
    { isCorrect: true,  name: 'C',  mode: 'diagram', timeSec: 1.2 },
    { isCorrect: true,  name: 'G',  mode: 'name',    timeSec: 1.5 },
  ];
  _msScaleSessionType = 'pentatonic';
  _msScaleSessionTypes = ['pentatonic'];
  _msRecords.scale = [
    { formName: 'C폼', nCorrect: 5, nWrong: 1, nMissed: 0, total: 5 },
    { formName: 'A폼', nCorrect: 5, nWrong: 0, nMissed: 0, total: 5 },
  ];
  _msRecords.combo = [
    { key: 'C', labels: ['C', 'Am', 'F', 'G'], degrees: ['I', 'VIm', 'IV', 'V'], slotResults: [true, true, true, true],   correctSlots: 4, totalSlots: 4 },
    { key: 'C', labels: ['C', 'G', 'Am', 'F'], degrees: ['I', 'V', 'VIm', 'IV'], slotResults: [true, false, true, true], correctSlots: 3, totalSlots: 4 },
    { key: 'C', labels: ['C', 'F', 'G', 'C'],  degrees: ['I', 'IV', 'V', 'I'],   slotResults: [true, true, true, true],   correctSlots: 4, totalSlots: 4 },
  ];
}

function msShowResultView() {
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  document.getElementById('mission-session-page').classList.add('ms-result-mode');
  _msResultReached = true; // 종료 시 출석 도장을 찍어도 되는 상태(문제풀이 완주)임을 표시
  _msMarkTodayResultSeen(); // 이제 봤으니 다음 재접속부턴 자동으로 다시 안 띄운다
  _msHideTitleIcon();

  const scores  = _msComputeScores();
  const verdict = MissionResultMessages.build(scores, {
    canDowngrade: MS_PERSONA.canDowngrade,
    nextPersonaName: _msPromoNextPersona().name, // 최상단(기타마스터)이면 null → build()가 '다음 단계'로 대체
  });

  document.getElementById('ms-main').innerHTML = `
    <div class="ms-result ms-result-enter">
      <div class="ms-result-scroll">
        <h2 class="ms-result-heading">훈련 결과!</h2>
        <div class="ms-result-gift">
          <div class="ms-result-gift-img">
            <img src="image/clipboard.png" alt="">
          </div>
          <p class="ms-result-gift-label" id="ms-result-gift-label"></p>
        </div>

        <div class="ms-result-verdict">${verdict.text.split('\n\n').map(t => `<p>${t}</p>`).join('')}</div>

        <div class="ms-result-scores">
          ${_msScoreRowHTML('코드맞추기',    scores.quiz,  'blue')}
          ${_msScoreRowHTML('스케일 훈련',   scores.scale, 'red')}
          ${_msScoreRowHTML('코드 조합 훈련', scores.combo, 'purple')}
        </div>

        ${_msResultQuizSectionHTML()}
        ${_msResultScaleSectionHTML()}
        ${_msResultComboSectionHTML()}
      </div>
    </div>
    <div class="ms-bottom-actions ms-result-btn-row">
      ${_msReviewAvailable() ? '<button class="cd-btn cd-btn--gray" id="ms-result-review-btn" onpointerup="msResultReviewWrong()">오답 풀기</button>' : ''}
      <button class="cd-btn cd-btn--blue" id="ms-result-exit-btn" onpointerup="closeMissionSession()">종료하기</button>
    </div>
  `;
  lucide.createIcons();
  // 결산모드는 타이틀을 숨겨서 #ms-main이 거의 맨 위로 붙기 때문에, 일반 positionMsGradient()의
  // 기준(ms-main.offsetTop)을 그대로 쓰면 그라데이션이 탑바 직후 곧바로 흰색이 되어버림
  // (틴트가 사실상 안 보임) — 결산화면은 고정값으로 충분히 내려서 자연스럽게 이어지게 함
  document.querySelector('.ms-scroll')?.style.setProperty('--ms-gradient-end', '220px');
  const quizRow = document.getElementById('ms-result-quiz-row');
  if (quizRow) {
    _msInitRowMouseDrag(quizRow, 'ms-result-quiz-row--dragging');
    // 안 넘칠 때만 중앙정렬 — 넘치면 flex-start 유지해 1번 칩부터 보이게(위 CSS 주석 참고)
    quizRow.classList.toggle('ms-result-quiz-row--fit', quizRow.scrollWidth - quizRow.clientWidth <= 4);
  }
  _msResultDrawComboDiagrams();

  _msResultSyncGiftLabel();
  _msSaveTodayResult();

  const showClearReward = () => {
    if (!_msRewardDone('clear')) setTimeout(() => _msShowRewardPopup('clear'), 400);
  };
  // 출석 도장은 결산화면 도달=미션 1회 클리어 확정 시점에 바로 찍는다(2026-09 변경 — 이전엔
  // "종료하기"를 눌러야만, 그것도 오답을 다 풀어야만 찍혔음). 도장 연출이 화면을 덮으므로
  // 클리어 보상 팝업은 그게 끝나고(사용자가 도장 확인을 닫은 뒤) 띄운다.
  if (!_msMockMode && !_msStampShown) _msRunStampFlow(showClearReward);
  else showClearReward();
}

// ── 오늘 결산 저장/복원 ──────────────────────────────────────
// 오늘 루틴을 끝낸 뒤 다시 들어오면 처음부터 풀리지 않고 그날 결산을 그대로 보여준다.
// 보상 수령·오답 풀기·도장 여부도 같이 실어서, 재진입했다고 보상이 또 나가지 않게 한다.
const MS_TODAY_RESULT_KEY = 'ms_today_result';

function _msSaveTodayResult() {
  try {
    localStorage.setItem(MS_TODAY_RESULT_KEY, JSON.stringify({
      date:       _msTodayKey(),
      comboKey:   _msComboSessionKey,
      scaleType:  _msScaleSessionType,
      scaleTypes: _msScaleSessionTypes,
      records:    _msRecords,
      reviewDone: _msReviewDone,
      stamped:    _msStampShown,
      claimed:    { ..._msSessionClaimed },
    }));
  } catch (_) {}
}

function _msRestoreTodayResult() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(MS_TODAY_RESULT_KEY) || 'null'); }
  catch (_) { return false; }
  if (!s || s.date !== _msTodayKey() || !s.records) return false;

  _msComboSessionKey  = s.comboKey  || _msComboSessionKey;
  _msScaleSessionType  = s.scaleType || _msScaleSessionType;
  _msScaleSessionTypes = (s.scaleTypes && s.scaleTypes.length) ? s.scaleTypes : (s.scaleType ? [s.scaleType] : _msScaleSessionTypes);
  _msRecords.quiz    = s.records.quiz  || [];
  _msRecords.scale   = s.records.scale || [];
  _msRecords.combo   = s.records.combo || [];
  _msReviewDone      = !!s.reviewDone;
  // 이미 도장까지 찍은 세션이면 나갈 때 도장 연출을 다시 돌리지 않는다.
  // (오답을 남긴 채 나갔던 세션이면 stamped=false — 오답을 마저 풀면 그때 찍힌다)
  _msStampShown = !!s.stamped;
  Object.keys(_msSessionClaimed).forEach(k => {
    _msSessionClaimed[k] = !!(s.claimed && s.claimed[k]);
  });
  // 문제풀이를 이 페이지 로드에서 새로 완주한 게 아니라 저장된 결과를 그대로 불러온
  // 것이지만, 종료 시 도장 판정(closeMissionSession)은 "결산까지 도달했는가"만 본다 —
  // 이걸 세팅하지 않으면 재진입 세션에서는 도장 연출이 영영 안 돈다.
  _msResultReached = true;
  return true;
}

// 결산화면을 실제로 한 번이라도 봤는지(msShowResultView 진입) — ms_today_result와 별개 플래그.
// 결과 "데이터"는 하루 종일 남아있지만, 유저가 이미 한 번 확인했다면 앱 재접속 때마다
// 다시 그 화면으로 튕기지 않고 home으로 보내기 위한 구분값.
const MS_TODAY_RESULT_SEEN_KEY = 'ms_today_result_seen';
function _msMarkTodayResultSeen() {
  try { localStorage.setItem(MS_TODAY_RESULT_SEEN_KEY, _msTodayKey()); } catch (_) {}
}
function _msTodayResultSeen() {
  try { return localStorage.getItem(MS_TODAY_RESULT_SEEN_KEY) === _msTodayKey(); } catch (_) { return false; }
}

// 결산 아이콘 아래 안내문구 — 보상 수령 상태에 따라 다음 행동을 가리킨다
function _msResultSyncGiftLabel() {
  const label = document.getElementById('ms-result-gift-label');
  if (!label) return;
  if (!_msRewardDone('clear')) { label.textContent = ''; return; }
  // 추가 보상을 아직 안 받았고 풀 오답이 남아 있을 때만 유도 문구
  label.textContent = (!_msRewardDone('review') && _msReviewAvailable())
    ? '오답 풀고 추가 보상 받아가세요!'
    : '오늘의 훈련을 모두 마쳤어요!';
}

// ═══════════════════════════════════════════════════════════════
// 데일리 미션 보상 — XP는 페르소나 단계별 차등(2026-08-30 사용자 확정값, 논의 없이 임의로
// 정했던 배율식 초안은 폐기). box(피크상자)는 단계 무관 항상 1개.
//   clear  : 1회 클리어(정답률 무관)
//   review : 오답 전부 다시 맞춤(추가지급)
// 지급 모달에서 "광고 보고 2배" 선택 시 상자만 같은 수량 1회 더 지급.
// XP는 2배 대상 아님(레벨 곡선을 광고로 흔들지 않는다).
// 광고는 pre 내부테스트용으로 켜짐(shared.js MS_AD_ENABLED=true).
// ⚠ 하루 1회 제한은 아직 localStorage 기준 — 서버 RPC(claim_daily_mission_reward)
//   붙기 전까지는 앱 데이터 삭제로 우회 가능. 백엔드 연동 시 _msGrantPeakbox 교체.
// ═══════════════════════════════════════════════════════════════
const MS_REWARD_BY_PERSONA = {
  unboxing:      { clear: { box: 1, xp: 50  }, review: { box: 1, xp: 75  } },
  beginner:      { clear: { box: 1, xp: 75  }, review: { box: 1, xp: 100 } },
  sheet_reader:  { clear: { box: 1, xp: 100 }, review: { box: 1, xp: 150 } },
  home_master:   { clear: { box: 1, xp: 100 }, review: { box: 1, xp: 150 } },
  guitar_master: { clear: { box: 1, xp: 200 }, review: { box: 1, xp: 300 } },
};
function _msRewardFor(kind) {
  const tier = MS_REWARD_BY_PERSONA[MS_PERSONA.id] || MS_REWARD_BY_PERSONA[MS_PERSONA_DEFAULT];
  return tier[kind];
}
const MS_REWARD_LS_KEY = 'ms_reward_claimed';
// true면 하루 1회 수령 제한이 꺼져 매 세션 보상이 다시 지급된다 — 반복 플레이 테스트용.
const MS_REWARD_NO_DAILY_LIMIT = false;

function _msTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function _msRewardState() {
  try {
    const o = JSON.parse(localStorage.getItem(MS_REWARD_LS_KEY) || '{}');
    if (o.date === _msTodayKey()) return o;
  } catch (_) {}
  return { date: _msTodayKey() };
}
function _msRewardIsClaimed(key) {
  if (MS_REWARD_NO_DAILY_LIMIT) return false;
  return _msRewardState()[key] === true;
}
// 하루 1회 가드와 별개로, 한 세션 안에서 같은 보상이 두 번 나가지 않게 막는다.
// (개발용으로 일일 가드를 꺼도 이건 항상 살아있어야 함 — 결산에 재진입할 때마다
//  클리어 보상 팝업이 다시 뜨는 사고를 여기서 막는다)
// 키는 'clear' | 'review' | 'clear_ad' | 'review_ad'
const _msSessionClaimed = { clear: false, review: false, clear_ad: false, review_ad: false };
function _msRewardDone(key) { return !!_msSessionClaimed[key] || _msRewardIsClaimed(key); }
function _msRewardMark(key) {
  if (MS_REWARD_NO_DAILY_LIMIT) return;
  const o = _msRewardState();
  o[key] = true;
  localStorage.setItem(MS_REWARD_LS_KEY, JSON.stringify(o));
}

// 피크상자 지급 — RPC 우선, 실패(dev/비로그인) 시 localStorage 폴백
async function _msGrantPeakbox(count) {
  if (count <= 0) return;
  const r = typeof _peakRpc === 'function'
    ? await _peakRpc('grant_peakbox', { p_count: count, p_source: 'daily_mission' })
    : null;
  if (r && r.ok) {
    _peakState = { ..._peakState, peakbox_count: r.peakbox_count, loaded: true };
  } else {
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + count);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + count, loaded: true };
  }
  if (typeof renderPeakboxBadge === 'function') renderPeakboxBadge();
}

// ── 리워드 광고 어댑터 ─────────────────────────────────────
// @capacitor-community/admob 연동 완료(2026-08-30). MS_AD_ENABLED/MS_AD_TESTING/AD_UNIT_IDS는
// 전부 shared.js로 통합됨(2026-08-31) — 로그인 세션 시작 시 미리 로딩해두는 구조로 바뀌면서
// 페이지 무관하게 한 곳에서 관리할 필요가 생김. 이 파일엔 placement 매핑만 남김.
// 'mission_reward_clear'/'mission_reward_review'는 둘 다 같은 "데일리미션 2배 보상" 단위 하나를
// 씀(_msAdUnitForPlacement가 기본값으로 처리).
function _msAdUnitForPlacement(placement) {
  return AD_UNIT_IDS[placement] || AD_UNIT_IDS.mission_reward;
}
// 광고 OFF 상태에서 2배 버튼을 눌렀을 때의 동작.
//   true  = 광고 없이 그대로 2배 지급(UI/플로우 확인용)
//   false = 아무 일도 일어나지 않음(실서비스에서 SDK 없이 배포될 때의 안전값)
const MS_AD_STUB_GRANTS = false;

const MissionAdProvider = {
  // 광고 버튼/문구를 노출할지 — Pro는 광고 자체가 없는 플랜이라 여기서 막는다.
  // 네이티브 여부는 안 본다: 웹(iOS 등 앱이 없는 환경)에서도 버튼은 그대로 보여주고,
  // 클릭 시 실제 재생 대신 앱 다운로드 안내로 막는 게 정책(2026-09-01, iOS 유저 대응).
  isEligible() { return MS_AD_ENABLED && !isAdFreeUser(); },
  // 실제로 지금 재생까지 할 수 있는 상태인가(SDK 로드/재고 확인 자리 — 네이티브 플러그인
  // 없는 웹/브라우저 dev 환경에서는 항상 false). isEligible() true인데 이게 false면
  // "버튼은 있는데 눌러도 안 되는" 상태 — _msPlayRewardedAd가 그 경우 안내로 대신 막는다.
  isReady() { return this.isEligible() && !!window.Capacitor?.Plugins?.AdMob; },
  // 리워드 광고 재생 → 유저가 끝까지 봐서 보상을 획득했을 때만 true.
  // 실제 로딩/재생·재적재 타이밍은 shared.js _showRewardedAd()가 플러그인 표준 이벤트
  // (Loaded/Reward/Dismissed/FailedToShow)로 관리한다(2026-08-31 재작성).
  async show(placement) {
    return _showRewardedAd(_msAdUnitForPlacement(placement), 'mission');
  },
};

async function _msPlayRewardedAd(placement) {
  if (!MissionAdProvider.isEligible()) return MS_AD_STUB_GRANTS; // Pro 등 애초에 대상 아님
  if (!MissionAdProvider.isReady()) {
    // 버튼은 노출됐지만(isEligible) 네이티브가 아니라 실제 재생은 불가 — 웹 안내로 막고
    // 광고를 안 본(거절한) 것과 동일하게 처리해 호출부 로직을 그대로 태운다
    if (typeof _adUnavailableOnWeb === 'function') _adUnavailableOnWeb();
    return false;
  }
  return MissionAdProvider.show(placement);
}

// Pro 자동 2배로 추가 지급된 상자 수 누적값. msClaimMissionReward()는 항상 silent로 호출되고
// 실제 획득 연출은 호출부(_msShowRewardPopup.settle)가 그리기 때문에, 지급량과 표시량이
// 어긋나지 않도록 여기 담아 전달한다. 읽는 쪽이 지급 시작 전에 0으로 리셋한다.
let _msProBonusBoxes = 0;

// 보상 지급(기본분) + 지급 모달. kind = 'clear' | 'review'
// opts.silent = 지급만 하고 모달은 띄우지 않음(호출부가 직접 연출을 붙일 때)
async function msClaimMissionReward(kind, opts) {
  const R = _msRewardFor(kind);
  if (!R || _msRewardDone(kind)) return false;
  _msSessionClaimed[kind] = true;
  _msRewardMark(kind);

  await _msGrantPeakbox(R.box);
  if (typeof addXp === 'function') addXp(R.xp);
  if (typeof analytics !== 'undefined') {
    analytics.track('mission_reward_claimed', { kind, box: R.box, xp: R.xp, persona: MS_PERSONA.id });
  }

  // Pro는 광고 없이 2배가 기본 — "광고 보고 2배" 버튼을 누르는 과정 없이 여기서 바로 한 번 더 지급.
  // 광고 경로(msRewardWatchAd)와 똑같이 kind+'_ad'를 소진 처리해서, 재진입/강등 후에도
  // 같은 kind에 2배가 두 번 나가지 않게 한다. XP는 광고 경로와 동일하게 2배 대상 아님.
  const proDoubled = isAdFreeUser() && !_msRewardDone(kind + '_ad');
  if (proDoubled) {
    _msSessionClaimed[kind + '_ad'] = true;
    _msRewardMark(kind + '_ad');
    await _msGrantPeakbox(R.box);
    _msProBonusBoxes += R.box; // 획득 연출에 표시할 합계를 호출부가 맞출 수 있도록 누적
    if (typeof analytics !== 'undefined') {
      analytics.track('mission_reward_doubled', { kind, box: R.box, source: 'pro' });
    }
  }

  _msSaveTodayResult(); // 재진입 시 같은 보상이 또 나가지 않도록 수령 상태를 남긴다
  if (!(opts && opts.silent)) _msShowRewardModal(kind, R, proDoubled);
  return true;
}

function _msShowRewardModal(kind, R, proDoubled) {
  // Pro는 이미 2배가 적용된 상태로 도착한다 — 왜 상자가 평소보다 많은지 설명 없이 지나가지
  // 않도록, 합산 수량과 "Pro 2배" 사유를 함께 보여준다(광고 2배 완료 모달과 같은 톤).
  if (proDoubled) {
    _playSfx('reward.mp3');
    showPeakReveal(null, {
      icon:       'gift',
      labelText:  `피크상자 +${R.box * 2}`,
      subText:    `경험치 +${R.xp}XP · Pro 보상 2배 적용!`,
      buttonText: '확인',
      onButton:   closePeakReveal,
    });
    return;
  }
  // 광고 OFF거나 이미 2배를 쓴 kind면 2배 버튼 자체를 띄우지 않는다
  const showAdBtn = MissionAdProvider.isEligible() && !_msRewardIsClaimed(kind + '_ad');
  if (!showAdBtn) {
    // 선택지가 없으면 앱 공용 피크상자 획득 연출(reward.mp3 + gift 등장)을 그대로 사용
    showPeakboxRewardModal(R.box);
    return;
  }
  showPeakReveal(null, {
    icon:        'gift',
    labelText:   `피크상자 +${R.box}`,
    subText:     `경험치 +${R.xp}XP`,
    button2Text: showAdBtn ? '광고 보고 2배' : '',
    onButton2:   () => msRewardWatchAd(kind),
    buttonText:  '확인',
    onButton:    closePeakReveal,
  });
}

// 광고 2배 — 상자만 같은 수량 1회 더. kind별로 각각 1회씩 쓸 수 있다.
// opts.silent = 지급만 하고 연출은 호출부에 맡김. 반환값 = 실제로 2배가 적용됐는지
async function msRewardWatchAd(kind, opts) {
  const R = _msRewardFor(kind);
  if (!R || _msRewardDone(kind + '_ad')) return false;

  const ok = await _msPlayRewardedAd('mission_reward_' + kind);
  if (!ok) return false;
  _msSessionClaimed[kind + '_ad'] = true;
  _msRewardMark(kind + '_ad');

  await _msGrantPeakbox(R.box);
  if (typeof analytics !== 'undefined') {
    // source로 광고 경로와 Pro 자동지급을 구분한다 — 안 나누면 "광고 시청 전환"
    // 집계에 Pro 유저가 섞여 부풀려진다(과거 로그엔 source 없음 = 전부 광고 경로).
    analytics.track('mission_reward_doubled', { kind, box: R.box, source: 'ad' });
  }
  if (opts && opts.silent) return true;
  showPeakReveal(null, {
    icon:       'gift',
    labelText:  `피크상자 +${R.box}`,
    subText:    '광고 보상 2배 적용!',
    buttonText: '확인',
    onButton:   closePeakReveal,
  });
  return true;
}

// ═══════════════════════════════════════════════════════════════
// 오답 풀기
//   본세션에서 틀린 문제만 코드맞추기 → 스케일 → 코드조합 순으로 이어서 낸다.
//   튜토리얼/카운트다운 없이 바로 문제부터.
//   틀려도 그 자리에서 반복하지 않고 그냥 다음 문제로 넘어가며, 틀린 것들만 모아
//   다음 사이클에 다시 낸다(1사이클 → 2사이클 → …). 전부 맞히면 종료.
//   본세션 통계가 오염되면 안 되므로 이 모드에서는 _msRecords 에 아무것도 쌓지 않는다.
// ═══════════════════════════════════════════════════════════════
const MS_REVIEW_STAGES = ['quiz', 'scale', 'combo'];
let _msReviewMode    = false;
let _msReviewDone    = false; // 오답 풀기를 한 번이라도 완주했는가(재진입 복원용 기록)
let _msReviewCycle   = 1;     // 현재 사이클 번호
let _msReviewCleared = 0;     // 이번 사이클에서 맞힌 문제 수 — 게이지 분자
let _msReviewQueue   = { quiz: [], scale: [], combo: [] }; // 이번 사이클에 남은 문제
let _msReviewRetry   = { quiz: [], scale: [], combo: [] }; // 또 틀려서 다음 사이클로 넘길 문제

// 결산 기록에서 틀린 문제만 추려 큐를 만든다. 원본 출제 데이터(item/question)를 그대로 재사용
function _msReviewBuildQueue() {
  return {
    quiz:  _msRecords.quiz .filter(r => !r.isCorrect).map(r => ({ name: r.name, mode: r.mode })),
    scale: _msRecords.scale.filter(r => (r.nWrong + r.nMissed) > 0 && r.item).map(r => r.item),
    // 코드조합은 장마다 문제 구조가 달라서 question만으로는 다시 못 그림 — 장까지 같이 보관
    combo: _msRecords.combo.filter(r => r.correctSlots < r.totalSlots && r.question)
                           .map(r => ({ question: r.question, chapter: r.chapter })),
  };
}
function _msReviewCount(q) { return q.quiz.length + q.scale.length + q.combo.length; }
function _msReviewPeek(stage) { return _msReviewQueue[stage][0] || null; }
function _msReviewStageRemaining(stage) { return _msReviewQueue[stage].length > 0; }

// 오답 풀기 버튼을 띄울 조건 — 틀린 문제가 있고, 아직 오답 풀기를 한 번도 완주하지
// 않았을 때만. 하루 1회 제한(2026-09 변경) — 원본 채점기록(_msRecords)은 오답 풀기를
// 완주해도 안 바뀌므로 _msReviewDone 체크가 없으면 다 풀고도 버튼이 계속 남는다.
function _msReviewAvailable() {
  return !_msReviewDone && _msReviewCount(_msReviewBuildQueue()) > 0;
}

// 이번 사이클에 남았거나 다음 사이클로 넘어간 문제가 하나라도 있는가(버튼 문구 판정용)
function _msReviewHasMore() {
  return MS_REVIEW_STAGES.some(s => _msReviewQueue[s].length || _msReviewRetry[s].length);
}

// 채점 — 맞으면 그대로 소멸, 틀리면 다음 사이클 몫으로 넘긴다. 어느 쪽이든 다음 문제로 진행
function _msReviewGrade(stage, item, isCorrect) {
  const q = _msReviewQueue[stage];
  if (!q.length) return;
  const found = item ? q.indexOf(item) : -1;
  const [popped] = q.splice(found >= 0 ? found : 0, 1);
  if (isCorrect) {
    _msReviewCleared++;
    msUpdateProgress(_msReviewCleared);
  } else if (popped) {
    _msReviewRetry[stage].push(popped);
  }
}

// 남은 단계로 이동. 이번 사이클이 다 끝났으면 틀린 것만 모아 다음 사이클을 시작하고,
// 그것마저 없으면 오답 풀기 종료
function _msReviewNextStage() {
  let next = MS_REVIEW_STAGES.find(s => _msReviewQueue[s].length);
  if (!next) {
    const retryCount = MS_REVIEW_STAGES.reduce((n, s) => n + _msReviewRetry[s].length, 0);
    if (!retryCount) { _msReviewFinish(); return; }
    _msReviewCycle++;
    _msReviewQueue   = _msReviewRetry;
    _msReviewRetry   = { quiz: [], scale: [], combo: [] };
    _msReviewCleared = 0;
    _msTotalSteps    = retryCount; // 게이지 분모를 이번 사이클 문제 수로 갱신
    msUpdateProgress(0);
    next = MS_REVIEW_STAGES.find(s => _msReviewQueue[s].length);
  }
  if (next === 'quiz')  { _msTransitionView(msShowQuizView);      return; }
  if (next === 'scale') { _msTransitionView(msShowScaleQuizView); return; }
  _msTransitionView(msShowComboQuizView);
}

// 오답을 전부 맞힌 순간 — 결산으로 바로 튕기지 않고 완료 팝업으로 한 번 끊어준다.
// 팝업에서 보상(2배 / 그냥 확인)을 고르고 나서야 결산으로 돌아간다.
function _msReviewFinish() {
  _msReviewMode = false;
  _msReviewDone = true;
  _msTotalSteps = MS_TOTAL_STEPS;
  _msShowReviewCompleteModal();
}

// 오답 보상까지 받으면 세션은 여기서 끝 — 결산으로 되돌아가지 않고 바로 출석 도장 → 홈
function _msReviewExitAfterReward() {
  closeMissionSession();
}

function _msShowReviewCompleteModal() {
  if (typeof analytics !== 'undefined') {
    analytics.track('mission_review_completed', { cycles: _msReviewCycle });
  }
  _msShowRewardPopup('review', _msReviewExitAfterReward);
}

// ── 보상 수령 팝업 (clear / review 공용) ──────────────────────
// 결산 화면의 이미지는 더 이상 버튼이 아니고, 수령은 전부 이 팝업에서 일어난다.
const MS_REWARD_POPUP_COPY = {
  clear:  { title: '훈련 루틴 완료!',  desc: '오늘의 훈련을 끝냈어요<br>보상을 받아가세요!' },
  review: { title: '오답 풀기 완료!', desc: '틀린 문제를 전부 다시 맞혔어요<br>추가 보상을 받아가세요!' },
};
// 오답 없이 만점으로 끝냈을 때 — 오답 풀기를 할 수 없으니 그 몫(review)까지 클리어 시점에
// 한 번에 합쳐서 준다. 안 그러면 틀렸다가 다시 맞힌 유저보다 만점 유저가 보상이 적어진다.
const MS_REWARD_POPUP_COPY_PERFECT = {
  clear: { title: '전 문항 정답!', desc: '만점이에요!<br>오답 풀기 몫까지 한 번에 받아가세요!' },
};
// 오답 풀기는 몇 번이든 다시 할 수 있지만 보상은 하루 한 번뿐 — 2회차부터는 이 문구로 대체
const MS_REWARD_POPUP_COPY_AGAIN = {
  clear:  { title: '훈련 루틴 완료!',  desc: '오늘 보상은 이미 받았어요' },
  review: { title: '오답 풀기 완료!', desc: '전부 다시 맞혔어요!<br>오늘 추가 보상은 이미 받았어요' },
};

function _msBuildRewardPopup() {
  let ov = document.getElementById('ms-reward-popup-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'ms-reward-popup-overlay';
  ov.className = 'attendance-modal-overlay';
  ov.innerHTML =
    '<div class="attendance-modal ms-review-done-modal">' +
      '<img src="image/gift.png" class="ms-review-done-icon" alt="">' +
      '<div class="attendance-modal-title" id="ms-reward-popup-title"></div>' +
      '<div class="attendance-modal-desc" id="ms-reward-popup-desc"></div>' +
      '<div class="attendance-modal-actions">' +
        '<button type="button" class="attendance-modal-btn attendance-modal-btn--ghost" id="ms-reward-popup-ok">확인</button>' +
        '<button type="button" class="attendance-modal-btn ms-review-done-ad" id="ms-reward-popup-ad">' +
          '<i class="ph-fill ph-play-circle"></i><span>보상 2배 받기</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  return ov;
}

// kind = 'clear' | 'review'. onDone = 획득 연출까지 끝난 뒤 이어질 동작(없으면 그대로 머무름)
function _msShowRewardPopup(kind, onDone) {
  const R = _msRewardFor(kind);
  if (!R) { if (typeof onDone === 'function') onDone(); return; }

  // 오답이 하나도 없는 만점 클리어 — 오답 풀기 자체를 할 수 없으니 review 몫까지
  // 지금 한 번에 합쳐서 지급한다(안 그러면 만점 유저가 오답을 낸 유저보다 보상이 적어짐)
  const perfectBonus = kind === 'clear' && !_msReviewAvailable() && !_msRewardDone('review');
  const clearR = _msRewardFor('clear'), reviewR = _msRewardFor('review');
  const effR = perfectBonus
    ? { box: clearR.box + reviewR.box, xp: clearR.xp + reviewR.xp }
    : R;

  // 오늘 이미 받은 보상이면 지급 없이 완료만 알린다(2회차 이후 오답 풀기)
  const alreadyGot = _msRewardDone(kind);
  const copy = alreadyGot ? MS_REWARD_POPUP_COPY_AGAIN[kind]
    : (perfectBonus ? MS_REWARD_POPUP_COPY_PERFECT.clear : MS_REWARD_POPUP_COPY[kind]);
  const adUsable = MissionAdProvider.isEligible() && !alreadyGot && !_msRewardDone(kind + '_ad');

  const ov = _msBuildRewardPopup();
  document.getElementById('ms-reward-popup-title').textContent = copy.title;
  document.getElementById('ms-reward-popup-desc').innerHTML    = copy.desc;

  const adBtn = document.getElementById('ms-reward-popup-ad');
  adBtn.style.display = adUsable ? '' : 'none';
  // 광고 버튼이 숨겨지면 확인 버튼 혼자 flex:1로 늘어나 어색하게 왼쪽으로 치우쳐 보임 —
  // 버튼 1개일 땐 폭 고정 + 가운데 정렬로 전환(2026-08-31)
  ov.querySelector('.attendance-modal-actions').classList.toggle('attendance-modal-actions--single', !adUsable);

  const close = () => ov.classList.remove('attendance-modal-overlay--show');

  // 팝업이 뜨자마자(유저가 문구 읽는 동안) 기본 보상 지급 RPC를 미리 백그라운드로 쏴둔다.
  // "확인"을 눌렀을 때 그제서야 지급 RPC를 시작하면 서버 왕복하는 동안 화면이 비어있어서
  // "보상이 한참 뒤에 뜬다"로 느껴짐(2026-08-31) — settle()은 이미 진행 중인 이 Promise를
  // 기다리기만 해서 체감 지연을 없앤다. 광고 2배 경로는 광고 자체가 오래 걸리는 구간이라
  // 그대로 클릭 시점에 시작.
  _msProBonusBoxes = 0; // Pro 자동 2배 누적값 — 이번 지급분만 세도록 시작 전에 리셋
  const _mspClaimPromise = alreadyGot ? null : (async () => {
    await msClaimMissionReward(kind, { silent: true });
    if (perfectBonus) await msClaimMissionReward('review', { silent: true }); // review 몫도 같이 지급·기록
  })();

  // 어느 쪽을 고르든 기본 보상은 지급된다. 획득 연출은 앱 공용 피크상자 모달로 한 번만.
  const settle = async (useAd) => {
    close();
    if (alreadyGot) { // 추가 지급 없음 — 연출도 생략하고 바로 다음 단계
      setTimeout(() => { if (typeof onDone === 'function') onDone(); }, 240);
      return;
    }
    await _mspClaimPromise;
    let boxes = effR.box;
    // Pro는 msClaimMissionReward()가 이미 광고 없이 2배분을 지급해뒀다 — 그 실제 지급량을
    // 그대로 더해야 "지급은 2배인데 표시는 1배"로 어긋나지 않는다(만점 보너스 합산도 포함).
    boxes += _msProBonusBoxes;
    const proBonusGiven = _msProBonusBoxes > 0;
    if (useAd && await msRewardWatchAd(kind, { silent: true })) boxes += effR.box;
    setTimeout(() => showPeakboxRewardModal(boxes, () => {
      _msResultSyncGiftLabel();
      if (typeof onDone === 'function') onDone();
    }, proBonusGiven ? { subText: 'Pro 보상 2배 적용!' } : null), 240);
  };

  document.getElementById('ms-reward-popup-ok').onclick = () => { _playTap(); settle(false); };
  adBtn.onclick = () => { _playTap(); _playConfirmSfx(); settle(true); };

  ov.classList.add('attendance-modal-overlay--show');
}

function msResultReviewWrong() {
  _playTap();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();

  const queue = _msReviewBuildQueue();
  const total = _msReviewCount(queue);
  if (!total) return;

  // queue.scale의 item은 원본 채점 기록(_msRecords.scale[i].item)과 같은 객체 참조라
  // 데일리미션 본세션에서 맞혔던 dot 정보(prefilled)가 자연스럽게 이어짐 — 여기서 비우면
  // 원본에서 맞힌 자리까지 오답풀기 진입 시 통째로 날아간다(2026-08-31 버그, 비우던 줄 제거).

  _msReviewQueue   = queue;
  _msReviewRetry   = { quiz: [], scale: [], combo: [] };
  _msReviewMode    = true;
  _msReviewCycle   = 1;
  _msReviewCleared = 0;
  _msTotalSteps    = total; // 게이지 분모를 틀린 문제 수로 교체

  // 결산모드 해제 — 탑바(진행 게이지)를 다시 보이게 하고 틴트 오프셋도 원래 계산으로 되돌림
  document.getElementById('mission-session-page').classList.remove('ms-result-mode');
  document.querySelector('.ms-scroll')?.style.removeProperty('--ms-gradient-end');
  msUpdateProgress(0);

  if (typeof analytics !== 'undefined') analytics.track('mission_review_started', { total });
  _msReviewNextStage();
}

// 코드 조합 훈련 튜토리얼 뷰 — 3단 구조 뼈대만, 콘텐츠 없음
function msShowChordComboTutorial() {
  _msComboKey = _msComboSessionKey; // 미리보기 칩 초기 선택값도 이번 세션에 배정된 key로 시작
  document.getElementById('ms-title-text').textContent = '코드 조합 훈련';
  _msSetTitleIcon('ph-fill ph-pencil', '#7B52CC'); // 훈련카드 아이콘 + 결산게이지 purple톤과 통일
  const desc = document.getElementById('ms-title-desc');
  desc.style.display = '';
  desc.innerHTML =
    '<span class="ms-desc-line ms-stagger-pending">코드 진행을 연습할 수 있어요!</span>' +
    '<span class="ms-desc-line ms-stagger-pending">악보 없이 연주하는데 최고의 연습이 될 거예요!</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <div class="ms-combo-key-chips ms-stagger-pending" id="ms-combo-key-chips"></div>
      <div class="ms-combo-row ms-stagger-pending" id="ms-combo-row"></div>
      <p class="ms-chord-hint ms-stagger-pending">순서를 외워주세요!</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-combo-start-btn" onpointerup="msComboStart()">준비됐어요!</button>
    </div>
  `;
  renderComboKeyChips();
  renderDiatonicTable();
  _msRunStaggerAndBindStartBtn('ms-combo-row', 'ms-combo-start-btn');
}

// key 선택 칩 (C D E G A) — 레이아웃만, 선택 시 활성 스타일만 토글(데이터 연동은 아직 없음)
const MS_COMBO_KEYS = MS_POOL.comboKeys;
let _msComboKey = 'C';

function renderComboKeyChips() {
  const wrap = document.getElementById('ms-combo-key-chips');
  if (!wrap) return;
  wrap.innerHTML = MS_COMBO_KEYS.map(k =>
    `<button class="ms-combo-key-chip${k === _msComboKey ? ' ms-combo-key-chip--active' : ''}" data-key="${k}">${k} key</button>`
  ).join('');
  wrap.querySelectorAll('.ms-combo-key-chip').forEach(chip => {
    _msInitTapVsDrag(chip, () => {
      _playTap();
      _msComboKey = chip.dataset.key;
      renderComboKeyChips();
      renderDiatonicTable();
    });
  });
  _msInitRowMouseDrag(wrap, 'ms-combo-key-chips--dragging');
}

// C key 다이어토닉 코드표 — 로마자(도수) 위, 실제 코드명 아래. 가로 스크롤(코드맞추기와 동일 패턴)
// 도수별 로마자/구성음 패턴은 키 무관 공통 — 키별로 실제 코드명만 다름
const MS_DIATONIC_PATTERN = [
  { roman: 'I',      notes: '1 3 5' },
  { roman: 'IIm',    notes: '1 b3 5' },
  { roman: 'IIIm',   notes: '1 b3 5' },
  { roman: 'IV',     notes: '1 3 5' },
  { roman: 'V',      notes: '1 3 5' },
  { roman: 'VIm',    notes: '1 b3 5' },
  { roman: 'VIIdim', notes: '1 b3 b5' },
];
const MS_DIATONIC_CHORDS = {
  C: ['C',  'Dm',  'Em',  'F',  'G',  'Am',  'Bdim'],
  D: ['D',  'Em',  'F#m', 'G',  'A',  'Bm',  'C#dim'],
  E: ['E',  'F#m', 'G#m', 'A',  'B',  'C#m', 'D#dim'],
  G: ['G',  'Am',  'Bm',  'C',  'D',  'Em',  'F#dim'],
  A: ['A',  'Bm',  'C#m', 'D',  'E',  'F#m', 'G#dim'],
};

function renderDiatonicTable() {
  const row = document.getElementById('ms-combo-row');
  if (!row) return;
  const chords = MS_DIATONIC_CHORDS[_msComboKey] || MS_DIATONIC_CHORDS.C;
  row.innerHTML = MS_DIATONIC_PATTERN.map((d, i) => `
    <div class="ms-combo-card">
      <span class="ms-combo-roman">${d.roman}</span>
      <span class="ms-combo-chord">${chords[i]}</span>
      <span class="ms-combo-notes">${d.notes}</span>
    </div>
  `).join('');
  _msInitRowMouseDrag(row, 'ms-combo-row--dragging');
}

function msComboStart() {
  _playTap();
  _playConfirmSfx();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _msTransitionView(msShowComboQuizView);
}

// 코드 조합 문제풀이 뷰 — chord-combo.html의 실제 퀴즈 마크업/CSS클래스를 그대로 재사용
// (①문제카드 .combo-quiz-question ②4칸 정답슬롯 .combo-quiz-answer ③코드블럭 풀 .combo-quiz-blocks)
function msShowComboQuizView() {
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = `
    <div class="combo-quiz-wrap" id="ms-combo-quiz-wrap">
      <div class="combo-quiz-question">
        <span class="combo-quiz-key" id="ms-combo-quiz-key"></span>
        <span class="combo-quiz-prompt">주어진 진행을 순서대로 배치하세요</span>
      </div>
      <div class="combo-quiz-answer" id="ms-combo-quiz-answer">
        <div class="combo-answer-slot"><div class="combo-answer-drop"></div><span class="combo-answer-degree">I</span></div>
        <div class="combo-answer-slot"><div class="combo-answer-drop"></div><span class="combo-answer-degree">VIm</span></div>
        <div class="combo-answer-slot"><div class="combo-answer-drop"></div><span class="combo-answer-degree">IV</span></div>
        <div class="combo-answer-slot"><div class="combo-answer-drop"></div><span class="combo-answer-degree">V</span></div>
        <div id="ms-combo-answer-bracket" class="combo-answer-bracket" style="display:none"></div>
      </div>
      <div class="combo-quiz-hint" id="ms-combo-quiz-hint" onpointerup="msComboShowHint()">
        <i class="ph ph-lightbulb"></i>
        <span>힌트보기</span>
        <div class="combo-hint-bubble" id="ms-combo-hint-bubble" style="display:none"></div>
      </div>
      <div class="combo-quiz-blocks ms-combo-blocks--scrollrow" id="ms-combo-quiz-blocks"></div>
      <div class="ms-combo-scroll-hint" id="ms-combo-scroll-hint"><div class="ms-combo-scroll-dot"></div></div>
      <button class="combo-quiz-submit" id="ms-combo-submit-btn" onpointerup="msComboSubmit()">제출하기</button>
    </div>
  `;
  _msComboSubmitted = false; // 오답 풀기로 재진입할 때 이전 세션의 제출상태가 남아있지 않도록
  _msComboInitScrollHint();
  _msComboInitTrayBackgroundDrag(document.getElementById('ms-combo-quiz-blocks'));
  _msComboRenderQuestion();
  _msComboInitDragDrop();
  if (_msExamMode) msPersonaPromoTimerStart(_msExamSectionTimeSec, msPersonaPromoTimeoutPopup);
}

// ── 힌트보기 — chord-combo.js CC_CHAPTER_HINTS/comboShowHint 이식 ──
// (chord-combo.js는 미션 페이지에서 로드하지 않아 장별 힌트 문구를 여기 별도 보관)
const MS_COMBO_HINTS = {
  scale: () => {
    const q = _msComboQuestion;
    const notes = getMajorScaleNotes(q.keyIdx, false);
    return `${q.keyName} 스케일은 ${notes.join(' ')} 예요.`;
  },
  // 타겟의 근음을 알려주는 장들 — 문구만 다름
  target: (suffix) => () => {
    const q = _msComboQuestion;
    if (!q?.targetDegree) return null;
    const chord = degreeToChordName(q.targetDegree, q.keyIdx, false, false);
    const root  = chord.match(/^([A-G][#b]?)/)?.[1] || chord;
    return `타겟인 ${root}의 ${suffix}`;
  },
};
const MS_COMBO_CHAPTER_HINTS = {
  '1': MS_COMBO_HINTS.scale,
  '2': MS_COMBO_HINTS.scale,
  '3': MS_COMBO_HINTS.target('5번째 코드를 찾아보세요!'),
  '4': MS_COMBO_HINTS.target('2번째와 5번째 코드를 찾아보세요!'),
  '5': () => {
    const q = _msComboQuestion;
    if (!q?.targetDegree || !q.substituteDegree) return null;
    const chord = degreeToChordName(q.targetDegree, q.keyIdx, false, false);
    const root  = chord.match(/^([A-G][#b]?)/)?.[1] || chord;
    // 트라이톤서브만 타겟 반음 위(bII), 1전위·디미니쉬7은 반음 아래(리딩톤)
    return `타겟인 ${root}의 반음 ${q.substituteDegree.endsWith('_SUBV') ? '높은' : '낮은'} 음을 찾으세요!`;
  },
  '6': () => {
    const q = _msComboQuestion;
    if (!q?.targetDegree) return null;
    const quality = (typeof CC_DEGREE_TRIAD !== 'undefined') ? CC_DEGREE_TRIAD[q.targetDegree]?.quality7 : null;
    if (quality === 'M7') return 'M7코드는 9, #11, 13 텐션을 사용할 수 있어요!';
    if (quality === 'm7') return 'm7코드는 9, 11 텐션을 사용할 수 있어요!';
    if (quality === '7')  return '7코드는 모든 텐션을 사용할 수 있어요!';
    return null;
  },
  '7': () => {
    const q = _msComboQuestion;
    const notes = getMinorScaleNotes(q.keyIdx, false);
    return `${q.keyName} 스케일은 ${notes.join(' ')} 예요!`;
  },
  '8': MS_COMBO_HINTS.scale,
};

// 어려움 난이도는 힌트 미제공 — chord-combo.js _comboUpdateHintVisibility와 동일 규칙
function _msComboUpdateHintVisibility() {
  const btn = document.getElementById('ms-combo-quiz-hint');
  if (!btn) return;
  const available = MS_POOL.comboDifficulty !== 'high' && !!MS_COMBO_CHAPTER_HINTS[_msComboChapter];
  btn.classList.toggle('combo-quiz-hint--hidden', !available);
}

function msComboShowHint() {
  const q = _msComboQuestion;
  if (!q) return;
  if (MS_POOL.comboDifficulty === 'high') return;
  const fn = MS_COMBO_CHAPTER_HINTS[_msComboChapter];
  if (!fn) return;
  const text = fn();
  if (!text) return;
  const bubble = document.getElementById('ms-combo-hint-bubble');
  if (!bubble) return;
  const showing = bubble.style.display !== 'none';
  if (showing) {
    bubble.style.display = 'none';
    bubble.classList.remove('combo-hint-bubble--show');
    return;
  }
  bubble.textContent = text;
  bubble.style.display = 'block';
  bubble.classList.remove('combo-hint-bubble--show');
  void bubble.offsetWidth;
  bubble.classList.add('combo-hint-bubble--show');
}

// 문제 생성은 chord-combo-questions.js 원본 알고리즘을 그대로 호출.
// 장(chapter)은 페르소나 풀에서 문제마다 하나씩 뽑고, key는 세션 내내 고정.
let _msComboSeenProgressions = []; // 직전 진행 중복 방지(generateCh1Progression의 avoidSeqs)
let _msComboQuestion = null;
let _msComboChapter    = '1';  // 이번 문제의 장 — 채점/보이싱 분기에 필요
let _msComboReviewItem = null; // 오답 풀기에서 현재 출제 중인 큐 항목 { question, chapter }
let _msComboLastTarget = null; // 같은 타겟 연속 출제 방지(chord-combo.js _comboLastTarget과 동일 역할)
const MS_COMBO_TOTAL = _msDailyTotals.combo;      // 코드 조합 훈련 문제 수
let _msComboQuestionIndex = 0; // 0-indexed, 답변 완료한 코드조합 문제 수

// 장별 생성함수/렌더옵션 — chord-combo.js renderComboQuestion()의 분기를 그대로 옮김
const MS_COMBO_CHAPTERS = {
  '1': { gen: null,                 type: 'placement' },
  '2': { gen: () => generateCh2Question, type: 'substitution', hideNonTargetLabels: true,  prefillTarget: true  },
  '3': { gen: () => generateCh3Question, type: 'substitution', hideNonTargetLabels: false, prefillTarget: false },
  '4': { gen: () => generateCh4Question, type: 'substitution', hideNonTargetLabels: false, prefillTarget: false },
  '5': { gen: () => generateCh5Question, type: 'substitution', hideNonTargetLabels: false, prefillTarget: true  },
  '6': { gen: () => generateCh6Question, type: 'substitution', hideNonTargetLabels: false, prefillTarget: true,
         promptText: '어울리는 텐션을 찾아서 바꿔보세요' },
  '7': { gen: () => generateCh7Question, type: 'placement' },
  '8': { gen: () => generateCh8Question, type: 'substitution', hideNonTargetLabels: false, prefillTarget: true,
         noBracket: true },
};

// 코드명 안의 "(9)" 같은 텐션 표기만 위첨자로 — chord-combo.js _ccFormatB5 이식
function _msCcFormat(text) {
  return String(text).replace(/\([^)]*\)/g, m => `<sup>${m}</sup>`);
}

// 슬롯 i의 정답 도수 — 배치형은 degrees, 교체형은 타겟자리만 대체도수 (chord-combo.js _comboCorrectDegreeForSlot 이식)
function _msComboCorrectDegree(q, i) {
  if (!q) return null;
  if (q.degrees) return q.degrees[i];
  const targets = q.targetIndices || [q.targetIndex];
  const subs    = q.substituteDegrees || [q.substituteDegree];
  const k = targets.indexOf(i);
  return k !== -1 ? subs[k] : q.baseDegrees[i];
}

// 4장 등: 교체 대상 두 슬롯을 하단 브래킷으로 연결 (chord-combo.js _comboUpdateBracket 이식)
function _msComboUpdateBracket(targets) {
  const bracket = document.getElementById('ms-combo-answer-bracket');
  if (!bracket) return;
  if (!targets || targets.length < 2) { bracket.style.display = 'none'; return; }
  const container = document.getElementById('ms-combo-quiz-answer');
  const slotEls = container?.querySelectorAll('.combo-answer-slot');
  if (!container || !slotEls?.length) { bracket.style.display = 'none'; return; }
  const sorted = [...targets].sort((a, b) => a - b);
  const startSlot = slotEls[sorted[0]];
  const endSlot   = slotEls[sorted[sorted.length - 1]];
  if (!startSlot || !endSlot) { bracket.style.display = 'none'; return; }
  const cRect = container.getBoundingClientRect();
  // 양 끝을 슬롯 가장자리가 아니라 슬롯 중앙에 맞춤
  const sRect = startSlot.getBoundingClientRect();
  const eRect = endSlot.getBoundingClientRect();
  const startCenter = sRect.left + sRect.width / 2 - cRect.left;
  const endCenter   = eRect.left + eRect.width / 2 - cRect.left;
  bracket.style.display = '';
  bracket.style.left  = startCenter + 'px';
  bracket.style.width = (endCenter - startCenter) + 'px';
}

function _msComboRenderQuestion() {
  // 오답 풀기는 틀렸던 진행을 그대로 다시 낸다(트레이 구성·장까지 동일)
  const reviewItem = _msReviewMode ? _msReviewPeek('combo') : null;
  if (_msReviewMode && !reviewItem) { _msReviewNextStage(); return; }
  _msComboReviewItem = reviewItem; // 채점 시 큐에서 같은 항목을 찾아 빼내야 해서 보관

  const chapters = MS_POOL.comboChapters;
  _msComboChapter = reviewItem?.chapter
    || chapters[Math.floor(Math.random() * chapters.length)];
  const spec   = MS_COMBO_CHAPTERS[_msComboChapter] || MS_COMBO_CHAPTERS['1'];
  const diff   = MS_POOL.comboDifficulty;
  const keyIdx = MS_COMBO_KEY_IDX_MAP[_msComboSessionKey];

  let q = reviewItem?.question;
  if (!q) {
    q = spec.gen
      ? spec.gen()(spec.type, diff, keyIdx, false, _msComboSeenProgressions, _msComboLastTarget)
      : generateCh1Question(diff, keyIdx, false, _msComboSeenProgressions);
    _msComboSeenProgressions.push(q.degrees || q.baseDegrees);
    if (q.targetDegree) _msComboLastTarget = q.targetDegree;
  }
  _msComboQuestion = q;

  document.getElementById('ms-combo-quiz-key').textContent = `${q.keyName} key`;
  const hintBubble = document.getElementById('ms-combo-hint-bubble');
  if (hintBubble) { hintBubble.style.display = 'none'; hintBubble.classList.remove('combo-hint-bubble--show'); }

  // 교체형 장은 "배치"가 아니라 지정 슬롯만 바꾸는 거라 상단 지문도 장 유형에 맞춰 바꿈
  const titleEl = document.getElementById('ms-title-text');
  if (titleEl) titleEl.textContent = spec.type === 'placement'
    ? '아래에서 정답을 찾아 배치하세요!'
    : '아래에서 정답을 찾아 바꿔보세요!';

  const promptEl = document.querySelector('#ms-combo-quiz-wrap .combo-quiz-prompt');
  const slots = document.querySelectorAll('#ms-combo-quiz-answer .combo-answer-slot');
  slots.forEach(slot => slot.querySelector('.combo-answer-diagram')?.remove());

  if (spec.type === 'placement') {
    if (promptEl) promptEl.textContent = '주어진 진행을 순서대로 배치하세요';
    slots.forEach((slot, i) => {
      slot.classList.remove('combo-answer-slot--target');
      slot.dataset.locked = '';
      slot.dataset.answerChord = q.chords[i];
      slot.querySelector('.combo-answer-degree').innerHTML = _msCcFormat(q.labels[i]);
      const drop = slot.querySelector('.combo-answer-drop');
      drop.innerHTML = '';
      drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong', 'combo-answer-drop--locked');
    });
    _msComboUpdateBracket(null);
  } else {
    // 교체형: 원본 진행을 전부 배치하고 강조 슬롯만 유저가 교체
    const targets = q.targetIndices || [q.targetIndex];
    const answerAt = {};
    if (q.substituteChords) targets.forEach((idx, k) => { answerAt[idx] = q.substituteChords[k]; });
    else answerAt[q.targetIndex] = q.substituteChord;

    if (promptEl) {
      // 라벨 조각에만 위첨자 처리 — 문장 전체에 걸면 "(으)로"의 괄호까지 위첨자가 됨
      promptEl.innerHTML = spec.promptText || (q.substituteLabels
        ? `표시된 부분을 순서대로 ${q.substituteLabels.map(_msCcFormat).join(' · ')}(으)로 바꿔보세요`
        : `표시된 부분을 ${_msCcFormat(q.substituteLabel)}(으)로 바꿔보세요`);
    }
    slots.forEach((slot, i) => {
      const isTarget = targets.includes(i);
      slot.querySelector('.combo-answer-degree').innerHTML =
        (!spec.hideNonTargetLabels || isTarget) ? _msCcFormat(q.labels[i]) : '';
      const drop = slot.querySelector('.combo-answer-drop');
      drop.innerHTML = '';
      drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong');
      drop.classList.toggle('combo-answer-drop--locked', !isTarget);
      // 잠긴 슬롯은 항상 원본 코드로 채움. 강조 슬롯은 장별 prefillTarget 옵션에 따름
      if (!isTarget || spec.prefillTarget) {
        const block = document.createElement('div');
        block.className = 'combo-block';
        block.innerHTML = _msCcFormat(q.originalChords[i]);
        block.dataset.degree = q.baseDegrees[i];
        block.dataset.chord  = q.originalChords[i];
        drop.appendChild(block);
      }
      slot.classList.toggle('combo-answer-slot--target', isTarget);
      slot.dataset.locked = isTarget ? '' : '1';
      slot.dataset.answerChord = isTarget ? answerAt[i] : q.originalChords[i];
    });
    _msComboUpdateBracket(spec.noBracket ? null : (q.bracketIndices || (targets.length > 1 ? targets : null)));
    // 잠긴 슬롯만 다이어그램 노출 — 강조(정답) 슬롯은 채점 전엔 안 그림(힌트 방지)
    slots.forEach((slot, i) => {
      if (slot.dataset.locked === '1') _msComboDrawSlotDiagram(slot, _msComboCorrectDegree(q, i), slot.dataset.answerChord);
    });
  }

  const blocksWrap = document.getElementById('ms-combo-quiz-blocks');
  const mustInclude = spec.type === 'placement'
    ? q.degrees
    : (q.substituteDegrees || [q.substituteDegree]);
  _msComboRenderTray(q.tray, mustInclude, blocksWrap);

  _msComboUpdateHintVisibility();
}

// ── 트레이 카드 배열 — 1줄 고정 + 가로 스크롤 ──
// 장이 올라갈수록 후보가 최대 15장까지 늘어남. chord-combo.js 원본은 최대 3줄로 줄바꿈해서
// 담았지만(폭 측정+트리밍 로직 필요), 미션 레이아웃에서는 3줄이 되면 제출버튼이 화면 밖으로
// 밀려나는 문제가 있어 1줄 고정+가로 스크롤로 바꿈 — 트리밍이 필요 없어져 로직도 단순해짐
function _msComboRenderTray(candidates, mustInclude, blocksWrap) {
  const mustSet = new Set(mustInclude);
  const must = candidates.filter(c => mustSet.has(c.degree));
  const rest = candidates.filter(c => !mustSet.has(c.degree));
  const ordered = [...must, ...rest];
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  blocksWrap.innerHTML = '';
  ordered.forEach(({ degree, chord }) => {
    const block = document.createElement('div');
    block.className = 'combo-block';
    block.innerHTML = _msCcFormat(chord);
    block.dataset.degree = degree;
    block.dataset.chord = chord;
    blocksWrap.appendChild(block);
  });

  const scroller = document.getElementById('ms-combo-quiz-blocks');
  if (scroller) scroller.scrollLeft = 0; // 새 문제는 항상 맨 왼쪽부터 보이게
  _msComboUpdateScrollHint();
}

// 스크롤 가능(오른쪽에 더 남음)할 때만 화살표 힌트 노출 — 끝까지 스크롤하면 사라짐
function _msComboUpdateScrollHint() {
  const scroller = document.getElementById('ms-combo-quiz-blocks');
  const hint = document.getElementById('ms-combo-scroll-hint');
  if (!scroller || !hint) return;
  const hasOverflow = scroller.scrollWidth - scroller.clientWidth > 4;
  const atEnd = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
  hint.classList.toggle('ms-combo-scroll-hint--hidden', !hasOverflow || atEnd);
  // 카드가 적어서 안 넘칠 땐 왼쪽 붙임 대신 가운데 정렬
  scroller.classList.toggle('ms-combo-blocks--fit', !hasOverflow);
}
function _msComboInitScrollHint() {
  const scroller = document.getElementById('ms-combo-quiz-blocks');
  if (!scroller || scroller._scrollHintInit) return;
  scroller._scrollHintInit = true;
  scroller.addEventListener('scroll', _msComboUpdateScrollHint);
  window.addEventListener('resize', _msComboUpdateScrollHint);
}

// ── 트레이 빈 공간(카드 사이 gap) 드래그로 가로스크롤 — attendance.js initGridMouseDrag와
// 동일 패턴(마우스 전용, 이미 실기기에서 검증된 방식). 터치는 overflow-x:auto가 기본 처리하고
// 카드 위 드래그는 축 잠금(_msComboBlockPointerDown 아래)이 따로 처리하므로 여기는
// "카드가 아닌 곳에서 시작한 마우스 드래그"만 다룬다. ──
function _msComboInitTrayBackgroundDrag(scroller) {
  if (!scroller || scroller._dragInit) return;
  scroller._dragInit = true;
  let dragging = false, startX = 0, startScroll = 0;

  scroller.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return; // 터치는 네이티브 스크롤에 맡김
    if (e.target.closest('.combo-block')) return; // 카드 위 시작은 축 잠금 로직에 양보
    dragging = true;
    startX = e.clientX;
    startScroll = scroller.scrollLeft;
    scroller.classList.add('ms-combo-blocks-scroll--dragging');
  });
  scroller.addEventListener('pointermove', e => {
    if (!dragging) return;
    scroller.scrollLeft = startScroll - (e.clientX - startX);
  });
  const endDrag = () => { dragging = false; scroller.classList.remove('ms-combo-blocks-scroll--dragging'); };
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointerleave', endDrag);
}

// ── 드래그(포인터 추적 clone + drop-target 판정 + 슬롯/트레이 교체) — chord-combo.js 원본 로직 그대로 이식 ──
let _msComboDragBlock = null, _msComboDragFrom = null, _msComboDragSourceType = null, _msComboDragClone = null;
let _msComboDragOffX = 0, _msComboDragOffY = 0, _msComboDragStartX = 0, _msComboDragStartY = 0;
let _msComboDragPending = false; // 트레이 카드: 가로(스크롤) vs 세로(꺼내기) 방향 판정 대기 중
const MS_COMBO_TAP_MOVE_THRESHOLD = 8; // px — 이 이하 이동이면 드래그 아닌 짧은 터치
// ── 트레이 카드 위에서 시작한 제스처의 축 잠금 ──
// 트레이는 가로 스크롤과 "카드 꺼내기" 드래그가 같은 영역에서 겹친다. 정답 슬롯이 트레이
// 바로 위에 있으므로 두 동작의 자연스러운 방향이 서로 직교함 → 첫 이동 방향으로 의도를 가른다.
//   가로 우세 = 스크롤(여기서 JS로 직접 scrollLeft 조작 — 네이티브 터치 스크롤에 기대지 않음.
//               브라우저/에뮬레이터마다 touch-action 위임이 일관되지 않아서 손대는 쪽이 더 안정적)
//   세로 우세 = 카드 꺼내기
// iOS 사진 피커·Slack 이모지 트레이가 쓰는 방식. 롱프레스와 달리 대기시간이 없다.
const MS_COMBO_AXIS_LOCK_THRESHOLD = 6; // px — 이만큼 움직여야 방향을 판정
let _msComboScrolling = false;       // 방향 판정 결과 "가로=스크롤"로 확정됐는지
let _msComboScroller = null;         // 스크롤 대상 엘리먼트(#ms-combo-quiz-blocks)
let _msComboScrollStartLeft = 0;
let _msComboScrollLastX = 0, _msComboScrollLastT = 0, _msComboScrollVelocity = 0;
let _msComboScrollMomentumId = null;

function _msComboGetDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const slotDrop = el.closest('.combo-answer-drop');
  // 교체형 잠긴 슬롯에는 드롭 불가 — 원본 진행이 바뀌면 문제가 성립 안 함
  if (slotDrop) return slotDrop.closest('.combo-answer-slot')?.dataset.locked === '1' ? null : slotDrop;
  const tray = el.closest('#ms-combo-quiz-blocks');
  if (tray) return tray;
  return null;
}

// ── 카드블록 클릭 사운드 — chord-combo.js _comboResolveVoicing/comboPlayBlockSound 이식
// 슬래시(전위)·텐션 분기 포함. 사운드와 다이어그램이 같은 보이싱을 쓰도록 여기 한 곳에서만 결정 ──
const _msComboVoicingCache = {};
const _MS_COMBO_OPEN_MIDI  = [64, 59, 55, 50, 45, 40];
function _msComboGetLowestFretVoicing(rootSemitone, quality, keyIdx, bass, tension) {
  if (typeof ProgressionVoicings === 'undefined') return null;
  const cacheKey = `${rootSemitone}_${quality}_${keyIdx}_${bass ?? ''}_${tension ?? ''}`;
  if (cacheKey in _msComboVoicingCache) return _msComboVoicingCache[cacheKey];
  const candidates = ProgressionVoicings.getCandidates(
    rootSemitone, quality, keyIdx, bass ?? undefined, tension ?? undefined);
  let best = null;
  candidates.forEach(v => { if (!best || v.fretNumber < best.fretNumber) best = v; });
  _msComboVoicingCache[cacheKey] = best;
  return best;
}
// chapter를 인자로 받는 이유: 6장은 난이도와 무관하게 항상 7화음이라 코드질 선택이 달라짐
function _msComboResolveVoicing(degree, chordStr, keyIdx, chapter) {
  const ch         = chapter ?? _msComboChapter;
  const useSeventh = ch === '6' ? true : MS_POOL.comboDifficulty === 'high';
  const slash      = (typeof CC_SLASH_INFO !== 'undefined') ? CC_SLASH_INFO[degree] : null;

  let rootSemitone, quality, bass = null;
  if (slash) {
    const info = CC_DEGREE_TRIAD[slash.base];
    if (!info) return null;
    quality      = useSeventh ? info.quality7 : info.quality;
    rootSemitone = (keyIdx + info.offset) % 12;
    bass         = slash.bassOffset;
  } else {
    const info = CC_DEGREE_TRIAD[degree];
    if (!info) return null;
    quality      = useSeventh ? info.quality7 : info.quality;
    rootSemitone = (keyIdx + info.offset) % 12;
  }

  // 6장(텐션코드)이나 quality가 'tension' 버킷이면 코드명 끝의 "(...)"를 명시적으로 넘겨야
  // 정확한 보이싱을 찾음. 'tension' 버킷은 실제 코드질(항상 dominant 7)로 치환해서 조회
  const isTensionBucket = quality === 'tension';
  const tensionMatch    = (ch === '6' || isTensionBucket) ? (chordStr || '').match(/\([^)]*\)$/) : null;
  return _msComboGetLowestFretVoicing(
    rootSemitone, isTensionBucket ? '7' : quality, keyIdx, bass, tensionMatch ? tensionMatch[0] : null);
}
async function _msComboPlayBlockSound(block) {
  if (typeof GuitarAudio === 'undefined') return;

  // 6장: 제출 전엔 트레이·강조슬롯의 "텐션이 붙은" 코드만 무음 — 소리 유무가 정답 힌트가 되는 걸 방지.
  // 잠긴 슬롯(문제 자체)은 항상 재생 가능
  if (_msComboChapter === '6' && !_msComboSubmitted) {
    const parentSlot = block.parentElement?.closest?.('.combo-answer-slot');
    const inTray   = block.parentElement?.id === 'ms-combo-quiz-blocks';
    const inTarget = parentSlot?.classList.contains('combo-answer-slot--target');
    if ((inTray || inTarget) && /\(/.test(block.dataset.chord || '')) return;
  }

  const voicing = _msComboResolveVoicing(
    block.dataset.degree, block.dataset.chord, MS_COMBO_KEY_IDX_MAP[_msComboSessionKey]);
  if (!voicing) return;
  const midis = [];
  for (let s = 5; s >= 0; s--) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(_MS_COMBO_OPEN_MIDI[s] + f);
  }
  if (!midis.length) return;
  if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
  GuitarAudio.strumNotes(midis, GuitarAudio.STRUM_INTERVAL_SAMPLE);
}

function _msComboPopBlock(block) {
  block.classList.remove('combo-block--pop');
  void block.offsetWidth;
  block.classList.add('combo-block--pop');
}

// 실제 드래그 시각효과(고스트 클론) 시작 — 방향 판정이 "세로=꺼내기"로 확정된 뒤에 호출
function _msComboBeginDragVisual() {
  const block = _msComboDragBlock;
  if (!block || _msComboDragClone) return;
  const rect = block.getBoundingClientRect();
  _msComboDragOffX = _msComboDragStartX - rect.left;
  _msComboDragOffY = _msComboDragStartY - rect.top;

  const clone = block.cloneNode(true);
  clone.classList.add('combo-block--dragging-clone');
  clone.style.position = 'fixed';
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = 999;
  document.body.appendChild(clone);
  _msComboDragClone = clone;

  if (_msComboDragSourceType === 'slot') block.classList.add('combo-block--source-hidden');
}

function _msComboScrollStopMomentum() {
  if (_msComboScrollMomentumId) { cancelAnimationFrame(_msComboScrollMomentumId); _msComboScrollMomentumId = null; }
}
function _msComboScrollRunMomentum() {
  const FRICTION = 0.88;
  const step = () => {
    _msComboScrollVelocity *= FRICTION;
    if (Math.abs(_msComboScrollVelocity) < 0.01 || !_msComboScroller) { _msComboScrollMomentumId = null; return; }
    _msComboScroller.scrollLeft -= _msComboScrollVelocity * 16;
    _msComboScrollMomentumId = requestAnimationFrame(step);
  };
  _msComboScrollMomentumId = requestAnimationFrame(step);
}

function _msComboBlockPointerMove(e) {
  // 방향 판정 대기 중(트레이 카드) — 가로 우세면 스크롤 시작, 세로 우세면 카드 꺼내기 시작
  if (_msComboDragPending) {
    const dx = e.clientX - _msComboDragStartX;
    const dy = e.clientY - _msComboDragStartY;
    if (Math.hypot(dx, dy) < MS_COMBO_AXIS_LOCK_THRESHOLD) return;
    _msComboDragPending = false;
    // 드래그(문제 배치)가 주 동작이라 애매한 대각선은 드래그로 우선 판정 — 스크롤은
    // 가로가 세로보다 뚜렷하게(1.4배 이상) 우세할 때만. 빨리 풀 때 살짝 비스듬한
    // "위로 홱 당기기"가 스크롤로 오인돼 드래그가 안 먹히는 문제 방지
    if (Math.abs(dx) > Math.abs(dy) * 1.4) {
      _msComboScrolling = true;
      _msComboScroller = document.getElementById('ms-combo-quiz-blocks');
      _msComboScrollStopMomentum();
      _msComboScrollStartLeft = _msComboScroller ? _msComboScroller.scrollLeft : 0;
      _msComboScrollLastX = e.clientX;
      _msComboScrollLastT = performance.now();
      _msComboScrollVelocity = 0;
      _msComboScroller?.classList.add('ms-combo-blocks-scroll--dragging');
    } else {
      _msComboBeginDragVisual();
    }
  }

  if (_msComboScrolling) {
    if (_msComboScroller) _msComboScroller.scrollLeft = _msComboScrollStartLeft - (e.clientX - _msComboDragStartX);
    const now = performance.now();
    const dt = now - _msComboScrollLastT;
    if (dt > 0) _msComboScrollVelocity = (e.clientX - _msComboScrollLastX) / dt;
    _msComboScrollLastX = e.clientX;
    _msComboScrollLastT = now;
    return;
  }

  if (!_msComboDragClone) return;
  _msComboDragClone.style.left = (e.clientX - _msComboDragOffX) + 'px';
  _msComboDragClone.style.top  = (e.clientY - _msComboDragOffY) + 'px';
}

// 드래그 추적 종료 + 상태 초기화. 브라우저가 제스처를 가로채 pointercancel이 올 때도 여기로 온다
function _msComboEndDragTracking() {
  document.removeEventListener('pointermove', _msComboBlockPointerMove);
  document.removeEventListener('pointerup', _msComboBlockPointerUp);
  document.removeEventListener('pointercancel', _msComboEndDragTracking);
  if (_msComboDragClone) { _msComboDragClone.remove(); _msComboDragClone = null; }
  _msComboScroller?.classList.remove('ms-combo-blocks-scroll--dragging');
  _msComboDragBlock?.classList.remove('combo-block--source-hidden');
  _msComboDragBlock = null;
  _msComboDragFrom = null;
  _msComboDragSourceType = null;
  _msComboDragPending = false;
  _msComboScrolling = false;
  _msComboScroller = null;
}

function _msComboBlockPointerUp(e) {
  document.removeEventListener('pointermove', _msComboBlockPointerMove);
  document.removeEventListener('pointercancel', _msComboEndDragTracking);
  if (_msComboDragClone) { _msComboDragClone.remove(); _msComboDragClone = null; }

  const block = _msComboDragBlock, from = _msComboDragFrom, sourceType = _msComboDragSourceType;
  const wasPending = _msComboDragPending, wasScrolling = _msComboScrolling;
  _msComboDragBlock = null; _msComboDragFrom = null; _msComboDragSourceType = null;
  _msComboDragPending = false;
  if (wasScrolling) {
    _msComboScroller?.classList.remove('ms-combo-blocks-scroll--dragging');
    const MAX_VELOCITY = 1.5;
    _msComboScrollVelocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, _msComboScrollVelocity));
    if (Math.abs(_msComboScrollVelocity) > 0.05) _msComboScrollRunMomentum();
    _msComboScrolling = false;
    _msComboScroller = null;
  }
  if (!block) return;
  block.classList.remove('combo-block--source-hidden');

  // 방향 판정 전에 손을 뗐다(탭) 또는 스크롤로 끝났다 — 카드 이동/드롭 판정은 안 함
  if (wasPending || wasScrolling) {
    if (wasPending) {
      const movedPending = Math.hypot(e.clientX - _msComboDragStartX, e.clientY - _msComboDragStartY);
      if (movedPending < MS_COMBO_TAP_MOVE_THRESHOLD) _msComboPlayBlockSound(block);
    }
    return;
  }

  const moved = Math.hypot(e.clientX - _msComboDragStartX, e.clientY - _msComboDragStartY);
  if (moved < MS_COMBO_TAP_MOVE_THRESHOLD) { _msComboPlayBlockSound(block); return; } // 드래그 아닌 짧은 터치 = 사운드만

  const target = _msComboGetDropTarget(e.clientX, e.clientY);
  if (!target || target === from) return;

  if (sourceType === 'tray') {
    if (!target.classList.contains('combo-answer-drop')) return;
    const occupant = target.querySelector('.combo-block');
    if (occupant) occupant.remove();
    const placed = block.cloneNode(true);
    target.appendChild(placed);
    _msComboPopBlock(placed);
  } else {
    if (target.classList.contains('combo-answer-drop')) {
      const occupant = target.querySelector('.combo-block');
      target.appendChild(block);
      _msComboPopBlock(block);
      if (occupant && occupant !== block) {
        from.appendChild(occupant);
        _msComboPopBlock(occupant);
      }
    } else {
      block.remove();
    }
  }
}

function _msComboBlockPointerDown(e) {
  const block = e.target.closest('.combo-block');
  if (!block) return;

  // 교체형 잠긴 슬롯의 고정 코드는 드래그 금지 — 사운드만 재생
  const parentSlot = block.parentElement?.closest?.('.combo-answer-slot');
  if (parentSlot && parentSlot.dataset.locked === '1') {
    e.preventDefault();
    _msComboPlayBlockSound(block);
    return;
  }

  // 항상 preventDefault — 안 부르면 마우스는 텍스트 드래그선택이, 터치는 브라우저 네이티브
  // 스크롤/줌 제스처가 가로채서 (가로든 세로든) 아무 반응이 없는 것처럼 보임. 가로 스크롤은
  // 여기서 네이티브에 기대지 않고 JS로 직접 처리하므로(_msComboBlockPointerMove) 막아도 무방.
  e.preventDefault();

  _msComboDragStartX = e.clientX;
  _msComboDragStartY = e.clientY;
  _msComboDragBlock = block;
  _msComboDragFrom  = block.parentElement;
  _msComboDragSourceType = (_msComboDragFrom.id === 'ms-combo-quiz-blocks') ? 'tray' : 'slot';

  // 트레이 카드는 가로 스크롤과 제스처가 겹치므로 방향이 확정될 때까지 드래그를 미룬다.
  // (슬롯 안 카드는 스크롤 영역이 아니라서 예전처럼 즉시 드래그)
  _msComboDragPending = _msComboDragSourceType === 'tray';
  if (!_msComboDragPending) _msComboBeginDragVisual();

  document.addEventListener('pointermove', _msComboBlockPointerMove);
  document.addEventListener('pointerup', _msComboBlockPointerUp, { once: true });
  document.addEventListener('pointercancel', _msComboEndDragTracking, { once: true });
}

function _msComboInitDragDrop() {
  const wrap = document.getElementById('ms-combo-quiz-wrap');
  if (!wrap || wrap._dragInit) return;
  wrap._dragInit = true;
  wrap.addEventListener('pointerdown', _msComboBlockPointerDown);
}

// ── 슬롯에 정답 코드 운지 다이어그램 표시 — chord-combo.js _comboDrawSlotDiagram 이식 ──
const MS_COMBO_DIAGRAM_W = 64; // CSS px, 비율은 VoicingCanvas BASE_W:BASE_H 고정
function _msComboDrawSlotDiagram(slot, degree, chordStr) {
  if (typeof VoicingCanvas === 'undefined') return null;
  const dpr = window.devicePixelRatio || 1;
  slot.querySelector('.combo-answer-diagram')?.remove();
  const voicing = _msComboResolveVoicing(degree, chordStr, MS_COMBO_KEY_IDX_MAP[_msComboSessionKey]);
  if (!voicing) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'combo-answer-diagram';
  slot.insertBefore(canvas, slot.firstChild);
  VoicingCanvas.draw(canvas, voicing, { ratio: (MS_COMBO_DIAGRAM_W * dpr) / VoicingCanvas.BASE_W, transparent: true });
  canvas.style.width  = MS_COMBO_DIAGRAM_W + 'px';
  canvas.style.height = Math.round(MS_COMBO_DIAGRAM_W * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W) + 'px';
  return canvas;
}

function _msComboAdvance() {
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _msComboSubmitted = false;
  _msTransitionQuestion('.combo-quiz-wrap', () => {
    document.getElementById('ms-combo-submit-btn').textContent = '제출하기';
    _msComboRenderQuestion();
  });
}

// ── 제출하기 — chord-combo.js comboSubmitAnswer 로직 그대로 이식 ──
let _msComboSubmitted = false;
function msComboSubmit() {
  if (_msComboSubmitted) {
    _playTap();
    if (_msExamMode) {
      if (_msComboQuestionIndex >= _msExamSectionTotal) { _msPromoComboSectionDone(); return; }
      _msComboAdvance();
      return;
    }
    if (_msReviewMode) {
      if (_msReviewStageRemaining('combo')) _msComboAdvance();
      else _msReviewNextStage();
      return;
    }
    if (_msComboQuestionIndex >= MS_COMBO_TOTAL) { _msTrackDailyMissionCompleted(); _msTransitionView(msShowResultView); return; }
    _msComboAdvance();
    return;
  }

  const slots = document.querySelectorAll('#ms-combo-quiz-answer .combo-answer-slot');
  const drops = Array.from(slots).map(s => s.querySelector('.combo-answer-drop'));

  const emptyDrops = drops.filter(d => !d.querySelector('.combo-block'));
  if (emptyDrops.length) {
    emptyDrops.forEach(d => {
      d.classList.remove('combo-answer-drop--shake');
      void d.offsetWidth;
      d.classList.add('combo-answer-drop--shake');
    });
    return;
  }

  _playTap();
  // 교체형에서 숨겼던 도수라벨(2장)은 제출 후 전부 복원
  const qLabels = _msComboQuestion?.labels;
  if (qLabels) {
    slots.forEach((slot, i) => {
      slot.querySelector('.combo-answer-degree').innerHTML = _msCcFormat(qLabels[i]);
    });
  }

  let allCorrect = true;
  let nCorrectSlots = 0, nGradedSlots = 0;
  const slotResults = [];
  const answerDegrees = Array.from(slots).map((_, i) => _msComboCorrectDegree(_msComboQuestion, i));
  slots.forEach((slot, i) => {
    const drop  = slot.querySelector('.combo-answer-drop');
    const block = drop.querySelector('.combo-block');
    const isCorrect = block.dataset.chord === slot.dataset.answerChord;
    const locked = slot.dataset.locked === '1';
    drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong');
    drop.querySelector('.combo-answer-correct-hint')?.remove();

    // 교체형 잠긴 슬롯은 원본 그대로라 채점 대상이 아님 — 점수/색상 모두 제외
    if (!locked) {
      nGradedSlots++;
      if (isCorrect) nCorrectSlots++; else allCorrect = false;
      drop.classList.add(isCorrect ? 'combo-answer-drop--correct' : 'combo-answer-drop--wrong');
      if (!isCorrect) {
        const hint = document.createElement('span');
        hint.className = 'combo-answer-correct-hint';
        hint.innerHTML = _msCcFormat(slot.dataset.answerChord);
        hint.dataset.degree = answerDegrees[i];
        hint.dataset.chord  = slot.dataset.answerChord;
        hint.addEventListener('pointerup', () => _msComboPlayBlockSound(hint));
        drop.appendChild(hint);
      }
    }
    slotResults.push(locked ? undefined : isCorrect);

    const diagram = _msComboDrawSlotDiagram(slot, answerDegrees[i], slot.dataset.answerChord);
    if (diagram) {
      diagram.style.pointerEvents = 'auto';
      diagram.style.cursor = 'pointer';
      diagram.addEventListener('pointerup', () => _msComboPlayBlockSound({
        dataset: { degree: answerDegrees[i], chord: slot.dataset.answerChord },
      }));
    }
  });
  msPlaySound(allCorrect ? 'correct' : 'wrong');

  if (_msExamMode) {
    // 승급시험: 슬롯 하나라도 틀리면(allCorrect=false) 이 문제는 오답 처리
    _msExamRecords.push({ isCorrect: allCorrect });
    _msComboQuestionIndex++;
  } else if (!_msReviewMode) {
    _msRecords.combo.push({
      key:          _msComboSessionKey,
      chapter:      _msComboChapter, // 결산·오답풀기에서 같은 장 기준으로 보이싱을 다시 뽑기 위해 보관
      labels:       Array.from(slots).map(s2 => s2.dataset.answerChord),
      degrees:      answerDegrees, // 결산 화면에서 다이어그램 다시 그리는 데 필요
      slotResults,  // 슬롯별 정오답(잠긴 슬롯은 undefined) — 결산 화면 테두리 색으로 표시
      correctSlots: nCorrectSlots,
      totalSlots:   nGradedSlots,
      question:     _msComboQuestion, // 오답 풀기에서 같은 진행을 그대로 다시 내기 위해 보관
    });
    _msComboQuestionIndex++;
    msUpdateProgress(MS_QUIZ_TOTAL + MS_SCALE_TOTAL + _msComboQuestionIndex); // 코드맞추기+스케일 + 코드조합(1~MS_COMBO_TOTAL)
  } else {
    _msReviewGrade('combo', _msComboReviewItem, allCorrect);
  }

  _msComboSubmitted = true;
  // 자동전환 없이 유저가 직접 눌러야 다음으로. 마지막 문제면 세션 종료 버튼으로
  document.getElementById('ms-combo-submit-btn').textContent = _msExamMode
    ? (_msComboQuestionIndex >= _msExamSectionTotal ? '완료' : '다음')
    : _msReviewMode
      ? (_msReviewHasMore() ? '다음' : '완료')
      : (_msComboQuestionIndex >= MS_COMBO_TOTAL ? '완료' : '다음');
}

// ── 상단 프로그레스 바 ───────────────────────────────────────
// 튜토리얼은 진행값에 포함 안 함(튜토리얼 화면을 넘겨도 게이지가 안 움직임) — 페르소나별
// 총 문항수(MS_DAILY_TOTALS) 기준으로만 채움. 균등분배가 아니라 초반에 확확 채워지고 뒤로
// 갈수록 증가폭이 줄어드는 곡선(sqrt) — 초반 집중력을 끌어올리려는 의도. step=0이면 완전히
// 빈 상태(문제풀이 시작 직후)
const MS_TOTAL_STEPS = MS_QUIZ_TOTAL + MS_SCALE_TOTAL + MS_COMBO_TOTAL;
let _msCurrentStep = 0; // 0-indexed(완료한 문제 수), 현재까지 푼 문제 개수
// 게이지 분모 — 본세션은 15 고정, 오답 풀기는 틀린 문제 수만큼으로 갈아끼운다
let _msTotalSteps  = MS_TOTAL_STEPS;

// 마감 임박 경고 구간(%) — 값 보간이 아니라 구간별로 색을 딱 바꾸고, 전환 자체는
// CSS transition(background-color)이 부드럽게 처리하게 함
const MS_PROGRESS_WARN_YELLOW = 75; // 75%부터 노랑
const MS_PROGRESS_WARN_RED    = 90; // 90%부터 빨강
function msUpdateProgress(step) {
  const total = Math.max(1, _msTotalSteps);
  _msCurrentStep = Math.max(0, Math.min(total, step));
  const fill = document.getElementById('ms-progress-fill');
  if (!fill) return;
  const t = _msCurrentStep / total;
  const pct = Math.sqrt(t) * 100; // 초반 급상승, 후반 완만
  fill.style.width = pct + '%';

  fill.style.background = pct >= MS_PROGRESS_WARN_RED    ? '#D9534F' // 빨강
    :                     pct >= MS_PROGRESS_WARN_YELLOW ? '#FFD60A' // 밝은 노랑
    :                     ''; // 기본 --blue로 복귀
}

function closeMissionSession() {
  _playTap();
  if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;

  // 데일리미션 완주 전 이탈이면 한 번 확인(기존 leave-practice 모달 재사용, shared.js).
  // 승급시험 중(_msPromoActive)은 이번 요청 범위 밖이라 기존 동작 그대로 둠.
  if (!_msResultReached && !_msPromoActive && typeof showLeavePracticeModal === 'function') {
    showLeavePracticeModal(_msDoCloseMissionSession, {
      title: '풀이를 그만두시겠어요?',
      desc: '지금 나가면 오늘 진행 상황이<br>저장되지 않아요.',
      stopText: '그만할래요',
      continueText: '계속할래요',
    });
    return;
  }
  _playConfirmSfx();
  _msDoCloseMissionSession();
}

function _msDoCloseMissionSession() {
  clearInterval(_msBufferStatusTimer);
  clearTimeout(_msBufferDoneTimer);

  // 도장은 이제 결산화면 진입 시점(msShowResultView)에 바로 찍힌다 — 여기는 그게 무슨
  // 이유로든(네트워크 실패 등) 못 찍혔을 때를 위한 안전망일 뿐.
  if (_msResultReached && !_msStampShown) {
    _msRunStampFlow(_msExitToHome);
    return;
  }
  _msExitToHome();
}

function _msExitToHome() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

// ═══════════════════════════════════════════════════════════════
// 미션 완료 → 출석 도장 연출
//   화면을 어둡게 덮고, 가운데 25일 출석보드를 1일차에서 오늘 칸까지 가로로 굴린 뒤
//   도장을 내려찍는다. 보드 마크업/CSS는 attendance.html(.attend-cal-grid/.acc-cell) 재사용.
//   진행값은 shared.js advanceAttendance() — RPC 우선, dev/비로그인은 localStorage 폴백.
// ═══════════════════════════════════════════════════════════════
const MS_STAMP_START_DELAY = 450;  // 모달 등장 → 스크롤 시작
const MS_STAMP_SCROLL_MS   = 1400; // 1일차 → 오늘 칸 이동 시간
const MS_STAMP_PRESS_DELAY = 250;  // 스크롤 정지 → 도장 찍기까지의 숨
let _msResultReached = false; // 결산 화면까지 도달했는가
let _msStampShown    = false; // 이번 세션에서 도장 연출을 이미 돌렸는가
let _msMockMode      = false; // ?mock=result 디자인 검수 진입 — 실제 출석 진행을 건드리면 안 됨

function _msStampRenderGrid(grid, stamped, todayDay) {
  const boxImg = '<img src="image/gift.png" class="acc-box-icon" alt="">';
  let html = '';
  for (let d = 1; d <= ATTENDANCE_TOTAL_DAYS; d++) {
    const done      = d <= stamped;
    const milestone = ATTENDANCE_MILESTONES[d];
    const cls = ['acc-cell'];
    if (done) cls.push('acc-cell--done');
    if (milestone) cls.push('acc-cell--milestone');
    if (d === todayDay) cls.push('acc-cell--today');
    const base = milestone
      ? boxImg + '<span class="acc-box-count">' + milestone + '</span>'
      : '<span class="acc-day-num">' + d + '</span>';
    const inner = base + (done ? '<span class="acc-stamp"><i data-lucide="guitar"></i></span>' : '');
    html += '<div class="' + cls.join(' ') + '" data-day="' + d + '">' + inner + '</div>';
  }
  grid.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 1일차(스크롤 0) → 대상 칸 중앙까지 직접 스크롤 애니메이션.
// scrollTo({behavior:'smooth'})는 브라우저마다 속도가 제각각이라 연출 타이밍을 못 맞춘다.
function _msStampScrollToCell(grid, cell, durMs) {
  return new Promise(resolve => {
    const max  = Math.max(0, grid.scrollWidth - grid.clientWidth);
    const to   = Math.max(0, Math.min(max, cell.offsetLeft - (grid.clientWidth - cell.offsetWidth) / 2));
    const from = 0;
    grid.scrollLeft = from;
    if (to <= 0) { resolve(); return; }
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / durMs);
      grid.scrollLeft = from + (to - from) * ease(p);
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// 피크상자 획득 연출(showPeakReveal)과 같은 톤 — 흰 카드 없이 어두운 배경 위에
// 보드만 둥실 띄운다. 확인 버튼은 보드 흐름 밖(position:absolute)에 둬서, 버튼이
// 나타나도 보드·도장 위치가 절대 밀리지 않게 한다.
function _msStampBuildOverlay() {
  let ov = document.getElementById('ms-stamp-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'ms-stamp-overlay';
  ov.className = 'ms-stamp-overlay';
  ov.innerHTML =
    '<div class="ms-stamp-stage">' +
      '<div class="ms-stamp-board ms-stamp-board--locked" id="ms-stamp-board">' +
        '<div class="attend-cal-grid" id="ms-stamp-grid"></div>' +
      '</div>' +
      '<button type="button" class="ms-stamp-confirm" id="ms-stamp-close-btn">확인</button>' +
    '</div>';
  document.body.appendChild(ov);
  return ov;
}

async function _msRunStampFlow(onDone) {
  if (_msStampShown) { if (typeof onDone === 'function') onDone(); return; }
  _msStampShown = true;
  _msSaveTodayResult(); // 오늘 도장은 끝 — 재진입해도 다시 찍지 않는다

  let res;
  try { res = await advanceAttendance(); }
  catch (_) { res = null; }
  if (!res) { if (typeof onDone === 'function') onDone(); return; } // 도장 실패로 종료를 막지는 않는다

  const advanced      = !!res.advanced;
  const stampedBefore = advanced ? res.day - 1 : res.day; // 오늘 찍기 직전까지의 도장 수
  const targetDay     = res.day;

  const ov       = _msStampBuildOverlay();
  const grid     = document.getElementById('ms-stamp-grid');
  const board    = document.getElementById('ms-stamp-board');
  const closeBtn = document.getElementById('ms-stamp-close-btn');

  _msStampRenderGrid(grid, stampedBefore, targetDay);
  closeBtn.classList.remove('ms-stamp-confirm--show');
  board.classList.add('ms-stamp-board--locked');

  ov.classList.add('ms-stamp-overlay--show');
  if (typeof analytics !== 'undefined') {
    analytics.track('mission_attendance_stamped', { day: res.day, advanced, reward: res.reward || 0 });
  }

  // 마일스톤(보상)날이면 도장 모달엔 확인 버튼을 아예 띄우지 않는다 — 그대로 넘어가서
  // 피크상자 획득 팝업(자체 확인 버튼 있음)이 확인을 받는 역할을 이어받는다.
  // 마일스톤 도달분(피크상자)은 advanceAttendance가 이미 지급 — 여기선 획득 연출만.
  const isRewardDay = advanced && res.reward > 0;
  const finish = () => {
    board.classList.remove('ms-stamp-board--locked');
    if (isRewardDay) {
      setTimeout(() => {
        ov.classList.remove('ms-stamp-overlay--show');
        setTimeout(() => showPeakboxRewardModal(res.reward, onDone), 240);
      }, 500); // 도장이 찍힌 걸 눈에 담을 짧은 여유 — 곧바로 다음 팝업으로 넘어가면 너무 급하다
      return;
    }
    closeBtn.classList.add('ms-stamp-confirm--show'); // absolute 배치라 등장해도 보드는 안 밀림
    closeBtn.onclick = () => {
      _playTap();
      ov.classList.remove('ms-stamp-overlay--show');
      setTimeout(() => { if (typeof onDone === 'function') onDone(); }, 240);
    };
  };

  const cell = grid.querySelector(`.acc-cell[data-day="${targetDay}"]`);
  setTimeout(async () => {
    if (cell) await _msStampScrollToCell(grid, cell, MS_STAMP_SCROLL_MS);
    if (!advanced || !cell) { finish(); return; }
    setTimeout(() => {
      // 도장 DOM을 이 시점에 꽂아야 stamp-press 애니메이션이 정확히 지금 시작한다
      cell.classList.add('acc-cell--done');
      const stamp = document.createElement('span');
      stamp.className = 'acc-stamp';
      stamp.innerHTML = '<i data-lucide="guitar"></i>';
      cell.appendChild(stamp);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      cell.classList.add('acc-cell--animate');
      if (typeof _playSfx === 'function') setTimeout(() => _playSfx('stamp.mp3'), STAMP_IMPACT_OFFSET_MS);
      setTimeout(finish, STAMP_ANIM_MS);
    }, MS_STAMP_PRESS_DELAY);
  }, MS_STAMP_START_DELAY);
}

// ── 코드맞추기 튜토리얼: 8개 후보 코드 다이어그램 ──────────────
// chordsLibrary/voicing-canvas.js 모듈 재사용 (chord-name-quiz.js drawLibEntryWithName과 동일 규칙)
const MS_TUTORIAL_CHORDS = MS_POOL.chords;

// 코드명 → 라이브러리 보이싱 1개.
// 라이브러리는 근음을 샵 표기로만 분류하므로 플랫 근음은 샵으로 정규화해서 찾고,
// 코드명 자체는 샵/플랫 양쪽 표기(name/flatName) 모두와 대조한다.
// openOnly 페르소나(언박싱 1일차)는 개방코드(4프렛 이내)만, 그 외는 가장 낮은 프렛 보이싱을 쓴다.
const _MS_FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

function _msGetEntry(name) {
  const root = name.match(/^([A-G][#b]?)/)?.[1];
  if (!root) return undefined;
  const entries = (window.chordsLibrary || {})[_MS_FLAT_TO_SHARP[root] || root] || [];
  const matches = entries.filter(e => e.name === name || e.flatName === name);
  if (!matches.length) return undefined;

  // 페르소나가 정확한 보이싱(frets)을 지정해뒀으면 그 보이싱만 채택 —
  // 라이브러리에 이름 일치하는 게 여러 개 있어도 임의로 다른 게 뽑히지 않게 함.
  // MS_POOL.voicings는 사람이 읽기 쉬운 6번줄→1번줄 순으로 적어두지만
  // window.chordsLibrary의 entry.frets는 1번줄→6번줄 순으로 저장돼 있어 뒤집어서 비교한다.
  const wantedRaw = MS_POOL.voicings?.[name];
  if (wantedRaw) {
    const wanted = [...wantedRaw].reverse();
    const exact = matches.find(e => e.frets.length === wanted.length &&
      e.frets.every((f, i) => f === wanted[i]));
    if (exact) return exact;
    console.warn(`[MissionSession] "${name}" 지정 보이싱과 일치하는 라이브러리 항목 없음 — 기존 로직으로 폴백`, wanted);
  }

  if (MS_POOL.openOnly) {
    return matches.find(e => e.frets.every(f => f === null || f <= 4));
  }
  return matches.reduce((a, b) => ((b.fretNumber ?? 0) < (a.fretNumber ?? 0) ? b : a));
}

// 카드 탭 시 정답 보이싱 사운드 재생 (chord-name-quiz.js _playQuizEntrySound와 동일 규칙)
const _MS_OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // 1번줄→6번줄 개방현 MIDI
async function _msPlayEntrySound(entry) {
  if (typeof GuitarAudio === 'undefined' || !entry) return;
  const midis = [];
  for (let s = 5; s >= 0; s--) {
    const f = entry.frets[s];
    if (f === null) continue;
    midis.push(_MS_OPEN_MIDI[s] + f);
  }
  if (!midis.length) return;
  if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
  GuitarAudio.strumNotes(midis, GuitarAudio.STRUM_INTERVAL_SAMPLE);
}

// 카드 탭(드래그 아님) 판정 — pointerdown~pointerup 이동거리/시간으로 구분
const _MS_TAP_MOVE_THRESHOLD = 10; // px
const _MS_TAP_TIME_THRESHOLD = 600; // ms
// 범용 탭 vs 드래그 판정 — pointerdown~pointerup 이동거리/시간으로 구분, 탭일 때만 onTap 호출
function _msInitTapVsDrag(el, onTap) {
  let downX = 0, downY = 0, downT = 0;
  el.addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  });
  el.addEventListener('pointerup', e => {
    const dx = e.clientX - downX, dy = e.clientY - downY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = performance.now() - downT;
    if (dist < _MS_TAP_MOVE_THRESHOLD && dt < _MS_TAP_TIME_THRESHOLD) {
      onTap(e);
    }
  });
}
function _msInitCardTap(wrap, entry) {
  _msInitTapVsDrag(wrap, () => _msPlayEntrySound(entry));
}

function _msDrawEntry(canvas, entry, name) {
  VoicingCanvas.draw(canvas, {
    frets:      entry.frets,
    openMute:   entry.openMute,
    barre:      entry.barres?.[0]      ?? {},
    barreRange: entry.barreRanges?.[0] ?? null,
    fretNumber: entry.fretNumber,
    patternR:   entry.patternR,
    source:     entry.source,
  }, {
    chordName: name,
    ratio:     canvas.width / VoicingCanvas.BASE_W,
    transparent: true,
  });
}

function renderTutorialChords() {
  const row = document.getElementById('ms-chord-row');
  if (!row) return;
  row.innerHTML = '';

  const items = MS_TUTORIAL_CHORDS.map(name => {
    const entry = _msGetEntry(name);
    if (!entry) { console.warn(`[MissionSession] "${name}" 항목을 찾지 못했습니다.`); return null; }
    return { name, entry };
  }).filter(Boolean);

  const canvasItems = items.map(({ name, entry }) => {
    const wrap = document.createElement('div');
    wrap.className = 'ms-chord-item';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    row.appendChild(wrap);
    _msInitCardTap(wrap, entry);
    return { canvas, entry, name };
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    canvasItems.forEach(({ canvas, entry, name }) => {
      const w = canvas.offsetWidth;
      const h = Math.round(w * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      _msDrawEntry(canvas, entry, name);
    });
  }));

  _msInitRowMouseDrag(row);
}

// 데스크탑 마우스 드래그로도 가로스크롤 가능하게 (터치는 overflow-x:auto가 기본 처리)
// 놓는 순간의 속도를 추적해 관성 스크롤(감속 애니메이션)로 이어짐. 스냅 없음
function _msInitRowMouseDrag(row, draggingClass = 'ms-chord-row--dragging') {
  if (row._dragInit) return;
  row._dragInit = true;
  let dragging = false, startX = 0, startScroll = 0;
  let lastX = 0, lastT = 0, velocity = 0; // px/ms
  let momentumId = null;

  function stopMomentum() {
    if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
  }

  function runMomentum() {
    const FRICTION = 0.88; // 작을수록 더 빨리 멈춤
    const step = () => {
      velocity *= FRICTION;
      if (Math.abs(velocity) < 0.01) { momentumId = null; return; }
      row.scrollLeft -= velocity * 16; // 프레임당(≈16ms) 이동량
      momentumId = requestAnimationFrame(step);
    };
    momentumId = requestAnimationFrame(step);
  }

  row.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    stopMomentum();
    dragging = true;
    startX = lastX = e.clientX;
    startScroll = row.scrollLeft;
    lastT = performance.now();
    velocity = 0;
    row.classList.add(draggingClass);
  });
  row.addEventListener('pointermove', e => {
    if (!dragging) return;
    row.scrollLeft = startScroll - (e.clientX - startX);
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (e.clientX - lastX) / dt; // px/ms, 이동방향
    lastX = e.clientX;
    lastT = now;
  });
  const MAX_VELOCITY = 1.5; // px/ms 상한 — 너무 빠른 플릭도 최대 속도로 제한
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    row.classList.remove(draggingClass);
    velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
    if (Math.abs(velocity) > 0.05) runMomentum();
  };
  row.addEventListener('pointerup', endDrag);
  row.addEventListener('pointerleave', endDrag);
}

// 상단 그라데이션이 .ms-main 시작점에서 정확히 끝나도록 실측
function positionMsGradient() {
  const scroll = document.querySelector('.ms-scroll');
  const main = document.getElementById('ms-main');
  if (!scroll || !main) return;
  scroll.style.setProperty('--ms-gradient-end', main.offsetTop + 'px');
}

// ═══════════════════════════════════════════════════════════════
// 페르소나 승급 시스템 — 안내 화면(진입+섹션 3종)만 우선 구현, 디자인 검수용.
// 문제풀이(코드10·스케일5·조합5 + 섹션별 제한시간 + 채점)는 다음 단계에서 붙인다.
// 레이아웃은 데일리미션 튜토리얼(.ms-chord-tutorial)과 동일 — 스태거 등장도 그대로 재사용.
// ═══════════════════════════════════════════════════════════════
// 섹션별 고정 메타(제목/아이콘/설명) — 문항수·커트라인은 승급 단계마다 달라서 별도(MS_PROMO_TIER_TARGETS)
const MS_PROMO_SECTION_META = [
  {
    key: 'quiz', title: '코드맞추기', icon: 'ph-fill ph-grid-nine', color: '#4B7BD6',
    ability: '코드 이름과 운지를 보자마자 떠올리는 순발력을 기릅니다',
  },
  {
    key: 'scale', title: '스케일 훈련', icon: 'ph-fill ph-music-notes', color: '#D06A94',
    ability: '지판 위 스케일 블럭을 손이 기억하게 만드는 훈련입니다',
  },
  {
    key: 'combo', title: '코드 조합', icon: 'ph-fill ph-pencil', color: '#7B52CC',
    ability: '코드끼리 자연스럽게 이어붙이는 화성 감각을 기릅니다',
  },
];
// 단계(=응시 대상 페르소나 id, 즉 지금 있는 자리)별 문항수/커트라인/제한시간(초). guitar_master는
// 승급 끝(다음 단계 없음)이라 항목 없음. quiz(코드맞추기)의 time은 실측 반응시간(레벨1~c2 avg/top30%/
// top10% 통계) 기반으로 확정(2026-08-27) — top30% 페이스 × 문항수 × 1.15버퍼를 5초 단위로 반올림.
// scale/combo의 time은 아직 미확정이라 null(안내페이지엔 "추후 안내"로 표시됨)
const MS_PROMO_TIER_TARGETS = {
  unboxing:     { quiz: { total: 10, cutoff: 8,  time: 30 }, scale: { total: 5, cutoff: 3, time: 100 }, combo: { total: 5,  cutoff: 3, time: 100 } },
  beginner:     { quiz: { total: 12, cutoff: 9,  time: 45 }, scale: { total: 5, cutoff: 3, time: 120 }, combo: { total: 7,  cutoff: 5, time: 200 } },
  sheet_reader: { quiz: { total: 15, cutoff: 12, time: 60 }, scale: { total: 5, cutoff: 3, time: 150 }, combo: { total: 10, cutoff: 8, time: 300 } },
  home_master:  { quiz: { total: 15, cutoff: 14, time: 60 }, scale: { total: 5, cutoff: 4, time: 150 }, combo: { total: 10, cutoff: 8, time: 300 } },
};
// 승급 성공 시 지급 XP — 승급 "이후" 단계(=to_persona) 기준(2026-08-30 사용자 확정값).
const MS_PROMO_XP_BY_TARGET = {
  beginner: 500, sheet_reader: 1000, home_master: 2000, guitar_master: 5000,
};
function _msPromoXpAwarded(toPersonaId) {
  return MS_PROMO_XP_BY_TARGET[toPersonaId] || 0;
}
// 지금 응시 중인 페르소나(MS_PERSONA.id) 기준 섹션 3개(메타+문항수/커트라인 합친 것)를 매번 새로 계산
function _msPromoSections() {
  const targets = MS_PROMO_TIER_TARGETS[MS_PERSONA.id] || MS_PROMO_TIER_TARGETS.unboxing;
  return MS_PROMO_SECTION_META.map(m => ({ ...m, ...targets[m.key] }));
}

// 현재(=시험 대상) 페르소나의 다음 단계 id. shared.js의 PERSONA_STAGES/PERSONA_NAMES를 그대로 씀
function _msPromoNextPersona() {
  const curIdx = PERSONA_STAGES.indexOf(MS_PERSONA.id);
  const nextId = PERSONA_STAGES[curIdx + 1] || null;
  return { id: nextId, name: nextId ? PERSONA_NAMES[nextId] : null };
}

// 하루 도전 횟수 — 무료 1회 + 광고시청 1회 = 총 2회. 소진(0)이면 버튼에 광고아이콘 노출.
// 실제 값은 shared.js의 getPromoAttemptsLeft()/consumePromoAttempt()가 user_persona_profile
// (비로그인/dev는 training_stats 로컬)에서 관리 — 여기 캐시(_msPromoAttemptsCache)는 렌더용 동기값.
const MS_PROMO_DAILY_ATTEMPTS = (typeof PROMO_DAILY_ATTEMPTS !== 'undefined') ? PROMO_DAILY_ATTEMPTS : 2;
let _msPromoAttemptsCache = MS_PROMO_DAILY_ATTEMPTS; // intro 진입 시 갱신되기 전까지의 기본값
function _msPromoAttemptsLeft() {
  // Pro는 캐시 갱신(비동기 DB조회)을 기다릴 것도 없이 항상 무제한 — 갱신 전 기본값(2)이
  // 잠깐 쓰여서 소진판정이 엇갈리는 일이 없도록 여기서 바로 끊는다.
  if (isPromoAttemptsUnlimited()) return Infinity;
  return _msPromoAttemptsCache;
}
async function _msRefreshPromoAttemptsCache() {
  try {
    _msPromoAttemptsCache = await getPromoAttemptsLeft();
  } catch (_) { /* 실패 시 캐시 유지, 흐름 안 막음 */ }
}
function _msPromoAttemptsBadgeHTML() {
  // Pro는 무제한 — 남은횟수가 Infinity라 "Infinity/2"가 찍히지 않도록 먼저 분기.
  // 표기는 피크 배지(renderPeakBadge)와 동일하게 '∞'로 통일.
  if (isPromoAttemptsUnlimited()) return `<span class="ms-promo-attempts">∞</span>`;
  const left = _msPromoAttemptsLeft();
  if (left <= 0) return `<span class="ms-promo-attempts ms-promo-attempts--depleted"><i class="ph-fill ph-play-circle"></i></span>`;
  return `<span class="ms-promo-attempts">${left}/${MS_PROMO_DAILY_ATTEMPTS}</span>`;
}

// ── 진입화면: 정보 + 시작버튼 ──
function msShowPersonaPromoIntro() {
  _msPromoFromPersona = MS_PERSONA.id;
  _msTrackPromoStage('intro');
  msPersonaPromoTimerReset(); // 안내화면은 시험 중이 아니므로 게이지 꺼둠
  // 예전엔 여기서 DB 조회(_msRefreshPromoAttemptsCache)를 기다린 뒤에야 화면을 그려서,
  // 네트워크가 느리면 전환이 몇 초씩 멈춘 것처럼 보였음(2026-09 발견). 지금은 캐시값으로
  // 즉시 그리고, 최신값은 아래 _msPromoRefreshAttemptsBadge()가 백그라운드로 받아와 배지만 갱신.
  const next = _msPromoNextPersona();
  const nextName = next.name || '다음 단계';
  document.getElementById('ms-title-text').textContent = `${nextName} 승급 시험`;
  _msSetTitleIcon('ph-fill ph-trophy', '#E0A526');
  const promoIntroDesc = document.getElementById('ms-title-desc');
  promoIntroDesc.style.display = ''; // 문제풀이 화면(display:none)을 거쳐 돌아온 경우 대비
  promoIntroDesc.innerHTML =
    '<span class="ms-desc-line ms-stagger-pending">그동안 쌓은 실력을 확인할 시간이에요</span>' +
    '<span class="ms-desc-line ms-stagger-pending">3영역을 모두 통과하면 승급합니다</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-chord-lead ms-stagger-pending">${nextName}(으)로 승급하려면</p>
      <div class="ms-promo-info-card ms-stagger-pending" id="ms-promo-info-card">
        ${_msPromoSections().map(s => `
          <div class="ms-promo-info-row">
            <i class="${s.icon}" style="color:${s.color}"></i>
            <span class="ms-promo-info-label">${s.title}</span>
            <span class="ms-promo-info-value">${s.total}문제 중 ${s.cutoff}개 이상</span>
          </div>
        `).join('')}
      </div>
      <p class="ms-chord-hint ms-stagger-pending">영역마다 제한시간이 있어요</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-promo-start-btn" onpointerup="msPersonaPromoStart()">시험 도전! <span id="ms-promo-attempts-badge">${_msPromoAttemptsBadgeHTML()}</span></button>
    </div>
  `;
  _msRunStaggerAndBindStartBtn('ms-promo-info-card', 'ms-promo-start-btn');
  _msPromoRefreshAttemptsBadge(); // 최신 횟수 백그라운드 조회 — 화면은 이미 그려진 뒤라 안 막힘
}
// 배지를 스피너로 바꿔두고 DB에서 최신 남은 횟수를 받아오면 다시 채운다. await 없이
// fire-and-forget으로 호출되므로, 응답 도착 시점엔 이미 다른 화면으로 넘어가 있을 수 있어
// 그때마다 엘리먼트를 다시 찾아 존재 여부를 확인한다.
async function _msPromoRefreshAttemptsBadge() {
  const badge = document.getElementById('ms-promo-attempts-badge');
  if (badge) badge.innerHTML = '<span class="ms-promo-attempts-spin"></span>';
  await _msRefreshPromoAttemptsCache();
  const el = document.getElementById('ms-promo-attempts-badge');
  if (el) el.innerHTML = _msPromoAttemptsBadgeHTML();
}
// 광고 시청으로 얻은 "보너스 1회" — 하루 카운트(_msPromoAttemptsCache)와 별개로 딱 1회만 통과시킴.
// msPersonaPromoFailRetry()에서 소진 후 광고 다 보면 true로 세팅, msPersonaPromoStart()에서 소비.
let _msPromoAdBonusGranted = false;

async function msPersonaPromoStart() {
  _playTap();
  if (_msPromoAttemptsLeft() <= 0 && !_msPromoAdBonusGranted) {
    if (!MissionAdProvider.isEligible()) {
      if (typeof showTextToast === 'function') showTextToast('오늘 도전 횟수를 다 썼어요');
      return;
    }
    // 예전엔 여기서 토스트만 띄우고 실제 광고는 안 띄웠음(2026-08-31 수정) — 재도전(fail
    // 화면)과 동일하게 실제로 광고를 재생하고, 봐야만 보너스 1회를 준다.
    const rewarded = await _msPlayRewardedAd('persona_promo_retry');
    if (!rewarded) return;
    _msPromoAdBonusGranted = true;
  }
  if (_msPromoAdBonusGranted) {
    _msPromoAdBonusGranted = false; // 보너스는 1회용 — 즉시 소진
  } else if (!isPromoAttemptsUnlimited()) { // Pro는 소진 개념이 없어 캐시를 깎지 않는다
    _msPromoAttemptsCache = Math.max(0, _msPromoAttemptsCache - 1); // 배지 즉시반영(네트워크 응답 기다리지 않음)
  }
  consumePromoAttempt().then(left => { _msPromoAttemptsCache = left; }).catch(() => {}); // DB에는 실제 소진 그대로 기록
  if (typeof analytics !== 'undefined') analytics.track('persona_promo_started', { from_persona: _msPromoFromPersona });
  _playConfirmSfx();
  _msTransitionView(() => msShowPersonaPromoSection(0));
}

// ── 섹션 안내 3종: "이제부터 이런 문제가 나온다"만 알려줌, 문제풀이는 다음 단계에서 연결 ──
function msShowPersonaPromoSection(idx) {
  msPersonaPromoTimerReset(); // 섹션 안내도 시험 시작 전이라 게이지 꺼둠(실제 문제풀이 진입 시 다시 켬)
  const sections = _msPromoSections();
  const sec = sections[idx];
  document.getElementById('ms-title-text').textContent = sec.title;
  _msSetTitleIcon(sec.icon, sec.color);
  const promoSectionDesc = document.getElementById('ms-title-desc');
  promoSectionDesc.style.display = ''; // 문제풀이 화면(display:none)을 거쳐 돌아온 경우 대비
  promoSectionDesc.innerHTML =
    `<span class="ms-desc-line ms-stagger-pending">${sec.ability}</span>` +
    '<span class="ms-desc-line ms-stagger-pending">아래 기준을 넘으면 이 영역은 통과예요</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-chord-lead ms-stagger-pending">${sec.title} 시험 안내</p>
      <div class="ms-promo-info-card ms-stagger-pending" id="ms-promo-info-card">
        <div class="ms-promo-info-row">
          <span class="ms-promo-info-label">문항 수</span>
          <span class="ms-promo-info-value">${sec.total}문제</span>
        </div>
        <div class="ms-promo-info-row">
          <span class="ms-promo-info-label">통과 기준</span>
          <span class="ms-promo-info-value">${sec.cutoff}개 이상 정답</span>
        </div>
        <div class="ms-promo-info-row">
          <span class="ms-promo-info-label">제한 시간</span>
          ${sec.time
            ? `<span class="ms-promo-info-value">${sec.time}초</span>`
            : `<span class="ms-promo-info-value ms-promo-info-value--pending">추후 안내</span>`}
        </div>
      </div>
      <p class="ms-chord-hint ms-stagger-pending">준비됐으면 시험을 시작합니다!</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-promo-section-btn" onpointerup="msPersonaPromoSectionNext(${idx})">시작하기</button>
    </div>
  `;
  _msRunStaggerAndBindStartBtn('ms-promo-info-card', 'ms-promo-section-btn');
}
// "시작하기"는 다음 섹션 안내로 넘기는 버튼이 아니라 "이 섹션의 문제풀이를 시작"하는 버튼 —
// 다음 섹션 안내로의 이동은 각 섹션 문제를 다 풀고 난 뒤(_msPromoQuizSectionDone 등)에 일어남
function msPersonaPromoSectionNext(idx) {
  _playTap();
  _playConfirmSfx();
  const sec = _msPromoSections()[idx];
  if (sec.key === 'quiz')  { _msTransitionView(() => msPersonaPromoQuizStart(sec));  return; }
  if (sec.key === 'scale') { _msTransitionView(() => msPersonaPromoScaleStart(sec)); return; }
  if (sec.key === 'combo') { _msTransitionView(() => msPersonaPromoComboStart(sec)); return; }
}

// ── 코드맞추기 섹션 실제 시작/종료 ──
function msPersonaPromoQuizStart(sec) {
  _msTrackPromoStage('quiz');
  _msExamMode = true;
  _msExamSectionTotal   = sec.total;
  _msExamSectionTimeSec = sec.time;
  _msExamRecords = [];
  _msQuizIndex = 0;
  msShowPreQuizCountdown(); // 3-2-1 카운트다운 끝나면 msShowQuizView로 슬라이드(그 안에서 타이머 시작)
}
function _msPromoQuizSectionDone() {
  msPersonaPromoTimerStop();
  _msExamMode = false;
  const correct = _msExamRecords.filter(r => r.isCorrect).length;
  _msPromoRealResults.quiz = { correct, total: _msExamSectionTotal };
  _msTrackPromoSectionResult('quiz', correct, _msExamSectionTotal);
  _msTransitionView(() => msShowPersonaPromoSection(1)); // 다음: 스케일 안내
}

// ── 스케일 섹션 실제 시작/종료 ──
function msPersonaPromoScaleStart(sec) {
  _msTrackPromoStage('scale');
  _msExamMode = true;
  _msExamSectionTotal   = sec.total;
  _msExamSectionTimeSec = sec.time;
  _msExamRecords = [];
  _msScaleIndex = 0;
  _msScaleSeenIds = []; // 이전 시도의 "이미 나온 블럭" 기록이 새 시험에 안 새어들어가게
  // _msBeginSession()을 안 거치므로 여기서 직접 배정 — 안 하면 _msScaleSessionType이 null로
  // 남아서 문제 문구에서 스케일 종류(펜타토닉/메이저 등)가 빠짐("스케일 C폼"처럼 보임)
  const scaleTypes = _msScaleTypesInPool();
  _msScaleSessionType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)];
  _msScaleSessionTypes = [_msScaleSessionType]; // 승급시험은 선호도 무관 고정포맷 — 항상 1개
  msShowScaleQuizView(); // 스케일은 데일리미션도 카운트다운 없이 바로 진입(msScaleStart와 동일)
}
function _msPromoScaleSectionDone() {
  msPersonaPromoTimerStop();
  _msExamMode = false;
  const correct = _msExamRecords.filter(r => r.isCorrect).length;
  _msPromoRealResults.scale = { correct, total: _msExamSectionTotal };
  _msTrackPromoSectionResult('scale', correct, _msExamSectionTotal);
  _msTransitionView(() => msShowPersonaPromoSection(2)); // 다음: 조합 안내
}

// ── 조합 섹션 실제 시작/종료 (3영역 중 마지막 — 끝나면 최종 판정) ──
function msPersonaPromoComboStart(sec) {
  _msTrackPromoStage('combo');
  _msExamMode = true;
  _msExamSectionTotal   = sec.total;
  _msExamSectionTimeSec = sec.time;
  _msExamRecords = [];
  _msComboQuestionIndex = 0;
  // _msBeginSession()을 안 거치므로 여기서 직접 배정(스케일과 동일 이유) — 안 하면
  // _msComboSessionKey가 이전 값(또는 기본 'C')에 고정된 채로 남음
  const keys = MS_POOL.comboKeys;
  _msComboSessionKey = keys[Math.floor(Math.random() * keys.length)];
  msShowComboQuizView(); // 조합도 카운트다운 없이 바로 진입(daily 플로우와 동일)
}
function _msPromoComboSectionDone() {
  msPersonaPromoTimerStop();
  _msExamMode = false;
  const correct = _msExamRecords.filter(r => r.isCorrect).length;
  _msPromoRealResults.combo = { correct, total: _msExamSectionTotal };
  _msTrackPromoSectionResult('combo', correct, _msExamSectionTotal);
  _msTransitionView(msPersonaPromoFinish);
}

// 지금까지 채점된 실제 결과(_msPromoRealResults)로 3영역 배열을 조립 — 아직 안 끝난/시작도
// 안 한 영역은 0개 맞음 처리. 정상완주(msPersonaPromoFinish)/시간초과(timeout) 양쪽에서 공용.
function _msPromoRealResultSections() {
  return _msPromoSections().map(s => ({
    ...s,
    correct: _msPromoRealResults[s.key]?.correct ?? 0,
  }));
}

// 3영역 다 풀었을 때 최종 판정 — 실제 채점 결과(_msPromoRealResults) 기준, 전 영역 커트라인
// 통과해야 승급. 결과화면(성공/실패)에 넘길 배열도 여기서 만듦
function msPersonaPromoFinish() {
  const sections = _msPromoRealResultSections();
  const allPass = sections.every(s => s.correct >= s.cutoff);
  if (allPass) {
    // 결과화면 진입 전에 커밋 — 성공화면과 확인버튼 사이 이탈(앱종료 등)에도 승급이 남게
    const next = _msPromoNextPersona();
    if (next.id && typeof setUserPersona === 'function') setUserPersona(next.id);
    msShowPersonaPromoSuccess();
    return;
  }
  msShowPersonaPromoFail(false, sections);
}

// ── 결과 화면 2종(성공/실패) — 안내와 마찬가지로 디자인 검수용, 채점 결과는 목업 ──
// TODO: 실제 채점 연결 시 mockResult 자리에 진짜 { key, correct }[] 배열이 들어오면 됨
function _msPromoMockResult() {
  const targets = MS_PROMO_TIER_TARGETS[MS_PERSONA.id] || MS_PROMO_TIER_TARGETS.unboxing;
  return _msPromoSections().map(s => ({
    ...s,
    // 검수용 목업 정답수 — 조합만 커트라인 미달로 만들어 실패화면에서 통과/실패가 섞여 보이게 함
    correct: s.key === 'combo' ? Math.max(0, s.cutoff - 1) : s.cutoff,
  }));
}

// ── 성공(승급) 화면 — 아이콘/타이틀/본문 3단 중앙정렬. 상단 미니타이틀은 안 씀(다 여기 안에) ──
function msShowPersonaPromoSuccess() {
  _msPromoActive = false; // 결과 도달 — pagehide 이탈로그 안 남게 끔
  const next = _msPromoNextPersona();
  const xpAwarded = next.id ? _msPromoXpAwarded(next.id) : 0;
  if (xpAwarded > 0 && typeof addXp === 'function') addXp(xpAwarded);
  if (typeof analytics !== 'undefined') {
    analytics.track('persona_promo_finished', {
      result: 'success', from_persona: _msPromoFromPersona, to_persona: next.id || null,
      xp_awarded: xpAwarded,
      sections: _msPromoSections().map(s => ({
        key: s.key, correct: _msPromoRealResults[s.key]?.correct ?? null, total: s.total, cutoff: s.cutoff,
      })),
    });
  }
  msPersonaPromoTimerReset();
  const nextName = next.name || '다음 단계';
  document.getElementById('ms-title-text').textContent = '';
  document.getElementById('ms-title-desc').style.display = 'none';
  // 아이콘은 ms-title 하위요소(#ms-title-icon)를 재사용 — 이 화면에서만 크게+중앙정렬
  // (다른 화면으로 안 새어나가게 msPersonaPromoTimerReset에서 클래스 제거)
  _msSetTitleIcon('ph-fill ph-trophy', '#E0A526');
  document.querySelector('.ms-title-row')?.classList.add('ms-title-row--promo-success');
  document.getElementById('ms-title-icon')?.classList.add('ms-stagger-pending'); // 아이콘도 등장 애니메이션 대상
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-promo-success-header ms-stagger-pending">
      <p class="ms-promo-success-title">승급 성공!</p>
      <p class="ms-promo-success-subtitle">이제부터 ${nextName}예요</p>
    </div>
    <div class="ms-chord-tutorial ms-promo-success-view">
      <p class="ms-chord-lead ms-stagger-pending">3영역 모두 통과했어요</p>
      <div class="ms-promo-success-body ms-stagger-pending">
        <div class="ms-promo-info-card" id="ms-promo-info-card">
          <div class="ms-promo-info-row">
            <i class="ph-fill ph-sparkle" style="color:#E0A526"></i>
            <span class="ms-promo-info-label">새 페르소나</span>
            <span class="ms-promo-info-value">${nextName}</span>
          </div>
          <div class="ms-promo-info-row">
            <i class="ph-fill ph-lightning" style="color:#4f7cff"></i>
            <span class="ms-promo-info-label">획득 경험치</span>
            <span class="ms-promo-info-value">+${xpAwarded} XP</span>
          </div>
        </div>
        <p class="ms-chord-hint">다음 단계 콘텐츠가 열렸어요!</p>
      </div>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-promo-success-btn" onpointerup="msPersonaPromoSuccessConfirm()">확인</button>
    </div>
  `;
  if (typeof _playSfx === 'function') _playSfx('upgrade_persona2.mp3');

  // 순서 고정 3단계: 아이콘 → 타이틀/설명 → 본문. 구조가 .ms-chord-tutorial 하나짜리
  // 표준 틀을 안 따라서(아이콘·헤더가 그 바깥에 있음) 범용 스태거 엔진
  // (_msRunStaggerAndBindStartBtn) 대신 이 화면 전용으로 직접 순서를 짬
  const iconEl = document.getElementById('ms-title-icon');
  const header = document.querySelector('.ms-promo-success-header');
  const lead   = document.querySelector('.ms-chord-lead');
  const body   = document.querySelector('.ms-promo-success-body');
  const btn    = document.getElementById('ms-promo-success-btn');
  const reveal = (el, durMs) => {
    if (!el) return;
    el.classList.remove('ms-stagger-in');
    el.classList.remove('ms-stagger-pending');
    void el.offsetWidth; // 리플레이 트릭
    el.style.setProperty('--ms-stagger-dur', durMs + 'ms');
    el.classList.add('ms-stagger-in');
  };
  const STEP_DUR = 650, STEP_GAP = 200;
  let t = 0;
  setTimeout(() => reveal(iconEl, STEP_DUR), t);              t += STEP_DUR + STEP_GAP;
  setTimeout(() => reveal(header, STEP_DUR), t);               t += STEP_DUR + STEP_GAP;
  setTimeout(() => { reveal(lead, STEP_DUR); reveal(body, STEP_DUR); }, t); t += STEP_DUR + STEP_GAP;
  setTimeout(() => btn?.classList.remove('ms-btn-pending'), t);
}
function msPersonaPromoSuccessConfirm() {
  _playTap();
  _playConfirmSfx();
  // setUserPersona()는 msPersonaPromoFinish()에서 이미 커밋됨(채점 통과 시점).
  // TODO: DB subscriptions.persona 갱신은 아직 미연동 — 로그인 기기 간 동기화 필요해지면 여기서 같이 호출
  // 사운드가 실제로 들리기 전에 페이지 이동이 끊어버리는 걸 방지 — 짧게 지연 후 이동
  setTimeout(() => { location.href = 'home.html'; }, 150);
}

// ── 실패 화면 ── timedOut=true면 "제한시간 초과로 무제한 시간에 이어푼 것"이라는 안내 한 줄 추가.
// resultOverride를 주면 그걸 쓰고(실제 채점 결과), 없으면 목업(디자인 검수용 단독 진입 시)
function msShowPersonaPromoFail(timedOut = false, resultOverride = null) {
  _msPromoActive = false; // 결과 도달 — pagehide 이탈로그 안 남게 끔
  msPersonaPromoTimerReset();
  const result = resultOverride || _msPromoMockResult();
  if (typeof analytics !== 'undefined') {
    analytics.track('persona_promo_finished', {
      result: 'fail', from_persona: _msPromoFromPersona, timed_out: timedOut,
      sections: result.map(s => ({ key: s.key, correct: s.correct, total: s.total, cutoff: s.cutoff })),
    });
  }
  document.getElementById('ms-title-text').textContent = '아쉬워요';
  _msSetTitleIcon('ph-fill ph-heart-break', '#D06A94');
  const promoFailDesc = document.getElementById('ms-title-desc');
  promoFailDesc.style.display = ''; // 문제풀이 화면(display:none)을 거쳐 돌아온 경우 대비
  promoFailDesc.innerHTML =
    '<span class="ms-desc-line">이번엔 기준을 못 넘었어요</span>' +
    '<span class="ms-desc-line">괜찮아요, 다시 도전하면 돼요!</span>';
  const attemptsLeft = _msPromoAttemptsLeft(); // msPersonaPromoStart 시점에 이미 1회 소진 반영된 값
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="ms-chord-lead">영역별 결과예요</p>
      ${timedOut ? `<p class="ms-promo-timeout-note"><i class="ph-fill ph-clock"></i> 제한시간을 초과해서 나머지는 시간 제한 없이 풀었어요</p>` : ''}
      <div class="ms-promo-info-card" id="ms-promo-info-card">
        ${result.map(s => {
          const pass = s.correct >= s.cutoff;
          return `
          <div class="ms-promo-info-row">
            <i class="${pass ? 'ph-fill ph-check-circle' : 'ph-fill ph-x-circle'}" style="color:${pass ? '#3E9C6F' : '#D9534F'}"></i>
            <span class="ms-promo-info-label">${s.title}</span>
            <span class="ms-promo-info-value" style="color:${pass ? '#3E9C6F' : '#D9534F'}">${s.correct}/${s.total}${pass ? ' 통과' : ' 미달'}</span>
          </div>`;
        }).join('')}
      </div>
      <p class="ms-chord-hint">${isPromoAttemptsUnlimited() ? '언제든 다시 도전할 수 있어요' : (attemptsLeft > 0 ? `오늘 ${attemptsLeft}번 더 도전할 수 있어요` : '오늘 도전 횟수를 다 썼어요')}</p>
    </div>
    <div class="ms-bottom-actions ms-result-btn-row">
      <button class="cd-btn cd-btn--gray ms-btn-pending" id="ms-promo-fail-later-btn" onpointerup="msPersonaPromoFailLater()">나중에</button>
      <button class="cd-btn cd-btn--blue ms-btn-pending" id="ms-promo-fail-retry-btn" onpointerup="msPersonaPromoFailRetry()">재도전 ${isPromoAttemptsUnlimited() ? '∞' : `${attemptsLeft}/${MS_PROMO_DAILY_ATTEMPTS}${attemptsLeft <= 0 ? ' <i class="ph-fill ph-play-circle"></i>' : ''}`}</button>
    </div>
  `;

  // 2단계 순차 등장: #ms-title(아이콘+타이틀+설명) 통째로 → .ms-chord-tutorial(결과카드 등)
  // 통째로. 구조가 단순해서 success 화면처럼 범용 스태거 엔진 대신 직접 순서를 짬
  const titleEl = document.getElementById('ms-title');
  const mainEl  = document.querySelector('.ms-chord-tutorial');
  const laterBtn = document.getElementById('ms-promo-fail-later-btn');
  const retryBtn = document.getElementById('ms-promo-fail-retry-btn');
  const reveal = (el, durMs) => {
    if (!el) return;
    el.classList.remove('ms-stagger-in');
    el.classList.remove('ms-stagger-pending');
    void el.offsetWidth; // 리플레이 트릭
    el.style.setProperty('--ms-stagger-dur', durMs + 'ms');
    el.classList.add('ms-stagger-in');
  };
  titleEl.classList.remove('ms-stagger-in');
  titleEl.classList.add('ms-stagger-pending');
  mainEl.classList.add('ms-stagger-pending'); // 마크업엔 안 넣어뒀으니 여기서 미리 숨김
  const STEP_DUR = 650, STEP_GAP = 200;
  let t = 0;
  setTimeout(() => reveal(titleEl, STEP_DUR), t); t += STEP_DUR + STEP_GAP;
  setTimeout(() => reveal(mainEl, STEP_DUR), t);  t += STEP_DUR + STEP_GAP;
  setTimeout(() => {
    laterBtn?.classList.remove('ms-btn-pending');
    retryBtn?.classList.remove('ms-btn-pending');
  }, t);
}
function msPersonaPromoFailLater() {
  _playTap();
  location.href = 'home.html';
}
async function msPersonaPromoFailRetry() {
  _playTap();
  if (_msPromoAttemptsLeft() <= 0) {
    if (!MissionAdProvider.isEligible()) {
      if (typeof showTextToast === 'function') showTextToast('오늘 도전 횟수를 다 썼어요');
      return;
    }
    const rewarded = await _msPlayRewardedAd('persona_promo_retry');
    if (!rewarded) return; // 광고 중간이탈/실패 — 그대로 실패화면에 머무름
    _msPromoAdBonusGranted = true;
  }
  // 안내화면(인트로)은 다시 안 거치지만, 첫 섹션 준비화면("시작하기" 버튼)에는 들러야 함
  // (2026-09 변경 — 처음엔 바로 카운트다운까지 건너뛰게 했다가, 준비 없이 훅 시작하는 게
  // 어색하다는 피드백으로 되돌림). 횟수 소진 처리는 msPersonaPromoStart()와 동일 로직을 여기
  // 직접 둠(그 함수를 부르면 attemptsLeft를 다시 검사해서 광고가 또 뜰 수 있음)
  if (_msPromoAdBonusGranted) {
    _msPromoAdBonusGranted = false; // 보너스는 1회용 — 즉시 소진
  } else if (!isPromoAttemptsUnlimited()) { // Pro는 소진 개념이 없어 캐시를 깎지 않는다
    _msPromoAttemptsCache = Math.max(0, _msPromoAttemptsCache - 1); // 배지 즉시반영(네트워크 응답 기다리지 않음)
  }
  consumePromoAttempt().then(left => { _msPromoAttemptsCache = left; }).catch(() => {}); // DB에는 실제 소진 그대로 기록
  Object.keys(_msPromoRealResults).forEach(k => delete _msPromoRealResults[k]); // 지난 시도 채점 결과 초기화
  _msPromoFromPersona = MS_PERSONA.id;
  if (typeof analytics !== 'undefined') analytics.track('persona_promo_started', { from_persona: _msPromoFromPersona });
  _playConfirmSfx();
  _msTransitionView(() => msShowPersonaPromoSection(0));
}

// ── 승급시험 전용 상단 게이지 — 평소(데일리미션) "진행도" 대신 "남은시간"으로 동작.
// #ms-progress-fill/#ms-progress-track은 그대로 재사용(막대), #ms-progress-time에 초 표시.
// 색: 기본(파랑) → 30% 이하 남으면 노랑 → 5초 이하 남으면 빨강(30% 규칙보다 우선).
const MS_PROMO_TIMER_WARN_FRACTION = 0.30;
const MS_PROMO_TIMER_DANGER_SEC    = 5;
let _msPromoTimerId = null;

function _msPromoFormatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// totalSeconds 동안 카운트다운, 0이 되면 onExpire() 호출(보통 msPersonaPromoTimeoutPopup)
function msPersonaPromoTimerStart(totalSeconds, onExpire) {
  msPersonaPromoTimerStop();
  const track = document.querySelector('.ms-progress-track');
  const fill  = document.getElementById('ms-progress-fill');
  const label = document.getElementById('ms-progress-time');
  if (!fill || !label) return;
  if (track) track.style.display = '';
  label.style.display = '';
  fill.style.width = '100%';
  fill.style.background = '';
  label.classList.remove('ms-progress-time--warn', 'ms-progress-time--danger');

  const endAt = performance.now() + totalSeconds * 1000; // wall-clock 기준 — setInterval 누적오차 방지
  let lastBeepSecond = null; // 중복 재생 방지 — 정수초가 바뀔 때만 1번
  const tick = () => {
    const remainMs  = endAt - performance.now();
    const remainSec = remainMs / 1000;
    if (remainMs <= 0) {
      fill.style.width = '0%';
      label.textContent = _msPromoFormatTime(0);
      msPersonaPromoTimerStop();
      if (typeof onExpire === 'function') onExpire();
      return;
    }
    const frac = remainSec / totalSeconds;
    fill.style.width = (frac * 100) + '%';
    label.textContent = _msPromoFormatTime(remainSec);

    const danger = remainSec <= MS_PROMO_TIMER_DANGER_SEC;
    const warn   = !danger && frac <= MS_PROMO_TIMER_WARN_FRACTION;
    fill.style.background = danger ? '#D9534F' : warn ? '#FFB300' : '';
    label.classList.toggle('ms-progress-time--danger', danger);
    label.classList.toggle('ms-progress-time--warn', warn);

    // 5초 이하 구간, 정수초 바뀔 때마다(1초 1번) 비프
    if (danger) {
      const sec = Math.ceil(remainSec);
      if (sec !== lastBeepSecond) {
        lastBeepSecond = sec;
        _msPlayBeep(880, 0.05);
      }
    }
  };
  tick();
  _msPromoTimerId = setInterval(tick, 100);
}
function msPersonaPromoTimerStop() {
  if (_msPromoTimerId) { clearInterval(_msPromoTimerId); _msPromoTimerId = null; }
}
// 게이지를 "진행도" 모드(데일리미션 기본)로 되돌림 — 승급시험 화면을 벗어날 때 호출
function msPersonaPromoTimerReset() {
  msPersonaPromoTimerStop();
  // 안내페이지는 시험 중이 아니므로 인디케이터(트랙 전체)를 통째로 숨김 — 지난 섹션의
  // 빨간/노란 잔여 상태가 다음 안내화면까지 그대로 보이던 문제 수정
  const track = document.querySelector('.ms-progress-track');
  if (track) track.style.display = 'none';
  const label = document.getElementById('ms-progress-time');
  if (label) label.style.display = 'none';
  const fill = document.getElementById('ms-progress-fill');
  if (fill) { fill.style.background = ''; fill.style.width = '0%'; }
  // 성공화면 전용 타이틀아이콘 확대+중앙정렬이 다른 화면으로 안 새어나가게 정리
  document.querySelector('.ms-title-row')?.classList.remove('ms-title-row--promo-success');
}

// ── 제한시간 초과 팝업 — 목적은 "이 시험 전체가 즉시 실패 확정됐다"는 걸 알리는 것.
// 카드가 아니라 배경만 어둡게+글씨만 뜨는 스타일. 실패는 이미 확정이라 두 선택지 다
// 결국 실패화면으로 감 — "끝까지 풀기"는 결과를 안 바꾸고 그냥 연습 삼아 남은 문제를
// 마저 풀어보는 것뿐. TODO: 실제 문제풀이 붙으면 "끝까지 풀기"는 남은 문제를 무제한
// 시간으로 계속 진행한 뒤 실패화면으로 보내야 함 — 지금은 문제풀이 자체가 없어서 바로 이동
function msPersonaPromoTimeoutPopup() {
  // 질문 화면의 개별 스톱워치 RAF가 안 멈춘 채 계속 돌면 낭비라 여기서 같이 끊음
  if (_msQuizTimerRAF) { cancelAnimationFrame(_msQuizTimerRAF); _msQuizTimerRAF = null; }
  // 시간초과로 끊긴 섹션은 _msPromoQuizSectionDone류(정상완주 전용)를 못 거치므로
  // _msPromoRealResults에 값이 없어 결과화면에서 0개로 보임(2026-09 버그) — 지금까지
  // 채점된 만큼(_msExamRecords)을 여기서 대신 커밋
  if (['quiz', 'scale', 'combo'].includes(_msPromoLastStage) && !_msPromoRealResults[_msPromoLastStage]) {
    const correct = _msExamRecords.filter(r => r.isCorrect).length;
    _msPromoRealResults[_msPromoLastStage] = { correct, total: _msExamSectionTotal };
  }
  _msExamMode = false; // 시간초과=시험 이탈 확정, 남아있던 문제풀이 상태 정리
  let overlay = document.getElementById('ms-promo-timeout-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ms-promo-timeout-overlay';
    overlay.className = 'ms-promo-timeout-overlay';
    overlay.innerHTML = `
      <div class="ms-promo-timeout-content">
        <p class="ms-promo-timeout-text">시간 초과로 실패했어요</p>
        <p class="ms-promo-timeout-sub">그래도 남은 문제를 연습 삼아 풀어볼까요?</p>
        <div class="ms-promo-timeout-actions">
          <span class="ms-promo-timeout-btn ms-promo-timeout-btn--ghost" id="ms-promo-timeout-exit">나가기</span>
          <span class="ms-promo-timeout-btn ms-promo-timeout-btn--primary" id="ms-promo-timeout-continue">끝까지 풀기</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('ms-promo-timeout-continue').addEventListener('pointerup', () => {
      _playTap();
      overlay.classList.remove('ms-promo-timeout-overlay--show');
      // TODO: 실제로는 여기서 남은 문제를 무제한 시간으로 이어서 풀게 해야 함
      msShowPersonaPromoFail(true, _msPromoRealResultSections());
    });
    document.getElementById('ms-promo-timeout-exit').addEventListener('pointerup', () => {
      _playTap();
      overlay.classList.remove('ms-promo-timeout-overlay--show');
      msShowPersonaPromoFail(true, _msPromoRealResultSections());
    });
  }
  requestAnimationFrame(() => overlay.classList.add('ms-promo-timeout-overlay--show'));
}

// 화면 가리개(#page-cover) 걷기 — 콘텐츠가 실제로 다 그려진 뒤에만 호출할 것. 먼저 불러버리면
// 그 틈에 정적 HTML 기본값(기타 이미지 버퍼)이 순간 노출된다(2026-08-31 버그).
function _msRevealPage() {
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();
  positionMsGradient();
  // 디버그 칩은 shared.js DOMContentLoaded에서 전역 1회 처리(2026-08-31 이전)

  // Android 하드웨어 뒤로가기 — 모달 열려있으면 닫기만, 아니면 화면상 back-btn과 동일하게
  // closeMissionSession() 태워서 완주 전 이탈 확인모달 동일하게 적용(2026-08-29, strum-play.js와 동일 패턴).
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) { hideLeavePracticeModal(); return; }
      closeMissionSession();
    });
  }

  // 리워드 광고 SDK 초기화는 shared.js DOMContentLoaded에서 전역 1회 처리(2026-08-30,
  // 피크 완전소진 게이트가 어느 페이지에서든 뜰 수 있게 되면서 이관됨) — 여기서 또 안 부름.

  // 결산 디자인 작업용 목업 진입로 — ?mock=result 로 열면 퀴즈를 안 풀고 바로 결산 화면으로.
  // 임시 디버그용, 배포와 무관(URL 파라미터 없으면 원래 흐름 그대로).
  if (new URLSearchParams(location.search).get('mock') === 'result') {
    _msMockMode = true; // 실제 출석 진행(advanceAttendance)이 안 타게 막음
    _msLoadMockResultData();
    msShowResultView();
    _msRevealPage();
    return;
  }
  // 승급시험 디자인 검수용 목업 진입로 — ?mock=promo(안내) / promo-success(성공) / promo-fail(실패).
  // 문제풀이 자체는 아직 미구현이라 마지막 섹션의 "시작하기" 버튼은 스텁(TODO 로그만 남김).
  const mockParam = new URLSearchParams(location.search).get('mock');
  if (mockParam === 'promo')         { msShowPersonaPromoIntro(); _msRevealPage(); return; }
  if (mockParam === 'promo-success') { msShowPersonaPromoSuccess(); _msRevealPage(); return; }
  if (mockParam === 'promo-fail')    { msShowPersonaPromoFail();    _msRevealPage(); return; }
  if (mockParam === 'promo-timeout') { msPersonaPromoTimeoutPopup(); _msRevealPage(); return; }
  if (mockParam === 'promo-quiz')    { msPersonaPromoQuizStart(_msPromoSections()[0]); _msRevealPage(); return; }
  if (mockParam === 'promo-scale')   { msPersonaPromoScaleStart(_msPromoSections()[1]); _msRevealPage(); return; }
  if (mockParam === 'promo-combo')   { msPersonaPromoComboStart(_msPromoSections()[2]); _msRevealPage(); return; }

  // 실제 진입로 — 프로필 페르소나 트랙의 다음 단계(eligible) dot 클릭 시 여기로 들어옴.
  // msShowPersonaPromoIntro()는 이제 캐시값으로 즉시 그리므로(2026-09), 그리자마자 가리개를 걷는다.
  if (new URLSearchParams(location.search).get('promo') === '1') {
    msShowPersonaPromoIntro();
    _msRevealPage();
    return;
  }

  // 유저가 직접 "오늘 훈련 결과보기"를 클릭한 경우(attendance.html) — 이미 봤어도
  // 명시적 요청이니 자동 재접속과 달리 home으로 안 튕기고 그대로 보여준다.
  if (new URLSearchParams(location.search).get('view') === 'result') {
    if (_msRestoreTodayResult()) {
      msShowResultView();
      msUpdateProgress(MS_TOTAL_STEPS);
      _msRevealPage();
    } else {
      location.href = 'home.html'; // 결과 데이터가 없으면(자정 넘어감 등) 조용히 home으로
    }
    return;
  }

  // 오늘 루틴을 이미 끝냈으면 처음부터 다시 풀리지 않고 그날의 결산을 그대로 보여준다.
  // 단, 결산화면을 이미 한 번 봤다면(_msTodayResultSeen) 재접속 때마다 다시 그 화면으로
  // 튕기지 않고 home으로 보낸다 — daily-mission.js 게이트가 여길로 보내는 것도 막아야 하지만
  // 직접 URL 접근/뒤로가기 대비로 여기서도 한 번 더 막는다.
  if (_msRestoreTodayResult()) {
    if (_msTodayResultSeen()) { location.href = 'home.html'; return; }
    msShowResultView();
    msUpdateProgress(MS_TOTAL_STEPS);
    _msRevealPage();
    return;
  }

  _msRevealPage(); // 이 경로는 정적 HTML의 기타 버퍼 화면을 그대로 보여주는 게 의도된 동작
  _msStartBuffer(); // 버퍼 → 5초 후 코드맞추기 튜토리얼
  // 튜토리얼 단계에선 인디케이터 업데이트 안 함 — 게이지는 문제풀이(msShowQuizView) 진입 시점부터 시작

  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      renderTutorialChords();
      positionMsGradient();
    }, 150);
  });
});
