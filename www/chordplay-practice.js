'use strict';

// 진행 데이터: progression-data.js + progression.js 에서 window.PROGRESSIONS 로 로드

const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_TO_SHARP   = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

function _getChordName(rootKey, semitones, quality, bass, tension) {
  const names   = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const noteIdx = (rootKey + semitones + 12) % 12;
  const note    = names[noteIdx];
  const sfx     = { M: '', m: 'm', '7': '7', M7: 'M7', m7: 'm7', dim: 'dim', dim7: 'dim7', aug: 'aug', sus4: 'sus4', sus2: 'sus2', '7sus4': '7sus4', m6: 'm6', '6': '6', 'm7(b5)': 'm7(b5)' };
  let result    = note + (sfx[quality] ?? '') + (tension || '');
  if (bass != null) {
    const bassIdx = (noteIdx + bass) % 12;
    result += '/' + names[bassIdx];
  }
  return result;
}

// ── 상태 ────────────────────────────────────────────────────
let _prog               = null;
let _key                = 0;
let _useFlat            = false;
let _showFingers        = false; // 운지 손가락 번호 표시 on/off
let _bpm                = 80;
let _playing            = false;
let _starting           = false; // 시작 비동기 구간 재진입 가드
let _playSession        = 0;     // 재생 세션 토큰 (정지/재시작 시 예약 콜백 무효화)
let _currentDisplayStep = 0;
let _masterBeat         = 0;     // 재생 시작 후 누적 비트 수
let _playStartMs        = 0;     // 재생 시작 시각 (훈련시간 측정)
let _attendanceCountedThisVisit = false; // 이번 방문 내 출석 카운트 1회 제한 (재생-정지 반복 방지)
let _schedTimer         = null;  // 오디오클럭 lookahead 스케줄러 (무드리프트)
let _beatNextTime       = 0;     // 다음 비트의 절대 오디오 시각(초)
const SCHED_LOOKAHEAD   = 0.1;
const SCHED_TICK_MS     = 25;
// _prevCenterFret 제거됨 — cyclic DP로 대체

// ── 캔버스 상수 (voicing-canvas.js 모듈 위임) ───────────────────────
const _BASE_W = VoicingCanvas.BASE_W;
const _BASE_H = VoicingCanvas.BASE_H;

// ── 보이싱 사운드 재생 ───────────────────────────────────────
// 캔버스 인덱스 순서: 0=1번줄(e4=64) … 5=6번줄(E2=40)
const _OPEN_MIDI = [64, 59, 55, 50, 45, 40];

function _voicingMidis(voicing) {
  if (!voicing) return [];
  // chordsLibrary frets는 절대 프렛 → MIDI = 개방현 + 절대프렛 (offset 불필요)
  const midis = [];
  // 6번줄(s=5) → 1번줄(s=0) 순서로 스트럼
  for (let s = 5; s >= 0; s--) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(_OPEN_MIDI[s] + f);
  }
  return midis;
}

// 다이어그램 탭 → 현재 표시 중인 코드 즉시 스트럼 (재생 중 스트럼과 동일한 간격)
async function _playCurrentChord() {
  if (typeof GuitarAudio === 'undefined') return;
  const cached = _stepCache && _stepCache[_dispFirst[_currentDisplayStep]];
  const midis  = _voicingMidis(cached && cached.voicing);
  if (!midis.length) return;
  if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
  GuitarAudio.strumNotes(midis, 0.008);
}

// 보이싱 후보 조회 (progression-voicings.js 기반)
function _getCandidates(rootSemitone, quality, bass, tension) {
  if (typeof ProgressionVoicings === 'undefined') return [];
  return ProgressionVoicings.getCandidates(rootSemitone, quality, _key, bass, tension);
}

// 캔버스 드로잉 → voicing-canvas.js 모듈(VoicingCanvas) 위임
function _drawVoicingCanvas(canvas, voicing, chordName, ratio) {
  VoicingCanvas.draw(canvas, voicing, { chordName, ratio, transparent: true, fingerNumMode: _showFingers });
}

// 현재 표시 중인 슬롯 4개를 재드로우 (재생 정지 없이 손가락번호 토글용)
function _redrawAllSlots() {
  if (!_slotDoms || !_slotData) return;
  _slotDoms.forEach((dom, i) => {
    const canvas = dom.querySelector('canvas');
    const d = _slotData[i];
    if (canvas && d) requestAnimationFrame(() => _redrawCanvas(canvas, dom, d.voicing, d.chordName));
  });
}

// ── 오디오 컨텍스트 (Tone 동기화용) ──────────────────────────
const _MetroCtx = window.AudioContext || window.webkitAudioContext;
let   _metroCtx = null;

// ── 재생 로직 ────────────────────────────────────────────────
async function _stopPlay(options = {}) {
  _playSession++;   // 예약된 setTimeout/countin 콜백 전부 무효화
  _starting = false;
  if (_schedTimer) { clearInterval(_schedTimer); _schedTimer = null; }
  // 훈련시간 적립 (재생한 만큼) + 10초 이상 재생 후 정지 시 출석 인정
  if (_playStartMs) {
    const _elapsedSec = (Date.now() - _playStartMs) / 1000;
    if (typeof recordTrainingTime === 'function') recordTrainingTime(_elapsedSec);
    if (_elapsedSec >= 10 && !_attendanceCountedThisVisit && typeof recordTrainingAttendance === 'function') {
      _attendanceCountedThisVisit = true;
      recordTrainingAttendance();
    }
  }
  _playStartMs = 0;
  _visualQueue = [];
  _stopClicks();
  _restoreBpmDisplay();   // 점진 가속 중 올라간 표시를 목표 BPM으로 되돌림
  _strumClearHighlight();
  if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop();
  // 이탈(options.hard)은 즉시 하드컷(panic), 일반 정지는 페이드 stop
  let stopPromise;
  if (options.hard && GuitarAudio.panic) { GuitarAudio.panic(); stopPromise = Promise.resolve(); }
  else stopPromise = GuitarAudio.stop({ wait: options.wait === true });
  _playing    = false;
  _syncBpmLock();
  window._chordSoundPlaying = false;
  _masterBeat = 0;
  _updateActiveCard(-1);
  _updatePlayBtn();
  if (options.wait) await stopPromise;
}

// ── 주법 재생 (strum-play.js의 셀 스케줄러 이식) ─────────────────────────
// 모델: 주법 그리드 1회 = 1마디. 4코드 진행은 마디당 코드 1개, 8코드 진행은 마디당 코드 2개(마디 절반씩). 1사이클 = 진행 전체 = 4마디.
// 셀: D/U=스트럼, '-'(헛스트로크)=소리 없음(타이밍만 소비), 컷팅 셀=울리던 음 차단 + 짧은 긁기.
// 오디오 클럭 lookahead 스케줄러 — 절대시각 누적이라 박자가 밀리지 않음. _masterBeat = 재생 시작 후 누적 박 수.
const STRUM_STROKE_SEC  = 0.005;  // 스트로크 속도 = 현 간 딜레이(초)
const STRUM_NOTE_RELEASE = 0.1;   // 마디(코드) 끝에서 자연스럽게 컷
const STRUM_CUT_DUR     = 0.05;
const STRUM_CUT_RELEASE = 0.04;
// D/U 현 순서 (캔버스 인덱스: 0=1번줄 … 5=6번줄)
//   orig: 악센트 미지정 카드 — D=전체6현 / U=1~3현 · acc: 악센트 셀 — U=1~4현 · weak: 악센트 있는 카드의 비악센트 셀 — D=4·5·6현 / U=1·2현
const STRUM_DIR_STRINGS = {
  orig: { D: [5, 4, 3, 2, 1, 0], U: [0, 1, 2] },
  acc:  { D: [5, 4, 3, 2, 1, 0], U: [0, 1, 2, 3] },
  weak: { D: [5, 4, 3],          U: [0, 1] },
};
// 점진 가속: 켜면 시작 BPM(_rampStart)에서 출발해 '사이클마다'(_rampCycles) '한 번에 BPM씩'(_rampStep) 올라 목표 BPM(_bpm)에서 멈춤.
// 1사이클 = 진행 전체(4코드=4마디, 8코드=8마디). 켜져 있으면 재생 BPM은 _liveBpm, 꺼져 있으면 항상 목표 BPM(슬라이더 즉시 반영).
let _rampOn        = false;
let _rampCanReach  = false;   // 이번 재생이 목표 BPM에 닿을 수 있는 구간인가(시작 BPM < 목표 BPM)
let _rampReached   = false;   // 이번 재생에서 이미 목표 도달을 셌는가(재생 한 번에 한 번)
let _liveBpm       = 80;    // 점진 가속 중 현재 BPM
let _liveShown     = null;  // 큰 BPM 숫자에 마지막으로 표시한 현재 BPM(변할 때만 갱신)
// 현재 BPM 숫자 — 오도미터(자리별 숫자 띠): 자리마다 0~9가 세로로 늘어선 띠가 있고, 목표 숫자 위치로 띠를 CSS transition으로 이동.
// 올라가면 띠가 위로, 내려가면 아래로 굴러가고(9→0처럼 넘어갈 땐 띠를 한 바퀴 더 이어붙여 같은 방향으로 계속 굴러감),
// 자리수가 바뀌면(99↔100) 맨 앞 칸이 빈 칸에서/빈 칸으로 굴러 나타나고 사라짐. 띠 항목: [빈칸, 0~9, 0~9] (띠 위치 = 1 + 숫자 + 10 × 바퀴)
const ODO_MS = 700;
const ODO_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';   // Material 표준 이징
function _odoPlace(col, pos) {
  const s = col._strip;
  s.style.transition = 'none';
  s.style.transform = `translateY(${-pos}em)`;
}
function _odoMake(d) {
  const col = document.createElement('span');
  col.className = 'odo-col';
  const strip = document.createElement('span');
  strip.className = 'odo-strip';
  let h = '<i></i>';
  for (let k = 0; k < 20; k++) h += `<i>${k % 10}</i>`;
  strip.innerHTML = h;
  col.appendChild(strip);
  col._strip = strip;
  col._d = d;   // 현재 숫자(-1 = 빈 칸)
  _odoPlace(col, d < 0 ? 0 : 1 + d);
  return col;
}
function _odoRoll(col, nd, dir) {
  const cur = col._d;
  if (cur === nd) return;
  let from, to;
  if (cur < 0) { from = 0; to = 1 + nd; }
  else if (nd < 0) { from = 1 + cur; to = 0; }
  else if (dir > 0) { from = 1 + cur; to = nd >= cur ? 1 + nd : 11 + nd; }
  else { from = nd <= cur ? 1 + cur : 11 + cur; to = 1 + nd; }
  col._d = nd;
  const s = col._strip;
  _odoPlace(col, from);
  void s.offsetHeight;   // 시작 위치 확정 후 이동
  s.style.transition = `transform ${ODO_MS}ms ${ODO_EASE}`;
  s.style.transform = `translateY(${-to}em)`;
  clearTimeout(col._t);
  col._t = setTimeout(() => {
    if (col._d !== nd) return;
    if (nd < 0) col.remove(); else { _odoPlace(col, 1 + nd); col.style.maxWidth = ''; }
  }, ODO_MS + 30);
}
function _setBpmText(el, to, animate) {
  const next = String(to);
  if (!animate) { el.textContent = next; el._cols = null; return; }
  // 띠 구조가 없거나(처음/슬라이더가 글자를 덮어씀) 깨졌으면 현재 글자로 새로 만듦
  if (!el._cols || (el._cols[0] && el._cols[0].parentNode !== el)) {
    const cur = el.textContent;
    el.textContent = '';
    el._cols = Array.from(cur).map(ch => { const c = _odoMake(Number(ch)); el.appendChild(c); return c; });
  }
  let cols = el._cols;
  const dir = Number(next) >= Number(cols.map(c => c._d).join('')) ? 1 : -1;
  while (cols.length < next.length) {   // 자리수 늘어남: 앞에 빈 칸을 만들어 폭이 0에서 자라며 숫자가 굴러 들어옴
    const c = _odoMake(-1);
    c.style.maxWidth = '0px';
    el.insertBefore(c, el.firstChild);
    cols.unshift(c);
    void c.offsetWidth;
    c.style.maxWidth = '1em';
  }
  while (cols.length > next.length) {   // 자리수 줄어듦: 맨 앞 칸이 빈 칸으로 굴러가며 폭이 줄어든 뒤 제거
    const c = cols.shift();
    c.style.maxWidth = c.offsetWidth + 'px';
    void c.offsetWidth;
    c.style.maxWidth = '0px';
    _odoRoll(c, -1, dir);
  }
  cols.forEach((c, i) => _odoRoll(c, Number(next[i]), dir));
}

