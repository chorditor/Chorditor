// ═══════════════════════════════════════════════════════════════
// progression.js — 코드 진행 리스트 페이지
// ═══════════════════════════════════════════════════════════════

// ── 코드 진행 데이터 ─────────────────────────────────────────
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

// ── 키 상수 ─────────────────────────────────────────────────
const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const USE_FLAT_KEY    = new Set([1, 3, 6, 8, 10]); // Db Eb Gb Ab Bb

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

function _getChordName(rootKey, semitones, quality) {
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const noteIdx = (rootKey + semitones + 12) % 12;
  const note    = names[noteIdx];
  const sfx     = { M: '', m: 'm', '7': '7', M7: 'M7', m7: 'm7', dim: 'dim', dim7: 'dim7', aug: 'aug' };
  return note + (sfx[quality] ?? '');
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

// 코드 보이싱 인터벌 (semitone offsets from root)
const QUALITY_INTERVALS = {
  'M':    [0,  7, 12, 16, 19],
  'm':    [0,  7, 12, 15, 19],
  '7':    [0,  7, 10, 16, 19],
  'M7':   [0,  7, 11, 16, 19],
  'm7':   [0,  7, 10, 15, 19],
  'dim':  [0,  6, 12, 15, 18],
  'dim7': [0,  6,  9, 12, 15],
  'aug':  [0,  8, 12, 16, 20],
};

let _activeSources = [];

async function _playChord(rootKey, semitones, quality) {
  if (!_audioCtx) _audioCtx = new _AudioCtx();
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();
  _activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  _activeSources = [];

  const rootMidi  = 48 + rootKey + semitones; // C3(48) 기준
  const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS['M'];
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

// ── 상태 ────────────────────────────────────────────────────
let _currentKey = 0;
let _useFlat    = false;
let _playingId  = null;
let _playStep   = 0;
let _playTimer  = null;

// ── 재생/정지 ───────────────────────────────────────────────
function _stopPlay() {
  if (_playTimer) { clearTimeout(_playTimer); _playTimer = null; }
  if (_playingId) {
    const card = document.querySelector(`.prog-card[data-id="${_playingId}"]`);
    if (card) {
      card.querySelectorAll('.prog-chord-cell').forEach(c => c.classList.remove('prog-chord-cell--playing'));
      const btn = card.querySelector('.prog-play-btn');
      if (btn) { btn.innerHTML = '<i data-lucide="chevron-right"></i>'; lucide.createIcons({ nodes: [btn] }); }
    }
  }
  _playingId = null;
  _playStep  = 0;
  _activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  _activeSources = [];
}

function _startPlay(progId) {
  if (_playingId === progId) { _stopPlay(); return; }
  _stopPlay();

  const prog = PROGRESSIONS.find(p => p.id === progId);
  if (!prog) return;

  _playingId = progId;
  _playStep  = 0;

  const card = document.querySelector(`.prog-card[data-id="${progId}"]`);
  const btn  = card?.querySelector('.prog-play-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="square"></i>'; lucide.createIcons({ nodes: [btn] }); }

  analytics.track('progression_played', {
    prog_id: progId,
    key:     _getKeyDisplayName(_currentKey),
  });

  function tick() {
    const cells = card?.querySelectorAll('.prog-chord-cell');
    if (cells) {
      cells.forEach(c => c.classList.remove('prog-chord-cell--playing'));
      const activeCell = cells[_playStep % prog.steps.length];
      if (activeCell) activeCell.classList.add('prog-chord-cell--playing');
    }

    const step = prog.steps[_playStep % prog.steps.length];
    _playChord(_currentKey, step.semitones, step.quality);

    _playStep++;
    const msPerChord = (60000 / 80) * 2; // 2박자 per chord (BPM 고정 80 — 연습실로 이식 예정)
    _playTimer = setTimeout(tick, msPerChord);
  }
  tick();
}

// ── UI 렌더 ──────────────────────────────────────────────────
function _renderKeyStrip() {
  const strip = document.getElementById('prog-key-strip');
  if (!strip) return;
  strip.innerHTML = '';
  for (let k = 0; k < 12; k++) {
    const btn = document.createElement('button');
    btn.className = 'prog-key-btn' + (k === _currentKey ? ' prog-key-btn--active' : '');
    btn.textContent = _getKeyDisplayName(k);
    btn.addEventListener('pointerup', () => {
      if (k === _currentKey) return;
      _stopPlay();
      _currentKey = k;
      _renderKeyStrip();
      _renderProgList();
    });
    strip.appendChild(btn);
  }
}

function _renderProgList() {
  const list = document.getElementById('prog-list');
  if (!list) return;
  list.innerHTML = '';

  PROGRESSIONS.forEach(prog => {
    const card = document.createElement('div');
    card.className = 'prog-card';
    card.dataset.id = prog.id;

    const chordCells = prog.steps.map(step => {
      const name = _getChordName(_currentKey, step.semitones, step.quality);
      return `<div class="prog-chord-cell">
        <span class="prog-chord-name">${name}</span>
      </div>`;
    }).join('');

    card.innerHTML = `
      <div class="prog-card-header">
        <span class="prog-card-name">${prog.name}</span>
        ${prog.keys?.length ? `<span class="prog-key-label">추천 key</span>` + prog.keys.map(k => `<span class="prog-key-tag">${k}</span>`).join('') : ''}
      </div>
      <div class="prog-card-body">
        <div class="prog-chord-row">${chordCells}</div>
        <button class="prog-play-btn"><i data-lucide="chevron-right"></i></button>
      </div>`;

    card.querySelector('.prog-play-btn').addEventListener('pointerup', () => {
      location.href = `progression-detail.html?id=${encodeURIComponent(prog.id)}&key=${_currentKey}&flat=${_useFlat ? 1 : 0}`;
    });
    list.appendChild(card);
  });

  lucide.createIcons();
}

// ── 닫기 ────────────────────────────────────────────────────
function closeProgressionPage() {
  _stopPlay();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// ── DOMContentLoaded ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  _renderKeyStrip();
  _renderProgList();

  // 샵/플랫 토글
  const sharpBtn = document.getElementById('acc-sharp');
  const flatBtn  = document.getElementById('acc-flat');

  function _setAccidental(useFlat) {
    _useFlat = useFlat;
    sharpBtn.classList.toggle('prog-acc-btn--active', !useFlat);
    flatBtn .classList.toggle('prog-acc-btn--active',  useFlat);
    _stopPlay();
    _renderKeyStrip();
    _renderProgList();
  }

  sharpBtn.addEventListener('pointerup', () => _setAccidental(false));
  flatBtn .addEventListener('pointerup', () => _setAccidental(true));

  analytics.track('progression_page_viewed', {});
});
