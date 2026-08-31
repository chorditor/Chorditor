// ── 마이크 입력 ────────────────────────────────────────────
// 다음 단계(피치감지 로직)에서 tunerAnalyser로 이어받아 사용.
let tunerAudioCtx = null;
let tunerAnalyser = null;
let tunerMicStream = null;
let tunerMicStarting = false;
let tunerPitchRaf = null;
let tunerPitchyPromise = null;

// 튜닝 프리셋 목록 — 각 notes는 6번줄→1번줄 순
const TUNER_PRESETS = {
  standard: {
    label: '스탠다드', notes: [
      { name: 'E2', freq: 82.41 }, { name: 'A2', freq: 110.00 }, { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 }, { name: 'B3', freq: 246.94 }, { name: 'E4', freq: 329.63 }
    ]
  },
  // 고정 현 세트가 없는 자유튜닝용 — 12음 아무거나 감지되면 목표음으로 인정.
  // notes를 빈 배열로 두고 isCustom 플래그로 분기(줄번호 표시 없음).
  custom: { label: '커스텀', isCustom: true, notes: [] },
  dropD: {
    label: '드롭 D', notes: [
      { name: 'D2', freq: 73.42 }, { name: 'A2', freq: 110.00 }, { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 }, { name: 'B3', freq: 246.94 }, { name: 'E4', freq: 329.63 }
    ]
  },
  halfStepDown: {
    label: '하프 다운', notes: [
      { name: 'D#2', freq: 77.78 }, { name: 'G#2', freq: 103.83 }, { name: 'C#3', freq: 138.59 },
      { name: 'F#3', freq: 185.00 }, { name: 'A#3', freq: 233.08 }, { name: 'D#4', freq: 311.13 }
    ]
  },
  openG: {
    label: '오픈 G', notes: [
      { name: 'D2', freq: 73.42 }, { name: 'G2', freq: 98.00 }, { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 }, { name: 'B3', freq: 246.94 }, { name: 'D4', freq: 293.66 }
    ]
  },
  openD: {
    label: '오픈 D', notes: [
      { name: 'D2', freq: 73.42 }, { name: 'A2', freq: 110.00 }, { name: 'D3', freq: 146.83 },
      { name: 'F#3', freq: 185.00 }, { name: 'A3', freq: 220.00 }, { name: 'D4', freq: 293.66 }
    ]
  },
  dadgad: {
    label: 'DADGAD', notes: [
      { name: 'D2', freq: 73.42 }, { name: 'A2', freq: 110.00 }, { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 }, { name: 'A3', freq: 220.00 }, { name: 'D4', freq: 293.66 }
    ]
  }
};
let tunerActivePresetId = 'standard';
const TUNER_IN_TUNE_CENTS = 5; // 이 이내면 정확한 것으로 판단(녹색) — 눈금단위(5센트)와 맞춤
const TUNER_MIN_FREQ = 20.60; // E0 — 기타 최저음(E2)보다 훨씬 낮은 영역, 이 아래는 저역 노이즈/험으로 간주해 감지 게이트

// 목표음 박스(하단) 확정 판정용 — 게이지(즉시반응)와 달리 일정시간 유지돼야 확정 표시.
// 아래 3개는 실사용하면서 튜닝할 파라미터, 우선 상식적인 기본값으로 시작.
const TUNER_LOCK_WINDOW_MS = 600;  // 이 시간창 안의 판정만 봄
const TUNER_LOCK_RATIO = 0.7;      // 그 안에서 인튠비율이 이 이상이면 확정
const TUNER_HOLD_MS = 3000;        // 무음이어도 이 시간까지는 마지막 목표음 유지

// Hz → 음이름(A4=440 12평균율). { name: "E2", cents: -3 } 형태로 반환
function hzToNoteName(hz) {
  const noteNum = 12 * Math.log2(hz / 440) + 69; // MIDI note number, A4=69
  const rounded = Math.round(noteNum);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name: name + octave, cents: Math.round((noteNum - rounded) * 100) };
}

