// ═══════════════════════════════════════════════════════════════
// mission-session.js — 페르소나 승급시험 (코드맞추기 · 스케일 · 리하모니 화성학 3구간)
// 옛 데일리 미션(오늘 풀이·결산·보상·오답 노트·출석 도장 연출)은 폐지되어 삭제됨. 리하모니 구간은 chord-combo.js의 최신 문제 엔진을 씀.
// ═══════════════════════════════════════════════════════════════
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
  analytics.track('persona_promo_section_completed', {
    section, correct, total,
    wrong: MS_PROMO_MAX_HEARTS - _msPromoHearts,   // 이 영역에서 잃은 하트 수
    passed: true,   // 이 함수는 하트를 잃지 않고 끝까지 푼 영역에서만 불린다
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

// 코드맞추기 시작 전 안내문구 2줄(아래서 위로 순차 등장, 사라지지 않고 그대로 유지) +
// 3-2-1 카운트다운 — 카운트 사운드는 코드 이름 맞추기(chord-name-quiz.js startCountdown)와
// 동일한 비프/벨을 그대로 재사용
function msShowPreQuizCountdown() {
  // 카운트다운 중엔 상하 스크롤 잠금 — 숫자 팝 애니메이션으로 컨텐츠 높이가 흔들려도
  // .ms-scroll이 스크롤되지 않게 함 (다음 뷰 진입 시 msShowQuizView에서 해제)
  document.getElementById('mission-session-page').classList.add('ms-countdown-lock');
  msPersonaPromoGaugeEmpty();   // 카운트다운 중엔 탑바 게이지를 빈 채로
  document.getElementById('ms-title-text').textContent = '';
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  // 문제 뷰와 같은 레이아웃을 빈 슬롯 상태(.cq-counting)로 그린다 — 안내문구는 문제 카드 헤더, 숫자는 문제 카드 본문,
  // 답 영역은 말풍선 + 빈 카드 4칸(코드맞추기 페이지 startCountdown과 동일한 화면)
  document.getElementById('ms-main').innerHTML = _msQuizViewHtml({
    counting: true,
    msg1: _msExamMode ? `제한시간 ${_msExamSectionTimeSec}초 안에` : '최대한 빠르게 맞춰보세요!',
    msg2: _msExamMode ? '맞춰주세요!' : '카운트가 시작됩니다.',
  });

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
    msShowQuizView(); // 같은 레이아웃이 이미 떠 있으므로 슬라이드 전환 없이 그 자리에서 문제를 채운다
  }, 5300);
}

const MS_QUIZ_TOUCH_HINT = '터치해서 소리도 들어보세요!';

// 코드맞추기 문제 뷰 마크업 — 문제 풀이(msShowQuizView)와 카운트다운(msShowPreQuizCountdown)이 같이 쓴다.
// counting이면 .cq-counting 상태(경과시간·피드백·캔버스 숨김, 안내문구·숫자 표시)에 답 영역 빈 카드 4칸.
function _msQuizViewHtml({ counting = false, msg1 = '', msg2 = '' } = {}) {
  return `
    <div class="ms-quiz-view${counting ? ' cq-counting' : ''}" id="ms-quiz-view">
      <div class="ms-quiz-question-card" id="ms-quiz-question-card">
        <div class="cq-inner">
          <div class="cq-head">
            <span class="ms-quiz-timer" id="ms-quiz-timer">0.0s</span>
            <p class="ms-quiz-feedback" id="ms-quiz-feedback"></p>
            <div class="cq-count-msgs">
              <p class="ms-precountdown-msg ms-stagger-pending" id="ms-precountdown-msg1">${msg1}</p>
              <p class="ms-precountdown-msg ms-stagger-pending" id="ms-precountdown-msg2">${msg2}</p>
            </div>
          </div>
          <div class="ms-quiz-canvas-wrap" id="ms-quiz-canvas-wrap">
            <div class="ms-quiz-canvas-slot" id="ms-quiz-canvas-slot"></div>
            <span class="ms-quiz-question-name" id="ms-quiz-question-name" style="display:none"></span>
            <div class="ms-countdown-num cq-count-num" id="ms-countdown-num"></div>
          </div>
        </div>
      </div>
      <div class="cq-answer">
        <div class="cq-bubble">정답을 맞춰주세요!</div>
        <div class="ms-quiz-choices" id="ms-quiz-choices">${counting ? '<div class="ms-quiz-choice-card cq-slot"></div>'.repeat(4) : ''}</div>
      </div>
    </div>
  `;
}

