// ═══════════════════════════════════════════════════════════════
// chord-voicings.js  — 코드 라이브러리 보이싱 원본 데이터
// ═══════════════════════════════════════════════════════════════
//
// 줄 순서: 6번줄(저음 E) → 1번줄(고음 e)  [공백 구분 문자열]
//
// frets  : x=뮤트(×)  |  0=개방(○)  |  숫자=프렛
//          (패턴 한정)  r=근음프렛  |  r+N / r-N=상대프렛
// fingers: x=없음  |  1~4=손가락번호  |  T=엄지(Thumb)
//
// ── CHORD_STATIC ─────────────────────────────────────────────
//   형식: [ frets문자열, names배열, fingers문자열, quality문자열, fretNumber?, opts? ]
//   opts.barre : true → fingers의 1번 손가락 위치에서 바레 자동 탐지 (Rules 1/2/3)
//   opts.flat  : true → names의 샵 음이름을 플랫으로 자동 변환하여 flatName 생성
//
//   예) ['x 4 6 6 0 0', ['C#m7'], 'x 1 3 4 x x', 'm7', 5, { flat: true }]
//       ['x 2 4 4 4 2', ['F#m'],  'x 1 3 4 4 2', 'm',  2, { barre: true, flat: true }]
//
// ── CHORD_PATTERN ────────────────────────────────────────────
//   형식: { pattern, rootStr, fingers, barre, quality, fretNumber?, name? }
//   예) { pattern:'x r r+2 r+2 r+2 r', rootStr:5, fingers:'x 1 3 4 4 1',
//         barre:true, quality:'m', name:(r,flat)=>chordNoteName(1,r,flat)+'m' }

