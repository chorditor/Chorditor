// ═══════════════════════════════════════════════════════════════
// scale-level.js — 스케일 레벨 개별 훈련 페이지
// ═══════════════════════════════════════════════════════════════
// ── 상수 ─────────────────────────────────────────────────────
const SCALE_TITLES = {
  'major':          '메이저 스케일',
  'pentatonic':     '마이너 펜타토닉 스케일',
  'blues':          '마이너 블루스 스케일',
  'natural-minor':  '내추럴 마이너 스케일',
  'harmonic-minor': '하모닉 마이너 스케일',
  'melodic-minor':  '멜로딕 마이너 스케일',
  'phrygian-dominant': '프리지안 도미넌트 스케일',
  'mixolydian-b9b13':  '믹솔리디안 b9 b13 스케일',
  'mixolydian-b13':    '믹솔리디안 9 b13 스케일',
  'lydian-dominant':   '리디안 도미넌트 스케일',
  'locrian-sharp2':    '로크리안 내추럴2 스케일',
  'locrian-sharp6':    '로크리안 내추럴6 스케일',
  'altered':           '얼터드 스케일',
  'mixolydian':     '믹솔리디안 스케일',
  'ionian':         '아이오니안 스케일',
  'dorian':         '도리안 스케일',
  'phrygian':       '프리지안 스케일',
  'lydian':         '리디안 스케일',
  'aeolian':        '에올리안 스케일',
  'locrian':        '로크리안 스케일',
};

const SCALE_SHORT_NAMES = {
  'major':          '메이저',
  'pentatonic':     '마이너 펜타토닉',
  'blues':          '마이너 블루스',
  'natural-minor':  '내추럴 마이너',
  'harmonic-minor': '하모닉 마이너',
  'melodic-minor':  '멜로딕 마이너',
  'phrygian-dominant': '프리지안 도미넌트',
  'mixolydian-b9b13':  '믹솔리디안 b9 b13',
  'mixolydian-b13':    '믹솔리디안 9 b13',
  'lydian-dominant':   '리디안 도미넌트',
  'locrian-sharp2':    '로크리안 내추럴2',
  'locrian-sharp6':    '로크리안 내추럴6',
  'altered':           '얼터드',
  'mixolydian':     '믹솔리디안',
  'ionian':         '아이오니안',
  'dorian':         '도리안',
  'phrygian':       '프리지안',
  'lydian':         '리디안',
  'aeolian':        '에올리안',
  'locrian':        '로크리안',
};

const FORM_NAMES       = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼'];
const FORM_NAMES_HM    = ['Gm폼', 'Em폼', 'Dm폼', 'Cm폼', 'Am폼'];
// Ch.2 secondary-iv: 원폼(bi) → 짝궁폼(bi) 매핑 (4도 메이저 전환)
const PAIR_PARTNER_BI  = { 0: 3, 1: 4, 2: 0, 3: 1, 4: 2 };
// bi별 짝궁폼의 startFret 오프셋 (짝궁_startFret = cur.startFret + offset)
// G폼(bi=1)↔C폼만 +1, 나머지는 동일
const PAIR_STARTFRET_OFFSET = { 1: 1 };

// Ch.2 secondary-v: 원폼(bi) → 짝궁폼(bi) 매핑 (5도 메이저 전환)
const PAIR_PARTNER_BI_V       = { 0: 2, 1: 3, 2: 4, 3: 0, 4: 1 };
// A↔E, G↔D, E↔C, D↔A, C↔G
const PAIR_STARTFRET_OFFSET_V = { 4: -1 };

// Ch.2 secondary-ii: major 원폼(bi) → harmonic-minor 짝궁폼(bi) 매핑 (6도 마이너 전환)
const PAIR_PARTNER_BI_II       = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }; // A폼↔Gm폼, G폼↔Em폼, E폼↔Dm폼, D폼↔Cm폼, C폼↔Am폼
const PAIR_STARTFRET_OFFSET_II = {};        // offset 없음 (같은 startFret)

// Ch.2 secondary-vi: major 원폼(bi) → harmonic-minor 짝궁폼(bi) 매핑 (2도 마이너 전환)
const PAIR_PARTNER_BI_VI       = { 0: 3, 1: 4, 2: 0, 3: 1, 4: 2 }; // A↔Cm, G↔Am, E↔Gm, D↔Em, C↔Dm
const PAIR_STARTFRET_OFFSET_VI = { 1: 1 };  // G폼↔Am폼: Am폼 startFret = G폼 + 1

// Ch.2 secondary-iii: major 원폼(bi) → natural-minor 짝궁폼(bi) 매핑 (내추럴 마이너 전환)
const PAIR_PARTNER_BI_III       = { 0: 4, 1: 0, 2: 1, 3: 2, 4: 3 }; // A↔Am, G↔Gm, E↔Em, D↔Dm, C↔Cm
const PAIR_STARTFRET_OFFSET_III = { 0: 1, 1: 1, 3: 1 };  // A폼↔Am폼, G폼↔Gm폼, D폼↔Dm폼: 짝궁 startFret = 원폼 + 1

// Ch.2 secondary-iii(E 하모닉 마이너): 메이저 폼에서 2→#2, 4→#4 슬라이드 후 하모닉마이너 폼 모양에 맞추기 위한 폼별 델타.
//   spawn : 슬라이드 후 새로 생성할 dot  { s, off(=absF-startFret), degree }
//   remove: 슬라이드 후 제거할 dot        { s, off } — 원래 major degree도 함께 기록(역전환 복구용)
// 폼별 값은 사용자 지정으로 채운다. (bi: 0=A,1=G,2=E,3=D,4=C 폼)
// 전환 후 폼 라벨에 표시할 하모닉마이너 폼 이름 (major bi → HM 폼명). 사용자 지정대로 채운다.
const SECONDARY_III_FORM_NAME = { 0: 'Dm폼', 1: 'Cm폼', 2: 'Am폼', 3: 'Gm폼', 4: 'Em폼' };

// spawn : { s, off, degree }                       — 슬라이드 후 생성
// remove: { s, off, backOff, backDeg }              — 슬라이드 후 제거 / 역전환 시 backOff·backDeg로 복구
const SECONDARY_III_DELTA = {
  0: { // A폼 → E 하모닉 마이너 Dm폼
    spawn: [
      { s: 0, off: 1, degree: '#4' },  // 1번줄: 5(+2) 왼쪽
      { s: 5, off: 1, degree: '#4' },  // 6번줄: 5(+2) 왼쪽
    ],
    remove: [
      { s: 1, off: 6, backOff: 5, backDeg: '4' },  // 2번줄: 슬라이드된 #4 제거
    ],
  },
  1: { // G폼 → E 하모닉 마이너 Cm폼
    spawn: [
      { s: 3, off: 1, degree: '#4' },  // 4번줄: 5(+2) 왼쪽
    ],
    remove: [
      { s: 0, off: 5, backOff: 5, backDeg: '1' },  // 1번줄: 근음 제거
      { s: 4, off: 6, backOff: 5, backDeg: '4' },  // 5번줄: 슬라이드된 #4 제거
    ],
  },
  2: { // E폼 → E 하모닉 마이너 Am폼
    spawn: [
      { s: 1, off: 1, degree: '#4' },  // 2번줄: 5(+2) 왼쪽
    ],
    remove: [
      { s: 2, off: 5, backOff: 4, backDeg: '4' },  // 3번줄: 슬라이드된 #4 제거
    ],
  },
  3: { // D폼 → E 하모닉 마이너 Gm폼
    spawn: [
      { s: 4, off: 1, degree: '#4' },  // 5번줄: 5(+2) 왼쪽
    ],
    remove: [
      { s: 5, off: 6, backOff: 5, backDeg: '4' },  // 6번줄: 슬라이드된 #4 제거
    ],
  },
  4: { // C폼 → E 하모닉 마이너 Em폼
    spawn: [
      { s: 0, off: 0, degree: '#2' },  // 1번줄: 3(+1) 왼쪽
      { s: 2, off: 0, degree: '#4' },  // 3번줄: 5(+1) 왼쪽
      { s: 5, off: 0, degree: '#2' },  // 6번줄: 3(+1) 왼쪽
    ],
    remove: [
      { s: 1, off: 5, backOff: 4, backDeg: '2' },  // 2번줄: 슬라이드된 #2 제거
      { s: 3, off: 5, backOff: 4, backDeg: '4' },  // 4번줄: 슬라이드된 #4 제거
    ],
  },
};

const KEY_NAMES        = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const STRINGS          = 6;
const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19]);
const DOUBLE_DOT_FRETS = new Set([12]);

// ── 메인 연습용 지판 "사진 확대" 스케일 시스템 ──────────────────
// 360px 기준으로 딱 한 번 고정 디자인을 만들고(--fbu 상수화, style.css .fretboard-row 참고),
// 실제 화면에 맞는 배율만 계산해서 transform:scale로 통째로 확대/축소한다.
// 프렛 이동도 이 기준좌표계 안에서 translateX로 처리(scale과 합성되어 자동으로 비율 유지됨).
const FB_REF_WIDTH      = 360;
const FB_ARROW_W        = 44;
const FB_EDGE_FADE_MIN   = 24; // peek 없는 스코프(모바일)용 최소 페이드 폭(px)
const FB_RATIO          = 2.3;
const FB_REF_SPAN       = (FB_REF_WIDTH - 2 * FB_ARROW_W) / FB_RATIO;   // ≈125.22
const FB_REF_NECK_H     = (FB_REF_SPAN - 2.25) * 6 / 5;                 // ≈147.57
const FB_REF_FBU        = FB_REF_NECK_H / 160;                          // ≈0.9223
const FB_REF_NUMS_GAP   = 6 * FB_REF_FBU;
const FB_REF_NUMS_H     = 22 * FB_REF_FBU;
const FB_REF_TOTAL_H    = FB_REF_NECK_H + FB_REF_NUMS_GAP + FB_REF_NUMS_H;
const FB_REF_VIEWPORT_W = FB_REF_SPAN * FB_RATIO;                       // 7프렛 창 폭(기준좌표계)
const FB_REF_FULL_W     = FB_REF_VIEWPORT_W * (TOTAL_FRETS / FRETS_VISIBLE);

let _fbScale       = 1;
let _fbPanRef       = 0; // 현재 translateX 값(기준좌표계 px)
let _fbLastFret     = 0;
let _fbAnimId       = null; // 진행 중인 scrollToFret rAF id — 연타 시 이전 루프와 충돌 방지용

// 반복 조회되는 지판 엘리먼트 캐시 — .fretboard-row는 이 페이지에 1개뿐이라 매번 querySelector할
// 필요 없음(성능 최적화, 2026-09-25). renderFullNeck()에서 1회 채워짐.
let _fbEls = null;

function computeFbScale() {
  const rowWidth = _fbEls ? _fbEls.row.clientWidth : FB_REF_WIDTH;
  const widthBudget = Math.min((rowWidth * 0.8) / FB_RATIO, 480 / FB_RATIO); // fb-viewport 실제 폭 = 화면(row) 폭의 80%, 최대 480px 고정캡(480/ratio로 나눠 span 단위로 환산)
  return Math.max(widthBudget / FB_REF_SPAN, 0.01);
}

// 좌우 "고스트 프렛" peek 폭(실 px) — fretboard-row 안에서 화살표버튼 2개 + 실제 7프렛 뷰포트를
// 뺀 나머지(좌우 각각)가 40px 이상일 때만, 그 남는 공간 전체를 peek로 씀. 그 미만이면 0(기존과 동일).
function computeFbPeek(scale) {
  const rowWidth = _fbEls ? _fbEls.row.clientWidth : FB_REF_WIDTH;
  const innerW = FB_REF_VIEWPORT_W * scale;
  const slackEachSide = (rowWidth - 2 * FB_ARROW_W - innerW) / 2;
  return slackEachSide >= 40 ? slackEachSide : 0;
}

// 무거운 쪽 — 배율/뷰포트 크기/마스크/화살표 위치를 처음부터 다시 계산.
// 컨테이너 실폭이 바뀔 수 있는 시점(초기 로드·리사이즈·즉시 점프)에만 호출.
// 팬 애니메이션 매 프레임 호출 금지 — clientWidth 강제 리플로우가 여러 번 걸려 프레임 드랍의 원인이었음(2026-09-25).
function applyFbLayout() {
  _fbScale = computeFbScale();
  const { viewport, inner, blockerL, blockerR } = _fbEls;

  const innerW = FB_REF_VIEWPORT_W * _fbScale;
  const innerH = FB_REF_TOTAL_H * _fbScale;
  const peekPx = computeFbPeek(_fbScale);

  if (inner) {
    inner.style.width  = innerW + 'px';
    inner.style.height = innerH + 'px';
  }
  if (viewport) {
    viewport.style.width  = (innerW + 2 * peekPx) + 'px';
    viewport.style.height = innerH + 'px';
    // 고스트 peek 구간 페이드 — 양옆 peekPx만큼 투명→불투명, 가운데(실제 7프렛)는 항상 불투명.
    // peek가 없는 스코프(모바일 등, peekPx=0)도 클리핑 경계가 딱 잘려보이지 않게 아주 작은
    // 고정폭(FB_EDGE_FADE_MIN)으로 페이드 — 양옆 프렛이 살짝 있다는 느낌만 최소로 남김.
    const fadePx = peekPx > 0 ? peekPx : FB_EDGE_FADE_MIN;
    const mask = `linear-gradient(to right, transparent, black ${fadePx}px, black calc(100% - ${fadePx}px), transparent)`;
    viewport.style.maskImage = mask;
    viewport.style.webkitMaskImage = mask;
  }
  if (blockerL) blockerL.style.width = peekPx + 'px';
  if (blockerR) blockerR.style.width = peekPx + 'px';

  // 화살표 버튼 — 실제(스케일 적용된) 넥 높이 기준 세로중앙 정렬
  const realNeckH = FB_REF_NECK_H * _fbScale;
  const arrowMarginTop = Math.max((realNeckH - 44) / 2, 0) + 'px';
  _fbEls.arrowPrev?.style.setProperty('margin-top', arrowMarginTop);
  _fbEls.arrowNext?.style.setProperty('margin-top', arrowMarginTop);

  applyFbPan(); // 배율이 바뀌었으니 transform도 같이 갱신
}

// 가벼운 쪽 — transform 한 줄만 갱신. scrollToFret() 팬 애니메이션의 매 프레임이 이걸 호출.
function applyFbPan() {
  if (!_fbEls || !_fbEls.wrapper) return;
  // scale이 먼저(오른쪽) 적용돼야 translateX가 기준좌표계 값 그대로 유지되면서
  // 전체(이동분 포함)가 한 배율로 같이 확대/축소됨 — 순서 바뀌면 이동량이 배율 영향을 안 받음
  _fbEls.wrapper.style.transform = `scale(${_fbScale}) translateX(${_fbPanRef}px)`;
}

