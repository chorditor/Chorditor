// ═════════════════════════════════════════════════
// 코드 사전 페이지 (library.html)
// ─────────────────────────────────────────────────
// home.js의 #view-library 로직을 별도 페이지로 분리한 파일(2026-10-12).
// 홈 쪽 원본은 정리 전까지 남겨둔다(P2). 이 페이지가 쓰는 것:
//   shared.js(플랜·저장·분석·온보딩 관문) / voicing-canvas.js / chord-voicings.js /
//   chords-library.js / voicing-library.js / guitar-audio.js
// "에디터로"는 페이지 간 인계(sessionStorage → home.html?view=editor&from_lib=1).
// ═════════════════════════════════════════════════

// ── 캔버스 구조 상수 (home.js와 동일 — VoicingCanvas 비율 계산용) ──
// 프렛보드 중심으로 각 영역을 명시적으로 정의
const STRINGS        = 6;
const FRETS          = 4;
const BASE_OPEN_W    = 70;   // 개방현 영역 너비 (nut 좌측)
const BASE_PAD_L     = 35;   // nut 포함 시각 중앙정렬: tl=(BASE_W-FBW+nutW)/2=105, PAD_L=105-OPEN_W
const BASE_PAD_R     = 95;   // 우측 여백 = BASE_W - tl - FBW = 440-105-240 = 95
const BASE_PAD_T     = 80;   // 프렛보드 상단 여백 (코드명 영역)
const BASE_PAD_B     = 80;   // 프렛보드 하단 여백 (프렛번호 영역)
const BASE_FBW       = 240;  // 프렛보드 너비
const BASE_FBH       = 192;  // 프렛보드 높이 (BASE_FBW × 4/5, 5:4 비율)
const BASE_W         = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R;  // = 460
const BASE_H         = BASE_PAD_T + BASE_FBH + BASE_PAD_B;                 // = 352
const MAIN_DISPLAY_SCALE = 0.8;
const EXPORT_BASE_W = 100;  // 이미지 저장 1배 기준 너비
const EXPORT_BASE_H = 80;   // 이미지 저장 1배 기준 높이 (5:4)

const ROOTS_SHARP = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const ROOTS_FLAT  = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];

let accidental = 'sharp'; // 에디터와 공유하던 전역. 이 페이지는 독립(홈도 저장 안 함 — 새로 열면 sharp)

// ── 코드명 파싱 (home.js 원본 그대로 — 수정 금지 규칙) ──
function parseChordNameToComponents(name) {
  const rootMatch = name.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  let rest = name.slice(root.length);

  // 분수코드 베이스 추출
  let bass = '';
  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx >= 0) {
    bass = rest.slice(slashIdx + 1);
    rest = rest.slice(0, slashIdx);
  }

  // suffix → 컴포넌트 (긴 것 우선)
  const MAP = [
    ['mM7',    { triad: 'm',   seventh: 'M7', func: '' }],
    ['m7(b5)', { triad: 'm',   seventh: '7',  func: 'b5' }],
    ['m7',     { triad: 'm',   seventh: '7',  func: '' }],
    ['m6',     { triad: 'm',   seventh: '6',  func: '' }],
    ['M7',     { triad: '',    seventh: 'M7', func: '' }],
    ['7sus4',  { triad: '',    seventh: '7',  func: 'sus4' }],
    ['7',      { triad: '',    seventh: '7',  func: '' }],
    ['6',      { triad: '',    seventh: '6',  func: '' }],
    ['dim7',   { triad: 'dim', seventh: '7',  func: '' }],
    ['dim',    { triad: 'dim', seventh: '',   func: '' }],
    ['aug7',   { triad: 'aug', seventh: '7',  func: '' }],
    ['aug',    { triad: 'aug', seventh: '',   func: '' }],
    ['sus4',   { triad: '',    seventh: '',   func: 'sus4' }],
    ['sus2',   { triad: '',    seventh: '',   func: 'sus2' }],
    ['add9',   { triad: '',    seventh: '',   func: 'add9' }],
    ['m',      { triad: 'm',   seventh: '',   func: '' }],
    ['',       { triad: '',    seventh: '',   func: '' }],
  ];

  // 1차: 정확 일치 (m7(b5) 등 포함)
  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension: '', ...comp };
    }
  }

  // 2차: 텐션 부분 (9), (b9), (#11) 등 제거 후 재시도
  let tension = '';
  const tensionMatch = rest.match(/\(([^)]+)\)/);
  if (tensionMatch) {
    tension = tensionMatch[1].split(',')[0].trim(); // 첫 번째 텐션만 적용
    rest = rest.replace(tensionMatch[0], '');
  }

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension, ...comp };
    }
  }

  return { root, bass, tension, triad: '', seventh: '', func: '' };
}

let _libRoot        = 'C';
let _libEntry       = null;
let _libFingerMode  = true;
let _libFingeringIdx = 0;  // 현재 선택된 운지 인덱스
let _libCanvas      = null;
let _libCtx         = null;
let _libCurrentIdx  = -1;
let _voicingModalChord = null; // 현재 보이싱 모달에 표시 중인 코드명 (sharp 기준)
const _LIB_DPR        = Math.min(window.devicePixelRatio || 1, 4); // 최대 4x 캡
const LIB_MINI_W      = Math.ceil(56 * _LIB_DPR);  // CSS 56px × DPR
const LIB_MINI_RATIO   = LIB_MINI_W / BASE_W;

// 코드 사전 와이드 레이아웃(태블릿 가로) 판별 — 근음 레일 DOM 이동과 .lib-bottom 높이 고정
// 두 곳이 같은 조건을 써야 해서 여기 한 곳에서만 정의한다. style.css의 태블릿 가로 스코프와 일치시킬 것.
let _libWideMqCache = null;
function libWideMq() {
  if (!_libWideMqCache) {
    // 세로·모바일도 가로와 같은 부품(사전패널·코드뷰 버튼 줄)을 쓰므로 항상 true — 노드 이동·투명 다이어그램을
    // 전 폭에 적용. 배치 차이는 style.css가 폭 미디어쿼리로 처리한다(옛 세로 목록 DOM은 숨김 상태로만 남음).
    _libWideMqCache = window.matchMedia('all');
  }
  return _libWideMqCache;
}

function renderLibRootTabs() {
  const roots   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const flatMap  = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
  const useFlat  = accidental === 'flat';
  const container = document.getElementById('lib-root-tabs');
  if (!container) return;
  container.innerHTML = roots.map(r => {
    // 샵/플랫 모드에 따라 하나의 이름만 표시
    const label = useFlat ? (flatMap[r] || r) : r;
    // data-root: 튜토리얼이 특정 근음 탭을 지목할 때 사용 (표시명은 샵/플랫에 따라 바뀌므로)
    return `<button class="lib-root-item${r === _libRoot ? ' active' : ''}"
                    data-root="${r}"
                    onclick="selectLibRoot('${r}')">${label}</button>`;
  }).join('');
  renderLibPanelKeys(); // 사전패널의 Key 팝업도 같은 상태(선택 근음·샵/플랫)로 맞춘다
}

function selectLibRoot(root) {
  _playTap();
  closeVoicingModal();
  _libRoot = root;
  analytics.track('lib_tab_changed', { root_tab: root });
  renderLibRootTabs();
  renderLibCards(root);
  window.Tutorial?.notify(`libroot:${root}`);
  window.Tutorial?.repaint(); // 탭이 통째로 교체되므로 허용·하이라이트 표시 복구
}

function renderLibCards(root) {
  // 사전패널 검색 중이면 근음 그리드 대신 검색 결과를 같은 그리드에 위에서부터 순서대로 그린다
  if (_libGridSearch) { _renderLibSearchGrid(); return; }
  const entries   = (window.chordsLibrary || {})[root] || [];
  const container = document.getElementById('lib-cards');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="lib-empty">등록된 코드 없음</div>';
    return;
  }

  // 코드명 기준 그룹화: sharpName → 해당 그룹의 엔트리 인덱스 배열
  const useFlat = accidental === 'flat';
  const groups  = new Map(); // sharpName → [idx, ...]
  entries.forEach((e, i) => {
    if (!groups.has(e.name)) groups.set(e.name, []);
    groups.get(e.name).push(i);
  });

  // 현재 선택 엔트리가 속한 그룹명
  const activeGroupName = _libEntry ? _libEntry.name : null;

  const reps = []; // 대표 엔트리 목록 (순서 유지)
  let html   = '';
  let gi     = 0;
  for (const [sharpName, idxList] of groups) {
    const rep      = entries[idxList[0]];
    const dispName = useFlat ? rep.flatName : rep.name;
    const isActive = sharpName === activeGroupName;
    const multi    = idxList.length > 1;
    html += `<div class="lib-card${isActive ? ' active' : ''}${multi ? ' lib-card-multi' : ''}"
                  data-chord="${sharpName}"
                  onclick="onLibCardClick(event,'${sharpName.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
               <canvas class="lib-card-canvas" data-gidx="${gi}"
                       width="${LIB_MINI_W}"
                       height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
               ${multi ? `<div class="lib-card-badge">${idxList.length}</div>` : ''}
             </div>`;
    reps.push(rep);
    gi++;
  }
  container.innerHTML = html;

  // 미니 캔버스 렌더
  reps.forEach((rep, i) => {
    const c = container.querySelectorAll('.lib-card-canvas')[i];
    if (c) _drawLibMiniCanvas(c, rep, '');
  });
}