// 목표 BPM 슬라이더(인라인) 손잡이를 부드럽게 이동. 소수 값을 쓰려면 step이 any여야 해서 끝나면 1로 되돌림
let _sliderRaf = 0;
function _animateSlider(to, onDone) {
  const s = document.getElementById('bpm-inline-slider');
  if (!s) return;
  cancelAnimationFrame(_sliderRaf);
  const from = Number(s.value), min = Number(s.min), max = Number(s.max), t0 = performance.now(), D = 600;
  s.step = 'any';
  const frame = now => {
    const k = Math.min(1, (now - t0) / D);
    const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
    s.value = v;
    s.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%');
    if (k < 1) _sliderRaf = requestAnimationFrame(frame);
    else if (onDone) onDone();
  };
  _sliderRaf = requestAnimationFrame(frame);
}

// 점진 가속 재생 중에는 BPM 조작 잠금(슬라이더·+/−·BPM 카드 팝업) — 값은 스스로 올라감
function _syncBpmLock() {
  const on = _rampOn && (_playing || _starting);
  const box = document.querySelector('.play-bpm-box');
  if (box) box.classList.toggle('bpm-locked', on);
  if (on) _popups.forEach(p => p.close());
}

// 정지: 큰 숫자와 슬라이더를 목표 BPM으로 되돌림
function _restoreBpmDisplay() {
  const el = document.getElementById('play-bpm-val');
  if (el) _setBpmText(el, _bpm, false);
  const s = document.getElementById('bpm-inline-slider');
  if (s && s.step === 'any') _animateSlider(_bpm, () => { s.step = '1'; s.value = _bpm; });
}

let _playStrum     = null;  // 재생 시작 시점에 고정한 주법(재생 중 선택이 바뀌면 정지하므로 항상 화면의 주법과 같음)

function _strumMidis(voicing, dir, mode) {
  if (!voicing || !voicing.frets) return [];
  const set = STRUM_DIR_STRINGS[mode] || STRUM_DIR_STRINGS.orig;
  const midis = [];
  for (const s of (set[dir] || set.D)) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(_OPEN_MIDI[s] + f);
  }
  return midis;
}

// 박자 → 백킹 드럼 세트 (drum-sets.js)
function _strumDrumSetId(beat) {
  return beat === '3/4' ? 2 : beat === '12/8' ? 3 : beat === '6/8' ? 4 : 1;
}

function _strumMainBeats(item) {
  const [n, d] = String(item.beat || '4/4').split('/').map(Number);
  return d === 8 ? n / 3 : n;
}

// 재생 위치 세로선: 주법 디스플레이 위를 한 마디에 한 번 왼쪽→오른쪽으로 지나감(칸이 2줄이면 줄마다 한 번씩).
// 박마다 { 마디 안 박 위치, 박 시작 시각, 박 길이 }만 받아 두고, 매 프레임 오디오 시계로 위치 = 마디 진행률로 계산
let _strumCellEls = [];
let _strumPlayhead = null;
let _phBeat = null;
function _strumTickPlayhead(now) {
  const ph = _strumPlayhead, b = _phBeat;
  if (!ph || !b) return;
  const rows = ph.parentNode.querySelectorAll('.strum-beat-grid');
  if (!rows.length) return;
  const p = Math.min(1, (b.beat + Math.max(0, (now - b.time) / b.beatDur)) / b.mainBeats);   // 마디 진행률 0~1
  const r = Math.min(rows.length - 1, Math.floor(p * rows.length));
  const first = rows[r].firstElementChild, last = rows[r].lastElementChild;
  const x0 = first.offsetLeft, x1 = last.offsetLeft + last.offsetWidth;
  ph.style.transition = 'none';
  ph.style.top = first.offsetTop + 'px';
  ph.style.height = first.offsetHeight + 'px';
  // 화면 기준(부모 위치 포함)으로 기기 픽셀에 맞춰 반올림 — 부모가 소수 위치에 있으면 부모 기준으로만 반올림해선 2px 선이 번져 가늘어 보임
  const dpr = window.devicePixelRatio || 1;
  const pl = ph.parentNode.getBoundingClientRect().left;
  ph.style.left = (Math.round((pl + x0 + (p * rows.length - r) * (x1 - x0)) * dpr) / dpr - pl) + 'px';
  ph.style.opacity = '1';
}
function _strumClearHighlight() {
  _phBeat = null;
  if (_strumPlayhead) _strumPlayhead.style.opacity = '0';
}

// 코드반주 훈련 퀘스트 카운터: 정지 없이 4사이클을 연속으로 연주할 때마다 1회(4·8·12… 사이클째). 정지·주법/키 변경 등으로 멈추면 누적 사이클은 0부터 다시 시작.
// 카운터는 progression_completed 하나(퀘스트 '코드반주 훈련')
const CYCLES_PER_COUNT = 4;
function _countAccompaniment() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.progression_completed = (s.progression_completed || 0) + 1;
  localStorage.setItem('training_stats', JSON.stringify(s));
  if (typeof syncTrainingStatsToDB === 'function') syncTrainingStatsToDB();
  if (typeof addXp === 'function') addXp(BEHAVE_XP.progression);   // 행동형 XP: 카운트마다 (사일런트)
}

// 점진 가속 퀘스트 카운터: 점진 가속이 시작 BPM에서 올라가 목표 BPM에 닿을 때 1회(재생 한 번에 한 번, 시작 BPM = 목표 BPM이면 세지 않음)
function _countRampReached() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.ramp_completed = (s.ramp_completed || 0) + 1;
  localStorage.setItem('training_stats', JSON.stringify(s));
  if (typeof syncTrainingStatsToDB === 'function') syncTrainingStatsToDB();
}