function initFbScaleResize() {
  window.addEventListener('resize', () => {
    applyFbLayout();
    updateScaleGapScrollMode();
    alignMicBtnRowToDesc();
    if (document.getElementById('scale-test-overlay')?.classList.contains('is-open')) {
      applyTestFbLayout();
    }
  });
}

// ── 테스트 화면 지판 "사진 확대" 스케일 시스템 (2026-09-25) ──────────────
// 진입화면(.fretboard-row)과 같은 원리지만 화살표 버튼이 없어서 그 폭을 안 빼고,
// 전체 폭을 그리드 컬럼 처음~끝(style.css #test-fb-viewport 부근)에 그대로 씀 —
// 80%/480px 같은 비율·캡 없이 컨테이너 실측폭을 그대로 스케일 기준으로 삼음.
const TEST_FB_REF_WIDTH    = 360;
const TEST_FB_RATIO        = 2.3;
const TEST_FB_REF_SPAN     = TEST_FB_REF_WIDTH / TEST_FB_RATIO;
const TEST_FB_REF_NECK_H   = (TEST_FB_REF_SPAN - 2.25) * 6 / 5;
const TEST_FB_REF_NUMS_GAP = 6 * (TEST_FB_REF_NECK_H / 160);
const TEST_FB_REF_NUMS_H   = 22 * (TEST_FB_REF_NECK_H / 160);
const TEST_FB_REF_TOTAL_H  = TEST_FB_REF_NECK_H + TEST_FB_REF_NUMS_GAP + TEST_FB_REF_NUMS_H;

const TEST_FB_MAX_WIDTH = 520; // 실측 후 확정된 최대 크기 캡(2026-09-25)

function computeTestFbScale() {
  const wrap = document.querySelector('.scale-test-fb-wrap');
  if (!wrap) return 1;
  // clientWidth엔 .scale-test-fb-wrap 자신의 padding-inline(그리드 마진)이 포함돼있어서
  // 그대로 쓰면 패딩 영역까지 지판 크기에 넣어버림 — 실제 콘텐츠 폭만 빼서 써야 함
  const style = getComputedStyle(wrap);
  const rowWidth = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const cappedWidth = Math.min(rowWidth, TEST_FB_MAX_WIDTH);
  return Math.max(cappedWidth / TEST_FB_REF_WIDTH, 0.01);
}

function applyTestFbLayout() {
  const scale    = computeTestFbScale();
  const viewport = document.getElementById('test-fb-viewport');
  const wrapper  = document.getElementById('test-fb-full-wrapper');
  if (viewport) {
    viewport.style.width  = (TEST_FB_REF_WIDTH * scale) + 'px';
    viewport.style.height = (TEST_FB_REF_TOTAL_H * scale) + 'px';
  }
  if (wrapper) wrapper.style.transform = `scale(${scale})`;
}

// scale-mic-btn-row 폭 — scale-mic-desc(fit-content, 더 넓은 줄 기준) 텍스트 폭과
// 버튼 3개 최소필요폭(버튼 크기 고정, flex-shrink:0) 중 더 큰 쪽을 사용.
// 텍스트가 넓으면 텍스트 좌측경계에 맞춰 정렬, 버튼최소폭이 더 넓으면(텍스트가 짧을 때)
// wrap 안에서 버튼row를 가운데 정렬 — 버튼 크기는 항상 고정, 줄어들거나 넘치지 않음.
// scale-mic-desc/scale-mic-btn-row는 이제 CSS 리터럴 고정폭(188px/1080px~260px, 2026-09-26)이라
// 여기선 같은 그룹의 .start-test-btn 폭만 그 값에 맞춰 동기화(이 버튼은 다른 그룹이라 CSS
// align-items:center 자동정렬 대상이 아니라서 JS로 직접 맞춰야 함).
function alignMicBtnRowToDesc() {
  const startTestBtn = document.getElementById('start-test-btn');
  if (!startTestBtn) return;
  const width = window.matchMedia('(min-width: 769px)').matches ? 200 : 188;
  startTestBtn.style.width = width + 'px';
}

// ── 그룹1~4 간격 30px 미만 → 스크롤모드(40px 고정 gap) 전환 ──────────────────
// space-between이 실제로 만들 gap을 현재 모드와 무관하게 역산: main-content
// 가용높이에서 4그룹 자체 높이(스크롤모드 여부와 무관하게 고정) 빼진 값을 3등분.
function updateScaleGapScrollMode() {
  const layout = document.querySelector('.scale-level-layout');
  const mainContent = document.querySelector('.main-content');
  const groups = [
    document.querySelector('.scale-level-top'),
    document.querySelector('.scale-mic-wrap'),
    document.querySelector('.scale-test-btn-group'),
    document.querySelector('.key-selector-section'),
  ];
  if (!layout || !mainContent || groups.some(g => !g)) return;
  const sumH = groups.reduce((sum, g) => sum + g.offsetHeight, 0);
  const naturalGap = (mainContent.clientHeight - sumH) / 3;
  layout.classList.toggle('scale-gap-scroll', naturalGap < 30);
}

// ── 상태 ─────────────────────────────────────────────────────
let _scaleKey  = 'major';
let _scaleLevel = 0; // 레벨 첫완료 퀘스트용 (URL level 파라미터)
let _rootNote  = 0;
let _navIdx    = 0;
let _useFlat   = false;
let _showDegrees = false;
let _testItem    = null;        // 테스트 현재 아이템 { block, bi, startFret }
let _testHint      = null;        // 힌트 위치 { s, col } — 미리 찍어두는 dot 표시
let _placedNotes   = new Set();   // 플레이어가 찍은 dot: "s,col" 문자열의 Set
let _testSubmitted = false;       // 제출 후 입력 방지 플래그
let _tutorialMode  = false;       // "?" 버튼 튜토리얼 오버레이(2026-09-25) — 테스트 오버레이 재사용 중
// shared.js 사이드바 네비 이탈 확인용 — 테스트 오버레이 열려있고 미제출일 때만 확인(튜토리얼은 피크 소모가
// 없어서 이탈 확인 자체가 불필요 — 제외)
window._leaveGuardActive = () =>
  !!document.getElementById('scale-test-overlay')?.classList.contains('is-open') && !_testSubmitted && !_tutorialMode;

let _scaleSessionStart = 0; // 페이지 진입 시각 (훈련 시간 측정)

// ── Audio Engine (Karplus-Strong) ───────────────────────────
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E B G D A E (string 0=1번줄)

function playScaleNote(stringIdx, absFret) {
  GuitarAudio.stop();
  GuitarAudio.playNote(OPEN_MIDI[stringIdx] + absFret, 2.5);
}

// ── 재생 버튼: 현재 블럭 낮은음→높은음→(근음 아니면 가장 가까운 근음까지 재상행) ──
const SCALE_PLAY_NOTE_MS = 380;
let _scalePlayTimer = null;

function _getCurrentScaleNotesAsc() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return [];
  const notes = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')].map(el => {
    const s = parseInt(el.dataset.s);
    const absF = parseInt(el.dataset.absf);
    return { el, s, absF, degree: el.dataset.degree, midi: OPEN_MIDI[s] + absF };
  });
  notes.sort((a, b) => a.midi - b.midi);
  return notes;
}

function buildScalePlaySequence() {
  const asc = _getCurrentScaleNotesAsc();
  if (asc.length === 0) return [];
  // 낮은음 → 높은음 → 다시 낮은음(정점 중복 방지 위해 slice(0,-1))
  const seq = asc.concat(asc.slice(0, -1).reverse());
  // 도착점(가장 낮은음)이 근음이 아니면, 가장 가까운 근음까지 재상행
  if (asc[0].degree !== '1') {
    const rootIdx = asc.findIndex((n, i) => i > 0 && n.degree === '1');
    if (rootIdx > 0) seq.push(...asc.slice(1, rootIdx + 1));
  }
  return seq;
}

function stopScalePlay() {
  clearTimeout(_scalePlayTimer);
  _scalePlayTimer = null;
  document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
  GuitarAudio.stop();
  document.getElementById('scale-play-btn')?.classList.remove('is-active');
}

function startScalePlay() {
  const seq = buildScalePlaySequence();
  if (seq.length === 0) return;
  stopScaleMic(); // 마이크 모드 켜져있었으면 즉시 중단
  document.getElementById('scale-play-btn')?.classList.add('is-active');

  let i = 0;
  const step = () => {
    document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
    if (i >= seq.length) { stopScalePlay(); return; }
    const note = seq[i];
    const isLast = i === seq.length - 1;
    note.el.classList.add('fb-note--playing');
    playScaleNote(note.s, note.absF);
    i++;
    _scalePlayTimer = setTimeout(step, isLast ? SCALE_PLAY_NOTE_MS * 4 : SCALE_PLAY_NOTE_MS);
  };
  step();
}

function toggleScalePlay() {
  if (_scalePlayTimer) stopScalePlay();
  else startScalePlay();
}

// ── 마이크 버튼: 같은 시퀀스를 실제 연주로 검증하며 진행 ──
// 자기상관(autocorrelation) 단음 피치검출 — 사운드인식테스트.html 스케일연습에서 검증된 방식 재사용
function _scaleAutoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const thresh = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thresh) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thresh) { r2 = SIZE - i; break; }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;

  const c = new Array(n).fill(0);
  for (let lag = 0; lag < n; lag++)
    for (let i = 0; i < n - lag; i++) c[lag] += trimmed[i] * trimmed[i + lag];

  let d = 0;
  while (d + 1 < n && c[d] > c[d + 1]) d++;
  let maxVal = -1, maxPos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  let T0 = maxPos;
  if (T0 <= 0) return -1;

  const x1 = c[T0 - 1] ?? c[T0], x2 = c[T0], x3 = c[T0 + 1] ?? c[T0];
  const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return T0 > 0 ? sampleRate / T0 : -1;
}
function _scaleFreqToMidi(f) { return Math.round(69 + 12 * Math.log2(f / 440)); }

let _scaleMicStream = null, _scaleMicCtx = null, _scaleMicAnalyser = null, _scaleMicRaf = null;
let _scaleMicTimeBuf = null, _scaleMicLastTrigger = 0;
const SCALE_MIC_ONSET_RMS = 0.01, SCALE_MIC_COOLDOWN = 120;
let _scaleMicSeq = [];
let _scaleMicStepIdx = 0;

function _scaleMicHighlightExpected() {
  document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
  const note = _scaleMicSeq[_scaleMicStepIdx];
  if (note) note.el.classList.add('fb-note--playing');
}

function _scaleMicAdvance() {
  _scaleMicStepIdx++;
  if (_scaleMicStepIdx >= _scaleMicSeq.length) {
    _finishScaleMicSequence();
    return;
  }
  _scaleMicHighlightExpected();
}

function _scaleMicClassify() {
  if (!_scaleMicAnalyser) return;
  _scaleMicAnalyser.getFloatTimeDomainData(_scaleMicTimeBuf);
  const freq = _scaleAutoCorrelate(_scaleMicTimeBuf, _scaleMicCtx.sampleRate);
  if (freq < 0) return;
  const detectedMidi = _scaleFreqToMidi(freq);
  const expected = _scaleMicSeq[_scaleMicStepIdx];
  if (!expected) return;
  if (detectedMidi === expected.midi) {
    _scaleMicLastTrigger = performance.now();
    _scaleMicAdvance();
  }
}

function _scaleMicListen() {
  _scaleMicAnalyser.getFloatTimeDomainData(_scaleMicTimeBuf);
  let sum = 0;
  for (let i = 0; i < _scaleMicTimeBuf.length; i++) sum += _scaleMicTimeBuf[i] * _scaleMicTimeBuf[i];
  const rms = Math.sqrt(sum / _scaleMicTimeBuf.length);
  const now = performance.now();
  if (rms > SCALE_MIC_ONSET_RMS && now - _scaleMicLastTrigger > SCALE_MIC_COOLDOWN) {
    _scaleMicClassify();
  }
  _scaleMicRaf = requestAnimationFrame(_scaleMicListen);
}

let _scaleMicDescIdleHtml = null;
function _setScaleMicDescActive(active) {
  const el = document.getElementById('scale-mic-desc');
  if (!el) return;
  if (active) {
    if (_scaleMicDescIdleHtml === null) _scaleMicDescIdleHtml = el.innerHTML;
    el.innerHTML = '<div class="scale-mic-desc-row"><span class="scale-mic-desc-text">표시된 음을 직접 기타로 소리내보세요</span></div>';
  } else if (_scaleMicDescIdleHtml !== null) {
    el.innerHTML = _scaleMicDescIdleHtml;
  }
}

async function startScaleMic() {
  _scaleMicSeq = buildScalePlaySequence();
  if (_scaleMicSeq.length === 0) return;
  stopScalePlay();
  try {
    _scaleMicStream = await navigator.mediaDevices.getUserMedia({
      audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false }
    });
    _scaleMicCtx = new (window.AudioContext || window.webkitAudioContext)();
    _scaleMicAnalyser = _scaleMicCtx.createAnalyser();
    _scaleMicAnalyser.fftSize = 2048;
    _scaleMicCtx.createMediaStreamSource(_scaleMicStream).connect(_scaleMicAnalyser);
    _scaleMicTimeBuf = new Float32Array(_scaleMicAnalyser.fftSize);
    _scaleMicStepIdx = 0;
    document.getElementById('scale-mic-btn')?.classList.add('is-active');
    _setScaleMicDescActive(true);
    _scaleMicHighlightExpected();
    _scaleMicListen();
  } catch (e) {
    console.error('마이크 권한 거부됨 또는 사용 불가:', e);
  }
}

function _teardownScaleMic() {
  if (_scaleMicRaf) { cancelAnimationFrame(_scaleMicRaf); _scaleMicRaf = null; }
  if (_scaleMicStream) _scaleMicStream.getTracks().forEach(t => t.stop());
  if (_scaleMicCtx) { _scaleMicCtx.close(); _scaleMicCtx = null; }
  _scaleMicStream = null; _scaleMicAnalyser = null;
  document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
  document.getElementById('scale-mic-btn')?.classList.remove('is-active');
}

function stopScaleMic() {
  _teardownScaleMic();
  _setScaleMicDescActive(false);
}

// 시퀀스를 끝까지 성공적으로 마쳤을 때 — 완료 문구를 잠깐 보여준 뒤 idle로 복귀
function _finishScaleMicSequence() {
  _teardownScaleMic();
  const el = document.getElementById('scale-mic-desc');
  if (el) el.innerHTML = '<div class="scale-mic-desc-row"><span class="scale-mic-desc-text">완료! 잘하셨어요.</span></div>';
  setTimeout(() => _setScaleMicDescActive(false), 1500);
}

function toggleScaleMic() {
  if (_scaleMicStream) stopScaleMic();
  else startScaleMic();
}