function selectLibEntry(idx, { silent = false } = {}) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  _libEntry = entries[idx];
  if (!_libEntry) return;
  _libCurrentIdx = idx;
  _libFingeringIdx = 0;

  if (!silent) {
    analytics.track('lib_chord_selected', {
      chord_name: _libEntry.name,
      root:       _libRoot,
    });
  }

  _ensureLibCanvas();
  drawLibViewerCanvas();
  _updateFingeringNav();
  renderLibCards(_libRoot);          // 메인 그리드 선택 상태 재렌더
  _updateVoicingGridActive(idx);     // 모달 그리드 active 상태 갱신
}

// 캔버스 CSS 표시폭(실측) × DPR 기준 비트맵 해상도 계산.
// 320px 고정이면 col3 폭이 넓은 와이드 레이아웃(태블릿 가로)에서 업스케일되어 흐려지므로
// 실제 렌더 크기를 그때그때 재서 맞춘다 — 코드 에디터 resizeCanvas()와 같은 방식.
function _libViewerRatio() {
  const cssW = _libCanvas ? _libCanvas.getBoundingClientRect().width : 0;
  return Math.ceil((cssW > 0 ? cssW : 320) * _LIB_DPR) / BASE_W;
}

// 카드 그리드·보이싱 모달·검색결과 공용 미니 캔버스 렌더.
// .lib-card-canvas CSS 표시폭이 스코프마다 다른데(56px 기본 → 120px 와이드 레이아웃 등)
// 비트맵은 LIB_MINI_W(56px×DPR) 고정이라 그대로 두면 업스케일되어 흐려짐 — 실제 표시폭을
// 재서 그때그때 비트맵 해상도를 맞춘다(_libViewerRatio와 같은 방식).
// getBoundingClientRect() 대신 offsetWidth 사용 — .lib-voicing-modal은 열리기 전
// transform:scale(0) 상태라 그 안 캔버스를 rect로 재면 0이 나와 계속 56px 기본값으로
// 떨어짐(업스케일 자체가 발동을 못 함). offsetWidth는 transform 영향을 안 받는
// 레이아웃 크기라 모달이 닫혀 있어도 정확히 잡힌다.
function _drawLibMiniCanvas(canvas, entry, nameOverride) {
  const cssW  = canvas.offsetWidth;
  const ratio = Math.ceil((cssW > 0 ? cssW : 56) * _LIB_DPR) / BASE_W;
  canvas.width  = Math.round(BASE_W * ratio);
  canvas.height = Math.round(BASE_H * ratio);
  // 미니 카드(메인 그리드·운지 선택 팝업·검색 결과)는 손가락 번호 없이 dot만 — 토글과 무관
  _drawLibCanvas(canvas, ratio, entry, nameOverride, 0, false, false);
}

function _ensureLibCanvas() {
  if (!_libCanvas) {
    _libCanvas = document.getElementById('lib-canvas');
    if (_libCanvas) {
      _libCtx = _libCanvas.getContext('2d');
    }
  }
}

function drawLibViewerCanvas() {
  _ensureLibCanvas();
  if (!_libCanvas || !_libEntry) return;
  const ratio = _libViewerRatio();
  _libCanvas.width  = Math.round(BASE_W * ratio);
  _libCanvas.height = Math.round(BASE_H * ratio);
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  // 가로(스플릿 뷰)의 코드뷰는 배경이 투명 — 회색 배경 위에 다이어그램만 떠 보이게
  _drawLibCanvas(_libCanvas, ratio, _libEntry, dispName, _libFingeringIdx, libWideMq().matches);
}

// 공통 캔버스 렌더 (viewer / mini card 공용)
// fingeringIdx: 사용할 운지 인덱스 (미지정 시 0 = 대표 운지)
function _drawLibCanvas(canvas, ratio, entry, nameOverride, fingeringIdx = 0, transparent = false, fingerNumMode = _libFingerMode) {
  // 코드 캔버스 드로잉은 voicing-canvas.js 모듈(VoicingCanvas)로 일원화.
  // 프렛 정규화·바레·도트·프렛번호·손가락번호·코드명 모두 모듈이 처리.
  VoicingCanvas.draw(canvas, {
    frets:      entry.frets,
    openMute:   entry.openMute,
    barre:      entry.barres?.[fingeringIdx] ?? entry.barres?.[0] ?? entry.barre ?? {},
    barreRange: entry.barreRanges?.[fingeringIdx] ?? entry.barreRanges?.[0] ?? entry.barreRange ?? null,
    fretNumber: entry.fretNumber,
    patternR:   entry.patternR, // ★ 누락 시 fretNumber로 폴백 → r+1 시작 패턴이 한 칸 밀림
    source:     entry.source,   // ★ 누락 시 모듈이 static 취급 → offset/라벨 어긋남
    fingering:  entry.fingerings?.[fingeringIdx] ?? entry.fingerings?.[0] ?? entry.fingering,
  }, {
    chordName:     nameOverride,
    fingerNumMode,
    ratio,
    transparent,
  });
}

// 운지 내비게이션
function _updateFingeringNav() {
  const total = _libEntry?.fingerings?.length ?? 1;
  const nav   = document.getElementById('lib-fingering-nav');
  if (!nav) return;
  nav.style.display = total > 1 ? 'flex' : 'none';
  const label = nav.querySelector('.lib-fingering-label');
  if (label) label.textContent = `${_libFingeringIdx + 1} / ${total}`;
}

function prevLibFingering() {
  const total = _libEntry?.fingerings?.length ?? 1;
  _libFingeringIdx = (_libFingeringIdx - 1 + total) % total;
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_fingering_changed', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name, to_idx: _libFingeringIdx, total });
  window.Tutorial?.notify(`libfinger:${_libFingeringIdx}`);
}

function nextLibFingering() {
  const total = _libEntry?.fingerings?.length ?? 1;
  _libFingeringIdx = (_libFingeringIdx + 1) % total;
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_fingering_changed', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name, to_idx: _libFingeringIdx, total });
  window.Tutorial?.notify(`libfinger:${_libFingeringIdx}`);
}

// ── 보이싱 피커 모달 ────────────────────────────────────────────

// 카드 그리드 클릭 진입점
// - 보이싱 1개 → 직접 선택
// - 보이싱 복수 → 탭 애니메이션 후 모달 열기
function onLibCardClick(event, sharpName) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  const idxList = entries.reduce((acc, e, i) => (e.name === sharpName ? [...acc, i] : acc), []);
  if (!idxList.length) return;

  if (idxList.length === 1) {
    _playTap(); // 더 펼칠 보이싱 없음 → 바로 선택(vibe)
    selectLibEntry(idxList[0]);
    _libPanelCollapse();   // 패널을 펼친 상태였다면 접어서 코드뷰에서 결과 확인
    return;
  }

  // 탭 피드백 애니메이션
  const cardEl = event.currentTarget;
  cardEl.classList.add('lib-card-clicked');
  setTimeout(() => cardEl.classList.remove('lib-card-clicked'), 300);

  _playSfx('page.mp3'); // 1차 그리드 펼침(보이싱 모달)
  openVoicingModal(sharpName, cardEl);
  window.Tutorial?.notify(`libcard:${sharpName}`);
}

// ── 사전패널 펼침/접힘 (세로·모바일 전용) ───────────────────────────────────────────────
// 접힘(기본): 코드뷰 아래 흐름 안. 펼침: 패널이 흐름에서 빠져 #view-library(cd-main 전체)를 덮는다.
// 펼친 상태에서 카드를 고르면 자동으로 접혀 코드뷰에서 결과를 확인한다. 검색·근음 선택·#/b는 펼침을 유지한다.
let _libPanelExpanded = false;
let _libPanelTimer = null;
const LIB_PANEL_ANIM_MS = 320;   // style.css .lib-panel--float 트랜지션(.3s)보다 약간 길게

function _libPanelEls() {
  return {
    view:   document.getElementById('view-library'),
    panel:  document.getElementById('lib-panel'),
    grip:   document.getElementById('lib-panel-grip'),
    viewer: document.querySelector('#view-library .lib-viewer'),
    head:   document.getElementById('lib-codeview-head'),
  };
}

