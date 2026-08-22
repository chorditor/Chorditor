// ── 메트로놈 페이지 ──────────────────────────────────────

const BEAT_MODE_CYCLE = { normal: 'accent', accent: 'mute', mute: 'normal' };

function cycleBeatDotMode(dotEl) {
  const next = BEAT_MODE_CYCLE[dotEl.dataset.mode] || 'normal';
  dotEl.dataset.mode = next;
  dotEl.classList.remove('beat-dot--normal', 'beat-dot--accent', 'beat-dot--mute');
  dotEl.classList.add(`beat-dot--${next}`);
  dotEl.innerHTML = next === 'mute' ? '<i data-lucide="volume-x"></i>' : '';
  if (next === 'mute') lucide.createIcons();
}

// ── 박자 수 (3~6) ────────────────────────────────────────────
const METRO_BEATCOUNT_MIN = 3;
const METRO_BEATCOUNT_MAX = 6;
let _metroBeatCount = 4;

function _metroCreateBeatDot(index, mode) {
  const dot = document.createElement('div');
  dot.className = `beat-dot beat-dot--${mode}`;
  dot.dataset.beat = String(index + 1);
  dot.dataset.mode = mode;
  if (mode === 'mute') dot.innerHTML = '<i data-lucide="volume-x"></i>';
  dot.addEventListener('pointerup', () => cycleBeatDotMode(dot));
  return dot;
}

function _metroRenderBeatDots() {
  const wrap = document.getElementById('metronome-beat-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < _metroBeatCount; i++) {
    wrap.appendChild(_metroCreateBeatDot(i, i === 0 ? 'accent' : 'normal'));
  }
  lucide.createIcons();
}

let _metroPendingBeatCount = null; // 재생 중엔 즉시 안 바꾸고 마디 경계에서 안전하게 반영

function metronomeSetBeatCount(n) {
  if (typeof _playTap === 'function') _playTap();
  const clamped = Math.max(METRO_BEATCOUNT_MIN, Math.min(METRO_BEATCOUNT_MAX, n));
  const valueEl = document.getElementById('metronome-beatcount-value');
  if (valueEl) valueEl.textContent = clamped;
  _metroRenderOptionMenuActive('beatcount');
  closeMetronomeOptionMenu();

  if (_metroPlaying) {
    // 재생 중엔 인디케이터(dot) DOM을 지금 당장 바꾸면 이미 예약된 오디오/화면효과가
    // 옛 dot을 참조하다 어긋난다 — 다음 마디 경계(_metroScheduler)에서 한 번에 안전하게 반영
    _metroPendingBeatCount = clamped;
  } else {
    _metroBeatCount = clamped;
    _metroBeatIndex = 0;
    _metroBeatsSinceCycleStart = 0;
    _metroRenderBeatDots();
  }
}

// ── 백킹 사운드 프리셋 ────────────────────────────────────────
const METRO_BACKING_OPTIONS = [
  { id: 'click', label: '메트로놈' },
  { id: 'drum', label: '드럼1' },
];
let _metroBacking = 'click';

function metronomeSetBacking(type) {
  if (typeof _playTap === 'function') _playTap();
  _metroBacking = type;
  const opt = METRO_BACKING_OPTIONS.find(o => o.id === type);
  const valueEl = document.getElementById('metronome-backing-value');
  if (valueEl && opt) valueEl.textContent = opt.label;
  _metroRenderOptionMenuActive('backing');
  closeMetronomeOptionMenu();
}

// ── 점진가속: 사이클당 BPM 증가폭 / 몇 사이클마다 ─────────────
const METRO_RAMPCYCLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const METRO_RAMPINC_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let _metroRampCycle = 2;
let _metroRampInc = 2;

function metronomeSetRampCycle(n) {
  if (typeof _playTap === 'function') _playTap();
  _metroRampCycle = n;
  const valueEl = document.getElementById('metronome-rampcycle-value');
  if (valueEl) valueEl.textContent = n;
  _metroRenderOptionMenuActive('rampcycle');
  closeMetronomeOptionMenu();
}