// ── 정답/오답 효과음 (chord-name-quiz.js playSound 이식) ─────
let _quizAudioCtx = null;
let _quizSfxMaster = null; // 설정>사운드 마스터 볼륨용 최종 게인(엔벨로프 뒤 → 낮은 볼륨서도 클릭 없음)
function _getQuizAudioCtx() {
  if (!_quizAudioCtx) _quizAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_quizAudioCtx.state === 'suspended') _quizAudioCtx.resume();
  return _quizAudioCtx;
}
function _getQuizSfxBus(ctx) {
  if (!_quizSfxMaster) {
    _quizSfxMaster = ctx.createGain();
    _quizSfxMaster.connect(ctx.destination);
  }
  _quizSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _quizSfxMaster;
}
function _playQuizBell(freq, startDelay, gainVal) {
  try {
    const ctx = _getQuizAudioCtx();
    const t   = ctx.currentTime + startDelay;
    const bus = _getQuizSfxBus(ctx); // 마스터 볼륨 일괄(엔벨로프 원형 유지)
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
function playQuizSound(type) {
  if (type === 'correct') {
    _playQuizBell(523.25, 0,    0.20);
    _playQuizBell(698.46, 0.13, 0.20);
  } else if (type === 'wrong') {
    _playQuizBell(349.23, 0,    0.20);
    _playQuizBell(261.63, 0.13, 0.20);
  }
}

// ── 내비게이션 시퀀스 생성 ──────────────────────────────────
// 모든 block 및 position을 순서대로 정렬
// 諛섑솚: [{ block, bi, startFret }, ...]
function buildNavSequence() {
  // Ch.2: secondary-iv / secondary-v / secondary-ii 는 major 블럭 사용
  const blockKey = (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') ? 'major' : _scaleKey;
  const blocks = ScaleData.getBlocks(blockKey);
  const seq = [];
  blocks.forEach((block, bi) => {
    const startFrets = ScaleData.getStartFrets(block, _rootNote);
    startFrets.forEach(sf => {
      // secondary-iii: 전환 타겟(슬라이드+spawn) dot이 하나라도 유효범위(0~22) 밖이면 블럭 자체 제외
      if (_scaleKey === 'secondary-iii' && !_secondaryIIITargetFits(block, bi, sf)) return;
      seq.push({ block, bi, startFret: sf });
    });
  });
  // startFret 오름차순 정렬 — 키 이동 시 순서대로
  seq.sort((a, b) => a.startFret - b.startFret);
  return seq;
}

// secondary-iii: 전환 타겟(shifted-major + spawn − remove) 모든 dot이 [0, TOTAL_FRETS) 안에 드는지
function _secondaryIIITargetFits(majorBlock, bi, sf) {
  const delta   = SECONDARY_III_DELTA[bi] || { spawn: [], remove: [] };
  const removeK = new Set(delta.remove.map(r => r.s + ',' + r.off));
  const inRange = absF => absF >= 0 && absF < TOTAL_FRETS;
  const notes   = ScaleData.parseGrid(majorBlock.grid).notes;
  for (const n of notes) {
    const col = (n.degree === 2 || n.degree === 4) ? n.col + 1 : n.col;  // 2→#2, 4→#4 (+1)
    if (removeK.has(n.s + ',' + col)) continue;                          // 제거 대상은 무시
    if (!inRange(sf + col)) return false;
  }
  for (const sp of delta.spawn) {
    if (!inRange(sf + sp.off)) return false;
  }
  return true;
}

// ── 페이지 초기화 ────────────────────────────────────────────

// ================================================================
// Ch.2 C폼 -> E폼 전환 애니메이션
// ================================================================
let _transitioning = false;
let _pairTransitioned = false; // 전환 버튼으로 짝궁 폼으로 이동한 상태
let _instantPair = false;      // 즉시 전환(블럭 이동 시 상태 복원): spawn/root-pop/슬라이드 애니메이션 억제
let _pairPersist = false;      // 사용자가 마지막으로 선택한 전환 상태 — 블럭 이동해도 유지 (Ch.2 전체)

// Ch.2: 현재 _pairTransitioned 상태 기준으로 파트너 블럭을 ghost로 렌더
// _pairTransitioned=false → 파트너폼(전환 대상) ghost 표시
// _pairTransitioned=true  → 원래폼(복구 대상) ghost 표시
function _refreshSecondaryGhost() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;
  neckEl.querySelectorAll('.fb-note--ghost').forEach(el => el.remove());

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;

  const isV        = _scaleKey === 'secondary-v';
  const isII       = _scaleKey === 'secondary-ii';
  const isVI       = _scaleKey === 'secondary-vi';
  const isIII      = _scaleKey === 'secondary-iii';

  // secondary-iii: 전환 대상 ghost = 같은 major 폼에서 2→#2·4→#4(+1프랫) 슬라이드 + 폼별 델타(spawn/remove)
  // 전환 후 ghost = 순정 major(복구 대상)
  if (isIII) {
    const firstReal = neckEl.querySelector('.fb-note:not(.fb-note--ghost)');
    const addGhost  = (s, absF, deg) => {
      if (absF < 0 || absF >= TOTAL_FRETS) return;
      neckEl.insertBefore(createNoteEl(absF, s, deg, true), firstReal || null);
    };
    if (_pairTransitioned) {
      // 복구 대상 = 순정 major
      const mj = ScaleData.getBlocks('major')[cur.bi];
      if (mj) ScaleData.parseGrid(mj.grid).notes.forEach(n => addGhost(n.s, cur.startFret + n.col, n.degree));
      return;
    }
    // 전환 대상 = 하모닉마이너 폼 모양
    const mj = ScaleData.getBlocks('major')[cur.bi];
    if (!mj) return;
    const delta   = SECONDARY_III_DELTA[cur.bi] || { spawn: [], remove: [] };
    const removeK = new Set(delta.remove.map(r => r.s + ',' + r.off));
    ScaleData.parseGrid(mj.grid).notes.forEach(n => {
      let col = n.col, deg = n.degree;
      if (n.degree === 2 || n.degree === 4) { col = n.col + 1; deg = n.degree === 2 ? '#2' : '#4'; }
      if (removeK.has(n.s + ',' + col)) return;   // 델타 제거 대상
      addGhost(n.s, cur.startFret + col, deg);
    });
    delta.spawn.forEach(sp => addGhost(sp.s, cur.startFret + sp.off, sp.degree));
    return;
  }

  const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isIII ? PAIR_PARTNER_BI_III : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
  const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isIII ? PAIR_STARTFRET_OFFSET_III : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
  const offset     = offsetMap[cur.bi] || 0;
  const ghostStartFret = _pairTransitioned ? cur.startFret : cur.startFret + offset;
  const ghostBi    = _pairTransitioned ? cur.bi : partnerMap[cur.bi];
  // secondary-ii/vi/iii: 전환 전=partner ghost, 전환 후=major ghost
  const ghostScaleKey = (isII || isVI) ? (_pairTransitioned ? 'major' : 'harmonic-minor')
                      : isIII ? (_pairTransitioned ? 'major' : 'natural-minor')
                      : 'major';
  const ghostBlock = ScaleData.getBlocks(ghostScaleKey)[ghostBi];
  if (!ghostBlock) return;

  const parsed    = ScaleData.parseGrid(ghostBlock.grid);
  const firstReal = neckEl.querySelector('.fb-note:not(.fb-note--ghost)');
  parsed.notes.forEach(note => {
    const absF = ghostStartFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    neckEl.insertBefore(createNoteEl(absF, note.s, note.degree, true), firstReal || null);
  });
}

// secondary-iii E 하모닉 마이너 전환 전용 도수 재표기 (C-major degree → minor degree)
// 3→1, #4→2, 5→b3, 6→4, 7→5, 1→b6, #2→7. dataset.degree는 건드리지 않음(역전환 매칭용).
const HM_III_MAP = { '3': 1, '#4': 2, '5': -3, '6': 4, '7': 5, '1': -6, '#2': 7 };
function _relabelSecondaryIIIAsHM(neckEl) {
  neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
    const nd = HM_III_MAP[el.dataset.degree];
    if (nd === undefined) return;
    const wasRoot = el.classList.contains('fb-note--root');
    el.classList.toggle('fb-note--root', nd === 1);
    if (nd === 1 && !wasRoot && !_instantPair) {   // 새로 근음이 된 노트: 다른 전환과 동일한 pop 애니메이션
      el.classList.add('fb-note--root-pop');
      setTimeout(() => el.classList.remove('fb-note--root-pop'), 400);
    }
    _setNoteDegreeLabel(el, nd);
  });
}

// 전환 완료 공통 마무리 — 상태 저장 + 버튼 라벨 + 폼 라벨 + ghost 갱신 + 뷰포트 + 잠금 해제
function _finishTransition(forward) {
  _pairTransitioned = forward;
  // 전환 후 도수 라벨 전체 재작성 — 슬라이드로 dataset.degree만 바뀐 노트까지 포함
  const neckEl = document.getElementById('fb-full-neck');
  if (neckEl) {
    if (_scaleKey === 'secondary-iii' && forward) {
      _relabelSecondaryIIIAsHM(neckEl);   // C-major degree → E 하모닉 마이너 degree
    } else {
      neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
        _setNoteDegreeLabel(el, el.dataset.degree);
      });
    }
  }
  updateFormLabel();
  _refreshSecondaryGhost();
  _transitioning = false;
  _instantPair = false;
}

// 노트 el의 도수 라벨 span 재작성 (근음=라벨 없음)
// degVal: 숫자 1 또는 라벨 문자열('2','b3','4'...)
function _setNoteDegreeLabel(el, degVal) {
  el.querySelectorAll('.fb-note-deg').forEach(d => d.remove());
  if (String(degVal) === '1') return;   // 근음은 표시 생략
  // raw degree(음수=플랫) → 표시 라벨('b3','#4'...)로 변환해야 잉크박스 오프셋 키가 맞음
  // 'b3'·'#2' 같은 문자열 토큰은 Number()가 NaN → degreeLabel에 원본 문자열 그대로 전달(패스스루)
  const _n  = Number(degVal);
  const lbl = degreeLabel(Number.isNaN(_n) ? degVal : _n, _scaleKey);
  const deg = document.createElement('span');
  deg.className = 'fb-note-deg';
  deg.textContent = lbl;
  deg.dataset.deg = lbl;
  applyDegOffset(deg, lbl);
  el.appendChild(deg);
}

function _applyDegMap(neckEl, degMap) {
  neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
    const nd = degMap[el.dataset.s + ',' + el.dataset.degree];
    if (nd !== undefined) {
      el.dataset.degree = nd;
      el.classList.toggle('fb-note--root', nd === 1);
      if (nd === 1 && !_instantPair) {
        el.classList.add('fb-note--root-pop');
        setTimeout(() => el.classList.remove('fb-note--root-pop'), 400);
      }
    }
  });
}

function _spawnNote(neckEl, absF, s, degree) {
  if (absF < 0 || absF >= TOTAL_FRETS) return;   // 유효 프랫(0~22) 밖엔 생성하지 않음
  const newEl = createNoteEl(absF, s, degree, false);
  if (_instantPair) { neckEl.appendChild(newEl); return; }   // 즉시 전환: 생성 애니메이션 없이 완성 상태
  newEl.style.opacity   = '0';
  newEl.style.transform = 'translate(-50%, -50%) scale(0)';
  newEl.style.transition = 'opacity 200ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)';
  neckEl.appendChild(newEl);
  void newEl.offsetHeight;
  newEl.style.opacity   = '1';
  newEl.style.transform = 'translate(-50%, -50%) scale(1)';
}

function transitionPair(instant = false) {
  if (_transitioning) return;
  _instantPair = instant;   // spawn/root-pop/슬라이드 애니메이션 억제 (_finishTransition에서 해제)
  if (_scaleKey === 'secondary-v') { _transitionPairV(); return; }
  if (_scaleKey === 'secondary-ii') { _transitionPairII(); return; }
  if (_scaleKey === 'secondary-vi') { _transitionPairVI(); return; }
  if (_scaleKey === 'secondary-iii') { _transitionPairIII(); return; }
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) { _instantPair = false; return; }

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) { _instantPair = false; return; }
  const bi = cur.bi;

  const activeEls = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')];
  if (!activeEls.length) { _instantPair = false; return; }

  const DURATION = _instantPair ? 0 : 350;
  _transitioning = true;

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── C폼 (bi=4) ↔ E폼 ──────────────────────────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → E폼
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':7,'0,4':1,'0,5':2,
          '1,1':5,'1,2':6,
          '2,5':2,'2,6':3,
          '3,2':6,'3,3':7,'3,4':1,
          '4,6':3,'4,4':4,'4,1':5,
          '5,3':7,'5,4':1,'5,5':2,
        });
        _spawnNote(neckEl, cur.startFret + 4, 2, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // E폼 → C폼
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,7':3,'0,1':4,'0,2':5,
          '1,5':1,'1,6':2,
          '2,2':5,'2,3':6,
          '3,6':2,'3,7':3,'3,1':4,
          '4,3':6,'4,7':7,'4,5':1,
          '5,7':3,'5,1':4,'5,2':5,
        });
        _spawnNote(neckEl, cur.startFret + 1, 1, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── A폼 (bi=0) ↔ D폼 ──────────────────────────────────────────
  } else if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → D폼
      // 5번줄(s=4) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=7 → 왼쪽 1프렛 슬라이드, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 4 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':2, '0,6':3,
          '1,2':6, '1,3':7, '1,4':1,
          '2,6':3, '2,1':5,
          '3,3':7, '3,4':1, '3,5':2,
          '4,1':5, '4,2':6,
          '5,5':2, '5,6':3,
        });
        // 6번줄(s=5) degree=6 오른쪽에 degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 5, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // D폼 → A폼 (역전환)
      // 6번줄(s=5) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=4 → 오른쪽 1프렛 슬라이드, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 5 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':5, '0,3':6,
          '1,6':2, '1,7':3, '1,1':4,
          '2,3':6, '2,5':1,
          '3,7':3, '3,1':4, '3,2':5,
          '4,5':1, '4,6':2,
          '5,2':5, '5,3':6,
        });
        // 5번줄(s=4) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 4, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── G폼 (bi=1) ↔ C폼 ──────────────────────────────────────────
  } else if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → C폼
      // 3번줄(s=2) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      // 6번줄(s=5) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':3, '0,1':5,
          '1,3':7, '1,4':1, '1,5':2,
          '2,1':5, '2,2':6,
          '3,5':2, '3,6':3,
          '4,2':6, '4,3':7, '4,4':1,
          '5,6':3, '5,1':5,
        });
        // 4번줄(s=3) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 3, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // C폼 → G폼 (역전환)
      // 4번줄(s=3) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      // 6번줄(s=5) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 3 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':6, '0,5':1,
          '1,7':3, '1,1':4, '1,2':5,
          '2,5':1, '2,6':2,
          '3,2':5, '3,3':6,
          '4,6':2, '4,7':3, '4,1':4,
          '5,3':6, '5,5':1,
        });
        // 3번줄(s=2) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 2, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── E폼 (bi=2) ↔ A폼 ──────────────────────────────────────────
  } else if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → A폼
      // 1번줄(s=0), 6번줄(s=5) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        if ((s === 0 || s === 5) && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,1':5, '0,2':6,
          '1,5':2, '1,6':3,
          '2,2':6, '2,3':7, '2,4':1,
          '3,6':3, '3,1':5,
          '4,3':7, '4,4':1, '4,5':2,
          '5,1':5, '5,2':6,
        });
        // 2번줄(s=1) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 1, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // A폼 → E폼 (역전환)
      // 2번줄(s=1) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':1, '0,6':2,
          '1,2':5, '1,3':6,
          '2,6':2, '2,7':3, '2,1':4,
          '3,3':6, '3,5':1,
          '4,7':3, '4,1':4, '4,2':5,
          '5,5':1, '5,6':2,
        });
        // 1번줄(s=0), 6번줄(s=5) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── D폼 (bi=3) ↔ G폼 ──────────────────────────────────────────
  } else if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → G폼
      // 4번줄(s=3) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':6, '0,3':7,
          '1,6':3, '1,1':5,
          '2,3':7, '2,4':1, '2,5':2,
          '3,1':5, '3,2':6,
          '4,5':2, '4,6':3,
          '5,2':6, '5,3':7, '5,4':1,
        });
        // 1번줄(s=0) degree=1 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 0, 1);
        // 5번줄(s=4) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 4, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // G폼 → D폼 (역전환)
      // 1번줄(s=0) degree=1, 5번줄(s=4) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 && d === 1) || (s === 4 && d === 4)) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':2, '0,7':3,
          '1,3':6, '1,5':1,
          '2,7':3, '2,1':4, '2,2':5,
          '3,5':1, '3,6':2,
          '4,2':5, '4,3':6,
          '5,6':2, '5,7':3, '5,1':4,
        });
        // 4번줄(s=3) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 3, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  } else {
    // 미구현 폼: 즉시 해제
    _transitioning = false;
  }
}

