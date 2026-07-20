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
  // ⚠️ style.width를 절대 초기화(='')하지 말 것:
  //   2x 물리픽셀(canvas.width)이 큰 상태에서 style.width='' 하면 브라우저가
  //   물리픽셀을 CSS크기로 적용 → 컨테이너 팽창 → RATIO 양성 피드백 발생
  let displayW = Math.round(BASE_W * MAIN_DISPLAY_SCALE); // fallback

  const unitEl = canvas.closest('.canvas-unit');
  if (unitEl) {
    const unitW  = unitEl.getBoundingClientRect().width;
    // 버튼이 캔버스 위에 오버레이되므로 sideW 차감 없음
    displayW = Math.max(160, Math.floor(unitW));
  }

  canvas.style.width  = displayW + 'px';
  canvas.style.height = 'auto';
  canvas.parentElement.style.width = displayW + 'px'; // canvas-inner 고정
  const fbCssW   = Math.round(BASE_FBW * displayW / BASE_W);  // 프렛보드 CSS 너비
  const fbCssL   = Math.round((BASE_PAD_L + BASE_OPEN_W) * displayW / BASE_W); // nut x CSS
  // fret-ctrl: 레이아웃 완료 후 실제 렌더 크기 기준으로 위치 계산
  const fretCtrlEl = document.getElementById('fret-ctrl');
  if (fretCtrlEl) {
    requestAnimationFrame(() => {
      const rect     = canvas.getBoundingClientRect();
      const cssW     = rect.width;
      const cssH     = rect.height;
      const fret2X   = cssW * (BASE_PAD_L + BASE_OPEN_W + 1.5 * BASE_FBW / FRETS) / BASE_W;
      const fontH    = cssH * 28 / BASE_H;
      const textTopY = cssH * (BASE_PAD_T + BASE_FBH + 28) / BASE_H;
      fretCtrlEl.style.left = Math.round(fret2X) + 'px';
      fretCtrlEl.style.top  = Math.round(textTopY + fontH * 0.35) + 'px';
      fretCtrlEl.style.gap  = Math.round(fontH * 0.6) + 'px';
    });
  }
  const barreWrapEl = document.getElementById('barre-wrap');
  if (barreWrapEl) {
    barreWrapEl.style.width      = fbCssW + 'px';
    barreWrapEl.style.marginLeft = fbCssL + 'px';
  }
  const barreBtnsEl = document.getElementById('barre-btns');
  if (barreBtnsEl) barreBtnsEl.style.width = fbCssW + 'px';

  // 사이드 버튼: 캔버스 크기에 비례한 동적 크기 + 프렛보드 기준 수직 중앙정렬
  const sideBtnsEl = document.getElementById('canvas-side-btns');
  if (sideBtnsEl) {
    const btnSize  = Math.max(26, Math.round(displayW * 0.12));
    const btnGap   = Math.max(8,  Math.round(btnSize * 0.3));
    const iconSize = Math.round(btnSize * 0.44);
    // 버튼 크기 적용 (초기화 포함 전체)
    sideBtnsEl.querySelectorAll('.canvas-side-btn').forEach(btn => {
      btn.style.width  = btnSize + 'px';
      btn.style.height = btnSize + 'px';
      const svg = btn.querySelector('svg');
      if (svg) { svg.style.width = iconSize + 'px'; svg.style.height = iconSize + 'px'; }
    });
    // canvas-side-btns gap 제거 (paddingTop으로 직접 제어)
    sideBtnsEl.style.gap = '0';
    // 우측 오프셋: 캔버스 우측 여백(BASE_PAD_R) 중앙에 버튼 배치
    const rightOffset = Math.max(4, Math.round(BASE_PAD_R * displayW / BASE_W * 0.15));
    sideBtnsEl.style.right = rightOffset + 'px';

    const mainBtnsEl = document.getElementById('canvas-main-btns');
    if (mainBtnsEl) {
      mainBtnsEl.style.gap = btnGap + 'px';
      // 프렛보드 기준 수직 중앙정렬: reset 버튼 높이만 차감
      requestAnimationFrame(() => {
        const rect       = canvas.getBoundingClientRect();
        const cssH       = rect.height;
        const fbCenterY  = (BASE_PAD_T + BASE_FBH / 2) / BASE_H * cssH;
        const totalBtnH  = btnSize * 2 + btnGap;
        mainBtnsEl.style.paddingTop = Math.max(0, fbCenterY - totalBtnH / 2 - btnSize) + 'px';
      });
    }
  }
  // finger-num-group 동적 사이즈
  const fingerBtnSize = Math.max(28, Math.round(displayW * 0.076 * 1.5));
  const fingerIconSize = Math.round(fingerBtnSize * 0.54);
  const fingerFontSize = Math.max(10, Math.round(fingerBtnSize * 0.46));
  const fingerNumBtn = document.getElementById('btn-finger-num');
  if (fingerNumBtn) {
    fingerNumBtn.style.width  = fingerBtnSize + 'px';
    fingerNumBtn.style.height = fingerBtnSize + 'px';
    const svg = fingerNumBtn.querySelector('svg');
    if (svg) { svg.style.width = fingerIconSize + 'px'; svg.style.height = fingerIconSize + 'px'; }
  }
  const fingerDivider = document.querySelector('.finger-num-divider');
  if (fingerDivider) fingerDivider.style.height = fingerBtnSize + 'px';
  document.querySelectorAll('.finger-btn').forEach(btn => {
    btn.style.width    = fingerBtnSize + 'px';
    btn.style.height   = fingerBtnSize + 'px';
    btn.style.fontSize = fingerFontSize + 'px';
  });

  // 샵/플랫 토글 동적 스케일
  const accOverlay = document.querySelector('.canvas-wrap-acc-overlay');
  if (accOverlay) {
    const accScale = Math.max(0.6, Math.min(0.95, displayW / BASE_W)) * 1.5;
    accOverlay.style.transform = `scale(${accScale.toFixed(3)})`;
  }

  RATIO = (displayW * 2) / BASE_W; // 2x 화질: 물리픽셀 = CSS 표시 크기의 2배
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
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) { resizeCanvas(); renderSidebar(); } };
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

// 하단 탭 네비게이션 상태
let _activeTab      = 'home';    // 'home' | 'projects' | 'profile'
let _homeSubView    = 'home';    // 'home' | 'editor' | 'library'
let _projectsSubView = 'list';   // 'list' | 'project'


// ── Wheel Picker ─────────────────────────────────────────────
// CSS --picker-item-h 와 반드시 일치
const PICKER_ITEM_H = 30;

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
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (scrollEl._pickerGen !== _gen) return; // 낡은 타이머: 무시
      const total = scrollEl.children.length;
      if (!total) return;
      const idx = Math.max(0, Math.min(Math.round(scrollEl.scrollTop / PICKER_ITEM_H), total - 1));
      onPick(idx);
    }, 150);
  }, { signal: _abort.signal });

  scrollEl._scrollToIdx = (idx, smooth = false) => {
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
  const current = document.getElementById('acc-sharp')?.classList.contains('active') ? 'sharp' : 'flat';
  setAccidental(current === 'sharp' ? 'flat' : 'sharp');
}
function toggleLibAccidental() {
  _playTap();
  const current = document.getElementById('lib-acc-sharp')?.classList.contains('active') ? 'sharp' : 'flat';
  setLibAccidental(current === 'sharp' ? 'flat' : 'sharp');
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
  document.getElementById('acc-sharp').classList.toggle('active', mode === 'sharp');
  document.getElementById('acc-flat').classList.toggle('active', mode === 'flat');
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
  const el = document.getElementById('chord-suggestions');
  if (!el) return;
  const names = suggestChordNames();
  el.innerHTML = names.map(n =>
    `<span class="chord-suggest-item" onclick="onSuggestionTapped('${n.replace(/'/g, "\\'")}')">${chordNameToHtml(n)}</span>`
  ).join('');
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
let selectedFinger  = 1;
let fingerNumMode   = false;
let dots        = [{s:1,f:2,n:1},{s:2,f:2,n:2},{s:3,f:2,n:3}];
let barreActive = {};
let openMute    = ['open','open','open','open','open','mute'];
let rootMode    = false;
let rootIndex   = -1;

function toggleFingerNum() {
  _playTap();
  fingerNumMode = !fingerNumMode;
  document.getElementById('btn-finger-num').classList.toggle('active', fingerNumMode);
  document.getElementById('finger-group').style.opacity = fingerNumMode ? '1' : '0.35';
  draw();
}

function calcRootIndex() {
  const dotMaxS  = dots.length ? Math.max(...dots.map(d => d.s)) : -1;
  const openMaxS = openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

function toggleRootMode() {
  rootMode = !rootMode;
  document.getElementById('btn-root').classList.toggle('active', rootMode);
  rootIndex = rootMode ? calcRootIndex() : -1;
  draw();
}

function selectFinger(n) {
  _playTap();
  selectedFinger = n;
  document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('f' + n).classList.add('selected');
}

function resetAll() {
  analytics.track('editor_reset', {});
  // 프로젝트 선택값 보존
  const projectSelect = document.getElementById('add-project-select');
  const savedProject  = projectSelect?.value ?? '';

  dots        = [{s:1,f:2,n:1},{s:2,f:2,n:2},{s:3,f:2,n:3}];
  barreActive = {};
  openMute    = ['open','open','open','open','open','mute'];
  rootMode    = false;
  rootIndex   = -1;
  document.getElementById('btn-root')?.classList.remove('active');
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
  const fretDisplay = document.getElementById('fret-number-display');
  if (fretDisplay) fretDisplay.textContent = '2';
  updateChordDisplay(false); // 리셋 = 비유저 렌더, chord_build 제외
  draw();

  // 프로젝트 선택값 복원
  if (savedProject) userSelectedProjectId = savedProject;
  if (projectSelect && savedProject) projectSelect.value = savedProject;
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
  drawCanvas(ctx, RATIO);
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
function updateBarreBtns() {
  const container = document.getElementById('barre-btns');
  if (!container) return;
  container.innerHTML = '';
  let needsRedraw = false;
  const ds = parseFloat(canvas.style.width) / canvas.width; // 물리→CSS 실제 변환 비율
  const btnSize = Math.round(48 * ds);
  const containerH = btnSize + 8;
  container.style.height = containerH + 'px';
  getBarreFrets().forEach(f => {
    if (barreActive[f] === undefined) {
      barreActive[f] = false; // 기본 비활성 — 사용자가 직접 활성화
    }
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const left = Math.round((f - 0.5) * FW() * ds) - Math.round(btnSize / 2); // barre-wrap이 nut 기준 시작
    const top  = Math.round((containerH - btnSize) / 2);
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${btnSize}px;height:${btnSize}px;
      border-radius:50%;border:none;
      background:${barreActive[f] ? '#242729' : '#ffffff'};
      color:${barreActive[f] ? '#fff' : '#888'};
      font-size:${Math.round(22 * ds)}px;font-family:'Pretendard',sans-serif;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
    btn.onclick = () => {
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
    };
    container.appendChild(btn);
  });
  if (needsRedraw) drawCanvas(ctx, RATIO);
}

// ═══════════════════════════════════════════════════════════════
// 클릭 처리
// ═══════════════════════════════════════════════════════════════
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W() / rect.width);
  const my = (e.clientY - rect.top)  * (CH() / rect.height);
  const si = Math.round((my - TT()) / SH());
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= TL() - 50 && mx < TL()) {
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

  if (mx < TL() || mx > TR() + 5) return;

  const fi = Math.floor((mx - TL()) / FW()) + 1;
  if (fi < 1 || fi > FRETS) return;

  // 바레로 커버된 줄은 해당 바레 프렛보다 낮은 곳에 dot 불가
  const barreMapCheck = buildBarreMap(dots, barreActive);
  if (barreMapCheck[si] !== undefined && fi < barreMapCheck[si]) return;

  const idx = dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    // 같은 위치 토글 오프: 해당 dot만 제거
    dots.splice(idx, 1);
    if (!dots.some(d => d.s === si)) openMute[si] = 'open';
  } else {
    // 바레가 이 줄을 커버하고 있고 클릭 프렛이 바레 우측이면 → 바레 dot 유지, 우측 dot만 교체
    const barreF = barreMapCheck[si];
    if (barreF !== undefined && fi > barreF) {
      dots = dots.filter(d => d.s !== si || d.f === barreF);
      dots.push({ s: si, f: fi, n: selectedFinger });
    } else {
      // 바레 없음 또는 바레 프렛 클릭: 한 줄 1개
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
      dots.push({ s: si, f: fi, n: selectedFinger });
    }
  }
  if (rootMode) rootIndex = calcRootIndex();
  _syncChordFromCanvas();
});

// ═══════════════════════════════════════════════════════════════
// PNG 저장
// ═══════════════════════════════════════════════════════════════

// ── 이미지 저장 모달 (에디터/라이브러리 공용) ──────────────────
// 상단 미리보기 / 중앙 배율 슬라이더 / 하단 투명옵션·저장버튼
let _imgMode        = 'editor'; // 'editor' | 'library'
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

  if (_imgMode === 'library') {
    if (!_libEntry) return;
    const useFlat  = accidental === 'flat';
    const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
    _drawLibCanvas(cv, (cssW * dpr) / BASE_W, _libEntry, dispName, _libFingeringIdx || 0, _imgTransparent);
  } else {
    const ctx = cv.getContext('2d');
    drawCanvas(ctx, (cssW * dpr) / BASE_W, null, _imgTransparent);
  }
}

