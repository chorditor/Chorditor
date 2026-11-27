// ───────────────────────────────────────────────────────────
// 여정 노드: 기타 필수 스킬 (코드반주 D20 — 사용자 지정 2026-11-20)
//   기타의 큰 특징이자 아이덴티티인 해머링·풀링오프·슬라이드. 솔로뿐 아니라 코드 반주에서도 씀.
//   먼저 타브악보 보는 법(공용 tab-render.js) → 주법마다 설명 + 악보 기호(H·P·sl.) + 시연 → 학습자가 화면 지판으로 직접 따라 하기(공용 fret-gesture.js)
//   악보 = 사용자 스크린샷(Guitar Pro, 2026-11-20) 6마디 그대로: ① 2번줄 3h5 ② 5p3 ③ 1번줄 12p0 11p0 9p0 11p0 ④ 3h5p3 ⑤ 3 sl 5 ⑥ 5 sl 3
//     ③(개방현 도약)은 시연만 — 화면에선 개방현을 누를 손가락이 없어(손을 다 떼면 소리가 멈춤 — 사용자 지정) 따라 하기·문제에서 뺌
//   소리 = 주법 경로(guitar-audio.js artNote·artLegato·artSlide — 울림 하나에서 음높이만 바꿈, docs/articulation-test.html에서 귀로 확정). 밴딩은 쓰지 않음(사용자 지정)
//   따라 하기 지판 = 점 없이 2~5프렛만, 프렛 번호 3·5와 바디 점만(사용자 지정)
//   단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석, 강의 지연은 J.wait/J.later(엔진 타이머)만
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const SOLO = /[?&]course=soloing/.test(location.search);   // 솔로연주 비기너 D12 — 문구 일부·P1이 다름(아래 steps.splice)
  const PICKED = SOLO ? '피킹한' : '튕긴';   // 솔로는 D3·D4에서 '피킹'으로 배움(사용자 지정 2026-11-24), 코드반주는 '튕긴'
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄 E4 B3 G3 D3 A2 E2
  function midiOf(s, f) { return OPEN_MIDI[s - 1] + f; }

  // ── 악보 — notes = [{ s, f }], marks = 주법 기호(a번 음 → b번 음), tech[i] = i번 음을 내는 방법(첫 음 = pick) ──
  //  rh = 리듬(스크린샷 그대로, 화면 표시용 — 판정은 박자를 보지 않음): 음마다 길이(8분음표 수 1 8분 · 2 4분 · 4 2분 · 6 점2분), '~d' = 앞 음에 붙임줄로 이어진 길이
  function mk(s, frets, marks, rh) {
    const tech = frets.map(function () { return 'pick'; });
    marks.forEach(function (m) { tech[m.b] = m.type === 'h' ? 'hammer' : m.type === 'p' ? 'pull' : 'slide'; });
    let i = 0;
    const rhythm = rh.split(' ').map(function (t) { return t[0] === '~' ? { tie: i - 1, d: +t.slice(1) } : { n: i++, d: +t }; });
    return { notes: frets.map(function (f) { return { s: s, f: f }; }), marks: marks, tech: tech, rhythm: rhythm };
  }
  const TABS = {
    1: mk(2, [3, 5], [{ type: 'h', a: 0, b: 1 }], '1 1 ~6'),
    2: mk(2, [5, 3], [{ type: 'p', a: 0, b: 1 }], '1 1 ~6'),
    3: mk(1, [12, 0, 11, 0, 9, 0, 11, 0], [{ type: 'p', a: 0, b: 1 }, { type: 'p', a: 2, b: 3 }, { type: 'p', a: 4, b: 5 }, { type: 'p', a: 6, b: 7 }], '1 1 1 1 1 1 1 1'),
    4: mk(2, [3, 5, 3], [{ type: 'h', a: 0, b: 1 }, { type: 'p', a: 1, b: 2 }], '1 1 2 ~4'),
    5: mk(2, [3, 5], [{ type: 'sl', a: 0, b: 1 }], '1 1 ~6'),
    6: mk(2, [5, 3], [{ type: 'sl', a: 0, b: 1 }], '1 1 ~6'),
  };
  // 마지막 페이즈 정리 에셋 — 세 주법을 가로로(악보 줄·음표 꼬리 없이 숫자·기호만 — 사용자 지정 2026-11-23). 두 숫자는 칸의 0.3·0.7 자리
  function sumM(frets, type) { const t = mk(2, frets, [{ type: type, a: 0, b: 1 }], '1 1'); t.rhythm = []; t.notes[0].t = 0.3; t.notes[1].t = 0.7; return t; }
  const SUM_TECH = [
    { name: '해머링', m: sumM([3, 5], 'h') },
    { name: '풀링오프', m: sumM([5, 3], 'p') },
    { name: '슬라이드', m: sumM([3, 5], 'sl') },
  ];
  const PLAYABLE = [1, 2, 4, 5, 6];   // 화면 지판(2~5프렛)으로 칠 수 있는 악보 — 따라 하기·문제 ②

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
  // 폼의 지판 창 — 블럭 앞뒤로 한 칸씩 더(양 끝 칸은 흐리게 — D15와 같음). 누를 수 있는 칸 = 블럭 프렛 범위
  function formWin(F) {
    const fr = FORMS[F].map(function (n) { return n[1]; });
    const lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr);
    return { lo: lo - 1, cols: hi - lo + 3, minF: lo, maxF: hi, fade: true };
  }
  function pairOf(F, s) { return FORMS[F].filter(function (n) { return n[0] === s; }).map(function (n) { return n[1]; }); }   // 그 줄의 두 음 [낮은, 높은]

  // ── 기타 지판 — 스케일 훈련 퀴즈 지판(.fb-*)·D15 창 규칙과 같은 클래스. win = { lo, cols, minF, maxF, fade } ──
  //  기준 폭 360px = 7칸, 넥 높이 = (360/2.3 − 2.25) × 6/5, 내부 단위 --fbu = 넥 높이 ÷ 160(D2·D15와 같음)
  const SFB_REF_W = 360, SFB_REF_COLS = 7, SFB_MAX_W = 520;
  const SFB_NECK_H = (SFB_REF_W / 2.3 - 2.25) * 6 / 5;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
  const SINGLE_DOTS = [3, 5, 7, 9, 15, 17], DOUBLE_DOTS = [12];
  const LEC_WIN = { lo: 2, cols: 4, minF: 2, maxF: 5, fade: false };
  const HIGH_WIN = { lo: 9, cols: 4, minF: 9, maxF: 12, fade: false };   // 풀링오프 개방현 큰 도약 칸(악보 ③ 1번줄 12·11·9 — 사용자 지정 2026-11-23: 지판을 걷지 말고 9~12프렛으로 옮김)   // 따라 하기 지판 2~5프렛(사용자 지정 — 점 없이, 프렛 번호 3·5와 바디 점만)
  function fbX(win, f) { return (f - win.lo + 0.5) / win.cols * 100; }
  function fbY(s) { return (s - 0.5) / 6 * 100; }
  // size = { w(지판 폭 px), neckH(넥 높이 px) }, opt = { ghost(고스트 점 자리), big(직접 치는 지판 — 점을 크게, .n20-big) }
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
    return '<div class="fb-full-wrapper n2-sfb n20-sfb' + (win.fade ? ' n15-sfb' : '') + (opt.big ? ' n20-big' : '') + '" style="width:' + size.w + 'px;--fbu:' + (size.neckH / 160) + 'px;--n15-fade:' + (colW * 0.7) + 'px">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums">' + nums + '</div></div>';
  }
  function noteEl(win, s, f, extra) {
    const el = document.createElement('div');
    el.className = 'fb-note' + (extra ? ' ' + extra : '');
    el.style.left = fbX(win, f) + '%';
    el.style.top = fbY(s) + '%';
    el.dataset.k = s + '-' + f;
    return el;
  }
  // 손가락 점 — 그 줄에 지금 눌린 자리 전부(브랜드색), 소리 나는 자리는 파랑(.n20-snd). frets = 눌린 프렛 목록, snd = 소리 나는 프렛
  function drawFingers(neckEl, win, s, frets, snd) {
    Array.prototype.forEach.call(neckEl.querySelectorAll('.n20-t[data-s="' + s + '"]'), function (el) { el.remove(); });
    frets.forEach(function (f) {
      if (f < win.lo || f >= win.lo + win.cols) return;
      const el = noteEl(win, s, f, 'n20-t' + (f === snd ? ' n20-snd' : ''));
      el.dataset.s = s;
      neckEl.appendChild(el);
    });
  }
  function clearFingers(neckEl) { if (neckEl) Array.prototype.forEach.call(neckEl.querySelectorAll('.n20-t'), function (el) { el.remove(); }); }

  // ── 악보 따라 치기 판정(강의 따라 하기·문제 ② 공용) — 악보 첫 음을 피크로 친 순간 시작, 그 뒤 주법이 순서대로 맞으면 한 칸씩 ──
  //  시작 전의 다른 동작·첫 음이 아닌 곳을 치기·손을 다 떼기 = 처음부터(벌 없음). 시작한 뒤 다른 주법이 나오면 'miss'(문제는 오답, 강의는 처음부터)
  //  돌려주는 값: 'start' | 'step' | 'done' | 'miss' | 'reset' | null, .at() = 맞힌 마지막 음 번호(-1 = 시작 전)
  //  loose: 첫 음에 해머링으로 닿아도 시작으로 봄 — 아래 손가락을 먼저 짚고(마우스는 Shift) 위 손가락을 놓는 순서도 통과(강의·문제 ② 모두, 2026-11-23)
  function matcher(T, loose) {
    const s = T.notes[0].s, last = T.notes.length - 1;
    let i = -1;
    const fn = function (ev) {
      if (ev.type === 'press' || ev.type === 'release') return null;
      if (loose && i < 0 && ev.type === 'hammer' && ev.s === s && ev.f === T.notes[0].f) { i = 0; return 'start'; }
      if (ev.type === 'pick') {
        if (ev.s === s && ev.f === T.notes[0].f) { i = 0; return 'start'; }
        const was = i; i = -1; return was >= 0 ? 'reset' : null;
      }
      if (ev.type === 'stop') { const was = i; i = -1; return was >= 0 && was < last ? 'reset' : null; }
      if (i < 0 || i >= last) return null;
      const cur = T.notes[i], nx = T.notes[i + 1], want = T.tech[i + 1];
      if (ev.s === s && ev.type === want && ev.f === nx.f) { i++; return i === last ? 'done' : 'step'; }
      if (ev.s === s && ev.type === 'slide' && want === 'slide') {   // 슬라이드 중간 칸(지나가는 프렛)은 그대로
        const lo = Math.min(cur.f, nx.f), hi = Math.max(cur.f, nx.f);
        if (ev.f > lo && ev.f < hi && Math.sign(ev.f - ev.from) === Math.sign(nx.f - cur.f)) return null;
      }
      i = -1;
      return 'miss';
    };
    fn.at = function () { return i; };
    return fn;
  }

  // ═══════════════════════════ 강의 ═══════════════════════════
  // 무대: 층 하나(#n20-main) = 위 타브악보(#n20-tab) + 아래 지판(#n20-fbw) — 둘을 같이 보며 악보 ↔ 지판을 잇는 강의라 겹치지 않고 위아래로.
  //  무대 높이는 이 노드만 350px(.n20-stage — 리듬 표시가 있는 악보 + 줄 간격을 넓힌 지판이 들어가게).
  //   단 첫 칸(도입 — 문구만)은 기본 220px(다른 노드와 같은 문구 위치), 악보·지판이 나오는 2번째 칸부터 350px(사용자 지정 2026-11-23 — reset이 켜고 첫 칸 enter가 끔)
  let lecW = 320, lecGest = null, artUsed = false, follow = null, curTab = null, curWin = LEC_WIN;   // curWin = 강의 지판의 지금 창(보통 2~5, 개방현 칸만 9~12)
  // 마우스 기기 안내(사용자 지정 2026-11-20) — 마우스는 손가락 두 개를 못 써서 Shift = 누르고 있는 상태(fret-gesture.js). 휴대폰·태블릿에는 안 띄움
  const MOUSE = FretGesture.mouseDevice();
  const MOUSE_HINT = '마우스는 ' + em('Shift') + '를 누른 채 첫 음을 클릭하면 그 음을 짚고 있어요';   // Shift = 첫 음만 짚어 둠(fret-gesture.js, 2026-11-23) — 해머링 Shift+3 → 5 / 풀링오프 Shift+3 → 5를 누른 뒤 위로 긁듯이 떼기(그냥 떼면 멈춤)
  function lecSize() { const w = Math.min(lecW, 340); return { w: w, neckH: Math.min(w * 0.5, 170) }; }   // 손가락으로 누르기 쉽게 줄 간격을 넓게(사용자 지정 2026-11-20 — 넥 높이 폭의 0.36 → 0.5)
  function lecNeck() { return $('n20-neck'); }
  function build(stage) {
    stage.classList.add('is-jny');   // .n20-stage는 칸마다(tall)
    lecW = stage.clientWidth || (window.innerWidth - 32);
    stage.innerHTML = '<div class="jl-layers"><div class="jl-layer n20-main" id="n20-main">' +
      '<div class="n20-tab" id="n20-tab"></div>' +
      '<div class="n20-fbw" id="n20-fbw">' + boardHtml('n20-neck', LEC_WIN, lecSize(), { big: true }) + '</div>' +
      (MOUSE ? '<div class="n20-hint" id="n20-hint">' + MOUSE_HINT + '</div>' : '') + '</div>' +
      '<div class="jl-layer jl-rise n20-sum" id="n20-sum"></div></div>';   // 마지막 페이즈 정리 — 빈 무대에 새로 나타나는 장면이라 밑에서 올라옴(§4-32)
    attachLec();
  }
  function attachLec() {
    if (lecGest) lecGest.detach();
    lecGest = FretGesture.attach(lecNeck(), { lo: curWin.lo, cols: curWin.cols, minF: curWin.minF, maxF: curWin.maxF, onEvent: lecEvent, enabled: function () { return !demoBusy; } });
  }
  // 지판을 누를 때마다: 소리(주법 경로) + 손가락 점 + 따라 하기 판정
  function lecEvent(ev) {
    if (J.skipping()) return;
    lastTouch = Date.now();
    artUsed = true;
    FretGesture.play(ev);
    drawFingers(lecNeck(), curWin, ev.s, lecGest.held(ev.s), lecGest.sounding(ev.s));
    if (follow) feedFollow(ev);
  }
  // 칸이 바뀔 때·이동·건너뛰기·닫기(엔진 onCut) — 주법 소리 하드컷(CLAUDE.md 0-7) + 누르던 손가락·따라 하기 정리
  function lecCut() {
    follow = null;
    flickGen++;
    demoBusy = false;
    if (lecGest) lecGest.reset();
    clearFingers(lecNeck());
    if (artUsed && typeof GuitarAudio !== 'undefined') { GuitarAudio.panic(); artUsed = false; }
  }

  // ── 악보 ──
  //  ids = 그릴 악보 번호들(한 줄에 마디 여러 개), opt = { strNums, hideMarks }
  function setTab(ids, opt) {
    opt = opt || {};
    curTab = { ids: ids, opt: opt };
    $('n20-tab').innerHTML = TabRender.svg(ids.map(function (i) { return TABS[i]; }), { width: lecSize().w, strNums: opt.strNums, hideMarks: opt.hideMarks });
  }
  function tq(sel) { return Array.prototype.slice.call(document.querySelectorAll('#n20-tab ' + sel)); }
  function tabNote(mi, i) { return tq('.tab-n[data-m="' + mi + '"][data-i="' + i + '"]'); }
  function tabOff() { tq('.is-on, .is-ok').forEach(function (el) { el.classList.remove('is-on', 'is-ok'); }); }
  function showMarks() { return fx(tq('.tab-mk'), 'tab-mk--hide', false); }
  function strFocus(s, on) {
    tq('.tab-line[data-s="' + s + '"], .tab-sn[data-s="' + s + '"]').forEach(function (el) { el.classList.toggle('is-on', on); });
    const str = lecNeck().querySelector('.fb-string[data-s="' + s + '"]');
    if (str) str.classList.toggle('is-focus', on);
  }
  // 층 켜기 — 엔진은 장면이 바뀔 때 층을 끄기만 하고 켜는 건 노드 몫(applyScene). 악보·지판을 띄울 때 층(#n20-main)도 같이 켬
  function layerOn() { const el = $('n20-main'); if (el) el.classList.add('is-on'); }
  function tabIn() { layerOn(); return fx([$('n20-tab')], 'is-in', true); }
  function fbIn(on) { if (on !== false) layerOn(); return fx([$('n20-fbw')], 'is-in', on !== false); }
  function none() { return Promise.resolve(); }
  function hintIn() { const h = $('n20-hint'); return h ? fx([h], 'is-in', true) : none(); }   // 마우스 기기만 — 해머링·풀링오프 따라 하기 칸
  function tall(on) { const st = $('combo-v2-lec-stage'); if (st) st.classList.toggle('n20-stage', on); }   // 무대 350px 켜기/끄기
  // 타브악보 칸(페이즈1 스텝3·4) 시작 화면 — 악보 ①(기호 숨김) + 지판이 이미 떠 있는 상태(이전 칸으로 돌아오거나 바로 들어와도 같은 화면)
  const TAB_P1 = { strNums: true, hideMarks: true };   // 페이즈1 악보 ① — 'TAB' 대신 줄 번호 1~6(스텝2 '가로줄 6개' 문구부터), 기호 숨김. 스텝3·4는 이 모양 그대로 이어받음
  function tabBase() { reset(); setTab([1], TAB_P1); layerOn(); setCls([$('n20-tab'), $('n20-fbw')], 'is-in', true); }
  function boardsOut() { setCls([$('n20-tab'), $('n20-fbw')], 'is-in', false); }   // 악보·지판 내림 — 다음에 띄울 때 다시 밑에서 올라옴
  // 강의 지판 창 바꾸기(같은 자리에서 다시 그림 + 터치 다시 연결). 칸 시작(reset)은 늘 2~5로 되돌림
  function setBoard(win) {
    if (curWin === win) return;
    curWin = win;
    const fbw = $('n20-fbw');
    if (!fbw) return;
    fbw.innerHTML = boardHtml('n20-neck', win, lecSize(), { big: true });
    attachLec();
  }
  // 풀링오프 '위로 긁듯이' 안내(사용자 지정 2026-11-23 — 잔상은 안내로만): 따라 하기 칸에서 학습자가 지판을 안 만지는 동안만,
  //  떼는 손가락(f프렛) 자리에서 1번줄 쪽으로 작은 점 4개가 차례로 찍혔다 사라짐을 되풀이. 만지면 쉬고, 손을 뗀 뒤 FLICK_IDLE_MS 지나면 다시. 칸이 바뀌면 엔진이 예약(later)을 지움
  const FLICK_IDLE_MS = 1500, FLICK_EVERY_MS = 1600;
  let lastTouch = 0, flickGen = 0;
  function flickGuide(s, f) {
    const gen = ++flickGen;
    if (!(lecGest && lecGest.touching()) && Date.now() - lastTouch > FLICK_IDLE_MS) flickDots(s, f);   // 시작하자마자 한 번
    (function loop() {
      later(function () {
        if (gen !== flickGen) return;   // 따라 하기를 통과했거나(feedFollow) 칸이 바뀜(lecCut)
        if (!(lecGest && lecGest.touching()) && Date.now() - lastTouch > FLICK_IDLE_MS) flickDots(s, f);
        loop();
      }, FLICK_EVERY_MS);
    })();
  }
  function flickDots(s, f) {
    const nk = lecNeck();
    if (!nk) return;
    [0, 1, 2, 3].forEach(function (k) {
      later(function () {
        const d = document.createElement('div');
        d.className = 'n20-flick';
        d.style.left = fbX(curWin, f) + '%';
        d.style.top = 'calc(' + fbY(s) + '% - ' + (k * 100 / 6 * 0.28) + '%)';
        nk.appendChild(d);
        setTimeout(function () { d.remove(); }, 600);
      }, k * 70);
    });
  }
  // 정리 에셋 그리기 — 세 주법을 가로로(폭 = 무대를 셋으로 나눈 만큼)
  function sumHtml() {
    const w = Math.floor((Math.min(lecW, 360) - 2 * 16) / 3);
    return SUM_TECH.map(function (t) {
      return '<div class="n20-si">' + TabRender.svg([t.m], { width: w, bare: true }) + '<span class="n20-sl">' + t.name + '</span></div>';
    }).join('');
  }
  function openStr(s, on) { const str = lecNeck() && lecNeck().querySelector('.fb-string[data-s="' + s + '"]'); if (str) str.classList.toggle('is-focus', on); }
  function reset() {   // 칸 시작 화면 정리
    tall(true);
    setBoard(LEC_WIN);
    follow = null;
    if ($('n20-hint')) $('n20-hint').classList.remove('is-in');
    clearFingers(lecNeck());
    setCls(tq('.tab-line.is-on, .tab-sn.is-on'), 'is-on', false);
    Array.prototype.forEach.call(lecNeck().querySelectorAll('.fb-string.is-focus'), function (el) { el.classList.remove('is-focus'); });
  }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }

  // ── 시연 — 악보 하나를 주법 소리로 예약(오디오 시계) + 같은 시각에 악보 숫자·기호 파랑, 지판 손가락 점 ──
  //  stepS = 음 사이(초, 악보 120bpm 8분음표 = 0.25 — 듣기 쉽게 조금 느리게), 마지막 음은 RING_S 울린 뒤 짧게 사라짐(정상 종료 = 페이드)
  const RING_S = 1.3;
  // 소리 시연 중엔 지판 터치를 막음(사용자 지정 2026-11-23 — 시연 소리·손가락 점과 직접 누른 것이 섞이는 버그 방지). 칸이 바뀌면(lecCut) 풀림
  let demoBusy = false;
  function busyOn() { demoBusy = true; if (lecGest) lecGest.reset(); }
  function demo(id, mi, stepS) {
    if (J.skipping()) return Promise.resolve();
    busyOn();
    const T = TABS[id], t0 = J.audioT0(), lead = J.leadMs(), st = stepS || 0.32, key = 'demo';
    const phrase = T.notes.map(function (n) { return midiOf(n.s, n.f); });
    artUsed = true;
    let held = [];
    T.notes.forEach(function (n, i) {
      const at = t0 + i * st, m = midiOf(n.s, n.f), tech = T.tech[i];
      if (tech === 'pick') GuitarAudio.artNote(key, m, { at: at, phrase: phrase });
      else if (tech === 'hammer') GuitarAudio.artLegato(key, m, 'hammer', { at: at });
      else if (tech === 'pull') GuitarAudio.artLegato(key, m, 'pull', { at: at, open: n.f === 0 });
      else GuitarAudio.artSlide(key, m, { at: at });
      // 손가락: 피크로 칠 때 다음 음이 풀링오프면 내려갈 자리를 미리 짚음(실제 연주와 같음), 해머링 = 손가락 하나 더, 풀링오프 = 위 손가락을 뗌, 슬라이드 = 손가락이 옮겨 감
      if (tech === 'pick') { held = [n.f]; if (T.tech[i + 1] === 'pull') held.push(T.notes[i + 1].f); }
      else if (tech === 'hammer') held = held.concat([n.f]);
      else if (tech === 'pull') held = held.filter(function (f) { return f <= n.f; });
      else held = [n.f];
      const snap = held.slice();
      later(function () {
        tabOff();
        setCls(tabNote(mi, i), 'is-on', true);
        T.marks.forEach(function (mk, k) { if (mk.b === i) setCls(tq('.tab-mk[data-m="' + mi + '"][data-k="' + k + '"]'), 'is-on', true); });
        drawFingers(lecNeck(), curWin, n.s, snap, n.f);
        openStr(n.s, n.f === 0);
      }, lead + i * st * 1000);
    });
    const end = (T.notes.length - 1) * st + RING_S;
    GuitarAudio.artStop(key, { at: t0 + end, fade: 0.3 });
    return wait(lead + end * 1000 + 300).then(function () { demoBusy = false; tabOff(); clearFingers(lecNeck()); openStr(T.notes[0].s, false); });
  }

  // ── 따라 하기(참여형, §4-8) — 악보대로 지판을 칠 때까지 '다음' 잠금. 맞힌 음은 악보 숫자 파랑, 다 맞히면 초록 ──
  function feedFollow(ev) {
    const r = follow.match(ev), mi = follow.mi;
    if (r === 'start' || r === 'reset' || r === 'miss') tabOff();
    if (r === 'start' || r === 'step') setCls(tabNote(mi, follow.match.at()), 'is-on', true);
    if (r === 'done') {
      flickGen++;   // 긁기 안내 멈춤
      const d = window.JQuizKit.passSound();   // 정답음(퀴즈와 같은 상승 벨) — 다음으로 넘어갈 수 있다는 신호(사용자 지정 2026-11-23). 친 음이 먼저, 약간 뒤에 벨(2026-11-24)
      tabOff();
      (follow.ok || TABS[follow.id].notes.map(function (n, i) { return i; })).forEach(function (i) { setCls(tabNote(mi, i), 'is-ok', true); });
      const f = follow;
      follow = null;
      later(f.res, Math.max(700, d + 300));
    }
  }
  // 빨리 돌리는 중(이동·건너뛰기)이면 기다리지 않음(D1 waitTap·D15 waitFill과 같음)
  function waitPlay(id, mi, loose) {
    return new Promise(function (res) {
      if (J.skipping()) { res(); return; }
      tabOff();
      follow = { id: id, mi: mi || 0, match: matcher(TABS[id], loose), res: res };
      (function poll() { later(function () { if (!follow) return; if (J.skipping()) { follow = null; res(); } else poll(); }, 200); })();
    });
  }
  // 한 자리 누르기 따라 하기(해머링 스텝2 — 사용자 지정 2026-11-23): 그 줄·프렛을 누르면 통과, 맞힌 악보 숫자(ni) 초록
  function waitTouch(s, f, mi, ni) {
    return new Promise(function (res) {
      if (J.skipping()) { res(); return; }
      tabOff();
      const m = function (ev) { return ev.s === s && ev.f === f && (ev.type === 'pick' || ev.type === 'press' || ev.type === 'hammer') ? 'done' : null; };
      m.at = function () { return -1; };
      follow = { id: null, mi: mi || 0, ok: [ni || 0], match: m, res: res };
      (function poll() { later(function () { if (!follow) return; if (J.skipping()) { follow = null; res(); } else poll(); }, 200); })();
    });
  }
  // 해머링 한 단계씩 시연(사용자 지정 2026-11-23): 'pick' = 2번줄 3프렛 튕김(검지 점 + 악보 3) / 'hammer' = 약지로 5프렛 해머링(점 하나 더 + 악보 5·H). 소리는 칸이 바뀔 때 엔진이 끊음(onCut)
  function hamStep(kind) {
    if (J.skipping()) return Promise.resolve();
    const t0 = J.audioT0(), lead = J.leadMs(), m3 = midiOf(2, 3), m5 = midiOf(2, 5);
    artUsed = true;
    if (kind === 'pick') GuitarAudio.artNote('demo', m3, { at: t0, phrase: [m3, m5] });
    else { GuitarAudio.artLegato('demo', m5, 'hammer', { at: t0 }); GuitarAudio.artStop('demo', { at: t0 + RING_S, fade: 0.3 }); }
    later(function () {
      tabOff();
      if (kind === 'pick') { setCls(tabNote(0, 0), 'is-on', true); drawFingers(lecNeck(), LEC_WIN, 2, [3], 3); }
      else { setCls(tabNote(0, 1), 'is-on', true); setCls(tq('.tab-mk[data-m="0"][data-k="0"]'), 'is-on', true); drawFingers(lecNeck(), LEC_WIN, 2, [3, 5], 5); }
    }, lead);
    if (kind === 'pick') busyOn();   // 튕김 → 해머링 시연 사이(문구가 바뀌는 동안)도 막음 — 해머링 시연이 끝나면 풂
    return wait(lead + (kind === 'pick' ? 900 : RING_S * 1000 + 300)).then(function () { if (kind !== 'pick') demoBusy = false; });
  }
  // 지금 문구 아래에 줄 하나 덧붙임(윗줄은 그대로, 새 줄만 페이드 — 엔진 seq 문구의 .lec-ln과 같은 등장)
  function capLine(text) {
    if (J.skipping()) return;
    const cap = document.querySelector('#combo-v2-lec-text .lec-cap');
    if (cap) cap.insertAdjacentHTML('beforeend', '\n<span class="lec-ln">' + text + '</span>');
  }
  // 해머링 칸(스텝2~4) 시작 화면 — 악보(기호 보임) + 지판이 떠 있는 상태
  function hamBase(id) { reset(); setTab([id || 1]); layerOn(); setCls([$('n20-tab'), $('n20-fbw')], 'is-in', true); }
  function techBase(ids) { reset(); setTab(ids); layerOn(); setCls([$('n20-tab'), $('n20-fbw')], 'is-in', true); }   // 풀링오프·슬라이드 칸 시작 화면(악보 기호 보임)
  // 주법 한 단계 시연(풀링오프·이어치기·슬라이드 — 해머링 hamStep과 같은 방식, 사용자 지정 2026-11-23). 2번줄 고정
  //  o = { kind: 'pick'|'hammer'|'pull'|'slide', f(소리 날 프렛), fingers(짚은 프렛들), mi·ni(악보 마디·음 번호), mk(켤 기호 번호), last(마지막 단계 — 소리 꼬리 후 터치 풂), phrase }
  function techOne(o) {
    if (J.skipping()) return Promise.resolve();
    const t0 = J.audioT0(), lead = J.leadMs(), m = midiOf(2, o.f);
    artUsed = true;
    busyOn();
    if (o.kind === 'pick') GuitarAudio.artNote('demo', m, { at: t0, phrase: o.phrase });
    else if (o.kind === 'slide') GuitarAudio.artSlide('demo', m, { at: t0 });
    else GuitarAudio.artLegato('demo', m, o.kind, { at: t0 });
    if (o.last) GuitarAudio.artStop('demo', { at: t0 + RING_S, fade: 0.3 });
    later(function () {
      tabOff();
      setCls(tabNote(o.mi || 0, o.ni), 'is-on', true);
      if (o.mk != null) setCls(tq('.tab-mk[data-m="' + (o.mi || 0) + '"][data-k="' + o.mk + '"]'), 'is-on', true);
      drawFingers(lecNeck(), curWin, 2, o.fingers, o.f);
    }, lead);
    return wait(lead + (o.last ? RING_S * 1000 + 300 : 900)).then(function () { if (o.last) demoBusy = false; });
  }
  // 따라 하기 직전 — 시연 표시 걷고(마우스면 Shift 안내) 악보대로 칠 때까지
  function followTab(id, mi, loose, hint) {
    tabOff(); clearFingers(lecNeck());
    if (lecGest && lecGest.held(2).length) drawFingers(lecNeck(), LEC_WIN, 2, lecGest.held(2), null);   // 자동으로 짚어 둔 손가락(풀링오프 3프렛)은 남김
    return (hint ? hintIn() : none()).then(function () { return waitPlay(id, mi, loose); });
  }
  // 풀링오프 칸 — 2번줄 3프렛(검지)을 자동으로 짚어 둠(사용자 지정 2026-11-23: 마우스는 두 칸을 함께 못 누름). 칸이 바뀌면 lecCut(reset)이 해제. 화면에도 검지 점
  function pullAnchor() {
    if (!lecGest) return;
    lecGest.anchor(2, 3);
    drawFingers(lecNeck(), LEC_WIN, 2, [3], null);
  }
  function followStep(subs) { return Object.assign(J.chainSteps(subs), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }); }

  // 화면 크기가 바뀌면 강의 악보·지판을 다시 그림(손가락·따라 하기 표시는 정리됨)
  function lecResize(stage) {
    lecW = stage.clientWidth || (window.innerWidth - 32);
    const fbw = $('n20-fbw');
    if (!fbw) return;
    fbw.innerHTML = boardHtml('n20-neck', curWin, lecSize(), { big: true });
    attachLec();
    if (curTab) setTab(curTab.ids, curTab.opt);
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 적용)은 주석 ──
  //  강의 최종 목적: 타브악보를 읽고, 해머링·풀링오프·슬라이드를 기호로 알아보고 직접 칠 수 있음(퀴즈 ① 블럭 복습 ② 타브 보고 치기 ③ 블럭을 주법으로)
  const steps = [
    // P1 도입·타브악보
    // 0 핵심(새 내용): 오늘 배울 것 — 기타의 아이덴티티인 세 주법, 솔로·반주 모두에 씀. 도입이라 문구만(§4-11)
    J.chainSteps([
      { text: '이번 시간에는 기타만이 가진 특징인\n' + em('해머링') + ', ' + em('풀링오프') + ', ' + em('슬라이드') + '를 배워볼게요!', scene: 'n20-intro', enter: function () { reset(); boardsOut(); tall(false); }, run: none },   // 사용자 문구 2026-11-23
      { text: '이 세 가지 주법은\n기타에서 빼놓을 수 없는 ' + em('필수 스킬') + '이에요!', run: none },
    ]),
    // 1 핵심(새 내용): 타브악보 = 가로줄 6개가 기타 6줄, 맨 위가 1번줄(위아래 방향이 핵심), 숫자 = 누를 프렛, 0 = 개방현. 악보 줄 ↔ 지판 줄을 같은 파랑으로 이음.
    //  끝 화면 = 악보 ①(줄 번호, 기호 숨김) + 지판(1번줄 파랑) — 숫자·0 설명은 다음 두 칸으로 나눔(2026-11-23)
    Object.assign(J.chainSteps([
      // 빈 무대에 악보 → 지판 차례로 밑에서 올라온 뒤 문구(사용자 지정 2026-11-23 — 문구 없는 첫 단계, D1 기타 그림과 같은 방식)
      { text: '', gap: 1200, scene: 'n20-main', enter: function () { reset(); boardsOut(); setTab([1], { hideMarks: true }); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
      { text: '먼저 ' + em('타브악보') + ' 보는 법을 알아볼게요', run: none },
      { text: '타브악보의 가로줄 6개는\n기타의 ' + em('6줄') + '이에요', run: function () {
        setTab([1], TAB_P1);   // 'TAB' 글자 → 줄 번호 1~6
        return fx(tq('.tab-sn'), 'is-on', true, 100).then(function () { return wait(400); }).then(function () { return fx(tq('.tab-sn'), 'is-on', false); });
      } },
      { text: em('맨 위') + '가 가장 얇은 ' + em('1번줄') + '이에요', run: function () {
        strFocus(1, true);
        J.note(64, J.audioT0(), 1.2, 0.6);
        return wait(J.leadMs() + 1200);
      } },
    ]), { ms: 9700 }),
    // 2 핵심(새 내용): 줄 위 숫자 = 누를 프렛(2번줄 3·5프렛 소리 + 악보 숫자 + 손가락). 끝 화면 = 악보 ① + 지판(2번줄 파랑) — 스텝2에서 나눔(사용자 지정 2026-11-23)
    Object.assign(J.chainSteps([
      { text: '줄 위의 숫자는 ' + em('누를 프렛') + '이에요\n2번줄 3프렛, 5프렛을 차례로 치라는 뜻이죠', scene: 'n20-main', enter: tabBase, run: function () {
        strFocus(2, true);
        const t0 = J.audioT0();
        [3, 5].forEach(function (f, i) {
          J.note(midiOf(2, f), t0 + i * 0.6, 0.6, 0.2);
          later(function () { tabOff(); setCls(tabNote(0, i), 'is-on', true); drawFingers(lecNeck(), LEC_WIN, 2, [f], f); }, J.leadMs() + i * 600);
        });
        return wait(J.leadMs() + 1800).then(function () { tabOff(); clearFingers(lecNeck()); });
      } },
    ]), { ms: 3560 }),
    // 3 핵심(새 내용): 0 = 개방현. 끝 화면 = 악보 ① + 지판(강조 없음 — 앞 칸 2번줄 파랑은 넘겨받지 않음, 사용자 지적 2026-11-23) — 스텝2에서 나눔
    { text: '숫자 ' + em('0') + '은 아무 데도 누르지 않은\n' + em('개방현') + '이에요', scene: 'n20-main', enter: tabBase, run: none },

    // P2 해머링 — 하나하나 차근차근(사용자 지정 2026-11-23): 스텝마다 한 번 보여 주고 직접 따라 하면 넘어감
    // 4 핵심(새 내용): 해머링 = 왼손가락으로 줄을 때리듯, 기호 H. 끝 화면 = 악보 ①(H) + 지판
    J.chainSteps([
      { text: '먼저, ' + em('해머링') + '은 이름처럼 ' + em('왼손가락') + '으로\n줄을 때리듯이 연주하는 주법이에요!', scene: 'n20-main', enter: function () { reset(); setTab([1], { hideMarks: true }); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
      { text: '악보에서는 ' + em('H') + ' 기호로 표시해요', run: showMarks },
    ]),
    // 5 핵심(따라 하기): 2번줄 3프렛을 검지로 — 누르는 모습(점 + 악보 3) 한 번 → 직접 누르면 통과. 끝 화면 = 악보 3 초록
    followStep([
      { text: '우선 2번줄 3프렛을 ' + em('검지') + '로 눌러주세요', scene: 'n20-main', enter: function () { hamBase(1); }, run: function () {
        setCls(tabNote(0, 0), 'is-on', true);
        drawFingers(lecNeck(), LEC_WIN, 2, [3], null);
        setCls(Array.prototype.slice.call(lecNeck().querySelectorAll('.n20-t')), 'n2-pop', true);   // 누르는 모습 — 점이 톡 눌림
        return wait(1200).then(function () { tabOff(); clearFingers(lecNeck()); return waitTouch(2, 3, 0, 0); });
      } },
    ]),
    // 6 핵심(따라 하기): 튕김(3프렛 소리) → 약지로 5프렛 강하게(해머링 소리) 한 번 → 직접 3 → 5 해머링하면 통과. 끝 화면 = 악보 ① 초록
    followStep([
      { text: SOLO ? '2번줄을 한 번 피킹한 후' : '2번줄을 한 번 튕겨준 후', scene: 'n20-main', enter: function () { hamBase(1); }, run: function () { return hamStep('pick'); } },
      { text: em('약지') + '로 2번줄 5프렛을 ' + em('강하게') + ' 눌러주세요!', run: function () {
        return hamStep('hammer').then(function () { capLine('아래 지판으로 따라해보세요!'); return wait(1600); });   // 시연 뒤 같은 문구 아래 둘째 줄(사용자 지정 2026-11-23)
      } },
      // 한 번에 치는 법을 다시 — 바로 이어서 뜨고, 직접 3을 누른 채 5를 누르면 통과
      { text: '먼저 2번줄 3프렛을 ' + em('누른 채') + '로\n2번줄 5프렛을 눌러주세요!', run: function () {
        tabOff(); clearFingers(lecNeck());
        return hintIn().then(function () { return waitPlay(1, 0); });
      } },
    ]),
    // P3 풀링오프 — 해머링과 같은 방식(설명 → 한 단계씩 시연 → 직접, 사용자 지정 2026-11-23)
    // 7 핵심(새 내용): 풀링오프 = 누르던 손가락을 떼며 다음 음, 반드시 내려가는 음, 기호 P. 끝 화면 = 악보 ②(P) + 지판
    J.chainSteps([
      { text: '이번엔 ' + em('풀링오프') + '예요!\n누르고 있던 손가락을 ' + em('떼면서') + '\n다음 음을 내는 주법이에요', scene: 'n20-main', enter: function () { reset(); setTab([2], { hideMarks: true }); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
      { text: '떼면서 소리를 내니까\n음은 ' + em('반드시 내려가요'), run: none },
      { text: '악보에서는 ' + em('P') + ' 기호로 표시해요', run: showMarks },
    ]),
    // 8 핵심(따라 하기 — 2026-11-23 사용자 지정, 학습자 입장으로 다시 설계): 화면 지판은 '닿기 = 튕기기'라 실제 기타처럼 두 칸을 소리 없이 함께 짚어 둘 수 없음 →
    //  검지(3프렛)는 자동으로 짚어 두고(pullAnchor), 학습자는 풀링오프의 핵심인 '5프렛을 튕긴 뒤 약지를 떼면 아래 음이 난다'만 직접. 터치·마우스 모두 5프렛 누르기 → 떼기. 끝 화면 = 악보 ② 초록
    followStep([
      { text: '검지는 3프렛에 짚어 둘게요', scene: 'n20-main', enter: function () { techBase([2]); pullAnchor(); }, run: function () {
        setCls(Array.prototype.slice.call(lecNeck().querySelectorAll('.n20-t')), 'n2-pop', true);
        return wait(900);
      } },
      { text: '2번줄 5프렛을 ' + em('약지') + '로 ' + PICKED + ' 후', run: function () {
        return techOne({ kind: 'pick', f: 5, fingers: [3, 5], ni: 0, phrase: [midiOf(2, 5), midiOf(2, 3)] });
      } },
      { text: em('약지') + '를 ' + em('위로 살짝 긁듯이') + ' 떼어주세요!', run: function () {
        return techOne({ kind: 'pull', f: 3, from: 5, fingers: [3], ni: 1, mk: 0, last: true }).then(function () { capLine('아래 지판으로 따라해보세요!'); flickGuide(2, 5); return wait(1600); });   // 긁기 안내 점 — 이 문구부터 통과할 때까지(만지지 않는 동안만)
      } },
      { text: '5프렛을 누른 다음\n' + em('위로 살짝 긁듯이') + ' 떼어주세요!', run: function () { pullAnchor(); return followTab(2, 0, false, false); } },   // 시연(busyOn)이 지운 자동 검지를 다시 짚음
    ]),
    // 10 핵심(풀링오프의 응용): 개방현으로 큰 도약(1번줄 12 0 11 0 9 0 11 0). 지판을 9~12프렛 창으로 옮겨 악보대로 점(개방현은 1번줄 파랑) — 시연만(따라 하기 없음). 끝 화면 = 악보 ③ + 9~12 지판
    Object.assign(J.chainSteps([
      { text: '풀링오프는 ' + em('개방현') + '을 이용해서\n' + em('큰 도약') + '을 할 때도 많이 써요', scene: 'n20-main', enter: function () { reset(); setBoard(HIGH_WIN); setTab([3]); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
      { text: '1번줄 높은 프렛을 치고 떼면\n바로 개방현 소리가 나요', run: function () { return demo(3, 0, 0.26); } },
    ]), { ms: 8640 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)

    // P4 해머링 + 풀링오프 — 같은 방식
    // 11 핵심(적용): 이어서 치기(3h5p3) 소개. 끝 화면 = 악보 ④ + 지판
    J.chainSteps([
      { text: '이번엔 해머링과 풀링오프를\n' + em('이어서') + ' 연주해볼게요', scene: 'n20-main', enter: function () { techBase([4]); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
    ]),
    // 12 핵심(따라 하기): 튕김 3 → 약지로 5 해머링 → 약지 떼기(풀링오프) 한 단계씩 → 직접. 끝 화면 = 악보 ④ 초록
    followStep([
      { text: '2번줄 3프렛을 ' + PICKED + ' 후', scene: 'n20-main', enter: function () { techBase([4]); }, run: function () {
        return techOne({ kind: 'pick', f: 3, fingers: [3], ni: 0, phrase: [midiOf(2, 3), midiOf(2, 5)] });
      } },
      { text: em('약지') + '로 5프렛을 ' + em('때리고'), run: function () { return techOne({ kind: 'hammer', f: 5, fingers: [3, 5], ni: 1, mk: 0 }); } },
      { text: '다시 ' + em('약지') + '를 ' + em('위로 긁듯이') + ' 떼어주세요!', run: function () {
        return techOne({ kind: 'pull', f: 3, from: 5, fingers: [3], ni: 2, mk: 1, last: true }).then(function () { capLine('아래 지판으로 따라해보세요!'); return wait(1600); });
      } },
      { text: '3프렛을 누른 채로 5프렛을 때린 뒤\n' + em('위로 긁듯이') + ' 떼어주세요!', run: function () { const p = followTab(4, 0, false, true); flickGuide(2, 5); return p; } },
    ]),

    // P5 슬라이드 — 같은 방식
    // 13 핵심(새 내용): 슬라이드 = 누른 채로 미끄러지듯, 기호 sl. + 사선, 올라가기·내려오기 둘 다. 끝 화면 = 악보 ⑤⑥ + 지판
    J.chainSteps([
      { text: '마지막으로 ' + em('슬라이드') + '예요!\n줄을 누른 채로 다음 음까지\n' + em('미끄러지듯') + ' 이동하는 주법이에요', scene: 'n20-main', enter: function () { reset(); setTab([5, 6], { hideMarks: true }); }, run: function () {
        return tabIn().then(function () { return fbIn(true); });
      } },
      { text: '악보에서는 ' + em('sl.') + ' 기호와 사선으로 표시해요', run: showMarks },
      { text: '올라갈 때도, 내려올 때도\n쓸 수 있어요', run: none },
    ]),
    // 14 핵심(따라 하기): 올라가기 — 튕김 3 → 누른 채 5까지 미끄러짐 → 직접. 끝 화면 = 악보 ⑤ 초록
    followStep([
      { text: '먼저 2번줄 3프렛을 ' + PICKED + ' 후', scene: 'n20-main', enter: function () { techBase([5, 6]); }, run: function () {
        return techOne({ kind: 'pick', f: 3, fingers: [3], mi: 0, ni: 0, phrase: [midiOf(2, 3), midiOf(2, 5)] });
      } },
      { text: '손가락을 떼지 말고\n5프렛까지 ' + em('미끄러뜨려') + ' 주세요!', run: function () {
        return techOne({ kind: 'slide', f: 5, fingers: [5], mi: 0, ni: 1, mk: 0, last: true }).then(function () { capLine('아래 지판으로 따라해보세요!'); return wait(1600); });
      } },
      { text: '3프렛을 누른 채로\n5프렛까지 미끄러뜨려 주세요!', run: function () { return followTab(5, 0, false, false); } },
    ]),
    // 15 핵심(따라 하기): 내려오기 — 튕김 5 → 누른 채 3까지 → 직접. 끝 화면 = 악보 ⑤⑥ 초록
    followStep([
      { text: '이번엔 5프렛을 ' + PICKED + ' 후', scene: 'n20-main', enter: function () { techBase([5, 6]); }, run: function () {
        return techOne({ kind: 'pick', f: 5, fingers: [5], mi: 1, ni: 0, phrase: [midiOf(2, 5), midiOf(2, 3)] });
      } },
      { text: '3프렛까지 ' + em('미끄러뜨려') + ' 내려와 주세요!', run: function () {
        return techOne({ kind: 'slide', f: 3, fingers: [3], mi: 1, ni: 1, mk: 0, last: true }).then(function () { capLine('아래 지판으로 따라해보세요!'); return wait(1600); });
      } },
      { text: '5프렛을 누른 채로\n3프렛까지 미끄러뜨려 주세요!', run: function () { return followTab(6, 1, false, false); } },
    ]),
    // P6 정리·퀴즈 안내(사용자 지정 2026-11-23 — 따로 페이즈): 세 주법(해머링·풀링오프·슬라이드)을 가로로 정리한 에셋을 먼저 띄운 뒤 문구. 무대는 기본 높이(문구 위치 = 다른 노드)
    //  끝 화면 = 세 주법 정리
    Object.assign(J.chainSteps([
      { text: '', gap: 1200, scene: 'n20-sum', enter: function () { reset(); tall(false); $('n20-sum').innerHTML = sumHtml(); }, run: function () {
        return fx([$('n20-sum')], 'is-on', true).then(function () { return wait(500); });
      } },
      { text: '이제 퀴즈를 통해 반복 연습을 해볼게요', run: none },
      { text: '3가지 스킬을 복습하고\n스케일 블럭에도 적용하는 훈련을 해볼 거예요!', run: none },
    ]), { ms: 8420 }),   // ms = 가상 시계 측정값
  ];
  // 솔로연주 비기너 D12(2026-11-23 — docs/solo-beginner-curriculum.md): 타브악보는 D3에서 배웠으니 P1의 타브 설명 세 칸을 복습 한 칸으로(새것처럼 다시 가르치지 않음 — CLAUDE.md 0-5)
  if (SOLO) steps.splice(1, 3, Object.assign(J.chainSteps([
    { text: '', gap: 1200, scene: 'n20-main', enter: function () { reset(); boardsOut(); setTab([1], { hideMarks: true }); }, run: function () {
      return tabIn().then(function () { return fbIn(true); });
    } },
    { text: '이번엔 악보에 주법 ' + em('기호') + '가\n함께 나와요', run: none },
  ]), { ms: 3720 }));   // ms = 측정값(2026-11-24 타브 복습 문구 삭제 후 다시 잼)
  const groups = SOLO ? [[0, 1], [2, 3, 4], [5, 6, 7], [8, 9], [10, 11, 12], [13]] : [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11], [12, 13, 14], [15]];

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D15(pentatonic-forms.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1·D2·D15와 같음
  //   문제 수: 별 1 10 / 별 2 15 / 별 3 20 — 환급(정답 5개마다)이 맞아떨어지게 5의 배수(2026-11-23). ②·③ 두 유형(5/5 · 8/7 · 10/10). ① 빈자리 채우기는 출제하지 않음(사용자 지정 2026-11-23)
  //   ① fill 스케일 블럭 빈자리 채우기 — 출제 안 함(fill: 0). 코드는 그 전에 저장된 퀴즈를 이어 풀 때만 씀
  //   ② tab 타브악보를 보고 지판으로 연주 — 강의 시연 악보(①②④⑤⑥) 중에서(무작위 생성 안 함 — 사용자 지정). 박자는 보지 않음, 감지되면 바로 채점(matcher)
  //   ③ tech 스케일 블럭을 주법으로 — 무작위 폼 + 상행(해머링·슬라이드) / 하행(풀링오프·슬라이드)(사용자 지정). 블럭은 고스트 노트(암기는 같이 안 함).
  //      한 줄씩: 그 줄의 주법이 감지되면 그 줄 두 점이 정답색, 틀리면 오답색이 났다 사라지며 흔들리고 같은 줄에 머묾. 6줄을 다 맞힐 때까지 → 늘 정답 처리(오답풀이에 안 넣음 — 사용자 지정)
  //   저장: 별 수 = jnyStars['guitar-skills'], 하던 퀴즈 = jnyQuizSess:guitar-skills
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = {   // 별 → 문제 수 / 유형별 수 / ① 빈칸 수 범위
    1: { n: 10, fill: 0, tab: 5, tech: 5, blank: [2, 2] },   // ① 블럭 빈칸 채우기는 뺌(사용자 지정 2026-11-23 — 주법 타브 따라 하기 · 블럭을 주법으로 상·하행만)
    2: { n: 15, fill: 0, tab: 8, tech: 7, blank: [3, 4] },
    3: { n: 20, fill: 0, tab: 10, tech: 10, blank: [4, 6] },
  };
  const TECHS = [{ tech: 'hammer', up: true }, { tech: 'slide', up: true }, { tech: 'pull', up: false }, { tech: 'slide', up: false }];
  const TECH_NAME = { hammer: '해머링으로', pull: '풀링오프로', slide: '슬라이드로' };
  const NODE_ID = 'guitar-skills';
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  let qz = null;   // 세션 { star, qs, idx, wrong[], phase: 'main'|'review', rvPos, done, judged, canRetry, paid{}, correct, refunded, short }
  // ── 이어 풀기 — 새로고침·앱 종료·백그라운드 뒤에도 하던 퀴즈를 그 문제부터. 문제(순서·보기·짝)·진행·틀린 목록·피크 지불 기록을 이 기기에 저장 ──
  //  X로 나가도 저장(2026-11-27). 완주하면 지움. 마지막으로 답한 지 24시간이 지났거나 저장분의 별이 지금 풀 별과 다르면 버림
  const SESS_FIELDS = ['star', 'qs', 'idx', 'wrong', 'phase', 'rvPos', 'done', 'judged', 'canRetry', 'paid', 'correct', 'refunded', 'at'];
  function sessSave() {
    if (!qz || qz.over || qz.quit) return;
    const o = { node: NODE_ID };
    SESS_FIELDS.forEach(function (k) { o[k] = qz[k]; });
    jnyQuizSessWrite(NODE_ID, o);
  }
  function sessLoad() {
    try {
      const o = jnyQuizSessRead(NODE_ID);
      if (!o || o.node !== NODE_ID || o.star !== window.JourneyLesson.quizStar(starsGet()) || !Array.isArray(o.qs)) return null;
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

  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 빈칸·도수·정답 자리도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const seen = {};
    for (let k = 0, guard = 0; k < cfg.fill && guard < 500; guard++) {   // 같은 폼·빈칸 조합은 한 판에 한 번
      const it = mkFill(FORM_KEYS[rnd(FORM_KEYS.length)], cfg.blank[0] + rnd(cfg.blank[1] - cfg.blank[0] + 1)), sig = it.form + it.ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; qs.push(it); k++;
    }
    let pool = [];
    for (let k = 0; k < cfg.tab; k++) { if (!pool.length) pool = shuffle(PLAYABLE.slice()); qs.push({ type: 'tab', m: pool.pop() }); }   // 강의 시연 악보 다섯 개를 고루
    let combos = [];
    for (let k = 0; k < cfg.tech; k++) {   // 폼 × 주법(상행 해머링·슬라이드 / 하행 풀링오프·슬라이드) 조합을 겹치지 않게
      if (!combos.length) FORM_KEYS.forEach(function (F) { TECHS.forEach(function (t) { combos.push({ type: 'tech', form: F, tech: t.tech, up: t.up }); }); }), shuffle(combos);
      qs.push(combos.pop());
    }
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
  }
  // ① 빈자리 채우기 — 폼 F의 블럭에서 m자리를 비움. 정답 = 비운 자리 전부
  function mkFill(F, m) {
    const ans = shuffle(FORMS[F].map(keyOf)).slice(0, m).sort();
    return { type: 'fill', form: F, ans: ans };
  }

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

  // ── 화면 — 리하모니 문제 화면(#combo-view-quiz-v2) 틀: 헤드(타이틀 + 오답풀기 배지) / 본문 / 하단 버튼 ──
  //  세 유형 모두 안내 카드 + 지판 + 제출하기(D2 ②와 같은 화면)
  const QZ_TITLE = '알맞은 답을 모두 고르세요';   // 타이틀은 일반 문구(D2와 같음) — 문제 내용은 카드에

  // 안내 카드 — 리하모니 _comboV2BuildInfoCard와 같은 3줄(앞 문구 / 강조 / 뒤 문구). mid가 없으면 2줄
  function infoCard(head, mid, tail) {
    return '<div class="combo-v2-info-card cd-card"><p class="combo-v2-info-text"><span>' + head + '</span>' + (mid ? '<b><span>' + mid + '</span></b>' : '') + '<span>' + tail + '</span></p></div>';
  }
  function qBtn(label, enabled, verdict) {
    const b = $('jq-btn');
    b.textContent = label;
    b.dataset.sfx = label === '제출하기' ? 'none' : 'pop';   // 공용 클릭음: 제출하기는 없음(채점 벨만), 다음·완료·다시 풀기·이어서 풀기는 pop
    b.disabled = !enabled;
    b.classList.toggle('combo-v2-submit--ok', verdict === true);
    b.classList.toggle('combo-v2-submit--ng', verdict === false);
  }
  function qProgress() {
    const total = qz.qs.length + qz.wrong.length;
    const pct = Math.sqrt(qz.done / total) * 100;
    const el = $('jq-fill');
    el.style.width = pct + '%';
    el.style.background = pct >= 90 ? '#FFD60A' : pct >= 75 ? '#4CBB17' : '';
  }
  function cur() { return qz.qs[qz.phase === 'review' ? qz.wrong[qz.rvPos] : qz.idx]; }

  // 지판 크기 — ①·③(폼 블럭 창)은 D15 퀴즈 지판과 같은 규칙: 기준 폭(7칸) = 화면 단계별 고정값, 본문 폭보다 크면 본문 폭
  //   단계: ~480 / 481~768 / 769~1079 / 1080~1599 / 1600~ → 기준 폭 328 / 376 / 424 / 472 / 520
  //  ②(2~5프렛 4칸)는 두 손가락으로 누르기 쉽게 본문 폭(최대 380px)을 4칸이 다 씀, 넥 높이 = 폭 × 0.4(최대 150px)
  const QZ_FB_TIER_W = [[480, 328], [768, 376], [1079, 424], [1599, 472], [Infinity, 520]];
  function quizBoardW() {
    const vw = window.innerWidth;
    return Math.min($('jq-content').clientWidth, QZ_FB_TIER_W.find(function (t) { return vw <= t[0]; })[1], SFB_MAX_W);
  }
  function formSize(win) { const ref = quizBoardW(), scale = ref / SFB_REF_W; return { w: ref / SFB_REF_COLS * win.cols, neckH: SFB_NECK_H * scale }; }   // 스케일 블럭 지판(①·③)은 D15와 같은 디자인 그대로(사용자 지정 2026-11-20 — 줄 간격·점 크기 바꾸지 않음)
  function tabBoardSize() { const w = Math.min($('jq-content').clientWidth, 380); return { w: w, neckH: Math.min(w * 0.55, 200) }; }   // 줄 간격 넓게(사용자 지정 2026-11-20)
  function qSize(it) { return it.type === 'tab' ? tabBoardSize() : formSize(qWin(it)); }
  function qWin(it) { return it.type === 'tab' ? LEC_WIN : formWin(it.form); }
  function qNeck() { return $('n20q-neck'); }
  function qDot(k) { return qNeck().querySelector('.fb-note[data-k="' + k + '"]'); }
  // 문제 지판 그리기 — fill: 빈칸 뺀 블럭(근음 = 가운데 흰 원) + 블럭 프렛 범위의 나머지 빈 자리 전부 고스트(D15와 같음)
  //  tab: 점 없는 2~5프렛 지판 / tech: 블럭 전부 고스트(암기는 같이 안 함 — 사용자 지정), 지금 칠 줄의 두 점만 조금 진하게(.n20-cur)
  function mountQuizBoard(it) {
    const win = qWin(it);
    let ghost = [];
    if (it.type === 'fill') {
      const shown = FORMS[it.form].map(keyOf).filter(function (k) { return it.ans.indexOf(k) < 0; });
      for (let s = 1; s <= 6; s++) for (let f = win.minF; f <= win.maxF; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    }
    if (it.type === 'tech') ghost = FORMS[it.form].map(keyOf);
    $('n20q-slot').innerHTML = boardHtml('n20q-neck', win, qSize(it), { ghost: ghost, big: it.type === 'tab' });
    if (it.type === 'fill') FORMS[it.form].forEach(function (n) {
      if (it.ans.indexOf(keyOf(n)) >= 0) return;
      qNeck().appendChild(noteEl(win, n[0], n[1], n[3] === 1 ? 'fb-note--root' : ''));
    });
  }
  function qTabSvg(it) { return TabRender.svg([TABS[it.m]], { width: Math.min($('jq-content').clientWidth, 380) }); }
  // 창 크기가 바뀌면(회전·브라우저 창 조절) 강의 악보·지판, 문제 지판·악보를 다시 맞춤 — 문제 지판은 크기만(고른 점·채점 표시는 % 위치라 그대로), 악보는 다시 그림
  let sfbRT = null;
  window.addEventListener('resize', function () {
    clearTimeout(sfbRT);
    sfbRT = setTimeout(function () {
      const st = $('combo-v2-lec-stage');
      if (st && $('n20-fbw')) lecResize(st);
      if (!qz || qz.short || !$('n20q-slot')) return;
      const it = cur(), win = qWin(it), qb = document.querySelector('#n20q-slot .n20-sfb');
      const sz = qSize(it);
      if (qb) { qb.style.width = sz.w + 'px'; qb.style.setProperty('--fbu', (sz.neckH / 160) + 'px'); qb.style.setProperty('--n15-fade', (sz.w / win.cols * 0.7) + 'px'); }
      if (it.type === 'tab' && $('n20q-tab')) $('n20q-tab').innerHTML = qTabSvg(it);
    }, 120);
  });

  let qGest = null, qMatch = null, techSt = null;
  function render() {
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 문제가 바뀜 → 앞 문제에서 누른 음 하드컷(CLAUDE.md 0-7)
    if (qGest) { qGest.detach(); qGest = null; }
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    findSel = {};
    $('jq-title').textContent = QZ_TITLE;
    $('jq-review-badge').hidden = qz.phase !== 'review';
    const card = it.type === 'fill' ? infoCard('빈자리를 채워서', '펜타토닉 ' + it.form + '폼을', '완성해주세요')
      : it.type === 'tab' ? infoCard('타브악보를 보고', '지판으로', '연주해주세요')
      : infoCard(it.form + '폼을 ' + (it.up ? '6번줄부터' : '1번줄부터'), TECH_NAME[it.tech] + ' ' + (it.up ? '올라가며' : '내려오며'), '연주해주세요');
    const hint = MOUSE && (it.type === 'tab' ? [1, 2, 4].indexOf(it.m) >= 0 : it.type === 'tech' && it.tech !== 'slide') ? '<p class="n20-qhint">' + MOUSE_HINT + '</p>' : '';   // 마우스 기기 + 해머링·풀링오프가 있는 문제만(슬라이드는 끌기라 마우스로도 됨)
    box.innerHTML = card + hint + (it.type === 'tab' ? '<div class="jq-board n20-qtab" id="n20q-tab"></div>' : '') + '<div class="jq-board" id="n20q-slot"></div>';
    if (it.type === 'tab') $('n20q-tab').innerHTML = qTabSvg(it);
    mountQuizBoard(it);   // 빈 자리를 먼저 놓고 실제 남은 공간을 재서 지판 크기를 정함
    if (it.type === 'fill') {
      qNeck().addEventListener('click', findTap);
      qBtn('제출하기', false);
      return;
    }
    // ②·③ = 지판을 누르는 대로 주법 소리 + 손가락 점, 감지되면 바로 채점(제출하기 없음 — 채점 뒤 '다음')
    const win = qWin(it);
    qMatch = it.type === 'tab' ? matcher(TABS[it.m], true) : null;   // loose — 마우스는 풀링오프(5 P 3)를 Shift로 3을 짚은 뒤 5를 눌러 시작해야 해서(2026-11-23 Shift 방식 변경)
    techSt = it.type === 'tech' ? { k: 0, order: it.up ? [6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6], from: null } : null;
    if (techSt) techCurMark();
    qGest = FretGesture.attach(qNeck(), { lo: win.lo, cols: win.cols, minF: win.minF, maxF: win.maxF, enabled: function () { return !!qz && !qz.judged; }, onEvent: function (ev) {
      FretGesture.play(ev);   // 채점이 끝난 뒤에도 손을 떼면 소리가 멈추게(소프트컷) — 소리·손가락 점은 늘, 판정만 채점 전에
      drawFingers(qNeck(), win, ev.s, qGest.held(ev.s), qGest.sounding(ev.s));
      if (!qz || qz.judged) return;
      if (it.type === 'tab') tabFeed(it, ev); else techFeed(it, ev);
    } });
    qBtn('다음', false);
  }
  function setCls2(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function qtq(sel) { return Array.prototype.slice.call(document.querySelectorAll('#n20q-tab ' + sel)); }
  // ② 판정 — 악보 첫 음을 친 순간부터 주법이 순서대로 맞으면 숫자 파랑, 다 맞으면 정답(숫자 초록). 시작한 뒤 다른 주법이 나오면 오답(다음에 칠 숫자 빨강)
  function tabFeed(it, ev) {
    const r = qMatch(ev);
    if (!r) return;
    if (r === 'start' || r === 'reset') setCls2(qtq('.tab-n.is-on'), 'is-on', false);
    if (r === 'start' || r === 'step') setCls2(qtq('.tab-n[data-i="' + qMatch.at() + '"]'), 'is-on', true);
    if (r === 'done') { setCls2(qtq('.tab-n'), 'is-on', false); setCls2(qtq('.tab-n'), 'is-ok', true); verdict(true); }
    if (r === 'miss') {
      const on = qtq('.tab-n.is-on').length;   // 맞힌 음 수 = 다음에 칠 음 번호
      setCls2(qtq('.tab-n[data-i="' + on + '"]'), 'is-ng', true);
      verdict(false);
    }
  }
  // ③ 판정 — 한 줄씩. 그 줄의 두 음(낮은 lo, 높은 hi) 사이를 문제의 주법으로 치면 정답(두 점 초록) → 다음 줄. 다 맞히면 정답 처리.
  //  상행 해머링: lo → hi 해머링 / 하행 풀링오프: hi → lo 풀링오프(lo를 먼저 누르고 hi를 누르면 해머링이 먼저 나는데 이건 준비 동작이라 넘어감)
  //  슬라이드: 시작 음(상행 lo·하행 hi)을 친 뒤 끝 음까지 끌기(지나가는 칸은 넘어감). 피크로 치기·손 떼기는 판정하지 않음, 그 밖의 주법 = 틀림(흔들림 + 같은 줄에 머묾)
  function techFeed(it, ev) {
    const st = techSt;
    if (!st || st.k >= 6) return;
    const s = st.order[st.k], pr = pairOf(it.form, s), lo = pr[0], hi = pr[1];
    if (ev.type === 'pick') { if (ev.s === s) st.from = ev.f; return; }
    if (ev.type === 'press' || ev.type === 'release' || ev.type === 'stop') return;
    let ok = false, pass = false;
    if (it.tech === 'hammer') ok = ev.type === 'hammer' && ev.s === s && ev.from === lo && ev.f === hi;
    else if (it.tech === 'pull') {
      ok = ev.type === 'pull' && ev.s === s && ev.from === hi && ev.f === lo;
      pass = ev.type === 'hammer' && ev.s === s && ev.from === lo && ev.f === hi;
    } else {
      const a = it.up ? lo : hi, b = it.up ? hi : lo;
      if (ev.type === 'slide' && ev.s === s && st.from === a) {
        if (ev.f === b) ok = true;
        else if (ev.f > Math.min(a, b) && ev.f < Math.max(a, b) && Math.sign(ev.f - ev.from) === Math.sign(b - a)) pass = true;
      }
    }
    if (pass) return;
    const dots = [qDot(s + '-' + lo), qDot(s + '-' + hi)].filter(Boolean);
    if (ok) {
      dots.forEach(function (d) { d.classList.remove('fb-note--ghost', 'n20-cur'); d.classList.add('fb-note--correct'); });
      st.k++; st.from = null;
      if (st.k >= 6) { verdict(true); return; }
      techCurMark();
      return;
    }
    // 틀림 — 오답색이 났다가 사라지며 흔들림(타이머 없이 애니메이션 끝에서 되돌림), 같은 줄에 머묾
    st.from = null;
    dots.forEach(function (d) {
      d.classList.remove('fb-note--ghost');
      d.classList.add('fb-note--wrong');
      const a = d.animate([
        { transform: 'translate(-50%, -50%) translateX(0)', opacity: 1 }, { transform: 'translate(-50%, -50%) translateX(-4px)' }, { transform: 'translate(-50%, -50%) translateX(4px)' },
        { transform: 'translate(-50%, -50%) translateX(-4px)' }, { transform: 'translate(-50%, -50%) translateX(4px)' }, { transform: 'translate(-50%, -50%) translateX(0)', opacity: 1 },
      ], { duration: 500, easing: 'cubic-bezier(.36,.07,.19,.97)' });
      a.onfinish = a.oncancel = function () { if (d.isConnected && !d.classList.contains('fb-note--correct')) { d.classList.remove('fb-note--wrong'); d.classList.add('fb-note--ghost'); } };
    });
  }
  function techCurMark() {   // 지금 칠 줄의 두 고스트 점만 조금 진하게
    Array.prototype.forEach.call(qNeck().querySelectorAll('.n20-cur'), function (el) { el.classList.remove('n20-cur'); });
    const s = techSt.order[techSt.k];
    Array.prototype.forEach.call(qNeck().querySelectorAll('.fb-note--ghost[data-k^="' + s + '-"]'), function (el) { el.classList.add('n20-cur'); });
  }

  // 피크 1개 소모 후 문제를 보여 줌. 부족하면(앱 공용 완충 모달이 뜸) 이 문제에서 멈추고 "이어서 풀기"로 다시 시도
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
    $('jq-title').textContent = QZ_TITLE;
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

  // ① 지판 누르기(D15 빈자리 채우기와 같음) — 빈 자리(고스트)를 누르면 점(.fb-note--placed) + 그 음, 다시 누르면 취소. 블럭에 이미 있는 점은 그 음만 울림(고르기 아님)
  let findSel = {};
  function findTap(e) {
    if (!qz || qz.judged) return;
    const it = cur(), win = qWin(it), r = qNeck().getBoundingClientRect();
    const p = [Math.floor((e.clientY - r.top) / r.height * 6) + 1, Math.floor((e.clientX - r.left) / r.width * win.cols) + win.lo];
    if (p[1] < win.minF || p[1] > win.maxF || p[0] < 1 || p[0] > 6) return;   // 블럭 프렛 범위 밖(양 끝 흐린 칸)은 안 받음
    const k = p[0] + '-' + p[1], onBlock = FORMS[it.form].some(function (n) { return keyOf(n) === k; });
    if (it.type === 'fill' && onBlock && it.ans.indexOf(k) < 0) { J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6); return; }   // 빈자리 채우기: 이미 찍혀 있는 점 = 소리만(고르기 아님 — 사용자 지정 2026-11-19)
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
  // ① 제출 — 고른 자리 = 정답 자리 전부일 때만 정답. 스케일 훈련 채점과 같은 표시: 맞게 고른 자리 = 초록(--correct), 잘못 고른 자리 = 빨강(--wrong), 못 찾은 자리 = 점선 원(--missed)
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

  // 채점 — 본 문제는 맞든 틀리든 한 칸 진행(틀리면 오답풀이 몫이 전체에 더해짐), 오답풀이는 맞혔을 때만 한 칸.
  //  delay: 정답·오답음과 게이지를 이만큼 늦춤(찾아 누르기 — 누른 자리 소리가 먼저). 버튼은 그 순간 함께
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
    if (!qz.judged) {   // 제출하기
      if (Object.keys(findSel).length) findJudge();
      return;
    }
    if (qz.canRetry) { render(); return; }   // 오답풀이에서 또 틀림 — 같은 문제를 다시
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 맥락 전환 → 하드컷(CLAUDE.md 0-7)
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    $('combo-v2-clear-title').textContent = '완주!';
    $('combo-v2-clear-level').textContent = '기타 필수 스킬 · 퀴즈 ' + qz.star;
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
    sessSave();   // 어떤 경로로 나가도 이어 풀기 저장(24시간)
    if (qz && !qz.over && !qz.quit && typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_left', NODE_ID, qz, { reason: 'exit' });
    if (qz) qz.quit = true;   // 늦게 오는 정답·오답음 막음
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');   // 이미 받은 도중 환급은 서버에 반영(회수하지 않음 — §1-5)
    overlayAbort();
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    if (!qz.quit && typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_left', NODE_ID, qz, { reason: 'background' });   // 직접 나간 뒤의 pagehide는 빼고
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });


  J.register(NODE_ID, { onCut: lecCut, layers: ['n20-main', 'n20-sum'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 마지막 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
