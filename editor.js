// ═════════════════════════════════════════════════
// 코드 에디터 페이지 (editor.html)
// ─────────────────────────────────────────────────
// home.js의 #view-editor 로직을 별도 페이지로 분리한 파일(2026-10-13). 이 파일은 home.js의 에디터 부분을 복사한 것이다.
// 홈 쪽 원본은 정리 전까지 남겨둔다(library.js와 같은 방식). 이 페이지가 쓰는 것:
//   shared.js(플랜·저장·분석·온보딩 관문) / voicing-canvas.js / chord-voicings.js / guitar-audio.js
// 진입: 홈 카드 / library.html "에디터로"(sessionStorage 인계, ?from_lib=1) / user_project.html(?from_project=&chord_id=)
// 뒤로가기: from_lib → library.html, from_project → user_project.html?id=, 그 외 → home.html
// ═════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 캔버스 설정
// ═══════════════════════════════════════════════════════════════
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

// ── 캔버스 구조 정의 (canvas_structure.md) ──────────────────────
// 프렛보드 중심으로 각 영역을 명시적으로 정의
const STRINGS        = 6;
const FRETS          = 4;
const BASE_OPEN_W    = 70;   // 개방현 영역 너비 (nut 좌측)
const BASE_PAD_L     = 35;   // nut 포함 시각 중앙정렬: tl=(BASE_W-FBW+nutW)/2=105, PAD_L=105-OPEN_W
const BASE_PAD_R     = 95;   // 우측 여백 = BASE_W - tl - FBW = 440-105-240 = 95
const BASE_PAD_T     = 80;   // 프렛보드 상단 여백 (코드명 영역)
const BASE_PAD_B     = 80;   // 프렛보드 하단 여백 (프렛번호 영역)
const BASE_FBW       = 240;  // 프렛보드 너비
const BASE_FBH       = 192;  // 프렛보드 높이 (BASE_FBW × 4/5, 5:4 비율)
const BASE_W         = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R;  // = 460
const BASE_H         = BASE_PAD_T + BASE_FBH + BASE_PAD_B;                 // = 352
const MAIN_DISPLAY_SCALE = 0.8;
const EXPORT_BASE_W = 100;  // 이미지 저장 1배 기준 너비
const EXPORT_BASE_H = 80;   // 이미지 저장 1배 기준 높이 (5:4)

let RATIO = 1;

const r  = () => RATIO;
const W  = () => Math.round(BASE_W  * r());
const CH = () => Math.round(BASE_H  * r());
const TL = () => Math.round((BASE_PAD_L + BASE_OPEN_W) * r());             // nut x
const TR = () => Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * r()); // 프렛보드 우측
const TT = () => Math.round(BASE_PAD_T * r());                     // 프렛보드 상단
const TB = () => Math.round((BASE_PAD_T + BASE_FBH) * r());        // 프렛보드 하단
const FW = () => (TR() - TL()) / FRETS;                            // 프렛 간격
const SH = () => (TB() - TT()) / (STRINGS - 1);                    // 현 간격
const DS = () => Math.round(SH() * 0.95);                          // dot 크기

function resizeCanvas() {
  // 표시 크기는 CSS(.ed-main-area #c, --ed-canvas-w)가 정한다 — 여기선 그 폭에 DPR을 곱해 비트맵 해상도만 맞춘다.
  // ⚠️ canvas.style.width는 튜토리얼 오버레이(고스트·화살표)가 물리→CSS 변환(ds = style.width / canvas.width)에
  //    쓰므로 실제 표시폭을 인라인으로도 남긴다.
  const cssW = canvas.clientWidth;
  if (!cssW) return;   // 숨김(가로 배치 등)
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  RATIO = (cssW * dpr) / BASE_W;
  canvas.style.width = cssW + 'px';
  canvas.width  = W();
  canvas.height = CH();
  draw();
}

// ═══════════════════════════════════════════════════════════════
// 이미지 로드
// ═══════════════════════════════════════════════════════════════
const IMAGES = {};
const IMAGE_LIST = [
  'root_t','root1','root2','root3','root4',
  'common_t','common1','common2','common3','common4',
  'barre_two','barre_three','barre_four','barre_five','barre_six',
  'open','open_root','mute'
];
const BARRE_KEYS = { 2:'barre_two', 3:'barre_three', 4:'barre_four', 5:'barre_five', 6:'barre_six' };

let loadedCount = 0;
IMAGE_LIST.forEach(key => {
  const img = new Image();
  img.src = `image/${key}.png`;
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) { resizeCanvas(); } };
  IMAGES[key] = img;
});

// ═══════════════════════════════════════════════════════════════
// 코드명 상태
// ═══════════════════════════════════════════════════════════════
const ROOTS_SHARP = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const ROOTS_FLAT  = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];

// ── 코드명 추천 엔진 ──
class GuitarChordSuggester {
  static OPEN_PCS  = [4, 9, 2, 7, 11, 4];
  static OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  static NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  static NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  static NAMES_AUTO  = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

  constructor(opts = {}) {
    this.options = { maxResults:4, searchThreshold:38, spellingMode:'auto',
      preferDominantFlat7SlashShorthand:true, ...opts };
    this.voicingLibrary = new Map();
  }

  static _sharpToFlat(name) {
    const map = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
    return name.replace(/[A-G]#/g, m => map[m] || m);
  }

  addVoicing(input, names, flatNames = null) {
    const key = this._key(this._parse(input));
    const sharp = Array.isArray(names) ? names : [names];
    const flat = flatNames
      ? (Array.isArray(flatNames) ? flatNames : [flatNames])
      : sharp.map(n => GuitarChordSuggester._sharpToFlat(n));
    // 동일 운지에 여러 이름이 있을 경우 누적 (덮어쓰기 금지)
    const existing = this.voicingLibrary.get(key);
    if (existing) {
      for (const n of sharp) if (!existing.sharp.includes(n)) existing.sharp.push(n);
      for (const n of flat)  if (!existing.flat.includes(n))  existing.flat.push(n);
    } else {
      this.voicingLibrary.set(key, { sharp: [...sharp], flat: [...flat] });
    }
  }

  suggest(input, opts = {}) {
    const maxR = opts.maxResults ?? this.options.maxResults;
    const anal = this._analyze(input);
    if (!anal.sounding.length) return ['검색 안됨'];

    const exact = this.voicingLibrary.get(anal.voicingKey);
    if (exact?.sharp?.length) {
      const names = this.options.spellingMode === 'flat' ? exact.flat : exact.sharp;
      return names.slice(0, maxR);  // 동일 운지의 모든 코드명 반환 (최대 maxResults개)
    }

    const candidates = [];
    for (let root = 0; root < 12; root++) {
      for (const quality of ['major','minor','aug','dim']) {
        for (const seventh of this._allowedSevenths(quality)) {
          for (const func of [null,'sus4','add9','b5']) {
            if (!this._validBase(quality, seventh, func)) continue;
            const base = this._eval(anal, root, quality, seventh, func, null, null);
            if (base) candidates.push(base);
            for (const tension of ['b9','9','#9','11','#11','b13','13']) {
              if (!this._canTension(quality, seventh, func, tension)) continue;
              const c = this._eval(anal, root, quality, seventh, func, tension, null);
              if (c) candidates.push(c);
            }
          }
        }
      }
    }

    const withSlash = [...candidates];
    for (const c of candidates) {
      const sv = this._slashVariant(c, anal);
      if (sv) withSlash.push(sv);
    }

    const best = new Map();
    for (const c of withSlash) {
      const prev = best.get(c.name);
      if (!prev || c.score > prev.score) best.set(c.name, c);
    }

    const sorted = [...best.values()].sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.isSlash !== b.isSlash ? (a.isSlash ? 1 : -1) : a.name.localeCompare(b.name)
    ).filter(c => c.score >= this.options.searchThreshold);

    return sorted.length ? sorted.slice(0, maxR).map(c => c.name) : ['검색 안됨'];
  }

