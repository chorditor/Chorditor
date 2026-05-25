'use strict';
// ═══════════════════════════════════════════════════════════════
// guitar-audio.js — Tone.js Sampler 공용 오디오 모듈
// 의존: Tone.js (먼저 로드), E2/A2/D3/E4.mp3 샘플 파일
// ═══════════════════════════════════════════════════════════════

const GuitarAudio = (() => {

  // 코드 보이싱 인터벌 (root MIDI 기준 반음 오프셋)
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

  // Base64 → Blob URL 변환 (CORS 없이 로컬 파일 로드)
  function _base64ToUrl(b64) {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  }

  function _buildSampleUrls() {
    if (typeof GUITAR_SAMPLES === 'undefined') {
      console.error('[GuitarAudio] GUITAR_SAMPLES 없음 — guitar-samples.js 먼저 로드 필요');
      return null;
    }
    const urls = {};
    for (const [note, b64] of Object.entries(GUITAR_SAMPLES)) {
      urls[note] = _base64ToUrl(b64);
    }
    return urls;
  }

  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const midiToName = midi => NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);

  let _sampler   = null;
  let _ready     = false;
  let _pending    = [];   // ready 전 요청 큐
  let _lastNotes  = [];   // 마지막 재생된 노트 목록

  function _init() {
    if (typeof Tone === 'undefined') {
      console.error('[GuitarAudio] Tone.js 없음 — guitar-audio.js보다 먼저 로드 필요');
      return;
    }
    const urls = _buildSampleUrls();
    if (!urls) return;
    const _compressor = new Tone.Compressor({
      threshold: -24,
      ratio:      6,
      attack:     0.02,
      release:    0.1,
    }).toDestination();

    // 500Hz 이하 -3dB
    const _lowShelf = new Tone.Filter({
      type:      'lowshelf',
      frequency:  500,
      gain:      -9,
    }).connect(_compressor);

    // 5000Hz 이상 +1.5dB
    const _highShelf = new Tone.Filter({
      type:      'highshelf',
      frequency:  5000,
      gain:       1.5,
    }).connect(_lowShelf);

    _sampler = new Tone.Sampler({
      urls,
      baseUrl: '',
      onload: () => {
        _ready = true;
        _pending.forEach(fn => fn());
        _pending = [];
      },
      onerror: e => console.error('[GuitarAudio] 샘플 로드 실패', e),
    }).connect(_highShelf);
  }

  function _run(fn) {
    if (_ready) fn();
    else _pending.push(fn);
  }

  // rootKey: 0~11 (C=0), semitones: 코드 루트 오프셋, quality: 'M'/'m'/'7' 등
  // C3(MIDI 48) 기준으로 보이싱 계산
  function playChord(rootKey, semitones, quality) {
    _run(() => {
      const rootMidi  = 48 + rootKey + semitones;
      const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS['M'];
      const STRUM     = 0.008;
      const notes     = intervals.map(offset => midiToName(rootMidi + offset));
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = notes;
      notes.forEach((note, i) => _sampler.triggerAttack(note, Tone.now() + i * STRUM));
    });
  }

  // 코드 에디터/사전용 — MIDI 배열 직접 스트럼
  function strumNotes(midis, interval) {
    _run(() => {
      const notes = midis.map(midiToName);
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = notes;
      notes.forEach((note, i) => _sampler.triggerAttack(note, Tone.now() + i * (interval ?? 0.055)));
    });
  }

  // midi: MIDI 번호 (예: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
  function playNote(midi, duration, delay) {
    _run(() => {
      const note = midiToName(midi);
      // 이전 노트 즉시 release 후 새 노트 attack
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = [note];
      _sampler.triggerAttack(note, Tone.now() + (delay ?? 0));
    });
  }

  function stop() {
    if (!_sampler || !_lastNotes.length) return;
    _sampler.triggerRelease(_lastNotes, Tone.now());
    _lastNotes = [];
  }

  // Tone.js 로드 완료 후 자동 초기화 (외부 스크립트 onload 이후 실행됨)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  async function resume() { await Tone.start(); }

  // 외부 AudioContext와 동기화 (메트로놈 등) — lookAhead 0으로 지연 제거
  async function syncContext(externalCtx) {
    if (!externalCtx || typeof Tone === 'undefined') return;
    const toneCtx = new Tone.Context({ context: externalCtx, lookAhead: 0 });
    Tone.setContext(toneCtx);
    await Tone.start();
    // 샘플러 재생성
    _ready = false;
    if (_sampler) { _sampler.dispose(); _sampler = null; }
    _init();
  }

  return { playChord, strumNotes, playNote, stop, resume, syncContext };
})();