function metronomeSetRampInc(n) {
  if (typeof _playTap === 'function') _playTap();
  _metroRampInc = n;
  const valueEl = document.getElementById('metronome-rampinc-value');
  if (valueEl) valueEl.textContent = `+${n}`;
  _metroRenderOptionMenuActive('rampinc');
  closeMetronomeOptionMenu();
}

// 드럼1 — 박자 수별 직접 지정 패턴 (하이햇은 8분음표 단위, 6박=6/8은 예외로 세분 없음)
const METRO_DRUM1_PATTERNS = {
  3: { stepsPerBeat: 2, kick: [0], snare: [4], hat: [0, 1, 2, 3, 4, 5] },
  4: { stepsPerBeat: 2, kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
  5: { stepsPerBeat: 2, kick: [0, 6], snare: [3, 8], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  6: { stepsPerBeat: 1, kick: [0], snare: [3], hat: [0, 1, 2, 3, 4, 5] },
};

function _metroPlayDrumStep(patt, stepIndex, t) {
  if (typeof DrumAudio === 'undefined') return;
  if (patt.kick.includes(stepIndex)) DrumAudio.hit('kick', t);
  if (patt.snare.includes(stepIndex)) DrumAudio.hit('snare', t);
  if (patt.hat.includes(stepIndex)) DrumAudio.hit('hat', t, 0.6);
}

// ── 옵션 카드 드롭업 메뉴 ────────────────────────────────────
function _metroRenderOptionMenu(kind) {
  const menu = document.getElementById(`metronome-${kind}-menu`);
  if (!menu) return;
  menu.innerHTML = '';
  if (kind === 'beatcount') {
    for (let n = METRO_BEATCOUNT_MIN; n <= METRO_BEATCOUNT_MAX; n++) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'metronome-option-menu-item';
      item.textContent = n;
      item.addEventListener('pointerup', (e) => { e.stopPropagation(); metronomeSetBeatCount(n); });
      menu.appendChild(item);
    }
  } else if (kind === 'backing') {
    METRO_BACKING_OPTIONS.forEach(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'metronome-option-menu-item';
      item.textContent = opt.label;
      item.addEventListener('pointerup', (e) => { e.stopPropagation(); metronomeSetBacking(opt.id); });
      menu.appendChild(item);
    });
  } else if (kind === 'rampcycle') {
    METRO_RAMPCYCLE_OPTIONS.forEach(n => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'metronome-option-menu-item';
      item.textContent = n;
      item.addEventListener('pointerup', (e) => { e.stopPropagation(); metronomeSetRampCycle(n); });
      menu.appendChild(item);
    });
  } else if (kind === 'rampinc') {
    METRO_RAMPINC_OPTIONS.forEach(n => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'metronome-option-menu-item';
      item.textContent = `+${n}`;
      item.addEventListener('pointerup', (e) => { e.stopPropagation(); metronomeSetRampInc(n); });
      menu.appendChild(item);
    });
  }
  _metroRenderOptionMenuActive(kind);
}

function _metroRenderOptionMenuActive(kind) {
  const menu = document.getElementById(`metronome-${kind}-menu`);
  if (!menu) return;
  let current;
  if (kind === 'beatcount') current = String(_metroBeatCount);
  else if (kind === 'backing') current = (METRO_BACKING_OPTIONS.find(o => o.id === _metroBacking) || {}).label;
  else if (kind === 'rampcycle') current = String(_metroRampCycle);
  else if (kind === 'rampinc') current = `+${_metroRampInc}`;
  menu.querySelectorAll('.metronome-option-menu-item').forEach(el => {
    el.classList.toggle('metronome-option-menu-item--active', el.textContent === current);
  });
}

function closeMetronomeOptionMenu() {
  document.querySelectorAll('.metronome-option-menu').forEach(el => el.classList.add('hidden'));
}

function toggleMetronomeOptionMenu(e, kind) {
  e.stopPropagation();
  if (typeof _playTap === 'function') _playTap();
  const menu = document.getElementById(`metronome-${kind}-menu`);
  if (!menu) return;
  const willOpen = menu.classList.contains('hidden');
  closeMetronomeOptionMenu();
  if (willOpen) {
    _metroRenderOptionMenu(kind);
    menu.classList.remove('hidden');
  }
}

