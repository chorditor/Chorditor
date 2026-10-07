'use strict';
// ═══════════════════════════════════════════════════════════════
// guitar-audio.js — Tone.js Sampler 공용 오디오 모듈
// 의존: Tone.js (먼저 로드), E2/A2/D3/E4.mp3 샘플 파일
// ═══════════════════════════════════════════════════════════════

const GuitarAudio = (() => {

  // 스트로크 간격 상수 — 연주용(빠름, 노트/코드진행/퀴즈 등)과 샘플용(느림, 보이싱을
  // 하나하나 들려줘야 하는 상황 — 데일리미션 튜토리얼 등)을 명확히 구분
  const STRUM_INTERVAL_SAMPLE = 0.035;

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
  let _outGain      = null; // 컴프레서 뒤 최종 출력 게인 — 설정>사운드 마스터 볼륨 적용(압축에 안 먹힘)
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
    // 설정>사운드 마스터 볼륨 — 컴프레서 뒤 최종단에서 적용(압축이 감소분 안 먹게)
    if (_outGain) {
      const mv = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
      _outGain.gain.value = mv;
    }
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
    }).connect(_outGain = new Tone.Gain(1).toDestination());

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
    _fxIn = _highShelf;
    _initTap(urls); // dot 탭 전용 버스(+샘플 버퍼) — _masterGain을 거치지 않고 같은 EQ·컴프레서로 들어감

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

  // ── 지판 dot 탭 전용 재생 경로 (2026-10-06) ──────────────────────────────
  // 목표: ① 누르는 즉시, 이전 상황과 무관하게 그 음이 바로 남 ② 줄별 단음(같은 줄의 새 음이 이전 음을 끊음) + 다른 줄끼리는 동시에 울림(실제 기타와 동일).
  // 메인 샘플러(_sampler)·_lastNotes·_masterGain과 상태를 전혀 공유하지 않음 — 공유하면 stop()의 페이드 예약·release와 서로 취소/덮어써서 소리가 씹힘.
  //   · 음마다 자기 소스(Tone.ToneBufferSource)를 만들어 EQ·컴프레서 체인 입구(_fxIn)에 직접 연결(_masterGain 우회 → stop() 페이드의 영향 없음)
  //   · 시각은 Tone.immediate()(오디오 시계 현재) — Tone.now()의 lookAhead(기본 0.1s) 지연 없음
  //   · 샘플 로딩 전에 누른 탭은 버림(뒤늦게 울리면 더 어긋남)
  // stop()/panic()/화면 이탈 시에는 이 경로의 울림도 같이 끊음.
  const TAP_RETRIGGER_FADE = 0.03; // 같은 줄 재타격 시 이전 음 감쇄(초) — STRUM_RETRIGGER_CUT과 동일 개념
  const TAP_RELEASE_FADE   = 0.08; // 자동 감쇄·stop() 시 release(초) — 메인 샘플러 release와 동일
  let _fxIn         = null;        // EQ·컴프레서 체인 입구(_init에서 설정)
  let _tapBus       = null;
  let _tapBufferSet = null;        // Tone.ToneAudioBuffers — panic() 재초기화에도 유지(다시 디코드하지 않음)
  let _tapSamples   = [];          // [{ midi, buf }] 샘플 원음 높이 + 버퍼
  let _tapReady     = false;
  const _tapVoices  = new Map();   // voiceKey(줄 번호) → { src, timer }

  function _initTap(urls) {
    if (!_fxIn) return;
    _tapBus = new Tone.Gain(1).connect(_fxIn);
    if (_tapBufferSet) return;
    _tapReady = false;
    const set = _tapBufferSet = new Tone.ToneAudioBuffers({
      urls, baseUrl: '',
      onload: () => {
        if (set !== _tapBufferSet) return; // 로딩 도중 컨텍스트 교체로 폐기된 세트
        _tapSamples = Object.keys(urls).map(name => ({ midi: Tone.Frequency(name).toMidi(), buf: set.get(name) }));
        _tapReady = _tapSamples.length > 0;
      },
    });
  }

  function _tapEndVoice(voice, t, fade) {
    clearTimeout(voice.timer);
    try { voice.src.fadeOut = fade; voice.src.stop(t); } catch (e) {} // 이미 끝난 소스면 무시
  }

  // 탭 경로의 모든 울림을 fade(초) 동안 끊음
  function _tapStopAll(fade) {
    if (!_tapVoices.size || typeof Tone === 'undefined') return;
    const t = Tone.immediate();
    _tapVoices.forEach(v => _tapEndVoice(v, t, fade));
    _tapVoices.clear();
  }

  // 탭 경로 하드컷 + 버스 폐기(panic·컨텍스트 교체용 — 이후 _init이 버스를 새로 만듦)
  function _tapDispose() {
    _tapVoices.forEach(v => clearTimeout(v.timer));
    _tapVoices.clear();
    if (_tapBus) { try { _tapBus.disconnect(); _tapBus.dispose(); } catch (e) {} _tapBus = null; }
  }

  // voiceKey: 줄 번호(같은 키의 이전 음을 끊음), midi: MIDI 번호, velocity: 0~1(기본 1)
  function tapNote(voiceKey, midi, velocity) {
    if (typeof Tone === 'undefined' || !_tapReady || !_tapBus) return;
    if (Tone.getContext().state !== 'running') { try { Tone.start(); } catch (e) {} } // 브라우저에서 오디오가 잠들어 있으면 깨움(앱은 해당 없음)
    if (_outGain) _outGain.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1; // 설정>사운드 마스터 볼륨
    const t = Tone.immediate();

    const prev = _tapVoices.get(voiceKey);
    if (prev) { _tapVoices.delete(voiceKey); _tapEndVoice(prev, t, TAP_RETRIGGER_FADE); }

    // 가장 가까운 샘플을 골라 재생 속도로 음높이를 맞춤(Tone.Sampler와 같은 방식)
    let base = _tapSamples[0];
    for (const smp of _tapSamples) if (Math.abs(midi - smp.midi) < Math.abs(midi - base.midi)) base = smp;
    const src = new Tone.ToneBufferSource({
      url: base.buf,
      playbackRate: Math.pow(2, (midi - base.midi) / 12),
      fadeIn: 0.005,
      fadeOut: TAP_RELEASE_FADE,
    }).connect(_tapBus);
    src.onended = () => {}; // 빈 함수라도 지정해야 Tone이 끝난 소스를 자동으로 dispose함
    src.start(t, 0, undefined, velocity ?? 1);

    const voice = { key: voiceKey, src, timer: null };
    voice.timer = setTimeout(() => { // 메인 샘플러와 같은 SUSTAIN_MS 뒤 자동 감쇄
      if (_tapVoices.get(voiceKey) === voice) _tapVoices.delete(voiceKey);
      _tapEndVoice(voice, Tone.immediate(), TAP_RELEASE_FADE);
    }, SUSTAIN_MS);
    _tapVoices.set(voiceKey, voice);
    return voice; // 렛링 OFF(누르는 동안만 울림)에서 손가락을 뗄 때 이 음만 끊기 위한 핸들
  }

  // tapNote가 돌려준 음 하나를 짧은 페이드로 끊음 — 그 사이 같은 줄을 다시 쳐서 이미 끊겼거나 다른 음으로 바뀌었으면 건드리지 않음.
  function tapRelease(voice) {
    if (!voice || typeof Tone === 'undefined') return;
    if (_tapVoices.get(voice.key) === voice) _tapVoices.delete(voice.key);
    _tapEndVoice(voice, Tone.immediate(), TAP_RELEASE_FADE);
  }

  // 화면을 떠나면(앱 전환·홈 버튼·페이지 이동) 탭으로 울리던 음을 즉시 끊음
  document.addEventListener('visibilitychange', () => { if (document.hidden) _tapStopAll(0.01); });
  window.addEventListener('pagehide', () => _tapStopAll(0.01));

  // 즉시 전체 묵음 (잔향 없이 하드컷) — master gain 즉시 0 + 모든 보이스 release
  function panic() {
    if (_releaseTimer) { clearTimeout(_releaseTimer); _releaseTimer = null; }
    _lastNotes = [];
    _ready = false;
    // 오디오 그래프 즉시 절단 → 출력중·예약 사운드 즉시 묵음, 후 dispose + 재초기화
    try { if (_sampler)    _sampler.disconnect(); }    catch (e) {}
    try { if (_cutSampler) _cutSampler.disconnect(); } catch (e) {}
    try { if (_masterGain) _masterGain.disconnect(); } catch (e) {}
    _tapDispose(); // dot 탭 경로도 즉시 절단(_init이 버스를 다시 만듦)
    if (_cutSampler) { _cutSampler.dispose(); _cutSampler = null; }
    if (_cutFilter)  { _cutFilter.dispose();  _cutFilter = null; }
    if (_sampler)    { _sampler.dispose();    _sampler = null; }
    if (_ringGain)   { _ringGain.dispose();   _ringGain = null; }
    if (_masterGain) { _masterGain.dispose(); _masterGain = null; }
    if (_outGain)    { _outGain.dispose();    _outGain = null; }
    _init(); // 재초기화 (다음 재생 대비)
  }

  async function stop(options = {}) {
    if (_releaseTimer) { clearTimeout(_releaseTimer); _releaseTimer = null; }
    const fadeSeconds = options.fadeSeconds ?? STOP_FADE_SECONDS;
    _tapStopAll(fadeSeconds); // dot 탭으로 울리던 음도 같이 끊음
    if (!_sampler || !_lastNotes.length) return;
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

  // 설정>사운드 슬라이더 실시간 조절용 — 재생 중인 소리에 즉시 반영(컴프레서 뒤 최종단)
  function setOutputVolume(v) {
    if (!_outGain) return;
    const mv = Math.max(0, Math.min(1, (typeof v === 'number' ? v : 1)));
    _outGain.gain.value = mv;
  }

  // 외부 AudioContext와 동기화 (메트로놈 등) — lookAhead 0으로 지연 제거
  async function syncContext(externalCtx) {
    if (!externalCtx || typeof Tone === 'undefined') return;
    const toneCtx = new Tone.Context({ context: externalCtx, lookAhead: 0 });
    Tone.setContext(toneCtx);
    await Tone.start();
    // 샘플러 재생성
    _ready = false;
    _tapDispose();
    _tapBufferSet = null; _tapSamples = []; _tapReady = false;
    if (_cutSampler) { _cutSampler.dispose(); _cutSampler = null; }
    if (_cutFilter)  { _cutFilter.dispose();  _cutFilter = null; }
    if (_sampler) { _sampler.dispose(); _sampler = null; }
    if (_ringGain) { _ringGain.dispose(); _ringGain = null; }
    if (_masterGain) { _masterGain.dispose(); _masterGain = null; }
    if (_outGain)  { _outGain.dispose();  _outGain = null; }
    if (_pianoSynth) { _pianoSynth.dispose(); _pianoSynth = null; }
    if (_pianoGain)  { _pianoGain.dispose();  _pianoGain = null; }
    _init();
  }

  // ── 피아노 코드 백킹 (스케일 튜토리얼 코드진행 시연 전용, 2026-09-30) ──
  // FluidR3_GM 사운드폰트(gleitz/midi-js-soundfonts) 실사용 — Salamander(콘서트그랜드 녹음)는 너무
  // 고급진 톤이라 반려, 순수 신스 합성은 가짜같다고 반려됨. FluidR3_GM은 범용 GM 사운드폰트라
  // Salamander보다 훨씬 평범한 "디지털 키보드" 톤(2026-09-30, 사용자 확정).
  let _pianoSynth   = null;
  let _pianoGain    = null;
  let _pianoReady   = false;
  let _pianoPending = [];
  let _pianoGen     = 0; // resetPiano() 후 이전 샘플러의 늦은 onload가 새 상태를 덮어쓰지 않게
  function _initPiano() {
    if (_pianoSynth || typeof Tone === 'undefined') return;
    const gen = ++_pianoGen;
    _pianoGain = new Tone.Gain(0.6).toDestination();
    _pianoSynth = new Tone.Sampler({
      // 이 사운드폰트는 흰건반(자연음)만 샘플로 제공함(2026-09-30 확인, #/b 샘플 전부 404) —
      // 자연음만 앵커로 주면 Sampler가 나머지(#/b)는 가장 가까운 샘플을 자동 피치시프트해서 재생.
      urls: {
        C3: 'C3.mp3', D3: 'D3.mp3', E3: 'E3.mp3', F3: 'F3.mp3', G3: 'G3.mp3', A3: 'A3.mp3', B3: 'B3.mp3',
        C4: 'C4.mp3', D4: 'D4.mp3', E4: 'E4.mp3', F4: 'F4.mp3', G4: 'G4.mp3', A4: 'A4.mp3',
      },
      baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/', // jsdelivr @gh-pages 버전태그의 '@'이 어딘가에서 encodeURIComponent(%40)되며 400 발생 — GitHub Pages 원본 직결로 우회(2026-09-30)
      release: 1,
      onload: () => {
        if (gen !== _pianoGen) return;
        _pianoReady = true;
        _pianoPending.forEach(fn => fn());
        _pianoPending = [];
      },
    }).connect(_pianoGain);
  }
  // midis: MIDI 배열(코드 구성음), duration: 초(triggerAttackRelease 지속시간)
  // time: 절대 오디오 시각(초, 미지정 시 지금) — 백킹 트랙처럼 미리 예약할 때 사용. velocity: 0~1(미지정 시 Tone 기본)
  function playPianoChord(midis, duration, time, velocity) {
    if (typeof Tone === 'undefined') return;
    _initPiano();
    const run = () => _pianoSynth.triggerAttackRelease(midis.map(midiToName), duration ?? 1.5, time ?? Tone.now(), velocity);
    if (_pianoReady) run(); else _pianoPending.push(run);
  }
  // ── 베이스 기타 (백킹 트랙 전용) — 피아노와 같은 FluidR3_GM 서버의 핑거 일렉베이스 ──
  let _bassSynth   = null;
  let _bassGain    = null;
  let _bassReady   = false;
  let _bassPending = [];
  let _bassGen     = 0;
  function _initBass() {
    if (_bassSynth || typeof Tone === 'undefined') return;
    const gen = ++_bassGen;
    _bassGain = new Tone.Gain(1.0).toDestination();
    _bassSynth = new Tone.Sampler({
      urls: { E1: 'E1.mp3', A1: 'A1.mp3', C2: 'C2.mp3', E2: 'E2.mp3', G2: 'G2.mp3' }, // 나머지 음은 Sampler가 가까운 샘플을 피치시프트
      baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3/',
      release: 0.3,
      onload: () => {
        if (gen !== _bassGen) return;
        _bassReady = true;
        _bassPending.forEach(fn => fn());
        _bassPending = [];
      },
    }).connect(_bassGain);
  }
  // midi: 한 음, duration: 초, time: 절대 오디오 시각(미리 예약), velocity: 0~1
  // gain: 이 음의 음량 배율(기본 1, 1 초과 가능 — 강세용). velocity는 1을 못 넘으므로 출력 게인을 이 음 시작 시각에 맞춰 바꿈(다음 음에서 다시 덮어씀)
  function playBassNote(midi, duration, time, velocity, gain) {
    if (typeof Tone === 'undefined') return;
    _initBass();
    const run = () => {
      const t = time ?? Tone.now();
      if (_bassGain) _bassGain.gain.setValueAtTime(gain ?? 1, t);
      _bassSynth.triggerAttackRelease(midiToName(midi), duration ?? 1, t, velocity);
    };
    if (_bassReady) run(); else _bassPending.push(run);
  }
  function bassReady() {
    if (typeof Tone === 'undefined') return Promise.resolve();
    _initBass();
    return _bassReady ? Promise.resolve() : new Promise(res => _bassPending.push(res));
  }
  // 즉각 무음 + 초기화 (resetPiano와 동일 방식)
  function resetBass() {
    _bassGen++;
    if (_bassSynth) { try { _bassSynth.dispose(); } catch (e) {} _bassSynth = null; }
    if (_bassGain)  { try { _bassGain.dispose();  } catch (e) {} _bassGain  = null; }
    _bassReady = false;
    _bassPending = [];
    _initBass();
  }
  // 피아노 샘플 로드 완료 시 resolve — 예약 재생(백킹 트랙)은 로딩 끝난 뒤에 시작해야 시각이 어긋나지 않음
  function pianoReady() {
    if (typeof Tone === 'undefined') return Promise.resolve();
    _initPiano();
    return _pianoReady ? Promise.resolve() : new Promise(res => _pianoPending.push(res));
  }
  function stopPiano() {
    if (_pianoSynth) _pianoSynth.releaseAll();
  }
  // 즉각 무음 + 초기화 — releaseAll은 release(1s) 꼬리와 미리 예약된 코드가 남아서, 샘플러를 통째로 폐기하고
  // 새로 만듦(샘플은 브라우저 캐시라 재로딩 빠름). 백킹 트랙 정지용.
  function resetPiano() {
    _pianoGen++;
    if (_pianoSynth) { try { _pianoSynth.dispose(); } catch (e) {} _pianoSynth = null; }
    if (_pianoGain)  { try { _pianoGain.dispose();  } catch (e) {} _pianoGain  = null; }
    _pianoReady = false;
    _pianoPending = [];
    _initPiano(); // 다음 재생 대비 미리 로드
  }
  // 짧은 페이드로 끄고(기본 60ms, 기타 stop()과 동일) 샘플러를 폐기·재초기화 — 정상 진행 중 소리를 끊을 때
  // (resetPiano는 하드컷이라 뚝 끊김, stopPiano는 release 1s 꼬리가 남음). 페이드 도중 resetPiano가 따로 불리면 gen이 달라 건너뜀.
  function fadeOutPiano(seconds = 0.06) {
    if (!_pianoSynth || !_pianoGain) return;
    const gen = _pianoGen;
    try { _pianoGain.gain.rampTo(0, seconds); } catch (e) {}
    setTimeout(() => { if (gen === _pianoGen) resetPiano(); }, seconds * 1000 + 20);
  }
  // CDN 샘플 로딩을 미리 시작 — playPianoChord() 첫 호출 시점에 로딩 지연으로 백킹이
  // 늦게 울리는 문제 방지(호출부에서 데모 시작 전 미리 불러둠)
  function warmupPiano() {
    if (typeof Tone === 'undefined') return;
    _initPiano();
  }

  return { playChord, strumNotes, strumAt, strumAtCut, cutAt, playNote, tapNote, tapRelease, stop, panic, ready, resume, syncContext, setOutputVolume, STRUM_INTERVAL_SAMPLE, playPianoChord, pianoReady, stopPiano, resetPiano, fadeOutPiano, warmupPiano, playBassNote, bassReady, resetBass };
})();