  _parse(input) {
    const tokens = Array.isArray(input) ? input
      : typeof input === 'string' ? (/\s/.test(input.trim()) ? input.trim().split(/\s+/) : input.trim().split(''))
      : (() => { throw new TypeError('입력은 문자열 또는 배열이어야 합니다.'); })();
    if (tokens.length !== 6) throw new Error(`입력 길이는 6이어야 합니다. 받은: ${tokens.length}`);
    return tokens.map(t => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'number') return t;
      const s = String(t).trim();
      if (/^[xX]$/.test(s)) return null;
      return parseInt(s, 10);
    });
  }

  _key(frets) { return frets.map(f => f === null ? 'x' : String(f)).join('|'); }

  _analyze(input) {
    const frets = this._parse(input);
    const raw = frets.map((fret, idx) =>
      fret === null ? null : {
        string: 6 - idx, fret,
        pc: (GuitarChordSuggester.OPEN_PCS[idx] + fret) % 12,
        midi: GuitarChordSuggester.OPEN_MIDI[idx] + fret,
      }
    );
    const sounding = raw.filter(Boolean);
    const pcsOrdered = [];
    for (const n of sounding) if (!pcsOrdered.includes(n.pc)) pcsOrdered.push(n.pc);
    return { frets, raw, sounding, pcsOrdered,
      lowestPc: sounding[0]?.pc ?? null, voicingKey: this._key(frets) };
  }

  _allowedSevenths(q) {
    if (q === 'aug') return [null, '7'];
    if (q === 'dim') return [null, '7', 'dim7'];
    return [null, 'M7', '7', '6'];
  }

  _validBase(q, s, f) {
    if (q === 'minor' && (f === 'add9' || f === 'sus4')) return false;
    if (f === 'sus4' && q !== 'major') return false;
    if (f === 'add9' && q !== 'major') return false;
    if (f === 'add9' && s !== null) return false;
    if (f === 'sus4' && f === 'b5') return false;
    if (q === 'dim' && f === 'b5') return false;
    if (s === 'M7' && f === 'b5') return false;
    if (s === '6' && f === 'b5') return false;
    if (s === 'M7' && f === 'sus4') return false;
    if (q === 'aug' && (s === 'M7' || s === '6' )) return false;
    if (q === 'aug' && f === 'b5') return false;
    if (q === 'dim' && s === '6') return false;
    if (s === '6' && f === 'sus4') return false; // 6코드는 완성된 장3화음 기반, sus4와 공존 불가
    return true;
  }

  _canTension(q, s, f, t) {
    if (!t) return true;
    if (!s || s === 'dim7' || s === '6') return false;
    if (f === 'add9' && ['b9','9','#9'].includes(t)) return false;
    if (s === '6' && t === 'b13') return false;
    if (q === 'major' && s === '7' && f === 'add9') return false;
    if (f === 'sus4' && t) return false;
    if (f === 'b5' && t) return false;
    if (q === 'dim' && s === '7') return false;
    return this._allowedTensions(q, s, f).includes(t);
  }

  _allowedTensions(q, s, f) {
    if (q === 'major' && s === '7') return ['b9','9','#9','11','#11','b13','13'];
    if (q === 'major' && s === 'M7') return ['9','#11','13'];
    if (q === 'minor' && s === '7') return ['9','11'];
    if (q === 'dim'   && s === '7') return ['11','b13'];
    return [];
  }

  _itvMap() { return { b9:1, '9':2, '#9':3, '11':5, '#11':6, b13:8, '13':9 }; }

  _observed(pcsOrdered, root) {
    const seen = new Set(), out = [];
    for (const pc of pcsOrdered) {
      const iv = (pc - root + 12) % 12;
      if (!seen.has(iv)) { seen.add(iv); out.push(iv); }
    }
    return out.sort((a, b) => a - b);
  }

  _buildSpec(q, s, f, t) {
    const allowed = new Set([0]), required = new Set();
    let opt5 = false;

    if (q === 'major') { allowed.add(4); required.add(4); allowed.add(7); opt5 = true; }
    if (q === 'minor') { allowed.add(3); required.add(3); allowed.add(7); opt5 = true; }
    if (q === 'aug')   { allowed.add(4); required.add(4); allowed.add(8); required.add(8); }
    if (q === 'dim')   { allowed.add(3); required.add(3); allowed.add(6); required.add(6); }

    if (f === 'sus4') {
      allowed.delete(4); required.delete(4);
      allowed.add(5); required.add(5); allowed.add(4);
    }
    if (f === 'add9') { allowed.add(2); required.add(2); }
    if (f === 'b5')   { allowed.delete(7); required.delete(7); allowed.add(6); required.add(6); opt5 = false; }

    if (s === 'M7')   { allowed.add(11); required.add(11); }
    if (s === '7')    { allowed.add(10); required.add(10); }
    if (s === '6')    { allowed.add(9);  required.add(9);  }
    if (s === 'dim7') { allowed.add(9);  required.add(9);  }

    if (t) { const iv = this._itvMap()[t]; allowed.add(iv); required.add(iv); }

    return { allowed, required, opt5 };
  }

  _eval(anal, root, q, s, f, t, slash) {
    if (!this._validBase(q, s, f)) return null;
    if (!this._canTension(q, s, f, t)) return null;
    if ((q === 'dim' || s === 'dim7') && slash !== null) return null;

    const obs = this._observed(anal.pcsOrdered, root);
    const obsSet = new Set(obs);
    const spec = this._buildSpec(q, s, f, t);

    for (const r of spec.required) if (!obsSet.has(r)) return null;

    const rootPresent = anal.sounding.some(n => n.pc === root);
    let score = rootPresent ? 12 : -7;
    if (anal.lowestPc === root) score += 14;
    score += spec.required.size * 11;
    if (spec.opt5 && obsSet.has(7)) score += 6;

    const unexplained = obs.filter(iv => !spec.allowed.has(iv));
    score -= unexplained.length * 22;
    if (unexplained.length >= 2) return null;

    if (q === 'major' && obsSet.has(3)) score -= 18;
    if (q === 'minor' && obsSet.has(4)) score -= 18;
    if (f === 'sus4' && (obsSet.has(3) || obsSet.has(4))) score -= 10;
    if (q === 'major' && s === '7' && f === 'b5' && !obsSet.has(7) && obsSet.has(6)) score -= 12;
    if (q === 'dim' && s === '7' && t) score -= 18;
    if (anal.lowestPc === root && !obsSet.has(3) && !obsSet.has(4)) score += 6;
    if (q === 'minor' && s === '6' && !slash) score += 5;
    if (f === 'sus4' && t) score -= 6; // sus4 + tension 과해석 억제
    //if (!t) score += 3;                // tension 없는 단순 구조 우대

    if (slash !== null) {
      if (anal.lowestPc !== slash) return null;
      if (!obsSet.has((slash - root + 12) % 12)) return null;
      score += 11; score -= 2;
      const slashInterval = (slash - root + 12) % 12;
      if (slashInterval === 4 || slashInterval === 3) score += 2;
      if (slashInterval === 7) score += 1;
      if (slashInterval === 10 || slashInterval === 11) score += 1;
    }

    return { name: this._fmt(root, q, s, f, t, slash), score, root, quality:q,
      seventh:s, func:f, tension:t, slash, isSlash: slash !== null };
  }

  _slashVariant(c, anal) {
    const lo = anal.lowestPc;
    if (lo === null || c.slash !== null || lo === c.root) return null;
    if (c.quality === 'dim' || c.seventh === 'dim7') return null;
    return this._eval(anal, c.root, c.quality, c.seventh, c.func, c.tension, lo);
  }

  _fmt(root, q, s, f, t, slash) {
    const rn = this._spell(root);
    if (q === 'dim' && s === 'dim7') return rn + 'dim7';
    if (q === 'dim' && s === '7') {
      const items = ['b5']; if (t) items.push(t);
      const base = `${rn}m7(${items.join(',')})`;
      return slash !== null && slash !== root ? `${base}/${this._spell(slash)}` : base;
    }
    let base = rn;
    if (q === 'minor') base += 'm';
    if (q === 'aug')   base += 'aug';
    if (q === 'dim' && !s) base += 'dim';
    if (q === 'major') { if (s==='M7') base+='M7'; else if (s==='7') base+='7'; else if (s==='6') base+='6'; }
    if (q === 'minor') { if (s==='M7') base+='M7'; else if (s==='7') base+='7'; else if (s==='6') base+='6'; }
    if (q === 'aug' && s === '7') base += '7';
    if (f === 'sus4') base += 'sus4';
    if (f === 'add9') base += 'add9';
    const parens = [];
    if (f === 'b5') parens.push('b5');
    if (t) parens.push(t);
    if (parens.length) base += `(${parens.join(',')})`;
    if (slash !== null && slash !== root) {
      const sn = this._spell(slash);
      if (this.options.preferDominantFlat7SlashShorthand &&
          q==='major' && s==='7' && !f && !t && (slash-root+12)%12===10)
        return `${rn}/${sn}`;
      return `${base}/${sn}`;
    }
    return base;
  }

  _spell(pc) {
    const m = this.options.spellingMode;
    if (m === 'sharp') return GuitarChordSuggester.NAMES_SHARP[pc];
    if (m === 'flat')  return GuitarChordSuggester.NAMES_FLAT[pc];
    return GuitarChordSuggester.NAMES_AUTO[pc];
  }
}

const chordSuggester = new GuitarChordSuggester({ searchThreshold: 38 });

// 보이싱 라이브러리는 voicing-library.js 에서 관리

// 현재 편집 상태 → 새 클래스 입력 형식 변환
// 새 클래스: index 0 = 6번줄(저음 E, s=5), index 5 = 1번줄(고음 e, s=0)
function getChordFretArray() {
  const barreMap = buildBarreMap(dots, barreActive);
  const arr = [];
  for (let s = 5; s >= 0; s--) {
    if (openMute[s] === 'mute') { arr.push(null); continue; }
    const sd = dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const bf  = barreMap[s];
    if (dot !== undefined && bf !== undefined) arr.push(calcActualFret(Math.max(dot.f, bf)));
    else if (dot !== undefined)  arr.push(calcActualFret(dot.f));
    else if (bf  !== undefined)  arr.push(calcActualFret(bf));
    else arr.push(0);
  }
  return arr;
}

function suggestChordNames() {
  chordSuggester.options.spellingMode = accidental;
  return chordSuggester.suggest(getChordFretArray());
}

let accidental      = 'sharp';
let selectedRoot    = 'A';
let selectedTriad   = '';
let selectedSeventh = '';
let selectedFunc    = '';
let selectedTensions = [];
let selectedBass    = '';

// 네비게이션 전역 상태 (초기화 코드보다 먼저 선언 필요)
let contextProjectId = null;
let currentProjectId = null;
let isEditMode = true;

// user_project 페이지에서 에디터로 진입 시 복귀 정보
let _editorReturnProjectId = null;  // 복귀할 프로젝트 ID
let _editorEditingChordId  = null;  // 편집 중인 기존 코드 ID (null이면 신규 추가)
let _isFromProject         = false; // user_project → 에디터 진입 모드 여부
let _fromLibraryToEditor   = false; // 코드사전 '에디터로' → 에디터 진입 시 true. 에디터 뒤로가기를 사전으로 복귀시킴



// ── Wheel Picker ─────────────────────────────────────────────
// CSS --picker-item-h를 실시간으로 읽어옴 — 하드코딩 상수로 이중 관리하면
// 태블릿 등 스코프별로 CSS만 바뀌고 JS는 그대로라 스크롤 스냅이 어긋나는 문제가 있었음.
// 단일 소스(CSS 변수)로 통일, resize 시 재계산.
let PICKER_ITEM_H = 30;
function _syncPickerItemH() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--picker-item-h'));
  if (!isNaN(v) && v > 0) PICKER_ITEM_H = v;
}
_syncPickerItemH();
// 값이 바뀌는 순간(브레이크포인트를 넘나드는 실제 리사이즈) 이미 열려있는 휠들의 scrollTop이
// 옛 pitch 기준으로 남아있으면 스냅이 어긋난다 — idx는 유지한 채 새 pitch로 재정렬한다.
window.addEventListener('resize', () => {
  const oldH = PICKER_ITEM_H;
  const idxByEl = new Map();
  document.querySelectorAll('.col-scroll').forEach(el => {
    idxByEl.set(el, Math.round(el.scrollTop / oldH));
  });
  _syncPickerItemH();
  if (PICKER_ITEM_H !== oldH) {
    idxByEl.forEach((idx, el) => { el.scrollTop = idx * PICKER_ITEM_H; });
  }
});