// 음이름("E2") → 주파수(A4=440 12평균율). hzToNoteName의 역함수 — 커스텀 프리셋에서 락된 음이름의 정확한 목표주파수 계산용
function noteNameToFreq(name) {
  const m = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return null;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = names.indexOf(m[1]) + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 옥타브 오인식 보정 — 감지음/2배음/절반음 중 활성 프리셋 음들과 가장 가까운 것 선택
// (저음현은 배음이 fundamental보다 강해서 McLeod가 2배 주파수로 스냅하는 경우 있음, 예: E2→E3)
function correctPitchOctave(hz) {
  const preset = TUNER_PRESETS[tunerActivePresetId];
  let bestHz = hz, bestCents = Infinity;
  for (const cand of [hz, hz / 2, hz * 2]) {
    if (preset.isCustom) {
      // 커스텀은 고정 음이 없으니 가장 가까운 반음(임의 옥타브)과의 거리로 비교
      const cents = Math.abs(hzToNoteName(cand).cents);
      if (cents < bestCents) { bestCents = cents; bestHz = cand; }
      continue;
    }
    for (const note of preset.notes) {
      const cents = Math.abs(1200 * Math.log2(cand / note.freq));
      if (cents < bestCents) { bestCents = cents; bestHz = cand; }
    }
  }
  return bestHz;
}

// 감지음(Hz)과 현재 활성 프리셋의 음들 중 가장 가까운 것을 센트단위로 비교해서 반환
// 커스텀 프리셋은 고정 음 목록이 없으므로 12음 중 가장 가까운 반음(임의 옥타브)을 그대로 목표음으로 삼음
function findNearestPresetNote(hz) {
  const preset = TUNER_PRESETS[tunerActivePresetId];
  if (preset.isCustom) {
    const nn = hzToNoteName(hz);
    return { name: nn.name, freq: noteNameToFreq(nn.name), cents: nn.cents };
  }
  let best = null;
  for (const note of preset.notes) {
    const cents = 1200 * Math.log2(hz / note.freq);
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { ...note, cents };
  }
  return best;
}

// 피치감지 상태 — 프리셋 변경(setActivePreset)에서도 리셋해야해서 모듈스코프로 둠
const TUNER_HISTORY_SIZE = 7;
const TUNER_NOTE_SWITCH_MIN = 5; // 최근 TUNER_HISTORY_SIZE프레임 중 이 이상 같은 음이어야 목표음 전환(잔향/공명 오검출 방지)
let tunerCentsHistory = [];
let tunerNoteHistory = []; // 최근 감지된 근접 프리셋음 이름 다수결 — 목표음 텍스트 안정화용
let tunerLockEvents = []; // {t, ok} — 목표음 확정판정용 시간창
let tunerLockedNoteName = null;
let tunerLastDetectedAt = 0;
let tunerActiveTickEl = null;

function setActiveTick(el, inTune) {
  if (tunerActiveTickEl && tunerActiveTickEl !== el) {
    tunerActiveTickEl.classList.remove('gauge-tick--active-off', 'gauge-tick--active-intune');
  }
  if (el) el.classList.toggle('gauge-tick--active-off', !inTune);
  if (el) el.classList.toggle('gauge-tick--active-intune', inTune);
  tunerActiveTickEl = el;
}

// 프리셋 변경/장기무음 시 목표음 표시+판정상태 전부 초기화
function resetTargetDisplay() {
  const preset = TUNER_PRESETS[tunerActivePresetId];
  const targetStringEl = document.getElementById('tuner-target-string');
  const targetNoteEl = document.getElementById('tuner-target-note');
  const targetFreqEl = document.getElementById('tuner-target-freq');
  const directionEl = document.getElementById('tuner-pitch-direction');
  const targetBoxEl = document.getElementById('tuner-pitch-target');
  if (targetStringEl) targetStringEl.classList.toggle('hidden', !!preset.isCustom);
  if (preset.isCustom) {
    if (targetStringEl) targetStringEl.textContent = '';
    if (targetNoteEl) targetNoteEl.textContent = '—';
    if (targetFreqEl) targetFreqEl.textContent = '';
  } else {
    const defaultNote = preset.notes[1]; // 5번줄 자리를 기본 표시로
    if (targetStringEl) targetStringEl.textContent = '5번줄';
    if (targetNoteEl) targetNoteEl.textContent = defaultNote.name;
    if (targetFreqEl) targetFreqEl.textContent = `${defaultNote.freq.toFixed(1)}Hz`;
  }
  if (directionEl) {
    directionEl.textContent = '';
    directionEl.classList.remove('tuner-direction--intune', 'tuner-direction--off');
  }
  if (targetBoxEl) targetBoxEl.classList.remove('in-tune');
  tunerLockEvents.length = 0;
  tunerNoteHistory.length = 0;
  tunerCentsHistory.length = 0;
  tunerLockedNoteName = null;
  setActiveTick(null, false);
}

// 프리셋 드롭다운 — 커스텀 버튼+리스트박스(직사각형, 버튼 바로 아래 부착)
function initPresetSelect() {
  renderPresetMenu();
  document.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('tuner-preset-menu');
    const btn = document.getElementById('tuner-preset-btn');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeTunerPresetMenu();
  });
}

