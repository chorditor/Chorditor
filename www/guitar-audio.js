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

  let _sampler      = null;
  let _ringGain     = null; // 메인 샘플러 전용 게인 (컷 시 즉시 0 → 울림 전부 차단)
  let _cutSampler   = null; // 컷팅 전용 (highpass → 저역↓ 고역↑)
  let _cutFilter    = null;
  let _masterGain   = null;
  let _ready        = false;
  let _pending      = [];   // ready 전 요청 큐
  let _lastNotes    = [];   // 마지막 재생된 노트 목록
  let _releaseTimer = null; // 자동 감쇄 타이머

  const SUSTAIN_MS = 3500; // 어택 후 자동 release까지 ms — release envelope 포함 ~4초 이내 감쇄
  const STOP_FADE_SECONDS = 0.06;
  const STOP_SETTLE_MS    = 80;
  const STRUM_RETRIGGER_CUT = 0.03; // 현별 모노 재타격 시 이전 음 damp release(초)

  const _sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function _setMasterGain(value, time) {
    if (!_masterGain) return;
    const param = _masterGain.gain;
    if (param.cancelScheduledValues) param.cancelScheduledValues(time);
    if (param.setValueAtTime) param.setValueAtTime(value, time);
    else param.value = value;
  }

  function _restoreOutput() {
    if (!_masterGain || typeof Tone === 'undefined') return;
    _setMasterGain(1, Tone.now());
  }

  function _fadeOutOutput(duration) {
    if (!_masterGain || typeof Tone === 'undefined') return;
    const param = _masterGain.gain;
    const now = Tone.now();
    const current = typeof param.value === 'number' ? Math.max(param.value, 0.0001) : 1;
    if (param.cancelScheduledValues) param.cancelScheduledValues(now);
    if (param.setValueAtTime) param.setValueAtTime(current, now);
    if (param.linearRampToValueAtTime) param.linearRampToValueAtTime(0.0001, now + duration);
    else param.value = 0.0001;
  }

  function _scheduleAutoRelease() {
    if (_releaseTimer) clearTimeout(_releaseTimer);
    _releaseTimer = setTimeout(() => {
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes    = [];
      _releaseTimer = null;
    }, SUSTAIN_MS);
  }

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

    _masterGain = new Tone.Gain(1).connect(_highShelf);

    _sampler = new Tone.Sampler({
      urls,
      baseUrl: '',
      attack: 0.005,
      release: 0.08,
      onload: () => {
        _ready = true;
        _pending.forEach(fn => fn());
        _pending = [];
        _flushReady();
      },
      onerror: e => console.error('[GuitarAudio] 샘플 로드 실패', e),
    }).connect(_ringGain = new Tone.Gain(1).connect(_masterGain));

    // 컷팅 전용 버스: highpass로 저역 제거·고역 강조
    _cutFilter = new Tone.Filter({ type: 'highpass', frequency: 380, Q: 0.5 }).connect(_masterGain);
    _cutSampler = new Tone.Sampler({
      urls, baseUrl: '', attack: 0.002, release: 0.05,
    }).connect(_cutFilter);
  }

  function _run(fn) {
    if (_ready) fn();
    else _pending.push(fn);
  }

  // 샘플러 로드 완료 대기 (재생 전 스케줄 유실 방지)
  let _readyResolvers = [];
  function ready() {
    return _ready ? Promise.resolve() : new Promise(res => _readyResolvers.push(res));
  }
  function _flushReady() {
    const rs = _readyResolvers; _readyResolvers = [];
    rs.forEach(r => r());
  }

  // rootKey: 0~11 (C=0), semitones: 코드 루트 오프셋, quality: 'M'/'m'/'7' 등
  // C3(MIDI 48) 기준으로 보이싱 계산
  function playChord(rootKey, semitones, quality) {
    _run(() => {
      _restoreOutput();
      const rootMidi  = 48 + rootKey + semitones;
      const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS['M'];
      const STRUM     = 0.008;
      const notes     = intervals.map(offset => midiToName(rootMidi + offset));
      if (_releaseTimer) clearTimeout(_releaseTimer);
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = notes;
      const now0 = Tone.now();
      notes.forEach((note, i) => _sampler.triggerAttack(note, now0 + i * STRUM));
      _scheduleAutoRelease();
    });
  }

  // 코드 에디터/사전용 — MIDI 배열 직접 스트럼
  function strumNotes(midis, interval) {
    _run(() => {
      _restoreOutput();
      const notes = midis.map(midiToName);
      if (_releaseTimer) clearTimeout(_releaseTimer);
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = notes;
      const now1 = Tone.now();
      notes.forEach((note, i) => _sampler.triggerAttack(note, now1 + i * (interval ?? 0.055)));
      _scheduleAutoRelease();
    });
  }

  // 절대시간 스트럼 스케줄러 — 이전 음을 release하지 않아 음이 끊기지 않고 울림
  //   (주법 연습: 전체 비트가 하나의 연결된 아르페지오처럼 들리게 함)
  //   midis: 스트럼할 MIDI 배열, interval: 현 간 딜레이(초),
  //   absTime: Tone.now() 기준 절대 오디오 시각(초) — 드리프트 없는 정밀 스케줄용
  //   dur: 각 노트 길이(초). 지정 시 그 시간 뒤 페이드아웃(triggerAttackRelease). 미지정 시 무한 어택.
  //   releaseSec: release 엔벨로프 길이(초). 길게 주면 자연스러운 감쇄. 미지정 시 기본 유지.
  function _doStrum(sampler, midis, interval, absTime, dur, releaseSec, velRange) {
    if (!sampler) return;
    const notes = midis.map(midiToName);
    const base = interval ?? 0.015;
    const vMin = velRange ? velRange[0] : 0.45;
    const vSpan = (velRange ? velRange[1] : 1.0) - vMin;
    let acc = 0;
    notes.forEach((note, i) => {
      // humanize: 위상 comb 분산 위해 타이밍·간격·벨로시티·피치 전부 랜덤화
      const gap    = i === 0 ? 0 : base * (0.5 + Math.random());   // 현 간격 ±50% 흔듦
      acc += gap;
      const jitter = (Math.random() - 0.5) * 0.012;                // ±6ms 지터
      const vel    = vMin + Math.random() * vSpan;
      const detune = (Math.random() - 0.5) * 16;                   // ±8 cents 디튠
      const t = absTime + acc + jitter;
      // 현별 모노: 같은 현(음) 재타격 시 이전 울림 빠르게 damp → 폴리포니 스택 제거
      sampler.release = STRUM_RETRIGGER_CUT;
      sampler.triggerRelease(note, t);
      if (sampler.detune) sampler.detune.setValueAtTime(detune, t);
      // 새 음 감쇄
      if (releaseSec != null) sampler.release = releaseSec;
      if (dur != null) sampler.triggerAttackRelease(note, dur, t, vel);
      else sampler.triggerAttack(note, t, vel);
    });
    return notes;
  }

  function strumAt(midis, interval, absTime, dur, releaseSec, mode) {
    _run(() => {
      _restoreOutput();
      if (_releaseTimer) { clearTimeout(_releaseTimer); _releaseTimer = null; }
      // 컷으로 0이 된 ring gain을 이 음 시각에 복구
      if (_ringGain) _ringGain.gain.setValueAtTime(1, absTime);
      // 악센트='acc'(0.7~1.0) / 비악센트='weak'(0.4~0.72) / 그 외=원래(null=0.45~1.0)
      const velRange = mode === 'acc' ? [0.7, 1.0]
                     : mode === 'weak' ? [0.4, 0.72]
                     : null;
      const notes = _doStrum(_sampler, midis, interval, absTime, dur, releaseSec, velRange);
      if (notes) _lastNotes = _lastNotes.concat(notes);
    });
  }

  // 컷팅 스트럼 (highpass 버스 → 저역↓ 고역↑). 6현 전부 짧게 긁음.
  function strumAtCut(midis, interval, absTime, dur, releaseSec) {
    _run(() => {
      _restoreOutput();
      _doStrum(_cutSampler, midis, interval, absTime, dur, releaseSec);
    });
  }

  // 컷팅: 지정 시각에 메인 ring gain을 0으로 → 울리는 음·예약된 음 전부 즉시 차단
  function cutAt(absTime, releaseSec) {
    _run(() => {
      if (_ringGain) {
        const g = _ringGain.gain;
        g.cancelScheduledValues(absTime);
        g.setValueAtTime(0, absTime);
      }
      if (_sampler && _sampler.releaseAll) _sampler.releaseAll(absTime);
    });
  }

  // midi: MIDI 번호 (예: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
  function playNote(midi, duration, delay) {
    _run(() => {
      _restoreOutput();
      const note = midiToName(midi);
      // 이전 노트 즉시 release 후 새 노트 attack
      if (_releaseTimer) clearTimeout(_releaseTimer);
      if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
      _lastNotes = [note];
      _sampler.triggerAttack(note, Tone.now() + (delay ?? 0));
      _scheduleAutoRelease();
    });
  }

  // 즉시 전체 묵음 (잔향 없이 하드컷) — master gain 즉시 0 + 모든 보이스 release
  function panic() {
    if (_releaseTimer) { clearTimeout(_releaseTimer); _releaseTimer = null; }
    _lastNotes = [];
    _ready = false;
    // 오디오 그래프 즉시 절단 → 출력중·예약 사운드 즉시 묵음, 후 dispose + 재초기화
    try { if (_sampler)    _sampler.disconnect(); }    catch (e) {}
    try { if (_cutSampler) _cutSampler.disconnect(); } catch (e) {}
    try { if (_masterGain) _masterGain.disconnect(); } catch (e) {}
    if (_cutSampler) { _cutSampler.dispose(); _cutSampler = null; }
    if (_cutFilter)  { _cutFilter.dispose();  _cutFilter = null; }
    if (_sampler)    { _sampler.dispose();    _sampler = null; }
    if (_ringGain)   { _ringGain.dispose();   _ringGain = null; }
    if (_masterGain) { _masterGain.dispose(); _masterGain = null; }
    _init(); // 재초기화 (다음 재생 대비)
  }

  async function stop(options = {}) {
    if (_releaseTimer) { clearTimeout(_releaseTimer); _releaseTimer = null; }
    if (!_sampler || !_lastNotes.length) return;
    const fadeSeconds = options.fadeSeconds ?? STOP_FADE_SECONDS;
    _fadeOutOutput(fadeSeconds);
    _sampler.triggerRelease(_lastNotes, Tone.now());
    _lastNotes = [];
    if (options.wait) await _sleep(options.settleMs ?? STOP_SETTLE_MS);
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
    if (_cutSampler) { _cutSampler.dispose(); _cutSampler = null; }
    if (_cutFilter)  { _cutFilter.dispose();  _cutFilter = null; }
    if (_sampler) { _sampler.dispose(); _sampler = null; }
    if (_ringGain) { _ringGain.dispose(); _ringGain = null; }
    if (_masterGain) { _masterGain.dispose(); _masterGain = null; }
    _init();
  }

  return { playChord, strumNotes, strumAt, strumAtCut, cutAt, playNote, stop, panic, ready, resume, syncContext };
})();
