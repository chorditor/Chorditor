// ═══════════════════════════════════════════════════════════════
// strum-play.js — 주법 연습 페이지 (개별 카드 진입)
// ═══════════════════════════════════════════════════════════════

// 진입한 카드 데이터
let STRUM_ITEM = null;

// ── 기본 코드 진행 (임시: A 1개. 추후 진행 리스트 연동) ──────
const STRUM_PROG = ['A', 'E', 'A', 'E'];

// 코드명 → 기본 보이싱 (chordsLibrary 첫 매칭)
function strumDefaultVoicing(chordName) {
  const lib = window.chordsLibrary || {};
  const list = lib[chordName] || [];
  return list.find((e) => e.name === chordName) || list[0] || null;
}

// 슬롯 1개에 코드 캔버스 드로잉
function strumDrawSlot(slot, chordName) {
  const voicing = strumDefaultVoicing(chordName);
  const canvas = slot.querySelector('canvas');
  const dpr  = window.devicePixelRatio || 1;
  const cssW = slot.offsetWidth;
  if (!cssW) return;
  const ratio = (cssW * dpr) / VoicingCanvas.BASE_W;
  VoicingCanvas.draw(canvas, voicing, { chordName, ratio, transparent: true });
  canvas.style.width  = cssW + 'px';
  canvas.style.height = Math.round(cssW * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W) + 'px';
}

// 코드 진행 렌더 (progression-detail 4슬롯 가로 휠 방식)
// 역할: dom0=far-left, dom1=prev, dom2=current, dom3=next. 마디마다 좌로 1칸 회전.
const STRUM_ROLE_NAMES = ['far-left', 'prev', 'current', 'next'];
let _strumStageRO   = null;
let _strumSlotDoms  = [];
let _strumSlotRoles = [];   // domIdx → 역할(0~3)
let _strumCurIdx    = 0;    // current 슬롯이 가리키는 코드진행 인덱스

function _strumNormIdx(i) {
  const c = STRUM_PROG.length;
  return ((i % c) + c) % c;
}

function _strumRoleToDom(role) {
  return _strumSlotRoles.indexOf(role);
}

// domIdx 슬롯에 코드진행 progIdx의 코드 드로잉
function strumDrawSlotIdx(domIdx, progIdx) {
  const idx = _strumNormIdx(progIdx);
  _strumSlotDoms[domIdx].dataset.prog = idx;
  strumDrawSlot(_strumSlotDoms[domIdx], STRUM_PROG[idx]);
}

function renderStrumProg() {
  const row = document.getElementById('strum-prog');
  if (!row) return;
  row.innerHTML = '';
  if (_strumStageRO) { _strumStageRO.disconnect(); _strumStageRO = null; }

  _strumCurIdx    = 0;
  _strumSlotDoms  = [];
  _strumSlotRoles = [0, 1, 2, 3];

  for (let i = 0; i < 4; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'progd-slot progd-slot--' + STRUM_ROLE_NAMES[i];
    const canvas = document.createElement('canvas');
    canvas.className = 'progd-chord-canvas';
    wrap.appendChild(canvas);
    row.appendChild(wrap);
    _strumSlotDoms.push(wrap);
  }
  requestAnimationFrame(() => {
    strumDrawSlotIdx(0, _strumCurIdx - 2); // far-left
    strumDrawSlotIdx(1, _strumCurIdx - 1); // prev
    strumDrawSlotIdx(2, _strumCurIdx);     // current
    strumDrawSlotIdx(3, _strumCurIdx + 1); // next
  });

  // 슬롯 크기 변할 때 재드로잉 (폭 좁아질 때 겹침 방지)
  if (window.ResizeObserver) {
    _strumStageRO = new ResizeObserver(() => {
      _strumSlotDoms.forEach((slot) => {
        if (slot.dataset.prog != null) strumDrawSlot(slot, STRUM_PROG[Number(slot.dataset.prog)]);
      });
    });
    _strumSlotDoms.forEach((slot) => _strumStageRO.observe(slot));
  }
}