// 박 단위 단일 시계 (메트로놈과 같은 구조): 박 하나를 스케줄할 때 BPM을 한 번만 읽고, 그 박 안의 스트럼 셀·드럼 step 시각을
// 전부 같은 박 시작 시각 + 박 안 비율 × 박 길이로 계산한다. 스트럼과 드럼이 시계를 따로 쌓지 않으므로 슬라이더로 BPM을 바꿔도 어긋나지 않음.
function _masterTick() {
  const item = _playStrum;
  if (!_playing || !_prog || !_stepCache || !item) return;
  const strokes = strumStrokeString(item);
  const cells = strokes.length;
  const mainBeats = _strumMainBeats(item);   // 1마디 = mainBeats박
  const count = _prog.steps.length;
  // 한 마디에 코드 1개(박자·코드 수 무관). 1사이클 = 진행 전체 = 코드 수만큼의 마디(4코드=4마디, 8코드=8마디)
  const perBar = 1;
  const barsPerCycle = count;
  const cut = item.cut || [];
  const hasAccent = Array.isArray(item.accent) && item.accent.length > 0;
  const drumSet = window.DRUM_SETS && window.DRUM_SETS[_strumDrumSetId(String(item.beat || '4/4'))];
  const now = Tone.now();

  while (_beatNextTime < now + SCHED_LOOKAHEAD) {
    const bar = Math.floor(_masterBeat / mainBeats);
    const beatInBar = _masterBeat % mainBeats;
    const sess = _playSession;
    // 사이클 경계(4마디마다)에서 점진 가속 한 단계 상승
    if (_rampOn && beatInBar === 0 && bar > 0 && bar % barsPerCycle === 0 && (bar / barsPerCycle) % _rampCycles === 0) {
      _liveBpm = Math.min(_liveBpm + _rampStep, _bpm);
    }
    const bpmNow = _rampOn ? Math.min(_liveBpm, _bpm) : _bpm;
    const beatDur = 60 / bpmNow;   // 이 박의 길이 — BPM을 박마다 한 번만 읽음
    const bt = _beatNextTime;
    if (_rampCanReach && !_rampReached && bpmNow >= _bpm) { _rampReached = true; _visualQueue.push({ time: bt, rampReached: true, sess }); }   // 점진 가속이 목표 BPM에 도달
    _visualQueue.push({ time: bt, beat: beatInBar, beatDur, mainBeats, sess });   // 세로선용: 이 박의 위치
    // 사이클이 끝나는 순간(진행 전체를 1회 연주 완료) — 재생 시작부터 센 완료 사이클 수. 정지하면 다음 재생은 0부터라 누적이 자동 초기화됨
    if (beatInBar === 0 && bar > 0 && bar % barsPerCycle === 0) _visualQueue.push({ time: bt, cycles: bar / barsPerCycle, sess });
    if (_rampOn && bpmNow !== _liveShown) { _liveShown = bpmNow; _visualQueue.push({ time: bt, bpm: bpmNow, sess }); }

    // 이 박에서 시작하는 스트럼 셀 (셀 i의 시작 = i × mainBeats / cells 박)
    for (let i = Math.ceil(beatInBar * cells / mainBeats); i < Math.ceil((beatInBar + 1) * cells / mainBeats); i++) {
      const t = bt + (i * mainBeats / cells - beatInBar) * beatDur;
      const cellDur = (mainBeats / cells) * beatDur;
      // 이 셀이 속한 코드 구간(마디를 perBar등분)
      const seg = Math.floor(i * perBar / cells);
      const segStart = Math.ceil(seg * cells / perBar);
      const segEnd = Math.ceil((seg + 1) * cells / perBar);
      const chordIdx = (bar * perBar + seg) % count;
      const voicing = _stepCache[chordIdx] && _stepCache[chordIdx].voicing;
      const noteDur = (segEnd - i) * cellDur;   // 코드 구간 끝까지 → 코드 전환 시점에 스스로 종료
      const ch = strokes[i];
      if (ch !== '-') {   // 헛스트로크는 소리 없음
        const mode = !hasAccent ? 'orig' : (item.accent.includes(i + 1) ? 'acc' : 'weak');
        const midis = _strumMidis(voicing, ch, mode);
        if (midis.length) {
          if (cut.includes(i + 1)) {
            GuitarAudio.cutAt(t, STRUM_CUT_RELEASE);
            GuitarAudio.strumAtCut(midis, STRUM_STROKE_SEC, t, STRUM_CUT_DUR, STRUM_CUT_RELEASE);
          } else {
            GuitarAudio.strumAt(midis, STRUM_STROKE_SEC, t, noteDur, STRUM_NOTE_RELEASE, mode);
          }
        }
      }
      // 시각: 비트 셀 강조(헛스트로크 포함) + 코드 구간 7/8 지점에서 캐러셀 슬라이드 — rAF 큐가 오디오 시계로 발화
      if (i === segStart + Math.floor((segEnd - segStart) * 7 / 8)) _visualQueue.push({ time: t, chord: (chordIdx + 1) % count, sess });
    }

    // 메트로놈 백킹: 박마다 클릭(마디 첫 박 강세)
    if (_backing === 'click') _clickAt(bt, beatInBar === 0);
    // 이 박에서 시작하는 드럼 step (set.steps = 1마디 분할 수)
    if (_backing === 'drum' && drumSet && typeof DrumAudio !== 'undefined') {
      for (let s = Math.ceil(beatInBar * drumSet.steps / mainBeats); s < Math.ceil((beatInBar + 1) * drumSet.steps / mainBeats); s++) {
        const t = bt + (s * mainBeats / drumSet.steps - beatInBar) * beatDur;
        if ((drumSet.kick  || []).includes(s)) DrumAudio.hit('kick',  t);
        if ((drumSet.snare || []).includes(s)) DrumAudio.hit('snare', t);
        if ((drumSet.hat   || []).includes(s)) {
          // hatStrong 지정 세트는 강박만 살리고 나머지는 hatSoftVel로 약하게
          const hv = drumSet.hatStrong ? (drumSet.hatStrong.includes(s) ? 1 : (drumSet.hatSoftVel != null ? drumSet.hatSoftVel : 0.15)) : 1;
          DrumAudio.hit('hat', t, hv);
        }
      }
    }

    _beatNextTime += beatDur;
    _masterBeat++;
  }
}

// 시각 큐 — setTimeout은 누적 오차가 생기므로 쓰지 않고, rAF가 매 프레임 오디오 시계와 비교해 발화
let _visualQueue = [];
function _visualLoop() {
  if (!_playing) { _visualQueue = []; return; }
  const now = Tone.now();
  while (_visualQueue.length && _visualQueue[0].time <= now) {
    const ev = _visualQueue.shift();
    if (ev.sess !== _playSession) continue;
    if (ev.bpm != null) { const el = document.getElementById('play-bpm-val'); if (el) _setBpmText(el, ev.bpm, true); _animateSlider(ev.bpm); }
    else if (ev.chord != null) { const d = _dispIdx[ev.chord]; if (d !== _currentDisplayStep) _updateActiveCard(d); }
    else if (ev.rampReached) _countRampReached();
    else if (ev.cycles != null) { if (ev.cycles % CYCLES_PER_COUNT === 0) _countAccompaniment(); }
    else if (ev.beat != null) _phBeat = ev;
  }
  _strumTickPlayhead(now);   // 이벤트가 없는 프레임에도 세로선을 오디오 시계에 맞춰 전진
  requestAnimationFrame(_visualLoop);
}

// hat 카운트인 1마디(박자별 박 수: 4/4=4, 3/4=3, 12/8=4, 6/8=6) 후 onComplete(startTime) 호출
function _runCountIn(onComplete) {
  // 점진 가속이면 카운트인 시작과 함께 큰 숫자·슬라이더가 시작 BPM으로 이동
  if (_rampOn) {
    _liveShown = _liveBpm;
    const el = document.getElementById('play-bpm-val');
    if (el) _setBpmText(el, _liveBpm, true);
    _animateSlider(_liveBpm);
  }
  const item = _playStrum;
  const beatStr = String(item && item.beat || '4/4');
  const [cn, cd] = beatStr.split('/').map(Number);
  const mainBeats = cd === 8 ? cn / 3 : cn;
  const barDur = (60 / _liveBpm) * mainBeats;
  const click = _backing === 'click';   // 메트로놈이면 카운트도 클릭(본 연주와 같은 박 단위, 첫 박 강세)
  const countBeats = (beatStr === '6/8' && !click) ? 6 : mainBeats;
  const hatDur = barDur / countBeats;
  const anchor = Tone.now() + 0.12;
  const countSet = window.DRUM_SETS && window.DRUM_SETS[_strumDrumSetId(beatStr)];
  for (let i = 0; i < countBeats; i++) {
    if (click) { _clickAt(anchor + i * hatDur, i === 0); continue; }
    // 강박/약박 세트(hatStrong)면 카운트도 강박만 살림
    const hv = (countSet && countSet.hatStrong)
      ? (countSet.hatStrong.includes(i) ? 1 : (countSet.hatSoftVel != null ? countSet.hatSoftVel : 0.15))
      : 1;
    if (typeof DrumAudio !== 'undefined') DrumAudio.hit('hat', anchor + i * hatDur, hv);
  }
  const startTime = anchor + barDur;
  const startDelay = Math.max(0, (startTime - Tone.now()) * 1000);
  setTimeout(() => {
    if (!_playing) return;
    onComplete(startTime);
  }, startDelay);
}

// 연습 화면은 처음부터 열려 있음 — 피크(5)는 코드반주 훈련 목록(chordplay.js)에서 진입할 때 소모. 이후 재생은 무한.
let _practiceUnlocked = true;
window._leaveGuardActive = () => _practiceUnlocked; // shared.js 사이드바 네비 이탈 확인용
window._clearLeaveGuard = () => {}; // shared.js 사이드바 네비로 이탈 확정 시 호출(언락 상태를 따로 저장하지 않으므로 할 일 없음)

async function togglePlay() {
  if (!_practiceUnlocked) return;
  if (_playing || _starting) {
    await _stopPlay();
    return;
  }
  _playStrum = _spItems[_spIdx] || null;   // 화면에서 고른 주법으로 재생
  if (!_playStrum) return;
  _liveBpm = _rampOn ? Math.min(_rampStart, _bpm) : _bpm;   // 점진 가속이면 시작 BPM에서 출발
  _rampCanReach = _rampOn && _liveBpm < _bpm;
  _rampReached = false;
  _liveShown = null;
  _starting = true;
  _syncBpmLock();
  const sess = _playSession; // 이 시작 시도의 세션. 중간에 정지/키변경되면 폐기
  // _metroCtx와 Tone.js 동기화 (첫 재생 시)
  if (!_metroCtx) _metroCtx = new _MetroCtx();
  if (_metroCtx.state === 'suspended') await _metroCtx.resume();
  await GuitarAudio.syncContext(_metroCtx);
  // 드럼도 동일 컨텍스트로 재생성 후 샘플 로드 대기
  if (typeof DrumAudio !== 'undefined') {
    DrumAudio.rebuild();
    try { await DrumAudio.ready(); } catch (e) {}
  }
  // await 동안 정지/재시작/키변경됐으면 이 시도 폐기
  if (sess !== _playSession || !_starting) { _starting = false; return; }

  _starting   = false;
  _playing    = true;
  window._chordSoundPlaying = true; // 음량조절 A코드 프리뷰 중복재생 방지용 전역 플래그
  _masterBeat = 0;
  // 재생 시작 = 첫 코드로 복귀. 멀티스텝 슬라이드는 슬롯 스택 정합성이 깨져
  // (연속 동일코드 시 2번째를 첫 코드로 오인) → 클린 리빌드로 정확히 step0 리셋.
  if (_currentDisplayStep !== 0) {
    _currentDisplayStep = 0;
    _renderStage();
  }
  _playStartMs = Date.now(); // 훈련시간 측정 시작
  analytics.track('progression_detail_played', { prog_id: _prog?.id, key: _getKeyDisplayName(_key), bpm: _bpm, strum: _playStrum.title });
  _updatePlayBtn();
  const playSess = _playSession;
  _runCountIn((startTime) => {
    if (!_playing || playSess !== _playSession) return;
    _masterBeat   = 0;
    _beatNextTime = startTime;
    _visualQueue  = [];
    requestAnimationFrame(_visualLoop);
    _schedTimer   = setInterval(_masterTick, SCHED_TICK_MS);
  });
}

