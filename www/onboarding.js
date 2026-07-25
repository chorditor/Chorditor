// ═══════════════════════════════════════════════════════════════
// onboarding.js — 온보딩 페이지 전용 로직
// 의존: shared.js (SUPABASE_*, APP_VERSION, analytics, _authReady 등)
// ═══════════════════════════════════════════════════════════════

// ── home.html로 이동 ──────────────────────────────────────────
function goToHome() {
  window.location.replace('home.html');
}

// ── 인앱 브라우저(임베디드 WebView) 감지 및 외부 브라우저 유도 ──
// Google OAuth는 인앱 WebView를 차단(403 disallowed_useragent)하므로
// 카카오톡/안드로이드 인앱은 외부 브라우저로 자동 전환, 나머지는 안내.
function _isInAppBrowser() {
  if (window.Capacitor?.isNativePlatform()) return false; // 우리 네이티브 앱은 GoogleAuth 플러그인 사용 → 제외
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|Daum|; wv\)/i.test(ua);
}

function _fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (_) {}
}

function copyCurrentUrl() {
  const url = location.href;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(() => _fallbackCopy(url));
  } else {
    _fallbackCopy(url);
  }
  const btn = document.getElementById('inapp-copy-btn');
  if (btn) btn.textContent = 'URL 복사됨!';
}

