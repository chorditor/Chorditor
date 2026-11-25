// ───────────────────────────────────────────────────────────
// 여정 노드: 작은 별 연주하기 (코드반주 D5)
//   설명 단계(2026-11-13 사용자 흐름) + 퀴즈(파일 뒷부분 — D4 퀴즈 엔진 복사, 2026-11-14 유형).
//   흐름: 도입 → D코드(사용자 지정 운지 xxx231 = 3번줄 2번 · 2번줄 3번 · 1번줄 1번) → A↔D · D↔E 전환 → 작은 별(12마디, 70bpm 4비트 다운 스트로크 + 피아노 멜로디, 마디 터치 = 그 마디부터 재생)
//   에셋은 앱에 이미 있는 것만 재사용:
//     코드 다이어그램·손가락 점·순서대로 옮기기 = D4(stroke-basics.js) 도구를 그대로 복사(CSS .n4-* 공용)
//     악보 = 리하모니 강의 작은별 악보(.lec6-row/.lec6-ln/.lec6-bar — 가로선 위 코드, 아래 가사, 양끝 세로선·마디선), 가사 강조 .lec-syl(is-sung/is-on)
//     동요 소리 균형 = 리하모니 강의와 같은 값(기타 출력 0.3, 피아노 게인 1.4 — J.songMix, 칸이 끝나면 엔진이 되돌림)
//   코드 전환 문구에는 '위·아래' 같은 방향 말을 쓰지 않는다(가이드 §4-25)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — D4와 같음 + D(코드 사전 기본 운지 [1,3,2,…] = xxx231, 사용자 지정). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄
  function pick(root) {
    return window.chordsLibrary[root].filter(function (e) { return e.name === root && e.source === 'static' && e.slotFret === 2; })[0];
  }
  function mk(root, fing) {
    const e = pick(root);
    const f = fing || e.fingerings[0];
    const nums = f.filter(function (x) { return x; }).sort();
    return { name: e.name, entry: e, frets: e.frets, fing: f, order: nums };
  }
  let CHORDS = null;
  function chords() {
    if (!CHORDS) CHORDS = { E: mk('E'), A: mk('A', [null, 4, 3, 2, null, null]), D: mk('D', [1, 3, 2, null, null, null]) };
    return CHORDS;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
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
  const DIAG = { t: { cv: 'n5-ct', wrap: 'n5-cwt', dots: 'n5-dtt', id: null } };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  // 작은 별 층 위 영역 높이(CSS .n5-dzs와 같은 값) — 세 다이어그램은 지판 아래 끝이 이 높이 안에 들어오는 최대 크기, 지판 가운데가 칸 가운데(D4 §4-22)
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = { s: 100 };
  // 하나만 띄우는 큰 다이어그램('t') = 뷰포트별 고정 크기(가이드 §4-40, D3와 같음 — 2026-11-20): 360px대 245px / 412px부터 300px / 481px~ 340px.
  //  무대 높이는 .n3-stage(style.css)가 같이 키움(220 / 264 / 296 = 위 여백 24 + 폭 × 0.8). 지판 가운데가 무대 가운데인 것은 그대로(§4-22)
  function dw() {
    return Math.min(stageW(), window.matchMedia('(min-width: 481px)').matches ? 340 : window.matchMedia('(min-width: 412px)').matches ? 300 : 245);
  }
  // 캔버스 하나에 그리기 — c = 코드(null이면 지판만: 점·O·X·이름 없음). full = 점(손가락 번호)까지 캔버스에 그림(작은 별 층), 아니면 점은 DOM이라 안 그림
  function drawV(cv, c, w, full) {
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f) { return f > 0 && !full ? null : f; }) : [null, null, null, null, null, null],
      openMute: c ? e.openMute : [null, null, null, null, null, null], barre: {}, barreRange: null,
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
    box.parentNode.style.height = Math.round(FB_BOTTOM / VoicingCanvas.BASE_W * w) + 'px';   // 위 영역 높이 = 지판 아래 끝(고정 크기라 160px보다 커질 수 있음) — 아래 다시보기 버튼이 지판에 겹치지 않게
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
    if (!el.classList.contains('is-on')) {   // 나타나는 점은 이동 없이 그 자리에서
      el.classList.add('is-snap');
      el.style.left = l; el.style.top = t;
      void el.offsetWidth;
      el.classList.remove('is-snap');
    } else { el.style.left = l; el.style.top = t; }
    el.classList.add('is-on');
  }
  function putChordDots(k, id) { [1, 2, 3, 4].forEach(function (n) { putDot(k, n, fingerIdx(chords()[id], n) >= 0 ? id : null); }); }
  // 처음 보여 줄 때 — 이동 없이 곧바로 완성 모양(§4-24)
  function snapChordDots(k, id) {
    const els = [1, 2, 3, 4].map(function (n) { return dotEl(k, n); }).filter(Boolean);
    els.forEach(function (el) { el.classList.add('is-snap'); });
    putChordDots(k, id);
    els.forEach(function (el) { void el.offsetWidth; el.classList.remove('is-snap'); });
  }
  function snapDiag(k, id) { paintDiag(k, id); snapChordDots(k, id); }
  // 코드 전환 — 순서를 지킴(§4-24). 개방현·뮤트·코드 이름은 항상 마지막(fadeDiag).
  //   A → E만 D4 사용자 지정 순서(2·3번 이동 → 4번 떼기 → 1번 추가). 나머지는 규칙대로(사용자 지정 2026-11-13): 떼기 → 이동 → 놓기
  //     A → D: 4번 떼기 → 2·3번 이동 → 1번 놓기 / D → A: 1번 떼기 → 2·3번 이동 → 4번 놓기 / D ↔ E: 2·3번이 움직이기 시작하고 조금 뒤(lead 200ms) 1번도 같이 움직임 — 겹쳐서 이동(사용자 지정: 따로 떼었다 놓는 걸로 오해하지 않게)
  //   sc = 시간 배율. 돌려주는 값 = 끝날 때까지 걸리는 시간(ms)
  const SEQ_GAP = { leave: 300, move: 600, come: 400, lead: 200 };   // lead = 앞 묶음이 움직이기 시작한 뒤 다음 묶음이 따라 출발하기까지(겹쳐 움직임)
  function seqMove(k, to, sc) {
    sc = sc || 1;
    $(DIAG[k].wrap).style.setProperty('--n4-sp', sc);   // 점 이동·나타남 전환 시간도 같은 배율(CSS .n4-dot)
    const from = chords()[DIAG[k].id], dest = chords()[to];
    const uses = function (c, n) { return fingerIdx(c, n) >= 0; };
    const F = [1, 2, 3, 4];
    const leave = F.filter(function (n) { return uses(from, n) && !uses(dest, n); });
    const move = F.filter(function (n) { return uses(from, n) && uses(dest, n); });
    const come = F.filter(function (n) { return !uses(from, n) && uses(dest, n); });
    const de = (DIAG[k].id === 'D' && to === 'E') || (DIAG[k].id === 'E' && to === 'D');
    const m23 = move.filter(function (n) { return n === 2 || n === 3; }), m1 = move.filter(function (n) { return n !== 2 && n !== 3; });
    const order = DIAG[k].id === 'A' && to === 'E' ? [['move', move], ['leave', leave], ['come', come]]
      : de ? [['lead', m23], ['move', m1], ['leave', leave], ['come', come]]
      : [['leave', leave], ['move', move], ['come', come]];
    let t = 0;
    order.forEach(function (g) {
      if (!g[1].length) return;
      later(function () { g[1].forEach(function (n) { putDot(k, n, g[0] === 'leave' ? null : to); }); }, t);
      t += SEQ_GAP[g[0]] * sc;
    });
    const fade = DIAG_FADE_MS * sc;
    later(function () { fadeDiag(k, to, fade); }, t);
    return t + fade;
  }
  // 전환 시연 한 번 — 순서대로 옮긴 뒤 새 코드 소리
  function demoMove(to) {
    const ms = seqMove('t', to);
    later(function () { ring(to); }, ms);
    return wait(ms + J.leadMs() + 2000);
  }

  // 작은 별 층 — A·D·E 세 칸(무대 폭 3등분), 칸마다 지판 가운데를 칸 가운데에. 크기 = 칸에 O·X까지 들어가고 지판 아래 끝이 위 영역(100px) 안에 들어오는 최대
  const TRIO = ['A', 'D', 'E'];
  function paintTrio() {
    const B = VoicingCanvas, w = Math.max(80, Math.min(stageW() / 3 * B.BASE_W / (2 * HALF_SPAN), DZ_H.s * B.BASE_W / FB_BOTTOM));
    q('.n5-trio canvas').forEach(function (cv) {
      drawV(cv, chords()[cv.dataset.c], w, true);
      cv.style.marginLeft = -(FB_CX / B.BASE_W * w) + 'px';
    });
  }

  function dotsHtml() { return [1, 2, 3, 4].map(function (n) { return '<span class="n4-dot" data-f="' + n + '" style="width:' + QD.dot / VoicingCanvas.BASE_W * 100 + '%">' + n + '</span>'; }).join(''); }
  function cwrap(k) { const d = DIAG[k]; return '<div class="n4-cw" id="' + d.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + d.cv + '"></canvas><canvas class="n4-old"></canvas><div class="n4-dots" id="' + d.dots + '">' + dotsHtml() + '</div></div>'; }

  // ── 작은 별 — 12마디(한 마디 = 4박, 코드 칸 = 2박씩 둘). 사용자 지정 코드 진행·가사. 멜로디는 A키(원곡 C의 동요를 A로 옮김, A3 = 57부터 — 사용자 지정: 한 옥타브 낮춤) ──
  const SONG_CH = [['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A'], ['A', 'D'], ['A', 'E'], ['A', 'D'], ['A', 'E'], ['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A']];
  const LY1 = ['반짝반짝', '작은 별', '아름답게', '비치네'], LY2 = ['동쪽 하늘', '에서도', '서쪽 하늘', '에서도'];
  const SONG_LY = LY1.concat(LY2, LY1);
  const M1 = [[57, 1], [57, 1], [64, 1], [64, 1]], M2 = [[66, 1], [66, 1], [64, 2]], M3 = [[62, 1], [62, 1], [61, 1], [61, 1]], M4 = [[59, 1], [59, 1], [57, 2]];
  const M5 = [[64, 1], [64, 1], [62, 1], [62, 1]], M6 = [[61, 1], [61, 1], [59, 2]];
  const SONG_MEL = [M1, M2, M3, M4, M5, M6, M5, M6, M1, M2, M3, M4];   // 마디별 [MIDI, 박 수] — 가사 한 글자 = 한 음
  const SONG_BEATS = SONG_CH.length * 4;
  const NOTES = [];   // { midi, beat(곡 처음부터), len } — 가사 글자 순번과 같은 순서
  SONG_MEL.forEach(function (bar, m) { let b = m * 4; bar.forEach(function (nt) { NOTES.push({ midi: nt[0], beat: b, len: nt[1] }); b += nt[1]; }); });
  function chordAt(b) { return SONG_CH[Math.floor(b / 4)][b % 4 < 2 ? 0 : 1]; }
  // 악보 — 한 줄 4마디씩 3줄(사용자 표기 그대로). 마디 하나 = 버튼(터치하면 그 마디부터 재생). 코드는 칸(2박) 시작 위치, 가사는 마디 시작에 왼쪽 정렬(리하모니 악보와 같은 규칙)
  function scoreHtml() {
    let h = '<div class="n5-sc" id="n5-sc" data-sfx="none">', si = 0;   // data-sfx: 마디 터치에 앱 공통 버튼 효과음(pop)을 내지 않음(사용자 지정 — shared.js _sfxKind)
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
    stage.classList.add('is-jny', 'n3-stage');   // 무대 높이 = 큰 다이어그램 크기에 맞춤(D3와 같음 — 220 / 412px~ 264 / 481px~ 296, §4-40). 두 층 모두 빈 무대에 새로 나타나는 장면이라 밑에서 올라옴(.jl-rise — [에셋 화면 정렬] §4-32)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer jl-rise n4-full" id="n5-trans"><div class="n4-stack"><div class="n4-dz">' + cwrap('t') + '</div><div class="n4-sz n4-rz"><button type="button" class="n4-replay" id="n5-replay" aria-label="다시보기" hidden>' + ICON_REPLAY + '<span>다시보기</span></button></div></div></div>' +   // 다시보기 = D4와 같은 버튼(.n4-replay, 지판 아래 끝 + 32px)
      '<div class="jl-layer jl-rise n4-full n5-song" id="n5-song"><div class="n4-stack"><div class="n4-dz n5-dzs"><div class="n5-trio">' + TRIO.map(function (id) { return '<div class="n5-tc"><canvas data-c="' + id + '"></canvas></div>'; }).join('') + '</div></div><div class="n4-sz">' + scoreHtml() + '</div></div></div>' +
      '</div>';
    snapDiag('t', 'D'); paintTrio();
    $('n5-replay').addEventListener('click', replayRun);
    $('n5-sc').addEventListener('click', function (e) {
      const b = e.target.closest('.n5-m');
      if (b && songLive()) songJump(+b.dataset.m);
    });
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { Object.keys(DIAG).forEach(function (k) { paintDiag(k); }); paintTrio(); fitSz(); });
    }
  }

  // ── 다시보기(2026-11-20 사용자 지정, D4 페이즈 4와 같은 버튼·동작) — 코드 전환 칸(페이즈 2 스텝 2~5)이 끝나 마커가 멈췄을 때만 다이어그램 아래에 나타나 눌러지는 버튼.
  //  코드 전환 애니메이션만 다시 재생(문구·소리 없음). 나타남 = 엔진 settle / 사라짐 = 엔진 onCut(칸 이동·다시 시작·건너뛰기·닫기). 재생 중엔 눌러지지 않음
  const ICON_REPLAY = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  let replaying = null;   // 다시보기 재생 중인 { from, to } — 도중에 칸을 옮기면 도착 코드로 맞춰 둠(다음 칸 전환이 이 코드에서 시작하므로)
  function replayShow(from, to) {
    const b = $('n5-replay');
    if (!b) return;
    b._r = { from: from, to: to };
    b.disabled = false; b.hidden = false;
  }
  function replayHide() {
    const b = $('n5-replay');
    if (!b) return;
    b._r = null; b.disabled = true; b.hidden = true;
  }
  const REPLAY_HOLD_MS = 800;   // 시작 코드를 완성 모양으로 보여 주는 시간
  function replayRun() {
    const b = $('n5-replay'), r = b && b._r;
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
  //  다이어그램은 A·D·E 세 개 고정(전환 없음 — 사용자 지정)
  const BEAT_MS = 60000 / 70;
  const SONG_GUITAR_TRIM = 0.3, SONG_PIANO_GAIN = 1.4;   // 리하모니 강의 작은별과 같은 값(멜로디가 기타에 묻히지 않게)
  let songGen = 0, songTickAt = 0;
  function songLive() { return songTickAt && performance.now() - songTickAt < 2 * BEAT_MS; }   // 재생이 돌고 있는 칸에서만 마디 터치가 먹음("다음"이 타이머를 지우면 멈춤)
  function songMark(b) {   // 지금 박 b의 코드 칸 파랑 + 가사(부른 글자 진하게, 지금 글자 파랑)
    const slot = Math.floor(b / 2);
    q('.n5-ch').forEach(function (el) { el.classList.toggle('is-hot', +el.dataset.s === slot); });
    q('#n5-sc .lec-syl').forEach(function (el) {
      const nt = NOTES[+el.dataset.i];
      el.classList.toggle('is-on', nt.beat <= b && b < nt.beat + nt.len);
      el.classList.toggle('is-sung', nt.beat + nt.len <= b);
    });
  }
  function songClear() {
    setCls(q('.n5-ch'), 'is-hot', false);
    setCls(q('#n5-sc .lec-syl'), 'is-on', false);
    setCls(q('#n5-sc .lec-syl'), 'is-sung', false);
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
      if (gen !== songGen || J.skipping() || !$('n5-song').classList.contains('is-on')) return;
      songLoop(m, 0);
    });
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  const steps = [
    // P1 D코드 — 도입을 이 페이즈 첫 칸에 합침(사용자 지정)
    // 0 핵심: 오늘 목표(코드 하나 더 → 작은 별) → D코드의 운지 모양(점·손가락 번호 xxx231). 끝 화면 = D 다이어그램
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 코드 하나를 더 배워서\n' + em('작은 별') + '을 연주해보도록 할게요!', run: none },
      { text: em('D코드') + '는 이렇게 생긴 코드예요!', scene: 'n5-trans:D', run: function () { return show('n5-trans', function () { snapDiag('t', 'D'); }); } },
      { text: '이제는 손가락 번호가\n익숙해지셨겠죠~?', run: none },
    ]), { ms: 6000 }),
    // 1 핵심: D코드의 소리. 끝 화면 = D 다이어그램 + D 소리
    { text: '소리를 들어봅시다!', ms: 3000, run: function () { ring('D'); return wait(J.leadMs() + 2000); } },

    // P2 코드 전환(A ↔ D, D ↔ E)
    // 2 핵심: 이번 페이즈의 목적 — A↔E에 이어 A↔D, D↔E. 끝 화면 = D 그대로
    { text: 'A와 D, D와 E코드를\n전환해보는 연습도 해볼게요!', run: none },   // 문구 사용자 지정(2026-11-20)
    // 3 핵심: A → D 순서(4번 떼기 → 2·3번 이동 → 1번 놓기 → O·X·이름). 끝 화면 = D + D 소리
    { text: em('A코드') + '에서 ' + em('D코드') + '의 전환은\n이렇게 해주세요', ms: 5000, scene: 'n5-trans:AD', settle: function () { replayShow('A', 'D'); }, run: function () {
      return show('n5-trans', function () { snapDiag('t', 'A'); }).then(function () { return wait(600); }).then(function () { return demoMove('D'); });
    } },
    // 4 핵심: D → A 순서(1번 떼기 → 2·3번 이동 → 4번 놓기 → O·X·이름). 끝 화면 = A + A 소리
    { text: em('D코드') + '에서 ' + em('A코드') + '의 전환은\n이렇게 해주세요', ms: 4000, settle: function () { replayShow('D', 'A'); }, run: function () { return demoMove('A'); } },
    // 5 핵심: D → E 순서(2·3번 이동 + 조금 뒤 1번도 같이 이동 → O·X·이름). 끝 화면 = E + E 소리
    { text: em('D코드') + '에서 ' + em('E코드') + '의 전환은\n이렇게 해주세요', ms: 5000, scene: 'n5-trans:DE', settle: function () { replayShow('D', 'E'); }, run: function () {
      return show('n5-trans', function () { snapDiag('t', 'D'); }).then(function () { return wait(600); }).then(function () { return demoMove('E'); });
    } },
    // 6 핵심: E → D 순서(2·3번 이동 + 조금 뒤 1번도 같이 이동 → O·X·이름). 끝 화면 = D + D 소리
    { text: em('E코드') + '에서 ' + em('D코드') + '의 전환은\n이렇게 해주세요', ms: 4000, settle: function () { replayShow('E', 'D'); }, run: function () { return demoMove('D'); } },

    // P3 작은 별
    // 7 핵심: 악보 읽는 법 — 선 위 코드, 아래 가사, 쓰는 코드 A·D·E는 위에 고정. 끝 화면 = A·D·E 다이어그램 + 악보 12마디
    Object.assign(J.chainSteps([
      { text: '이제 ' + em('작은 별') + '을 연주할 준비가 되었어요!', scene: 'n5-song', run: function () {
        return show('n5-song', function () { songStop(); paintTrio(); });
      } },
      { text: '아래에 작은 별의 코드 악보를 띄워뒀어요\n천천히 따라해볼까요?', run: none },
      // 핵심(새 내용 — D4 강약약약 위에 하나 더): 코드가 바뀌는 박에서 강박을 쓰는 것은 일반적인 선택이고 법칙은 아님(때에 따라 약박도) → 이 곡에서는 강박으로.
      //  악보에서 마디 안 두 번째 코드(앞 코드와 다른 것)를 파랑으로 짚어 줌. 문구는 사용자 지정(2026-11-15). 다음 칸 재생이 songClear로 지움
      { text: '일반적으로 코드가 바뀔 때에도 ' + em('강박') + '을 사용해서\n코드의 전환을 확실히 해요', run: function () {
        setCls(q('.n5-ch').filter(function (el) { const s = +el.dataset.s, m = s >> 1; return s % 2 === 1 && SONG_CH[m][0] !== SONG_CH[m][1]; }), 'is-hot', true);
        return none();
      } },
      { text: '하지만 강세에 명확한 규칙이 있는 것은 아니에요!', run: none },   // 4·5 문구 사용자 지정(2026-11-20)
      { text: '우리는 코드가 바뀔 때 ' + em('강박') + '을\n사용하도록 할게요!', run: none },
    ]), { ms: 5000 }),
    // 8 핵심: 지금 칠 코드(울리는 칸 파랑) — 70bpm 4비트 다운 스트로크로 계속 재생, 마디 터치 = 그 마디부터. 한 마디 뒤 "다음" 켜짐. 끝 화면 = 재생 계속
    { text: '원하는 마디를 터치하면\n그 부분부터 재생할 수 있어요', ms: 4000, run: function () { return songLoop(0, 4); } },
    // 9 핵심: 완주 → 다음 할 일(퀴즈로 코드 암기 + 코드 진행 맞추기 복습, 가이드 §4-12). 끝 화면 = 악보(재생 멈춤)
    Object.assign(J.chainSteps([
      { text: '축하해요! 첫 노래를 완주하셨어요!', enter: songStop, run: none },   // 문구 사용자 지정(2026-11-20)
      { text: '이렇게 코드진행을 보고\n외웠던 코드를 떠올리는 연습을 해주세요!', run: none },
      { text: '이제 퀴즈를 풀면서 새로 배운 것을 복습해봐요!', run: none },
    ]), { ms: 6000 }),
  ];
  const groups = [[0, 1], [2, 3, 4, 5, 6], [7, 8, 9]];

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(퀴즈 paintQ가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
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
    VoicingCanvas.draw(cv, v, { markColors: mc, chordName: chord && name ? chord.name : null, fingerNumMode: !!nums, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true , fretLabelSize: fretLabelSize });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }

  function midisOf(c) { return strokeMidis(c, 'all'); }   // 울리는 줄 6번줄 → 1번줄(D3 midisOf와 같음)

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D4(stroke-basics.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D4와 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-14):
  //     ① pick — 코드 맞추기 2지선다(D3·D4 그대로, 코드에 D 추가): 다이어그램 → 이름 / 이름 → 다이어그램. 보기 = 정답 + 나머지 둘 중 하나
  //     ② fill — A·D·E 다이어그램 빠진 점 찍기(전 노드 공통 규칙 §4-35: 별 1 = 2노트 / 별 2 = 3~4 / 별 3 = 5~6, 개방현 포함, D는 4노트라 최대 4)
  //     ③ prog — 코드 진행 매칭: 작은 별에서 연속 2마디(코드 칸 4개)를 띄우고, 아래 A·D·E 다이어그램(코드 이름·손가락 번호 없음 — 실제 연주처럼
  //        악보의 코드 이름만 보고 지판 모양을 고르게, 사용자 지정)을 순서대로 누름. 누를 때마다 그 칸에 바로 정오 표시, 틀려도 다음 칸으로(되돌리기 없음).
  //        4칸 다 맞아야 정답. 아래 다이어그램 순서는 A·D·E 고정(사용자 지정). 지금 칸 위에 떠 있는 화살표, 카드를 누르면 지금 칸 코드 소리(힌트), 보기를 누르면 누른 코드 소리
  //   문제 수(사용자 지정): 별 1 10 = 3·3·4 / 별 2 15 = 5·4·6 / 별 3 15 = 4·5·6
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:little-star
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10, pick: 3, fill: 3, prog: 4 }, 2: { n: 15, pick: 5, fill: 4, prog: 6 }, 3: { n: 15, pick: 4, fill: 5, prog: 6 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'little-star';
  let qz = null;   // 세션 { star, qs, idx, wrong[], phase: 'main'|'review', rvPos, done, judged, canRetry, paid{}, correct, refunded, short }
  // ── 이어 풀기 — 새로고침·앱 종료·백그라운드 뒤에도 하던 퀴즈를 그 문제부터. 문제(순서·보기·짝)·진행·틀린 목록·피크 지불 기록을 이 기기에 저장 ──
  //  X → '그만할래요'로 직접 나갔을 때와 완주했을 때만 지움. 저장분의 별이 지금 풀 별과 다르면 버림
  const SESS_KEY = 'jnyQuizSess:' + NODE_ID;   // 노드마다 따로(D1 저장분을 덮지 않게)
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


  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 보기·순서·채울 점도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  const QZ_CHORDS = ['A', 'D', 'E'];
  // 스피커 아이콘 — 루시드 volume-2와 같은 도형(리하모니 .combo-v2-speaker — 마지막 두 path가 파동 애니메이션)
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  function balanced(n) { const o = rnd(3), a = []; for (let k = 0; k < n; k++) a.push(QZ_CHORDS[(k + o) % 3]); return shuffle(a); }   // A·D·E 고르게(나머지는 무작위 시작점에서)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const pc = balanced(cfg.pick), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) {
      const other = shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k]; }))[0];
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k], other]), answer: pc[k] });
    }
    const fc = balanced(cfg.fill);
    const miss = fillMiss(star, cfg.fill), used = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = 5~6)
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], used, fc));
    // ③ 코드 진행 — 작은 별 연속 2마디(시작 마디 0~10, 한 퀴즈 안에서는 되도록 겹치지 않게), 아래 다이어그램 순서 섞음
    const starts = shuffle(Array.from({ length: SONG_CH.length - 1 }, function (_, k) { return k; }));
    for (let k = 0; k < cfg.prog; k++) {
      const m = starts[k % starts.length];
      qs.push({ type: 'prog', bar: m, seq: SONG_CH[m].concat(SONG_CH[m + 1]), choices: QZ_CHORDS.slice() });   // 아래 다이어그램 순서 A·D·E 고정(사용자 지정)
    }
    // 순서 — 유형은 섞되, 점 찍기는 채울 점이 적은 문제부터 많은 문제 순으로(D3 규칙). 같은 점 수끼리는 섞인 순서 유지
    const mixed = shuffle(qs), fills = mixed.filter(function (q) { return q.type === 'fill'; });
    fills.forEach(function (q, i) { q._i = i; });
    fills.sort(function (x, y) { return x.ans.length - y.ans.length || x._i - y._i; });
    fills.forEach(function (q) { delete q._i; });
    let fi = 0;
    return J.noRepeat(mixed.map(function (q) { return q.type === 'fill' ? fills[fi++] : q; }), function (q) { return q.type === 'fill' ? q.ans.length : null; });   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통). 점 찍기의 쉬운 것부터 순서는 지킴
  }
  // 점 찍기 — given = 이미 찍혀 있는 손가락 번호들, ans = 빠진 점 자리 '줄-프렛'(줄 1~6)
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
  // 퀴즈 다이어그램 — 강의와 같은 paint(코드 사전 그리기). given = 찍혀 보일 손가락 번호들(손가락 번호는 보임(사용자 지정), 코드명은 숨김 — 정답이 보이지 않게)
  const QD_W = 300;   // 점 찍기 다이어그램 폭(최대) — 높이 240px
  function paintQ(cv, chord, given, w, givenOpen) {   // givenOpen = 이미 보이는 개방현 줄(1~6). 생략하면(보기 그림·옛 저장 세션) 개방현 O는 전부 보임
    const hide = givenOpen ? chord.frets.map(function (f, s) { return f === 0 && givenOpen.indexOf(s + 1) < 0 ? s : -1; }).filter(function (s) { return s >= 0; }) : null;
    paint(cv, Object.assign({}, chord, { order: given }), given.length, true, false, w, null, undefined, hide);
  }
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
  //  pick = 코드 맞추기 문제 화면 템플릿(문제 카드 .ms-quiz-question-card + 말풍선 + 2개 .ms-quiz-choice-card, 보기는 이름 글자 또는 다이어그램 canvas-slot) — 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  fill = 안내 카드 + 다이어그램(빠진 점을 눌러 찍기) + 제출하기
  const QZ_TITLES = { pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요', prog: '알맞은 답을 고르세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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
    fillSel = {};
    $('jq-title').textContent = QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'pick' && it.variant === 'd2n') {   // 다이어그램을 보고 이름 고르기
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard jq-qcard--diag">' + diagCard(it.chord) + '<span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 이름을 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div></div>';
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], chords()[it.chord].order, Math.min(box.clientWidth - 64, 240));
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'pick') {   // 이름을 보고 다이어그램 고르기
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">코드 이름</span><span class="ms-quiz-question-name">' + it.chord + '</span><span class="jq-qask">' + TOUCH_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '"><div class="ms-quiz-choice-canvas-slot">' + diagCard(c) + '</div></div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n3q-cv').forEach(function (cv) {
        const c = chords()[cv.dataset.chord];
        paintQ(cv, c, c.order, Math.max(60, Math.floor(cv.parentNode.clientWidth)));
      });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'prog') {   // 코드 진행 — 위 = 2마디 악보(코드 이름만, 지금 누를 칸 파랑), 아래 = A·D·E 다이어그램 3개(이름·손가락 번호 없음)
      progSel = [];
      let sc = '<div class="lec6-row n5q-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i><i class="lec6-bar n5-mb" style="--k:2"></i>';
      it.seq.forEach(function (c, k) { sc += '<span class="n5q-ch' + (k === 0 ? ' is-cur' : '') + '" style="--k:' + k + '">' + c + '</span>'; });
      // 문제 카드 — 좌상단 스피커(리하모니 설명 카드 .combo-v2-speaker와 같은 아이콘·파동). 카드 아무 곳이나 누르면 지금 맞춰야 할 코드 소리(힌트 — 사용자 지정)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard n5q-card n5q-pcard"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button>' +
        '<span class="jq-qsub">주어진 코드진행 순서대로 클릭하세요!</span><div class="n5q-sc">' + sc + '</div></div><span class="jq-qask n5q-hint">터치하면 현재 코드를 들을 수 있어요!</span></div>' +   // 위 = 문제 안내, 아래 = 힌트 소리 안내(사용자 지정)
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag n5q-choices n5q-pchoices">' +   // 말풍선 — 코드 맞추기·4지선다와 같은 자리·문구 / n5q-p*: 문제 카드·보기 카드를 키움(사용자 지정 2026-11-15, D5·D6·D8 공통 — 남는 세로 공간, 보기 번호가 다이어그램을 가림)
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
    } else {   // 점 찍기
      box.innerHTML = infoCard(it.chord + '코드의', '빠진 점을', '찍어주세요') +
        '<div class="jq-board"><div class="n3q-wrap" id="n3q-wrap">' + diagCard(it.chord) + '<div class="n3q-dots" id="n3q-dots"></div></div></div>';
      const w = Math.min(box.clientWidth, QD_W);
      $('n3q-wrap').style.width = w + 'px';
      $('n3q-wrap').style.setProperty('--n3q-w', w + 'px');
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], it.given, w, it.givenOpen);
      $('n3q-wrap').addEventListener('click', fillTap);
      fillDots();   // 오답풀이면 앞서 맞힌 점을 정답색으로
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
  // ── 점 찍기 — 다이어그램의 칸(1~4프렛 × 6줄)을 누르면 점 + 그 자리 소리, 같은 자리를 다시 누르면 지움. 한 줄에는 점 하나(다른 프렛을 누르면 옮겨 감).
  //  이미 찍혀 있는 줄은 건드릴 수 없음. 칸 위치는 voicing-canvas.js 기준 치수(기준 폭 440×352): 프렛 칸 폭 60·시작 x 105 / 줄 간격 38.4·1번줄 y 80 / 점 지름 36.48(= 폭의 8.29%)
  let fillSel = {};   // 줄(1~6) → 찍은 프렛
  function givenStrings(it) { const c = chords()[it.chord], o = {}; it.given.forEach(function (n) { o[fingerIdx(c, n) + 1] = true; }); (it.givenOpen || []).forEach(function (st) { o[st] = true; }); return o; }
  function fillPos(e) {
    const r = $('n3q-wrap').querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const f = bx < QD.x0 ? (bx >= QD.x0 - 70 ? 0 : -1) : Math.floor((bx - QD.x0) / QD.fw) + 1, s = Math.round((by - QD.y0) / QD.sh) + 1;   // 너트 왼쪽 개방현 칸(70px) = 프렛 0
    return f < 0 || f > VoicingCanvas.FRETS || s < 1 || s > 6 ? null : [s, f];
  }
  function dotHtml(s, f, cls, label) {
    return '<span class="n3q-dot ' + cls + (f === 0 ? ' is-open' : '') + '" style="left:' + (f === 0 ? QD.x0 - 35 : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%;top:' + (QD.y0 + (s - 1) * QD.sh) / VoicingCanvas.BASE_H * 100 + '%;width:' + QD.dot * (f === 0 ? 1.05 : 1) / VoicingCanvas.BASE_W * 100 + '%">' + (label || '') + '</span>';
  }
  function fillDots() {
    $('n3q-dots').innerHTML = keptHtml(cur()) + Object.keys(fillSel).map(function (s) { return dotHtml(+s, fillSel[s], ''); }).join('');
  }
  // 오답풀이 — 앞서 맞힌 점(본 문제·앞선 다시 풀기)은 정답색으로 남겨 두고 다시 누를 수 없게, 나머지 자리만 찍게 함(사용자 지정 2026-11-21 — CLAUDE.md 0-8 '틀린 그 지점에서 교정')
  function fillKept(it) { return qz && qz.phase === 'review' && it.kept ? it.kept : []; }
  function keptStrings(it) { const o = {}; fillKept(it).forEach(function (k) { o[k.split('-')[0]] = true; }); return o; }
  function keptHtml(it) { const fing = chords()[it.chord].fing; return fillKept(it).map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', fing[sf[0] - 1]); }).join(''); }
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
    const fing = chords()[it.chord].fing;   // 채점 뒤엔 정답 자리(맞은 점·못 찾은 자리)에 손가락 번호도 보여 줌
    let h = kept.map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', fing[sf[0] - 1]); }).join('');
    picked.forEach(function (k) { const sf = k.split('-'), hit = it.ans.indexOf(k) >= 0; h += dotHtml(+sf[0], +sf[1], hit ? 'is-ok' : 'is-ng', hit ? fing[sf[0] - 1] : ''); });
    it.ans.forEach(function (k) { if (picked.indexOf(k) < 0 && kept.indexOf(k) < 0) { const sf = k.split('-'); h += dotHtml(+sf[0], +sf[1], 'is-miss', fing[sf[0] - 1]); } });
    $('n3q-dots').innerHTML = h;
    verdict(ok);
  }

  // 채점 — 본 문제는 맞든 틀리든 한 칸 진행(틀리면 오답풀이 몫이 전체에 더해짐), 오답풀이는 맞혔을 때만 한 칸.
  //  delay: 정답·오답음과 게이지를 이만큼 늦춤(찾아 누르기 — 누른 자리 소리가 먼저). 버튼은 그 순간 함께
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
    if (!qz.judged) {   // 제출하기
      if (cur().type === 'fill' && Object.keys(fillSel).length) fillJudge();
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
    $('combo-v2-clear-level').textContent = '작은 별 연주하기 · 퀴즈 ' + qz.star;
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
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    clearTimeout(autoTimer); autoTimer = null;
    chordGen++;   // 백그라운드 — 늦게 도착하는 코드 소리 취소
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });



  J.register('little-star', { onCut: stageCut, layers: ['n5-trans', 'n5-song'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 9, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 9 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