// ── Ch.2 secondary-v: 5도 메이저 전환 애니메이션 ────────────────
function _transitionPairV() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;
  const bi = cur.bi;

  const activeEls = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')];
  if (!activeEls.length) return;

  const DURATION = _instantPair ? 0 : 350;
  _transitioning = true;

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── A폼 (bi=0) ↔ E폼 ──────────────────────────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → E폼
      // 2번줄(s=1) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':1, '0,6':2,
          '1,2':5, '1,3':6,
          '2,6':2, '2,7':3, '2,1':4,
          '3,3':6, '3,5':1,
          '4,7':3, '4,1':4, '4,2':5,
          '5,5':1, '5,6':2,
        });
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // E폼 → A폼 (역전환)
      // 1번줄(s=0), 6번줄(s=5) degree=7 페이드 아웃
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        if ((s === 0 || s === 5) && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,1':5, '0,2':6,
          '1,5':2, '1,6':3,
          '2,2':6, '2,3':7, '2,4':1,
          '3,6':3, '3,1':5,
          '4,3':7, '4,4':1, '4,5':2,
          '5,1':5, '5,2':6,
        });
        _spawnNote(neckEl, cur.startFret + 5, 1, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── G폼 (bi=1) ↔ D폼 ──────────────────────────────────────────
  } else if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → D폼
      // 1번줄(s=0) degree=1 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 1) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':2, '0,7':3,
          '1,3':6, '1,5':1,
          '2,7':3, '2,1':4, '2,2':5,
          '3,5':1, '3,6':2,
          '4,2':5, '4,3':6,
          '5,6':2, '5,7':3, '5,1':4,
        });
        _spawnNote(neckEl, cur.startFret + 1, 3, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // D폼 → G폼 (역전환)
      // 4번줄(s=3) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':6, '0,3':7,
          '1,6':3, '1,1':5,
          '2,3':7, '2,4':1, '2,5':2,
          '3,1':5, '3,2':6,
          '4,5':2, '4,6':3,
          '5,2':6, '5,3':7, '5,4':1,
        });
        _spawnNote(neckEl, cur.startFret + 5, 0, 1);
        _spawnNote(neckEl, cur.startFret + 5, 4, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── E폼 (bi=2) ↔ C폼 ──────────────────────────────────────────
  } else if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → C폼
      // 3번줄(s=2) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,7':3, '0,1':4, '0,2':5,
          '1,5':1, '1,6':2,
          '2,2':5, '2,3':6,
          '3,6':2, '3,7':3, '3,1':4,
          '4,3':6, '4,5':1,
          '5,7':3, '5,1':4, '5,2':5,
        });
        _spawnNote(neckEl, cur.startFret + 1, 1, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // C폼 → E폼 (역전환)
      // 2번줄(s=1) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':7, '0,4':1, '0,5':2,
          '1,1':5, '1,2':6,
          '2,5':2, '2,6':3,
          '3,2':6, '3,3':7, '3,4':1,
          '4,6':3, '4,1':5,
          '5,3':7, '5,4':1, '5,5':2,
        });
        _spawnNote(neckEl, cur.startFret + 4, 2, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── D폼 (bi=3) ↔ A폼 ──────────────────────────────────────────
  } else if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → A폼
      // 6번줄(s=5) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 5 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':5, '0,3':6,
          '1,6':2, '1,7':3, '1,1':4,
          '2,3':6, '2,5':1,
          '3,7':3, '3,1':4, '3,2':5,
          '4,5':1, '4,6':2,
          '5,2':5, '5,3':6,
        });
        _spawnNote(neckEl, cur.startFret + 1, 4, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // A폼 → D폼 (역전환)
      // 5번줄(s=4) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 4 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':2, '0,6':3,
          '1,2':6, '1,3':7, '1,4':1,
          '2,6':3, '2,1':5,
          '3,3':7, '3,4':1, '3,5':2,
          '4,1':5, '4,2':6,
          '5,5':2, '5,6':3,
        });
        _spawnNote(neckEl, cur.startFret + 5, 5, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── C폼 (bi=4) ↔ G폼 (offset = −1) ───────────────────────────
  } else if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → G폼
      // 4번줄(s=3) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      // 6번줄(s=5) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 3 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':6, '0,5':1,
          '1,7':3, '1,1':4, '1,2':5,
          '2,5':1, '2,6':2,
          '3,2':5, '3,3':6,
          '4,6':2, '4,7':3, '4,1':4,
          '5,3':6, '5,5':1,
        });
        _spawnNote(neckEl, cur.startFret, 2, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // G폼 → C폼 (역전환)
      // 3번줄(s=2) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      // 6번줄(s=5) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':3, '0,1':5,
          '1,3':7, '1,4':1, '1,5':2,
          '2,1':5, '2,2':6,
          '3,5':2, '3,6':3,
          '4,2':6, '4,3':7, '4,4':1,
          '5,6':3, '5,1':5,
        });
        _spawnNote(neckEl, cur.startFret + 4, 3, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  } else {
    _transitioning = false;
  }
}

async function closeScaleLevel() {
  _playTap();
  _recordScaleSessionTime();
  await GuitarAudio.stop({ wait: true });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'scale-training.html'; }, 260);
  } else {
    location.href = 'scale-training.html';
  }
}

