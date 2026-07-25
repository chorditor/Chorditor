// ═══════════════════════════════════════════════════════════════
// shared.js — onboarding.html / home.html 공통 코드
// DOM 조작 없음. 페이지별 함수는 typeof 가드로 호출.
// ═══════════════════════════════════════════════════════════════

// ── 상수 ─────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jbvkygeksohlysyvaoab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI';
const APP_VERSION   = '1.3.1_pre1';
const SUPABASE_STORAGE_KEY = 'sb-jbvkygeksohlysyvaoab-auth-token';

// ── Analytics SDK ─────────────────────────────────────────────
const analytics = (typeof AnalyticsSDK !== 'undefined')
  ? new AnalyticsSDK({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON, appVersion: APP_VERSION, debug: false })
  : { track: () => {}, setScreen: () => {}, setUserId: () => {}, clearUserId: () => {}, assignABVariant: async () => 'control' };

// ── 전역 스크롤 가드 ──────────────────────────────────────────
// 스크롤 중 버튼 오작동 방지. 모든 터치 인터랙션은 isScrolling() 체크 필수.
// Layer 1: pointermove 거리 기반 감지
// Layer 2: 모멘텀 속도 기반 잠금 (setScrolling으로 외부 제어)
(function() {
  let _startY    = 0;
  let _movelock  = false; // Layer 1: pointermove 기반
  let _velolock  = false; // Layer 2: 모멘텀 속도 기반
  let _veloTimer = null;
  const THRESHOLD = 8;

  document.addEventListener('pointerdown', e => {
    _startY   = e.clientY;
    _movelock = false;
  }, { capture: true, passive: true });

  document.addEventListener('pointermove', e => {
    if (!_movelock && Math.abs(e.clientY - _startY) > THRESHOLD) {
      _movelock = true;
    }
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', () => {
    setTimeout(() => { _movelock = false; }, 100);
  }, { capture: true, passive: true });

  // 모멘텀 애니메이션 중 외부에서 잠금 제어
  window.setScrolling = (val, graceMs = 80) => {
    if (val) {
      _velolock = true;
      if (_veloTimer) clearTimeout(_veloTimer);
    } else {
      if (_veloTimer) clearTimeout(_veloTimer);
      if (graceMs === 0) {
        _velolock = false; // 동기 즉시 해제 (pointerdown보다 먼저 처리)
      } else {
        _veloTimer = setTimeout(() => { _velolock = false; }, graceMs);
      }
    }
  };

  window.isScrolling = () => _movelock || _velolock;
})();

// ── 데스크탑 마우스 드래그 스크롤 ─────────────────────────────
// 웹 브라우저에서는 마우스 드래그로 overflow 스크롤이 안 됨 → 휠피커류에 드래그 지원.
// 터치(모바일)는 네이티브 스크롤 그대로 사용 (pointerType 'mouse'만 처리).
function enableMouseDragScroll(el) {
  if (!el || el._mouseDragScroll) return;
  el._mouseDragScroll = true;
  let dragging = false, moved = false, startY = 0, startTop = 0, savedSnap = '';
  let suppressClickUntil = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true; moved = false;
    startY = e.clientY; startTop = el.scrollTop;
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dy) > 3) {
      moved = true;
      savedSnap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none'; // 드래그 중 snap 간섭 방지
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (moved) { el.scrollTop = startTop - dy; e.preventDefault(); }
  });

  const _endDrag = (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    dragging = false;
    if (moved) {
      el.style.scrollSnapType = savedSnap; // snap 복원 → 가까운 항목으로 스냅
      suppressClickUntil = performance.now() + 80; // 드래그 직후 click 오작동 차단
    }
  };
  el.addEventListener('pointerup', _endDrag);
  el.addEventListener('pointercancel', _endDrag);

  el.addEventListener('click', (ce) => {
    if (performance.now() < suppressClickUntil) { ce.stopPropagation(); ce.preventDefault(); }
  }, { capture: true });
}
window.enableMouseDragScroll = enableMouseDragScroll;

// ── 화면 회전 잠금 ────────────────────────────────────────────
// user_project.html(노트 편집)만 가로 회전 허용, 나머지 전 페이지 세로 고정.
// 실제 잠금/해제는 페이지별 진입 시점(각 페이지 DOMContentLoaded)에 걸어야
// 이전 페이지의 잠금 상태가 새 페이지로 새지 않는다.
(function() {
  const SO = window.Capacitor?.Plugins?.ScreenOrientation;
  if (!SO) return; // 웹 브라우저: 네이티브 회전 제어 불가, 무시
  if (!location.pathname.includes('user_project.html')) {
    SO.lock({ orientation: 'portrait' }).catch(() => {});
  }
})();

// ── 네트워크 오프라인 오버레이 ────────────────────────────────
(function() {
  function _showOffline() {
    if (document.getElementById('network-offline-overlay')) return;
    const el = document.createElement('div');
    el.id = 'network-offline-overlay';
    el.innerHTML = `
      <div class="network-offline-box">
        <span class="network-offline-icon">✈︎</span>
        <p class="network-offline-title">인터넷 연결 없음</p>
        <p class="network-offline-desc">네트워크 연결을 확인해주세요</p>
        <button class="network-offline-btn" onclick="location.reload()">새로고침</button>
      </div>`;
    document.body.appendChild(el);
  }
  function _hideOffline() {
    document.getElementById('network-offline-overlay')?.remove();
  }
  window.addEventListener('offline', _showOffline);
  window.addEventListener('online',  _hideOffline);
  if (!navigator.onLine) {
    document.addEventListener('DOMContentLoaded', _showOffline, { once: true });
  }
})();

// ── localStorage 유틸 ─────────────────────────────────────────
function safeSave(key, value) {
  try {
    localStorage.setItem(key, value);
    if (typeof hideStorageWarning === 'function') hideStorageWarning();
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      if (typeof showStorageWarning === 'function') showStorageWarning();
    }
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isMobileOrTablet() {
  return window.innerWidth <= 1400;
}

// ── 프로젝트 스토리지 ─────────────────────────────────────────
function loadProjects() {
  try { return JSON.parse(localStorage.getItem('chorditor_projects') || '[]'); }
  catch(e) { return []; }
}

function saveProjects(projects) {
  const prevIds = loadProjects().map(p => p.id); // 덮어쓰기 전에 캡처 — 삭제분 DB 반영용
  safeSave('chorditor_projects', JSON.stringify(projects));
  _syncProjectsToDB(projects, prevIds).catch(() => {}); // 비동기 백그라운드, 로컬 흐름은 그대로 동기
}

// ── 프로젝트 DB 백업 미러 + 공유 코드 ───────────────────────────
// 로컬(localStorage)이 계속 source of truth. 저장될 때마다 조용히 DB에 따라가서,
// 앱을 지워도 로그인만 하면 프로젝트(가사 포함)가 복구되게 함.
// 읽기 경로(loadProjects 등)는 그대로 로컬 — 앱 흐름/기존 호출부 수정 없음.
function _authSessionSync() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return null;
    const s = JSON.parse(stored);
    return (s?.access_token && s?.user?.id) ? s : null;
  } catch (e) { return null; }
}

async function _syncProjectsToDB(projects, prevIds) {
  const session = _authSessionSync();
  if (!session) return; // 비로그인 — 로컬 전용으로 계속 동작
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON,
    Authorization: 'Bearer ' + session.access_token,
  };
  const newIds = new Set(projects.map(p => p.id));
  const removedIds = (prevIds || []).filter(id => !newIds.has(id));
  try {
    if (removedIds.length) {
      // keepalive: 삭제 직후 location.href로 페이지 이동하는 흐름(deleteProject 등)이 있어서,
      // 이게 없으면 네비게이션이 이 요청을 끊어버려 DB row가 안 지워지는 문제가 있었음.
      await fetch(`${SUPABASE_URL}/rest/v1/projects?project_id=in.(${removedIds.join(',')})`, {
        method: 'DELETE', headers, keepalive: true,
      });
    }
    if (projects.length) {
      // code/payload는 여기서 안 보냄 — "공유하기"에서만 채움. 미포함 컬럼은 업서트 시 그대로 유지됨.
      const rows = projects.map(p => ({
        project_id: p.id,
        user_id: session.user.id,
        title: p.name || '',
        content: p,
        pinned: !!p.pinned,
        important: !!p.important,
        updated_at: new Date().toISOString(),
      }));
      // (업서트는 keepalive 안 씀 — 크롬은 keepalive 요청 바디를 64KB로 제한해서
      // content 전체를 보내는 이 요청엔 안 맞음. delete만 페이로드가 작아서 안전하게 적용)
      await fetch(`${SUPABASE_URL}/rest/v1/projects?on_conflict=project_id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
    }
  } catch (e) { /* 오프라인 등 — 다음 저장 때 다시 시도됨 */ }
}

const SHARE_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHARE_CODE16_RE  = /^[0-9A-Za-z]{16}$/;
function _genShareCode16() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => SHARE_CODE_CHARS[b % 62]).join('');
}

// 프로젝트당 공유 코드 1개 고정 — project.shareCode 있으면 재사용(payload만 최신화),
// 없으면 새로 발급. payloadStr은 호출측 buildSharePayload(project) 결과를 그대로 전달.
async function getOrCreateShareCode(project, payloadStr) {
  const session = _authSessionSync();
  if (!session) return null; // 공유 DB는 소유자 upsert라 로그인 필요 — 없으면 호출측에서 폴백
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON,
    Authorization: 'Bearer ' + session.access_token,
  };
  const payload = JSON.parse(payloadStr);
  const upsertWithCode = async code => {
    const body = [{
      project_id: project.id,
      user_id: session.user.id,
      title: project.name || '',
      content: project,
      code,
      payload,
      pinned: !!project.pinned,
      important: !!project.important,
      updated_at: new Date().toISOString(),
    }];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?on_conflict=project_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body),
    });
    return res.ok;
  };
  try {
    if (project.shareCode) {
      return (await upsertWithCode(project.shareCode)) ? project.shareCode : null;
    }
    for (let i = 0; i < 5; i++) { // code unique 충돌 시 재시도(사실상 발생 거의 안 함)
      const code = _genShareCode16();
      if (await upsertWithCode(code)) return code;
    }
    return null;
  } catch (e) { return null; }
}

// code로 공유 payload만 조회 (RLS 우회 RPC — 로그인 여부 무관하게 실행 가능)
async function _fetchSharedPayload(code) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_shared_payload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify({ p_code: code }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    if (!payload) return null;
    return (payload.v === 1 || payload.v === 2) ? payload : null;
  } catch (e) { return null; }
}

// 로그인 시 로컬↔DB 병합: DB에만 있는 프로젝트(재설치/새 기기)는 로컬로 복구,
// 로컬에만 있는 프로젝트(아직 한 번도 동기화 안 됨)는 DB로 업로드.
async function syncProjectsOnLogin() {
  const session = _authSessionSync();
  if (!session) return;
  const headers = { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + session.access_token };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${session.user.id}&select=project_id,content`,
      { headers }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const local = loadProjects();
    const dbIds = new Set(rows.map(r => r.project_id));

    let changed = false;
    const newerLocal = []; // 로컬이 DB보다 최신인 노트 → DB로 업로드
    const localIdx = new Map(local.map((p, i) => [p.id, i]));
    rows.forEach(r => {
      if (!r.content) return;
      const idx = localIdx.has(r.project_id) ? localIdx.get(r.project_id) : -1;
      if (idx === -1) { local.push(r.content); changed = true; return; }
      // 양쪽에 존재: content.updatedAt 비교 last-write-wins (다른 기기에서 편집한 최신본 반영)
      const dbT = r.content.updatedAt || 0;
      const localT = local[idx].updatedAt || 0;
      if (dbT > localT) { local[idx] = r.content; changed = true; }
      else if (localT > dbT) { newerLocal.push(local[idx]); }
    });
    if (changed) {
      safeSave('chorditor_projects', JSON.stringify(local));
      // 재설치 복구·타기기 최신본 반영 시 목록 화면 갱신
      if (typeof renderSidebar === 'function') renderSidebar();
    }

    const missingInDb = local.filter(p => !dbIds.has(p.id));
    const toUpload = missingInDb.concat(newerLocal);
    if (toUpload.length) await _syncProjectsToDB(toUpload, []);
  } catch (e) { /* 무시 — 다음 로그인 때 재시도 */ }
}

// ── 플랜 관리 ─────────────────────────────────────────────────
const PLAN_LIMITS = {
  free: { maxProjects: 3,        maxScale: 1 },
  pro:  { maxProjects: Infinity, maxScale: 3 },
};

function getPlan() {
  return localStorage.getItem('chorditor_plan') || 'free';
}

function setPlan(plan) {
  localStorage.setItem('chorditor_plan', plan);
  if (typeof updateExportScaleOptions === 'function') updateExportScaleOptions();
  if (typeof renderPlanBadge === 'function') renderPlanBadge();
  if (typeof renderPeakBadge === 'function') renderPeakBadge();
}

function getPlanLimit(key) {
  return (PLAN_LIMITS[getPlan()] || PLAN_LIMITS.free)[key];
}
function canCreateProject() { return loadProjects().length < getPlanLimit('maxProjects'); }
function canUseScale(scale)  { return scale <= getPlanLimit('maxScale'); }

// ── 인앱 재화: 일반 피크 (DB 기반, 유저별 30분마다 자동충전) ─────
const PEAK_CAP = 30;
const PEAKBOX_REWARD = 5;

// 효과음 프리로드 캐시 — 매번 new Audio()의 디스크 로드·디코드 지연 제거.
// 프리로드 안 하면 첫 재생이 100ms+ 늦어 화면전환(페이지 이동)과 레이스로 소리가 잘림.
// ⛔ 안드로이드 WebView는 HTMLAudioElement.volume 설정을 무시한다(하드웨어 볼륨만 적용).
//    → 효과음을 <audio>로 재생하면 설정>사운드 슬라이더가 전혀 안 먹힘(기타음만 조절되는 것처럼 보임).
//    그래서 효과음도 기타음과 동일하게 WebAudio(GainNode) 경로로 재생한다. <audio>는 폴백용.
const _sfxCache = {};
let   _sfxCtx     = null;
const _sfxBuffers = {};
function _getSfxCtx() {
  if (_sfxCtx) return _sfxCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { _sfxCtx = new AC(); } catch (e) { _sfxCtx = null; }
  return _sfxCtx;
}
function _preloadSfx(src) {
  const ctx = _getSfxCtx();
  if (ctx && !_sfxBuffers[src] && !_sfxBuffers['_loading_' + src]) {
    _sfxBuffers['_loading_' + src] = true;
    fetch('sound/' + src)
      .then(r => r.arrayBuffer())
      .then(buf => new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej)))
      .then(b => { _sfxBuffers[src] = b; })
      .catch(() => {});
  }
  let a = _sfxCache[src];
  if (!a) { a = new Audio('sound/' + src); a.preload = 'auto'; try { a.load(); } catch (e) {} _sfxCache[src] = a; }
  return a;
}
// 재생. 프리로드된 객체 재사용(currentTime=0으로 재시작) → play() 즉시 시작.
// play() 프로미스 반환 → 호출측이 재생 실패/시작을 감지해 후속 처리(페이지 이동 등) 가능.
// 실제 오디오 게인(진폭). localStorage 'sfx_volume'은 슬라이더 raw값(0~1)이고
// 청각은 로그 스케일이라 raw 그대로 쓰면 중간에서 별로 안 줄어듦 → raw² 지각 곡선 적용.
function _getSfxMasterVolume() {
  const v = parseFloat(localStorage.getItem('sfx_volume'));
  if (isNaN(v)) return 1;
  const raw = Math.max(0, Math.min(1, v));
  return raw * raw;
}
function _playSfx(src, vol) {
  const gain = ((vol == null) ? 1 : vol) * _getSfxMasterVolume();
  // 1순위: WebAudio — 안드로이드 포함 전 플랫폼에서 음량 조절이 실제로 먹는 유일한 경로
  const ctx = _getSfxCtx();
  const buf = _sfxBuffers[src];
  if (ctx && buf) {
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = gain;
      s.connect(g); g.connect(ctx.destination);
      s.start();
      return Promise.resolve();
    } catch (e) {}
  }
  // 폴백: 디코드 전이거나 WebAudio 미지원 — <audio>(안드로이드는 volume 무시될 수 있음)
  try {
    const a = _preloadSfx(src);
    a.volume = gain;
    a.currentTime = 0;
    const p = a.play();
    return (p && p.catch) ? p.catch(() => {}) : Promise.resolve();
  } catch (e) { return Promise.resolve(); }
}
// 버튼 탭 효과음 — 1.3.0 폐기(조작감 개선 미미). 더 나은 사운드 확보 시 재활성화.
function _playTap() { return Promise.resolve(); }

// 출석 랜덤상자 보상: 2~10 랜덤, 기댓값 3 (최빈값 2). SQL claim_daily_attendance()와 동일 가중치.
const ATTENDANCE_REWARD_WEIGHTS = [5000, 2500, 1250, 625, 313, 156, 78, 39, 39]; // 값 2~10, 합 10000
function _rollAttendanceReward() {
  let roll = Math.random() * 10000;
  for (let i = 0; i < ATTENDANCE_REWARD_WEIGHTS.length; i++) {
    roll -= ATTENDANCE_REWARD_WEIGHTS[i];
    if (roll < 0) return i + 2;
  }
  return 10;
}
let _peakState = { balance: PEAK_CAP, peakbox_count: 0, loaded: false };

function _peakAuth() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed?.access_token || !parsed?.user?.id) return null;
    return { accessToken: parsed.access_token };
  } catch (_) { return null; }
}

// 세션 토큰 리프레시 (만료/401 시). 성공 시 새 access_token, 실패 시 null.
async function _peakRefreshToken() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    if (!session?.refresh_token) return null;
    const rr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!rr.ok) return null;
    const refreshed = await rr.json();
    if (!refreshed.access_token) return null;
    return saveSessionToStorage(refreshed).access_token;
  } catch (_) { return null; }
}

