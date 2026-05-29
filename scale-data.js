// ═══════════════════════════════════════════════════════════════
// scale-data.js — 스케일 블럭 라이브러리
// ═══════════════════════════════════════════════════════════════
//
// ▶ grid 작성 규칙
//   - 6행 × 7열 고정  (행: 1번줄→6번줄 위→아래 / 열: startFret→+6)
//   - '.'  = 빈칸
//   - '1'  = 근음 (root)
//   - '2'~'7' = 스케일 음계 (장음계 기준 2도~7도)
//   - 'b2'~'b7' = 플랫 음계 (단음계 기준, 예: b3=단3도, b7=단7도)
//   - 셀 구분은 공백으로
//
// ▶ anchor (키 자동 계산 기준)
//   - 가장 위쪽 줄(음역대 높은 쪽)에서 첫 번째 '1'을 자동 선택
//   - startFret = 해당키의_anchor줄_프랫 − anchorCol
//
// ▶ 12키 계산용 표준 튜닝 (스탠다드)
//   index 0 = 1번줄(high E), ..., index 5 = 6번줄(low E)
//   C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
//
// ═══════════════════════════════════════════════════════════════

const STANDARD_TUNING = [4, 11, 7, 2, 9, 4]; // E B G D A E
const FRETS_VISIBLE   = 7;
const TOTAL_FRETS     = 21; // 0~20 프랫