// ── 재생 엔진 ────────────────────────────────────────────────
let _metroAudioCtx = null;
let _metroToneSynced = false; // Tone.js(드럼 샘플)가 _metroAudioCtx와 같은 시계를 쓰도록 동기화됐는지
let _metroUpSfxMaster = null;
let _metroPlaying = false;
let _metroSchedulerTimeout = null;
let _metroNextBeatTime = 0;
let _metroBeatIndex = 0;
let _metroBallSide = 0; // 0=왼쪽, 1=오른쪽 (다음에 도착할 쪽)
const METRO_LOOKAHEAD_SEC = 0.15;
const METRO_SCHEDULER_TICK_MS = 25;

function _metroGetSfxBus() {
  if (!_metroUpSfxMaster || _metroUpSfxMaster.context !== _metroAudioCtx) {
    _metroUpSfxMaster = _metroAudioCtx.createGain();
    _metroUpSfxMaster.connect(_metroAudioCtx.destination);
  }
  _metroUpSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _metroUpSfxMaster;
}

function _metroClickSound(time, isDownbeat) {
  if (!_metroAudioCtx) return;
  const osc = _metroAudioCtx.createOscillator();
  const gain = _metroAudioCtx.createGain();
  const filter = _metroAudioCtx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.3;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(_metroGetSfxBus());

  osc.type = 'sine';
  osc.frequency.value = isDownbeat ? 740 : 520;

  if (time < _metroAudioCtx.currentTime) time = _metroAudioCtx.currentTime;

  const vol = isDownbeat ? 0.38 : 0.22;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  osc.start(time);
  osc.stop(time + 0.06);
}

function _metroGetBeatDots() {
  return Array.from(document.querySelectorAll('#metronome-beat-dots .beat-dot'));
}

function _metroFlashDot(dot) {
  document.querySelectorAll('#metronome-beat-dots .beat-dot--flash').forEach(el => {
    if (el !== dot) el.classList.remove('beat-dot--flash');
  });
  dot.classList.add('beat-dot--flash');
}

function _metroClearFlash() {
  document.querySelectorAll('#metronome-beat-dots .beat-dot--flash').forEach(el => {
    el.classList.remove('beat-dot--flash');
  });
}

function _metroSwingBall(durationSec) {
  const ball = document.getElementById('metronome-swing-ball');
  const track = document.getElementById('metronome-swing-track');
  if (!ball || !track) return;
  const targetLeft = _metroBallSide === 0 ? 'calc(100% - 28px)' : '0px';
  ball.style.transition = `left ${durationSec}s linear`;
  ball.style.left = targetLeft;
  _metroBallSide = _metroBallSide === 0 ? 1 : 0;
}

function _metroResetBall() {
  const ball = document.getElementById('metronome-swing-ball');
  if (!ball) return;
  ball.style.transition = 'none';
  ball.style.left = '0px';
  void ball.offsetHeight;
  _metroBallSide = 0;
}

// 실시간 재생 BPM(램프 진행중엔 시작→목표로 서서히 상승, 램프 꺼져있으면 항상 목표BPM과 동기화)
let _metroLiveBpm = 120;
let _metroCyclesElapsed = 0;      // 램프 시작 후 완료된 마디(사이클) 수
let _metroBeatsSinceCycleStart = 0; // 현재 마디 안에서 지금까지 지난 박 수 — 박자수를 재생 도중 바꿔도 다음 마디 경계부터 새 값 기준으로 안전하게 재정렬됨

// 사용자가 재생 도중 설정을 바꿔도 절대 어긋나지 않도록, 매 박마다 현재 유효한 목표/최소/최대로 다시 클램프한다.
function _metroResolveLiveBpm() {
  if (!_metroRamp) {
    _metroLiveBpm = _metroTargetBpm; // 램프 꺼짐: 항상 목표BPM 그대로(휠 조정 즉시 반영)
  } else {
    _metroLiveBpm = Math.min(_metroLiveBpm, _metroTargetBpm); // 목표를 낮춰도 즉시 그 이하로 스냅
  }
  _metroLiveBpm = Math.max(METRO_BPM_MIN, Math.min(METRO_BPM_MAX, _metroLiveBpm));
  return _metroLiveBpm;
}