function openInExternalBrowser() {
  const ua  = navigator.userAgent || '';
  const url = location.href;
  if (/KAKAOTALK/i.test(ua)) {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return;
  }
  if (/Android/i.test(ua)) {
    // Chrome으로 강제 오픈 (intent scheme)
    const noScheme = url.replace(/^https?:\/\//, '');
    location.href = 'intent://' + noScheme + '#Intent;scheme=https;package=com.android.chrome;end';
    return;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    // iOS 인앱(비카카오): Safari 강제 오픈 공식 API 없음 → x-safari 스킴 best-effort.
    // 지원 앱은 사파리로 열림, 미지원이면 유도페이지의 'URL 복사하기'로 수동 진행.
    const noScheme = url.replace(/^https?:\/\//, '');
    location.href = 'x-safari-https://' + noScheme;
    return;
  }
  // 그 외 자동 오픈 불가 → URL 복사 안내
  copyCurrentUrl();
}

function _showInAppGuide() {
  document.getElementById('onboarding-overlay')?.classList.add('hidden');
  document.getElementById('inapp-guide-overlay')?.classList.remove('hidden');
  // 카카오톡/안드로이드는 자동 외부 전환 시도 (실패 시 화면의 버튼으로 수동)
  const ua = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(ua) || /Android/i.test(ua)) {
    setTimeout(openInExternalBrowser, 120);
  }
}

// ── 온보딩 정보수집 스텝 ──────────────────────────────────────
let _obData = { persona: null, guitar_experience: null, gender: null, birth_year: null, nickname: null };
// 온보딩 진입 경로: 'signup'(신규 가입) | 'existing'(기존 유저·persona 미입력)
// signup  → 마지막 닉네임 step 완료 후 바로 home
// existing → 마지막 닉네임 step 완료 후 '시작하기' 화면 거쳐 home
let _obFlow   = 'signup';
let _obRouted = false; // 인증 유저 라우팅 1회 가드

async function _startOnboardingSteps() {
  // 페르소나 온보딩 노출 조건: DB subscriptions.persona 값이 존재하는지 여부.
  // persona 있으면 완료 처리 → home / 없으면(기존·신규 무관, 계정 재생성 포함) 온보딩 표시.
  // localStorage 플래그에 의존하지 않음(계정 삭제 후 재로그인 시 stale 플래그로 스킵되던 버그 방지).
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      const token   = session?.access_token;
      const userId  = session?.user?.id;
      if (token && userId) {
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=persona`,
          { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
        );
        if (resp.ok) {
          const rows = await resp.json();
          if (rows.length > 0 && rows[0].persona) {
            localStorage.setItem('onboarding_done', '1');
            goToHome();
            return;
          }
        }
      }
    }
  } catch (_) {}

  // persona 미입력 사용자 → 온보딩 스텝 표시
  document.getElementById('onboarding-overlay')?.classList.add('hidden');
  _showStep('ob-step1');
}

function _showStep(toId, fromId) {
  const to   = document.getElementById(toId);
  const from = fromId ? document.getElementById(fromId) : null;
  if (!to) return;

  if (from) {
    from.classList.add('ob-step-exiting');
    setTimeout(() => {
      from.classList.add('hidden');
      from.classList.remove('ob-step-exiting');
    }, 200);
  }

  to.classList.remove('hidden');
  to.classList.add('ob-step-entering');
  to.addEventListener('animationend', () => to.classList.remove('ob-step-entering'), { once: true });
}

// Step 1: 페르소나 선택
function obSelectPersona(el) {
  document.querySelectorAll('.ob-persona-card').forEach(c => c.classList.remove('ob-persona-card--selected'));
  el.classList.add('ob-persona-card--selected');
  _obData.persona = el.dataset.value;
  document.getElementById('ob-step1-next').disabled = false;
}

function obStep1Next() {
  if (!_obData.persona) return;
  document.getElementById('ob-consent-backdrop')?.classList.remove('hidden');
}

function obToggleTerms() {
  const terms = document.getElementById('ob-consent-terms');
  const icon  = document.getElementById('ob-consent-toggle-icon');
  const isHidden = terms.classList.toggle('hidden');
  icon.textContent = isHidden ? '▾' : '▴';
}

function obOnConsentCheck() {}

function obConsentAgree() {
  const checkbox = document.getElementById('ob-consent-checkbox');
  if (checkbox) checkbox.checked = true;
  // 푸시 알림 동의 시 권한 요청 (체크된 경우만)
  const pushCheck = document.getElementById('ob-push-checkbox');
  if (pushCheck && pushCheck.checked) _requestPushPermission();
  document.getElementById('ob-consent-backdrop')?.classList.add('hidden');
  _showStep('ob-step2', 'ob-step1');
}

// FCM 푸시 권한 요청 + 토큰 등록 (채널 생성은 shared.js initPushNotifications 담당)
async function _requestPushPermission() {
  try {
    const PN = window.Capacitor?.Plugins?.PushNotifications;
    if (!PN) return;
    let perm = await PN.checkPermissions();
    if (perm.receive !== 'granted') perm = await PN.requestPermissions();
    if (perm.receive === 'granted') await PN.register();
  } catch (_) {}
}

// Step 2: 기타 경력 / Step 3: 성별·나이 공통 선택 처리
function obSelectChoice(el, field) {
  const group = el.closest(`[data-group="${field}"]`);
  if (group) {
    group.querySelectorAll('.ob-choice-item, .ob-chip, .ob-big-card').forEach(c =>
      c.classList.remove('ob-choice-item--selected', 'ob-chip--selected', 'ob-big-card--selected')
    );
  }
  if (el.classList.contains('ob-big-card'))  el.classList.add('ob-big-card--selected');
  else if (el.classList.contains('ob-chip')) el.classList.add('ob-chip--selected');
  else                                       el.classList.add('ob-choice-item--selected');
  _obData[field] = el.dataset.value;

  if (field === 'guitar_experience') {
    document.getElementById('ob-step2-next').disabled = false;
  } else if (field === 'gender') {
    document.getElementById('ob-step3-next').disabled = false;
  }
}

function obStep2Next() {
  if (!_obData.guitar_experience) return;
  _showStep('ob-step3', 'ob-step2');
}

function obStep3Next() {
  if (!_obData.gender) return;
  _showStep('ob-step4', 'ob-step3');
  _initYearPicker();
}

// Step 4: 년도 선택 → Step 5 이동
function obStep4Next() {
  _showStep('ob-step5', 'ob-step4');
  // Google 이름 자동 채움
  try {
    const session = JSON.parse(localStorage.getItem(SUPABASE_STORAGE_KEY) || '{}');
    const googleName = session?.user?.user_metadata?.full_name
                    || session?.user?.user_metadata?.name
                    || '';
    const input = document.getElementById('ob-nickname-input');
    if (input && googleName) {
      input.value = googleName;
      _obData.nickname = googleName;
      document.getElementById('ob-nickname-len').textContent = googleName.length;
      document.getElementById('ob-step5-complete').disabled = false;
    }
  } catch(e) {}
}

// Step 5: 닉네임 입력 처리
function obOnNicknameInput(input) {
  const val = input.value.trim();
  _obData.nickname = val || null;
  document.getElementById('ob-nickname-len').textContent = input.value.length;
  document.getElementById('ob-step5-complete').disabled = val.length === 0;
}

// Step 5: 완료 → Supabase 저장 → (신규)home / (기존)시작하기 화면
async function obStep5Complete() {
  const btn = document.getElementById('ob-step5-complete');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
  await _saveOnboardingData();
  localStorage.setItem('onboarding_done', '1');
  // 공유 링크로 들어온 경우엔 '시작하기' 탭 없이 바로 home(→ 공유 노트로 이동)
  if (_obFlow === 'existing' && !sessionStorage.getItem(PENDING_SHARE_CODE_KEY)) {
    // 기존 유저(persona 미입력) → '시작하기' 화면 거쳐 home
    _showStartScreen();
  } else {
    // 신규 가입 (또는 공유 링크로 들어온 기존 유저) → 바로 home
    goToHome();
  }
}

// 닉네임 완료 후 '시작하기' 화면 (기존 유저 경로)
function _showStartScreen() {
  document.querySelectorAll('.ob-overlay--step').forEach(el => el.classList.add('hidden'));
  document.getElementById('ob-consent-backdrop')?.classList.add('hidden');
  document.getElementById('onboarding-loading')?.classList.add('hidden');
  document.getElementById('onboarding-signin-loading')?.classList.add('hidden');
  document.getElementById('onboarding-google-btn')?.classList.add('hidden');
  document.getElementById('onboarding-switch-btn')?.classList.add('hidden');
  document.getElementById('onboarding-overlay')?.classList.remove('hidden');
  const startBtn = document.getElementById('onboarding-start-btn');
  if (startBtn) { startBtn.classList.remove('hidden'); startBtn.textContent = '시작하기'; }
}

// ── 년도 휠피커 ─────────────────────────────────────────────
function _initYearPicker() {
  const scroll = document.getElementById('ob-year-scroll');
  if (!scroll || scroll.childElementCount > 0) return;

  const ITEM_H    = 42;
  const PAD_H     = ITEM_H * 2; // 위아래 여백 (2칸)
  const START     = 1940;
  const END       = new Date().getFullYear() - 10;
  const DEFAULT   = 1995;

  // 위 여백
  const top = document.createElement('div');
  top.style.height = PAD_H + 'px';
  scroll.appendChild(top);

  for (let y = START; y <= END; y++) {
    const el = document.createElement('div');
    el.className = 'ob-year-item';
    el.textContent = y + '년';
    el.dataset.year = y;
    scroll.appendChild(el);
  }

  // 아래 여백
  const bot = document.createElement('div');
  bot.style.height = PAD_H + 'px';
  scroll.appendChild(bot);

  // 기본값 스크롤
  scroll.scrollTop = (DEFAULT - START) * ITEM_H;
  _obData.birth_year = DEFAULT;

  // 스크롤 중 선택값 갱신
  scroll.addEventListener('scroll', () => {
    const idx = Math.round(scroll.scrollTop / ITEM_H);
    _obData.birth_year = START + Math.max(0, Math.min(idx, END - START));
  });

  enableMouseDragScroll(scroll); // 웹 브라우저 마우스 드래그 지원
}

async function _saveOnboardingData() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return;
    const session = JSON.parse(stored);
    const token  = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) return;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id:                  userId,
        persona:                  _obData.persona,
        guitar_experience:        _obData.guitar_experience,
        gender:                   _obData.gender,
        birth_year:               _obData.birth_year,
        nickname:                 _obData.nickname,
        consent_agreed_at:        new Date().toISOString(),
        onboarding_completed_at:  new Date().toISOString(),
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('[Onboarding] subscriptions 저장 실패:', resp.status, errBody);
    }
  } catch(e) {
    console.error('[Onboarding] subscriptions 저장 예외:', e);
  }
}

// ── 인증된 유저 라우팅 (persona 유무 분기) ───────────────────
//  persona 있음 → '시작하기' welcome 표시 (클릭 시 home)
//  persona 없음 → 바로 persona step 진입 (_obFlow='existing')
async function _routeAuthedUser() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    const session = JSON.parse(stored || '{}');
    const token   = session?.access_token;
    const userId  = session?.user?.id;
    if (token && userId) {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=persona`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
      );
      if (resp.ok) {
        const rows = await resp.json();
        if (!(rows.length > 0 && rows[0].persona)) {
          // 기존 유저 · persona 미입력 → 바로 persona step
          _obFlow = 'existing';
          document.getElementById('onboarding-loading')?.classList.add('hidden');
          document.getElementById('onboarding-overlay')?.classList.add('hidden');
          _showStep('ob-step1');
          return;
        }
      }
    }
  } catch (e) {}
  // persona 있음(또는 확인 실패) → 시작하기 welcome 표시
  // 단, 공유 링크로 들어온 경우엔 탭 기다리지 않고 바로 진입(home.js가 pending code를 이어서 처리)
  if (sessionStorage.getItem(PENDING_SHARE_CODE_KEY)) { goToHome(); return; }
  _showOnboardingButtons();
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
    if (!_obRouted) {
      _obRouted = true;
      _routeAuthedUser();
    }
  }
}

