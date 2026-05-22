// ═══════════════════════════════════════════════════════════════
// scale-data.js — 스케일 블럭 라이브러리
// ═══════════════════════════════════════════════════════════════
//
// ▶ grid 작성 규칙
//   - 6행 × 7열 고정  (행: 1번줄→6번줄 위→아래 / 열: startFret→+6)
//   - '.'  = 빈칸
//   - '1'  = 근음 (root)
//   - '2'~'7' = 스케일 음계 (장음계 기준 2도~7도)
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
      label: 'Shape 1',
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
      label: 'Shape 2',
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
      label: 'Shape 3',
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
      label: 'Shape 4',
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
      label: 'Shape 5',
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

  // ── 펜타토닉 스케일 ───────────────────────────────────────
  'pentatonic': [],

  // ── 블루스 스케일 ──────────────────────────────────────────
  'blues': [],

  // ── 내추럴 마이너 스케일 ───────────────────────────────────
  'natural-minor': [],

  // ── 하모닉 마이너 스케일 ───────────────────────────────────
  'harmonic-minor': [],

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

        const degree = parseInt(cell, 10);
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