// 펼침 목표 top — 패널의 위쪽 경계선이 다이어그램 카드(.lib-viewer 맨 위의 .lib-canvas-row)의 위쪽 끝에 맞물리는 위치.
// 카드·조작 버튼·손가락 팁이 덮이고, "코드사전" 줄과 그 아래 16px 여백은 남는다(펼침 버튼 원이 그 여백에 걸침).
// 운지 넘김·글자 크기에 따라 달라질 수 있어 열 때마다 실측한다.
function _libPanelOpenTop() {
  const { view, viewer } = _libPanelEls();
  if (!view) return 0;
  const vr = view.getBoundingClientRect();
  const card = viewer?.querySelector('.lib-canvas-row') || viewer;
  const cardTop = card ? card.getBoundingClientRect().top : vr.top;
  return Math.max(0, cardTop - vr.top);
}

function _libPanelReset() {
  // 인라인·클래스 흔적 제거(타이머 포함) — 멱등
  clearTimeout(_libPanelTimer); _libPanelTimer = null;
  const { view, panel, grip } = _libPanelEls();
  _libPanelExpanded = false;
  view?.classList.remove('lib-expanded');
  if (panel) {
    panel.classList.remove('lib-panel--float', 'lib-panel--open');
    panel.style.top = '';
  }
  if (grip) {
    grip.setAttribute('aria-expanded', 'false');
    grip.setAttribute('aria-label', '사전 패널 펼치기');
  }
}

function _libPanelExpand() {
  if (_libPanelExpanded || !window.matchMedia('(max-width: 768px)').matches) return;
  const { view, panel, grip } = _libPanelEls();
  if (!view || !panel) return;
  clearTimeout(_libPanelTimer);
  view.scrollTop = 0;                                   // 스크롤 잠그기 전에 맨 위로
  const y = panel.getBoundingClientRect().top - view.getBoundingClientRect().top;
  panel.style.top = y + 'px';                           // 흐름에서 빠지기 전 위치를 그대로 잡고
  panel.classList.add('lib-panel--float');
  view.classList.add('lib-expanded');
  void panel.offsetHeight;                              // 시작 위치를 먼저 확정(트랜지션 발동)
  panel.classList.add('lib-panel--open');
  panel.style.top = _libPanelOpenTop() + 'px';          // 다이어그램 카드 위쪽 끝까지
  _libPanelExpanded = true;
  if (grip) {
    grip.setAttribute('aria-expanded', 'true');
    grip.setAttribute('aria-label', '사전 패널 접기');
  }
}

function _libPanelCollapse() {
  if (!_libPanelExpanded) return;
  const { view, panel, grip, viewer } = _libPanelEls();
  if (!view || !panel) { _libPanelReset(); return; }
  // 접힌 위치 = 코드뷰(다이어그램 묶음) 아래 + 패널 위 여백(16px + 버튼 반원). 운지 넘김 유무로 코드뷰 높이가 바뀌므로 지금 실측.
  const cs = getComputedStyle(document.documentElement);
  const gap = parseFloat(cs.getPropertyValue('--space-4')) || 16;
  const half = (grip ? grip.getBoundingClientRect().height : 44) / 2;
  const vr = view.getBoundingClientRect();
  const vbBottom = viewer ? viewer.getBoundingClientRect().bottom : vr.top;
  panel.classList.remove('lib-panel--open');
  panel.style.top = Math.max(0, vbBottom - vr.top + gap + half) + 'px';
  _libPanelExpanded = false;
  if (grip) {
    grip.setAttribute('aria-expanded', 'false');
    grip.setAttribute('aria-label', '사전 패널 펼치기');
  }
  clearTimeout(_libPanelTimer);
  _libPanelTimer = setTimeout(_libPanelReset, LIB_PANEL_ANIM_MS);  // 트랜지션 뒤 흐름으로 복귀
}

function toggleLibPanelExpand() {
  if (typeof _playTap === 'function') _playTap();
  if (_libPanelExpanded) _libPanelCollapse();
  else _libPanelExpand();
}

// 보이싱 모달 열기
function openVoicingModal(sharpName, cardEl) {
  const modal   = document.getElementById('lib-voicing-modal');
  const overlay = document.getElementById('lib-voicing-overlay');
  if (!modal) return;

  // 클릭 카드 중심을 transform-origin으로 설정 (lib-bottom 기준 좌표)
  const bottomEl = document.querySelector('.lib-bottom');
  if (bottomEl && cardEl) {
    const br = bottomEl.getBoundingClientRect();
    const cr = cardEl.getBoundingClientRect();
    const ox = cr.left + cr.width  / 2 - br.left;
    const oy = cr.top  + cr.height / 2 - br.top;
    modal.style.transformOrigin = `${ox}px ${oy}px`;
  }

  _voicingModalChord = sharpName;
  _renderVoicingGrid(sharpName);

  overlay?.classList.add('open');
  // 두 프레임 지연으로 transition 확실히 발동
  requestAnimationFrame(() => requestAnimationFrame(() => {
    modal.classList.add('open');
  }));
}

// 보이싱 모달 닫기
function closeVoicingModal() {
  // 튜토리얼이 이 구간에서 목록을 잠갔으면 무시한다(모달 여백·오버레이 오터치 방지)
  if (window.Tutorial?.locksVoicing?.()) return;
  document.getElementById('lib-voicing-modal')?.classList.remove('open');
  document.getElementById('lib-voicing-overlay')?.classList.remove('open');
  _voicingModalChord = null;
}

// 모달 내 보이싱 그리드 렌더링
function _renderVoicingGrid(sharpName) {
  const grid = document.getElementById('lib-voicing-grid');
  if (!grid) return;
  const allEntries = (window.chordsLibrary || {})[_libRoot] || [];
  const useFlat    = accidental === 'flat';
  const filtered   = allEntries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.name === sharpName);

  grid.innerHTML = filtered.map(({ e, i }, pos) => {
    const dispName = useFlat ? e.flatName : e.name;
    // data-vpos: 이 코드 그룹 안에서 몇 번째 보이싱인지. 전역 인덱스는 코드마다 달라 튜토리얼이 못 쓴다.
    return `<div class="lib-card${_libEntry === e ? ' active' : ''}"
                 data-vpos="${pos}"
                 onclick="event.stopPropagation(); _playTap(); selectLibEntry(${i}); _libPanelCollapse(); window.Tutorial?.notify('libvoicing:${pos}');">
               <canvas class="lib-card-canvas" data-vidx="${i}"
                       width="${LIB_MINI_W}"
                       height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
             </div>`;
  }).join('');

  filtered.forEach(({ e, i }) => {
    const c = grid.querySelector(`[data-vidx="${i}"]`);
    if (c) _drawLibMiniCanvas(c, e, '');
  });
}

// 보이싱 모달이 열려있을 때 선택된 카드 active 상태만 갱신
function _updateVoicingGridActive(selectedIdx) {
  const grid = document.getElementById('lib-voicing-grid');
  if (!grid) return;
  grid.querySelectorAll('.lib-card').forEach(el => {
    const canvas = el.querySelector('.lib-card-canvas');
    if (!canvas) return;
    el.classList.toggle('active', parseInt(canvas.dataset.vidx, 10) === selectedIdx);
  });
}

function toggleLibFingerNum() {
  _playTap();
  _libFingerMode = !_libFingerMode;
  const btn = document.getElementById('lib-finger-btn');
  if (btn) btn.classList.toggle('active', _libFingerMode);
  drawLibViewerCanvas();
  analytics.track('lib_finger_num_toggled', { active: _libFingerMode });
}

function libPlayChord() {
  if (!_libEntry) return;
  const useFlat = accidental === 'flat';
  analytics.track('lib_chord_played', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name });
  playChord({ dots: _libEntry.frets.map((f, s) => f !== null && f > 0 ? {s, f} : null).filter(Boolean), openMute: _libEntry.openMute });
  window.Tutorial?.notify('libplay');
  // 튜토리얼: 자동으로 넘기지 않는다(STEP1 소리 듣기와 동일). 1초 뒤 '다음' 버튼만 풀어준다.
  setTimeout(() => window.Tutorial?.enableNext?.(), 1000);
}

function libSaveImage() {
  if (!_libEntry) return;
  openImgSaveModal('library');
}

