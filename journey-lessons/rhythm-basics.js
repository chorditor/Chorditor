// ───────────────────────────────────────────────────────────
// 여정 노드: 기초 리듬 훈련 (솔로연주 비기너 D4 — 2026-11-23, 2026-11-24 D9→D4로 옮김, docs/solo-beginner-curriculum.md)
//   얼터네이트 피킹(다운·업을 엄격히 번갈아 — 박의 앞 = 다운, 셋잇단은 박마다 시작 방향이 바뀜) + 4분·8분·8분 셋잇단·16분음표를 귀와 손에 익힘.
//   다운·업 피킹과 기호(ㄇ·V), 얼터네이트 피킹 소개는 D3(tab-chromatic.js)으로 옮김(2026-11-24) — 여기서는 이어받아 씀.
//   펜타 폼(D5~D9)은 4비트, 8·12·16비트 적용은 D10 펜타 수직 리듬·D11 크로메틱 리듬(사용자 지정). 박 소리 = 드럼 기본 8비트(DRUM_SETS[1] — 코드반주 D4 loadDrums·drumBeat와 같은 방식), 치는 음 = 3번줄 5프렛 C4 하나.
//   무대 층: 4박 격자(#n9s-grid). 퀴즈 엔진 = 공용 journey-quiz-kit.js
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  function none() { return Promise.resolve(); }

  // ── 피킹 기호 — 악보 표준: 다운 = ㄇ(위가 막힌 사각), 업 = V ──
  const ICON_D = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5h14v15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><rect x="5" y="4" width="14" height="4" fill="currentColor"/></svg>';
  const ICON_U = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l7 16 7-16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  // 리듬 — sub = 한 박의 음 수. 이름은 문구와 같은 말
  const RH = { 1: '4비트', 2: '2연음', 3: '3연음', 4: '4연음' };   // 리듬 이름 — 4비트 / 한 박을 N개로 나누면 N연음(사용자 지정 2026-11-24 — 8·12·16비트에서 바꿈, 셋잇단 = 3연음)
  // 얼터네이트 피킹 방향: 모든 리듬이 다운·업 번갈아(사용자 지정 2026-11-24 — 4분음표도) — 4분·8분·16분은 박 앞 = 다운, 셋잇단은 마디 전체를 이어 번갈아(박마다 시작 방향이 바뀜)
  function dirOf(sub, n) { return n % 2 ? 'U' : 'D'; }
  const CELL_W = { 1: 40, 2: 30, 3: 21, 4: 16 };
  function gridHtml(sub, opt) {
    opt = opt || {};
    let h = '<div class="n9s-g" style="--cw:' + CELL_W[sub] + 'px" data-sub="' + sub + '">';
    for (let b = 0; b < 4; b++) {
      h += '<div class="n9s-beat"><span class="n9s-bn">' + (b + 1) + '</span><div class="n9s-cells">';
      for (let c = 0; c < sub; c++) {
        const n = b * sub + c, hide = opt.hide === n;
        h += '<span class="n9s-c' + (hide ? ' n9s-q' : '') + '" data-n="' + n + '">' + (hide ? '?' : dirOf(sub, n) === 'D' ? ICON_D : ICON_U) + '</span>';
      }
      h += '</div></div>';
    }
    return h + '</div>';
  }

  // ── 소리 — 박 = 드럼 기본 8비트, 칸 = 기타 C4(3번줄 5프렛) ──
  const NOTE = 60, LEC_BPM = 60, QUIZ_BPM = 70;
  const DRUM_SCRIPTS = ['drum-sets.js', 'drum-samples.js', 'drum-audio.js'];
  let drumLoad = null;
  function loadDrums() {
    if (drumLoad) return drumLoad;
    const have = typeof DrumAudio !== 'undefined' && window.DRUM_SETS;
    drumLoad = (have ? Promise.resolve() : DRUM_SCRIPTS.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          const el = document.createElement('script');
          el.src = src; el.onload = res; el.onerror = function () { rej(new Error('드럼 스크립트를 불러오지 못함: ' + src)); };
          document.body.appendChild(el);
        });
      });
    }, Promise.resolve())).then(function () { return DrumAudio.ready(); }).catch(function (e) { console.error('[rhythm-basics]', e); });   // 실패하면 드럼 없이
    return drumLoad;
  }
  // 박 b(0~3) 하나 분량 = 기본 8비트(DRUM_SETS[1] — 킥 1·3박, 스네어 2·4박, 하이햇 8분음표)의 두 칸. beat = 한 박 길이(초). 코드반주 D4 drumBeat와 같은 방식(사용자 지정 2026-11-24)
  function drumAt(b, at, beat) {
    if (typeof DrumAudio === 'undefined' || !window.DRUM_SETS) return;
    const set = window.DRUM_SETS[1];
    [b * 2, b * 2 + 1].forEach(function (st, k) {
      const t = at + k * beat / 2;
      if ((set.kick || []).indexOf(st) >= 0) DrumAudio.hit('kick', t);
      if ((set.snare || []).indexOf(st) >= 0) DrumAudio.hit('snare', t);
      if ((set.hat || []).indexOf(st) >= 0) DrumAudio.hit('hat', t);
    });
  }
  function drumCut() { if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop(); }
  // 음 하나 길이·릴리스 — 모든 비트 레가토(다음 음이 시작될 때까지 + 0.18초 꼬리, D15 legato와 같은 값 — 사용자 지정 2026-11-24, 16비트 먼저 → 4·8·12비트도)
  function durOf(sub, beat) { return [beat / sub, 0.18]; }
  // 한 마디 예약 — at = 마디 시작(오디오 시계), cells = 칸 요소 목록(없으면 화면 없음). 화면은 소리와 같은 시각(lead + 예약 시각 − 지금)
  function barAt(sub, at, beat, cells, gen, genOf) {
    const now = J.audioT0(), lead = J.leadMs();
    for (let b = 0; b < 4; b++) drumAt(b, at + b * beat, beat);
    for (let n = 0; n < 4 * sub; n++) {
      const t = at + n * beat / sub;
      const d = durOf(sub, beat);
      J.note(NOTE, t, d[0], d[1]);
      if (cells) later(function () {
        if (genOf() !== gen) return;
        cells.forEach(function (el) { el.classList.toggle('is-on', +el.dataset.n === n); });
      }, Math.max(0, lead + (t - now) * 1000));
    }
  }
  let loopGen = 0;
  function cellsIn(root) { return Array.prototype.slice.call(root.querySelectorAll('.n9s-c')); }
  // 계속 재생(§4-23) — 마디 시작 시각을 처음 시각에서 계산해 밀리지 않게, 다음 마디는 0.4초 전에 예약. 칸이 바뀌면 loopGen으로 멈춤
  function loopBars(sub, root) {
    if (J.skipping()) return;
    const gen = ++loopGen, beat = 60 / LEC_BPM, bar = 4 * beat;
    loadDrums().then(function () {
      if (gen !== loopGen) return;
      const base = J.audioT0();
      let k = 0;
      (function sched() {
        if (gen !== loopGen) return;
        barAt(sub, base + k * bar, beat, cellsIn(root), gen, function () { return loopGen; });
        k++;
        later(sched, Math.max(0, (base + k * bar - J.audioT0()) * 1000 - 400));
      })();
    });
  }
  function lecCut() { loopGen++; drumCut(); }

  // ── 끊김 비교(P4 '음이 끊기지 않고' 문구 — 사용자 지정 2026-11-24) — 4연음 한 박 에셋 두 줄, 각 줄 오른쪽에 X·O(정답·오답 색)
  //   위 = 잘못된 소리(스타카토 — 칸마다 딱딱 끊김) / 아래 = 제대로 된 소리(4연음 레가토, 강의 리듬 반복과 같은 길이). 각각 8음(한 박 4칸을 두 번), 치는 칸 파랑
  const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const ICON_O = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';
  function cmpRow(id, ok) {
    // 칸 위 표기 — 스타카토 = 음마다 점, 레가토 = 네 음을 잇는 이음줄(악보 표기, 사용자 지정 2026-11-24). 박 가로줄은 이 에셋에선 뺌(.n9s-row CSS)
    const deco = ok ? '<svg class="n9s-slur" viewBox="0 0 118 14" preserveAspectRatio="none" aria-hidden="true"><path d="M4 12 Q59 -4 114 12 Q59 1 4 12Z" fill="currentColor"/></svg>'
      : '<span class="n9s-dot"></span><span class="n9s-dot"></span><span class="n9s-dot"></span><span class="n9s-dot"></span>';
    let h = '<div class="n9s-row" id="' + id + '"><div class="n9s-g" style="--cw:28px"><div class="n9s-beat"><div class="n9s-deco">' + deco + '</div><div class="n9s-cells">';
    for (let n = 0; n < 4; n++) h += '<span class="n9s-c" data-n="' + n + '">' + (dirOf(4, n) === 'D' ? ICON_D : ICON_U) + '</span>';
    return h + '</div></div></div><span class="n9s-mk ' + (ok ? 'n9s-mk--o' : 'n9s-mk--x') + '">' + (ok ? ICON_O : ICON_X) + '</span></div>';
  }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function cmpReset() { setCls([$('n9s-r0'), $('n9s-r1')], 'is-in', false); cellsIn($('n9s-cmp')).forEach(function (el) { el.classList.remove('is-on'); }); }
  function cmpPlay(row, legato) {
    const cells = cellsIn(row), beat = 60 / LEC_BPM, step = beat / 4, t0 = J.audioT0(), lead = J.leadMs(), d = durOf(4, beat);
    for (let k = 0; k < 8; k++) {
      const last = k === 7;
      if (legato) J.note(NOTE, t0 + k * step, last ? 0.8 : d[0], last ? 0.5 : d[1]);
      else J.note(NOTE, t0 + k * step, step * 0.45, 0.06);   // 스타카토 — 칸의 절반쯤 울리고 끊김(너무 딱딱하지 않게 — 사용자 지정 2026-11-24)
      later(function () { cells.forEach(function (el, i) { el.classList.toggle('is-on', i === k % 4); }); }, lead + k * step * 1000);
    }
    return wait(lead + 8 * step * 1000 + 200).then(function () { cells.forEach(function (el) { el.classList.remove('is-on'); }); });
  }

  // ═══════════════════════════ 강의 ═══════════════════════════
  function build(stage) {
    stage.classList.add('is-jny');
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer jl-rise n9s-grid" id="n9s-grid"><div class="n9s-name" id="n9s-name"></div><div id="n9s-gridin"></div><div class="n9s-pos">3번줄 5프렛</div></div>' +   // 따라 칠 자리(사용자 지정 2026-11-24)
      '<div class="jl-layer jl-rise n9s-cmp" id="n9s-cmp">' + cmpRow('n9s-r0', false) + cmpRow('n9s-r1', true) + '</div>' +   // 끊김 비교(P4)
      '</div>';
    loadDrums();
  }
  // 격자 칸 — 리듬 이름 + 4박 격자. 층을 켬(엔진은 장면이 바뀔 때 끄기만 함)
  function setGrid(sub) { $('n9s-name').textContent = RH[sub]; $('n9s-gridin').innerHTML = gridHtml(sub); }
  function gridOn() { return fx([$('n9s-grid')], 'is-on', true); }
  function gridRoot() { return $('n9s-gridin'); }
  // 시연 = 처음부터 반복 재생(§4-23) — 첫 마디 길이만 기다리고 다음 문구로, 소리는 칸이 바뀔 때까지 끊지 않음(문구만 바뀜 — 시연 중에도 따라 칠 수 있게, 사용자 지정 2026-11-24)
  function demoLoop(sub) {
    return gridOn().then(function () { loopBars(sub, gridRoot()); return wait(J.leadMs() + 4 * 60 / LEC_BPM * 1000 + 300); });
  }


  //  강의 최종 목적: 얼터네이트 피킹(다운·업 번갈아, 셋잇단은 박마다 방향이 바뀜) + 네 리듬을 듣고 구별(퀴즈 ① 듣고 고르기 ② 피킹 방향)
  const steps = [
    // P1 피킹
    // 0 핵심: 오늘 목표 — 리듬을 귀에 익힘. 문구만
    J.chainSteps([
      { text: '이번 시간에는 연주에 꼭 필요한\n' + em('기초 리듬') + '을 귀에 익혀볼게요', run: none },
    ]),
    // 1 핵심(복습·적용 — D3에서 배운 얼터네이트 피킹을 이어받음): 문구만, 짧게 → 바로 4분음표로(시연·격자 없음 — 사용자 지정 2026-11-24)
    J.chainSteps([
      { text: '크로메틱에서 배운 ' + em('얼터네이트 피킹') + '으로\n여러 가지 리듬을 쳐볼게요', run: none },
      { text: em('3번줄 5프렛') + '을 누르고\n같이 따라 쳐보세요!', run: none },   // 따라 칠 자리(사용자 지정 2026-11-24) — 격자 아래에도 계속 표시
    ]),

    // P2 4분·8분
    // 리듬 칸마다 설명과 함께 반복 재생 시작 → 소리를 끊지 않고 문구만 자유 연습으로(§4-23, 사용자 지정 2026-11-24)
    // 2 핵심(새 내용): 4비트 = 한 박에 한 번(다운·업 번갈아). 끝 화면 = 4칸 격자 반복 재생
    Object.assign(J.chainSteps([
      { text: '한 박에 한 번 치는 리듬을\n' + em('4비트') + '라고 해요', scene: 'n9s-grid:1', enter: function () { setGrid(1); }, run: function () { return demoLoop(1); } },
      { text: '박자에 맞춰 ' + em('다운, 업') + '을 번갈아 쳐보세요!\n원하는 만큼 연습하고 넘어가 주세요!', run: none },
    ]), { ms: 0 }),
    // 3 핵심(새 내용): 8비트 = 한 박을 둘로, 다운·업. 끝 화면 = 8칸 격자 반복 재생
    Object.assign(J.chainSteps([
      { text: '한 박을 둘로 나누면 ' + em('2연음') + '이에요\n' + em('다운, 업') + '을 번갈아 쳐요', scene: 'n9s-grid:2', enter: function () { setGrid(2); }, run: function () { return demoLoop(2); } },
      { text: '2연음으로 원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]), { ms: 0 }),

    // P3 셋잇단·16분
    // 4 핵심(새 내용): 12비트(셋잇단) = 한 박을 셋으로, 박마다 시작 방향이 바뀜(박 첫 칸 기호 파랑) → 자유 연습. 끝 화면 = 12칸 격자 반복 재생
    Object.assign(J.chainSteps([
      { text: '한 박을 셋으로 나누면\n' + em('3연음') + '이에요', scene: 'n9s-grid:3', enter: function () { setGrid(3); }, run: function () { return demoLoop(3); } },
      { text: em('셋잇단음표') + '라고도 해요', run: none },   // 12비트 보충 설명(사용자 지정 2026-11-24)
      { text: '얼터네이트 피킹으로 치면\n박마다 시작 방향이 ' + em('바뀌어요'), run: function () {
        return fx(cellsIn(gridRoot()).filter(function (el) { return +el.dataset.n % 3 === 0; }), 'is-hl', true, 200);
      } },
      { text: '3연음으로 원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]), { ms: 0 }),
    // 5 핵심(새 내용): 16비트 = 한 박을 넷으로, 다운·업·다운·업. 끝 화면 = 16칸 격자 반복 재생
    Object.assign(J.chainSteps([
      { text: '한 박을 넷으로 나누면 ' + em('4연음') + '이에요\n다운, 업, 다운, 업으로 쳐요', scene: 'n9s-grid:4', enter: function () { setGrid(4); }, run: function () { return demoLoop(4); } },
      { text: '4연음으로 원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]), { ms: 0 }),

    // P4 정리
    // 6 핵심(새 내용 — 연습 요령): 1~6번줄로 옮겨 연습(줄 두께마다 피킹 느낌이 다름) + 음이 끊기지 않게. 앞 두 문구는 빈 무대(리듬 총정리는 반복이라 삭제 — 사용자 지정 2026-11-24),
    //   '끊기지 않게' 문구에서 스타카토(X)·레가토(O) 4연음 비교(사용자 지정 2026-11-24)
    J.chainSteps([
      { text: '오늘 배운 리듬을 ' + em('1번줄부터 6번줄') + '까지\n줄을 바꿔가며 연습해보세요', scene: 'n9s-end', run: none },
      { text: '줄마다 두께가 달라서\n' + em('피킹하는 느낌') + '이 조금씩 달라요', run: none },
      // 끊긴 소리(X) → 이어지는 소리(O)를 차례로 들려줌. 끝 화면 = 두 줄 + X·O
      { text: '음이 끊기지 않고\n' + em('부드럽게 이어지도록') + ' 쳐보세요', scene: 'n9s-cmp', enter: cmpReset, run: function () {
        return fx([$('n9s-cmp')], 'is-on', true)
          .then(function () { return fx([$('n9s-r0')], 'is-in', true); }).then(function () { return cmpPlay($('n9s-r0'), false); })
          .then(function () { return wait(400); })
          .then(function () { return fx([$('n9s-r1')], 'is-in', true); }).then(function () { return cmpPlay($('n9s-r1'), true); });
      } },
    ]),
    // 7 핵심: 다음 할 일 — 듣고 맞히기
    { text: '이제 리듬에 익숙해질 수 있도록\n퀴즈를 풀어보면서 ' + em('복습') + '해주세요!', run: none },   // 사용자 지정 2026-11-24
  ];
  const groups = [[0, 1], [2, 3], [4, 5], [6, 7]];
  // 칸 길이(ms) = 측정값(scripts/journey-lesson-timing.js)
  const MS = { 2: 10000, 3: 8320, 4: 14600, 5: 8440, 6: 14560 };
  Object.keys(MS).forEach(function (k) { steps[k].ms = MS[k]; });

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  ① ear — 두 마디를 듣고 네 리듬 중 고르기(문제 카드 터치 = 처음부터 다시) ② dir — 격자의 ?칸 피킹 방향(다운/업)
  const NODE_ID = 'rhythm-basics';
  const CFG = { 1: { ear: 6, dir: 4 }, 2: { ear: 9, dir: 6 }, 3: { ear: 9, dir: 6 } };
  function make(star) {
    const c = CFG[star], ears = [], dirs = [];
    let pool = [];
    for (let k = 0; k < c.ear; k++) { if (!pool.length) pool = K.shuffle([1, 2, 3, 4]); ears.push({ type: 'ear', sub: pool.pop() }); }
    let dp = [];
    for (let k = 0; k < c.dir; k++) {
      if (!dp.length) dp = K.shuffle([1, 2, 3, 4]);   // 4분음표도(모두 얼터네이트 피킹이라 방향을 물을 수 있음 — 사용자 지정 2026-11-24)
      const sub = dp.pop(), n = 1 + K.rnd(4 * sub - 1);   // 첫 칸(늘 다운)은 빼고
      dirs.push({ type: 'dir', sub: sub, n: n, answer: dirOf(sub, n) });
    }
    return K.spread([ears, dirs]);
  }
  // 퀴즈 소리 — 두 마디(QUIZ_BPM), 기타 음 + 박 기준 드럼(기본 8비트 — 드럼이 없으면 박을 알 수 없어 다시 넣음, 사용자 지정 2026-11-24). 다시 들으면 앞 재생을 끊고 처음부터
  let earGen = 0;
  function earPlay(sub) {
    const gen = ++earGen;
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
    drumCut();
    loadDrums().then(function () {
      if (gen !== earGen) return;
      const ready = typeof GuitarAudio !== 'undefined' && GuitarAudio.ready ? GuitarAudio.ready() : Promise.resolve();
      return ready.then(function () {
        if (gen !== earGen) return;
        const beat = 60 / QUIZ_BPM, at = Tone.now() + 0.1;
        [0, 1].forEach(function (k) {
          const t = at + k * 4 * beat;
          for (let b = 0; b < 4; b++) drumAt(b, t + b * beat, beat);   // 박 기준 = 강의와 같은 기본 8비트 드럼(드럼이 없으면 박을 알 수 없음 — 사용자 지정 2026-11-24). 맞힐 리듬은 기타 음
          const d = durOf(sub, beat);   // 강의와 같은 길이(레가토)
          for (let n = 0; n < 4 * sub; n++) GuitarAudio.strumAt([NOTE], 0, t + n * beat / sub, d[0], d[1]);
        });
      });
    });
  }
  function stopQuizSound() { earGen++; drumCut(); }
  function render(it, ui) {
    if (it.type === 'ear') {
      ui.box.innerHTML = ui.cardHtml('리듬 소리', '<span class="n9q-spk">' + ICON_SOUND + '</span>', '터치해서 다시 들어보세요!', '들리는 리듬을 고르세요',
        [1, 2, 3, 4].map(function (s) { return { v: s, label: RH[s] }; }));
      ui.box.querySelector('.jq-qcard').addEventListener('click', function () { if (!ui.judged()) earPlay(it.sub); });
      ui.bindChoices(it.sub);
      earPlay(it.sub);   // 문제가 나오면 한 번 자동으로
      return;
    }
    ui.box.innerHTML = ui.cardHtml(RH[it.sub], '<span class="n9q-grid">' + gridHtml(it.sub, { hide: it.n }) + '</span>', '얼터네이트 피킹으로 칠 때', '?칸의 피킹 방향을 고르세요',
      [{ v: 'D', label: '다운 피킹 ' + ICON_D }, { v: 'U', label: '업 피킹 ' + ICON_U }]);
    ui.bindChoices(it.answer);
  }
  function startQuiz() {
    loadDrums();
    K.start({ nodeId: NODE_ID, clearName: '기초 리듬 훈련', make: make, render: render, stop: stopQuizSound, title: function () { return '알맞은 답을 고르세요'; } });
  }

  J.register(NODE_ID, { onCut: lecCut, layers: ['n9s-grid', 'n9s-cmp'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE_ID); } });
})();
