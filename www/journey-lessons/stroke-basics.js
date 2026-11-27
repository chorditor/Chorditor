// ───────────────────────────────────────────────────────────
// 여정 노드: 스트로크 기초 (코드반주 D4)
//   설명 단계(2026-11-13 사용자 흐름) + 퀴즈(파일 뒷부분 — D3 퀴즈 엔진 복사).
//   에셋은 앱에 이미 있는 것만 재사용:
//     코드 다이어그램 = D3(chord-first.js)와 같은 방식 — 코드 사전(chordsLibrary) E·A 항목 + VoicingCanvas.draw. 점(손가락)만 캔버스 위에 DOM으로 겹쳐 움직임(D3 퀴즈 점 찍기 .n3q-dot 방식)
//     스트로크 기호·주법 칸·재생 위치선 = 코드반주 훈련 주법 디스플레이(chordplay-practice.js renderStrumDisplay)와 같은 마크업·클래스(.strum-play-grid 등 — 칸 26px, 재생 위치 세로선이 한 마디에 한 번 지나감)
//     소리 = 강의 엔진 J.strum(GuitarAudio.strumAt) — 세기 'acc'(강세) / 'weak'(약세)는 주법 화면과 같은 방식
//   새로 만든 것: 강세 기호(악보 표준 '>' — 2026-11-15 V에서 바꿈), 오른손 그림 2장(image/guitar_hand_no_pick_sq.svg · guitar_pick_hand_line_art_sq.svg — 같은 정사각 캔버스로 맞춘 사용자 제공 도안)
//
//   줄 선택(사용자 지정): 다운 강세 = 6줄 전부(6→1번줄) / 다운 약세 = 1~4번줄 / 업 = 1~3번줄
//   코드 전환 문구에는 '위·아래' 같은 방향 말을 쓰지 않고 '이동'만 쓴다(사용자 지정 — 다이어그램에서는 아래로, 연주할 때는 위로 움직여 헷갈림)
//
//   멈춤 지점 원칙(가이드 §4-19)·장면 전환(§4-20): 칸이 끝났을 때 화면은 핵심을 보여 주는 완성 상태. 층이 바뀌는 칸은 scene 열쇠 — 이전 화면은 엔진이 문구가 뜨는 순간 치움.
//   '다음으로 넘어갈 때까지 계속 재생'하는 칸은 loopTicks(자기 보정 타이머 — 모든 지연은 J.later라 "다음"·이탈·일시정지에서 엔진이 한꺼번에 정리)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — D3와 같음(코드 사전 E·A, A는 사용자 지정 운지 xx234x). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
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
    if (!CHORDS) CHORDS = { E: mk('E'), A: mk('A', [null, 4, 3, 2, null, null]) };
    return CHORDS;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }
  const E = chords().E, A = chords().A;

  // ── 스트로크 기호 — strum-play.js STRUM_ICON_DOWN/UP과 같은 도형(루시드 규격 24×24, currentColor) ──
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const ICON_DOWN = SVG_OPEN + '><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>';
  const ICON_UP = SVG_OPEN + ' stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>';
  // 강세 기호(악센트) — 악보 표준 '>' 모양, 가로로 긴 쐐기(사용자 지정 2026-11-15, 처음엔 V였음)
  const ICON_ACC = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 2 16 6 2 10"/></svg>';

  // ── 소리 — 줄 선택: 'all' 6→1번줄 / 'up6' 1→6번줄(업 스트로크 6줄 전부) / 'w4' 1~4번줄(4→1) / 'u3' 1~3번줄(1→3, 업 스트로크) — 안 울리는 줄(X)은 뺌 ──
  function strokeMidis(c, kind) {
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : kind === 'up6' ? [0, 1, 2, 3, 4, 5] : kind === 'w4' ? [3, 2, 1, 0] : [0, 1, 2];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  // mode: 'acc' 강세 / 'weak' 약세 / 없음 = 원래 세기
  // beats: 강박이 다음 강박까지 울릴 박 수(강약 패턴). 약박에서 안 치는 줄(5·6번줄 저음)이 1초 고정 길이로 둘째 박 중간에 사라져 강박이 '뚝' 끊기던 문제(사용자 지적 2026-11-15).
  //  약박이 다시 치는 줄은 같은 음 재타격 때 엔진(guitar-audio.js _doStrum)이 앞 음을 풀어 줌 — 길게 잡아도 겹쳐 쌓이지 않음
  function hit(c, kind, mode, beats, iv) { J.strum(strokeMidis(c, kind), J.audioT0(), beats ? beats * BEAT_MS / 1000 + 0.05 : 1.0, 0.3, mode, iv); }   // iv: 줄 사이 간격(초) — 생략 시 엔진 기본
  //  기호 설명용 느린 스트로크(2026-11-20 사용자 지정: 다운·업 방향의 느낌을 알 수 있게 6줄 전부, 속도만 느리게). 재생 경로는 코드반주 훈련(chordplay-practice.js)·4비트 연습과 같은 strumAt —
  //  줄 사이 간격(STRUM_STROKE_SEC 0.005초)만 키움. 엔진이 줄 간격을 ±50% 흔들므로 너무 크게 잡으면 들쭉날쭉(0.1초에서 그랬음)해서 0.04초
  const SLOW_IV = 0.04;

  // ── 다이어그램 — 'b' 박자 층, 't' 전환 층, 'f' 마무리 층(셋 다 같은 크기·같은 자리). 점 4개(손가락 1~4번)는 DOM으로 캔버스 위에 겹침 ──
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };   // voicing-canvas.js 기준 치수(440×352) — D3 퀴즈와 같음
  const DIAG = { b: { cv: 'n4-cb', wrap: 'n4-cwb', dots: 'n4-dtb', id: null }, t: { cv: 'n4-ct', wrap: 'n4-cwt', dots: 'n4-dtt', id: null }, f: { cv: 'n4-cf', wrap: 'n4-cwf', dots: 'n4-dtf', id: null } };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  // 레이아웃(2026-11-13 사용자 지시로 다시 짬): 무대 = 위 영역(다이어그램, 196px) + 아래 영역(주법 칸, 남은 높이 — 그 가운데에 칸). CSS .n4-stack/.n4-dz/.n4-sz.
  //  다이어그램은 위 영역 안에 절대 위치로 놓아 레이아웃에 영향을 주지 않음(음수 마진·캔버스 빈 여백에 기대지 않음):
  //   가로 = 지판(프렛보드) 가운데(캔버스 x 225/440)를 영역 가운데에 / 세로 = 영역 맨 위. 캔버스 아래 빈 여백(지판 아래 80/352)은 아래 영역 위로 넘어가지만 투명이라 보이지 않음
  //   크기 = 지판 아래 끝(캔버스 y 274/352)이 위 영역 높이(196px) 안에 들어오는 최대. 화면이 좁으면 왼쪽 개방현 O·X(지판 가운데에서 190/440)가 화면 안에 들어오게 줄임
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = 160;   // DZ_H = 위 영역 높이(CSS .n4-dz와 같은 값)
  function dw(k) {
    const sw = stageW(), B = VoicingCanvas;
    return Math.max(120, Math.min(sw * B.BASE_W / (2 * HALF_SPAN), DZ_H * B.BASE_W / FB_BOTTOM));   // 모든 층에서 같은 크기
  }
  // 캔버스 다시 그리기(id = 'E' | 'A') — 점은 그리지 않음(placed 0). 박자 층('b')만 점까지 그림. 이름·O·X 표시는 이 코드 기준
  // 캔버스 하나에 그리기 — c = 코드(null이면 지판만: 점·O·X·이름 없음)
  function drawV(cv, c, shown, w) {
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f, s) { return f > 0 && shown.indexOf(c.fing[s]) < 0 ? null : f; }) : [null, null, null, null, null, null],
      openMute: c ? e.openMute : [null, null, null, null, null, null], barre: c && (e.barres && e.barres[0] || e.barre) || {}, barreRange: c && (e.barreRanges && e.barreRanges[0] || e.barreRange) || null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c ? c.fing : [null, null, null, null, null, null],
    }, { chordName: c ? c.name : null, fingerNumMode: true, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  // 다이어그램 래퍼 = 캔버스 3장 겹침: 맨 아래 지판만(.n4-base — 늘 그대로) / 지금 코드(d.cv) / 바뀔 때 잠깐 쓰는 이전 코드(.n4-old).
  //  지판이 맨 아래에 늘 있어서 위 두 장이 서로 옅어지고 짙어져도 지판 선은 흐려지지 않고, O·X·코드 이름만 부드럽게 바뀜
  function paintDiag(k, id) {
    const d = DIAG[k], cv = $(d.cv);
    if (id !== undefined) d.id = id;
    if (!cv || !d.id) return;
    const c = chords()[d.id], w = dw(k), box = $(d.wrap);
    drawV(box.querySelector('.n4-base'), null, [], w);
    drawV(cv, c, k === 'b' ? c.order : [], w);
    box.style.width = w + 'px';   // 래퍼 = 위 영역 안 절대 위치(CSS left 50%) — 지판 가운데가 영역 가운데에 오도록 왼쪽으로 당김
    box.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';
    box.style.setProperty('--n4-w', w + 'px');
  }
  // 코드가 바뀔 때 개방현 O·X와 코드 이름을 부드럽게(사용자 지정) — 이전 그림을 .n4-old에 복사해 옅어지게, 새 그림(d.cv)은 짙어지게(0.5초).
  //  애니메이션이 중간에 취소돼도 끝 상태(새 그림만 보임)로 돌아가게: 새 그림을 먼저 그려 두고 투명도는 애니메이션으로만 움직임
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
  // 점(손가락 n번) — id 코드의 자리로 옮김(이미 보이면 이동 전환, 안 보이면 제자리에 나타남). id = null이면 사라짐(그 자리에서 옅어짐)
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
  // 처음 보여 줄 때 — 앞에서 쓰던 점이 새 자리로 움직이는 전환 없이 곧바로 완성 모양(사용자 지정: 첫 A코드는 처음부터 완성된 상태로)
  function snapChordDots(k, id) {
    const els = [1, 2, 3, 4].map(function (n) { return dotEl(k, n); }).filter(Boolean);
    els.forEach(function (el) { el.classList.add('is-snap'); });
    putChordDots(k, id);
    els.forEach(function (el) { void el.offsetWidth; el.classList.remove('is-snap'); });
  }
  function putChordDots(k, id) { [1, 2, 3, 4].forEach(function (n) { putDot(k, n, fingerIdx(chords()[id], n) >= 0 ? id : null); }); }
  // 코드 전환 — 단계마다 순서를 지킴(사용자 지정). 개방현·뮤트·코드 이름은 항상 마지막(fadeDiag).
  //   E → A: 검지(1번) 떼기 → 2·3번 이동 → 소지(4번) 추가 → 개방현·뮤트·이름
  //   A → E: 2·3번 이동 → 소지(4번) 떼기 → 검지(1번) 추가 → 개방현·뮤트·이름(15칸 설명과 같은 순서)
  //  sc = 시간 배율(1 = 기본, 마디 사이처럼 짧게 해야 할 때 줄임). 돌려주는 값 = 끝날 때까지 걸리는 시간(ms)
  const SEQ_GAP = { leave: 300, move: 600, come: 400 };
  function seqMove(k, to, sc) {
    sc = sc || 1;
    $(DIAG[k].wrap).style.setProperty('--n4-sp', sc);   // 점 이동·나타남 전환 시간도 같은 배율(CSS .n4-dot)
    const from = chords()[DIAG[k].id], dest = chords()[to];
    const uses = function (c, n) { return fingerIdx(c, n) >= 0; };
    const F = [1, 2, 3, 4];
    const leave = F.filter(function (n) { return uses(from, n) && !uses(dest, n); });
    const move = F.filter(function (n) { return uses(from, n) && uses(dest, n); });
    const come = F.filter(function (n) { return !uses(from, n) && uses(dest, n); });
    const order = to === 'A' ? [['leave', leave], ['move', move], ['come', come]] : [['move', move], ['leave', leave], ['come', come]];
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

  function dotsHtml() { return [1, 2, 3, 4].map(function (n) { return '<span class="n4-dot" data-f="' + n + '" style="width:' + QD.dot / VoicingCanvas.BASE_W * 100 + '%">' + n + '</span>'; }).join(''); }
  function cwrap(k) { const d = DIAG[k]; return '<div class="n4-cw" id="' + d.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + d.cv + '"></canvas><canvas class="n4-old"></canvas><div class="n4-dots" id="' + d.dots + '">' + dotsHtml() + '</div></div>'; }

  // ── 무대 ──
  // 주법 칸 — 코드반주 훈련(chordplay-practice.js strumCellHtml·renderStrumDisplay)과 같은 마크업·클래스(.strum-play-grid > .strum-beat-grid > .strum-beat-cell > .strum-ico, 재생 위치 .strum-playhead)
  function cells(icon) {
    let h = '';
    for (let i = 0; i < 4; i++) h += '<div class="strum-beat-cell"><span class="strum-ico">' + icon + '</span></div>';
    return '<div class="strum-beat-grid">' + h + '</div>';
  }
  function sgrid(id, rows, accOn) {   // rows = 칸 줄 목록 / 첫 줄 첫 박 위에 강세 기호
    return '<div class="strum-play-grid n4-sg" id="' + id + '"><span class="n4-vm' + (accOn ? ' is-in' : '') + '">' + ICON_ACC + '</span>' + rows.join('') + '<div class="strum-playhead"></div></div>';
  }
  // 손톱 손 위 화살표(사용자 지정): 검지 = 수직 화살표(다운), 엄지 = 오른쪽 위 대각선 화살표(업), 꼬리에 이름. 위치는 그림 크기에 대한 % — 그림 속 손가락 끝에 맞춰 조정할 값(ARROW_D·ARROW_U)
  const ARROW_D = { x: 30, y1: 14, y2: 26, label: [30, 3] };   // 검지: 위에서 아래로 / 꼬리(위쪽 끝)에 '다운'
  const ARROW_U = { tail: [5, 67], tip: [17, 53], label: [6, 70] };   // 엄지: 왼쪽 아래 꼬리에서 오른쪽 위로 / 꼬리에 '업'
  function arrows() {
    const u = ARROW_U, d = ARROW_D, dx = u.tip[0] - u.tail[0], dy = u.tip[1] - u.tail[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
    const bx = u.tip[0] - 8 * ux, by = u.tip[1] - 8 * uy, px = -uy * 4.5, py = ux * 4.5;
    return '<svg class="n4-ar" data-a="D" viewBox="0 0 100 100"><line x1="' + d.x + '" y1="' + d.y1 + '" x2="' + d.x + '" y2="' + (d.y2 - 1) + '"/><polygon points="' + (d.x - 4.5) + ',' + (d.y2 - 4) + ' ' + (d.x + 4.5) + ',' + (d.y2 - 4) + ' ' + d.x + ',' + (d.y2 + 5) + '"/></svg>' +
      '<span class="n4-ar-l" data-a="D" style="left:' + d.label[0] + '%;top:' + d.label[1] + '%">다운</span>' +
      '<svg class="n4-ar" data-a="U" viewBox="0 0 100 100"><line x1="' + u.tail[0] + '" y1="' + u.tail[1] + '" x2="' + bx + '" y2="' + by + '"/><polygon points="' + (bx + px) + ',' + (by + py) + ' ' + (bx - px) + ',' + (by - py) + ' ' + u.tip[0] + ',' + u.tip[1] + '"/></svg>' +
      '<span class="n4-ar-l" data-a="U" style="left:' + u.label[0] + '%;top:' + u.label[1] + '%">업</span>';
  }
  function hf(h, label, file) { return '<figure class="n4-hf" data-h="' + h + '"><div class="n4-hfw"><img src="image/' + file + '" alt="">' + (h === 'nail' ? arrows() : '') + '</div><figcaption>' + label + '</figcaption></figure>'; }
  function ic(d, label) { return '<div class="n4-ic" data-d="' + d + '">' + (d === 'D' ? ICON_DOWN : ICON_UP) + '<span>' + label + '</span></div>'; }
  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');   // 무대·문구 위치는 다른 노드와 같음(220px, 본문 가운데 정렬)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="n4-icons"><div class="n4-icons">' + ic('D', '다운 스트로크') + ic('U', '업 스트로크') + '</div></div>' +
      '<div class="jl-layer" id="n4-hands"><div class="n4-hands" id="n4-hw">' + hf('nail', '손톱', 'guitar_hand_no_pick_sq.svg') + hf('pick', '피크', 'guitar_pick_hand_line_art_sq.svg') + '</div></div>' +
      '<div class="jl-layer n4-full" id="n4-beats"><div class="n4-stack"><div class="n4-dz">' + cwrap('b') + '</div><div class="n4-sz">' + sgrid('n4-sgb', [cells(ICON_DOWN)]) + '</div></div></div>' +
      '<div class="jl-layer n4-full" id="n4-trans"><div class="n4-stack"><div class="n4-dz">' + cwrap('t') + '</div><div class="n4-sz n4-rz"><button type="button" class="n4-replay" id="n4-replay" aria-label="다시보기" hidden>' + ICON_REPLAY + '<span>다시보기</span></button></div></div></div>' +
      '<div class="jl-layer n4-full" id="n4-final"><div class="n4-stack"><div class="n4-dz">' + cwrap('f') + '</div><div class="n4-sz" id="n4-szf">' + sgrid('n4-sgf', [cells(ICON_DOWN)], true) + '</div></div></div>' +
      '<div class="jl-layer jl-rise n4-full" id="n4-sum"><div class="n4-sum"><div class="n4-sum-g"><span class="n4-sum-l">4비트 다운 스트로크</span>' + sgrid('n4-sgs1', [cells(ICON_DOWN)], true) + '</div><div class="n4-sum-g"><span class="n4-sum-l">4비트 업 스트로크</span>' + sgrid('n4-sgs2', [cells(ICON_UP)]) + '</div></div></div>' +   // 마무리 칸 — 배운 다운(강세)·업 주법을 위아래로(2026-11-20 사용자 지정)
      '</div>';
    paintDiag('b', 'E'); paintDiag('t', 'A'); paintDiag('f', 'A');
    $('n4-replay').addEventListener('click', replayRun);
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { Object.keys(DIAG).forEach(function (k) { paintDiag(k); }); fitSz(); });
    }
  }

  // ── 다시보기(2026-11-20 사용자 지정) — 코드 전환 칸(페이즈 4 스텝 3·4)이 끝나 마커가 멈췄을 때만 다이어그램 아래에 나타나 눌러지는 버튼. 코드 전환 애니메이션만 다시 재생(문구·소리 없음) ──
  //  나타남 = 엔진이 단계 끝에 부르는 settle(journey-lesson.js) / 사라짐 = 엔진 onCut(칸 이동·다시 시작·건너뛰기·닫기). 재생 중엔 눌러지지 않음
  const ICON_REPLAY = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  function replayShow(from, to, sc) {   // from = 전환 시작 코드 / to = 도착 코드 / sc = 전환 속도 배율(설명 칸 속도에 맞춤)
    const b = $('n4-replay');
    if (!b) return;
    b._r = { from: from, to: to, sc: sc || 1 };
    b.disabled = false; b.hidden = false;
  }
  function replayHide() {
    const b = $('n4-replay');
    if (!b) return;
    b._r = null; b.disabled = true; b.hidden = true;
  }
  const REPLAY_HOLD_MS = 800;   // 시작 코드를 완성 모양으로 보여 주는 시간
  function replayRun() {
    const b = $('n4-replay'), r = b && b._r;
    if (!r || b.disabled || J.skipping()) return;
    b.disabled = true;
    // 시작 코드의 완성 모양(점·개방현 O·뮤트 X·코드 이름)을 즉시 온전히 보여 준 뒤 잠깐 멈췄다가 전환.
    //  snapChordDots는 새로 나타나는 점(putDot)을 페이드인시켜서, 그대로 두면 완성 모양이 다 보이기 전에 전환이 시작됨 → 전환을 끊어 끝 상태로 바로 맞춤
    paintDiag('t', r.from); snapChordDots('t', r.from);
    const dots = [1, 2, 3, 4].map(function (n) { return dotEl('t', n); }).filter(Boolean);
    dots.forEach(function (el) { el.classList.add('is-snap'); });
    if (dots[0]) void dots[0].offsetWidth;
    dots.forEach(function (el) { el.classList.remove('is-snap'); });
    later(function () {
      const ms = seqMove('t', r.to, r.sc);
      later(function () { if (b._r === r) b.disabled = false; }, ms + 200);
    }, REPLAY_HOLD_MS);
  }
  function stageCut() { drumCut(); replayHide(); }   // 엔진 onCut — 드럼 하드컷 + 다시보기 버튼 치움(둘 다 멱등)

  // ── 화면 도구 ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  // 아래 영역(.n4-sz) 높이 = 위 영역(다이어그램) 아래 끝 ~ 본문 아래 끝(하단 진행 바 위)의 여백 전체. 무대(220px) 밖으로 넘쳐 내려가지만
  //  무대 높이는 그대로라 문구·다이어그램 위치는 안 바뀜. 주법 칸은 이 여백의 상하 가운데(CSS). 층을 보여 줄 때·창 크기가 바뀔 때 다시 잼
  function fitSz() {
    const st = $('combo-v2-lec-stage'), body = st && st.parentNode;
    if (!body) return;
    const bot = body.getBoundingClientRect().bottom;
    q('.n4-sz').forEach(function (sz) {
      const top = sz.previousElementSibling.getBoundingClientRect().bottom;
      sz.style.height = Math.max(80, Math.round(bot - top)) + 'px';
    });
  }
  function show(id, prepare) {   // 이전 층은 엔진이 칸 시작에서 이미 껐음(scene) — 준비(그리기) 뒤 켜기만
    if (prepare) prepare();
    fitSz();
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }
  // 재생 위치 세로선 — 코드반주 훈련(_strumTickPlayhead)과 같은 .strum-playhead가 칸 위를 왼쪽→오른쪽으로 한 마디에 한 번 지나감(박이 시작할 때 그 칸의 왼쪽 끝).
  //  훈련 화면은 매 프레임 계산하지만 여기는 마디 시작에 왼쪽 끝으로 놓고 한 마디 길이 선형 전환 하나로 보냄(엔진이 일시정지·건너뛰기에서 CSS 전환을 같이 다룸). r = 칸 줄 번호
  function sweep(gridId, r) {
    const g = $(gridId), ph = g.querySelector('.strum-playhead'), rows = g.querySelectorAll('.strum-beat-grid'), row = rows[r || 0];
    const a = row.firstElementChild, b = row.lastElementChild;
    ph.style.transition = 'none';
    ph.style.top = a.offsetTop + 'px';
    ph.style.height = a.offsetHeight + 'px';
    ph.style.left = a.offsetLeft + 'px';
    ph.style.opacity = '1';
    void ph.offsetWidth;
    ph.style.transition = 'left ' + 4 * BEAT_MS + 'ms linear, opacity 0.12s';
    ph.style.left = (b.offsetLeft + b.offsetWidth) + 'px';
  }
  function sweepLater(gridId, r) { later(function () { sweep(gridId, r); }, J.leadMs()); }   // 소리와 맞춰 시작
  function clearHit() { q('.strum-playhead').forEach(function (ph) { ph.style.transition = 'none'; ph.style.opacity = '0'; }); }

  // 박자 층 준비 — kind 'D' | 'U'(칸 기호), 강세 V는 꺼 둠. 다이어그램은 E(손가락 번호 포함)
  function beatsPrep(kind) {
    paintDiag('b', 'E');
    q('#n4-sgb .strum-ico').forEach(function (el) { el.innerHTML = kind === 'U' ? ICON_UP : ICON_DOWN; });
    setCls(q('#n4-sgb .n4-vm'), 'is-in', false);
    clearHit();
  }
  function handsPrep(mode) {   // 'both' 두 손 나란히(이름표 있음) / 'nail' · 'pick' 한 손 크게
    $('n4-hw').classList.toggle('is-one', mode !== 'both');
    q('#n4-hw .n4-hf').forEach(function (f) { f.classList.toggle('is-show', mode === 'both' || f.dataset.h === mode); });
    setCls(q('#n4-hw .n4-ar, #n4-hw .n4-ar-l'), 'is-in', false);
  }
  function icFocus(d) {
    setCls(q('#n4-icons .n4-ic'), 'is-focus', false);
    setCls(q('#n4-icons .n4-ic[data-d="' + d + '"]'), 'is-focus', true);
    setCls(q('#n4-icons .n4-ic[data-d="' + d + '"]'), 'is-name', true);
  }

  // ── 박자 — 70bpm(사용자 지정). 한 마디 보여 주기(bar) / 계속 재생(loopTicks) ──
  const BEAT_MS = 60000 / 70;
  function bar(fn, n) {   // 한 마디만 — 박자마다 fn(i)
    return (function step(i) {
      if (i >= n) return wait(400);
      fn(i);
      return wait(BEAT_MS).then(function () { return step(i + 1); });
    })(0);
  }
  // 다음으로 넘어갈 때까지 계속 재생. fn(n) = n번째 틱 / ready = 이만큼 재생하면 "다음" 켜짐(그 뒤로도 계속). 시계(performance.now)로 다음 틱을 보정해 밀리지 않음.
  //  "다음"(advance)이 타이머를 전부 지워 멈춤 / 빨리 돌리는 중(J.skipping)이면 재생하지 않고 끝냄(끝없이 예약되는 것 방지)
  function loopTicks(ms, fn, ready) {
    if (J.skipping()) return Promise.resolve();
    let n = 0, t0 = performance.now(), done;
    const p = new Promise(function (r) { done = r; });
    (function tick() {
      if (J.skipping()) { done(); return; }   // 건너뛰기로 끊긴 재생도 칸을 끝낸 것으로 — 안 그러면 '다음'이 엔진 안전 시간(20초) 뒤에야 켜짐(2026-11-15 점검)
      const now = performance.now();
      if (now - (t0 + n * ms) > ms) t0 = now - n * ms;   // 일시정지 뒤 복귀처럼 크게 밀렸으면 지금부터 다시 맞춤
      fn(n);
      n++;
      if (n === ready) done();
      later(tick, Math.max(0, t0 + n * ms - performance.now()));
    })();
    return p;
  }

  // ── 8비트 드럼(2026-11-20 사용자 지정, 페이즈 2 다운 스트로크 연습) — 코드반주 훈련(chordplay-practice.js)과 같은 드럼 세트 1 '기본 8비트'(킥 1·3박 / 스네어 2·4박 / 하이햇 8분음표 8칸)를 같은 DrumAudio.hit으로 ──
  //  스트로크 틱(70bpm 한 박)마다 그 박의 8분음표 두 칸을 같은 시각에 예약. 스크립트는 이 노드에서만 필요해 강의 페이지 공용 목록에 없음 → 처음 쓸 때 불러옴(D15 pentatonic-forms.js loadBacking과 같은 방식).
  //  하드컷 = 엔진 onCut(칸 이동·이동·건너뛰기·닫기/이탈) → DrumAudio.stop()(예약된 드럼까지 즉시 정리, CLAUDE.md 0-7)
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
    }, Promise.resolve())).then(function () { return DrumAudio.ready(); }).catch(function (e) { console.error('[stroke-basics]', e); });   // 실패하면 드럼 없이 진행
    return drumLoad;
  }
  function drumBeat(beat) {   // beat = 마디 안 박(0~3)
    if (J.skipping() || typeof DrumAudio === 'undefined' || !window.DRUM_SETS) return;
    const set = window.DRUM_SETS[1], t = J.audioT0(), half = BEAT_MS / 2000;
    [beat * 2, beat * 2 + 1].forEach(function (st, k) {
      const at = t + k * half;
      if ((set.kick || []).indexOf(st) >= 0) DrumAudio.hit('kick', at);
      if ((set.snare || []).indexOf(st) >= 0) DrumAudio.hit('snare', at);
      if ((set.hat || []).indexOf(st) >= 0) DrumAudio.hit('hat', at);
    });
  }
  function drumCut() { if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop(); }   // 멱등

  // ── 마무리 페이즈(주법 적용) 도구 ──
  // 주법 칸을 다운(강세 기호 포함) 또는 업으로
  function finalGrid(kind) {
    q('#n4-sgf .strum-ico').forEach(function (el) { el.innerHTML = kind === 'U' ? ICON_UP : ICON_DOWN; });
    setCls(q('#n4-sgf .n4-vm'), 'is-in', kind !== 'U');
  }
  // A·E를 한 마디씩 번갈아(지금 보이는 코드부터) — 다운 = 첫 박 강세 6줄 + 나머지 1~4번줄 / 업 = 1~3번줄. 마디 끝 박 뒤에 다음 코드로 순서대로 전환(0.4배, 다음 첫 박 전에 끝남)
  function loopFinal(kind) {
    const first = DIAG.f.id || 'A', seq = [first, first === 'A' ? 'E' : 'A'];
    return loadDrums().then(function () {   // 8비트 드럼(2026-11-20 사용자 지정 — 페이즈 5 다운·업 연습 둘 다)
      return loopTicks(BEAT_MS, function (n) {
        const b = Math.floor(n / 4) % 2, i = n % 4, id = seq[b], c = chords()[id];
        if (kind === 'U') hit(c, 'u3', 'weak'); else if (i === 0) hit(c, 'all', 'acc', 4); else hit(c, 'w4', 'weak');
        drumBeat(i);
        if (i === 0) sweepLater('n4-sgf');
        if (i === 3) later(function () { seqMove('f', seq[(b + 1) % 2], 0.4); }, BEAT_MS * 0.1);
      }, 8);   // 두 마디(A·E 한 번씩) 뒤 "다음" 켜짐, 그 뒤로도 계속
    });
  }
  // 반복이 "다음"으로 끊기면 전환이 중간에 멈출 수 있음(예약이 지워짐) → 칸이 바뀔 때 지금 코드(마지막으로 다 바뀐 코드) 모양으로 맞추고 재생 위치선을 숨김
  function settleFinal() {
    if (DIAG.f.id) { paintDiag('f'); snapChordDots('f', DIAG.f.id); }
    clearHit();
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  const steps = [
    // P1 스트로크 기호와 잡는 법
    // 0 핵심: 코드 다음은 리듬 — 줄을 한번에 긁는 스트로크 주법. 도입은 템포 빠르게. 끝 화면 = E 다이어그램 + 한 번 긁는 소리
    Object.assign(J.chainSteps([
      { text: '코드를 배웠으니 리듬을 넣어서\n연주를 해봐야겠죠?', gap: 3000, run: none },
      { text: '기타를 반주할 때는 대표적으로\n' + em('스트로크 주법') + '을 사용해요\n줄을 한번에 긁는 방법이에요', gap: 4200, scene: 'n4-trans:E', run: function () {
        return show('n4-trans', function () { paintDiag('t', 'E'); snapChordDots('t', 'E'); }).then(function () {
          J.strum(strokeMidis(E, 'all'), J.audioT0(), 2.2, 1.0);
          return wait(J.leadMs() + 2000);
        });
      } },
    ]), { ms: 7200 }),
    // 1 핵심: 다운 스트로크 기호 = 줄을 아래로 긁음. 끝 화면 = 두 기호 + 다운 스트로크 강조(이름·소리)
    Object.assign(J.chainSteps([
      { text: '두 가지 ' + em('스트로크 기호') + '가 있어요', scene: 'n4-icons', run: function () {
        return show('n4-icons', function () { setCls(q('#n4-icons .n4-ic'), 'is-focus', false); setCls(q('#n4-icons .n4-ic'), 'is-name', false); });
      } },
      { text: em('다운 스트로크 기호') + '는\n줄을 아래로 긁는 거예요', run: function () { icFocus('D'); hit(E, 'all', null, null, SLOW_IV); return wait(J.leadMs() + 1500); } },
    ]), { ms: 4000 }),
    // 2 핵심: 업 스트로크 기호 = 줄을 위로 긁음. 끝 화면 = 업 스트로크 강조
    { text: em('업 스트로크 기호') + '는\n줄을 위로 긁는 거예요', ms: 2000, run: function () { icFocus('U'); hit(E, 'up6', null, null, SLOW_IV); return wait(J.leadMs() + 1500); } },
    // 3 핵심: 스트로크 도구는 두 가지(손톱 / 피크). 끝 화면 = 두 손 그림 + 이름
    { text: '스트로크는 ' + em('손톱') + '으로 할 수도 있고\n' + em('피크') + '로 할 수도 있어요', ms: 1200,
      scene: 'n4-hands:both', run: function () { return show('n4-hands', function () { handsPrep('both'); }); } },
    // 4 핵심: 손톱 — OK 모양, 다운 = 검지 손톱 / 업 = 엄지 손톱. 끝 화면 = 손톱 쓰는 손 그림
    Object.assign(J.chainSteps([
      { text: '손톱으로 할 때는 ' + em('OK 모양') + '을 만든 뒤\n다운 스트로크는 ' + em('검지 손톱') + '으로', scene: 'n4-hands:nail', run: function () {
        return show('n4-hands', function () { handsPrep('nail'); }).then(function () { return fx(q('#n4-hw [data-a="D"]'), 'is-in', true); });   // 검지 = 수직 화살표 + '다운'
      } },
      { text: '업 스트로크는 ' + em('엄지 손톱') + '으로\n긁어주면 돼요', run: function () { return fx(q('#n4-hw [data-a="U"]'), 'is-in', true); } },   // 엄지 = 오른쪽 위 대각선 화살표 + '업'
    ]), { ms: 5000 }),
    // 5 핵심: 피크 — 손하트 모양으로 잡고 뾰족한 부분으로. 끝 화면 = 피크 쥔 손 그림
    { text: '피크를 사용할 때는 피크를\n' + em('손하트') + ' 모양으로 잡고\n뾰족한 부분으로 긁으면 돼요', ms: 1200,
      scene: 'n4-hands:pick', run: function () { return show('n4-hands', function () { handsPrep('pick'); }); } },
    // 6 핵심: 피크는 약하게 — 툭 건드리면 떨어질 정도(세게 잡으면 소리가 둔탁). 끝 화면 = 피크 손 그림 그대로
    Object.assign(J.chainSteps([
      { text: '처음엔 피크를 자주 떨어뜨려서\n세게 잡게 되는데', run: none },
      { text: '피크를 너무 세게 잡고 긁으면\n스트로크 소리가 너무 커지고 둔탁해져서\n듣기에 안 좋아요', run: none },
      { text: '그래서 피크는 ' + em('툭 건드리면 떨어질 정도로') + '\n약하게 잡아줘야 해요', run: none },
    ]), { ms: 5000 }),
    // 7 핵심: 도구와 상관없이 손목에 힘 빼기 — 두 손 그림으로 돌아와 마무리. 끝 화면 = 두 손 그림
    Object.assign(J.chainSteps([
      { text: '손톱을 쓰든 피크를 쓰든\n스트로크를 할 땐 ' + em('손목을 툭툭 터는') + '\n느낌으로 해요!', scene: 'n4-hands:both', run: function () { return show('n4-hands', function () { handsPrep('both'); }); } },
      { text: '처음엔 당연히 잘 안 되겠지만\n계속 ' + em('손목에 힘을 빼려고') + ' 의식하는 게\n중요해요!', run: none },
    ]), { ms: 5000 }),

    // P2 4비트 다운 스트로크 (2026-11-20 문구·드럼 개편)
    // P2S1 핵심: 일정한 리듬으로 다운 4번(70bpm) + 8비트 드럼 — 다음으로 넘어갈 때까지 계속 재생. 끝 화면 = E 다이어그램 + ↓×4(재생 위치선 계속)
    Object.assign(J.chainSteps([
      { text: '먼저 ' + em('다운 스트로크') + ' 주법을\n연습해볼게요!', scene: 'n4-beats:down', run: function () { return show('n4-beats', function () { beatsPrep('D'); }); } },
      { text: em('E코드') + '를 잡고 ' + em('일정한 리듬') + '으로\n다운 스트로크를 따라해보세요!\n원하는 만큼 연습하고 넘어가 주세요!', run: function () {
        return loadDrums().then(function () {
          return loopTicks(BEAT_MS, function (n) { hit(E, 'all'); drumBeat(n % 4); if (n % 4 === 0) sweepLater('n4-sgb'); }, 4);
        });
      } },
    ]), { ms: 6000 }),
    // P2S2 핵심: 강세 — 힘이 아니라 '한 순간에 빠르게' + 줄을 전부 칠지 일부만 칠지로 강약 조절. 끝 화면 = V + 시연 한 마디가 지나간 주법 칸
    Object.assign(J.chainSteps([
      { text: '주법은 ' + em('강세') + '를 적절히 주는 게 중요해요\n그래야 노래의 리듬을 살릴 수 있거든요!', enter: clearHit, run: none },
      { text: '스트로크에 강세를 줄 때에는\n힘을 강하게 준다기보다는', run: none },
      { text: '스트로크를 ' + em('한 순간에 빠르게') + '\n한다는 느낌이 좋아요!', run: none },
      { text: '그리고 6개의 줄을 ' + em('전부') + ' 칠 것인지\n일부만 칠 것인지로 강약을 조절할 수 있어요', run: function () {
        return fx(q('#n4-sgb .n4-vm'), 'is-in', true).then(function () {
          return bar(function (i) { if (i === 0) { hit(E, 'all', 'acc', 4); sweepLater('n4-sgb'); } else hit(E, 'w4', 'weak'); }, 4);
        });
      } },
    ]), { ms: 16600 }),
    // P2S3 핵심: 강약약약으로 직접 — 첫 박 6줄 강하게 / 나머지 1~4번줄 + 8비트 드럼, 계속 재생. 끝 화면 = V + 재생 위치선
    Object.assign(J.chainSteps([
      { text: '강약을 조절해서 ' + em('다운 스트로크') + ' 연습을\n진행해볼게요!', enter: clearHit, run: none },
      { text: '첫 박은 ' + em('6줄') + '을 모두 쳐주시고\n나머지는 1~4번줄 정도만 쳐보세요!', run: function () {
        return loadDrums().then(function () {
          return loopTicks(BEAT_MS, function (n) { const i = n % 4; if (i === 0) { hit(E, 'all', 'acc', 4); sweepLater('n4-sgb'); } else hit(E, 'w4', 'weak'); drumBeat(i); }, 4);
        });
      } },
    ]), { ms: 6000 }),

    // P3 4비트 업 스트로크
    // 11 핵심: 업 = 약한 박자의 스트로크, 1~3번줄만 살짝. 끝 화면 = E + ↑×4 + 시연 한 마디가 지나간 주법 칸
    Object.assign(J.chainSteps([
      { text: '다음은 ' + em('4비트 업 스트로크') + '를\n연습해봐요', scene: 'n4-beats:up', run: function () { return show('n4-beats', function () { beatsPrep('U'); }); } },
      { text: '업 스트로크는 거의 대부분\n약한 박자에서 사용돼요', run: none },
      { text: '그래서 6줄을 전부 긁기보다는\n' + em('1~3번줄') + '을 ' + em('살짝 얍삽하게') + ' 스트로크하면\n좋은 소리가 나요', run: function () {
        return bar(function (i) { hit(E, 'u3', 'weak'); if (i === 0) sweepLater('n4-sgb'); }, 4);
      } },
    ]), { ms: 11830 }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
    // 12 핵심: 업 4번 계속 재생(E, 70bpm). 끝 화면 = 재생 위치선 계속
    { text: '4비트 업 스트로크를 계속\n반복해볼게요! 원하는 만큼 연습하고\n넘어가 주세요', ms: 4000, enter: clearHit, run: function () {
      return loopTicks(BEAT_MS, function (n) { hit(E, 'u3', 'weak'); if (n % 4 === 0) sweepLater('n4-sgb'); }, 4);
    } },

    // P4 코드 전환(A ↔ E)
    // 13 핵심: 먼저 A코드를 잡는다 — 완성 다이어그램을 한 번에 + 소리 1회. 끝 화면 = A(손가락 번호 포함)
    Object.assign(J.chainSteps([
      { text: '이제 A코드와 E코드를 전환하면서\n주법을 연습해볼게요!', scene: 'n4-trans:A', run: none },
      { text: '먼저 ' + em('A코드') + '를 잡아볼까요?', run: function () {
        return show('n4-trans', function () { paintDiag('t', 'A'); snapChordDots('t', 'A'); }).then(function () {
          J.strum(strokeMidis(A, 'all'), J.audioT0(), 2.2, 1.0);
          return wait(J.leadMs() + 2000);
        });
      } },
    ]), { ms: 9620 }),
    // 14 핵심: 손가락을 다 떼지 말고 재활용 — 기타 코드는 비슷한 부분이 많다. 끝 화면 = A 그대로
    Object.assign(J.chainSteps([
      { text: '잘했어요! 이제 A코드를 잡은 상태에서\nE코드로 바꿀 거예요', run: none },
      { text: '여기서 주의! 처음엔 코드를 바꾸라고 하면', run: none },
      { text: '손가락을 전부 확 떼어버리는 경우가 많아요', run: none },
      { text: '하지만 기타 코드의 모양은 비슷한 부분이 많아서', run: none },
      { text: '한번 잡은 손가락을 ' + em('재활용') + '하는 것이\n코드 전환하는 요령이에요!', run: none },
    ]), { ms: 10600 }),
    // 15 핵심: A → E 전환 과정 전체를 한 칸에(사용자 지정) — 2·3번 손가락 동시에 이동 → 소지(4번) 떼기 → 검지(1번) 찍기 → 그다음 개방현 O·X와 코드 이름이 E로 → 축하. 끝 화면 = E 완성 + E 소리
    Object.assign(J.chainSteps([
      { text: 'A코드를 E코드로 전환하는 과정을\n잘 지켜봐주세요', run: none },
      { text: '먼저 A코드의 ' + em('2번, 3번') + ' 손가락을\n그대로 이동해요', run: function () {
        putDot('t', 2, 'E'); putDot('t', 3, 'E');
        return wait(900);
      } },
      { text: '다음에 ' + em('소지(4번)') + '를 떼고', run: function () { putDot('t', 4, null); return wait(700); } },
      { text: em('검지(1번)') + '로 남은 부분을 잡으면...!', run: function () {
        putDot('t', 1, 'E');   // 1번 점을 먼저 찍고
        return wait(700).then(function () { fadeDiag('t', 'E'); return wait(DIAG_FADE_MS + 200); });   // 그다음 개방현 O·X와 코드 이름이 E로(부드럽게)
      } },
      { text: '축하해요! ' + em('A코드') + '에서 ' + em('E코드') + '로\n전환하셨어요!', run: function () { J.strum(strokeMidis(E, 'all'), J.audioT0(), 2.2, 1.0); return wait(J.leadMs() + 2000); } },
    ]), { ms: 18600, settle: function () { replayShow('A', 'E', 1.4); } }),
    // 16 핵심: 반대로 E → A는 한 번에 — 손가락을 많이 안 바꿔도 된다. 끝 화면 = A + A 소리
    Object.assign(J.chainSteps([
      { text: '마찬가지로 E코드에서 A코드로\n전환을 해보면...', run: function () {
        const ms = seqMove('t', 'A');   // 1번 떼기 → 2·3번 이동 → 4번 추가 → 개방현·뮤트·이름
        later(function () { J.strum(strokeMidis(A, 'all'), J.audioT0(), 2.2, 1.0); }, ms);
        return wait(ms + J.leadMs() + 2000);
      } },
      { text: '지금처럼 ' + em('2, 3번') + ' 손가락을\n그대로 활용할 수 있어요!', run: none },
    ]), { ms: 9820, settle: function () { replayShow('E', 'A', 1); } }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
    // 17 핵심: 점점 빠르게 — A ↔ E 전환을 계속 재생. 다음 페이즈(주법 적용)에서도 전환이 이어지므로 기다리지 않고 바로 넘어갈 수 있음(사용자 지정 — 첫 틱 뒤 "다음" 켜짐, gap = 문구 최소 시간 1초). 끝 화면 = 전환이 계속 도는 다이어그램
    { text: '이 과정을 점점 빠르게 할 수 있도록\n충분히 연습해보세요!', gap: 1400, run: function () {
      return loopTicks(900, function (n) {   // 4틱(0.9초) = A 소리 → E로 전환 → E 소리 → A로 전환. 전환은 순서는 그대로, 0.4배 시간(약 0.7초 — 사용자 지정: 훨씬 빠르게)
        const m = n % 4;
        if (m === 0) hit(A, 'all', 'acc'); else if (m === 1) seqMove('t', 'E', 0.4); else if (m === 2) hit(E, 'all', 'acc'); else seqMove('t', 'A', 0.4);
      }, 1);
    } },

    // P5 주법 적용 — 다운 연습 1칸, 업 연습 1칸으로 나눔(사용자 지정). 둘 다 A·E를 한 마디씩 번갈아(마디 끝에 순서대로 전환, 0.4배)
    // 18 핵심: 코드 전환 + 4비트 다운(강약약약). 끝 화면 = 다이어그램 + 다운 칸(재생 위치선 계속)
    Object.assign(J.chainSteps([
      { text: 'A, E코드를 전환하면서\n앞서 배운 주법까지 적용해봐요', scene: 'n4-final', run: function () {
        return show('n4-final', function () { paintDiag('f', 'A'); snapChordDots('f', 'A'); finalGrid('D'); clearHit(); });
      } },
      { text: '먼저 ' + em('4비트 다운 스트로크') + '(강약약약)로\nA, E코드를 번갈아 연습해보세요!', run: function () { return loopFinal('D'); } },
    ]), { ms: 12100 }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
    // 19 핵심: 코드 전환 + 4비트 업. 주법 칸만 업으로 바뀜(다이어그램은 그대로). 끝 화면 = 다이어그램 + 업 칸(재생 위치선 계속)
    { text: '이번엔 ' + em('4비트 업 스트로크') + '로\nA, E코드를 번갈아 연습해보세요!', ms: 6800, enter: settleFinal, run: function () {   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
      return fx([$('n4-szf')], 'is-out', true).then(function () { finalGrid('U'); return fx([$('n4-szf')], 'is-out', false); }).then(function () { return loopFinal('U'); });
    } },
    // 20 핵심: 끝은 다음 할 일로(가이드 §4-12) — 퀴즈로 익히기 + 실제 기타로(시간 제한 안내는 중복이라 뺌 — 사용자 지정)
    Object.assign(J.chainSteps([
      { text: '수고하셨어요! 기초적인 ' + em('주법') + '을 배웠어요', scene: 'n4-sum', enter: settleFinal, run: function () { return show('n4-sum'); } },
      { text: '이제 A, E코드를 복습하면서\n주법에 대한 느낌에 익숙해지도록', run: none },
      { text: '퀴즈를 풀어서 학습을 완료해주세요!', run: none },
    ]), { ms: 6600 }),
  ];
  const groups = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10], [11, 12], [13, 14, 15, 16, 17], [18, 19, 20]];

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(퀴즈 paintQ가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
  function paint(cv, chord, placed, nums, name, w, mc, fretLabelSize, hideOpen) {
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
    VoicingCanvas.draw(cv, v, { markColors: mc, chordName: chord && name ? chord.name : null, fingerNumMode: !!nums, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }

  function midisOf(c) { return strokeMidis(c, 'all'); }   // 울리는 줄 6번줄 → 1번줄(D3 midisOf와 같음)
  // 소리 아이콘(소리 듣기 문제 카드) — 루시드 volume-2와 같은 도형(24×24, currentColor)
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D3(chord-first.js) 퀴즈 엔진을 복사해 유형만 더함. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D3과 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-13):
  //     ① A·E코드 복습 — D3 문제 그대로: pick(코드 맞추기 2지선다: 다이어그램 → 이름 / 이름 → 다이어그램) + fill(다이어그램 빠진 점 찍기)
  //     ② sym — 스트로크 기호 2지선다: 기호 → 이름(다운/업) 또는 이름 → 기호, 반반
  //     ③ ear — 소리 듣고 2지선다: 다운 또는 업으로 긁은 소리(줄 사이를 느리게 — 방향이 들리게)를 듣고 다운/업 고르기. 문제 카드를 누르면 다시 들음
  //     (화면의 줄을 직접 긁는 유형은 만들지 않음 — 다이어그램은 1번줄이 위라 다운이 화면에선 위로 긁는 동작이 되어 헷갈림, 사용자 결정)
  //   문제 수: 별 1 10 / 별 2·3 15 (D3과 같음). 유형 비율 ①:②:③ = 4:3:3 / 5:5:5 / 5:5:5(①은 pick·fill 반반, fill 빠진 점 수는 D3 규칙)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:stroke-basics
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10, pick: 2, fill: 2, sym: 2, ear: 2, pat: 2 }, 2: { n: 15, pick: 3, fill: 2, sym: 3, ear: 4, pat: 3 }, 3: { n: 15, pick: 2, fill: 3, sym: 3, ear: 3, pat: 4 } };   // 별 → 문제 수 / 유형별 문제 수(① = pick + fill). pat = 주법 듣기(2026-11-27 추가 — 문제 수는 그대로 두고 sym·ear에서 나눔)
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'stroke-basics';
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
  function balancedDU(n) { const o = rnd(2), a = []; for (let k = 0; k < n; k++) a.push((k + o) % 2 ? 'U' : 'D'); return shuffle(a); }   // 다운·업 반반(홀수면 남는 1개는 무작위)
  function balanced(n) { const o = rnd(2), a = []; for (let k = 0; k < n; k++) a.push((k + o) % 2 ? 'E' : 'A'); return shuffle(a); }   // E·A가 반반(홀수면 한쪽이 1개 더)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const pc = balanced(cfg.pick), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle(['E', 'A']), answer: pc[k] });
    const fc = balanced(cfg.fill);
    const miss = fillMiss(star, fc), used = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = E 5~6·A 4~5)
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], used, fc));
    // ② 기호 2지선다 — 다운·업 반반, 기호 → 이름 / 이름 → 기호 반반
    const sd = balancedDU(cfg.sym), sv = shuffle(Array.from({ length: cfg.sym }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.sym; k++) qs.push({ type: 'sym', variant: sv[k], choices: shuffle(['D', 'U']), answer: sd[k] });
    // ③ 소리 듣고 2지선다 — 다운·업 반반, 코드(A·E)는 반반
    const ed = balancedDU(cfg.ear), ec = balanced(cfg.ear);
    for (let k = 0; k < cfg.ear; k++) qs.push({ type: 'ear', chord: ec[k], choices: shuffle(['D', 'U']), answer: ed[k] });
    // ④ 주법 듣기 2지선다(2026-11-27 사용자 지정) — 일반 다운 4번 / 일반 업 4번 / 첫 박 강세 다운 중 정답 + 나머지 둘 중 하나. 정답 주법은 셋이 고르게, 코드(A·E)는 반반
    const po = shuffle(PAT_IDS.slice());   // 문제 수가 3의 배수가 아닐 때 남는 몫이 늘 같은 주법으로 가지 않게 출발 순서를 섞음
    const pa = shuffle(Array.from({ length: cfg.pat }, function (_, k) { return po[k % po.length]; })), pc2 = balanced(cfg.pat);
    for (let k = 0; k < cfg.pat; k++) { const others = PAT_IDS.filter(function (x) { return x !== pa[k]; }); qs.push({ type: 'pat', chord: pc2[k], answer: pa[k], choices: shuffle([pa[k], others[rnd(others.length)]]) }); }
    // 순서(2026-11-20 사용자 지정 — 주법 문제와 코드 문제가 골고루 섞이게):
    //  코드 문제(pick·fill)는 전체에 고른 간격으로 자리를 잡고(간격 = 문제 수 ÷ 코드 문제 수, 시작점만 무작위), 나머지 자리에 주법 문제(sym·ear)를 섞어 넣음.
    //  코드 문제 안에서 점 찍기는 채울 노트가 적은 것부터(D3 규칙). 여러 번 짜 보고 ① 같은 문제 연속 ② 같은 유형 연속이 가장 적은 배열을 고름
    const chordQs = qs.filter(function (q) { return q.type === 'pick' || q.type === 'fill'; }), strokeQs = qs.filter(function (q) { return q.type === 'sym' || q.type === 'ear' || q.type === 'pat'; });
    const total = qs.length, nc = chordQs.length, step = total / nc;
    const qk = function (q) { return q.type + ':' + (q.variant || '') + ':' + (q.chord || '') + ':' + (q.answer || '') + ':' + (q.ans ? q.ans.slice().sort().join(',') : ''); };
    let best = null, bestScore = Infinity;
    for (let t = 0; t < 300 && bestScore > 0; t++) {
      const off = Math.random() * step, slots = {};
      for (let k = 0; k < nc; k++) slots[Math.min(total - 1, Math.floor(off + k * step))] = true;
      const co = shuffle(chordQs.slice()), fillsSorted = co.filter(function (q) { return q.type === 'fill'; }).sort(function (x, y) { return x.ans.length - y.ans.length; });
      let fi = 0;
      const cq = co.map(function (q) { return q.type === 'fill' ? fillsSorted[fi++] : q; }), so = shuffle(strokeQs.slice());
      let ci = 0, si = 0;
      const arr = [];
      for (let k = 0; k < total; k++) arr.push(slots[k] ? cq[ci++] : so[si++]);
      let score = 0;
      for (let k = 1; k < total; k++) {
        if (qk(arr[k]) === qk(arr[k - 1])) score += 1000;
        else if (arr[k].type === arr[k - 1].type) score += 1;
      }
      if (score < bestScore) { bestScore = score; best = arr; }
    }
    return best;
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
  //  별 3(2026-11-27 사용자 지정 — A·E를 고르게 학습): E = 5~6개, A = 4~5개. A는 5노트라 E와 같은 5~6개로는 서로 다른 문제가 '전부 비우기' 하나뿐이어서
  //   A 자리가 E로 바뀌어 나왔음. '전부 비우기'(E 6개·A 5개)는 코드마다 한 가지뿐이라 한 판에 코드당 1문제만, 나머지는 1개 적게
  function fillMiss(star, chords) {
    const n = chords.length;
    if (star === 1) return chords.map(function () { return 2; });
    if (star === 3) { const seen = {}; return chords.map(function (c) { const full = c === 'E' ? 6 : 5; if (seen[c]) return full - 1; seen[c] = true; return full; }); }
    return shuffle(Array.from({ length: n }, function (_, k) { return k < Math.floor(n / 2) ? 3 : 4; }));
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
  const STROKE_NAME = { D: '다운 스트로크', U: '업 스트로크' };
  function strokeIco(d, cls) { return '<span class="n4q-ico' + (cls ? ' ' + cls : '') + '">' + (d === 'U' ? ICON_UP : ICON_DOWN) + '</span>'; }
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
  const QZ_TITLES = { pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요', sym: '알맞은 답을 고르세요', ear: '알맞은 답을 고르세요', pat: '알맞은 답을 고르세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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
  let autoTimer = null;
  async function playChord(name) {
    if (typeof GuitarAudio === 'undefined') return;
    const midis = midisOf(chords()[name]);
    if (!midis.length) return;
    if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
    GuitarAudio.strumNotes(midis, 0.008);
  }
  const EAR_GAP = 0.04;   // 소리 듣기 문제의 줄 사이 간격(초) — 보통 스트럼(0.008~0.012)보다 느리게 해서 방향이 들리게(사용자 지정: 약간 낮춤)
  const EAR_HINT = '터치해서 다시 들어보세요!';
  async function playStroke(name, dir) {
    if (typeof GuitarAudio === 'undefined') return;
    const down = strokeMidis(chords()[name], 'all');
    const midis = dir === 'U' ? down.slice().reverse() : down;
    if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
    GuitarAudio.strumNotes(midis, EAR_GAP);
  }
  // 주법 듣기 — 강의와 같은 소리(강의 hit와 같은 줄 선택·세기·strumAt 경로, 노드 9 주법 듣기 playEar와 같은 방식), 두 마디. 빠르기는 이 노드 강의와 같은 70bpm(BEAT_MS)
  //  dn = 매 박 6줄 다운(원래 세기) / up = 매 박 1~3번줄 업(약세) / acc = 첫 박 6줄 강세 + 나머지 1~4번줄 약세
  const PAT_IDS = ['dn', 'up', 'acc'], PAT_BARS = 2;
  let patGen = 0;   // 하드컷(stopSound)마다 올림 — 준비를 기다리는 사이 문제가 바뀌거나 보기를 골랐으면 재생하지 않음
  function playPat(it) {
    stopSound();   // 카드를 다시 누르면 앞 재생을 끊고 처음부터(CLAUDE.md 0-7)
    if (typeof GuitarAudio === 'undefined') return;
    const gen = patGen, c = chords()[it.chord];
    Promise.resolve(GuitarAudio.resume ? GuitarAudio.resume() : null).catch(function () {}).then(function () { return GuitarAudio.ready(); }).then(function () {
      if (gen !== patGen || !qz || qz.quit || qz.over || cur() !== it) return;
      const t0 = Tone.now() + 0.1;
      for (let b = 0; b < PAT_BARS * 4; b++) {
        const t = t0 + b * BEAT_MS / 1000;
        if (it.answer === 'up') GuitarAudio.strumAt(strokeMidis(c, 'u3'), 0.012, t, 1.0, 0.3, 'weak');
        else if (it.answer === 'acc' && b % 4 === 0) GuitarAudio.strumAt(strokeMidis(c, 'all'), 0.012, t, 4 * BEAT_MS / 1000 + 0.05, 0.3, 'acc');
        else if (it.answer === 'acc') GuitarAudio.strumAt(strokeMidis(c, 'w4'), 0.012, t, 1.0, 0.3, 'weak');
        else GuitarAudio.strumAt(strokeMidis(c, 'all'), 0.012, t, 1.0, 0.3, null);
      }
    });
  }
  // 보기 주법 칸 — 강의 주법 칸(sgrid·cells)과 같은 마크업, 강세 주법만 첫 박 위 강세 기호
  function patGrid(id) { return '<div class="strum-play-grid n4-sg n4q-sg"><span class="n4-vm' + (id === 'acc' ? ' is-in' : '') + '">' + ICON_ACC + '</span>' + cells(id === 'up' ? ICON_UP : ICON_DOWN) + '</div>'; }
  function playQ(it) { if (it.type === 'pat') playPat(it); else if (it.type === 'ear') playStroke(it.chord, it.answer); else playChord(it.chord); }
  function stopSound() {
    clearTimeout(autoTimer);
    autoTimer = null;
    patGen++;
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 맥락 전환 → 하드컷(CLAUDE.md 0-7)
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
    stopSound();   // 앞 문제 소리·예약을 정리
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
    } else if (it.type === 'sym' && it.variant === 'd2n') {   // 기호를 보고 이름 고르기
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">스트로크 기호</span>' + strokeIco(it.answer, 'n4q-ico--q') + '</div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 스트로크 이름을 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text n4q-txt" data-v="' + c + '">' + STROKE_NAME[c] + '</button>'; }).join('') + '</div></div>';
      bindChoices();
    } else if (it.type === 'sym') {   // 이름을 보고 기호 고르기
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">스트로크 이름</span><span class="ms-quiz-question-name jq-qname--sm">' + STROKE_NAME[it.answer] + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 스트로크 기호를 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card" data-v="' + c + '">' + strokeIco(c) + '</button>'; }).join('') + '</div></div>';
      bindChoices();
    } else if (it.type === 'ear') {   // 소리를 듣고 다운·업 고르기 — 문제가 나오면 한 번 자동 재생, 카드를 누르면 다시
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">스트로크 소리</span><span class="n4q-ico n4q-ico--q">' + ICON_SOUND + '</span><span class="jq-qask">' + EAR_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">들리는 스트로크를 고르세요</div><div class="ms-quiz-choices jq-cq-choices">' +
        it.choices.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text n4q-txt" data-v="' + c + '">' + STROKE_NAME[c] + '</button>'; }).join('') + '</div></div>';
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'pat') {   // 주법 듣기 — 문제 카드(소리 듣기와 같음) + 보기 2개(주법 칸, 한 줄에 하나 — 노드 9 주법 듣기와 같은 배치)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">주법 소리</span><span class="n4q-ico n4q-ico--q">' + ICON_SOUND + '</span><span class="jq-qask">' + EAR_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">들리는 주법을 고르세요</div><div class="ms-quiz-choices jq-cq-choices n9q-choices">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '">' + patGrid(c) + '</div>'; }).join('') + '</div></div>';
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
    $('combo-v2-clear-level').textContent = '스트로크 기초 · 퀴즈 ' + qz.star;
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
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });



  J.register('stroke-basics', { onCut: stageCut, layers: ['n4-icons', 'n4-hands', 'n4-beats', 'n4-trans', 'n4-final', 'n4-sum'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 20, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 20 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
