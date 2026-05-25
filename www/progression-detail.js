'use strict';

// ── 진행 데이터 (progression.js와 동기화) ────────────────────
const PROGRESSIONS = [
  // ── Tier 1: 3화음만 (I 시작) ────────────────────────────────
  {
    id: 'I-IV-V-I',
    name: 'I - IV - V - I',
    keys: ['C', 'D', 'G', 'A'],
    steps: [
      { semitones: 0, quality: 'M', label: 'I'  },
      { semitones: 5, quality: 'M', label: 'IV' },
      { semitones: 7, quality: 'M', label: 'V'  },
      { semitones: 0, quality: 'M', label: 'I'  },
    ],
  },
  {
    id: 'I-V-vi-IV',
    name: 'I - V - vi - IV',
    keys: '',
    steps: [
      { semitones: 0, quality: 'M', label: 'I'  },
      { semitones: 7, quality: 'M', label: 'V'  },
      { semitones: 9, quality: 'm', label: 'vi' },
      { semitones: 5, quality: 'M', label: 'IV' },
    ],
  },
  {
    id: 'I-vi-IV-V',
    name: 'I - vi - IV - V',
    keys: '',
    steps: [
      { semitones: 0, quality: 'M', label: 'I'  },
      { semitones: 9, quality: 'm', label: 'vi' },
      { semitones: 5, quality: 'M', label: 'IV' },
      { semitones: 7, quality: 'M', label: 'V'  },
    ],
  },
  // ── Tier 2: 7th 포함 (I 시작) ──────────────────────────────
  {
    id: 'I-IV-I-V-blues',
    name: 'I - IV - I - V',
    keys: '',
    steps: [
      { semitones: 0, quality: '7', label: 'I7'  },
      { semitones: 5, quality: '7', label: 'IV7' },
      { semitones: 0, quality: '7', label: 'I7'  },
      { semitones: 7, quality: '7', label: 'V7'  },
    ],
  },
  {
    id: 'I-vi-ii-V',
    name: 'I - vi - ii - V',
    keys: '',
    steps: [
      { semitones: 0, quality: 'M7', label: 'IM7'  },
      { semitones: 9, quality: 'm7', label: 'vim7' },
      { semitones: 2, quality: 'm7', label: 'iim7' },
      { semitones: 7, quality: '7',  label: 'V7'   },
    ],
  },
  // ── Tier 2: 7th 포함 (ii 시작) ──────────────────────────────
  {
    id: 'ii-V-I',
    name: 'ii - V - I',
    keys: '',
    steps: [
      { semitones: 2, quality: 'm7', label: 'iim7' },
      { semitones: 7, quality: '7',  label: 'V7'   },
      { semitones: 0, quality: 'M7', label: 'IM7'  },
    ],
  },
  // ── Tier 2: 7th 포함 (iii 시작) ─────────────────────────────
  {
    id: 'iii-vi-ii-V',
    name: 'iii - vi - ii - V',
    keys: '',
    steps: [
      { semitones: 4, quality: 'm7', label: 'iiim7' },
      { semitones: 9, quality: 'm7', label: 'vim7'  },
      { semitones: 2, quality: 'm7', label: 'iim7'  },
      { semitones: 7, quality: '7',  label: 'V7'    },
    ],
  },
];

// ── 키/노트 상수 ─────────────────────────────────────────────
const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_TO_SHARP   = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

function _getChordName(rootKey, semitones, quality) {
  const names   = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const noteIdx = (rootKey + semitones + 12) % 12;
  const note    = names[noteIdx];
  const sfx     = { M: '', m: 'm', '7': '7', M7: 'M7', m7: 'm7', dim: 'dim', dim7: 'dim7', aug: 'aug' };
  return note + (sfx[quality] ?? '');
}

// ── 상태 ────────────────────────────────────────────────────
let _prog               = null;
let _key                = 0;
let _useFlat            = false;
let _bpm                = 80;
let _playing            = false;
let _currentDisplayStep = 0;
let _timer              = null;  // 마스터 비트 타이머 (단일)
let _masterBeat         = 0;     // 재생 시작 후 누적 비트 수