// ── 전체 넥 렌더링 (1번만 실행) ─────────────────────────────
// ids: { neck, nums, wrapper } 형태의 메인 엘리먼트 ID 사용
function renderFullNeck(ids = {}) {
  const neckEl  = document.getElementById(ids.neck    || 'fb-full-neck');
  const numsEl  = document.getElementById(ids.nums    || 'fb-full-nums');
  const wrapper = document.getElementById(ids.wrapper || 'fb-full-wrapper');
  if (!neckEl || !numsEl || !wrapper) return;

  // 전체 너비 = 기준좌표계 고정값(더 이상 %/vw 아님 — transform:scale이 실제 크기를 담당)
  wrapper.style.width = FB_REF_FULL_W + 'px';
  neckEl.style.width  = '100%';
  numsEl.style.width  = '100%';

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  // ── 줄 선 (뒤에서 먼저 생성) ── 두께도 기준배율(FB_REF_FBU)로 스케일 —
  // 고정 px면 지판이 커지고 작아질 때 줄만 두께가 안 변해서 "사진 확대"가 아니게 됨
  const nutLeftPct = 1 / TOTAL_FRETS * 100;
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s] * FB_REF_FBU}px; left:${nutLeftPct}%;`;
    neckEl.appendChild(el);
  }

  // ── 너트 (fret 0과 1 사이) ──
  const nutEl = document.createElement('div');
  nutEl.className = 'fb-nut-line';
  nutEl.style.left = `${1 / TOTAL_FRETS * 100}%`;
  neckEl.appendChild(nutEl);

  // ── 프렛 선 (fret 2~20 절반 위치) ──
  for (let f = 2; f < TOTAL_FRETS; f++) {
    const leftPct = f / TOTAL_FRETS * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ── 포지션 점 ──
  SINGLE_DOT_FRETS.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    const dot = document.createElement('div');
    dot.className = 'fb-dot';
    dot.style.cssText = `left:${cx}%; top:50%;`;
    neckEl.appendChild(dot);
  });

  DOUBLE_DOT_FRETS.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    [33, 67].forEach(y => {
      const dot = document.createElement('div');
      dot.className = 'fb-dot';
      dot.style.cssText = `left:${cx}%; top:${y}%;`;
      neckEl.appendChild(dot);
    });
  });

  // ── 프렛 번호 (점 위치에만) ──
  const allDotFrets = new Set([...SINGLE_DOT_FRETS, ...DOUBLE_DOT_FRETS]);
  allDotFrets.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-num';
    el.style.left = `${cx}%`;
    el.textContent = fretNum;
    numsEl.appendChild(el);
  });

  // 반복 조회 엘리먼트 캐시 — 이 함수는 페이지당 1회만 호출됨(항상 기본 id 사용)
  _fbEls = {
    row:       document.querySelector('.fretboard-row'),
    viewport:  document.getElementById('fb-viewport'),
    inner:     document.getElementById('fb-viewport-inner'),
    wrapper,
    blockerL:  document.getElementById('fb-peek-blocker-left'),
    blockerR:  document.getElementById('fb-peek-blocker-right'),
    arrowPrev: document.getElementById('fb-arrow-prev'),
    arrowNext: document.getElementById('fb-arrow-next'),
  };

  applyFbLayout();
}

// ── 지판 이동(translateX, 기준좌표계) ────────────────────────
function scrollToFret(startFret, animate = true) {
  _fbLastFret = startFret;
  if (!_fbEls || !_fbEls.wrapper) return;

  // 이전 애니메이션이 아직 진행 중이면 취소 — 연타 시 두 rAF 루프가 동시에
  // _fbPanRef를 덮어쓰면서 서로 밀어내 위치가 흔들리는(튀는) 문제 방지
  if (_fbAnimId !== null) {
    cancelAnimationFrame(_fbAnimId);
    _fbAnimId = null;
  }

  const targetPan = -(startFret / FRETS_VISIBLE) * FB_REF_VIEWPORT_W;

  if (!animate) {
    _fbPanRef = targetPan;
    applyFbPan();
    return;
  }

  const startPan = _fbPanRef;
  const diff     = targetPan - startPan;
  if (Math.abs(diff) < 0.5) { _fbPanRef = targetPan; applyFbPan(); return; }

  const duration  = 350;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    // easeInOutSine — 코사인 기반 S커브(처음엔 점진 가속, 끝에서 감속). easeInOutCubic은
    // t=0.5에서 서로 다른 3차 곡선 두 개가 이어붙는 이음매가 있어 가속도가 미세하게 꺾이는데,
    // sine 곡선은 처음부터 끝까지 하나로 이어져 이음매 없이 매끄러움.
    const ease = -(Math.cos(Math.PI * t) - 1) / 2;
    _fbPanRef = startPan + diff * ease;
    applyFbPan(); // 팬 중엔 스케일이 안 바뀌므로 transform만 갱신(레이아웃 재계산 없음, 2026-09-25 최적화)
    if (t < 1) {
      _fbAnimId = requestAnimationFrame(step);
    } else {
      _fbAnimId = null;
    }
  }
  _fbAnimId = requestAnimationFrame(step);
}

// 도수 번호 라벨 문자열 (음수=플랫, 리디안 -5는 #4 표기)
function degreeLabel(degree, scaleKey) {
  if (degree === -5 && scaleKey === 'lydian') return '#4';
  if (scaleKey === 'altered') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === -3) return '#9';   // b3 → #9
    if (degree === -5) return '#11';  // b5 → #11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  // 프리지안 도미넌트 = 믹솔리디안 b9 b13 과 동일 음정(1 b2 3 4 5 b6 b7) → 표기도 동일
  if (scaleKey === 'mixolydian-b9b13' || scaleKey === 'phrygian-dominant') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'mixolydian-b13') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'lydian-dominant') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === -5) return '#11';  // b5(=#4) → #11
    if (degree === 6)  return '13';   // 6  → 13
  }
  if (scaleKey === 'locrian-sharp2') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'locrian-sharp6') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === 6)  return '13';   // 6  → 13
  }
  return degree < 0 ? 'b' + (-degree) : '' + degree;
}

// ── 도수 라벨 잉크박스 실측 → 원 정중앙 정렬 오프셋 계산 ──────
// canvas measureText 의 actualBoundingBox(잉크 윤곽)로 글리프별 무게중심을
// 구해, left/top 50% 기준점에서 잉크 중심이 정확히 dot 중앙에 오도록 translate.
// b/# 처럼 폭·비대칭이 다른 라벨도 자동 보정됨.
const _DEG_OFFSETS = {};
function measureDegreeOffsets() {
  const cv  = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font         = '700 11px Pretendard, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  const labels = ['1','2','3','4','5','6','7','b2','b3','b5','b6','b7','#2','#4','b9','#9','#11','b13','11','9','13'];
  labels.forEach(lbl => {
    const m = ctx.measureText(lbl);
    const abbL = m.actualBoundingBoxLeft;
    const abbR = m.actualBoundingBoxRight;
    const abbA = m.actualBoundingBoxAscent;
    const abbD = m.actualBoundingBoxDescent;
    const fA   = m.fontBoundingBoxAscent;
    const fD   = m.fontBoundingBoxDescent;
    // 잉크 가로 중심을 기준점(pen=box left=중앙)에 맞춤
    const tx = -((abbR - abbL) / 2);
    // box top=중앙 → baseline=top+fA, 잉크 세로 중심=baseline+(abbD-abbA)/2
    const ty = -(fA + (abbD - abbA) / 2);
    _DEG_OFFSETS[lbl] = { tx, ty, lh: fA + fD };
  });
}

function applyDegOffset(deg, lbl) {
  const o = _DEG_OFFSETS[lbl];
  if (!o) return;   // 미측정 시 CSS 폴백(translate(-50%,-50%)) 유지
  deg.style.transform  = `translate(${o.tx.toFixed(2)}px, ${o.ty.toFixed(2)}px)`;
  deg.style.lineHeight = o.lh.toFixed(2) + 'px';
}

// ── 노트 DOM 생성 함수 ───────────────────────────────────────
function createNoteEl(absF, s, degree, ghost = false, spawn = false) {
  const leftPct = (absF + 0.5) / TOTAL_FRETS * 100;
  const topPct  = (s + 0.5) / STRINGS * 100;
  const isRoot  = degree === 1;
  const isBlue5 = degree === -5 && _scaleKey !== 'altered';   // altered #11은 특징음 강조 없음
  const isNat7  = degree === 7 && _scaleKey === 'harmonic-minor';
  const isChar  = (degree === 4 && _scaleKey === 'ionian')
               || (degree === 6 && _scaleKey === 'dorian')
               || (degree === -2 && _scaleKey === 'phrygian')
               || (degree === -7 && _scaleKey === 'mixolydian')
               || (degree === -6 && _scaleKey === 'aeolian');
  const isOpen  = absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note'
    + (isRoot  ? ' fb-note--root'   : '')
    + (isBlue5 ? ' fb-note--blue5'  : '')
    + (isNat7  ? ' fb-note--nat7'   : '')
    + (isChar  ? ' fb-note--char'   : '')
    + (isOpen  ? ' fb-note--open'   : '')
    + (ghost   ? ' fb-note--ghost'  : '')
    + (spawn   ? ' fb-note--spawn'  : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
  el.dataset.s      = s;
  el.dataset.degree = degree;
  el.dataset.absf   = absF;

  // 도수 번호 라벨 (ghost·근음 제외) — .degrees-on 일 때만 표시
  if (!ghost && String(degree) !== '1') {
    const deg = document.createElement('span');
    deg.className = 'fb-note-deg';
    const _lbl = degreeLabel(degree, _scaleKey);
    deg.textContent = _lbl;
    deg.dataset.deg = _lbl;
    applyDegOffset(deg, _lbl);   // 잉크박스 실측 기반 정중앙 정렬
    el.appendChild(deg);
  }

  if (!ghost) {
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      el.classList.add('fb-note--pressed');
    });

    el.addEventListener('pointerup', e => {
      e.stopPropagation();
      el.classList.remove('fb-note--pressed');
      // 리플 효과 생성
      const ripple = document.createElement('span');
      ripple.className = 'fb-note-ripple';
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
      playScaleNote(s, parseInt(el.dataset.absf));
      _trackBlockPlayed();
    });

    el.addEventListener('pointerleave', () => {
      el.classList.remove('fb-note--pressed');
    });
  }

  return el;
}

// ── 뷰포트 노트 렌더링 ─────────────────────────────────────────
// 현재 블럭의 실제 dot / 인접 블럭의 ghost(희미한) dot
function renderNotes(animate = true) {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  // 블록 이동 시 전환 상태 초기화
  _pairTransitioned = false;

  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // 현재 블럭 정보 먼저 확정 (ghost 가시범위 필터링에 필요)
  const current = seq[_navIdx];

  // ghost 먼저 렌더 (z-index 낮게 배치)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    // Ch.2: 전환 대상(짝궁) 블럭을 ghost로 표시 (_pairTransitioned=false이므로 파트너폼)
    _refreshSecondaryGhost();
  } else {
    // Ch.1/3: 인접 블럭 ghost 표시 — 23프렛 전체 좌표계엔 같은 폼이 여러 위치에 반복 존재하지만
    // 화면엔 7프렛(+peek 여유 1프렛)만 보이므로, 그 범위와 안 겹치는 블록은 아예 안 만듦
    // (전부 만들면 폼당 최대 100개 이상 DOM 생성 — 성능 최적화, 2026-09-25)
    const visStart = current.startFret - 1;
    const visEnd   = current.startFret + FRETS_VISIBLE;
    seq.forEach((item, i) => {
      if (i === _navIdx) return;
      const notes = ScaleData.parseGrid(item.block.grid).notes
        .map(n => ({ ...n, absF: item.startFret + n.col }))
        .filter(n => n.absF >= 0 && n.absF < TOTAL_FRETS);
      if (notes.length === 0) return;
      const minF = Math.min(...notes.map(n => n.absF));
      const maxF = Math.max(...notes.map(n => n.absF));
      if (maxF < visStart || minF > visEnd) return; // 화면 밖 — 스킵
      notes.forEach(note => {
        neckEl.appendChild(createNoteEl(note.absF, note.s, note.degree, true, animate));
      });
    });
  }

  // 현재 블럭 렌더 (위에 쌓임)
  const parsed = ScaleData.parseGrid(current.block.grid);
  parsed.notes.forEach(note => {
    const absF = current.startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    neckEl.appendChild(createNoteEl(absF, note.s, note.degree, false, animate));
  });

  // 방금 생성한 dot들 — 다음 프레임에 --spawn-in을 붙여 슬라이드와 같이 은은하게 페이드인
  // (더블 rAF: 한 프레임 그려진 뒤에 붙여야 opacity:0→1 트랜지션이 제대로 걸림, cd-modal과 동일 패턴)
  // 정리는 setTimeout 고정 시간 대신 transitionend로 — 연타 시 타이머가 계속 쌓이는 것 방지
  if (animate) {
    const spawned = neckEl.querySelectorAll('.fb-note--spawn');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      spawned.forEach(el => {
        el.classList.add('fb-note--spawn-in');
        el.addEventListener('transitionend', () => {
          el.classList.remove('fb-note--spawn', 'fb-note--spawn-in');
        }, { once: true });
      });
    }));
  }

  // secondary-iii C폼(bi=4): 실제 음은 그대로, 뷰포트만 오른쪽 1칸(startFret-1)으로 잡아 화면 중앙 배치
  const _scrollFret = (_scaleKey === 'secondary-iii' && current.bi === 4) ? current.startFret - 1 : current.startFret;
  scrollToFret(_scrollFret, animate);

  // Ch.2: 블럭 이동 시 마지막으로 선택한 전환 상태 유지 (애니메이션 없이 즉시).
  // 유지 상태면 폼 라벨은 _finishTransition에서 1회만 갱신 → 여기서 미리 부르면 원래폼→전환폼 이중 갱신(깜빡임)
  const _isSecondaryPair = _scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii';
  if (_isSecondaryPair && _pairPersist) {
    transitionPair(true);
  } else {
    updateFormLabel();
  }
}

// ── 가장 높은 루트음 찾기 ────────────────────────────────────
// { s, absF, degree:1 } 또는 null
function findHighestRoot(block, startFret) {
  const parsed = ScaleData.parseGrid(block.grid);
  let highest     = null;
  let highestMidi = -1;

  parsed.notes
    .filter(n => n.degree === 1)
    .forEach(note => {
      const absF = startFret + note.col;
      if (absF < 0 || absF >= TOTAL_FRETS) return;
      const midi = OPEN_MIDI[note.s] + absF;
      if (midi > highestMidi) {
        highestMidi = midi;
        highest = { s: note.s, absF, degree: 1 };
      }
    });

  return highest;
}

// ── 테스트 넥 렌더링 (7프렛 고정 위치) ──────────────────────
// startFret ~ startFret+6 범위를 100% 너비에 맞게 렌더
function renderTestNeck(startFret) {
  const neckEl = document.getElementById('test-fb-full-neck');
  const numsEl = document.getElementById('test-fb-full-nums');
  if (!neckEl || !numsEl) return;

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  const showNut    = startFret <= 0;
  const nutLeftPct = showNut ? (1 - startFret) / FRETS_VISIBLE * 100 : 0;

  // ── 줄 선 ──
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px; left:${showNut ? nutLeftPct : 0}%;`;
    neckEl.appendChild(el);
  }

  // ── 너트 ──
  if (showNut) {
    const nutEl = document.createElement('div');
    nutEl.className = 'fb-nut-line';
    nutEl.style.left = `${nutLeftPct}%`;
    neckEl.appendChild(nutEl);
  }

  // ── 프렛 선 (현재 구간) ──
  for (let col = 1; col < FRETS_VISIBLE; col++) {
    const absFret = startFret + col;
    if (showNut ? absFret <= 1 : absFret <= 0) continue;
    const leftPct = col / FRETS_VISIBLE * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ── 포지션 점 & 프렛 번호 ──
  for (let col = 0; col < FRETS_VISIBLE; col++) {
    const fretNum = startFret + col;
    if (fretNum < 0) continue;
    const cx = (col + 0.5) / FRETS_VISIBLE * 100;

    if (SINGLE_DOT_FRETS.has(fretNum)) {
      const dot = document.createElement('div');
      dot.className = 'fb-dot';
      dot.style.cssText = `left:${cx}%; top:50%;`;
      neckEl.appendChild(dot);
      const num = document.createElement('div');
      num.className = 'fb-fret-num';
      num.style.left = `${cx}%`;
      num.textContent = fretNum;
      numsEl.appendChild(num);
    } else if (DOUBLE_DOT_FRETS.has(fretNum)) {
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

  // 개방현이 보이는 경우: 개방 위치에 hint 원 표시
  if (startFret <= 0) {
    const openCol = -startFret;
    for (let s = 0; s < STRINGS; s++) {
      const leftPct = (openCol + 0.5) / FRETS_VISIBLE * 100;
      const topPct  = (s + 0.5) / STRINGS * 100;
      const el = document.createElement('div');
      el.className = 'fb-open-hint';
      el.dataset.openHint = `${s},${openCol}`;
      el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
      neckEl.appendChild(el);
    }
  }
}

// ── 테스트 힌트 노트 렌더링 (최고음 1개) ─────────────────────
function renderTestNotes() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl || !_testItem) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  // Ch.2: 소스폼 ghost (hint 없음)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    _renderTestNotesCh2(neckEl);
    return;
  }

  const { startFret } = _testItem;
  const hint = findHighestRoot(_testItem.block, startFret);
  if (!hint) return;

  // 7-fret 고정 뷰 기준 위치 계산
  const col = hint.absF - startFret;
  _testHint = { s: hint.s, col };  // checkAnswer 채점용 저장
  // 힌트 위치에 개방현 hint가 있으면 숨김
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${hint.s},${col}"]`)
        ?.style.setProperty('display', 'none');
  const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct  = (hint.s + 0.5) / STRINGS * 100;
  const isOpen  = hint.absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note fb-note--root' + (isOpen ? ' fb-note--open' : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:auto; cursor:pointer;`;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.classList.add('fb-note--pressed');
  });
  el.addEventListener('pointerup', e => {
    e.stopPropagation();
    el.classList.remove('fb-note--pressed');
    const ripple = document.createElement('span');
    ripple.className = 'fb-note-ripple';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    playScaleNote(hint.s, hint.absF);
  });
  el.addEventListener('pointerleave', () => el.classList.remove('fb-note--pressed'));

  neckEl.appendChild(el);
}


