'use strict';
// ═══════════════════════════════════════════════════════════════
// progression-voicing-list.js — 코드 진행에서 허용할 보이싱 목록
//
// 이 파일이 코드 진행 보이싱의 단일 소스 오브 트루스.
// 허용 여부는 이름이 아닌 실제 보이싱(fret 배열)으로 엄격히 판정.
// ═══════════════════════════════════════════════════════════════

// ── 내부 헬퍼 ────────────────────────────────────────────────
// fret 문자열(6→1번줄 순) → 캔버스 순(1→6번줄) fret 배열로 변환
function _parseFrets(str) {
  return str.trim().split(/\s+/).map(t => t === 'x' ? null : parseInt(t, 10)).reverse();
}

// chordsLibrary v.frets 와 허용 fret 배열 exact match
function _freqMatch(vFrets, allowed) {
  if (!vFrets || vFrets.length !== allowed.length) return false;
  return allowed.every((f, i) => f === vFrets[i]);
}

// ── 1. 오픈(Static) 허용 보이싱 ──────────────────────────────
// 입력: 6번줄→1번줄 순 fret 문자열
// 내부에서 캔버스 순(1→6번줄)으로 변환 후 저장
const _ALLOWED_STATIC_FRETS = [
  // M 오픈
  _parseFrets('x 3 2 0 1 0'),   // C
  _parseFrets('x 0 2 2 2 0'),   // A
  _parseFrets('3 2 0 0 0 3'),   // G
  _parseFrets('0 2 2 1 0 0'),   // E
  _parseFrets('x x 0 2 3 2'),   // D
  // m 오픈
  _parseFrets('x 0 2 2 1 0'),   // Am
  _parseFrets('0 2 2 0 0 0'),   // Em
  _parseFrets('x x 0 2 3 1'),   // Dm
  // sus4 오픈
  _parseFrets('x 3 3 0 1 1'),   // Csus4
  _parseFrets('x 0 2 2 3 0'),   // Asus4
  _parseFrets('3 2 0 0 1 3'),   // Gsus4
  _parseFrets('x x 0 2 3 3'),   // Dsus4
  // sus2 오픈
  _parseFrets('x 0 2 2 0 0'),   // Asus2
  _parseFrets('x x 0 2 3 0'),   // Dsus2
  // M7 오픈
  _parseFrets('0 2 1 1 0 0'),   // EM7
  _parseFrets('x 3 2 0 0 0'),   // CM7
  _parseFrets('x x 3 2 1 0'),   // FM7
  _parseFrets('3 2 0 0 0 2'),   // GM7
  _parseFrets('x 0 2 1 2 0'),   // AM7
  _parseFrets('x x 0 2 2 2'),   // DM7
  // 7 오픈
  _parseFrets('x 3 2 3 1 0'),   // C7
  _parseFrets('3 2 0 0 0 1'),   // G7
  _parseFrets('0 2 2 1 3 0'),   // E7
  _parseFrets('x 0 2 0 2 0'),   // A7
  // m7 오픈
  _parseFrets('x x 0 2 1 1'),   // Dm7
  _parseFrets('x 0 2 0 1 0'),   // Am7
  _parseFrets('0 2 2 0 3 0'),   // Em7
  // 7 오픈
  _parseFrets('x x 0 2 1 2'),   // D7
  _parseFrets('x 2 1 2 0 2'),   // B7
  // slash 오픈 (전위코드)
  _parseFrets('0 3 2 0 1 0'),   // C/E
  _parseFrets('3 3 2 0 1 0'),   // C/G
  _parseFrets('0 0 2 2 2 0'),   // A/E
  _parseFrets('0 x 2 2 1 0'),   // Am/E
  _parseFrets('x 4 2 2 2 0'),   // A/C#
  _parseFrets('x 2 0 0 0 3'),   // G/B
  _parseFrets('x x 0 0 0 3'),   // G/D
  _parseFrets('2 x 0 2 3 2'),   // D/F#
  _parseFrets('x 0 0 2 3 2'),   // D/A
  _parseFrets('x 0 3 2 1 1'),   // F/A
];

// 일반 코드(non-slash) 경로용: slash 이름(name에 '/' 포함) 제외
function isAllowedStaticVoicing(v) {
  if (!v || v.source !== 'static') return false;
  if (v.name && v.name.includes('/')) return false;
  return _ALLOWED_STATIC_FRETS.some(allowed => _freqMatch(v.frets, allowed));
}

