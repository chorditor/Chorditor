// ═══════════════════════════════════════════════════════════════
// scale-level.js — 스케일 레벨 개별 훈련 페이지
// ═══════════════════════════════════════════════════════════════
// ── 상수 ─────────────────────────────────────────────────────
const SCALE_TITLES = {
  'major':          '메이저 스케일',
  'major-pentatonic': '메이저 펜타토닉 스케일',
  'major-blues':      '메이저 블루스 스케일',
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
  'major-pentatonic': '메이저 펜타토닉',
  'major-blues':      '메이저 블루스',
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

// 지판(fb-viewport) 폭 — 360px 화면(row 320px)에서 312px이 되고, 화면(row) 폭에 비례해 커짐. 최대 480px 캡.
const FB_BASE_VIEWPORT_W = 312;
const FB_BASE_ROW_W = 320;   // 위 폭의 기준이 되는 row 폭(360px 화면 − 좌우 그리드 마진 20×2)
function computeFbScale() {
  const rowWidth = _fbEls ? _fbEls.row.clientWidth : FB_REF_WIDTH;
  const viewportW = Math.min(rowWidth * FB_BASE_VIEWPORT_W / FB_BASE_ROW_W, 480);
  return Math.max(viewportW / FB_REF_VIEWPORT_W, 0.01);
}

// 좌우 "고스트 프렛" peek 폭(실 px) — fretboard-row에서 실제 7프렛 뷰포트를 뺀 나머지(좌우 각각)가
// 40px 이상일 때만, 그 남는 공간 전체를 peek로 씀. 그 미만이면 0. (화살표 버튼은 지판 아래 줄로 이동해서 폭을 안 뺌)
function computeFbPeek(scale) {
  const rowWidth = _fbEls ? _fbEls.row.clientWidth : FB_REF_WIDTH;
  const innerW = FB_REF_VIEWPORT_W * scale;
  const slackEachSide = (rowWidth - innerW) / 2;
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

  // 화살표 버튼 — 실제(스케일 적용된) 넥 높이 기준 세로중앙 (지판 위 오버레이, style.css .fb-arrow-btn의 top)
  const realNeckH = FB_REF_NECK_H * _fbScale;
  _fbEls.row.style.setProperty('--fb-arrow-top', Math.max((realNeckH - 44) / 2, 0) + 'px');

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
  // 좌우 화살표 세로 위치 = 넥 높이의 중앙 (슬롯은 프렛번호 줄까지 포함해서 50%면 아래로 치우침)
  document.querySelector('.test-fb-neck-slot')?.style.setProperty('--test-fb-arrow-top', (TEST_FB_REF_NECK_H * scale / 2) + 'px');
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
// space-between이 실제로 만들 gap을 현재 모드와 무관하게 역산: cd-main 가용높이에서
// 헤드(+헤드↔본문 간격)와 본문 3그룹 자체 높이(스크롤모드 여부와 무관하게 고정) 뺀 값을 2등분.
function updateScaleGapScrollMode() {
  const body = document.querySelector('.scale-level-main .cd-body');
  const head = document.querySelector('.scale-level-main .cd-head');
  const mainContent = document.querySelector('.cd-main');
  const groups = [
    document.querySelector('.scale-level-top'),
    document.querySelector('.scale-mic-wrap'),
    document.querySelector('.scale-test-btn-group'),
  ];
  if (!body || !head || !mainContent || groups.some(g => !g)) return;
  const sumH = groups.reduce((sum, g) => sum + g.offsetHeight, 0);
  const headGap = parseFloat(getComputedStyle(body).marginTop) || 0;
  const naturalGap = (mainContent.clientHeight - head.offsetHeight - headGap - sumH) / 2;
  body.classList.toggle('scale-gap-scroll', naturalGap < 30);
}

// ── 상태 ─────────────────────────────────────────────────────
let _scaleKey  = 'major';
let _scaleLevel = 0; // 레벨 첫완료 퀘스트용 (URL level 파라미터)
let _rootNote  = 0;
// 레벨별 키 선택기 설정 — root: 기본 선택 키이자 목록 맨 앞 키(반음, 0=C), minor: 버튼 표기에 m 붙임(Am).
// 없는 레벨은 C부터 12키 순서, 표기는 키 이름만. (키 버튼 순서만 바뀌고 _rootNote 값은 그대로 반음 번호)
const LEVEL_KEY_UI = { 2: { root: 9, minor: true }, 3: { root: 9, minor: true }, 4: { root: 9, minor: true }, 5: { root: 9, minor: true } };
let _keyUi = null;
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

// ── Ch.2 secondary-iv 전용 재생: 상행=원폼, 정점에서 전환, 하행=짝궁폼 (2026-09-30 테스트) ──
// 짝궁 전환 애니메이션 타이밍 — 슬라이드·제거·생성이 동시에 재생되어 전체 PAIR_SLIDE_MS + PAIR_WAIT_BUFFER_MS(=290ms) 안에 끝남(목표 300ms 이내).
// 반주 BPM과 무관한 고정값. transitionPair 계열 5개 함수의 DURATION, _spawnNote의 생성 애니메이션이 이 값을 씀.
const PAIR_SLIDE_MS = 250;        // 슬라이드·페이드아웃·생성 애니메이션 길이
const PAIR_WAIT_BUFFER_MS = 40;   // 애니메이션 종료 후 정리(제거·도수 재표기·마무리)까지 여유
const SECONDARY_IV_TRANSITION_MS = PAIR_SLIDE_MS + PAIR_WAIT_BUFFER_MS; // 재생버튼 클릭 시 원폼 복귀 대기시간(전환 전체 시간과 동일)

function _buildSecondaryIVDescendSeq(peakMidi) {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return [];
  const ghostsAsc = [...neckEl.querySelectorAll('.fb-note--ghost')].map(el => {
    const s    = parseInt(el.dataset.s);
    const absF = parseInt(el.dataset.absf);
    return { el, s, absF, degree: el.dataset.degree, midi: OPEN_MIDI[s] + absF };
  }).sort((a, b) => a.midi - b.midi);
  if (!ghostsAsc.length) return [];
  let desc = ghostsAsc.slice().reverse();
  if (desc[0].midi === peakMidi) desc = desc.slice(1); // 정점 중복 방지
  // 도착점(가장 낮은음)이 근음이 아니면, 가장 가까운 근음까지 재상행
  if (desc.length && desc[desc.length - 1].degree !== '1') {
    const rootIdx = ghostsAsc.findIndex((n, i) => i > 0 && n.degree === '1');
    if (rootIdx > 0) desc = desc.concat(ghostsAsc.slice(1, rootIdx + 1));
  }
  return desc;
}

// 위치(줄+프렛)로 살아있는 dot을 다시 찾음 — 전환 애니메이션 중 ghost가 통째로
// 재생성되면서 기존 el 참조가 죽는 문제 방지(항상 신선한 DOM으로 강조)
function _findNoteElAt(neckEl, s, absF) {
  return neckEl.querySelector('.fb-note:not(.fb-note--ghost)[data-s="' + s + '"][data-absf="' + absF + '"]')
      || neckEl.querySelector('.fb-note--ghost[data-s="' + s + '"][data-absf="' + absF + '"]');
}

function _startSecondaryIVDescend(seq) {
  const neckEl = document.getElementById('fb-full-neck');
  let j = 0;
  const step = () => {
    document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
    if (j >= seq.length) { stopScalePlay(); return; }
    const note = seq[j];
    const isLast = j === seq.length - 1;
    const el = neckEl && _findNoteElAt(neckEl, note.s, note.absF);
    if (el) el.classList.add('fb-note--playing');
    playScaleNote(note.s, note.absF);
    j++;
    _scalePlayTimer = setTimeout(step, isLast ? SCALE_PLAY_NOTE_MS * 4 : SCALE_PLAY_NOTE_MS);
  };
  step();
}

function _startSecondaryIVAscendThenTransition() {
  const asc = _getCurrentScaleNotesAsc();
  if (asc.length === 0) return;
  document.getElementById('scale-play-btn')?.classList.add('is-active');
  let i = 0;
  const step = () => {
    document.querySelectorAll('.fb-note--playing').forEach(el => el.classList.remove('fb-note--playing'));
    const note   = asc[i];
    const isPeak = i === asc.length - 1;
    note.el.classList.add('fb-note--playing');
    playScaleNote(note.s, note.absF);
    if (isPeak) {
      // 마지막(정점) 음에 도달한 순간 — 전환은 강조색이 한 프레임 그려진 뒤 즉시 시작(체감상 동시).
      // 단, 하행 시작(오디오 포함)은 다른 음과 동일하게 SCALE_PLAY_NOTE_MS만큼 지연 —
      // 안 그러면 하행 첫 음의 playScaleNote()가 GuitarAudio.stop()을 즉시 호출해서
      // 정점 음이 16ms만에 끊겨 사실상 안 들리는 문제 발생(2026-09-30 확인).
      const descSeq = _buildSecondaryIVDescendSeq(note.midi);
      requestAnimationFrame(() => { transitionPair(); });
      _scalePlayTimer = setTimeout(() => { _startSecondaryIVDescend(descSeq); }, SCALE_PLAY_NOTE_MS);
      return;
    }
    i++;
    _scalePlayTimer = setTimeout(step, SCALE_PLAY_NOTE_MS);
  };
  step();
}

function startScalePlay() {
  exitPracticeMode(); // 연습모드 켜져있었으면 즉시 종료

  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    if (_pairTransitioned) {
      // 이미 전환된 상태 — 원폼으로 먼저 되돌린 후 재생 시작(항상 원폼에서 출발)
      transitionPair();
      _scalePlayTimer = setTimeout(_startSecondaryIVAscendThenTransition, SECONDARY_IV_TRANSITION_MS);
    } else {
      _startSecondaryIVAscendThenTransition();
    }
    return;
  }

  const seq = buildScalePlaySequence();
  if (seq.length === 0) return;
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

// ── 연습모드 (기타 버튼): desc 자리가 BPM - 재생 - 스타일 옵션으로 교체됨 ──
// 백킹 트랙 설계는 docs/backing-tracks.md. 지금은 UI(옵션 선택·표시)만, 소리 연동은 아직 없음.
// 드롭업 메뉴는 메트로놈 옵션 카드(.metronome-option-card/-menu) 스타일 재사용.
const PRACTICE_BPM_OPTIONS = Array.from({ length: 17 }, (_, i) => 60 + i * 5); // 60~140, 5단위
const PRACTICE_STYLE_OPTIONS = [{ id: 'basic', label: '기본' }]; // id = BackingTrack STYLES 키
let _practiceOn = false;
let _practicePlaying = false;
let _practiceBpm = 90;
let _practiceStyle = PRACTICE_STYLE_OPTIONS[0].id;

function _setPracticeUi(on) {
  document.getElementById('scale-mic-info')?.classList.toggle('is-practice', on);
  document.getElementById('scale-mic-btn')?.classList.toggle('is-active', on);
}

function enterPracticeMode() {
  stopScalePlay(); // 스케일 들어보기 재생 중이면 중단
  GuitarAudio.warmupPiano(); // 피아노 샘플 미리 로드 → 재생 버튼 누를 때 지연 최소화
  _practiceOn = true;
  renderPracticeChords();
  _setPracticeUi(true);
}

function exitPracticeMode() {
  if (!_practiceOn) return;
  _practiceOn = false;
  _setPracticePlaying(false);
  closePracticeMenus();
  _setPracticeUi(false);
}

function togglePracticeMode() {
  if (_practiceOn) exitPracticeMode();
  else enterPracticeMode();
}

// 재생 중인 코드 파란색 강조 — rAF가 오디오 시계 기준 현재 코드 인덱스를 읽음(setTimeout 금지: 시간이 갈수록 어긋남)
// 챕터2 자동 전환 — 반주 진행의 전환 신호('orig' | 'pair')에 맞춰 스케일 블럭을 원래 폼 ↔ 전환 폼으로 자동 전환.
// 전환 중이면(_transitioning) 끝난 뒤 다음 프레임에 이어서 맞춤.
let _practiceDesiredForm = null;
let _practiceAutoSwitched = false; // 자동 전환을 한 적 있음 → 정지 시 원래 폼으로 복귀(사용자 수동 전환은 건드리지 않음)
function _reconcilePracticeForm() {
  if (!_practiceDesiredForm || _transitioning || !_scaleKey.startsWith('secondary-')) return;
  const wantPair = _practiceDesiredForm === 'pair';
  _practiceDesiredForm = null;
  if (wantPair === _pairTransitioned) return;
  _practiceAutoSwitched = true;
  _pairPersist = wantPair;
  transitionPair();
}

let _practiceChordRaf = null;
let _practiceChordShown = -2;
function _startPracticeChordHighlight(on) {
  if (_practiceChordRaf) { cancelAnimationFrame(_practiceChordRaf); _practiceChordRaf = null; }
  _practiceChordShown = -2;
  document.querySelectorAll('#scale-practice-chords .scale-chord-item').forEach(el => el.classList.remove('is-playing'));
  if (!on) return;
  const loop = () => {
    const cue = BackingTrack.consumeDueForm();
    if (cue) _practiceDesiredForm = cue;
    _reconcilePracticeForm();
    const idx = BackingTrack.getCurrentChordIndex();
    if (idx !== _practiceChordShown) {
      _practiceChordShown = idx;
      // 매번 새로 조회 — #/b 토글로 renderPracticeChords가 span을 다시 만들 수 있음
      document.querySelectorAll('#scale-practice-chords .scale-chord-item').forEach((el, i) => el.classList.toggle('is-playing', i === idx));
    }
    _practiceChordRaf = requestAnimationFrame(loop);
  };
  _practiceChordRaf = requestAnimationFrame(loop);
}

// 백킹 재생 상태 단일 진입점 — 상태·소리·버튼 아이콘(재생 ▶ / 재생 중 ⏸)을 항상 같이 바꿈
function _setPracticePlaying(playing) {
  _practicePlaying = playing;
  if (!playing) {
    BackingTrack.stop();
    _practiceDesiredForm = null;
    // 자동 전환으로 전환 폼에 가 있으면 정지하면서 원래 폼으로 복귀
    if (_practiceAutoSwitched) {
      _practiceAutoSwitched = false;
      if (_pairTransitioned && !_transitioning) { _pairPersist = false; transitionPair(); }
    }
  } else if (_scaleKey.startsWith('secondary-')) {
    _practiceDesiredForm = 'orig'; // 재생은 항상 원래 폼에서 시작(전환 폼에 있으면 먼저 복귀)
  }
  _startPracticeChordHighlight(playing);
  const btn = document.getElementById('practice-play-btn');
  if (!btn) return;
  btn.classList.toggle('is-active', playing);
  btn.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
  lucide.createIcons();
}

async function togglePracticePlay() {
  if (_practicePlaying) {
    _setPracticePlaying(false);
    return;
  }
  _setPracticePlaying(true);
  const ok = await BackingTrack.start(
    () => ({ bpm: _practiceBpm, root: _rootNote, level: _scaleLevel }), // 재생 중 BPM 바꾸면 다음 스텝부터 반영 (키는 재생 중 잠금)
    _practiceStyle
  );
  if (!ok && _practicePlaying) _setPracticePlaying(false); // 시작 대기 중 이미 정지된 경우 외엔 원복
}

// 코드 진행 4마디 표시 — BackingTrack 진행(루트 기준 반음거리) + 현재 키/샵플랫 설정으로 코드명 계산
function renderPracticeChords() {
  const el = document.getElementById('scale-practice-chords');
  if (!el) return;
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  el.innerHTML = BackingTrack.getProgression(_scaleLevel || 1)
    .map(c => `<span class="scale-chord-item">${c.repeat ? '%' : names[(_rootNote + c.offset) % 12] + c.suffix + (c.sup ? `<sup class="scale-chord-sup">${c.sup}</sup>` : '') + (c.bass != null ? '/' + names[(_rootNote + c.bass) % 12] : '')}${c.label ? `<span class="scale-chord-label">${c.label}</span>` : ''}</span>`).join('');
  _practiceChordShown = -2; // 재생 중이면 다음 프레임에 강조 다시 입힘
}

function closePracticeMenus() {
  document.querySelectorAll('#scale-practice-opts .metronome-option-menu').forEach(el => el.classList.add('hidden'));
}

function _renderPracticeMenu(kind) {
  const menu = document.getElementById(`practice-${kind}-menu`);
  if (!menu) return;
  menu.innerHTML = '';
  const opts = kind === 'bpm'
    ? PRACTICE_BPM_OPTIONS.map(v => ({ value: v, label: String(v) }))
    : PRACTICE_STYLE_OPTIONS.map(o => ({ value: o.id, label: o.label }));
  const current = kind === 'bpm' ? _practiceBpm : _practiceStyle;
  opts.forEach(o => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'metronome-option-menu-item';
    if (o.value === current) item.classList.add('metronome-option-menu-item--active');
    item.textContent = o.label;
    item.addEventListener('pointerup', (e) => { e.stopPropagation(); _setPracticeOption(kind, o.value, o.label); });
    menu.appendChild(item);
  });
}

function _setPracticeOption(kind, value, label) {
  if (kind === 'bpm') _practiceBpm = value;
  else _practiceStyle = value;
  const valueEl = document.getElementById(`practice-${kind}-value`);
  if (valueEl) valueEl.textContent = label;
  closePracticeMenus();
}

function togglePracticeMenu(e, kind) {
  e.stopPropagation();
  if (typeof _playTap === 'function') _playTap();
  const menu = document.getElementById(`practice-${kind}-menu`);
  if (!menu) return;
  const willOpen = menu.classList.contains('hidden');
  closePracticeMenus();
  if (!willOpen) return;
  _renderPracticeMenu(kind);
  menu.classList.remove('hidden');
  const active = menu.querySelector('.metronome-option-menu-item--active');
  if (active) menu.scrollTop = active.offsetTop - (menu.clientHeight - active.offsetHeight) / 2; // 현재 값이 보이게
}

function initPracticeMode() {
  document.getElementById('scale-mic-btn')?.addEventListener('pointerup', () => { _playConfirmSfx(); togglePracticeMode(); });
  document.getElementById('practice-play-btn')?.addEventListener('pointerup', () => { _playConfirmSfx(); togglePracticePlay(); });
  document.getElementById('practice-bpm-card')?.addEventListener('pointerup', (e) => togglePracticeMenu(e, 'bpm'));
  document.getElementById('practice-style-card')?.addEventListener('pointerup', (e) => togglePracticeMenu(e, 'style'));
  document.addEventListener('pointerup', closePracticeMenus); // 바깥 탭하면 드롭업 닫기
  // 앱/탭이 백그라운드로 가거나 페이지를 떠나면 반주 즉시 중단
  document.addEventListener('visibilitychange', () => { if (document.hidden) exitPracticeMode(); });
  window.addEventListener('pagehide', exitPracticeMode);
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
      // secondary-iv/v/ii/vi: 전환 타겟 dot이 하나라도 유효범위 밖이면 블럭 자체 제외
      if (_scaleKey === 'secondary-iv' && !_pairTargetFits('major', PAIR_PARTNER_BI[bi], PAIR_STARTFRET_OFFSET[bi] || 0, sf)) return;
      if (_scaleKey === 'secondary-v'  && !_pairTargetFits('major', PAIR_PARTNER_BI_V[bi], PAIR_STARTFRET_OFFSET_V[bi] || 0, sf)) return;
      if (_scaleKey === 'secondary-ii' && !_pairTargetFits('harmonic-minor', PAIR_PARTNER_BI_II[bi], PAIR_STARTFRET_OFFSET_II[bi] || 0, sf)) return;
      if (_scaleKey === 'secondary-vi' && !_pairTargetFits('harmonic-minor', PAIR_PARTNER_BI_VI[bi], PAIR_STARTFRET_OFFSET_VI[bi] || 0, sf)) return;
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

// secondary-iv/v/ii/vi 공용: 전환 타겟 블럭(다른 scale key일 수 있음) 모든 dot이
// [0, TOTAL_FRETS) 안에 드는지 — 음 하나 빠진 스케일 블럭이 존재해선 안 됨 (2026-09-30)
function _pairTargetFits(targetScaleKey, partnerBi, offset, sf) {
  const targetBlock = ScaleData.getBlocks(targetScaleKey)[partnerBi];
  if (!targetBlock) return true;
  const gsf = sf + offset;
  return ScaleData.parseGrid(targetBlock.grid).notes.every(n => {
    const absF = gsf + n.col;
    return absF >= 0 && absF < TOTAL_FRETS;
  });
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
// ── 전환에서 달라지는 음(도수) 강조 — dot의 이동/생성이 아니라 "음" 기준 ──
// 연습자가 보고 싶은 것: 전환 전엔 어떤 음이 바뀔지, 전환 후엔 어떤 음이 새로 생겼고(=원래대로 돌아갈 때 바뀔지).
// 그래서 원래 스케일(major)과 전환 대상 스케일의 구성음(피치클래스)을 비교해,
//  - 원래 폼:   원래에만 있는 음(바뀔 음)이 찍힌 dot 전부 (이동하든 사라지든 상관없이)
//  - 전환 후 폼: 대상에만 있는 음(새로 생긴 음=돌아가면 바뀔 음)이 찍힌 dot 전부
// 에 .fb-note--pair-move(특성음과 같은 어두운 파랑)를 입힌다. 챕터2 레벨별 전환 대상 스케일:
const PAIR_TARGET_SCALE = {
  'secondary-iv':  { scale: 'major',          offset: 5 },   // 4도 메이저 (C→F)
  'secondary-v':   { scale: 'major',          offset: 7 },   // 5도 메이저 (C→G)
  'secondary-ii':  { scale: 'harmonic-minor', offset: 9 },   // 6도 하모닉 마이너 (C→Am)
  'secondary-vi':  { scale: 'harmonic-minor', offset: 2 },   // 2도 하모닉 마이너 (C→Dm)
  'secondary-iii': { scale: 'harmonic-minor', offset: 4 },   // 3도 하모닉 마이너 (C→Em)
};
const PAIR_SCALE_INTERVALS = { 'major': [0, 2, 4, 5, 7, 9, 11], 'harmonic-minor': [0, 2, 3, 5, 7, 8, 11] };
function _pairChangePcs() {
  const t = PAIR_TARGET_SCALE[_scaleKey];
  if (!t) return null;
  const pcs = (root, scale) => new Set(PAIR_SCALE_INTERVALS[scale].map(i => (root + i) % 12));
  const orig = pcs(_rootNote, 'major');
  const targ = pcs((_rootNote + t.offset) % 12, t.scale);
  return {
    changing: new Set([...orig].filter(p => !targ.has(p))),   // 원래 폼에서 바뀔 음
    arriving: new Set([...targ].filter(p => !orig.has(p))),   // 전환 후 폼에서 새로 생긴 음
  };
}
const _notePc = el => (OPEN_MIDI[parseInt(el.dataset.s)] + parseInt(el.dataset.absf)) % 12;
// 현재 폼(_pairTransitioned) 기준으로 모든 실제 dot 표시. renderNotes()와 _finishTransition() 직후 호출.
function markPairMovers(neckEl) {
  const c = _pairChangePcs();
  if (!c) return;
  const set = _pairTransitioned ? c.arriving : c.changing;
  neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
    el.classList.toggle('fb-note--pair-move', set.has(_notePc(el)));
  });
}

function _finishTransition(forward) {
  _pairTransitioned = forward;
  if (document.getElementById('fb-full-neck')) document.querySelectorAll('#fb-full-neck [data-pair-spawn]').forEach(el => el.removeAttribute('data-pair-spawn'));
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
  if (neckEl) {   // ghost가 새 상태로 갱신된 뒤에 표시(ghost와 비교하는 레벨이 있음)
    const cur = buildNavSequence()[_navIdx];
    if (cur) markPairMovers(neckEl);
  }
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
  neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost):not([data-pair-spawn])').forEach(el => {
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
  // 생성되는 순간부터 색 판정 — 전환 "도착" 폼 기준(정방향이면 새로 생긴 음, 복귀면 바뀔 음). 이후 _finishTransition에서 전체 재판정
  const _pc = _pairChangePcs();
  if (_pc && (_pairTransitioned ? _pc.changing : _pc.arriving).has(_notePc(newEl))) newEl.classList.add('fb-note--pair-move');
  newEl.dataset.pairSpawn = '1';   // 생성이 슬라이드와 동시라 이후 _applyDegMap(옛 도수 기준 재표기)이 건드리지 않도록 표시 — _finishTransition에서 해제
  if (_instantPair) { neckEl.appendChild(newEl); return; }   // 즉시 전환: 생성 애니메이션 없이 완성 상태
  newEl.style.opacity   = '0';
  newEl.style.transform = 'translate(-50%, -50%) scale(0)';
  newEl.style.transition = 'opacity ' + Math.round(PAIR_SLIDE_MS * 0.6) + 'ms ease, transform ' + PAIR_SLIDE_MS + 'ms cubic-bezier(0.34, 1.56, 0.64, 1)';
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

  const DURATION = _instantPair ? 0 : PAIR_SLIDE_MS;
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 4, 2, 4);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 1, 7);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 6번줄(s=5) degree=6 오른쪽에 degree=4 생성 (startFret+5)
      _spawnNote(neckEl, cur.startFret + 5, 5, 4);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 5번줄(s=4) degree=7 생성 (startFret+1)
      _spawnNote(neckEl, cur.startFret + 1, 4, 7);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 4번줄(s=3) degree=4 생성 (startFret+5)
      _spawnNote(neckEl, cur.startFret + 5, 3, 4);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 3번줄(s=2) degree=7 생성 (startFret+1)
      _spawnNote(neckEl, cur.startFret + 1, 2, 7);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 2번줄(s=1) degree=4 생성 (startFret+5)
      _spawnNote(neckEl, cur.startFret + 5, 1, 4);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 1번줄(s=0), 6번줄(s=5) degree=7 생성 (startFret+1)
      _spawnNote(neckEl, cur.startFret + 1, 0, 7);
      _spawnNote(neckEl, cur.startFret + 1, 5, 7);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 1번줄(s=0) degree=1 생성 (startFret+5)
      _spawnNote(neckEl, cur.startFret + 5, 0, 1);
      // 5번줄(s=4) degree=4 생성 (startFret+5)
      _spawnNote(neckEl, cur.startFret + 5, 4, 4);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      // 4번줄(s=3) degree=7 생성 (startFret+1)
      _spawnNote(neckEl, cur.startFret + 1, 3, 7);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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

  const DURATION = _instantPair ? 0 : PAIR_SLIDE_MS;
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 0, 7);
      _spawnNote(neckEl, cur.startFret + 1, 5, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 5, 1, 4);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 3, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 5, 0, 1);
      _spawnNote(neckEl, cur.startFret + 5, 4, 4);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 1, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 4, 2, 4);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 4, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 5, 5, 4);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret, 2, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 4, 3, 4);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
    }

  } else {
    _transitioning = false;
  }
}

