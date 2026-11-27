// ───────────────────────────────────────────────────────────
// 여정 노드: 도미넌트7 코드 (코드반주 D14 — 반주 코스의 마지막 강의, D15부터는 솔로잉)
//   기획(사용자 지정 2026-11-17): 코드 중 가장 중요한 코드 하나 = 도미넌트7. 생성 원리(다이어토닉 5도 코드에 한 음 더 = b7)를 설명하고
//   쉽게 잡을 수 있는 여섯 코드 C7·D7·E7·G7·A7·B7을 익힌다. 각 코드에서 어느 음이 b7인지 강조(퀴즈 ② b7 찾기)
//   흐름: D13 다이어토닉 격자(같은 부품 .lec-grid) → 5도 G에 F를 쌓아 G7 → F#이 아닌 F = b7 → 5도에만 7을 붙인 다이어토닉
//         → 이미 아는 코드에서 바꿔 잡기(사용자 선택 2026-11-17: G→G7 · C→C7 · D→D7 · E→E7 · A→A7, B7은 처음 보는 모양) + 코드마다 b7 점 → 정리
//   운지(사용자 지정): C7 x32310(x3241x) / D7 xx0212(xxx213) / E7 020100(x2x1xx — 사전 기본 운지는 5번줄 3번이라 다름) / G7 320001(32xxx1) / A7 x02020(xx2x3x) / B7 x21202(x213x4)
//   b7 칸: 점 글자를 손가락 번호 → 도수(1·3·5·b7)로 통째로 바꿈(손가락 번호와 도수를 섞지 않음 — 가이드 §4-31, 사용자 지정 2026-11-17).
//   강조는 점 자체를 칠함(§4-27): b7 점이 파랑, 개방현 b7(E7 4번줄·A7 3번줄)은 캔버스 O를 빼고 그 자리 점을 파랑으로
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const FADE_MS = J.FADE_MS, SPREAD_MS = 500;

  // ── 코드 데이터 — 기초 9가지(앞 노드와 같은 운지) + 도미넌트7 여섯 코드. 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄
  function pick(name) {   // 사전은 근음별 목록. 같은 이름의 static·2프렛 운지 중 첫째(B7은 패턴형 x2120x가 먼저라 static으로 거름)
    const root = name.charAt(0);
    return window.chordsLibrary[root].filter(function (e) { return e.name === name && e.source === 'static' && e.slotFret === 2; })[0];
  }
  function mk(name, fing) {
    const e = pick(name);
    const f = fing || e.fingerings[0];
    const nums = f.filter(function (x) { return x; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort();   // 바레(같은 손가락 여러 줄)는 한 번만
    return { name: e.name, entry: e, frets: e.frets, fing: f, order: nums };
  }
  let CHORDS = null;
  function chords() {
    if (!CHORDS) CHORDS = { E: mk('E'), A: mk('A', [null, 4, 3, 2, null, null]), D: mk('D', [1, 3, 2, null, null, null]),
      C: mk('C', [null, 1, null, 2, 3, null]), G: mk('G', [4, null, null, null, 2, 3]), F: mk('F', [1, 1, 2, 3, null, null]),
      Am: mk('Am'), Dm: mk('Dm'), Em: mk('Em'),   // 기초 9가지 — D11과 같은 운지
      C7: mk('C7', [null, 1, 4, 2, 3, null]), D7: mk('D7', [3, 1, 2, null, null, null]), E7: mk('E7', [null, null, 1, null, 2, null]),
      G7: mk('G7', [1, null, null, null, 2, 3]), A7: mk('A7', [null, 3, null, 2, null, null]), B7: mk('B7', [4, null, 3, 1, 2, null]) };   // 사용자 지정 운지
    return CHORDS;
  }
  const SEVENS = ['C7', 'D7', 'E7', 'G7', 'A7', 'B7'];
  // 솔로연주 비기너 D20(사용자 지정 2026-11-24): 다이어토닉(D21)보다 먼저 옴 → 원리는 D19 트라이어드 건반(C코드 1·3·5음)을 이어받아 C7로,
  //  기타 칸은 C7부터, 다이어토닉 칸·퀴즈 ③은 뺌. 코드반주(D14)는 그대로
  const SOLO = /[?&]course=soloing/.test(location.search);
  const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function b7Str(c) {   // b7음이 있는 줄(0 = 1번줄) — 근음에서 10반음. 여섯 코드 모두 한 줄뿐
    const r = ROOT_PC[c.name.charAt(0)];
    for (let s = 0; s < 6; s++) { const f = c.frets[s]; if (f != null && ((OPEN_MIDI[s] + f - r) % 12 + 12) % 12 === 10) return s; }
    return -1;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄, 바레면 첫 줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }
  function fingerSpan(c, n) {   // n번 손가락이 덮는 줄 범위 [첫 줄, 끝 줄] — 바레가 아니면 둘이 같음(D8과 같음)
    const a = fingerIdx(c, n);
    let b = a;
    for (let s = a + 1; s < 6; s++) if (c.fing[s] === n && c.frets[s]) b = s;
    return [a, b];
  }

  // ── 소리 ──
  function strokeMidis(c) { return [5, 4, 3, 2, 1, 0].filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; }); }   // 6→1번줄, X 뺌
  function ring(id) { J.strum(strokeMidis(chords()[id]), J.audioT0(), 2.2, 1.0); }
  // 다이어토닉 격자·퀴즈 ③ 진행 소리 — 오픈 보이싱(줄 6→1, -1 = 안 침). 열쇠 = C key 이름(5도는 G7). D key는 같은 도수 자리(A7 등)
  const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
  function fretsToMidis(frets) { const out = []; frets.forEach(function (f, i) { if (f >= 0) out.push(OPEN_STRINGS[i] + f); }); return out; }
  const VOICINGS = {
    C: [-1, 3, 2, 0, 1, 0], Dm: [-1, -1, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0], F: [1, 3, 3, 2, 1, 1],
    G: [3, 2, 0, 0, 0, 3], G7: [3, 2, 0, 0, 0, 1], Am: [-1, 0, 2, 2, 1, 0], Bdim: [-1, 2, 3, 4, 3, -1],
  };
  const VOICINGS_D = {
    C: [-1, -1, 0, 2, 3, 2], Dm: [0, 2, 2, 0, 0, 0], Em: [2, 4, 4, 2, 2, 2], F: [3, 2, 0, 0, 0, 3],
    G7: [-1, 0, 2, 0, 2, 0], Am: [-1, 2, 4, 4, 3, 2], Bdim: [-1, 4, 5, 6, 5, -1],
  };

  // ── 다이어토닉 격자(D13과 같은 부품 .lec-grid — 코드명 → 번호 → 음 4줄. 4번째 줄은 5도 열에만 F) ──
  const C_NAMES = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'];
  const ROMANS = ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VIIdim'];
  const ROWS = { 1: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 2: ['E', 'F', 'G', 'A', 'B', 'C', 'D'], 3: ['G', 'A', 'B', 'C', 'D', 'E', 'F'] };
  function romanHtml(r) { const m = /^([IV]+)(.*)$/.exec(r); return m[1] + (m[2] ? '<span class="lec-rq">' + m[2] + '</span>' : ''); }
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function grid() { return $('lec-grid'); }
  function cols() { return q('#lec-grid .lec-col'); }
  function rowOf(row) { return q('#lec-grid .lec-note[data-row="' + row + '"]'); }
  function notes3() { return rowOf(1).concat(rowOf(2), rowOf(3)); }
  function nums() { return q('#lec-grid .lec-num'); }
  function names() { return q('#lec-grid .lec-name'); }
  function colNotes(i) { return [1, 2, 3, 4].map(function (r) { return rowOf(r)[i]; }); }
  function hot(i) {
    const g = grid();
    if (!g) return;
    g.classList.toggle('is-playing', i >= 0);
    cols().forEach(function (c, j) { c.classList.toggle('is-hot', j === i); });
  }
  function setCls(els, c, on) { els.forEach(function (el) { if (el) [].concat(c).forEach(function (x) { el.classList.toggle(x, on); }); }); }
  // D13 마지막 모습(이름·로마숫자 진하게, 음은 줄어들고 옅게) — 바로 그림(칸을 다시 볼 때도 같은 시작 화면)
  function gridFull() {
    const nm = names(), ns = nums();
    nm.forEach(function (el, i) { el.textContent = C_NAMES[i]; });
    ns.forEach(function (el, i) { el.innerHTML = romanHtml(ROMANS[i]); });
    [1, 2, 3].forEach(function (r) { rowOf(r).forEach(function (el, i) { el.textContent = ROWS[r][i]; }); });
    rowOf(4).forEach(function (el, i) { el.textContent = i === 4 ? 'F' : ' '; });
    grid().classList.add('is-spread');
    grid().classList.remove('is-count');
    setCls(nm.concat(ns, notes3(), rowOf(4)), ['is-focus', 'is-dim', 'is-faint'], false);
    setCls(rowOf(4), 'is-in', false);
    setCls(notes3(), 'is-dim', true);
    return fx(nm.concat(ns, notes3()), 'is-in', true);
  }
  // 다이어토닉 소리 — C Dm Em F G(7) Am Bdim + 첫 코드 한 번 더(D13과 같은 빠르기). five = 5도 자리 보이싱
  function playDia(five) {
    const t0 = J.audioT0(), lead = J.leadMs(), SLOT = 750, seq = C_NAMES.map(function (c, i) { return i === 4 ? five : c; });
    for (let k = 0; k < 8; k++) {
      const i = k % 7;
      J.strum(fretsToMidis(VOICINGS[seq[i]]), t0 + k * SLOT / 1000, k === 7 ? 1.7 : 0.72, k === 7 ? 1.0 : 0.4);
      later(function () { hot(i); }, lead + k * SLOT);
    }
    later(function () { hot(-1); }, lead + 8 * SLOT + 400);
    return wait(lead + 8 * SLOT + 400 + FADE_MS);
  }

  // ── 다이어그램(D7과 같은 도구) — 캔버스 3장 겹침 + 손가락 점 4개(DOM) + 개방현 b7 점 하나(DOM, .n12-open) ──
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48, ox: 70 };   // voicing-canvas.js 기준 치수(440×352), ox = 개방현 O 자리
  const DIAG = { t: { cv: 'n14-ct', wrap: 'n14-cwt', dots: 'n14-dtt', id: null, noOpen: -1 } };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = 160;
  function dw() { const sw = stageW(), B = VoicingCanvas; return Math.max(100, Math.min(sw * B.BASE_W / (2 * HALF_SPAN), DZ_H * B.BASE_W / FB_BOTTOM)); }
  //  full = 점(손가락 번호)까지 캔버스에(정리 층) / colors = 줄별 점 색(dotColors — 점 자체를 칠함) / noOpen = 캔버스 O를 그리지 않을 줄(그 자리는 DOM 점)
  //  nums = false면 점에 손가락 번호를 쓰지 않음(정리 층 — 손가락 번호와 도수를 섞지 않음, 가이드 §4-31)
  function drawV(cv, c, w, full, colors, noOpen, nums) {
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1, none6 = [null, null, null, null, null, null];
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f) { return f > 0 && !full ? null : f; }) : none6,
      openMute: c ? e.openMute.map(function (v, s) { return s === noOpen ? null : v; }) : none6, barre: {}, barreRange: null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c && nums !== false ? c.fing : none6,
    }, { chordName: c ? c.name : null, fingerNumMode: nums !== false, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, dotColors: colors || null });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  function cssBlue() { return getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff'; }
  function colorAt(s, col) { const a = [null, null, null, null, null, null]; a[s] = col; return a; }
  function paintDiag(k, id) {
    const d = DIAG[k], cv = $(d.cv);
    if (id !== undefined) d.id = id;
    if (!cv || !d.id) return;
    const c = chords()[d.id], w = dw(), box = $(d.wrap);
    drawV(box.querySelector('.n4-base'), null, w);
    drawV(cv, c, w, false, null, d.noOpen);
    box.style.width = w + 'px';
    box.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';
    box.style.setProperty('--n4-w', w + 'px');
  }
  const DIAG_FADE_MS = 500;
  function fadeDiag(k, id, dur) {
    const d = DIAG[k], cv = $(d.cv), box = $(d.wrap), old = box && box.querySelector('.n4-old');
    if (!old || !d.id || d.id === id || J.skipping()) { paintDiag(k, id); return; }
    old.width = cv.width; old.height = cv.height; old.style.width = cv.style.width;
    old.getContext('2d').drawImage(cv, 0, 0);
    paintDiag(k, id);
    J.anim(old, [{ opacity: 1 }, { opacity: 0 }], { duration: dur || DIAG_FADE_MS, easing: 'ease' });
    J.anim(cv, [{ opacity: 0 }, { opacity: 1 }], { duration: dur || DIAG_FADE_MS, easing: 'ease' });
  }
  function dotEl(k, n) { return document.querySelector('#' + DIAG[k].dots + ' [data-f="' + n + '"]'); }
  function putDot(k, n, id) {
    const el = dotEl(k, n);
    if (!el) return;
    const s = id ? fingerIdx(chords()[id], n) : -1;
    if (s < 0) { el.classList.remove('is-on'); return; }
    const l = (QD.x0 + (chords()[id].frets[s] - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%';
    const t = (QD.y0 + s * QD.sh) / VoicingCanvas.BASE_H * 100 + '%';
    if (!el.classList.contains('is-on')) { el.classList.add('is-snap'); el.style.left = l; el.style.top = t; void el.offsetWidth; el.classList.remove('is-snap'); }
    else { el.style.left = l; el.style.top = t; }
    el.classList.add('is-on');
  }
  function putChordDots(k, id) { [1, 2, 3, 4].forEach(function (n) { putDot(k, n, fingerIdx(chords()[id], n) >= 0 ? id : null); }); }
  // 처음 보여 줄 때 — 이동 없이 곧바로 완성 모양(§4-24). 도수 표시(줄 점·개방현 점)는 걷고 손가락 번호 점으로
  function snapDiag(k, id) {
    DIAG[k].noOpen = -1;
    q('.n14-m').forEach(function (el) { el.classList.add('is-snap'); el.classList.remove('is-on', 'n7-hot'); void el.offsetWidth; el.classList.remove('is-snap'); });
    paintDiag(k, id);
    const els = [1, 2, 3, 4].map(function (n) { return dotEl(k, n); }).filter(Boolean);
    els.forEach(function (el) { el.classList.add('is-snap'); el.classList.remove('n7-hot'); });
    putChordDots(k, id);
    els.forEach(function (el) { void el.offsetWidth; el.classList.remove('is-snap'); });
  }
  // 아는 코드 → 도미넌트7 — 자리가 바뀌는 손가락이 먼저(lead), 떼는·놓는 손가락이 그다음(swap), O·X·코드 이름은 마지막(D7 seqMove 그대로)
  const SEQ_GAP = { lead: 250, swap: 400 };
  function seqMove(k, to) {
    $(DIAG[k].wrap).style.setProperty('--n4-sp', 1);
    const from = chords()[DIAG[k].id], dest = chords()[to];
    const uses = function (c, n) { return fingerIdx(c, n) >= 0; };
    const F = [1, 2, 3, 4];
    const move = F.filter(function (n) { const a = fingerIdx(from, n), b = fingerIdx(dest, n); return a >= 0 && b >= 0 && (a !== b || from.frets[a] !== dest.frets[b]); });
    const swapF = F.filter(function (n) { return uses(from, n) !== uses(dest, n); });
    let t = 0;
    [['lead', move], ['swap', swapF]].forEach(function (g) {
      if (!g[1].length) return;
      later(function () { g[1].forEach(function (n) { putDot(k, n, uses(dest, n) ? to : null); }); }, t);
      t += SEQ_GAP[g[0]];
    });
    later(function () { fadeDiag(k, to, DIAG_FADE_MS); }, t);
    return t + DIAG_FADE_MS;
  }
  function diffF(a, b) {
    const A = chords()[a], B = chords()[b];
    return [1, 2, 3, 4].filter(function (n) { const x = fingerIdx(A, n), y = fingerIdx(B, n); return x !== y || (x >= 0 && A.frets[x] !== B.frets[y]); });
  }
  const HOT_LEAD_MS = 700;   // 바뀌는 손가락을 파랑으로 짚어 준 뒤 움직이기까지(D7과 같음)
  function morph(base, seven) {
    snapDiag('t', base);
    diffF(base, seven).forEach(function (n) { const el = dotEl('t', n); if (el) el.classList.add('n7-hot'); });
    return wait(HOT_LEAD_MS).then(function () {
      const ms = seqMove('t', seven);
      later(function () { ring(seven); }, ms);
      return wait(ms + J.leadMs() + 2000);
    });
  }
  // b7 칸 — 점의 글자를 손가락 번호에서 도수로 통째로 바꿈(사용자 지정 2026-11-17: 손가락 번호와 도수를 한 화면에 섞지 않음 — 가이드 §4-31).
  //  손가락 번호 점은 걷고, 소리 나는 줄마다 도수 점(1·3·5·b7): 누르는 줄 = 검은 점, 개방현 = 캔버스 O 위에 숫자만(D12 .n12-open).
  //  b7은 점 자체가 파랑(§4-27) — 개방현 b7은 캔버스 O를 빼고 그 자리 점을 파랑으로 채움. + b7 음 한 번
  const DEG_LAB = { 0: '1', 4: '3', 7: '5', 10: 'b7' };
  function degLab(c, s) { return DEG_LAB[((OPEN_MIDI[s] + c.frets[s] - ROOT_PC[c.name.charAt(0)]) % 12 + 12) % 12]; }
  function b7On(id) {
    const c = chords()[id], b = b7Str(c);
    [1, 2, 3, 4].forEach(function (n) { const el = dotEl('t', n); if (el) el.classList.remove('is-on', 'n7-hot'); });
    DIAG.t.noOpen = c.frets[b] === 0 ? b : -1;
    paintDiag('t');
    for (let s = 0; s < 6; s++) {
      const el = document.querySelector('#' + DIAG.t.dots + ' .n14-m[data-s="' + s + '"]'), f = c.frets[s];
      if (!el) continue;
      if (f == null) { el.classList.remove('is-on'); continue; }
      el.classList.add('is-snap');
      el.style.left = (f === 0 ? QD.ox : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%';
      el.style.top = (QD.y0 + s * QD.sh) / VoicingCanvas.BASE_H * 100 + '%';
      el.classList.toggle('n12-open', f === 0);
      el.classList.toggle('n7-hot', s === b);
      el.textContent = degLab(c, s);
      void el.offsetWidth;
      el.classList.remove('is-snap');
      el.classList.add('is-on');
    }
    J.note(OPEN_MIDI[b] + c.frets[b], J.audioT0(), 1.8, 0.8);
  }
  function b7Run(id) { return function () { b7On(id); return wait(J.leadMs() + 1800); }; }

  // 정리 층 — 여섯 코드 3×2(G7 C7 D7 / E7 A7 B7), 점까지 캔버스, b7 점만 파랑(dotColors — 개방현은 O 대신 채운 점). D8 정리 층(.n8-all)과 같은 배치
  const ALL_ROWS = SOLO ? [['C7', 'G7', 'D7'], ['E7', 'A7', 'B7']] : [['G7', 'C7', 'D7'], ['E7', 'A7', 'B7']];   // 솔로는 배운 순서(C7부터)
  const ALL_W_MAX = 120;
  let allHot = false;
  function paintAll(hotOn) {
    if (hotOn !== undefined) allHot = hotOn;
    const B = VoicingCanvas, wa = Math.max(80, Math.min(stageW() / 3 * B.BASE_W / (2 * HALF_SPAN), ALL_W_MAX)), blue = cssBlue();
    q('#n14-all .n5-trio').forEach(function (row) { row.style.height = Math.ceil(wa * B.BASE_H / B.BASE_W) + 'px'; });
    q('#n14-all canvas').forEach(function (cv) {
      const c = chords()[cv.dataset && cv.dataset.c];
      if (!c) return;
      drawV(cv, c, wa, true, allHot ? colorAt(b7Str(c), blue) : null, -1, false);   // 손가락 번호 없이 점만 — b7 점만 파랑(번호와 도수를 섞지 않음, §4-31)
      cv.style.marginLeft = -(FB_CX / B.BASE_W * wa) + 'px';
    });
  }
  function trioHtml(ids) { return '<div class="n5-trio">' + ids.map(function (id) { return '<div class="n5-tc"><canvas data-c="' + id + '"></canvas></div>'; }).join('') + '</div>'; }
  function dotsHtml() {
    const w = 'width:' + QD.dot / VoicingCanvas.BASE_W * 100 + '%';
    return [1, 2, 3, 4].map(function (n) { return '<span class="n4-dot" data-f="' + n + '" style="' + w + '">' + n + '</span>'; }).join('') +
      [0, 1, 2, 3, 4, 5].map(function (s) { return '<span class="n4-dot n14-m" data-s="' + s + '" style="' + w + '"></span>'; }).join('');   // 도수 점(b7 칸) — 줄마다 하나
  }

  // ── 솔로 전용: 피아노 건반 C4~D5 — D19(triads.js)와 같은 부품·같은 id(n12-*)·같은 CSS. 건반 아래 = 순번·도수, 위 = 코드 이름 ──
  const KB_LO = 60, KB_HI = 74, KW = 32, KH = 112, BW = 20, KB_W = KW * 9;
  const KEY_NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  function isBlack(m) { return KEY_NAME[m % 12].length > 1; }
  function whiteIdx(m) { let n = 0; for (let x = KB_LO; x < m; x++) if (!isBlack(x)) n++; return n; }
  function keyCx(m) { return isBlack(m) ? whiteIdx(m) * KW : whiteIdx(m) * KW + KW / 2; }
  function kbHtml() {
    let w = '', b = '';
    for (let m = KB_LO; m <= KB_HI; m++) {
      const nm = '<span class="n2-kl">' + KEY_NAME[m % 12] + '</span>';
      if (isBlack(m)) b += '<span class="n2-key n2-key--b" data-m="' + m + '" style="left:' + (keyCx(m) - BW / 2) + 'px">' + nm + '</span>';
      else w += '<span class="n2-key n2-key--w" data-m="' + m + '" style="left:' + whiteIdx(m) * KW + 'px">' + nm + '</span>';
    }
    return '<div class="n2-kb" style="width:' + KB_W + 'px"><div class="n12-kname" id="n12-kname"></div>' +
      '<div class="n2-keys" style="height:' + KH + 'px">' + w + b + '</div><div class="n2-knums" id="n12-knums"></div></div>';
  }
  const SCALE_C = [60, 62, 64, 65, 67, 69, 71, 72];
  function key(m) { return q('.n2-key[data-m="' + m + '"]'); }
  function knum(m, text, hot) {
    const n = document.createElement('span');
    n.className = 'n2-knum is-in' + (hot ? ' n12-hot' : '');
    n.style.left = keyCx(m) + 'px';
    n.textContent = text;
    $('n12-knums').appendChild(n);
    return n;
  }
  function kname(t) { const el = $('n12-kname'); el.textContent = t; el.classList.toggle('is-in', !!t); }
  //  marks = [[건반, 아래 글자, 파랑?]...] — 건반 강조(is-focus)와 아래 글자를 통째로 다시 그림(칸을 다시 봐도 같은 화면). scale = C 스케일 건반 표시
  function kbSet(marks, name, scale) {
    setCls(q('.n2-key'), ['is-focus', 'is-scale'], false);
    $('n12-knums').innerHTML = '';
    if (scale) SCALE_C.forEach(function (m) { setCls(key(m), 'is-scale', true); });
    marks.forEach(function (x) { if (x[3] !== false) setCls(key(x[0]), 'is-focus', true); knum(x[0], x[1], x[2]); });
    kname(name || '');
  }
  function kbPlay(ms, t0, dur) { ms.forEach(function (m) { J.piano(m, t0, dur); }); }
  //  C 스케일 순번 1~8(1·3·5 파랑 = C코드, plus = 더 짚을 순번) — 4번째 칸까지 같은 바탕
  function kbNums(hotIdx) { return SCALE_C.map(function (m, k) { return [m, String(k + 1), hotIdx.indexOf(k) >= 0, hotIdx.indexOf(k) >= 0]; }); }
  const C7_MARKS = [[60, '1'], [64, '3'], [67, '5'], [70, 'b7', true]];

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');
    if (SOLO && typeof GuitarAudio !== 'undefined' && GuitarAudio.warmupPiano) GuitarAudio.warmupPiano();   // 건반 시연용 피아노 샘플(D19와 같음)
    let colHtml = '';
    for (let i = 0; i < 7; i++) {
      colHtml += '<div class="lec-col"><span class="lec-name">&nbsp;</span><span class="lec-num">&nbsp;</span><div class="lec-stack">' +
        [1, 2, 3, 4].map(function (r) { return '<span class="lec-note" data-row="' + r + '">&nbsp;</span>'; }).join('') + '</div></div>';
    }
    stage.innerHTML = '<div class="jl-layers">' +
      (SOLO ? '<div class="jl-layer" id="n12-lkb">' + kbHtml() + '</div>' : '') +
      '<div class="jl-layer" id="n14-grid"><div class="lec-grid" id="lec-grid">' + colHtml + '</div></div>' +
      '<div class="jl-layer n4-full" id="n14-dg"><div class="n4-stack"><div class="n4-dz"><div class="n4-cw" id="' + DIAG.t.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + DIAG.t.cv + '"></canvas><canvas class="n4-old"></canvas><div class="n4-dots" id="' + DIAG.t.dots + '">' + dotsHtml() + '</div></div></div></div></div>' +
      '<div class="jl-layer n4-full" id="n14-all"><div class="n8-all">' + ALL_ROWS.map(trioHtml).join('') + '</div></div>' +
      '</div>';
    snapDiag('t', 'G'); paintAll(false);
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { paintDiag('t'); paintAll(); });
    }
  }
  function show(id, prepare) {
    if (prepare) prepare();
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }

  // 코드 한 칸 — [아는 코드 모양 + 소리(복습)] → [바뀌는 손가락만 파랑 → 옮김 → 7코드 소리] → [b7 점 + b7 음]. 끝 화면 = 7코드 + b7 점
  //  ms(진행 바 칸 길이용, 연출 시작부터 끝까지) — 모양 칸 = 나타남 400 + lead 220 + 2000 / 바꾸기 칸 = 파랑 700 + 옮기기(seqMove: 자리 이동 250 · 떼기·놓기 400 · 마무리 500) + lead 220 + 2000.
  //   측정 스크립트(scripts/journey-lesson-timing.js)로 확인한 값과 같음(lead는 스크립트 기준 220)
  function morphMs(base, seven) {
    const A = chords()[base], B = chords()[seven], F = [1, 2, 3, 4];
    const mv = F.some(function (n) { const a = fingerIdx(A, n), b = fingerIdx(B, n); return a >= 0 && b >= 0 && (a !== b || A.frets[a] !== B.frets[b]); });
    const sw = F.some(function (n) { return (fingerIdx(A, n) >= 0) !== (fingerIdx(B, n) >= 0); });
    return HOT_LEAD_MS + (mv ? SEQ_GAP.lead : 0) + (sw ? SEQ_GAP.swap : 0) + DIAG_FADE_MS + 220 + 2000;
  }
  //  extra = b7 뒤에 이어 붙일 구성 단계(C7의 5음 생략 안내)
  function chordChain(base, seven, baseText, morphText, b7Text, extra) {
    return J.chainSteps([
      { text: baseText, scene: 'n14-dg:' + seven, ms: 2620, run: function () { return show('n14-dg', function () { snapDiag('t', base); }).then(function () { ring(base); return wait(J.leadMs() + 2000); }); } },
      { text: morphText, ms: morphMs(base, seven), run: function () { return morph(base, seven); } },
      { text: b7Text, run: b7Run(seven) },
    ].concat(extra || []));
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 복습·적용)은 주석 ──
  //  강의 최종 목적: 도미넌트7 = 1·3·5·b7, 다이어토닉의 5도(V7) / 여섯 코드 운지 + 코드마다 b7 자리(퀴즈 ①②③)
  const COMP_STEPS = [
    // P1 원리
    // 0 핵심(D13 복습): 오늘 목표 + C key 다이어토닉 격자. 끝 화면 = 격자(D13 마지막 모습)
    J.chainSteps([
      { text: '이번 시간에는 코드 중에서 가장 중요한\n' + em('도미넌트7 코드') + '를 배워볼게요!', scene: 'n14-grid', run: none },
      { text: '지난 시간에 배운\n' + em('C key 다이어토닉 코드') + ' 기억나시죠?', run: function () { return show('n14-grid').then(gridFull); } },
    ]),
    // 1 핵심(D12·D13 복습): 5도 코드 G = G·B·D 세 음. 끝 화면 = 5도 열만 진하게(음 원래 크기)
    { text: '5도 코드 ' + em('G') + '는\n' + em('G, B, D') + ' 세 음을 쌓아서 만들었죠?', scene: 'n14-grid', run: function () {
      const nm = names(), ns = nums(), col = colNotes(4).slice(0, 3);
      grid().classList.add('is-count');   // 음 덩어리를 원래 크기로(D13 4도 세기와 같은 전환)
      fx(nm.concat(ns).filter(function (el, i) { return i % 7 !== 4; }), 'is-dim', true);
      fx([nm[4], ns[4]].concat(col), 'is-focus', true);
      fx(col, 'is-dim', false);
      J.strum(fretsToMidis(VOICINGS.G), J.audioT0(), 1.8, 0.8);
      return wait(J.leadMs() + 2000);
    } },
    // 2 핵심(새 내용): 한 칸 더 건너뛰어 F를 쌓음 + 소리. 끝 화면 = G 열에 F(파랑)
    { text: '여기서 한 칸 더 건너뛰어\n' + em('F') + '를 하나 더 쌓아볼게요', ms: 2620, run: function () {
      const col = colNotes(4), f = col[3];
      fx(col.slice(0, 3), 'is-focus', false);
      f.textContent = 'F';
      return fx([f], ['is-in', 'is-focus'], true).then(function () {
        J.strum(fretsToMidis(VOICINGS.G7), J.audioT0(), 2.0, 0.9);
        return wait(J.leadMs() + 2000);
      });
    } },
    // 3 핵심(새 내용): 이 코드 = G7 = 도미넌트7 코드(이름·로마숫자 V7) → 읽는 법 '세븐'(사용자 지정 2026-11-17). 끝 화면 = G7 / V7
    J.chainSteps([
      { text: 'G, B, D, F로 만든 이 코드는 ' + em('G7') + '이고\n이런 코드를 ' + em('도미넌트7 코드') + '라고 해요', run: function () {
        const nm = names()[4], n = nums()[4];
        J.strum(fretsToMidis(VOICINGS.G7), J.audioT0(), 2.0, 0.9);
        return Promise.all([J.swap(nm, function () { nm.textContent = 'G7'; }), J.swap(n, function () { n.innerHTML = romanHtml('V7'); })]).then(function () { return wait(1600); });
      } },
      { text: '도미넌트7 코드의 7은 간단하게\n' + em('세븐') + '이라고 읽어요\n' + em('G7') + '은 ' + em('G 세븐') + '이에요', run: function () {
        const nm = names()[4];
        return fx([nm], 'is-focus', true).then(function () { return wait(1200); }).then(function () { return fx([nm], 'is-focus', false); });
      } },
    ]),
    // 4 핵심(새 내용 + D12 b3 적용): G 메이저스케일의 7번째는 F# → 반음 낮은 F = b7 → 도미넌트7 = 1음·3음·5음·b7음. 끝 화면 = F 파랑
    J.chainSteps([
      { text: 'G 메이저스케일의 7번째 음은\n원래 ' + em('F#') + '이에요', run: function () {
        const f = colNotes(4)[3];
        return J.swap(f, function () { f.textContent = 'F#'; }).then(function () { return wait(800); });
      } },
      { text: '도미넌트7 코드는 반음 낮은 ' + em('F') + '를 쌓아서\n이 음을 ' + em('b7음') + '이라고 불러요', run: function () {
        const f = colNotes(4)[3];
        return J.swap(f, function () { f.textContent = 'F'; }).then(function () { return wait(800); });
      } },
      { text: '그래서 도미넌트7 코드는\n' + em('1음, 3음, 5음, b7음') + '으로 만들어요', run: function () {
        const col = colNotes(4);
        return fx(col.slice(0, 3), 'is-focus', true, 120).then(function () { return wait(1000); });
      } },
      // b7 찾는 법(사용자 지정 2026-11-17: 1음에서 온음 낮은 음 — 온음은 D2에서 배움). 1음 G와 b7 F만 파랑 + G → 온음 아래 F 소리
      { text: 'b7음은 ' + em('1음에서 온음 낮은 음') + '으로 찾아요\n' + em('G') + '에서 온음 낮은 음이 바로 ' + em('F') + '예요', run: function () {
        const col = colNotes(4), t0 = J.audioT0();
        fx([col[1], col[2]], 'is-focus', false);
        fx([col[0], col[3]], 'is-focus', true);
        J.note(55, t0, 0.7, 0.2);
        J.note(53, t0 + 0.7, 1.4, 0.8);
        return wait(J.leadMs() + 2100);
      } },
    ]),
    // 5 핵심(새 내용): 도미넌트7 = 다이어토닉의 5번째 코드 → 5도에만 7을 붙인 다이어토닉(V7) 소리. 끝 화면 = 격자(5도만 G7)
    J.chainSteps([
      { text: '도미넌트7 코드는 다이어토닉 코드의\n' + em('5번째 코드') + '예요', run: function () {
        const nm = names(), ns = nums(), col = colNotes(4);
        grid().classList.remove('is-count');
        fx(col, 'is-focus', false);
        fx(notes3().concat(col[3]), 'is-dim', true);
        fx(nm.concat(ns), 'is-dim', false);
        return fx([nm[4], ns[4]], 'is-focus', true).then(function () { return wait(1200); }).then(function () { return fx([nm[4], ns[4]], 'is-focus', false); });
      } },
      { text: '5도 코드에만 7을 붙인\n다이어토닉 코드를 들어볼게요', ms: 7020, run: function () { return playDia('G7'); } },   // ms = 측정값
    ]),

    // P2 기타에서 — 아는 코드에서 바꿔 잡기(사용자 선택) + b7 자리
    // 6 핵심: G → G7(4번 떼고 1번으로 1번줄 1프렛) / b7 = 1번줄 1프렛 F. 끝 화면 = G7 + b7 점
    chordChain('G', 'G7', '이제 도미넌트7 코드를 배워봅시다!\n먼저 예전에 배운 ' + em('G코드') + '를 가져올게요',
      em('4번 손가락') + '을 떼고 ' + em('1번 손가락') + '으로\n' + em('1번줄 1프렛') + '을 잡으면\n' + em('G7코드') + '예요',
      '이번엔 점에 ' + em('도수') + '를 표시해볼게요\n1음 ' + em('G') + '에서 온음 낮은\n1번줄 1프렛의 ' + em('F') + '가 ' + em('b7음') + '이에요'),
    // 7 핵심: C → C7(4번 손가락을 3번줄 3프렛에 더함) / b7 = 그 Bb. 끝 화면 = C7 + b7 점
    chordChain('C', 'C7', '이번엔 ' + em('C') + '코드에서 출발해볼게요',
      em('3번줄 3프렛') + '에 ' + em('4번 손가락') + '을\n더 잡아주면 ' + em('C7코드') + '가 완성돼요!',
      '1음 ' + em('C') + '에서 온음 낮은\n3번줄 3프렛의 ' + em('Bb') + '이 ' + em('b7음') + '이에요',   // Bb = 비플랫 → 조사 '이'
      // C7은 5음(G)이 없는 모양(x 1 3 b7 1 3) — 1·3·5·b7을 배운 직후라 헷갈리지 않게(사용자 지정 2026-11-17). 이유(배음)는 지금 알리지 않음(사용자 지정)
      [{ text: em('C7') + '에는 ' + em('5음') + '이 없죠?\n메이저 계열 코드에서는\n' + em('5음') + '을 생략하는 경우가 많아요', run: none }]),
    // 8 핵심: D → D7(2번줄을 1프렛으로 — 1번·3번 손가락 자리를 바꿈) / b7 = 2번줄 1프렛 C. 끝 화면 = D7 + b7 점
    chordChain('D', 'D7', '다음은 ' + em('D7') + '코드를 만들어 볼게요!',
      em('1번 손가락') + '으로 ' + em('2번줄 1프렛') + '을,\n' + em('3번 손가락') + '으로 ' + em('1번줄 2프렛') + '을 잡으면\n' + em('D7코드') + '예요',
      '1음 ' + em('D') + '에서 온음 낮은\n2번줄 1프렛의 ' + em('C') + '가 ' + em('b7음') + '이에요'),
    // 9 핵심: E → E7(3번 손가락만 뗌) / b7 = 개방현 4번줄 D. 끝 화면 = E7 + b7 점(개방현)
    chordChain('E', 'E7', '이번엔 ' + em('E') + '코드에서 출발해볼게요',
      em('3번 손가락') + '만 떼면\n' + em('E7코드') + '가 돼요!',
      '1음 ' + em('E') + '에서 온음 낮은\n개방현 4번줄의 ' + em('D') + '가 ' + em('b7음') + '이에요'),
    // 10 핵심: A → A7(3번줄을 떼고 2번줄은 3번 손가락으로) / b7 = 개방현 3번줄 G. 끝 화면 = A7 + b7 점(개방현)
    chordChain('A', 'A7', '다음은 ' + em('A7') + '코드를 만들어 볼게요!',
      em('3번줄') + '에서 손가락을 떼고\n2번줄은 ' + em('3번 손가락') + '으로 잡으면\n' + em('A7코드') + '예요',
      '1음 ' + em('A') + '에서 온음 낮은\n개방현 3번줄의 ' + em('G') + '가 ' + em('b7음') + '이에요'),
    // 11 핵심(새 내용): B7 — 처음 보는 모양(완성 모양 바로 + 소리) / b7 = 3번줄 2프렛 A(3번 손가락). 끝 화면 = B7 + b7 점
    J.chainSteps([
      { text: '마지막으로 ' + em('B7코드') + '예요\n처음 보는 모양이니\n손가락 번호를 잘 봐주세요', scene: 'n14-dg:B7', ms: 2820, run: function () {
        return show('n14-dg', function () { snapDiag('t', 'B7'); }).then(function () { ring('B7'); return wait(J.leadMs() + 2200); });
      } },
      { text: '1음 ' + em('B') + '에서 온음 낮은\n3번줄 2프렛의 ' + em('A') + '가 ' + em('b7음') + '이에요', run: b7Run('B7') },
    ]),

    // P3 정리
    // 12 핵심(정리): 여섯 코드의 b7 자리를 한눈에(b7 점만 파랑). 끝 화면 = 3×2
    { text: '여섯 코드의 ' + em('b7음') + '을\n한눈에 볼게요', scene: 'n14-all', ms: 1600, run: function () {
      return show('n14-all', function () { paintAll(false); }).then(function () { paintAll(true); return wait(1200); });
    } },
    // 13 핵심: 다음 할 일 = 퀴즈(코드 15가지 · b7 찾기 · 5도에 7을 붙인 다이어토닉)
    { text: '이제 퀴즈로 코드 15가지와 ' + em('b7음') + ',\n5도에 7을 붙인 다이어토닉 코드를\n복습해봐요!', run: none },
  ];
  // 페이즈: 1 원리 [0~5] / 2 G7·C7·D7 [6~8] / 3 E7·A7·B7 [9~11] / 4 정리·퀴즈 안내 [12·13]
  const COMP_GROUPS = [[0, 1, 2, 3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13]];

  // ── 솔로 단계(D20) — P1은 D19 건반을 이어받아 C7로, P2·P3은 코드반주와 같은 칸을 C7부터 ──
  //  강의 최종 목적: 도미넌트7 = 1·3·5·b7(b7 = 1음에서 온음 아래) / 여섯 코드 운지 + 코드마다 b7 자리(퀴즈 ① 코드 15가지 ② b7 찾기)
  const SOLO_STEPS = [
    // P1 원리(건반)
    // 0 핵심(오늘 목표 + D19 복습): C코드 = C 스케일의 1·3·5음. 끝 화면 = 순번 1~8, 1·3·5 파랑 + C
    J.chainSteps([
      { text: '이번 시간에는 코드 중에서 가장 중요한\n' + em('도미넌트7 코드') + '를 배워볼게요!', scene: 'n12-lkb', run: function () { return show('n12-lkb', function () { kbSet([]); }); } },
      { text: '지난 시간에 ' + em('C코드') + '는\n' + em('1음, 3음, 5음') + '을 쌓아서 만들었죠?', run: function () {
        const t0 = J.audioT0();
        kbSet(kbNums([]), '', true);
        kbPlay([60, 64, 67], t0, 2.0);
        later(function () { kbSet(kbNums([0, 2, 4]), 'C', true); }, J.leadMs());
        return wait(J.leadMs() + 2000);
      } },
    ]),
    // 1 핵심(새 내용): 한 칸 더 건너뛴 7번째 음(B) → 도미넌트7은 반음 낮은 Bb = b7음(D19 '3음을 반음 낮춤'과 같은 방식). 끝 화면 = 1·3·5 + Bb 파랑
    J.chainSteps([
      { text: '여기서 한 칸 더 건너뛰어\n' + em('7번째 음') + '을 하나 더 쌓아볼게요', scene: 'n12-lkb', run: function () {
        show('n12-lkb');
        kbSet(kbNums([0, 2, 4]), 'C', true);
        J.piano(71, J.audioT0(), 1.6);
        later(function () { kbSet(kbNums([0, 2, 4, 6]), '', true); }, J.leadMs());
        return wait(J.leadMs() + 1800);
      } },
      { text: '도미넌트7 코드는 반음 낮은 ' + em('Bb') + '을 쌓고\n이 음을 ' + em('b7음') + '이라고 불러요', run: function () {
        J.piano(70, J.audioT0(), 1.6);
        later(function () { kbSet([[60, '1', false], [64, '3', false], [67, '5', false], [70, 'b7', true]], ''); }, J.leadMs());
        return wait(J.leadMs() + 1800);
      } },
    ]),
    // 2 핵심(새 내용): C·E·G·Bb = C7 = 1·3·5·b7 + 읽는 법 '세븐'. 끝 화면 = 도수 네 개(b7 파랑) + C7
    J.chainSteps([
      { text: 'C, E, G, Bb으로 만든 이 코드는 ' + em('C7') + '이고\n' + em('1음, 3음, 5음, b7음') + '으로 만들어요', scene: 'n12-lkb', run: function () {
        show('n12-lkb');
        const t0 = J.audioT0();
        kbPlay([60, 64, 67, 70], t0, 2.2);
        later(function () { kbSet(C7_MARKS, 'C7'); }, J.leadMs());
        return wait(J.leadMs() + 2000);
      } },
      { text: '도미넌트7 코드의 7은 간단하게\n' + em('세븐') + '이라고 읽어요\n' + em('C7') + '은 ' + em('C 세븐') + '이에요', run: function () { kbSet(C7_MARKS, 'C7'); return wait(1200); } },
    ]),
    // 3 핵심(새 내용): b7 찾는 법 = 1음에서 온음 낮은 음(온음 = D2). 위쪽 C와 Bb만 파랑 + C → Bb 소리. 끝 화면 = C(1)·Bb(b7)
    { text: 'b7음은 ' + em('1음에서 온음 낮은 음') + '으로 찾아요\n위쪽 ' + em('C') + '에서 온음 낮은 음이 바로 ' + em('Bb') + '이에요', scene: 'n12-lkb', run: function () {
      show('n12-lkb');
      kbSet(C7_MARKS, 'C7');
      const t0 = J.audioT0(), lead = J.leadMs();
      J.piano(72, t0, 0.7);
      J.piano(70, t0 + 0.7, 1.4);
      later(function () { kbSet([[72, '1', true]], 'C7'); }, lead);
      later(function () { kbSet([[72, '1', true], [70, 'b7', true]], 'C7'); }, lead + 700);
      return wait(lead + 2100);
    } },

    // P2 기타에서 — 아는 코드에서 바꿔 잡기 + b7 자리(코드반주와 같은 칸, C7부터)
    // 4 핵심: C → C7 / b7 = 3번줄 3프렛 Bb + 5음 생략 안내. 끝 화면 = C7 + b7 점
    chordChain('C', 'C7', '이제 기타에서 잡아볼게요!\n먼저 배운 ' + em('C코드') + '에서 출발해요',
      em('3번줄 3프렛') + '에 ' + em('4번 손가락') + '을\n더 잡아주면 ' + em('C7코드') + '가 완성돼요!',
      '이번엔 점에 ' + em('도수') + '를 표시해볼게요\n1음 ' + em('C') + '에서 온음 낮은\n3번줄 3프렛의 ' + em('Bb') + '이 ' + em('b7음') + '이에요',
      [{ text: em('C7') + '에는 ' + em('5음') + '이 없죠?\n메이저 계열 코드에서는\n' + em('5음') + '을 생략하는 경우가 많아요', run: none }]),
    // 5 핵심: G → G7 / b7 = 1번줄 1프렛 F. 끝 화면 = G7 + b7 점
    chordChain('G', 'G7', '이번엔 ' + em('G코드') + '에서 출발해볼게요',
      em('4번 손가락') + '을 떼고 ' + em('1번 손가락') + '으로\n' + em('1번줄 1프렛') + '을 잡으면\n' + em('G7코드') + '예요',
      '1음 ' + em('G') + '에서 온음 낮은\n1번줄 1프렛의 ' + em('F') + '가 ' + em('b7음') + '이에요'),
    // 6~ 이하 D7·E7·A7·B7은 코드반주와 같은 칸
    COMP_STEPS[8], COMP_STEPS[9], COMP_STEPS[10], COMP_STEPS[11],
    // 10 핵심: 정리·마무리(문구 사용자 지정 2026-11-24) — 여섯 코드 모아 보기(b7 점만 파랑, 코드반주 정리 칸과 같은 화면) → 기초 코드 + 7코드 여섯 개 암기 → 퀴즈. 끝 화면 = 3×2
    J.chainSteps([
      { text: '도미넌트7 코드를 모아봤어요\n특히 ' + em('b7음') + '이 어디 있는지 주목해주세요!', scene: 'n14-all', run: function () {
        return show('n14-all', function () { paintAll(false); }).then(function () { paintAll(true); return wait(1200); });
      } },
      { text: '앞서 배운 ' + em('기초 코드') + '와\n이 ' + em('6가지 7코드') + '를 외워주세요', run: none },
      { text: '퀴즈를 풀면서 자연스럽게\n코드를 외울 수 있을 거예요!', run: none },
    ]),
  ];
  // 페이즈: 1 원리(건반) [0~3] / 2 C7·G7·D7 [4~6] / 3 E7·A7·B7 [7~9] / 4 정리·마무리 [10]
  const steps = SOLO ? SOLO_STEPS : COMP_STEPS;
  const groups = SOLO ? [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9], [10]] : COMP_GROUPS;

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(코드진행 보기가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
  function paint(cv, chord, placed, nums, name, w, mc, fretLabelSize, hideOpen) {   // fretLabelSize: 프렛 번호 글자 크기(기준 440폭 단위, 없으면 기본 28)
    const dpr = window.devicePixelRatio || 1;
    let v = null;
    if (chord) {   // library.js _drawLibCanvas와 같은 필드. 아직 안 놓인 손가락의 점만 뺌(frets null + openMute null = 아무 표시 없음)
      const e = chord.entry, shown = chord.order.slice(0, placed);
      v = {
        frets:      e.frets.map(function (f, s) { return (f > 0 && shown.indexOf(chord.fing[s]) < 0) || (f === 0 && hideOpen && hideOpen.indexOf(s) >= 0) ? null : f; }),   // hideOpen: 점 찍기에서 아직 안 찍힌 개방현 줄 — O를 숨김
        openMute:   e.openMute,
        barre:      e.barres && e.barres[0] || e.barre || {},
        barreRange: e.barreRanges && e.barreRanges[0] || e.barreRange || null,
        fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source,
        fingering:  chord.fing,
      };
    }
    VoicingCanvas.draw(cv, v, { markColors: mc, chordName: chord && name ? chord.name : null, fingerNumMode: !!nums, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, fretLabelSize: fretLabelSize });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }

  function midisOf(c) { return strokeMidis(c, 'all'); }   // 울리는 줄 6번줄 → 1번줄(D3 midisOf와 같음)
  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D11(money-calypso.js) 퀴즈 엔진(별 진행·피크·오답풀이·이어 풀기·오버레이·코드 맞추기·점 찍기)에 D12 찾아 누르기·D13 다이어토닉을 더함
  //   유형(사용자 지정 2026-11-17):
  //     ① 기초 코드 9가지 + 도미넌트7 여섯 = 15코드 전부 혼합 — pick 코드 맞추기 4지선다(D11과 같음) / fill 빠진 점 찍기(D11과 같음, F 바레 규칙 그대로)
  //     ② b7 — 여섯 코드 중 하나의 다이어그램(점·O·X만)에서 b7음을 찾아 누름(D12 3음 찾기와 같은 방식 — 누르는 즉시 채점 + 누른 음, 오답풀이는 틀린 점 빨강 유지)
  //     ③ 다이어토닉 — D13 문제(연결형·빈칸형)에서 5도만 V7(C key G7 · D key A7). D key는 D13과 같게 별 2 약 10% · 별 3 약 25%(③ 문제 수 기준), 퀴즈 맨 뒤에(C key 앞 · D key 뒤)
  //   문제 수(사용자 지정): 별 1 15 / 별 2 20 / 별 3 20. 유형 나눔 잠정값(①·②·③ 균등): 별 1 5·5·5(① = 맞추기 3 + 채우기 2) / 별 2 7·6·7(4 + 3) / 별 3 7·6·7(3 + 4)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:dominant7
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = SOLO
    ? { 1: { n: 15, pick: 5, fill: 4, b7: 6, dia: 0 }, 2: { n: 20, pick: 6, fill: 6, b7: 8, dia: 0 }, 3: { n: 20, pick: 6, fill: 6, b7: 8, dia: 0 } }   // 솔로(사용자 지정 2026-11-24): ③ 다이어토닉 없음 — ①·② 둘로 나눔
    : { 1: { n: 15, pick: 3, fill: 2, b7: 5, dia: 5 }, 2: { n: 20, pick: 4, fill: 3, b7: 6, dia: 7 }, 3: { n: 20, pick: 3, fill: 4, b7: 6, dia: 7 } };
  const QZ_D_RATE = { 1: 0, 2: 0.1, 3: 0.25 };   // 별 → ③ 중 D key 비율(D13과 같음)
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'dominant7';
  let qz = null;   // 세션 { star, qs, idx, wrong[], phase: 'main'|'review', rvPos, done, judged, canRetry, paid{}, correct, refunded, short }
  // ── 이어 풀기 — 새로고침·앱 종료·백그라운드 뒤에도 하던 퀴즈를 그 문제부터. 문제(순서·보기·짝)·진행·틀린 목록·피크 지불 기록을 이 기기에 저장 ──
  //  X로 나가도 저장(2026-11-27). 완주하면 지움. 마지막으로 답한 지 24시간이 지났거나 저장분의 별이 지금 풀 별과 다르면 버림
  const SESS_FIELDS = ['star', 'qs', 'idx', 'wrong', 'phase', 'rvPos', 'done', 'judged', 'canRetry', 'paid', 'correct', 'refunded', 'at'];
  function sessSave() {
    if (!qz || qz.over || qz.quit) return;
    const o = { node: NODE_ID, course: SOLO ? 'soloing' : 'comping' };   // 두 코스가 같은 열쇠를 씀 — 문제 구성이 달라서(솔로는 ③ 없음) 코스까지 맞아야 이어 풀기
    SESS_FIELDS.forEach(function (k) { o[k] = qz[k]; });
    jnyQuizSessWrite(NODE_ID, o);
  }
  function sessLoad() {
    try {
      const o = jnyQuizSessRead(NODE_ID);
      if (!o || o.node !== NODE_ID || o.star !== window.JourneyLesson.quizStar(starsGet()) || !Array.isArray(o.qs)) return null;
      if ((o.course || 'comping') !== (SOLO ? 'soloing' : 'comping')) return null;   // 코스 표시 없는 옛 저장분 = 코드반주에서 만든 것
      return o;
    } catch (e) { return null; }
  }
  function sessClear() { jnyQuizSessRemove(NODE_ID); }

  function starsGet() { try { return JSON.parse(localStorage.getItem(STARS_KEY) || '{}')[NODE_ID] || 0; } catch (e) { return 0; } }
  function starsSet(n) {
    if (typeof analytics !== 'undefined' && n > starsGet()) analytics.track('journey_quiz_cleared', { node_id: NODE_ID, quiz_k: n, course_kind: new URLSearchParams(location.search).get('course') });   // 분석(2026-11-26 여정 텍소노미): 처음 깬 단계만
    try { const o = JSON.parse(localStorage.getItem(STARS_KEY) || '{}'); o[NODE_ID] = Math.max(o[NODE_ID] || 0, n); localStorage.setItem(STARS_KEY, JSON.stringify(o)); } catch (e) {}
    // 퀴즈 노드 3(별 3)을 처음 클리어한 시각 = 묶음 완료 — 다음 설명 노드의 6시간 타이머 기준(journey.js jnyOpenAt, 2026-11-24 노드 늘리기). 처음 한 번만 기록
    try { const t = JSON.parse(localStorage.getItem('jnyDoneAt') || '{}'); if (n >= 3 && !t[NODE_ID]) { t[NODE_ID] = Date.now(); localStorage.setItem('jnyDoneAt', JSON.stringify(t)); } } catch (e) {}
  }
  function isPro() { return typeof getPlan === 'function' && getPlan() === 'pro'; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  function balanced(n, pool) { const o = rnd(pool.length), a = []; for (let k = 0; k < n; k++) a.push(pool[(k + o) % pool.length]); return shuffle(a); }   // 풀 안에서 고르게(나머지는 무작위 시작점에서)
  const QZ_CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em', 'C7', 'D7', 'E7', 'G7', 'A7', 'B7'];   // ① 풀 = 기초 9 + 도미넌트7 6
  // ③ 다이어토닉(D13과 같은 데이터, 5도만 V7·G7)
  const DIA = [
    { deg: 'I', chord: 'C', w: 5 }, { deg: 'IIm', chord: 'Dm', w: 4 }, { deg: 'IIIm', chord: 'Em', w: 3 }, { deg: 'IV', chord: 'F', w: 5 },
    { deg: 'V7', chord: 'G7', w: 5 }, { deg: 'VIm', chord: 'Am', w: 4 }, { deg: 'VIIdim', chord: 'Bdim', w: 1, only3: true },
  ];
  const C_NAMES7 = ['C', 'Dm', 'Em', 'F', 'G7', 'Am', 'Bdim'], D_NAMES7 = ['D', 'Em', 'F#m', 'G', 'A7', 'Bm', 'C#dim'];
  function diaByChord(c) { return DIA.filter(function (x) { return x.chord === c; })[0]; }
  function nm(c, key) { return key === 'D' ? D_NAMES7[C_NAMES7.indexOf(c)] : c; }   // 화면 표시 — 문제 데이터(C key 이름)를 그 문제의 key로
  const PAIR3_RATE = 0.7, REVERSE_RATE = 0.2;   // D13과 같음
  // D13 진행 21개(코드반주 기초 C key 3화음)에서 G만 G7로
  const PROGS = [['F', 'G', 'C', 'C'], ['Dm', 'G', 'C', 'C'], ['F', 'G', 'Am', 'Am'], ['C', 'F', 'G', 'C'], ['C', 'G', 'Am', 'F'], ['C', 'Am', 'F', 'G'], ['C', 'Am', 'Dm', 'G'],
    ['F', 'G', 'C', 'Am'], ['F', 'G', 'Am', 'C'], ['F', 'G', 'Em', 'Am'], ['F', 'C', 'Am', 'G'], ['Am', 'C', 'F', 'G'], ['Am', 'C', 'Dm', 'G'], ['Am', 'G', 'F', 'G'],
    ['Am', 'Em', 'F', 'G'], ['Am', 'F', 'C', 'G'], ['Dm', 'G', 'C', 'Am'], ['Dm', 'G', 'Am', 'C'], ['Dm', 'G', 'Em', 'Am'], ['Em', 'Am', 'F', 'G'], ['Em', 'Am', 'Dm', 'G']]
    .map(function (p) { return p.map(function (c) { return c === 'G' ? 'G7' : c; }); });
  function weightedPick(items, n) {
    const pool = items.slice(), out = [];
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce(function (a, x) { return a + x.w; }, 0), i = 0;
      while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function makePair(used) {
    let pick, key, guard = 0;
    do {
      pick = weightedPick(DIA, Math.random() < PAIR3_RATE ? 3 : 4);
      if (pick.length > 3 && pick.some(function (x) { return x.only3; })) {
        const rest = pick.filter(function (x) { return !x.only3; });
        pick.splice(pick.indexOf(rest[rnd(rest.length)]), 1);
      }
      key = pick.map(function (x) { return x.deg; }).sort().join();
    } while (used.indexOf(key) >= 0 && ++guard < 50);
    used.push(key);
    return { type: 'pair', left: shuffle(pick.map(function (x) { return x.deg; })), right: shuffle(pick.map(function (x) { return x.deg; })) };
  }
  function makeDFill(prev) {
    const cands = PROGS.filter(function (p) { return p !== prev.p; });
    const prog = cands[rnd(cands.length)];
    prev.p = prog;
    const distinct = prog.filter(function (c, i) { return prog.indexOf(c) === i; }).map(diaByChord);
    const ans = weightedPick(distinct, 1)[0];
    const spots = [];
    prog.forEach(function (c, i) { if (c === ans.chord) spots.push(i); });
    const reverse = Math.random() < REVERSE_RATE;
    const val = function (x) { return reverse ? x.deg : x.chord; };
    const wrong = shuffle(DIA.filter(function (x) { return x !== ans; })).slice(0, 2).map(val);
    return { type: 'dfill', prog: prog.slice(), target: spots[rnd(spots.length)], reverse: reverse, answer: val(ans), choices: shuffle(wrong.concat([val(ans)])) };
  }
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    // ① 코드 맞추기 — 보기 = 정답 + 나머지 열넷 중 셋(D11과 같은 방식)
    const pc = balanced(cfg.pick, QZ_CHORDS), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) {
      const others = shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k]; })).slice(0, 3);
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k]].concat(others)), answer: pc[k] });
    }
    // ① 코드 채우기 — D11 규칙(별 1·2 = 1개, 별 3 = 2개 또는 3개 — 손가락이 2개뿐인 코드는 최대 2개)
    const fc = balanced(cfg.fill, QZ_CHORDS);
    const miss = fillMiss(star, cfg.fill), usedF = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = 5~6)
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], usedF, fc));
    // ② b7 찾기 — 여섯 코드를 고루
    balanced(cfg.b7, SEVENS).forEach(function (c) { qs.push({ type: 'b7', chord: c }); });
    // ③ 다이어토닉 — 연결형·빈칸형 반반(홀수면 한쪽이 하나 더, 무작위), 뒤쪽 nD개가 D key
    const nPair = cfg.dia % 2 ? (cfg.dia - 1) / 2 + rnd(2) : cfg.dia / 2;
    const used = [], prev = { p: null };
    const dia = shuffle(Array.from({ length: cfg.dia }, function (_, k) { return k < nPair ? 'pair' : 'dfill'; })).map(function (k) { return k === 'pair' ? makePair(used) : makeDFill(prev); });
    const nD = Math.round(cfg.dia * QZ_D_RATE[star]);
    dia.forEach(function (q, i) { q.key = i >= cfg.dia - nD ? 'D' : 'C'; });
    // 순서: C key 문제 전부(유형 섞음, 채우기는 빠진 점이 적은 것부터 — D11과 같음) → D key 문제(사용자 지정 — C key 앞, D key 뒤)
    const mixed = shuffle(qs.concat(dia.filter(function (q) { return q.key === 'C'; }))), fills = mixed.filter(function (q) { return q.type === 'fill'; });
    fills.forEach(function (q, i) { q._i = i; });
    fills.sort(function (x, y) { return x.miss - y.miss || x._i - y._i; });
    fills.forEach(function (q) { delete q._i; });
    let fi = 0;
    const front = J.noRepeat(mixed.map(function (q) { return q.type === 'fill' ? fills[fi++] : q; }), function (q) { return q.type === 'fill' ? q.miss : null; });
    return front.concat(J.noRepeat(dia.filter(function (q) { return q.key === 'D'; })));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat) — 앞·뒤 묶음을 따로 돌려 C/D 경계를 넘지 않음
  }
  // 빠진 점 — 손가락 단위로 빼고, 정답은 줄 단위(바레 손가락은 덮는 줄 전부 — D11과 같음)
  // 점 찍기(2026-11-20 전 노드 공통 — 노드 3 규칙): 코드의 소리 나는 노트(누르는 점 + 개방현 O) 중 miss개를 비워 둠. 개방현도 빠질 수 있음(너트 왼쪽 칸을 눌러 찍음).
  //  빼는 단위 = 손가락(바레 손가락은 덮는 줄 전부 한 번에) 또는 개방현 한 줄. 노트 수(줄 수)가 miss에 가장 가까운 조합 중 무작위. 노트가 모자라면 전부.
  //  given = 이미 찍혀 있는 손가락 번호들, givenOpen = 이미 보이는 개방현 줄(1~6), ans = 빠진 노트 자리 '줄-프렛'(개방현은 프렛 0), miss = 실제 빠진 노트 수
  function mkFill(name, miss) {
    const c = chords()[name], units = [];
    c.order.forEach(function (n) { const ss = []; for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s] > 0) ss.push(s); if (ss.length) units.push({ n: n, ss: ss }); });
    for (let s = 0; s < 6; s++) if (c.frets[s] === 0 && !(c.entry.openMute && c.entry.openMute[s] === 'mute')) units.push({ n: 0, ss: [s] });
    const total = units.reduce(function (a, u) { return a + u.ss.length; }, 0), m = Math.min(miss, total);
    let best = [], bestD = Infinity;
    for (let mask = 1; mask < (1 << units.length); mask++) {
      let cnt = 0;
      units.forEach(function (u, i) { if (mask & (1 << i)) cnt += u.ss.length; });
      const d = Math.abs(cnt - m);
      if (d < bestD) { bestD = d; best = [mask]; } else if (d === bestD) best.push(mask);
    }
    const mask = best[Math.floor(Math.random() * best.length)];
    const gone = units.filter(function (u, i) { return mask & (1 << i); }), keep = units.filter(function (u, i) { return !(mask & (1 << i)); });
    const ans = [];
    gone.forEach(function (u) { u.ss.forEach(function (s) { ans.push((s + 1) + '-' + c.frets[s]); }); });
    return { type: 'fill', chord: name, given: keep.filter(function (u) { return u.n > 0; }).map(function (u) { return u.n; }), givenOpen: keep.filter(function (u) { return u.n === 0; }).map(function (u) { return u.ss[0] + 1; }), ans: ans, miss: ans.length };
  }
  // 채울 노트 수(2026-11-20 전 노드 공통): 별 1 = 2개 / 별 2 = 3~4개 / 별 3 = 5~6개(반반, 코드 노트 수보다 많으면 전부)
  function fillMiss(star, n) {
    const lo = star === 1 ? 2 : star === 2 ? 3 : 5;
    return star === 1 ? Array.from({ length: n }, function () { return 2; }) : shuffle(Array.from({ length: n }, function (_, k) { return k < Math.floor(n / 2) ? lo : lo + 1; }));
  }
  // 같은 점 찍기 문제(코드 + 빠진 자리)를 가능하면 두 번 내지 않음 — 선호 코드에서 안 쓴 문제를 먼저, 바닥나면 같은 풀의 다른 코드에서. 다 바닥났을 때만 겹침
  function pickFill(pref, miss, used, pool) {
    const order = [pref].concat(shuffle(pool.filter(function (x, i) { return x !== pref && pool.indexOf(x) === i; })));
    for (let ci = 0; ci < order.length; ci++) for (let t = 0; t < 40; t++) {
      const q = mkFill(order[ci], miss), k = q.chord + ':' + q.ans.slice().sort().join(',');
      if (!used[k]) { used[k] = true; return q; }
    }
    return mkFill(pref, miss);
  }
  const QD_W = 300;   // 점 찍기·b7 찾기 다이어그램 폭(최대)
  function paintQ(cv, chord, given, w, givenOpen) {   // givenOpen = 이미 보이는 개방현 줄(1~6). 생략하면(보기 그림·옛 저장 세션) 개방현 O는 전부 보임
    const hide = givenOpen ? chord.frets.map(function (f, s) { return f === 0 && givenOpen.indexOf(s + 1) < 0 ? s : -1; }).filter(function (s) { return s >= 0; }) : null;
    paint(cv, Object.assign({}, chord, { order: given }), given.length, false, false, w, null, undefined, hide);
  }   // 손가락 번호 생략(D11과 같음)
  function paintB(cv, c, w, colors) {   // b7 찾기 — 점·O·X만(손가락 번호·코드 이름 없음 — 코드 이름은 안내 카드에). 정답·오답은 점 자체 색(dotColors)
    const e = c.entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, { frets: e.frets, openMute: e.openMute, barre: {}, barreRange: null, fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: [null, null, null, null, null, null] },
      { chordName: null, fingerNumMode: false, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, dotColors: colors || null });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  function diagCard(chord) { return '<canvas class="n3q-cv" data-chord="' + chord + '"></canvas>'; }
  // 도수 표기 — 로마숫자 크게 + 퀄리티 작게(D13과 같은 마크업)
  function roman(deg) { const m = /^([IV]+)(.*)$/.exec(deg); return '<span class="rm"><span class="rn">' + m[1] + '</span>' + (m[2] ? '<span class="rq">' + m[2] + '</span>' : '') + '</span>'; }
  function fmt(v, reverse, key) { return reverse ? roman(v) : nm(v, key); }
  function degOfChord(c) { return diaByChord(c).deg; }

  // ── 소리 — 정답(상승)·오답(하강) 벨: 리하모니(chord-combo.js comboPlaySound)와 같은 소리 ──
  let qzCtx = null;
  function bell(freq, delay, gainVal) {
    try {
      if (!qzCtx) qzCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (qzCtx.state !== 'running') qzCtx.resume();
      const t = qzCtx.currentTime + delay;
      const vol = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
      [[1, 1, 0.8], [2.756, 0.55, 0.5], [5.404, 0.35, 0.3], [8.933, 0.18, 0.15], [13.46, 0.08, 0.08]].forEach(function (pt) {
        const osc = qzCtx.createOscillator(), g = qzCtx.createGain();
        osc.connect(g); g.connect(qzCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * pt[0] * 1.015, t);
        osc.frequency.exponentialRampToValueAtTime(freq * pt[0], t + 0.02);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gainVal * pt[1] * vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + pt[2]);
        osc.start(t); osc.stop(t + pt[2] + 0.05);
      });
    } catch (e) {}
  }
  function judgeSound(ok) {
    if (typeof _sfxMarkPlayed === 'function') _sfxMarkPlayed();   // 공용 클릭음(제출하기 누른 소리)과 겹치지 않게 — 정답·오답음이 그 탭의 소리
    if (ok) { bell(523.25, 0, 0.2); bell(698.46, 0.13, 0.2); } else { bell(349.23, 0, 0.2); bell(261.63, 0.13, 0.2); }
  }
  // ── 화면 — 리하모니 문제 화면(#combo-view-quiz-v2) 틀 ──
  const QZ_TITLES = { pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요', b7: '알맞은 답을 눌러주세요', pair: '같은 짝끼리 이어주세요', dfill: '빈칸에 알맞은 코드를 배치하세요', dfillRev: '빈칸에 알맞은 도수를 배치하세요' };
  // 안내 카드 — 3줄(앞 문구 / 강조 / 뒤 문구, mid가 없으면 2줄). speaker = 좌상단 스피커(③ 빈칸형). 앞 문구의 "C key"만 진하게(D13)
  function infoCard(head, mid, tail, speaker) {
    return '<div class="combo-v2-info-card cd-card">' + (speaker ? '<button type="button" class="combo-v2-speaker" aria-label="코드 진행 듣기">' + ICON_SOUND + '</button>' : '') +
      '<p class="combo-v2-info-text"><span>' + head.replace(/^(\S+ key)/, '<strong>$1</strong>') + '</span>' + (mid ? '<b><span>' + mid + '</span></b>' : '') + '<span>' + tail + '</span></p></div>';
  }
  function qBtn(label, enabled, verdict) {
    const b = $('jq-btn');
    b.textContent = label;
    b.dataset.sfx = label === '제출하기' ? 'none' : 'pop';   // 공용 클릭음: 제출하기는 없음(채점 벨만), 다음·완료·다시 풀기·이어서 풀기는 pop
    b.disabled = !enabled;
    const blue = enabled && verdict !== undefined && !!qz && cur().type === 'prog';   // 코드진행 채점 뒤 '다음'은 정답·오답과 상관없이 블루(사용자 지정) — 정오는 칸 색·벨로 이미 알려 줌
    b.classList.toggle('combo-v2-submit--ok', !blue && verdict === true);
    b.classList.toggle('combo-v2-submit--ng', !blue && verdict === false);
    b.classList.toggle('n5q-next', blue);
  }
  function qProgress() {
    const total = qz.qs.length + qz.wrong.length;
    const pct = Math.sqrt(qz.done / total) * 100;
    const el = $('jq-fill');
    el.style.width = pct + '%';
    el.style.background = pct >= 90 ? '#FFD60A' : pct >= 75 ? '#4CBB17' : '';
  }
  function cur() { return qz.qs[qz.phase === 'review' ? qz.wrong[qz.rvPos] : qz.idx]; }
  function bindChoices() {
    $('jq-content').querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) cardJudge(b); });
  }
  // ── 소리 — 코드 맞추기 코드 소리(playChord — D8과 같음, 문제가 나오면 1회 자동 재생 + 카드 터치) ──
  const TOUCH_HINT = '터치해서 소리도 들어보세요!';   // 코드 맞추기와 같은 안내
  //  문제가 나오면 0.18초 뒤 1회 자동 재생(그 사이 답했거나 다음 문제로 넘어갔으면 재생 안 함), 문제 카드를 누르면 다시, 보기를 고르는 순간 문제 소리는 바로 끊음
  let autoTimer = null, chordGen = 0;   // chordGen: 하드컷 뒤 늦게 도착하는 코드 소리 막기
  async function playChord(name) {
    if (typeof GuitarAudio === 'undefined') return;
    const midis = midisOf(chords()[name]);
    if (!midis.length) return;
    const gen = chordGen;
    if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
    if (gen !== chordGen) return;   // 기다리는 사이 하드컷됨(문제 전환·이탈) → 이 소리는 이전 맥락 소리라 내지 않음(CLAUDE.md 0-7)
    GuitarAudio.strumNotes(midis, 0.008);
  }
  // ③ 빈칸형 정답 진행 소리(D13과 같음 — 120 BPM 코드당 2박, 문제 진입 후 자동 1회, 스피커를 다시 누르면 멈춤)
  const PLAY_STEP_SEC = 60 / 120 * 2, AUTOPLAY_MS = 250;
  const play = { gen: 0, on: false, timer: null, auto: null };
  function playProg() {
    if (play.on) { stopSound(); return; }
    const it = cur();
    if (!qz || it.type !== 'dfill' || typeof GuitarAudio === 'undefined') return;
    const names = it.prog.map(function (c, i) { return i === it.target && !it.reverse ? it.answer : c; });
    const gen = ++play.gen;
    Promise.resolve().then(function () { return GuitarAudio.resume && GuitarAudio.resume(); }).then(function () { return GuitarAudio.ready && GuitarAudio.ready(); }).catch(function () {}).then(function () {
      if (gen !== play.gen || !qz || qz.quit || qz.over || cur() !== it) return;   // 기다리는 사이 정리·이탈·문제 전환
      const t0 = Tone.now() + 0.08, V = it.key === 'D' ? VOICINGS_D : VOICINGS;
      names.forEach(function (c, i) { GuitarAudio.strumAt(fretsToMidis(V[c]), 0.012, t0 + i * PLAY_STEP_SEC, PLAY_STEP_SEC * 0.92, 0.35); });
      play.on = true;
      const btn = $('jq-content').querySelector('.combo-v2-speaker');
      if (btn) btn.classList.add('is-playing');
      play.timer = setTimeout(function () { play.on = false; play.timer = null; if (btn) btn.classList.remove('is-playing'); }, names.length * PLAY_STEP_SEC * 1000 + 400);
    });
  }
  // 하드컷(CLAUDE.md 0-7) — 문제 전환·보기 고르기·제출·다시 풀기·오답풀이 진입·완주·이탈. 코드 소리 자동 재생·진행 소리 예약도 함께
  function playQ(it) { playChord(it.chord); }
  function stopSound() {
    clearTimeout(autoTimer); autoTimer = null;
    chordGen++;
    play.gen++;
    clearTimeout(play.timer); clearTimeout(play.auto);
    play.timer = play.auto = null; play.on = false;
    document.querySelectorAll('#jq-content .combo-v2-speaker.is-playing').forEach(function (el) { el.classList.remove('is-playing'); });
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  function autoPlay(it) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      autoTimer = null;
      if (!qz || qz.judged || qz.quit || qz.over || cur() !== it) return;
      playQ(it);
    }, 180);
    const card = $('jq-content').querySelector('.ms-quiz-question-card');
    if (card) card.addEventListener('pointerup', function () { if (qz && !qz.over && cur() === it) playQ(it); });
  }

  let pairSel = null, pairs = [], dfSel = null, b7Miss = [];
  function render() {
    stopSound();   // 앞 문제 소리·예약을 하드컷 — 새 문제는 무음에서 시작(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    fillSel = {}; pairSel = null; pairs = []; dfSel = null; b7Miss = [];
    $('jq-title').textContent = it.type === 'dfill' && it.reverse ? QZ_TITLES.dfillRev : QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'pick' && it.variant === 'd2n') {   // 다이어그램을 보고 이름 고르기(D11과 같음)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard jq-qcard--diag n5q-card"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button>' + diagCard(it.chord) + '<span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 이름을 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div></div>';
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], chords()[it.chord].order, Math.min(box.clientWidth - 64, 240));
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'pick') {   // 이름을 보고 다이어그램 고르기(D11과 같음)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard n5q-card"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button><span class="ms-quiz-question-name">' + it.chord + '</span><span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag jq-cq-choices--diag4">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '"><div class="ms-quiz-choice-canvas-slot">' + diagCard(c) + '</div></div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n3q-cv').forEach(function (cv) {
        const c = chords()[cv.dataset.chord];
        paint(cv, c, c.order.length, false, false, Math.max(60, Math.floor(cv.parentNode.clientWidth)), null, 40);
      });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'fill') {   // 점 찍기(D11과 같음)
      box.innerHTML = infoCard(it.chord + '코드의', '빠진 점을', '찍어주세요') +
        '<div class="jq-board"><div class="n3q-wrap" id="n3q-wrap">' + diagCard(it.chord) + '<div class="n3q-dots" id="n3q-dots"></div></div></div>';
      const w = Math.min(box.clientWidth, QD_W);
      $('n3q-wrap').style.width = w + 'px';
      $('n3q-wrap').style.setProperty('--n3q-w', w + 'px');
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], it.given, w, it.givenOpen);
      $('n3q-wrap').addEventListener('click', fillTap);
      fillDots();   // 오답풀이면 앞서 맞힌 점을 정답색으로
    } else if (it.type === 'b7') {   // b7 찾기(D12 3음 찾기와 같은 화면)
      box.innerHTML = infoCard(it.chord + '코드에서', 'b7음을', '찾아 눌러주세요') +
        '<div class="jq-board"><div class="n3q-wrap" id="n3q-wrap"><canvas class="n3q-cv"></canvas><div class="n3q-dots" id="n3q-dots"></div></div></div>';
      const w = Math.min(box.clientWidth, QD_W);
      $('n3q-wrap').style.width = w + 'px';
      $('n3q-wrap').style.setProperty('--n3q-w', w + 'px');
      paintB(box.querySelector('.n3q-cv'), chords()[it.chord], w);
      $('n3q-wrap').addEventListener('click', b7Tap);
    } else if (it.type === 'pair') {   // ③ 연결형(D13과 같음)
      const col = function (side) {
        return '<div class="combo-v2-pair-col" data-side="' + side + '">' + it[side].map(function (d) {
          return '<button type="button" class="combo-v2-pair-card cd-card" data-pair="' + d + '">' + (side === 'left' ? nm(DIA.filter(function (x) { return x.deg === d; })[0].chord, it.key) : roman(d)) + '</button>';
        }).join('') + '</div>';
      };
      box.innerHTML = infoCard((it.key || 'C') + ' key 다이어토닉 코드를', '', '짝지어 주세요') + '<div class="combo-v2-pairs jq-pairs">' + col('left') + col('right') + '</div>';
      box.querySelector('.jq-pairs').addEventListener('click', function (e) { const c = e.target.closest('.combo-v2-pair-card'); if (c && !c.classList.contains('is-ok')) pairTap(c); });
    } else {   // ③ 빈칸형(D13과 같음)
      const blanks = it.prog.map(function (c, i) {
        const t = i === it.target, deg = degOfChord(c);
        return '<div class="combo-v2-blank ' + (t ? 'is-target' : 'is-fixed') + '"><div class="combo-v2-blank-slot">' + (t ? '' : '<span class="combo-v2-fixed-text">' + (it.reverse ? roman(deg) : nm(c, it.key)) + '</span>') + '</div>' +
          '<div class="combo-v2-blank-deg' + (it.reverse ? ' is-chord' : '') + '">' + (it.reverse ? nm(c, it.key) : roman(deg)) + '</div></div>';
      }).join('');
      box.innerHTML = infoCard((it.key || 'C') + ' key 다이어토닉 코드에서', '', it.reverse ? '빈칸에 알맞은 도수를 채워주세요' : '빈칸에 알맞은 코드를 채워주세요', true) +
        '<div class="combo-v2-blanks-wrap"><div class="combo-v2-blanks" id="jq-blanks">' + blanks + '</div></div>' +
        '<div class="combo-v2-choices" id="jq-choices">' + it.choices.map(function (v) { return '<button type="button" class="combo-v2-chip combo-v2-chip--choice cd-card" data-v="' + v + '">' + fmt(v, it.reverse, it.key) + '</button>'; }).join('') + '</div>';
      box.querySelector('.combo-v2-speaker').addEventListener('click', playProg);
      $('jq-choices').addEventListener('click', function (e) { const b = e.target.closest('.combo-v2-chip--choice'); if (b) dfChoose(b); });
      play.auto = setTimeout(function () { play.auto = null; if (qz && !qz.judged && cur() === it) playProg(); }, AUTOPLAY_MS);
    }
    qBtn('제출하기', false);
  }

  // ── 피크 — 답할 때 1개 차감(사용자 지정 2026-11-12: 문제가 나올 때가 아니라 답을 낼 때. 진입만으로는 빠지지 않음) ──
  //  문제를 보여 줄 때는 빼지 않고 잔액만 미리 확인 → 0이면 그 문제 대신 '피크가 부족해요' + 공용 완충 모달(답을 다 고른 뒤 막히지 않게)
  //  답하는 순간(찾아 누르기 = 누를 때, 사지선다·짝 = 제출할 때) 차감. 서버 차감(consumePeak)은 답과 함께 보내고 채점은 기다리지 않음(문제마다 멈칫하지 않게)
  //  본 문제 한 문제당 한 번만(paid — 이어 풀기 때도 다시 안 뺌), 오답풀이·Pro는 없음
  function peakAvail() {
    if (typeof _peakState === 'undefined') return Infinity;
    return (_peakState.balance || 0) + (typeof _peakRefundPending === 'function' ? _peakRefundPending() : 0);
  }
  function needsPay() { return qz.phase === 'main' && !qz.paid[qz.idx] && !isPro(); }
  function payOnAnswer() {
    if (!needsPay()) return;
    qz.paid[qz.idx] = true;
    if (typeof consumePeakInQuiz === 'function') consumePeakInQuiz(1, 'journey');   // 대기분 먼저·부족 모달 없음(shared.js) — 부족 안내는 render의 화면 숫자 판정에서만
    peakPop('−1');
  }
  function showShort() {
    qz.short = true;
    if (typeof openPeakBuffer === 'function') openPeakBuffer('journey');
    $('jq-title').textContent = QZ_TITLES[cur().type];
    $('jq-review-badge').hidden = true;
    $('jq-content').innerHTML = infoCard('피크가 부족해요', '', '충전한 뒤 이어서 풀 수 있어요');
    qBtn('이어서 풀기', true);
  }
  // 피크 연출 — 리하모니 화성학(chord-combo.js _comboV2PeakPop)과 같은 코드: 탑바 피크 개수가 통통 튀고 아래로 글자가 떠올랐다 사라짐.
  //  환급은 리하모니와 같이 '+N'(노랑, .combo-v2-peak-plus). 소모는 리하모니엔 퀴즈 중 연출이 없어(입장할 때 한 번에 냄) 같은 연출에 '−N'만 바꿔 씀
  function peakPop(text) {
    const pill = $('topbar-currency');
    if (!pill) return;
    pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    const r = pill.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'combo-v2-peak-plus';
    el.textContent = text;
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = r.bottom + 'px';
    document.body.appendChild(el);
    const a = el.animate([
      { opacity: 0, transform: 'translate(-50%, 0)' },
      { opacity: 1, transform: 'translate(-50%, 6px)', offset: 0.25 },
      { opacity: 0, transform: 'translate(-50%, 22px)' },
    ], { duration: 900, easing: 'ease-out' });
    a.onfinish = a.oncancel = function () { el.remove(); };
  }
  function cardJudge(b) {
    if (!qz || qz.judged) return;
    stopSound();   // 보기를 고르면 문제 소리는 바로 끊음
    const it = cur(), ok = b.dataset.v === it.answer;
    $('jq-content').querySelectorAll('.ms-quiz-choice-card').forEach(function (c) {
      if (c.dataset.v === it.answer) c.classList.add('ms-quiz-choice-card--correct');
      else if (c === b) c.classList.add('ms-quiz-choice-card--wrong');
    });
    $('jq-content').querySelector('.jq-cq-choices').classList.add('is-locked');
    verdict(ok);
  }
  // ── 점 찍기 — 다이어그램의 칸(1~4프렛 × 6줄)을 누르면 점 + 그 자리 소리, 같은 자리를 다시 누르면 지움. 한 줄에는 점 하나(다른 프렛을 누르면 옮겨 감).
  //  이미 찍혀 있는 줄은 건드릴 수 없음. 칸 위치는 voicing-canvas.js 기준 치수(기준 폭 440×352): 프렛 칸 폭 60·시작 x 105 / 줄 간격 38.4·1번줄 y 80 / 점 지름 36.48(= 폭의 8.29%)
  let fillSel = {};   // 줄(1~6) → 찍은 프렛
  function givenStrings(it) { const c = chords()[it.chord], o = {}; it.given.forEach(function (n) { const sp = fingerSpan(c, n); for (let s = sp[0]; s <= sp[1]; s++) if (c.fing[s] === n) o[s + 1] = true; }); (it.givenOpen || []).forEach(function (st) { o[st] = true; }); return o; }   // 바레 손가락은 덮는 줄 전부
  function fillPos(e) {
    const r = $('n3q-wrap').querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const f = bx < QD.x0 ? (bx >= QD.x0 - 70 ? 0 : -1) : Math.floor((bx - QD.x0) / QD.fw) + 1, s = Math.round((by - QD.y0) / QD.sh) + 1;   // 너트 왼쪽 개방현 칸(70px) = 프렛 0
    return f < 0 || f > VoicingCanvas.FRETS || s < 1 || s > 6 ? null : [s, f];
  }
  function dotHtml(s, f, cls, label) {
    return '<span class="n3q-dot ' + cls + (f === 0 ? ' is-open' : '') + '" data-s="' + s + '" style="left:' + (f === 0 ? QD.x0 - 35 : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%;top:' + (QD.y0 + (s - 1) * QD.sh) / VoicingCanvas.BASE_H * 100 + '%;width:' + QD.dot * (f === 0 ? 1.05 : 1) / VoicingCanvas.BASE_W * 100 + '%">' + (label || '') + '</span>';
  }
  function fillDots() {
    $('n3q-dots').innerHTML = keptHtml(cur()) + Object.keys(fillSel).map(function (s) { return dotHtml(+s, fillSel[s], ''); }).join('');
  }
  // 오답풀이 — 앞서 맞힌 점(본 문제·앞선 다시 풀기)은 정답색으로 남겨 두고 다시 누를 수 없게, 나머지 자리만 찍게 함(사용자 지정 2026-11-21 — CLAUDE.md 0-8 '틀린 그 지점에서 교정')
  function fillKept(it) { return qz && qz.phase === 'review' && it.kept ? it.kept : []; }
  function keptStrings(it) { const o = {}; fillKept(it).forEach(function (k) { o[k.split('-')[0]] = true; }); return o; }
  function keptHtml(it) { const fing = chords()[it.chord].fing; return fillKept(it).map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', ''); }).join(''); }
  function fillTap(e) {
    if (!qz || qz.judged) return;
    const p = fillPos(e), it = cur();
    if (!p || givenStrings(it)[p[0]] || keptStrings(it)[p[0]]) return;
    if (fillSel[p[0]] === p[1]) delete fillSel[p[0]];
    else { fillSel[p[0]] = p[1]; J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6); }
    fillDots();
    qBtn('제출하기', Object.keys(fillSel).length > 0);
  }
  // 제출 — 빠진 점을 정확히 그 자리에 전부 찍었을 때만 정답. 표시: 맞은 점 초록(--ok) / 틀린 점 빨강(--ng) / 못 찾은 자리 점선 원(--miss)
  function fillJudge() {
    const it = cur(), picked = Object.keys(fillSel).map(function (s) { return s + '-' + fillSel[s]; });
    const kept = fillKept(it);   // 남겨 둔 점(오답풀이) — 찍은 점과 합쳐 빠진 자리를 전부 채우면 정답
    const ok = picked.every(function (k) { return it.ans.indexOf(k) >= 0; }) && it.ans.every(function (k) { return picked.indexOf(k) >= 0 || kept.indexOf(k) >= 0; });
    it.kept = (it.kept || []).concat(picked.filter(function (k) { return it.ans.indexOf(k) >= 0 && (it.kept || []).indexOf(k) < 0; }));   // 맞힌 점 기록(오답풀이에서 남김)
    let h = kept.map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', ''); }).join('');
    // 채점 뒤 정답 자리에도 손가락 번호는 쓰지 않음(사용자 지정 2026-11-16 — 노드11은 번호 생략)
    picked.forEach(function (k) { const sf = k.split('-'), hit = it.ans.indexOf(k) >= 0; h += dotHtml(+sf[0], +sf[1], hit ? 'is-ok' : 'is-ng', ''); });
    it.ans.forEach(function (k) { if (picked.indexOf(k) < 0 && kept.indexOf(k) < 0) { const sf = k.split('-'); h += dotHtml(+sf[0], +sf[1], 'is-miss', ''); } });
    $('n3q-dots').innerHTML = h;
    verdict(ok);
    if (ok) barreSettle(it);
  }
  // F 바레 — 정답이면 찍은 두 점(1·2번줄)이 바레 막대로 바뀜(사용자 지정: 제출 전엔 점만). 정답 점을 잠깐 보여 준 뒤 다이어그램을 손가락까지 다시 그리고(막대) 그 줄의 점은 사라짐
  const BARRE_SETTLE_MS = 500;
  function barreSettle(it) {
    const c = chords()[it.chord];
    const bf = c.order.filter(function (n) { const sp = fingerSpan(c, n); return it.given.indexOf(n) < 0 && sp[1] > sp[0]; });
    if (!bf.length) return;
    const strs = [];
    bf.forEach(function (n) { const sp = fingerSpan(c, n); for (let s = sp[0]; s <= sp[1]; s++) if (c.fing[s] === n) strs.push(s + 1); });
    const tok = qz;
    setTimeout(function () {
      const wrap = $('n3q-wrap');
      if (qz !== tok || qz.quit || qz.over || cur() !== it || !wrap) return;   // 그 사이 다음 문제·이탈
      const cv = wrap.querySelector('canvas');
      paintQ(cv, c, it.given.concat(bf), parseFloat(cv.style.width));
      $('n3q-dots').querySelectorAll('.n3q-dot').forEach(function (el) { if (strs.indexOf(+el.dataset.s) >= 0) el.classList.add('is-gone'); });
    }, BARRE_SETTLE_MS);
  }
  // ② b7 찾기 — 소리 나는 자리(누르는 점 = 그 프렛 칸, 개방현 = 너트 왼쪽 O 자리)를 누르면 그 음이 울리고 바로 채점(D12 thirdTap과 같음).
  //  오답풀이(CLAUDE.md 0-8): 틀리면 그 점만 빨강으로 남기고(정답은 보여 주지 않음) 같은 화면에서 맞힐 때까지. 틀린 점의 빨강은 맞힌 뒤에도 유지
  function b7Pos(e, c) {
    const r = $('n3q-wrap').querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const s = Math.round((by - QD.y0) / QD.sh);
    if (s < 0 || s > 5 || c.frets[s] == null) return -1;
    const f = c.frets[s], lo = f === 0 ? QD.ox - QD.fw / 2 : QD.x0 + (f - 1) * QD.fw, hi = f === 0 ? QD.x0 : QD.x0 + f * QD.fw;
    return bx >= lo && bx <= hi ? s : -1;
  }
  function b7Tap(e) {
    if (!qz || qz.judged) return;
    const it = cur(), c = chords()[it.chord], s = b7Pos(e, c);
    if (s < 0) return;
    J.note(OPEN_MIDI[s] + c.frets[s], J.audioT0(), 1.4, 0.6);   // 누른 자리 음(틀려도)
    const ans = b7Str(c), ok = s === ans, cv = $('n3q-wrap').querySelector('canvas');
    if (qz.phase === 'review' && !ok) {
      if (b7Miss.indexOf(s) < 0) b7Miss.push(s);
      const col = [null, null, null, null, null, null];
      b7Miss.forEach(function (x) { col[x] = '#FF3B30'; });
      paintB(cv, c, parseFloat(cv.style.width), col);
      setTimeout(function () { if (qz && !qz.quit && !qz.judged) judgeSound(false); }, 250);
      return;
    }
    const col = colorAt(ans, '#34C759');   // 정답 초록 · 누른 오답 빨강 — 점(개방현은 O 대신 채운 점) 자체를 칠함
    if (!ok) col[s] = '#FF3B30';
    b7Miss.forEach(function (x) { col[x] = '#FF3B30'; });
    paintB(cv, c, parseFloat(cv.style.width), col);
    verdict(ok, 250);
  }
  // ③ 연결형 — D13과 같은 조작(카드 탭 → 반대편 카드 탭 = 짝, 짝을 다시 탭하면 풀림, 다 짝지으면 제출)
  const PAIR_COLORS = ['var(--icon-blue)', 'var(--icon-purple)', 'var(--icon-yellow)', 'var(--icon-pink)'];
  function pairTap(card) {
    if (qz.judged) return;
    if (typeof _playConfirmSfx === 'function') _playConfirmSfx();
    const side = function (c) { return c.parentNode.dataset.side; };
    const ex = pairs.find(function (p) { return p.a === card || p.b === card; });
    if (ex) {
      [ex.a, ex.b].forEach(function (c) { c.classList.remove('is-paired'); c.style.removeProperty('--pair-c'); });
      pairs.splice(pairs.indexOf(ex), 1);
    } else if (pairSel && side(pairSel) !== side(card)) {
      const used = pairs.map(function (p) { return p.color; });
      const color = PAIR_COLORS.find(function (c) { return used.indexOf(c) < 0; }) || PAIR_COLORS[0];
      const a = side(card) === 'left' ? card : pairSel, b = a === card ? pairSel : card;
      [a, b].forEach(function (c) { c.classList.remove('is-sel'); c.classList.add('is-paired'); c.style.setProperty('--pair-c', color); });
      pairs.push({ a: a, b: b, color: color });
      pairSel = null;
    } else {
      if (pairSel) pairSel.classList.remove('is-sel');
      pairSel = card;
      card.classList.add('is-sel');
      return;
    }
    if (pairSel) { pairSel.classList.remove('is-sel'); pairSel = null; }
    qBtn('제출하기', pairs.length === cur().left.length);
  }
  function pairJudge() {
    let all = true;
    pairs.forEach(function (p) {
      const ok = p.a.dataset.pair === p.b.dataset.pair;
      if (!ok) all = false;
      [p.a, p.b].forEach(function (c) { c.classList.remove('is-paired'); c.classList.add(ok ? 'is-ok' : 'is-ng'); });
    });
    $('jq-content').querySelector('.jq-pairs').classList.add('is-locked');
    verdict(all);
  }
  // ③ 빈칸형 — 보기를 탭하면 빈칸에 칩(다른 보기 = 선택 변경), 제출하기로 채점(D13과 같음)
  function dfTarget(popped) {
    const it = cur(), slot = $('jq-blanks').querySelector('.is-target .combo-v2-blank-slot');
    slot.innerHTML = dfSel == null ? '' : '<div class="combo-v2-chip cd-card' + (popped ? ' combo-block--pop' : '') + '">' + fmt(dfSel, it.reverse, it.key) + '</div>';
  }
  function dfChoose(b) {
    if (qz.judged || b.classList.contains('is-miss') || b.dataset.v === dfSel) return;
    if (typeof _playConfirmSfx === 'function') _playConfirmSfx();
    dfSel = b.dataset.v;
    $('jq-choices').querySelectorAll('.combo-v2-chip--choice').forEach(function (c) { c.classList.toggle('is-sel', c === b); });
    dfTarget(true);
    qBtn('제출하기', true);
  }
  function dfJudge() {
    const it = cur(), ok = dfSel === it.answer;
    const chip = $('jq-blanks').querySelector('.is-target .combo-v2-chip');
    if (chip) chip.classList.add(ok ? 'is-ok' : 'is-ng');
    const deg = $('jq-blanks').querySelector('.is-target .combo-v2-blank-deg');
    if (deg) { if (!it.reverse) deg.innerHTML = roman(degOfChord(it.answer)); deg.classList.add(ok ? 'is-ok' : 'is-ng'); }
    $('jq-choices').classList.add('is-locked');
    verdict(ok);
  }
  // ③ 오답풀이 재도전(CLAUDE.md 0-8, D13과 같음) — 연결형은 맞힌 짝을 남기고 틀린 짝만 풀림, 빈칸형은 틀린 보기를 연한 오답색으로 막고 빈칸을 비움
  function retry() {
    stopSound();
    const it = cur();
    if (!$('jq-content').querySelector(it.type === 'pair' ? '.jq-pairs' : '#jq-blanks')) { render(); return; }   // 이어 풀기로 막 들어옴(화면이 없음)
    qz.judged = false;
    qz.canRetry = false;
    if (it.type === 'pair') {
      pairs = pairs.filter(function (p) {
        if (p.a.dataset.pair === p.b.dataset.pair) return true;
        [p.a, p.b].forEach(function (c) { c.classList.remove('is-ng'); c.style.removeProperty('--pair-c'); });
        return false;
      });
      $('jq-content').querySelector('.jq-pairs').classList.remove('is-locked');
    } else {
      $('jq-choices').querySelectorAll('.combo-v2-chip--choice').forEach(function (b) { if (b.dataset.v === dfSel) { b.classList.remove('is-sel'); b.classList.add('is-miss'); } });
      dfSel = null;
      $('jq-choices').classList.remove('is-locked');
      const deg = $('jq-blanks').querySelector('.is-target .combo-v2-blank-deg');
      if (deg) { deg.classList.remove('is-ok', 'is-ng'); if (!it.reverse) deg.innerHTML = roman(degOfChord(it.prog[it.target])); }
      dfTarget(false);
    }
    qBtn('제출하기', false);
  }

  function verdict(ok, delay) {
    payOnAnswer();
    qz.at = Date.now();   // 이어 풀기 기한(24시간)은 마지막으로 답한 때부터
    qz.judged = true;
    if (ok) qz.correct++;
    const due = ok && qz.correct % QZ_REFUND_EVERY === 0;   // 정답 5개째 — 환급은 정답음과 같은 순간에(아래 show)
    if (qz.phase === 'main') { if (!ok) qz.wrong.push(qz.idx); qz.done++; }
    else if (ok) qz.done++;
    qz.canRetry = qz.phase === 'review' && !ok;
    const last = qz.phase === 'review' ? (ok && qz.rvPos >= qz.wrong.length - 1) : (qz.idx >= qz.qs.length - 1 && !qz.wrong.length);
    sessSave();
    const show = function () {
      judgeSound(ok);
      qProgress();
      if (due) { refund(qzRefundAmount()); sessSave(); }   // (그 사이 새로고침돼 놓친 몫은 완주 때 맞춰 돌려줌)
      qBtn(qz.canRetry ? '다시 풀기' : last ? '완료' : '다음', true, ok);
    };
    if (!delay) { show(); return; }
    const tok = qz;
    setTimeout(function () { if (qz === tok && !qz.quit) show(); }, delay);
  }
  // 환급 — 대기분에 쌓고 화면 숫자만 바로 올림(서버는 완주·이탈 때 한 번에). 퀴즈 1회 환급 합계는 문제 수 − 순소모(5문제당 1)를 넘지 않음
  function refund(n) {
    if (isPro()) return;
    const room = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const amt = Math.min(n, room);
    if (amt <= 0 || typeof addPendingRefund !== 'function') return;
    if (addPendingRefund(amt)) { qz.refunded += amt; peakPop('+' + amt); }
  }
  function next() {
    if (qz.short) { render(); return; }   // 피크 부족 → 이어서 풀기(다시 확인)
    if (!qz.judged) {   // 제출하기(점 찍기·연결형·빈칸형 — 맞추기·b7 찾기는 누르는 즉시 채점)
      const it = cur();
      if (it.type === 'fill' && Object.keys(fillSel).length) fillJudge();
      else if (it.type === 'pair') { stopSound(); pairJudge(); }
      else if (it.type === 'dfill' && dfSel != null) { stopSound(); dfJudge(); }
      return;
    }
    if (qz.canRetry) { const t = cur().type; if (t === 'pair' || t === 'dfill') retry(); else render(); return; }   // 오답풀이에서 또 틀림 — 같은 문제를 다시
    if (qz.phase === 'main') {
      if (qz.idx < qz.qs.length - 1) { qz.idx++; render(); return; }
      if (qz.wrong.length) { showIntro(); return; }
    } else if (qz.rvPos < qz.wrong.length - 1) { qz.rvPos++; render(); return; }
    showClear();
  }

  // ── 오버레이 — 리하모니 화성학(chord-combo.js)과 같은 시스템: 오답풀이 안내 / 완주(트로피·칭찬·색종이) ──
  //  .combo-v2-seq 요소를 순서대로 하나씩(다음 요소는 앞 요소의 animationend 뒤). 이탈은 overlayAbort가 즉시 정리
  const SEQ_GAP_MS = 150, INTRO_GAP_MS = 900, INTRO_HOLD_MS = 2000;   // 리하모니 COMBO_V2_SEQ_GAP_MS·INTRO_GAP_MS·INTRO_HOLD_MS와 같은 값
  let seqRun = null, ovTok = 0;
  function seqStop() { if (seqRun) { seqRun.stopped = true; clearTimeout(seqRun.timer); } seqRun = null; }
  //  seq.el = 지금 등장 중인 요소 / seq.fire = 기다리는 중인 다음 일(다음 요소 또는 마지막 hold 뒤 onDone) — 터치 스킵(seqSkip)이 씀. fire는 한 번만 실행(arm)
  function seqPlay(scene, hold, onDone, gap) {
    seqStop();
    const seq = { timer: null, stopped: false, el: null, fire: null };
    seqRun = seq;
    const els = Array.prototype.filter.call(scene.querySelectorAll('.combo-v2-seq'), function (el) { return !el.hidden; });
    els.forEach(function (el) { el.classList.remove('is-in'); });
    let i = 0;
    const arm = function (fn, ms) { seq.fire = function () { seq.fire = null; clearTimeout(seq.timer); if (!seq.stopped) fn(); }; seq.timer = setTimeout(seq.fire, ms); };
    const nextEl = function () {
      if (seq.stopped) return;
      seq.el = null;
      if (i >= els.length) { arm(function () { if (onDone) onDone(); }, hold); return; }
      const el = els[i++];
      seq.el = el;
      const after = function () {
        if (seq.stopped || seq.el !== el) return;
        seq.el = null;
        const g = gap == null ? SEQ_GAP_MS : gap;
        if (i >= els.length) arm(function () { if (onDone) onDone(); }, g + hold);   // 마지막 요소 뒤 = 간격 + hold를 한 번에(시간은 예전과 같음) — 터치 스킵에서 눈에 안 보이는 빈 단계가 생기지 않게
        else arm(nextEl, g);
      };
      el.addEventListener('animationend', function h(e) { if (e.target !== el) return; el.removeEventListener('animationend', h); after(); });
      el.classList.add('is-in');
      if (getComputedStyle(el).animationName === 'none') after();
    };
    nextEl();
  }
  // 터치 스킵(사용자 지정 2026-11-15) — 오답풀이 안내·완주 화면을 누르면 한 단계씩: 등장 중인 요소는 애니메이션을 끝 상태로(→ animationend로 다음 대기),
  //  다음 요소·마지막 hold를 기다리는 중이면 기다림 없이 바로 다음으로. 여러 번 눌러야 끝까지 감
  function seqSkip() {
    const seq = seqRun;
    if (!seq || seq.stopped) return;
    if (seq.el) {
      seq.el.getAnimations().forEach(function (a) { try { a.finish(); } catch (e) {} });   // 끝 상태로 → animationend(비동기로 도착) → after가 다음 대기를 걸음
      return;
    }
    if (seq.fire) seq.fire();
  }
  function overlayShow(sceneId) {
    const ov = $('combo-v2-overlay');
    ovTok++;
    ov.classList.remove('is-out', 'combo-v2-overlay--exit');
    ov.hidden = false;
    ov.querySelectorAll('.combo-v2-scene').forEach(function (el) { el.hidden = el.id !== sceneId; });
    return $(sceneId);
  }
  function overlayFade() {
    const ov = $('combo-v2-overlay');
    if (ov.hidden) return;
    const tok = ++ovTok;
    ov.classList.add('is-out');
    ov.addEventListener('animationend', function h(e) {
      if (e.target !== ov) return;
      ov.removeEventListener('animationend', h);
      if (tok !== ovTok) return;
      ov.hidden = true;
      ov.classList.remove('is-out');
    });
  }
  function overlayAbort() {
    seqStop();
    ovTok++;
    const ov = $('combo-v2-overlay');
    if (!ov) return;
    ov.hidden = true;
    ov.classList.remove('is-out', 'combo-v2-overlay--exit');
    ov.querySelectorAll('.combo-v2-seq').forEach(function (el) { el.classList.remove('is-in'); });
    document.querySelectorAll('.combo-v2-confetti').forEach(function (el) { el.remove(); });
  }
  // 오답풀이 안내 — 끝나면 틀린 첫 문제를 오버레이 아래에 그려 두고 오버레이가 걷히며 드러남.
  //  피크: 남은 환급이 있으면 '오답을 모두 풀면 사용한 피크를 돌려받아요'(개수는 쓰지 않음 — 사용자 지정), Pro·남은 환급 없음은 '이제 오답풀이예요'
  function showIntro() {
    stopSound();   // 오답풀이 진입 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    const remain = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const usePeak = !isPro() && remain > 0;
    document.querySelectorAll('#combo-v2-intro [data-peak]').forEach(function (el) { el.hidden = !usePeak; });
    $('combo-v2-intro-title-pro').hidden = usePeak;
    qz.phase = 'review'; qz.rvPos = 0; qz.judged = false; qz.canRetry = false;
    sessSave();
    const scene = overlayShow('combo-v2-intro');
    seqPlay(scene, INTRO_HOLD_MS, function () {
      render();
      overlayFade();
    }, INTRO_GAP_MS);
  }
  // 완주 — 별 저장(이 기기 localStorage jnyStars), 나머지 피크 환급, 트로피·칭찬·색종이. 돌아가기 → 홈
  function showClear() {
    qz.over = true;
    starsSet(qz.star);
    sessClear();
    refund(qz.qs.length);   // 남은 몫이 있으면 한꺼번에(합계 = 문제 수 − 순소모) — 보통은 정답 5개마다 이미 다 받음
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();   // 완주 화면 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    $('combo-v2-clear-title').textContent = '완주!';
    $('combo-v2-clear-level').textContent = '도미넌트7 코드 · 퀴즈 ' + qz.star;
    $('combo-v2-clear-refund').hidden = isPro() || !qz.refunded;
    $('combo-v2-clear-praise').textContent = qz.wrong.length ? '틀린 문제도 끝까지 풀어냈어요. 정말 잘했어요!' : '한 문제도 안 틀렸어요. 완벽해요!';
    const scene = overlayShow('combo-v2-clear');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
    seqPlay(scene, 0, null);
    confetti();
    J.setQuizBack(J.goHome);
  }
  function confetti() {
    const ov = $('combo-v2-overlay'), trophy = document.querySelector('#combo-v2-clear .combo-v2-clear-trophy');
    if (!ov || !trophy) return;
    const o = ov.getBoundingClientRect(), t = trophy.getBoundingClientRect();
    const cx = t.left + t.width / 2 - o.left, cy = t.top + t.height / 2 - o.top;
    const colors = ['var(--icon-purple)', 'var(--icon-green)', 'var(--icon-coral)', 'var(--icon-blue)', 'var(--icon-yellow)', 'var(--icon-pink)'];
    for (let k = 0; k < 18; k++) {
      const d = document.createElement('div');
      d.className = 'combo-v2-confetti';
      d.style.left = cx + 'px'; d.style.top = cy + 'px'; d.style.background = colors[k % colors.length];
      ov.appendChild(d);
      const ang = (Math.PI * 2 * k) / 18 + Math.random() * 0.3, dist = 90 + Math.random() * 80;
      const a = d.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px, ' + (Math.sin(ang) * dist + 40) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 },
      ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: 250, fill: 'both' });
      a.onfinish = a.oncancel = function () { d.remove(); };
    }
  }

  function startQuiz() {
    const star = window.JourneyLesson.quizStar(starsGet());   // 순차: 다음 별(별 3 이후엔 별 3 반복)
    qz = { star: star, qs: makeQuestions(star), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false, at: Date.now() };
    const saved = sessLoad();
    if (saved) SESS_FIELDS.forEach(function (k) { if (saved[k] !== undefined) qz[k] = saved[k]; });
    if (typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_started', NODE_ID, qz, { resumed: !!saved });   // 실험 분석(2026-11-27)
    $('jq-track').hidden = false;
    $('jq-fill').style.width = '0%';
    $('jq-btn').onclick = function () { if (qz.over) return; next(); };
    $('combo-v2-clear-btn').onclick = function () { if (typeof _playConfirmSfx === 'function') _playConfirmSfx(); J.goHome(); };
    $('combo-v2-overlay').onclick = function (e) { if (!e.target.closest('button')) seqSkip(); };   // 오답풀이 안내·완주 화면 터치 = 한 단계씩 스킵(돌아가기 버튼은 제외)
    J.setQuizBack(function () {
      if (qz.phase === 'review') { quitQuiz(); J.goHome(); return; }   // 오답풀이 중엔 낸 피크가 없어 확인 없이
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;
      showLeavePracticeModal(function () { quitQuiz(); J.goHome(); }, { title: '퀴즈를 그만두시겠어요?', desc: '지금 나가도 24시간 안에 돌아오면<br>이어서 풀 수 있어요.' });
    });
    if (saved) {
      qProgress();
      if (qz.judged) next(); else render();   // 채점이 끝난 문제였으면 그다음으로(오답풀이 재도전이면 같은 문제)
    } else render();
    $('jq-view').classList.remove('quiz-view--right');   // 리하모니와 같은 전환 — 오른쪽에서 들어옴
  }
  // 직접 그만두기(X → 그만할래요, 오답풀이 중 X) — 이어 풀기 저장(24시간) 후 정리. 울리는 기타 소리 하드컷(CLAUDE.md 0-2)
  function quitQuiz() {
    clearTimeout(autoTimer); autoTimer = null;   // 예약된 자동 재생 취소(이탈 — CLAUDE.md 0-2)
    chordGen++;   // 늦게 도착하는 코드 소리도 취소
    sessSave();   // 어떤 경로로 나가도 이어 풀기 저장(24시간)
    if (qz && !qz.over && !qz.quit && typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_left', NODE_ID, qz, { reason: 'exit' });
    if (qz) qz.quit = true;   // 늦게 오는 정답·오답음 막음
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');   // 이미 받은 도중 환급은 서버에 반영(회수하지 않음 — §1-5)
    overlayAbort();
    stopSound();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    if (!qz.quit && typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_left', NODE_ID, qz, { reason: 'background' });   // 직접 나간 뒤의 pagehide는 빼고
    clearTimeout(autoTimer); autoTimer = null;
    chordGen++;   // 백그라운드 — 늦게 도착하는 코드 소리 취소
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });



  J.register('dominant7', { layers: (SOLO ? ['n12-lkb'] : []).concat(['n14-grid', 'n14-dg', 'n14-all']), steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 13 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