// Ch.2 테스트 노트 렌더: 소스폼 ghost만 표시 (hint 없음)
function _renderTestNotesCh2(neckEl) {
  const { bi, startFret, forward } = _testItem;
  const isV        = _scaleKey === 'secondary-v';
  const isII       = _scaleKey === 'secondary-ii';
  const isVI       = _scaleKey === 'secondary-vi';
  const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
  const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
  const offset       = offsetMap[bi] || 0;
  const partnerBi    = partnerMap[bi];
  const srcBi        = forward ? bi : partnerBi;
  const srcStartFret = forward ? startFret : startFret + offset;
  // secondary-ii/vi: forward=소스가 major, reverse=소스가 harmonic-minor
  const srcScaleKey  = (isII || isVI) ? (forward ? 'major' : 'harmonic-minor') : 'major';

  const srcBlock = ScaleData.getBlocks(srcScaleKey)[srcBi];
  if (!srcBlock) return;

  const srcParsed = ScaleData.parseGrid(srcBlock.grid);
  srcParsed.notes.forEach(note => {
    const absF = srcStartFret + note.col;
    const col  = absF - startFret;
    if (col < 0 || col >= FRETS_VISIBLE) return;
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (note.s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-note fb-note--ghost';
    el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:none;`;
    neckEl.appendChild(el);
  });
}
// ── 정답 채점 ──────────────────────────────────────────────────
function checkAnswer() {
  if (!_testItem || _testSubmitted) return;
  GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
  _testSubmitted = true;
  _recordScaleSubmit();


  // Ch.2: 타겟폼 기준으로 정답 set 구성
  const { startFret } = _testItem;
  let _answerBlock = _testItem.block;
  let _answerStartFret = startFret;
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    const { bi, forward } = _testItem;
    const isV        = _scaleKey === 'secondary-v';
    const isII       = _scaleKey === 'secondary-ii';
    const isVI       = _scaleKey === 'secondary-vi';
    const isIII      = _scaleKey === 'secondary-iii';
    const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isIII ? PAIR_PARTNER_BI_III : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
    const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isIII ? PAIR_STARTFRET_OFFSET_III : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
    const offset = offsetMap[bi] || 0;
    const tgtBi = forward ? partnerMap[bi] : bi;
    const tgtScaleKey = (isII || isVI) ? (forward ? 'harmonic-minor' : 'major')
                      : isIII ? (forward ? 'natural-minor' : 'major')
                      : 'major';
    _answerBlock = ScaleData.getBlocks(tgtScaleKey)[tgtBi];
    _answerStartFret = forward ? startFret + offset : startFret;
  }
  const parsed = ScaleData.parseGrid(_answerBlock.grid);

  const correctSet = new Set();
  parsed.notes.forEach(note => {
    const absF = _answerStartFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    const col = absF - startFret;
    if (col < 0 || col >= FRETS_VISIBLE) return;
    if (_testHint && note.s === _testHint.s && col === _testHint.col) return;
    correctSet.add(`${note.s},${col}`);
  });
  // 플레이어 dot 채점
  let nCorrect = 0;
  _placedNotes.forEach(key => {
    const el = document.getElementById('test-fb-full-neck')
                       ?.querySelector(`.fb-note--placed[data-key="${key}"]`);
    if (!el) return;
    el.classList.remove('fb-note--placed');
    const [ps, pcol] = key.split(',').map(Number);
    const pAbsF = _testItem.startFret + pcol;
    if (correctSet.has(key)) {
      el.classList.add('fb-note--correct');
      nCorrect++;
    } else {
      el.classList.add('fb-note--wrong');
    }
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.addEventListener('pointerup', () => {
      if (pAbsF >= 0) playScaleNote(ps, pAbsF);
      const r = document.createElement('span');
      r.className = 'fb-note-ripple';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  });

  // 미찍은 정답 표시
  const neckEl = document.getElementById('test-fb-full-neck');
  correctSet.forEach(key => {
    if (_placedNotes.has(key)) return;
    const [s, col] = key.split(',').map(Number);
    const absF    = _testItem.startFret + col;
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (s  + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-note fb-note--missed';
    el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:auto; cursor:pointer;`;
    el.addEventListener('pointerup', () => {
      if (absF >= 0) playScaleNote(s, absF);
      const r = document.createElement('span');
      r.className = 'fb-note-ripple';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
    neckEl?.appendChild(el);
  });

  // 결과 표시
  const scoreEl  = document.getElementById('test-result-score');
  const detailEl = document.getElementById('test-result-detail');
  const nPlacedWrong = _placedNotes.size - nCorrect;   // 잘못 찍은 수
  const nMissed      = correctSet.size - nCorrect;      // 안 찍은 정답 수
  const nWrong       = nPlacedWrong + nMissed;          // 총 오답 수
  const _pct = correctSet.size > 0
    ? (nWrong === 0 ? 1 : nCorrect / (correctSet.size + nPlacedWrong))
    : 0;

  // 레벨별 퍼펙트 퀘스트: 100%정답(오답0) 제출 누적
  if (_scaleLevel > 0 && _pct === 1) {
    const s2 = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');
    const sp = s2.scale_perfect || {};
    sp[_scaleLevel] = (sp[_scaleLevel] || 0) + 1;
    s2.scale_perfect = sp;
    localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(s2));
    if (typeof incrementScalePerfect === 'function') incrementScalePerfect(_scaleLevel);
  }

  const _PERFECT_MSGS = ['완벽해요!', '정확해요!', '맞았어요! 잘하고 있어요.'];
  const _scoreMsg = _pct === 1
    ? _PERFECT_MSGS[Math.floor(Math.random() * _PERFECT_MSGS.length)]
    : _pct >= 0.7
    ? '거의 다 왔어요!'
    : _pct >= 0.4
    ? '아쉬워요...! 다시 도전해보세요!'
    : '조금 더 연습해보아요!';

  if (scoreEl)  scoreEl.textContent  = `오답 ${nWrong}개`;
  if (detailEl) detailEl.textContent = '';

  playQuizSound(nWrong === 0 ? 'correct' : 'wrong');

  analytics.track('scale_test_result', {
    scale_key:  _scaleKey,
    root_name:  (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    form:       _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼'),
    bi:         _testItem.bi,
    forward:    _testItem.forward ?? null,
    correct:    nCorrect,
    total:      correctSet.size,
    score_pct:  correctSet.size > 0 ? Math.round(nCorrect / correctSet.size * 100) : 0,
  });

  document.getElementById('test-result-row')?.classList.add('is-visible');

  // 문제 텍스트 재소 사용 — 정답 문구로 교체
  const qEl2 = document.getElementById('test-question-text');
  if (qEl2) {
    qEl2.classList.remove('test-question--in');
    void qEl2.offsetWidth;
    qEl2.textContent = _scoreMsg;
    qEl2.classList.add('test-question--in');
  }

  // 버튼 상태 갱신 + 뒤로가기 표시
  const label = document.getElementById('test-submit-btn-label');
  if (label) label.textContent = '다시 풀기';
  const retryCost = document.getElementById('test-retry-peak-cost');
  if (retryCost) retryCost.style.display = '';
  document.getElementById('test-back-btn')?.classList.add('is-visible');
}

// ── "?" 버튼 튜토리얼 (2026-09-25, 레벨1 메이저 기준 가이드 — UI 레이아웃만, 아직 기능 없음) ──
// 테스트 오버레이를 그대로 재사용하되 문제설명/제출버튼을 숨기고, 지금 화면 상태가 아니라
// 고정된 기준 폼(Ckey A폼)을 dot 없이 뼈대만 보여줌. 전환형 등 복잡한 스케일은 대상 아님(추후 결정).
function openTutorial() {
  _tutorialMode = true;
  GuitarAudio.stop();
  clearTestDots();
  _testHint = null;

  const block = ScaleData.getBlocks('major')[0]; // FORM_NAMES[0] = 'A폼'
  const startFret = ScaleData.getStartFrets(block, 0)[0]; // C key(rootNote=0) 기준
  renderTestNeck(startFret); // renderTestNotes() 호출 안 함 — 스케일 dot 없이 뼈대만

  const overlay = document.getElementById('scale-test-overlay');
  overlay?.classList.add('is-open', 'scale-test-overlay--tutorial');
  applyTestFbLayout();
}

function closeTutorial() {
  _tutorialMode = false;
  document.getElementById('scale-test-overlay')?.classList.remove('is-open', 'scale-test-overlay--tutorial');
}

// ── 테스트 시작 ────────────────────────────────────────────────
function startTest() {
  GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // 상태 초기화
  clearTestDots();
  _testHint      = null;
  _testSubmitted = false;

  // 지금 fretboard-row에 표시 중인 블록을 그대로 테스트 문제로 사용
  // (2026-09-25, 셔플백 무작위 출제 폐기 — "방금 보던 걸 바로 확인"하는 흐름으로 변경)
  const current = seq[_navIdx];
  const isSecondaryPair = _scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii';
  // Ch.2: 지금 원폼을 보고 있으면(_pairTransitioned=false) 원폼→짝궁 방향, 짝궁을 보고 있으면 반대 방향
  _testItem = isSecondaryPair ? { ...current, forward: !_pairTransitioned } : current;

  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;

  // 7-fret 고정 넥 렌더 (스크롤 없이 고정 표시)
  renderTestNeck(_testItem.startFret);
  renderTestNotes();
  applyTestFbLayout(); // "사진 확대" 스케일 적용 — 오버레이가 열려 실측 가능해진 후 호출

  const resultRow = document.getElementById('test-result-row');
  if (resultRow) {
    resultRow.classList.remove('is-visible');
    const scoreEl  = resultRow.querySelector('#test-result-score');
    const detailEl = resultRow.querySelector('#test-result-detail');
    if (scoreEl)  scoreEl.textContent  = '';
    if (detailEl) detailEl.textContent = '';
  }
  const submitLabel = document.getElementById('test-submit-btn-label');
  if (submitLabel) submitLabel.textContent = '제출하기';
  const retryCostReset = document.getElementById('test-retry-peak-cost');
  if (retryCostReset) retryCostReset.style.display = 'none';
  document.getElementById('test-back-btn')?.classList.remove('is-visible');

  // 질문 텍스트 초기화 (애니메이션 이후 바뀌도록 숨김)
  const qEl = document.getElementById('test-question-text');
  if (qEl) {
    let questionHtml;
    if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v') {
      const { bi, forward } = _testItem;
      const isV        = _scaleKey === 'secondary-v';
      const partnerMap = isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
      const interval   = isV ? 7 : 5;
      const partnerBi  = partnerMap[bi];
      const srcBi      = forward ? bi : partnerBi;
      const tgtBi      = forward ? partnerBi : bi;
      const srcKeyNote = forward ? _rootNote : (_rootNote + interval) % 12;
      const tgtKeyNote = forward ? (_rootNote + interval) % 12 : _rootNote;
      questionHtml = `${names[srcKeyNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[tgtKeyNote]}메이저 ${FORM_NAMES[tgtBi]}으로 전환해보세요!`;
    } else if (_scaleKey === 'secondary-ii') {
      const { bi, forward } = _testItem;
      const partnerBi  = PAIR_PARTNER_BI_II[bi];
      const srcBi      = forward ? bi : (partnerBi !== undefined ? partnerBi : bi);
      const tgtBi      = forward ? (partnerBi !== undefined ? partnerBi : bi) : bi;
      const hmKeyNote  = (_rootNote + 9) % 12;
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[tgtBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[srcBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[tgtBi]}으로<br>전환해보세요!`;
      }
    } else if (_scaleKey === 'secondary-vi') {
      const { bi, forward } = _testItem;
      const partnerBi  = PAIR_PARTNER_BI_VI[bi];
      const srcBi      = forward ? bi : (partnerBi !== undefined ? partnerBi : bi);
      const tgtBi      = forward ? (partnerBi !== undefined ? partnerBi : bi) : bi;
      const hmKeyNote  = (_rootNote + 2) % 12;
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[tgtBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[srcBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[tgtBi]}으로<br>전환해보세요!`;
      }
    } else if (_scaleKey === 'secondary-iii') {
      const { bi, forward } = _testItem;
      const partnerBi = PAIR_PARTNER_BI_III[bi];
      const nmFormNames = ['Gm폼','Em폼','Dm폼','Cm폼','Am폼'];
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}에서<br>${names[_rootNote]} 내추럴 마이너 ${nmFormNames[partnerBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[_rootNote]} 내추럴 마이너 ${nmFormNames[partnerBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[bi]}으로<br>전환해보세요!`;
      }
    } else {
      const _lbl = _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼');
      const formName = _lbl.split(' ').pop();
      questionHtml = `${names[_rootNote]} ${SCALE_TITLES[_scaleKey]}의<br>${formName}을 입력해주세요!`;
    }
    qEl.innerHTML = questionHtml;
    qEl.classList.remove('test-question--in');
    void qEl.offsetWidth;
  }

  // 오버레이 열기
  const overlay = document.getElementById('scale-test-overlay');
  if (overlay) overlay.classList.add('is-open');

  // 제출 버튼 비활성화 — 질문 애니메이션 중 입력 ̨차단
  const submitBtn = document.getElementById('test-submit-btn');
  if (submitBtn) submitBtn.disabled = true;
  setTimeout(() => {
    qEl?.classList.add('test-question--in');
  }, 800);
  setTimeout(() => {
    if (submitBtn) submitBtn.disabled = false;
  }, 2000);  // 800ms 딜레이 + 1200ms 애니메이션
}

// ── 플레이어 dot 1개 추가 ────────────────────────────────────
function addTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  const [s, col] = key.split(',').map(Number);
  const leftPct  = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct   = (s  + 0.5) / STRINGS * 100;

  // 개방현 hint 숨김
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)
        ?.style.setProperty('display', 'none');

  const el = document.createElement('div');
  el.className = 'fb-note fb-note--placed';
  el.dataset.key = key;
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.classList.add('fb-note--pressed');
  });
  el.addEventListener('pointerup', e => {
    e.stopPropagation();
    removeTestDot(key);
  });
  el.addEventListener('pointerleave', () => el.classList.remove('fb-note--pressed'));

  neckEl.appendChild(el);
}

// ── 플레이어 dot 1개 삭제 ────────────────────────────────────
function removeTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`)?.remove();
  _placedNotes.delete(key);
  // 개방현 hint 복원
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)
        ?.style.removeProperty('display');
}

// ── 전체 placed dot 초기화 ──────────────────────────────────
function clearTestDots() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (neckEl) {
    neckEl.querySelectorAll('.fb-note--placed').forEach(el => el.remove());
    neckEl.querySelectorAll('.fb-open-hint').forEach(el => el.style.removeProperty('display'));
  }
  _placedNotes.clear();
}

// ── 테스트 넥 이벤트 초기화 (DOMContentLoaded 이후 1회) ──────
function initTestTap() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  // pointerdown: 시작 좌표 저장
  let _tapStartX = 0, _tapStartY = 0;
  document.addEventListener('pointerdown', e => {
    _tapStartX = e.clientX;
    _tapStartY = e.clientY;
  });

  neckEl.addEventListener('pointerup', e => {
    const dx = Math.abs(e.clientX - _tapStartX);
    const dy = Math.abs(e.clientY - _tapStartY);
    if (dx > 8 || dy > 8) return;   // 거리 초과 시 취소
    if (_testSubmitted) return;      // 제출 후 입력 차단

    const rect = neckEl.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left) / rect.width  * FRETS_VISIBLE);
    const s    = Math.floor((e.clientY - rect.top)  / rect.height * STRINGS);

    if (col < 0 || col >= FRETS_VISIBLE || s < 0 || s >= STRINGS) return;

    // 힌트 위치 제외
    if (_testHint && _testHint.s === s && _testHint.col === col) return;

    const key = `${s},${col}`;
    if (_placedNotes.has(key)) {
      removeTestDot(key);
    } else {
      _placedNotes.add(key);
      addTestDot(key);
      const absF = _testItem.startFret + col;
      if (absF >= 0) playScaleNote(s, absF);
    }
  });
}

