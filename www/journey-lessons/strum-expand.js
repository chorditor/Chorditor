// ───────────────────────────────────────────────────────────
// 여정 노드: 주법 확장하기 (코드반주 D9)
//   D8(f-chord.js) 퀴즈 엔진 + D4(stroke-basics.js) 주법 칸 도구를 복사해 만듦(2026-11-15 사용자 기획). 설명 단계 + 퀴즈.
//   목적(사용자 지정): 4비트(D4)에서 넓혀 8비트 주법 세 가지를 익힘 —
//     ① 8비트 다운 스트로크, 2·4번째 박 강세(박 = 4분음표 — 8비트에선 두 칸이 한 박) ② 8비트 다운업, 1·3번째 박 강세
//     ③ 헛 스트로크(동작은 하지만 줄은 치지 않음) 첫 개념 — D-DUD-DU, 1·3번째 박 강세
//   흐름: 8비트 = 한 박에 두 번 → 다운 8번 → 2·4박 강세 → 다운업 → 1·3박 강세 → 헛 스트로크 정의 → D-DUD-DU
//   화면: 위 = E 다이어그램(점까지 캔버스), 아래 = 주법 칸 8개(코드반주 훈련 .strum-play-grid 그대로 — 2칸마다 굵은 박 구분선 .strum-beat-grid--g2,
//         헛 스트로크 = 훈련과 같은 흐린 기호 .strum-ico--ghost). 강세 기호(D4 .n4-vm, 악보 표준 >)는 칸마다 하나씩(JS placeVm). 층·요소 id는 n9-*
//   연습 코드 E, 70bpm(D4와 같음 — 사용자 승인)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — 강의 = E, 퀴즈 코드진행 = 작은 별 A키(A·D·E)·G키(G·C·D)·C키(C·F·G). 운지는 앞 노드와 같음. 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
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
      C: mk('C', [null, 1, null, 2, 3, null]), G: mk('G', [4, null, null, null, 2, 3]), F: mk('F', [1, 1, 2, 3, null, null]) };   // 운지는 앞 노드와 같음(D6 C·G, D8 F xx3211)
    return CHORDS;
  }

  // ── 소리 — 줄 선택(D4와 같음): 'all' 6→1번줄 / 'w4' 1~4번줄(4→1) / 'l3' 6~4번줄(6→4, 8비트 다운의 약박 — 사용자 지정) / 'u3' 1~3번줄(1→3, 업 스트로크). 안 울리는 줄(X)은 뺌 ──
  function strokeMidis(c, kind) {
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : kind === 'w4' ? [3, 2, 1, 0] : kind === 'l3' ? [5, 4, 3] : [0, 1, 2];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  const BEAT_MS = 60000 / 70;   // 70bpm(D4와 같음). 박 = 4분음표, 8비트 한 칸 = 반 박
  const HALF_MS = BEAT_MS / 2;
  // beats: 강박이 다음 강박까지 울릴 박 수(D4·D5와 같은 이유 — 약박에서 안 치는 5·6번줄 저음이 중간에 '뚝' 끊기지 않게)
  function hit(c, kind, mode, beats) { J.strum(strokeMidis(c, kind), J.audioT0(), beats ? beats * BEAT_MS / 1000 + 0.05 : 1.0, 0.3, mode); }

  // ── 주법 — s = 8칸(D 다운 / U 업 / - 헛 스트로크), acc = 강세 칸(0부터, 박의 첫 칸) ──
  //  d8 = 8비트 다운(2·4번째 박 강세 = 3·7번째 칸) / du = 8비트 다운업(1·3번째 박 = 1·5번째 칸) / gh = D-DUD-DU(1·3번째 박) — 사용자 지정
  //  weak = 강세 아닌 다운의 줄 선택(없으면 1~4번줄). 8비트 다운은 낮은 6~4번줄(사용자 지정 2026-11-15)
  const PATS = { d8: { s: 'DDDDDDDD', acc: [2, 6], weak: 'l3' }, du: { s: 'DUDUDUDU', acc: [0, 4] }, gh: { s: 'D-DUD-DU', acc: [0, 4] } };
  const PAT_IDS = ['d8', 'du', 'gh'];
  // 칸 i의 스트로크 → [줄 선택, 세기, 울릴 박 수] 또는 null(헛 스트로크 — 소리 없음). accOn = 강세를 넣어 칠 때
  //  강세 = 모든 줄('acc', 다음 강세까지 울림) / 강세 아닌 다운 = 1~4번줄 약하게(8비트 다운만 6~4번줄 — PATS weak) / 업 = 1~3번줄 약하게(D4 '업은 대부분 약한 박자') / 강세 없이 칠 땐 다운 = 모든 줄 보통 세기(D4 4비트 다운과 같음)
  function strokeOf(p, i, accOn) {
    const ch = p.s.charAt(i), k = p.acc.indexOf(i);
    if (ch === '-') return null;
    if (accOn && k >= 0) { const nx = k + 1 < p.acc.length ? p.acc[k + 1] : p.acc[0] + 8; return ['all', 'acc', (nx - i) / 2]; }
    if (ch === 'U') return ['u3', 'weak', 0];
    return accOn ? [p.weak || 'w4', 'weak', 0] : ['all', undefined, 0];
  }
  function play(p, i, accOn) { const s = strokeOf(p, i, accOn); if (s) hit(chords().E, s[0], s[1], s[2]); }

  // ── 스트로크 기호 — D4(strum-play.js STRUM_ICON_DOWN/UP)와 같은 도형 ──
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const ICON_DOWN = SVG_OPEN + '><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>';
  const ICON_UP = SVG_OPEN + ' stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>';
  // 강세 기호(악센트, 악보 표준 '>') — D4와 같은 도형
  const ICON_ACC = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 2 16 6 2 10"/></svg>';

  // 주법 칸 8개 — 코드반주 훈련(chordplay-practice.js renderStrumDisplay)과 같은 마크업. 강의 칸(id 있음)과 퀴즈 보기(cls n9q-sg)가 같이 씀
  function sgridHtml(id, cls) {
    let cells = '', vms = '';
    for (let i = 0; i < 8; i++) {
      cells += '<div class="strum-beat-cell"><span class="strum-ico">' + ICON_DOWN + '</span></div>';
      vms += '<span class="n4-vm n9-vm" data-i="' + i + '">' + ICON_ACC + '</span>';
    }
    return '<div class="strum-play-grid n4-sg n9-sg' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '>' + vms + '<div class="strum-beat-grid strum-beat-grid--g2">' + cells + '</div><div class="strum-playhead"></div></div>';
  }
  // 칸 기호를 주법 p로(헛 스트로크 = 흐린 업 기호 — 훈련 strumCellHtml과 같은 방향) + 강세 기호(accOn) + 박 짚기 해제
  function setPat(g, p, accOn) {
    g.querySelectorAll('.strum-ico').forEach(function (el, i) { const ch = p.s.charAt(i); el.innerHTML = ch === 'D' ? ICON_DOWN : ICON_UP; el.classList.toggle('strum-ico--ghost', ch === '-'); });
    g.querySelectorAll('.strum-beat-cell').forEach(function (el) { el.classList.remove('is-hot'); });
    accMarks(g, accOn ? p.acc : []);
  }
  function accMarks(g, list) { g.querySelectorAll('.n9-vm').forEach(function (el) { el.classList.toggle('is-in', list.indexOf(+el.dataset.i) >= 0); }); }
  function placeVm(g) {   // 강세 기호를 칸 가운데 위에(구분선 굵기가 칸마다 달라 실측)
    const cs = g.querySelectorAll('.strum-beat-cell');
    g.querySelectorAll('.n9-vm').forEach(function (el) { const c = cs[+el.dataset.i]; if (!c) return; el.style.left = (c.offsetLeft + c.offsetWidth / 2) + 'px'; });
  }

  // ── 다이어그램 — E 하나(점·손가락 번호까지 캔버스). 위 영역 160px 안, 지판 가운데 = 무대 가운데(D4 §4-22) ──
  const DZ_H = 160, FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35;
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  function dw() { const B = VoicingCanvas; return Math.max(100, Math.min(stageW() * B.BASE_W / (2 * HALF_SPAN), DZ_H * B.BASE_W / FB_BOTTOM)); }
  function drawV(cv, c, w) {
    const e = c.entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: e.frets, openMute: e.openMute, barre: e.barre || {}, barreRange: e.barreRange || null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c.fing,
    }, { chordName: c.name, fingerNumMode: true, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true });
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  function paintDiag() {
    const cv = $('n9-cv'), box = $('n9-cw');
    if (!cv) return;
    const w = dw();
    drawV(cv, chords().E, w);
    box.style.width = w + 'px';
    box.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';
  }

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');   // 무대·문구 위치는 다른 노드와 같음(220px, 본문 가운데 정렬)
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer n4-full" id="n9-beats"><div class="n4-stack"><div class="n4-dz"><div class="n4-cw" id="n9-cw"><canvas id="n9-cv"></canvas></div></div><div class="n4-sz">' + sgridHtml('n9-sg') + '</div></div></div>' +
      // 작은 별 1줄 + 헛 스트로크 주법 칸(2026-11-21 사용자 지정) — 위 = D5 A키 악보 첫 줄(4마디), 아래 = D-DUD-DU 칸. 빈 무대에 새로 나타나는 장면이라 밑에서 올라옴(.jl-rise)
      '<div class="jl-layer jl-rise n4-full" id="n9-song"><div class="n4-stack"><div class="n4-dz n9-sdz">' + songScoreHtml() + '</div><div class="n4-sz">' + sgridHtml('n9-sg2') + '</div></div></div>' +
      '</div>';
    paintDiag(); setPat(grid(), PATS.d8, false); setPat($('n9-sg2'), PATS.gh, true);
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { paintDiag(); fitSz(); q('.n9-sg').forEach(placeVm); });
    }
  }

  // ── 화면 도구(D4와 같음) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function grid() { return $('n9-sg'); }
  // 아래 영역(.n4-sz) 높이 = 다이어그램 아래 끝 ~ 본문 아래 끝의 여백 전체(§4-22). 주법 칸은 이 여백의 상하 가운데
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
    q('.n9-sg').forEach(placeVm);
    return fx([$(id)], 'is-on', true);
  }
  function none() { return Promise.resolve(); }
  // 재생 위치 세로선 — D4 sweep과 같음(한 마디에 한 번 왼쪽 → 오른쪽)
  function sweep(gridId) {
    const g = $(gridId), ph = g.querySelector('.strum-playhead'), row = g.querySelector('.strum-beat-grid');
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
  function sweepLater(gridId) { later(function () { sweep(gridId); }, J.leadMs()); }   // 소리와 맞춰 시작
  function clearHit() { q('.strum-playhead').forEach(function (ph) { ph.style.transition = 'none'; ph.style.opacity = '0'; }); }
  // 층 준비 — 주법 pid, 강세 기호 켤지
  function prep(pid, accOn) { return function () { paintDiag(); setPat(grid(), PATS[pid], accOn); clearHit(); }; }
  // 칸 상태 맞추기(칸 시작 enter) — 앞 칸의 반복이 끊겨도 이 칸의 시작 화면으로
  function settle(pid, accOn) { return function () { clearHit(); setPat(grid(), PATS[pid], accOn); }; }
  // 박 짚기 — 그 박의 두 칸 기호만 파랑(칸 채색은 쓰지 않음 — 가이드 §4-5). beats = 박 번호(0부터)
  function hot(beats) { grid().querySelectorAll('.strum-beat-cell').forEach(function (el, i) { el.classList.toggle('is-hot', beats.indexOf(Math.floor(i / 2)) >= 0); }); }

  // ── 박자 — 한 마디 보여 주기(barPat) / 계속 재생(loopPat). 한 칸 = 반 박 ──
  function barPat(pid, accOn) {
    const p = PATS[pid];
    return (function step(i) {
      if (i >= 8) return wait(400);
      play(p, i, accOn);
      if (i === 0) sweepLater('n9-sg');
      return wait(HALF_MS).then(function () { return step(i + 1); });
    })(0);
  }
  // 다음으로 넘어갈 때까지 계속 재생(D4 loopTicks 그대로). fn(n) = n번째 틱 / ready = 이만큼 재생하면 "다음" 켜짐(그 뒤로도 계속) / stop = 이만큼 재생하면 멈춤(없으면 계속)
  function loopTicks(ms, fn, ready, stop) {
    if (J.skipping()) return Promise.resolve();
    let n = 0, t0 = performance.now(), done;
    const p = new Promise(function (r) { done = r; });
    (function tick() {
      if (J.skipping()) { done(); return; }   // 건너뛰기로 끊긴 재생도 칸을 끝낸 것으로(D4 2026-11-15 점검과 같음)
      const now = performance.now();
      if (now - (t0 + n * ms) > ms) t0 = now - n * ms;   // 일시정지 뒤 복귀처럼 크게 밀렸으면 지금부터 다시 맞춤
      fn(n);
      n++;
      if (n === ready) done();
      if (n === stop) return;
      later(tick, Math.max(0, t0 + n * ms - performance.now()));
    })();
    return p;
  }
  function loopPat(pid, accOn) {   // 한 마디(8칸) 뒤 "다음" 켜짐
    const p = PATS[pid];
    return loopTicks(HALF_MS, function (n) { const i = n % 8; play(p, i, accOn); if (i === 0) sweepLater('n9-sg'); }, 8);
  }

  // ── 작은 별 1줄 + 헛 스트로크(2026-11-21 사용자 지정) — D5(little-star.js) A키 악보 첫 줄(반짝반짝 작은 별 아름답게 비치네)·멜로디·가사 강조를 그대로 가져와
  //  반주만 4비트 다운 대신 이 노드의 D-DUD-DU(1·3박 강세, strokeOf 그대로)로. 코드는 칸(2박)마다 SONG_CH_A. 4마디를 한 번만 재생(사용자 지정 2026-11-21) — 끝나면 다음 문구
  const SONG1_LY = ['반짝반짝', '작은 별', '아름답게', '비치네'];
  const SONG1_MEL = [[[57, 1], [57, 1], [64, 1], [64, 1]], [[66, 1], [66, 1], [64, 2]], [[62, 1], [62, 1], [61, 1], [61, 1]], [[59, 1], [59, 1], [57, 2]]];   // D5 M1~M4(A키 MIDI, 박 수)
  const SONG1_NOTES = [];   // { midi, beat(줄 처음부터), len } — 가사 글자 순번과 같은 순서
  SONG1_MEL.forEach(function (bar, m) { let b = m * 4; bar.forEach(function (nt) { SONG1_NOTES.push({ midi: nt[0], beat: b, len: nt[1] }); b += nt[1]; }); });
  const SONG_GUITAR_TRIM = 0.3, SONG_PIANO_GAIN = 1.4;   // D5와 같은 값(멜로디가 기타에 묻히지 않게)
  // 악보 한 줄 — D5 scoreHtml에서 한 줄만(마디 터치 재생은 없음 — 마디는 버튼이 아닌 칸)
  function songScoreHtml() {
    let h = '<div class="n5-sc" id="n9-sc"><div class="lec6-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i>', si = 0;
    for (let k = 1; k < 4; k++) h += '<i class="lec6-bar n5-mb" style="--k:' + k + '"></i>';
    for (let m = 0; m < 4; m++) {
      h += '<div class="n5-m" style="--k:' + m + '">' +
        SONG_CH_A[m].map(function (id, j) { return '<span class="n5-ch" data-s="' + (m * 2 + j) + '">' + id + '</span>'; }).join('') +
        '<span class="n5-ly">' + SONG1_LY[m].split('').map(function (ch) { return ch === ' ' ? ' ' : '<span class="lec-syl" data-i="' + (si++) + '">' + ch + '</span>'; }).join('') + '</span></div>';
    }
    return h + '</div></div>';
  }
  function songMark(b) {   // 박 b의 코드 칸 파랑 + 가사(부른 글자 진하게, 지금 글자 파랑) — D5와 같음
    const slot = Math.floor(b / 2);
    q('#n9-sc .n5-ch').forEach(function (el) { el.classList.toggle('is-hot', +el.dataset.s === slot); });
    q('#n9-sc .lec-syl').forEach(function (el) {
      const nt = SONG1_NOTES[+el.dataset.i];
      el.classList.toggle('is-on', nt.beat <= b && b < nt.beat + nt.len);
      el.classList.toggle('is-sung', nt.beat + nt.len <= b);
    });
  }
  function songClear() { q('#n9-sc .n5-ch, #n9-sc .lec-syl').forEach(function (el) { el.classList.remove('is-hot', 'is-on', 'is-sung'); }); }
  const SONG1_TICKS = 32;   // 4마디 × 8칸
  function songOnce() {   // 4마디 한 번 — 마지막 칸 소리·강조까지 끝난 뒤 강조를 지우고 끝남(엔진이 칸 이동 때 예약을 지움)
    if (J.skipping()) return Promise.resolve();
    if (typeof J.songMix === 'function') J.songMix(SONG_GUITAR_TRIM, SONG_PIANO_GAIN);
    songClear();
    return loopTicks(HALF_MS, function (n) {
      const i = n % 8, m = Math.floor(n / 8) % 4, b = m * 4 + i / 2;   // i = 마디 안 칸(반 박), b = 줄 처음부터 박(칸이 짝수일 때 정수)
      const st = strokeOf(PATS.gh, i, true);
      if (st) hit(chords()[SONG_CH_A[m][i < 4 ? 0 : 1]], st[0], st[1], st[2]);
      if (i % 2 === 0) {
        SONG1_NOTES.forEach(function (nt) { if (nt.beat === b) J.piano(nt.midi, J.audioT0(), nt.len * BEAT_MS / 1000 * 0.95); });
        later(function () { songMark(b); }, J.leadMs());
      }
      if (i === 0) sweepLater('n9-sg2');
    }, SONG1_TICKS, SONG1_TICKS).then(function () { return wait(HALF_MS + J.leadMs() + 300); }).then(function () { songClear(); clearHit(); });
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  //  강의 최종 목적: 8비트 주법 세 가지(다운 2·4박 강세 / 다운업 1·3박 강세 / D-DUD-DU)를 기호로 읽고 치며, 헛 스트로크를 처음 안다
  const steps = [
    // P1 8비트 다운
    // 0 핵심(새 내용, D4 4비트를 이어받음): 8비트 = 한 박에 두 번, 한 마디에 여덟 번. 끝 화면 = E + 다운 8칸(2칸마다 박 구분선)
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 주법을\n더 배워볼게요!', run: none },
      { text: '지난번엔 한 마디에 4번 치는\n' + em('4비트') + '를 배웠어요!', run: none },
      { text: '이번엔 한 마디에 8번을 치는\n' + em('8비트') + '리듬을 배워볼게요', scene: 'n9-beats:d8', run: function () { return show('n9-beats', prep('d8', false)); } },
    ]), { ms: 8800 }),
    // 1 핵심(새 내용): 일정한 간격으로 8번 — 계속 재생, 한 마디 뒤 "다음"
    Object.assign(J.chainSteps([   // 3줄 문구를 나눔(2026-11-21 사용자 지정) — 재생은 첫 문구에서 시작해 칸이 끝나도 계속
      { text: '먼저 ' + em('E코드') + '로 ' + em('8비트 다운 스트로크') + '리듬에\n익숙해져볼게요!', enter: settle('d8', false), run: function () { return loopPat('d8', false); } },
      { text: '원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]), { ms: 5920 }),
    // 2 핵심(새 내용): 강세 위치 = 2·4번째 박(박 = 두 칸 — 사용자 지정: 박은 4분음표). 강세 기호는 D4에서 배운 것. 끝 화면 = 3·7번째 칸 위 강세 기호
    Object.assign(J.chainSteps([
      // 2·4번째 박 칸 강조 → 그 박 첫 칸에 강세 기호(2026-11-21 사용자 문구로 한 문구에 합침)
      { text: '8비트는 ' + em('한 박') + '에 리듬 ' + em('2개') + '예요!\n' + em('2, 4번째') + ' 박에 강세를 줘 볼게요!', enter: settle('d8', false), run: function () {
        hot([1, 3]);
        return wait(1500).then(function () { hot([]); accMarks(grid(), PATS.d8.acc); return wait(1200); });
      } },
      // 약박 줄 — D4(나머지 박은 1~4번줄)와 달리 이번엔 낮은 줄(사용자 지정 2026-11-15). 한 마디 시연
      { text: '강세가 아닌 박자는 ' + em('6~4번줄') + '만 쳐주세요!', run: function () { return barPat('d8', true); } },
    ]), { ms: 8310 }),   // ms = 가상 시계 측정값(마지막 구성 단계의 한 마디 시연이 길어 진행 바 칸 길이를 맞춤)
    // 3 핵심: 2·4박 강세 반복(강세 = 모든 줄, 나머지 = 6~4번줄)
    { text: '이제 원하는 만큼 연습하고\n넘어가 주세요!', ms: 4000, enter: settle('d8', true), run: function () { return loopPat('d8', true); } },

    // P2 8비트 다운업
    // 4 핵심(새 내용): 다운·업을 번갈아, 손은 쉬지 않고 움직임(업 = D4에서 배운 1~3번줄 약하게). 끝 화면 = D U D U… 8칸
    Object.assign(J.chainSteps([
      { text: '다음은 ' + em('8비트 다운업') + '이에요', scene: 'n9-beats:du', run: function () { return show('n9-beats', prep('du', false)); } },
      { text: '다운 다음에 업을 번갈아 치면서\n손을 ' + em('쉬지 않고 위아래로') + ' 움직여요', run: function () { return barPat('du', false); } },
    ]), { ms: 7900 }),   // ms = 가상 시계 측정값
    // 5 핵심(새 내용): 강세 = 1·3번째 박(1·5번째 칸) — 계속 재생
    { text: '이번 강세는 ' + em('1번째, 3번째 박') + '이에요\n원하는 만큼 연습하고 넘어가 주세요', ms: 5000, enter: settle('du', false), run: function () {
      accMarks(grid(), PATS.du.acc);
      return wait(600).then(function () { return loopPat('du', true); });
    } },

    // P3 헛 스트로크
    // 6 핵심(새 내용, 다운업에서 이어짐): 헛 스트로크 = 손은 그대로 움직이는데 줄은 치지 않음. 끝 화면 = 2·6번째 칸 업 기호가 흐림(D-DUD-DU)
    Object.assign(J.chainSteps([
      { text: '다운업을 할 때 손은\n계속 움직였죠?', enter: settle('du', true), run: none },
      { text: '손은 그대로 움직이는데 줄은 치지 않는 것을\n' + em('헛 스트로크') + '라고 해요', run: function () { setPat(grid(), PATS.gh, true); return wait(1000); } },
    ]), { ms: 5000 }),
    // 7 핵심: 동작은 유지하고 소리만 뺌 — 한 마디 시연(흐린 칸에선 소리 없음)
    { text: '흐린 칸에서도 손은\n' + em('업 동작') + '을 해주세요', ms: 5000, enter: settle('gh', true), run: function () { return barPat('gh', true); } },
    // 8 핵심: 헛 스트로크 감각이 다양한 주법의 핵심(사용자 문구 2026-11-21) → D-DUD-DU 반복
    Object.assign(J.chainSteps([
      { text: '헛 스트로크의 감각을 제대로 익히는 것이', enter: settle('gh', true), run: none },
      { text: '다양한 주법을 마스터할 수 있는 핵심이에요!', run: none },
      { text: '헛 스트로크를 연습해봐요!\n원하는 만큼 연습하고 넘어가 주세요!', run: function () { return loopPat('gh', true); } },
    ]), { ms: 9320 }),
    // 9 핵심(적용): 작은 별(A키 첫 줄)에 8비트 헛 스트로크 주법 — 주법을 유지하며 코드 전환 → 퀴즈 안내(사용자 지정 2026-11-21). 작은 별은 다음 칸(퀴즈)으로 갈 때까지 계속 재생
    Object.assign(J.chainSteps([
      { text: '작은 별을 8비트 주법을 적용해볼게요!', scene: 'n9-song', enter: clearHit, run: function () { return show('n9-song', function () { setPat($('n9-sg2'), PATS.gh, true); songClear(); }).then(songOnce); } },
      { text: '이렇게 주법을 연주하는 도중에\n코드가 바뀌는 경우가 많아요', run: none },
      { text: '주법은 유지하면서 코드를 전환하는 훈련이 중요해요!', run: none },
      { text: '이제 배운 주법을 퀴즈로 익혀볼게요!\n물론 코드 암기 복습도 같이요!', run: none },
    ]), { ms: 26875 }),
  ];
  const groups = [[0, 1, 2, 3], [4, 5], [6, 7, 8, 9]];

  // ── 작은 별 — D5 A키 진행(SONG_CH_A)을 키마다 옮김(D6 G키, D8 C키와 같은 대응). 퀴즈 코드진행 문제가 씀 ──
  const SONG_CH_A = [['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A'], ['A', 'D'], ['A', 'E'], ['A', 'D'], ['A', 'E'], ['A', 'A'], ['D', 'A'], ['D', 'A'], ['E', 'A']];
  const KEYS = {   // 키 → 1·4·5도 코드(보기 순서 고정 — D5·D6·D8과 같은 자리)
    A: { A: 'A', D: 'D', E: 'E' },
    G: { A: 'G', D: 'C', E: 'D' },
    C: { A: 'C', D: 'F', E: 'G' },
  };
  function songIn(key) { return SONG_CH_A.map(function (bar) { return bar.map(function (c) { return KEYS[key][c]; }); }); }
  function choicesIn(key) { return ['A', 'D', 'E'].map(function (c) { return KEYS[key][c]; }); }

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(코드진행 보기가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
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
  // 퀴즈 — D8(f-chord.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D8과 같음(노드 경제 기획안 §1-1·§1-4)
  //   유형(사용자 지정 2026-11-15):
  //     ① prog — 코드 진행 매칭(D5·D8과 같은 화면·오답풀이): 작은 별 A·G·C키(사용자 결정 — 요청의 E키는 B코드가 필요해 G키로). 문제마다 키 하나, 키를 고루. 보기 = 그 키 1·4·5도(순서 고정)
  //     ② ear — 소리 듣고 주법 고르기 2지선다: 이 노드 주법 3개 중 정답 + 나머지 하나. 보기 = 주법 칸(기호 + 강세 기호). 소리 = E코드 두 마디(90bpm — 2026-11-16, 강의는 70bpm), 카드 터치 = 처음부터 다시
  //   문제 수(사용자 지정): 별 1 10 / 별 2 15 / 별 3 15, 반반(5·5 / 8·7 / 8·7 — 남는 1개는 코드진행)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:strum-expand
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10, prog: 5, ear: 5 }, 2: { n: 15, prog: 8, ear: 7 }, 3: { n: 15, prog: 8, ear: 7 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'strum-expand';
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
  // 스피커 아이콘 — 루시드 volume-2와 같은 도형(리하모니 .combo-v2-speaker — 마지막 두 path가 파동 애니메이션)
  const ICON_SOUND = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  function balanced(n, pool) { const o = rnd(pool.length), a = []; for (let k = 0; k < n; k++) a.push(pool[(k + o) % pool.length]); return shuffle(a); }   // 풀 안에서 고르게(나머지는 무작위 시작점에서)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    // ① 코드 진행 — 키(A·G·C)를 고루, 키마다 작은 별 연속 2마디(시작 마디 0~10을 키마다 섞어 앞에서부터 — 한 키 안에서 겹치지 않음)
    const keys = balanced(cfg.prog, ['A', 'G', 'C']), starts = {}, used = {};
    ['A', 'G', 'C'].forEach(function (k) { starts[k] = shuffle(Array.from({ length: SONG_CH_A.length - 1 }, function (_, i) { return i; })); used[k] = 0; });
    keys.forEach(function (key) {
      const m = starts[key][used[key]++ % starts[key].length], song = songIn(key);
      qs.push({ type: 'prog', key: key, bar: m, seq: song[m].concat(song[m + 1]), choices: choicesIn(key) });
    });
    // ② 주법 듣기 — 정답 주법을 고루, 보기 = 정답 + 나머지 둘 중 하나(순서 섞음)
    balanced(cfg.ear, PAT_IDS).forEach(function (pid) {
      const other = shuffle(PAT_IDS.filter(function (x) { return x !== pid; }))[0];
      qs.push({ type: 'ear', pat: pid, answer: pid, choices: shuffle([pid, other]) });
    });
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
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
  //  ear = 코드 맞추기 문제 화면 템플릿(문제 카드 + 말풍선 + 보기 카드) — 보기 2개는 주법 칸이라 한 줄에 하나씩. 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  prog = 2마디 악보 카드 + 그 키의 다이어그램 3개 — 칸마다 누르고, 4칸 뒤 채점
  const QZ_TITLES = { ear: '알맞은 답을 고르세요', prog: '알맞은 답을 고르세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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

  function bindChoices() {
    $('jq-content').querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) cardJudge(b); });
  }

  // ── 소리 — 코드진행 칸 누른 코드 소리(playChord) / 주법 듣기(playEar) ──
  //  ear 문제가 나오면 주법을 1회 자동 재생(0.18초 뒤, 그 사이 답했거나 다음 문제로 넘어갔으면 재생 안 함 — 코드 맞추기 자동 재생과 같은 방식),
  //  문제 카드를 누르면 처음부터 다시, 보기를 고르는 순간 문제 소리는 바로 끊음
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
  const EAR_HINT = '터치해서 다시 들어보세요!';   // D4 소리 듣기 문제와 같은 안내
  const EAR_BARS = 2;   // 주법 소리 = 두 마디
  const EAR_BEAT = 60000 / 90, EAR_HALF = EAR_BEAT / 2;   // 퀴즈 주법 소리 = 90bpm(사용자 지정 2026-11-16 — D10·D11과 같은 4/4 빠르기). 강의는 그대로 70bpm
  //  다시 들을 때는 앞 재생(이미 예약된 칸 포함)을 하드컷하고 처음부터(CLAUDE.md 0-7 — 같은 재생을 다시 시작할 때 겹치지 않게). 하드컷은 샘플러를 새로 만들어 준비(ready) 뒤 예약
  function playEar(it) {
    stopSound();
    if (typeof GuitarAudio === 'undefined') return;
    const gen = chordGen, p = PATS[it.pat], c = chords().E;
    Promise.resolve(GuitarAudio.resume ? GuitarAudio.resume() : null).catch(function () {}).then(function () { return GuitarAudio.ready(); }).then(function () {
      if (gen !== chordGen || !qz || qz.quit || qz.over || cur() !== it) return;   // 기다리는 사이 하드컷·문제 전환·이탈
      const t0 = Tone.now() + 0.1;
      for (let b = 0; b < EAR_BARS * 8; b++) {
        const s = strokeOf(p, b % 8, true);   // 강의와 같은 소리(강세·줄 선택), 헛 스트로크 칸은 소리 없음
        if (s) GuitarAudio.strumAt(strokeMidis(c, s[0]), 0.012, t0 + b * EAR_HALF / 1000, s[2] ? s[2] * EAR_BEAT / 1000 + 0.05 : 1.0, 0.3, s[1]);
      }
    });
  }
  function playQ(it) { playEar(it); }
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
    if (it.type === 'ear') {   // 소리를 듣고 주법 고르기 — 문제 카드(스피커 아이콘, D4 소리 듣기와 같음) + 보기 2개(주법 칸, 한 줄에 하나)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">주법 소리</span><span class="n4q-ico n4q-ico--q">' + ICON_SOUND + '</span><span class="jq-qask">' + EAR_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">들리는 주법을 고르세요</div><div class="ms-quiz-choices jq-cq-choices n9q-choices">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '">' + sgridHtml(null, 'n9q-sg') + '</div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n9q-choices .ms-quiz-choice-card').forEach(function (card) { const g = card.querySelector('.n9-sg'); setPat(g, PATS[card.dataset.v], true); placeVm(g); });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'prog') {   // 코드 진행 — 위 = 2마디 악보(코드 이름만, 지금 누를 칸 파랑), 아래 = 그 키의 다이어그램 3개(이름·손가락 번호 없음)
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

  // 주법 보기를 누르면 바로 채점 — 코드 맞추기와 같은 정답(초록)·오답(빨강) 링, 보기는 잠김
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
    $('combo-v2-clear-level').textContent = '주법 확장하기 · 퀴즈 ' + qz.star;
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



  J.register('strum-expand', { layers: ['n9-beats', 'n9-song'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 9, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 9 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