function initWheelPicker(scrollEl, getIdx, onPick) {
  if (!scrollEl) return;

  // 이전 인스턴스의 scroll listener + init RAF 제거 (누적 방지)
  if (scrollEl._pickerAbort) { scrollEl._pickerAbort.abort(); }
  if (scrollEl._pickerInitRaf) { cancelAnimationFrame(scrollEl._pickerInitRaf); scrollEl._pickerInitRaf = null; }
  // generation 증가: 이전 인스턴스의 잔여 150ms 타이머가 onPick을 호출하지 못하도록 무력화
  const _gen = (scrollEl._pickerGen = ((scrollEl._pickerGen ?? 0) + 1));
  const _abort = new AbortController();
  scrollEl._pickerAbort = _abort;

  enableMouseDragScroll(scrollEl); // 웹 브라우저 마우스 드래그 지원 (내부 중복 방지)

  let timer, programmatic = false, _rafId = null;

  // ── 정지 판정 ─────────────────────────────────────────────
  // 예전엔 "마지막 scroll 이벤트 + 150ms"만으로 onPick을 불렀다. 빠르게 튕기면 그 시점에
  // 관성·scroll-snap이 아직 끝나지 않아 scrollTop이 칸 경계에 걸쳐 있었고, 반올림한 idx로
  // onPick → 목록 재생성(renderRootBtns)이 일어나면서 스크롤이 중간에 멎어 버렸다.
  // 이제는 (1) 위치가 더 안 움직이고 (2) 칸 격자에 정확히 붙었을 때만 onPick을 부른다.
  const SETTLE_MS  = 120;  // 정지 여부를 다시 확인하는 간격
  const SETTLE_TOL = 0.5;  // 격자에 붙었다고 볼 오차(px)
  const SETTLE_MAX = 12;   // 최대 관찰 횟수 — 스냅이 끝내 안 끝나도 약 1.4초 뒤엔 확정
  let _settleTop = null, _settleTries = 0;

  function _cancelSettle() { clearTimeout(timer); _settleTop = null; _settleTries = 0; }

  function _checkSettled() {
    if (scrollEl._pickerGen !== _gen) return; // 낡은 타이머: 무시
    const total = scrollEl.children.length;
    if (!total) return;

    const top     = scrollEl.scrollTop;
    const idx     = Math.max(0, Math.min(Math.round(top / PICKER_ITEM_H), total - 1));
    const snapped = Math.abs(top - idx * PICKER_ITEM_H) <= SETTLE_TOL;
    const moved   = _settleTop === null || Math.abs(top - _settleTop) > SETTLE_TOL;
    _settleTop = top;

    // 아직 움직이는 중이거나 격자에서 벗어나 있으면 확정하지 않고 더 기다린다
    if ((moved || !snapped) && ++_settleTries < SETTLE_MAX) {
      timer = setTimeout(_checkSettled, SETTLE_MS);
      return;
    }
    // 한계까지 기다렸는데도 격자에 안 붙었으면(스냅 실패) 직접 맞춰서 화면과 값을 일치시킨다
    if (!snapped) {
      programmatic = true;
      scrollEl.scrollTop = idx * PICKER_ITEM_H;
      setTimeout(() => { programmatic = false; }, 30);
    }
    _settleTop = null; _settleTries = 0;
    onPick(idx);
    // 유저가 직접 돌린 경우만 도달(programmatic은 scroll 핸들러에서 반환) — 튜토리얼 휠 구간 판정용
    window.Tutorial?.notify('wheel');
  }

  function updateItemStyles() {
    const btns = Array.from(scrollEl.children);
    if (!btns.length) return;
    const centerIdx = scrollEl.scrollTop / PICKER_ITEM_H;
    btns.forEach((btn, i) => {
      const dist = Math.abs(i - centerIdx);
      const scale = Math.max(0.60, 1 - dist * 0.22);
      btn.style.transform = `scale(${scale.toFixed(3)})`;
    });
  }

  scrollEl.addEventListener('scroll', () => {
    updateItemStyles();
    if (programmatic) return;
    // 스크롤이 이어지는 동안엔 판정을 계속 미룬다
    _cancelSettle();
    timer = setTimeout(_checkSettled, SETTLE_MS);
  }, { signal: _abort.signal });

  scrollEl._scrollToIdx = (idx, smooth = false) => {
    // 유저 스크롤에서 걸어둔 정지 판정이 남아 있으면 프로그램 이동 뒤에 엉뚱한 onPick이 터진다
    _cancelSettle();
    // 진행 중인 애니메이션 즉시 중단 + snap 복원
    if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; scrollEl.style.scrollSnapType = ''; }
    programmatic = true;
    const targetTop = Math.max(0, idx) * PICKER_ITEM_H;
    if (!smooth) {
      scrollEl.scrollTop = targetTop;
      _rafId = requestAnimationFrame(() => { updateItemStyles(); _rafId = null; });
      setTimeout(() => { programmatic = false; }, 30);
      return;
    }
    // easeOutExpo: 빠르게 출발 후 부드럽게 감속 — 휠 피커에 적합
    const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const startTop = scrollEl.scrollTop; // 현재 위치에서 시작 (중단된 위치 포함)
    const diff = targetTop - startTop;
    // 이동 거리에 비례한 duration: 짧은 거리는 빠르게, 긴 거리는 1500ms 상한
    const maxDist = (scrollEl.children.length - 1) * PICKER_ITEM_H;
    const duration = maxDist > 0 ? Math.max(400, 2200 * (Math.abs(diff) / maxDist)) : 2200;
    const startTime = performance.now();
    // scroll-snap이 scrollTop 조작을 즉시 스냅시키므로 애니메이션 중 비활성화
    scrollEl.style.scrollSnapType = 'none';
    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      scrollEl.scrollTop = startTop + diff * easeOutExpo(t);
      updateItemStyles();
      if (t < 1) {
        _rafId = requestAnimationFrame(frame);
      } else {
        scrollEl.scrollTop = targetTop;
        updateItemStyles();
        scrollEl.style.scrollSnapType = ''; // snap 복원
        programmatic = false;
        _rafId = null;
      }
    }
    _rafId = requestAnimationFrame(frame);
  };

  scrollEl._pickerInitRaf = requestAnimationFrame(() => {
    scrollEl._pickerInitRaf = null;
    if (_rafId === null) scrollEl._scrollToIdx(Math.max(0, getIdx())); // 진행 중인 애니메이션 있으면 스냅 생략
    updateItemStyles();
  });
}

function initStaticWheelPickers() {
  const TRIAD_VALS   = ['', 'm', 'aug', 'dim'];
  const SEVENTH_VALS = ['', 'M7', '7', '6'];
  const FUNC_VALS    = ['', 'sus2', 'sus4', 'add9', 'b5'];
  const TENSION_VALS = ['', 'b9', '9', '#9', '11', '#11', 'b13', '13'];

  initWheelPicker(
    document.getElementById('triad-group'),
    () => Math.max(0, TRIAD_VALS.indexOf(selectedTriad)),
    (i) => selectTriad(TRIAD_VALS[i])
  );
  initWheelPicker(
    document.getElementById('seventh-group'),
    () => Math.max(0, SEVENTH_VALS.indexOf(selectedSeventh)),
    (i) => selectSeventh(SEVENTH_VALS[i])
  );
  initWheelPicker(
    document.getElementById('func-group'),
    () => Math.max(0, FUNC_VALS.indexOf(selectedFunc)),
    (i) => selectFunc(FUNC_VALS[i])
  );
  initWheelPicker(
    document.getElementById('tension-group'),
    () => Math.max(0, TENSION_VALS.indexOf(selectedTensions[0] ?? '')),
    (i) => selectTension(TENSION_VALS[i])
  );
}

function renderBtnGroup(groupId, items, getCurrent, onSelect, noneLabel) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.innerHTML = '';
  if (noneLabel !== undefined) {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (getCurrent() === '' ? ' active' : '');
    btn.textContent = noneLabel;
    btn.onclick = () => { onSelect(''); updateChordDisplay(); };
    group.appendChild(btn);
  }
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (item === getCurrent() ? ' active' : '');
    btn.textContent = item;
    btn.onclick = () => { onSelect(item); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

function renderRootBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  if (!roots.includes(selectedRoot)) selectedRoot = roots[0];

  const group = document.getElementById('root-group');
  if (!group) return;
  group.innerHTML = '';
  roots.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === selectedRoot ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => {
      selectedRoot = r;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      updateChordDisplay();
    };
    group.appendChild(btn);
  });

  initWheelPicker(group, () => roots.indexOf(selectedRoot), (i) => {
    selectedRoot = roots[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    updateChordDisplay();
  });
}

function renderBassBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const vals   = ['', ...roots];
  const labels = ['-', ...roots];

  const group = document.getElementById('bass-group');
  if (!group) return;
  group.innerHTML = '';
  vals.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (v === selectedBass ? ' active' : '');
    btn.textContent = labels[i];
    btn.onclick = () => {
      selectedBass = v;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      updateChordDisplay();
    };
    group.appendChild(btn);
  });

  initWheelPicker(group, () => Math.max(0, vals.indexOf(selectedBass)), (i) => {
    selectedBass = vals[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    updateChordDisplay();
  });
}

function toggleAccidental() {
  _playTap();
  const current = document.getElementById('ed-acc-sharp')?.classList.contains('active') ? 'sharp' : 'flat';
  const next = current === 'sharp' ? 'flat' : 'sharp';
  setAccidental(next);
  window.Tutorial?.notify(`acc:${next}`);
}

function setAccidental(mode) {
  // 직접 유저 액션 → 애니메이션 락 즉시 해제
  if (_chordNameLockTimer) { clearTimeout(_chordNameLockTimer); _chordNameLockTimer = null; }
  _chordNameLocked = false;

  // 음높이(인덱스) 유지하며 표기법만 변환
  const oldRoots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const newRoots = mode         === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const rootIdx = oldRoots.indexOf(selectedRoot);
  if (rootIdx !== -1) selectedRoot = newRoots[rootIdx];
  const bassIdx = oldRoots.indexOf(selectedBass);
  if (bassIdx !== -1) selectedBass = newRoots[bassIdx];

  accidental = mode;
  document.getElementById('ed-acc-sharp').classList.toggle('active', mode === 'sharp');
  document.getElementById('ed-acc-flat').classList.toggle('active', mode === 'flat');
  renderRootBtns();
  renderBassBtns();
  updateChordDisplay();
  analytics.track('accidental_switched', { mode });
}