function renderPresetMenu() {
  const menu = document.getElementById('tuner-preset-menu');
  const label = document.getElementById('tuner-preset-btn-label');
  if (!menu || !label) return;
  menu.innerHTML = '';
  for (const id in TUNER_PRESETS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tuner-preset-menu-item' + (id === tunerActivePresetId ? ' tuner-preset-menu-item--active' : '');
    item.textContent = TUNER_PRESETS[id].label;
    item.onpointerup = () => { setActivePreset(id); closeTunerPresetMenu(); };
    menu.appendChild(item);
  }
  label.textContent = TUNER_PRESETS[tunerActivePresetId].label;
}

function toggleTunerPresetMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('tuner-preset-menu');
  if (menu) menu.classList.toggle('hidden');
}

function closeTunerPresetMenu() {
  const menu = document.getElementById('tuner-preset-menu');
  if (menu) menu.classList.add('hidden');
}

function updatePresetNotesDisplay() {
  const notesEl = document.getElementById('tuner-preset-notes');
  if (!notesEl) return;
  const preset = TUNER_PRESETS[tunerActivePresetId];
  notesEl.classList.toggle('hidden', !!preset.isCustom); // 커스텀은 고정 음 목록이 없어 표시할 게 없음
  if (preset.isCustom) { notesEl.innerHTML = ''; return; }
  notesEl.innerHTML = preset.notes
    .map(n => `<span>${n.name.replace(/\d/g, '')}</span>`).join('');
}

function setActivePreset(id) {
  if (!TUNER_PRESETS[id] || id === tunerActivePresetId) return;
  tunerActivePresetId = id;
  updatePresetNotesDisplay();
  resetTargetDisplay();
  renderPresetMenu();
  analytics.track('tuner_preset_changed', { preset_id: id });
}