// 한 칸 좌로 회전 (progression-detail _advanceStage 방식). newCurrent=새 current 코드 인덱스
function strumAdvanceProg(newCurrent) {
  if (!_strumSlotDoms.length) return;
  const domFL   = _strumRoleToDom(0);
  const domPrev = _strumRoleToDom(1);
  const domCurr = _strumRoleToDom(2);
  const domNext = _strumRoleToDom(3);

  // far-left → far-right로 즉시 스냅 후 새 next+1 콘텐츠 그리기 (안 보이는 상태)
  _strumSlotDoms[domFL].className = 'progd-slot progd-slot--far-right progd-no-transition';
  strumDrawSlotIdx(domFL, newCurrent + 1);
  void _strumSlotDoms[domFL].getBoundingClientRect(); // 강제 reflow

  // 4슬롯 동시 슬라이드
  _strumSlotDoms[domFL].className   = 'progd-slot progd-slot--next';
  _strumSlotDoms[domPrev].className = 'progd-slot progd-slot--far-left';
  _strumSlotDoms[domCurr].className = 'progd-slot progd-slot--prev';
  _strumSlotDoms[domNext].className = 'progd-slot progd-slot--current';

  _strumSlotRoles[domFL]   = 3;
  _strumSlotRoles[domPrev] = 0;
  _strumSlotRoles[domCurr] = 1;
  _strumSlotRoles[domNext] = 2;
  _strumCurIdx = _strumNormIdx(newCurrent);
}

// ── 비트 박스보더 (strumming.js 그리드 로직 재사용, 1줄 고정) ──
function strumGroupSize(beat, cells) {
  const [n, d] = String(beat).split('/').map(Number);
  if (!n || !d) return 0;
  const mainBeats = d === 8 ? n / 3 : n;
  const g = cells / mainBeats;
  return Number.isInteger(g) && g > 1 ? g : 0;
}

function strumStrokeString(item) {
  if (item.strokes) return item.strokes.toUpperCase();
  const n = item.count || 0;
  const alt = item.alt === true;
  const skip = item.skip || [];
  let s = '';
  for (let i = 1; i <= n; i++) {
    if (skip.includes(i)) s += '-';
    else s += alt ? 'D' : (i % 2 ? 'D' : 'U');
  }
  return s;
}