// ── 연습 입장 언락 (scale-training '연습하기'에서 피크 5개 소모 후 sessionStorage에 저장) ──
// 새로고침은 이탈이 아니라 유지, 뒤로가기로 나가면 해제(다시 들어오려면 피크 재소모).
// 저장소를 못 쓰는 환경(예외)에서는 입장을 막지 않음 — 막으면 연습하기↔리다이렉트 무한 반복.
function _scaleUnlockKey() { return `scale_unlock_${_scaleKey}_${_scaleLevel}`; }
function _isScaleUnlocked() {
  try { return sessionStorage.getItem(_scaleUnlockKey()) === '1'; } catch (e) { return true; }
}
function _clearScaleUnlock() {
  try { sessionStorage.removeItem(_scaleUnlockKey()); } catch (e) {}
}

// 뒤로가기(탑바·Android·브라우저 제스처 전부 여기로 옴) — 나가면 피크가 다시 필요하므로 한 번 확인
async function closeScaleLevel() {
  _playTap();
  if (isLeavePracticeOpen()) return;
  const peakAtStake = getPlan() !== 'pro'; // Pro는 피크를 안 쓰므로 "피크 다시 필요" 경고 불필요
  if (_tutorialMode) {
    // 모달이 연달아 두 번 뜨지 않게 하나로: 피크 경고(기본 문구) 우선, Pro면 튜토리얼 문구
    showLeavePracticeModal(() => { _tutorialAbort(); _leaveScaleLevel(); }, peakAtStake ? undefined : _TUTORIAL_LEAVE_OPTS);
    return;
  }
  if (peakAtStake) { showLeavePracticeModal(_leaveScaleLevel); return; }
  _leaveScaleLevel();
}

async function _leaveScaleLevel() {
  exitPracticeMode();
  _clearScaleUnlock();
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
  const isBlue5 = (degree === -5 && _scaleKey !== 'altered')   // altered #11은 특징음 강조 없음
               || (degree === -3 && _scaleKey === 'major-blues');   // 메이저 블루스의 블루스 노트는 b3
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

  markPairMovers(neckEl);

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
  document.getElementById('test-back-btn')?.classList.add('is-visible');
}