// 시각효과(공 스윙/원 강조)와 드럼 스텝은 setTimeout이 아니라 이 큐에 절대시각(오디오시계 기준)으로
// 쌓아두고, rAF 루프(_metroVisualLoop)가 매 프레임 audioCtx.currentTime과 비교해서 발화한다.
// setTimeout은 누적 오차가 생겨 시간이 지날수록 오디오와 어긋나므로(Two Clocks 문제) 절대 안 씀.
let _metroVisualQueue = [];

function _metroScheduler() {
  if (!_metroPlaying) return;
  let beatDots = _metroGetBeatDots();
  if (beatDots.length === 0) { _metroSchedulerTimeout = setTimeout(_metroScheduler, METRO_SCHEDULER_TICK_MS); return; }

  while (_metroNextBeatTime < _metroAudioCtx.currentTime + METRO_LOOKAHEAD_SEC) {
    // 박자수를 재생 중에 바꿔도 '지금까지 지난 박 수'만 세므로 다음 마디 경계에서 바로
    // 새 박자수 기준으로 정상 정렬된다(과거 누적값과 나눗셈으로 어긋날 일 없음).
    _metroBeatsSinceCycleStart++;
    const isLastBeatOfBar = _metroBeatsSinceCycleStart >= _metroBeatCount;
    if (isLastBeatOfBar) {
      _metroBeatsSinceCycleStart = 0;
      // 재생 중 박자수 변경 요청이 있었다면 이번 마디 경계에서 한 번에 안전하게 반영
      // — 이전 마디의 남은 화면효과는 이미 옛 dot으로 예약이 끝난 상태라 어긋날 일 없음
      if (_metroPendingBeatCount !== null) {
        _metroBeatCount = _metroPendingBeatCount;
        _metroPendingBeatCount = null;
        _metroBeatIndex = 0;
        _metroRenderBeatDots();
        beatDots = _metroGetBeatDots();
      }
      if (_metroRamp && _metroRampCycle > 0) {
        _metroCyclesElapsed++;
        if (_metroCyclesElapsed % _metroRampCycle === 0) {
          // 마지막 박(4박째) 자체 길이부터 새 템포 반영 — 4→1박 사이 구간에서 체감상 바뀜
          _metroLiveBpm = Math.min(_metroLiveBpm + _metroRampInc, _metroTargetBpm);
          _metroSyncLiveStartWheel();
        }
      }
    }

    const bpmNow = _metroResolveLiveBpm();
    const beatDuration = 60 / bpmNow;
    const dot = beatDots[_metroBeatIndex % beatDots.length];
    const isMute = dot.dataset.mode === 'mute';
    const isDownbeat = dot.dataset.mode === 'accent';
    const barStep = _metroBeatIndex % _metroBeatCount;
    if (!isMute && _metroBacking === 'click') _metroClickSound(_metroNextBeatTime, isDownbeat);

    if (!isMute && _metroBacking === 'drum') {
      const patt = METRO_DRUM1_PATTERNS[_metroBeatCount];
      if (patt) {
        // 클릭사운드와 동일하게 룩어헤드 시점에 바로 절대시각으로 예약 — rAF(_metroVisualLoop)를
        // 거치면 프레임 지연/드랍에 따라 발화 시각이 밀림(Two Clocks 문제) — 시각효과만 큐잉
        for (let s = 0; s < patt.stepsPerBeat; s++) {
          const stepIndex = barStep * patt.stepsPerBeat + s;
          const stepTime = _metroNextBeatTime + (s / patt.stepsPerBeat) * beatDuration;
          _metroPlayDrumStep(patt, stepIndex, stepTime);
        }
      }
    }

    _metroVisualQueue.push({ time: _metroNextBeatTime, kind: 'beat', dot, isMute, beatDuration });

    _metroNextBeatTime += beatDuration;
    _metroBeatIndex++;
  }
  _metroSchedulerTimeout = setTimeout(_metroScheduler, METRO_SCHEDULER_TICK_MS);
}