// slash 코드 경로용: '/' 포함 name도 허용 (이름 매칭은 getCandidates에서 따로 처리)
function isAllowedSlashStaticVoicing(v) {
  if (!v || v.source !== 'static') return false;
  return _ALLOWED_STATIC_FRETS.some(allowed => _freqMatch(v.frets, allowed));
}

// ── 공통: shape 계산 ─────────────────────────────────────────
// canvas 순(1→6번줄) fret 배열 → 최솟값 기준 상대 오프셋
// null(뮤트) 유지
function _shapeOf(frets) {
  const min = Math.min(...frets.filter(f => f !== null));
  return frets.map(f => f === null ? null : f - min);
}

// ── 2. Slash 허용 보이싱 ─────────────────────────────────────
// 전위코드: 지정된 2개 패턴 shape만 허용
// Pattern 1: 'r+2 x r r+2 r+3 x'  (rootStr:6) → canvas [null,3,2,0,null,2]
// Pattern 2: 'x r+2 r r r x'      (rootStr:5) → canvas [null,0,0,0,2,null]
// Pattern 3: 'x x r+2 r r+1 r'   (rootStr:4) → canvas [0,1,0,2,null,null]
const _ALLOWED_SLASH_SHAPES = [
  [null, 3, 2, 0, null, 2],
  [null, 0, 0, 0, 2, null],
  [0, 1, 0, 2, null, null],
  // CM7/E: x r r+2 r+2 r+1 x (rootStr:6) → [null,1,2,2,0,null]
  [null, 1, 2, 2, 0, null],
  // CM7/E: x x r r+2 r+3 r+1 (rootStr:5) → [1,3,2,0,null,null]
  [1, 3, 2, 0, null, null],
  // C7/E: r+2 x r r+2 r+1 x (rootStr:6) → [null,1,2,0,null,2]
  [null, 1, 2, 0, null, 2],
  // C7/E: x r+2 x r r r+1 (rootStr:5) → [1,0,0,null,2,null]
  [1, 0, 0, null, 2, null],
  // C7/E: x r+2 r r r r+1 (rootStr:5) → [1,0,0,0,2,null]
  [1, 0, 0, 0, 2, null],
  // C7/E: x x r+1 r+2 r r+2 (rootStr:4) → [2,0,2,1,null,null]
  [2, 0, 2, 1, null, null],
];

function isAllowedSlashVoicing(v) {
  if (!v || v.quality !== 'slash' || v.source !== 'pattern') return false;
  const shape = _shapeOf(v.frets);
  return _ALLOWED_SLASH_SHAPES.some(allowed =>
    allowed.every((f, i) => f === shape[i])
  );
}

