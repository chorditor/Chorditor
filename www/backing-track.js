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

  // 스타일 — 지금은 '기본' 하나. drum = DRUM_SETS id, piano = 한 마디 안 코드 타격(step 시작위치, len 길이=8분음표 칸 수)
  const STYLES = {
    basic: {
      name: '기본1',
      drum: 1,
      piano: [{ step: 0, len: 2 }, { step: 2, len: 2 }, { step: 4, len: 2 }, { step: 6, len: 2 }], // 4분음표 4박(1·3·5·7번째 칸)
      bass: [{ step: 0, len: 3 }, { step: 3, len: 3 }, { step: 6, len: 2 }], // 8분음표 1·4·7번째 칸에 근음
      // 기본1 진행 덮어쓰기 — 공통이 I-IV-I-V(C F C G)인 레벨 1·11·25는 I-V-vi-IV(C G Am F), 마이너 레벨 2·3·4는 아래. 나머지 레벨은 공통 PROGRESSIONS
      progressions: {
        1:  [[0], [7], [9, 'm'], [5]],
        11: [[0], [7], [9, 'm'], [5]],
        25: [[0], [7], [9, 'm'], [5]],
        // 레벨 2·3·4: i-iv-i-v (A 마이너 기준 Am Dm Am Em) — 공통 진행의 마지막 V(E)를 v(Em)로
        2: [[0, 'm'], [5, 'm'], [0, 'm'], [7, 'm']],
        3: [[0, 'm'], [5, 'm'], [0, 'm'], [7, 'm']],
        4: [[0, 'm'], [5, 'm'], [0, 'm'], [7, 'm']],
        // 레벨 6(챕터 2): I-I7-IV-V (C C7 F G) — C7이 4도(F) 폼으로 연주하는 전환 코드
        6: [[0], [0, '7', '전환!', 'pair'], [5], [7]],
        // 레벨 7(챕터 2): I-II7-V-V7 (C D7 G G7) — D7이 전환 코드
        7: [[0], [2, '7', '전환!', 'pair'], [7], [7, '7']],
        // 레벨 9(챕터 2): I-VI7-ii-V7 (C A7 Dm G7) — A7이 전환 코드
        9: [[0], [9, '7', '전환!', 'pair'], [2, 'm'], [7, '7']],
        // 레벨 13(프리지안): i-bII-i-bII (C 기준 Cm Db Cm Db) — 공통 진행의 DbM7을 Db 트라이어드로
        13: [[0, 'm'], [1], [0, 'm'], [1]],
      },
    },
    // 재즈1 — 스윙(한 마디 12칸 = 박마다 셋잇단 3칸). 드럼: 라이드 스팽-가-랭 + 2·4박 발 하이햇 + 약한 킥(DRUM_SETS 7),
    // 피아노: 4마디 주기 컴핑(길게 + 짧은 스타카토를 섞음), 베이스: 워킹 베이스. 코드 진행은 공통 진행 사용
    jazz1: {
      name: '재즈1',
      stepsPerBar: 12,
      drum: 7,
      // 컴핑: 4마디 주기로 패턴이 바뀜. len 1~2는 스타카토(짧게 끊음), vel은 세기 배율. 박 머리 0·3·6·9, 셋잇단 끝(뒷박) 2·5·8·11
      pianoBars: [
        [{ step: 3, len: 2, vel: 0.9 }, { step: 8, len: 1, vel: 0.7 }, { step: 11, len: 1, vel: 0.8 }],        // 1박 쉬고 2박, 3박 뒤 짧게, 4박 뒤(다음 마디로 당김)
        [{ step: 0, len: 1, vel: 0.8 }, { step: 5, len: 3, vel: 0.9 }, { step: 9, len: 2, vel: 0.75 }],        // 1박 짧게, 2박 뒤(길게), 4박
        [{ step: 2, len: 1, vel: 0.7 }, { step: 6, len: 1, vel: 0.8 }, { step: 8, len: 1, vel: 0.7 }, { step: 11, len: 1, vel: 0.8 }], // 짧게 촘촘히: 1박 뒤, 3박, 3박 뒤, 4박 뒤
        [{ step: 3, len: 1, vel: 0.7 }, { step: 5, len: 2, vel: 0.85 }, { step: 9, len: 1, vel: 0.8 }, { step: 11, len: 1, vel: 0.7 }], // 2박, 2박 뒤, 4박, 4박 뒤
      ],
      piano: [],
      // 레벨 5(하모닉 마이너, 진행 Bm7(b5) E7 Am % — 코드 표기는 그대로): 컴핑 소리에만 텐션. 4마디 = 진행 한 바퀴
      //  E7: b13 고정 + #9 → b9로 연속(Am으로 떨어지기 직전 마디에서 '7b13s9'를 치다 마지막에 '7b13b9'로 해결), Am: 9 텐션(Am7(9) 느낌)
      pianoLevels: {
        5: [
          [{ step: 3, len: 2, vel: 0.9 }, { step: 8, len: 1, vel: 0.7 }, { step: 11, len: 1, vel: 0.8 }],                                          // Bm7(b5)
          [{ step: 2, len: 1, vel: 0.7, q: '7b13s9' }, { step: 6, len: 2, vel: 0.9, q: '7b13s9' }, { step: 9, len: 3, vel: 1, q: '7b13b9' }],   // E7: #9 … → b9로 해결
          // Am 두 마디: 하향 라인 클리셰 Am(A) → AmM7(G#) → Am7(9)(G). 코드 표기는 Am %로 그대로
          [{ step: 0, len: 3, vel: 1, q: 'amA' }, { step: 6, len: 3, vel: 0.9, q: 'amM7' }, { step: 11, len: 1, vel: 0.7, q: 'amM7' }],
          [{ step: 3, len: 3, vel: 0.9, q: 'm9v' }, { step: 8, len: 1, vel: 0.7, q: 'm9v' }, { step: 11, len: 1, vel: 0.8, q: 'm9v' }],
        ],
      },
      // 워킹 베이스: walk = 4박 음 인덱스(_walkingBass가 마디마다 계산). 1박은 조금 세게
      bass: [{ step: 0, len: 3, walk: 0, gain: 1.2 }, { step: 3, len: 3, walk: 1 }, { step: 6, len: 3, walk: 2 }, { step: 9, len: 3, walk: 3 }],
      // 재즈다운 진행으로 덮어쓰기(7th 코드). 정하지 않은 레벨은 공통 진행
      progressions: {
        // 공통이 I-IV-I-V(C F C G)인 레벨 1·11·25: ii7-V7-IM7-% (C 기준 Dm7 G7 CM7 %)
        1:  [[2, 'm7'], [7, '7'], [0, 'M7'], [0, 'M7']],
        11: [[2, 'm7'], [7, '7'], [0, 'M7'], [0, 'M7']],
        25: [[2, 'm7'], [7, '7'], [0, 'M7'], [0, 'M7']],
        // 마이너 레벨 2·3·4: vi7-ii7-V7-IM7 (A 기준 Am7 Dm7 G7 CM7)
        2: [[0, 'm7'], [5, 'm7'], [10, '7'], [3, 'M7']],
        3: [[0, 'm7'], [5, 'm7'], [10, '7'], [3, 'M7']],
        4: [[0, 'm7'], [5, 'm7'], [10, '7'], [3, 'M7']],
        // 레벨 16(에올리안): 내추럴 마이너(레벨 4)와 같은 스타일 — i7-iv7-bVII7-bIIIM7 (C 기준 Cm7 Fm7 Bb7 EbM7)
        16: [[0, 'm7'], [5, 'm7'], [10, '7'], [3, 'M7']],
        // 레벨 6(챕터 2, 4도 세컨더리): I-I7-IVM7-V7 (C C7 FM7 G7) — C7이 전환 코드
        6: [[0], [0, '7', '전환!', 'pair'], [5, 'M7'], [7, '7']],
        // 레벨 8(챕터 2, 6도 세컨더리): iiø7-III7-vi7-% (C 기준 Bm7(b5) E7 Am7 %) — E7이 전환 코드
        8: [[11, 'm7b5'], [4, '7', '전환!', 'pair'], [9, 'm7'], [9, 'm7']],
      },
    },
    // 기본3 — 드럼(킥 1·3박 / 스네어 2·4박 / 하이햇 8칸), 피아노 4분음표 4박, 베이스 8칸 전부(1·4·7번째 칸 강세 — velocity는 전부 1.0, 강세 음만 gain 배율을 올림)
    basic3: {
      name: '기본3',
      drum: 6,
      piano: [{ step: 0, len: 2 }, { step: 2, len: 2 }, { step: 4, len: 2 }, { step: 6, len: 2 }],
      bass: [
        { step: 0, len: 1, gain: 1.4 }, { step: 1, len: 1 }, { step: 2, len: 1 }, { step: 3, len: 1, gain: 1.4 },
        { step: 4, len: 1 }, { step: 5, len: 1 }, { step: 6, len: 1, gain: 1.4 }, { step: 7, len: 1 },
      ],
      // 레벨 1·11·25: IV-V-iii-vi (C 기준 F G Em Am)
      progressions: {
        1:  [[5], [7], [4, 'm'], [9, 'm']],
        11: [[5], [7], [4, 'm'], [9, 'm']],
        25: [[5], [7], [4, 'm'], [9, 'm']],
        // 레벨 2·3·4(기본1이 i-iv-i-V, A 마이너 기준 Am Dm Am E인 레벨): i-v-bVI-bVII (루트 A 기준 Am Em F G)
        2: [[0, 'm'], [7, 'm'], [8], [10]],
        3: [[0, 'm'], [7, 'm'], [8], [10]],
        4: [[0, 'm'], [7, 'm'], [8], [10]],
        // 레벨 5: i-V7-bVI-iv (루트 A 기준 Am E7 F Dm)
        5: [[0, 'm'], [7, '7'], [8], [5, 'm']],
        // 레벨 6(챕터 2): IV-V-I-I7 (C 기준 F G C C7) — C7이 4도(F) 폼으로 연주하는 전환 코드
        6: [[5], [7], [0], [0, '7', '전환!', 'pair']],
        // 레벨 8(챕터 2): IV-III7-vi-I (C 기준 F E7 Am C) — E7이 전환 코드
        8: [[5], [4, '7', '전환!', 'pair'], [9, 'm'], [0]],
        // 레벨 7(챕터 2): ii-II7/#4-V-V7 (C 기준 Dm D7/F# G G7) — D7/F#(베이스 F#)이 전환 코드
        7: [[2, 'm'], [2, '7', '전환!', 'pair', 6], [7], [7, '7']],
        // 레벨 9(챕터 2): iii-VI7-ii-V7 (C 기준 Em A7 Dm G7) — A7이 전환 코드
        9: [[4, 'm'], [9, '7', '전환!', 'pair'], [2, 'm'], [7, '7']],
        // 레벨 10(챕터 2): I-ii7-VII7/#V-iii (C 기준 C Dm7 B7/D# Em) — B7/D#(베이스 D#)이 전환 코드
        10: [[0], [2, 'm7'], [11, '7', '전환!', 'pair', 3], [4, 'm']],
        // 레벨 12(도리안): i-bIII-v-IV7 (C 기준 Cm Eb Gm F7)
        12: [[0, 'm'], [3], [7, 'm'], [5, '7']],
        // 레벨 13(프리지안): i-bII-i-bvii (C 기준 Cm Db Cm Bbm)
        13: [[0, 'm'], [1], [0, 'm'], [10, 'm']],
        // 레벨 15(믹솔리디안): I-v-bVII-IV (C 기준 C Gm Bb F)
        15: [[0], [7, 'm'], [10], [5]],
        // 레벨 16(에올리안): 내추럴 마이너(레벨 4)와 같은 진행 — i-v-bVI-bVII (C 기준 Cm Gm Ab Bb)
        16: [[0, 'm'], [7, 'm'], [8], [10]],
      },
    },
    // 기본2 — 드럼(킥 1·4·6 / 스네어 3·7)·피아노(4분음표 4박)가 다름, 베이스는 기본1과 동일
    basic2: {
      name: '기본2',
      drum: 5,
      piano: [{ step: 0, len: 2 }, { step: 2, len: 2 }, { step: 4, len: 2 }, { step: 6, len: 2 }], // 4분음표 4박(1·3·5·7번째 칸)
      bass: [{ step: 0, len: 3 }, { step: 3, len: 3 }, { step: 6, len: 2 }],
      // 레벨별 코드 진행 덮어쓰기(PROGRESSIONS와 같은 형식) — 레벨 1·11·25는 ii-V-I-vi(C 기준 Dm G C Am)
      progressions: {
        1:  [[2, 'm'], [7], [0], [9, 'm']],
        11: [[2, 'm'], [7], [0], [9, 'm']],
        25: [[2, 'm'], [7], [0], [9, 'm']],
        // 레벨 2·3·4: i-iv-bVII-bIII (루트 A 기준 Am Dm G C)
        2: [[0, 'm'], [5, 'm'], [10], [3]],
        3: [[0, 'm'], [5, 'm'], [10], [3]],
        4: [[0, 'm'], [5, 'm'], [10], [3]],
        // 레벨 5: i-V7-bVI-iv (루트 A 기준 Am E7 F Dm)
        5: [[0, 'm'], [7, '7'], [8], [5, 'm']],
        // 레벨 6(챕터 2): ii-V-I-I7 (C 기준 Dm G C C7) — C7이 4도(F) 폼으로 연주하는 전환 코드
        6: [[2, 'm'], [7], [0], [0, '7', '전환!', 'pair']],
        // 레벨 8(챕터 2): vi-III7-IV-I (C 기준 Am E7 F C) — E7이 전환 코드
        8: [[9, 'm'], [4, '7', '전환!', 'pair'], [5], [0]],
        // 레벨 7(챕터 2): vi-II7-V-V7 (C 기준 Am D7 G G7) — D7이 전환 코드
        7: [[9, 'm'], [2, '7', '전환!', 'pair'], [7], [7, '7']],
        // 레벨 9(챕터 2): ii-V7-I-VI7 (C 기준 Dm G7 C A7) — A7이 전환 코드
        9: [[2, 'm'], [7, '7'], [0], [9, '7', '전환!', 'pair']],
        // 레벨 10(챕터 2): vi-IV-VII7-iii (C 기준 Am F B7 Em) — B7이 전환 코드
        10: [[9, 'm'], [5], [11, '7', '전환!', 'pair'], [4, 'm']],
        // 레벨 12(도리안): i-bVII-IV7-% (C 기준 Cm Bb F7 %)
        12: [[0, 'm'], [10], [5, '7'], [5, '7']],
        // 레벨 13(프리지안): i-bII-bIII7-bII (C 기준 Cm Db Eb7 Db)
        13: [[0, 'm'], [1], [3, '7'], [1]],
        // 레벨 15(믹솔리디안): I-bVII-IV-I (C 기준 C Bb F C)
        15: [[0], [10], [5], [0]],
        // 레벨 16(에올리안): 내추럴 마이너(레벨 4)와 같은 진행 — i-iv-bVII-bIII (C 기준 Cm Fm Bb Eb)
        16: [[0, 'm'], [5, 'm'], [10], [3]],
      },
    },
  };

  // 스타일·레벨에 맞는 코드 진행 — 스타일에 덮어쓴 진행이 있으면 그것, 없으면 공통 PROGRESSIONS
  function _progFor(styleId, level) {
    const ov = (STYLES[styleId] || STYLES.basic).progressions;
    return (ov && ov[level]) || PROGRESSIONS[level] || PROGRESSIONS[DEFAULT_LEVEL];
  }

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
    // 아래 셋은 진행표에 쓰지 않고 피아노 컴핑 한 번 한 번(pianoLevels의 q)에서만 쓰는 "표기는 그대로, 소리만 텐션" 보이싱
    '7b13s9': { rh: [4, 10, 3, 8], suffix: '7' }, // E7 → 3·b7·#9·b13 (근음·5음 생략)
    '7b13b9': { rh: [4, 10, 1, 8], suffix: '7' }, // E7 → 3·b7·b9·b13 (#9가 반음 내려가 b9로 해결)
    'm9v':    { rh: [3, 7, 10, 2], suffix: 'm' }, // Am → b3·5·b7·9 (Am7(9) 느낌, 근음 생략)
    // 하향 라인 클리셰(근음 A → G# → G): b3·5는 고정하고 한 음만 반음씩 내려감
    'amA':    { rh: [3, 7, 0],  suffix: 'm' }, // Am     → b3·5·루트(A)
    'amM7':   { rh: [3, 7, 11], suffix: 'm' }, // AmM7   → b3·5·M7(G#)
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
    10: [[0], [11, '7', '전환!', 'pair'], [4, 'm'], [7, '7']],       // I - VII7 - iii - V7   (C B7 Em G7) — B7 전환 (기본1·2·3 공통, 스타일별 덮어쓰기 없음)
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
    26: [[0, '7'], [5, '7'], [0, '7'], [5, '7']],         // 메이저 블루스: I7 - IV7 - I7 - IV7   (C7 F7 C7 F7)
  };
  const DEFAULT_LEVEL = 1;

  // 피아노 보이싱 — 왼손: 베이스 한 음(슬래시 코드면 지정 베이스, 아니면 근음) E2~D#3(40~51) / 오른손: rh 구성음을 G3~D5(55~72) 안의
  // 닫힌 배치로, 코드가 바뀔 때 직전 보이싱과 평균 음높이가 가장 가까운 전위를 고름(음 이동 최소화). 첫 코드는 D4(62) 근처.
  const PIANO_LH_MIN = 40;
  const PIANO_RH_LOW = 55;
  const PIANO_RH_HIGH = 72;
  const PIANO_RH_CENTER = 62;
  const PIANO_VELOCITY = 0.7;
  const BASS_VELOCITY = 1.0;

  let _timer = null;
  let _token = 0;       // start() 대기 중 stop()이 먼저 불린 경우 취소용
  let _getParams = null;
  let _style = null;
  let _styleId = 'basic';
  let _stepIdx = 0;
  let _nextTime = 0;
  let _barMidis = null; // 현재 마디 코드 구성음
  let _barRootPc = 0;    // 현재 마디 코드 근음·베이스 음(피아노 컴핑 한 번 한 번의 q 보이싱을 만들 때 씀)
  let _barBassPc = 0;
  let _walkNotes = null; // 워킹 베이스 현재 마디 4박 음(MIDI) — 스타일 bass 항목의 walk(0~3)가 이 배열 인덱스
  let _prevRh = null;  // 직전 코드 오른손 보이싱 — 다음 코드의 전위 선택(음 이동 최소화)에 씀
  let _lastChordIdx = -1;
  let _cueEvents = [];  // 폼 전환 신호 {time, form} — 바뀌는 코드 시작 8분음표 1칸 전 시각
  let _barEvents = [];  // 마디 시작 예약 기록 {time, idx} — 화면 강조(getCurrentChordIndex)가 오디오 시계로 읽음

  function _ctx() { return Tone.getContext().rawContext; }

  function _params() {
    const p = _getParams ? _getParams() : {};
    return { bpm: p.bpm || 90, root: p.root || 0, level: p.level || DEFAULT_LEVEL };
  }

  // 워킹 베이스 — 1박 근음(슬래시 코드면 지정 베이스) / 2·3박 3음·5음 / 4박 다음 코드 근음으로 가는 접근음(반음 위·아래 중 가까운 쪽).
  // 마디 번호 짝수는 근음-3-5-접근, 홀수는 근음-5-3-접근(같은 코드가 반복돼도 단조롭지 않게, 랜덤은 안 씀).
  // 다음 코드가 같은 베이스 음이면 접근음 대신 3·5음 중 3박과 다른 음. 음역 E1~G2(28~43).
  const WALK_LO = 28, WALK_HI = 43;
  function _walkNear(pc, prev) { // prev에 가장 가까운 pc 음(음역 안)
    let best = null;
    for (let m = WALK_LO; m <= WALK_HI; m++) {
      if (m % 12 === pc && (best === null || Math.abs(m - prev) < Math.abs(best - prev))) best = m;
    }
    return best;
  }
  function _walkingBass(rootPc, quality, bassPc, nextBassPc, bar, b1) {
    const q = QUALITIES[quality] || QUALITIES.M;
    const third = q.rh.find(i => i === 3 || i === 4);
    const fifth = q.rh.find(i => i === 6 || i === 7);
    const thirdPc = (rootPc + (third != null ? third : 4)) % 12;
    const fifthPc = (rootPc + (fifth != null ? fifth : 7)) % 12;
    const even = bar % 2 === 0;
    const n2 = _walkNear(even ? thirdPc : fifthPc, b1);
    const n3 = _walkNear(even ? fifthPc : thirdPc, n2);
    let n4;
    if (nextBassPc === bassPc) {
      n4 = _walkNear(n3 % 12 === fifthPc ? thirdPc : fifthPc, n3);
    } else {
      const t = _walkNear(nextBassPc, n3);
      const lo = t - 1, hi = t + 1;
      n4 = (Math.abs(lo - n3) <= Math.abs(hi - n3)) ? lo : hi;
      if (n4 === n3) n4 = (n4 === lo) ? hi : lo; // 3박과 같은 음을 두 번 치지 않게 반대쪽 접근음
    }
    return [b1, n2, n3, n4];
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
    const spb = _style.stepsPerBar || STEPS_PER_BAR; // 한 마디 칸 수(스윙은 12 = 박마다 셋잇단 3칸)
    const stepInBar = _stepIdx % spb;
    const drum = (typeof DRUM_SETS !== 'undefined') ? DRUM_SETS[_style.drum] : null;

    if (stepInBar === 0) {
      const { root, level } = _params();
      const prog = _progFor(_styleId, level);
      const bar = Math.floor(_stepIdx / spb);
      const c = prog[bar % prog.length];
      const v = _voicing((root + c[0]) % 12, c[1], c[4] != null ? (root + c[4]) % 12 : null, _prevRh);
      _barMidis = v.midis;
      _prevRh = v.rh;
      _barRootPc = (root + c[0]) % 12;
      _barBassPc = c[4] != null ? (root + c[4]) % 12 : _barRootPc;
      if ((_style.bass || []).some(h => h.walk != null)) {
        const nx = prog[(bar + 1) % prog.length];
        const bassPc = (root + (c[4] != null ? c[4] : c[0])) % 12;
        const nextBassPc = (root + (nx[4] != null ? nx[4] : nx[0])) % 12;
        _walkNotes = _walkingBass((root + c[0]) % 12, c[1], bassPc, nextBassPc, bar, v.midis[0] - 12);
      }
      _barEvents.push({ time: t, idx: bar % prog.length });
      // 재생 시작 첫 마디가 전환 폼 코드면 앞 마디가 없어 미리 신호가 안 나오므로 시작 시각에 바로 전환 신호
      if (bar === 0 && (c[3] || 'orig') !== 'orig') _cueEvents.push({ time: t, form: c[3] });
    }

    // 다음 마디 코드의 폼이 지금과 다르면 마디 마지막 박 시작(= 다음 코드 시작 1박 전)에 전환 신호
    if (stepInBar === spb - spb / 4) { // 마지막 1박 시작(8칸이면 6번째, 12칸이면 9번째 칸)
      const { level } = _params();
      const prog = _progFor(_styleId, level);
      const bar = Math.floor(_stepIdx / spb);
      const curForm = prog[bar % prog.length][3] || 'orig';
      const nextForm = prog[(bar + 1) % prog.length][3] || 'orig';
      if (curForm !== nextForm) _cueEvents.push({ time: t, form: nextForm });
    }

    if (drum) {
      const dv = drum.vel || {}; // 악기별 세기(세트에 없으면 kick·snare 1, hat 0.6)
      if (drum.kick.includes(stepInBar)) DrumAudio.hit('kick', t, dv.kick);
      if (drum.snare.includes(stepInBar)) DrumAudio.hit('snare', t, dv.snare);
      if (drum.hat.includes(stepInBar)) DrumAudio.hit(drum.hatInst || 'hat', t, dv.hat != null ? dv.hat : 0.6);
      if (drum.ride && drum.ride.includes(stepInBar)) {
        const ghost = drum.rideGhost && drum.rideGhost.includes(stepInBar);
        DrumAudio.hit('ride', t, (dv.ride != null ? dv.ride : 1) * (ghost ? 0.7 : 1));
      }
    }

    // 피아노 컴핑 — 레벨 전용 패턴(pianoLevels)이 있으면 그것, 없으면 pianoBars(4마디 주기), 없으면 고정 piano.
    // 컴핑 한 번(h.q)마다 보이싱을 따로 줄 수 있음: 코드 표기는 그대로 두고 소리만 텐션(예: E7 #9 → b9 연속)
    const lv = _params().level;
    const bars = (_style.pianoLevels && _style.pianoLevels[lv]) || _style.pianoBars;
    const pianoHits = bars ? bars[Math.floor(_stepIdx / spb) % bars.length] : _style.piano;
    pianoHits.forEach(h => {
      if (h.step !== stepInBar || !_barMidis) return;
      let midis = _barMidis;
      if (h.q) {
        const v = _voicing(_barRootPc, h.q, _barBassPc, _prevRh);
        midis = v.midis;
        _prevRh = v.rh;
      }
      GuitarAudio.playPianoChord(midis, h.len * stepDur, t, PIANO_VELOCITY * (h.vel != null ? h.vel : 1));
    });

    // 베이스 기타 — 피아노 왼손 베이스 음(_barMidis[0])의 한 옥타브 아래(E1~D#2)
    (_style.bass || []).forEach(h => {
      if (h.step === stepInBar && _barMidis) {
        const midi = (h.walk != null && _walkNotes) ? _walkNotes[h.walk] : _barMidis[0] - 12;
        GuitarAudio.playBassNote(midi, h.len * stepDur, t, BASS_VELOCITY, h.gain);
      }
    });
  }

  function _tick() {
    const ctx = _ctx();
    while (_nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const stepDur = 60 / _params().bpm / ((_style.stepsPerBar || STEPS_PER_BAR) / 4); // 1칸 = 8분음표(8칸) 또는 셋잇단 1/3박(12칸)
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
    await Promise.all([DrumAudio.ready(), GuitarAudio.pianoReady(), GuitarAudio.bassReady()]);
    if (token !== _token) return false; // 대기 중 stop()됨

    _getParams = getParams;
    _style = style;
    _styleId = STYLES[styleId] ? styleId : 'basic';
    _stepIdx = 0;
    _barMidis = null;
    _walkNotes = null;
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
    _walkNotes = null;
    _prevRh = null;
    _barEvents = [];
    _cueEvents = [];
    _lastChordIdx = -1;
    // 미래 예약된 드럼/피아노까지 전부 즉시 정리
    if (typeof DrumAudio !== 'undefined') DrumAudio.stop();
    if (typeof GuitarAudio !== 'undefined') { GuitarAudio.resetPiano(); GuitarAudio.resetBass(); }
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
  function getProgression(level, styleId) {
    const prog = _progFor(styleId, level);
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
