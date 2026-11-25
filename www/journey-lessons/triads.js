// ───────────────────────────────────────────────────────────
// 여정 노드: 트라이어드 코드 (코드반주 D12)
//   D7(minor-chords.js)를 복사해 내용만 바꿈(2026-11-16 사용자 기획). 설명 단계 + 퀴즈.
//   목적: 코드가 만들어지는 원리(메이저스케일의 1·3·5번째 음) → 3음 = 메이저·마이너를 정함(핵심) / 5음 = aug·dim(언급만, 공식 + 소리 한 칸)
//         → 이미 아는 A·D·E와 Am·Dm·Em의 차이(D7 "한 음만 반음 낮아짐")가 바로 3음
//   원리 시연 = 피아노 건반 C코드(D2 건반 부품 .n2-*, 사용자 지정). 기타 다이어그램은 손가락 번호 대신 줄마다 도수(1·3·5)를 DOM 점으로(.n4-dot + 개방현 .n12-open)
//   용어(사용자 지정): 처음 한 번 '1음(근음)'으로 병기, 이후 1음·3음·5음. 코드 느낌을 형용사로 정하지 않음(D7 규칙)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const SOLO = /[?&]course=soloing/.test(location.search);   // 솔로연주 비기너 D19 — 도입 둘째 문구만 다름(사용자 지정 2026-11-24)

  // ── 코드 데이터 — D7과 같은 여섯 코드(사전 기본 운지). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄
  const ROOT_PC = { A: 9, D: 2, E: 4 };          // 근음 피치 클래스(0 = C)
  function pick(name) {   // 사전은 근음(A·D·E)별 목록 — 마이너도 같은 근음 목록 안에 이름(Am 등)으로 들어 있음
    return window.chordsLibrary[name.charAt(0)].filter(function (e) { return e.name === name && e.source === 'static' && e.slotFret === 2; })[0];
  }
  function mk(name) { const e = pick(name); return { name: e.name, entry: e, frets: e.frets, root: ROOT_PC[name.charAt(0)] }; }
  let CHORDS = null;
  function chords() {
    if (!CHORDS) CHORDS = { A: mk('A'), Am: mk('Am'), D: mk('D'), Dm: mk('Dm'), E: mk('E'), Em: mk('Em') };
    return CHORDS;
  }
  // 도수 — 근음에서 몇 반음 위인가(트라이어드에 나오는 것만)
  const DEG = { 0: '1', 3: 'b3', 4: '3', 6: 'b5', 7: '5', 8: '#5' };
  function degOf(c, s) { const f = c.frets[s]; return f == null ? null : DEG[((OPEN_MIDI[s] + f - c.root) % 12 + 12) % 12]; }
  function thirdStr(c) { for (let s = 0; s < 6; s++) { const d = degOf(c, s); if (d === '3' || d === 'b3') return s; } return -1; }   // 3음이 있는 줄(0 = 1번줄) — 여섯 코드 모두 한 줄뿐

  // ── 소리 ──
  function strokeMidis(c) { return [5, 4, 3, 2, 1, 0].filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; }); }   // 6→1번줄, 안 울리는 줄(X) 뺌
  function ring(id) { J.strum(strokeMidis(chords()[id]), J.audioT0(), 2.2, 1.0); }   // 코드 소리 한 번(길게)

  // ── 피아노 건반 C4~D5(흰 건반 9개) — D2(note-names.js)와 같은 부품. 위 = 순번·도수, 아래 = 코드 이름(D2의 온/반 자리) ──
  const KB_LO = 60, KB_HI = 74, KW = 32, KH = 112, BW = 20, KB_W = KW * 9;
  const KEY_NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];   // 검은 건반 기본 이름은 b(앱 규칙). 트라이어드에서 짚을 땐 TRI_SPELL로 덮음(Caug의 G# 등)
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
    return '<div class="n2-kb" style="width:' + KB_W + 'px">' +
      '<div class="n12-kname" id="n12-kname"></div>' +   // 코드 이름 — 건반 위에 크게(사용자 지정)
      '<div class="n2-keys" style="height:' + KH + 'px">' + w + b + '</div>' +
      '<div class="n2-knums" id="n12-knums"></div></div>';   // 순번·도수 — 건반 아래(사용자 지정 2026-11-17)
  }
  const SCALE_C = [60, 62, 64, 65, 67, 69, 71, 72];
  const TRI = { C: [60, 64, 67], Cm: [60, 63, 67], Caug: [60, 64, 68], Cdim: [60, 63, 66] };
  const TRI_DEG = { C: ['1', '3', '5'], Cm: ['1', 'b3', '5'], Caug: ['1', '3', '#5'], Cdim: ['1', 'b3', 'b5'] };
  const TRI_SPELL = { C: ['C', 'E', 'G'], Cm: ['C', 'Eb', 'G'], Caug: ['C', 'E', 'G#'], Cdim: ['C', 'Eb', 'Gb'] };   // 건반에 보이는 음이름 — 내린 음은 b(D#이 아니라 Eb, 앱 규칙), 올린 음은 #
  const TRI_NAME = { C: 'C', Cm: 'Cm', Caug: 'Caug', Cdim: 'Cdim' };   // 코드명만(사용자 지정)
  const NAME_CM = 'C<span class="n12-kn-m">M</span>';   // 메이저 표기 M — 5번 칸에서 접히며 사라짐(M 생략 애니메이션)
  function key(m) { return q('.n2-key[data-m="' + m + '"]'); }
  function knum(m, text, k) {
    const n = document.createElement('span');
    n.className = 'n2-knum';
    n.dataset.k = k;
    n.style.left = keyCx(m) + 'px';
    n.textContent = text;
    $('n12-knums').appendChild(n);
    return n;
  }
  function kname(t) { const el = $('n12-kname'); el.innerHTML = t; el.classList.toggle('is-in', !!t); }   // t = 코드명(고정 문자열만 — NAME_CM은 마크업 포함)
  // 순번 1~8을 바로 그려 둠(스케일 소리 없이) — 2번 칸이 앞 칸 상태와 상관없이 같은 화면에서 시작하게
  function kbNums() {
    kbClear();
    SCALE_C.forEach(function (m, k) { setCls(key(m), 'is-scale', true); knum(m, k + 1, k).classList.add('is-in'); });
  }
  function kbClear() { setCls(q('.n2-key.is-focus'), 'is-focus', false); setCls(q('.n2-key.is-scale'), 'is-scale', false); $('n12-knums').innerHTML = ''; kname(''); }
  // 스케일 다시 듣기 — D2 pianoRun과 같은 레가토 + 소리 나는 건반만 잠깐 파랑, 위에 순번(1~8)이 차례로 남음(온/반은 이번엔 안 씀)
  function kbScale(stepMs) {
    const t0 = J.audioT0(), lead = J.leadMs(), ms = SCALE_C;
    ms.forEach(function (m, k) {
      const last = k === ms.length - 1;
      J.piano(m, t0 + k * stepMs / 1000, last ? 1.2 : stepMs / 1000);
      later(function () {
        if (k) setCls(key(ms[k - 1]), 'is-focus', false);
        setCls(key(m), ['is-focus', 'is-scale'], true);
        fx([knum(m, k + 1, k)], 'is-in', true);
      }, lead + k * stepMs);
    });
    later(function () { setCls(key(ms[ms.length - 1]), 'is-focus', false); }, lead + (ms.length - 1) * stepMs + 900);
    return wait(lead + (ms.length - 1) * stepMs + 900);
  }
  // 트라이어드 — 세 음을 함께(피아노) + 건반 파랑 + 위에 도수(hot = 파랑으로 짚을 도수 순번 0·1·2) + 아래 코드 이름. 화면은 소리와 같은 순간
  function kbTri(id, hot, nm) {   // nm = 이름 대신 보일 것(NAME_CM)
    setCls(q('.n2-key.is-focus'), 'is-focus', false);
    $('n12-knums').innerHTML = '';
    TRI[id].forEach(function (m, k) {
      setCls(key(m), 'is-focus', true);
      key(m).forEach(function (el) { el.querySelector('.n2-kl').textContent = TRI_SPELL[id][k]; });
      const n = knum(m, TRI_DEG[id][k], k);
      n.classList.add('is-in');
      if (hot && hot.indexOf(k) >= 0) n.classList.add('n12-hot');
    });
    kname(nm || TRI_NAME[id]);
  }
  function tri(id, hot, nm) {
    $('n12-lkb').classList.add('is-on');   // 이전 칸으로 돌아와 장면이 바뀌었어도 건반이 보이게(이미 켜져 있으면 그대로)
    const t = J.audioT0();
    TRI[id].forEach(function (m) { J.piano(m, t, 2.0); });
    later(function () { kbTri(id, hot, nm); }, J.leadMs());
    return wait(J.leadMs() + 1800);
  }

  // ── 다이어그램 — 큰 것 하나(캔버스 = 지판 + X + 코드 이름, 소리 나는 줄마다 DOM 점 6개에 도수). 정리 층은 Am·Dm·Em 세 개(점까지 캔버스, D7 정리 층과 같은 배치) ──
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48, ox: 70 };   // voicing-canvas.js 기준 치수(440×352) — ox = 개방현 O 자리
  const DIAG = { cv: 'n12-ct', wrap: 'n12-cwt', marks: 'n12-dgm', id: null };
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35, DZ_H = 160;   // D4 §4-22와 같은 값(CSS .n4-dz 160)
  function dw() {
    const sw = stageW(), B = VoicingCanvas;
    return Math.max(100, Math.min(sw * B.BASE_W / (2 * HALF_SPAN), DZ_H * B.BASE_W / FB_BOTTOM));
  }
  // 캔버스 하나에 그리기 — c = 코드(null이면 지판만). full = 점까지 캔버스에(정리 층, 손가락 번호 없음), 아니면 O·X·코드 이름만(누르는 점은 DOM)
  //  개방현 O는 항상 캔버스(다른 다이어그램과 같은 모양) — 도수 숫자만 DOM으로 그 위에 겹침(사용자 지정 2026-11-17: DOM 테두리 원이 찌그러져 보였음)
  //  강조는 항상 원을 채워서(테두리 원 금지 — 사용자 지정 2026-11-17): 3음 개방현(Em)도 DOM 점이 파랑으로 채워져 O를 덮음
  //  colors = 줄별 점 색(VoicingCanvas dotColors — 점 자체를 칠함, 덮는 원 없음 — 사용자 지정 2026-11-17) / noOpen = 캔버스 O를 그리지 않을 줄(그 자리는 DOM 점이 점 자체)
  function drawV(cv, c, w, full, colors, noOpen) {
    const e = (c || chords().E).entry, dpr = window.devicePixelRatio || 1, none6 = [null, null, null, null, null, null];
    VoicingCanvas.draw(cv, {
      frets: c ? e.frets.map(function (f) { return f > 0 && !full ? null : f; }) : none6,
      openMute: c ? e.openMute.map(function (v, s) { return s === noOpen ? null : v; }) : none6,
      barre: {}, barreRange: null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: none6,
    }, { chordName: c ? c.name : null, fingerNumMode: false, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, dotColors: colors || null });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  function cssBlue() { return getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff'; }
  function colorAt(s, col) { const a = [null, null, null, null, null, null]; a[s] = col; return a; }
  function paintDiag(id) {
    const cv = $(DIAG.cv);
    if (id !== undefined) DIAG.id = id;
    if (!cv || !DIAG.id) return;
    const w = dw(), box = $(DIAG.wrap);
    drawV(box.querySelector('.n4-base'), null, w);
    drawV(cv, chords()[DIAG.id], w, false, null, DIAG.noOpen);
    box.style.width = w + 'px';
    box.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';
    box.style.setProperty('--n4-w', w + 'px');
  }
  const DIAG_FADE_MS = 500;
  function fadeDiag(id) {   // 코드 이름·X는 이전 그림 옅어짐 + 새 그림 짙어짐(§4-24)
    const cv = $(DIAG.cv), box = $(DIAG.wrap), old = box && box.querySelector('.n4-old');
    if (!old || !DIAG.id || DIAG.id === id || J.skipping()) { paintDiag(id); return; }
    old.width = cv.width; old.height = cv.height; old.style.width = cv.style.width;
    old.getContext('2d').drawImage(cv, 0, 0);
    paintDiag(id);
    J.anim(old, [{ opacity: 1 }, { opacity: 0 }], { duration: DIAG_FADE_MS, easing: 'ease' });
    J.anim(cv, [{ opacity: 0 }, { opacity: 1 }], { duration: DIAG_FADE_MS, easing: 'ease' });
  }
  function markEl(s) { return document.querySelector('#' + DIAG.marks + ' [data-s="' + s + '"]'); }
  function markX(f) { return (f === 0 ? QD.ox : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%'; }
  // s줄 점 — 누르는 자리 = 검은 점, 개방현 = 배경 없이 숫자만(.n12-open — 캔버스 O 위에 겹침). 안에 도수(lab = 바로 보임)
  function placeMark(s, id, lab) {
    const el = markEl(s);
    if (!el) return;
    const c = id ? chords()[id] : null, f = c ? c.frets[s] : null;
    if (f == null) { el.classList.remove('is-on'); return; }
    el.classList.add('is-snap');
    el.style.left = markX(f);
    el.style.top = (QD.y0 + s * QD.sh) / VoicingCanvas.BASE_H * 100 + '%';
    el.style.width = QD.dot / VoicingCanvas.BASE_W * 100 + '%';
    el.classList.toggle('n12-open', f === 0);
    el.innerHTML = '<span class="n12-dl' + (lab ? ' is-in' : '') + '">' + degOf(c, s) + '</span>';
    void el.offsetWidth;
    el.classList.remove('is-snap');
    el.classList.add('is-on');
  }
  function showChord(id, lab) {
    DIAG.noOpen = -1;
    slideTok++;   // 끌기를 기다리던 점이 있으면 무효(남은 리스너는 다음 터치에서 스스로 떨어짐)
    for (let s = 0; s < 6; s++) { const el = markEl(s); if (el) el.classList.remove('n12-drag'); }
    q('.n12-hint').forEach(function (h) { h.remove(); });   // 끌기 힌트 잔상도 같이 치움
    paintDiag(id);
    for (let s = 0; s < 6; s++) { placeMark(s, id, lab); const el = markEl(s); if (el) el.classList.remove('n7-hot'); }
  }
  // 3음 직접 밀기(참여형, 사용자 지정 2026-11-17) — 3음 점만 끌 수 있고 지금 자리 ↔ 반음 낮은 자리 사이에서만 움직임.
  //  절반 넘게 끌고 놓으면 반음 낮은 자리로 스냅 → b3 + 코드 이름 + 마이너 소리 → 단계 끝. 절반이 안 되면 제자리로 돌아감.
  //  빨리 돌리는 중(J.skipping — 이전 칸 이동·페이즈 복원)이면 기다리지 않고 바로 완성(D1 waitTap과 같음). 엔진 타이머 poll로 건너뛰기 시작도 잡음.
  //  slideTok: 칸을 벗어난 뒤 남은 리스너가 다른 칸에서 반응하지 않게(새 밀기·showChord가 토큰을 바꿈)
  let slideTok = 0;
  function pctX(f) { return (f === 0 ? QD.ox : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100; }
  function waitSlide(maj, min) {
    $('n12-dg').classList.add('is-on');
    if (DIAG.id !== maj) showChord(maj, true);
    const tok = ++slideTok, s = thirdStr(chords()[maj]), el = markEl(s);
    const from = pctX(chords()[maj].frets[s]), to = pctX(chords()[min].frets[s]);   // to < from (반음 낮은 자리 = 너트 쪽 = 왼쪽)
    return new Promise(function (res) {
      let drag = null, done = false;
      // 끌 방향 힌트(사용자 지정 2026-11-17 — 깜빡임 대신): 파란 원이 지금 자리에서 반음 낮은 자리로 미끄러지며 잔상 3개를 남김(반복). 처음 잡는 순간 사라짐
      let hints = [];
      const hintOff = function () { hints.forEach(function (h) { h.remove(); }); hints = []; };
      const hintOn = function () {
        hints = [0.5, 0.3, 0.15].map(function (a, i) {
          const h = document.createElement('span');
          h.className = 'n12-hint';
          h.style.cssText = 'top:' + el.style.top + ';width:' + el.style.width + ';--n12-from:' + from + '%;--n12-to:' + to + '%;animation-delay:' + (i * 0.07) + 's';
          h.innerHTML = '<i style="opacity:' + a + '"></i>';
          el.parentNode.insertBefore(h, el);   // 점 아래에 깔림
          return h;
        });
      };
      const off = function () {
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { el.removeEventListener(t, [down, move, up, up][i]); });
        el.classList.remove('n12-drag', 'is-snap');
        hintOff();
      };
      const finish = function () {
        if (done) return;
        done = true;
        off();
        if (tok !== slideTok) return;
        el.style.left = to + '%';   // 남은 거리는 CSS 전환으로
        later(function () {
          if (chords()[min].frets[s] === 0) DIAG.noOpen = s;   // E → Em: 개방현 3음은 캔버스 O 대신 DOM 점이 파랑으로 채워진 점 자체(덮지 않음)
          placeMark(s, min, true); el.classList.add('n7-hot'); fadeDiag(min); ring(min);
          later(res, J.leadMs() + 600);
        }, J.skipping() ? 0 : 300);
      };
      const stale = function () { if (tok === slideTok && !done) return false; off(); return true; };
      function down(e) {
        if (stale()) return;
        e.preventDefault();
        hintOff();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        drag = { x0: e.clientX, W: $(DIAG.wrap).getBoundingClientRect().width, p: from };
        el.classList.add('is-snap');   // 끄는 동안은 손가락을 바로 따라옴(전환 없음)
      }
      function move(e) {
        if (!drag || stale()) return;
        drag.p = Math.max(to, Math.min(from, from + (e.clientX - drag.x0) / drag.W * 100));
        el.style.left = drag.p + '%';
      }
      function up() {
        if (!drag || stale()) return;
        const prog = (from - drag.p) / (from - to);
        drag = null;
        el.classList.remove('is-snap');
        if (prog >= 0.5) finish(); else el.style.left = from + '%';   // 절반 이상 → 스냅, 아니면 제자리로(CSS 전환)
      }
      if (J.skipping()) { finish(); return; }
      el.classList.add('n12-drag');
      hintOn();
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { el.addEventListener(t, [down, move, up, up][i]); });
      (function poll() { later(function () { if (done) return; if (J.skipping()) finish(); else poll(); }, 200); })();
    });
  }
  function chordStep(id) {   // 장조 모양(도수 보임) + 소리
    return show('n12-dg', function () { showChord(id, true); }).then(function () { ring(id); return wait(J.leadMs() + 2000); });
  }

  // 정리 층 — Am·Dm·Em 세 칸(D7 paintTrio와 같은 배치). hot = b3 자리 점 자체를 파랑으로(캔버스 dotColors — Em은 개방현 O 대신 파랑 점)
  const TRIO = ['Am', 'Dm', 'Em'];
  let trioHot = false;
  function paintTrio(hot) {
    if (hot !== undefined) trioHot = hot;
    const B = VoicingCanvas, w = Math.max(80, Math.min(stageW() / 3 * B.BASE_W / (2 * HALF_SPAN), DZ_H * B.BASE_W / FB_BOTTOM));
    q('#n12-trio canvas').forEach(function (cv) {
      const c = chords()[cv.dataset && cv.dataset.c];
      if (!c) return;
      const s = thirdStr(c);
      drawV(cv, c, w, true, trioHot ? colorAt(s, cssBlue()) : null);
      cv.style.marginLeft = -(FB_CX / B.BASE_W * w) + 'px';
    });
  }

  // 정리 표 — 네 가지 트라이어드의 도수(3음 칸 = .n12-c3)
  //  순서 = 밝음 → 어두움(aug · M · m · dim), 이름은 기호만(브랜드색). 오른쪽 세로 양방향 화살표 = 위 핑크 → 아래 블루 그라데이션(밝음 → 어두움 시각 장치, 사용자 지정 2026-11-17)
  const SUM_ROWS = [['Caug', 'aug'], ['C', 'M'], ['Cm', 'm'], ['Cdim', 'dim']];
  //  화살표 = 두꺼운 막대 + 꽉 찬 삼각형 머리(한 도형, 그라데이션으로 채움), 위아래에 '밝음'·'어두움' 라벨(사용자 지정 2026-11-17)
  const SUM_ARROW = '<div class="n12-arrow"><span class="n12-al n12-al--top">밝음</span>' +
    '<svg class="n12-arrow-svg" viewBox="0 0 20 92" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="n12-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="92"><stop offset="0" style="stop-color:var(--icon-pink)"/><stop offset="1" style="stop-color:var(--blue)"/></linearGradient></defs>' +
    '<path fill="url(#n12-grad)" d="M10 0L20 14H14V78H20L10 92L0 78H6V14H0Z"/></svg>' +
    '<span class="n12-al n12-al--bot">어두움</span></div>';
  function sumHtml() {
    return '<div class="n12-sumwrap"><div class="n12-tbl">' + SUM_ROWS.map(function (r) {
      return '<div class="n12-row" data-r="' + r[0] + '"><span class="n12-rn">' + r[1] + '</span>' +
        TRI_DEG[r[0]].map(function (d, k) { return '<span class="n12-c' + (k === 1 ? ' n12-c3' : '') + '">' + d + '</span>'; }).join('') + '</div>';
    }).join('') + '</div>' + SUM_ARROW + '</div>';
  }

  // 마무리 — 메이저·마이너만(aug·dim 잡는 법은 아직 안 다룸, 사용자 지정 2026-11-24): 기호(M · m) + 아래 도수(1 3 5 / 1 b3 5), 3음 칸 = .n12-c3(정리 표와 같은 파랑 강조)
  const MM_ROWS = [['C', 'M'], ['Cm', 'm']];
  function mmHtml() {
    return '<div class="n12-mm">' + MM_ROWS.map(function (r) {
      return '<div class="n12-mmcol" data-r="' + r[0] + '"><span class="n12-mmname">' + r[1] + '</span><div class="n12-mmdeg">' +
        TRI_DEG[r[0]].map(function (d, k) { return '<span class="n12-c' + (k === 1 ? ' n12-c3' : '') + '">' + d + '</span>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
  }

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');   // 무대·문구 위치는 다른 노드와 같음(220px, 본문 가운데 정렬)
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.warmupPiano) GuitarAudio.warmupPiano();   // 건반 시연용 피아노 샘플(CDN)을 미리 불러옴(D2와 같음)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="n12-lkb">' + kbHtml() + '</div>' +
      '<div class="jl-layer" id="n12-sum">' + sumHtml() + '</div>' +
      '<div class="jl-layer" id="n12-mm">' + mmHtml() + '</div>' +
      '<div class="jl-layer n4-full" id="n12-dg"><div class="n4-stack"><div class="n4-dz"><div class="n4-cw" id="' + DIAG.wrap + '"><canvas class="n4-base"></canvas><canvas class="n4-cur" id="' + DIAG.cv + '"></canvas><canvas class="n4-old"></canvas>' +
        '<div class="n4-dots" id="' + DIAG.marks + '">' + [0, 1, 2, 3, 4, 5].map(function (s) { return '<span class="n4-dot" data-s="' + s + '"></span>'; }).join('') + '</div></div></div></div></div>' +
      '<div class="jl-layer n4-full" id="n12-trio"><div class="n4-stack"><div class="n4-dz"><div class="n5-trio">' + TRIO.map(function (id) { return '<div class="n5-tc"><canvas data-c="' + id + '"></canvas></div>'; }).join('') + '</div></div></div></div>' +
      '</div>';
    showChord('A', false); paintTrio();
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { paintDiag(); paintTrio(); });
    }
  }

  // ── 화면 도구(D4와 같음) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { [].concat(c).forEach(function (x) { el.classList.toggle(x, on); }); }); }
  function show(id, prepare) {
    if (prepare) prepare();
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 적용·복습)은 주석 ──
  //  강의 최종 목적: 코드 = 1·3·5음, 3음이 메이저·마이너를 정한다 → 이미 아는 여섯 코드에서 3음 자리를 안다(퀴즈 ②). aug·dim은 공식만(퀴즈 ①)
  // 솔로연주 비기너 D19(2026-11-24 순서 변경): 바로 앞 D18에서 기초 코드 9가지·다이어그램을 배우고 옴 → 코드반주와 같은 강의(솔로 전용 문구 없음)
  const steps = [
    // P1 원리
    // 0 핵심(새 내용): 오늘 목표 — 코드가 만들어지는 원리 + 코드 이론이 왜 중요한가 + 부담 덜기(문구 사용자 지정 2026-11-24, 코드반주는 둘째 문구만 반주·솔로 순서로). 끝 화면 = 빈 건반
    J.chainSteps([
      { text: '이번 시간에는 ' + em('코드가 만들어지는 원리') + '를\n좀 더 자세히 알아볼게요!', scene: 'n12-lkb', run: function () { return show('n12-lkb', kbClear); } },
      { text: SOLO ? '코드 반주뿐만 아니라 솔로잉에서도\n' + em('코드 이론') + '은 굉장히 중요해요!' : '코드 반주를 할 때도, 나중에 솔로를 할 때도\n' + em('코드 이론') + '은 굉장히 중요해요!', run: none },
      { text: '너무 어렵지 않은 코드 이론부터\n학습해 나갈 거니 걱정 마세요!', run: none },
      { text: '지금은 잘 이해가 되지 않아도\n흐름에 따라가 주시면 충분해요~!', run: none },
    ]),
    // 1 핵심(복습 — D2): C 메이저스케일 = 건반 C부터 순번 1~8. 끝 화면 = 흰 건반 이름 진하게 + 위에 1~8
    { text: em('C 메이저스케일') + ' 기억나시죠?', scene: 'n12-lkb', ms: 4670, run: function () {
      return show('n12-lkb', kbClear).then(function () { return kbScale(450); });
    } },
    // 2 핵심(새 내용): 1·3·5번째 음을 함께 = C코드. 나머지 순번은 옅게. 끝 화면 = C·E·G 파랑 + 'C코드'
    Object.assign(J.chainSteps([
      { text: '여기서 ' + em('1번째, 3번째, 5번째') + ' 음을\n함께 누르면', gap: 2200, run: function () {   // gap = 다음 문구까지 짧게(앞 문장의 앞부분이라 생각할 거리가 없음 — 사용자 지정)
        $('n12-lkb').classList.add('is-on');
        if (q('#n12-knums .n2-knum').length !== SCALE_C.length) kbNums();
        setCls(q('#n12-knums .n2-knum').filter(function (n) { return [0, 2, 4].indexOf(+n.dataset.k) < 0; }), 'n12-dim', true);
        return wait(400);
      } },
      { text: '바로 ' + em('C코드') + '가 돼요!', run: function () { return tri('C'); } },
    ]), { ms: 4220 }),
    // 3 핵심(새 내용): 용어 — 1음(근음)·3음·5음, 도수(퀴즈에서 쓰는 말), 트라이어드 = 1음·3음·5음 세 음으로 만든 코드(트라이 = 3을 뜻하는 말 — 사용자 지정 2026-11-24, '쌓아 만든'은 애매해서 바꿈). 끝 화면 = C코드 + 위에 1·3·5
    J.chainSteps([
      { text: '이 세 음을 차례로 ' + em('1음(근음)') + ', ' + em('3음') + ',\n' + em('5음') + '이라고 불러요', run: function () { kbTri('C'); return wait(400); } },
      { text: '1, 3, 5처럼 몇 번째 음인지 나타내는 숫자를\n' + em('도수') + '라고 해요', run: none },
      { text: '이렇게 1음, 3음, 5음 ' + em('세 가지 음') + '으로\n만든 코드를 ' + em('트라이어드') + '라고 해요', run: function () { return tri('C'); } },
      { text: em('트라이') + '는 ' + em('3') + '을 뜻하는 말이라\n' + em('3가지 음') + '으로 만든 코드라는 뜻이에요', run: none },
    ]),

    // P2 3음
    // 4 핵심(새 내용 — 처음 설명하듯, 지난 노드 언급 없음 — 사용자 지정): 이름에 아무것도 없는 코드 = 메이저(정의 먼저) → 메이저 코드에서 3음을 반음 낮추면 마이너 코드. C → Cm(E → Eb, 도수 b3 파랑). 끝 화면 = Cm
    J.chainSteps([
      { text: 'C코드처럼 이름에 아무것도 붙지 않은 코드를\n' + em('메이저 코드') + '라고 해요', run: function () { return tri('C'); } },
      { text: '메이저 코드에서 ' + em('3음') + '을 반음 낮추면\n' + em('마이너 코드') + '가 돼요!', run: function () { return tri('Cm', [1]); } },
    ]),
    // 5 핵심(새 내용 — 노드 핵심): 표기(M은 보통 생략, m) + 3음이 메이저·마이너를 정함. 끝 화면 = Cm(b3 파랑)
    Object.assign(J.chainSteps([
      { text: '메이저는 ' + em('M') + ', 마이너는 ' + em('m') + '으로 표시하는데\n메이저의 M은 보통 생략해요', enter: function () { kbTri('C', [1], NAME_CM); }, run: function () {   // enter = 문구와 같은 순간 'CM'으로(앞 칸 Cm이 남지 않게)
        // M 생략 애니메이션(사용자 지정): CM 소리 → M이 접히며 사라져 'C' → Cm 소리
        return tri('C', [1], NAME_CM).then(function () {
          setCls(q('.n12-kn-m'), 'is-gone', true);
          return wait(900);
        }).then(function () { return tri('Cm', [1]); });
      } },
      { text: '이렇게 ' + em('3음') + '이 메이저와 마이너를\n정하는 거죠!', run: none },
    ]), { ms: 10440 }),   // 실측(scripts/journey-lesson-timing.js)

    // P3 5음(언급만 — 사용자 지정: 공식 + 소리 한 칸)
    //  메이저에서 5음을 올리면 aug(더 밝게), 마이너에서 5음을 내리면 dim(더 어둡게) — 순서·설명 사용자 지정(2026-11-16).
    //  밝게·어둡게는 D7 '코드 느낌을 형용사로 정하지 않음'의 예외(사용자 지정).
    //  aug와 dim은 칸을 나눔(사용자 지정 2026-11-17, 가이드 §4-19 멈춤 지점 — 하나만 다시 볼 수 있게)
    // 6 핵심(새 내용, 가볍게): 5음으로 만드는 두 코드 중 aug — 메이저에서 5음을 반음 올림, 읽는 법·뜻. 끝 화면 = Caug
    J.chainSteps([
      // 5음을 '그냥 바꿔 보기'가 아니라 3음(메이저·마이너)에서 이어지게(사용자 지정 2026-11-16). '트라이어드는 1음, 3음, 5음으로…' 줄은 3번 칸 정의와 중복이라 뺌(사용자 지정 2026-11-17)
      { text: '3음이 메이저와 마이너를 정했다면\n' + em('5음') + '으로는 두 가지 코드가 더 만들어져요', enter: function () { kbTri('C', [2]); }, run: function () { return tri('C', [2]); } },   // enter = 문구와 같은 순간 C코드로(앞 칸 Cm이 1초 남지 않게, 가이드 §4-20)
      { text: '메이저 코드에서 5음을 반음 올리면\n' + em('aug') + ' 코드예요', run: function () { return tri('Caug', [2]); } },
      { text: 'aug는 ' + em('어그먼트') + '라고 읽어요\n\'증가된\'이라는 뜻으로\n5음이 올라가 메이저를 ' + em('더 밝게') + ' 만들어요', run: none },   // augmented = 증가된(사용자 지정 2026-11-17) — 읽는 법·뜻(사용자 지정)
    ]),
    // 7 핵심(새 내용, 가볍게): dim — 마이너에서 5음을 반음 내림, 읽는 법·뜻 + aug·dim은 만드는 방법만 기억. 끝 화면 = Cdim
    Object.assign(J.chainSteps([
      { text: '마이너 코드에서 5음을 반음 내리면\n' + em('dim') + ' 코드예요', enter: function () { kbTri('Cm', [2]); }, run: function () {   // enter = 문구와 같은 순간 Cm으로(앞 Caug가 남지 않게) → 소리와 함께 Cm → Cdim
        return tri('Cm', [2]).then(function () { return tri('Cdim', [2]); });
      } },
      { text: 'dim은 ' + em('디미니쉬') + '라고 읽어요\n\'감소된\'이라는 뜻으로\n5음이 내려가 마이너를 ' + em('더 어둡게') + ' 만들어요', run: none },   // diminished = 감소된(사용자 지정 2026-11-17) — 읽는 법·뜻(사용자 지정)
      { text: 'aug와 dim은 지금 단계에서는\n' + em('구성 원리') + '만 기억해두세요!', run: none },
    ]), { ms: 16590 }),   // 실측(scripts/journey-lesson-timing.js)
    // 8 핵심(정리 — 퀴즈 ①의 근거): 네 가지 공식 표, 한 줄씩 소리와 함께 → 3음 칸(메이저·마이너) 파랑. 끝 화면 = 표 + 3음 칸 파랑
    Object.assign(J.chainSteps([
      { text: '네 가지 트라이어드를\n정리해볼게요', scene: 'n12-sum', run: function () {
        return show('n12-sum', function () { setCls(q('.n12-row, .n12-arrow'), 'is-in', false); setCls(q('.n12-c3'), 'is-hot', false); }).then(function () {
          const t0 = J.audioT0();
          SUM_ROWS.forEach(function (r, k) {
            TRI[r[0]].forEach(function (m) { J.piano(m, t0 + k * 0.9, 0.85); });
            later(function () { setCls(q('.n12-row[data-r="' + r[0] + '"]'), 'is-in', true); }, J.leadMs() + k * 900);
          });
          later(function () { setCls(q('.n12-arrow'), 'is-in', true); }, J.leadMs() + 3 * 900 + 300);   // 네 줄이 다 나온 뒤 화살표(밝음 → 어두움)
          return wait(J.leadMs() + 3 * 900 + 600);
        });
      } },
      { text: '그중 메이저와 마이너를 가르는\n' + em('3음') + '이 가장 중요해요!', run: function () {
        setCls(q('.n12-row[data-r="C"] .n12-c3, .n12-row[data-r="Cm"] .n12-c3'), 'is-hot', true);
        return wait(400);
      } },
    ]), { ms: 9870 }),

    // P4 기타에서
    // 9 핵심(새 내용): 기타 다이어그램에서 도수 읽기 — A코드(점·O에 1·3·5), 같은 도수가 여러 줄에 겹침. 끝 화면 = A + 도수
    J.chainSteps([
      { text: '이제 기타 코드에서도\n' + em('1음·3음·5음') + '을 찾아볼게요', scene: 'n12-dg:A', run: function () {
        return show('n12-dg', function () { showChord('A', false); }).then(function () { ring('A'); return wait(J.leadMs() + 1600); });
      } },
    ].concat([
      { text: '이미 배운 ' + em('A코드') + '의 음에\n도수를 표시하면 이렇게 돼요', run: function () {
        return fx(q('#n12-dgm .n12-dl').reverse(), 'is-in', true, 150);   // 6번줄 쪽부터
      } },
      { text: '기타는 줄이 많아서 1음과 5음이\n여러 번 겹쳐 나오기도 해요', run: none },
    ])),
    // 10~12 참여형(사용자 지정 2026-11-17): 질문 → 학습자가 3음 점을 반음 낮은 자리로 직접 밀어 마이너를 만듦 → 확인.
    //  A·D·E 운지는 익숙하므로 '3음을 움직이면 M → m'을 손으로 인지시키는 것이 목적. 밀기 전엔 '다음'이 잠김(lock, D1 직접 눌러 보기와 같음)
    // 10 핵심(적용·참여): A코드의 3음(2번줄)을 직접 반음 낮춰 Am. 끝 화면 = Am(b3 파랑) + Am 소리
    Object.assign(J.chainSteps([
      { text: em('A코드') + '의 3음을 반음 낮추면\n어떤 코드가 될까요?', scene: 'n12-dg:A', gap: 2600, run: function () { $('n12-dg').classList.add('is-on'); showChord('A', true); return none(); } },
      { text: '숫자 3이 적힌 점을\n반음 낮은 자리로 직접 밀어보세요!', gap: 800, run: function () { return waitSlide('A', 'Am'); } },
      { text: '정답이에요!\n' + em('Am코드') + '가 됐어요!', gap: 1800, run: function () { return wait(1200); } },
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }),
    // 11 핵심(적용·참여): D → Dm — 3음(1번줄)을 직접. 끝 화면 = Dm(b3 파랑)
    Object.assign(J.chainSteps([
      { text: '이번엔 ' + em('D코드') + '예요', scene: 'n12-dg:D', gap: 2600, run: function () { return chordStep('D'); } },
      { text: em('D코드') + '의 3음도\n반음 낮은 자리로 밀어보세요!', gap: 800, run: function () { return waitSlide('D', 'Dm'); } },
      { text: '정답이에요!\n' + em('Dm코드') + '가 됐어요!', gap: 1800, run: function () { return wait(1200); } },
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }),
    // 12 핵심(적용·참여 — 개방현 예외): E → Em — 3번줄 1프렛의 3음을 개방현 자리로. 끝 화면 = Em(개방현 b3 파랑)
    Object.assign(J.chainSteps([
      { text: '마지막으로 ' + em('E코드') + '예요', scene: 'n12-dg:E', gap: 2600, run: function () { return chordStep('E'); } },
      { text: em('E코드') + '의 3음도\n반음 낮은 자리로 밀어보세요!', gap: 800, run: function () { return waitSlide('E', 'Em'); } },
      { text: '정답이에요! 3음이 3번줄 ' + em('개방현') + '이 되면서\n' + em('Em코드') + '가 됐어요!', gap: 2200, run: function () { return wait(1200); } },
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }),
    // 13 핵심(정리): 세 코드 모두 3음만 반음 낮아져 마이너. Am·Dm·Em 나란히 + b3 자리 고리. 끝 화면 = 세 다이어그램 + 고리
    { text: '세 코드 모두 ' + em('3음') + '만 반음 낮아져서\n마이너 코드가 됐어요', scene: 'n12-trio', run: function () {
      return show('n12-trio', function () { paintTrio(false); }).then(function () { paintTrio(true); return wait(1200); });
    } },
    // P5 마무리(사용자 지정 2026-11-24 — 페이즈4에서 분리, 문구 사용자 지정)
    // 14 핵심: aug·dim은 잡는 법만 아직 안 다룸(도수는 다룸 — 퀴즈에도 나옴, 사용자 정정 2026-11-24) → 메이저·마이너를 가르는 3음 → 다음 할 일(퀴즈). 끝 화면 = M · m + 도수, 3음 칸 파랑
    J.chainSteps([
      { text: '트라이어드 코드에서 ' + em('aug') + '와 ' + em('dim') + ' 코드를\n잡는 법은 아직은 다루지 않을 거예요!', scene: 'n12-mm', run: function () {
        return show('n12-mm', function () { setCls(q('.n12-mmcol'), 'is-in', false); setCls(q('#n12-mm .n12-c3'), 'is-hot', false); }).then(function () {
          const t0 = J.audioT0();
          MM_ROWS.forEach(function (r, k) {
            TRI[r[0]].forEach(function (m) { J.piano(m, t0 + k * 0.9, 0.85); });
            later(function () { setCls(q('.n12-mmcol[data-r="' + r[0] + '"]'), 'is-in', true); }, J.leadMs() + k * 900);
          });
          return wait(J.leadMs() + 900 + 600);
        });
      } },
      { text: '대신 ' + em('메이저') + '와 ' + em('마이너') + ' 코드를 결정하는\n' + em('3음') + '의 역할은 확실하게 알고 넘어가 주세요!', run: function () { setCls(q('#n12-mm .n12-c3'), 'is-hot', true); return wait(400); } },
      { text: '이제 9가지 기초 코드도 한 번 더 복습하고\n코드의 3음을 찾는 훈련을 해봅시다!', run: none },
    ]),
  ];
  const groups = [[0, 1, 2, 3], [4, 5], [6, 7, 8], [9, 10, 11, 12, 13], [14]];

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D7(minor-chords.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D11과 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-16):
  //     ① deg — 도수 ↔ 코드 종류 4지선다(2×2 글자 카드, 누르는 즉시 채점). 두 방향 반반: 도수(1 - b3 - 5) → 종류 / 종류 → 도수.
  //        보기는 네 가지 전부, 순서 고정(메이저·마이너·aug·dim). 보기 이름은 기호만(M·m·aug·dim), 도수는 '-' 없이 간격만(사용자 지정 2026-11-17). 정답 M·m 60% · aug·dim 40%(사용자 지정)
  //     ② third — D·Dm·E·Em·A·Am 중 하나의 다이어그램(점·O·X만 — 사용자 지정, 도수·음이름 없음)에서 3음을 찾아 누름(누르는 즉시 채점 + 누른 음 소리)
  //   문제 수(사용자 지정): 별 1 10 / 별 2 15 / 별 3 15. 유형 나눔 잠정값 5·5 / 8·7 / 7·8
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:triads
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10, deg: 5, third: 5 }, 2: { n: 15, deg: 8, third: 7 }, 3: { n: 15, deg: 7, third: 8 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'triads';
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

  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 보기·순서도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  const QZ_CHORDS = ['A', 'Am', 'D', 'Dm', 'E', 'Em'];   // 3음 찾기 풀(사용자 지정)
  const TYPES = ['C', 'Cm', 'Caug', 'Cdim'];             // 종류 순서 = 보기 순서(고정) — 강의 정리 표와 같은 순서
  const TYPE_LABEL = { C: 'M', Cm: 'm', Caug: 'aug', Cdim: 'dim' };   // 기호만(사용자 지정 2026-11-17)
  function formula(t) { return TRI_DEG[t].join(' '); }   // '1 b3 5' — '-' 없이 숫자 사이 반각 공백(en space) 하나만(사용자 지정 2026-11-17)
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function balanced(n, pool) { const o = rnd(pool.length), a = []; for (let k = 0; k < n; k++) a.push(pool[(k + o) % pool.length]); return shuffle(a); }   // 풀 안에서 고르게(나머지는 무작위 시작점에서)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const nAD = Math.round(cfg.deg * 0.4);   // aug·dim 정답 수(40%, 사용자 지정) — 나머지는 메이저·마이너
    const ans = balanced(cfg.deg - nAD, ['C', 'Cm']).concat(balanced(nAD, ['Caug', 'Cdim']));
    const dir = shuffle(Array.from({ length: cfg.deg }, function (_, k) { return k % 2 ? 't2f' : 'f2t'; }));
    shuffle(ans).forEach(function (t, k) { qs.push({ type: 'deg', variant: dir[k], answer: t }); });
    balanced(cfg.third, QZ_CHORDS).forEach(function (c) { qs.push({ type: 'third', chord: c }); });
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
  }
  // 3음 찾기 다이어그램 — 점·O·X만(손가락 번호·도수·코드 이름 없음 — 코드 이름은 안내 카드에)
  const QD_W = 300;   // 다이어그램 폭(최대)
  function paintQ(cv, c, w, colors) {
    const e = c.entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, { frets: e.frets, openMute: e.openMute, barre: {}, barreRange: null, fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: [null, null, null, null, null, null] },
      { chordName: null, fingerNumMode: false, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true, dotColors: colors || null });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
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
  //  deg = 코드 맞추기 문제 화면 템플릿(문제 카드 .ms-quiz-question-card + 말풍선 + 2×2 글자 카드) — 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  third = 안내 카드 + 다이어그램(소리 나는 점·O를 누르면 즉시 채점)
  const QZ_TITLES = { deg: '알맞은 답을 고르세요', third: '알맞은 답을 눌러주세요' };   // 타이틀은 일반 문구(D7과 같은 방식) — 문제 내용은 카드에

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

  // ── 소리 — 문제 전환·답 고르기·오답풀이 진입·완주·이탈에서 하드컷(CLAUDE.md 0-7). 이 퀴즈의 소리는 3음 찾기에서 누른 음뿐
  function stopSound() {
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }

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
    if (it.type === 'deg' && it.variant === 'f2t') {   // 도수를 보고 코드 종류 고르기
      box.innerHTML = cardQuizHtml('', formula(it.answer), '', '어떤 코드일까요?', TYPES.map(function (t) { return TYPE_LABEL[t]; }), true);
      box.querySelectorAll('.ms-quiz-choice-card').forEach(function (b, k) { b.dataset.v = TYPES[k]; });
      bindChoices();
    } else if (it.type === 'deg') {   // 코드 종류를 보고 도수 고르기
      box.innerHTML = cardQuizHtml('', TYPE_LABEL[it.answer], '', '알맞은 도수를 고르세요', TYPES.map(formula), true);
      box.querySelectorAll('.ms-quiz-choice-card').forEach(function (b, k) { b.dataset.v = TYPES[k]; });
      bindChoices();
    } else {   // 3음 찾기
      box.innerHTML = infoCard(it.chord + '코드에서', '3음을', '찾아 눌러주세요') +
        '<div class="jq-board"><div class="n3q-wrap" id="n3q-wrap"><canvas class="n3q-cv"></canvas><div class="n3q-dots" id="n3q-dots"></div></div></div>';
      const w = Math.min(box.clientWidth, QD_W);
      $('n3q-wrap').style.width = w + 'px';
      $('n3q-wrap').style.setProperty('--n3q-w', w + 'px');
      paintQ(box.querySelector('.n3q-cv'), chords()[it.chord], w);
      thirdMiss = [];   // 새로 그린 문제는 빨강 없이 시작
      $('n3q-wrap').addEventListener('click', thirdTap);
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
  // ── 3음 찾기 — 소리 나는 자리(누르는 점 = 그 프렛 칸, 개방현 = 너트 왼쪽 O 자리)를 누르면 그 음이 울리고 바로 채점.
  //  정답 = 초록 고리, 틀린 자리 = 빨강 고리 + 정답 자리 초록 고리(오답풀이에선 '다시 풀기'로 맞힐 때까지 — CLAUDE.md 0-8).
  //  줄 = 세로 위치(줄 간격 38.4의 가운데까지), 그 줄 음 자리의 가로 칸 안을 눌렀을 때만 받음(뮤트 줄·빈 칸은 무시). 기준 치수는 voicing-canvas.js(440×352)
  function thirdPos(e, c) {
    const r = $('n3q-wrap').querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const s = Math.round((by - QD.y0) / QD.sh);
    if (s < 0 || s > 5 || c.frets[s] == null) return -1;
    const f = c.frets[s], lo = f === 0 ? QD.ox - QD.fw / 2 : QD.x0 + (f - 1) * QD.fw, hi = f === 0 ? QD.x0 : QD.x0 + f * QD.fw;
    return bx >= lo && bx <= hi ? s : -1;
  }
  function thirdTap(e) {
    if (!qz || qz.judged) return;
    const it = cur(), c = chords()[it.chord], s = thirdPos(e, c);
    if (s < 0) return;
    J.note(OPEN_MIDI[s] + c.frets[s], J.audioT0(), 1.4, 0.6);   // 누른 자리 음(틀려도 — D1 직접 눌러 보기와 같음)
    const ans = thirdStr(c), ok = s === ans, cv = $('n3q-wrap').querySelector('canvas');
    // 오답풀이(CLAUDE.md 0-8, 사용자 지정 2026-11-17): 틀리면 그 점만 빨강으로 남기고(정답은 보여 주지 않음) 같은 화면에서 계속 — 맞힐 때까지.
    //  틀린 점의 빨강은 맞힌 뒤에도 유지. 화면이 그려질 때(render) thirdMiss를 비움
    if (qz.phase === 'review' && !ok) {
      if (thirdMiss.indexOf(s) < 0) thirdMiss.push(s);
      const col = [null, null, null, null, null, null];
      thirdMiss.forEach(function (x) { col[x] = '#FF3B30'; });
      paintQ(cv, c, parseFloat(cv.style.width), col);
      setTimeout(function () { if (qz && !qz.quit && !qz.judged) judgeSound(false); }, 250);   // 누른 음이 먼저, 오답음은 조금 뒤
      return;
    }
    const col = colorAt(ans, '#34C759');   // 정답 초록 · 누른 오답 빨강 — 점(개방현은 O 대신 채운 점) 자체를 칠함(.n3q-dot 정답·오답과 같은 색)
    if (!ok) col[s] = '#FF3B30';
    thirdMiss.forEach(function (x) { col[x] = '#FF3B30'; });   // 오답풀이에서 앞서 틀린 점은 맞힌 뒤에도 빨강
    paintQ(cv, c, parseFloat(cv.style.width), col);
    verdict(ok, 250);   // 누른 음이 먼저, 정답·오답음은 조금 뒤
  }
  let thirdMiss = [];   // 오답풀이 중 이 문제에서 틀리게 누른 줄들

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
    if (!qz.judged) return;   // 두 유형 모두 누르는 즉시 채점 — 제출하기는 쓰지 않음
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
    $('combo-v2-clear-level').textContent = '트라이어드 코드 · 퀴즈 ' + qz.star;
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
    if (qz) qz.quit = true;   // 늦게 오는 정답·오답음 막음
    sessClear();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');   // 이미 받은 도중 환급은 서버에 반영(회수하지 않음 — §1-5)
    overlayAbort();
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });



  J.register('triads', { layers: ['n12-lkb', 'n12-sum', 'n12-mm', 'n12-dg', 'n12-trio'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 14, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 14 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