// ── 웹 OAuth 로그인 완료 후 home으로 이동 ─────────────────────
function onAuthSignedIn() {
  goToHome();
}

// ── 시작하기 버튼 ────────────────────────────────────────────
function handleStart() {
  _startOnboardingSteps();
}

// ── 다른 계정으로 변경 ────────────────────────────────────────
let _forceSelectAccount = false; // switch 후 재로그인 시 구글 계정 선택창 강제
async function onboardingSwitchAccount() {
  // 실제 세션 해제: 앱 수동키만 지우면 web은 supabase-js 자체 세션(sb-*-auth-token),
  // android는 GoogleAuth 캐시가 남아 같은 계정으로 조용히 재로그인됨.
  try {
    if (!window.Capacitor?.isNativePlatform()) {
      if (_supabase) await _supabase.auth.signOut();
    } else {
      const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
      if (GoogleAuth) await GoogleAuth.signOut().catch(() => {});
    }
  } catch (_) {}
  localStorage.removeItem(SUPABASE_STORAGE_KEY);
  setPlan('free');
  _authReady = false;
  _forceSelectAccount = true;
  document.getElementById('onboarding-start-btn')?.classList.add('hidden');
  document.getElementById('onboarding-switch-btn')?.classList.add('hidden');
  document.getElementById('onboarding-google-btn')?.classList.remove('hidden');
}

