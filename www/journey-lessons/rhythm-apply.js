// ───────────────────────────────────────────────────────────
// 여정 노드: 펜타 수직 리듬 훈련(솔로연주 비기너 D10) · 크로메틱 리듬 훈련(D11) — 2026-11-23, docs/solo-beginner-curriculum.md
//   한 파일이 URL day로 노드를 고름(10 = 펜타, 11 = 크로메틱 — pentatonic-forms와 같은 방식). 별·이어 풀기 열쇠는 노드마다 따로(penta-rhythm · chromatic-rhythm)
//   D4에서 배운 리듬을 펜타토닉 블럭 상하행(학습자가 블럭을 고름 — 2연음 → 4연음 고정, 2026-11-24) / 5~8프렛 크로메틱(2연음 → 4연음 → 3연음, 1번줄부터 하행·상행, 퀴즈 없음 — 2026-11-24)에 적용.
//   리듬마다: 한 마디 시범(드럼 박 + 기타, 치는 점 통통) → 반주(고정, 70bpm)를 계속 틀어 둔 채 학습자가 원하는 만큼 연습.
//   반주 = 스케일 훈련 '기본1'(backing-track.js BackingTrack) — 펜타 C Am F G(jny-penta) / 크로메틱 Dm7 G7 CM7 Am7(jny-chroma, 학습자에게 코드진행은 알리지 않음 — 사용자 지정)
//   재생 중 블럭을 바꾸면 반주·기타 하드컷 → 0.5초 뒤 처음부터(blockRestart), 칸이 바뀌면 엔진 onCut에서 반주·드럼·기타를 하드컷(CLAUDE.md 0-7)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit, B = K.board;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const DAY = (function () { const m = /[?&]day=(\d+)/.exec(location.search); return m ? +m[1] : 10; })();
  const PENTA = DAY !== 11;
  const OPEN_MIDI = B.OPEN_MIDI;
  function midiOf(s, f) { return OPEN_MIDI[s - 1] + f; }
  function none() { return Promise.resolve(); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }

  // ── 펜타토닉 다섯 폼(C key) — pentatonic-forms.js FORMS의 block과 같은 값. [줄, 프렛, 음이름, 도수, 손가락] 낮은 음부터 ──
  const FORMS = {
    G: [[6, 5, 'A', 6, 1], [6, 8, 'C', 1, 4], [5, 5, 'D', 2, 1], [5, 7, 'E', 3, 3], [4, 5, 'G', 5, 1], [4, 7, 'A', 6, 3], [3, 5, 'C', 1, 1], [3, 7, 'D', 2, 3], [2, 5, 'E', 3, 1], [2, 8, 'G', 5, 4], [1, 5, 'A', 6, 1], [1, 8, 'C', 1, 4]],
    C: [[6, 12, 'E', 3, 1], [6, 15, 'G', 5, 4], [5, 12, 'A', 6, 1], [5, 15, 'C', 1, 4], [4, 12, 'D', 2, 1], [4, 14, 'E', 3, 3], [3, 12, 'G', 5, 1], [3, 14, 'A', 6, 3], [2, 13, 'C', 1, 2], [2, 15, 'D', 2, 4], [1, 12, 'E', 3, 1], [1, 15, 'G', 5, 4]],
    A: [[6, 3, 'G', 5, 1], [6, 5, 'A', 6, 3], [5, 3, 'C', 1, 1], [5, 5, 'D', 2, 3], [4, 2, 'E', 3, 1], [4, 5, 'G', 5, 4], [3, 2, 'A', 6, 1], [3, 5, 'C', 1, 4], [2, 3, 'D', 2, 1], [2, 5, 'E', 3, 3], [1, 3, 'G', 5, 1], [1, 5, 'A', 6, 3]],
    E: [[6, 8, 'C', 1, 2], [6, 10, 'D', 2, 4], [5, 7, 'E', 3, 1], [5, 10, 'G', 5, 4], [4, 7, 'A', 6, 1], [4, 10, 'C', 1, 4], [3, 7, 'D', 2, 1], [3, 9, 'E', 3, 3], [2, 8, 'G', 5, 1], [2, 10, 'A', 6, 3], [1, 8, 'C', 1, 1], [1, 10, 'D', 2, 3]],
    D: [[6, 10, 'D', 2, 1], [6, 12, 'E', 3, 3], [5, 10, 'G', 5, 1], [5, 12, 'A', 6, 3], [4, 10, 'C', 1, 1], [4, 12, 'D', 2, 3], [3, 9, 'E', 3, 1], [3, 12, 'G', 5, 4], [2, 10, 'A', 6, 1], [2, 13, 'C', 1, 4], [1, 10, 'D', 2, 1], [1, 12, 'E', 3, 3]],
  };
  const FORM_KEYS = ['G', 'C', 'A', 'E', 'D'];   // 많이 쓰는 G폼·C폼부터(사용자 지정)
  const CHROMA = [];   // 크로메틱 — 1번줄 → 6번줄(솔로는 1·2번줄이 중심 — 사용자 지정 2026-11-24), 5~8프렛, 손가락 = 프렛 − 4
  [1, 2, 3, 4, 5, 6].forEach(function (s) { [5, 6, 7, 8].forEach(function (f) { CHROMA.push([s, f, '', 0, f - 4]); }); });
  function winOf(blk) {
    const fr = blk.map(function (n) { return n[1]; }), lo = Math.min.apply(null, fr), hi = Math.max.apply(null, fr);
    return { lo: lo - 1, cols: hi - lo + 3, minF: lo, maxF: hi, fade: true };
  }
  // 상하행 한 바퀴(맨 위 음은 한 번)
  function roundOf(blk) { return blk.concat(blk.slice(0, -1).reverse()); }

  // ── 리듬 ──
  const RH = { 1: '4비트', 2: '2연음', 3: '3연음', 4: '4연음' };   // 리듬 이름(D4와 같음 — 사용자 지정 2026-11-24, 8·12·16비트에서 바꿈)
  const PER = { 1: '한 음', 2: '두 음', 3: '세 음', 4: '네 음' };
  const BPM = 70;
  const DRUM_SCRIPTS = ['drum-sets.js', 'drum-samples.js', 'drum-audio.js'];
  const BACKING_SCRIPTS = ['backing-track.js'];
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
  let audioLoad = null;
  function loadAudio() {   // 드럼(박 소리) + 반주 — 이 노드에서만 필요해 열 때 불러옴(실패하면 없이 진행)
    if (audioLoad) return audioLoad;
    const haveDrum = typeof DrumAudio !== 'undefined' && window.DRUM_SETS;
    audioLoad = (haveDrum ? Promise.resolve() : loadScripts(DRUM_SCRIPTS))
      .then(function () { return typeof BackingTrack !== 'undefined' ? null : loadScripts(BACKING_SCRIPTS); })
      .then(function () { return DrumAudio.ready(); })
      .catch(function (e) { console.error('[rhythm-apply]', e); });
    return audioLoad;
  }
  // 박 b(0~3) 하나 분량 = 기본 8비트(DRUM_SETS[1] — 킥 1·3박, 스네어 2·4박, 하이햇 8분음표)의 두 칸. beat = 한 박 길이(초). D9 drumAt과 같음(사용자 지정 2026-11-24)
  function drumAt(b, at, beat) {
    if (typeof DrumAudio === 'undefined' || !window.DRUM_SETS) return;
    const set = window.DRUM_SETS[1];
    [b * 2, b * 2 + 1].forEach(function (st, k) {
      const t = at + k * beat / 2;
      if ((set.kick || []).indexOf(st) >= 0) DrumAudio.hit('kick', t);
      if ((set.snare || []).indexOf(st) >= 0) DrumAudio.hit('snare', t);
      if ((set.hat || []).indexOf(st) >= 0) DrumAudio.hit('hat', t);
    });
  }
  function drumCut() { if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop(); }
  function backingStop() { if (typeof BackingTrack !== 'undefined') BackingTrack.stop(); }

  // ═══════════════════════════ 강의 ═══════════════════════════
  let lecW = 320, form = 'G', jamOn = false, demoGen = 0, curSub = 0, tabPage = 0, tabLast = null, loopOn = false, loopT0 = 0;
  function blk() { return PENTA ? FORMS[form] : CHROMA; }
  function size() { const w = Math.min(lecW, 340); return { w: w, h: Math.min(w * 0.4, 140) }; }
  const ARR = function (d) { return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + (d < 0 ? 'M9 1 3 6l6 5z' : 'M3 1l6 5-6 5z') + '" fill="currentColor"/></svg>'; };
  function build(stage) {
    stage.classList.add('is-jny');
    lecW = stage.clientWidth || (window.innerWidth - 32);
    stage.innerHTML = '<div class="jl-layers"><div class="jl-layer jl-rise n10s-main" id="n10s-main">' +
      (PENTA ? '<div class="n10s-sel" id="n10s-sel"><button type="button" class="n10s-arr" data-d="-1" aria-label="이전" data-sfx="none">' + ARR(-1) + '</button><span class="n10s-fn" id="n10s-fn"></span><button type="button" class="n10s-arr" data-d="1" aria-label="다음" data-sfx="none">' + ARR(1) + '</button></div>' : '') +
      (PENTA ? '<div class="n10s-fbw" id="n10s-fbw"></div>' : '') + '<div class="n10s-rh" id="n10s-rh"></div><div class="n10s-tab" id="n10s-tab"></div></div></div>';
    if (PENTA) $('n10s-sel').addEventListener('click', function (e) {
      const b = e.target.closest('.n10s-arr');
      if (!b) return;
      const i = (FORM_KEYS.indexOf(form) + +b.dataset.d + FORM_KEYS.length) % FORM_KEYS.length;
      setForm(FORM_KEYS[i]);   // 재생 중이면 처음부터 다시(blockRestart)
    });
    setForm('G');
    loadAudio();
  }
  function neck() { return $('n10s-neck'); }
  // 블럭 지판 그리기 — 점 안 손가락 번호, 근음(펜타 C) = 점 자체 파랑(글자 칸 규칙 — 가이드 §4-31·D15)
  function setForm(k) {
    form = k;
    const b = blk(), win = winOf(b), sz = B.fit(win, size().w, 140);   // 지판 = 스케일 훈련과 같은 칸 비율(폭만 늘려 점이 작아지지 않게), 넥 높이 최대 140px(170은 커서 줄임 — 사용자 지정 2026-11-24)
    if (PENTA) {   // 크로메틱은 줄마다 1234만 치면 돼서 지판 없이 타브만(사용자 지정 2026-11-24)
      $('n10s-fbw').innerHTML = B.html('n10s-neck', win, sz.w, sz.h);
      b.forEach(function (n) { neck().appendChild(B.note(win, n[0], n[1], n[4], PENTA && n[3] === 1 ? 'n15-root' : '')); });
      $('n10s-fn').textContent = k + '폼';
      neck().addEventListener('click', tap);
    }
    tabPage = 0; drawTab();
    if (loopOn) blockRestart();
  }
  // 재생 중 블럭을 바꾸면 무조건 처음부터(사용자 지정 2026-11-24 — 마디 끝에서 갈아타면 타브·지판·소리가 꼬일 수 있음)
  //  반주·드럼·기타 하드컷 → 0.5초 뒤 반주 첫 마디부터 새 블럭 상하행. 연달아 바꾸면 마지막 것만(세대 번호)
  function blockRestart() {
    const gen = ++demoGen;
    loopT0 = 0;
    backingStop(); drumCut();
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
    later(function () { if (gen === demoGen && loopOn) loopStart(); }, 500);
  }
  // ── 끝없는 상하행(사용자 지정 2026-11-24 — 블럭을 계속 올라갔다 내려오기를 반복) ──
  //  한 바퀴 = 맨 위·맨 아래 음을 한 번씩만(2n−2음: 펜타 22 · 크로메틱 46). 마디마다 4×sub음씩 이어 치면
  //  lcm(한 바퀴, 한 마디 음 수)만큼 돌아야 마디 첫 음이 다시 맞음 → 타브 마디 수 = 펜타 11 · 크로메틱 23(리듬과 관계없이)
  //  크로메틱은 줄 순서만 되돌아옴(줄마다 늘 1234 — 5678프렛): 1→6번줄 하행 후 5→1번줄 상행, 다시 2→6번줄 … (끝 줄은 되풀이하지 않음) = 한 바퀴 10줄 40음 → 2연음·4연음 5마디, 3연음 10마디(2연음은 두 마디씩 보이려고 10마디 루프 — barsOf)(사용자 지정 2026-11-24)
  function cycleOf(b) {
    if (PENTA) return b.concat(b.slice(1, -1).reverse());
    const out = [];
    [1, 2, 3, 4, 5, 6, 5, 4, 3, 2].forEach(function (st) { b.forEach(function (n) { if (n[0] === st) out.push(n); }); });
    return out;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  //  마디 수가 홀수인데 한 화면이 두 마디면(2연음 — 펜타 11마디·크로메틱 5마디) 두 바퀴(22·10마디)를 한 루프로 — 마지막 화면이 한 마디로 줄지 않고 늘 두 마디씩(사용자 지정 2026-11-24, D10·D11)
  function barsOf(sub) { const c = cycleOf(blk()).length, nb = c / gcd(c, 4 * sub); return nb % ppOf(sub) ? nb * 2 : nb; }
  function ppOf(sub) { return sub >= 3 ? 1 : 2; }   // 한 화면 마디 수 — 3·4연음은 음이 많아 한 마디씩(두 자리 숫자가 겹치지 않게)
  function perPage() { return ppOf(curSub); }
  const TAB_D = { 1: 2, 2: 1, 3: 2 / 3, 4: 0.5 };   // 음 길이(8분음표 수) — 4·8·12(셋잇단)·16비트
  // 타브악보 병행 표기(사용자 지정 2026-11-24) — 지금 화면의 마디(들) + 리듬 기호 + 피킹 기호(다운·업 번갈아). 리듬이 없으면 비움
  function drawTab() {
    const el = $('n10s-tab');
    if (!el) return;
    tabLast = null;
    if (!curSub) { el.innerHTML = ''; return; }
    const pp = perPage(), nb = barsOf(curSub), cyc = cycleOf(blk()), n = 4 * curSub, ms = [];
    for (let m = tabPage * pp; m < Math.min(nb, tabPage * pp + pp); m++) {
      const notes = [], rh = [];
      for (let k = 0; k < n; k++) { const nt = cyc[(m * n + k) % cyc.length]; notes.push({ s: nt[0], f: nt[1] }); rh.push({ n: k, d: TAB_D[curSub], p: k % 2 ? 'U' : 'D' }); }
      ms.push({ notes: notes, marks: [], rhythm: rh });
    }
    const w = size().w;
    el.innerHTML = TabRender.svg(ms, { width: ms.length < pp ? Math.round(w * 0.55) : w });   // 홀수 마디의 마지막 화면 = 한 마디만(폭도 반쯤)
  }
  function tabOn(m, k) {   // 지금 치는 숫자·피킹 기호만 파랑
    const el = $('n10s-tab');
    if (!el) return;
    const sel = function (a, b) { return '.tab-n[data-m="' + a + '"][data-i="' + b + '"], .tab-pick[data-m="' + a + '"][data-k="' + b + '"]'; };
    if (tabLast) el.querySelectorAll(sel(tabLast[0], tabLast[1])).forEach(function (x) { x.classList.remove('is-on'); });
    el.querySelectorAll(sel(m, k)).forEach(function (x) { x.classList.add('is-on'); });
    tabLast = [m, k];
  }
  function dotOf(s, f) { const nk = neck(); return nk ? nk.querySelector('.fb-note[data-k="' + s + '-' + f + '"]') : null; }
  function pop(el) {
    if (!el) return;
    el.classList.add('fb-note--playing');
    J.anim(el, [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(1.3)' }, { transform: 'translate(-50%, -50%) scale(1)' }], { duration: 300, easing: J.EASE_OUT });
    later(function () { el.classList.remove('fb-note--playing'); }, 220);
  }
  // 누르기 — 블럭 점이면 그 음 + 통통(자유롭게 쳐 보기)
  function tap(e) {
    const win = winOf(blk()), p = B.pos(neck(), win, e);
    if (!p) return;
    const el = dotOf(p[0], p[1]);
    if (!el) return;
    J.note(midiOf(p[0], p[1]), J.audioT0(), 1.2, 0.5);
    pop(el);
  }
  function setRh(sub, bare) { $('n10s-rh').innerHTML = sub && !bare ? em(RH[sub]) + ' · 한 박에 ' + PER[sub] : ''; curSub = sub; tabPage = 0; drawTab(); }   // bare = 타브만(리듬 이름 없이 — D11 주의사항 칸)
  function mainOn() { return fx([$('n10s-main')], 'is-on', true); }
  // 시연 = 반주(드럼·피아노·베이스, 고정 진행·빠르기 — 사용자 지정) + 그 박에 맞춘 기타 상하행을 끝없이. 칸 안에서는 문구만 바뀌고 소리는 계속(D9와 같음)
  //  기타는 마디 하나씩 미리 예약(반주 시계 BackingTrack.startTime 기준), 치는 점 통통 + 타브 숫자 파랑 + 마디가 화면을 넘으면 다음 화면.
  //  늦게 준비돼도 칸을 떠났으면 시작하지 않음(jamOn·demoGen·BackingTrack 토큰). 칸이 바뀌면 엔진 onCut → lecCut에서 반주·드럼·예약을 끊음
  function barDur() { return 4 * 60 / BPM; }
  function audioNow() { return Tone.getContext().rawContext.currentTime; }
  function loopStart() {
    if (J.skipping()) return;
    jamOn = true; loopOn = true; loopT0 = 0;
    const gen = ++demoGen;
    loadAudio().then(function () {
      if (gen !== demoGen || typeof BackingTrack === 'undefined') return;
      // 기타 하드컷(panic) 뒤엔 샘플러 준비를 기다림(CLAUDE.md 0-7) — 반주 시작 전에 기다려야 첫 마디 박이 맞음
      return (GuitarAudio.ready ? GuitarAudio.ready() : Promise.resolve()).then(function () {
        if (gen !== demoGen) return;
        return BackingTrack.start(function () { return { bpm: BPM, root: 0, level: PENTA ? 'jny-penta' : 'jny-chroma' }; }, 'basic');
      }).then(function (ok) {
        if (!ok || gen !== demoGen) return;
        loopT0 = BackingTrack.startTime ? BackingTrack.startTime() : audioNow() + 0.1;
        schedBar(gen, 0, loopT0);
      });
    });
  }
  function schedBar(gen, i, t) {
    if (gen !== demoGen || !curSub) return;
    const n = 4 * curSub, step = barDur() / n, cyc = cycleOf(blk()), nb = barsOf(curSub), pp = perPage(), tb = i % nb, m = tb % pp;
    const ms = function (at) { return Math.max(0, (at - audioNow()) * 1000); };
    later(function () {
      if (gen !== demoGen) return;
      const pg = Math.floor(tb / pp);
      if (pg !== tabPage) { tabPage = pg; drawTab(); }
    }, Math.max(0, ms(t) - 40));
    for (let k = 0; k < n; k++) {
      const nt = cyc[(i * n + k) % cyc.length], at = t + k * step;
      J.note(midiOf(nt[0], nt[1]), at, step * 0.95, 0.1);
      later(function () { if (gen !== demoGen) return; pop(dotOf(nt[0], nt[1])); tabOn(m, k); }, ms(at));
    }
    later(function () { schedBar(gen, i + 1, t + barDur()); }, Math.max(0, ms(t + barDur()) - 400));
  }
  function lecCut() { jamOn = false; loopOn = false; loopT0 = 0; demoGen++; backingStop(); drumCut(); }
  function rhStep(sub, text) {
    return Object.assign(J.chainSteps([
      { text: text, scene: 'n10s-main', enter: function () { lecCut(); setRh(sub); }, run: function () { return mainOn().then(function () { loopStart(); return wait(J.leadMs() + barDur() * 1000 + 300); }); } },
      { text: '반주에 맞춰 원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]), { ms: 8070 });   // ms = 측정값(첫 마디 + 두 번째 문구)
  }
  // 크로메틱(D11) 리듬 칸 — 문구 두 개 모두 사용자 지정. 첫 문구 = 리듬 이름·타브, 둘째 문구 = 반주 + 기타 끝없이(넘어갈 때까지)
  function chRhStep(sub, t1, t2) {
    return Object.assign(J.chainSteps([
      { text: t1, scene: 'n10s-main', enter: function () { lecCut(); setRh(sub); }, run: mainOn },
      { text: t2, run: function () { loopStart(); return wait(J.leadMs() + barDur() * 1000 + 300); } },
    ]), { ms: 8070 });
  }

  //  강의 최종 목적: 네 리듬을 블럭(펜타) / 크로메틱에 적용 — 리듬을 듣고 구별, 블럭·손가락 복습(퀴즈)
  const steps = PENTA ? [
    // P1 준비
    // 0 핵심(D9 적용): 블럭 안에서 리듬 적용 — 목표 = 2연음·4연음 + 얼터네이트 피킹, 블럭은 화살표로 고름(G·C폼 추천). 끝 화면 = 선택 줄 + G폼(손가락 번호)
    //  문구 = 사용자 지정(2026-11-24). 3연음 제외, 순서 고정 2연음 → 4연음, 블럭만 학습자 선택. '6번줄부터 올라갔다 내려오기' 칸은 뺌(사용자 지정)
    J.chainSteps([
      { text: '이번 시간에는 스케일 블럭 안에서\n' + em('리듬') + '을 적용하는 훈련을 할 거예요!', run: none },
      { text: '목표는 스케일 블럭을\n' + em('2연음, 4연음') + '으로 연주하고', run: none },
      { text: em('얼터네이트 피킹') + '을 스케일에\n적용해보는 것이 목표예요', run: none },
      { text: '연습하고 싶은 스케일을\n' + em('화살표') + '로 넘기면서 연습하면 돼요!', scene: 'n10s-main', enter: function () { setRh(0); }, run: mainOn },
      { text: '가장 많이 쓰는 ' + em('G폼') + ', ' + em('C폼') + '부터\n연습하는 것을 추천드려요', run: none },
    ]),
    // P2 두 리듬(2연음 → 4연음 고정 — 사용자 지정 2026-11-24) — 리듬마다 한 마디 시범 → 반주 계속(원하는 만큼)
    rhStep(2, '먼저 ' + em('2연음') + '이에요\n한 박에 ' + em('두 음') + ', 다운·업으로 쳐요'),
    rhStep(4, '이번엔 ' + em('4연음') + '이에요\n한 박에 ' + em('네 음') + '씩이에요'),
    // P3 마무리
    J.chainSteps([
      // 문구 = 사용자 지정(2026-11-24). 퀴즈 실제 구성 = 블럭 빈자리 채우기(다섯 폼) + 리듬 듣기 + 한 박의 음 수
      { text: em('G폼') + ', ' + em('C폼') + ' 스케일이\n제일 많이 쓰이긴 하지만', scene: 'n10s-main', enter: function () { jamOn = false; setRh(0); }, run: none },
      { text: em('5가지 스케일') + ' 모두 중요해요!\n꼭 모두 손에 익도록 연습해주세요!', run: none },
      { text: '이번 퀴즈에서는\n' + em('5가지 스케일의 모양') + '과', run: none },
      { text: em('리듬을 듣고 맞추는 감각') + '을\n종합적으로 복습할 거예요!', run: none },
      { text: '항상 직접 기타를 잡고 연습해주는 게\n중요하니 잊지 마세요~!', run: none },
    ]),
  ] : [
    // 크로메틱(D11) — 문구·구성 사용자 지정(2026-11-24). 퀴즈 없는 노드(마지막 칸 '완료' → 노드 완료 기록 → 홈)
    // P1 도입(무대 없음)
    J.chainSteps([
      { text: '이번 시간에는 크로메틱을\n본격적으로 훈련해 볼게요!', run: none },
      { text: '크로메틱은 손풀기 연습 정도로\n생각하는 경우가 많지만', run: none },
      { text: '크로메틱 연습을 통한 손가락의 감각이\n실제 연주에서 도움되는 경우가 많아요!', run: none },
      { text: '지금부터 기초적인\n크로메틱 훈련 루틴을 알려드릴게요!', run: none },
      { text: '꾸준히 반복적으로 연습해두면\n반드시 하길 잘했다는 순간이 올 거예요~!', run: none },
    ]),
    // P2 S1 사전 주의사항 — 타브(2연음, 1번줄부터)를 먼저 띄움(리듬 이름은 아직 없음)
    J.chainSteps([
      { text: '기타 솔로연주는 주로 ' + em('1, 2번줄') + '이\n핵심이 되는 경우가 많아요', scene: 'n10s-main', enter: function () { setRh(2, true); }, run: mainOn },
      { text: '그래서 크로메틱을\n1번줄부터 연습해보세요!', run: none },
      { text: '특히 오른손 피킹을 ' + em('1, 2번줄') + '을 중심으로\n' + em('균형') + '을 잡아두는 습관을 들여주세요', run: none },
    ]),
    // P2 S2 2연음 · P3 4연음 · P4 3연음 — 첫 문구에서 리듬·타브, 둘째 문구에서 반주 + 기타 끝없이
    chRhStep(2, '반주에 맞춰 2연음\n크로메틱 연습을 해볼게요', '피킹을 틀리지 않는 연습이 중요해요\n피킹에 집중해주세요!'),
    chRhStep(4, '이제 반주에 맞춰\n4연음 크로메틱 연습을 해볼게요!', '너무 빠르다면 ' + em('음 4개씩') + '만 묶어 연습하고\n8개, 12개, 16개로 늘려가보세요!'),
    chRhStep(3, '마지막은 3연음 연습이에요!', '3연음의 피킹이 가장 헷갈릴 거예요\n끈기를 가지고 연습해주세요!'),
    // P5 마무리
    J.chainSteps([
      { text: '고생하셨어요!\n크로메틱 연습부터는 조금 어려우셨죠?', scene: 'n10s-main', enter: function () { jamOn = false; setRh(0); }, run: none },
      { text: '지루한 연습이겠지만\n' + em('Ckey 반주') + '를 틀어놓고 연습하면', run: none },
      { text: '조금 덜 지루하게 연습할 수 있을 거예요!\n힘내세요!', run: none },
      { text: '이번 학습엔 별도의 퀴즈가 없어요!\n가끔은 쉬어가는 것도 필요하죠~!', run: none },
    ]),
  ];
  const groups = PENTA ? [[0], [1, 2], [3]] : [[0], [1, 2], [3], [4], [5]];
  // 칸 길이(ms) = 측정값(scripts/journey-lesson-timing.js)
  const MS = {};
  Object.keys(MS).forEach(function (k) { if (MS[k]) steps[k].ms = MS[k]; });

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  펜타만: ① ear 리듬 듣기(D9과 같음 — G폼 음으로) ② fill 펜타 블럭 빈자리 채우기(다섯 폼, D15 규칙) ③ count 리듬 → 한 박의 음 수
  //  크로메틱(D11)은 퀴즈 없는 노드(사용자 지정 2026-11-24) — 마지막 칸 '완료'에서 노드 완료만 기록(markDone)
  const NODE_ID = PENTA ? 'penta-rhythm' : 'chromatic-rhythm';
  const CFG = { 1: { ear: 4, fill: 4, count: 2 }, 2: { ear: 6, fill: 6, count: 3 }, 3: { ear: 6, fill: 6, count: 3 } };
  const BLANK = { 1: [2, 2], 2: [3, 4], 3: [4, 6] };
  const ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function cycle(n, pool) { const out = []; let p = []; for (let k = 0; k < n; k++) { if (!p.length) p = K.shuffle(pool.slice()); out.push(p.pop()); } return out; }
  function make(star) {
    const c = CFG[star], ears = [], second = [], counts = [];
    const SUBS = [2, 4];   // 강의에서 다룬 리듬만 출제 — 2연음·4연음(보기는 네 리듬 그대로 — 사용자 지정 2026-11-24)
    cycle(c.ear, SUBS).forEach(function (sub) { ears.push({ type: 'ear', sub: sub }); });
    cycle(c.count, SUBS).forEach(function (sub) { counts.push({ type: 'count', sub: sub, answer: sub }); });
    const seen = {}, forms = cycle(c.fill, FORM_KEYS);
    for (let k = 0, g = 0; k < c.fill && g < 500; g++) {
      const F = forms[k], m = BLANK[star][0] + K.rnd(BLANK[star][1] - BLANK[star][0] + 1);
      const ans = K.shuffle(FORMS[F].map(function (n) { return n[0] + '-' + n[1]; })).slice(0, m).sort(), sig = F + ans.join(',');
      if (seen[sig]) continue;
      seen[sig] = true; second.push({ type: 'fill', form: F, ans: ans }); k++;
    }
    return K.spread([ears, second, counts]);
  }
  // 리듬 듣기 — 두 마디, 기타 음 + 박 기준 드럼(기본 8비트 — 드럼이 없으면 박을 알 수 없어 다시 넣음, 사용자 지정 2026-11-24). 다시 들으면 앞 재생을 끊고 처음부터
  let earGen = 0;
  function earPlay(sub) {
    const gen = ++earGen;
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
    drumCut();
    loadAudio().then(function () {
      if (gen !== earGen) return;
      return (GuitarAudio.ready ? GuitarAudio.ready() : Promise.resolve()).then(function () {
        if (gen !== earGen) return;
        const beat = 60 / BPM, at = Tone.now() + 0.1, seq = roundOf(FORMS.G);
        for (let b = 0; b < 8; b++) drumAt(b % 4, at + b * beat, beat);   // 두 마디 박 기준(강의와 같은 기본 8비트)
        for (let k = 0; k < 8 * sub; k++) { const n = seq[k % seq.length]; GuitarAudio.strumAt([midiOf(n[0], n[1])], 0, at + k * beat / sub, beat / sub * 0.95, 0.08); }
      });
    });
  }
  function stopQuizSound() { earGen++; drumCut(); }
  function render(it, ui) {
    const box = ui.box;
    if (it.type === 'ear') {
      box.innerHTML = ui.cardHtml('리듬 소리', '<span class="n9q-spk">' + ICON_SOUND + '</span>', '터치해서 다시 들어보세요!', '들리는 리듬을 고르세요',
        [1, 2, 3, 4].map(function (s) { return { v: s, label: RH[s] }; }));
      box.querySelector('.jq-qcard').addEventListener('click', function () { if (!ui.judged()) earPlay(it.sub); });
      ui.bindChoices(it.sub);
      earPlay(it.sub);
    } else if (it.type === 'count') {
      box.innerHTML = ui.cardHtml('리듬', RH[it.sub], '한 박에 몇 음을 칠까요?', '알맞은 답을 고르세요', [1, 2, 3, 4].map(function (n) { return { v: n, label: PER[n] }; }));
      ui.bindChoices(it.answer);
    } else renderFill(it, ui);
  }
  // 빈자리 채우기(D15와 같은 조작): 빈 자리(고스트)를 누르면 점, 다시 누르면 취소, 남은 점은 소리만 → 제출하기
  function renderFill(it, ui) {
    const F = FORMS[it.form], win = winOf(F), w = B.quizW();
    const shown = F.map(function (n) { return n[0] + '-' + n[1]; }).filter(function (k) { return it.ans.indexOf(k) < 0; }), ghost = [];
    for (let s = 1; s <= 6; s++) for (let f = win.minF; f <= win.maxF; f++) if (shown.indexOf(s + '-' + f) < 0) ghost.push(s + '-' + f);
    ui.box.innerHTML = ui.infoCard('빈자리를 채워서', '펜타토닉 ' + it.form + '폼을', '완성해주세요') + '<div class="jq-board"><div id="n10q-slot"></div></div>';
    $('n10q-slot').innerHTML = B.html('n10q-neck', win, w, Math.min(w * 0.5, 190), { ghost: ghost });
    const nk = $('n10q-neck'), sel = {};
    F.forEach(function (n) { if (it.ans.indexOf(n[0] + '-' + n[1]) < 0) nk.appendChild(B.note(win, n[0], n[1], '', n[3] === 1 ? 'fb-note--root' : '')); });
    nk.addEventListener('click', function (e) {
      if (ui.judged()) return;
      const p = B.pos(nk, win, e);
      if (!p) return;
      const k = p[0] + '-' + p[1];
      J.note(midiOf(p[0], p[1]), J.audioT0(), 1.2, 0.5);
      if (shown.indexOf(k) >= 0) return;   // 이미 있는 점 = 소리만
      if (sel[k]) { sel[k].remove(); delete sel[k]; } else { sel[k] = B.note(win, p[0], p[1], '', 'fb-note--placed'); nk.appendChild(sel[k]); }
      ui.ready(Object.keys(sel).length > 0);
    });
    ui.submit(function () {
      const picked = Object.keys(sel), ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
      picked.forEach(function (k) { sel[k].classList.remove('fb-note--placed'); sel[k].classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong'); });
      it.ans.forEach(function (k) { if (!sel[k]) { const sf = k.split('-'); nk.appendChild(B.note(win, +sf[0], +sf[1], '', 'fb-note--missed')); } });
      ui.verdict(ok);
    });
  }
  function startQuiz() {
    loadAudio();
    K.start({ nodeId: NODE_ID, clearName: '펜타 수직 리듬 훈련', make: make, render: render, stop: stopQuizSound,
      title: function (it) { return it.type === 'fill' ? '알맞은 답을 모두 고르세요' : '알맞은 답을 고르세요'; } });
  }
  // 퀴즈 없는 노드(D11)의 완료 기록 — 퀴즈 별 1과 같은 자리(jnyStars = 1, jnyDoneAt = 다음 노드 6시간 타이머 기준). 홈은 이 노드의 별을 그리지 않음(journey.js noQuiz)
  function markDone() {
    try { const o = JSON.parse(localStorage.getItem('jnyStars') || '{}'); o[NODE_ID] = Math.max(o[NODE_ID] || 0, 1); localStorage.setItem('jnyStars', JSON.stringify(o)); } catch (e) {}
    try { const t = JSON.parse(localStorage.getItem('jnyDoneAt') || '{}'); if (!t[NODE_ID]) { t[NODE_ID] = Date.now(); localStorage.setItem('jnyDoneAt', JSON.stringify(t)); } } catch (e) {}
  }

  J.register(NODE_ID, PENTA
    ? { onCut: lecCut, layers: ['n10s-main'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE_ID); } }
    : { onCut: lecCut, layers: ['n10s-main'], steps: steps, groups: groups, build: build, onDone: markDone });
})();