// 튜토리얼 뷰 → 문제풀이 뷰 전환. 탑바(X+인디케이터)/타이틀/메인영역 3단 구조는
// 그대로 재사용하고, 타이틀 텍스트와 메인영역 내부 콘텐츠만 교체함
function msShowQuizView() {
  document.getElementById('mission-session-page').classList.remove('ms-countdown-lock');
  document.getElementById('ms-title-text').textContent = ''; // 타이틀은 답 영역 말풍선("정답을 맞춰주세요!")이 대신함 — CSS가 문제 뷰에선 .ms-title을 숨김
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = _msQuizViewHtml();
  // 문제 카드 탭 → 정답 코드 소리(코드맞추기 페이지와 동일). 카운트다운 화면은 이 핸들러를 달지 않으므로 소리가 나지 않는다
  document.getElementById('ms-quiz-question-card').addEventListener('pointerup', () => {
    if (_msQuizCurrent) _msPlayEntrySound(_msQuizCurrent.targetEntry);
  });
  _msQuizIndex = 0; // 진행도바 자리는 남은시간 게이지가 쓴다
  _msQuizNext();
  msPersonaPromoTimerStart(_msExamSectionTimeSec, msPersonaPromoTimeoutPopup);
}
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
let _msQuizAutoPlayTimer = null;   // 문제 출제 직후 정답 코드 소리 1회 자동 재생 예약
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
  if (_msQuizIndex >= _msExamSectionTotal) { _msPromoQuizSectionDone(); return; }
  _msQuizAnswered = false;

  const mode = (Math.random() < 0.5 ? 'diagram' : 'name'); // diagram=문제가 다이어그램/선택지가 이름, name=문제가 이름/선택지가 다이어그램
  const targetName  = MS_TUTORIAL_CHORDS[Math.floor(Math.random() * MS_TUTORIAL_CHORDS.length)];
  const targetEntry = _msGetEntry(targetName);
  const choices = _msQuizPickChoices(targetName);
  _msQuizCurrent = { mode, targetName, targetEntry, choices };

  // 답하기 전 — 문제 카드 설명 자리에 안내(답하면 정답/오답 문구로 바뀜). 코드맞추기 페이지와 동일
  document.getElementById('ms-quiz-feedback').textContent = MS_QUIZ_TOUCH_HINT;

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
  _msQuizStartTimer();

  // 문제가 나오면 정답 코드 소리를 1회 자동 재생(더 듣고 싶으면 문제 카드를 터치). 응답했거나 구간이 끝났으면 재생하지 않음
  clearTimeout(_msQuizAutoPlayTimer);
  const _autoIdx = _msQuizIndex;
  _msQuizAutoPlayTimer = setTimeout(() => {
    _msQuizAutoPlayTimer = null;
    if (_msQuizAnswered || !_msExamMode || _autoIdx !== _msQuizIndex) return;
    _msPlayEntrySound(targetEntry);
  }, 180);
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
  if (_msSfxAudioCtx.state !== 'running') _msSfxAudioCtx.resume();
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
  clearTimeout(_msQuizAutoPlayTimer);   // 정답을 고르면 문제 소리는 바로 끊음
  _msQuizAutoPlayTimer = null;
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  if (_msQuizTimerRAF) cancelAnimationFrame(_msQuizTimerRAF);
  _playTap();
  msPlaySound(isCorrect ? 'correct' : 'wrong');

  const speedSec = (performance.now() - _msQuizStartTime) / 1000;
  document.getElementById('ms-quiz-feedback').textContent = _msQuizPickFeedback(isCorrect, speedSec);

  document.querySelectorAll('.ms-quiz-choice-card').forEach(c => {
    if (c.dataset.name === _msQuizCurrent.targetName) c.classList.add('ms-quiz-choice-card--correct');
    else if (c === card) c.classList.add('ms-quiz-choice-card--wrong');
  });

  _msExamRecords.push({ name: _msQuizCurrent.targetName, isCorrect });
  _msQuizIndex++;   // 진행도바 자리는 남은시간 게이지가 쓰고 있다
  if (!isCorrect) _msPromoLoseHeart();

  setTimeout(() => {
    if (_msPromoHeartsOut) { _msPromoHeartsOutFail(); return; }   // 하트 0개 — 즉시 실패
    // 마지막 문제 뒤엔 뷰 자체가 바뀌므로 문제 슬라이드를 겹치지 않게 여기서 분기
    if (_msQuizIndex >= _msExamSectionTotal) { _msPromoQuizSectionDone(); return; }
    _msTransitionQuestion('.ms-quiz-view', _msQuizNext);
  }, 1100);
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
  'major-pentatonic':  '메이저 펜타토닉',
  'major-blues':       '메이저 블루스',
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