// ── 스케일 블럭 데이터 ───────────────────────────────────────
const SCALE_BLOCKS = {

  // ── 메이저 스케일 ──────────────────────────────────────────
  'major': [
    {
      id: 'major-pos1',
      grid: [
        '. . 5 . 6 . .',   // 1번줄
        '. . 2 . 3 4 .',   // 2번줄
        '. 6 . 7 1 . .',   // 3번줄
        '. 3 4 . 5 . .',   // 4번줄
        '. 7 1 . 2 . .',   // 5번줄
        '. . 5 . 6 . .',   // 6번줄
      ]
    },
    {
      id: 'major-pos2',
      grid: [
        '. . 6 . 7 1 .',   // 1번줄
        '. . 3 4 . 5 .',   // 2번줄
        '. 7 1 . 2 . .',   // 3번줄
        '. . 5 . 6 . .',   // 4번줄
        '. . 2 . 3 4 .',   // 5번줄
        '. . 6 . 7 1 .',   // 6번줄
      ]
    },
    {
      id: 'major-pos3',
      grid: [
        '. 7 1 . 2 . .',   // 1번줄
        '. . 5 . 6 . .',   // 2번줄
        '. 2 . 3 4 . .',   // 3번줄
        '. 6 . 7 1 . .',   // 4번줄
        '. 3 4 . 5 . .',   // 5번줄
        '. 7 1 . 2 . .',   // 6번줄
      ]
    },
    {
      id: 'major-pos4',
      grid: [
        '. . 2 . 3 . .',   // 1번줄
        '. . 6 . 7 1 .',   // 2번줄
        '. 3 4 . 5 . .',   // 3번줄
        '. 7 1 . 2 . .',   // 4번줄
        '. . 5 . 6 . .',   // 5번줄
        '. . 2 . 3 4 .',   // 6번줄
      ]
    },
    {
      id: 'major-pos5',
      grid: [
        '. 3 4 . 5 . .',   // 1번줄
        '. 7 1 . 2 . .',   // 2번줄
        '. 5 . 6 . . .',   // 3번줄
        '. 2 . 3 4 . .',   // 4번줄
        '. 6 . 7 1 . .',   // 5번줄
        '. 3 4 . 5 . .',   // 6번줄
      ]
    },
  ],

  // ── 마이너 펜타토닉 스케일 ────────────────────────────────
  'pentatonic': [
    {
      id: 'pentatonic-gm',
      label: '마이너 펜타토닉 스케일 Gm폼',
      grid: [
        '. . b7 . 1 . .',   // 1번줄
        '. . 4 . 5 . .',    // 2번줄
        '. 1 . . b3 . .',   // 3번줄
        '. 5 . . b7 . .',   // 4번줄
        '. . b3 . 4 . .',   // 5번줄
        '. . b7 . 1  .',   // 6번줄
      ]
    },
    {
      id: 'pentatonic-am',
      label: '마이너 펜타토닉 스케일 Am폼',
      grid: [
        '. 5 . . b7 . .',   // 1번줄
        '. . b3 . 4 . .',   // 2번줄
        '. b7 . 1 . . .',   // 3번줄
        '. 4 . 5 . . .',    // 4번줄
        '. 1 . . b3 . .',   // 5번줄
        '. 5 . . b7  .',   // 6번줄
      ]
    },
    {
      id: 'pentatonic-cm',
      label: '마이너 펜타토닉 스케일 Cm폼',
      grid: [
        '. . 4 . 5 . .',    // 1번줄
        '. . 1 . . b3 .',   // 2번줄
        '. 5 . . b7 . .',   // 3번줄
        '. . b3 . 4 . .',   // 4번줄
        '. . b7 . 1 . .',   // 5번줄
        '. . 4 . 5 . .',    // 6번줄
      ]
    },
    {
      id: 'pentatonic-dm',
      label: '마이너 펜타토닉 스케일 Dm폼',
      grid: [
        '. . b3 . 4 . .',   // 1번줄
        '. . b7 . 1 . .',   // 2번줄
        '. 4 . 5 . . .',    // 3번줄
        '. 1 . . b3 . .',   // 4번줄
        '. 5 . . b7 . .',   // 5번줄
        '. . b3 . 4 . .',   // 6번줄
      ]
    },
    {
      id: 'pentatonic-em',
      label: '마이너 펜타토닉 스케일 Em폼',
      grid: [
        '. . 1 . . b3 .',   // 1번줄
        '. . 5 . . b7 .',   // 2번줄
        '. . b3 . 4 . .',   // 3번줄
        '. . b7 . 1 . .',   // 4번줄
        '. . 4 . 5 . .',    // 5번줄
        '. . 1 . . b3 .',   // 6번줄
      ]
    },
  ],

  // ── 마이너 블루스 스케일 ───────────────────────────────────
  'blues': [
    {
      id: 'blues-gm',
      label: '마이너 블루스 스케일 Gm폼',
      grid: [
        '. . b7 . 1 . .',    // 1번줄
        '. . 4 b5 5 . .',    // 2번줄
        '. 1 . . b3 . .',    // 3번줄
        '. 5 . . b7 . .',    // 4번줄
        '. . b3 . 4 b5 .',   // 5번줄
        '. . b7 . 1  .',     // 6번줄
      ]
    },
    {
      id: 'blues-am',
      label: '마이너 블루스 스케일 Am폼',
      grid: [
        '. 5 . . b7 . .',    // 1번줄
        '. . b3 . 4 b5 .',   // 2번줄
        '. b7 . 1 . . .',    // 3번줄
        '. 4 b5 5 . . .',    // 4번줄
        '. 1 . . b3 . .',    // 5번줄
        '. 5 . . b7  .',     // 6번줄
      ]
    },
    {
      id: 'blues-cm',
      label: '마이너 블루스 스케일 Cm폼',
      grid: [
        '. . 4 b5 5 . .',    // 1번줄
        '. . 1 . . b3 .',    // 2번줄
        '. 5 . . b7 . .',    // 3번줄
        '. . b3 . 4 b5 .',   // 4번줄
        '. . b7 . 1 . .',    // 5번줄
        '. . 4 b5 5 . .',    // 6번줄
      ]
    },
    {
      id: 'blues-dm',
      label: '마이너 블루스 스케일 Dm폼',
      grid: [
        '. . b3 . 4 b5 .',   // 1번줄
        '. . b7 . 1 . .',    // 2번줄
        '. 4 b5 5 . . .',    // 3번줄
        '. 1 . . b3 . .',    // 4번줄
        '. 5 . . b7 . .',    // 5번줄
        '. . b3 . 4 b5 .',   // 6번줄
      ]
    },
    {
      id: 'blues-em',
      label: '마이너 블루스 스케일 Em폼',
      grid: [
        '. . 1 . . b3 .',    // 1번줄
        '. . 5 . . b7 .',    // 2번줄
        '. . b3 . 4 b5 .',   // 3번줄
        '. . b7 . 1 . .',    // 4번줄
        '. . 4 b5 5 . .',    // 5번줄
        '. . 1 . . b3 .',    // 6번줄
      ]
    },
  ],

  // ── 내추럴 마이너 스케일 ───────────────────────────────────
  'natural-minor': [
    {
      id: 'natural-minor-gm',
      label: '내추럴 마이너 스케일 Gm폼',
      grid: [
        '. . b7 . 1 . .',    // 1번줄
        '. . 4 . 5 b6 .',   // 2번줄
        '. 1 . 2 b3 . .',   // 3번줄
        '. 5 b6 . b7 . .',  // 4번줄
        '. 2 b3 . 4 . .',   // 5번줄
        '. . b7 . 1 . .',   // 6번줄
      ]
    },
    {
      id: 'natural-minor-em',
      label: '내추럴 마이너 스케일 Em폼',
      grid: [
        '. . 1 . 2 b3 .',   // 1번줄
        '. . 5 b6 . b7 .',  // 2번줄
        '. 2 b3 . 4 . .',   // 3번줄
        '. . b7 . 1 . .',   // 4번줄
        '. . 4 . 5 b6 .',   // 5번줄
        '. . 1 . 2 b3 .',   // 6번줄
      ]
    },
    {
      id: 'natural-minor-dm',
      label: '내추럴 마이너 스케일 Dm폼',
      grid: [
        '. 2 b3 . 4 . .',   // 1번줄
        '. . b7 . 1 . .',   // 2번줄
        '. 4 . 5 b6 . .',   // 3번줄
        '. 1 . 2 b3 . .',   // 4번줄
        '. 5 b6 . b7 . .',  // 5번줄
        '. 2 b3 . 4 . .',   // 6번줄
      ]
    },
    {
      id: 'natural-minor-cm',
      label: '내추럴 마이너 스케일 Cm폼',
      grid: [
        '. . 4 . 5 . .',    // 1번줄
        '. . 1 . 2 b3 .',   // 2번줄
        '. 5 b6 . b7 . .',  // 3번줄
        '. 2 b3 . 4 . .',   // 4번줄
        '. . b7 . 1 . .',   // 5번줄
        '. . 4 . 5 b6 .',   // 6번줄
      ]
    },
    {
      id: 'natural-minor-am',
      label: '내추럴 마이너 스케일 Am폼',
      grid: [
        '. 5 b6 . b7 . .',  // 1번줄
        '. 2 b3 . 4 . .',   // 2번줄
        '. b7 . 1 . . .',   // 3번줄
        '. 4 . 5 b6 . .',   // 4번줄
        '. 1 . 2 b3 . .',   // 5번줄
        '. 5 b6 . b7 . .',  // 6번줄
      ]
    },
  ],

  // ── 하모닉 마이너 스케일 ───────────────────────────────────
  'harmonic-minor': [
    {
      id: 'harmonic-minor-gm',
      label: '하모닉 마이너 스케일 Gm폼',
      grid: [
        '. . . 7 1 . .',     // 1번줄
        '. . 4 . 5 b6 .',    // 2번줄
        '. 1 . 2 b3 . .',    // 3번줄
        '. 5 b6 . . 7 .',    // 4번줄
        '. 2 b3 . 4 . .',    // 5번줄
        '. . . 7 1 . .',     // 6번줄
      ]
    },
    {
      id: 'harmonic-minor-em',
      label: '하모닉 마이너 스케일 Em폼',
      grid: [
        '. 7 1 . 2 b3 .',    // 1번줄
        '. . 5 b6 . . .',    // 2번줄
        '. 2 b3 . 4 . .',    // 3번줄
        '. . . 7 1 . .',     // 4번줄
        '. . 4 . 5 b6 .',    // 5번줄
        '. 7 1 . 2 b3 .',    // 6번줄
      ]
    },
    {
      id: 'harmonic-minor-dm',
      label: '하모닉 마이너 스케일 Dm폼',
      grid: [
        '. 2 b3 . 4 . .',    // 1번줄
        '. . . 7 1 . .',     // 2번줄
        '. 4 . 5 b6 . .',    // 3번줄
        '. 1 . 2 b3 . .',    // 4번줄
        '. 5 b6 . . 7 .',    // 5번줄
        '. 2 b3 . 4 . .',    // 6번줄
      ]
    },
    {
      id: 'harmonic-minor-cm',
      label: '하모닉 마이너 스케일 Cm폼',
      grid: [
        '. . 4 . 5 . .',     // 1번줄
        '. . 1 . 2 b3 .',    // 2번줄
        '. 5 b6 . . 7 .',    // 3번줄
        '. 2 b3 . 4 . .',    // 4번줄
        '. . . 7 1 . .',     // 5번줄
        '. . 4 . 5 b6 .',    // 6번줄
      ]
    },
    {
      id: 'harmonic-minor-am',
      label: '하모닉 마이너 스케일 Am폼',
      grid: [
        '. 5 b6 . . 7 .',    // 1번줄
        '. 2 b3 . 4 . .',    // 2번줄
        '. . 7 1 . . .',     // 3번줄
        '. 4 . 5 b6 . .',    // 4번줄
        '. 1 . 2 b3 . .',    // 5번줄
        '. 5 b6 . . 7 .',    // 6번줄
      ]
    },
  ],

  // ── 믹솔리디안 스케일 ──────────────────────────────────────
  'mixolydian': [],

};