// ── Google 로그인 (온보딩 버튼) ──────────────────────────────
async function onboardingSignIn() {
  // 웹: Supabase OAuth 리다이렉트 방식
  if (!window.Capacitor?.isNativePlatform()) {
    if (!_supabase) return;
    const _opts = { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'onboarding.html' };
    // 계정 변경 직후엔 구글 계정 선택창 강제(안 그러면 같은 계정 조용히 재로그인)
    if (_forceSelectAccount) _opts.queryParams = { prompt: 'select_account' };
    await _supabase.auth.signInWithOAuth({ provider: 'google', options: _opts });
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
      _obFlow   = 'signup'; // 신규 가입 → 닉네임 완료 후 바로 home
      _obRouted = true;     // 이중 라우팅 방지
      _startOnboardingSteps();
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

// ── Android 세션 자동 복원 ────────────────────────────────────
async function tryAutoSignIn() {
  if (!window.Capacitor?.isNativePlatform()) {
    _authResolve();
    // 웹: 세션 복원 시 renderAuthUI(onAuthStateChange)가 라우팅. 미인증이면 로그인 버튼.
    if (!_obRouted) _showOnboardingButtons();
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
        _obRouted = true;
        _routeAuthedUser();
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
  // ── DEV 빌드: 온보딩/로그인 건너뛰고 바로 홈으로 ────────────
  if (typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
    window.location.replace('home.html');
    return;
  }

  // ── 인앱 브라우저(카카오톡 등): Google OAuth 차단(disallowed_useragent) → 외부 브라우저 유도 ──
  if (_isInAppBrowser()) {
    _showInAppGuide();
    return;
  }

  // 로딩 스피너 즉시 표시 (checkForceUpdate/initBilling 대기 중 빈 화면 방지)
  document.getElementById('onboarding-overlay')?.classList.remove('hidden');

  await checkForceUpdate();
  await initBilling();

  // Android: GoogleAuth 1회 사전 초기화 (onboardingSignIn에서 재호출 시 상태 꼬임 방지)
  if (window.Capacitor?.isNativePlatform()) {
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (GoogleAuth) {
      GoogleAuth.initialize({
        clientId: '495859421223-rkjalna3ckhslfrk12gvbehn69o9j4qe.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).catch(() => {});
    }
  }

  initSupabase().then(() => tryAutoSignIn()).catch(() => tryAutoSignIn());
});
