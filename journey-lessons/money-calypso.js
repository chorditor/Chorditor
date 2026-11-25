// ───────────────────────────────────────────────────────────
// 여정 노드: 머니코드와 칼립소주법 (코드반주 D11)
//   D10(waltz-68.js)을 복사해 만듦 + 코드진행 문제(progTap)는 D9(strum-expand.js)에서 가져옴(2026-11-16 사용자 기획). 설명 단계 + 퀴즈.
//   목적(사용자 지정): 장르를 가리지 않고 실제 노래에 정말 많이 쓰이는 코드진행 세 가지(다이어토닉 1-5-6-4 / 1-6-4-5 / 4-5-6-1)를
//     C·G키로(총 6개) 익히고, 많은 노래에 어울리는 칼립소 주법(D-DU-UDU)과 지금까지 배운 주법을 코드진행에 적용해 침.
//     실제 노래에서 같은 진행이 나오면 익숙한 진행으로 알아보게 하는 것 — 강의에선 의도만 한 줄로(사용자 지정, 효과를 길게 말하지 않음)
//   도수 번호(1도·4도)는 아직 가르치지 않음 — 코드 이름으로만 소개(사용자 결정 2026-11-16). 칼립소 강세 없음(사용자 결정)
//   화면: 위 = 코드진행 코드 4개 다이어그램 한 줄(D6 .n5-trio 칸 4개, 재생 중엔 지금 마디 코드만 진하게), 아래 = 주법 칸(D9·D10과 같음)
//   빠르기 70bpm(D4·D9와 같음). 층·요소 id는 n11-*
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — 강의 = E, 퀴즈 = 기초 코드 9가지(D8과 같은 운지). 배열은 사전 순서 = 1번줄(맨 위) → 6번줄 ──
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
      Am: mk('Am'), Dm: mk('Dm'), Em: mk('Em') };   // 운지는 앞 노드와 같음(D6 C·G, D7 마이너, D8 F xx3211)
    return CHORDS;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄, 바레면 첫 줄), 안 쓰면 -1
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }
  function fingerSpan(c, n) {   // n번 손가락이 덮는 줄 범위 [첫 줄, 끝 줄] — 바레가 아니면 둘이 같음(D8과 같음)
    const a = fingerIdx(c, n);
    let b = a;
    for (let s = a + 1; s < 6; s++) if (c.fing[s] === n && c.frets[s]) b = s;
    return [a, b];
  }

  // ── 소리 — 줄 선택(D9와 같음): 'all' 6→1번줄 / 'w4' 1~4번줄(4→1) / 'l3' 6~4번줄(6→4, D9 8비트 다운의 약박) / 'u3' 1~3번줄(1→3, 업 스트로크). 안 울리는 줄(X)은 뺌 ──
  function strokeMidis(c, kind) {
    const order = kind === 'all' ? [5, 4, 3, 2, 1, 0] : kind === 'w4' ? [3, 2, 1, 0] : kind === 'l3' ? [5, 4, 3] : [0, 1, 2];
    return order.filter(function (s) { return c.frets[s] !== null; }).map(function (s) { return OPEN_MIDI[s] + c.frets[s]; });
  }
  // ms: 강세가 다음 강세까지 울릴 길이(D4·D9와 같은 이유 — 약박에서 안 치는 저음이 중간에 '뚝' 끊기지 않게). 0이면 1초
  // 칼립소 소리 = 코드반주 훈련(chordplay-practice.js _masterTick) 값 그대로(사용자 지정 2026-11-16 — 고정 1초로 울리면 헛 스트로크 칸에서 저음이 중간에 끊김):
  //  스트로크마다 마디(코드) 끝까지 울림 → 코드가 바뀌는 순간 스스로 끝남 / 줄 사이 0.005초(STRUM_STROKE_SEC) / 끝 릴리스 0.1초(STRUM_NOTE_RELEASE) / 세기 보통(강세 없음 'orig')
  const TR_IV = 0.005, TR_REL = 0.1;
  function hit(c, kind, mode, ms, tr) {
    if (tr) { J.strum(strokeMidis(c, kind), J.audioT0(), ms / 1000, TR_REL, mode, TR_IV); return; }
    J.strum(strokeMidis(c, kind), J.audioT0(), ms ? ms / 1000 + 0.05 : 1.0, 0.3, mode);
  }

  // ── 주법 — s = 칸(D 다운 / U 업 / - 헛 스트로크), acc = 강세 칸(0부터), g = 굵은 구분선 간격(코드반주 훈련 strumGroupSize와 같은 값, 0 = 없음), cell = 한 칸 길이(ms) ──
  //  이 노드(사용자 지정 2026-11-16): w3 = 3/4 DDD / w6 = 3/4 D-DUDU / s6 = 6/8 DDD DDD / s12 = 6/8 D--UDUD--UDU(2026-11-21 D10에 맞춤)
  //  D9 주법(퀴즈 주법 듣기에 같이 나옴): d8 = 8비트 다운(2·4박 강세, 약박 6~4번줄) / du = 8비트 다운업 / gh = D-DUD-DU
  const Q70 = 60000 / 70, DQ50 = 60000 / 50;   // 3/4·4/4의 박(4분음표, 70bpm) / 6/8의 박(점4분음표 = 세 칸, 50bpm)
  const PATS = {
    ca: { s: 'D-DU-UDU', acc: [2, 6], g: 2, cell: 60000 / 80 / 2, tr: true },   // 80bpm(2026-11-21 사용자 지정, 70에서 올림)   // 2026-11-21 사용자 지정: 2·4번째 박(3·7번째 칸) 강세, 첫 박은 모든 줄(아래 strokeOf)   // 칼립소(사용자 지정 2026-11-16) — 강세 없음, tr = 코드반주 훈련 소리(hit 위 주석). 2번째 칸 = 업 헛 스트로크(D9), 5번째 칸 = 다운 헛 스트로크(이 노드에서 처음)
    w3: { s: 'DDD', acc: [0], g: 0, cell: Q70 },
    w6: { s: 'D-DUDU', acc: [0], g: 2, cell: Q70 / 2 },
    s6: { s: 'DDDDDD', acc: [0, 3], mid: [3], g: 3, cell: DQ50 / 3 },   // 강약약중약약(D10과 같음) — mid = 중간 강세 칸
    s12: { s: 'D--UDUD--UDU', acc: [0, 6], mid: [6], g: 6, cell: DQ50 / 6 },   // 2026-11-21 D10과 같게 D - - UDU | D - - UDU(이전 D-DUD-D-DUD-)
    d8: { s: 'DDDDDDDD', acc: [2, 6], g: 2, cell: Q70 / 2, weak: 'l3' },
    du: { s: 'DUDUDUDU', acc: [0, 4], g: 2, cell: Q70 / 2 },
    gh: { s: 'D-DUD-DU', acc: [0, 4], g: 2, cell: Q70 / 2 },
  };
  const PAT_IDS = ['d8', 'du', 'gh', 'w3', 'w6', 's6', 's12'];   // 칼립소 말고 퀴즈 주법 듣기에 나오는 주법(D9 3개 + D10 4개 — 사용자 지정)
  function barMs(p) { return p.s.length * p.cell; }
  // 칸 i의 스트로크 → [줄 선택, 세기, 울릴 길이(ms)] 또는 null(헛 스트로크 — 소리 없음). accOn = 강세를 넣어 칠 때
  //  강세 = 모든 줄('acc', 다음 강세까지 울림) / 강세 아닌 다운 = 1~4번줄 약하게(d8만 6~4번줄) / 업 = 1~3번줄 약하게 / 강세 없이 칠 땐 다운 = 모든 줄 보통 세기
  function strokeOf(p, i, accOn) {
    const ch = p.s.charAt(i), k = p.acc.indexOf(i), n = p.s.length;
    if (ch === '-') return null;
    if (p.tr) {   // 강세를 넣어 칠 때(2026-11-21): 첫 박 = 모든 줄 보통 세기 / 강세(2·4박) = 모든 줄 세게 / 업 = 1~3번줄 약하게
      if (!accOn) return [ch === 'U' ? 'u3' : 'all', undefined, (n - i) * p.cell, true];
      return [ch === 'U' ? 'u3' : 'all', k >= 0 ? 'acc' : ch === 'U' ? 'weak' : undefined, (n - i) * p.cell, true];
    }   // 칼립소 — 다운 = 모든 줄 / 업 = 1~3번줄(훈련 STRUM_DIR_STRINGS.orig), 마디 끝까지 울림
    if (!p.acc.length) accOn = false;   // 강세 없는 주법 — 다운 = 모든 줄 보통 세기
    if (accOn && k >= 0) { const nx = k + 1 < p.acc.length ? p.acc[k + 1] : p.acc[0] + n; return ['all', p.mid && p.mid.indexOf(i) >= 0 ? undefined : 'acc', (nx - i) * p.cell]; }   // 중간 강세 = 모든 줄 보통 세기(D10과 같음)
    if (ch === 'U') return ['u3', 'weak', 0];
    return accOn ? [p.weak || 'w4', 'weak', 0] : ['all', undefined, 0];
  }
  function play(p, i, accOn, name) { const s = strokeOf(p, i, accOn); if (s) hit(chords()[name], s[0], s[1], s[2], s[3]); }

  // ── 스트로크 기호 — D4(strum-play.js STRUM_ICON_DOWN/UP)와 같은 도형 ──
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const ICON_DOWN = SVG_OPEN + '><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>';
  const ICON_UP = SVG_OPEN + ' stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>';
  // 강세 기호(악센트, 악보 표준 '>') — D4와 같은 도형
  const ICON_ACC = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 2 16 6 2 10"/></svg>';

  // 주법 칸 — 코드반주 훈련(chordplay-practice.js renderStrumDisplay)과 같은 마크업. 칸 수·구분선이 주법마다 달라 setPat이 안을 새로 그림. 강의 칸(id 있음)과 퀴즈 보기(cls n9q-sg)가 같이 씀
  function sgridHtml(id, cls) { return '<div class="strum-play-grid n4-sg n9-sg' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '></div>'; }
  // 주법 p로 칸을 새로 그림(헛 스트로크 = 흐린 기호, 방향은 칸 자리대로 — 짝수 칸 다운·홀수 칸 업) + 강세 기호(accOn). 강세 기호 위치는 칸을 그린 뒤 실측(placeVm)
  function setPat(g, p, accOn) {
    let cells = '', vms = '';
    for (let i = 0; i < p.s.length; i++) {
      const ch = p.s.charAt(i);
      cells += '<div class="strum-beat-cell"><span class="strum-ico' + (ch === '-' ? ' strum-ico--ghost' : '') + '">' + (ch === 'D' || (ch === '-' && i % 2 === 0) ? ICON_DOWN : ICON_UP) + '</span></div>';
      vms += '<span class="n4-vm n9-vm" data-i="' + i + '">' + ICON_ACC + '</span>';
    }
    g.innerHTML = vms + '<div class="strum-beat-grid' + (p.g ? ' strum-beat-grid--g' + p.g : '') + '">' + cells + '</div><div class="strum-playhead"></div>';
    g.classList.toggle('is-c12', p.s.length > 8);   // 12칸은 칸을 줄여 무대·보기 카드 폭에 넣음(CSS)
    g.dataset.bar = barMs(p);   // 재생 위치선이 한 마디에 걸리는 시간
    accMarks(g, accOn ? p.acc : []);
    placeVm(g);
  }
  function accMarks(g, list) { g.querySelectorAll('.n9-vm').forEach(function (el) { el.classList.toggle('is-in', list.indexOf(+el.dataset.i) >= 0); }); }
  function placeVm(g) {   // 강세 기호를 칸 가운데 위에(구분선 굵기가 칸마다 달라 실측)
    const cs = g.querySelectorAll('.strum-beat-cell');
    g.querySelectorAll('.n9-vm').forEach(function (el) { const c = cs[+el.dataset.i]; if (!c) return; el.style.left = (c.offsetLeft + c.offsetWidth / 2) + 'px'; });
  }

  // ── 코드진행 — 이 노드의 6개(사용자 지정): 1-5-6-4 / 1-6-4-5 / 4-5-6-1을 C키(c1~c3)·G키(g1~g3)로. 한 마디에 코드 하나 ──
  const PROGS = {
    c1: ['C', 'G', 'Am', 'F'], c2: ['C', 'Am', 'F', 'G'], c3: ['F', 'G', 'Am', 'C'],
    g1: ['G', 'D', 'Em', 'C'], g2: ['G', 'Em', 'C', 'D'], g3: ['C', 'D', 'Em', 'G'],
  };
  const PROG_IDS = ['c1', 'c2', 'c3', 'g1', 'g2', 'g3'];
  const KEY_CHOICES = { c: ['C', 'F', 'G', 'Am'], g: ['G', 'C', 'D', 'Em'] };   // 퀴즈 보기 = 그 키의 1·4·5·6도, 순서 고정(사용자 지정)

  // ── 다이어그램 — 코드진행 코드 4개를 한 줄로(D6 작은 별 층 .n5-trio와 같은 도구, 칸 4개). 재생 중엔 지금 마디 코드만 진하게(.is-play + .is-on) ──
  const FB_CX = 225, FB_BOTTOM = 274, HALF_SPAN = FB_CX - 35;
  function stageW() { const st = $('combo-v2-lec-stage'); return (st && st.clientWidth) || (window.innerWidth - 32); }
  function drawV(cv, c, w) {
    const e = c.entry, dpr = window.devicePixelRatio || 1;
    VoicingCanvas.draw(cv, {
      frets: e.frets, openMute: e.openMute, barre: e.barre || {}, barreRange: e.barreRange || null,
      fretNumber: e.fretNumber, patternR: e.patternR, slotFret: e.slotFret, source: e.source, fingering: c.fing,
    }, { chordName: c.name, fingerNumMode: true, ratio: w * dpr / VoicingCanvas.BASE_W, transparent: true });   // 손가락 번호 표시(2026-11-21 사용자 지정 — 11-16 생략 결정을 되돌림)
    cv.style.width = w + 'px';
    cv.style.height = 'auto';
  }
  // P1 칼립소 층 — 코드 하나(C)를 크게(D10 paintDiag와 같은 크기 계산, 위 영역 .n4-dz 160px)
  const BIG_H = 160;
  function paintBig() {
    const cv = $('n11-cv'), box = $('n11-cw');
    if (!cv) return;
    const B = VoicingCanvas, w = Math.max(100, Math.min(stageW() * B.BASE_W / (2 * HALF_SPAN), BIG_H * B.BASE_W / FB_BOTTOM));
    drawV(cv, chords().C, w);
    box.style.width = w + 'px';
    box.style.marginLeft = -(FB_CX / B.BASE_W * w) + 'px';
  }
  let PROG = PROGS.c1;   // 지금 층에 그린 코드진행
  // 코드진행 캐러셀 — 코드반주 훈련(chordplay-practice.js _renderStage·_advanceStage)과 같은 4슬롯 원통형(2026-11-21 사용자 지정).
  //  슬롯 역할 0 = 왼쪽 화면 밖 / 1 = 이전(작게) / 2 = 지금(크게, 가운데) / 3 = 다음(작게). 모양·전환은 공용 .progd-slot--* 규칙 그대로
  const CAR_ROLE = ['far-left', 'prev', 'current', 'next'];
  let CAR_CUR = 0, CAR_ROLES = [0, 1, 2, 3];
  function carSlots() { return q('.n11-car .progd-slot'); }
  // 이웃 간격 — 보이는 그림(개방현 O·X ~ 지판 끝)은 지판 가운데 기준 왼쪽 190/440·폭, 오른쪽 120/440·폭(VoicingCanvas 기준값).
  //  이전 코드(0.67배)의 오른쪽 끝 ↔ 가운데 코드의 왼쪽 끝이 CAR_GAP만큼 떨어지게: 거리 = (190 + 0.67·120)/440·폭 + 간격 (다음 코드 쪽은 이보다 넉넉함)
  const CAR_NEAR = (190 + 0.67 * 120) / 440, CAR_GAP = 12, CAR_CLIP = 16;
  const CAR_AHEAD = 500;   // 캐러셀 전환을 마디 첫 소리보다 먼저 시작하는 시간(ms, 2026-11-21 사용자 지정 0.5초)   // CAR_CLIP = 이웃이 무대 밖으로 잘려도 되는 폭(px, 끝은 흐리게)
  function carW() {   // 가운데 코드 캔버스 폭 — 지판이 무대 폭 54% 안, 높이는 위 영역 160px까지, 이전 코드 왼쪽 끝이 무대 밖으로 CAR_CLIP 넘게 나가지 않게
    //  전 뷰포트 360px 값으로 고정(2026-11-21 사용자 지정) — 무대 폭 = 360 − 좌우 마진 16×2 = 328 기준으로 한 번 계산(약 186px, 이웃 거리 약 126px)
    const B = VoicingCanvas, W360 = 328, half = W360 / 2;
    return Math.max(70, Math.min(W360 * 0.54 * B.BASE_W / (2 * HALF_SPAN), BIG_H * B.BASE_W / FB_BOTTOM, (half + CAR_CLIP - CAR_GAP) / (CAR_NEAR + 0.67 * 190 / 440)));
  }
  function carDraw(el, name) {
    const cv = el.querySelector('canvas'), w = carW();
    el.dataset.c = name;
    drawV(cv, chords()[name], w);
    cv.style.marginLeft = -(FB_CX / VoicingCanvas.BASE_W * w) + 'px';   // 지판 가운데 = 슬롯 가운데(다른 노드와 같음)
    const car = el.parentNode; if (car && car.style) car.style.setProperty('--n11-d', Math.round(CAR_NEAR * w + CAR_GAP) + 'px');   // 이웃 중심 거리(CSS)
  }
  function carRender() {   // 첫 마디 코드가 가운데 — 전환 없이 제자리
    CAR_CUR = 0; CAR_ROLES = [0, 1, 2, 3];
    carSlots().forEach(function (el, d) {
      el.className = 'progd-slot progd-slot--' + CAR_ROLE[d] + ' progd-no-transition';
      carDraw(el, PROG[(d + 2) % 4]);   // 왼쪽 밖 = 3번째, 이전 = 4번째(진행이 돌아가므로), 지금 = 1번째, 다음 = 2번째
      void el.offsetWidth;
      el.className = 'progd-slot progd-slot--' + CAR_ROLE[d];
    });
  }
  function carGo(k) {   // k = 지금 마디(0~3) — 한 칸씩 왼쪽으로 돎(코드반주 훈련 _advanceStage 그대로)
    if (k < 0 || k === CAR_CUR) return;
    const sl = carSlots(), dom = function (r) { return CAR_ROLES.indexOf(r); };
    const fl = dom(0), pv = dom(1), cu = dom(2), nx = dom(3);
    sl[fl].className = 'progd-slot progd-slot--far-right progd-no-transition';   // 안 보이는 슬롯을 오른쪽 밖으로 옮겨 다음다음 코드를 그림
    carDraw(sl[fl], PROG[(k + 1) % 4]);
    void sl[fl].offsetWidth;
    sl[fl].className = 'progd-slot progd-slot--next';
    sl[pv].className = 'progd-slot progd-slot--far-left';
    sl[cu].className = 'progd-slot progd-slot--prev';
    sl[nx].className = 'progd-slot progd-slot--current';
    CAR_ROLES[fl] = 3; CAR_ROLES[pv] = 0; CAR_ROLES[cu] = 1; CAR_ROLES[nx] = 2;
    CAR_CUR = k;
  }

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny');   // 무대·문구 위치는 다른 노드와 같음(220px, 본문 가운데 정렬)
    stage.innerHTML = '<div class="jl-layers">' +
      // P1 칼립소 — C 하나 + 칼립소 칸(D10 n10-beats와 같은 배치). 빈 무대에 새로 나타나는 장면이라 밑에서 올라옴(.jl-rise)
      '<div class="jl-layer jl-rise n4-full" id="n11-beats"><div class="n4-stack"><div class="n4-dz"><div class="n4-cw" id="n11-cw"><canvas id="n11-cv"></canvas></div></div><div class="n4-sz">' + sgridHtml('n11-sg0') + '</div></div></div>' +
      // P2~P4 코드진행 — 코드진행 캐러셀(가운데 크게·양옆 작게) + 칼립소 칸. 칼립소 층이 사라진 빈 무대에 새로 나타나므로 밑에서 올라옴
      '<div class="jl-layer jl-rise n4-full" id="n11-main"><div class="n4-stack"><div class="n4-dz"><div class="progd-chord-view-inner n11-car">' + [0, 1, 2, 3].map(function () { return '<div class="progd-slot"><canvas></canvas></div>'; }).join('') + '</div></div><div class="n4-sz">' + sgridHtml('n11-sg') + '</div></div></div>' +
      '</div>';
    paintBig(); carRender(); setPat($('n11-sg0'), PATS.ca, false); setPat(grid(), PATS.ca, false);
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () { paintBig(); carSlots().forEach(function (el) { if (el.dataset.c) carDraw(el, el.dataset.c); }); fitSz(); q('.n9-sg').forEach(placeVm); });
    }
  }

  // ── 화면 도구(D10과 같음) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function grid() { return $('n11-sg'); }
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
  // 재생 위치 세로선 — D4 sweep과 같음(한 마디에 한 번 왼쪽 → 오른쪽, 한 마디 길이는 주법마다 — setPat이 data-bar에 적음)
  function sweep(gridId) {
    const g = $(gridId), ph = g.querySelector('.strum-playhead'), row = g.querySelector('.strum-beat-grid');
    const a = row.firstElementChild, b = row.lastElementChild;
    ph.style.transition = 'none';
    ph.style.top = a.offsetTop + 'px';
    ph.style.height = a.offsetHeight + 'px';
    ph.style.left = a.offsetLeft + 'px';
    ph.style.opacity = '1';
    void ph.offsetWidth;
    ph.style.transition = 'left ' + g.dataset.bar + 'ms linear, opacity 0.12s';
    ph.style.left = (b.offsetLeft + b.offsetWidth) + 'px';
  }
  function sweepLater(gridId) { later(function () { sweep(gridId); }, J.leadMs()); }   // 소리와 맞춰 시작
  function clearHit() { q('.strum-playhead').forEach(function (ph) { ph.style.transition = 'none'; ph.style.opacity = '0'; }); }
  // 층 준비·칸 상태 맞추기 — 코드진행 pid(PROGS), 주법 sid, 강세 기호 켤지, bar = 진하게 둘 마디(코드 하나로 칠 때 0, 없으면 전부 진하게)
  function setup(pid, sid, accOn) { PROG = PROGS[pid]; carRender(); setPat(grid(), PATS[sid], accOn); clearHit(); }
  function prep(pid, sid, accOn) { return function () { setup(pid, sid, accOn); }; }
  const settle = prep;
  function prepBeats() { paintBig(); setPat($('n11-sg0'), PATS.ca, false); clearHit(); }
  function loopBeat() {   // C 하나로 칼립소 계속(두 마디 뒤 "다음" 켜짐), 강세 넣어 침
    const p = PATS.ca, n = p.s.length;
    return loopTicks(p.cell, function (t) { const i = t % n; play(p, i, true, 'C'); if (i === 0) sweepLater('n11-sg0'); }, 2 * n);
  }   // P1 칼립소 층 시작 화면   // 칸 시작 enter — 앞 칸의 반복이 끊겨도 이 칸의 시작 화면으로
  // 칸 짚기 — 그 칸 기호만 파랑(D9 박 짚기와 같은 표시 .is-hot). cells = 칸 번호(0부터)
  function hot(cells) { $('n11-sg0').querySelectorAll('.strum-beat-cell').forEach(function (el, i) { el.classList.toggle('is-hot', cells.indexOf(i) >= 0); }); }

  // ── 재생 — 코드 하나로 한 마디(barChord) / 코드진행 계속(loopProg). 한 칸 길이 = 주법의 cell ──
  function barChord(sid, accOn) {
    const p = PATS[sid];
    return (function step(i) {
      if (i >= p.s.length) return wait(400);
      play(p, i, accOn, PROG[0]);
      if (i === 0) sweepLater('n11-sg0');
      return wait(p.cell).then(function () { return step(i + 1); });
    })(0);
  }
  // 다음으로 넘어갈 때까지 계속 재생(D4 loopTicks 그대로). fn(n) = n번째 틱 / ready = 이만큼 재생하면 "다음" 켜짐(그 뒤로도 계속)
  function loopTicks(ms, fn, ready) {
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
      later(tick, Math.max(0, t0 + n * ms - performance.now()));
    })();
    return p;
  }
  function loopProg(sid, accOn) {   // 코드진행 한 바퀴(4마디) 뒤 "다음" 켜짐 — 한 바퀴는 다 들어야 진행 하나를 들은 것
    const p = PATS[sid], n = p.s.length;
    return loopTicks(p.cell, function (t) {
      const i = t % n, bar = Math.floor(t / n) % 4;
      play(p, i, accOn, PROG[bar]);
      if (i === 0) sweepLater('n11-sg');
      const ka = Math.ceil(CAR_AHEAD / p.cell);   // 몇 칸 앞에서 예약할지(한 칸보다 길게 앞당길 수 있게)
      if (i === n - ka) { const nb = (bar + 1) % 4; later(function () { carGo(nb); }, Math.max(0, J.leadMs() + ka * p.cell - CAR_AHEAD)); }   // 다음 마디 코드로 캐러셀을 소리보다 조금 먼저 돌림(2026-11-21 사용자 지정)
    }, 4 * n);
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  //  강의 최종 목적: 칼립소(D-DU-UDU)를 먼저 익히고, 실제 노래에 많이 쓰이는 코드진행 세 가지를 C·G키로 칼립소로 친다
  //  순서(2026-11-21 사용자 지정 — 효율): P1 칼립소 → P2~P4 코드진행 하나씩(같은 진행을 C키 → G키, 전부 칼립소). 4비트로 진행만 따로 듣는 칸 없음
  const steps = [
    // P1 칼립소 주법(2026-11-21 사용자 문구)
    // 0 핵심: 이번 노드 = 칼립소 + 머니코드 진행 3가지(빈 무대, 문구만)
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 어디든지 사용해도\n무난하게 어울리는 ' + em('칼립소 주법') + '을 배우고', run: none },
      { text: '실제 노래에 아주 많이 쓰이는\n' + em('머니코드') + '진행 3가지를 배워볼게요!', run: none },
    ]), { ms: 7680 }),
    // 1 핵심(배운 것의 적용 — D9 8비트): 칼립소 = 8비트 응용, 2·4번째 박(3·7번째 칸) 강세 → 무한 반복. 끝 화면 = C 하나 + 칼립소 8칸 + 강세 기호
    //  에셋: 주법을 배울 땐 코드 하나만(D10 n10-beats와 같음, 밑에서 올라옴), 코드진행 4개는 P2에서 진행을 칠 때 처음 나옴
    Object.assign(J.chainSteps([
      { text: '칼립소 주법은 ' + em('8비트 주법') + '의 응용이에요!\n' + em('2, 4번째') + ' 박에 강세를 주세요', scene: 'n11-beats', run: function () { return show('n11-beats', prepBeats).then(function () { hot([2, 6]); return wait(1500); }).then(function () { hot([]); accMarks($('n11-sg0'), PATS.ca.acc); return wait(1200); }); } },
      { text: '충분히 연습한 후 넘어가주세요!', run: loopBeat },
    ]), { ms: 10345 }),

    // P2 첫 번째 코드진행(1-5-6-4) — C키 → G키, 칼립소. 키는 작은 별 세 키(D5·D6·D8)에서 이어받음
    // 2 핵심(새 내용 + 적용): 첫 번째 머니코드 진행 C-G-Am-F — 캐러셀이 밑에서 올라옴 → 칼립소로 계속 반복(마디마다 캐러셀 한 칸), 한 바퀴 뒤 "다음"(2026-11-21 사용자 문구)
    Object.assign(J.chainSteps([
      { text: '이제는 머니코드 진행을 배워볼게요!\n첫번째는 ' + em('C G Am F') + '진행이에요!', scene: 'n11-main', run: function () { return show('n11-main', prep('c1', 'ca', true)); } },
      { text: '칼립소와 코드진행을 손이 기억할 수 있도록\n충분히 연습해주세요~!', run: function () { return loopProg('ca', true); } },
    ]), { ms: 16345 }),
    // 3 핵심(새 내용): 같은 진행을 G키로 G-D-Em-C
    Object.assign(J.chainSteps([
      { text: '같은 코드진행을 ' + em('G key') + '로도\n연습해주면 좋아요!', enter: settle('g1', 'ca', true), run: none },
      { text: '원하는 만큼 연습하고 넘어가주세요!', run: function () { return loopProg('ca', true); } },
    ]), { ms: 15265 }),

    // P3 두 번째 코드진행(1-6-4-5)
    // 4 핵심(새 내용): C-Am-F-G
    { text: '두 번째 코드진행은\n' + em('C Am F G') + '예요\n원하는 만큼 연습하고 넘어가 주세요', ms: 11625, enter: settle('c2', 'ca', true), run: function () { return loopProg('ca', true); } },
    // 5 핵심(새 내용): G키 G-Em-C-D
    { text: em('G키') + '로는 ' + em('G Em C D') + '예요\n원하는 만큼 연습하고 넘어가 주세요', ms: 11625, enter: settle('g2', 'ca', true), run: function () { return loopProg('ca', true); } },

    // P4 세 번째 코드진행(4-5-6-1) + 마무리
    // 6 핵심(새 내용): F-G-Am-C
    { text: '세 번째 코드진행은\n' + em('F G Am C') + '예요\n원하는 만큼 연습하고 넘어가 주세요', ms: 11625, enter: settle('c3', 'ca', true), run: function () { return loopProg('ca', true); } },
    // 7 핵심(새 내용): G키 C-D-Em-G
    { text: em('G키') + '로는 ' + em('C D Em G') + '예요\n원하는 만큼 연습하고 넘어가 주세요', ms: 11625, enter: settle('g3', 'ca', true), run: function () { return loopProg('ca', true); } },
    // 8 핵심: 머니코드 = 노래로 증명된 진행 → 익혀 두면 노래 연습에 도움 → 퀴즈 안내(코드진행 보고 코드 찾기). 끝 화면 = 재생 멈춤(2026-11-21 사용자 문구)
    Object.assign(J.chainSteps([
      { text: '혹시 코드진행을 들어보면서\n익숙한 노래가 떠오르진 않으셨나요~?', enter: clearHit, run: none },
      { text: '머니코드들은 이미 노래로 증명된\n코드진행들을 뜻하는 용어예요!', run: none },
      { text: '이런 코드진행을 별도로 익혀 놓으면\n원하는 노래를 연습할 때 도움이 될 수 있어요!', run: none },
      { text: '이제 퀴즈를 통해 코드진행을 보고\n올바른 코드를 찾는 연습을 해보아요!', run: none },
    ]), { ms: 17120 }),
  ];
  const groups = [[0, 1], [2, 3], [4, 5], [6, 7, 8]];   // P1 칼립소 / P2~P4 코드진행 하나씩(C키 → G키) — P4 끝에 퀴즈 안내

  // ── 퀴즈가 쓰는 D3 도구 ──
  // 캔버스 하나에 코드 그리기 — D3(chord-first.js) paint 그대로(코드진행 보기가 씀). w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
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
  // 퀴즈 — D10(waltz-68.js) 퀴즈 엔진 + D9 코드진행 문제. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1~D10과 같음
  //   유형(사용자 지정 2026-11-16):
  //     ① prog — 코드진행 매칭(D5~D9와 같은 화면·오답풀이): 이 노드의 6개 진행만, 한 마디에 코드 하나(4칸). 보기 = 그 키의 1·4·5·6도 코드 4개, 순서 고정(C키 C·F·G·Am / G키 G·C·D·Em)
  //     ② pick·fill — 기초 코드 9가지 복습(D10과 같음: 코드 맞추기 4지선다 / 빠진 점 찍기, F 바레 규칙 그대로). 맞추기·채우기 반반
  //     ③ ear — 소리 듣고 주법 고르기 2지선다(E코드 두 마디). 칼립소 빈도를 높임(사용자 결정): 절반은 정답이 칼립소(오답 보기 = D9·D10 주법 7개 중 무작위),
  //        나머지는 정답이 7개 중 하나이고 오답 보기가 칼립소 — 모든 주법 문제에 칼립소가 나옴
  //   문제 수(사용자 지정): 별 1 15 / 별 2 20 / 별 3 25, 세 유형 균등(코드진행 / 9코드 / 주법 = 5·5·5 / 7·6·7 / 9·8·8)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:money-calypso
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 15, prog: 5, pick: 3, fill: 2, ear: 5 }, 2: { n: 20, prog: 7, pick: 3, fill: 3, ear: 7 }, 3: { n: 25, prog: 9, pick: 4, fill: 4, ear: 8 } };   // 별 → 문제 수 / 유형별 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'money-calypso';
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
  const QZ_CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em'];   // pick·fill 풀 = 기초 코드 9가지
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    // ① 코드진행 — 6개 진행을 고루
    balanced(cfg.prog, PROG_IDS).forEach(function (id) { qs.push({ type: 'prog', prog: id, seq: PROGS[id].slice(), choices: KEY_CHOICES[id.charAt(0)].slice() }); });
    // ③ 주법 듣기 — 절반(남으면 하나 더)은 정답 칼립소 + 7개 중 하나, 나머지는 정답 7개 중 하나(고루) + 칼립소
    const nCa = Math.ceil(cfg.ear / 2);
    for (let k = 0; k < nCa; k++) qs.push({ type: 'ear', pat: 'ca', answer: 'ca', choices: shuffle(['ca', PAT_IDS[rnd(PAT_IDS.length)]]) });
    balanced(cfg.ear - nCa, PAT_IDS).forEach(function (pid) { qs.push({ type: 'ear', pat: pid, answer: pid, choices: shuffle([pid, 'ca']) }); });
    // ② 코드 맞추기 — D8 그대로(보기 = 정답 + 나머지 여덟 중 셋)
    const pc = balanced(cfg.pick, QZ_CHORDS), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) {
      const others = shuffle(QZ_CHORDS.filter(function (c) { return c !== pc[k]; })).slice(0, 3);
      qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle([pc[k]].concat(others)), answer: pc[k] });
    }
    // ③ 코드 채우기 — D7 규칙(별 1·2 = 1개, 별 3 = 2개 또는 3개 — 손가락이 2개뿐인 코드(Em)는 최대 2개)
    const fc = balanced(cfg.fill, QZ_CHORDS);
    const miss = fillMiss(star, cfg.fill), used = {};   // 채울 노트 수(별 1 = 2 / 별 2 = 3~4 / 별 3 = 5~6)
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], used, fc));
    // 채우기는 섞인 자리 그대로 두고, 빠진 손가락 수가 적은 것부터 나오게 순서만 바꿈(D7과 같음)
    const mixed = shuffle(qs), fills = mixed.filter(function (q) { return q.type === 'fill'; });
    fills.forEach(function (q, i) { q._i = i; });
    fills.sort(function (x, y) { return x.miss - y.miss || x._i - y._i; });
    fills.forEach(function (q) { delete q._i; });
    let fi = 0;
    return J.noRepeat(mixed.map(function (q) { return q.type === 'fill' ? fills[fi++] : q; }), function (q) { return q.type === 'fill' ? q.miss : null; });   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통). 점 찍기의 쉬운 것부터 순서는 지킴
  }
  // 빠진 점 — 손가락 단위로 빼고, 정답은 줄 단위(바레 손가락은 덮는 줄 전부 — F 1번 = 1·2번줄 1프렛 두 점, 사용자 지정)
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
  // 퀴즈 다이어그램 — 강의와 같은 paint(코드 사전 그리기). given = 찍혀 보일 손가락 번호들(손가락 번호는 보임, 코드명은 숨김 — 정답이 보이지 않게).
  //  바레 막대는 같은 프렛에 점이 2개 이상 보일 때만 그려짐(voicing-canvas.js) — F 1번 손가락이 빠지면 막대도 안 보임
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };   // voicing-canvas.js 기준 치수(440×352)
  const QD_W = 300;   // 점 찍기 다이어그램 폭(최대) — 높이 240px
  function paintQ(cv, chord, given, w, givenOpen) {   // givenOpen = 이미 보이는 개방현 줄(1~6). 생략하면(보기 그림·옛 저장 세션) 개방현 O는 전부 보임
    const hide = givenOpen ? chord.frets.map(function (f, s) { return f === 0 && givenOpen.indexOf(s + 1) < 0 ? s : -1; }).filter(function (s) { return s >= 0; }) : null;
    paint(cv, Object.assign({}, chord, { order: given }), given.length, false, false, w, null, undefined, hide);
  }   // 손가락 번호 생략(사용자 지정 2026-11-16 — 강의와 같음)
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
  //  pick = D8과 같음(4지선다) / fill = 안내 카드 + 다이어그램(빠진 점을 눌러 찍기) + 제출하기(D7과 같음)
  const QZ_TITLES = { prog: '알맞은 답을 고르세요', ear: '알맞은 답을 고르세요', pick: '알맞은 답을 고르세요', fill: '알맞은 답을 찍어주세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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

  // ── 소리 — 코드 맞추기 코드 소리(playChord — D8과 같음, 문제가 나오면 1회 자동 재생 + 카드 터치) / 주법 듣기(playEar) ──
  const TOUCH_HINT = '터치해서 소리도 들어보세요!';   // 코드 맞추기와 같은 안내
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
  // 퀴즈 주법 소리 빠르기(사용자 지정 2026-11-16) — 4/4(8칸 주법: 칼립소·D9 세 주법) 90bpm / 3/4 100bpm / 6/8 50bpm(점4분음표). 강의는 그대로 70bpm
  //  6/8은 PATS의 cell(50bpm) 그대로, 4/4·3/4는 한 칸(반 박)을 90bpm으로 바꾼 사본으로 소리 냄(울리는 길이도 이 칸 길이로 계산됨)
  const EAR_Q44 = 60000 / 90;
  const EAR_Q34 = 60000 / 100;   // 3/4 퀴즈 100bpm(사용자 지정 2026-11-16 — 70에서 올림)
  function earPat(p) {
    if (p.s.length === 8) return Object.assign({}, p, { cell: EAR_Q44 / 2 });   // 4/4 — 한 칸 = 반 박
    if (p.s.length === 3 || (p.s.length === 6 && p.g === 2)) return Object.assign({}, p, { cell: EAR_Q34 * 3 / p.s.length });   // 3/4 — DDD 한 칸 = 한 박 / D-DUDU 한 칸 = 반 박
    return p;   // 6/8 — PATS 그대로 50bpm(70bpm을 시도했다가 되돌림 — 12칸이 너무 빠름)
  }
  //  다시 들을 때는 앞 재생(이미 예약된 칸 포함)을 하드컷하고 처음부터(CLAUDE.md 0-7 — 같은 재생을 다시 시작할 때 겹치지 않게). 하드컷은 샘플러를 새로 만들어 준비(ready) 뒤 예약
  function playEar(it) {
    stopSound();
    if (typeof GuitarAudio === 'undefined') return;
    const gen = chordGen, p = earPat(PATS[it.pat]), c = chords().E;
    Promise.resolve(GuitarAudio.resume ? GuitarAudio.resume() : null).catch(function () {}).then(function () { return GuitarAudio.ready(); }).then(function () {
      if (gen !== chordGen || !qz || qz.quit || qz.over || cur() !== it) return;   // 기다리는 사이 하드컷·문제 전환·이탈
      const t0 = Tone.now() + 0.1;
      for (let b = 0; b < EAR_BARS * p.s.length; b++) {
        const s = strokeOf(p, b % p.s.length, true);   // 강의와 같은 소리(강세·줄 선택), 헛 스트로크 칸은 소리 없음
        if (s && s[3]) GuitarAudio.strumAt(strokeMidis(c, s[0]), TR_IV, t0 + b * p.cell / 1000, s[2] / 1000, TR_REL, s[1]);   // 칼립소 — 강의와 같은 훈련 소리
        else if (s) GuitarAudio.strumAt(strokeMidis(c, s[0]), 0.012, t0 + b * p.cell / 1000, s[2] ? s[2] / 1000 + 0.05 : 1.0, 0.3, s[1]);
      }
    });
  }
  function playQ(it) { if (it.type === 'ear') playEar(it); else playChord(it.chord); }
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

  const PROG_FRET_PX = 10;   // 코드진행 보기 다이어그램의 프렛 번호 글자 크기(실제 화면 px — D9와 같음)
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
    if (it.type === 'ear') {   // 소리를 듣고 주법 고르기 — 문제 카드(스피커 아이콘, D4 소리 듣기와 같음) + 보기 2개(주법 칸, 한 줄에 하나)
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard"><span class="jq-qsub">주법 소리</span><span class="n4q-ico n4q-ico--q">' + ICON_SOUND + '</span><span class="jq-qask">' + EAR_HINT + '</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">들리는 주법을 고르세요</div><div class="ms-quiz-choices jq-cq-choices n9q-choices">' +
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '">' + sgridHtml(null, 'n9q-sg') + '</div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n9q-choices .ms-quiz-choice-card').forEach(function (card) { const g = card.querySelector('.n9-sg'); setPat(g, PATS[card.dataset.v], true); placeVm(g); });
      bindChoices();
      autoPlay(it);
    } else if (it.type === 'prog') {   // 코드 진행 — 위 = 4마디 악보(코드 이름만, 지금 누를 칸 파랑), 아래 = 그 키의 다이어그램 4개(1·4·5·6도 순서, 이름·손가락 번호 없음)
      progSel = [];
      let sc = '<div class="lec6-row n5q-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i>';
      for (let k = 1; k < 4; k++) sc += '<i class="lec6-bar n5-mb" style="--k:' + k + '"></i>';   // 한 마디에 코드 하나 — 마디선 3개
      it.seq.forEach(function (c, k) { sc += '<span class="n5q-ch' + (k === 0 ? ' is-cur' : '') + '" style="--k:' + k + '">' + c + '</span>'; });
      box.innerHTML = '<div class="ms-quiz-question-card jq-qcard n5q-card n5q-pcard"><button type="button" class="combo-v2-speaker" aria-label="지금 코드 듣기">' + ICON_SOUND + '</button>' +
        '<span class="jq-qsub">주어진 코드진행 순서대로 클릭하세요!</span><div class="n5q-sc">' + sc + '</div></div><span class="jq-qask n5q-hint">터치하면 현재 코드를 들을 수 있어요!</span></div>' +
        '<div class="jq-cq-answer"><div class="jq-bubble">알맞은 코드 다이어그램을 고르세요</div><div class="ms-quiz-choices jq-cq-choices jq-cq-choices--diag jq-cq-choices--diag4">' +   // 보기 4개 = 코드 맞추기 4지선다와 같은 2×2(사용자 지정 2026-11-16 — 한 줄 4개는 다이어그램이 너무 작음). 다이어그램 = 카드의 80%
        it.choices.map(function (c) { return '<div class="ms-quiz-choice-card" data-v="' + c + '"><div class="ms-quiz-choice-canvas-slot">' + diagCard(c) + '</div></div>'; }).join('') + '</div></div>';
      box.querySelectorAll('.n3q-cv').forEach(function (cv) {
        const c = chords()[cv.dataset.chord];
        const w = Math.floor(cv.parentNode.clientWidth);
        paint(cv, c, c.order.length, false, false, w, null, PROG_FRET_PX * VoicingCanvas.BASE_W / w);   // 점·O·X만(번호·이름 없음). 프렛 번호는 화면 크기 10px로 고정(D9와 같음)
      });
      box.querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) progTap(b); });
      box.querySelector('.n5q-card').addEventListener('pointerup', function () {
        if (qz && !qz.over && cur() === it && progSel.length < it.seq.length) playChord(it.seq[progSel.length]);
      });
    } else if (it.type === 'pick' && it.variant === 'd2n') {   // 다이어그램을 보고 이름 고르기
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
  // ── 점 찍기 — 다이어그램의 칸(1~4프렛 × 6줄)을 누르면 점 + 그 자리 소리, 같은 자리를 다시 누르면 지움. 한 줄에는 점 하나(다른 프렛을 누르면 옮겨 감).
  //  이미 찍혀 있는 줄은 건드릴 수 없음. 칸 위치는 voicing-canvas.js 기준 치수(기준 폭 440×352): 프렛 칸 폭 60·시작 x 105 / 줄 간격 38.4·1번줄 y 80 / 점 지름 36.48(= 폭의 8.29%)
  let fillSel = {};   // 줄(1~6) → 찍은 프렛
  function givenStrings(it) { const c = chords()[it.chord], o = {}; it.given.forEach(function (n) { const sp = fingerSpan(c, n); for (let s = sp[0]; s <= sp[1]; s++) if (c.fing[s] === n) o[s + 1] = true; }); (it.givenOpen || []).forEach(function (st) { o[st] = true; }); return o; }   // 바레 손가락은 덮는 줄 전부
  function fillPos(e) {
    const r = $('n3q-wrap').querySelector('canvas').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * VoicingCanvas.BASE_W, by = (e.clientY - r.top) / r.height * VoicingCanvas.BASE_H;
    const f = bx < QD.x0 ? (bx >= QD.x0 - 70 ? 0 : -1) : Math.floor((bx - QD.x0) / QD.fw) + 1, s = Math.round((by - QD.y0) / QD.sh) + 1;   // 너트 왼쪽 개방현 칸(70px) = 프렛 0
    return f < 0 || f > VoicingCanvas.FRETS || s < 1 || s > 6 ? null : [s, f];
  }
  function dotHtml(s, f, cls, label) {
    return '<span class="n3q-dot ' + cls + (f === 0 ? ' is-open' : '') + '" data-s="' + s + '" style="left:' + (f === 0 ? QD.x0 - 35 : QD.x0 + (f - 0.5) * QD.fw) / VoicingCanvas.BASE_W * 100 + '%;top:' + (QD.y0 + (s - 1) * QD.sh) / VoicingCanvas.BASE_H * 100 + '%;width:' + QD.dot * (f === 0 ? 1.05 : 1) / VoicingCanvas.BASE_W * 100 + '%">' + (label || '') + '</span>';
  }
  function fillDots() {
    $('n3q-dots').innerHTML = keptHtml(cur()) + Object.keys(fillSel).map(function (s) { return dotHtml(+s, fillSel[s], ''); }).join('');
  }
  // 오답풀이 — 앞서 맞힌 점(본 문제·앞선 다시 풀기)은 정답색으로 남겨 두고 다시 누를 수 없게, 나머지 자리만 찍게 함(사용자 지정 2026-11-21 — CLAUDE.md 0-8 '틀린 그 지점에서 교정')
  function fillKept(it) { return qz && qz.phase === 'review' && it.kept ? it.kept : []; }
  function keptStrings(it) { const o = {}; fillKept(it).forEach(function (k) { o[k.split('-')[0]] = true; }); return o; }
  function keptHtml(it) { const fing = chords()[it.chord].fing; return fillKept(it).map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', ''); }).join(''); }
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
    let h = kept.map(function (k) { const sf = k.split('-'); return dotHtml(+sf[0], +sf[1], 'is-ok', ''); }).join('');
    // 채점 뒤 정답 자리에도 손가락 번호는 쓰지 않음(사용자 지정 2026-11-16 — 노드11은 번호 생략)
    picked.forEach(function (k) { const sf = k.split('-'), hit = it.ans.indexOf(k) >= 0; h += dotHtml(+sf[0], +sf[1], hit ? 'is-ok' : 'is-ng', ''); });
    it.ans.forEach(function (k) { if (picked.indexOf(k) < 0 && kept.indexOf(k) < 0) { const sf = k.split('-'); h += dotHtml(+sf[0], +sf[1], 'is-miss', ''); } });
    $('n3q-dots').innerHTML = h;
    verdict(ok);
    if (ok) barreSettle(it);
  }
  // F 바레 — 정답이면 찍은 두 점(1·2번줄)이 바레 막대로 바뀜(사용자 지정: 제출 전엔 점만). 정답 점을 잠깐 보여 준 뒤 다이어그램을 손가락까지 다시 그리고(막대) 그 줄의 점은 사라짐
  const BARRE_SETTLE_MS = 500;
  function barreSettle(it) {
    const c = chords()[it.chord];
    const bf = c.order.filter(function (n) { const sp = fingerSpan(c, n); return it.given.indexOf(n) < 0 && sp[1] > sp[0]; });
    if (!bf.length) return;
    const strs = [];
    bf.forEach(function (n) { const sp = fingerSpan(c, n); for (let s = sp[0]; s <= sp[1]; s++) if (c.fing[s] === n) strs.push(s + 1); });
    const tok = qz;
    setTimeout(function () {
      const wrap = $('n3q-wrap');
      if (qz !== tok || qz.quit || qz.over || cur() !== it || !wrap) return;   // 그 사이 다음 문제·이탈
      const cv = wrap.querySelector('canvas');
      paintQ(cv, c, it.given.concat(bf), parseFloat(cv.style.width));
      $('n3q-dots').querySelectorAll('.n3q-dot').forEach(function (el) { if (strs.indexOf(+el.dataset.s) >= 0) el.classList.add('is-gone'); });
    }, BARRE_SETTLE_MS);
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
    if (!qz.judged) {   // 제출하기(점 찍기)
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
    $('combo-v2-clear-level').textContent = '머니코드와 칼립소주법 · 퀴즈 ' + qz.star;
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



  J.register('money-calypso', { layers: ['n11-beats', 'n11-main'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 8, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 8 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
