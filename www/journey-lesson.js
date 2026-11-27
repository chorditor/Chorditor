// ───────────────────────────────────────────────────────────
// 나의 기타 여정 — 노드 강의 엔진 (journey-lesson.html)
//   리하모니 화성학 미니강의 엔진(chord-combo-lecture.js)에서 공용 부분만 복사해 온 것(2026-11-12, A안 — 리하모니 쪽은 건드리지 않음).
//   진행 방식·타이밍·진행 바·일시정지·이탈 정리 규칙은 원본과 같다(docs/chord-combo-lecture-style.md §3·§11).
//   노드별 내용(단계·무대)은 journey-lessons/<노드>.js 가 JourneyLesson.register(id, def)로 등록한다.
//     def = { steps: [{ text, seq?, enter?, run, ms?, failsafe? }], groups: [[단계 번호…], …](페이즈), durs?: [ms…](진행 바 칸 길이), build(stage)(무대 생성) }
//   URL: journey-lesson.html?course=comping&day=1 → JL_NODE_FILES 표에서 노드 파일을 찾아 그 파일 하나만 불러온다.
//
//   이탈(CLAUDE.md 0-2): 탑바 X·Android 뒤로가기(#back-btn → journeyLessonBack)는 확인 모달 후, 페이지 이동(pagehide)은 확인 없이 — 모두 abort() 하나.
//   홈/앱 전환(visibilitychange)은 일시정지, 돌아오면 멈춘 지점부터 이어서(원본과 같음).
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';

  // 문구 안에서 강조할 부분 — 따옴표 대신 파랑(.lec-em). 문구는 코드 안의 고정 문자열이라 innerHTML로 넣어도 안전
  function em(s) { return '<span class="lec-em">' + s + '</span>'; }
  // 한국어 낱말 아래에 영어를 작은 라벨로 덧붙임 — 라벨은 줄 높이에 안 들어가(한국어 문장 기준 행간 그대로) 줄 아래 빈 자리에 걸쳐 놓임. 문구의 마지막 줄에만 쓸 것(아래 줄이 있으면 겹침)
  function an(ko, en) { return '<span class="lec-an">' + ko + '<span class="lec-al">' + en + '</span></span>'; }
  // 단계 묶기 — 진행 바에서 칸 하나로 보이게 여러 단계를 한 단계로 이어 붙임(지우지 않음). 문구·연출·간격은 엔진이 단계를 넘길 때와 똑같은 순서로 진행:
  //  구성 단계마다 [문구 → (enter) → 1초 → 연출] 이고, 연출이 끝나고 그 문구가 최소 간격(CAPTION_GAP_MIN_MS)만큼 보인 뒤 AUTO_GAP_MS 쉬고 다음 구성 단계로.
  //  첫 구성 단계의 문구·enter·1초 선행은 엔진이 처리하므로 합친 단계는 첫 단계의 text/seq/enter를 그대로 가짐. 합친 단계는 길어서 엔진의 안전 시간(20초)을 구성 수만큼 늘림(failsafe).
  //  모든 지연이 wait()라 빨리 돌리기(seek)·건너뛰기에서도 그대로 동작.
  function chainSteps(list) {
    const first = list[0];
    const capMsOf = function (s) {
      const base = s.seq ? Math.max(MIN_STEP_MS, (s.text.split('\n').length - 1) * LINE_MS + 700) : MIN_STEP_MS;
      if (s.gap != null) return s.gap - AUTO_GAP_MS;   // 여정 추가: 단계가 문구 간격을 직접 지정(도입부처럼 템포를 높일 때 — 사용자 지정)
      return s.text ? Math.max(base, captionGapMs(s.text) - AUTO_GAP_MS) : base;
    };
    const guarded = function (s) {
      try { return Promise.resolve(s.run()).catch(function (e) { console.error('[combo-lecture] 묶음 연출 오류', e); }); }
      catch (e) { console.error('[combo-lecture] 묶음 연출 오류', e); return Promise.resolve(); }
    };
    // est: 묶음이 최소로 걸리는 시간(연출 시작 기준 — 아래 run이 기다리는 문구 간격·구성 단계 ms의 합). 진행 바 칸 길이(durs)를 이 값보다 짧게 잡지 않음(register) —
    //  손으로 적은 ms가 이보다 짧으면 마커가 칸 끝에 먼저 닿아 멈춰 있던 문제(2026-11-15, 노드1~6 전수 측정)
    const part = function (s) { return Math.max(capMsOf(s) - CAPTION_LEAD_MS, s.ms || 0); };
    let est = part(first);
    list.slice(1).forEach(function (s) { est += AUTO_GAP_MS + CAPTION_LEAD_MS + part(s); });
    return {
      text: first.text, seq: first.seq, enter: first.enter, scene: first.scene, gap: first.gap, failsafe: STEP_FAILSAFE_MS * list.length, est: est,
      run: function () {
        let p = Promise.all([guarded(first), wait(Math.max(0, capMsOf(first) - CAPTION_LEAD_MS)), wait(first.ms || 0)]);   // ms: 소리 꼬리까지(연출 시작 기준)
        list.slice(1).forEach(function (s) {
          p = p.then(function () { return wait(AUTO_GAP_MS); })
            .then(function () {
              clearDelays();
              showCaption(s.text, s.seq);
              applyScene(s.scene);
              if (s.enter) { try { s.enter(); } catch (e) { console.error('[combo-lecture] 묶음 enter 오류', e); } }
              return wait(CAPTION_LEAD_MS);
            })
            .then(function () { return Promise.all([guarded(s), wait(Math.max(0, capMsOf(s) - CAPTION_LEAD_MS)), wait(s.ms || 0)]); });
        });
        return p;
      },
    };
  }


  // 문구는 여유 있게(읽는 시간·단계 사이 간격·페이드를 길게), 연출 자체(등장·전환·교체·회전)는 처음 속도 그대로 빠르게 — 이징은 시작이 빠르고 끝이 부드럽게 멈추는 곡선 위주
  const OPEN_DELAY_MS = 800;    // 본문이 올라온 뒤 첫 단계 시작까지
  const NEXT_BUFFER_MS = 100;   // 연출이 실제로 끝난 뒤 이만큼 있다가 "다음" 활성화 (style-guide §18)
  const AUTO_GAP_MS = 400;      // 묶음 안에서 앞 단계가 끝난 뒤 다음 단계가 자동으로 시작되기까지의 간격
  const CAPTION_LEAD_MS = 1000; // 문구가 뜬 뒤 연출·소리가 시작되기까지(문구 페이드 0.5초 + 읽는 시간 0.5초)
  const MIN_STEP_MS = 2000;     // 단계가 시작된 뒤 최소 이만큼은 지나야 "다음" 활성화 — 연출이 짧은 단계도 읽을 시간 확보
  const CAPTION_GAP_MIN_MS = 2000; // (2026-10-30 3초 → 4초, 2026-11-20 글자 수 비례 도입과 함께 3초 → 2초 — 아래 captionGapMs) 문구가 뜬 뒤 같은 묶음의 다음 문구가 뜨기까지 최소 간격(문구가 있는 단계에만) — 이보다 짧게 이어지지 않음. 새 강의·새 단계에도 자동 적용, 문구가 너무 빠르면 이 값만 키울 것. 묶음 끝의 "다음" 활성화도 이 시간 뒤
  // 문구 간격 = 글자 수에 비례(하한은 CAPTION_GAP_MIN_MS 2초, 상한 6초) — 6자 이하만 2초, 7자부터는 글자 수에 비례(10자 2.5초, 20자 4초, 30자 5.5초, 상한 6초). 태그·공백 제외. 단계에 gap이 있으면 gap이 우선(2026-11-20)
  const CAPTION_GAP_BASE_MS = 1000, CAPTION_GAP_PER_CHAR_MS = 120, CAPTION_GAP_MAX_MS = 6000;
  function captionGapMs(text) {
    const n = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;
    return Math.min(CAPTION_GAP_MAX_MS, Math.max(CAPTION_GAP_MIN_MS, CAPTION_GAP_BASE_MS + n * CAPTION_GAP_PER_CHAR_MS));
  }
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
  const L = { open: false, ch: 0, step: -1, group: -1, gen: 0, ready: false, watch: null, tok: 0, timers: [], pend: new Map(), rewatch: false, skipping: false, draining: false, vnow: 0, vid: 0, anims: [], sounded: false, pianoUsed: false, trimmed: false, resetTimer: null, heard: -1, seeking: false, pbarJump: false, autoNext: false, paused: false, fs: new Set(), pausedAnims: [] };   // paused/fs/pausedAnims: 앱 전환(백그라운드) 일시정지 — 아래 pauseLecture / heard: 진행 바 — 이 챕터에서 끝까지 들은 마지막 단계 / seeking: 진행 바로 다른 단계로 가는 중(앞 단계를 빨리 돌리는 동안)

  // 동요에서 줄였던 기타 출력을 되돌림 — 소리가 짧은 페이드로 끊긴 뒤에(그 사이 갑자기 커지지 않게). 하드컷(panic)은 스스로 되돌림
  function releaseTrim(hard) {
    if (!L.trimmed) return;
    L.trimmed = false;
    if (hard) return;
    setTimeout(function () { if (typeof GuitarAudio !== 'undefined' && !L.trimmed) GuitarAudio.setOutputTrim(1); }, 150);
  }

  function $(id) { return document.getElementById(id); }
  function setTopbarLec(on) { const t = document.querySelector('.jl-topbar'); if (t) t.classList.toggle('is-lec', on); }   // 강의 중엔 탑바 피크 숨김(자리는 유지 — 리하모니와 같음)
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
    const rec = { fn: fn, tok: tok };
    if (L.paused) {   // 일시정지 중에 생긴 예약(소리 준비 완료 등 비동기로 도착) — 실제 타이머 없이 남은 시간만 들고 있다가 복귀 때 시작
      rec.id = --L.vid; rec.at = Date.now() + ms; rec.left = ms;
      L.pend.set(rec.id, rec);
      return rec.id;
    }
    return armLater(rec, ms);
  }
  // 예약 하나를 실제 타이머로 걸기 — later()와 일시정지 복귀(resumeLecture)가 같이 씀
  function armLater(rec, ms) {
    rec.at = Date.now() + ms;
    const id = setTimeout(function () { L.pend.delete(id); if (rec.tok === L.tok) rec.fn(); }, ms);
    rec.id = id;
    L.pend.set(id, rec);
    L.timers.push(id);
    return id;
  }
  function wait(ms) { return new Promise(function (res) { later(res, ms); }); }
  // 연출이 안 끝날 때를 대비한 안전 타이머 — 건너뛰기(skipGroup)가 예약 콜백을 한꺼번에 실행할 때 이것까지 실행하면 연출이 끝나기 전에 "끝났다"고 판단하므로 later()를 거치지 않음
  // 일시정지 때 같이 멈춰야 해서(백그라운드 동안 혼자 흘러가면 연출이 덜 끝났는데 단계가 끝남) 목록(L.fs)에 모아 둠
  function failsafe(ms) { return new Promise(function (res) { armFailsafe({ res: res }, ms); }); }
  function armFailsafe(r, ms) {
    r.at = Date.now() + ms;
    L.fs.add(r);
    if (L.paused) { r.left = ms; return; }
    r.id = setTimeout(function () { L.fs.delete(r); r.res(); }, ms);
    L.timers.push(r.id);
  }
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
    else if (L.paused) { try { a.pause(); } catch (e) {} L.pausedAnims.push(a); }   // 일시정지 중에 생긴 애니메이션도 멈춘 채로 두었다가 복귀 때 재생
    return a;
  }

  // ── 소리 ──
  function audioT0() { return Tone.now() + AUDIO_LEAD_S; }
  function strum(midis, t, dur, rel, mode, iv) {   // mode: 'weak'이면 약한 세기(벨로시티 0.4~0.72, 기본은 0.45~1.0) / iv: 줄 사이 간격(초, 없으면 0.012 — D11 칼립소는 코드반주 훈련 값 0.005)
    if (L.skipping) return;
    L.sounded = true;
    GuitarAudio.strumAt(midis, iv == null ? 0.012 : iv, t, dur, rel, mode);
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
  // 장면 전환 — 노드가 def.layers(무대 층 id 목록)를 주고 칸·묶음 구성 단계에 scene(장면 열쇠)을 적으면,
  //  엔진이 그 칸이 시작될 때(문구가 뜨는 순간, enter보다 먼저) 장면 열쇠가 바뀐 경우 켜진 층을 전부 끈다 → 이전 화면이 새 문구와 같은 시점에 사라지고,
  //  새 화면은 노드가 run에서 그려 켠다. 같은 열쇠면 아무것도 안 함. scene을 안 쓰는 노드(D1·D2)는 영향 없음.
  //  열쇠는 '층id' 또는 '층id:내용'(같은 층 안에서 내용이 통째로 바뀌는 경우 — 예 'n3-lone:E' → 'n3-lone:A')
  function applyScene(sc) {
    const lec = LECTURES[L.ch];
    if (!sc || !lec || !lec.layers || sc === L.scene) return;
    L.scene = sc;
    lec.layers.forEach(function (id) { const el = $(id); if (el) el.classList.remove('is-on'); });
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
  function hot() {}   // 원본 1장 부품(코드 열 강조) — advance()가 부름. 여정 강의엔 없음

  const LECTURES = {};   // 노드 id → def (register로 채움)

  // ── 진행 ──
  // "다음" 버튼 상태는 활성/비활성 둘뿐이고, 그 기준은 L.ready 하나. aria-disabled도 같이 맞춰 CSS가 :hover·:focus와 상관없이 비활성 모양을 고정함
  function setNext(disabled, label) {
    const btn = $('combo-v2-lec-next');
    L.ready = !disabled;
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (label) $('combo-v2-lec-next-label').textContent = label;
    pbarNav();
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
    // 번역: 문구를 통째로(강조 span·줄바꿈 포함) 사전에서 찾음 — DOM에 넣은 뒤 조각별로 바뀌면 어순이 깨지므로(locales/<언어>/journey.js)
    if (typeof I18N !== 'undefined' && I18N.t) text = I18N.t(text);
    const html = seq ? text.split('\n').map(function (ln, k) { return k ? '<span class="lec-ln" style="animation-delay:' + (k * LINE_MS) + 'ms">' + ln + '</span>' : ln; }).join('\n') : text;
    // 캡션 박스(.test-question-text)는 display:flex라 안에 글자·span이 섞이면 각각 가로로 나란한 칸이 되어 문장이 끊김 → 전체를 span 하나(.lec-cap)로 감싸 한 덩어리로
    qEl.innerHTML = '<span class="lec-cap">' + html + '</span>';
    qEl.classList.remove('test-question--in');
    void qEl.offsetWidth;
    qEl.classList.add('test-question--in');
  }
  // 칸의 문구 최소 시간 — 한 줄씩 뜨는 문구(seq)는 마지막 줄이 다 뜬 뒤에야 다음으로 / gap: 여정 추가(단계별 문구 간격) /
  //  문구가 있는 단계는 다음 문구(자동 진행 간격 AUTO_GAP_MS 뒤)가 최소 CAPTION_GAP_MIN_MS 뒤에 뜨도록. goGroup과 진행 바 칸 길이(register)가 같이 씀
  function stepCapMs(st) {
    const capBase = st.seq ? Math.max(MIN_STEP_MS, (st.text.split('\n').length - 1) * LINE_MS + 700) : MIN_STEP_MS;
    return st.gap != null ? st.gap - AUTO_GAP_MS : (st.text ? Math.max(capBase, captionGapMs(st.text) - AUTO_GAP_MS) : capBase);
  }
  // 한 묶음 재생 — (진행 바 챕터는 단계마다 멈춤: 단계가 끝나면 마커가 그 칸 끝에 멈추고 "다음"이 켜지며, 눌러야 다음 단계가 재생됨. 아래 설명은 옛 방식(진행 바 없는 챕터) 기준)
  // 묶음 안 단계를 차례로 자동 진행하고, 마지막 단계가 끝나야 "다음"(마지막 묶음은 "완료")이 켜짐.
  // 각 단계는 캡션과 연출·소리를 동시에 시작(본체는 연출)하며, 다음 단계(또는 버튼 활성화)로 넘어가는 조건 3가지가 모두 맞아야 함:
  //  ① 연출이 실제로 끝남(run()이 돌려준 약속 — 실패하거나 20초 넘게 안 끝나면 포기하고 진행)  ② 단계 시작 후 최소 2초 경과  ③ 연출이 끝난 뒤 짧은 간격
  // 캡션 페이드(0.5s)는 ②보다 짧아서 따로 기다리지 않음(animationend에 의존하면 이벤트를 놓쳤을 때 영영 안 켜짐)
  // k0: 묶음 안 몇 번째 단계부터(진행 바로 중간 단계에 들어올 때 — seek가 앞 단계 화면을 미리 만들어 둠). 없으면 처음부터
  // cont: 같은 묶음(페이즈) 안에서 다음 단계로 이어갈 때 — 칸·게이지를 다시 그리지 않음(진행 바 챕터는 단계마다 멈추고 "다음"을 눌러야 이어짐)
  function goGroup(g, k0, cont) {
    const tok = L.tok, lec = LECTURES[L.ch], ids = lec.groups[g];
    const gen = ++L.gen;   // 이 묶음의 번호 — 아래 모든 콜백이 확인함
    L.autoNext = false;
    L.group = g;
    L.skipping = false;
    $('combo-v2-lec-stage').classList.remove('is-skip');
    if (L.phaseStart) $('combo-v2-lec-stage').classList.add('is-skip');   // 페이즈 첫 칸: 이 칸의 enter(앞 장면 치우기)가 서서히가 아니라 즉시 적용되게 — 복원한 장면이 서서히 나타나는 동안 옛 장면이 같이 사라지며 비치지 않음
    setNext(true, !hasPbar() && g === lec.groups.length - 1 ? '완료' : '다음');   // 묶음이 시작되면 무조건 비활성(진행 바 챕터는 단계가 끝날 때 아래에서 라벨을 정함)
    startWatch();
    if (hasPbar() && !cont) pbarBuild();
    (function playAt(k) {
      if (tok !== L.tok || gen !== L.gen) return;
      endSkip();   // 건너뛰기는 지금 단계 하나만 — 앞 단계의 남은 예약을 모두 실행한 뒤 해제, 다음 단계는 평소 속도로
      const i = ids[k];
      L.step = i;
      if (hasPbar()) {   // 게이지는 이 칸의 끝까지 단계 길이(durs) 동안 일정 속도로 참. 묶음 안에서 이어지는 단계는 지금 위치에서 그대로 이어서(세로선에서 멈칫하지 않게),
        const r = segRange(i);   // 묶음의 첫 단계·건너뛴 직후만 칸 시작으로 바로 맞춤
        if (k === (k0 || 0) || L.pbarJump) { pbarSet(r[0], 0); L.pbarJump = false; }
        pbarDivs(r[0]);
        pbarSet(r[1], lec.durs[i]);
        pbarNav();
      }
      showCaption(lec.steps[i].text, lec.steps[i].seq);
      const capMs = stepCapMs(lec.steps[i]);   // 문구 최소 시간(위 stepCapMs — 진행 바 칸 길이와 같은 식)
      applyScene(lec.steps[i].scene);   // 장면이 바뀌는 칸이면 이전 층을 문구와 같은 시점에 끔(enter보다 먼저)
      if (lec.steps[i].enter) { try { lec.steps[i].enter(); } catch (e) { console.error('[combo-lecture] step ' + (i + 1) + ' enter 오류', e); } }   // 문구와 동시에 하는 일(앞 장면 치우기) — 연출 run()은 문구 선행 시간(CAPTION_LEAD_MS) 뒤에 시작해서 그동안 앞 장면이 남아 보임
      if (L.phaseStart) { L.phaseStart = false; void $('combo-v2-lec-stage').offsetWidth; $('combo-v2-lec-stage').classList.remove('is-skip'); }   // 즉시 적용된 enter 결과를 확정한 뒤 전환을 다시 켬
      // 연출이 오류로 중간에 끝나도 "다음"이 일찍 켜지지 않도록: 오류는 콘솔에 남기고(원인 추적용), 묶음의 마지막 단계는 위 ms(소리 꼬리 포함)도 지나야 함
      // 항상 문구가 먼저: 문구를 띄우고 CAPTION_LEAD_MS(페이드 + 읽는 시간)가 지난 뒤에 연출·소리를 시작 — 동시에 시작하면 눈이 문구와 연출 둘 다 못 따라감
      const run = wait(CAPTION_LEAD_MS).then(function () {
        try { return Promise.resolve(lec.steps[i].run()).catch(function (e) { console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }); }
        catch (e) { console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }
      });
      const floor = (hasPbar() || k === ids.length - 1) ? (lec.steps[i].ms || 0) + CAPTION_LEAD_MS : 0;   // ms는 연출 시작 기준이라 문구 선행 시간만큼 더함. 진행 바 챕터는 모든 단계가 멈춤 지점이라 단계마다 소리 꼬리까지 기다림
      Promise.all([Promise.race([run, failsafe(lec.steps[i].failsafe || STEP_FAILSAFE_MS)]), wait(capMs), wait(floor)]).then(function () {   // chainSteps로 합친 단계는 구성 단계 수만큼 안전 시간을 늘림
        if (tok !== L.tok || gen !== L.gen || L.step !== i) return;
        if (hasPbar()) {   // 단계가 끝나면 마커를 이 칸의 끝(세로선)에 멈춤(예측 길이와 달라도 맞춤) + 끝까지 들은 단계로 기록
          const end = segRange(i)[1];
          pbarFreeze(); pbarSet(end, L.skipping ? 0 : 200); pbarDivs(end);   // > 로 건너뛰었으면 다른 이동처럼 한 번에, 평소엔 남은 틈만 짧게
          if (i > L.heard) { L.heard = i; heardSave(L.ch, i); }
          pbarNav();
        }
        //  노드 단계의 settle(선택): 단계가 끝나 마커가 멈춘 순간 한 번 부름 — '다시보기' 같은 멈춤 상태 전용 부품을 이때만 띄움(노드 4 코드 전환). 빨리 돌리는 중엔 부르지 않음. 칸이 바뀌면 노드 onCut이 치움
        if (!L.skipping && lec.steps[i].settle) { try { lec.steps[i].settle(); } catch (e) { console.error('[journey-lesson] settle 오류', e); } }
        if (!hasPbar() && k < ids.length - 1) later(function () { clearDelays(); playAt(k + 1); }, AUTO_GAP_MS);   // 옛 방식(진행 바 없는 챕터): 묶음 안은 자동으로 다음 단계
        else later(function () { if (gen === L.gen) { endSkip(); setNext(false, g === lec.groups.length - 1 && k === ids.length - 1 ? '완료' : '다음'); if (L.autoNext) { L.autoNext = false; advance(); } } }, NEXT_BUFFER_MS);              // 멈춤 지점: 버튼 활성화(이 묶음 번호일 때만). 건너뛰기로 끝났으면 건너뛰기 상태도 여기서 풀어 둠
      });
    })(k0 || 0);
  }

  // ── 진행 바(LECTURES[n].durs가 있는 챕터만 — 지금은 1~7장. 섹션에 .is-pbar가 붙어 "다음" 버튼 대신 보임) ──
  // 바 하나 = 지금 페이즈(묶음) 하나. 설명묶음(단계)마다 칸을 나누고, 칸 길이는 그 단계의 실제 길이(durs) 비율.
  // 멈춤: 모든 단계가 멈춤 지점 — 단계가 끝나면 마커가 그 칸 끝(세로선)에 멈추고 다음 버튼이 켜진다. 눌러야 다음 단계가 재생됨(자동으로 이어지지 않음).
  // 다음 버튼: 처음 듣는 단계는 끝나야 켜짐(안 들은 단계를 건너뛸 수 없음) / 이미 들은 단계로 돌아가면 재생 중에도 항상 켜짐 / 수강 완료한 강의는 처음부터 항상 켜짐.
  //   다음 버튼 = "다음 단계를 재생"하는 트리거 하나(들었든 안 들었든 같음): 멈춘 상태에서 누르면 다음 단계(페이즈 끝이면 다음 페이즈, 마지막 단계면 완료), 들은 단계를 재생 중에 누르면 지금 단계를 즉시 끝내고 곧바로 다음 단계.
  // 이동: 칸 터치 = 그 단계 처음부터 / 다음 = 위와 같음 / < = 칸이 끝나 마커가 멈춘 상태면 지금 칸을 처음부터 다시, 재생 중이면 이전 단계 처음부터(페이즈 첫 단계면 이전 페이즈를 다 들은 상태 — 마커 끝, 다음 대기).
  // 처음 듣는 강의는 끝까지 들은 단계(heard)의 바로 다음까지만 갈 수 있고, 수강 완료한 강의(rewatch)는 어디든.
  // heard는 이 기기에만 저장(localStorage) — 지워져도 복구하지 않음(수강 완료 여부만 진행도 객체 _lec에 기록). 다시 열면 늘 처음부터 재생
  const HEARD_KEY = 'jnyLessonHeard';   // 노드 id별로 끝까지 들은 마지막 단계
  function heardLoad(n) {
    try { const o = JSON.parse(localStorage.getItem(HEARD_KEY) || '{}'); return typeof o[n] === 'number' ? o[n] : -1; } catch (e) { return -1; }
  }
  function heardSave(n, i) {
    try { const o = JSON.parse(localStorage.getItem(HEARD_KEY) || '{}'); if (!(o[n] >= i)) { o[n] = i; localStorage.setItem(HEARD_KEY, JSON.stringify(o)); } } catch (e) {}
  }
  // 여정 추가: 사용자 입력을 기다리는 단계(lock: true — 직접 눌러 보기)는 건너뛸 수 없음. 정답을 눌러 단계가 끝나야 "다음"이 켜짐
  function stepLocked() { const st = LECTURES[L.ch] && LECTURES[L.ch].steps[L.step]; return !!(st && st.lock); }
  function hasPbar() { return !!(LECTURES[L.ch] && LECTURES[L.ch].durs); }
  function canReach(i) { return L.rewatch || i <= L.heard + 1; }
  // 지금 페이즈 안에서 단계 i 칸의 [시작, 끝] 비율(0~1)
  function segRange(i) {
    const lec = LECTURES[L.ch], ids = lec.groups[L.group];
    let tot = 0, a = 0;
    ids.forEach(function (s) { tot += lec.durs[s]; if (s < i) a += lec.durs[s]; });
    return [a / tot, (a + lec.durs[i]) / tot];
  }
  // 게이지·마커를 비율 f까지 — ms 동안 일정 속도로, 0이면 즉시. 둘 다 transform만 바꿈(GPU 합성 — 레이아웃 계산 없음, CSS .lec-pbar-fill/.lec-pbar-rail)
  function pbarSet(f, ms) {
    const fill = $('lec-pbar-fill'), rail = $('lec-pbar-rail'), tr = ms ? 'transform ' + ms + 'ms linear' : 'none';
    fill.style.transition = tr;
    rail.style.transition = tr;
    fill.style.transform = 'scaleX(' + f + ')';
    rail.style.transform = 'translateX(' + (f * 100) + '%)';
    if (!ms) void fill.offsetWidth;   // 즉시 이동을 확정해 둬야 바로 뒤의 채움 전환이 여기서부터 시작됨
  }
  // 게이지·마커를 지금 보이는 위치에 고정 — 이미 100%로 차는 중에 "0.2초 안에 100%"로 다시 지정하면 목표값이 같아서 브라우저가 진행 중인 느린 전환을 그대로 이어감
  // (>로 마지막 단계를 끝냈는데 게이지만 천천히 차던 버그). 먼저 지금 위치로 고정한 뒤 다시 채워야 새 속도가 적용됨
  function pbarFreeze() {
    const fill = $('lec-pbar-fill'), tw = $('lec-pbar-track').getBoundingClientRect().width;
    pbarSet(tw ? fill.getBoundingClientRect().width / tw : 0, 0);
  }
  // 지금 페이즈의 칸(경계 세로선 + 터치 영역)을 새로 그림
  function pbarBuild() {
    const ids = LECTURES[L.ch].groups[L.group];
    let html = '';
    ids.forEach(function (s, k) {
      const r = segRange(s);
      if (k > 0) html += '<span class="lec-pbar-div" data-f="' + r[0] + '" style="left:' + (r[0] * 100) + '%"></span>';
      html += '<button type="button" class="lec-pbar-seg" data-step="' + s + '" aria-label="' + (s + 1) + '번째 설명부터" style="left:' + (r[0] * 100) + '%;width:' + ((r[1] - r[0]) * 100) + '%"></button>';
    });
    $('lec-pbar-segs').innerHTML = html;
    pbarSet(0, 0);
  }
  // 경계 세로선 색 — 게이지가 f까지 찼으면 그 안쪽 선은 흰색(.is-on), 아직 안 찬 선은 진한 회색
  function pbarDivs(f) {
    document.querySelectorAll('#lec-pbar-segs .lec-pbar-div').forEach(function (d) { d.classList.toggle('is-on', +d.dataset.f <= f + 1e-9); });
  }
  // 화살표 활성 — <: 맨 첫 단계가 아니면 / >: 페이즈가 끝났거나(다음 페이즈·완료), 지금 단계를 끝내도 되는 경우(수강 완료 또는 이미 끝까지 들은 단계)
  function isLastCell() { const gs = LECTURES[L.ch].groups; return L.group === gs.length - 1 && L.step === gs[L.group][gs[L.group].length - 1]; }   // 마지막 페이즈의 마지막 칸
  function pbarNav() {
    if (!hasPbar()) return;
    const busy = !L.open || L.seeking || L.group < 0;
    $('lec-pbar-prev').disabled = busy || (L.step <= 0 && !L.ready);   // 첫 칸은 재생 중엔 갈 곳이 없지만, 끝나 멈춘 뒤엔 "처음부터 다시"가 됨
    $('lec-pbar-next').disabled = busy || !(L.ready || ((L.rewatch || L.step <= L.heard) && !stepLocked()));   // lock 단계(직접 눌러 보기)는 들은 적이 있어도 끝나기 전엔 잠금
    // 마지막 페이즈의 마지막 칸이 끝나 멈춘 상태면 버튼이 "완료"(누르면 수강 완료) — 그 외엔 "다음"
    $('lec-pbar-next').textContent = !busy && L.ready && isLastCell() ? (LECTURES[L.ch].doneLabel || '완료') : '다음';   // doneLabel: 여정 추가(노드가 마지막 버튼 이름을 정함 — 예: '퀴즈 시작!')
  }
  // 실행 중인 것만 즉시 중단(강의는 열린 채) — 타이머·애니메이션 취소, 소리 하드컷. 세대 번호를 올려 늦게 도착하는 콜백을 막음
  function halt() {
    L.tok++;
    L.gen++;
    L.phaseStart = false;
    L.ready = false;
    L.autoNext = false;
    L.timers.forEach(clearTimeout);
    L.timers = [];
    L.fs.clear();
    L.pend.clear();
    L.skipping = false;
    L.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    L.anims = [];
    if (typeof GuitarAudio !== 'undefined') {
      if (L.sounded) GuitarAudio.panic();
      if (L.pianoUsed) GuitarAudio.resetPiano();
    }
    releaseTrim(true);
    L.sounded = false;
    L.pianoUsed = false;
    nodeCut();
  }
  // 노드가 엔진 밖에서 따로 돌리는 소리(D15 자유 연주 반주 — BackingTrack의 드럼·베이스·피아노, 자체 타이머)를 엔진의 하드컷 지점에서 같이 끊음.
  //  노드 register의 onCut(멱등이어야 함). 하드컷 지점 = 칸 이동(advance)·이동/다시 시작(halt)·건너뛰기(skipGroup)·닫기/이탈(close). 앱 전환 일시정지는 오디오 시계가 멈춰 함께 멈춤(lecAudioClock)
  function nodeCut() {
    const lec = LECTURES[L.ch];
    if (lec && lec.onCut) { try { lec.onCut(); } catch (e) { console.error('[journey-lesson] onCut 오류', e); } }
  }
  // 단계 target의 처음으로 이동 — 무대를 새로 만들고, 앞 단계들은 건너뛰기 방식(기다림 없음·애니메이션 길이 0·소리 없음)으로 순식간에 실행해
  // target 직전의 화면을 만든 뒤, target부터 평소처럼 재생. 앞 단계는 모두 마이크로태스크로 끝나서 중간 화면이 그려지지 않음.
  // done: target(페이즈의 마지막 단계)까지 빨리 돌려 그 페이즈를 다 들은 상태로 멈춤 — 게이지 100%, > 를 기다림(이전 페이즈로 돌아갈 때)
  async function seek(target, done, fresh) {
    if (!L.open || L.seeking || !canReach(target)) return;
    const lec = LECTURES[L.ch], stage = $('combo-v2-lec-stage');
    let g = 0, k = 0;
    lec.groups.forEach(function (ids, gi) { const j = ids.indexOf(target); if (j >= 0) { g = gi; k = j; } });
    if (!fresh) phaseFadeCancel();   // fresh(페이즈를 넘어가는 중)면 무대를 숨긴 채 다시 만들고 아래에서 서서히 나타냄
    halt();
    const tok = L.tok;
    L.seeking = true;
    pbarNav();
    stage.innerHTML = '';
    stage.classList.remove('is-ch2', 'is-ch3', 'is-ch4', 'is-ch5', 'is-ch6', 'is-ch7', 'is-ch8', 'is-ch9');
    buildFor(L.ch);
    L.skipping = true;
    L.vnow = Date.now();
    stage.classList.add('is-skip');
    for (let i = 0; i < target + (done ? 1 : 0) && tok === L.tok; i++) {
      L.step = i;
      const st = lec.steps[i];
      if (done && i === target) showCaption(st.text, st.seq);   // 멈춰 있을 화면의 문구(연출 중 문구를 바꾸는 단계면 아래 run이 덮어씀)
      applyScene(st.scene);
      if (st.enter) { try { st.enter(); } catch (e) { console.error('[combo-lecture] step ' + (i + 1) + ' enter 오류', e); } }
      let p;
      try { p = Promise.resolve(st.run()); } catch (e) { p = Promise.resolve(); console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }
      await Promise.race([p.catch(function (e) { console.error('[combo-lecture] step ' + (i + 1) + ' 연출 오류', e); }), failsafe(st.failsafe || STEP_FAILSAFE_MS)]);
      if (!(done && i === target)) {   // 묶음 단계(chainSteps)는 연출 안에서 자기 뒤 문구를 띄움 — 빨리 돌리는 동안 그 문구가 남아 보이지 않게 비움(1장 동요 단계는 피아노 음색을 처음 받는 동안 실제로 기다려서 앞 페이즈 문구가 화면에 비쳤음)
        const qEl = $('combo-v2-lec-text');
        qEl.classList.remove('test-question--in');
        qEl.textContent = '';
      }
    }
    L.seeking = false;
    if (tok !== L.tok) return;   // 빨리 돌리는 사이 닫힘·다른 이동
    endSkip();
    clearDelays();
    if (fresh) {
      if (lec.steps[target] && (lec.steps[target].enter || lec.steps[target].scene)) L.phaseStart = true;   // 첫 칸이 앞 장면을 치우는 칸이면 복원한 장면은 즉시 사라짐(위 goGroup) — 만들어 올릴 것이 없음
      else phaseBuild(stage);                                                   // 아니면 복원한 장면을 요소마다 차례로 새로 만들어 올림
      phaseFadeIn();
    }
    // 이전·진행 바 이동으로 다시 시작하는 칸도 페이즈 첫 칸과 같이 이 칸의 enter·장면 치우기를 즉시 적용 — 앞 칸 끝 화면이 잠깐 보였다가 서서히 사라지는 잔상 방지(사용자 지적 2026-11-20).
    //  enter에서 애니메이션을 시작하는 칸은 later(…, 0)로 미뤄야 함(즉시 적용 뒤 전환이 다시 켜진 다음에 시작 — 노드1 칸 3)
    if (!done) { if (!fresh && lec.steps[target] && (lec.steps[target].enter || lec.steps[target].scene)) L.phaseStart = true; goGroup(g, k); return; }
    L.group = g;
    L.step = target;
    pbarBuild();
    pbarSet(1, 0);
    pbarDivs(1);
    setNext(false, g === lec.groups.length - 1 ? '완료' : '다음');   // 페이즈 끝 상태 — > 로 다음 페이즈
    if (lec.steps[target] && lec.steps[target].settle) { try { lec.steps[target].settle(); } catch (e) { console.error('[journey-lesson] settle 오류', e); } }   // 마커가 멈춘 상태이므로 settle 부품도 띄움
  }
  // 묶음이 끝난 뒤 다음 묶음으로("다음" 버튼·진행 바 > 공용). 마지막 묶음이면 완료
  function advance() {
    setNext(true);   // 누르는 즉시 비활성 — 다음 묶음이 끝날 때까지 다시 켜질 수 없음
    const lec = LECTURES[L.ch], ids = lec.groups[L.group], k = ids.indexOf(L.step), lastStep = k < 0 || k >= ids.length - 1;
    if (lastStep && L.group >= lec.groups.length - 1) { finish(); return; }   // 마지막 페이즈의 마지막 단계에서 → 완료
    // 울리던 소리(기타 울림·꼬리·예약된 음, 피아노)는 하드컷하고 진행 — 칸이 바뀌는 건 맥락 전환(CLAUDE.md 0-7, 사용자 지정 2026-11-15. 예전엔 짧은 페이드)
    if (L.sounded) GuitarAudio.panic();
    if (L.pianoUsed) GuitarAudio.resetPiano();
    nodeCut();
    releaseTrim(true);   // panic이 출력 트림을 스스로 되돌림
    L.timers.forEach(clearTimeout);
    L.timers = [];
    L.fs.clear();
    L.pend.clear();
    clearDelays();
    hot(-1);
    if (hasPbar() && !lastStep) goGroup(L.group, k + 1, true);   // 진행 바 챕터: 같은 페이즈의 다음 단계(단계마다 멈추므로 "다음"을 눌러야 이어짐)
    else if (hasPbar()) crossPhase(lec.groups[L.group + 1][0]);   // 페이즈를 넘어감 — 백지에서 새로 시작(아래 규칙)
    else goGroup(L.group + 1);
  }
  // 전역 규칙 — 페이즈를 넘어갈 때는 반드시 직전 페이즈의 화면·문구 없이 백지에서 시작한다. 앞 페이즈의 장면을 그대로 쓰는 단계라도 이어 붙이지 않고 새로 생성한다.
  //  페이즈가 끝나 멈춘 동안은 화면을 그대로 두고, "다음"을 누르는 순간 애니메이션 없이 즉시 무대와 문구를 모두 비워 완전히 빈 화면을 PHASE_BLANK_MS 동안 보여 준 뒤
  //  → 무대 DOM을 새로 만들어 앞 단계를 빨리 돌려 이 페이즈의 시작 장면을 복원(seek와 같은 방법 — 타이머·클래스·인라인 스타일 등 직전 연출의 찌꺼기가 남지 않음)하고 첫 문구·연출을 시작.
  //  복원한 장면은 문구가 뜨는 것과 같이(FADE_MS) 서서히 나타남 — 앞 페이즈에서 이어 쓰는 요소가 갑자기 튀어나오지 않게(사용자 지적). 페이즈 안에서 칸을 넘길 때는 해당 없음.
  const PHASE_BLANK_MS = 200;
  function phaseFadeCancel() {
    if (L.phaseFade) { try { L.phaseFade.cancel(); } catch (e) {} L.phaseFade = null; }
  }
  function phaseFadeIn() {   // 숨겨 둔 무대를 서서히 나타냄 — 새 애니메이션(투명→불투명)을 먼저 만든 뒤 숨김 유지용 애니메이션을 걷어 번쩍임 없음
    const a = $('combo-v2-lec-stage').animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: EASE_OUT });
    phaseFadeCancel();
    L.phaseFade = a;
    a.onfinish = function () { if (L.phaseFade === a) L.phaseFade = null; };
  }
  // 복원한 장면을 "새로 만들어 올림" — 보이는 요소(.is-in 요소, 켜진 층 .is-on)를 전환 없이 먼저 모두 끈 뒤, 문서 순서(왼쪽 열부터·위에서 아래로)대로 하나씩 차례로 켬.
  // 클래스는 같은 순간에 모두 원래대로 돌려놓고 켜지는 시점만 transition-delay로 늦춤(fx와 같은 방식) → 빨리 돌리기·건너뛰기에서 화면 상태가 그대로이고, 문구(0.5초 페이드)와 같이
  // 올라와 첫 연출(문구 1초 뒤)이 시작되기 전에 끝남: 요소 사이 간격은 총 PHASE_BUILD_MS 안에 들어가게 줄임
  const PHASE_BUILD_MS = 400;
  function phaseBuild(stage) {
    const items = [];
    Array.prototype.forEach.call(stage.querySelectorAll('*'), function (el) {
      ['is-in', 'is-on'].forEach(function (c) { if (el.classList.contains(c)) items.push([el, c]); });
    });
    if (!items.length) return;
    stage.classList.add('is-skip');                                   // 끄는 것은 전환 없이 즉시
    items.forEach(function (it) { it[0].classList.remove(it[1]); });
    void stage.offsetWidth;                                           // 꺼진 상태를 확정해야 아래에서 켤 때 0부터 올라옴
    stage.classList.remove('is-skip');
    const step = items.length > 1 ? Math.min(45, Math.floor(PHASE_BUILD_MS / (items.length - 1))) : 0;
    items.forEach(function (it, i) {
      it[0].style.transitionDelay = (i * step) + 'ms';
      it[0].classList.add(it[1]);
    });
    later(function () { clearDelays(); }, (items.length - 1) * step + FADE_MS + 30);
  }
  function crossPhase(target) {
    const qEl = $('combo-v2-lec-text');
    L.seeking = true;   // 빈 화면 동안 진행 바 잠금(곧바로 seek가 이어받음) — 닫히면 close()가 풀어 줌
    qEl.classList.remove('test-question--in');
    qEl.textContent = '';
    $('combo-v2-lec-stage').innerHTML = '';
    phaseFadeCancel();
    L.phaseFade = $('combo-v2-lec-stage').animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1000000, fill: 'forwards' });   // 복원하는 동안 숨김 유지(복원은 한 프레임 안에 끝나지만 중간 모습이 비치지 않게)
    LECTURES[L.ch].groups.forEach(function (ids, gi) { if (ids.indexOf(target) >= 0) L.group = gi; });   // 진행 바도 백지 — 새 페이즈의 칸·게이지 0%로 즉시(이전 페이즈의 100%가 남지 않게)
    pbarBuild();
    pbarDivs(0);
    pbarNav();
    later(function () {
      L.seeking = false;
      seek(target, false, true);
    }, PHASE_BLANK_MS);
  }

  // 화면 초기화(닫힌 뒤) — 다음에 열면 1단계부터
  function resetView() {
    $('combo-v2-lec-stage').innerHTML = '';
    $('combo-v2-lec-stage').classList.remove('is-ch2', 'is-ch3', 'is-ch4', 'is-ch5', 'is-ch6', 'is-ch7', 'is-ch8', 'is-ch9', 'is-skip');
    const qEl = $('combo-v2-lec-text');
    qEl.textContent = '';
    qEl.classList.remove('test-question--in');
    setNext(true, '다음');
    $('lec-pbar-segs').innerHTML = '';
    pbarSet(0, 0);
    $('lec-pbar-prev').disabled = true;
    $('lec-pbar-next').disabled = true;
    $('lec-pbar-next').textContent = '다음';
  }
  // 닫기 — 멱등. hard: 이탈(소리 즉시 절단) / 아니면 정상 종료(마지막 소리는 짧은 페이드)
  function close(hard) {
    L.tok++;
    L.gen++;
    L.phaseStart = false;
    L.ready = false;
    L.autoNext = false;
    clearInterval(L.watch);
    L.watch = null;
    L.timers.forEach(clearTimeout);
    L.timers = [];
    L.fs.clear();
    L.pend.clear();
    L.skipping = false;
    L.seeking = false;   // 빨리 돌리던 중 닫히면 그 루프는 영영 안 끝나므로(예약·안전 타이머가 지워짐) 여기서 풀어 둠 — 안 풀면 다음에 열 때 진행 바가 계속 막힘
    L.rewatch = false;
    L.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    L.anims = [];
    phaseFadeCancel();
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
    nodeCut();
    if (L.paused) lecAudioClock(true);   // 일시정지 중 닫혀도(뒤로가기 확인 등) 멈춰 둔 오디오 시계·상태가 남지 않게
    L.paused = false;
    L.pausedAnims = [];
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
  function abort(via) {
    if (L.open && typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen() && typeof hideLeavePracticeModal === 'function') hideLeavePracticeModal();
    close(true);
  }
  function buildFor(n) {
    const def = LECTURES[n];
    L.scene = null;   // 장면 열쇠(applyScene) — 무대를 새로 만들면 처음으로
    if (def && def.build) def.build($('combo-v2-lec-stage'));
  }

  async function open(n) {
    if (L.open || !LECTURES[n]) return;
    close(true);   // 혹시 남은 상태가 있으면 정리하고 시작
    clearTimeout(L.resetTimer);
    resetView();
    L.open = true;
    L.ch = n;
    setTopbarLec(true);
    L.rewatch = !!LECTURES[n].replay;   // 설명 다시듣기(별을 딴 노드)만 어디든 이동·건너뛰기 가능. 처음 보는 강의는 안 들은 단계를 건너뛸 수 없음
    L.t0 = Date.now();
    L.logRewatch = L.rewatch;   // 분석용 — 열 때 이미 수강 완료한 챕터인지(close가 L.rewatch를 지우므로 따로 보관)
    const tok = L.tok;
    const sec = $('combo-v2-lecture');
    sec.style.setProperty('--lec-fade', FADE_MS + 'ms');
    sec.style.setProperty('--lec-spread', SPREAD_MS + 'ms');
    sec.classList.toggle('is-pbar', hasPbar());
    L.heard = hasPbar() ? heardLoad(n) : -1;
    buildFor(n);
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

  // 이미 수강 완료한 강의에서 화면을 터치하면(진행 바 챕터는 > 화살표 — 이미 끝까지 들은 단계도 허용) 지금 단계의 남은 연출을 바로 끝냄 — 예약된 콜백은 원래 시각 순서대로 기다림 없이 실행,
  // 새로 만드는 애니메이션은 길이 0·CSS 전환은 끔(.is-skip), 소리는 하드컷. 이 단계가 끝나면 다음 단계는 평소 속도(playAt이 해제). 묶음의 마지막 단계면 "다음"이 켜짐
  function skipGroup() {
    if (!L.open || !(L.rewatch || L.step <= L.heard) || stepLocked() || L.skipping || L.ready || L.group < 0 || L.seeking) return false;
    L.skipping = true;
    L.pbarJump = true;   // 진행 바: 다음 단계는 칸 시작으로 바로 맞춤(이어서 차면 건너뛴 몫까지 천천히 채우게 됨)
    L.vnow = Date.now();
    $('combo-v2-lec-stage').classList.add('is-skip');
    // 소리는 하드컷 — 연출이 시작될 때 이미 뒤의 소리까지 예약해 두므로 페이드(stop)로는 예약된 소리가 남음
    if (typeof GuitarAudio !== 'undefined') {
      if (L.sounded) GuitarAudio.panic();
      if (L.pianoUsed) GuitarAudio.resetPiano();
    }
    releaseTrim(true);
    nodeCut();
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
    return true;
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
    // 동요 단계가 시작되기 전에 건너뛰면(또는 seek로 빨리 돌리면) 소리 없이 기타 출력만 줄여 둔 채 끝남 — 하드컷(panic)이 없어 스스로 안 돌아오므로 직접 되돌림
    if (L.trimmed) { L.trimmed = false; if (typeof GuitarAudio !== 'undefined') GuitarAudio.setOutputTrim(1); }
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
        if (!r) { await flush(); if (!L.skipping || tok !== L.tok) break; r = nextRec(); if (!r) break; }   // 기다리는 사이 빨리 돌리기가 끝났으면(seek가 endSkip 후 새 칸을 시작) 그 새 예약(문구 선행 1초 등)을 지금 실행하면 안 됨
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
    if (hasPbar()) return;   // 진행 바 챕터는 화면 터치 건너뛰기 없음(진행 바로 이동)
    skipGroup();
  });
  $('combo-v2-lec-next')?.addEventListener('click', function () {
    const btn = $('combo-v2-lec-next');
    if (!L.open || !L.ready || btn.disabled) return;   // 묶음이 끝나 ready일 때만 눌림(버튼이 어떤 이유로 켜져 있어도 ready가 아니면 무시)
    btn.blur();      // 포커스가 남아 버튼 모양이 활성처럼 보이는 것 방지
    advance();
  });
  // 진행 바 — 이전·다음 버튼과 칸 터치. 막힌 이동(아직 안 들은 단계 등)은 아무 일도 하지 않음. 이전·다음은 실제로 이동할 때 앱 공용 팝사운드(pop.mp3 — 주요 버튼 효과음과 같음)
  // 강의 소리(GuitarAudio)와 별개 경로(WebAudio _playSfx)라 이동 직후의 하드컷(panic)에 안 끊김
  function pbarPop() { try { if (typeof _playSfx === 'function') _playSfx('pop.mp3'); } catch (e) {} }
  $('lec-pbar-prev')?.addEventListener('click', function () {
    if (!hasPbar() || !L.open || L.seeking || L.group < 0 || (L.step <= 0 && !L.ready)) return;
    pbarPop();
    if (L.ready) { seek(L.step); return; }   // 칸이 끝나 마커가 멈춘 상태 → 이전 칸이 아니라 지금 칸을 처음부터 다시
    const gs = LECTURES[L.ch].groups;
    if (L.step === gs[L.group][0]) { const pg = gs[L.group - 1]; seek(pg[pg.length - 1], true); }   // 페이즈 첫 단계 → 이전 페이즈를 다 들은 상태(게이지 100%)로
    else seek(L.step - 1);                                                                          // 페이즈 안 → 이전 단계 처음부터
  });
  $('lec-pbar-next')?.addEventListener('click', function () {
    if (!hasPbar() || !L.open || L.seeking || L.group < 0) return;
    pbarPop();
    // 다음 버튼 = "다음 단계를 재생"하는 트리거 하나(들었든 안 들었든 같음). 멈춘 상태면 바로 다음 단계, 아직 재생 중인 단계(들은 단계·수강 완료)면 지금 단계를 즉시 끝내고 곧바로 다음 단계
    if (L.ready) advance();
    else { L.autoNext = !isLastCell(); if (!skipGroup()) L.autoNext = false; }   // 즉시 끝난 뒤 멈추지 않고 이어감(단계 끝 처리에서 autoNext를 보고 advance). 마지막 칸은 바로 완료하지 않고 끝난 채 멈춰 버튼이 "완료"로 바뀜
  });
  $('lec-pbar-segs')?.addEventListener('click', function (e) {
    const b = e.target.closest && e.target.closest('.lec-pbar-seg');
    if (b && hasPbar()) seek(+b.dataset.step);
  });
  // 탑바 X / Android 뒤로가기(handleComboBack이 부름): 시작·완료 페이지는 바로 닫고, 강의 중이면 확인 모달(그동안 강의는 계속 진행). 처리했으면 true
  // 홈(여정 경로)으로 — 페이지 이동이라 pagehide가 오지만 이미 닫혀 있어 abort는 아무 일도 안 함(멱등)
  function goHome() {
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('project-exit');
    setTimeout(function () { location.href = 'home.html'; }, 260);
  }
  // 마지막 단계의 "완료"(노드가 정한 이름 — 예: '퀴즈 시작!') — 강의를 닫고, 노드에 퀴즈(def.quiz)가 있으면 강의 본문이 내려간 뒤 퀴즈를 시작, 없으면 홈으로
  function finish() {
    const def = LECTURES[L.ch];
    close(true);   // 강의 → 퀴즈·홈 = 맥락 전환 → 하드컷(CLAUDE.md 0-7, 예전엔 페이드)
    // 설명 노드 완료 기록(노드 늘리기 2026-11-24) — 강의를 끝까지 들으면 퀴즈 노드 1이 열림(journey.js jnyLecDone). 다시듣기는 기록할 것 없음
    if (typeof analytics !== 'undefined') analytics.track('journey_lecture_completed', { node_id: L.ch, course_kind: new URLSearchParams(location.search).get('course'), replay: !!(def && def.replay) });
    if (def && !def.replay) { try { const o = JSON.parse(localStorage.getItem('jnyLecDone') || '{}') || {}; if (!o[L.ch]) { o[L.ch] = Date.now(); localStorage.setItem('jnyLecDone', JSON.stringify(o)); } } catch (e) {} }
    if (def && typeof def.onDone === 'function') def.onDone();   // 퀴즈 없는 노드(D11 크로메틱 리듬): 강의를 끝까지 보면 노드 완료 기록
    if (def && typeof def.quiz === 'function') setTimeout(function () { def.quiz(); }, LEC_SLIDE_MS);
    else goHome();
  }
  let quizBack = null;   // 퀴즈 중 X·뒤로가기 처리(노드 퀴즈가 setQuizBack으로 등록, 끝나면 null)
  // 탑바 X / Android 뒤로가기(#back-btn → shared.js handleNativeBack): 강의 중이면 확인 모달(그동안 강의는 계속 진행), 아니면 바로 홈으로
  window.journeyLessonBack = function () {
    if (typeof _playTap === 'function') _playTap();
    if (L.open) {
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;
      showLeavePracticeModal(function () {
        if (typeof analytics !== 'undefined') analytics.track('journey_lecture_left', { node_id: L.ch, course_kind: new URLSearchParams(location.search).get('course'), step_index: L.step, step_total: (LECTURES[L.ch] && LECTURES[L.ch].steps.length) || null });
        abort('back'); goHome();
      }, { title: '강의를 그만두시겠어요?', desc: '지금 나가면 강의를<br>처음부터 다시 봐야 해요.' });
      return;
    }
    if (quizBack) { quizBack(); return; }
    goHome();
  };
  // ── 앱 전환(백그라운드) = 일시정지, 돌아오면 멈춘 지점부터 즉시 이어서 ──
  // 이 강의는 "이어하기" 정책(CLAUDE.md 0-2 2층 구조 ②): 실행 중인 것은 전부 멈추되(①) 처음으로 되돌리지 않고 그 순간의 상태를 그대로 얼려 둔다.
  //  · 타이머: later() 예약(L.pend)·안전 타이머(L.fs)를 끄고 남은 시간만 기억 → 복귀 때 남은 시간으로 다시 건다
  //  · 화면: 강의 영역의 모든 애니메이션(Web Animation·CSS 전환·CSS 애니메이션 — 진행 바 게이지, 문구 페이드 포함)을 pause → 복귀 때 play
  //  · 소리: 강의 소리는 전부 오디오 시계(Tone.now) 기준으로 미리 예약돼 있어서, 오디오 컨텍스트를 suspend하면 울리던 음·예약된 음이 그 자리에서 멈추고 resume하면 그대로 이어짐
  // 화면 타이머와 오디오 시계를 같은 순간에 멈추고 같은 순간에 풀어서 연출과 소리의 맞춤이 어긋나지 않는다.
  function lecAudioClock(run) {
    try {
      const ctx = Tone.getContext().rawContext;
      if (run) { if (ctx.state !== 'running') ctx.resume(); }
      else if (ctx.state === 'running') ctx.suspend();
    } catch (e) {}
  }
  function lecAnimations() {
    const sec = $('combo-v2-lecture');
    if (!sec || typeof document.getAnimations !== 'function') return L.anims.slice();
    return document.getAnimations().filter(function (a) { const t = a.effect && a.effect.target; return t && sec.contains(t); });
  }
  function pauseLecture() {
    if (!L.open || L.paused) return;
    L.paused = true;
    const now = Date.now();
    L.pend.forEach(function (r) {   // 실제 타이머만(건너뛰기용 가상 예약은 id가 음수 — 그대로 둠)
      if (!(r.id > 0) || r.left != null) return;
      clearTimeout(r.id);
      r.left = Math.max(0, r.at - now);
    });
    L.fs.forEach(function (r) {
      if (r.left != null) return;
      clearTimeout(r.id);
      r.left = Math.max(0, r.at - now);
    });
    L.pausedAnims = lecAnimations().filter(function (a) { return a.playState === 'running'; });
    L.pausedAnims.forEach(function (a) { try { a.pause(); } catch (e) {} });
    lecAudioClock(false);
  }
  function resumeLecture() {
    if (!L.paused) return;
    L.paused = false;
    if (!L.open) { L.pausedAnims = []; return; }
    lecAudioClock(true);
    const recs = [];
    L.pend.forEach(function (r) { if (r.left != null) recs.push(r); });
    recs.forEach(function (r) {
      const left = r.left;
      delete r.left;
      L.pend.delete(r.id);
      armLater(r, left);
    });
    L.fs.forEach(function (r) {
      if (r.left == null) return;
      const left = r.left;
      delete r.left;
      L.fs.delete(r);
      armFailsafe(r, left);
    });
    L.pausedAnims.forEach(function (a) { if (a.playState === 'paused') { try { a.play(); } catch (e) {} } });
    L.pausedAnims = [];
  }
  // 페이지 이탈(pagehide)은 그대로 처음 상태로 정리. 단 iOS는 앱을 백그라운드로 보낼 때도 pagehide가 오고 문서가 살아 있으므로(guitar-audio.js 복귀 처리 참고),
  // 이미 일시정지된 상태(앞서 visibilitychange로 숨겨짐)면 정리하지 않고 멈춘 채 둔다 — 실제로 페이지가 바뀌면 문서와 함께 타이머·소리도 사라짐
  window.addEventListener('pagehide', function () { if (L.paused) return; abort('pagehide'); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseLecture(); else resumeLecture(); });

  // ── 노드 파일 연결 — 코스·일차 → journey-lessons/<파일>.js. 양쪽 코스의 같은 노드(D1 등)는 같은 파일을 가리킨다 ──
  const JL_NODE_FILES = {
    comping: { 1: 'fretboard-reading', 2: 'note-names', 3: 'chord-first', 4: 'stroke-basics', 5: 'little-star', 6: 'cg-chords', 7: 'minor-chords', 8: 'f-chord', 9: 'strum-expand', 10: 'waltz-68', 11: 'money-calypso', 12: 'triads', 13: 'diatonic', 14: 'dominant7', 15: 'pentatonic-forms', 16: 'pentatonic-forms', 17: 'pentatonic-forms', 18: 'pentatonic-forms', 19: 'pentatonic-forms', 20: 'guitar-techniques', 21: 'pentatonic-diagonal' },   // 15~19 = 펜타토닉 G·C·A·E·D폼 — 한 파일이 day로 폼을 고름 / 20 = 기타 필수 스킬(해머링·풀링오프·슬라이드) / 21 = 펜타토닉 대각 연결(마지막 노드 — 대각 패턴 + 여정 전체 복습)
    soloing: { 1: 'fretboard-reading', 2: 'note-names', 3: 'tab-chromatic', 4: 'rhythm-basics', 5: 'pentatonic-forms', 6: 'pentatonic-forms', 7: 'pentatonic-forms', 8: 'pentatonic-forms', 9: 'pentatonic-forms', 10: 'rhythm-apply', 11: 'rhythm-apply', 12: 'guitar-techniques', 13: 'pentatonic-diagonal', 14: 'major-forms', 15: 'major-forms', 16: 'major-forms', 17: 'power-chords', 18: 'solo-chords', 19: 'triads', 20: 'dominant7', 21: 'diatonic' }   // caged.js는 남겨 둠 — 언박싱 1일차에서 제외(사용자 지정 2026-11-24),   // 솔로연주 비기너(2026-11-23, docs/solo-beginner-curriculum.md) — 공통 노드는 같은 파일이 URL course로 문구만 바꿈
  };

  // 노드 파일이 부름: 단계·페이즈·무대를 등록하고 곧바로 강의 시작
  // ?quiz=1(별 1개 이상인 노드의 '다음 레벨 풀기'): 강의 없이 바로 퀴즈(노드 경제 기획안 §1-1: 설명은 첫 진입에만)
  // ?replay=1(같은 노드의 '설명 다시듣기'): 강의만 — 칸 이동 자유, 퀴즈 안내 칸은 빼고(replayCut) 마지막 버튼 '종료' → 홈
  function register(id, def) {
    // 진행 바 칸 길이 = 그 칸이 끝나기까지의 최소 시간(goGroup이 기다리는 것과 같은 식): 문구 최소 시간 / ms + 문구 선행 / 묶음은 구성 단계 합(est) + 문구 선행.
    //  연출(run)이 이보다 길면 노드가 ms로 알려 줘야 함 — 짧게 잡으면 마커가 칸 끝에서 먼저 멈춤(가상 시계 측정으로 확인)
    if (!def.durs) def.durs = def.steps.map(function (st) { return Math.max(stepCapMs(st), (st.ms || 0) + CAPTION_LEAD_MS, st.est != null ? st.est + CAPTION_LEAD_MS : 0); });
    LECTURES[id] = def;
    const q = new URLSearchParams(location.search);
    const resume = q.get('replay') !== '1' && typeof def.canResume === 'function' && def.canResume();   // 하던 퀴즈(새로고침·앱 종료 뒤) — 강의를 건너뛰고 그 문제부터
    if ((q.get('quiz') === '1' || resume) && typeof def.quiz === 'function') { def.quiz(); return; }
    // DEV 빌드(APP_VERSION에 _dev — 모든 노드가 별 1로 채워져 홈에선 늘 '설명 다시듣기'로 들어옴): 칸 이동은 자유로 두되 퀴즈 안내 칸·'퀴즈 시작!'은 남겨
    //  강의 → 퀴즈로 넘어가는 화면까지 확인할 수 있게(사용자 지정 2026-11-20). 출시 빌드(_dev 없음)는 아래 그대로
    const dev = typeof APP_VERSION !== 'undefined' && String(APP_VERSION).includes('_dev');
    if (q.get('replay') === '1' && dev) def.replay = true;
    else if (q.get('replay') === '1') {   // 설명 다시듣기(홈 말풍선): 퀴즈로 넘어가지 않고 종료 → 홈. 노드가 replayCut을 주면 그 칸부터(퀴즈 안내 등)는 빼고 끝냄
      def.replay = true; def.quiz = null; def.doneLabel = '종료';
      if (typeof def.replayCut === 'number') {
        def.steps = def.steps.slice(0, def.replayCut);
        def.groups = def.groups.map(function (g) { return g.filter(function (i) { return i < def.replayCut; }); }).filter(function (g) { return g.length; });
        def.durs = def.durs.slice(0, def.replayCut);
      }
    }
    open(id);
  }

  // ── 퀴즈 출제 순서 — 같은 문제가 바로 다음에 나오지 않게(사용자 지정 2026-11-16, 전 노드 공통) ──
  //  같은 문제 = 보이는 내용이 같은 문제: 보기 순서(choices·order)·지판 창 위치(view)·임시 값은 빼고 비교, 점 찍기의 주어진 손가락(given)은 순서 무관.
  //  바로 앞과 같은 문제가 오면 뒤에서 다른 문제 하나를 그 자리로 끌어옴(사이 문제들은 한 칸씩 밀릴 뿐 순서 그대로). 뒤에 없으면 그 문제를 앞쪽 빈틈으로 옮김.
  //  rank(q): 순서를 지켜야 하는 문제의 순위(예: 점 찍기 = 빠진 점 수 — 쉬운 것부터). null이면 자유. 옮겨도 순위 순서가 깨지지 않을 때만 옮김
  const QZ_NOKEY = { choices: 1, order: 1, view: 1, _i: 1, miss: 1 };
  function qzKey(q) {
    const o = {};
    Object.keys(q).sort().forEach(function (k) { if (!QZ_NOKEY[k]) o[k] = k === 'given' && Array.isArray(q[k]) ? q[k].slice().sort() : q[k]; });
    return JSON.stringify(o);
  }
  function noRepeat(qs, rank) {
    const a = qs.slice(), key = a.map(qzKey), rk = function (q) { return rank ? rank(q) : null; };
    const move = function (from, to) {   // from의 문제를 to 자리로(사이는 한 칸씩 밀림)
      a.splice(to, 0, a.splice(from, 1)[0]);
      key.splice(to, 0, key.splice(from, 1)[0]);
    };
    const rankOk = function (q, lo, hi) {   // q가 a[lo..hi] 묶음을 건너뛰어도 순위 순서가 그대로인가
      const r = rk(q);
      if (r == null) return true;
      for (let k = lo; k <= hi; k++) { const x = rk(a[k]); if (x != null && x !== r) return false; }
      return true;
    };
    let guard = a.length * a.length;   // 앞으로 옮긴 뒤 다시 훑는 경우가 끝없이 돌지 않게
    for (let i = 1; i < a.length && guard-- > 0; i++) {
      if (key[i] !== key[i - 1]) continue;
      let done = false;
      for (let j = i + 1; j < a.length && !done; j++) {   // 뒤에서 앞 문제와 다른 것을 i 자리로
        if (key[j] !== key[i - 1] && rankOk(a[j], i, j - 1)) { move(j, i); done = true; }
      }
      for (let p = 0; p < i - 1 && !done; p++) {   // 없으면 a[i]를 앞쪽 p 자리(a[p-1]·a[p] 사이)로 — 양옆이 다르고 순위가 지켜질 때
        if ((p === 0 || key[p - 1] !== key[i]) && key[p] !== key[i] && rankOk(a[i], p, i - 1)) { move(i, p); done = true; i = p; }
      }
      for (let p = i - 2; p >= 0 && !done; p--) {   // 그래도 없으면 앞쪽의 다른 문제 a[p]를 a[i-1]·a[i] 사이로 당겨 끼움 — 양옆과 다르고, 빠진 자리 양옆(a[p-1]·a[p+1])도 서로 다르고, 순위가 지켜질 때
        //  (2026-11-20: 순위가 같은 같은 문제가 맨 끝에 몰렸을 때 — 예: 점 찍기 '노트 전부 비우기'가 마지막에 둘 — 뒤에 끼울 문제가 없어 붙어 나오던 문제)
        if (key[p] !== key[i - 1] && key[p] !== key[i] && (p === 0 || key[p - 1] !== key[p + 1]) && rankOk(a[p], p + 1, i - 1)) { move(p, i - 1); done = true; }
      }
    }
    return a;
  }

  // 노드 파일이 쓰는 공용 도구
  window.JourneyLesson = {
    noRepeat: noRepeat,
    // 풀 퀴즈 단계(1~3) — 지도의 퀴즈 노드 k로 들어오면 URL ?star=k(노드 늘리기 2026-11-24: 퀴즈 노드 1·2·3 = 별 1·2·3 퀴즈, 다시 풀기도 그 노드 난이도).
    //  star가 없으면(설명 → 퀴즈 1, 이어 풀기) 예전처럼 다음 단계. 아직 안 열린 단계(딴 별 + 1 초과)는 받지 않음(dev 빌드도 같음 — 2026-11-25 전체 열림 폐기)
    quizStar: function (stars) {
      const s = parseInt(new URLSearchParams(location.search).get('star'), 10);
      if (s >= 1 && s <= 3 && s <= stars + 1) return s;
      return Math.min(stars + 1, 3);
    },
    register: register,
    goHome: goHome,
    setQuizBack: function (fn) { quizBack = fn || null; },
    $: $, em: em, an: an, wait: wait, later: later, anim: anim, fx: fx, swap: swap, spin: spin, chainSteps: chainSteps,
    strum: strum, note: note, piano: piano, audioT0: audioT0,
    // 동요 소리 균형(기타 출력 줄임 + 피아노 게인) — 칸이 끝나거나 이탈·건너뛰기에서 엔진이 기타 출력을 되돌림(releaseTrim). 피아노 게인은 샘플러가 새로 만들어질 때 기본값으로
    songMix: function (trim, gain) { if (L.skipping || typeof GuitarAudio === 'undefined') return; GuitarAudio.setOutputTrim(trim); GuitarAudio.setPianoGain(gain); L.trimmed = true; },
    leadMs: function () { return LEAD_MS; },
    skipping: function () { return L.skipping; },   // 빨리 돌리는 중(이동·건너뛰기) — 사용자 입력을 기다리는 단계는 이때 기다리지 않고 바로 끝내야 함   // 화면 연출을 소리와 맞추는 지연(소리 예약 지연 + lookAhead) — 강의를 열 때 갱신되므로 함수로
    EASE_IN: EASE_IN, EASE_OUT: EASE_OUT, FADE_MS: FADE_MS, CAPTION_LEAD_MS: CAPTION_LEAD_MS,
  };

  document.addEventListener('DOMContentLoaded', function () {
    const q = new URLSearchParams(location.search);
    const file = (JL_NODE_FILES[q.get('course')] || {})[q.get('day')];
    if (window.lucide) lucide.createIcons();
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('project-enter');
    const cover = $('page-cover');
    if (cover) requestAnimationFrame(function () { cover.classList.add('cover-out'); setTimeout(function () { cover.style.display = 'none'; }, 200); });
    if (!file) { console.warn('[journey-lesson] 노드 없음', q.toString()); return; }
    if (typeof jnyRefreshQuizRefund === 'function') jnyRefreshQuizRefund();   // 퀴즈 환급량(실험 그룹) — 홈을 거치지 않고 들어온 경우 대비(shared.js)
    const sc = document.createElement('script');
    sc.src = 'journey-lessons/' + file + '.js';
    sc.onerror = function () { console.error('[journey-lesson] 노드 파일을 불러오지 못함', sc.src); };
    document.body.appendChild(sc);
  });
})();