// ── "?" 버튼 튜토리얼 (2026-09-27 최초구현, 2026-09-27 레벨 일반화) ──────────────────
// 테스트 오버레이를 재사용하되 제출버튼 대신 "다음"으로 단계 진행. 지금 화면 상태가 아니라
// 고정된 기준 폼(TUTORIAL_SCALE_CONFIG의 스케일별 rootNote 기준 A폼)을 사용.
// 전환형 등 복잡한 스케일은 대상 아님(추후 결정).
const TUTORIAL_NEXT_BTN_BUFFER_MS = 100; // 다음 버튼 활성화 표준 버퍼 — 애니메이션 완전종료 + 0.1s (2026-09-27)
const TUTORIAL_DOT_FADE_MS = 200; // .fb-note--spawn CSS transition(0.2s)과 동일값 — 여기만 참조
const TUTORIAL_TEXT_SEQUENCE_PAUSE_MS = 1200; // texts[] 자동 넘김 시 읽는 시간(2026-09-27)
const TUTORIAL_DOT_FADE_SLOW_MS = 1500; // fillRemaining 전체동시 팝인용 느린 트랜지션 — 텍스트 등장(1.5s)과 동일 맞춤(CSS와 짝, 2026-09-27)
// 레벨(스케일 타입)별 튜토리얼 데이터 — STEP1 문구/데모 키/데모 폼을 이 표에서 자동 조회(2026-09-27).
// rootNote: 0=C ~ 11=B (scale-data.js 12키 계산용 인덱스와 동일).
// demoForm: 튜토리얼이 보여줄 기준 폼(A/G/E/D/C폼) — 3~6프렛대에 걸리는 폼을 우선 선택(2026-09-28, 사용자 확정).
// 새 레벨 추가 시 여기만 채우면 됨.
const TUTORIAL_SCALE_CONFIG = {
  'major':      { name: '메이저 스케일',          degreeNames: '도레미파솔라시', rootNote: 0, demoForm: 'A폼' },  // Ckey
  'major-pentatonic': { name: '메이저 펜타토닉 스케일', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼 = 근음 5번줄 3프렛(2~5프렛)
  'major-blues':      { name: '메이저 블루스 스케일',   rootNote: 0, demoForm: 'A폼', bluesDegree: -3 },  // Ckey, 블루스 노트 = b3
  'pentatonic': { name: '마이너 펜타토닉 스케일', rootNote: 9, demoForm: 'E폼' },  // Am key, E폼=3프렛 시작(2026-09-28)
  'blues':      { name: '마이너 블루스 스케일',   rootNote: 9, demoForm: 'E폼' },  // Am key, E폼=3프렛 시작(2026-09-28)
  'natural-minor': { name: '내추럴 마이너 스케일', rootNote: 9, demoForm: 'Em폼' },  // Am key, Em폼=3프렛 시작(2026-09-28, 사용자 확정)
  'harmonic-minor': { name: '하모닉 마이너 스케일', rootNote: 0, demoForm: 'Am폼' },  // Ckey로 변경(2026-09-29, 사용자 확정) — Cm폼은 startFret -1(무효)이라 Am폼(startFret 2) 사용
  // 아래부터는 챕터2(전환형 secondary-*) 제외한 나머지 전부 — Ckey 기준(2026-09-28, 사용자 확정)
  'melodic-minor':      { name: '멜로딕 마이너 스케일',      rootNote: 0, demoForm: 'C폼' },  // idx4 블록 근음 5번줄 3프렛(2026-09-29 검증)
  'phrygian-dominant':  { name: '프리지안 도미넌트 스케일',  rootNote: 0, demoForm: 'D폼' },
  'mixolydian-b9b13':   { name: '믹솔리디안 b9 b13 스케일',  rootNote: 0, demoForm: 'E폼' },  // idx2 블록 근음 5번줄 3프렛(2026-09-29 검증) — 챕터4는 특징음 강조 없이 파생설명 방식
  'mixolydian-b13':     { name: '믹솔리디안 9 b13 스케일',   rootNote: 0, demoForm: 'E폼' },  // idx2 블록 근음 5번줄 3프렛(2026-09-29 검증)
  'lydian-dominant':    { name: '리디안 도미넌트 스케일',    rootNote: 0, demoForm: 'G폼' },
  'locrian-sharp2':     { name: '로크리안 내추럴2 스케일',   rootNote: 0, demoForm: 'E폼' },  // idx2 블록 근음 5번줄 3프렛(2026-09-29 검증)
  'locrian-sharp6':     { name: '로크리안 내추럴6 스케일',   rootNote: 0, demoForm: 'A폼' },  // idx0 블록 근음 5번줄 3프렛(2026-09-29 검증)
  'altered':            { name: '얼터드 스케일',             rootNote: 0, demoForm: 'D폼' },  // idx3 블록 근음 5번줄 3프렛(2026-09-29 검증)
  'mixolydian':         { name: '믹솔리디안 스케일',         rootNote: 0, demoForm: 'D폼', charDegree: -7 },  // idx3 블록 근음 5번줄 3프렛(2026-09-29 검증) / 특징음=b7
  'ionian':             { name: '아이오니안 스케일',         rootNote: 0, demoForm: 'A폼', charDegree: 4 },  // 근음 5번줄 3프렛(A폼)로 변경(2026-09-29) / 특징음=4도
  'dorian':             { name: '도리안 스케일',             rootNote: 0, demoForm: 'G폼', charDegree: 6 },  // idx1 블록의 근음이 5번줄 3프렛(2026-09-29 검증, positional fallback상 이름은 G폼이지만 실제 도형은 A폼 자리)
  'phrygian':           { name: '프리지안 스케일',           rootNote: 0, demoForm: 'E폼', charDegree: -2 },  // idx2 블록 근음 5번줄 3프렛(2026-09-29 검증) / 특징음=b2
  'lydian':             { name: '리디안 스케일',             rootNote: 0, demoForm: 'E폼', charDegree: -5 },  // idx2 블록 근음 5번줄 3프렛(2026-09-29 검증) / 특징음=#4
  'aeolian':            { name: '에올리안 스케일',           rootNote: 0, demoForm: 'C폼', charDegree: -6 },  // idx4 블록 근음 5번줄 3프렛(2026-09-29 검증) / 특징음=b6
  'locrian':            { name: '로크리안 스케일',           rootNote: 0, demoForm: 'A폼', charDegree: -5 },  // idx0 블록 근음 5번줄 3프렛(2026-09-29 검증) / 특징음=b5
  // 챕터2(전환형 secondary-*) — 세컨더리 도미넌트 스케일. name=도미넌트7코드→타겟코드 진행 설명용(2026-09-30).
  'secondary-iv': { name: '4도 메이저 전환', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼(bi=0)↔D폼(bi=3), C7→F
  'secondary-v':  { name: '5도 메이저 전환', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼(bi=0)↔E폼(bi=2), D7→G
  'secondary-ii': { name: '6도 마이너 전환', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼(bi=0)↔Gm폼(harmonic-minor bi=0), E7→Am
  'secondary-vi': { name: '2도 마이너 전환', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼(bi=0)↔Cm폼(harmonic-minor bi=3), A7→Dm
  'secondary-iii': { name: '3도 마이너 전환', rootNote: 0, demoForm: 'A폼' },  // Ckey, A폼(bi=0)↔E하모닉마이너(델타시스템), B7→Em
};

// 챕터2(secondary-iv) 전용 시연 멜로디 — 사용자가 직접 지정(2026-09-30, C7→F 진행 예시).
// chords: 코드라벨 3개(C/C7/F) — chords[note.chordIdx]가 그 음이 울릴 때 강조표시할 코드.
// notes: s(0~5, 0=1번줄/high E)·absF(실제 프렛)·chordIdx로 17음 고정 시퀀스.
// 전환 애니메이션(fade/slide/spawn) 자체는 _tutorialAnimateSecondaryIVTransition()에 A폼↔D폼
// 전용으로 하드코딩됨 — 다른 레벨(7~10) 추가 시 그 레벨 전용 애니메이션 함수를 따로 만들어야 함.
const PAIR_TRANSITION_DEMO = {
  'secondary-iv': {
    chords: ['C', 'C7', 'F'],
    // 코드 백킹(피아노) — 각 코드 시작 노트 인덱스(barStartIdx)에 해당 구성음(MIDI)을 그만큼 울림.
    // C3(48) 근처로 배치해 멜로디(2~4옥타브대)보다 낮은 백킹 톤으로 깔림(2026-09-30).
    // 4마디 체계(2026-10-01 확정): 1·2마디는 기존 승인된 멜로디 그대로, 3·4마디만 신규 추가
    // (착지음에서 5음 상행+3음 하행 / 4마디 최종 착지).
    chordBacking: [
      { atIdx: 0,  midis: [48, 52, 55],     durationSec: 3.0 },  // C  (1마디, 8음×380ms)
      { atIdx: 8,  midis: [48, 52, 55, 58], durationSec: 3.0 },  // C7 (2마디, 8음×380ms)
      { atIdx: 16, midis: [53, 57, 60],     durationSec: 4.2 },  // F  (3+4마디, 9음)
    ],
    notes: [
      { s: 2, absF: 5, chordIdx: 0 }, // C  (3번줄5F)
      { s: 1, absF: 3, chordIdx: 0 }, // D  (2번줄3F)
      { s: 1, absF: 5, chordIdx: 0 }, // E  (2번줄5F)
      { s: 1, absF: 6, chordIdx: 0 }, // F  (2번줄6F)
      { s: 0, absF: 3, chordIdx: 0 }, // G  (1번줄3F)
      { s: 1, absF: 6, chordIdx: 0 }, // F
      { s: 1, absF: 5, chordIdx: 0 }, // E
      { s: 1, absF: 3, chordIdx: 0 }, // D
      { s: 2, absF: 5, chordIdx: 1 }, // C  (전환 시작 — 공유음)
      { s: 2, absF: 3, chordIdx: 1 }, // Bb (3번줄3F)
      { s: 2, absF: 2, chordIdx: 1 }, // A  (3번줄2F)
      { s: 3, absF: 5, chordIdx: 1 }, // G  (4번줄5F)
      { s: 3, absF: 3, chordIdx: 1 }, // F  (4번줄3F, 전환블럭 루트)
      { s: 3, absF: 2, chordIdx: 1 }, // E  (4번줄2F)
      { s: 4, absF: 5, chordIdx: 1 }, // D  (5번줄5F)
      { s: 3, absF: 2, chordIdx: 1 }, // E
      { s: 3, absF: 3, chordIdx: 2 }, // F  (착지음 — 3마디 시작, 역전환 후 다이어토닉 원폼)
      { s: 3, absF: 5, chordIdx: 2 }, // G
      { s: 2, absF: 2, chordIdx: 2 }, // A
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 2, absF: 5, chordIdx: 2 }, // C  (5음 상행 종료)
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 2, absF: 2, chordIdx: 2 }, // A
      { s: 3, absF: 5, chordIdx: 2 }, // G  (3음 하행 종료)
      { s: 3, absF: 3, chordIdx: 2 }, // F  (최종 착지음, 4마디)
    ],
  },
  'secondary-v': {
    chords: ['Dm7', 'D7', 'G7'],
    // 4마디 체계(2026-10-01 확정): 1·2마디는 기존 승인된 멜로디 그대로, 3·4마디만 신규 추가
    // (착지음에서 5음 상행+3음 하행 / 4마디 최종 착지).
    chordBacking: [
      { atIdx: 0,  midis: [50, 53, 57, 60], durationSec: 3.0 },  // Dm7 (1마디)
      { atIdx: 8,  midis: [50, 54, 57, 60], durationSec: 3.0 },  // D7  (2마디)
      { atIdx: 16, midis: [55, 59, 62, 65], durationSec: 4.2 },  // G7  (3+4마디, 9음)
    ],
    notes: [
      { s: 1, absF: 3, chordIdx: 0 }, // D  (2번줄3F)
      { s: 1, absF: 5, chordIdx: 0 }, // E  (2번줄5F)
      { s: 1, absF: 6, chordIdx: 0 }, // F  (2번줄6F)
      { s: 0, absF: 3, chordIdx: 0 }, // G  (1번줄3F)
      { s: 0, absF: 5, chordIdx: 0 }, // A  (1번줄5F)
      { s: 0, absF: 3, chordIdx: 0 }, // G
      { s: 1, absF: 6, chordIdx: 0 }, // F
      { s: 1, absF: 5, chordIdx: 0 }, // E
      { s: 1, absF: 3, chordIdx: 1 }, // D  (전환 시작 — 공유음)
      { s: 2, absF: 5, chordIdx: 1 }, // C  (3번줄5F)
      { s: 2, absF: 4, chordIdx: 1 }, // B  (3번줄4F)
      { s: 2, absF: 2, chordIdx: 1 }, // A  (3번줄2F)
      { s: 3, absF: 5, chordIdx: 1 }, // G  (4번줄5F)
      { s: 3, absF: 4, chordIdx: 1 }, // F# (4번줄4F, 전환블럭 루트 한음 아래=리딩톤)
      { s: 3, absF: 2, chordIdx: 1 }, // E  (4번줄2F)
      { s: 3, absF: 4, chordIdx: 1 }, // F#
      { s: 3, absF: 5, chordIdx: 2 }, // G  (착지음 — 3마디 시작, G믹솔리디안=C는 어보이드노트라 건너뜀)
      { s: 2, absF: 2, chordIdx: 2 }, // A
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 1, absF: 3, chordIdx: 2 }, // D  (C 건너뜀)
      { s: 1, absF: 5, chordIdx: 2 }, // E  (5음 상행 종료)
      { s: 1, absF: 3, chordIdx: 2 }, // D
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 2, absF: 2, chordIdx: 2 }, // A  (3음 하행 종료)
      { s: 3, absF: 5, chordIdx: 2 }, // G  (최종 착지음, 4마디)
    ],
  },
  'secondary-ii': {
    chords: ['C', 'E7', 'Am'],
    // 4마디 체계(2026-10-01 확정): 1마디 원폼런 / 2마디 전환화성음(G#) 고음→저음 완주하행 /
    // 3마디 착지음에서 5음 상행+3음 하행 / 4마디 최종 착지.
    chordBacking: [
      { atIdx: 0,  midis: [48, 52, 55],     durationSec: 3.0 },  // C   (1마디)
      { atIdx: 8,  midis: [52, 56, 59, 62], durationSec: 3.0 },  // E7  (2마디)
      { atIdx: 16, midis: [57, 60, 64],     durationSec: 4.2 },  // Am  (3+4마디, 9음)
    ],
    notes: [
      { s: 2, absF: 5, chordIdx: 0 }, // C  (3번줄5F)
      { s: 1, absF: 3, chordIdx: 0 }, // D  (2번줄3F)
      { s: 1, absF: 5, chordIdx: 0 }, // E  (2번줄5F)
      { s: 1, absF: 6, chordIdx: 0 }, // F  (2번줄6F)
      { s: 0, absF: 3, chordIdx: 0 }, // G  (1번줄3F)
      { s: 1, absF: 6, chordIdx: 0 }, // F
      { s: 1, absF: 5, chordIdx: 0 }, // E
      { s: 1, absF: 3, chordIdx: 0 }, // D
      { s: 0, absF: 4, chordIdx: 1 }, // G# (1번줄4F, 전환 시작 — 증2도 고음)
      { s: 1, absF: 6, chordIdx: 1 }, // F
      { s: 1, absF: 5, chordIdx: 1 }, // E
      { s: 1, absF: 3, chordIdx: 1 }, // D
      { s: 2, absF: 5, chordIdx: 1 }, // C
      { s: 2, absF: 4, chordIdx: 1 }, // B
      { s: 2, absF: 2, chordIdx: 1 }, // A
      { s: 3, absF: 6, chordIdx: 1 }, // G# (4번줄6F, 증2도 저음 — 한옥타브 완주하행 종료)
      { s: 2, absF: 2, chordIdx: 2 }, // A  (3번줄2F, 착지음 — 3마디 시작)
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 2, absF: 5, chordIdx: 2 }, // C
      { s: 1, absF: 3, chordIdx: 2 }, // D
      { s: 1, absF: 5, chordIdx: 2 }, // E  (5음 상행 종료)
      { s: 1, absF: 3, chordIdx: 2 }, // D
      { s: 2, absF: 5, chordIdx: 2 }, // C
      { s: 2, absF: 4, chordIdx: 2 }, // B  (3음 하행 종료)
      { s: 2, absF: 2, chordIdx: 2 }, // A  (최종 착지음, 4마디)
    ],
  },
  'secondary-vi': {
    chords: ['C', 'A7', 'Dm'],
    chordBacking: [
      { atIdx: 0,  midis: [48, 52, 55],     durationSec: 3.0 },  // C   (1마디)
      { atIdx: 8,  midis: [45, 49, 52, 55], durationSec: 3.0 },  // A7  (2마디)
      { atIdx: 16, midis: [50, 53, 57],     durationSec: 4.2 },  // Dm  (3+4마디, 9음)
    ],
    notes: [
      { s: 2, absF: 5, chordIdx: 0 }, // C  (3번줄5F)
      { s: 1, absF: 3, chordIdx: 0 }, // D  (2번줄3F)
      { s: 1, absF: 5, chordIdx: 0 }, // E  (2번줄5F)
      { s: 1, absF: 6, chordIdx: 0 }, // F  (2번줄6F)
      { s: 0, absF: 3, chordIdx: 0 }, // G  (1번줄3F)
      { s: 1, absF: 6, chordIdx: 0 }, // F
      { s: 1, absF: 5, chordIdx: 0 }, // E
      { s: 1, absF: 3, chordIdx: 0 }, // D
      { s: 2, absF: 6, chordIdx: 1 }, // C# (3번줄6F, 전환 시작 — 리딩톤 고음)
      { s: 2, absF: 3, chordIdx: 1 }, // Bb (3번줄3F)
      { s: 2, absF: 2, chordIdx: 1 }, // A  (3번줄2F)
      { s: 3, absF: 5, chordIdx: 1 }, // G  (4번줄5F)
      { s: 3, absF: 3, chordIdx: 1 }, // F  (4번줄3F)
      { s: 3, absF: 2, chordIdx: 1 }, // E  (4번줄2F)
      { s: 4, absF: 5, chordIdx: 1 }, // D  (5번줄5F)
      { s: 4, absF: 4, chordIdx: 1 }, // C# (5번줄4F, 저음 — 한옥타브 완주하행 종료)
      { s: 4, absF: 5, chordIdx: 2 }, // D  (5번줄5F, 착지음 — 3마디 시작, 역전환 후 다이어토닉 원폼)
      { s: 3, absF: 2, chordIdx: 2 }, // E
      { s: 3, absF: 3, chordIdx: 2 }, // F
      { s: 3, absF: 5, chordIdx: 2 }, // G
      { s: 2, absF: 2, chordIdx: 2 }, // A  (5음 상행 종료)
      { s: 3, absF: 5, chordIdx: 2 }, // G
      { s: 3, absF: 3, chordIdx: 2 }, // F
      { s: 3, absF: 2, chordIdx: 2 }, // E  (3음 하행 종료)
      { s: 4, absF: 5, chordIdx: 2 }, // D  (최종 착지음, 4마디)
    ],
  },
  'secondary-iii': {
    chords: ['C', 'B7', 'Em'],
    chordBacking: [
      { atIdx: 0,  midis: [48, 52, 55],     durationSec: 3.0 },  // C   (1마디)
      { atIdx: 8,  midis: [47, 51, 54, 57], durationSec: 3.0 },  // B7  (2마디, B D# F# A)
      { atIdx: 16, midis: [52, 55, 59],     durationSec: 4.2 },  // Em  (3+4마디, 9음)
    ],
    notes: [
      { s: 2, absF: 5, chordIdx: 0 }, // C  (3번줄5F)
      { s: 1, absF: 3, chordIdx: 0 }, // D  (2번줄3F)
      { s: 1, absF: 5, chordIdx: 0 }, // E  (2번줄5F)
      { s: 1, absF: 6, chordIdx: 0 }, // F  (2번줄6F)
      { s: 0, absF: 3, chordIdx: 0 }, // G  (1번줄3F)
      { s: 1, absF: 6, chordIdx: 0 }, // F
      { s: 1, absF: 5, chordIdx: 0 }, // E
      { s: 1, absF: 3, chordIdx: 0 }, // D
      { s: 1, absF: 4, chordIdx: 1 }, // D# (2번줄4F, 전환 시작 — 리딩톤 고음)
      { s: 2, absF: 5, chordIdx: 1 }, // C  (3번줄5F)
      { s: 2, absF: 4, chordIdx: 1 }, // B  (3번줄4F)
      { s: 2, absF: 2, chordIdx: 1 }, // A  (3번줄2F)
      { s: 3, absF: 5, chordIdx: 1 }, // G  (4번줄5F)
      { s: 3, absF: 4, chordIdx: 1 }, // F# (4번줄4F)
      { s: 3, absF: 2, chordIdx: 1 }, // E  (4번줄2F)
      { s: 4, absF: 6, chordIdx: 1 }, // D# (5번줄6F, 저음 — 한옥타브 완주하행 종료)
      { s: 3, absF: 2, chordIdx: 2 }, // E  (4번줄2F, 착지음 — 3마디 시작, E프리지안=F·C 둘 다 어보이드노트라 건너뜀)
      { s: 3, absF: 5, chordIdx: 2 }, // G  (F 건너뜀)
      { s: 2, absF: 2, chordIdx: 2 }, // A
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 1, absF: 3, chordIdx: 2 }, // D  (C 건너뜀, 5음 상행 종료)
      { s: 2, absF: 4, chordIdx: 2 }, // B
      { s: 2, absF: 2, chordIdx: 2 }, // A
      { s: 3, absF: 5, chordIdx: 2 }, // G  (3음 하행 종료)
      { s: 3, absF: 2, chordIdx: 2 }, // E  (최종 착지음, 4마디)
    ],
  },
};

// 모드 스케일 비교용 예시 멜로디(바흐 미뉴엣풍) — 도수로 저장, 다른 모드에 적용할 땐 이 도수 배열 그대로
// 재사용하고 각 모드의 실제 음정만 갈아끼우면 됨(2026-09-29, 사용자 확정).
const MODE_MELODY_DEGREES = [5, 1, 2, 3, 4, 5, 1, 1, 6, 4, 5, 6, 7, 8, 1, 1]; // 8=옥타브 위 근음(2026-09-29, 마지막 C-C-C 트리오의 첫 C)
// 미뉴엣풍 3/4박자 리듬 — 한 구(8음)당 [긴-짧-짧-짧-짧-긴-긴-긴](4분-8분×4-4분-4분-4분,
// 3/4박자 2마디) 패턴을 두 구(총 4마디)에 반복 적용(2026-09-29, 사용자 확정).
const MODE_MELODY_DURATIONS = [
  460, 230, 230, 230, 230, 460, 460, 460,
  460, 230, 230, 230, 230, 460, 460, 1500, // 맨 마지막 음만 더 길게(2026-09-29, 사용자 확정)
];

// 튜토리얼 전용: secondary-*(짝궁 전환형)는 scale-data.js에 자체 블록이 없고 buildNavSequence()처럼
// 항상 'major' 블록을 사용 — 그대로 넘기면 getBlocks가 빈 배열을 반환해 크래시남(2026-09-30 발견).
function _tutorialBlockKey(scaleKey) {
  return (scaleKey === 'secondary-iv' || scaleKey === 'secondary-v' || scaleKey === 'secondary-ii' || scaleKey === 'secondary-vi' || scaleKey === 'secondary-iii') ? 'major' : scaleKey;
}

// 스케일의 도수 구성('1 b3 4 5 b7' 형식)을 블록 grid에서 그대로 계산 — 새 레벨 추가해도 손댈 필요 없음(2026-09-28).
// 표기는 기존 degreeLabel()(1791줄) 그대로 재사용 — lydian의 b5→#4, altered/믹솔리디안b9b13 등의
// 텐션 표기(b9/#9/#11/b13)까지 이미 스케일별로 맞춰져 있어서 중복 구현 안 함(2026-09-28).
function _tutorialGetDegreeFormula(scaleKey) {
  const block = ScaleData.getBlocks(_tutorialBlockKey(scaleKey))[0];
  if (!block) return '';
  const notes = ScaleData.parseGrid(block.grid).notes;
  const degSet = new Set(notes.map(n => n.degree));
  const sorted = Array.from(degSet).sort((a, b) => {
    const ka = Math.abs(a) * 10 + (a < 0 ? 0 : 1);
    const kb = Math.abs(b) * 10 + (b < 0 ? 0 : 1);
    return ka - kb;
  });
  return sorted.map(d => degreeLabel(d, scaleKey)).join(' ');
}