// ── 3. 바레(Pattern) 허용 보이싱 ─────────────────────────────
// 지정된 패턴과 동일한 fret shape만 허용
// shape 계산: 6→1번줄 패턴 문자열 → reverse → canvas 1→6번줄 → min 오프셋 제거
//
// M     rootStr:6  r r+2 r+2 r+1 r r         → [0,0,1,2,2,0]
// M     rootStr:5  x r r+2 r+2 r+2 r         → [0,2,2,2,0,null]
// m     rootStr:6  r r+2 r+2 r r r           → [0,0,0,2,2,0]
// m     rootStr:5  x r r+2 r+2 r+1 r         → [0,1,2,2,0,null]
// sus4  rootStr:6  r r+2 r+2 r+2 r r         → [0,0,2,2,2,0]
// sus4  rootStr:5  x r r+2 r+2 r+3 r         → [0,3,2,2,0,null]
// sus2  rootStr:5  x r r+2 r+2 r r           → [0,0,2,2,0,null]
// sus2  rootStr:4  x x r r+2 r+3 r           → [0,3,2,0,null,null]
// M7    rootStr:6  r x r+1 r+1 r x           → [null,0,1,1,null,0]
// M7    rootStr:5  x r r+2 r+1 r+2 r         → [0,2,1,2,0,null]
// M7    rootStr:4  x x r r+2 r+2 r+2         → [2,2,2,0,null,null]
// 7     rootStr:6  r r+2 r r+1 r r           → [0,0,1,0,2,0]
// 7     rootStr:5  x r r+2 r r+2 r           → [0,2,0,2,0,null]
// 7     rootStr:4  x x r r+2 r+1 r+2         → [2,1,2,0,null,null]
// m7    rootStr:6  r+1 x r+1 r+1 r+1 x       → [null,0,0,0,null,0]
// m7    rootStr:5  x r r+2 r r+1 r           → [0,1,0,2,0,null]
// m7    rootStr:4  x x r r+2 r+1 r+1         → [1,1,2,0,null,null]
// m7b5  rootStr:6  r+1 x r+1 r+1 r x         → [null,0,1,1,null,1]
// m7b5  rootStr:5  x r+1 r+2 r+1 r+2 x       → [null,1,0,1,0,null]
// m7b5  rootStr:4  x x r+1 r+2 r+2 r+2       → [1,1,1,0,null,null]
// dim7  rootStr:6  r+2 x r+1 r+2 r+1 x       → [null,0,1,0,null,1]
// dim7  rootStr:5  x r+1 r+2 r r+2 x         → [null,2,0,2,1,null]
// dim7  rootStr:4  x x r+1 r+2 r+1 r+2       → [1,0,1,0,null,null]
// dim   rootStr:6  r+1 r+2 r+3 r+1 x x       → [null,null,0,2,1,0]
// dim   rootStr:5  x r+1 r+2 r+3 r+2 x       → [null,1,2,1,0,null]
// dim   rootStr:4  x x r+1 r+2 x r+2         → [1,null,1,0,null,null]
const _ALLOWED_PATTERN_SHAPES = [
  [0, 0, 1, 2, 2, 0],         // M rootStr:6
  [0, 2, 2, 2, 0, null],      // M rootStr:5
  [0, 0, 0, 2, 2, 0],         // m rootStr:6
  [0, 1, 2, 2, 0, null],      // m rootStr:5
  [0, 0, 2, 2, 2, 0],         // sus4 rootStr:6
  [0, 3, 2, 2, 0, null],      // sus4 rootStr:5
  [0, 0, 2, 2, 0, null],      // sus2 rootStr:5
  [0, 3, 2, 0, null, null],   // sus2 rootStr:4
  [null, 0, 1, 1, null, 0],   // M7 rootStr:6
  [0, 2, 1, 2, 0, null],      // M7 rootStr:5
  [2, 2, 2, 0, null, null],   // M7 rootStr:4
  [0, 0, 1, 0, 2, 0],         // 7 rootStr:6
  [0, 2, 0, 2, 0, null],      // 7 rootStr:5
  [2, 1, 2, 0, null, null],   // 7 rootStr:4
  [null, 0, 0, 0, null, 0],   // m7 rootStr:6
  [0, 1, 0, 2, 0, null],      // m7 rootStr:5
  [1, 1, 2, 0, null, null],   // m7 rootStr:4
  [null, 0, 1, 1, null, 1],   // m7b5 rootStr:6
  [null, 1, 0, 1, 0, null],   // m7b5 rootStr:5
  [1, 1, 1, 0, null, null],   // m7b5 rootStr:4
  [null, 0, 1, 0, null, 1],   // dim7 rootStr:6
  [null, 2, 0, 2, 1, null],   // dim7 rootStr:5
  [1, 0, 1, 0, null, null],   // dim7 rootStr:4
  [null, null, 0, 2, 1, 0],   // dim rootStr:6
  [null, 1, 2, 1, 0, null],   // dim rootStr:5
  [1, null, 1, 0, null, null],// dim rootStr:4
  [0, 0, 2, 0, 2, 0],         // 7sus4 rootStr:6
  [0, 3, 0, 2, 0, null],      // 7sus4 rootStr:5
  [3, 1, 2, 0, null, null],   // 7sus4 rootStr:4
  [null, 1, 1, 0, null, 1],   // m6 rootStr:6
  [1, 2, 0, null, 1, null],   // m6 rootStr:5
  [1, 0, 2, 0, null, null],   // m6 rootStr:4
  [null, 1, 2, 0, null, 1],   // 6 rootStr:6
  [null, 0, 1, 1, 2, null],   // 6 rootStr:5
  [2, 2, 2, null, 0, null],   // 6 rootStr:5 (alt)
  [2, 0, 2, 0, null, null],   // 6 rootStr:4
];

