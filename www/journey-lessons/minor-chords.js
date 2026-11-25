// ───────────────────────────────────────────────────────────
// 여정 노드: 마이너 코드 학습하기 (코드반주 D7)
//   D6(cg-chords.js)를 복사해 내용만 바꿈(2026-11-15 사용자 기획). 설명 단계 + 퀴즈.
//   목적: Am·Dm·Em 세 마이너 코드를 이미 아는 A·D·E와의 차이로 익히고 외운다(사용자 지정)
//   흐름: A → Am(2·3번 그대로, 4번 떼고 1번으로 2번줄 1프렛) → D → Dm(1번만 1번줄 2프렛 → 1프렛) → E → Em(1번만 뗌)
//         쌍마다 [장조 모양 + 소리] → [바뀌는 점만 파랑으로 옮김 + 마이너 소리] → [두 소리 비교] → 정리(세 쌍 모두 한 음만 반음 낮아짐)
//   운지(사용자 지정) Am xx231x / Dm xxx231 / Em x23xxx = 코드 사전 기본 운지와 같음
//   노래 연습·코드 전환 시연은 없음. 에셋·도구는 D4~D6과 같음(CSS .n4-* · .n5-* 공용) + 이 노드 전용 .n7-*(바뀌는 점 파랑·정리 고리). 층·요소 id는 n7-*
//   코드 전환 문구에는 '위·아래' 같은 방향 말을 쓰지 않는다(가이드 §4-25)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — D5와 같음(E·A·D) + Am·Dm·Em(코드 사전 기본 운지 = 사용자 지정 운지 그대로). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄
  function pick(name) {   // 사전은 근음(A·D·E)별 목록 — 마이너도 같은 근음 목록 안에 이름(Am 등)으로 들어 있음
    return window.chordsLibrary[name.charAt(0)].filter(function (e) { return e.name === name && e.source === 'static' && e.slotFret === 2; })[0];
  }
  function mk(name, fing) {
    const e = pick(name);
    const f = fing || e.fingerings[0];
    const nums = f.filter(function (x) { return x; }).sort();
    return { name: e.name, entry: e, frets: e.frets, fing: f, order: nums };
  }
  let CHORDS = null;
  function chords() {
    if (!CHORDS) CHORDS = { E: mk('E'), A: mk('A', [null, 4, 3, 2, null, null]), D: mk('D', [1, 3, 2, null, null, null]),
      Am: mk('Am'), Dm: mk('Dm'), Em: mk('Em') };   // Am xx231x / Dm xxx231 / Em x23xxx — 사전 기본 운지(fingerings[0])가 사용자 지정과 같음
    return CHORDS;
  }
  const PAIRS = [['A', 'Am'], ['D', 'Dm'], ['E', 'Em']];   // 강의 순서(사용자 지정 순서 Am → Dm → Em)
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }

  // ── 소리 — 줄 선택: 'all' 6→1번줄 / 'w4' 1~4번줄(D4와 같음: 다운 강세 = 모든 줄, 약세 = 1~4번줄). 안 울리는 줄(X)은 뺌 ──
  function strokeMidis(c, kind) {
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  function ring(id) { J.strum(strokeMidis(chords()[id], 'all'), J.audioT0(), 2.2, 1.0); }   // 코드 소리 한 번(길게)

  // ── 다이어그램 — 't' 전환 층(큰 것, 점 4개는 DOM으로 캔버스 위에 겹침 — D4와 같음). 정리 층은 Am·Dm·Em 세 개를 나란히(점까지 캔버스에 그림 — D5 작은 별 층과 같은 배치) ──
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };   // voicing-canvas.js 기준 치수(440×352)
  const DIAG = { t: { cv: 'n7-ct', wrap: 'n7-cwt', dots: 'n7-dtt', id: null } };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  // 위 영역 높이(CSS .n4-dz와 같은 값 — D4 CSS 공용, 정리 층도 160) — 다이어그램은 지판 아래 끝이 이 높이 안에 들어오는 최대 크기, 지판 가운데가 영역 가운데(D4 §4-22)
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = { t: 160 };
  function dw(k) {
    const sw = stageW(), B = VoicingCanvas;
    return Math.max(100, Math.min(sw * B.BASE_W / (2 * HALF_SPAN), DZ_H[k] * B.BASE_W / FB_BOTTOM));
  }
  // 캔버스 하나에 그리기 — c = 코드(null이면 지판만: 점·O·X·이름 없음). full = 점(손가락 번호)까지 캔버스에 그림(정리 층), 아니면 점은 DOM이라 안 그림
  function drawV(cv, c, w, full, colors, marks) {   // colors = 줄별 점 색(VoicingCanvas dotColors — 점 자체를 칠함), marks = 줄별 O·X 표시 색(markColors — 개방현 O 강조, D3와 같은 방식)
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f) { return f > 0 && !full ? null : f; }) : [null, null, null, null, null, null],
      openMute: c ? e.openMute : [null, null, null, null, null, null], barre: {}, barreRange: null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c ? c.fing : [null, null, null, null, null, null],
    }, { chordName: c ? c.name : null, fingerNumMode: true, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, dotColors: colors || null, markColors: marks || null });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  // 래퍼 = 캔버스 3장 겹침: 지판만(.n4-base) / 지금 코드 / 바뀔 때 잠깐 쓰는 이전 코드(.n4-old) — D4와 같음
  function paintDiag(k, id) {
    const d = DIAG[k], cv = $(d.cv);
    if (id !== undefined) d.id = id;
    if (!cv || !d.id) return;
    const c = chords()[d.id], w = dw(k), box = $(d.wrap);
    drawV(box.querySelector('.n4-base'), null, w);
    drawV(cv, c, w);
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
    els.forEach(function (el) { el.classList.add('is-snap'); el.classList.remove('n7-hot'); });
    putChordDots(k, id);
    els.forEach(function (el) { void el.offsetWidth; el.classList.remove('is-snap'); });
  }
  function snapDiag(k, id) { paintDiag(k, id); snapChordDots(k, id); }
  // 장조 → 마이너 — 자리가 바뀌는 손가락(D → Dm의 1번)이 먼저(lead), 떼는·놓는 손가락(A → Am의 4번 떼기·1번 놓기, E → Em의 1번 떼기)이 그다음(swap). 개방현·뮤트·코드 이름은 항상 마지막(fadeDiag)
  //  D6 C ↔ G 순서 도구를 그대로 씀. 자리가 그대로인 손가락(2·3번)은 움직이지 않으므로 lead에서 뺌(빈 기다림이 생기지 않게)
  //   sc = 시간 배율. 돌려주는 값 = 끝날 때까지 걸리는 시간(ms)
  const SEQ_GAP = { lead: 250, swap: 400 };   // lead = 자리 이동 출발 → 떼기·놓기 출발 / swap = 떼기·놓기 출발 → 마무리
  function seqMove(k, to, sc) {
    sc = sc || 1;
    $(DIAG[k].wrap).style.setProperty('--n4-sp', sc);   // 점 이동·나타남 전환 시간도 같은 배율(CSS .n4-dot)
    const from = chords()[DIAG[k].id], dest = chords()[to];
    const uses = function (c, n) { return fingerIdx(c, n) >= 0; };
    const F = [1, 2, 3, 4];
    const move = F.filter(function (n) { const a = fingerIdx(from, n), b = fingerIdx(dest, n); return a >= 0 && b >= 0 && (a !== b || from.frets[a] !== dest.frets[b]); });
    const swapF = F.filter(function (n) { return uses(from, n) !== uses(dest, n); });   // 떼는 손가락 + 놓는 손가락(같은 순간)
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
  // 바뀌는 손가락 — 장조와 마이너를 비교해 자리가 다르거나 한쪽에만 있는 손가락 번호
  function diffF(a, b) {
    const A = chords()[a], B = chords()[b];
    return [1, 2, 3, 4].filter(function (n) { const x = fingerIdx(A, n), y = fingerIdx(B, n); return x !== y || (x >= 0 && A.frets[x] !== B.frets[y]); });
  }
  function hotOn(maj, min) { diffF(maj, min).forEach(function (n) { const el = dotEl('t', n); if (el) el.classList.add('n7-hot'); }); }
  // 장조 → 마이너 한 번(핵심 칸) — 바뀌는 손가락만 파랑 → 잠깐 뒤 옮김(새로 놓이는 손가락도 파랑) → 마이너 소리
  const HOT_LEAD_MS = 700;   // 파랑으로 짚어 준 뒤 움직이기까지
  function morph(maj, min) {
    snapDiag('t', maj);
    hotOn(maj, min);
    return wait(HOT_LEAD_MS).then(function () {
      const ms = seqMove('t', min);
      later(function () { ring(min); }, ms);
      return wait(ms + J.leadMs() + 2000);
    });
  }
  // 소리 비교 칸(2026-11-20 사용자 지정) — 장조·마이너 다이어그램 두 개를 나란히 동시에 띄우고(층 n7-cmp), 터치하면 그 코드 소리.
  //  배치 = 가이드 §4-40 '가로로 둘'(눈에 보이는 간격 44px, 폭 상한 245px, D3 .n3-two 재사용)
  //  강조(2026-11-20 사용자 지정, §4-27 점 자체를 칠함): 칸 처음엔 강조 없음 → 소리가 울리는 동안 그 코드의 누르는 점 전체 파랑('full')
  //   → 시범이 끝나면 두 다이어그램 모두 3음(바뀌는 음, 같은 줄)만 파랑('hot'). 터치해서 울릴 때도 울리는 동안 그 코드 점 전체 파랑, 끝나면 다시 3음
  //  칸 시작 시범 = 장조 소리 → 마이너 소리. 그 뒤로는 학습자가 눌러서 비교
  const CMP_PAD = 130 / 440, CMP_SEE = 44, CMP_MAX = 245;
  const RING_HOLD_MS = 2200;   // 코드 소리 한 번이 울리는 동안(강조 유지 시간 = 소리 시작 지연 + 이 값)
  let cmpPair = null, cmpSt = ['none', 'none'], cmpRest = 'none';   // cmpRest = 소리가 끝났을 때 돌아갈 강조(시범 전 'none', 시범 뒤 'hot')
  function paintCmp(maj, min) {
    if (maj) cmpPair = [maj, min];
    if (!cmpPair) return;
    const w = Math.max(120, Math.min(CMP_MAX, (stageW() - CMP_SEE) / (2 - CMP_PAD)));
    const row = $('n7-cmp-row'), blue = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff';
    row.style.setProperty('--n3-two-gap', Math.round((CMP_SEE - w * CMP_PAD) * 10) / 10 + 'px');
    row.querySelectorAll('canvas').forEach(function (cv, i) {
      const id = cmpPair[i], c = chords()[id], col = [null, null, null, null, null, null], mk = [null, null, null, null, null, null];
      if (cmpSt[i] === 'full') c.frets.forEach(function (f, s) { if (f > 0) col[s] = blue; else if (f === 0) mk[s] = blue; });   // 울리는 줄 전체 — 누르는 점은 점 색, 개방현 O는 O 색만 파랑(사용자 지정 2026-11-21). 뮤트 X는 안 울리므로 그대로
      else if (cmpSt[i] === 'hot') col[HOT_STR[cmpPair[1]]] = blue;
      cv.dataset.c = id;
      cv.setAttribute('aria-label', id + ' 소리 듣기');
      drawV(cv, c, w, true, col, mk);
    });
  }
  function cmpSet(a, b) { cmpSt = [a, b]; paintCmp(); }
  // i번(0 = 장조, 1 = 마이너) 코드를 울리고, 울리는 동안 그 코드 전체 강조 → 끝나면 cmpRest로. 더 새로운 소리가 시작됐으면 되돌리지 않음(세대 번호 tapGen)
  let tapGen = 0;
  function cmpRing(i, tap) {   // tap = 학습자 터치(앱 공통 코드 터치 재생 playChord), 아니면 시범(강의 엔진 ring)
    const gen = ++tapGen;
    cmpSet(i === 0 ? 'full' : cmpRest, i === 1 ? 'full' : cmpRest);
    if (tap) playChord(cmpPair[i]); else ring(cmpPair[i]);
    later(function () { if (gen === tapGen) cmpSet(cmpRest, cmpRest); }, J.leadMs() + RING_HOLD_MS);
    return gen;
  }
  function cmpOn() { const ly = $('n7-cmp'); return !!ly && ly.classList.contains('is-on'); }
  // 터치 소리 — 앱에 이미 있는 코드 터치 재생을 그대로 씀(사용자 지정 2026-11-21 — 별도 재생 로직 금지): 이 파일 퀴즈의 playChord
  //  = 코드 맞추기·코드 사전과 같은 GuitarAudio.strumNotes(울리던 코드 음을 놓고 누른 순간 바로 새로 스트럼, 줄 사이 0.008초)
  let tapped = false;   // 이 칸에서 터치 소리를 냈는지 — 칸이 바뀔 때 끊기(strumNotes는 엔진 J.strum 경로가 아니라 엔진이 모를 수 있음)
  function tapRing(id) {
    if (!id || J.skipping() || !cmpOn() || !cmpPair) return;
    tapped = true;
    cmpRing(cmpPair.indexOf(id), true);
  }
  function compare(maj, min) {
    cmpRest = 'none'; cmpSt = ['none', 'none'];
    return show('n7-cmp', function () { paintCmp(maj, min); }).then(function () {
      const gen = cmpRing(0);
      return wait(J.leadMs() + RING_HOLD_MS).then(function () {
        if (gen !== tapGen) { cmpRest = 'hot'; return; }   // 시범 중에 학습자가 먼저 눌렀으면 시범은 그만(누른 소리가 끝나면 3음 강조)
        const g2 = cmpRing(1);
        return wait(J.leadMs() + RING_HOLD_MS).then(function () { cmpRest = 'hot'; if (g2 === tapGen) cmpSet('hot', 'hot'); });
      });
    });
  }
  // 엔진 onCut(칸 이동·다시 시작·건너뛰기·닫기) — 강조 되돌리기 예약을 무효로 + 터치 소리를 냈으면 퀴즈와 같은 하드컷(stopSound = panic, CLAUDE.md 0-7). 멱등
  function stageCut() { tapGen++; if (tapped) { tapped = false; stopSound(); } }

  // 정리 층 — Am·Dm·Em 세 칸(무대 폭 3등분), 칸마다 지판 가운데를 칸 가운데에(D5 작은 별 층 paintTrio와 같은 배치). 크기 = 칸에 O·X까지 들어가고 지판 아래 끝이 위 영역(160px) 안에 들어오는 최대
  //  강조 = 반음 낮아진 음의 점 자체를 파랑으로 칠함(테두리 고리·덮는 원 금지 — 사용자 지정 2026-11-17): Am 2번줄 1프렛 · Dm 1번줄 1프렛 · Em 3번줄 개방현(O 대신 파랑 점).
  //   예전엔 Em에 손가락을 뗀 빈자리(3번줄 1프렛)에 고리를 그렸는데, 빈자리는 칠할 점이 없어 실제로 낮아진 음(개방현 G)을 칠함
  const HOT_STR = { Am: 1, Dm: 0, Em: 2 };   // 줄(0 = 1번줄)
  let trioHot = false;
  function paintTrio(hot) {
    if (hot !== undefined) trioHot = hot;
    const blue = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff';
    const B = VoicingCanvas, w = Math.max(80, Math.min(stageW() / 3 * B.BASE_W / (2 * HALF_SPAN), DZ_H.t * B.BASE_W / FB_BOTTOM));
    q('#n7-sum canvas').forEach(function (cv) {
      const id = cv.dataset && cv.dataset.c, col = [null, null, null, null, null, null];
      if (trioHot && HOT_STR[id] != null) col[HOT_STR[id]] = blue;
      drawV(cv, chords()[id], w, true, col);
      cv.style.marginLeft = -(FB_CX / B.BASE_W * w) + 'px';
    });
  }

  function dotsHtml() { return [1, 2, 3, 4].map(function (n) { return '<span class="n4-dot" data-f="' + n + '" style="width:' + QD.dot / VoicingCanvas.BASE_W * 100 + '%">' + n + '</span>'; }).join(''); }
  function cwrap(k) { const d = DIAG[k]; return '<div class="n4-cw" id="' + d.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + d.cv + '"></canvas><canvas class="n4-old"></canvas><div class="n4-dots" id="' + d.dots + '">' + dotsHtml() + '</div></div>'; }

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');   // 무대·문구 위치는 다른 노드와 같음(220px, 본문 가운데 정렬)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer n4-full" id="n7-trans"><div class="n4-stack"><div class="n4-dz">' + cwrap('t') + '</div></div></div>' +
      '<div class="jl-layer n4-full" id="n7-sum"><div class="n4-stack"><div class="n4-dz"><div class="n5-trio">' + PAIRS.map(function (p) { return '<div class="n5-tc"><canvas data-c="' + p[1] + '"></canvas></div>'; }).join('') + '</div></div></div></div>' +
      '<div class="jl-layer jl-rise" id="n7-names"><div class="n7-names"><div class="n7-nrow"><span>C</span><span>D</span><span>E</span><span>G</span><span>A</span></div><div class="n7-nrow"><span>Dm</span><span>Em</span><span>Am</span></div></div></div>' +   // 배운 코드 이름(텍스트만, 사용자 지정 2026-11-21)
      '<div class="jl-layer jl-rise" id="n7-cmp"><div class="n3-two n7-cmp" id="n7-cmp-row" data-sfx="none"><canvas role="button"></canvas><canvas role="button"></canvas></div></div>' +   // 소리 비교 — 두 다이어그램 나란히, 터치 = 소리(앱 공통 버튼 효과음은 안 냄)
      '</div>';
    snapDiag('t', 'A'); paintTrio();
    $('n7-cmp-row').addEventListener('click', function (e) { const cv = e.target.closest('canvas'); if (cv) tapRing(cv.dataset.c); });
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { Object.keys(DIAG).forEach(function (k) { paintDiag(k); }); paintTrio(); paintCmp(); });
    }
  }

  // ── 화면 도구(D4와 같음) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function show(id, prepare) {
    if (prepare) prepare();
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }

  function hotOff() { q('.n7-hot').forEach(function (el) { el.classList.remove('n7-hot'); }); }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  //  강의 최종 목적: Am·Dm·Em 운지를, 이미 아는 A·D·E에서 바뀌는 한 곳으로 외운다(+ 한 음 차이로 소리의 느낌이 달라짐)
  //  코드 소리는 모양을 처음 보여 주는 순간 함께(D6부터 규칙). 3·6·9 소리 비교 칸은 '한 음 차이로 느낌이 달라지는 것'이 새 내용이라 둠(사용자 승인 2026-11-15)
  function majStep(maj, text) {   // 장조 모양 + 소리(복습). 끝 화면 = 장조
    return { text: text, ms: 2620, scene: 'n7-trans:' + maj, run: function () { return show('n7-trans', function () { snapDiag('t', maj); }).then(function () { ring(maj); return wait(J.leadMs() + 2000); }); } };
  }
  const steps = [
    // P1 마이너 코드 · A → Am
    // 0 핵심(새 내용): 오늘 목표(마이너 코드 3개) + 이름 규칙(뒤에 m). 끝 화면 = 빈 무대
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 ' + em('마이너 코드') + ' 3개를\n배워볼게요!', run: none },
      { text: '코드 이름 뒤에 ' + em('m') + '이 붙으면\n마이너 코드라고 불러요', run: none },
    ]), { ms: 5000 }),
    // 1 핵심(복습 + 새 이름): 이미 아는 A코드 모양 + 소리 → A = A메이저를 줄인 말. 끝 화면 = A. 문구 사용자 지정(2026-11-20)
    Object.assign(J.chainSteps([
      Object.assign(majStep('A', '먼저 A코드를 잡아볼게요!'), { ms: undefined }),
      { text: 'A코드는 사실 ' + em('A메이저(AM)') + '코드를 줄인 말이에요', run: none },
    ]), { ms: 6380 }),   // 실측(scripts/journey-lesson-timing.js)
    // 2 핵심(새 내용): A와 Am의 차이 — 2·3번 그대로, 4번 떼고 1번으로 2번줄 1프렛(바뀌는 점만 파랑). 끝 화면 = Am(파랑 유지) + Am 소리.
    //  문구 사용자 지정(2026-11-20) — 3번째 문구('잡으면...')에서 애니메이션 재생
    Object.assign(J.chainSteps([
      { text: 'A메이저 코드를 시작으로\n' + em('Am') + ' 코드를 만들어 볼게요!', run: none },
      { text: em('2번, 3번 손가락') + '은 그대로 두고', run: none },
      { text: '1번 손가락으로 ' + em('2번줄 1프렛') + '을 잡으면...', run: function () { return morph('A', 'Am'); } },
      { text: 'Am코드가 완성됩니다!', run: none },
    ]), { ms: 12660 }),   // 실측
    // 3 핵심(새 내용): A 소리 → Am 소리를 직접 눌러 비교. 터치 안내에서 칸이 끝나 멈춤 — 학습자가 눌러 볼 시간(2026-11-20 사용자 지정: 소리의 느낌 설명은 다음 칸으로 분리). 끝 화면 = A·Am 나란히(3음 강조)
    Object.assign(J.chainSteps([
      { text: '두 코드의 소리를 비교해볼까요~?', scene: 'n7-cmp:A', run: function () { return compare('A', 'Am'); } },
      { text: '다이어그램을 터치하면\n소리를 다시 들어볼 수 있어요!', run: none },   // 터치 안내(2026-11-20 사용자 요청 — 문구는 Claude 초안)
    ]), { ms: 9000 }),   // 실측(scripts/journey-lesson-timing.js)
    // 4 핵심(새 내용): 한 음 차이로 소리의 느낌이 달라짐. 끝 화면 = 그대로
    //  2026-11-20 사용자 지정: 보통 메이저 = 밝은 / 마이너 = 어두운 느낌이라고 말하되, 코드진행의 맥락에 따라 언제든 달라질 수 있다고 덧붙임(예전엔 형용사를 쓰지 않았음)
    Object.assign(J.chainSteps([
      { text: '딱 ' + em('한 개의 음') + '만 바뀌었는데도\n소리의 느낌이 확 달라지죠?', run: none },
      { text: '보통 메이저코드는 ' + em('밝은') + '느낌을\n마이너코드는 ' + em('어두운') + '느낌을 줘요', run: none },
      { text: '하지만 코드진행의 맥락에 따라\n느낌은 언제든지 달라질 수 있어요!', run: none },
    ]), { ms: 11200 }),   // 실측

    // P2 D → Dm
    // 4 핵심(복습): D코드 모양 + 소리. 끝 화면 = D
    majStep('D', '이번엔 ' + em('D코드') + '예요'),
    // 5 핵심(새 내용): D와 Dm의 차이 — 손가락은 그대로, 1번만 1번줄 2프렛 → 1프렛. 끝 화면 = Dm + Dm 소리
    //  문구 나눔(2026-11-21 사용자 지정 — 페이즈1 스텝3처럼 3줄 문구를 나누고, '옮기면...'에서 애니메이션)
    Object.assign(J.chainSteps([
      { text: '2, 3번 손가락은 그대로 두고', run: none },
      { text: em('1번 손가락') + '만 ' + em('1번줄 1프렛') + '으로 옮기면...', run: function () { return morph('D', 'Dm'); } },
      { text: em('Dm') + '코드가 완성됩니다!', run: none },
    ]), { ms: 8630 }),   // 실측
    // 6 핵심: D 소리 → Dm 소리. 끝 화면 = Dm
    { text: em('D코드') + '와 ' + em('Dm코드') + '를 터치해서\n소리도 비교해보세요', ms: 6000, scene: 'n7-cmp:D', run: function () { return compare('D', 'Dm'); } },

    // P3 E → Em
    // 7 핵심(복습): E코드 모양 + 소리. 끝 화면 = E
    majStep('E', '마지막으로 ' + em('E코드') + '예요'),
    // 8 핵심(새 내용): E와 Em의 차이 — 1번 손가락만 뗌. 끝 화면 = Em + Em 소리
    //  문구 나눔(2026-11-21 사용자 지정 — 페이즈1 스텝3처럼 '떼면...'에서 애니메이션, 결과는 다음 문구)
    Object.assign(J.chainSteps([
      { text: '2, 3번 손가락은 그대로 두고', run: none },   // 페이즈2와 같은 구성(2026-11-21 사용자 지정)
      { text: em('1번 손가락') + '만 떼면...', run: function () { return morph('E', 'Em'); } },
      { text: em('Em') + '코드가 완성됩니다!', run: none },
    ]), { ms: 8780 }),   // 실측
    // 9 핵심: E 소리 → Em 소리. 끝 화면 = Em
    { text: em('E코드') + '와 ' + em('Em코드') + '를 터치해서\n소리도 비교해보세요', ms: 6000, scene: 'n7-cmp:E', run: function () { return compare('E', 'Em'); } },

    // P4 정리
    // 10 핵심(정리): 메이저와 마이너의 차이 = 음 1개 → 암기 요령. Am·Dm·Em 나란히 + 바뀐 음 파랑. 문구 사용자 지정(2026-11-21)
    Object.assign(J.chainSteps([
      { text: '메이저와 마이너코드의 차이는\n' + em('음 1개') + '차이예요!', scene: 'n7-sum', run: function () {
        return show('n7-sum', function () { hotOff(); paintTrio(false); }).then(function () { paintTrio(true); return wait(1200); });   // 나타난 뒤 반음 낮아진 음의 점이 파랑으로
      } },
      { text: '이 점을 기억하면 헷갈리지 않고\n코드 암기를 할 때 도움이 될 거예요', run: none },
    ]), { ms: 4000 }),
    // 11 핵심: 다음 할 일 — 배운 코드 이름만 텍스트로 두 줄(위 C D E G A / 아래 Dm Em Am) + 퀴즈로 복습. 문구·화면 사용자 지정(2026-11-21)
    Object.assign(J.chainSteps([
      { text: '이제 배운 코드들이 많아진 만큼', scene: 'n7-names', run: function () { return show('n7-names'); } },
      { text: '헷갈리지 않고 확실히 암기할 수 있도록\n퀴즈를 통해 복습해주세요!', run: none },
    ]), { ms: 4000 }),
  ];
  const groups = [[0, 1, 2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 12]];

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
    VoicingCanvas.draw(cv, v, { markColors: mc, chordName: chord && name ? chord.name : null, fingerNumMode: !!nums, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, fretLabelSize: fretLabelSize });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }

  function midisOf(c) { return strokeMidis(c, 'all'); }   // 울리는 줄 6번줄 → 1번줄(D3 midisOf와 같음)

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D6(cg-chords.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D6과 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-15):
  //     ① pick — 코드 맞추기 4지선다(A·Am·D·Dm·E·Em 여섯 코드 풀): 다이어그램 → 이름 / 이름 → 다이어그램.
  //        보기 = 정답 + 짝 코드(A ↔ Am 등, 항상 — 장조·마이너 구분이 노드 목적) + 나머지 넷 중 둘
  //     ② fill — 마이너 세 코드(Am·Dm·Em) 빠진 점 찍기(D3 규칙: 별 1·2 = 1개, 별 3 = 2개 또는 3개 — Em은 점이 2개라 최대 2개)
  //   문제 수(사용자 지정): 별 1 15 / 별 2 15 / 별 3 20. 유형별 나눔 잠정값 8·7 / 8·7 / 10·10
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:minor-chords
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 15, pick: 8, fill: 7 }, 2: { n: 15, pick: 8, fill: 7 }, 3: { n: 20, pick: 10, fill: 10 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'minor-chords';
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


  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 보기·순서·채울 점도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  const QZ_CHORDS = ['A', 'Am', 'D', 'Dm', 'E', 'Em'];   // pick 풀
  const FILL_CHORDS = ['Am', 'Dm', 'Em'];   // fill 풀(마이너 세 코드)
  const PAIR = { A: 'Am', Am: 'A', D: 'Dm', Dm: 'D', E: 'Em', Em: 'E' };
  // 스피커 아이콘 — 루시드 volume-2와 같은 도형(리하모니 .combo-v2-speaker — 마지막 두 path가 파동 애니메이션)
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  function balanced(n, pool) { pool = pool || QZ_CHORDS; const o = rnd(pool.length), a = []; for (let k = 0; k < n; k++) a.push(pool[(k + o) % pool.length]); return shuffle(a); }   // 풀 안에서 고르게(나머지는 무작위 시작점에서)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const pc = balanced(cfg.pick), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) {
      const others = [PAIR[pc[k]]].concat(shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k] && c !== PAIR[pc[k]]; })).slice(0, 2));   // 4지선다 — 짝 코드는 항상
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k]].concat(others)), answer: pc[k] });
    }
    const fc = balanced(cfg.fill, FILL_CHORDS);
    const miss = fillMiss(star, cfg.fill), used = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = 5~6)
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], used, fc));
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
  //  pick = 코드 맞추기 문제 화면 템플릿(문제 카드 .ms-quiz-question-card + 말풍선 + 4개 .ms-quiz-choice-card(2×2), 보기는 이름 글자 또는 다이어그램 canvas-slot) — 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  fill = 안내 카드 + 다이어그램(빠진 점을 눌러 찍기) + 제출하기
  const QZ_TITLES = { pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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
    $('combo-v2-clear-level').textContent = '마이너 코드 학습하기 · 퀴즈 ' + qz.star;
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



  J.register('minor-chords', { onCut: stageCut, layers: ['n7-trans', 'n7-sum', 'n7-cmp', 'n7-names'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 12, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 12 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