function _metroVisualLoop() {
  if (!_metroPlaying) { _metroVisualQueue = []; return; }
  const now = _metroAudioCtx.currentTime;
  while (_metroVisualQueue.length && _metroVisualQueue[0].time <= now) {
    const ev = _metroVisualQueue.shift();
    if (!ev.isMute) _metroFlashDot(ev.dot);
    _metroSwingBall(ev.beatDuration);
  }
  requestAnimationFrame(_metroVisualLoop);
}

async function toggleMetronomePlay() {
  if (typeof _playTap === 'function') _playTap();
  const btn = document.getElementById('metronome-play-btn');
  const icon = btn ? btn.querySelector('i') : null;

  if (_metroPlaying) {
    _metroPlaying = false;
    if (_metroSchedulerTimeout) { clearTimeout(_metroSchedulerTimeout); _metroSchedulerTimeout = null; }
    _metroVisualQueue = [];
    // 정지 시 대기 중이던 박자수 변경이 있으면 지금 바로 확정 적용
    if (_metroPendingBeatCount !== null) {
      _metroBeatCount = _metroPendingBeatCount;
      _metroPendingBeatCount = null;
      _metroBeatIndex = 0;
      _metroBeatsSinceCycleStart = 0;
      _metroRenderBeatDots();
    }
    _metroClearFlash();
    _metroResetBall();
    _metroLiveBpm = _metroStartBpm;
    if (_metroRamp) metronomeScrollStartWheel(_metroStartBpm, false); // 휠 위치까지 처음 설정한 BPM으로 되돌림
    else metronomeUpdateStartActive();
    if (icon) icon.className = 'ph-fill ph-play';
    return;
  }

  if (!_metroAudioCtx) _metroAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_metroAudioCtx.state === 'suspended') await _metroAudioCtx.resume();

  // 드럼(Tone.js)이 기본 Tone 컨텍스트(별도 시계)를 쓰던 걸 클릭사운드와 같은 _metroAudioCtx로
  // 맞춤 — 안 맞으면 드럼 히트가 절대시각 예약이 아니라 rAF가 알아챈 "지금"에 재생돼서
  // 백킹 전환 시/기기 렉 시 클릭과 어긋남
  if (!_metroToneSynced && typeof Tone !== 'undefined') {
    try {
      const toneCtx = new Tone.Context({ context: _metroAudioCtx, lookAhead: 0 });
      Tone.setContext(toneCtx);
      await Tone.start();
      if (typeof DrumAudio !== 'undefined') DrumAudio.rebuild();
      _metroToneSynced = true;
    } catch (e) {}
  }

  if (typeof DrumAudio !== 'undefined') {
    try { await DrumAudio.resume(); await DrumAudio.ready(); } catch (e) {}
  }

  _metroPlaying = true;
  _metroBeatIndex = 0;
  _metroBeatsSinceCycleStart = 0;
  _metroCyclesElapsed = 0;
  _metroLiveBpm = _metroRamp ? _metroStartBpm : _metroTargetBpm;
  _metroResetBall();
  _metroNextBeatTime = _metroAudioCtx.currentTime + 0.05;
  _metroVisualQueue = [];
  if (icon) icon.className = 'ph-fill ph-pause';
  _metroScheduler();
  requestAnimationFrame(_metroVisualLoop);
}

// ── BPM 휠피커 (strum-play 패턴 재사용, 행 높이만 고정px) ──────
const METRO_BPM_MIN = 1;
const METRO_BPM_MAX = 300;
let _metroTargetBpm = 120;
let _metroStartBpm = 80;
let _metroTargetItemH = 32;
let _metroStartItemH = 32;

function _metroSetWheelTop(wheel, top) {
  const prev = wheel.style.scrollSnapType;
  wheel.style.scrollSnapType = 'none';
  wheel.scrollTop = top;
  void wheel.offsetHeight;
  wheel.style.scrollSnapType = prev;
}

