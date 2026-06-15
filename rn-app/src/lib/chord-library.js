// ═══════════════════════════════════════════════════════════════
// chord-library.js  — 코드 라이브러리 빌더 (ES Module)
// chords-library.js (WebView) 의 React Native 이식 버전
// ═══════════════════════════════════════════════════════════════
import { CHORD_STATIC, CHORD_PATTERN, chordNoteName } from '../data/chord-voicings-rn';

// ── 음정 헬퍼 ────────────────────────────────────────────────
const FLAT_TO_SHARP = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
const SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
function toFlatName(name) {
  return name.replace(/[A-G]#/g, m => SHARP_TO_FLAT[m] || m);
}

// quality → 코드명 접미사 ('M'은 빈 문자열)
const Q_SUFFIX = {
  M:'', m:'m', M7:'M7', '7':'7', m7:'m7',
  sus4:'sus4', '7sus4':'7sus4', add9:'add9', sus2:'sus2',
  aug:'aug', dim:'dim', aug7:'aug7', dim7:'dim7',
  'm7(b5)':'m7(b5)', '6':'6', m6:'m6',
};

// ── 품질 정렬 순서 ────────────────────────────────────────────
const QUALITY_ORDER = [
  'M', 'm', 'M7', '7', 'm7', 'sus4', '7sus4', 'add9',
  'sus2', 'aug', 'dim', 'aug7', 'dim7', 'm7(b5)', '6', 'm6',
  'slash', 'hybrid', 'tension',
];

// ── 파싱 헬퍼 ────────────────────────────────────────────────
function parseTokens(str) {
  return str.trim().split(/\s+/).map(t => {
    if (t === 'x') return null;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    return t;
  });
}
function parseFingers(str) {
  return str.trim().split(/\s+/).map(t => {
    if (t === 'x' || t === '0') return null;
    if (t === 'T') return 'T';
    return parseInt(t, 10);
  });
}
function evalPat(tokens, r) {
  return tokens.map(p => {
    if (p === null) return null;
    if (typeof p === 'number') return p;
    if (p === 'r') return r;
    const m = String(p).match(/^r([+-]\d+)$/);
    if (m) return r + parseInt(m[1], 10);
    return parseInt(p, 10);
  });
}
function applyBarreRule4(range, frets, barreFret) {
  if (!range) return null;
  let { min, max } = range;
  while (min <= max && frets[min] !== null && frets[min] < barreFret) min++;
  while (max >= min && frets[max] !== null && frets[max] < barreFret) max--;
  return min <= max ? { min, max } : null;
}
function deriveOpenMute(frets) {
  return frets.map(f => {
    if (f === null) return 'mute';
    if (f === 0)   return 'open';
    return null;
  });
}

// ── 라이브러리 빌드 ──────────────────────────────────────────
function buildLibrary() {
  const lib = {};
  const ALL_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  // 1) 패턴 보이싱
  (CHORD_PATTERN || []).forEach(pat => {
    const tokens    = parseTokens(pat.pattern).reverse();
    const fingerArr = parseFingers(pat.fingers).reverse();
    const si        = 6 - pat.rootStr;
    const suffix    = Q_SUFFIX[pat.quality] ?? pat.quality;
    const nameFn    = pat.name || ((r, flat) => chordNoteName(si, r, flat) + suffix);
    const voicingLabel = `${pat.rootStr}번줄 바레`;

    for (let r = 0; r <= 11; r++) {
      const frets = evalPat(tokens, r);
      if (frets.some(f => f !== null && f < 0)) continue;

      const sharpName = nameFn(r, false);
      const flatName  = nameFn(r, true);
      const rootNote  = sharpName.match(/^([A-G]#?)/)?.[1] ?? sharpName[0];
      if (!lib[rootNote]) lib[rootNote] = [];

      let barreObj = {};
      let barreRange = null;
      if (pat.barre) {
        const oneIdxs = fingerArr.reduce((acc, f, i) => { if (f === 1) acc.push(i); return acc; }, []);
        const barreFret = oneIdxs.length >= 2 ? (frets[oneIdxs[0]] ?? r) : r;
        barreObj = { [barreFret]: true };
        if (oneIdxs.length >= 2) {
          let blockEnd = -1;
          for (let i = 0; i < frets.length; i++) {
            if (frets[i] === null) break;
            blockEnd = i;
          }
          const oneInBlock = oneIdxs.filter(i => i <= blockEnd);
          if (blockEnd >= 0 && oneInBlock.length >= 2) {
            barreRange = { min: 0, max: Math.max(...oneIdxs) };
          } else {
            barreRange = { min: Math.min(...oneIdxs), max: Math.max(...oneIdxs) };
          }
          barreRange = applyBarreRule4(barreRange, frets, barreFret);
        }
      }
      const openMute = frets.map(f => f === null ? 'mute' : null);
      const minFret  = pat.fretNumber !== undefined ? pat.fretNumber : Math.max(2, r + 1);

      lib[rootNote].push({
        quality: pat.quality, voicingLabel,
        frets, fingering: fingerArr,
        barre: barreObj, barreRange, openMute,
        fretNumber: minFret, name: sharpName, flatName,
        source: 'pattern',
      });
    }
  });

  // 2) 정적 보이싱
  (CHORD_STATIC || []).forEach(([fretsStr, names, fingersStr, quality, fretNum, opts]) => {
    const frets   = parseTokens(fretsStr).reverse();
    const fingers = parseFingers(fingersStr).reverse();
    const openMute  = deriveOpenMute(frets);
    const positives = frets.filter(f => f !== null && f > 0);
    const minFret   = fretNum !== undefined ? fretNum
                    : (positives.length ? Math.min(...positives) : 0);

    let staticBarre = {};
    let staticBarreRange = null;
    if (opts?.barre) {
      const oneIdxs = fingers.reduce((acc, f, i) => { if (f === 1) acc.push(i); return acc; }, []);
      if (oneIdxs.length >= 2) {
        const barreFret = frets[oneIdxs[0]];
        if (barreFret != null && barreFret > 0) {
          staticBarre = { [barreFret]: true };
          let blockEnd = -1;
          for (let i = 0; i < frets.length; i++) {
            if (frets[i] === null) break;
            blockEnd = i;
          }
          const oneInBlock = oneIdxs.filter(i => i <= blockEnd);
          if (blockEnd >= 0 && oneInBlock.length >= 2) {
            staticBarreRange = { min: 0, max: Math.max(...oneIdxs) };
          } else {
            staticBarreRange = { min: Math.min(...oneIdxs), max: Math.max(...oneIdxs) };
          }
          staticBarreRange = applyBarreRule4(staticBarreRange, frets, barreFret);
        }
      }
    }

    names.forEach(name => {
      const rootMatch = name.match(/^([A-G][#b]?)/);
      const rootNote  = rootMatch ? rootMatch[1] : name[0];
      const rootKey   = FLAT_TO_SHARP[rootNote] || rootNote;
      if (!lib[rootKey]) lib[rootKey] = [];
      const flatName = opts?.flat ? toFlatName(name) : name;
      lib[rootKey].push({
        quality, voicingLabel: 'Open',
        frets, fingering: fingers,
        barre: staticBarre, barreRange: staticBarreRange, openMute,
        fretNumber: minFret, name, flatName,
        source: 'static',
      });
    });
  });

  // 3) 정렬
  ALL_ROOTS.forEach(root => {
    if (!lib[root]) return;
    lib[root].sort((a, b) => {
      const ai = QUALITY_ORDER.indexOf(a.quality);
      const bi = QUALITY_ORDER.indexOf(b.quality);
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      if (av !== bv) return av - bv;
      if ((a.fretNumber ?? 0) !== (b.fretNumber ?? 0))
        return (a.fretNumber ?? 0) - (b.fretNumber ?? 0);
      return (a.source === 'static' ? 0 : 1) - (b.source === 'static' ? 0 : 1);
    });
  });

  // 4) 동일 보이싱 병합
  ALL_ROOTS.forEach(root => {
    if (!lib[root]) return;
    const merged = [];
    const keyMap = new Map();
    lib[root].forEach(entry => {
      const key = entry.name + '§' + entry.frets.join(',');
      if (keyMap.has(key)) {
        keyMap.get(key).fingerings.push(entry.fingering);
        keyMap.get(key).barres.push(entry.barre);
        keyMap.get(key).barreRanges.push(entry.barreRange);
      } else {
        entry.fingerings  = [entry.fingering];
        entry.barres      = [entry.barre];
        entry.barreRanges = [entry.barreRange];
        keyMap.set(key, entry);
        merged.push(entry);
      }
    });
    lib[root] = merged;
  });

  return lib;
}

// ── quality → 에디터 컴포넌트 매핑 ───────────────────────────
export function qualityToComponents(quality) {
  const map = {
    M:      { triad: '',    seventh: '',   func: '',     tensions: [] },
    m:      { triad: 'm',   seventh: '',   func: '',     tensions: [] },
    M7:     { triad: '',    seventh: 'M7', func: '',     tensions: [] },
    '7':    { triad: '',    seventh: '7',  func: '',     tensions: [] },
    m7:     { triad: 'm',   seventh: '7',  func: '',     tensions: [] },
    sus4:   { triad: '',    seventh: '',   func: 'sus4', tensions: [] },
    '7sus4':{ triad: '',    seventh: '7',  func: 'sus4', tensions: [] },
    add9:   { triad: '',    seventh: '',   func: 'add9', tensions: [] },
    sus2:   { triad: '',    seventh: '',   func: 'sus2', tensions: [] },
    aug:    { triad: 'aug', seventh: '',   func: '',     tensions: [] },
    dim:    { triad: 'dim', seventh: '',   func: '',     tensions: [] },
    aug7:   { triad: 'aug', seventh: '7',  func: '',     tensions: [] },
    dim7:   { triad: 'dim', seventh: '7',  func: '',     tensions: [] },
    'm7(b5)':{ triad: 'm', seventh: '7',  func: 'b5',   tensions: [] },
    mM7:    { triad: 'm',   seventh: 'M7', func: '',     tensions: [] },
    '6':    { triad: '',    seventh: '6',  func: '',     tensions: [] },
    m6:     { triad: 'm',   seventh: '6',  func: '',     tensions: [] },
  };
  return map[quality] || { triad: '', seventh: '', func: '', tensions: [] };
}

// ── 라이브러리 데이터 (한 번만 빌드) ────────────────────────
export const chordsLibrary = buildLibrary();

// ── 특정 근음의 코드 목록 조회 ────────────────────────────────
// useFlat: true → flatName 기준 표시
export function getChordsForRoot(root, useFlat = false) {
  const data = chordsLibrary[root] || [];
  if (!useFlat) return data;
  // 플랫 표기: name/flatName 교환 (표시용)
  return data.map(e => ({ ...e, displayName: e.flatName || e.name }));
}

// ── 코드 라이브러리 항목 → ChordDiagram 용 chord 객체 변환 ──
// entry: chordsLibrary 항목 하나 (fingerings[0] 기준)
export function entryToChord(entry, fingeringIdx = 0) {
  const fi   = Math.min(fingeringIdx, entry.fingerings.length - 1);
  const fing = entry.fingerings[fi] || entry.fingering || [];
  const barr = entry.barres?.[fi] || entry.barre || {};
  // dots 재구성: frets 배열(캔버스 순, s=0:1번줄) 기준
  // 표시 시작 프렛: 실제 점들의 최솟값 기준
  const positiveFrets = entry.frets.filter(f => f !== null && f > 0);
  const minAbsFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  // 다이어그램 column 기준 (1~4): absolute fret - (minAbsFret - 1)
  const fretOffset = minAbsFret > 1 ? minAbsFret - 1 : 0;
  const displayFretNumber = minAbsFret > 1 ? minAbsFret : 1;

  const dots = [];
  entry.frets.forEach((f, s) => {
    if (f !== null && f > 0) {
      const fingerVal = fing[s];
      const n = (fingerVal === null || fingerVal === 'T') ? 0
              : typeof fingerVal === 'number' ? fingerVal : 0;
      dots.push({ s, f: f - fretOffset, n });
    }
  });
  return {
    root: '',          // 라이브러리 뷰에서는 근음 불필요
    accidental: 'sharp',
    triad: '', seventh: '', func: '', tensions: [],
    bass: '',
    fretNumber: displayFretNumber,
    fingerNumMode: false,  // LibraryScreen에서 showFinger로 오버라이드
    dots,
    barre: barr,
    openMute: entry.openMute || entry.frets.map(() => null),
    name: entry.name || '',
  };
}
