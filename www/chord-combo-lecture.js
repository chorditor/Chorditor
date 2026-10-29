// ───────────────────────────────────────────────────────────
// 리하모니 화성학 — 챕터 미니강의(모션그래픽 강의)
//   스케일 훈련 "?" 튜토리얼(scale-level.js showTutorialStep)과 같은 진행 방식이되, 본체는 연출이고 문구는 위쪽의 작은 보조 캡션이다.
//   단계가 시작되면 캡션(0.5s 페이드)과 연출·소리가 동시에 시작 → 끝나면 +0.1초에 "다음" 활성화(style-guide §18). 단, 12단계를 묶음(GROUPS_CH1)으로 나눠
//   "다음"은 묶음의 마지막 단계가 끝나야 켜지고, 묶음 안의 단계는 앞 단계가 끝나면(최소 2초) 버튼 없이 자동으로 이어진다.
//   "다음"을 누르면 울리던 소리는 짧은 페이드로 끊고 다음 단계로.
//   지금은 챕터 1·2·3·4·5·6이 있다(LECTURES[1~6]). 강의를 만든 챕터는 chord-combo.js의 COMBO_V2_LECTURE_READY에도 추가.
//   chord-combo.js의 진행도 함수(_comboV2ProgLoad/Save·_comboV2RenderProgress), 챕터 판정(_comboV2LectureDone), 스크롤(_comboV2ScrollToChapter)을 그대로 쓴다.
//
//   화면 원칙(CLAUDE.md 0-5): 단계마다 "핵심"을 정하고 그것만 진하게/파랑, 나머지는 옅게. 요소는 자리를 옮기지 않고 투명도·색으로만 등장·강조·교체
//   (최종 구성의 높이를 처음부터 잡아 둠 → 단계가 바뀌어도 화면이 움직이지 않음).
//
//   이탈(CLAUDE.md 0-2): 탑바 X·Android 뒤로가기(handleComboBack → comboV2LectureBack)는 확인 모달 후, 홈/앱 전환(visibilitychange)·
//   탭 닫기/새로고침/페이지 이동(pagehide)은 확인 없이 — 모두 abort() 하나로 처리(소리 하드컷 panic/resetPiano, 타이머·애니메이션 취소, 처음 상태로 초기화).
//   정리 뒤에 도착하는 늦은 콜백은 세대 번호(L.tok)로 막는다. 이 강의는 "처음부터" 정책(다시 열면 1단계부터).
//   수강 완료는 마지막 "완료"를 눌렀을 때만 기록(진행도 객체의 _lec 배열). 중간 이탈은 기록하지 않는다.
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── 소리 데이터 ──
  // 스케일: 5번줄 3프랫(C3 = MIDI 48)부터 위로 7음 + 한 옥타브 위 도(C4 = 60)
  const SCALE_MIDI = [48, 50, 52, 53, 55, 57, 59, 60];
  // 코드 7개 — 지정한 오픈 보이싱(줄 6→1, -1 = 안 침). 줄 개방음 MIDI: E2 A2 D3 G3 B3 E4
  const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
  const VOICINGS = {
    C: [-1, 3, 2, 0, 1, 0],
    Dm: [-1, -1, 0, 2, 3, 1],
    Em: [0, 2, 2, 0, 0, 0],
    F: [1, 3, 3, 2, 1, 1],
    G: [3, 2, 0, 0, 0, 3],
    Am: [-1, 0, 2, 2, 1, 0],
    Bdim: [-1, 2, 3, 4, 3, -1],
  };
  function fretsToMidis(frets) {
    const out = [];
    frets.forEach(function (f, i) { if (f >= 0) out.push(OPEN_STRINGS[i] + f); });
    return out;
  }
  const C_NAMES = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'];
  const D_NAMES = ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'];   // 열 간격 40px에서 C#dim(16px 굵게 약 49px)은 맨 오른쪽이고 왼쪽 이웃 Bm이 짧아 겹치지 않음
  const ROMANS = ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VIIdim'];
  const ROWS = {   // 위에서 아래로 한 칸씩 건너뛰며 쌓는 세 줄(루트 줄 / 둘째 줄 / 셋째 줄) — 줄은 아래로 쌓임
    1: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    2: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
    3: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
  };
  // 문구 안에서 강조할 부분 — 따옴표 대신 파랑(.lec-em). 문구는 코드 안의 고정 문자열이라 innerHTML로 넣어도 안전
  function em(s) { return '<span class="lec-em">' + s + '</span>'; }
  // 한국어 낱말 아래에 영어를 작은 라벨로 덧붙임 — 라벨은 줄 높이에 안 들어가(한국어 문장 기준 행간 그대로) 줄 아래 빈 자리에 걸쳐 놓임. 문구의 마지막 줄에만 쓸 것(아래 줄이 있으면 겹침)
  function an(ko, en) { return '<span class="lec-an">' + ko + '<span class="lec-al">' + en + '</span></span>'; }
  // 마무리 단계 — 모든 챕터 강의가 공통으로 쓴다(챕터 번호만 바뀜). 버튼은 마지막 묶음이라 "완료"
  function endingStep(n) {
    return { text: '수고하셨습니다!\n완료 버튼을 눌러서 ' + n + '장 훈련을 시작해봐요!', run: function () { return Promise.resolve(); } };
  }
  function romanHtml(r) {   // 'VIIdim' → 숫자 부분은 크게(VII), 품질은 작게(dim)
    const m = /^([IV]+)(.*)$/.exec(r);
    return m[1] + (m[2] ? '<span class="lec-rq">' + m[2] + '</span>' : '');
  }

  // 반짝반짝 작은별 — 80 BPM. 코드는 기타, 멜로디는 피아노(C4=60). 가사 한 글자 = 멜로디 한 음
  const SONG_BEAT = 60 / 80;
  const SONG_CHORDS = [['C', 0, 4], ['F', 4, 2], ['C', 6, 2], ['F', 8, 2], ['C', 10, 2], ['G', 12, 2], ['C', 14, 2]];   // [코드, 시작 박, 박 수]
  const SONG_MELODY = [[60, 0, 1], [60, 1, 1], [67, 2, 1], [67, 3, 1], [69, 4, 1], [69, 5, 1], [67, 6, 2],
                       [65, 8, 1], [65, 9, 1], [64, 10, 1], [64, 11, 1], [62, 12, 1], [62, 13, 1], [60, 14, 2]];   // [MIDI, 시작 박, 박 수]
  const SONG_SYL = ['반', '짝', '반', '짝', '작', '은', '별', '아', '름', '답', '게', '비', '치', '네'];
  const SONG_AFTER = { 3: ' ', 5: ' ', 6: '\n', 10: ' ' };   // 이 글자 뒤에 띄어쓰기/줄바꿈 — "반짝반짝 작은 별 / 아름답게 비치네"
  const SONG_COL = { C: 0, F: 3, G: 4 };   // 노래에 쓰인 코드 → 위 7묶음의 열 번호
  const SONG_BEATS = 16;
  // 동요 음량 균형 — 기타는 컴프레서를 거쳐서 벨로시티로는 안 줄어들어 컴프레서 뒤에서 줄이고(0~1, 1 = 원래), 피아노는 출력 게인을 올림(기본 0.6)
  const SONG_GUITAR_TRIM = 0.3;
  const SONG_PIANO_GAIN = 1.4;

  // 문구는 여유 있게(읽는 시간·단계 사이 간격·페이드를 길게), 연출 자체(등장·전환·교체·회전)는 처음 속도 그대로 빠르게 — 이징은 시작이 빠르고 끝이 부드럽게 멈추는 곡선 위주
  const OPEN_DELAY_MS = 800;    // 본문이 올라온 뒤 첫 단계 시작까지
  const NEXT_BUFFER_MS = 100;   // 연출이 실제로 끝난 뒤 이만큼 있다가 "다음" 활성화 (style-guide §18)
  const AUTO_GAP_MS = 400;      // 묶음 안에서 앞 단계가 끝난 뒤 다음 단계가 자동으로 시작되기까지의 간격
  const CAPTION_LEAD_MS = 1000; // 문구가 뜬 뒤 연출·소리가 시작되기까지(문구 페이드 0.5초 + 읽는 시간 0.5초)
  const MIN_STEP_MS = 2000;     // 단계가 시작된 뒤 최소 이만큼은 지나야 "다음" 활성화 — 연출이 짧은 단계도 읽을 시간 확보
  const CAPTION_GAP_MIN_MS = 3000; // 문구가 뜬 뒤 같은 묶음의 다음 문구가 뜨기까지 최소 간격(문구가 있는 단계에만) — 이보다 짧게 이어지지 않음. 새 강의·새 단계에도 자동 적용, 문구가 너무 빠르면 이 값만 키울 것. 묶음 끝의 "다음" 활성화도 이 시간 뒤
  const STEP_FAILSAFE_MS = 20000; // 연출이 어떤 이유로 안 끝나도(샘플 로딩 실패 등) 이 시간 뒤엔 "다음"이 켜짐 — 영영 안 켜지는 일 방지(가장 긴 동요 단계도 약 13초)
  const READY_TIMEOUT_MS = 3000;  // 소리 샘플 준비를 기다리는 최대 시간 — 넘으면 소리 없이라도 진행
  const LEC_SLIDE_MS = 340;      // 본문 슬라이드(0.32s, CSS .combo-v2-lec-body) + 여유 — 닫힌 뒤 내용 초기화 시점
  const FADE_MS = 400;          // 등장·옅어짐 전환 시간 — CSS 변수 --lec-fade로 넘겨 단일 출처
  const SPREAD_MS = 500;        // 음이 줄어들며 열이 벌어지는 전환 시간 — CSS 변수 --lec-spread로 넘김
  const AUDIO_LEAD_S = 0.12;    // 소리를 지금보다 이만큼 뒤로 예약(초)
  // 화면 연출을 소리와 맞추는 지연(ms). Tone.now()에는 lookAhead(기본 0.1초)가 이미 더해져 있어서 소리는 "예약 지연 + lookAhead" 뒤에 실제로 울림 →
  // 화면 지연을 고정 120ms로 두면 화면이 소리보다 약 100ms 먼저 나옴. 강의를 열 때 실제 lookAhead를 읽어 갱신
  let LEAD_MS = 220;

  // ── 상태 ──
  // gen: 묶음이 바뀔 때마다 올라가는 번호 — 이전 묶음에서 늦게 도착한 콜백이 "다음"을 켜지 못하게 막음 / ready: 지금 묶음이 끝나서 "다음"을 눌러도 되는 상태 / watch: ready가 아닐 때 버튼을 강제로 꺼 두는 감시 타이머
  const L = { open: false, ch: 0, step: -1, group: -1, gen: 0, ready: false, watch: null, tok: 0, timers: [], pend: new Map(), rewatch: false, skipping: false, draining: false, vnow: 0, vid: 0, anims: [], sounded: false, pianoUsed: false, trimmed: false, resetTimer: null };

  // 동요에서 줄였던 기타 출력을 되돌림 — 소리가 짧은 페이드로 끊긴 뒤에(그 사이 갑자기 커지지 않게). 하드컷(panic)은 스스로 되돌림
  function releaseTrim(hard) {
    if (!L.trimmed) return;
    L.trimmed = false;
    if (hard) return;
    setTimeout(function () { if (typeof GuitarAudio !== 'undefined' && !L.trimmed) GuitarAudio.setOutputTrim(1); }, 150);
  }

  function $(id) { return document.getElementById(id); }
  // 강의 중에는 페이지 탑바의 피크 개수를 숨김(강의는 피크를 쓰지 않음) — CSS .combo-topbar.is-lec
  function setTopbarLec(on) { const t = document.querySelector('.combo-topbar'); if (t) t.classList.toggle('is-lec', on); }
  const NEVER = function () { return new Promise(function () {}); };   // 정리된 뒤에는 이어지지 않는 약속

  // 타이머 — 세대 번호가 바뀌었으면 실행하지 않음
  // 예약한 콜백(pend)은 원래 실행 시각(at)과 함께 기억해 둠 — 이미 본 강의를 터치로 건너뛸 때(skipGroup) 시각 순서대로 한꺼번에 실행하기 위해
  function later(fn, ms) {
    const tok = L.tok;
    if (L.skipping) {   // 건너뛰는 중: 실제로 기다리지 않고 가상 시각(vnow + ms)에 예약 — drainSkip이 시각 순서대로 곧바로 실행
      const r0 = { fn: fn, at: L.vnow + ms, id: --L.vid };
      L.pend.set(r0.id, r0);
      drainSkip();
      return r0.id;
    }
    const rec = { fn: fn, at: Date.now() + ms };
    const id = setTimeout(function () { L.pend.delete(id); if (tok === L.tok) fn(); }, ms);
    rec.id = id;
    L.pend.set(id, rec);
    L.timers.push(id);
    return id;
  }
  function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
  // 연출이 안 끝날 때를 대비한 안전 타이머 — 건너뛰기(skipGroup)가 예약 콜백을 한꺼번에 실행할 때 이것까지 실행하면 연출이 끝나기 전에 "끝났다"고 판단하므로 later()를 거치지 않음
  function failsafe(ms) { return new Promise(function (res) { L.timers.push(setTimeout(res, ms)); }); }
  // 약속이 ms 안에 안 풀려도(또는 실패해도) 풀어 줌 — 소리 샘플 로딩이 막혀 강의가 멈추는 것을 방지
  function withTimeout(p, ms) {
    return new Promise(function (res) {
      let settled = false;
      const t = setTimeout(function () { if (!settled) { settled = true; res(); } }, ms);
      const fin = function () { if (!settled) { settled = true; clearTimeout(t); res(); } };
      Promise.resolve(p).then(fin, fin);
    });
  }
  // 건너뛰는 중에는 애니메이션 종료 이벤트(다음 프레임에 도착)를 기다리지 않고 onfinish를 곧바로(마이크로태스크) 부름 — 기다리면 그 사이 다음 단계가 시작돼
  // 늦게 도착한 콜백이 글자·위치를 뒤늦게/엉뚱한 순서로 바꾸거나 일반 속도 애니메이션을 만들어 표시가 누락·지연됨. 한 번만 부르도록 onfinish는 비움
  function fireFinish(a, tok) {
    Promise.resolve().then(function () {
      if (tok !== L.tok) return;
      const h = a.onfinish;
      a.onfinish = null;
      if (h) { try { h.call(a); } catch (e) { console.error('[combo-lecture] onfinish 오류', e); } }
    });
  }
  // 애니메이션 — 목록에 모아 두었다가 정리 때 한꺼번에 취소
  function anim(el, frames, opts) {
    const a = el.animate(frames, L.skipping ? Object.assign({}, opts, { duration: 0, delay: 0 }) : opts);   // 건너뛰는 중엔 길이 0 — 끝 상태로 바로
    L.anims = L.anims.filter(function (x) { return x.playState !== 'idle' && x.playState !== 'finished'; });   // 끝난 것은 목록에서 뺌
    L.anims.push(a);
    if (L.skipping) fireFinish(a, L.tok);
    return a;
  }

  // ── 소리 ──
  function audioT0() { return Tone.now() + AUDIO_LEAD_S; }
  function strum(midis, t, dur, rel, mode) {   // mode: 'weak'이면 약한 세기(벨로시티 0.4~0.72, 기본은 0.45~1.0)
    if (L.skipping) return;
    L.sounded = true;
    GuitarAudio.strumAt(midis, 0.012, t, dur, rel, mode);
  }
  function note(midi, t, dur, rel) {
    if (L.skipping) return;
    L.sounded = true;
    GuitarAudio.strumAt([midi], 0, t, dur, rel);
  }
  function piano(midi, t, dur) {
    if (L.skipping) return;
    L.pianoUsed = true;
    GuitarAudio.playPianoChord([midi], dur, t, 1);   // 동요 멜로디가 기타 코드에 묻히지 않게 최대 세기(피아노 출력 게인은 다른 곳과 공용이라 건드리지 않음)
  }

  // ── 무대 ──
  function grid() { return $('lec-grid'); }
  function cols() { return Array.prototype.slice.call(document.querySelectorAll('#lec-grid .lec-col')); }
  function rowOf(row) { return cols().map(function (c) { return c.querySelector('.lec-note[data-row="' + row + '"]'); }); }
  function allNotes() { return rowOf(1).concat(rowOf(2), rowOf(3)); }
  function nums() { return cols().map(function (c) { return c.querySelector('.lec-num'); }); }
  function names() { return cols().map(function (c) { return c.querySelector('.lec-name'); }); }
  // 최종 구성(코드명 → 번호 → 음 3줄 + 가사 두 줄)의 자리를 처음부터 모두 잡아 둠 — 중요한 것(이름·번호)이 맨 위, 요소는 투명도로만 나타나서 위치가 안 움직임
  function buildStage() {
    let colHtml = '';
    for (let i = 0; i < 7; i++) {
      colHtml += '<div class="lec-col"><span class="lec-name">&nbsp;</span><span class="lec-num">&nbsp;</span><div class="lec-stack">' +
        '<span class="lec-note" data-row="1">&nbsp;</span><span class="lec-note" data-row="2">&nbsp;</span><span class="lec-note" data-row="3">&nbsp;</span>' +
        '</div></div>';
    }
    $('combo-v2-lec-stage').innerHTML = '<div class="lec-grid" id="lec-grid">' + colHtml + '</div><div class="lec-lyrics" id="lec-lyrics">&nbsp;<br>&nbsp;</div>';
  }
  // 챕터 2 무대 — 두 층(.lec2-a: 코드 7개 + 기능 분류판 + 겹치는 음 비교 / .lec2-b: 작은별 진행 두 줄 + 가사)을 같은 칸에 겹쳐 두고 투명도로만 전환.
  // 코드 줄(#lec-grid)은 1장과 같은 구조(이름 → 번호 → 음)에 음 줄만 4개라서 hot()·rowOf() 등을 그대로 씀
  function buildStage2() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2');
    let colHtml = '';
    for (let i = 0; i < 7; i++) {
      colHtml += '<div class="lec-col"><span class="lec-name">&nbsp;</span><span class="lec-num">&nbsp;</span><div class="lec-stack">' +
        [1, 2, 3, 4].map(function (r) { return '<span class="lec-note" data-row="' + r + '">&nbsp;</span>'; }).join('') + '</div></div>';
    }
    const board = FUNCS.map(function (f, i) {
      return '<div class="lec2-fcol" data-f="' + i + '"><span class="lec2-fhead">' + f.head + '</span><span class="lec2-fsub">' + f.sub + '</span><div class="lec2-cells">' +
        f.chords.map(function (c) { return '<span class="lec2-cell" data-ch="' + c + '">' + c + '</span>'; }).join('') + '</div></div>';
    }).join('');
    const cmp = CMP_ROWS.map(function (r) {
      return '<span class="lec2-c lec2-c-name">' + r[0] + '</span>' + r[1].map(function (n) { return '<span class="lec2-c">' + n + '</span>'; }).join('');
    }).join('');
    const orig = SONG2_ORIG.map(function (c) {
      return '<div class="lec2-slot"><span class="lec2-sname">' + c + '</span><span class="lec2-slab lec2-fn' + FUNC_IDX[c] + '">' + FUNC_OF[c] + '</span></div>';
    }).join('');
    const neu = SONG2_NEW.map(function (c) { return '<div class="lec2-slot"><span class="lec2-sname lec2-fn' + FUNC_IDX[c] + '">' + c + '</span></div>'; }).join('');   // 새 진행은 코드마다 기능 색
    stage.innerHTML =
      '<div class="lec2-a is-on" id="lec2-a"><div class="lec-grid lec2-grid" id="lec-grid">' + colHtml + '</div>' +
        '<div class="lec2-board" id="lec2-board">' + board + '</div><div class="lec2-cmp" id="lec2-cmp">' + cmp + '</div></div>' +
      '<div class="lec2-b" id="lec2-b"><div class="lec2-prog" id="lec2-orig">' + orig + '</div><div class="lec2-prog" id="lec2-new">' + neu + '</div>' +
        '<div class="lec-lyrics" id="lec-lyrics">&nbsp;<br>&nbsp;</div></div>';
  }
  // 상태 클래스를 요소마다 stagger(ms)씩 늦춰 차례로 켜고/끔(CSS 전환 + transition-delay). 전환이 끝나면 풀리는 약속을 돌려줌
  function fx(els, classes, on, stagger) {
    const st = stagger || 0;
    els.forEach(function (el, i) {
      el.style.transitionDelay = (i * st) + 'ms';
      [].concat(classes).forEach(function (c) { el.classList.toggle(c, on); });
    });
    const total = Math.max(0, els.length - 1) * st + FADE_MS;
    later(function () { clearDelays(); }, total + 30);
    return wait(total);
  }
  function clearDelays() {
    document.querySelectorAll('#combo-v2-lec-stage [style*="transition-delay"]').forEach(function (el) { el.style.transitionDelay = ''; });
  }
  // 이징: 들어갈 땐 천천히 가속(EASE_IN), 나올 땐 빠르게 시작해 부드럽게 멈춤(EASE_OUT, easeOutCubic)
  const EASE_IN = 'cubic-bezier(0.32, 0, 0.67, 0)';
  const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
  // 글자 교체: 같은 자리에서 사라졌다가(150ms) 내용을 바꾸고 나타남(200ms) — 크기·위치 변화 없음
  function swap(el, apply, delay) {
    return new Promise(function (res) {
      const o = getComputedStyle(el).opacity;
      const a1 = anim(el, [{ opacity: o }, { opacity: 0 }], { duration: 150, delay: delay || 0, easing: EASE_IN, fill: 'both' });
      a1.onfinish = function () {
        a1.cancel();
        apply();
        const a2 = anim(el, [{ opacity: 0 }, { opacity: o }], { duration: 200, easing: EASE_OUT });
        a2.onfinish = res;
      };
    });
  }
  // 회전 교체: 제자리에서 세로축을 중심으로 옆으로 돌아(90°) 내용이 바뀌고 반대편에서 돌아 나옴 — 자리는 안 움직임 (D key 전환용)
  function spin(el, apply, delay) {
    return new Promise(function (res) {
      const a1 = anim(el, [{ transform: 'perspective(400px) rotateY(0deg)' }, { transform: 'perspective(400px) rotateY(90deg)' }],
        { duration: 220, delay: delay || 0, easing: EASE_IN, fill: 'both' });
      a1.onfinish = function () {
        a1.cancel();
        apply();
        const a2 = anim(el, [{ transform: 'perspective(400px) rotateY(-90deg)' }, { transform: 'perspective(400px) rotateY(0deg)' }],
          { duration: 220, easing: EASE_OUT });
        a2.onfinish = res;
      };
    });
  }
  // 지금 울리는 열만 파랑(번호·코드명), 나머지는 흐리게. i < 0이면 해제
  function hot(i) {
    const g = grid();
    if (!g) return;
    g.classList.toggle('is-playing', i >= 0);
    cols().forEach(function (c, j) { c.classList.toggle('is-hot', j === i); });
  }

  // ── 챕터 1 단계 ──
  // 각 단계의 핵심(CLAUDE.md 0-5) — 그 순간 눈과 귀가 가야 할 곳:
  //  1 메이저 스케일의 7음이 "순서대로" 놓인다(울리는 음만 파랑)      2 라 = A, 같은 7음의 이름                 3 쌓이는 줄(새 줄만 파랑, 앞 줄은 옅게)
  //  4 세로 3음 = 코드 하나(다이어토닉 코드)                         5 코드 이름(음은 줄어들고 옅어짐 — 이제 핵심이 아님)   6 코드마다 번호(이름 아래)
  //  7 번호의 정식 표기(로마숫자)와 읽는 법                          8 이름 ↔ 번호 ↔ 소리(울리는 열만 파랑)    9 이 7개 세트가 뼈대(음은 거의 사라짐)
  // 10 노래에서 쓰이는 코드(위 7개에서 파랑)                         11 key가 바뀌어도 번호는 그대로, 코드명만 바뀜   12 이 챕터에서 할 훈련 안내   13 마무리(공통)
  // 위에서 아래 순서 = 중요한 순서: 코드명(맨 위) → 번호 → 줄어든 음.
  // run()은 연출이 모두 끝나면 풀리는 약속을 돌려준다(그때 +0.1초에 "다음" 활성화).
  const STEPS_CH1 = [
    // 1. 도입 문구 → 두 번째 문구("메이저 스케일이 있어요")와 함께 7음이 나타남 → 음 순차 재생(C3부터, 울리는 음만 파랑, 마지막에 한 옥타브 위 도를 한 번 더)
    { text: '1장에서는 다이어토닉 코드에 대해 배워요', run: function () {
      const syl = ['도', '레', '미', '파', '솔', '라', '시'];
      const STEP = 420;   // 음 사이 간격(ms) — 소리는 원래 템포가 좋다고 해서 되돌림
      const SHOW_MS = CAPTION_GAP_MIN_MS - CAPTION_LEAD_MS, PLAY_MS = SHOW_MS + 1600;   // 첫 문구가 더 보이는 시간(앞의 CAPTION_LEAD_MS와 합쳐 문구 사이 최소 간격 CAPTION_GAP_MIN_MS) / 둘째 문구 뒤 7음이 보이고 나서 소리가 시작되기까지
      const els = rowOf(1);
      els.forEach(function (el, i) { el.textContent = syl[i]; });
      grid().classList.add('is-quick');   // 음이 켜지고 꺼지는 전환을 소리에 맞게 빠르게(CSS .is-quick, 0.25s)
      later(function () { showCaption('아래에 우리에게 익숙한 메이저 스케일이 있어요'); }, SHOW_MS);
      later(function () { fx(els, 'is-in', true); }, SHOW_MS + 400);   // 7음이 한 번에 나타남(소리는 아직 없음)
      later(function () {
        const t0 = audioT0();
        els.forEach(function (el, i) {
          note(SCALE_MIDI[i], t0 + i * STEP / 1000, STEP / 1000, 0.18);   // 레가토: 다음 음이 시작될 때까지 울리고 그 뒤 0.18초 동안 페이드 → 다음 음이 들어오는 동안 앞 음이 자연스럽게 사라지며 이어짐. 두 음 이상 쌓이지 않음
          later(function () {
            if (i > 0) els[i - 1].classList.remove('is-focus');
            el.classList.add('is-focus');
          }, LEAD_MS + i * STEP);
        });
        note(SCALE_MIDI[7], t0 + 7 * STEP / 1000, 1.2, 0.8);
        later(function () { els[6].classList.remove('is-focus'); els[0].classList.add('is-focus'); }, LEAD_MS + 7 * STEP);
        later(function () { els[0].classList.remove('is-focus'); }, LEAD_MS + 7 * STEP + 900);
      }, PLAY_MS);
      return wait(PLAY_MS + LEAD_MS + 7 * STEP + 900 + FADE_MS);
    } },
    // 2. 음이름 전환 — 같은 자리에서 교체
    { text: em('라') + '는 음이름으로 A예요\n음이름으로 바꿔봅시다', run: function () {
      grid().classList.remove('is-quick');
      return Promise.all(rowOf(1).map(function (el, i) {
        return swap(el, function () { el.textContent = ROWS[1][i]; }, i * 50);
      }));
    } },
    // 3. 한 칸 건너뛰어 두 줄 쌓기 — 새로 쌓이는 줄만 파랑, 앞 줄은 옅게. 첫 묶음은 소리로도 C → +E → +G가 쌓임
    { text: '코드는 음들을 한 칸씩 건너뛰어서 쌓아요', run: function () {
      const t0 = audioT0(), STAG = 70, ROW_MS = 6 * STAG + FADE_MS, PAUSE = 300;
      const r1 = rowOf(1), r2 = rowOf(2), r3 = rowOf(3);
      r2.forEach(function (el, i) { el.textContent = ROWS[2][i]; });
      r3.forEach(function (el, i) { el.textContent = ROWS[3][i]; });
      strum([48, 52], t0, 1.2, 0.6);
      strum([48, 52, 55], t0 + (ROW_MS + PAUSE) / 1000, 1.4, 0.7);
      later(function () { fx(r1, 'is-dim', true); fx(r2, ['is-in', 'is-focus'], true, STAG); }, LEAD_MS);
      later(function () { fx(r2, 'is-focus', false); fx(r2, 'is-dim', true); fx(r3, ['is-in', 'is-focus'], true, STAG); }, LEAD_MS + ROW_MS + PAUSE);
      return wait(LEAD_MS + 2 * ROW_MS + PAUSE);
    } },
    // 4. 세로 3음 = 코드 하나 — 세 줄이 같은 진하기로 돌아오고, 왼쪽부터 한 열씩 파랑이 지나감
    { text: '이렇게 메이저 스케일에서 만든 코드를 ' + em('다이어토닉 코드') + '라고 해요', run: function () {
      fx(allNotes(), ['is-dim', 'is-focus'], false);
      const cs = cols();
      cs.forEach(function (c, i) {
        const ns = Array.prototype.slice.call(c.querySelectorAll('.lec-note'));
        later(function () { ns.forEach(function (n) { n.classList.add('is-focus'); }); }, FADE_MS + i * 150);
        later(function () { ns.forEach(function (n) { n.classList.remove('is-focus'); }); }, FADE_MS + i * 150 + 450);
      });
      return wait(FADE_MS + 7 * 150 + 450 + FADE_MS);
    } },
    // 5. 코드 이름 — 음은 더 이상 핵심이 아니므로 한 번 줄어들며 옅어지고(열 간격은 44px로 벌어짐), 맨 위에 코드명이 차례로 나타남. 번호 자리는 이름 바로 아래에 비워 둠.
    //    이 전환은 이 강의에서 의도된 유일한 크기·간격 변화(CLAUDE.md 0-5: 핵심이 음에서 이름으로 넘어가는 순간)
    { text: '각 코드의 이름은 이렇게 돼요', run: function () {
      const nm = names();
      nm.forEach(function (el, i) { el.textContent = C_NAMES[i]; });   // 코드명은 로마자와 달리 m·dim도 근음과 같은 크기
      grid().classList.add('is-spread');
      fx(allNotes(), 'is-dim', true);
      return wait(SPREAD_MS).then(function () { return fx(nm, 'is-in', true, 60); });   // 열이 다 벌어진 뒤 이름이 차례로
    } },
    // 6. 숫자 1~7 — 코드명 바로 아래 비워 둔 자리에 나타남
    { text: '코드의 순서는 숫자를 붙여서 읽을 수 있어요', run: function () {
      const ns = nums();
      ns.forEach(function (el, i) { el.textContent = String(i + 1); });
      return fx(ns, 'is-in', true, 60);
    } },
    // 7. 로마자 — 같은 자리에서 교체
    { text: '보통 로마숫자로 표시해요\n읽을 때는 ' + em('1도 메이저, 2도 마이너') + '처럼 읽어요', run: function () {
      return Promise.all(nums().map(function (el, i) {
        return swap(el, function () { el.innerHTML = romanHtml(ROMANS[i]); }, i * 60);
      }));
    } },
    // 8. 7코드 차례로 재생 + 마지막에 I을 한 번 더(돌아와서 끝나는 안정감) — 울리는 열의 코드명·번호만 파랑
    { text: '7개의 다이어토닉 코드를 들어봅시다!', run: function () {
      const t0 = audioT0(), SLOT = 750;   // 코드 하나당 0.75초 (1.0초에서 더 빠르게)
      for (let k = 0; k < 8; k++) {
        const i = k % 7;
        strum(fretsToMidis(VOICINGS[C_NAMES[i]]), t0 + k * SLOT / 1000, k === 7 ? 1.7 : 0.72, k === 7 ? 1.0 : 0.4);
        later(function () { hot(i); }, LEAD_MS + k * SLOT);
      }
      later(function () { hot(-1); }, LEAD_MS + 8 * SLOT + 400);
      return wait(LEAD_MS + 8 * SLOT + 400 + FADE_MS);
    } },
    // 9. 패밀리 — 음은 거의 사라지고 코드명·번호 7개 세트만 남음
    { text: '대부분의 노래는 이 7가지 뼈대로 만들어져요\n' + em('패밀리 코드') + '라고도 불려요!', run: function () {
      return fx(allNotes(), 'is-faint', true);
    } },
    // 10. 동요 — 아래엔 가사만, 쓰이는 코드는 위 7개에서 파랑으로 켜짐. 멜로디 피아노 + 코드 기타
    { text: '노래에 어떻게 적용되는지 들어볼까요?', run: function () {
      const tok = L.tok;
      const ly = $('lec-lyrics');
      ly.innerHTML = SONG_SYL.map(function (s, i) { return '<span class="lec-syl">' + s + '</span>' + (SONG_AFTER[i] || ''); }).join('');
      ly.classList.add('is-in');
      return wait(FADE_MS).then(function () { return withTimeout(GuitarAudio.pianoReady(), READY_TIMEOUT_MS); }).then(function () {
        if (tok !== L.tok) return NEVER();
        GuitarAudio.setOutputTrim(SONG_GUITAR_TRIM);
        GuitarAudio.setPianoGain(SONG_PIANO_GAIN);
        L.trimmed = true;
        const t0 = audioT0(), BEAT_MS = SONG_BEAT * 1000;
        const syl = Array.prototype.slice.call(ly.querySelectorAll('.lec-syl'));
        SONG_CHORDS.forEach(function (ch) {
          strum(fretsToMidis(VOICINGS[ch[0]]), t0 + ch[1] * SONG_BEAT, ch[2] * SONG_BEAT * 0.95, 0.6, 'weak');   // 동요에서는 코드를 약하게 — 멜로디(피아노)가 주인공
          later(function () { hot(SONG_COL[ch[0]]); }, LEAD_MS + ch[1] * BEAT_MS);
        });
        SONG_MELODY.forEach(function (m, i) {
          piano(m[0], t0 + m[1] * SONG_BEAT, m[2] * SONG_BEAT * 0.95);
          later(function () {
            syl.forEach(function (el, j) { el.classList.toggle('is-on', j === i); el.classList.toggle('is-sung', j < i); });
          }, LEAD_MS + m[1] * BEAT_MS);
        });
        const end = LEAD_MS + SONG_BEATS * BEAT_MS;
        later(function () {
          hot(-1);
          syl.forEach(function (el) { el.classList.remove('is-on'); el.classList.add('is-sung'); });
        }, end);
        return wait(end);
      });
    } },
    // 11. D key 교체 — 코드명만 왼쪽부터 하나씩 제자리에서 돌며 바뀌고 번호는 그대로 (소리 없음). 가사는 사라짐
    { text: '노래의 key가 바뀌어도 번호는 바뀌지 않아요', run: function () {
      $('lec-lyrics').classList.remove('is-in');
      return Promise.all(names().map(function (el, i) {
        return spin(el, function () { el.textContent = D_NAMES[i]; }, i * 100);   // 왼쪽부터 하나씩 차례로 돌며 바뀜
      }).concat([wait(FADE_MS)]));
    } },
    // 12. 마무리 — 안내 문구만, 버튼은 "완료"
    { text: '1장에서는 다양한 key에서 다이어토닉 코드를 찾을 수 있는 훈련을 해 볼 거예요!', run: function () { return Promise.resolve(); } },
    endingStep(1),   // 13. 마무리 — 모든 챕터 강의가 같은 문구를 씀(챕터 번호만 다름), 버튼은 "완료"
  ];
  // 단계는 12개로 나누되, "다음" 버튼은 묶음(그룹)마다 한 번만 켜진다. 묶음 안의 단계는 앞 단계가 끝나면 버튼을 누르지 않아도 자동으로 이어짐.
  // 그룹 = 단계 번호(0부터) 목록: [1] / [2~4] / [5~8] / [9~10] / [11] / [12] / [13]
  const GROUPS_CH1 = [[0], [1, 2, 3], [4, 5, 6, 7], [8, 9], [10], [11], [12]];
  // 묶음의 마지막 단계는 소리의 꼬리(마지막 음·코드의 울림)까지 끝난 뒤에야 "다음"이 켜지게 하는 최소 시간(ms, 단계 시작 기준).
  // 연출 코드가 오류로 일찍 끝나더라도 그 전에는 켜지지 않음. 소리가 있는 단계만 지정: 1단계(문구 2개 + 7음이 보인 뒤 재생, 높은 도 꼬리까지 약 9.4초), 8단계(마지막 C 코드 꼬리까지 약 10초), 10단계(동요 마지막 음 꼬리까지 약 13.5초)
  STEPS_CH1[0].ms = 9000 + (CAPTION_GAP_MIN_MS - CAPTION_LEAD_MS - 1200);    // 문구 2개(둘째 문구는 문구 사이 최소 간격 뒤, 원래 1.2초 뒤였음) + 7음 등장 + 음 8개 재생(420ms 간격) + 높은 도 꼬리
  STEPS_CH1[7].ms = 8300;    // 코드 7개 + I 한 번 더(0.75초 간격) + 마지막 C 꼬리
  STEPS_CH1[9].ms = 14500;   // 동요(80 BPM 약 12초) + 마지막 음 꼬리

  // ── 챕터 2 단계 (코드의 기능: 7th 확장 → 기능 분류 → 대리코드 → 작은별 리하모니) ──
  // 각 단계의 핵심(CLAUDE.md 0-5) — 최종 목적: 7th 코드 이름·도수, 어느 코드가 어느 기능인지(해결/예비/긴장), 같은 기능끼리 바꿔 쓴다는 것을 외우고 쓰기
  //  1 1장의 7개 코드가 출발점                                    2 쌓는 동작이 한 번 더 → 4번째 음(새로 쌓인 음만 파랑)
  //  3 7th 코드의 새 이름·도수(바뀐 글자)                          4 소리 + 이름·도수(음은 사라짐)
  //  5 기능 3가지의 이름(머리글이 핵심)                           6 어느 코드가 어느 기능인지(대표 C F G 먼저)
  //  7 같은 기능 안에서는 서로 바뀐다(해결 칸만 켜지고 자리 바꿈)     8 어울림은 경험의 영역(문구)
  //  9 Em이 해결 힘이 약한 이유 = V(G)와 겹치는 음(겹치는 칸만 파랑)  10 노래 = 긴장↔해결, 예비는 그 중간(기능 라벨이 핵심)
  // 11 같은 기능의 코드로 바꾼 곳(파랑)                           12 소리로 확인     13 앞으로 풀 문제 안내     14 마무리(공통)
  const NAMES7 = ['CM7', 'Dm7', 'Em7', 'FM7', 'G7', 'Am7', 'Bm7(b5)'];
  const ROMANS7 = ['IM7', 'IIm7', 'IIIm7', 'IVM7', 'V7', 'VIm7', 'VIIm7(b5)'];
  const ROW4 = ['B', 'C', 'D', 'E', 'F', 'G', 'A'];   // 4번째 줄 — 위 세 줄에서 한 칸 더 건너뛴 음(루트의 7도)
  const VOICINGS7 = {   // 7th 오픈 보이싱(줄 6→1, -1 = 안 침)
    CM7: [-1, 3, 2, 0, 0, 0], Dm7: [-1, -1, 0, 2, 1, 1], Em7: [0, 2, 2, 0, 3, 0], FM7: [-1, -1, 3, 2, 1, 0],
    G7: [3, 2, 0, 0, 0, 1], Am7: [-1, 0, 2, 0, 1, 0], 'Bm7(b5)': [-1, 2, 3, 2, 3, -1],
  };
  // 분류판 — 기능마다 속한 코드(위에서 아래 순서 = 칸 순서). 분류판은 3화음 이름(C F G …)으로 씀 — 7th 이름으로 바꾸려면 chords만 NAMES7 값으로 교체
  const FUNCS = [
    { head: '해결', sub: '토닉', chords: ['C', 'Em', 'Am'] },
    { head: '예비', sub: '서브도미넌트', chords: ['F', 'Dm'] },
    { head: '긴장', sub: '도미넌트', chords: ['G', 'Bdim'] },
  ];
  const FUNC_OF = {};
  const FUNC_IDX = {};   // 코드 → 기능 번호(0 해결 / 1 예비 / 2 긴장) — CSS가 기능마다 다른 색을 쓰는 데 씀
  FUNCS.forEach(function (f, i) { f.chords.forEach(function (c) { FUNC_OF[c] = f.head; FUNC_IDX[c] = i; }); });
  const FILL_ORDER = ['C', 'F', 'G', 'Dm', 'Em', 'Am', 'Bdim'];   // 대표 코드(I·IV·V)를 먼저, 나머지는 순서대로
  const CMP_ROWS = [['Em', ['E', 'G', 'B']], ['G', ['G', 'B', 'D']]];   // 겹치는 음 비교 — 각 코드의 구성음 3개를 그대로 나열(자리를 맞추지 않음). 겹치는 G·B만 파랑
  // 작은별 8칸(한 칸 = 2박). 원곡은 C가 4박이라 C C로 풀어 씀. 새 진행은 같은 기능의 코드로만 바꿈: 2번째 C→Em(해결) 5번째 F→Dm(예비) 6번째 C→Am(해결) 7번째 G→Bdim(긴장)
  const SONG2_ORIG = ['C', 'C', 'F', 'C', 'F', 'C', 'G', 'C'];
  const SONG2_NEW = ['C', 'Em', 'F', 'C', 'Dm', 'Am', 'Bdim', 'C'];
  const EASE_INOUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
  function q2(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function romanHtml7(r) {   // 'VIIm7(b5)' → 숫자 크게(VII) + 품질 작게(m7) + (b5)는 위첨자(항상 위첨자 규칙)
    const m = /^([IV]+)(.*)$/.exec(r);
    return m[1] + (m[2] ? '<span class="lec-rq">' + _ccFormatB5(m[2]) + '</span>' : '');
  }
  function notes123() { return rowOf(1).concat(rowOf(2), rowOf(3)); }
  // 글자 폭 측정 — 숨긴 요소에 넣어 실제 폭을 읽음(이름·도수가 7th로 바뀐 뒤의 폭이 바뀌기 전에 필요해서)
  function measureW(html, cls) {
    const el = document.createElement('span');
    el.className = cls;
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.whiteSpace = 'nowrap';
    el.innerHTML = html;
    grid().appendChild(el);
    const w = el.getBoundingClientRect().width;
    el.remove();
    return w;
  }
  // 두 줄 배치의 아래 줄 3개(5도 G7 · 6도 Am7 · 7도 Bm7(b5))를 사이 여백이 같게 배치(위 줄 4개는 그대로). 열 가운데를 같은 간격(80px)에 두면 길이가 달라 여백이 5-6도와 6-7도에서 달라 보임 →
  // 7th 이름·도수 중 더 넓은 쪽을 각 열의 폭으로 보고, 줄 폭에서 남는 공간을 4등분(양 끝 포함)해 간격으로 씀. 바뀔 글자의 폭을 미리 재서 쓰므로 이름이 바뀌어도 위치가 안 움직임
  function evenBottomRow(cs) {
    const bottom = cs.slice(4), gr = grid().getBoundingClientRect();
    const ws = bottom.map(function (c, k) {
      return Math.max(measureW(_ccFormatB5(NAMES7[4 + k]), 'lec-name'), measureW(romanHtml7(ROMANS7[4 + k]), 'lec-num'));
    });
    const gap = (gr.width - ws.reduce(function (a, b) { return a + b; }, 0)) / (ws.length + 1);
    let x = gap;
    bottom.forEach(function (c, k) {
      const r = c.getBoundingClientRect();
      c.style.transform = 'translateX(' + (gr.left + x + ws[k] / 2 - (r.left + r.width / 2)) + 'px)';
      x += ws[k] + gap;
    });
  }
  // 코드 줄을 한 줄 7열 ↔ 위 4개 + 아래 3개 두 줄로 옮김(two = true면 두 줄). 새 배치를 먼저 적용하고, 각 열을 옛 자리에서 새 자리로 푸는 transform 애니메이션(FLIP).
  // 가로는 열의 가운데, 세로는 열의 맨 위 기준(열 높이가 배치마다 달라도 이름·번호 위치가 맞음). 애니메이션은 인라인 transform(아래 줄 간격 보정)을 덮어쓰므로 끝값도 그 값으로 줌
  function regroupRows(two) {
    const g = grid(), cs = cols(), MOVE = 600;
    const pos = function (c) { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; };
    const first = cs.map(pos);
    cs.forEach(function (c) { c.style.transform = ''; });   // 아래 줄 간격 보정으로 준 이동값 해제
    g.classList.toggle('is-two', two);
    if (two) { g.classList.add('is-flat'); evenBottomRow(cs); }
    cs.forEach(function (c, i) {
      const l = pos(c), keep = c.style.transform;
      anim(c, [{ transform: 'translate(' + (first[i].x - l.x) + 'px, ' + (first[i].y - l.y) + 'px) ' + keep }, { transform: keep || 'translate(0, 0)' }], { duration: MOVE, easing: EASE_INOUT });
    });
    return wait(MOVE);
  }
  // 위 코드 줄의 글자를 복사해 분류판 칸으로 날려 보냄(원본은 그대로). 복사본은 원본과 같은 색으로 파랑 강조 없이 이동하고, 칸은 도착 직전에 나타나 교차되며 복사본이 사라짐(칸은 기능 색)
  function flyCopy(src, cell, text) {
    const FLY = 550, a = $('lec2-a'), ar = a.getBoundingClientRect(), s = src.getBoundingClientRect(), t = cell.getBoundingClientRect();
    const sx = s.left + s.width / 2, sy = s.top + s.height / 2, dx = t.left + t.width / 2 - sx, dy = t.top + t.height / 2 - sy;
    const el = document.createElement('span');
    el.className = 'lec2-fly';
    el.textContent = text;
    el.style.left = (sx - ar.left) + 'px';
    el.style.top = (sy - ar.top) + 'px';
    a.appendChild(el);
    const base = 'translate(-50%, -50%) ';
    anim(el, [{ transform: base + 'translate(0, 0)', opacity: 1, easing: EASE_INOUT }, { transform: base + 'translate(' + dx + 'px, ' + dy + 'px)', opacity: 1, offset: 0.85 }, { transform: base + 'translate(' + dx + 'px, ' + dy + 'px)', opacity: 0 }], { duration: FLY / 0.85 });
    later(function () { cell.classList.add('is-in'); }, FLY * 0.8);
    later(function () { el.remove(); }, FLY / 0.85 + 50);
  }
  // 작은별 새 진행에서 지금 울리는 칸만 파랑(i < 0이면 해제)
  function hotSong(i) {
    const b = $('lec2-b');
    if (!b) return;
    b.classList.toggle('is-playing', i >= 0);
    q2('#lec2-new .lec2-slot').forEach(function (s, j) { s.classList.toggle('is-hot', j === i); });
  }
  // 세로로 놓인 칸들이 한 칸씩 아래로 밀리며 자리를 바꿈(맨 아래 칸은 맨 위로 건너뜀). 칸 수만큼 돌면 처음 자리로 돌아와 끝남
  function rotateCells(cells, rounds) {
    const n = cells.length, h = cells[1].getBoundingClientRect().top - cells[0].getBoundingClientRect().top;
    const MOVE = 500, HOLD = 150, T = rounds * (MOVE + HOLD);
    cells.forEach(function (el, j) {
      const frames = [];
      for (let r = 0; r < rounds; r++) {
        const from = (((j + r) % n) - j) * h, to = (((j + r + 1) % n) - j) * h;
        frames.push({ transform: 'translateY(' + from + 'px)', offset: (r * (MOVE + HOLD)) / T, easing: EASE_INOUT });
        frames.push({ transform: 'translateY(' + to + 'px)', offset: (r * (MOVE + HOLD) + MOVE) / T, easing: 'linear' });
      }
      frames.push({ transform: 'translateY(0px)', offset: 1 });
      anim(el, frames, { duration: T });
    });
    return wait(T);
  }
  function lyricsHtml() {
    return SONG_SYL.map(function (s, i) { return '<span class="lec-syl">' + s + '</span>' + (SONG_AFTER[i] || ''); }).join('');
  }
  // ── 작은별 악보(챕터 3~5) ── 가로선 양끝에 세로선(길게)·마디선(짧게), 선 위에 코드·아래에 가사. 한 줄 2마디(8박)씩 두 줄
  // 코드는 칸(2박)의 시작 박 위치에 왼쪽 정렬, 가사는 박자를 무시하고 마디 단위로 묶어 마디 시작에 왼쪽 정렬(CSS .lec6-lm)
  const SC_PAD = 10, SC_GAP = 4;   // 악보 좌우 여백 / 박 위치에서 글자까지 띄움·코드 사이 최소 간격(px) — CSS --sc-pad와 같은 값
  const SONG_MEASURES = [0, 4, 7, 11, 14];   // 마디별 가사 시작 글자 번호: 반짝반짝 | 작은 별 | 아름답게 | 비치네
  function scoreHtml(id, slotFn) {   // slotFn(칸 번호 0~7, 시작 박 0·2·4·6) → .lec2-slot HTML(data-b = 시작 박)
    const row = function (r) {
      let h = '<div class="lec6-row"><i class="lec6-ln"></i><i class="lec6-bar is-end is-l"></i><i class="lec6-bar is-end is-r"></i><i class="lec6-bar is-mid"></i>';
      for (let k = 0; k < 4; k++) h += slotFn(r * 4 + k, k * 2);
      return h + '</div>';
    };
    return '<div class="lec6-sc" id="' + id + '">' + row(0) + row(1) + '<div class="lec-lyrics lec6-ly" id="lec-lyrics"></div></div>';
  }
  function songLyricsHtml() {
    return [0, 1, 2, 3].map(function (m) {
      return '<span class="lec6-lm" data-m="' + m + '">' + SONG_SYL.slice(SONG_MEASURES[m], SONG_MEASURES[m + 1]).map(function (s, j) {
        return '<span class="lec-syl">' + s + '</span>' + (SONG_MEASURES[m] + j === 5 ? ' ' : '');   // "작은 별"의 띄어쓰기
      }).join('') + '</span>';
    }).join('');
  }
  // 코드를 박 위치에 놓음. 앞 코드와 겹치면 겹치지 않게 오른쪽으로 밀어냄(억지로 끼우지 않음). 쪼개진 칸은 Rel.IIm 다음 코드를 1박 뒤(Rel.IIm이 더 넓으면 그만큼 뒤)에 놓음
  function layoutScore(sc) {
    if (!sc) return;
    sc.querySelectorAll('.lec6-row').forEach(function (row) {
      const bw = (row.clientWidth - 2 * SC_PAD) / 8, mid = row.querySelector('.lec6-bar.is-mid'), end = row.querySelector('.lec6-bar.is-r');
      if (mid) mid.style.left = Math.round(SC_PAD + bw * 4 - 1) + 'px';   // 세로선 두께(2px)가 양끝·마디선 모두 같게 보이도록 위치를 정수로
      if (end) end.style.left = (row.clientWidth - 2) + 'px';
      const place = function () {   // 코드를 박 위치에 놓고 첫 코드의 시작과 마지막 코드의 오른쪽 끝을 돌려줌
        let prev = -Infinity, first = null;
        row.querySelectorAll('.lec2-slot').forEach(function (s) {
          const rel = s.querySelector('.lec5-rel');
          if (rel) rel.style.marginRight = s.classList.contains('is-open') ? Math.max(SC_GAP, bw - rel.offsetWidth) + 'px' : '';
          const aft = s.querySelector('.lc6-aft') || s.querySelector('.lc6-tail');   // 칸 뒤쪽에 코드가 덧붙는 칸(6장의 Bdim7, 기반 진행의 Am7) — 덧붙는 코드는 원래 코드 1박 뒤(원래 코드가 더 넓으면 그만큼 뒤)
          if (aft) aft.style.marginLeft = s.classList.contains('is-open') ? Math.max(SC_GAP, bw - s.querySelector('.lec2-sname:not(.lec5-rel)').offsetWidth) + 'px' : '';
          const x = Math.max(SC_PAD + bw * s.dataset.b + SC_GAP, prev + SC_GAP);
          s.style.left = x + 'px';
          if (first === null) first = x;
          prev = x + s.offsetWidth;
        });
        return { first: first, end: prev };
      };
      // 한 줄의 코드가 오른쪽 세로선을 넘으면(코드가 많은 줄) 그 줄의 코드 글자만 줄여서 맞춤 — 겹치게 끼우지도, 선 밖으로 내보내지도 않음
      row.style.removeProperty('--sc-fs');
      let r = place(), fs = parseFloat(getComputedStyle(row.querySelector('.lec2-sname')).fontSize) || 18;
      const lim = row.clientWidth - SC_PAD - SC_GAP;
      for (let n = 0; n < 4 && r.end > lim && fs > 12; n++) {
        fs = Math.max(12, fs * (lim - r.first) / (r.end - r.first) - 0.1);
        row.style.setProperty('--sc-fs', fs + 'px');
        r = place();
      }
    });
  }
  // 코드 이름이 바뀌거나 칸이 열려 글자 폭이 달라질 때 — apply()로 바꾼 뒤 위치를 다시 잡고, 자리가 달라진 칸은 튀지 않고 옛 자리에서 미끄러져 새 자리로(FLIP)
  function reflowScore(sc, apply) {
    const slots = Array.prototype.slice.call(sc.querySelectorAll('.lec2-slot')), before = slots.map(function (s) { return s.getBoundingClientRect().left; });
    apply();
    layoutScore(sc);
    slots.forEach(function (s, i) {
      const d = before[i] - s.getBoundingClientRect().left;
      if (Math.abs(d) > 0.5) anim(s, [{ transform: 'translateX(' + d + 'px)' }, { transform: 'translateX(0)' }], { duration: 500, easing: EASE_INOUT });
    });
  }
  // 동요 멜로디(피아노) + 가사 강조 — 작은별 새 진행 재생용
  function playMelody(ly, t0) {
    const BEAT_MS = SONG_BEAT * 1000, syl = Array.prototype.slice.call(ly.querySelectorAll('.lec-syl'));
    SONG_MELODY.forEach(function (m, i) {
      piano(m[0], t0 + m[1] * SONG_BEAT, m[2] * SONG_BEAT * 0.95);
      later(function () {
        syl.forEach(function (el, j) { el.classList.toggle('is-on', j === i); el.classList.toggle('is-sung', j < i); });
      }, LEAD_MS + m[1] * BEAT_MS);
    });
    return syl;
  }
  const STEPS_CH2 = [
    // 1. 1장의 코드 7개 — 이름 → 도수 → 음 3줄 순서로 나타남(위계: 외울 것이 먼저). 4번째 줄 자리는 비워 둠
    { text: '2장에서는 다이어토닉 코드를 확장해볼게요!', run: function () {
      const nm = names(), ns = nums();
      nm.forEach(function (el, i) { el.textContent = C_NAMES[i]; });
      ns.forEach(function (el, i) { el.innerHTML = romanHtml(ROMANS[i]); });
      [1, 2, 3].forEach(function (r) { rowOf(r).forEach(function (el, i) { el.textContent = ROWS[r][i]; }); });
      rowOf(4).forEach(function (el, i) { el.textContent = ROW4[i]; });
      return fx(nm, 'is-in', true, 60).then(function () { return fx(ns, 'is-in', true, 60); }).then(function () { return fx(notes123(), 'is-in', true, 25); });
    } },
    // 2. 한 칸 더 건너뛰어 4번째 음 — 3화음이 울리는 동안 세 줄이 파랑 → 7th가 울리며 새 줄만 파랑으로 쌓이고 앞 세 줄은 옅어짐
    { text: '기존의 코드에 음 한개를 더 추가해요', run: function () {
      const t0 = audioT0(), r4 = rowOf(4), STAG = 70, SECOND = 1500;
      strum(fretsToMidis(VOICINGS.C), t0, 1.3, 0.6);
      strum(fretsToMidis(VOICINGS7.CM7), t0 + SECOND / 1000, 1.7, 0.8);
      later(function () { fx(notes123(), 'is-focus', true); }, LEAD_MS);
      later(function () { fx(notes123(), 'is-focus', false); fx(notes123(), 'is-dim', true); fx(r4, ['is-in', 'is-focus'], true, STAG); }, LEAD_MS + SECOND);
      return wait(LEAD_MS + SECOND + 6 * STAG + FADE_MS + 600);
    } },
    // 3. 7th 코드 — 음이 사라진 뒤 바로 코드 줄이 위 4개 + 아래 3개 두 줄로 옮겨 가고(7th 이름이 한 줄에 안 들어감), 그 자리에서 코드 이름 → 도수 순서로 바뀜(바뀐 글자는 잠깐 파랑)
    { text: '이러한 코드를 ' + em('7th(세븐스)코드') + '라고 해요\n이름은 이렇게 바뀌어요', run: function () {
      const nm = names(), ns = nums();
      return fx(notes123().concat(rowOf(4)), ['is-in', 'is-dim', 'is-focus'], false).then(function () { return regroupRows(true); }).then(function () {
        return Promise.all(nm.map(function (el, i) {
          return swap(el, function () { el.innerHTML = _ccFormatB5(NAMES7[i]); }, i * 60);
        }));
      }).then(function () {
        fx(nm, 'is-focus', true);
        return Promise.all(ns.map(function (el, i) { return swap(el, function () { el.innerHTML = romanHtml7(ROMANS7[i]); }, i * 60); }));
      }).then(function () {
        fx(ns, 'is-focus', true);
        return wait(600);
      }).then(function () { return fx(nm.concat(ns), 'is-focus', false); });
    } },
    // 4. 이름·도수만 남은 두 줄 배치에서 7th 코드 7개 + I 한 번 더 재생(울리는 열만 파랑)
    { text: '7th 다이어토닉도 들어봅시다!', run: function () {
      const t0 = audioT0(), SLOT = 750;
      for (let k = 0; k < 8; k++) {
        const i = k % 7;
        strum(fretsToMidis(VOICINGS7[NAMES7[i]]), t0 + k * SLOT / 1000, k === 7 ? 1.7 : 0.72, k === 7 ? 1.0 : 0.4);
        later(function () { hot(i); }, LEAD_MS + k * SLOT);
      }
      later(function () { hot(-1); }, LEAD_MS + 8 * SLOT + 400);
      return wait(LEAD_MS + 8 * SLOT + 400 + FADE_MS);
    } },
    // 5. 기능 3가지 — 분류는 3화음 코드로 하므로 7th 이름·도수가 원래대로 돌아가면서 코드 줄도 다시 한 줄로(옮겨 가는 동안 이름이 교차 전환). 이어서 분류판 머리글(해결·예비·긴장)과 소제목이 차례로 나타남. 머리글이 핵심이라 파랑
    { text: '코드에는 저마다 맡은 ' + em('기능') + '이 있어요\n' + em('해결, 예비, 긴장') + ' 세 가지예요', run: function () {
      const nm = names(), ns = nums();
      return Promise.all([regroupRows(false)].concat(
        nm.map(function (el, i) { return swap(el, function () { el.textContent = C_NAMES[i]; }, i * 40); }),
        ns.map(function (el, i) { return swap(el, function () { el.innerHTML = romanHtml(ROMANS[i]); }, i * 40); })
      )).then(function () {
        return Promise.all([fx(q2('.lec2-fhead'), 'is-in', true, 150), fx(q2('.lec2-fsub'), 'is-in', true, 150)]);
      });
    } },
    // 6. 분류판 채우기 — 위 한 줄의 코드가 복사되어 분류판 칸으로 날아감. 대표 코드 C F G를 먼저, 나머지는 Dm Em Am Bdim 순서로
    { text: '7개의 코드를 기능에 따라\n나눠 볼게요!', run: function () {
      let t = 300;
      FILL_ORDER.forEach(function (c, k) {
        const src = names()[C_NAMES.indexOf(c)], cell = q2('.lec2-cell[data-ch="' + c + '"]')[0];
        later(function () { flyCopy(src, cell, c); }, t);
        t += k < 2 ? 650 : 450;
      });
      return wait(t + 1200);
    } },
    // 7. 대리코드 — 해결 칸만 켜지고(나머지 열은 옅게) 세 코드가 서로 자리를 바꿈(세 번 돌아 처음 자리로)
    { text: '같은 기능의 코드끼리는 서로 ' + em('바꿔서') + ' 쓸 수 있어요!', run: function () {
      const f = q2('.lec2-fcol'), cells = q2('.lec2-fcol[data-f="0"] .lec2-cell');
      fx([f[1], f[2]], 'is-faint', true);
      fx(cells, 'is-focus', true);
      return rotateCells(cells, 3).then(function () { return fx(cells, 'is-focus', false); });
    } },
    // 8. 어울림은 경험의 영역 — 문구만(다른 열은 다시 진하게)
    { text: '어울리는지는 곡마다 달라서\n많이 들어보는 ' + em('경험') + '이 중요해요', run: function () {
      const f = q2('.lec2-fcol');
      return fx([f[1], f[2]], 'is-faint', false);
    } },
    // 9. Em이 약한 이유 — 분류판은 옅어지고(가운데는 하얀 그라디언트가 가림) Em·G의 구성음 3개씩을 나란히 보여 준 뒤 겹치는 G·B를 두 줄 모두에서 파랑
    { text: '3도 마이너(Em)는 5도(G)와\n' + em('겹치는 음') + '이 많아 해결하는 힘이 약해요', run: function () {
      $('lec2-board').classList.add('is-faint');
      $('lec2-cmp').classList.add('is-in');   // 하얀 그라디언트 배경도 이 단계에서 처음 나타남
      const cs = q2('.lec2-c'), r1 = cs.slice(0, 4), r2 = cs.slice(4, 8);   // 한 줄 = [코드 이름, 음, 음, 음]
      const show = function (row) { return fx(row.filter(function (el) { return el.textContent; }), 'is-in', true, 90); };
      return wait(FADE_MS).then(function () { return show(r1); }).then(function () { return wait(200); }).then(function () { return show(r2); })
        .then(function () { return wait(300); }).then(function () { return fx([r1[2], r1[3], r2[1], r2[2]], 'is-focus', true); });   // 파랑: Em의 G·B / G의 G·B
    } },
    // 10. 작은별 — 위층(분류판)이 사라지고 원곡 코드 8칸이 나타난 뒤 아래에 기능 라벨(파랑)이 붙음
    { text: '노래는 ' + em('긴장과 해결') + '의 반복으로 이루어져요\n' + em('예비') + ' 코드는 중간 역할을 해요', run: function () {
      $('lec2-a').classList.remove('is-on');
      $('lec2-b').classList.add('is-on');
      return wait(FADE_MS).then(function () { return fx(q2('#lec2-orig .lec2-sname'), 'is-in', true, 60); })
        .then(function () { return wait(200); }).then(function () { return fx(q2('#lec2-orig .lec2-slab'), 'is-in', true, 100); });
    } },
    // 11. 새 진행 — 원곡은 옅어지고 그 아래에 새 진행이 나타남. 코드마다 기능 색(해결 파랑 / 예비 보라 / 긴장 코랄)
    { text: '같은 기능의 ' + em('대리코드') + '로\n새로운 진행을 만들 수 있어요', run: function () {
      fx(q2('#lec2-orig .lec2-sname').concat(q2('#lec2-orig .lec2-slab')), 'is-dim', true);
      const nn = q2('#lec2-new .lec2-sname');
      return fx(nn, 'is-in', true, 70);
    } },
    // 12. 새 진행으로 작은별 재생 — 멜로디 피아노 + 코드 기타(1장 동요와 같은 음량 균형), 울리는 칸만 파랑 + 가사
    { text: '작은별의 진행을 바꿔서 들어볼게요!', run: function () {
      const tok = L.tok, ly = $('lec-lyrics');
      ly.innerHTML = lyricsHtml();
      ly.classList.add('is-in');
      return wait(FADE_MS).then(function () { return withTimeout(GuitarAudio.pianoReady(), READY_TIMEOUT_MS); }).then(function () {
        if (tok !== L.tok) return NEVER();
        GuitarAudio.setOutputTrim(SONG_GUITAR_TRIM);
        GuitarAudio.setPianoGain(SONG_PIANO_GAIN);
        L.trimmed = true;
        const t0 = audioT0(), BEAT_MS = SONG_BEAT * 1000;
        SONG2_NEW.forEach(function (c, s) {
          strum(fretsToMidis(VOICINGS[c]), t0 + s * 2 * SONG_BEAT, 2 * SONG_BEAT * 0.95, 0.6, 'weak');
          later(function () { hotSong(s); }, LEAD_MS + s * 2 * BEAT_MS);
        });
        const syl = playMelody(ly, t0), end = LEAD_MS + SONG_BEATS * BEAT_MS;
        later(function () {
          hotSong(-1);
          syl.forEach(function (el) { el.classList.remove('is-on'); el.classList.add('is-sung'); });
        }, end);
        return wait(end);
      });
    } },
    // 13. 앞으로 풀 문제 안내 — 문구만
    { text: '2장에서는 코드를 기능별로 나눠 보고\n직접 바꿔 보는 훈련을 할 거예요', run: function () { return Promise.resolve(); } },
    endingStep(2),   // 14. 마무리(공통)
  ];
  // "다음" 묶음: [1] / [2~4] / [5~6] / [7~9] / [10] / [11~12] / [13] / [14]
  const GROUPS_CH2 = [[0], [1, 2, 3], [4, 5], [6, 7, 8], [9], [10, 11], [12], [13]];
  STEPS_CH2[3].ms = 8300;     // 7th 코드 7개 + I 한 번 더(0.75초 간격) + 마지막 C 꼬리
  STEPS_CH2[11].ms = 14500;   // 동요(80 BPM 약 12초) + 마지막 음 꼬리
  // ── 챕터 3 단계 ── 꾸밈코드(sus2·sus4·add9) + 전위코드·패싱코드
  // 각 단계의 핵심(CLAUDE.md 0-5) — 최종 목적: 1·4·5도에 쓸 수 있는 꾸밈코드(도수별 표), 1전위의 모양과 이름(C/E), 전위코드의 역할(맨 아래 음 잇기·패싱코드)을 외우고 쓰기
  //  1 7개 코드 이름이 출발점                                   2 꾸밀 수 있는 것은 1·4·5도(C F G만 파랑, 나머지 옅게)
  //  3 sus = 3음이 이동(옮겨 간 음만 파랑)                      4 sus4는 원래 코드로 돌아가려는 힘(F→E, 소리로 해결)
  //  5 add9 = 음이 추가됨(끼어드는 D만 파랑)                    6 도수별로 쓸 수 있는 꾸밈코드 표(외울 대상)
  //  7 1도 sus4는 해결 / 5도 sus4는 그대로도 됨(소리 + 힌트)     8 3음이 맨 아래로 = 1전위, 이름은 C/E(옮겨 간 음과 새 이름만 파랑)
  //  9 전위코드 = 맨 아래 음을 이어 줌(맨 아래 음 글자가 핵심)    10 긴 진행 속 패싱코드(전위코드만 파랑)
  // 11 전위코드도 같은 기능 칸에 들어감(새 칸)                  12 전위코드는 양쪽 코드로 대체(사슬)
  // 13 전위코드가 든 작은별(소리)  14 앞으로 할 훈련 안내  15 마무리(공통)
  const VOICINGS3 = {   // 꾸밈코드·전위코드 오픈 보이싱(줄 6→1, -1 = 안 침)
    Csus2: [-1, 3, -1, 0, 3, 3], Csus4: [-1, 3, 3, 0, 1, 1], Cadd9: [-1, 3, 2, 0, 3, 0], Gsus4: [3, 2, 0, 0, 1, 3], Fadd9: [1, -1, 3, 2, 1, 3],
    'C/E': [0, 3, 2, 0, 1, 0], 'F/A': [-1, 0, 3, 2, 1, 1], 'G/B': [-1, 2, 0, 0, 0, 3],
  };
  function v3(c) { return VOICINGS3[c] || VOICINGS[c]; }
  const INV3 = ['C/E', 'F/A', 'G/B'];
  const DECO3 = { 0: ['Csus2', 'Cadd9', 'Csus4'], 3: ['Fsus2', 'Fadd9'], 4: ['Gsus2', 'Gadd9', 'Gsus4'] };   // 코드 줄에서 꾸밀 수 있는 코드(열 번호 → 아래로 나열)
  const INV_COLS = [0, 3, 4];   // 코드 줄에서 1전위가 되는 열(C·F·G)
  FUNC_IDX['C/E'] = 0; FUNC_IDX['F/A'] = 1; FUNC_IDX['G/B'] = 2;
  FUNC_OF['C/E'] = '해결'; FUNC_OF['F/A'] = '예비'; FUNC_OF['G/B'] = '긴장';
  const FUNCS3 = [
    { head: '해결', sub: '토닉', chords: ['C', 'C/E', 'Em', 'Am'] },
    { head: '예비', sub: '서브도미넌트', chords: ['F', 'F/A', 'Dm'] },
    { head: '긴장', sub: '도미넌트', chords: ['G', 'G/B', 'Bdim'] },
  ];
  const CHAINS3 = [['C', 'C/E', 'Em'], ['F', 'F/A', 'Am'], ['G', 'G/B', 'Bdim']];
  const P3_DECO = ['Fadd9', 'Gsus4', 'Cadd9', '%'], P3_DECO_PLAY = ['Fadd9', 'Gsus4', 'Cadd9', 'Cadd9'];   // 1페이즈 마무리 진행 — 마지막 칸은 앞 칸 반복(%)
  const P3_SUM_A = ['Fadd9', 'Gsus4', 'Csus2'], P3_SUM_B = ['C/E', 'F/A', 'G/B'];   // 3장 요약 — 이번에 배운 꾸밈코드 / 전위코드
  const P3_A = ['F', 'G', 'C', '%'], P3_A_BASS = ['F', 'G', 'C', ''];   // 마지막 칸 %는 앞 칸 반복 — 표시만 하고 재생은 생략(PLAY_N = 재생하는 칸 수)
  const P3_B = ['F/A', 'G/B', 'C', '%'], P3_B_BASS = ['A', 'B', 'C', ''], P3_PLAY_N = 3;
  const P3_LONG = ['C', 'G/B', 'Am', 'G', 'F', 'C/E', 'Dm', 'G/B'], P3_PASS = [1, 5, 7];
  const SONG3_NEW = ['C', 'Em', 'F', 'C/E', 'Dm', 'F/A', 'G/B', 'C'];   // 전위코드(C/E·F/A·G/B)만 파랑 강조
  function progHtml(chords, labels, id) {
    return '<div class="lec2-prog" id="' + id + '">' + chords.map(function (c, i) {
      return '<div class="lec2-slot"><span class="lec2-sname">' + c + '</span><span class="lec2-slab">' + (labels[i] || '') + '</span></div>';
    }).join('') + '</div>';
  }
  // 챕터 3 무대 — 다섯 층을 같은 칸에 겹쳐 두고 투명도로만 전환: a 코드 7개 / b sus·add9 시연 + 도수별 표 / c 진행 / d 기능 분류판 + 양쪽 대체 사슬 / e 작은별
  function buildStage3() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2', 'is-ch3');
    let colHtml = '';
    for (let i = 0; i < 7; i++) {
      colHtml += '<div class="lec-col"><span class="lec-name">&nbsp;</span><div class="lec-stack">' +
        [1, 2, 3].map(function (r) { return '<span class="lec-note" data-row="' + r + '">&nbsp;</span>'; }).join('') + '</div></div>';
    }
    const widget = function (id, ins) {
      return '<div class="lec3-w" id="' + id + '"><span class="lec-name">&nbsp;</span><div class="lec3-rows">' +
        [0, 1, 2, 3].map(function (k) {
          if (k === 1 && !ins) return '';
          return '<span class="lec-note' + (k === 1 ? ' lec3-ins' : '') + '">&nbsp;</span>';
        }).join('') + '</div></div>';
    };
    const board = FUNCS3.map(function (f, i) {
      return '<div class="lec2-fcol" data-f="' + i + '"><span class="lec2-fhead is-in">' + f.head + '</span><span class="lec2-fsub is-in">' + f.sub + '</span><div class="lec2-cells">' +
        f.chords.map(function (c) { return '<span class="lec2-cell' + (INV3.indexOf(c) < 0 ? ' is-in' : '') + '" data-ch="' + c + '">' + c + '</span>'; }).join('') + '</div></div>';
    }).join('');
    const chain = CHAINS3.map(function (r) {
      return '<span class="lec3-cr">' + r.map(function (c) { return '<span class="lec3-chn" data-fn="' + FUNC_IDX[c] + '">' + c + '</span>'; }).join('<i>↔</i>') + '</span>';
    }).join('');
    const neu = scoreHtml('lec3-new', function (i, b) {   // 악보 2줄×4칸(칸 번호는 8개를 이어서) — 전위코드만 파랑, 나머지는 기본 글자색
      const c = SONG3_NEW[i];
      return '<div class="lec2-slot" data-b="' + b + '"><span class="lec2-sname' + (INV3.indexOf(c) >= 0 ? ' is-focus' : '') + '">' + c + '</span></div>';
    });
    stage.innerHTML =
      '<div class="lec3-l is-on" id="lec3-a"><div class="lec-grid lec2-grid" id="lec-grid">' + colHtml + '</div></div>' +
      '<div class="lec3-l" id="lec3-b"><div class="lec3-demo is-on" id="lec3-demo">' + widget('lec3-wa') + widget('lec3-wb', true) + '</div></div>' +
      '<div class="lec3-l lec3-c" id="lec3-c"><div class="lec3-pg lec3-pg12" id="lec3-pg12">' + progHtml(P3_A, P3_A_BASS, 'lec3-p1') + progHtml(P3_B, P3_B_BASS, 'lec3-p2') + '</div>' +
        '<div class="lec3-pg lec3-pg3" id="lec3-pg3">' + [0, 4].map(function (o) { return progHtml(P3_LONG.slice(o, o + 4), P3_LONG.slice(o, o + 4).map(function (c, i) { return P3_PASS.indexOf(o + i) >= 0 ? '패싱' : ''; }), 'lec3-p3' + (o ? 'b' : 'a')); }).join('') + '</div></div>' +
      '<div class="lec3-l lec3-d" id="lec3-d"><div class="lec2-board" id="lec3-board">' + board + '</div><div class="lec3-chain" id="lec3-chain">' + chain + '</div></div>' +
      '<div class="lec3-l lec3-sum" id="lec3-g">' + progHtml(P3_SUM_A, [], 'lec3-sa') + progHtml(P3_SUM_B, [], 'lec3-sb') + '</div>' +
      '<div class="lec3-l lec3-c" id="lec3-f"><div class="lec3-pg lec3-pg12">' + progHtml(P3_DECO, [], 'lec3-pf') + '</div></div>' +
      '<div class="lec3-l lec3-e" id="lec3-e">' + neu + '</div>';
  }
  // 코드 줄에서 C·F·G 세 열만 가운데로 모음(7열 폭 W를 3열 간격 PITCH로 — 꾸밈코드가 이름과 같은 크기로 들어갈 자리). 열 가운데는 7열 기준 (i-3)×W → -PITCH / 0 / +PITCH
  // 보이지 않는 사이(a층이 꺼져 있을 때)에 곧바로 옮김 — 층이 나타날 때 이미 모여 있음
  function gatherCols(animated) {
    const cs = cols(), W = cs[0].getBoundingClientRect().width, PITCH = 100, dx = { 0: 3 * W - PITCH, 3: 0, 4: PITCH - W };
    INV_COLS.forEach(function (i) { cs[i].style.transition = animated ? 'transform 600ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none'; cs[i].style.transform = 'translateX(' + dx[i] + 'px)'; });
    void grid().offsetWidth;
    if (!animated) INV_COLS.forEach(function (i) { cs[i].style.transition = ''; });
  }
  // 한 열 아래로 꾸밀 수 있는 코드를 위에서 아래로 나열(아직 비어 있는 음 줄 자리를 빌려 씀)
  function listCol(ci) {
    const els = DECO3[ci].map(function (t, k) { const el = rowOf(k + 1)[ci]; el.textContent = t; el.classList.add('lec3-deco'); return el; });
    return fx(els, 'is-in', true);   // 한 열의 코드는 한 묶음으로 한 번에(열마다 한 번씩, 총 세 번의 등장)
  }
  function w3(id) { return { el: $(id), name: q2('#' + id + ' .lec-name')[0], rows: q2('#' + id + ' .lec-note') }; }
  // 시연 코드 이름 — 바뀐 꼬리(sus2·sus4·add9)만 파랑. 외울 것이 그 꼬리라서
  function setName(w, root, sfx) {
    return swap(w.name, function () { w.name.innerHTML = root + (sfx ? '<span class="lec3-sfx">' + sfx + '</span>' : ''); }, 150);
  }
  // 음이 한 칸 굴러서 바뀜 — 옛 글자가 밀려 나가고 새 글자가 반대편에서 들어옴(제자리에서 페이드로 바뀌면 "이동"으로 안 보임).
  // 줄은 위가 낮은 음이라 음이 내려가면(E→D) 위로, 올라가면(E→F) 아래로 굴러 나감. dir: -1 위로 / +1 아래로. focus: 바뀐 음을 파랑으로 둘지(되돌릴 땐 끔)
  function rollNote(el, text, dir, focus) {
    const H = 18;
    const a = anim(el, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (dir * H) + 'px)', opacity: 0 }], { duration: 220, easing: EASE_IN, fill: 'both' });
    a.onfinish = function () {
      a.cancel();
      el.textContent = text;
      el.classList.toggle('is-focus', focus);
      anim(el, [{ transform: 'translateY(' + (-dir * H) + 'px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, easing: EASE_OUT });
    };
  }
  // 투명도 전환 없이 곧바로 보이게(겹쳐 있는 복사본이 갈라지는 순간 — 같은 글자가 겹쳐 페이드되면 한순간 진해 보임)
  function showNow(els) {
    els.forEach(function (el) { el.style.transition = 'none'; el.classList.add('is-in'); });
    void els[0].offsetWidth;
    els.forEach(function (el) { el.style.transition = ''; });
  }
  const SETTLE_MS = 700;   // 음·이름이 바뀌는 연출(굴러 바뀜 약 0.5초, 이름 교체 약 0.5초)이 끝나는 시간 — 소리는 바뀐 뒤에 냄(동시에 나면 어느 것을 봐야 할지 혼란)
  const SPLIT_DX = 72;   // 갈라진 두 코드의 가운데에서 떨어진 거리(px) — 360px 폭에서 Csus2·Csus4 이름(약 55px) 사이가 약 90px 남음
  // 진행의 칸 중 지금 울리는 칸만 진하게(나머지는 옅게). i < 0이면 해제
  function hotSlots(slots, i) {
    slots.forEach(function (s, j) { s.classList.toggle('is-quiet', i >= 0 && j !== i); });
  }
  // 코드 여러 개를 한 칸(slot ms)씩 재생 — 소리는 기타, 울리는 칸만 진하게. 끝나면 풀리는 약속
  function playSlots(slots, chords, slot, map, vf) {   // map: 코드 번호 → 켤 칸 번호(없으면 같은 번호). 마지막에 처음 칸으로 돌아오는 마무리 코드용 / vf: 코드 → 보이싱(없으면 v3, 6장은 v6)
    const t0 = audioT0();
    chords.forEach(function (c, k) {
      const last = k === chords.length - 1;
      strum(fretsToMidis((vf || v3)(c)), t0 + k * slot / 1000, last ? 1.4 : slot / 1000 * 0.9, last ? 0.8 : 0.4);
      later(function () { hotSlots(slots, map ? map[k] : k); }, LEAD_MS + k * slot);
    });
    later(function () { hotSlots(slots, -1); }, LEAD_MS + chords.length * slot + 300);
    return wait(LEAD_MS + chords.length * slot + 300 + FADE_MS);
  }
  const STEPS_CH3 = [
    // 1. 도입 — 다이어토닉 코드 7개 이름이 차례로 나타남(도수 없음)
    { text: '코드를 좀 더 세련되게 꾸미는 방법이 있어요', run: function () {
      const nm = names();
      nm.forEach(function (el, i) { el.textContent = C_NAMES[i]; });
      return fx(nm, 'is-in', true, 60).then(function () { return wait(600); });
    } },
    // 2. 꾸밀 수 있는 코드 — 1·4·5도(C F G)만 파랑, 나머지는 옅게
    { text: '1, 4, 5도 코드를\n' + em('sus2, sus4, add9') + '의 코드로 꾸밀 수 있어요!', run: function () {
      const nm = names();
      fx(nm.filter(function (el, i) { return INV_COLS.indexOf(i) < 0; }), 'is-in', false);   // 나머지 4개는 사라지고
      return fx(INV_COLS.map(function (i) { return nm[i]; }), 'is-focus', true, 120).then(function () { return wait(500); }).then(function () {
        gatherCols(true);   // C·F·G 세 열만 가운데로 모임
        return wait(900);
      }).then(function () {   // 꾸밀 수 있는 코드를 C → F → G 순서로 각 코드 아래에 나열(이름과 같은 크기)
        return INV_COLS.reduce(function (p, ci) {
          return p.then(function () { return listCol(ci).then(function () { return wait(300); }); });
        }, Promise.resolve());
      }).then(function () { return wait(800); });
    } },
    // 3. sus — 가운데에 C E G 하나가 나타나고, 복사본이 겹친 채 있다가 좌우로 갈라짐(같은 C에서 갈라진 둘). 3음(E)이 왼쪽은 D로(위로 굴러), 오른쪽은 F로(아래로 굴러) 바뀜 — 바뀐 음·이름 꼬리만 파랑. 소리도 C → Csus2 → Csus4
    { text: 'sus는 ' + em('이동하다') + '라는 뜻이에요\n3음(가운데 음)이 위나 아래로 이동해요', run: function () {
      const a = w3('lec3-wa'), b = w3('lec3-wb'), t0 = audioT0(), SPLIT = 2300, M = SPLIT + 1100, M2 = M + 2300;
      a.name.textContent = 'C'; b.name.textContent = 'C';
      ['C', 'E', 'G'].forEach(function (n, i) { a.rows[i].textContent = n; });
      ['C', 'D', 'E', 'G'].forEach(function (n, i) { b.rows[i].textContent = n; });   // b의 둘째 줄(D)은 add9 단계까지 접혀 있음
      $('lec3-a').classList.remove('is-on');
      $('lec3-b').classList.add('is-on');
      strum(fretsToMidis(VOICINGS.C), t0 + 1.4, 1.1, 0.5);
      strum(fretsToMidis(VOICINGS3.Csus2), t0 + (M + SETTLE_MS) / 1000, 1.2, 0.5);
      strum(fretsToMidis(VOICINGS3.Csus4), t0 + (M2 + SETTLE_MS) / 1000, 1.7, 0.8);
      wait(FADE_MS).then(function () { return fx([a.name], 'is-in', true); }).then(function () { return fx(a.rows, 'is-in', true, 40); });
      later(function () {   // 갈라짐 — 겹쳐 있던 복사본이 보이는 순간 둘이 반대로 미끄러짐
        showNow([b.name, b.rows[0], b.rows[2], b.rows[3]]);
        a.el.style.transform = 'translateX(' + (-SPLIT_DX) + 'px)';
        b.el.style.transform = 'translateX(' + SPLIT_DX + 'px)';
      }, LEAD_MS + SPLIT);
      later(function () { rollNote(a.rows[1], 'D', -1, true); setName(a, 'C', 'sus2'); }, LEAD_MS + M);
      later(function () { rollNote(b.rows[2], 'F', 1, true); setName(b, 'C', 'sus4'); }, LEAD_MS + M2);
      return wait(LEAD_MS + M2 + SETTLE_MS + 1700);
    } },
    // 4. sus4는 원래대로 돌아가려는 힘 — sus2(왼쪽)는 사라지고 sus4의 F가 E로 굴러 돌아가며 C로 해결(소리 포함), 남은 C는 가운데로 돌아옴(다음 add9가 이어 받음)
    { text: 'sus4는 원래대로\n' + em('돌아가려는 힘') + '이 강해요!', run: function () {
      const a = w3('lec3-wa'), b = w3('lec3-wb'), t0 = audioT0(), G = 300, M = 2700;
      fx([a.name].concat(a.rows), 'is-in', false);
      later(function () { b.el.style.transform = ''; }, G);   // 혼자 남은 Csus4가 가운데로 옴(sus2가 사라지는 동안)
      strum(fretsToMidis(VOICINGS3.Csus4), t0 + 1.0, 1.6, 0.6);
      strum(fretsToMidis(VOICINGS.C), t0 + (M + SETTLE_MS) / 1000, 1.7, 0.8);
      later(function () { rollNote(b.rows[2], 'E', -1, false); setName(b, 'C', ''); }, LEAD_MS + M);
      return wait(LEAD_MS + M + SETTLE_MS + 1800);
    } },
    // 5. add9 — 가운데로 돌아온 C E G(같은 코드)에서 C와 E 사이에 D가 끼어듦(E·G는 한 칸씩 내려가며 자리를 엶). 이름은 Cadd9
    { text: 'add9은 ' + em('추가하다') + '라는 뜻이에요', run: function () {
      const b = w3('lec3-wb'), t0 = audioT0(), M = 2200;
      strum(fretsToMidis(VOICINGS.C), t0 + 0.8, 1.1, 0.5);
      strum(fretsToMidis(VOICINGS3.Cadd9), t0 + (M + SETTLE_MS) / 1000, 1.9, 0.9);
      later(function () {
        const sib = [b.rows[2], b.rows[3]], before = sib.map(function (el) { return el.getBoundingClientRect().top; });
        b.rows[1].classList.add('is-open');
        sib.forEach(function (el, i) {
          anim(el, [{ transform: 'translateY(' + (before[i] - el.getBoundingClientRect().top) + 'px)' }, { transform: 'translateY(0)' }], { duration: 500, easing: EASE_INOUT });
        });
        fx([b.rows[1]], ['is-in', 'is-focus'], true);
        setName(b, 'C', 'add9');
      }, LEAD_MS + M);
      return wait(LEAD_MS + M + SETTLE_MS + 2200);
    } },
    // 5-2. add9와 sus2 — 문구만(앞 장면 그대로)
    { text: '기타는 모양이 안 나오는 경우가 있어서\n' + em('sus2') + '랑 크게 구분하지 않을 때가 있어요', run: function () { return Promise.resolve(); } },
    // 6. 4도 — 시연이 사라지고 코드 줄(a층)이 C·F·G 세 열만 가운데로 모인 채 돌아옴(나머지 4개는 없음). 아래로 쓸 수 있는 꾸밈코드가 C → F → G 순서로 나열되고, F(4도)만 파랑으로 남아 sus4가 없음을 보여 줌
    { text: em('4도') + '는 sus4를 잘 쓰지 않아요', run: function () {
      const nm = names();
      // 2단계에서 나열했던 꾸밈코드를 치우고(a층이 안 보이는 사이) 다시 하나씩 나열
      notes123().forEach(function (el) { el.style.transition = 'none'; el.classList.remove('is-in'); });
      void grid().offsetWidth;
      notes123().forEach(function (el) { el.style.transition = ''; });
      fx([nm[0], nm[4]], 'is-focus', false);   // 4도(F)만 파랑
      $('lec3-b').classList.remove('is-on');
      $('lec3-a').classList.add('is-on');
      return wait(FADE_MS + 700).then(function () {
        return INV_COLS.reduce(function (p, ci) {
          return p.then(function () { return listCol(ci).then(function () { return wait(500); }); });
        }, Promise.resolve());
      }).then(function () { return wait(1500); });
    } },
    // 7. 해결(1도) — 나열이 사라지고 위의 코드 이름 자체가 바뀜: C → Csus4(꼬리 파랑). 설명(읽는 시간)이 먼저, 소리는 그 뒤에 따로: Csus4 → C(해결)
    { text: '1도 sus4는 C로 ' + em('해결') + '해 주는 게 좋아요', run: function () {
      const nm = names(), C = nm[0], F = nm[3], t0 = audioT0(), A = 700, READ = 1800, S1 = A + READ, R = S1 + 1700;
      const sfx = function (root, tail) { return root + (tail ? '<span class="lec3-sfx">' + tail + '</span>' : ''); };
      fx(notes123(), ['is-in', 'is-focus'], false);
      fx(nm, 'is-focus', false);
      fx([F], 'is-dim', true);
      later(function () { swap(C, function () { C.innerHTML = sfx('C', 'sus4'); }); }, LEAD_MS + A);
      strum(fretsToMidis(VOICINGS3.Csus4), t0 + S1 / 1000, 1.6, 0.6);
      strum(fretsToMidis(VOICINGS.C), t0 + (R + SETTLE_MS) / 1000, 1.7, 0.8);
      later(function () { swap(C, function () { C.innerHTML = 'C'; }); }, LEAD_MS + R);
      return wait(LEAD_MS + R + SETTLE_MS + 1800);
    } },
    // 8. 긴장(5도) — G → Gsus4(꼬리 파랑, 그대로 둠). 설명이 먼저, 소리는 그 뒤에
    { text: '5도 sus4는 그 자체로 ' + em('긴장') + '이라 안 가도 돼요', run: function () {
      const G_ = names()[4], t0 = audioT0(), A = 500, READ = 1800, S1 = A + READ;
      later(function () { swap(G_, function () { G_.innerHTML = 'G<span class="lec3-sfx">sus4</span>'; }); }, LEAD_MS + A);
      strum(fretsToMidis(VOICINGS3.Gsus4), t0 + S1 / 1000, 2.0, 1.0);
      return wait(LEAD_MS + S1 + 2400);
    } },
    // 9-2. 꾸밈코드 진행 — 1페이즈 마무리. 코드 줄이 사라지고 Fadd9 → Gsus4 → Cadd9 → %(반복)이 나타나 재생(울리는 칸만 진하게)
    { text: '꾸밈코드를 넣은 진행을 들어볼까요?', run: function () {
      const nn = q2('#lec3-pf .lec2-sname'), sl = q2('#lec3-pf .lec2-slot');
      $('lec3-a').classList.remove('is-on');
      $('lec3-f').classList.add('is-on');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 120); })
        .then(function () { return wait(600); })
        .then(function () { return playSlots(sl, P3_DECO_PLAY, 1100); });
    } },
    // 페이즈 2 진입 — 앞 장면(꾸밈코드 진행)이 사라지고 문구만 남는 숨 고르기. 바로 다음 단계가 이어 받음
    { text: '다음은 ' + em('전위코드') + '에 대해서\n배워볼게요',
      enter: function () { $('lec3-f').classList.remove('is-on'); },   // 문구가 뜰 때 곧바로 앞 장면(페이즈 1)을 지움
      run: function () { return wait(FADE_MS + 1200); } },
    // 8. 1전위 — 코드 줄이 다시 나타나고 음이 3줄 쌓임. C·F·G에서 가운데 3음이 맨 아래로 내려가며(파랑) 이름이 C/E·F/A·G/B로 바뀜
    { text: '가운데 3음을 맨 아래로 옮기면 ' + em('1전위') + '예요\n이름은 C/E처럼 ' + em('맨 아래 음') + '을 뒤에 적어요', run: function () {
      const nm = names(), t0 = audioT0(), INV_AT = 2500, NAME_AT = INV_AT + 900;
      // 앞 단계의 꾸밈코드 나열을 치우고 7열·이름 7개를 원래대로(a층은 이때 안 보이는 상태)
      notes123().forEach(function (el) { el.style.transition = 'none'; el.classList.remove('is-in', 'is-focus', 'lec3-deco'); });
      nm.forEach(function (el, i) { el.style.transition = 'none'; el.classList.add('is-in'); el.textContent = C_NAMES[i]; });   // 이름도 원래대로(해결 설명에서 Gsus4로 바꾼 G 등) — 기본 코드 7개가 보여야 함
      cols().forEach(function (c) { c.style.transition = 'none'; c.style.transform = ''; });
      void grid().offsetWidth;
      notes123().concat(nm, cols()).forEach(function (el) { el.style.transition = ''; });
      [1, 2, 3].forEach(function (r) { rowOf(r).forEach(function (el, i) { el.textContent = ROWS[r][i]; }); });
      $('lec3-b').classList.remove('is-on');
      $('lec3-a').classList.add('is-on');
      $('lec3-f').classList.remove('is-on');
      fx(nm, ['is-dim', 'is-focus'], false);
      strum(fretsToMidis(VOICINGS.C), t0 + 1.2, 1.3, 0.6);
      strum(fretsToMidis(VOICINGS3['C/E']), t0 + (NAME_AT + SETTLE_MS) / 1000, 1.9, 0.9);
      wait(FADE_MS).then(function () { return fx(notes123(), 'is-in', true, 25); });
      later(function () {
        INV_COLS.forEach(function (i) {
          const rows = [rowOf(1)[i], rowOf(2)[i], rowOf(3)[i]], tops = rows.map(function (el) { return el.getBoundingClientRect().top; });
          rows[1].classList.add('is-focus');
          rows[0].parentNode.appendChild(rows[1]);   // 가운데 음을 맨 아래 줄로
          rows.forEach(function (el, k) {
            anim(el, [{ transform: 'translateY(' + (tops[k] - el.getBoundingClientRect().top) + 'px)' }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE_INOUT });
          });
        });
      }, LEAD_MS + INV_AT);
      later(function () {
        INV_COLS.forEach(function (i, k) { swap(nm[i], function () { nm[i].innerHTML = INV3[k]; }, k * 60); });
        fx(INV_COLS.map(function (i) { return nm[i]; }), 'is-focus', true);
      }, LEAD_MS + NAME_AT);
      later(function () { fx(nm.concat(notes123()), 'is-focus', false); }, LEAD_MS + NAME_AT + SETTLE_MS + 1500);
      return wait(LEAD_MS + NAME_AT + SETTLE_MS + 2000);
    } },
    // 9. 전위코드의 역할 — C C F G → C C/E F G. 칸마다 맨 아래 음이 아래에 붙고, 둘째 진행에서 E(전위로 바뀐 음)가 파랑
    { text: '전위코드는 ' + em('근음') + '을 이어 주는 역할로 많이 쓰여요', run: function () {
      const sl1 = q2('#lec3-p1 .lec2-slot'), sl2 = q2('#lec3-p2 .lec2-slot'), n1 = q2('#lec3-p1 .lec2-sname'), b1 = q2('#lec3-p1 .lec2-slab'),
        n2 = q2('#lec3-p2 .lec2-sname'), b2 = q2('#lec3-p2 .lec2-slab');
      $('lec3-a').classList.remove('is-on');
      $('lec3-c').classList.add('is-on');
      return wait(FADE_MS).then(function () { return fx(n1, 'is-in', true, 60); })
        .then(function () { return fx(b1, 'is-in', true, 60); })
        .then(function () { return wait(500); })
        .then(function () { return playSlots(sl1, P3_A.slice(0, P3_PLAY_N), 1400); })
        .then(function () { fx(n1.concat(b1), 'is-dim', true); return fx(n2, 'is-in', true, 60); })
        .then(function () { return fx(b2, 'is-in', true, 60); })
        .then(function () { fx([b2[0], b2[1]], 'is-focus', true); return wait(500); })
        .then(function () { return playSlots(sl2, P3_B.slice(0, P3_PLAY_N), 1400); });
    } },
    // 10. 패싱코드 — 위 진행이 사라지고 8칸 긴 진행이 나타나 재생. 끝나면 전위코드 칸만 파랑 + "패싱" 라벨
    { text: '이런 긴 진행도 만들 수 있어요\n코드 사이를 부드럽게 이어주기 때문에 ' + em('패싱코드') + '라고도 해요', run: function () {
      const sl = q2('#lec3-pg3 .lec2-slot'), nn = q2('#lec3-pg3 .lec2-sname'), lb = q2('#lec3-pg3 .lec2-slab');   // 8칸을 4칸씩 두 줄로 놓았지만 칸 번호는 8개를 이어서(위 줄 0~3, 아래 줄 4~7)
      $('lec3-pg12').classList.add('is-off');
      $('lec3-pg3').classList.add('is-on');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 40); })
        .then(function () { return wait(400); })
        // 8코드에 이어 같은 박자로 처음 코드(C)를 한 번 더 — 마무리처럼 끊김 없이 이어지고, 마지막 C는 길게 울림(켜지는 칸은 첫 칸으로 돌아감)
        .then(function () { return playSlots(sl, P3_LONG.concat([P3_LONG[0]]), 1000, [0, 1, 2, 3, 4, 5, 6, 7, 0]); })
        .then(function () {
          fx(P3_PASS.map(function (i) { return nn[i]; }), 'is-focus', true);
          return fx(P3_PASS.map(function (i) { return lb[i]; }), ['is-in', 'is-focus'], true, 120);
        })
        .then(function () { return wait(900); });
    } },
    // 11. 전위코드의 기능 분류 — 분류판(기능 3열)에 전위코드가 같은 기능 칸으로 하나씩 추가됨(자리는 처음부터 비워 둠)
    { text: '전위코드도 기능별로 나눠 볼게요!', run: function () {
      $('lec3-c').classList.remove('is-on');
      $('lec3-d').classList.add('is-on');
      const cells = INV3.map(function (c) { return q2('.lec2-cell[data-ch="' + c + '"]')[0]; });
      return wait(FADE_MS + 500).then(function () { return fx(cells, 'is-in', true, 450); }).then(function () { return wait(500); });
    } },
    // 12. 양쪽 대체 — 분류판은 옅어지고(가운데는 하얀 그라디언트가 가림) 3줄 사슬이 차례로 나타남(코드마다 기능 색)
    { text: '전위코드는 특성 상 ' + em('양쪽 코드') + '로\n모두 바꿔 쓸 수 있어요', run: function () {
      $('lec3-board').classList.add('is-faint');
      $('lec3-chain').classList.add('is-in');   // 하얀 그라디언트 배경도 이 단계에서 처음 나타남
      return wait(FADE_MS).then(function () { return fx(q2('.lec3-cr'), 'is-in', true, 500); }).then(function () { return wait(800); });
    } },
    // 13. 작은별 — 전위코드가 든 새 진행(C Em F C/E | Dm Am G/B C)이 기능 색으로 나타나고 멜로디(피아노) + 코드(기타) 재생, 울리는 칸만 진하게 + 가사
    { text: '작은별의 진행을 전위코드를 사용해서\n리하모니 해볼게요!', run: function () {
      const tok = L.tok, ly = $('lec-lyrics'), nn = q2('#lec3-new .lec2-sname'), sl = q2('#lec3-new .lec2-slot');
      ly.innerHTML = songLyricsHtml();
      layoutScore($('lec3-new'));
      $('lec3-d').classList.remove('is-on');
      $('lec3-e').classList.add('is-on');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 70); })
        .then(function () { ly.classList.add('is-in'); return wait(FADE_MS); })
        .then(function () { return withTimeout(GuitarAudio.pianoReady(), READY_TIMEOUT_MS); }).then(function () {
          if (tok !== L.tok) return NEVER();
          GuitarAudio.setOutputTrim(SONG_GUITAR_TRIM);
          GuitarAudio.setPianoGain(SONG_PIANO_GAIN);
          L.trimmed = true;
          const t0 = audioT0(), BEAT_MS = SONG_BEAT * 1000;
          SONG3_NEW.forEach(function (c, s) {
            strum(fretsToMidis(v3(c)), t0 + s * 2 * SONG_BEAT, 2 * SONG_BEAT * 0.95, 0.6, 'weak');
            later(function () { hotSlots(sl, s); }, LEAD_MS + s * 2 * BEAT_MS);
          });
          const syl = playMelody(ly, t0), end = LEAD_MS + SONG_BEATS * BEAT_MS;
          later(function () {
            hotSlots(sl, -1);
            syl.forEach(function (el) { el.classList.remove('is-on'); el.classList.add('is-sung'); });
          }, end);
          return wait(end);
        });
    } },
    // 14. 요약 — 작은별이 사라지고 이번에 배운 것(꾸밈코드 한 줄, 전위코드 한 줄)만 남음. 문구는 다음 단계(마무리)까지 이어서 이 화면 위에 보임
    { text: '이번에 배운 ' + em('꾸밈코드') + '와 ' + em('전위코드') + '를 정리했어요',
      enter: function () { $('lec3-e').classList.remove('is-on'); },   // 문구가 뜰 때 곧바로 작은별 장면을 지움
      run: function () {
        $('lec3-g').classList.add('is-on');
        return wait(FADE_MS + 300).then(function () { return fx(q2('#lec3-sa .lec2-sname'), 'is-in', true, 150); })
          .then(function () { return wait(500); })
          .then(function () { return fx(q2('#lec3-sb .lec2-sname'), 'is-in', true, 150); })
          .then(function () { return wait(800); });
      } },
    // 15. 앞으로 할 훈련 안내 — 문구만
    { text: '3장에서는 코드를 ' + em('세련되게') + ' 꾸미고,\n' + em('전위코드') + '를 익히는 훈련을 해봅시다!', run: function () { return Promise.resolve(); } },
    endingStep(3),   // 15. 마무리(공통)
  ];
  // "다음" 묶음: [1~2] / [3~5] / [6~8 도수별 꾸밈코드] / [9~10 해결 + 꾸밈코드 진행] / [11~12 전위코드 안내 + 1전위] / [13~14] / [15~16] / [17] / [18] / [19]
  const GROUPS_CH3 = [[0, 1], [2, 3, 4, 5], [6], [7, 8, 9], [10, 11], [12, 13], [14, 15], [16], [17, 18], [19]];
  STEPS_CH3[16].ms = 14500;   // 동요(80 BPM 약 12초) + 마지막 음 꼬리
  // ── 챕터 4 단계 ── 도미넌트(긴장음 F·B → 해결음 E·C) + 세컨더리 도미넌트(논-다이어토닉)
  // 각 단계의 핵심(CLAUDE.md 0-5) — 최종 목적: "타겟 코드의 5도(7th) = 그 코드의 세컨더리 도미넌트"를 빨리 찾고 V7/타겟도수 표기를 읽는 것. 강조는 문구에서 괄호로 지정한 말만(남발 금지)
  //  1 C→C 스케일 레가토(강조 없이) 뒤 긴장음 F·B(코랄)            2 F→E, B→C로 가려는 힘(해결음 E·C는 파랑)
  //  3 G7 = 긴장음 둘을 모두 가진 코드                              4 CM7 = 해결음 둘을 모두 가진 코드
  //  5 5도·1도는 잘 어울림(소리)   6 G7 → CM7 진행이 자주 나옴   7 Cm7로도 해결(바뀐 음만 파랑, 이유는 나중에)
  //  8 지배한다 / 9 도미넌트(G7 혼자 가운데에 "도미넌트" 이름표)
  // 10 다이어토닉 7th 코드 7개(위 4 · 아래 3)   11 G7이 C key의 도미넌트(G7만 파랑)   12 나머지 2~6도 아래에 도미넌트가 놓임(파랑)   13 끌어당기는 힘(문구)
  // 14 비유(문구)   15 프라이머리   16 세컨더리(둘 다 같은 크기 글자)
  // 17 무난한 다이어토닉 진행(소리)   18 G 자리에 E7이 놀러 옴(교체 + 소리)   19 세련됨(문구)   20 왼쪽부터 읽으면 Am으로 향함(화살표 + 소리)   21 타겟코드(이름표)
  // 22 E7 구성음에서 G#   23 논-다이어토닉 코드(이름표)   24 다채로워짐(문구)
  // 25 정리(7th 코드 아래 도미넌트가 차례로 다시)   26 표기법은 독특함(V7/II가 나타남)   27 앞 V7 → 뒤 타겟 도수(차례로 파랑 + 소리)
  // 28 작은별 원곡 + 29 다이어토닉만 잘 써도 나쁘지 않죠?(문구)   30 세컨더리를 넣은 진행(바뀐 3칸만 파랑 + 소리)   30·31 소감·의미(문구)   32 타겟의 5도를 빨리 찾아야 함 → 연습·실전 경험이 필요함(문구만, 작은별 진행 그대로)
  // 33 훈련 안내(문구)   34 마무리(공통)
  const NOTES4 = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const VOICINGS4 = { C7: [-1, 3, 2, 3, 1, 0], A7: [-1, 0, 2, 0, 2, 0], B7: [-1, 2, 1, 2, 0, 2], D7: [-1, -1, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0], Cm7: [-1, 3, 5, 3, 4, 3] };   // 세컨더리 도미넌트 오픈 보이싱(줄 6→1). G7·Dm7·Am7 등 다이어토닉 7th는 VOICINGS7
  function v4(c) { return VOICINGS4[c] || VOICINGS7[c] || VOICINGS[c]; }
  const SEC4 = ['A7', 'B7', 'C7', 'D7', 'E7'];                          // 2~6도(Dm7 Em7 FM7 G7 Am7) 앞에 붙는 세컨더리 도미넌트
  const ROM4 = ['V7/II', 'V7/III', 'V7/IV', 'V7/V', 'V7/VI'];           // 세컨더리 도미넌트의 도수 표기(위 SEC4와 같은 순서)
  const P4_PROG = ['C', 'G', 'Am', 'F'];                                // 무난한 다이어토닉 진행 — 둘째 칸 G가 E7로 바뀜
  const SONG4_ORIG = ['C', 'CM7', 'FM7', 'C', 'Dm7', 'CM7', 'G7', 'Am7'];
  const SONG4_NEW = ['C', 'C7', 'FM7', 'A7', 'Dm7', 'CM7', 'E7', 'Am7'];   // 바뀐 칸(번호 1·3·6)만 파랑: CM7→C7(타겟 FM7) / C→A7(타겟 Dm7) / G7→E7(타겟 Am7)
  const SONG4_CHG = [1, 3, 6];
  // 작은별 기반 진행의 3마디 "Dm7 - CM7 -"는 "Dm7 - CM7 Am7"로(챕터 4·5·6 공통): 5번 칸(CM7) 뒤쪽 1박에 Am7이 덧붙고 처음부터 보임. 위 SONG 배열은 칸마다 코드 하나로 두고, 덧붙는 코드는 여기서 따로 관리
  const SONG_TAIL = { 5: 'Am7' };
  function withTail(chords) { return chords.map(function (c, i) { return SONG_TAIL[i] ? [].concat(c, SONG_TAIL[i]) : c; }); }   // 재생용 — 덧붙는 코드를 칸의 둘째 코드로(칸 하나에 둘이면 1박씩)
  function tailHtml(i) { return SONG_TAIL[i] ? '<span class="lec2-sname lc6-tail">' + SONG_TAIL[i] + '</span>' : ''; }
  const GAP4 = 84;   // G7 · CM7 두 코드가 가운데에서 떨어진 거리(px)
  // 문구 안 긴장음 강조 — 무대의 긴장음과 같은 코랄(기능 색의 긴장)
  function emT(s) { return '<span class="lec-em lec4-tc">' + s + '</span>'; }
  // 챕터 4 무대 — 챕터 3과 같은 층 방식(.lec3-l, 같은 칸에 겹쳐 두고 투명도로만 전환): a 스케일 + 이동 / b G7·CM7 / h 7th 코드 7개 + 도미넌트 / t 표기법 미리보기 / n 프라이머리·세컨더리 / p 진행 / g E7 구성음 / x 표기 예시 / s 작은별
  function buildStage4() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2', 'is-ch4');
    const T5 = [1, 2, 3, 4, 5];   // 2~6도(Dm7 Em7 FM7 G7 Am7) — 세컨더리 도미넌트가 붙는 다섯 코드
    const list = T5.slice(0, 2).map(function (i) { return '<span class="lec4-pt">' + NAMES7[i] + '</span><span class="lec4-pw">→</span><span class="lec4-pa">' + SEC4[i - 1] + '</span>'; }).join('') + '<span class="lec4-pd">…</span>';   // 끝 장면 1: Dm7 → A7 / Em7 → B7 까지만 보이고 나머지는 …로 생략
    const fin = T5.map(function (i) { return '<div class="lec4-zk"><span class="lec4-zt">' + NAMES7[i] + '</span><span class="lec4-zs">' + SEC4[i - 1] + '</span></div>'; }).join('');   // 끝 장면 2: 5개 코드 + 각각 아래에 세컨더리
    const widget = function (id, name, notes, extra) {
      return '<div class="lec3-w" id="' + id + '"><span class="lec-name">' + name + '</span><div class="lec3-rows">' +
        notes.map(function (n) { return '<span class="lec-note">' + n + '</span>'; }).join('') + '</div>' + (extra || '') + '</div>';
    };
    const pair = function (a, b) { return '<span class="lec4-pr"><span class="lec-note">' + a + '</span><i class="lec4-ar">→</i><span class="lec-note">' + b + '</span></span>'; };
    const fam = NAMES7.map(function (n, i) {
      return '<div class="lec4-fc"><span class="lec4-fn">' + _ccFormatB5(n) + '</span><span class="lec4-fs">' + (i >= 1 && i <= 5 ? SEC4[i - 1] : '') + '</span></div>';
    }).join('');
    const nb = function (id, chords, term, sub) {
      return '<div class="lec4-nb" id="' + id + '"><div class="lec4-chs">' + chords.map(function (c) { return '<span class="lec4-ch">' + c + '</span>'; }).join('') + '</div><span class="lec4-term">' + term + '<span class="lec4-sub">' + sub + '</span></span></div>';
    };
    const prog = '<div class="lec2-prog" id="lec4-pg">' + P4_PROG.map(function (c, i) {
      return '<div class="lec2-slot"><span class="lec2-sname">' + c + '</span><span class="lec2-slab">' + (i === 2 ? '타겟' : '') + '</span></div>';
    }).join('') + '<span class="lec4-arr">→</span></div>';
    const song = scoreHtml('lec4-new', function (i, b) { return '<div class="lec2-slot' + (SONG_TAIL[i] ? ' lc6-sl is-open' : '') + '" data-b="' + b + '"><span class="lec2-sname">' + SONG4_ORIG[i] + '</span>' + tailHtml(i) + '</div>'; });
    stage.innerHTML =
      '<div class="lec3-l" id="lec4-a"><div class="lec4-sc" id="lec4-sc">' + NOTES4.map(function (n) { return '<span class="lec-note">' + n + '</span>'; }).join('') + '</div>' +
        '<div class="lec4-mv" id="lec4-mv">' + pair('F', 'E') + pair('B', 'C') + '</div></div>' +
      '<div class="lec3-l" id="lec4-b"><div class="lec3-demo">' + widget('lec4-wa', 'G7', ['G', 'B', 'D', 'F'], '<span class="lec4-nd" id="lec4-dom">도미넌트</span>') + widget('lec4-wb', 'CM7', ['C', 'E', 'G', 'B']) + '<span class="lec4-garr" id="lec4-garr">→</span></div></div>' +
      '<div class="lec3-l" id="lec4-h"><div class="lec4-fam">' + fam + '</div></div>' +
      '<div class="lec3-l" id="lec4-t"><div class="lec4-tt">' + SEC4.map(function (c, i) { return '<div class="lec4-tk"><span class="lec4-tcd">' + c + '</span><span class="lec4-trm">' + ROM4[i] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="lec3-l" id="lec4-n">' + nb('lec4-n1', ['G7'], '프라이머리', '(1차적) 도미넌트') + nb('lec4-n2', SEC4, '세컨더리', '(2차적) 도미넌트') + '</div>' +
      '<div class="lec3-l lec3-c lec4-p" id="lec4-p"><div class="lec3-pg lec3-pg12">' + prog + '</div></div>' +
      '<div class="lec3-l" id="lec4-g"><div class="lec3-demo">' + widget('lec4-we', 'E7', ['E', 'G#', 'B', 'D'], '<span class="lec4-nd">논-다이어토닉 코드</span>') + '</div></div>' +
      '<div class="lec3-l" id="lec4-x"><div class="lec4-ex"><span class="lec4-ev">V7</span><span class="lec4-es">/</span><span class="lec4-et">II</span>' +
        '<span class="lec4-ea">A7</span><span></span><span class="lec4-eb">Dm7</span></div></div>' +
      '<div class="lec3-l lec3-e" id="lec4-s">' + song + '</div>' +
      '<div class="lec3-l" id="lec4-y"><div class="lec4-pl">' + list + '</div></div>' +
      '<div class="lec3-l" id="lec4-z"><div class="lec4-zz">' + fin + '</div></div>';
  }
  // 층 하나만 보이게(id가 null이면 전부 끔) — 투명도 전환이라 한 번에 바꿔도 교차 페이드
  function layer4(id) { q2('.lec3-l').forEach(function (el) { el.classList.toggle('is-on', el.id === id); }); }
  // 진행을 재생 — seq: [[코드, [켤 칸 번호들]], …]. 앞에서부터 칸 수만큼(slot ms씩) 울리고, 울리는 칸만 진하게(나머지는 옅게). 마지막 코드는 길게
  function playSeq(slots, seq, slot) {
    const t0 = audioT0();
    let k = 0;
    seq.forEach(function (e, n) {
      const len = e[1].length, last = n === seq.length - 1, at = k;
      strum(fretsToMidis(v4(e[0])), t0 + at * slot / 1000, Math.max(len * slot / 1000 * 0.9, last ? 1.4 : 0), last ? 0.8 : 0.4);
      later(function () { slots.forEach(function (s, j) { s.classList.toggle('is-quiet', e[1].indexOf(j) < 0); }); }, LEAD_MS + at * slot);
      k += len;
    });
    later(function () { hotSlots(slots, -1); }, LEAD_MS + k * slot + 300);
    return wait(LEAD_MS + k * slot + 300 + FADE_MS);
  }
  // 작은별 — 멜로디(피아노) + 코드(기타). 울리는 칸만 진하게 + 가사
  function playSong4(chords) { return playSongScore(chords, '#lec4-new .lec2-slot', v4); }   // 칸 하나(2박)에 코드 둘(5번 칸의 CM7 · Am7)이면 1박씩
  const textOnly = function () { return Promise.resolve(); };   // 문구만 있는 단계(앞 장면 그대로)
  const STEPS_CH4 = [
    // 1. 긴장음 — C부터 높은 C까지 8음이 빠르게 레가토로 울리며(서스테인 없이, 1장 스케일과 같은 방식) 7음(C~B)이 울리는 순간 나타남(강조색 없음, 높은 도는 소리만). 끝난 뒤 F·B만 코랄(나머지 음은 옅게)
    { text: '다이어토닉에는 긴장을 만드는 음이 2개 있어요\n바로 ' + emT('F') + ' 음과 ' + emT('B') + ' 음이에요', run: function () {
      const sc = q2('#lec4-sc .lec-note'), t0 = audioT0(), W = FADE_MS, STEP = 220;
      layer4('lec4-a');
      SCALE_MIDI.forEach(function (m, i) {   // 소리는 8음(높은 도까지), 화면은 7음만 — 높은 도는 소리만 나고 표시는 없음
        const last = i === SCALE_MIDI.length - 1;
        note(m, t0 + (W + i * STEP) / 1000, last ? 1.2 : STEP / 1000, last ? 0.8 : 0.18);   // 레가토: 다음 음이 시작될 때까지 울리고 0.18초 페이드 — 두 음 이상 쌓이지 않음
        if (sc[i]) later(function () { fx([sc[i]], 'is-in', true); }, LEAD_MS + W + i * STEP);
      });
      return wait(W + SCALE_MIDI.length * STEP + 1200)
        .then(function () { fx(sc.filter(function (el, i) { return i !== 3 && i !== 6; }), 'is-dim', true); return fx([sc[3], sc[6]], 'is-tense', true, 300); })
        .then(function () { return wait(900); });
    } },
    // 2. 이동하려는 성질 — F→E, B→C가 차례로 나타나며 소리(긴장음 → 해결음). 도착하는 해결음 E·C는 파랑(스케일에서도 같이 켜짐)
    { text: '이 둘은 각각 ' + em('E') + ' 음과 ' + em('C') + ' 음으로\n이동하려는 성질이 강해요', run: function () {
      const sc = q2('#lec4-sc .lec-note'), pr = q2('#lec4-mv .lec4-pr'), t0 = audioT0(), P = [300, 2900], MIDI = [[53, 52], [59, 60]];
      pr.forEach(function (p, k) {
        const n = p.querySelectorAll('.lec-note'), ar = p.querySelector('.lec4-ar'), tgt = k ? sc[0] : sc[2];
        note(MIDI[k][0], t0 + P[k] / 1000, 0.9, 0.5);
        note(MIDI[k][1], t0 + (P[k] + 1000) / 1000, 1.3, 0.8);
        later(function () { n[0].classList.add('is-tense'); fx([n[0]], 'is-in', true); }, LEAD_MS + P[k]);
        later(function () { fx([ar], 'is-in', true); }, LEAD_MS + P[k] + 500);
        later(function () {
          n[1].classList.add('is-focus');
          fx([n[1]], 'is-in', true);
          tgt.classList.add('is-focus');
          tgt.classList.remove('is-dim');
        }, LEAD_MS + P[k] + 1000);
      });
      return wait(LEAD_MS + P[1] + 1000 + 1800);
    } },
    // 3. G7 — 가운데에 G B D F 4음. 긴장음 F·B만 코랄. 소리는 시각 연출이 끝난 뒤
    { text: '이 둘을 모두 가진 코드가\n5도 ' + em('G7') + ' 코드예요', run: function () {
      const a = w3('lec4-wa'), t0 = audioT0(), S = 2800;
      layer4('lec4-b');
      strum(fretsToMidis(v4('G7')), t0 + S / 1000, 1.8, 0.9);
      wait(FADE_MS).then(function () { return fx([a.name], 'is-in', true); }).then(function () { return fx(a.rows, 'is-in', true, 100); })
        .then(function () { return wait(300); }).then(function () { return fx([a.rows[1], a.rows[3]], 'is-tense', true, 250); });
      return wait(S + 2200);
    } },
    // 4. CM7 — G7은 왼쪽으로 비키고 오른쪽에 C E G B. 해결음 C·E만 파랑
    { text: '해결할 음을 모두 가진 코드는\n1도 ' + em('CM7') + ' 코드예요', run: function () {
      const a = w3('lec4-wa'), b = w3('lec4-wb'), t0 = audioT0(), S = 2600;
      a.el.style.transform = 'translateX(' + (-GAP4) + 'px)';
      b.el.style.transform = 'translateX(' + GAP4 + 'px)';
      strum(fretsToMidis(v4('CM7')), t0 + S / 1000, 1.6, 0.8);
      wait(700).then(function () { return fx([b.name], 'is-in', true); }).then(function () { return fx(b.rows, 'is-in', true, 100); })
        .then(function () { return wait(300); }).then(function () { return fx([b.rows[0], b.rows[1]], 'is-focus', true, 250); });
      return wait(S + 2000);
    } },
    // 5. 잘 어울리는 조합 — 사이에 화살표, G7 → CM7 순서로 이름이 파랑이 되며 소리
    { text: '그래서 5도와 1도 코드는\n정말 잘 어울리는 조합이에요', run: function () {
      const a = w3('lec4-wa'), b = w3('lec4-wb'), t0 = audioT0(), A = 700, B = 2300;
      strum(fretsToMidis(v4('G7')), t0 + A / 1000, 1.5, 0.7);
      strum(fretsToMidis(v4('CM7')), t0 + B / 1000, 1.9, 0.9);
      fx([$('lec4-garr')], 'is-in', true);
      later(function () { fx([a.name], 'is-focus', true); }, LEAD_MS + A);
      later(function () { fx([a.name], 'is-focus', false); fx([b.name], 'is-focus', true); }, LEAD_MS + B);
      later(function () { fx([b.name], 'is-focus', false); }, LEAD_MS + B + 1800);
      return wait(LEAD_MS + B + 2100);
    } },
    // 6. 그래서 G7 → CM7 진행이 자주 나옴 — 문구만(앞 장면 그대로)
    { text: '그래서 다이어토닉에서는\n' + em('G7 → CM7') + ' 진행이 자주 나와요', run: textOnly },
    // 7. Cm7로도 해결 — 오른쪽 CM7에서 3음(E)·7음(B)이 반음씩 내려가(굴러 바뀜) Cm7이 됨. 파랑은 C·Eb만(CM7의 C·E에서 이어짐, Bb·이름·문구는 강조 없음). 이유는 뒤에서 설명한다고 문구로 예고. 소리는 바뀐 뒤 G7 → Cm7
    { text: 'G7은 Cm7 코드로도 해결할 수 있어요\n왜 그런지는 나중에 알려줄게요', run: function () {
      const a = w3('lec4-wa'), b = w3('lec4-wb'), t0 = audioT0(), A = 500, S1 = A + SETTLE_MS + 700, S2 = S1 + 1600;
      strum(fretsToMidis(v4('G7')), t0 + S1 / 1000, 1.5, 0.7);
      strum(fretsToMidis(v4('Cm7')), t0 + S2 / 1000, 2.0, 1.0);
      later(function () {
        rollNote(b.rows[1], 'Eb', -1, true);
        rollNote(b.rows[3], 'Bb', -1, false);   // 7음은 바뀌어도 강조 없음(Cm7의 강조는 C·Eb)
        setName(b, 'Cm7', '');   // 이름은 강조 없이
      }, LEAD_MS + A);
      return wait(LEAD_MS + S2 + 2100);
    } },
    // 8. 지배 — 문구만
    { text: '이렇게 5도는 1도랑 너무 잘 어울리기 때문에\n때로는 코드진행을 지배하기도 해요', run: textOnly },
    // 9. 도미넌트 — 오른쪽 코드와 화살표가 사라지고 G7이 가운데로 돌아와 "도미넌트" 이름표가 나타남
    { text: '그래서 이 코드를 ' + em('지배') + '한다는 뜻의\n' + em('도미넌트') + '라고 불러요', run: function () {
      const a = w3('lec4-wa'), b = w3('lec4-wb');
      fx([b.name].concat(b.rows), 'is-in', false);
      fx([$('lec4-garr')], 'is-in', false);
      later(function () { a.el.style.transform = ''; }, 300);
      return wait(1100).then(function () { return fx(q2('#lec4-dom'), 'is-in', true); }).then(function () { return wait(1800); });
    } },
    // 10. 다이어토닉 7th 코드 7개 — 위 4개 + 아래 3개(챕터 2의 7th 코드 줄과 같은 배치), 강조 없이
    { text: '다이어토닉 코드를 볼게요!', run: function () {
      layer4('lec4-h');
      return wait(FADE_MS).then(function () { return fx(q2('.lec4-fn'), 'is-in', true, 60); }).then(function () { return wait(800); });
    } },
    // 11. G7 = C key의 도미넌트 — G7만 파랑
    { text: '이제는 익숙해진 G7 코드가\nC key의 도미넌트예요', run: function () {
      return fx([q2('.lec4-fn')[4]], 'is-focus', true).then(function () { return wait(1300); });
    } },
    // 12. 나머지에도 도미넌트를 붙이면 — 2~6도 코드 아래에 도미넌트 코드 5개가 차례로(파랑)
    { text: '그런데 나머지 코드에도\n도미넌트를 붙이면 어떨까요?', run: function () {
      return fx(q2('.lec4-fs').slice(1, 6), 'is-in', true, 250).then(function () { return wait(1000); });
    } },
    // 13. 끌어당기는 힘 — 문구만
    { text: '도미넌트가 워낙 끌어당기는 힘이 커서\n아래의 5가지 도미넌트 코드들을 쓸 수 있어요!', run: textOnly },
    // 14. 비유 — 문구만
    { text: '가족끼리만 오순도순 살던 집에\n각자의 ' + em('베스트 프랜드') + '들이 놀러 온 셈이죠!', run: textOnly },
    // 15. 프라이머리 — 원래 있던 G7 + 이름표("(1차적) 도미넌트"도 같은 크기)
    { text: '원래 있던 도미넌트는 ' + em('프라이머리'), run: function () {
      layer4('lec4-n');
      return wait(FADE_MS).then(function () { return fx(q2('#lec4-n1 .lec4-ch'), 'is-in', true); }).then(function () { return wait(400); })
        .then(function () { return fx(q2('#lec4-n1 .lec4-term'), 'is-in', true); }).then(function () { return wait(1200); });
    } },
    // 16. 세컨더리 — 새로 놀러 온 5개 + 이름표
    { text: '새롭게 놀러온 도미넌트들은 ' + em('세컨더리'), run: function () {
      return fx(q2('#lec4-n2 .lec4-ch'), 'is-in', true, 120).then(function () { return wait(400); })
        .then(function () { return fx(q2('#lec4-n2 .lec4-term'), 'is-in', true); }).then(function () { return wait(1500); });
    } },
    // 17. 무난한 다이어토닉 진행 — C G Am F가 나타나 재생
    { text: '아래 코드진행은 무난한\n다이어토닉 코드 진행이에요', run: function () {
      const nn = q2('#lec4-pg .lec2-sname'), sl = q2('#lec4-pg .lec2-slot');
      layer4('lec4-p');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 120); }).then(function () { return wait(600); })
        .then(function () { return playSeq(sl, [['C', [0]], ['G', [1]], ['Am', [2]], ['F', [3]]], 1000); });
    } },
    // 18. E7이 놀러 옴 — 둘째 칸 G가 E7로 교체(파랑)된 뒤 C E7 Am F 재생
    { text: '여기에 Am의 친구인 E7 코드가 놀러왔네요!\n새로운 진행을 들어볼까요?', run: function () {
      const nn = q2('#lec4-pg .lec2-sname'), sl = q2('#lec4-pg .lec2-slot');
      return swap(nn[1], function () { nn[1].textContent = 'E7'; nn[1].classList.add('is-focus'); })
        .then(function () { return wait(SETTLE_MS); })
        .then(function () { return playSeq(sl, [['C', [0]], ['E7', [1]], ['Am', [2]], ['F', [3]]], 1000); });
    } },
    // 19. 세련됨 — 문구만
    { text: '어떤가요? 코드진행이 더 세련되어졌네요!', run: textOnly },
    // 20. 왼쪽부터 읽으면 — E7 → Am 화살표가 나타나고 소리 E7 → Am
    { text: '코드진행은 왼쪽부터 읽게 되다 보니\n마치 Am 코드로 향하는 느낌이 들어요', run: function () {
      const sl = q2('#lec4-pg .lec2-slot'), ar = q2('#lec4-pg .lec4-arr');
      return fx(ar, 'is-in', true).then(function () { return wait(500); })
        .then(function () { return playSeq(sl, [['E7', [1]], ['Am', [2]]], 1200); });
    } },
    // 21. 타겟코드 — Am 아래에 "타겟"(파랑)
    { text: '그래서 Am 같은 코드를\n' + em('타겟코드') + '라고 불러요', run: function () {
      return fx(q2('#lec4-pg .lec2-slab').slice(2, 3), ['is-in', 'is-focus'], true).then(function () { return wait(1600); });
    } },
    // 22. E7의 구성음 — E G# B D, G#만 파랑. 소리는 연출이 끝난 뒤
    { text: '그런데 E7의 구성음에는 ' + em('G#') + ' 음이 있는데\n' + em('G#') + ' 음은 다이어토닉에 없는 음이에요', run: function () {
      const a = w3('lec4-we'), t0 = audioT0(), S = 2800;
      layer4('lec4-g');
      strum(fretsToMidis(v4('E7')), t0 + S / 1000, 1.8, 0.9);
      wait(FADE_MS).then(function () { return fx([a.name], 'is-in', true); }).then(function () { return fx(a.rows, 'is-in', true, 100); })
        .then(function () { return wait(300); }).then(function () { return fx([a.rows[1]], 'is-focus', true); });
      return wait(S + 2200);
    } },
    // 23. 논-다이어토닉 코드 — 코드 아래에 이름표(파랑)
    { text: '이런 코드를\n' + em('논-다이어토닉 코드') + '라고 해요', run: function () {
      return fx(q2('#lec4-we .lec4-nd'), 'is-in', true).then(function () { return wait(1600); });
    } },
    // 24. 다채로워짐 — 문구만
    { text: '논-다이어토닉 코드를 적절히 섞으면\n코드 진행이 다채로워져요!', run: textOnly },
    // 25. 표기법 미리보기 — 세컨더리 도미넌트 5개(A7 … E7)가 차례로 나타나고, 그 아래에 로마자 표기(V7/II … V7/VI)가 차례로 나타남(강조색 없이, 로마자는 한 가지 크기)
    { text: '세컨더리 도미넌트의 표기법은 아래와 같아요', run: function () {
      layer4('lec4-t');
      return wait(FADE_MS).then(function () { return fx(q2('.lec4-tcd'), 'is-in', true, 200); }).then(function () { return wait(500); })
        .then(function () { return fx(q2('.lec4-trm'), 'is-in', true, 200); }).then(function () { return wait(1500); });
    } },
    // 26. 표기법 — V7 / II가 차례로 나타남(세 부분 모두 같은 크기·같은 색)
    { text: '세컨더리 도미넌트의 표기법은 독특해요\n집중하세요!', run: function () {
      const ex = [q2('.lec4-ev')[0], q2('.lec4-es')[0], q2('.lec4-et')[0]];
      layer4('lec4-x');
      return wait(FADE_MS).then(function () { return fx(ex, 'is-in', true, 300); }).then(function () { return wait(1500); });
    } },
    // 27. 앞은 V7, 뒤는 타겟의 도수 — V7(+ 그 코드 A7)이 파랑이 되며 소리 → II(+ 타겟 Dm7)가 파랑이 되며 소리
    { text: '앞에는 공통적으로 ' + em('V7') + '을 표기한 후\n뒤쪽에는 ' + em('타겟코드') + '의 도수를 써줘요', run: function () {
      const ev = q2('.lec4-ev')[0], et = q2('.lec4-et')[0], ea = q2('.lec4-ea')[0], eb = q2('.lec4-eb')[0], t0 = audioT0(), A = 500, B = 3600;
      strum(fretsToMidis(v4('A7')), t0 + (A + 900) / 1000, 1.8, 0.8);
      strum(fretsToMidis(v4('Dm7')), t0 + (B + 900) / 1000, 2.0, 1.0);
      later(function () { fx([ev], 'is-focus', true); }, LEAD_MS + A);
      later(function () { fx([ea], ['is-in', 'is-focus'], true); }, LEAD_MS + A + 400);
      later(function () { fx([ev, ea], 'is-focus', false); fx([et], 'is-focus', true); }, LEAD_MS + B);
      later(function () { fx([eb], ['is-in', 'is-focus'], true); }, LEAD_MS + B + 400);
      return wait(LEAD_MS + B + 900 + 2500);
    } },
    // 28. 작은별 원곡 — 2줄×4칸 + 가사, 멜로디(피아노) + 코드(기타)
    { text: '이번엔 작은별의 코드를 다르게 써볼게요', run: function () {
      const nn = q2('#lec4-new .lec2-sname'), ly = $('lec-lyrics');
      ly.innerHTML = songLyricsHtml();
      layoutScore($('lec4-new'));
      layer4('lec4-s');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 70); })
        .then(function () { ly.classList.add('is-in'); return wait(FADE_MS); })
        .then(function () { return playSong4(SONG4_ORIG); });
    } },
    // 28-2. 원곡 뒤 한마디 — 문구만(원곡 진행 그대로). 다음 단계에서 세컨더리를 넣음
    { text: '다이어토닉만 잘 써도 나쁘지 않죠?', run: textOnly },
    // 29. 세컨더리를 넣은 리하모니 —바뀐 3칸(C7·A7·E7)만 파랑으로 바뀌고 다시 재생
    { text: '이 진행에 ' + em('세컨더리 도미넌트') + '를 넣어서\n리하모니 해볼게요!', run: function () {
      const nn = q2('#lec4-new .lec2-slot').map(function (s) { return s.querySelector('.lec2-sname'); }), ly = $('lec-lyrics');   // 칸마다 첫 코드(5번 칸은 뒤에 Am7이 덧붙어 이름 수가 칸 수보다 많음)
      ly.querySelectorAll('.lec-syl').forEach(function (el) { el.classList.remove('is-on', 'is-sung'); });
      return Promise.all(SONG4_CHG.map(function (i, k) {
        return swap(nn[i], function () { reflowScore($('lec4-new'), function () { nn[i].textContent = SONG4_NEW[i]; nn[i].classList.add('is-focus'); }); }, k * 200);
      })).then(function () { return wait(SETTLE_MS); }).then(function () { return playSong4(SONG4_NEW); });
    } },
    // 30~31. 소감·의미 — 문구만(바뀐 진행 그대로)
    { text: '어떤가요? 작은별이\n작은별이 아니게 된 것 같네요!', seq: true, run: textOnly },
    { text: '이렇게 세컨더리 도미넌트는 적절히 사용하면\n코드진행의 세계를 엄청 넓힐 수 있어요', seq: true, run: textOnly },
    // 32. 문구 없이 장면만 — 작은별이 사라지고 "Dm7 → A7 / Em7 → B7 / …"이 위에서 아래로 한 줄씩 나타남(나머지는 …로 생략 표시, 문구를 비워 두면 앞 문구가 먼저 사라짐). 다 나온 뒤 다음 단계에서 문구가 뜸
    { text: '', run: function () {
      const t = q2('#lec4-y .lec4-pt'), w = q2('#lec4-y .lec4-pw'), a = q2('#lec4-y .lec4-pa'), d = q2('#lec4-y .lec4-pd');
      layer4('lec4-y');
      return t.reduce(function (p, el, k) {
        return p.then(function () { return fx([el, w[k], a[k]], 'is-in', true, 120); }).then(function () { return wait(450); });
      }, wait(FADE_MS)).then(function () { return fx(d, 'is-in', true); }).then(function () { return wait(900); });
    } },
    // 32-2. 연습 필요 — 문구만(위 목록 그대로), 두 줄을 한 번에
    { text: '하지만 여러 key의 타겟코드의\n5도 음을 빠르게 찾아야 해서', run: textOnly },
    // 32-3. 연습·실전 경험 — 문구만(위 목록 그대로)
    { text: '많은 ' + em('연습') + '과 ' + em('실전 경험') + '이 필요한 것도 사실이에요', run: textOnly },
    // 32-4. 문구 없이 장면만 — 목록이 사라지고 Dm7 Em7 FM7 G7 Am7 5개가 나타난 뒤 각각 아래에 맞는 세컨더리 도미넌트가 놓임. 그 뒤 다음 단계에서 문구가 뜸(문구를 비워 두면 앞 문구가 먼저 사라짐)
    { text: '', run: function () {
      layer4('lec4-z');
      return wait(FADE_MS).then(function () { return fx(q2('.lec4-zt'), 'is-in', true, 150); }).then(function () { return wait(300); })
        .then(function () { return fx(q2('.lec4-zs'), 'is-in', true, 150); }).then(function () { return wait(900); });
    } },
    // 33. 훈련 안내 — 문구만(위 장면 그대로)
    { text: '하지만 반복 훈련으로 자연스럽게 익힐 수 있도록\n문제를 준비해뒀으니 기대해 주세요!', seq: true, run: textOnly },
    // 34. 마무리(공통) — 완료 버튼은 마지막 묶음이라 "완료"
    Object.assign(endingStep(4), { seq: true }),   // 공통 마무리 문구("수고하셨습니다! …") — 한 줄씩 차례로
  ];
  // "다음" 묶음: [1~2 긴장음] / [3~4 G7·CM7] / [5~7 어울림·Cm7] / [8~9 지배·도미넌트] / [10~13 7th 코드·도미넌트 붙이기] / [14~16 비유·프라이머리·세컨더리] / [17~18 진행] / [19~21 세련됨·타겟] / [22~24 G#·논-다이어토닉] / [25~27 정리·표기] / [28~29 작은별 원곡·한마디] / [30~32 리하모니·소감] / [33~37 연습·훈련] / [38]
  const GROUPS_CH4 = [[0, 1], [2, 3], [4, 5, 6], [7, 8], [9, 10, 11, 12], [13, 14, 15], [16, 17], [18, 19, 20], [21, 22, 23], [24, 25, 26], [27, 28], [29, 30, 31], [32, 33, 34, 35, 36], [37]];
  // ── 챕터 5 단계 ── 2-5-1 + 릴레이티드 투-마이너(Rel.IIm)
  // 각 단계의 핵심(CLAUDE.md 0-5) — 최종 목적: "세컨더리 도미넌트 앞에 그 타겟의 2도 마이너(메이저 타겟은 m7, 마이너 타겟은 m7(b5))를 둔다"와 Rel.II → V7/타겟도수 표기. 강조색은 소리가 나는 것·문구에서 지정한 것만.
  //  1 예비·긴장·해결(2장 복습)  2 그 순서로 이어지는 유명한 진행(소리)  3 2-5-1 = 2도·5도·1도(도수)  4 G7 → CM7(5 → 1)만 남김  5 세컨더리에도 가능할까?(문구)
  //  6 세컨더리 → 타겟 5줄이 가운데에 → 오른쪽으로 밀리고 왼쪽에 Rel.IIm 생성  7 친구의 친구(문구)  8 메이저 타겟 → m7(예시 FM7 줄만)  9 마이너 타겟 → m7(b5)(그 세 줄만)  10 바꿔 써도 됨(Gm7 ↔ Gm7(b5), 소리 비교)
  // 11 이름(릴레이티드 투-마이너)  12 약어(Rel. IIm)  13 꺾쇠로 연결(Gm7 C7 FM7)  14 우리 표기 Rel.II →  15 Rel.II → V7/IV 앞에서 뒤로(소리)
  // 16 고려할 점(표로 돌아옴)  17 3도 타겟은 드묾(Em7 줄만)  18 변형 과다(문구)  19 짧은 박자로 쪼개기(C7이 Gm7 C7으로)  20 정해진 공식은 아님(문구)
  // 21 작은별 챕터 4 진행(소리)  22 Rel.IIm을 넣은 진행(바뀐 칸이 쪼개짐 + 소리)  23 소감(문구)  24 Rel.II → V7 → I 5줄 나열  25 체득의 가치(문구)  26·27 활용(문구)  28 마무리(공통)
  const VOICINGS5 = { 'Em7(b5)': [-1, -1, 2, 3, 3, 3], 'F#m7(b5)': [2, -1, 2, 2, 1, -1], Gm7: [3, -1, 3, 3, 3, -1], 'Gm7(b5)': [3, -1, 3, 3, 2, -1] };   // 새 Rel.IIm 보이싱(줄 6→1, 지정값). Bm7(b5)(x 2 3 2 3 x)는 VOICINGS7에 같은 값이 있음. Am7·Em7 등은 VOICINGS7, A7~E7은 VOICINGS4
  function v5(c) { return VOICINGS5[c] || v4(c); }
  const REL5 = [   // 줄마다 [타겟, 세컨더리, Rel.IIm](화면에서는 Rel.IIm · 세컨더리 · 타겟 순서로 왼쪽에서 오른쪽) — 메이저 타겟(FM7·G7)은 m7, 마이너 타겟은 m7(b5)
    ['Dm7', 'A7', 'Em7(b5)'], ['Em7', 'B7', 'F#m7(b5)'], ['FM7', 'C7', 'Gm7'], ['G7', 'D7', 'Am7'], ['Am7', 'E7', 'Bm7(b5)'],
  ];
  const REL5_MAJ = [2, 3];   // 메이저 타겟(FM7·G7) 줄 — 마이너 설명에서 옅게(메이저 설명은 예시 줄 FM7만 진하게)
  const SONG5_NEW = ['C', ['Gm7', 'C7'], 'FM7', 'A7', 'Dm7', 'CM7', ['Bm7(b5)', 'E7'], 'Am7'];   // 챕터 4 진행(SONG4_NEW)에 Rel.IIm을 더함. 칸 하나(2박)에 코드 둘이면 1박씩
  const SONG5_SPLIT = [1, 6];   // 칸이 쪼개지는 번호(C7 · E7 자리)
  function nm5(c) { return c.indexOf('(') >= 0 ? _ccFormatB5(c) : c; }   // (b5)는 항상 위첨자
  // 챕터 5 무대 — 챕터 4와 같은 층 방식(.lec3-l, layer4 재사용): f 예비 → 긴장 → 해결 / t 타겟·세컨더리·Rel.IIm 표 / x 표기 / q 박자 쪼개기 / s 작은별 / y Rel.II → V7 → I 5줄
  function buildStage5() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2', 'is-ch5');
    const F5 = [['Dm7', '예비', 1, 'IIm7'], ['G7', '긴장', 2, 'V7'], ['CM7', '해결', 0, 'IM7']];   // 이름 / 기능 라벨 / 기능 번호(2장의 기능 색) / 도수
    const fg = F5.map(function (f, i) {
      return (i ? '<span class="lec5-fa">→</span>' : '') + '<div class="lec2-slot"><span class="lec2-sname">' + f[0] + '</span><span class="lec2-slab lec2-fn' + f[2] + '">' + f[1] + '</span><span class="lec-num">' + romanHtml7(f[3]) + '</span></div>';
    }).join('');
    const kc = REL5.map(function (c) {
      return '<div class="lec5-kc"><span class="lec5-kr">' + nm5(c[2]) + '</span><span class="lec5-kb">' + c[1] + '</span><span class="lec5-ka">' + c[0] + '</span></div>';   // 한 줄 = 진행 순서(Rel.IIm → 세컨더리 → 타겟), 왼쪽에서 오른쪽
    }).join('');
    const slot = function (c, rel, b, tail) {   // rel이 있으면 쪼갤 수 있는 칸 — Rel.IIm 이름은 쪼개기 전까지 접혀 있음. b = 악보에서의 시작 박(박자 쪼개기 시연 칸은 없음). tail = 뒤쪽에 덧붙는 코드(기반 진행의 Am7, 처음부터 보임)
      return '<div class="lec2-slot' + (rel ? ' lec5-sl' : '') + (tail ? ' lc6-sl is-open' : '') + '"' + (b === undefined ? '' : ' data-b="' + b + '"') + '>' + (rel ? '<span class="lec2-sname lec5-rel">' + nm5(rel) + '</span>' : '') + '<span class="lec2-sname">' + nm5(c) + '</span>' + (tail ? '<span class="lec2-sname lc6-tail">' + tail + '</span>' : '') + '</div>';
    };
    const song = scoreHtml('lec5-new', function (i, b) {
      const e = SONG5_NEW[i];
      return slot(SONG4_NEW[i], Array.isArray(e) ? e[0] : '', b, SONG_TAIL[i]);
    });
    const pl = REL5.map(function (c, r) {
      return [nm5(c[2]), c[1], c[0]].map(function (t) { return '<span class="lec5-pn" data-r="' + r + '">' + t + '</span>'; }).join('');
    }).join('');
    stage.innerHTML =
      '<div class="lec3-l" id="lec5-f"><div class="lec5-fg" id="lec5-fg">' + fg + '</div></div>' +
      '<div class="lec3-l" id="lec5-t"><div class="lec5-tb" id="lec5-tb">' + kc + '</div><span class="lec5-lbl" id="lec5-lbl">릴레이티드 투-마이너</span></div>' +
      '<div class="lec3-l" id="lec5-x"><div class="lec4-ex lec5-ex" id="lec5-ex">' +
        '<span class="lec4-ev" id="lec5-u0">Rel.II</span><span class="lec4-es" id="lec5-u1">→</span><span class="lec4-ev" id="lec5-u2">V7</span><span class="lec4-es" id="lec5-u3">/</span><span class="lec4-et" id="lec5-u4">IV</span>' +
        '<span class="lec4-ea" id="lec5-l0">Gm7</span><span></span><span class="lec4-ea" id="lec5-l2">C7</span><span></span><span class="lec4-eb" id="lec5-l4">FM7</span>' +
      '</div><span class="lec5-br" id="lec5-br"></span></div>' +
      '<div class="lec3-l" id="lec5-q"><div class="lec2-prog lec5-pr is-q">' + slot('C7', 'Gm7') + slot('FM7') + '</div></div>' +
      '<div class="lec3-l lec3-e" id="lec5-s">' + song + '</div>' +
      '<div class="lec3-l" id="lec5-y"><div class="lec5-pl">' + pl + '</div></div>';
  }
  // 줄 단위로 옅게 — idx에 든 줄만 옅어지고 나머지는 진하게(빈 목록이면 전부 진하게)
  function quietRows(idx) { q2('.lec5-kc').forEach(function (c, i) { c.classList.toggle('is-quiet', idx.indexOf(i) >= 0); }); }
  // 이름 여러 개를 순서대로 한 개씩 재생 — 울리는 이름만 파랑, 나머지는 옅게(끝나면 모두 원래대로). 마지막 코드는 길게
  function playNames(nm, chords, slot) {
    const t0 = audioT0();
    chords.forEach(function (c, k) {
      const last = k === chords.length - 1;
      strum(fretsToMidis(v5(c)), t0 + k * slot / 1000, last ? 1.5 : slot / 1000 * 0.9, last ? 0.8 : 0.4);
      later(function () { nm.forEach(function (el, j) { el.classList.toggle('is-focus', j === k); el.classList.toggle('is-quiet', j !== k); }); }, LEAD_MS + k * slot);
    });
    later(function () { nm.forEach(function (el) { el.classList.remove('is-focus', 'is-quiet'); }); }, LEAD_MS + chords.length * slot + 300);
    return wait(LEAD_MS + chords.length * slot + 300 + FADE_MS + 100);
  }
  // 칸 하나가 둘로 쪼개짐 — Rel.IIm 자리가 앞에 열리고 원래 코드는 옛 자리에서 오른쪽으로 밀려 자리를 잡음(챕터 3 add9와 같은 방식). focus: Rel.IIm 이름을 파랑으로(바뀐 곳 표시)
  function openSplit(slot, focus) {
    const main = slot.querySelector('.lec2-sname:not(.lec5-rel)'), rel = slot.querySelector('.lec5-rel'), before = main.getBoundingClientRect().left;
    slot.classList.add('is-open');
    layoutScore(slot.closest('.lec6-sc'));   // 악보에서는 Rel.IIm 자리가 열리면 코드 위치를 다시 잡음(시연 칸은 해당 없음)
    anim(main, [{ transform: 'translateX(' + (before - main.getBoundingClientRect().left) + 'px)' }, { transform: 'translateX(0)' }], { duration: 500, easing: EASE_INOUT });
    void slot.offsetWidth;   // display가 켜진 뒤에 투명도 전환이 걸리도록
    if (focus) rel.classList.add('is-focus');
    return fx([rel], 'is-in', true);
  }
  // 작은별 — 멜로디(피아노) + 코드(기타). 칸 하나(2박)에 코드 둘이면 1박씩. 울리는 칸만 진하게 + 가사. sel: 칸 선택자 / vf: 코드 → 보이싱(5장 v5, 6장 v6)
  function playSong5(chords) { return playSongScore(chords, '#lec5-new .lec2-slot', v5); }
  function playSongScore(chords, sel, vf, noTail) {   // noTail: 칸마다 덧붙는 코드까지 이미 넣어 둔 진행(7장) / vf.midis가 있으면 vf(이름)→프렛 대신 vf.midis()가 코드 순서대로 MIDI를 돌려줌(7장 라이브러리 운지)
    if (!noTail) chords = withTail(chords);   // 기반 진행의 5번 칸 Am7까지 포함
    const midisOf = vf.midis || function (n) { return fretsToMidis(vf(n)); };
    const tok = L.tok, ly = $('lec-lyrics'), sl = q2(sel);
    return withTimeout(GuitarAudio.pianoReady(), READY_TIMEOUT_MS).then(function () {
      if (tok !== L.tok) return NEVER();
      GuitarAudio.setOutputTrim(SONG_GUITAR_TRIM);
      GuitarAudio.setPianoGain(SONG_PIANO_GAIN);
      L.trimmed = true;
      const t0 = audioT0(), BEAT_MS = SONG_BEAT * 1000;
      chords.forEach(function (c, s) {
        const cs = [].concat(c), len = 2 / cs.length;
        cs.forEach(function (n, k) { strum(midisOf(n), t0 + (s * 2 + k * len) * SONG_BEAT, len * SONG_BEAT * 0.95, 0.6, 'weak'); });
        later(function () { hotSlots(sl, s); }, LEAD_MS + s * 2 * BEAT_MS);
      });
      const syl = playMelody(ly, t0), end = LEAD_MS + SONG_BEATS * BEAT_MS;
      later(function () {
        hotSlots(sl, -1);
        syl.forEach(function (el) { el.classList.remove('is-on'); el.classList.add('is-sung'); });
      }, end);
      return wait(end);
    });
  }
  const STEPS_CH5 = [
    // 1. 예비 → 긴장 → 해결 — Dm7 G7 CM7이 차례로 나타난 뒤 아래에 기능 라벨(2장의 기능 색)
    { text: '2장에서 예비, 긴장, 해결에 대해 배웠었죠!', run: function () {
      layer4('lec5-f');
      return wait(FADE_MS).then(function () { return fx(q2('#lec5-fg .lec2-sname'), 'is-in', true, 120); }).then(function () { return wait(300); })
        .then(function () { return fx(q2('#lec5-fg .lec2-slab'), 'is-in', true, 150); }).then(function () { return wait(900); });
    } },
    // 2. 그 순서로 이어지는 유명한 진행 — 코드 사이에 화살표가 나타난 뒤 Dm7 → G7 → CM7 재생
    { text: '이 순서대로 진행되는 아주 유명한 진행이 있어요', run: function () {
      const sl = q2('#lec5-fg .lec2-slot');
      return fx(q2('#lec5-fg .lec5-fa'), 'is-in', true, 200).then(function () { return wait(400); })
        .then(function () { return playSeq(sl, [['Dm7', [0]], ['G7', [1]], ['CM7', [2]]], 1000); });
    } },
    // 3. 2-5-1 — 이름 아래에 도수(IIm7 V7 IM7)가 차례로
    { text: '바로 이 진행이에요!\n2-5-1 진행은 아주 많이 사용되는 진행이에요', run: function () {
      return fx(q2('#lec5-fg .lec-num'), 'is-in', true, 150).then(function () { return wait(1500); });
    } },
    // 4. G7 → CM7 — 예비(Dm7)와 그 화살표는 옅어지고 5도 → 1도 한 쌍만 남음
    { text: 'G7 → CM7처럼 5도가 1도로 가는 진행이 있다면', run: function () {
      return fx([q2('#lec5-fg .lec2-slot')[0], q2('#lec5-fg .lec5-fa')[0]], 'is-quiet', true).then(function () { return wait(1200); });
    } },
    // 5. 질문 — 문구만(앞 장면 그대로)
    { text: '세컨더리 도미넌트 앞에도\n같은 방식으로 붙일 수 있지 않을까요?', run: textOnly },
    // 6. 표 — 세컨더리 → 타겟 5줄(챕터 4에서 본 것)이 한꺼번에 가운데에 나타남 → 전체가 오른쪽으로 밀리며 → 왼쪽에 Rel.IIm 5개가 위에서 아래로 생김
    { text: '맞아요! 5가지 세컨더리 도미넌트에도\n앞에 딸려오는 2도 마이너 코드가 있어요', run: function () {
      const tb = $('lec5-tb'), SHIFT = 52;   // SHIFT = (Rel.IIm 칸 폭 80 + 칸 사이 24) ÷ 2 — 세컨더리·타겟 두 칸만 있을 때 무대 가운데에 오게 하는 이동(style.css .lec5-kc 칸 폭과 짝)
      tb.style.transform = 'translateX(-' + SHIFT + 'px)';
      layer4('lec5-t');
      return wait(FADE_MS).then(function () { return fx(q2('.lec5-ka').concat(q2('.lec5-kb')), 'is-in', true); }).then(function () { return wait(900); })
        .then(function () {   // 세컨더리 → 타겟 5줄 전체가 오른쪽으로 밀려 자리를 잡고(왼쪽에 Rel.IIm 자리가 열림)
          tb.style.transform = '';
          anim(tb, [{ transform: 'translateX(-' + SHIFT + 'px)' }, { transform: 'translateX(0)' }], { duration: 600, easing: EASE_INOUT });
          return wait(700);
        })
        .then(function () { return fx(q2('.lec5-kr'), 'is-in', true, 150); }).then(function () { return wait(1200); });   // 그 왼쪽에 Rel.IIm이 위에서 아래로
    } },
    // 7. 친구의 친구 — 문구만
    { text: '말하자면 친구의 친구가 놀러 온 셈이죠!', run: textOnly },
    // 8. 메이저 타겟 → m7 — 예시 줄(FM7: Gm7 C7 FM7)만 진하게
    { text: '조심해야 할 점은 타겟 코드가\n메이저일 때는 m7', run: function () {
      quietRows([0, 1, 3, 4]);
      return wait(FADE_MS + 1000);
    } },
    // 9. 마이너 타겟 → m7(b5) — 마이너 타겟(Dm7·Em7·Am7) 줄만 진하게
    { text: '마이너일 때는 m7(b5)를 써요', run: function () {
      quietRows(REL5_MAJ);
      return wait(FADE_MS + 1000);
    } },
    // 10. 바꿔 써도 됨 — FM7 줄만 남기고 Gm7 → C7 → FM7, 이어서 Gm7(b5)로 바꿔 한 번 더(울리는 이름만 파랑). 끝나면 표를 원래대로
    { text: '하지만 서로 바꿔 써도 문제는 없어요\n오히려 더 신선하게 들릴 수 있어요', seq: true, run: function () {
      const nm = [q2('.lec5-kr')[2], q2('.lec5-kb')[2], q2('.lec5-ka')[2]];   // FM7 줄(3번째), 시간 순서: Rel.IIm → 세컨더리 → 타겟
      const setRel = function (c) { return swap(nm[0], function () { nm[0].innerHTML = nm5(c); }); };
      quietRows([0, 1, 3, 4]);
      return wait(FADE_MS).then(function () { return playNames(nm, ['Gm7', 'C7', 'FM7'], 900); })
        .then(function () { return setRel('Gm7(b5)'); }).then(function () { return wait(300); })
        .then(function () { return playNames(nm, ['Gm7(b5)', 'C7', 'FM7'], 900); })
        .then(function () { return setRel('Gm7'); })
        .then(function () { quietRows([]); return wait(FADE_MS); });
    } },
    // 11. 이름 — 표 아래에 "릴레이티드 투-마이너"(강조색 없이)
    { text: '이렇게 세컨더리 도미넌트에 딸려오는\n' + em('2도 마이너') + ' 코드를\n릴레이티드 투-마이너라고 불러요', run: function () {
      return fx([$('lec5-lbl')], 'is-in', true).then(function () { return wait(1500); });
    } },
    // 12. 약어 — 같은 자리에서 Rel. IIm으로 교체
    { text: '보통은 ' + em('Rel. IIm') + '으로 줄여서 말해요', run: function () {
      const lb = $('lec5-lbl');
      return swap(lb, function () { lb.textContent = 'Rel. IIm'; }).then(function () { return wait(1500); });
    } },
    // 13. 꺾쇠 — 예시 Gm7 · C7 · FM7이 나타나고, Gm7 가운데 아래에서 C7 가운데 아래까지 꺾쇠(글자 폭을 재서 놓음)
    { text: '표기법은 정해진 게 없지만\n보통 꺾쇠를 그려서 연결해요', run: function () {
      layer4('lec5-x');
      return wait(FADE_MS).then(function () { return fx(['lec5-l0', 'lec5-l2', 'lec5-l4'].map($), 'is-in', true, 250); }).then(function () {
        const lay = $('lec5-x').getBoundingClientRect(), r = document.createRange(), br = $('lec5-br');
        const box = function (id) { r.selectNodeContents($(id)); return r.getBoundingClientRect(); };
        const a = box('lec5-l0'), b = box('lec5-l2');
        const ca = (a.left + a.right) / 2, cb = (b.left + b.right) / 2;   // 꺾쇠는 Gm7 가운데에서 시작해 C7 가운데에서 끝남
        br.style.left = (ca - lay.left) + 'px';
        br.style.width = (cb - ca) + 'px';
        br.style.top = (a.bottom - lay.top + 4) + 'px';
        return fx([br], 'is-in', true);
      }).then(function () { return wait(1500); });
    } },
    // 14. 우리 표기 — 꺾쇠가 사라지고 위 줄 Rel.II → V7 / IV가 차례로(같은 크기·같은 색)
    { text: '우리는 편의상 ' + em('Rel.II →') + '로 표현할게요', run: function () {
      fx([$('lec5-br')], 'is-in', false);
      return fx(['lec5-u0', 'lec5-u1', 'lec5-u2', 'lec5-u3', 'lec5-u4'].map($), 'is-in', true, 200).then(function () { return wait(1500); });
    } },
    // 15. Rel.II → V7/IV — Rel.II(+ Gm7)가 파랑이 되며 소리 → V7(+ C7) → IV(+ FM7)
    { text: 'Rel.II는 ' + em('V7/IV') + '로 가기 전에\n그 타겟의 2도 마이너를 먼저 두는 거예요', run: function () {
      const u = ['lec5-u0', 'lec5-u1', 'lec5-u2', 'lec5-u3', 'lec5-u4'].map($), l = ['lec5-l0', 'lec5-l2', 'lec5-l4'].map($), t0 = audioT0(), A = 500, B = 2900, C = 5300;
      strum(fretsToMidis(v5('Gm7')), t0 + (A + 900) / 1000, 1.5, 0.7);
      strum(fretsToMidis(v5('C7')), t0 + (B + 900) / 1000, 1.5, 0.7);
      strum(fretsToMidis(v5('FM7')), t0 + (C + 900) / 1000, 2.0, 1.0);
      later(function () { fx([u[0], u[1], l[0]], 'is-focus', true); }, LEAD_MS + A);
      later(function () { fx([u[0], u[1], l[0]], 'is-focus', false); fx([u[2], l[1]], 'is-focus', true); }, LEAD_MS + B);
      later(function () { fx([u[2], l[1]], 'is-focus', false); fx([u[4], l[2]], 'is-focus', true); }, LEAD_MS + C);
      return wait(LEAD_MS + C + 900 + 2500);
    } },
    // 16. 고려할 점 — 표로 돌아옴(Rel. IIm 이름표 그대로)
    { text: '쓸 때 고려할 점도 몇 가지 있어요', run: function () {
      layer4('lec5-t');
      return wait(FADE_MS + 800);
    } },
    // 17. 3도 타겟 — Em7 줄만 진하게
    { text: '3도를 타겟으로 하는 진행은\n특유의 애매함 때문에 많이 쓰이지 않아요', run: function () {
      quietRows([0, 2, 3, 4]);
      return wait(FADE_MS + 1200);
    } },
    // 18. 변형 과다 — 표를 다시 전부 진하게, 문구만
    { text: '또 Rel.IIm도 ' + em('논-다이어토닉') + '이 많은데\n세컨더리 도미넌트까지 쓰게 되니\n곡이 너무 ' + em('변형') + '될 수 있어요', run: function () {
      quietRows([]);
      return wait(FADE_MS + 600);
    } },
    // 19. 박자 쪼개기 — C7 | FM7 두 칸에서 C7 칸이 쪼개지며 앞에 Gm7이 열림(강조색 없이)
    { text: '그래서 짧은 박자로 쪼개서\n쓰는 경우가 많아요', run: function () {
      const sl = q2('#lec5-q .lec2-slot');
      layer4('lec5-q');
      return wait(FADE_MS).then(function () { return fx(q2('#lec5-q .lec2-sname:not(.lec5-rel)'), 'is-in', true, 150); }).then(function () { return wait(700); })
        .then(function () { return openSplit(sl[0], false); }).then(function () { return wait(SETTLE_MS + 900); });
    } },
    // 20. 공식 아님 — 문구만
    { text: '하지만 이것도 정해진 공식은 아니라서\n곡에 어울린다면 자유롭게 써도 돼요', run: textOnly },
    // 21. 작은별 — 챕터 4에서 만든 진행(C C7 FM7 A7 | Dm7 CM7 E7 Am7) + 가사, 멜로디(피아노) + 코드(기타)
    { text: '이번에도 작은별에 적용해볼게요!\n챕터4에서 만든 진행이에요', run: function () {
      const nn = q2('#lec5-new .lec2-sname:not(.lec5-rel)'), ly = $('lec-lyrics');
      ly.innerHTML = songLyricsHtml();
      layoutScore($('lec5-new'));
      layer4('lec5-s');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 70); })
        .then(function () { ly.classList.add('is-in'); return wait(FADE_MS); })
        .then(function () { return playSong5(['C', 'C7', 'FM7', 'A7', 'Dm7', 'CM7', 'E7', 'Am7']); });
    } },
    // 22. Rel.IIm을 넣은 진행 — C7·E7 칸이 쪼개지며 Gm7·Bm7(b5)가 파랑으로 열린 뒤 다시 재생
    { text: '여기에 ' + em('Rel.IIm') + '을 넣어서\n업그레이드 해볼게요!', run: function () {
      const ly = $('lec-lyrics'), sl = q2('#lec5-new .lec5-sl');
      ly.querySelectorAll('.lec-syl').forEach(function (el) { el.classList.remove('is-on', 'is-sung'); });
      return Promise.all(sl.map(function (s, k) { return wait(k * 250).then(function () { return openSplit(s, true); }); }))
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playSong5(SONG5_NEW); });
    } },
    // 23. 소감 — 문구만(바뀐 진행 그대로), 한 줄씩
    { text: '박자를 쪼개서 넣었어요\n한 층 더 재미있는 코드진행이 되었죠?', seq: true, run: textOnly },
    // 24. 문구 없이 장면만 — 작은별이 사라지고 Rel.II · V7 · I 5줄(화살표 없이)이 위에서 아래로 한 줄씩 빠르게 연달아(문구를 비워 두면 앞 문구가 먼저 사라짐)
    { text: '', run: function () {
      layer4('lec5-y');
      return REL5.reduce(function (p, c, r) {
        return p.then(function () { return fx(q2('#lec5-y [data-r="' + r + '"]'), 'is-in', true); }).then(function () { return wait(150); });
      }, wait(FADE_MS)).then(function () { return wait(900); });
    } },
    // 25. 체득의 가치 — 문구만(위 목록 그대로), 한 줄씩
    { text: 'Rel.II까지 익힌다면 대부분의 음악을\n높은 수준으로 연주하고 분석할 수 있게 돼요!', seq: true, run: textOnly },
    // 26~27. 활용 — 문구만, 두 단계로 나눠 띄움
    { text: '그리고 이때부터 즉흥 솔로 연주할 때\n큰 성장을 이루기도 하고', run: textOnly },
    { text: '곡 분석과 작·편곡을 할 때도\n아주 큰 도움이 될 거예요!', run: textOnly },
    // 28. 마무리(공통) — 완료 버튼은 마지막 묶음이라 "완료"
    Object.assign(endingStep(5), { seq: true }),
  ];
  // "다음" 묶음: [1~3 2-5-1] / [4~5 질문] / [6~7 Rel.IIm 표] / [8~10 m7·m7(b5)·바꿔 쓰기] / [11~12 이름] / [13~15 표기] / [16~18 고려사항] / [19~20 쪼개기] / [21 작은별] / [22~23 리하모니·소감] / [24~27 체득·활용] / [28]
  const GROUPS_CH5 = [[0, 1, 2], [3, 4], [5, 6], [7, 8, 9], [10, 11], [12, 13, 14], [15, 16, 17], [18, 19], [20], [21, 22], [23, 24, 25, 26], [27]];
  STEPS_CH5[20].ms = 14500;   // 동요(80 BPM 약 12초) + 마지막 음 꼬리
  // ── 챕터 6 단계 ── 도미넌트의 대리코드: 1전위 → Bdim·Bdim7·Bm7(b5) → 대체 코드 표 → 트라이톤 대리 도미넌트(Db7) → 작은별 → 총정리 표
  // 각 단계의 핵심(CLAUDE.md 0-5) — 최종 목적: 도미넌트(프라이머리 G7 + 세컨더리 5개)를 1전위·dim7·m7(b5)·트라이톤 대리 도미넌트(서브파이브)로 바꿔 쓰는 것. 강조는 문구에서 괄호로 지정한 말만(번호는 사용자 흐름의 번호, 15번은 14번에 합침)
  //  1 도미넌트에도 대리코드가 있다(2-5-1 소리)   2 1전위 = 구성음이 같음(/B만 파랑)   3 근음 D→B→C가 부드럽게 이어짐(B 주목)   4 세컨더리에도 전위코드(등장만, 소리 없음)   5 E7/G#(소리)
  //  6 긴장 기능을 하던 Bdim   7 근음이 같은 B — 우연일까?   8 구성음이 겹침(B·D·F)   9 G7 대신 Bdim(소리)   10 7음 선택: Bdim7(Ab) / Bm7(b5)(A)   11 고르는 요령 안내
  // 12 모든 도미넌트는 dim7(G#dim7)   13 메이저로 해결되면 m7(b5)(C7 → Em7(b5), 소리 비교)   14·15 대체 코드 표(1전위 → dim7 → m7(b5) 열이 차례로)   16 화제 전환
  // 17 G7의 긴장음 B·F = 트라이톤   18 순서를 바꾸면...(약 7초 정지)   19 Db7 완성   20 어렵지만 요령이 있음   21 2-5-1에서 G7 → Db7(소리)   22 근음이 반음씩 하행 / 타겟에서 보면 반음 위
  // 23 명칭(트라이톤 대리 도미넌트) → 약칭(대리 도미넌트·서브파이브)   24 표기 Sub.V7/II   25 표에 서브 열 추가   26 작은별(5장 결과)   27 대리코드 4곳을 넣은 진행(소리)   28~31 사용된 곳 하나씩
  // 32 총정리 표(타겟 열이 밀려 생성 + 열마다 색)   33·34 의미·조심   35 마무리(공통)
  const VOICINGS6 = {   // 6장 새 보이싱(줄 6→1, 지정값). Bdim·Bm7(b5)·Em7(b5)·Gm7 등은 기존 것을 씀(v5 → v4)
    'G7/B': [-1, 2, 0, 0, 0, 1], 'E7/G#': [4, -1, 2, 4, 3, -1], 'A7/C#': [-1, 4, 2, 2, 2, 3],
    Bdim7: [-1, 2, 3, 1, 3, 1], 'G#dim7': [4, -1, 3, 4, 3, -1], Db7: [-1, 4, 3, 4, 2, -1], Bb7: [-1, 1, 3, 1, 3, -1],
    FM7: [-1, -1, 3, 5, 5, 5],   // 6장(Gm7 C7/Em7(b5) FM7 비교와 작은별)에서만 쓰는 FM7 — 기존 x x 3 2 1 0 대신
  };
  function v6(c) { return VOICINGS6[c] || v5(c); }
  const VOICINGS6_SUB = { Dm7: [-1, 5, 7, 5, 6, 5], Db7: [-1, 4, 6, 4, 6, 4], CM7: [-1, 3, 5, 4, 5, 3] };   // 21번(Dm7 G7 CM7 → Dm7 Db7 CM7)에서만 쓰는 지정 운지 — 위 셋은 5포지션 근처로 이어져 베이스가 D → Db → C로 부드럽게 내려감. G7은 기존 운지
  function v6sub(c) { return VOICINGS6_SUB[c] || v6(c); }
  const BM7B5_CMP6 = [-1, 2, -1, 2, 3, 1];   // Bdim7과 비교하는 단계(10번)에서만 쓰는 Bm7(b5) 지정 운지 x 2 x 2 3 1 — 작은별 등 다른 곳의 Bm7(b5)는 기존 운지
  const DOM6 = ['G7', 'A7', 'B7', 'C7', 'D7', 'E7'];                    // 프라이머리 + 세컨더리 5개(표의 줄)
  const TGT6 = ['CM7', 'Dm7', 'Em7', 'FM7', 'G7', 'Am7'];               // 각 도미넌트가 향하는 타겟 — 표의 맨 윗줄(다이어토닉 순서, Bm7(b5)는 향하는 도미넌트가 없어 뺌). 도미넌트는 이 코드들 아래 같은 열에 놓임
  const MAJ6 = [0, 3, 4];                                                // 타겟이 메이저(CM7·FM7·G7)인 열 — m7(b5) 줄은 이 열에만 채움
  const ALT6 = [                                                         // 도미넌트마다 [1전위, 3도 위 dim7, 3도 위 m7(b5), 트라이톤 대리] — dim 계열 루트는 항상 # 표기, 대리는 b 표기
    ['G7/B', 'Bdim7', 'Bm7(b5)', 'Db7'], ['A7/C#', 'C#dim7', 'C#m7(b5)', 'Eb7'], ['B7/D#', 'D#dim7', 'D#m7(b5)', 'F7'],
    ['C7/E', 'Edim7', 'Em7(b5)', 'Gb7'], ['D7/F#', 'F#dim7', 'F#m7(b5)', 'Ab7'], ['E7/G#', 'G#dim7', 'G#m7(b5)', 'Bb7'],
  ];
  const LEG6 = ['다이어토닉', '도미넌트', '1전위', 'dim7', 'm7(b5)', '서브'];   // 총정리 표의 줄 이름(표 아래 범례, 줄마다 색) — 표의 줄 순서와 같음
  const SONG6_NEW = ['C', 'Em7(b5)', 'FM7', 'A7/C#', ['Dm7', 'Bdim7'], 'CM7', ['Bm7(b5)', 'Bb7'], 'Am7'];   // C - Em7(b5) - FM7 - A7/C# | Dm7 Bdim7 CM7 Am7 Bm7(b5) Bb7 Am7 - (5번 칸의 Am7은 withTail이 덧붙임). 5장 결과(SONG5_NEW)에서 Gm7·C7 → Em7(b5) 한 칸, A7→A7/C#, Dm7 뒤에 Bdim7, E7→Bb7
  function sfx6(root, tail) { return root + '<span class="lec3-sfx">' + tail.replace(/\([^)]*\)/g, function (m) { return '<sup class="cc-sup">' + m + '</sup>'; }) + '</span>'; }   // 꼬리의 괄호 (9)·(#11)·(b13)은 항상 위첨자(7장 텐션)   // 이름에서 바뀐 꼬리만 파랑
  function slots6(id) { return q2('#' + id + ' .lec2-slot'); }
  function names6(id) { return q2('#' + id + ' .lec2-sname'); }
  function slabs6(id) { return q2('#' + id + ' .lec2-slab'); }
  function trow(r) { return q2('#lc6-tb .lc6-tc[data-r="' + r + '"]'); }   // 표의 r번째 줄(0 다이어토닉 / 1 도미넌트 / 2 1전위 / 3 dim7 / 4 m7(b5) / 5 서브)
  // 챕터 6 무대 — 챕터 4·5와 같은 층 방식(.lec3-l, layer4 재사용): a 2-5-1(G7 → G7/B → Bdim) / b C E7 Am7 % / c Gm7 C7 FM7 / d 2-5-1(G7 → Db7) + 이름표 / m G7/B·Bdim 구성음 비교 / w Bdim → Bdim7·Bm7(b5) / g G7의 B·F(트라이톤) / t 대체 코드 표 / x 표기 / s 작은별
  function buildStage6() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2', 'is-ch6');
    const widget = function (id, name, notes) {
      return '<div class="lec3-w" id="' + id + '"><span class="lec-name">' + name + '</span><div class="lec3-rows">' + notes.map(function (n) { return '<span class="lec-note">' + n + '</span>'; }).join('') + '</div></div>';
    };
    const prog = function (layer, id, chords, extra) {   // 진행 한 줄(칸마다 이름 + 아래 라벨 자리)
      return '<div class="lec3-l lec3-c lc6-p" id="' + layer + '"><div class="lec3-pg"><div class="lec2-prog lc6-pr" id="' + id + '" style="--n:' + chords.length + '">' +
        chords.map(function (c) { return '<div class="lec2-slot"><span class="lec2-sname">' + nm5(c) + '</span><span class="lec2-slab">&nbsp;</span></div>'; }).join('') + '</div></div>' + (extra || '') + '</div>';
    };
    // 표 — 한 열 = 다이어토닉 코드 하나(Bm7(b5) 제외 6열), 줄 = 위에서 아래로 다이어토닉 / 도미넌트 / 1전위 / dim7 / m7(b5)(타겟이 메이저인 열만) / 서브. 빈 칸은 자리만 차지
    const tcell = function (r, text) { return '<span class="lc6-tc' + (r === 5 ? ' lc6-off' : '') + '" data-r="' + r + '">' + (text ? nm5(text) : '&nbsp;') + '</span>'; };   // 서브 줄(5)은 25번에 나타남 — 그 전에는 자리도 차지하지 않음(lc6-off = display:none)
    let tb = '';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        tb += tcell(r, r === 0 ? TGT6[c] : r === 1 ? DOM6[c] : r === 2 ? ALT6[c][0] : r === 3 ? ALT6[c][1] : r === 4 ? (MAJ6.indexOf(c) >= 0 ? ALT6[c][2] : '') : ALT6[c][3]);
      }
    }
    const lg = LEG6.map(function (n, r) { return '<span class="lc6-lgi' + (r === 5 ? ' lc6-off' : '') + '" data-r="' + r + '">' + nm5(n) + '</span>'; }).join('');   // 범례도 서브(5)는 25번에 생김 — 그 전 화면(14번)에서 범례가 5개 기준으로 가운데에 보이도록
    const song = scoreHtml('lc6-new', function (i, b) {
      const e = SONG5_NEW[i], at = ' data-b="' + b + '"', main = '<span class="lec2-sname">' + nm5(SONG4_NEW[i]) + '</span>';
      if (Array.isArray(e)) return '<div class="lec2-slot lec5-sl is-open"' + at + '><span class="lec2-sname lec5-rel">' + nm5(e[0]) + '</span>' + main + '</div>';   // 5장 결과: Rel.IIm이 이미 열린 칸
      if (i === 4) return '<div class="lec2-slot lc6-sl"' + at + '>' + main + '<span class="lec2-sname lc6-aft">Bdim7</span></div>';   // 6장에서 뒤에 Bdim7이 덧붙는 칸
      if (SONG_TAIL[i]) return '<div class="lec2-slot lc6-sl is-open"' + at + '>' + main + tailHtml(i) + '</div>';   // 기반 진행의 Am7이 덧붙은 칸(처음부터 보임)
      return '<div class="lec2-slot"' + at + '>' + main + '</div>';
    });
    stage.innerHTML =
      prog('lc6-a', 'lc6-pa', ['Dm7', 'G7', 'CM7']) +
      prog('lc6-b', 'lc6-pb', ['C', 'E7', 'Am7', '%']) +
      prog('lc6-c', 'lc6-pc', ['Gm7', 'C7', 'FM7']) +
      prog('lc6-d', 'lc6-pd', ['Dm7', 'G7', 'CM7'], '<span class="lc6-nt" id="lc6-nt">&nbsp;</span>') +
      '<div class="lec3-l" id="lc6-m"><div class="lec3-demo">' + widget('lc6-wa', 'G7/B', ['B', 'G', 'D', 'F']) + widget('lc6-wb', 'Bdim', ['B', 'D', 'F', '&nbsp;']) + '</div></div>' +
      '<div class="lec3-l" id="lc6-w"><div class="lec3-demo">' + widget('lc6-wc', 'Bdim', ['B', 'D', 'F', '&nbsp;']) + widget('lc6-wd', 'Bdim', ['B', 'D', 'F', '&nbsp;']) + '</div></div>' +
      '<div class="lec3-l" id="lc6-g"><div class="lec3-demo">' + widget('lc6-wg', 'G7', ['G', 'B', 'D', 'F']) + '</div><span class="lc6-br" id="lc6-br"></span><span class="lc6-tt" id="lc6-tt">트라이톤</span></div>' +
      '<div class="lec3-l" id="lc6-t"><div class="lc6-tw" id="lc6-tw"><div class="lc6-tb is-color" id="lc6-tb">' + tb + '</div></div><div class="lc6-lg" id="lc6-lg">' + lg + '</div></div>' +
      '<div class="lec3-l" id="lc6-x"><div class="lec4-ex lc6-ex"><span class="lec4-ev">Sub.V7</span><span class="lec4-es">/</span><span class="lec4-et">II</span>' +
        '<span class="lec4-ea">Eb7</span><span></span><span class="lec4-eb">Dm7</span></div></div>' +
      '<div class="lec3-l lec3-e" id="lc6-s">' + song + '</div>';
  }
  // 표는 6열 × 6줄 자리를 처음부터 잡아 두고(자리 고정) 줄 단위로 나타남. 열 폭은 가장 넓은 칸에 맞춰 모두 같게(글자는 칸 가운데 정렬 → 표 전체가 가운데), 표 폭이 무대 폭보다 넓으면 통째로 줄여서 맞춤(스타일 가이드 §17 "사진 확대"와 같은 방식 — 한 벌로 디자인하고 scale만)
  // 줄과 그 줄의 범례(표 아래 줄 이름)는 함께 나타남 — 줄마다 색이 처음부터 입혀져 있어 무슨 줄인지 바로 구분됨
  function showRow(r) { return Promise.all([fx(trow(r), 'is-in', true, 100), fx(q2('#lc6-lg [data-r="' + r + '"]'), 'is-in', true)]); }
  // 새 요소가 생겨 다른 요소의 자리가 달라질 때 — apply()로 바꾼 뒤 movers가 옛 자리에서 미끄러져 새 자리로(FLIP). 나중에 나올 것의 자리를 미리 비워 두지 않고, 나올 때 균형을 다시 잡는 방법
  function slideIn(movers, apply) {
    const before = movers.map(function (el) { return el.getBoundingClientRect(); });
    apply();
    movers.forEach(function (el, i) {
      const r = el.getBoundingClientRect(), dx = before[i].left - r.left, dy = before[i].top - r.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) anim(el, [{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'translate(0, 0)' }], { duration: 500, easing: EASE_INOUT });
    });
  }
  function fitTable() {
    const tw = $('lc6-tw'), tb = $('lc6-tb'), avail = $('lc6-t').clientWidth;
    tb.style.gridTemplateColumns = '';
    tb.style.gridTemplateColumns = 'repeat(6, ' + Math.max.apply(null, q2('#lc6-tb .lc6-tc').map(function (el) { return el.offsetWidth; })) + 'px)';   // offsetWidth는 scale의 영향을 안 받음
    const k = Math.min(1, avail / tb.offsetWidth);
    tw.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    tw.style.marginBottom = k < 1 ? -Math.round(tw.offsetHeight * (1 - k)) + 'px' : '';   // 줄어든 만큼 아래 빈 자리를 접음
  }
  // 트라이톤 괄호 — G7의 B(둘째 음)와 F(넷째 음)를 잇는 세로 괄호와 이름표. 위치는 실제 글자 위치를 재서 놓음(자리는 B·F가 맞바뀐 뒤에도 같음)
  function placeTritone() {
    const lay = $('lc6-g').getBoundingClientRect(), rows = q2('#lc6-wg .lec-note'), wr = $('lc6-wg').getBoundingClientRect(),
      a = rows[1].getBoundingClientRect(), b = rows[3].getBoundingClientRect(), br = $('lc6-br'), tt = $('lc6-tt');
    const top = a.top + a.height / 2 - lay.top, h = b.top + b.height / 2 - (a.top + a.height / 2), x = wr.right - lay.left + 16;
    br.style.left = x + 'px';
    br.style.top = top + 'px';
    br.style.height = h + 'px';
    tt.style.left = (x + 24) + 'px';
    tt.style.top = (top + h / 2) + 'px';
  }
  // 악보에서 코드 이름 교체 — 글자 폭이 바뀌면 다른 코드가 미끄러져 새 자리로, 바뀐 이름은 파랑
  function swapScore(el, text, delay) {
    const sc = el.closest('.lec6-sc');
    return swap(el, function () { reflowScore(sc, function () { el.innerHTML = nm5(text); el.classList.add('is-focus'); }); }, delay);
  }
  // 평소(swap 150/200ms)보다 느린 글자 교체 — 중요한 코드가 완성되는 순간용(500/700ms)
  function slowSwap(el, apply) {
    return new Promise(function (res) {
      const a1 = anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: EASE_IN, fill: 'both' });
      a1.onfinish = function () {
        a1.cancel();
        apply();
        const a2 = anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: EASE_OUT });
        a2.onfinish = res;
      };
    });
  }
  function playSong6(chords) { return playSongScore(chords, '#lc6-new .lec2-slot', v6); }
  // 작은별에서 한 칸만 진하게(나머지는 옅게) — 사용된 곳을 하나씩 짚을 때
  function pickSlot(i) { hotSlots(q2('#lc6-new .lec2-slot'), i); return wait(900); }
  const STEPS_CH6 = [
    // 1. 도미넌트에도 대리코드 — Dm7 G7 CM7이 나타나 재생
    { text: 'G7 같은 도미넌트에도\n바꿔 쓸 수 있는 코드가 있어요', run: function () {
      layer4('lc6-a');
      return wait(FADE_MS).then(function () { return fx(names6('lc6-pa'), 'is-in', true, 120); }).then(function () { return wait(600); })
        .then(function () { return playSlots(slots6('lc6-pa'), ['Dm7', 'G7', 'CM7'], 1000, null, v6); });
    } },
    // 2. 1전위 — G7이 G7/B로(바뀐 /B만 파랑)
    { text: '우선 1전위 코드를 사용할 수 있겠죠?\n구성음이 같으니까요!', run: function () {
      const nn = names6('lc6-pa');
      return swap(nn[1], function () { nn[1].innerHTML = sfx6('G7', '/B'); });
    } },
    // 3. 근음 연결 — 칸 아래에 맨 아래 음 D · B · C(B만 파랑)가 나타나고 Dm7 G7/B CM7 재생
    { text: '전위코드의 목적대로\n근음이 부드럽게 연결돼요!\n근음인 ' + em('B') + '를 주목해주세요', run: function () {
      const lb = slabs6('lc6-pa'), bass = ['D', 'B', 'C'];
      lb.forEach(function (el, i) { el.textContent = bass[i]; });
      lb[1].classList.add('is-focus');
      return fx(lb, 'is-in', true, 150).then(function () { return wait(500); })
        .then(function () { return playSlots(slots6('lc6-pa'), ['Dm7', 'G7/B', 'CM7'], 1000, null, v6); });
    } },
    // 4. 세컨더리에도 전위코드 — C E7 Am7 %가 나타나기만 함(소리 없음)
    { text: '세컨더리 도미넌트에도\n전위코드를 적용해볼게요', run: function () {
      layer4('lc6-b');
      return wait(FADE_MS).then(function () { return fx(names6('lc6-pb'), 'is-in', true, 120); }).then(function () { return wait(800); });
    } },
    // 5. E7 → E7/G# 교체(바뀐 꼬리만 파랑) 후 재생
    { text: 'E7을 ' + em('E7/G#') + '으로 바꿔 볼게요', run: function () {
      const nn = names6('lc6-pb');
      return swap(nn[1], function () { nn[1].innerHTML = sfx6('E7', '/G#'); }).then(function () { return wait(SETTLE_MS); })
        .then(function () { return playSlots(slots6('lc6-pb'), ['C', 'E7/G#', 'Am7'], 1000, null, v6); });
    } },
    // 6. Bdim — 가운데에 Bdim(B D F)
    { text: '그런데 다이어토닉에서 긴장 기능을 하던\n' + em('Bdim') + '를 기억하나요?', run: function () {
      const b = w3('lc6-wb');
      layer4('lc6-m');
      return wait(FADE_MS).then(function () { return fx([b.name], 'is-in', true); }).then(function () { return fx(b.rows, 'is-in', true, 100); }).then(function () { return wait(900); });
    } },
    // 7. 근음이 같은 B — Bdim이 오른쪽으로 비키고 왼쪽에 G7/B(B G D F). 두 코드의 맨 아래 음 B만 파랑
    { text: 'Bdim코드도 근음이 ' + em('B') + '인데\n혹시 우연일까요?', run: function () {
      const a = w3('lc6-wa'), b = w3('lc6-wb');
      a.el.style.transform = 'translateX(' + (-GAP4) + 'px)';
      b.el.style.transform = 'translateX(' + GAP4 + 'px)';
      return wait(700).then(function () { return fx([a.name], 'is-in', true); }).then(function () { return fx(a.rows, 'is-in', true, 100); })
        .then(function () { return wait(300); }).then(function () { return fx([a.rows[0], b.rows[0]], 'is-focus', true, 250); }).then(function () { return wait(900); });
    } },
    // 8. 구성음이 겹침 — 겹치는 B·D·F를 두 코드 모두 파랑(2장 Em/G 비교와 같은 방식)
    { text: '우연이 아니에요!\n' + em('G7') + '과 ' + em('Bdim') + '는 구성음이 많이 겹쳐요!', run: function () {
      const a = w3('lc6-wa'), b = w3('lc6-wb');
      return fx([a.rows[2], a.rows[3], b.rows[1], b.rows[2]], 'is-focus', true, 250).then(function () { return wait(1500); });
    } },
    // 9. G7/B → Bdim 교체 후 재생
    { text: '그래서 G7 대신 Bdim도 쓸 수 있어요', run: function () {
      const nn = names6('lc6-pa');
      layer4('lc6-a');
      return wait(FADE_MS).then(function () { return swap(nn[1], function () { nn[1].innerHTML = 'Bdim'; nn[1].classList.add('is-focus'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playSlots(slots6('lc6-pa'), ['Dm7', 'Bdim', 'CM7'], 1000, null, v6); });
    } },
    // 10. 7음 선택 — 가운데의 Bdim(B D F)이 좌우로 갈라져 왼쪽은 Ab(Bdim7), 오른쪽은 A(Bm7(b5)) 추가(새 음·이름 꼬리만 파랑). 소리 Bdim → Bdim7 → Bm7(b5)
    { text: '7음을 무엇으로 넣느냐에 따라\n' + em('Bdim7') + '과 ' + em(nm5('Bm7(b5)')) + '를 고를 수 있어요', run: function () {
      const a = w3('lc6-wc'), b = w3('lc6-wd'), t0 = audioT0(), SPLIT = 1900, M = SPLIT + 1100, M2 = M + 2300;
      layer4('lc6-w');
      strum(fretsToMidis(v6('Bdim')), t0 + 0.8, 1.1, 0.5);
      strum(fretsToMidis(v6('Bdim7')), t0 + (M + SETTLE_MS) / 1000, 1.2, 0.5);
      strum(fretsToMidis(BM7B5_CMP6), t0 + (M2 + SETTLE_MS) / 1000, 1.7, 0.8);
      wait(FADE_MS).then(function () { return fx([a.name], 'is-in', true); }).then(function () { return fx(a.rows.slice(0, 3), 'is-in', true, 40); });
      later(function () {   // 갈라짐 — 겹쳐 있던 복사본이 보이는 순간 둘이 반대로 미끄러짐
        showNow([b.name, b.rows[0], b.rows[1], b.rows[2]]);
        a.el.style.transform = 'translateX(' + (-SPLIT_DX) + 'px)';
        b.el.style.transform = 'translateX(' + SPLIT_DX + 'px)';
      }, LEAD_MS + SPLIT);
      later(function () { a.rows[3].textContent = 'Ab'; fx([a.rows[3]], ['is-in', 'is-focus'], true); setName(a, 'Bdim', '7'); }, LEAD_MS + M);
      later(function () { b.rows[3].textContent = 'A'; fx([b.rows[3]], ['is-in', 'is-focus'], true); setName(b, 'B', nm5('m7(b5)')); }, LEAD_MS + M2);
      return wait(LEAD_MS + M2 + SETTLE_MS + 1700);
    } },
    // 11. 고르는 요령 안내 — 문구만
    { text: em('dim7') + '과 ' + em(nm5('m7(b5)')) + '를 고르는 요령을\n알려드릴게요', run: textOnly },
    // 12. 모든 도미넌트는 dim7 — E7/G#이 G#dim7로(전체 파랑) 교체되고 C G#dim7 Am7 재생
    { text: '모든 도미넌트는 ' + em('dim7') + '로 바꿔 쓸 수 있어요!', run: function () {
      const nn = names6('lc6-pb');
      layer4('lc6-b');
      return wait(FADE_MS).then(function () { return swap(nn[1], function () { nn[1].innerHTML = 'G#dim7'; nn[1].classList.add('is-focus'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playSlots(slots6('lc6-pb'), ['C', 'G#dim7', 'Am7'], 1000, null, v6); });
    } },
    // 13. 메이저로 해결되면 m7(b5) — Gm7 C7 FM7은 소리 없이 화면에만 띄우고 → C7이 Em7(b5)로 교체 → 재생(Gm7 Em7(b5) FM7)
    { text: '하지만 ' + em('메이저로 해결') + '될 때는\n' + em(nm5('m7(b5)')) + '를 쓰면 현대적으로 들리기도 해요', run: function () {
      const nn = names6('lc6-pc');
      layer4('lc6-c');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 120); }).then(function () { return wait(1200); })   // Gm7 C7 FM7은 소리 없이 화면에만
        .then(function () { return swap(nn[1], function () { nn[1].innerHTML = nm5('Em7(b5)'); nn[1].classList.add('is-focus'); }); })
        .then(function () { return wait(SETTLE_MS); })
        .then(function () { return playSlots(slots6('lc6-pc'), ['Gm7', 'Em7(b5)', 'FM7'], 1000, null, v6); });
    } },
    // 14(+15). 대체 코드 표 — 한 열 = 다이어토닉 코드 하나(그 코드를 향하는 도미넌트가 아래에). 도미넌트 → 1전위 → dim7 → m7(b5)(타겟이 메이저인 열만) 줄이 위에서 아래로 차례로(다이어토닉 줄부터 시작, 서브 줄은 25번에 추가). 줄마다 색이 처음부터 입혀져 있고 줄 이름(범례)이 줄과 함께 나타남
    { text: '도미넌트 아래에 쓸 수 있는 대체 코드를\n정리해 볼게요', run: function () {
      layer4('lc6-t');
      fitTable();
      return wait(FADE_MS).then(function () { return showRow(0); }).then(function () { return wait(600); })
        .then(function () { return showRow(1); }).then(function () { return wait(500); })
        .then(function () { return showRow(2); }).then(function () { return wait(900); })
        .then(function () { return showRow(3); }).then(function () { return wait(500); })
        .then(function () { return showRow(4); }).then(function () { return wait(1200); });
    } },
    // 16. 화제 전환 — 표가 사라지고 문구만(페이즈 2: 트라이톤 대리 도미넌트)
    { text: '그런데 완전히 새로운 대리코드도 있어요',
      enter: function () { layer4(null); },   // 문구가 뜰 때 곧바로 앞 장면(표)을 지움
      run: function () { return wait(FADE_MS + 1200); } },
    // 17. G7의 핵심 — G B D F 중 B·F만 코랄, 두 음을 잇는 세로 괄호와 "트라이톤" 이름표(강조색 없음). 소리는 연출이 끝난 뒤 B·F 두 음만(G7 코드 전체가 아님)
    { text: 'G7코드의 핵심은 ' + em('긴장') + '을 담당하는 B와 F예요\n두 음의 관계를 ' + em('트라이톤') + '이라고 해요', run: function () {
      const g = w3('lc6-wg'), t0 = audioT0(), S = 3600;
      layer4('lc6-g');
      placeTritone();
      strum([59, 65], t0 + S / 1000, 1.8, 0.9);   // B3 · F4 — G7 보이싱(3 2 0 0 0 1)의 B·F 두 음만
      wait(FADE_MS).then(function () { return fx([g.name], 'is-in', true); }).then(function () { return fx(g.rows, 'is-in', true, 100); })
        .then(function () { return wait(300); }).then(function () { return fx([g.rows[1], g.rows[3]], 'is-tense', true, 250); })
        .then(function () { return wait(300); }).then(function () { return fx([$('lc6-br'), $('lc6-tt')], 'is-in', true); });
      return wait(S + 2200);
    } },
    // 18. 순서를 바꾸면 — 문구 뒤 바로 G·D가 사라지고 B·F가 자리를 맞바꿈 → 비어 있던 자리에 Db·Ab가 평소보다 느리게 나타나 Db7이 먼저 완성됨(B는 Cb가 아니라 B 그대로 표기) → 이름도 느리게 G7에서 Db7로 → 소리. 완성됐다는 문구는 다음(19번)에
    { text: '그런데 이 두 음의 순서를 바꾸면...!', run: function () {
      const g = w3('lc6-wg'), rows = g.rows, SLOW = 1000;
      return fx([rows[0], rows[2]], 'is-in', false).then(function () {
        const par = rows[0].parentNode, tops = rows.map(function (el) { return el.getBoundingClientRect().top; });
        [rows[0], rows[3], rows[2], rows[1]].forEach(function (el) { par.appendChild(el); });   // 보이는 순서: (G) F (D) B — 자리가 바뀐 만큼 옛 자리에서 풀어 줌
        rows.forEach(function (el, k) { anim(el, [{ transform: 'translateY(' + (tops[k] - el.getBoundingClientRect().top) + 'px)' }, { transform: 'translateY(0)' }], { duration: 700, easing: EASE_INOUT }); });
        return wait(700 + 300);
      }).then(function () {   // DOM 순서 = 보이는 순서: 0 (G→Db) / 1 F / 2 (D→Ab) / 3 B
        const nu = [g.rows[0], g.rows[2]];
        g.rows[0].textContent = 'Db';
        g.rows[2].textContent = 'Ab';
        nu.forEach(function (el) { el.style.transitionDuration = SLOW + 'ms'; });   // 평소(0.4초)보다 느린 등장
        fx(nu, 'is-in', true, 300);
        return wait(SLOW + 300 + 300).then(function () { nu.forEach(function (el) { el.style.transitionDuration = ''; }); });
      }).then(function () { return slowSwap(g.name, function () { g.name.innerHTML = 'Db7'; }); })
        .then(function () { strum(fretsToMidis(v6('Db7')), audioT0(), 1.9, 0.9); return wait(2200); });
    } },
    // 19. Db7 완성 문구 — 문구만(앞 단계에서 Db7이 완성된 장면 그대로)
    { text: '또 다른 도미넌트 코드인 Db7이 완성돼요!', run: textOnly },
    // 20. 어렵다는 말 — 문구만
    { text: '사실 이걸 찾는 건 꽤 어려운 부분이에요\n하지만 쉽게 찾는 요령이 있어요!', run: textOnly },
    // 21. 평범한 2-5-1 → 도미넌트를 바꿔 봄 — Dm7 G7 CM7은 소리 없이 화면에만 → G7이 Db7로(파랑) → Dm7 Db7 CM7 재생
    { text: '평범한 2-5-1 진행에서\n도미넌트를 바꿔본 다음에', run: function () {
      const nn = names6('lc6-pd');
      layer4('lc6-d');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 120); }).then(function () { return wait(1200); })   // Dm7 G7 CM7은 소리 없이 화면에만, 곧바로 G7 → Db7 전환
        .then(function () { return swap(nn[1], function () { nn[1].innerHTML = 'Db7'; nn[1].classList.add('is-focus'); }); })
        .then(function () { return wait(SETTLE_MS); })
        .then(function () { return playSlots(slots6('lc6-pd'), ['Dm7', 'Db7', 'CM7'], 900, null, v6sub); });
    } },
    // 22a. 근음의 흐름 — 칸 아래에 D · Db · C(Db만 파랑), 반음씩 떨어짐
    { text: '근음의 흐름을 보면\n' + em('반음') + '씩 떨어지는 진행이에요!', run: function () {
      const lb = slabs6('lc6-pd'), bass = ['D', 'Db', 'C'];
      lb.forEach(function (el, i) { el.textContent = bass[i]; });
      lb[1].classList.add('is-focus');
      return fx(lb, 'is-in', true, 150).then(function () { return wait(1500); });
    } },
    // 22b. 타겟의 관점 — 라벨이 같은 자리에서 바뀜: Db7 아래 "반음 위"(파랑), CM7 아래 "타겟"
    { text: '타겟코드의 관점으로 본다면\n' + em('반음 위') + '의 도미넌트 코드가 되는 거죠!', run: function () {
      const lb = slabs6('lc6-pd'), to = ['', '반음 위', '타겟'];
      return Promise.all(lb.map(function (el, i) { return swap(el, function () { el.textContent = to[i]; el.classList.toggle('is-focus', i === 1); }, i * 100); })).then(function () { return wait(1500); });
    } },
    // 23a. 명칭 — 라벨이 사라지고 Db7 아래 이름표(강조색 없음)
    { text: '이렇게 트라이톤을 공유하는 또 다른 코드를\n' + em(an('트라이톤', 'Tritone') + ' ' + an('대리', 'Substitute') + ' 도미넌트') + '라고 해요', run: function () {
      const nt = $('lc6-nt');
      nt.textContent = '트라이톤 대리 도미넌트';
      return fx(slabs6('lc6-pd'), 'is-in', false).then(function () { return fx([nt], 'is-in', true); }).then(function () { return wait(1200); });
    } },
    // 23b. 약칭 — 같은 자리에서 교체
    { text: '줄여서 ' + em('대리 도미넌트') + ',\n' + em('서브파이브') + '라고도 해요', run: function () {
      const nt = $('lc6-nt');
      return swap(nt, function () { nt.textContent = '대리 도미넌트 · 서브파이브'; }).then(function () { return wait(1400); });
    } },
    // 24. 표기 — 4장 V7 / II와 같은 격자: 위 줄 Sub.V7 / II(한 크기·한 색), 아래 줄 Eb7 · Dm7
    { text: '표기법은 Sub.V7/II 같은 식으로\n표현해요!', run: function () {
      const top = [q2('#lc6-x .lec4-ev')[0], q2('#lc6-x .lec4-es')[0], q2('#lc6-x .lec4-et')[0]], bottom = [q2('#lc6-x .lec4-ea')[0], q2('#lc6-x .lec4-eb')[0]];
      layer4('lc6-x');
      return wait(FADE_MS).then(function () { return fx(top, 'is-in', true, 300); }).then(function () { return wait(400); })
        .then(function () { return fx(bottom, 'is-in', true, 300); }).then(function () { return wait(1500); });
    } },
    // 25. 총정리 ① — 표가 돌아오고 서브(트라이톤 대리) 줄이 맨 아래에 더해짐
    { text: '대리 도미넌트까지 포함하면\n아래와 같이 아주 많은 선택지가 생겼네요!', run: function () {
      layer4('lc6-t');
      fitTable();
      return wait(FADE_MS).then(function () {
        slideIn(q2('#lc6-lg .lc6-lgi:not(.lc6-off)'), function () {   // 서브 줄과 범례 항목이 생기면서 범례가 6개 기준 가운데로 다시 모임
          q2('#lc6-tb [data-r="5"]').concat(q2('#lc6-lg [data-r="5"]')).forEach(function (el) { el.classList.remove('lc6-off'); });
          fitTable();
        });
        return showRow(5);
      }).then(function () { return wait(1500); });
    } },
    // 26. 작은별 — 5장 결과(Rel.IIm이 열린 진행) + 가사, 멜로디(피아노) + 코드(기타) 재생
    { text: '이번에도 작은별에 적용해볼게요!\n5장에서 만든 진행이에요', run: function () {
      const nn = q2('#lc6-new .lec2-sname:not(.lc6-aft)'), ly = $('lec-lyrics');
      ly.innerHTML = songLyricsHtml();
      layoutScore($('lc6-new'));
      layer4('lc6-s');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 70); })
        .then(function () { ly.classList.add('is-in'); return wait(FADE_MS); })
        .then(function () { return playSong6(SONG5_NEW); });
    } },
    // 27. 대리코드를 넣은 진행(C - Em7(b5) - FM7 - A7/C# | Dm7 Bdim7 CM7 Am7 Bm7(b5) Bb7 Am7 -) — Gm7은 빠지고 C7이 Em7(b5)로 칸 전체를 차지, A7→A7/C#, Dm7 뒤에 Bdim7 덧붙음, E7→Bb7(바뀐 곳만 파랑, 다른 코드는 미끄러져 자리를 잡음) 후 재생
    { text: '여기에 대리코드들을 넣어서\n업그레이드 해볼게요!', run: function () {
      const sc = $('lc6-new'), ly = $('lec-lyrics'), sl = q2('#lc6-new .lec2-slot'), mainOf = function (s) { return s.querySelector('.lec2-sname:not(.lec5-rel)'); };
      ly.querySelectorAll('.lec-syl').forEach(function (el) { el.classList.remove('is-on', 'is-sung'); });
      return Promise.all([
        fx([sl[1].querySelector('.lec5-rel')], 'is-in', false).then(function () {   // Gm7이 사라지고 → 칸이 닫히며 Em7(b5)가 칸 전체를 차지
          const m = mainOf(sl[1]);
          return swap(m, function () { reflowScore(sc, function () { sl[1].classList.remove('is-open'); m.innerHTML = nm5('Em7(b5)'); m.classList.add('is-focus'); }); });
        }),
        swapScore(mainOf(sl[3]), 'A7/C#', 250),
        wait(500).then(function () {
          const aft = sl[4].querySelector('.lc6-aft');
          reflowScore(sc, function () { sl[4].classList.add('is-open'); });
          aft.classList.add('is-focus');
          return fx([aft], 'is-in', true);
        }),
        swapScore(mainOf(sl[6]), 'Bb7', 750),
      ]).then(function () { return wait(SETTLE_MS); }).then(function () { return playSong6(SONG6_NEW); });
    } },
    // 28~31. 사용된 곳을 악보의 진행 순서대로 하나씩 가볍게(Em7(b5) → A7/C# → Bdim7 → Bb7) — 그 칸만 진하게(나머지는 옅게), 소리 없음
    { text: 'C7 자리엔 ' + em(nm5('Em7(b5)')) + '를 썼어요\n메이저로 해결되어서 잘 어울려요!', run: function () { return pickSlot(1); } },
    { text: 'A7은 1전위 ' + em('A7/C#') + '으로 썼어요\n베이스 C#이 D로 이어져요', run: function () { return pickSlot(3); } },
    { text: 'Dm7 뒤에는 C를 타겟으로 하는\n' + em('Bdim7') + '을 사용했어요', run: function () { return pickSlot(4); } },
    { text: 'E7 자리엔 ' + em('Bb7') + ' 서브파이브를 썼어요\n꽤 색다른 사운드죠?', run: function () { return pickSlot(6); } },
    // 32. 총정리 ② — 작은별이 사라지고 지금까지 줄마다 색을 입혀 쌓아 온 표(다이어토닉 · 도미넌트 · 1전위 · dim7 · m7(b5) · 서브)가 한꺼번에 다시 나타남
    { text: '지금까지 배운 코드를\n한눈에 모아 봤어요', run: function () {
      hotSlots(q2('#lc6-new .lec2-slot'), -1);
      layer4('lc6-t');
      fitTable();
      return wait(FADE_MS + 1500);
    } },
    // 33~34. 의미·조심 — 문구만(표 그대로), 한 줄씩
    { text: '도미넌트 하나도 이렇게\n다양한 코드로 바꿔 쓸 수 있어요', seq: true, run: textOnly },
    { text: '실제로 어울리는지는 곡마다 달라서\n너무 남발하지는 않게 조심해야 해요', seq: true, run: textOnly },
    // 35. 마무리(공통) — 완료 버튼은 마지막 묶음이라 "완료"
    Object.assign(endingStep(6), { seq: true }),
  ];
  // "다음" 묶음: [1~3 2-5-1·1전위] / [4~5 세컨더리 1전위] / [6~9 Bdim] / [10 7음 선택] / [11~13 dim7·m7(b5) 요령] / [14 표] / [16~17 트라이톤] / [18~19 Db7] / [20~22 요령·반음] / [23~25 명칭·표기] / [총정리 표] / [26~27 작은별] / [28~31 사용된 곳] / [32~34 총정리·마무리 멘트] / [35]
  const GROUPS_CH6 = [[0, 1, 2], [3, 4], [5, 6, 7, 8], [9], [10, 11, 12], [13], [14, 15], [16, 17], [18, 19, 20, 21], [22, 23, 24], [25], [26, 27], [28, 29, 30, 31], [32, 33, 34], [35]];
  STEPS_CH6[2].ms = 5000;    // 마지막 묶음 단계의 소리 꼬리까지(단계 시작 기준) — 아래는 모두 소리가 있는 단계
  STEPS_CH6[4].ms = 4800;
  STEPS_CH6[8].ms = 5500;
  STEPS_CH6[9].ms = 7800;
  STEPS_CH6[12].ms = 6000;
  STEPS_CH6[15].ms = 5800;
  STEPS_CH6[27].ms = 14500;  // 동요(80 BPM 약 12초) + 마지막 음 꼬리
  // ═══════════════ 챕터 7 (텐션코드) ═══════════════
  // 흐름: [코드 구성 원리 — 3음·5음·7음 → 조합 → 자주 쓰는 5종 → 텐션 9·11·13] [다이어토닉 텐션 — CM7 → 나머지 코드 → G7(얼터드·sus4) → m7(b5) → 표] [세컨더리] [대리 도미넌트] [작은별] [총정리 표 3장 · 마무리]
  // 정석 텐션은 기본 진하기, 변형(덜 쓰는 내추럴·얼터드·대리 도미넌트의 9·13)은 옅게(.is-var) — 총정리 표는 정석 / 변형 두 칸으로 나눔
  // 소리: 텐션 코드는 지정 운지 없이 퀴즈와 같은 라이브러리 운지(VoicingCycle)를 씀 → 기기에서 청감 확인 필요
  const LIB7_FALLBACK = { Caug: [-1, 3, 2, 1, 1, 0], Cdim: [-1, 3, 4, 5, 4, -1], 'F/G': [3, -1, 3, 2, 1, 1] };   // 라이브러리에 없는 코드의 대체 운지(줄 6→1; 구성음 검증: Caug = C E G# C E / F/G = G F A C F) — 라이브러리 결과가 있으면 쓰이지 않음(Caug·F/G는 라이브러리에 없음, Cdim은 있음)
  function libSeq(names) {   // 코드 이름 배열 → 코드별 MIDI 배열. 진행으로 연결되게 한 번에 고르고, 안 되면 하나씩, 그래도 없으면 대체 운지, 그것도 없으면 소리 없음([])
    let out = names.map(function () { return []; });
    try {
      const steps = names.map(function (n) { return _comboV2ChordStep(n); });
      const all = steps.every(Boolean) ? VoicingCycle.pick(steps, 0, COMBO_V2_PLAY_PICK) : null;
      if (all) out = all.map(function (v) { return _comboVoicingMidis(v); });
      else steps.forEach(function (s, i) { const v = s ? VoicingCycle.pick([s], 0, COMBO_V2_PLAY_PICK) : null; if (v) out[i] = _comboVoicingMidis(v[0]); });
    } catch (e) { console.error('[combo-lecture] 7장 운지 선택 오류', e); }
    return out.map(function (m, i) { return m.length ? m : (LIB7_FALLBACK[names[i]] ? fretsToMidis(LIB7_FALLBACK[names[i]]) : []); });
  }
  function libVf(names) { const mm = libSeq(names); let k = 0; const f = function () { return []; }; f.midis = function () { return mm[k++] || []; }; return f; }   // playSongScore용 — 코드가 불리는 순서대로 MIDI를 돌려줌
  function playLib(names, slot, hot) {   // 코드 여러 개를 한 개씩(slot ms) 재생, 울리는 것만 hot(k)로 강조. 마지막 코드는 길게
    const mm = libSeq(names), t0 = audioT0();
    names.forEach(function (n, k) {
      const last = k === names.length - 1;
      if (mm[k].length) strum(mm[k], t0 + k * slot / 1000, last ? 1.5 : slot / 1000 * 0.9, last ? 0.8 : 0.4);
      if (hot) later(function () { hot(k); }, LEAD_MS + k * slot);
    });
    if (hot) later(function () { hot(-1); }, LEAD_MS + names.length * slot + 300);
    return wait(LEAD_MS + names.length * slot + 300 + FADE_MS);
  }
  function hit(name, dur, rel) {   // 코드 하나를 dur초 울리고 끝날 때까지 기다림(바뀐 화면이 자리를 잡은 뒤에 부를 것)
    const m = libSeq([name])[0];
    if (m.length) strum(m, audioT0(), dur, rel == null ? 0.8 : rel);
    return wait(Math.round(dur * 1000) + 300);
  }
  function hotOf(els) { return function (k) { els.forEach(function (el, j) { el.classList.toggle('is-focus', j === k); }); }; }   // 울리는 것만 파랑
  function w7(id) { const w = w3(id); w.degs = q2('#' + id + ' .lc7-dg'); return w; }
  function nameTo(w, root, tail) { return swap(w.name, function () { w.name.innerHTML = tail ? sfx6(root, tail) : root; }, 150); }
  function cellsN() { return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return $('lc7-c' + i); }); }   // CM7 줄의 7개 칸(도레미 순서, 줄 안의 보이는 순서는 바뀜)
  function hideNow(els) { els.forEach(function (el) { el.style.transition = 'none'; el.classList.remove('is-in'); }); if (els[0]) void els[0].offsetWidth; els.forEach(function (el) { el.style.transition = ''; }); }
  function colCells(id, cs) { return cs.reduce(function (a, c) { return a.concat(q2('#' + id + ' .lc7-tc[data-c="' + c + '"]')); }, []); }
  function showCols7(id, cs) { return cs.reduce(function (p, c) { return p.then(function () { fx(colCells(id, [c]), 'is-in', true, 60); return wait(200); }); }, Promise.resolve()); }   // 열을 왼쪽에서 오른쪽으로 한 열씩(열 안은 위에서 아래로)
  function fit7(id) {   // 표가 무대 폭보다 넓으면 통째로 줄임(6장 표와 같은 방식) — 범례는 표 밖이라 안 줄어듦. 열이 더해지면 다시 호출
    const sc = q2('#' + id + ' .lc7-sc')[0], tb = q2('#' + id + ' .lc7-tbl')[0], avail = $(id).clientWidth;
    sc.style.transform = '';
    sc.style.marginBottom = '';
    const k = Math.min(1, avail / tb.offsetWidth);
    sc.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    sc.style.marginBottom = k < 1 ? -Math.round(sc.offsetHeight * (1 - k)) + 'px' : '';
  }
  const MX7 = [['CM7', 'C7', 'C6'], ['CmM7', 'Cm7', 'Cm6'], ['CM7(#5)', 'Caug7', ''], ['', 'Cm7(b5)', 'Cdim7']];   // 3화음 4종 × 7음 3종 중 쓰이는 10가지 — dim에는 M7 조합 없음, aug에는 6(bb7) 조합 없음(빈 칸으로 열을 맞춤)
  const FIVE7 = ['CM7', 'C7', 'Cm7', 'Cm7(b5)', 'Cdim7'];   // 그중 자주 쓰는 5종(소리 내는 순서)
  // 다이어토닉 텐션 표(가로 배치: 한 열 = 코드 하나, 그 아래 텐션 코드가 위에서 아래로) — n 코드 / s 정석 텐션 / v 변형 텐션(내추럴 중 덜 쓰는 것 = 퀴즈 도전 레벨) / ls·lv = 나중 단계(27번)에서 더해지는 정석·변형(G7의 sus4(9)와 얼터드) / late = 열 전체가 나중에 더해짐
  const TB7_DIA = [
    { n: 'CM7', s: ['9'], v: ['13'] }, { n: 'Dm7', s: ['9', '11'], v: [] }, { n: 'Em7', s: ['11'], v: [] }, { n: 'FM7', s: ['9'], v: ['#11', '13'] },
    { n: 'G7', s: ['9', '13'], v: [], ls: ['sus4(9)'], lv: ['b9', '#9', '#11', 'b13'] }, { n: 'Am7', s: ['9'], v: ['11'] }, { n: 'Bm7(b5)', s: [], v: [], late: true },
  ];
  const TB7_SEC = [['A7', 'Dm7', ['b9', 'b13']], ['B7', 'Em7', ['b9', 'b13']], ['C7', 'FM7', ['9', '13']], ['D7', 'G7', ['9', '13']], ['E7', 'Am7', ['b9', 'b13']]];   // [세컨더리, 타겟, 텐션] — 메이저 타겟 9·13 / 마이너 타겟 b9·b13
  const TB7_SUB = [['G7', 'Db7'], ['A7', 'Eb7'], ['B7', 'F7'], ['C7', 'Gb7'], ['D7', 'Ab7'], ['E7', 'Bb7']];   // [도미넌트, 그 대리 도미넌트] — 정석 #11 / 변형 9·13
  const SONG7 = {   // 작은별 — s0 = 6장 결과 / s1 = 텐션을 멜로디에 맞춰 넣음 / s2 = 멜로디를 고려하지 않고 넣음. 칸 하나에 코드 둘이면 [앞, 뒤](5번 칸의 뒤쪽은 기반 진행의 Am7)
    s0: ['C', 'Em7(b5)', 'FM7', 'A7/C#', ['Dm7', 'Bdim7'], ['CM7', 'Am7'], ['Bm7(b5)', 'Bb7'], 'Am7'],
    s1: ['C', 'Edim7', 'FM7(9)', 'A7(b13)', ['Dm7(9)', 'Bdim7'], ['CM7', 'Am7(11)'], ['Bm7(b5)', 'Bb7(#11)'], 'Am7(9)'],
    s2: ['CM7(9)', 'Edim7', 'FM7(#11)', 'A7(13)', ['Dm7(11)', 'Bdim7'], ['CM7', 'Am7(9)'], ['Bm7(b5)', 'Bb7(9)'], 'Am7(9)'],
  };
  function flat7(k) { return SONG7[k].reduce(function (a, c) { return a.concat(c); }, []); }
  function playSong7(k) { return playSongScore(SONG7[k], '#lc7-new .lec2-slot', libVf(flat7(k)), true); }
  // 악보 코드를 from 진행에서 to 진행으로 — 바뀐 곳만 파랑(텐션이 붙은 곳은 붙은 꼬리만, 퀄리티가 바뀐 곳은 이름 전체), 글자 폭이 달라지면 다른 코드가 미끄러져 자리를 잡음
  function applySong7(from, to) {
    const els = q2('#lc7-new .lec2-sname'), a = flat7(from), b = flat7(to), sc = $('lc7-new'), ch = [];
    els.forEach(function (el, i) { el.classList.remove('is-focus'); el.innerHTML = nm5(a[i]); });   // 앞 단계의 파랑을 지움
    b.forEach(function (n, i) { if (n !== a[i]) ch.push(i); });
    return Promise.all(ch.map(function (i, k) {
      const m = /^(.*?)(\([^)]*\))$/.exec(b[i]), tens = m && !/\(b5\)$/.test(b[i]);
      return swap(els[i], function () {
        reflowScore(sc, function () { if (tens) els[i].innerHTML = sfx6(m[1], m[2]); else { els[i].innerHTML = nm5(b[i]); els[i].classList.add('is-focus'); } });
      }, k * 150);
    }));
  }
  function buildStage7() {
    const stage = $('combo-v2-lec-stage');
    stage.classList.add('is-ch2', 'is-ch7');
    const it = function (html, cls, attr) { return '<span class="lc7-it' + (cls ? ' ' + cls : '') + '"' + (attr || '') + '>' + html + '</span>'; };
    const cell = function (id, letter, deg, cls) { return '<span class="lc7-it lc7-c' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '><b class="lc7-l">' + letter + '</b><i class="lc7-d">' + deg + '</i></span>'; };
    const dgs = function (a) { return '<div class="lc7-dgc">' + a.map(function (d) { return '<i class="lc7-dg">' + d + '</i>'; }).join('') + '</div>'; };
    const widget = function (id, name, notes, degs, style) {
      return '<div class="lec3-w lc7-w" id="' + id + '"' + (style ? ' style="' + style + '"' : '') + '><span class="lec-name">' + name + '</span><div class="lec3-rows">' +
        notes.map(function (n) { return '<span class="lec-note">' + n + '</span>'; }).join('') + '</div>' + (degs ? dgs(degs) : '') + '</div>';
    };
    const row = function (id, cells) { return '<div class="lc7-row"' + (id ? ' id="' + id + '"' : '') + '>' + cells + '</div>'; };
    const mx = MX7.map(function (r) { return r.map(function (n) { const o = FIVE7.indexOf(n); return it(nm5(n), '', o >= 0 ? ' data-o="' + o + '"' : ''); }).join(''); }).join('');
    const scale = [['C', '1'], ['D', '2'], ['E', '3'], ['F', '4'], ['G', '5'], ['A', '6'], ['B', '7']];
    const rowN = row('lc7-r', scale.map(function (c, i) { return cell('lc7-c' + i, c[0], c[1], i % 2 ? 'is-blank' : ''); }).join('') + '<i class="lc7-sp lc6-off" id="lc7-sp"></i>');
    const rowG = row('lc7-gr', [['G', '1'], ['B', '3'], ['D', '5'], ['F', '7']].map(function (c) { return cell(null, c[0], c[1]); }).join('') + '<i class="lc7-sp"></i>' +
      [['A', '9'], ['C', '11'], ['E', '13']].map(function (c) { return cell(null, c[0], c[1]); }).join(''));
    const rowA = row('lc7-ga', [['Ab', 'b9'], ['A#', '#9'], ['C#', '#11'], ['Eb', 'b13']].map(function (c) { return cell(null, c[0], c[1], 'is-var'); }).join(''));
    const rowB = row('lc7-br', [['B', '1'], ['D', '3'], ['F', '5'], ['A', '7']].map(function (c) { return cell(null, c[0], c[1]); }).join('') + '<i class="lc7-sp"></i>' +
      [['C', '9'], ['E', '11'], ['G', '13']].map(function (c) { return cell(null, c[0], c[1]); }).join(''));
    // 표(가로 배치) — 한 열(data-c) = 코드 하나(맨 위) + 그 아래 텐션 코드. 정석은 진하게, 변형(.is-var)은 옅게. 열은 왼쪽에서 오른쪽으로 한 열씩 나타남. 아직 나올 때가 안 된 열·칸(G7의 sus4(9)·얼터드, Bm7(b5) 열)은 자리도 차지하지 않음(lc6-off)
    const tcell = function (c, html, cls) { return '<span class="lc7-it lc7-tc' + (cls ? ' ' + cls : '') + '" data-c="' + c + '">' + html + '</span>'; };
    const tn = function (name, t) { return nm5(t === 'sus4(9)' ? name + 'sus4(9)' : name + '(' + t + ')'); };   // 텐션 코드 이름(괄호는 위첨자)
    const colOf = function (c, cells, off) { return '<div class="lc7-cl' + (off ? ' lc6-off' : '') + '" data-c="' + c + '">' + cells + '</div>'; };
    const t1 = TB7_DIA.map(function (r, c) {
      return colOf(c, tcell(c, nm5(r.n), 'lc7-hd') +
        r.s.map(function (t) { return tcell(c, tn(r.n, t)); }).join('') + (r.ls || []).map(function (t) { return tcell(c, tn(r.n, t), 'lc6-off'); }).join('') +
        r.v.map(function (t) { return tcell(c, tn(r.n, t), 'is-var'); }).join('') + (r.lv || []).map(function (t) { return tcell(c, tn(r.n, t), 'is-var lc6-off'); }).join('') +
        (r.late ? tcell(c, '—', 'is-var') : ''), r.late);
    }).join('');
    const t2 = TB7_SEC.map(function (r, c) {
      return colOf(c, tcell(c, r[0], 'lc7-hd') + tcell(c, '→ ' + r[1], 'lc7-sl') + r[2].map(function (t) { return tcell(c, tn(r[0], t)); }).join(''));
    }).join('');
    const t3 = TB7_SUB.map(function (r, c) {
      return colOf(c, tcell(c, r[1], 'lc7-hd') + tcell(c, r[0] + ' 대리', 'lc7-sl') + tcell(c, tn(r[1], '#11')) + ['9', '13'].map(function (t) { return tcell(c, tn(r[1], t), 'is-var'); }).join(''));
    }).join('');
    const legend = '<span>정석</span><span class="lc7-lv">변형</span>';
    const tbl = function (id, body, lg) {
      return '<div class="lec3-l" id="' + id + '"><div class="lc7-tw"><div class="lc7-sc"><div class="lc7-tbl">' + body + '</div></div>' + (lg ? '<div class="lc7-it lc7-lg" id="' + id + '-lg">' + lg + '</div>' : '') + '</div></div>';
    };
    const song = scoreHtml('lc7-new', function (i, b) {   // 6장 결과(s0)로 시작 — 쪼개진 칸·덧붙는 코드가 이미 열려 있음
      const at = ' data-b="' + b + '"', nm = function (k) { return '<span class="lec2-sname">' + nm5(flat7('s0')[k]) + '</span>'; };
      const f = [0, 1, 2, 3, 4, 6, 8, 10];   // 칸 번호 → flat7('s0')에서 그 칸 첫 코드의 번호
      const s = f[i], two = Array.isArray(SONG7.s0[i]);
      if (i === 4) return '<div class="lec2-slot lc6-sl is-open"' + at + '>' + nm(s) + '<span class="lec2-sname lc6-aft">' + nm5(flat7('s0')[s + 1]) + '</span></div>';
      if (i === 5) return '<div class="lec2-slot lc6-sl is-open"' + at + '>' + nm(s) + '<span class="lec2-sname lc6-tail">' + nm5(flat7('s0')[s + 1]) + '</span></div>';
      if (i === 6) return '<div class="lec2-slot lec5-sl is-open"' + at + '><span class="lec2-sname lec5-rel">' + nm5(flat7('s0')[s]) + '</span>' + '<span class="lec2-sname">' + nm5(flat7('s0')[s + 1]) + '</span></div>';
      return two ? '' : '<div class="lec2-slot"' + at + '>' + nm(s) + '</div>';
    });
    stage.innerHTML =
      '<div class="lec3-l" id="lc7-a"><div class="lec3-demo">' + widget('lc7-wa', 'C', ['C', 'E', 'G', 'B'], ['1', '3', '5', '7']) + '</div></div>' +
      '<div class="lec3-l" id="lc7-g"><div class="lc7-mx">' + mx + '</div></div>' +
      '<div class="lec3-l" id="lc7-n">' + rowN + '<div class="lc7-nms" id="lc7-nms">' + it('CM7') + it(sfx6('CM7', '(9)')) + it(sfx6('CM7', '(13)')) + '</div></div>' +
      tbl('lc7-s1', t1, legend) +
      '<div class="lec3-l" id="lc7-d"><span class="lc7-it lc7-gn" id="lc7-gn">G7</span>' + rowG + rowA + '</div>' +
      '<div class="lec3-l" id="lc7-b"><span class="lc7-it lc7-gn" id="lc7-bn">' + nm5('Bm7(b5)') + '</span>' + rowB + '</div>' +
      '<div class="lec3-l" id="lc7-sd">' + TB7_SEC.map(function (r) { return it(r[0]); }).join('') + '</div>' +
      '<div class="lec3-l" id="lc7-p3"><div class="lc7-pr">' + it('C7', '', ' id="lc7-pa"') + it('→', 'lc7-ar', ' id="lc7-par"') + it('FM7', '', ' id="lc7-pb"') + '</div><div class="lc7-ch" id="lc7-chips">' + it('9') + it('13') + '</div></div>' +
      '<div class="lec3-l" id="lc7-sb">' + it('Db7', '', ' id="lc7-sbn"') + '</div>' +
      '<div class="lec3-l" id="lc7-cmp"><div class="lec3-demo">' + widget('lc7-wg', 'G7', ['G', 'B', 'D', 'F'], null, 'transform: translateX(-' + GAP4 + 'px)') + widget('lc7-wh', nm5('Db7(#11)'), ['Db', 'F', 'Ab', 'B', 'G'], null, 'transform: translateX(' + GAP4 + 'px)') + '</div></div>' +
      '<div class="lec3-l lec3-e" id="lc7-s">' + song + '</div>' +
      tbl('lc7-s2', t2, '') + tbl('lc7-s3', t3, legend);
  }
  const STEPS_CH7 = [
    // 0. 도입 — 문구만
    { text: '7장에선 코드를 더 세련되게 꾸며 주는\n' + em('텐션') + '에 대해 배워볼게요!', run: textOnly },
    // 1. 코드 구성 — C(C E G)가 나타남, 음 옆에 1·3·5
    { text: '그 전에 코드는 어떻게 구성되어 있는지\n빠르게 짚어 볼게요!', run: function () {
      const w = w7('lc7-wa');
      layer4('lc7-a');
      return wait(FADE_MS).then(function () { return fx([w.name], 'is-in', true); })
        .then(function () { return Promise.all([fx(w.rows.slice(0, 3), 'is-in', true, 100), fx(w.degs.slice(0, 3), 'is-in', true, 100)]); })
        .then(function () { return wait(900); });
    } },
    // 2. 3음 — E(3)를 짚고 C 재생 → E가 Eb(b3)로, 이름 Cm → Cm 재생 → 메이저로 되돌림
    { text: '3음은 메이저와 마이너를 구분해요\n' + em('3') + '음이면 메이저 ' + em('b3') + '음이면 마이너예요', run: function () {
      const w = w7('lc7-wa');
      return fx([w.rows[1], w.degs[1]], 'is-focus', true).then(function () { return wait(800); })
        .then(function () { return hit('C', 1.2); })
        .then(function () { rollNote(w.rows[1], 'Eb', -1, true); rollNote(w.degs[1], 'b3', -1, true); return nameTo(w, 'C', 'm'); })
        .then(function () { return wait(SETTLE_MS); })
        .then(function () { return hit('Cm', 1.5); })
        .then(function () { rollNote(w.rows[1], 'E', 1, false); rollNote(w.degs[1], '3', 1, false); return nameTo(w, 'C', ''); })
        .then(function () { return wait(SETTLE_MS); });
    } },
    // 3. 5음 — G(5)만 짚음
    { text: '5음은 코드의 분위기를\n더 극적으로 바꿔줘요', run: function () {
      const w = w7('lc7-wa');
      return fx([w.rows[2], w.degs[2]], 'is-focus', true).then(function () { return wait(1800); });
    } },
    // 4. 어그먼트 — G가 G#(#5)로, 이름 Caug → 재생 → 되돌림(G는 계속 파랑)
    { text: '메이저에서 ' + em('#5') + '을 사용하면\n' + em('어그먼트') + '가 돼요', run: function () {
      const w = w7('lc7-wa');
      rollNote(w.rows[2], 'G#', 1, true); rollNote(w.degs[2], '#5', 1, true);
      return nameTo(w, 'C', 'aug').then(function () { return wait(SETTLE_MS); }).then(function () { return hit('Caug', 1.6); })
        .then(function () { rollNote(w.rows[2], 'G', -1, true); rollNote(w.degs[2], '5', -1, true); return nameTo(w, 'C', ''); })
        .then(function () { return wait(SETTLE_MS); });
    } },
    // 5. 디미니쉬 — 마이너(Eb)가 되고 → G가 Gb(b5)로, 이름 Cm → Cdim → 재생
    { text: '마이너에서 ' + em('b5') + '을 사용하면\n' + em('디미니쉬') + '가 돼요', run: function () {
      const w = w7('lc7-wa');
      rollNote(w.rows[1], 'Eb', -1, true); rollNote(w.degs[1], 'b3', -1, true);
      return nameTo(w, 'C', 'm').then(function () { return wait(SETTLE_MS); })
        .then(function () { rollNote(w.rows[2], 'Gb', -1, true); rollNote(w.degs[2], 'b5', -1, true); return nameTo(w, 'C', 'dim'); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return hit('Cdim', 1.8); });
    } },
    // 6. 7음 3가지 — 메이저 C로 되돌린 뒤 7음 줄이 B(7) → Bb(b7) → A(6(bb7))로 굴러 바뀜, 이름 CM7 → C7 → C6, 소리. 글자는 애니메이션으로만
    { text: '7음은 3가지 종류가 있어요', run: function () {
      const w = w7('lc7-wa');
      rollNote(w.rows[1], 'E', 1, false); rollNote(w.degs[1], '3', 1, false);
      rollNote(w.rows[2], 'G', 1, false); rollNote(w.degs[2], '5', 1, false);
      return nameTo(w, 'C', '').then(function () { return wait(SETTLE_MS); })
        .then(function () { return Promise.all([fx([w.rows[3]], 'is-in', true), fx([w.degs[3]], 'is-in', true)]); })
        .then(function () { return nameTo(w, 'C', 'M7'); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('CM7', 1.1); })
        .then(function () { rollNote(w.rows[3], 'Bb', -1, true); rollNote(w.degs[3], 'b7', -1, true); return nameTo(w, 'C', '7'); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return hit('C7', 1.1); })
        .then(function () { rollNote(w.rows[3], 'A', -1, true); rollNote(w.degs[3], '6(bb7)', -1, true); return nameTo(w, 'C', '6'); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return hit('C6', 1.4); });
    } },
    // 7. 조합 — 3화음 4종 × 7음 3종 중 쓰이는 10개 코드 이름이 차례로(dim의 M7·aug의 6은 없음)
    { text: '이 음들을 조합하면\n만들어지는 코드가 아주 많아지죠!', run: function () {
      layer4('lc7-g');
      return wait(FADE_MS).then(function () { return fx(q2('#lc7-g .lc7-it'), 'is-in', true, 70); }).then(function () { return wait(1500); });
    } },
    // 8. 자주 쓰는 5종 — 나머지 7개는 거의 안 보이게, 5종이 한 개씩 울리며 파랑
    { text: '그중 제일 많이 쓰이는 건\n아래의 다섯 가지예요', run: function () {
      const five = [0, 1, 2, 3, 4].map(function (k) { return q2('#lc7-g [data-o="' + k + '"]')[0]; });
      return fx(q2('#lc7-g .lc7-it:not([data-o])'), 'is-faint', true).then(function () { return wait(600); })
        .then(function () { return playLib(FIVE7, 1000, hotOf(five)); });
    } },
    // 9. 빈 음 — CM7의 C E G B와 그 사이 2·4·6번째 자리(번호만 보임)
    { text: '그런데 이 코드들의 구성음 사이에는\n2, 4, 6번째 음이 비어 있어요', run: function () {
      layer4('lc7-n');
      return wait(FADE_MS).then(function () { return fx(cellsN(), 'is-in', true, 90); }).then(function () { return wait(1200); });
    } },
    // 10. 텐션 — 빈 자리에 D F A가 나타나고 → 오른쪽 한 옥타브 위 자리로 이동하며 번호 2·4·6이 9·11·13으로(파랑)
    { text: '이걸 한 옥타브 올려서\n9, 11, 13으로 표시하고\n이 음들을 ' + em('내추럴 텐션') + '이라고 해요!', run: function () {
      const cs = cellsN(), gap = [1, 3, 5].map(function (i) { return cs[i]; });
      return fx(gap, 'is-blank', false, 150).then(function () { return wait(900); }).then(function () {
        const rw = $('lc7-r'), sp = $('lc7-sp');
        slideIn(cs, function () {
          sp.classList.remove('lc6-off');
          [0, 2, 4, 6].forEach(function (i) { rw.insertBefore(cs[i], sp); });
          [1, 3, 5].forEach(function (i) { rw.appendChild(cs[i]); });
        });
        [1, 3, 5].forEach(function (i, k) { rollNote(cs[i].querySelector('.lc7-d'), ['9', '11', '13'][k], 1, true); });
        return wait(1600);
      });
    } },
    // 11. 규칙 — 앞 장면을 치우고 문구만
    { text: '텐션을 쓸 때는\n어느 정도 정해진 규칙이 있어요',
      enter: function () { layer4(null); },
      run: function () { return wait(FADE_MS + 1000).then(function () { hideNow(cellsN().concat(q2('#lc7-nms .lc7-it'))); }); } },
    // 12. CM7 위에 9·11·13 — C E G B가 먼저, 간격을 두고 D F A
    { text: em('CM7') + '의 구성음 위에\n9, 11, 13 음을 놓아 볼게요', run: function () {
      const cs = cellsN();
      layer4('lc7-n');
      return wait(FADE_MS).then(function () { return fx([cs[0], cs[2], cs[4], cs[6]], 'is-in', true, 100); })
        .then(function () { return wait(500); }).then(function () { return fx([cs[1], cs[3], cs[5]], 'is-in', true, 150); }).then(function () { return wait(1000); });
    } },
    // 13. 불협 — E와 F가 코랄 → F가 사라지고 남은 음이 가운데로 다시 모임
    { text: 'F는 CM7의 구성음인 E와 반음 높아서\n부딪혀서 쓰지 않아요', run: function () {
      const cs = cellsN();
      return fx([cs[2], cs[3]], 'is-tense', true).then(function () { return wait(1300); })
        .then(function () { return fx([cs[3]], 'is-in', false); })
        .then(function () {
          slideIn(cs.filter(function (c) { return c !== cs[3]; }), function () { cs[3].classList.add('lc6-off'); cs[2].classList.remove('is-tense'); });
          return wait(700);
        });
    } },
    // 14. (문구 없음) 이름 합치기 — 음 아래에 CM7 · CM7(9) · CM7(13)이 차례로 나타나고 한 개씩 재생
    { text: '', run: function () {
      const nms = q2('#lc7-nms .lc7-it');
      return fx(nms, 'is-in', true, 200).then(function () { return wait(500); }).then(function () { return playLib(['CM7', 'CM7(9)', 'CM7(13)'], 1200, hotOf(nms)); });
    } },
    // 15. 흐림 — 13(A와 CM7(13))을 옅게
    { text: '그중 13텐션은\n덜 쓰는 편이라 흐리게 표시할게요!', run: function () {
      const cs = cellsN(), nms = q2('#lc7-nms .lc7-it');
      return fx([cs[5], nms[2]], 'is-var', true).then(function () { return wait(1800); });
    } },
    // 16. 나머지 코드 — 가로 표(열 = 코드, 아래로 텐션 코드, 정석 / 변형)에 CM7 Dm7 Em7 FM7 G7 Am7 열이 왼쪽에서 오른쪽으로. G7은 내추럴 9·13만(sus4(9)·얼터드는 27번에서 더해짐), Bm7(b5) 열도 27번에 생김(그 전엔 자리도 차지하지 않음)
    { text: '이제 나머지 텐션들도 정리해볼게요!', run: function () {
      layer4('lc7-s1');
      fit7('lc7-s1');
      return wait(FADE_MS).then(function () { return showCols7('lc7-s1', [0, 1, 2, 3, 4, 5]); }).then(function () { return fx([$('lc7-s1-lg')], 'is-in', true); }).then(function () { return wait(2200); });
    } },
    // 17. 도미넌트 — G7의 G B D F | A C E, 11(C)은 불협(코랄)
    { text: '5도 도미넌트 코드는\n쓸 수 있는 텐션이 아주 많아요!', run: function () {
      const cs = q2('#lc7-gr .lc7-c');
      layer4('lc7-d');
      return wait(FADE_MS).then(function () { return fx([$('lc7-gn')], 'is-in', true); })
        .then(function () { return fx(cs.slice(0, 4), 'is-in', true, 100); }).then(function () { return fx(cs.slice(4), 'is-in', true, 150); })
        .then(function () { return wait(400); }).then(function () { return fx([cs[5]], 'is-tense', true); }).then(function () { return wait(1200); });
    } },
    // 18. 얼터드 — 아래에 b9 #9 #11 b13이 변형 스타일로
    { text: 'b9, #9, #11, b13을 더 쓸 수 있고\n이를 ' + em('얼터드 텐션') + '이라 해요', run: function () {
      return fx(q2('#lc7-ga .lc7-c'), 'is-in', true, 150).then(function () { return wait(1500); });
    } },
    // 19. 생략 — 문구만
    { text: '왜 그런지는 고급 화성학의 내용이라\n지금은 설명을 생략할게요!', run: textOnly },
    // 20. sus4 — 11(C)이 사라지고 3음(B)이 C로 굴러 바뀜(sus4), 이름 G7 → G7sus4 → G7sus4, G7 재생
    { text: 'G7에 11텐션을 더하면 원래는 불협이지만\n' + em('G7sus4') + '로 우회해서 쓸 수 있어요!', run: function () {
      const cs = q2('#lc7-gr .lc7-c'), nm = $('lc7-gn');
      return fx([cs[5]], 'is-in', false).then(function () {
        slideIn(q2('#lc7-gr .lc7-c:not(.lc6-off)').filter(function (c) { return c !== cs[5]; }), function () { cs[5].classList.add('lc6-off'); });
        rollNote(cs[1].querySelector('.lc7-l'), 'C', 1, true); rollNote(cs[1].querySelector('.lc7-d'), '4', 1, true);
        return swap(nm, function () { nm.innerHTML = sfx6('G7', 'sus4'); });
      }).then(function () { return wait(SETTLE_MS); }).then(function () { return playLib(['G7sus4', 'G7'], 1300); });
    } },
    // 21. 9 추가 — A(9)가 파랑, 이름 G7sus4(9), 재생
    { text: 'G7sus4에는\n9텐션까지 붙일 수 있어요', run: function () {
      const cs = q2('#lc7-gr .lc7-c'), nm = $('lc7-gn');
      cs[4].classList.add('is-focus');
      return swap(nm, function () { nm.innerHTML = sfx6('G7sus4', '(9)'); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('G7sus4(9)', 2.2); });
    } },
    // 22~23. 이름이 길다 / 많이 쓰이는 코드 — 문구만
    { text: 'G7sus4(9)는 이름이 길어서\n어려워 보이지만', run: textOnly },
    { text: '대중음악에서\n아주 많이 사용되는 코드예요!', run: textOnly },
    // 24. 분수코드 — 이름이 F/G로 바뀜(파랑) + 재생
    { text: '사실 이렇게 쓰기보다는 분수코드를 이용해서\nF/G로 표기하는 경우가 많아요!', run: function () {
      const nm = $('lc7-gn');
      return swap(nm, function () { nm.innerHTML = 'F/G'; nm.classList.add('is-focus'); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('F/G', 2.2); });
    } },
    // 25. m7(b5) — B D F A, 텐션 자리(C E G)는 거의 안 보이게
    { text: em(nm5('m7(b5)')) + '는 그 자체로 불안정해서\n텐션을 잘 쓰지 않아요', run: function () {
      const cs = q2('#lc7-br .lc7-c');
      layer4('lc7-b');
      return wait(FADE_MS).then(function () { return fx([$('lc7-bn')], 'is-in', true); }).then(function () { return fx(cs.slice(0, 4), 'is-in', true, 100); })
        .then(function () { return fx(cs.slice(4), ['is-in', 'is-faint'], true, 150); }).then(function () { return wait(1500); });
    } },
    // 26. 총정리 예고 — 문구만
    { text: '다이어토닉 코드에서 쓸 수 있는\n텐션을 정리해 볼게요!', run: textOnly },
    // 27. (문구 없음) 표 — G7 열에 sus4(9)·얼터드 칸이 더해지고 Bm7(b5) 열이 생기며, 기존 열이 미끄러져 새 균형 자리를 잡음
    { text: '', run: function () {
      layer4('lc7-s1');
      fit7('lc7-s1');
      const g7 = q2('#lc7-s1 .lc7-cl[data-c="4"] .lc7-tc.lc6-off'), shown = colCells('lc7-s1', [0, 1, 2, 3, 4, 5]).filter(function (el) { return !el.classList.contains('lc6-off'); }).concat([$('lc7-s1-lg')]);
      return wait(FADE_MS).then(function () {
        slideIn(shown, function () {
          g7.forEach(function (el) { el.classList.remove('lc6-off'); });
          q2('#lc7-s1 .lc7-cl.lc6-off').forEach(function (el) { el.classList.remove('lc6-off'); });
          fit7('lc7-s1');
        });
        return fx(g7, 'is-in', true, 80);
      }).then(function () { return wait(300); }).then(function () { return showCols7('lc7-s1', [6]); }).then(function () { return wait(2200); });
    } },
    // 28. 세컨더리 — 앞 장면을 치우고 A7 B7 C7 D7 E7이 나타남
    { text: '세컨더리 도미넌트에도\n텐션을 쓸 수 있어요',
      enter: function () { layer4(null); },
      run: function () { return wait(FADE_MS).then(function () { layer4('lc7-sd'); return wait(FADE_MS); }).then(function () { return fx(q2('#lc7-sd .lc7-it'), 'is-in', true, 150); }).then(function () { return wait(900); }); } },
    // 29. 기준 — 문구만
    { text: '타겟이 메이저인지 마이너인지에 따라\n어울리는 텐션이 달라요', run: textOnly },
    // 30. 메이저 타겟 — C7 → FM7, 텐션 9·13이 정석 스타일로, C7(9) → FM7 / C7(13) → FM7 재생
    { text: '메이저일 때는 9, 13 같은\n' + em('내추럴 텐션') + '이 잘 어울려요', run: function () {
      const pa = $('lc7-pa'), pb = $('lc7-pb'), ar = $('lc7-par'), chips = q2('#lc7-chips .lc7-it');
      layer4('lc7-p3');
      return wait(FADE_MS).then(function () { return fx([pa, ar, pb], 'is-in', true, 150); }).then(function () { return wait(500); })
        .then(function () { return fx(chips, 'is-in', true, 150); }).then(function () { return wait(700); })
        .then(function () { chips[0].classList.add('is-focus'); return swap(pa, function () { pa.innerHTML = sfx6('C7', '(9)'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playLib(['C7(9)', 'FM7'], 1300); })
        .then(function () { chips[0].classList.remove('is-focus'); chips[1].classList.add('is-focus'); return swap(pa, function () { pa.innerHTML = sfx6('C7', '(13)'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playLib(['C7(13)', 'FM7'], 1300); });
    } },
    // 31. 마이너 타겟 — A7 → Dm7, 텐션 b9·b13, A7(b9) → Dm7 / A7(b13) → Dm7 재생
    { text: '마이너일 때는 b9과 b13 텐션이\n아주 잘 어울려요', run: function () {
      const pa = $('lc7-pa'), pb = $('lc7-pb'), ar = $('lc7-par'), chips = q2('#lc7-chips .lc7-it');
      return fx([pa, ar, pb].concat(chips), 'is-in', false).then(function () {
        pa.innerHTML = 'A7'; pb.innerHTML = 'Dm7'; chips[0].textContent = 'b9'; chips[1].textContent = 'b13';
        chips.forEach(function (c) { c.classList.remove('is-focus'); });
        return fx([pa, ar, pb], 'is-in', true, 150);
      }).then(function () { return wait(500); }).then(function () { return fx(chips, 'is-in', true, 150); }).then(function () { return wait(700); })
        .then(function () { chips[0].classList.add('is-focus'); return swap(pa, function () { pa.innerHTML = sfx6('A7', '(b9)'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playLib(['A7(b9)', 'Dm7'], 1300); })
        .then(function () { chips[0].classList.remove('is-focus'); chips[1].classList.add('is-focus'); return swap(pa, function () { pa.innerHTML = sfx6('A7', '(b13)'); }); })
        .then(function () { return wait(SETTLE_MS); }).then(function () { return playLib(['A7(b13)', 'Dm7'], 1300); });
    } },
    // 32. 대리 도미넌트 — 앞 장면을 치우고 Db7
    { text: '대리 도미넌트도 마찬가지로\n텐션을 쓸 수 있어요!',
      enter: function () { layer4(null); },
      run: function () { return wait(FADE_MS).then(function () { layer4('lc7-sb'); return wait(FADE_MS); }).then(function () { return fx([$('lc7-sbn')], 'is-in', true); }).then(function () { return wait(900); }); } },
    // 33. #11 — Db7 → Db7(#11) + 재생
    { text: '대중음악에선 거의 정해진 공식처럼\n대부분 #11 텐션을 사용해요', run: function () {
      const nm = $('lc7-sbn');
      return swap(nm, function () { nm.innerHTML = sfx6('Db7', '(#11)'); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('Db7(#11)', 2.2); });
    } },
    // 34. #11의 정체 — G7과 Db7(#11)을 나란히(구성음 비교), 둘의 G만 파랑. 소리 없음
    { text: '#11은 항상 원래 도미넌트\n코드의 근음이기 때문이에요', run: function () {
      const a = w3('lc7-wg'), b = w3('lc7-wh');
      layer4('lc7-cmp');
      return wait(FADE_MS).then(function () { return fx([a.name, b.name], 'is-in', true); }).then(function () { return Promise.all([fx(a.rows, 'is-in', true, 100), fx(b.rows, 'is-in', true, 100)]); })
        .then(function () { return wait(400); }).then(function () { return fx([a.rows[0], b.rows[4]], 'is-focus', true, 250); }).then(function () { return wait(1800); });
    } },
    // 35. 9 — Db7(9)가 변형 스타일로 + 재생
    { text: '9, 13 텐션도 쓸 수 있어요!', run: function () {
      const nm = $('lc7-sbn');
      layer4('lc7-sb');
      nm.classList.add('is-var');
      return wait(FADE_MS).then(function () { return swap(nm, function () { nm.innerHTML = sfx6('Db7', '(9)'); }); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('Db7(9)', 2); });
    } },
    // 36. 13 — Db7(13) + 재생
    { text: '굉장히 신비롭고 재즈스러운\n사운드를 내요!', run: function () {
      const nm = $('lc7-sbn');
      return swap(nm, function () { nm.innerHTML = sfx6('Db7', '(13)'); }).then(function () { return wait(SETTLE_MS); }).then(function () { return hit('Db7(13)', 2); });
    } },
    // 37. 작은별 — 6장 결과 악보가 나타나고 텐션이 붙음(바뀐 곳만 파랑) → 재생(1차: 멜로디와 충돌 없이)
    { text: '6장에서 만든 작은별에\n텐션까지 넣어 볼게요!', run: function () {
      const ly = $('lec-lyrics'), nn = q2('#lc7-new .lec2-sname');
      ly.innerHTML = songLyricsHtml();
      layoutScore($('lc7-new'));
      layer4('lc7-s');
      return wait(FADE_MS).then(function () { return fx(nn, 'is-in', true, 60); })
        .then(function () { ly.classList.add('is-in'); return wait(FADE_MS + 600); })
        .then(function () { return applySong7('s0', 's1'); }).then(function () { return wait(SETTLE_MS); })
        .then(function () { return playSong7('s1'); });
    } },
    // 38. 멜로디 주의 — 문구만
    { text: '텐션을 넣을 땐 ' + em('멜로디') + '와\n' + em('충돌') + '하지 않게 신중하게 넣어야 해요', run: textOnly },
    // 39. 2차 — 멜로디를 고려하지 않은 텐션으로 바꿔 재생
    { text: '멜로디를 고려하지 않고\n텐션을 넣으면 어떻게 될까요? 들어봐요!', run: function () {
      const ly = $('lec-lyrics');
      ly.querySelectorAll('.lec-syl').forEach(function (el) { el.classList.remove('is-on', 'is-sung'); });
      return applySong7('s1', 's2').then(function () { return wait(SETTLE_MS); }).then(function () { return playSong7('s2'); });
    } },
    // 40. 소감 — 문구만
    { text: '괜찮게 들렸나요?\n텐션을 받아들이는 건 자유지만\n충분히 고민한 뒤에 쓰는 게 좋아요!', run: textOnly },
    // 41. 총정리 도입 — 문구만
    { text: '지금까지 배운 텐션을\n총정리해 볼게요!', run: textOnly },
    // 42~44. 총정리 표 3장(다이어토닉 / 세컨더리 / 대리 도미넌트) — 각각 열이 왼쪽에서 오른쪽으로
    { text: '', run: function () {
      const all = colCells('lc7-s1', [0, 1, 2, 3, 4, 5, 6]);
      layer4('lc7-s1');
      fit7('lc7-s1');
      return wait(FADE_MS).then(function () { hideNow(all.concat([$('lc7-s1-lg')])); return showCols7('lc7-s1', [0, 1, 2, 3, 4, 5, 6]); }).then(function () { return fx([$('lc7-s1-lg')], 'is-in', true); }).then(function () { return wait(2500); });
    } },
    { text: '', run: function () {
      layer4('lc7-s2');
      fit7('lc7-s2');
      return wait(FADE_MS).then(function () { return showCols7('lc7-s2', [0, 1, 2, 3, 4]); }).then(function () { return wait(2500); });
    } },
    { text: '', run: function () {
      layer4('lc7-s3');
      fit7('lc7-s3');
      return wait(FADE_MS).then(function () { return showCols7('lc7-s3', [0, 1, 2, 3, 4, 5]); }).then(function () { return fx([$('lc7-s3-lg')], 'is-in', true); }).then(function () { return wait(2500); });
    } },
    // 45~46. 마무리 멘트(초안) + 마무리(공통)
    { text: '텐션은 코드를 풍성하게 해 주지만\n늘 멜로디와 어울리는지 들어보고 써요', seq: true, run: textOnly },
    Object.assign(endingStep(7), { seq: true }),
  ];
  // "다음" 묶음: [0~1 도입] / [2~5 3음·5음] / [6~8 7음·조합·5종] / [9~10 텐션 정의] / [11~15 CM7] / [16 나머지 코드] / [17~19 G7 얼터드] / [20~24 sus4] / [25~27 m7(b5)·표] / [28~29 세컨더리] / [30 메이저] / [31 마이너] / [32~34 대리 도미넌트 #11] / [35~36 9·13] / [37 작은별] / [38~40 멜로디·소감] / [41~44 총정리] / [45~46 마무리]
  const GROUPS_CH7 = [[0, 1], [2, 3, 4, 5], [6, 7, 8], [9, 10], [11, 12, 13, 14, 15], [16], [17, 18, 19], [20, 21, 22, 23, 24], [25, 26, 27], [28, 29], [30], [31], [32, 33, 34], [35, 36], [37], [38, 39, 40], [41, 42, 43, 44], [45, 46]];
  STEPS_CH7[5].ms = 7000;    // 마지막 묶음 단계의 소리 꼬리까지(단계 시작 기준) — 소리가 있는 묶음 끝 단계
  STEPS_CH7[8].ms = 8000;
  STEPS_CH7[24].ms = 4000;
  STEPS_CH7[30].ms = 13000;
  STEPS_CH7[31].ms = 13000;
  STEPS_CH7[36].ms = 4000;
  STEPS_CH7[37].ms = 18000;  // 동요(80 BPM 약 12초) + 바뀌는 연출 + 마지막 음 꼬리
  const LECTURES = { 1: { steps: STEPS_CH1, groups: GROUPS_CH1 }, 2: { steps: STEPS_CH2, groups: GROUPS_CH2 }, 3: { steps: STEPS_CH3, groups: GROUPS_CH3 }, 4: { steps: STEPS_CH4, groups: GROUPS_CH4 }, 5: { steps: STEPS_CH5, groups: GROUPS_CH5 }, 6: { steps: STEPS_CH6, groups: GROUPS_CH6 }, 7: { steps: STEPS_CH7, groups: GROUPS_CH7 } };

  // ── 진행 ──
  // "다음" 버튼 상태는 활성/비활성 둘뿐이고, 그 기준은 L.ready 하나. aria-disabled도 같이 맞춰 CSS가 :hover·:focus와 상관없이 비활성 모양을 고정함
  function setNext(disabled, label) {
    const btn = $('combo-v2-lec-next');
    L.ready = !disabled;
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (label) $('combo-v2-lec-next-label').textContent = label;
  }
  // 묶음이 진행 중(ready가 아님)인 동안은 어떤 이유로든 버튼이 켜져 있으면 곧바로 다시 끔 — 켜는 길은 setNext(false) 하나뿐이어야 하므로 이 감시는 보험
  function startWatch() {
    clearInterval(L.watch);
    L.watch = setInterval(function () {
      const b = $('combo-v2-lec-next');
      if (b && !L.ready && !b.disabled) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
    }, 100);
  }
  // seq: 문구를 한 줄씩 차례로 띄움(첫 줄은 평소처럼, 다음 줄부터 LINE_MS 간격으로 페이드 — CSS .lec-ln). 마무리 단계용
  const LINE_MS = 1100;
  function showCaption(text, seq) {
    const qEl = $('combo-v2-lec-text');
    const html = seq ? text.split('\n').map(function (ln, k) { return k ? '<span class="lec-ln" style="animation-delay:' + (k * LINE_MS) + 'ms">' + ln + '</span>' : ln; }).join('\n') : text;
    // 캡션 박스(.test-question-text)는 display:flex라 안에 글자·span이 섞이면 각각 가로로 나란한 칸이 되어 문장이 끊김 → 전체를 span 하나(.lec-cap)로 감싸 한 덩어리로
    qEl.innerHTML = '<span class="lec-cap">' + html + '</span>';
    qEl.classList.remove('test-question--in');
    void qEl.offsetWidth;
    qEl.classList.add('test-question--in');
  }
  // 한 묶음 재생 — 묶음 안 단계를 차례로 자동 진행하고, 마지막 단계가 끝나야 "다음"(마지막 묶음은 "완료")이 켜짐.
  // 각 단계는 캡션과 연출·소리를 동시에 시작(본체는 연출)하며, 다음 단계(또는 버튼 활성화)로 넘어가는 조건 3가지가 모두 맞아야 함:
  //  ① 연출이 실제로 끝남(run()이 돌려준 약속 — 실패하거나 20초 넘게 안 끝나면 포기하고 진행)  ② 단계 시작 후 최소 2초 경과  ③ 연출이 끝난 뒤 짧은 간격
  // 캡션 페이드(0.5s)는 ②보다 짧아서 따로 기다리지 않음(animationend에 의존하면 이벤트를 놓쳤을 때 영영 안 켜짐)
  function goGroup(g) {
    const tok = L.tok, lec = LECTURES[L.ch], ids = lec.groups[g];
    const gen = ++L.gen;   // 이 묶음의 번호 — 아래 모든 콜백이 확인함
    L.group = g;
    L.skipping = false;
    $('combo-v2-lec-stage').classList.remove('is-skip');
    setNext(true, g === lec.groups.length - 1 ? '완료' : '다음');   // 묶음이 시작되면 무조건 비활성
    startWatch();
    (function playAt(k) {
      if (tok !== L.tok || gen !== L.gen) return;
      endSkip();   // 건너뛰기는 지금 단계 하나만 — 앞 단계의 남은 예약을 모두 실행한 뒤 해제, 다음 단계는 평소 속도로
      const i = ids[k];
      L.step = i;
      showCaption(lec.steps[i].text, lec.steps[i].seq);
      const capBase = lec.steps[i].seq ? Math.max(MIN_STEP_MS, (lec.steps[i].text.split('\n').length - 1) * LINE_MS + 700) : MIN_STEP_MS;   // 한 줄씩 뜨는 문구는 마지막 줄이 다 뜬 뒤에야 다음으로
      const capMs = lec.steps[i].text ? Math.max(capBase, CAPTION_GAP_MIN_MS - AUTO_GAP_MS) : capBase;   // 문구가 있는 단계는 다음 문구(자동 진행 간격 AUTO_GAP_MS 뒤)가 최소 CAPTION_GAP_MIN_MS 뒤에 뜨도록
      if (lec.steps[i].enter) { try { lec.steps[i].enter(); } catch (e) { console.error('[combo-lecture] step ' + (i + 1) + ' enter 오류', e); } }   // 문구와 동시에 하는 일(앞 장면 치우기) — 연출 run()은 문구 선행 시간(CAPTION_LEAD_MS) 뒤에 시작해서 그동안 앞 장면이 남아 보임
      // 연출이 오류로 중간에 끝나도 "다음"이 일찍 켜지지 않도록: 오류는 콘솔에 남기고(원인 추적용), 묶음의 마지막 단계는 위 ms(소리 꼬리 포함)도 지나야 함
      // 항상 문구가 먼저: 문구를 띄우고 CAPTION_LEAD_MS(페이드 + 읽는 시간)가 지난 뒤에 연출·소리를 시작 — 동시에 시작하면 눈이 문구와 연출 둘 다 못 따라감
      const run = wait(CAPTION_LEAD_MS).then(function () {
        try { return Promise.resolve(lec.steps[i].run()).catch(function (e) { console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }); }
        catch (e) { console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }
      });
      const floor = k === ids.length - 1 ? (lec.steps[i].ms || 0) + CAPTION_LEAD_MS : 0;   // ms는 연출 시작 기준이라 문구 선행 시간만큼 더함
      Promise.all([Promise.race([run, failsafe(STEP_FAILSAFE_MS)]), wait(capMs), wait(floor)]).then(function () {
        if (tok !== L.tok || gen !== L.gen || L.step !== i) return;
        if (k < ids.length - 1) later(function () { clearDelays(); playAt(k + 1); }, AUTO_GAP_MS);   // 묶음 안: 자동으로 다음 단계
        else later(function () { if (gen === L.gen) setNext(false); }, NEXT_BUFFER_MS);              // 묶음 끝: 버튼 활성화(이 묶음 번호일 때만)
      });
    })(0);
  }

  // 화면 초기화(닫힌 뒤) — 다음에 열면 1단계부터
  function resetView() {
    $('combo-v2-lec-stage').innerHTML = '';
    $('combo-v2-lec-stage').classList.remove('is-ch2', 'is-ch3', 'is-ch4', 'is-ch5', 'is-ch6', 'is-ch7', 'is-skip');
    const qEl = $('combo-v2-lec-text');
    qEl.textContent = '';
    qEl.classList.remove('test-question--in');
    setNext(true, '다음');
  }
  // 닫기 — 멱등. hard: 이탈(소리 즉시 절단) / 아니면 정상 종료(마지막 소리는 짧은 페이드)
  function close(hard) {
    L.tok++;
    L.gen++;
    L.ready = false;
    clearInterval(L.watch);
    L.watch = null;
    L.timers.forEach(clearTimeout);
    L.timers = [];
    L.pend.clear();
    L.skipping = false;
    L.rewatch = false;
    L.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    L.anims = [];
    if (typeof GuitarAudio !== 'undefined') {
      if (hard) {
        if (L.sounded) GuitarAudio.panic();
        if (L.pianoUsed) GuitarAudio.resetPiano();
      } else {
        if (L.sounded) GuitarAudio.stop();
        if (L.pianoUsed) GuitarAudio.fadeOutPiano();
      }
    }
    releaseTrim(hard);
    L.sounded = false;
    L.pianoUsed = false;
    const was = L.open;
    L.open = false;
    setTopbarLec(false);
    L.step = -1;
    L.group = -1;
    if (!was) return;
    $('combo-v2-lecture').classList.remove('is-open');   // 본문이 아래로 내려감
    clearTimeout(L.resetTimer);
    L.resetTimer = setTimeout(resetView, LEC_SLIDE_MS);
  }
  // 이탈(X·뒤로가기 확인 후 / 앱 전환 / 페이지 이탈) — 소리·타이머·애니메이션 즉시 중단, 처음 상태로
  function abort() {
    if (L.open && typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen() && typeof hideLeavePracticeModal === 'function') hideLeavePracticeModal();
    close(true);
  }

  function backToList(n) {
    try { _comboV2ScrollToChapter(n, true); } catch (e) {}
  }

  // 수강 완료 기록 — 새로 기록되면 true (이미 들은 챕터를 다시 본 경우 false)
  function recordWatched(n) {
    const prog = _comboV2ProgLoad();
    const a = Array.isArray(prog._lec) ? prog._lec : [];
    if (a.indexOf(n) >= 0) return false;
    a.push(n);
    prog._lec = a.sort(function (x, y) { return x - y; });
    _comboV2ProgSave(prog);
    _comboV2RenderProgress();   // 강의를 마친 챕터의 첫 레벨이 열림
    return true;
  }

  // 마지막 단계(공통 마무리)의 "완료" — 수강 완료를 기록하고 강의를 닫아 곧바로 레벨 목록으로(별도 안내 페이지 없음: 마무리 문구가 그 역할)
  function finish() {
    const n = L.ch;
    recordWatched(n);
    close(false);
    backToList(n);
  }

  // 첫 접속 시작 페이지 — 이 훈련에 처음 들어왔고 챕터 1 강의를 아직 안 봤으면 한 번만 띄움(보인 시점에 기록 → 도중에 나가도 다시 안 뜸. 진행도 객체의 _welcome)
  function maybeShowWelcome() {
    const prog = _comboV2ProgLoad();
    if (prog._welcome || _comboV2LectureDone(1, prog)) return;
    prog._welcome = 1;
    _comboV2ProgSave(prog);
    $('combo-v2-welcome').hidden = false;
  }
  function closeWelcome() {
    const page = $('combo-v2-welcome');
    if (!page || page.hidden) return false;
    page.hidden = true;
    return true;
  }

  async function open(n) {
    if (L.open || !LECTURES[n]) return;
    close(true);   // 혹시 남은 상태가 있으면 정리하고 시작
    clearTimeout(L.resetTimer);
    resetView();
    L.open = true;
    L.ch = n;
    setTopbarLec(true);
    try { const pr = _comboV2ProgLoad(); L.rewatch = (Array.isArray(pr._lec) && pr._lec.indexOf(n) >= 0) || (typeof _comboV2DevUnlocked === 'function' && _comboV2DevUnlocked()); } catch (e) { L.rewatch = false; }   // 이미 끝까지 수강한 챕터만 터치로 건너뛸 수 있음(처음 보는 강의는 못 건너뜀)
    const tok = L.tok;
    const sec = $('combo-v2-lecture');
    sec.style.setProperty('--lec-fade', FADE_MS + 'ms');
    sec.style.setProperty('--lec-spread', SPREAD_MS + 'ms');
    sec.style.setProperty('--ch-accent', COMBO_V2_CH_COLORS[n - 1]);
    if (n === 7) buildStage7(); else if (n === 6) buildStage6(); else if (n === 5) buildStage5(); else if (n === 4) buildStage4(); else if (n === 3) buildStage3(); else if (n === 2) buildStage2(); else buildStage();
    sec.classList.add('is-open');   // 본문이 아래에서 올라옴
    try {
      if (GuitarAudio.resume) await withTimeout(GuitarAudio.resume(), READY_TIMEOUT_MS);
      if (GuitarAudio.ready) await withTimeout(GuitarAudio.ready(), READY_TIMEOUT_MS);
      if (GuitarAudio.warmupPiano) GuitarAudio.warmupPiano();
    } catch (e) {}
    if (tok !== L.tok) return;   // 준비하는 사이 닫힘
    try { LEAD_MS = Math.round((AUDIO_LEAD_S + (Tone.getContext().lookAhead || 0)) * 1000); } catch (e) {}   // 화면 연출 지연 = 소리 예약 지연 + lookAhead
    later(function () { goGroup(0); }, OPEN_DELAY_MS);
  }

  // 이미 수강 완료한 강의에서 화면을 터치하면 지금 단계의 남은 연출을 바로 끝냄 — 예약된 콜백은 원래 시각 순서대로 기다림 없이 실행,
  // 새로 만드는 애니메이션은 길이 0·CSS 전환은 끔(.is-skip), 소리는 하드컷. 이 단계가 끝나면 다음 단계는 평소 속도(playAt이 해제). 묶음의 마지막 단계면 "다음"이 켜짐
  function skipGroup() {
    if (!L.open || !L.rewatch || L.skipping || L.ready || L.group < 0) return;
    L.skipping = true;
    L.vnow = Date.now();
    $('combo-v2-lec-stage').classList.add('is-skip');
    // 소리는 하드컷 — 연출이 시작될 때 이미 뒤의 소리까지 예약해 두므로 페이드(stop)로는 예약된 소리가 남음
    if (typeof GuitarAudio !== 'undefined') {
      if (L.sounded) GuitarAudio.panic();
      if (L.pianoUsed) GuitarAudio.resetPiano();
    }
    releaseTrim(true);
    L.pend.forEach(function (r) { if (r.id > 0) clearTimeout(r.id); });   // 실제 타이머는 끄고 가상 시각 목록으로만 실행
    // 아직 진행 중인 애니메이션만 끝냄 — 이미 취소(idle)·종료된 것에 finish()를 부르면 되살아나고, 글자 교체·굴러 바뀜의 '사라지는' 애니메이션(fill: both, 투명 상태로 끝남)이
    // 다시 적용돼 앞서 바뀐 글자·음(C·G 이름, E 음 등)이 투명한 채 남음. 이미 끝난 것의 onfinish도 다시 부르지 않음(글자를 옛 값으로 되돌림)
    L.anims.slice().forEach(function (a) {
      const ps = a.playState;
      if (ps === 'idle' || ps === 'finished') return;
      try { a.finish(); } catch (e) {}
      fireFinish(a, L.tok);
    });
    drainSkip();
  }
  // 예약 목록(pend)에서 가장 이른 것부터 하나씩 실행하고, 그 결과로 이어지는 약속(then)이 새 예약을 만들 시간을 준 뒤 다음으로 — 새 예약도 가상 시각에 끼어들어
  // 원래 연출 시각 순서가 그대로 지켜짐(한꺼번에 0ms로 밀어 넣으면 나중에 생긴 예약이 먼저 예약된 것 뒤로 밀려 순서가 뒤바뀜)
  function nextRec() { let b = null; L.pend.forEach(function (r) { if (!b || r.at < b.at) b = r; }); return b; }
  // 건너뛰기 종료 — 해제하기 전에 남은 예약(앞 단계의 마무리 표시 등)을 시각 순서대로 모두 실행. 하나라도 빠지면 그 표시가 영영 안 나타남
  function endSkip() {
    if (!L.skipping) return;
    for (let g = 0; g < 5000; g++) {
      const r = nextRec();
      if (!r) break;
      L.pend.delete(r.id);
      L.vnow = Math.max(L.vnow, r.at);
      try { r.fn(); } catch (e) { console.error('[combo-lecture] skip 오류', e); }
    }
    L.skipping = false;
    $('combo-v2-lec-stage').classList.remove('is-skip');
  }
  async function drainSkip() {
    if (L.draining) return;
    L.draining = true;
    const tok = L.tok;
    const flush = async function () { for (let k = 0; k < 8; k++) await null; };
    try {
      await null;   // later()가 부른 경우 호출한 쪽 코드가 끝난 뒤에 시작
      for (let guard = 0; guard < 20000 && L.skipping && tok === L.tok; guard++) {
        let r = nextRec();
        if (!r) { await flush(); r = nextRec(); if (!r) break; }
        L.pend.delete(r.id);
        L.vnow = Math.max(L.vnow, r.at);
        try { r.fn(); } catch (e) { console.error('[combo-lecture] skip 오류', e); }
        await flush();
      }
    } finally { L.draining = false; }
    if (L.skipping && tok === L.tok && L.pend.size) drainSkip();   // 마지막 확인 사이에 예약이 늘었으면 이어서
  }

  // ── 이벤트 ──
  $('combo-v2-lecture')?.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('button')) return;   // 버튼(다음·닫기)은 제외
    skipGroup();
  });
  $('combo-v2-lec-next')?.addEventListener('click', function () {
    const btn = $('combo-v2-lec-next');
    if (!L.open || !L.ready || btn.disabled) return;   // 묶음이 끝나 ready일 때만 눌림(버튼이 어떤 이유로 켜져 있어도 ready가 아니면 무시)
    setNext(true);   // 누르는 즉시 비활성 — 다음 묶음이 끝날 때까지 다시 켜질 수 없음
    btn.blur();      // 포커스가 남아 버튼 모양이 활성처럼 보이는 것 방지
    const lec = LECTURES[L.ch];
    if (L.group >= lec.groups.length - 1) { finish(); return; }
    // 울리던 소리(기타 울림·피아노)는 짧은 페이드로 끊고 진행 — 스케일 튜토리얼 advanceTutorialStep과 같음
    if (L.sounded) GuitarAudio.stop();
    if (L.pianoUsed) GuitarAudio.fadeOutPiano();
    releaseTrim(false);
    L.timers.forEach(clearTimeout);
    L.timers = [];
    L.pend.clear();
    clearDelays();
    hot(-1);
    goGroup(L.group + 1);
  });
  // 시작 페이지는 강의 본문이 아래에서 다 올라온 뒤에 걷음 — 바로 걷으면 슬라이드 동안 뒤의 목록 화면이 잠깐 비침
  $('combo-v2-welcome-go')?.addEventListener('click', function () {
    open(1);
    setTimeout(closeWelcome, LEC_SLIDE_MS);
  });
  // 챕터 카드 ▶ — 열린 챕터만(잠긴 챕터는 건너뛰기 테스트로 감)
  document.getElementById('combo-v2-body')?.addEventListener('click', function (e) {
    const btn = e.target.closest('.combo-v2-chapter-play');
    if (!btn || btn.classList.contains('is-locked')) return;
    const ch = btn.closest('.combo-v2-chapter');
    const n = ch ? parseInt(ch.dataset.chapter || (ch.querySelector('.combo-v2-chapter-label') || {}).textContent, 10) : 0;
    if (n && LECTURES[n]) { e.stopPropagation(); open(n); }
  });

  // 탑바 X / Android 뒤로가기(handleComboBack이 부름): 시작·완료 페이지는 바로 닫고, 강의 중이면 확인 모달(그동안 강의는 계속 진행). 처리했으면 true
  window.comboV2LectureBack = function () {
    if (closeWelcome()) return true;   // 시작 페이지에서 뒤로가기: 페이지만 닫고 목록으로(이미 기록돼서 다시 안 뜸)
    if (L.open) {
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return true;
      showLeavePracticeModal(function () { abort(); }, { title: '미니강의를 그만두시겠어요?', desc: '지금 나가면 미니강의를<br>처음부터 다시 봐야 해요.' });
      return true;
    }
    return false;
  };
  window.addEventListener('pagehide', function () { abort(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) abort(); });

  maybeShowWelcome();
})();