// 스케일 문제풀이 뷰 — scale-level.js의 실제 테스트 프로세스(근음 힌트→dot 탭 입력→채점)를
// C key 고정으로 이식. FRETS_VISIBLE/TOTAL_FRETS는 scale-data.js 전역 상수 재사용
const MS_SCALE_STRINGS          = 6;
const MS_SCALE_STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
const MS_SCALE_SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19]);
const MS_SCALE_DOUBLE_DOT_FRETS = new Set([12]);
const MS_SCALE_OPEN_MIDI        = [64, 59, 55, 50, 45, 40]; // 1번줄→6번줄 개방현 MIDI
const MS_SCALE_ROOT             = 0;    // 스케일 훈련 문제 수
let _msScaleIndex     = 0;    // 채점 완료한 스케일 문제 수
let _msScaleSeenIds   = [];   // 같은 폼 연속 출제 방지
let _msScaleItem      = null; // { block, startFret, hint:{s,col} }
let _msScalePlaced    = new Set(); // "s,col" 문자열
let _msScaleSubmitted = false;

function msShowScaleQuizView() {
  // 스케일 훈련 연습화면(scale-level.html #scale-test-overlay)과 같은 지판 블록 — 타이틀("올바른 곳을 채우세요!")은 승급시험 것을 그대로 두고,
  // 그 아래 문제 영역(여러 유형 출제)만 연습화면 구성으로 바꾼다. id·클래스가 연습화면과 같아 style.css의 지판 규칙을 그대로 받는다.
  document.getElementById('ms-title-text').textContent = '올바른 곳을 채우세요!';
  document.getElementById('ms-title-desc').style.display = 'none';
  _msHideTitleIcon();
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial">
      <p class="test-question-text" id="ms-scale-question"></p>
      <div class="scale-test-fb-wrap">
        <div class="test-fb-neck-slot">
          <div id="test-fb-viewport">
            <div id="test-fb-full-wrapper">
              <div class="fb-full-neck" id="test-fb-full-neck"></div>
              <div class="fb-full-nums" id="test-fb-full-nums"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="test-result-row" id="ms-scale-result-row" style="visibility:hidden">
        <span class="test-result-score" id="ms-scale-result-score">&nbsp;</span>
      </div>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--brand" id="ms-scale-submit-btn" onpointerup="msScaleSubmit()">제출하기</button>
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

  const allBlocks = _msScalePoolBlocks();
  const blocks = allBlocks.filter(b => !_msScaleSeenIds.includes(b.id));
  const pool   = blocks.length ? blocks : allBlocks;
  const block  = pool[Math.floor(Math.random() * pool.length)];
  _msScaleSeenIds.push(block.id);
  const starts = ScaleData.getStartFrets(block, MS_SCALE_ROOT);
  const startFret = starts.length ? starts[Math.floor(Math.random() * starts.length)] : 0;
  const hint = _msScaleFindHighestRoot(block, startFret);
  _msScaleItem = { block, startFret, hint };

  const qEl = document.getElementById('ms-scale-question');
  qEl.classList.remove('test-question--in');
  void qEl.offsetWidth;   // 애니메이션 재시작
  qEl.textContent = `${_msScaleQuestionLabel(block)} 블럭을 채워주세요`;
  qEl.classList.add('test-question--in');

  document.getElementById('ms-scale-result-row').style.visibility = 'hidden';
  document.getElementById('ms-scale-submit-btn').textContent = '제출하기';

  _msScaleRenderNeck();
}