const BPM_MIN = 10;   // 앱 중심 규칙: 통합 10~300 BPM
const BPM_MAX = 300;
let _bpmItemH = 30; // 실제 렌더 높이로 아래서 갱신됨 (뷰포트별 CSS 크기 변화 대응)

function _initBpmWheel() {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = BPM_MIN; b <= BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => _setBpm(b));
    wheel.appendChild(item);
  }
  if (wheel.firstElementChild) _bpmItemH = wheel.firstElementChild.getBoundingClientRect().height; // offsetHeight는 정수 반올림 → idx 큰 값에서 오차 누적
  _scrollBpmWheel(_bpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / _bpmItemH);
    const newBpm = BPM_MIN + idx;
    if (newBpm !== _bpm) {
      _bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, newBpm));
      _updateBpmActiveItem();
    }
  }, { passive: true });

  enableMouseDragScroll(wheel); // 웹 브라우저 마우스 드래그 지원
}

function _scrollBpmWheel(bpm, smooth) {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  const idx = bpm - BPM_MIN;
  wheel.scrollTo({ top: idx * _bpmItemH, behavior: smooth ? 'smooth' : 'instant' });
  _updateBpmActiveItem();
}

function _updateBpmActiveItem() {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  wheel.querySelectorAll('.progd-bpm-item').forEach(el => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === _bpm);
  });
}

function _setBpm(bpm) {
  _bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
  _scrollBpmWheel(_bpm, true);
}

function changeBpm(delta) {
  _playTap();
  _setBpm(_bpm + delta);
}

function _updatePlayBtn() {
  const btn = document.getElementById('detail-play-btn');
  if (!btn) return;
  btn.innerHTML = _playing
    ? '<i class="ph-fill ph-stop"></i>'
    : '<i class="ph-fill ph-play"></i>';
}

function _updateActiveCard(idx) {
  if (idx < 0) {
    // 정지: 스텝 0으로 전체 리셋
    _currentDisplayStep = 0;
    _renderStage();
  } else {
    // 재생 중 스텝 진행: 애니메이션
    _currentDisplayStep = idx;
    _advanceStage(idx);
  }
}

// ── 뒤로가기 ────────────────────────────────────────────────
// 뒤로가기 요청: 연습 잠금해제 상태면 경고 모달, 아니면 바로 나감.
function requestBack() {
  _playTap();
  if (isLeavePracticeOpen()) return;
  if (_practiceUnlocked) { showLeavePracticeModal(goBack); return; }
  goBack();
}

async function goBack() {
  await _stopPlay({ hard: true });   // 이탈 — 소리 즉시 중단
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'chordplay.html'; }, 260);
  } else {
    location.href = 'chordplay.html';
  }
}

// ── UI 렌더 ──────────────────────────────────────────────────
// 키 셀렉터 라벨 — scale-level과 동일: #/b 토글과 무관하게 항상 같은 모양.
// 반음 키는 C#/Db 두 이름을 슬래시 기준 대각선(왼쪽 위 # · 오른쪽 아래 b)으로 함께 표기, 자연음 키는 한 줄.
function _keyBtnHtml(k) {
  const a = KEY_NAMES_SHARP[k], b = KEY_NAMES_FLAT[k];
  if (a === b) return a;
  return `<span class="key-acc key-acc--a">${a}</span><span class="key-acc key-acc--b">${b}</span>`;
}
// 키를 고르면 그 키의 기본 #/b로 토글 자동 전환: 자연음 키는 #, 반음 키는 b. 예외: F는 b(B♭이 있어서)
function _defaultFlatForKey(k) {
  return k === 5 || KEY_NAMES_SHARP[k] !== KEY_NAMES_FLAT[k];
}
function _syncAccidentalToKey(k) {
  _useFlat = _defaultFlatForKey(k);
  document.getElementById('detail-acc-sharp')?.classList.toggle('active', !_useFlat);
  document.getElementById('detail-acc-flat')?.classList.toggle('active',  _useFlat);
}

function _renderKeyStrip() {
  const strip = document.getElementById('detail-key-strip');
  if (!strip) return;
  if (!strip.querySelector('.key-btn')) {
    for (let k = 0; k < 12; k++) {
      const btn = document.createElement('button');
      btn.className = 'key-btn';
      btn.dataset.key = k;
      btn.innerHTML = _keyBtnHtml(k);
      btn.classList.toggle('key-btn--split', KEY_NAMES_SHARP[k] !== KEY_NAMES_FLAT[k]);
      btn.addEventListener('pointerup', async () => {
        _playTap();
        if (k === _key) return;
        await _stopPlay({ wait: true }); // 재생/예약 완전 정지 후 키 적용 (레이스 방지)
        _key = k;
        _syncAccidentalToKey(k); // 이 키의 기본 #/b로 토글 맞춤
        _renderKeyStrip();
        _renderStage();
      });
      strip.appendChild(btn);
    }
  }
  // 라벨은 #/b와 무관(항상 같은 모양)이라 다시 그리지 않음 — 선택 표시만 갱신
  strip.querySelectorAll('.key-btn').forEach(b => b.classList.toggle('key-btn--active', Number(b.dataset.key) === _key));
}

let _stageRO    = null; // ResizeObserver 인스턴스
let _slotDoms   = null; // [dom0, dom1, dom2] — 고정 슬롯 DOM 요소
let _slotRoles  = null; // _slotRoles[domIdx] = 0(prev)|1(current)|2(next)
let _slotData   = null; // _slotData[domIdx] = { voicing, chordName }
let _stepCache  = null; // _stepCache[stepIdx] = { voicing, chordName } — 스텝별 보이싱 캐시

// 캔버스 픽셀 크기 계산 + 드로잉 — 폭 기준 크기가 wrap(슬롯) 높이를 넘으면 비율 유지한 채 축소
// (wrap은 top:0/bottom:0으로 .progd-chord-view-inner 전체 높이를 그대로 물려받음)
function _redrawCanvas(canvas, wrap, voicing, chordName) {
  const dpr  = window.devicePixelRatio || 1;
  let cssW = wrap.offsetWidth;
  if (!cssW) return;
  let cssH = cssW * _BASE_H / _BASE_W;
  const availH = wrap.offsetHeight;
  if (availH && cssH > availH) {
    cssW = cssW * (availH / cssH);
    cssH = availH;
  }
  const ratio = (cssW * dpr) / _BASE_W;
  _drawVoicingCanvas(canvas, voicing, chordName, ratio);
  canvas.style.width  = Math.round(cssW) + 'px';
  canvas.style.height = Math.round(cssH) + 'px';
}

// 특정 슬롯 캔버스 업데이트 (캐시 우선 사용)
function _drawSlot(domIdx, stepIdx) {
  const count   = _dispCount;
  const safeIdx = ((stepIdx % count) + count) % count;
  const cached  = _stepCache && _stepCache[_dispFirst[safeIdx]];
  const voicing   = cached ? cached.voicing   : null;
  const chordName = cached ? cached.chordName : '';
  _slotData[domIdx] = { voicing, chordName };
  const canvas = _slotDoms[domIdx].querySelector('canvas');
  requestAnimationFrame(() => _redrawCanvas(canvas, _slotDoms[domIdx], voicing, chordName));
}

// domIdx 슬롯의 역할(role) 반환
function _getSlotByRole(role) {
  return _slotRoles.indexOf(role);
}

// 슬롯 역할명 (인덱스 0~3)
const _ROLE_NAMES = ['far-left', 'prev', 'current', 'next'];

// 스텝별 보이싱 캐시 빌드 — Cyclic DP
//
// 규칙:
//   1. 순환 경로(마지막→첫 wrap-around 포함) 전체 이동 비용 최소화
//   2. 같은 줄 이동 우선 — 줄 변경 시 CROSS_PENALTY 가산
//   3. 동률이면 더 낮은 프렛 보이싱 우선
//   4. 결과를 _stepCache에 고정 → 재생 반복 중 변경 없음
// 캐러셀 표시용 묶음: 같은 코드가 연속이면 카드 1장으로 렌더링(재생은 원래 스텝 단위로 계속 진행 — 카드는 코드가 실제로 바뀔 때만 넘어감)
//   _dispFirst[d] = d번째 카드의 첫 스텝 / _dispIdx[스텝] = 그 스텝이 속한 카드 / _dispCount = 카드 수
let _dispFirst = [0], _dispIdx = [0], _dispCount = 1;
function _buildStepCache() {
  _buildVoicingCache();
  const n = _stepCache ? _stepCache.length : 0;
  _dispFirst = []; _dispIdx = [];
  for (let i = 0; i < n; i++) {
    if (i > 0 && _stepCache[i].chordName === _stepCache[i - 1].chordName) {
      _stepCache[i] = { voicing: _stepCache[i - 1].voicing, chordName: _stepCache[i].chordName };   // 같은 코드는 같은 보이싱
      _dispIdx[i] = _dispFirst.length - 1;
    } else {
      _dispIdx[i] = _dispFirst.length;
      _dispFirst.push(i);
    }
  }
  _dispCount = Math.max(1, _dispFirst.length);
}

