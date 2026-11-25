// ───────────────────────────────────────────────────────────
// 여정 노드: 파워코드 (솔로연주 비기너 D18 — 2026-11-23, docs/solo-beginner-curriculum.md) — 핵심 노드
//   솔로 과정이지만 반주도 결국 필요해서(사용자 지정) 가장 무난한 파워코드: 1도 + 5도(+ 1도 한 옥타브 위), 표기 C5 = 'C 파이브'.
//   근음은 어느 줄에도 올 수 있지만 중저음을 두껍게 깔아 주는 역할이라 주로 6·5번줄 → 그래서 6·5번줄 음이름을 외워 두면 유용. 외울 범위 = 0~8프렛(9프렛 이상 근음은 잘 안 씀) — 강의 음이름·퀴즈 근음 모두 0~8프렛(사용자 지정 2026-11-24)
//   목표는 잡는 법이 아니라 근음 자리(6·5번줄 음이름)로 여러 key의 파워코드를 잡는 것. 도수는 D4에서 배운 말(1도·5도)
//   출제 코드 10개(사용자 지정): C C# D E F F# G G# A B(D#5·A#5 제외), 근음은 5·6번줄만, 짚기 문제는 세 음형(옥타브는 4·3번줄)만, 이름 문제는 두 음형·세 음형 섞음. 난이도 = 별1 자연음 80%·반음 20%, 별2 50%·50%(반음은 근음 5프렛 안, 첫 5문제 자연음만), 별3 무작위
//   퀴즈 엔진 = 공용 journey-quiz-kit.js
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit, B = K.board;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const OPEN_MIDI = B.OPEN_MIDI;
  function none() { return Promise.resolve(); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function sf(k) { const a = k.split('-'); return [+a[0], +a[1]]; }
  function midiK(k) { const p = sf(k); return OPEN_MIDI[p[0] - 1] + p[1]; }

  // 파워코드 자리 — 근음 줄 s·프렛 r: [근음, 5도(한 줄 위 +2), 옥타브(두 줄 위 +2)]
  function shape(s, r, three) { const a = [s + '-' + r, (s - 1) + '-' + (r + 2)]; if (three) a.push((s - 2) + '-' + (r + 2)); return a; }
  function chord(keys) { const ms = keys.slice().sort(function (a, b) { return sf(b)[0] - sf(a)[0]; }).map(midiK); J.strum(ms, J.audioT0(), 1.6, 0.6); }
  // 외울 범위 = 0~8프렛(사용자 지정 2026-11-24 — 중저음이라 9프렛 이상 근음은 잘 안 씀)
  const NAT6 = [[0, 'E'], [1, 'F'], [3, 'G'], [5, 'A'], [7, 'B'], [8, 'C']];
  const NAT5 = [[0, 'A'], [2, 'B'], [3, 'C'], [5, 'D'], [7, 'E'], [8, 'F']];

  // ═══════════════════════════ 강의 ═══════════════════════════
  const SMALL = { lo: 0, cols: 9, minF: 0, maxF: 8, fade: false };    // 0~8프렛
  let lecW = 320, curWin = SMALL;
  // 지판 = 스케일 훈련과 같은 칸 비율(B.fit — 앱 전체 동일, 사용자 지정 2026-11-24). 설명 칸 = 넥 높이 최대 140px(보기 좋게 작게)
  function size(win) { return B.fit(win, Math.min(lecW, 340), 140); }
  function build(stage) {
    stage.classList.add('is-jny');
    lecW = stage.clientWidth || (window.innerWidth - 32);
    stage.innerHTML = '<div class="jl-layers"><div class="jl-layer jl-rise n14s-fb" id="n18s-fb"><div class="n18s-name" id="n18s-name"></div><div id="n18s-fbw"></div></div></div>';
    setBoard(SMALL);
  }
  function neck() { return $('n18s-neck'); }
  function setBoard(win, opt) {
    curWin = win;
    const sz = size(win);
    $('n18s-fbw').innerHTML = B.html('n18s-neck', win, sz.w, sz.h, opt);
    neck().addEventListener('click', tap);
  }
  function setName(t) { $('n18s-name').textContent = t || ''; }
  function boardOn() { return fx([$('n18s-fb')], 'is-on', true); }
  function put(k, label, extra) { const p = sf(k), el = B.note(curWin, p[0], p[1], label, extra); neck().appendChild(el); return el; }
  function clearDots() { Array.prototype.forEach.call(neck().querySelectorAll('.fb-note'), function (el) { el.remove(); }); }
  function strFocus(ss, on) { ss.forEach(function (s) { const el = neck().querySelector('.fb-string[data-s="' + s + '"]'); if (el) el.classList.toggle('is-focus', on); }); }
  // 줄 음이름 — 개방현부터 오른쪽으로 하나씩(소리와 함께)
  function names(s, list) {
    const t0 = J.audioT0(), lead = J.leadMs();
    list.forEach(function (x, k) {
      J.note(OPEN_MIDI[s - 1] + x[0], t0 + k * 0.4, 0.4, 0.18);
      later(function () { put(s + '-' + x[0], x[1], 'n2-pop'); }, lead + k * 400);
    });
    return wait(lead + list.length * 400 + 600);
  }
  // 지판을 누르면 그 음
  function tap(e) {
    const p = B.pos(neck(), curWin, e);
    if (p) J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.2, 0.5);
  }

  //  강의 최종 목적: 파워코드 = 1도 + 5도(+옥타브), 이름 X5, 근음 = 6·5번줄 음이름, # = 한 칸 오른쪽 — 퀴즈 ① 지판에 잡기 ② 이름 고르기
  const G5 = shape(6, 3, true), F5 = shape(6, 1, true), Fs5 = shape(6, 2, true);
  const ANY = [shape(6, 3), shape(5, 3), shape(4, 3)], ANY_NAME = ['G5', 'C5', 'F5'];   // 같은 모양을 6·5·4번줄 3프렛 근음으로(두 음형 — 0~8프렛 안)
  // 서로 다른 코드라 한 번에 하나만(사용자 지정 2026-11-24 — 겹쳐 두면 헷갈림): 앞 코드 점을 지우고 이름·점·소리
  // 자연음 → 반음 옆(#·b): 자연음 점 파랑 + 소리 → 한 프렛 옆에 새 점(이름, 파랑) + 소리
  function half(from, to, name) {
    setCls(Array.prototype.slice.call(neck().querySelectorAll('.fb-note.n15-root')), 'n15-root', false);   // 앞 예시 파랑은 걷음 — 지금 예시만 파랑
    const fd = neck().querySelector('.fb-note[data-k="' + from + '"]');
    if (fd) fd.classList.add('n15-root');
    J.note(midiK(from), J.audioT0(), 0.6, 0.18);
    later(function () { put(to, name, 'n15-root n2-pop'); J.note(midiK(to), J.audioT0(), 1.2, 0.5); }, J.leadMs() + 700);
    return wait(J.leadMs() + 1900);
  }
  // F5 → F#5 옮기기 — F5 자리에서 한 프렛 오른쪽으로 미끄러지는 점 + 뒤따르는 파란 잔상 2개, 2.6초마다 칸에 있는 동안 계속 반복(사용자 지정 2026-11-24).
  //  도착 자리엔 F#5 점이 그대로 있음. 반복은 J.later라 칸을 넘기면 엔진이 멈춤, 건너뛰는 중엔 돌리지 않음. 소리는 처음 한 번만
  function slideLoop() {
    if (J.skipping()) return;
    slideOnce();
    later(slideLoop, 2600);
  }
  function slideOnce() {
    F5.forEach(function (k) {
      const p = sf(k), to = B.note(curWin, p[0], p[1] + 1, '', '').style.left;
      [0, 1, 2].forEach(function (j) {
        const el = B.note(curWin, p[0], p[1], '', j ? 'n15-root' : '');   // 잔상 = 파랑(사용자 지정)
        el.style.zIndex = 2;
        neck().appendChild(el);
        const a = J.anim(el, [{ left: el.style.left, opacity: 1 - j * 0.3 }, { left: to, opacity: j ? 0 : 1 }], { duration: 700, delay: j * 90, easing: J.EASE_OUT, fill: 'both' });
        a.onfinish = a.oncancel = function () { el.remove(); };
      });
    });
  }
  function one(n) { clearDots(); setName(ANY_NAME[n]); ANY[n].forEach(function (k, i) { put(k, i ? '5' : '1', 'n2-pop'); }); chord(ANY[n]); return wait(J.leadMs() + 1300); }
  // 손가락 운지(사용자 지정 2026-11-24) — 점 안 = 손가락 번호(D1과 같은 1 검지·3 약지·4 소지). 두 음 = 검지·소지, 세 음 = 검지·약지·소지
  function fingers(ks, nums) { clearDots(); ks.forEach(function (k, i) { put(k, nums[i], 'n2-pop'); }); chord(ks); return wait(J.leadMs() + 1700); }
  // F5 → F#5 — 점을 그대로 한 프렛 오른쪽으로 옮김(잔상 slideOnce 한 번) → 도착 자리에 F#5 점
  function moveRight() {
    clearDots();
    if (J.skipping()) { Fs5.forEach(function (k, i) { put(k, i === 1 ? '5' : '1'); }); return Promise.resolve(); }
    slideOnce();
    later(function () { Fs5.forEach(function (k, i) { put(k, i === 1 ? '5' : '1'); }); }, 800);
    return wait(1300);
  }
  const steps = [
    // P1 파워코드
    // 0 핵심: 왜 배우나 — 솔로 과정에서도 반주가 필요. 문구만
    J.chainSteps([
      { text: '솔로연주를 하다 보면\n' + em('반주') + '를 해야 할 때도 꼭 생겨요', run: none },
      { text: '그중에서 가장 무난한 반주법인\n' + em('파워코드') + '를 배워볼게요!', run: none },
    ]),
    // 1 핵심(새 내용): 1도 + 5도 두 음 → 옥타브를 더한 세 음 → 이름 = 근음 + 5, 읽기 '파이브'. 끝 화면 = G5 세 음 + 큰 이름
    Object.assign(J.chainSteps([
      { text: '파워코드는 ' + em('1도') + '와 ' + em('5도') + ',\n두 음만 쓰는 코드예요', scene: 'n18s-fb', enter: function () { setBoard(SMALL); setName(''); }, run: function () {
        return boardOn().then(function () { put(G5[0], '1', 'n2-pop'); put(G5[1], '5', 'n2-pop'); chord(G5.slice(0, 2)); return wait(J.leadMs() + 1700); });
      } },
      { text: '여기에 1도를 ' + em('한 옥타브 위') + '로 더해서\n세 음으로 치기도 해요', run: function () { put(G5[2], '1', 'n2-pop'); chord(G5); return wait(J.leadMs() + 1700); } },
      { text: '표기법은 근음 뒤에 ' + em('5') + '를 붙여서\n' + em('G5') + '라고 쓰고 ' + em('G 파이브') + '코드라고 읽어요!', run: function () { setName('G5'); return wait(800); } },
    ]), { ms: 0 }),
    // P2 근음 자리·운지·음이름(사용자 지정 2026-11-24 문구 전면 수정)
    // 2 핵심(새 내용): 같은 모양을 6·5·4번줄 근음으로(두 음형) → 주로 6·5번줄(중저음) → 손가락 운지. 끝 화면 = G5 세 음 운지(1·3·4)
    Object.assign(J.chainSteps([
      { text: '파워코드는 ' + em('4~6번줄') + ' 근음이라면\n모두 같은 모양으로 잡을 수 있어요!', scene: 'n18s-fb:any', enter: function () { setBoard(SMALL); setName(''); }, run: function () {
        return boardOn().then(function () { return ANY.reduce(function (p, ks, n) { return p.then(function () { return one(n); }); }, Promise.resolve()); });
      } },
      { text: '주로 ' + em('6번줄') + '이나 ' + em('5번줄') + '을 근음으로\n파워코드를 사용하는 경우가 많아요', run: function () { clearDots(); setName(''); strFocus([6, 5], true); return wait(1200); } },
      { text: '파워코드는 ' + em('중저음') + '을\n두껍게 깔아주는 역할이기 때문이에요', run: function () { return one(0).then(function () { return one(1); }); } },
      { text: '손가락 운지는\n다음과 같이 잡아주세요', run: function () { strFocus([6, 5], false); setName('G5'); return fingers(G5.slice(0, 2), ['1', '4']); } },
      { text: '두 음일 땐 ' + em('검지') + '와 ' + em('소지') + '로\n세 음일 땐 ' + em('검지') + '와 ' + em('약지, 소지') + '로 잡아주세요', run: function () { return fingers(G5, ['1', '3', '4']); } },
    ]), { ms: 0 }),
    // 3 핵심(새 내용 — 이 노드에서 외울 것): 모양이 같으니 6·5번줄 음이름만 외우면 됨, 범위 0~8프렛. 끝 화면 = 0~8프렛 6·5번줄 음이름
    Object.assign(J.chainSteps([
      { text: '파워코드는 모양이 같기 때문에', scene: 'n18s-fb:names', enter: function () { setBoard(SMALL); setName(''); }, run: function () { return boardOn().then(function () { strFocus([6, 5], true); return wait(800); }); } },
      { text: em('6번줄') + '과 ' + em('5번줄') + ' 음이름만 외워도\n대부분의 코드를 연주할 수 있어요!', run: function () { return names(6, NAT6).then(function () { return names(5, NAT5); }); } },
      { text: '초반엔 ' + em('0~8프렛') + '까지의 음이름을\n외워두면 유용할 거예요!', run: none },
    ]), { ms: 0 }),
    // 4 핵심(새 내용): 자연음 먼저 → #·b은 자연음에서 찾기(# = 한 프렛 오른쪽, b = 한 프렛 왼쪽). 끝 화면 = 6번줄 자연음 + Ab
    Object.assign(J.chainSteps([
      { text: '우선 #이나 b이 없는\n' + em('자연음') + '을 먼저 외우고', scene: 'n18s-fb:s', enter: function () { setBoard(SMALL); setName(''); }, run: function () {
        return boardOn().then(function () { strFocus([6], true); NAT6.forEach(function (x) { put('6-' + x[0], x[1], 'n2-pop'); }); return wait(1200); });
      } },
      { text: em('#') + '이나 ' + em('b') + '을\n자연음에서 찾아보세요!', run: none },
      { text: em('#') + '이 붙으면 자연음에서 ' + em('반음 위') + ',\n' + em('한 프렛 오른쪽') + '이에요', run: function () { return half('6-1', '6-2', 'F#'); } },
      { text: em('b') + '이 붙으면 ' + em('반음 아래') + ',\n' + em('한 프렛 왼쪽') + '이에요', run: function () { return half('6-5', '6-4', 'Ab'); } },
    ]), { ms: 0 }),
    // 5 핵심(배운 것의 적용): F#5 잡기 — F 자리 → 바로 오른쪽 F# → F5 모양 → 그대로 한 칸 오른쪽 = F#5. 끝 화면 = F#5(옮기는 잔상 반복)
    Object.assign(J.chainSteps([
      { text: em('F#5') + ' 코드를 잡아볼까요?', scene: 'n18s-fb:fs', enter: function () { setBoard(SMALL); setName(''); }, run: function () {
        return boardOn().then(function () { setName('F#5'); strFocus([6], true); NAT6.forEach(function (x) { put('6-' + x[0], x[1], 'n2-pop'); }); return wait(1200); });
      } },
      { text: em('F') + '음을 먼저 외우셨다면\nF음의 바로 오른쪽이 ' + em('F#') + '이겠죠?', run: function () { return half('6-1', '6-2', 'F#'); } },
      { text: '그렇다면 F음을 ' + em('검지') + '로 누르고\n파워코드 모양을 잡은 다음', run: function () {
        clearDots(); strFocus([6], false); setName('F5'); F5.forEach(function (k, i) { put(k, i === 1 ? '5' : '1', 'n2-pop'); }); chord(F5); return wait(J.leadMs() + 1700);
      } },
      { text: '그대로 오른쪽으로\n모두 ' + em('1칸씩') + ' 옮기면!', run: moveRight },
      { text: em('F#5') + ' 코드를 잡았어요!', run: function () { setName('F#5'); chord(Fs5); slideLoop(); return wait(J.leadMs() + 1700); } },
    ]), { ms: 0 }),
    // P3 마무리
    // 6 마무리(사용자 지정 2026-11-24): 쉬운 모양·자주 씀 → 6·5번줄 음이름 → 퀴즈 = 음이름을 자연스럽게 외우게. 끝 화면 = 0~8프렛 6·5번줄 음이름
    Object.assign(J.chainSteps([
      { text: '파워코드는 모양이 쉬운데도 불구하고\n반주에서 ' + em('아주 자주') + ' 쓰여요', scene: 'n18s-fb:end', enter: function () { setBoard(SMALL); setName(''); NAT6.forEach(function (x) { put('6-' + x[0], x[1]); }); NAT5.forEach(function (x) { put('5-' + x[0], x[1]); }); strFocus([6, 5], true); }, run: boardOn },
      { text: '그래서 ' + em('5, 6번줄 음이름') + '만 잘 외워놓는다면\n훨씬 기타가 재밌을 거예요!', run: none },
      { text: '이번 퀴즈는 이 음이름을\n' + em('자연스럽게') + ' 외울 수 있도록 준비했어요', run: none },
      { text: '파워코드를 마스터해서\n재밌는 연주를 즐겨봐요!', run: none },
    ]), { ms: 0 }),
  ];
  const groups = [[0, 1], [2, 3, 4, 5], [6]];
  const MS = { 1: 10920, 2: 21680, 3: 13160, 4: 11960, 5: 15840 };   // 칸 길이(ms) = 측정값(scripts/journey-lesson-timing.js)
  Object.keys(MS).forEach(function (k) { steps[k].ms = MS[k]; });

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  ① place 이름 + 근음 줄 + 음 수 → 지판에 찍고 제출 ② name 지판의 파워코드 → 이름 4지선다. 창 = 정답이 다 보이는 4칸 중 무작위(문제를 만들 때 확정)
  const NODE_ID = 'power-chords';
  const POOL = [['C', 0], ['C#', 1], ['D', 2], ['E', 4], ['F', 5], ['F#', 6], ['G', 7], ['G#', 8], ['A', 9], ['B', 11]];
  const CFG = { 1: { place: 9, name: 6 }, 2: { place: 12, name: 8 }, 3: { place: 12, name: 8 } };
  function rootFret(pc, s) { return (pc - (s === 6 ? 4 : 9) + 12) % 12; }   // 0 = 개방현
  //  근음 자리 = 0~8프렛만(강의에서 외운 범위). 원하는 줄이 9프렛 이상이면 다른 줄로(POOL 10개 모두 6·5번줄 중 하나는 0~8프렛 안)
  function rootStr(pc, s) { return rootFret(pc, s) <= 8 ? s : 11 - s; }
  function mkQ(type, P, s, three) {
    s = rootStr(P[1], s);
    // 창 = 4프렛, 근음이 2번째 칸(lo = r − 1 — 다이어그램 2번째 칸 규칙, 사용자 지정 2026-11-24). 근음 0·1프렛이면 0~3·1~4프렛 창
    const r = rootFret(P[1], s), lo = r === 0 ? 0 : Math.max(1, r - 1);
    const win = { lo: lo, cols: 4, minF: lo, maxF: lo + 3, fade: false };
    return { type: type, name: P[0] + '5', s: s, three: three, ans: shape(s, r, three).sort(), win: win };
  }
  function cycle(n, pool) { const out = []; let p = []; for (let k = 0; k < n; k++) { if (!p.length) p = K.shuffle(pool.slice()); out.push(p.pop()); } return out; }
  // 난이도(사용자 지정 2026-11-24): 별1 = 자연음 80%·반음(#) 20%, 별2 = 50%·50% — 반음은 근음 5프렛 안 자리로만, 첫 5문제는 자연음만 / 별3 = 완전 무작위(코드·근음 줄·음 수)
  const NAT = POOL.filter(function (P) { return P[0].indexOf('#') < 0; }), SHP = POOL.filter(function (P) { return P[0].indexOf('#') >= 0; });
  const SHARP_RATE = { 1: 0.2, 2: 0.5 };
  function sharpStr(P) { return [6, 5].filter(function (s) { return rootFret(P[1], s) <= 5; })[0]; }   // C#5 = 5번줄 4 · F#5 = 6번줄 2 · G#5 = 6번줄 4
  function make(star) {
    const c = CFG[star], n = c.place + c.name, rand = star >= 3;
    // 유형 순서 — 남은 수가 많은 쪽, 같으면 바로 앞과 다른 쪽(spread와 같은 기준)
    const types = [];
    for (let k = 0, pl = c.place, nm = c.name, prev = ''; k < n; k++) {
      let t = pl > nm ? 'place' : nm > pl ? 'name' : (prev === 'place' ? 'name' : 'place');
      if (t === prev && (t === 'place' ? nm : pl) > 0) t = t === 'place' ? 'name' : 'place';
      if (t === 'place') pl--; else nm--;
      types.push(t); prev = t;
    }
    // 코드 순서
    let chords;
    if (rand) chords = cycle(n, POOL);
    else {
      const ns = Math.round(n * SHARP_RATE[star]);
      chords = cycle(5, NAT).concat(K.shuffle(cycle(n - 5 - ns, NAT).concat(cycle(ns, SHP))));
    }
    const list = [];
    let pc = 0, nc = 0;
    types.forEach(function (t, k) {
      const P = chords[k], sharp = P[0].indexOf('#') >= 0;
      let q;
      if (t === 'place') {
        q = mkQ('place', P, rand ? (K.rnd(2) ? 5 : 6) : sharp ? sharpStr(P) : (pc % 2 ? 5 : 6), true);   // 짚기 문제 = 항상 세 음(옥타브까지, 사용자 지정 2026-11-24 — 편의상 통일)
        pc++;
      } else {
        q = mkQ('name', P, rand ? (K.rnd(2) ? 5 : 6) : sharp ? sharpStr(P) : (nc % 2 ? 6 : 5), rand ? K.rnd(2) === 1 : nc % 3 === 0);
        const others = K.shuffle(POOL.filter(function (x) { return x[0] !== P[0]; })).slice(0, 3).map(function (x) { return x[0] + '5'; });
        q.answer = q.name; q.choices = K.shuffle([q.name].concat(others));
        nc++;
      }
      list.push(q);
    });
    // 같은 문제가 연달아 나오지 않게 — 첫 5문제(자연음만)와 나머지는 서로 섞이지 않음
    return J.noRepeat(list, rand ? null : function (q) { return list.indexOf(q) < 5 ? 0 : 1; });
  }

  // 이어 풀기로 되살린 옛 문제(2026-11-24 이전: 7칸 창, 9프렛 이상 근음, 두 음 짚기)를 지금 규칙(4프렛 창, 근음 0~8프렛, 짚기는 세 음)으로 다시 맞춤 — 코드 이름·문제 유형·보기는 그대로
  function upgrade(it) {
    if (it.type === 'place' && !it.three) { it.three = true; it.win = null; }
    if (it.win && it.win.cols === 4) return;
    const P = POOL.filter(function (x) { return x[0] + '5' === it.name; })[0];
    if (!P) return;
    const q = mkQ(it.type, P, it.s, it.three);
    it.s = q.s; it.ans = q.ans; it.win = q.win;
  }
  // 퀴즈 지판 = 코드 다이어그램(사용자 지정 2026-11-24 — 4프렛 창을 가로 지판으로 키우면 너무 커서 코드 맞추기와 같은 다이어그램으로).
  //  그리기 = VoicingCanvas(코드 사전·D3 퀴즈와 같음), 찍은 점 = D3 점 찍기(.n3q-dot)와 같은 DOM 점·같은 색. 창 4프렛 = 다이어그램 4칸 그대로:
  //  2번째 칸 = 근음 프렛(번호 표시). 근음 0·1프렛이면 1~4프렛 칸(너트) + 개방현 근음은 너트 왼쪽 자리
  const QD_W = 300;   // 다이어그램 폭(최대) — 자리 짚기 = D3 점 찍기와 같음(높이 240px)
  const QD_NAME_W = 200;   // 이름 고르기 = 보기만 하는 다이어그램이라 작게(높이 160px) — 보기 4개·다음 버튼까지 한 화면에(사용자 지정 2026-11-24, 360×771에서 버튼이 잘림)
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };   // voicing-canvas.js 기준 치수(440×352): 프렛 칸 폭·시작 x / 줄 간격·1번줄 y / 점 지름
  // 근음 = 프렛 번호가 적힌 2번째 칸(사용자 지정 2026-11-24 — 코드 사전 2번째 칸 규칙과 같음). 근음이 0·1프렛이면 2번째 칸에 둘 수 없어 1~4프렛 칸(너트, 개방현 근음은 너트 왼쪽)
  function rootOf(it) { return sf(it.ans.filter(function (k) { return sf(k)[0] === it.s; })[0])[1]; }
  function slotOf(it) { return Math.max(2, rootOf(it)); }
  function drawDiag(cv, it, keys, wpx, rootHi, name) {
    const fr = [null, null, null, null, null, null];
    (keys || []).forEach(function (k) { const p = sf(k); fr[p[0] - 1] = p[1]; });
    const dpr = window.devicePixelRatio || 1, hi = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff';
    VoicingCanvas.draw(cv, { frets: fr, openMute: keys ? null : fr.map(function () { return null; }), slotFret: slotOf(it), source: 'static' }, {
      ratio: wpx * dpr / VoicingCanvas.BASE_W, transparent: true, chordName: name || null,   // 짚기 문제 = 좌상단에 코드 이름(사용자 지정 2026-11-24 — 빈 다이어그램이 허전해서)
      dotColors: rootHi ? fr.map(function (f, i) { return i + 1 === it.s ? hi : null; }) : null,   // 이름 문제 = 근음 점 파랑(이전 지판 퀴즈의 근음 표시 그대로)
    });
    cv.style.width = wpx + 'px';
    cv.style.height = 'auto';
  }
  // 누른 자리 → [줄, 실제 프렛] / 점 놓을 위치 — 다이어그램 칸 k(1~4) = 실제 프렛 k + (slotFret − 2), 너트 왼쪽 개방현 칸 = 0프렛(근음이 개방현일 때만)
  function diagPos(wrap, it, e) {
    const r = wrap.querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const s = Math.round((by - QD.y0) / QD.sh) + 1, off = slotOf(it) - 2;
    let f;
    if (bx < QD.x0) { if (bx < QD.x0 - 70 || rootOf(it) > 0) return null; f = 0; }
    else { const k = Math.floor((bx - QD.x0) / QD.fw) + 1; if (k > VoicingCanvas.FRETS) return null; f = k + off; }
    return s < 1 || s > 6 ? null : [s, f];
  }
  function dotHtml(it, k, cls) {
    const p = sf(k), f = p[1], x = f === 0 ? QD.x0 - 35 : QD.x0 + (f - (slotOf(it) - 2) - 0.5) * QD.fw;
    return '<span class="n3q-dot ' + cls + (f === 0 ? ' is-open' : '') + '" style="left:' + x / VoicingCanvas.BASE_W * 100 + '%;top:' + (QD.y0 + (p[0] - 1) * QD.sh) / VoicingCanvas.BASE_H * 100 + '%;width:' + QD.dot * (f === 0 ? 1.05 : 1) / VoicingCanvas.BASE_W * 100 + '%"></span>';
  }
  function render(it, ui) {
    upgrade(it);
    const slot = '<div class="jq-board"><div class="n3q-wrap" id="n18q-wrap"><canvas class="n3q-cv"></canvas><div class="n3q-dots" id="n18q-dots"></div></div></div>';
    if (it.type === 'name') {
      ui.box.innerHTML = ui.infoCard('이 파워코드의', '이름', '은 무엇일까요?') + slot +
        '<div class="jq-cq-answer"><div class="ms-quiz-choices jq-cq-choices">' + it.choices.map(function (x) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + x + '">' + x + '</button>'; }).join('') + '</div></div>';
    } else {
      ui.box.innerHTML = ui.infoCard(it.name + ' 파워코드를', it.s + '번줄 근음 · ' + (it.three ? '세 음' : '두 음'), '으로 짚어주세요') + slot;
    }
    const maxW = it.type === 'name' ? QD_NAME_W : QD_W, wrap = $('n18q-wrap'), wpx = Math.min(ui.box.clientWidth || maxW, maxW);
    wrap.style.width = wpx + 'px';
    wrap.style.setProperty('--n3q-w', wpx + 'px');
    if (it.type === 'name') {
      drawDiag(wrap.querySelector('canvas'), it, it.ans, wpx, true);
      wrap.addEventListener('click', function () { if (!ui.judged()) chord(it.ans); });   // 다이어그램을 누르면 그 코드 소리
      ui.bindChoices(it.answer);
      return;
    }
    drawDiag(wrap.querySelector('canvas'), it, null, wpx, false, it.name);
    const sel = {};   // 줄 → 찍은 자리('줄-프렛'). 한 줄에는 점 하나(다른 프렛을 누르면 옮겨 감), 같은 자리를 다시 누르면 지움 — D3 점 찍기와 같음
    function dots() { $('n18q-dots').innerHTML = Object.keys(sel).map(function (s) { return dotHtml(it, sel[s], ''); }).join(''); }
    wrap.addEventListener('click', function (e) {
      if (ui.judged()) return;
      const p = diagPos(wrap, it, e);
      if (!p) return;
      const k = p[0] + '-' + p[1];
      if (sel[p[0]] === k) delete sel[p[0]];
      else { sel[p[0]] = k; J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.2, 0.5); }
      dots();
      ui.ready(Object.keys(sel).length > 0);
    });
    ui.submit(function () {
      const picked = Object.keys(sel).map(function (s) { return sel[s]; });
      const ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
      let h = picked.map(function (k) { return dotHtml(it, k, it.ans.indexOf(k) >= 0 ? 'is-ok' : 'is-ng'); }).join('');
      it.ans.forEach(function (k) { if (picked.indexOf(k) < 0) h += dotHtml(it, k, 'is-miss'); });
      $('n18q-dots').innerHTML = h;
      if (ok) chord(it.ans);
      ui.verdict(ok);
    });
  }
  function startQuiz() {
    K.start({ nodeId: NODE_ID, clearName: '파워코드', make: make, render: render, title: function (it) { return it.type === 'place' ? '알맞은 자리를 모두 짚어주세요' : '알맞은 답을 고르세요'; } });
  }

  J.register(NODE_ID, { layers: ['n18s-fb'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE_ID); } });
})();