// 스케일 구성음을 알파벳 음이름으로 계산('A C D Eb E G' 형식) — 레벨2+ 전용,
// 계이름(도레미파솔라시)은 도수 알테레이션(b5 등)을 표현 못 해서 음이름으로 대체(2026-09-28, 사용자 확정).
function _tutorialGetNoteNames(scaleKey, rootNote) {
  const block = ScaleData.getBlocks(_tutorialBlockKey(scaleKey))[0];
  if (!block) return '';
  const startFret = ScaleData.getStartFrets(block, rootNote)[0];
  const notes = ScaleData.parseGrid(block.grid).notes.map(n => ({ ...n, absF: startFret + n.col }));
  const degSet = new Set(notes.map(n => n.degree));
  const sorted = Array.from(degSet).sort((a, b) => {
    const ka = Math.abs(a) * 10 + (a < 0 ? 0 : 1);
    const kb = Math.abs(b) * 10 + (b < 0 ? 0 : 1);
    return ka - kb;
  });
  return sorted.map(d => {
    const note = notes.find(n => n.degree === d);
    const pc = ((OPEN_MIDI[note.s] + note.absF) % 12 + 12) % 12;
    // b도수(flat 표기, 예: b6)는 플랫 스펠링, 그 외(자연/증음정 도수, 예: harmonic-minor의 7=리딩톤)는
    // 샵 스펠링 — 안 그러면 G#이 Ab로 잘못 표기됨(2026-09-28, harmonic-minor 검증 중 발견/수정).
    // 예외: 리디안의 -5는 실제로 '#4'(증4도) 관행 표기라 항상 샵 스펠링(2026-09-29, degreeLabel과 동일 특례).
    const useSharp = d >= 0 || (scaleKey === 'lydian' && d === -5);
    return (useSharp ? KEY_NAMES : KEY_NAMES_FLAT)[pc];
  }).join(' ');
}

