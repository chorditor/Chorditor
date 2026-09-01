// ═══════════════════════════════════════════════════════════════
// mission-persona-pools.js — 페르소나별 데일리미션 문제풀
//
// 페르소나 추가 시 여기에 항목만 추가하면 됨. 출제/채점 로직은
// mission-session.js에 그대로 두고, 이 파일은 "무엇을 출제할지"만 정의.
//
// label           : 결산/디버깅용 표시 이름
// tutorial        : 문제풀이 전 튜토리얼 페이지 제공 여부 (언박싱 1일차만 true)
// openOnly        : 코드맞추기 보이싱을 개방코드(4프렛 이내)로 제한할지
//                   false면 이름이 일치하는 보이싱 중 가장 낮은 프렛 것을 사용
// chords          : 코드맞추기 출제 후보 코드 (chords-library.js 기준 코드명 — 샵/플랫 표기 둘 다 매칭)
// scaleBlocks     : 스케일 훈련 블럭 id (scale-data.js 기준, 표시 순서). 스케일 종류 무관하게
//                   id가 전역 유일하므로 여러 종류를 한 배열에 섞어도 됨. 근음은 항상 C 고정
// comboKeys       : 코드조합훈련 대상 key 칩 목록
// comboChapters   : 코드조합훈련 출제 장(chord-combo-questions.js 기준)
// comboDifficulty : 코드조합훈련 난이도(low/mid/high) — key 풀이 여기서 갈림
//
// 코드풀 근거는 docs/chord-roadmap.md 의 도수표(카테고리 1~14) 참고.
// ═══════════════════════════════════════════════════════════════

