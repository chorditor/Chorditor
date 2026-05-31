// ═══════════════════════════════════════════════════════════════
// voicing-canvas.js — 코드 운지(보이싱) 캔버스 드로잉 모듈
// ---------------------------------------------------------------
// 코드 사전 페이지의 드로잉 규칙을 그대로 함수화한 재사용 모듈.
// 향후 어느 페이지에서든 아래처럼 간단히 호출:
//
//   <script src="voicing-canvas.js"></script>
//   VoicingCanvas.draw(canvasEl, voicing, { chordName: 'C', ratio: 1 });
//
// voicing 객체 (chordsLibrary 엔트리 호환):
//   {
//     frets:      [6현~1현 프렛번호 배열, null=뮤트, 0=개방],
//     openMute:   ['mute'|null|...] (생략 시 frets===null → 'mute' 자동),
//     barre:      { [프렛]: true } (바레 위치),
//     barreRange: { min, max } (바레 줄 범위, 선택),
//     fretNumber: 슬롯1의 실제 프렛 번호 (r),
//     source:     'pattern' | 'static' (기본 static)
//   }
//
// options:
//   chordName     : 좌상단에 표기할 코드명 (선택)
//   ratio         : canvas px / BASE_W. 미지정 시 canvas.width 기준 자동 산출.
//   fingerNumMode : true → 도트에 손가락 번호 표시 (voicing.fingering 필요)
//   transparent   : true → 흰 배경 채우지 않고 투명 유지 (기본 false=흰색)
// ═══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  const STRINGS     = 6;
  const FRETS       = 4;
  const BASE_PAD_L  = 35;
  const BASE_OPEN_W = 70;   // 개방현 영역 너비 (home.js·코드사전과 동일)
  const BASE_FBW    = 240;
  const BASE_FBH    = 192;
  const BASE_PAD_R  = 95;
  const BASE_PAD_T  = 80;
  const BASE_PAD_B  = 80;
  const BASE_W = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R; // 440
  const BASE_H = BASE_PAD_T + BASE_FBH + BASE_PAD_B;               // 352

  // 메인 드로잉 함수
  // draw(canvas, voicing, { chordName, ratio })
  function draw(canvas, voicing, options) {
    const opts      = options || {};
    const chordName = opts.chordName != null ? opts.chordName : null;
    const ratio     = opts.ratio    != null ? opts.ratio
                    : (canvas.width ? canvas.width / BASE_W : 1);

    const w  = Math.round(BASE_W * ratio);
    const ch = Math.round(BASE_H * ratio);
    canvas.width  = w;
    canvas.height = ch;
    const c = canvas.getContext('2d');

    const tl = Math.round((BASE_PAD_L + BASE_OPEN_W) * ratio);
    const tr = Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * ratio);
    const tt = Math.round(BASE_PAD_T * ratio);
    const tb = Math.round((BASE_PAD_T + BASE_FBH) * ratio);
    const fw = (tr - tl) / FRETS;
    const sh = (tb - tt) / (STRINGS - 1);
    const ds = Math.round(sh * 0.95);
    const sc = w / BASE_W;

    c.clearRect(0, 0, w, ch);
    // 배경: 기본 흰색 / opts.transparent === true 면 투명 유지
    if (opts.transparent !== true) {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, ch);
    }

    // 너트
    const nutW  = Math.max(1, Math.round(9 * sc));
    const lineW = Math.max(1, 3 * sc);
    c.fillStyle = '#242729';
    c.fillRect(tl - nutW, tt - lineW / 2, nutW, (tb - tt) + lineW);

    // 프렛선
    c.strokeStyle = '#242729';
    c.lineWidth   = Math.max(1, 3 * sc);
    c.lineCap     = 'butt';
    for (let f = 0; f <= FRETS; f++) {
      const x = tl + f * fw;
      c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
    }

    // 줄선
    for (let s = 0; s < STRINGS; s++) {
      const y = tt + s * sh;
      c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
    }

    if (!voicing) return;

    // 프랫 정규화
    const rawFrets       = voicing.frets;
    const displayFretNum = voicing.fretNumber ?? 0;  // r = 슬롯1 프렛
    const isPattern      = voicing.source === 'pattern';
    // 도트 offset — source로만 결정 (패턴·정적 철저 분리)
    //  pattern: 항상 r-1 → 셀 r,r+1,r+2,r+3 = 슬롯1~4 (token r+k → 슬롯 k+1)
    //           r=0 이면 offset=-1, r=1 이면 0 (clamp 금지: clamp 시 dot 밀림)
    //  static : r>=2 → r-2 (입력 그대로 — dot/프렛번호 직접 지정), 그 외 0
    const offset = isPattern
      ? displayFretNum - 1
      : (displayFretNum >= 2 ? displayFretNum - 2 : 0);
    const frets      = offset ? rawFrets.map(f => f === null ? null : (f === 0 ? 0 : f - offset)) : rawFrets;
    const rawBarre   = voicing.barre || {};
    const barre      = offset
      ? Object.fromEntries(Object.keys(rawBarre).map(k => [+k - offset, true]))
      : rawBarre;
    const openMute   = voicing.openMute || rawFrets.map(f => f === null ? 'mute' : null);
    const barreRange = voicing.barreRange;

    // 바레 커버 계산
    const barreCount = {};
    frets.forEach(f => { if (f !== null && f > 0) barreCount[f] = (barreCount[f] || 0) + 1; });
    const coveredByBarre = new Set();
    Object.keys(barreCount).filter(fk => barreCount[+fk] >= 2 && barre[+fk]).forEach(fk => {
      const f    = +fk;
      const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
      const minS = barreRange ? barreRange.min : Math.min(...idxs);
      const maxS = barreRange ? barreRange.max : Math.max(...idxs);
      for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
    });

    // 개방/뮤트
    openMute.forEach((v, s) => {
      if (frets[s] !== null && frets[s] > 0) return;
      if (v !== 'mute' && coveredByBarre.has(s)) return;
      const y = tt + s * sh;
      const x = tl - Math.round(BASE_OPEN_W / 2 * sc);
      if (v === 'mute') {
        const half = ds * 0.38;
        c.save();
        c.strokeStyle = '#242729';
        c.lineWidth   = Math.round(ds * 0.18);
        c.lineCap     = 'round';
        c.beginPath(); c.moveTo(x - half, y - half); c.lineTo(x + half, y + half); c.stroke();
        c.beginPath(); c.moveTo(x + half, y - half); c.lineTo(x - half, y + half); c.stroke();
        c.restore();
      } else if (frets[s] === 0) {
        c.save();
        c.strokeStyle = '#242729';
        c.lineWidth   = Math.max(1, ds * 0.15);
        c.beginPath(); c.arc(x, y, ds * 0.45, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
    });

    // 바레
    const barreFrets = [];
    Object.keys(barreCount).filter(fk => barreCount[+fk] >= 2).map(Number).forEach(f => {
      if (!barre[f]) return;
      const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
      const minS = barreRange ? barreRange.min : Math.min(...idxs);
      const maxS = barreRange ? barreRange.max : Math.max(...idxs);
      if (maxS <= minS) return;
      barreFrets.push(f);
      const cx   = tl + (f - 0.5) * fw;
      const topY = tt + minS * sh;
      const botY = tt + maxS * sh;
      const r    = ds / 2;
      c.save();
      c.fillStyle = '#242729';
      c.beginPath();
      c.arc(cx, topY, r, Math.PI, 0);
      c.lineTo(cx + r, botY);
      c.arc(cx, botY, r, 0, Math.PI);
      c.lineTo(cx - r, topY);
      c.closePath();
      c.fill();
      c.restore();
    });

    // 도트 (옵션: 손가락 번호 표시)
    const fingerNumMode = opts.fingerNumMode === true;
    const fingering     = voicing.fingering || null;
    frets.forEach((f, s) => {
      if (f === null || f === 0) return;
      if (barre[f] && barreFrets.includes(f)) return;
      const cx = tl + (f - 0.5) * fw;
      const cy = tt + s * sh;
      const r  = ds / 2;
      c.save();
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = '#242729';
      c.fill();
      if (fingerNumMode) {
        const n      = typeof fingering?.[s] === 'number' ? fingering[s] : 0;
        const numStr = n === 0 ? 'T' : String(n);
        const fontSize = Math.round(r * 1.35);
        c.fillStyle    = '#ffffff';
        c.font         = `400 ${fontSize}px "Pretendard", sans-serif`;
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        c.fillText(numStr, cx, cy + fontSize * 0.05);
      }
      c.restore();
    });

    // 프렛 번호 라벨 — 슬롯2(프랫보드 2번째 프렛) 위치 고정
    //  pattern: 항상 표시 / 값 = max(2, r+1)
    //  static : 입력 그대로 — r>=2일 때만 r 표시
    const showLabel = isPattern ? true : (displayFretNum >= 2);
    if (showLabel) {
      const labelFret = isPattern ? Math.max(2, displayFretNum + 1) : displayFretNum;
      c.save();
      c.font         = `500 ${Math.round(28 * sc)}px "Pretendard", sans-serif`;
      c.fillStyle    = '#666';
      c.textAlign    = 'center';
      c.textBaseline = 'top';
      c.fillText(String(labelFret), tl + 1.5 * fw, tb + Math.round(28 * sc));
      c.restore();
    }

    // 코드명 — 텐션(괄호)·베이스(슬래시) 위첨자 분리 렌더
    if (chordName) {
      const bSize = Math.round(48 * sc);
      const sSize = Math.round(30 * sc);
      const bY    = tt - Math.round(30 * sc);
      const sY    = bY - Math.round(14 * sc);
      c.save();
      c.fillStyle    = '#242729';
      c.textAlign    = 'left';
      c.textBaseline = 'alphabetic';

      let nBase = chordName, nTension = '', nBass = '';
      const slashIdx = nBase.lastIndexOf('/');
      if (slashIdx !== -1) { nBass = nBase.slice(slashIdx); nBase = nBase.slice(0, slashIdx); }
      const parenIdx = nBase.indexOf('(');
      if (parenIdx !== -1) { nTension = nBase.slice(parenIdx); nBase = nBase.slice(0, parenIdx); }

      let cx = tl;
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText(nBase, cx, bY);
      cx += c.measureText(nBase).width;
      if (nTension) {
        c.font = `500 ${sSize}px "Pretendard", sans-serif`;
        c.fillText(nTension, cx, sY);
        cx += c.measureText(nTension).width;
      }
      if (nBass) {
        c.font = `500 ${bSize}px "Pretendard", sans-serif`;
        c.fillText(nBass, cx, bY);
      }
      c.restore();
    }
  }

  const api = { draw, BASE_W, BASE_H, FRETS, STRINGS };

  // 전역 노출 + CommonJS 호환
  global.VoicingCanvas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