function _buildVoicingCache() {
  if (!_prog) return;
  const count = _prog.steps.length;
  if (count === 0) { _stepCache = []; return; }

  const CROSS_PENALTY       = 2;
  const HIGH_FRET_THRESH    = 5;   // 이 프렛 초과부터 페널티 시작
  const HIGH_FRET_FACTOR    = 0.8; // 초과 프렛당 페널티 (튜닝용)
  const THIN_ROOT_PENALTY   = 2.5; // 3번줄 이상 근음 페널티 (튜닝용)
  const FOUR_STR_PENALTY    = 2.5; // 4번줄 근음 페널티
  const LOW_FRET_BONUS      = 1.5; // fret 0~1 오픈 포지션 보너스 (튜닝용)
  const fret = v => (v && v.fretNumber) || 0;

  // 보이싱의 근음 줄 인덱스 (6번줄=5, 5번줄=4, 4번줄=3, …)
  function rootStr(v) {
    if (!v || !v.frets) return -1;
    for (let s = 5; s >= 0; s--) {
      if (v.frets[s] !== null) return s;
    }
    return -1;
  }

  // ii→V 쉘 보이싱 연결 보너스: m7(b5) 쉘(6번줄) 다음 V7가 같은 자리(5번줄 alt shape)로 이어지면 가산점
  const IIV_SHELL_BONUS   = 3;
  const NOTE_SEMI = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
  const M7B5_SHELL_SHAPE  = [null, 0, 1, 1, null, 1];  // r+1 x r+1 r+1 r x (rootStr:6)
  const DOM7_PLAIN_SHAPE  = [0, 2, 0, 2, 0, null];      // x r r+2 r r+2 r   (rootStr:5)
  const DOM7_ALT_SHAPE    = [null, 0, 2, 1, 2, null];   // x r+2 r+1 r+2 r x (rootStr:5)
  function _relShape(frets) {
    if (!frets) return null;
    const vals = frets.filter(f => f !== null);
    if (!vals.length) return frets;
    const min = Math.min(...vals);
    return frets.map(f => f === null ? null : f - min);
  }
  function _shapeEq(a, b) {
    return !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
  }
  function _rootSemi(v) {
    const m = v && v.name && v.name.match(/^([A-G][#b]?)/);
    return m ? NOTE_SEMI[m[1]] : null;
  }

  // 이동 비용: 프렛 차 + 줄 변경 페널티 + 고프렛 페널티 + 3번줄↑ 근음 페널티 + 4번줄 페널티 - 오픈 포지션 보너스
  function dist(a, b) {
    const hfp  = Math.max(0, fret(b) - HIGH_FRET_THRESH) * HIGH_FRET_FACTOR;
    const trp  = rootStr(b) < 3 ? THIN_ROOT_PENALTY : 0;
    const fsp  = rootStr(b) === 3 ? FOUR_STR_PENALTY : 0;
    const lfb  = fret(b) <= 1 ? LOW_FRET_BONUS : 0;

    // ii→V 쉘 연결: a가 m7(b5) 6번줄 쉘 + b가 완전4도 위(V7) + rootStr5 7 보이싱이면
    // alt shape(같은 자리 연결)는 가산점, plain shape는 감점 — alt가 우선 선택되도록.
    let iiVBias = 0;
    if (a && b && a.quality === 'm7(b5)' && b.quality === '7' &&
        rootStr(b) === 4 && _shapeEq(_relShape(a.frets), M7B5_SHELL_SHAPE) &&
        ((_rootSemi(b) - _rootSemi(a) + 12) % 12) === 5) {
      const bShape = _relShape(b.frets);
      if (_shapeEq(bShape, DOM7_ALT_SHAPE))        iiVBias = -IIV_SHELL_BONUS;
      else if (_shapeEq(bShape, DOM7_PLAIN_SHAPE))  iiVBias =  IIV_SHELL_BONUS;
    }

    return Math.abs(fret(a) - fret(b)) + (rootStr(a) !== rootStr(b) ? CROSS_PENALTY : 0) + hfp + trp + fsp - lfb + iiVBias;
  }

  // 각 스텝의 후보 목록 수집
  const stepData = _prog.steps.map(step => {
    const chordName    = _getChordName(_key, step.semitones, step.quality, step.bass, step.tension);
    const rootSemitone = (_key + step.semitones + 120) % 12;
    const candidates   = _getCandidates(rootSemitone, step.quality, step.bass, step.tension);
    return { chordName, candidates };
  });

  // 후보 없는 스텝 있으면 fallback (null voicing)
  if (stepData.some(s => !s.candidates.length)) {
    _stepCache = stepData.map(s => ({ voicing: s.candidates[0] || null, chordName: s.chordName }));
    return;
  }

  const cands = stepData.map(s => s.candidates);

  // ① 첫 코드: 최저 fretNumber 후보 고정
  const firstVoicing = cands[0].reduce((a, b) => fret(a) <= fret(b) ? a : b);

  if (count === 1) {
    _stepCache = [{ voicing: firstVoicing, chordName: stepData[0].chordName }];
    return;
  }

  // ② Cyclic DP (chord 0 고정, chord 1..n-1 최적화)
  // dp[j]      = chord i를 후보 j로 선택했을 때 chord 0→i까지 누적 최소 비용
  // track[i][j] = chord i가 j일 때 chord i-1의 최적 후보 인덱스

  let dp = cands[1].map(c => dist(firstVoicing, c));
  const track = new Array(count);
  track[1] = cands[1].map(() => 0);

  for (let i = 2; i < count; i++) {
    const ndp = [], ntr = [];
    for (let j = 0; j < cands[i].length; j++) {
      let best = Infinity, bk = 0;
      for (let k = 0; k < cands[i - 1].length; k++) {
        const cost = dp[k] + dist(cands[i - 1][k], cands[i][j]);
        if (cost < best || (cost === best && fret(cands[i - 1][k]) < fret(cands[i - 1][bk]))) {
          best = cost; bk = k;
        }
      }
      ndp.push(best); ntr.push(bk);
    }
    dp = ndp; track[i] = ntr;
  }

  // ③ wrap-around: 마지막 코드 → 첫 코드 이동 비용 포함해 bestJ 결정
  const totalCosts = cands[count - 1].map((c, jN) => dp[jN] + dist(c, firstVoicing));
  let bestJ = 0;
  for (let j = 1; j < totalCosts.length; j++) {
    if (totalCosts[j] < totalCosts[bestJ] ||
        (totalCosts[j] === totalCosts[bestJ] && fret(cands[count - 1][j]) < fret(cands[count - 1][bestJ]))) {
      bestJ = j;
    }
  }

  // ④ 역추적
  const choices = new Array(count);
  choices[count - 1] = bestJ;
  for (let i = count - 1; i >= 2; i--) {
    choices[i - 1] = track[i][choices[i]];
  }

  _stepCache = stepData.map((s, i) => ({
    voicing:   i === 0 ? firstVoicing : cands[i][choices[i]],
    chordName: s.chordName,
  }));
}

// 스테이지 초기화 (전체 재구성) — 4슬롯 모델
function _renderStage() {
  if (!_prog) return;
  const row = document.getElementById('detail-chord-row');
  if (!row) return;
  row.innerHTML = '';

  if (_stageRO) { _stageRO.disconnect(); _stageRO = null; }

  _buildStepCache(); // 보이싱 캐시 선빌드

  _slotDoms  = [];
  _slotRoles = [0, 1, 2, 3]; // dom0=far-left, dom1=prev, dom2=current, dom3=next
  _slotData  = [null, null, null, null];

  for (let i = 0; i < 4; i++) {
    const wrap   = document.createElement('div');
    wrap.className = 'progd-slot progd-slot--' + _ROLE_NAMES[i];
    const canvas = document.createElement('canvas');
    canvas.className = 'progd-chord-canvas';
    wrap.appendChild(canvas);
    row.appendChild(wrap);
    _slotDoms.push(wrap);
  }

  const cur   = _currentDisplayStep;
  const count = _dispCount;
  _drawSlot(0, (cur - 2 + count) % count); // far-left
  _drawSlot(1, (cur - 1 + count) % count); // prev
  _drawSlot(2, cur);                         // current
  _drawSlot(3, (cur + 1) % count);           // next

  if (window.ResizeObserver) {
    _stageRO = new ResizeObserver(() => {
      _slotDoms.forEach((el, i) => {
        if (!_slotData[i]) return;
        const canvas = el.querySelector('canvas');
        _redrawCanvas(canvas, el, _slotData[i].voicing, _slotData[i].chordName);
      });
    });
    _slotDoms.forEach(el => _stageRO.observe(el));
  }
}

// 스텝 진행 애니메이션 (왼쪽 방향 무한 휠피커)
function _advanceStage(newCurrent) {
  if (!_slotDoms) { _renderStage(); return; }

  const count   = _dispCount;
  const domFL   = _getSlotByRole(0); // far-left (완전히 화면 밖)
  const domPrev = _getSlotByRole(1); // prev
  const domCurr = _getSlotByRole(2); // current
  const domNext = _getSlotByRole(3); // next

  // 1. far-left 슬롯 → far-right 위치로 즉시 스냅 (완전히 보이지 않는 상태에서 이동)
  _slotDoms[domFL].className = 'progd-slot progd-slot--far-right progd-no-transition';

  // 2. 새 next+1 콘텐츠 미리 그리기 (opacity 0 상태라 보이지 않음)
  _drawSlot(domFL, (newCurrent + 1) % count);

  // 3. 강제 reflow → far-right 스냅 확정
  void _slotDoms[domFL].getBoundingClientRect();

  // 4. 4슬롯 전체 동시 슬라이드 (CSS transition)
  //    far-right → next (오른쪽에서 등장)
  //    prev      → far-left (왼쪽으로 퇴장)
  //    current   → prev
  //    next      → current
  _slotDoms[domFL].className   = 'progd-slot progd-slot--next';
  _slotDoms[domPrev].className = 'progd-slot progd-slot--far-left';
  _slotDoms[domCurr].className = 'progd-slot progd-slot--prev';
  _slotDoms[domNext].className = 'progd-slot progd-slot--current';

  // 5. 역할 갱신
  _slotRoles[domFL]   = 3; // next
  _slotRoles[domPrev] = 0; // far-left
  _slotRoles[domCurr] = 1; // prev
  _slotRoles[domNext] = 2; // current
}

// 역방향(이전 코드) 애니 — 스와이프 우→좌 반대용 (_advanceStage 미러)
// far-left 슬롯엔 이미 (cur-2) 콘텐츠가 있어 그대로 prev로 들어옴
function _advanceStageBack(newCurrent) {
  if (!_slotDoms) { _renderStage(); return; }
  const count   = _dispCount;
  const domFL   = _getSlotByRole(0);
  const domPrev = _getSlotByRole(1);
  const domCurr = _getSlotByRole(2);
  const domNext = _getSlotByRole(3);

  // 슬라이드: far-left→prev, prev→current, current→next, next→far-right(퇴장)
  _slotDoms[domFL].className   = 'progd-slot progd-slot--prev';
  _slotDoms[domPrev].className = 'progd-slot progd-slot--current';
  _slotDoms[domCurr].className = 'progd-slot progd-slot--next';
  _slotDoms[domNext].className = 'progd-slot progd-slot--far-right';

  _slotRoles[domFL]   = 1; // prev
  _slotRoles[domPrev] = 2; // current
  _slotRoles[domCurr] = 3; // next
  _slotRoles[domNext] = 0; // far-left (숨김)

  // 퇴장 슬롯 → far-left 위치 스냅 복귀 + 새 far-left 콘텐츠(newCurrent-2)
  const exited = domNext;
  setTimeout(() => {
    _slotDoms[exited].className = 'progd-slot progd-slot--far-left progd-no-transition';
    void _slotDoms[exited].getBoundingClientRect();
    _drawSlot(exited, ((newCurrent - 2) % count + count) % count);
  }, 440);
}

// 임의 스텝을 한 번의 슬라이드로 들여보내며 이동 (재생 시작 시 첫 코드 복귀 애니)
//   fromRight=true: 오른쪽(next)에서 등장 / false: 왼쪽(prev)에서 등장
function _animateToStep(target, fromRight) {
  if (!_slotDoms) { _currentDisplayStep = target; _renderStage(); return; }
  if (fromRight) {
    _drawSlot(_getSlotByRole(3), target); // next 슬롯을 target으로 그린 뒤 슬라이드 인
    _currentDisplayStep = target;
    _advanceStage(target);
  } else {
    _drawSlot(_getSlotByRole(1), target); // prev 슬롯을 target으로
    _currentDisplayStep = target;
    _advanceStageBack(target);
  }
}

// ── DOMContentLoaded ────────────────────────────────────────
// ── 주법 그림(비트 박스보더) — 디자인 확인용. strum-play.js의 격자 코드를 복사했고, 선택된 주법 대신 샘플 주법 하나를 그림 ──
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
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6; // 분모8(12/8 등)=3연음 DDU / 6/8은 제외(DU 연속)
  let s = '';
  for (let i = 1; i <= n; i++) {
    if (skip.includes(i)) { s += '-'; continue; }
    if (triplet) s += (i - 1) % 3 === 2 ? 'U' : 'D';
    else s += alt ? 'D' : (i % 2 ? 'D' : 'U');
  }
  return s;
}

// 스트로크·컷팅 아이콘 — image/down_stroke.svg · up_stroke.svg · cut_stroke.svg 와 같은 도형. 루시드 규격(24×24, currentColor)의 인라인 svg라
// 크기는 CSS(width/height), 색은 CSS color를 따름. (원본 디자인을 1.5배 확대해 24×24 가운데에 배치한 변환본)
const _STRUM_SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const STRUM_ICON_DOWN = `${_STRUM_SVG_OPEN}><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>`;
const STRUM_ICON_UP   = `${_STRUM_SVG_OPEN} stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>`;
const STRUM_ICON_CUT  = `${_STRUM_SVG_OPEN} stroke-width="3"><line x1="4.5" y1="3.75" x2="19.5" y2="20.25"/><line x1="19.5" y1="3.75" x2="4.5" y2="20.25"/></svg>`;

function strumCellHtml(ch, pos, alt, isCut, triplet) {
  let dir = ch;
  let ghost = false;
  if (ch === '-') {
    ghost = true;
    // 헛스트로크 방향: 3연음=DDU 패턴 / 그 외=alt·교차
    dir = triplet ? ((pos - 1) % 3 === 2 ? 'U' : 'D')
                  : (alt ? 'D' : (pos % 2 ? 'D' : 'U'));
  }
  const ghostCls = ghost ? ' strum-ico--ghost' : '';
  let inner = '';
  if (dir === 'U') {
    inner = `<span class="strum-ico${ghostCls}">${STRUM_ICON_UP}</span>`;
  } else if (dir === 'D') {
    inner = `<span class="strum-ico${ghostCls}">${STRUM_ICON_DOWN}</span>`;
  }
  // 컷팅: 셀 상단에 X 아이콘 (뮤트 스트로크)
  const cutHtml = isCut ? `<span class="strum-cut">${STRUM_ICON_CUT}</span>` : '';
  return `<div class="strum-beat-cell">${cutHtml}${inner}</div>`;
}


function renderStrumDisplay(selected) {
  const wrap = document.getElementById('strum-display');
  const list = window.STRUMMING_LIST || [];
  const item = selected || list.find(i => i.cut) || list[1] || list[0];
  if (!wrap || !item) return;
  const strokes = strumStrokeString(item);
  const cells = strokes.length;
  const alt = item.alt === true;
  const cut = item.cut || [];
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6;
  const group = strumGroupSize(item.beat, cells);
  const gClass = group ? ` strum-beat-grid--g${group}` : '';
  const rows = cells > 12 ? 2 : 1;   // 12칸 초과 → 2줄 분할
  const rowSize = cells / rows;
  let gridsHtml = '';
  for (let r = 0; r < rows; r++) {
    let cellsHtml = '';
    for (let c = 0; c < rowSize; c++) {
      const pos = r * rowSize + c + 1;
      cellsHtml += strumCellHtml(strokes[pos - 1], pos, alt, cut.includes(pos), triplet);
    }
    gridsHtml += `<div class="strum-beat-grid${gClass}">${cellsHtml}</div>`;
  }
  wrap.innerHTML = gridsHtml;
  // 셀 DOM 캐시(재생 시 비트 강조용 — DOM 순서 = 셀 순서) + 플레이헤드(이동 세로선)
  _strumCellEls = Array.from(wrap.querySelectorAll('.strum-beat-cell'));
  const ph = document.createElement('div');
  ph.className = 'strum-playhead';
  wrap.appendChild(ph);
  _strumPlayhead = ph;
}

// ── 주법 선택 화면 (옵션패널) — 라벨 "주법" + 주법 이름 휠피커. 디자인 확인용(선택하면 주법 디스플레이만 바뀜) ──
const SP_ITEM_H = 44;          // 휠 한 칸 높이(CSS --sp-item-h와 같은 값)
let _spItems = [];             // 휠에 올라간 주법들(데이터 순서 = 난이도 순)
let _spIdx = -1;
let _spLevel = 0;              // 레벨 칩 선택값 (0 = 전체)

// 전체 주법 — 레벨 오름차순(같은 레벨 안은 데이터 순서 유지). 데이터가 레벨 순이 아니어도 휠·모달 모두 이 순서를 씀
function _spAll() {
  return (window.STRUMMING_LIST || []).map((it, i) => ({ it, i })).sort((a, b) => a.it.level - b.it.level || a.i - b.i).map(o => o.it);
}

// 주법 선택 모달("모두 보기") — 레벨 디바이더별로 전체 주법 나열. 고르면 휠·주법 디스플레이가 그 주법으로 바뀌고 모달이 닫힘
function initSpAllModal() {
  const chip    = document.getElementById('sp-chip-all');
  const overlay = document.getElementById('sp-modal-overlay');
  const body    = document.getElementById('sp-modal-body');
  const closeBt = document.getElementById('sp-modal-close');
  if (!chip || !overlay || !body) return;
  const close = () => overlay.classList.add('hidden');
  const tabsBox = document.getElementById('sp-modal-level-tabs');
  const allTabs = () => overlay.querySelectorAll('.sp-modal-tab');
  let filter = 'all';   // 'all' | 레벨 숫자
  const levels = [...new Set(_spAll().map(i => i.level))].sort((x, y) => x - y);
  if (tabsBox) tabsBox.innerHTML = levels.map(l => `<button class="sp-modal-tab" data-f="${l}">Lv${l}</button>`).join('');
  const syncTabs = () => allTabs().forEach(b => b.classList.toggle('sp-modal-tab--active', b.dataset.f === String(filter)));
  const render = () => {
    const all = _spAll();
    const cur = _spItems[_spIdx];
    let html = '', lastLv = null;
    all.forEach((it, i) => {
      if (filter !== 'all' && it.level !== filter) return;
      if (it.level !== lastLv) { lastLv = it.level; html += `<div class="prog-section-label">Lv${it.level}</div>`; }
      const [bn, bd] = String(it.beat || '4/4').split('/');   // 박자표처럼 위(분자)·아래(분모)로 쌓음
      html += `<button class="sp-modal-item${it === cur ? ' sp-modal-item--active' : ''}" data-i="${i}"><span class="sp-modal-item-name">${it.title}</span><span class="sp-modal-item-beat"><b>${bn}</b><b>${bd}</b></span></button>`;
    });
    body.innerHTML = html;
  };
  overlay.querySelector('.sp-modal-tabs')?.addEventListener('pointerup', e => {
    const b = e.target.closest('.sp-modal-tab');
    if (!b) return;
    _playTap();
    filter = b.dataset.f === 'all' ? 'all' : Number(b.dataset.f);
    syncTabs();
    render();
    body.scrollTop = 0;
  });
  chip.addEventListener('pointerup', e => {
    e.stopPropagation();
    _playTap();
    filter = 'all';   // 열 때는 항상 전체
    syncTabs();
    render();
    overlay.classList.remove('hidden');
    body.scrollTop = 0;
    const act = body.querySelector('.sp-modal-item--active');
    if (act) body.scrollTop = act.offsetTop - (body.clientHeight - act.offsetHeight) / 2;   // 현재 주법이 보이게
  });
  closeBt?.addEventListener('pointerup', () => { _playTap(); close(); });
  overlay.addEventListener('pointerup', e => { if (e.target === overlay) close(); });
  body.addEventListener('pointerup', e => {
    const b = e.target.closest('.sp-modal-item');
    if (!b) return;
    _playTap();
    const idx = Number(b.dataset.i);
    _spLevel = 0;                                            // 전체 보기 상태로 돌려서 휠에 모든 주법이 올라오게
    renderStrumPicker();
    const wheel = document.getElementById('strum-picker-wheel');
    wheel.scrollTop = idx * SP_ITEM_H;
    _spIdx = -1;
    _spSelect(idx);
    close();
  });
}

function renderStrumPicker() {
  const wheel = document.getElementById('strum-picker-wheel');
  const all = _spAll();
  _spItems = _spLevel === 0 ? all : all.filter(i => i.level === _spLevel);
  if (!wheel || !_spItems.length) return;
  wheel.innerHTML = _spItems.map((it, i) => `<div class="strum-picker-item" data-i="${i}">${it.title}</div>`).join('');
  wheel.onscroll = () => {
    cancelAnimationFrame(wheel._raf);
    wheel._raf = requestAnimationFrame(() => _spSelect(Math.round(wheel.scrollTop / SP_ITEM_H)));
  };
  wheel.onpointerup = e => {
    const el = e.target.closest('.strum-picker-item');
    if (el) wheel.scrollTo({ top: Number(el.dataset.i) * SP_ITEM_H, behavior: 'smooth' });
  };
  wheel.scrollTop = 0;
  _spIdx = -1;
  _spSelect(0);
}

function _spSelect(idx) {
  const wheel = document.getElementById('strum-picker-wheel');
  if (!wheel || !_spItems.length) return;
  idx = Math.max(0, Math.min(_spItems.length - 1, idx));
  if (idx === _spIdx) return;
  _spIdx = idx;
  if (_playing || _starting) _stopPlay();   // 재생 중 주법을 바꾸면 멈춤
  wheel.querySelectorAll('.strum-picker-item').forEach((el, i) => el.classList.toggle('strum-picker-item--active', i === idx));
  renderStrumDisplay(_spItems[idx]);   // 위의 주법 디스플레이 갱신
  if (_applyBeatDefaults) _applyBeatDefaults(_spItems[idx]);   // 박자가 바뀌면 그 박자의 BPM·점진 가속 기본값
}

// ── 재생 탭 팝업들 ───────────────────────────────────────────
// 목표 BPM(가로로 긴 슬라이더 팝업, 점진 가속 영역을 덮음) · 시작 BPM(같은 디자인, 목표 BPM 이하만) ·
// 사이클마다 / BPM씩(좁은 휠 팝업, 위로, 1~10·4칸 보임) · 스타일(좁은 목록, 위로). 팝업은 하나만 열리고, 바깥을 누르면 닫힘.
// 열림·닫힘은 통통 튀는 애니메이션(닫힘은 끝난 뒤 hidden). 값은 디자인 확인용 상태 — 점진 가속의 실제 동작은 구현 단계
let _rampStart  = 60;   // 점진 가속 시작 BPM (목표 BPM = _bpm 이하)
let _rampCycles = 1;    // 몇 사이클마다 올릴지 (1~10)
let _rampStep   = 2;    // 한 번에 몇 BPM씩 올릴지 (1~10)
const _popups = [];     // 열린 팝업을 하나로 유지하기 위한 목록

// 옆으로 열리는 팝업: 카드 오른쪽에 붙음. 높이 미지정이면 세로 범위가 block(점진 가속 영역)과 같고,
// 높이(h)를 주면 카드와 세로 중앙을 맞추되 block 밖으로 나가지 않음
function _placeSidePopup(pop, card, block, h) {
  const c = card.getBoundingClientRect(), b = block.getBoundingClientRect();
  pop.style.left = (c.right + 8) + 'px';
  if (h) {
    pop.style.top = Math.max(b.top, Math.min(c.top + c.height / 2 - h / 2, b.bottom - h)) + 'px';
    pop.style.height = h + 'px';
  } else {
    pop.style.top = b.top + 'px';
    pop.style.height = b.height + 'px';
  }
  pop.style.width = ''; pop.style.bottom = 'auto';
  pop.style.transformOrigin = '0 50%';
}

function _makePopup(card, pop, onOpen, opts) {
  opts = opts || {};
  const anchor = opts.anchor || card;
  document.querySelector('.cd-main').appendChild(pop);   // 오버레이: 옵션패널 밖으로
  const isOpen = () => !pop.hidden && !pop.classList.contains('bpm-popup--closing');
  const closingCls = 'bpm-popup--closing';
  const ctl = {
    isOpen,
    close() {
      if (!isOpen()) return;
      card.classList.remove('play-card--open');
      pop.classList.add(closingCls);
      const done = () => {
        if (!pop.classList.contains(closingCls)) return;
        pop.classList.remove(closingCls);
        pop.hidden = true;
      };
      pop.addEventListener('animationend', done, { once: true });
      setTimeout(done, 300);
    },
    open() {
      _popups.forEach(p => { if (p !== ctl) p.close(); });
      pop.classList.remove(closingCls);
      pop.hidden = false;
      if (onOpen) onOpen();
      _placeSidePopup(pop, card, anchor, opts.sideH);
      card.classList.add('play-card--open');
    },
  };
  card.addEventListener('pointerup', e => {
    e.stopPropagation();
    _playTap();
    if (isOpen()) ctl.close(); else ctl.open();
  });
  pop.addEventListener('pointerup', e => e.stopPropagation());
  _popups.push(ctl);
  window.addEventListener('resize', () => ctl.close());
  return ctl;
}

// 슬라이더 팝업(가운데 값 · 좌우 −/+ 1씩(길게 누르면 연속) · 아래 슬라이더). max()가 함수라 시작 BPM은 목표 BPM에 묶임
function _initSliderPopup(o) {
  const el = id => document.getElementById(id);
  const card = el(o.card), pop = el(o.pop), slider = el(o.slider), cardVal = el(o.cardVal), minus = o.minus ? el(o.minus) : null, plus = o.plus ? el(o.plus) : null;   // +/− 버튼은 선택
  if (!card || !pop || !slider || !cardVal || (o.minus && !minus) || (o.plus && !plus)) return null;
  const min = o.min != null ? o.min : BPM_MIN;
  const set = v => {
    const max = o.max();
    v = Math.max(min, Math.min(max, Math.round(v)));
    o.write(v);
    cardVal.textContent = v;
    slider.min = min; slider.max = max; slider.value = v;
    const pct = (max > min ? (v - min) / (max - min) * 100 : 100) + '%';
    slider.style.setProperty('--pct', pct);
    if (o.onSet) o.onSet(v);
  };
  slider.addEventListener('input', () => set(Number(slider.value)));
  const hold = (btn, delta) => {
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      set(o.read() + delta);
      t1 = setTimeout(() => { t2 = setInterval(() => set(o.read() + delta), 60); }, 350);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  };
  if (minus) hold(minus, -1);
  if (plus) hold(plus, 1);
  const ctl = _makePopup(card, pop, () => set(o.read()), { anchor: o.anchor ? el(o.anchor) || document.querySelector(o.anchor) : card, sideH: o.sideH });
  set(o.read());
  return { set, ctl };
}

// 백킹 선택 — 드럼(박자별 드럼 세트) / 메트로놈(박마다 클릭, 마디 첫 박 강세). 재생 중에 바꿔도 다음 박부터 바로 바뀜
let _backing = 'drum';
function _initBackingPick() {
  const btns = { drum: document.getElementById('backing-drum'), click: document.getElementById('backing-click') };
  if (!btns.drum || !btns.click) return;
  Object.entries(btns).forEach(([key, btn]) => btn.addEventListener('pointerup', () => {
    _playTap();
    _backing = key;
    Object.entries(btns).forEach(([k, b]) => {
      b.classList.toggle('backing-btn--active', k === key);
      b.setAttribute('aria-checked', k === key ? 'true' : 'false');
    });
  }));
}

// 메트로놈 클릭 — metronome.js의 클릭 소리와 같은 값(사인파 + 로우패스, 강세 740Hz / 약박 520Hz).
// 룩어헤드로 미리 예약된 노드는 정지해도 울리므로 모아두고 정지 때 전부 끊음
const _clickNodes = [];
function _clickAt(time, isDownbeat) {
  if (!_metroCtx) return;
  const osc = _metroCtx.createOscillator();
  const gain = _metroCtx.createGain();
  const filter = _metroCtx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 1400; filter.Q.value = 0.3;
  osc.connect(filter); filter.connect(gain); gain.connect(_metroCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = isDownbeat ? 740 : 520;
  if (time < _metroCtx.currentTime) time = _metroCtx.currentTime;
  gain.gain.setValueAtTime(isDownbeat ? 0.38 : 0.22, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
  const node = { osc, gain };
  _clickNodes.push(node);
  osc.onended = () => { const i = _clickNodes.indexOf(node); if (i >= 0) _clickNodes.splice(i, 1); try { osc.disconnect(); gain.disconnect(); } catch (e) {} };
  osc.start(time);
  osc.stop(time + 0.06);
}
function _stopClicks() {
  _clickNodes.splice(0).forEach(({ osc, gain }) => {
    try { gain.gain.cancelScheduledValues(0); gain.gain.value = 0; osc.stop(); osc.disconnect(); gain.disconnect(); } catch (e) {}
  });
}

// 박자별 기본값: 목표 BPM / 시작 BPM (점진 가속은 1사이클마다 2BPM씩). 주법의 박자가 바뀌면 그 박자의 기본값으로 맞춤 —
// 같은 박자 안에서 주법만 바꿀 땐 사용자가 맞춰 둔 값을 유지
const BEAT_DEFAULTS = {
  '4/4':  { bpm: 90,  start: 50 },
  '6/8':  { bpm: 50,  start: 30 },
  '3/4':  { bpm: 120, start: 80 },
  '12/8': { bpm: 90,  start: 50 },
};
const RAMP_DEFAULT_CYCLES = 1, RAMP_DEFAULT_STEP = 2;
let _applyBeatDefaults = null;   // initPlayPopups가 UI 연결 후 채움
let _lastDefaultsBeat = null;

function initPlayPopups() {
  // 목표 BPM — 값이 시작 BPM보다 낮아지면 시작 BPM도 같이 내려감
  let startApi = null;
  const bpmSlider = document.getElementById('bpm-inline-slider');
  const bpmVal = document.getElementById('play-bpm-val');
  const setTargetBpm = v => {
    v = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(v)));
    _bpm = v;
    _liveShown = null;
    if (_rampStart > v) _rampStart = v;
    startApi?.set(_rampStart);
    bpmVal.textContent = v;
    bpmSlider.min = BPM_MIN; bpmSlider.max = BPM_MAX; bpmSlider.value = v;
    bpmSlider.style.setProperty('--pct', ((v - BPM_MIN) / (BPM_MAX - BPM_MIN) * 100) + '%');
  };
  bpmSlider.addEventListener('input', () => setTargetBpm(Number(bpmSlider.value)));
  setTargetBpm(_bpm);
  // 숫자 좌측 +/− — 슬라이더 값을 1씩 바꾸고 input 이벤트로 기존 set()을 태움(길게 누르면 연속)
  const nudgeSlider = document.getElementById('bpm-inline-slider');
  [['bpm-nudge-plus', 1], ['bpm-nudge-minus', -1]].forEach(([id, d]) => {
    const b = document.getElementById(id);
    if (!b || !nudgeSlider) return;
    let t1 = null, t2 = null;
    const step = () => { nudgeSlider.value = Math.max(BPM_MIN, Math.min(Number(nudgeSlider.max), Number(nudgeSlider.value) + d)); nudgeSlider.dispatchEvent(new Event('input')); };
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); step(); t1 = setTimeout(() => { t2 = setInterval(step, 60); }, 350); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  });
  // 시작 BPM — 목표 BPM(_bpm) 이하만
  startApi = _initSliderPopup({
    card: 'ramp-start-card', pop: 'ramp-start-pop', slider: 'ramp-start-slider', cardVal: 'ramp-start-val', minus: 'ramp-start-minus', plus: 'ramp-start-plus',
    read: () => _rampStart, max: () => _bpm, anchor: '.ramp-block',   // 카드 오른쪽에 세로로 길고 좁게(높이 = 점진 가속 영역)
    write: v => { _rampStart = v; },
  });
  // 사이클마다 · BPM씩 — 1~10 좁은 휠 팝업(위로)
  const cycleApi = _initSliderPopup({ card: 'ramp-cycle-card', pop: 'ramp-cycle-pop', slider: 'ramp-cycle-slider', cardVal: 'ramp-cycle-val',
    min: 1, read: () => _rampCycles, max: () => 10, anchor: '.ramp-block', sideH: 120, write: v => { _rampCycles = v; } });
  const stepApi = _initSliderPopup({ card: 'ramp-step-card', pop: 'ramp-step-pop', slider: 'ramp-step-slider', cardVal: 'ramp-step-val',
    min: 1, read: () => _rampStep, max: () => 10, anchor: '.ramp-block', sideH: 120, write: v => { _rampStep = v; } });
  _applyBeatDefaults = item => {
    const beat = String(item && item.beat || '4/4');
    if (beat === _lastDefaultsBeat) return;
    _lastDefaultsBeat = beat;
    const d = BEAT_DEFAULTS[beat];
    if (!d) return;
    setTargetBpm(d.bpm);        // 목표를 먼저(시작 BPM은 목표 이하로 제한되므로)
    startApi.set(d.start);
    cycleApi.set(RAMP_DEFAULT_CYCLES);
    stepApi.set(RAMP_DEFAULT_STEP);
  };
  _applyBeatDefaults(_spItems[_spIdx]);
  _initBackingPick();
  const rampToggle = document.getElementById('ramp-toggle');
  if (rampToggle) rampToggle.addEventListener('change', () => {
    _rampOn = rampToggle.checked;
    if (_playing || _starting) _stopPlay();   // 재생 중 켜고 끄면 멈추고 새 설정으로 다시 시작
  });
  document.addEventListener('pointerup', () => _popups.forEach(p => p.close()));   // 바깥을 누르면 모두 닫힘
}

document.addEventListener('DOMContentLoaded', () => {
  // URL 파라미터 파싱
  const params = new URLSearchParams(location.search);
  const progId = params.get('id');
  const progNo = params.get('no'); // 넛지: no 그룹만 지정 → 랜덤 진행 (콤마로 여러 그룹 합집합 가능)
  _key     = parseInt(params.get('key')  || '0', 10);
  _useFlat = params.get('flat') !== '0'; // 기본 플랫 (명시적 0만 샵)

  if (progId) {
    _prog = PROGRESSIONS.find(p => p.id === progId) || null;
  } else if (progNo != null) {
    const noList = String(progNo).split(',');
    const group = PROGRESSIONS.filter(p => noList.includes(String(p.no)));
    _prog = group.length ? group[Math.floor(Math.random() * group.length)] : null;
  } else {
    _prog = null;
  }
  const _titleEl = document.getElementById('detail-title');
  if (_titleEl) _titleEl.innerHTML = getProgressionNameHtml(_prog);
  document.documentElement.classList.toggle('peak-free', getPlan() === 'pro'); // 연습 시작 버튼 피크 배지: Pro는 숨김

  // 뒤로가기+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  // 페이지 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // Android 하드웨어 백: 모달 열려있으면 닫기, 아니면 뒤로가기 요청
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      if (isLeavePracticeOpen()) { hideLeavePracticeModal(); return; }
      requestBack();
    });
  }

  // 페이지 이탈 중 재생이면 훈련시간 적립
  // 이탈 경로: 뒤로가기(goBack) · 하드웨어 뒤로가기(requestBack→goBack) · 페이지 이동/새로고침/닫기(pagehide) · 홈 버튼/앱 전환(visibilitychange) — 전부 즉시 하드컷
  window.addEventListener('pagehide', () => { if (_playing || _starting) _stopPlay({ hard: true }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (_playing || _starting)) _stopPlay({ hard: true }); });

  // 페이지 커버
  lucide.createIcons();
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  // 샵/플랫 토글
  const sharpBtn = document.getElementById('detail-acc-sharp');
  const flatBtn  = document.getElementById('detail-acc-flat');

  function _setAccidental(useFlat) {
    _useFlat = useFlat;
    sharpBtn.classList.toggle('active', !useFlat);
    flatBtn .classList.toggle('active',  useFlat);
    _stopPlay();
    _renderKeyStrip();
    _renderStage();
  }

  const accToggle = document.getElementById('detail-accidental-toggle');
  if (accToggle) {
    accToggle.addEventListener('pointerup', () => { _playTap(); _setAccidental(!_useFlat); });
  }

  if (_useFlat) _setAccidental(true);

  // 손가락 번호 on/off 토글 (재생 정지 없이 슬롯만 재드로우)
  const fingerBtn = document.getElementById('detail-finger-toggle');
  if (fingerBtn) {
    fingerBtn.addEventListener('pointerup', () => {
      _playTap();
      _showFingers = !_showFingers;
      fingerBtn.classList.toggle('active', _showFingers);
      _redrawAllSlots();
    });
  }

  // 코드 캐러셀 스와이프 (정지 중에만) — 좌:다음 / 우:이전 (한 칸 애니)
  const stageInner = document.getElementById('detail-chord-row');
  if (stageInner) {
    let _sx = 0, _swiping = false, _busy = false;
    stageInner.addEventListener('pointerdown', (e) => {
      if (_playing) return;
      _sx = e.clientX; _swiping = true;
      try { stageInner.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const _endSwipe = (e) => {
      if (!_swiping || _playing) { _swiping = false; return; }
      _swiping = false;
      if (_busy || !_prog) return;
      const dx = e.clientX - _sx;
      if (Math.abs(dx) < 40) { _playCurrentChord(); return; } // 스와이프 아닌 탭 → 코드 사운드
      const count = _dispCount;
      if (count < 2) return;
      _busy = true;
      setTimeout(() => { _busy = false; }, 460);
      if (dx < 0) { // 좌 → 다음
        _currentDisplayStep = (_currentDisplayStep + 1) % count;
        _advanceStage(_currentDisplayStep);
      } else {      // 우 → 이전
        _currentDisplayStep = (_currentDisplayStep - 1 + count) % count;
        _advanceStageBack(_currentDisplayStep);
      }
    };
    stageInner.addEventListener('pointerup', _endSwipe);
    stageInner.addEventListener('pointercancel', () => { _swiping = false; });
  }

  // 초기 렌더
  _initBpmWheel();
  _renderKeyStrip();
  const keyStrip = document.getElementById('detail-key-strip');
  if (keyStrip) {
    // 선택된 키가 화면 밖이면 보이는 위치로(URL key 파라미터 진입 등)
    const act = keyStrip.querySelector('.key-btn--active');
    if (act) keyStrip.scrollTo({ left: act.offsetLeft - (keyStrip.clientWidth - act.offsetWidth) / 2, behavior: 'instant' });
    initKeySelectorDragScroll(keyStrip);
    initKeySelectorFade(keyStrip);
  }
  _renderStage();
  renderStrumPicker();
  initSpAllModal();
  initPlayPopups();

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  analytics.track('progression_detail_viewed', { prog_id: progId, entry: _pushEntry || 'direct' });
});
