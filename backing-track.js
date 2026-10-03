'use strict';
// ═══════════════════════════════════════════════════════════════
// backing-track.js — 백킹 트랙(드럼 + 피아노) 재생 엔진 + 스타일/진행 데이터
// 설계 문서: docs/backing-tracks.md
// 의존: Tone.js, drum-sets.js(DRUM_SETS), drum-audio.js(DrumAudio), guitar-audio.js(GuitarAudio) — 이 순서로 먼저 로드
//   BackingTrack.start(getParams, styleId)  getParams: () => ({ bpm, root, level })  (매 스텝/마디 읽음 → 재생 중 변경 즉시 반영)
//   BackingTrack.stop() / BackingTrack.isPlaying()
// 시계는 하나: AudioContext.currentTime 기준 룩어헤드 스케줄러(메트로놈과 동일 방식)
// ═══════════════════════════════════════════════════════════════

const BackingTrack = (() => {

  const LOOKAHEAD_SEC = 0.15;
  const TICK_MS = 25;
  const START_DELAY_SEC = 0.1;
  const STEPS_PER_BAR = 8; // 4/4, 8분음표 8칸 (DRUM_SETS 1번과 동일)
  const CUE_LEAD_STEPS = 2; // 폼 전환 신호를 코드 시작 몇 스텝 전에 낼지 (2 = 1박)

  // 스타일 — 지금은 '기본' 하나. drum = DRUM_SETS id, piano = 한 마디 안 코드 타격(step 시작위치, len 길이=8분음표 칸 수)
  const STYLES = {
    basic: {
      name: '기본',
      drum: 1,
      piano: [{ step: 0, len: 3 }, { step: 3, len: 5 }], // 3 + 5 싱코페이션
    },
  };

  // 코드 종류 — rh: 오른손으로 치는 구성음의 근음 기준 반음 거리(왼손 베이스가 근음을 맡으므로 7th 코드는 근음 생략, 3·5·7도 중심), suffix: 코드명 뒤에 붙는 표기, sup: 그 뒤 위첨자로 올리는 표기(화면용)
  const QUALITIES = {
    M:      { rh: [0, 4, 7],      suffix: '' },
    m:      { rh: [0, 3, 7],      suffix: 'm' },
    '7':    { rh: [4, 7, 10],     suffix: '7' },
    M7:     { rh: [4, 7, 11],     suffix: 'M7' },
    mM7:    { rh: [3, 7, 11],     suffix: 'mM7' },
    m7:     { rh: [3, 7, 10],     suffix: 'm7' },
    '7alt': { rh: [4, 7, 10, 3],  suffix: '7alt.' }, // 표기는 C7alt.(점 포함), 소리는 도미넌트7 + #9 텐션만 (3·5·b7·#9)
    m7b5:   { rh: [3, 6, 10],     suffix: 'm7', sup: '(b5)' },
    dim7:   { rh: [3, 6, 9],      suffix: 'dim7' },
    '7s11': { rh: [4, 7, 10, 6],  suffix: '7', sup: '(#11)' }, // 도미넌트7 + #11 (3·5·b7·#11)
    '7n9b13': { rh: [4, 10, 2, 8], suffix: '7', sup: '(9,b13)' }, // 도미넌트7 + 9 + b13 (3·b7·9·b13, 5음 생략)
  };

  // 레벨별 코드 진행 — 한 마디에 코드 하나, 순환. 항목 = [루트에서 반음 거리, 코드 종류(생략 시 'M'), 코드 위 라벨(생략 가능), 폼('pair' = 챕터2 전환 후 스케일 폼으로 연주하는 코드, 생략 시 원래 폼), 베이스 음(슬래시 코드, 키 루트에서 반음 거리, 생략 가능)]
  //   폼이 바뀌는 코드 시작 1박(4분음표) 전에 consumeDueForm()으로 전환 신호가 나옴(챕터2 자동 전환)
  //   거리: I=0, ii=2, IV=5, V=7. 나머지 레벨은 아직 미정 → 레벨 1 진행으로 대체.
  //   바로 앞 마디와 같은 코드면 화면엔 % 로 표시됨(getProgression의 repeat) — 데이터는 그냥 같은 코드를 적으면 됨.
  const PROGRESSIONS = {
    1: [[0], [5], [0], [7]],                              // I - IV - I - V   (C F C G)
    2: [[0, 'm'], [5, 'm'], [0, 'm'], [7]],               // i - iv - i - V   (Cm Fm Cm G)
    3: [[0, 'm'], [5, 'm'], [0, 'm'], [7]],               // 레벨 2와 동일 (i - iv - i - V)
    4: [[0, 'm'], [5, 'm'], [0, 'm'], [7]],               // 레벨 2와 동일 (i - iv - i - V)
    5: [[2, 'm7b5'], [7, '7'], [0, 'm'], [0, 'm']],       // iim7(b5) - V7 - im - %   (Bm7(b5) E7 Am %)
    6: [[5], [7], [0], [0, '7', '전환!', 'pair']],        // IV - V - I - I7   (F G C C7) — C7은 4도(F) 폼으로 연주, 위에 '전환!' 라벨
    7: [[2, 'm'], [2, '7', '전환!', 'pair'], [7, '7'], [7, '7']],   // ii - II7 - V7 - %   (Dm D7 G7 %) — D7 전환
    8: [[0], [4, '7', '전환!', 'pair'], [9, 'm'], [5]],              // I - III7 - vi - IV   (C E7 Am F) — E7 전환
    9: [[2, 'm'], [7, '7'], [0], [9, '7', '전환!', 'pair']],         // ii - V7 - I - VI7   (Dm G7 C A7) — A7 전환
    10: [[0], [11, '7', '전환!', 'pair'], [4, 'm'], [7]],            // I - VII7 - iii - V   (C B7 Em G) — B7 전환
    11: [[0], [5], [0], [7]],                             // 레벨 1과 동일 (I - IV - I - V)
    12: [[0, 'm'], [5, '7'], [0, 'm'], [5, '7']],         // i - IV7 - i - IV7   (Cm F7 Cm F7) — 도리안
    13: [[0, 'm'], [1, 'M7'], [0, 'm'], [1, 'M7']],       // i - bIIM7 - i - bIIM7   (Cm DbM7 Cm DbM7) — 프리지안
    14: [[0], [2, '7', '', '', 0], [0], [2, '7', '', '', 0]], // I - II7/I - I - II7/I   (C D7/C C D7/C) — 리디안
    15: [[0, '7'], [0, '7'], [10], [10]],                  // I7 - % - bVII - %   (C7 % Bb %) — 믹솔리디안
    16: [[0, 'm'], [5, 'm'], [0, 'm'], [7, 'm']],         // i - iv - i - v   (Cm Fm Cm Gm) — 에올리안
    17: [[0, 'm7b5'], [0, 'm7b5'], [1], [1]],             // im7(b5) - % - bII - %   (Cm7(b5) % Db %) — 로크리안
    18: [[7, 'm7b5'], [7, 'm7b5'], [0, '7'], [0, '7']],    // iim7(b5) - % - V7 - %   (Gm7(b5) % C7 %) — 선택한 C가 V7의 근음(F 마이너의 ii-V)
    19: [[0, 'mM7'], [0, 'mM7'], [7, '7'], [7, '7']],     // imM7 - % - V7 - %   (CmM7 % G7 %) — 멜로딕 마이너
    20: [[0, '7alt'], [0, '7alt'], [0, '7alt'], [0, '7alt']], // I7alt. - % - % - %   (C7alt. % % %) — 선택한 C가 알터드 도미넌트의 근음 — 얼터드
    21: [[0, 'm7b5'], [0, 'm7b5'], [0, 'dim7'], [0, 'dim7']], // im7(b5) - % - dim7 - %   (Cm7(b5) % Cdim7 %) — 로크리안 #6
    22: [[0, '7s11'], [0, '7s11'], [0, '7s11'], [0, '7s11']], // I7(#11) - % - % - %   (C7(#11) % % %) — 리디안 도미넌트
    23: [[0, '7n9b13'], [0, '7n9b13'], [0, '7n9b13'], [0, '7n9b13']], // I7(9,b13) - % - % - %   (C7(9,b13) % % %) — 믹솔리디안 b13
    24: [[0, 'm7b5'], [0, 'm7b5'], [0, 'm7b5'], [0, 'm7b5']], // im7(b5) - % - % - %   (Cm7(b5) % % %) — 로크리안 #2
    25: [[0], [5], [0], [7]],                             // 메이저 펜타토닉: I - IV - I - V   (C F C G)
    26: [[0, '7'], [5, '7'], [0, '7'], [7, '7']],         // 메이저 블루스: I7 - IV7 - I7 - V7   (C7 F7 C7 G7)
  };
  const DEFAULT_LEVEL = 1;

  // 피아노 보이싱 — 왼손: 베이스 한 음(슬래시 코드면 지정 베이스, 아니면 근음) E2~D#3(40~51) / 오른손: rh 구성음을 G3~D5(55~72) 안의
  // 닫힌 배치로, 코드가 바뀔 때 직전 보이싱과 평균 음높이가 가장 가까운 전위를 고름(음 이동 최소화). 첫 코드는 D4(62) 근처.
  const PIANO_LH_MIN = 40;
  const PIANO_RH_LOW = 55;
  const PIANO_RH_HIGH = 72;
  const PIANO_RH_CENTER = 62;
  const PIANO_VELOCITY = 0.7;

  let _timer = null;
  let _token = 0;       // start() 대기 중 stop()이 먼저 불린 경우 취소용
  let _getParams = null;
  let _style = null;
  let _stepIdx = 0;
  let _nextTime = 0;
  let _barMidis = null; // 현재 마디 코드 구성음
  let _prevRh = null;   // 직전 코드 오른손 보이싱 — 다음 코드의 전위 선택(음 이동 최소화)에 씀
  let _lastChordIdx = -1;
  let _cueEvents = [];  // 폼 전환 신호 {time, form} — 바뀌는 코드 시작 8분음표 1칸 전 시각
  let _barEvents = [];  // 마디 시작 예약 기록 {time, idx} — 화면 강조(getCurrentChordIndex)가 오디오 시계로 읽음

  function _ctx() { return Tone.getContext().rawContext; }

  function _params() {
    const p = _getParams ? _getParams() : {};
    return { bpm: p.bpm || 90, root: p.root || 0, level: p.level || DEFAULT_LEVEL };
  }

  const _mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  function _voicing(rootPc, quality, bassPc, prevRh) {
    const q = QUALITIES[quality] || QUALITIES.M;
    let bass = 36 + (bassPc != null ? bassPc : rootPc);   // 왼손 베이스
    if (bass < PIANO_LH_MIN) bass += 12;
    const pcs = [...new Set(q.rh.map(i => (rootPc + i) % 12))].sort((a, b) => a - b);
    // 모든 전위 후보: 각 구성음을 최저음으로 삼아 위로 닫힌 배치
    const cands = pcs.map((_, k) => {
      const order = pcs.slice(k).concat(pcs.slice(0, k));
      let n = PIANO_RH_LOW;
      while (n % 12 !== order[0]) n++;
      const notes = [n];
      order.slice(1).forEach(pc => { let m = notes[notes.length - 1] + 1; while (m % 12 !== pc) m++; notes.push(m); });
      return notes;
    });
    const ok = cands.filter(c => c[c.length - 1] <= PIANO_RH_HIGH);
    const pool = ok.length ? ok : cands;
    const target = prevRh ? _mean(prevRh) : PIANO_RH_CENTER;
    let best = pool[0];
    pool.forEach(c => { if (Math.abs(_mean(c) - target) < Math.abs(_mean(best) - target)) best = c; });
    return { midis: [bass, ...best], rh: best };
  }

  function _scheduleStep(t, stepDur) {
    const stepInBar = _stepIdx % STEPS_PER_BAR;
    const drum = (typeof DRUM_SETS !== 'undefined') ? DRUM_SETS[_style.drum] : null;

    if (stepInBar === 0) {
      const { root, level } = _params();
      const prog = PROGRESSIONS[level] || PROGRESSIONS[DEFAULT_LEVEL];
      const bar = Math.floor(_stepIdx / STEPS_PER_BAR);
      const c = prog[bar % prog.length];
      const v = _voicing((root + c[0]) % 12, c[1], c[4] != null ? (root + c[4]) % 12 : null, _prevRh);
      _barMidis = v.midis;
      _prevRh = v.rh;
      _barEvents.push({ time: t, idx: bar % prog.length });
    }

    // 다음 마디 코드의 폼이 지금과 다르면 마디 마지막 박 시작(= 다음 코드 시작 1박 전)에 전환 신호
    if (stepInBar === STEPS_PER_BAR - CUE_LEAD_STEPS) {
      const { level } = _params();
      const prog = PROGRESSIONS[level] || PROGRESSIONS[DEFAULT_LEVEL];
      const bar = Math.floor(_stepIdx / STEPS_PER_BAR);
      const curForm = prog[bar % prog.length][3] || 'orig';
      const nextForm = prog[(bar + 1) % prog.length][3] || 'orig';
      if (curForm !== nextForm) _cueEvents.push({ time: t, form: nextForm });
    }

    if (drum) {
      if (drum.kick.includes(stepInBar)) DrumAudio.hit('kick', t);
      if (drum.snare.includes(stepInBar)) DrumAudio.hit('snare', t);
      if (drum.hat.includes(stepInBar)) DrumAudio.hit('hat', t, 0.6);
    }

    _style.piano.forEach(h => {
      if (h.step === stepInBar && _barMidis) GuitarAudio.playPianoChord(_barMidis, h.len * stepDur, t, PIANO_VELOCITY);
    });
  }

  function _tick() {
    const ctx = _ctx();
    while (_nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const stepDur = 60 / _params().bpm / 2; // 8분음표 1칸
      _scheduleStep(_nextTime, stepDur);
      _nextTime += stepDur;
      _stepIdx++;
    }
  }

  async function start(getParams, styleId) {
    stop();
    const token = ++_token;
    const style = STYLES[styleId] || STYLES.basic;
    GuitarAudio.warmupPiano();
    await DrumAudio.resume();
    await Promise.all([DrumAudio.ready(), GuitarAudio.pianoReady()]);
    if (token !== _token) return false; // 대기 중 stop()됨

    _getParams = getParams;
    _style = style;
    _stepIdx = 0;
    _barMidis = null;
    _prevRh = null;
    _barEvents = [];
    _cueEvents = [];
    _lastChordIdx = -1;
    _nextTime = _ctx().currentTime + START_DELAY_SEC;
    _timer = setInterval(_tick, TICK_MS);
    _tick();
    return true;
  }

  // 즉각 중단 + 초기화. 재생 중이었을 때만 소리 정리(안 울리는데 매번 피아노 샘플러를 갈아엎지 않도록)
  function stop() {
    _token++;
    if (!_timer) return;
    clearInterval(_timer);
    _timer = null;
    _stepIdx = 0;
    _barMidis = null;
    _prevRh = null;
    _barEvents = [];
    _cueEvents = [];
    _lastChordIdx = -1;
    // 미래 예약된 드럼/피아노까지 전부 즉시 정리
    if (typeof DrumAudio !== 'undefined') DrumAudio.stop();
    if (typeof GuitarAudio !== 'undefined') GuitarAudio.resetPiano();
  }

  function isPlaying() { return _timer !== null; }

  // 도달한 폼 전환 신호 중 가장 최근 것('orig' | 'pair')을 꺼냄, 없으면 null. rAF에서 읽을 것(오디오 시계 기준)
  function consumeDueForm() {
    if (!_timer) return null;
    const ctx = _ctx();
    const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    let form = null;
    while (_cueEvents.length && _cueEvents[0].time <= now) form = _cueEvents.shift().form;
    return form;
  }

  // 지금 들리고 있는 코드의 진행 내 인덱스(0~3), 아직 첫 마디 전이면 -1.
  // 시각효과는 setTimeout 말고 이 값을 rAF에서 읽을 것(오디오 시계 기준 — 출력 지연까지 반영)
  function getCurrentChordIndex() {
    if (!_timer) return -1;
    const ctx = _ctx();
    const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    let cur = -1;
    while (_barEvents.length && _barEvents[0].time <= now) cur = _barEvents.shift().idx;
    if (cur !== -1) _lastChordIdx = cur;
    return _lastChordIdx;
  }

  // 레벨의 코드 진행 — [{ offset: 루트에서 반음 거리, suffix: 코드명 뒤 표기, sup: 위첨자 표기, label: 코드 위 라벨, bass: 베이스 음의 키 루트 기준 반음 거리(없으면 null), repeat: 앞 마디와 같은 코드 여부 }]
  // (화면 표시용으로도 사용, 하드코딩 금지)
  function getProgression(level) {
    const prog = PROGRESSIONS[level] || PROGRESSIONS[DEFAULT_LEVEL];
    return prog.map((c, i) => {
      const q = c[1] || 'M';
      const prev = i > 0 ? prog[i - 1] : null;
      const quality = QUALITIES[q] || QUALITIES.M;
      return {
        offset: c[0],
        suffix: quality.suffix,
        sup: quality.sup || '',
        label: c[2] || '',
        bass: c[4] != null ? c[4] : null,
        repeat: !!prev && prev[0] === c[0] && (prev[1] || 'M') === q && (prev[4] ?? null) === (c[4] ?? null),
      };
    });
  }

  return { start, stop, isPlaying, getProgression, getCurrentChordIndex, consumeDueForm };
})();