// ── 폼 레이블 업데이트 ─────────────────────────────────────────
// ── Ch.2 secondary-ii: 2도 마이너 전환 애니메이션 ────────────────
function _transitionPairII() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;
  const bi = cur.bi;

  const activeEls = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')];
  if (!activeEls.length) return;

  const DURATION = _instantPair ? 0 : 350;
  _transitioning = true;

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── C폼(bi=4) ↔ Am폼(harmonic-minor) ──────────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → Am폼: s=0,2,5 에서 deg5 slide +1 → deg7
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 2 || s === 5) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,3':'5',  '0,4':'b6',
          '1,7':'2',  '1,1':'b3', '1,2':'4',
          '2,6':1,
          '3,2':'4',  '3,3':'5',  '3,4':'b6',
          '4,6':1,    '4,7':'2',  '4,1':'b3',
          '5,3':'5',  '5,4':'b6',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Am폼 → C폼: s=0,2,5 에서 deg7 slide -1
      // ⚠️ Phase1에서 degree 변경 안 함: degMap '0,5':'3'이 슬라이드 노트와 충돌 방지
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 2 || s === 5) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          // degree는 degMap 이후에 변경
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,5':'3',   '0,b6':'4',
          '1,2':'7',   '1,b3':1,   '1,4':'2',
          '2,1':'6',
          '3,4':'2',   '3,5':'3',  '3,b6':'4',
          '4,1':'6',   '4,2':'7',  '4,b3':1,
          '5,5':'3',   '5,b6':'4',
        });
        // degMap 이후 슬라이드 노트 degree 변경 (충돌 없음)
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── A폼(bi=0) ↔ Gm폼(harmonic-minor) ─────────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → Gm폼: s=0,3,5 에서 deg5 slide +1 → deg7
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 3 || s === 5) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,6':1,
          '1,2':'4',   '1,3':'5',   '1,4':'b6',
          '2,6':1,     '2,7':'2',   '2,1':'b3',
          '3,3':'5',   '3,4':'b6',
          '4,7':'2',   '4,1':'b3',  '4,2':'4',
          '5,6':1,
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Gm폼 → A폼: s=0,3,5 에서 deg7 slide -1 (degree는 degMap 이후에 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 3 || s === 5) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,1':6,
          '1,4':'2',   '1,5':'3',   '1,b6':'4',
          '2,1':6,     '2,2':'7',   '2,b3':1,
          '3,5':'3',   '3,b6':'4',
          '4,2':'7',   '4,b3':1,    '4,4':'2',
          '5,1':6,
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── E폼(bi=2) ↔ Dm폼(harmonic-minor) ─────────────────────────
  if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → Dm폼: s=1,4 에서 deg5 slide +1 → deg7 (즉시 degree 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 1 || s === 4) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,7':'2',  '0,1':'b3', '0,2':'4',
          '1,6':1,
          '2,2':'4',  '2,3':'5',  '2,4':'b6',
          '3,6':1,    '3,7':'2',  '3,1':'b3',
          '4,3':'5',  '4,4':'b6',
          '5,7':'2',  '5,1':'b3', '5,2':'4',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Dm폼 → E폼: s=1,4 에서 deg7 slide -1 (degree는 degMap 이후 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 1 || s === 4) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,2':'7',  '0,b3':1,  '0,4':'2',
          '1,1':6,
          '2,4':'2',  '2,5':'3',  '2,b6':'4',
          '3,1':6,    '3,2':'7',  '3,b3':1,
          '4,5':'3',  '4,b6':'4',
          '5,2':'7',  '5,b3':1,  '5,4':'2',
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── D폼(bi=3) ↔ Cm폼(harmonic-minor) ─────────────────────────
  if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → Cm폼: s=2,4 에서 deg5 slide +1 → deg7 (즉시 degree 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 2 || s === 4) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,2':'4',  '0,3':'5',
          '1,6':1,    '1,7':'2',  '1,1':'b3',
          '2,3':'5',  '2,4':'b6',
          '3,7':'2',  '3,1':'b3', '3,2':'4',
          '4,6':1,
          '5,2':'4',  '5,3':'5',  '5,4':'b6',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Cm폼 → D폼: s=2,4 에서 deg7 slide -1 (degree는 degMap 이후 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 2 || s === 4) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,4':'2',  '0,5':'3',
          '1,1':6,    '1,2':'7',  '1,b3':1,
          '2,5':'3',  '2,b6':'4',
          '3,2':'7',  '3,b3':1,   '3,4':'2',
          '4,1':6,
          '5,4':'2',  '5,5':'3',  '5,b6':'4',
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── G폼(bi=1) ↔ Em폼(harmonic-minor) ─────────────────────────
  if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → Em폼: s=1 deg5 fade, s=3 deg5 slide+1
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 1 && d === 5) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 3 && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':1,     '0,7':'2',   '0,1':'b3',
          '1,3':'5',   '1,4':'b6',
          '2,7':'2',   '2,1':'b3',  '2,2':'4',
          '3,6':1,
          '4,2':'4',   '4,3':'5',   '4,4':'b6',
          '5,6':1,     '5,7':'2',   '5,1':'b3',
        });
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Em폼 → G폼: s=0,s=5 deg7 fade, s=3 deg7 slide-1 (degree는 degMap 이후 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 5) && d === 7 && parseInt(el.dataset.absf) === cur.startFret + 1) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 3 && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if ((parseInt(el.dataset.s) === 0 || parseInt(el.dataset.s) === 5) &&
              parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,1':6,     '0,2':'7',   '0,b3':1,
          '1,5':'3',   '1,b6':'4',
          '2,2':'7',   '2,b3':1,    '2,4':'2',
          '3,1':6,
          '4,4':'2',   '4,5':'3',   '4,b6':'4',
          '5,1':6,     '5,2':'7',   '5,b3':1,
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _spawnNote(neckEl, cur.startFret + 5, 1, 5);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }
}

// ── Ch.2 secondary-vi: 2도 마이너 전환 애니메이션 ────────────────
function _transitionPairVI() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;
  const bi = cur.bi;
  const sf = cur.startFret;

  const activeEls = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')];
  if (!activeEls.length) return;

  const DURATION = _instantPair ? 0 : 350;
  _transitioning = true;

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── C폼(bi=4) ↔ Dm폼(HM bi=2), offset=0 ──────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼→Dm폼: fade s1-7@sf+1, slidNode s1-1@sf+2→sf+3, slide s4-7@sf+3→sf+2(b6), slidNode s4-1@sf+4→sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === '7' && absf === sf+1)   { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '1' && absf === sf+2)   { el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+3; el.classList.toggle('fb-note--open', sf+3===0); slidNodes.push(el); }
        if (s === 4 && d === '7' && absf === sf+3)   { el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+2; el.classList.toggle('fb-note--open', sf+2===0); el.dataset.degree = 'b6'; el.classList.remove('fb-note--root'); }
        if (s === 4 && d === '1' && absf === sf+4)   { el.style.left = ((sf+5+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+5; el.classList.toggle('fb-note--open', sf+5===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,3':'2','0,4':'b3','0,5':'4', '1,2':1, '2,5':'4','2,6':'5', '3,2':1,'3,3':'2','3,4':'b3', '4,6':'5', '5,3':'2','5,4':'b3','5,5':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 7; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+4, 2, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Dm폼→C폼: fade s2-b6@sf+4, slidNode s1-7@sf+3→sf+2(→1), slide s4-b6@sf+2→sf+3(7), slidNode s4-7@sf+5→sf+4(→1)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 2 && d === 'b6' && absf === sf+4)  { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '7'  && absf === sf+3)  { el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+2; el.classList.toggle('fb-note--open', sf+2===0); slidNodes.push(el); }
        if (s === 4 && d === 'b6' && absf === sf+2)  { el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+3; el.classList.toggle('fb-note--open', sf+3===0); el.dataset.degree = '7'; }
        if (s === 4 && d === '7'  && absf === sf+5)  { el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+4; el.classList.toggle('fb-note--open', sf+4===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':'3','0,b3':'4','0,4':'5', '1,1':'2', '2,4':'5','2,5':'6', '3,1':'2','3,2':'3','3,b3':'4', '4,5':'6', '5,2':'3','5,b3':'4','5,4':'5' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 1, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── A폼(bi=0) ↔ Cm폼(HM bi=3), offset=0 ──────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼→Cm폼: fade s4-7@sf+1, slide s2-7@sf+3→sf+2(b6), slidNode s2-1@sf+4→sf+5(→7), slidNode s4-1@sf+2→sf+3(→7), spawn s5 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 4 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 2 && d === '7' && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 2 && d === '1' && absf === sf+4) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 4 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'4','0,6':'5', '1,2':1,'1,3':'2','1,4':'b3', '2,6':'5', '3,3':'2','3,4':'b3','3,5':'4', '4,2':1, '5,5':'4','5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 5, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Cm폼→A폼: fade s5-b6@sf+5, slide s2-b6@sf+2→sf+3(7), slidNode s2-7@sf+5→sf+4(→1), slidNode s4-7@sf+3→sf+2(→1), spawn s4 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 5 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 2 && d === 'b6' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 2 && d === '7'  && absf === sf+5) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 4 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,4':'5','0,5':'6', '1,1':'2','1,2':'3','1,b3':'4', '2,5':'6', '3,2':'3','3,b3':'4','3,4':'5', '4,1':'2', '5,4':'5','5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 4, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── G폼(bi=1) ↔ Am폼(HM bi=4), offset=+1 ─────────────────────
  if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼→Am폼: fade s2-7@sf+1, slide s0-7@sf+4→sf+3(b6), slidNode s0-1@sf+5→sf+6(→7), slidNode s2-1@sf+2→sf+3(→7), slide s5-7@sf+4→sf+3(b6), slidNode s5-1@sf+5→sf+6(→7), spawn s3 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 2 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 0 && d === '1' && absf === sf+5) { const nf=sf+6; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 2 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 5 && d === '1' && absf === sf+5) { const nf=sf+6; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,6':'5', '1,3':'2','1,4':'b3','1,5':'4', '2,2':1, '3,5':'4','3,6':'5', '4,2':1,'4,3':'2','4,4':'b3', '5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 3, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Am폼→G폼: fade s3-b6@sf+5, slide s0-b6@sf+3→sf+4(7), slidNode s0-7@sf+6→sf+5(→1), slidNode s2-7@sf+3→sf+2(→1), slide s5-b6@sf+3→sf+4(7), slidNode s5-7@sf+6→sf+5(→1), spawn s2 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 3 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 0 && d === '7'  && absf === sf+6) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 2 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 5 && d === '7'  && absf === sf+6) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'6', '1,2':'3','1,b3':'4','1,4':'5', '2,1':'2', '3,4':'5','3,5':'6', '4,1':'2','4,2':'3','4,b3':'4', '5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 2, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── E폼(bi=2) ↔ Gm폼(HM bi=0), offset=0 ──────────────────────
  if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼→Gm폼: fade s0-7@sf+1, slidNode s0-1@sf+2→sf+3(→7), slide s3-7@sf+3→sf+2(b6), slidNode s3-1@sf+4→sf+5(→7), fade s5-7@sf+1, slidNode s5-1@sf+2→sf+3(→7), spawn s1 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 0 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 3 && d === '7' && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '1' && absf === sf+4) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 5 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1, '1,5':'4','1,6':'5', '2,2':1,'2,3':'2','2,4':'b3', '3,6':'5', '4,3':'2','4,4':'b3','4,5':'4', '5,2':1 });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 1, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Gm폼→E폼: fade s1-b6@sf+5, slidNode s0-7@sf+3→sf+2(→1), slide s3-b6@sf+2→sf+3(7), slidNode s3-7@sf+5→sf+4(→1), slidNode s5-7@sf+3→sf+2(→1), spawn s0 7@sf+1, spawn s5 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 3 && d === 'b6' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7'  && absf === sf+5) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2', '1,4':'5','1,5':'6', '2,1':'2','2,2':'3','2,b3':'4', '3,5':'6', '4,2':'3','4,b3':'4','4,4':'5', '5,1':'2' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 0, 7);
        _spawnNote(neckEl, sf+1, 5, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── D폼(bi=3) ↔ Em폼(HM bi=1), offset=0 ──────────────────────
  if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼→Em폼: fade s1-1@sf+5, slide s1-7@sf+4→sf+3(b6), fade s3-7@sf+1, slidNode s3-1@sf+2→sf+3(→7), spawn s0 7@sf+1 b3@sf+5, spawn s4 b6@sf+5, spawn s5 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === '1' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 3 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1,'0,3':'2', '1,6':'5', '2,3':'2','2,4':'b3','2,5':'4', '3,2':1, '4,5':'4','4,6':'5', '5,2':1,'5,3':'2','5,4':'b3' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 0, 7);
        _spawnNote(neckEl, sf+5, 0, 'b3');
        _spawnNote(neckEl, sf+5, 4, 'b6');
        _spawnNote(neckEl, sf+1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Em폼→D폼: fade s0-7@sf+1 s0-b3@sf+5 s4-b6@sf+5 s5-7@sf+1, slide s1-b6@sf+3→sf+4(7), slidNode s3-7@sf+3→sf+2(→1), spawn s1 1@sf+5, spawn s3 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 0 && d === '7'  && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === 'b3' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 4 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 5 && d === '7'  && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2','0,2':'3', '1,5':'6', '2,2':'3','2,b3':'4','2,4':'5', '3,1':'2', '4,4':'5','4,5':'6', '5,1':'2','5,2':'3','5,b3':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 3, 7);
        _spawnNote(neckEl, sf+5, 1, 1);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }
}

// ── Ch.2 secondary-iii: E 하모닉 마이너 전환 애니메이션 ────────────
// 메이저 폼 → 하모닉마이너 폼: 2→#2, 4→#4 (+1프랫) 슬라이드 + 폼별 델타(spawn/remove).
// 델타 좌표는 "슬라이드 후 shifted-major 보드" 기준 (off = absF - startFret).
function _transitionPairIII() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;
  _transitioning = true;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) { _transitioning = false; return; }
  const sf = cur.startFret;
  const bi = cur.bi;
  const DURATION = _instantPair ? 0 : 350;
  const forward  = !_pairTransitioned;
  const delta    = SECONDARY_III_DELTA[bi] || { spawn: [], remove: [] };

  const activeEls = Array.from(neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)'));
  if (!activeEls.length) { _transitioning = false; return; }

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  const slidNodes = [];
  if (forward) {
    // 1) 2→#2, 4→#4 (+1프랫) 슬라이드
    activeEls.forEach(el => {
      const d    = el.dataset.degree;
      const absf = parseInt(el.dataset.absf);
      if (d === '2' || d === '4') {
        const nf = absf + 1;
        el.style.left = ((nf + 0.5) / TOTAL_FRETS * 100) + '%';
        el.dataset.absf = nf;
        el.classList.toggle('fb-note--open', nf === 0);
        slidNodes.push({ el, finalDeg: d === '2' ? '#2' : '#4' });
      }
    });
    // 2) 델타 remove 대상 fade out (슬라이드 후 좌표 기준)
    const removeK = new Set(delta.remove.map(r => r.s + ',' + (sf + r.off)));
    activeEls.forEach(el => {
      if (removeK.has(el.dataset.s + ',' + el.dataset.absf)) {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%,-50%) scale(0)';
      }
    });
    setTimeout(function() {
      neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
        if (parseFloat(el.style.opacity) === 0) el.remove();
      });
      slidNodes.forEach(({ el, finalDeg }) => { el.dataset.degree = finalDeg; });
      delta.spawn.forEach(sp => _spawnNote(neckEl, sf + sp.off, sp.s, sp.degree));
      _finishTransition(true);
    }, DURATION + 60);

  } else {
    // 역방향: 델타 spawn 제거 → #2→2, #4→4 (-1프랫) → 델타 remove 복구
    const spawnK = new Set(delta.spawn.map(sp => sp.s + ',' + (sf + sp.off)));
    activeEls.forEach(el => {
      const d    = el.dataset.degree;
      const absf = parseInt(el.dataset.absf);
      if (spawnK.has(el.dataset.s + ',' + absf)) {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%,-50%) scale(0)';
        return;
      }
      if (d === '#2' || d === '#4') {
        const nf = absf - 1;
        el.style.left = ((nf + 0.5) / TOTAL_FRETS * 100) + '%';
        el.dataset.absf = nf;
        el.classList.toggle('fb-note--open', nf === 0);
        slidNodes.push({ el, finalDeg: d === '#2' ? '2' : '4' });
      }
    });
    setTimeout(function() {
      neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
        if (parseFloat(el.style.opacity) === 0) el.remove();
      });
      slidNodes.forEach(({ el, finalDeg }) => { el.dataset.degree = finalDeg; });
      delta.remove.forEach(r => _spawnNote(neckEl, sf + r.backOff, r.s, r.backDeg));
      _finishTransition(false);
    }, DURATION + 60);
  }
}