function isAllowedPatternVoicing(v) {
  if (!v || v.source !== 'pattern') return false;
  const shape = _shapeOf(v.frets);
  return _ALLOWED_PATTERN_SHAPES.some(allowed =>
    allowed.every((f, i) => f === shape[i])
  );
}

// ── 4. 텐션(Tension) 허용 보이싱 ─────────────────────────────
// chord-voicings.js quality:'tension' 항목의 fret shape 허용 목록
const _ALLOWED_TENSION_SHAPES = [
  [0, 1, 2, 2, null, 0],       // 7sus4(b13) rootStr:6
  [null, 0, 1, 2, null, 2],    // 7sus4(9) rootStr:6
  [null, 0, 0, 0, 0, null],    // 7sus4(9) rootStr:5
  [0, 1, 0, 0, null, null],    // 7sus4(9) rootStr:4
  [2, 0, 1, 1, null, 0],       // M7(9) rootStr:6
  [null, 1, 2, 0, 1, null],    // M7(9) rootStr:5
  [0, 0, 1, 2, 0, null],       // M7(9) rootStr:5 (alt)
  [0, 2, 2, 0, null, null],    // M7(9) rootStr:4
  [null, 0, 2, 2, null, 1],    // M7(#11) rootStr:6
  [null, 2, 1, 1, 0, null],    // M7(#11) rootStr:5
  [2, 2, 1, 0, null, null],    // M7(#11) rootStr:4
  [null, 2, 1, 1, null, 0],    // M7(13) rootStr:6
  [2, 2, 1, null, 0, null],    // M7(13) rootStr:5
  [2, 0, 0, 0, 2, 0],          // m7(9) rootStr:6
  [null, 2, 2, 0, 2, null],    // m7(9) rootStr:5
  [2, 3, 0, 2, null, null],    // m7(9) rootStr:4
  [null, 0, 2, 2, null, 2],    // m7(11) rootStr:6
  [0, 0, 2, 2, null, 2],       // m7(11) rootStr:6 (alt)
  [0, 3, 2, null, 2, null],    // m7(11) rootStr:5
  [null, 2, 0, 0, null, 0],    // m7(13) rootStr:6
  [2, 1, 0, null, 0, null],    // m7(13) rootStr:6 (alt fingering)
  [1, 0, 1, 0, null, 0],       // 7(b9) rootStr:6
  [null, 0, 1, 0, 1, null],    // 7(b9) rootStr:5
  [0, 2, 0, 1, null, null],    // 7(b9) rootStr:4
  [2, 0, 1, 0, null, 0],       // 7(9) rootStr:6
  [null, 1, 1, 0, 1, null],    // 7(9) rootStr:5
  [0, 0, 0, 2, 0, null],       // 7(9) rootStr:5 (alt)
  [0, 1, 2, 0, null, null],    // 7(9) rootStr:4
  [1, 2, 0, 1, null, null],    // 7(9) rootStr:4 (alt)
  [3, 0, 1, 0, 2, 0],          // 7(#9) rootStr:6
  [null, 2, 1, 0, 1, null],    // 7(#9) rootStr:5
  [2, 2, 0, 1, null, null],    // 7(#9) rootStr:4
  [null, 0, 2, 1, null, 1],    // 7(#11) rootStr:6
  [null, 2, 1, 0, 1, null],    // 7(#11) rootStr:5 (dup shape w/ #9, harmless)
  [2, 1, 1, 0, null, null],    // 7(#11) rootStr:4
  [1, 0, 1, 0, null, 0],       // 7(b13) rootStr:6 (dup shape w/ b9, harmless)
  [1, 2, 0, 2, 0, null],       // 7(b13) rootStr:5
  [1, 2, 0, null, 0, null],    // 7(b13) rootStr:5 (alt)
  [3, 0, 1, 0, 2, 0],          // 7(13) rootStr:6 (dup shape w/ #9, harmless)
  [2, 2, 0, null, 0, null],    // 7(13) rootStr:5
];

function isAllowedTensionVoicing(v) {
  if (!v || v.quality !== 'tension' || v.source !== 'pattern') return false;
  const shape = _shapeOf(v.frets);
  return _ALLOWED_TENSION_SHAPES.some(allowed =>
    allowed.every((f, i) => f === shape[i])
  );
}