// STEP1(도입) 문구만 스케일별로 자동 생성, 나머지 단계는 공용(2026-09-27).
// 레벨1(메이저)은 기존 문구 유지, 레벨2부터는 "구성음 → 도수 공식" 2줄 설명으로 전환(2026-09-28, 사용자 확정).
function buildTutorialSteps(scaleKey) {
  // 챕터2(짝궁 전환형)는 "세컨더리 도미넌트" 개념 자체가 다른 챕터와 완전히 다른 서사라
  // 공용 템플릿을 거치지 않고 레벨별 전용 스텝을 그대로 반환(2026-09-30, 사용자 확정 흐름).
  if (scaleKey === 'secondary-iv') return _buildSecondaryIVTutorialSteps();
  if (scaleKey === 'secondary-v') return _buildSecondaryVTutorialSteps();
  if (scaleKey === 'secondary-ii') return _buildSecondaryIITutorialSteps();
  if (scaleKey === 'secondary-vi') return _buildSecondaryVITutorialSteps();
  if (scaleKey === 'secondary-iii') return _buildSecondaryIIITutorialSteps();
  const cfg = TUTORIAL_SCALE_CONFIG[scaleKey] || TUTORIAL_SCALE_CONFIG['major'];
  const chordLetter = cfg.demoForm.replace(/폼$/, '');
  const introLeadTexts = scaleKey === 'major' ? [
    `이번 시간에는 '${cfg.name}'을 배워볼게요!`,
    `${cfg.name}은 우리에게 익숙한\n'${cfg.degreeNames}'\n음계를 의미해요.`
  ] : [
    `이번 시간에는 '${cfg.name}'을 배워볼게요!`,
    // 펜타토닉 전용 강조 문구(2026-09-29)
    ...(scaleKey === 'pentatonic' ? [`거의 모든 멜로디의 뼈대가 되는\n중요한 스케일이에요.`] : []),
    ...(scaleKey === 'major-pentatonic' ? [`가요, 팝, 록, J-pop 같은\n대중음악 멜로디의 뼈대가 되는 스케일이에요.`] : []),
    `${cfg.name}은\n'${_tutorialGetNoteNames(scaleKey, cfg.rootNote)}'로 이루어져요.`,
    `도수로 표현한다면 ${_tutorialGetDegreeFormula(scaleKey)} 가 돼요!`
  ];
  // 레벨1~11(major/pentatonic/blues/natural-minor/harmonic-minor/ionian)은 기존 방식 유지,
  // 레벨12(dorian)부터는 부가설명 줄인 새 도입부 템플릿 사용(2026-09-29, 사용자 확정).
  const LEGACY_INTRO_KEYS = ['major', 'major-pentatonic', 'major-blues', 'pentatonic', 'blues', 'natural-minor', 'harmonic-minor'];
  // 아이오니안 제외 나머지 6개 모드 — 공통 연습권유+종료 문구에 사용(2026-09-29)
  const CHAPTER3_MODE_KEYS = ['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
  // 챕터4(재즈 스케일) — 미뉴엣 멜로디 데모 없음, 파생설명 방식으로 대체(2026-09-29, 사용자 확정)
  const CHAPTER4_KEYS = ['mixolydian-b9b13', 'melodic-minor', 'altered', 'locrian-sharp6',
    'lydian-dominant', 'mixolydian-b13', 'locrian-sharp2'];
  // formNav 직후 바로 이어서 보여줄 특징음 설명 — formNav의 thenAction으로 체이닝(2026-09-29,
  // 클릭 한번으로 formNav+특징음 강조까지 연달아 진행, 그동안 네비 클릭 잠금).
  // 문구는 cfg.charDegree를 degreeLabel()로 그대로 표기(정확한 도수, 예: #4/b7) — "몇 번째 음"이
  // 아니라 실제 도수 표기로 통일(2026-09-29, 사용자 확정).
  const CHAR_NOTE_TEXTS = {};
  Object.keys(TUTORIAL_SCALE_CONFIG).forEach(key => {
    const c = TUTORIAL_SCALE_CONFIG[key];
    if (c.charDegree != null) {
      CHAR_NOTE_TEXTS[key] = `${c.name}의 특징음은\n${degreeLabel(c.charDegree, key)} 음이에요.`;
    }
  });
  return [
    ...(scaleKey === 'ionian' ? [
      // 챕터3(모드 스케일) 개념 텍스트 먼저, 마지막 문구 뜬 뒤에 A폼 블럭 채움(2026-09-29, 사용자 확정)
      { type: 'text', text: "챕터3에서는 모드 스케일에 대한\n개념을 배울거예요." },
      { type: 'text', text: "모드란, 쉽게 말하자면\n'특색 있는 분위기'를 표현해주는 도구라고 생각하면 돼요." },
      { type: 'text', text: "이번 챕터에서 여러가지\n모드들을 배워보도록 할게요!" },
      { type: 'text', text: "그 첫번째는\n'아이오니안 스케일'이에요." },
      { type: 'action', action: 'fillBlockInstant', thenAction: 'highlightOctaveRun' }, // 클릭 한번으로 채움+하이라이트 이어서(2026-09-29)
    ] : LEGACY_INTRO_KEYS.includes(scaleKey) ? [
      { type: 'action', action: 'octaveRun', leadTexts: introLeadTexts }, // 2026-09-27: 원래 text 단계 2개 + 별도 액션단계였던 걸 전부 한 단계로 합침(leadTexts 다 끝난 뒤 액션 시작)
    ] : [
      // 챕터3(모드 스케일) 공통 새 도입부: 인사 텍스트 뜬 뒤 A폼 블럭 채우고(2026-09-29) →
      // (구성음/도수 7x2그리드 유지한 채로) 옥타브런은 파란색 하이라이트로 이어서 재생
      { type: 'action', action: 'fillBlockInstant', text: `이번 시간에는 '${cfg.name}'을 배워볼게요!` }, // 인사 텍스트 뜬 뒤 바로 블럭 채움(2026-09-29, 1·2단계 병합)
      { type: 'action', action: 'noteNameGrid', text: '구성음은 다음과 같아요!', thenAction: 'highlightOctaveRun', gridRows: [
        _tutorialGetNoteNames(scaleKey, cfg.rootNote).split(' '),
        _tutorialGetDegreeFormula(scaleKey).split(' '),
      ] },
      ...(CHAPTER4_KEYS.includes(scaleKey) ? [] : [
        { type: 'action', action: 'playModeMelody', text: `${cfg.name.replace(/\s*스케일$/, '')}의 색을 입힌 미뉴엣은 어떤 느낌일 지 들어봅시다!` }, // 챕터3 공통 멜로디 데모 — 모드마다 자동으로 그 모드 음정으로 재생(2026-09-29)
      ]),
    ]),
    ...(scaleKey === 'dorian' ? [
      { type: 'text', texts: [
        "도리안의 색채는\n어떻게 느껴졌나요?",
        "일반적으로는 신비로움 또는\n웅장하고 영웅적인 분위기,\n중세 유럽같은 느낌을 낸다고 평가를 많이 해요."
      ] },
    ] : []),
    ...(scaleKey === 'phrygian' ? [
      { type: 'text', texts: [
        "프리지안의 색채는\n어떻게 느껴졌나요?",
        "일반적으로는 어둡고 강렬한 긴장감 있는 분위기,\n스페인 플라멩고 같은 느낌을 낸다고 평가를 많이 해요."
      ] },
    ] : []),
    ...(scaleKey === 'lydian' ? [
      { type: 'text', texts: [
        "리디안의 색채는\n어떻게 느껴졌나요?",
        "신비로운 미지의 세계,\n초현실적인 경험에 대한 설렘을 느끼게 해요.",
        "디즈니, SF영화, 어드벤처 장르의\n배경음악으로 많이 들을 수 있어요."
      ] },
    ] : []),
    ...(scaleKey === 'mixolydian' ? [
      { type: 'text', texts: [
        "믹솔리디안의 색채는\n어떻게 느껴졌나요?",
        "호쾌하고 털털한\n분위기를 느끼게 해요.",
        "영미권의 락 음악에서\n많이 들을 수 있어요."
      ] },
    ] : []),
    ...(scaleKey === 'aeolian' ? [
      { type: 'text', texts: [
        "에올리안의 색채는\n어떻게 느껴졌나요?",
        "사실 에올리안은\n'내추럴 마이너'의 다른 이름이에요.",
        "슬프고 서정적인 음악을 할 때\n제일 많이 쓰이는 무난한 음계예요."
      ] },
    ] : []),
    ...(scaleKey === 'locrian' ? [
      { type: 'text', texts: [
        "로크리안의 색채는\n어떻게 느껴졌나요?",
        "기괴함과 공포,\n극도의 불안감을 자아내는 분위기예요.",
        "대중음악보다는 영화음악처럼\n목적이 있는 곳에 많이 쓰여요."
      ] },
    ] : []),
    // 음이름(알파벳)·도수(숫자) 개념 소개 — 레벨1(메이저)에서만, 다른 레벨은 이미 아는 개념이라 생략(2026-09-29).
    // 설명 텍스트와 그리드를 별도 스텝으로 분리(2026-09-29, 사용자 확정).
    ...(scaleKey === 'major' ? [
      { type: 'text', text: "기타에서는 음이름을 알파벳으로 많이 표기해요.\n그 음의 순서를 숫자로도 나타낼 수 있어요." },
      { type: 'action', action: 'noteNameGrid' },
      { type: 'text', text: "앞으로는 음이름과 숫자(도수)를 사용할게요.\n기타에서는 두 방식이 주로 쓰여요." },
    ] : []),
    ...(scaleKey === 'major-pentatonic' ? [
      { type: 'text', text: "메이저 스케일에서 4도와 7도를 빼면\n메이저 펜타토닉이 돼요." },
      { type: 'text', text: "음이 5개뿐이라 어느 음을 눌러도\n어색하지 않아서 연습하기 좋아요." },
    ] : []),
    ...(scaleKey === 'major-blues' ? [
      { type: 'action', action: 'highlightBluesNote', texts: [
        "메이저 펜타토닉에 한 음을 더하면\n'메이저 블루스 스케일'이 돼요.",
        "이렇게 추가된 음(b3)을\n'블루스 노트'라고 불러요."
      ] },
      { type: 'text', text: "블루스 노트의 엇나간 멜로디가\n느낌있는 멜로디 진행을 만들어요!" },
      { type: 'text', text: "5가지 블럭에서 블루스 노트는\n색깔로 표시했어요!" },
    ] : []),
    ...(scaleKey === 'pentatonic' ? [
      { type: 'text', text: "그런데, 왜 C로 시작하지 않은 걸까요?" },
      { type: 'text', text: "그건 단순히 A로 시작하는게 더 쉽기 때문이에요!" },
      { type: 'text', text: "나중에 '마이너 스케일'을 배울 때\n자세히 알려드릴게요!" },
    ] : []),
    ...(scaleKey === 'blues' ? [
      { type: 'action', action: 'highlightBluesNote', texts: [
        "마이너 펜타토닉에 한 음을 더하면\n'블루스 스케일'이 돼요.",
        "이렇게 추가된 음을\n'블루스 노트'라고 불러요."
      ] },
      { type: 'text', text: "블루스 노트의 엇나간 멜로디가\n느낌있는 멜로디 진행을 만들어요!" },
      { type: 'text', text: "5가지 블럭에서 블루스 노트는\n색깔로 표시했어요!" },
    ] : []),
    ...(scaleKey === 'natural-minor' ? [
      { type: 'text', text: "Am 마이너 스케일은 사실\nC메이저 스케일과 구성음이 같아요!" },
      { type: 'text', text: "이렇게 구성음이 같은 관계를\n'나란한조'라고 불러요." },
      { type: 'text', text: "C를 근음으로 마이너 스케일을 만들면\n3도·6도·7도가 반음씩 내려가요." },
      { type: 'action', action: 'noteNameGrid', gridRows: [
        ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
        ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
      ] },
      { type: 'text', text: "대부분의 노래는\n메이저 곡과 마이너 곡으로 나뉘어요." },
      { type: 'text', text: "발라드, 트로트, 슬로우 락 같은\n장르에서 많이 쓰인답니다!" },
    ] : []),
    ...(scaleKey === 'harmonic-minor' ? [
      { type: 'text', text: "내추럴 마이너의 b7음을\n7로 올리면 하모닉 마이너가 돼요!" },
      { type: 'text', text: "이 반음 하나 때문에\n아랍이나 인도 느낌의 신비로운 소리가 나요." },
      { type: 'text', text: "나중에 배울 '세컨더리 도미넌트'라는 테크닉에서\n꼭 필요한 스케일이에요!" },
    ] : []),
    ...(scaleKey === 'ionian' ? [
      { type: 'text', text: "사실 우리가 아는\n메이저 스케일이랑 똑같아요!" },
      { type: 'action', action: 'playModeMelody' },
    ] : []),
    ...(scaleKey === 'mixolydian-b9b13' ? [
      { type: 'text', text: "이 스케일은 사실\n'하모닉 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 하모닉 마이너의\n5번째 모드예요." },
    ] : []),
    ...(scaleKey === 'melodic-minor' ? [
      { type: 'text', text: "멜로딕 마이너는\n재즈에서 아주 중요한 스케일이에요." },
      { type: 'text', text: "이후 배울 여러 스케일들이\n사실 이 스케일에서 파생돼요." },
    ] : []),
    ...(scaleKey === 'altered' ? [
      { type: 'text', text: "이 스케일은 사실\n'멜로딕 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 멜로딕 마이너의\n7번째 모드예요." },
    ] : []),
    ...(scaleKey === 'locrian-sharp6' ? [
      { type: 'text', text: "이 스케일은 사실\n'하모닉 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 하모닉 마이너의\n2번째 모드예요." },
    ] : []),
    ...(scaleKey === 'lydian-dominant' ? [
      { type: 'text', text: "이 스케일은 사실\n'멜로딕 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 멜로딕 마이너의\n4번째 모드예요." },
    ] : []),
    ...(scaleKey === 'mixolydian-b13' ? [
      { type: 'text', text: "이 스케일은 사실\n'멜로딕 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 멜로딕 마이너의\n5번째 모드예요." },
    ] : []),
    ...(scaleKey === 'locrian-sharp2' ? [
      { type: 'text', text: "이 스케일은 사실\n'멜로딕 마이너 스케일'에서 나왔어요." },
      { type: 'text', text: "정확히는 멜로딕 마이너의\n6번째 모드예요." },
    ] : []),
    ...(scaleKey === 'major' ? [
      { type: 'text', text: '기타는 피아노와 달리 음이 잘 보이지 않죠?' },
    ] : []),
    ...(scaleKey === 'major' ? [
      { type: 'action', action: 'fillRemaining', text: "그래서 기타에는\n'스케일 블럭'이라는 개념이 존재해요!" }, // 2026-09-27: 원래 별도 text 단계였던 걸 이 액션단계로 합침
      { type: 'text', text: "대표적으로 5개의 스케일 블럭을 알고 있어야,\n원하는 연주를 할 수 있을 거예요!" },
      { type: 'action', action: 'highlightAShape', texts: [
        `아래의 블럭은 ${cfg.demoForm}이라고 할게요.\n${chordLetter}코드 모양과 닮았기 때문이에요.`
      ] }, // 2026-09-27: 2줄 자동순차 대신 한 번에 같이 표시
      { type: 'action', action: 'formNav', text: "좌우로 넘겨서 5가지 폼을 확인해보세요!\n점들을 클릭해서 소리도 들어보세요!" },
    ] : [
      // '스케일 블럭' 개념·코드모양 대조는 레벨1에서 이미 설명함 — 다른 레벨은 바로 5개 폼 생성(2026-09-29).
      // CHAR_NOTE_TEXTS에 등록된 모드는 formNav 완료 즉시 특징음 강조로 이어짐(2026-09-29).
      { type: 'action', action: 'formNav', text: `${cfg.name}의\n5가지 블럭은 아래와 같아요.`,
        ...(CHAR_NOTE_TEXTS[scaleKey] ? { thenAction: 'highlightCharacteristicNote', texts: [CHAR_NOTE_TEXTS[scaleKey]] } : {}) },
    ]),
    ...(scaleKey === 'ionian' ? [
      { type: 'action', action: 'highlightCharacteristicNote', texts: [
        "각 모드는 그 모드만의\n'특징음'을 가지고 있어요."
      ] },
      { type: 'text', text: "특징음은 그 모드의 분위기를\n가장 잘 보여주는 음이에요." },
      { type: 'text', text: "아이오니안의 특징음은\n4번째 음(4도)이에요." },
    ] : []),
    ...(scaleKey === 'pentatonic' || scaleKey === 'major-pentatonic' ? [
      { type: 'text', text: "노래를 틀어놓고, 이 스케일을 아무렇게\n연주해보면서 감을 키워보는 연습을 해보세요!" },
    ] : []),
    ...(scaleKey === 'mixolydian-b9b13' ? [
      { type: 'text', text: "마이너 코드로 해결되는 세컨더리 도미넌트에서\n정석적으로 활용되는 스케일이에요." },
      { type: 'text', text: "대중음악에서도 아주 널리 쓰여서\n익혀두면 정말 유용한 스케일이에요." },
    ] : []),
    ...(scaleKey === 'melodic-minor' ? [
      { type: 'text', text: "마이너 코드에서, 특히 재즈적인\n색채를 낼 때 많이 사용돼요." },
      { type: 'text', text: "이후 나올 파생 스케일들의 기초가 되니\n잘 익혀두세요!" },
    ] : []),
    ...(scaleKey === 'altered' ? [
      { type: 'text', text: "얼터드 도미넌트(7alt) 코드 위에서\n주로 쓰이는 대표적인 재즈 스케일이에요." },
      { type: 'text', text: "모든 텐션(b9,#9,#11,b13)이 들어있어서\n다음 마이너 코드로 강하게 해결돼요." },
    ] : []),
    ...(scaleKey === 'locrian-sharp6' ? [
      { type: 'text', text: "마이너 키의 ii-V-i에서\nm7(b5) 코드 위에 쓰여요." },
      { type: 'text', text: "일반 로크리안보다\n조금 더 부드러운 느낌을 줘요." },
    ] : []),
    ...(scaleKey === 'lydian-dominant' ? [
      { type: 'text', text: "도미넌트7(#11) 코드 위에서\n주로 쓰여요." },
      { type: 'text', text: "리디안처럼 밝으면서도\n블루지한 느낌을 더해줘요." },
    ] : []),
    ...(scaleKey === 'mixolydian-b13' ? [
      { type: 'text', text: "도미넌트7(b13) 코드 위에서\n주로 쓰여요." },
      { type: 'text', text: "믹솔리디안보다 살짝\n어두운 느낌을 줘요." },
    ] : []),
    ...(scaleKey === 'locrian-sharp2' ? [
      { type: 'text', text: "메이저 키의 ii-V-i에서\nm7(b5) 코드 위에 주로 쓰여요." },
      { type: 'text', text: "'하프디미니시드 스케일'이라는\n다른 이름으로도 불려요." },
    ] : []),
    // 챕터3(모드 스케일, 아이오니안 제외 — 이미 자체 종료문구 있음) 공통 연습권유+종료 문구(2026-09-29)
    ...(CHAPTER3_MODE_KEYS.includes(scaleKey) ? [
      { type: 'text', text: `특징음을 중심으로 연습해서\n${cfg.name}에 익숙해져보세요!` },
    ] : []),
    ...(scaleKey === 'major' ? [
      { type: 'text', text: "수고하셨어요! 스케일 블럭의\n기본 개념을 배웠어요!\n이제 자유롭게 연습해보세요!" },
    ] : CHAPTER3_MODE_KEYS.includes(scaleKey) ? [
      { type: 'text', text: `수고하셨어요! ${cfg.name}\n튜토리얼을 완료할게요!` },
    ] : [
      { type: 'text', text: `수고하셨어요! '${cfg.name}'을\n배웠어요. 자유롭게 연습해보세요!` },
    ]),
  ];
}

// 챕터2 레벨6(secondary-iv, 4도 메이저 전환) 전용 튜토리얼 — 세컨더리 도미넌트 개념 도입 +
// C7→F 시연(사용자 확정 10단계 흐름, 2026-09-30).
function _buildSecondaryIVTutorialSteps() {
  const cfg = TUTORIAL_SCALE_CONFIG['secondary-iv'];
  return [
    { type: 'text', text: "챕터2에서는\n'스케일 전환'을 알아볼게요!" },
    { type: 'text', text: "패밀리코드라는 개념을 알고 있어야\n이해할 수 있을거예요." },
    { type: 'text', text: "코드를 진행하다보면 패밀리코드가 아닌\n'7'코드가 종종 등장해요." },
    { type: 'text', text: "그 '7'코드 뒤에 나오는 패밀리코드에 따라\n사용할 스케일이 달라져요!" },
    { type: 'action', action: 'fillBlockInstant', text: "레벨8에서는 4도로 이어지는 '7'코드에\n쓸 수 있는 스케일을 배울거예요." },
    { type: 'action', action: 'playPairTransitionDemo', text: "직접 들어볼까요?" },
    { type: 'text', text: "처음엔 개념이 조금 어려울 수 있어요.\n보통은 바뀌는 음에 익숙해지는 방법이 있어요." },
    { type: 'text', text: "그리고 바뀐 후의 스케일블럭을 보면,\nF메이저 스케일이랑 똑같다는 걸 알 수 있어요!" },
    { type: 'text', text: "각자 받아들이기 편한 방법을 찾아서\n숙달해보세요!" },
    { type: 'text', text: `수고하셨어요! ${cfg.name}는\n여기서 마칠게요!` },
  ];
}

// 챕터2 레벨7(secondary-v, 5도 메이저 전환) 전용 튜토리얼 — 레벨6에서 이미 개념(패밀리코드/7코드)을
// 배웠으므로 재설명 없이 바로 전개, Dm7→D7→G7 시연(2026-10-01).
function _buildSecondaryVTutorialSteps() {
  const cfg = TUTORIAL_SCALE_CONFIG['secondary-v'];
  return [
    { type: 'action', action: 'fillBlockInstant', text: "이번엔 5도로 이어지는 '7'코드에\n쓸 수 있는 스케일을 배워볼게요." },
    { type: 'action', action: 'playPairTransitionDemo', text: "직접 들어볼까요?" },
    { type: 'text', text: "바뀐 후의 스케일블럭을 보면,\nG메이저 스케일이랑 똑같다는 걸 알 수 있어요!" },
    { type: 'text', text: "마찬가지로, 바뀌는 음에\n익숙해지는 연습을 해보세요!" },
    { type: 'text', text: `수고하셨어요! ${cfg.name}는\n여기서 마칠게요!` },
  ];
}

// 챕터2 레벨8(secondary-ii, 6도 마이너 전환) 전용 튜토리얼 — 타겟이 메이저가 아닌 '마이너'로
// 바뀌는 첫 사례. C→E7→Am 시연(2026-10-01).
function _buildSecondaryIITutorialSteps() {
  const cfg = TUTORIAL_SCALE_CONFIG['secondary-ii'];
  return [
    { type: 'action', action: 'fillBlockInstant', text: "이번엔 6도로 이어지는 '7'코드에\n쓸 수 있는 스케일을 배워볼게요." },
    { type: 'action', action: 'playPairTransitionDemo', text: "직접 들어볼까요?" },
    { type: 'text', text: "이번엔 메이저가 아니라\n'마이너'로 전환됐어요!" },
    { type: 'text', text: "바뀐 후의 스케일블럭을 보면,\nA 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!" },
    { type: 'text', text: "마찬가지로, 바뀌는 음에\n익숙해지는 연습을 해보세요!" },
    { type: 'text', text: `수고하셨어요! ${cfg.name}는\n여기서 마칠게요!` },
  ];
}

// 챕터2 레벨9(secondary-vi, 2도 마이너 전환) — C→A7→Dm 시연(2026-10-01).
function _buildSecondaryVITutorialSteps() {
  const cfg = TUTORIAL_SCALE_CONFIG['secondary-vi'];
  return [
    { type: 'action', action: 'fillBlockInstant', text: "이번엔 2도로 이어지는 '7'코드에\n쓸 수 있는 스케일을 배워볼게요." },
    { type: 'action', action: 'playPairTransitionDemo', text: "직접 들어볼까요?" },
    { type: 'text', text: "이번에도 메이저가 아니라\n'마이너'로 전환돼요!" },
    { type: 'text', text: "바뀐 후의 스케일블럭을 보면,\nD 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!" },
    { type: 'text', text: "마찬가지로, 바뀌는 음에\n익숙해지는 연습을 해보세요!" },
    { type: 'text', text: `수고하셨어요! ${cfg.name}는\n여기서 마칠게요!` },
  ];
}

// 챕터2 레벨10(secondary-iii, 3도 마이너 전환) — C→B7→Em 시연. 챕터2의 마지막 전환 레벨(2026-10-01).
function _buildSecondaryIIITutorialSteps() {
  const cfg = TUTORIAL_SCALE_CONFIG['secondary-iii'];
  return [
    { type: 'action', action: 'fillBlockInstant', text: "이번엔 3도로 이어지는 '7'코드에\n쓸 수 있는 스케일을 배워볼게요." },
    { type: 'action', action: 'playPairTransitionDemo', text: "직접 들어볼까요?" },
    { type: 'text', text: "이번에도 메이저가 아니라\n'마이너'로 전환돼요!" },
    { type: 'text', text: "바뀐 후의 스케일블럭을 보면,\nE 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!" },
    { type: 'text', text: "마찬가지로, 바뀌는 음에\n익숙해지는 연습을 해보세요!" },
    { type: 'text', text: "이걸로 챕터2의 5가지 전환을\n모두 배웠어요!" },
    { type: 'text', text: `수고하셨어요! ${cfg.name}는\n여기서 마칠게요!` },
  ];
}
let TUTORIAL_STEPS = buildTutorialSteps('major'); // openTutorial()에서 실제 _scaleKey로 재생성됨
let _tutorialStepIdx        = 0;
let _tutorialStartFret      = 0; // 7프렛 고정 뷰 기준 col 계산용(renderTestNeck과 동일 startFret)
let _tutorialRunNotes       = []; // C→다음C 옥타브 런(음높이 오름차순)
let _tutorialRemainingNotes = []; // 그 외 블록 나머지 노트
let _tutorialTimers         = []; // 액션 진행 중 예약된 타이머 — 중도 이탈 시 취소용
let _tutorialAFormIdx       = 0; // 현재 _scaleKey 블록배열에서 "A폼"이 몇 번째인지(스케일마다 배열순서 다름, 2026-09-27)

// block.label 끝이 FORM_NAMES/FORM_NAMES_HM 중 하나로 끝나면 그 이름, 라벨 없는 스케일(major 등)은
// 배열 순서가 이미 FORM_NAMES와 동일하다고 가정하고 위치값으로 대체(2026-09-27, 레벨 일반화).
function _tutorialFormNameForBlock(block, idx) {
  if (block.label) {
    const found = FORM_NAMES.find(n => block.label.endsWith(n)) || FORM_NAMES_HM.find(n => block.label.endsWith(n));
    if (found) return found;
  }
  return FORM_NAMES[idx];
}

// scaleKey의 블록배열에서 targetName(예: 'A폼')에 해당하는 인덱스를 찾는다.
function _tutorialFindFormIndex(scaleKey, targetName) {
  const blocks = ScaleData.getBlocks(_tutorialBlockKey(scaleKey));
  for (let i = 0; i < blocks.length; i++) {
    if (_tutorialFormNameForBlock(blocks[i], i) === targetName) return i;
  }
  return 0;
}

function _tutorialClearTimers() {
  _tutorialTimers.forEach(id => clearTimeout(id));
  _tutorialTimers = [];
}

function openTutorial() {
  exitPracticeMode();
  _tutorialMode = true;
  GuitarAudio.stop();
  clearTestDots();
  _testHint = null;
  _tutorialCharNoteRevealed = false;

  // 짝궁 전환 데모(코드 백킹)가 있는 레벨은 CDN 피아노 샘플을 미리 로드해둠 — 안 그러면
  // 데모 시작 시점(첫 코드)에 로딩 지연으로 백킹이 멜로디 첫음보다 늦게 울림(2026-09-30 발견).
  if (PAIR_TRANSITION_DEMO[_scaleKey]) GuitarAudio.warmupPiano();

  TUTORIAL_STEPS = buildTutorialSteps(_scaleKey);
  const cfg = TUTORIAL_SCALE_CONFIG[_scaleKey] || TUTORIAL_SCALE_CONFIG['major'];
  _tutorialAFormIdx = _tutorialFindFormIndex(_scaleKey, cfg.demoForm);
  const block = ScaleData.getBlocks(_tutorialBlockKey(_scaleKey))[_tutorialAFormIdx];
  const startFret = ScaleData.getStartFrets(block, cfg.rootNote)[0];
  _tutorialStartFret = startFret;
  renderTestNeck(startFret); // dot은 튜토리얼 진행에 맞춰 순차 표시

  // 블록 전체 노트를 음높이 오름차순 정렬 후, 첫 근음~다음 근음 구간을 "C→다음C 런"으로 분리
  const notes = ScaleData.parseGrid(block.grid).notes
    .map(n => ({ s: n.s, degree: n.degree, absF: startFret + n.col }))
    .sort((a, b) => (OPEN_MIDI[a.s] + a.absF) - (OPEN_MIDI[b.s] + b.absF));
  const rootIdxs = notes.reduce((acc, n, i) => (n.degree === 1 ? [...acc, i] : acc), []);
  const [lowRootI, highRootI] = rootIdxs;
  _tutorialRunNotes = notes.slice(lowRootI, highRootI + 1);
  const runKeys = new Set(_tutorialRunNotes.map(n => n.s + ',' + n.absF));
  _tutorialRemainingNotes = notes.filter(n => !runKeys.has(n.s + ',' + n.absF));

  const overlay = document.getElementById('scale-test-overlay');
  overlay?.classList.add('is-open', 'scale-test-overlay--tutorial');
  applyTestFbLayout();
  // 1단계 진입 시 1.2초 딜레이 후 첫 문구 표시 — 그 사이엔 다음 버튼도 비활성.
  // 라벨도 여기서 바로 "다음"으로 세팅해야 함 — showTutorialStep(0) 안에서만 바꾸면 그게 실행되는
  // 1.2초 후까지 기본값("제출하기")이 남아있다가 뒤늦게 바뀌는 게 눈에 보임(2026-09-27 발견/수정).
  const nextBtn = document.getElementById('test-submit-btn');
  const label = document.getElementById('test-submit-btn-label');
  if (label) label.textContent = '다음';
  if (nextBtn) nextBtn.disabled = true;
  const id = setTimeout(() => showTutorialStep(0), 1200);
  _tutorialTimers.push(id);
}

function closeTutorial() {
  _tutorialMode = false;
  _tutorialStepIdx = 0;
  _tutorialDotClickEnabled = false;
  _tutorialClearTimers();
  GuitarAudio.stop();
  GuitarAudio.stopPiano();
  document.getElementById('scale-test-overlay')?.classList.remove('is-open', 'scale-test-overlay--tutorial', 'scale-test-overlay--form-nav', 'scale-test-overlay--arrows-in');
}

// 튜토리얼 이탈 확인 모달(X 버튼·뒤로가기) — 확인(그만할래요) 시 _tutorialAbort 후 onLeave 실행.
// 모달이 떠 있는 동안 튜토리얼은 계속 진행(2026-10-03 사용자 확정). 이미 열려 있으면 무시.
const _TUTORIAL_LEAVE_OPTS = {
  title: '튜토리얼을 그만두시겠어요?',
  desc:  '지금 나가면 튜토리얼을<br>처음부터 다시 봐야 해요.',
};
function _requestTutorialExit(onLeave) {
  if (isLeavePracticeOpen()) return;
  showLeavePracticeModal(() => { _tutorialAbort(); onLeave(); }, _TUTORIAL_LEAVE_OPTS);
}

// 튜토리얼 이탈(pagehide·앱 전환 = 확인 없이 / X 버튼·뒤로가기 = 확인 후) 전용 즉각 중단 — 정상 종료(closeTutorial: 마지막 소리 페이드 유지)와 구분.
// 사운드 하드컷 + 텍스트/그리드/코드라벨 즉시 비움 + 남아있는 animationend/transitionend 리스너 제거 + 진행 상태 초기화.
function _tutorialAbort() {
  if (!_tutorialMode) return;
  closeTutorial(); // 모드 플래그·타이머·오버레이 클래스·소프트 stop
  GuitarAudio.panic();      // 기타: 출력 그래프 즉시 절단(예약된 소리까지 폐기)
  GuitarAudio.resetPiano(); // 피아노 백킹: 샘플러 폐기(release 꼬리·예약 코드 제거)

  // 텍스트·그리드·코드라벨: 내용/클래스/인라인 스타일을 비우고 요소를 복제본으로 교체 —
  // 취소된 애니메이션 때문에 영영 안 올 animationend 리스너가 다음 튜토리얼 때 늦게 발화하는 것 방지
  ['test-question-text', 'test-note-grid', 'test-chord-labels'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const fresh = el.cloneNode(false);
    fresh.classList.remove('test-question--in', 'is-visible');
    fresh.style.display = '';
    fresh.textContent = '';
    el.replaceWith(fresh);
  });

  _tutorialFormNavLocked = false;
  _tutorialCharNoteRevealed = false;
  document.getElementById('scale-test-overlay')?.classList.remove('scale-test-overlay--nav-locked');
}

// texts[] 자동 순차재생 — 문구 하나 보여주고 등장애니메이션 끝나면 읽는시간(TUTORIAL_TEXT_SEQUENCE_PAUSE_MS)
// 대기 후 다음 문구로, 마지막 문구는 표준 버퍼(TUTORIAL_NEXT_BTN_BUFFER_MS) 후 onDone() 콜백(2026-09-27,
// onDone은 호출부가 결정 — 다음버튼 활성화일 수도, 이어서 액션 시작일 수도 있음)
function _tutorialShowTextSequence(texts, idx, qEl, onDone) {
  qEl.textContent = texts[idx];
  qEl.classList.remove('test-question--in');
  void qEl.offsetWidth;
  qEl.classList.add('test-question--in');
  qEl.addEventListener('animationend', () => {
    if (!_tutorialMode) return; // 이탈로 튜토리얼이 초기화된 뒤에 늦게 도착한 애니메이션 종료는 무시
    if (idx < texts.length - 1) {
      const id = setTimeout(() => _tutorialShowTextSequence(texts, idx + 1, qEl, onDone), TUTORIAL_TEXT_SEQUENCE_PAUSE_MS);
      _tutorialTimers.push(id);
    } else {
      const id = setTimeout(onDone, TUTORIAL_NEXT_BTN_BUFFER_MS);
      _tutorialTimers.push(id);
    }
  }, { once: true });
}