async function _peakRpc(fnName, body) {
  const auth = _peakAuth();
  if (!auth) return null;

  // 만료된 토큰이면 호출 전에 미리 리프레시
  let token = auth.accessToken;
  try {
    const session = JSON.parse(localStorage.getItem(SUPABASE_STORAGE_KEY));
    const now = Math.floor(Date.now() / 1000);
    if (session?.expires_at && session.expires_at <= now) {
      const fresh = await _peakRefreshToken();
      if (fresh) token = fresh;
    }
  } catch (_) {}

  const call = async (tk) => {
    return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${tk}`,
      },
      body: JSON.stringify(body || {}),
    });
  };

  try {
    let resp = await call(token);
    // 401 = 토큰 만료/무효 → 리프레시 후 1회 재시도
    if (resp.status === 401) {
      const fresh = await _peakRefreshToken();
      if (fresh) resp = await call(fresh);
      else return null;
    }
    if (!resp.ok) return null;
    return await resp.json();
  } catch (_) { return null; }
}

// ── DB 미감지(dev) 폴백: localStorage로만 시뮬레이션. RPC가 null 반환할 때만 사용 ──
const _PEAK_FALLBACK_KEY    = 'chorditor_peak_fallback';
const _PEAKBOX_FALLBACK_KEY = 'chorditor_peakbox_fallback';

function _localPeakGet() {
  let bal = parseInt(localStorage.getItem(_PEAK_FALLBACK_KEY), 10);
  if (isNaN(bal)) bal = PEAK_CAP;
  let box = parseInt(localStorage.getItem(_PEAKBOX_FALLBACK_KEY), 10);
  if (isNaN(box)) box = 0;
  return { balance: bal, peakbox_count: box };
}

function _localPeakSet(balance, peakbox_count) {
  localStorage.setItem(_PEAK_FALLBACK_KEY, String(Math.max(0, balance)));
  localStorage.setItem(_PEAKBOX_FALLBACK_KEY, String(Math.max(0, peakbox_count)));
}

async function refreshPeakState() {
  const r = await _peakRpc('get_peak_state');
  if (r) {
    _peakState = { balance: r.balance, peakbox_count: r.peakbox_count, loaded: true };
  } else {
    const local = _localPeakGet();
    _peakState = { balance: local.balance, peakbox_count: local.peakbox_count, loaded: true };
  }
  renderPeakBadge();
  renderPeakboxBadge();
  return _peakState;
}

function renderPeakBadge() {
  document.querySelectorAll('#currency-peak-count').forEach(el => {
    el.textContent = getPlan() === 'pro' ? '∞' : `${_peakState.balance}/${PEAK_CAP}`;
  });
}

// 훈련 콘텐츠 진입/재생 시 피크 소모(DB, 서버가 회복 반영 후 판정). 부족하면 false.
// RPC가 null(비로그인/DB 미감지=dev)이면 localStorage 폴백으로 동작.
async function consumePeak(cost) {
  if (getPlan() === 'pro') return true; // Pro: 피크 무제한 — 소모 없음
  const r = await _peakRpc('consume_peak', { p_cost: cost });
  if (r) {
    _peakState = { balance: r.balance, peakbox_count: r.peakbox_count, loaded: true };
    renderPeakBadge();
    if (!r.ok) {
      analytics.track('peak_insufficient', { cost, balance: r.balance, ab_group: _peakFunnelGroup() });
      _openPeakInsufficientFunnel();
      return false;
    }
    analytics.track('peak_consumed', { cost, balance_after: r.balance });
    return true;
  }

  const local = _localPeakGet();
  if (local.balance < cost) {
    _peakState = { balance: local.balance, peakbox_count: local.peakbox_count, loaded: true };
    renderPeakBadge();
    analytics.track('peak_insufficient', { cost, balance: local.balance, ab_group: _peakFunnelGroup() });
    _openPeakInsufficientFunnel();
    return false;
  }
  const newBal = local.balance - cost;
  _localPeakSet(newBal, local.peakbox_count);
  _peakState = { balance: newBal, peakbox_count: local.peakbox_count, loaded: true };
  renderPeakBadge();
  analytics.track('peak_consumed', { cost, balance_after: newBal });
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('currency-peak-count') || document.getElementById('currency-peakbox-count')) {
    renderPeakBadge(); // RPC 응답 전 즉시 렌더 (Pro는 ∞ 즉시 표시)
    refreshPeakState();
  }
  // 모달용 이미지 프리로드 — 세션 중 모달 첫 오픈 시 아이콘 늦게 뜨는 끊김 방지
  ['image/gift.png', 'image/gift2.png', 'image/peak.svg'].forEach(src => { new Image().src = src; });
  // 효과음 프리로드 — 첫 재생 디코드 지연 제거(화면전환과 레이스 방지)
  ['tap.mp3', 'reward.mp3', 'peakbox_open.mp3', 'stamp.mp3', 'page.mp3', 'pop.mp3', 'cancel.mp3', 'attendance.mp3'].forEach(_preloadSfx);
  // 퀘스트 목록 프리렌더 — 모달 열기 전에 미리 채워둠 (첫 오픈 즉시 표시)
  if (document.getElementById('quest-modal-body')) renderQuestList();
});

// 피크 아이콘 터치 → 완전충전까지 남은시간 라운드박스 팝업 (아이콘 바로 아래)
let _peakTimerInterval = null;
async function openPeakTimerPopup(evt) {
  _playSfx('pop.mp3');
  const anchor = evt.currentTarget;
  closePeakTimerPopup();

  // Pro: 무제한 — 충전 타이머 개념 없음
  if (getPlan() === 'pro') {
    const pop = document.createElement('div');
    pop.className = 'peak-timer-popup';
    pop.id = 'peak-timer-popup';
    pop.innerHTML = `<div class="peak-timer-title">피크 무제한</div>`;
    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.right = (window.innerWidth - rect.right) + 'px';
    setTimeout(() => document.addEventListener('click', _peakTimerOutsideClick, { capture: true }), 0);
    return;
  }

  const r = await _peakRpc('get_peak_state');
  let balance, secondsLeft;
  if (r) {
    balance = r.balance;
    secondsLeft = r.seconds_to_full || 0;
    _peakState = { balance: r.balance, peakbox_count: r.peakbox_count, loaded: true };
  } else {
    const local = _localPeakGet();
    balance = local.balance;
    // dev 폴백: 실제 타이머 미추적, 남은 개수 × 30분으로 근사 표시
    secondsLeft = balance >= PEAK_CAP ? 0 : (PEAK_CAP - balance) * 30 * 60;
    _peakState = { balance: local.balance, peakbox_count: local.peakbox_count, loaded: true };
  }
  renderPeakBadge();
  renderPeakboxBadge();

  const pop = document.createElement('div');
  pop.className = 'peak-timer-popup';
  pop.id = 'peak-timer-popup';
  document.body.appendChild(pop);

  const rect = anchor.getBoundingClientRect();
  pop.style.top = (rect.bottom + 8) + 'px';
  pop.style.right = (window.innerWidth - rect.right) + 'px';

  const render = () => {
    if (balance >= PEAK_CAP || secondsLeft <= 0) {
      pop.innerHTML = `<div class="peak-timer-title">피크가 가득 찼어요</div>`;
      return;
    }
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    const timeStr = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    pop.innerHTML = `
      <div class="peak-timer-title">완전충전까지</div>
      <div class="peak-timer-time">${timeStr}</div>
    `;
  };
  render();

  if (balance < PEAK_CAP && secondsLeft > 0) {
    _peakTimerInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) { clearInterval(_peakTimerInterval); _peakTimerInterval = null; refreshPeakState(); }
      render();
    }, 1000);
  }

  setTimeout(() => document.addEventListener('click', _peakTimerOutsideClick, { capture: true }), 0);
}

function _peakTimerOutsideClick(e) {
  const pop = document.getElementById('peak-timer-popup');
  if (pop && !pop.contains(e.target)) closePeakTimerPopup();
}

function closePeakTimerPopup() {
  const pop = document.getElementById('peak-timer-popup');
  if (pop) pop.remove();
  if (_peakTimerInterval) { clearInterval(_peakTimerInterval); _peakTimerInterval = null; }
  document.removeEventListener('click', _peakTimerOutsideClick, { capture: true });
}

// ── 인앱 재화: 피크상자 (열면 피크 5개 충전, 오버충전 허용) ───
function renderPeakboxBadge() {
  document.querySelectorAll('#currency-peakbox-count').forEach(el => {
    el.textContent = String(_peakState.peakbox_count);
  });
}

// 피크상자 직접 열기: reveal 모달에서 1개/5개씩 개봉. 미개봉 상태(gift)로 시작.
function openPeakboxModal() {
  _playSfx('pop.mp3');
  if (_peakState.peakbox_count <= 0) return;
  // 상자 1개 실제 개봉(RPC 우선, 실패 시 로컬 폴백). 성공 시 true.
  const openOnce = async () => {
    const r = await _peakRpc('open_peakbox');
    if (r) {
      if (!r.ok) return false;
      _peakState = { balance: r.balance, peakbox_count: r.peakbox_count, loaded: true };
      return true;
    }
    const local = _localPeakGet();
    if (local.peakbox_count <= 0) return false;
    const newBal = local.balance + PEAKBOX_REWARD;
    const newBox = local.peakbox_count - 1;
    _localPeakSet(newBal, newBox);
    _peakState = { balance: newBal, peakbox_count: newBox, loaded: true };
    return true;
  };
  const openN = async (n) => {
    let opened = 0;
    for (let i = 0; i < n && _peakState.peakbox_count > 0; i++) {
      if (await openOnce()) opened++; else break;
    }
    if (opened > 0) {
      _playSfx('peakbox_open.mp3');
      renderPeakBadge();
      renderPeakboxBadge();
      analytics.track('peakbox_opened', { reward: PEAKBOX_REWARD * opened, balance_after: _peakState.balance });
    }
    const remain = _peakState.peakbox_count;
    if (remain > 0) {
      showPeakReveal(PEAKBOX_REWARD * opened, {
        button2Text: '닫기', onButton2: closePeakReveal,
        buttonText: '계속 열기', onButton: () => openN(1),
        subText: '피크상자 ' + remain + '개 남음',
      });
    } else {
      showPeakReveal(PEAKBOX_REWARD * opened, {
        buttonText: '닫기', onButton: closePeakReveal,
        subText: '피크상자 0개 남음',
      });
    }
  };
  showPeakReveal(null, {
    icon: 'gift',
    labelText: _peakState.peakbox_count + '개 남음',
    button2Text: '1개 열기', onButton2: () => openN(1),
    buttonText: '5개 열기', onButton: () => openN(5),
  });
}

// 피크 등장 연출: 흰색 후광 + 둥둥 떠있는 아이콘. 탭 시 사라짐.
// amount == null → 미개봉(gift 아이콘, 라벨 숨김). opts.buttonText/opts.onButton 로 버튼 커스텀.
function showPeakReveal(amount, opts) {
  opts = opts || {};
  const hasReward = amount != null;
  let ov = document.getElementById('peak-reveal-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'peak-reveal-overlay';
    ov.className = 'peak-reveal-overlay';
    ov.innerHTML = `
      <div class="peak-reveal-stage">
        <div class="peak-reveal-glow"></div>
        <img class="peak-reveal-pick" id="peak-reveal-pick" src="image/peak.svg" alt="">
        <span class="peak-reveal-label" id="peak-reveal-label"></span>
        <div class="peak-reveal-foot" id="peak-reveal-foot">
          <div class="peak-reveal-actions">
            <button type="button" class="peak-reveal-practice" id="peak-reveal-btn2"></button>
            <button type="button" class="peak-reveal-practice" id="peak-reveal-btn"></button>
          </div>
          <span class="peak-reveal-sub" id="peak-reveal-sub"></span>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.onclick = (e) => {
      if (e.target.closest('.peak-reveal-practice')) return;
      closePeakReveal();
    };
  }
  _peakRevealClose = opts.onClose || null;
  const gift = opts.icon === 'gift' || (opts.icon !== 'peak' && !hasReward);
  const pick = ov.querySelector('#peak-reveal-pick');
  if (pick) pick.src = gift ? 'image/gift.png' : 'image/peak.svg';
  const lbl = ov.querySelector('#peak-reveal-label');
  if (lbl) {
    const text = opts.labelText != null ? opts.labelText : (hasReward ? '+' + amount + ' 피크' : '');
    lbl.textContent = text;
    lbl.style.visibility = text ? 'visible' : 'hidden';
    lbl.classList.toggle('peak-reveal-label--up', hasReward);
  }
  const btn = ov.querySelector('#peak-reveal-btn');
  if (btn) {
    btn.textContent = opts.buttonText || '바로 사용하기';
    btn.onclick = opts.onButton || (() => { location.href = 'training.html'; });
  }
  const btn2 = ov.querySelector('#peak-reveal-btn2');
  if (btn2) {
    if (opts.button2Text) {
      btn2.textContent = opts.button2Text;
      btn2.onclick = opts.onButton2 || closePeakReveal;
      btn2.style.display = '';
    } else {
      btn2.style.display = 'none';
    }
  }
  const sub = ov.querySelector('#peak-reveal-sub');
  if (sub) {
    sub.textContent = opts.subText || '';
    sub.style.display = opts.subText ? '' : 'none';
  }
  ov.style.display = 'flex';
  // 애니메이션 재트리거
  ov.classList.remove('show');
  void ov.offsetWidth;
  ov.classList.add('show');
}

let _peakRevealClose = null;
function closePeakReveal() {
  const ov = document.getElementById('peak-reveal-overlay');
  if (ov) {
    ov.classList.remove('show');
    setTimeout(() => { ov.style.display = 'none'; }, 250);
  }
  const cb = _peakRevealClose;
  _peakRevealClose = null;
  if (typeof cb === 'function') cb();
}

// 연습 중단 경고 모달 (진행·주법 공통). onConfirm = 실제 나가기 동작.
let _leavePracticeOpen = false;
function showLeavePracticeModal(onConfirm) {
  _playSfx('cancel.mp3');
  let ov = document.getElementById('leave-practice-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'leave-practice-overlay';
    ov.className = 'leave-practice-overlay';
    ov.innerHTML = `
      <div class="leave-practice-modal">
        <div class="leave-practice-title">연습을 그만두시겠어요?</div>
        <div class="leave-practice-desc">지금 나가면 다시 연습할 때<br>피크를 사용해야 해요.</div>
        <div class="leave-practice-actions">
          <button class="leave-practice-btn leave-practice-btn--ghost" id="leave-practice-stop">그만할래요</button>
          <button class="leave-practice-btn leave-practice-btn--primary" id="leave-practice-continue">계속할래요</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  _leavePracticeOpen = true;
  // 통통 튀는 등장 애니메이션 재트리거 (재오픈 시에도 재생)
  const modal = ov.querySelector('.leave-practice-modal');
  if (modal) { modal.style.animation = 'none'; void modal.offsetWidth; modal.style.animation = ''; }
  const close = () => { ov.style.display = 'none'; _leavePracticeOpen = false; };
  ov.querySelector('#leave-practice-stop').onclick     = () => { close(); onConfirm(); };
  ov.querySelector('#leave-practice-continue').onclick  = close;
}
function isLeavePracticeOpen() { return _leavePracticeOpen; }
function hideLeavePracticeModal() {
  const ov = document.getElementById('leave-practice-overlay');
  if (ov) ov.style.display = 'none';
  _leavePracticeOpen = false;
}

// ── 사용 통계 (이미지 저장 / 공유 횟수) ───────────────────────
// 로컬 카운터(localStorage) 기반 + subscriptions.stat_images/stat_shares 동기화
const STATS_KEY = 'chorditor_stats';

function getStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    return { images: raw?.images || 0, shares: raw?.shares || 0, notes: raw?.notes || 0 };
  } catch (e) {
    return { images: 0, shares: 0, notes: 0 };
  }
}

function incrementStat(key) {
  if (key !== 'images' && key !== 'shares' && key !== 'notes') return;
  try {
    const s = getStats();
    s[key] = (s[key] || 0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
    syncStatsToDB();
    addXp(key === 'images' ? BEHAVE_XP.image : (key === 'notes' ? BEHAVE_XP.note : BEHAVE_XP.share)); // 행동형 XP
  } catch (e) {}
}

async function syncStatsToDB() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return;
    const session = JSON.parse(stored);
    const token  = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) return;
    const s = getStats();
    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ user_id: userId, stat_images: s.images, stat_shares: s.shares, stat_notes: s.notes }),
    });
  } catch (e) {}
}

let _lastPlanRefresh = 0;
async function refreshPlanFromDB() {
  const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
  if (!stored) return;
  try { if (!JSON.parse(stored)?.access_token) return; } catch { return; }
  const now = Date.now();
  if (now - _lastPlanRefresh < 30_000) return;
  _lastPlanRefresh = now;
  try { await fetchWebPlan(); } catch(e) {}
}

// ── Supabase 클라이언트 ───────────────────────────────────────
let _supabase = null;

async function initSupabase() {
  if (!window.supabase) { console.warn('[Supabase] 라이브러리 로드 안됨'); return; }

  if (window.Capacitor?.isNativePlatform()) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
  } else {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }

  // Android: OAuth 콜백 딥링크 리스닝
  if (window.Capacitor?.isNativePlatform()) {
    const CapApp = window.Capacitor?.Plugins?.App;
    if (CapApp) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.includes('auth-callback')) return;
        try {
          const fakeBase = 'https://x.com/';
          const urlObj   = new URL(url.replace('com.chorditor.app://', fakeBase));
          const code = urlObj.searchParams.get('code');
          const hash = new URLSearchParams((url.split('#')[1] || ''));
          const at = hash.get('access_token');
          const rt = hash.get('refresh_token');
          let session = null;
          if (code) {
            const { data } = await _supabase.auth.exchangeCodeForSession(code);
            session = data?.session;
          } else if (at && rt) {
            const { data } = await _supabase.auth.setSession({ access_token: at, refresh_token: rt });
            session = data?.session;
          }
          if (session?.user) {
            if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
            await fetchWebPlan();
            if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
            const CapBrowser = window.Capacitor?.Plugins?.Browser;
            if (CapBrowser) await CapBrowser.close().catch(() => {});
          }
        } catch(e) { console.error('[Auth] 딥링크 처리 실패:', e); }
      });
    }
  }

  // 인증 상태 변화 감지
  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      analytics.setUserId(session.user.id);
      // UI 먼저 갱신 (plan/RC 네트워크 대기에 막혀 무한로딩 걸리지 않도록)
      if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
      // 세션 복원/재접속 시에도 SIGNED_IN이 발생할 수 있어 자동 home 이동은 하지 않음
      // (신규 로그인은 redirectTo=home.html로 직접 진입, 재접속은 온보딩 화면 유지)
      if (!window.Capacitor && event === 'SIGNED_IN') {
        _authReady = true;
      }
      if (window._RC) window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      fetchWebPlan().catch(() => {});
    } else {
      analytics.clearUserId();
      setPlan('free');
      if (typeof renderAuthUI === 'function') renderAuthUI(null);
    }
  });

  // 기존 세션 복원 (웹 전용)
  if (!window.Capacitor?.isNativePlatform()) {
    let session = null;
    try {
      ({ data: { session } } = await _supabase.auth.getSession());
    } catch(e) { console.warn('[Supabase] getSession 실패:', e); }
    if (session?.user) {
      _authReady = true;
      analytics.setUserId(session.user.id);
      // UI 먼저 갱신, plan/RC는 백그라운드 (네트워크 대기로 무한로딩 방지)
      if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
      if (window._RC) window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      fetchWebPlan().catch(() => {});
    } else {
      if (typeof renderAuthUI === 'function') renderAuthUI(null);
    }
  }
}

// ── 세션 저장 ─────────────────────────────────────────────────
function saveSessionToStorage(rawJson) {
  const session = {
    access_token:  rawJson.access_token,
    refresh_token: rawJson.refresh_token,
    token_type:    rawJson.token_type || 'bearer',
    expires_in:    rawJson.expires_in || 3600,
    expires_at:    rawJson.expires_at || Math.floor(Date.now() / 1000) + (rawJson.expires_in || 3600),
    user:          rawJson.user,
  };
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(session));
  return session;
}

// ── 플랜 fetch ────────────────────────────────────────────────
async function fetchPlanWithToken(accessToken) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + accessToken,
      },
      body: '{}',
    });
    if (resp.ok) {
      const plan = await resp.json();
      if (plan) setPlan(plan);
    }
  } catch(e) { console.warn('[Auth] fetchPlanWithToken 실패:', e); }
}

async function fetchWebPlan() {
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (!stored) return;
      const session = JSON.parse(stored);
      if (session.access_token) await fetchPlanWithToken(session.access_token);
    } catch(e) { console.warn('[Auth] fetchWebPlan(Android) 실패:', e); }
    return;
  }
  if (!_supabase) return;
  try {
    const { data, error } = await _supabase.rpc('get_my_plan');
    if (!error && data) setPlan(data);
  } catch(e) { console.warn('[Supabase] fetchWebPlan 실패:', e); }
}

// ── 인증 상태 ─────────────────────────────────────────────────
let _authReady    = false;
let _authResolve  = null;
const _authPromise = new Promise(resolve => { _authResolve = resolve; });

// ── Google 로그인 (공통 코어) ──────────────────────────────────
async function signInWithGoogle() {
  if (!_supabase) { console.error('[Auth] Supabase 미초기화'); return; }
  analytics.track('login_started', { method: 'google' });
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
      if (!GoogleAuth) throw new Error('GoogleAuth 플러그인을 찾을 수 없습니다.');
      await GoogleAuth.initialize({
        clientId: '495859421223-rkjalna3ckhslfrk12gvbehn69o9j4qe.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken ?? googleUser?.idToken;
      if (!idToken) throw new Error('ID 토큰을 받지 못했습니다.');
      const rawResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ provider: 'google', id_token: idToken }),
      });
      const rawJson = await rawResp.json();
      if (!rawResp.ok) throw new Error(rawJson?.error_description || 'Supabase 인증 실패');
      const session = saveSessionToStorage(rawJson);
      if (session.user) {
        analytics.setUserId(session.user.id);
        analytics.track('sign_in', { method: 'google' });
        if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
        await fetchPlanWithToken(session.access_token);
        if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
      }
    } catch(e) {
      const msg = e?.message || '';
      if (!msg.includes('cancel')) console.error('[Auth] Google 로그인 실패:', e);
    }
  } else {
    await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
  }
}

async function signInWithApple() {
  if (!_supabase) { console.error('[Auth] Supabase 미초기화'); return; }
  await _supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: location.origin + location.pathname }
  });
}

async function signOutWeb() {
  analytics.track('sign_out', {});
  analytics.clearUserId();
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + session.access_token },
        }).catch(() => {});
      }
    } catch(e) {}
    localStorage.removeItem(SUPABASE_STORAGE_KEY);
    setPlan('free');
    if (typeof renderAuthUI === 'function') renderAuthUI(null);
    return;
  }
  if (!_supabase) return;
  await _supabase.auth.signOut();
  setPlan('free');
  if (typeof renderAuthUI === 'function') renderAuthUI(null);
}

// ── 강제 업데이트 ─────────────────────────────────────────────
function _compareVersion(v1, v2) {
  const clean = v => v.replace(/_.*$/, '');
  const p1 = clean(v1).split('.').map(Number);
  const p2 = clean(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] ?? 0, b = p2[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

function openPlayStore() {
  const url = 'https://play.google.com/store/apps/details?id=com.chorditor.app';
  if (window.Capacitor?.Plugins?.Browser) {
    window.Capacitor.Plugins.Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

// onboarding.html은 정적 마크업 있음 → 그대로 사용. 다른 페이지는 마크업이 없어
// 딥링크로 바로 진입해도 강제 업데이트가 노출되도록 동적 생성.
function _ensureForceUpdateOverlay() {
  let el = document.getElementById('force-update-overlay');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'onboarding-overlay hidden';
  el.id = 'force-update-overlay';
  el.innerHTML = `
    <div class="onboarding-card">
      <div class="onboarding-logo">CHORDITOR</div>
      <p class="onboarding-desc" style="margin-bottom:8px;">새로운 버전이 출시되었습니다.</p>
      <p class="onboarding-desc" style="font-size:13px;opacity:0.7;margin-bottom:24px;">계속 사용하려면 최신 버전으로 업데이트해 주세요.</p>
      <button class="onboarding-start-btn" onclick="openPlayStore()">업데이트 하기</button>
    </div>`;
  document.body.appendChild(el);
  return el;
}

// 온보딩 화면뿐 아니라 모든 페이지 진입(딥링크 포함)에서 체크 — initPushNotifications()와
// 같은 전역 DOMContentLoaded 훅에서 호출됨.
// 업데이트가 강제되면 true 반환 — 호출부는 이후 초기화/라우팅을 중단해야 함.
async function checkForceUpdate() {
  if (!window.Capacitor?.isNativePlatform()) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.min_version&select=value`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const minVersion = data?.[0]?.value;
    if (!minVersion) return false;
    if (_compareVersion(APP_VERSION, minVersion) < 0) {
      _ensureForceUpdateOverlay().classList.remove('hidden');
      return true;
    }
  } catch(e) {}
  return false;
}