const MS_PERSONA_POOLS = {

  // ── 언박싱 1일차 — 트라이어드만, C key ───────────────────────
  // id는 shared.js PERSONA_STAGES / DB(user_persona_profile.persona)와 동일 표기로 통일(언더스코어, 접미어 없음)
  unboxing: {
    label:    '언박싱 1일차',
    tutorial: true,
    openOnly: true,
    chords: ['C', 'D', 'Dm', 'E', 'Em', 'G', 'A', 'Am'],
    scaleBlocks: [
      'pentatonic-cm', 'pentatonic-am', 'pentatonic-gm', 'pentatonic-em', 'pentatonic-dm',
    ],
    comboKeys:       ['C', 'D', 'E', 'G', 'A'],
    comboChapters:   ['1'],
    comboDifficulty: 'low',
  },

  // ── 굳은살 비기너 — 로드맵 1~3번 + 운지가 쉬운 dom7 (C/D/E/G/A key) ──
  'beginner': {
    label:    '굳은살 비기너',
    tutorial: false,
    openOnly: false,
    chords: [
      // 메이저 트라이어드 (7)
      'C', 'D', 'E', 'F', 'G', 'A', 'B',
      // 마이너 트라이어드 (7)
      'Dm', 'Em', 'F#m', 'G#m', 'Am', 'Bm', 'C#m',
      // 메이저 트라이어드 1전위 (7)
      'C/E', 'D/F#', 'E/G#', 'F/A', 'G/B', 'A/C#', 'B/D#',
      // 도미넌트7 — 운지가 쉬운 것만(F7 제외) (6)
      'C7', 'D7', 'E7', 'G7', 'A7', 'B7',
      // sus2 / add9 (6)
      'Csus2', 'Cadd9', 'Dsus2', 'Fadd9', 'Gadd9', 'Asus2',
    ],
    // 사용자가 지정한 정확한 보이싱만 출제 — chord-voicings.js에 이름 일치가 여러 개 있어도
    // 여기 적힌 frets와 정확히 같은 항목만 채택(mission-session.js _msGetEntry 참고).
    // frets 순서: 6번줄(저음E) → 1번줄(고음e), null=뮤트(x)
    voicings: {
      // 메이저 트라이어드
      'C':  [null, 3, 2, 0, 1, 0],
      'D':  [null, null, 0, 2, 3, 2],
      'E':  [0, 2, 2, 1, 0, 0],
      'F':  [1, 3, 3, 2, 1, 1],          // 6번줄 바레(1프렛)
      'G':  [3, 2, 0, 0, 0, 3],
      'A':  [null, 0, 2, 2, 2, 0],
      'B':  [null, 2, 4, 4, 4, 2],       // 5번줄 바레(2프렛)
      // 마이너 트라이어드
      'Dm':  [null, null, 0, 2, 3, 1],
      'Em':  [0, 2, 2, 0, 0, 0],
      'F#m': [2, 4, 4, 2, 2, 2],         // 6번줄 바레(2프렛)
      'G#m': [4, 6, 6, 4, 4, 4],         // 6번줄 바레(4프렛)
      'Am':  [null, 0, 2, 2, 1, 0],
      'Bm':  [null, 2, 4, 4, 3, 2],      // 5번줄 바레(2프렛)
      'C#m': [null, 4, 6, 6, 5, 4],      // 5번줄 바레(4프렛)
      // 메이저 트라이어드 1전위
      'C/E':  [0, 3, 2, 0, 1, 0],
      'D/F#': [2, null, 0, 2, 3, 2],
      'E/G#': [4, null, 2, 4, 0, 0],
      'F/A':  [null, 0, 3, 2, 1, 1],
      'G/B':  [null, 2, 0, 0, 0, 3],
      'A/C#': [null, 4, 2, 2, 2, 0],
      'B/D#': [null, 6, 4, 4, 4, null],  // 5번줄 바레(4프렛)
      // 도미넌트7
      'C7': [null, 3, 2, 3, 1, 0],
      'D7': [null, null, 0, 2, 1, 2],
      'E7': [0, 2, 0, 1, 0, 0],
      'G7': [3, 2, 0, 0, 0, 1],
      'A7': [null, 0, 2, 0, 2, 0],
      'B7': [null, 2, 1, 2, 0, 2],
      // sus2 / add9
      'Csus2': [null, 3, null, 0, 3, 3],
      'Cadd9': [null, 3, 2, 0, 3, 0],
      'Dsus2': [null, null, 0, 2, 3, 0],
      'Fadd9': [1, null, 3, 2, 1, 3],
      'Gadd9': [3, null, 0, 2, 0, 3],
      'Asus2': [null, 0, 2, 2, 0, 0],
    },
    scaleBlocks: [
      'pentatonic-cm', 'pentatonic-am', 'pentatonic-gm', 'pentatonic-em', 'pentatonic-dm',
      'major-pos1', 'major-pos2', 'major-pos3', 'major-pos4', 'major-pos5',
    ],
    comboKeys:       ['C', 'D', 'E', 'G', 'A'],
    comboChapters:   ['1', '2'],
    comboDifficulty: 'low',
  },

  // ── 악보 의존자 — 로드맵 4~9번 (C/D/E/G/A key) ──────────────
  sheet_reader: {
    label:    '악보 의존자',
    tutorial: false,
    openOnly: false,
    chords: [
      // M7 (6)
      'CM7', 'DM7', 'EM7', 'FM7', 'GM7', 'AM7',
      // m7 — 다이어토닉 + 릴레이티드 ii (8)
      'Dm7', 'Em7', 'F#m7', 'G#m7', 'Am7', 'Bm7', 'C#m7', 'Gm7',
      // m7(b5) — 다이어토닉 + 릴레이티드 ii (6)
      'Bm7(b5)', 'C#m7(b5)', 'D#m7(b5)', 'F#m7(b5)', 'G#m7(b5)', 'Em7(b5)',
      // 7sus4 (5)
      'G7sus4', 'A7sus4', 'B7sus4', 'D7sus4', 'E7sus4',
      // 도미넌트7 — 세컨더리 도미넌트 (10)
      'A7', 'B7', 'C7', 'C#7', 'D7', 'D#7', 'E7', 'F#7', 'G7', 'G#7',
      // 메이저 트라이어드 1전위 — 세컨더리 도미넌트 1전위 (10)
      'A/C#', 'B/D#', 'C/E', 'D/F#', 'E/G#', 'C#/F', 'D#/G', 'F#/A#', 'G/B', 'G#/C',
      // 도미넌트7 1전위 (10)
      'A7/C#', 'B7/D#', 'C7/E', 'D7/F#', 'E7/G#', 'C#7/F', 'D#7/G', 'F#7/A#', 'G7/B', 'G#7/C',
      // 디미니쉬7 — 세컨더리 도미넌트 대리코드 (10)
      'C#dim7', 'D#dim7', 'Edim7', 'F#dim7', 'G#dim7', 'Fdim7', 'A#dim7', 'Gdim7', 'Cdim7', 'Bdim7',
    ],
    // 지정 보이싱만 출제(beginner와 동일 원칙). 정적(오픈) 보이싱은 사용자가 준 그대로,
    // 나머지는 CHORD_PATTERN 3종 폼(6/5/4번줄 바레) 중 실제로 가장 낮은 프렛에 걸리는 것 채택.
    voicings: {
      // M7 — 오픈(정적)
      'CM7': [null, 3, 2, 0, 0, 0],
      'FM7': [null, null, 3, 2, 1, 0],
      'GM7': [3, 2, 0, 0, 0, 2],
      'EM7': [0, 2, 1, 1, 0, 0],
      // M7 — 바레(가장 낮은 프렛)
      'DM7':  [null, null, 0, 2, 2, 2],
      'AM7':  [null, 0, 2, 1, 2, 0],
      // m7 — 오픈(정적)
      'Em7': [0, 2, 2, 0, 3, 0],
      'Am7': [null, 0, 2, 0, 1, 0],
      'Bm7': [null, 2, 0, 2, 3, null],
      // m7 — 바레
      'Dm7':  [null, null, 0, 2, 1, 1],
      'F#m7': [2, null, 2, 2, 2, null],
      'G#m7': [4, null, 4, 4, 4, null],
      'C#m7': [null, 4, 6, 4, 5, 4],
      'Gm7':  [3, null, 3, 3, 3, null],
      // m7(b5) — 전부 바레
      'Bm7(b5)':  [null, 2, 3, 2, 3, null],
      'C#m7(b5)': [null, 4, 5, 4, 5, null],
      'D#m7(b5)': [null, null, 1, 2, 2, 2],
      'F#m7(b5)': [2, null, 2, 2, 1, null],
      'G#m7(b5)': [4, null, 4, 4, 3, null],
      'Em7(b5)':  [null, null, 2, 3, 3, 3],
      // 7sus4 — 전부 바레
      'G7sus4': [3, 5, 3, 5, 3, 3],
      'A7sus4': [null, 0, 2, 0, 3, 0],
      'B7sus4': [null, 2, 4, 2, 5, 2],
      'D7sus4': [null, null, 0, 2, 1, 3],
      'E7sus4': [0, 2, 0, 2, 0, 0],
      // 도미넌트7 — 오픈(정적, beginner와 동일 보이싱)
      'C7': [null, 3, 2, 3, 1, 0],
      'D7': [null, null, 0, 2, 1, 2],
      'E7': [0, 2, 0, 1, 0, 0],
      'G7': [3, 2, 0, 0, 0, 1],
      'A7': [null, 0, 2, 0, 2, 0],
      'B7': [null, 2, 1, 2, 0, 2],
      // 도미넌트7 — 바레
      'C#7': [null, 4, 6, 4, 6, 4],
      'D#7': [null, null, 1, 3, 2, 3],
      'F#7': [2, 4, 2, 3, 2, 2],
      'G#7': [4, 6, 4, 5, 4, 4],
      // 메이저 1전위 — 오픈(정적, beginner와 동일 보이싱)
      'A/C#': [null, 4, 2, 2, 2, 0],
      'C/E':  [0, 3, 2, 0, 1, 0],
      'D/F#': [2, null, 0, 2, 3, 2],
      'E/G#': [4, null, 2, 4, 0, 0],
      // 메이저 1전위 — 바레
      'B/D#':  [null, 6, 4, 4, 4, null],
      'C#/F':  [null, null, 3, 1, 2, 1],
      'D#/G':  [3, null, 1, 3, 4, null],
      'F#/A#': [6, null, 4, 6, 7, null],
      'G/B':   [null, 2, 0, 0, 0, 3],
      'G#/C':  [null, 3, 1, 1, 1, null],
      // 도미넌트7 1전위 — 전부 바레
      'A7/C#': [null, 4, null, 2, 2, 3],
      'B7/D#': [null, null, 1, 2, 0, 2],
      'C7/E':  [null, null, 2, 3, 1, 3],
      'D7/F#': [2, null, 0, 2, 1, null],
      'E7/G#': [4, null, 2, 4, 3, null],
      'C#7/F': [null, null, 3, 4, 2, 4],
      'D#7/G': [3, null, 1, 3, 2, null],
      'F#7/A#':[6, null, 4, 6, 5, null],
      'G7/B':  [null, 2, null, 0, 0, 1],
      'G#7/C': [null, 3, null, 1, 1, 2],
      // 디미니쉬7 — 전부 바레
      'C#dim7': [null, 4, 5, 3, 5, null],
      'D#dim7': [null, null, 1, 2, 1, 2],
      'Edim7':  [null, null, 2, 3, 2, 3],
      'F#dim7': [2, null, 1, 2, 1, null],
      'G#dim7': [4, null, 3, 4, 3, null],
      'Fdim7':  [1, null, 0, 1, 0, null],
      'A#dim7': [null, 1, 2, 0, 2, null],
      'Gdim7':  [3, null, 2, 3, 2, null],
      'Cdim7':  [null, 3, 4, 2, 4, null],
      'Bdim7':  [null, 2, 3, 1, 3, null],
    },
    scaleBlocks: [
      'pentatonic-cm', 'pentatonic-am', 'pentatonic-gm', 'pentatonic-em', 'pentatonic-dm',
      'major-pos1', 'major-pos2', 'major-pos3', 'major-pos4', 'major-pos5',
      'blues-cm', 'blues-am', 'blues-gm', 'blues-em', 'blues-dm',
    ],
    comboKeys:       ['C', 'D', 'E', 'G', 'A'],
    comboChapters:   ['3', '4', '5'],
    comboDifficulty: 'low',
  },

  // ── 방구석 기타마스터 — 로드맵 10·11·12·14번 (C/D/E/G/A key) ──
  home_master: {
    label:    '방구석 기타마스터',
    tutorial: false,
    openOnly: false,
    chords: [
      // 도미넌트7(#11) — 트라이톤 대리도미넌트, 2·4·6도 진행만 (9)
      'Eb7(#11)', 'Gb7(#11)', 'Bb7(#11)', 'F7(#11)', 'Ab7(#11)', 'C7(#11)', 'G7(#11)', 'D7(#11)', 'Db7(#11)',
      // M7 — 모달인터체인지 bII/bVI/bVII (8)
      'DbM7', 'AbM7', 'BbM7', 'EbM7', 'CM7', 'FM7', 'DM7', 'GM7',
      // m6 — 모달인터체인지 ivm6 (5)
      'Fm6', 'Gm6', 'Am6', 'Cm6', 'Dm6',
      // m7(b5) — 모달인터체인지 #ivm7b5 (5)
      'F#m7(b5)', 'G#m7(b5)', 'A#m7(b5)', 'C#m7(b5)', 'D#m7(b5)',
      // 도미넌트7 — 모달인터체인지 bVII7 (5)
      'Bb7', 'C7', 'D7', 'F7', 'G7',
      // 다이어토닉 텐션 (6+7+5+5)
      'CM7(9)', 'DM7(9)', 'EM7(9)', 'FM7(9)', 'GM7(9)', 'AM7(9)',
      'Dm7(9)', 'Em7(9)', 'F#m7(9)', 'G#m7(9)', 'Am7(9)', 'Bm7(9)', 'C#m7(9)',
      'Dm7(11)', 'Em7(11)', 'F#m7(11)', 'Am7(11)', 'Bm7(11)',
      'G7(9)', 'A7(9)', 'B7(9)', 'D7(9)', 'E7(9)',
      // 메이저 트라이어드 슬래시 — 하이브리드 (21)
      'F/G', 'G/F', 'F/C', 'G/C', 'C/G', 'G/A', 'A/G', 'G/D', 'A/D', 'D/A', 'A/B',
      'B/A', 'A/E', 'B/E', 'E/B', 'C/D', 'D/C', 'D/G', 'D/E', 'E/D', 'E/A',
      // 마이너 트라이어드 슬래시 — 하이브리드 (5)
      'Fm/Ab', 'Gm/Bb', 'Am/C', 'Cm/Eb', 'Dm/F',
      // 악보의존자에서 이월 — 도미넌트7 1전위 (10)
      'A7/C#', 'B7/D#', 'C7/E', 'D7/F#', 'E7/G#', 'C#7/F', 'D#7/G', 'F#7/A#', 'G7/B', 'G#7/C',
      // 악보의존자에서 이월 — 디미니쉬7 (10)
      'C#dim7', 'D#dim7', 'Edim7', 'F#dim7', 'G#dim7', 'Fdim7', 'A#dim7', 'Gdim7', 'Cdim7', 'Bdim7',
    ],
    // 지정 보이싱만 출제(beginner/sheet_reader와 동일 원칙)
    voicings: {
      // 도미넌트7(#11)
      'Eb7(#11)': [null, null, 1, 2, 2, 3],
      'Gb7(#11)': [2, null, 2, 3, 1, null],
      'Bb7(#11)': [null, 1, 2, 1, 3, null],
      'F7(#11)':  [1, null, 1, 2, 0, null],
      'Ab7(#11)': [4, null, 4, 5, 3, null],
      'C7(#11)':  [null, 3, 4, 3, 5, null],
      'G7(#11)':  [3, null, 3, 4, 2, null],
      'D7(#11)':  [null, null, 0, 1, 1, 2],
      'Db7(#11)': [null, 4, 5, 4, 6, null],
      // M7 — 새 플랫 4개 + sheet_reader 재사용 4개
      'DbM7': [null, 4, 6, 5, 6, 4],
      'AbM7': [4, null, 5, 5, 4, null],
      'BbM7': [null, 1, 3, 2, 3, 1],
      'EbM7': [null, null, 1, 3, 3, 3],
      'CM7':  [null, 3, 2, 0, 0, 0],
      'FM7':  [null, null, 3, 2, 1, 0],
      'DM7':  [null, null, 0, 2, 2, 2],
      'GM7':  [3, 2, 0, 0, 0, 2],
      // m6
      'Fm6': [1, null, 0, 1, 1, null],
      'Gm6': [3, null, 2, 3, 3, null],
      'Am6': [5, null, 4, 5, 5, null],
      'Cm6': [null, 3, null, 2, 4, 3],
      'Dm6': [null, null, 0, 2, 0, 1],
      // m7(b5) — 새 1개 + sheet_reader 재사용 4개
      'A#m7(b5)': [null, 1, 2, 1, 2, null],
      'F#m7(b5)': [2, null, 2, 2, 1, null],
      'G#m7(b5)': [4, null, 4, 4, 3, null],
      'C#m7(b5)': [null, 4, 5, 4, 5, null],
      'D#m7(b5)': [null, null, 1, 2, 2, 2],
      // 도미넌트7 — 새 2개 + sheet_reader 재사용 3개
      'F7':  [1, 3, 1, 2, 1, 1],
      'Bb7': [null, 1, 3, 1, 3, 1],
      'C7':  [null, 3, 2, 3, 1, 0],
      'D7':  [null, null, 0, 2, 1, 2],
      'G7':  [3, 2, 0, 0, 0, 1],
      // 다이어토닉 텐션 — M7(9)
      'CM7(9)': [null, 3, 2, 4, 3, null],
      'DM7(9)': [null, null, 0, 2, 2, 0],
      'EM7(9)': [0, null, 1, 1, 0, 2],
      'FM7(9)': [1, null, 2, 2, 1, 3],
      'GM7(9)': [3, null, 4, 4, 3, 5],
      'AM7(9)': [5, null, 6, 6, 5, 7],
      // 다이어토닉 텐션 — m7(9)
      'Dm7(9)':  [null, 5, 3, 5, 5, null],
      'Em7(9)':  [0, 2, 0, 0, 0, 2],
      'F#m7(9)': [2, 4, 2, 2, 2, 4],
      'G#m7(9)': [4, 6, 4, 4, 4, 6],
      'Am7(9)':  [5, 7, 5, 5, 5, 7],
      'Bm7(9)':  [null, 2, 0, 2, 2, null],
      'C#m7(9)': [null, 4, 2, 4, 4, null],
      // 다이어토닉 텐션 — m7(11)
      'Dm7(11)':  [null, 5, null, 5, 6, 3],
      'Em7(11)':  [null, 7, null, 7, 8, 5],
      'F#m7(11)': [2, null, 2, 2, 0, null],
      'Am7(11)':  [5, null, 5, 5, 3, null],
      'Bm7(11)':  [null, 2, null, 2, 3, 0],
      // 다이어토닉 텐션 — 도미넌트7(9)
      'G7(9)': [3, null, 3, 4, 3, 5],
      'A7(9)': [5, null, 5, 6, 5, 7],
      'B7(9)': [null, 2, 1, 2, 2, null],
      'D7(9)': [null, null, 0, 2, 1, 0],
      'E7(9)': [0, null, 0, 1, 0, 2],
      // 메이저 트라이어드 슬래시 — 하이브리드(1전위류)
      'F/G': [3, null, 3, 2, 1, null],
      'G/F': [1, null, 0, 0, 0, null],
      'G/C': [null, 3, 5, 4, 3, 3],
      'G/A': [5, null, 5, 4, 3, null],
      'A/G': [3, null, 2, 2, 2, null],
      'A/D': [null, null, 0, 2, 2, 0],
      'A/B': [null, 2, 2, 2, 2, null],
      'B/A': [5, null, 4, 4, 4, null],
      'B/E': [null, null, 2, 4, 4, 2],
      'C/D': [null, null, 0, 0, 1, 0],
      'D/C': [null, 3, null, 2, 3, 2],
      'D/G': [3, null, null, 2, 3, 2],
      'D/E': [null, null, 2, 2, 3, 2],
      'E/D': [null, null, 0, 1, 0, 0],
      'E/A': [null, 0, 2, 1, 0, 0],
      // 메이저 트라이어드 슬래시 — 2전위(베이스=완전5도 위)
      'F/C': [null, 3, 3, 2, 1, 1],
      'C/G': [3, null, 5, 5, 5, 3],
      'G/D': [null, 5, 5, 4, 3, 3],
      'D/A': [5, null, 7, 7, 7, 5],
      'A/E': [0, null, 2, 2, 2, 0],
      'E/B': [null, 2, 2, 1, 0, 0],
      // 마이너 트라이어드 슬래시 — 하이브리드
      'Fm/Ab': [4, null, 3, 5, 6, null],
      'Gm/Bb': [6, null, 5, 7, 8, null],
      'Am/C':  [null, 3, 2, 2, 1, null],
      'Cm/Eb': [null, 6, 5, 5, 4, null],
      'Dm/F':  [1, null, 0, 2, 3, null],
      // 악보의존자에서 이월 — 도미넌트7 1전위(동일 코드, 동일 보이싱 재사용)
      'A7/C#': [null, 4, null, 2, 2, 3],
      'B7/D#': [null, null, 1, 2, 0, 2],
      'C7/E':  [null, null, 2, 3, 1, 3],
      'D7/F#': [2, null, 0, 2, 1, null],
      'E7/G#': [4, null, 2, 4, 3, null],
      'C#7/F': [null, null, 3, 4, 2, 4],
      'D#7/G': [3, null, 1, 3, 2, null],
      'F#7/A#':[6, null, 4, 6, 5, null],
      'G7/B':  [null, 2, null, 0, 0, 1],
      'G#7/C': [null, 3, null, 1, 1, 2],
      // 악보의존자에서 이월 — 디미니쉬7(동일 코드, 동일 보이싱 재사용)
      'C#dim7': [null, 4, 5, 3, 5, null],
      'D#dim7': [null, null, 1, 2, 1, 2],
      'Edim7':  [null, null, 2, 3, 2, 3],
      'F#dim7': [2, null, 1, 2, 1, null],
      'G#dim7': [4, null, 3, 4, 3, null],
      'Fdim7':  [1, null, 0, 1, 0, null],
      'A#dim7': [null, 1, 2, 0, 2, null],
      'Gdim7':  [3, null, 2, 3, 2, null],
      'Cdim7':  [null, 3, 4, 2, 4, null],
      'Bdim7':  [null, 2, 3, 1, 3, null],
    },
    scaleBlocks: [
      'pentatonic-cm', 'pentatonic-am', 'pentatonic-gm', 'pentatonic-em', 'pentatonic-dm',
      'major-pos1', 'major-pos2', 'major-pos3', 'major-pos4', 'major-pos5',
      'blues-cm', 'blues-am', 'blues-gm', 'blues-em', 'blues-dm',
      'natural-minor-cm', 'natural-minor-am', 'natural-minor-gm', 'natural-minor-em', 'natural-minor-dm',
      'harmonic-minor-cm', 'harmonic-minor-am', 'harmonic-minor-gm', 'harmonic-minor-em', 'harmonic-minor-dm',
    ],
    comboKeys:       ['C', 'D', 'E', 'G', 'A'],
    comboChapters:   ['3', '4', '5', '6'],
    comboDifficulty: 'low',
  },

  // ── 기타마스터 — 마이너 다이어토닉·화성단조·얼터드텐션 + 전 카테고리 8키 확장 ──
  //    (C/D/E/G/A/F/Bb/Eb key)
  guitar_master: {
    label:    '기타마스터',
    tutorial: false,
    openOnly: false,
    chords: [
      // M7 (9)
      'EbM7', 'FM7', 'GM7', 'BbM7', 'CM7', 'AbM7', 'DbM7', 'GbM7', 'BM7',
      // m7 (10)
      'Gm7', 'Am7', 'Bm7', 'Dm7', 'Em7', 'Cm7', 'Fm7', 'Bbm7', 'Ebm7', 'Abm7',
      // 도미넌트7 평서 (8)
      'Bb7', 'C7', 'D7', 'F7', 'G7', 'Eb7', 'Ab7', 'Db7',
      // 도미넌트7(b9) — 다이어토닉 텐션 V7(b9) 중 얼터드와 안 겹치는 것 (2)
      'F7(b9)', 'Bb7(b9)',
      // 도미넌트7(9) (9)
      'C7(9)', 'D7(9)', 'E7(9)', 'G7(9)', 'A7(9)', 'F7(9)', 'Bb7(9)', 'Eb7(9)', 'B7(9)',
      // 도미넌트7 얼터드텐션 — 10루트 × (b9/#9/b13) (30)
      'A7(b9)',  'A7(#9)',  'A7(b13)',
      'B7(b9)',  'B7(#9)',  'B7(b13)',
      'C7(b9)',  'C7(#9)',  'C7(b13)',
      'C#7(b9)', 'C#7(#9)', 'C#7(b13)',
      'D7(b9)',  'D7(#9)',  'D7(b13)',
      'D#7(b9)', 'D#7(#9)', 'D#7(b13)',
      'E7(b9)',  'E7(#9)',  'E7(b13)',
      'F#7(b9)', 'F#7(#9)', 'F#7(b13)',
      'G7(b9)',  'G7(#9)',  'G7(b13)',
      'G#7(b9)', 'G#7(#9)', 'G#7(b13)',
      // m7(b5) (8)
      'Dm7(b5)', 'Em7(b5)', 'F#m7(b5)', 'Am7(b5)', 'Bm7(b5)', 'Gm7(b5)', 'Cm7(b5)', 'Fm7(b5)',
      // mM7 — 화성단조 (8)
      'CmM7', 'DmM7', 'EmM7', 'GmM7', 'AmM7', 'FmM7', 'BbmM7', 'EbmM7',
      // 도미넌트7(#11) — 트라이톤 대리도미넌트 (9)
      'Eb7(#11)', 'Gb7(#11)', 'Bb7(#11)', 'F7(#11)', 'Ab7(#11)', 'C7(#11)', 'G7(#11)', 'D7(#11)', 'Db7(#11)',
      // m6 (5)
      'Fm6', 'Gm6', 'Am6', 'Cm6', 'Dm6',
      // 다이어토닉 텐션 (6+7+5)
      'CM7(9)', 'DM7(9)', 'EM7(9)', 'FM7(9)', 'GM7(9)', 'AM7(9)',
      'Dm7(9)', 'Em7(9)', 'F#m7(9)', 'G#m7(9)', 'Am7(9)', 'Bm7(9)', 'C#m7(9)',
      'Dm7(11)', 'Em7(11)', 'F#m7(11)', 'Am7(11)', 'Bm7(11)',
      // 메이저 트라이어드 슬래시 — 하이브리드 (21)
      'F/G', 'G/F', 'F/C', 'G/C', 'C/G', 'G/A', 'A/G', 'G/D', 'A/D', 'D/A', 'A/B',
      'B/A', 'A/E', 'B/E', 'E/B', 'C/D', 'D/C', 'D/G', 'D/E', 'E/D', 'E/A',
      // 마이너 트라이어드 슬래시 — 하이브리드 (5)
      'Fm/Ab', 'Gm/Bb', 'Am/C', 'Cm/Eb', 'Dm/F',
    ],
    // 지정 보이싱만 출제(beginner/sheet_reader/home_master와 동일 원칙)
    voicings: {
      // 도미넌트7(b9) — 다이어토닉 텐션 2개 + 얼터드텐션 10루트
      'F7(b9)':  [1, null, 1, 2, 1, 2],
      'Bb7(b9)': [null, 1, 0, 1, 0, null],
      'A7(b9)':  [5, null, 5, 6, 5, 6],
      'B7(b9)':  [null, 2, 1, 2, 1, null],
      'C7(b9)':  [null, 3, 2, 3, 2, null],
      'C#7(b9)': [null, 4, 3, 4, 3, null],
      'D7(b9)':  [null, 5, 4, 5, 4, null],
      'D#7(b9)': [null, null, 1, 0, 2, 0],
      'E7(b9)':  [0, null, 0, 1, 0, 1],
      'F#7(b9)': [2, null, 2, 3, 2, 3],
      'G7(b9)':  [3, null, 3, 4, 3, 4],
      'G#7(b9)': [4, null, 4, 5, 4, 5],
      // 도미넌트7(#9) — 얼터드텐션 10루트
      'A7(#9)':  [5, 7, 5, 6, 5, 8],
      'B7(#9)':  [null, 2, 1, 2, 3, null],
      'C7(#9)':  [null, 3, 2, 3, 4, null],
      'C#7(#9)': [null, 4, 3, 4, 5, null],
      'D7(#9)':  [null, 5, 4, 5, 6, null],
      'D#7(#9)': [null, null, 1, 0, 2, 2],
      'E7(#9)':  [0, 2, 0, 1, 0, 3],
      'F#7(#9)': [2, 4, 2, 3, 2, 5],
      'G7(#9)':  [3, 5, 3, 4, 3, 6],
      'G#7(#9)': [4, 6, 4, 5, 4, 7],
      // 도미넌트7(b13) — 얼터드텐션 10루트
      'A7(b13)':  [null, 0, 2, 0, 2, 1],
      'B7(b13)':  [null, 2, 4, 2, 4, 3],
      'C7(b13)':  [null, 3, 5, 3, 5, 4],
      'C#7(b13)': [null, 4, 6, 4, 6, 5],
      'D7(b13)':  [null, 5, 7, 5, 7, 6],
      'D#7(b13)': [null, 6, 8, 6, 8, 7],
      'E7(b13)':  [0, null, 0, 1, 0, 1],
      'F#7(b13)': [2, null, 2, 3, 2, 3],
      'G7(b13)':  [3, null, 3, 4, 3, 4],
      'G#7(b13)': [4, null, 4, 5, 4, 5],
      // mM7 — 화성단조
      'CmM7':  [null, 3, 5, 4, 4, 3],
      'DmM7':  [null, null, 0, 2, 2, 1],
      'EmM7':  [0, null, 1, 0, 0, null],
      'GmM7':  [3, null, 4, 3, 3, null],
      'AmM7':  [null, 0, 2, 1, 1, 0],
      'FmM7':  [1, null, 2, 1, 1, null],
      'BbmM7': [null, 1, 3, 2, 2, 1],
      'EbmM7': [null, null, 1, 3, 3, 2],
      // M7 — home_master 재사용 7개 + 신규 2개(하위 M7폼 그대로 적용)
      'EbM7': [null, null, 1, 3, 3, 3],
      'FM7':  [null, null, 3, 2, 1, 0],
      'GM7':  [3, 2, 0, 0, 0, 2],
      'BbM7': [null, 1, 3, 2, 3, 1],
      'CM7':  [null, 3, 2, 0, 0, 0],
      'AbM7': [4, null, 5, 5, 4, null],
      'DbM7': [null, 4, 6, 5, 6, 4],
      'GbM7': [2, null, 3, 3, 2, null],
      'BM7':  [null, 2, 4, 3, 4, 2],
      // m7 — sheet_reader 재사용 5개 + 신규 5개(하위 m7폼 그대로 적용)
      'Gm7':  [3, null, 3, 3, 3, null],
      'Am7':  [null, 0, 2, 0, 1, 0],
      'Bm7':  [null, 2, 0, 2, 3, null],
      'Dm7':  [null, null, 0, 2, 1, 1],
      'Em7':  [0, 2, 2, 0, 3, 0],
      'Cm7':  [null, 3, 5, 3, 4, 3],
      'Fm7':  [1, null, 1, 1, 1, null],
      'Bbm7': [null, 1, 3, 1, 2, 1],
      'Ebm7': [null, null, 1, 3, 2, 2],
      'Abm7': [4, null, 4, 4, 4, null],
      // 도미넌트7 평서 — home_master/sheet_reader 재사용 5개 + 신규 3개
      'Bb7': [null, 1, 3, 1, 3, 1],
      'C7':  [null, 3, 2, 3, 1, 0],
      'D7':  [null, null, 0, 2, 1, 2],
      'F7':  [1, 3, 1, 2, 1, 1],
      'G7':  [3, 2, 0, 0, 0, 1],
      'Eb7': [null, null, 1, 3, 2, 3],
      'Ab7': [4, 6, 4, 5, 4, 4],
      'Db7': [null, 4, 6, 4, 6, 4],
      // 도미넌트7(9) — home_master 재사용 5개 + 신규 4개(하위 dom7(9)폼 그대로 적용)
      'G7(9)':  [3, null, 3, 4, 3, 5],
      'A7(9)':  [5, null, 5, 6, 5, 7],
      'B7(9)':  [null, 2, 1, 2, 2, null],
      'D7(9)':  [null, null, 0, 2, 1, 0],
      'E7(9)':  [0, null, 0, 1, 0, 2],
      'C7(9)':  [null, 3, 2, 3, 3, null],
      'F7(9)':  [1, null, 1, 2, 1, 3],
      'Bb7(9)': [null, 1, 0, 1, 1, null],
      'Eb7(9)': [null, null, 1, 3, 2, 1],
      // m7(b5) — sheet_reader/home_master 재사용 3개 + 신규 5개(하위 m7(b5)폼 그대로 적용)
      'F#m7(b5)': [2, null, 2, 2, 1, null],
      'Bm7(b5)':  [null, 2, 3, 2, 3, null],
      'Em7(b5)':  [null, null, 2, 3, 3, 3],
      'Dm7(b5)':  [null, null, 0, 1, 1, 1],
      'Am7(b5)':  [null, 0, 1, 0, 1, null],
      'Gm7(b5)':  [3, null, 3, 3, 2, null],
      'Cm7(b5)':  [null, 3, 4, 3, 4, null],
      'Fm7(b5)':  [1, null, 1, 1, 0, null],
      // 도미넌트7(#11) — home_master 재사용(전부 동일 코드)
      'Eb7(#11)': [null, null, 1, 2, 2, 3],
      'Gb7(#11)': [2, null, 2, 3, 1, null],
      'Bb7(#11)': [null, 1, 2, 1, 3, null],
      'F7(#11)':  [1, null, 1, 2, 0, null],
      'Ab7(#11)': [4, null, 4, 5, 3, null],
      'C7(#11)':  [null, 3, 4, 3, 5, null],
      'G7(#11)':  [3, null, 3, 4, 2, null],
      'D7(#11)':  [null, null, 0, 1, 1, 2],
      'Db7(#11)': [null, 4, 5, 4, 6, null],
      // m6 — home_master 재사용
      'Fm6': [1, null, 0, 1, 1, null],
      'Gm6': [3, null, 2, 3, 3, null],
      'Am6': [5, null, 4, 5, 5, null],
      'Cm6': [null, 3, null, 2, 4, 3],
      'Dm6': [null, null, 0, 2, 0, 1],
      // 다이어토닉 텐션 M7(9)/m7(9)/m7(11) — home_master 재사용
      'CM7(9)': [null, 3, 2, 4, 3, null],
      'DM7(9)': [null, null, 0, 2, 2, 0],
      'EM7(9)': [0, null, 1, 1, 0, 2],
      'FM7(9)': [1, null, 2, 2, 1, 3],
      'GM7(9)': [3, null, 4, 4, 3, 5],
      'AM7(9)': [5, null, 6, 6, 5, 7],
      'Dm7(9)':  [null, 5, 3, 5, 5, null],
      'Em7(9)':  [0, 2, 0, 0, 0, 2],
      'F#m7(9)': [2, 4, 2, 2, 2, 4],
      'G#m7(9)': [4, 6, 4, 4, 4, 6],
      'Am7(9)':  [5, 7, 5, 5, 5, 7],
      'Bm7(9)':  [null, 2, 0, 2, 2, null],
      'C#m7(9)': [null, 4, 2, 4, 4, null],
      'Dm7(11)':  [null, 5, null, 5, 6, 3],
      'Em7(11)':  [null, 7, null, 7, 8, 5],
      'F#m7(11)': [2, null, 2, 2, 0, null],
      'Am7(11)':  [5, null, 5, 5, 3, null],
      'Bm7(11)':  [null, 2, null, 2, 3, 0],
      // 메이저 트라이어드 슬래시 하이브리드 — home_master 재사용
      'F/G': [3, null, 3, 2, 1, null],
      'G/F': [1, null, 0, 0, 0, null],
      'F/C': [null, 3, 3, 2, 1, 1],
      'G/C': [null, 3, 5, 4, 3, 3],
      'C/G': [3, null, 5, 5, 5, 3],
      'G/A': [5, null, 5, 4, 3, null],
      'A/G': [3, null, 2, 2, 2, null],
      'G/D': [null, 5, 5, 4, 3, 3],
      'A/D': [null, null, 0, 2, 2, 0],
      'D/A': [5, null, 7, 7, 7, 5],
      'A/B': [null, 2, 2, 2, 2, null],
      'B/A': [5, null, 4, 4, 4, null],
      'A/E': [0, null, 2, 2, 2, 0],
      'B/E': [null, null, 2, 4, 4, 2],
      'E/B': [null, 2, 2, 1, 0, 0],
      'C/D': [null, null, 0, 0, 1, 0],
      'D/C': [null, 3, null, 2, 3, 2],
      'D/G': [3, null, null, 2, 3, 2],
      'D/E': [null, null, 2, 2, 3, 2],
      'E/D': [null, null, 0, 1, 0, 0],
      'E/A': [null, 0, 2, 1, 0, 0],
      // 마이너 트라이어드 슬래시 하이브리드 — home_master 재사용
      'Fm/Ab': [4, null, 3, 5, 6, null],
      'Gm/Bb': [6, null, 5, 7, 8, null],
      'Am/C':  [null, 3, 2, 2, 1, null],
      'Cm/Eb': [null, 6, 5, 5, 4, null],
      'Dm/F':  [1, null, 0, 2, 3, null],
    },
    scaleBlocks: [
      'major-pos1', 'major-pos2', 'major-pos3', 'major-pos4', 'major-pos5',
      'natural-minor-cm', 'natural-minor-am', 'natural-minor-gm', 'natural-minor-em', 'natural-minor-dm',
      'harmonic-minor-cm', 'harmonic-minor-am', 'harmonic-minor-gm', 'harmonic-minor-em', 'harmonic-minor-dm',
      'phrygian-dominant-pos1', 'phrygian-dominant-pos2', 'phrygian-dominant-pos3', 'phrygian-dominant-pos4', 'phrygian-dominant-pos5',
      'mixolydian-b9b13-pos1', 'mixolydian-b9b13-pos2', 'mixolydian-b9b13-pos3', 'mixolydian-b9b13-pos4', 'mixolydian-b9b13-pos5',
      'altered-pos1', 'altered-pos2', 'altered-pos3', 'altered-pos4', 'altered-pos5',
    ],
    comboKeys:       ['C', 'D', 'E', 'G', 'A'],
    comboChapters:   ['3', '4', '5', '6', '7', '8'],
    comboDifficulty: 'low',
  },

};