// 검색 매칭: 근음은 대소문자 무시, quality는 대소문자 구분
// 검색 매칭 등급 — 첫 글자는 대소문자를 구분하지 않고, 두 번째 글자부터는 구분하되
// 대소문자만 다른 코드도 버리지 않고 후순위로 남긴다.
//   0 = 불일치
//   1 = 첫 글자 대소문자 무시 + 나머지 대소문자까지 일치 (우선)
//   2 = 대소문자만 다름 (후순위)
// 접두어 일치 — 입력한 글자로 "시작하는" 코드만. G7 → G7 / G7(9) / G7/F / G7sus4 는 걸리고 GM7 은 안 걸린다(등급 2로는 Gm7류 가능).
function _libMatch(name, q) {
  if (!name || !q) return 0;
  // 쿼리가 근음([A-G][#b]?)으로 시작하면 분리 매칭
  const m = q.match(/^([A-Ga-g][#b]?)(.*)/);
  if (!m) {
    // 근음 없이 quality만(예: m7, sus4) — 첫 글자만 대소문자 무시, 나머지는 구분하는 포함 검색
    const c0 = q[0], rest = q.slice(1);
    if (name.includes(c0.toLowerCase() + rest) || name.includes(c0.toUpperCase() + rest)) return 1;
    return name.toLowerCase().includes(q.toLowerCase()) ? 2 : 0;
  }
  const qRoot   = m[1][0].toUpperCase() + m[1].slice(1); // 근음 첫 글자만 대문자 정규화(첫 글자 대소문자 무시)
  const qSuffix = m[2];                                   // quality 부분 (대소문자 구분)
  const nm = name.match(/^([A-G][#b]?)(.*)/);
  if (!nm) return 0;
  if (nm[1] === qRoot && nm[2].startsWith(qSuffix)) return 1;
  // 후순위(대소문자만 다름) — 소문자로 통일해 다시 분리한다. 위의 분리는 대소문자 구분이라
  // "BB"의 두 번째 B를 임시표(b)로 못 읽어서 Bb를 놓친다.
  const lm = q.toLowerCase().match(/^([a-g][#b]?)(.*)/);
  if (lm && nm[1].toLowerCase() === lm[1] && nm[2].toLowerCase().startsWith(lm[2])) return 2;
  return 0;
}

let _libSearchResults = [];
let _libGridSearch = false;      // 사전패널 검색 중 — 코드 그리드가 근음 그리드 대신 검색 결과를 보여준다
let _libSearchTrackTimer = null;

function onLibSearch(query) {
  // 여기서 closeVoicingModal()을 부르면 안 된다 — oninput이라 한 글자 칠 때마다
  // 열려 있던 보이싱 목록이 툭 닫힌다. 닫기는 showLibSearchModal()에서 한 번만.
  const q = (query || '').trim();
  if (!q) { _libSearchResults = []; return; }

  const lib = window.chordsLibrary || {};
  const ranked = [];
  let order = 0; // 라이브러리 원래 순서 — 같은 등급 안에서 이 순서를 유지
  for (const root of Object.keys(lib)) {
    for (const entry of lib[root]) {
      const r = Math.min(...[_libMatch(entry.name, q), _libMatch(entry.flatName, q)].filter(Boolean), 99);
      if (r < 99) ranked.push({ entry, rank: r, order });
      order++;
    }
  }
  ranked.sort((a, b) => (a.rank - b.rank) || (a.order - b.order));
  _libSearchResults = ranked.map(x => x.entry);
}

function showLibSearchModal() {
  const modal = document.getElementById('lib-search-modal');
  const container = document.getElementById('lib-search-cards');
  const titleEl = document.getElementById('lib-search-modal-title');
  if (!modal || !container) return;

  // 검색 결과가 실제로 뜨는 이 시점에만 보이싱 목록을 정리한다
  closeVoicingModal();

  // 모달 상단 위치: lib-action-bar 상단에서 시작
  const actionBar = document.querySelector('#view-library .lib-action-bar');
  if (actionBar) {
    const top = actionBar.offsetTop;
    modal.style.top = top + 'px';
    modal.style.height = '';  // CSS calc 대신 top으로 제어
  }

  const q = (document.getElementById('lib-search')?.value || '').trim();
  if (q) analytics.track('lib_searched', { query: q, result_count: _libSearchResults.length });
  titleEl.textContent = _libSearchResults.length
    ? `"${q}" 검색 결과 ${_libSearchResults.length}건`
    : `"${q}" 검색 결과 없음`;

  if (!_libSearchResults.length) {
    container.innerHTML = '<div class="lib-empty">검색 결과 없음</div>';
  } else {
    const useFlat = accidental === 'flat';
    container.innerHTML = _libSearchResults.map((entry, i) => {
      const dispName = useFlat ? entry.flatName : entry.name;
      return `<div class="lib-card${_libEntry === entry ? ' active' : ''}"
                   onclick="selectLibSearchResult(${i})">
                <canvas class="lib-card-canvas" data-sidx="${i}"
                        width="${LIB_MINI_W}"
                        height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
                <div class="lib-card-name">${dispName}</div>
              </div>`;
    }).join('');
    _libSearchResults.forEach((entry, i) => {
      const c = container.querySelector(`[data-sidx="${i}"]`);
      if (c) _drawLibMiniCanvas(c, entry, '');
    });
  }

  modal.classList.add('open');
  // 대소문자 차이로 판정이 갈리지 않게 대문자로 통일해서 알린다
  window.Tutorial?.notify(`libsearch:open:${q.toUpperCase()}`);
}

function closeLibSearchModal() {
  const modal = document.getElementById('lib-search-modal');
  if (modal) modal.classList.remove('open');
  const input = document.getElementById('lib-search');
  if (input) { input.value = ''; _libSearchResults = []; }
  window.Tutorial?.notify('libsearch:close');
}

function selectLibSearchResult(idx) {
  const entry = _libSearchResults[idx];
  if (!entry) return;
  _libEntry = entry;
  _libCurrentIdx = idx;
  _libFingeringIdx = 0;
  _ensureLibCanvas();
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_search_result_selected', { chord_name: useFlat ? entry.flatName : entry.name });
  _libPanelCollapse();   // 패널을 펼친 상태였다면 접어서 코드뷰에서 결과 확인
  // 모달 active 상태 갱신
  // 사전패널 검색 중이면 결과가 코드 그리드(#lib-cards)에, 아니면 검색 모달에 있다
  const container = document.getElementById(_libGridSearch ? 'lib-cards' : 'lib-search-cards');
  container?.querySelectorAll('.lib-card').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  window.Tutorial?.notify(`libsearchpick:${idx}`);
}

// 라이브러리 저장 버튼 → showScaleDropdown 으로 진입
async function _doExportLibChordImage(scale, transparent = false) {
  if (!_libEntry) return;

  await refreshPlanFromDB();
  if (!canUseScale(scale)) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }

  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  const fileName = dispName.replace(/\//g, '_') + '_chord.png';

  const exp = document.createElement('canvas');
  exp.width  = Math.round(EXPORT_BASE_W * scale);
  exp.height = Math.round(EXPORT_BASE_H * scale);
  _drawLibCanvas(exp, EXPORT_BASE_W / BASE_W * scale, _libEntry, dispName, 0, transparent);

  const base64 = exp.toDataURL('image/png').split(',')[1];

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const n = await saveImagesToDevice([{ base64, fileName: fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') }]);
      if (!n) return;
      showSaveToast();
      incrementStat('images');
      analytics.track('lib_image_saved', { chord_name: dispName, scale, success: true });
    } catch (e) { console.error('저장 실패:', e); analytics.track('lib_image_saved', { chord_name: dispName, scale, success: false }); }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    incrementStat('images');
    analytics.track('lib_image_saved', { chord_name: dispName, scale, success: true });
  }
}


// ═════════════════════════════════════════════════
// 샵/플랫 — 이 페이지 전용(에디터 상태 없음)
// ═════════════════════════════════════════════════
function toggleLibAccidental() {
  _playTap();
  const current = document.getElementById('lib-acc-sharp')?.classList.contains('active') ? 'sharp' : 'flat';
  setLibAccidental(current === 'sharp' ? 'flat' : 'sharp');
}

function setLibAccidental(type) {
  accidental = type;
  document.getElementById('lib-acc-sharp')?.classList.toggle('active', type === 'sharp');
  document.getElementById('lib-acc-flat')?.classList.toggle('active', type === 'flat');
  analytics.track('accidental_switched', { mode: type });
  // 근음 목록 + 카드 이름 재렌더
  renderLibRootTabs();
  renderLibCards(_libRoot);
  // 보이싱 모달이 열려있으면 모달 내 코드명도 재렌더
  if (_voicingModalChord) _renderVoicingGrid(_voicingModalChord);
  // 뷰어 캔버스 코드명 재렌더
  drawLibViewerCanvas();
}

// ═════════════════════════════════════════════════
// 재생 — GuitarAudio (guitar-audio.js)
// ═════════════════════════════════════════════════
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2
const STRUM_INTERVAL = 0.055; // 줄 간 간격(초) — 값 높이면 느린 스트럼

// 활성 바레가 커버하는 줄→바레프렛 맵 생성
function buildBarreMap(dotList, barre) {
  const count = {};
  dotList.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  const map = {};
  Object.keys(count).filter(f => count[f] >= 2 && barre[Number(f)]).forEach(f => {
    const fNum = Number(f);
    const same = dotList.filter(d => d.f === fNum);
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) map[s] = fNum;
  });
  return map;
}

function playChord(chord) {
  const notes = [];
  const fretBase = chord.fretNumber >= 2 ? chord.fretNumber - 2 : 0;
  const capoOffset = 0; // 사전에는 카포 없음
  const barreMap = buildBarreMap(chord.dots, chord.barre || {});
  for (let s = 0; s < STRINGS; s++) {
    if (chord.openMute[s] === 'mute') continue;
    const sd = chord.dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const barreFret = barreMap[s];
    let fret = 0;
    if (dot !== undefined && barreFret !== undefined) {
      fret = fretBase + Math.max(dot.f, barreFret);
    } else if (dot !== undefined) {
      fret = fretBase + dot.f;
    } else if (barreFret !== undefined) {
      fret = fretBase + barreFret;
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret + capoOffset });
  }
  const sorted = notes.sort((a, b) => b.s - a.s);
  if (!sorted.length) return;
  GuitarAudio.strumNotes(sorted.map(n => n.midi), STRUM_INTERVAL);
}

// ═════════════════════════════════════════════════
// 이미지 저장 모달 — home.js 에디터/라이브러리 공용 코드의 라이브러리 전용 복제
// ═════════════════════════════════════════════════
let _imgMode        = 'library';
let _imgScale       = 1;
let _imgTransparent = false;

function openImgSaveModal(mode) {
  _imgMode = mode;
  const modal    = document.getElementById('img-save-modal');
  const backdrop = document.getElementById('img-save-backdrop');
  if (!modal) return;

  const slider = document.getElementById('img-scale-slider');
  const chk    = document.getElementById('img-transparent-chk');
  if (slider) slider.value = _imgScale;
  // 투명배경은 프리미엄 — free는 항상 해제 상태로 시작
  if (getPlan() === 'free') _imgTransparent = false;
  if (chk)    chk.checked  = _imgTransparent;
  _updateImgTransparentUI();

  _updateImgScaleUI();
  _renderImgPreview();

  if (backdrop) backdrop.classList.add('open');
  modal.classList.add('open');
  window.Tutorial?.notify('imgsave:open'); // 시트가 열린 뒤에 알림
}

function closeImgSaveModal() {
  document.getElementById('img-save-modal')?.classList.remove('open');
  document.getElementById('img-save-backdrop')?.classList.remove('open');
}

function onImgScaleInput(v) {
  _imgScale = parseFloat(v) || 1;
  _updateImgScaleUI();
}

function onImgTransparentToggle(checked) {
  // 투명배경 = 프리미엄. free가 체크 시도하면 되돌리고 업그레이드 유도
  if (checked && getPlan() === 'free') {
    const chk = document.getElementById('img-transparent-chk');
    if (chk) chk.checked = false;
    _imgTransparent = false;
    closeImgSaveModal();
    openPlanSheet('image_transparent');
    return;
  }
  _imgTransparent = !!checked;
  _renderImgPreview();
}

// 투명 옵션 라벨 프리미엄 표시 (free일 때 왕관)
function _updateImgTransparentUI() {
  const label = document.getElementById('img-transparent-label');
  if (label) label.classList.toggle('locked', getPlan() === 'free');
}

// 배율 라벨·픽셀크기·잠금상태 갱신
function _updateImgScaleUI() {
  const valEl = document.getElementById('img-scale-val');
  const w = Math.round(EXPORT_BASE_W * _imgScale);
  const h = Math.round(EXPORT_BASE_H * _imgScale);
  const locked = _imgScale > getPlanLimit('maxScale');
  if (valEl) valEl.textContent = `${_imgScale}배 · ${w}×${h} px`;

  const saveBtn = document.getElementById('img-save-btn');
  if (saveBtn) {
    saveBtn.classList.toggle('locked', locked);
    saveBtn.innerHTML = locked
      ? '<i class="ph-fill ph-crown-simple"></i> 업그레이드'
      : '저장';
  }
}

// 미리보기 캔버스 드로잉 (현재 편집/선택 코드 + 투명 반영)
function _renderImgPreview() {
  const cv = document.getElementById('img-preview-canvas');
  if (!cv) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = cv.offsetWidth;
  if (!cssW) { requestAnimationFrame(_renderImgPreview); return; }
  const cssH = Math.round(cssW * BASE_H / BASE_W);
  cv.style.height = cssH + 'px';
  cv.width  = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.classList.toggle('transparent-bg', _imgTransparent);

  if (!_libEntry) return;
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  _drawLibCanvas(cv, (cssW * dpr) / BASE_W, _libEntry, dispName, _libFingeringIdx || 0, _imgTransparent);
}


async function onImgSave() {
  if (_imgScale > getPlanLimit('maxScale')) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }
  if (_imgTransparent && getPlan() === 'free') { closeImgSaveModal(); openPlanSheet('image_transparent'); return; }
  _playConfirmSfx();
  closeImgSaveModal();
  await _doExportLibChordImage(_imgScale, _imgTransparent);
  window.Tutorial?.notify('imgsave:done');
}

let _toastTimer = null;
function showSaveToast() {
  const el = document.getElementById('save-toast');
  if (!el) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  // 애니메이션 재시작을 위해 클래스 제거 후 reflow
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
}


// ═════════════════════════════════════════════════
// 노트에 저장 — 프로젝트 선택 시트
// ═════════════════════════════════════════════════
let _pendingChordForSheet = null;

function libSaveToProject() {
  if (!_libEntry) return;
  _playTap();
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  // 에디터 "슬롯2 = fretNumber" 모델 — pattern: 라벨 r+1/offset r-1, static: 라벨 r/offset r-2 (라벨 최소 2)
  // (static 공식 하드코딩 시 pattern 보이싱 dot이 에디터에서 우측 1칸 밀림 — importLibChordToProject와 동일 공식)
  const _saveFretNum = Math.max(2, _libEntry.source === 'pattern' ? _libEntry.fretNumber + 1 : _libEntry.fretNumber);
  const fretOffset = _saveFretNum - 2;
  const activeFingering = (_libEntry.fingerings?.[_libFingeringIdx]) ?? _libEntry.fingerings?.[0] ?? _libEntry.fingering;

  const libDots = _libEntry.frets
    .map((f, s) => (f !== null && f > 0)
      ? { s, f: f - fretOffset, n: _libFingerMode ? (typeof activeFingering?.[s] === 'number' ? activeFingering[s] : 0) : 0 }
      : null)
    .filter(Boolean);
  const libOpenMute = _libEntry.frets.map((f, s) => {
    if (f === null || _libEntry.openMute[s] === 'mute') return 'mute';
    if (f === 0) return 'open';
    return 'open';
  });
  const libBarre = {};
  const importBarre = _libEntry.barres?.[_libFingeringIdx] ?? _libEntry.barres?.[0] ?? _libEntry.barre ?? {};
  Object.entries(importBarre).forEach(([f, v]) => { libBarre[parseInt(f) - fretOffset] = v; });

  const comp = parseChordNameToComponents(dispName)
    || { root: 'C', bass: '', triad: '', seventh: '', func: '', tension: '' };

  _pendingChordForSheet = {
    id: genId(),
    name: dispName,
    root: comp.root,
    triad: comp.triad  || '',
    seventh: comp.seventh || '',
    func: comp.func    || '',
    tensions: comp.tension ? [comp.tension] : [],
    bass: comp.bass    || '',
    dots: libDots,
    openMute: libOpenMute,
    barre: libBarre,
    barreRange: _libEntry.barreRanges?.[_libFingeringIdx] ?? _libEntry.barreRanges?.[0] ?? _libEntry.barreRange ?? null, // 바레 현 범위 보존(선택 보이싱과 동일 인덱스)
    source: _libEntry.source, // pattern/static — dot 세로 offset 결정, 누락 시 어긋남
    fretNumber: _saveFretNum,
    fingerNumMode: _libFingerMode,
    accidental: accidental,
    // 원본 보이싱 스냅샷 — 라이브러리 카드와 동일 렌더 계약. chordToVoicing이 이걸 우선 사용.
    voicing: {
      frets:      _libEntry.frets,
      openMute:   _libEntry.openMute,
      barre:      _libEntry.barres?.[_libFingeringIdx] ?? _libEntry.barres?.[0] ?? _libEntry.barre ?? {},
      barreRange: _libEntry.barreRanges?.[_libFingeringIdx] ?? _libEntry.barreRanges?.[0] ?? _libEntry.barreRange ?? null,
      fretNumber: _libEntry.fretNumber,
      source:     _libEntry.source,
      fingering:  _libFingerMode ? ((_libEntry.fingerings?.[_libFingeringIdx]) ?? _libEntry.fingerings?.[0] ?? _libEntry.fingering) : null,
    },
  };
  openProjectSheet();
}

function _relativeTime(ts) {
  if (!ts) return '';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)     return `${sec}초 전`;
  if (sec < 3600)   return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}일 전`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}주 전`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)}달 전`;
  return `${Math.floor(sec / 31536000)}년 전`;
}

// ── 프로젝트 선택 바텀시트 ──────────────────────────────
function openProjectSheet() {
  const overlay = document.getElementById('project-sheet-overlay');
  const list    = document.getElementById('project-sheet-list');
  if (!overlay || !list) return;

  const projects = loadProjects();
  analytics.track('project_sheet_opened', { project_count: projects.length });
  list.innerHTML = '';

  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-sheet-item';
    item.innerHTML =
      `<span class="project-sheet-item-name">${p.name}</span>` +
      `<span class="project-sheet-item-count">${_relativeTime(p.updatedAt || p.createdAt)}</span>`;
    item.addEventListener('click', () => _addChordToProject(p.id));
    list.appendChild(item);
  });

  window.Tutorial?.notify('notesheet:open');

  // 새 프로젝트 만들기 카드 — 항상 최하단
  const card = document.createElement('div');
  card.className = 'project-sheet-new-card';
  card.innerHTML =
    `<i data-lucide="plus-circle" class="project-sheet-new-icon"></i>` +
    `<span class="project-sheet-new-label">새 노트 만들기</span>`;
  card.addEventListener('click', () => {
    closeProjectSheet();
    setTimeout(() => promptCreateProject(), 350);
  });
  list.appendChild(card);
  if (window.lucide) lucide.createIcons({ nodes: [card] });

  overlay.classList.remove('hidden', 'closing');
  // display:none 해제 후 한 프레임 더 대기해야 모바일에서 transition이 정상 동작
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
}

function closeProjectSheet() {
  const overlay = document.getElementById('project-sheet-overlay');
  if (!overlay) return;
  _playTap();
  window.Tutorial?.notify('notesheet:close');
  overlay.classList.remove('open');
  overlay.classList.add('closing');
  overlay.addEventListener('transitionend', () => {
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
  }, { once: true });
}

function onProjectSheetOverlayClick(e) {
  if (e.target === e.currentTarget) closeProjectSheet();
}

function _addChordToProject(projectId) {
  const projects = loadProjects();
  const project  = projects.find(p => p.id === projectId);
  if (!project) return;

  const chordData = _pendingChordForSheet;
  _pendingChordForSheet = null;
  if (!chordData) return;

  project.chords.push(chordData);
  analytics.track('chord_added', { chord_name: chordData.name, project_id: projectId });

  project.updatedAt = Date.now();
  saveProjects(projects);
  closeProjectSheet();
  showTextToast(`"${project.name}"에 추가됐습니다`);
}

// ── 일반 텍스트 토스트 ────────────────────────────────────
let _textToastTimer = null;
function showTextToast(msg) {
  const el = document.getElementById('text-toast');
  if (!el) return;
  el.textContent = msg;
  if (_textToastTimer) clearTimeout(_textToastTimer);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _textToastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}


// ── 새 노트 만들기 (프로젝트 시트의 "새 노트 만들기" 카드) ──
async function promptCreateProject() {
  await refreshPlanFromDB();
  if (!canCreateProject()) {
    analytics.track('project_limit_hit', {
      current_count: loadProjects().length,
      plan_limit: getPlanLimit('maxProjects'),
    });
    openPlanSheet('note_limit');
    return;
  }
  const input = document.getElementById('create-project-name-input');
  input.value = '';
  document.getElementById('modal-create-project').classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => input.focus());
  window.Tutorial?.notify('notecreate:open');
}

function confirmCreateProject() {
  const input = document.getElementById('create-project-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (!canCreateProject()) {
    closeModal('modal-create-project');
    openPlanSheet('note_limit');
    return;
  }

  closeModal('modal-create-project');

  const projects = loadProjects();
  const newProject = {
    id: genId(),
    name,
    pinned: false,
    pinnedOrder: 0,
    important: false,
    importantOrder: 0,
    capo: 0,
    bpm: 120,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: [],
    arrangement: []
  };
  projects.push(newProject);
  saveProjects(projects);
  analytics.track('project_created', { total_count: projects.length });
  incrementStat('notes'); // 노트 생성 퀘스트 누적 카운터
  window.Tutorial?.notify('notecreate:done');
  _leaveLibrary('user_project.html?id=' + newProject.id);
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ═════════════════════════════════════════════════
// 에디터로 인계 · 페이지 이탈
// ═════════════════════════════════════════════════
// 에디터는 home.html 안에 있어서 페이지 간 인계가 필요하다. 선택 코드(엔트리·운지 인덱스·번호 표시·샵/플랫)를
// sessionStorage에 남기고 home.html?view=editor&from_lib=1로 이동 → home.js가 받아 기존 import 로직 실행.
const LIB_HANDOFF_KEY = 'chorditor_lib_handoff';

function importLibChordToProject() {
  if (!_libEntry) return;
  _playTap();
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  try {
    sessionStorage.setItem(LIB_HANDOFF_KEY, JSON.stringify({
      entry:        _libEntry,
      fingeringIdx: _libFingeringIdx,
      fingerMode:   _libFingerMode,
      accidental,
      ts:           Date.now(),
    }));
  } catch (_) { return; } // 저장 실패하면 이동하지 않는다(빈 에디터로 가는 것보다 낫다)
  analytics.track('lib_chord_imported', { chord_name: dispName });
  _leaveLibrary('home.html?view=editor&from_lib=1');
}

// 이탈 정리 함수 — 모든 출구(뒤로가기 버튼·하드웨어 뒤로가기·에디터로·새 노트·pagehide·앱 전환)가 같이 쓴다.
// 멱등. 소리는 하드컷(panic) — 페이드(stop)는 이탈 처리로 쓰지 않는다.
function _libCleanup() {
  try { if (typeof GuitarAudio !== 'undefined') GuitarAudio.panic?.(); } catch (_) {}
}

let _libLeaving = false;
function _leaveLibrary(url) {
  if (_libLeaving) return;
  _libLeaving = true;
  _libCleanup();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = url; }, 260);
  } else {
    location.href = url;
  }
}

function closeLibraryPage() {
  _playTap();
  _leaveLibrary('home.html');
}

// ═════════════════════════════════════════════════
// 사전패널 12key 셀렉터 — 상단 줄 아래에 항상 표시(32px 정사각형, 1줄 가로 스크롤).
// 고르면 selectLibRoot()와 같은 경로. 가장자리 흐림/마우스 드래그 스크롤은 shared.js 공용 함수 재사용.
// 선택은 pointerup — 드래그했으면 initKeySelectorDragScroll이 capture 단계에서 막아 준다.
// ═════════════════════════════════════════════════
function renderLibPanelKeys() {
  const track = document.getElementById('lib-panel-keys-track');
  if (!track) return;
  const roots   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const flatMap = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
  const useFlat = accidental === 'flat';
  const prevScroll = track.scrollLeft; // 다시 그려도 스크롤 위치를 유지(안 하면 0으로 튐)
  track.innerHTML = roots.map(r =>
    `<button class="lib-panel-key-item${r === _libRoot ? ' active' : ''}" data-root="${r}"
             onpointerup="pickLibPanelKey('${r}')">${useFlat ? (flatMap[r] || r) : r}</button>`
  ).join('');
  track.scrollLeft = prevScroll;
  // 선택된 근음이 가려져 있으면 보이는 위치로 — scrollIntoView는 상위 컨테이너까지 움직여서 쓰지 않는다.
  // (패널이 숨겨진 세로 레이아웃에선 clientWidth가 0이라 건너뜀)
  const act = track.querySelector('.lib-panel-key-item.active');
  if (act && track.clientWidth > 0) {
    const left = act.offsetLeft, right = left + act.offsetWidth;
    if (left < track.scrollLeft || right > track.scrollLeft + track.clientWidth) {
      track.scrollLeft = left - (track.clientWidth - act.offsetWidth) / 2;
    }
  }
  track.dispatchEvent(new Event('scroll')); // 흐림 상태 갱신(내용이 바뀌면 스크롤 폭도 바뀜)
}

function pickLibPanelKey(root) {
  _closeLibPanelSearch(); // 검색 중이었으면 닫고(입력 비움) 근음 그리드로 복귀
  selectLibRoot(root);    // 근음 변경 + 카드 갱신 + 튜토리얼 알림(기존 경로)
}

// ═════════════════════════════════════════════════
// 사전패널 검색 결과 — 한 글자 칠 때마다 코드 그리드에 위에서부터 순서대로(등급 1 → 2, 같은 등급은 라이브러리 순서)
// ═════════════════════════════════════════════════
function _renderLibSearchGrid() {
  const container = document.getElementById('lib-cards');
  if (!container) return;
  if (!_libSearchResults.length) {
    container.innerHTML = '<div class="lib-empty">검색 결과 없음</div>';
    return;
  }
  const useFlat = accidental === 'flat';
  container.innerHTML = _libSearchResults.map((entry, i) => {
    const dispName = useFlat ? entry.flatName : entry.name;
    return `<div class="lib-card${_libEntry === entry ? ' active' : ''}"
                 onclick="selectLibSearchResult(${i})">
              <canvas class="lib-card-canvas" data-sidx="${i}"
                      width="${LIB_MINI_W}"
                      height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
              <div class="lib-card-name">${dispName}</div>
            </div>`;
  }).join('');
  _libSearchResults.forEach((entry, i) => {
    const c = container.querySelector(`[data-sidx="${i}"]`);
    if (c) _drawLibMiniCanvas(c, entry, '');
  });
  container.parentElement && (container.parentElement.scrollTop = 0); // 새 결과는 맨 위부터
}

function onLibPanelSearchInput(value) {
  onLibSearch(value);                          // _libSearchResults 갱신(우선순위 정렬)
  const q = (value || '').trim();
  _libGridSearch = !!q;
  if (q) closeVoicingModal();                  // 열려 있던 운지 팝업은 결과와 무관하므로 정리
  renderLibCards(_libRoot);                    // 검색 중 → 결과 그리드, 비었으면 근음 그리드 복귀
  // 분석은 입력이 멈춘 뒤 한 번만(글자마다 보내지 않는다)
  clearTimeout(_libSearchTrackTimer);
  if (q) {
    _libSearchTrackTimer = setTimeout(() => {
      analytics.track('lib_searched', { query: q, result_count: _libSearchResults.length });
    }, 700);
  }
}

// 검색 상태 초기화 — 입력 비움 + 결과 비움 + 근음 그리드 복귀(입력창 UI는 건드리지 않음)
function _resetLibPanelSearch() {
  const input = document.getElementById('lib-panel-search-input');
  if (input) input.value = '';
  clearTimeout(_libSearchTrackTimer);
  _libSearchResults = [];
  if (_libGridSearch) {
    _libGridSearch = false;
    renderLibCards(_libRoot);
  }
}

// 검색창을 접고 초기화(근음 선택 등 검색을 끝내는 동작이 공용으로 호출)
function _closeLibPanelSearch() {
  const box = document.getElementById('lib-panel-search');
  if (box) box.classList.remove('open');
  document.getElementById('lib-panel-search-input')?.blur();
  _resetLibPanelSearch();
}

// ═════════════════════════════════════════════════
// 사전패널 검색 — 아이콘을 누르면 왼쪽으로 늘어나며 입력창이 열린다(CSS 전환, .open 토글).
// 입력하면 글자마다 코드 그리드가 검색 결과로 바뀐다(위 onLibPanelSearchInput).
// ═════════════════════════════════════════════════
function toggleLibPanelSearch() {
  const box   = document.getElementById('lib-panel-search');
  const input = document.getElementById('lib-panel-search-input');
  if (!box) return;
  const open = box.classList.toggle('open');
  if (open) {
    _libPanelExpand();   // 세로: 키보드가 올라오기 전에 패널을 펼쳐 결과가 보이게(가로·이미 펼침이면 무시)
    // 전환이 시작된 뒤에 포커스 — 한 프레임 미루지 않으면 폭이 0인 입력창에 포커스가 가서 스크롤이 튄다
    requestAnimationFrame(() => input?.focus({ preventScroll: true }));
  } else {
    input?.blur();
    _resetLibPanelSearch(); // 검색창을 접으면 입력과 결과를 비우고 근음 그리드로 복귀
  }
}

// ═════════════════════════════════════════════════
// 초기화
// ═════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // 페이지 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  // 페이지 커버
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.setScreen('library');
  analytics.track('library_opened', {});

  document.getElementById('lib-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  document.getElementById('lib-acc-flat')?.classList.toggle('active', accidental === 'flat');
  renderLibRootTabs();

  // 사전패널 12key 셀렉터 — 가장자리 흐림 + 마우스 드래그 스크롤(shared.js 공용)
  const _keyTrack = document.getElementById('lib-panel-keys-track');
  if (_keyTrack) {
    if (typeof initKeySelectorDragScroll === 'function') initKeySelectorDragScroll(_keyTrack);
    if (typeof initKeySelectorFade === 'function') initKeySelectorFade(_keyTrack);
  }

  // 코드 사전 와이드 레이아웃(스플릿 뷰) — 액션바(토글바)를 .lib-bottom-area(목록 패널) 밖으로 꺼내
  // 다이어그램(.lib-viewer, 우측 코드 뷰) 안으로 넣어 한 묶음으로 쓴다. 근음 레일·제목은 이동하지
  // 않고 원래 DOM 자리에서 CSS grid로 배치(style.css 와이드 블록).
  (() => {
    const _mq = libWideMq();
    const _bottom = document.querySelector('#view-library .lib-bottom');
    const _bottomArea = document.querySelector('#view-library .lib-bottom-area');
    const _actionSection = document.querySelector('#view-library .lib-action-section');
    const _viewer = document.querySelector('#view-library .lib-viewer');
    // 사전패널로 옮길 요소 — 코드 그리드(카드 영역)와, 그 위에 뜨는 운지 선택 팝업(오버레이+모달)
    const _panel     = document.getElementById('lib-panel');
    const _cardsArea = document.querySelector('#view-library .lib-cards-area');
    const _vOverlay  = document.getElementById('lib-voicing-overlay');
    const _vModal    = document.getElementById('lib-voicing-modal');
    if (!_bottom || !_bottomArea || !_actionSection || !_viewer) return;
    const _place = () => {
      // 가로(와이드): 코드 그리드 + 운지 팝업을 사전패널 안으로. 세로: 원래 자리(.lib-bottom, 근음 레일 뒤)로 복원.
      // id·클래스가 그대로라 렌더링/튜토리얼 로직은 위치와 무관하게 동작한다.
      if (_panel && _cardsArea && _vOverlay && _vModal) {
        if (_mq.matches) _panel.append(_cardsArea, _vOverlay, _vModal);
        else _bottom.append(_cardsArea, _vOverlay, _vModal);
      }
      // #/b 토글 — 가로: 패널 우측 도구 묶음의 검색 왼쪽으로. 세로: 액션바 맨 앞(원래 자리)으로 복원.
      // 같은 요소(id lib-acc-sharp/flat, onclick)를 옮기므로 상태 동기화 코드는 그대로 동작한다.
      const _accToggle = document.querySelector('#view-library .accidental-toggle');
      const _tools     = document.getElementById('lib-panel-tools');
      const _actionBarEl = document.querySelector('#view-library .lib-action-bar');
      if (_accToggle && _tools && _actionBarEl) {
        if (_mq.matches) _tools.prepend(_accToggle);
        else _actionBarEl.prepend(_accToggle);
      }
      if (_mq.matches) {
        // 좁은 화면에서 이미 굳혀둔 인라인 높이 고정을 해제 — 안 풀면 목록 패널을 못 채운다.
        // dataset도 지워서 다시 좁아졌을 때 재고정될 수 있게 함.
        _bottom.style.height = '';
        _bottom.style.flex   = '';
        delete _bottom.dataset.heightFixed;
        _viewer.appendChild(_actionSection);
      } else {
        _bottomArea.prepend(_actionSection);
      }
      // 와이드 진입/이탈로 .lib-card-canvas 표시폭이 바뀌므로 실제 비트맵 해상도도 다시 맞춘다.
      if (typeof renderLibCards === 'function') renderLibCards(_libRoot);
    };
    _place();
    _mq.addEventListener('change', _place);
    onViewportResync(_place); // iPad 복귀 시 change 누락 대비
  })();

  // 코드 사전 와이드 레이아웃 — 버튼 자리 맞바꾸기.
  // 이미지저장·재생은 다이어그램 아래 줄(#lib-codeview-tools)로, "에디터로"·"노트에 저장"은 코드뷰 상단 줄 우측 끝
  // (#lib-codeview-actions)으로 옮긴다. 같은 요소라 id·onclick·튜토리얼 선택자가 그대로 동작한다.
  (() => {
    const _mq = libWideMq();
    const _view = document.getElementById('view-library');
    const _actionBar = document.querySelector('#view-library .lib-action-bar');
    const _actionSection = document.querySelector('#view-library .lib-action-section');
    const _viewer2 = document.querySelector('#view-library .lib-viewer');
    const _sideBtns  = document.querySelector('#view-library .lib-canvas-side-btns');
    const _saveImg = document.getElementById('lib-btn-save-image');
    const _play    = document.getElementById('lib-btn-play');
    const _saveNote = document.getElementById('lib-btn-save-note');
    const _toEditor = document.getElementById('lib-btn-to-editor');
    if (!_view || !_actionBar || !_actionSection || !_viewer2 || !_sideBtns || !_saveImg || !_play || !_saveNote || !_toEditor) return;
    const _actions = document.getElementById('lib-codeview-actions');
    const _tools   = document.getElementById('lib-codeview-tools');
    const _fingerBtn  = document.getElementById('lib-finger-btn');       // 손가락 번호 표시 토글
    const _fingerSlot = document.getElementById('lib-finger-tip-slot');  // 팁 설명 왼쪽 자리
    if (!_actions || !_tools) return;
    // 세로 배치의 원래 라벨 — 가로에서만 "에디터로 편집"으로 바꿔 쓰고 돌아오면 복원
    const _toEditorLabel = _toEditor.textContent;
    const _place = () => {
      if (_mq.matches) {
        // 이미지 저장·재생: 다이어그램(+운지 넘김) 바로 아래 줄로
        _tools.append(_saveImg, _play);
        // 순서: 에디터로 편집 → 노트에 저장 (우측 끝)
        _actions.append(_toEditor, _saveNote);
        _toEditor.textContent = '에디터로 편집';
        // 손가락 번호 버튼 → 팁 설명 왼쪽. 어떤 버튼의 설명인지 바로 보이게 한다
        if (_fingerBtn && _fingerSlot) _fingerSlot.appendChild(_fingerBtn);
      } else {
        _sideBtns.appendChild(_saveImg);
        _sideBtns.appendChild(_play);
        _actionBar.appendChild(_saveNote);
        _actionBar.appendChild(_toEditor);
        _toEditor.textContent = _toEditorLabel;
        // 손가락 번호 버튼 원위치 — 액션바의 .ab-spacer 앞(# b 토글 다음)
        if (_fingerBtn) _actionBar.insertBefore(_fingerBtn, _actionBar.querySelector('.ab-spacer'));
      }
    };
    _place();
    _mq.addEventListener('change', _place);
    onViewportResync(_place); // iPad 복귀 시 change 누락 대비
  })();

  // 검색 — 세로·모바일(~768px)은 탑바 우측 슬롯으로, 가로는 사전패널 도구 묶음(#/b 토글 오른쪽)으로.
  // 같은 요소(id lib-panel-search)를 옮기므로 펼침·입력·결과 반영 코드는 그대로 동작한다.
  (() => {
    const _mqN  = window.matchMedia('(max-width: 768px)');
    const _box  = document.getElementById('lib-panel-search');
    const _slot = document.getElementById('lib-topbar-search-slot');
    const _tools = document.getElementById('lib-panel-tools');
    if (!_box || !_slot || !_tools) return;
    const _place = () => { (_mqN.matches ? _slot : _tools).appendChild(_box); };
    _place();
    _mqN.addEventListener('change', _place);
    onViewportResync(_place); // iPad 복귀 시 change 누락 대비
  })();

  // [에디터로 편집][노트에 저장] 묶음 — 세로·모바일은 패널 머리(#/b 토글 줄) 우측 끝으로, 가로는 코드뷰 상단 줄(홈 아이콘 왼쪽)로.
  (() => {
    const _mqN  = window.matchMedia('(max-width: 768px)');
    const _acts = document.getElementById('lib-codeview-actions');
    const _head = document.querySelector('#lib-panel .lib-panel-head');
    const _right = document.querySelector('#lib-codeview-head .lib-codeview-right');
    if (!_acts || !_head || !_right) return;
    const _place = () => {
      if (_mqN.matches) _head.appendChild(_acts);
      else _right.prepend(_acts);
    };
    _place();
    _mqN.addEventListener('change', _place);
    onViewportResync(_place);
  })();

  // 펼친 채로 화면 크기가 바뀌면(주소창·키보드·회전) 위치를 다시 잡는다.
  window.addEventListener('resize', () => {
    if (!_libPanelExpanded) return;
    const { panel } = _libPanelEls();
    if (panel) panel.style.top = _libPanelOpenTop() + 'px';
  });

  // 가로(769px~)로 넘어가면 펼침 상태를 즉시 해제 — 가로는 스플릿 뷰라 패널을 덮는 상태가 없다.
  (() => {
    const _mqN = window.matchMedia('(max-width: 768px)');
    _mqN.addEventListener('change', () => { if (!_mqN.matches) _libPanelReset(); });
  })();

  // 키보드가 올라와 웹뷰 높이가 줄어도 코드뷰·패널 크기가 변하지 않게 — 세로 레이아웃의 dvh 대신 쓰는 고정 단위(--lib-dvh = 1dvh).
  // 같은 폭에서 높이가 줄어드는 건 키보드로 보고 무시, 폭이 바뀌면(회전·접힘) 새로 잡는다.
  (() => {
    let w = 0, h = 0;
    const apply = () => {
      const iw = window.innerWidth, ih = window.innerHeight;
      if (iw !== w) { w = iw; h = ih; }
      else if (ih > h) h = ih;
      document.documentElement.style.setProperty('--lib-dvh', (h / 100) + 'px');
    };
    apply();
    window.addEventListener('resize', apply);
  })();

  // 코드 사전 뷰어 캔버스 — CSS 표시폭이 미디어쿼리로 바뀔 때마다 비트맵 해상도 재계산.
  // 안 하면 폭이 넓어진 스코프(와이드 레이아웃)에서 옛 320px 기준 비트맵이 업스케일되어 흐려진다
  // (코드 에디터 resizeCanvas()와 동일한 이유의 ResizeObserver).
  (() => {
    const _canvasEl = document.getElementById('lib-canvas');
    if (!_canvasEl || !window.ResizeObserver) return;
    new ResizeObserver(() => { if (_libEntry) drawLibViewerCanvas(); }).observe(_canvasEl);
  })();

  // 코드 그리드 — 카드 폭이 패널(격자) 폭에 맞춰 자동으로 바뀌므로, 폭이 달라지면 미니 캔버스
  // 비트맵도 그 폭 기준으로 다시 그린다(안 하면 늘어난 카드에서 업스케일되어 흐려짐).
  (() => {
    const _gridEl = document.getElementById('lib-cards');
    if (!_gridEl || !window.ResizeObserver) return;
    let _lastW = 0, _t = null;
    new ResizeObserver(() => {
      const w = Math.round(_gridEl.clientWidth);
      if (!w || w === _lastW) return; // 숨김(0)이거나 폭이 같으면(높이만 변함) 건너뜀
      _lastW = w;
      clearTimeout(_t);
      _t = setTimeout(() => renderLibCards(_libRoot), 60);
    }).observe(_gridEl);
  })();

  // 카드 그리드·뷰어 — 뷰가 방금 그려진 시점에 캔버스를 재면 레이아웃이 아직 안 끝나 작은 값이
  // 잡히므로 rAF를 두 번 겹친다(미니 캔버스는 offsetWidth 실측으로 그리기 때문).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderLibCards(_libRoot);
      const _initEntries = (window.chordsLibrary || {})[_libRoot] || [];
      if (_initEntries.length > 0) selectLibEntry(0, { silent: true });
      // 세로 레이아웃은 .lib-bottom 높이를 한 번 고정한다(와이드는 목록 패널이 flex로 채움)
      if (!libWideMq().matches) {
        const bottom = document.querySelector('.lib-bottom');
        if (bottom && !bottom.dataset.heightFixed) {
          bottom.style.height = bottom.getBoundingClientRect().height + 'px';
          bottom.style.flex   = 'none';
          bottom.dataset.heightFixed = '1';
        }
      }
      // 튜토리얼 진행 중이면 이어받기 — 카드·근음 탭이 다 그려진 뒤라야 대상 위치가 잡힌다
      if (typeof Tutorial !== 'undefined') Tutorial.resume();
    });
  });

  // ── 이탈 처리 (CLAUDE.md 규칙 0-2): 어떤 경로로 나가든 소리 즉시 중단 ──
  window.addEventListener('pagehide', _libPanelReset);   // 타이머·펼침 상태 정리(이탈 규칙 0-2)
  window.addEventListener('pagehide', _libCleanup);
  document.addEventListener('visibilitychange', () => { if (document.hidden) _libCleanup(); });

  // Android 하드웨어 뒤로가기: 튜토리얼 > 열린 레이어(이미지 저장·노트 시트·검색·운지 팝업) > 홈
  const _CapApp = window.Capacitor?.Plugins?.App;
  if (_CapApp) {
    _CapApp.addListener('backButton', () => {
      if (window.Tutorial?.isRunning?.()) { window.Tutorial.confirmSkip(); return; }
      if (document.getElementById('img-save-modal')?.classList.contains('open')) { closeImgSaveModal(); return; }
      const _sheet = document.getElementById('project-sheet-overlay');
      if (_sheet && !_sheet.classList.contains('hidden')) { closeProjectSheet(); return; }
      if (document.getElementById('lib-search-modal')?.classList.contains('open')) { closeLibSearchModal(); return; }
      if (document.getElementById('lib-voicing-modal')?.classList.contains('open')) { closeVoicingModal(); return; }
      if (_libPanelExpanded) { _libPanelCollapse(); return; }   // 펼친 패널은 홈보다 먼저 접는다
      closeLibraryPage();
    });
  }
});