// ── 앱 자체 공유(초대) ──────────────────────────────────────────
async function shareApp() {
  const url = 'https://play.google.com/store/apps/details?id=com.chorditor.app';
  const text = 'Chorditor로 코드 진행을 만들고 연습해보세요!';
  const Share = window.Capacitor?.Plugins?.Share;
  try {
    if (Share) {
      await Share.share({ title: 'Chorditor', text, url });
    } else if (navigator.share) {
      await navigator.share({ title: 'Chorditor', text, url });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text + ' ' + url);
      if (typeof showTextToast === 'function') showTextToast('링크 복사됨!');
    }
    analytics.track('share_initiated', { type: 'app' });
  } catch (e) { /* 사용자가 공유 취소한 경우 등 — 무시 */ }
}

// ── 공유 모달: 코드 아래 아이콘 줄 (링크 복사 / OS 공유) ──────────
// home.js·user_project.js 양쪽 모두 openShareModal()이 share-code-input의
// dataset.shareUrl/projectName을 채워두면 이 두 함수가 그걸 그대로 씀 — 페이지별 중복 불필요.
async function copyShareUrl() {
  document.activeElement?.blur(); // 터치 후 :focus/:hover 눌림 상태로 고정되는 것 방지
  const el = document.getElementById('share-code-input');
  const url = el?.dataset.shareUrl || '';
  if (!url) return;
  if (navigator.clipboard) await navigator.clipboard.writeText(url).catch(() => _fallbackCopy(url));
  else _fallbackCopy(url);
  if (typeof showTextToast === 'function') showTextToast('링크 복사됨!');
  incrementStat('shares');
  analytics.track('share_initiated', { type: 'url' });

  // 복사 아이콘 → 체크 아이콘으로 잠깐 전환해서 복사 완료 피드백(팝 애니메이션은 CSS .copied)
  const btn = document.getElementById('share-copy-url-btn');
  if (btn && !btn.dataset.checking) {
    btn.dataset.checking = '1';
    btn.innerHTML = '<i data-lucide="check"></i>';
    btn.classList.add('copied');
    lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = '<i data-lucide="copy"></i>';
      btn.classList.remove('copied');
      lucide.createIcons();
      delete btn.dataset.checking;
    }, 1500);
  }
}

async function shareProjectViaOS() {
  document.activeElement?.blur(); // 터치 후 :focus/:hover 눌림 상태로 고정되는 것 방지
  const el = document.getElementById('share-code-input');
  const url = el?.dataset.shareUrl || '';
  if (!url) return;
  const title = el.dataset.projectName || 'Chorditor';
  const text = `${title} 코드 진행을 확인해보세요!`;
  const Share = window.Capacitor?.Plugins?.Share;
  try {
    if (Share) {
      await Share.share({ title, text, url });
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      if (typeof showTextToast === 'function') showTextToast('링크 복사됨!');
    }
    incrementStat('shares');
    analytics.track('share_initiated', { type: 'native' });
  } catch (e) { /* 사용자가 공유 취소한 경우 등 — 무시 */ }
}

// ── 공유 링크/코드로 앱 진입 (Android Activity → WebView, 또는 ?share=/?c= URL) ──
// 어느 페이지(onboarding/home/user_project)에서 도착하든 일단 세션스토리지에 저장만 해두고,
// 실제 처리(코드 파싱 → 새 프로젝트 생성 → 그 프로젝트로 즉시 이동)는 home.js/user_project.js의
// _consumePendingShareCode()가 담당 — 로그인 전(onboarding)에 도착해도 로그인 완료 후
// home.html에서 자동으로 이어서 처리됨(모달로 "기존/새 노트" 선택 안 시킴, 무조건 새 노트로 생성).
const PENDING_SHARE_CODE_KEY = 'np_pending_share_code';
window._handleShareImport = function(rawCode) {
  sessionStorage.setItem(PENDING_SHARE_CODE_KEY, rawCode);
  if (typeof _consumePendingShareCode === 'function') _consumePendingShareCode();
};

// ── RevenueCat (인앱 결제) ─────────────────────────────────────
const REVENUECAT_ANDROID_KEY = 'goog_KNGCSoBxhHnHfZuTVgJoNKglKhM';
const ENTITLEMENT_PRO  = 'pro_entitlement';
const PRODUCT_PRO      = 'pro_monthly';

let _billingReady = Promise.resolve();

async function initBilling() {
  if (!window.Capacitor?.isNativePlatform()) return;
  _billingReady = (async () => {
    const Purchases = window.Capacitor?.Plugins?.Purchases;
    if (!Purchases) { console.warn('[Billing] Purchases 플러그인 없음'); return; }
    window._RC = Purchases;
    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
  })();
  try { await _billingReady; }
  catch(e) { console.warn('[Billing] initBilling 실패:', e); }
}

async function syncPlanFromBilling() {
  if (!window._RC) return;
  try {
    const { customerInfo } = await window._RC.getCustomerInfo();
    const active = customerInfo?.entitlements?.active || {};
    let newPlan;
    if (active[ENTITLEMENT_PRO]) newPlan = 'pro';
    else return;
    setPlan(newPlan);
    await updateSupabasePlan(newPlan);
  } catch(e) { console.warn('[Billing] syncPlanFromBilling 실패:', e); }
}

async function updateSupabasePlan(plan) {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return;
    const session = JSON.parse(stored);
    if (!session.access_token) return;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_my_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ new_plan: plan }),
    });
    if (!resp.ok) console.error('[Billing] updateSupabasePlan RPC 실패:', resp.status);
  } catch(e) { console.error('[Billing] updateSupabasePlan 네트워크 오류:', e); }
}

// ── 플랜 바텀시트 & 결제 함수 ────────────────────────────────

let _purchaseConfirmResolve = null;

function showPurchaseConfirm() {
  return new Promise(resolve => {
    _purchaseConfirmResolve = resolve;
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      const email = stored ? (JSON.parse(stored)?.user?.email ?? '') : '';
      const emailEl = document.getElementById('purchase-confirm-email');
      if (emailEl) emailEl.textContent = email || '(이메일 없음)';
    } catch(e) {}
    document.getElementById('purchase-confirm-modal')?.classList.remove('hidden');
  });
}

function closePurchaseConfirm(confirmed) {
  document.getElementById('purchase-confirm-modal')?.classList.add('hidden');
  if (_purchaseConfirmResolve) { _purchaseConfirmResolve(!!confirmed); _purchaseConfirmResolve = null; }
}

function openBillingFaq() {
  analytics.track('billing_faq_opened', {});
  document.getElementById('billing-faq-modal')?.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeBillingFaq() {
  document.getElementById('billing-faq-modal')?.classList.add('hidden');
}

async function purchasePlan(planId) {
  if (!window._RC) {
    alert('결제 초기화 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const confirmed = await showPurchaseConfirm();
  if (!confirmed) return;

  analytics.track('plan_upgrade_started', { from_plan: getPlan(), to_plan: planId });

  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      if (session.user?.id) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
    }
  } catch(e) {}

  const productId = PRODUCT_PRO;
  try {
    const offeringsResult = await window._RC.getOfferings();
    const offerings = offeringsResult?.offerings ?? offeringsResult;
    const current = offerings?.current ?? null;
    if (!current) throw new Error('상품 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');

    const pkg = current.availablePackages.find(p =>
      p.identifier === productId || p.product?.identifier?.includes(productId)
    );
    if (!pkg) throw new Error('상품을 찾을 수 없습니다: ' + productId);

    const purchaseParams = { aPackage: pkg };
    try {
      const { customerInfo: currentInfo } = await window._RC.getCustomerInfo();
      const activeSubs = currentInfo?.activeSubscriptions || [];
      if (activeSubs.length > 0) {
        purchaseParams.upgradeInfo = { oldSKU: activeSubs[0], prorationMode: 1 };
      }
    } catch(e) {}

    const { customerInfo } = await window._RC.purchasePackage(purchaseParams);

    const active = customerInfo?.entitlements?.active || {};
    const newPlan = active[ENTITLEMENT_PRO] ? 'pro' : planId;
    setPlan(newPlan);
    await updateSupabasePlan(newPlan);

    analytics.track('plan_upgrade_completed', { to_plan: newPlan });

    // 바텀시트에서 호출됐으면 시트 닫기, plan.html에서는 뒤로가기
    const sheet = document.getElementById('plan-sheet');
    if (sheet && sheet.classList.contains('plan-sheet--open')) {
      closePlanSheet();
    } else {
      history.back();
    }
  } catch(e) {
    const msg = (e?.message || e?.code || '').toLowerCase();
    const isCancelled = msg.includes('cancel');
    if (isCancelled) {
      analytics.track('plan_upgrade_cancelled', { to_plan: planId });
    } else {
      analytics.track('plan_upgrade_failed', { to_plan: planId, error: e?.message || 'unknown' });
      console.error('[Billing] purchasePlan 실패:', e);
      alert(e?.message || '결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
}

async function restorePurchases() {
  if (!window._RC) {
    alert('인앱 결제를 사용할 수 없는 환경입니다.');
    return;
  }
  try {
    await window._RC.restorePurchases();
    await syncPlanFromBilling();
    analytics.track('purchase_restored', { plan: getPlan() });
    alert('구매 내역을 복원했습니다.');
  } catch(e) {
    console.error('[Billing] restorePurchases 실패:', e);
  }
}

// ── A/B 실험: 피크부족 퍼널 (테이블 없이 user_id 결정론적 50/50) ──
// A = 부족 즉시 구독시트(기존). B = 완충 모달 경유 후 유저 선택.
// uuid v4 첫 hex 문자(완전 랜덤): 짝수(0·2·4·6·8·a·c·e)→A, 홀수→B.
// 비로그인/uid 없음 → A(기존 동작) 폴백.
// SQL 동일 규칙: substr(user_id::text,1,1) in ('0','2','4','6','8','a','c','e') → 'A' else 'B'
function _peakFunnelGroup() {
  let uid = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) uid = JSON.parse(stored)?.user?.id || null;
  } catch (_) {}
  if (!uid) return 'A';
  return '02468ace'.includes(uid[0].toLowerCase()) ? 'A' : 'B';
}

function _openPeakInsufficientFunnel() {
  if (_peakFunnelGroup() === 'B') {
    if (typeof openPeakBuffer === 'function') openPeakBuffer();
  } else {
    if (typeof openPlanSheet === 'function') openPlanSheet('peak_insufficient');
  }
}

// B그룹 완충 모달: 구독시트를 바로 띄우지 않고 유저에게 선택권 제공
function openPeakBuffer() {
  const ov = document.getElementById('peak-buffer-overlay');
  if (!ov) return;
  if (typeof analytics !== 'undefined') analytics.track('peak_buffer_shown', { ab_group: 'B' });
  setTimeout(() => ov.classList.add('peak-buffer-overlay--open'), 0);
}
function closePeakBuffer() {
  document.getElementById('peak-buffer-overlay')?.classList.remove('peak-buffer-overlay--open');
}
function _peakBufferToPlan() {
  closePeakBuffer();
  if (typeof analytics !== 'undefined') analytics.track('peak_buffer_cta', { ab_group: 'B' });
  openPlanSheet('peak_buffer');
}

function openPlanSheet(triggerSource) {
  const overlay = document.getElementById('plan-sheet-overlay');
  const sheet   = document.getElementById('plan-sheet');
  if (!sheet) return;
  if (typeof analytics !== 'undefined') {
    analytics.track('paywall_view', { trigger: triggerSource || 'unknown', ab_group: _peakFunnelGroup() });
  }

  const plan     = getPlan();
  const isNative = window.Capacitor?.isNativePlatform();

  const btn = document.getElementById('plan-sheet-btn-pro');
  if (btn) {
    if (plan === 'pro') {
      btn.textContent = '현재 플랜';
      btn.disabled = true;
      btn.onclick = null;
    } else {
      btn.disabled = false;
      if (isNative) {
        btn.textContent = '구독하기';
        btn.onclick = () => purchasePlan('pro');
      } else {
        btn.textContent = '앱에서 구독';
        btn.onclick = () => alert('구독은 Android 앱에서 가능합니다.\nGoogle Play에서 Chorditor를 다운로드하세요.');
      }
    }
  }

  const faqBtn     = document.getElementById('plan-sheet-faq-btn');
  const restoreBtn = document.getElementById('plan-sheet-restore-btn');
  if (faqBtn)     faqBtn.style.display     = isNative ? '' : 'none';
  if (restoreBtn) restoreBtn.style.display = isNative ? '' : 'none';

  // setTimeout(0): 합성 click 이벤트(pointerup 직후 dispatch)가
  // overlay에 도달하지 못하도록 다음 태스크에서 overlay를 활성화
  setTimeout(() => {
    if (overlay) overlay.classList.add('plan-sheet-overlay--open');
    requestAnimationFrame(() => sheet.classList.add('plan-sheet--open'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 0);
}

function closePlanSheet() {
  document.getElementById('plan-sheet-overlay')?.classList.remove('plan-sheet-overlay--open');
  document.getElementById('plan-sheet')?.classList.remove('plan-sheet--open');
}

function _initPlanSheet() {
  // plan.html 자체 페이지는 자체 HTML 사용 — 주입 불필요
  if (location.href.includes('plan.html')) return;
  // 이미 주입됐으면 스킵
  if (document.getElementById('plan-sheet')) return;

  const el = document.createElement('div');
  el.innerHTML = `
<div class="plan-sheet-overlay" id="plan-sheet-overlay" onclick="closePlanSheet()"></div>
<div class="plan-sheet" id="plan-sheet">
  <div class="plan-sheet-handle"></div>
  <div class="plan-sheet-header">
    <span class="plan-sheet-title">Pro 플랜으로 업그레이드</span>
    <button class="icon-btn" onclick="closePlanSheet()"><i data-lucide="x"></i></button>
  </div>
  <div class="plan-sheet-inner">
    <div class="plan-sheet-hero">
      <div class="plan-sheet-hero-img"><img src="image/gift2.png" alt=""></div>
      <div class="plan-sheet-hero-text">매일 피크 제한없이<br>사용해보세요!</div>
    </div>
    <div class="plan-feature-box">
      <div class="plan-feature-row"><img class="plan-feature-icon" src="image/peak.svg" alt=""><span>피크 사용량 무제한</span></div>
      <div class="plan-feature-row"><img class="plan-feature-icon" src="image/photo.png" alt=""><span>코드 이미지 고급 설정 개방</span></div>
      <div class="plan-feature-row"><img class="plan-feature-icon" src="image/pencil.png" alt=""><span>노트 무제한, 편리한 저장 기능</span></div>
    </div>
    <div class="plan-sheet-divider"></div>
    <div class="plan-launch-banner">출시 할인가 적용<br>Pro 업그레이드하기</div>
    <div class="plan-card plan-card--highlight">
      <div class="plan-card-badge">추천</div>
      <div class="plan-card-name">Pro</div>
      <div class="plan-card-price">
        <div class="price-top">
          <span class="price-original">₩6,900</span>
          <span class="price-badge">29% OFF</span>
        </div>
        <span class="price-amount">₩4,900<small>/월</small></span>
      </div>
    </div>
    <div class="plan-legal-group">
      <div class="plan-cancel-info">구독은 결제일 기준 매월 자동으로 갱신되며, 갱신 24시간 전까지 언제든 해지할 수 있습니다. 해지는 Google Play 스토어 &gt; 구독 메뉴에서 가능합니다.</div>
      <div class="plan-legal-links">
        <span class="plan-legal-link" onclick="window.open('Privacy.html', '_blank')">개인정보 처리방침</span>
        <span class="plan-legal-link" onclick="window.open('Terms.html', '_blank')">이용약관</span>
      </div>
    </div>
    <div class="plan-page-footer">
      <div class="plan-modal-footer-links">
        <span class="plan-restore-link" id="plan-sheet-faq-btn" onclick="openBillingFaq()" style="display:none">결제 도움말</span>
        <span class="plan-restore-link" id="plan-sheet-restore-btn" onclick="restorePurchases()" style="display:none">구매 복원</span>
      </div>
    </div>
  </div>
  <div class="plan-sheet-footer">
    <button class="btn btn-primary plan-card-btn" id="plan-sheet-btn-pro">구독하기</button>
    <span class="hint">구독은 Google Play에서 언제든지 취소할 수 있습니다.</span>
  </div>
</div>
<div class="modal-overlay hidden" id="purchase-confirm-modal" onclick="closePurchaseConfirm(false)">
  <div class="modal purchase-confirm-modal" onclick="event.stopPropagation()">
    <div class="modal-header"><span class="modal-title">결제 전 확인</span></div>
    <div class="purchase-confirm-body">
      <div class="purchase-confirm-account">
        <span class="purchase-confirm-label">결제 계정</span>
        <span class="purchase-confirm-email" id="purchase-confirm-email">—</span>
      </div>
      <p class="purchase-confirm-notice">Google Play 결제 계정과 앱 로그인 계정이 다를 경우, 구독 취소·환불이 어려울 수 있습니다.</p>
    </div>
    <div class="modal-footer purchase-confirm-footer">
      <button class="btn btn-ghost" onclick="closePurchaseConfirm(false)">취소</button>
      <button class="btn btn-primary" onclick="closePurchaseConfirm(true)">결제 진행</button>
    </div>
  </div>
</div>
<div class="modal-overlay hidden" id="billing-faq-modal" onclick="closeBillingFaq()">
  <div class="modal billing-faq-modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <span class="modal-title">결제 도움말</span>
      <button class="icon-btn" onclick="closeBillingFaq()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body billing-faq-body">
      <div class="faq-item"><div class="faq-q">결제는 어떤 계정으로 청구되나요?</div><div class="faq-a">플레이스토어에서 앱을 다운받은 계정으로 결제됩니다.</div></div>
      <div class="faq-item"><div class="faq-q">구독 취소는 어떻게 하나요?</div><div class="faq-a">플레이스토어 → 내 프로필 → 결제 및 정기 결제 → 정기 결제에서 취소할 수 있습니다.</div></div>
      <div class="faq-item"><div class="faq-q">환불은 어떻게 받나요?</div><div class="faq-a">플레이스토어 웹사이트 → 내 프로필 → 결제 및 정기 결제 → 예산 및 내역에서 환불 신청 가능합니다.</div></div>
      <div class="faq-item"><div class="faq-q">앱 계정과 Play Store 계정이 다르면?</div><div class="faq-a">플레이스토어 계정의 결제 정보를 사용하게 되어 구독 관리가 어려워질 수 있습니다.</div></div>
      <div class="faq-item"><div class="faq-q">구독했는데 앱에서 Free로 표시되면?</div><div class="faq-a">플랜 설명창 하단의 "구매 복원" 버튼을 눌러주세요.</div></div>
    </div>
  </div>
</div>
<div class="peak-buffer-overlay" id="peak-buffer-overlay" onclick="if(event.target===this)closePeakBuffer()">
  <div class="peak-buffer-modal">
    <img class="peak-buffer-icon" src="image/peak.svg" alt="">
    <div class="peak-buffer-title">피크가 부족해요</div>
    <div class="peak-buffer-desc">Pro 플랜이면 피크 걱정 없이<br>무제한으로 연습할 수 있어요.</div>
    <button class="peak-buffer-cta" onclick="_peakBufferToPlan()">Pro 플랜 보기</button>
    <button class="peak-buffer-dismiss" onclick="closePeakBuffer()">다음에</button>
  </div>
</div>`;
  while (el.firstChild) document.body.appendChild(el.firstChild);
}

document.addEventListener('DOMContentLoaded', _initPlanSheet);

// ── 앱 버전 표시 ──────────────────────────────────────────────
async function initAppVersion() {
  try {
    const el = document.getElementById('app-version');
    if (!el) return;
    const App = window.Capacitor?.Plugins?.App;
    if (App) {
      const { version } = await App.getInfo();
      if (version) el.textContent = 'v' + version;
    } else {
      el.textContent = 'v1.1.0';
    }
  } catch(e) {}
}

// ── 유효 streak (조회 시점 만료 판정) ───────────────────────
// 저장된 streak은 streak_last_counted_date 기준 연속수.
// 마지막 적립일이 오늘/어제가 아니면(=하루 이상 공백) 끊긴 것 → 0.
// (저장값은 그대로 두고 표시·집계 시 파생 계산. 다음 훈련 시 증분 로직이 자동 정정.)
function effectiveStreak(stats) {
  if (!stats || !stats.streak) return 0;
  const last = stats.streak_last_counted_date;
  if (!last) return 0;
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return (last === today || last === yesterday) ? stats.streak : 0;
}

// ── 훈련 통계 DB → localStorage 복원 ────────────────────────
// 앱 재설치 후 localStorage가 비어있어도 DB 데이터로 복원.
// streak/total/time은 max(local, server) — 되감기 방지.
async function restoreTrainingStatsFromDB() {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=streak,training_time_min,total_completed,scale_completed,progression_completed,strum_completed,streak_synced_date,review_rated,user_xp`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return;
    const rows = await resp.json();
    if (!rows.length) return;

    const overview = rows[0];
    const local = JSON.parse(localStorage.getItem('training_stats') || '{}');

    // 서버 값이 더 크면 덮어씀 (되감기 방지)
    const merged = { ...local };
    if ((overview.streak            || 0) > (local.streak            || 0))
      merged.streak = overview.streak;
    if ((overview.total_completed   || 0) > (local.total_completed   || 0))
      merged.total_completed = overview.total_completed;
    if ((overview.scale_completed   || 0) > (local.scale_completed   || 0))
      merged.scale_completed = overview.scale_completed;
    if ((overview.progression_completed || 0) > (local.progression_completed || 0))
      merged.progression_completed = overview.progression_completed;
    if ((overview.strum_completed   || 0) > (local.strum_completed   || 0))
      merged.strum_completed = overview.strum_completed;
    if ((overview.training_time_min || 0) > (local.training_time_min || 0))
      merged.training_time_min = overview.training_time_min;
    // streak_last_counted_date: 서버 streak이 더 크면 함께 복원
    if ((overview.streak || 0) > (local.streak || 0) && overview.streak_synced_date)
      merged.streak_last_counted_date = overview.streak_synced_date;

    localStorage.setItem('training_stats', JSON.stringify(merged));

    // 경험치 복원: 서버 값이 더 크면 로컬 갱신 (되감기 방지). 위젯 있으면 재렌더.
    const localXp = parseInt(localStorage.getItem('user_xp') || '0', 10);
    if ((overview.user_xp || 0) > localXp) {
      localStorage.setItem('user_xp', String(overview.user_xp));
      if (typeof renderTopbarLevel === 'function') renderTopbarLevel();
      if (typeof renderProfileXp === 'function') renderProfileXp();
    }

    // 서버에서 이미 평가 완료한 유저면 재노출 방지
    if (overview.review_rated) {
      const rs = reviewGetState();
      if (!rs.rated) { rs.rated = true; reviewSetState(rs); }
    }
  } catch (_) {}
}

// ── 훈련 통계 DB 즉시 동기화 ────────────────────────────────
// training_stats localStorage → public.subscriptions (streak/training_time_min/total_completed)
// 기존 구독 row가 있으면 PATCH(plan 보존), 없으면 free로 INSERT. 비로그인 시 무시.
async function syncTrainingStatsToDB() {
  const stats = JSON.parse(localStorage.getItem('training_stats') || 'null');
  if (!stats) return;

  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;

  const payload = {
    streak:             stats.streak            || 0,
    training_time_min:  stats.training_time_min || 0,
    total_completed:    stats.total_completed   || 0,
    scale_completed:    stats.scale_completed   || 0,
    progression_completed: stats.progression_completed || 0,
    strum_completed:    stats.strum_completed   || 0,
    streak_synced_date: new Date().toISOString().slice(0, 10),
  };
  const headers = {
    'Content-Type':  'application/json',
    'apikey':         SUPABASE_ANON,
    'Authorization': `Bearer ${accessToken}`,
  };

  try {
    // 1) 기존 구독 row 갱신 (plan/status 보존)
    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`,
      { method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(payload) }
    );
    let rows = [];
    if (patch.ok) rows = await patch.json();
    // 2) row 없으면 free로 신규 생성
    if (rows.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method:  'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: userId, plan: 'free', status: 'active', ...payload }),
      });
    }
  } catch (_) {}
}

// ── 경험치(user_xp) DB 동기화 ────────────────────────────────
// addXp 호출 시마다 sync_user_xp RPC — 서버측 GREATEST(server, local) 원자 병합.
// 블라인드 덮어쓰기 금지: 멀티기기/복원 경쟁에서 높은 값 항상 보존.
// 서버가 더 크면(다른 기기 적립분) 로컬도 서버값으로 올림. 비로그인 시 무시.
async function syncXpToDB() {
  const localXp = parseInt(localStorage.getItem('user_xp') || '0', 10);
  const r = await _peakRpc('sync_user_xp', { p_xp: localXp });
  if (typeof r !== 'number') return; // RPC 실패/비로그인 → 로컬만 유지, 다음 addXp 때 재시도
  if (r > parseInt(localStorage.getItem('user_xp') || '0', 10)) {
    localStorage.setItem('user_xp', String(r));
    if (typeof renderTopbarLevel === 'function') renderTopbarLevel();
    if (typeof renderProfileXp === 'function') renderProfileXp();
  }
}

// ── 전역 훈련시간 적립 (측정 즉시 호출) ─────────────────────
// seconds 누적 → localStorage training_time_min 갱신 + 즉시 DB 동기화.
// 모든 훈련 페이지(스케일·퀴즈·주법·코드진행)에서 공용 사용.
function recordTrainingTime(seconds) {
  if (!seconds || seconds < 6) return; // 6초 미만 무시
  const stats = JSON.parse(localStorage.getItem('training_stats') || '{}');
  stats.training_time_min = Math.round(((stats.training_time_min || 0) + seconds / 60) * 10) / 10;
  localStorage.setItem('training_stats', JSON.stringify(stats));
  syncTrainingStatsToDB();
  if (typeof reviewQualify === 'function' && stats.training_time_min >= 10) reviewQualify('time_10');
}
if (typeof window !== 'undefined') window.recordTrainingTime = recordTrainingTime;

// ── 훈련 세션 카운트 (연속기록 제외) ──────────────────────────
// 4개 훈련(코드맞추기/스케일/코드진행/주법리듬) 공유. today_sessions/total_completed만 갱신.
// 코드맞추기·스케일은 자체적으로 today_sessions 를 갱신하므로(이중 카운트 방지)
// recordTrainingAttendance() 는 자체 갱신이 없는 코드진행·주법리듬에서만 호출한다.
// 연속출석(streak)·출석모달은 접속 시 claimDailyAttendance() 로 완전히 분리됨.
function recordTrainingAttendance() {
  const KEY = 'training_stats';
  const today = new Date().toISOString().slice(0, 10);
  const stats = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }
  stats.today_sessions  = (stats.today_sessions  || 0) + 1;
  stats.total_completed = (stats.total_completed || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(stats));
  if (typeof syncTrainingStatsToDB === 'function') syncTrainingStatsToDB();
}

