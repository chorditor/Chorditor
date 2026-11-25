// ───────────────────────────────────────────────────────────
// 여정 노드: TAB악보와 크로메틱 (솔로연주 비기너 D3 — 2026-11-23, docs/solo-beginner-curriculum.md)
//   피크 잡는 법 → 타브악보 읽기(가로줄 6개 = 6줄, 맨 위 1번줄, 숫자 = 프렛, 0 = 개방현) → 5~8프렛 크로메틱(손가락 1·2·3·4) 한 가지 — 1번줄부터 6번줄까지 줄마다 5·6·7·8 → 천천히 같이 치기(반복)
//   무대 층 2개: 피크 쥔 손 그림(#n3s-hand) / 위 타브 + 아래 지판 5~8프렛 4칸(#n3s-main). 타브 = 공용 tab-render.js, 지판·퀴즈 엔진 = 공용 journey-quiz-kit.js
//   단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석, 모든 지연은 J.wait/J.later(엔진 타이머)만
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson, K = window.JQuizKit, B = K.board;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const OPEN_MIDI = B.OPEN_MIDI;
  function midiOf(s, f) { return OPEN_MIDI[s - 1] + f; }
  function none() { return Promise.resolve(); }
  // 피킹 기호 — 악보 표준: 다운 = ㄇ(위가 막힌 사각), 업 = V(노드9에서 옮겨 옴, 2026-11-24)
  const ICON_D = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5h14v15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><rect x="5" y="4" width="14" height="4" fill="currentColor"/></svg>';
  const ICON_U = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l7 16 7-16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }

  // ── 악보 — 크로메틱 5~8프렛(손가락 = 프렛 − 4). 크로메틱(음 여럿) = 8분음표 + 박마다 들보 2개씩, 음 하나(0·퀴즈 한 음) = 4분음표(사용자 지정 2026-11-24) ──
  function meas(s, frets) { const d = frets.length > 1 ? 1 : 2; return { notes: frets.map(function (f) { return { s: s, f: f }; }), marks: [], rhythm: frets.map(function (f, i) { return { n: i, d: d, p: i % 2 ? 'U' : 'D' }; }) }; }   // p = 들보 아래 피킹 기호(음표 길이와 관계없이 다운·업 번갈아 — 얼터네이트 피킹, 사용자 지정 2026-11-24)
  // 크로메틱은 한 가지만 — 1번줄부터 줄마다 5·6·7·8, 거꾸로 돌아오지 않음(사용자 지정 2026-11-24)
  const TABS = {
    one: [meas(1, [5, 6, 7, 8])],   // 크로메틱 설명은 1번줄로(사용자 지정 2026-11-24)
    open: [meas(1, [0])],
    // 4/4박자 — 8분음표 8개 = 한 마디라 두 줄씩 한 마디(1·2번줄 / 3·4번줄 / 5·6번줄, 사용자 지정 2026-11-24)
    run: [[1, 2], [3, 4], [5, 6]].map(function (pr) { const a = meas(pr[0], [5, 6, 7, 8]), b = meas(pr[1], [5, 6, 7, 8]); return { notes: a.notes.concat(b.notes), marks: [], rhythm: a.rhythm.concat(b.rhythm.map(function (r) { return { n: r.n + 4, d: r.d, p: r.p }; })) }; })
      // 4마디 = 3마디 마지막 음(6번줄 8프렛)을 붙임줄로 온음표만큼 끌기 — 새로 치지 않음(사용자 지정 2026-11-24)
      .concat([{ notes: [{ s: 6, f: 8, tie: true }], marks: [], rhythm: [{ n: 0, d: 8 }] }]),
  };
  // 시연·반복 순서 — { s, f, m(마디), i(마디 안 번호), d(8분음표 수), tie(앞 음에서 이어짐 = 새로 치지 않음) }
  function seqOf(key) {
    const out = [];
    TABS[key].forEach(function (ms, m) { ms.notes.forEach(function (n, i) { const r = ms.rhythm.find(function (q) { return q.n === i; }); out.push({ s: n.s, f: n.f, m: m, i: i, d: r ? r.d : 1, tie: !!n.tie }); }); });
    return out;
  }

  // ── 무대 ──
  // 지판 = 1~12프렛을 그리고 쓰는 5~8프렛이 가운데(1~12의 가운데 = 4·8프렛 경계 사이 = 5~8 한가운데). 무대 폭을 넘는 좌우는 잘림(.n3s-fbw) — 누르기는 5~8프렛만(사용자 지정 2026-11-24)
  const WIN = { lo: 1, cols: 12, minF: 5, maxF: 8 };
  let lecW = 320, curTab = null;
  function size() { return { w: Math.min(lecW, 340) }; }   // 타브 폭
  function fbSize() { return B.fit(WIN, Infinity, 170); }   // 지판 = 스케일 훈련과 같은 칸 비율(폭만 늘려 점이 작아지지 않게), 넥 높이 170px(사용자 지정 2026-11-24)
  function build(stage) {
    stage.classList.add('is-jny');
    lecW = stage.clientWidth || (window.innerWidth - 32);
    const sz = fbSize();
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer jl-rise n3s-hand" id="n3s-hand"><img src="image/guitar_pick_hand_line_art_sq.svg" alt=""></div>' +
      '<div class="jl-layer jl-rise n3s-sym" id="n3s-sym"><div class="n3s-si" id="n3s-d">' + ICON_D + '<span>다운 피킹</span></div><div class="n3s-si" id="n3s-u">' + ICON_U + '<span>업 피킹</span></div></div>' +
      '<div class="jl-layer n3s-main" id="n3s-main"><div class="n3s-tab" id="n3s-tab"></div>' +
      '<div class="n3s-fbw" id="n3s-fbw" style="width:' + size().w + 'px">' + B.html('n3s-neck', WIN, sz.w, sz.h) + '</div></div></div>';
    $('n3s-neck').addEventListener('click', neckTap);
  }
  function neck() { return $('n3s-neck'); }
  // nums = 줄 번호 1~6(줄 번호 설명 칸에서만), 그 밖은 TAB 기호(사용자 지정 2026-11-24)
  //  TAB·줄 번호를 둘 다 그려 두고(headBoth) 보이는 쪽만 바꿈 — 처음엔 TAB, '가로줄 6개' 문구에서 6번줄부터 줄 번호가 차례로 올라오고, 다음 칸에서 천천히 TAB로 돌아감(사용자 지정 2026-11-24)
  //  한 화면에 2마디씩(사용자 지정 2026-11-24) — page = 몇 번째 2마디 묶음. 연주가 3마디로 넘어가면 3·4마디로 바꿔 그림
  const PAGE = 2;
  let curPage = 0, curNums = false;
  function setTab(key, nums, page) {
    curTab = key; curNums = !!nums; curPage = page || 0;
    $('n3s-tab').innerHTML = TabRender.svg(TABS[key].slice(curPage * PAGE, curPage * PAGE + PAGE), { width: size().w, headBoth: true });
    $('n3s-tab').classList.toggle('is-nums', curNums);
    if (curNums) setCls(tq('.tab-sn'), 'is-up', true);
  }
  // TAB → 줄 번호: TAB이 사라지고 6번줄부터 1번줄까지 차례로 올라옴
  function numsIn() {
    curNums = true;
    $('n3s-tab').classList.add('is-nums');
    return wait(200).then(function () { return fx(tq('.tab-sn').reverse(), 'is-up', true, 150); });
  }
  // 줄 번호 → TAB: 둘이 천천히 겹쳐 바뀜(CSS 1.2초)
  function numsOut() {
    curNums = false;
    $('n3s-tab').classList.remove('is-nums');
    setCls(tq('.tab-sn'), 'is-up', false);
  }
  function pageFor(m) { const pg = Math.floor(m / PAGE); if (pg !== curPage) setTab(curTab, curNums, pg); }
  function tq(sel) { return Array.prototype.slice.call(document.querySelectorAll('#n3s-tab ' + sel)); }
  // 음 하나 = 숫자 + 그 아래 피킹 기호(같이 파랑·초록 — 리듬 칸 번호 = 음 번호)
  function tabNote(m, i) { const lm = m - curPage * PAGE; return tq('.tab-n[data-m="' + lm + '"][data-i="' + i + '"], .tab-pick[data-m="' + lm + '"][data-k="' + i + '"]'); }
  function tabOff() { tq('.tab-n.is-on, .tab-n.is-ok, .tab-pick.is-on, .tab-pick.is-ok').forEach(function (el) { el.classList.remove('is-on', 'is-ok'); }); }
  // 다운·업 기호 하나를 파랑으로 — 소리 없음(다운·업은 소리로 구분되지 않음 — 사용자 지정 2026-11-24)
  function symOn(id) {
    setCls([$('n3s-d'), $('n3s-u')], 'is-on', false);
    $(id).classList.add('is-on');
    return wait(900);
  }
  function strFocus(s, on) {
    tq('.tab-line[data-s="' + s + '"], .tab-sn[data-s="' + s + '"]').forEach(function (el) { el.classList.toggle('is-on', on); });
    const str = neck().querySelector('.fb-string[data-s="' + s + '"]');
    if (str) str.classList.toggle('is-focus', on);
  }
  function allFocusOff() { for (let s = 1; s <= 6; s++) strFocus(s, false); }
  function clearDots() { Array.prototype.forEach.call(neck().querySelectorAll('.fb-note'), function (el) { el.remove(); }); }
  function dot(s, f, label, extra) { const el = B.note(WIN, s, f, label, extra); neck().appendChild(el); return el; }
  function layerOn() { $('n3s-main').classList.add('is-on'); }
  // 칸 시작 화면 — 반복·따라 하기를 멈추고 악보(key) + 지판을 띄운 상태로
  function base(key, nums) {
    loopGen++; freeOn = false; seqSt = null;
    clearDots(); allFocusOff();
    setTab(key, nums); tabOff();
    layerOn();
    setCls([$('n3s-tab'), $('n3s-fbw')], 'is-in', true);
  }

  // ── 시연 — 음마다 소리(오디오 시계) + 같은 시각에 악보 숫자 파랑·지판 점(손가락 번호) ──
  //  stepMs = 8분음표 하나. 붙임줄로 이어지는 음(tie)은 새로 치지 않고 앞 음을 그만큼 더 울림(악보 숫자만 파랑)
  function playSeq(list, stepMs) {
    const t0 = J.audioT0(), lead = J.leadMs();
    let t = 0, tEnd = 0;
    list.forEach(function (x, k) {
      const nx = list[k + 1], tied = nx && nx.tie, last = k === list.length - 1 || (tied && k === list.length - 2);
      if (!x.tie) J.note(midiOf(x.s, x.f), t0 + t / 1000, tied ? (x.d + nx.d) * stepMs / 1000 : (last ? 1.2 : x.d * stepMs / 1000), last ? 0.8 : 0.18);
      later(function () { pageFor(x.m); tabOff(); setCls(tabNote(x.m, x.i), 'is-on', true); if (!x.tie) { clearDots(); dot(x.s, x.f, x.f > 0 ? x.f - 4 : '', 'n2-pop'); } }, lead + t);
      tEnd = t + (x.tie ? x.d * stepMs : 1100);
      t += x.d * stepMs;
    });
    return wait(lead + tEnd).then(function () { tabOff(); clearDots(); });
  }

  // ── 따라 하기(참여형, §4-8) — need 순서대로 누를 때까지 '다음' 잠금. 맞힌 음 = 악보 숫자 파랑 + 점, 다 맞히면 초록 + 정답음. 틀리면 그 자리 음 + 연한 오답 점, 맞힌 음은 남기고 이어서(벌 없음) ──
  let seqSt = null, freeOn = false;
  function waitSeq(need) {
    return new Promise(function (res) {
      if (J.skipping()) { res(); return; }
      seqSt = { need: need, i: 0, res: res };
      (function poll() { later(function () { if (!seqSt) return; if (J.skipping()) { seqSt = null; res(); } else poll(); }, 200); })();
    });
  }
  function missGhost(s, f) {
    const el = dot(s, f, '', 'n15-miss');
    const a = J.anim(el, [{ opacity: 0.4 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    a.onfinish = a.oncancel = function () { el.remove(); };
  }
  function neckTap(e) {
    const p = B.pos(neck(), WIN, e);
    if (!p || (!seqSt && !freeOn)) return;
    const s = p[0], f = p[1];
    // 따라 하기 칸은 서스테인 없이 짧게(0.4초 + 짧은 꼬리 — 사용자 지정 2026-11-24), 반복 칸 눌러 보기는 그대로
    if (seqSt) J.note(midiOf(s, f), J.audioT0(), 0.4, 0.12); else J.note(midiOf(s, f), J.audioT0(), 1.2, 0.5);
    if (freeOn) { const el = dot(s, f, f - 4, 'n2-pop'); later(function () { el.remove(); }, 400); return; }   // 반복 칸: 눌러 보기만
    const st = seqSt, want = st.need[st.i];
    if (want.s === s && want.f === f) {
      setCls(tabNote(want.m, want.i), 'is-on', true);
      dot(s, f, f - 4, 'n2-pop');
      if (++st.i >= st.need.length) {
        seqSt = null;
        const d = K.passSound();   // 정답음 — 누른 음이 먼저, 약간 뒤에 벨(다음으로 넘어갈 수 있다는 신호)
        tabOff();
        st.need.forEach(function (x) { setCls(tabNote(x.m, x.i), 'is-ok', true); });
        later(st.res, Math.max(700, d + 300));
      }
    } else {
      missGhost(s, f);   // 맞힌 음(악보 파랑·점)은 그대로 두고 그 자리에서 다시 — 처음부터로 돌리지 않음(사용자 지정 2026-11-24)
    }
  }

  // ── 같이 치기(반복) — 8분음표 하나 0.86초로 4마디(1번줄 → 6번줄 24음 + 붙임줄 온음표)를 계속 반복. 2마디마다 악보 화면 전환. 칸이 바뀌면 loopGen으로 멈춤(엔진이 예약도 지움) ──
  const LOOP_MS = Math.round(60000 / 70);
  let loopGen = 0;
  function loopStart() {
    if (J.skipping()) return;
    const gen = ++loopGen, run = seqOf('run');
    freeOn = true;
    let k = 0;
    (function tick() {
      if (gen !== loopGen) return;
      const x = run[k % run.length], nx = run[(k + 1) % run.length];
      if (!x.tie) J.note(midiOf(x.s, x.f), J.audioT0(), (x.d + (nx.tie ? nx.d : 0)) * LOOP_MS / 1000, 0.18);
      later(function () {
        if (gen !== loopGen) return;
        pageFor(x.m); tabOff(); setCls(tabNote(x.m, x.i), 'is-on', true);
        if (!x.tie) { Array.prototype.forEach.call(neck().querySelectorAll('.n3s-play'), function (el) { el.remove(); }); dot(x.s, x.f, x.f - 4, 'n3s-play'); }
      }, J.leadMs());
      k++;
      later(tick, x.d * LOOP_MS);
    })();
  }
  function lecCut() { loopGen++; freeOn = false; seqSt = null; }

  // ═══════════════════════════ 강의 ═══════════════════════════
  //  강의 최종 목적: 타브악보를 읽고(위아래 방향·숫자·0), 5~8프렛 크로메틱을 손가락 1·2·3·4로 1번줄부터 6번줄까지 줄마다 5·6·7·8(퀴즈는 D2 음이름 복습 — 2026-11-24)
  const steps = [
    // P1 도입·피크
    // 0 핵심(새 내용): 오늘 배울 것. 도입이라 문구만
    J.chainSteps([
      { text: '이번 시간에는 ' + em('타브악보') + ' 읽는 법과\n첫 연습인 ' + em('크로메틱') + '을 배워볼게요!', run: none },
    ]),
    // 1 핵심(새 내용): 솔로 = 피크로 한 음씩, 손하트 모양으로 쥐고 뾰족한 부분으로. 빈 무대에 손 그림이 밑에서 올라온 뒤 문구. 끝 화면 = 피크 쥔 손
    Object.assign(J.chainSteps([
      { text: '', gap: 1200, scene: 'n3s-hand', run: function () { return fx([$('n3s-hand')], 'is-on', true); } },
      { text: '솔로연주는 ' + em('피크') + '로 한 음씩\n줄을 튕겨서 연주해요', run: none },
      { text: '피크는 ' + em('손하트') + ' 모양으로 잡고\n뾰족한 부분으로 쳐요', run: none },
    ]), { ms: 7320 }),   // 측정값
    // 2 핵심(새 내용): 힘 빼기 — 툭 건드리면 떨어질 정도로. 끝 화면 = 피크 쥔 손
    { text: '피크는 ' + em('툭 건드리면 떨어질 정도로') + '\n가볍게 잡아주세요', scene: 'n3s-hand', run: function () { return fx([$('n3s-hand')], 'is-on', true); } },
    // 3 핵심(새 내용, 노드9에서 옮겨 옴): 다운 피킹·업 피킹 + 악보 기호(ㄇ·V). 빈 무대에 기호 둘이 올라온 뒤 문구. 끝 화면 = 두 기호
    Object.assign(J.chainSteps([
      { text: '', gap: 1200, scene: 'n3s-sym', run: function () { setCls([$('n3s-d'), $('n3s-u')], 'is-on', false); return fx([$('n3s-sym')], 'is-on', true); } },
      { text: '피크로 줄을 위에서 아래로 치면 ' + em('다운 피킹') + ',\n아래에서 위로 치면 ' + em('업 피킹') + '이에요', run: function () {
        return symOn('n3s-d').then(function () { return symOn('n3s-u'); }).then(function () { setCls([$('n3s-d'), $('n3s-u')], 'is-on', false); });
      } },
      { text: '악보에서는 다운을 ' + em('ㄇ') + ',\n업을 ' + em('V') + ' 모양으로 표시해요', run: none },
    ]), { ms: 8760 }),

    // P2 타브악보
    // 4 핵심(새 내용): 가로줄 6개 = 6줄, 맨 위 = 1번줄(위아래 방향이 핵심). 빈 무대에 악보(맨 앞 TAB) → 지판이 차례로 올라온 뒤 문구.
    //   '가로줄 6개' 문구와 함께 TAB이 사라지고 줄 번호가 6번줄부터 차례로 올라옴. 끝 화면 = 악보(줄 번호) + 지판, 1번줄 파랑
    Object.assign(J.chainSteps([
      { text: '', gap: 1200, scene: 'n3s-main', enter: function () { base('one'); setCls([$('n3s-tab'), $('n3s-fbw')], 'is-in', false); }, run: function () {
        layerOn();
        return fx([$('n3s-tab')], 'is-in', true).then(function () { return fx([$('n3s-fbw')], 'is-in', true); });
      } },
      { text: '먼저 ' + em('타브악보') + ' 보는 법을 알아볼게요', run: none },
      { text: '가로줄 6개는 기타의 ' + em('6줄') + '이에요', run: numsIn },
      { text: em('맨 위') + '가 가장 얇은 ' + em('1번줄') + '이에요', run: function () {
        strFocus(1, true);
        J.note(64, J.audioT0(), 1.2, 0.6);
        return wait(J.leadMs() + 1200);
      } },
    ]), { ms: 9700 }),
    // 5 핵심(새 내용): 줄 위 숫자 = 누를 프렛 — 1번줄 5프렛. 줄 번호는 앞 칸에서 설명을 마쳤으니 천천히 TAB로 돌아감. 끝 화면 = TAB + 숫자 5 파랑 + 지판 점
    { text: '줄 위의 숫자는 ' + em('누를 프렛') + '이에요\n1번줄 5프렛을 치라는 뜻이죠', scene: 'n3s-main', enter: function () { base('one', true); }, ms: 2600, run: function () {
      numsOut();
      strFocus(1, true);
      J.note(midiOf(1, 5), J.audioT0(), 1.4, 0.6);
      later(function () { setCls(tabNote(0, 0), 'is-on', true); dot(1, 5, '', 'n2-pop'); }, J.leadMs());
      return wait(J.leadMs() + 1500);
    } },
    // 6 핵심(새 내용): 0 = 개방현 — 아무 데도 누르지 않음. 끝 화면 = 0 파랑 + 1번줄 파랑(점 없음)
    { text: '숫자 ' + em('0') + '은 아무 데도 누르지 않은\n' + em('개방현') + '이에요', scene: 'n3s-main', enter: function () { base('open'); }, ms: 2600, run: function () {
      J.note(midiOf(1, 0), J.audioT0(), 1.4, 0.6);
      later(function () { setCls(tabNote(0, 0), 'is-on', true); strFocus(1, true); }, J.leadMs());
      return wait(J.leadMs() + 1500);
    } },

    // P3 크로메틱
    // 7 핵심(새 내용): 크로메틱 = 한 칸씩 빠짐없이 차례로, 1번줄 5~8프렛을 손가락 1·2·3·4로. 끝 화면 = 1번줄 점 넷(손가락 번호)
    Object.assign(J.chainSteps([
      { text: em('크로메틱') + '은 한 칸씩 빠짐없이\n차례로 치는 연습이에요', scene: 'n3s-main', enter: function () { base('one'); }, run: function () { return playSeq(seqOf('one'), 500); } },
      { text: '5프렛부터 8프렛까지\n' + em('손가락 1, 2, 3, 4') + '를 하나씩 써요', run: function () {
        [5, 6, 7, 8].forEach(function (f, k) { later(function () { dot(1, f, f - 4, 'n2-pop'); }, k * 200); });
        return wait(1000);
      } },
    ]), { ms: 8000 }),
    // 8 핵심(새 내용, 노드9에서 옮겨 옴): 다운·업을 번갈아 = 얼터네이트 피킹, 손목을 작게. 악보 아래 ㄇ V가 치는 음과 같이 파랑. 끝 화면 = 1번줄 악보
    Object.assign(J.chainSteps([
      { text: '다운과 업을 ' + em('번갈아') + ' 치는 것을\n' + em('얼터네이트 피킹') + '이라고 해요', scene: 'n3s-main', enter: function () { base('one'); }, run: function () { return playSeq(seqOf('one'), 500); } },
      { text: '손목을 작게 움직이면\n빠르고 고르게 칠 수 있어요', run: none },
    ]), { ms: 6220 }),
    // 9 참여형(lock): 1번줄 5·6·7·8을 차례로 직접. 끝 화면 = 악보 숫자 초록
    Object.assign(J.chainSteps([
      { text: '직접 해볼까요? 1번줄 ' + em('5, 6, 7, 8프렛') + '을\n차례로 눌러주세요!', scene: 'n3s-main', enter: function () { base('one'); }, gap: 800, run: function () { return waitSeq(seqOf('one')); } },
      { text: '잘했어요!', gap: 1800, run: none },
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }),
    // 10 핵심(새 내용): 1번줄 → 6번줄로 줄을 바꿔 가며 줄마다 5·6·7·8(악보 6마디). 끝 화면 = 6마디 악보
    { text: '이걸 ' + em('1번줄부터 6번줄까지') + '\n줄을 바꿔가며 반복해요', scene: 'n3s-main', enter: function () { base('run'); }, ms: 0, run: function () { return playSeq(seqOf('run'), 300); } },

    // P4 연습·마무리
    // 11 핵심(반복 연습, §4-23): 70bpm 4분음표로 1번줄 → 6번줄을 계속 — 원하는 만큼. 지판을 눌러 보면 그 음(같이 치기). 끝 화면 = 재생 중인 악보·지판
    J.chainSteps([
      { text: '이제 ' + em('얼터네이트 피킹') + '으로\n천천히 같이 쳐볼게요!', scene: 'n3s-main', enter: function () { base('run'); }, run: function () { loopStart(); return none(); } },
      { text: '악보 아래 ' + em('다운, 업') + '과\n' + em('손가락 번호') + '를 꼭 지켜주세요', run: none },   // 얼터네이트 피킹으로 연습(사용자 지정 2026-11-24) — 치는 음의 ㄇ·V가 같이 파랑
      { text: '원하는 만큼 연습하고\n넘어가 주세요!', run: none },
    ]),
    // 12 핵심: 다음 할 일 — 매일 손풀기로 + 다른 위치에서도 + 퀴즈 안내(D2 음이름 퀴즈 복습, §4-12) — 문구 사용자 지정 2026-11-24
    J.chainSteps([
      { text: '크로메틱은 연습 전에 ' + em('손풀기') + '로\n매일 하기 좋은 연습이에요!', scene: 'n3s-main', enter: function () { base('run'); }, run: none },
      { text: '이번 시간엔 5프렛에서 시작했지만\n' + em('지판의 다양한 위치') + '에서 연습해보세요', run: none },
      { text: '퀴즈는 지난 시간의 퀴즈를 ' + em('복습') + '할 거예요!\n' + em('음이름') + '과 ' + em('계이름') + '을 더욱 익혀주세요!', run: none },
    ]),
  ];
  const groups = [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9, 10], [11, 12]];
  steps[10].ms = 9820;    // 측정값(scripts/journey-lesson-timing.js) — 24음 × 0.3초 + 붙임줄 온음표 2.4초

  // ═══════════════════════════ 퀴즈 ═══════════════════════════
  //  지난 시간(D2 음이름) 퀴즈 복습(사용자 지정 2026-11-24) — 유형·화면·출제 방식은 note-names.js 퀴즈와 같음(엔진만 공용 키트)
  //  ① name — 음이름 ↔ 계이름(12음, 검은 건반은 #·b 섞어서). 보기 카드, 누르는 즉시 채점
  //  ② find — 0~3프렛 지판에서 그 음(자연음 7개)이 있는 자리를 전부 골라 제출. 지판 = D2 퀴즈 지판(개방현 빈 동그라미 + 왼쪽 튜닝 음, 1~3프렛 고스트, 4프렛 칸 흐림)
  //  ①:② = 반반, 문제 수 10/15/15(복습이라 — 사용자 지정 2026-11-24)
  const NODE_ID = 'tab-chromatic';
  K.types(NODE_ID, ['name', 'find']);   // 2026-11-24 전 유형(tab·finger·seq)으로 저장된 이어 풀기는 버림
  const QZ_N = { 1: 10, 2: 15, 3: 15 };
  const PC_NAT = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
  const SYL = { C: '도', D: '레', E: '미', F: '파', G: '솔', A: '라', B: '시' };
  function isBlackPc(pc) { return PC_NAT[pc] === undefined; }
  function spell(pc, acc) { return !isBlackPc(pc) ? PC_NAT[pc] : acc === 'b' ? PC_NAT[(pc + 1) % 12] + 'b' : PC_NAT[(pc + 11) % 12] + '#'; }
  function rndAcc() { return K.rnd(2) ? '#' : 'b'; }
  function sylOf(name) { return SYL[name[0]] + name.slice(1); }   // C# → 도#, Db → 레b
  const QZ_FRETS = 3, QZ_COLS = QZ_FRETS + 2;   // 개방현 칸 + 1~3프렛 + 흐려지는 4프렛 칸
  function make(star) {
    const n = QZ_N[star], n1 = Math.ceil(n / 2), n2 = n - n1, qs = [];
    const pcs = K.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (let k = 0; k < n1; k++) qs.push(mkName(pcs[k % 12]));
    const nats = K.shuffle([0, 2, 4, 5, 7, 9, 11]);
    for (let k = 0; k < n2; k++) qs.push(mkFind(nats[k % 7]));
    return J.noRepeat(K.shuffle(qs));
  }
  // ① 보기 4개는 서로 다른 음(같은 음의 #/b 표기가 같이 나오지 않게), 문제 음의 #/b 표기를 정답도 그대로
  function mkName(pc) {
    const toSyl = K.rnd(2) === 0;   // true = 음이름을 보고 계이름 고르기
    const set = [pc];
    while (set.length < 4) { const p = K.rnd(12); if (set.indexOf(p) < 0) set.push(p); }
    const names = set.map(function (p) { return spell(p, rndAcc()); });
    const show = function (nm) { return toSyl ? sylOf(nm) : nm; };
    return { type: 'name', toSyl: toSyl, q: toSyl ? names[0] : sylOf(names[0]), answer: show(names[0]), choices: K.shuffle(names.map(show)) };
  }
  // ② 0~3프렛에서 그 음이 있는 자리 전부가 정답
  function mkFind(pc) {
    const ans = [];
    for (let s = 1; s <= 6; s++) for (let f = 0; f <= QZ_FRETS; f++) if ((OPEN_MIDI[s - 1] + f) % 12 === pc) ans.push(s + '-' + f);
    return { type: 'find', name: PC_NAT[pc], ans: ans };
  }
  // ② 지판 — note-names.js sfbHtml(퀴즈 옵션 tune·ghost)과 같은 마크업·크기 규칙(기준 폭 360px = 7칸, 넥 높이 = (360/2.3 − 2.25) × 6/5 — 스케일 훈련 비율)
  const SFB_REF_W = 360, SFB_REF_COLS = 7, SFB_MAX_W = 520, SFB_NECK_H = (SFB_REF_W / 2.3 - 2.25) * 6 / 5;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5], OPEN_NAME = ['E', 'B', 'G', 'D', 'A', 'E'];
  function sfbX(f) { return (f + 0.5) / QZ_COLS * 100; }
  function sfbY(s) { return (s - 0.5) / 6 * 100; }
  function sfbHtml(id, availW) {
    const scale = Math.min(availW || SFB_REF_W, SFB_MAX_W) / SFB_REF_W, colW = SFB_REF_W * scale / SFB_REF_COLS, nut = 100 / QZ_COLS;
    let h = '';
    for (let s = 1; s <= 6; s++) h += '<div class="fb-string" data-s="' + s + '" style="top:' + sfbY(s) + '%;height:' + STRING_THICKNESS[s - 1] + 'px;left:calc(' + nut + '% + 2 * var(--fbu))"></div>';
    h += '<div class="fb-nut-line" style="left:' + nut + '%"></div>';
    for (let c = 2; c < QZ_COLS; c++) h += '<div class="fb-fret-line" style="left:' + (c / QZ_COLS * 100) + '%"></div>';
    h += '<div class="fb-dot" style="left:' + sfbX(3) + '%;top:50%"></div>';
    for (let s = 1; s <= 6; s++) {
      h += '<div class="fb-open-hint" data-s="' + s + '" style="left:' + sfbX(0) + '%;top:' + sfbY(s) + '%"></div>';
      h += '<span class="n2-tune" style="left:' + sfbX(0) + '%;top:' + sfbY(s) + '%">' + OPEN_NAME[s - 1] + '</span>';
      for (let f = 1; f < QZ_COLS - 1; f++) h += '<div class="fb-note fb-note--ghost" style="left:' + sfbX(f) + '%;top:' + sfbY(s) + '%"></div>';
    }
    return '<div class="fb-full-wrapper n2-sfb n2-fbfade degrees-on" style="width:' + (colW * QZ_COLS) + 'px;--fbu:' + (SFB_NECK_H / 160 * scale) + 'px;--fbs:' + scale + ';--n2-fade:' + colW + 'px">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums"><div class="fb-fret-num" style="left:' + sfbX(3) + '%">3</div></div></div>';
  }
  function sfbNote(s, f, cls) {
    const el = document.createElement('div');
    el.className = 'fb-note ' + cls;   // 개방현 자리도 같은 점(D2·스케일 테스트와 같음)
    el.style.left = sfbX(f) + '%';
    el.style.top = sfbY(s) + '%';
    return el;
  }
  function render(it, ui) {
    const box = ui.box;
    if (it.type === 'name') {
      box.innerHTML = ui.cardHtml(it.toSyl ? '음이름' : '계이름', it.q, '', it.toSyl ? '알맞은 계이름을 고르세요' : '알맞은 음이름을 고르세요',
        it.choices.map(function (c) { return { v: c, label: c }; }), true);
      ui.bindChoices(it.answer);
      return;
    }
    // ② 칸을 누르면 점 + 그 자리 소리, 다시 누르면 지움(개방현은 빈 동그라미를 가리고 점). 하나라도 고르면 제출하기
    box.innerHTML = ui.infoCard('표시된 곳에서', it.name + '음을', '모두 찾아주세요') + '<div class="jq-board" id="n3q-slot"></div>';
    $('n3q-slot').innerHTML = sfbHtml('n3q-neck', B.quizW());
    const nk = $('n3q-neck'), sel = {};
    const hint = function (s, show) { const h = nk.querySelector('.fb-open-hint[data-s="' + s + '"]'); if (h) h.style.display = show ? '' : 'none'; };
    nk.addEventListener('click', function (e) {
      if (ui.judged()) return;
      const r = nk.getBoundingClientRect();
      const f = Math.floor((e.clientX - r.left) / r.width * QZ_COLS), s = Math.floor((e.clientY - r.top) / r.height * 6) + 1;
      if (f < 0 || f > QZ_FRETS || s < 1 || s > 6) return;   // 흐려지는 마지막 칸은 무시
      const k = s + '-' + f;
      if (sel[k]) { sel[k].remove(); delete sel[k]; if (!f) hint(s, true); }
      else {
        J.note(midiOf(s, f), J.audioT0(), 1.4, 0.6);
        if (!f) hint(s, false);
        sel[k] = sfbNote(s, f, 'fb-note--placed');
        nk.appendChild(sel[k]);
      }
      ui.ready(Object.keys(sel).length > 0);
    });
    // 제출 — 고른 자리 = 정답 자리 전부일 때만 정답. 맞게 고름 = 초록, 잘못 고름 = 빨강, 못 찾은 자리 = 점선 원(D2·스케일 훈련 채점과 같음)
    ui.submit(function () {
      const picked = Object.keys(sel);
      const ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
      picked.forEach(function (k) { sel[k].classList.remove('fb-note--placed'); sel[k].classList.add(it.ans.indexOf(k) >= 0 ? 'fb-note--correct' : 'fb-note--wrong'); });
      it.ans.forEach(function (k) {
        if (sel[k]) return;
        const sf = k.split('-');
        if (+sf[1] === 0) hint(+sf[0], false);
        nk.appendChild(sfbNote(+sf[0], +sf[1], 'fb-note--missed'));
      });
      ui.verdict(ok);
    });
  }
  function title(it) { return it.type === 'name' ? '알맞은 답을 고르세요' : '알맞은 답을 모두 고르세요'; }
  function startQuiz() { K.start({ nodeId: NODE_ID, clearName: 'TAB악보와 크로메틱', make: make, render: render, title: title }); }

  J.register(NODE_ID, { onCut: lecCut, layers: ['n3s-hand', 'n3s-sym', 'n3s-main'], steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: steps.length - 1, quiz: startQuiz, canResume: function () { return K.canResume(NODE_ID); } });
})();
