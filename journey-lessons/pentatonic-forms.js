// ───────────────────────────────────────────────────────────
// 여정 노드: 펜타토닉 스케일 G·C·A·E·D폼 (코드반주 D15~D19) — 노드 다섯 개가 이 파일 하나를 씀(엔진 JL_NODE_FILES 15~19 → 'pentatonic-forms')
//   폼은 URL의 day로 고름(15 G / 16 C / 17 A / 18 E / 19 D). 별·이어 풀기 열쇠는 폼마다 따로(NODE_ID 'pentatonic-g' 등 = journey.js 목록 id)
//   D15(G폼, 사용자 지정 2026-11-18): 스케일 첫 노드 — 펜타토닉 = 메이저스케일의 1 2 3 5 6도 설명 + G폼. 스케일 훈련 메이저 펜타토닉 튜토리얼(scale-level.js) 설명을 바탕으로 함.
//   D16~D19(사용자 지정 2026-11-19): 같은 형식에 폼만 다름 — 펜타토닉 설명은 D15에서 끝났으니 스케일 블럭에만 집중(블럭 → 근음 → 코드 모양 → 도수 → 손가락 → 직접 채우기 → 자유 연주)
//   D2(note-names.js)의 음이름 줄·스케일 훈련 지판 부품을 다시 씀. 단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석, 모든 지연은 J.wait/J.later(엔진 타이머)만.
//   무대 층 2개: 음이름 줄(#n15-row, D15만) / 지판(#n15-fb — 폼 블럭 양옆으로 한 칸씩 더 보이는 창) — 장면 열쇠(scene)로 전환(가이드 §4-20)
//   점 글자는 음이름 → 도수 → 손가락 번호 중 한 가지로만(가이드 §4-31). 글자가 있는 칸의 근음 = 점 자체를 파랑(사용자 지정), 글자 없는 블럭 = 스케일 훈련 근음 표시(가운데 흰 원)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 폼 — 전부 C key 메이저 펜타토닉(scale-data.js 'major-pentatonic-*' 블럭을 C key 자리로 옮김). block = [줄, 프렛, 음이름, 도수, 손가락] 낮은 음부터 ──
  //  손가락은 사용자 지정(6번줄부터): G 141313131414 · C 141413132414 · A 131314141313 · E 241414131313 · D 131313141413
  //  shape = 블럭 안에 숨은 그 이름의 코드 모양(근음 포함, 그 코드 모양을 C 자리로 옮긴 것) / prog = 자유 연주 코드진행(사용자 지정), progKey = backing-track.js 진행 열쇠
  //  idx = 따라 칠 때 검지를 두는 프렛 / fingerNote = 손 위치가 바뀌는 곳 안내(숫자에서 계산 — 검지 기준 칸에서 벗어나는 줄), hot = 그때 짚는 점
  //  C폼은 개방현 자리(-1프렛 시작)가 운지와 안 맞아 한 옥타브 위 12~15프렛
  const FORMS = {
    G: { day: 15, block: [[6, 5, 'A', 6, 1], [6, 8, 'C', 1, 4], [5, 5, 'D', 2, 1], [5, 7, 'E', 3, 3], [4, 5, 'G', 5, 1], [4, 7, 'A', 6, 3],
      [3, 5, 'C', 1, 1], [3, 7, 'D', 2, 3], [2, 5, 'E', 3, 1], [2, 8, 'G', 5, 4], [1, 5, 'A', 6, 1], [1, 8, 'C', 1, 4]],
      shape: ['6-8', '5-7', '4-5', '3-5', '2-5', '1-8'], idx: 5, prog: ['C', 'Am', 'F', 'G'], progKey: 'jny-penta' },
    C: { day: 16, block: [[6, 12, 'E', 3, 1], [6, 15, 'G', 5, 4], [5, 12, 'A', 6, 1], [5, 15, 'C', 1, 4], [4, 12, 'D', 2, 1], [4, 14, 'E', 3, 3],
      [3, 12, 'G', 5, 1], [3, 14, 'A', 6, 3], [2, 13, 'C', 1, 2], [2, 15, 'D', 2, 4], [1, 12, 'E', 3, 1], [1, 15, 'G', 5, 4]],
      shape: ['5-15', '4-14', '3-12', '2-13', '1-12'], idx: 12, prog: ['Dm', 'G', 'C', 'Am'], progKey: 'jny-penta-c',
      fingerNote: '2번줄만 ' + em('2번 손가락') + '부터 시작해요', hot: ['2-13'] },
    A: { day: 17, block: [[6, 3, 'G', 5, 1], [6, 5, 'A', 6, 3], [5, 3, 'C', 1, 1], [5, 5, 'D', 2, 3], [4, 2, 'E', 3, 1], [4, 5, 'G', 5, 4],
      [3, 2, 'A', 6, 1], [3, 5, 'C', 1, 4], [2, 3, 'D', 2, 1], [2, 5, 'E', 3, 3], [1, 3, 'G', 5, 1], [1, 5, 'A', 6, 3]],
      shape: ['5-3', '4-5', '3-5', '2-5', '1-3'], idx: 3, prog: ['F', 'G', 'Em', 'Am'], progKey: 'jny-penta-a',
      fingerNote: '4번줄과 3번줄은 검지를\n' + em('2프렛') + '으로 옮겨서 눌러요', hot: ['4-2', '3-2'] },
    E: { day: 18, block: [[6, 8, 'C', 1, 2], [6, 10, 'D', 2, 4], [5, 7, 'E', 3, 1], [5, 10, 'G', 5, 4], [4, 7, 'A', 6, 1], [4, 10, 'C', 1, 4],
      [3, 7, 'D', 2, 1], [3, 9, 'E', 3, 3], [2, 8, 'G', 5, 1], [2, 10, 'A', 6, 3], [1, 8, 'C', 1, 1], [1, 10, 'D', 2, 3]],
      shape: ['6-8', '5-10', '4-10', '3-9', '2-8', '1-8'], idx: 7, prog: ['C', 'G', 'Am', 'F'], progKey: 'jny-penta-e',
      fingerNote: '6번줄은 ' + em('2번 손가락') + '부터 시작하고\n1·2번줄은 검지를 ' + em('8프렛') + '으로 옮겨요', hot: ['6-8', '2-8', '1-8'] },
    D: { day: 19, block: [[6, 10, 'D', 2, 1], [6, 12, 'E', 3, 3], [5, 10, 'G', 5, 1], [5, 12, 'A', 6, 3], [4, 10, 'C', 1, 1], [4, 12, 'D', 2, 3],
      [3, 9, 'E', 3, 1], [3, 12, 'G', 5, 4], [2, 10, 'A', 6, 1], [2, 13, 'C', 1, 4], [1, 10, 'D', 2, 1], [1, 12, 'E', 3, 3]],
      shape: ['4-10', '3-12', '2-13', '1-12'], idx: 10, prog: ['Am', 'Em', 'F', 'G'], progKey: 'jny-penta-d',
      fingerNote: '3번줄만 검지를\n' + em('9프렛') + '으로 옮겨서 눌러요', hot: ['3-9'] },
  };
  // 솔로연주 비기너(2026-11-23 — docs/solo-beginner-curriculum.md): 같은 다섯 노드가 D4~D8(G C A E D). 문구만 코스에 맞춤(코드를 아직 안 배운 학습자)
  const SOLO = /[?&]course=soloing/.test(location.search);
  const FORM_KEY = (function () {
    const m = /[?&]day=(\d+)/.exec(location.search), day = (m ? +m[1] : 0) + (SOLO ? 10 : 0);   // 솔로 D5~D9 = 코드반주 D15~D19와 같은 폼(기초 리듬이 D4로 앞당겨짐 — 사용자 지정 2026-11-24)
    return Object.keys(FORMS).filter(function (k) { return FORMS[k].day === day; })[0] || 'G';
  })();
  const FORM = FORMS[FORM_KEY];
  const FN = FORM_KEY + '폼';   // 'C폼' 등
  const IS_G = FORM_KEY === 'G';   // D15 — 펜타토닉 설명이 있는 첫 노드

  // ── 음이름 줄 — D2 부품(.n2-row·.n2-cell) 그대로: 위 = 음이름, 아래 = 도수 ──
  const ROW = { lets: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], degs: ['1', '2', '3', '4', '5', '6', '7'], midi: [60, 62, 64, 65, 67, 69, 71] };
  function rowHtml() {
    return ROW.lets.map(function (l, k) {
      return '<span class="n2-cell" data-k="' + k + '"><span class="n2-let">' + l + '</span><span class="n2-syl">' + ROW.degs[k] + '</span></span>';
    }).join('');
  }

  // ── 기타 지판 — 스케일 훈련 퀴즈 지판과 같은 규칙·클래스(D2 sfbHtml과 같음). 너트 없이 블럭 양옆으로 한 칸씩 더 보이는 창 — 양 끝 칸은 흐리게(.n15-sfb) ──
  //  기준 폭 360px = 7칸, 넥 높이 = (360/2.3 − 2.25) × 6/5, 내부 단위 --fbu = 넥 높이 ÷ 160
  const SFB_REF_W = 360, SFB_REF_COLS = 7, SFB_MAX_W = 520;
  const SFB_NECK_H = (SFB_REF_W / 2.3 - 2.25) * 6 / 5;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];   // 1→6번줄(스케일 훈련 STRING_THICKNESS)
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];          // 1→6번줄 E4 B3 G3 D3 A2 E2
  const BLOCK_FRETS = FORM.block.map(function (n) { return n[1]; });
  const TAP_LO = Math.min.apply(null, BLOCK_FRETS), TAP_HI = Math.max.apply(null, BLOCK_FRETS);   // 누를 수 있는 칸 = 블럭이 있는 프렛(양 끝 흐린 칸은 제외). G 5~8 · C 12~15 · A 2~5 · E 7~10 · D 9~13
  const WIN_LO = TAP_LO - 1, COLS = TAP_HI - TAP_LO + 3;   // 창 = 블럭 앞뒤 한 칸씩(G 4~9프렛 6칸, D폼만 5칸 블럭이라 7칸)
  const SINGLE_DOTS = [3, 5, 7, 9, 15, 17], DOUBLE_DOTS = [12];   // 포지션 점(스케일 훈련 SINGLE_DOT_FRETS·DOUBLE_DOT_FRETS — 12프렛은 위아래 두 개 33%·67%)
  function inWin(f) { return f >= WIN_LO && f < WIN_LO + COLS; }
  const LEC_FB_MAX_W = 316;                            // 강의 무대(220px)에 넥 + 프렛 번호가 들어가는 최대 기준 폭(D2와 같음)
  function sfbX(f) { return (f - WIN_LO + 0.5) / COLS * 100; }
  function sfbY(sN) { return (sN - 0.5) / 6 * 100; }
  function sfbSizeStyle(availW, maxW) {
    const scale = Math.min(availW || SFB_REF_W, maxW) / SFB_REF_W;
    const colW = SFB_REF_W * scale / SFB_REF_COLS;
    return 'width:' + (colW * COLS) + 'px;--fbu:' + (SFB_NECK_H / 160 * scale) + 'px;--fbs:' + scale + ';--n15-fade:' + (colW * 0.7) + 'px';
  }
  // opt.draw: 줄이 왼쪽부터 그어짐(강의) / opt.ghost: 이 자리들(키 목록)에 고스트 노트(퀴즈 빈자리 채우기)
  function sfbHtml(id, availW, maxW, opt) {
    let h = '';
    for (let sN = 1; sN <= 6; sN++) h += '<div class="fb-string" data-s="' + sN + '" style="top:' + sfbY(sN) + '%;height:' + STRING_THICKNESS[sN - 1] + 'px"></div>';
    for (let c = 0; c <= COLS; c++) h += '<div class="fb-fret-line" style="left:' + (c / COLS * 100) + '%"></div>';
    SINGLE_DOTS.filter(inWin).forEach(function (f) { h += '<div class="fb-dot" style="left:' + sfbX(f) + '%;top:50%"></div>'; });
    DOUBLE_DOTS.filter(inWin).forEach(function (f) { [33, 67].forEach(function (y) { h += '<div class="fb-dot" style="left:' + sfbX(f) + '%;top:' + y + '%"></div>'; }); });
    (opt.ghost || []).forEach(function (k) { const sf = k.split('-'); h += '<div class="fb-note fb-note--ghost" data-g="' + k + '" style="left:' + sfbX(+sf[1]) + '%;top:' + sfbY(+sf[0]) + '%"></div>'; });
    let nums = '';
    for (let f = WIN_LO; f < WIN_LO + COLS; f++) {   // 점 칸 번호만 늘 보임(D1 규칙), 블럭 안의 나머지 칸 번호는 손가락 설명 때만(.n15-fn-x)
      const dotF = SINGLE_DOTS.indexOf(f) >= 0 || DOUBLE_DOTS.indexOf(f) >= 0;
      if (!dotF && (f < TAP_LO || f > TAP_HI)) continue;
      nums += '<div class="fb-fret-num' + (dotF ? '' : ' n15-fn-x') + '" data-f="' + f + '" style="left:' + sfbX(f) + '%">' + f + '</div>';
    }
    return '<div class="fb-full-wrapper n2-sfb n15-sfb degrees-on' + (opt.draw ? ' n2-sfb--draw' : '') + '" style="' + sfbSizeStyle(availW, maxW) + '">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums">' + nums + '</div></div>';
  }
  // 음 점 — 스케일 훈련 .fb-note(브랜드색 점 + 흰 글자). data-k = '줄-프렛'
  function sfbNote(sN, f, label, extra) {
    const el = document.createElement('div');
    el.className = 'fb-note' + (extra ? ' ' + extra : '');
    el.style.left = sfbX(f) + '%';
    el.style.top = sfbY(sN) + '%';
    el.dataset.k = sN + '-' + f;
    if (label) el.innerHTML = '<span class="fb-note-deg">' + label + '</span>';
    return el;
  }
  // 누른 자리 → [줄, 프렛] (블럭 프렛 범위 밖이면 null)
  function tapPos(neckEl, e) {
    const r = neckEl.getBoundingClientRect();
    const f = Math.floor((e.clientX - r.left) / r.width * COLS) + WIN_LO;
    const sN = Math.floor((e.clientY - r.top) / r.height * 6) + 1;
    if (f < TAP_LO || f > TAP_HI || sN < 1 || sN > 6) return null;
    return [sN, f];
  }

  const BLOCK = FORM.block;
  const SHAPE = FORM.shape;   // 블럭 안의 코드 모양(G폼 = G코드 320003을 5프렛 옮긴 자리 = C코드 소리)
  const ROOTS = BLOCK.filter(function (n) { return n[3] === 1; });   // 근음 자리(낮은 C부터) — G·E폼 세 군데, C·A·D폼 두 군데
  const ROOT_CNT = ['', '한', '두', '세'][ROOTS.length];
  function keyOf(n) { return n[0] + '-' + n[1]; }
  function midiOf(n) { return OPEN_MIDI[n[0] - 1] + n[1]; }
  function noteAt(k) { return BLOCK.filter(function (n) { return keyOf(n) === k; })[0] || null; }
  function labelOf(n, mode) { return mode === 'name' ? n[2] : mode === 'deg' ? String(n[3]) : mode === 'finger' ? String(n[4]) : ''; }

  function build(stage) {
    stage.classList.add('is-jny');
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="n15-row"><div class="n2-row n15-row" id="n15-rowin">' + rowHtml() + '</div></div>' +
      '<div class="jl-layer n15-fbl" id="n15-fb">' + sfbHtml('n15-neck', stage.clientWidth || (window.innerWidth - 32), LEC_FB_MAX_W, { draw: true }) +
      '<div class="n15-prog" id="n15-prog">' + JAM_PROG.map(function (c, i) { return '<span class="n15-pc" data-i="' + i + '">' + c + '</span>'; }).join('') + '</div></div></div>';
    $('n15-neck').addEventListener('click', neckTap);
    loadBacking();   // 자유 연주 칸 반주(드럼 샘플 포함)를 미리 불러 둠
  }

  // ── 요소 찾기 ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function part(k, p) { return q('.n2-cell[data-k="' + k + '"] .n2-' + p); }
  function cell(k) { return q('.n2-cell[data-k="' + k + '"]'); }
  function neck() { return $('n15-neck'); }
  function dot(k) { return neck().querySelector('.fb-note[data-k="' + k + '"]'); }
  function dots(keys) { return keys.map(dot).filter(Boolean); }
  function allDots() { return q('#n15-neck .fb-note'); }
  function tapNums() { return q('#n15-fb .fb-fret-num').filter(function (el) { const f = +el.dataset.f; return f >= TAP_LO && f <= TAP_HI; }); }   // 블럭이 있는 칸의 프렛 번호
  function none() { return Promise.resolve(); }
  function pop(els) {   // 한 번 커졌다 돌아옴
    return Promise.all(els.map(function (el) {
      return new Promise(function (res) {
        const a = J.anim(el, [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(1.35)' }, { transform: 'translate(-50%, -50%) scale(1)' }], { duration: 420, easing: J.EASE_OUT });
        a.onfinish = res; a.oncancel = res;
      });
    }));
  }

  // 스케일 재생 — D2 legato 그대로: 기타 소리, 각 음은 다음 음이 시작될 때까지만(0.18초 페이드), 마지막 음 1.2초. onEach(k)는 소리와 같은 시각
  function legato(midis, stepMs, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    midis.forEach(function (m, k) {
      const last = k === midis.length - 1;
      J.note(m, t0 + k * stepMs / 1000, last ? 1.2 : stepMs / 1000, last ? 0.8 : 0.18);
      later(function () { onEach(k); }, lead + k * stepMs);
    });
    return wait(lead + (midis.length - 1) * stepMs + 900);
  }
  // 화음 — 낮은 줄부터 살짝 흘려서(다운 스트로크처럼)
  function chordOf(keys) {
    const t0 = J.audioT0();
    keys.slice().sort(function (a, b) { return +b.split('-')[0] - +a.split('-')[0]; }).forEach(function (k, i) { J.note(midiOf(noteAt(k)), t0 + i * 0.03, 1.6, 0.6); });
    return wait(J.leadMs() + 1600);
  }

  // 음이름 줄 — 처음 모습(7칸 모두 빈 글자)으로
  function resetRow() { $('n15-rowin').innerHTML = rowHtml(); }
  // 줄에서 칸을 차례로 짚으며 재생(울리는 칸만 파랑). cells[k] = k번째 음이 짚는 칸
  //  reveal: 짚는 칸의 음이름을 그때 띄움(처음 보여 줄 때)
  function rowRun(midis, cells, stepMs, reveal) {
    return legato(midis, stepMs, function (k) {
      setCls(q('.n2-let.is-focus'), 'is-focus', false);
      setCls(part(cells[k], 'let'), 'is-focus', true);
      if (reveal) fx(part(cells[k], 'let'), 'is-in', true);
    }).then(function () { setCls(q('.n2-let.is-focus'), 'is-focus', false); });
  }

  // 지판 — 줄이 그어진 빈 지판(층이 꺼져 있으면 켬)
  function showBoard() {
    return fx([$('n15-fb')], 'is-on', true).then(function () { return fx(q('#n15-neck .fb-string'), 'is-in', true, 60); });
  }
  function clearNeck() {
    fillSt = null;
    jamCut();
    setCls([$('n15-prog')], 'is-in', false);
    setCls(q('#n15-prog .is-focus'), 'is-focus', false);
    allDots().forEach(function (el) { el.remove(); });
    setCls(q('.fb-fret-num.n15-fn-x'), 'is-in', false);
    setCls(q('.fb-fret-num.is-focus'), 'is-focus', false);
  }
  // 블럭 전체를 한 번에 — mode = 'name' | 'deg' | 'finger' | ''(글자 없음 → 근음은 스케일 훈련 표시) / 글자가 있으면 근음 점 자체를 파랑
  function drawBlock(mode) {
    clearNeck();
    setCls(q('#n15-neck .fb-string'), 'is-in', true);
    BLOCK.forEach(function (n) {
      const root = n[3] === 1;
      neck().appendChild(sfbNote(n[0], n[1], labelOf(n, mode), root ? (mode ? 'n15-root' : 'fb-note--root') : ''));
    });
  }
  // 점 글자 바꾸기 — 글자만 옅어졌다가 새 글자로(점은 그대로). 한 화면에 한 가지 표기만(§4-31)
  function relabel(mode) {
    const els = allDots();
    return fx(els, 'n15-lab-out', true).then(function () {
      els.forEach(function (el) { const s = el.querySelector('.fb-note-deg'); if (s) s.textContent = labelOf(noteAt(el.dataset.k), mode); });
      return fx(els, 'n15-lab-out', false);
    });
  }
  // 글자 없는 블럭(직접 채우기 끝 화면)에 손가락 번호를 들임 — 근음은 흰 원 표시 → 점 자체 파랑(글자 칸 규칙), 글자는 옅은 데서 나타남(relabel과 같은 전환). 자유 연주용(사용자 지정 2026-11-23)
  function fingerIn() {
    const els = allDots().filter(function (el) { return noteAt(el.dataset.k); });
    els.forEach(function (el) {
      const n = noteAt(el.dataset.k);
      if (n[3] === 1) { el.classList.remove('fb-note--root'); el.classList.add('n15-root'); }
      el.classList.add('n15-lab-out');
      el.innerHTML = '<span class="fb-note-deg">' + labelOf(n, 'finger') + '</span>';
    });
    if (els.length) void els[0].offsetWidth;
    return fx(els, 'n15-lab-out', false);
  }
  // 블럭을 낮은 음부터 차례로 울리며 점마다 통통(점 색은 그대로 — 근음 파랑과 섞이지 않게)
  function blockRun(order, stepMs) {
    return legato(order.map(midiOf), stepMs, function (k) { pop(dots([keyOf(order[k])])); });
  }

  // ── 직접 채우기(참여형, §4-8·§4-29) — 고스트 12개를 전부 누를 때까지 '다음' 잠금. 누르면 그 음 + 점(근음 = 가운데 흰 원). 틀린 자리 = 연한 오답 고스트가 잠깐 + 그 자리 음 ──
  let fillSt = null;
  function ghostBlock() {
    clearNeck();
    setCls(q('#n15-neck .fb-string'), 'is-in', true);
    BLOCK.forEach(function (n) { neck().appendChild(sfbNote(n[0], n[1], '', 'fb-note--ghost' + (n[3] === 1 ? ' fb-note--root' : ''))); });
  }
  function fillDot(k, sound) {
    const g = dot(k);
    if (!g || !g.classList.contains('fb-note--ghost')) return false;
    g.classList.remove('fb-note--ghost');
    g.classList.add('n2-pop');
    if (sound) J.note(midiOf(noteAt(k)), J.audioT0(), 1.4, 0.6);
    return true;
  }
  function missGhost(sN, f) {
    J.note(OPEN_MIDI[sN - 1] + f, J.audioT0(), 1.4, 0.6);
    const el = sfbNote(sN, f, '', 'n15-miss');
    neck().appendChild(el);
    const a = J.anim(el, [{ opacity: 0.4 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    a.onfinish = a.oncancel = function () { el.remove(); };
  }
  function neckTap(e) {
    const p = tapPos(neck(), e);
    if (!p) return;
    const k = p[0] + '-' + p[1];
    if (jamOn) { jamTap(k); return; }
    if (!fillSt) return;
    if (fillDot(k, true)) {
      if (--fillSt.left <= 0) { const st = fillSt; fillSt = null; later(st.res, 500); }
    } else if (!dot(k)) missGhost(p[0], p[1]);
  }
  // 전부 채울 때까지 기다림. 빨리 돌리는 중(이동·건너뛰기)이면 기다리지 않고 바로 다 채움(D1 waitTap과 같음)
  function waitFill() {
    return new Promise(function (res) {
      const finish = function () { fillSt = null; BLOCK.forEach(function (n) { fillDot(keyOf(n), false); }); res(); };
      if (J.skipping()) { finish(); return; }
      fillSt = { res: res, left: BLOCK.length };
      (function poll() { later(function () { if (!fillSt) return; if (J.skipping()) finish(); else poll(); }, 200); })();
    });
  }

  // ── 자유 연주(사용자 지정 2026-11-18~19) — C Am F G 반주가 한 마디씩 계속 반복, 학습자는 기타로(없으면 화면 블럭을 눌러) 자유롭게 연주 ──
  //  반주 = 스케일 훈련 연습 반주 '기본1'(backing-track.js BackingTrack — 드럼 세트 1 · 피아노 4분음표 4박 · 베이스 8분음표 1·4·7번째 칸, 사용자 지정) 그대로,
  //   진행만 폼마다 다른 열쇠(FORM.progKey — G C Am F G · C Dm G C Am · A F G Em Am · E C G Am F · D Am Em F G, 사용자 지정). 80bpm.
  //  반주는 엔진 밖 자체 타이머라 엔진의 하드컷 지점(칸 이동·이동·건너뛰기·닫기/이탈)에서 onCut으로 같이 끊음(BackingTrack.stop = 드럼·피아노·베이스 즉시 정리).
  //   앱 전환 일시정지는 엔진이 오디오 시계(Tone 컨텍스트)를 멈춰 반주도 함께 멈추고, 돌아오면 이어짐
  const JAM_PROG = FORM.prog;
  const JAM_BPM = 80;
  const BACKING_SCRIPTS = ['drum-sets.js', 'drum-samples.js', 'drum-audio.js', 'backing-track.js'];   // 스케일 훈련(scale-level.html)과 같은 순서 — 이 노드에서만 필요해 강의 페이지 공용 목록에 넣지 않고 불러옴
  let jamOn = false, backingLoad = null;
  function loadBacking() {
    if (backingLoad) return backingLoad;
    if (typeof BackingTrack !== 'undefined') return (backingLoad = Promise.resolve());
    backingLoad = BACKING_SCRIPTS.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          const s = document.createElement('script');
          s.src = src;
          s.onload = res;
          s.onerror = function () { rej(new Error('반주 스크립트를 불러오지 못함: ' + src)); };
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve()).catch(function (e) { console.error('[pentatonic-forms]', e); });   // 실패하면 반주 없이 진행(블럭 누르기는 됨)
    return backingLoad;
  }
  function backingStop() { if (typeof BackingTrack !== 'undefined') BackingTrack.stop(); }   // 멱등(재생 중이 아니면 대기 중인 start만 취소)
  // 반주 시작 + 지금 코드 이름 파랑(오디오 시계 기준 BackingTrack.getCurrentChordIndex를 엔진 타이머로 읽음 — 칸이 바뀌면 엔진이 지움)
  //  솔로(D5~D9): 반주 첫 마디부터 블럭 상행·하행 시연 한 번(사용자 지정 2026-11-24) — 8분음표, 12음 = 2마디(8음 + 3음 + 마지막 음 2.5박 끌기),
  //   상행(6번줄부터) 2마디 → 꼭대기 음을 한 번 더 치고 하행 2마디. 반주 시계(BackingTrack.startTime) 기준 예약, 칸이 바뀌면 엔진이 기타를 끊고 J.later를 지움
  let jamDemo = null;   // 시연이 끝나면 풀리는 약속 — 자유 연주 칸 '기타가 없다면' 문구가 기다림
  function now() { return Tone.getContext().rawContext.currentTime; }   // 반주 시계와 같은 오디오 시계(D10·D11 audioNow와 같음)
  function jamDemoRun(t0) {
    const e = 4 * 60 / JAM_BPM / 8, seq = [];
    [BLOCK, BLOCK.slice().reverse()].forEach(function (run, r) {
      run.forEach(function (n, k) { seq.push({ n: n, at: t0 + (r * 16 + k) * e, dur: (k === 11 ? 5 : 1) * e }); });
    });
    seq.forEach(function (s, i) {
      J.note(midiOf(s.n), s.at, s.dur, i === seq.length - 1 ? 0.8 : 0.18);
      later(function () {
        const el = dot(keyOf(s.n));
        if (!el || !jamOn) return;
        el.classList.add('fb-note--playing');
        pop([el]);
        later(function () { el.classList.remove('fb-note--playing'); }, Math.min(250, s.dur * 1000));
      }, Math.max(0, (s.at - now()) * 1000));
    });
    return wait(Math.max(0, (t0 + 32 * e - now()) * 1000) + 300);
  }
  function jamStart() {
    if (J.skipping()) { jamDemo = Promise.resolve(); return jamDemo; }
    jamOn = true;
    let fin;
    jamDemo = new Promise(function (res) { fin = res; });
    return loadBacking().then(function () {
      if (!jamOn || typeof BackingTrack === 'undefined') return;
      return BackingTrack.start(function () { return { bpm: JAM_BPM, root: 0, level: FORM.progKey }; }, 'basic');
    }).then(function (ok) {
      if (!ok || !jamOn) { fin(); return; }
      if (SOLO) jamDemoRun(BackingTrack.startTime ? BackingTrack.startTime() : now() + 0.1).then(fin); else fin();
      let cur = -1;
      (function poll() {
        if (!jamOn || J.skipping()) return;
        const i = BackingTrack.getCurrentChordIndex();
        if (i !== cur && i >= 0) {
          cur = i;
          setCls(q('#n15-prog .is-focus'), 'is-focus', false);
          setCls(q('#n15-prog .n15-pc[data-i="' + i + '"]'), 'is-focus', true);
        }
        later(poll, 50);
      })();
    });
  }
  function jamCut() { jamOn = false; backingStop(); }
  // 누른 점 = 그 음 + 점이 잠깐 파랑(스케일 훈련 재생 표시 .fb-note--playing) + 통통. 블럭 밖 자리는 소리 없음
  function jamTap(k) {
    const n = noteAt(k), el = dot(k);
    if (!n || !el) return;
    J.note(midiOf(n), J.audioT0(), 1.4, 0.6);
    el.classList.add('fb-note--playing');
    pop([el]);
    setTimeout(function () { el.classList.remove('fb-note--playing'); }, 250);
  }

  // 줄마다 두 음 — 6번줄부터 한 줄씩, 그 줄의 두 점을 차례로 짚으며(통통) 울림(줄 안 0.35초, 줄 사이 0.9초). 1칸·2칸 차이(눈에 보이는 칸)를 줄 단위로 보여 줌
  const PAIR_IN_MS = 350, PAIR_GAP_MS = 900;
  function pairRun() {
    const t0 = J.audioT0(), lead = J.leadMs();
    [6, 5, 4, 3, 2, 1].forEach(function (s, i) {
      BLOCK.filter(function (n) { return n[0] === s; }).forEach(function (n, j) {
        const at = i * PAIR_GAP_MS + j * PAIR_IN_MS;
        J.note(midiOf(n), t0 + at / 1000, 0.8, 0.3);
        later(function () { pop(dots([keyOf(n)])); }, lead + at);
      });
    });
    return wait(lead + 5 * PAIR_GAP_MS + PAIR_IN_MS + 600);
  }

  // 블럭을 6번줄부터 레가토로 울리며 점(음이름)으로 채움
  function fillNames() {
    return legato(BLOCK.map(midiOf), 450, function (k) { const n = BLOCK[k]; neck().appendChild(sfbNote(n[0], n[1], n[2], 'n2-pop')); });
  }

  // ── 여러 폼이 같이 쓰는 칸 ──
  // 근음 — 근음 점 자체를 파랑(글자 칸 — 사용자 지정) + 낮은 C부터 차례로
  function rootRun() {
    setCls(dots(ROOTS.map(keyOf)), 'n15-root', true);
    const t0 = J.audioT0();
    ROOTS.forEach(function (n, i) { J.note(midiOf(n), t0 + i * 0.5, 1.2, 0.6); later(function () { pop(dots([keyOf(n)])); }, J.leadMs() + i * 500); });
    return wait(J.leadMs() + (ROOTS.length - 1) * 500 + 1400);
  }
  // 코드 모양 — 나머지 점은 옅게, 모양 자리 파랑 + 화음(근음은 모든 폼에서 모양 안에 있음 — 점검 스크립트로 확인)
  function shapeRun() {
    setCls(allDots().filter(function (el) { return SHAPE.indexOf(el.dataset.k) < 0; }), 'n15-dim', true);
    setCls(dots(SHAPE), 'n15-root', true);
    return wait(700).then(function () { return chordOf(SHAPE); });
  }
  // 직접 채우기(참여형): 고스트 12개를 직접 눌러 블럭 완성(근음은 스케일 훈련 표시) → 완성된 블럭을 한 번 울림. lock(§4-8). 끝 화면 = 글자 없는 블럭(퀴즈와 같은 모습)
  function fillStep() {
    return Object.assign(J.chainSteps([
      { text: '이제 직접 ' + FN + '을 채워볼까요?\n흐린 점을 모두 눌러주세요!', scene: 'n15-fb', enter: ghostBlock, gap: 800, run: function () {
        return fx([$('n15-fb')], 'is-on', true).then(waitFill);
      } },
      { text: '잘했어요!\n이게 바로 ' + em('펜타토닉 스케일 ' + FN) + '이에요', gap: 1800, run: function () { return blockRun(BLOCK, 150); } },   // 상행 시연이 잦아 피로 — 채운 뒤 확인은 빠르게(사용자 지정 2026-11-24)
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true });
  }
  // 자유 연주(적용 — 사용자 지정 2026-11-18~19): 폼마다 다른 코드진행 반주(스케일 훈련 '기본1' — 드럼·피아노·베이스)가 계속 반복되는 동안 자유 연주.
  //  기타가 있으면 기타로 리듬을 넣어 자유롭게(§4-6 실제 기타 우선), 없으면 화면 블럭을 아무렇게나 눌러서. 마지막 문구 뒤 '다음'이 켜지고 반주는 그 뒤로도 계속(원하는 만큼 — §4-23)
  //  끝 화면 = 손가락 번호 블럭(근음 파랑 — 첫 문구에서 들임, 사용자 지정 2026-11-23) + 아래 코드 이름 줄(지금 코드 파랑)
  function jamStep() {
    // D15~D19 같은 흐름(사용자 지정 2026-11-23). 첫 문구만 D16~D19는 D15와 중복되지 않게 '○폼 스케일 블럭도 …'
    //  솔로 D6~D9(C·A·E·D폼): 첫 문구 → 바로 마지막 문구(반주·기타 안내는 D5에서 했으니 뺌 — 사용자 지정 2026-11-24). 반주·상하행 시연은 첫 문구 끝에서 시작, 마지막 문구가 시연 끝까지 기다림
    if (SOLO && !IS_G) return J.chainSteps([
      { text: FN + ' 스케일 블럭도 코드진행을\n틀어놓고 연습해보세요!', enter: function () { jamOn = false; }, run: function () { return Promise.all([fx([$('n15-prog')], 'is-in', true), fingerIn()]).then(function () { jamStart(); }); } },
      { text: '원하는 만큼 연주한 뒤 다음으로 넘어가 주세요!', run: function () { return jamDemo || none(); } },
    ]);
    return J.chainSteps([
      { text: IS_G ? '스케일은 코드진행을 틀어놓고\n연습해보는게 좋아요!' : FN + ' 스케일 블럭도 코드진행을\n틀어놓고 연습해보세요!', enter: function () { jamOn = false; }, run: function () { return Promise.all([fx([$('n15-prog')], 'is-in', true), fingerIn()]); } },
      { text: SOLO ? em('반주') + '를 계속 틀어드릴게요' : em(JAM_PROG.join(' ')) + ' 코드진행을\n계속 틀어드릴게요', run: function () { jamStart(); } },   // 반주 준비(드럼·피아노·베이스 샘플)를 문구 진행이 기다리지 않게 — 늦게 준비돼도 jamOn·BackingTrack 토큰이 칸을 떠난 뒤 시작을 막음
      { text: SOLO ? '기타가 있다면 ' + em('2연음') + ' 얼터네이트 피킹으로\n' + FN + '을 연주해보세요!' : '기타가 있다면 꼭 기타로\n' + em('자유롭게 리듬') + '을 넣어 ' + FN + '을 연주해보세요!', run: none },   // 솔로 = 2연음(같은 시간 상하행 시연 리듬 8분음표 — 사용자 지정 2026-11-24, 이전 4비트)
      { text: '기타가 없다면 화면의\n' + em('스케일 블럭') + '을 아무렇게나 눌러보세요!', run: function () { return SOLO && jamDemo ? jamDemo : none(); } },   // 솔로 = 상행·하행 시연이 끝날 때까지 이 문구에서 기다림
      { text: '원하는 만큼 연주한 뒤 다음으로 넘어가 주세요!', run: none },   // 2026-11-23 사용자 문구 — '잘 어울리죠?'는 마무리 칸 첫 문구로 옮김
    ]);
  }
  // 마무리: 다음 할 일(퀴즈 — 빈자리·근음·도수), 시간 제한 없음 + 실제 기타로(§4-12)
  function guideStep() {
    // 사용자 문구 2026-11-23 — D15: 자유 연주 소감 → 펜타토닉의 의미 → 퀴즈 안내 / D16: C폼의 쓰임 → 퀴즈 안내 / D17~D19: 퀴즈 안내 하나(D15와 중복되는 문구는 뺌)
    const stop = function () { jamOn = false; setCls(q('#n15-prog .is-focus'), 'is-focus', false); };   // 반주는 칸이 바뀌며 엔진이 끊음(onCut) — 누르기만 막고 코드 이름 줄은 남김
    const quizText = IS_G ? '스케일 블럭을 확실히 외울 수 있도록\n퀴즈를 풀어보면서 암기해주세요~!'   // 사용자 문구 2026-11-24 — G폼(첫 폼)
      : '이번 시간에 배운 스케일블럭도\n확실히 암기할 수 있도록 퀴즈를 풀어주세요!';   // C·A·E·D폼 공통 패턴(사용자 문구 2026-11-24)
    const items = IS_G ? [
      { text: '어떤 음을 연주해도 잘 어울리죠?', run: none },
      { text: '펜타토닉 스케일은 초보, 프로 할 것 없이\n연주의 뼈대가 되는 중요한 스케일이에요!', run: none },
      { text: quizText, run: none },
    ] : FORM_KEY === 'C' ? [
      // C폼만(사용자 지정): G폼과 함께 실제 연주에서 매우 자주 쓰이는 폼 — 마무리 칸 첫 문구(2026-11-23 따로 있던 칸을 합침)
      { text: em('C폼') + '은 ' + em('G폼') + '과 함께\n실제 연주에서 굉장히 자주 쓰이는 폼이에요', run: none },
      { text: quizText, run: none },
    ] : [{ text: quizText, run: none }];
    items[0].enter = stop;
    return J.chainSteps(items);
  }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 복습·적용)은 주석 ──
  //  강의 최종 목적: 펜타토닉 = 1 2 3 5 6도 / G폼 블럭 모양·근음 자리 / 손가락 1~4 나란히(퀴즈 ① 빈자리 ② 근음 ③ 도수)
  const stepsG = [
    // P1 펜타토닉 음계
    // 0 핵심(새 내용): 오늘부터 스케일, 그 첫 번째가 펜타토닉. 도입이라 문구만(§4-11)
    J.chainSteps([
      { text: '이번 시간부터는\n' + em('스케일') + '을 배워볼게요!', scene: 'n15-row', enter: resetRow, run: none },
      { text: SOLO ? '솔로연주는 ' + em('스케일') + '에서 시작해요' : '스케일을 알면 코드반주도\n더 체계적으로 이해할 수 있어요', run: none },
      { text: '그중에서도 거의 모든 코드진행에 잘 어울리는\n' + em('펜타토닉 스케일') + '부터 시작할게요', run: none },
    ]),
    // 1 핵심(D2·D13 복습): C 메이저스케일 = C D E F G A B = 1도~7도. 끝 화면 = 음이름 + 도수 7칸
    Object.assign(J.chainSteps([
      { text: em('C 메이저스케일') + ' 기억나시죠?', scene: 'n15-row', run: function () {
        return fx([$('n15-row')], 'is-on', true).then(function () {
          return rowRun(ROW.midi.concat([72]), [0, 1, 2, 3, 4, 5, 6, 0], 420, true);
        });
      } },
      { text: SOLO ? '시작음 C부터 차례로\n' + em('1도') + '부터 ' + em('7도') + '까지 번호를 붙여요' : '시작음 C부터 차례로\n' + em('1도') + '부터 ' + em('7도') + '까지였죠?', run: function () {
        return fx(q('.n2-syl'), 'is-in', true, 120);
      } },
    ].concat(SOLO ? [{ text: '몇 번째 음인지 나타내는 이 숫자를\n' + em('도수') + '라고 해요', run: none }] : [])), { ms: SOLO ? 11620 : 9460 }),   // 솔로 = 도수 문구가 더해진 측정값   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)
    // 2 핵심(새 내용): 4도·7도를 빼면 1 2 3 5 6 = 펜타토닉, 5음이라 '펜타'. 끝 화면 = 5칸(C D E G A / 1 2 3 5 6)
    Object.assign(J.chainSteps([
      { text: '여기서 ' + em('4도') + '와 ' + em('7도') + '를 빼볼게요', run: function () {
        setCls(part(3, 'let').concat(part(3, 'syl'), part(6, 'let'), part(6, 'syl')), 'is-focus', true);
        return wait(900).then(function () { return fx(cell(3).concat(cell(6)), 'n15-out', true); });
      } },
      { text: '남은 ' + em('C D E G A') + ', 즉 ' + em('1 2 3 5 6도') + '가\n바로 ' + em('펜타토닉 스케일') + '이에요!', run: function () {
        return rowRun([60, 62, 64, 67, 69, 72], [0, 1, 2, 4, 5, 0], 420);
      } },
      { text: '음이 5개라서 \'5\'를 뜻하는\n' + em('펜타') + '라는 이름이 붙었어요', run: none },
    ]), { ms: 12220 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)
    // 3 핵심(새 내용): 왜 쓰기 좋은가 — 어느 음을 눌러도 어색하지 않음(짧은 멜로디로 들려줌), 대중음악 멜로디의 뼈대(스케일 훈련 튜토리얼 문구)
    Object.assign(J.chainSteps([
      { text: '음이 5개뿐이라 어느 음을 눌러도\n' + em('어색하지 않아서') + ' 연습하기 좋아요', run: function () {
        return rowRun([64, 67, 69, 72, 69, 67, 64, 62, 60], [2, 4, 5, 0, 5, 4, 2, 1, 0], 330);
      } },
      { text: '가요, 팝, 록 같은 대중음악 멜로디의\n' + em('뼈대') + '가 되는 스케일이에요', run: none },
    ]), { ms: 8760 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)

    // P2 G폼
    // 4 핵심(새 내용): 기타에서는 스케일을 '스케일 블럭' 모양으로 외움 → 오늘은 G폼. 6번줄부터 채우며 점 안에 음이름. 끝 화면 = 음이름 블럭
    Object.assign(J.chainSteps([
      { text: '이제 기타에서\n펜타토닉 스케일을 찾아볼게요', scene: 'n15-fb', enter: clearNeck, run: showBoard },
      { text: '기타에서는 스케일을 ' + em('스케일 블럭') + '이라는\n덩어리 모양으로 외워요', run: none },
      { text: '그중 ' + em('G폼') + '을 6번줄부터 채워볼게요!', run: function () {
        return legato(BLOCK.map(midiOf), 450, function (k) { const n = BLOCK[k]; neck().appendChild(sfbNote(n[0], n[1], n[2], 'n2-pop')); });
      } },
    ]), { ms: 16970 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)
    // 5 핵심(새 내용 — '근음'은 D12): C = 근음, 블럭에 세 군데. 근음 점 자체를 파랑(글자 칸 — 사용자 지정) + C 세 음. 끝 화면 = 음이름 블럭 + 근음 파랑
    { text: em('C') + '가 이 스케일의 시작음인 ' + em('근음') + '이에요\n블럭 안에 세 군데 있죠?', run: function () {
      const roots = BLOCK.filter(function (n) { return n[3] === 1; });   // 낮은 C부터
      setCls(dots(roots.map(keyOf)), 'n15-root', true);
      const t0 = J.audioT0();
      roots.forEach(function (n, i) { J.note(midiOf(n), t0 + i * 0.5, 1.2, 0.6); later(function () { pop(dots([keyOf(n)])); }, J.leadMs() + i * 500); });
      return wait(J.leadMs() + 1000 + 1400);
    } },
    // 6 핵심(새 내용): 이름의 이유 — 근음 세 자리를 포함한 여섯 자리가 G코드 모양. 나머지 점은 옅게, 여섯 자리 파랑 + 화음. 끝 화면 = G모양 강조
    SOLO ? Object.assign(J.chainSteps([
      { text: '이 블럭은 ' + em('G폼') + '이라고 불러요', run: shapeRun },
      { text: '블럭 안에 숨은 ' + em('코드 모양') + '에서\n따온 이름이에요', run: function () { return pop(dots(SHAPE)); } },
    ]), { ms: 5800 }) : J.chainSteps([   // 솔로: CAGED 예고 문구는 뺌(2026-11-24 — CAGED 노드가 언박싱 1일차에서 빠짐)
      { text: '근음 세 자리와 함께\n이 여섯 자리를 보면 어떤 모양이 보이나요?', run: function () {
        setCls(allDots().filter(function (el) { return SHAPE.indexOf(el.dataset.k) < 0; }), 'n15-dim', true);
        setCls(dots(SHAPE), 'n15-root', true);
        return wait(700).then(function () { return chordOf(SHAPE); });
      } },
      { text: '바로 ' + em('G코드') + ' 모양을 닮았어요!\n그래서 이 블럭을 ' + em('G폼') + '이라고 불러요', run: function () { return pop(dots(SHAPE)); } },
      // 폼 이름 = 코드 '모양'일 뿐 실제 그 코드는 아님(사용자 지정 2026-11-19 — D15에서 확실히). 같은 자리를 다시 울려 C코드 소리임을 들려줌
      { text: '모양만 닮았을 뿐 ' + em('G코드') + '는 아니에요\n근음이 C라서 소리는 ' + em('C코드') + '예요', run: function () { return chordOf(SHAPE); } },
    ]),
    // 7 핵심(새 내용): 같은 블럭을 도수로 — 글자만 C→1 … 바뀜, 1 2 3 5 6이 블럭 안에서 반복. 끝 화면 = 도수 블럭 + 근음 파랑
    Object.assign(J.chainSteps([
      { text: '이제 음이름을 ' + em('도수') + '로 바꿔볼게요', enter: function () { drawBlock('name'); }, run: function () { return relabel('deg'); } },
      { text: em('1 2 3 5 6') + '이 블럭 안에서\n반복되는 게 보이죠?', run: function () { return blockRun(BLOCK, 400); } },
    ]), { ms: 10520 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)

    // P3 손가락
    // 8 핵심(새 내용 — 암기 규칙, 사용자 지정 2026-11-19): 펜타토닉 블럭은 한 줄의 두 음이 항상 1칸 아니면 2칸 차이(눈에 보이는 칸 = 프렛 차이 2·3, D21과 같은 기준 — 사용자 지정 2026-11-23. 다섯 폼 모두 — 점검 스크립트로 확인).
    //  ('4칸을 넘지 않는다'는 한 줄 기준인지 오해될 수 있어 이 규칙으로 바꿈.) 블럭 칸 프렛 번호를 띄우고 6번줄부터 줄마다 두 음을 짚으며 울림 → G폼 운지(이렇게 잡아주세요).
    //  점 글자 전부 손가락 번호로(§4-31). 끝 화면 = 손가락 번호 블럭 + 근음 파랑
    Object.assign(J.chainSteps([
      { text: '펜타토닉 블럭에서 한 줄의 두 음은\n항상 ' + em('1칸') + ' 아니면 ' + em('2칸') + ' 떨어져 있어요', scene: 'n15-fb', enter: function () { drawBlock('deg'); }, run: function () {
        return fx([$('n15-fb')], 'is-on', true).then(function () {
          fx(q('.fb-fret-num.n15-fn-x'), 'is-in', true);
          return pairRun();
        });
      } },
      { text: 'G폼의 손가락은\n이렇게 잡아주세요', run: function () {   // 원리('한 칸에 하나씩') 설명 없이(사용자 지정 2026-11-19 — 한 점에 손가락 하나로 오해, 슬라이드·해머링 등에선 번호대로 치지 않기도 함)
        return relabel('finger');
      } },
    ]), { ms: 11070 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js)
    // 9 핵심(적용 — 실제 기타로, §4-6): 5프렛에 검지를 두고 6번줄부터 올라갔다 내려오기. 천천히. 끝 화면 = 손가락 번호 블럭
    { text: '기타가 있다면 5프렛에 검지를 두고\n6번줄부터 천천히 따라 쳐보세요!', ms: 14220, run: function () {
      return blockRun(BLOCK.concat(BLOCK.slice(0, -1).reverse()), 550);
    } },

    // P4 직접 채우기
    fillStep(), jamStep(), guideStep(),
  ];
  const groupsG = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11, 12]];

  // ── D16~D19 — 같은 형식, 폼만 다름(사용자 지정 2026-11-19). 펜타토닉 설명은 D15에서 끝 → 스케일 블럭에만 집중 ──
  //  강의 최종 목적: 그 폼의 블럭 모양·근음 자리·운지(퀴즈 ① 빈자리 ② 근음 ③ 도수). 블럭 → 근음 → 코드 모양 → 도수는 D15에서 배운 순서 그대로(적용), 새로 얻는 것 = 그 폼의 자리와 운지
  const stepsForm = [
    // P1 블럭
    // 0 핵심(새 내용): 오늘의 폼 — 6번줄부터 채우며 점 안에 음이름. 끝 화면 = 음이름 블럭
    //  'G폼과 음은 같고 자리만 다른 블럭'은 D16(C폼)에서만 한 번(사용자 지정 2026-11-19), D17~D19는 인사 뒤 바로 채움
    FORM_KEY === 'C' ? Object.assign(J.chainSteps([
      { text: '이번 시간에는 펜타토닉 스케일의\n' + em(FN) + '을 배워볼게요!', scene: 'n15-fb', enter: clearNeck, run: showBoard },
      { text: '앞에서 배운 G폼과 음은 같지만\n지판의 ' + em('다른 자리') + '에 있는 블럭이에요', run: none },
      { text: FN + '을 6번줄부터 채워볼게요!', run: fillNames },
    ]), { ms: 15070 })   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js — 폼 다섯 개 모두 12음이라 같은 값)
    : Object.assign(J.chainSteps([
      { text: '이번 시간에는 펜타토닉 스케일의\n' + em(FN) + '을 채워볼게요!', scene: 'n15-fb', enter: clearNeck, run: function () { return showBoard().then(fillNames); } },
    ]), { ms: 8170 }),   // ms = 가상 시계 측정값
    // 1 핵심(새 내용 — 그 폼의 근음 자리): 근음 C 점 자체를 파랑(글자 칸) + C 음들. 끝 화면 = 음이름 블럭 + 근음 파랑
    { text: em('근음') + ' C는 이 블럭 안에\n' + em(ROOT_CNT + ' 군데') + ' 있어요', ms: ROOTS.length === 3 ? 2620 : 2120, run: rootRun },   // ms = 측정값(2026-11-23 — 근음 소리가 문구 최소 시간보다 길어 마커가 먼저 멈추던 것)
    // 2 핵심(D15 적용): 이름의 이유 — 블럭 안에 그 이름의 코드 모양. 나머지 점은 옅게, 코드 모양 자리 파랑 + 화음. 끝 화면 = 코드 모양 강조
    SOLO ? J.chainSteps([
      { text: '이번에도 블럭 안에 ' + em('코드 모양') + '이 숨어 있어서\n' + em(FN) + '이라고 불러요', run: shapeRun },
    ]) : Object.assign(J.chainSteps([
      { text: '이번에도 근음과 함께\n' + em(FORM_KEY + '코드') + ' 모양이 숨어 있어요', run: shapeRun },
      { text: '그래서 이 블럭을\n' + em(FN) + '이라고 불러요', run: function () { return pop(dots(SHAPE)); } },
    ]), { ms: 5320 }),   // ms = 측정값(2026-11-23)
    // 3 핵심(D15 적용): 같은 블럭을 도수로. 끝 화면 = 도수 블럭 + 근음 파랑
    Object.assign(J.chainSteps([
      { text: '음이름을 ' + em('도수') + '로 바꿔볼게요', enter: function () { drawBlock('name'); }, run: function () { return relabel('deg'); } },
      { text: em('1 2 3 5 6') + '이 이 블럭에서는\n이렇게 놓여 있어요', run: function () { return blockRun(BLOCK, 400); } },
    ]), { ms: 10520 }),   // ms = 가상 시계 측정값(scripts/journey-lesson-timing.js — 폼 다섯 개 모두 12음이라 같은 값)

    // P2 손가락
    // 4 핵심(새 내용 — 그 폼의 운지): 원리 설명 없이 "이렇게 잡아주세요"만(사용자 지정 2026-11-19 — '한 칸에 손가락 하나'는 한 점에 손가락 하나로 오해될 수 있고,
    //  슬라이드·해머링 등에선 번호대로 치지 않기도 함). 점 글자 전부 손가락 번호로(§4-31) + 블럭 칸 프렛 번호 → 손 위치가 바뀌는 곳(그 점 통통). 끝 화면 = 손가락 번호 블럭 + 근음 파랑
    //  '한 줄의 두 음은 1칸 아니면 2칸' 규칙은 D15에서만 설명(사용자 지정 2026-11-19 — D16~D19에선 중복 설명하지 않음)
    J.chainSteps([
      { text: '이번엔 ' + em(FN) + '의 손가락 번호예요\n손가락은 이렇게 잡아주세요', scene: 'n15-fb', enter: function () { drawBlock('deg'); }, run: function () {
        return fx([$('n15-fb')], 'is-on', true).then(function () {
          fx(q('.fb-fret-num.n15-fn-x'), 'is-in', true);
          return relabel('finger');
        });
      } },
      { text: FORM.fingerNote, run: function () { return pop(dots(FORM.hot)); } },
    ]),
    // 5 핵심(적용 — 실제 기타로, §4-6): 검지 자리를 알려 주고 6번줄부터 올라갔다 내려오기. 끝 화면 = 손가락 번호 블럭
    { text: '기타가 있다면 ' + FORM.idx + '프렛에 검지를 두고\n6번줄부터 천천히 따라 쳐보세요!', ms: 14220, run: function () {
      return blockRun(BLOCK.concat(BLOCK.slice(0, -1).reverse()), 550);
    } },

    // P3 직접 채우기·자유 연주
    fillStep(), jamStep(), guideStep(),
  ];
  const groupsForm = [[0, 1, 2, 3], [4, 5], [6, 7, 8]];
  const steps = IS_G ? stepsG : stepsForm;
  const groups = IS_G ? groupsG : groupsForm;

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D2(note-names.js) 퀴즈 엔진(지판 고르기 + 제출하기)을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1·D2와 같음
  //   문제 수: 별 1 10 / 별 2 15 / 별 3 20(사용자 지정). C key·그 노드의 폼만(사용자 지정). 지판 = 강의와 같은 창(블럭 앞뒤 한 칸씩), 누를 수 있는 칸은 블럭 프렛 범위
  //   유형(모두 '자리를 전부 골라 제출하기' — 스케일 훈련 테스트·D2 ②와 같은 조작):
  //     ① fill 빈자리 채우기 — 블럭에서 몇 자리를 비움(별이 오를수록 많이: 2 / 3~4 / 4~6). 빈 칸엔 고스트 노트, 남은 점은 스케일 훈련 모습(근음 = 가운데 흰 원)
  //     ② root 근음 찾기 — 근음 표시 없는 블럭에서 근음 자리 전부(G·E폼 3 / C·A·D폼 2). 정답이 늘 같은 문제라 적게(1 / 2 / 2 — 사용자 지정, 연달아 나오지 않게)
  //     ③ deg 도수 찾기 — 근음이 표시된 블럭(힌트)에서 2·3·5·6도 중 하나의 자리 전부(사용자 지정 — ②와 다른 유형)
  //   점을 고르면 그 음 + 파랑(.n15-sel), 빈 칸을 고르면 점(.fb-note--placed). 채점 = 맞게 고른 자리 초록 / 잘못 고른 자리 빨강 / 못 찾은 자리 점선
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:pentatonic-<폼>
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = {   // 별 → 문제 수 / ② 근음 수 / ③ 도수 수(나머지 = ①) / ① 빈칸 수 범위
    1: { n: 10, root: 1, deg: 3, blank: [2, 2] },
    2: { n: 15, root: 2, deg: 5, blank: [3, 4] },
    3: { n: 20, root: 2, deg: 6, blank: [4, 6] },
  };
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'pentatonic-' + FORM_KEY.toLowerCase();   // journey.js 목록 id와 같음(D15 'pentatonic-g' 그대로)
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

  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 빈칸·도수·정답 자리도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  function makeQuestions(star) {
    const cfg = QZ_STAR_CFG[star], qs = [];
    for (let k = 0; k < cfg.root; k++) qs.push(mkRoot());
    const degs = [2, 3, 5, 6];
    let pool = [];
    for (let k = 0; k < cfg.deg; k++) { if (!pool.length) pool = shuffle(degs.slice()); qs.push(mkDeg(pool.pop())); }   // 네 도수를 고루
    const seen = {};
    for (let k = 0, guard = 0; k < cfg.n - cfg.root - cfg.deg && guard < 500; guard++) {   // 같은 빈칸 조합은 한 판에 한 번
      const it = mkFill(cfg.blank[0] + rnd(cfg.blank[1] - cfg.blank[0] + 1)), sig = it.ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; qs.push(it); k++;
    }
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통). ② 근음 찾기 두 문제도 떨어뜨림
  }
  // ① 빈자리 채우기 — 블럭에서 m자리를 비움. 정답 = 비운 자리 전부
  function mkFill(m) {
    const ans = shuffle(BLOCK.map(keyOf)).slice(0, m).sort();
    return { type: 'fill', ans: ans };
  }
  // ② 근음 찾기 — 정답 = 근음 자리 전부
  function mkRoot() { return { type: 'root', ans: BLOCK.filter(function (n) { return n[3] === 1; }).map(keyOf).sort() }; }
  // ③ 도수 찾기 — 정답 = 그 도수 자리 전부(2~3자리)
  function mkDeg(d) { return { type: 'deg', deg: d, ans: BLOCK.filter(function (n) { return n[3] === d; }).map(keyOf).sort() }; }

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
  //  세 유형 모두 안내 카드 + 지판 + 제출하기(D2 ②와 같은 화면)
  const QZ_TITLE = '알맞은 답을 모두 고르세요';   // 타이틀은 일반 문구(D2와 같음) — 문제 내용은 카드에

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

  // 지판 — 강의와 같은 4~9프렛 창. 크기는 D2 퀴즈 지판과 같은 규칙(스케일 훈련 퀴즈 지판 크기): 기준 폭(7칸) = 화면 단계별 고정값, 본문 폭보다 크면 본문 폭
  //   단계: ~480 / 481~768 / 769~1079 / 1080~1599 / 1600~ → 기준 폭 328 / 376 / 424 / 472 / 520
  const QZ_FB_TIER_W = [[480, 328], [768, 376], [1079, 424], [1599, 472], [Infinity, 520]];
  function quizBoardW() {
    const vw = window.innerWidth;
    return Math.min($('jq-content').clientWidth, QZ_FB_TIER_W.find(function (t) { return vw <= t[0]; })[1]);
  }
  function qNeck() { return $('n15q-neck'); }
  function qDot(k) { return qNeck().querySelector('.fb-note[data-k="' + k + '"]'); }
  // 문제 지판 그리기 — fill: 빈칸 뺀 블럭(근음 = 가운데 흰 원) + 5~8프렛의 나머지 빈 자리 전부 고스트 / root: 블럭 전부 같은 점(근음 표시 없음) / deg: 블럭 + 근음 표시(힌트)
  function mountQuizBoard(it) {
    let ghost = [];
    if (it.type === 'fill') {
      const shown = BLOCK.map(keyOf).filter(function (k) { return it.ans.indexOf(k) < 0; });
      for (let s = 1; s <= 6; s++) for (let f = TAP_LO; f <= TAP_HI; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    }
    $('n15q-slot').innerHTML = sfbHtml('n15q-neck', quizBoardW(), SFB_MAX_W, { ghost: ghost });
    BLOCK.forEach(function (n) {
      if (it.type === 'fill' && it.ans.indexOf(keyOf(n)) >= 0) return;
      qNeck().appendChild(sfbNote(n[0], n[1], '', n[3] === 1 && it.type !== 'root' ? 'fb-note--root' : ''));
    });
  }
  // 창 크기가 바뀌면(회전·브라우저 창 조절) 그려 둔 지판의 크기만 다시 맞춤 — 고른 점·채점 표시는 그대로(위치가 %라서)
  let sfbRT = null;
  window.addEventListener('resize', function () {
    clearTimeout(sfbRT);
    sfbRT = setTimeout(function () {
      const qb = document.querySelector('#n15q-slot .n15-sfb');
      if (qb) qb.style.cssText = sfbSizeStyle(quizBoardW(), SFB_MAX_W);
      const lb = document.querySelector('#n15-fb .n15-sfb'), st = $('combo-v2-lec-stage');
      if (lb && st) lb.style.cssText = sfbSizeStyle(st.clientWidth || (window.innerWidth - 32), LEC_FB_MAX_W);
    }, 120);
  });

  function render() {
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 문제가 바뀜 → 앞 문제에서 누른 음 하드컷(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    findSel = {};
    $('jq-title').textContent = QZ_TITLE;
    $('jq-review-badge').hidden = qz.phase !== 'review';
    const card = it.type === 'fill' ? infoCard('빈자리를 채워서', '펜타토닉 ' + FN + '을', '완성해주세요')
      : it.type === 'root' ? infoCard('펜타토닉 ' + FN + '에서', '근음을', '모두 찾아주세요')
      : infoCard('근음을 기준으로', it.deg + '도 음을', '모두 찾아주세요');
    box.innerHTML = card + '<div class="jq-board" id="n15q-slot"></div>';
    mountQuizBoard(it);   // 빈 자리를 먼저 놓고 실제 남은 공간을 재서 지판 크기를 정함
    qNeck().addEventListener('click', findTap);
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
    $('jq-title').textContent = QZ_TITLE;
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

  // 지판 누르기 — 스케일 훈련 테스트와 같은 조작, 누를 때마다 그 자리 소리, 다시 누르면 취소. 하나라도 고르면 제출하기
  //  fill: 빈 자리(고스트)를 누르면 점(.fb-note--placed). 블럭에 이미 있는 점은 그 음만 울림(고르기 아님)
  //  root·deg: 블럭의 점을 누르면 그 점이 파랑(.n15-sel — 점 자체를 칠함, 가이드 §4-27). 점 없는 자리는 안 받음
  let findSel = {};
  function findTap(e) {
    if (!qz || qz.judged) return;
    const p = tapPos(qNeck(), e);
    if (!p) return;
    const it = cur(), k = p[0] + '-' + p[1], onBlock = !!noteAt(k);
    if (it.type === 'fill' && onBlock && it.ans.indexOf(k) < 0) { J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6); return; }   // 빈자리 채우기: 이미 찍혀 있는 점 = 소리만(고르기 아님 — 사용자 지정 2026-11-19)
    if (it.type !== 'fill' && !onBlock) return;
    if (findSel[k]) {
      if (it.type === 'fill') findSel[k].remove(); else findSel[k].classList.remove('n15-sel');
      delete findSel[k];
    } else {
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6);
      if (it.type === 'fill') {
        const d = sfbNote(p[0], p[1], '', 'fb-note--placed');
        qNeck().appendChild(d);
        findSel[k] = d;
      } else {
        const d = qDot(k);
        d.classList.add('n15-sel');
        findSel[k] = d;
      }
    }
    qBtn('제출하기', Object.keys(findSel).length > 0);
  }
  // 제출 — 고른 자리 = 정답 자리 전부일 때만 정답. 스케일 훈련 채점과 같은 표시: 맞게 고른 자리 = 초록(--correct), 잘못 고른 자리 = 빨강(--wrong), 못 찾은 자리 = 점선 원(--missed)
  //  root·deg에서 못 찾은 자리는 원래 점 자체를 점선 원으로 바꿈(근음 표시도 걷음)
  function findJudge() {
    const it = cur(), picked = Object.keys(findSel);
    const ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
    picked.forEach(function (k) {
      const d = findSel[k];
      d.classList.remove('fb-note--placed', 'n15-sel');
      d.classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong');
    });
    it.ans.forEach(function (k) {
      if (findSel[k]) return;
      const sf = k.split('-');
      const d = it.type === 'fill' ? sfbNote(+sf[0], +sf[1], '', '') : qDot(k);
      d.className = 'fb-note fb-note--missed';
      if (it.type === 'fill') qNeck().appendChild(d);
    });
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
      if (Object.keys(findSel).length) findJudge();
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
    $('combo-v2-clear-level').textContent = '펜타토닉 스케일 ' + FN + ' · 퀴즈 ' + qz.star;
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
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });

  J.register(NODE_ID, { onCut: jamCut, layers: ['n15-row', 'n15-fb'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 마지막 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