function selectTriad(val) {
  selectedTriad = val;
  document.querySelectorAll('#triad-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? 'M' : val)));
  const el = document.getElementById('triad-group');
  if (el?._scrollToIdx) {
    const idx = ['', 'm', 'aug', 'dim'].indexOf(val);
    if (idx >= 0 && Math.abs(el.scrollTop - idx * PICKER_ITEM_H) > 2) el._scrollToIdx(idx, true);
  }
  updateChordDisplay();
}

function selectSeventh(val) {
  selectedSeventh = val;
  document.querySelectorAll('#seventh-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '-' : val)));
  const el = document.getElementById('seventh-group');
  if (el?._scrollToIdx) {
    const idx = ['', 'M7', '7', '6'].indexOf(val);
    if (idx >= 0 && Math.abs(el.scrollTop - idx * PICKER_ITEM_H) > 2) el._scrollToIdx(idx, true);
  }
  updateChordDisplay();
}

function selectFunc(val) {
  selectedFunc = val;
  document.querySelectorAll('#func-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '-' : val === 'b5' ? '(b5)' : val)));
  const el = document.getElementById('func-group');
  if (el?._scrollToIdx) {
    const idx = ['', 'sus2', 'sus4', 'add9', 'b5'].indexOf(val);
    if (idx >= 0 && Math.abs(el.scrollTop - idx * PICKER_ITEM_H) > 2) el._scrollToIdx(idx, true);
  }
  updateChordDisplay();
}

function selectTension(val) {
  selectedTensions = val ? [val] : [];
  const TENSION_VALS = ['', 'b9', '9', '#9', '11', '#11', 'b13', '13'];
  document.querySelectorAll('#tension-group .sel-btn').forEach((b, i) =>
    b.classList.toggle('active', TENSION_VALS[i] === val));
  const el = document.getElementById('tension-group');
  if (el?._scrollToIdx) {
    const idx = TENSION_VALS.indexOf(val);
    if (idx >= 0 && Math.abs(el.scrollTop - idx * PICKER_ITEM_H) > 2) el._scrollToIdx(idx, true);
  }
  updateChordDisplay();
}
// 레거시 호환
function toggleTension(val) { selectTension(selectedTensions.includes(val) ? '' : val); }

function selectBass(val) {
  selectedBass = val;
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const vals  = ['', ...roots];
  const idx   = Math.max(0, vals.indexOf(val));
  const group = document.getElementById('bass-group');
  if (group) {
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === idx));
    if (group._scrollToIdx && Math.abs(group.scrollTop - idx * PICKER_ITEM_H) > 2)
      group._scrollToIdx(idx, true);
  }
  updateChordDisplay();
}

function buildChordName(data) {
  const root    = data ? data.root    : selectedRoot;
  const triad   = data ? data.triad   : selectedTriad;
  const seventh = data ? data.seventh : selectedSeventh;
  const func    = data ? data.func    : selectedFunc;
  const tensions= data ? data.tensions: selectedTensions;
  const bass    = data ? data.bass    : selectedBass;
  let n = root + triad + seventh + func;
  if (tensions && tensions.length) n += '(' + tensions.join(',') + ')';
  if (bass) n += '/' + bass;
  return n;
}

function buildChordHTML() {
  let n = selectedRoot + selectedTriad + selectedSeventh;
  if (selectedFunc === 'b5') n += '<sup>(b5)</sup>';
  else if (selectedFunc) n += selectedFunc;
  if (selectedTensions.length) n += '<sup>(' + selectedTensions.join(',') + ')</sup>';
  if (selectedBass) n += '/' + selectedBass;
  return n;
}

let _chordBuildTimer = null;
let _editorNameOverride = null; // null=휠피커 상태 렌더, '-'=추천 없음 표시
let _chordNameLocked    = false; // true 동안 chord-display 갱신 차단 (애니메이션 중 재덮어쓰기 방지)
let _chordNameLockTimer = null;

function updateChordDisplay(trackBuild = true) {
  _editorNameOverride = null;
  if (!_chordNameLocked) {
    const el = document.getElementById('chord-display');
    if (el) el.innerHTML = buildChordHTML();
  }
  draw();
  // chord_build 는 유저가 직접 코드를 조작했을 때만 수집.
  // init/reset/프로젝트 코드 적용 등 프로그래밍적 렌더는 trackBuild=false 로 제외.
  if (!trackBuild) return;
  // 500ms 디바운스: 휠피커 연속 조작 후 최종 상태만 수집
  if (_chordBuildTimer) clearTimeout(_chordBuildTimer);
  _chordBuildTimer = setTimeout(() => {
    analytics.track('chord_build', {
      root:    selectedRoot,
      triad:   selectedTriad,
      seventh: selectedSeventh,
      tension: selectedTensions[0] ?? '',
      bass:    selectedBass,
    });
    _chordBuildTimer = null;
  }, 500);
}

function chordNameToHtml(name) {
  return name.replace(/\(([^)]+)\)/g, '<sup>($1)</sup>');
}

function updateChordSuggestions() {
  const el  = document.getElementById('chord-suggestions');
  const bar = document.getElementById('ed-suggest-bar');   // 새 추천 막대(카드)
  if (!el && !bar) return;
  const names = suggestChordNames();
  if (el) {
    el.innerHTML = names.map(n =>
      `<span class="chord-suggest-item" onclick="onSuggestionTapped('${n.replace(/'/g, "\\'")}')">${chordNameToHtml(n)}</span>`
    ).join('');
  }
  if (bar) {
    bar.innerHTML = names.map(n =>
      `<button type="button" class="ed-suggest-item" onclick="onSuggestionTapped('${n.replace(/'/g, "\\'")}')">${chordNameToHtml(n)}</button>`
    ).join('');
  }
}

function onSuggestionTapped(name) {
  analytics.track('chord_suggestion_tapped', { chord_name: name });
  applyChordSuggestion(name);
}

// 코드명 문자열 → 휠피커 컴포넌트 파싱
function parseChordNameToComponents(name) {
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

  // suffix → 컴포넌트 (긴 것 우선)
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

  // 1차: 정확 일치 (m7(b5) 등 포함)
  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension: '', ...comp };
    }
  }

  // 2차: 텐션 부분 (9), (b9), (#11) 등 제거 후 재시도
  let tension = '';
  const tensionMatch = rest.match(/\(([^)]+)\)/);
  if (tensionMatch) {
    tension = tensionMatch[1].split(',')[0].trim(); // 첫 번째 텐션만 적용
    rest = rest.replace(tensionMatch[0], '');
  }

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension, ...comp };
    }
  }

  return { root, bass, tension, triad: '', seventh: '', func: '' };
}

// 추천 코드명 클릭 → 휠피커 적용
function applyChordSuggestion(name) {
  const comp = parseChordNameToComponents(name);
  if (!comp) return;
  selectedRoot = comp.root;
  selectedBass = comp.bass || '';
  renderRootBtns();
  renderBassBtns();
  selectTriad(comp.triad);
  selectSeventh(comp.seventh);
  selectFunc(comp.func);
  selectTension(comp.tension || '');
}

// ═══════════════════════════════════════════════════════════════
// 편집 상태
// ═══════════════════════════════════════════════════════════════
// 손가락 번호 = 점(dot)의 속성 n(0=T, 1~4). 번호가 없는 점은 n이 아예 없다.
// selectedFinger: 지금 "지정"할 값 — null = 없음(번호 없는 점 / 번호 지우기), 0=T, 1~4.
// fingerNumMode: 파생값(번호가 부여된 점이 하나라도 있으면 true). 저장·그리기 쪽이 이 플래그로 번호 표시 여부를 판단한다.
let selectedFinger  = null;
let fingerNumMode   = false;
let dots        = [{s:1,f:2},{s:2,f:2},{s:3,f:2}];
let barreActive = {};
let openMute    = ['open','open','open','open','open','mute'];
let rootMode    = false;
let rootIndex   = -1;

// 튜토리얼 전용 — 구간 진입 시 편집 상태를 지정값으로 강제 세팅
function tutorialSetChord(nextDots, nextBarre, nextOpenMute) {
  dots        = nextDots.map(d => ({ s: d.s, f: d.f }));   // 번호 없이 — 번호는 튜토리얼 단계에서 유저가 지정
  barreActive = { ...nextBarre };
  openMute    = [...nextOpenMute];
  rootMode    = false;
  rootIndex   = -1;
  _syncChordFromCanvas();
}

