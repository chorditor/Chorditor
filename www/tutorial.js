'use strict';
// ═══════════════════════════════════════════════════════════════
// tutorial.js — 퀘스트 체인 튜토리얼 엔진 (구간 데이터는 tutorial-steps.js)
//   진행도(step)는 DB(subscriptions.tutorial_*)가 source of truth,
//   localStorage는 오프라인/미로그인 폴백 미러.
//
//   분기1 (step 0 + 미건너뜀) : 홈 진입 시 시작 모달 자동 노출.
//                               이 상태에선 출석·랜덤피크 모달을 보류시킨다.
//   분기2 (건너뛴 유저)        : 자동 노출 없음. 우상단 물음표 아이콘으로 재진입.
//
//   콘솔 테스트: startTutorial()  강제 시작
//                resetTutorial()  로컬 진행도 초기화(자동 노출 재현용)
// ═══════════════════════════════════════════════════════════════

const Tutorial = (() => {
  const LS_KEY  = 'chorditor_tutorial_state'; // DB 미러 (폴백)
  // 진행 위치(챕터·구간). 페이지가 바뀌어도(user_project.html 등) 이어가기 위한 인계용.
  const RUN_KEY = 'chorditor_tut_run';

  // 구간 데이터는 tutorial-steps.js가 소유한다 (이 파일은 엔진만).
  // A/B 배정은 DB 왕복이라 스크립트 로드 시점엔 아직 없다 → 배정을 받은 뒤
  // _applyVariant()가 이 배열을 통째로 갈아끼운다. 그래서 const가 아니라 let.
  let CHAPTERS = TUTORIAL_CHAPTERS;

  // ── A/B 변형 배정 ──────────────────────────────────────────
  const EXPERIMENT = 'tutorial_order';
  const LS_VARIANT = 'chorditor_tut_variant'; // DB 미러 (진행도와 같은 방식)
  let _variant = null; // 'A' | 'B' — 배정 전엔 null

  function _applyVariant(v) {
    if (v !== 'A' && v !== 'B') return null;
    _variant = v;
    if (typeof window !== 'undefined' && typeof window.TUTORIAL_BUILD_CHAPTERS === 'function') {
      CHAPTERS = window.TUTORIAL_BUILD_CHAPTERS(v);
      window.TUTORIAL_CHAPTERS = CHAPTERS;
    }
    return v;
  }

  // 배정값 로컬 미러를 즉시 반영.
  //   resume()은 노트·훈련소·코드퀴즈 페이지에서도 페이지 로드 시 동기로 불린다
  //   (chord-name-quiz.js / training.js / user_project.js). DB 왕복을 기다릴 수 없으므로
  //   미러가 없으면 B 배정 유저가 A 순서로 이어받아 엉뚱한 챕터가 뜬다.
  try { _applyVariant(localStorage.getItem(LS_VARIANT)); } catch (_) {}

  // 배정 조회(없으면 서버가 생성). 튜토리얼이 실제로 열리기 직전에만 부른다 —
  // 홈 진입 전원에게 걸면 튜토리얼을 영영 안 보는 유저까지 배정 테이블에 쌓인다.
  // 진행 중에 순서가 바뀌면 저장된 진행도의 의미가 깨지므로 그땐 건드리지 않는다.
  async function _ensureVariant() {
    if (_variant || _running) return _variant;
    if (typeof _peakRpc !== 'function') return null;

    let v = null;
    try { v = await _peakRpc('get_or_assign_variant', { p_experiment: EXPERIMENT }); } catch (_) {}
    if (v !== 'A' && v !== 'B') return null; // 미로그인·오프라인 → 기본(A) 유지

    try { localStorage.setItem(LS_VARIANT, v); } catch (_) {}
    return _applyVariant(v);
  }

  let _state  = null; // { step, skipped, completed }
  let _loaded = false;
  let _chapter = 0;   // CHAPTERS 인덱스
  let _idx     = 0;   // 현재 챕터 내 구간 인덱스
  let _running = false;

  function _chap()  { return CHAPTERS[_chapter]; }
  // 챕터의 자리 번호. A/B 변형마다 달라지므로 로그에 박아두지 말고 여기서 뽑아 쓴다.
  function _noOf(key) { return CHAPTERS.find(c => c.key === key)?.no ?? 0; }
  function _steps() { return _chap()?.steps || []; }

  // 아직 구간이 채워진 다음 챕터가 있는가 (완료 모달의 "이어서 하기" 노출 조건)
  function _hasNextChapter() {
    return !!CHAPTERS[_chapter + 1]?.steps?.length;
  }

  // ── 상태 저장소 ────────────────────────────────────────────
  function _localGet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { step: 0, skipped: false, completed: null };
  }

  function _localSet(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  // ── 진행 위치 인계 (페이지 이동 대응) ──────────────────────
  function _runSave(idx) {
    const i = (idx === undefined) ? _idx : idx;
    // 인덱스가 아니라 chapter key로 남긴다 — 인덱스면, 페이지 이동 사이에 배정(A/B)이
    // 어긋났을 때 엉뚱한 챕터를 조용히 이어받는다(예: A의 3번 자리에 B의 3번 구간을 얹음).
    // key는 CHAPTERS가 어떤 순서로 만들어졌든 항상 같은 챕터를 가리킨다.
    try { sessionStorage.setItem(RUN_KEY, JSON.stringify({ chapter: _chap()?.key, idx: i })); } catch (_) {}
  }
  function _runRead() {
    try { return JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null'); } catch (_) { return null; }
  }
  function _runClear() {
    try { sessionStorage.removeItem(RUN_KEY); } catch (_) {}
  }
  // 튜토리얼이 진행 중인가 (다른 페이지에서도 판정 가능 — 샌드박스 유지 여부에 쓴다)
  function isRunning() { return _running || !!_runRead(); }

  // DB 우선, 실패(미로그인·오프라인)면 로컬 폴백.
  // step은 되돌아가지 않도록 두 값 중 큰 쪽을 취한다.
  async function loadState() {
    const local = _localGet();
    let merged  = local;

    if (typeof _peakRpc === 'function') {
      const r = await _peakRpc('get_tutorial_state');
      if (r) {
        merged = {
          step:      Math.max(r.step || 0, local.step || 0),
          skipped:   !!r.skipped || !!local.skipped,
          completed: r.completed || local.completed || null,
        };
        // 로컬이 서버보다 앞서 있으면 오프라인·인증 실패로 완료 기록이 유실된 것이다.
        // 그대로 두면 클라는 완료로 보고 다시 부르지 않아 보상이 영영 지급되지 않는다.
        if ((local.step || 0) > (r.step || 0)) {
          _replayMissingSteps(r.step || 0, local.step || 0).catch(() => {});
        }
      }
    }

    _state  = merged;
    _loaded = true;
    _localSet(merged);
    refreshEntryDot();
    return merged;
  }

  // 밀린 스텝 완료를 순서대로 서버에 재전송한다(보상도 여기서 뒤늦게 지급된다).
  // complete_tutorial_step은 v_cur+1만 받으므로 반드시 순차로, 실패하면 다음 진입에서 다시 시도.
  // 진입을 막지 않도록 await하지 않는다.
  async function _replayMissingSteps(fromStep, toStep) {
    const last = Math.min(toStep, CHAPTERS.length);
    let gained = 0;
    let done   = fromStep; // 서버가 실제로 받아들인 마지막 번호
    for (let n = fromStep + 1; n <= last; n++) {
      const r = await _peakRpc('complete_tutorial_step', { p_step: n });
      if (!r?.ok) break;
      gained += r.reward || 0;
      done    = n;
    }
    if (gained > 0 && typeof renderPeakboxBadge === 'function') renderPeakboxBadge();
    // 중간에 끊겼는데 완료로 기록하면 tutorial_step이 통째로 끝까지 올라가
    // 남은 스텝의 보상이 영영 사라진다 — 전부 반영됐을 때만 기록한다.
    if (done >= CHAPTERS.length) await _peakRpc('complete_tutorial', { p_step: done });
  }

  // 홈 우상단 물음표 아이콘의 강조 dot — 아직 안 끝낸 스텝이 남았을 때만 켠다.
  // 구간이 안 채워진 챕터는 목록에서도 숨기므로 여기서도 빼고 센다.
  function refreshEntryDot() {
    const dot = document.getElementById('tutorial-entry-dot');
    if (!dot) return;
    const total = CHAPTERS.filter(c => c.steps?.length).length;
    dot.hidden = (getState().step || 0) >= total;
  }

  function getState() { return _state || _localGet(); }

  // ── 자동 시작 판정 ─────────────────────────────────────────
  // step1도 완료하지 않았고 건너뛴 적도 없는 유저만 자동 노출.
  function shouldAutoStart() {
    const s = getState();
    return (s.step || 0) === 0 && !s.skipped;
  }

  // ── 시작 안내 모달 ─────────────────────────────────────────
  function openStartModal() {
    const overlay = document.getElementById('tutorial-start-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    if (typeof _playSfx === 'function') _playSfx('page.mp3');
    if (typeof analytics !== 'undefined') analytics.track('tutorial_start_modal_viewed', {});
  }

  function closeStartModal() {
    const overlay = document.getElementById('tutorial-start-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // ── 홈 진입 오케스트레이터 ─────────────────────────────────
  // 튜토리얼 자동 노출 대상이면 출석·랜덤피크 모달을 보류한다.
  // (건너뛰기/완료 시 _releaseHomeFlow에서 이어서 실행)
  async function runHomeEntryFlow() {
    // 노트 페이지에서 홈으로 돌아온 경우 — 진행 위치를 이어받고 출석 플로우는 띄우지 않는다
    if (resume()) return;

    // 진행 중이 아닌데 샌드박스가 남아 있으면(앱을 도중에 닫은 경우) 정리.
    // 안 지우면 실제 노트 목록이 빈 것처럼 보인다.
    if (typeof tutorialSandboxEnd === 'function') tutorialSandboxEnd();

    await loadState();
    // 자동 노출 대상만 배정한다(실험 참가자 = 튜토리얼을 실제로 여는 유저).
    if (shouldAutoStart()) { await _ensureVariant(); openStartModal(); return; }
    if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
  }

  // 보류해둔 홈 진입 플로우(출석 도장 → 마일스톤 상자 → 랜덤피크) 실행.
  // showReferral: 출석 체인이 전부 끝난 뒤 친구 초대 공지를 띄울지 — 튜토리얼을 완주했거나
  // 건너뛴 순간에만 true로 넘어온다(중간 스텝 "나중에 할게요"는 해당 없음).
  function _releaseHomeFlow(showReferral) {
    if (typeof runDailyAttendanceFlow !== 'function') return;
    const onAllDone = (showReferral && typeof maybeShowReferralNotice === 'function')
      ? maybeShowReferralNotice : undefined;
    runDailyAttendanceFlow(onAllDone);
  }

  // 튜토리얼 이탈 시 홈 화면으로 복귀시킨 뒤 보류 플로우 실행.
  // 노트 페이지(user_project.html)에는 탭 전환 함수가 없으므로 페이지 이동으로 대체한다.
  function _returnHomeAndRelease(showReferral) {
    if (typeof switchTab !== 'function') { location.href = 'home.html'; return; }
    switchTab('home', true);
    if (typeof enterFromHome === 'function') enterFromHome('home', true);
    _releaseHomeFlow(showReferral);
  }

  // ── 시작 / 건너뛰기 ────────────────────────────────────────
  function startFromModal() {
    closeStartModal();
    if (typeof analytics !== 'undefined') analytics.track('tutorial_started', { step: getState().step || 0 });
    start();
  }

  // ── 조작 차단 ──────────────────────────────────────────────
  // z-index 스태킹에 휘둘리지 않도록 오버레이가 아닌 capture 리스너로 막는다.
  // 통과 대상: 튜토리얼 레이어 자신(건너뛰기 버튼) + 현재 구간의 target. 그 외는 전부 차단.
  //
  // 탭뿐 아니라 스크롤·스와이프·휠피커 회전·키보드까지 막아야 하므로 move/wheel/key 계열도 포함한다.
  // touchmove·wheel은 리스너가 passive면 preventDefault가 무시되므로 passive:false로 등록해야 한다.
  const _GUARD_EVENTS = [
    'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'mousedown', 'mouseup', 'click', 'dblclick',
    'wheel', 'keydown', 'keyup', 'contextmenu',
  ];
  const _GUARD_OPTS = { capture: true, passive: false };

  // target은 문자열/배열 모두 허용 — 항상 배열로 정규화해서 쓴다.
  function _targetSels(step) {
    const t = step?.target;
    if (!t) return [];
    return Array.isArray(t) ? t : [t];
  }

  function _guardAllows(target) {
    const layer = document.getElementById('tut-layer');
    if (layer && layer.contains(target)) return true;
    const leaveOv = document.getElementById('leave-practice-overlay');
    if (leaveOv && leaveOv.contains(target)) return true;
    return _targetSels(_steps()[_idx]).some(sel => {
      const el = document.querySelector(sel);
      return el && el.contains(target);
    });
  }

  function _guard(e) {
    if (_guardAllows(e.target)) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }

  function _installGuard() {
    _GUARD_EVENTS.forEach(ev => document.addEventListener(ev, _guard, _GUARD_OPTS));
    // 네이티브 스크롤·핀치줌은 이벤트 취소만으론 새는 경로가 있어 CSS로도 잠근다.
    document.body.classList.add('tut-lock');
  }
  function _removeGuard() {
    _GUARD_EVENTS.forEach(ev => document.removeEventListener(ev, _guard, true));
    document.body.classList.remove('tut-lock');
  }

  // ── 고스트 dot ─────────────────────────────────────────────
  // 캔버스 위에 겹쳐 두는 DOM 요소. 캔버스를 다시 그리지 않아도 깜빡일 수 있고
  // 물리→CSS 변환은 바레 버튼과 같은 방식(실측 비율)을 쓴다.
  function _hideGhost() {
    const g = document.getElementById('tut-ghost');
    if (g) g.hidden = true;
  }

  function _showGhost(cell) {
    const canvas = document.getElementById('c');
    const inner  = canvas?.parentElement;
    if (!canvas || !inner || !canvas.style.width) return;

    let g = document.getElementById('tut-ghost');
    if (!g) {
      g = document.createElement('div');
      g.id = 'tut-ghost';
      inner.appendChild(g);
    }
    const ds   = parseFloat(canvas.style.width) / canvas.width;
    const size = SH() * 0.95 * ds; // 실제 dot 지름과 동일
    const cx   = (TL() + (cell.f - 0.5) * FW()) * ds;
    const cy   = (TT() + cell.s * SH()) * ds;
    g.style.width  = size + 'px';
    g.style.height = size + 'px';
    g.style.left   = (cx - size / 2) + 'px';
    g.style.top    = (cy - size / 2) + 'px';
    g.hidden = false;
  }

  // 이미 찍혀 있는(어두운 색) dot을 가리킬 때 쓴다 — 고스트는 빈 자리용이라 dot 위에 얹으면 안 보인다.
  // dot 바로 우측에 왼쪽을 가리키는 화살표를 띄운다.
  function _hideArrow() {
    const a = document.getElementById('tut-arrow');
    if (a) a.hidden = true;
  }

  // 공통 배치 — cx/cy는 canvas 내부 좌표(drawCanvas와 동일 스케일),
  // markerSize는 그 자리에 그려진 것의 지름(화살표를 그만큼 바깥으로 띄운다).
  // side: 'right'(기본, ◀ 모양) | 'left'(대상 왼쪽에 ▶ 모양으로 붙는다)
  function _placeArrowAt(cx, cy, markerSize, side) {
    const canvas = document.getElementById('c');
    const inner  = canvas?.parentElement;
    if (!canvas || !inner || !canvas.style.width) return;

    let a = document.getElementById('tut-arrow');
    if (!a) {
      a = document.createElement('div');
      a.id = 'tut-arrow';
      inner.appendChild(a);
    }
    const toLeft = side === 'left';
    a.className = 'tut-arrow' + (toLeft ? ' tut-arrow--left' : '');

    const ds  = parseFloat(canvas.style.width) / canvas.width;
    const off = markerSize * ds / 2 + 6;
    a.style.left = (cx * ds + (toLeft ? -off : off)) + 'px';
    a.style.top  = (cy * ds) + 'px';
    a.hidden = false;
  }

  function _showArrow(cell) {
    const dotSize = SH() * 0.95;
    const cx = TL() + (cell.f - 0.5) * FW();
    const cy = TT() + cell.s * SH();
    _placeArrowAt(cx, cy, dotSize, cell.side);
  }

  // 개방현/뮤트 아이콘(너트 왼쪽, dot과 다른 좌표계) 옆에 화살표를 띄운다.
  // 좌표식은 drawCanvas의 오픈/뮤트 렌더 코드(BASE_OPEN_W 기준)와 동일하게 맞춘 것.
  function _showStringArrow(cell) {
    const dotSize = SH() * 0.95;
    const cx = TL() - Math.round(BASE_OPEN_W / 2 * r());
    const cy = TT() + cell.s * SH();
    _placeArrowAt(cx, cy, dotSize, cell.side);
  }

  // ── DOM 요소용 화살표 ──────────────────────────────────────
  // 어두운 버튼처럼 펄스 링이 잘 안 보이는 대상에 쓴다.
  // 펄스 링과 같은 이유로 body 직속 fixed + rAF 추적 — 조상의 overflow에 안 잘린다.
  let _elArrowRaf = null;
  let _elArrowEl  = null;

  function _hideElArrow() {
    if (_elArrowRaf) { cancelAnimationFrame(_elArrowRaf); _elArrowRaf = null; }
    if (_elArrowEl)  { _elArrowEl.remove(); _elArrowEl = null; }
  }

  // cfg: { sel, side } — side 'top'(기본, 대상 위에서 아래를 가리킴) | 'bottom' | 'left' | 'right'
  function _showElArrow(cfg) {
    _hideElArrow();
    const sel  = typeof cfg === 'string' ? cfg : cfg?.sel;
    const side = (typeof cfg === 'object' && cfg.side) || 'top';
    if (!sel) return;

    const a = document.createElement('div');
    a.className = 'tut-el-arrow tut-el-arrow--' + side;
    document.body.appendChild(a);
    _elArrowEl = a;

    const GAP = 8;
    const follow = () => {
      const el = document.querySelector(sel);
      const r  = el?.getBoundingClientRect();
      if (!r || r.width < 1 || r.height < 1) {
        a.style.display = 'none';
      } else {
        a.style.display = '';
        if (side === 'left') {
          a.style.left = (r.left - GAP) + 'px';
          a.style.top  = (r.top + r.height / 2) + 'px';
        } else if (side === 'right') {
          a.style.left = (r.right + GAP) + 'px';
          a.style.top  = (r.top + r.height / 2) + 'px';
        } else if (side === 'bottom') {
          a.style.left = (r.left + r.width / 2) + 'px';
          a.style.top  = (r.bottom + GAP) + 'px';
        } else { // top
          a.style.left = (r.left + r.width / 2) + 'px';
          a.style.top  = (r.top - GAP) + 'px';
        }
      }
      _elArrowRaf = requestAnimationFrame(follow);
    };
    follow();
  }

  function _hideFretNumLabel() {
    const el = document.getElementById('tut-fret-label');
    if (el) el.hidden = true;
  }

  // 프렛번호 옆에 "← 프렛 번호" 라벨을 붙인다.
  // 숫자 좌우엔 이미 #fret-ctrl(◀▶ 버튼)이 얹혀 있으므로, 캔버스 좌표를 다시 계산하지 않고
  // 그 요소의 실제 rect 오른쪽에 붙인다 — 겹침 없이 항상 정확히 따라간다.
  function _showFretNumLabel() {
    const ctrl  = document.getElementById('fret-ctrl');
    const inner = document.getElementById('c')?.parentElement;
    if (!ctrl || !inner) return;

    let el = document.getElementById('tut-fret-label');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tut-fret-label';
      el.className = 'tut-fret-label';
      el.textContent = '← 프렛 번호';
      inner.appendChild(el);
    }
    const cr = ctrl.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    el.style.left = (cr.right - ir.left + 6) + 'px';
    el.style.top  = (cr.top + cr.height / 2 - ir.top) + 'px';
    el.hidden = false;
  }

  function _hideStringNumbers() {
    const wrap = document.getElementById('tut-string-nums');
    if (wrap) wrap.hidden = true;
  }

  // 라벨 등장 타이밍 — 설명 문구가 먼저 뜨고, 잠시 뒤 줄 번호가 위에서부터 순서대로
  // 빠르게 슬라이드해 들어오고, 그 다음에 프렛번호 라벨이 이어서 등장한다.
  const LABEL_GROUP_DELAY_MS = 400; // 패널 등장 후 라벨 그룹이 시작되기까지
  const LABEL_STAGGER_MS     = 70;  // 줄 번호 사이 간격
  const LABEL_ANIM_MS        = 250; // 라벨 하나의 등장 애니메이션 길이 (CSS와 맞출 것)
  const FRET_LABEL_GAP_MS    = 150; // 마지막 줄 번호 애니메이션이 끝난 뒤 프렛번호까지 여유

  // 너트 왼쪽 개방현/뮤트 아이콘보다 더 왼쪽에 "1번줄"~"6번줄"을 검정 글씨로 고정 표시한다.
  // 아이콘 왼쪽 끝에 오른쪽 정렬(translate -100%)로 붙여 아이콘과 절대 겹치지 않게 한다.
  function _showStringNumbers() {
    const canvas = document.getElementById('c');
    const inner  = canvas?.parentElement;
    if (!canvas || !inner || !canvas.style.width) return;

    let wrap = document.getElementById('tut-string-nums');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'tut-string-nums';
      inner.appendChild(wrap);
    }
    wrap.innerHTML = '';

    const ds      = parseFloat(canvas.style.width) / canvas.width;
    const iconX   = TL() - Math.round(BASE_OPEN_W / 2 * r()); // 개방현/뮤트 아이콘 중심
    const iconR   = SH() * 0.95 / 2;                          // 아이콘 반지름
    const rightPx = (iconX - iconR) * ds - 4;                 // 아이콘 왼쪽 끝에서 4px 더 왼쪽
    for (let s = 0; s < STRINGS; s++) {
      const label = document.createElement('div');
      label.className = 'tut-string-num';
      label.textContent = (s + 1) + '번줄';
      label.style.left = rightPx + 'px';
      label.style.top  = ((TT() + s * SH()) * ds) + 'px';
      label.style.animationDelay = (LABEL_GROUP_DELAY_MS + s * LABEL_STAGGER_MS) + 'ms';
      wrap.appendChild(label);
    }
    wrap.hidden = false;
  }

  // ── 자동 입력 시뮬레이션 ───────────────────────────────────
  // 고스트 dot을 잠깐 띄웠다가(누르는 시늉) 실제 입력을 반영 — 유저가 직접 찍는 것처럼 보이게 한다.
  let _simTimers = [];

  function _clearSim() {
    _simTimers.forEach(clearTimeout);
    _simTimers = [];
  }

  const SIM_LEAD_MS  = 500; // 설명 읽을 여유
  const SIM_HOLD_MS  = 320; // 고스트 표시 시간
  const SIM_GAP_MS   = 200; // 찍은 뒤 다음 탭까지
  const SIM_TAIL_MS  = 400; // 마지막 입력 후 다음 구간까지

  function _runSimulation(step) {
    _clearSim();
    let t = SIM_LEAD_MS;
    const alive = () => _running && _steps()[_idx] === step;

    step.simulate.forEach(cell => {
      _simTimers.push(setTimeout(() => { if (alive()) _showGhost(cell); }, t));
      t += SIM_HOLD_MS;
      _simTimers.push(setTimeout(() => {
        if (!alive()) return;
        _hideGhost();
        window.tutorialTapDot?.(cell.s, cell.f);
      }, t));
      t += SIM_GAP_MS;
    });

    // 시뮬레이션이 끝나면 알림과 함께 '다음' 버튼을 풀어준다.
    // advanceOn:'sim:done'을 쓰는 구간은 알림으로 자동 진행되고,
    // 그렇지 않은 구간은 버튼이 활성화돼 유저가 직접 넘긴다.
    _simTimers.push(setTimeout(() => {
      if (!alive()) return;
      notify('sim:done');
      enableNext();
    }, t + SIM_TAIL_MS));
  }

  // ── 세로 스와이프 유도 힌트 ────────────────────────────────
  // 목록 중앙에 손가락 원을 띄워 위아래로 훑게 하고, 진입 시 한 번 넛지한다.
  // (원 = 어디를 만질지, 넛지 = 실제로 움직인다는 증거)
  let _nudgeAborted = false;
  let _hintRaf      = null;
  let _hintTimer    = null;

  function _hideScrollHint() {
    const hint = document.getElementById('tut-scrollhint');
    if (hint) hint.hidden = true;
    if (_hintRaf)   { cancelAnimationFrame(_hintRaf); _hintRaf = null; }
    if (_hintTimer) { clearTimeout(_hintTimer);       _hintTimer = null; }
    _nudgeAborted = true;
  }

  // 화면 전환 슬라이드 중에 재면 transform이 적용된 중간 위치가 나온다.
  // 한 번만 재지 않고 활성 중엔 매 프레임 대상 위치를 따라간다 — 슬라이드·스크롤·리사이즈 전부 커버.
  const HINT_NUDGE_DELAY_MS = 400; // 뷰 슬라이드(250ms)가 끝난 뒤에 넛지

  function _showScrollHint(sel) {
    const el   = document.querySelector(sel);
    const hint = document.getElementById('tut-scrollhint');
    if (!el || !hint) return;

    const follow = () => {
      const r = el.getBoundingClientRect();
      if (r.height >= 1) {
        hint.style.left = (r.left + r.width / 2) + 'px';
        hint.style.top  = (r.top + r.height / 2) + 'px';
        hint.hidden = false;
      }
      _hintRaf = requestAnimationFrame(follow);
    };
    follow();

    _hintTimer = setTimeout(() => _nudgeScroll(el), HINT_NUDGE_DELAY_MS);
  }

  // 살짝 내렸다 되돌리는 1회 넛지. 유저가 만지면 즉시 중단해 조작을 방해하지 않는다.
  const NUDGE_DIST_PX = 28;
  const NUDGE_MS      = 900;

  function _nudgeScroll(el) {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 4) return; // 스크롤할 게 없으면 넛지도 없다

    const start = el.scrollTop;
    const dist  = Math.min(NUDGE_DIST_PX, max - start);
    if (dist <= 0) return;

    _nudgeAborted = false;
    const abort = () => { _nudgeAborted = true; };
    el.addEventListener('pointerdown', abort, { once: true });
    el.addEventListener('wheel',       abort, { once: true });

    const t0 = performance.now();
    const tick = (t) => {
      if (_nudgeAborted) return;
      const p = Math.min(1, (t - t0) / NUDGE_MS);
      el.scrollTop = start + dist * Math.sin(p * Math.PI); // 0 → dist → 0
      if (p < 1) requestAnimationFrame(tick);
      else el.removeEventListener('pointerdown', abort);
    };
    requestAnimationFrame(tick);
  }

  // ── 구간 렌더 ──────────────────────────────────────────────
  // ── 펄스 링 ────────────────────────────────────────────────
  // 대상에 box-shadow를 직접 걸면 조상의 overflow:hidden에 잘린다(팔레트·줄 목록 등).
  // body 직속 fixed 요소로 그리고 매 프레임 대상 rect를 따라가게 해서 잘림을 원천 차단.
  let _ringRaf = null;
  let _ringEls = [];

  function _clearRings() {
    if (_ringRaf) { cancelAnimationFrame(_ringRaf); _ringRaf = null; }
    _ringEls.forEach(el => el.remove());
    _ringEls = [];
  }

  function _startRings(selectors) {
    _clearRings();
    if (!selectors.length) return;

    const items = selectors.map(sel => {
      const ring = document.createElement('div');
      // 손가락번호 버튼처럼 촘촘히 붙은 대상은 파동이 옆 버튼까지 번져 보이므로 확산 폭을 줄인다
      const tight = document.querySelector(sel)?.classList.contains('finger-btn');
      ring.className = 'tut-ring' + (tight ? ' tut-ring--tight' : '');
      document.body.appendChild(ring);
      _ringEls.push(ring);
      return { sel, ring };
    });

    const follow = () => {
      items.forEach(({ sel, ring }) => {
        const el = document.querySelector(sel);
        const r  = el?.getBoundingClientRect();
        if (!r || r.width < 1 || r.height < 1) { ring.style.display = 'none'; return; }

        let w = r.width, h = r.height, left = r.left, top = r.top;
        const radius = getComputedStyle(el).borderRadius;
        // 원형 의도(50%)인데 가로세로가 다르면 그대로 못생긴 타원이 된다.
        // 긴 변 기준 정사각형으로 맞추고 중앙을 유지해 완전한 원으로 그린다.
        if (radius.includes('50%') && w !== h) {
          const s = Math.max(w, h);
          left -= (s - w) / 2;
          top  -= (s - h) / 2;
          w = h = s;
        }

        // 서브픽셀 값이면 브라우저마다 반올림 방향이 달라 대상과 1px씩 어긋나 보인다 — 정수로 고정.
        ring.style.display      = '';
        ring.style.left         = Math.round(left) + 'px';
        ring.style.top          = Math.round(top)  + 'px';
        ring.style.width        = Math.round(w)     + 'px';
        ring.style.height       = Math.round(h)     + 'px';
        ring.style.borderRadius = radius; // 대상 모양 그대로 (원형 보정 후에도 50% 유지)
      });
      _ringRaf = requestAnimationFrame(follow);
    };
    follow();
  }

  function _clearTarget() {
    document.querySelectorAll('.tut-target').forEach(el => {
      el.classList.remove('tut-target');
      if (el.dataset.tutPos) { el.style.position = ''; delete el.dataset.tutPos; }
    });
    document.querySelectorAll('.tut-allow').forEach(el => el.classList.remove('tut-allow'));
    clearTimeout(_pulseTimer); _pulseTimer = 0;
    _clearRings();
  }

  // pulseDelay가 있는 구간용 — 화면 전환 애니메이션이 끝난 뒤 링을 켜기 위한 타이머
  let _pulseTimer = 0;

  // z-index는 static 요소엔 안 먹는다. static일 때만 relative를 인라인으로 부여 —
  // 이미 absolute/fixed로 배치된 대상은 건드리지 않아야 레이아웃이 안 깨진다.
  function _markTarget(el) {
    el.classList.add('tut-target');
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
      el.dataset.tutPos = '1';
    }
  }

  // 허용/펄스 표시를 현재 구간 기준으로 다시 입힌다.
  // 목록이 다시 그려져 대상 DOM이 교체되면(근음 탭 등) 표시가 날아가므로 repaint()로 재호출한다.
  function _applyTargets(step) {
    _clearTarget();
    // .tut-allow — body.tut-lock의 touch-action:none을 여기서만 되돌려
    // 목록·휠피커처럼 스크롤이 필요한 대상이 실제로 움직이게 한다.
    _targetSels(step).forEach(sel => document.querySelector(sel)?.classList.add('tut-allow'));
    if (step.pulse === false) return;
    // pulse에 셀렉터(또는 배열)를 주면 그 대상만, 없으면 허용 대상 전체에 펄스
    const pulseSels = step.pulse
      ? (Array.isArray(step.pulse) ? step.pulse : [step.pulse])
      : _targetSels(step);
    const paint = () => {
      pulseSels.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) _markTarget(el);
      });
      _startRings(pulseSels);
    };
    // 화면 전환 애니메이션이 도는 동안 링을 켜면 대상이 움직여 위치가 어긋난다.
    // pulseDelay를 준 구간은 전환이 끝난 뒤에 켠다.
    if (step.pulseDelay) _pulseTimer = setTimeout(paint, step.pulseDelay);
    else paint();
  }

  // 앱 쪽에서 목록을 다시 그린 뒤 호출 — 교체된 DOM에 하이라이트를 되살린다
  function repaint() {
    if (!_running) return;
    const step = _steps()[_idx];
    if (step) _applyTargets(step);
  }

  function _render() {
    const step  = _steps()[_idx];
    const layer = document.getElementById('tut-layer');
    if (!step || !layer) return;

    _runSave(); // 구간이 바뀔 때마다 위치 기록 — 페이지가 넘어가도 여기서 이어진다
    layer.classList.remove('hidden');

    const panel = document.getElementById('tut-panel');
    // hidePanel — 유저가 화면에 집중해야 하는 구간(퀴즈 풀이 등)은 설명창을 아예 감춘다.
    // 오버레이·허용 대상은 그대로 두어 조작은 계속 가능하다.
    panel.classList.toggle('hidden', !!step.hidePanel);
    panel.classList.toggle('tut-panel--top',      step.panel === 'top');
    panel.classList.toggle('tut-panel--card-top', step.panel === 'card-top');
    panel.classList.toggle('tut-panel--bottom',   step.panel === 'bottom');

    // 구간 타이틀의 {S}는 챕터가 몇 번째 자리인지로 채운다 —
    // A/B 변형에 따라 같은 챕터가 다른 번호에 오므로 문구에 번호를 굳혀두지 않는다.
    document.getElementById('tut-title').textContent =
      (step.title || '').replace(/\{S\}/g, 'STEP' + _chap().no);
    document.getElementById('tut-text').textContent  = step.text;

    // 팝업 등장 — 클래스를 뗐다 붙여야 같은 애니메이션이 다시 재생된다
    panel.classList.remove('tut-panel--out', 'tut-panel--pop');
    void panel.offsetWidth;
    panel.classList.add('tut-panel--pop');

    const nextBtn = document.getElementById('tut-next');
    if (nextBtn) {
      nextBtn.disabled     = !step.optional;
      nextBtn.textContent  = step.nextLabel || '다음';
    }

    _applyTargets(step);

    step.setup?.();

    // 캔버스 리사이즈(rAF)가 끝난 뒤라야 좌표가 맞는다
    _clearSim();
    _hideGhost();
    _hideArrow();
    _hideElArrow();
    _hideStringNumbers();
    _hideFretNumLabel();
    _hideScrollHint();
    if (step.elArrow) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showElArrow(step.elArrow);
      }));
    }
    if (step.stringNumbers) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showStringNumbers();
      }));
    }
    if (step.fretNumArrow) {
      // 줄 번호가 함께 있는 구간이면 그 시퀀스가 끝난 뒤에 이어서 등장시킨다.
      const fretDelay = step.stringNumbers
        ? LABEL_GROUP_DELAY_MS + (STRINGS - 1) * LABEL_STAGGER_MS + LABEL_ANIM_MS + FRET_LABEL_GAP_MS
        : LABEL_GROUP_DELAY_MS;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!_running || _steps()[_idx] !== step) return;
        setTimeout(() => {
          if (!_running || _steps()[_idx] !== step) return;
          _showFretNumLabel();
          enableNext(); // 라벨이 전부 등장한 뒤에야 다음으로 넘길 수 있게 푼다
        }, fretDelay);
      }));
    } else if (step.stringNumbers) {
      // 프렛번호 라벨 없이 줄 번호만 쓰는 구간 — 그 시퀀스가 끝나는 시점에 푼다.
      const stringDelay = LABEL_GROUP_DELAY_MS + (STRINGS - 1) * LABEL_STAGGER_MS + LABEL_ANIM_MS;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!_running || _steps()[_idx] !== step) return;
        setTimeout(() => {
          if (_running && _steps()[_idx] === step) enableNext();
        }, stringDelay);
      }));
    }
    if (step.scrollHint) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showScrollHint(step.scrollHint);
      }));
    }
    // arrowCell = 이미 찍힌 dot을 가리킴. arrowString = 개방현/뮤트 아이콘을 가리킴(다른 좌표계).
    // canvasCell = 빈 자리를 가리킴(고스트). 한 구간에 하나만 쓴다.
    if (step.arrowCell) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showArrow(step.arrowCell);
      }));
    } else if (step.arrowString) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showStringArrow(step.arrowString);
      }));
    } else if (step.canvasCell) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showGhost(step.canvasCell);
      }));
    }
    if (step.simulate) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _runSimulation(step);
      }));
    }
  }

  function _teardown() {
    _running = false;
    _runClear();
    // 샌드박스는 튜토리얼이 멈추는 순간 반드시 해제 — 남으면 실제 노트 목록이 빈 것처럼 보인다
    if (typeof tutorialSandboxEnd === 'function') tutorialSandboxEnd();
    if (_advanceTimer) { clearTimeout(_advanceTimer); _advanceTimer = null; } // 대기 중 전환 취소
    _removeGuard();
    _clearSim();
    _clearTarget();
    _hideGhost();
    _hideArrow();
    _hideElArrow();
    _hideStringNumbers();
    _hideFretNumLabel();
    _hideScrollHint();
    document.getElementById('tut-layer')?.classList.add('hidden');
  }

  // ── 진행 제어 ──────────────────────────────────────────────
  // 저장된 진행도(step)에 이어서 시작. step=1이면 STEP2부터.
  // 이미 다 끝냈거나 아직 구간이 안 채워진 챕터면 시작하지 않는다.
  function start() {
    const from = CHAPTERS.findIndex(c => c.no > (getState().step || 0));
    _chapter = from === -1 ? 0 : from;
    if (!_steps().length) return;
    _chap().onStart?.();
    _idx     = 0;
    _running = true;
    _installGuard();
    _render();
  }

  // 페이지가 바뀐 뒤(user_project.html 진입/복귀) 저장된 위치에서 이어서 그린다.
  // 반환값: 이어받았으면 true — 호출부는 이때 자기 초기 플로우를 건너뛴다.
  function resume() {
    const run = _runRead();
    if (!run) return false;
    const ci = CHAPTERS.findIndex(c => c.key === run.chapter);
    if (ci === -1) { _runClear(); return false; } // 배정 불일치·구성 변경 방어
    _chapter = ci;
    _idx     = run.idx;
    if (!_steps()[_idx]) { _runClear(); return false; } // 구간 구성이 바뀐 경우 방어
    _running = true;
    _installGuard();

    // 페이지 이동 자체가 완료 조건인 구간(예: "목록으로 나가 주세요")은 새 페이지가 뜬 시점에
    // 이미 조건이 끝나 있다. 그대로 render()부터 하면 이미 끝난 구간의 패널이 잠깐 떴다가
    // 곧바로(다음 next()로) 다음 구간으로 넘어가는 게 눈에 보인다 — 렌더 전에 미리 건너뛴다.
    let _skipGuard = 0;
    while (_skipGuard++ < 20) {
      const step = _steps()[_idx];
      const cond = step?.advanceOn;
      if (typeof cond !== 'function' || !cond()) break;
      if (_idx >= _steps().length - 1) break; // 마지막 구간은 정상 경로(_finishStep)로 넘긴다
      _idx++;
    }

    _render();
    // 페이지 로드 중 이미 지나간 변화(탭 전환 등)를 놓치지 않도록 현재 상태를 한 번 재평가.
    // 함수형 advanceOn을 쓰는 구간은 여기서 곧바로 통과된다.
    notify('resumed');
    return true;
  }

  // 구간 전환 사이의 뜸 — 방금 한 조작의 결과를 눈으로 확인할 틈을 준다.
  // 이 딜레이 앞부분을 패널 퇴장에 쓴다: 패널을 복제하지 않고도 끊김 없이 이어진다.
  const ADVANCE_DELAY_MS = 500;
  const PANEL_OUT_MS     = 200; // CSS .tut-panel--out 길이와 맞출 것
  let _advanceTimer = null;

  function next() {
    if (!_running) return;
    if (_advanceTimer) return; // 대기 중 중복 호출 무시 (알림이 연달아 와도 한 구간만)

    // 펄스 링은 여기서 즉시 끈다. 해제를 다음 _render()의 _clearTarget()에만 맡기면
    // 전환 딜레이(500ms) 동안 이미 눌러버린 버튼에 링이 계속 남아 있다.
    // (.tut-allow/.tut-target은 유지 — 같은 제스처로 이어지는 핸들러를 막지 않기 위해)
    _clearRings();

    // 퇴장은 딜레이가 끝나기 직전에 시작 → 내용 교체 순간엔 이미 투명하다
    const panel = document.getElementById('tut-panel');
    if (panel) {
      setTimeout(() => {
        if (_advanceTimer) panel.classList.add('tut-panel--out');
      }, Math.max(0, ADVANCE_DELAY_MS - PANEL_OUT_MS));
    }

    const from = _steps()[_idx];

    // 딜레이가 끝나기 전에 페이지가 넘어가는 호출부가 있다
    // (confirmCreateProject: notify('notecreate:done') 직후 openProject → 즉시 이동).
    // 그러면 _render()의 _runSave()가 실행되지 못해 sessionStorage에 '이전 구간'이 남고,
    // 새 페이지의 resume()이 이미 끝난 구간을 다시 그려 진행이 멎는다.
    // → 다음 위치를 미리 남겨 둔다. 정상 진행이면 _render()가 같은 값으로 덮어쓴다.
    if (_idx < _steps().length - 1) _runSave(_idx + 1);

    _advanceTimer = setTimeout(() => {
      _advanceTimer = null;
      if (!_running || _steps()[_idx] !== from) return; // 기다리는 사이 상태가 바뀌었으면 폐기
      if (_idx >= _steps().length - 1) { _finishStep(); return; }
      _idx++;
      _render();
    }, ADVANCE_DELAY_MS);
  }

  // ── STEP4 선물: 완성된 '작은 별' 노트 ──────────────────────
  // 실습용 시드(2줄)가 아니라 1절 전체가 완성된 악보다.
  // 만드는 쪽은 user_project.js의 stashTutorialGiftSong() — 거기에만 라이브러리 변환 로직이 있어
  // 시드를 깔 때 미리 만들어 sessionStorage에 넣어둔다. 여기서는 꺼내 쓰기만 한다.
  const GIFT_SONG_KEY   = 'chorditor_tut_gift';
  const GIFT_FREE_LIMIT = 3; // 무료 플랜 노트 한도 — 절대 초과 지급하지 않는다
  let _giftNote    = null;   // 지급할 완성본
  let _giftPending = null;   // 선물 모달을 닫은 뒤 이어서 할 일

  function _snapshotGiftNote() {
    try {
      const raw = sessionStorage.getItem(GIFT_SONG_KEY);
      _giftNote = raw ? JSON.parse(raw) : null;
    } catch (_) { _giftNote = null; }
  }

  // 분기1(무료 + 노트 3개 이상)은 아예 묻지 않는다 — 이미 자기 노트로 한도를 채운 유저다.
  function _canOfferGift() {
    if (!_giftNote) return false;
    if (typeof loadProjects !== 'function') return false;
    const isPro = (typeof getPlan === 'function') && getPlan() === 'pro';
    if (isPro) return true;
    try { return (loadProjects() || []).length < GIFT_FREE_LIMIT; } catch (_) { return false; }
  }

  // 완료 모달을 닫은 뒤 호출. 선물을 띄웠으면 true(이어질 동작은 선물 모달이 맡는다).
  function _maybeOfferGift(after) {
    const overlay = document.getElementById('tutorial-gift-overlay');
    if (!overlay || !_canOfferGift()) return false;
    _giftPending = after;
    overlay.classList.remove('hidden');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
    return true;
  }

  function _closeGift() {
    document.getElementById('tutorial-gift-overlay')?.classList.add('hidden');
    _giftNote = null;
    try { sessionStorage.removeItem(GIFT_SONG_KEY); } catch (_) {} // 재지급 방지
    const after = _giftPending;
    _giftPending = null;
    if (typeof after === 'function') after();
  }

  function acceptGift() {
    // 여기서는 샌드박스가 이미 해제된 상태 → saveProjects가 실제 저장소에 쓴다.
    // 한도는 다시 한 번 확인한다(모달이 떠 있는 사이 다른 탭에서 노트가 늘었을 수 있다).
    if (_giftNote && _canOfferGift()) {
      try {
        const list = loadProjects() || [];
        const note = { ..._giftNote, id: 'p' + Date.now(), updatedAt: Date.now() };
        list.push(note);
        saveProjects(list);
        if (typeof analytics !== 'undefined') analytics.track('tutorial_gift_accepted', { step: _noOf('note-edit') });
      } catch (_) {}
    }
    _closeGift();
  }

  function declineGift() {
    if (typeof analytics !== 'undefined') analytics.track('tutorial_gift_declined', { step: _noOf('note-edit') });
    _closeGift();
  }

  // ── 스텝 완료 ──────────────────────────────────────────────
  async function _finishStep() {
    const chap = _chap();
    // 선물 노트는 '노트 더 알아보기' 챕터에 붙어 있다 — 자리 번호(no)는 변형마다 달라지므로 key로 판별한다
    if (chap.key === 'note-edit') _snapshotGiftNote(); // _teardown() 전에 떠야 한다
    _teardown();
    // 변형마다 번호↔챕터 매핑이 다르므로 key를 함께 남긴다(번호만으론 어떤 스텝인지 알 수 없다).
    if (typeof analytics !== 'undefined') analytics.track('tutorial_step_completed', { step: chap.no, chapter: chap.key });

    const s = getState();
    const merged = { ...s, step: Math.max(s.step || 0, chap.no) };
    _state = merged;
    _localSet(merged);
    refreshEntryDot(); // 마지막 스텝을 끝냈으면 강조 dot도 여기서 꺼진다

    // 선물이 있으면 완료 모달보다 먼저 묻고, 답하면 완료 모달로 이어진다.
    // 완료 모달은 서버 응답이 늦거나 실패해도 반드시 뜬다.
    _doneReward = 0;
    _donePromo  = false;
    if (!_maybeOfferGift(() => _openDoneModal(chap))) _openDoneModal(chap);

    // 보상 금액은 서버가 정한다(클라가 액수를 보내지 않음). 재지급은 서버에서 차단.
    if (typeof _peakRpc === 'function') {
      const r = await _peakRpc('complete_tutorial_step', { p_step: chap.no });
      if (r?.ok && r.reward > 0) _showDoneReward(r.reward);
      // 마지막 챕터를 끝냈으면 전체 완료 시각을 남긴다 — 완주 보상(7일 Pro 체험)의 만료 기준이 된다.
      // _teardown()은 _chapter를 건드리지 않으므로 여기서도 _hasNextChapter()가 유효하다.
      // 서버가 이 스텝을 실제로 반영했을 때만 기록한다 — 순서가 어긋나 거절된 채로 기록하면
      // tutorial_step이 끝까지 올라가 밀린 스텝의 보상이 사라진다(loadState의 재전송도 막힌다).
      if (!_hasNextChapter() && (r?.ok || r?.reason === 'already_claimed')) {
        const r2 = await _peakRpc('complete_tutorial', { p_step: chap.no });
        // 7일 Pro 체험은 유저가 코드를 입력하지 않는다 — complete_tutorial 안에서
        // 서버가 알아서 태운다(redeem_promo_code 내부 호출, 최초 완료 1회만).
        if (r2?.promo?.ok && r2.promo.plan === 'pro') {
          _showDonePromo();
          if (typeof fetchWebPlan === 'function') fetchWebPlan().catch(() => {});
        }
      }
    }
  }

  function _openDoneModal(chap) {
    const overlay = document.getElementById('tutorial-done-overlay');
    if (!overlay) { _returnHomeAndRelease(); return; }

    document.getElementById('tutorial-done-title').textContent   = chap.doneTitle;
    document.getElementById('tutorial-done-message').textContent = chap.doneDesc;

    // 보상 줄은 서버 응답이 오면 그때 채운다 (이미 받은 스텝이면 끝까지 감춰짐).
    // 선물 모달을 먼저 띄운 경우 응답이 이 모달보다 먼저 올 수 있으므로, 받아둔 값을 여기서 복원한다.
    document.getElementById('tutorial-done-reward').classList.add('hidden');
    if (_doneReward > 0) _showDoneReward(_doneReward);

    // 7일 Pro 체험 줄도 같은 이유로 초기화 후 복원한다.
    // note-edit 챕터가 선물과 겹치는 변형(B의 마지막 챕터)에서는 완주 보상까지 같은 타이밍에 몰린다.
    document.getElementById('tutorial-done-promo')?.classList.add('hidden');
    if (_donePromo) _showDonePromo();

    // 이어서 할 챕터가 준비돼 있을 때만 "계속하기"를 띄운다
    const contBtn = document.getElementById('tutorial-done-continue');
    const hasNext = _hasNextChapter();
    // 보상은 모달이 열리는 시점에 서버에서 이미 지급된다(버튼 클릭과 무관).
    // 그래서 이어가기 버튼은 다음 스텝 이름이 아니라 "계속할지"만 묻는다.
    contBtn.classList.toggle('hidden', !hasNext);
    if (hasNext) contBtn.textContent = '이어서 할래요!';
    document.getElementById('tutorial-done-later').textContent = hasNext ? '나중에 할게요' : '확인';

    overlay.classList.remove('hidden');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
  }

  // 선물 모달엔 보상 표시가 없다 — 보상은 항상 완료 모달에서만 보여준다.
  // 서버 응답이 완료 모달보다 먼저(선물 모달이 떠 있는 동안) 올 수 있어 값을 보관해 둔다.
  let _doneReward = 0;

  function _showDoneReward(reward) {
    _doneReward = reward;
    const count = document.getElementById('tutorial-done-reward-count');
    if (count) count.textContent = '+' + reward + ' 상자';
    document.getElementById('tutorial-done-reward')?.classList.remove('hidden');
  }

  // 완주 보상(7일 Pro 체험) — 스텝 보상과 별개 줄. 같은 이유로 값을 보관해 둔다.
  let _donePromo = false;

  function _showDonePromo() {
    _donePromo = true;
    document.getElementById('tutorial-done-promo')?.classList.remove('hidden');
  }

  function _hideDoneModal() {
    document.getElementById('tutorial-done-overlay')?.classList.add('hidden');
    if (typeof renderPeakboxBadge === 'function') renderPeakboxBadge();
  }

  // 완료 모달 → 다음 스텝 바로 이어가기
  async function continueNext() {
    _hideDoneModal();
    // 변형마다 번호↔챕터 매핑이 다르므로 key를 함께 남긴다.
    if (typeof analytics !== 'undefined') analytics.track('tutorial_step_continued', { step: _chap().no, chapter: _chap().key });
    _chapter++;
    if (!_steps().length) { _returnHomeAndRelease(true); return; } // 챕터가 더 없음 = 사실상 완주
    _chap().onStart?.();

    _idx     = 0;
    _running = true;
    _runSave(); // 이동 전에 위치를 남긴다 — enterFirst가 페이지를 옮기면 resume()이 이어받는다

    // 앞 스텝이 끝난 화면(에디터 등)에 머물러 있으므로 0번 구간이 있는 화면으로 되돌린다
    if (_chap().enterFirst) {
      await _chap().enterFirst();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    _installGuard();
    _render();
  }

  // 완료 모달 → 여기서 잠시 중단. 건너뛰기와 달리 skipped 플래그는 세우지 않는다
  // (다음 접속 때 남은 스텝을 이어서 안내할 수 있도록).
  function closeDoneModal() {
    // _chapter는 continueNext()에서만 증가한다 — 이 시점엔 방금 끝낸 챕터를 아직 가리키고
    // 있으므로, 다음 챕터가 없다(=완주) 여부를 여기서 정확히 알 수 있다.
    const wasLast = !_hasNextChapter();
    _hideDoneModal();
    _returnHomeAndRelease(wasLast);
  }

  // 앱 쪽에서 상태 변화를 알려주는 창구 (예: notify('view:editor'))
  // advanceOn은 문자열(이벤트 일치) 또는 함수(조건 판정)를 받는다.
  // 함수형은 "가사가 정확히 이 문장인가"처럼 값까지 봐야 하는 구간에 쓴다.
  function notify(evt) {
    if (!_running) return;
    const cond = _cur()?.advanceOn;
    if (!cond) return;

    // 문자열 조건은 이벤트 이름만 보므로 즉시 판정한다.
    // 미루면 안 된다 — notify 직후 페이지를 넘기는 호출부가 있어(예: notecreate:done → openProject)
    // 한 프레임만 늦어도 알림이 통째로 사라진다.
    if (typeof cond !== 'function') {
      if (cond === evt) next();
      return;
    }

    // 함수형 조건은 DOM을 읽는다. 호출부가 렌더보다 먼저 알려도 맞게 판정되도록 한 프레임 미룬다.
    // "notify는 반드시 렌더 뒤에" 라는 규칙을 주석이 아니라 구조로 보장하는 자리다.
    requestAnimationFrame(() => {
      if (!_running) return;
      if (_cur()?.advanceOn !== cond) return; // 기다리는 사이 구간이 바뀌었으면 폐기
      if (cond(evt)) next();
    });
  }

  // ── 재진입 모달 ────────────────────────────────────────────
  // 건너뛰었거나 중간에 멈춘 유저가 우상단 아이콘으로 다시 들어오는 자리.
  // 퀘스트 보상 모달과 분리해서 별도로 둔다(사용자 결정).
  function openTutorialModal() {
    const overlay = document.getElementById('tutorial-modal-overlay');
    if (!overlay) return;
    renderTutorialList(); // 우선 로컬 미러로 즉시 그리고
    overlay.classList.add('tutorial-modal-overlay--show');
    if (typeof _playSfx === 'function') _playSfx('page.mp3');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // 배정(스텝 순서)과 서버 진행도(기기 교체 등)를 받아오면 다시 그린다.
    _ensureVariant()
      .then(() => (_loaded ? null : loadState()))
      .then(() => renderTutorialList())
      .catch(() => {});
  }

  // 스텝 목록 — 좌측 타이틀 / 우측 상태 버튼.
  // 앞 스텝을 끝내기 전엔 다음 스텝을 못 연다(퀘스트 체인이므로 순서가 곧 전제 조건).
  // 실제로 STEP4·5의 설명 문구가 앞 스텝을 해봤다는 걸 전제하고 쓰여 있다.
  function renderTutorialList() {
    const body = document.getElementById('tutorial-modal-body');
    if (!body) return;
    body.innerHTML = '';

    const done = getState().step || 0; // 완료한 마지막 스텝 번호

    CHAPTERS.forEach(chap => {
      if (!chap.steps?.length) return; // 아직 구간이 안 채워진 챕터는 숨긴다

      const cleared = chap.no <= done;      // 이미 완료
      const locked  = chap.no > done + 1;   // 앞 스텝 미완료 → 잠금

      const row = document.createElement('div');
      row.className = 'tut-list-row' + (locked ? ' tut-list-row--locked' : '');

      const name = document.createElement('span');
      name.className = 'tut-list-title';
      name.textContent = `STEP${chap.no} | ${chap.title || ''}`;

      const btn = document.createElement('button');
      btn.className = 'tut-list-btn';
      if (locked) {
        btn.classList.add('tut-list-btn--locked');
        btn.textContent = '잠김';
        btn.disabled = true;
      } else {
        btn.textContent = cleared ? '다시 보기' : '시작';
        if (cleared) btn.classList.add('tut-list-btn--again');
        btn.addEventListener('click', () => {
          closeTutorialModal();
          startAt(chap.no, 0);
        });
      }

      row.append(name, btn);
      body.appendChild(row);
    });
  }

  function closeTutorialModal() {
    document.getElementById('tutorial-modal-overlay')
      ?.classList.remove('tutorial-modal-overlay--show');
  }

  // ── 구간별 게이트 ──────────────────────────────────────────
  // 진행 중일 때만 현재 구간을 준다. 게이트 3종이 공유하는 단일 판정 지점.
  function _cur() {
    return _running ? (_steps()[_idx] || null) : null;
  }

  // 캔버스 클릭 허용 칸 — home.js 클릭 핸들러가 게이트로 쓴다.
  function canvasCell() { return _cur()?.canvasCell || null; }

  // 코드슬롯 드롭 허용 칸 {line, slot} — user_project.js의 placeChordInSlot이 게이트로 쓴다.
  function slotCell()   { return _cur()?.slotCell   || null; }

  // 이 구간에서 페이지 이탈을 막아야 하는가.
  // 드래그를 유도하는 구간에서 실수로 탭했을 때 에디터로 나가버리는 걸 방지한다.
  function blocksNav()  { return !!_cur()?.noNav; }

  // 이 구간에서 보이싱 모달이 닫히면 안 되는가.
  // 모달 여백·오버레이를 잘못 눌러 목록이 사라지면 설명이 가리키는 대상이 없어진다.
  function locksVoicing() { return !!_cur()?.lockVoicing; }

  // 앱 쪽에서 "지금부터 다음 버튼을 눌러도 된다"고 열어줄 때 쓴다.
  // advanceOn 없이 optional도 아닌(=기본 비활성) 구간에서, 어떤 동작이 일어난 뒤
  // 일정 시간 지나면 버튼만 풀어주고 자동으로는 넘기지 않는 패턴에 쓴다.
  // (예: 코드 재생 1초 후 — 자동 진행은 안 하되 더 안 기다리고 넘길 수 있게)
  function enableNext() {
    if (!_running) return;
    const nextBtn = document.getElementById('tut-next');
    if (nextBtn) nextBtn.disabled = false;
  }

  // 시작 모달에서든 스텝 중간에서든 동일 경로. 진행도(step)는 보존한다.
  async function skip() {
    closeStartModal();
    // step은 "완료한 스텝 수"라 어느 챕터에서 그만뒀는지는 알 수 없다 → 진행 중이던
    // 챕터 key를 따로 남긴다(_teardown이 _running을 끄므로 그 전에 읽는다).
    // 시작 모달에서 누른 경우는 아직 어떤 챕터도 안 열었으므로 null.
    const atChapter = _running ? (_chap()?.key || null) : null;
    _teardown();
    const s = getState();
    const next = { ...s, skipped: true };
    _state = next;
    _localSet(next);
    if (typeof analytics !== 'undefined') analytics.track('tutorial_skipped', { step: s.step || 0, chapter: atChapter });
    if (typeof _peakRpc === 'function') _peakRpc('skip_tutorial');
    _returnHomeAndRelease(true); // 건너뛰기 = 항상 대상
  }

  // 진행 중(_running)일 때만 확인을 거친다 — 시작 모달의 건너뛰기는 아직 아무것도
  // 진행한 게 없으므로 곧장 skip()으로 보낸다.
  // 훈련 중 이탈 확인과 기능이 같으므로 앱 표준 showLeavePracticeModal을 그대로 쓴다.
  function confirmSkip() {
    if (!_running) { skip(); return; }
    if (typeof showLeavePracticeModal !== 'function') { skip(); return; }
    showLeavePracticeModal(() => skip(), {
      title: '튜토리얼을 그만두시겠어요?',
      desc:  '지금 나가면 진행 중인 스텝을<br>처음부터 다시 해야 해요.',
    });
  }

  // ── 콘솔 테스트용 ──────────────────────────────────────────
  // 특정 스텝의 특정 구간부터 강제 시작. 앞 구간의 setup·simulate를 즉시 재생해
  // 캔버스 상태를 최대한 맞춘다. 단 바레·샵플랫·손가락번호처럼 유저가 눌러야
  // 바뀌는 상태는 재현되지 않으니, 그 구간을 볼 땐 직접 눌러 도달할 것.
  async function startAt(stepNo = 1, idx = 0) {
    const ci = CHAPTERS.findIndex(c => c.no === stepNo);
    if (ci === -1 || !CHAPTERS[ci].steps.length) return;

    _teardown();
    _chapter = ci;
    _chap().onStart?.();
    const steps  = _steps();
    const target = Math.max(0, Math.min(idx, steps.length - 1));

    _idx     = target;
    _running = true;
    _runSave(); // 이동 전에 위치 저장 (enter가 페이지를 옮기는 챕터 대비)

    // 해당 구간이 있는 화면으로 먼저 이동 — 캔버스·목록이 있어야 좌표가 잡힌다
    const enterFn = target > 0 ? _chap().enter : _chap().enterFirst;
    if (enterFn) {
      await enterFn();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    for (let i = 0; i < target; i++) {
      steps[i].setup?.();
      steps[i].simulate?.forEach(cell => window.tutorialTapDot?.(cell.s, cell.f));
    }

    _installGuard();
    _render();
  }

  function reset() {
    _state  = { step: 0, skipped: false, completed: null };
    _loaded = false;
    _localSet(_state);
  }

  // 로그아웃용 — 로컬 미러를 전부 비운다(shared.js signOutWeb이 부른다).
  // 진행도·배정 두 키 모두 user_id로 키잉되지 않아서, 그대로 두면 같은 기기에서
  // 다음에 로그인한 계정이 이전 계정의 진행도(skipped 포함)와 변형 배정을 물려받는다.
  // 특히 배정은 _ensureVariant가 미러 있으면 서버를 안 읽으므로 영영 교정되지 않는다.
  function clearLocal() {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_VARIANT);
    } catch (_) {}
    _runClear();
    _state   = null;
    _loaded  = false;
    _variant = null;
  }

  return {
    loadState, getState, shouldAutoStart,
    runHomeEntryFlow, openStartModal, closeStartModal,
    startFromModal, start, startAt, resume, isRunning, next, notify, repaint,
    canvasCell, slotCell, blocksNav, locksVoicing, enableNext, skip, confirmSkip, reset, clearLocal,
    continueNext, closeDoneModal,
    openTutorialModal, closeTutorialModal, refreshEntryDot,
    acceptGift, declineGift,
    // 배정 후 배열이 교체되므로 스냅샷이 아니라 getter로 내보낸다
    get CHAPTERS() { return CHAPTERS; },
  };
})();

// ── 전역 노출 (HTML onclick / 콘솔) ────────────────────────────
if (typeof window !== 'undefined') {
  window.Tutorial         = Tutorial;
  window.runHomeEntryFlow = () => Tutorial.runHomeEntryFlow();
  // HTML onclick에서 부른다
  window.openTutorialModal  = () => Tutorial.openTutorialModal();
  window.closeTutorialModal = () => Tutorial.closeTutorialModal();
  // startTutorial()        → 저장된 진행도에 이어서 처음부터
  // startTutorial(1, 7)    → STEP1의 8번째 구간부터 (0부터 셈)
  window.startTutorial    = (stepNo, idx) => {
    Tutorial.closeStartModal();
    if (stepNo === undefined) Tutorial.start();
    else                      Tutorial.startAt(stepNo, idx || 0);
  };
  window.resetTutorial    = () => Tutorial.reset();
}