async function onImgSave() {
  if (_imgScale > getPlanLimit('maxScale')) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }
  if (_imgTransparent && getPlan() === 'free') { closeImgSaveModal(); openPlanSheet('image_transparent'); return; }
  closeImgSaveModal();
  if (_imgMode === 'library') await _doExportLibChordImage(_imgScale, _imgTransparent);
  else                        await _doSavePNG(_imgScale, _imgTransparent);
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
      const SaveImage = window.Capacitor.Plugins.SaveImage;
      await SaveImage.saveToGallery({ base64, fileName: fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') });
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

// ═══════════════════════════════════════════════════════════════
// fret 입력
// ═══════════════════════════════════════════════════════════════
let currentFretNumber = 2;

function adjustFretNumber(delta) {
  _playTap();
  const next = currentFretNumber + delta;
  if (next < 2 || next > 18) return;
  currentFretNumber = next;
  const el = document.getElementById('fret-number-display');
  if (el) el.textContent = currentFretNumber;
  _syncChordFromCanvas();
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

// 모달 에디터용
function meRemoveDotsUnderBarre(f) {
  const same = me_dots.filter(d => d.f === f);
  if (same.length < 2) return;
  const minS = Math.min(...same.map(d => d.s));
  const maxS = Math.max(...same.map(d => d.s));
  me_dots = me_dots.filter(d => !(d.f < f && d.s >= minS && d.s <= maxS));
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
}

// 페이지 이탈 시 잔향 하드컷 — 전환 애니메이션 동안 이전 문서가 살아있어
// SUSTAIN(3.5초) 잔향이 다음 페이지까지 넘어가는 문제 방지.
window.addEventListener('pagehide', () => {
  if (typeof Tone !== 'undefined') { try { Tone.getDestination().mute = true; } catch (e) {} }
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
});


// ═══════════════════════════════════════════════════════════════
// DOM 전용 — 스토리지 경고 (shared.js에서 typeof 가드로 호출)
// ═══════════════════════════════════════════════════════════════
function showStorageWarning() {
  document.getElementById('storage-warning').classList.remove('hidden');
}

function hideStorageWarning() {
  document.getElementById('storage-warning').classList.add('hidden');
}






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


// ── 온보딩 오버레이 없음 (home.html) — no-op 스텁 ────────────
function showOnboarding() {}
function hideOnboarding() {}

// ── 공지 팝업 ────────────────────────────────────────────────────
let _currentNoticeId = null;

async function checkAndShowNotice() {
  if (!_authReady) return;
  const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
  if (!stored) return;
  let session;
  try { session = JSON.parse(stored); } catch(e) { return; }
  if (!session?.access_token || !session?.user?.id) return;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + session.access_token,
  };

  try {
    // 읽은 공지 ID 목록
    const readsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/notice_reads?select=notice_id&user_id=eq.${session.user.id}`,
      { headers }
    );
    const reads = readsResp.ok ? await readsResp.json() : [];
    const readIds = reads.map(r => r.notice_id);

    // 안 읽은 공지 중 가장 오래된 것 1개
    let url = `${SUPABASE_URL}/rest/v1/notices?select=id,title,message&order=created_at.asc&limit=1`;
    if (readIds.length > 0) {
      url += `&id=not.in.(${readIds.join(',')})`;
    }
    const noticesResp = await fetch(url, { headers });
    const notices = noticesResp.ok ? await noticesResp.json() : [];
    // 노출할 공지 없으면 이벤트 보상 모달 → 없으면 리뷰 유도 모달 시도 (안전 시점)
    if (!notices?.length) {
      if (typeof checkEventThanks130 === 'function' && await checkEventThanks130()) return;
      if (typeof reviewMaybeShow === 'function') reviewMaybeShow();
      return;
    }

    const notice = notices[0];
    _currentNoticeId = notice.id;
    document.getElementById('notice-modal-title').textContent = notice.title;
    document.getElementById('notice-modal-message').textContent = notice.message.replace(/\\n/g, '\n');
    document.getElementById('notice-modal-overlay').classList.remove('hidden');
    analytics.track('notice_viewed', { notice_id: notice.id, title: notice.title });
  } catch(e) { /* 무시 */ }
}

async function closeNoticeModal() {
  document.getElementById('notice-modal-overlay').classList.add('hidden');
  if (!_currentNoticeId) return;
  const noticeId = _currentNoticeId;
  _currentNoticeId = null;

  const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
  if (!stored) return;
  let session;
  try { session = JSON.parse(stored); } catch(e) { return; }
  if (!session?.access_token || !session?.user?.id) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/notice_reads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + session.access_token,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ user_id: session.user.id, notice_id: noticeId }),
    });
  } catch(e) { /* 무시 */ }
}

// ── 이벤트 보상 모달 (버전 감사 이벤트 등 1회성 지급) ──
// 지급/플래그 서버 로직 미결 — 현재는 UI만. 자동 트리거 조건 확정되면 연결.
function openEventModal(title, message, rewardCount) {
  document.getElementById('event-modal-title').textContent = title;
  document.getElementById('event-modal-message').textContent = message;
  document.getElementById('event-modal-reward-count').textContent = '+' + rewardCount;
  document.getElementById('event-modal-overlay').classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('event-modal-overlay').classList.add('hidden');
}


// ── 튜토리얼 모달 ──
// 세션(앱 실행) 단위로 관리 — 앱 재시작마다 초기화되어 매번 노출
let _tutorialShownThisSession = false;

function showTutorialIfNeeded() {
  // 임시 비활성화
  // if (_tutorialShownThisSession) return;
  // setTimeout(() => {
  //   _tutorialShownThisSession = true;
  //   document.getElementById('modal-tutorial').classList.remove('hidden');
  // }, 500);
}

function toggleUpdateSection(header) {
  const body = header.nextElementSibling;
  const isOpen = header.classList.contains('open');
  header.classList.toggle('open', !isOpen);
  body.classList.toggle('collapsed', isOpen);
}

function showTutorial() {
  const el = document.getElementById('modal-tutorial');
  el.classList.remove('hidden');
  el.classList.remove('closing');
  analytics.track('tutorial_viewed', {});
}

function closeTutorial() {
  const el = document.getElementById('modal-tutorial');
  el.classList.add('closing');
  el.addEventListener('animationend', () => {
    el.classList.add('hidden');
    el.classList.remove('closing');
  }, { once: true });
}


function renderAuthUI(user) {
  // 로그인 UI는 노출하지 않음 — 자동 로그인으로만 처리
  // 플랜 배지만 갱신
  renderPlanBadge();
}


// 플랜 관련 함수는 plan.js로 이전됨

// ── 배율 옵션 잠금 제어 ─────────────────────────────────────────
function updateExportScaleOptions() {
  const max = getPlanLimit('maxScale');
  const dd = document.getElementById('scale-dropdown');
  if (!dd) return;
  dd.querySelectorAll('.scale-dropdown-item').forEach(item => {
    item.classList.toggle('locked', parseFloat(item.dataset.scale) > max);
  });
}

// ── 요금제 바텀시트 열기 ──────────────────────────────────────
function openPlanModal() {
  analytics.track('paywall_viewed', { trigger_source: 'profile', current_plan: getPlan() });
  openPlanSheet('profile');
}

// ── 업그레이드 유도 모달 ───────────────────────────────────────
const UPGRADE_MESSAGES = {
  project_limit: {
    title: '노트 한도에 도달했습니다',
    desc: {
      free:     '무료 플랜은 노트를 3개까지 만들 수 있습니다. Pro로 업그레이드하면 무제한으로 사용할 수 있습니다.',
      pro:      '',
    },
  },
  scale_limit: {
    title: '이 배율은 Pro 플랜 전용입니다',
    desc: {
      free:     'x2, x3 고화질 저장은 Pro 플랜에서 사용할 수 있습니다.',
      pro:      '',
    },
  },
};

function showUpgradeModal(reason) {
  const plan = getPlan();
  const msg = UPGRADE_MESSAGES[reason];
  if (!msg) return;
  document.getElementById('upgrade-modal-title').textContent = msg.title;
  document.getElementById('upgrade-modal-desc').textContent  = msg.desc[plan] || '';
  document.getElementById('upgrade-modal-overlay').classList.remove('hidden');
  analytics.track('paywall_viewed', { trigger_source: reason, current_plan: plan });
}

function closeUpgradeModal() {
  document.getElementById('upgrade-modal-overlay').classList.add('hidden');
}

// ── 사이드바 플랜 배지 ─────────────────────────────────────────
async function loadProfileFromDB() {
  const PLAN_DESC = {
    free:     '노트 3개 · 이미지 x1',
    standard: '노트 10개 · 이미지 x3',
    pro:      '노트 무제한 · 이미지 x5',
  };

  // 통계 (로컬)
  try {
    const projects = loadProjects();
    const chordCount = projects.reduce((s, p) => s + (p.chords?.length || 0), 0);
    const stats = getStats();
    const _sv2 = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    _sv2('stat-projects', projects.length);
    _sv2('stat-chords', chordCount);
    _sv2('stat-images', stats.images);
    _sv2('stat-shares', stats.shares);
    syncStatsToDB();
  } catch(e) { console.warn('[Profile] stats err:', e); }

  // DB 데이터
  try {
    const _sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) { console.warn('[Profile] session 없음'); return; }
    let session = JSON.parse(stored);
    let token = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) { console.warn('[Profile] token/userId 없음'); return; }

    // token 만료 시 refresh 시도
    const now = Math.floor(Date.now() / 1000);
    const expired = session.expires_at && session.expires_at <= now;
    if (expired && session.refresh_token) {
      try {
        const rr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (rr.ok) {
          const refreshed = await rr.json();
          if (refreshed.access_token) {
            session = saveSessionToStorage(refreshed);
            token = session.access_token;
          }
        }
      } catch(e) { console.warn('[Profile] refresh 실패:', e); }
    }

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=nickname,plan,created_at,persona`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) {
      console.warn('[Profile] fetch 실패:', resp.status);
      return;
    }
    const rows = await resp.json();
    if (!rows.length) {
      console.warn('[Profile] row 없음 uid=', userId);
      return;
    }
    const row = rows[0];

    const nickname = row.nickname || session?.user?.user_metadata?.full_name || '—';
    const plan = row.plan || getPlan() || 'free';
    const joinedAt = row.created_at
      ? new Date(row.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const planLabel = plan === 'pro' ? 'Pro' : plan === 'standard' ? 'Standard' : 'Free';

    _sv('profile-name', nickname);
    _sv('profile-joined', '가입일 ' + joinedAt);
    _sv('profile-plan-badge', planLabel);
    _sv('profile-plan-name', planLabel);
    _sv('profile-plan-desc', PLAN_DESC[plan] || PLAN_DESC.free);

    const badge = document.getElementById('profile-plan-badge');
    if (badge) badge.dataset.plan = plan;

    // 페르소나 뱃지 (있을 때만 구분자+라벨 표시)
    const PERSONA_LABEL = {
      unboxing: '언박싱 1일차',
      beginner: '굳은살 비기너',
      sheet_reader: '악보의존자',
      home_master: '방구석 기타마스터',
    };
    const personaLabel = PERSONA_LABEL[row.persona];
    const pBadge = document.getElementById('profile-persona-badge');
    const pDiv = document.getElementById('profile-badge-divider');
    if (personaLabel) {
      if (pBadge) { pBadge.textContent = personaLabel; pBadge.hidden = false; }
      if (pDiv) pDiv.hidden = false;
    } else {
      if (pBadge) pBadge.hidden = true;
      if (pDiv) pDiv.hidden = true;
    }

    // DB persona → localStorage 동기화 (실기기 등 새 환경에서 unboxing 고정 방지)
    if (row.persona && PERSONA_STAGES.indexOf(row.persona) !== -1 && row.persona !== getUserPersona()) {
      setUserPersona(row.persona);
      if (typeof renderProfileXp === 'function') renderProfileXp();
      if (typeof renderTopbarLevel === 'function') renderTopbarLevel();
    }
  } catch(e) {
    console.warn('[Profile] catch:', e);
  }
}

function renderPlanBadge() {
  const el = document.getElementById('sidebar-plan-badge');
  if (!el) return;
  const plan = getPlan();
  const labels = { free: 'FREE', pro: 'PRO' };
  el.textContent = labels[plan] || 'FREE';
  el.dataset.plan = plan;
}

function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

function updateProject(updated) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }
  saveProjects(projects);
}

// ═══════════════════════════════════════════════════════════════
// 네비게이션
// ═══════════════════════════════════════════════════════════════
// contextProjectId는 초기화 시점 이전에도 참조되므로 파일 상단에 선언
// (let 선언은 TDZ로 인해 선언 전 접근 시 ReferenceError 발생)

// ─── 하단 탭 전환 ────────────────────────────────────────────
const _TAB_ORDER = { home: 0, projects: 1, profile: 2 };
const _SLIDE_CLS = ['slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right'];

function _clearSlide(...els) {
  els.forEach(el => el?.classList.remove(..._SLIDE_CLS));
}

