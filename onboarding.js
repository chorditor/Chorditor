// ═══════════════════════════════════════════════════════════════
// onboarding.js — 온보딩 페이지 전용 로직
// 의존: shared.js (SUPABASE_*, APP_VERSION, analytics, _authReady 등)
// ═══════════════════════════════════════════════════════════════

// ── home.html로 이동 ──────────────────────────────────────────
function goToHome() {
  window.location.replace('home.html');
}

// ── 온보딩 버튼 표시 ─────────────────────────────────────────
function _showOnboardingButtons() {
  document.getElementById('onboarding-loading')?.classList.add('hidden');
  if (_authReady) {
    document.getElementById('onboarding-start-btn')?.classList.remove('hidden');
    document.getElementById('onboarding-switch-btn')?.classList.remove('hidden');
  } else {
    document.getElementById('onboarding-google-btn')?.classList.remove('hidden');
    analytics.track('onboarding_viewed', {
      platform: window.Capacitor?.isNativePlatform() ? 'android' : 'web',
    });
  }
}

// ── renderAuthUI (온보딩 버전) ────────────────────────────────
function renderAuthUI(user) {
  // 온보딩에서는 버튼 표시만 갱신
  if (user) {
    _authReady = true;
    _showOnboardingButtons();
  }
}

// ── 웹 OAuth 로그인 완료 후 home으로 이동 ─────────────────────
function onAuthSignedIn() {
  goToHome();
}

// ── 시작하기 버튼 ────────────────────────────────────────────
function handleStart() {
  goToHome();
}

// ── DEV 온보딩 진입 ──────────────────────────────────────────
function devOnboardingEnter() {
  goToHome();
}

// ── 다른 계정으로 변경 ────────────────────────────────────────
function onboardingSwitchAccount() {
  localStorage.removeItem(SUPABASE_STORAGE_KEY);
  setPlan('free');
  _authReady = false;
  document.getElementById('onboarding-start-btn')?.classList.add('hidden');
  document.getElementById('onboarding-switch-btn')?.classList.add('hidden');
  document.getElementById('onboarding-google-btn')?.classList.remove('hidden');
}

// ── Google 로그인 (온보딩 버튼) ──────────────────────────────
async function onboardingSignIn() {
  // 웹: Supabase OAuth 리다이렉트 방식
  if (!window.Capacitor?.isNativePlatform()) {
    if (!_supabase) return;
    await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + '/home.html' }
    });
    return;
  }

  // Android: GoogleAuth 플러그인 방식
  const signinLoader = document.getElementById('onboarding-signin-loading');
  const googleBtn    = document.getElementById('onboarding-google-btn');
  try {
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (!GoogleAuth) return;

    if (googleBtn)    googleBtn.classList.add('hidden');
    if (signinLoader) signinLoader.classList.remove('hidden');

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
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchPlanWithToken(session.access_token);
      goToHome();
    }
  } catch(e) {
    const msg = e?.message || String(e) || '';
    if (!msg.toLowerCase().includes('cancel')) {
      console.error('[Auth] 온보딩 로그인 실패:', e);
    }
    if (signinLoader) signinLoader.classList.add('hidden');
    if (googleBtn)    googleBtn.classList.remove('hidden');
  }
}

// ── 강제 업데이트 체크 ────────────────────────────────────────
async function checkForceUpdate() {
  if (!window.Capacitor?.isNativePlatform()) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.min_version&select=value`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const minVersion = data?.[0]?.value;
    if (!minVersion) return;
    if (_compareVersion(APP_VERSION, minVersion) < 0) {
      document.getElementById('force-update-overlay')?.classList.remove('hidden');
    }
  } catch(e) {}
}

// ── Android 세션 자동 복원 ────────────────────────────────────
async function tryAutoSignIn() {
  if (!window.Capacitor?.isNativePlatform()) {
    _authResolve();
    _showOnboardingButtons();
    return;
  }

  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      let session = JSON.parse(stored);
      const now = Math.floor(Date.now() / 1000);

      // 세션 만료 시 refresh 시도
      if ((!session.expires_at || session.expires_at <= now) && session.refresh_token) {
        try {
          const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
          });
          if (resp.ok) {
            const refreshed = await resp.json();
            if (refreshed.access_token) session = saveSessionToStorage(refreshed);
          }
        } catch(e) {}
      }

      const nowAfter = Math.floor(Date.now() / 1000);
      if (session.user && session.expires_at > nowAfter) {
        _authReady = true;
        analytics.setUserId(session.user.id);
        analytics.track('app_open', {
          platform: 'android',
          project_count: loadProjects().length,
        });
        _authResolve();
        _showOnboardingButtons();
        _billingReady.then(async () => {
          if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
          await syncPlanFromBilling();
          fetchPlanWithToken(session.access_token).catch(() => {});
        }).catch(() => {});
        return;
      }
    }
  } catch(e) {}

  analytics.track('app_open', {
    platform: 'android',
    project_count: loadProjects().length,
  });
  _authResolve();
  _showOnboardingButtons();
}

// ── 앱 초기화 ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkForceUpdate();
  await initBilling();

  if (APP_VERSION.includes('_dev')) {
    // DEV: 실제 온보딩 숨기고 dev 온보딩 표시
    document.getElementById('onboarding-overlay')?.classList.add('hidden');
    document.getElementById('dev-onboarding-overlay')?.classList.remove('hidden');
    _authResolve();
  } else {
    document.getElementById('onboarding-overlay')?.classList.remove('hidden');
    initSupabase().then(() => tryAutoSignIn());
  }
});