// 출석 모달 등장 딜레이(ms). 도장 찍힌 후 완료모달까지의 간격 — 절반으로 단축.
const ATTENDANCE_MODAL_DELAY_MS = 325;
const ATTENDANCE_CAL_DELAY_MS = 300;

// 출석 랜덤상자 모달 표시(접속 시 claimDailyAttendance() 에서만 호출). 모달 DOM은 동적 생성.
// reward/newBalance 는 이미 서버(또는 폴백)에서 지급 완료된 값 — 상자 클릭 시 피크 등장 연출로 공개.
function showTrainingAttendanceModal(streak, reward, newBalance) {
  setTimeout(function () {
    if (typeof analytics !== 'undefined') analytics.track('training_attendance_achieved', { streak, reward });
    let overlay = document.getElementById('attendance-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'attendance-modal-overlay';
      overlay.className = 'attendance-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML =
      '<div class="attendance-modal">' +
        '<div class="attendance-modal-title">출석 완료!</div>' +
        '<button type="button" id="attendance-box" class="attendance-box" aria-label="상자 열기">' +
          '<img src="image/gift.png" class="attendance-box-icon" id="attendance-box-icon" alt="">' +
        '</button>' +
        '<div class="attendance-modal-desc" id="attendance-modal-desc">상자를 눌러 여세요</div>' +
      '</div>';
    void overlay.offsetWidth; // 강제 reflow: 초기 상태(opacity:0/scale) 확정 → --show 전환 시 애니메이션 발동

    let opened = false;
    const box = document.getElementById('attendance-box');
    box.onclick = function () {
      if (opened) return;
      opened = true;
      _playSfx('peakbox_open.mp3');
      overlay.classList.remove('attendance-modal-overlay--show'); // 상자 모달 닫고
      showPeakReveal(reward);                                     // 피크 등장 연출 공개
      // 공개 시점에 잔량 배지 반영
      _peakState = { ..._peakState, balance: newBalance, loaded: true };
      renderPeakBadge();
      if (typeof analytics !== 'undefined') analytics.track('attendance_box_opened', { reward, balance_after: newBalance });
    };

    overlay.classList.add('attendance-modal-overlay--show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, ATTENDANCE_MODAL_DELAY_MS);
}

function closeTrainingAttendanceModal() {
  const o = document.getElementById('attendance-modal-overlay');
  if (o) o.classList.remove('attendance-modal-overlay--show');
}

// ── 출석 체크(접속 시 1일 1회) → 랜덤상자로 일반피크 지급 ─────────
// home.html 진입(app_open) 시점에만 호출. DB(claim_daily_attendance RPC)가 1일 1회를
// 서버 기준으로 보장하며, RPC 실패(dev/비로그인) 시 localStorage 폴백으로 동작.
async function claimDailyAttendance() {
  const KEY = 'training_stats';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const stats = JSON.parse(localStorage.getItem(KEY) || '{}');

  // 이 기기에서 오늘 이미 처리 — RPC↔폴백 경로 왕복 중복지급 방지
  if (stats.attendance_claimed_date === today) return;

  let reward, newBalance;
  const r = await _peakRpc('claim_daily_attendance');
  if (r) {
    if (!r.ok) { // 오늘 이미 수령(다른 기기 등) — 로컬에도 기록해 재시도 차단
      stats.attendance_claimed_date = today;
      localStorage.setItem(KEY, JSON.stringify(stats));
      return;
    }
    reward     = r.reward;
    newBalance = r.balance;
    stats.attendance_claimed_date = today;
  } else {
    const local = _localPeakGet();
    reward     = _rollAttendanceReward();
    newBalance = local.balance + reward;
    _localPeakSet(newBalance, local.peakbox_count);
    stats.attendance_claimed_date = today;
    stats.att_total = (stats.att_total || 0) + 1; // 누적출석 퀘스트 카운터(폴백)
  }

  // 연속 출석일수 갱신 (클라 로컬, training.html 통계와 공유)
  if (stats.streak_last_counted_date === yesterday) stats.streak = (stats.streak || 0) + 1;
  else if (stats.streak_last_counted_date !== today) stats.streak = 1;
  stats.streak_last_counted_date = today;
  localStorage.setItem(KEY, JSON.stringify(stats));
  if (typeof syncTrainingStatsToDB === 'function') syncTrainingStatsToDB();
  if (typeof reviewQualify === 'function' && (stats.streak || 0) >= 3) reviewQualify('streak_3');

  addXp(BEHAVE_XP.attendance); // 행동형 XP: 일일 출석
  if (getPlan() === 'pro') return; // Pro: 피크 무제한 — 랜덤피크 모달 불필요
  showTrainingAttendanceModal(stats.streak, reward, newBalance);
}

// ── 출석 달력 (30일 도장판, 순환) ─────────────────────────────
// 접속 시 advance_attendance() 로 도장 진행. 5일 배수(5·10·15·20·25·30) 도달 시
// 피크상자 2·3·5·5·5·10 즉시 지급 + 획득 모달. 갭은 보충출석(사이클당 3회)으로 이어감.
// DB RPC 우선, 실패(dev/비로그인) 시 localStorage 폴백. claim_daily_attendance(랜덤피크)와 병행.
const ATTENDANCE_TOTAL_DAYS = 30;
const ATTENDANCE_MILESTONES = { 5: 2, 10: 3, 15: 5, 20: 5, 25: 5, 30: 10 };
const ATTENDANCE_MAKEUP_MAX = 3;
let _attState = { day: 0, makeup_left: ATTENDANCE_MAKEUP_MAX, needs_makeup: false, loaded: false };

function _attReward(day) { return ATTENDANCE_MILESTONES[day] || 0; }
function _kstToday() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
function _dayDiff(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

// dev/비로그인 폴백: training_stats 에 att_day/att_last_date/att_makeup_left 저장
function _localAttGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { day: s.att_day || 0, last: s.att_last_date || null,
           makeup: (s.att_makeup_left == null ? ATTENDANCE_MAKEUP_MAX : s.att_makeup_left) };
}
function _localAttSet(day, last, makeup) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.att_day = day; s.att_last_date = last; s.att_makeup_left = makeup;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

// SQL advance_attendance() 미러
function _localAdvance() {
  const today = _kstToday();
  const a = _localAttGet();
  if (a.last === today) return { advanced: false, day: a.day, makeup_left: a.makeup, needs_makeup: false, already: true };
  if (a.last && _dayDiff(a.last, today) >= 2) {
    if (a.makeup > 0) return { advanced: false, day: a.day, makeup_left: a.makeup, needs_makeup: true };
    _localAttSet(1, today, ATTENDANCE_MAKEUP_MAX); // 보충 소진 → 사이클 리셋
    return { advanced: true, day: 1, makeup_left: ATTENDANCE_MAKEUP_MAX, reward: 0, needs_makeup: false, reset: true };
  }
  let day = a.day, mk = a.makeup;
  if (day >= ATTENDANCE_TOTAL_DAYS) { day = 1; mk = ATTENDANCE_MAKEUP_MAX; } else day = day + 1;
  const reward = _attReward(day);
  _localAttSet(day, today, mk);
  if (reward > 0) { const l = _localPeakGet(); _localPeakSet(l.balance, l.peakbox_count + reward); }
  return { advanced: true, day, makeup_left: mk, reward, needs_makeup: false };
}

// SQL makeup_attendance() 미러
function _localMakeup() {
  const today = _kstToday();
  const a = _localAttGet();
  if (a.last === today) return null;
  if (!a.last || _dayDiff(a.last, today) < 2) return null;
  if (a.makeup <= 0) return null;
  let mk = a.makeup - 1, day = a.day;
  if (day >= ATTENDANCE_TOTAL_DAYS) { day = 1; mk = ATTENDANCE_MAKEUP_MAX; } else day = day + 1;
  const reward = _attReward(day);
  _localAttSet(day, today, mk);
  if (reward > 0) { const l = _localPeakGet(); _localPeakSet(l.balance, l.peakbox_count + reward); }
  return { ok: true, day, makeup_left: mk, reward };
}

// 접속 시 도장 진행 (home 진입에서 claimDailyAttendance 와 병행 호출)
async function advanceAttendance(onDone) {
  const r = await _peakRpc('advance_attendance');
  let res;
  if (r) {
    res = r;
    if (r.reward > 0) _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    res = _localAdvance();
  }
  _attState = { day: res.day, makeup_left: res.makeup_left, needs_makeup: !!res.needs_makeup, loaded: true };
  renderPeakboxBadge();
  // 오늘 도장 실제로 찍힘 → 달력 자동 오픈 + 오늘 칸 도장 애니메이션
  if (res.advanced) setTimeout(() => openAttendanceCalendar(res.day), ATTENDANCE_CAL_DELAY_MS);

  // 마일스톤(보상칸) 도장 → 애니메이션 후 피크상자 수령 모달 자동 표시 (호출 경로 무관)
  // onDone: 모달 닫힘(보상 없으면 즉시) 후 이어질 콜백 — 홈 플로우의 랜덤피크 모달 연결용
  const stampDelay = res.advanced ? ATTENDANCE_CAL_DELAY_MS + STAMP_ANIM_MS + 200 : 0;
  setTimeout(() => {
    if (res.advanced && res.reward > 0) {
      showPeakboxRewardModal(res.reward, onDone);
    } else if (typeof onDone === 'function') {
      onDone();
    }
  }, stampDelay);
  return res;
}

// 접속 시 출석 플로우 오케스트레이터 (home 진입에서 호출).
// 순서: ① 출석도장(달력 자동오픈+애니메이션) → ② 마일스톤 상자모달 → ③ 매일 랜덤피크 모달
async function runDailyAttendanceFlow() {
  advanceAttendance(() => { claimDailyAttendance(); });
}

// animateDay: 해당 칸 도장에 찍힘 애니메이션 부여(방금 찍힌 오늘 칸). 없으면 정적 렌더.
function openAttendanceCalendar(animateDay) {
  const grid = document.getElementById('attend-cal-grid');
  const overlay = document.getElementById('attend-cal-overlay');
  if (!grid || !overlay) return;

  const st = _attState.loaded ? _attState : (function () {
    const a = _localAttGet(); return { day: a.day, makeup_left: a.makeup, needs_makeup: false };
  })();
  const stamped = st.day;
  const boxSvg = '<img src="image/gift.png" class="acc-box-icon" alt="">';

  let html = '';
  for (let d = 1; d <= ATTENDANCE_TOTAL_DAYS; d++) {
    const done      = d <= stamped;
    const milestone = ATTENDANCE_MILESTONES[d];
    const cls = ['acc-cell'];
    if (done) cls.push('acc-cell--done');
    if (milestone) cls.push('acc-cell--milestone');
    if (done && d === animateDay) cls.push('acc-cell--animate');
    // 마일스톤=피크상자(+개수), 일반=날짜 숫자. 찍힌 날은 도장을 위에 겹침.
    const base = milestone
      ? boxSvg + '<span class="acc-box-count">' + milestone + '</span>'
      : '<span class="acc-day-num">' + d + '</span>';
    const inner = base + (done ? '<span class="acc-stamp"><i data-lucide="guitar"></i></span>' : '');
    html += '<div class="' + cls.join(' ') + '">' + inner + '</div>';
  }
  grid.innerHTML = html;
  // 도장 소리 싱크: CSS 애니메이션 실제 시작(animationstart, delay 경과 후) 기준으로
  // "쾅" 내려찍는 임팩트(55% 지점 = duration*0.55)에 맞춰 재생. reflow/paint 지연 영향 제거.
  if (animateDay) {
    const stampEl = grid.querySelector('.acc-cell--animate .acc-stamp');
    if (stampEl) stampEl.addEventListener('animationstart',
      () => setTimeout(() => _playSfx('stamp.mp3'), STAMP_IMPACT_OFFSET_MS), { once: true });
  }

  const mkCountEl = document.getElementById('attend-cal-makeup-count');
  if (mkCountEl) mkCountEl.textContent = st.makeup_left;
  const mkBtn = document.getElementById('attend-cal-makeup');
  if (mkBtn) mkBtn.disabled = !(st.needs_makeup && st.makeup_left > 0);

  overlay.classList.add('attend-cal-overlay--show');
  // 도장 찍는 경로(일일 첫 접속·보충)=attendance.mp3, 홈배너 열람(animateDay 없음)=page.mp3
  _playSfx(animateDay ? 'attendance.mp3' : 'page.mp3', animateDay ? 0.5 : 1);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeAttendanceCalendar() {
  const overlay = document.getElementById('attend-cal-overlay');
  if (overlay) overlay.classList.remove('attend-cal-overlay--show');
}

// ── 퀘스트 XP 보상 (레벨 경험치, 상자 개수와 무관하게 티어별 개별 설정) ──
// 누적형: 티어 배열 3번째 원소 = XP. _tierXp(테이블, day, 오버플로XP)로 조회.
function _tierXp(tiers, day, overflowXp) {
  for (const t of tiers) if (t[0] === day) return t[2];
  return overflowXp || 0;
}
// 레벨/업적형: 레벨 구간별 XP.
function _scaleLvlXp(lvl)     { return lvl <= 5 ? 100 : (lvl <= 10 ? 150 : (lvl <= 17 ? 300 : 450)); }
function _quizLvlXp(lvl)      { return lvl <= 2 ? 50  : (lvl <= 5 ? 100 : 200); }
function _scalePerfectXp(lvl) { return lvl <= 5 ? 200 : (lvl <= 17 ? 350 : 600); }
function _perfectXp(lvl)      { return lvl <= 2 ? 200 : (lvl <= 8 ? 350 : 600); }
const _CHALLENGE_XP = { c1: 800, c2: 1200, c3: 1800 };

// ── 행동형 XP (사일런트 적립 — 액션 시 화면표시 없음, 프로필 획득표로 확인) ──
const BEHAVE_XP = {
  share: 100,      // 노트 공유 (리퍼럴 효과 — 마케팅 가치 높음)
  note: 50,        // 노트(프로젝트) 생성 (많이 생성하는 컨텐츠가 아니라 고보상)
  attendance: 15,  // 일일 출석
  per10min: 10,    // 훈련시간 10분당 (quiz·scale)
  progression: 10, // 코드 진행 재생 완료
  strum: 10,       // 주법 훈련 완료
  quiz: 5,         // 코드 맞추기 세션 완료
  scale: 5,        // 스케일 훈련 세션 완료
  image: 2,        // 코드 이미지 저장
  combo: 15,       // 코드 조합 훈련 세션 완료 (정답 무관)
};

// ── 퀘스트: 누적출석 (평생 총 출석일수, 30일 순환달력과 별개) ──────
// 티어 3·7·14·30·100·200·365·500 → 상자 1·1·2·3·5·5·10·20. 500 이후 매 100일 → 5.
// 진행값(att_total)·수령여부(att_quest_claimed)는 DB(claim_daily_attendance가 +1) 기준,
// 폴백 시 training_stats 에 저장. 카드에는 "다음 티어 1개"만 표시하고 수령하면 갱신.
// 3번째 원소 = XP. 오버플로(500+)는 _tierXp overflowXp=1500.
const ATT_QUEST_TIERS = [[3, 1, 50], [7, 1, 100], [14, 2, 150], [30, 3, 300], [100, 5, 600], [200, 5, 900], [365, 10, 1500], [500, 20, 3000]];

// 마지막 수령 임계(claimed) 기준 다음 티어 {day, reward}. 365 이후 매 100일 상자5.
function _attQuestNext(claimed) {
  for (const [d, r] of ATT_QUEST_TIERS) if (claimed < d) return { day: d, reward: r };
  return { day: claimed + 100, reward: 5 };
}

// 폴백: training_stats 에서 att_total / att_quest_claimed 조회
function _localAttQuestGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { total: s.att_total || 0, claimed: s.att_quest_claimed || 0 };
}
function _localAttQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.att_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

// 누적출석 퀘스트 상태 로드 (RPC 우선, 폴백)
async function loadAttendanceQuest() {
  const r = await _peakRpc('get_attendance_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localAttQuestGet();
  const n = _attQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

// 누적출석 퀘스트 1단계 수령 (RPC 우선, 폴백). 성공 시 상자 지급 + 카드 갱신.
async function claimAttendanceQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(ATT_QUEST_TIERS, (await loadAttendanceQuest()).next_day, 1500);
  const r = await _peakRpc('claim_attendance_quest');
  if (r) {
    if (!r.ok) return; // 미도달
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localAttQuestGet();
    const n = _attQuestNext(l.claimed);
    if (l.total < n.day) return; // 미도달
    _localAttQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList(); // 다음 티어로 갱신
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드이미지 저장 (누적 stat_images, 1회성, 반복 없음) ──────
// 티어 1·5·15·30·50·100·200·500·1000 → 상자 1·1·1·2·2·3·3·5·10. 1000 이후 종료.
// 진행값 = 기존 stat_images(순수 이미지 저장 누적), 폴백 시 chorditor_stats.images.
const IMG_QUEST_TIERS = [[1, 1, 30], [5, 1, 50], [15, 1, 100], [30, 2, 150], [50, 2, 250], [100, 3, 350], [200, 3, 500], [500, 5, 900], [1000, 10, 1800]];

// 다음 티어 {day, reward}. 종료 시 day=0.
function _imgQuestNext(claimed) {
  for (const [d, r] of IMG_QUEST_TIERS) if (claimed < d) return { day: d, reward: r };
  return { day: 0, reward: 0 };
}
function _localImgQuestGet() {
  const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  return { total: s.images || 0, claimed: s.img_quest_claimed || 0 };
}
function _localImgQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  s.img_quest_claimed = claimed;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

async function loadImageQuest() {
  const r = await _peakRpc('get_image_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localImgQuestGet();
  const n = _imgQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimImageQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(IMG_QUEST_TIERS, (await loadImageQuest()).next_day);
  const r = await _peakRpc('claim_image_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localImgQuestGet();
    const n = _imgQuestNext(l.claimed);
    if (n.day === 0 || l.total < n.day) return;
    _localImgQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 노트 생성 / 노트 공유 (누적, 1회성, 반복 없음) ──────────
// 티어(생성·공유 동일) 1·3·5·10·15·20·30·50 → 상자 1·2·2·2·2·3·3·5. 50 종료.
// 생성 진행값 = stat_notes(프로젝트 생성 시 +1), 공유 = stat_shares(기존). 폴백 chorditor_stats.
const NOTE_QUEST_TIERS = [[1, 1, 50], [3, 2, 100], [5, 2, 150], [10, 2, 200], [15, 2, 250], [20, 3, 300], [30, 3, 450], [50, 5, 750]];

function _noteQuestNext(claimed) {
  for (const [d, r] of NOTE_QUEST_TIERS) if (claimed < d) return { day: d, reward: r };
  return { day: 0, reward: 0 };
}
// kind: 'create' | 'share'. 폴백 진행값·claimed 키 매핑.
function _localNoteQuestGet(kind) {
  const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  const total = kind === 'create' ? (s.notes || 0) : (s.shares || 0);
  const ck = kind === 'create' ? 'note_quest_claimed' : 'share_quest_claimed';
  return { total, claimed: s[ck] || 0 };
}
function _localNoteQuestSetClaimed(kind, claimed) {
  const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  s[kind === 'create' ? 'note_quest_claimed' : 'share_quest_claimed'] = claimed;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

async function loadNoteQuest(kind) {
  const fn = kind === 'create' ? 'get_note_create_quest' : 'get_note_share_quest';
  const r = await _peakRpc(fn);
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localNoteQuestGet(kind);
  const n = _noteQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimNoteQuest(kind) {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(NOTE_QUEST_TIERS, (await loadNoteQuest(kind)).next_day);
  const fn = kind === 'create' ? 'claim_note_create_quest' : 'claim_note_share_quest';
  const r = await _peakRpc(fn);
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localNoteQuestGet(kind);
    const n = _noteQuestNext(l.claimed);
    if (n.day === 0 || l.total < n.day) return;
    _localNoteQuestSetClaimed(kind, n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}
function claimNoteCreateQuest() { return claimNoteQuest('create'); }
function claimNoteShareQuest() { return claimNoteQuest('share'); }

// ── 퀘스트: 누적 훈련시간 (training_time_min 분, 무한 반복) ──────────
// 티어(분) 10·30·60·180·300·600·1800·3000·6000 → 상자 1·1·2·2·2·3·3·5·10.
// 6000분 이후 매 600분 → 상자5. 진행값=training_time_min, 폴백 training_stats.
const TIME_QUEST_TIERS = [[10, 1, 50], [30, 1, 100], [60, 2, 150], [180, 2, 250], [300, 2, 350], [600, 3, 500], [1800, 3, 800], [3000, 5, 1300], [6000, 10, 2500]];

function _timeQuestNext(claimed) {
  for (const [m, r] of TIME_QUEST_TIERS) if (claimed < m) return { day: m, reward: r };
  return { day: claimed + 600, reward: 5 };
}
function _fmtTimeGoal(min) { return min < 60 ? min + '분' : (min / 60) + '시간'; }
function _localTimeQuestGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { total: Math.floor(s.training_time_min || 0), claimed: s.time_quest_claimed || 0 };
}
function _localTimeQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.time_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadTimeQuest() {
  const r = await _peakRpc('get_time_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localTimeQuestGet();
  const n = _timeQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimTimeQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(TIME_QUEST_TIERS, (await loadTimeQuest()).next_day, 2500);
  const r = await _peakRpc('claim_time_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localTimeQuestGet();
    const n = _timeQuestNext(l.claimed);
    if (l.total < n.day) return;
    _localTimeQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드맞추기 누적완료횟수 (quiz sessions_completed 합, 무한반복) ──
// 티어 1·5·15·30·50·100·200·300·400·500 → 상자 1·1·2·2·2·3·3·3·3·5. 500 이후 매 50회 → 2.
// 진행값 = quiz_level_stats 합(폴백 quiz_stats_level*), 수령추적 = quiz_quest_claimed.
const QUIZ_QUEST_TIERS = [[1, 1, 30], [5, 1, 50], [15, 2, 100], [30, 2, 150], [50, 2, 250], [100, 3, 400], [200, 3, 550], [300, 3, 700], [400, 3, 850], [500, 5, 1200]];

function _quizQuestNext(claimed) {
  for (const [d, r] of QUIZ_QUEST_TIERS) if (claimed < d) return { day: d, reward: r };
  return { day: claimed + 50, reward: 2 };
}
// 폴백: quiz_stats_level* 전 레벨·전 모드 sessionsCompleted 합
function _localQuizTotal() {
  let sum = 0;
  for (let n = 0; n < localStorage.length; n++) {
    const k = localStorage.key(n);
    if (!k || !k.startsWith('quiz_stats_level')) continue;
    try {
      const o = JSON.parse(localStorage.getItem(k) || '{}');
      for (const m of ['name-from-diagram', 'diagram-from-name'])
        if (o[m]) sum += o[m].sessionsCompleted || 0;
    } catch (_) {}
  }
  return sum;
}
function _localQuizClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.quiz_quest_claimed || 0;
}
function _localQuizClaimedSet(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.quiz_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadQuizQuest() {
  const r = await _peakRpc('get_quiz_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const total = _localQuizTotal();
  const claimed = _localQuizClaimedGet();
  const n = _quizQuestNext(claimed);
  return { total, claimed, next_day: n.day, next_reward: n.reward };
}

async function claimQuizQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(QUIZ_QUEST_TIERS, (await loadQuizQuest()).next_day, 1200);
  const r = await _peakRpc('claim_quiz_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const total = _localQuizTotal();
    const claimed = _localQuizClaimedGet();
    const n = _quizQuestNext(claimed);
    if (total < n.day) return;
    _localQuizClaimedSet(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 스케일 훈련 누적완료횟수 (코드맞추기 누적과 동일 티어) ──────
// 진행값 = scale_completed(폴백 training_stats.scale_completed), 수령 = scale_quest_claimed.
function _localScaleQuestGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { total: s.scale_completed || 0, claimed: s.scale_quest_claimed || 0 };
}
function _localScaleQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.scale_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadScaleQuest() {
  const r = await _peakRpc('get_scale_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localScaleQuestGet();
  const n = _quizQuestNext(l.claimed); // 티어 동일
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimScaleQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(QUIZ_QUEST_TIERS, (await loadScaleQuest()).next_day, 1200);
  const r = await _peakRpc('claim_scale_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localScaleQuestGet();
    const n = _quizQuestNext(l.claimed);
    if (l.total < n.day) return;
    _localScaleQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 스케일 훈련 레벨 첫 완료 (레벨 1~20, 순차, 1회성) ──────────
// 각 레벨 1회 완료 시 clear. 보상 1~5→1, 6~10→2, 11~17→3, 18~20→5. MAX=20.
const SCALE_LVL_MAX = 20;
function _scaleLvlReward(lvl) { return lvl <= 5 ? 1 : (lvl <= 10 ? 2 : (lvl <= 17 ? 3 : 5)); }

// 스케일 레벨 완료 기록(scale-level.js 제출 완료 시 호출). 폴백은 로컬 stats 사용.
async function markScaleLevelCleared(level) { await _peakRpc('mark_scale_level_cleared', { p_level: level }); }

function _localScaleClearedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { cleared: s.scale_cleared || {}, claimed: s.scale_lvl_quest_claimed || 0 };
}
function _localScaleLvlClaimedSet(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.scale_lvl_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadScaleLevelQuest() {
  const r = await _peakRpc('get_scale_level_quest');
  if (r) return { next_level: r.next_level, reward: r.reward, done: r.done };
  const l = _localScaleClearedGet();
  const next = l.claimed + 1;
  if (next > SCALE_LVL_MAX) return { next_level: 0, reward: 0, done: false };
  return { next_level: next, reward: _scaleLvlReward(next), done: !!l.cleared[next] };
}

async function claimScaleLevelQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _scaleLvlXp((await loadScaleLevelQuest()).next_level);
  const r = await _peakRpc('claim_scale_level_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localScaleClearedGet();
    const next = l.claimed + 1;
    if (next > SCALE_LVL_MAX || !l.cleared[next]) return;
    _localScaleLvlClaimedSet(next);
    const local = _localPeakGet();
    const reward = _scaleLvlReward(next);
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드진행 누적 재생횟수 (코드맞추기 누적과 동일 티어) ────────
// 진행값 = progression_completed(폴백 training_stats.progression_completed), 수령 = progression_quest_claimed.
function _localProgressionQuestGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { total: s.progression_completed || 0, claimed: s.progression_quest_claimed || 0 };
}
function _localProgressionQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.progression_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadProgressionQuest() {
  const r = await _peakRpc('get_progression_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localProgressionQuestGet();
  const n = _quizQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimProgressionQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(QUIZ_QUEST_TIERS, (await loadProgressionQuest()).next_day, 1200);
  const r = await _peakRpc('claim_progression_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localProgressionQuestGet();
    const n = _quizQuestNext(l.claimed);
    if (l.total < n.day) return;
    _localProgressionQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 주법훈련 누적 재생횟수 (코드맞추기 누적과 동일 티어) ────────
// 진행값 = strum_completed(폴백 training_stats.strum_completed), 수령 = strum_quest_claimed.
function _localStrumQuestGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return { total: s.strum_completed || 0, claimed: s.strum_quest_claimed || 0 };
}
function _localStrumQuestSetClaimed(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.strum_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadStrumQuest() {
  const r = await _peakRpc('get_strum_quest');
  if (r) return { total: r.total, claimed: r.claimed, next_day: r.next_day, next_reward: r.next_reward };
  const l = _localStrumQuestGet();
  const n = _quizQuestNext(l.claimed);
  return { total: l.total, claimed: l.claimed, next_day: n.day, next_reward: n.reward };
}

async function claimStrumQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _tierXp(QUIZ_QUEST_TIERS, (await loadStrumQuest()).next_day, 1200);
  const r = await _peakRpc('claim_strum_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const l = _localStrumQuestGet();
    const n = _quizQuestNext(l.claimed);
    if (l.total < n.day) return;
    _localStrumQuestSetClaimed(n.day);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + n.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + n.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 스케일 훈련 레벨별 퍼펙트 (반복, 레벨 독립) ────────────────
// 각 레벨 100%정답(오답0) 제출 3회 누적마다 상자. 보상 1~5→3, 6~17→5, 18~20→8. 레벨 1~20.
// 스케일 레벨 이름(scale-training.html 과 동기화 — 변경 시 함께 수정).
const SCALE_LEVEL_NAMES = {
  1: '메이저 스케일', 2: '마이너 펜타토닉 스케일', 3: '마이너 블루스 스케일',
  4: '내추럴 마이너 스케일', 5: '하모닉 마이너 스케일',
  6: '4도 세컨더리 도미넌트', 7: '5도 세컨더리 도미넌트', 8: '6도 세컨더리 도미넌트',
  9: '2도 세컨더리 도미넌트', 10: '3도 세컨더리 도미넌트',
  11: '아이오니안 스케일', 12: '도리안 스케일', 13: '프리지안 스케일',
  14: '리디안 스케일', 15: '믹솔리디안 스케일', 16: '에올리안 스케일', 17: '로크리안 스케일',
  18: '멜로딕 마이너 스케일', 19: '프리지안 도미넌트 스케일', 20: '믹솔리디안 b9 b13 스케일',
};
function _scalePerfectReward(lvl) { return lvl <= 5 ? 3 : (lvl <= 17 ? 5 : 8); }

// 스케일 퍼펙트 제출 서버 카운트(scale-level.js 에서 호출). 폴백은 로컬 stat 사용.
async function incrementScalePerfect(level) { await _peakRpc('increment_scale_perfect', { p_level: level }); }

function _localScalePerfectTotal(lvl) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return (s.scale_perfect || {})[lvl] || 0;
}
function _localScalePerfectClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.scale_perfect_claimed || {};
}
function _localScalePerfectClaimedSet(obj) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.scale_perfect_claimed = obj;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadScalePerfectQuest() {
  const r = await _peakRpc('get_scale_perfect_quest');
  if (Array.isArray(r)) return r;
  const claimed = _localScalePerfectClaimedGet();
  const arr = [];
  for (let L = 1; L <= SCALE_LVL_MAX; L++) {
    const total = _localScalePerfectTotal(L);
    arr.push({ level: L, perfect: total, earned: Math.floor(total / 3),
      claimed: claimed[L] || 0, reward: _scalePerfectReward(L) });
  }
  return arr;
}

async function claimScalePerfectQuest(level) {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _scalePerfectXp(level);
  const r = await _peakRpc('claim_scale_perfect_quest', { p_level: level });
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const total = _localScalePerfectTotal(level);
    const claimedObj = _localScalePerfectClaimedGet();
    const claimed = claimedObj[level] || 0;
    if (Math.floor(total / 3) <= claimed) return;
    claimedObj[level] = claimed + 1;
    _localScalePerfectClaimedSet(claimedObj);
    const local = _localPeakGet();
    const reward = _scalePerfectReward(level);
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// 레벨별 퍼펙트 개별 카드(레벨 1~20)
function _scalePerfectCardsHtml(list) {
  return list.map(q => {
    const pending = q.earned - q.claimed;
    const inCycle = q.perfect - q.claimed * 3;
    const tail = pending > 0
      ? '<button class="quest-card-claim" onclick="claimScalePerfectQuest(' + q.level + ')">수령</button>'
      : '<span class="quest-card-progress">' + Math.min(inCycle, 3) + ' / 3</span>';
    return '<div class="quest-card">' +
        '<div class="quest-card-info">' +
          '<span class="quest-card-title">(반복) ' + (SCALE_LEVEL_NAMES[q.level] || ('레벨 ' + q.level)) + '</span>' +
          '<span class="quest-card-desc">퍼펙트 정답 3회 마다</span>' +
        '</div>' +
        '<div class="quest-card-stats">' +
          _questRewardHtml(q.reward, _scalePerfectXp(q.level)) +
          '<div class="quest-card-progress-col">' + tail + '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

// ── 퀘스트: 코드맞추기 레벨 첫 완료 (숫자 레벨 1~11, 순차, 1회성) ──────
// 각 레벨 세션 1회 완료 시 수령. 순차 갱신. 보상 1·2→1, 3~5→2, 6+→3. MAX=11.
const QUIZ_LVL_MAX = 11;
function _quizLvlReward(lvl) { return lvl <= 2 ? 1 : (lvl <= 5 ? 2 : 3); }
function _localQuizLvlDone(lvl) {
  const o = JSON.parse(localStorage.getItem('quiz_stats_level' + lvl) || '{}');
  return (o['name-from-diagram']?.sessionsCompleted || 0) + (o['diagram-from-name']?.sessionsCompleted || 0);
}
function _localQuizLvlClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.quiz_lvl_quest_claimed || 0;
}
function _localQuizLvlClaimedSet(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.quiz_lvl_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadQuizLevelQuest() {
  const r = await _peakRpc('get_quiz_level_quest');
  if (r) return { next_level: r.next_level, reward: r.reward, done: r.done };
  const claimed = _localQuizLvlClaimedGet();
  const next = claimed + 1;
  if (next > QUIZ_LVL_MAX) return { next_level: 0, reward: 0, done: 0 };
  return { next_level: next, reward: _quizLvlReward(next), done: _localQuizLvlDone(next) };
}

async function claimQuizLevelQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _quizLvlXp((await loadQuizLevelQuest()).next_level);
  const r = await _peakRpc('claim_quiz_level_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const claimed = _localQuizLvlClaimedGet();
    const next = claimed + 1;
    if (next > QUIZ_LVL_MAX || _localQuizLvlDone(next) < 1) return;
    _localQuizLvlClaimedSet(next);
    const local = _localPeakGet();
    const reward = _quizLvlReward(next);
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드맞추기 레벨별 퍼펙트 (반복, 레벨 독립, 아코디언) ──────
// 각 레벨 100%정답 3회 누적마다 상자. 보상 1·2→3, 3~8→5, 9~11→8. 숫자 레벨 1~11.
// 진행값 = quiz_stats_level{L} perfectSessions 모드합, 수령추적 = training_stats.perfect_claimed{L:n}.
// 숫자 레벨 1~11 이름(chord-name-quiz.js LEVEL_CONFIGS 와 동기화 — 변경 시 함께 수정).
const QUIZ_LEVEL_NAMES = {
  1: '필수 코드', 2: '하이코드 입문', 3: '코드 꾸미기', 4: '필수 분수코드',
  5: '필수 7th코드', 6: '프렛의 확장', 7: '기능성 & 오픈코드', 8: '7th 코드 정복하기',
  9: '쉘 보이싱 & 드롭 보이싱', 10: '텐션코드', 11: '하이브리드 코드',
};
function _perfectReward(lvl) { return lvl <= 2 ? 3 : (lvl <= 8 ? 5 : 8); }
function _localPerfectLevelTotal(lvl) {
  const o = JSON.parse(localStorage.getItem('quiz_stats_level' + lvl) || '{}');
  return (o['name-from-diagram']?.perfectSessions || 0) + (o['diagram-from-name']?.perfectSessions || 0);
}
function _localPerfectClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.perfect_claimed || {};
}
function _localPerfectClaimedSet(obj) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.perfect_claimed = obj;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadPerfectQuest() {
  const r = await _peakRpc('get_perfect_quest');
  if (Array.isArray(r)) return r;
  const claimed = _localPerfectClaimedGet();
  const arr = [];
  for (let L = 1; L <= 11; L++) {
    const total = _localPerfectLevelTotal(L);
    arr.push({ level: L, perfect: total, earned: Math.floor(total / 3),
      claimed: claimed[L] || 0, reward: _perfectReward(L) });
  }
  return arr;
}

async function claimPerfectQuest(level) {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _perfectXp(level);
  const r = await _peakRpc('claim_perfect_quest', { p_level: level });
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const total = _localPerfectLevelTotal(level);
    const claimedObj = _localPerfectClaimedGet();
    const claimed = claimedObj[level] || 0;
    if (Math.floor(total / 3) <= claimed) return;
    claimedObj[level] = claimed + 1;
    _localPerfectClaimedSet(claimedObj);
    const local = _localPeakGet();
    const reward = _perfectReward(level);
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드맞추기 챌린지 퍼펙트 (반복, 챌린지 독립) ──────────────
// c1 브론즈·c2 실버·c3 골드. 각 100%정답 3회 누적마다 상자 10·15·20.
// 진행값 = DB challenge_perfect(폴백 quiz_stats_level{ch}.perfectSessions), 수령 = challenge_claimed.
const CHALLENGE_LIST = [
  { ch: 'c1', name: '브론즈 챌린지', reward: 10 },
  { ch: 'c2', name: '실버 챌린지',   reward: 15 },
  { ch: 'c3', name: '골드 챌린지',   reward: 20 },
];

// 세션 종료 시 챌린지 퍼펙트 서버 카운트(chord-name-quiz.js 에서 호출). 폴백은 로컬 stat 사용.
async function incrementChallengePerfect(ch) { await _peakRpc('increment_challenge_perfect', { p_ch: ch }); }

function _localChallengePerfect(ch) {
  const o = JSON.parse(localStorage.getItem('quiz_stats_level' + ch) || '{}');
  return (o['name-from-diagram']?.perfectSessions || 0) + (o['diagram-from-name']?.perfectSessions || 0);
}
function _localChallengeClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.challenge_claimed || {};
}
function _localChallengeClaimedSet(obj) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.challenge_claimed = obj;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadChallengeQuest() {
  const r = await _peakRpc('get_challenge_quest');
  if (Array.isArray(r)) return r;
  const claimed = _localChallengeClaimedGet();
  return CHALLENGE_LIST.map(c => {
    const perfect = _localChallengePerfect(c.ch);
    return { ch: c.ch, perfect, earned: Math.floor(perfect / 3),
      claimed: claimed[c.ch] || 0, reward: c.reward };
  });
}

async function claimChallengeQuest(ch) {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _CHALLENGE_XP[ch] || 0;
  const r = await _peakRpc('claim_challenge_quest', { p_ch: ch });
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const perfect = _localChallengePerfect(ch);
    const claimedObj = _localChallengeClaimedGet();
    const claimed = claimedObj[ch] || 0;
    if (Math.floor(perfect / 3) <= claimed) return;
    const reward = (CHALLENGE_LIST.find(c => c.ch === ch) || {}).reward || 0;
    claimedObj[ch] = claimed + 1;
    _localChallengeClaimedSet(claimedObj);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

const _CHALLENGE_NAME = { c1: '브론즈 챌린지', c2: '실버 챌린지', c3: '골드 챌린지' };
// 챌린지 퍼펙트 개별 카드(c1~c3)
function _challengeCardsHtml(list) {
  return list.map(q => {
    const pending = q.earned - q.claimed;
    const inCycle = q.perfect - q.claimed * 3;
    const tail = pending > 0
      ? '<button class="quest-card-claim" onclick="claimChallengeQuest(\'' + q.ch + '\')">수령</button>'
      : '<span class="quest-card-progress">' + Math.min(inCycle, 3) + ' / 3</span>';
    return '<div class="quest-card">' +
        '<div class="quest-card-info">' +
          '<span class="quest-card-title">(반복) ' + (_CHALLENGE_NAME[q.ch] || q.ch) + '</span>' +
          '<span class="quest-card-desc">퍼펙트 정답 3회 마다</span>' +
        '</div>' +
        '<div class="quest-card-stats">' +
          _questRewardHtml(q.reward, _CHALLENGE_XP[q.ch] || 0) +
          '<div class="quest-card-progress-col">' + tail + '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

// 레벨별 퍼펙트 개별 카드(레벨 1~11)
function _perfectCardsHtml(list) {
  return list.map(q => {
    const pending = q.earned - q.claimed;      // 수령 대기 횟수
    const inCycle = q.perfect - q.claimed * 3;  // 현재 사이클 누적(0~2)
    const tail = pending > 0
      ? '<button class="quest-card-claim" onclick="claimPerfectQuest(' + q.level + ')">수령</button>'
      : '<span class="quest-card-progress">' + Math.min(inCycle, 3) + ' / 3</span>';
    return '<div class="quest-card">' +
        '<div class="quest-card-info">' +
          '<span class="quest-card-title">(반복) ' + (QUIZ_LEVEL_NAMES[q.level] || ('레벨 ' + q.level)) + '</span>' +
          '<span class="quest-card-desc">퍼펙트 정답 3회 마다</span>' +
        '</div>' +
        '<div class="quest-card-stats">' +
          _questRewardHtml(q.reward, _perfectXp(q.level)) +
          '<div class="quest-card-progress-col">' + tail + '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

// ── 퀘스트: 코드 조합 훈련 장 첫 완료 (1~8, 순차, 1회성) ──────────────
// 정답 수 무관 — 10문제 세션 1회만 완료하면 수령. 코드맞추기 레벨퀘스트와 동일 패턴.
// 보상 1·2장→1, 3~5장→2, 6~8장→3. XP는 _quizLvlXp 재사용(동일 곡선).
const COMBO_LVL_MAX = 8;
function _comboLvlReward(ch) { return ch <= 2 ? 1 : (ch <= 5 ? 2 : 3); }
const COMBO_CHAPTER_NAMES = {
  1: '패밀리코드', 2: '패밀리코드의 대리코드', 3: '세컨더리 도미넌트',
  4: 'Rel. IIm-V-I', 5: '도미넌트의 대리코드', 6: '텐션코드 1',
  7: '마이너 패밀리코드', 8: '모달 인터체인지',
};

// 세션 종료 시 서버 카운트(chord-combo.js 에서 호출, fire-and-forget). 폴백은 로컬 stat 사용.
async function incrementComboComplete(chapter, perfect) {
  await _peakRpc('increment_combo_complete', { p_chapter: chapter, p_perfect: !!perfect });
}

function _localComboLvlDone(ch) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s['combo_completed' + ch] || 0;
}
function _localComboLvlClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.combo_lvl_quest_claimed || 0;
}
function _localComboLvlClaimedSet(claimed) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.combo_lvl_quest_claimed = claimed;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadComboLevelQuest() {
  const r = await _peakRpc('get_combo_level_quest');
  if (r) return { next_level: r.next_level, reward: r.reward, done: r.done };
  const claimed = _localComboLvlClaimedGet();
  const next = claimed + 1;
  if (next > COMBO_LVL_MAX) return { next_level: 0, reward: 0, done: 0 };
  return { next_level: next, reward: _comboLvlReward(next), done: _localComboLvlDone(next) };
}

async function claimComboLevelQuest() {
  const _boxBefore = _peakState.peakbox_count || 0;
  const _xpGain = _quizLvlXp((await loadComboLevelQuest()).next_level);
  const r = await _peakRpc('claim_combo_level_quest');
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const claimed = _localComboLvlClaimedGet();
    const next = claimed + 1;
    if (next > COMBO_LVL_MAX || _localComboLvlDone(next) < 1) return;
    _localComboLvlClaimedSet(next);
    const local = _localPeakGet();
    const reward = _comboLvlReward(next);
    _localPeakSet(local.balance, local.peakbox_count + reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// ── 퀘스트: 코드 조합 훈련 티어별 퍼펙트 (반복, 장 3개 그룹) ────────────
// 장마다 독립 — 그 장 퍼펙트(10문제 전부 정답) 3회 누적마다 보상. 난이도 무관.
// 보상은 장 범위(티어)로 결정: 1~2장→300XP+상자3 / 3~5장→500XP+상자5 / 6~8장→750XP+상자8.
function _comboPerfectTierFor(ch) { return ch <= 2 ? { reward: 3, xp: 300 } : (ch <= 5 ? { reward: 5, xp: 500 } : { reward: 8, xp: 750 }); }
function _localComboPerfectTotal(ch) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s['combo_perfect' + ch] || 0;
}
function _localComboPerfectClaimedGet() {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  return s.combo_perfect_claimed || {};
}
function _localComboPerfectClaimedSet(obj) {
  const s = JSON.parse(localStorage.getItem('training_stats') || '{}');
  s.combo_perfect_claimed = obj;
  localStorage.setItem('training_stats', JSON.stringify(s));
}

async function loadComboPerfectQuest() {
  const r = await _peakRpc('get_combo_perfect_quest');
  if (Array.isArray(r)) return r;
  const claimed = _localComboPerfectClaimedGet();
  const arr = [];
  for (let ch = 1; ch <= COMBO_LVL_MAX; ch++) {
    const total = _localComboPerfectTotal(ch);
    const tier  = _comboPerfectTierFor(ch);
    arr.push({ level: ch, perfect: total, earned: Math.floor(total / 3),
      claimed: claimed[ch] || 0, reward: tier.reward, xp: tier.xp });
  }
  return arr;
}

async function claimComboPerfectQuest(ch) {
  const _boxBefore = _peakState.peakbox_count || 0;
  const tier     = _comboPerfectTierFor(ch);
  const _xpGain  = tier.xp;
  const r = await _peakRpc('claim_combo_perfect_quest', { p_chapter: ch });
  if (r) {
    if (!r.ok) return;
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    const total = _localComboPerfectTotal(ch);
    const claimedObj = _localComboPerfectClaimedGet();
    const claimed = claimedObj[ch] || 0;
    if (Math.floor(total / 3) <= claimed) return;
    claimedObj[ch] = claimed + 1;
    _localComboPerfectClaimedSet(claimedObj);
    const local = _localPeakGet();
    _localPeakSet(local.balance, local.peakbox_count + tier.reward);
    _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + tier.reward, loaded: true };
  }
  renderPeakboxBadge();
  renderQuestList();
  showPeakboxRewardModal((_peakState.peakbox_count || 0) - _boxBefore); // 수령 → 상자 획득 표시
  addXp(_xpGain); // 레벨 경험치
}

// 장별 퍼펙트 개별 카드(1~8장)
function _comboPerfectCardsHtml(list) {
  return list.map(q => {
    const pending = q.earned - q.claimed;      // 수령 대기 횟수
    const inCycle = q.perfect - q.claimed * 3;  // 현재 사이클 누적(0~2)
    const tail = pending > 0
      ? '<button class="quest-card-claim" onclick="claimComboPerfectQuest(' + q.level + ')">수령</button>'
      : '<span class="quest-card-progress">' + Math.min(inCycle, 3) + ' / 3</span>';
    return '<div class="quest-card">' +
        '<div class="quest-card-info">' +
          '<span class="quest-card-title">(반복) ' + (COMBO_CHAPTER_NAMES[q.level] || ('제' + q.level + '장')) + '</span>' +
          '<span class="quest-card-desc">퍼펙트 정답 3회 마다</span>' +
        '</div>' +
        '<div class="quest-card-stats">' +
          _questRewardHtml(q.reward, q.xp) +
          '<div class="quest-card-progress-col">' + tail + '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

// 공통 퀘스트 카드 HTML. next_day=0(완료)이면 빈 문자열.
// progressText: 진행도 표시 오버라이드(미지정 시 total/nextDay).
// 상자 아이콘(상) + XP(하) 세로 스택 리워드 컬럼
function _questRewardHtml(reward, xp) {
  return '<div class="quest-card-reward-col">' +
      '<span class="quest-card-reward"><img class="quest-card-reward-icon" src="image/gift.png" alt=""><span class="quest-card-reward-num">' + reward + '</span></span>' +
      '<span class="quest-card-xp">+' + xp + 'XP</span>' +
    '</div>';
}

function _questCardHtml(title, desc, reward, xp, total, nextDay, claimFn, progressText) {
  if (!nextDay) return '';
  const canClaim = total >= nextDay;
  const prog = progressText || (Math.min(total, nextDay) + ' / ' + nextDay);
  const tail = canClaim
    ? '<button class="quest-card-claim" onclick="' + claimFn + '()">수령</button>'
    : '<span class="quest-card-progress">' + prog + '</span>';
  return '<div class="quest-card">' +
      '<div class="quest-card-info">' +
        '<span class="quest-card-title">' + title + '</span>' +
        '<span class="quest-card-desc">' + desc + '</span>' +
      '</div>' +
      '<div class="quest-card-stats">' +
        _questRewardHtml(reward, xp) +
        '<div class="quest-card-progress-col">' + tail + '</div>' +
      '</div>' +
    '</div>';
}

// 퀘스트 모달 body에 카드 리스트 렌더 (각 퀘스트 다음 티어 1개)
// nextDay=0(퀘스트 종료)이면 항상 false. 그 외 total>=nextDay면 수령 가능.
function _isClaimable(total, nextDay) { return !!nextDay && total >= nextDay; }

function _questDividerHtml(label) {
  return '<div class="quest-divider"><span class="quest-divider-line"></span>' +
    '<span class="quest-divider-label">' + label + '</span>' +
    '<span class="quest-divider-line"></span></div>';
}

/* ── 경험치/레벨 시스템 (레벨 = 순수 그라인드축, 페르소나와 무관) ── */
// 레벨 L → L+1 필요 XP (구간별 계수). 만렙 50.
function _xpNeed(L) {
  if (L <= 10) return 50 * L;
  if (L <= 25) return 100 * L;
  if (L <= 40) return 210 * L;
  return 500 * L;
}
// 누적 XP → { level, into, need, pct }
function xpToLevel(xp) {
  let lv = 1, acc = 0;
  while (lv < 50) {
    const need = _xpNeed(lv);
    if (xp < acc + need) break;
    acc += need; lv++;
  }
  const need = lv >= 50 ? 0 : _xpNeed(lv);
  const into = xp - acc;
  const pct = lv >= 50 ? 100 : Math.min(100, Math.round(into / need * 100));
  return { level: lv, into: into, need: need, pct: pct };
}

/* ── 페르소나(칭호) 시스템 — 레벨과 독립, 온보딩 선택 + 퀴즈 승급으로만 변경 ── */
// 1~4단계: 온보딩 선택 가능 + 퀴즈 승급/즉시 강등. 5단계(guitar_master): 선택 불가, Lv45 자동해금.
const PERSONA_STAGES = ['unboxing', 'beginner', 'sheet_reader', 'home_master', 'guitar_master'];
const PERSONA_NAMES = {
  unboxing: '언박싱 1일차',
  beginner: '굳은살 비기너',
  sheet_reader: '악보의존자',
  home_master: '방구석 기타마스터',
  guitar_master: '기타마스터',
};
const PERSONA_UNLOCK_LV = 45; // guitar_master 자동해금 레벨
// 다음 페르소나 승급 자격(퀴즈 응시 가능) 레벨 게이트
const PERSONA_NEXT_GATE_LV = { beginner: 10, sheet_reader: 20, home_master: 35, guitar_master: 45 };

function getUserPersona() {
  return localStorage.getItem('user_persona') || 'unboxing';
}
function setUserPersona(key) {
  if (PERSONA_STAGES.indexOf(key) === -1) return;
  localStorage.setItem('user_persona', key);
}
// 표시용 페르소나 키: guitar_master는 저장값과 무관하게 Lv45 이상이면 자동 표시
function _effectivePersonaKey(level) {
  if (level >= PERSONA_UNLOCK_LV) return 'guitar_master';
  const stored = getUserPersona();
  return stored === 'guitar_master' ? 'home_master' : stored; // 레벨 미달인데 저장값만 남아있는 경우 방지
}
function _persona(level) {
  return PERSONA_NAMES[_effectivePersonaKey(level)];
}

// 홈 우상단 레벨 위젯 렌더 (즉시, 애니메이션 없음)
function renderTopbarLevel() {
  const el = document.getElementById('topbar-level');
  if (!el) return;
  const xp = parseInt(localStorage.getItem('user_xp') || '0', 10);
  const s = xpToLevel(xp);
  const num = document.getElementById('tbl-num');
  if (num) num.textContent = s.level;
  const per = document.getElementById('hdb-persona');
  if (per) per.textContent = _persona(s.level);
  const fill = document.getElementById('tbl-bar-fill');
  if (fill) fill.style.width = s.pct + '%';
}

// 프로필 탭 레벨/XP바 + 페르소나 렌더
function renderProfileXp() {
  const xp = parseInt(localStorage.getItem('user_xp') || '0', 10);
  const s = xpToLevel(xp);

  const lv = document.getElementById('profile-xp-lv');
  if (lv) lv.textContent = s.level;
  const num = document.getElementById('profile-xp-num');
  if (num) num.textContent = (s.level >= 50 ? (s.into + ' / ' + s.into) : (s.into + ' / ' + s.need)) + ' XP';
  const fill = document.getElementById('profile-xp-bar-fill');
  if (fill) fill.style.width = s.pct + '%';

  const pEl = document.getElementById('profile-persona');
  if (pEl) pEl.textContent = _persona(s.level);
  const hp = document.getElementById('hdb-persona');
  if (hp) hp.textContent = _persona(s.level);

  renderPersonaTrack(s.level);
}

// 페르소나 승급 트랙(5원+선) 렌더: 저장된 persona 기준(1~4단계) + Lv45 자동해금(5단계)
function renderPersonaTrack(level) {
  const track = document.getElementById('persona-track');
  if (!track) return;
  const curKey = _effectivePersonaKey(level);
  const curIdx = PERSONA_STAGES.indexOf(curKey);

  const nodes = track.querySelectorAll('.pt-node');
  nodes.forEach((node, i) => {
    node.classList.toggle('done', i < curIdx);
    node.classList.toggle('active', i === curIdx);
    node.classList.remove('eligible');
  });
  const lines = track.querySelectorAll('.pt-line');
  lines.forEach((line, i) => {
    line.classList.toggle('done', i < curIdx);
  });

  // 저장된 persona 기준 다음 단계가 레벨 게이트를 충족하면 하이라이트 (퀴즈 응시 가능 표시)
  const storedIdx = PERSONA_STAGES.indexOf(getUserPersona());
  const nextIdx = storedIdx + 1;
  if (nextIdx >= 1 && nextIdx <= 3) {
    const nextKey = PERSONA_STAGES[nextIdx];
    if (level >= PERSONA_NEXT_GATE_LV[nextKey]) {
      nodes[nextIdx]?.classList.add('eligible');
    }
  }
}

// XP 적립 + 게이지 상승 애니메이션 (레벨업 시 100%→0%→목표% 순차)
function addXp(amount) {
  if (!amount) return;
  const fill = document.getElementById('tbl-bar-fill');
  const num = document.getElementById('tbl-num');
  const per = document.getElementById('hdb-persona');
  const oldXp = parseInt(localStorage.getItem('user_xp') || '0', 10);
  const newXp = oldXp + amount;
  localStorage.setItem('user_xp', String(newXp));
  syncXpToDB(); // DB 귀속 (fire-and-forget)

  const before = xpToLevel(oldXp);
  const after = xpToLevel(newXp);

  // 바 위젯 유무와 무관하게 숫자/페르소나는 즉시 갱신 (데일리배너 등 바 없는 위젯 대응)
  if (num) num.textContent = after.level;
  if (per) per.textContent = _persona(after.level);

  if (!fill) return; // 바 위젯 없으면(다른 탭 등) 여기서 끝

  const levelUps = after.level - before.level;

  if (levelUps <= 0) {
    fill.style.width = after.pct + '%';
    return;
  }

  // 레벨업 1회 이상: 현재 레벨 채우기 → 0% 리셋 → 다음 레벨 채우기 ... 반복
  let step = 0;
  const runStep = () => {
    if (step === 0) {
      fill.style.width = '100%';
    } else if (step <= levelUps) {
      const lv = before.level + step;
      if (num) num.textContent = lv;
      if (per) per.textContent = _persona(lv);
      fill.style.transition = 'none';
      fill.style.width = '0%';
      // reflow 강제 후 transition 복원
      void fill.offsetWidth;
      fill.style.transition = 'width .4s ease';
      const isLast = step === levelUps;
      fill.style.width = (isLast ? after.pct : 100) + '%';
    }
    if (step < levelUps) {
      step++;
      setTimeout(runStep, 450);
    }
  };
  setTimeout(runStep, 0);
}

async function renderQuestList() {
  const body      = document.getElementById('quest-modal-body');
  const claimBody = document.getElementById('quest-modal-claimable');
  if (!body) return;
  const parts = [];
  const top   = [];

  // 전 퀘스트 병렬 로드 — 직렬 await 16회(왕복 누적 지연) → 동시 발사
  const [a, i, nc, ns, t, qz, ql, pf, cg, sc, sl, spf, pg, st, cl, cpf] = await Promise.all([
    loadAttendanceQuest(), loadImageQuest(), loadNoteQuest('create'), loadNoteQuest('share'),
    loadTimeQuest(), loadQuizQuest(), loadQuizLevelQuest(), loadPerfectQuest(),
    loadChallengeQuest(), loadScaleQuest(), loadScaleLevelQuest(), loadScalePerfectQuest(),
    loadProgressionQuest(), loadStrumQuest(), loadComboLevelQuest(), loadComboPerfectQuest(),
  ]);

  const aHtml = _questCardHtml('누적 출석', a.next_day + '일 누적 출석',
    a.next_reward, _tierXp(ATT_QUEST_TIERS, a.next_day, 1500), a.total, a.next_day, 'claimAttendanceQuest');
  parts.push(aHtml);
  if (_isClaimable(a.total, a.next_day)) top.push(aHtml);

  const iHtml = _questCardHtml('코드 이미지 저장', i.next_day + '개 저장',
    i.next_reward, _tierXp(IMG_QUEST_TIERS, i.next_day), i.total, i.next_day, 'claimImageQuest');
  parts.push(iHtml);
  if (_isClaimable(i.total, i.next_day)) top.push(iHtml);

  const ncHtml = _questCardHtml('노트 생성', nc.next_day + '개 생성',
    nc.next_reward, _tierXp(NOTE_QUEST_TIERS, nc.next_day), nc.total, nc.next_day, 'claimNoteCreateQuest');
  parts.push(ncHtml);
  if (_isClaimable(nc.total, nc.next_day)) top.push(ncHtml);

  const nsHtml = _questCardHtml('노트 공유', ns.next_day + '회 공유',
    ns.next_reward, _tierXp(NOTE_QUEST_TIERS, ns.next_day), ns.total, ns.next_day, 'claimNoteShareQuest');
  parts.push(nsHtml);
  if (_isClaimable(ns.total, ns.next_day)) top.push(nsHtml);

  let tProg;
  if (t.next_day < 60) {
    tProg = Math.min(t.total, t.next_day) + ' / ' + t.next_day; // 분
  } else {
    const tGoal = t.next_day / 60;
    tProg = (Math.min(t.total, t.next_day) / 60).toFixed(1) + ' / ' +
      (Number.isInteger(tGoal) ? tGoal : tGoal.toFixed(1)); // 시간
  }
  const tHtml = _questCardHtml('누적 훈련시간', _fmtTimeGoal(t.next_day) + ' 훈련',
    t.next_reward, _tierXp(TIME_QUEST_TIERS, t.next_day, 2500), t.total, t.next_day, 'claimTimeQuest', tProg);
  parts.push(tHtml);
  if (_isClaimable(t.total, t.next_day)) top.push(tHtml);
  parts.push(_questDividerHtml('코드 맞추기'));

  const qzHtml = _questCardHtml('코드 맞추기', '누적 ' + qz.next_day + '회 완료',
    qz.next_reward, _tierXp(QUIZ_QUEST_TIERS, qz.next_day, 1200), qz.total, qz.next_day, 'claimQuizQuest');
  parts.push(qzHtml);
  if (_isClaimable(qz.total, qz.next_day)) top.push(qzHtml);

  const qlDone = Math.min(ql.done, 1);
  const qlNextDay = ql.next_level ? 1 : 0;
  const qlHtml = _questCardHtml('코드 맞추기 레벨', '레벨' + ql.next_level + ' 첫 완료',
    ql.reward, _quizLvlXp(ql.next_level), qlDone, qlNextDay, 'claimQuizLevelQuest');
  parts.push(qlHtml);
  if (_isClaimable(qlDone, qlNextDay)) top.push(qlHtml);

  parts.push(_perfectCardsHtml(pf));
  const pfClaimable = pf.filter(q => q.earned > q.claimed);
  pfClaimable.forEach(q => top.push(_perfectCardsHtml([q])));

  parts.push(_challengeCardsHtml(cg));
  const cgClaimable = cg.filter(q => q.earned > q.claimed);
  cgClaimable.forEach(q => top.push(_challengeCardsHtml([q])));

  parts.push(_questDividerHtml('스케일훈련'));
  const scHtml = _questCardHtml('스케일 훈련', '누적 ' + sc.next_day + '회 완료',
    sc.next_reward, _tierXp(QUIZ_QUEST_TIERS, sc.next_day, 1200), sc.total, sc.next_day, 'claimScaleQuest');
  parts.push(scHtml);
  if (_isClaimable(sc.total, sc.next_day)) top.push(scHtml);

  const slDone = sl.done ? 1 : 0;
  const slNextDay = sl.next_level ? 1 : 0;
  const slHtml = _questCardHtml('스케일 레벨', '레벨' + sl.next_level + ' 첫 완료',
    sl.reward, _scaleLvlXp(sl.next_level), slDone, slNextDay, 'claimScaleLevelQuest');
  parts.push(slHtml);
  if (_isClaimable(slDone, slNextDay)) top.push(slHtml);

  parts.push(_scalePerfectCardsHtml(spf));
  const spfClaimable = spf.filter(q => q.earned > q.claimed);
  spfClaimable.forEach(q => top.push(_scalePerfectCardsHtml([q])));

  parts.push(_questDividerHtml('코드 진행 리스트'));
  const pgHtml = _questCardHtml('코드 진행', '누적 ' + pg.next_day + '회 재생',
    pg.next_reward, _tierXp(QUIZ_QUEST_TIERS, pg.next_day, 1200), pg.total, pg.next_day, 'claimProgressionQuest');
  parts.push(pgHtml);
  if (_isClaimable(pg.total, pg.next_day)) top.push(pgHtml);

  parts.push(_questDividerHtml('주법 리듬 훈련'));
  const stHtml = _questCardHtml('주법 훈련', '누적 ' + st.next_day + '회 재생',
    st.next_reward, _tierXp(QUIZ_QUEST_TIERS, st.next_day, 1200), st.total, st.next_day, 'claimStrumQuest');
  parts.push(stHtml);
  if (_isClaimable(st.total, st.next_day)) top.push(stHtml);

  parts.push(_questDividerHtml('코드 조합 훈련'));
  const clDone = Math.min(cl.done, 1);
  const clNextDay = cl.next_level ? 1 : 0;
  const clHtml = _questCardHtml('코드 조합 훈련',
    (COMBO_CHAPTER_NAMES[cl.next_level] || ('제' + cl.next_level + '장')) + ' 첫 완료',
    cl.reward, _quizLvlXp(cl.next_level), clDone, clNextDay, 'claimComboLevelQuest');
  parts.push(clHtml);
  if (_isClaimable(clDone, clNextDay)) top.push(clHtml);

  parts.push(_comboPerfectCardsHtml(cpf));
  const cpfClaimable = cpf.filter(q => q.earned > q.claimed);
  cpfClaimable.forEach(q => top.push(_comboPerfectCardsHtml([q])));

  body.innerHTML = parts.join('');
  if (claimBody) claimBody.innerHTML = top.slice(0, 3).join(''); // 수령 가능 목록 최대 3개
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const dot = document.getElementById('hdb-quest-dot');
  if (dot) dot.hidden = top.length === 0;
}

function openQuestModal() {
  const overlay = document.getElementById('quest-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('quest-modal-overlay--show');
  _playSfx('page.mp3');
  renderQuestList();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeQuestModal() {
  const overlay = document.getElementById('quest-modal-overlay');
  if (overlay) overlay.classList.remove('quest-modal-overlay--show');
}

// ── 경험치 획득 안내 (행동형 레퍼런스표, 프로필 XP바 클릭) ──
// 값은 BEHAVE_XP 단일 소스 참조 → 적립 로직과 항상 일치.
const XP_INFO_ROWS = [
  ['노트 공유',            BEHAVE_XP.share],
  ['노트 생성',            BEHAVE_XP.note],
  ['일일 출석',            BEHAVE_XP.attendance],
  ['훈련 10분당',          BEHAVE_XP.per10min],
  ['코드 진행 재생',        BEHAVE_XP.progression],
  ['주법 훈련',            BEHAVE_XP.strum],
  ['코드 맞추기 완료',      BEHAVE_XP.quiz],
  ['스케일 훈련 완료',      BEHAVE_XP.scale],
  ['코드 이미지 저장',      BEHAVE_XP.image],
  ['코드 조합 훈련 완료',    BEHAVE_XP.combo],
];

function openXpInfoModal() {
  const overlay = document.getElementById('xpinfo-overlay');
  const body    = document.getElementById('xpinfo-body');
  if (!overlay || !body) return;
  body.innerHTML = '<table class="xpinfo-table"><tbody>' +
    XP_INFO_ROWS.slice().sort((a, b) => b[1] - a[1]).map(([label, xp]) =>
      '<tr><td class="xpinfo-td-label">' + label + '</td>' +
      '<td class="xpinfo-td-xp">' + xp + 'XP</td></tr>').join('') +
    '</tbody></table>';
  overlay.classList.add('xpinfo-overlay--show');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeXpInfoModal() {
  const overlay = document.getElementById('xpinfo-overlay');
  if (overlay) overlay.classList.remove('xpinfo-overlay--show');
}

// 보충출석 (갭 상태에서만, 사이클당 3회). 1회 소진해 오늘 도장 이어감.
async function makeupAttendance() {
  if (!_attState.needs_makeup || _attState.makeup_left <= 0) return;
  const r = await _peakRpc('makeup_attendance');
  let res;
  if (r) {
    if (!r.ok) return;
    res = r;
    if (r.reward > 0) _peakState = { ..._peakState, peakbox_count: (_peakState.peakbox_count || 0) + r.reward, loaded: true };
  } else {
    res = _localMakeup();
    if (!res) return;
  }
  _attState = { day: res.day, makeup_left: res.makeup_left, needs_makeup: false, loaded: true };
  renderPeakboxBadge();
  openAttendanceCalendar(res.day); // 재렌더 + 오늘 칸 도장 애니메이션
  if (res.reward > 0) setTimeout(() => showPeakboxRewardModal(res.reward), STAMP_ANIM_MS + 150);
}

// 오늘 칸 도장 찍힘 애니메이션 완료 시각(ms) — style.css delay(0.4s)+duration(0.7s) 합
const STAMP_ANIM_MS = 1100;
// 도장 "쾅" 임팩트 오프셋(ms) — animationstart(delay 경과 후) 기준. ease-in이라 끝(duration)에서 쾅. 소리 싱크용
const STAMP_IMPACT_OFFSET_MS = 700;

// 마일스톤 피크상자 획득 모달. onClose = 확인/닫힘 시 콜백(다음 플로우 연결용).
// 피크상자 획득 연출(마일스톤/보상). gift 아이콘 등장 + '피크상자 +N' 라벨. 확인/탭 시 onClose 실행.
function showPeakboxRewardModal(count, onClose) {
  if (count <= 0) { if (typeof onClose === 'function') onClose(); return; }
  _playSfx('reward.mp3');
  showPeakReveal(null, {
    icon: 'gift',
    labelText: '+' + count + ' 상자',
    buttonText: '닫기',
    onButton: closePeakReveal,
    onClose: onClose,
  });
  if (typeof analytics !== 'undefined') analytics.track('attendance_milestone_reward', { peakbox: count });
}

// ── 1.3.0 업데이트 감사 이벤트 (기존 유저 대상 1회성 픽박스 50개 지급) ──
const EVENT_130_TITLE   = '1.3.0 업데이트 감사 이벤트';
const EVENT_130_MESSAGE = '기존 유저 분들에 대한 감사의 마음으로 \n 피크상자 보상을 드립니다!';
const EVENT_130_REWARD  = 50;

// 반환값: 모달을 띄웠으면 true (호출부에서 다른 팝업과 중첩 방지에 사용)
async function checkEventThanks130() {
  const r = await _peakRpc('get_event_130_status');
  if (!r || !r.eligible || r.claimed) return false;
  if (typeof openEventModal !== 'function') return false;
  openEventModal(EVENT_130_TITLE, EVENT_130_MESSAGE, EVENT_130_REWARD);
  if (typeof analytics !== 'undefined') analytics.track('event_130_viewed', {});
  return true;
}

async function claimEventThanks130() {
  if (typeof closeEventModal === 'function') closeEventModal();
  const r = await _peakRpc('claim_event_130_reward');
  if (!r || !r.ok) return;
  _peakState = { ..._peakState, peakbox_count: r.peakbox_count, loaded: true };
  renderPeakboxBadge();
  showPeakboxRewardModal(r.reward);
  if (typeof analytics !== 'undefined') analytics.track('event_130_claimed', { reward: r.reward });
}

// ── 사운드 볼륨 바텀시트 (home / progression-detail / strum-play 공용) ──────
// 해당 페이지에 sound-sheet 마크업이 있어야 동작. 없는 페이지에서는 호출되지 않음.
function openSoundSheet() {
  _playTap();
  const slider = document.getElementById('sound-volume-slider');
  // 슬라이더는 raw값 표시(getter는 raw² 게인이라 그대로 쓰면 desync)
  if (slider) {
    const raw = parseFloat(localStorage.getItem('sfx_volume'));
    slider.value = isNaN(raw) ? 100 : Math.round(Math.max(0, Math.min(1, raw)) * 100);
  }
  document.getElementById('sound-sheet-overlay').classList.add('gsheet-overlay--open');
  document.getElementById('sound-sheet').classList.add('gsheet--open');
  if (window.lucide) lucide.createIcons();
}

function closeSoundSheet() {
  _stopSoundPreview();
  document.getElementById('sound-sheet-overlay').classList.remove('gsheet-overlay--open');
  document.getElementById('sound-sheet').classList.remove('gsheet--open');
}

// 슬라이더 조작 중 A코드 반복 재생 → 실시간 음량 체감용
let _soundPreviewTimer     = null; // A코드 반복 재생 인터벌
let _soundPreviewStopTimer = null; // 슬라이드 멈춤 감지 후 정지 예약
function _playAPreview() {
  if (typeof GuitarAudio === 'undefined') return;
  if (window._chordSoundPlaying) return; // 코드진행/주법 재생 중엔 A코드 프리뷰 생략(사운드 겹침 방지)
  if (GuitarAudio.resume) GuitarAudio.resume();
  // 오픈 A 메이저 실제 보이싱: A2 E3 A3 C#4 E4 (저음 포함, 에디터 기본값과 동일)
  GuitarAudio.strumNotes([45, 52, 57, 61, 64], 0.02);
}
function _startSoundPreview() {
  if (_soundPreviewTimer) return; // 이미 재생 중이면 중복 시작 방지
  _playAPreview();
  _soundPreviewTimer = setInterval(_playAPreview, 1800); // 울림 유지
}
function _stopSoundPreview() {
  if (_soundPreviewTimer)     { clearInterval(_soundPreviewTimer); _soundPreviewTimer = null; }
  if (_soundPreviewStopTimer) { clearTimeout(_soundPreviewStopTimer); _soundPreviewStopTimer = null; }
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
}

function onSoundVolumeInput(val) {
  const v = Math.max(0, Math.min(100, parseInt(val, 10) || 0)) / 100;
  localStorage.setItem('sfx_volume', v); // raw 저장
  // 재생 중인 A코드에 즉시 반영(실시간) — 게인은 raw² 지각 곡선
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.setOutputVolume) GuitarAudio.setOutputVolume(v * v);
  // 슬라이드 감지 → A코드 반복 재생 시작(첫 감지 시), 멈추면 곧 정지
  _startSoundPreview();
  if (_soundPreviewStopTimer) clearTimeout(_soundPreviewStopTimer);
  _soundPreviewStopTimer = setTimeout(_stopSoundPreview, 1400);
}

if (typeof window !== 'undefined') {
  window.openSoundSheet               = openSoundSheet;
  window.closeSoundSheet              = closeSoundSheet;
  window.onSoundVolumeInput           = onSoundVolumeInput;
  window.recordTrainingAttendance     = recordTrainingAttendance;
  window.showTrainingAttendanceModal  = showTrainingAttendanceModal;
  window.closeTrainingAttendanceModal = closeTrainingAttendanceModal;
  window.claimDailyAttendance         = claimDailyAttendance;
  window.advanceAttendance            = advanceAttendance;
  window.runDailyAttendanceFlow       = runDailyAttendanceFlow;
  window.openAttendanceCalendar       = openAttendanceCalendar;
  window.closeAttendanceCalendar      = closeAttendanceCalendar;
  window.makeupAttendance             = makeupAttendance;
  window._playTap                     = _playTap;
  window.showPeakboxRewardModal       = showPeakboxRewardModal;
  window.openQuestModal               = openQuestModal;
  window.closeQuestModal              = closeQuestModal;
  window.openXpInfoModal              = openXpInfoModal;
  window.closeXpInfoModal             = closeXpInfoModal;
  window.claimAttendanceQuest         = claimAttendanceQuest;
  window.claimImageQuest              = claimImageQuest;
  window.claimNoteCreateQuest         = claimNoteCreateQuest;
  window.claimNoteShareQuest          = claimNoteShareQuest;
  window.claimTimeQuest               = claimTimeQuest;
  window.syncTrainingStatsToDB        = syncTrainingStatsToDB;
  window.claimQuizQuest               = claimQuizQuest;
  window.claimQuizLevelQuest          = claimQuizLevelQuest;
  window.claimPerfectQuest            = claimPerfectQuest;
  window.claimChallengeQuest          = claimChallengeQuest;
  window.incrementChallengePerfect    = incrementChallengePerfect;
  window.claimScaleQuest              = claimScaleQuest;
  window.claimScaleLevelQuest         = claimScaleLevelQuest;
  window.markScaleLevelCleared        = markScaleLevelCleared;
  window.incrementScalePerfect        = incrementScalePerfect;
  window.claimScalePerfectQuest       = claimScalePerfectQuest;
  window.claimProgressionQuest        = claimProgressionQuest;
  window.claimStrumQuest              = claimStrumQuest;
  window.renderQuestList              = renderQuestList;
}

// ── FCM 푸시 토큰 등록 ──────────────────────────────────────
// 네이티브 앱에서만 동작. FCM 토큰 발급 → public.push_tokens 에 upsert.
// 비로그인 시엔 저장 보류, 토큰은 localStorage 캐시 후 로그인 시 재시도.
const FCM_TOKEN_CACHE = '_fcm_token';

async function _savePushToken(token) {
  if (!token) return;
  try { localStorage.setItem(FCM_TOKEN_CACHE, token); } catch (_) {}

  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      accessToken = p?.access_token ?? null;
      userId      = p?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return; // 로그인 후 재시도

  const platform = window.Capacitor?.getPlatform?.() || 'web';
  try {
    // token UNIQUE → on_conflict merge (같은 기기 재등록 시 user/platform 갱신)
    await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?on_conflict=token`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId, token, platform,
        updated_at: new Date().toISOString(),
      }),
    });
    // 같은 user_id의 구 토큰 삭제 (토큰 갱신 시 중복 방지)
    await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}&token=neq.${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: {
        'apikey':         SUPABASE_ANON,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch (_) {}
}

// 설정 > 푸시알림 하위 토글(연습 알림=nudge / 리마인드=winback) 서버 반영.
// col: 'nudge_enabled' | 'winback_enabled'
async function _setPushCategoryPref(col, val) {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      accessToken = p?.access_token ?? null;
      userId      = p?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ [col]: val }),
    });
  } catch (_) {}
}

// 알림 OFF 시 이 기기 토큰 삭제 → 서버 디스패치 대상에서 제외.
async function _deletePushToken() {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      accessToken = p?.access_token ?? null;
      userId      = p?.user?.id     ?? null;
    }
  } catch (_) {}
  let token = null;
  try { token = localStorage.getItem(FCM_TOKEN_CACHE); } catch (_) {}
  if (!accessToken || !userId || !token) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}&token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${accessToken}` },
    });
  } catch (_) {}
}

// ── 세션 생존 마커 / 푸시 딥링크 보류 ────────────────────────────
// sessionStorage는 웹뷰가 살아있는 동안만 유지되고 앱 프로세스가 종료되면 사라짐
// → "마지막 세션이 아직 종료되지 않았는가"를 그대로 표현. 웜 진입은 온보딩을 다시 거치지 않는다.
const SESSION_ALIVE_KEY = '_session_alive';
const PUSH_TARGET_KEY   = '_push_target';

function _isSessionAlive() {
  try { return sessionStorage.getItem(SESSION_ALIVE_KEY) === '1'; } catch (_) { return false; }
}
function _markSessionAlive() {
  try { sessionStorage.setItem(SESSION_ALIVE_KEY, '1'); } catch (_) {}
}
function _setPushTarget(url) {
  try { sessionStorage.setItem(PUSH_TARGET_KEY, url); } catch (_) {}
}
function _hasPushTarget() {
  try { return !!sessionStorage.getItem(PUSH_TARGET_KEY); } catch (_) { return false; }
}
function _consumePushTarget() {
  try {
    const url = sessionStorage.getItem(PUSH_TARGET_KEY);
    if (url) sessionStorage.removeItem(PUSH_TARGET_KEY);
    return url;
  } catch (_) { return null; }
}

function initPushNotifications() {
  const PN = window.Capacitor?.Plugins?.PushNotifications;
  if (!PN) return; // 브라우저 등 = FCM 없음

  // Android 알림 채널 생성 (없으면 FCM 알림 무시됨)
  try {
    PN.createChannel({
      id: 'chorditor_push',
      name: 'Chorditor 알림',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch (_) {}

  // 이미 캐시된 토큰 있으면(이전 실행) 로그인 상태에서 저장 재시도
  try {
    const cached = localStorage.getItem(FCM_TOKEN_CACHE);
    if (cached) _savePushToken(cached);
  } catch (_) {}

  PN.addListener('registration', (t) => { _savePushToken(t && t.value); });
  PN.addListener('registrationError', () => {});

  // 알림 탭 → 딥링크 라우팅 + 진입 마커(analytics entry 귀속)
  PN.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action && action.notification && action.notification.data) || {};
    const setEntry = (v) => { try { localStorage.setItem('_push_entry', v); } catch (_) {} };
    // 세션이 살아있으면(웜) 이미 온보딩 관문을 통과한 상태 → 즉시 이동.
    // 콜드스타트면 목적지만 저장하고 온보딩(강제업데이트·인증·plan 동기화)이 끝난 뒤 이동.
    const go = (url) => {
      if (_isSessionAlive()) location.href = url;
      else _setPushTarget(url);
    };
    if (data.progId != null) {
      setEntry('progression');
      go('progression-detail.html?id=' + encodeURIComponent(data.progId)
        + '&key=' + (data.key || 0) + '&flat=' + (data.flat ? 1 : 0));
    } else if (data.progNo != null) {
      // 넛지: no 그룹만 지정 → progression-detail 이 해당 no 중 랜덤 진행 선택
      setEntry('progression');
      go('progression-detail.html?no=' + encodeURIComponent(data.progNo));
    } else if (data.quizLevel != null) {
      setEntry('quiz');
      go('chord-name-quiz.html?level=' + encodeURIComponent(data.quizLevel));
    } else if (data.scaleKey != null) {
      setEntry('scale');
      go('scale-level.html?key=' + encodeURIComponent(data.scaleKey));
    } else if (data.strumId != null) {
      setEntry('strum');
      go('strum-play.html?id=' + encodeURIComponent(data.strumId));
    } else if (data.strumLv != null) {
      // 넛지: lv 만 지정 → strum-play 가 해당 lv 카드 중 랜덤 선택
      setEntry('strum');
      go('strum-play.html?lv=' + encodeURIComponent(data.strumLv));
    } else if (data.winback != null) {
      setEntry('winback');
      if (!/home\.html/.test(location.pathname)) go('home.html');
    }
  });

  (async () => {
    try {
      if (localStorage.getItem('push_enabled') === '0') return; // 알림 OFF → 등록 안 함
      let perm = await PN.checkPermissions();
      if (perm.receive !== 'granted') perm = await PN.requestPermissions();
      if (perm.receive !== 'granted') return;
      await PN.register(); // 성공 시 'registration' 리스너로 토큰 도착
    } catch (_) {}
  })();
}

// 설정 알림 토글: ON=권한확인+FCM 등록 / OFF=토큰 삭제. 최종 ON/OFF 반환.
async function __pushApplyEnabled() {
  const PN = window.Capacitor?.Plugins?.PushNotifications;
  const wantOn = localStorage.getItem('push_enabled') !== '0';
  if (!PN) return wantOn; // 브라우저 등 = FCM 없음, 상태만 유지
  if (!wantOn) { await _deletePushToken(); return false; }
  try {
    let perm = await PN.checkPermissions();
    if (perm.receive !== 'granted') perm = await PN.requestPermissions();
    if (perm.receive !== 'granted') { localStorage.setItem('push_enabled', '0'); return false; }
    await PN.register(); // 'registration' → _savePushToken upsert
    return true;
  } catch (_) { localStorage.setItem('push_enabled', '0'); return false; }
}

if (typeof window !== 'undefined') {
  window.initPushNotifications = initPushNotifications;
  window._savePushToken = _savePushToken;
  window.__pushApplyEnabled = __pushApplyEnabled;
  document.addEventListener('DOMContentLoaded', () => { initPushNotifications(); checkForceUpdate(); });
}

// ── 리뷰/평점 유도 시스템 ───────────────────────────────────
// 조건 충족(qualify)과 노출(show) 분리. 조건은 훈련 흐름 중 채워지고,
// 팝업은 안전한 경계(메인홈 복귀/다음 실행)에서만 reviewMaybeShow()로 노출.
const REVIEW_KEY        = 'review_state';
const REVIEW_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.chorditor.app';
const REVIEW_MATURITY_DAYS     = 2;     // 설치 후 최소 경과일
const REVIEW_MATURITY_LAUNCHES = 3;     // 최소 앱 실행 횟수
const REVIEW_COOLDOWN_DAYS      = 14;   // 노출 간 최소 간격
const REVIEW_MAX_PROMPTS        = 3;    // 누적 노출 상한

function reviewGetState() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); }
  catch (_) { return {}; }
}
function reviewSetState(s) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(s)); } catch (_) {}
}

// 앱 실행마다 1회 호출 (성숙도 측정용)
function reviewRegisterLaunch() {
  const s = reviewGetState();
  if (!s.firstSeenMs) s.firstSeenMs = Date.now();
  s.launchCount = (s.launchCount || 0) + 1;
  reviewSetState(s);
}

// 조건 충족 시 호출. 성숙도 가드 통과하면 pending=true (즉시 노출 X)
function reviewQualify(reason) {
  const s = reviewGetState();
  if (s.rated) return;
  if (!s.firstSeenMs) s.firstSeenMs = Date.now();
  const matureDays    = (Date.now() - s.firstSeenMs) >= REVIEW_MATURITY_DAYS * 86400000;
  const matureLaunch  = (s.launchCount || 0) >= REVIEW_MATURITY_LAUNCHES;
  if (matureDays && matureLaunch) {
    s.pending     = true;
    s.lastReason  = reason || '';
    reviewSetState(s);
  }
}

// 안전 시점에서 호출. 게이트 통과 시에만 모달 오픈
function reviewMaybeShow() {
  const s = reviewGetState();
  if (s.rated || !s.pending) return;
  if ((s.promptCount || 0) >= REVIEW_MAX_PROMPTS) return;
  if (Date.now() - (s.lastPromptMs || 0) < REVIEW_COOLDOWN_DAYS * 86400000) return;
  const overlay = document.getElementById('review-modal-overlay');
  if (!overlay) return;
  // 노출 소비
  s.pending     = false;
  s.lastPromptMs = Date.now();
  s.promptCount  = (s.promptCount || 0) + 1;
  reviewSetState(s);
  overlay.classList.remove('hidden');
}

// 모달 응답: 'like' | 'later' | 'dislike'
function reviewRespond(kind) {
  const overlay = document.getElementById('review-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  const s = reviewGetState();
  if (kind === 'like') {
    s.rated = true;
    reviewSetState(s);
    syncReviewRatedToDB();
    reviewOpenStore();
  } else if (kind === 'dislike') {
    // 다시 조르지 않음 (부정 평가 → 스토어 1점 테러 방지)
    s.rated = true;
    reviewSetState(s);
    syncReviewRatedToDB();
  } else { // later
    s.declinedCount = (s.declinedCount || 0) + 1;
    reviewSetState(s);
  }
}

function reviewOpenStore() {
  try {
    if (window.Capacitor?.Plugins?.Browser) {
      window.Capacitor.Plugins.Browser.open({ url: REVIEW_STORE_URL });
    } else {
      window.open(REVIEW_STORE_URL, '_blank');
    }
  } catch (_) {
    try { window.open(REVIEW_STORE_URL, '_blank'); } catch (__) {}
  }
}

// review_rated → subscriptions 동기화 (재설치 후 재노출 방지)
async function syncReviewRatedToDB() {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;

  const headers = {
    'Content-Type':  'application/json',
    'apikey':         SUPABASE_ANON,
    'Authorization': `Bearer ${accessToken}`,
  };
  try {
    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`,
      { method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ review_rated: true }) }
    );
    let rows = [];
    if (patch.ok) rows = await patch.json();
    if (rows.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method:  'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: userId, plan: 'free', status: 'active', review_rated: true }),
      });
    }
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.reviewRegisterLaunch = reviewRegisterLaunch;
  window.reviewQualify        = reviewQualify;
  window.reviewMaybeShow      = reviewMaybeShow;
  window.reviewRespond        = reviewRespond;
}

// ── 퀴즈 레벨 통계 DB 동기화 ────────────────────────────────────
// quiz_stats_level{N} localStorage → Supabase quiz_level_stats
async function syncQuizLevelStatsToDB(levelId) {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;

  const raw = JSON.parse(localStorage.getItem(`quiz_stats_level${levelId}`) || 'null');
  if (!raw) return;

  const modes = ['name-from-diagram', 'diagram-from-name'];
  const rows = modes.map(mode => {
    const s = raw[mode];
    if (!s) return null;
    return {
      user_id:            userId,
      level_id:           levelId,
      mode,
      total_played:       s.totalPlayed       || 0,
      total_correct:      s.totalCorrect      || 0,
      sessions_completed: s.sessionsCompleted || 0,
      perfect_sessions:   s.perfectSessions   || 0,
      best_speed_sec:     s.bestSpeedSec      ?? null,
      updated_at:         new Date().toISOString(),
    };
  }).filter(Boolean);

  for (const row of rows) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/quiz_level_stats`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        SUPABASE_ANON,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
      });
    } catch (_) {}
  }
}

// ── 퀴즈 레벨 통계 DB 복원 ──────────────────────────────────────
// Supabase quiz_level_stats → quiz_stats_level{N} localStorage
// 서버값이 로컬보다 크면 덮어씀 (되감기 방지)
async function restoreQuizLevelStatsFromDB() {
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return;

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/quiz_level_stats?user_id=eq.${userId}&select=level_id,mode,total_played,total_correct,sessions_completed,perfect_sessions,best_speed_sec`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return;
    const rows = await resp.json();
    if (!rows.length) return;

    // level_id별로 그룹핑 후 localStorage 병합
    const byLevel = {};
    rows.forEach(r => {
      if (!byLevel[r.level_id]) byLevel[r.level_id] = {};
      byLevel[r.level_id][r.mode] = r;
    });

    Object.entries(byLevel).forEach(([levelId, modes]) => {
      const key   = `quiz_stats_level${levelId}`;
      const local = JSON.parse(localStorage.getItem(key) || '{}');
      let changed = false;

      Object.entries(modes).forEach(([mode, db]) => {
        const loc = local[mode] || { totalPlayed:0, totalCorrect:0, sessionsCompleted:0, bestSpeedSec:null };
        const merged = { ...loc };
        if ((db.total_played       || 0) > (loc.totalPlayed       || 0)) { merged.totalPlayed       = db.total_played;       changed = true; }
        if ((db.total_correct      || 0) > (loc.totalCorrect      || 0)) { merged.totalCorrect      = db.total_correct;      changed = true; }
        if ((db.sessions_completed || 0) > (loc.sessionsCompleted || 0)) { merged.sessionsCompleted = db.sessions_completed; changed = true; }
        if ((db.perfect_sessions   || 0) > (loc.perfectSessions   || 0)) { merged.perfectSessions   = db.perfect_sessions;   changed = true; }
        if (db.best_speed_sec !== null && (loc.bestSpeedSec === null || db.best_speed_sec < loc.bestSpeedSec)) {
          merged.bestSpeedSec = db.best_speed_sec; changed = true;
        }
        local[mode] = merged;
      });

      if (changed) localStorage.setItem(key, JSON.stringify(local));
    });
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// drawVoicingCanvas — 코드 운지 캔버스 공통 드로잉
// voicing: chordsLibrary 엔트리 호환 객체
//   { frets, openMute, barre, barreRange, fretNumber, [chordName] }
// ratio: canvas px / BASE_W (예: 1.0, 0.5 등)
// ═══════════════════════════════════════════════════════════════
const VOICING_CANVAS = (() => {
  const STRINGS    = 6;
  const FRETS      = 4;
  const BASE_PAD_L  = 35;
  const BASE_OPEN_W = 60;
  const BASE_FBW    = 240;
  const BASE_FBH    = 192;
  const BASE_PAD_R  = 95;
  const BASE_PAD_T  = 80;
  const BASE_PAD_B  = 80;
  const BASE_W = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R; // 430
  const BASE_H = BASE_PAD_T + BASE_FBH + BASE_PAD_B;               // 352

  function draw(canvas, voicing, chordName, ratio) {
    const w  = Math.round(BASE_W * ratio);
    const ch = Math.round(BASE_H * ratio);
    canvas.width  = w;
    canvas.height = ch;
    const c = canvas.getContext('2d');

    const tl = Math.round((BASE_PAD_L + BASE_OPEN_W) * ratio);
    const tr = Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * ratio);
    const tt = Math.round(BASE_PAD_T * ratio);
    const tb = Math.round((BASE_PAD_T + BASE_FBH) * ratio);
    const fw = (tr - tl) / FRETS;
    const sh = (tb - tt) / (STRINGS - 1);
    const ds = Math.round(sh * 0.95);
    const sc = w / BASE_W;

    c.clearRect(0, 0, w, ch);

    // 너트 — r(프렛번호)>=3이면 다이어그램 시작이 0프렛이 아니므로 두꺼운 선 생략 (r=2까지는 너트 표시)
    const nutW  = Math.max(1, Math.round(9 * sc));
    const lineW = Math.max(1, 3 * sc);
    if (((voicing && voicing.fretNumber) || 0) <= 2) {
      c.fillStyle = '#242729';
      c.fillRect(tl - nutW, tt - lineW / 2, nutW, (tb - tt) + lineW);
    }

    // 프렛선
    c.strokeStyle = '#242729';
    c.lineWidth   = Math.max(1, 3 * sc);
    c.lineCap     = 'butt';
    for (let f = 0; f <= FRETS; f++) {
      const x = tl + f * fw;
      c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
    }

    // 줄선
    for (let s = 0; s < STRINGS; s++) {
      const y = tt + s * sh;
      c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
    }

    if (!voicing) return;

    // 프랫 정규화
    const rawFrets       = voicing.frets;
    const displayFretNum = voicing.fretNumber ?? 0;  // r = 슬롯1 프렛
    const isPattern      = voicing.source === 'pattern';
    // 도트 offset — source로만 결정 (패턴·정적 철저 분리)
    //  pattern: 항상 r-1 → 셀 r,r+1,r+2,r+3 = 슬롯1~4 (token r+k → 슬롯 k+1)
    //           r=0 이면 offset=-1, r=1 이면 0 (clamp 금지: clamp 시 dot 밀림)
    //  static : r>=2 → r-2 (입력 그대로 — dot/프렛번호 직접 지정), 그 외 0
    const offset = isPattern
      ? displayFretNum - 1
      : (displayFretNum >= 2 ? displayFretNum - 2 : 0);
    const frets      = offset ? rawFrets.map(f => f === null ? null : (f === 0 ? 0 : f - offset)) : rawFrets;
    const rawBarre   = voicing.barre || {};
    const barre      = offset
      ? Object.fromEntries(Object.keys(rawBarre).map(k => [+k - offset, true]))
      : rawBarre;
    const openMute   = voicing.openMute || rawFrets.map(f => f === null ? 'mute' : null);
    const barreRange = voicing.barreRange;

    // 바레 커버 계산
    const barreCount = {};
    frets.forEach(f => { if (f !== null && f > 0) barreCount[f] = (barreCount[f] || 0) + 1; });
    const coveredByBarre = new Set();
    Object.keys(barreCount).filter(fk => barreCount[+fk] >= 2 && barre[+fk]).forEach(fk => {
      const f    = +fk;
      const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
      const minS = barreRange ? barreRange.min : Math.min(...idxs);
      const maxS = barreRange ? barreRange.max : Math.max(...idxs);
      for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
    });

    // 개방/뮤트
    openMute.forEach((v, s) => {
      if (frets[s] !== null && frets[s] > 0) return;
      if (v !== 'mute' && coveredByBarre.has(s)) return;
      const y = tt + s * sh;
      const x = tl - Math.round(BASE_OPEN_W / 2 * sc);
      if (v === 'mute') {
        const half = ds * 0.38;
        c.save();
        c.strokeStyle = '#242729';
        c.lineWidth   = Math.round(ds * 0.18);
        c.lineCap     = 'round';
        c.beginPath(); c.moveTo(x - half, y - half); c.lineTo(x + half, y + half); c.stroke();
        c.beginPath(); c.moveTo(x + half, y - half); c.lineTo(x - half, y + half); c.stroke();
        c.restore();
      } else if (frets[s] === 0) {
        c.save();
        c.strokeStyle = '#242729';
        c.lineWidth   = Math.max(1, ds * 0.15);
        c.beginPath(); c.arc(x, y, ds * 0.45, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
    });

    // 바레
    const barreFrets = [];
    Object.keys(barreCount).filter(fk => barreCount[+fk] >= 2).map(Number).forEach(f => {
      if (!barre[f]) return;
      const idxs = frets.reduce((acc, v, s) => { if (v === f) acc.push(s); return acc; }, []);
      const minS = barreRange ? barreRange.min : Math.min(...idxs);
      const maxS = barreRange ? barreRange.max : Math.max(...idxs);
      if (maxS <= minS) return;
      barreFrets.push(f);
      const cx   = tl + (f - 0.5) * fw;
      const topY = tt + minS * sh;
      const botY = tt + maxS * sh;
      const r    = ds / 2;
      c.save();
      c.fillStyle = '#242729';
      c.beginPath();
      c.arc(cx, topY, r, Math.PI, 0);
      c.lineTo(cx + r, botY);
      c.arc(cx, botY, r, 0, Math.PI);
      c.lineTo(cx - r, topY);
      c.closePath();
      c.fill();
      c.restore();
    });

    // 도트
    frets.forEach((f, s) => {
      if (f === null || f === 0) return;
      if (barre[f] && barreFrets.includes(f)) return;
      const cx = tl + (f - 0.5) * fw;
      const cy = tt + s * sh;
      c.save();
      c.beginPath();
      c.arc(cx, cy, ds / 2, 0, Math.PI * 2);
      c.fillStyle = '#242729';
      c.fill();
      c.restore();
    });

    // 프렛 번호 라벨 — 슬롯2(프랫보드 2번째 프렛) 위치 고정
    //  pattern: 항상 표시 / 값 = max(2, r+1)
    //  static : 입력 그대로 — r>=2일 때만 r 표시
    const showLabel = isPattern ? true : (displayFretNum >= 2);
    if (showLabel) {
      const labelFret = isPattern ? Math.max(2, displayFretNum + 1) : displayFretNum;
      c.save();
      c.font         = `500 ${Math.round(28 * sc)}px "Pretendard", sans-serif`;
      c.fillStyle    = '#666';
      c.textAlign    = 'center';
      c.textBaseline = 'top';
      c.fillText(String(labelFret), tl + 1.5 * fw, tb + Math.round(28 * sc));
      c.restore();
    }

    // 코드명
    if (chordName) {
      const bSize = Math.round(48 * sc);
      const bY    = tt - Math.round(30 * sc);
      c.save();
      c.fillStyle    = '#242729';
      c.font         = `500 ${bSize}px "Pretendard", sans-serif`;
      c.textAlign    = 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(chordName, tl, bY);
      c.restore();
    }
  }

  return { draw, BASE_W, BASE_H };
})();

// ═══════════════════════════════════════════════════════════════
// chordToVoicing — 에디터 모델 코드 → VoicingCanvas voicing 변환
//   에디터 모델: dots=[{s,f,n}] (f=슬롯위치), barre={슬롯:true}, fretNumber=슬롯2 프렛
//   변환: 절대프렛 = 슬롯f + (fretNumber-2), source='static' (입력 그대로)
//   → VoicingCanvas.draw(canvas, chordToVoicing(chord), { chordName, fingerNumMode, ratio })
// ═══════════════════════════════════════════════════════════════
function chordToVoicing(chord) {
  // 사전/에디터에서 가져온 코드는 원본 보이싱 스냅샷을 그대로 보관 → 재계산 없이 그대로 렌더.
  // (컴포넌트 모델(dots+fretNumber)로 되돌리면 pattern 보이싱의 source별 offset을 표현 못 해 dot이 어긋남)
  if (chord.voicing) return chord.voicing;
  const fn   = (chord.fretNumber >= 2) ? chord.fretNumber : 2;
  const base = fn - 2;  // 슬롯 → 절대프렛
  const frets     = [null, null, null, null, null, null];
  const fingering = [null, null, null, null, null, null];
  const om = chord.openMute || [];
  for (let s = 0; s < 6; s++) frets[s] = (om[s] === 'open') ? 0 : null;  // mute/미지정 → null
  (chord.dots || []).forEach(d => {
    frets[d.s]     = d.f + base;
    fingering[d.s] = (typeof d.n === 'number') ? d.n : null;
  });
  const barre = {};
  Object.entries(chord.barre || {}).forEach(([k, v]) => { if (v) barre[Number(k) + base] = true; });
  return {
    // barreRange(바레가 덮는 현 범위)는 프렛과 무관한 현 인덱스라 offset 불필요 — 저장값 그대로 전달.
    // null이면 VoicingCanvas가 바레 프렛에 dot 있는 현으로만 범위 추정 → 바레 위 손가락 있는 코드(F·B 등)에서 어긋남.
    // source(pattern/static)는 VoicingCanvas의 dot 세로 offset을 좌우함 — 누락 시 pattern 코드가 어긋남.
    frets, openMute: chord.openMute, barre, barreRange: chord.barreRange ?? null,
    fretNumber: fn, source: chord.source || 'static', fingering,
  };
}
if (typeof window !== 'undefined') window.chordToVoicing = chordToVoicing;