function showTutorialStep(idx) {
  _tutorialClearTimers();
  _tutorialStepIdx = idx;
  document.getElementById('test-note-grid')?.classList.remove('is-visible', 'test-question--in'); // 이전 스텝 잔상 정리(2026-09-29)
  document.getElementById('test-chord-labels')?.classList.remove('is-visible', 'test-question--in'); // 짝궁 전환 데모 코드라벨 잔상 정리(2026-09-30)
  const qElReset = document.getElementById('test-question-text');
  if (qElReset) qElReset.style.display = ''; // 그리드 스텝에서 숨겼던 걸 원복 — 두 요소가 같은 90px 슬롯 공유(2026-09-29)
  const step  = TUTORIAL_STEPS[idx];
  const qEl   = document.getElementById('test-question-text');
  const label = document.getElementById('test-submit-btn-label');
  const nextBtn = document.getElementById('test-submit-btn');
  if (label) label.textContent = (idx === TUTORIAL_STEPS.length - 1) ? '완료' : '다음';

  if (step.type === 'text') {
    if (nextBtn) nextBtn.disabled = true;
    if (qEl && Array.isArray(step.texts)) {
      // texts[] — 여러 문구를 자동으로 순차 넘김(2026-09-27), 마지막 문구까지 다 보여준 뒤에만 활성화
      _tutorialShowTextSequence(step.texts, 0, qEl, () => { if (nextBtn) nextBtn.disabled = false; });
    } else if (qEl) {
      // 기본 opacity:0 상태라 .test-question--in을 매번 다시 트리거해야 보임(startTest()와 동일 패턴) —
      // remove 후 강제 리플로우 없이 바로 add하면 트랜지션이 안 씹히고 즉시 끝나버림
      qEl.textContent = step.text;
      qEl.classList.remove('test-question--in');
      void qEl.offsetWidth;
      qEl.classList.add('test-question--in');
      // 다음 버튼 활성화 타이밍 표준 규칙(2026-09-27): "다음"은 반드시 진행중 애니메이션이
      // 실제로 끝난 후 +0.1s에만 활성화 — 하드코딩 duration 대신 실제 CSS 애니메이션의
      // animationend를 그대로 청취해서, CSS쪽 1.5s가 나중에 바뀌어도 이 코드는 안 건드려도 됨.
      qEl.addEventListener('animationend', () => {
        const id = setTimeout(() => { if (nextBtn) nextBtn.disabled = false; }, TUTORIAL_NEXT_BTN_BUFFER_MS);
        _tutorialTimers.push(id);
      }, { once: true });
    }
  } else {
    // 액션 단계 — leadTexts(액션 전, 자동순차)/text(액션 전, 단일) 중 있는 쪽으로 먼저 갱신,
    // 둘 다 없으면 직전 텍스트 유지. 텍스트가 먼저 다 끝난 뒤에만 액션(dot 등) 시작 —
    // 동시재생하면 눈이 텍스트/지판 둘 다 못 따라가서 순차로 분리(2026-09-27)
    if (nextBtn) nextBtn.disabled = true;
    // 액션 완료 후 — texts[]가 있으면 자동 순차 문구로 이어가고(2026-09-27), 없으면 바로 다음버튼 활성화
    const finishStep = () => {
      if (qEl && Array.isArray(step.texts)) {
        // 액션(색전환 등) 끝난 직후 바로 텍스트가 뜨면 급해 보여서 0.5s 간격(2026-09-27)
        const id = setTimeout(() => {
          _tutorialShowTextSequence(step.texts, 0, qEl, () => { if (nextBtn) nextBtn.disabled = false; });
        }, 500);
        _tutorialTimers.push(id);
      } else {
        const id = setTimeout(() => { if (nextBtn) nextBtn.disabled = false; }, TUTORIAL_NEXT_BTN_BUFFER_MS);
        _tutorialTimers.push(id);
      }
    };
    // thenAction이 있으면 화면(그리드 등)을 지우지 않은 채로 이어서 다음 액션 실행(2026-09-29, 그리드+옥타브런 한 단계로 묶기용)
    const onActionDone = () => {
      if (step.thenAction) runTutorialAction(step.thenAction, finishStep);
      else finishStep();
    };
    if (qEl && Array.isArray(step.leadTexts)) {
      // 액션 전에 먼저 여러 문구를 자동 순차재생(2026-09-27, 1+2단계 병합용) — 다 끝나면 액션 시작
      _tutorialShowTextSequence(step.leadTexts, 0, qEl, () => runTutorialAction(step.action, onActionDone, step.gridRows));
    } else if (step.text && qEl) {
      qEl.textContent = step.text;
      qEl.classList.remove('test-question--in');
      void qEl.offsetWidth;
      qEl.classList.add('test-question--in');
      qEl.addEventListener('animationend', () => runTutorialAction(step.action, onActionDone, step.gridRows), { once: true });
    } else {
      runTutorialAction(step.action, onActionDone, step.gridRows);
    }
  }
}

function advanceTutorialStep() {
  // 다음 버튼 → 재생 중이던 소리(기타 울림·피아노 백킹)를 짧은 페이드(60ms)로 끊고 진행
  GuitarAudio.stop();
  GuitarAudio.fadeOutPiano();
  const nextIdx = _tutorialStepIdx + 1;
  if (nextIdx >= TUTORIAL_STEPS.length) { closeTutorial(); return; }
  showTutorialStep(nextIdx);
}

// dot 하나를 테스트 지판에 추가(fb-note--spawn 페이드인 재사용, renderNotes()와 동일 패턴).
// createNoteEl()은 진입화면의 23프렛 전체 절대좌표(TOTAL_FRETS 기준)로 위치를 잡기 때문에
// 여기(7프렛 고정 뷰, addTestDot()과 동일 공식)에 그대로 쓰면 왼쪽으로 몰려서 찍히는 버그가 있었음
// (2026-09-27 발견/수정) — col은 반드시 _tutorialStartFret 기준 상대값으로 계산해야 함.
function _tutorialSpawnDot(note) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  const col = note.absF - _tutorialStartFret;
  const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct  = (note.s + 0.5) / STRINGS * 100;
  const el = document.createElement('div');
  el.className = 'fb-note fb-note--spawn' + (note.degree === 1 ? ' fb-note--root' : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
  el.dataset.s = note.s; // 나중에 특정 위치(코드모양 등)의 dot을 다시 찾아 강조표시하기 위한 식별자(2026-09-27)
  el.dataset.absF = note.absF;
  neckEl.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add('fb-note--spawn-in');
    el.addEventListener('transitionend', () => {
      el.classList.remove('fb-note--spawn', 'fb-note--spawn-in');
    }, { once: true });
  }));
}

// 5폼(A-G-E-D-C) 각각의 코드모양 패턴 — A/E/D는 chord-voicings.js CHORD_PATTERN(바레코드,
// quality:'M')에 실제로 있어서 rootStr로 찾아 재사용. G/C는 코드사전에 바레패턴이 없어서(실제
// 기타에서도 잘 안 씀) 오픈코드 CHORD_STATIC('G':'3 2 0 0 0 3', 'C':'x 3 2 0 1 0')과 대조검증한
// 패턴을 직접 지정(2026-09-27, 사용자 제공값). 폼 이름을 키로 조회(2026-09-27, 레벨 일반화로 배열→객체 전환).
// 폼 이름(A/G/E/D/C폼) 키로 조회 — 스케일마다 블록배열 순서가 달라서(2026-09-27, 레벨 일반화)
// 배열 인덱스 대신 폼 이름으로 찾는다. 코드모양 자체는 CAGED 형태라 스케일 종류와 무관하게 공용.
// 글자(A/G/E/D/C) 키로 조회 — 메이저/마이너 폼 둘 다 같은 물리적 CAGED 모양을 공유하므로
// rootStr은 공통, 패턴만 quality별로 갈린다(2026-09-28, 내추럴마이너 등 마이너 스케일 일반화).
const TUTORIAL_FORM_SHAPES = {
  'A': { rootStr: 5, majorPattern: null,                     minorPattern: null },                       // 둘 다 CHORD_PATTERN에서 찾음
  'G': { rootStr: 6, majorPattern: 'r+3 r+2 r r r r+3',       minorPattern: null },                       // 오픈G 검증완료, 오픈Gm 없음
  'E': { rootStr: 6, majorPattern: null,                     minorPattern: null },                       // 둘 다 CHORD_PATTERN에서 찾음
  'D': { rootStr: 4, majorPattern: null,                     minorPattern: null },                       // 둘 다 CHORD_PATTERN에서 찾음
  'C': { rootStr: 5, majorPattern: 'x r+3 r+2 r r+1 r',       minorPattern: null },                       // 오픈C 검증완료, 오픈Cm 없음
};

function _tutorialGetFormShapeDef(formName) {
  const isMinor = formName.endsWith('m폼');
  const letter = formName.replace(/m?폼$/, '');
  const cfg = TUTORIAL_FORM_SHAPES[letter];
  if (!cfg) return null;
  const explicitPattern = isMinor ? cfg.minorPattern : cfg.majorPattern;
  if (explicitPattern) return { rootStr: cfg.rootStr, pattern: explicitPattern };
  // G/C는 rootStr을 각각 E/A와 공유하는데, major 쪽엔 전용 오픈코드 패턴이 있어서 괜찮지만
  // minor 쪽은 그 전용 패턴이 없다(오픈Gm/Cm 자체가 실전에서 안 쓰임) — 이 상태로 그냥
  // CHORD_PATTERN을 rootStr로만 찾으면 이웃(E/A)의 마이너 셰이프를 엉뚱하게 가져온다.
  // majorPattern이 있는 글자(G/C)는 그 대체 셰이프가 없다는 뜻이므로 마이너일 땐 null로 끝낸다
  // (2026-09-28, 내추럴마이너 등 마이너 스케일 일반화하며 발견).
  if (isMinor && cfg.majorPattern) return null;
  const quality = isMinor ? 'm' : 'M';
  const pat = (window.CHORD_PATTERN || []).find(p => p.rootStr === cfg.rootStr && p.quality === quality && p.barre);
  return pat ? { rootStr: pat.rootStr, pattern: pat.pattern } : null;
}

// shapeDef(rootStr/pattern)을 블록 노트 목록과 대조해서 코드모양에 해당하는 (string, 절대프렛)
// 좌표들을 역산한다(2026-09-27, 원래 A폼 전용이던 걸 5폼 공용으로 일반화).
// CHORD_PATTERN류 문자열은 6번줄→1번줄 순서, ScaleData의 s는 반대(0=1번줄)라 s = 5 - 배열인덱스로 변환.
// 'r'은 임의의 스윕 변수일 뿐이라(voicing-library.js와 동일 해석), 블록에 이미 있는 실제 루트음
// 절대프렛으로 역산해서 r을 구한 뒤 나머지 줄의 절대프렛을 계산한다.
function _tutorialGetShapeTargets(shapeDef, allNotes) {
  if (!shapeDef) return [];
  const tokens = shapeDef.pattern.trim().split(/\s+/); // 예: ['x','r+1','r+3','r+3','r+3','r+1']
  const parseTok = (tok) => {
    if (tok === 'x') return null;
    const m = tok.match(/^r([+-]\d+)?$/);
    return m ? (m[1] ? parseInt(m[1], 10) : 0) : parseInt(tok, 10);
  };
  const rootS = shapeDef.rootStr - 1; // rootStr(1~6, 1=high e) → ScaleData s(0=high e)
  const rootPatIdx = tokens.findIndex((_, p) => (5 - p) === rootS);
  const rootOffset = parseTok(tokens[rootPatIdx]);
  const rootNote = allNotes.find(n => n.s === rootS && n.degree === 1);
  if (!rootNote) return [];
  const r = rootNote.absF - rootOffset;

  const targets = [];
  tokens.forEach((tok, p) => {
    const offset = parseTok(tok);
    if (offset === null) return; // 뮤트 줄
    targets.push({ s: 5 - p, absF: r + offset });
  });
  return targets;
}

// 5폼 유저 조작 네비게이션 상태(2026-09-27)
let _tutorialFormIdx = 0;
let _tutorialDotClickEnabled = false;
let _tutorialFormNavLocked = false; // 특징음 강조 등 전환 애니메이션 도중 좌우 폼 넘기기 방지(2026-09-29)
let _tutorialCharNoteRevealed = false; // 특징음 강조가 한번 트리거되면, 이후 5폼 전부에 계속 반영(2026-09-29)

// 폼 전체를 "이미 완성된 상태"로 정적 렌더 — 스폰 애니메이션 없이 바로 opacity:1로 찍음
// (좌우로 넘기면 화면만 이동하는 느낌, 새로 생성되는 느낌 배제). 그 폼의 코드모양(TUTORIAL_FORM_SHAPES)에
// 해당하는 dot은 파란색으로 같이 표시.
function _tutorialRenderFormStatic(formIdx) {
  const cfg = TUTORIAL_SCALE_CONFIG[_scaleKey] || TUTORIAL_SCALE_CONFIG['major'];
  const block = ScaleData.getBlocks(_tutorialBlockKey(_scaleKey))[formIdx];
  const startFret = ScaleData.getStartFrets(block, cfg.rootNote)[0];
  _tutorialStartFret = startFret;
  renderTestNeck(startFret);

  const formName = _tutorialFormNameForBlock(block, formIdx);
  const labelEl = document.getElementById('test-fb-form-label');
  if (labelEl) labelEl.textContent = formName;

  const notes = ScaleData.parseGrid(block.grid).notes
    .map(n => ({ s: n.s, degree: n.degree, absF: startFret + n.col }));

  // 코드모양(파란) 강조는 레벨1(메이저)에서 highlightAShape로 이미 가르친 개념 재확인용 — 다른 레벨은 강조 없음(2026-09-29)
  const shapeDef = _scaleKey === 'major' ? _tutorialGetFormShapeDef(formName) : null;
  const targetKeys = new Set(shapeDef ? _tutorialGetShapeTargets(shapeDef, notes).map(t => t.s + ',' + t.absF) : []);

  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  notes.forEach(note => {
    const col = note.absF - startFret;
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (note.s + 0.5) / STRINGS * 100;
    const isHighlight = targetKeys.has(note.s + ',' + note.absF);
    const isBluesNote = (_scaleKey === 'blues' || _scaleKey === 'major-blues') && note.degree === (cfg.bluesDegree ?? -5); // 블루스 노트(b5) 색깔 표시(2026-09-29)
    const isCharNote = _tutorialCharNoteRevealed && cfg.charDegree != null && note.degree === cfg.charDegree; // 특징음 강조, 한번 트리거되면 5폼 전부 반영(2026-09-29)
    const el = document.createElement('div');
    el.className = 'fb-note'
      + (note.degree === 1 ? ' fb-note--root' : '')
      + (isHighlight ? ' fb-note--chord-highlight' : '')
      + (isBluesNote ? ' fb-note--blues-note' : '')
      + (isCharNote ? ' fb-note--blues-note' : '');
    el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
    el.dataset.s = note.s;
    el.dataset.absF = note.absF;
    neckEl.appendChild(el);
  });
}

function _tutorialAdvanceForm(delta) {
  _tutorialFormIdx = (_tutorialFormIdx + delta + 5) % 5;
  _tutorialRenderFormStatic(_tutorialFormIdx);
}

// 위치(줄+프렛)로 튜토리얼 넥의 dot을 찾음 — 튜토리얼 dot은 dataset.absF(대문자 F) 컨벤션이라
// 메인넥용 _findNoteElAt()(소문자 data-absf 셀렉터)과 어트리뷰트명이 달라 그대로 못 씀(2026-09-30 확인,
// 재생 강조가 전혀 안 먹던 버그의 원인).
function _tutorialFindNoteEl(neckEl, s, absF) {
  return neckEl.querySelector('.fb-note[data-s="' + s + '"][data-abs-f="' + absF + '"]');
}

