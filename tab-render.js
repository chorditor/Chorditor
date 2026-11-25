// ───────────────────────────────────────────────────────────
// tab-render.js — 타브악보 그리기 공용 부품 (2026-11-20, 여정 노드20에서 시작 — 앞으로 계속 씀)
//
//   디자인 = Guitar Pro 타브(사용자 스크린샷 2026-11-20): 가로줄 6개(맨 위 = 1번줄), 맨 앞 세로 'TAB', 마디선, 줄 위 숫자(숫자 자리만 선이 끊김),
//     해머링·풀링오프 = 두 숫자를 잇는 곡선 + 위에 H / P, 슬라이드 = 두 숫자 사이 사선 + 곡선 + 위에 sl.
//   설명용이라 그리지 않는 것(사용자 지정): 마디 번호 · BPM · 튜닝 · 박자표. 리듬(음표 기둥·들보·꼬리·점·붙임줄)은 스크린샷처럼 그림(사용자 지정 2026-11-20 — 처음엔 빼자고 했다가 되돌림)
//     measures[].rhythm이 있으면 줄 아래에 리듬, 가로 위치도 박자 칸으로(긴 음표일수록 조금 넓게 — 너무 벌어지지 않게)
//   크기는 상수로 박지 않음(사용자 지정) — 받은 폭과 마디 수로 그때그때 계산: 마디 폭 = (전체 폭 − TAB 칸) ÷ 마디 수, 줄 간격 = 폭에서 계산(하한·상한만 있음)
//
//   TabRender.svg(measures, opt) → SVG 문자열
//     measures = [{ notes: [{ s, f, t?, g? }], marks: [{ type: 'h'|'p'|'sl', a, b }], rhythm?: [{ n | tie, d }] }]  — t(0~1) = 리듬이 없을 때 마디 안 가로 위치(없으면 고르게), a·b = 이을 음 번호, rhythm은 아래 rhythm() 주석
//       tie = 앞 마디 마지막 음에서 붙임줄로 이어지는 음(2026-11-24 여정 D3) — 숫자를 괄호로, 앞 음 숫자에서 이 숫자까지 곡선(같은 그림 안에 앞 마디가 있을 때만)
//       g = 꾸밈음(2026-11-23, 사용자 Guitar Pro 스크린샷): 박자 칸 없이 다음 음 바로 왼쪽에 작은 숫자. rhythm에 넣지 않음(리듬 줄에도 안 그림). H·P 곡선은 그대로 이어 줌
//     opt = { width(필수, px), gap(줄 간격 px — 없으면 폭에서 계산), end(true면 끝 겹세로줄), strNums(true면 'TAB' 대신 줄 번호 1~6), headBoth(true면 TAB·줄 번호 둘 다 — 보이는 쪽은 노드 CSS),
//             bare(true면 줄·마디선·TAB 없이 숫자·기호·리듬만 — 주법 정리 에셋, 2026-11-23), stem(bare일 때 숫자 아래 리듬 기둥 길이, 줄 간격 배수 — 기본 1.6) }
//   상태 표시는 클래스로(style.css '타브악보' 절): 숫자 .tab-n[data-m][data-i] / 기호 .tab-mk[data-m][data-k] / 줄 .tab-line[data-s]
//     피킹 기호 .tab-pick[data-m][data-k(리듬 칸 번호)]도 .is-on · .is-ok
//     .is-on(파랑) · .is-ok(정답색) · .is-ng(오답색) · 기호는 .tab-mk--hide(안 보임)로 숨겼다가 띄울 수 있음(opt.hideMarks)
// ───────────────────────────────────────────────────────────
const TabRender = (function () {
  'use strict';
  const LABEL = { h: 'H', p: 'P', sl: 'sl.' };
  function isTrip(r) { return Math.abs(r.d - 2 / 3) < 1e-6; }   // 8분음표 셋잇단(한 박에 세 음)

  function svg(measures, opt) {
    const W = opt.bare ? opt.width : Math.max(120, opt.width);
    const gap = opt.gap || Math.max(9, Math.min(14, W / 34));   // 줄 간격 — 폭 360px에서 약 10.6px
    const fs = Math.max(11, gap * 1.15);                          // 숫자 글자 크기(스타일 가이드 하한 11px)
    const headW = opt.bare ? gap * 0.4 : gap * 2.4;               // 맨 앞 TAB(또는 줄 번호) 칸 — bare는 없음
    const top = gap * 2.6;                                        // 위 = 기호(H·P·sl.)와 곡선 자리
    const staffH = gap * 5;
    const hasRh = measures.some(function (ms) { return ms.rhythm && ms.rhythm.length; });
    const lowY = Math.max.apply(null, measures.map(function (ms) { return Math.max.apply(null, ms.notes.map(function (n) { return top + (n.s - 1) * gap; })); }));
    const beamY = opt.bare ? lowY + fs * 0.6 + gap * (opt.stem || 1.6) : top + staffH + gap * 2.8;   // 리듬(기둥·들보)의 아래 끝 — 줄 아래(bare는 가장 낮은 숫자 바로 아래)
    const hasPick = measures.some(function (ms) { return (ms.rhythm || []).some(function (r) { return r.p; }); });
    const hasTrip = measures.some(function (ms) { return (ms.rhythm || []).some(isTrip); });
    const H = hasRh ? beamY + gap * (hasPick ? 2.6 : 0.8) + (hasTrip ? gap * 1.1 : 0) : (opt.bare ? lowY + fs : top + staffH + gap * 1.2);
    const mw = (W - headW - 2) / measures.length;
    const lineY = function (s) { return top + (s - 1) * gap; };
    let out = '<svg class="tab-svg" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    // 줄
    if (!opt.bare) for (let s = 1; s <= 6; s++) out += '<line class="tab-line" data-s="' + s + '" x1="1" x2="' + (W - 1) + '" y1="' + lineY(s) + '" y2="' + lineY(s) + '"/>';
    // 마디선(맨 앞 + 마디 끝마다) + 끝 겹세로줄
    if (!opt.bare) out += '<line class="tab-bar" x1="1" x2="1" y1="' + top + '" y2="' + (top + staffH) + '"/>';
    for (let m = 1; m <= measures.length && !opt.bare; m++) {
      const x = headW + mw * m;
      if (m === measures.length && opt.end) {
        out += '<line class="tab-bar" x1="' + (x - gap * 0.5) + '" x2="' + (x - gap * 0.5) + '" y1="' + top + '" y2="' + (top + staffH) + '"/>';
        out += '<rect class="tab-bar-end" x="' + (x - gap * 0.3) + '" y="' + top + '" width="' + (gap * 0.3) + '" height="' + staffH + '"/>';
      } else out += '<line class="tab-bar" x1="' + (x - 1) + '" x2="' + (x - 1) + '" y1="' + top + '" y2="' + (top + staffH) + '"/>';
    }
    // 맨 앞: TAB(세로) 또는 줄 번호
    if (opt.bare) { /* 맨 앞 표시 없음 */ }
    else {
      // headBoth = TAB과 줄 번호를 둘 다 그림(노드가 CSS로 서로 바꿔 보여 줌 — D3 강의 TAB ↔ 줄 번호 애니메이션, 2026-11-24)
      if (opt.strNums || opt.headBoth) for (let s = 1; s <= 6; s++) out += '<text class="tab-sn" data-s="' + s + '" x="' + (headW * 0.45) + '" y="' + lineY(s) + '" font-size="' + (fs * 0.9) + '">' + s + '</text>';
      if (!opt.strNums || opt.headBoth) ['T', 'A', 'B'].forEach(function (ch, i) {
        out += '<text class="tab-head" x="' + (headW * 0.45) + '" y="' + (top + staffH * (0.2 + i * 0.3)) + '" font-size="' + (gap * 1.5) + '">' + ch + '</text>';
      });
    }
    // 마디마다 숫자·기호
    let prevEnd = null;   // 앞 마디 마지막 음 { x, s } — 다음 마디 첫 음의 붙임줄(tie) 시작점
    measures.forEach(function (ms, m) {
      const x0 = headW + mw * m, n = ms.notes.length;
      const pad = Math.min(mw * 0.16, gap * 2.2);
      let xs, rx = [];
      if (ms.rhythm && ms.rhythm.length) {
        // 리듬이 있으면 가로 위치 = 박자 칸(Guitar Pro처럼 긴 음표일수록 넓지만 길이에 비례하지는 않음 — 칸 폭 1 + 0.5·log2(8분음표 수))
        const wt = function (d) { return 1 + 0.5 * Math.log2(d); };
        const tot = ms.rhythm.reduce(function (a, r) { return a + wt(r.d); }, 0);
        let acc = 0;
        rx = ms.rhythm.map(function (r) { const x = x0 + pad + (mw - 2 * pad) * acc / tot; acc += wt(r.d); return x; });
        xs = ms.notes.map(function (nt, i) { const k = ms.rhythm.findIndex(function (r) { return r.n === i; }); return rx[Math.max(0, k)]; });
      } else {
        xs = ms.notes.map(function (nt, i) {
          const t = typeof nt.t === 'number' ? nt.t : (n === 1 ? 0.5 : i / (n - 1));
          return x0 + pad + (mw - 2 * pad) * t;
        });
      }
      // 꾸밈음 — 다음 음 바로 왼쪽(작은 숫자 폭 + 조금 띄움)
      const gfs = fs * 0.72;
      for (let i = n - 2; i >= 0; i--) if (ms.notes[i].g) xs[i] = xs[i + 1] - (String(ms.notes[i + 1].f).length * fs * 0.31 + String(ms.notes[i].f).length * gfs * 0.31 + fs * 0.35);
      const nfs = function (nt) { return nt.g ? gfs : fs; };
      if (opt.bare && n) {   // bare(정리 에셋) — 음들을 마디 가운데로(박자 칸 배치는 왼쪽부터라 한쪽으로 쏠림)
        const d = x0 + mw / 2 - (xs[0] + xs[n - 1]) / 2;
        xs = xs.map(function (x) { return x + d; });
        rx = rx.map(function (x) { return x + d; });
      }
      const lab = function (nt) { return nt.tie ? '(' + nt.f + ')' : String(nt.f); };
      const tw = function (nt) { return lab(nt).length * nfs(nt) * 0.62 + nfs(nt) * 0.3; };   // 숫자 뒤 흰 바탕 폭(선을 끊는 자리)
      // 기호 먼저(숫자가 위에 오게)
      (ms.marks || []).forEach(function (mk, k) {
        const a = ms.notes[mk.a], b = ms.notes[mk.b];
        const xa = xs[mk.a], xb = xs[mk.b], ya = lineY(a.s), yb = lineY(b.s);
        const yTop = Math.min(ya, yb) - fs * 0.62;               // 곡선 양 끝(숫자 바로 위)
        const lift = Math.min(gap * 1.1, (xb - xa) * 0.25);
        const cls = 'tab-mk' + (opt.hideMarks ? ' tab-mk--hide' : '');
        let g = '<g class="' + cls + '" data-m="' + m + '" data-k="' + k + '">';
        g += '<path class="tab-arc" d="M' + (xa + fs * 0.15) + ' ' + yTop + ' Q' + ((xa + xb) / 2) + ' ' + (yTop - lift * 2) + ' ' + (xb - fs * 0.15) + ' ' + yTop + '"/>';
        if (mk.type === 'sl') {   // 사선: 올라가면 왼쪽 아래 → 오른쪽 위, 내려가면 반대
          const up = b.f > a.f, dy = fs * 0.28;
          g += '<line class="tab-sl" x1="' + (xa + tw(a) / 2) + '" y1="' + (ya + (up ? dy : -dy)) + '" x2="' + (xb - tw(b) / 2) + '" y2="' + (yb + (up ? -dy : dy)) + '"/>';
        }
        g += '<text class="tab-lb" x="' + ((xa + xb) / 2) + '" y="' + (yTop - lift - gap * 0.55) + '" font-size="' + (fs * 0.92) + '">' + LABEL[mk.type] + '</text>';
        out += g + '</g>';
      });
      if (rx.length) out += rhythm(ms, rx, xs, lineY, fs, gap, beamY, m, hasTrip);
      ms.notes.forEach(function (nt, i) {
        const y = lineY(nt.s), w = tw(nt), f2 = nfs(nt);
        if (nt.tie && i === 0 && prevEnd) {   // 붙임줄 — 앞 마디 마지막 숫자 오른쪽 위 → 이 숫자 왼쪽 위
          const yt = y - fs * 0.55, xa = prevEnd.x + fs * 0.45, xb = xs[i] - w / 2;
          out += '<g class="tab-rh"><path class="tab-tie" d="M' + xa + ' ' + yt + ' Q' + ((xa + xb) / 2) + ' ' + (yt - gap * 1.1) + ' ' + xb + ' ' + yt + '"/></g>';
        }
        out += '<g class="tab-n' + (nt.g ? ' tab-n--grace' : '') + '" data-m="' + m + '" data-i="' + i + '">' +
          (opt.bare ? '' : '<rect class="tab-n-bg" x="' + (xs[i] - w / 2) + '" y="' + (y - f2 * 0.55) + '" width="' + w + '" height="' + (f2 * 1.1) + '"/>') +
          '<text x="' + xs[i] + '" y="' + y + '" font-size="' + f2 + '">' + lab(nt) + '</text></g>';
      });
      prevEnd = n ? { x: xs[n - 1], s: ms.notes[n - 1].s } : null;
    });
    return out + '</svg>';
  }

  // 리듬 — 줄 아래 음표 기둥·들보(Guitar Pro 타브 리듬 표시, 사용자 스크린샷 2026-11-20).
  //  rhythm = [{ n(음 번호 — 붙임줄로 이어진 음이면 없음), tie(이어지는 앞 음 번호), d(길이: 8분음표 수 — 1 = 8분, 2 = 4분, 4 = 2분, 6 = 점2분) }]
  //  8분음표 = 숫자 아래부터 내려온 기둥 + 같은 박(4분음표 하나) 안의 8분음표끼리 들보로 묶음(혼자면 꼬리), 4분음표 = 기둥만,
  //  온음표(8) = 기둥 없음, 2분음표 이상 = 아래쪽 짧은 기둥(숫자 없는 붙임줄 음도 같음), 점음표(6) = 기둥 옆 점. 붙임줄 = 앞 음 숫자 오른쪽 위의 작은 곡선
  //  p('D'|'U', 2026-11-24 여정 D3) = 들보 아래 피킹 기호 — 다운 ㄇ · 업 V(여정 D9 rhythm-basics.js 아이콘과 같은 도형)
  //  d = 0.5(16분음표 — 들보 두 줄), d = 2/3(8분음표 셋잇단 — 들보 한 줄 + 들보 아래 작은 '3', 이때 피킹 기호는 그 아래로) — 2026-11-24 여정 D10·D11
  function rhythm(ms, rx, xs, lineY, fs, gap, beamY, m, hasTrip) {
    let g = '<g class="tab-rh">';
    const bh = gap * 0.42, shortTop = beamY - gap * 1.2;
    let acc = 0;
    const beat = ms.rhythm.map(function (r) { const b = Math.floor(acc / 2 + 1e-6); acc += r.d; return b; });   // 1e-6 = 셋잇단(2/3) 누적 오차
    ms.rhythm.forEach(function (r, k) {
      const x = rx[k];
      const y0 = r.n != null ? lineY(ms.notes[r.n].s) + fs * 0.6 : shortTop;
      if (r.d <= 2) g += '<line class="tab-stem" x1="' + x + '" x2="' + x + '" y1="' + y0 + '" y2="' + beamY + '"/>';
      else if (r.d < 8) g += '<line class="tab-stem" x1="' + x + '" x2="' + x + '" y1="' + shortTop + '" y2="' + beamY + '"/>';
      if (r.d === 6 || r.d === 3) g += '<circle class="tab-dot" cx="' + (x + gap * 0.55) + '" cy="' + (beamY - gap * 0.3) + '" r="' + (gap * 0.17) + '"/>';
      if (r.tie != null) {   // 붙임줄 — 앞 음 숫자 오른쪽 위에서 이 자리까지
        const yt = lineY(ms.notes[r.tie].s) - fs * 0.55, xa = xs[r.tie] + fs * 0.45, xb = x - gap * 0.2;
        g += '<path class="tab-tie" d="M' + xa + ' ' + yt + ' Q' + ((xa + xb) / 2) + ' ' + (yt - gap * 0.9) + ' ' + xb + ' ' + yt + '"/>';
      }
      if (r.d < 2) {   // 8분음표(16분·셋잇단 포함) — 같은 박의 이웃과 들보, 혼자면 꼬리
        const mate = function (j) { return ms.rhythm[j] && ms.rhythm[j].d < 2 && beat[j] === beat[k]; };
        if (mate(k + 1)) {
          g += '<rect class="tab-beam" x="' + (x - 0.6) + '" y="' + (beamY - bh) + '" width="' + (rx[k + 1] - x + 1.2) + '" height="' + bh + '"/>';
          if (r.d === 0.5 && ms.rhythm[k + 1].d === 0.5) g += '<rect class="tab-beam" x="' + (x - 0.6) + '" y="' + (beamY - bh * 2.6) + '" width="' + (rx[k + 1] - x + 1.2) + '" height="' + bh + '"/>';   // 16분음표 = 두 번째 들보
        } else if (!mate(k - 1)) g += '<path class="tab-flag" d="M' + x + ' ' + beamY + ' q' + (gap * 0.5) + ' ' + (-gap * 0.3) + ' ' + (gap * 0.7) + ' ' + (-gap * 1.1) + '"/>';
      }
      if (isTrip(r) && !(k > 0 && isTrip(ms.rhythm[k - 1]) && beat[k - 1] === beat[k])) {   // 셋잇단 묶음의 첫 음 — 묶음 가운데 아래에 '3'
        let e = k;
        while (ms.rhythm[e + 1] && isTrip(ms.rhythm[e + 1]) && beat[e + 1] === beat[k]) e++;
        g += '<text class="tab-tup" x="' + ((x + rx[e]) / 2) + '" y="' + (beamY + gap * 0.75) + '" font-size="' + (fs * 0.8) + '">3</text>';
      }
    });
    ms.rhythm.forEach(function (r, k) {
      if (!r.p) return;
      const sz = gap * 1.1, x = rx[k] - sz / 2, y = beamY + gap * (hasTrip ? 1.6 : 0.5), sc = sz / 24;
      g += '<g class="tab-pick" data-m="' + m + '" data-k="' + k + '" transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' + (r.p === 'D'
        ? '<path d="M5 20V5h14v15" fill="none" stroke-width="2.4" stroke-linejoin="round"/><rect x="5" y="4" width="14" height="4"/>'
        : '<path d="M5 4l7 16 7-16" fill="none" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>') + '</g>';
    });
    return g + '</g>';
  }

  return { svg: svg };
})();
