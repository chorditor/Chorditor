// ───────────────────────────────────────────────────────────
// 여정 노드: 메이저 스케일 C폼(솔로연주 비기너 D14) · A,G폼(D15) · E,D폼(D16) — 2026-11-23, docs/solo-beginner-curriculum.md
//   한 파일이 URL day로 노드를 고름(14 C / 15 A·G / 16 E·D). 별·이어 풀기 열쇠는 노드마다(major-c · major-ag · major-ed)
//   핵심(사용자 지정): 메이저 스케일 블럭 = 펜타토닉 블럭 + 4도·7도. 지금은 블럭을 상하행하는 정도면 충분 — 손가락 번호는 표시하지 않음
//   블럭 = scale-data.js 'major-pos1~5'를 C key로 옮긴 것(점검 스크립트로 계산 — 펜타토닉 폼이 그대로 들어 있는 자리): C = pos5 · A = pos1 · G = pos2 · E = pos3 · D = pos4
//   새로 더해지는 4도·7도 = 핑크 점(.n14-new), 근음 = 점 자체 파랑(글자 칸 — D15 규칙). 퀴즈 엔진 = 공용 journey-quiz-kit.js
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit, B = K.board;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const OPEN_MIDI = B.OPEN_MIDI;
  function none() { return Promise.resolve(); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }

  // [줄, 프렛, 음이름, 도수] 낮은 음부터
  const MAJOR = {
    C: [[6, 12, 'E', 3], [6, 13, 'F', 4], [6, 15, 'G', 5], [5, 12, 'A', 6], [5, 14, 'B', 7], [5, 15, 'C', 1], [4, 12, 'D', 2], [4, 14, 'E', 3], [4, 15, 'F', 4], [3, 12, 'G', 5], [3, 14, 'A', 6], [2, 12, 'B', 7], [2, 13, 'C', 1], [2, 15, 'D', 2], [1, 12, 'E', 3], [1, 13, 'F', 4], [1, 15, 'G', 5]],
    A: [[6, 3, 'G', 5], [6, 5, 'A', 6], [5, 2, 'B', 7], [5, 3, 'C', 1], [5, 5, 'D', 2], [4, 2, 'E', 3], [4, 3, 'F', 4], [4, 5, 'G', 5], [3, 2, 'A', 6], [3, 4, 'B', 7], [3, 5, 'C', 1], [2, 3, 'D', 2], [2, 5, 'E', 3], [2, 6, 'F', 4], [1, 3, 'G', 5], [1, 5, 'A', 6]],
    G: [[6, 5, 'A', 6], [6, 7, 'B', 7], [6, 8, 'C', 1], [5, 5, 'D', 2], [5, 7, 'E', 3], [5, 8, 'F', 4], [4, 5, 'G', 5], [4, 7, 'A', 6], [3, 4, 'B', 7], [3, 5, 'C', 1], [3, 7, 'D', 2], [2, 5, 'E', 3], [2, 6, 'F', 4], [2, 8, 'G', 5], [1, 5, 'A', 6], [1, 7, 'B', 7], [1, 8, 'C', 1]],
    E: [[6, 7, 'B', 7], [6, 8, 'C', 1], [6, 10, 'D', 2], [5, 7, 'E', 3], [5, 8, 'F', 4], [5, 10, 'G', 5], [4, 7, 'A', 6], [4, 9, 'B', 7], [4, 10, 'C', 1], [3, 7, 'D', 2], [3, 9, 'E', 3], [3, 10, 'F', 4], [2, 8, 'G', 5], [2, 10, 'A', 6], [1, 7, 'B', 7], [1, 8, 'C', 1], [1, 10, 'D', 2]],
    D: [[6, 10, 'D', 2], [6, 12, 'E', 3], [6, 13, 'F', 4], [5, 10, 'G', 5], [5, 12, 'A', 6], [4, 9, 'B', 7], [4, 10, 'C', 1], [4, 12, 'D', 2], [3, 9, 'E', 3], [3, 10, 'F', 4], [3, 12, 'G', 5], [2, 10, 'A', 6], [2, 12, 'B', 7], [2, 13, 'C', 1], [1, 10, 'D', 2], [1, 12, 'E', 3]],
  };
  function isNew(n) { return n[3] === 4 || n[3] === 7; }   // 펜타토닉에 없던 음(4도·7도) — 나머지는 펜타토닉 폼과 같은 자리(점검 스크립트로 확인)
  function keyOf(n) { return n[0] + '-' + n[1]; }
  function midiOf(n) { return OPEN_MIDI[n[0] - 1] + n[1]; }
  function winOf(F) {
    const fr = MAJOR[F].map(function (n) { return n[1]; }), lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr);
    return { lo: lo - 1, cols: hi - lo + 3, minF: lo, maxF: hi, fade: true };
  }

  const DAY = (function () { const m = /[?&]day=(\d+)/.exec(location.search); return m ? +m[1] : 14; })();
  const NODE = DAY === 15 ? { id: 'major-ag', forms: ['A', 'G'], name: '메이저 스케일 A,G폼' }
    : DAY === 16 ? { id: 'major-ed', forms: ['E', 'D'], name: '메이저 스케일 E,D폼' }
    : { id: 'major-c', forms: ['C'], name: '메이저 스케일 C폼' };
  const ONE = NODE.forms.length === 1;

  // ═══════════════════════════ 강의 ═══════════════════════════
  let lecW = 320, form = NODE.forms[0], stageEl = null;
  function size() { const w = Math.min(lecW, 340); return { w: w, h: Math.min(w * 0.42, 140) }; }
  const BOARD_H_PER_NECK = 188 / 160;   // 지판 전체 높이 ÷ 넥 높이(넥 160 + 프렛 번호 간격 6 + 번호 22, --fbu 단위 — .fb-full-nums)
  // 직접 채우기 칸 지판 = 무대(220px 고정)에 들어가는 최대 크기(사용자 지정 2026-11-24 — 상호작용 땐 터치하기 좋게 최대로, 비율은 그대로). 무대 폭 가득·무대 높이(위 여백 뺀) 안
  function bigFit(F) {
    const cs = stageEl ? getComputedStyle(stageEl) : null;
    const h = stageEl ? stageEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) : 196;
    const w = stageEl ? stageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : lecW;
    return B.fit(winOf(F), w || lecW, h / BOARD_H_PER_NECK);
  }
  function build(stage) {
    stage.classList.add('is-jny');
    stageEl = stage;
    lecW = stage.clientWidth || (window.innerWidth - 32);
    // 2연음 리듬 칸(사용자 지정 2026-11-24): 폼 선택 알약(두 폼 노드만, D10 .n10s-sel과 같은 디자인) · 리듬 이름 · 타브 — 리듬 칸에서만 보임
    const ARR = function (d) { return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + (d < 0 ? 'M9 1 3 6l6 5z' : 'M3 1l6 5-6 5z') + '" fill="currentColor"/></svg>'; };
    stage.innerHTML = '<div class="jl-layers"><div class="jl-layer jl-rise n14s-fb" id="n14s-fb"><div class="n14s-fn" id="n14s-fn"></div>' +
      (ONE ? '' : '<div class="n10s-sel" id="n14s-sel" hidden><button type="button" class="n10s-arr" data-d="-1" aria-label="이전" data-sfx="none">' + ARR(-1) + '</button><span class="n10s-fn" id="n14s-sfn"></span><button type="button" class="n10s-arr" data-d="1" aria-label="다음" data-sfx="none">' + ARR(1) + '</button></div>') +
      '<div id="n14s-fbw"></div><div class="n10s-rh" id="n14s-rh" hidden></div><div class="n10s-tab" id="n14s-tab"></div></div></div>';
    if (!ONE) $('n14s-sel').addEventListener('click', function (e) {
      if (!e.target.closest('.n10s-arr')) return;
      rhForm(NODE.forms[(NODE.forms.indexOf(form) + 1) % 2]);   // 두 폼 사이를 오감 — 재생 중이면 처음부터 다시(blockRestart)
    });
    setForm(form);
  }
  function neck() { return $('n14s-neck'); }
  function win() { return winOf(form); }
  function blk() { return MAJOR[form]; }
  // 폼 바꾸기 — 빈 지판(점 없음)으로 다시 그림
  //  big = 직접 채우기 칸: 위 폼 이름을 숨기고 그 자리까지 지판을 최대로(bigFit). 설명 칸 = 넥 높이 최대 140px(보기 좋게 작게)
  function setForm(F, big) {
    form = F;
    fillSt = null;
    const sz = big ? bigFit(F) : B.fit(winOf(F), size().w, 140);   // 지판 = 스케일 훈련과 같은 칸 비율(앱 전체 동일 — 사용자 지정 2026-11-24)
    $('n14s-fbw').innerHTML = B.html('n14s-neck', winOf(F), sz.w, sz.h);
    $('n14s-fn').innerHTML = em('메이저 스케일 ' + F + '폼');
    $('n14s-fn').hidden = !!big;
    if (rhOn) rhShow(false);   // 리듬 칸이 아닌 화면(칸을 되돌아간 경우 포함)은 리듬 이름·타브·선택 알약을 치움 — 리듬 칸은 rhForm이 다시 켬
    neck().addEventListener('click', tap);
  }
  function boardOn() { return fx([$('n14s-fb')], 'is-on', true); }
  function dot(k) { return neck().querySelector('.fb-note[data-k="' + k + '"]'); }
  function clearDots() { Array.prototype.forEach.call(neck().querySelectorAll('.fb-note'), function (el) { el.remove(); }); }
  function addNote(n, extra) { const el = B.note(win(), n[0], n[1], String(n[3]), (n[3] === 1 ? 'n15-root ' : '') + (extra || '')); neck().appendChild(el); return el; }
  function pop(els) {
    els.filter(Boolean).forEach(function (el) {
      J.anim(el, [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(1.35)' }, { transform: 'translate(-50%, -50%) scale(1)' }], { duration: 420, easing: J.EASE_OUT });
    });
  }
  // 레가토 — 각 음은 다음 음이 시작될 때까지(0.18초 페이드), 마지막 음 1.2초(D15 legato와 같음). onEach(k)는 소리와 같은 시각
  function legato(notes, stepMs, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    notes.forEach(function (n, k) {
      const last = k === notes.length - 1;
      J.note(midiOf(n), t0 + k * stepMs / 1000, last ? 1.2 : stepMs / 1000, last ? 0.8 : 0.18);
      later(function () { onEach(k); }, lead + k * stepMs);
    });
    return wait(lead + (notes.length - 1) * stepMs + 900);
  }
  // 펜타토닉 블럭을 6번줄부터 채움(점 안 도수) — 4도·7도 자리는 비워 둠
  function pentaFill() {
    clearDots();
    const ns = blk().filter(function (n) { return !isNew(n); });
    return legato(ns, 380, function (k) { addNote(ns[k], 'n2-pop'); });
  }
  // 4도·7도를 핑크 점으로 하나씩 채움(소리와 함께)
  function addNew() {
    const ns = blk().filter(isNew);
    return legato(ns, 500, function (k) { addNote(ns[k], 'n14-new n2-pop'); });
  }
  // D14 P1: 4도·7도를 소리 없이 한꺼번에 스르륵(사용자 지정 2026-11-24)
  function addNewFade() {
    blk().filter(isNew).forEach(function (n) { J.anim(addNote(n, 'n14-new'), [{ opacity: 0 }, { opacity: 1 }], { duration: J.FADE_MS * 2, easing: J.EASE_OUT, fill: 'backwards' }); });
    return wait(J.FADE_MS * 2);
  }
  // 메이저 블럭 전체를 한 번에(4도·7도는 핑크 그대로)
  function drawMajor() { clearDots(); blk().forEach(function (n) { addNote(n, isNew(n) ? 'n14-new' : ''); }); }
  function upRun(stepMs) { const b = blk(); return legato(b, stepMs || 330, function (k) { pop([dot(keyOf(b[k]))]); }); }
  function fastRun() { return upRun(150); }   // 직접 채운 뒤 '잘했어요!' 상행 = 빠르게(음 간격 0.15초 — D5~D9와 같음, 사용자 지정 2026-11-24)
  // 반음 짝 — 같은 줄에서 한 칸 붙은 3-4, 7-1(점 자체 파랑, §4-27)
  function halfPairs() {
    const b = blk(), pairs = [];
    b.forEach(function (n) {
      const m = b.filter(function (x) { return x[0] === n[0] && x[1] === n[1] + 1; })[0];
      if (m && ((n[3] === 3 && m[3] === 4) || (n[3] === 7 && m[3] === 1))) pairs.push(n, m);
    });
    const els = pairs.map(function (n) { return dot(keyOf(n)); }).filter(Boolean);
    setCls(els, 'n14-pair', true);
    return legato(pairs, 420, function (k) { pop([dot(keyOf(pairs[k]))]); });
  }

  // ── 직접 채우기(참여형, §4-8) — 고스트를 전부 누를 때까지 '다음' 잠금. 누르면 그 음 + 점, 틀린 자리 = 연한 오답 점 + 그 음 ──
  let fillSt = null;
  function ghostAll() {
    clearDots();
    blk().forEach(function (n) { neck().appendChild(B.note(win(), n[0], n[1], '', 'fb-note--ghost' + (n[3] === 1 ? ' fb-note--root' : ''))); });
  }
  function fillOne(k, sound) {
    const g = dot(k), n = blk().filter(function (x) { return keyOf(x) === k; })[0];
    if (!g || !n || !g.classList.contains('fb-note--ghost')) return false;
    g.classList.remove('fb-note--ghost');
    g.classList.add('n2-pop');
    if (isNew(n)) g.classList.add('n14-new');
    if (sound) J.note(midiOf(n), J.audioT0(), 1.3, 0.6);
    return true;
  }
  function tap(e) {
    const p = B.pos(neck(), win(), e);
    if (!p) return;
    const k = p[0] + '-' + p[1];
    if (!fillSt) {   // 채우기 칸이 아니면 블럭 점 = 그 음만
      const n = blk().filter(function (x) { return keyOf(x) === k; })[0];
      if (n && dot(k)) { J.note(midiOf(n), J.audioT0(), 1.2, 0.5); pop([dot(k)]); }
      return;
    }
    if (fillOne(k, true)) {
      if (--fillSt.left <= 0) { const st = fillSt; fillSt = null; const d = K.passSound(); later(st.res, Math.max(500, d + 300)); }   // 누른 음이 먼저, 약간 뒤에 정답 벨
    } else if (!dot(k)) {
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.2, 0.5);
      const el = B.note(win(), p[0], p[1], '', 'n15-miss');
      neck().appendChild(el);
      const a = J.anim(el, [{ opacity: 0.4 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
      a.onfinish = a.oncancel = function () { el.remove(); };
    }
  }
  function waitFill() {
    return new Promise(function (res) {
      const finish = function () { fillSt = null; blk().forEach(function (n) { fillOne(keyOf(n), false); }); res(); };
      if (J.skipping()) { finish(); return; }
      fillSt = { res: res, left: blk().length };
      (function poll() { later(function () { if (!fillSt) return; if (J.skipping()) finish(); else poll(); }, 200); })();
    });
  }
  function fillStep(F) {
    return Object.assign(J.chainSteps([
      { text: (ONE ? '이제 ' : NODE.forms[0] === F ? '' : '이번엔 ') + em(F + '폼') + (ONE || NODE.forms[0] === F ? '을 직접 채워볼까요?' : '도 채워볼까요?') + '\n흐린 점을 모두 눌러주세요!', scene: 'n14s-fb:fill' + F, enter: function () { setForm(F, true); ghostAll(); }, gap: 800, run: function () { return boardOn().then(waitFill); } },
      { text: ONE ? '잘했어요!\n이 모양을 손에 꼭 익혀두세요' : '잘했어요!\n이게 바로 ' + em('메이저 스케일 ' + F + '폼') + '이에요', gap: 1800, run: fastRun },   // D14: 완성 선언은 P1에서 했으니 칭찬만(사용자 지정 2026-11-24 — 반복 금지)
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true });
  }
  // ── 2연음 리듬 칸 — 반주(코드진행 노드별, 70bpm)에 맞춰 블럭 상하행을 끝없이 + 타브(사용자 지정 2026-11-24). D10 rhythm-apply.js와 같은 방식 ──
  //  반주 = 스케일 훈련 '기본1'(BackingTrack) — D14 C G Am F / D15 Dm G C Am / D16 F G Em Am(backing-track.js jny-major-*)
  //  재생 중 폼을 바꾸면 반주·기타 하드컷 → 0.5초 뒤 처음부터(blockRestart), 칸이 바뀌면 엔진 onCut → lecCut에서 반주·드럼·예약을 끊음(CLAUDE.md 0-7)
  const BPM = 70, SUB = 2, PP = 2;   // 2연음만(학습 길이 — 사용자 지정), 한 화면 두 마디
  const LEVEL = DAY === 15 ? 'jny-major-ag' : DAY === 16 ? 'jny-major-ed' : 'jny-major-c';
  let rhOn = false, loopOn = false, demoGen = 0, tabPage = 0, tabLast = null, audioLoad = null;
  function loadScripts(list) {
    return list.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          const el = document.createElement('script');
          el.src = src; el.onload = res; el.onerror = function () { rej(new Error('스크립트를 불러오지 못함: ' + src)); };
          document.body.appendChild(el);
        });
      });
    }, Promise.resolve());
  }
  function loadAudio() {   // 드럼 + 반주 — 리듬 칸에서만 필요해 그때 불러옴(rhythm-apply.js와 같음, 실패하면 없이 진행)
    if (audioLoad) return audioLoad;
    const haveDrum = typeof DrumAudio !== 'undefined' && window.DRUM_SETS;
    audioLoad = (haveDrum ? Promise.resolve() : loadScripts(['drum-sets.js', 'drum-samples.js', 'drum-audio.js']))
      .then(function () { return typeof BackingTrack !== 'undefined' ? null : loadScripts(['backing-track.js']); })
      .then(function () { return DrumAudio.ready(); })
      .catch(function (e) { console.error('[major-forms]', e); });
    return audioLoad;
  }
  function drumCut() { if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop(); }
  function backingStop() { if (typeof BackingTrack !== 'undefined') BackingTrack.stop(); }
  function barDur() { return 4 * 60 / BPM; }
  function audioNow() { return Tone.getContext().rawContext.currentTime; }
  function cycleOf() { const b = blk(); return b.concat(b.slice(1, -1).reverse()); }   // 끝없는 상하행 한 바퀴(맨 위·맨 아래 음은 한 번씩)
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  //  루프 마디 수 = 마디 첫 음이 다시 맞는 마디 수. 홀수면 두 바퀴를 한 루프로(늘 두 마디씩 보이게 — D10·D11과 같은 규칙): C·G·E폼 4마디, A·D폼 15 → 30마디
  function barsOf() { const c = cycleOf().length, nb = c / gcd(c, 4 * SUB); return nb % PP ? nb * 2 : nb; }
  function drawTab() {
    const el = $('n14s-tab');
    tabLast = null;
    if (!rhOn) { el.innerHTML = ''; return; }
    const nb = barsOf(), cyc = cycleOf(), n = 4 * SUB, ms = [];
    for (let m = tabPage * PP; m < Math.min(nb, tabPage * PP + PP); m++) {
      const notes = [], rh = [];
      for (let k = 0; k < n; k++) { const nt = cyc[(m * n + k) % cyc.length]; notes.push({ s: nt[0], f: nt[1] }); rh.push({ n: k, d: 1, p: k % 2 ? 'U' : 'D' }); }
      ms.push({ notes: notes, marks: [], rhythm: rh });
    }
    el.innerHTML = TabRender.svg(ms, { width: size().w });
  }
  function tabOn(m, k) {   // 지금 치는 숫자·피킹 기호만 파랑
    const el = $('n14s-tab');
    const sel = function (a, b) { return '.tab-n[data-m="' + a + '"][data-i="' + b + '"], .tab-pick[data-m="' + a + '"][data-k="' + b + '"]'; };
    if (tabLast) el.querySelectorAll(sel(tabLast[0], tabLast[1])).forEach(function (x) { x.classList.remove('is-on'); });
    el.querySelectorAll(sel(m, k)).forEach(function (x) { x.classList.add('is-on'); });
    tabLast = [m, k];
  }
  // 리듬 화면 켜기/끄기 — 지판(설명 크기) + 블럭 점(도수) + 리듬 이름 + 타브. 두 폼 노드는 폼 이름 대신 선택 알약
  function rhShow(on) {
    rhOn = on;
    $('n14s-rh').hidden = !on;
    $('n14s-rh').innerHTML = on ? em('2연음') + ' · 한 박에 두 음' : '';
    if (!ONE) { $('n14s-sel').hidden = !on; $('n14s-fn').hidden = on; $('n14s-sfn').textContent = form + '폼'; }
    tabPage = 0; drawTab();
  }
  function rhForm(F) {   // 리듬 칸 화면 = 설명 크기 지판 + 블럭 전체(도수) + 리듬 이름 + 타브
    setForm(F); drawMajor(); rhShow(true);
    if (loopOn) blockRestart();
  }
  function blockRestart() {   // 재생 중 폼 바꾸기 = 무조건 처음부터(D10과 같음) — 하드컷 → 0.5초 뒤. 연달아 바꾸면 마지막 것만(세대 번호)
    const gen = ++demoGen;
    backingStop(); drumCut();
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
    later(function () { if (gen === demoGen && loopOn) loopStart(); }, 500);
  }
  function loopStart() {
    if (J.skipping()) return;
    loopOn = true;
    const gen = ++demoGen;
    loadAudio().then(function () {
      if (gen !== demoGen || typeof BackingTrack === 'undefined') return;
      return (GuitarAudio.ready ? GuitarAudio.ready() : Promise.resolve()).then(function () {   // 하드컷 뒤 샘플러 준비 대기(CLAUDE.md 0-7)
        if (gen !== demoGen) return;
        return BackingTrack.start(function () { return { bpm: BPM, root: 0, level: LEVEL }; }, 'basic');
      }).then(function (ok) {
        if (!ok || gen !== demoGen) return;
        schedBar(gen, 0, BackingTrack.startTime ? BackingTrack.startTime() : audioNow() + 0.1);
      });
    });
  }
  function schedBar(gen, i, t) {   // 마디 하나씩 미리 예약(반주 시계 기준) — 치는 점 통통 + 타브 숫자 파랑 + 두 마디가 끝나면 다음 화면
    if (gen !== demoGen) return;
    const n = 4 * SUB, step = barDur() / n, cyc = cycleOf(), tb = i % barsOf(), m = tb % PP;
    const ms = function (at) { return Math.max(0, (at - audioNow()) * 1000); };
    later(function () {
      if (gen !== demoGen) return;
      const pg = Math.floor(tb / PP);
      if (pg !== tabPage) { tabPage = pg; drawTab(); }
    }, Math.max(0, ms(t) - 40));
    for (let k = 0; k < n; k++) {
      const nt = cyc[(i * n + k) % cyc.length], at = t + k * step;
      J.note(midiOf(nt), at, step * 0.95, 0.1);
      later(function () { if (gen !== demoGen) return; pop([dot(keyOf(nt))]); tabOn(m, k); }, ms(at));
    }
    later(function () { schedBar(gen, i + 1, t + barDur()); }, Math.max(0, ms(t + barDur()) - 400));
  }
  function rhStep(t1, t2, msV) {   // msV = 측정값(첫 마디 + 둘째 문구). 첫 문구 = 반주 시작(첫 마디까지 기다림), 둘째 문구 = 원하는 만큼 연습(소리 계속)
    return Object.assign(J.chainSteps([
      { text: t1, scene: 'n14s-fb:rh', enter: function () { lecCut(); rhForm(NODE.forms[0]); }, run: function () { return boardOn().then(function () { loopStart(); return wait(J.leadMs() + barDur() * 1000 + 300); }); } },
      { text: t2, run: none },
    ]), { ms: msV || 8070 });
  }
  function lecCut() { fillSt = null; loopOn = false; demoGen++; backingStop(); drumCut(); }

  //  강의 최종 목적: 메이저 = 펜타토닉 + 4·7도, 그 폼 블럭 모양·근음·4·7도 자리(퀴즈 ① 빈자리 ② 근음 ③ 도수 — 4·7도 위주)
  const steps = ONE ? [
    // P1 펜타 → 메이저
    // 0 핵심(D4~D8 복습 → 새 내용): 처음 배우는 메이저 스케일 블럭, 출발은 펜타토닉 C폼. 끝 화면 = 펜타 C폼(도수)
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 처음으로\n' + em('메이저 스케일 블럭') + '을 배워볼게요', run: none },
      { text: '먼저 ' + em('펜타토닉 C폼') + ' 기억나시죠?', scene: 'n14s-fb', enter: function () { setForm('C'); }, run: function () { $('n14s-fn').innerHTML = em('펜타토닉 C폼'); return boardOn().then(pentaFill); } },
    ]), { ms: 0 }),
    // 1 핵심(새 내용, 이 노드의 핵심): 펜타 = 메이저 − 4·7도 → 4·7도를 다시 채움(핑크). 끝 화면 = 메이저 C폼(4·7도 핑크)
    Object.assign(J.chainSteps([
      { text: '펜타토닉은 메이저 스케일에서\n' + em('4도') + '와 ' + em('7도') + '를 뺀 스케일이었죠?', scene: 'n14s-fb', run: none },
      { text: '여기에 ' + em('4도') + '와 ' + em('7도') + '를 다시 채우면...', run: addNewFade },
    ]), { ms: 0 }),
    // 2 핵심(완성): 메이저 스케일 C폼 — 상행으로 익숙한 도레미. 끝 화면 = 메이저 C폼
    Object.assign(J.chainSteps([
      { text: em('메이저 스케일 C폼') + '이 완성돼요!', scene: 'n14s-fb', run: function () { $('n14s-fn').innerHTML = em('메이저 스케일 C폼'); return upRun(); } },
      { text: 'C부터 C까지\n도레미파솔라시도가 다 들어 있어요', run: none },   // 블럭은 E(미)부터 울려서 '익숙한 소리' 대신 들어 있다고만(2026-11-24)
    ]), { ms: 0 }),
    // P2 블럭 — 근음 칸 없음(D5~D9에서 배움, 점 안 도수 1 + 파랑으로 이미 보임 — 사용자 지정 2026-11-24 반복 금지)
    // 3 핵심(메이저 스케일의 정의 — 사용자 지정 2026-11-24): 3도-4도·7도-8도 사이만 반음인 스케일 = 메이저(D2 "3·4번째, 7·8번째"를 도수로) → 반음 = 한 프렛이라 블럭에서 붙어 있음. 끝 화면 = 반음 짝 파랑
    Object.assign(J.chainSteps([
      { text: em('3도-4도') + ', ' + em('7도-8도') + ' 사이만 ' + em('반음') + '인 스케일이\n바로 ' + em('메이저 스케일') + '이에요', scene: 'n14s-fb', enter: drawMajor, run: halfPairs },
      { text: '기타에서 반음은 ' + em('한 프렛') + '이라\n블럭에서도 바로 옆에 붙어 있어요', run: none },
    ]), { ms: 0 }),
    // 상하행 시연 칸 없음(P1 상행·직접 채우기 끝 상행으로 충분 — 사용자 지정 2026-11-24 피로도)
    // P3 직접 채우기·마무리
    fillStep('C'),
    // P4 2연음 리듬(사용자 지정 2026-11-24 — 반주 C G Am F, 2연음만)
    rhStep('이번엔 반주에 맞춰\n' + em('2연음') + '으로 C폼을 연주해볼게요', '반주에 맞춰 원하는 만큼 연습하고\n넘어가 주세요!'),
    // P5 마무리 — 퀴즈 안내(사용자 선택 2026-11-24 — 설명 끝 신호 + 실제 구성: fill·root·deg, deg는 4·7도가 절반)
    J.chainSteps([
      // 문구 = 사용자 지정(2026-11-24)
      { text: '펜타토닉에 두 음만 더했는데\n' + em('메이저 스케일') + ' 블럭 하나가 완성됐네요!', scene: 'n14s-fb:end', enter: function () { setForm('C'); drawMajor(); }, run: boardOn },
      { text: '펜타토닉과 메이저 스케일만 알아도\n아주 많은 연주를 할 수 있게 돼요!', run: none },
      { text: '그만큼 확실히 암기하는 게 중요하겠죠?\n퀴즈를 통해 메이저 스케일을 학습해볼게요!', run: none },
    ]),
  ] : [
    // P1 첫 폼
    Object.assign(J.chainSteps([
      { text: '이번 시간에는 메이저 스케일 ' + em(NODE.forms[0] + '폼') + '과 ' + em(NODE.forms[1] + '폼') + '을\n같이 배워볼게요', run: none },
      { text: '먼저 ' + em(NODE.forms[0] + '폼') + '이에요\n펜타토닉 ' + NODE.forms[0] + '폼에 4도와 7도를 더해볼게요', scene: 'n14s-fb:' + NODE.forms[0], enter: function () { setForm(NODE.forms[0]); }, run: function () { return boardOn().then(pentaFill).then(addNew); } },
    ]), { ms: 0 }),
    // P2 둘째 폼
    Object.assign(J.chainSteps([
      { text: '다음은 ' + em(NODE.forms[1] + '폼') + '이에요\n마찬가지로 4도와 7도를 더하면...', scene: 'n14s-fb:' + NODE.forms[1], enter: function () { setForm(NODE.forms[1]); }, run: function () { return boardOn().then(pentaFill).then(addNew); } },
    ]), { ms: 0 }),
    // 상하행 시연 칸 없음(사용자 지정 2026-11-24 피로도 — D14와 같음)
    // P3 채우기·마무리
    fillStep(NODE.forms[0]), fillStep(NODE.forms[1]),
    // P4 2연음 리듬(사용자 지정 2026-11-24 — 반주 D15 Dm G C Am / D16 F G Em Am, 2연음만). 두 폼은 화살표로 골라 연습(D10과 같은 알약)
    rhStep('이번엔 반주에 맞춰\n' + em('2연음') + '으로 블럭을 연주해볼게요', em('화살표') + '로 ' + NODE.forms[0] + '폼과 ' + NODE.forms[1] + '폼을 바꿔가며\n원하는 만큼 연습하고 넘어가 주세요!', 9000),
    // P5 마무리 — 문구 = 사용자 선택(2026-11-24 1안). D15 = C·A·G 세 블럭, D16 = 다섯 블럭 전부
    J.chainSteps([
      { text: '메이저 스케일 ' + em(NODE.forms[0] + '폼') + '과 ' + em(NODE.forms[1] + '폼') + '까지\n이제 블럭 ' + (DAY === 16 ? '다섯 개' : '세 개') + '를 배웠어요!', scene: 'n14s-fb:end', enter: function () { setForm(NODE.forms[1]); drawMajor(); }, run: boardOn },
      { text: '블럭이 늘어날수록\n서로 헷갈리기 쉬워요', run: none },
      { text: '퀴즈를 통해 두 블럭을\n확실히 암기해볼게요!', run: none },
    ]),
  ];
  const groups = ONE ? [[0, 1, 2], [3], [4], [5], [6]] : [[0], [1], [2, 3], [4], [5]];   // 리듬 칸·마무리를 페이즈로 나눔(2026-11-24)
  // 칸 길이(ms) = 측정값(scripts/journey-lesson-timing.js)
  const MS = { 14: { 0: 9580, 1: 7360, 2: 9920, 3: 9020 }, 15: { 0: 12320, 1: 8820 }, 16: { 0: 12820, 1: 8320 } }[DAY] || {};
  Object.keys(MS).forEach(function (k) { steps[k].ms = MS[k]; });

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  ① fill 빈자리 채우기 ② root 근음 찾기 ③ deg 근음 표시된 블럭에서 그 도수 자리 전부(4·7도 위주) — 모두 지판에서 골라 제출하기(D15와 같은 조작)
  const CFG = ONE ? { 1: { fill: 7, root: 2, deg: 6 }, 2: { fill: 9, root: 2, deg: 9 }, 3: { fill: 9, root: 2, deg: 9 } }
    : { 1: { fill: 5, root: 1, deg: 4 }, 2: { fill: 8, root: 2, deg: 5 }, 3: { fill: 10, root: 2, deg: 8 } };
  const BLANK = { 1: [2, 2], 2: [3, 4], 3: [4, 6] };
  function cycle(n, pool) { const out = []; let p = []; for (let k = 0; k < n; k++) { if (!p.length) p = K.shuffle(pool.slice()); out.push(p.pop()); } return out; }
  function make(star) {
    const c = CFG[star], fills = [], roots = [], degs = [], seen = {};
    const ff = cycle(c.fill, NODE.forms);
    for (let k = 0, g = 0; k < c.fill && g < 500; g++) {
      const F = ff[k], m = BLANK[star][0] + K.rnd(BLANK[star][1] - BLANK[star][0] + 1);
      const ans = K.shuffle(MAJOR[F].map(keyOf)).slice(0, m).sort(), sig = F + ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; fills.push({ type: 'fill', form: F, ans: ans }); k++;
    }
    cycle(c.root, NODE.forms).forEach(function (F) { roots.push({ type: 'root', form: F, ans: MAJOR[F].filter(function (n) { return n[3] === 1; }).map(keyOf).sort() }); });
    const dd = cycle(c.deg, [4, 7, 4, 7, 2, 3, 5, 6]), df = cycle(c.deg, NODE.forms);   // 새로 배운 4·7도가 절반
    for (let k = 0; k < c.deg; k++) degs.push({ type: 'deg', form: df[k], deg: dd[k], ans: MAJOR[df[k]].filter(function (n) { return n[3] === dd[k]; }).map(keyOf).sort() });
    return K.spread([fills, roots, degs]);
  }
  // 퀴즈 지판(직접 누르는 조작) = 화면에 들어가는 최대 크기(사용자 지정 2026-11-24 — 비율은 스케일 훈련 칸 비율 그대로).
  //  폭 = 본문 폭 가득(화면 단계 고정 폭 대신), 높이 = 본문 영역에서 안내 카드·지판 위아래 여백(.jq-board 24px×2)을 뺀 나머지. 빈 슬롯을 넣은 뒤 재서 정함
  function qs(w) {
    const box = $('jq-content'), slot = $('n14q-slot'), board = slot.parentNode;
    const card = board.previousElementSibling;
    const bs = getComputedStyle(board);
    const avail = box.getBoundingClientRect().bottom - (card ? card.getBoundingClientRect().bottom : box.getBoundingClientRect().top) - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom);
    if (!box.clientWidth) return B.fit(w, B.quizW(), 190);   // 아직 화면에 안 그려진 경우(크기를 잴 수 없음) — 예전 크기
    return B.fit(w, box.clientWidth, Math.max(120, avail / (188 / 160)));   // 넥 + 프렛 번호(--fbu 188) — 아주 낮은 화면에서도 넥 120px은 둠(넘치면 cd-main 스크롤)
  }
  function render(it, ui) {
    const F = MAJOR[it.form], w = winOf(it.form);
    const fill = it.type === 'fill';
    const shown = F.map(keyOf).filter(function (k) { return !fill || it.ans.indexOf(k) < 0; }), ghost = [];
    if (fill) for (let s = 1; s <= 6; s++) for (let f = w.minF; f <= w.maxF; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    const card = fill ? ui.infoCard('빈자리를 채워서', '메이저 스케일 ' + it.form + '폼을', '완성해주세요')
      : it.type === 'root' ? ui.infoCard('메이저 스케일 ' + it.form + '폼에서', '근음을', '모두 찾아주세요')
      : ui.infoCard('근음을 기준으로', it.deg + '도 음을', '모두 찾아주세요');
    ui.box.innerHTML = card + '<div class="jq-board"><div id="n14q-slot"></div></div>';
    const sz = qs(w);
    $('n14q-slot').innerHTML = B.html('n14q-neck', w, sz.w, sz.h, { ghost: ghost });
    const nk = $('n14q-neck'), sel = {}, els = {};
    F.forEach(function (n) {
      const k = keyOf(n);
      if (fill && it.ans.indexOf(k) >= 0) return;
      els[k] = B.note(w, n[0], n[1], '', n[3] === 1 && it.type !== 'root' ? 'fb-note--root' : '');
      nk.appendChild(els[k]);
    });
    nk.addEventListener('click', function (e) {
      if (ui.judged()) return;
      const p = B.pos(nk, w, e);
      if (!p) return;
      const k = p[0] + '-' + p[1], onBlock = shown.indexOf(k) >= 0;
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.2, 0.5);
      if (fill && onBlock) return;   // 이미 있는 점 = 소리만
      if (!fill && !onBlock) return;
      if (sel[k]) { if (fill) sel[k].remove(); else sel[k].classList.remove('n15-sel'); delete sel[k]; }
      else if (fill) { sel[k] = B.note(w, p[0], p[1], '', 'fb-note--placed'); nk.appendChild(sel[k]); }
      else { sel[k] = els[k]; sel[k].classList.add('n15-sel'); }
      ui.ready(Object.keys(sel).length > 0);
    });
    ui.submit(function () {
      const picked = Object.keys(sel), ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
      picked.forEach(function (k) { sel[k].classList.remove('fb-note--placed', 'n15-sel'); sel[k].classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong'); });
      it.ans.forEach(function (k) {
        if (sel[k]) return;
        if (fill) { const sf = k.split('-'); nk.appendChild(B.note(w, +sf[0], +sf[1], '', 'fb-note--missed')); }
        else els[k].className = 'fb-note fb-note--missed';
      });
      ui.verdict(ok);
    });
  }
  function startQuiz() {
    K.start({ nodeId: NODE.id, clearName: NODE.name, make: make, render: render, title: function () { return '알맞은 답을 모두 고르세요'; } });
  }

  J.register(NODE.id, { onCut: lecCut, layers: ['n14s-fb'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE.id); } });
})();