// 짝궁 전환 데모(playPairTransitionDemo) 전용 — 기존 transitionPair() bi=0(A폼↔D폼) 정방향
// 애니메이션 레시피(fade/slide/spawn, 타이밍·이징 전부 동일)를 그대로 재사용하되, 좌표만 튜토리얼
// 넥의 윈도우 좌표계(FRETS_VISIBLE 기준, _tutorialStartFret 오프셋)로 재계산함 — 메인넥은
// TOTAL_FRETS 기준 절대좌표라 그대로 재사용하면 위치가 어긋남(2026-09-30 확인).
// 짝궁 전환 데모 공용 — fade/slide/spawn 레시피(레벨별 PAIR_TRANSITION_RECIPE)를 받아 튜토리얼 넥
// (윈도우 좌표계)에 재현. 실제 transitionPair()의 해당 bi=0 정방향 분기에서 좌표값만 그대로
// 뽑아온 것 — 타이밍/이징도 동일(350ms+60ms, cubic-bezier)(2026-10-01, secondary-v 추가하며 공용화).
// fades: [{s,absF}], slides: [{s,fromAbsF,toAbsF}], spawns: [{s,absF}] — absF는 전부 gsf 기준 상대값.
function _tutorialAnimatePairTransition(gsf, { fades, slides, spawns }) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  const DURATION = 350;
  const activeEls = [...neckEl.querySelectorAll('.fb-note')];
  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  fades.forEach(f => activeEls.forEach(el => {
    if (parseInt(el.dataset.s) === f.s && parseInt(el.dataset.absF) === gsf + f.absF) {
      el.style.opacity   = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0)';
    }
  }));
  slides.forEach(sl => activeEls.forEach(el => {
    if (parseInt(el.dataset.s) === sl.s && parseInt(el.dataset.absF) === gsf + sl.fromAbsF) {
      const newAbsF = gsf + sl.toAbsF;
      const col = newAbsF - _tutorialStartFret;
      el.style.left   = ((col + 0.5) / FRETS_VISIBLE * 100) + '%';
      el.dataset.absF = newAbsF;
    }
  }));

  const tailId = setTimeout(() => {
    // 위치(fades 레시피)로만 판정 — opacity===0 조건을 같이 걸면, 전환이 "다음 음 미리트리거"로
    // 당겨진 뒤(2026-10-01) 그 fade 대상 dot이 하필 "현재 재생 중인 마지막 음"과 겹칠 때 강조코드가
    // opacity를 1로 되돌려놔서 여기서 영영 제거를 못 하는 경우가 생김 — 위치만으로 판정하면 안전.
    neckEl.querySelectorAll('.fb-note').forEach(el => {
      const s = parseInt(el.dataset.s), absF = parseInt(el.dataset.absF);
      if (fades.some(f => f.s === s && absF === gsf + f.absF)) el.remove();
    });
    // fade/slide용으로 걸어둔 임시 transition 인라인스타일 정리 — 안 지우면 전환 후 dot들만
    // 이후 .fb-note--playing 토글에서도 계속 350ms 이징을 타서 전환 전(C코드 구간) 강조와
    // 다르게 보임(2026-09-30 발견).
    neckEl.querySelectorAll('.fb-note').forEach(el => { el.style.transition = ''; });
    spawns.forEach(sp => {
      // _spawnNote()과 동일한 바운스 이징, 윈도우 좌표계만 다름
      const spawnAbsF = gsf + sp.absF;
      const col = spawnAbsF - _tutorialStartFret;
      const newEl = document.createElement('div');
      newEl.className = 'fb-note';
      newEl.style.cssText = `left:${(col + 0.5) / FRETS_VISIBLE * 100}%; top:${(sp.s + 0.5) / STRINGS * 100}%;`;
      newEl.dataset.s = sp.s;
      newEl.dataset.absF = spawnAbsF;
      newEl.style.opacity   = '0';
      newEl.style.transform = 'translate(-50%, -50%) scale(0)';
      newEl.style.transition = 'opacity 200ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      neckEl.appendChild(newEl);
      void newEl.offsetHeight;
      newEl.style.opacity   = '1';
      newEl.style.transform = 'translate(-50%, -50%) scale(1)';
      newEl.addEventListener('transitionend', () => { newEl.style.transition = ''; }, { once: true });
    });
  }, DURATION + 60);
  _tutorialTimers.push(tailId); // 이탈 시 취소 대상에 포함 — 안 그러면 이탈 후에도 spawn dot이 추가됨
}

// 레벨별 전환 레시피 — 실제 transitionPair()의 bi=0 정방향 분기(fade/slide/spawn 대상)에서 그대로
// 옮겨온 값. 새 레벨(8~10) 추가 시 해당 _transitionPairXX()의 bi=0 분기를 보고 여기만 추가하면 됨.
const PAIR_TRANSITION_RECIPE = {
  'secondary-iv': { fades: [{ s: 4, absF: 1 }], slides: [{ s: 2, fromAbsF: 3, toAbsF: 2 }], spawns: [{ s: 5, absF: 5 }] },
  'secondary-v':  { fades: [{ s: 1, absF: 5 }], slides: [{ s: 3, fromAbsF: 2, toAbsF: 3 }], spawns: [{ s: 0, absF: 1 }, { s: 5, absF: 1 }] },
  // secondary-ii: 페이드/스폰 없이 순수 3곳 슬라이드만(G→G# +1프렛, s=0/3/5 동시)
  // fromAbsF/toAbsF는 gsf 기준 상대값(gsf=1일 때 실제 프렛 3→4, 5→6, 3→4) — 절대값 그대로
  // 넣으면 +1칸 밀려서 엉뚱한 dot을 찾는 버그 발생(2026-10-01 발견).
  'secondary-ii': { fades: [], slides: [{ s: 0, fromAbsF: 2, toAbsF: 3 }, { s: 3, fromAbsF: 4, toAbsF: 5 }, { s: 5, fromAbsF: 2, toAbsF: 3 }], spawns: [] },
  'secondary-vi': { fades: [{ s: 4, absF: 1 }], slides: [{ s: 2, fromAbsF: 3, toAbsF: 2 }, { s: 2, fromAbsF: 4, toAbsF: 5 }, { s: 4, fromAbsF: 2, toAbsF: 3 }], spawns: [{ s: 5, absF: 5 }] },
  // secondary-iii: 실제 로직은 degree 2/4 전체 +1슬라이드 → 특정위치 페이드 → 2곳 스폰인데(SECONDARY_III_DELTA),
  // s=1의 degree4(F)는 슬라이드 후 바로 페이드되는 과도 상태라 시각적으로는 원위치에서 바로 페이드되는
  // 것과 동일 — 여기선 그 중간 슬라이드 단계를 생략하고 원위치 페이드로 단순화(최종 결과 동일, 2026-10-01
  // node로 양쪽 결과셋 일치 검증 완료).
  'secondary-iii': { fades: [{ s: 1, absF: 5 }], slides: [{ s: 1, fromAbsF: 2, toAbsF: 3 }, { s: 4, fromAbsF: 4, toAbsF: 5 }, { s: 3, fromAbsF: 2, toAbsF: 3 }], spawns: [{ s: 0, absF: 1 }, { s: 5, absF: 1 }] },
};

// 레벨별 역레시피를 손으로 따로 적지 않고 forward 레시피에서 자동 역산 — fade↔spawn 교체,
// slide는 from/to를 뒤바꿈. 레벨 추가될 때마다 역방향 값을 따로 틀리게 적는 사고를 원천 차단
// (2026-10-01, 3마디 시작 시 다이어토닉 원폼 복귀용 역전환에 사용).
function _reversePairRecipe(recipe) {
  return {
    fades: recipe.spawns.map(sp => ({ s: sp.s, absF: sp.absF })),
    slides: recipe.slides.map(sl => ({ s: sl.s, fromAbsF: sl.toAbsF, toAbsF: sl.fromAbsF })),
    spawns: recipe.fades.map(f => ({ s: f.s, absF: f.absF })),
  };
}