// ── 지판 크기 계산 — scale-level.js applyTestFbLayout 이식(스타일가이드 §17 "사진 확대") ──
// 360px 기준 디자인 한 벌을 컨테이너 실측 폭(최대 520px)에 맞춰 확대. 지판 틀 폭·높이, 안쪽 단위(--fbu), 고정 px 단위(--fbs)를 같은 배율로 넣는다.
const MS_TEST_FB_REF_WIDTH    = 360;
const MS_TEST_FB_RATIO        = 2.3;
const MS_TEST_FB_REF_SPAN     = MS_TEST_FB_REF_WIDTH / MS_TEST_FB_RATIO;
const MS_TEST_FB_REF_NECK_H   = (MS_TEST_FB_REF_SPAN - 2.25) * 6 / 5;
const MS_TEST_FB_REF_TOTAL_H  = MS_TEST_FB_REF_NECK_H + 6 * (MS_TEST_FB_REF_NECK_H / 160) + 22 * (MS_TEST_FB_REF_NECK_H / 160);
const MS_TEST_FB_MAX_WIDTH    = 520;
function _msApplyTestFbLayout() {
  const wrap = document.querySelector('.scale-test-fb-wrap');
  if (!wrap) return;
  const cs = getComputedStyle(wrap);
  const rowWidth = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const scale = Math.max(Math.min(rowWidth, MS_TEST_FB_MAX_WIDTH) / MS_TEST_FB_REF_WIDTH, 0.01);
  const viewport = document.getElementById('test-fb-viewport');
  const wrapper  = document.getElementById('test-fb-full-wrapper');
  if (viewport) {
    viewport.style.width  = (MS_TEST_FB_REF_WIDTH * scale) + 'px';
    viewport.style.height = (MS_TEST_FB_REF_TOTAL_H * scale) + 'px';
  }
  wrap.style.setProperty('--test-fb-w', (MS_TEST_FB_REF_WIDTH * scale) + 'px');
  if (wrapper) {
    wrapper.style.width = (MS_TEST_FB_REF_WIDTH * scale) + 'px';
    wrapper.style.setProperty('--fbu', ((MS_TEST_FB_REF_NECK_H / 160) * scale) + 'px');
    wrapper.style.setProperty('--fbs', String(scale));
    wrapper.style.transform = 'none';
  }
}
window.addEventListener('resize', () => { if (document.getElementById('test-fb-viewport')) _msApplyTestFbLayout(); });