function strumCellHtml(ch, pos, alt, isCut) {
  let dir = ch;
  let ghost = false;
  if (ch === '-') {
    ghost = true;
    dir = alt ? 'D' : (pos % 2 ? 'D' : 'U');
  }
  const ghostCls = ghost ? ' strum-stroke--ghost' : '';
  let inner = '';
  if (dir === 'U') {
    inner = `<svg class="strum-stroke strum-stroke--up${ghostCls}" viewBox="0 0 10 10" fill="none"><path d="M1.5 1 L5 9 L8.5 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else if (dir === 'D') {
    inner = `<span class="strum-stroke strum-stroke--down${ghostCls}"></span>`;
  }
  // 컷팅: 셀 상단에 X 아이콘 (뮤트 스트로크)
  const cutHtml = isCut ? '<span class="strum-cut">✕</span>' : '';
  return `<div class="strum-beat-cell">${cutHtml}${inner}</div>`;
}

function renderStrumGrid() {
  const wrap = document.getElementById('strum-play-grid');
  if (!wrap || !STRUM_ITEM) return;
  const strokes = strumStrokeString(STRUM_ITEM);
  const cells = strokes.length;
  const alt = STRUM_ITEM.alt === true;
  const cut = STRUM_ITEM.cut || [];
  const group = strumGroupSize(STRUM_ITEM.beat, cells);
  const gClass = group ? ` strum-beat-grid--g${group}` : '';
  // 12칸 초과 → 2줄 분할
  const rows = cells > 12 ? 2 : 1;
  const rowSize = cells / rows;
  let gridsHtml = '';
  for (let r = 0; r < rows; r++) {
    let cellsHtml = '';
    for (let c = 0; c < rowSize; c++) {
      const pos = r * rowSize + c + 1;
      cellsHtml += strumCellHtml(strokes[pos - 1], pos, alt, cut.includes(pos));
    }
    gridsHtml += `<div class="strum-beat-grid${gClass}">${cellsHtml}</div>`;
  }
  wrap.innerHTML = gridsHtml;
  // 셀 DOM 캐시 (재생 시 비트 강조용) — DOM 순서 = 전역 셀 순서
  _strumCellEls = Array.from(wrap.querySelectorAll('.strum-beat-cell'));
  // 플레이헤드(이동 세로선) 생성
  const ph = document.createElement('div');
  ph.className = 'strum-playhead';
  wrap.appendChild(ph);
  _strumPlayhead = ph;
}

// 비트 강조: 세로선(플레이헤드)을 현재 셀 위치로 이동
let _strumCellEls = [];
let _strumPlayhead = null;
function strumHighlightCell(idx, cellDur) {
  const cur = _strumCellEls[idx];
  const ph  = _strumPlayhead;
  if (!cur || !ph) return;
  const cells = _strumCellEls.length;

  // 현재 셀 위치로 즉시 스냅 (행/마디 경계 점프는 transition 없이)
  ph.style.transition = 'none';
  ph.style.top    = cur.offsetTop + 'px';
  ph.style.height = cur.offsetHeight + 'px';
  ph.style.left   = cur.offsetLeft + 'px';
  ph.style.opacity = '1';
  void ph.offsetWidth; // 강제 reflow

  // 다음 셀까지 cellDur 동안 선형 glide (같은 행이면 다음 셀, 아니면 우측 끝까지 스윕)
  const nx = (idx + 1 < cells) ? _strumCellEls[idx + 1] : null;
  const target = (nx && nx.offsetTop === cur.offsetTop)
    ? nx.offsetLeft
    : cur.offsetLeft + cur.offsetWidth;
  ph.style.transition = `left ${cellDur}s linear`;
  ph.style.left = target + 'px';
}
function strumClearHighlight() {
  if (_strumPlayhead) _strumPlayhead.style.opacity = '0';
}

// ── BPM 휠피커 (progression-detail 패턴 재사용) ──────────────
let _strumBpm = 80;
const STRUM_BPM_MIN = 40;
const STRUM_BPM_MAX = 200;
const STRUM_BPM_ITEM_H = 30;

function strumInitBpmWheel() {
  const wheel = document.getElementById('strum-bpm-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = STRUM_BPM_MIN; b <= STRUM_BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => strumSetBpm(b));
    wheel.appendChild(item);
  }
  strumScrollBpmWheel(_strumBpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / STRUM_BPM_ITEM_H);
    const newBpm = STRUM_BPM_MIN + idx;
    // 목표 BPM 하한 = 시작 BPM
    const clamped = Math.max(_strumStartBpm, STRUM_BPM_MIN, Math.min(STRUM_BPM_MAX, newBpm));
    if (clamped !== _strumBpm) {
      _strumBpm = clamped;
      strumUpdateBpmActiveItem();
    }
    // 시작 밑으로 스크롤하면 시작값으로 스냅백
    if (newBpm < _strumStartBpm) strumScrollBpmWheel(_strumStartBpm, true);
  }, { passive: true });
}

function strumScrollBpmWheel(bpm, smooth) {
  const wheel = document.getElementById('strum-bpm-wheel');
  if (!wheel) return;
  const idx = bpm - STRUM_BPM_MIN;
  wheel.scrollTo({ top: idx * STRUM_BPM_ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
  strumUpdateBpmActiveItem();
}

function strumUpdateBpmActiveItem() {
  const wheel = document.getElementById('strum-bpm-wheel');
  if (!wheel) return;
  wheel.querySelectorAll('.progd-bpm-item').forEach((el) => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === _strumBpm);
  });
}

function strumSetBpm(bpm) {
  // 목표 BPM 하한 = 시작 BPM (시작보다 아래로 못 내려감)
  _strumBpm = Math.max(_strumStartBpm, STRUM_BPM_MIN, Math.min(STRUM_BPM_MAX, bpm));
  strumScrollBpmWheel(_strumBpm, true);
}

function strumChangeBpm(delta) {
  strumSetBpm(_strumBpm + delta);
}

// ── 점진 가속 (램프) ─────────────────────────────────────────
// 사이클(코드 4마디 진행 1회)마다 +2씩 시작→목표 BPM 도달.
const STRUM_RAMP_INC = 2;
let _strumRamp = false;
let _strumStartBpm = 60;

function strumToggleRamp(on) {
  _strumRamp = !!on;
  const box = document.getElementById('strum-ramp-start');
  if (box) box.classList.toggle('hidden', !_strumRamp);
  const arrow = document.getElementById('strum-bpm-prog-arrow');
  if (arrow) arrow.classList.toggle('hidden', !_strumRamp);
}

function strumInitStartWheel() {
  const wheel = document.getElementById('strum-start-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = STRUM_BPM_MIN; b <= STRUM_BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => strumSetStart(b));
    wheel.appendChild(item);
  }
  strumScrollStartWheel(_strumStartBpm, false);

  wheel.addEventListener('scroll', () => {
    if (_strumPlaying) return; // 재생 중 자동(램프) 스크롤은 설정 베이스값 변경 금지
    const idx = Math.round(wheel.scrollTop / STRUM_BPM_ITEM_H);
    const newBpm = STRUM_BPM_MIN + idx;
    if (newBpm !== _strumStartBpm) {
      _strumStartBpm = Math.max(STRUM_BPM_MIN, Math.min(STRUM_BPM_MAX, newBpm));
      strumUpdateStartActive();
    }
  }, { passive: true });
}

function strumScrollStartWheel(bpm, smooth) {
  const wheel = document.getElementById('strum-start-wheel');
  if (!wheel) return;
  const idx = bpm - STRUM_BPM_MIN;
  wheel.scrollTo({ top: idx * STRUM_BPM_ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
  strumUpdateStartActive();
}

function strumUpdateStartActive() {
  const wheel = document.getElementById('strum-start-wheel');
  if (!wheel) return;
  // 재생 중엔 현재(상승) BPM, 멈춤 땐 설정 베이스값 기준
  const target = (_strumPlaying && _strumDispBpm != null) ? _strumDispBpm : _strumStartBpm;
  wheel.querySelectorAll('.progd-bpm-item').forEach((el) => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === target);
  });
}

function strumSetStart(bpm) {
  // 시작 BPM 상한 = 목표 BPM
  _strumStartBpm = Math.max(STRUM_BPM_MIN, Math.min(_strumBpm, bpm));
  strumScrollStartWheel(_strumStartBpm, true);
}

function strumChangeStart(delta) {
  strumSetStart(_strumStartBpm + delta);
}

// ── 사운드 (스트로크) ────────────────────────────────────────
// 캔버스 인덱스 0=1번줄(e4=64) … 5=6번줄(E2=40)
const STRUM_OPEN_MIDI = [64, 59, 55, 50, 45, 40];
// 스트로크 속도 = 현 간 딜레이 (초). 5ms.
const STRUM_STROKE_SEC = 0.005;
// 노트 감쇄(release 엔벨로프) 길이(초) — 마디 끝에서 자연스럽게 컷
const STRUM_NOTE_RELEASE = 0.1;
// 컷팅: 울리던 음 차단 + 짧은 퍼커시브 스트로크
const STRUM_CUT_DUR     = 0.05;
const STRUM_CUT_RELEASE = 0.04;

// D/U 현 순서 (캔버스 인덱스: 0=1번줄 … 5=6번줄)
//   D(다운) = 전체 6현, 6번줄(5)→1번줄(0)
//   U(업)   = 1~3번줄만(인덱스 0~2), 1번줄(0)→3번줄(2)
const STRUM_DIR_STRINGS = {
  D: [5, 4, 3, 2, 1, 0],
  U: [0, 1, 2],
};

// 코드+방향 → 스트럼할 MIDI 배열
function strumChordMidis(chordName, dir) {
  const voicing = strumDefaultVoicing(chordName);
  if (!voicing || !voicing.frets) return [];
  const order = STRUM_DIR_STRINGS[dir] || STRUM_DIR_STRINGS.D;
  const midis = [];
  for (const s of order) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(STRUM_OPEN_MIDI[s] + f);
  }
  return midis;
}

// 단발 스트럼(테스트용)
function strumPlayVoicing(chordName, dir) {
  const midis = strumChordMidis(chordName, dir);
  if (midis.length) GuitarAudio.strumNotes(midis, STRUM_STROKE_SEC);
}

// ── 재생 루프 ────────────────────────────────────────────────
// 모델: 박자 그리드 전체가 하나의 연결된 타임라인(빠른 아르페지오).
//   - 1 마디(bar) = 그리드 1회. 마디마다 코드진행의 코드를 사용.
//   - 1 사이클 = 코드진행 길이(마디 수). 사이클 끝마다 램프 +2.
//   - 셀: D/U=스트럼, '-'(헛스트로크)=소리 없음(타이밍만 소비).
// 오디오 클럭 기준 lookahead 스케줄러 → setTimeout 드리프트 제거(박자 절대 안 밀림).
//   _strumNextTime: 다음 셀의 절대 오디오 시각(초). 정확한 cellDur만 누적.
//   _strumCellG: 전역 셀 인덱스(마디 넘어 누적).
const STRUM_LOOKAHEAD = 0.1;   // 미리 스케줄할 구간(초)
const STRUM_TICK_MS   = 25;    // 스케줄러 점검 주기

let _strumPlaying  = false;
let _strumTimer    = null;
let _strumNextTime = 0;
let _strumCellG    = 0;
let _strumDrumNextTime = 0; // 드럼 자체 타임라인 (strum과 동일 앵커, 독립 예약)
let _strumDrumStepG    = 0;
let _strumDispBpm  = null; // 재생 중 시작 휠에 표시할 현재(상승) BPM
let _strumSession  = 0;       // 재생 세션 토큰 (정지/재시작 시 예약된 애니 무효화)
let _strumDrumSet  = 1;       // 백킹 드럼 세트 (drum-sets.js)

function strumUpdatePlayBtn() {
  const btn = document.getElementById('strum-play-btn');
  if (!btn) return;
  btn.innerHTML = _strumPlaying
    ? '<i class="ph-fill ph-stop"></i>'
    : '<i class="ph-fill ph-play"></i>';
}

function strumTogglePlay() {
  if (_strumPlaying) strumPlayStop();
  else strumPlayStart();
}

let _strumStarting = false;
async function strumPlayStart() {
  if (_strumPlaying || _strumStarting) return; // 동기 재진입 가드 (await 중 중복 시작 방지)
  _strumStarting = true;
  // AudioContext는 user gesture 후 resume 필요 — 스케줄 전 반드시 await
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.resume) {
    try { await GuitarAudio.resume(); } catch (e) {}
  }
  if (typeof DrumAudio !== 'undefined' && DrumAudio.resume) {
    try { await DrumAudio.resume(); } catch (e) {}
  }
  if (typeof DrumAudio !== 'undefined' && DrumAudio.ready) {
    try { await DrumAudio.ready(); } catch (e) {}
  }
  // 샘플러 로드 완료까지 대기 (첫 로드 시 스케줄 유실 방지)
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.ready) {
    try { await GuitarAudio.ready(); } catch (e) {}
  }
  _strumStarting = false;
  if (typeof Tone !== 'undefined') { try { Tone.getDestination().mute = false; } catch (e) {} }
  _strumPlaying  = true;
  _strumCellG    = 0;
  _strumDispBpm  = _strumRamp ? _strumStartBpm : _strumBpm;
  _strumSession++;
  renderStrumProg(); // 코드 진행 휠 처음(bar0)으로 리셋
  strumUpdatePlayBtn();

  // 4비트 hat 카운트인 후 패턴 시작
  const anchor   = Tone.now() + 0.12;
  const countBpm = _strumRamp ? _strumStartBpm : _strumBpm;
  const beatDur  = 60 / countBpm;
  for (let i = 0; i < 4; i++) {
    if (typeof DrumAudio !== 'undefined') DrumAudio.hit('hat', anchor + i * beatDur);
  }
  _strumNextTime = anchor + 4 * beatDur; // 카운트인 4박 뒤 첫 박
  _strumDrumNextTime = _strumNextTime;   // 드럼도 같은 앵커에서 시작
  _strumDrumStepG = 0;

  _strumTimer = setInterval(strumSchedulerTick, STRUM_TICK_MS);
}

function strumPlayStop() {
  _strumPlaying = false;
  _strumStarting = false;
  if (_strumTimer) { clearInterval(_strumTimer); _strumTimer = null; }
  // 최종 출력 즉시 mute + 엔진 그래프 절단 → 잔향 없이 즉시 묵음
  if (typeof Tone !== 'undefined') { try { Tone.getDestination().mute = true; } catch (e) {} }
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop();
  // 시작 휠 → 원래 설정 베이스값으로 복귀
  _strumDispBpm = null;
  strumScrollStartWheel(_strumStartBpm, true);
  strumClearHighlight();
  strumUpdatePlayBtn();
}

function strumSchedulerTick() {
  if (!_strumPlaying || !STRUM_ITEM) return;
  const strokes = strumStrokeString(STRUM_ITEM);
  const cells = strokes.length;
  const [n, d] = String(STRUM_ITEM.beat).split('/').map(Number);
  const mainBeats = d === 8 ? n / 3 : n;
  const count = STRUM_PROG.length;
  const now = Tone.now();

  // lookahead 구간 안의 셀을 미리 스케줄 (절대시간 누적 → 무드리프트)
  while (_strumNextTime < now + STRUM_LOOKAHEAD) {
    const g         = _strumCellG;
    const bar       = Math.floor(g / cells);
    const cellInBar = g % cells;
    const cycle     = Math.floor(bar / count);
    const bpm = _strumRamp
      ? Math.min(_strumBpm, _strumStartBpm + STRUM_RAMP_INC * cycle)
      : _strumBpm;
    // 램프 중 BPM 상승 → 시작 휠 동기화 (재생 중 베이스값은 보존)
    if (_strumRamp && bpm !== _strumDispBpm) {
      _strumDispBpm = bpm;
      strumScrollStartWheel(bpm, true);
    }
    const barDur  = (60 / bpm) * mainBeats; // 전체 비트(1마디) 길이
    const cellDur = barDur / cells;
    const chord   = STRUM_PROG[bar % count];

    // 노트 길이 = 이 셀부터 마디 끝까지 → 마디 끝(코드 전환)에 스스로 종료, 다음 코드와 안 겹침
    const noteDur = (cells - cellInBar) * cellDur;

    const ch = strokes[cellInBar];
    const isCut = (STRUM_ITEM.cut || []).includes(cellInBar + 1);
    if (ch !== '-') { // 헛스트로크는 소리 없음(타이밍만 소비)
      const midis = strumChordMidis(chord, ch);
      if (midis.length) {
        if (isCut) {
          // 컷팅: 울리던 음 차단 + 6현 전부 짧게 긁기 (highpass 버스로 저역↓ 고역↑)
          GuitarAudio.cutAt(_strumNextTime, STRUM_CUT_RELEASE);
          GuitarAudio.strumAtCut(midis, STRUM_STROKE_SEC, _strumNextTime, STRUM_CUT_DUR, STRUM_CUT_RELEASE);
        } else {
          GuitarAudio.strumAt(midis, STRUM_STROKE_SEC, _strumNextTime, noteDur, STRUM_NOTE_RELEASE);
        }
      }
    }

    // 비트 셀 강조 (오디오 시각에 맞춰 — 헛스트로크 포함 모든 셀)
    {
      const hi   = cellInBar;
      const sess = _strumSession;
      const delayMs = Math.max(0, (_strumNextTime - now) * 1000);
      setTimeout(() => {
        if (_strumPlaying && sess === _strumSession) strumHighlightCell(hi, cellDur);
      }, delayMs);
    }

    // 7/8 지점에서 코드 진행 휠 미리 전환 (다음 마디 코드로 슬라이드)
    const triggerCell = Math.floor(cells * 7 / 8);
    if (cellInBar === triggerCell) {
      const target  = bar + 1;
      const sess    = _strumSession;
      const delayMs = Math.max(0, (_strumNextTime - now) * 1000);
      setTimeout(() => {
        if (_strumPlaying && sess === _strumSession) strumAdvanceProg(target);
      }, delayMs);
    }

    _strumNextTime += cellDur;
    _strumCellG++;
  }

  // 드럼: 자체 step 타임라인 lookahead 예약 (strum과 독립 → BPM 변경 즉시 동기)
  if (typeof DrumAudio !== 'undefined' && window.DRUM_SETS) {
    const set = window.DRUM_SETS[_strumDrumSet];
    if (set) {
      while (_strumDrumNextTime < now + STRUM_LOOKAHEAD) {
        const sg     = _strumDrumStepG;
        const sbar   = Math.floor(sg / set.steps);
        const sstep  = sg % set.steps;
        const scycle = Math.floor(sbar / count);
        const dbpm = _strumRamp
          ? Math.min(_strumBpm, _strumStartBpm + STRUM_RAMP_INC * scycle)
          : _strumBpm;
        const stepDur = (60 / dbpm) * mainBeats / set.steps;
        if ((set.kick  || []).includes(sstep)) DrumAudio.hit('kick',  _strumDrumNextTime);
        if ((set.snare || []).includes(sstep)) DrumAudio.hit('snare', _strumDrumNextTime);
        if ((set.hat   || []).includes(sstep)) DrumAudio.hit('hat',   _strumDrumNextTime);
        _strumDrumNextTime += stepDur;
        _strumDrumStepG++;
      }
    }
  }
}

// ── 페이지 닫기 (리스트로 복귀) ─────────────────────────────
function closeStrumPlay() {
  strumPlayStop();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'strumming.html'; }, 260);
  } else {
    location.href = 'strumming.html';
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // ?id= 로 카드 데이터 조회
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (window.STRUMMING_LIST) {
    STRUM_ITEM = window.STRUMMING_LIST.find((it) => it.id === id) || null;
  }

  const titleEl = document.getElementById('strum-play-title');
  if (titleEl && STRUM_ITEM) titleEl.textContent = STRUM_ITEM.title;

  renderStrumProg();
  renderStrumGrid();
  strumInitBpmWheel();
  strumInitStartWheel();

  lucide.createIcons();

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('strum_play_viewed', { id });
});
