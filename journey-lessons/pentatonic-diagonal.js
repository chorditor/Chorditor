// ───────────────────────────────────────────────────────────
// 여정 노드: 펜타토닉 대각 연결 (코드반주 D21 — 여정의 마지막 노드, 사용자 지정 2026-11-20)
//   목표: 펜타토닉의 두 대각 패턴으로 스케일 블럭을 잇는 감각(강의). 여정 전체 복습(기초 코드 9 + 도미넌트7 · 주법 · 다이어토닉 · 펜타토닉)은 퀴즈로만 — 강의 총정리는 하지 않음(사용자 지정 2026-11-20)
//   패턴(C key, 검지·약지만 — 한 줄의 두 음은 늘 프렛 차이 2(눈에 보이는 칸 1칸), 세 번째 음은 약지 슬라이드 → 다음 줄 첫 음에 검지가 닿음. 2번줄만 검지가 한 칸 더):
//     패턴1 = 6번줄 3프렛부터 2개 → 3개 반복(G A / C D E)
//     패턴2 = 6번줄 8프렛(근음 C)부터 3개 → 2개 반복(C D E / G A). 어떤 블럭을 지나가는지는 설명하지 않음(사용자 지정 2026-11-20)
//     두 패턴을 넘어갈 땐 어느 줄이든 항상 프렛 차이 3 = 눈에 보이는 칸 2칸(덩어리 경계 E→G, A→C = 단3도). 강의는 보이는 칸으로 셈(사용자 지정 2026-11-23)
//   시연만(따라 하기 없음 — 사용자 지정), 상행·하행 모두. 마지막 칸은 패턴·코드진행을 화살표로 넘기며 자유 연주(한 칸 — 사용자 지정)
//   지판 창 = 패턴이 있는 프렛만(사용자 지정 2026-11-20): 패턴1 3~12 · 패턴2 8~17(10칸), 두 패턴 같이 5~15(11칸)
//   소리 = 레가토는 D15 legato와 같은 J.note, 슬라이드가 든 음만 주법 경로(artNote·artSlide — D20과 같음). 반주 = D15~D19 자유 연주와 같은 BackingTrack '기본1'
//   단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석, 강의 지연은 J.wait/J.later(엔진 타이머)만
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const FADE_MS = J.FADE_MS;

  // ── 코드 데이터 — 기초 9가지 + 도미넌트7 여섯 코드(D14와 같은 운지). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
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
      G7: mk('G7', [1, null, null, null, 2, 3]), A7: mk('A7', [null, 3, null, 2, null, null]), B7: mk('B7', [4, null, 3, 1, 2, null]) };   // D14 운지
    return CHORDS;
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
  // 줄 선택(D11과 같음): 'all'(기본) 6→1번줄 / 'w4' 1~4번줄 / 'l3' 6~4번줄 / 'u3' 1~3번줄(업). 안 울리는 줄(X)은 뺌
  function strokeMidis(c, kind) {
    kind = kind || 'all';
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : kind === 'w4' ? [3, 2, 1, 0] : kind === 'l3' ? [5, 4, 3] : [0, 1, 2];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  // 다이어토닉 소리 — 오픈 보이싱(줄 6→1, -1 = 안 침). 열쇠 = C key 이름(5도는 G7) — D14와 같음
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

  // ── 주법 — D11(money-calypso.js)과 같은 데이터·소리·칸 마크업. s = 칸(D 다운 / U 업 / - 헛 스트로크), acc = 강세 칸, g = 굵은 구분선 간격, cell = 한 칸 길이(ms) ──
  const Q70 = 60000 / 70, DQ50 = 60000 / 50;
  const PATS = {
    ca: { s: 'D-DU-UDU', acc: [], g: 2, cell: Q70 / 2, tr: true },
    w3: { s: 'DDD', acc: [0], g: 0, cell: Q70 },
    w6: { s: 'D-DUDU', acc: [0], g: 2, cell: Q70 / 2 },
    s6: { s: 'DDDDDD', acc: [0, 3], g: 3, cell: DQ50 / 3 },
    s12: { s: 'D-DUD-D-DUD-', acc: [0, 6], g: 6, cell: DQ50 / 6 },
    d8: { s: 'DDDDDDDD', acc: [2, 6], g: 2, cell: Q70 / 2, weak: 'l3' },
    du: { s: 'DUDUDUDU', acc: [0, 4], g: 2, cell: Q70 / 2 },
    gh: { s: 'D-DUD-DU', acc: [0, 4], g: 2, cell: Q70 / 2 },
  };
  const PAT_IDS = ['d8', 'du', 'gh', 'ca', 'w3', 'w6', 's6', 's12'];   // 여정에서 배운 주법 8개(D9 3 · D11 칼립소 · D10 4) — 복습 칸 순서 = 퀴즈 주법 듣기 풀
  const TR_IV = 0.005, TR_REL = 0.1;   // 칼립소 소리 = 코드반주 훈련 값(D11과 같음)
  function strokeOf(p, i, accOn) {
    const ch = p.s.charAt(i), k = p.acc.indexOf(i), n = p.s.length;
    if (ch === '-') return null;
    if (p.tr) return [ch === 'U' ? 'u3' : 'all', undefined, (n - i) * p.cell, true];
    if (!p.acc.length) accOn = false;
    if (accOn && k >= 0) { const nx = k + 1 < p.acc.length ? p.acc[k + 1] : p.acc[0] + n; return ['all', 'acc', (nx - i) * p.cell]; }
    if (ch === 'U') return ['u3', 'weak', 0];
    return accOn ? [p.weak || 'w4', 'weak', 0] : ['all', undefined, 0];
  }
  // 빠르기(D11 퀴즈와 같음) — 4/4 90bpm / 3/4 100bpm / 6/8 50bpm
  const EAR_Q44 = 60000 / 90, EAR_Q34 = 60000 / 100;
  function earPat(p) {
    if (p.s.length === 8) return Object.assign({}, p, { cell: EAR_Q44 / 2 });
    if (p.s.length === 3 || (p.s.length === 6 && p.g === 2)) return Object.assign({}, p, { cell: EAR_Q34 * 3 / p.s.length });
    return p;
  }
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const ICON_DOWN = SVG_OPEN + '><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>';
  const ICON_UP = SVG_OPEN + ' stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>';
  const ICON_ACC = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 2 16 6 2 10"/></svg>';
  function sgridHtml(id, cls) { return '<div class="strum-play-grid n4-sg n9-sg' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '></div>'; }
  function setPat(g, p, accOn) {
    let cells = '', vms = '';
    for (let i = 0; i < p.s.length; i++) {
      const ch = p.s.charAt(i);
      cells += '<div class="strum-beat-cell"><span class="strum-ico' + (ch === '-' ? ' strum-ico--ghost' : '') + '">' + (ch === 'D' || (ch === '-' && i % 2 === 0) ? ICON_DOWN : ICON_UP) + '</span></div>';
      vms += '<span class="n4-vm n9-vm" data-i="' + i + '">' + ICON_ACC + '</span>';
    }
    g.innerHTML = vms + '<div class="strum-beat-grid' + (p.g ? ' strum-beat-grid--g' + p.g : '') + '">' + cells + '</div><div class="strum-playhead"></div>';
    g.classList.toggle('is-c12', p.s.length > 8);
    g.querySelectorAll('.n9-vm').forEach(function (el) { el.classList.toggle('is-in', accOn && p.acc.indexOf(+el.dataset.i) >= 0); });
    placeVm(g);
  }
  function placeVm(g) {   // 강세 기호를 칸 가운데 위에(구분선 굵기가 칸마다 달라 실측)
    const cs = g.querySelectorAll('.strum-beat-cell');
    g.querySelectorAll('.n9-vm').forEach(function (el) { const c = cs[+el.dataset.i]; if (!c) return; el.style.left = (c.offsetLeft + c.offsetWidth / 2) + 'px'; });
  }

  // ── 펜타토닉 다섯 폼(C key) — pentatonic-forms.js FORMS의 block과 같은 값. [줄, 프렛, 음이름, 도수, 손가락] 낮은 음부터 ──
  const FORMS = {
    G: [[6, 5, 'A', 6, 1], [6, 8, 'C', 1, 4], [5, 5, 'D', 2, 1], [5, 7, 'E', 3, 3], [4, 5, 'G', 5, 1], [4, 7, 'A', 6, 3], [3, 5, 'C', 1, 1], [3, 7, 'D', 2, 3], [2, 5, 'E', 3, 1], [2, 8, 'G', 5, 4], [1, 5, 'A', 6, 1], [1, 8, 'C', 1, 4]],
    C: [[6, 12, 'E', 3, 1], [6, 15, 'G', 5, 4], [5, 12, 'A', 6, 1], [5, 15, 'C', 1, 4], [4, 12, 'D', 2, 1], [4, 14, 'E', 3, 3], [3, 12, 'G', 5, 1], [3, 14, 'A', 6, 3], [2, 13, 'C', 1, 2], [2, 15, 'D', 2, 4], [1, 12, 'E', 3, 1], [1, 15, 'G', 5, 4]],
    A: [[6, 3, 'G', 5, 1], [6, 5, 'A', 6, 3], [5, 3, 'C', 1, 1], [5, 5, 'D', 2, 3], [4, 2, 'E', 3, 1], [4, 5, 'G', 5, 4], [3, 2, 'A', 6, 1], [3, 5, 'C', 1, 4], [2, 3, 'D', 2, 1], [2, 5, 'E', 3, 3], [1, 3, 'G', 5, 1], [1, 5, 'A', 6, 3]],
    E: [[6, 8, 'C', 1, 2], [6, 10, 'D', 2, 4], [5, 7, 'E', 3, 1], [5, 10, 'G', 5, 4], [4, 7, 'A', 6, 1], [4, 10, 'C', 1, 4], [3, 7, 'D', 2, 1], [3, 9, 'E', 3, 3], [2, 8, 'G', 5, 1], [2, 10, 'A', 6, 3], [1, 8, 'C', 1, 1], [1, 10, 'D', 2, 3]],
    D: [[6, 10, 'D', 2, 1], [6, 12, 'E', 3, 3], [5, 10, 'G', 5, 1], [5, 12, 'A', 6, 3], [4, 10, 'C', 1, 1], [4, 12, 'D', 2, 3], [3, 9, 'E', 3, 1], [3, 12, 'G', 5, 4], [2, 10, 'A', 6, 1], [2, 13, 'C', 1, 4], [1, 10, 'D', 2, 1], [1, 12, 'E', 3, 3]],
  };
  const FORM_KEYS = ['G', 'C', 'A', 'E', 'D'];
  function keyOf(n) { return n[0] + '-' + n[1]; }
  function midiOf(s, f) { return OPEN_MIDI[s - 1] + f; }
  // 폼의 지판 창 — 블럭 앞뒤로 한 칸씩 더(양 끝 칸은 흐리게 — D15와 같음). 누를 수 있는 칸 = 블럭 프렛 범위
  function formWin(F) {
    const fr = FORMS[F].map(function (n) { return n[1]; });
    const lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr);
    return { lo: lo - 1, cols: hi - lo + 3, minF: lo, maxF: hi, fade: true };
  }

  // ── 대각 패턴 — 줄마다 프렛 목록(낮은 음부터). 세 개인 줄의 세 번째 음 = 약지 슬라이드(sl). 손가락 = 첫 음 검지(1), 나머지 약지(3) ──
  const PC_NAME = { 0: 'C', 2: 'D', 4: 'E', 7: 'G', 9: 'A' };
  function patNotes(rows) {
    const out = [];
    rows.forEach(function (r) {
      r[1].forEach(function (f, i) {
        out.push({ s: r[0], f: f, k: r[0] + '-' + f, name: PC_NAME[midiOf(r[0], f) % 12], fin: i === 0 ? 1 : 3, sl: i === 2 });
      });
    });
    return out;
  }
  //  win = 지판 창 = 패턴이 있는 프렛만(사용자 지정 2026-11-20 — 양 끝 여유 칸·흐림 없이 무대 좌우를 꽉 채움)
  const PATTERNS = {
    1: { notes: patNotes([[6, [3, 5]], [5, [3, 5, 7]], [4, [5, 7]], [3, [5, 7, 9]], [2, [8, 10]], [1, [8, 10, 12]]]), win: { lo: 3, cols: 10, minF: 3, maxF: 12, fade: false } },
    2: { notes: patNotes([[6, [8, 10, 12]], [5, [10, 12]], [4, [10, 12, 14]], [3, [12, 14]], [2, [13, 15, 17]], [1, [15, 17]]]), win: { lo: 8, cols: 10, minF: 8, maxF: 17, fade: false } },
  };
  const WIN_GAP = { lo: 5, cols: 11, minF: 5, maxF: 15, fade: false };   // 두 패턴을 같이 — 줄마다 패턴1 끝 ~ 패턴2 시작(5~15프렛)만
  function patOf(id) { return PATTERNS[id]; }
  function lastOn(P, s) { const a = P.notes.filter(function (n) { return n.s === s; }); return a[a.length - 1]; }
  function firstOn(P, s) { return P.notes.filter(function (n) { return n.s === s; })[0]; }
  // 연주 순서 — 상행 = 낮은 음부터(세 번째 음 슬라이드), 하행 = 거꾸로(가장 높은 음을 약지로 친 뒤 슬라이드로 내려옴 → 검지)
  function patSeq(P, down) {
    if (!down) return P.notes.map(function (n) { return { n: n, tech: n.sl ? 'slide' : 'pick' }; });
    const d = P.notes.slice().reverse();
    return d.map(function (n, i) { return { n: n, tech: i > 0 && d[i - 1].sl && d[i - 1].s === n.s ? 'slide' : 'pick' }; });
  }

  // ── 기타 지판 — 스케일 훈련 퀴즈 지판(.fb-*)·D15 창 규칙과 같은 클래스(D20 boardHtml과 같음). win = { lo, cols, minF, maxF, fade } ──
  const SFB_REF_W = 360, SFB_REF_COLS = 7, SFB_MAX_W = 520;
  const SFB_NECK_H = (SFB_REF_W / 2.3 - 2.25) * 6 / 5;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
  const SINGLE_DOTS = [3, 5, 7, 9, 15, 17], DOUBLE_DOTS = [12];
  function fbX(win, f) { return (f - win.lo + 0.5) / win.cols * 100; }
  function fbY(s) { return (s - 0.5) / 6 * 100; }
  function boardHtml(id, win, size, opt) {
    opt = opt || {};
    const inWin = function (f) { return f >= win.lo && f < win.lo + win.cols; };
    let h = '';
    for (let s = 1; s <= 6; s++) h += '<div class="fb-string is-in" data-s="' + s + '" style="top:' + fbY(s) + '%;height:' + STRING_THICKNESS[s - 1] + 'px"></div>';
    for (let c = 0; c <= win.cols; c++) h += '<div class="fb-fret-line" style="left:' + (c / win.cols * 100) + '%"></div>';
    SINGLE_DOTS.filter(inWin).forEach(function (f) { h += '<div class="fb-dot" style="left:' + fbX(win, f) + '%;top:50%"></div>'; });
    DOUBLE_DOTS.filter(inWin).forEach(function (f) { [33, 67].forEach(function (y) { h += '<div class="fb-dot" style="left:' + fbX(win, f) + '%;top:' + y + '%"></div>'; }); });
    (opt.ghost || []).forEach(function (k) { const sf = k.split('-'); h += '<div class="fb-note fb-note--ghost" data-k="' + k + '" style="left:' + fbX(win, +sf[1]) + '%;top:' + fbY(+sf[0]) + '%"></div>'; });
    let nums = '';
    for (let f = win.lo; f < win.lo + win.cols; f++) {   // 점 칸 번호만(D1 규칙)
      if (SINGLE_DOTS.indexOf(f) < 0 && DOUBLE_DOTS.indexOf(f) < 0) continue;
      nums += '<div class="fb-fret-num" data-f="' + f + '" style="left:' + fbX(win, f) + '%">' + f + '</div>';
    }
    const colW = size.w / win.cols;
    return '<div class="fb-full-wrapper n2-sfb n20-sfb n21-sfb degrees-on' + (win.fade ? ' n15-sfb' : '') + '" style="width:' + size.w + 'px;--fbu:' + (size.neckH / 160) + 'px;--n15-fade:' + (colW * 0.7) + 'px">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums">' + nums + '</div></div>';
  }
  function noteEl(win, s, f, extra, label) {
    const el = document.createElement('div');
    el.className = 'fb-note' + (extra ? ' ' + extra : '');
    el.style.left = fbX(win, f) + '%';
    el.style.top = fbY(s) + '%';
    el.dataset.k = s + '-' + f;
    if (label != null) el.innerHTML = '<span class="fb-note-deg">' + label + '</span>';
    return el;
  }
  function pop(els) {   // 한 번 커졌다 돌아옴(D15와 같음)
    return Promise.all(els.map(function (el) {
      return new Promise(function (res) {
        const a = J.anim(el, [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(1.35)' }, { transform: 'translate(-50%, -50%) scale(1)' }], { duration: 420, easing: J.EASE_OUT });
        a.onfinish = res; a.oncancel = res;
      });
    }));
  }
  function setCls(els, c, on) { els.forEach(function (el) { if (el) [].concat(c).forEach(function (x) { el.classList.toggle(x, on); }); }); }
  function none() { return Promise.resolve(); }

  // ═══════════════════════════ 강의 ═══════════════════════════
  // 무대: 층 둘 — 지판(#n21-fb) / 자유 연주(#n21-jam)
  //  높이 = 모든 칸이 다른 노드와 같은 기본 220px(문구·지판 위치를 맞춤 — 사용자 지정 2026-11-23, 페이즈3 자유 연주 칸 포함).
  //  자유 연주 층은 220px보다 길어 아래(코드진행 줄)가 무대 밖으로 넘침 — 내용 묶음이 가운데 정렬이라 그 아래 빈 자리에 들어감. 패턴 줄은 지판 이름 줄과 같은 높이라 지판 위치가 패턴 칸과 같음
  //  지판 칸에선 넥 높이를 LEC_NECK_MAX 이하로 — 이름 줄 + 넥 + 프렛 번호가 220px 무대(위 여백 24)에 들어가게
  //  엔진은 장면이 바뀔 때 층을 끄기만 하고 켜는 건 노드 몫(applyScene) — run에서 그리고 fx로 켬
  let lecW = 320, artUsed = false;
  function boardW() { return lecW; }   // 지판 = 무대 폭 전체(좌우 꽉 — 사용자 지정 2026-11-20)
  function neckH(w) { return Math.min(w * 0.45, 200); }   // 줄 간격 = 폭에 비례(360px에서 약 27px)
  const LEC_NECK_MAX = 143;   // 강의 지판 넥 높이 상한 — 220 − 위 여백 24 − 이름 줄 27 = 169 ≥ 넥 × (1 + 프렛 번호 28/160)
  function lecNeckH() { return Math.min(neckH(boardW()), LEC_NECK_MAX); }
  function build(stage) {
    stage.classList.add('is-jny');
    lecW = stage.clientWidth || (window.innerWidth - 32);
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer n21-l" id="n21-fb"><div class="n21-flab" id="n21-flab"></div><div class="n21-fbw" id="n21-fbw"></div></div>' +
      '<div class="jl-layer n21-l" id="n21-jam">' +
        '<div class="n21-car" id="n21-pcar">' + arrowBtn('p', -1) + '<span class="n21-car-lab" id="n21-plab"></span>' + arrowBtn('p', 1) + '</div>' +
        '<div class="n21-fbw" id="n21-jfb"></div>' +
        '<div class="n21-car" id="n21-gcar">' + arrowBtn('g', -1) + '<span class="n21-car-lab n21-prog" id="n21-prog"></span>' + arrowBtn('g', 1) + '</div>' +
      '</div></div>';
    $('n21-jam').addEventListener('click', function (e) { const b = e.target.closest('.n21-arr'); if (b) jamArrow(b.dataset.c, +b.dataset.d); });
    loadBacking();   // 자유 연주 반주(드럼 샘플 포함)를 미리 불러 둠(D15와 같음)
  }
  // 넘기기 화살표 = 작은 채운 삼각형(사용자 지정 2026-11-20). 터치 영역은 버튼 44px
  const ICON_L = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M9 1.5v9L2.5 6z"/></svg>';
  const ICON_R = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.5v9L9.5 6z"/></svg>';
  function arrowBtn(c, d) { return '<button type="button" class="n21-arr" data-c="' + c + '" data-d="' + d + '" aria-label="' + (d < 0 ? '이전' : '다음') + '">' + (d < 0 ? ICON_L : ICON_R) + '</button>'; }
  function layerIn(id) { return fx([$(id)], 'is-on', true); }
  // 칸이 바뀔 때·이동·건너뛰기·닫기(엔진 onCut) — 시연 소리(주법 경로)·반주 하드컷(CLAUDE.md 0-7)
  function lecCut() {
    jamCut();
    if (artUsed && typeof GuitarAudio !== 'undefined') { GuitarAudio.panic(); artUsed = false; }
  }

  // ── 지판 층 ──
  let board = null;   // 지금 그린 지판 { box, neckId, win }
  function setBoard(boxId, neckId, win) {
    board = { box: boxId, neckId: neckId, win: win };
    $(boxId).innerHTML = boardHtml(neckId, win, { w: boardW(), neckH: lecNeckH() });
    return $(neckId);
  }
  function neck() { return board && $(board.neckId); }
  function dot(k) { const n = neck(); return n ? n.querySelector('.fb-note[data-k="' + k + '"]:not(.fb-note--ghost)') : null; }
  function dots(keys) { return keys.map(dot).filter(Boolean); }
  function flab(text) { const el = $('n21-flab'); el.innerHTML = text; }
  // 패턴 지판 — 빈 창(패턴 이름)
  function patBoard(id) {
    setBoard('n21-fbw', 'n21-neck', patOf(id).win);
    flab(em('패턴' + id));
    return layerIn('n21-fb');
  }
  // 패턴을 6번줄부터 레가토로 채움(점 안 음이름)
  const FILL_STEP = 380;
  function patFill(id) {
    const P = patOf(id), win = P.win, t0 = J.audioT0(), lead = J.leadMs(), nk = neck();
    // 레가토(사용자 지정 2026-11-23) — 주법 경로(artRun: 음마다 새 울림, 다음 음 시각에 하드컷). J.note(strumAt)는 스트럼용이라 음마다 시각 ±6ms·세기를 흔들어 이어지지 않았음
    artRun(P.notes.map(function (n) { return { s: n.s, f: n.f, tech: 'pick' }; }), t0, FILL_STEP / 1000);
    P.notes.forEach(function (n, i) {
      later(function () { nk.appendChild(noteEl(win, n.s, n.f, 'n2-pop', n.name)); }, lead + i * FILL_STEP);
    });
    return wait(lead + P.notes.length * FILL_STEP + 600);
  }
  // 줄마다 그 줄의 점을 같이 통통 — 2개·3개가 번갈아 보이게
  const ROW_GAP = 700;
  function rowRun(id) {
    const P = patOf(id), lead = J.leadMs();
    [6, 5, 4, 3, 2, 1].forEach(function (s, i) {
      later(function () { pop(dots(P.notes.filter(function (n) { return n.s === s; }).map(function (n) { return n.k; }))); }, lead + i * ROW_GAP);
    });
    return wait(lead + 5 * ROW_GAP + 600);
  }
  // 점 글자 바꾸기 — 음이름 ↔ 손가락 번호(한 화면에 섞지 않음 — 가이드 §4-31)
  function relabel(id, finger) {
    const P = patOf(id), els = dots(P.notes.map(function (n) { return n.k; }));
    setCls(els, 'n15-lab-out', true);
    return wait(FADE_MS).then(function () {
      P.notes.forEach(function (n) { const el = dot(n.k); if (el) el.innerHTML = '<span class="fb-note-deg">' + (finger ? n.fin : n.name) + '</span>'; });
      setCls(els, 'n15-lab-out', false);
      return wait(FADE_MS);
    });
  }
  // 슬라이드 화살표 — 세 개인 줄의 두 번째 → 세 번째 음 사이(하행이면 방향만 반대)
  function slideArrows(id, down) {
    const P = patOf(id), win = board.win, nk = neck();
    Array.prototype.forEach.call(nk.querySelectorAll('.n21-sl'), function (el) { el.remove(); });
    const els = [];
    P.notes.forEach(function (n, i) {
      if (!n.sl) return;
      const a = P.notes[i - 1], el = document.createElement('div');
      el.className = 'n21-sl' + (down ? ' is-down' : '');   // 화살표(두껍게 — 사용자 지정 2026-11-23: 이음선 + sl.을 써 봤다가 화살표로 되돌림)
      // 두 점 테두리 사이에만(점 반지름 11fbu + 여유 5fbu) — 점을 덮지 않게, 길이 조금 짧게(사용자 지정 2026-11-23)
      el.style.left = 'calc(' + fbX(win, a.f) + '% + 16 * var(--fbu))';
      el.style.width = 'calc(' + (fbX(win, n.f) - fbX(win, a.f)) + '% - 32 * var(--fbu))';
      el.style.top = fbY(n.s) + '%';
      nk.appendChild(el);
      els.push(el);
    });
    return fx(els, 'is-in', true, 120);
  }
  // 음 차례 예약 — 레가토 = 노드15 스케일 블럭 legato(pentatonic-forms.js)와 같은 소리(사용자 지정 2026-11-23):
  //  슬라이드가 아닌 음 = J.note(메인 샘플러) — 다음 음 시각까지 꾹 울리고 0.18초 릴리스로 이어짐(마지막 음만 1.2초·0.8초)
  //  슬라이드가 들어간 음 = 음높이를 끌어야 해서 주법 경로(artNote + artSlide) — 끝은 똑같이 다음 음 시각 + 0.18초
  //  items = [{ s, f, tech: 'pick'|'slide', phrase, at? }], 돌려주는 값 = 마지막 음 시각 + RING_S(초, t0 기준)
  const LEGATO_REL = 0.18;
  function artRun(items, t0, step) {
    const ats = items.map(function (x, i) { return t0 + (x.at != null ? x.at : i * step); });   // x.at = 음마다 시각(초, t0 기준 — 간격이 고르지 않을 때)
    const voices = [];   // 피크로 친 음 하나 + 뒤따르는 슬라이드들
    items.forEach(function (x, i) {
      if (x.tech === 'pick' || !voices.length) voices.push({ x: x, start: ats[i], slides: [] });
      else voices[voices.length - 1].slides.push({ x: x, at: ats[i] });
    });
    const end = ats[ats.length - 1] - t0 + RING_S;
    voices.forEach(function (v, j) {
      const last = j === voices.length - 1, stopAt = last ? t0 + end : voices[j + 1].start, m = midiOf(v.x.s, v.x.f);
      if (!v.slides.length) {   // 노드15 legato와 같은 길이·릴리스
        J.note(m, v.start, last ? 1.2 : stopAt - v.start, last ? 0.8 : LEGATO_REL);
        return;
      }
      if (J.skipping()) return;
      const key = 'demo' + j;
      artUsed = true;
      GuitarAudio.artNote(key, m, { at: v.start, phrase: v.x.phrase || null });
      v.slides.forEach(function (sl) { GuitarAudio.artSlide(key, midiOf(sl.x.s, sl.x.f), { at: sl.at }); });
      GuitarAudio.artStop(key, { at: stopAt, fade: last ? 0.3 : LEGATO_REL });
    });
    return end;
  }
  // 한 줄 시연(슬라이드 설명) — 5번줄 검지 3 → 약지 5 → 약지 슬라이드 7, 이어서 4번줄 검지 5
  function slideMini() {
    if (J.skipping()) return none();
    const t0 = J.audioT0(), lead = J.leadMs(), seq = [[5, 3, 'pick'], [5, 5, 'pick'], [5, 7, 'slide'], [4, 5, 'pick']];
    artUsed = true;
    const end = artRun(seq.map(function (x) { return { s: x[0], f: x[1], tech: x[2], phrase: x[0] === 5 ? [48, 50, 52] : null }; }), t0, 0.5);
    seq.forEach(function (x, i) { later(function () { playing(x[0] + '-' + x[1]); }, lead + i * 500); });
    return wait(lead + end * 1000 + 300).then(function () { playing(null); });
  }
  function playing(k) {
    const nk = neck();
    if (!nk) return;
    Array.prototype.forEach.call(nk.querySelectorAll('.fb-note--playing'), function (el) { el.classList.remove('fb-note--playing'); });
    const el = k && dot(k);
    if (el) { el.classList.add('fb-note--playing'); pop([el]); }
  }
  // 시연 — 패턴 하나를 주법 소리로 예약(오디오 시계) + 같은 시각에 그 점 파랑(D20 demo와 같은 경로). 마지막 음은 RING_S 울린 뒤 짧게 사라짐(정상 종료 = 페이드)
  const DEMO_STEP = 0.36, RING_S = 1.3;
  function patDemo(id, down) {
    if (J.skipping()) return none();
    const P = patOf(id), seq = patSeq(P, down), t0 = J.audioT0(), lead = J.leadMs();
    // 샘플 고르기용 음 목록 = 그 줄의 음(슬라이드로 이어지는 음까지)만. 패턴 전체(2옥타브 반)를 주면 샘플 하나를 20반음 넘게 늘려 소리가 뭉개짐(2026-11-20 사용자 지적)
    const phraseOf = function (s) { return P.notes.filter(function (n) { return n.s === s; }).map(function (n) { return midiOf(n.s, n.f); }); };
    artUsed = true;
    const end = artRun(seq.map(function (x) { return { s: x.n.s, f: x.n.f, tech: x.tech, phrase: phraseOf(x.n.s) }; }), t0, DEMO_STEP);
    seq.forEach(function (x, i) { later(function () { playing(x.n.k); }, lead + i * DEMO_STEP * 1000); });
    return wait(lead + end * 1000 + 300).then(function () { playing(null); });
  }
  const ARROW_MS = 2 * 120 + FADE_MS;   // 슬라이드 화살표 셋이 차례로 나타나는 시간(slideArrows)
  const DEMO_MS = ARROW_MS + 220 + Math.round((14 * DEMO_STEP + RING_S) * 1000) + 300;
  // 두 패턴 같이 — 패턴1 점(기본색) + 패턴2 점(보라), 창 안의 것만
  function gapBoard() {
    const nk = setBoard('n21-fbw', 'n21-neck', WIN_GAP), win = WIN_GAP;
    flab('<span class="n21-k1">패턴1</span> · <span class="n21-k2">패턴2</span>');   // 이름 색 = 점 색
    [1, 2].forEach(function (id) {
      patOf(id).notes.forEach(function (n) { if (n.f >= win.minF && n.f <= win.maxF) nk.appendChild(noteEl(win, n.s, n.f, (id === 2 ? 'n21-p2 ' : 'n21-p1 ') + 'n2-pop')); });
    });
    return layerIn('n21-fb');
  }
  // 줄마다 패턴1 끝 → 패턴2 시작(프렛 번호 차이 3 = 사이 빈 칸 2) — 두 점 통통 + 두 음 + 사이에 '2칸'(눈에 보이는 칸 기준 — 사용자 지정 2026-11-23)
  const GAP_STEP = 800;
  function gapRun() {
    const t0 = J.audioT0(), lead = J.leadMs(), win = WIN_GAP, nk = neck();
    // 레가토 — 줄마다 패턴1 끝 → (0.3초) 패턴2 시작 → (0.5초) 다음 줄, 주법 경로로 다음 음 시각에 하드컷(patFill과 같음)
    if (!J.skipping()) {
      artUsed = true;
      const seq = [];
      [6, 5, 4, 3, 2, 1].forEach(function (s, i) {
        seq.push({ s: s, f: lastOn(patOf(1), s).f, tech: 'pick', at: i * GAP_STEP / 1000 });
        seq.push({ s: s, f: firstOn(patOf(2), s).f, tech: 'pick', at: (i * GAP_STEP + 300) / 1000 });
      });
      artRun(seq, t0, 0);
    }
    [6, 5, 4, 3, 2, 1].forEach(function (s, i) {
      const a = lastOn(patOf(1), s), b = firstOn(patOf(2), s);
      later(function () {
        const el = document.createElement('div');
        el.className = 'n21-gap';
        el.style.left = fbX(win, a.f) + '%';
        el.style.width = (fbX(win, b.f) - fbX(win, a.f)) + '%';
        el.style.top = fbY(s) + '%';
        el.innerHTML = '<span>2칸</span>';   // 눈에 보이는 빈 칸 수(프렛 번호 차이 3 = 사이 빈 칸 2 — 사용자 지정 2026-11-23)
        nk.appendChild(el);
        fx([el], 'is-in', true);
        pop(dots([a.k, b.k]));
      }, lead + i * GAP_STEP);
    });
    return wait(lead + 5 * GAP_STEP + 300 + 900);
  }

  // ── 자유 연주 — 패턴·코드진행을 화살표로 넘김(한 칸 — 사용자 지정), 반주 = D15~D19와 같은 BackingTrack '기본1' 80bpm ──
  //  진행 = D15~D19 자유 연주 진행 다섯 개(backing-track.js 열쇠 그대로). 진행을 바꾸면 반주를 하드컷하고 새 진행으로 다시 시작(CLAUDE.md 0-7 #3 — BackingTrack.start가 앞 재생을 먼저 멈춤),
  //  패턴을 바꾸면 반주는 그대로(같은 연주 맥락). 지판 점을 누르면 그 음 + 점이 잠깐 파랑
  const JAM_PROGS = [
    { prog: ['C', 'Am', 'F', 'G'], key: 'jny-penta' }, { prog: ['Dm', 'G', 'C', 'Am'], key: 'jny-penta-c' }, { prog: ['F', 'G', 'Em', 'Am'], key: 'jny-penta-a' },
    { prog: ['C', 'G', 'Am', 'F'], key: 'jny-penta-e' }, { prog: ['Am', 'Em', 'F', 'G'], key: 'jny-penta-d' },
  ];
  const JAM_BPM = 80;
  const BACKING_SCRIPTS = ['drum-sets.js', 'drum-samples.js', 'drum-audio.js', 'backing-track.js'];   // D15와 같음 — 이 노드에서만 필요해 강의 페이지 공용 목록에 넣지 않고 불러옴
  let jamOn = false, backingLoad = null, jamPat = 1, jamProg = 0, jamGen = 0;
  function loadBacking() {
    if (backingLoad) return backingLoad;
    if (typeof BackingTrack !== 'undefined') return (backingLoad = Promise.resolve());
    backingLoad = BACKING_SCRIPTS.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          const s = document.createElement('script');
          s.src = src;
          s.onload = res;
          s.onerror = function () { rej(new Error('반주 스크립트를 불러오지 못함: ' + src)); };
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve()).catch(function (e) { console.error('[pentatonic-diagonal]', e); });   // 실패하면 반주 없이(점 누르기는 됨)
    return backingLoad;
  }
  function jamCut() { jamOn = false; jamGen++; if (typeof BackingTrack !== 'undefined') BackingTrack.stop(); }   // 멱등
  // 반주 시작(지금 진행) + 지금 코드 이름 파랑(오디오 시계 기준 getCurrentChordIndex를 엔진 타이머로 읽음 — 칸이 바뀌면 엔진이 지움)
  function jamStart() {
    if (J.skipping()) return none();
    jamOn = true;
    const gen = ++jamGen, key = JAM_PROGS[jamProg].key;
    return loadBacking().then(function () {
      if (gen !== jamGen || !jamOn || typeof BackingTrack === 'undefined') return;
      return BackingTrack.start(function () { return { bpm: JAM_BPM, root: 0, level: key }; }, 'basic');
    }).then(function (ok) {
      if (!ok || gen !== jamGen || !jamOn) return;
      let cur = -1;
      (function poll() {
        if (gen !== jamGen || !jamOn || J.skipping()) return;
        const i = BackingTrack.getCurrentChordIndex();
        if (i !== cur && i >= 0) {
          cur = i;
          document.querySelectorAll('#n21-prog .n21-pc').forEach(function (el) { el.classList.toggle('is-focus', +el.dataset.i === i); });
        }
        later(poll, 50);
      })();
    });
  }
  function jamPatDraw() {
    const P = patOf(jamPat), nk = setBoard('n21-jfb', 'n21-jneck', P.win);
    P.notes.forEach(function (n) { nk.appendChild(noteEl(P.win, n.s, n.f, n.name === 'C' ? 'fb-note--root' : '')); });
    nk.addEventListener('click', jamTap);
    $('n21-plab').textContent = '패턴' + jamPat;
  }
  function jamProgDraw() {
    $('n21-prog').innerHTML = JAM_PROGS[jamProg].prog.map(function (c, i) { return '<span class="n21-pc" data-i="' + i + '">' + c + '</span>'; }).join('');
  }
  function jamTap(e) {
    if (!jamOn || J.skipping()) return;
    const win = board.win, r = neck().getBoundingClientRect();
    const k = (Math.floor((e.clientY - r.top) / r.height * 6) + 1) + '-' + (Math.floor((e.clientX - r.left) / r.width * win.cols) + win.lo);
    const n = patOf(jamPat).notes.filter(function (x) { return x.k === k; })[0], el = dot(k);
    if (!n || !el) return;
    J.note(midiOf(n.s, n.f), J.audioT0(), 1.4, 0.6);
    el.classList.add('fb-note--playing');
    pop([el]);
    later(function () { el.classList.remove('fb-note--playing'); }, 250);
  }
  function jamArrow(c, d) {
    if (!jamOn) return;
    if (typeof _playConfirmSfx === 'function') _playConfirmSfx();
    if (c === 'p') { jamPat = jamPat === 1 ? 2 : 1; jamPatDraw(); return; }
    jamProg = (jamProg + d + JAM_PROGS.length) % JAM_PROGS.length;
    jamProgDraw();
    jamStart();
  }
  function jamIn() {
    jamPatDraw();
    jamProgDraw();
    jamStart();   // 반주 준비를 문구 진행이 기다리지 않게(D15와 같음)
    return layerIn('n21-jam');
  }

  // 창 크기가 바뀌면 지판 크기만 다시 맞춤(점·화살표는 % 위치라 그대로)
  let lecRT = null;
  window.addEventListener('resize', function () {
    clearTimeout(lecRT);
    lecRT = setTimeout(function () {
      const st = $('combo-v2-lec-stage');
      if (!st || !$('n21-fbw')) return;
      lecW = st.clientWidth || lecW;
      document.querySelectorAll('#n21-fbw .n21-sfb, #n21-jfb .n21-sfb').forEach(function (w) {   // 지판 = 무대 폭 전체, 줄 간격도 폭에 비례
        w.style.width = boardW() + 'px';
        w.style.setProperty('--fbu', (lecNeckH() / 160) + 'px');
      });
    }, 120);
  });

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 복습·적용)은 주석 ──
  //  강의 최종 목적: 두 대각 패턴의 자리·운지(검지·약지·약지 슬라이드)·블럭 연결·패턴 사이 2칸(퀴즈 ①). 여정 전체 복습은 퀴즈 ②~⑤로만
  // 솔로연주 비기너 D13 '펜타 대각 이동 훈련'(2026-11-23 — docs/solo-beginner-curriculum.md): 같은 강의 + 대각 이동 중 G폼 블럭에 머무는 칸, 도입·마무리 문구, 퀴즈(패턴·블럭 빈자리)만 다름
  const SOLO = /[?&]course=soloing/.test(location.search);
  // 패턴1 + G폼 블럭을 한 지판에 — 색으로 나누지 않음(사용자 지정 2026-11-24): 설명하는 쪽만 진한 브랜드색, 나머지는 고스트처럼 흐리게(.n21-off).
  //  점 역할 = .n21-pat(패턴1) / .n21-gf(G폼) — 같은 자리는 둘 다. 설명이 끝나면 전부 진하게 + G폼 영역 상자(.n21-gbox)
  function blkBoard() {
    const win = patOf(1).win, nk = setBoard('n21-fbw', 'n21-neck', win), pk = {}, gk = {};
    flab('패턴1');
    FORMS.G.forEach(function (n) { gk[n[0] + '-' + n[1]] = true; });
    patOf(1).notes.forEach(function (n) { pk[n.k] = true; nk.appendChild(noteEl(win, n.s, n.f, 'n21-bk n21-pat' + (gk[n.k] ? ' n21-gf' : '') + ' n2-pop')); });
    FORMS.G.forEach(function (n) { const k = n[0] + '-' + n[1]; if (!pk[k] && n[1] >= win.minF && n[1] <= win.maxF) nk.appendChild(noteEl(win, n[0], n[1], 'n21-bk n21-gf n21-off n2-pop')); });
    const fr = FORMS.G.map(function (n) { return n[1]; }), lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr), box = document.createElement('div');
    box.className = 'n21-gbox';
    box.style.left = ((lo - win.lo) / win.cols * 100) + '%';
    box.style.width = ((hi - lo + 1) / win.cols * 100) + '%';
    // 위아래 = 좌우와 같은 여백(점과 상자 선 사이) — 좌우 여백 = 칸 폭/2 − 점 반지름 → 상자 위 = 1번줄 − 칸 폭/2, 아래 = 6번줄 + 칸 폭/2(사용자 지정 2026-11-24)
    const pad = lecNeckH() / 12 - boardW() / win.cols / 2;
    box.style.top = pad + 'px';
    box.style.bottom = pad + 'px';
    nk.appendChild(box);
    return layerIn('n21-fb');
  }
  // 진하게 보일 점 고르기 — sel(.n21-pat / .n21-gf)만 진하게, 나머지 흐리게. sel 없음 = 전부 진하게 + G폼 상자
  function blkFocus(sel, label) {
    const nk = neck();
    if (!nk) return none();
    const all = [].slice.call(nk.querySelectorAll('.n21-bk'));
    setCls(all, 'n21-off', !!sel);
    if (sel) setCls([].slice.call(nk.querySelectorAll(sel)), 'n21-off', false);
    const box = nk.querySelector('.n21-gbox');
    if (box) box.classList.toggle('is-on', !sel);
    flab(label);
    return wait(FADE_MS);
  }
  // part 'pat' = 패턴1로 6번줄·5번줄을 올라감 / 'g' = G폼 블럭(4~1번줄)에서 머묾 — 치는 점 통통 + 소리(레가토)
  const BLK_STEP = 330;
  function blkRun(part) {
    const P = patOf(1), seq = part === 'g' ? [] : P.notes.filter(function (n) { return n.s >= 5; }).map(function (n) { return { s: n.s, f: n.f, tech: n.sl ? 'slide' : 'pick' }; });
    if (part === 'g') FORMS.G.filter(function (n) { return n[0] <= 4; }).forEach(function (n) { seq.push({ s: n[0], f: n[1], tech: 'pick' }); });
    const t0 = J.audioT0(), lead = J.leadMs();
    if (!J.skipping()) { artUsed = true; artRun(seq, t0, BLK_STEP / 1000); }
    seq.forEach(function (x, i) {   // 지금 치는 점 = 파랑(.fb-note--playing) + 통통, 다음 음에서 꺼짐(사용자 지정 2026-11-24)
      later(function () {
        const d = dots([x.s + '-' + x.f]);
        setCls(d, 'fb-note--playing', true); pop(d);
        later(function () { setCls(d, 'fb-note--playing', false); }, BLK_STEP);
      }, lead + i * BLK_STEP);
    });
    return wait(lead + seq.length * BLK_STEP + 900);
  }
  const steps = [
    // P1 도입·패턴1 (여정 총정리는 강의에서 하지 않음 — 사용자 지정 2026-11-20, 복습은 퀴즈로)
    // 0 핵심: 이번에 배울 것(대각 패턴 — 지판을 좌우로 넓게 쓰는 감각. 블럭을 잇는 것이 아님, 사용자 지정 2026-11-24)
    SOLO ? J.chainSteps([
      // 대각 패턴 = 블럭을 잇는 것이 아님 — 4~5프렛 안 상하로만 움직이는 블럭을 보완해 지판을 좌우로 넓게 쓰는 감각(사용자 지정 2026-11-24)
      { text: '이번 시간에는 펜타토닉 스케일을\n' + em('대각선') + '으로 연주하는 패턴을 배워볼게요', run: none },
      { text: '스케일 블럭은 4~5프렛 안에서\n위아래로만 움직이죠?', run: none },
      { text: '대각 패턴으로 지판을 ' + em('좌우로 넓게') + '\n쓰는 감각을 길러볼게요', run: none },
    ]) : J.chainSteps([
      { text: '드디어 나의 기타 여정의\n' + em('마지막 시간') + '이에요!', gap: 3000, run: none },
      { text: '이번엔 펜타토닉 스케일을\n' + em('대각선') + '으로 연주하는 패턴을 배워볼게요', run: none },   // 블럭을 잇는 것이 아님(사용자 지정 2026-11-24 — 솔로와 같은 문구)
      { text: '스케일 블럭은 4~5프렛 안에서\n위아래로만 움직이죠?', run: none },
      { text: '대각 패턴으로 지판을 ' + em('좌우로 넓게') + '\n쓰는 감각을 길러볼게요', run: none },
    ]),
    // 1 핵심: 패턴1의 자리(새 내용) — 2개 → 3개 반복
    J.chainSteps([
      { text: '지판을 ' + em('대각선으로') + ' 가로지르는\n패턴이 두 가지 있어요', scene: 'n21-fb:p1', run: function () { return patBoard(1); } },
      { text: em('패턴1') + '은 6번줄 ' + em('3프렛') + '에서 시작해요', ms: 220 + 15 * FILL_STEP + 600, run: function () { return patFill(1); } },
      { text: '한 줄에 ' + em('2개') + ', 다음 줄에 ' + em('3개') + '가\n번갈아 반복되죠?', ms: 220 + 5 * ROW_GAP + 600, run: function () { return rowRun(1); } },
    ]),
    // 2 핵심: 운지(새 내용) — 검지·약지만, 세 번째 음 = 약지 슬라이드 → 다음 줄 검지. 2번줄만 한 칸 더(예외)
    J.chainSteps([
      { text: '손가락은 ' + em('검지') + '와 ' + em('약지') + '만 써요', run: function () { return relabel(1, true); } },
      { text: '3개인 줄의 마지막 음은\n' + em('약지 슬라이드') + '로 이어요', ms: 3 * 120 + FADE_MS + 220 + 1500 + 1300 + 300, run: function () { return slideArrows(1, false).then(slideMini); } },
      { text: '그러면 다음 줄 첫 음에\n' + em('검지') + '가 자연스럽게 닿아요', run: function () { return pop(dots(['5-7', '4-5'])); } },
      { text: '단, ' + em('2번줄') + '만 검지를 ' + em('한 칸 더') + ' 옮겨요', run: function () { return pop(dots(['3-9', '2-8'])); } },
    ]),
    // 3 핵심: 상행 시연
    { text: '패턴1을 6번줄 부터\n쭉 ' + em('상행') + '해볼게요!', ms: DEMO_MS, run: function () { return slideArrows(1, false).then(function () { return patDemo(1, false); }); } },
    // 4 핵심: 하행 시연 — 약지로 짚고 슬라이드로 내려온 뒤 검지
    { text: '이번엔 1번줄부터 ' + em('내려와볼게요') + '!\n약지로 짚고 내려오며 슬라이드해요', ms: DEMO_MS, run: function () { return slideArrows(1, true).then(function () { return patDemo(1, true); }); } },
    // P2 패턴2·2칸·정리
    // 5 핵심: 패턴2의 자리 — 근음 C부터 3개 → 2개(패턴1 적용), 손가락·슬라이드는 같음
    J.chainSteps([
      { text: '이번엔 ' + em('패턴2') + '예요\n근음 ' + em('C') + '(6번줄 8프렛)에서 시작해요', scene: 'n21-fb:p2', ms: FADE_MS + 220 + 15 * FILL_STEP + 600, run: function () { return patBoard(2).then(function () { return patFill(2); }); } },
      { text: '이번엔 ' + em('3개') + ' → ' + em('2개') + ' 순서예요', ms: 220 + 5 * ROW_GAP + 600, run: function () { return rowRun(2); } },
      { text: '손가락과 슬라이드는\n패턴1과 같아요', run: function () { return relabel(2, true).then(function () { return slideArrows(2, false); }); } },
    ]),
    // 6 핵심: 상행 시연
    { text: '패턴2도 6번줄 부터 ' + em('상행') + '해볼게요\n기타가 있다면 같이 따라해주세요!', ms: DEMO_MS, run: function () { return slideArrows(2, false).then(function () { return patDemo(2, false); }); } },
    // 7 핵심: 하행 시연
    { text: '이번엔 ' + em('하행') + '해봅시다!', ms: DEMO_MS, run: function () { return slideArrows(2, true).then(function () { return patDemo(2, true); }); } },
    // (2칸)
    // 8 핵심(사용자 문구 2026-11-23): 두 패턴의 쓸모 → 건너뛸 때의 규칙 → 두 패턴을 같이 띄움 → 패턴 사이 간격 소리 → 정리. 처음 두 문구 동안은 패턴2 지판 그대로
    J.chainSteps([
      { text: '이렇게 2가지 패턴을 익혀두면\n솔로잉할 때 큰 도움이 됩니다!', run: none },
      { text: '만약에 패턴을 건너뛰고 싶을 땐\n다음과 같은 규칙을 떠올려주세요', run: none },
      { text: '패턴1과2를 모두 표시해보면...', scene: 'n21-fb:gap', run: gapBoard },
      { text: '두 패턴 사이에는 항상\n2칸 차이의 간격이 있어요!', ms: 220 + 5 * GAP_STEP + 300 + 900, run: gapRun },
      // 칸 = 눈에 보이는 빈 칸(사용자 지정 2026-11-23): 한 패턴 안 두 음 사이 1칸(프렛 차이 2), 패턴 사이 2칸(프렛 차이 3)
      { text: '같은 패턴 안에서는 ' + em('1칸') + ',\n다른 패턴으로 넘어갈 땐 ' + em('2칸') + ' 차이예요', run: none },
      { text: '2가지 패턴을 암기하고\n패턴 사이의 규칙만 알고있다면', run: none },
      { text: '지판을 좌우로 넓게 오가며\n연주할 수 있을 거예요!', run: none },
    ]),

    // 9 핵심: 노드 목표 정리 — 블럭(세로) + 대각 패턴(가로) = 지판 전체
    J.chainSteps([
      { text: em('스케일 블럭') + '에 ' + em('대각 패턴') + '까지 더하면', run: none },
      { text: '지판을 ' + em('위아래') + '뿐 아니라\n' + em('좌우') + '로도 넓게 쓸 수 있어요!', run: none },
    ]),

    // P3 자유 연주·퀴즈 안내
    // 10 핵심: 자유 연주(사용자 지정) — 패턴·코드진행을 화살표로 골라 반주에 맞춰. 문구 2026-11-23 사용자 지정
    J.chainSteps([
      { text: SOLO ? '반주를 틀어놓고 ' + em('자유롭게') + '\n즉흥연주를 해보세요!' : '이제 배운 패턴들을 코드반주와 함께\n연주해보면서 익숙해져보세요!', scene: 'n21-jam', enter: function () { jamOn = false; }, run: jamIn },
      { text: '화살표로 패턴과 코드진행을 골라서\n스케일을 가지고 놀아보세요~!', run: none },
      { text: '원하는 만큼 연주했다면\n다음으로 넘어가 주세요!', run: none },
    ]),
    // 11 핵심: 과정 완료 축하 → 전체 복습 퀴즈 → 승급시험(굳은살 비기너). 문구 2026-11-23 사용자 지정
    J.chainSteps([
      { text: '축하드려요! ' + em('코드반주 비기너') + ' 과정의\n모든 것을 학습하셨어요~!', scene: 'n21-text', enter: function () { jamOn = false; }, run: none },   // 반주는 칸이 바뀌며 엔진이 끊음(onCut). 장면이 바뀌어 자유 연주 층이 꺼짐 — 문구만(사용자 지정 2026-11-23)
      { text: '마지막 퀴즈는 지금까지 배운 것의\n' + em('전체 복습') + ' 퀴즈예요!', run: none },
      { text: '전체적인 복습을 완료했다면\n승급시험에 도전해서', run: none },
      { text: em('굳은살 비기너') + '로의 승급에 도전해보세요!\n더 많은 것들을 배울 수 있을거예요!', run: none },
    ]),
  ];
  // 페이즈: 1 도입·패턴1 [0~4] / 2 패턴2·2칸·정리 [5~9] / 3 자유 연주·퀴즈 안내 [10·11]
  //  솔로: P2 끝에 대각 + 블럭 칸(10), 마지막 칸 = 대각·블럭 정리 → 퀴즈 안내(여정 마지막 노드가 아님 — 축하·승급 문구 없음)
  if (SOLO) {
    steps.splice(10, 0, Object.assign(J.chainSteps([
      // 대각 패턴만 진하게 → G폼만 진하게 → 전부 진하게 + G폼 영역 상자(사용자 지정 2026-11-24 — 색 대신 진하기로 구분)
      { text: '먼저 ' + em('대각 패턴') + '으로\n이동하다가', scene: 'n21-fb:blk', run: function () { return blkBoard().then(function () { return blkRun('pat'); }); } },
      { text: em('G폼') + ' 블럭에서\n머물면서 연주해보세요', run: function () { return blkFocus('.n21-gf', 'G폼').then(function () { return blkRun('g'); }); } },
      { text: '블럭과 대각 패턴을 ' + em('함께') + ' 쓰면\n지판을 더 넓게 쓸 수 있어요', run: function () { return blkFocus(null, '패턴1 · G폼'); } },
    ]), { ms: 12490 }));   // ms = 측정값(2026-11-24 세 문구로 나눈 뒤 다시 잼)
    steps[12] = J.chainSteps([
      { text: '대각 패턴과 블럭을 섞으면\n실제 솔로에 바로 쓸 수 있어요', scene: 'n21-text', enter: function () { jamOn = false; }, run: none },
      // 퀴즈 안내 = 설명 끝 신호 + 퀴즈 실제 구성(대각 패턴 + 블럭 복습) + 이 노드 맥락(사용자 지정 2026-11-24)
      { text: '오늘 설명은 여기까지예요!', run: none },
      { text: '퀴즈에는 대각 패턴과 함께\n앞에서 배운 ' + em('블럭') + '도 섞여 나와요', run: none },
      { text: '두 가지를 오가면서\n자리를 손에 익혀봐요', run: none },
    ]);
  }
  const groups = SOLO ? [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10], [11, 12]] : [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11]];

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
  // 퀴즈 — D14(dominant7.js) 퀴즈 엔진(별 진행·피크·오답풀이·이어 풀기·오버레이·코드 맞추기·점 찍기·다이어토닉)을 복사해
  //   D15 지판 빈자리 채우기와 D11 주법 듣기를 더함. 여정 전체 복습(사용자 지정 2026-11-20) — 네 유형을 섞어 냄(같은 유형이 연달아 나오지 않게)
  //     ① pfill 대각 패턴 빈자리 채우기 — 패턴1·2 중 하나, 빈칸 수 D15와 같음(2 / 3~4 / 4~6). 패턴 창 10칸(패턴이 있는 프렛만), 고스트 없음(어느 칸이든 누를 수 있음)
  //     ② ffill 스케일 블럭 빈자리 채우기 — 출제하지 않음(사용자 지정 2026-11-23). 화면 코드는 그 전에 저장된 퀴즈를 이어 풀 때만 씀
  //     ③ pick·fill 기초 코드 9 + 도미넌트7 6 — D14와 같음(맞추기 4지선다 / 빠진 점 찍기), 반반
  //     ④ pair·dfill 다이어토닉 — D14와 같음(5도 = G7), C key만(사용자 승인), 연결형·빈칸형 반반
  //     ⑤ ear 소리 듣고 주법 고르기 2지선다 — D11과 같음, 풀 = 여정 주법 8개(PAT_IDS), 보기 = 정답 + 나머지 중 하나
  //   문제 수(사용자 지정): 별 1 20 / 별 2 20 / 별 3 25 — 환급(정답 5개마다)이 맞아떨어지게 5의 배수(2026-11-23).
  //   유형 나눔 5·5·5·5 / 5·5·5·5 / 7·6·6·6(② 블럭 빈자리를 뺀 몫을 네 유형에 나눔, 남는 1개는 이 노드의 새 내용인 ① 패턴)
  //   저장: 별 수 = jnyStars['pentatonic-diagonal'], 하던 퀴즈 = jnyQuizSess:pentatonic-diagonal
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = SOLO ? {   // 솔로 D13(2026-11-23 초안): 대각 패턴 + 펜타 블럭 빈자리만(코드·다이어토닉·주법은 아직 안 배움). 실전성 높은 노드라 별 3 20문제
    1: { n: 10, pfill: 5, ffill: 5, chord: 0, dia: 0, ear: 0, blank: [2, 2] },
    2: { n: 15, pfill: 8, ffill: 7, chord: 0, dia: 0, ear: 0, blank: [3, 4] },
    3: { n: 20, pfill: 10, ffill: 10, chord: 0, dia: 0, ear: 0, blank: [4, 6] },
  } : {
    1: { n: 20, pfill: 5, chord: 5, dia: 5, ear: 5, blank: [2, 2] },
    2: { n: 20, pfill: 5, chord: 5, dia: 5, ear: 5, blank: [3, 4] },
    3: { n: 25, pfill: 7, chord: 6, dia: 6, ear: 6, blank: [4, 6] },
  };
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = SOLO ? 'solo-diagonal' : 'pentatonic-diagonal';   // 솔로는 퀴즈가 달라 별·이어 풀기 열쇠를 따로
  let qz = null;   // 세션 { star, qs, idx, wrong[], phase: 'main'|'review', rvPos, done, judged, canRetry, paid{}, correct, refunded, short }
  // ── 이어 풀기 — 새로고침·앱 종료·백그라운드 뒤에도 하던 퀴즈를 그 문제부터. 문제(순서·보기·짝)·진행·틀린 목록·피크 지불 기록을 이 기기에 저장 ──
  //  X → '그만할래요'로 직접 나갔을 때와 완주했을 때만 지움. 저장분의 별이 지금 풀 별과 다르면 버림
  const SESS_KEY = 'jnyQuizSess:' + NODE_ID;   // 노드마다 따로(다른 노드 저장분을 덮지 않게)
  const SESS_FIELDS = ['star', 'qs', 'idx', 'wrong', 'phase', 'rvPos', 'done', 'judged', 'canRetry', 'paid', 'correct', 'refunded'];
  function sessSave() {
    if (!qz || qz.over || qz.quit) return;
    const o = { node: NODE_ID };
    SESS_FIELDS.forEach(function (k) { o[k] = qz[k]; });
    try { localStorage.setItem(SESS_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function sessLoad() {
    try {
      const o = JSON.parse(localStorage.getItem(SESS_KEY) || 'null');
      if (!o || o.node !== NODE_ID || o.star !== window.JourneyLesson.quizStar(starsGet()) || !Array.isArray(o.qs)) return null;
      return o;
    } catch (e) { return null; }
  }
  function sessClear() { try { localStorage.removeItem(SESS_KEY); } catch (e) {} }

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
  // 반반 나누기 — 홀수면 한쪽이 하나 더(무작위)
  function half(n) { return n % 2 ? (n - 1) / 2 + rnd(2) : n / 2; }
  function blankN(cfg) { return cfg.blank[0] + rnd(cfg.blank[1] - cfg.blank[0] + 1); }
  const CAT = { pfill: 'pfill', ffill: 'ffill', pick: 'chord', fill: 'chord', pair: 'dia', dfill: 'dia', ear: 'ear' };   // 문제 종류 → 유형(①~⑤)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [], seen = {};
    // ① 대각 패턴 빈자리 채우기 — 패턴1·2를 고루, 같은 패턴·빈칸 조합은 한 판에 한 번
    const pp = balanced(cfg.pfill, [1, 2]);
    for (let k = 0, guard = 0; k < cfg.pfill && guard < 500; guard++) {
      const it = mkPFill(pp[k], blankN(cfg)), sig = 'p' + it.pat + it.ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; qs.push(it); k++;
    }
    // ② 펜타 블럭 빈자리(솔로만) — 다섯 폼을 고루, 같은 폼·빈칸 조합은 한 판에 한 번
    const fp = balanced(cfg.ffill || 0, ['G', 'C', 'A', 'E', 'D']);
    for (let k = 0, guard = 0; k < (cfg.ffill || 0) && guard < 500; guard++) {
      const it = mkFFill(fp[k], blankN(cfg)), sig = 'f' + it.form + it.ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; qs.push(it); k++;
    }
    // ③ 코드 15가지 — 맞추기·채우기 반반(D14와 같은 문제)
    const nPick = half(cfg.chord), nFill = cfg.chord - nPick;
    const pc = balanced(nPick, QZ_CHORDS), pv = shuffle(Array.from({ length: nPick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < nPick; k++) {
      const others = shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k]; })).slice(0, 3);
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k]].concat(others)), answer: pc[k] });
    }
    // 빠진 점 수 — D11 규칙(별 1·2 = 1개, 별 3 = 2개 또는 3개 — 손가락이 2개뿐인 코드는 최대 2개)
    const fc = balanced(nFill, QZ_CHORDS);
    const missD = fillMiss(star, nFill), usedD = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = 5~6)
    for (let k = 0; k < nFill; k++) qs.push(pickFill(fc[k], missD[k], usedD, fc));
    // ④ 다이어토닉 — 연결형·빈칸형 반반, C key만
    const nPair = half(cfg.dia), used = [], prev = { p: null };
    shuffle(Array.from({ length: cfg.dia }, function (_, k) { return k < nPair ? 'pair' : 'dfill'; })).forEach(function (k) {
      const q = k === 'pair' ? makePair(used) : makeDFill(prev);
      q.key = 'C';
      qs.push(q);
    });
    // ⑤ 주법 듣기 — 정답 주법을 고루, 보기 = 정답 + 나머지 일곱 중 하나(순서 섞음)
    balanced(cfg.ear, PAT_IDS).forEach(function (pid) {
      const others = PAT_IDS.filter(function (x) { return x !== pid; });
      qs.push({ type: 'ear', pat: pid, answer: pid, choices: shuffle([pid, others[rnd(others.length)]]) });
    });
    return spread(qs);
  }
  // 섞기 — 같은 유형(①~⑤)이 연달아 나오지 않게: 남은 수가 가장 많은 유형(같으면 무작위) 중 바로 앞과 다른 유형을 차례로 고름.
  //  유형이 다르면 같은 문제일 수 없어 같은 문제 연속(엔진 noRepeat의 목적)도 함께 막힘
  function spread(qs) {
    const bins = {};
    shuffle(qs).forEach(function (q) { (bins[CAT[q.type]] = bins[CAT[q.type]] || []).push(q); });
    const out = [];
    let last = null;
    while (out.length < qs.length) {
      const keys = shuffle(Object.keys(bins).filter(function (c) { return bins[c].length && c !== last; }));
      if (!keys.length) { const rest = Object.keys(bins).filter(function (c) { return bins[c].length; })[0]; out.push(bins[rest].pop()); last = rest; continue; }   // 한 유형만 남은 경우(유형 수가 같아 생기지 않음)
      keys.sort(function (a, b) { return bins[b].length - bins[a].length; });
      out.push(bins[keys[0]].pop());
      last = keys[0];
    }
    return out;
  }
  // ② 펜타 블럭 빈자리(솔로) — 폼 F의 블럭에서 m자리를 비움(D20 mkFill과 같음)
  function mkFFill(F, m) { return { type: 'ffill', form: F, ans: shuffle(FORMS[F].map(function (n) { return n[0] + '-' + n[1]; })).slice(0, m).sort() }; }
  // ① 대각 패턴 빈자리 — 패턴 하나에서 m자리를 비움. 정답 = 비운 자리 전부
  function mkPFill(id, m) {
    const ans = shuffle(patOf(id).notes.map(function (n) { return n.k; })).slice(0, m).sort();
    return { type: 'pfill', pat: id, ans: ans };
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
  const QD_W = 300;   // 점 찍기 다이어그램 폭(최대)
  function paintQ(cv, chord, given, w, givenOpen) {   // givenOpen = 이미 보이는 개방현 줄(1~6). 생략하면(보기 그림·옛 저장 세션) 개방현 O는 전부 보임
    const hide = givenOpen ? chord.frets.map(function (f, s) { return f === 0 && givenOpen.indexOf(s + 1) < 0 ? s : -1; }).filter(function (s) { return s >= 0; }) : null;
    paint(cv, Object.assign({}, chord, { order: given }), given.length, false, false, w, null, undefined, hide);
  }   // 손가락 번호 생략(D11과 같음)
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
  const QZ_TITLES = { pfill: '알맞은 답을 모두 고르세요', ffill: '알맞은 답을 모두 고르세요', pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요', pair: '같은 짝끼리 이어주세요', dfill: '빈칸에 알맞은 코드를 배치하세요', dfillRev: '빈칸에 알맞은 도수를 배치하세요', ear: '알맞은 답을 고르세요' };   // 각 유형의 원래 노드와 같은 타이틀(D20·D14·D11)
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
  // ④ 빈칸형 정답 진행 소리(D13과 같음 — 120 BPM 코드당 2박, 문제 진입 후 자동 1회, 스피커를 다시 누르면 멈춤)
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
  // ⑤ 주법 듣기 소리(D11 playEar와 같음) — E코드 두 마디. 다시 들을 때는 앞 재생(이미 예약된 칸 포함)을 하드컷하고 처음부터(CLAUDE.md 0-7), 하드컷 뒤 준비(ready)를 기다려 예약
  const EAR_HINT = '터치해서 다시 들어보세요!', EAR_BARS = 2;
  function playEar(it) {
    stopSound();
    if (typeof GuitarAudio === 'undefined') return;
    const gen = chordGen, p = earPat(PATS[it.pat]), c = chords().E;
    Promise.resolve(GuitarAudio.resume ? GuitarAudio.resume() : null).catch(function () {}).then(function () { return GuitarAudio.ready(); }).then(function () {
      if (gen !== chordGen || !qz || qz.quit || qz.over || cur() !== it) return;   // 기다리는 사이 하드컷·문제 전환·이탈
      const t0 = Tone.now() + 0.1;
      for (let b = 0; b < EAR_BARS * p.s.length; b++) {
        const s = strokeOf(p, b % p.s.length, true);
        if (s && s[3]) GuitarAudio.strumAt(strokeMidis(c, s[0]), TR_IV, t0 + b * p.cell / 1000, s[2] / 1000, TR_REL, s[1]);
        else if (s) GuitarAudio.strumAt(strokeMidis(c, s[0]), 0.012, t0 + b * p.cell / 1000, s[2] ? s[2] / 1000 + 0.05 : 1.0, 0.3, s[1]);
      }
    });
  }
  // 하드컷(CLAUDE.md 0-7) — 문제 전환·보기 고르기·제출·다시 풀기·오답풀이 진입·완주·이탈. 코드 소리 자동 재생·진행 소리 예약도 함께
  function playQ(it) { if (it.type === 'ear') playEar(it); else playChord(it.chord); }
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

  let pairSel = null, pairs = [], dfSel = null;
  function render() {
    stopSound();   // 앞 문제 소리·예약을 하드컷 — 새 문제는 무음에서 시작(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    fillSel = {}; findSel = {}; pairSel = null; pairs = []; dfSel = null;
    $('jq-title').textContent = it.type === 'dfill' && it.reverse ? QZ_TITLES.dfillRev : QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'pfill' || it.type === 'ffill') {   // ①② 지판 빈자리 채우기(D15·D20과 같음)
      box.innerHTML = (it.type === 'pfill' ? infoCard('빈자리를 채워서', '패턴' + it.pat + '을', '완성해주세요') : infoCard('빈자리를 채워서', '펜타토닉 ' + it.form + '폼을', '완성해주세요')) +
        '<div class="jq-board" id="n21q-slot"></div>';
      mountQuizBoard(it);   // 빈 자리를 먼저 놓고 실제 남은 공간을 재서 지판 크기를 정함
      qNeck().addEventListener('click', findTap);
    } else if (it.type === 'ear') {   // ⑤ 소리를 듣고 주법 고르기(D11과 같음) — 문제 카드(스피커) + 보기 2개(주법 칸, 한 줄에 하나)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">주법 소리</span><span class="n4q-ico n4q-ico--q">' + ICON_SOUND + '</span><span class="jq-qask">' + EAR_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">들리는 주법을 고르세요</div><div class="ms-quiz-choices jq-cq-choices n9q-choices">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '">' + sgridHtml(null, 'n9q-sg') + '</div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n9q-choices .ms-quiz-choice-card').forEach(function (card) { const g = card.querySelector('.n9-sg'); setPat(g, PATS[card.dataset.v], true); placeVm(g); });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'pick' && it.variant === 'd2n') {   // 다이어그램을 보고 이름 고르기(D11과 같음)
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
    } else if (it.type === 'pair') {   // ④ 연결형(D13과 같음)
      const col = function (side) {
        return '<div class="combo-v2-pair-col" data-side="' + side + '">' + it[side].map(function (d) {
          return '<button type="button" class="combo-v2-pair-card cd-card" data-pair="' + d + '">' + (side === 'left' ? nm(DIA.filter(function (x) { return x.deg === d; })[0].chord, it.key) : roman(d)) + '</button>';
        }).join('') + '</div>';
      };
      box.innerHTML = infoCard((it.key || 'C') + ' key 다이어토닉 코드를', '', '짝지어 주세요') + '<div class="combo-v2-pairs jq-pairs">' + col('left') + col('right') + '</div>';
      box.querySelector('.jq-pairs').addEventListener('click', function (e) { const c = e.target.closest('.combo-v2-pair-card'); if (c && !c.classList.contains('is-ok')) pairTap(c); });
    } else {   // ④ 빈칸형(D13과 같음)
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
    if (typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
      // DEV 빌드: 공용 consumePeak는 소모 없이 통과(shared.js 규칙)라 확인이 안 됨 → 화면 숫자만 흉내(서버·로컬 잔액은 그대로)
      if (typeof _peakState !== 'undefined') { _peakState = Object.assign({}, _peakState, { balance: (_peakState.balance || 0) - 1 }); if (typeof renderPeakBadge === 'function') renderPeakBadge(); }
    } else if (typeof consumePeak === 'function') consumePeak(1, 'journey');
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
  // ── ①② 지판 빈자리 채우기 — D20 퀴즈 지판과 같음 ──
  //  ② 폼 블럭 = D15와 같은 디자인(기준 폭 7칸 = 화면 단계별 고정값) / ① 패턴(10칸) = 본문 폭(최대 380px)을 12칸이 다 씀, 넥 높이 = 폭 × 0.45(최대 170px)
  const QZ_FB_TIER_W = [[480, 328], [768, 376], [1079, 424], [1599, 472], [Infinity, 520]];
  function quizBoardW() {
    const vw = window.innerWidth;
    return Math.min($('jq-content').clientWidth, QZ_FB_TIER_W.find(function (t) { return vw <= t[0]; })[1], SFB_MAX_W);
  }
  function formSize(win) { const ref = quizBoardW(), scale = ref / SFB_REF_W; return { w: ref / SFB_REF_COLS * win.cols, neckH: SFB_NECK_H * scale }; }
  function patSize() { const w = $('jq-content').clientWidth; return { w: w, neckH: neckH(w) }; }   // 본문 폭 전체(좌우 꽉 — 사용자 지정)
  function qWin(it) { return it.type === 'pfill' ? patOf(it.pat).win : formWin(it.form); }
  function qSize(it) { return it.type === 'pfill' ? patSize() : formSize(qWin(it)); }
  function qBlock(it) { return it.type === 'pfill' ? patOf(it.pat).notes.map(function (n) { return [n.s, n.f, n.name === 'C']; }) : FORMS[it.form].map(function (n) { return [n[0], n[1], n[3] === 1]; }); }   // [줄, 프렛, 근음]
  function qNeck() { return $('n21q-neck'); }
  // 문제 지판 — 빈칸 뺀 블럭·패턴(근음 = 가운데 흰 원). ② 폼은 블럭 프렛 범위의 나머지 빈 자리 전부 고스트(D15와 같음), ① 패턴은 고스트 없음
  function mountQuizBoard(it) {
    const win = qWin(it), blk = qBlock(it), ghost = [];
    if (it.type === 'ffill') {
      const shown = blk.map(function (n) { return n[0] + '-' + n[1]; }).filter(function (k) { return it.ans.indexOf(k) < 0; });
      for (let s = 1; s <= 6; s++) for (let f = win.minF; f <= win.maxF; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    }
    $('n21q-slot').innerHTML = boardHtml('n21q-neck', win, qSize(it), { ghost: ghost });
    blk.forEach(function (n) {
      if (it.ans.indexOf(n[0] + '-' + n[1]) >= 0) return;
      qNeck().appendChild(noteEl(win, n[0], n[1], n[2] ? 'fb-note--root' : ''));
    });
  }
  // 창 크기가 바뀌면(회전·브라우저 창 조절) 문제 지판 크기만 다시 맞춤(고른 점·채점 표시는 % 위치라 그대로)
  let qRT = null;
  window.addEventListener('resize', function () {
    clearTimeout(qRT);
    qRT = setTimeout(function () {
      if (!qz || qz.short || !$('n21q-slot')) return;
      const it = cur();
      if (it.type !== 'pfill' && it.type !== 'ffill') return;
      const win = qWin(it), qb = document.querySelector('#n21q-slot .n21-sfb'), sz = qSize(it);
      if (qb) { qb.style.width = sz.w + 'px'; qb.style.setProperty('--fbu', (sz.neckH / 160) + 'px'); qb.style.setProperty('--n15-fade', (sz.w / win.cols * 0.7) + 'px'); }
    }, 120);
  });
  // 지판 누르기(D15 빈자리 채우기와 같음) — 빈 자리를 누르면 점(.fb-note--placed) + 그 음, 다시 누르면 취소. 블럭에 이미 있는 점은 그 음만 울림(고르기 아님)
  let findSel = {};
  function findTap(e) {
    if (!qz || qz.judged) return;
    const it = cur(), win = qWin(it), r = qNeck().getBoundingClientRect();
    const p = [Math.floor((e.clientY - r.top) / r.height * 6) + 1, Math.floor((e.clientX - r.left) / r.width * win.cols) + win.lo];
    if (p[1] < win.minF || p[1] > win.maxF || p[0] < 1 || p[0] > 6) return;   // 범위 밖(양 끝 흐린 칸)은 안 받음
    const k = p[0] + '-' + p[1], onBlock = qBlock(it).some(function (n) { return n[0] + '-' + n[1] === k; });
    if (onBlock && it.ans.indexOf(k) < 0) { J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6); return; }   // 이미 찍혀 있는 점 = 소리만(고르기 아님 — D15 사용자 지정)
    if (findSel[k]) {
      findSel[k].remove();
      delete findSel[k];
    } else {
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6);
      const d = noteEl(win, p[0], p[1], 'fb-note--placed');
      qNeck().appendChild(d);
      findSel[k] = d;
    }
    qBtn('제출하기', Object.keys(findSel).length > 0);
  }
  // 제출 — 고른 자리 = 정답 자리 전부일 때만 정답. 표시: 맞게 고른 자리 초록(--correct) / 잘못 고른 자리 빨강(--wrong) / 못 찾은 자리 점선 원(--missed)
  function findJudge() {
    const it = cur(), picked = Object.keys(findSel);
    const ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
    picked.forEach(function (k) {
      const d = findSel[k];
      d.classList.remove('fb-note--placed');
      d.classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong');
    });
    it.ans.forEach(function (k) {
      if (findSel[k]) return;
      const sf = k.split('-');
      qNeck().appendChild(noteEl(qWin(it), +sf[0], +sf[1], 'fb-note--missed'));
    });
    verdict(ok);
  }
  // ④ 연결형 — D13과 같은 조작(카드 탭 → 반대편 카드 탭 = 짝, 짝을 다시 탭하면 풀림, 다 짝지으면 제출)
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
  // ④ 빈칸형 — 보기를 탭하면 빈칸에 칩(다른 보기 = 선택 변경), 제출하기로 채점(D13과 같음)
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
  // ④ 오답풀이 재도전(CLAUDE.md 0-8, D13과 같음) — 연결형은 맞힌 짝을 남기고 틀린 짝만 풀림, 빈칸형은 틀린 보기를 연한 오답색으로 막고 빈칸을 비움
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
      if (due) { refund(QZ_REFUND_AMOUNT); sessSave(); }   // (그 사이 새로고침돼 놓친 몫은 완주 때 맞춰 돌려줌)
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
    if (!qz.judged) {   // 제출하기(지판 빈자리·점 찍기·연결형·빈칸형 — 맞추기·주법 듣기는 누르는 즉시 채점)
      const it = cur();
      if ((it.type === 'pfill' || it.type === 'ffill') && Object.keys(findSel).length) findJudge();
      else if (it.type === 'fill' && Object.keys(fillSel).length) fillJudge();
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
    $('combo-v2-clear-level').textContent = (SOLO ? '펜타 대각 이동 훈련' : '펜타토닉 대각 연결') + ' · 퀴즈 ' + qz.star;
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
    qz = { star: star, qs: makeQuestions(star), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false };
    const saved = sessLoad();
    if (saved) SESS_FIELDS.forEach(function (k) { if (saved[k] !== undefined) qz[k] = saved[k]; });
    $('jq-track').hidden = false;
    $('jq-fill').style.width = '0%';
    $('jq-btn').onclick = function () { if (qz.over) return; next(); };
    $('combo-v2-clear-btn').onclick = function () { if (typeof _playConfirmSfx === 'function') _playConfirmSfx(); J.goHome(); };
    $('combo-v2-overlay').onclick = function (e) { if (!e.target.closest('button')) seqSkip(); };   // 오답풀이 안내·완주 화면 터치 = 한 단계씩 스킵(돌아가기 버튼은 제외)
    J.setQuizBack(function () {
      if (qz.phase === 'review') { quitQuiz(); J.goHome(); return; }   // 오답풀이 중엔 낸 피크가 없어 확인 없이
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;
      showLeavePracticeModal(function () { quitQuiz(); J.goHome(); }, { title: '퀴즈를 그만두시겠어요?', desc: '지금 나가면 퀴즈를<br>처음부터 다시 풀어야 해요.' });
    });
    if (saved) {
      qProgress();
      if (qz.judged) next(); else render();   // 채점이 끝난 문제였으면 그다음으로(오답풀이 재도전이면 같은 문제)
    } else render();
    $('jq-view').classList.remove('quiz-view--right');   // 리하모니와 같은 전환 — 오른쪽에서 들어옴
  }
  // 직접 그만두기(X → 그만할래요, 오답풀이 중 X) — 저장분을 지우고 정리. 울리는 기타 소리 하드컷(CLAUDE.md 0-2)
  function quitQuiz() {
    clearTimeout(autoTimer); autoTimer = null;   // 예약된 자동 재생 취소(이탈 — CLAUDE.md 0-2)
    chordGen++;   // 늦게 도착하는 코드 소리도 취소
    if (qz) qz.quit = true;   // 늦게 오는 정답·오답음 막음
    sessClear();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');   // 이미 받은 도중 환급은 서버에 반영(회수하지 않음 — §1-5)
    overlayAbort();
    stopSound();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    clearTimeout(autoTimer); autoTimer = null;
    chordGen++;   // 백그라운드 — 늦게 도착하는 코드 소리 취소
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });

  J.register(NODE_ID, { onCut: lecCut, layers: ['n21-fb', 'n21-jam'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 마지막 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