// 7프렛 고정창 넥 렌더 — scale-level.js renderTestNeck 이식 (줄/너트/프렛선/포지션마커/개방현힌트/근음힌트)
function _msScaleRenderNeck() {
  const neckEl = document.getElementById('test-fb-full-neck');
  const numsEl = document.getElementById('test-fb-full-nums');
  if (!neckEl || !numsEl) return;
  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  _msApplyTestFbLayout();   // 연습화면과 같은 "사진 확대" 크기 계산(360px 기준 · 폭 520px 상한)

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
  const neckEl = document.getElementById('test-fb-full-neck');
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
  const neckEl = document.getElementById('test-fb-full-neck');
  neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`)?.remove();
  _msScalePlaced.delete(key);
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)?.style.removeProperty('display');
}

function _msScaleInitTap() {
  const neckEl = document.getElementById('test-fb-full-neck');
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
    if (_msPromoHeartsOut) { _msPromoHeartsOutFail(); return; }   // 하트 0개 — 즉시 실패
    if (_msScaleIndex < _msExamSectionTotal) {
      _msTransitionQuestion('#ms-main .ms-chord-tutorial', _msScaleInitQuestion);
    } else {
      _msPromoScaleSectionDone();
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

  const neckEl = document.getElementById('test-fb-full-neck');
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
  // 승급시험: 한 자리도 안 틀리고(오답0·놓침0) 완벽해야 이 문제를 "정답"으로 침
  _msExamRecords.push({ isCorrect: _isPerfectRun });
  _msScaleIndex++;
  if (!_isPerfectRun) _msPromoLoseHeart();

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

function closeMissionSession() {
  _playTap();
  if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;

  _playConfirmSfx();
  _msDoCloseMissionSession();
}

function _msDoCloseMissionSession() {
  if (typeof comboV2ExamStop === 'function') comboV2ExamStop();   // 리하모니 구간 중이면 소리·드래그 등 즉시 정리
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
    key: 'combo', title: '리하모니 화성학', icon: 'ph-fill ph-pencil', color: '#7B52CC',
    ability: '코드끼리 자연스럽게 이어붙이는 화성 감각을 기릅니다',
  },
];
// 단계(=응시 대상 페르소나 id, 즉 지금 있는 자리)별 문항수/제한시간(초). guitar_master는
// 승급 끝(다음 단계 없음)이라 항목 없음. quiz(코드맞추기)의 time은 실측 반응시간(레벨1~c2 avg/top30%/
// top10% 통계) 기반으로 확정(2026-08-27) — top30% 페이스 × 문항수 × 1.15버퍼를 5초 단위로 반올림.
// scale/combo의 time은 아직 미확정이라 null(안내페이지엔 "추후 안내"로 표시됨)
const MS_PROMO_TIER_TARGETS = {
  // combo(리하모니 화성학): 문제 수 7/10/15/15, 출제 레벨 = 리하모니 화성학 최신 문제(레벨이 여럿이면 문제를 고르게 나눠 종합 출제). 제한시간은 이전 문제 수 비율대로 늘림 — 합격은 정답 수 커트라인이 아니라 구간마다 하트 3개를 다 잃기 전에 끝까지 푸는 것
  unboxing:     { quiz: { total: 10, time: 30 }, scale: { total: 5, time: 100 }, combo: { total: 7,  time: 140, levels: ['2-8'] } },
  beginner:     { quiz: { total: 12, time: 45 }, scale: { total: 5, time: 120 }, combo: { total: 10, time: 285, levels: ['4-6'] } },
  sheet_reader: { quiz: { total: 15, time: 60 }, scale: { total: 5, time: 150 }, combo: { total: 15, time: 450, levels: ['5-6', '6-6'] } },
  home_master:  { quiz: { total: 15, time: 60 }, scale: { total: 5, time: 150 }, combo: { total: 15, time: 450, levels: ['5-6', '6-6', '7-6', '8-6'] } },
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
    <div class="ms-chord-tutorial ms-chord-tutorial--promo-info">
      <p class="ms-chord-lead ms-stagger-pending">하트 3개를 다 잃기 전에<br>끝까지 풀면 통과예요!</p>
      <div class="ms-promo-info-card ms-stagger-pending" id="ms-promo-info-card">
        ${_msPromoSections().map(s => `
          <div class="ms-promo-info-row">
            <i class="${s.icon}" style="color:${s.color}"></i>
            <span class="ms-promo-info-label">${s.title}</span>
            <span class="ms-promo-info-value">${s.total}문제</span>
          </div>
        `).join('')}
      </div>
      <p class="ms-chord-hint ms-stagger-pending">영역마다 제한시간이 있어요</p>
    </div>
    <div class="ms-bottom-actions">
      <button class="cd-btn cd-btn--brand ms-btn-pending" id="ms-promo-start-btn" onpointerup="msPersonaPromoStart()">시험 도전! <span id="ms-promo-attempts-badge">${_msPromoAttemptsBadgeHTML()}</span></button>
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
    '<span class="ms-desc-line ms-stagger-pending">하트 3개를 다 잃기 전에 끝까지 풀면 통과예요!</span>';
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial ms-chord-tutorial--promo-info">
      <p class="ms-chord-lead ms-stagger-pending">${sec.title} 시험 안내</p>
      <div class="ms-promo-info-card ms-stagger-pending" id="ms-promo-info-card">
        <div class="ms-promo-info-row">
          <span class="ms-promo-info-label">문항 수</span>
          <span class="ms-promo-info-value">${sec.total}문제</span>
        </div>
        <div class="ms-promo-info-row">
          <span class="ms-promo-info-label">기회</span>
          <span class="ms-promo-info-value">하트 3개</span>
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
      <button class="cd-btn cd-btn--brand ms-btn-pending" id="ms-promo-section-btn" onpointerup="msPersonaPromoSectionNext(${idx})">시작하기</button>
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
  _msPromoHeartsReset();
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
  _msPromoRealResults.quiz = { correct, total: _msExamSectionTotal, status: 'passed', wrong: MS_PROMO_MAX_HEARTS - _msPromoHearts };
  _msTrackPromoSectionResult('quiz', correct, _msExamSectionTotal);
  _msTransitionView(() => msShowPersonaPromoSection(1)); // 다음: 스케일 안내
}

// ── 스케일 섹션 실제 시작/종료 ──
function msPersonaPromoScaleStart(sec) {
  _msTrackPromoStage('scale');
  _msPromoHeartsReset();
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
  _msPromoRealResults.scale = { correct, total: _msExamSectionTotal, status: 'passed', wrong: MS_PROMO_MAX_HEARTS - _msPromoHearts };
  _msTrackPromoSectionResult('scale', correct, _msExamSectionTotal);
  _msTransitionView(() => msShowPersonaPromoSection(2)); // 다음: 조합 안내
}

// ── 조합 섹션 실제 시작/종료 (3영역 중 마지막 — 끝나면 최종 판정) ──
function msPersonaPromoComboStart(sec) {
  _msTrackPromoStage('combo');
  _msPromoHeartsReset();
  _msExamMode = true;
  _msExamSectionTotal   = sec.total;
  _msExamSectionTimeSec = sec.time;
  _msExamRecords = [];
  // 리하모니 화성학의 최신 문제 화면(chord-combo.js 엔진)을 그대로 쓴다 — 레벨이 여럿이면 문제를 고르게 나눠 종합 출제.
  // 화면 가운데 영역(타이틀+옛 문제 화면)은 숨기고 #ms-combo-stage를 보여준다.
  const main  = document.getElementById('main-content');
  const stage = document.getElementById('ms-combo-stage');
  if (main)  main.style.display = 'none';
  if (stage) stage.style.display = '';
  document.getElementById('mission-session-page')?.classList.add('ms-combo-active');   // 탑바 색을 리하모니 문제 화면 바탕과 맞춤
  const ok = comboV2ExamStart({
    levels: sec.levels,
    n: sec.total,
    onWrong: () => _msPromoLoseHeart(),   // 틀릴 때마다 하트 -1, 마지막 하트면 true(엔진이 다음에서 시험을 끝냄)
    onFail: (r) => {   // 하트 0개 — 지금까지 맞힌 수만 남기고 즉시 실패
      _msExamRecords = Array.from({ length: r.correct }, () => ({ isCorrect: true }));
      _msPromoHeartsOutFail();
    },
    onDone: (r) => {   // 끝까지 풀었을 때 — 맞은 수를 다른 구간과 같은 기록 형식으로
      _msExamRecords = Array.from({ length: sec.total }, (_, i) => ({ isCorrect: i < r.correct }));
      _msPromoComboHideStage();
      _msPromoComboSectionDone();
    },
  });
  if (!ok) { _msPromoComboHideStage(); return; }
  msPersonaPromoTimerStart(sec.time, msPersonaPromoTimeoutPopup);
}
// 조합 구간 화면 정리(멱등) — 완료·시간 초과 공용. 소리·드래그 등 문제 엔진 잔여물도 같이 끊는다.
function _msPromoComboHideStage() {
  if (typeof comboV2ExamStop === 'function') comboV2ExamStop();
  const main  = document.getElementById('main-content');
  const stage = document.getElementById('ms-combo-stage');
  if (stage) stage.style.display = 'none';
  if (main)  main.style.display = '';
  document.getElementById('mission-session-page')?.classList.remove('ms-combo-active');
}
// 시간 초과 — 지금까지 맞힌 수만 기록으로 남기고 화면을 정리(팝업이 이어서 결과를 확정)
function _msPromoComboAbortToRecords() {
  const correct = (typeof _comboV2Sess !== 'undefined' && _comboV2Sess && _comboV2Sess.exam) ? _comboV2Sess.correct : 0;
  _msExamRecords = Array.from({ length: correct }, () => ({ isCorrect: true }));
  _msPromoComboHideStage();
}
function _msPromoComboSectionDone() {
  msPersonaPromoTimerStop();
  _msExamMode = false;
  const correct = _msExamRecords.filter(r => r.isCorrect).length;
  _msPromoRealResults.combo = { correct, total: _msExamSectionTotal, status: 'passed', wrong: MS_PROMO_MAX_HEARTS - _msPromoHearts };
  _msTrackPromoSectionResult('combo', correct, _msExamSectionTotal);
  _msTransitionView(msPersonaPromoFinish);
}

// 지금까지 채점된 실제 결과(_msPromoRealResults)로 3영역 배열을 조립 — 아직 안 끝난/시작도
// 안 한 영역은 0개 맞음 처리. 정상완주(msPersonaPromoFinish)/시간초과(timeout) 양쪽에서 공용.
function _msPromoRealResultSections() {
  return _msPromoSections().map(s => ({
    ...s,
    correct: _msPromoRealResults[s.key]?.correct ?? 0,
    status: _msPromoRealResults[s.key]?.status ?? 'idle',   // passed / hearts / timeout / idle(도전 전)
    wrong: _msPromoRealResults[s.key]?.wrong ?? 0,
  }));
}

// 3영역 다 풀었을 때 최종 판정 — 실제 채점 결과(_msPromoRealResults) 기준, 전 영역 커트라인
// 통과해야 승급. 결과화면(성공/실패)에 넘길 배열도 여기서 만듦
function msPersonaPromoFinish() {
  const sections = _msPromoRealResultSections();
  const allPass = sections.every(s => s.status === 'passed');   // 세 영역 모두 하트를 다 잃기 전에 끝까지 풀었으면 승급
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
    // 검수용 목업 — 앞 두 영역은 통과(오답 1개/0개), 리하모니에서 하트를 모두 잃은 상태로 실패화면에서 상태가 섞여 보이게 함
    correct: s.key === 'combo' ? Math.max(0, s.total - 4) : s.total,
    status: s.key === 'combo' ? 'hearts' : 'passed',
    wrong: s.key === 'combo' ? MS_PROMO_MAX_HEARTS : (s.key === 'quiz' ? 1 : 0),
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
        key: s.key, correct: _msPromoRealResults[s.key]?.correct ?? null, total: s.total, status: _msPromoRealResults[s.key]?.status ?? null,
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
      <button class="cd-btn cd-btn--brand ms-btn-pending" id="ms-promo-success-btn" onpointerup="msPersonaPromoSuccessConfirm()">확인</button>
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
function msShowPersonaPromoFail(timedOut = false, resultOverride = null, heartsOut = false) {
  _msPromoActive = false; // 결과 도달 — pagehide 이탈로그 안 남게 끔
  msPersonaPromoTimerReset();
  const result = resultOverride || _msPromoMockResult();
  if (typeof analytics !== 'undefined') {
    analytics.track('persona_promo_finished', {
      result: 'fail', from_persona: _msPromoFromPersona, timed_out: timedOut, hearts_out: heartsOut,
      sections: result.map(s => ({ key: s.key, correct: s.correct, total: s.total, status: s.status, wrong: s.wrong })),
    });
  }
  document.getElementById('ms-title-text').textContent = '아쉬워요';
  _msSetTitleIcon('ph-fill ph-heart-break', '#D06A94');
  const promoFailDesc = document.getElementById('ms-title-desc');
  promoFailDesc.style.display = ''; // 문제풀이 화면(display:none)을 거쳐 돌아온 경우 대비
  // 첫 줄 = 어느 영역에서 어떻게 끝났는지(가장 크게 읽혀야 하는 것), 둘째 줄 = 격려
  const failedSec = result.find(s => s.status === 'hearts' || s.status === 'timeout');
  const failLine = !failedSec ? '이번엔 통과하지 못했어요'
    : failedSec.status === 'hearts' ? `${failedSec.title}에서 하트를 모두 잃었어요`
    : `${failedSec.title}에서 제한시간이 끝났어요`;
  promoFailDesc.innerHTML =
    `<span class="ms-desc-line">${failLine}</span>` +
    '<span class="ms-desc-line">괜찮아요, 다시 도전하면 돼요!</span>';
  const attemptsLeft = _msPromoAttemptsLeft(); // msPersonaPromoStart 시점에 이미 1회 소진 반영된 값
  document.getElementById('ms-main').innerHTML = `
    <div class="ms-chord-tutorial ms-chord-tutorial--promo-info">
      <p class="ms-chord-lead">영역별 결과예요</p>
      <div class="ms-promo-info-card" id="ms-promo-info-card">
        ${result.map(s => {
          // 영역 상태: 통과(오답 수) / 하트 소진 / 시간 초과 / 도전 전
          const view = s.status === 'passed' ? { icon: 'ph-fill ph-check-circle', color: '#3E9C6F', text: `통과 · ${s.wrong > 0 ? `오답 ${s.wrong}개` : '오답 없음'}` }
            : s.status === 'hearts' ? { icon: 'ph-fill ph-x-circle', color: '#D9534F', text: '하트를 모두 잃었어요' }
            : s.status === 'timeout' ? { icon: 'ph-fill ph-clock', color: '#D9534F', text: '시간 초과' }
            : { icon: 'ph-fill ph-circle', color: '#B5B0A8', text: '도전 전' };
          return `
          <div class="ms-promo-info-row">
            <i class="${view.icon}" style="color:${view.color}"></i>
            <span class="ms-promo-info-label">${s.title}</span>
            <span class="ms-promo-info-value" style="color:${view.color}">${view.text}</span>
          </div>`;
        }).join('')}
      </div>
      <p class="ms-chord-hint">${isPromoAttemptsUnlimited() ? '언제든 다시 도전할 수 있어요' : (attemptsLeft > 0 ? `오늘 ${attemptsLeft}번 더 도전할 수 있어요` : '오늘 도전 횟수를 다 썼어요')}</p>
    </div>
    <div class="ms-bottom-actions ms-result-btn-row">
      <button class="cd-btn cd-btn--gray ms-btn-pending" id="ms-promo-fail-later-btn" onpointerup="msPersonaPromoFailLater()">나중에</button>
      <button class="cd-btn cd-btn--brand ms-btn-pending" id="ms-promo-fail-retry-btn" onpointerup="msPersonaPromoFailRetry()">재도전 ${isPromoAttemptsUnlimited() ? '∞' : `${attemptsLeft}/${MS_PROMO_DAILY_ATTEMPTS}${attemptsLeft <= 0 ? ' <i class="ph-fill ph-play-circle"></i>' : ''}`}</button>
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
// ── 승급시험 남은 기회(하트 3개) ─────────────────────────────
// 구간(코드맞추기·스케일·리하모니)마다 3개로 새로 시작. 오답 1개당 1개를 잃고, 0개가 되는 순간 시험 전체가 실패 처리된다.
// 코드맞추기·리하모니는 틀린 문제 1개, 스케일은 완벽하지 않게 제출한 문제 1개가 오답.
// 마지막 하트를 잃은 문제는 정답/오답 확인을 보여 준 뒤(다음을 누르거나 피드백 시간이 지나면) 결과 화면으로 넘어간다.
const MS_PROMO_MAX_HEARTS = 3;
let _msPromoHearts = MS_PROMO_MAX_HEARTS;
let _msPromoHeartsOut = false;   // 하트를 모두 잃어 시험이 끝나야 하는 상태
function _msPromoHeartsRender(pop) {
  const box = document.getElementById('ms-promo-hearts');
  if (!box) return;
  box.hidden = false;
  box.querySelectorAll('.combo-v2-heart').forEach(function (h, i) {
    const lost = i >= _msPromoHearts;
    const was = h.classList.contains('is-lost');
    h.classList.toggle('is-lost', lost);
    if (pop && lost && !was && h.animate) h.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-in-out' });
  });
  box.setAttribute('aria-label', '남은 기회 ' + _msPromoHearts + '개');
}
function _msPromoHeartsReset() {
  _msPromoHearts = MS_PROMO_MAX_HEARTS;
  _msPromoHeartsOut = false;
  _msPromoHeartsRender(false);
}
function _msPromoHeartsHide() {
  const box = document.getElementById('ms-promo-hearts');
  if (box) box.hidden = true;
}
// 오답 1개 — 하트를 하나 잃는다. 마지막 하트였으면 true(시험 실패 확정)
function _msPromoLoseHeart() {
  if (_msPromoHearts > 0) _msPromoHearts--;
  _msPromoHeartsRender(true);
  if (_msPromoHearts <= 0) _msPromoHeartsOut = true;
  return _msPromoHeartsOut;
}
// 하트 0개 — 지금 구간까지 채점된 결과를 남기고 시험을 즉시 실패 처리
function _msPromoHeartsOutFail() {
  msPersonaPromoTimerStop();
  if (_msPromoLastStage === 'combo') _msPromoComboHideStage();
  if (['quiz', 'scale', 'combo'].includes(_msPromoLastStage) && !_msPromoRealResults[_msPromoLastStage]) {
    const correct = _msExamRecords.filter(r => r.isCorrect).length;
    _msPromoRealResults[_msPromoLastStage] = { correct, total: _msExamSectionTotal, status: 'hearts', wrong: MS_PROMO_MAX_HEARTS };
  }
  _msExamMode = false;
  const sections = _msPromoRealResultSections();
  _msTransitionView(() => msShowPersonaPromoFail(false, sections, true));
}

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
  // 빈 게이지에서 시작해 시험이 시작되는 순간 차오르게 — 갑자기 가득 찬 게이지가 나타나지 않도록
  fill.style.background = '';
  fill.style.width = '0%';
  void fill.offsetWidth;   // 0%를 먼저 확정해야 아래 100%가 트랜지션으로 차오름
  fill.style.width = '100%';
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
// 시험 카운트다운(3-2-1) 동안 탑바 게이지를 빈 채로 미리 보여 준다 — 시험이 시작될 때 msPersonaPromoTimerStart가 이 빈 게이지를 채움
function msPersonaPromoGaugeEmpty() {
  const track = document.querySelector('.ms-progress-track');
  const fill  = document.getElementById('ms-progress-fill');
  const label = document.getElementById('ms-progress-time');
  if (track) track.style.display = '';
  if (label) label.style.display = 'none';
  if (fill) { fill.style.background = ''; fill.style.width = '0%'; }
}
function msPersonaPromoTimerReset() {
  msPersonaPromoTimerStop();
  _msPromoHeartsHide();
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
  if (_msPromoLastStage === 'combo') _msPromoComboAbortToRecords();   // 조합 구간은 별도 문제 화면 — 맞힌 수만 남기고 정리
  // 질문 화면의 개별 스톱워치 RAF가 안 멈춘 채 계속 돌면 낭비라 여기서 같이 끊음
  if (_msQuizTimerRAF) { cancelAnimationFrame(_msQuizTimerRAF); _msQuizTimerRAF = null; }
  // 시간초과로 끊긴 섹션은 _msPromoQuizSectionDone류(정상완주 전용)를 못 거치므로
  // _msPromoRealResults에 값이 없어 결과화면에서 0개로 보임(2026-09 버그) — 지금까지
  // 채점된 만큼(_msExamRecords)을 여기서 대신 커밋
  if (['quiz', 'scale', 'combo'].includes(_msPromoLastStage) && !_msPromoRealResults[_msPromoLastStage]) {
    const correct = _msExamRecords.filter(r => r.isCorrect).length;
    _msPromoRealResults[_msPromoLastStage] = { correct, total: _msExamSectionTotal, status: 'timeout', wrong: MS_PROMO_MAX_HEARTS - _msPromoHearts };
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

  // 옛 데일리 미션(오늘 풀이·결산)은 폐지됨 — 이 페이지는 승급시험 전용. 그 외 진입은 홈으로
  location.replace('home.html');
});