// ════════════════════════════════════════════════════════════════
// 1. 정적 보이싱
// ════════════════════════════════════════════════════════════════
window.CHORD_STATIC = [
  //          frets           names     fingers         quality  fret
  // ── C 계열 ────────────────────────────────────────────────
  ['x 3 2 0 1 0',  ['C'],    'x 3 2 x 1 x',  'M',  2],
  ['x 3 2 0 1 3',  ['C'],    'x 3 2 x 1 4',  'M',  2],
  ['x 3 1 0 1 x',  ['Cm'],    'x 4 2 x 1 x',  'm',  2],
  ['x 3 2 1 1 0',  ['Caug'],   'x 3 2 1 1 x',  'aug',  2, { barre: true }],
  ['x 3 2 1 1 x',  ['Caug'],   'x 3 2 1 1 x',  'aug',  2, { barre: true }],
  ['x 3 3 0 1 1',  ['Csus4'],    'x 3 4 x 1 1',  'sus4',  2, { barre: true }],
  ['x 3 x 0 3 3',  ['Csus2'],    'x 2 x x 3 4',  'sus2',  2],
  ['x 3 2 0 3 0',  ['Cadd9'],    'x 2 1 x 3 x',  'add9',  2],
  ['x 3 2 0 3 3',  ['Cadd9'],    'x 2 1 x 3 4',  'add9',  2],
  ['x 3 2 0 0 0',  ['CM7'],    'x 3 2 x x x',  'M7',  2],
  ['0 3 2 0 1 0',  ['C/E'],   'x 3 2 x 1 x',  'slash',  2],
  ['3 3 2 0 1 0',  ['C/G'],   '3 4 2 x 1 x',  'slash',  2],
  ['x 2 2 0 1 0',  ['C/B'],   'x 2 3 x 1 x',  'slash',  2],
  ['x 2 2 0 1 0',  ['CM7/B'],   'x 2 3 x 1 x',  'slash',  2],
  ['x 1 2 0 1 0',  ['C/Bb'],   'x 2 3 x 1 x',  'slash',  2],
  ['x 1 2 0 1 0',  ['C7/Bb'],   'x 2 3 x 1 x',  'slash',  2],
  ['x x 0 0 1 0',  ['C/D'],   'x x x x 1 x',  'hybrid',  2],
  ['x x 3 0 1 0',  ['C/F'],   'x x 3 x 1 x',  'hybrid',  2],
  ['1 x 3 0 1 0',  ['C/F'],   'T x 3 x 1 x',  'hybrid',  2],

  // ── A 계열 ────────────────────────────────────────────────
  ['x 0 2 2 2 0',  ['A'],    'x x 1 2 3 x',  'M',  2],
  ['x 0 2 2 1 0',  ['Am'],   'x x 2 3 1 x',  'm',  2],
  ['x 0 2 2 3 0',  ['Asus4'],   'x x 1 2 3 x',  'sus4',  2],
  ['x 0 2 2 0 0',  ['Asus2'],   'x x 2 3 x x',  'sus2',  2],
  ['x 0 2 4 2 0',  ['Aadd9'],   'x x 1 3 1 x',  'add9',  2, { barre: true }],
  ['x 0 2 1 2 0',  ['AM7'],   'x x 2 1 3 x',  'M7',  2],
  ['x 0 2 0 2 0',  ['A7'],   'x x 2 x 3 x',  '7',  2],
  ['x 0 2 2 2 3',  ['A7'],   'x x 1 1 1 3',  '7',  2, { barre: true }],
  ['x 0 2 0 3 0',  ['A7sus4'],   'x x 2 x 3 x',  '7sus4',  2],
  ['x 0 2 2 2 2',  ['A6'],   'x x 1 1 1 1',  '6',  2, { barre: true }],
  ['x 0 2 2 2 2',  ['A6'],   'x x 1 2 3 4',  '6',  2],
  ['x 0 2 1 1 0',  ['AmM7'],  'x x 3 2 1 x',  'm7', 2],
  ['x 0 2 0 1 0',  ['Am7'],  'x x 2 x 1 x',  'm7', 2],
  ['x 0 2 2 1 2',  ['Am6'],  'x x 2 3 1 4',  'm6', 2],
  ['x 0 1 0 1 x',  ['Am7(b5)'],  'x x 1 x 2 x',  'm7(b5)', 2],
  ['x 0 5 5 4 3',  ['Am7(b5)'],  'x x 3 4 2 1',  'm7(b5)', 4],
  ['x 0 x 5 4 3',  ['Am7(b5)'],  'x x 3 x 2 1',  'm7(b5)', 4],
  ['0 0 2 2 2 0',  ['A/E'],  'x x 1 2 3 x',  'slash', 2],
  ['0 0 2 2 2 0',  ['A/E'],  'x x 2 3 4 x',  'slash', 2],
  ['0 x 2 2 1 0',  ['Am/E'],  'x x 2 3 1 x',  'slash', 2],
  ['x 4 2 2 2 0',  ['A/C#'],  'x 3 1 1 1 x',  'slash', 3, { flat: true }],
  ['x 4 2 2 0 0',  ['Aadd9/C#'],  'x 4 2 1 x x',  'slash', 3,],
  
  // ── G 계열 ────────────────────────────────────────────────
  ['3 2 0 0 0 3',  ['G'],    '2 1 x x x 3',  'M',  2],
  ['3 2 0 0 0 3',  ['G'],    '3 2 x x x 4',  'M',  2],
  ['3 x 0 0 3 3',  ['G'],    '2 x x x 3 4',  'M',  2],
  ['3 2 0 0 1 3',  ['Gsus4'],    '3 2 x x 1 4',  'sus4',  2],
  ['3 x 0 2 0 3',  ['Gadd9'],   '3 x x 2 x 4',  'add9',  2],
  ['3 x 0 2 3 3',  ['Gadd9'],   '2 x x 1 3 4',  'add9',  2],
  ['3 2 0 0 0 2',  ['GM7'],    '3 2 x x x 1',  'M7',  2],
  ['3 2 0 0 0 1',  ['G7'],    '3 2 x x x 1',  '7',  2],
  ['3 2 0 0 0 0',  ['G6'],    '3 2 x x x x',  '6',  2],
  ['x 2 0 0 0 3',  ['G/B'],    'x 2 x x x 4',  'slash',  2],
  ['x 2 0 0 0 3',  ['G/B'],    'x 1 x x x 3',  'slash',  2],
  ['x x 0 0 0 3',  ['G/D'],    'x x x x x 3',  'slash',  2],
  ['2 x 0 0 0 3',  ['G/F#'],    '2 x x x x 4',  'slash',  2],
  ['1 x 0 0 0 3',  ['G/F'],    '1 x x x x 4',  'slash',  2],
  ['x 3 0 0 0 3',  ['G/C'],    'x 2 x x x 3',  'hybrid',  2],
  ['x 3 0 0 0 3',  ['GM7(9)'],    'x 2 x x x 3',  'tension',  2],

  // ── E 계열 ────────────────────────────────────────────────
  ['0 2 2 1 0 0',  ['E'],    'x 2 3 1 x x',  'M',  2],
  ['0 2 2 0 0 0',  ['Em'],    'x 2 3 x x x',  'm',  2],
  ['0 2 4 1 0 0',  ['Eadd9'],    'x 2 4 1 x x',  'm',  2],
  ['0 2 1 1 0 0',  ['EM7'],    'x 3 2 1 x x',  'M7',  2],
  ['0 2 0 1 0 0',  ['E7'],    'x 3 x 1 x x',  '7',  2],
  ['0 2 2 1 3 0',  ['E7'],    'x 2 3 1 4 x',  '7',  2],
  ['0 2 2 1 2 0',  ['E6'],    'x 2 3 1 4 x',  '6',  2],
  ['0 2 0 2 0 0',  ['E7sus4'],    'x 2 x 3 x x',  '7sus4',  2],
  ['0 2 2 0 3 0',  ['Em7'],    'x 1 2 x 3 x',  'm7',  2],
  ['0 2 2 0 3 3',  ['Em7'],    'x 1 2 x 3 4',  'm7',  2],
  ['0 2 2 0 3 0',  ['Em7'],    'x 2 3 x 4 x',  'm7',  2],
  ['x x 2 0 3 0',  ['Em7'],    'x x 1 x 3 x',  'm7',  2],
  ['x x 2 0 3 3',  ['Em7'],    'x x 1 x 3 4',  'm7',  2],

  // ── D 계열 ────────────────────────────────────────────────
  ['x x 0 2 3 2',  ['D'],    'x x x 2 3 1',  'M',  2],
  ['x x 0 2 3 2',  ['D'],    'x x x 1 3 2',  'M',  2],
  ['x x 0 2 3 1',  ['Dm'],    'x x x 2 3 1',  'm',  2],
  ['x x 0 2 3 0',  ['Dsus2'],    'x x x 2 3 x',  'sus2',  2],
  ['x x 0 2 3 3',  ['Dsus4'],    'x x x 1 3 4',  'sus4',  2],
  ['x x 0 2 2 2',  ['DM7'],    'x x x 1 1 1',  'M7',  2, { barre: true }],
  ['x x 0 2 2 2',  ['DM7'],    'x x x 1 2 3',  'M7',  2],
  ['x x 0 2 1 2',  ['D7'],    'x x x 2 1 3',  '7',  2],
  ['x x 0 2 1 3',  ['D7sus4'],    'x x x 2 1 4',  '7sus4',  2],
  ['x x 0 2 1 1',  ['Dm7'],    'x x x 2 1 1',  'm7',  2, { barre: true }],
  ['x x 0 1 1 1',  ['Dm7(b5)'],    'x x x 1 1 1',  'm7(b5)',  2, { barre: true }],
  ['x x 0 1 0 1',  ['Ddim7'],    'x x x 1 x 2',  'dim7',  2],
  ['2 x 0 2 3 2',  ['D/F#'],    'T x x 2 3 1',  'slash',  2],
  ['2 x 0 2 3 2',  ['D/F#'],    'T x x 1 3 2',  'slash',  2],
  ['x 0 0 2 3 2',  ['D/A'],    'x x x 2 3 1',  'slash',  2],
  ['x 0 0 2 3 2',  ['D/A'],    'x x x 1 3 2',  'slash',  2],

  // ── 어쿠스틱 보이싱 ────────────────────────────────────────────────
  ['0 7 9 9 0 0',  ['E'],    'x 1 3 4 x x',  'M',  8],
  ['0 x 9 9 0 0',  ['E'],    'x x 3 4 x x',  'M',  9],
  ['0 7 9 8 0 0',  ['EM7'],    'x 1 3 2 x x',  'M7',  8],
  ['0 7 9 7 0 0',  ['E7'],    'x 1 3 1 x x',  '7',  8, { barre: true }],
  ['0 7 6 7 0 0',  ['E7'],    'x 2 1 3 x x',  '7',  7],

  ['x 0 9 9 0 0',  ['Asus2'],    'x x 3 4 x x',  'sus2',  9],
  ['x 0 9 8 0 0',  ['AM7(9)'],    'x x 3 2 x x',  'tension',  9],
  ['x 0 6 6 0 0',  ['AM7'],    'x x 2 3 x x',  'M7',  6],
  ['5 7 7 6 0 0',  ['Aadd9'],    '1 3 4 2 x x',  'add9',  6],

  ['x 5 4 0 3 0',  ['Dadd9(11)'],    'x 3 2 x 1 x',  'tension',  4],
  ['x 5 7 7 0 0',  ['Dadd9'],    'x 1 3 4 x x',  'add9',  6],

  ['x 3 5 5 0 0',  ['CM7'],    'x 1 3 4 x x',  'M7',  4],
  ['x 4 6 6 0 0',  ['C#m7'],    'x 1 3 4 x x',  'm7',  5, { flat: true }],

  ['x 2 4 4 0 0',  ['Bsus4'],    'x 1 3 4 x x',  'sus4',  3],
  ['7 x 7 7 0 0',  ['Bm7(11)'],    '1 x 2 3 x x',  'tension',  7],

  ['2 x 2 2 0 0',  ['F#m7(11)'],    '1 x 2 3 x x',  'tension',  2, { flat: true }],
  ['4 x 4 4 0 0',  ['Esus2/G#'],    '1 x 2 3 x x',  'slash',  4, { flat: true }],

];

