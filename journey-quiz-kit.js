// ───────────────────────────────────────────────────────────
// journey-quiz-kit.js — 여정 노드 퀴즈 공용 키트 (2026-11-23, 솔로연주 비기너 새 노드들이 같이 씀 — docs/solo-beginner-work-guide.md §2)
//   journey-lessons/pentatonic-forms.js의 퀴즈 엔진(별 진행·피크 소모·환급·오답풀이·이어 풀기·오버레이·진행 막대)을 그대로 옮긴 것 — 동작·문구·값이 같다.
//   노드는 문제 만들기(make)와 문제 화면(render)만 쓴다. 문제는 퀴즈를 시작할 때 전부 확정(가이드 §4-16), 화면은 그리기만.
//
//   JQuizKit.start(def)
//     def = { nodeId, clearName, make(star) → qs[], render(it, ui), title(it)?, stop()? }
//     ui  = { box, review, infoCard(head, mid, tail), cardHtml(sub, name, ask, bubble, items, big), bindChoices(answer), submit(fn), ready(on), verdict(ok, delay) }
//       · 보기 카드: box에 cardHtml(...)을 넣고 bindChoices(정답 값) — 누르면 바로 채점(정답 초록·오답 빨강, 보기 잠김)
//       · 지판 고르기 등 제출형: submit(fn) — '제출하기'(처음엔 꺼짐), ready(true)로 켬, 누르면 fn() → 노드가 채점 표시 후 verdict(ok)
//       · 누르는 즉시 채점(찾아 누르기): 노드가 바로 verdict(ok, 지연)
//   JQuizKit.board — 스케일 훈련 지판(.fb-*, D15·D20과 같은 클래스). win = { lo, cols, minF, maxF, fade } — lo = 0이면 첫 칸이 개방현 자리(그 오른쪽 선이 너트)
//   JQuizKit.judgeSound(ok) — 퀴즈 정답·오답 벨(강의 참여형 통과음도 이것)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄 E4 B3 G3 D3 A2 E2
  const OPEN_NAME = ['E', 'B', 'G', 'D', 'A', 'E'];

  // ── 지판 ──
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
  const SINGLE_DOTS = [3, 5, 7, 9, 15, 17], DOUBLE_DOTS = [12];
  function fbX(win, f) { return (f - win.lo + 0.5) / win.cols * 100; }
  function fbY(s) { return (s - 0.5) / 6 * 100; }
  // w = 지판 폭(px), neckH = 넥 높이(px). opt = { ghost: ['줄-프렛'], names: true(점 칸 말고 모든 칸 프렛 번호) }
  function boardHtml(id, win, w, neckH, opt) {
    opt = opt || {};
    const inWin = function (f) { return f >= win.lo && f < win.lo + win.cols; };
    let h = '';
    // 0프렛 칸이 있는 창 = D2(note-names.js sfbHtml)·스케일 훈련과 같은 개방현 디자인(2026-11-24 사용자 지적 — 노드17·18):
    //  줄은 너트 오른쪽 끝에서 시작(가이드 §4-33), 너트 = .fb-nut-line(1번줄 윗선~6번줄 아랫선, .n2-sfb 규칙), 개방현 칸엔 빈 동그라미(.fb-open-hint)
    const OPEN = win.lo === 0, nut = 100 / win.cols;
    for (let s = 1; s <= 6; s++) h += '<div class="fb-string is-in" data-s="' + s + '" style="top:' + fbY(s) + '%;height:' + STRING_THICKNESS[s - 1] + 'px' + (OPEN ? ';left:calc(' + nut + '% + 2 * var(--fbu))' : '') + '"></div>';
    if (OPEN) {
      h += '<div class="fb-nut-line" style="left:' + nut + '%"></div>';
      for (let s = 1; s <= 6; s++) h += '<div class="fb-open-hint" data-s="' + s + '" style="left:' + fbX(win, 0) + '%;top:' + fbY(s) + '%">' + (opt.openNames ? '<span class="n2-open is-in">' + OPEN_NAME[s - 1] + '</span>' : '') + '</div>';   // opt.openNames = 빈 동그라미 안 개방현 음이름(D2 강의와 같은 표기)
    }
    for (let c = OPEN ? 2 : 0; c <= win.cols; c++) h += '<div class="fb-fret-line" style="left:' + (c / win.cols * 100) + '%"></div>';
    SINGLE_DOTS.filter(inWin).forEach(function (f) { h += '<div class="fb-dot" style="left:' + fbX(win, f) + '%;top:50%"></div>'; });
    DOUBLE_DOTS.filter(inWin).forEach(function (f) { [33, 67].forEach(function (y) { h += '<div class="fb-dot" style="left:' + fbX(win, f) + '%;top:' + y + '%"></div>'; }); });
    (opt.ghost || []).forEach(function (k) { const sf = k.split('-'); h += '<div class="fb-note fb-note--ghost' + (+sf[1] === 0 ? ' jqk-open' : '') + '" data-g="' + k + '" style="left:' + fbX(win, +sf[1]) + '%;top:' + fbY(+sf[0]) + '%"></div>'; });
    let nums = '';
    for (let f = win.lo; f < win.lo + win.cols; f++) {
      const dotF = SINGLE_DOTS.indexOf(f) >= 0 || DOUBLE_DOTS.indexOf(f) >= 0;
      if (!dotF && !(opt.names && f > 0)) continue;   // 점 칸 번호만(D1 규칙) — names면 모든 칸
      nums += '<div class="fb-fret-num" data-f="' + f + '" style="left:' + fbX(win, f) + '%">' + f + '</div>';
    }
    const colW = w / win.cols;
    return '<div class="fb-full-wrapper n2-sfb n20-sfb jqk-sfb degrees-on' + (win.fade ? ' n15-sfb' : '') + '" style="width:' + w + 'px;--fbu:' + (neckH / 160) + 'px;--n15-fade:' + (colW * 0.7) + 'px">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums">' + nums + '</div></div>';
  }
  function noteEl(win, s, f, label, extra) {
    const el = document.createElement('div');
    el.className = 'fb-note' + (f === 0 ? ' jqk-open' : '') + (extra ? ' ' + extra : '');   // 0프렛 = 개방현 속 빈 원(스케일 훈련과 같음)
    el.style.left = fbX(win, f) + '%';
    el.style.top = fbY(s) + '%';
    el.dataset.k = s + '-' + f;
    if (label != null && label !== '') el.innerHTML = '<span class="fb-note-deg">' + label + '</span>';
    return el;
  }
  // 누른 자리 → [줄, 프렛] (minF~maxF 밖이면 null)
  function boardPos(neckEl, win, e) {
    const r = neckEl.getBoundingClientRect();
    const f = Math.floor((e.clientX - r.left) / r.width * win.cols) + win.lo;
    const s = Math.floor((e.clientY - r.top) / r.height * 6) + 1;
    if (f < win.minF || f > win.maxF || s < 1 || s > 6) return null;
    return [s, f];
  }
  // 지판 크기 — 스케일 훈련 지판과 같은 칸 비율(scale-level.js FB_REF_*: 7프렛 창 폭 ≈288 : 넥 높이 ≈147.6 → 프렛 칸 폭 1 : 넥 높이 3.59).
  //  점 크기는 넥 높이(--fbu = 높이 ÷ 160)를 따라가므로, 폭만 늘리고 높이를 그대로 두면 점이 칸에 비해 작아져 누르기 어려움 → 폭·높이를 항상 같은 비율로(사용자 지정 2026-11-24)
  //  maxW 안에서 가장 크게, 높이가 maxH를 넘으면 높이에 맞춰 폭을 줄임
  const FB_CELL_R = 147.57 / (125.22 * 2.3 / 7);
  function fit(win, maxW, maxH) {
    let w = maxW, h = w / win.cols * FB_CELL_R;
    if (h > maxH) { h = maxH; w = h * win.cols / FB_CELL_R; }
    return { w: Math.round(w), h: Math.round(h) };
  }
  // 퀴즈 지판 폭 — 화면 단계별 고정값(D15 QZ_FB_TIER_W와 같음), 본문 폭보다 크면 본문 폭
  const QZ_FB_TIER_W = [[480, 328], [768, 376], [1079, 424], [1599, 472], [Infinity, 520]];
  function quizW() {
    const vw = window.innerWidth, box = $('jq-content');
    return Math.min(box ? box.clientWidth : vw - 32, QZ_FB_TIER_W.find(function (t) { return vw <= t[0]; })[1]);
  }

  // ── 소리 — 정답(상승)·오답(하강) 벨: 리하모니(chord-combo.js comboPlaySound)와 같은 소리 ──
  let bellCtx = null;
  function bell(freq, delay, gainVal) {
    try {
      if (!bellCtx) bellCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (bellCtx.state !== 'running') bellCtx.resume();
      const t = bellCtx.currentTime + delay;
      const vol = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
      [[1, 1, 0.8], [2.756, 0.55, 0.5], [5.404, 0.35, 0.3], [8.933, 0.18, 0.15], [13.46, 0.08, 0.08]].forEach(function (pt) {
        const osc = bellCtx.createOscillator(), g = bellCtx.createGain();
        osc.connect(g); g.connect(bellCtx.destination);
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
    if (typeof _sfxMarkPlayed === 'function') _sfxMarkPlayed();   // 공용 클릭음과 겹치지 않게
    if (ok) { bell(523.25, 0, 0.2); bell(698.46, 0.13, 0.2); } else { bell(349.23, 0, 0.2); bell(261.63, 0.13, 0.2); }
  }
  // 강의 참여형 통과음 — 마지막으로 누른 자리의 기타 소리(J.leadMs 뒤에 울림)가 먼저 들리고 약간 텀을 둔 뒤 정답 벨(사용자 지정 2026-11-24 — 전 노드 공통).
  //  엔진 J.later로 예약해서 칸이 바뀌면(이동·건너뛰기·이탈) 울리지 않음. 돌려주는 값 = 벨까지의 ms(다음 문구는 이 뒤에 — passMs + 여유)
  const PASS_GAP_MS = 350;
  function passSound() {
    const J = window.JourneyLesson, d = (J && J.leadMs ? J.leadMs() : 0) + PASS_GAP_MS;
    if (J && J.later) J.later(function () { judgeSound(true); }, d); else judgeSound(true);
    return d;
  }

  // ═══════════════════════════ 퀴즈 엔진 ═══════════════════════════
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  const STARS_KEY = 'jnyStars';
  const SESS_FIELDS = ['star', 'qs', 'idx', 'wrong', 'phase', 'rvPos', 'done', 'judged', 'canRetry', 'paid', 'correct', 'refunded'];
  const DEFAULT_TITLE = '알맞은 답을 고르세요';
  let D = null, qz = null, submitFn = null, bound = false;

  function SESS_KEY() { return 'jnyQuizSess:' + D.nodeId; }
  function starsGet(id) { try { return JSON.parse(localStorage.getItem(STARS_KEY) || '{}')[id] || 0; } catch (e) { return 0; } }
  function starsSet(n) {
    const id = D.nodeId;
    if (typeof analytics !== 'undefined' && n > starsGet(id)) analytics.track('journey_quiz_cleared', { node_id: id, quiz_k: n, course_kind: new URLSearchParams(location.search).get('course') });   // 분석(2026-11-26 여정 텍소노미): 처음 깬 단계만
    try { const o = JSON.parse(localStorage.getItem(STARS_KEY) || '{}'); o[id] = Math.max(o[id] || 0, n); localStorage.setItem(STARS_KEY, JSON.stringify(o)); } catch (e) {}
    // 퀴즈 노드 3(별 3)을 처음 클리어한 시각 = 묶음 완료 — 다음 설명 노드의 6시간 타이머 기준(journey.js jnyOpenAt, 2026-11-24 노드 늘리기). 처음 한 번만
    try { const t = JSON.parse(localStorage.getItem('jnyDoneAt') || '{}'); if (n >= 3 && !t[id]) { t[id] = Date.now(); localStorage.setItem('jnyDoneAt', JSON.stringify(t)); } } catch (e) {}
  }
  function sessSave() {
    if (!qz || qz.over || qz.quit) return;
    const o = { node: D.nodeId };
    SESS_FIELDS.forEach(function (k) { o[k] = qz[k]; });
    try { localStorage.setItem(SESS_KEY(), JSON.stringify(o)); } catch (e) {}
  }
  // 하던 퀴즈(노드 id로) — 저장분의 별이 지금 풀 별과 다르면 버림. 노드가 canResume으로 부름
  // 노드가 문제 유형을 바꿨을 때 — 그 전에 저장된 이어 풀기(옛 유형 문제)는 새 화면으로 못 그리므로 버림. types(id, ['name', 'find']) = 지금 유형 목록
  const TYPES = {};
  function types(id, list) { TYPES[id] = list; }
  function sessLoad(id) {
    try {
      const o = JSON.parse(localStorage.getItem('jnyQuizSess:' + id) || 'null');
      if (!o || o.node !== id || o.star !== window.JourneyLesson.quizStar(starsGet(id)) || !Array.isArray(o.qs)) return null;
      if (TYPES[id] && !o.qs.every(function (q) { return q && TYPES[id].indexOf(q.type) >= 0; })) return null;
      return o;
    } catch (e) { return null; }
  }
  function sessClear() { try { localStorage.removeItem(SESS_KEY()); } catch (e) {} }
  function isPro() { return typeof getPlan === 'function' && getPlan() === 'pro'; }
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 순소모 = 5문제당 1

  // 소리 하드컷 — 문제 전환·보기 선택·오답풀이 진입·완주·이탈(CLAUDE.md 0-7)
  function stopSound() {
    if (D && typeof D.stop === 'function') { try { D.stop(); } catch (e) {} }
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }

  // 안내 카드 — 리하모니 _comboV2BuildInfoCard와 같은 3줄(앞 문구 / 강조 / 뒤 문구). mid가 없으면 2줄
  function infoCard(head, mid, tail) {
    return '<div class="combo-v2-info-card cd-card"><p class="combo-v2-info-text"><span>' + head + '</span>' + (mid ? '<b><span>' + mid + '</span></b>' : '') + '<span>' + tail + '</span></p></div>';
  }
  // 문제 카드 + 말풍선 + 보기(D12 cardQuizHtml과 같은 마크업). items = [{ v, label }]
  function cardHtml(sub, name, ask, bubble, items, big) {
    return '<div class="ms-quiz-question-card jq-qcard">' + (sub ? '<span class="jq-qsub">' + sub + '</span>' : '') + '<span class="ms-quiz-question-name' + (big ? '' : ' jq-qname--sm') + '">' + name + '</span>' +
      (ask ? '<span class="jq-qask">' + ask + '</span>' : '') + '</div>' +
      '<div class="jq-cq-answer">' + (bubble ? '<div class="jq-bubble">' + bubble + '</div>' : '') + '<div class="ms-quiz-choices jq-cq-choices">' +
      items.map(function (c) { return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-v="' + c.v + '">' + c.label + '</button>'; }).join('') +
      '</div></div>';
  }
  function bindChoices(answer) {
    const wrap = $('jq-content').querySelector('.jq-cq-choices');
    if (!wrap) return;
    wrap.addEventListener('click', function (e) {
      const b = e.target.closest('.ms-quiz-choice-card');
      if (!b || !qz || qz.judged) return;
      stopSound();   // 보기를 고르면 문제 소리는 바로 끊음
      const ok = b.dataset.v === String(answer);
      $('jq-content').querySelectorAll('.ms-quiz-choice-card').forEach(function (c) {
        if (c.dataset.v === String(answer)) c.classList.add('ms-quiz-choice-card--correct');
        else if (c === b) c.classList.add('ms-quiz-choice-card--wrong');
      });
      wrap.classList.add('is-locked');
      verdict(ok);
    });
  }
  function qBtn(label, enabled, ok) {
    const b = $('jq-btn');
    b.textContent = label;
    b.dataset.sfx = label === '제출하기' ? 'none' : 'pop';   // 공용 클릭음: 제출하기는 없음(채점 벨만), 나머지는 pop
    b.disabled = !enabled;
    b.classList.toggle('combo-v2-submit--ok', ok === true);
    b.classList.toggle('combo-v2-submit--ng', ok === false);
  }
  function qProgress() {
    const total = qz.qs.length + qz.wrong.length;
    const pct = Math.sqrt(qz.done / total) * 100;
    const el = $('jq-fill');
    el.style.width = pct + '%';
    el.style.background = pct >= 90 ? '#FFD60A' : pct >= 75 ? '#4CBB17' : '';
  }
  function cur() { return qz.qs[qz.phase === 'review' ? qz.wrong[qz.rvPos] : qz.idx]; }

  const ui = {
    get box() { return $('jq-content'); },
    get review() { return !!qz && qz.phase === 'review'; },
    judged: function () { return !qz || qz.judged; },
    infoCard: infoCard, cardHtml: cardHtml, bindChoices: bindChoices,
    submit: function (fn) { submitFn = fn; qBtn('제출하기', false); },
    ready: function (on) { if (qz && !qz.judged && submitFn) qBtn('제출하기', !!on); },
    verdict: function (ok, delay) { verdict(ok, delay); },
  };

  function render() {
    stopSound();   // 앞 문제 소리·예약을 하드컷 — 새 문제는 무음에서 시작
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    submitFn = null;
    sessSave();
    const it = cur();
    $('jq-title').textContent = (D.title && D.title(it)) || DEFAULT_TITLE;
    $('jq-review-badge').hidden = qz.phase !== 'review';
    $('jq-content').innerHTML = '';
    qBtn('제출하기', false);
    D.render(it, ui);
  }

  // ── 피크 — 답할 때 1개 차감(사용자 지정 2026-11-12). 본 문제 한 문제당 한 번(paid), 오답풀이·Pro는 없음 ──
  function peakAvail() {
    if (typeof _peakState === 'undefined') return Infinity;
    return (_peakState.balance || 0) + (typeof _peakRefundPending === 'function' ? _peakRefundPending() : 0);
  }
  function needsPay() { return qz.phase === 'main' && !qz.paid[qz.idx] && !isPro(); }
  function payOnAnswer() {
    if (!needsPay()) return;
    qz.paid[qz.idx] = true;
    if (typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
      // DEV 빌드: 공용 consumePeak는 소모 없이 통과(shared.js 규칙) → 화면 숫자만 흉내
      if (typeof _peakState !== 'undefined') { _peakState = Object.assign({}, _peakState, { balance: (_peakState.balance || 0) - 1 }); if (typeof renderPeakBadge === 'function') renderPeakBadge(); }
    } else if (typeof consumePeak === 'function') consumePeak(1, 'journey');
    peakPop('−1');
  }
  function showShort() {
    qz.short = true;
    if (typeof openPeakBuffer === 'function') openPeakBuffer('journey');
    $('jq-title').textContent = DEFAULT_TITLE;
    $('jq-review-badge').hidden = true;
    $('jq-content').innerHTML = infoCard('피크가 부족해요', '', '충전한 뒤 이어서 풀 수 있어요');
    qBtn('이어서 풀기', true);
  }
  // 피크 연출 — 리하모니 _comboV2PeakPop과 같음(소모 '−1', 환급 '+N')
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

  // 채점 — 본 문제는 맞든 틀리든 한 칸 진행(틀리면 오답풀이 몫이 전체에 더해짐), 오답풀이는 맞혔을 때만 한 칸
  function verdict(ok, delay) {
    if (!qz || qz.judged) return;
    payOnAnswer();
    qz.judged = true;
    if (ok) qz.correct++;
    const due = ok && qz.correct % QZ_REFUND_EVERY === 0;
    if (qz.phase === 'main') { if (!ok) qz.wrong.push(qz.idx); qz.done++; }
    else if (ok) qz.done++;
    qz.canRetry = qz.phase === 'review' && !ok;
    const last = qz.phase === 'review' ? (ok && qz.rvPos >= qz.wrong.length - 1) : (qz.idx >= qz.qs.length - 1 && !qz.wrong.length);
    sessSave();
    const show = function () {
      judgeSound(ok);
      qProgress();
      if (due) { refund(QZ_REFUND_AMOUNT); sessSave(); }
      qBtn(qz.canRetry ? '다시 풀기' : last ? '완료' : '다음', true, ok);
    };
    if (!delay) { show(); return; }
    const tok = qz;
    setTimeout(function () { if (qz === tok && !qz.quit) show(); }, delay);
  }
  // 환급 — 대기분에 쌓고 화면 숫자만 바로 올림. 퀴즈 1회 환급 합계는 문제 수 − 순소모를 넘지 않음
  function refund(n) {
    if (isPro()) return;
    const room = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const amt = Math.min(n, room);
    if (amt <= 0 || typeof addPendingRefund !== 'function') return;
    if (addPendingRefund(amt)) { qz.refunded += amt; peakPop('+' + amt); }
  }
  function next() {
    if (qz.short) { render(); return; }   // 피크 부족 → 이어서 풀기
    if (!qz.judged) { if (submitFn) submitFn(); return; }   // 제출하기
    if (qz.canRetry) { render(); return; }   // 오답풀이에서 또 틀림 — 같은 문제를 다시
    if (qz.phase === 'main') {
      if (qz.idx < qz.qs.length - 1) { qz.idx++; render(); return; }
      if (qz.wrong.length) { showIntro(); return; }
    } else if (qz.rvPos < qz.wrong.length - 1) { qz.rvPos++; render(); return; }
    showClear();
  }

  // ── 오버레이 — 리하모니 화성학과 같은 시스템: 오답풀이 안내 / 완주(트로피·칭찬·색종이) ──
  const SEQ_GAP_MS = 150, INTRO_GAP_MS = 900, INTRO_HOLD_MS = 2000;
  let seqRun = null, ovTok = 0;
  function seqStop() { if (seqRun) { seqRun.stopped = true; clearTimeout(seqRun.timer); } seqRun = null; }
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
        if (i >= els.length) arm(function () { if (onDone) onDone(); }, g + hold);
        else arm(nextEl, g);
      };
      el.addEventListener('animationend', function h(e) { if (e.target !== el) return; el.removeEventListener('animationend', h); after(); });
      el.classList.add('is-in');
      if (getComputedStyle(el).animationName === 'none') after();
    };
    nextEl();
  }
  function seqSkip() {   // 터치 스킵(가이드 §8-17)
    const seq = seqRun;
    if (!seq || seq.stopped) return;
    if (seq.el) { seq.el.getAnimations().forEach(function (a) { try { a.finish(); } catch (e) {} }); return; }
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
  function showIntro() {
    stopSound();
    const remain = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const usePeak = !isPro() && remain > 0;
    document.querySelectorAll('#combo-v2-intro [data-peak]').forEach(function (el) { el.hidden = !usePeak; });
    $('combo-v2-intro-title-pro').hidden = usePeak;
    qz.phase = 'review'; qz.rvPos = 0; qz.judged = false; qz.canRetry = false;
    sessSave();
    const scene = overlayShow('combo-v2-intro');
    seqPlay(scene, INTRO_HOLD_MS, function () { render(); overlayFade(); }, INTRO_GAP_MS);
  }
  function showClear() {
    qz.over = true;
    starsSet(qz.star);
    sessClear();
    refund(qz.qs.length);   // 남은 몫이 있으면 한꺼번에
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();
    $('combo-v2-clear-title').textContent = '완주!';
    $('combo-v2-clear-level').textContent = D.clearName + ' · 퀴즈 ' + qz.star;
    $('combo-v2-clear-refund').hidden = isPro() || !qz.refunded;
    $('combo-v2-clear-praise').textContent = qz.wrong.length ? '틀린 문제도 끝까지 풀어냈어요. 정말 잘했어요!' : '한 문제도 안 틀렸어요. 완벽해요!';
    const scene = overlayShow('combo-v2-clear');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
    seqPlay(scene, 0, null);
    confetti();
    window.JourneyLesson.setQuizBack(window.JourneyLesson.goHome);
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

  function start(def) {
    D = def;
    const J = window.JourneyLesson;
    const star = window.JourneyLesson.quizStar(starsGet(D.nodeId));   // 순차: 다음 별(별 3 이후엔 별 3 반복)
    qz = { star: star, qs: D.make(star), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false };
    const saved = sessLoad(D.nodeId);
    if (saved) SESS_FIELDS.forEach(function (k) { if (saved[k] !== undefined) qz[k] = saved[k]; });
    $('jq-track').hidden = false;
    $('jq-fill').style.width = '0%';
    $('jq-btn').onclick = function () { if (qz.over) return; next(); };
    $('combo-v2-clear-btn').onclick = function () { if (typeof _playConfirmSfx === 'function') _playConfirmSfx(); J.goHome(); };
    $('combo-v2-overlay').onclick = function (e) { if (!e.target.closest('button')) seqSkip(); };
    J.setQuizBack(function () {
      if (qz.phase === 'review') { quit(); J.goHome(); return; }   // 오답풀이 중엔 낸 피크가 없어 확인 없이
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;
      showLeavePracticeModal(function () { quit(); J.goHome(); }, { title: '퀴즈를 그만두시겠어요?', desc: '지금 나가면 퀴즈를<br>처음부터 다시 풀어야 해요.' });
    });
    if (!bound) {
      bound = true;
      window.addEventListener('pagehide', pause);
      document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    }
    if (saved) {
      qProgress();
      if (qz.judged) next(); else render();
    } else render();
    $('jq-view').classList.remove('quiz-view--right');
  }
  // 직접 그만두기 — 저장분을 지우고 정리. 울리는 소리 하드컷
  function quit() {
    if (qz) qz.quit = true;
    sessClear();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    overlayAbort();
    stopSound();
  }
  // 백그라운드·새로고침·앱 종료 — 소리만 끊고 상태는 저장(돌아오면 이어서)
  function pause() {
    if (!qz || qz.over) return;
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();
  }

  window.JQuizKit = {
    start: start, canResume: function (id) { return !!sessLoad(id); },
    types: types,
    board: { html: boardHtml, note: noteEl, pos: boardPos, x: fbX, y: fbY, quizW: quizW, fit: fit, OPEN_MIDI: OPEN_MIDI },
    judgeSound: judgeSound, passSound: passSound, rnd: rnd, shuffle: shuffle,
    // 문제 목록을 유형이 연달아 같지 않게 섞음(D21 spread와 같은 방식 — 남은 수가 가장 많은 유형 중 바로 앞과 다른 것을 차례로) → 엔진 noRepeat
    spread: function (groups) {
      const left = groups.map(function (g) { return shuffle(g.slice()); }), out = [];
      let prev = -1;
      for (;;) {
        let best = -1;
        left.forEach(function (g, i) { if (g.length && i !== prev && (best < 0 || g.length > left[best].length)) best = i; });
        if (best < 0) best = left.findIndex(function (g) { return g.length; });
        if (best < 0) break;
        out.push(left[best].pop());
        prev = best;
      }
      return window.JourneyLesson.noRepeat(out);
    },
  };
})();