function calcRootIndex() {
  const dotMaxS  = dots.length ? Math.max(...dots.map(d => d.s)) : -1;
  const openMaxS = openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

// 번호가 부여된 점이 하나라도 있으면 true — 그리기·저장이 이 플래그로 번호 표시 여부를 정한다
function _syncFingerNumMode() {
  fingerNumMode = dots.some(d => d.n !== undefined);
}

// 지정할 손가락 선택 — n: null(없음) | 0(T) | 1~4. 카드에는 아무 변화 없음, 이후 점을 탭할 때 이 값이 부여된다
function selectFinger(n) {
  _playTap();
  selectedFinger = n;
  document.querySelectorAll('.ed-finger-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById(n === null ? 'fn' : 'f' + n)?.classList.add('selected');
}

function resetAll() {
  analytics.track('editor_reset', {});
  dots        = [{s:1,f:2},{s:2,f:2},{s:3,f:2}];
  barreActive = {};
  openMute    = ['open','open','open','open','open','mute'];
  rootMode    = false;
  rootIndex   = -1;
  // 코드명 초기화
  selectedRoot    = 'A';
  selectedTriad   = '';
  selectedSeventh = '';
  selectedFunc    = '';
  selectedTensions = [];
  selectedBass    = '';
  renderRootBtns();
  renderBassBtns();
  selectTriad('');
  selectSeventh('');
  selectFunc('');
  // 프렛 번호 초기화
  currentFretNumber = 2;
  updateChordDisplay(false); // 리셋 = 비유저 렌더, chord_build 제외
  draw();

}

// 캔버스 사이드 버튼 — 바텀바 기능 위임
function resetChord()     { _playTap(); resetAll(); }
function saveChordImage() { openImgSaveModal('editor'); }

function getBarreFrets() {
  const count = {};
  dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[f] >= 2).map(Number);
}

function getDotImgKey(n, isRoot) {
  if (!fingerNumMode) return isRoot ? 'open_root' : 'open';
  return (isRoot ? 'root' : 'common') + (n === 0 ? '_t' : String(n));
}

// ═══════════════════════════════════════════════════════════════
// 렌더링: drawCanvas (data 파라미터 지원)
// ═══════════════════════════════════════════════════════════════
function drawCanvas(c, ratio, data = null, transparent = false) {
  const _root     = data ? data.root     : selectedRoot;
  const _triad    = data ? data.triad    : selectedTriad;
  const _seventh  = data ? data.seventh  : selectedSeventh;
  const _func     = data ? data.func     : selectedFunc;
  const _tensions = data ? data.tensions : selectedTensions;
  const _bass     = data ? data.bass     : selectedBass;
  const _dots     = data ? data.dots     : dots;
  const _barre    = data ? data.barre    : barreActive;
  const _openMute = data ? data.openMute : openMute;
  const _fingerNumMode = data ? data.fingerNumMode : fingerNumMode;
  const _rootMode = data ? false         : rootMode;
  const _rootIndex= data ? -1            : rootIndex;
  const _fretNum  = data
    ? (data.fretNumber >= 2 ? String(data.fretNumber) : '')
    : (currentFretNumber >= 2 ? String(currentFretNumber) : '');
  const _nameOverride = data ? (data.nameOverride ?? null) : _editorNameOverride;

  const w   = Math.round(BASE_W   * ratio);
  const ch  = Math.round(BASE_H   * ratio);
  const tl  = Math.round((BASE_PAD_L + BASE_OPEN_W) * ratio);             // nut x
  const tr  = Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * ratio); // 프렛보드 우측
  const tt  = Math.round(BASE_PAD_T  * ratio);                   // 프렛보드 상단
  const tb  = Math.round((BASE_PAD_T + BASE_FBH) * ratio);       // 프렛보드 하단
  const fw  = (tr - tl) / FRETS;
  const sh  = (tb - tt) / (STRINGS - 1);
  const ds  = Math.round(sh * 0.95);
  const sc  = w / BASE_W;

  c.clearRect(0, 0, w, ch);
  if (!transparent) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, ch);
  }

  // 너트 (우측 끝이 tl에 정렬, 줄선 stroke 블리드에 맞춰 상/하 높이 정렬)
  // r(프렛번호)>=3이면 다이어그램 시작이 0프렛이 아니므로 두꺼운 선 생략 (r=2까지는 너트 표시)
  const nutW  = Math.max(1, Math.round(9 * sc));
  const lineW = Math.max(1, 3 * sc);   // 줄선과 동일한 두께
  if (!_fretNum || _fretNum === '2') {
    const nx = tl - nutW, ny = tt - lineW / 2, nw = nutW, nh = (tb - tt) + lineW;
    c.fillStyle = '#242729';
    c.fillRect(nx, ny, nw, nh);
  }

  // 프렛선
  c.strokeStyle = '#242729';
  c.lineWidth = Math.max(1, 3 * sc);
  c.lineCap = 'butt';
  for (let f = 0; f <= FRETS; f++) {
    const x = tl + f * fw;
    c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
  }

  // 줄선
  for (let s = 0; s < STRINGS; s++) {
    const y = tt + s * sh;
    c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
  }

  // 바레 커버 범위 미리 계산
  const _barreCount = {};
  _dots.forEach(d => { _barreCount[d.f] = (_barreCount[d.f] || 0) + 1; });
  const coveredByBarre = new Set();
  Object.keys(_barreCount).filter(f => _barreCount[Number(f)] >= 2 && _barre[Number(f)]).forEach(f => {
    const same = _dots.filter(d => d.f === Number(f));
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
  });

  // 오픈/뮤트
  _openMute.forEach((v, s) => {
    if (_dots.some(d => d.s === s)) return;
    if (v !== 'mute' && coveredByBarre.has(s)) return;
    const y   = tt + s * sh;
    const x   = tl - Math.round(BASE_OPEN_W / 2 * sc);  // 개방현: nut 좌측 중앙
    if (v === 'mute') {
      // X: 둥근 끝 + 두께감
      const half = ds * 0.38;
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth = Math.round(ds * 0.18);
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - half, y - half); c.lineTo(x + half, y + half); c.stroke();
      c.beginPath(); c.moveTo(x + half, y - half); c.lineTo(x - half, y + half); c.stroke();
      c.restore();
    } else {
      // 개방현: 빈 원
      const r  = ds * 0.45;
      const lw = Math.max(1, ds * 0.15);
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth = lw;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  });

  // barre
  const barreFrets = [];
  Object.keys(_barreCount).filter(f => _barreCount[f] >= 2).map(Number).forEach(f => {
    if (!_barre[f]) return;
    let minS, maxS;
    if (data && data.barreRange) {
      minS = data.barreRange.min;
      maxS = data.barreRange.max;
    } else {
      const same = _dots.filter(d => d.f === f);
      minS = Math.min(...same.map(d => d.s));
      maxS = Math.max(...same.map(d => d.s));
    }
    if (maxS <= minS) return;
    barreFrets.push(f);
    // 바레: 캡슐(pill) 형태로 직접 드로잉
    const cx   = tl + (f - 0.5) * fw;
    const topY = tt + minS * sh;
    const botY = tt + maxS * sh;
    const r    = ds / 2;
    c.save();
    c.fillStyle = '#242729';
    c.beginPath();
    c.arc(cx, topY, r, Math.PI, 0);  // 상단 반원
    c.lineTo(cx + r, botY);           // 우측
    c.arc(cx, botY, r, 0, Math.PI);  // 하단 반원
    c.lineTo(cx - r, topY);           // 좌측
    c.closePath();
    c.fill();
    c.restore();
  });

  // dot
  _dots.forEach(d => {
    if (_barre[d.f] && barreFrets.includes(d.f)) return;
    const cx = tl + (d.f - 0.5) * fw;
    const cy = tt + d.s * sh;
    const r  = ds / 2;
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = '#242729';
    c.fill();
    if (_fingerNumMode && d.n !== undefined) {
      const numStr = d.n === 0 ? 'T' : String(d.n);
      const fontSize = Math.round(r * 1.35);
      c.fillStyle = '#ffffff';
      c.font = `400 ${fontSize}px "Pretendard", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(numStr, cx, cy + fontSize * 0.05);
    }
    c.restore();
  });

  // 코드명
  c.save();
  if (!transparent) {
    c.fillStyle = '#ffffff';
    c.fillRect(tl, 0, w - tl, tt - ds/2);  // nut 좌측 개방현 영역은 제외
  }
  c.fillStyle = '#242729';
  c.textBaseline = 'alphabetic';

  const bSize = Math.round(48 * sc);
  const sSize = Math.round(30 * sc);
  const bY    = tt - Math.round(30 * sc);   // 코드명: nut 바로 위
  const sY    = bY - Math.round(14 * sc);

  let cx = tl;
  if (_nameOverride !== null) {
    // 라이브러리 뷰어: () 텐션 부분을 위첨자로 분리 렌더링
    if (_nameOverride) {
      let _nBase = _nameOverride;
      let _nTension = '';
      let _nBass = '';
      // 베이스음 분리 (마지막 '/')
      const _slashIdx = _nBase.lastIndexOf('/');
      if (_slashIdx !== -1) { _nBass = _nBase.slice(_slashIdx); _nBase = _nBase.slice(0, _slashIdx); }
      // 텐션 분리 ('(' 이후)
      const _parenIdx = _nBase.indexOf('(');
      if (_parenIdx !== -1) { _nTension = _nBase.slice(_parenIdx); _nBase = _nBase.slice(0, _parenIdx); }

      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText(_nBase, cx, bY);
      cx += c.measureText(_nBase).width;
      if (_nTension) {
        c.font = `500 ${sSize}px "Pretendard", sans-serif`;
        c.fillText(_nTension, cx, sY);
        cx += c.measureText(_nTension).width;
      }
      if (_nBass) {
        c.font = `500 ${bSize}px "Pretendard", sans-serif`;
        c.fillText(_nBass, cx, bY);
      }
    }
  } else {
    const base = _root + _triad + _seventh + (_func === 'b5' ? '' : _func);
    c.font = `500 ${bSize}px "Pretendard", sans-serif`;
    c.fillText(base, cx, bY);
    cx += c.measureText(base).width;

    if (_func === 'b5') {
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText('(b5)', cx, sY);
      cx += c.measureText('(b5)').width;
    }

    if (_tensions && _tensions.length) {
      const ts = '(' + _tensions.join(',') + ')';
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText(ts, cx, sY);
      cx += c.measureText(ts).width;
    }

    if (_bass) {
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText('/' + _bass, cx, bY);
    }
  }

  // 프렛 번호
  if (_fretNum) {
    c.font = `500 ${Math.round(28 * sc)}px "Pretendard", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(_fretNum, tl + 1.5 * fw, tb + Math.round(28 * sc));
  }

  c.restore();
}

let _chordDirty = false;

function draw() {
  _syncFingerNumMode();
  drawCanvas(ctx, RATIO, null, true);   // 투명 배경 — 카드의 흰 배경이 그대로 보이게(흰 사각형을 칠하지 않는다)
  updateBarreBtns();
  updateBarreBtns();
  updateChordSuggestions();
  _chordDirty = true;
}

function applyFirstSuggestion() {
  const names = suggestChordNames();
  if (!names.length) return;
  applyChordSuggestion(names[0]);
  _chordDirty = false;
  analytics.track('chord_applied', { chord_name: names[0] });
}

// 캔버스 클릭 후 즉시 첫 번째 추천 코드명 적용
function _syncChordFromCanvas() {
  // 이전 락 즉시 해제 (새 입력이 들어온 경우 항상 재감지)
  if (_chordNameLockTimer) { clearTimeout(_chordNameLockTimer); _chordNameLockTimer = null; }
  _chordNameLocked = false;

  // '검색 안됨' 등 파싱 불가 항목 제거
  const names = suggestChordNames().filter(n => parseChordNameToComponents(n) !== null);
  if (names.length) {
    _editorNameOverride = null;
    // ① 락 해제 상태에서 코드명 1회 확정 적용 (updateChordDisplay가 정상 실행됨)
    applyChordSuggestion(names[0]);

    // ② 확정된 코드명을 고정 — 이후 애니메이션 중 잔여 타이머·onPick이 덮어쓰기 못하도록
    _chordNameLocked = true;
    _chordNameLockTimer = setTimeout(() => {
      _chordNameLocked = false;
      _chordNameLockTimer = null;
    }, 2500); // 최대 애니메이션 2200ms + 여유 300ms

    // ③ root·bass 휠피커 smooth 이동 (락 중이므로 scroll→onPick→updateChordDisplay 차단됨)
    const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
    const rootGroup = document.getElementById('root-group');
    if (rootGroup?._scrollToIdx) rootGroup._scrollToIdx(roots.indexOf(selectedRoot), true);
    const bassVals = ['', ...roots];
    const bassGroup = document.getElementById('bass-group');
    if (bassGroup?._scrollToIdx) bassGroup._scrollToIdx(Math.max(0, bassVals.indexOf(selectedBass)), true);

    analytics.track('chord_applied', { chord_name: names[0] });
  } else {
    _editorNameOverride = '-';
    const el = document.getElementById('chord-display');
    if (el) el.textContent = '-';
    draw(); // dot 상태 그대로 렌더링
  }
}

// ═══════════════════════════════════════════════════════════════
// 바레 버튼
// ═══════════════════════════════════════════════════════════════
// 바레 on/off 본체
function toggleBarreAt(f) {
  _playTap();
  if (!barreActive[f]) {
    // 활성화 시도: 최대 2개 제한 확인
    const activeCount = Object.values(barreActive).filter(Boolean).length;
    if (activeCount >= 2) return;
    barreActive[f] = true;
    removeDotsUnderBarre(f);
  } else {
    barreActive[f] = false;
  }
  draw();
  window.Tutorial?.notify(`barre:${f}:${barreActive[f] ? 'on' : 'off'}`);
}

// 바레 막대(#barre-btns, .ed-barre-bar) — 점이 2개 이상인 프렛마다 B 버튼(getBarreFrets).
// 막대는 프렛보드 폭이라 버튼의 가로 위치는 막대 안에서 프렛 칸 중심의 비율(%) — 캔버스 폭이 바뀌어도 맞는다.
function updateBarreBtns() {
  const bar = document.getElementById('barre-btns');
  if (!bar) return;
  bar.innerHTML = '';
  getBarreFrets().forEach(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ed-barre-btn' + (barreActive[f] ? ' active' : '');
    btn.textContent = 'B';
    btn.dataset.fret = String(f);
    btn.style.left = ((f - 0.5) / FRETS * 100) + '%';
    btn.onclick = () => toggleBarreAt(f);
    bar.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════════════════
// 클릭 처리
// ═══════════════════════════════════════════════════════════════
// 캔버스 탭 처리 — 캔버스·배율·개방현 영역 폭을 받아 좌표를 계산한다.
function _canvasTap(e, cv, ratio, openW) {
  const rect = cv.getBoundingClientRect();
  const tl = Math.round((BASE_PAD_L + BASE_OPEN_W) * ratio);             // nut x
  const tr = Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * ratio); // 프렛보드 우측
  const tt = Math.round(BASE_PAD_T * ratio);                              // 프렛보드 상단
  const tb = Math.round((BASE_PAD_T + BASE_FBH) * ratio);                 // 프렛보드 하단
  const fw = (tr - tl) / FRETS;                                           // 프렛 간격
  const sh = (tb - tt) / (STRINGS - 1);                                   // 현 간격
  const mx = (e.clientX - rect.left) * (cv.width  / rect.width);
  const my = (e.clientY - rect.top)  * (cv.height / rect.height);
  const si = Math.round((my - tt) / sh);
  if (si < 0 || si > STRINGS - 1) return;

  // 튜토리얼 진행 중이면 지정된 칸 외 입력은 무시
  const tutCell = window.Tutorial?.canvasCell();

  if (mx >= tl - openW && mx < tl) {
    if (tutCell) return; // 개방현/뮤트 영역은 허용 대상 아님
    if (selectedFinger !== null) return; // 번호 도구는 번호 부여 전용 — 개방현/뮤트·점 삭제는 "없음"에서만
    const hasDot = dots.some(d => d.s === si);
    if (hasDot) {
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
    } else {
      openMute[si] = openMute[si] === 'mute' ? 'open' : 'mute';
    }
    if (rootMode) rootIndex = calcRootIndex();
    _syncChordFromCanvas(); return;
  }

  if (mx < tl || mx > tr + 5) return;

  const fi = Math.floor((mx - tl) / fw) + 1;
  if (fi < 1 || fi > FRETS) return;
  if (tutCell && (si !== tutCell.s || fi !== tutCell.f)) return;

  if (!_placeDot(si, fi)) return;
  if (selectedFinger !== null) {
    // 번호를 지정하는 중에는 "몇 번이 됐는가"까지 알려야 튜토리얼이 정확히 판정할 수 있다
    const d = dots.find(x => x.s === si && x.f === fi);
    window.Tutorial?.notify(`finger:${si}:${fi}:${d && d.n !== undefined ? d.n : 'x'}`);
  } else {
    window.Tutorial?.notify(`dot:${si}:${fi}`);
  }
}
// 개방현/뮤트 영역 = nut 왼쪽 개방현 영역 전체(BASE_OPEN_W)
canvas.addEventListener('click', e => _canvasTap(e, canvas, RATIO, BASE_OPEN_W * RATIO));

// dot 배치 본체 — 캔버스 클릭과 튜토리얼 시뮬레이션이 같은 규칙을 쓰도록 분리.
// 반환값: 실제로 반영됐으면 true (바레 제약으로 무시된 경우 false)
function _placeDot(si, fi) {
  // 바레로 커버된 줄은 해당 바레 프렛보다 낮은 곳에 dot 불가
  const barreMapCheck = buildBarreMap(dots, barreActive);
  if (barreMapCheck[si] !== undefined && fi < barreMapCheck[si]) return false;

  // 선택된 값을 점의 번호로 — 없음(null)이면 번호 속성 자체를 두지 않는다
  const _newDot = (s, f) => (selectedFinger === null ? { s, f } : { s, f, n: selectedFinger });

  const idx = dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    if (selectedFinger !== null) {
      // 번호 도구 — 점은 절대 지우지 않고 번호만 다룬다:
      //   같은 번호를 다시 누르면 번호만 제거(점은 남음), 다른 번호면 현재 선택된 번호로 변경
      if (dots[idx].n === selectedFinger) delete dots[idx].n;
      else dots[idx].n = selectedFinger;
    } else if (window.Tutorial?.canvasCell()) {
      return false; // 튜토리얼 진행 중 — 지정 칸이 지워져 코드 폼이 깨지는 것 방지
    } else {
      // 없음(점 편집 도구) — 옛 규칙 그대로: 점을 지우고 그 줄은 개방현으로
      dots.splice(idx, 1);
      if (!dots.some(d => d.s === si)) openMute[si] = 'open';
    }
  } else {
    // 바레가 이 줄을 커버하고 있고 클릭 프렛이 바레 우측이면 → 바레 dot 유지, 우측 dot만 교체
    const barreF = barreMapCheck[si];
    if (barreF !== undefined && fi > barreF) {
      dots = dots.filter(d => d.s !== si || d.f === barreF);
      dots.push(_newDot(si, fi));
    } else {
      // 바레 없음 또는 바레 프렛 클릭: 한 줄 1개
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
      dots.push(_newDot(si, fi));
    }
  }
  if (rootMode) rootIndex = calcRootIndex();
  _syncChordFromCanvas();
  return true;
}

// 튜토리얼 전용 — 유저가 직접 찍은 것과 동일한 경로로 dot 하나를 찍는다.
function tutorialTapDot(si, fi) { return _placeDot(si, fi); }

// ═══════════════════════════════════════════════════════════════
// PNG 저장
// ═══════════════════════════════════════════════════════════════

// ── 이미지 저장 모달 ──────────────────
// 상단 미리보기 / 중앙 배율 슬라이더 / 하단 투명옵션·저장버튼
let _imgMode        = 'editor';
let _imgScale       = 1;
let _imgTransparent = false;

function openImgSaveModal(mode) {
  _imgMode = mode;
  const modal    = document.getElementById('img-save-modal');
  const backdrop = document.getElementById('img-save-backdrop');
  if (!modal) return;

  const slider = document.getElementById('img-scale-slider');
  const chk    = document.getElementById('img-transparent-chk');
  if (slider) slider.value = _imgScale;
  // 투명배경은 프리미엄 — free는 항상 해제 상태로 시작
  if (getPlan() === 'free') _imgTransparent = false;
  if (chk)    chk.checked  = _imgTransparent;
  _updateImgTransparentUI();

  _updateImgScaleUI();
  _renderImgPreview();

  if (backdrop) backdrop.classList.add('open');
  modal.classList.add('open');
  window.Tutorial?.notify('imgsave:open'); // 시트가 열린 뒤에 알림
}

function closeImgSaveModal() {
  document.getElementById('img-save-modal')?.classList.remove('open');
  document.getElementById('img-save-backdrop')?.classList.remove('open');
}

function onImgScaleInput(v) {
  _imgScale = parseFloat(v) || 1;
  _updateImgScaleUI();
}

function onImgTransparentToggle(checked) {
  // 투명배경 = 프리미엄. free가 체크 시도하면 되돌리고 업그레이드 유도
  if (checked && getPlan() === 'free') {
    const chk = document.getElementById('img-transparent-chk');
    if (chk) chk.checked = false;
    _imgTransparent = false;
    closeImgSaveModal();
    openPlanSheet('image_transparent');
    return;
  }
  _imgTransparent = !!checked;
  _renderImgPreview();
}

// 투명 옵션 라벨 프리미엄 표시 (free일 때 왕관)
function _updateImgTransparentUI() {
  const label = document.getElementById('img-transparent-label');
  if (label) label.classList.toggle('locked', getPlan() === 'free');
}

// 배율 라벨·픽셀크기·잠금상태 갱신
function _updateImgScaleUI() {
  const valEl = document.getElementById('img-scale-val');
  const w = Math.round(EXPORT_BASE_W * _imgScale);
  const h = Math.round(EXPORT_BASE_H * _imgScale);
  const locked = _imgScale > getPlanLimit('maxScale');
  if (valEl) valEl.textContent = `${_imgScale}배 · ${w}×${h} px`;

  const saveBtn = document.getElementById('img-save-btn');
  if (saveBtn) {
    saveBtn.classList.toggle('locked', locked);
    saveBtn.innerHTML = locked
      ? '<i class="ph-fill ph-crown-simple"></i> 업그레이드'
      : '저장';
  }
}

// 미리보기 캔버스 드로잉 (현재 편집/선택 코드 + 투명 반영)
function _renderImgPreview() {
  const cv = document.getElementById('img-preview-canvas');
  if (!cv) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = cv.offsetWidth;
  if (!cssW) { requestAnimationFrame(_renderImgPreview); return; }
  const cssH = Math.round(cssW * BASE_H / BASE_W);
  cv.style.height = cssH + 'px';
  cv.width  = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.classList.toggle('transparent-bg', _imgTransparent);

  const ctx = cv.getContext('2d');
  drawCanvas(ctx, (cssW * dpr) / BASE_W, null, _imgTransparent);
}

async function onImgSave() {
  if (_imgScale > getPlanLimit('maxScale')) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }
  if (_imgTransparent && getPlan() === 'free') { closeImgSaveModal(); openPlanSheet('image_transparent'); return; }
  _playConfirmSfx();
  closeImgSaveModal();
  await _doSavePNG(_imgScale, _imgTransparent);
  window.Tutorial?.notify('imgsave:done');
}

