// ───────────────────────────────────────────────────────────
// 여정 노드: 기타 지판 읽기 (코드반주 D1 · 솔로잉 D1 공통)
//   설명 단계(문구 초안) + 시연(0~5프렛 지판·개방현 소리·왼손 그림). 미니 퀴즈와 마지막 퀴즈는 설명 확정 뒤에 붙인다.
//   단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석. 모든 지연은 J.wait/J.later(엔진 타이머)만 쓴다 — 일시정지·빨리 돌리기·이탈 정리를 엔진이 맡음.
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 0~5프렛 가로 지판 — 다른 화면(스케일 훈련)과 같은 모양: 1번줄(가장 얇은 줄)이 위, 헤드(너트)가 왼쪽 ──
  // 색·비율은 스케일 훈련 지판(.fb-*)과 같음. 너트 왼쪽(개방현 자리)에 줄 번호를 둔다
  const FB_FRETS = 5;
  const FADE_MS = J.FADE_MS;
  const FB_SHIFT_MS = 500;  // 칸 3 — 가운데 있던 지판이 오른쪽으로 옮겨 가 줄번호 자리를 만드는 시간(CSS #jl-lfb .jl-fb transition과 같음)
  const FB_OPEN_W = 44;     // 개방현 자리 — 너트 왼쪽(줄 이름 '1번줄' 자리, 12px 글자 약 31px)
  const FB_FRET_W = 52;     // 프렛 한 칸 폭
  const FB_STR_GAP = 20;    // 줄 간격
  const FB_W = FB_OPEN_W + FB_FRETS * FB_FRET_W;   // 304
  const FB_H = FB_STR_GAP * 6;                     // 120 (줄은 칸 가운데: 10, 30 … 110)
  const FB_STR_W = [0.75, 1.1, 1.5, 1.9, 2.25, 2.6];   // 1→6번줄 굵기(px) = 스케일 훈련 STRING_THICKNESS × 0.75
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];          // 1→6번줄 개방현 E4 B3 G3 D3 A2 E2


  function strY(s) { return FB_STR_GAP * (s - 0.5); }            // s: 1~6
  function cellX(f) { return FB_OPEN_W + FB_FRET_W * (f - 1); }    // f번 칸의 왼쪽 끝(= f-1번 프렛선)
  function fretX(f) { return cellX(f) + FB_FRET_W / 2; }           // f번 칸 가운데
  function lineX(f) { return FB_OPEN_W + FB_FRET_W * f; }          // f번 프렛선(0 = 너트)

  // 왼손 그림(image/hand_left.png 739×788)의 손가락 끝 안쪽 자리(%) — 그림의 외곽선 꼭대기를 재서 손가락 안쪽으로 내린 값
  //  순서 = 설명 순서(검지부터, 엄지는 마지막). [번호, 손가락 이름, left%, top%]
  const HAND_LABELS = [
    ['1', '검지', 39.0, 11.4], ['2', '중지', 58.7, 8.1], ['3', '약지', 76.9, 13.6], ['4', '소지', 93.4, 34.3], ['T', '엄지', 7.5, 45.1],
  ];

  function fretboardHtml(frets) {
    const n = frets || FB_FRETS, w = FB_OPEN_W + n * FB_FRET_W;
    let h = '';
    for (let f = 1; f <= n; f++) h += '<span class="jl-fb-fret" data-f="' + f + '" style="left:' + lineX(f) + 'px"></span>';
    [3, 5, 7, 9, 12, 15].filter(function (f) { return f <= n; }).forEach(function (f) {
      (f === 12 ? [FB_STR_GAP * 2, FB_STR_GAP * 4] : [FB_H / 2]).forEach(function (y) { h += '<span class="jl-fb-dot" style="left:' + fretX(f) + 'px;top:' + y + 'px"></span>'; });
    });
    h += '<span class="jl-fb-nut" id="jl-nut" style="left:' + FB_OPEN_W + 'px"></span>';
    for (let s = 1; s <= 6; s++) {
      h += '<span class="jl-fb-str" data-s="' + s + '" style="top:' + strY(s) + 'px;height:' + FB_STR_W[s - 1] + 'px"></span>';
      h += '<span class="jl-fb-snum" data-s="' + s + '" style="top:' + strY(s) + 'px;right:' + (w - FB_OPEN_W + 6) + 'px">' + s + '번줄</span>';   // 너트 6px 왼쪽에 오른쪽 끝을 맞춤 — 번역(1st string 등)이 길어도 왼쪽으로만
    }
    h += '<span class="jl-fb-press" id="jl-press"><span class="jl-fb-press-n" id="jl-press-n"></span></span>';
    let nums = '';
    for (let f = 1; f <= n; f++) nums += '<span class="jl-fb-num" data-f="' + f + '" style="left:' + fretX(f) + 'px">' + f + '프렛</span>';
    return '<div class="jl-fb" style="width:' + w + 'px">' +
      '<div class="jl-fb-neck" id="jl-neck" style="height:' + FB_H + 'px">' + h + '</div>' +
      '<div class="jl-fb-nums">' + nums + '</div></div>';
  }
  // 왼손 그림(손가락 끝에 번호) + 오른쪽 목록('검지 : 1') — 그림의 번호와 목록 한 줄이 같은 순간에 나타남(data-i)
  // ── 0~15프렛 긴 지판(지판 점 설명용, 클래스 jl-fn-* — 0~5 지판 도구에 안 잡히게) ──
  //  0~5 지판과 똑같은 크기(너트 왼쪽 44px, 칸 52px, 줄 간격 20px)로 15프렛까지 이어 그리고, 보이는 창(#jl-fv)은 0~5 지판과 같은 304px.
  //  처음 위치(밀기 0)에서는 0~5 지판과 정확히 겹쳐서 층을 바꿔도 티가 안 남 → 옆으로 밀면서(fnSlide) 점이 있는 칸을 보여 줌.
  //  점: 3·5·7·9·15프렛 하나, 12프렛 둘(줄 2·3 사이, 4·5 사이). 아래에는 점이 있는 칸에만 숫자(사용자 지정 — '프렛'·줄 이름 없이)
  const FN_FRETS = 15;
  const FN_MARKS = [3, 5, 7, 9, 12, 15];
  const FN_LEN = FB_OPEN_W + FN_FRETS * FB_FRET_W;   // 824
  const FN_MAX_SHIFT = FN_LEN - FB_W;                // 520 — 15프렛 칸 끝이 창 오른쪽 끝에 닿는 데까지
  const FN_SLIDE_MS = 700;
  function fullNeckHtml() {
    let h = '';
    for (let f = 1; f <= FN_FRETS; f++) h += '<span class="jl-fn-fret" style="left:' + lineX(f) + 'px"></span>';
    FN_MARKS.forEach(function (f) {
      const ys = f === 12 ? [FB_STR_GAP * 2, FB_STR_GAP * 4] : [FB_H / 2];
      ys.forEach(function (y) { h += '<span class="jl-fn-dot" data-f="' + f + '" style="left:' + fretX(f) + 'px;top:' + y + 'px"></span>'; });
    });
    h += '<span class="jl-fn-nut" style="left:' + FB_OPEN_W + 'px"></span>';
    for (let s = 1; s <= 6; s++) h += '<span class="jl-fn-str" style="top:' + strY(s) + 'px;height:' + FB_STR_W[s - 1] + 'px"></span>';
    let nums = '';
    FN_MARKS.forEach(function (f) { nums += '<span class="jl-fn-num" data-f="' + f + '" style="left:' + fretX(f) + 'px">' + f + '</span>'; });
    return '<div class="jl-fv" style="width:' + FB_W + 'px"><div class="jl-fb jl-fn-track" id="jl-fn-track" style="width:' + FN_LEN + 'px">' +
      '<div class="jl-fb-neck" style="height:' + FB_H + 'px">' + h + '</div>' +
      '<div class="jl-fb-nums">' + nums + '</div></div></div>';
  }
  // 긴 지판 밀기 — f번 칸이 이미 창 안에 다 보이면 그대로, 밖에 있으면 그 칸이 창 가운데 오게(양끝은 넘지 않음). f = 0이면 처음 위치로.
  //  CSS 전환(FN_SLIDE_MS) — 빨리 돌리기(.is-skip)에선 즉시. 지금 밀린 양은 fnShift에 기억(빌드 때 0)
  let fnShift = 0;
  function fnSlide(f) {
    let x = 0;
    if (f) {
      const l = fretX(f) - FB_FRET_W / 2 - fnShift, r = fretX(f) + FB_FRET_W / 2 - fnShift;
      x = (l >= 0 && r <= FB_W) ? fnShift : Math.max(0, Math.min(FN_MAX_SHIFT, fretX(f) - FB_W / 2));
    }
    if (x === fnShift) return wait(0);
    fnShift = x;
    $('jl-fn-track').style.transform = 'translateX(' + (-x) + 'px)';
    return wait(FN_SLIDE_MS);
  }
  // 겹쳐 놓은 두 지판 층을 전환 없이 즉시 맞바꿈(두 층이 같은 모습일 때 — 서서히 바꾸면 겹치는 동안 줄이 옅어 보임)
  function swapNow(offEl, onEl) {
    [offEl, onEl].forEach(function (el) { el.style.transition = 'none'; });
    offEl.classList.remove('is-on');
    onEl.classList.add('is-on');
    void onEl.offsetWidth;
    [offEl, onEl].forEach(function (el) { el.style.transition = ''; });
  }

  function handHtml() {
    return '<div class="jl-handwrap"><div class="jl-hand"><img src="image/hand_left.png" alt="" draggable="false"><span class="jl-hand-lr">L</span>' +   // 그림 아래 'L'(왼손) — 그림 안에 있어 손 그림과 같이 움직임(사용자 지정 2026-11-20)
      HAND_LABELS.map(function (l, i) { return '<span class="jl-hand-n" data-i="' + i + '" style="left:' + l[2] + '%;top:' + l[3] + '%">' + l[0] + '</span>'; }).join('') + '</div>' +
      '<div class="jl-hand-list">' + HAND_LABELS.map(function (l, i) { return '<span class="jl-hand-li" data-i="' + i + '"><span>' + l[1] + '</span> : <b>' + l[0] + '</b></span>'; }).join('') + '</div></div>';
  }

  function build(stage) {
    stage.classList.add('is-jny');
    tapState = null;   // 다시 만들 때(이동·복원) 이전 칸의 누르기 대기를 버림
    fnShift = 0;       // 긴 지판은 새로 만들면 처음 위치
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="jl-lfb">' + fretboardHtml() + '</div>' +
      '<div class="jl-layer" id="jl-lfull">' + fullNeckHtml() + '</div>' +
      '<div class="jl-layer" id="jl-lhand">' + handHtml() + '</div>' +
      '<div class="jl-layer jl-rise" id="jl-lguitar"><div class="ms-buffer-visual"><div class="ms-buffer-icon"><img src="image/guitar.png" alt=""></div><div class="ms-buffer-shadow"></div></div></div></div>';   // 도입 마지막 문구의 기타 그림(사용자 지정 2026-11-20) — 데일리 미션 대기 화면의 둥둥 뜨는 기타(.ms-buffer-*)를 그대로 씀
    stage.querySelector('#jl-lfb .jl-fb').classList.add('jl-fb--c');   // 칸 1·2 — 줄번호가 아직 없어 지판(너트~끝)을 무대 가운데로(칸 3에서 오른쪽으로 옮김, 사용자 지정 2026-11-20)
    $('jl-neck').addEventListener('pointerdown', onTap);
  }

  // ── 직접 눌러 보기 — 지판을 눌러 정답 자리(줄 s, 칸 f)를 찾으면 다음으로. 틀리면 누른 자리에 연한 오답 고스트 점이 잠깐 떴다 사라짐 ──
  let tapState = null;   // { s, f, res } — 기다리는 동안만
  function tapPos(e) {   // 누른 자리 → [줄 1~6, 칸 0~5](0 = 너트 왼쪽 개방현 자리)
    const nk = $('jl-neck'), r = nk.getBoundingClientRect(), k = r.width / nk.offsetWidth || 1;   // k = 지판 배율(5단계 스코프에서 scale로 키움 — style.css --jl-fb-scale). 화면 좌표를 360px 기준 좌표로 되돌림
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    const sN = Math.min(6, Math.max(1, Math.floor(y / FB_STR_GAP) + 1));
    const fN = x < FB_OPEN_W ? 0 : Math.min(qz ? QZ_FRETS[1] : FB_FRETS, Math.floor((x - FB_OPEN_W) / FB_FRET_W) + 1);
    return [sN, fN];
  }
  function ghost(sN, fN) {
    const g = document.createElement('span');
    g.className = 'jl-fb-ghost';
    g.style.left = (fN ? fretX(fN) : FB_OPEN_W / 2) + 'px';
    g.style.top = strY(sN) + 'px';
    $('jl-neck').appendChild(g);
    const a = J.anim(g, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.4, transform: 'scale(1)', offset: 0.2 }, { opacity: 0.4, transform: 'scale(1)', offset: 0.6 }, { opacity: 0, transform: 'scale(1)' }],
      { duration: 900, easing: 'ease-out' });
    a.onfinish = function () { g.remove(); };
    a.oncancel = function () { g.remove(); };
  }
  function onTap(e) {
    const pos = tapPos(e);
    if (!tapState) {   // 기다리는 중이 아니면: 화면에 점이 떠 있을 때 그 점(자리)을 누르면 그 음이 울림 — 실제 기타로 눌러 보며 정답 소리를 확인
      const p = $('jl-press');
      if (p && p.classList.contains('is-in') && p.dataset.s == pos[0] && p.dataset.f == pos[1]) {
        J.note(OPEN_MIDI[pos[0] - 1] + pos[1], J.audioT0(), 1.6, 0.6);
        later(function () { J.anim(p, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, easing: J.EASE_OUT }); }, J.leadMs());
      }
      return;
    }
    if (pos[0] !== tapState.s || pos[1] !== tapState.f) {   // 오답도 누른 자리의 음은 울림(고스트 점과 같은 시각)
      J.note(OPEN_MIDI[pos[0] - 1] + pos[1], J.audioT0(), 1.2, 0.5);
      later(function () { ghost(pos[0], pos[1]); }, J.leadMs());
      return;
    }
    const st = tapState;
    tapState = null;
    J.note(OPEN_MIDI[st.s - 1] + st.f, J.audioT0(), 1.6, 0.6);
    later(function () { press(st.s, st.f).then(st.res); }, J.leadMs());
  }
  // 정답을 누를 때까지 기다림. 빨리 돌리는 중(이전 칸 이동·페이즈 복원·이미 들은 칸 건너뛰기)이면 기다리지 않고 정답 자리를 바로 보여 주고 끝냄
  function waitTap(sN, fN) {
    return new Promise(function (res) {
      const answer = function () { tapState = null; press(sN, fN).then(res); };
      if (J.skipping()) { answer(); return; }
      tapState = { s: sN, f: fN, res: res };
      (function poll() {   // 엔진 타이머로 0.2초마다 확인 — 건너뛰기가 시작되면 엔진이 이 예약을 곧바로 실행해 줌
        later(function () { if (!tapState) return; if (J.skipping()) answer(); else poll(); }, 200);
      })();
    });
  }

  // ── 요소 찾기 ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll((qz ? '#jq-content ' : '#combo-v2-lec-stage ') + sel)); }   // 퀴즈가 시작되면 퀴즈 화면에서 찾음
  function strs() { return q('.jl-fb-str'); }
  function str(s) { return q('.jl-fb-str[data-s="' + s + '"]'); }
  function snum(s) { return q('.jl-fb-snum[data-s="' + s + '"]'); }
  function fnum(f) { return q('.jl-fb-num[data-f="' + f + '"]'); }
  function fret(f) { return q('.jl-fb-fret[data-f="' + f + '"]'); }
  function finger(i) { return q('.jl-hand-n[data-i="' + i + '"], .jl-hand-li[data-i="' + i + '"]'); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  // 왼손 그림을 무대 가운데로 — 오른쪽 목록(아직 안 보임)과 간격의 절반만큼 오른쪽으로(목록 폭은 번역마다 달라 실측). 다음 칸에서 클래스를 떼면 제자리로(0.5초 — CSS)
  function handCenter() {
    const w = q('.jl-handwrap')[0], list = q('.jl-hand-list')[0];
    if (!w || !list) return;
    w.style.setProperty('--hand-dx', ((list.offsetWidth + parseFloat(getComputedStyle(w).columnGap || 0)) / 2) + 'px');
    w.style.transition = 'none';   // 가운데 자리는 나타나기 전에 전환 없이 미리 — 나타나는 동안 옆으로 미끄러지지 않게(사용자 지적 2026-11-20: 좌우 슬라이드 금지)
    w.classList.add('jl-handwrap--c');
    void w.offsetWidth;
    w.style.transition = '';
  }
  function clearFocus() { setCls(q('.is-focus'), 'is-focus', false); }

  // 짚는 점 — (줄 s, 칸 f)에 팝. label: 점 안 글자(손가락 번호), 없으면 빈 점
  function press(s, f, label) {
    const p = $('jl-press');
    p.style.left = (f ? fretX(f) : FB_OPEN_W / 2) + 'px';   // 0프렛 = 너트 왼쪽 개방현 자리 가운데
    p.style.top = strY(s) + 'px';
    p.dataset.s = s;
    p.dataset.f = f;
    $('jl-press-n').textContent = label || '';
    return fx([p], 'is-in', true);
  }

  // 소리와 화면 맞추기 — 소리는 오디오 시계(t0 + k·gap초)에 예약, 화면은 같은 시각에(엔진 지연 LEAD 반영)
  function pluck(list, gap, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    list.forEach(function (m, k) {
      J.note(m, t0 + k * gap, 1.4, 0.6);
      later(function () { onEach(k); }, lead + k * gap * 1000);
    });
    return wait(lead + (list.length - 1) * gap * 1000);
  }

  // ── 단계 (설명 확정 2026-11-12 — 기록: docs/journey-lesson-guide.md §5) ──
  // 솔로연주 비기너(2026-11-23 — docs/solo-beginner-curriculum.md): 같은 강의에 문구만 다름. 피크가 필수(손톱 이야기는 하지 않음 — 사용자 지정)
  const SOLO = /[?&]course=soloing/.test(location.search);
  const steps = [
    // P1 도입 — 단계 없이 한 흐름(칸 하나, 문구 넷이 차례로 바뀜). 템포를 높임(사용자 지정): 문구 간격 gap을 기본 4초 대신 한 줄 2.2초 / 두 줄 3초.
    //  ms = 실제 길이(2.2 + 3 + 3 + 마지막 문구 2.6초) − 문구 선행 1초 → 진행 바 칸 길이와 맞춤
    Object.assign(J.chainSteps([
      { text: SOLO ? '솔로연주 비기너 여정을 시작해요!' : '코드반주 비기너 여정을 시작해요!', gap: 2200, run: function () {} },                                       // 핵심: 여정 시작
      { text: SOLO ? '이번 여정에서는 솔로연주에 꼭 필요한\n지식과 연습법을 알려드려요' : '이번 여정에서는 코드반주에 꼭 필요한\n지식과 연습법을 알려드려요', gap: 3000, run: function () {} },        // 핵심: 무엇을 배우는가
      { text: SOLO ? '여정이 끝나면 반주에 맞춰\n' + em('나만의 솔로') + '를 연주할 수 있게 될 거예요!' : '여정이 끝나면 배우고 싶은 노래를\n스스로 찾아서 배울 수 있게 될 거예요!', gap: 3000, run: function () {} }, // 핵심: 도착점
    ].concat(SOLO ? [{ text: '솔로연주에는 ' + em('피크') + '가 꼭 필요해요\n피크를 꼭 준비해주세요!', gap: 3000, run: function () {} }] : []).concat([   // 솔로: 피크 필수(사용자 지정)
      { text: '', gap: 1800, enter: function () { setCls([$('jl-lguitar')], 'is-on', true); }, run: function () {} },   // 문구 3이 사라진 빈 화면에서 기타 그림이 아래에서 천천히(1.2초) 떠오름 → 문구 4(사용자 지정 2026-11-20). 문구를 비우는 순간(enter) 시작
      { text: '기타가 있다면 꼭 옆에 두고\n함께 보면서 따라와 주세요!', gap: 3000, run: function () {} },   // 핵심: 실제 기타와 함께 — 기타 그림은 빈 화면에서 먼저 떠올라 둥둥 떠 있음
    ])), { ms: SOLO ? 12800 : 9800 }),   // 솔로는 피크 문구 3초가 더해짐

    // P2 줄과 프렛
    // 핵심: 지판이라는 무대 — 프렛·너트가 나타나고 줄이 헤드 쪽부터 그어짐
    { text: SOLO ? '기타를 연주하기 전에\n먼저 알아야 할 것이 있어요' : '기타 코드를 처음 잡기 전에\n먼저 알아야 할 것이 있어요', enter: function () { setCls([$('jl-lguitar')], 'is-on', false); }, run: function () {   // 문구가 바뀌는 순간 도입의 기타 그림을 치움(§4-20)
      return fx([$('jl-lfb')], 'is-on', true).then(function () { return fx(strs(), 'is-in', true, 80); });
    } },
    // 핵심: 줄은 6개 — 위에서 아래로 한 줄씩 울리며 파랑(개방현 소리)
    { text: '기타 지판에는 ' + em('6개의 줄') + '이 있어요', ms: 3200, run: function () {
      return pluck(OPEN_MIDI, 0.4, function (k) { clearFocus(); setCls(str(k + 1), 'is-focus', true); })
        .then(function () { return wait(500); }).then(clearFocus);
    } },
    // 핵심: 줄번호 방향 — 왼쪽에 번호 1~6, 이어서 1번줄(가장 얇음)과 6번줄(가장 굵음)을 울림
    //  문구보다 먼저(사용자 지정 2026-11-20): 앞 문구가 사라진 빈 화면에서 가운데 있던 지판이 오른쪽으로 옮겨 가 줄번호 자리를 만들고 → 줄번호 1~6이 차례로 → 문구.
    //  칸 1·2에선 줄번호가 없어 지판(너트~끝)이 무대 가운데에 있음(.jl-fb--c — 줄번호 자리 44px의 절반만큼 왼쪽, build)
    J.chainSteps([
      { text: '', gap: 1800, enter: function () {
        later(function () {   // 0ms 뒤 — 이전·진행 바로 이 칸을 다시 열 때 엔진이 enter를 전환 없이 즉시 적용하므로, 이동은 전환이 다시 켜진 뒤에 시작
          const fb = q('#jl-lfb .jl-fb')[0];
          if (fb) fb.classList.remove('jl-fb--c');   // 오른쪽으로 22px(0.5초 — CSS)
        }, 0);
        later(function () { fx(q('.jl-fb-snum'), 'is-in', true, 100); }, FB_SHIFT_MS);   // 옮긴 뒤 줄번호
      }, run: function () { return wait(FB_SHIFT_MS + 5 * 100 + FADE_MS - J.CAPTION_LEAD_MS); } },
      { text: '가장 얇은 줄이 1번줄,\n가장 굵은 줄이 6번줄이에요', ms: 2900, run: function () {
        return pluck([OPEN_MIDI[0], OPEN_MIDI[5]], 1.0, function (k) {
          clearFocus();
          const s = k ? 6 : 1;
          setCls(str(s).concat(snum(s)), 'is-focus', true);
        });
      } },
      // 화면 지판 ↔ 실제 기타(사용자 지정 2026-11-20 — 문구만, 애니메이션 없음): 실제로 잡으면 6번줄이 맨 위, 지금 그림은 기타를 그대로 눕힌 모습. 줄 강조는 끔
      { text: '실제로 기타를 잡으면\n' + em('6번줄') + '이 가장 위에 보여요', enter: clearFocus, run: function () {} },   // 앞 문구의 1번줄·6번줄 강조는 여기서 끔(사용자 지정 2026-11-20 — 계속 남길 필요 없음)
      { text: '지금 화면은 기타를 그대로\n' + em('눕힌') + ' 모습이에요', run: function () {} },
    ]),
    // 핵심: 프렛 = 줄이 닿는 세로선 — 먼저 실제 기타 지판을 보게 하고(줄은 옅게, 세로선만 헤드 쪽부터 차례로 파랑),
    //  이어서 이름을 붙임(세로선이 한 번 굵어졌다 돌아옴). 한 칸, 문구 둘
    Object.assign(J.chainSteps([
      { text: '기타 지판을 보면 톡 튀어나온\n세로선들을 볼 수 있죠?', enter: clearFocus, run: function () {
        setCls(strs().concat(q('.jl-fb-snum')), 'is-dim', true);
        return fx(q('.jl-fb-fret'), 'is-focus', true, 120);
      } },
      { text: '줄을 누르면 실제로 닿는 이 선을\n' + em('프렛') + '이라고 불러요', run: function () {
        return Promise.all(q('.jl-fb-fret').map(function (el) {
          return new Promise(function (res) {
            const a = J.anim(el, [{ width: '3px' }, { width: '5px' }, { width: '3px' }], { duration: 600, easing: J.EASE_OUT });
            a.onfinish = res;
          });
        }));
      } },
    ]), { ms: 6800 }),
    // 핵심: 연주할 때는 칸 = 프렛 번호 — 칸 양쪽 선(너트·1번 프렛선)을 잠깐 파랑으로 짚고, 그 칸 아래에 '1프렛'
    { text: '하지만 연주할 때는 프렛 사이의 칸을\n프렛 번호로 불러요', run: function () {
      return fx(q('.jl-fb-fret'), 'is-focus', false)
        .then(function () { setCls([$('jl-nut')].concat(fret(1)), 'is-focus', true); return wait(700); })
        .then(function () { setCls(fnum(1), 'is-focus', true); return fx(fnum(1), 'is-in', true); })
        .then(function () { return wait(900); })
        .then(function () { setCls([$('jl-nut')].concat(fret(1)), 'is-focus', false); });
    } },
    // 핵심: 프렛 번호 방향 — 헤드 쪽 칸부터 '2프렛, 3프렛…'이 하나씩(지금 나온 이름표만 파랑)
    { text: '헤드 쪽부터 1프렛, 2프렛…\n순서대로 번호를 붙여요', ms: 3000, run: function () {   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
      let p = wait(300);
      for (let f = 2; f <= FB_FRETS; f++) {
        p = p.then(function () {
          setCls(q('.jl-fb-num'), 'is-focus', false);
          setCls(fnum(f), 'is-focus', true);
          return fx(fnum(f), 'is-in', true).then(function () { return wait(150); });
        });
      }
      return p.then(function () { return wait(500); }).then(function () { setCls(q('.jl-fb-num'), 'is-focus', false); });
    } },
    // 핵심: 지판의 점 = 프렛 번호를 빨리 찾는 표시 — 줄 이름·프렛 이름을 걷고(0~5 지판) 같은 모습의 긴 지판으로 즉시 바꾼 뒤 3·5프렛 점을 파랑,
    //  이어서 옆으로 밀면서 점이 있는 칸(3·5·7·9·12·15)을 차례로 파랑 + 아래 숫자. 한 칸, 문구 둘
    Object.assign(J.chainSteps([
      { text: '지판에는 군데군데\n' + em('점') + '이 찍혀 있어요', enter: clearFocus,
        run: function () {
          return fx(q('.jl-fb-snum').concat(q('.jl-fb-num')), 'is-in', false)
            .then(function () {
              setCls(q('.is-dim'), 'is-dim', false);
              swapNow($('jl-lfb'), $('jl-lfull'));
              return wait(200);
            })
            .then(function () { return fx(q('.jl-fn-dot[data-f="3"], .jl-fn-dot[data-f="5"]'), 'is-focus', true, 150); });
        } },
      { text: '이 점은 3, 5, 7, 9, 12, 15프렛에 있어서\n프렛 번호를 빨리 찾게 도와줘요', run: function () {
        setCls(q('.jl-fn-dot'), 'is-focus', false);
        let p = wait(300);
        FN_MARKS.forEach(function (f) {
          p = p.then(function () { return fnSlide(f); }).then(function () {
            setCls(q('.jl-fn-dot[data-f="' + f + '"], .jl-fn-num[data-f="' + f + '"]'), 'is-focus', true);
            return fx(q('.jl-fn-num[data-f="' + f + '"]'), 'is-in', true).then(function () { return wait(200); });
          });
        });
        return p;
      } },
    ]), { ms: 10000 }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
    // 핵심: 두 번호(줄·프렛)가 위치를 말하는 도구 — 긴 지판을 처음 위치로 밀어 돌아온 뒤 0~5 지판으로 즉시 바꾸고(같은 모습),
    //  줄 이름·프렛 이름을 다시 띄운 다음 두 이름표 묶음을 함께 파랑
    { text: '줄번호와 프렛번호를 알아야\n기타를 효율적으로 배울 수 있어요!', ms: 3500, enter: clearFocus,   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
      run: function () {
        return fnSlide(0)
          .then(function () { swapNow($('jl-lfull'), $('jl-lfb')); return fx(q('.jl-fb-snum').concat(q('.jl-fb-num')), 'is-in', true); })
          .then(function () { return wait(200); })
          .then(function () { return fx(q('.jl-fb-snum').concat(q('.jl-fb-num')), 'is-focus', true); })
          .then(function () { return wait(1400); })
          .then(function () { return fx(q('.jl-fb-snum').concat(q('.jl-fb-num')), 'is-focus', false); });
      } },
    // 핵심: 줄번호 × 프렛번호의 교차점이 위치 — 직접 찾아 누르게 함(정답을 누를 때까지 다음으로 안 넘어감, 틀린 자리엔 오답 고스트),
    //  맞히면 그 자리에 점 + 소리 → '정답이에요! 이제 다음으로 넘어가봅시다!'와 함께 2번줄(가로) → 1프렛(칸)을 짚고 점이 한 번 커짐 → 이 페이즈 끝(다음 = 손가락 번호). 한 칸, 문구 둘
    //  lock: 정답을 누르기 전엔 "다음"이 안 켜지고 건너뛸 수도 없음(들은 적이 있어도)
    //  failsafe: 엔진 안전 시간(20초)이 지나면 단계가 저절로 끝나므로 이 칸은 사실상 없앰(누를 때까지 기다림)
    Object.assign(J.chainSteps([
      { text: em('2번줄 1프렛') + '은 어디일까요?\n직접 찾아서 눌러주세요!', gap: 800, run: function () { return waitTap(2, 1); } },
      { text: '정답이에요!\n이제 다음으로 넘어가봅시다!', gap: 1800, run: function () {
        setCls(str(2).concat(snum(2)), 'is-focus', true);
        return wait(250)
          .then(function () { setCls(fnum(1), 'is-focus', true); return wait(250); })
          .then(function () {
            return new Promise(function (res) {
              const a = J.anim($('jl-press'), [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, easing: J.EASE_OUT });
              a.onfinish = res;
            });
          });
      } },
    ]), { ms: 2000, failsafe: 24 * 3600 * 1000, lock: true }),   // 짧게(사용자 지정): 정답을 누른 뒤 약 3초면 다음이 켜짐. ms = 단계 최소 길이·진행 바 칸 길이의 기준

    // P3 손가락 번호
    // 핵심: 손가락 번호가 있는 이유 — 질문(번거롭겠죠?)으로 필요를 느끼게 한 뒤 답(번호를 써요). 지판을 치우고 왼손 그림. 한 칸, 문구 둘
    Object.assign(J.chainSteps([
      { text: SOLO ? '앞으로 줄을 누를 때 어떤 손가락으로\n누를지 일일이 얘기하면 번거롭겠죠?' : '앞으로 코드를 잡을 때 어떤 손가락으로\n누를지 일일이 얘기하면 번거롭겠죠?',
        enter: function () { clearFocus(); setCls(q('.jl-fb-press'), 'is-in', false); setCls([$('jl-lfb')], 'is-on', false); handCenter(); },   // 손 그림 가운데 자리는 문구와 함께(나타나기 전에) 미리 잡음
        run: function () { return fx([$('jl-lhand')], 'is-on', true); } },   // 제자리에서 자연스럽게 나타남(사용자 지정 2026-11-20 — 밑에서 올라오기 대신)   // 목록(오른쪽)이 아직 안 보여 손 그림만 무대 가운데에(.jl-handwrap--c — 눈에 보이는 것 기준 정렬, 사용자 지정 2026-11-20)
      { text: '그래서 손가락에 ' + em('번호') + '를 사용해요!', run: function () {} },
    ]), { ms: 7400 }),
    // 핵심: 손가락과 번호의 대응 — 검지부터 1·2·3·4, 마지막에 엄지 T(그림의 번호와 오른쪽 목록 한 줄이 함께)
    //  문구보다 먼저(사용자 지정 2026-11-20): 앞 문구가 사라진 빈 화면에서 가운데 있던 손 그림이 왼쪽으로 옮겨 가 목록 자리를 만들고 → 문구 → 번호·목록이 하나씩
    J.chainSteps([
      { text: '', gap: 1200, enter: function () {
        later(function () { const w = q('.jl-handwrap')[0]; if (w) w.classList.remove('jl-handwrap--c'); }, 0);   // 0ms 뒤 — 다시 열 때 enter가 즉시 적용돼도 이동은 보이게(가이드 §2)
      }, run: function () { return wait(0); } },
      { text: '검지부터 1, 2, 3, 4\n엄지는 T라고 불러요', ms: 4050, run: function () {   // ms = 측정값(번호 다섯 개 — 간격 450×3·700 + 페이드 400×5)
        let p = Promise.resolve();
        HAND_LABELS.forEach(function (l, i) {
          p = p.then(function () { return wait(i === 4 ? 700 : (i ? 450 : 0)); }).then(function () { return fx(finger(i), 'is-in', true); });
        });
        return p;
      } },
    ]),
    // 핵심: 점 하나 = 위치 + 손가락이 한 지시 — 질문과 함께 지판에 "2"가 적힌 점 + 소리, 그다음 그 점을 읽어 주는 해석(한 칸, 문구 둘)
    //  해석: 3번줄(가로) → 2프렛(칸) → 점 안의 2(손가락)를 차례로 짚음
    Object.assign(J.chainSteps([
      { text: '지금 보이는 점은 무슨 의미일까요?', enter: function () { setCls([$('jl-lhand')], 'is-on', false); },
        run: function () {
          return fx([$('jl-lfb')], 'is-on', true)
            .then(function () { J.note(OPEN_MIDI[2] + 2, J.audioT0(), 1.6, 0.6); return wait(J.leadMs()); })
            .then(function () { return press(3, 2, '2'); });
        } },
      { text: '바로 3번줄 2프렛을 2번 손가락,\n즉 ' + em('중지') + '로 누르라는 뜻이에요!', run: function () {
        setCls(str(3).concat(snum(3)), 'is-focus', true);
        return wait(600)
          .then(function () { setCls(fnum(2), 'is-focus', true); return wait(600); })
          .then(function () {
            return new Promise(function (res) {
              const a = J.anim($('jl-press'), [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 500, easing: J.EASE_OUT });
              a.onfinish = res;
            });
          });
      } },
      // 실제 기타로 따라 하게 유도 — 눌러 볼 시간을 넉넉히(gap 6초), 비교해 볼 수 있게 같은 음을 한 번 더
      { text: '기타가 있다면 중지로 3번줄 2프렛을\n직접 눌러보세요!', gap: 6000, run: function () {
        return wait(1200).then(function () { J.note(OPEN_MIDI[2] + 2, J.audioT0(), 1.6, 0.6); return wait(J.leadMs()); })
          .then(function () {
            return new Promise(function (res) {
              const a = J.anim($('jl-press'), [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 500, easing: J.EASE_OUT });
              a.onfinish = res;
            });
          });
      } },
    ]), { ms: 13000 }),

    // 퀴즈 안내 — 따로 있던 마지막 페이즈를 손가락 번호 페이즈의 마지막 칸으로 합침(사용자 지정). 지판만 남기고 강조를 모두 끔. 한 칸, 문구 둘.
    //  끝까지 오면 진행 바 버튼이 '퀴즈 시작!'(doneLabel). 핵심: 퀴즈로 익숙해지기 → 시간 제한 없음 + 실제 기타로 같이 눌러 보기
    Object.assign(J.chainSteps([
      { text: '이제 배운 내용을 퀴즈로 풀어보면서\n지판과 손가락 번호에 익숙해져 봐요!',
        enter: function () { clearFocus(); setCls(q('.jl-fb-press'), 'is-in', false); }, run: function () {} },
      { text: '퀴즈에는 ' + em('시간 제한') + '이 없어요\n기타가 있다면 꼭 같이 눌러보면서\n풀어주세요!', run: function () {} },
    ]), { ms: 7400 }),
  ];
  const groups = [[0], [1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13]];   // 13 = 퀴즈 안내 칸 — 설명 다시듣기에선 빼고 12에서 종료(replayCut)


  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — 별 1·2·3(노드 경제 기획안 hub/submissions/2026-11-11 §1-1·§1-4). 별 진행은 순차: 별 0개 → 강의 + 별 1 퀴즈, 별 1개 이상 → 퀴즈만(별 2 → 별 3 → 이후 별 3 반복)
  //   별 = 출제 범위: 별 1 0~5프렛, 별 2 0~9프렛, 별 3 0~15프렛(사용자 지정). 문제 수는 5문제 단위(별 1 10 / 별 2·3 15 — 임시값)
  //   유형: ① N번줄 M프렛 찾아 누르기 ② 찍힌 점을 보고 사지선다 ③ 손가락 ↔ 번호 짝 맞추기(5쌍 중 무작위 3쌍) — 비율 4:4:2, 순서 섞음
  //   지판에는 줄 이름·프렛 이름을 띄우지 않음(읽는 훈련). 단 별 2·3은 지판을 옆으로 밀어서 보므로 점이 찍힌 칸(3·5·7·9·12·15) 아래에만 프렛 번호(숫자). 0프렛 = 너트 왼쪽(개방현 빈 동그라미)
  //   화면 = 리하모니 문제 화면 구조. ①은 누르는 즉시 채점(누른 자리 소리 뒤 정답음·게이지), ②③은 고른 뒤 제출하기
  //   틀린 문제는 본 문제가 끝나면 오답풀이 안내(리하모니 오버레이) → 같은 문제 다시(맞힐 때까지) → 완주 = 별 획득(오답풀이까지 끝내야 별)
  //   피크(§1-4, 2026-11-12 변경): 본 문제마다 답할 때 1개 소모(진입·문제 표시 때는 안 빠짐, 오답풀이는 소모 없음), 정답 5개마다 +4(오답풀이 정답 포함) → 5문제당 순소모 1(10문제 2, 15문제 3).
  //     완주 때 혹시 남은 몫이 있으면 맞춰 돌려줌(합계 = 문제 수 − 순소모). Pro는 소모·환급 없음.
  //     잔액 0이면 문제를 보여 줄 때 막고 앱 공용 완충 모달(광고 +3) — 그 문제에서 멈춰 있다가 "이어서 풀기"로 계속. 환급은 대기분에 쌓고 나가기·완주 때 서버로(flushPendingRefund)
  //   저장: 별 수는 이 기기 localStorage(jnyStars), 하던 퀴즈는 jnyQuizSess(새로고침·앱 종료·백그라운드 뒤 이어 풀기). 서버 저장·6시간 타이머·별 3 피크상자 보상은 아직(서버 작업 필요)
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = {   // 별 → 출제 범위(프렛)·문제 수
    1: { frets: 5, n: 10 },
    2: { frets: 9, n: 15 },
    3: { frets: 15, n: 15 },
  };
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const QZ_FINGERS = [['검지', '1'], ['중지', '2'], ['약지', '3'], ['소지', '4'], ['엄지', 'T']];
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'fretboard-reading';
  let QZ_FRETS = [0, 5];   // 이번 퀴즈 출제 범위(startQuiz가 별에 맞춰 정함)
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
  function posName(s, f) { return s + '번줄 ' + f + '프렛'; }
  function inRange(s, f) { return s >= 1 && s <= 6 && f >= QZ_FRETS[0] && f <= QZ_FRETS[1]; }

  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다(문제마다 새로 뽑지 않음). 화면에 필요한 값도 여기서 모두 정함:
  //  찾기·읽기 = 줄·프렛 + 지판 창 위치(view), 읽기 = 보기 4개와 순서, 짝 = 손가락 3개 + 두 열의 순서. 화면(render)은 이 값을 그리기만 함 → 오답풀이·이어 풀기도 똑같은 화면
  function makeQuestions(n) {
    const nPair = Math.round(n * 0.2), nFind = Math.round((n - nPair) / 2), nRead = n - nPair - nFind;   // 4:4:2
    const all = [];
    for (let s = 1; s <= 6; s++) for (let f = QZ_FRETS[0]; f <= QZ_FRETS[1]; f++) all.push([s, f]);
    const pos = shuffle(all).slice(0, nFind + nRead);
    const qs = [];
    pos.slice(0, nFind).forEach(function (p) { qs.push({ type: 'find', s: p[0], f: p[1], view: pickView(p[1], true), vw: QV_W }); });
    pos.slice(nFind).forEach(function (p) { qs.push({ type: 'read', s: p[0], f: p[1], view: pickView(p[1], false), vw: QV_W, choices: readChoices(p[0], p[1]) }); });
    for (let k = 0; k < nPair; k++) {
      const fingers = shuffle(QZ_FINGERS.slice()).slice(0, 3);   // 5개 중 3개
      qs.push({ type: 'pair', fingers: fingers, order: { left: shuffle(fingers.slice()), right: shuffle(fingers.slice()) } });
    }
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)   // 유형을 섞어서 출제
  }
  // 사지선다 보기 — 정답 + 헷갈리기 쉬운 이웃 자리(줄 ±1, 프렛 ±1, 대각선) 중 3개
  function readChoices(s, f) {
    const near = shuffle([[s - 1, f], [s + 1, f], [s, f - 1], [s, f + 1], [s - 1, f - 1], [s + 1, f + 1], [s - 1, f + 1], [s + 1, f - 1]].filter(function (p) { return inRange(p[0], p[1]); }));
    const out = [[s, f]].concat(near.slice(0, 3));
    while (out.length < 4) {
      const p = [1 + rnd(6), QZ_FRETS[0] + rnd(QZ_FRETS[1] - QZ_FRETS[0] + 1)];
      if (!out.some(function (o) { return o[0] === p[0] && o[1] === p[1]; })) out.push(p);
    }
    return shuffle(out);
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
  function playPos(s, f) { J.note(OPEN_MIDI[s - 1] + f, J.audioT0(), 1.4, 0.6); }

  // ── 화면 — 리하모니 문제 화면(#combo-view-quiz-v2)과 같은 구조: 헤드(타이틀 + 오답풀기 배지) / 본문(안내 카드 → 조작 영역) / 하단 제출 버튼 ──
  const QZ_TITLES = { find: '위치를 찾아 눌러주세요', read: '점의 위치를 골라주세요', pair: '같은 짝끼리 눌러서 맞춰주세요' };
  const JUDGE_DELAY_MS = 450;   // 찾아 누르기: 누른 자리 소리가 울린 뒤 이만큼 있다가 정답·오답음 + 게이지(소리 지연 LEAD에 더함)
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
  // 지판(0~5프렛) — 줄 이름·프렛 이름 없이(읽는 훈련), 개방현 자리에 빈 동그라미(스케일 훈련과 같음)
  // 문제 지판 창(2026-11-26 사용자 지정) — 한 화면에 프렛 4칸 + 양끝 이웃 칸이 아주 살짝(QV_S). 창을 본문 폭에 맞춰 통째로 확대(비율 유지, fitBoard)
  const QV_S = 10;                         // 양끝에 살짝 보이는 이웃 칸 폭(360px 기준 좌표)
  const QV_W = 4 * FB_FRET_W + 2 * QV_S;   // 228 — 창 폭
  function boardHtml() { return '<div class="jq-board"><div class="jq-board-view" id="jq-board-view" style="width:' + QV_W + 'px">' + fretboardHtml(QZ_FRETS[1]) + '</div></div>'; }   // 창(QV_W)만 보임 — 위치는 placeView가 정함(유저는 밀 수 없음)
  // 지판 오른쪽 끝에 여유(줄만 이어짐)를 붙여 마지막 창에서도 마지막 칸 뒤로 살짝 보이는 자리가 있게(placeView)
  function padBoard() {
    const fb = q('.jl-fb')[0], end = boardEnd();
    if (fb && end) fb.style.width = (end + QV_W) + 'px';
  }
  // 문제 지판 확대(비율 유지) — 지판(줄 6개 영역) 높이를 정수 px로 고정(사용자 지정 2026-11-26): 모바일(~480px) 144px, 태블릿(481px~) 172px.
  //  본문 폭이 모자라면 폭에 맞춰 줄임(360px 미만 대비). transform은 자리를 안 바꾸므로 늘어난 높이만큼 아래 여백을 더함(resize마다 다시)
  function fitBoard() {
    const v = $('jq-board-view');
    if (!v) return;
    const box = v.parentElement;
    const h = window.matchMedia('(min-width: 481px)').matches ? 172 : 144;
    const k = Math.min(h / FB_H, box.clientWidth / QV_W);
    v.style.transform = 'scale(' + k + ')';
    v.style.marginBottom = ((k - 1) * v.offsetHeight) + 'px';
  }
  window.addEventListener('resize', fitBoard);
  function mountBoard() {
    padBoard();
    setCls(q('.jl-fb-str'), 'is-in', true);
    // 프렛 번호 — 창이 지판 일부만 보여 주므로(별 1도 프렛 4칸 창, 2026-11-26) 점이 찍힌 칸(3·5·7·9·12·15)에만 숫자로(사용자 지정)
    q('.jl-fb-num').forEach(function (el) {
      if ([3, 5, 7, 9, 12, 15].indexOf(+el.dataset.f) >= 0) { el.textContent = el.dataset.f; el.classList.add('is-in'); }
      else el.remove();
    });
    let hints = '';
    for (let sN = 1; sN <= 6; sN++) hints += '<span class="jl-open-hint" style="left:' + (FB_OPEN_W / 2) + 'px;top:' + strY(sN) + 'px"></span>';
    $('jl-neck').insertAdjacentHTML('beforeend', hints);
    $('jl-neck').addEventListener('click', qTap);
    fitBoard();
  }

  // 지판 창 — 유저는 밀 수 없고(사용자 지정) 창 위치는 문제를 만들 때 확정(pickView → it.view), 화면은 그 값만 적용(placeView).
  //  창 = 프렛 4칸이 온전히 + 양끝 이웃 칸이 QV_S만큼 살짝(2026-11-26). 시작점: 맨 앞(0 — 개방현 자리부터) 또는 f번 칸 왼쪽 − QV_S
  function boardEnd() {   // 창을 가장 오른쪽으로 민 시작점(마지막 4칸 + 양끝 살짝). 지판이 창 안에 다 들어가면 0
    const w = FB_OPEN_W + QZ_FRETS[1] * FB_FRET_W;
    if (w <= QV_W) return 0;
    return cellX(QZ_FRETS[1] - 3) - QV_S;
  }
  //  찾아 누르기: 정답 칸이 다 보이는 시작점 중 무작위(늘 가운데면 답이 드러남) / 사지선다: 점 칸이 가운데에 가장 가까운 시작점
  function pickView(f, random) {
    const max = boardEnd();
    if (!max) return 0;
    const starts = [0];
    for (let a = 1; cellX(a) - QV_S <= max; a++) starts.push(cellX(a) - QV_S);   // a~a+3번 칸이 온전히, 양옆 칸은 살짝
    const cellL = f ? cellX(f) : 0, cellR = f ? cellX(f) + FB_FRET_W : FB_OPEN_W;
    const fits = starts.filter(function (x) { return cellL >= x && cellR <= x + QV_W; });   // 정답 칸은 살짝 보이는 자리가 아니라 온전히 보이는 창만
    const pool = fits.length ? fits : starts;
    if (random) return pool[Math.floor(Math.random() * pool.length)];
    const want = fretX(f || 0) - QV_W / 2;
    return pool.reduce(function (best, x) { return Math.abs(x - want) < Math.abs(best - want) ? x : best; }, pool[0]);
  }
  function placeView(it) {
    const view = $('jq-board-view');
    if (view) view.scrollLeft = it.view || 0;
  }

  function render() {
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 문제가 바뀜 → 앞 문제에서 누른 음 하드컷(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    qz.judged = false;
    qz.canRetry = false;
    qz.sel = null;
    pairSel = null; pairs = [];
    $('jq-title').textContent = QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'find') {
      box.innerHTML = infoCard('지판에서', posName(it.s, it.f), '위치를 눌러주세요') + boardHtml();
      mountBoard();
      placeView(it);
      qBtn('제출하기', false);   // 찾아 누르기는 누르는 즉시 채점(버튼은 채점 뒤 '다음')
    } else if (it.type === 'read') {
      box.innerHTML = infoCard('지판에 찍힌 점은', '', '몇 번줄 몇 프렛일까요?') + boardHtml() +
        '<div class="ms-quiz-choices jq-cq-choices jq-choices">' + it.choices.map(function (c) {
          return '<button type="button" class="ms-quiz-choice-card ms-quiz-choice-card--text" data-s="' + c[0] + '" data-f="' + c[1] + '">' + posName(c[0], c[1]) + '</button>';
        }).join('') + '</div>';
      mountBoard();
      press(it.s, it.f);
      box.querySelector('.jq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) qChoose(b); });
      placeView(it);
      qBtn('제출하기', false);
    } else {
      const col = function (side) {
        return '<div class="combo-v2-pair-col" data-side="' + side + '">' + it.order[side].map(function (x) {
          return '<button type="button" class="combo-v2-pair-card cd-card" data-pair="' + x[1] + '">' + (side === 'left' ? x[0] : x[1]) + '</button>';
        }).join('') + '</div>';
      };
      box.innerHTML = infoCard('왼손 손가락과', '', '손가락 번호를 눌러 짝지어 주세요') + '<div class="combo-v2-pairs jq-pairs">' + col('left') + col('right') + '</div>';
      box.querySelector('.jq-pairs').addEventListener('click', function (e) { const c = e.target.closest('.combo-v2-pair-card'); if (c) pairTap(c); });
      qBtn('제출하기', false);
    }
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
  // ① 찾아 누르기 — 누르는 즉시 채점. 누른 자리 소리 → 잠깐 뒤 정답·오답음 + 게이지. 틀리면 누른 자리에 오답 고스트, 정답 자리에 점
  function qTap(e) {
    if (!qz || qz.judged) return;
    const it = cur(), pos = tapPos(e);
    if (it.type === 'read') {   // 사지선다: 점을 누르면 그 음만 들려줌(채점은 보기 + 제출)
      if (pos[0] === it.s && pos[1] === it.f) playPos(it.s, it.f);
      return;
    }
    playPos(pos[0], pos[1]);
    const ok = pos[0] === it.s && pos[1] === it.f;
    if (!ok) ghost(pos[0], pos[1]);
    press(it.s, it.f);
    verdict(ok, J.leadMs() + JUDGE_DELAY_MS);
  }
  // ② 사지선다 — 리하모니 교체형 선택지처럼: 탭하면 선택(꺼짐), 다른 보기를 탭하면 선택이 옮겨감. 제출하기로 채점
  function qChoose(b) {
    if (qz.judged) return;
    $('jq-content').querySelectorAll('.ms-quiz-choice-card').forEach(function (c) { c.classList.toggle('is-sel', c === b); });
    qz.sel = b;
    qBtn('제출하기', true);
  }
  function readJudge() {
    const it = cur(), b = qz.sel;
    const ok = +b.dataset.s === it.s && +b.dataset.f === it.f;
    $('jq-content').querySelectorAll('.ms-quiz-choice-card').forEach(function (c) {
      c.classList.remove('is-sel');
      if (+c.dataset.s === it.s && +c.dataset.f === it.f) c.classList.add('ms-quiz-choice-card--correct');
      else if (c === b) c.classList.add('ms-quiz-choice-card--wrong');
    });
    $('jq-content').querySelector('.jq-choices').classList.add('is-locked');
    verdict(ok);
  }
  // ③ 짝 맞추기 — 리하모니 연결형과 같은 조작: 카드 탭 → 반대편 카드 탭 = 짝, 짝인 카드를 다시 탭하면 풀림. 다 짝지으면 제출
  const PAIR_COLORS = ['var(--icon-blue)', 'var(--icon-purple)', 'var(--icon-yellow)', 'var(--icon-pink)', 'var(--charcoal-blue)'];
  let pairSel = null, pairs = [];
  function pairTap(card) {
    if (qz.judged) return;
    const side = function (c) { return c.parentNode.dataset.side; };
    const ex = pairs.find(function (p) { return p.a === card || p.b === card; });
    if (ex) {
      [ex.a, ex.b].forEach(function (c) { c.classList.remove('is-paired'); c.style.removeProperty('--pair-c'); });
      pairs.splice(pairs.indexOf(ex), 1);
    } else if (pairSel && side(pairSel) !== side(card)) {
      const used = pairs.map(function (p) { return p.color; });
      const color = PAIR_COLORS.find(function (c) { return used.indexOf(c) < 0; }) || PAIR_COLORS[0];
      const a = side(card) === 'left' ? card : pairSel, b = a === card ? pairSel : card;
      [a, b].forEach(function (c) { c.classList.remove('is-sel'); c.classList.add('is-paired'); c.style.setProperty('--pair-c', color); });
      pairs.push({ a: a, b: b, color: color });
      pairSel = null;
    } else {
      if (pairSel) pairSel.classList.remove('is-sel');
      pairSel = card;
      card.classList.add('is-sel');
      return;
    }
    if (pairSel) { pairSel.classList.remove('is-sel'); pairSel = null; }
    qBtn('제출하기', pairs.length === cur().fingers.length);
  }
  function pairJudge() {
    let all = true;
    pairs.forEach(function (p) {
      const ok = p.a.dataset.pair === p.b.dataset.pair;
      if (!ok) all = false;
      [p.a, p.b].forEach(function (c) { c.classList.remove('is-paired'); c.classList.add(ok ? 'is-ok' : 'is-ng'); });
    });
    $('jq-content').querySelector('.jq-pairs').classList.add('is-locked');
    verdict(all);
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
      const it = cur();
      if (it.type === 'read' && qz.sel) readJudge();
      else if (it.type === 'pair') pairJudge();
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
    $('combo-v2-clear-level').textContent = '기타 지판 읽기 · 퀴즈 ' + qz.star;
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
    QZ_FRETS = [0, QZ_STAR_CFG[star].frets];
    qz = { star: star, qs: makeQuestions(QZ_STAR_CFG[star].n), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false, at: Date.now() };
    const saved = sessLoad();
    if (saved) SESS_FIELDS.forEach(function (k) { if (saved[k] !== undefined) qz[k] = saved[k]; });
    if (typeof jnyQuizTrack === 'function') jnyQuizTrack('journey_quiz_started', NODE_ID, qz, { resumed: !!saved });   // 실험 분석(2026-11-27)
    qz.qs.forEach(function (it) {   // 예전 판에 저장된 퀴즈 — 화면 값이 없거나 옛 창 폭(304px, ~2026-11-26)으로 정한 값이면 한 번만 다시 채워 이 값으로 고정
      if (it.type === 'pair' && !it.order) it.order = { left: shuffle(it.fingers.slice()), right: shuffle(it.fingers.slice()) };
      if (it.type !== 'pair' && (it.view == null || it.vw !== QV_W)) { it.view = pickView(it.f, it.type === 'find'); it.vw = QV_W; }
    });
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

  J.register('fretboard-reading', { steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 13, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });
})();