// ════════════════════════════════════════════════════════════════
// 2. 패턴 보이싱
// ════════════════════════════════════════════════════════════════
window.CHORD_PATTERN = [

  // ── name 함수 작성 가이드 (분수코드 등 코드명이 복잡할 때) ───────
  //   chordNoteName(si, fret, flat) → 음이름  |  r값의 위치는 코드 프레임의 첫번쨰 프랫
  //   
  //   예) E형 분수코드  근음=6번줄 r프렛 / 베이스=3번줄 r+1프렛
  //   name: (r, flat) => chordNoteName(0, r, flat) + '/' + chordNoteName(3, r + 1, flat)
  //   quailty 값 : 'M' | 'm' | 'M7' | '7' | 'm7' | 'sus4' | '7sus4' | 'add9' | 'sus2' | 'aug' | 'dim' | 'aug7' | 'dim7' | 'm7(b5)' | '6' | 'm6' | 'slash' | 'hybrid' | 'tension'
  // ── Triad 코드 ─────────────────────────────────────
  // Major 코드
  { pattern: 'r r+2 r+2 r+1 r r', rootStr: 6, fingers: '1 3 4 2 1 1', barre: true, quality: 'M', name: (r, flat) => chordNoteName(0, r, flat)},
  { pattern: 'x r r+2 r+2 r+2 r', rootStr: 5, fingers: 'x 1 2 3 4 1', barre: true, quality: 'M', name: (r, flat) => chordNoteName(1, r, flat)},
  { pattern: 'x x r r+2 r+3 r+2', rootStr: 4, fingers: 'x x 1 2 4 3', barre: true, quality: 'M', name: (r, flat) => chordNoteName(2, r, flat)},

  // minor 코드
  { pattern: 'r r+2 r+2 r r r', rootStr: 6, fingers: '1 3 4 1 1 1', barre: true, quality: 'm', name: (r, flat) => chordNoteName(0, r, flat) + 'm'},
  { pattern: 'x r r+2 r+2 r+1 r', rootStr: 5, fingers: 'x 1 2 4 3 1', barre: true, quality: 'm', name: (r, flat) => chordNoteName(1, r, flat) + 'm'},
  { pattern: 'x x r r+2 r+3 r+1', rootStr: 4, fingers: 'x x 1 3 4 2', barre: true, quality: 'm', name: (r, flat) => chordNoteName(2, r, flat) + 'm'},

  // sus4 코드
  { pattern: 'r r+2 r+2 r+2 r r', rootStr: 6, fingers: '1 2 3 4 1 1', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(0, r, flat) + 'sus4'},
  { pattern: 'x r r+2 r+2 r+3 r', rootStr: 5, fingers: 'x 1 2 3 4 1', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(1, r, flat) + 'sus4'},
  { pattern: 'x x r r+2 r+3 r+3', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(2, r, flat) + 'sus4'},

  // sus2 코드
  { pattern: 'x r r+2 r+2 r r', rootStr: 5, fingers: 'x 1 3 4 1 1', barre: true, quality: 'sus2', name: (r, flat) => chordNoteName(1, r, flat) + 'sus2'},
  { pattern: 'x x r r+2 r+3 r', rootStr: 4, fingers: 'x x 1 3 4 1', barre: true, quality: 'sus2', name: (r, flat) => chordNoteName(2, r, flat) + 'sus2'},

  // ── 7th 코드 ─────────────────────────────────────
  // M7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r+1 r+1 r r', rootStr: 6, fingers: '1 4 2 3 1 1', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'x r r+2 r+1 r+2 r', rootStr: 5, fingers: 'x 1 3 2 4 1', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(1, r, flat) + 'M7'},
  { pattern: 'x x r r+2 r+2 r+2', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(2, r, flat) + 'M7'},
  // 쉘 보이싱
  { pattern: 'r x r+1 r+1 r x', rootStr: 6, fingers: '1 x 2 3 1 x', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'r x r+1 r+1 r x', rootStr: 6, fingers: 'T x 2 3 1 x', barre: false, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'x r r+2 r+1 r+2 x', rootStr: 5, fingers: 'x 1 2 3 4 x', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(1, r, flat) + 'M7'},

  // dom.7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r+1 r r', rootStr: 6, fingers: '1 3 1 2 1 1', barre: true, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'x r r+2 r r+2 r', rootStr: 5, fingers: 'x 1 3 1 4 1', barre: true, quality: '7', name: (r, flat) => chordNoteName(1, r, flat) + '7'},
  { pattern: 'x x r r+2 r+1 r+2', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: '7', name: (r, flat) => chordNoteName(2, r, flat) + '7'},
  // 쉘 보이싱
  { pattern: 'r x r r+1 r x', rootStr: 6, fingers: '1 x 1 2 1 x', barre: true, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'r x r r+1 r x', rootStr: 6, fingers: 'T x 2 3 1 x', barre: false, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'x r+2 r+1 r+2 r x', rootStr: 5, fingers: 'x 3 2 4 1 x', barre: true, quality: '7', name: (r, flat) => chordNoteName(1, r+2, flat) + '7'},

  // 6 코드
  { pattern: 'r+1 x r r+2 r+1 x', rootStr: 6, fingers: '2 x 1 4 3 x', barre: false, quality: '6', name: (r, flat) => chordNoteName(0, r+1, flat) + '6'},
  { pattern: 'x r+2 r+1 r+1 r x', rootStr: 5, fingers: 'x 4 2 3 1 x', barre: false, quality: '6', name: (r, flat) => chordNoteName(1, r+2, flat) + '6'},
  { pattern: 'x r x r+2 r+2 r+2', rootStr: 5, fingers: 'x 1 x 2 3 4', barre: false, quality: '6', name: (r, flat) => chordNoteName(1, r, flat) + '6'},
  { pattern: 'x x r r+2 r r+2', rootStr: 4, fingers: 'x x 1 3 1 4', barre: true, quality: '6', name: (r, flat) => chordNoteName(2, r, flat) + '6'},

  // 7sus4 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r+2 r r', rootStr: 6, fingers: '1 3 1 4 1 1', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(0, r, flat) + '7sus4'},
  { pattern: 'x r r+2 r r+3 r', rootStr: 5, fingers: 'x 1 3 1 4 1', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(1, r, flat) + '7sus4'},
  { pattern: 'x x r r+2 r+1 r+3', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(2, r, flat) + '7sus4'},


  // mM7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r+1 r r r', rootStr: 6, fingers: '1 3 2 1 1 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(0, r, flat) + 'mM7'},
  { pattern: 'r+1 x r+2 r+1 r+1 x', rootStr: 6, fingers: 'T x 3 2 1 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'mM7'},
  { pattern: 'x r r+2 r+1 r+1 r', rootStr: 5, fingers: 'x 1 4 2 3 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(1, r, flat) + 'mM7'},
  { pattern: 'x x r r+2 r+2 r+1', rootStr: 4, fingers: 'x x 1 3 4 2', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(2, r, flat) + 'mM7'},

  // m7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r r r', rootStr: 6, fingers: '1 3 1 1 1 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(0, r, flat) + 'm7'},
  { pattern: 'r r+2 r+2 r r+3 r', rootStr: 6, fingers: '1 2 3 1 4 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(0, r, flat) + 'm7'},
  { pattern: 'x r r+2 r r+1 r', rootStr: 5, fingers: 'x 1 3 1 2 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(1, r, flat) + 'm7'},
  { pattern: 'x x r r+2 r+1 r+1', rootStr: 4, fingers: 'x x 1 4 2 3', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(2, r, flat) + 'm7'},
  // 쉘 보이싱
  { pattern: 'r+1 x r+1 r+1 r+1 x', rootStr: 6, fingers: '1 x 2 3 4 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7'},
  { pattern: 'r+1 x r+1 r+1 r+1 x', rootStr: 6, fingers: 'T x 2 3 4 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7'},
  { pattern: 'x r+1 x r+1 r+2 x', rootStr: 5, fingers: 'x 1 x 2 3 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm7'},

  // m6 코드
  { pattern: 'r+1 x r r+1 r+1 x', rootStr: 6, fingers: '2 x 1 3 4 x', barre: false, quality: 'm6', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm6'},
  { pattern: 'x r+1 x r r+2 r+1', rootStr: 5, fingers: 'x 2 x 1 4 3', barre: false, quality: 'm6', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm6'},
  { pattern: 'x x r r+2 r r+1', rootStr: 4, fingers: 'x x 1 3 1 2', barre: true, quality: 'm6', name: (r, flat) => chordNoteName(2, r, flat) + 'm6'},

  // m7(b5) 코드 쉘 보이싱
  { pattern: 'r+1 x r+1 r+1 r x', rootStr: 6, fingers: '2 x 3 4 1 x', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7(b5)'},
  { pattern: 'x r+1 r+2 r+1 r+2 x', rootStr: 5, fingers: 'x 1 3 2 4 x', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm7(b5)'},
  { pattern: 'x x r+1 r+2 r+2 r+2', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(2, r+1, flat) + 'm7(b5)'},

  // dim7 코드 쉘 보이싱
  { pattern: 'r+2 x r+1 r+2 r+1 x', rootStr: 6, fingers: '2 x 1 3 1 x', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(0, r+2, flat) + 'dim7'}, // -> 바레 적용 안되고 있음.
  { pattern: 'x r+1 r+2 r r+2 x', rootStr: 5, fingers: 'x 2 3 1 4 x', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(1, r+1, flat) + 'dim7'},
  { pattern: 'x x r+1 r+2 r+1 r+2', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(2, r+1, flat) + 'dim7'},

  // ── 전위 코드 ─────────────────────────────────────
  // 1전위 코드 (C/E)
  { pattern: 'r+2 x r r+2 r+3 x', rootStr: 6, fingers: '2 x 1 3 4 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(2, r, flat) + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'r+1 x x r+1 r+2 r+1', rootStr: 6, fingers: 'T x x 2 3 1', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+2, flat) + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'x r+2 r r r x', rootStr: 5, fingers: 'x 3 1 1 1 x', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r, flat) + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x r+2 r r r r+3', rootStr: 5, fingers: 'x 3 1 1 1 4', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r, flat) + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x r r+3 r+2 r+1 x', rootStr: 5, fingers: 'x 1 4 3 2 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(2, r+3, flat) + '/' + chordNoteName(1, r, flat)},
  { pattern: 'x x r+2 r r+1 r', rootStr: 4, fingers: 'x x 3 1 2 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(4, r+1, flat) + '/' + chordNoteName(2, r+2, flat)},
  // 1전위 코드 (Cm/Eb)
  { pattern: 'r+1 x r r+2 r+3 x', rootStr: 6, fingers: '2 x 1 3 4 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+3, flat) + 'm' + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'x r+2 r+1 r+1 r x', rootStr: 5, fingers: 'x 4 2 3 1 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(3, r+1, flat) + 'm' + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x x r+2 r+1 r+2 r', rootStr: 4, fingers: 'x x 3 2 4 1', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(2, r+2, flat)},

  // 2전위 코드 (C/G) 
  { pattern: 'r x r+2 r+2 r+2 r', rootStr: 6, fingers: '1 x 2 3 4 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r+2, flat) + '/' + chordNoteName(0, r, flat)},
  { pattern: 'x r+2 r+2 r+1 r r', rootStr: 5, fingers: 'x 3 4 2 1 1', barre: true, quality: 'slashM', name: (r, flat) => chordNoteName(5, r, flat) + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x x r+2 r+2 r+2 r', rootStr: 4, fingers: 'x x 2 3 4 1', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(3, r+2, flat) + '/' + chordNoteName(2, r+2, flat)},
  // 2전위 코드 (Cm/G)
  { pattern: 'r x r+2 r+2 r+1 r', rootStr: 6, fingers: '1 x 3 4 2 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(0, r, flat)},
  { pattern: 'r x r+2 r+2 r+1 r', rootStr: 6, fingers: '1 x 3 4 2 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + '7sus4' + '(b13)'},
  { pattern: 'x r+2 r+2 r r r', rootStr: 5, fingers: 'x 3 4 1 1 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(5, r, flat) + 'm' + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x r x r+2 r+3 r+1', rootStr: 5, fingers: 'x 1 x 3 4 2', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+3, flat) + 'm' + '/' + chordNoteName(1, r, flat)},
  { pattern: 'x x r+2 r+2 r+1 r', rootStr: 4, fingers: 'x x 3 4 2 1', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(2, r+2, flat)},

  // 3전위 코드 (C/B or CM7/B)
  { pattern: 'r+2 x r r r x', rootStr: 6, fingers: '3 x 1 1 1 x', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r, flat) + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'x r+2 x r r+1 r', rootStr: 5, fingers: 'x 3 x 1 2 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(4, r+1, flat) + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x x r+1 r+1 r r', rootStr: 4, fingers: 'x x 2 3 1 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(5, r, flat) + '/' + chordNoteName(2, r+1, flat)},
  // 3전위 코드 (C/Bb or C7/Bb)
  { pattern: 'r+2 x r+1 r+1 r+1 x', rootStr: 6, fingers: '2 x 1 1 1 x', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(3, r+1, flat) + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'x r+2 x r+1 r+2 r+1', rootStr: 5, fingers: 'x 2 x 1 3 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(4, r+2, flat) + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x x r+1 r+2 r+1 r+1', rootStr: 4, fingers: 'x x 1 2 1 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(5, r+1, flat)  + '/' + chordNoteName(2, r+1, flat)},
  // 3전위 코드 (Cm/Bb or Cm7/Bb)
  { pattern: 'r+2 x r+1 r+1 r x', rootStr: 6, fingers: '4 x 2 3 1 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(3, r+1, flat) + 'm' + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'x r+2 x r+1 r+2 r', rootStr: 5, fingers: 'x 3 x 2 4 1', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x r+1 r+1 r r+1 x', rootStr: 5, fingers: 'x 2 3 1 4 x', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(4, r+1, flat) + 'm' + '/' + chordNoteName(1, r+1, flat)},
  { pattern: 'x x r+1 r+1 r+1 r+1', rootStr: 4, fingers: 'x x 1 1 1 1', barre: true, quality: 'slash', name: (r, flat) => chordNoteName(5, r+1, flat) + 'm' + '/' + chordNoteName(2, r+1, flat)},
  { pattern: 'x x r+1 r+1 r+1 r+1', rootStr: 4, fingers: 'x x 1 2 3 4', barre: false, quality: 'slash', name: (r, flat) => chordNoteName(5, r+1, flat) + 'm' + '/' + chordNoteName(2, r+1, flat)},

  // ── 하이브리드 코드(미완성) ─────────────────────────────────────
  // C/D or D7sus4(9) 코드
  { pattern: 'r+2 x r+2 r+1 r x', rootStr: 6, fingers: '3 x 4 2 1 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(2, r+2, flat) + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'r+2 x r+2 r+1 r x', rootStr: 6, fingers: '3 x 4 2 1 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(0, r+2, flat) + '7sus4' + '(9)'},
  { pattern: 'x r+1 r+1 r+1 r+1 x', rootStr: 5, fingers: 'x 1 2 3 4 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+1, flat) + '/' + chordNoteName(1, r+1, flat)},
  { pattern: 'x r+1 r+1 r+1 r+1 x', rootStr: 5, fingers: 'x 1 1 1 1 x', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+1, flat) + '/' + chordNoteName(1, r+1, flat)},
  { pattern: 'x r+1 r+1 r+1 r+1 x', rootStr: 5, fingers: 'x 1 2 3 4 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+1, flat) + '7sus4' + '(9)'},
  { pattern: 'x r+1 r+1 r+1 r+1 x', rootStr: 5, fingers: 'x 1 1 1 1 x', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r+1, flat) + '7sus4' + '(9)'},
  { pattern: 'x x r+1 r+1 r+2 r+1', rootStr: 4, fingers: 'x x 1 1 2 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + '/' + chordNoteName(2, r+1, flat)},
  { pattern: 'x x r+1 r+1 r+2 r+1', rootStr: 4, fingers: 'x x 1 1 2 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(2, r+1, flat) + '7sus4' + '(9)'},
  // C/F
  { pattern: 'r+1 x x r r+1 r', rootStr: 6, fingers: '2 x x 1 3 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+1, flat) + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'r+1 x r+2 r r+1 r', rootStr: 6, fingers: '2 x 4 1 3 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+1, flat) + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'x r r+2 r+1 r r', rootStr: 5, fingers: 'x 1 3 2 1 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(2, r+2, flat) + '/' + chordNoteName(1, r, flat)},
  { pattern: 'x x r r+2 r+2 r', rootStr: 4, fingers: 'x x 1 3 4 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + '/' + chordNoteName(2, r, flat)},
  // Cm/Db
  { pattern: 'r+1 x r+2 r r r', rootStr: 6, fingers: '2 x 3 1 1 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(5, r, flat) + 'm' + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'r+1 x x r r r', rootStr: 6, fingers: '2 x x 1 1 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(5, r, flat) + 'm' + '/' + chordNoteName(0, r+1, flat)},
  { pattern: 'x r+1 r+2 r+2 r+1 x', rootStr: 5, fingers: 'x 1 3 4 2 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(1, r+1, flat)},
  { pattern: 'x r+1 x r+2 r+1 r', rootStr: 5, fingers: 'x 2 x 4 3 1', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(1, r+1, flat)},
  { pattern: 'x x r r+1 r+2 r', rootStr: 4, fingers: 'x x 1 2 3 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(2, r, flat)},
  // Cm/D
  { pattern: 'r+2 x r+2 r r r', rootStr: 6, fingers: '3 x 4 1 1 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(5, r, flat) + 'm' + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'x r+2 r+2 r+2 r+1 x', rootStr: 5, fingers: 'x 2 3 4 1 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x r+2 x r+2 r+1 r', rootStr: 5, fingers: 'x 3 x 4 2 1', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(1, r+2, flat)},
  { pattern: 'x x r+1 r+1 r+2 r', rootStr: 4, fingers: 'x x 1 2 3 1', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(2, r+1, flat)},
  // Cm/F
  { pattern: 'r+2 x r+2 r+1 r+2 x', rootStr: 6, fingers: 'T x 2 1 3 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'r+2 x r+2 r+1 r+2 x', rootStr: 6, fingers: '2 x 3 1 4 x', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'r+2 x x r+1 r+2 r', rootStr: 6, fingers: '3 x x 2 4 1', barre: false, quality: 'hybrid', name: (r, flat) => chordNoteName(4, r+2, flat) + 'm' + '/' + chordNoteName(0, r+2, flat)},
  { pattern: 'x r r+2 r r r', rootStr: 5, fingers: 'x 1 3 1 1 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(5, r, flat) + 'm' + '/' + chordNoteName(1, r, flat)},
  { pattern: 'x x r r+2 r+1 r', rootStr: 4, fingers: 'x x 1 3 2 1', barre: true, quality: 'hybrid', name: (r, flat) => chordNoteName(3, r+2, flat) + 'm' + '/' + chordNoteName(2, r, flat)},
  // 

  // ── 텐션 코드(미완성) ─────────────────────────────────────
  // CM7(9)
  { pattern: 'r x r+1 r+1 r r+2', rootStr: 6, fingers: 'T x 2 3 1 4', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + 'M7' + '(9)'},
  { pattern: 'x r+1 r r+2 r+1 x', rootStr: 5, fingers: 'x 2 1 4 3 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+1, flat) + 'M7' + '(9)'},
  { pattern: 'x r r+2 r+1 r r', rootStr: 5, fingers: 'x 1 3 2 1 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + 'M7' + '(9)'},
  { pattern: 'x x r r+2 r+2 r', rootStr: 4, fingers: 'x x 1 3 4 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(2, r, flat) + 'M7' + '(9)'},
  // Cm7(9)
  { pattern: 'r r+2 r r r r+2', rootStr: 6, fingers: '1 3 1 1 1 4', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + 'm7' + '(9)'},
  { pattern: 'x r+2 r r+2 r+2 x', rootStr: 5, fingers: 'x 2 1 3 4 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+2, flat) + 'm7' + '(9)'},
  { pattern: 'x x r+2 r r+3 r+2', rootStr: 4, fingers: 'x x 2 1 4 3', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(2, r+2, flat) + 'm7' + '(9)'},
  // Cm7(11)
  { pattern: 'r+2 x r+2 r+2 r x', rootStr: 6, fingers: '2 x 3 4 1 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(0, r+2, flat) + 'm7' + '(11)'},
  { pattern: 'r+2 x r+2 r+2 r r', rootStr: 6, fingers: '2 x 3 4 1 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r+2, flat) + 'm7' + '(11)'},
  { pattern: 'x r+2 x r+2 r+3 r', rootStr: 5, fingers: 'x 2 x 3 4 1', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+2, flat) + 'm7' + '(11)'},
  // C7(b9)
  { pattern: 'r x r r+1 r r+1', rootStr: 6, fingers: '1 x 1 2 1 3', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + '7' + '(b9)'},
  { pattern: 'x r+2 r+1 r+2 r+1 x', rootStr: 5, fingers: 'x 2 1 3 1 x', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r+2, flat) + '7' + '(b9)'},
  { pattern: 'x r+2 r+1 r+2 r+1 x', rootStr: 5, fingers: 'x 3 2 4 1 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+2, flat) + '7' + '(b9)'},
  { pattern: 'x x r+1 r r+2 r', rootStr: 4, fingers: 'x x 2 1 3 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(2, r+1, flat) + '7' + '(b9)'},
  // C7(9)
  { pattern: 'r x r r+1 r r+2', rootStr: 6, fingers: 'T x 2 3 1 4', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + '7' + '(9)'},
  { pattern: 'x r+1 r r+1 r+1 x', rootStr: 5, fingers: 'x 2 1 3 4 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+1, flat) + '7' + '(9)'},
  { pattern: 'x r r+2 r r r', rootStr: 5, fingers: 'x 1 3 1 1 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + '7' + '(9)'},
  { pattern: 'x x r r+2 r+1 r', rootStr: 4, fingers: 'x x 1 3 2 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(2, r, flat) + '7' + '(9)'},
  { pattern: 'x x r+1 r r+2 r+1', rootStr: 4, fingers: 'x x 2 1 4 3', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(2, r+1, flat) + '7' + '(9)'},
  // C7(#9)
  { pattern: 'r r+2 r r+1 r r+3', rootStr: 6, fingers: '1 3 1 2 1 4', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + '7' + '(#9)'},
  { pattern: 'x r+1 r r+1 r+2 x', rootStr: 5, fingers: 'x 2 1 3 4 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(1, r+1, flat) + '7' + '(#9)'},
  { pattern: 'x x r+1 r r+2 r+2', rootStr: 4, fingers: 'x x 2 1 3 4', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(2, r+1, flat) + '7' + '(#9)'},
  // C7(#11)
  { pattern: 'r+1 x r+1 r+2 r x', rootStr: 6, fingers: 'T x 2 3 1 x', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(0, r+1, flat) + '7' + '(#11)'},
  { pattern: 'x r r+1 r r+2 x', rootStr: 5, fingers: 'x 1 2 1 3 x', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + '7' + '(#11)'},
  { pattern: 'x x r r+1 r+1 r+2', rootStr: 4, fingers: 'x x 1 2 3 4', barre: false, quality: 'tension', name: (r, flat) => chordNoteName(2, r, flat) + '7' + '(#11)'},
  // C7(b13)
  { pattern: 'r+1 x r+1 r+2 r+1 r+2', rootStr: 6, fingers: '1 x 1 2 1 3', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r+1, flat) + '7' + '(b13)'},
  { pattern: 'x r r+2 r r+2 r+1', rootStr: 5, fingers: 'x 1 3 1 4 2', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + '7' + '(b13)'},
  { pattern: 'x r x r r+2 r+1', rootStr: 5, fingers: 'x 1 x 1 4 2', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + '7' + '(b13)'},
  // C7(13)
  { pattern: 'r r+2 r r+1 r+2 r', rootStr: 6, fingers: '1 3 1 2 4 1', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(0, r, flat) + '7' + '(13)'},
  { pattern: 'x r x r r+2 r+2', rootStr: 5, fingers: 'x 1 x 1 3 4', barre: true, quality: 'tension', name: (r, flat) => chordNoteName(1, r, flat) + '7' + '(13)'},

  // ──Drop 보이싱(미완성) ─────────────────────────────────────

  // 여기에 추가 ↓
 
];
