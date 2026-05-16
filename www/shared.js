// ═══════════════════════════════════════════════════════════════
// shared.js — onboarding.html / home.html 공통 코드
// DOM 조작 없음. 페이지별 함수는 typeof 가드로 호출.
// ═══════════════════════════════════════════════════════════════

// ── 상수 ─────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jbvkygeksohlysyvaoab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI';
const APP_VERSION   = '1.2.0_dev1';
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
  safeSave('chorditor_projects', JSON.stringify(projects));
}

// ── 플랜 관리 ─────────────────────────────────────────────────
const PLAN_LIMITS = {
  free:     { maxProjects: 3,        maxScale: 1 },
  standard: { maxProjects: 10,       maxScale: 1 },
  pro:      { maxProjects: Infinity, maxScale: 3 },
};

function getPlan() {
  return localStorage.getItem('chorditor_plan') || 'free';
}

function setPlan(plan) {
  localStorage.setItem('chorditor_plan', plan);
  if (typeof updateExportScaleOptions === 'function') updateExportScaleOptions();
  if (typeof renderPlanBadge === 'function') renderPlanBadge();
}

function getPlanLimit(key) {
  return (PLAN_LIMITS[getPlan()] || PLAN_LIMITS.free)[key];
}
function canCreateProject() { return loadProjects().length < getPlanLimit('maxProjects'); }
function canUseScale(scale)  { return scale <= getPlanLimit('maxScale'); }

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
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchWebPlan();
      if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
      if (!window.Capacitor && event === 'SIGNED_IN') {
        _authReady = true;
        if (typeof onAuthSignedIn === 'function') onAuthSignedIn();
      }
    } else {
      analytics.clearUserId();
      setPlan('free');
      if (typeof renderAuthUI === 'function') renderAuthUI(null);
    }
  });

  // 기존 세션 복원 (웹 전용)
  if (!window.Capacitor?.isNativePlatform()) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session?.user) {
      _authReady = true;
      analytics.setUserId(session.user.id);
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchWebPlan();
      if (typeof renderAuthUI === 'function') renderAuthUI(session.user);
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

// ── RevenueCat (인앱 결제) ─────────────────────────────────────
const REVENUECAT_ANDROID_KEY = 'goog_KNGCSoBxhHnHfZuTVgJoNKglKhM';
const ENTITLEMENT_STANDARD  = 'standard_entitlement';
const ENTITLEMENT_PRO       = 'pro_entitlement';
const PRODUCT_STANDARD      = '$rc_monthly';
const PRODUCT_PRO           = 'pro_monthly';

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
    if (active[ENTITLEMENT_PRO])           newPlan = 'pro';
    else if (active[ENTITLEMENT_STANDARD]) newPlan = 'standard';
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