function metronomeInitTargetWheel() {
  const wheel = document.getElementById('metronome-target-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = METRO_BPM_MIN; b <= METRO_BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => metronomeSetTarget(b));
    wheel.appendChild(item);
  }
  if (wheel.firstElementChild) _metroTargetItemH = wheel.firstElementChild.getBoundingClientRect().height;
  metronomeScrollTargetWheel(_metroTargetBpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / _metroTargetItemH);
    const newBpm = METRO_BPM_MIN + idx;
    const floor = _metroRamp ? _metroStartBpm : METRO_BPM_MIN;
    const clamped = Math.max(floor, METRO_BPM_MIN, Math.min(METRO_BPM_MAX, newBpm));
    if (clamped !== _metroTargetBpm) {
      _metroTargetBpm = clamped;
      metronomeUpdateTargetActive();
    }
    if (_metroRamp && newBpm < _metroStartBpm) metronomeScrollTargetWheel(_metroStartBpm, true);
  }, { passive: true });

  if (typeof enableMouseDragScroll === 'function') enableMouseDragScroll(wheel);
}

function metronomeScrollTargetWheel(bpm, smooth) {
  const wheel = document.getElementById('metronome-target-wheel');
  if (!wheel) return;
  const top = (bpm - METRO_BPM_MIN) * _metroTargetItemH;
  if (smooth) wheel.scrollTo({ top, behavior: 'smooth' });
  else _metroSetWheelTop(wheel, top);
  metronomeUpdateTargetActive();
}

function metronomeUpdateTargetActive() {
  const wheel = document.getElementById('metronome-target-wheel');
  if (!wheel) return;
  wheel.querySelectorAll('.progd-bpm-item').forEach((el) => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === _metroTargetBpm);
  });
}

function metronomeSetTarget(bpm) {
  const floor = _metroRamp ? _metroStartBpm : METRO_BPM_MIN;
  _metroTargetBpm = Math.max(floor, METRO_BPM_MIN, Math.min(METRO_BPM_MAX, bpm));
  metronomeScrollTargetWheel(_metroTargetBpm, true);
}

function metronomeChangeTarget(delta) {
  if (typeof _playTap === 'function') _playTap();
  metronomeSetTarget(_metroTargetBpm + delta);
}

function metronomeInitStartWheel() {
  const wheel = document.getElementById('metronome-start-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = METRO_BPM_MIN; b <= METRO_BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => metronomeSetStart(b));
    wheel.appendChild(item);
  }
  if (wheel.firstElementChild) _metroStartItemH = wheel.firstElementChild.getBoundingClientRect().height;
  metronomeScrollStartWheel(_metroStartBpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / _metroStartItemH);
    const newBpm = METRO_BPM_MIN + idx;
    if (newBpm !== _metroStartBpm) {
      _metroStartBpm = Math.max(METRO_BPM_MIN, Math.min(METRO_BPM_MAX, newBpm));
      metronomeUpdateStartActive();
    }
  }, { passive: true });

  if (typeof enableMouseDragScroll === 'function') enableMouseDragScroll(wheel);
}

function metronomeScrollStartWheel(bpm, smooth) {
  const wheel = document.getElementById('metronome-start-wheel');
  if (!wheel) return;
  const top = (bpm - METRO_BPM_MIN) * _metroStartItemH;
  if (smooth) wheel.scrollTo({ top, behavior: 'smooth' });
  else _metroSetWheelTop(wheel, top);
  metronomeUpdateStartActive();
}

function metronomeUpdateStartActive() {
  const wheel = document.getElementById('metronome-start-wheel');
  if (!wheel) return;
  // 재생+램프 중엔 설정값이 아니라 지금 올라가고 있는 실제 라이브BPM을 강조
  const target = (_metroPlaying && _metroRamp) ? _metroLiveBpm : _metroStartBpm;
  wheel.querySelectorAll('.progd-bpm-item').forEach((el) => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === target);
  });
}

