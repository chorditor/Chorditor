// ───────────────────────────────────────────────────────────
// fret-gesture.js — 화면 지판에서 주법(해머링·풀링오프·슬라이드)을 감지하는 공용 부품 (2026-11-20, 여정 노드20)
//
//   손가락마다 번호(pointerId)를 붙여 뗄 때까지 따라감(멀티터치). 한 줄에서 소리 나는 음 = 그 줄에 눌린 프렛 중 가장 오른쪽(실제 기타와 같음).
//     누를 때  — 그 줄에 아무것도 안 눌려 있음 → pick(피크로 친 것처럼 새 울림)
//               지금 울리는 음보다 오른쪽 → hammer(해머링)
//               왼쪽 → press(소리 변화 없음 — 실제 기타도 울리는 손가락 뒤를 짚으면 소리가 안 바뀜)
//     뗄 때    — 울리던(가장 오른쪽) 손가락을 '위(1번줄 쪽)로 빠르게 긁으며' 뗐을 때만 pull(풀링오프, 2026-11-23 사용자 지정) —
//                 화면에선 '그냥 떼기'와 '풀링오프'를 구분할 방법이 없어서 실제 연주처럼 줄을 가볍게 긁는 동작으로 가름(아래 FLICK_*).
//                 왼쪽에 눌린 손가락이 남아 있으면 그 음으로, 없으면 개방현으로(f 0). 긁지 않고 떼면 stop(소리 멈춤)
//               울리지 않던 손가락을 뗌 → release(소리 변화 없음)
//     밴딩 자리(아직 없음): 누른 채 천천히 위아래로 미는 동작 — 풀링오프는 '떼기 직전 짧은 시간 안의 빠른 긁기'만 인정해서 겹치지 않게 비워 둠
//     잔상은 여기서 그리지 않음 — 긁는 법 안내는 강의가 쉬는 동안만 점으로 보여 줌(guitar-techniques.js flickGuide, 2026-11-23 사용자 지정)
//     누른 채 같은 줄을 따라 이동 — slide(프렛선을 넘을 때마다 한 칸씩 이벤트)
//   빠른 두 번 터치와 슬라이드 구분: 시간으로 가르지 않음. 떼었다 다시 닿으면 다른 번호의 터치(= 새로 누름), 떼지 않고 다른 칸으로 들어가면 같은 번호(= 슬라이드).
//     손가락 떨림은 업계 표준 '터치 슬롭'(Android ViewConfiguration — 처음 닿은 뒤 약 8px 안 움직임 무시) + 칸 경계를 칸 폭의 25% 넘게 지나야 다음 칸(히스테리시스)
//   다른 줄로의 이동·위아래로 미는 동작(밴딩)은 무시(밴딩은 노드20에서 쓰지 않음 — 사용자 지정)
//   마우스(누르는 점이 하나라 손가락 두 개를 못 씀) — Shift = 첫 손가락을 짚어 두는 키(2026-11-23 사용자 지정, 이전 방식 대체):
//     Shift를 누른 채 클릭한 '그 줄의 첫 음'만 고정 — Shift를 누르고 있는 동안은 그 프렛을 계속 누르고 있는 것(버튼을 떼도 짚은 채 울림).
//     그다음 클릭은 Shift를 누르고 있어도 Shift 영향 없이 보통 손가락: 더 높은 칸을 누르면 hammer, 그 손가락을 떼면 짚어 둔 음으로 pull.
//     → 해머링 = Shift 누른 채 3 → 5 / 풀링오프 = Shift 누른 채 3 → 5를 눌렀다 떼기. Shift를 떼면 짚어 둔 음 즉시 멈춤. 창이 포커스를 잃어도 멈춤
//     Shift 없는 클릭 = 늘 일반 터치(새로 침), 끌기 = slide(터치와 같음). 터치 규칙은 그대로
//
//   FretGesture.attach(neckEl, { lo, cols, minF, maxF, onEvent(ev), enabled() }) → { reset(), detach(), held(s), sounding(s), anchor(s, f) }
//     anchor(s, f) = 그 줄 f프렛을 '늘 짚고 있는' 손가락으로 둠(f = null이면 해제, reset()도 해제) — 풀링오프 강의(2026-11-23 사용자 지정: 마우스는 두 칸을 함께 못 눌러서
//       아래 손가락을 자동으로 짚어 둠). 위 칸을 눌렀다 떼면 pull, held()에도 들어감
//     lo = 지판 창 첫 칸의 프렛, cols = 칸 수(창 폭을 칸 수로 나눔), minF~maxF = 누를 수 있는 프렛(밖은 무시·끌면 끝 칸에 머묾)
//     ev = { type: 'pick'|'hammer'|'pull'|'slide'|'press'|'release'|'stop', s(줄 1~6), f(이 이벤트 뒤 그 손가락·소리의 프렛), from(앞 프렛) }
//   FretGesture.play(ev, opt) — 이벤트를 소리로(GuitarAudio.artNote·artLegato·artSlide·artStop). opt.phrase(s, f) = 샘플 고르기용 음 목록(선택)
// ───────────────────────────────────────────────────────────
const FretGesture = (function () {
  'use strict';
  const SLOP_PX = 8;        // 터치 슬롭 — 이 거리 안의 떨림은 이동으로 보지 않음
  const HYST = 0.25;        // 칸 경계를 칸 폭의 이 비율만큼 넘어야 다음 칸
  // 풀링오프 긁기 판정(기기에서 조정할 시작값 — 2026-11-23): 떼기 직전 FLICK_MS 안에 위로 줄 간격 × FLICK_GAP 이상, 속도 FLICK_SPEED(px/ms) 이상, 위쪽이 옆보다 큼
  const FLICK_MS = 120, FLICK_GAP = 0.4, FLICK_MIN_PX = 6, FLICK_SPEED = 0.15;

  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 1→6번줄

  function attach(el, o) {
    const ptrs = new Map();   // pointerId → { s, f, x0, y0, moved }
    const held = {};          // 줄 → Map(pointerId → 프렛)
    const snd = {};           // 줄 → 지금 소리 나는 프렛(없으면 null)
    const shiftHold = {};     // 줄 → 마우스 Shift로 짚어 둔 첫 음의 프렛(Shift를 떼면 해제)
    const emit = function (ev) { if (o.onEvent) o.onEvent(ev); };
    const anchors = {};       // 줄 → 늘 짚고 있는 프렛(anchor)
    function maxHeld(s) { let m = anchors[s] != null ? anchors[s] : null; if (shiftHold[s] != null && (m === null || shiftHold[s] > m)) m = shiftHold[s]; (held[s] || new Map()).forEach(function (f) { if (m === null || f > m) m = f; }); return m; }
    function cellAt(e) {
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width * o.cols;
      return { s: Math.floor((e.clientY - r.top) / r.height * 6) + 1, f: Math.floor(fx) + o.lo, frac: fx - Math.floor(fx) };
    }
    function down(e) {
      if (o.enabled && !o.enabled()) return;
      const c = cellAt(e);
      if (c.s < 1 || c.s > 6 || c.f < o.minF || c.f > o.maxF) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      const h = held[c.s] || (held[c.s] = new Map());
      // Shift 규칙은 입력 종류를 가리지 않음 — 크롬 개발자도구 모바일 에뮬레이션은 마우스를 터치(pointerType 'touch')로 바꿔 보냄(2026-11-20 확인). 실제 휴대폰 터치엔 Shift가 없어 영향 없음
      //  그 줄에 아무것도 없을 때 Shift로 누른 첫 음 = 뗀 뒤 짚어 둘 음(first)
      ptrs.set(e.pointerId, { s: c.s, f: c.f, x0: e.clientX, y0: e.clientY, moved: false, hist: [[performance.now(), e.clientX, e.clientY]], first: !!e.shiftKey && !h.size && shiftHold[c.s] == null && anchors[c.s] == null });
      let cur = snd[c.s] == null ? null : snd[c.s];
      // 울리는 음을 실제로 누르고 있는 손가락(닿은 손가락·마우스 Shift)이 없으면 — 자동으로 짚어 둔 자리(anchor)로 풀링오프한 뒤 남은 소리 등 — 새 터치는 튕김(2026-11-23 사용자 지적:
      //  풀링오프를 한 번 하면 3프렛이 '울리는 중'으로 남아 다음 5프렛 터치가 해머링이 되어 다시 따라 할 수 없었음)
      if (cur !== null && shiftHold[c.s] !== cur && Array.from(h.values()).indexOf(cur) < 0) cur = null;
      h.set(e.pointerId, c.f);
      if (cur === null) { snd[c.s] = c.f; emit({ type: 'pick', s: c.s, f: c.f, from: null }); }
      else if (c.f > cur) { snd[c.s] = c.f; emit({ type: 'hammer', s: c.s, f: c.f, from: cur }); }
      else emit({ type: 'press', s: c.s, f: c.f, from: cur });
    }
    function move(e) {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const now = performance.now();
      p.hist.push([now, e.clientX, e.clientY]);
      while (p.hist.length > 2 && now - p.hist[0][0] > FLICK_MS * 3) p.hist.shift();
      if (!p.moved) {
        if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < SLOP_PX) return;
        p.moved = true;
      }
      const c = cellAt(e);
      let tgt = c.f;
      if (tgt > p.f && c.frac < HYST) tgt--;            // 오른쪽 칸에 막 들어감 — 아직
      else if (tgt < p.f && c.frac > 1 - HYST) tgt++;   // 왼쪽 칸에 막 들어감 — 아직
      tgt = Math.max(o.minF, Math.min(o.maxF, tgt));
      const h = held[p.s];
      while (p.f !== tgt) {   // 빨리 끌어 여러 칸을 한 번에 넘어도 한 칸씩
        const nf = p.f + (tgt > p.f ? 1 : -1);
        const before = snd[p.s];
        p.f = nf;
        h.set(e.pointerId, nf);
        const after = maxHeld(p.s);
        if (after !== before) { snd[p.s] = after; emit({ type: 'slide', s: p.s, f: after, from: before }); }
      }
    }
    // 떼기 직전 FLICK_MS 동안의 움직임 — 위(1번줄 쪽)로 빠르고 충분히 긁었는가. 반환 { ok, x0, y0, x1, y1 }(화면 좌표)
    function flickOf(p, e) {
      const now = performance.now(), hs = p.hist.concat([[now, e.clientX, e.clientY]]);
      let k = hs.length - 1;
      while (k > 0 && now - hs[k - 1][0] <= FLICK_MS) k--;
      // 기준 위치 = 창(FLICK_MS) 직전 마지막 위치(가만히 있다가 긁은 경우 그 자리), 시간 = 창 안 첫 움직임부터(+ 한 프레임)
      const a = k > 0 ? hs[k - 1] : hs[0], dy = a[2] - e.clientY, dx = Math.abs(e.clientX - a[1]), dt = Math.max(16, now - hs[k][0] + 16);
      const minPx = Math.max(FLICK_MIN_PX, el.getBoundingClientRect().height / 6 * FLICK_GAP);
      return { ok: dy >= minPx && dy / dt >= FLICK_SPEED && dy > dx };
    }
    function up(e) {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      ptrs.delete(e.pointerId);
      const fl = flickOf(p, e);
      const h = held[p.s];
      h.delete(e.pointerId);
      const before = snd[p.s], after = maxHeld(p.s);
      if (p.first && e.shiftKey && e.type === 'pointerup') { shiftHold[p.s] = p.f; emit({ type: 'release', s: p.s, f: p.f, from: before }); return; }   // Shift 첫 음 — 뗀 뒤에도 짚은 채 울림
      const wasSounding = before != null && p.f >= before;   // 뗀 손가락이 울리던 음
      if (wasSounding && fl.ok) {   // 풀링오프 — 남은 손가락 음으로, 없으면 개방현
        if (after === null) { snd[p.s] = null; emit({ type: 'pull', s: p.s, f: 0, from: before }); }
        else { snd[p.s] = after; emit({ type: 'pull', s: p.s, f: after, from: before }); }
      } else if (after === null || wasSounding) { snd[p.s] = null; emit({ type: 'stop', s: p.s, f: p.f, from: before }); }   // 긁지 않고 뗌 — 멈춤(왼쪽 손가락이 남아 있어도)
      else emit({ type: 'release', s: p.s, f: p.f, from: before });
    }
    // Shift를 떼거나 창이 포커스를 잃으면 Shift로 짚어 둔 음을 놓음 — 손가락이 남아 있으면 그 음으로, 없으면 멈춤
    function unlatch() {
      Object.keys(shiftHold).forEach(function (s) {
        delete shiftHold[s];
        const before = snd[s], after = maxHeld(s);
        if (after === null) { snd[s] = null; emit({ type: 'stop', s: +s, f: before, from: before }); }
        else if (after < before) { snd[s] = after; emit({ type: 'pull', s: +s, f: after, from: before }); }
        else emit({ type: 'release', s: +s, f: before, from: before });
      });
    }
    function reset() {
      Object.keys(anchors).forEach(function (s) { delete anchors[s]; });
      Object.keys(shiftHold).forEach(function (s) { delete shiftHold[s]; });
      ptrs.forEach(function (p, id) { try { el.releasePointerCapture(id); } catch (err) {} });
      ptrs.clear();
      Object.keys(held).forEach(function (s) { delete held[s]; });
      Object.keys(snd).forEach(function (s) { delete snd[s]; });
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    window.addEventListener('blur', unlatch);
    function shiftUp(e) { if (e.key === 'Shift') unlatch(); }   // Shift를 떼면 짚어 둔 음 놓음(2026-11-23)
    window.addEventListener('keyup', shiftUp);
    return {
      reset: reset,
      detach: function () {
        reset();
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        window.removeEventListener('blur', unlatch);
        window.removeEventListener('keyup', shiftUp);
      },
      held: function (s) {   // 손가락 점 자리 = 지금 닿은 손가락 + 마우스 Shift로 짚어 둔 프렛 + 자동으로 짚어 둔 프렛(anchor)
        const out = held[s] ? Array.from(held[s].values()) : [];
        if (shiftHold[s] != null && out.indexOf(shiftHold[s]) < 0) out.push(shiftHold[s]);
        if (anchors[s] != null && out.indexOf(anchors[s]) < 0) out.push(anchors[s]);
        return out;
      },
      sounding: function (s) { return snd[s] == null ? null : snd[s]; },
      touching: function () { return ptrs.size > 0; },   // 지금 지판에 닿은 손가락이 있는가(안내 애니메이션을 쉬게)
      anchor: function (s, f) { if (f == null) delete anchors[s]; else anchors[s] = f; },
    };
  }

  function midiOf(s, f) { return OPEN_MIDI[s - 1] + f; }
  // 이벤트 → 소리. 줄마다 울림 하나(key 'fg<줄>')
  function play(ev, opt) {
    if (typeof GuitarAudio === 'undefined' || !GuitarAudio.artNote) return;
    const key = 'fg' + ev.s, m = midiOf(ev.s, ev.f);
    if (ev.type === 'pick') GuitarAudio.artNote(key, m, { phrase: opt && opt.phrase ? opt.phrase(ev.s, ev.f) : null });
    else if (ev.type === 'hammer') GuitarAudio.artLegato(key, m, 'hammer');
    else if (ev.type === 'pull') GuitarAudio.artLegato(key, m, 'pull', { open: ev.f === 0 });
    else if (ev.type === 'slide') GuitarAudio.artSlide(key, m, { msPerFret: 4 });   // 손가락이 프렛선을 넘는 그 순간 — 짧게
    else if (ev.type === 'stop') GuitarAudio.artStop(key, { fade: 0.03 });
  }

  // 마우스로 쓰는 기기인지(마우스 Shift 안내를 띄울지) — 휴대폰·태블릿(손가락)에서는 false
  function mouseDevice() { try { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } }

  return { attach: attach, play: play, midiOf: midiOf, mouseDevice: mouseDevice };
})();
