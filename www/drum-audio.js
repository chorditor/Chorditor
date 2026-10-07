'use strict';
// ═══════════════════════════════════════════════════════════════
// drum-audio.js — 어쿠스틱 드럼 (hit마다 ToneBufferSource 생성 = 폴리포니)
// 의존: Tone.js (먼저 로드)
//   DrumAudio.hit(inst, absTime, vel)  inst: 'kick' | 'snare' | 'hat' | 'hatopen' | 'ride'
//   DrumAudio.stop() / DrumAudio.rebuild() / DrumAudio.ready() / DrumAudio.resume()
// ═══════════════════════════════════════════════════════════════

const DrumAudio = (() => {

  // MuldjordKit (FreePats판, Lars Muldjord, CC BY 4.0) — 샘플은 drum-samples.js(DRUM_SAMPLES, base64 mp3)에 내장
  // (파일 경로로 불러오면 file:// 에서 fetch가 막혀 로드가 영영 안 끝남 — guitar-samples.js와 같은 방식)

  const OPEN_HAT_GAIN = 0.7;         // 열린 하이햇 음량(1 = 원본, 0.7 ≈ -3dB)
  const OPEN_HAT_REVERB_DECAY = 2;  // 열린 하이햇 잔향 길이(초)
  const OPEN_HAT_REVERB_SEND  = 0.7; // 잔향 섞는 양(0~1)

  let _gain = null, _reverb = null, _reverbSend = null, _buffers = {}, _chains = {}, _ready = false;
  let _initToken = 0; // rebuild()로 컨텍스트가 바뀐 뒤 늦게 끝난 이전 디코딩 무시용
  let _active = [];
  let _readyResolvers = [];

  function _b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function _init() {
    if (typeof Tone === 'undefined') {
      console.error('[DrumAudio] Tone.js 없음 — 먼저 로드 필요');
      return;
    }
    _gain = new Tone.Gain(1).toDestination();
    // 음량·EQ 보정 없이 원본 그대로. 열린 하이햇만 병렬 리버브(원음은 그대로 + 센드로 잔향만 섞음)
    const openBus = new Tone.Gain(OPEN_HAT_GAIN).connect(_gain); // 원음과 잔향 센드 둘 다 이 게인을 지남
    _reverb = new Tone.Reverb({ decay: OPEN_HAT_REVERB_DECAY, wet: 1 }).connect(_gain); // wet 1 = 잔향만 출력, 섞는 양은 센드가 정함
    _reverbSend = new Tone.Gain(OPEN_HAT_REVERB_SEND).connect(_reverb);
    openBus.connect(_reverbSend);
    _chains = { kick: _gain, snare: _gain, hat: _gain, hatopen: openBus, ride: _gain };
    _ready = false;
    _buffers = {};
    const token = ++_initToken;
    const ctx = Tone.getContext();
    const samples = (typeof DRUM_SAMPLES !== 'undefined') ? DRUM_SAMPLES : {};
    // 하나가 실패해도 나머지는 쓰고 ready는 반드시 끝냄(안 그러면 백킹 재생이 시작 대기에서 영영 멈춤)
    Promise.all(Object.keys(samples).map((k) =>
      ctx.decodeAudioData(_b64ToArrayBuffer(samples[k]))
        .then((ab) => { if (token === _initToken) _buffers[k] = new Tone.ToneAudioBuffer(ab); })
        .catch((e) => console.warn('[DrumAudio] 샘플 디코딩 실패:', k, e))
    )).then(() => {
      if (token !== _initToken) return;
      _ready = true;
      const rs = _readyResolvers; _readyResolvers = [];
      rs.forEach((r) => r());
    });
  }

  function hit(inst, absTime, vel) {
    if (!_ready || !_buffers[inst]) return;
    const mv = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
    if (inst === 'hatopen' && _reverb) _reverb.wet.value = 1; // stop()이 꺼 둔 잔향 출력을 다시 켬
    const lin = (vel != null ? Math.max(0.05, vel) : 1) * mv;
    const g = new Tone.Gain(lin).connect(_chains[inst]);
    const src = new Tone.ToneBufferSource({
      url: _buffers[inst],
      fadeOut: 0.02,
      onended: () => { try { src.dispose(); g.dispose(); } catch (e) {} const i = _active.indexOf(src); if (i >= 0) _active.splice(i, 1); },
    }).connect(g);
    _active.push(src);
    try { src.start(absTime); } catch (e) {}
  }

  // 재생중/예약된 모든 드럼 즉시 정지
  function stop() {
    if (_reverb) _reverb.wet.value = 0; // 이미 울린 잔향 꼬리도 즉시 끊음(이탈 시 소리 잔여 금지)
    const list = _active; _active = [];
    list.forEach((src) => {
      // 미래 예약 source는 stop() 시 stopTime<startTime로 throw → dispose가 건너뛰어지면
      // 예약대로 발화해 다음 재생에 끼어듦. stop/dispose 분리해 dispose는 항상 실행(노드 절단).
      try { src.stop(); } catch (e) {}
      try { src.dispose(); } catch (e) {}
    });
  }

  // Tone 컨텍스트 교체(syncContext) 후 새 컨텍스트로 노드 재생성
  function rebuild() {
    stop();
    try { for (const k in _chains) if (_chains[k] !== _gain) _chains[k].dispose(); } catch (e) {}
    try { if (_reverbSend) _reverbSend.dispose(); } catch (e) {}
    try { if (_reverb) _reverb.dispose(); } catch (e) {}
    try { if (_gain) _gain.dispose(); } catch (e) {}
    try { for (const k in _buffers) _buffers[k].dispose(); } catch (e) {}
    _chains = {}; _gain = null; _reverb = null; _reverbSend = null; _buffers = {}; _ready = false;
    _init();
  }

  function ready() {
    return _ready ? Promise.resolve() : new Promise((res) => _readyResolvers.push(res));
  }
  async function resume() { if (typeof Tone !== 'undefined') await Tone.start(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return { hit, stop, rebuild, ready, resume };
})();