async function _doSavePNG(scale, transparent = false) {
  await refreshPlanFromDB();
  if (!canUseScale(scale)) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }

  const exp = document.createElement('canvas');
  exp.width  = Math.round(EXPORT_BASE_W * scale);
  exp.height = Math.round(EXPORT_BASE_H * scale);
  const ec = exp.getContext('2d');
  const _es = EXPORT_BASE_W / BASE_W * scale;
  ec.scale(_es, _es);
  drawCanvas(ec, 1, null, transparent);

  const base64   = exp.toDataURL('image/png').split(',')[1];
  const fileName = buildChordName() + '_chord.png';

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const n = await saveImagesToDevice([{ base64, fileName: fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') }]);
      if (!n) return;
      showSaveToast();
      incrementStat('images');
      analytics.track('image_saved', { scale, source: 'editor', success: true });
    } catch (e) { console.error('저장 실패:', e); analytics.track('image_saved', { scale, source: 'editor', success: false }); }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    incrementStat('images');
    analytics.track('image_saved', { scale, source: 'editor', success: true });
  }
}

// 드롭다운 진입점 (에디터 저장 버튼 → showScaleDropdown 호출로 대체)
async function savePNG() { /* 직접 호출 시 드롭다운 없이 scale=1 */ await _doSavePNG(1); }