// Pitchy(McLeod Pitch Method)로 실시간 피치감지 + 프리셋 매칭
async function startPitchDetection() {
  if (!tunerPitchyPromise) {
    tunerPitchyPromise = import('https://cdn.jsdelivr.net/npm/pitchy@4/+esm');
  }
  const { PitchDetector } = await tunerPitchyPromise;
  if (!tunerAnalyser) return;

  const detector = PitchDetector.forFloat32Array(tunerAnalyser.fftSize);
  const data = new Float32Array(tunerAnalyser.fftSize);

  const tick = () => {
    if (!tunerAnalyser) return;
    const currentEl = document.getElementById('tuner-pitch-current');
    const targetStringEl = document.getElementById('tuner-target-string');
    const targetNoteEl = document.getElementById('tuner-target-note');
    const targetFreqEl = document.getElementById('tuner-target-freq');
    const directionEl = document.getElementById('tuner-pitch-direction');
    const targetBoxEl = document.getElementById('tuner-pitch-target');
    const gaugeEl = document.getElementById('tuner-gauge');

    tunerAnalyser.getFloatTimeDomainData(data);
    let [pitch, clarity] = detector.findPitch(data, tunerAudioCtx.sampleRate);
    // 저음역(E2 82Hz 근방)은 배음간섭으로 clarity가 구조적으로 낮게 나와 기준 완화
    const clarityThreshold = pitch < 110 ? 0.85 : 0.93;
    const detected = (clarity > clarityThreshold && pitch >= TUNER_MIN_FREQ);
    if (detected) pitch = correctPitchOctave(pitch);
    const now = performance.now();

    // 무음이어도 A2로 강제리셋 안 함 — 마지막 감지음 그대로 유지(초기값만 HTML의 A2)
    if (detected && currentEl) currentEl.textContent = hzToNoteName(pitch).name;

    if (detected) {
      tunerLastDetectedAt = now;
      const rawTarget = findNearestPresetNote(pitch);

      // 목표음 이름은 다수결로 안정화 — 잔향/공명 프레임 하나로 즉시 안 바뀌게
      tunerNoteHistory.push(rawTarget.name);
      if (tunerNoteHistory.length > TUNER_HISTORY_SIZE) tunerNoteHistory.shift();
      const counts = {};
      let modeName = tunerNoteHistory[0], modeCount = 0;
      for (const n of tunerNoteHistory) {
        counts[n] = (counts[n] || 0) + 1;
        if (counts[n] > modeCount) { modeCount = counts[n]; modeName = n; }
      }
      if (tunerLockedNoteName === null || modeCount >= TUNER_NOTE_SWITCH_MIN) {
        if (tunerLockedNoteName !== modeName) {
          tunerLockedNoteName = modeName;
          tunerLockEvents.length = 0; // 목표음 바뀌면 이전 확정판정은 무의미
        }
      }
      const activePreset = TUNER_PRESETS[tunerActivePresetId];
      const activeNotes = activePreset.notes;
      const target = activePreset.isCustom
        ? { name: tunerLockedNoteName, freq: noteNameToFreq(tunerLockedNoteName) }
        : (activeNotes.find(n => n.name === tunerLockedNoteName) || rawTarget);
      const cents = 1200 * Math.log2(pitch / target.freq);
      const clampedCents = Math.max(-65, Math.min(65, cents));

      tunerCentsHistory.push(clampedCents);
      if (tunerCentsHistory.length > TUNER_HISTORY_SIZE) tunerCentsHistory.shift();
      const sorted = [...tunerCentsHistory].sort((a, b) => a - b);
      const medianCents = sorted[Math.floor(sorted.length / 2)];

      const inTune = Math.abs(medianCents) <= TUNER_IN_TUNE_CENTS; // 게이지용 — 즉시반응
      const nearestTickCents = Math.round(medianCents / 5) * 5;

      // 목표음 박스용 — 최근 시간창 내 인튠비율로 확정판정(즉시반응 X)
      tunerLockEvents.push({ t: now, ok: inTune });
      while (tunerLockEvents.length && now - tunerLockEvents[0].t > TUNER_LOCK_WINDOW_MS) tunerLockEvents.shift();
      const lockRatio = tunerLockEvents.filter(e => e.ok).length / tunerLockEvents.length;
      const locked = tunerLockEvents.length >= 3 && lockRatio >= TUNER_LOCK_RATIO;

      const stringIndex = activeNotes.findIndex(n => n.name === target.name);
      if (targetStringEl && stringIndex !== -1) targetStringEl.textContent = `${6 - stringIndex}번줄`;
      if (targetNoteEl) targetNoteEl.textContent = target.name;
      if (targetFreqEl) targetFreqEl.textContent = `${target.freq.toFixed(1)}Hz`;
      if (directionEl) {
        directionEl.textContent = locked ? '정확해요' : (medianCents > 0 ? '▼ 더 낮춰야 해요' : '▲ 더 높여야 해요');
        directionEl.classList.toggle('tuner-direction--intune', locked);
        directionEl.classList.toggle('tuner-direction--off', !locked);
      }
      if (targetBoxEl) targetBoxEl.classList.toggle('in-tune', locked);
      if (gaugeEl) {
        const nextTick = gaugeEl.querySelector(`[data-cents="${nearestTickCents}"]`);
        setActiveTick(nextTick, inTune);
      }
    } else {
      tunerCentsHistory.length = 0;
      tunerNoteHistory.length = 0;
      setActiveTick(null, false);
      // 무음이어도 TUNER_HOLD_MS까지는 직전 목표음/확정상태 그대로 유지(다음 줄 준비 시간)
      if (tunerLastDetectedAt && now - tunerLastDetectedAt > TUNER_HOLD_MS) {
        resetTargetDisplay();
        tunerLastDetectedAt = 0;
      }
    }

    tunerPitchRaf = requestAnimationFrame(tick);
  };
  tick();
}

// 앱(Capacitor) 또는 모바일/태블릿 브라우저면 true — 이 경우 장치선택 드롭다운 대신 안내문구만
// (모바일은 OS 자체 마이크 허용 팝업이 뜨고, 대부분 마이크가 하나뿐이라 장치선택 의미 없음)
function isMobileOrTablet() {
  return !!window.Capacitor?.isNativePlatform() || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function startMic() {
  if (tunerMicStarting || tunerAnalyser) return;
  tunerMicStarting = true;

  navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  }).then((stream) => {
    tunerMicStream = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    tunerAudioCtx = new AudioCtx();
    if (tunerAudioCtx.state === 'suspended') tunerAudioCtx.resume();

    const source = tunerAudioCtx.createMediaStreamSource(stream);
    tunerAnalyser = tunerAudioCtx.createAnalyser();
    tunerAnalyser.fftSize = 4096; // 저음(E2 82Hz)도 충분한 주기가 담기도록 큰 버퍼 사용
    source.connect(tunerAnalyser); // destination에는 연결 안 함(하울링 방지)

    // getUserMedia가 Android 오디오모드를 통화모드로 바꿔버리는 문제 보정 — 미디어음량으로 되돌림
    window.Capacitor?.Plugins?.AudioMode?.setNormal().catch(() => {});

    tunerMicStarting = false;
    if (!isMobileOrTablet()) populateMicSelect();
    startPitchDetection();
  }).catch((err) => {
    tunerMicStarting = false;
    console.error('[tuner] mic connect failed:', err.name || err);
  });
}

