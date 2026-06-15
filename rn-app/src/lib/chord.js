import { genId } from './utils';
import { STRINGS } from '../constants/app';

// ── 코드명 빌드 ───────────────────────────────────────────────────
export function buildChordName(data) {
  const { root = '', triad = '', seventh = '', func = '', tensions = [], bass = '' } = data;
  let n = root + triad + seventh;
  if (func === 'b5') n += '(b5)';
  else if (func) n += func;
  if (tensions && tensions.length) n += '(' + tensions.join(',') + ')';
  if (bass) n += '/' + bass;
  return n;
}

// ── 코드명 → 컴포넌트 파싱 ───────────────────────────────────────
// ⛔ 수정 금지 (parseChordNameToComponents 와 동일 로직)
export function parseChordNameToComponents(name) {
  const rootMatch = name.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  let rest = name.slice(root.length);

  // 분수코드 베이스 추출
  let bass = '';
  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx >= 0) {
    bass = rest.slice(slashIdx + 1);
    rest = rest.slice(0, slashIdx);
  }

  const MAP = [
    ['mM7',    { triad: 'm',   seventh: 'M7', func: '' }],
    ['m7(b5)', { triad: 'm',   seventh: '7',  func: 'b5' }],
    ['m7',     { triad: 'm',   seventh: '7',  func: '' }],
    ['m6',     { triad: 'm',   seventh: '6',  func: '' }],
    ['M7',     { triad: '',    seventh: 'M7', func: '' }],
    ['7sus4',  { triad: '',    seventh: '7',  func: 'sus4' }],
    ['7',      { triad: '',    seventh: '7',  func: '' }],
    ['6',      { triad: '',    seventh: '6',  func: '' }],
    ['dim7',   { triad: 'dim', seventh: '7',  func: '' }],
    ['dim',    { triad: 'dim', seventh: '',   func: '' }],
    ['aug7',   { triad: 'aug', seventh: '7',  func: '' }],
    ['aug',    { triad: 'aug', seventh: '',   func: '' }],
    ['sus4',   { triad: '',    seventh: '',   func: 'sus4' }],
    ['sus2',   { triad: '',    seventh: '',   func: 'sus2' }],
    ['add9',   { triad: '',    seventh: '',   func: 'add9' }],
    ['m',      { triad: 'm',   seventh: '',   func: '' }],
    ['',       { triad: '',    seventh: '',   func: '' }],
  ];

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) return { root, bass, tension: '', ...comp };
  }

  let tension = '';
  const tensionMatch = rest.match(/\(([^)]+)\)/);
  if (tensionMatch) {
    tension = tensionMatch[1].split(',')[0].trim();
    rest = rest.replace(tensionMatch[0], '');
  }

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) return { root, bass, tension, ...comp };
  }

  return { root, bass, tension, triad: '', seventh: '', func: '' };
}

// ── 빈 코드 객체 생성 ─────────────────────────────────────────────
export function createEmptyChord() {
  return {
    id: genId(),
    name: 'A',
    root: 'A',
    triad: '',
    seventh: '',
    func: '',
    tensions: [],
    bass: '',
    dots: [],
    barre: {},
    openMute: new Array(STRINGS).fill('open'),
    fretNumber: 2,
    fingerNumMode: false,
    accidental: 'sharp',
  };
}