// ═══════════════════════════════════════════════════════════════
// 리사이즈
// ═══════════════════════════════════════════════════════════════
window.addEventListener('resize', resizeCanvas);

// 캔버스 표시폭이 CSS로 바뀌는 경우(미디어쿼리·뷰 전환)는 window resize만으로 못 잡으므로 캔버스 자체를 감시한다.
// (캔버스 비트맵을 바꿔도 CSS 표시폭은 그대로라 순환하지 않는다)
if (window.ResizeObserver) new ResizeObserver(() => resizeCanvas()).observe(canvas);

// ═══════════════════════════════════════════════════════════════
// fret 입력
// ═══════════════════════════════════════════════════════════════
let currentFretNumber = 2;

function adjustFretNumber(delta) {
  _playTap();
  const next = currentFretNumber + delta;
  if (next < 2 || next > 18) return;
  currentFretNumber = next;
  _syncChordFromCanvas();
  // 코드 이름이 다시 계산된 뒤에 알린다 — 튜토리얼이 "몇 프렛이 됐나"로 진행을 판정한다
  window.Tutorial?.notify(`fretnum:${currentFretNumber}`);
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// Audio — GuitarAudio (guitar-audio.js) 사용
// ═══════════════════════════════════════════════════════════════
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2

function playChord(chord) {
  const notes = [];
  const fretBase = chord.fretNumber >= 2 ? chord.fretNumber - 2 : 0;
  const capoOffset = getProject(currentProjectId)?.capo ?? 0;
  const barreMap = buildBarreMap(chord.dots, chord.barre || {});
  for (let s = 0; s < STRINGS; s++) {
    if (chord.openMute[s] === 'mute') continue;
    const sd = chord.dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const barreFret = barreMap[s];
    let fret = 0;
    if (dot !== undefined && barreFret !== undefined) {
      fret = fretBase + Math.max(dot.f, barreFret);
    } else if (dot !== undefined) {
      fret = fretBase + dot.f;
    } else if (barreFret !== undefined) {
      fret = fretBase + barreFret;
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret + capoOffset });
  }
  const sorted = notes.sort((a, b) => b.s - a.s);
  if (!sorted.length) return;
  GuitarAudio.strumNotes(sorted.map(n => n.midi), STRUM_INTERVAL);
}

function calcActualFret(f) {
  return (currentFretNumber - 2) + f;
}

// 바레 활성화 시 커버되는 줄(minS~maxS)에서 해당 프렛보다 낮은 dot만 제거 (전역 dots 대상)
function removeDotsUnderBarre(f) {
  const same = dots.filter(d => d.f === f);
  if (same.length < 2) return;
  const minS = Math.min(...same.map(d => d.s));
  const maxS = Math.max(...same.map(d => d.s));
  dots = dots.filter(d => !(d.f < f && d.s >= minS && d.s <= maxS));
}

// 활성 바레가 커버하는 줄→바레프렛 맵 생성
function buildBarreMap(dotList, barre) {
  const count = {};
  dotList.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  const map = {};
  Object.keys(count).filter(f => count[f] >= 2 && barre[Number(f)]).forEach(f => {
    const fNum = Number(f);
    const same = dotList.filter(d => d.f === fNum);
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) map[s] = fNum;
  });
  return map;
}

function calcStringNotes() {
  const notes = [];
  const barreMap = buildBarreMap(dots, barreActive);
  for (let s = 0; s < STRINGS; s++) {
    if (openMute[s] === 'mute') continue;
    const sd = dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const barreFret = barreMap[s];
    let fret = 0;
    // 가장 우측(높은 프렛) dot만 소리남
    if (dot !== undefined && barreFret !== undefined) {
      fret = calcActualFret(Math.max(dot.f, barreFret));
    } else if (dot !== undefined) {
      fret = calcActualFret(dot.f);
    } else if (barreFret !== undefined) {
      fret = calcActualFret(barreFret);
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret });
  }
  return notes;
}

const STRUM_INTERVAL = 0.055; // 줄 간 간격(초) — 값 높이면 느린 스트럼

function strumChord() {
  const notes = calcStringNotes().sort((a, b) => b.s - a.s);
  if (!notes.length) return;
  analytics.track('chord_played', { chord_name: buildChordName(), source: 'editor' });
  GuitarAudio.strumNotes(notes.map(n => n.midi), STRUM_INTERVAL);
  // 튜토리얼: 자동으로 다음 구간으로 넘기지 않는다. 1초 뒤 '다음' 버튼만 눌러도 되게 풀어주고,
  // 끝까지 듣고 싶으면 유저가 원하는 만큼 기다렸다가 직접 버튼을 누르게 한다.
  setTimeout(() => window.Tutorial?.enableNext?.(), 1000);
}

// 페이지 이탈 시 잔향 하드컷 — 전환 애니메이션 동안 이전 문서가 살아있어
// SUSTAIN(3.5초) 잔향이 다음 페이지까지 넘어가는 문제 방지.
window.addEventListener('pagehide', () => {
  if (typeof Tone !== 'undefined') { try { Tone.getDestination().mute = true; } catch (e) {} }
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
});



// 저장 완료 체크 애니메이션
let _toastTimer = null;
function showSaveToast() {
  const el = document.getElementById('save-toast');
  if (!el) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  // 애니메이션 재시작을 위해 클래스 제거 후 reflow
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
}


function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