function switchTab(tab, noAnim = false) {
  const prevTab = _activeTab;
  _activeTab = tab;

  // SPA 내부 탭 이동은 pagehide가 안 뜸 → 코드에디터 재생 중이던 사운드가 안 멈춤. 하드컷.
  // (stopPlayAll은 user_project.js 전용 함수라 home.html엔 없음 — GuitarAudio.panic()이 그래프 절단+재초기화까지 처리)
  if (prevTab !== tab && typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();

  // 모든 탭 즉시 정리 — 진행 중 애니메이션 강제 종료 + 비대상 탭 즉시 숨김
  // (animationend에 hide를 위임하지 않음 → 빠른 연속 탭 전환 시 안전)
  ['home', 'projects', 'profile'].forEach(t => {
    const el = document.getElementById('tab-view-' + t);
    _clearSlide(el);
    if (t !== tab) el?.classList.add('hidden');
  });

  const nextEl = document.getElementById('tab-view-' + tab);
  if (!nextEl) return;

  nextEl.classList.remove('hidden');

  // 들어오는 탭에만 슬라이드 애니메이션 적용
  if (prevTab !== tab && !noAnim) {
    const forward = (_TAB_ORDER[tab] ?? 0) > (_TAB_ORDER[prevTab] ?? 0);
    nextEl.classList.add(forward ? 'slide-in-right' : 'slide-in-left');
    nextEl.addEventListener('animationend', () => {
      _clearSlide(nextEl); // 클래스 정리만, hide 로직 없음
    }, { once: true });
  }

  // 하단 탭 활성화
  ['home', 'projects', 'profile'].forEach(t => {
    document.getElementById('nav-' + t)?.classList.toggle('active', t === tab);
  });

  _updateBackBtn();

  // 설정(톱니) 버튼: 프로필 탭에서만 노출
  document.getElementById('settings-btn')?.classList.toggle('hidden', tab !== 'profile');

  // 레벨 위젯: 홈 탭에서만 노출
  document.getElementById('topbar-level')?.classList.toggle('hidden', tab !== 'home');
  if (tab === 'home' && typeof renderTopbarLevel === 'function') renderTopbarLevel();

  if (tab === 'profile' && typeof renderProfileXp === 'function') renderProfileXp();

  if (tab === 'home') enterFromHome('home');
  if (tab === 'projects') renderProjectsList();
  if (tab === 'profile') loadProfileFromDB();

  if (typeof analytics !== 'undefined') {
    analytics.setScreen(tab);
    if (prevTab !== tab) analytics.track('tab_switched', { from: prevTab, to: tab });
  }
}

// ─── 탭 애니메이션 후 진입 ───────────────────────────────────
function enterFromBlock(e, el, view) {
  if (el.dataset.going) return;

  const startTime = Date.now();
  const startY    = e.clientY;
  el.dataset.going = '1';
  el.classList.add('pressing');

  function cleanup() {
    el.classList.remove('pressing');
    delete el.dataset.going;
    document.removeEventListener('pointerup',     onUp);
    document.removeEventListener('pointercancel', onCancel);
  }

  function onUp(ev) {
    const elapsed = Date.now() - startTime;
    const moveY   = Math.abs(ev.clientY - startY);
    cleanup();
    if (elapsed < 300 && moveY < 10) {
      const _tapP = _playTap();
      analytics.track('home_block_tapped', { block: view });
      // training은 실제 페이지 이동(언로드가 재생을 끊음) → 재생 시작 확인 후 어택 확보하고 이동.
      // 폴백: 재생이 차단/지연돼도 300ms 내 반드시 이동(전환이 멈추지 않도록).
      if (view === 'training') {
        let _navd = false;
        const _go = () => { if (!_navd) { _navd = true; location.href = 'training.html'; } };
        _tapP.then(() => setTimeout(_go, 240)); // 트림된 tap(~260ms) 온전 재생 후 이동 → 깨짐 방지
        setTimeout(_go, 450);                   // 폴백: 재생 차단/지연돼도 반드시 이동
        return;
      }
      // 홈블럭 직접 에디터 진입은 사전 복귀 대상 아님 → 플래그 해제
      if (view === 'editor') _fromLibraryToEditor = false;
      // 에디터에서 뒤로가기(back-btn = 'home') 시, 사전 경유로 왔으면 홈 대신 사전으로 복귀
      let _dest = view, _reverse = false;
      if (view === 'home' && _homeSubView === 'editor' && _fromLibraryToEditor) { _dest = 'library'; _reverse = true; }
      _fromLibraryToEditor = false; // 에디터 이탈 시 소진
      enterFromHome(_dest, false, _reverse);
    }
  }

  function onCancel() { cleanup(); }

  // document 레벨에서 수신 — 마우스/터치 모두 안정적으로 동작
  document.addEventListener('pointerup',     onUp,     { once: true });
  document.addEventListener('pointercancel', onCancel, { once: true });
}

function tapSwitchTab(el, tab) {
  if (el.dataset.going) return;
  _playTap();
  // from_project 모드: 커버로 가린 채 에디터 초기화 → 해당 탭으로 이동 → 커버 제거
  if (_isFromProject) {
    _editorReturnProjectId = null;
    _editorEditingChordId  = null;
    _isFromProject         = false;
    const _cover = document.getElementById('page-cover');
    if (_cover) {
      _cover.style.transition = 'none';
      _cover.style.display    = '';
      _cover.style.opacity    = '1';
      _cover.offsetHeight; // reflow — 즉시 페인트
    }
    resetAll();
    // cover 아래에서 탭 전환 완료 후 페이드아웃
    requestAnimationFrame(() => {
      switchTab(tab);
      if (_cover) {
        _cover.style.transition = '';
        requestAnimationFrame(() => {
          _cover.classList.add('cover-out');
          setTimeout(() => { _cover.style.display = 'none'; }, 200);
        });
      }
    });
    return;
  }
  el.dataset.going = '1';
  setTimeout(() => {
    delete el.dataset.going;
    switchTab(tab);
  }, 150);
}

// ─── 홈 탭 → 서브뷰 진입 ─────────────────────────────────────
async function enterFromHome(view, skipAnim = false, reverse = false) {
  const prevView = _homeSubView;
  _homeSubView = view;

  // 에디터·라이브러리 이탈 시 사운드 중지
  if (prevView !== view && (prevView === 'editor' || prevView === 'library')) {
    if (typeof GuitarAudio !== 'undefined') await GuitarAudio.stop({ wait: true });
  }

  const ids = { home: 'view-home', editor: 'view-editor', library: 'view-library' };
  const incoming = document.getElementById(ids[view]);
  const outgoing = prevView !== view ? document.getElementById(ids[prevView]) : null;

  // 이전 애니메이션 잔재 제거 (SPA: DOM 재사용으로 클래스 누적 방지)
  Object.values(ids).forEach(id => _clearSlide(document.getElementById(id)));

  if (skipAnim || !outgoing || outgoing.classList.contains('hidden')) {
    Object.values(ids).forEach(id =>
      document.getElementById(id)?.classList.toggle('hidden', id !== ids[view])
    );
  } else {
    let forward = view !== 'home';
    if (reverse) forward = !forward; // 에디터→사전 복귀 등: 방향 반전
    // outgoing: animationend 미발화 대비 타임아웃 폴백 (SPA DOM 재사용 버그 방지)
    outgoing.classList.add(forward ? 'slide-out-left' : 'slide-out-right');
    let outDone = false;
    const hideOutgoing = () => {
      if (outDone) return;
      outDone = true;
      outgoing.classList.add('hidden'); // 먼저 숨긴 후 슬라이드 클래스 제거
      _clearSlide(outgoing);
    };
    outgoing.addEventListener('animationend', hideOutgoing, { once: true });
    setTimeout(hideOutgoing, 300); // 250ms 애니메이션 + 50ms 여유
    // incoming
    incoming.classList.remove('hidden');
    incoming.classList.add(forward ? 'slide-in-right' : 'slide-in-left');
    let inDone = false;
    const clearIncoming = () => {
      if (inDone) return;
      inDone = true;
      _clearSlide(incoming);
    };
    incoming.addEventListener('animationend', clearIncoming, { once: true });
    setTimeout(clearIncoming, 300);
  }

  _updateBackBtn();

  // 탑바 타이틀: 홈 화면에서만 표시
  const topBarTitle = document.querySelector('.top-bar-title');
  if (topBarTitle) topBarTitle.classList.toggle('hidden', view !== 'home');

  // 탑바 배경: 라이브러리에서는 흰색
  const topBar = document.querySelector('.top-bar');
  if (topBar) topBar.classList.toggle('top-bar--white', view === 'library');

  if (view === 'editor') {
    analytics.setScreen('editor');
    analytics.track('screen_view', { view: 'editor', project_id: null });
    contextProjectId = null;
    document.getElementById('project-edit-bar')?.classList.add('hidden');
    populateProjectSelect();
    requestAnimationFrame(resizeCanvas);
    if (isMobileOrTablet() && screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } else if (view === 'library') {
    analytics.setScreen('library');
    analytics.track('library_opened', {});
    if (isMobileOrTablet() && screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }
    document.getElementById('lib-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
    document.getElementById('lib-acc-flat')?.classList.toggle('active', accidental === 'flat');
    renderLibRootTabs();
    renderLibCards(_libRoot);
    const _initEntries = (window.chordsLibrary || {})[_libRoot] || [];
    if (_initEntries.length > 0) selectLibEntry(0, { silent: true });
    requestAnimationFrame(() => {
      const bottom = document.querySelector('.lib-bottom');
      if (bottom && !bottom.dataset.heightFixed) {
        bottom.style.height = bottom.getBoundingClientRect().height + 'px';
        bottom.style.flex   = 'none';
        bottom.dataset.heightFixed = '1';
      }
    });
  }
}

// ─── Android 네이티브 뒤로가기 (double-back to exit) ──────────
let _backPressTimestamp = 0;

function handleNativeBack() {
  const now = Date.now();
  if (now - _backPressTimestamp < 2000) {
    window.Capacitor?.Plugins?.App?.exitApp?.();
    return;
  }
  _backPressTimestamp = now;
  const toast = document.getElementById('exit-toast');
  if (!toast) return;
  toast.textContent = '한 번 더 누르면 앱이 종료됩니다';
  toast.classList.remove('visible');
  clearTimeout(toast._hideTimer);
  requestAnimationFrame(() => {
    toast.classList.add('visible');
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  });
}

function _updateBackBtn() {
  // from_project 모드에서는 탑바 뒤로가기 버튼 항상 숨김
  // (바텀바 탭 이탈 시 user_project로 복귀하므로 탑바 버튼 불필요)
  if (_isFromProject) {
    document.getElementById('back-btn')?.classList.add('hidden');
    return;
  }
  const show =
    (_activeTab === 'home' && _homeSubView !== 'home') ||
    (_activeTab === 'projects' && _projectsSubView !== 'list');
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  if (show) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// ─── from_project 모드에서 user_project로 복귀 ─────────────────
// 커버를 즉시 복원 후 이동 → 새 페이지가 project-enter와 함께 커버를 걷어냄
async function _returnToProject(returnId) {
  _editorReturnProjectId = null;
  _editorEditingChordId  = null;
  _isFromProject         = false;
  if (typeof GuitarAudio !== 'undefined') await GuitarAudio.stop({ wait: true });
  const cover = document.getElementById('page-cover');
  if (cover) {
    cover.style.transition = 'none';
    cover.style.display    = '';
    cover.style.opacity    = '1';
    cover.offsetHeight; // reflow — cover 즉시 페인트
    resetAll();
    requestAnimationFrame(() => {
      location.href = 'user_project.html?id=' + returnId;
    });
  } else {
    resetAll();
    location.href = 'user_project.html?id=' + returnId;
  }
}

// ─── 프로젝트 페이지 열기 (슬라이드업 애니메이션) ────────────────
async function openProject(projectId) {
  const proj = loadProjects().find(p => p.id === projectId);
  if (proj) {
    const chordCount = (proj.slots || []).filter(s => s && s.name).length;
    const ageDays    = proj.createdAt ? Math.floor((Date.now() - proj.createdAt) / 86400000) : 0;
    analytics.track('project_opened', { project_id: projectId, chord_count: chordCount, age_days: ageDays });
  }
  if (typeof GuitarAudio !== 'undefined') await GuitarAudio.stop({ wait: true });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('home-recede');
    setTimeout(() => {
      location.href = 'user_project.html?id=' + projectId;
    }, 200);
  } else {
    location.href = 'user_project.html?id=' + projectId;
  }
}

// ─── navigateTo ────────────────────────────────────────────────
function navigateTo(view, projectId, opts = {}) {
  if (view === 'project' && projectId) {
    openProject(projectId);
    return;
  }

  if (view === 'editor') {
    enterFromHome('editor');
    return;
  }

  if (view === 'library') {
    enterFromHome('library');
    return;
  }
}

function switchMainTab(tab) {
  if (tab === 'editor' || tab === 'library') enterFromHome(tab);
}

// ═══════════════════════════════════════════════════════════════
// 사이드바
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() { /* 사이드바 제거됨 — no-op */ }


function closeSidebar() { /* 사이드바 제거됨 — no-op */ }

function renderSidebar() {
  renderProjectsList();
}

function renderProjectsList() {
  const container = document.getElementById('projects-list-body');
  if (!container) return;

  const projects = loadProjects();
  const important = projects.filter(p => p.important).sort((a, b) => (a.importantOrder || 0) - (b.importantOrder || 0));
  const pinned    = projects.filter(p => p.pinned && !p.important).sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));
  const recent    = projects.filter(p => !p.pinned && !p.important).sort((a, b) => b.updatedAt - a.updatedAt);

  container.innerHTML = '';

  _renderProjectsSection(container, '중요', important);
  _renderProjectsSection(container, '즐겨찾기', pinned);
  _renderProjectsSection(container, '최근', recent, false);

  if (projects.length === 0) {
    const hint = document.createElement('p');
    hint.style.cssText = 'padding:8px 20px 0;color:var(--text-muted);font-size:13px;';
    hint.textContent = '+ 버튼으로 새 노트를 만들어보세요.';
    container.appendChild(hint);
  }

  lucide.createIcons();
}

function _renderProjectsSection(container, label, projects, showDivider = true) {
  const section = document.createElement('div');
  section.className = 'projects-section';

  const sectionLabel = document.createElement('div');
  sectionLabel.className = 'projects-section-label';
  sectionLabel.textContent = label;
  section.appendChild(sectionLabel);

  if (projects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'projects-section-empty';
    empty.textContent = '없음';
    section.appendChild(empty);
  }

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'projects-item';
    item.dataset.id = project.id;

    const name = document.createElement('span');
    name.className = 'projects-item-name';
    name.textContent = project.name;

    const actions = document.createElement('div');
    actions.className = 'projects-item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'projects-item-delete';
    deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    deleteBtn.title = '삭제';
    deleteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    deleteBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); openDeleteConfirm(project.id); });

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = '<i data-lucide="pencil"></i>';
    renameBtn.title = '이름 변경';
    renameBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    renameBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); renameProject(project.id); });

    const pinBtn = document.createElement('button');
    pinBtn.innerHTML = '<i data-lucide="star"></i>';
    pinBtn.title = project.pinned ? '고정 해제' : '고정';
    if (project.pinned) pinBtn.classList.add('pinned');
    pinBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    pinBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); togglePin(project.id); });

    const starBtn = document.createElement('button');
    starBtn.innerHTML = '<i data-lucide="chess-queen"></i>';
    starBtn.title = project.important ? '중요 해제' : '중요';
    if (project.important) starBtn.classList.add('important');
    starBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    starBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); toggleImportant(project.id); });

    actions.appendChild(deleteBtn); // 가장 좌측
    actions.appendChild(renameBtn);
    actions.appendChild(pinBtn);
    actions.appendChild(starBtn);

    const kebabBtn = document.createElement('button');
    kebabBtn.className = 'projects-item-kebab';
    kebabBtn.innerHTML = '<i data-lucide="more-vertical"></i>';
    kebabBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    kebabBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      _playTap();
      document.querySelectorAll('.projects-item.show-actions').forEach(el => {
        if (el !== item) el.classList.remove('show-actions');
      });
      item.classList.toggle('show-actions');
    });

    item.appendChild(name);
    item.appendChild(actions);
    item.appendChild(kebabBtn);

    item.addEventListener('pointerdown', (e) => {
      item._tapping = true;
      item._tapX = e.clientX;
      item._tapY = e.clientY;
      item.classList.add('pressing');
    });
    item.addEventListener('pointermove', (e) => {
      if (!item._tapping) return;
      const dx = e.clientX - item._tapX;
      const dy = e.clientY - item._tapY;
      if (Math.sqrt(dx*dx + dy*dy) > 8) item._tapping = false;
    });
    item.addEventListener('pointerup', () => {
      item.classList.remove('pressing');
      if (item._tapping) {
        item._tapping = false;
        openProject(project.id);
      }
    });
    item.addEventListener('pointerleave', () => {
      item._tapping = false;
      item.classList.remove('pressing');
    });

    section.appendChild(item);
  });

  if (showDivider) {
    const divider = document.createElement('div');
    divider.className = 'projects-section-divider';
    section.appendChild(divider);
  }

  container.appendChild(section);
}


function togglePin(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  p.pinned = !p.pinned;
  if (p.pinned) {
    // 중요와 상호 배타적
    p.important = false;
    p.importantOrder = 0;
    const maxOrder = Math.max(0, ...projects.filter(x => x.pinned).map(x => x.pinnedOrder || 0));
    p.pinnedOrder = maxOrder + 1;
  } else {
    p.pinnedOrder = 0;
  }
  saveProjects(projects);
  renderProjectsList();
}

function renameProject(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  const input = document.getElementById('rename-project-input');
  const modal = document.getElementById('modal-rename-project');
  if (!input || !modal) return;
  input.value = p.name;
  modal.dataset.projectId = projectId;
  modal.classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

function confirmRenameProject() {
  const modal = document.getElementById('modal-rename-project');
  const input = document.getElementById('rename-project-input');
  if (!modal || !input) return;
  const newName = input.value.trim();
  if (!newName) return;
  const projectId = modal.dataset.projectId;
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  p.name = newName;
  saveProjects(projects);
  renderProjectsList();
  closeModal('modal-rename-project');
}

// 노트 목록에서 삭제 — user_project와 동일한 delete-confirm 모달 공유
function openDeleteConfirm(projectId) {
  const overlay = document.getElementById('delete-confirm-overlay');
  if (!overlay) return;
  const modal = overlay.querySelector('.delete-confirm-modal');
  const confirmBtn = document.getElementById('delete-confirm-btn');
  confirmBtn.onclick = () => { closeDeleteConfirm(); _deleteProjectFromList(projectId); };
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('open');
    modal.style.animation = 'deleteConfirmIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  });
}

function closeDeleteConfirm() {
  const overlay = document.getElementById('delete-confirm-overlay');
  if (!overlay) return;
  const modal = overlay.querySelector('.delete-confirm-modal');
  modal.style.animation = 'deleteConfirmOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards';
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('open');
    modal.style.animation = '';
  }, 220);
}

function _deleteProjectFromList(projectId) {
  let projects = loadProjects();
  const target = projects.find(p => p.id === projectId);
  const chordCount = (target?.slots || []).filter(s => s && s.name).length;
  if (typeof analytics !== 'undefined') analytics.track('project_deleted', { project_id: projectId, chord_count: chordCount });
  projects = projects.filter(p => p.id !== projectId);
  saveProjects(projects);
  renderProjectsList();
}

function reorderPinned(dragId, targetId) {
  const projects = loadProjects();
  const dragP = projects.find(p => p.id === dragId);
  const targetP = projects.find(p => p.id === targetId);
  if (!dragP || !targetP) return;
  const dragOrder = dragP.pinnedOrder;
  dragP.pinnedOrder = targetP.pinnedOrder;
  targetP.pinnedOrder = dragOrder;
  saveProjects(projects);
  renderSidebar();
}

