// ───────────────────────────────────────────────────────────
// 여정 노드: 약식 F코드 잡기 (코드반주 D8)
//   D6(cg-chords.js)를 복사해 내용만 바꿈(2026-11-15 사용자 기획). 설명 단계 + 퀴즈.
//   목적(사용자 지정): F코드 약식(xx3211, 1번 손가락이 1·2번줄을 바레)으로 처음 '바레'(손가락 하나로 여러 줄을 동시에 누름)를 배우고 — 검지 옆면으로 누르면 힘이 잘 실림 —
//         이 노드에서 기초 코드 9가지(C·D·E·F·G·A·Am·Dm·Em)를 모두 완성, 작은 별을 C키(C·F·G)로 연습
//   흐름: F 모양 + 소리 → 바레 짚기(1번 점 파랑) → 바레 정의 → 누르는 요령 → C → F 전환(2·3번 그대로 옮기고 1번은 눕혀 바레) → 작은 별 C키
//   바레 점: DOM 점을 바레가 덮는 줄 범위만큼 세로로 늘인 알약 모양(.n8-dots). C → F에서 1번 점이 늘어나며 눕는 것처럼 보임
//   에셋·도구는 D5~D7과 같음(CSS .n4-* · .n5-* · .n7-hot 공용) + 이 노드 전용 .n8-dots(바레 점). 층·요소 id는 n8-*
//   코드 전환 문구에는 '위·아래' 같은 방향 말을 쓰지 않는다(가이드 §4-25)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — 기초 코드 9가지(D3~D7에서 배운 8개 + F). F = 코드 사전 기본 운지 xx3211(1번 손가락 1·2번줄 바레 — 사용자 지정 운지와 같음). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄
  function pick(name) {   // 사전은 근음별 목록 — 마이너도 같은 근음 목록 안에 이름(Am 등)으로 들어 있음
    return window.chordsLibrary[name.charAt(0)].filter(function (e) { return e.name === name && e.source === 'static' && e.slotFret === 2; })[0];
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
      Am: mk('Am'), Dm: mk('Dm'), Em: mk('Em') };   // 운지는 앞 노드와 같음(D6 C·G, D7 마이너) + F xx3211
    return CHORDS;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄, 바레면 첫 줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }
  function fingerSpan(c, n) {   // n번 손가락이 덮는 줄 범위 [첫 줄, 끝 줄] — 바레가 아니면 둘이 같음
    const a = fingerIdx(c, n);
    let b = a;
    for (let s = a + 1; s < 6; s++) if (c.fing[s] === n && c.frets[s]) b = s;
    return [a, b];
  }

  // ── 소리 — 줄 선택: 'all' 6→1번줄 / 'w4' 1~4번줄(D4와 같음: 다운 강세 = 모든 줄, 약세 = 1~4번줄). 안 울리는 줄(X)은 뺌 ──
  function strokeMidis(c, kind) {
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  // beats: 강박이 다음 강박까지 울릴 박 수(강약 패턴). 약박에서 안 치는 줄(5·6번줄 저음)이 1초 고정 길이로 둘째 박 중간에 사라져 강박이 '뚝' 끊기던 문제(사용자 지적 2026-11-15).
  //  약박이 다시 치는 줄은 같은 음 재타격 때 엔진(guitar-audio.js _doStrum)이 앞 음을 풀어 줌 — 길게 잡아도 겹쳐 쌓이지 않음
  function hit(c, kind, mode, beats) { J.strum(strokeMidis(c, kind), J.audioT0(), beats ? beats * BEAT_MS / 1000 + 0.05 : 1.0, 0.3, mode); }
  function ring(id) { J.strum(strokeMidis(chords()[id], 'all'), J.audioT0(), 2.2, 1.0); }   // 코드 소리 한 번(길게)

  // ── 다이어그램 — 't' 전환 층(큰 것, 점 4개는 DOM으로 캔버스 위에 겹침 — D4와 같음). 작은 별 층은 A·D·E 세 개를 전환 없이 나란히(점까지 캔버스에 그림, 사용자 지정) ──
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };   // voicing-canvas.js 기준 치수(440×352)
  const DIAG = { t: { cv: 'n8-ct', wrap: 'n8-cwt', dots: 'n8-dtt', id: null } };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  // 위 영역 높이(CSS .n4-dz / .n5-dzs와 같은 값 — D5 CSS 공용) — 다이어그램은 지판 아래 끝이 이 높이 안에 들어오는 최대 크기, 지판 가운데가 영역 가운데(D4 §4-22)
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = { s: 100 };
  // 하나만 띄우는 큰 다이어그램('t') = 뷰포트별 고정 크기(가이드 §4-40, D3·D5와 같음 — 2026-11-21): 360px대 245px / 412px부터 300px / 481px~ 340px.
  //  무대 높이는 .n3-stage(style.css)가 같이 키움(220 / 264 / 296). 지판 가운데가 무대 가운데인 것은 그대로(§4-22)
  function dw() {
    return Math.min(stageW(), window.matchMedia('(min-width: 481px)').matches ? 340 : window.matchMedia('(min-width: 412px)').matches ? 300 : 245);
  }
  // 캔버스 하나에 그리기 — c = 코드(null이면 지판만: 점·O·X·이름 없음). full = 점(손가락 번호)까지 캔버스에 그림(작은 별 층), 아니면 점은 DOM이라 안 그림
  function drawV(cv, c, w, full) {
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f) { return f > 0 && !full ? null : f; }) : [null, null, null, null, null, null],
      openMute: c ? e.openMute : [null, null, null, null, null, null], barre: c && full ? e.barre || {} : {}, barreRange: c && full ? e.barreRange || null : null,   // 바레 막대는 점을 캔버스에 그릴 때만(DOM 점 모드에선 바레 점이 대신함)
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c ? c.fing : [null, null, null, null, null, null],
    }, { chordName: c ? c.name : null, fingerNumMode: true, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  // 래퍼 = 캔버스 3장 겹침: 지판만(.n4-base) / 지금 코드 / 바뀔 때 잠깐 쓰는 이전 코드(.n4-old) — D4와 같음
  function paintDiag(k, id) {
    const d = DIAG[k], cv = $(d.cv);
    if (id !== undefined) d.id = id;
    if (!cv || !d.id) return;
    const c = chords()[d.id], w = dw(), box = $(d.wrap);
    drawV(box.querySelector('.n4-base'), null, w);
    drawV(cv, c, w);
    box.style.width = w + 'px';
    box.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';
    box.style.setProperty('--n4-w', w + 'px');
    box.parentNode.style.height = Math.round(FB_BOTTOM / VoicingCanvas.BASE_W * w) + 'px';   // 위 영역 높이 = 지판 아래 끝(고정 크기라 160px보다 커질 수 있음) — 아래 다시보기 버튼이 지판에 겹치지 않게(D5와 같음)
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
    const sp = fingerSpan(chords()[id], n);   // 바레 = 덮는 줄 범위의 가운데에, 그 범위만큼 세로로 늘인 알약(CSS .n8-dots — 높이도 전환되어 C → F에서 1번이 눕는 것처럼 보임)
    const l = (QD.x0 + (chords()[id].frets[s] - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%';
    const t = (QD.y0 + (sp[0] + sp[1]) / 2 * QD.sh) / VoicingCanvas.BASE_H * 100 + '%';
    const h = (QD.dot + (sp[1] - sp[0]) * QD.sh) / VoicingCanvas.BASE_H * 100 + '%';
    if (!el.classList.contains('is-on')) {   // 나타나는 점은 이동 없이 그 자리에서
      el.classList.add('is-snap');
      el.style.left = l; el.style.top = t; el.style.height = h;
      void el.offsetWidth;
      el.classList.remove('is-snap');
    } else { el.style.left = l; el.style.top = t; el.style.height = h; }
    el.classList.add('is-on');
  }
  function putChordDots(k, id) { [1, 2, 3, 4].forEach(function (n) { putDot(k, n, fingerIdx(chords()[id], n) >= 0 ? id : null); }); }
  // 처음 보여 줄 때 — 이동 없이 곧바로 완성 모양(§4-24)
  function snapChordDots(k, id) {
    const els = [1, 2, 3, 4].map(function (n) { return dotEl(k, n); }).filter(Boolean);
    els.forEach(function (el) { el.classList.add('is-snap'); el.classList.remove('n7-hot'); });
    putChordDots(k, id);
    els.forEach(function (el) { void el.offsetWidth; el.classList.remove('is-snap'); });
  }
  function snapDiag(k, id) { paintDiag(k, id); snapChordDots(k, id); }
  // 코드 전환 — C → F(사용자 지정 2026-11-15): 2·3번은 D4부터 해 온 대로 그대로 한 줄씩 옮기며 먼저 출발(lead), 조금 뒤 1번이 그 자리에서 눕혀 바레가 됨(점이 1·2번줄로 늘어남).
  //  D6 C ↔ G 도구(lead → swap)를 그대로 쓰고, D7처럼 자리가 그대로인 손가락은 lead에서 뺌. 바레로 바뀌는 손가락은 swap 묶음(떼기·놓기와 같은 순간). 개방현·뮤트·코드 이름은 항상 마지막(fadeDiag)
  //   sc = 시간 배율. 돌려주는 값 = 끝날 때까지 걸리는 시간(ms)
  const SEQ_GAP = { lead: 250, swap: 400 };   // lead = 2·3번 출발 → 1번 눕힘 출발 / swap = 그 뒤 → 마무리
  function seqMove(k, to, sc) {
    sc = sc || 1;
    $(DIAG[k].wrap).style.setProperty('--n4-sp', sc);   // 점 이동·나타남 전환 시간도 같은 배율(CSS .n4-dot)
    const from = chords()[DIAG[k].id], dest = chords()[to];
    const uses = function (c, n) { return fingerIdx(c, n) >= 0; };
    const bar = function (c, n) { const p = fingerSpan(c, n); return p[0] >= 0 && p[1] > p[0]; };
    const F = [1, 2, 3, 4];
    const changed = F.filter(function (n) { const a = fingerSpan(from, n), b = fingerSpan(dest, n); return a[0] >= 0 && b[0] >= 0 && (a[0] !== b[0] || a[1] !== b[1] || from.frets[a[0]] !== dest.frets[b[0]]); });
    const move = changed.filter(function (n) { return !bar(from, n) && !bar(dest, n); });
    const swapF = F.filter(function (n) { return uses(from, n) !== uses(dest, n); }).concat(changed.filter(function (n) { return bar(from, n) || bar(dest, n); }));   // 떼기·놓기 + 바레로 눕히기(같은 순간)
    let t = 0;
    [['lead', move], ['swap', swapF]].forEach(function (g) {
      if (!g[1].length) return;
      later(function () { g[1].forEach(function (n) { putDot(k, n, uses(dest, n) ? to : null); }); }, t);
      t += SEQ_GAP[g[0]] * sc;
    });
    const fade = DIAG_FADE_MS * sc;
    later(function () { fadeDiag(k, to, fade); }, t);
    return t + fade;
  }
  // 바레 짚기 — n번 손가락 점만 파랑(D7 .n7-hot과 같은 색 규칙). 장면이 바뀌면 snapChordDots가 지움
  function hotOn(ns) { ns.forEach(function (n) { const el = dotEl('t', n); if (el) el.classList.add('n7-hot'); }); }
  // 전환 시연 한 번 — 순서대로 옮긴 뒤 새 코드 소리
  function demoMove(to) {
    const ms = seqMove('t', to);
    later(function () { ring(to); }, ms);
    return wait(ms + J.leadMs() + 2000);
  }

  // 작은 별 층 — C·F·G 세 칸(C키 1·4·5도 순서 — D5의 A·D·E, D6의 G·C·D와 같은 자리)(무대 폭 3등분), 칸마다 지판 가운데를 칸 가운데에. 크기 = 칸에 O·X까지 들어가고 지판 아래 끝이 위 영역(100px) 안에 들어오는 최대
  const TRIO = ['C', 'F', 'G'];
  function paintTrio() {
    const B = VoicingCanvas, w = Math.max(80, Math.min(stageW() / 3 * B.BASE_W / (2 * HALF_SPAN), DZ_H.s * B.BASE_W / FB_BOTTOM));
    q('#n8-song .n5-trio canvas').forEach(function (cv) {
      drawV(cv, chords()[cv.dataset.c], w, true);
      cv.style.marginLeft = -(FB_CX / B.BASE_W * w) + 'px';
    });
  }
  function trioHtml(ids) { return '<div class="n5-trio">' + ids.map(function (id) { return '<div class="n5-tc"><canvas data-c="' + id + '"></canvas></div>'; }).join('') + '</div>'; }

  function dotsHtml() { return [1, 2, 3, 4].map(function (n) { return '<span class="n4-dot" data-f="' + n + '" style="width:' + QD.dot / VoicingCanvas.BASE_W * 100 + '%">' + n + '</span>'; }).join(''); }
  function cwrap(k) { const d = DIAG[k]; return '<div class="n4-cw" id="' + d.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + d.cv + '"></canvas><canvas class="n4-old"></canvas><div class="n4-dots n8-dots" id="' + d.dots + '">' + dotsHtml() + '</div></div>'; }

  // ── 작은 별 — D5와 같은 곡을 C키로 옮김(사용자 지정): 코드 A→C · D→F · E→G, 멜로디 전부 3반음 위(C4 = 60부터 — 내리면 C3로 너무 낮음).
  //  SONG_CH_A = D5 A키 진행, SONG_CH = C키 진행(강의 악보·재생·퀴즈 코드진행 문제) ──
  const SONG_CH_A = [['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A'], ['A', 'D'], ['A', 'E'], ['A', 'D'], ['A', 'E'], ['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A']];
  const TO_C = { A: 'C', D: 'F', E: 'G' };
  const SONG_CH = SONG_CH_A.map(function (bar) { return bar.map(function (c) { return TO_C[c]; }); });
  const TRANSPOSE = 3;   // A → C
  const LY1 = ['반짝반짝', '작은 별', '아름답게', '비치네'], LY2 = ['동쪽 하늘', '에서도', '서쪽 하늘', '에서도'];
  const SONG_LY = LY1.concat(LY2, LY1);
  const M1 = [[57, 1], [57, 1], [64, 1], [64, 1]], M2 = [[66, 1], [66, 1], [64, 2]], M3 = [[62, 1], [62, 1], [61, 1], [61, 1]], M4 = [[59, 1], [59, 1], [57, 2]];
  const M5 = [[64, 1], [64, 1], [62, 1], [62, 1]], M6 = [[61, 1], [61, 1], [59, 2]];
  const SONG_MEL = [M1, M2, M3, M4, M5, M6, M5, M6, M1, M2, M3, M4];   // 마디별 [MIDI(A키), 박 수] — 가사 한 글자 = 한 음. 재생할 때 TRANSPOSE만큼 옮김
  const SONG_BEATS = SONG_CH.length * 4;
  const NOTES = [];   // { midi, beat(곡 처음부터), len } — 가사 글자 순번과 같은 순서
  SONG_MEL.forEach(function (bar, m) { let b = m * 4; bar.forEach(function (nt) { NOTES.push({ midi: nt[0] + TRANSPOSE, beat: b, len: nt[1] }); b += nt[1]; }); });
  function chordAt(b) { return SONG_CH[Math.floor(b / 4)][b % 4 < 2 ? 0 : 1]; }
  // 악보 — 한 줄 4마디씩 3줄(사용자 표기 그대로). 마디 하나 = 버튼(터치하면 그 마디부터 재생). 코드는 칸(2박) 시작 위치, 가사는 마디 시작에 왼쪽 정렬(리하모니 악보와 같은 규칙)
  function scoreHtml() {
    let h = '<div class="n5-sc" id="n8-sc" data-sfx="none">', si = 0;   // data-sfx: 마디 터치에 앱 공통 버튼 효과음(pop)을 내지 않음(사용자 지정 — shared.js _sfxKind)
    for (let r = 0; r < 3; r++) {
      h += '<div class="lec6-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i>';
      for (let k = 1; k < 4; k++) h += '<i class="lec6-bar n5-mb" style="--k:' + k + '"></i>';
      for (let k = 0; k < 4; k++) {
        const m = r * 4 + k;
        h += '<button type="button" class="n5-m" data-m="' + m + '" style="--k:' + k + '">' +
          SONG_CH[m].map(function (id, j) { return '<span class="n5-ch" data-s="' + (m * 2 + j) + '">' + id + '</span>'; }).join('') +
          '<span class="n5-ly">' + SONG_LY[m].split('').map(function (ch) { return ch === ' ' ? ' ' : '<span class="lec-syl" data-i="' + (si++) + '">' + ch + '</span>'; }).join('') + '</span></button>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny', 'n3-stage');   // 무대 높이 = 큰 다이어그램 크기에 맞춤(D3·D5와 같음 — 220 / 412px~ 264 / 481px~ 296, §4-40). 두 층 모두 빈 무대에 새로 나타나는 장면이라 밑에서 올라옴(.jl-rise — §4-32)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer jl-rise n4-full" id="n8-trans"><div class="n4-stack"><div class="n4-dz">' + cwrap('t') + '</div><div class="n4-sz n4-rz"><button type="button" class="n4-replay" id="n8-replay" aria-label="다시보기" hidden>' + ICON_REPLAY + '<span>다시보기</span></button></div></div></div>' +   // 다시보기 = D4·D5와 같은 버튼(.n4-replay, 지판 아래 끝 + 32px)
      '<div class="jl-layer jl-rise n4-full n5-song" id="n8-song"><div class="n4-stack"><div class="n4-dz n5-dzs">' + trioHtml(TRIO) + '</div><div class="n4-sz">' + scoreHtml() + '</div></div></div>' +
      '</div>';
    snapDiag('t', 'F'); paintTrio();
    $('n8-replay').addEventListener('click', replayRun);
    $('n8-sc').addEventListener('click', function (e) {
      const b = e.target.closest('.n5-m');
      if (b && songLive()) songJump(+b.dataset.m);
    });
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { Object.keys(DIAG).forEach(function (k) { paintDiag(k); }); paintTrio(); fitSz(); });
    }
  }

  // ── 다시보기(D5·D6과 같은 버튼·동작, §4-42) — 코드 전환 칸(페이즈 2 스텝 2 C → F)이 끝나 마커가 멈췄을 때만 다이어그램 아래에 나타나 눌러지는 버튼.
  //  코드 전환 애니메이션만 다시 재생(문구·소리 없음). 나타남 = 엔진 settle / 사라짐 = 엔진 onCut(칸 이동·다시 시작·건너뛰기·닫기). 재생 중엔 눌러지지 않음
  const ICON_REPLAY = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  let replaying = null;   // 다시보기 재생 중인 { from, to } — 도중에 칸을 옮기면 도착 코드로 맞춰 둠(다음 칸 전환이 이 코드에서 시작하므로)
  function replayShow(from, to) {
    const b = $('n8-replay');
    if (!b) return;
    b._r = { from: from, to: to };
    b.disabled = false; b.hidden = false;
  }
  function replayHide() {
    const b = $('n8-replay');
    if (!b) return;
    b._r = null; b.disabled = true; b.hidden = true;
  }
  const REPLAY_HOLD_MS = 800;   // 시작 코드를 완성 모양으로 보여 주는 시간
  function replayRun() {
    const b = $('n8-replay'), r = b && b._r;
    if (!r || b.disabled || J.skipping()) return;
    b.disabled = true;
    replaying = r;
    // 시작 코드의 완성 모양(점·O·X·이름)을 즉시 온전히 보여 준 뒤 잠깐 멈췄다가 전환 — 새로 나타나는 점의 페이드인을 끊어 끝 상태로 바로 맞춤(D4와 같음)
    paintDiag('t', r.from); snapChordDots('t', r.from);
    const dots = [1, 2, 3, 4].map(function (n) { return dotEl('t', n); }).filter(Boolean);
    dots.forEach(function (el) { el.classList.add('is-snap'); });
    if (dots[0]) void dots[0].offsetWidth;
    dots.forEach(function (el) { el.classList.remove('is-snap'); });
    later(function () {
      const ms = seqMove('t', r.to);
      later(function () { if (replaying === r) replaying = null; if (b._r === r) b.disabled = false; }, ms + 200);
    }, REPLAY_HOLD_MS);
  }
  // 엔진 onCut — 다시보기 버튼 치움. 다시보기 도중이면(남은 예약은 엔진이 지움) 도착 코드 완성 모양으로 맞춤. 멱등
  function stageCut() {
    replayHide();
    if (replaying) { const r = replaying; replaying = null; snapDiag('t', r.to); }
  }

  // ── 화면 도구(D4와 같음) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  // 아래 영역(.n4-sz) 높이 = 위 영역(다이어그램) 아래 끝 ~ 본문 아래 끝의 여백 전체(§4-22). 악보는 이 여백의 상하 가운데
  function fitSz() {
    const st = $('combo-v2-lec-stage'), body = st && st.parentNode;
    if (!body) return;
    const bot = body.getBoundingClientRect().bottom;
    q('.n4-sz').forEach(function (sz) {
      const top = sz.previousElementSibling.getBoundingClientRect().bottom;
      sz.style.height = Math.max(80, Math.round(bot - top)) + 'px';
    });
  }
  function show(id, prepare) {
    if (prepare) prepare();
    fitSz();
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }

  // ── 작은 별 재생 — 70bpm(사용자 지정), 4비트 다운 스트로크 강약약약(D4와 같은 줄 선택) + 피아노 멜로디 + 가사·코드 칸 강조 + 다이어그램 전환 ──
  //  다음으로 넘어갈 때까지 계속(끝 마디 다음은 1마디). 마디 터치 = 그 마디부터 다시(사용자 지정). 시계(performance.now)로 다음 박을 보정(D4 loopTicks와 같음)
  //  모든 지연은 J.later — "다음"·이탈·일시정지에서 엔진이 한꺼번에 정리. 다시 틀 때는 세대 번호(songGen)로 이전 예약을 무시.
  //  다이어그램은 C·F·G 세 개 고정(전환 없음 — D5와 같음)
  const BEAT_MS = 60000 / 70;
  const SONG_GUITAR_TRIM = 0.3, SONG_PIANO_GAIN = 1.4;   // 리하모니 강의 작은별과 같은 값(멜로디가 기타에 묻히지 않게)
  let songGen = 0, songTickAt = 0;
  function songLive() { return songTickAt && performance.now() - songTickAt < 2 * BEAT_MS; }   // 재생이 돌고 있는 칸에서만 마디 터치가 먹음("다음"이 타이머를 지우면 멈춤)
  function songMark(b) {   // 지금 박 b의 코드 칸 파랑 + 가사(부른 글자 진하게, 지금 글자 파랑)
    const slot = Math.floor(b / 2);
    q('.n5-ch').forEach(function (el) { el.classList.toggle('is-hot', +el.dataset.s === slot); });
    q('#n8-sc .lec-syl').forEach(function (el) {
      const nt = NOTES[+el.dataset.i];
      el.classList.toggle('is-on', nt.beat <= b && b < nt.beat + nt.len);
      el.classList.toggle('is-sung', nt.beat + nt.len <= b);
    });
  }
  function songClear() {
    setCls(q('.n5-ch'), 'is-hot', false);
    setCls(q('#n8-sc .lec-syl'), 'is-on', false);
    setCls(q('#n8-sc .lec-syl'), 'is-sung', false);
  }
  function songLoop(startBar, ready) {
    if (J.skipping()) return Promise.resolve();
    const gen = ++songGen, alive = function () { return gen === songGen; };
    if (typeof J.songMix === 'function') J.songMix(SONG_GUITAR_TRIM, SONG_PIANO_GAIN);
    songClear();
    let n = 0, t0 = performance.now(), done;
    const p = new Promise(function (r) { done = r; });
    (function tick() {
      if (!alive() || J.skipping()) { done(); return; }   // 끊긴 재생(건너뛰기·마디 터치로 새로 시작·칸 이동)도 칸을 끝낸 것으로 — 안 그러면 '다음'이 엔진 안전 시간(20초) 뒤에야 켜짐(2026-11-15 점검)
      const now = performance.now();
      if (now - (t0 + n * BEAT_MS) > BEAT_MS) t0 = now - n * BEAT_MS;   // 일시정지 뒤 복귀처럼 크게 밀렸으면 지금부터 다시 맞춤
      const b = (startBar * 4 + n) % SONG_BEATS, id = chordAt(b);
      // 강박 = 마디 첫 박 + 코드가 바뀌는 박(마디 안에서 3박째에 코드가 바뀌면 강약강약, 한 마디가 한 코드면 강약약약 — 사용자 지정 2026-11-15).
      //  법칙이 아니라 이 반주의 선택: 일반적으로 코드가 바뀔 때 강박으로 전환을 확실히 하지만 때에 따라 약박·업 스트로크도 씀(D5 강의 7번 칸에서 그렇게 설명)
      const strong = b % 4 === 0 || chordAt(b) !== chordAt(b - 1);
      const toNext = b % 4 === 0 && chordAt(b + 2) !== id ? 2 : 4 - b % 4;   // 다음 강박까지 박 수(코드가 바뀌는 3박째 강박 또는 다음 마디 첫 박)
      if (strong) hit(chords()[id], 'all', 'acc', toNext); else hit(chords()[id], 'w4', 'weak');
      NOTES.forEach(function (nt) { if (nt.beat === b) J.piano(nt.midi, J.audioT0(), nt.len * BEAT_MS / 1000 * 0.95); });
      later(function () { if (alive()) songMark(b); }, J.leadMs());
      songTickAt = now;
      n++;
      if (n === ready) done();
      later(tick, Math.max(0, t0 + n * BEAT_MS - performance.now()));
    })();
    return p;
  }
  // 재생을 멈춤(이후 예약 무시)
  function songStop() {
    songGen++; songTickAt = 0;
    songClear();
  }
  // 마디 터치 — 울리고 있는 소리(기타·피아노, 이미 예약된 음 포함)를 전부 즉시 끊고(사용자 지정) 그 마디부터 다시.
  //  하드컷은 샘플러를 새로 만들므로 준비가 끝난 뒤 시작(준비 전에 예약하면 늦게 몰려 울림). 기다리는 사이 칸이 바뀌었거나 다른 마디를 또 눌렀으면 시작하지 않음
  function songJump(m) {
    songStop();
    const gen = songGen;
    if (typeof GuitarAudio === 'undefined') return;
    GuitarAudio.panic(); GuitarAudio.resetPiano();
    Promise.all([GuitarAudio.ready(), GuitarAudio.pianoReady()]).then(function () {
      if (gen !== songGen || J.skipping() || !$('n8-song').classList.contains('is-on')) return;
      songLoop(m, 0);
    });
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  //  강의 최종 목적: F 약식 운지(1번 바레)를 외우고, 바레를 처음 알고, 작은 별을 C키(C·F·G)로 친다
  const steps = [
    // P1 F코드 · 바레
    // 0 핵심: 오늘 목표(F코드) → F 운지 모양 + 소리(노드6부터: 모양을 처음 보여 줄 때 소리) + 5·6번줄은 안 침(X — 노드6 '6번줄은 치지 않아요!'와 같은 말투). 끝 화면 = F 다이어그램(1번 = 1·2번줄 알약)
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 ' + em('F코드') + '를\n배워볼게요!', run: none },
      { text: em('F코드') + '는 이렇게 생긴 코드예요!', scene: 'n8-trans:F', run: function () { return show('n8-trans', function () { snapDiag('t', 'F'); }).then(function () { ring('F'); return wait(J.leadMs() + 2000); }); } },
      { text: '5번줄과 6번줄은 치지 않아요!', run: none },
    ]), { ms: 11120 }),
    // 1 핵심(새 내용): 바레 모양 — 1번 손가락 하나가 1·2번줄을 함께 누름(1번 점만 파랑)
    { text: em('1번 손가락') + ' 하나로 ' + em('1번줄') + '과 ' + em('2번줄') + '을\n함께 누르고 있죠?', run: function () { hotOn([1]); return none(); } },
    // 2 핵심(새 내용): 바레의 정의(사용자 문장 — 한 손가락으로 여러 줄을 동시에)
    { text: '이렇게 손가락 하나로 여러 줄을\n동시에 누르는 것을 ' + em('바레') + '라고 해요', run: function () { hotOn([1]); return none(); } },
    // 3 핵심(새 내용): 누르는 요령 — 검지 옆면(사용자 지정)
    { text: '바레는 ' + em('검지의 옆면') + '으로 눌러주면\n힘이 더 잘 실려요', run: function () { hotOn([1]); return none(); } },

    // P2 코드 전환(C → F) — 사용자 승인으로 추가(작은 별 C키에 C ↔ F 전환이 나옴)
    // 4 핵심(배운 것의 적용): 2번, 3번 손가락 재활용(노드4~6 요령)이 C → F에서도 통함. 끝 화면 = C
    //  왜 지금 C → F를 연습하는지 먼저 말함(사용자 지정 2026-11-15 — 작은 별 C키에 C → F 전환이 나오니 미리 연습)
    Object.assign(J.chainSteps([
      { text: em('작은 별') + '을 ' + em('C코드') + '로 연습할 건데', scene: 'n8-trans:CF', run: function () {
        return show('n8-trans', function () { snapDiag('t', 'C'); });
      } },
      { text: em('C코드') + '에서 ' + em('F코드') + '로\n바뀌는 부분이 있어요', run: none },   // 3줄 문구 나눔(§4-41)
      { text: '이번에도 ' + em('2번, 3번 손가락') + '을 그대로 옮겨서\n미리 전환을 연습해볼게요!', run: none },
    ]), { ms: 9040 }),
    // 5 핵심(새 내용): 1번 손가락은 그 자리(2번줄 1프렛)에서 눕혀 바레로 — 2·3번이 먼저 한 줄씩 옮기고 조금 뒤 1번 점이 1·2번줄로 늘어남 → O·X·이름. 끝 화면 = F + F 소리
    { text: em('1번 손가락') + '은 그 자리에서 눕혀서\n' + em('바레') + '로 잡아주세요', ms: 5000, settle: function () { replayShow('C', 'F'); }, run: function () { return demoMove('F'); } },

    // P3 작은 별 C키
    // 6 핵심: 작은 별을 C코드로 연습(위 고정 다이어그램 = 이번에 쓸 코드 C·F·G). 연결 문구 없이 단순하게(D6 규칙). 끝 화면 = C·F·G 다이어그램 + 악보 12마디
    { text: '이제 ' + em('작은 별') + '을 ' + em('C코드') + '로\n연습해볼게요!', scene: 'n8-song', run: function () {
      return show('n8-song', function () { songStop(); paintTrio(); });
    } },
    // 7 핵심: 지금 칠 코드(울리는 칸 파랑) — D5·D6과 같은 재생, 마디 터치 = 그 마디부터. 한 마디 뒤 "다음" 켜짐
    { text: '원하는 마디를 터치하면\n그 부분부터 재생할 수 있어요', ms: 4000, run: function () { return songLoop(0, 4); } },
    // 8 핵심: 완주 → 다음 할 일(퀴즈 = 아홉 코드 암기 + 작은 별 C키 코드진행). 끝 화면 = 악보(재생 멈춤)
    Object.assign(J.chainSteps([
      { text: '이제 작은 별을 ' + em('세 가지 key') + '로\n연주할 수 있게 됐어요!', enter: songStop, run: none },   // A키(D5)·G키(D6)·C키(이번)
      { text: '이번에 배운 F코드와 Ckey의 코드진행으로\n복습 퀴즈를 풀어봅시다~!', run: none },   // 사용자 지정 2026-11-21
    ]), { ms: 7200 }),
  ];
  const groups = [[0, 1, 2, 3], [4, 5], [6, 7, 8]];

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(퀴즈 paintQ가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
  function paint(cv, chord, placed, nums, name, w, mc, fretLabelSize) {   // fretLabelSize: 프렛 번호 글자 크기(기준 440폭 단위, 없으면 기본 28)
    const dpr = window.devicePixelRatio || 1;
    let v = null;
    if (chord) {   // library.js _drawLibCanvas와 같은 필드. 아직 안 놓인 손가락의 점만 뺌(frets null + openMute null = 아무 표시 없음)
      const e = chord.entry, shown = chord.order.slice(0, placed);
      v = {
        frets:      e.frets.map(function (f, s) { return f > 0 && shown.indexOf(chord.fing[s]) < 0 ? null : f; }),
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
  // 퀴즈 — D6(cg-chords.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D7과 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-15):
  //     ① pick — 코드 맞추기 4지선다(기초 코드 9가지 풀): 다이어그램 → 이름 / 이름 → 다이어그램. 보기 = 정답 + 나머지 여덟 중 셋
  //     ③ prog — 코드 진행 매칭(D5와 같은 화면·오답풀이): 작은 별 C키 진행만(보기 C·F·G 순서 고정 — 코드반주 훈련 진행은 넣지 않음, 사용자 결정)
  //   점 찍기(fill)는 없음(요청 유형에 없음). 문제 수(사용자 지정): 별 1 15 / 별 2 20 / 별 3 20, 반반(잠정 8·7 / 10·10 / 10·10)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:f-chord
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 15, pick: 8, prog: 7 }, 2: { n: 20, pick: 10, prog: 10 }, 3: { n: 20, pick: 10, prog: 10 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'f-chord';
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


  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 보기·순서·채울 점도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  const QZ_CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em'];   // pick 풀 = 기초 코드 9가지
  const PROG_CHOICES = ['C', 'F', 'G'];   // 코드진행 보기(작은 별 C키, 순서 고정)
  // 스피커 아이콘 — 루시드 volume-2와 같은 도형(리하모니 .combo-v2-speaker — 마지막 두 path가 파동 애니메이션)
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  function balanced(n, pool) { pool = pool || QZ_CHORDS; const o = rnd(pool.length), a = []; for (let k = 0; k < n; k++) a.push(pool[(k + o) % pool.length]); return shuffle(a); }   // 풀 안에서 고르게(나머지는 무작위 시작점에서)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const pc = balanced(cfg.pick), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) {
      const others = shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k]; })).slice(0, 3);   // 4지선다
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k]].concat(others)), answer: pc[k] });
    }
    // ③ 코드 진행 — 작은 별 C키 연속 2마디(시작 마디 0~10, 한 퀴즈 안에서 되도록 겹치지 않게 — 11곳이라 별 2·3의 10문제도 모두 다름)
    const starts = shuffle(Array.from({ length: SONG_CH.length - 1 }, function (_, i) { return i; }));
    for (let k = 0; k < cfg.prog; k++) {
      const m = starts[k % starts.length];
      qs.push({ type: 'prog', key: 'C', bar: m, seq: SONG_CH[m].concat(SONG_CH[m + 1]), choices: PROG_CHOICES.slice() });
    }
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
  }
  // 퀴즈 다이어그램 — 강의와 같은 paint(코드 사전 그리기). given = 찍혀 보일 손가락 번호들(손가락 번호는 보임(사용자 지정), 코드명은 숨김 — 정답이 보이지 않게)
  function paintQ(cv, chord, given, w) { paint(cv, Object.assign({}, chord, { order: given }), given.length, true, false, w, null); }
  function diagCard(chord) { return '<canvas class="n3q-cv" data-chord="' + chord + '"></canvas>'; }

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
  //  pick = 코드 맞추기 문제 화면 템플릿(문제 카드 .ms-quiz-question-card + 말풍선 + 4개 .ms-quiz-choice-card(2×2), 보기는 이름 글자 또는 다이어그램 canvas-slot) — 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  prog = 2마디 악보 카드 + C·F·G 다이어그램 3개 — 칸마다 누르고, 4칸 뒤 채점
  const QZ_TITLES = { pick: '알맞은 답을 고르세요', prog: '알맞은 답을 고르세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

  // 안내 카드 — 리하모니 _comboV2BuildInfoCard와 같은 3줄(앞 문구 / 강조 / 뒤 문구). mid가 없으면 2줄
  function infoCard(head, mid, tail) {
    return '<div class="combo-v2-info-card cd-card"><p class="combo-v2-info-text"><span>' + head + '</span>' + (mid ? '<b><span>' + mid + '</span></b>' : '') + '<span>' + tail + '</span></p></div>';
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

  // ①③④ 문제 카드 + 말풍선 + 보기 4개
  //  ask: 카드 안 문제 문구(이름 아래). bubble: 답 영역 말풍선(없으면 생략)
  function cardQuizHtml(sub, name, ask, bubble, choices, big) {
    return '<div class="ms-quiz-question-card jq-qcard">' + (sub ? '<span class="jq-qsub">' + sub + '</span>' : '') + '<span class="ms-quiz-question-name' + (big ? '' : ' jq-qname--sm') + '">' + name + '</span>' +
      (ask ? '<span class="jq-qask">' + ask + '</span>' : '') + '</div>' +
      '<div class="jq-cq-answer">' + (bubble ? '<div class="jq-bubble">' + bubble + '</div>' : '') + '<div class="ms-quiz-choices jq-cq-choices">' +
      choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + c + '">' + c + '</button>'; }).join('') +
      '</div></div>';
  }
  function bindChoices() {
    $('jq-content').querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) cardJudge(b); });
  }

  // ── 코드 소리 — 코드 맞추기(chord-name-quiz.js _playQuizEntrySound·_quizStopEntrySound·자동 재생)와 같은 방식 ──
  //  pick 문제가 나오면 정답 코드 소리를 1회 자동 재생(0.18초 뒤, 그 사이 답했거나 다음 문제로 넘어갔으면 재생 안 함), 문제 카드를 누르면 다시 재생,
  //  보기를 고르는 순간 문제 소리는 바로 끊음. 줄 사이 0.008초 스트럼(전 줄 6번줄 → 1번줄)
  const TOUCH_HINT = '터치해서 소리도 들어보세요!';   // 코드 맞추기(chord-name-quiz.js QUESTION_TOUCH_HINT)와 같은 안내 — 문제 카드 안 설명 자리(.jq-qask)
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
  function playQ(it) { playChord(it.chord); }
  function stopSound() {
    clearTimeout(autoTimer);
    autoTimer = null;
    chordGen++;
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 하드컷(CLAUDE.md 0-7) — 문제가 바뀌거나 보기를 고르면 앞 소리·꼬리·예약을 즉시 끊음(페이드 stop은 꼬리가 남음)
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

  const PROG_FRET_PX = 10;   // 코드진행 보기 다이어그램의 프렛 번호 글자 크기(실제 화면 px, 사용자 지정 2026-11-15 — 다이어그램 폭과 상관없이 같은 크기)
  function render() {
    stopSound();   // 앞 문제 소리·예약을 하드컷 — 새 문제는 무음에서 시작(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    $('jq-title').textContent = QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'pick' && it.variant === 'd2n') {   // 다이어그램을 보고 이름 고르기
      // 좌상단 스피커(D5 코드진행 카드와 같은 자리 — 카드를 누르면 코드 소리, 사용자 지정 2026-11-15)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard jq-qcard--diag n5q-card"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button>' + diagCard(it.chord) + '<span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 이름을 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div></div>';
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], chords()[it.chord].order, Math.min(box.clientWidth - 64, 240));
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'pick') {   // 이름을 보고 다이어그램 고르기
      // '코드 이름' 안내 삭제(사용자 지정 2026-11-15) + 좌상단 스피커
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard n5q-card"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button><span class="ms-quiz-question-name">' + it.chord + '</span><span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag jq-cq-choices--diag4">' +   // 4지선다 — 카드 크기는 이름 보기 카드와 같게(88px), 다이어그램은 그 안에 맞춤(사용자 지정 2026-11-15)
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '"><div class="ms-quiz-choice-canvas-slot">' + diagCard(c) + '</div></div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n3q-cv').forEach(function (cv) {
        const c = chords()[cv.dataset.chord];
        paint(cv, c, c.order.length, false, false, Math.max(60, Math.floor(cv.parentNode.clientWidth)), null, 40);   // 점·O·X만 — 손가락 번호 표기 없음 / 프렛 번호는 기본(28)보다 약간 크게 40(사용자 지정 2026-11-15, 작은 4지선다 보기)
      });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'prog') {   // 코드 진행 — 위 = 2마디 악보(코드 이름만, 지금 누를 칸 파랑), 아래 = C·F·G 다이어그램 3개(이름·손가락 번호 없음)
      progSel = [];
      let sc = '<div class="lec6-row n5q-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i><i class="lec6-bar n5-mb" style="--k:2"></i>';
      it.seq.forEach(function (c, k) { sc += '<span class="n5q-ch' + (k === 0 ? ' is-cur' : '') + '" style="--k:' + k + '">' + c + '</span>'; });
      // 문제 카드 — 좌상단 스피커(리하모니 설명 카드 .combo-v2-speaker와 같은 아이콘·파동). 카드 아무 곳이나 누르면 지금 맞춰야 할 코드 소리(힌트 — 사용자 지정)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard n5q-card n5q-pcard"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button>' +   // n5q-p*: 문제 카드·보기 카드를 키움(D5·D6·D8 공통, 사용자 지정 2026-11-15)
        '<span class="jq-qsub">주어진 코드진행 순서대로 클릭하세요!</span><div class="n5q-sc">' + sc + '</div></div><span class="jq-qask n5q-hint">터치하면 현재 코드를 들을 수 있어요!</span></div>' +   // 위 = 문제 안내, 아래 = 힌트 소리 안내(사용자 지정)
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag n5q-choices n5q-pchoices">' +   // 말풍선 — 코드 맞추기·4지선다와 같은 자리·문구(사용자 지정 2026-11-15, D5·D6·D8 공통)
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '"><div class="ms-quiz-choice-canvas-slot">' + diagCard(c) + '</div></div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n3q-cv').forEach(function (cv) {
        const c = chords()[cv.dataset.chord];
        const w = Math.floor(cv.parentNode.clientWidth);
        paint(cv, c, c.order.length, false, false, w, null, PROG_FRET_PX * VoicingCanvas.BASE_W / w);   // 점·O·X만(번호·이름 없음). 폭 = 보기 칸 폭(CSS --n5q-dw — 사용자 지정 2026-11-15). 프렛 번호만 화면 크기 10px로 고정
      });
      box.querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) progTap(b); });
      box.querySelector('.n5q-card').addEventListener('pointerup', function () {
        if (qz && !qz.over && cur() === it && progSel.length < it.seq.length) playChord(it.seq[progSel.length]);
      });
    }
    qBtn('제출하기', false);
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

  // pick 보기를 누르면 바로 채점 — 코드 맞추기와 같은 정답(초록)·오답(빨강) 링, 보기는 잠김
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
  // 코드 진행 — 누를 때마다 지금 칸에 바로 정오(초록·빨강), 다음 칸으로(틀려도 되돌리기 없음 — 사용자 지정). 4칸을 다 누르면 채점(전부 맞아야 정답)
  //  오답풀이(CLAUDE.md 0-8): 틀린 칸에서 멈춤 — 빨강·오답음 뒤 그 칸에 화살표가 그대로 남고, 맞는 코드를 누를 때까지 그 칸을 반복. 맞히면 다음 칸, 4칸 끝 = 정답 → 자동 진행
  let progSel = [], ngTimer = null;
  function shake(el) { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); }   // 다시 틀려도 처음부터 다시 떨림
  function progTap(b) {
    if (!qz || qz.judged) return;
    const it = cur(), k = progSel.length;
    if (k >= it.seq.length) return;
    playChord(b.dataset.v);   // 누른 코드 소리 — 틀려도 누른 그대로(사용자 지정)
    const slots = $('jq-content').querySelectorAll('.n5q-ch');
    const hitOk = b.dataset.v === it.seq[k];
    clearTimeout(ngTimer);
    if (!hitOk && qz.phase === 'review') {   // 오답풀이 — 칸은 그대로, 잠깐 빨강 후 다시 지금 칸(파랑 + 화살표)
      const el = slots[k];
      el.classList.add('is-ng');
      shake(el);
      ngTimer = setTimeout(function () { if (el.isConnected && progSel.length === k) el.classList.remove('is-ng'); }, 500);
      return;
    }
    progSel.push(b.dataset.v);
    slots[k].classList.remove('is-cur', 'is-ng');
    slots[k].classList.add(hitOk ? 'is-ok' : 'is-ng');
    if (!hitOk) shake(slots[k]);   // 칸마다 정답·오답음은 내지 않음(사용자 지정 2026-11-15 — 취소). 틀린 칸만 코드 이름이 좌우로 호를 그리며 떨림. 정답·오답음은 4칸을 다 누른 뒤 채점 때 한 번
    if (k + 1 < it.seq.length) { slots[k + 1].classList.add('is-cur'); return; }
    $('jq-content').querySelector('.jq-cq-choices').classList.add('is-locked');
    verdict(progSel.every(function (v, i) { return v === it.seq[i]; }));
    // 마지막 칸 뒤에는 '다음' 버튼을 직접 누름(사용자 지정 2026-11-15 — 자동 진행 폐지). 버튼은 정답·오답과 상관없이 블루(qBtn). 채점 뒤 보기는 잠김(qz.judged)
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
    if (!qz.judged) return;   // 채점 전(보기를 눌러야 채점 — 점 찍기 제출은 이 노드에 없음)
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 오답풀이 진입 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 완주 화면 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    $('combo-v2-clear-title').textContent = '완주!';
    $('combo-v2-clear-level').textContent = '약식 F코드 잡기 · 퀴즈 ' + qz.star;
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    if (!qz.quit && typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_left', NODE_ID, qz, { reason: 'background' });   // 직접 나간 뒤의 pagehide는 빼고
    clearTimeout(autoTimer); autoTimer = null;
    chordGen++;   // 백그라운드 — 늦게 도착하는 코드 소리 취소
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });



  J.register('f-chord', { onCut: stageCut, layers: ['n8-trans', 'n8-song'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 8, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 8 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