// ── 캔버스 드로잉 상수 ──────────────────────────────────────
const _STRINGS   = 6;
const _FRETS     = 4;
const _BASE_PAD_L  = 35;
const _BASE_OPEN_W = 60;
const _BASE_FBW    = 240;
const _BASE_FBH    = 192;
const _BASE_PAD_R  = 95;
const _BASE_PAD_T  = 80;
const _BASE_PAD_B  = 80;
const _BASE_W = _BASE_PAD_L + _BASE_OPEN_W + _BASE_FBW + _BASE_PAD_R; // 460
const _BASE_H = _BASE_PAD_T + _BASE_FBH + _BASE_PAD_B;                // 352

// 보이싱 정규화: 프렛이 1-4 범위 밖이면 오프셋 적용
function _normalizeVoicing(v) {
  const positives = v.frets.filter(f => f !== null && f > 0);
  if (!positives.length) return v;
  const minF = Math.min(...positives);
  if (minF <= 4) return v;
  const offset = minF - 1;
  const newBarre = {};
  Object.keys(v.barre || {}).forEach(k => { newBarre[+k - offset] = true; });
  return {
    ...v,
    frets:      v.frets.map(f => f === null ? null : (f === 0 ? 0 : f - offset)),
    barre:      newBarre,
    fretNumber: minF,
  };
}

