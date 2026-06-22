// ═══════════════════════════════════════════════════════════════
// shared.js — onboarding.html / home.html 공통 코드
// DOM 조작 없음. 페이지별 함수는 typeof 가드로 호출.
// ═══════════════════════════════════════════════════════════════

// ── 상수 ─────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jbvkygeksohlysyvaoab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI';
const APP_VERSION   = '1.2.4';
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
  safeSave('chorditor_projects', JSON.stringify(projects));
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
}

function getPlanLimit(key) {
  return (PLAN_LIMITS[getPlan()] || PLAN_LIMITS.free)[key];
}
function canCreateProject() { return loadProjects().length < getPlanLimit('maxProjects'); }
function canUseScale(scale)  { return scale <= getPlanLimit('maxScale'); }

// ── 사용 통계 (이미지 저장 / 공유 횟수) ───────────────────────
// 로컬 카운터(localStorage) 기반 + subscriptions.stat_images/stat_shares 동기화
const STATS_KEY = 'chorditor_stats';

function getStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    return { images: raw?.images || 0, shares: raw?.shares || 0 };
  } catch (e) {
    return { images: 0, shares: 0 };
  }
}

function incrementStat(key) {
  if (key !== 'images' && key !== 'shares') return;
  try {
    const s = getStats();
    s[key] = (s[key] || 0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
    syncStatsToDB();
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
      body: JSON.stringify({ user_id: userId, stat_images: s.images, stat_shares: s.shares }),
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

function openPlanSheet(triggerSource) {
  const overlay = document.getElementById('plan-sheet-overlay');
  const sheet   = document.getElementById('plan-sheet');
  if (!sheet) return;

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
    <div class="plan-launch-banner">출시 기념 특별 할인 — 지금 구독하면 첫 달부터 할인가 적용!</div>
    <div class="plan-card plan-card--highlight">
      <div class="plan-card-badge">추천</div>
      <div class="plan-card-name">Pro <span class="plan-tag">크리에이터</span></div>
      <div class="plan-card-price">
        <div class="price-top">
          <span class="price-original">₩6,900</span>
          <span class="price-badge">29% OFF</span>
        </div>
        <span class="price-amount">₩4,900<small>/월</small></span>
      </div>
      <ul class="plan-card-features">
        <li>프로젝트 <strong>무제한</strong></li>
        <li>이미지 저장 <strong>전 배율</strong> (x0.5~x3)</li>
        <li>훈련소 컨텐츠 전체 개방</li>
      </ul>
      <button class="btn btn-primary plan-card-btn" id="plan-sheet-btn-pro">구독하기</button>
    </div>
    <div class="plan-page-footer">
      <span class="hint">구독은 Google Play에서 언제든지 취소할 수 있습니다.</span>
      <div class="plan-modal-footer-links">
        <span class="plan-restore-link" id="plan-sheet-faq-btn" onclick="openBillingFaq()" style="display:none">결제 도움말</span>
        <span class="plan-restore-link" id="plan-sheet-restore-btn" onclick="restorePurchases()" style="display:none">구매 복원</span>
      </div>
    </div>
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
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=streak,training_time_min,total_completed,streak_synced_date,review_rated`,
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
    if ((overview.training_time_min || 0) > (local.training_time_min || 0))
      merged.training_time_min = overview.training_time_min;
    // streak_last_counted_date: 서버 streak이 더 크면 함께 복원
    if ((overview.streak || 0) > (local.streak || 0) && overview.streak_synced_date)
      merged.streak_last_counted_date = overview.streak_synced_date;

    localStorage.setItem('training_stats', JSON.stringify(merged));

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

// ── 출석(연속 훈련) 공통 처리 ────────────────────────────────
// 4개 훈련(코드맞추기/스케일/코드진행/주법리듬) 공유. 그날 어느 하나라도
// 첫 완료 시 출석 1회 인정 + 모달 1회 표시. training_stats / today_sessions 공유.
// 단, 코드맞추기·스케일은 자체적으로 today_sessions 를 갱신하므로(이중 카운트 방지)
// recordTrainingAttendance() 는 자체 갱신이 없는 코드진행·주법리듬에서만 호출하고,
// 스케일은 자체 갱신 후 showTrainingAttendanceModal() 만 호출한다.
function recordTrainingAttendance() {
  const KEY = 'training_stats';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const stats = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }
  stats.today_sessions  = (stats.today_sessions  || 0) + 1;
  stats.total_completed = (stats.total_completed || 0) + 1;
  let firstToday = false;
  if (stats.today_sessions === 1) {
    if (stats.streak_last_counted_date === yesterday) stats.streak = (stats.streak || 0) + 1;
    else stats.streak = 1;
    stats.streak_last_counted_date = today;
    firstToday = true;
  }
  localStorage.setItem(KEY, JSON.stringify(stats));
  if (typeof syncTrainingStatsToDB === 'function') syncTrainingStatsToDB();
  if (firstToday) showTrainingAttendanceModal(stats.streak);
  return firstToday;
}

// 출석 모달 등장 딜레이(ms) — 코드맞추기와 통일(결과/완료 화면 뜬 뒤 등장).
const ATTENDANCE_MODAL_DELAY_MS = 650;

// 출석 모달 표시. 모달 DOM 이 없는 페이지(스케일/진행/주법)에서는 동적 생성.
// 딜레이·애니메이션·이징은 4개 훈련 전부 동일(이 함수 + style.css 의 .attendance-modal).
function showTrainingAttendanceModal(streak, delayMs) {
  if (delayMs == null) delayMs = ATTENDANCE_MODAL_DELAY_MS;
  setTimeout(function () {
    if (typeof analytics !== 'undefined') analytics.track('training_attendance_achieved', { streak });
    let overlay = document.getElementById('attendance-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'attendance-modal-overlay';
      overlay.className = 'attendance-modal-overlay';
      overlay.innerHTML =
        '<div class="attendance-modal">' +
          '<div class="attendance-modal-icon"><i data-lucide="award"></i></div>' +
          '<div class="attendance-modal-title">출석 완료!</div>' +
          '<div class="attendance-modal-desc">오늘 훈련 1회를 달성했어요</div>' +
          '<div id="attendance-modal-streak" class="attendance-modal-streak">1일 연속</div>' +
          '<button class="attendance-modal-btn" onpointerup="closeTrainingAttendanceModal()">확인</button>' +
        '</div>';
      document.body.appendChild(overlay);
      void overlay.offsetWidth; // 강제 reflow: 초기 상태(opacity:0/scale) 확정 → --show 전환 시 애니메이션 발동
    }
    const streakEl = document.getElementById('attendance-modal-streak');
    if (streakEl) streakEl.textContent = streak === 1 ? '오늘부터 시작 · 1일 연속' : streak + '일 연속 달성';
    overlay.classList.add('attendance-modal-overlay--show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, delayMs);
}

function closeTrainingAttendanceModal() {
  const o = document.getElementById('attendance-modal-overlay');
  if (o) o.classList.remove('attendance-modal-overlay--show');
}
if (typeof window !== 'undefined') {
  window.recordTrainingAttendance     = recordTrainingAttendance;
  window.showTrainingAttendanceModal  = showTrainingAttendanceModal;
  window.closeTrainingAttendanceModal = closeTrainingAttendanceModal;
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
    if (data.progId != null) {
      setEntry('progression');
      location.href = 'progression-detail.html?id=' + encodeURIComponent(data.progId)
        + '&key=' + (data.key || 0) + '&flat=' + (data.flat ? 1 : 0);
    } else if (data.progNo != null) {
      // 넛지: no 그룹만 지정 → progression-detail 이 해당 no 중 랜덤 진행 선택
      setEntry('progression');
      location.href = 'progression-detail.html?no=' + encodeURIComponent(data.progNo);
    } else if (data.quizLevel != null) {
      setEntry('quiz');
      location.href = 'chord-name-quiz.html?level=' + encodeURIComponent(data.quizLevel);
    } else if (data.scaleKey != null) {
      setEntry('scale');
      location.href = 'scale-level.html?key=' + encodeURIComponent(data.scaleKey);
    } else if (data.strumId != null) {
      setEntry('strum');
      location.href = 'strum-play.html?id=' + encodeURIComponent(data.strumId);
    } else if (data.strumLv != null) {
      // 넛지: lv 만 지정 → strum-play 가 해당 lv 카드 중 랜덤 선택
      setEntry('strum');
      location.href = 'strum-play.html?lv=' + encodeURIComponent(data.strumLv);
    } else if (data.winback != null) {
      setEntry('winback');
      if (!/home\.html/.test(location.pathname)) location.href = 'home.html';
    }
  });

  (async () => {
    try {
      let perm = await PN.checkPermissions();
      if (perm.receive !== 'granted') perm = await PN.requestPermissions();
      if (perm.receive !== 'granted') return;
      await PN.register(); // 성공 시 'registration' 리스너로 토큰 도착
    } catch (_) {}
  })();
}

if (typeof window !== 'undefined') {
  window.initPushNotifications = initPushNotifications;
  window._savePushToken = _savePushToken;
  document.addEventListener('DOMContentLoaded', () => { initPushNotifications(); });
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
      `${SUPABASE_URL}/rest/v1/quiz_level_stats?user_id=eq.${userId}&select=level_id,mode,total_played,total_correct,sessions_completed,best_speed_sec`,
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

    // 너트
    const nutW  = Math.max(1, Math.round(9 * sc));
    const lineW = Math.max(1, 3 * sc);
    c.fillStyle = '#242729';
    c.fillRect(tl - nutW, tt - lineW / 2, nutW, (tb - tt) + lineW);

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
    frets, openMute: chord.openMute, barre, barreRange: null,
    fretNumber: fn, source: 'static', fingering,
  };
}
if (typeof window !== 'undefined') window.chordToVoicing = chordToVoicing;