function runTutorialAction(action, onDone, gridRows) {
  // 마지막 dot의 시작(stagger) + 그 dot 자신의 팝인(.fb-note--spawn 트랜지션 0.2s)까지
  // 완전히 끝난 시점 + 0.1s 버퍼에 완료 콜백 — 노트 개수/간격이 바뀌어도 이 공식 그대로 따라감(2026-09-27).
  const doneAfterNotes = (noteCount, stepMs) => {
    const lastNoteEndMs = Math.max(noteCount - 1, 0) * stepMs + TUTORIAL_DOT_FADE_MS;
    const id = setTimeout(onDone, lastNoteEndMs + TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(id);
  };

  if (action === 'fillBlockInstant') {
    // 챕터3(모드 스케일)부터는 시작하자마자 A폼 블럭 전체를 한번에 채워둔다(2026-09-29, 사용자 확정) —
    // 이후 옥타브런은 새 dot을 만드는 대신 이미 있는 dot을 파란색으로 훑는 방식(highlightOctaveRun)으로 대체.
    _tutorialRunNotes.concat(_tutorialRemainingNotes).forEach(note => _tutorialSpawnDot(note));
    const id = setTimeout(onDone, TUTORIAL_DOT_FADE_SLOW_MS + TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(id);
  } else if (action === 'highlightOctaveRun') {
    // fillBlockInstant로 이미 찍힌 dot들 중 옥타브런 구간(_tutorialRunNotes, 1→7→1)만
    // 순서대로 파란색으로 훑어 보여준다(2026-09-29) — playModeMelody와 동일한 강조 방식.
    const dots = Array.from(document.querySelectorAll('#test-fb-full-neck .fb-note'));
    const findDot = n => dots.find(d => Number(d.dataset.s) === n.s && Number(d.dataset.absF) === n.absF);
    const STEP_MS = 420;
    let prevEl = null;
    _tutorialRunNotes.forEach((note, i) => {
      const id = setTimeout(() => {
        if (prevEl) { prevEl.style.transition = 'none'; prevEl.classList.remove('fb-note--chord-highlight'); }
        const el = findDot(note);
        if (el) { el.style.transition = 'none'; el.classList.add('fb-note--chord-highlight'); } // 이징 없이 즉시 전환(2026-09-29)
        prevEl = el;
        playScaleNote(note.s, note.absF);
      }, i * STEP_MS);
      _tutorialTimers.push(id);
    });
    const finishId = setTimeout(() => {
      if (prevEl) prevEl.classList.remove('fb-note--chord-highlight');
      onDone();
    }, _tutorialRunNotes.length * STEP_MS + TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(finishId);
  } else if (action === 'octaveRun') {
    const STEP_MS = 420;
    _tutorialRunNotes.forEach((note, i) => {
      const id = setTimeout(() => {
        _tutorialSpawnDot(note);
        playScaleNote(note.s, note.absF);
      }, i * STEP_MS);
      _tutorialTimers.push(id);
    });
    doneAfterNotes(_tutorialRunNotes.length, STEP_MS);
  } else if (action === 'fillRemaining') {
    // 순차 대신 전부 동시에 팝인, 그만큼 애니메이션 자체를 느리게(2026-09-27,
    // .scale-test-overlay--tutorial 스코프의 .fb-note--spawn transition-duration과 짝)
    _tutorialRemainingNotes.forEach(note => _tutorialSpawnDot(note));
    const id = setTimeout(onDone, TUTORIAL_DOT_FADE_SLOW_MS + TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(id);
  } else if (action === 'highlightAShape') {
    // 이미 찍혀있는 dot들(옥타브런+나머지) 중 A폼 코드모양 좌표와 일치하는 것만 파란색으로
    // 서서히 전환(.fb-note--chord-highlight, CSS transition) — 전환 끝나면 완료 콜백(2026-09-27)
    const allNotes = _tutorialRunNotes.concat(_tutorialRemainingNotes);
    const demoCfg = TUTORIAL_SCALE_CONFIG[_scaleKey] || TUTORIAL_SCALE_CONFIG['major'];
    const targets = _tutorialGetShapeTargets(_tutorialGetFormShapeDef(demoCfg.demoForm), allNotes);
    const dots = Array.from(document.querySelectorAll('#test-fb-full-neck .fb-note'));
    const matched = targets
      .map(t => dots.find(d => Number(d.dataset.s) === t.s && Number(d.dataset.absF) === t.absF))
      .filter(Boolean);
    if (matched.length === 0) { onDone(); return; }
    matched.forEach(el => el.classList.add('fb-note--chord-highlight'));
    matched[0].addEventListener('transitionend', onDone, { once: true });
  } else if (action === 'playModeMelody') {
    // MODE_MELODY_DEGREES(1~7)를 "스케일 몇 번째 음인지"(포지션)로 해석해 현재 옥타브런(_tutorialRunNotes)에
    // 매핑 — 리터럴 도수 숫자로 매칭하면 도리안(b3/b7만 있고 자연3/7은 없음) 같은 모드에서 음이 빠짐.
    // _tutorialGetNoteNames와 동일한 정렬키를 써서 1번째~7번째 자리를 구하고, 그 자리의 실제 음(자연이든
    // 플랫이든)을 그대로 재생 — 도수 숫자가 아니라 "몇 번째 스텝인지"만 재사용하는 방식(2026-09-29).
    const degreeToNote = {};
    _tutorialRunNotes.forEach(n => { if (!(n.degree in degreeToNote)) degreeToNote[n.degree] = n; });
    const sortedDegrees = Object.keys(degreeToNote).map(Number).sort((a, b) => {
      const ka = Math.abs(a) * 10 + (a < 0 ? 0 : 1);
      const kb = Math.abs(b) * 10 + (b < 0 ? 0 : 1);
      return ka - kb;
    });
    const positionToNote = {};
    sortedDegrees.forEach((d, i) => { positionToNote[i + 1] = degreeToNote[d]; });
    // 8 = 옥타브 위 근음(이미 옥타브런에서 찍힌 마지막 근음 dot 재사용, 2026-09-29)
    const highRoot = _tutorialRunNotes[_tutorialRunNotes.length - 1];
    const seq = MODE_MELODY_DEGREES.map(d => (d === 8 ? highRoot : positionToNote[d])).filter(Boolean);
    if (seq.length === 0) { onDone(); return; }
    const dots = Array.from(document.querySelectorAll('#test-fb-full-neck .fb-note'));
    const findDot = n => dots.find(d => Number(d.dataset.s) === n.s && Number(d.dataset.absF) === n.absF);
    let t = 0;
    let prevEl = null;
    seq.forEach((note, i) => {
      const dur = MODE_MELODY_DURATIONS[i] || 460;
      const id = setTimeout(() => {
        if (prevEl) { prevEl.style.transition = 'none'; prevEl.classList.remove('fb-note--chord-highlight'); }
        const el = findDot(note);
        if (el) { el.style.transition = 'none'; el.classList.add('fb-note--chord-highlight'); } // 이징 없이 즉시 전환(2026-09-29)
        prevEl = el;
        playScaleNote(note.s, note.absF);
      }, t);
      _tutorialTimers.push(id);
      t += dur;
    });
    const finishId = setTimeout(() => {
      if (prevEl) prevEl.classList.remove('fb-note--chord-highlight');
      onDone();
    }, t + TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(finishId);
  } else if (action === 'highlightCharacteristicNote') {
    // 모드 특징음(cfg.charDegree) 강조 — formNav로 표시된 현재 폼의 dot들 중 매칭되는 것만 파란색으로 전환(2026-09-29)
    const demoCfg = TUTORIAL_SCALE_CONFIG[_scaleKey] || TUTORIAL_SCALE_CONFIG['major'];
    const charDegree = demoCfg.charDegree;
    const block = ScaleData.getBlocks(_tutorialBlockKey(_scaleKey))[_tutorialFormIdx];
    const charNotes = (charDegree != null && block)
      ? ScaleData.parseGrid(block.grid).notes
          .map(n => ({ s: n.s, degree: n.degree, absF: _tutorialStartFret + n.col }))
          .filter(n => n.degree === charDegree)
      : [];
    const dots = Array.from(document.querySelectorAll('#test-fb-full-neck .fb-note'));
    const matchedChar = charNotes
      .map(n => dots.find(d => Number(d.dataset.s) === n.s && Number(d.dataset.absF) === n.absF))
      .filter(Boolean);
    if (matchedChar.length === 0) { onDone(); return; }
    _tutorialFormNavLocked = true;
    document.getElementById('scale-test-overlay')?.classList.add('scale-test-overlay--nav-locked'); // 화살표 실제로 안눌리게(pointer-events:none, 2026-09-29)
    matchedChar.forEach(el => el.classList.add('fb-note--chord-highlight'));
    matchedChar[0].addEventListener('transitionend', () => {
      _tutorialFormNavLocked = false;
      _tutorialCharNoteRevealed = true; // 이후 5폼 전부(재렌더 포함) 계속 파란색 유지(2026-09-29)
      document.getElementById('scale-test-overlay')?.classList.remove('scale-test-overlay--nav-locked');
      onDone();
    }, { once: true });
  } else if (action === 'highlightBluesNote') {
    // 옥타브런에 이미 찍힌 dot 중 블루스 노트(b5)만 파란색으로 전환(2026-09-29)
    const target = _tutorialRunNotes.find(n => n.degree === (TUTORIAL_SCALE_CONFIG[_scaleKey]?.bluesDegree ?? -5));
    const dots = Array.from(document.querySelectorAll('#test-fb-full-neck .fb-note'));
    const matchedBlues = target
      ? dots.filter(d => Number(d.dataset.s) === target.s && Number(d.dataset.absF) === target.absF)
      : [];
    if (matchedBlues.length === 0) { onDone(); return; }
    matchedBlues.forEach(el => el.classList.add('fb-note--chord-highlight'));
    matchedBlues[0].addEventListener('transitionend', onDone, { once: true });
  } else if (action === 'formNav') {
    // 5폼(A-G-E-D-C) 유저 조작 네비게이션 시작 — 화살표 노출 + dot 클릭 재생 허용 + A폼부터 정적표시(2026-09-27)
    const overlayEl = document.getElementById('scale-test-overlay');
    overlayEl?.classList.add('scale-test-overlay--form-nav');
    overlayEl?.classList.remove('scale-test-overlay--arrows-in'); // 재진입 대비 리셋
    // 화살표도 dot과 동일한 페이드+스케일 팝인(2026-09-29) — 더블 rAF로 트리거(style-guide.md §15 패턴)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlayEl?.classList.add('scale-test-overlay--arrows-in');
    }));
    _tutorialDotClickEnabled = true;
    _tutorialFormIdx = _tutorialAFormIdx;
    _tutorialRenderFormStatic(_tutorialAFormIdx);
    const id = setTimeout(onDone, TUTORIAL_NEXT_BTN_BUFFER_MS);
    _tutorialTimers.push(id);
  } else if (action === 'noteNameGrid') {
    // 음이름(알파벳)/도수(숫자) 3줄 그리드 — 표가 아니라 셀 단위 텍스트를 grid로 정렬만
    // 한다(2026-09-29, 사용자 확정: "표를 진짜로 만들지는 마").
    // 직전 스텝(설명 텍스트)이 그대로 남아있으면 그리드와 동시에 보여서 겹친다 — 그리드 뜨기 전에
    // 먼저 지운다(2026-09-29, 사용자 확정: 텍스트 끝나면 그리드로 "전환"되어야 함).
    const qElForGrid = document.getElementById('test-question-text');
    if (qElForGrid) {
      qElForGrid.classList.remove('test-question--in');
      qElForGrid.textContent = '';
      qElForGrid.style.display = 'none'; // 빈 90px 박스가 그리드 아래 겹쳐 남는 것 방지 — 슬롯을 그리드에 완전히 넘김(2026-09-29)
    }
    const gridEl = document.getElementById('test-note-grid');
    if (!gridEl) { onDone(); return; }
    const ROWS = gridRows || [
      ['도', '레', '미', '파', '솔', '라', '시'],
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      ['1', '2', '3', '4', '5', '6', '7'],
    ];
    gridEl.innerHTML = ROWS.map(row =>
      row.map(cell => `<span class="test-note-grid-cell">${cell}</span>`).join('')
    ).join('');
    gridEl.classList.add('is-visible');
    gridEl.classList.remove('test-question--in');
    void gridEl.offsetWidth;
    gridEl.classList.add('test-question--in'); // 텍스트 등장과 동일 애니메이션 재사용(1.5s, style-guide.md §18)
    gridEl.addEventListener('animationend', () => {
      const id = setTimeout(onDone, TUTORIAL_NEXT_BTN_BUFFER_MS);
      _tutorialTimers.push(id);
    }, { once: true });
  } else if (action === 'playPairTransitionDemo') {
    // 짝궁 전환 코드진행 시연(C7→F 등) — 사용자가 직접 지정한 멜로디(PAIR_TRANSITION_DEMO)를 순차재생,
    // 코드라벨(C/C7/F) 중 현재 음이 속한 코드만 파란 강조, 전환 시점의 음부터 실제 타겟 블록으로
    // 화면도 같이 바뀜(2026-09-30).
    const demo = PAIR_TRANSITION_DEMO[_scaleKey];
    if (!demo) { onDone(); return; }
    const qElForDemo = document.getElementById('test-question-text');
    if (qElForDemo) {
      qElForDemo.classList.remove('test-question--in');
      qElForDemo.textContent = '';
      qElForDemo.style.display = 'none'; // 리드텍스트와 같은 슬롯 공유 — noteNameGrid와 동일 패턴
    }
    const labelsEl = document.getElementById('test-chord-labels');
    const offset = (PAIR_STARTFRET_OFFSET[_tutorialAFormIdx] || 0);
    const gsf = _tutorialStartFret + offset;
    let transitionStage = 0; // 0=원폼 / 1=도미넌트7 전환됨 / 2=다이어토닉 원폼으로 역전환됨
    let i = 0;
    const step = () => {
      document.querySelectorAll('#test-chord-labels .test-chord-label').forEach(el => el.classList.remove('is-active'));
      document.querySelectorAll('#test-fb-full-neck .fb-note--playing').forEach(el => {
        el.style.transition = 'none';
        el.classList.remove('fb-note--playing');
      });
      if (i >= demo.notes.length) {
        const id = setTimeout(onDone, TUTORIAL_NEXT_BTN_BUFFER_MS);
        _tutorialTimers.push(id);
        return;
      }
      const note = demo.notes[i];
      const backing = demo.chordBacking && demo.chordBacking.find(b => b.atIdx === i);
      if (backing) GuitarAudio.playPianoChord(backing.midis, backing.durationSec);
      const recipe = PAIR_TRANSITION_RECIPE[_scaleKey];
      const nextNote = demo.notes[i + 1]; // 전환 애니메이션은 해당 음이 울리기 '한 박 전'에 미리 시작
      // (2026-10-01, 사용자 확정: 트리거음 재생 시점엔 이미 전환이 끝나 있어야 체감상 안 늦음)
      if (recipe && transitionStage === 0 && nextNote && nextNote.chordIdx >= 1) {
        transitionStage = 1;
        _tutorialAnimatePairTransition(gsf, recipe);
      } else if (recipe && transitionStage === 1 && nextNote && nextNote.chordIdx >= 2) {
        // 3마디 시작 — 도미넌트7 전용음(Bb/F#/G#)은 더 이상 안 쓰므로 다이어토닉 원폼으로 역전환
        // (2026-10-01, 사용자 확정: 이론상 스케일 전환은 2마디뿐, 타겟코드는 원래 조성 그대로 사용).
        transitionStage = 2;
        _tutorialAnimatePairTransition(gsf, _reversePairRecipe(recipe));
      }
      const labelEl = labelsEl && labelsEl.querySelector('[data-idx="' + note.chordIdx + '"]');
      if (labelEl) labelEl.classList.add('is-active');
      const neckEl = document.getElementById('test-fb-full-neck');
      const el = neckEl && _tutorialFindNoteEl(neckEl, note.s, note.absF);
      if (el) {
        // fillBlockInstant 팝인(1.5s)·전환 fade/slide(350ms) 등 남아있을 수 있는 트랜지션을
        // 전부 무시하고 강제 즉시 스냅 — 강조는 언제나 애니메이션 없이 즉각 파랗게(2026-09-30, 사용자 확정)
        el.classList.remove('fb-note--spawn', 'fb-note--spawn-in');
        el.style.transition = 'none';
        // 전환이 "다음 음 미리트리거"로 당겨진 뒤(2026-10-01), 마디 마지막 음이 하필 전환의
        // 페이드 대상 dot과 겹치면 opacity가 이미 0으로 가는 중이라 강조(배경색만 바꿈)가 안 보임 —
        // 강조하는 동안은 무조건 보이게 강제.
        el.style.opacity   = '1';
        el.style.transform = 'translate(-50%, -50%) scale(1)';
        void el.offsetWidth;
        el.classList.add('fb-note--playing');
      }
      playScaleNote(note.s, note.absF);
      i++;
      const isLast = i >= demo.notes.length;
      const id = setTimeout(step, isLast ? SCALE_PLAY_NOTE_MS * 3 : SCALE_PLAY_NOTE_MS);
      _tutorialTimers.push(id);
    };
    // 코드라벨(C/C7/F) 등장 애니메이션이 완전히 끝난 뒤에 시연 시작(2026-09-30, 사용자 확정)
    if (labelsEl) {
      labelsEl.innerHTML = demo.chords.map((c, idx) => `<span class="test-chord-label" data-idx="${idx}">${c}</span>`).join('');
      labelsEl.classList.add('is-visible');
      labelsEl.classList.remove('test-question--in');
      void labelsEl.offsetWidth;
      labelsEl.classList.add('test-question--in'); // 텍스트 등장과 동일 애니메이션 재사용
      labelsEl.addEventListener('animationend', () => {
        const id = setTimeout(step, TUTORIAL_NEXT_BTN_BUFFER_MS);
        _tutorialTimers.push(id);
      }, { once: true });
    } else {
      step();
    }
  }
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

    const rect = neckEl.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left) / rect.width  * FRETS_VISIBLE);
    const s    = Math.floor((e.clientY - rect.top)  / rect.height * STRINGS);
    if (col < 0 || col >= FRETS_VISIBLE || s < 0 || s >= STRINGS) return;

    if (_tutorialMode) {
      // 튜토리얼은 기본적으로 보여주기 전용이라 답 배치는 못 하지만, 5폼 네비게이션
      // 단계(_tutorialDotClickEnabled)에서만 예외로 소리 재생 허용(2026-09-27)
      // 실제 생성된 dot 위치를 클릭했을 때만 재생(2026-09-29, 빈 칸 클릭 시 소리나던 버그 수정)
      if (_tutorialDotClickEnabled && !_tutorialFormNavLocked) {
        const absF = _tutorialStartFret + col;
        const dotEl = neckEl.querySelector(`.fb-note[data-s="${s}"][data-abs-f="${absF}"]`);
        if (dotEl) playScaleNote(s, absF);
      }
      return;
    }
    if (_testSubmitted) return;      // 제출 후 입력 차단

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

  const DURATION = _instantPair ? 0 : PAIR_SLIDE_MS;
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
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 1, 0, 7);
      _spawnNote(neckEl, cur.startFret + 1, 5, 7);
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
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);

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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, cur.startFret + 5, 1, 5);
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
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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

  const DURATION = _instantPair ? 0 : PAIR_SLIDE_MS;
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+4, 2, 'b6');
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,3':'2','0,4':'b3','0,5':'4', '1,2':1, '2,5':'4','2,6':'5', '3,2':1,'3,3':'2','3,4':'b3', '4,6':'5', '5,3':'2','5,4':'b3','5,5':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 7; el.classList.remove('fb-note--root'); });
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 1, 7);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':'3','0,b3':'4','0,4':'5', '1,1':'2', '2,4':'5','2,5':'6', '3,1':'2','3,2':'3','3,b3':'4', '4,5':'6', '5,2':'3','5,b3':'4','5,4':'5' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+5, 5, 'b6');
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'4','0,6':'5', '1,2':1,'1,3':'2','1,4':'b3', '2,6':'5', '3,3':'2','3,4':'b3','3,5':'4', '4,2':1, '5,5':'4','5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 4, 7);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,4':'5','0,5':'6', '1,1':'2','1,2':'3','1,b3':'4', '2,5':'6', '3,2':'3','3,b3':'4','3,4':'5', '4,1':'2', '5,4':'5','5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+5, 3, 'b6');
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,6':'5', '1,3':'2','1,4':'b3','1,5':'4', '2,2':1, '3,5':'4','3,6':'5', '4,2':1,'4,3':'2','4,4':'b3', '5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 2, 7);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'6', '1,2':'3','1,b3':'4','1,4':'5', '2,1':'2', '3,4':'5','3,5':'6', '4,1':'2','4,2':'3','4,b3':'4', '5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+5, 1, 'b6');
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1, '1,5':'4','1,6':'5', '2,2':1,'2,3':'2','2,4':'b3', '3,6':'5', '4,3':'2','4,4':'b3','4,5':'4', '5,2':1 });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 0, 7);
      _spawnNote(neckEl, sf+1, 5, 7);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2', '1,4':'5','1,5':'6', '2,1':'2','2,2':'3','2,b3':'4', '3,5':'6', '4,2':'3','4,b3':'4','4,4':'5', '5,1':'2' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 0, 7);
      _spawnNote(neckEl, sf+5, 0, 'b3');
      _spawnNote(neckEl, sf+5, 4, 'b6');
      _spawnNote(neckEl, sf+1, 5, 7);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1,'0,3':'2', '1,6':'5', '2,3':'2','2,4':'b3','2,5':'4', '3,2':1, '4,5':'4','4,6':'5', '5,2':1,'5,3':'2','5,4':'b3' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _finishTransition(true);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
      // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
      _spawnNote(neckEl, sf+1, 3, 7);
      _spawnNote(neckEl, sf+5, 1, 1);
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2','0,2':'3', '1,5':'6', '2,2':'3','2,b3':'4','2,4':'5', '3,1':'2', '4,4':'5','4,5':'6', '5,1':'2','5,2':'3','5,b3':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _finishTransition(false);
      }, DURATION + PAIR_WAIT_BUFFER_MS);
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
  const DURATION = _instantPair ? 0 : PAIR_SLIDE_MS;
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
    // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
    delta.spawn.forEach(sp => _spawnNote(neckEl, sf + sp.off, sp.s, sp.degree));
    setTimeout(function() {
      neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
        if (parseFloat(el.style.opacity) === 0) el.remove();
      });
      slidNodes.forEach(({ el, finalDeg }) => { el.dataset.degree = finalDeg; });
      _finishTransition(true);
    }, DURATION + PAIR_WAIT_BUFFER_MS);

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
    // 새 dot 생성은 슬라이드·제거와 동시에 재생 (끝날 때까지 기다리지 않음)
    delta.remove.forEach(r => _spawnNote(neckEl, sf + r.backOff, r.s, r.backDeg));
    setTimeout(function() {
      neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
        if (parseFloat(el.style.opacity) === 0) el.remove();
      });
      slidNodes.forEach(({ el, finalDeg }) => { el.dataset.degree = finalDeg; });
      _finishTransition(false);
    }, DURATION + PAIR_WAIT_BUFFER_MS);
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
// 접속 시 기본으로 보여줄 블록 — 사용 프렛 범위의 중앙이 4프렛(= 2~6프렛 폼)에 가장 가까운 블록.
// 전 레벨 공통 규칙이라 레벨별 인덱스를 따로 두지 않음(대부분 두 번째 폼, 첫 블록이 더 가까우면 첫 블록, 동점이면 더 높은 프렛 블록).
const DEFAULT_FORM_CENTER_FRET = 4;
function defaultNavIdx() {
  const seq = buildNavSequence();
  let best = 0, bestDist = Infinity;
  seq.forEach(({ block, startFret }, i) => {
    const cols = ScaleData.parseGrid(block.grid).notes.map(n => n.col);
    if (!cols.length) return;
    const center = startFret + (Math.min(...cols) + Math.max(...cols)) / 2;
    const dist = Math.abs(center - DEFAULT_FORM_CENTER_FRET);
    if (dist <= bestDist) { bestDist = dist; best = i; }   // 동점이면 프렛이 더 높은(뒤쪽) 블록
  });
  return best;
}

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
function _keyBtnLabel(semitone) {
  return (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[semitone] + (_keyUi && _keyUi.minor ? 'm' : '');
}
function updateKeyLabels() {
  document.querySelectorAll('.key-btn').forEach(btn => {
    btn.textContent = _keyBtnLabel(Number(btn.dataset.semitone));
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
    renderPracticeChords();
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

// key-selector 가장자리 흐림 — 더 스크롤할 수 있는 쪽에만 .fade-l/.fade-r (481px~에서만 CSS가 mask로 표시)
function initKeySelectorFade(el) {
  const update = () => {
    el.classList.toggle('fade-l', el.scrollLeft > 1);
    el.classList.toggle('fade-r', el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };
  el.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initKeySelector() {
  const el = document.getElementById('key-selector');
  if (!el) return;

  const first = _keyUi ? _keyUi.root : 0;
  for (let k = 0; k < 12; k++) {
    const semitone = (first + k) % 12;
    const btn = document.createElement('button');
    btn.className = 'key-btn' + (semitone === _rootNote ? ' key-btn--active' : '');
    btn.dataset.semitone = semitone;
    btn.textContent = _keyBtnLabel(semitone);
    btn.addEventListener('pointerup', () => {
      if (_practicePlaying) return; // 반주 재생 중엔 키 변경 잠금(정지 후 변경)
      _playTap();
      _rootNote = semitone;
      _navIdx   = defaultNavIdx();   // 키 변경 시에도 접속 때와 같은 기본 폼(2~6프랫)으로 이동
      el.querySelectorAll('.key-btn').forEach(b => b.classList.remove('key-btn--active'));
      btn.classList.add('key-btn--active');
      renderNotes();
      updateFormLabel();
      updateBlockIndicator();
      renderPracticeChords();
      analytics.track('scale_key_selected', {
        scale_key: _scaleKey,
        root_note: semitone,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[semitone],
      });
    });
    el.appendChild(btn);
  }
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
  // 연습하기(피크 소모)를 거치지 않은 진입(주소 직접 입력·오래된 북마크 등)은 목록으로 돌려보냄 — 해당 카드가 선택된 채로
  if (!_isScaleUnlocked()) {
    location.replace(`scale-training.html?key=${encodeURIComponent(_scaleKey)}` + (_scaleLevel ? `&level=${_scaleLevel}` : ''));
    return;
  }
  _keyUi = LEVEL_KEY_UI[_scaleLevel] || null;
  if (_keyUi) _rootNote = _keyUi.root; // 레벨별 진입 시 기본 키
  _navIdx = defaultNavIdx();           // 진입 시 기본 폼 = 2~6프랫 폼

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
  initKeySelectorFade(document.getElementById('key-selector'));
  updateScaleGapScrollMode(); // 그룹1~4 간격 30px 미만이면 스크롤모드로 초기 진입 — 모든 그룹 콘텐츠(타이틀/인디케이터/키선택 그리드) 확정 이후에 측정
  alignMicBtnRowToDesc(); // scale-mic-btn-row를 desc 첫 줄 좌우 경계에 맞춤

  initTestTap();

  // 기타 버튼 — 연습모드(BPM·스타일 옵션 + 백킹 재생)
  initPracticeMode();
  // 재생 버튼 — 현재 블럭 낮은음→높은음→낮은음(+근음 재상행) 재생
  document.getElementById('scale-play-btn')?.addEventListener('pointerup', () => { _playConfirmSfx(); toggleScalePlay(); });
  // "?" 버튼 — 튜토리얼 다시보기 (2026-09-25: 기타 버튼과 분리해서 별도 3번째 버튼으로)
  document.getElementById('scale-tutorial-btn')?.addEventListener('pointerup', () => { _playConfirmSfx(); openTutorial(); });
  // 튜토리얼 중 페이지 이탈/백그라운드 전환 시 무조건 초기화(자동재생 소리·타이머 정리)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !_tutorialMode) return;
    hideLeavePracticeModal(); // 확인 모달이 떠 있었다면 같이 닫음 — 튜토리얼이 이미 초기화돼 의미 없음
    _tutorialAbort();
  });
  window.addEventListener('pagehide', _tutorialAbort);

  // 테스트 시작 버튼 (피크 소모 없음 — 연습 입장 시 5개 소모로 포함)
  document.getElementById('start-test-btn')?.addEventListener('pointerup', () => {
    _playTap();
    _playConfirmSfx();
    exitPracticeMode(); // 백킹 재생 중이면 테스트 시작 전에 종료
    analytics.track('scale_test_started', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    startTest();
  });

  // 제출하기 / 다시 풀기 버튼
  document.getElementById('test-submit-btn')?.addEventListener('pointerup', (e) => {
    if (e.currentTarget.disabled) return;
    if (_tutorialMode) { _playTap(); advanceTutorialStep(); return; }
    if (_testSubmitted) {
      _playConfirmSfx();
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
    if (_tutorialMode) { _requestTutorialExit(() => {}); return; } // 확인 후 _tutorialAbort가 오버레이까지 닫음
    requestCloseTest(closeTestOverlay);
  });
  // 튜토리얼 5폼 네비게이션 화살표 — formNav 단계에서만 노출(CSS), 유저가 직접 조작(2026-09-27)
  document.getElementById('test-fb-arrow-prev')?.addEventListener('pointerup', () => { if (!_tutorialFormNavLocked) _tutorialAdvanceForm(-1); });
  document.getElementById('test-fb-arrow-next')?.addEventListener('pointerup', () => { if (!_tutorialFormNavLocked) _tutorialAdvanceForm(1); });
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