// 재생 중 라이브BPM이 올라갈 때마다 시작 휠을 그 값으로 스크롤 — 설정값(_metroStartBpm)은 안 건드림
function _metroSyncLiveStartWheel() {
  if (!_metroPlaying || !_metroRamp) return;
  metronomeScrollStartWheel(_metroLiveBpm, true);
}

function metronomeSetStart(bpm) {
  _metroStartBpm = Math.max(METRO_BPM_MIN, Math.min(_metroTargetBpm, bpm));
  metronomeScrollStartWheel(_metroStartBpm, true);
}

function metronomeChangeStart(delta) {
  if (typeof _playTap === 'function') _playTap();
  metronomeSetStart(_metroStartBpm + delta);
}

// ── 점진 가속(램프) 토글 ─────────────────────────────────────
let _metroRamp = false;

function metronomeToggleRamp(checked) {
  if (typeof _playTap === 'function') _playTap();
  _metroRamp = !!checked;
  if (_metroRamp && _metroTargetBpm < _metroStartBpm) {
    _metroTargetBpm = _metroStartBpm;
    metronomeScrollTargetWheel(_metroTargetBpm, false);
  }
  // 재생 도중 램프를 켜거나 끄면 그 순간부터 다시 정상 기준으로 잡는다
  // — ON: 시작BPM부터 사이클카운트 새로 시작 / OFF: 목표BPM으로 즉시 스냅(스케줄러가 매 박 재확인)
  if (_metroPlaying) {
    _metroBeatsSinceCycleStart = 0;
    _metroCyclesElapsed = 0;
    _metroLiveBpm = _metroRamp ? _metroStartBpm : _metroTargetBpm;
  }
  const box = document.getElementById('metronome-bpm-start');
  if (box) box.classList.toggle('hidden', !_metroRamp);
  const arrow = document.getElementById('metronome-bpm-arrow');
  if (arrow) arrow.classList.toggle('hidden', !_metroRamp);
  const spacer = document.getElementById('metronome-bpm-target-spacer');
  if (spacer) spacer.classList.toggle('hidden', _metroRamp);
  const startLabel = document.getElementById('metronome-bpm-start-label');
  if (startLabel) startLabel.classList.toggle('hidden', !_metroRamp);
  const targetLabel = document.getElementById('metronome-bpm-target-label');
  if (targetLabel) targetLabel.classList.toggle('hidden', !_metroRamp);
  // display:none 상태에서 init한 start 휠은 높이가 0으로 측정돼 스크롤 계산이 틀어짐
  // → 보여질 때 실제 렌더 높이 재측정 후 재정렬
  if (_metroRamp) {
    requestAnimationFrame(() => {
      const wheel = document.getElementById('metronome-start-wheel');
      if (wheel && wheel.firstElementChild) {
        const h = wheel.firstElementChild.getBoundingClientRect().height;
        if (h > 0) _metroStartItemH = h;
      }
      metronomeScrollStartWheel(_metroStartBpm, false);
    });
  }
}

function closeMetronomePage() {
  if (typeof _playTap === 'function') _playTap();
  _metroPlaying = false;
  if (_metroSchedulerTimeout) { clearTimeout(_metroSchedulerTimeout); _metroSchedulerTimeout = null; }
  if (_metroAudioCtx) { _metroAudioCtx.close(); _metroAudioCtx = null; }
  if (typeof DrumAudio !== 'undefined') DrumAudio.stop();
  // 세로 고정 해제 — 다른 페이지로 돌아갈 때 회전 다시 허용
  window.Capacitor?.Plugins?.ScreenOrientation?.unlock().catch(() => {});
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html?tab=tools'; }, 260);
  } else {
    location.href = 'home.html?tab=tools';
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 메트로놈은 가로모드 미지원 — 진입 시 세로 고정(뒤로가기에서 unlock으로 해제)
  window.Capacitor?.Plugins?.ScreenOrientation?.lock({ orientation: 'portrait' }).catch(() => {});

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  _metroRenderBeatDots();

  metronomeInitTargetWheel();
  metronomeInitStartWheel();

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.metronome-option-menu, .metronome-option-card')) return;
    closeMetronomeOptionMenu();
  });

  // 뒤로가기는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
});