function toggleImportant(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  if (!p.important) {
    // 중요 추가 시 최대 3개 제한
    const importantCount = projects.filter(x => x.important).length;
    if (importantCount >= 3) {
      showTextToast('중요 항목은 최대 3개까지 지정할 수 있어요.');
      return;
    }
    // 즐겨찾기와 상호 배타적
    p.pinned = false;
    p.pinnedOrder = 0;
    const maxOrder = Math.max(0, ...projects.filter(x => x.important).map(x => x.importantOrder || 0));
    p.importantOrder = maxOrder + 1;
    p.important = true;
  } else {
    p.important = false;
    p.importantOrder = 0;
  }
  saveProjects(projects);
  renderProjectsList();
}

function reorderImportant(dragId, targetId) {
  const projects = loadProjects();
  const dragP = projects.find(p => p.id === dragId);
  const targetP = projects.find(p => p.id === targetId);
  if (!dragP || !targetP) return;
  const dragOrder = dragP.importantOrder;
  dragP.importantOrder = targetP.importantOrder;
  targetP.importantOrder = dragOrder;
  saveProjects(projects);
  renderSidebar();
}

/**
 * 구독 만료 시 활성 유지할 프로젝트를 우선순위에 따라 자동 선택.
 * 우선순위: 중요 → 즐겨찾기 → 최근 수정순
 * @param {Array} projects - 전체 프로젝트 배열
 * @param {number} limit   - 활성 유지할 프로젝트 수 (기본 2)
 * @returns {Array} 활성 유지할 프로젝트 배열
 */