// 보이싱 룩업
function _findVoicing(chordName, quality) {
  const lib = window.chordsLibrary;
  if (!lib) return null;
  const m = chordName.match(/^([A-G][b#]?)/);
  if (!m) return null;
  const rootKey = FLAT_TO_SHARP[m[1]] || m[1];
  const entries = lib[rootKey];
  if (!entries) return null;
  const match = entries.find(v => v.quality === quality) || null;
  return match ? _normalizeVoicing(match) : null;
}

// 캔버스 드로잉
function _drawVoicingCanvas(canvas, voicing, chordName, ratio) {
  const w  = Math.round(_BASE_W * ratio);
  const ch = Math.round(_BASE_H * ratio);
  canvas.width  = w;
  canvas.height = ch;
  const c = canvas.getContext('2d');

  const tl = Math.round((_BASE_PAD_L + _BASE_OPEN_W) * ratio);
  const tr = Math.round((_BASE_PAD_L + _BASE_OPEN_W + _BASE_FBW) * ratio);
  const tt = Math.round(_BASE_PAD_T * ratio);
  const tb = Math.round((_BASE_PAD_T + _BASE_FBH) * ratio);
  const fw = (tr - tl) / _FRETS;
  const sh = (tb - tt) / (_STRINGS - 1);
  const ds = Math.round(sh * 0.95);
  const sc = w / _BASE_W;

  c.clearRect(0, 0, w, ch);

  // 너트
  const nutW  = Math.max(1, Math.round(9 * sc));
  const lineW = Math.max(1, 3 * sc);
  c.fillStyle = '#242729';
  c.fillRect(tl - nutW, tt - lineW / 2, nutW, (tb - tt) + lineW);

  // 프렛선
  c.strokeStyle = '#242729';
  c.lineWidth   = Math.max(1, 3 * sc);
  c.lineCap     = 'butt';
  for (let f = 0; f <= _FRETS; f++) {
    const x = tl + f * fw;
    c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
  }

  // 줄선
  for (let s = 0; s < _STRINGS; s++) {
    const y = tt + s * sh;
    c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
  }

  if (!voicing) return;

  const frets    = voicing.frets;
  const openMute = voicing.openMute || frets.map(f => f === null ? 'mute' : null);
  const barre    = voicing.barre    || {};
  const barreRange = voicing.barreRange;

  // 바레 커버 계산
  const _barreCount = {};
  frets.forEach(f => { if (f !== null && f > 0) _barreCount[f] = (_barreCount[f] || 0) + 1; });
  const coveredByBarre = new Set();
  Object.keys(_barreCount).filter(fk => _barreCount[+fk] >= 2 && barre[+fk]).forEach(fk => {
    const f = +fk;
    const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
    const minS = barreRange ? barreRange.min : Math.min(...idxs);
    const maxS = barreRange ? barreRange.max : Math.max(...idxs);
    for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
  });

  // 개방/뮤트
  openMute.forEach((v, s) => {
    if (frets[s] !== null && frets[s] > 0) return;
    if (v !== 'mute' && coveredByBarre.has(s)) return;
    const y = tt + s * sh;
    const x = tl - Math.round(_BASE_OPEN_W / 2 * sc);
    if (v === 'mute') {
      const half = ds * 0.38;
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth   = Math.round(ds * 0.18);
      c.lineCap     = 'round';
      c.beginPath(); c.moveTo(x - half, y - half); c.lineTo(x + half, y + half); c.stroke();
      c.beginPath(); c.moveTo(x + half, y - half); c.lineTo(x - half, y + half); c.stroke();
      c.restore();
    } else if (frets[s] === 0) {
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth   = Math.max(1, ds * 0.15);
      c.beginPath(); c.arc(x, y, ds * 0.45, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  });

  // 바레
  const barreFrets = [];
  Object.keys(_barreCount).filter(fk => _barreCount[+fk] >= 2).map(Number).forEach(f => {
    if (!barre[f]) return;
    const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
    const minS = barreRange ? barreRange.min : Math.min(...idxs);
    const maxS = barreRange ? barreRange.max : Math.max(...idxs);
    if (maxS <= minS) return;
    barreFrets.push(f);
    const cx   = tl + (f - 0.5) * fw;
    const topY = tt + minS * sh;
    const botY = tt + maxS * sh;
    const r    = ds / 2;
    c.save();
    c.fillStyle = '#242729';
    c.beginPath();
    c.arc(cx, topY, r, Math.PI, 0);
    c.lineTo(cx + r, botY);
    c.arc(cx, botY, r, 0, Math.PI);
    c.lineTo(cx - r, topY);
    c.closePath();
    c.fill();
    c.restore();
  });

  // 도트
  frets.forEach((f, s) => {
    if (f === null || f === 0) return;
    if (barre[f] && barreFrets.includes(f)) return;
    const cx = tl + (f - 0.5) * fw;
    const cy = tt + s * sh;
    c.save();
    c.beginPath();
    c.arc(cx, cy, ds / 2, 0, Math.PI * 2);
    c.fillStyle = '#242729';
    c.fill();
    c.restore();
  });

  // 프렛 번호 라벨 (2 이상일 때)
  const fretNum = voicing.fretNumber;
  if (fretNum >= 2) {
    const fret2X   = tl + 1.5 * fw;
    const fontH    = Math.round(ch * 28 / _BASE_H);
    const textTopY = ch * (_BASE_PAD_T + _BASE_FBH + 28) / _BASE_H;
    c.save();
    c.font         = `500 ${fontH}px "Pretendard", sans-serif`;
    c.fillStyle    = '#666';
    c.textAlign    = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText(String(fretNum), fret2X, textTopY);
    c.restore();
  }

  // 코드명 (좌상단, 에디터와 동일 위치)
  if (chordName) {
    const bSize = Math.round(48 * sc);
    const bY    = tt - Math.round(30 * sc);
    c.save();
    c.fillStyle    = '#242729';
    c.font         = `500 ${bSize}px "Pretendard", sans-serif`;
    c.textAlign    = 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(chordName, tl, bY);
    c.restore();
  }
}

// ── 오디오 엔진 (Karplus-Strong) ────────────────────────────
const _AudioCtx   = window.AudioContext || window.webkitAudioContext;
let   _audioCtx   = null;
const _audioCache = {};
const _midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

async function _renderKS(freq, duration) {
  const sr = 44100, total = Math.round(sr * duration);
  const offline = new OfflineAudioContext(1, total, sr);
  const N = Math.round(sr / freq);
  const d = new Float32Array(total), delay = new Float32Array(N);
  const decay = 1 - (0.5 / (N * 2));
  for (let i = 0; i < N; i++) delay[i] = (Math.random() * 2 - 1) * 0.5;
  for (let i = 0; i < total; i++) {
    const idx = i % N, next = (i + 1) % N;
    d[i] = delay[idx];
    delay[idx] = decay * 0.5 * (delay[idx] + delay[next]);
  }
  const buf = offline.createBuffer(1, total, sr);
  buf.getChannelData(0).set(d);
  const gain = offline.createGain();
  gain.gain.setValueAtTime(0.5, 0);
  gain.gain.exponentialRampToValueAtTime(0.001, duration);
  const src = offline.createBufferSource();
  src.buffer = buf; src.connect(gain); gain.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

async function _getKSBuffer(freq) {
  const key = freq.toFixed(2);
  if (!_audioCache[key]) _audioCache[key] = await _renderKS(freq, 2.5);
  return _audioCache[key];
}

const _QUALITY_INTERVALS = {
  'M':   [0,  7, 12, 16, 19],
  'm':   [0,  7, 12, 15, 19],
  '7':   [0,  7, 10, 16, 19],
  'M7':  [0,  7, 11, 16, 19],
  'm7':  [0,  7, 10, 15, 19],
};

// 메트로놈 클릭 (isDownbeat: 1박 = 높은 음)
function _playClick(isDownbeat) {
  if (!_audioCtx) _audioCtx = new _AudioCtx();
  const ctx  = _audioCtx;
  const play = () => {
    const now  = ctx.currentTime;
    const freq = isDownbeat ? 1200 : 800;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now);
    osc.stop(now + 0.04);
  };
  if (ctx.state === 'suspended') { ctx.resume().then(play); } else { play(); }
}

let _activeSources = [];

async function _playChord(rootKey, semitones, quality) {
  if (!_audioCtx) _audioCtx = new _AudioCtx();
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();
  _activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  _activeSources = [];

  const rootMidi  = 48 + rootKey + semitones;
  const intervals = _QUALITY_INTERVALS[quality] || _QUALITY_INTERVALS['M'];
  const midis     = intervals.map(i => rootMidi + i);
  const now       = _audioCtx.currentTime + 0.03;
  const STRUM_MS  = 0.055;

  const buffers = await Promise.all(midis.map(m => _getKSBuffer(_midiToFreq(m))));
  buffers.forEach((buf, i) => {
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(now + i * STRUM_MS);
    _activeSources.push(src);
  });
}

// ── 재생 로직 ────────────────────────────────────────────────
function _resetCountDots() {
  const wrap = document.getElementById('detail-count-dots');
  if (!wrap) return;
  wrap.querySelectorAll('.progd-count-dot').forEach(d => d.classList.remove('progd-count-dot--active'));
}

function _stopPlay() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  _activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  _activeSources = [];
  _playing    = false;
  _masterBeat = 0;
  _resetCountDots();
  _updateActiveCard(-1);
  _updatePlayBtn();
}

// 마스터 비트 타이머 — 메트로놈·점·코드 모두 단일 체인으로 처리
function _masterTick() {
  if (!_playing || !_prog) return;

  const beatMs    = (60 / _bpm) * 1000;
  const beatPhase = _masterBeat % 4;          // 0~3 (마디 내 박자 위치)
  const count     = _prog.steps.length;
  const dots      = document.querySelectorAll('#detail-count-dots .progd-count-dot');

  // 점 업데이트
  dots.forEach((d, i) => d.classList.toggle('progd-count-dot--active', i === beatPhase));

  // 메트로놈 클릭
  _playClick(beatPhase === 0);

  // 다운비트(1박): 코드 재생
  if (beatPhase === 0) {
    const chordIdx = Math.floor(_masterBeat / 4) % count;
    const step     = _prog.steps[chordIdx];
    _playChord(_key, step.semitones, step.quality);
  }

  // 3박 직후 0.5비트: 다음 코드 슬라이드 애니메이션 (7/8마디 = 3.5비트)
  if (beatPhase === 3) {
    const nextChordIdx = (Math.floor(_masterBeat / 4) + 1) % count;
    setTimeout(() => {
      if (!_playing) return;
      _updateActiveCard(nextChordIdx);
    }, beatMs * 0.5);
  }

  _masterBeat++;
  _timer = setTimeout(_masterTick, beatMs);
}

// 4비트 카운트인 후 마스터 타이머 시작
function _runCountIn(onComplete) {
  const wrap   = document.getElementById('detail-count-dots');
  const dots   = wrap ? wrap.querySelectorAll('.progd-count-dot') : [];
  const beatMs = (60 / _bpm) * 1000;
  let beat = 0;

  dots.forEach(d => d.classList.remove('progd-count-dot--active'));

  function tick() {
    if (!_playing) return;
    if (beat < 4) {
      _playClick(beat === 0);
      dots.forEach((d, i) => d.classList.toggle('progd-count-dot--active', i === beat));
      beat++;
      _timer = setTimeout(tick, beatMs);
    } else {
      _resetCountDots();
      onComplete();
    }
  }
  tick();
}

function togglePlay() {
  if (_playing) {
    _stopPlay();
  } else {
    _playing    = true;
    _masterBeat = 0;
    _updatePlayBtn();
    _runCountIn(() => _masterTick());
  }
}

function changeBpm(delta) {
  _bpm = Math.max(40, Math.min(200, _bpm + delta));
  const el = document.getElementById('detail-bpm');
  if (el) el.textContent = `${_bpm} BPM`;
}

function _updatePlayBtn() {
  const btn = document.getElementById('detail-play-btn');
  if (!btn) return;
  btn.innerHTML = _playing
    ? '<i data-lucide="square"></i>'
    : '<i data-lucide="play"></i>';
  lucide.createIcons({ nodes: [btn] });
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
function goBack() {
  _stopPlay();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'progression.html'; }, 260);
  } else {
    location.href = 'progression.html';
  }
}

// ── UI 렌더 ──────────────────────────────────────────────────
function _renderKeyStrip() {
  const strip = document.getElementById('detail-key-strip');
  if (!strip) return;
  strip.innerHTML = '';
  for (let k = 0; k < 12; k++) {
    const btn = document.createElement('button');
    btn.className = 'prog-key-btn' + (k === _key ? ' prog-key-btn--active' : '');
    btn.textContent = _getKeyDisplayName(k);
    btn.addEventListener('pointerup', () => {
      if (k === _key) return;
      _stopPlay();
      _key = k;
      _renderKeyStrip();
      _renderStage();
    });
    strip.appendChild(btn);
  }
}

let _stageRO    = null; // ResizeObserver 인스턴스
let _slotDoms   = null; // [dom0, dom1, dom2] — 고정 슬롯 DOM 요소
let _slotRoles  = null; // _slotRoles[domIdx] = 0(prev)|1(current)|2(next)
let _slotData   = null; // _slotData[domIdx] = { voicing, chordName }

// 캔버스 픽셀 크기 계산 + 드로잉
function _redrawCanvas(canvas, wrap, voicing, chordName) {
  const dpr  = window.devicePixelRatio || 1;
  const cssW = wrap.offsetWidth;
  if (!cssW) return;
  const ratio = (cssW * dpr) / _BASE_W;
  _drawVoicingCanvas(canvas, voicing, chordName, ratio);
  canvas.style.width  = cssW + 'px';
  canvas.style.height = Math.round(cssW * _BASE_H / _BASE_W) + 'px';
}

// 특정 슬롯 캔버스 업데이트
function _drawSlot(domIdx, stepIdx) {
  const count     = _prog.steps.length;
  const safeIdx   = ((stepIdx % count) + count) % count;
  const step      = _prog.steps[safeIdx];
  const chordName = _getChordName(_key, step.semitones, step.quality);
  const voicing   = _findVoicing(chordName, step.quality);
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

// 스테이지 초기화 (전체 재구성) — 4슬롯 모델
function _renderStage() {
  if (!_prog) return;
  const row = document.getElementById('detail-chord-row');
  if (!row) return;
  row.innerHTML = '';

  if (_stageRO) { _stageRO.disconnect(); _stageRO = null; }

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
  const count = _prog.steps.length;
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

  const count   = _prog.steps.length;
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

// ── DOMContentLoaded ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // URL 파라미터 파싱
  const params = new URLSearchParams(location.search);
  const progId = params.get('id');
  _key     = parseInt(params.get('key')  || '0', 10);
  _useFlat = params.get('flat') === '1';

  _prog = PROGRESSIONS.find(p => p.id === progId) || null;

  // 페이지 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // 타이틀
  const titleEl = document.getElementById('detail-title');
  if (titleEl && _prog) titleEl.textContent = _prog.name;

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
    sharpBtn.classList.toggle('prog-acc-btn--active', !useFlat);
    flatBtn .classList.toggle('prog-acc-btn--active',  useFlat);
    _stopPlay();
    _renderKeyStrip();
    _renderStage();
  }

  sharpBtn.addEventListener('pointerup', () => _setAccidental(false));
  flatBtn .addEventListener('pointerup', () => _setAccidental(true));

  if (_useFlat) _setAccidental(true);

  // 초기 렌더
  _renderKeyStrip();
  _renderStage();

  analytics.track('progression_detail_viewed', { prog_id: progId });
});