// ═══════════════════════════════════════════════════════════════
// ScaleData — 접근 함수
// ═══════════════════════════════════════════════════════════════
const ScaleData = {

  // ── grid 파싱 → { notes, roots, anchorString, anchorCol } ──
  parseGrid(grid) {
    const notes  = [];
    const roots  = [];
    let anchorString = -1;
    let anchorCol    = -1;

    for (let s = 0; s < grid.length; s++) {
      const cells = grid[s].split(' ').filter(c => c !== '');
      for (let col = 0; col < cells.length; col++) {
        const cell = cells[col];
        if (cell === '.') continue;

        const degree = cell.startsWith('b') ? -(parseInt(cell.slice(1), 10)) : parseInt(cell, 10);
        notes.push({ s, col, degree });

        if (degree === 1) {
          roots.push({ s, col });
          // 가장 위쪽 줄의 첫 번째 1을 anchor로 선택
          if (anchorString === -1) {
            anchorString = s;
            anchorCol    = col;
          }
        }
      }
    }

    return { notes, roots, anchorString, anchorCol };
  },

  // ── 특정 키에서 블럭의 유효한 startFret 목록 반환 ──────────
  // rootNote: C=0, C#=1, ... B=11
  //
  // ▶ 유효 조건 (Rule 2)
  //   블럭 내 실제 음(note)의 절대 프랫이 전부 0~20 안에 있어야 함
  //   startFret 자체가 음수여도 모든 음이 0 이상이면 허용 (개방현 케이스)
  getStartFrets(block, rootNote) {
    const parsed = this.parseGrid(block.grid);
    const { anchorString, anchorCol } = parsed;
    if (anchorString === -1) return [];

    const openNote = STANDARD_TUNING[anchorString];
    const baseFret = (rootNote - openNote + 12) % 12;

    // 블럭 내 실제 음이 있는 최소·최대 열
    const noteCols = parsed.notes.map(n => n.col);
    const minCol   = Math.min(...noteCols);
    const maxCol   = Math.max(...noteCols);

    const results = [];
    for (let octave = 0; octave <= 3; octave++) {
      const anchorFret = baseFret + octave * 12;
      const startFret  = anchorFret - anchorCol;
      // 모든 음의 절대 프랫이 0~20 범위 안에 있을 때만 유효
      const minAbsF = startFret + minCol;
      const maxAbsF = startFret + maxCol;
      if (minAbsF >= 0 && maxAbsF < TOTAL_FRETS) {
        results.push(startFret);
      }
    }

    return results;
  },

  // ── 기본 접근 함수 ──────────────────────────────────────────
  getBlocks(scaleKey)        { return SCALE_BLOCKS[scaleKey] ?? []; },
  getBlock(scaleKey, index)  {
    const b = SCALE_BLOCKS[scaleKey];
    return (b && index >= 0 && index < b.length) ? b[index] : null;
  },
  getBlockCount(scaleKey)    { return (SCALE_BLOCKS[scaleKey] ?? []).length; },
  getAllScaleKeys()           { return Object.keys(SCALE_BLOCKS); },

};