// user_project에서 넘어온 코드 데이터를 에디터 상태로 복원
function loadChordStateToEditor(chord) {
  if (!chord) return;
  accidental      = chord.accidental || 'sharp';
  selectedRoot    = chord.root    || 'C';
  selectedBass    = chord.bass    || '';
  selectedTensions = Array.isArray(chord.tensions) ? [...chord.tensions] : [];
  dots            = JSON.parse(JSON.stringify(chord.dots    || []));
  if (!chord.fingerNumMode) dots.forEach(d => { delete d.n; });   // 옛 데이터: 표시 모드가 꺼져 있었으면 번호 미부여
  openMute        = Array.isArray(chord.openMute) ? [...chord.openMute] : new Array(6).fill(0);
  barreActive     = JSON.parse(JSON.stringify(chord.barre   || {}));
  currentFretNumber = chord.fretNumber ?? 1;
  _syncFingerNumMode();

  // 샵/플랫 버튼 UI 동기화
  document.getElementById('ed-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  document.getElementById('ed-acc-flat')?.classList.toggle('active', accidental === 'flat');

  // 휠피커 + 버튼 상태 반영
  renderRootBtns();
  renderBassBtns();
  selectTriad(chord.triad    || '');
  selectSeventh(chord.seventh || '');
  selectFunc(chord.func      || '');
  selectTension((chord.tensions || []).join(','));
  selectBass(chord.bass      || '');

  draw();
  updateChordDisplay(false); // 코드 적용 = 비유저 렌더, chord_build 제외
}

function getCurrentChordState() {
  return {
    id: genId(),
    name: buildChordName(),
    root: selectedRoot,
    triad: selectedTriad,
    seventh: selectedSeventh,
    func: selectedFunc,
    tensions: [...selectedTensions],
    bass: selectedBass,
    dots: JSON.parse(JSON.stringify(dots)),
    openMute: [...openMute],
    barre: JSON.parse(JSON.stringify(barreActive)),
    fretNumber: currentFretNumber,
    fingerNumMode: dots.some(d => d.n !== undefined),   // 번호가 부여된 점이 있으면 true
    accidental: accidental
  };
}

function _relativeTime(ts) {
  if (!ts) return '';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)     return `${sec}초 전`;
  if (sec < 3600)   return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}일 전`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}주 전`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)}달 전`;
  return `${Math.floor(sec / 31536000)}년 전`;
}

// ── 프로젝트 선택 바텀시트 ──────────────────────────────
function openProjectSheet() {
  const overlay = document.getElementById('project-sheet-overlay');
  const list    = document.getElementById('project-sheet-list');
  if (!overlay || !list) return;

  const projects = loadProjects();
  analytics.track('project_sheet_opened', { project_count: projects.length });
  list.innerHTML = '';

  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-sheet-item';
    item.innerHTML =
      `<span class="project-sheet-item-name">${p.name}</span>` +
      `<span class="project-sheet-item-count">${_relativeTime(p.updatedAt || p.createdAt)}</span>`;
    item.addEventListener('click', () => _addChordToProject(p.id));
    list.appendChild(item);
  });

  window.Tutorial?.notify('notesheet:open');

  // 새 프로젝트 만들기 카드 — 항상 최하단
  const card = document.createElement('div');
  card.className = 'project-sheet-new-card';
  card.innerHTML =
    `<i data-lucide="plus-circle" class="project-sheet-new-icon"></i>` +
    `<span class="project-sheet-new-label">새 노트 만들기</span>`;
  card.addEventListener('click', () => {
    closeProjectSheet();
    setTimeout(() => promptCreateProject(), 350);
  });
  list.appendChild(card);
  if (window.lucide) lucide.createIcons({ nodes: [card] });

  overlay.classList.remove('hidden', 'closing');
  // display:none 해제 후 한 프레임 더 대기해야 모바일에서 transition이 정상 동작
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
}

function closeProjectSheet() {
  const overlay = document.getElementById('project-sheet-overlay');
  if (!overlay) return;
  _playTap();
  window.Tutorial?.notify('notesheet:close');
  overlay.classList.remove('open');
  overlay.classList.add('closing');
  overlay.addEventListener('transitionend', () => {
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
  }, { once: true });
}

function onProjectSheetOverlayClick(e) {
  if (e.target === e.currentTarget) closeProjectSheet();
}

// 노트 시트로 보낼 임시 코드(없으면 현재 에디터 상태를 쓴다)
let _pendingChordForSheet = null;

function _addChordToProject(projectId) {
  const projects = loadProjects();
  const project  = projects.find(p => p.id === projectId);
  if (!project) return;

  const chordData = _pendingChordForSheet ?? getCurrentChordState();
  _pendingChordForSheet = null;

  if (_editorEditingChordId) {
    // 기존 코드 편집: id 유지하며 덮어쓰기
    const idx = project.chords.findIndex(c => c.id === _editorEditingChordId);
    if (idx !== -1) {
      chordData.id = _editorEditingChordId;
      project.chords[idx] = chordData;
    } else {
      project.chords.push(chordData);
    }
    analytics.track('chord_applied', { chord_name: chordData.name, project_id: projectId });
  } else {
    project.chords.push(chordData);
    analytics.track('chord_added', { chord_name: chordData.name, project_id: projectId });
  }

  project.updatedAt = Date.now();
  saveProjects(projects);
  closeProjectSheet();

  // user_project 페이지에서 진입한 경우 → 저장 후 복귀
  if (_editorReturnProjectId) {
    _returnToProject(_editorReturnProjectId);
    return;
  }

  showTextToast(`"${project.name}"에 추가됐습니다`);
}

let _textToastTimer = null;
function showTextToast(msg) {
  const el = document.getElementById('text-toast');
  if (!el) return;
  el.textContent = msg;
  if (_textToastTimer) clearTimeout(_textToastTimer);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _textToastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}


// ── 새 노트 만들기 (프로젝트 시트의 "새 노트 만들기" 카드) ──
async function promptCreateProject() {
  await refreshPlanFromDB();
  if (!canCreateProject()) {
    analytics.track('project_limit_hit', {
      current_count: loadProjects().length,
      plan_limit: getPlanLimit('maxProjects'),
    });
    openPlanSheet('note_limit');
    return;
  }
  const input = document.getElementById('create-project-name-input');
  input.value = '';
  document.getElementById('modal-create-project').classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => input.focus());
  window.Tutorial?.notify('notecreate:open');
}

function confirmCreateProject() {
  const input = document.getElementById('create-project-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (!canCreateProject()) {
    closeModal('modal-create-project');
    openPlanSheet('note_limit');
    return;
  }

  closeModal('modal-create-project');

  const projects = loadProjects();
  const newProject = {
    id: genId(),
    name,
    pinned: false,
    pinnedOrder: 0,
    important: false,
    importantOrder: 0,
    capo: 0,
    bpm: 120,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: [],
    arrangement: []
  };
  projects.push(newProject);
  saveProjects(projects);
  analytics.track('project_created', { total_count: projects.length });
  incrementStat('notes'); // 노트 생성 퀘스트 누적 카운터
  window.Tutorial?.notify('notecreate:done');
  _leaveEditor('user_project.html?id=' + newProject.id);
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ═════════════════════════════════════════════════
// 사전 → 에디터 인계 수신 · 노트로 복귀 · 페이지 이탈
// ═════════════════════════════════════════════════
const LIB_HANDOFF_KEY = 'chorditor_lib_handoff';
let _libEntry        = null;
let _libFingeringIdx = 0;
let _libFingerMode   = true;

// 사전(library.html)에서 넘어온 코드를 에디터 상태로 로드 — home.js importLibChordToProject와 같은 로직(수정 금지 규칙: 변환식 그대로)
function importLibChordToEditor() {
  if (!_libEntry) return;
  const entry    = _libEntry;
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? entry.flatName : entry.name;

  // 에디터는 "슬롯2 = fretNumber" 모델 → fretOffset = currentFretNumber - 2
  //  pattern: 라벨 r+1 → offset r-1 / static: 라벨 r → offset r-2 / 라벨 최소 2
  const _r         = entry.fretNumber ?? 0;
  const _isPat     = entry.source === 'pattern';
  currentFretNumber = Math.max(2, _isPat ? _r + 1 : _r);
  const fretOffset = currentFretNumber - 2;

  const activeFingering = (entry.fingerings?.[_libFingeringIdx]) ?? entry.fingerings?.[0] ?? entry.fingering;

  dots = entry.frets
    .map((f, s) => (f !== null && f > 0)
      ? (_libFingerMode
          ? { s, f: f - fretOffset, n: (typeof activeFingering?.[s] === 'number' ? activeFingering[s] : 0) }
          : { s, f: f - fretOffset })
      : null)
    .filter(Boolean);

  openMute = entry.frets.map((f, s) => {
    if (f === null || entry.openMute[s] === 'mute') return 'mute';
    return 'open';
  });

  barreActive = {};
  const importBarre = entry.barres?.[_libFingeringIdx] ?? entry.barres?.[0] ?? entry.barre ?? {};
  Object.entries(importBarre).forEach(([f, v]) => {
    barreActive[parseInt(f) - fretOffset] = v;
  });

  _syncFingerNumMode();

  // 코드명 전체 파싱: 근음 → 3화음 → 7음 → 기능 → 텐션 → 분수
  const comp = parseChordNameToComponents(dispName)
    || { root: 'C', bass: '', triad: '', seventh: '', func: '', tension: '' };
  selectedRoot = comp.root;
  selectedBass = comp.bass || '';

  analytics.track('lib_chord_imported', { chord_name: dispName });
  _fromLibraryToEditor = true; // 에디터 뒤로가기 → 홈 아닌 코드사전으로 복귀
  renderRootBtns();
  renderBassBtns();

  // 휠피커 UI + 상태 동시 반영 (순서: 근음 → 3화음 → 7음 → 기능 → 텐션 → 분수)
  selectTriad(comp.triad);
  selectSeventh(comp.seventh);
  selectFunc(comp.func);
  selectTension(comp.tension || '');
  selectBass(comp.bass || '');
}

// 이탈 정리 함수 — 모든 출구(뒤로가기 버튼·하드웨어 뒤로가기·노트 저장 후 복귀·새 노트·pagehide·앱 전환)가 같이 쓴다.
// 멱등. 소리는 하드컷(panic) — 페이드(stop)는 이탈 처리로 쓰지 않는다.
function _editorCleanup() {
  try { if (typeof GuitarAudio !== 'undefined') GuitarAudio.panic?.(); } catch (_) {}
}

let _editorLeaving = false;
function _leaveEditor(url) {
  if (_editorLeaving) return;
  _editorLeaving = true;
  _editorCleanup();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = url; }, 260);
  } else {
    location.href = url;
  }
}

// from_project 모드에서 user_project로 복귀(저장 후·돌아가기)
function _returnToProject(returnId) {
  _editorReturnProjectId = null;
  _editorEditingChordId  = null;
  _isFromProject         = false;
  _leaveEditor('user_project.html?id=' + returnId);
}

// 탑바 뒤로가기 — 진입 경로에 따라 복귀 지점이 다르다
function closeEditorPage() {
  _playTap();
  if (_isFromProject && _editorReturnProjectId) { _returnToProject(_editorReturnProjectId); return; }
  _leaveEditor(_fromLibraryToEditor ? 'library.html' : 'home.html');
}

// ═════════════════════════════════════════════════
// 초기화
// ═════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // 페이지 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  // 페이지 커버
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.setScreen('editor');
  analytics.track('screen_view', { view: 'editor', project_id: null });

  // ── 진입 경로 판별 ──────────────────────────────
  const _urlParams   = new URLSearchParams(location.search);
  const _fromProject = _urlParams.get('from_project');
  const _fromChordId = _urlParams.get('chord_id');

  // library.html "에디터로" 인계 — sessionStorage에 남긴 선택 코드를 받는다.
  // 새로고침·직접 진입 등으로 인계 데이터가 없으면 아무것도 안 하고 빈 에디터로 연다.
  let _libHandoff = null;
  if (_urlParams.get('from_lib') === '1') {
    try {
      _libHandoff = JSON.parse(sessionStorage.getItem(LIB_HANDOFF_KEY) || 'null');
      sessionStorage.removeItem(LIB_HANDOFF_KEY);
    } catch (_) { _libHandoff = null; }
    if (!(_libHandoff && _libHandoff.entry && Date.now() - (_libHandoff.ts || 0) < 60000)) _libHandoff = null;
  }

  renderRootBtns();
  renderBassBtns();
  initStaticWheelPickers();

  if (_libHandoff) {
    _libEntry        = _libHandoff.entry;
    _libFingeringIdx = _libHandoff.fingeringIdx || 0;
    _libFingerMode   = _libHandoff.fingerMode !== false;
    const _accMode   = _libHandoff.accidental === 'flat' ? 'flat' : 'sharp';
    if (_accMode !== accidental) setAccidental(_accMode);
    importLibChordToEditor();
  } else if (_fromProject) {
    // user_project → 에디터 진입
    _editorReturnProjectId = _fromProject;
    _editorEditingChordId  = _fromChordId || null;
    _isFromProject         = true;

    // 기존 코드 편집이면 state 복원
    if (_fromChordId) {
      const _proj  = loadProjects().find(p => p.id === _fromProject);
      const _chord = _proj?.chords?.find(c => c.id === _fromChordId);
      if (_chord) loadChordStateToEditor(_chord);
    }

    // 탑바 뒤로가기는 숨김(home.js와 동일) — 노트로는 "저장"/"돌아가기" 버튼과 하드웨어 뒤로가기로만 돌아간다
    document.getElementById('back-btn')?.style.setProperty('display', 'none');

    // 액션바의 "노트에 저장" → "저장"(그 노트에 반영) + 바로 앞에 "돌아가기"
    const _edSaveBtn = document.getElementById('btn-add-to-project');
    if (_edSaveBtn) {
      _edSaveBtn.textContent = '저장';
      _edSaveBtn.onclick = () => _addChordToProject(_fromProject);
      const _edBackBtn = document.createElement('button');
      _edBackBtn.type = 'button';
      _edBackBtn.className = 'ed-pill-btn';
      _edBackBtn.textContent = '돌아가기';
      _edBackBtn.onclick = () => _returnToProject(_fromProject);
      _edSaveBtn.parentElement.insertBefore(_edBackBtn, _edSaveBtn);
    }
  }

  updateChordDisplay(false); // 초기 렌더 = 비유저, chord_build 제외

  // 뷰가 방금 그려진 시점에 캔버스를 재면 레이아웃이 아직 안 끝나 작은 값이 잡히므로 rAF를 두 번 겹친다
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
      // 튜토리얼 진행 중이면 이어받기 — 캔버스·휠이 다 그려진 뒤라야 대상 위치가 잡힌다
      if (typeof Tutorial !== 'undefined') Tutorial.resume();
    });
  });

  // ── 이탈 처리 (CLAUDE.md 규칙 0-2): 어떤 경로로 나가든 소리 즉시 중단 ──
  window.addEventListener('pagehide', _editorCleanup);
  document.addEventListener('visibilitychange', () => { if (document.hidden) _editorCleanup(); });

  // Android 하드웨어 뒤로가기: 튜토리얼 > 열린 레이어(이미지 저장·노트 시트·새 노트) > 복귀 지점
  const _CapApp = window.Capacitor?.Plugins?.App;
  if (_CapApp) {
    _CapApp.addListener('backButton', () => {
      if (window.Tutorial?.isRunning?.()) { window.Tutorial.confirmSkip(); return; }
      if (document.getElementById('img-save-modal')?.classList.contains('open')) { closeImgSaveModal(); return; }
      const _sheet = document.getElementById('project-sheet-overlay');
      if (_sheet && !_sheet.classList.contains('hidden')) { closeProjectSheet(); return; }
      const _create = document.getElementById('modal-create-project');
      if (_create && !_create.classList.contains('hidden')) { closeModal('modal-create-project'); return; }
      closeEditorPage();
    });
  }
});
