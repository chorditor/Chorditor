'use strict';
// ═══════════════════════════════════════════════════════════════
// drum-audio.js — 어쿠스틱 드럼 (hit마다 ToneBufferSource 생성 = 폴리포니)
// 의존: Tone.js (먼저 로드)
//   DrumAudio.hit(inst, absTime, vel)  inst: 'kick' | 'snare' | 'hat'
//   DrumAudio.stop() / DrumAudio.rebuild() / DrumAudio.ready() / DrumAudio.resume()
// ═══════════════════════════════════════════════════════════════

const DrumAudio = (() => {

  const BASE = 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/';
  const URLS = { kick: 'kick.mp3', snare: 'snare.mp3', hat: 'hihat.mp3' };
  const VOL  = { kick: -9, snare: -8, hat: -7 }; // dB

  let _gain = null, _buffers = null, _chains = {}, _ready = false;
  let _active = [];
  let _readyResolvers = [];

  function _init() {
    if (typeof Tone === 'undefined') {
      console.error('[DrumAudio] Tone.js 없음 — 먼저 로드 필요');
      return;
    }
    _gain = new Tone.Gain(0.6).toDestination();
    _chains = {
      kick:  new Tone.Filter({ type: 'lowshelf',  frequency: 90,  gain: -6 }).connect(_gain),
      snare: new Tone.Filter({ type: 'highpass',   frequency: 260, Q: 0.5 }).connect(_gain),
      hat:   _gain,
    };
    _ready = false;
    _buffers = new Tone.ToneAudioBuffers(URLS, () => {
      _ready = true;
      const rs = _readyResolvers; _readyResolvers = [];
      rs.forEach((r) => r());
    }, BASE);
  }

  function hit(inst, absTime, vel) {
    if (!_ready || !_buffers || !_buffers.has(inst)) return;
    const mv  = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
    const lin = Tone.dbToGain(VOL[inst] || 0) * (vel != null ? Math.max(0.05, vel) : 1) * mv;
    const g = new Tone.Gain(lin).connect(_chains[inst]);
    const src = new Tone.ToneBufferSource({
      url: _buffers.get(inst),
      fadeOut: 0.02,
      onended: () => { try { src.dispose(); g.dispose(); } catch (e) {} const i = _active.indexOf(src); if (i >= 0) _active.splice(i, 1); },
    }).connect(g);
    _active.push(src);
    try { src.start(absTime); } catch (e) {}
  }

  // 재생중/예약된 모든 드럼 즉시 정지
  function stop() {
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
    try { if (_gain) _gain.dispose(); } catch (e) {}
    try { if (_buffers) _buffers.dispose(); } catch (e) {}
    _chains = {}; _gain = null; _buffers = null; _ready = false;
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