function selectActiveProjects(projects, limit = 2) {
  const selected = [];
  const usedIds  = new Set();

  // 1순위: 중요 (importantOrder 오름차순)
  projects
    .filter(p => p.important)
    .sort((a, b) => (a.importantOrder || 0) - (b.importantOrder || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  // 2순위: 즐겨찾기 (pinnedOrder 오름차순)
  projects
    .filter(p => p.pinned && !usedIds.has(p.id))
    .sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  // 3순위: 최근 수정순
  projects
    .filter(p => !usedIds.has(p.id))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  return selected;
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 생성
// ═══════════════════════════════════════════════════════════════
async function promptCreateProject() {
  await refreshPlanFromDB();
  if (!canCreateProject()) {
    analytics.track('project_limit_hit', {
      current_count: loadProjects().length,
      plan_limit: getPlanLimit('maxProjects'),
    });
    openPlanModal();
    return;
  }
  const input = document.getElementById('create-project-name-input');
  input.value = '';
  document.getElementById('modal-create-project').classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => input.focus());
}

function confirmCreateProject() {
  const input = document.getElementById('create-project-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  if (!canCreateProject()) {
    closeModal('modal-create-project');
    openPlanModal();
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
  renderSidebar();
  populateProjectSelect();
  analytics.track('project_created', { total_count: projects.length });
  incrementStat('notes'); // 노트 생성 퀘스트 누적 카운터
  openProject(newProject.id);
}

// ═══════════════════════════════════════════════════════════════
// 에디터 → 프로젝트에 추가
// ═══════════════════════════════════════════════════════════════
let userSelectedProjectId = null;

function populateProjectSelect() {
  const select = document.getElementById('add-project-select');
  if (!select) return;
  if (!select._changeTracked) {
    select.addEventListener('change', () => { userSelectedProjectId = select.value || null; });
    select._changeTracked = true;
  }
  const projects = loadProjects();
  select.innerHTML = '<option value="">노트 선택</option>';
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  const restoreId = contextProjectId || userSelectedProjectId;
  if (restoreId) select.value = restoreId;
}

// user_project에서 넘어온 코드 데이터를 에디터 상태로 복원
function loadChordStateToEditor(chord) {
  if (!chord) return;
  accidental      = chord.accidental || 'sharp';
  selectedRoot    = chord.root    || 'C';
  selectedBass    = chord.bass    || '';
  selectedTensions = Array.isArray(chord.tensions) ? [...chord.tensions] : [];
  dots            = JSON.parse(JSON.stringify(chord.dots    || []));
  openMute        = Array.isArray(chord.openMute) ? [...chord.openMute] : new Array(6).fill(0);
  barreActive     = JSON.parse(JSON.stringify(chord.barre   || {}));
  currentFretNumber = chord.fretNumber ?? 1;
  fingerNumMode   = chord.fingerNumMode ?? false;

  // 샵/플랫 버튼 UI 동기화
  document.getElementById('acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  document.getElementById('acc-flat')?.classList.toggle('active', accidental === 'flat');

  // 프렛번호 UI 동기화
  const _fd = document.getElementById('fret-number-display');
  if (_fd) _fd.textContent = String(currentFretNumber);
  const _fnBtn = document.getElementById('btn-finger-num');
  if (_fnBtn) _fnBtn.classList.toggle('active', fingerNumMode);

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
    fingerNumMode: fingerNumMode,
    accidental: accidental
  };
}

function addCurrentChordToProject() { openProjectSheet(); }

// 라이브러리 → 프로젝트 저장: _libEntry를 chordData로 변환 후 바텀시트 열기
let _pendingChordForSheet = null;

function libSaveToProject() {
  if (!_libEntry) return;
  _playTap();
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  // 에디터 "슬롯2 = fretNumber" 모델 — pattern: 라벨 r+1/offset r-1, static: 라벨 r/offset r-2 (라벨 최소 2)
  // (static 공식 하드코딩 시 pattern 보이싱 dot이 에디터에서 우측 1칸 밀림 — importLibChordToProject와 동일 공식)
  const _saveFretNum = Math.max(2, _libEntry.source === 'pattern' ? _libEntry.fretNumber + 1 : _libEntry.fretNumber);
  const fretOffset = _saveFretNum - 2;
  const activeFingering = (_libEntry.fingerings?.[_libFingeringIdx]) ?? _libEntry.fingerings?.[0] ?? _libEntry.fingering;

  const libDots = _libEntry.frets
    .map((f, s) => (f !== null && f > 0)
      ? { s, f: f - fretOffset, n: _libFingerMode ? (typeof activeFingering?.[s] === 'number' ? activeFingering[s] : 0) : 0 }
      : null)
    .filter(Boolean);
  const libOpenMute = _libEntry.frets.map((f, s) => {
    if (f === null || _libEntry.openMute[s] === 'mute') return 'mute';
    if (f === 0) return 'open';
    return 'open';
  });
  const libBarre = {};
  const importBarre = _libEntry.barres?.[_libFingeringIdx] ?? _libEntry.barres?.[0] ?? _libEntry.barre ?? {};
  Object.entries(importBarre).forEach(([f, v]) => { libBarre[parseInt(f) - fretOffset] = v; });

  const comp = parseChordNameToComponents(dispName)
    || { root: 'C', bass: '', triad: '', seventh: '', func: '', tension: '' };

  _pendingChordForSheet = {
    id: genId(),
    name: dispName,
    root: comp.root,
    triad: comp.triad  || '',
    seventh: comp.seventh || '',
    func: comp.func    || '',
    tensions: comp.tension ? [comp.tension] : [],
    bass: comp.bass    || '',
    dots: libDots,
    openMute: libOpenMute,
    barre: libBarre,
    barreRange: _libEntry.barreRanges?.[_libFingeringIdx] ?? _libEntry.barreRanges?.[0] ?? _libEntry.barreRange ?? null, // 바레 현 범위 보존(선택 보이싱과 동일 인덱스)
    source: _libEntry.source, // pattern/static — dot 세로 offset 결정, 누락 시 어긋남
    fretNumber: _saveFretNum,
    fingerNumMode: _libFingerMode,
    accidental: accidental,
    // 원본 보이싱 스냅샷 — 라이브러리 카드와 동일 렌더 계약. chordToVoicing이 이걸 우선 사용.
    voicing: {
      frets:      _libEntry.frets,
      openMute:   _libEntry.openMute,
      barre:      _libEntry.barres?.[_libFingeringIdx] ?? _libEntry.barres?.[0] ?? _libEntry.barre ?? {},
      barreRange: _libEntry.barreRanges?.[_libFingeringIdx] ?? _libEntry.barreRanges?.[0] ?? _libEntry.barreRange ?? null,
      fretNumber: _libEntry.fretNumber,
      source:     _libEntry.source,
      fingering:  _libFingerMode ? ((_libEntry.fingerings?.[_libFingeringIdx]) ?? _libEntry.fingerings?.[0] ?? _libEntry.fingering) : null,
    },
  };
  openProjectSheet();
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

// ── 일반 텍스트 토스트 ────────────────────────────────────
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


// ═══════════════════════════════════════════════════════════════
// Orientation 감지
// ═══════════════════════════════════════════════════════════════
function setupOrientationListener() {
  // 프로젝트 뷰가 user_project.html로 분리됨 — home.html에서는 re-render 불필요
}

// ═══════════════════════════════════════════════════════════════
// 모달: 뷰
// ═══════════════════════════════════════════════════════════════
let viewModalChord    = null;
let viewModalProjectId = null;

function openViewModal(chord, projectId) {
  viewModalChord = chord;
  viewModalProjectId = projectId;

  document.getElementById('modal-view-title').textContent = buildChordName(chord);

  const cv = document.getElementById('modal-view-canvas');
  VoicingCanvas.draw(cv, chordToVoicing(chord), {
    chordName: chord.name, fingerNumMode: chord.fingerNumMode,
    ratio: 480 / VoicingCanvas.BASE_W,
  });

  // 재생
  document.getElementById('modal-view-play').onclick = () => playChord(chord);

  document.getElementById('modal-view').classList.remove('hidden');
  lucide.createIcons();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ─── 설정 페이지 ───────────────────────────────────────────────
function openSettings() {
  const t = document.getElementById('setting-push-toggle');
  if (t) t.checked = localStorage.getItem('push_enabled') !== '0'; // 미설정=ON
  document.getElementById('settings-page-overlay').classList.add('settings-page-overlay--open');
  if (window.lucide) lucide.createIcons();
}

function closeSettings() {
  document.getElementById('settings-page-overlay').classList.remove('settings-page-overlay--open');
}

async function onPushToggle(el) {
  localStorage.setItem('push_enabled', el.checked ? '1' : '0');
  if (window.__pushApplyEnabled) {
    const finalOn = await window.__pushApplyEnabled();
    // 권한 거부 등으로 켜지지 못하면 토글 되돌림
    if (el.checked && finalOn === false) {
      el.checked = false;
      localStorage.setItem('push_enabled', '0');
      if (typeof showTextToast === 'function') showTextToast('알림 권한이 꺼져 있어요. 기기 설정에서 허용해 주세요.');
    }
  }
}

// ── 설정 하위 페이지: 푸시알림(연습 알림/리마인드) ───────────────
function openPushSettingsPage() {
  _playTap();
  const nudgeT = document.getElementById('push-nudge-toggle');
  const winT   = document.getElementById('push-winback-toggle');
  const peakT  = document.getElementById('push-peakfull-toggle');
  if (nudgeT) nudgeT.checked = localStorage.getItem('push_nudge_enabled')    !== '0'; // 미설정=ON
  if (winT)   winT.checked   = localStorage.getItem('push_winback_enabled')  !== '0';
  if (peakT)  peakT.checked  = localStorage.getItem('push_peakfull_enabled') !== '0';
  document.getElementById('push-settings-page-overlay').classList.add('settings-page-overlay--open');
  if (window.lucide) lucide.createIcons();
}

function closePushSettingsPage() {
  document.getElementById('push-settings-page-overlay').classList.remove('settings-page-overlay--open');
}

function onPushCategoryToggle(kind, el) {
  const KEY = { nudge: 'push_nudge_enabled', winback: 'push_winback_enabled', peakfull: 'push_peakfull_enabled' };
  const COL = { nudge: 'nudge_enabled',       winback: 'winback_enabled',      peakfull: 'peakfull_enabled' };
  localStorage.setItem(KEY[kind], el.checked ? '1' : '0');
  _setPushCategoryPref(COL[kind], el.checked);
}

// ── 사운드 볼륨 바텀시트 → shared.js 로 이동(코드진행·주법훈련 페이지와 공용) ──

// ── 확인 바텀시트(로그아웃/계정삭제 공용) ───────────────────────
function openConfirmSheet({ title, desc, btnText, danger, onConfirm }) {
  document.getElementById('confirm-sheet-title').textContent = title;
  document.getElementById('confirm-sheet-desc').textContent  = desc;
  const btn = document.getElementById('confirm-sheet-btn');
  btn.textContent = btnText;
  btn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  btn.onclick = () => { closeConfirmSheet(); onConfirm(); };
  document.getElementById('confirm-sheet-overlay').classList.add('gsheet-overlay--open');
  document.getElementById('confirm-sheet').classList.add('gsheet--open');
}

function closeConfirmSheet() {
  document.getElementById('confirm-sheet-overlay').classList.remove('gsheet-overlay--open');
  document.getElementById('confirm-sheet').classList.remove('gsheet--open');
}

function confirmLogout() {
  _playTap();
  openConfirmSheet({
    title: '로그아웃',
    desc: '로그아웃 하시겠어요?',
    btnText: '로그아웃',
    danger: false,
    onConfirm: async () => {
      closeSettings();
      await signOutWeb();
      location.reload();
    },
  });
}

function confirmDeleteAccount() {
  _playTap();
  openConfirmSheet({
    title: '계정 삭제',
    desc: '계정을 삭제하면 모든 노트와 데이터가 영구적으로 삭제되며 복구할 수 없습니다.',
    btnText: '삭제',
    danger: true,
    onConfirm: async () => {
      const r = await _peakRpc('delete_own_account');
      if (r === null) {
        if (typeof showTextToast === 'function') showTextToast('삭제에 실패했어요. 다시 시도해주세요.');
        return;
      }
      if (typeof analytics !== 'undefined') analytics.track('account_deleted', {});
      closeSettings();
      await signOutWeb();
      location.reload();
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 모달: 편집
// ═══════════════════════════════════════════════════════════════
let me_root = 'A', me_triad = '', me_seventh = '', me_func = '';
let me_tensions = [], me_bass = '';
let me_dots = [], me_barre = {}, me_openMute = new Array(STRINGS).fill('open');
let me_fingerNumMode = false, me_selectedFinger = 1, me_accidental = 'sharp';
let me_fretNumber = 2;
let me_editingChord = null;

function switchToEditModal() {
  if (!viewModalChord) return;
  closeModal('modal-view');
  openEditModal(viewModalChord, viewModalProjectId);
}

function openEditModal(chord, projectId) {
  me_editingChord = chord;
  viewModalProjectId = projectId;

  // 상태 복원
  me_root        = chord.root;
  me_triad       = chord.triad;
  me_seventh     = chord.seventh;
  me_func        = chord.func;
  me_tensions    = [...chord.tensions];
  me_bass        = chord.bass;
  me_dots        = JSON.parse(JSON.stringify(chord.dots));
  me_barre       = JSON.parse(JSON.stringify(chord.barre));
  me_openMute    = [...chord.openMute];
  me_fingerNumMode = chord.fingerNumMode;
  me_fretNumber  = chord.fretNumber || 2;
  me_accidental  = chord.accidental || 'sharp';
  me_selectedFinger = 1;

  buildEditModalUI();
  document.getElementById('modal-edit').classList.remove('hidden');
  lucide.createIcons();

  document.getElementById('modal-edit-play').onclick = () =>
    playChord({ dots: me_dots, openMute: me_openMute, fretNumber: me_fretNumber });

  // 캔버스 렌더
  setTimeout(() => meResizeCanvas(), 50);
}

function buildEditModalUI() {
  const content = document.getElementById('modal-edit-content');
  content.innerHTML = '';

  const editor = document.createElement('div');
  editor.className = 'me-editor';

  // 코드명 빌더
  const builder = document.createElement('div');
  builder.className = 'chord-builder';

  // 상단: accidental + 코드명
  const builderHeader = document.createElement('div');
  builderHeader.className = 'builder-header';
  builderHeader.appendChild(createMeAccToggle());
  const preview = document.createElement('div');
  preview.className = 'chord-preview';
  const chordDisp = document.createElement('span');
  chordDisp.id = 'me-chord-display';
  chordDisp.className = 'chord-display';
  const suggestEl = document.createElement('span');
  suggestEl.id = 'me-chord-suggestions';
  suggestEl.className = 'chord-suggestions';
  preview.appendChild(chordDisp);
  preview.appendChild(suggestEl);
  builderHeader.appendChild(preview);
  builder.appendChild(builderHeader);

  // 수평 컬럼 피커
  const columns = document.createElement('div');
  columns.className = 'wheel-picker';
  [
    { label: '근음',  id: 'me-root-group'    },
    { label: '3화음', id: 'me-triad-group'   },
    { label: '7음',   id: 'me-seventh-group' },
    { label: '기능',  id: 'me-func-group'    },
    { label: '텐션',  id: 'me-tension-group' },
    { label: '분수',  id: 'me-bass-group'    },
  ].forEach((def, i) => {
    if (i > 0) {
      const d = document.createElement('div');
      d.className = 'col-divider';
      columns.appendChild(d);
    }
    const col = document.createElement('div');
    col.className = 'builder-col';
    const lbl = document.createElement('div');
    lbl.className = 'col-label';
    lbl.textContent = def.label;
    const wrap = document.createElement('div');
    wrap.className = 'col-wheel-wrap';
    const scroll = document.createElement('div');
    scroll.className = 'col-scroll';
    scroll.id = def.id;
    wrap.appendChild(scroll);
    col.appendChild(lbl);
    col.appendChild(wrap);
    columns.appendChild(col);
  });
  builder.appendChild(columns);

  // 툴바
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'tool-group';

  const fingerModeBtn = document.createElement('button');
  fingerModeBtn.className = 'mode-btn active';
  fingerModeBtn.id = 'me-mode-finger';
  fingerModeBtn.textContent = '손가락';

  const rootModeBtn = document.createElement('button');
  rootModeBtn.className = 'mode-btn';
  rootModeBtn.id = 'me-btn-root';
  rootModeBtn.textContent = '근음';
  rootModeBtn.onclick = meToggleRootMode;

  toolGroup.appendChild(fingerModeBtn);
  toolGroup.appendChild(rootModeBtn);

  const divEl = createDividerEl();

  const fretLabel = document.createElement('span');
  fretLabel.className = 'label';
  fretLabel.textContent = '프렛';

  const fretInput = document.createElement('input');
  fretInput.id = 'me-fret-number';
  fretInput.type = 'number';
  fretInput.min = 2; fretInput.max = 18;
  fretInput.value = me_fretNumber;
  fretInput.style.cssText = 'width:52px;font-family:"DM Mono",monospace;font-size:13px;padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius);background:transparent;color:var(--text-primary);outline:none;';
  fretInput.onchange = (e) => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 2 && v <= 18) { me_fretNumber = v; meDraw(); }
    else e.target.value = me_fretNumber;
  };

  const divEl2 = createDividerEl();

  const fingerNumBtn = document.createElement('button');
  fingerNumBtn.className = 'mode-btn';
  fingerNumBtn.id = 'me-btn-finger-num';
  fingerNumBtn.textContent = '번호';
  fingerNumBtn.onclick = meToggleFingerNum;

  const fingerGroup = document.createElement('div');
  fingerGroup.className = 'finger-group';
  fingerGroup.id = 'me-finger-group';
  fingerGroup.style.opacity = '0.35';

  [1,2,3,4,0].forEach(n => {
    const fb = document.createElement('button');
    fb.className = 'finger-btn' + (n === 1 ? ' selected' : '');
    fb.id = 'me-f' + n;
    fb.textContent = n === 0 ? 'T' : String(n);
    fb.onclick = () => meSelectFinger(n);
    fingerGroup.appendChild(fb);
  });

  toolbar.appendChild(toolGroup);
  toolbar.appendChild(divEl);
  toolbar.appendChild(fretLabel);
  toolbar.appendChild(fretInput);
  toolbar.appendChild(divEl2);
  toolbar.appendChild(fingerNumBtn);
  toolbar.appendChild(fingerGroup);

  // 캔버스
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'me-canvas-wrap';

  const canvasCol = document.createElement('div');
  canvasCol.className = 'me-canvas-col';

  const canvasInner = document.createElement('div');
  canvasInner.className = 'me-canvas-inner';
  canvasInner.id = 'me-canvas-inner';

  const meCanvas = document.createElement('canvas');
  meCanvas.id = 'me-canvas';
  canvasInner.appendChild(meCanvas);
  canvasCol.appendChild(canvasInner);

  const meBarreBtns = document.createElement('div');
  meBarreBtns.id = 'me-barre-btns';
  canvasCol.appendChild(meBarreBtns);

  canvasWrap.appendChild(canvasCol);

  // 초기화 버튼
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost';
  resetBtn.textContent = '초기화';
  resetBtn.onclick = meResetAll;

  editor.appendChild(builder);
  editor.appendChild(toolbar);
  editor.appendChild(canvasWrap);
  editor.appendChild(resetBtn);

  content.appendChild(editor);

  // 버튼 그룹 렌더
  meRenderAllBtns();
  meUpdateChordDisplay();
  meDraw();

  // 캔버스 클릭
  meCanvas.addEventListener('click', meCanvasClick);
}

function createMeRow(children) {
  const row = document.createElement('div');
  row.className = 'builder-row';
  children.forEach(c => row.appendChild(c));
  return row;
}

function createMeGroup(id) {
  const div = document.createElement('div');
  div.className = 'builder-group';
  div.id = id;
  return div;
}

function createLabelEl(text) {
  const span = document.createElement('span');
  span.className = 'builder-label';
  span.textContent = text;
  return span;
}

function createDividerEl() {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}

function createMeAccToggle() {
  const wrap = document.createElement('div');
  wrap.className = 'accidental-toggle';

  const sharp = document.createElement('button');
  sharp.className = 'acc-btn' + (me_accidental === 'sharp' ? ' active' : '');
  sharp.id = 'me-acc-sharp';
  sharp.textContent = '#';
  sharp.onclick = () => meSetAccidental('sharp');

  const flat = document.createElement('button');
  flat.className = 'acc-btn' + (me_accidental === 'flat' ? ' active' : '');
  flat.id = 'me-acc-flat';
  flat.textContent = 'b';
  flat.onclick = () => meSetAccidental('flat');

  wrap.appendChild(sharp);
  wrap.appendChild(flat);
  return wrap;
}

// ── me_* 상태 관리 함수 ──
function meSetAccidental(mode) {
  // 음높이(인덱스) 유지하며 표기법만 변환
  const oldRoots = me_accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const newRoots = mode           === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const rootIdx = oldRoots.indexOf(me_root);
  if (rootIdx !== -1) me_root = newRoots[rootIdx];
  const bassIdx = oldRoots.indexOf(me_bass);
  if (bassIdx !== -1) me_bass = newRoots[bassIdx];

  me_accidental = mode;
  const sharp = document.getElementById('me-acc-sharp');
  const flat  = document.getElementById('me-acc-flat');
  if (sharp) sharp.classList.toggle('active', mode === 'sharp');
  if (flat)  flat.classList.toggle('active', mode === 'flat');
  meRenderRootBtns();
  meRenderBassBtns();
  meUpdateChordDisplay();
}

function meRenderAllBtns() {
  meRenderRootBtns();
  meRenderTriadBtns();
  meRenderSeventhBtns();
  meRenderFuncBtns();
  meRenderTensionBtns();
  meRenderBassBtns();
}

function meRenderRootBtns() {
  const roots = me_accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  if (!roots.includes(me_root)) me_root = roots[0];
  const group = document.getElementById('me-root-group');
  if (!group) return;
  group.innerHTML = '';
  roots.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === me_root ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => {
      me_root = r;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => roots.indexOf(me_root), (i) => {
    me_root = roots[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meRenderTriadBtns() {
  const TRIAD_VALS   = ['', 'm', 'aug', 'dim'];
  const TRIAD_LABELS = ['M', 'm', 'aug', 'dim'];
  const group = document.getElementById('me-triad-group');
  if (!group) return;
  group.innerHTML = '';
  TRIAD_VALS.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_triad === val ? ' active' : '');
    btn.textContent = TRIAD_LABELS[i];
    btn.onclick = () => {
      me_triad = val;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => Math.max(0, TRIAD_VALS.indexOf(me_triad)), (i) => {
    me_triad = TRIAD_VALS[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meRenderSeventhBtns() {
  const SEVENTH_VALS   = ['', 'M7', '7', '6'];
  const SEVENTH_LABELS = ['-', 'M7', '7', '6'];
  const group = document.getElementById('me-seventh-group');
  if (!group) return;
  group.innerHTML = '';
  SEVENTH_VALS.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_seventh === val ? ' active' : '');
    btn.textContent = SEVENTH_LABELS[i];
    btn.onclick = () => {
      me_seventh = val;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => Math.max(0, SEVENTH_VALS.indexOf(me_seventh)), (i) => {
    me_seventh = SEVENTH_VALS[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meRenderFuncBtns() {
  const FUNC_VALS   = ['', 'sus4', 'add9', 'b5'];
  const FUNC_LABELS = ['-', 'sus4', 'add9', '(b5)'];
  const group = document.getElementById('me-func-group');
  if (!group) return;
  group.innerHTML = '';
  FUNC_VALS.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_func === val ? ' active' : '');
    btn.textContent = FUNC_LABELS[i];
    btn.onclick = () => {
      me_func = val;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => Math.max(0, FUNC_VALS.indexOf(me_func)), (i) => {
    me_func = FUNC_VALS[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meRenderTensionBtns() {
  const TENSION_VALS   = ['', 'b9', '9', '#9', '11', '#11', 'b13', '13'];
  const TENSION_LABELS = ['-', 'b9', '9', '#9', '11', '#11', 'b13', '13'];
  const group = document.getElementById('me-tension-group');
  if (!group) return;
  group.innerHTML = '';
  const curTension = me_tensions[0] ?? '';
  TENSION_VALS.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (curTension === val ? ' active' : '');
    btn.textContent = TENSION_LABELS[i];
    btn.onclick = () => {
      me_tensions = val ? [val] : [];
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => Math.max(0, TENSION_VALS.indexOf(curTension)), (i) => {
    me_tensions = TENSION_VALS[i] ? [TENSION_VALS[i]] : [];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meRenderBassBtns() {
  const roots = me_accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const vals   = ['', ...roots];
  const labels = ['-', ...roots];
  const group = document.getElementById('me-bass-group');
  if (!group) return;
  group.innerHTML = '';
  vals.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_bass === v ? ' active' : '');
    btn.textContent = labels[i];
    btn.onclick = () => {
      me_bass = v;
      group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      group._scrollToIdx?.(i, true);
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
  initWheelPicker(group, () => Math.max(0, vals.indexOf(me_bass)), (i) => {
    me_bass = vals[i];
    group.querySelectorAll('.sel-btn').forEach((b, j) => b.classList.toggle('active', j === i));
    meUpdateChordDisplay();
  });
}

function meGetChordFretArray() {
  const barreMap = buildBarreMap(me_dots, me_barre);
  const arr = [];
  for (let s = 5; s >= 0; s--) {
    if (me_openMute[s] === 'mute') { arr.push(null); continue; }
    const sd  = me_dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const bf  = barreMap[s];
    const toFret = f => (me_fretNumber - 2) + f;
    if (dot !== undefined && bf !== undefined) arr.push(toFret(Math.max(dot.f, bf)));
    else if (dot !== undefined)  arr.push(toFret(dot.f));
    else if (bf  !== undefined)  arr.push(toFret(bf));
    else arr.push(0);
  }
  return arr;
}

function meSuggestChordNames() {
  chordSuggester.options.spellingMode = me_accidental;
  return chordSuggester.suggest(meGetChordFretArray());
}

function meUpdateChordSuggestions() {
  const el = document.getElementById('me-chord-suggestions');
  if (!el) return;
  const names = meSuggestChordNames();
  el.innerHTML = names.map(n => `<span class="chord-suggest-item">${n}</span>`).join('');
}

function meUpdateChordDisplay() {
  const el = document.getElementById('me-chord-display');
  if (!el) return;
  let n = me_root + me_triad + me_seventh;
  if (me_func === 'b5') n += '<sup>(b5)</sup>';
  else if (me_func) n += me_func;
  if (me_tensions.length) n += '<sup>(' + me_tensions.join(',') + ')</sup>';
  if (me_bass) n += '/' + me_bass;
  el.innerHTML = n;
  meDraw();
}

let me_rootMode  = false;
let me_rootIndex = -1;

function meToggleRootMode() {
  me_rootMode = !me_rootMode;
  const btn = document.getElementById('me-btn-root');
  if (btn) btn.classList.toggle('active', me_rootMode);
  me_rootIndex = me_rootMode ? meCalcRootIndex() : -1;
  meDraw();
}

function meCalcRootIndex() {
  const dotMaxS  = me_dots.length ? Math.max(...me_dots.map(d => d.s)) : -1;
  const openMaxS = me_openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

function meToggleFingerNum() {
  me_fingerNumMode = !me_fingerNumMode;
  const btn = document.getElementById('me-btn-finger-num');
  const grp = document.getElementById('me-finger-group');
  if (btn) btn.classList.toggle('active', me_fingerNumMode);
  if (grp) grp.style.opacity = me_fingerNumMode ? '1' : '0.35';
  meDraw();
}

function meSelectFinger(n) {
  me_selectedFinger = n;
  document.querySelectorAll('#me-finger-group .finger-btn').forEach(b => b.classList.remove('selected'));
  const fb = document.getElementById('me-f' + n);
  if (fb) fb.classList.add('selected');
}

function meResetAll() {
  me_dots = []; me_barre = {}; me_openMute = new Array(STRINGS).fill('open');
  meDraw();
}

function meGetBarreFrets() {
  const count = {};
  me_dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[f] >= 2).map(Number);
}

let me_RATIO = 1;

function meResizeCanvas() {
  const inner = document.getElementById('me-canvas-inner');
  const cv = document.getElementById('me-canvas');
  if (!inner || !cv) return;
  const availW = inner.clientWidth || BASE_W;
  me_RATIO = availW / BASE_W;
  cv.width  = Math.round(BASE_W * me_RATIO);
  cv.height = Math.round(BASE_H * me_RATIO);
  meDraw();
}

function meDraw() {
  const cv = document.getElementById('me-canvas');
  if (!cv) return;
  const c = cv.getContext('2d');
  const data = {
    root: me_root, triad: me_triad, seventh: me_seventh, func: me_func,
    tensions: me_tensions, bass: me_bass, dots: me_dots, barre: me_barre,
    openMute: me_openMute, fingerNumMode: me_fingerNumMode,
    fretNumber: me_fretNumber
  };
  drawCanvas(c, me_RATIO, data);
  meUpdateBarreBtns();
  meUpdateChordSuggestions();
}

function meUpdateBarreBtns() {
  const container = document.getElementById('me-barre-btns');
  if (!container) return;
  container.innerHTML = '';

  const meTL = Math.round(BASE_OPEN_W * me_RATIO);
  const meTT = Math.round(BASE_PAD_T  * me_RATIO);
  const meTB = Math.round((BASE_PAD_T + BASE_FBH) * me_RATIO);
  const meTR = Math.round((BASE_OPEN_W + BASE_FBW) * me_RATIO);
  const meFW = (meTR - meTL) / FRETS;
  const meSH = (meTB - meTT) / (STRINGS - 1);
  const meDS = Math.round(meSH * 0.85);

  const meBtnSize = 48;
  const meContainerH = meBtnSize + 8;
  const container2 = document.getElementById('me-barre-btns');
  if (container2) {
    container2.style.width  = (document.getElementById('me-canvas-inner')?.clientWidth || 240) + 'px';
    container2.style.height = meContainerH + 'px';
  }
  meGetBarreFrets().forEach(f => {
    if (me_barre[f] === undefined) {
      const activeCount = Object.values(me_barre).filter(Boolean).length;
      me_barre[f] = activeCount < 2;
      if (me_barre[f]) meRemoveDotsUnderBarre(f);
    }
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const left = meTL + (f - 0.5) * meFW - 24;
    const top  = Math.round((meContainerH - meBtnSize) / 2);
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:48px;height:48px;
      border-radius:50%;border:none;
      background:${me_barre[f] ? '#242729' : '#ffffff'};
      color:${me_barre[f] ? '#fff' : '#888'};
      font-size:22px;font-family:'Pretendard',sans-serif;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
    btn.onclick = () => {
      if (!me_barre[f]) {
        const activeCount = Object.values(me_barre).filter(Boolean).length;
        if (activeCount >= 2) return;
        me_barre[f] = true;
        meRemoveDotsUnderBarre(f);
      } else {
        me_barre[f] = false;
      }
      meDraw();
    };
    container.appendChild(btn);
  });
}

function meCanvasClick(e) {
  const cv = document.getElementById('me-canvas');
  if (!cv) return;
  const meW  = Math.round(BASE_W * me_RATIO);
  const meCH = Math.round(BASE_H * me_RATIO);
  const meTL = Math.round(BASE_OPEN_W * me_RATIO);
  const meTT = Math.round(BASE_PAD_T  * me_RATIO);
  const meTB = Math.round((BASE_PAD_T + BASE_FBH) * me_RATIO);
  const meTR = Math.round((BASE_OPEN_W + BASE_FBW) * me_RATIO);
  const meFW = (meTR - meTL) / FRETS;
  const meSH = (meTB - meTT) / (STRINGS - 1);

  const rect = cv.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (meW / rect.width);
  const my = (e.clientY - rect.top)  * (meCH / rect.height);
  const si = Math.round((my - meTT) / meSH);
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= meTL - 50 && mx < meTL) {
    const hasDot = me_dots.some(d => d.s === si);
    if (hasDot) {
      me_dots = me_dots.filter(d => d.s !== si);
      me_openMute[si] = 'open';
    } else {
      me_openMute[si] = me_openMute[si] === 'mute' ? 'open' : 'mute';
    }
    if (me_rootMode) me_rootIndex = meCalcRootIndex();
    meDraw(); return;
  }

  if (mx < meTL || mx > meTR + 5) return;
  const fi = Math.floor((mx - meTL) / meFW) + 1;
  if (fi < 1 || fi > FRETS) return;

  // 바레로 커버된 줄은 해당 바레 프렛보다 낮은 곳에 dot 불가
  const meBarreMapCheck = buildBarreMap(me_dots, me_barre);
  if (meBarreMapCheck[si] !== undefined && fi < meBarreMapCheck[si]) return;

  const idx = me_dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    // 같은 위치 토글 오프: 해당 dot만 제거
    me_dots.splice(idx, 1);
    if (!me_dots.some(d => d.s === si)) me_openMute[si] = 'open';
  } else {
    const meBarreF = meBarreMapCheck[si];
    if (meBarreF !== undefined && fi > meBarreF) {
      me_dots = me_dots.filter(d => d.s !== si || d.f === meBarreF);
      me_dots.push({ s: si, f: fi, n: me_selectedFinger });
    } else {
      me_dots = me_dots.filter(d => d.s !== si);
      me_openMute[si] = 'open';
      me_dots.push({ s: si, f: fi, n: me_selectedFinger });
    }
  }
  if (me_rootMode) me_rootIndex = meCalcRootIndex();
  meDraw();
}

function saveEditModal() {
  if (!me_editingChord || !viewModalProjectId) return;
  const p = getProject(viewModalProjectId);
  if (!p) return;

  const idx = p.chords.findIndex(c => c.id === me_editingChord.id);
  if (idx === -1) return;

  const updated = {
    ...me_editingChord,
    name: buildChordName({ root: me_root, triad: me_triad, seventh: me_seventh, func: me_func, tensions: me_tensions, bass: me_bass }),
    root: me_root, triad: me_triad, seventh: me_seventh, func: me_func,
    tensions: [...me_tensions], bass: me_bass,
    dots: JSON.parse(JSON.stringify(me_dots)),
    barre: JSON.parse(JSON.stringify(me_barre)),
    openMute: [...me_openMute],
    fingerNumMode: me_fingerNumMode,
    fretNumber: me_fretNumber,
    accidental: me_accidental
  };

  p.chords[idx] = updated;
  p.updatedAt = Date.now();
  updateProject(p);

  closeModal('modal-edit');
  // 프로젝트 뷰가 user_project.html로 분리됨 — re-render 불필요
}

// ═══════════════════════════════════════════════════════════════
// 공유 기능
// ═══════════════════════════════════════════════════════════════

function encodeOpenMute(arr) {
  return arr.map(v => v === 'mute' ? 'm' : 'o').join('');
}
function decodeOpenMute(str) {
  return typeof str === 'string'
    ? str.split('').map(c => c === 'm' ? 'mute' : 'open')
    : str;
}
function toBase64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromBase64url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64 + '=='.slice(0, (4 - b64.length % 4) % 4))));
}

// deflate-raw 압축 → base64url (CompressionStream 미지원 시 무압축 fallback)
async function toBase64urlZ(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    const binary = Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch(e) {
    return toBase64url(str); // fallback
  }
}
// 압축 해제 (실패 시 무압축으로 재시도)
async function fromBase64urlZ(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch(e) {
    return fromBase64url(b64url); // fallback: 무압축 legacy
  }
}

// ── DB 기반 공유(신규): 프로젝트당 코드 1개 고정, payload는 projects 테이블에 저장.
// 공용 로직(코드 생성/조회, DB 미러링)은 shared.js에 있음(getOrCreateShareCode, _fetchSharedPayload).
// 오프라인 base64 URL 방식(구)은 하위호환으로 계속 지원 — DB 접근 실패 시에만 폴백.

function buildSharePayload(project) {
  const idToIdx = {};
  project.chords.forEach((c, i) => idToIdx[c.id] = i);
  const chords = project.chords.map((c, i) => ({
    i, name: c.name, root: c.root, triad: c.triad, seventh: c.seventh,
    func: c.func, tensions: c.tensions, bass: c.bass, accidental: c.accidental,
    dots: c.dots, openMute: encodeOpenMute(c.openMute),
    barre: c.barre, fretNumber: c.fretNumber, fingerNumMode: c.fingerNumMode
  }));
  const arr = project.arrangement.map(line =>
    (line.slots || new Array(8).fill(null))
      .map(id => id !== null && idToIdx[id] !== undefined ? idToIdx[id] : null)
  );
  return JSON.stringify({ v: 2, bpm: project.bpm ?? 120, capo: project.capo ?? 0,
                          col: project.colCount || 4, chords, arr });
}
async function generateShareCode(project) {
  return await toBase64urlZ(buildSharePayload(project));
}
async function parseShareCode(raw) {
  raw = raw.trim();
  // 신규 DB 방식: URL의 ?c= 파라미터
  if (raw.includes('?c=')) {
    try {
      const code = new URL(raw).searchParams.get('c');
      if (code) { const p = await _fetchSharedPayload(code); if (p) return p; }
    } catch (e) {}
  }
  // 신규 DB 방식: 16자 코드 그대로 붙여넣기 (DB에 없으면 아래 legacy 경로로 계속 시도)
  if (SHARE_CODE16_RE.test(raw)) {
    const p = await _fetchSharedPayload(raw);
    if (p) return p;
  }
  let b64;
  // legacy prefix 지원 (이전에 생성된 공유 코드 호환)
  if (raw.startsWith('chorditor:v2:')) b64 = raw.slice(13).trim();
  else if (raw.startsWith('chorditor:v1:')) {
    // v1: 무압축 legacy
    try {
      const payload = JSON.parse(fromBase64url(raw.slice(13).trim()));
      return payload.v === 1 ? payload : null;
    } catch(e) { return null; }
  }
  else if (raw.includes('?share=')) b64 = new URL(raw).searchParams.get('share');
  else b64 = raw.trim();
  if (!b64) return null;
  try {
    const json = await fromBase64urlZ(b64);
    const payload = JSON.parse(json);
    return (payload.v === 1 || payload.v === 2) ? payload : null;
  } catch(e) { return null; }
}

async function openShareModal(projectId) {
  const project = getProject(projectId);
  if (!project) return;
  const codeEl = document.getElementById('share-code-input');
  codeEl.value            = '코드 생성 중…';
  codeEl.dataset.full     = '';
  codeEl.dataset.shareUrl = '';
  codeEl.dataset.projectName = project.name || 'Chorditor';
  document.getElementById('modal-share').classList.remove('hidden');
  lucide.createIcons();

  // DB 방식(신규): 프로젝트당 코드 1개 고정 — 있으면 재사용(payload만 최신화), 없으면 새로 발급
  const payloadStr = buildSharePayload(project);
  const dbCode = await getOrCreateShareCode(project, payloadStr);
  if (dbCode) {
    if (project.shareCode !== dbCode) { project.shareCode = dbCode; updateProject(project); }
    codeEl.value = dbCode;
    codeEl.dataset.full = dbCode;
    codeEl.dataset.shareUrl = 'https://chorditor.github.io/Chorditor/share/?c=' + dbCode;
    return;
  }

  // DB 저장 실패(오프라인 등) 시에만 기존 base64 payload 코드로 폴백 (길 수 있어 표시만 축약)
  const code = await generateShareCode(project);
  const shorten = s => s.length > 30 ? s.slice(0, 20) + '…' + s.slice(-6) : s;
  codeEl.value        = shorten(code);
  codeEl.dataset.full = code;
  codeEl.dataset.shareUrl = 'https://chorditor.github.io/Chorditor/share/?share=' + code;
}
function _fallbackCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}
function _flashBtn(id, msg) {
  const btn = document.getElementById(id), orig = btn.textContent;
  btn.textContent = msg; setTimeout(() => btn.textContent = orig, 1500);
}
async function copyShareCode() {
  const el = document.getElementById('share-code-input');
  const val = el.dataset.full || el.value;
  if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => _fallbackCopy(val));
  else _fallbackCopy(val);
  _flashBtn('share-code-copy-btn', '복사됨!');
  incrementStat('shares');
  analytics.track('share_initiated', { type: 'code' });
}

let _pendingImportPayload = null;

function openImportModal(payload) {
  _pendingImportPayload = payload;
  document.getElementById('import-meta').textContent =
    `BPM ${payload.bpm} · Capo ${payload.capo} · ${payload.col}칸 · 코드 ${payload.chords.length}개 · ${payload.arr.length}줄`;
  const sel = document.getElementById('import-project-select');
  sel.innerHTML = '<option value="">노트 선택…</option>';
  loadProjects().forEach(p => {
    sel.appendChild(Object.assign(document.createElement('option'), { value: p.id, textContent: p.name }));
  });
  document.getElementById('import-new-name').value = '';
  document.getElementById('modal-import').classList.remove('hidden');
  lucide.createIcons();
}

function confirmImport(mode) {
  const payload = _pendingImportPayload; if (!payload) return;
  const opts = {
    applyBpm:  document.getElementById('import-apply-bpm').checked,
    applyCapo: document.getElementById('import-apply-capo').checked,
    applyCol:  document.getElementById('import-apply-col').checked,
  };
  let targetId;
  if (mode === 'new') {
    const name = document.getElementById('import-new-name').value.trim();
    if (!name) { alert('노트 이름을 입력하세요.'); return; }
    const p = { id: genId(), name, pinned: false, pinnedOrder: 0, important: false, importantOrder: 0, capo: 0, bpm: 120,
                colCount: 4, createdAt: Date.now(), updatedAt: Date.now(), chords: [], arrangement: [] };
    const list = loadProjects(); list.push(p); saveProjects(list); targetId = p.id;
  } else {
    targetId = document.getElementById('import-project-select').value;
    if (!targetId) { alert('노트를 선택하세요.'); return; }
  }
  applyImportPayload(targetId, payload, opts);
  closeModal('modal-import');
  analytics.track('import_completed', {
    chord_count: payload.chords?.length || 0,
    target: mode === 'new' ? 'new_project' : 'existing_project',
  });
  _pendingImportPayload = null;
  renderSidebar(); populateProjectSelect();
  openProject(targetId);
}

function applyImportPayload(projectId, payload, opts) {
  const p = getProject(projectId); if (!p) return;
  if (opts.applyBpm)  p.bpm      = payload.bpm;
  if (opts.applyCapo) p.capo     = payload.capo;
  if (opts.applyCol)  p.colCount = payload.col;
  const indexToNewId = {};
  payload.chords.forEach(pc => {
    const newId = genId(); indexToNewId[pc.i] = newId;
    p.chords.push({ id: newId, name: pc.name, root: pc.root, triad: pc.triad,
      seventh: pc.seventh, func: pc.func, tensions: pc.tensions, bass: pc.bass,
      accidental: pc.accidental, dots: pc.dots, openMute: decodeOpenMute(pc.openMute),
      barre: pc.barre, fretNumber: pc.fretNumber, fingerNumMode: pc.fingerNumMode });
  });
  payload.arr.forEach((slotRow, rowIdx) => {
    const slots = (slotRow || []).map(idx =>
      idx !== null && indexToNewId[idx] !== undefined ? indexToNewId[idx] : null);
    while (slots.length < 8) slots.push(null);
    if (rowIdx < p.arrangement.length) {
      // 기존 라인이 있으면 텍스트는 보존하고 슬롯만 덮어쓰기
      p.arrangement[rowIdx].slots = slots.slice(0, 8);
    } else {
      // 기존 라인보다 많으면 새 빈 라인 추가
      p.arrangement.push({ id: genId(), text: '', slots: slots.slice(0, 8) });
    }
  });
  p.updatedAt = Date.now(); updateProject(p);
}

function openPasteShareModal() {
  const modal = document.getElementById('modal-paste-share');
  modal.classList.remove('hidden');
  lucide.createIcons();
  setTimeout(() => {
    const input = document.getElementById('paste-share-input');
    if (input) input.focus();
  }, 100);
}

async function triggerManualImport() {
  const raw = document.getElementById('paste-share-input').value.trim();
  if (!raw) return;
  const payload = await parseShareCode(raw);
  if (!payload) { showTextToast('유효하지 않은 공유 코드입니다.'); return; }
  document.getElementById('paste-share-input').value = '';
  closeModal('modal-paste-share');
  openImportModal(payload);
}

// 공유 링크로 들어온 코드 처리 — 모달 없이 바로 새 노트 생성 후 그 페이지로 이동.
// shared.js의 window._handleShareImport(Android 딥링크)와 아래 ?share=/?c= URL 파라미터
// 처리 둘 다 세션스토리지에 저장만 해두고 여기서 소비함(로그인 전 도착해도 로그인 후 자동 처리).
async function _consumePendingShareCode() {
  const raw = sessionStorage.getItem(PENDING_SHARE_CODE_KEY);
  if (!raw) return;
  sessionStorage.removeItem(PENDING_SHARE_CODE_KEY);
  const payload = await parseShareCode(raw);
  if (!payload) { alert('공유 코드가 올바르지 않습니다.'); return; }
  const p = {
    id: genId(), name: '공유받은 노트', pinned: false, pinnedOrder: 0, important: false, importantOrder: 0,
    capo: 0, bpm: 120, colCount: 4, createdAt: Date.now(), updatedAt: Date.now(), chords: [], arrangement: [],
  };
  const list = loadProjects(); list.push(p); saveProjects(list);
  applyImportPayload(p.id, payload, { applyBpm: true, applyCapo: true, applyCol: true });
  location.href = 'user_project.html?id=' + p.id;
}

// ── OAuth 리다이렉트 후 처리 (웹 전용, shared.js에서 typeof 가드로 호출) ──
function onAuthSignedIn() {
  setTimeout(() => checkAndShowNotice(), 500);
}

// 웹: 로그인됐지만 persona 미입력이면 온보딩 필요 (true 반환)
async function _webNeedsOnboarding() {
  try {
    let token = null, userId = null;
    if (_supabase) {
      const { data } = await _supabase.auth.getSession();
      token  = data?.session?.access_token;
      userId = data?.session?.user?.id;
    }
    if (!token || !userId) return false; // 비로그인 → 온보딩 강제 안 함
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=persona`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) return false;
    const rows = await resp.json();
    return !(rows.length > 0 && rows[0].persona);
  } catch (_) { return false; }
}

// ═══════════════════════════════════════════════════════════════
// 초기화 (home.html 전용)
// ═══════════════════════════════════════════════════════════════
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.projects-item')) {
    document.querySelectorAll('.projects-item.show-actions')
      .forEach(el => el.classList.remove('show-actions'));
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // 리뷰 유도: 앱 실행 카운트 (성숙도 측정)
  if (typeof reviewRegisterLaunch === 'function') reviewRegisterLaunch();

  // ── UI 초기화 ──────────────────────────────────────────────
  // 배너 버전 표시
  const _prodVer = 'v' + APP_VERSION;
  const _bannerVer = document.getElementById('home-banner-version');
  if (_bannerVer) _bannerVer.textContent = _prodVer;
  if (typeof renderTutorialBody === 'function') renderTutorialBody();
  const _updateTitle = document.getElementById('tutorial-update-title');
  if (_updateTitle) _updateTitle.textContent = '최신 업데이트 소식';
  renderRootBtns();
  renderBassBtns();
  initStaticWheelPickers();
  updateChordDisplay(false); // 초기 렌더 = 비유저, chord_build 제외
  const _fnGroup = document.getElementById('finger-group');
  if (_fnGroup) _fnGroup.style.opacity = fingerNumMode ? '1' : '0.35';
  const _fd = document.getElementById('fret-number-display');
  if (_fd) _fd.textContent = String(currentFretNumber);
  setupOrientationListener();
  renderSidebar();
  populateProjectSelect();
  updateExportScaleOptions();
  renderPlanBadge();
  const _urlParams     = new URLSearchParams(location.search);
  const _initTab       = _urlParams.get('tab') || 'home';
  const _fromProject   = _urlParams.get('from_project');
  const _fromChordId   = _urlParams.get('chord_id');

  // user_project → 에디터 진입
  if (_fromProject && _urlParams.get('view') === 'editor') {
    _editorReturnProjectId = _fromProject;
    _editorEditingChordId  = _fromChordId || null;
    _isFromProject         = true;

    // 홈탭 + 에디터 뷰 바로 오픈
    switchTab('home', true);
    enterFromHome('editor', true);

    // 기존 코드 편집이면 state 복원
    if (_fromChordId) {
      const _projects = loadProjects();
      const _proj = _projects.find(p => p.id === _fromProject);
      const _chord = _proj?.chords?.find(c => c.id === _fromChordId);
      if (_chord) loadChordStateToEditor(_chord);
    }

    // "프로젝트 추가" 버튼 → "저장" 으로 변경 + "돌아가기" 버튼 추가
    const _addBtn = document.getElementById('btn-add-to-project');
    if (_addBtn) {
      _addBtn.textContent = '저장';
      _addBtn.classList.replace('btn-ghost', 'btn-primary');
      _addBtn.onclick = () => _addChordToProject(_fromProject);

      const _backBtn = document.createElement('button');
      _backBtn.className = 'btn btn-ghost';
      _backBtn.textContent = '돌아가기';
      _backBtn.onclick = () => _returnToProject(_fromProject);
      _addBtn.parentElement.insertBefore(_backBtn, _addBtn);
    }
  } else {
    switchTab(_initTab, _initTab !== 'home');
    // plan.html 복귀 시 서브뷰 복원 (에디터/라이브러리)
    const _initSubview = _urlParams.get('subview');
    if (_initSubview && _initSubview !== 'home') {
      enterFromHome(_initSubview, true);
    }
  }

  // 프로젝트 페이지에서 복귀 시 페이드인 (렌더링 버벅임 가림)
  if (_urlParams.get('return') === '1') {
    const _shell = document.querySelector('.app-shell');
    if (_shell) _shell.classList.add('home-return-enter');
  }

  lucide.createIcons();
  initAppVersion();

  // ── 페이지 커버 제거 ───────────────────────────────────────────
  // return=1(프로젝트 복귀) 케이스는 home-return-enter가 처리하므로 커버 즉시 제거
  // 그 외: 한 프레임 후 fade-out (초기화가 완전히 페인트된 뒤 cover 걷어냄)
  {
    const _cover = document.getElementById('page-cover');
    if (_cover) {
      if (_urlParams.get('return') === '1') {
        _cover.style.display = 'none'; // 즉시 제거, home-return-enter 애니메이션이 대신 처리
      } else {
        requestAnimationFrame(() => {
          _cover.classList.add('cover-out');
          setTimeout(() => { _cover.style.display = 'none'; }, 200);
        });
      }
    }
  }

  // 홈 모멘텀 스크롤 + 탑페이드
  const _homeView    = document.getElementById('view-home');
  const _mainContent = document.querySelector('.main-content');

  function initMomentumScroll(el) {
    let startY     = 0;
    let lastY      = 0;
    let lastTime   = 0;
    let velocityY  = 0; // px/ms
    let isDragging = false;
    let rafId      = null;

    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

    function cancelAnim() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      setScrolling(false, 0); // 애니메이션 취소 시 즉시 잠금 해제
    }

    el.addEventListener('touchstart', e => {
      cancelAnim();
      startY     = e.touches[0].clientY;
      lastY      = startY;
      lastTime   = Date.now();
      velocityY  = 0;
      isDragging = true;
    }, { passive: true });

    el.addEventListener('touchmove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const y   = e.touches[0].clientY;
      const now = Date.now();
      const dt  = now - lastTime;
      const dy  = lastY - y;
      if (dt > 0) velocityY = dy / dt;
      if (Math.abs(dy) > 2) setScrolling(true); // Layer 2: 드래그 중 잠금
      el.scrollTop += dy;
      lastY    = y;
      lastTime = now;
    }, { passive: false });

    el.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const speed = Math.abs(velocityY);
      if (speed < 0.05) { setScrolling(false); return; }
      setScrolling(true); // Layer 2: 모멘텀 중 잠금
      const duration       = Math.min(speed * 600, 1000);
      const distance       = velocityY * duration * 0.35;
      const startScrollTop = el.scrollTop;
      const startTime      = performance.now();
      function animate(now) {
        const t = Math.min((now - startTime) / duration, 1);
        el.scrollTop = startScrollTop + distance * easeOutQuint(t);
        if (t < 1) { rafId = requestAnimationFrame(animate); return; }
        setScrolling(false, 80); // 모멘텀 종료 후 80ms 유예
      }
      rafId = requestAnimationFrame(animate);
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
      isDragging = false;
      cancelAnim();
    }, { passive: true });
  }

  if (_homeView) initMomentumScroll(_homeView);

  // 새 프로젝트 모달 Enter 키
  document.getElementById('create-project-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmCreateProject(); });

  // URL share 파라미터 처리 (구: ?share=<base64 payload>, 신: ?c=<DB 16자 코드>)
  // 여기서 바로 파싱하지 않고 저장만 함 — 로그인 안 된 상태면 곧 onboarding.html로
  // 리다이렉트될 수 있어서, 그 전에 파싱해봤자 결과가 버려짐. _consumePendingShareCode가 나중에 처리.
  const _shareUrlParams = new URLSearchParams(location.search);
  const shareParam = _shareUrlParams.get('share') || _shareUrlParams.get('c');
  if (shareParam) {
    history.replaceState(null, '', location.pathname);
    sessionStorage.setItem(PENDING_SHARE_CODE_KEY, shareParam);
  }

  await initBilling();

  // ── DEV 빌드: 인증 체크 없이 바로 진입 ──────────────────────
  if (APP_VERSION.includes('_dev')) {
    initSupabase().catch(() => {});
    if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
    _consumePendingShareCode();
    setTimeout(() => checkAndShowNotice(), 800);
    return;
  }

  // ── Android: localStorage 세션 유효성 확인 ───────────────────
  if (window.Capacitor?.isNativePlatform()) {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) { window.location.replace('onboarding.html'); return; }
    try {
      const session = JSON.parse(stored);
      const now = Math.floor(Date.now() / 1000);
      // 만료 5분 유예 (네트워크 지연 대비)
      if (!session.user || (session.expires_at && session.expires_at < now - 300)) {
        window.location.replace('onboarding.html'); return;
      }
      _authReady = true;
      analytics.setUserId(session.user.id);
      analytics.track('app_open', { platform: 'android', project_count: loadProjects().length });
      if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
      analytics.setScreen('home');
      analytics.track('screen_view', { view: 'home' }); // 홈 화면 진입 명시 기록
      syncProjectsOnLogin().catch(() => {}); // 재설치 등 DB 백업 복구 + 로컬 전용 업로드
      _consumePendingShareCode();
      loadProfileFromDB();
      _billingReady.then(async () => {
        if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
        await syncPlanFromBilling();
        fetchPlanWithToken(session.access_token).catch(() => {});
      }).catch(() => {});
    } catch(e) { window.location.replace('onboarding.html'); return; }
    initSupabase().catch(() => {});
    setTimeout(() => checkAndShowNotice(), 500);
    return;
  }

  // ── 웹: Supabase 세션 복원 ───────────────────────────────────
  await initSupabase();
  // 신규 유저(persona 미입력)가 OAuth 후 home으로 직행한 경우 → 온보딩으로 유도
  // (Supabase redirect 허용목록/Site URL 폴백으로 redirectTo가 무시될 수 있어 안전망)
  if (await _webNeedsOnboarding()) { window.location.replace('onboarding.html'); return; }
  // 비로그인 첫 방문자 → 온보딩(로그인+페르소나)으로 유도. 카카오톡 등 인앱브라우저
  // 외부전환 로직도 onboarding.html에만 있으므로 여기서 보내야 함.
  // 단 OAuth 콜백(토큰이 URL에 옴)·공유링크(?share=)는 home에서 처리해야 하므로 제외.
  if (!_authReady) {
    // shareParam은 위에서 replaceState로 이미 URL에서 제거되므로 캡처된 변수로 판정
    const _hasOAuth = /access_token|[?&]code=/.test(location.hash + location.search);
    if (!_hasOAuth && !shareParam) { window.location.replace('onboarding.html'); return; }
  }
  analytics.track('app_open', { platform: 'web', project_count: loadProjects().length });
  if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
  analytics.setScreen('home');
  analytics.track('screen_view', { view: 'home' }); // 홈 화면 진입 명시 기록
  syncProjectsOnLogin().catch(() => {}); // 재설치 등 DB 백업 복구 + 로컬 전용 업로드
  _consumePendingShareCode();
  setTimeout(() => checkAndShowNotice(), 1000);
});

// ═══════════════════════════════════════════════════════════════
// 코드 라이브러리
// ═══════════════════════════════════════════════════════════════
let _libRoot        = 'C';
let _libEntry       = null;
let _libFingerMode  = true;
let _libFingeringIdx = 0;  // 현재 선택된 운지 인덱스
let _libCanvas      = null;
let _libCtx         = null;
let _libCurrentIdx  = -1;
let _voicingModalChord = null; // 현재 보이싱 모달에 표시 중인 코드명 (sharp 기준)
const _LIB_DPR        = Math.min(window.devicePixelRatio || 1, 4); // 최대 4x 캡
const LIB_VIEWER_W    = Math.ceil(320 * _LIB_DPR); // CSS 320px × DPR
const LIB_VIEWER_RATIO = LIB_VIEWER_W / BASE_W;
const LIB_MINI_W      = Math.ceil(56 * _LIB_DPR);  // CSS 56px × DPR
const LIB_MINI_RATIO   = LIB_MINI_W / BASE_W;

function openLibrary()  { navigateTo('library'); }
function closeLibrary() { navigateTo('editor');  }

function renderLibRootTabs() {
  const roots   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const flatMap  = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
  const useFlat  = accidental === 'flat';
  const container = document.getElementById('lib-root-tabs');
  if (!container) return;
  container.innerHTML = roots.map(r => {
    // 샵/플랫 모드에 따라 하나의 이름만 표시
    const label = useFlat ? (flatMap[r] || r) : r;
    return `<button class="lib-root-item${r === _libRoot ? ' active' : ''}"
                    onclick="selectLibRoot('${r}')">${label}</button>`;
  }).join('');
}

function selectLibRoot(root) {
  _playTap();
  closeVoicingModal();
  _libRoot = root;
  analytics.track('lib_tab_changed', { root_tab: root });
  renderLibRootTabs();
  renderLibCards(root);
}

function renderLibCards(root) {
  const entries   = (window.chordsLibrary || {})[root] || [];
  const container = document.getElementById('lib-cards');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="lib-empty">등록된 코드 없음</div>';
    return;
  }

  // 코드명 기준 그룹화: sharpName → 해당 그룹의 엔트리 인덱스 배열
  const useFlat = accidental === 'flat';
  const groups  = new Map(); // sharpName → [idx, ...]
  entries.forEach((e, i) => {
    if (!groups.has(e.name)) groups.set(e.name, []);
    groups.get(e.name).push(i);
  });

  // 현재 선택 엔트리가 속한 그룹명
  const activeGroupName = _libEntry ? _libEntry.name : null;

  const reps = []; // 대표 엔트리 목록 (순서 유지)
  let html   = '';
  let gi     = 0;
  for (const [sharpName, idxList] of groups) {
    const rep      = entries[idxList[0]];
    const dispName = useFlat ? rep.flatName : rep.name;
    const isActive = sharpName === activeGroupName;
    const multi    = idxList.length > 1;
    html += `<div class="lib-card${isActive ? ' active' : ''}${multi ? ' lib-card-multi' : ''}"
                  onclick="onLibCardClick(event,'${sharpName.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
               <canvas class="lib-card-canvas" data-gidx="${gi}"
                       width="${LIB_MINI_W}"
                       height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
               ${multi ? `<div class="lib-card-badge">${idxList.length}</div>` : ''}
             </div>`;
    reps.push(rep);
    gi++;
  }
  container.innerHTML = html;

  // 미니 캔버스 렌더
  reps.forEach((rep, i) => {
    const c = container.querySelectorAll('.lib-card-canvas')[i];
    if (c) _drawLibCanvas(c, LIB_MINI_RATIO, rep, '');
  });
}

function selectLibEntry(idx, { silent = false } = {}) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  _libEntry = entries[idx];
  if (!_libEntry) return;
  _libCurrentIdx = idx;
  _libFingeringIdx = 0;

  if (!silent) {
    analytics.track('lib_chord_selected', {
      chord_name: _libEntry.name,
      root:       _libRoot,
    });
  }

  _ensureLibCanvas();
  drawLibViewerCanvas();
  _updateFingeringNav();
  renderLibCards(_libRoot);          // 메인 그리드 선택 상태 재렌더
  _updateVoicingGridActive(idx);     // 모달 그리드 active 상태 갱신
}

function _ensureLibCanvas() {
  if (!_libCanvas) {
    _libCanvas = document.getElementById('lib-canvas');
    if (_libCanvas) {
      _libCanvas.width  = LIB_VIEWER_W;
      _libCanvas.height = Math.round(BASE_H * LIB_VIEWER_RATIO);
      _libCtx = _libCanvas.getContext('2d');
    }
  }
}

function drawLibViewerCanvas() {
  _ensureLibCanvas();
  if (!_libCanvas || !_libEntry) return;
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  _drawLibCanvas(_libCanvas, LIB_VIEWER_RATIO, _libEntry, dispName, _libFingeringIdx);
}

// 공통 캔버스 렌더 (viewer / mini card 공용)
// fingeringIdx: 사용할 운지 인덱스 (미지정 시 0 = 대표 운지)
function _drawLibCanvas(canvas, ratio, entry, nameOverride, fingeringIdx = 0, transparent = false) {
  // 코드 캔버스 드로잉은 voicing-canvas.js 모듈(VoicingCanvas)로 일원화.
  // 프렛 정규화·바레·도트·프렛번호·손가락번호·코드명 모두 모듈이 처리.
  VoicingCanvas.draw(canvas, {
    frets:      entry.frets,
    openMute:   entry.openMute,
    barre:      entry.barres?.[fingeringIdx] ?? entry.barres?.[0] ?? entry.barre ?? {},
    barreRange: entry.barreRanges?.[fingeringIdx] ?? entry.barreRanges?.[0] ?? entry.barreRange ?? null,
    fretNumber: entry.fretNumber,
    source:     entry.source,   // ★ 누락 시 모듈이 static 취급 → offset/라벨 어긋남
    fingering:  entry.fingerings?.[fingeringIdx] ?? entry.fingerings?.[0] ?? entry.fingering,
  }, {
    chordName:     nameOverride,
    fingerNumMode: _libFingerMode,
    ratio,
    transparent,
  });
}

// 운지 내비게이션
function _updateFingeringNav() {
  const total = _libEntry?.fingerings?.length ?? 1;
  const nav   = document.getElementById('lib-fingering-nav');
  if (!nav) return;
  nav.style.display = total > 1 ? 'flex' : 'none';
  const label = nav.querySelector('.lib-fingering-label');
  if (label) label.textContent = `${_libFingeringIdx + 1} / ${total}`;
}

function prevLibFingering() {
  const total = _libEntry?.fingerings?.length ?? 1;
  _libFingeringIdx = (_libFingeringIdx - 1 + total) % total;
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_fingering_changed', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name, to_idx: _libFingeringIdx, total });
}

function nextLibFingering() {
  const total = _libEntry?.fingerings?.length ?? 1;
  _libFingeringIdx = (_libFingeringIdx + 1) % total;
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_fingering_changed', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name, to_idx: _libFingeringIdx, total });
}

// ── 보이싱 피커 모달 ────────────────────────────────────────────

// 카드 그리드 클릭 진입점
// - 보이싱 1개 → 직접 선택
// - 보이싱 복수 → 탭 애니메이션 후 모달 열기
function onLibCardClick(event, sharpName) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  const idxList = entries.reduce((acc, e, i) => (e.name === sharpName ? [...acc, i] : acc), []);
  if (!idxList.length) return;

  if (idxList.length === 1) {
    _playTap(); // 더 펼칠 보이싱 없음 → 바로 선택(vibe)
    selectLibEntry(idxList[0]);
    return;
  }

  // 탭 피드백 애니메이션
  const cardEl = event.currentTarget;
  cardEl.classList.add('lib-card-clicked');
  setTimeout(() => cardEl.classList.remove('lib-card-clicked'), 300);

  _playSfx('page.mp3'); // 1차 그리드 펼침(보이싱 모달)
  openVoicingModal(sharpName, cardEl);
}

// 보이싱 모달 열기
function openVoicingModal(sharpName, cardEl) {
  const modal   = document.getElementById('lib-voicing-modal');
  const overlay = document.getElementById('lib-voicing-overlay');
  if (!modal) return;

  // 클릭 카드 중심을 transform-origin으로 설정 (lib-bottom 기준 좌표)
  const bottomEl = document.querySelector('.lib-bottom');
  if (bottomEl && cardEl) {
    const br = bottomEl.getBoundingClientRect();
    const cr = cardEl.getBoundingClientRect();
    const ox = cr.left + cr.width  / 2 - br.left;
    const oy = cr.top  + cr.height / 2 - br.top;
    modal.style.transformOrigin = `${ox}px ${oy}px`;
  }

  _voicingModalChord = sharpName;
  _renderVoicingGrid(sharpName);

  overlay?.classList.add('open');
  // 두 프레임 지연으로 transition 확실히 발동
  requestAnimationFrame(() => requestAnimationFrame(() => {
    modal.classList.add('open');
  }));
}

// 보이싱 모달 닫기
function closeVoicingModal() {
  document.getElementById('lib-voicing-modal')?.classList.remove('open');
  document.getElementById('lib-voicing-overlay')?.classList.remove('open');
  _voicingModalChord = null;
}

// 모달 내 보이싱 그리드 렌더링
function _renderVoicingGrid(sharpName) {
  const grid = document.getElementById('lib-voicing-grid');
  if (!grid) return;
  const allEntries = (window.chordsLibrary || {})[_libRoot] || [];
  const useFlat    = accidental === 'flat';
  const filtered   = allEntries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.name === sharpName);

  grid.innerHTML = filtered.map(({ e, i }) => {
    const dispName = useFlat ? e.flatName : e.name;
    return `<div class="lib-card${_libEntry === e ? ' active' : ''}"
                 onclick="event.stopPropagation(); _playTap(); selectLibEntry(${i});">
               <canvas class="lib-card-canvas" data-vidx="${i}"
                       width="${LIB_MINI_W}"
                       height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
             </div>`;
  }).join('');

  filtered.forEach(({ e, i }) => {
    const c = grid.querySelector(`[data-vidx="${i}"]`);
    if (c) _drawLibCanvas(c, LIB_MINI_RATIO, e, '');
  });
}

// 보이싱 모달이 열려있을 때 선택된 카드 active 상태만 갱신
function _updateVoicingGridActive(selectedIdx) {
  const grid = document.getElementById('lib-voicing-grid');
  if (!grid) return;
  grid.querySelectorAll('.lib-card').forEach(el => {
    const canvas = el.querySelector('.lib-card-canvas');
    if (!canvas) return;
    el.classList.toggle('active', parseInt(canvas.dataset.vidx, 10) === selectedIdx);
  });
}

function setLibAccidental(type) {
  // 전역 accidental 변경 (에디터와 공유)
  setAccidental(type);
  // 라이브러리 내 샵/플랫 버튼 active 동기화
  document.getElementById('lib-acc-sharp')?.classList.toggle('active', type === 'sharp');
  document.getElementById('lib-acc-flat')?.classList.toggle('active', type === 'flat');
  // 근음 목록 + 카드 이름 재렌더
  renderLibRootTabs();
  renderLibCards(_libRoot);
  // 보이싱 모달이 열려있으면 모달 내 코드명도 재렌더
  if (_voicingModalChord) _renderVoicingGrid(_voicingModalChord);
  // 뷰어 캔버스 코드명 재렌더
  drawLibViewerCanvas();
}

function toggleLibFingerNum() {
  _playTap();
  _libFingerMode = !_libFingerMode;
  const btn = document.getElementById('lib-finger-btn');
  if (btn) btn.classList.toggle('active', _libFingerMode);
  drawLibViewerCanvas();
  // 미니 카드도 재렌더
  if (_libEntry) renderLibCards(_libRoot);
  analytics.track('lib_finger_num_toggled', { active: _libFingerMode });
}

function libPlayChord() {
  if (!_libEntry) return;
  const useFlat = accidental === 'flat';
  analytics.track('lib_chord_played', { chord_name: useFlat ? _libEntry.flatName : _libEntry.name });
  playChord({ dots: _libEntry.frets.map((f, s) => f !== null && f > 0 ? {s, f} : null).filter(Boolean), openMute: _libEntry.openMute });
}

function libSaveImage() {
  if (!_libEntry) return;
  openImgSaveModal('library');
}

// 검색 매칭: 근음은 대소문자 무시, quality는 대소문자 구분
function _libMatch(name, q) {
  // 쿼리가 근음([A-G][#b]?)으로 시작하면 분리 매칭
  const m = q.match(/^([A-Ga-g][#b]?)(.*)/);
  if (!m) return name.includes(q); // 근음 없이 quality만 입력 → 전체 대소문자 구분 검색
  const qRoot   = m[1][0].toUpperCase() + m[1].slice(1); // 근음 첫 글자만 대문자 정규화
  const qSuffix = m[2];                                   // quality 부분 (대소문자 구분)
  const nm = name.match(/^([A-G][#b]?)(.*)/);
  if (!nm) return false;
  return nm[1] === qRoot && nm[2].includes(qSuffix);
}

let _libSearchResults = [];

function onLibSearch(query) {
  closeVoicingModal();
  const q = (query || '').trim();
  if (!q) { _libSearchResults = []; return; }

  const lib = window.chordsLibrary || {};
  _libSearchResults = [];
  for (const root of Object.keys(lib)) {
    for (const entry of lib[root]) {
      if (_libMatch(entry.name, q) || _libMatch(entry.flatName, q)) {
        _libSearchResults.push(entry);
      }
    }
  }
}

function showLibSearchModal() {
  const modal = document.getElementById('lib-search-modal');
  const container = document.getElementById('lib-search-cards');
  const titleEl = document.getElementById('lib-search-modal-title');
  if (!modal || !container) return;

  // 모달 상단 위치: lib-action-bar 상단에서 시작
  const actionBar = document.querySelector('#view-library .lib-action-bar');
  if (actionBar) {
    const top = actionBar.offsetTop;
    modal.style.top = top + 'px';
    modal.style.height = '';  // CSS calc 대신 top으로 제어
  }

  const q = (document.getElementById('lib-search')?.value || '').trim();
  if (q) analytics.track('lib_searched', { query: q, result_count: _libSearchResults.length });
  titleEl.textContent = _libSearchResults.length
    ? `"${q}" 검색 결과 ${_libSearchResults.length}건`
    : `"${q}" 검색 결과 없음`;

  if (!_libSearchResults.length) {
    container.innerHTML = '<div class="lib-empty">검색 결과 없음</div>';
  } else {
    const useFlat = accidental === 'flat';
    container.innerHTML = _libSearchResults.map((entry, i) => {
      const dispName = useFlat ? entry.flatName : entry.name;
      return `<div class="lib-card${_libEntry === entry ? ' active' : ''}"
                   onclick="selectLibSearchResult(${i})">
                <canvas class="lib-card-canvas" data-sidx="${i}"
                        width="${LIB_MINI_W}"
                        height="${Math.round(BASE_H * LIB_MINI_RATIO)}"></canvas>
                <div class="lib-card-name">${dispName}</div>
              </div>`;
    }).join('');
    _libSearchResults.forEach((entry, i) => {
      const c = container.querySelector(`[data-sidx="${i}"]`);
      if (c) _drawLibCanvas(c, LIB_MINI_RATIO, entry, '');
    });
  }

  modal.classList.add('open');
}

function closeLibSearchModal() {
  const modal = document.getElementById('lib-search-modal');
  if (modal) modal.classList.remove('open');
  const input = document.getElementById('lib-search');
  if (input) { input.value = ''; _libSearchResults = []; }
}

function selectLibSearchResult(idx) {
  const entry = _libSearchResults[idx];
  if (!entry) return;
  _libEntry = entry;
  _libCurrentIdx = idx;
  _libFingeringIdx = 0;
  _ensureLibCanvas();
  drawLibViewerCanvas();
  _updateFingeringNav();
  const useFlat = accidental === 'flat';
  analytics.track('lib_search_result_selected', { chord_name: useFlat ? entry.flatName : entry.name });
  // 모달 active 상태 갱신
  const container = document.getElementById('lib-search-cards');
  container?.querySelectorAll('.lib-card').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}

// 라이브러리 저장 버튼 → showScaleDropdown 으로 진입
async function _doExportLibChordImage(scale, transparent = false) {
  if (!_libEntry) return;

  await refreshPlanFromDB();
  if (!canUseScale(scale)) { closeImgSaveModal(); openPlanSheet('image_scale'); return; }

  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? _libEntry.flatName : _libEntry.name;
  const fileName = dispName.replace(/\//g, '_') + '_chord.png';

  const exp = document.createElement('canvas');
  exp.width  = Math.round(EXPORT_BASE_W * scale);
  exp.height = Math.round(EXPORT_BASE_H * scale);
  _drawLibCanvas(exp, EXPORT_BASE_W / BASE_W * scale, _libEntry, dispName, 0, transparent);

  const base64 = exp.toDataURL('image/png').split(',')[1];

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const SaveImage = window.Capacitor.Plugins.SaveImage;
      await SaveImage.saveToGallery({ base64, fileName: fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') });
      showSaveToast();
      incrementStat('images');
      analytics.track('lib_image_saved', { chord_name: dispName, scale, success: true });
    } catch (e) { console.error('저장 실패:', e); analytics.track('lib_image_saved', { chord_name: dispName, scale, success: false }); }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    incrementStat('images');
    analytics.track('lib_image_saved', { chord_name: dispName, scale, success: true });
  }
}

function importLibChordToProject() {
  if (!_libEntry) return;
  _playTap();
  const entry    = _libEntry;
  const useFlat  = accidental === 'flat';
  const dispName = useFlat ? entry.flatName : entry.name;

  // 에디터 상태에 라이브러리 코드 로드
  // 에디터는 "슬롯2 = fretNumber" 모델 → fretOffset = currentFretNumber - 2
  //  pattern: 라벨 r+1 → offset r-1 / static: 라벨 r → offset r-2 / 라벨 최소 2
  const _r         = entry.fretNumber ?? 0;
  const _isPat     = entry.source === 'pattern';
  currentFretNumber = Math.max(2, _isPat ? _r + 1 : _r);
  const fretOffset = currentFretNumber - 2;

  const activeFingering = (entry.fingerings?.[_libFingeringIdx]) ?? entry.fingerings?.[0] ?? entry.fingering;

  dots = entry.frets
    .map((f, s) => (f !== null && f > 0)
      ? { s, f: f - fretOffset, n: _libFingerMode ? (typeof activeFingering?.[s] === 'number' ? activeFingering[s] : 0) : 0 }
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

  fingerNumMode = _libFingerMode;
  const fnBtn = document.getElementById('btn-finger-num');
  if (fnBtn) fnBtn.classList.toggle('active', fingerNumMode);

  // 코드명 전체 파싱: 근음 → 3화음 → 7음 → 기능 → 텐션 → 분수
  // parseChordNameToComponents가 모든 구성요소를 한 번에 추출
  const comp = parseChordNameToComponents(dispName)
    || { root: 'C', bass: '', triad: '', seventh: '', func: '', tension: '' };
  selectedRoot = comp.root;
  selectedBass = comp.bass || '';

  analytics.track('lib_chord_imported', { chord_name: dispName });
  navigateTo('editor', null, { skipResize: true });
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