// 마이크 연결 성공 후 호출 — PC 전용 장치선택 드롭다운(마이크 탭 버튼과 무관한 별도 자리)
function populateMicSelect() {
  const wrap = document.getElementById('tuner-mic-select-wrap');
  if (!wrap) return;

  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const inputs = devices.filter(d => d.kind === 'audioinput');
    const currentId = tunerMicStream.getAudioTracks()[0].getSettings().deviceId;

    wrap.innerHTML = '';
    const select = document.createElement('select');
    select.id = 'tuner-mic-select';
    inputs.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `마이크 ${i + 1}`;
      if (d.deviceId === currentId) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => switchMicDevice(select.value);
    wrap.appendChild(select);
    wrap.classList.add('has-select');
  });
}

// 선택한 장치로 재연결 — AudioContext/Analyser는 재사용, 스트림/소스만 교체
function switchMicDevice(deviceId) {
  if (tunerMicStream) tunerMicStream.getTracks().forEach(t => t.stop());

  navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  }).then((stream) => {
    tunerMicStream = stream;
    const source = tunerAudioCtx.createMediaStreamSource(stream);
    source.connect(tunerAnalyser);
  });
}

// ── 튜닝 팁 문구 순환 ──────────────────────────────────────
const TUNER_TIPS = [
  '튜닝은 감는 방향(음이 높아지는 방향)으로 하는 게 좋아요.',
  '튜닝을 맞추다가 음이 높아지면 확 푼 다음 다시 올려서 맞추세요!',
  '튜닝은 매번 달라질 수 있어요. 수시로 튜닝하세요!',
  '줄을 감는 부품을 줄감개 또는 페그(Peg)라고 불러요.',
  '연주하기 전에 튜닝을 확인하는 습관을 들이세요!',
  '튜닝을 하면서 밴딩을 해보세요! 안정적인 튜닝을 할 수 있어요.',
  '카포를 끼면 튜닝이 미세하게 달라질 수 있어요.'
];
const TUNER_TIP_INTERVAL_MS = 10000;
let tunerTipTimer = null;

function startTuningTipRotation() {
  const el = document.getElementById('tuner-tuning-tip');
  if (!el) return;
  let lastIndex = -1;
  const showNext = () => {
    let idx;
    do { idx = Math.floor(Math.random() * TUNER_TIPS.length); } while (idx === lastIndex && TUNER_TIPS.length > 1);
    lastIndex = idx;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = TUNER_TIPS[idx];
      el.style.opacity = '1';
    }, 200);
  };
  showNext();
  tunerTipTimer = setInterval(showNext, TUNER_TIP_INTERVAL_MS);
}

// ── 뒤로가기 ──────────────────────────────────────────────
function closeTunerPage() {
  _playTap();
  if (tunerTipTimer) {
    clearInterval(tunerTipTimer);
    tunerTipTimer = null;
  }
  if (tunerPitchRaf) {
    cancelAnimationFrame(tunerPitchRaf);
    tunerPitchRaf = null;
  }
  if (tunerMicStream) {
    tunerMicStream.getTracks().forEach(t => t.stop());
    tunerMicStream = null;
  }
  if (tunerAudioCtx) {
    tunerAudioCtx.close();
    tunerAudioCtx = null;
  }
  tunerAnalyser = null;
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

  // 마이크 탭 버튼 자체를 없앴으므로 전 플랫폼(모바일/태블릿/데스크탑) 공통으로 페이지 진입 시
  // 바로 마이크 연결을 시도한다. 모바일/태블릿은 홈 화면에서 이미 권한을 미리 받아둔 상태.
  // 아래쪽 다른 초기화 코드가 뭔가로 인해 예외를 던져도 이 블록은 항상 실행되도록 맨 앞에서 처리.
  try {
    startMic();
  } catch (e) {
    console.error('[tuner] mic auto-start failed:', e);
  }

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();
  startTuningTipRotation();
  initPresetSelect();

  // 뒤로가기는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('tuner_page_viewed', {});
});
