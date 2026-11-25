// ───────────────────────────────────────────────────────────
// 여정 노드: CAGED 시스템 (솔로연주 비기너 D17 — 2026-11-23, docs/solo-beginner-curriculum.md) — 쉬어가는 노드
//   D4(펜타토닉 G폼)에서 남긴 씨앗 "블럭 이름은 숨은 코드 모양에서 따왔어요 — 자세히는 CAGED에서"를 회수.
//   메이저 스케일 다섯 폼 안의 코드 모양 → 0~15프렛 긴 지판에 C A G E D 모양이 차례로 반복 → 앞으로의 코드 모양도 이 다섯 가지에서(씨앗)
//   퀴즈 = 메이저 스케일 복습(빈자리) + 블럭에 숨은 코드 모양(무슨 폼인지) 고르기. 퀴즈 엔진 = 공용 journey-quiz-kit.js
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit, B = K.board;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const OPEN_MIDI = B.OPEN_MIDI;
  function none() { return Promise.resolve(); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }

  // 메이저 스케일 블럭 — major-forms.js와 같은 값. [줄, 프렛, 음이름, 도수] 낮은 음부터
  const MAJOR = {
    C: [[6, 12, 'E', 3], [6, 13, 'F', 4], [6, 15, 'G', 5], [5, 12, 'A', 6], [5, 14, 'B', 7], [5, 15, 'C', 1], [4, 12, 'D', 2], [4, 14, 'E', 3], [4, 15, 'F', 4], [3, 12, 'G', 5], [3, 14, 'A', 6], [2, 12, 'B', 7], [2, 13, 'C', 1], [2, 15, 'D', 2], [1, 12, 'E', 3], [1, 13, 'F', 4], [1, 15, 'G', 5]],
    A: [[6, 3, 'G', 5], [6, 5, 'A', 6], [5, 2, 'B', 7], [5, 3, 'C', 1], [5, 5, 'D', 2], [4, 2, 'E', 3], [4, 3, 'F', 4], [4, 5, 'G', 5], [3, 2, 'A', 6], [3, 4, 'B', 7], [3, 5, 'C', 1], [2, 3, 'D', 2], [2, 5, 'E', 3], [2, 6, 'F', 4], [1, 3, 'G', 5], [1, 5, 'A', 6]],
    G: [[6, 5, 'A', 6], [6, 7, 'B', 7], [6, 8, 'C', 1], [5, 5, 'D', 2], [5, 7, 'E', 3], [5, 8, 'F', 4], [4, 5, 'G', 5], [4, 7, 'A', 6], [3, 4, 'B', 7], [3, 5, 'C', 1], [3, 7, 'D', 2], [2, 5, 'E', 3], [2, 6, 'F', 4], [2, 8, 'G', 5], [1, 5, 'A', 6], [1, 7, 'B', 7], [1, 8, 'C', 1]],
    E: [[6, 7, 'B', 7], [6, 8, 'C', 1], [6, 10, 'D', 2], [5, 7, 'E', 3], [5, 8, 'F', 4], [5, 10, 'G', 5], [4, 7, 'A', 6], [4, 9, 'B', 7], [4, 10, 'C', 1], [3, 7, 'D', 2], [3, 9, 'E', 3], [3, 10, 'F', 4], [2, 8, 'G', 5], [2, 10, 'A', 6], [1, 7, 'B', 7], [1, 8, 'C', 1], [1, 10, 'D', 2]],
    D: [[6, 10, 'D', 2], [6, 12, 'E', 3], [6, 13, 'F', 4], [5, 10, 'G', 5], [5, 12, 'A', 6], [4, 9, 'B', 7], [4, 10, 'C', 1], [4, 12, 'D', 2], [3, 9, 'E', 3], [3, 10, 'F', 4], [3, 12, 'G', 5], [2, 10, 'A', 6], [2, 12, 'B', 7], [2, 13, 'C', 1], [1, 10, 'D', 2], [1, 12, 'E', 3]],
  };
  // 블럭 안 코드 모양(C key 자리 — pentatonic-forms.js FORMS의 shape와 같음, 모두 근음 C를 포함)
  const SHAPE = {
    C: ['5-15', '4-14', '3-12', '2-13', '1-12'], A: ['5-3', '4-5', '3-5', '2-5', '1-3'], G: ['6-8', '5-7', '4-5', '3-5', '2-5', '1-8'],
    E: ['6-8', '5-10', '4-10', '3-9', '2-8', '1-8'], D: ['4-10', '3-12', '2-13', '1-12'],
  };
  // 긴 지판 위 순서 — 개방현 C(x32010)부터 C A G E D, 12프렛에서 C로 다시
  const CAGED = [
    { F: 'C', keys: ['5-3', '4-2', '3-0', '2-1', '1-0'], mid: 1.5 }, { F: 'A', keys: SHAPE.A, mid: 4 }, { F: 'G', keys: SHAPE.G, mid: 6.5 },
    { F: 'E', keys: SHAPE.E, mid: 9 }, { F: 'D', keys: SHAPE.D, mid: 11.5 }, { F: 'C', keys: SHAPE.C, mid: 13.5 },
  ];
  const ORDER = ['C', 'A', 'G', 'E', 'D'];
  function keyOf(n) { return n[0] + '-' + n[1]; }
  function sf(k) { const a = k.split('-'); return [+a[0], +a[1]]; }
  function midiK(k) { const p = sf(k); return OPEN_MIDI[p[0] - 1] + p[1]; }
  function winOf(F) {
    const fr = MAJOR[F].map(function (n) { return n[1]; }), lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr);
    return { lo: lo - 1, cols: hi - lo + 3, minF: lo, maxF: hi, fade: true };
  }
  const LONG = { lo: 0, cols: 16, minF: 0, maxF: 15, fade: false };   // 0~15프렛(첫 칸 = 개방현 자리)
  // 코드 모양 화음 — 낮은 줄부터 살짝 흘려서
  function chord(keys) {
    const ms = keys.slice().sort(function (a, b) { return sf(b)[0] - sf(a)[0]; }).map(midiK);
    J.strum(ms, J.audioT0(), 1.6, 0.6);
  }

  // ═══════════════════════════ 강의 ═══════════════════════════
  let lecW = 320;
  function size(cols) { const w = Math.min(lecW, 340); return { w: w, h: Math.min(w * (cols > 10 ? 0.34 : 0.42), 140) }; }
  function build(stage) {
    stage.classList.add('is-jny');
    lecW = stage.clientWidth || (window.innerWidth - 32);
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer jl-rise n14s-fb" id="n17s-fb"><div class="n14s-fn" id="n17s-fn"></div><div id="n17s-fbw"></div></div>' +
      '<div class="jl-layer jl-rise n14s-fb" id="n17s-long"><div class="n17s-lab" id="n17s-lab"></div><div id="n17s-lw"></div></div></div>';
  }
  // 폼 하나 — 메이저 블럭(글자 없음), 코드 모양 점 = 파랑, 나머지 옅게 + 화음
  function showForm(F) {
    const w = winOf(F), sz = size(w.cols);
    $('n17s-fbw').innerHTML = B.html('n17s-neck', w, sz.w, sz.h);
    $('n17s-fn').innerHTML = em(F + '폼') + ' · ' + F + '코드 모양';
    const nk = $('n17s-neck');
    MAJOR[F].forEach(function (n) { nk.appendChild(B.note(w, n[0], n[1], '', SHAPE[F].indexOf(keyOf(n)) >= 0 ? 'n15-root n2-pop' : 'n15-dim')); });
    chord(SHAPE[F]);
    return wait(J.leadMs() + 1700);
  }
  // 긴 지판 — 모양을 왼쪽부터 하나씩(앞 모양은 옅게), 위에 폼 이름. 블루·핑크 번갈아(같은 자리는 나중 모양 색)
  function longBoard() {
    const sz = size(16);
    $('n17s-lw').innerHTML = B.html('n17s-lneck', LONG, sz.w, sz.h);
    $('n17s-lab').innerHTML = CAGED.map(function (c, i) { return '<span class="n17s-l n17s-c' + (i % 2) + '" data-i="' + i + '" style="left:' + B.x(LONG, c.mid) + '%">' + c.F + '</span>'; }).join('');
    $('n17s-lab').style.width = sz.w + 'px';
  }
  function placeAll() {
    const nk = $('n17s-lneck'), lead = J.leadMs();
    CAGED.forEach(function (c, i) {
      later(function () {
        setCls(Array.prototype.slice.call(nk.querySelectorAll('.fb-note')), 'n17s-old', true);
        c.keys.forEach(function (k) { const p = sf(k), old = nk.querySelector('.fb-note[data-k="' + k + '"]'); if (old) old.remove(); nk.appendChild(B.note(LONG, p[0], p[1], '', 'n17s-c' + (i % 2) + ' n2-pop')); });
        setCls([$('n17s-lab').querySelector('[data-i="' + i + '"]')], 'is-in', true);
        chord(c.keys);
      }, lead + i * 1500);
    });
    return wait(lead + CAGED.length * 1500 + 600).then(function () { setCls(Array.prototype.slice.call(nk.querySelectorAll('.fb-note')), 'n17s-old', false); });
  }
  function labRun() {
    const els = Array.prototype.slice.call(document.querySelectorAll('#n17s-lab .n17s-l'));
    els.forEach(function (el, i) { later(function () { J.anim(el, [{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(1.35)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 420, easing: J.EASE_OUT }); }, i * 300); });
    return wait(els.length * 300 + 500);
  }
  function longReady() { longBoard(); const nk = $('n17s-lneck'); CAGED.forEach(function (c, i) { c.keys.forEach(function (k) { const p = sf(k), old = nk.querySelector('.fb-note[data-k="' + k + '"]'); if (old) old.remove(); nk.appendChild(B.note(LONG, p[0], p[1], '', 'n17s-c' + (i % 2))); }); }); setCls(Array.prototype.slice.call(document.querySelectorAll('#n17s-lab .n17s-l')), 'is-in', true); }

  //  강의 최종 목적: 폼 이름 = 숨은 코드 모양(D4 씨앗 회수), CAGED 순서 반복, 코드 모양으로 확장(씨앗) — 퀴즈 ① 무슨 폼 ② 메이저 빈자리
  const steps = [
    // P1 숨은 모양
    // 0 핵심(D4 씨앗 회수): 블럭 이름이 코드 모양에서 왔다고 했던 것 — 오늘 그 비밀. 문구만
    J.chainSteps([
      { text: '펜타토닉을 배울 때 블럭 이름이\n' + em('코드 모양') + '에서 왔다고 했죠?', run: none },
      { text: '이번 시간에 그 비밀을 알아볼게요!', run: none },
    ]),
    // 1 핵심(새 내용): C폼엔 C코드 모양 → 다른 폼도(A·G·E·D 차례로). 끝 화면 = D폼 + D코드 모양
    Object.assign(J.chainSteps([
      { text: '메이저 스케일 ' + em('C폼') + ' 안에는\n' + em('C코드') + ' 모양이 숨어 있어요', scene: 'n17s-fb', run: function () { return fx([$('n17s-fb')], 'is-on', true).then(function () { return showForm('C'); }); } },
      { text: '다른 폼도 마찬가지예요\n' + em('A폼') + '엔 A, ' + em('G폼') + '엔 G, ' + em('E폼') + '엔 E, ' + em('D폼') + '엔 D!', run: function () {
        return ['A', 'G', 'E', 'D'].reduce(function (p, F) { return p.then(function () { return showForm(F); }); }, Promise.resolve());
      } },
    ]), { ms: 0 }),
    // P2 CAGED
    // 2 핵심(새 내용): 다섯 모양을 지판 왼쪽부터 차례로. 끝 화면 = 긴 지판에 모양 여섯 + 이름표
    { text: '다섯 폼을 지판에\n' + em('차례로') + ' 놓아볼게요', scene: 'n17s-long', enter: longBoard, ms: 0, run: function () { return fx([$('n17s-long')], 'is-on', true).then(placeAll); } },
    // 3 핵심(새 내용): C A G E D가 반복 → CAGED 시스템. 끝 화면 = 같음(이름표 통통)
    Object.assign(J.chainSteps([
      { text: em('C A G E D') + ' 순서가\n지판 위에서 계속 ' + em('반복') + '돼요', scene: 'n17s-long', enter: longReady, run: function () { return fx([$('n17s-long')], 'is-on', true).then(labRun); } },
      { text: '그래서 이것을 ' + em('CAGED 시스템') + '이라고 불러요', run: none },
      { text: '영어 단어처럼 ' + em('케이지드') + '라고\n읽어도 돼요', run: none },   // 읽는 법 안내(사용자 지정 2026-11-24)
    ]), { ms: 0 }),
    // 4 핵심(씨앗): 앞으로 배울 코드 모양도 이 다섯 가지에서
    { text: '앞으로 배울 많은 코드 모양도\n이 ' + em('5가지 모양') + '에서 만들어져요', scene: 'n17s-long', enter: longReady, run: function () { return fx([$('n17s-long')], 'is-on', true); } },
    // P3 마무리 — 퀴즈는 메이저 스케일 복습임을 알림(사용자 지정)
    J.chainSteps([
      { text: '이번 퀴즈는 메이저 스케일\n' + em('복습') + ' 문제예요', scene: 'n17s-long', enter: longReady, run: function () { return fx([$('n17s-long')], 'is-on', true); } },
      { text: '블럭에 숨은 ' + em('코드 모양') + '을 고르는\n문제도 있어요!', run: none },
    ]),
  ];
  const groups = [[0, 1], [2, 3, 4], [5]];
  const MS = { 1: 11400, 2: 10220, 3: 9140 };   // 칸 길이(ms) = 측정값(scripts/journey-lesson-timing.js)
  Object.keys(MS).forEach(function (k) { steps[k].ms = MS[k]; });

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  ① shape 메이저 블럭(근음 표시) → 무슨 폼인지(4지선다) ② fill 메이저 블럭 빈자리 채우기(다섯 폼)
  const NODE_ID = 'caged';
  const CFG = { 1: { shape: 4, fill: 6 }, 2: { shape: 4, fill: 6 }, 3: { shape: 6, fill: 9 } };
  const BLANK = { 1: [2, 2], 2: [3, 4], 3: [4, 6] };
  function cycle(n, pool) { const out = []; let p = []; for (let k = 0; k < n; k++) { if (!p.length) p = K.shuffle(pool.slice()); out.push(p.pop()); } return out; }
  function make(star) {
    const c = CFG[star], shapes = [], fills = [], seen = {};
    cycle(c.shape, ORDER).forEach(function (F) {
      const others = K.shuffle(ORDER.filter(function (x) { return x !== F; })).slice(0, 3);
      shapes.push({ type: 'shape', form: F, answer: F, choices: K.shuffle([F].concat(others)) });
    });
    const ff = cycle(c.fill, ORDER);
    for (let k = 0, g = 0; k < c.fill && g < 500; g++) {
      const F = ff[k], m = BLANK[star][0] + K.rnd(BLANK[star][1] - BLANK[star][0] + 1);
      const ans = K.shuffle(MAJOR[F].map(keyOf)).slice(0, m).sort(), sig = F + ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; fills.push({ type: 'fill', form: F, ans: ans }); k++;
    }
    return K.spread([shapes, fills]);
  }
  function render(it, ui) {
    const F = MAJOR[it.form], w = winOf(it.form), bw = B.quizW();
    if (it.type === 'shape') {
      ui.box.innerHTML = ui.infoCard('이 메이저 스케일 블럭은', '무슨 폼', '일까요?') + '<div class="jq-board"><div id="n17q-slot"></div></div>' +
        '<div class="jq-cq-answer"><div class="ms-quiz-choices jq-cq-choices">' + it.choices.map(function (x) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + x + '">' + x + '폼</button>'; }).join('') + '</div></div>';
      $('n17q-slot').innerHTML = B.html('n17q-neck', w, bw, Math.min(bw * 0.45, 170));
      const nk = $('n17q-neck');
      F.forEach(function (n) { nk.appendChild(B.note(w, n[0], n[1], '', n[3] === 1 ? 'fb-note--root' : '')); });
      ui.bindChoices(it.answer);
      return;
    }
    const shown = F.map(keyOf).filter(function (k) { return it.ans.indexOf(k) < 0; }), ghost = [];
    for (let s = 1; s <= 6; s++) for (let f = w.minF; f <= w.maxF; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    ui.box.innerHTML = ui.infoCard('빈자리를 채워서', '메이저 스케일 ' + it.form + '폼을', '완성해주세요') + '<div class="jq-board"><div id="n17q-slot"></div></div>';
    $('n17q-slot').innerHTML = B.html('n17q-neck', w, bw, Math.min(bw * 0.5, 190), { ghost: ghost });
    const nk = $('n17q-neck'), sel = {};
    F.forEach(function (n) { if (it.ans.indexOf(keyOf(n)) < 0) nk.appendChild(B.note(w, n[0], n[1], '', n[3] === 1 ? 'fb-note--root' : '')); });
    nk.addEventListener('click', function (e) {
      if (ui.judged()) return;
      const p = B.pos(nk, w, e);
      if (!p) return;
      const k = p[0] + '-' + p[1];
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.2, 0.5);
      if (shown.indexOf(k) >= 0) return;
      if (sel[k]) { sel[k].remove(); delete sel[k]; } else { sel[k] = B.note(w, p[0], p[1], '', 'fb-note--placed'); nk.appendChild(sel[k]); }
      ui.ready(Object.keys(sel).length > 0);
    });
    ui.submit(function () {
      const picked = Object.keys(sel), ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
      picked.forEach(function (k) { sel[k].classList.remove('fb-note--placed'); sel[k].classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong'); });
      it.ans.forEach(function (k) { if (!sel[k]) { const p = sf(k); nk.appendChild(B.note(w, p[0], p[1], '', 'fb-note--missed')); } });
      ui.verdict(ok);
    });
  }
  function startQuiz() {
    K.start({ nodeId: NODE_ID, clearName: 'CAGED 시스템', make: make, render: render, title: function (it) { return it.type === 'fill' ? '알맞은 답을 모두 고르세요' : '알맞은 답을 고르세요'; } });
  }

  J.register(NODE_ID, { layers: ['n17s-fb', 'n17s-long'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE_ID); } });
})();
