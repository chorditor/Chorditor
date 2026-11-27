// ───────────────────────────────────────────────────────────
// 여정 노드: 음이름과 메이저스케일 (코드반주 D2)
//   설명 단계(문구 초안 — 사용자 흐름 2026-11-12) + 시연(음이름 줄·피아노 건반·0~4프렛 지판). 퀴즈는 설명 확정 뒤에 붙인다.
//   틀은 D1(fretboard-reading.js)과 같음: 단계마다의 핵심(CLAUDE.md 0-5)은 각 단계 주석, 모든 지연은 J.wait/J.later(엔진 타이머)만.
//   무대 층 3개: 음이름 줄(#n2-lrow) / 피아노 건반(#n2-lkb) / 0~4프렛 지판(#n2-lfb) — .is-on으로만 전환
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;

  // ── 음이름 줄 — 칸 7개, 위 = 음이름(알파벳), 아래 = 계이름. 순서는 단계마다 바꿔 씀(도레미 순 / A부터) ──
  const ROW_C = { lets: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], syls: ['도', '레', '미', '파', '솔', '라', '시'], midi: [48, 50, 52, 53, 55, 57, 59] };   // 기타 소리 — 한 옥타브 낮춤(사용자 지정 2026-11-20)
  const ROW_A = { lets: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], syls: ['라', '시', '도', '레', '미', '파', '솔'], midi: [57, 59, 60, 62, 64, 65, 67] };   // 기타 소리 — 한 옥타브 낮춤(사용자 지정 2026-11-20)
  function rowHtml(r) {
    return r.lets.map(function (l, k) {
      return '<span class="n2-cell" data-k="' + k + '"><span class="n2-let">' + l + '</span><span class="n2-syl">' + r.syls[k] + '</span>' +
        (l === 'A' ? '<span class="n2-hz">440Hz</span>' : '') + '</span>';
    }).join('');
  }

  // ── 피아노 건반 C4~D5(흰 건반 9개) — 위 = 스케일 순번, 아래 = 온/반 ──
  const KB_LO = 60, KB_HI = 74;
  const KW = 32, KH = 112, BW = 20;
  const KB_W = KW * 9;   // 288
  const KEY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function isBlack(m) { return KEY_NAME[m % 12].length > 1; }
  function whiteIdx(m) { let n = 0; for (let x = KB_LO; x < m; x++) if (!isBlack(x)) n++; return n; }   // m 아래 흰 건반 수
  function keyCx(m) { return isBlack(m) ? whiteIdx(m) * KW : whiteIdx(m) * KW + KW / 2; }               // 건반 가운데 x
  function kbHtml() {
    let w = '', b = '';
    for (let m = KB_LO; m <= KB_HI; m++) {
      const nm = '<span class="n2-kl">' + KEY_NAME[m % 12] + '</span>';
      if (isBlack(m)) b += '<span class="n2-key n2-key--b" data-m="' + m + '" style="left:' + (keyCx(m) - BW / 2) + 'px">' + nm + '</span>';
      else w += '<span class="n2-key n2-key--w" data-m="' + m + '" style="left:' + whiteIdx(m) * KW + 'px">' + nm + '</span>';
    }
    return '<div class="n2-kb" style="width:' + KB_W + 'px">' +
      '<div class="n2-knums" id="n2-knums"></div>' +
      '<div class="n2-keys" style="height:' + KH + 'px">' + w + b + '</div>' +
      '<div class="n2-ksteps" id="n2-ksteps"></div></div>';
  }
  const SCALE_C = [60, 62, 64, 65, 67, 69, 71, 72];
  const SCALE_D = [62, 64, 66, 67, 69, 71, 73, 74];

  // ── 기타 지판 — 스케일 훈련 퀴즈 지판과 같은 규칙·클래스로 생성(scale-level.js renderTestNeck·applyTestFbLayout, style.css .fb-*) ──
  //  기준 폭 360px = 7칸(개방현 칸 + 1~6프렛), 넥 높이 = (360/2.3 − 2.25) × 6/5, 내부 단위 --fbu = 넥 높이 ÷ 160, 실제 크기 = 컨테이너 폭(최대 520px) 비율.
  //  줄(.fb-string, 1번줄 굵기 1 → 6번줄 3.5)·너트(.fb-nut-line)·프렛선(.fb-fret-line)·포지션 점(.fb-dot)·프렛 번호(.fb-fret-num)·개방현 빈 동그라미(.fb-open-hint)·
  //  음 점(.fb-note — 프렛 = 브랜드색 점, 개방현 = 브랜드색 테두리 원, 고스트 = .fb-note--ghost, 고름 = --placed, 채점 = --correct/--wrong/--missed)은 스케일 훈련 그대로.
  //  여기서는 7칸 중 앞 6칸(개방현 + 1~4프렛 + 5프렛 칸)만 그리고 마지막 칸은 부드럽게 사라지게(.n2-fbfade). 프렛 번호는 점이 있는 3만(사용자 지정)
  const SFB_REF_W = 360, SFB_REF_COLS = 7, SFB_MAX_W = 520;
  const LEC_COLS = 6;   // 강의 지판 칸 수(개방현 + 1~4프렛 + 사라지는 5프렛 칸). 퀴즈는 QZ_COLS
  const SFB_NECK_H = (SFB_REF_W / 2.3 - 2.25) * 6 / 5;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];   // 1→6번줄(스케일 훈련 STRING_THICKNESS, px 고정 — 스케일 훈련과 같음)
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];          // 1→6번줄 E4 B3 G3 D3 A2 E2
  const OPEN_NAME = ['E', 'B', 'G', 'D', 'A', 'E'];
  const LEC_FB_MAX_W = 316;   // 강의 무대(높이 220px 고정)에 넥 + 프렛 번호가 들어가는 최대 기준 폭
  function sfbX(f, cols) { return (f + 0.5) / cols * 100; }   // f프렛 칸 가운데(%, 0 = 개방현 칸). cols = 그 지판의 칸 수
  function sfbY(sN) { return (sN - 0.5) / 6 * 100; }        // sN번줄(%, 1번줄이 위)
  // id: 넥 id / availW: 기준 폭(7칸 기준 — 칸이 적은 지판은 컨테이너 폭 × 7/칸 수를 넘겨 칸을 키움) / maxW: 기준 폭 상한 / opt.cols: 칸 수 / opt.hint: 빈 동그라미 안 음이름(강의) / opt.tune: 빈 동그라미 왼쪽 튜닝 음 / opt.ghost: 1~4프렛 고스트 노트(퀴즈)
  // 크기 — 지판 안의 요소는 전부 %·--fbu 단위라 바깥 상자(폭·--fbu·--fbs·--n2-fade)만 바꾸면 그대로 커지고 줄어듦(창 크기가 바뀔 때 sfbResize)
  function sfbSizeStyle(availW, maxW, cols) {
    const scale = Math.min(availW || SFB_REF_W, maxW) / SFB_REF_W;
    const colW = SFB_REF_W * scale / SFB_REF_COLS;
    return 'width:' + (colW * cols) + 'px;--fbu:' + (SFB_NECK_H / 160 * scale) + 'px;--fbs:' + scale + ';--n2-fade:' + colW + 'px';
  }
  function sfbHtml(id, availW, maxW, opt) {
    const cols = opt.cols, nut = 100 / cols;
    let h = '';
    for (let sN = 1; sN <= 6; sN++) h += '<div class="fb-string" data-s="' + sN + '" style="top:' + sfbY(sN) + '%;height:' + STRING_THICKNESS[sN - 1] + 'px;left:calc(' + nut + '% + 2 * var(--fbu))"></div>';   // 줄은 너트 오른쪽 끝(너트 폭 4fbu ÷ 2)에서 시작 — 너트 밑으로 안 들어감(사용자 지정 2026-11-20)
    h += '<div class="fb-nut-line" style="left:' + nut + '%"></div>';
    for (let c = 2; c < cols; c++) h += '<div class="fb-fret-line" style="left:' + (c / cols * 100) + '%"></div>';
    h += '<div class="fb-dot" style="left:' + sfbX(3, cols) + '%;top:50%"></div>';
    for (let sN = 1; sN <= 6; sN++) {
      h += '<div class="fb-open-hint" data-s="' + sN + '" style="left:' + sfbX(0, cols) + '%;top:' + sfbY(sN) + '%">' + (opt.hint ? '<span class="n2-open" data-s="' + sN + '">' + OPEN_NAME[sN - 1] + '</span>' : '') + '</div>';
      if (opt.tune) h += '<span class="n2-tune" style="left:' + sfbX(0, cols) + '%;top:' + sfbY(sN) + '%">' + OPEN_NAME[sN - 1] + '</span>';
      if (opt.ghost) for (let f = 1; f < cols - 1; f++) h += '<div class="fb-note fb-note--ghost" style="left:' + sfbX(f, cols) + '%;top:' + sfbY(sN) + '%"></div>';
    }
    return '<div class="fb-full-wrapper n2-sfb n2-fbfade degrees-on' + (opt.draw ? ' n2-sfb--draw' : '') + '" style="' + sfbSizeStyle(availW, maxW, cols) + '">' +
      '<div class="fb-full-neck" id="' + id + '">' + h + '</div>' +
      '<div class="fb-full-nums"><div class="fb-fret-num" style="left:' + sfbX(3, cols) + '%">3</div></div></div>';
  }
  // 음 점 — 스케일 훈련 .fb-note(프렛 = 브랜드색 점 + 흰 음이름, 개방현 = 브랜드색 테두리 원 + 검은 음이름). extra: 추가 클래스
  function sfbNote(sN, f, name, extra, cols) {
    const el = document.createElement('div');
    el.className = 'fb-note' + (f ? '' : ' fb-note--open') + (extra ? ' ' + extra : '');
    el.style.left = sfbX(f, cols) + '%';
    el.style.top = sfbY(sN) + '%';
    if (name) el.innerHTML = '<span class="fb-note-deg">' + name + '</span>';
    return el;
  }
  // 기타 C 메이저스케일 [줄, 프렛, 음이름] — 0~3프렛 안의 C 메이저 음 전부, 6번줄 E부터 1번줄 G까지(사용자 지정).
  //  개방현(0프렛)은 튜닝 때 빈 동그라미 안에 음이름 힌트가 있고, 채울 때 그 자리에 점이 채워짐
  const GTR_C = [[6, 0, 'E'], [6, 1, 'F'], [6, 3, 'G'], [5, 0, 'A'], [5, 2, 'B'], [5, 3, 'C'], [4, 0, 'D'], [4, 2, 'E'], [4, 3, 'F'],
    [3, 0, 'G'], [3, 2, 'A'], [2, 0, 'B'], [2, 1, 'C'], [2, 3, 'D'], [1, 0, 'E'], [1, 1, 'F'], [1, 3, 'G']];

  function build(stage) {
    stage.classList.add('is-jny');
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.warmupPiano) GuitarAudio.warmupPiano();   // 건반 시연용 피아노 샘플(CDN)을 미리 불러옴
    stage.innerHTML = '<div class="jl-layers">' +
      '<div class="jl-layer" id="n2-lrow"><div class="n2-row" id="n2-row">' + rowHtml(ROW_C) + '</div></div>' +
      '<div class="jl-layer jl-rise" id="n2-lkb">' + kbHtml() + '</div>' +
      '<div class="jl-layer" id="n2-lfb">' + sfbHtml('n2-neck', stage.clientWidth || (window.innerWidth - 32), LEC_FB_MAX_W, { cols: LEC_COLS, hint: true, draw: true }) + '</div></div>';
  }

  // ── 요소 찾기 ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function setCls(els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); }
  function clearFocus() { setCls(q('.is-focus'), 'is-focus', false); }
  function lets() { return q('.n2-let'); }
  function syls() { return q('.n2-syl'); }
  function part(k, p) { return q('.n2-cell[data-k="' + k + '"] .n2-' + p); }
  function key(m) { return q('.n2-key[data-m="' + m + '"]'); }
  function strs() { return q('.fb-string'); }
  function pop(els) {   // 한 번 커졌다 돌아옴
    return Promise.all(els.map(function (el) {
      return new Promise(function (res) {
        const a = J.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 450, easing: J.EASE_OUT });
        a.onfinish = res; a.oncancel = res;
      });
    }));
  }

  // 소리와 화면 맞추기 — 소리(기타)는 오디오 시계(t0 + k·gap초)에 예약, 화면은 같은 시각에(엔진 지연 반영). 피아노는 건반 시연에서만(pianoRun — 사용자 지정)
  function play(list, gap, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    list.forEach(function (m, k) {
      J.note(m, t0 + k * gap, 1.4, 0.6);
      later(function () { onEach(k); }, lead + k * gap * 1000);
    });
    return wait(lead + (list.length - 1) * gap * 1000);
  }
  // 스케일 재생 — 리하모니 화성학 1장 스케일과 같은 방식(chord-combo-lecture.js): 기타 소리, 서스테인 없이 레가토
  //  (각 음은 다음 음이 시작될 때까지만 울리고 0.18초 페이드 — 두 음 이상 쌓이지 않음), 마지막은 반드시 한 옥타브 위 1도(1.2초 + 0.8초 페이드).
  //  화면에 7음만 보여도 소리는 8음 — onEach(k)는 k = 0~7(7 = 옥타브 위 1도)
  function legato(midis, stepMs, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    midis.forEach(function (m, k) {
      const last = k === midis.length - 1;
      J.note(m, t0 + k * stepMs / 1000, last ? 1.2 : stepMs / 1000, last ? 0.8 : 0.18);
      later(function () { onEach(k); }, lead + k * stepMs);
    });
    return wait(lead + (midis.length - 1) * stepMs + 900);
  }
  // 건반 시연 전용 피아노 — 스케일과 같은 레가토 간격(각 음 = 다음 음이 시작될 때까지, 마지막 1.2초). 피아노 샘플러 자체 릴리스(1초, guitar-audio.js)는 그대로라 꼬리가 조금 겹침
  //  건반 색은 소리가 나는 동안만 잠깐(on → 다음 음에서 off, 마지막 음은 0.9초 뒤 off) — 건반을 계속 칠해 두지 않음(사용자 지정)
  function pianoRun(midis, stepMs, onEach) {
    const t0 = J.audioT0(), lead = J.leadMs();
    midis.forEach(function (m, k) {
      const last = k === midis.length - 1;
      J.piano(m, t0 + k * stepMs / 1000, last ? 1.2 : stepMs / 1000);
      later(function () {
        if (k) setCls(key(midis[k - 1]), 'is-focus', false);
        setCls(key(m), 'is-focus', true);
        if (onEach) onEach(k);
      }, lead + k * stepMs);
    });
    later(function () { setCls(key(midis[midis.length - 1]), 'is-focus', false); }, lead + (midis.length - 1) * stepMs + 900);
    return wait(lead + (midis.length - 1) * stepMs + 900);
  }
  const KB_RISE_DELAY_MS = 500;   // 음이름 줄이 사라지는 시간(--lec-fade 400ms) 뒤에 건반이 올라옴
  function oct(midis) { return midis.concat([midis[0] + 12]); }   // 7음 + 옥타브 위 1도

  // 음이름 줄 순서 바꾸기 — 층을 잠깐 끄고 칸을 새로 쓴 뒤 다시 켬
  function rowSwap(r) {
    return fx([$('n2-lrow')], 'is-on', false).then(function () { $('n2-row').innerHTML = rowHtml(r); return fx([$('n2-lrow')], 'is-on', true); });
  }

  // 건반에 스케일 짚기 — 소리 나는 건반만 잠깐 파랑 + 위에 순번 + 아래(이웃 사이)에 온/반(남음). 반음은 파랑
  function kbClear() { clearFocus(); setCls(q('.n2-key.is-scale'), 'is-scale', false); $('n2-knums').innerHTML = ''; $('n2-ksteps').innerHTML = ''; }
  function kbScale(midis, stepMs) {   // midis = 8음(옥타브 위 1도까지 — 건반에도 8번까지 표시)
    return pianoRun(midis, stepMs, function (k) {
      const m = midis[k];
      setCls(key(m), 'is-scale', true);   // 스케일 음 — 건반 이름을 진하게 남김(흰 건반 = 브랜드색, 검은 건반 = 흰색). 색칠(파랑)은 소리 날 때만
      const n = document.createElement('span');
      n.className = 'n2-knum';
      n.style.left = keyCx(m) + 'px';
      n.textContent = k + 1;
      $('n2-knums').appendChild(n);
      fx([n], 'is-in', true);
      if (k) {
        const half = m - midis[k - 1] === 1;
        const st = document.createElement('span');
        st.className = 'n2-kstep' + (half ? ' is-half' : '');
        st.style.left = (keyCx(midis[k - 1]) + keyCx(m)) / 2 + 'px';
        st.textContent = half ? '반' : '온';
        $('n2-ksteps').appendChild(st);
        fx([st], 'is-in', true);
      }
    });
  }

  // 지판에 음 점 찍기(점 안에 음이름) — 스케일 훈련 점(sfbNote) + 나타날 때 통통(.fb-note--placed와 같은 팝). 개방현은 빈 동그라미 안 힌트 글자를 걷고 테두리 원
  function gtrDot(sN, f, name) {
    if (!f) setCls(q('.n2-open[data-s="' + sN + '"]'), 'is-in', false);
    const el = sfbNote(sN, f, name, 'n2-pop', LEC_COLS);
    $('n2-neck').appendChild(el);
    return wait(200);
  }

  // ── 단계 (초안 2026-11-12 — 사용자가 화면을 보고 고치는 방식으로 진행) ──
  const steps = [
    // P1 도입 — 한 흐름(칸 하나). 핵심: 익숙한 계이름 → 기타는 계이름 대신 음이름
    Object.assign(J.chainSteps([
      // 핵심: 익숙한 것에서 출발 — 도~시가 하나씩(기타 레가토 + 옥타브 위 도)
      { text: '누구나 도레미파솔라시 음계는\n익숙할 거예요', run: function () {
        return fx([$('n2-lrow')], 'is-on', true).then(function () {
          return legato(oct(ROW_C.midi), 420, function (k) { if (k < 7) fx(part(k, 'syl'), 'is-in', true); });
        });
      } },
      { text: '보통 이걸 ' + em('계이름') + '이라고 하죠?', run: function () { return fx(syls(), 'is-focus', true); } },
      // 핵심: 기타에서는 계이름을 거의 안 씀 — 계이름이 옅어짐
      { text: '그런데 기타에서는 계이름을\n거의 보지 못할 거예요', run: function () {
        setCls(syls(), 'is-focus', false);
        return fx(syls(), 'is-dim', true);
      } },
      // 핵심: 대신 음이름(알파벳) — 계이름 위에 알파벳이 하나씩(파랑)
      { text: '대신 알파벳으로 된\n' + em('음이름') + '을 사용해요', run: function () {
        setCls(lets(), 'is-focus', true);
        return legato(oct(ROW_C.midi), 300, function (k) { if (k < 7) fx(part(k, 'let'), 'is-in', true); });
      } },
      { text: '이번 시간에는 음이름의 개념을 잡고\n익숙해지는 시간을 가질 거예요', run: function () { setCls(lets(), 'is-focus', false); } },
    ]), { ms: 24430 }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)

    // P2 음이름
    // 핵심: 음이름은 A~G 7개 — 줄을 A부터 다시 세우고 알파벳만 차례로
    { text: '음이름은 알파벳 A부터 G까지\n' + em('7개') + '를 사용해요!', ms: 3000, run: function () {
      return rowSwap(ROW_A).then(function () { return fx(lets(), 'is-in', true, 120); });
    } },
    // 핵심: A = 440Hz = 라 — A가 파랑·커지며 기타로 A, 아래에 440Hz와 '라'
    { text: '440Hz의 소리를 ' + em('A') + '라고 정했는데\n계이름으로는 \'라\'에 해당해요', ms: 3400, run: function () {
      setCls(part(0, 'let'), 'is-focus', true);
      return play([57], 0, function () { pop(part(0, 'let')); fx(q('.n2-hz'), 'is-in', true); })
        .then(function () { return wait(900); })
        .then(function () { return fx(part(0, 'syl'), 'is-in', true); });
    } },
    // 핵심: 음이름 ↔ 계이름 대응 — A=라부터 나머지 계이름이 차례로, 마지막 G=솔 강조
    { text: '라를 A로 시작해서 나열하면\n' + em('G') + '가 \'솔\'이 되는 거죠', ms: 4200, run: function () {
      setCls(part(0, 'let'), 'is-focus', false);
      return legato(ROW_A.midi, 420, function (k) { fx(part(k, 'syl'), 'is-in', true); })   // 스케일 시연이 아니라 A~G 나열 — G에서 끝(옥타브 위 A 없음, 사용자 지정). 마지막 G는 legato 규칙대로 1.2초
        .then(function () { setCls(part(6, 'let').concat(part(6, 'syl')), 'is-focus', true); return pop(part(6, 'let')); });
    } },
    // 핵심: 음이름 = 절대적인 음높이 → 모든 악기가 같은 이름을 씀. 소리·연출 없이 문구만(사용자 지정)
    Object.assign(J.chainSteps([
      { text: '음이름은 누구에게나 똑같은 주파수,\n' + em('절대적인 음높이') + '를 나타내요', enter: clearFocus, run: function () {} },
      { text: '그래서 기타뿐 아니라 모든 악기와 음악에서\n같은 음이름을 사용해요!', run: function () {} },
    ]), { ms: 7000 }),

    // P3 메이저스케일
    // 핵심: 도레미파솔라시 = 메이저스케일 = C D E F G A B → C로 시작하니 C 메이저스케일. 줄을 도레미 순으로 되돌림
    Object.assign(J.chainSteps([
      { text: '음악 시간에 배운 도레미파솔라시는\n' + em('메이저스케일') + '이라고 불러요', enter: clearFocus, run: function () {
        return rowSwap(ROW_C).then(function () { return legato(oct(ROW_C.midi), 420, function (k) { if (k < 7) fx(part(k, 'syl'), 'is-in', true); }); });
      } },
      { text: '이걸 음이름으로 나타내면\nC D E F G A B가 되겠죠?', run: function () {
        setCls(lets(), 'is-focus', true);
        return fx(lets(), 'is-in', true, 120);
      } },
      { text: 'C로 시작하니까 이 스케일은\n' + em('C 메이저스케일') + '이라고 불러요', run: function () {
        setCls(lets(), 'is-focus', false);
        setCls(part(0, 'let'), 'is-focus', true);
        return pop(part(0, 'let'));
      } },
    ]), { ms: 16060 }),   // ms = 가상 시계 측정값(2026-11-15 진행 바 마커가 칸 끝에서 먼저 멈추던 문제)
    // 핵심: 메이저 = 3·4번째, 7·8번째만 반음 — 피아노 건반에서 C부터 순번·온/반을 차례로(반은 파랑, 건반은 소리 날 때만 잠깐 칠함). 흰 건반만 쓴다는 것까지
    Object.assign(J.chainSteps([
      // [에셋 화면 정렬] 음이름 줄이 사라진 빈 화면에서 피아노 건반이 아래에서 올라온 뒤 문구(사용자 지정 2026-11-20) — 줄이 다 사라진 뒤(KB_RISE_DELAY_MS) 건반을 켬
      { text: '', gap: 1600, enter: function () {
        clearFocus(); setCls([$('n2-lrow')], 'is-on', false);
        later(function () { setCls([$('n2-lkb')], 'is-on', true); }, KB_RISE_DELAY_MS);
      }, run: function () {} },
      { text: '메이저스케일은 3·4번째, 7·8번째 음 사이만\n' + em('반음') + ', 나머지는 온음이에요',
        run: function () { return kbScale(SCALE_C, 450); } },
      { text: 'C 메이저스케일은 피아노에서\n' + em('흰 건반') + '에 해당해요', run: function () {
        return pop(q('.n2-kstep.is-half'));
      } },
    ]), { ms: 9870 }),
    // 핵심: 규칙만 알면 D 메이저도 찾는다 — D부터 같은 규칙으로 짚어 가면 F#·C#에서 검은 건반
    Object.assign(J.chainSteps([
      { text: '그럼 ' + em('D 메이저스케일') + '은 어떨까요?', enter: kbClear, run: function () {
        return pianoRun([62], 0);
      } },
      { text: '검은 건반이 섞여 어려울 수 있지만\n3·4, 7·8번째만 반음인 걸 알면 찾을 수 있어요', enter: kbClear, run: function () {
        return kbScale(SCALE_D, 450);
      } },
      { text: '검은 건반의 음은 F#, C#처럼\n' + em('#(샵)') + '을 붙여서 불러요', run: function () {
        return pianoRun([66, 73], 700);   // F#·C#을 다시 울리며 잠깐 파랑(이름 F#·C#은 칠해진 동안 보임)
      } },
      // 핵심: 지금은 메이저스케일을 다 외울 필요가 없음 — 부담을 덜어 줌(문구만, 사용자 지정 2026-11-20)
      { text: '지금 당장 모든 메이저스케일을\n외울 필요는 없어요', run: function () {} },
      { text: '이런 걸 메이저스케일이라 하는구나\n정도만 알아도 충분해요', run: function () {} },
    ]), { ms: 20270 }),

    // P4 기타에서
    // 핵심: 표준 튜닝 E A D G B E — 지판이 나오고 6번줄부터 한 줄씩 울리며 너트 왼쪽에 음이름
    Object.assign(J.chainSteps([
      { text: '이제 기타에서\nC 메이저스케일을 찾아봅시다!', enter: function () { kbClear(); setCls([$('n2-lkb')], 'is-on', false); },
        run: function () { return fx([$('n2-lfb')], 'is-on', true).then(function () { return fx(strs(), 'is-in', true, 80); }); } },
      { text: '그 전에, 기타는 6번줄부터\n' + em('E A D G B E') + ' 음으로 튜닝되어 있어요', run: function () {
        return play(OPEN_MIDI.slice().reverse(), 0.45, function (k) {
          const s = 6 - k;
          clearFocus();
          setCls(q('.fb-string[data-s="' + s + '"]').concat(q('.n2-open[data-s="' + s + '"]')), 'is-focus', true);
          fx(q('.n2-open[data-s="' + s + '"]'), 'is-in', true);
        }).then(function () { return wait(500); }).then(clearFocus);
      } },
      // 핵심: 1번줄과 6번줄은 같은 E
      { text: em('1번줄과 6번줄') + '의 음이 같죠!', run: function () {
        return play([OPEN_MIDI[5], OPEN_MIDI[0]], 0.9, function (k) {
          const s = k ? 1 : 6;
          setCls(q('.fb-string[data-s="' + s + '"]').concat(q('.n2-open[data-s="' + s + '"]')), 'is-focus', true);
          pop(q('.n2-open[data-s="' + s + '"]'));
        });
      } },
    ]), { ms: 13000 }),
    // 핵심: 기타의 C 메이저 위치 — 개방현 음이름(빈 동그라미 안)은 힌트로 계속 두고, 6번줄 E부터 1번줄 G까지 레가토로 울리며
    //  울리는 순서대로 점(점 안에 음이름)으로 채움 — 개방현도 빈 동그라미 자리에 점이 채워짐
    { text: '이걸 이용해서\nC 메이저스케일을 채워볼게요!', ms: 9600, enter: clearFocus, run: function () {
      return legato(GTR_C.map(function (n) { return OPEN_MIDI[n[0] - 1] + n[1]; }), 450, function (k) {
        const n = GTR_C[k];
        gtrDot(n[0], n[1], n[2]);   // 개방현도 울리는 순간 그 빈 동그라미 자리에 점이 채워짐(사용자 지정) — 힌트 음이름 위를 같은 음이름 점이 덮음
      });
    } },

    // 마무리 — 음이름은 앞으로 계속 나옴 → 퀴즈로 반복해서 외우기
    Object.assign(J.chainSteps([
      { text: '음이름이 아직은 어색하고\n바로 떠오르지 않을 거예요', run: function () {} },
      { text: '하지만 앞으로 계속 나올테니까\n피할 수 없다면 즐겨야겠죠!', run: function () {} },
      { text: '그래서 음이름을 쉽게 익힐 수 있도록\n퀴즈를 준비했어요!', run: function () {} },
      { text: '퀴즈를 풀다 보면 자연스럽게\n음이름에 익숙해져 있을 거예요', run: function () {} },
      { text: '그럼 퀴즈를 시작해볼까요?', run: function () {} },
    ]), { ms: 11000 }),
  ];
  const groups = [[0], [1, 2, 3, 4], [5, 6, 7], [8, 9, 10]];


  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D1(fretboard-reading.js) 퀴즈 엔진을 복사해 유형만 바꿈. 별 진행·피크·오답풀이·이어 풀기·오버레이는 D1과 같음(노드 경제 기획안 §1-1·§1-4)
  //   문제 수: 별 1 10 / 별 2 15 / 별 3 15(사용자 지정 — 별마다 출제 범위 차이는 없음)
  //   유형(① : ② = 반반, 순서 섞음 — 사용자 지정. ③④는 2026-11-20 제외):
  //     ① 음이름 ↔ 계이름 — 코드 맞추기 문제 화면 템플릿(문제 카드 + 말풍선 + 2×2 텍스트 카드, 누르는 즉시 채점). 12음 전부, 검은 건반은 #·b을 섞어 출제(도# / 레b)
  //     ② 지판에서 음이름 찾기 — 0~3프렛 전 자리에 고스트 노트, 개방현은 빈 동그라미 + 왼쪽에 표준 튜닝 음(힌트). 그 음이 있는 자리를 전부 골라 제출하기
  //        (출제 음은 자연음 7개 — 강의가 자연음만 다뤘음. 정답 자리 2~3개)
  //     (제외 2026-11-20 — 노드2엔 어려움) ③ C 메이저스케일에 없는 음 고르기 / ④ D 메이저스케일에 없는 음 고르기 — ①과 같은 템플릿(스케일 음 3 + 스케일 밖 음 1)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:note-names(D1 저장분과 따로)
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_CFG = { 1: { n: 10 }, 2: { n: 15 }, 3: { n: 15 } };   // 별 → 문제 수
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  function qzRefundAmount() { return typeof jnyQuizRefund === 'function' ? jnyQuizRefund() : 4; }   // 정답 5개마다 돌려주는 수 — 기본 4(사용자 지정 2026-11-12), 2×2 실험 그룹이면 +4/+3(shared.js jnyQuizRefund, 2026-11-27)
  function netCost() { return Math.max(0, qz.qs.length - qzRefundAmount() * Math.floor(qz.qs.length / QZ_REFUND_EVERY)); }   // 퀴즈 1회 최종 순소모 = 5문제당 (5 − 환급량) — +4면 1, +3이면 2
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'note-names';
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

  // ── 음 표기 — 피치 클래스(0 = C) ↔ 이름. 검은 건반은 #(아래 흰 건반 기준) 또는 b(위 흰 건반 기준) ──
  const PC_NAT = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
  const SYL = { C: '도', D: '레', E: '미', F: '파', G: '솔', A: '라', B: '시' };
  function isBlackPc(pc) { return PC_NAT[pc] === undefined; }
  function spell(pc, acc) { return !isBlackPc(pc) ? PC_NAT[pc] : acc === 'b' ? PC_NAT[(pc + 1) % 12] + 'b' : PC_NAT[(pc + 11) % 12] + '#'; }
  function rndAcc() { return rnd(2) ? '#' : 'b'; }
  function sylOf(name) { return SYL[name[0]] + name.slice(1); }   // C# → 도#, Db → 레b
  const QZ_FRETS = 3;   // 찾기 유형 지판 0~3프렛(사용자 지정) — 출제 음은 자연음만
  const QZ_COLS = QZ_FRETS + 2;   // 개방현 칸 + 1~3프렛 + 사라지는 4프렛 칸

  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 보기·순서·정답 자리도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  function makeQuestions(n) {
    const n1 = Math.ceil(n / 2), n2 = n - n1;   // ① 음이름 ↔ 계이름 : ② 지판에서 찾기 = 반반(③④ 스케일에 없는 음 고르기는 노드2에선 어려워서 뺌 — 사용자 지정 2026-11-20)
    const qs = [];
    const pcs = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (let k = 0; k < n1; k++) qs.push(mkName(pcs[k % 12]));
    const nats = shuffle([0, 2, 4, 5, 7, 9, 11]);
    for (let k = 0; k < n2; k++) qs.push(mkFind(nats[k % 7]));
    return J.noRepeat(shuffle(qs));   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
  }
  // ① 음이름 ↔ 계이름 — 보기 4개는 서로 다른 음(같은 음의 다른 표기 #/b가 보기에 같이 나오지 않게). 문제 음의 #/b 표기를 정답도 그대로 씀
  function mkName(pc) {
    const toSyl = rnd(2) === 0;   // true = 음이름을 보고 계이름 고르기
    const set = [pc];
    while (set.length < 4) { const p = rnd(12); if (set.indexOf(p) < 0) set.push(p); }
    const names = set.map(function (p) { return spell(p, rndAcc()); });
    const show = function (nm) { return toSyl ? sylOf(nm) : nm; };
    return { type: 'name', toSyl: toSyl, q: toSyl ? names[0] : sylOf(names[0]), answer: show(names[0]), choices: shuffle(names.map(show)) };
  }
  // ② 지판에서 찾기 — 0~3프렛에서 그 음이 있는 자리 전부가 정답
  function mkFind(pc) {
    const ans = [];
    for (let s = 1; s <= 6; s++) for (let f = 0; f <= QZ_FRETS; f++) if ((OPEN_MIDI[s - 1] + f) % 12 === pc) ans.push(s + '-' + f);
    return { type: 'find', name: PC_NAT[pc], ans: ans };
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
  //  ①③④ = 코드 맞추기 문제 화면 템플릿(문제 카드 .ms-quiz-question-card + 말풍선 + 2×2 .ms-quiz-choice-card) — 누르는 즉시 채점, 버튼은 채점 뒤 '다음'
  //  ② = 안내 카드 + 지판 + 제출하기
  const QZ_TITLES = { name: '알맞은 답을 고르세요', find: '알맞은 답을 모두 고르세요', scale: '알맞은 답을 고르세요' };   // 타이틀은 일반 문구(사용자 지정) — 문제 내용은 카드에

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
  // ② 지판 — 스케일 훈련 퀴즈 지판과 최대한 동일하게(사용자 지정): 크기도 같은 규칙 — 기준 폭 = 본문 폭(최대 520px, scale-level.js computeTestFbScale)의 7칸.
  //  그중 앞 5칸(개방현 + 1~3프렛 + 흐려지는 4프렛 칸)만 보임. 개방현 = 빈 동그라미 + 왼쪽에 표준 튜닝 음(힌트), 1~3프렛 모든 자리에 고스트 노트(.fb-note--ghost)
  //  크기는 화면 단계(스타일 가이드 §4 5단계)마다 조금씩 커짐(사용자 지정) — 기준 폭(7칸) 고정값. 1단계 328px = 360px 폰에서 스케일 훈련 퀴즈 지판과 같은 크기(확인된 크기)
  //   단계: ~480 / 481~768 / 769~1079 / 1080~1599 / 1600~ → 기준 폭 328 / 376 / 424 / 472 / 520(최대 = 스케일 훈련 TEST_FB_MAX_WIDTH). 본문 폭보다 크면 본문 폭
  const QZ_FB_TIER_W = [[480, 328], [768, 376], [1079, 424], [1599, 472], [Infinity, 520]];
  function quizBoardW() {
    const vw = window.innerWidth;
    return Math.min($('jq-content').clientWidth, QZ_FB_TIER_W.find(function (t) { return vw <= t[0]; })[1]);
  }
  function mountQuizBoard() {
    $('n2q-slot').innerHTML = sfbHtml('n2q-neck', quizBoardW(), SFB_MAX_W, { cols: QZ_COLS, tune: true, ghost: true });
  }
  // 창 크기가 바뀌면(회전·브라우저 창 조절) 그려 둔 지판의 크기만 다시 맞춤 — 고른 점·채점 표시는 그대로(위치가 %라서).
  //  예전엔 문제를 그릴 때 한 번만 크기를 정해서, 단계 경계를 넘겨도 다음 문제 전까지 같은 크기로 고정돼 있었음
  let sfbRT = null;
  window.addEventListener('resize', function () {
    clearTimeout(sfbRT);
    sfbRT = setTimeout(function () {
      const qb = document.querySelector('#n2q-slot .n2-sfb');
      if (qb) qb.style.cssText = sfbSizeStyle(quizBoardW(), SFB_MAX_W, QZ_COLS);
      const lb = document.querySelector('#n2-lfb .n2-sfb'), st = $('combo-v2-lec-stage');
      if (lb && st) lb.style.cssText = sfbSizeStyle(st.clientWidth || (window.innerWidth - 32), LEC_FB_MAX_W, LEC_COLS);
    }, 120);
  });
  function bindChoices() {
    $('jq-content').querySelector('.jq-cq-choices').addEventListener('click', function (e) { const b = e.target.closest('.ms-quiz-choice-card'); if (b) cardJudge(b); });
  }

  function render() {
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();   // 문제가 바뀜 → 앞 문제에서 누른 음 하드컷(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    const it = cur(), box = $('jq-content');
    findSel = {};
    $('jq-title').textContent = QZ_TITLES[it.type];
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'name') {
      box.innerHTML = cardQuizHtml(it.toSyl ? '음이름' : '계이름', it.q, '', it.toSyl ? '알맞은 계이름을 고르세요' : '알맞은 음이름을 고르세요', it.choices, true);
      bindChoices();
    } else if (it.type === 'scale') {   // 출제는 안 함(2026-11-20 제외) — 그 전에 저장된 이어 풀기 문제만 이 화면으로
      box.innerHTML = cardQuizHtml('', it.key + ' 메이저스케일이 <em class="jq-qem">아닌</em> 음을<br>골라주세요', '', '', it.choices, false);   // 문제 문장을 카드에(사용자 지정) — '아닌' 강조
      bindChoices();
    } else {
      box.innerHTML = infoCard('표시된 곳에서', it.name + '음을', '모두 찾아주세요') + '<div class="jq-board" id="n2q-slot"></div>';
      mountQuizBoard();   // 빈 자리를 먼저 놓고 실제 남은 공간을 재서 지판 크기를 정함
      $('n2q-neck').addEventListener('click', findTap);
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

  // ①③④ 보기를 누르면 바로 채점 — 코드 맞추기와 같은 정답(초록)·오답(빨강) 링, 보기는 잠김
  function cardJudge(b) {
    if (!qz || qz.judged) return;
    const it = cur(), ok = b.dataset.v === it.answer;
    $('jq-content').querySelectorAll('.ms-quiz-choice-card').forEach(function (c) {
      if (c.dataset.v === it.answer) c.classList.add('ms-quiz-choice-card--correct');
      else if (c === b) c.classList.add('ms-quiz-choice-card--wrong');
    });
    $('jq-content').querySelector('.jq-cq-choices').classList.add('is-locked');
    verdict(ok);
  }
  // ② 지판 누르기 — 스케일 훈련 테스트와 같은 조작: 칸을 누르면 점(.fb-note--placed) + 그 자리 소리, 다시 누르면 지움. 개방현은 빈 동그라미를 가리고 점. 하나라도 고르면 제출하기
  let findSel = {};
  function findPos(e) {
    const r = $('n2q-neck').getBoundingClientRect();
    const c = Math.floor((e.clientX - r.left) / r.width * QZ_COLS);
    const sN = Math.floor((e.clientY - r.top) / r.height * 6) + 1;
    if (c < 0 || c > QZ_FRETS || sN < 1 || sN > 6) return null;   // 사라지는 마지막 칸은 무시
    return [sN, c];
  }
  function openHint(sN, show) {
    const h = $('n2q-neck').querySelector('.fb-open-hint[data-s="' + sN + '"]');
    if (h) h.style.display = show ? '' : 'none';
  }
  function findTap(e) {
    if (!qz || qz.judged) return;
    const p = findPos(e);
    if (!p) return;
    const k = p[0] + '-' + p[1];
    if (findSel[k]) { findSel[k].remove(); delete findSel[k]; if (!p[1]) openHint(p[0], true); }
    else {
      J.note(OPEN_MIDI[p[0] - 1] + p[1], J.audioT0(), 1.4, 0.6);
      if (!p[1]) openHint(p[0], false);
      const d = sfbNote(p[0], p[1], '', 'fb-note--placed', QZ_COLS);
      d.className = 'fb-note fb-note--placed';   // 스케일 테스트처럼 개방현 자리도 같은 점(테두리 원 아님)
      $('n2q-neck').appendChild(d);
      findSel[k] = d;
    }
    qBtn('제출하기', Object.keys(findSel).length > 0);
  }
  // 제출 — 고른 자리 = 정답 자리 전부일 때만 정답. 스케일 훈련 채점과 같은 표시: 맞게 고른 자리 = 초록(--correct), 잘못 고른 자리 = 빨강(--wrong), 못 찾은 자리 = 점선 원(--missed)
  function findJudge() {
    const it = cur(), picked = Object.keys(findSel);
    const ok = picked.length === it.ans.length && picked.every(function (k) { return it.ans.indexOf(k) >= 0; });
    picked.forEach(function (k) {
      const d = findSel[k];
      d.classList.remove('fb-note--placed');
      if (it.ans.indexOf(k) >= 0) d.classList.add('fb-note--correct');
      else d.classList.add('fb-note--wrong');
    });
    it.ans.forEach(function (k) {
      if (findSel[k]) return;
      const sf = k.split('-');
      if (+sf[1] === 0) openHint(+sf[0], false);
      const d = sfbNote(+sf[0], +sf[1], '', '', QZ_COLS);
      d.className = 'fb-note fb-note--missed';
      $('n2q-neck').appendChild(d);
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
      if (cur().type === 'find' && Object.keys(findSel).length) findJudge();
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
    $('combo-v2-clear-level').textContent = '음이름과 메이저스케일 · 퀴즈 ' + qz.star;
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
    qz = { star: star, qs: makeQuestions(QZ_STAR_CFG[star].n), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false, at: Date.now() };
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

  J.register('note-names', { steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 10, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 10 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
