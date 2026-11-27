// ───────────────────────────────────────────────────────────
// 여정 노드: 첫 코드 잡아보기 (코드반주 D3)
//   설명 단계(2026-11-13 사용자 흐름 → 재구성). 퀴즈는 아직 없음(확정 전) → 마지막 버튼은 '종료', 홈으로.
//   에셋은 앱에 이미 있는 것만:
//     코드 다이어그램 = 코드 사전과 같은 데이터(chords-library.js의 chordsLibrary E·A 항목)와 같은 그리기(VoicingCanvas.draw — library.js _drawLibCanvas와 같은 필드)
//     줄 이름표 = D1의 .jl-fb-snum / O·X 강조 = 다이어그램의 O·X 표시 자체를 파랑으로 다시 그림(VoicingCanvas markColors)
//     소리 = 강의 엔진 J.note·J.strum, 강조(.lec-em)·등장(.jl-layer.is-on / .is-in)은 D1·D2와 같은 틀
//   새로 만든 도형은 없음 — O·X 강조도 다이어그램의 표시 색으로만.
//   다이어그램 방향(코드 사전 = D1 지판과 같음): 1번줄이 맨 위, 6번줄이 맨 아래, 너트(헤드 쪽)가 왼쪽.
//
//   멈춤 지점 원칙(가이드 §4-19): 진행 바 한 칸 = "다음"을 누를 때까지 멈추는 곳. 칸이 끝났을 때 화면은 그 칸의 핵심을 보여 주는 완성된 상태여야 한다.
//     지우기·바꾸기 같은 준비 동작은 다음 칸의 시작에서 한다(칸 끝에 빈 화면을 남기지 않음).
//     손가락은 하나에 한 칸 — 학습자가 실제 기타에서 그 손가락을 놓고 "다음"을 누를 수 있게.
//     장면(층)이 바뀔 때는 이전 화면이 먼저 사라진 뒤 새 화면이 나타난다 — 엔진이 보장(칸·구성 단계의 scene 열쇠가 바뀌면 문구가 뜨는 순간 layers를 전부 끔, 가이드 §4-20).
//     노드는 run에서 그려 켜기만 한다(show). 지우는 코드를 노드가 따로 쓰지 않는다.
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 코드 데이터 — 코드 사전(chordsLibrary)의 E·A 항목을 그대로 가져옴. 배열은 전부 사전·캔버스 순서 = 1번줄(맨 위) → 6번줄(맨 아래) ──
  //  fing = 손가락 번호(null = 없음) / order = 잡는 순서(손가락 번호). A는 사용자 지정 운지(xx234x — 사전의 A는 xx123)로만 fing을 덮어씀
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄 E4 B3 G3 D3 A2 E2
  function pick(root) {   // 0~3프렛 기본 오픈 코드(사전 대표 항목: static, 2번째 칸 라벨)
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
  function midisOf(c) {   // 울리는 줄만, 6번줄 → 1번줄(다운스트로크 방향)
    const out = [];
    for (let s = 5; s >= 0; s--) if (c.frets[s] !== null) out.push(OPEN_MIDI[s] + c.frets[s]);
    return out;
  }
  function fingerIdx(c, n) {   // n번 손가락이 누르는 줄(0 = 1번줄)
    for (let s = 0; s < 6; s++) if (c.fing[s] === n && c.frets[s]) return s;
    return -1;
  }
  function openIdx(c) { return c.frets.map(function (f, s) { return f === 0 ? s : -1; }).filter(function (s) { return s >= 0; }); }

  const FINGER_NAMES = ['검지', '중지', '약지', '소지'];   // 1~4번 손가락 — D1 손 그림 목록과 같은 이름
  function fingerName(n) { return FINGER_NAMES[n - 1]; }

  // ── 다이어그램 크기 — 무대(높이 220, 위 여백 24 → 196px)에 들어가는 만큼. VoicingCanvas 기준 비율 440:352 ──
  const DIAG_H = 196;
  function diagW(n) {   // n = 나란히 놓는 개수
    const st = $('combo-v2-lec-stage');
    const stageW = (st && st.clientWidth) || (window.innerWidth - 32);
    // 하나만 띄울 때는 뷰포트별 고정 크기(2026-11-20 사용자 지정): 360px대 245px / 412px부터 300px / 2단계(481px~) 이상 340px. 무대 높이는 아래 .n3-stage(style.css)가 같이 키움
    if (n === 1) return Math.min(stageW, window.matchMedia('(min-width: 481px)').matches ? 340 : window.matchMedia('(min-width: 412px)').matches ? 300 : 245);
    // 나란히 놓을 때(2026-11-20 사용자 지정): 눈에 보이는 간격 = 첫 지판 끝 ~ 다음 다이어그램의 그려진 왼쪽 끝 = 44px.
    //  캔버스 안 투명 여백(왼쪽 35 + 오른쪽 95 = 130 / 440)이 폭에 비례하므로, 캔버스 사이 간격 = 44 − 폭 × 130/440(음수면 겹침) → 폭 = (무대 폭 − 44 × (n−1)) ÷ (n − (n−1) × 130/440)
    const PAD = 130 / 440, SEE = 44;
    const w = Math.max(120, Math.min((stageW - SEE * (n - 1)) / (n - (n - 1) * PAD), DIAG_H * VoicingCanvas.BASE_W / VoicingCanvas.BASE_H));
    if (st) st.style.setProperty('--n3-two-gap', Math.round((SEE - w * PAD) * 10) / 10 + 'px');
    return w;
  }
  // 캔버스 안 위치(%) — voicing-canvas.js 기준 치수: 줄 s(0 = 1번줄)의 높이, 지판 오른쪽 끝
  function strTop(s) { return (80 + s * 192 / 5) / 352 * 100; }
  const BOARD_R = (35 + 70 + 240) / 440 * 100;

  // 캔버스 다시 그리기 — chord = CHORDS 항목 또는 null(칸만 그린 빈 다이어그램) / placed = 놓인 손가락 수 / nums = 손가락 번호 표시 / name = 코드명 표시
  let markHi = [];   // O·X 표시를 강조색으로 그릴 줄(0 = 1번줄) — 별도 도형 없이 표시 자체의 색을 바꿈(사용자 지정)
  const state = {};   // 캔버스 id → 마지막으로 그린 상태(창 크기가 바뀌면 같은 상태로 다시 그림)
  function drawChord(id, chord, placed, nums, name, nCols) {
    const cv = $(id);
    if (!cv) return;
    state[id] = [chord, placed, nums, name, nCols];
    const mc = id === 'n3-c1' && markHi.length ? [0, 1, 2, 3, 4, 5].map(function (k) { return markHi.indexOf(k) >= 0 ? hiColor() : null; }) : null;
    paint(cv, chord, placed, nums, name, diagW(nCols || 1), mc);
  }
  // 캔버스 하나에 코드 그리기 — 강의(drawChord)와 퀴즈(paintQ)가 같이 씀. w = 화면 폭(px), mc = 줄별 O·X 표시 색(선택)
  function paint(cv, chord, placed, nums, name, w, mc, hideOpen) {   // hideOpen: 퀴즈에서 아직 안 찍힌 개방현 줄(0 = 1번줄) — O 표시를 숨김
    const dpr = window.devicePixelRatio || 1;
    let v = null;
    if (chord) {   // library.js _drawLibCanvas와 같은 필드. 아직 안 놓인 손가락의 점만 뺌(frets null + openMute null = 아무 표시 없음)
      const e = chord.entry, shown = chord.order.slice(0, placed);
      v = {
        frets:      e.frets.map(function (f, s) { return (f > 0 && shown.indexOf(chord.fing[s]) < 0) || (f === 0 && hideOpen && hideOpen.indexOf(s) >= 0) ? null : f; }),
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

  let resizeOn = false;
  function build(stage) {
    stage.classList.add('is-jny', 'n3-stage');
    let one = '<canvas id="n3-c1"></canvas>';
    [[0, '1번줄'], [5, '6번줄']].forEach(function (x) { one += '<span class="jl-fb-snum n3-snum" data-s="' + x[0] + '" style="left:calc(' + BOARD_R + '% + 8px);top:' + strTop(x[0]) + '%">' + x[1] + '</span>'; });
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="n3-lone"><div class="n3-cw">' + one + '</div></div>' +
      '<div class="jl-layer" id="n3-ltwo"><div class="n3-two"><canvas id="n3-c2a"></canvas><canvas id="n3-c2b"></canvas></div></div></div>';
    drawChord('n3-c1', null, 0, false, false);
    drawChord('n3-c2a', chords().E, 3, true, true, 2);
    drawChord('n3-c2b', chords().A, 3, true, true, 2);
    if (!resizeOn) {
      resizeOn = true;
      window.addEventListener('resize', function () {
        Object.keys(state).forEach(function (id) { drawChord.apply(null, [id].concat(state[id])); });
      });
    }
  }

  // ── 화면 도구 ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  // 새 화면 나타내기 — 이전 층은 엔진이 칸이 시작될 때(scene 열쇠가 바뀔 때) 이미 껐음. 여기서는 준비(그리기) 후 켜기만
  function show(id, prepare) {
    if (prepare) prepare();
    return fx([$(id)], 'is-on', true);
  }
  function hiColor() { return getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#4f7cff'; }
  function setMark(ss) { markHi = ss; if (state['n3-c1']) drawChord.apply(null, ['n3-c1'].concat(state['n3-c1'])); }
  function none() { return Promise.resolve(); }

  // ── 소리 ──
  // 한 손가락을 놓을 때 그 줄의 음 하나 + 점(손가락 번호)이 나타남(소리와 화면을 같은 시각에)
  function placeFinger(c, n) {
    const s = fingerIdx(c, n);
    J.note(OPEN_MIDI[s] + c.frets[s], J.audioT0(), 1.6, 0.6);
    later(function () { drawChord('n3-c1', c, c.order.indexOf(n) + 1, true, true); }, J.leadMs());
    return wait(J.leadMs() + 900);
  }
  // 천천히 다운스트로크 — 낮은 줄 → 높은 줄, 줄 사이 0.09초(엔진 strum 간격 0.012초보다 느림 — 줄이 하나씩 들리게)
  function strumSlow(c) {
    const t0 = J.audioT0(), ms = midisOf(c);
    ms.forEach(function (m, k) { J.note(m, t0 + k * 0.09, 2.6, 1.0); });
    return wait(J.leadMs() + (ms.length - 1) * 90 + 1800);
  }
  // 완성 모양을 처음 보여줄 때 — 이전 화면이 사라진 뒤 모양(번호 없이)이 나타나고 코드 소리를 한 번(보통 스트럼 — 나중의 '천천히 다운스트로크'와 구분)
  function showAndHear(c) {
    return show('n3-lone', function () { drawChord('n3-c1', c, c.order.length, false, true); }).then(function () {
      J.strum(midisOf(c), J.audioT0(), 2.2, 1.0);
      return wait(J.leadMs() + 2200);
    });
  }
  // 손가락 하나 = 한 칸. 문구: '[검지](1번)로 / 3번줄 1프렛을 눌러요'
  function fingerStep(c, n, ms, pre, post) {   // pre: 앞에 붙는 말('먼저, ') / post: 끝말(기본 '눌러요')
    const s = fingerIdx(c, n);
    return { text: (pre || '') + em(fingerName(n)) + '(' + n + '번)로\n' + (s + 1) + '번줄 ' + c.frets[s] + '프렛을 ' + (post || '눌러요'), ms: ms || 1200, run: function () { return placeFinger(c, n); } };
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"은 주석 ──
  //  (chords()는 chords-library.js가 로드된 뒤라 여기서 바로 불러도 됨 — journey-lesson.html이 이 파일보다 먼저 불러옴)
  const E = chords().E, A = chords().A;
  const steps = [
    // P1 도입
    // 0 핵심: 코드 다이어그램 = 기타 지판의 일부를 그린 그림이고, 코디터 말고도 이미 많은 곳에서 코드 모양을 이걸로 표현한다. 도입은 템포 빠르게(가이드 §4-11). 끝 화면 = 빈 다이어그램 틀
    Object.assign(J.chainSteps([
      { text: '드디어 코드를 잡아보는\n시간이 왔어요!', gap: 3000, run: none },
      { text: '아래는 ' + em('코드 다이어그램') + '이에요\n기타 지판의 일부를 그린 거예요', gap: 3600, scene: 'n3-lone:empty', run: function () {
        return show('n3-lone', function () { drawChord('n3-c1', null, 0, false, false); });
      } },
      { text: '코디터를 비롯한 이미 많은 곳에서\n이 그림을 사용해서\n코드 모양을 표현해요!', gap: 3600, run: none },
    ]), { ms: 8600 }),

    // P2 이번 시간 + 읽는 방향 + E코드 (페이즈를 넘어가면 백지에서 시작하므로 이 페이즈 첫 구성 단계가 틀을 다시 올림)
    // 1 핵심: 이번 시간 목표(E·A코드) → 다이어그램 읽는 방향 = 지난 시간 지판과 같음(위 1번줄, 아래 6번줄). 오른쪽에 줄 이름표 + 1번줄·6번줄 개방현 소리. 끝 화면 = 틀 + 이름표
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 기타에서 제일 기초적인\n' + em('E코드') + '와 ' + em('A코드') + '를 잡아볼 거예요', gap: 3000, scene: 'n3-lone:empty', run: function () {
        return show('n3-lone', function () { drawChord('n3-c1', null, 0, false, false); });
      } },
      { text: '지난 시간에 본 지판처럼\n위가 ' + em('1번줄') + ', 아래가 ' + em('6번줄') + '이에요!', run: function () {
        return fx(q('.n3-snum'), 'is-in', true, 100).then(function () {
          const t0 = J.audioT0();
          [0, 5].forEach(function (s, k) {
            J.note(OPEN_MIDI[s], t0 + k, 1.4, 0.6);
            later(function () { setCls(q('.n3-snum'), 'is-focus', false); setCls(q('.n3-snum[data-s="' + s + '"]'), 'is-focus', true); }, J.leadMs() + k * 1000);
          });
          return wait(J.leadMs() + 1900);
        }).then(function () { setCls(q('.n3-snum'), 'is-focus', false); });
      } },
    ]), { ms: 8000 }),

    // P2 E코드
    // 2 핵심: E 완성 모양(번호 없이)을 천천히 띄워 보여 주고 → 다이어그램 기호 읽기 — 점 = 누르는 자리, O = 누르지 않고 치는 줄(개방현 = 0프렛). O 표시 자체가 파랑으로. 끝 화면 = E 모양 + 파란 O
    //   (2026-11-20 옛 2·3칸 통합. 처음 듣는 소리는 뺌 — 소리는 6칸의 다운스트로크에서)
    Object.assign(J.chainSteps([
      { text: '아래 보이는 코드는 ' + em('E코드') + '예요\n기타에서 제일 기초적인 코드예요', scene: 'n3-lone:E', enter: function () { fx(q('.n3-snum'), 'is-in', false); }, run: function () {
        const el = $('n3-lone');
        el.style.transitionDuration = '1.2s';   // 천천히 나타남(이 층만)
        return show('n3-lone', function () { drawChord('n3-c1', E, E.order.length, false, true); }).then(function () { return wait(800); }).then(function () { el.style.transitionDuration = ''; });
      } },
      { text: '먼저, ' + em('코드 다이어그램') + '을 볼게요!', run: none },
      { text: '검은 ' + em('점') + '은 손가락으로\n누르는 자리예요', run: none },
      { text: '왼쪽의 ' + em('O') + '는 누르지 않고 치는\n' + em('개방현') + '이라는 뜻이에요\n0프렛이라고 표현해도 돼요!', run: function () { setMark(openIdx(E)); return wait(400); } },
    ]), { ms: 12000 }),
    // 3 핵심: 실제 기타로 따라 잡기 시작 — 점을 비운 E(O는 남김)에서 검지부터. 끝 화면 = 검지 점
    Object.assign(J.chainSteps([
      { text: '이제 직접 잡아볼게요!\n우선 기타가 있다면 꼭 직접 잡아보세요!', scene: 'n3-lone:E-empty', run: function () {
        return show('n3-lone', function () { markHi = []; drawChord('n3-c1', E, 0, true, true); });
      } },
      fingerStep(E, 1, 0, '먼저, '),
    ]), { ms: 5200 }),
    // 4·5 핵심: 손가락 하나 = 한 칸(학습자가 놓고 "다음"). 끝 화면 = 그 손가락까지 놓인 E
    fingerStep(E, 2, 0, '다음은 ', '눌러보세요!'),
    fingerStep(E, 3, 0, '마지막으로 ', '눌러요!'),
    // 6 핵심: 완성 축하 → 오른손으로 6줄 천천히 다운스트로크(자기 소리와 비교) → 처음엔 소리가 깔끔하지 않은 게 당연 → 힘 싣는 법(넥을 달걀을 쥐어서 깬다는 생각, 사용자 표현 그대로). 끝 화면 = E 완성(번호 포함)
    //   (2026-11-20 옛 7·8칸 통합)
    Object.assign(J.chainSteps([
      { text: '축하해요! 첫 ' + em('E코드') + '를 잡으셨어요!', run: none },
      { text: '이제 오른손으로 6개 줄을\n천천히 아래로 긁어보세요', run: function () { return strumSlow(E); } },
      { text: '손가락이 약간 아프고\n아직은 소리가 깔끔하지 않을 거예요', run: none },
      { text: '처음엔 당연한 과정이에요!', run: none },
      { text: '팁을 드리자면 ' + em('E코드') + '를 잡을 때 기타의 넥을\n' + em('달걀을 쥐어서 깬다') + '는 생각으로 잡아보세요!', run: none },
      { text: '그러면 힘을 더 효율적으로\n실을 수 있을 거예요!', gap: 4500, run: none },
    ]), { ms: 24000 }),

    // P3 A코드 (2026-11-20 8스텝 → 4스텝. 처음 듣는 소리·뮤트 질문 칸을 줄임 — 사용자 지정)
    // P3-1 핵심: 두 번째 코드 시작 — 점을 비운 A에서 중지부터(A는 검지를 안 씀). 소리는 재생하지 않음(스텝 단축). 끝 화면 = 중지 점
    Object.assign(J.chainSteps([
      { text: '이번에는 ' + em('A코드') + '를 잡아볼게요!', scene: 'n3-lone:A-empty', run: function () { return show('n3-lone', function () { markHi = []; drawChord('n3-c1', A, 0, true, true); }); } },
      fingerStep(A, 2, 0, '', '눌러보세요!'),
    ]), { ms: 5200 }),
    // P3-2·3 핵심: 손가락 하나 = 한 칸. 끝 화면 = 그 손가락까지 놓인 A
    fingerStep(A, 3),
    fingerStep(A, 4),
    // P3-4 핵심: 완성 축하 → 처음 보는 X = 뮤트(소리를 내지 말라는 뜻) → 달걀 쥐듯이 잡으면 남는 엄지의 살로 6번줄 뮤트 → 5줄 천천히 다운스트로크. 끝 화면 = A 완성(번호 포함)
    Object.assign(J.chainSteps([
      { text: '축하해요! ' + em('A코드') + '를 완성했어요!', run: none },
      { text: '그런데 A코드에는 전에 없던 ' + em('X') + '표시가 있네요?', run: function () { setMark([5]); return wait(400); } },
      { text: '이건 ' + em('소리를 내지 말아라') + '라는 뜻이고\n' + em('뮤트') + '라고 부르는 기호예요', run: none },
      { text: 'A코드도 ' + em('달걀 쥐듯이') + ' 잡아보면\n아마 엄지가 남을 거예요!', run: none },
      { text: '이 엄지손가락의 살 부분으로\n6번줄을 가볍게 대서 ' + em('뮤트') + '해줄게요!', run: none },
      { text: '이 상태에서 줄을 아래로 긁어봅시다!', run: function () { setMark([]); return strumSlow(A); } },
    ]), { ms: 25330 }),

    // P4 자세
    // P4-1 핵심: 코드를 잡은 뒤 기타를 다시 세우는 습관 — 두 코드를 손가락 번호까지 나란히 띄운 채로. 끝 화면 = E·A 나란히
    Object.assign(J.chainSteps([
      { text: '코드를 처음 잡다 보면 지판을 보느라\n기타가 ' + em('눕기') + ' 쉬워요', scene: 'n3-ltwo', run: function () { return show('n3-ltwo'); } },
      { text: '집중하다 보면 ' + em('고개랑 허리') + '가\n앞으로 엄청 숙여져 있을 거예요!', run: none },
      { text: '기타도 누워져 있으면 ' + em('왼손목') + '에 무리가 가니\n꼭 코드를 잡고 자세를 편하게 취해주세요!', run: none },
    ]), { ms: 5000 }),
    // P4-2 핵심: 끝은 다음 할 일로(가이드 §4-12) — 퀴즈로 익히기 + 시간 제한 없음 + 실제 기타로
    Object.assign(J.chainSteps([
      { text: '이제 배운 E코드와 A코드도\n자연스럽게 외워질 수 있도록\n퀴즈를 풀어주세요!', run: none },
      { text: '퀴즈에는 ' + em('시간 제한') + '이 없으니\n기타가 있다면 직접 코드를 잡고\n소리 내면서 퀴즈를 풀어주세요!', run: none },
    ]), { ms: 5000 }),
  ];
  const groups = [[0], [1, 2, 3, 4, 5, 6], [7, 8, 9, 10], [11, 12]];

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D2(note-names.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1·D2와 같음(노드 경제 기획안 §1-1·§1-4)
  //   문제 수: 별 1 10 / 별 2 15 / 별 3 15. 코드는 E·A 둘뿐이라 2지선다(사용자 지정 2026-11-13)
  //   유형: ① pick — 코드 맞추기 문제 화면 템플릿 2지선다. '다이어그램 → 이름'(보기 = E / A 글자)과 '이름 → 다이어그램'(보기 = 다이어그램 둘)을 반반 섞어 출제
  //         ② fill — 다이어그램에 노트 직접 찍기. 빠진 노트에 개방현 O도 포함(너트 왼쪽 칸을 눌러 찍음, 2026-11-20). 채울 노트 수: 별 1 = 2개 / 별 2 = 3~4개 / 별 3 = 5~6개. 뮤트 X는 다이어그램 그대로 보임
  //            한 줄에는 점 하나(다른 프렛을 누르면 옮겨 감), 정답 = 빠진 점을 정확히 그 자리에 전부(남는 점이 있으면 오답). 채점 표시는 스케일 훈련과 같음 — 맞음 초록 / 틀림 빨강 / 못 찾은 자리 점선 원
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:chord-first
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10, pick: 6, fill: 4 }, 2: { n: 15, pick: 10, fill: 5 }, 3: { n: 15, pick: 6, fill: 9 } };   // 별 → 문제 수 / 유형별 문제 수(사용자 지정 2026-11-13 — 2지선다 : 직접 찍기 = 6:4 / 10:5 / 6:9)
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'chord-first';
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
  function balanced(n) { const a = []; for (let k = 0; k < n; k++) a.push(k % 2 ? 'E' : 'A'); return shuffle(a); }   // E·A가 반반(홀수면 한쪽이 1개 더)
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    const pc = balanced(cfg.pick), pv = shuffle(Array.from({ length: cfg.pick }, function (_, k) { return k % 2 ? 'd2n' : 'n2d'; }));
    for (let k = 0; k < cfg.pick; k++) qs.push({ type: 'pick', variant: pv[k], chord: pc[k], choices: shuffle(['E', 'A']), answer: pc[k] });
    const fc = balanced(cfg.fill);
    //  채울 노트 수(사용자 지정 2026-11-20): 별 1 = 2개 / 별 2 = 3~4개 / 별 3 = 5~6개(A는 5노트라 최대 5). 개방현 O도 채울 노트에 포함
    //  별 3(2026-11-27 사용자 지정 — A·E를 고르게 학습): E = 5~6개, A = 4~5개. A는 5노트라 E와 같은 5~6개로는 서로 다른 문제가 '전부 비우기' 하나뿐이어서
    //   A 자리가 E로 바뀌어 나왔음(9문제 중 A 1개). '전부 비우기'(E 6개·A 5개)는 코드마다 한 가지뿐이라 한 판에 코드당 1문제만, 나머지는 1개 적게
    const lo = star === 1 ? 2 : 3;
    const seen = {};
    const miss = star === 1 ? fc.map(function () { return 2; }) : star === 3 ? fc.map(function (c) { const full = c === 'E' ? 6 : 5; if (seen[c]) return full - 1; seen[c] = true; return full; }) : shuffle(Array.from({ length: cfg.fill }, function (_, k) { return k < Math.floor(cfg.fill / 2) ? lo : lo + 1; }));
    const used = {};   // 이미 낸 점 찍기 문제(코드 + 빠진 자리) — 가능하면 같은 문제를 두 번 내지 않음
    for (let k = 0; k < cfg.fill; k++) qs.push(pickFill(fc[k], miss[k], used));
    // 순서 — 점 찍기는 채울 노트가 적은 문제부터 많은 문제 순(사용자 지정). 같은 노트 수끼리는 자유.
    //  같은 문제가 바로 다음에 나오지 않게(사용자 지정 2026-11-20 — 코드가 E·A 둘뿐이라 같은 문제가 자주 겹침): 점 찍기 자리와 순서를 여러 번 무작위로 짜 보고
    //  ① 같은 문제 연속(가장 나쁨) ② 같은 코드·같은 유형 연속 ③ 같은 코드 연속 순으로 점수가 가장 낮은 배열을 고름(엔진 noRepeat는 자리가 고정된 점 찍기끼리 못 떼어 놓아 쓰지 않음)
    const fillQs = qs.filter(function (q) { return q.type === 'fill'; }), pickQs = qs.filter(function (q) { return q.type === 'pick'; });
    const qk = function (q) { return q.type === 'fill' ? 'f:' + q.chord + ':' + q.ans.slice().sort().join(',') : 'p:' + q.variant + ':' + q.chord; };
    const total = qs.length;
    let best = null, bestScore = Infinity;
    for (let t = 0; t < 400 && bestScore > 0; t++) {
      const fo = fillQs.map(function (q) { return { q: q, r: q.ans.length + Math.random() * 0.5 }; }).sort(function (x, y) { return x.r - y.r; }).map(function (x) { return x.q; });
      const slots = shuffle(Array.from({ length: total }, function (_, k) { return k; })).slice(0, fo.length).sort(function (x, y) { return x - y; });
      const po = shuffle(pickQs.slice());
      let fi = 0, pi = 0;
      const arr = [];
      for (let k = 0; k < total; k++) arr.push(slots[fi] === k ? fo[fi++] : po[pi++]);
      let score = 0;
      for (let k = 1; k < total; k++) {
        const a = arr[k - 1], b = arr[k];
        if (qk(a) === qk(b)) score += 1000;
        else if (a.chord === b.chord && a.type === b.type) score += 10;
        else if (a.chord === b.chord) score += 1;
      }
      if (score < bestScore) { bestScore = score; best = arr; }
    }
    return best;
  }
  // 점 찍기 — 코드의 소리 나는 노트(눌러야 하는 점 + 개방현 O) 중 miss개를 비워 둠(2026-11-20: 개방현도 빠질 수 있음).
  //  given = 이미 찍혀 있는 손가락 번호들, givenOpen = 이미 보이는 개방현 줄(1~6), ans = 빠진 노트 자리 '줄-프렛'(줄 1~6, 개방현은 프렛 0). E는 6노트, A는 5노트(6번줄 X)
  function mkFill(name, miss) {
    const c = chords()[name];
    const notes = [];   // { s: 줄(1~6), f: 프렛(0 = 개방현), n: 손가락 번호(개방현은 0) }
    for (let k = 0; k < 6; k++) if (c.frets[k] !== null && c.frets[k] !== undefined && !(c.entry.openMute && c.entry.openMute[k] === 'mute')) notes.push({ s: k + 1, f: c.frets[k], n: c.frets[k] > 0 ? c.fing[k] : 0 });
    const m = Math.min(miss, notes.length);
    const gone = shuffle(notes.slice()).slice(0, m);
    const keep = notes.filter(function (x) { return gone.indexOf(x) < 0; });
    const ans = notes.filter(function (x) { return gone.indexOf(x) >= 0; }).map(function (x) { return x.s + '-' + x.f; });
    return { type: 'fill', chord: name, given: keep.filter(function (x) { return x.f > 0; }).map(function (x) { return x.n; }), givenOpen: keep.filter(function (x) { return x.f === 0; }).map(function (x) { return x.s; }), ans: ans };
  }
  //  같은 문제 방지(2026-11-20): 선호 코드로 안 쓴 문제를 먼저 뽑고, 그 코드의 경우의 수가 바닥나면(A는 노트 5개를 다 비우면 한 가지뿐) 다른 코드에서 뽑음. 둘 다 바닥났을 때만 겹침 허용
  function pickFill(pref, miss, used) {
    if (miss > 5) pref = 'E';   // 6노트는 E뿐
    const order = [pref, pref === 'E' ? 'A' : 'E'];
    for (let ci = 0; ci < 2; ci++) for (let t = 0; t < 40; t++) {
      const q = mkFill(order[ci], miss), k = q.chord + ':' + q.ans.slice().sort().join(',');
      if (!used[k]) { used[k] = true; return q; }
    }
    return mkFill(pref, miss);
  }
  // 퀴즈 다이어그램 — 강의와 같은 paint(코드 사전 그리기). given = 찍혀 보일 손가락 번호들(손가락 번호는 보임(사용자 지정), 코드명은 숨김 — 정답이 보이지 않게)
  const QD_W = 300;   // 점 찍기 다이어그램 폭(최대) — 높이 240px
  //  givenOpen = 이미 보이는 개방현 줄 번호들(1~6). 생략하면(보기 그림·옛 저장 세션) 개방현 O는 전부 보임
  function paintQ(cv, chord, given, w, givenOpen) {
    const hide = givenOpen ? chord.frets.map(function (f, s) { return f === 0 && givenOpen.indexOf(s + 1) < 0 ? s : -1; }).filter(function (s) { return s >= 0; }) : null;
    paint(cv, Object.assign({}, chord, { order: given }), given.length, true, false, w, null, hide);
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
  let autoTimer = null;
  async function playChord(name) {
    if (typeof GuitarAudio === 'undefined') return;
    const midis = midisOf(chords()[name]);
    if (!midis.length) return;
    if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
    GuitarAudio.strumNotes(midis, 0.008);
  }
  function stopSound() {
    clearTimeout(autoTimer);
    autoTimer = null;
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 맥락 전환 → 하드컷(CLAUDE.md 0-7)
  }
  function autoPlay(it) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      autoTimer = null;
      if (!qz || qz.judged || qz.quit || qz.over || cur() !== it) return;
      playChord(it.chord);
    }, 180);
    const card = $('jq-content').querySelector('.ms-quiz-question-card');
    if (card) card.addEventListener('pointerup', function () { if (qz && !qz.over && cur() === it) playChord(it.chord); });
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
  const QD = { x0: 105, fw: 60, y0: 80, sh: 38.4, dot: 36.48 };
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
    $('combo-v2-clear-level').textContent = '첫 코드 잡아보기 · 퀴즈 ' + qz.star;
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


  J.register('chord-first', { layers: ['n3-lone', 'n3-ltwo'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 12, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 12 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