function updateFormLabel() {
  const el = document.getElementById('form-label');
  if (!el) return;
  const seq = buildNavSequence();
  if (seq.length === 0) { el.textContent = ''; return; }
  const { block, bi } = seq[_navIdx];

  // Ch.2: "[Key]메이저 [Form]폼" 형식 (짝궁 전환 시 파트너 키+폼 표시)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v') {
    const names      = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    const isV        = _scaleKey === 'secondary-v';
    const partnerMap = isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
    const interval   = isV ? 7 : 5;
    if (_pairTransitioned) {
      const partnerKey = (_rootNote + interval) % 12;
      const partnerBi  = partnerMap[bi];
      el.textContent = `${names[partnerKey]}메이저 ${FORM_NAMES[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }
  // Ch.2 secondary-ii: 전환 전=메이저, 전환 후=하모닉 마이너 표시 (6도 마이너)
  if (_scaleKey === 'secondary-ii') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const hmKey    = (_rootNote + 9) % 12;
      const partnerBi = PAIR_PARTNER_BI_II[bi];
      el.textContent = `${names[hmKey]} 하모닉 마이너 ${FORM_NAMES_HM[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }
  // Ch.2 secondary-vi: 전환 전=메이저, 전환 후=하모닉 마이너 표시 (2도 마이너)
  if (_scaleKey === 'secondary-vi') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const hmKey     = (_rootNote + 2) % 12;   // 2도 위 (D in key of C)
      const partnerBi = PAIR_PARTNER_BI_VI[bi];
      el.textContent = `${names[hmKey]} 하모닉 마이너 ${FORM_NAMES_HM[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }
  // Ch.2 secondary-iii: 전환 전=메이저, 전환 후=E 하모닉 마이너 표시 (root+4 = 3도)
  if (_scaleKey === 'secondary-iii') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const hmKey    = (_rootNote + 4) % 12;
      const formName = SECONDARY_III_FORM_NAME[bi] || FORM_NAMES[bi];
      el.textContent = `${names[hmKey]} 하모닉 마이너 ${formName}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }

  const title = SCALE_TITLES[_scaleKey] || _scaleKey;
  el.textContent = block.label || `${title} ${FORM_NAMES[bi] ?? (bi + 1 + '번폼')}`;
}

// ── 블록 인디케이터 업데이트 ──────────────────────────────────
function updateBlockIndicator() {
  const el = document.getElementById('block-indicator');
  if (!el) return;

  const seq = buildNavSequence();
  el.innerHTML = '';
  seq.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'block-dot' + (i === _navIdx ? ' block-dot--active' : '');
    dot.addEventListener('pointerup', () => {
      if (_transitioning) return;
      _navIdx = i;
      renderNotes();
      updateBlockIndicator();
    });
    el.appendChild(dot);
  });
}

// ── 이전/다음 버튼 (탐색 이동) ───────────────────────────────
function initArrows() {
  document.getElementById('fb-arrow-prev')?.addEventListener('pointerup', () => {
    if (_transitioning) return;
    const seq = buildNavSequence();
    if (seq.length <= 1) return;
    _navIdx = (_navIdx - 1 + seq.length) % seq.length;
    renderNotes();
    updateBlockIndicator();
    _trackBlockViewed();
  });

  document.getElementById('fb-arrow-next')?.addEventListener('pointerup', () => {
    if (_transitioning) return;
    const seq = buildNavSequence();
    if (seq.length <= 1) return;
    _navIdx = (_navIdx + 1) % seq.length;
    renderNotes();
    updateBlockIndicator();
    _trackBlockViewed();
  });
}

// ── 키 버튼 레이블 갱신 ──────────────────────────────────────
function updateKeyLabels() {
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  document.querySelectorAll('.key-btn').forEach((btn, i) => {
    btn.textContent = names[i];
  });
}

// ── 임시/기록 관련 함수 ──────────────────────────────────────
// ── 훈련 통계 ────────────────────────────────────────────────────
const TRAINING_STATS_KEY = 'training_stats';

/** 제출 완료 1회: today_sessions / total_completed 갱신 (streak/출석모달은 claimDailyAttendance()로 이전) */
function _recordScaleSubmit() {
  const today = _kstToday();
  const stats = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');

  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }

  stats.today_sessions  = (stats.today_sessions  || 0) + 1;
  stats.total_completed = (stats.total_completed || 0) + 1;
  stats.scale_completed = (stats.scale_completed || 0) + 1; // 스케일 누적완료 퀘스트 카운터

  // 레벨 첫완료 퀘스트: 이 레벨 clear 기록(로컬 폴백) + 서버
  if (_scaleLevel > 0) {
    const cl = stats.scale_cleared || {};
    if (!cl[_scaleLevel]) {
      cl[_scaleLevel] = true;
      stats.scale_cleared = cl;
      if (typeof markScaleLevelCleared === 'function') markScaleLevelCleared(_scaleLevel);
    }
  }

  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  syncTrainingStatsToDB(); // 즉시 DB 반영 (fire-and-forget)

  if (typeof addXp === 'function') addXp(BEHAVE_XP.scale); // 행동형 XP: 스케일 세션 완료 (사일런트)
}

/** 페이지 이탈 시 훈련 시간 누적 (문제 미완료여도 기록) */
function _recordScaleSessionTime() {
  if (!_scaleSessionStart) return;
  const durationMin = (Date.now() - _scaleSessionStart) / 60000;
  if (durationMin < 0.1) return; // 6초 미만 무시
  const stats = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');
  const _oldMin = stats.training_time_min || 0;
  stats.training_time_min = Math.round(
    (_oldMin + durationMin) * 10
  ) / 10;
  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  _scaleSessionStart = 0; // 중복 기록 방지

  // 행동형 XP: 훈련시간 10분당 (사일런트)
  if (typeof addXp === 'function') {
    const _timeXp = (Math.floor(stats.training_time_min / 10) - Math.floor(_oldMin / 10)) * BEHAVE_XP.per10min;
    if (_timeXp > 0) addXp(_timeXp);
  }

  // 리뷰 유도 조건: 스케일 연속 3분+ 연습 후 이탈
  if (typeof reviewQualify === 'function' && durationMin >= 3) reviewQualify('scale_3min');
}

// ── Analytics 헬퍼 ──────────────────────────────────────────────
// scale_block_viewed: 디바운스 1.5초
let _blockViewTimer = null;
function _trackBlockViewed() {
  clearTimeout(_blockViewTimer);
  _blockViewTimer = setTimeout(() => {
    const seq = buildNavSequence();
    if (seq.length === 0) return;
    const { block, bi, startFret } = seq[_navIdx];
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    analytics.track('scale_block_viewed', {
      scale_key:  _scaleKey,
      root_name:  names[_rootNote],
      form:       block.label || FORM_NAMES[bi] || (bi + 1 + '번폼'),
      bi,
      start_fret: startFret,
    });
  }, 1500);
}

// scale_block_played: 쓰로틀 5초
let _lastPlayedAt = 0;
function _trackBlockPlayed() {
  const now = Date.now();
  if (now - _lastPlayedAt < 5000) return;
  _lastPlayedAt = now;
  const seq = buildNavSequence();
  if (seq.length === 0) return;
  const { block, bi } = seq[_navIdx];
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  analytics.track('scale_block_played', {
    scale_key: _scaleKey,
    root_name: names[_rootNote],
    form:      block.label || FORM_NAMES[bi] || (bi + 1 + '번폼'),
    bi,
  });
}

function initAccidentalToggle() {
  const toggle    = document.getElementById('accidental-toggle');
  const sharpSpan = document.getElementById('toggle-sharp');
  const flatSpan  = document.getElementById('toggle-flat');
  if (!toggle) return;

  toggle.addEventListener('pointerup', () => {
    _playTap();
    _useFlat = !_useFlat;
    sharpSpan.classList.toggle('active', !_useFlat);
    flatSpan.classList.toggle('active',   _useFlat);
    updateKeyLabels();
    updateFormLabel();
    analytics.track('scale_accidental_toggled', {
      scale_key: _scaleKey,
      to: _useFlat ? 'flat' : 'sharp',
    });
  });
}

function initDegreeToggle() {
  const btn = document.getElementById('degree-toggle-btn');
  if (!btn) return;
  btn.addEventListener('pointerup', () => {
    _playTap();
    _showDegrees = !_showDegrees;
    btn.classList.toggle('active', _showDegrees);
    document.body.classList.toggle('degrees-on', _showDegrees);
    analytics.track('scale_degree_toggled', {
      scale_key: _scaleKey,
      to: _showDegrees ? 'on' : 'off',
    });
  });
}

// ── 키 선택 UI ───────────────────────────────────────────────
// key-selector 가로스크롤 — 마우스 드래그로도 스크롤 가능하게(터치는 브라우저 기본 제공).
// 드래그 발생 시 key-btn의 pointerup(키 선택)은 억제(capture 단계에서 stopPropagation).
function initKeySelectorDragScroll(el) {
  let isDown = false;
  let dragged = false;
  let startX = 0;
  let startScroll = 0;

  el.addEventListener('pointerdown', (e) => {
    isDown = true;
    dragged = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    el.classList.add('is-dragging');
  });
  el.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) dragged = true;
    el.scrollLeft = startScroll - dx;
  });
  const endDrag = () => {
    isDown = false;
    el.classList.remove('is-dragging');
  };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointerleave', endDrag);
  el.addEventListener('pointercancel', endDrag);
  // 드래그였으면 key-btn 클릭(키 선택) 무효화
  el.addEventListener('pointerup', (e) => {
    if (dragged) e.stopPropagation();
  }, true);
}

function initKeySelector() {
  const el = document.getElementById('key-selector');
  if (!el) return;

  KEY_NAMES.forEach((name, semitone) => {
    const btn = document.createElement('button');
    btn.className = 'key-btn' + (semitone === _rootNote ? ' key-btn--active' : '');
    btn.textContent = name;
    btn.addEventListener('pointerup', () => {
      _playTap();
      _rootNote = semitone;
      _navIdx   = 0;   // 키 변경 시 첫 블럭으로 이동
      el.querySelectorAll('.key-btn').forEach(b => b.classList.remove('key-btn--active'));
      btn.classList.add('key-btn--active');
      renderNotes();
      updateFormLabel();
      updateBlockIndicator();
      analytics.track('scale_key_selected', {
        scale_key: _scaleKey,
        root_note: semitone,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[semitone],
      });
    });
    el.appendChild(btn);
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  // 뒤로가기+타이틀+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  const params = new URLSearchParams(location.search);
  _scaleKey = params.get('key') || 'major';
  _scaleLevel = parseInt(params.get('level'), 10) || 0;

  // Ch.2: 전환 버튼 표시
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    const btn = document.getElementById('pair-transition-btn');
    if (btn) {
      btn.style.display = 'inline-flex';
      btn.addEventListener('pointerup', () => {
        if (_transitioning) return;
        _playTap();
        _pairPersist = !_pairTransitioned;   // 이번 전환 후 상태를 블럭 이동해도 유지
        transitionPair();
      });
    }
  }

  measureDegreeOffsets();    // 도수 라벨 정렬 오프셋 1차 측정
  initFbScaleResize();       // 지판 "사진 확대" 스케일 — 창 크기 바뀌면 재계산
renderFullNeck();
  renderNotes(false);        // 초기 렌더 — 애니메이션 없이 즉시 표시

  // 웹폰트(Pretendard) 로드 완료 후 재측정 → 정확한 메트릭으로 재렌더
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureDegreeOffsets();
      renderNotes(false);
      alignMicBtnRowToDesc();
    });
  }
  updateFormLabel();
  updateBlockIndicator();
  initArrows();
  initAccidentalToggle();
  initDegreeToggle();
  initKeySelector();
  initKeySelectorDragScroll(document.getElementById('key-selector'));
  updateScaleGapScrollMode(); // 그룹1~4 간격 30px 미만이면 스크롤모드로 초기 진입 — 모든 그룹 콘텐츠(타이틀/인디케이터/키선택 그리드) 확정 이후에 측정
  alignMicBtnRowToDesc(); // scale-mic-btn-row를 desc 첫 줄 좌우 경계에 맞춤

  initTestTap();

  // 기타 버튼 — 마이크로 직접 연주 감지(원래 기능, 2026-09-25 튜토리얼로 잠시 대체됐다가 복원)
  document.getElementById('scale-mic-btn')?.addEventListener('pointerup', toggleScaleMic);
  // 재생 버튼 — 현재 블럭 낮은음→높은음→낮은음(+근음 재상행) 재생
  document.getElementById('scale-play-btn')?.addEventListener('pointerup', toggleScalePlay);
  // "?" 버튼 — 튜토리얼 다시보기 (2026-09-25: 기타 버튼과 분리해서 별도 3번째 버튼으로)
  document.getElementById('scale-tutorial-btn')?.addEventListener('pointerup', openTutorial);

  // 테스트 시작 버튼 (피크 2개 소모)
  document.getElementById('start-test-btn')?.addEventListener('pointerup', async () => {
    _playTap();
    _playConfirmSfx();
    if (!(await consumePeak(2, 'scale'))) return;
    analytics.track('scale_test_started', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    analytics.track('scale_test_started', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    startTest();
  });

  // 제출하기 / 다시 풀기 버튼
  document.getElementById('test-submit-btn')?.addEventListener('pointerup', async (e) => {
    if (e.currentTarget.disabled) return;
    if (_testSubmitted) {
      _playConfirmSfx();
      if (!(await consumePeak(2, 'scale'))) return;
      analytics.track('scale_test_retry', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
      });
      startTest();
    } else {
      analytics.track('scale_test_submitted', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
        form:      _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼'),
        bi:        _testItem?.bi,
      });
      _playConfirmSfx();
      checkAnswer();
    }
  });

  // 테스트 오버레이 초기화 (X 버튼 / 뒤로가기 버튼 처리)
  const closeTestOverlay = () => {
    GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
    document.getElementById('scale-test-overlay')?.classList.remove('is-open');
  };

  // 제출 전 이탈은 소모한 피크가 그대로 날아감 → 확인 모달. 제출 후엔 바로 닫기.
  const requestCloseTest = (onLeave) => {
    if (isLeavePracticeOpen()) return;
    if (!_testSubmitted) { showLeavePracticeModal(onLeave); return; }
    onLeave();
  };

  document.getElementById('test-close-btn')?.addEventListener('pointerup', () => {
    // 튜토리얼은 피크 소모가 없어서 "제출 전 이탈 확인" 모달 자체가 불필요 — 바로 닫음
    if (_tutorialMode) { closeTutorial(); return; }
    requestCloseTest(closeTestOverlay);
  });
  document.getElementById('test-back-btn')?.addEventListener('pointerup', () => {
    _playSfx('pop.mp3');
    requestCloseTest(() => {
      analytics.track('scale_test_closed', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
      });
      closeTestOverlay();
    });
  });

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  analytics.track('scale_level_viewed', { key: _scaleKey, entry: _pushEntry || 'direct' });

  // 훈련 시간 측정 시작
  _scaleSessionStart = Date.now();

  // 브라우저 탭 닫기 / 뒤로가기 등 예외 경로 처리
  window.addEventListener('pagehide', _recordScaleSessionTime, { once: true });
});
