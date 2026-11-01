// ═══════════════════════════════════════════════════════════════
// onboarding.js — 온보딩 페이지 전용 로직
// 의존: shared.js (SUPABASE_*, APP_VERSION, analytics, _authReady 등)
// ═══════════════════════════════════════════════════════════════

// ── 온보딩 관문 통과 → home.html(또는 보류된 푸시 딥링크)로 이동 ──
// 여기서 세션 생존 마커를 세워야 이후 웜 진입이 온보딩을 건너뛴다.
// 목적지가 home.html일 때만(푸시 딥링크가 있으면 그쪽이 우선) 오늘 데일리미션 게이트를
// 아직 안 지났으면 오늘의 미션·출석 통합 페이지(attendance.html)로 먼저 보냄 — 그 페이지가 열릴 때 통과 시각을 기록.
function goToHome() {
  _markSessionAlive();
  const target = _consumePushTarget() || 'home.html';
  if (target === 'home.html') {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('chorditor_dm_cleared_date') !== today) {
      window.location.replace('attendance.html?from=launch');
      return;
    }
  }
  window.location.replace(target);
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
let _obData = { persona: null, guitar_experience: null, purpose: null, weekly_freq: null, source: null, gender: null, birth_year: null, nickname: null, has_invite: null, invite_code: null };
// 온보딩 진입 경로: 'signup'(신규 가입) | 'existing'(기존 유저·persona 미입력)
// signup  → 마지막 닉네임 step 완료 후 바로 home
// existing → 마지막 닉네임 step 완료 후 '시작하기' 화면 거쳐 home
let _obFlow   = 'signup';
let _obRouted = false; // 인증 유저 라우팅 1회 가드
let _obReconsentOnly = false; // true면 동의 바텀시트가 step1/닉네임 없이 재동의 전용으로 뜬 것

async function _startOnboardingSteps() {
  // 페르소나 온보딩 노출 조건: DB user_persona_profile.persona 값이 존재하는지 여부(2026-08-31).
  // persona 있으면 완료 처리 → home / 없으면(기존·신규 무관, 계정 재생성 포함) 온보딩 표시.
  // localStorage 플래그에 의존하지 않음(계정 삭제 후 재로그인 시 stale 플래그로 스킵되던 버그 방지).
  // ?ob=1(테스트 강제 진입) 시엔 persona 존재 여부와 무관하게 항상 Step1부터 표시.
  if (new URLSearchParams(location.search).get('ob') === '1') {
    document.getElementById('onboarding-overlay')?.classList.add('hidden');
    _showStep('ob-step1');
    return;
  }
  const { token, userId } = getStoredAuth();
  if (token && userId && !(await checkNeedsOnboarding(token, userId))) {
    localStorage.setItem('onboarding_done', '1');
    goToHome();
    return;
  }

  // persona 미입력(또는 확인 실패) → 온보딩 스텝 표시
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
  if (toId === 'ob-step-push') _obBellPlay();
  _obStepViewed(toId);
  to.classList.add('ob-step-entering');
  to.addEventListener('animationend', () => to.classList.remove('ob-step-entering'), { once: true });
}

// ── 설문 화면 순서 ──────────────────────────────────────────────
// 화면을 더하거나 옮길 땐 여기만 고친다 — 진행 점과 '다음' 화면이 이 순서를 따른다.
// (약관 시트는 유형 직후, 초대코드 입력·확인(step7·8)과 플랜 화면은 이 순서 밖의 분기·마무리 화면)
const OB_FLOW = ['ob-step1', 'ob-step2', 'ob-step-purpose', 'ob-step-freq', 'ob-step-push', 'ob-step-source', 'ob-step3', 'ob-step4', 'ob-step5', 'ob-step6'];

// 알림 안내·플랜 화면은 네이티브 앱에서만(웹은 푸시·인앱결제가 없음). 테스트 강제 진입(?ob=1)에서는 웹에서도 보인다
function _obNativeSteps() {
  return !!window.Capacitor?.isNativePlatform() || new URLSearchParams(location.search).get('ob') === '1';
}
function _obFlowNow() {
  return OB_FLOW.filter(id => id !== 'ob-step-push' || _obNativeSteps());
}

// ── 온보딩 분석 이벤트(onboarding_*) ──────────────────────────────
// 화면 이름은 DOM id가 아니라 안정적인 이름(순서를 바꿔도 분석이 안 깨지게). 성별·출생년도·닉네임·초대코드 값은 기록하지 않는다(체류시간만).
// 테스트 강제 진입(?ob=1 — 흐름도 페이지 iframe 포함)에서는 기록하지 않는다
const OB_STEP_NAME = { 'ob-step1': 'persona', 'ob-step2': 'experience', 'ob-step-purpose': 'purpose', 'ob-step-freq': 'weekly_freq', 'ob-step-push': 'push', 'ob-step-source': 'source', 'ob-step3': 'gender', 'ob-step4': 'birth_year', 'ob-step5': 'nickname', 'ob-step6': 'has_invite', 'ob-step7': 'invite_code', 'ob-step8': 'invite_confirmed', 'ob-step-plan': 'plan' };
const _OB_TEST = new URLSearchParams(location.search).get('ob') === '1';
let _obStepAt = 0;           // 지금 화면이 뜬 시각
let _obFirstAt = 0;          // 첫 설문 화면이 뜬 시각(완료까지 걸린 시간 계산용)
let _obInviteTries = 0;      // 초대코드 검증 시도 횟수
let _obPlanResult = 'n/a';   // subscribed | skipped | n/a(플랜 화면이 안 떴음)

function _obEntry() {
  if (sessionStorage.getItem(PENDING_SHARE_CODE_KEY)) return 'share_link';
  if (typeof _hasPushTarget === 'function' && _hasPushTarget()) return 'push';
  return 'direct';
}
function _obLog(name, props) {
  if (_OB_TEST) return;
  analytics.track(name, Object.assign({ flow: _obFlow, entry: _obEntry() }, props));
}
function _obStepViewed(toId) {
  const step = OB_STEP_NAME[toId];
  if (!step) return;
  _obStepAt = Date.now();
  if (!_obFirstAt) _obFirstAt = _obStepAt;
  const flow = _obFlowNow();
  const idx = flow.indexOf(toId);
  _obLog('onboarding_step_viewed', { step: step, step_index: idx >= 0 ? idx + 1 : null, step_total: flow.length });
}
function _obAnswered(step, answer) {
  _obLog('onboarding_step_answered', { step: step, answer: answer == null ? null : answer, time_on_step_sec: Math.round((Date.now() - _obStepAt) / 1000) });
}

// ── 설문 답변 → 임시 패턴(처음 값) ──────────────────────────────
// 답변은 고정이 아니라 출발점이다 — 이후 매달 배치(scripts/compute-persona-profile.js)가 행동 데이터로 다시 계산해서 실측 값이 나오면 이 값을 갱신한다.
// skill_type(실제로 잘하는지)은 설문으로 정하지 않고 비워 둔다. 접속 유형은 빈도만 알고 깊이는 몰라서 헤비·몰입형은 설문으로 나오지 않는다
const OB_PURPOSE_TO_PREF = { comping: 'comping', soloing: 'soloing', harmony: 'harmony', editor: 'toolkit', dictionary: 'toolkit', chord_sheet: 'toolkit', tools: 'toolkit' };
const OB_FREQ_TO_ENGAGEMENT = { lt1: 'light_user', '1to2': 'light_user', gte3: 'habitual' };   // 1~2회: 중간값 1.5가 기준선(주 1.56회) 바로 아래라 라이트로
function _obInitialPattern() {
  return { pref_type: OB_PURPOSE_TO_PREF[_obData.purpose] || null, engagement_type: OB_FREQ_TO_ENGAGEMENT[_obData.weekly_freq] || null };
}

function _obDotsHtml(active, total) {
  let html = '';
  for (let i = 0; i < total; i++) html += '<span class="ob-dot' + (i < active ? ' ob-dot--done' : i === active ? ' ob-dot--active' : '') + '"></span>';
  return html;
}
function _obRenderDots() {
  const flow = _obFlowNow();
  const put = (id, active) => {
    const box = document.querySelector('#' + id + ' .ob-progress-dots');
    if (box) box.innerHTML = _obDotsHtml(active, flow.length);
  };
  flow.forEach((id, i) => put(id, i));
  put('ob-step7', flow.length - 1);   // 초대코드 입력 — 마지막 점이 켜진 채로
  put('ob-step8', flow.length);       // 초대코드 확인 — 전부 지나간 상태
}

// 설문 순서상 다음 화면으로
function _obGo(fromId) {
  const flow = _obFlowNow();
  const to = flow[flow.indexOf(fromId) + 1];
  if (to) _showStep(to, fromId);
}
function obNext(fromId) {
  const step = OB_STEP_NAME[fromId];
  if (fromId === 'ob-step-push') _obLog('onboarding_push_prompt', { action: 'later', os_result: null });
  else if (step === 'purpose' || step === 'weekly_freq' || step === 'source') _obAnswered(step, _obData[step]);
  _obGo(fromId);
}

// 알림 안내 화면의 종 로티 — 화면이 보이기 시작할 때 한 번만 재생하고 그 뒤로는 멈춘 채로 둔다.
// 로티는 0~56.5프레임에만 보이고(그 뒤 레이어가 끝남) 종이 43.5프레임에 제자리로 멈추므로 55프레임까지만 재생해 그 장면에 정지.
// 로티 라이브러리나 파일을 못 불러오면 정지 SVG(#ob-push-fallback)가 그대로 보인다
let _obBell = null;
let _obBellDue = false;   // 재생 시점(1.3초 뒤)이 이미 지났는지 — 로티 파일이 그보다 늦게 오면 도착하자마자 재생
function _obBellPlay() {
  const box = document.getElementById('ob-push-lottie');
  if (!box || typeof lottie === 'undefined') return;
  if (!_obBell) {
    _obBell = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, path: 'image/bell.json' });
    _obBell.addEventListener('DOMLoaded', () => {
      box.hidden = false;
      document.getElementById('ob-push-fallback')?.remove();
      _obBell.goToAndStop(0, true);
      if (_obBellDue) _obBell.playSegments([0, 55], true);
    });
  }
  setTimeout(() => { _obBellDue = true; if (_obBell.isLoaded) _obBell.playSegments([0, 55], true); }, 1300);   // 아이콘이 떠오르는 연출(1.25s 지연 + 0.7s)이 시작될 즈음
}

// 알림 안내 화면: "알림 받기" → OS 권한 요청 후 다음으로
function obPushAllow() {
  _requestPushPermission().then(r => _obLog('onboarding_push_prompt', { action: 'allow_tapped', os_result: r }));
  _obGo('ob-step-push');
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
  _obAnswered('persona', _obData.persona);
  _obLog('onboarding_consent_viewed', { terms_version: CURRENT_TERMS_VERSION });
  document.getElementById('ob-consent-backdrop')?.classList.remove('hidden');
}

function obOnConsentCheck() {
  const required = document.querySelectorAll('.ob-consent-required');
  const btn = document.getElementById('ob-consent-btn');
  if (btn) btn.disabled = ![...required].every(c => c.checked);
}

function obConsentAgree() {
  _obLog('onboarding_consent_agreed', { terms_version: CURRENT_TERMS_VERSION, reconsent: _obReconsentOnly });
  const backdrop = document.getElementById('ob-consent-backdrop');
  backdrop?.classList.add('ob-consent-backdrop--closing');
  setTimeout(() => {
    backdrop?.classList.add('hidden');
    backdrop?.classList.remove('ob-consent-backdrop--closing');
  }, 280);
  if (_obReconsentOnly) {
    _saveReConsent().finally(goToHome);
    return;
  }
  _showStep('ob-step2', 'ob-step1');
}

// 재동의 전용 저장 — persona·닉네임 등 기존 값은 건드리지 않고 버전만 갱신
async function _saveReConsent() {
  try {
    const { token, userId } = getStoredAuth();
    if (!token || !userId) return;
    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        terms_version: CURRENT_TERMS_VERSION,
        consent_agreed_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error('[Onboarding] 재동의 저장 실패:', e);
  }
}

// FCM 푸시 권한 요청 + 토큰 등록 (채널 생성은 shared.js initPushNotifications 담당)
async function _requestPushPermission() {
  try {
    const PN = window.Capacitor?.Plugins?.PushNotifications;
    if (!PN) return 'unavailable';
    let perm = await PN.checkPermissions();
    if (perm.receive !== 'granted') perm = await PN.requestPermissions();
    if (perm.receive === 'granted') await PN.register();
    return perm.receive;   // granted | denied | prompt …(분석용)
  } catch (_) { return 'error'; }
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
  } else if (field === 'purpose') {
    document.getElementById('ob-step-purpose-next').disabled = false;
  } else if (field === 'weekly_freq') {
    document.getElementById('ob-step-freq-next').disabled = false;
  } else if (field === 'source') {
    document.getElementById('ob-step-source-next').disabled = false;
  }
}

function obStep2Next() {
  if (!_obData.guitar_experience) return;
  _obAnswered('experience', _obData.guitar_experience);
  _obGo('ob-step2');
}

function obStep3Next() {
  if (!_obData.gender) return;
  _obAnswered('gender', null);   // 값은 기록하지 않음(개인정보)
  _showStep('ob-step4', 'ob-step3');
  _initYearPicker();
}

// Step 4: 년도 선택 → Step 5 이동
function obStep4Next() {
  _obAnswered('birth_year', null);   // 값은 기록하지 않음(개인정보)
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
      document.getElementById('ob-step5-next').disabled = false;
    }
  } catch(e) {}
}

// Step 5: 닉네임 입력 처리
function obOnNicknameInput(input) {
  const val = input.value.trim();
  _obData.nickname = val || null;
  document.getElementById('ob-nickname-len').textContent = input.value.length;
  document.getElementById('ob-step5-next').disabled = val.length === 0;
}

// Step 5: 닉네임 확정 → Step 6(초대코드 보유 여부) 이동
function obStep5Next() {
  if (!_obData.nickname) return;
  _obAnswered('nickname', null);   // 값은 기록하지 않음
  _showStep('ob-step6', 'ob-step5');
}

// Step 6: 초대코드 보유 여부 선택 → '아니요'는 바로 완료, '예'는 Step 7(코드 입력)로 이동
function obStep6Choice(el, val) {
  document.querySelectorAll('#ob-step6 .ob-big-card').forEach(c => c.classList.remove('ob-big-card--selected'));
  el.classList.add('ob-big-card--selected');
  _obData.has_invite = val;
  _obAnswered('has_invite', val);
  if (val === 'no') {
    _obFinishOnboarding();
  } else {
    _showStep('ob-step7', 'ob-step6');
  }
}

// Step 7: 코드 입력 처리 — 재입력 시 에러 상태 해제
function obOnInviteInput(input) {
  const val = input.value.trim();
  _obData.invite_code = val || null;
  document.getElementById('ob-step7-complete').disabled = val.length === 0;
  _clearInviteError();
}

// Step 7: 완료 → 코드 유효성 확인. 성공은 Step 8로 전환. 실패/오류는 화면전환 없이 인라인 표시.
async function obStep7Complete() {
  const btn = document.getElementById('ob-step7-complete');
  if (btn) { btn.disabled = true; btn.textContent = '확인 중...'; }
  try {
    const r = await _checkInviteCode(_obData.invite_code);
    _obInviteTries++;
    _obLog('onboarding_invite_checked', { result: r.ok ? 'ok' : (r.reason || 'unknown'), attempt_no: _obInviteTries });   // 코드 값은 기록하지 않음
    if (r.ok) {
      _showStep('ob-step8', 'ob-step7');
    } else {
      _showInviteError(INVITE_ERROR_MESSAGES[r.reason] || INVITE_ERROR_MESSAGES.network);
      if (btn) { btn.disabled = false; btn.textContent = '완료'; }
    }
  } catch (e) {
    _obInviteTries++;
    _obLog('onboarding_invite_checked', { result: 'network', attempt_no: _obInviteTries });
    _showInviteError(INVITE_ERROR_MESSAGES.network);
    if (btn) { btn.disabled = false; btn.textContent = '완료'; }
  }
}

// Step 7: 넘어가기 — 실수로 진입했을 경우 코드 없이 바로 온보딩 종료
function obStep7Skip() {
  _obLog('onboarding_invite_skipped', {});
  _obData.invite_code = null;
  _obFinishOnboarding();
}

const INVITE_ERROR_MESSAGES = {
  invalid: '유효하지 않은 코드입니다.',
  self:    '본인의 코드는 사용할 수 없어요.',
  already: '이미 초대코드를 사용했어요.',
  network: '잠시 후 다시 시도해 주세요.',
};

// Supabase RPC 호출 (온보딩 전용 경량 헬퍼). 비로그인 상태면 anon 키만으로 호출.
async function _obRpc(fnName, body) {
  let token = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) token = JSON.parse(stored)?.access_token || null;
  } catch (_) {}
  const headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST', headers, body: JSON.stringify(body || {}),
  });
  if (!resp.ok) throw new Error(fnName + ' ' + resp.status);
  return await resp.json();
}

// 코드 유효성만 확인(보상 지급 없음) — 이 시점엔 subscriptions row가 아직 없을 수 있다.
// 실제 지급은 온보딩 저장 후 _redeemInviteCode()에서.
async function _checkInviteCode(code) {
  return await _obRpc('check_invite_code', { p_code: code });
}

// 온보딩 저장 완료 후 호출 — referrals 기록 + 피초대자 보상(피크상자) 지급.
// 실패해도 앱 진입은 막지 않는다(보상은 재시도 불가하지만 진입 차단이 더 나쁨).
async function _redeemInviteCode(code) {
  try {
    const r = await _obRpc('redeem_invite_code', { p_code: code });
    if (!r?.ok) console.error('[Onboarding] 초대코드 지급 실패:', r?.reason);
  } catch (e) {
    console.error('[Onboarding] 초대코드 지급 예외:', e);
  }
}

// 실패/오류: 화면전환 없이 입력창 빨간 테두리 + 흔들림 + 약한 진동 + 인라인 에러 텍스트로 표시
function _showInviteError(message) {
  const input = document.getElementById('ob-invite-input');
  input?.classList.add('ob-invite-input--error');
  if (input) {
    input.classList.remove('ob-invite-input--shake');
    void input.offsetWidth; // 리플로우 강제 → 연속 실패 시에도 애니메이션 재트리거
    input.classList.add('ob-invite-input--shake');
  }
  const errEl = document.getElementById('ob-invite-error');
  if (errEl) { errEl.textContent = message; errEl.classList.remove('hidden'); }
  if (navigator.vibrate) navigator.vibrate(30);
}
function _clearInviteError() {
  document.getElementById('ob-invite-input')?.classList.remove('ob-invite-input--error');
  document.getElementById('ob-invite-error')?.classList.add('hidden');
}

// Step 8: 완료 → 온보딩 종료
async function obStep8Complete() {
  const btn = document.getElementById('ob-step8-complete');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
  await _obFinishOnboarding();
}

// 온보딩 완료 → Supabase 저장 → (신규)home / (기존)시작하기 화면
async function _obFinishOnboarding() {
  await _saveOnboardingData();
  // subscriptions row가 생긴 뒤에 지급해야 보상이 유실되지 않는다.
  if (_obData.invite_code) await _redeemInviteCode(_obData.invite_code);
  localStorage.setItem('onboarding_done', '1');
  // 고른 답과 그때 배정한 임시 패턴을 이벤트로 남긴다(BigQuery에 영구 보관 — 답변 내역은 이후 패턴이 갱신돼도 보존).
  // 답변 3문항은 subscriptions 컬럼에도 저장된다(_saveOnboardingData). 성별·출생년도·닉네임은 이벤트에 담지 않음
  if (_obData.purpose || _obData.weekly_freq || _obData.source) {
    const ip = _obInitialPattern();
    _obLog('onboarding_survey_completed', {
      persona: _obData.persona, guitar_experience: _obData.guitar_experience,
      purpose: _obData.purpose, weekly_freq: _obData.weekly_freq, source: _obData.source, has_invite: _obData.has_invite,
      pref_type_initial: ip.pref_type, engagement_type_initial: ip.engagement_type,
    });
  }
  // 저장이 끝난 뒤에 플랜 화면을 거친다(플랜 화면에서 앱을 꺼도 설문 답변은 남음). 건너뛰거나 결제하면 아래 이동을 이어서 한다
  _obShowPlan(function () {
    _obLog('onboarding_completed', { duration_sec: Math.round((Date.now() - (_obFirstAt || Date.now())) / 1000), plan_result: _obPlanResult, used_invite: !!_obData.invite_code });
    // 공유 링크로 들어온 경우엔 '시작하기' 탭 없이 바로 home(→ 공유 노트로 이동)
    if (_obFlow === 'existing' && !sessionStorage.getItem(PENDING_SHARE_CODE_KEY)) {
      // 기존 유저(persona 미입력) → '시작하기' 화면 거쳐 home
      _showStartScreen();
    } else {
      // 신규 가입 (또는 공유 링크로 들어온 기존 유저) → 바로 home
      goToHome();
    }
  });
}

// ── 플랜 화면 (온보딩 마지막 관문) ─────────────────────────────
// 화면에는 Free/Pro 비교만 두고, "구독하기"를 누르면 앱 공용 요금제 시트(월간·연간 선택)를 연다.
// "지금은 안 할게요!"로 넘기면 바로 이어서 홈으로. Pro이거나 웹이면 이 화면 없이 바로 이어간다
let _obPlanNext = null;
function _obShowPlan(next) {
  if (getPlan() === 'pro' || !_obNativeSteps()) { next(); return; }
  _obPlanNext = next;
  _showStep('ob-step-plan');
  setTimeout(() => {   // 플랜 화면이 올라온 뒤 아래 깔린 설문 화면 정리
    document.querySelectorAll('.ob-overlay--step:not(#ob-step-plan)').forEach(el => el.classList.add('hidden'));
  }, 300);
}
function obPlanSubscribe() {
  _obLog('onboarding_plan_action', { action: 'subscribe_tapped' });
  openPlanSheet('onboarding');
  const title = document.querySelector('#plan-sheet .plan-sheet-title');
  if (title) title.textContent = 'Pro 구독하기';   // 온보딩 전용 시트 제목(기능 소개를 뺀 연간·월간 선택 시트)
}
function obPlanSkip(result) {   // result: 'subscribed'(결제 성공으로 넘어감) / 없으면 "지금은 안 할게요!"
  _obPlanResult = result === 'subscribed' ? 'subscribed' : 'skipped';
  _obLog('onboarding_plan_action', { action: _obPlanResult });
  const next = _obPlanNext;
  _obPlanNext = null;
  if (next) next();
}
// 결제가 성공하면 shared.js purchasePlan이 시트를 닫기만 한다 → 플랜 화면에서 Pro가 됐으면 이어서 진행
const _closePlanSheetBase = closePlanSheet;
closePlanSheet = function () {
  _closePlanSheetBase();
  if (_obPlanNext && getPlan() === 'pro') obPlanSkip('subscribed');
  else if (_obPlanNext) _obLog('onboarding_plan_action', { action: 'sheet_closed' });
};

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
  const END       = new Date().getFullYear() - 14; // 만 14세 미만 가입 방지(개인정보보호법 제22조의2) — 휠 자체에서 선택 불가하게 차단
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

// 설문으로 정한 임시 패턴을 프로필에 넣는다(신규 가입자만 — 기존 유저는 이미 행동 기록이 있어 실측 값을 덮으면 안 됨).
// persona 저장과 별도 요청이라, 여기가 실패해도(예: 컬럼 제약) persona 저장·온보딩 완료에는 영향이 없다
async function _saveInitialPattern(token, userId) {
  if (_obFlow !== 'signup') return;
  const p = _obInitialPattern();
  if (!p.pref_type && !p.engagement_type) return;
  const body = { user_id: userId };
  if (p.pref_type) body.pref_type = p.pref_type;
  if (p.engagement_type) body.engagement_type = p.engagement_type;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/user_persona_profile?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error('[Onboarding] 임시 패턴 저장 실패:', resp.status, await resp.text());
      _obLog('onboarding_save_failed', { where: 'pattern', status: resp.status });
    }
  } catch (e) {
    console.error('[Onboarding] 임시 패턴 저장 예외:', e);
    _obLog('onboarding_save_failed', { where: 'pattern', status: null });
  }
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
        guitar_experience:        _obData.guitar_experience,
        gender:                   _obData.gender,
        birth_year:               _obData.birth_year,
        nickname:                 _obData.nickname,
        ...(_obData.purpose     && { onboarding_purpose:     _obData.purpose }),       // 처음 답변 보존(supabase/onboarding_survey_columns.sql 먼저 적용할 것)
        ...(_obData.weekly_freq && { onboarding_weekly_freq: _obData.weekly_freq }),
        ...(_obData.source      && { onboarding_source:      _obData.source }),
        consent_agreed_at:        new Date().toISOString(),
        onboarding_completed_at:  new Date().toISOString(),
        terms_version:            CURRENT_TERMS_VERSION,
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('[Onboarding] subscriptions 저장 실패:', resp.status, errBody);
      _obLog('onboarding_save_failed', { where: 'subscriptions', status: resp.status });
    }
    // persona는 subscriptions가 아니라 user_persona_profile이 유일한 소스(2026-08-31).
    // checkNeedsOnboarding이 바로 다음에 이 테이블을 재조회하므로 fire-and-forget 아닌 await 필수
    // (안 하면 라우팅이 아직 없는 row를 보고 다시 온보딩으로 튕길 수 있음).
    if (_obData.persona) {
      const ppResp = await fetch(`${SUPABASE_URL}/rest/v1/user_persona_profile?on_conflict=user_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: userId, persona: _obData.persona, computed_at: new Date().toISOString() }),
      });
      if (!ppResp.ok) {
        console.error('[Onboarding] user_persona_profile 저장 실패:', ppResp.status, await ppResp.text());
        _obLog('onboarding_save_failed', { where: 'persona', status: ppResp.status });
      }
    }
    await _saveInitialPattern(token, userId);
  } catch(e) {
    console.error('[Onboarding] subscriptions 저장 예외:', e);
    _obLog('onboarding_save_failed', { where: 'exception', status: null });
  }
}

// ── 서버 데이터 선반영 ────────────────────────────────────────
// 재설치·새 기기는 로컬이 비어있어서, 복원 전에 home으로 보내면 노트·훈련통계·XP가
// 전부 빈 값으로 보인다(각 화면이 로컬을 먼저 읽음). 온보딩 스피너 뒤에서 끌어온 뒤
// '시작하기'를 띄운다. 실패해도 진입은 막지 않는다 — 6초 컷 후 그냥 진행.
async function _restoreServerData() {
  const jobs = [
    typeof syncProjectsOnLogin        === 'function' && syncProjectsOnLogin(),
    typeof restoreTrainingStatsFromDB === 'function' && restoreTrainingStatsFromDB(),
    typeof restoreQuizLevelStatsFromDB === 'function' && restoreQuizLevelStatsFromDB(),
    // GREATEST 병합 RPC라 호출 자체가 이미지/공유/노트 카운터의 유일한 복원 경로다.
    typeof syncStatsToDB              === 'function' && syncStatsToDB(),
  ].filter(Boolean).map(p => Promise.resolve(p).catch(() => {}));

  await Promise.race([
    Promise.all(jobs),
    new Promise(r => setTimeout(r, 6000)),
  ]);
}

// ── 인증된 유저 라우팅 (persona 유무 분기) ───────────────────
//  persona 있음 → '시작하기' welcome 표시 (클릭 시 home)
//  persona 없음 → 바로 persona step 진입 (_obFlow='existing')
async function _routeAuthedUser() {
  await _restoreServerData(); // 스피너 유지한 채 서버 데이터 복원 완료까지 대기
  const { token, userId } = getStoredAuth();
  if (token && userId && await checkNeedsOnboarding(token, userId)) {
    // 기존 유저 · persona 미입력 → 바로 persona step
    // (조회 실패 시에도 여기로 온다 — 통과시키면 프로필 없는 유저가 생긴다)
    _obFlow = 'existing';
    document.getElementById('onboarding-loading')?.classList.add('hidden');
    document.getElementById('onboarding-overlay')?.classList.add('hidden');
    _showStep('ob-step1');
    return;
  }
  // persona는 있지만(온보딩 완료 유저) 이용약관·개인정보처리방침 재동의가 필요한 경우
  // (광고식별자 등 신규 수집항목 추가, 2026-09) → 동의 바텀시트만 단독으로 띄운다.
  if (token && userId && await checkNeedsReConsent(token, userId)) {
    document.getElementById('onboarding-loading')?.classList.add('hidden');
    document.getElementById('onboarding-overlay')?.classList.add('hidden');
    _obReconsentOnly = true;
    document.getElementById('ob-consent-backdrop')?.classList.remove('hidden');
    return;
  }
  // persona 있음 → 시작하기 welcome 표시
  // 단, 공유 링크·푸시 딥링크로 들어온 경우엔 탭 기다리지 않고 바로 진입
  // (공유는 home.js가 pending code를 이어서 처리, 푸시는 goToHome이 목적지로 보냄)
  // 이 지름길은 로그인 + 온보딩 완료 유저 전용. 비로그인은 로그인 화면으로 보낸다.
  if (token && userId && (sessionStorage.getItem(PENDING_SHARE_CODE_KEY) || _hasPushTarget())) {
    goToHome(); return;
  }
  // 네이티브 앱: 로그인 세션이 살아 있고 온보딩도 끝난 유저는 "시작하기" 없이 바로 진입
  // (handleStart → _startOnboardingSteps 가 하던 것과 동일: onboarding_done 기록 후 goToHome).
  // 웹은 시작하기를 유지한다.
  if (window.Capacitor?.isNativePlatform() && token && userId) {
    localStorage.setItem('onboarding_done', '1');
    goToHome(); return;
  }
  _showOnboardingButtons();
}

// ── 온보딩 버튼 표시 ─────────────────────────────────────────
function _showOnboardingButtons() {
  document.getElementById('onboarding-overlay')?.classList.remove('onboarding-overlay--splash');
  document.getElementById('onboarding-loading')?.classList.add('hidden');
  if (_authReady) {
    document.getElementById('onboarding-start-btn')?.classList.remove('hidden');
    document.getElementById('onboarding-switch-btn')?.classList.remove('hidden');
  } else {
    document.getElementById('onboarding-google-btn')?.classList.remove('hidden');
    _toggleAppleBtn(true);
    analytics.track('onboarding_viewed', {
      platform: window.Capacitor?.getPlatform?.() || 'web',
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
    } else if (_isIOSNative()) {
      const SocialLogin = window.Capacitor?.Plugins?.SocialLogin;
      if (SocialLogin) await SocialLogin.logout({ provider: 'google' }).catch(() => {});
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
  _toggleAppleBtn(true);
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
    const _ios = _isIOSNative(); // iOS는 SocialLogin 플러그인(shared.js iosGoogleSignIn) 사용
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (!_ios && !GoogleAuth) return;

    if (googleBtn)    googleBtn.classList.add('hidden');
    _toggleAppleBtn(false);
    if (signinLoader) signinLoader.classList.remove('hidden');

    let idToken, _nonce = null;
    if (_ios) {
      ({ idToken, nonce: _nonce } = await iosGoogleSignIn());
    } else {
      const googleUser = await GoogleAuth.signIn();
      idToken = googleUser?.authentication?.idToken ?? googleUser?.idToken;
    }
    if (!idToken) throw new Error('ID 토큰을 받지 못했습니다.');

    const rawResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify(_nonce
        ? { provider: 'google', id_token: idToken, nonce: _nonce }
        : { provider: 'google', id_token: idToken }),
    });
    const rawJson = await rawResp.json();
    if (!rawResp.ok) throw new Error(rawJson?.error_description || 'Supabase 인증 실패');

    const session = saveSessionToStorage(rawJson);
    if (session.user) {
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchPlanWithToken(session.access_token);
      // 재설치 후 재로그인이 이 경로로 들어온다 — 스텝 진입 전에 서버 데이터를 끌어온다.
      await _restoreServerData();
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
    _toggleAppleBtn(true);
  }
}

// ── Apple 로그인 (iOS 전용 온보딩 버튼) ──────────────────────
// Apple 버튼은 iOS 네이티브에서만 노출(+ file:// 로컬 열람은 UI 디자인 확인용). 로그인 이후 흐름은 Google(onboardingSignIn)과 동일.
// file:// 은 어떤 배포 환경(웹·Android·iOS)에서도 쓰이지 않으므로 운영 노출 위험 없음.
function _toggleAppleBtn(show) {
  const allowed = _isIOSNative() || location.protocol === 'file:';
  document.getElementById('onboarding-apple-btn')?.classList.toggle('hidden', !(show && allowed));
}
async function onboardingAppleSignIn() {
  if (!_isIOSNative()) return;
  const signinLoader = document.getElementById('onboarding-signin-loading');
  const googleBtn    = document.getElementById('onboarding-google-btn');
  try {
    analytics.track('login_started', { method: 'apple' });
    if (googleBtn)    googleBtn.classList.add('hidden');
    _toggleAppleBtn(false);
    if (signinLoader) signinLoader.classList.remove('hidden');

    const { idToken, nonce } = await iosAppleSignIn();
    if (!idToken) throw new Error('ID 토큰을 받지 못했습니다.');

    const rawResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ provider: 'apple', id_token: idToken, nonce }),
    });
    const rawJson = await rawResp.json();
    if (!rawResp.ok) throw new Error(rawJson?.error_description || 'Supabase 인증 실패');

    const session = saveSessionToStorage(rawJson);
    if (session.user) {
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchPlanWithToken(session.access_token);
      await _restoreServerData();
      _obFlow   = 'signup';
      _obRouted = true;
      _startOnboardingSteps();
    }
  } catch(e) {
    const msg = e?.message || String(e) || '';
    if (!msg.toLowerCase().includes('cancel')) {
      console.error('[Auth] Apple 로그인 실패:', e);
    }
    if (signinLoader) signinLoader.classList.add('hidden');
    if (googleBtn)    googleBtn.classList.remove('hidden');
    _toggleAppleBtn(true);
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
          platform: window.Capacitor?.getPlatform?.() || 'web',
          project_count: loadProjects().length,
        });
        _authResolve();
        _obRouted = true;
        const planSync = _billingReady.then(async () => {
          if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
          await syncPlanFromBilling();
          await fetchPlanWithToken(session.access_token).catch(() => {});
        }).catch(() => {});
        // plan 동기화 완료까지 대기 — 안 기다리면 stale plan으로 analytics가 free로 기록되고,
        // Pro 유저가 잠깐 free 화면을 보게 된다. 느릴 때 무한대기 방지로 3초 컷.
        await Promise.race([planSync, new Promise(r => setTimeout(r, 3000))]);
        _routeAuthedUser();
        return;
      }
    }
  } catch(e) {}

  analytics.track('app_open', {
    platform: window.Capacitor?.getPlatform?.() || 'web',
    project_count: loadProjects().length,
  });
  _authResolve();
  _showOnboardingButtons();
}

// ── 앱 초기화 ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  _obRenderDots();   // 설문 순서(OB_FLOW)에 맞춰 단계별 진행 점을 채움

  // ── 온보딩 스텝 강제 진입(테스트용): onboarding.html?ob=1 → DEV 빌드/기존 persona 무관하게 Step1부터 노출 ──
  const _forceOnboarding = new URLSearchParams(location.search).get('ob') === '1';

  // ── DEV 빌드: 온보딩/로그인 건너뛰고 바로 홈으로 ────────────
  if (!_forceOnboarding && typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
    goToHome();
    return;
  }

  // 테스트 강제 진입: 로딩 스플래시/강제업데이트체크/빌링/인증 대기 전부 건너뛰고 바로 스텝 표시
  // (매번 새로고침해서 스텝을 확인할 때 로딩 화면이 매번 잠깐 보이는 걸 방지)
  if (_forceOnboarding) {
    _startOnboardingSteps();
    return;
  }

  // ── 인앱 브라우저(카카오톡 등): Google OAuth 차단(disallowed_useragent) → 외부 브라우저 유도 ──
  if (_isInAppBrowser()) {
    _showInAppGuide();
    return;
  }

  // 로딩 스피너 즉시 표시 (checkForceUpdate/initBilling 대기 중 빈 화면 방지)
  const _ov = document.getElementById('onboarding-overlay');
  _ov?.classList.remove('hidden');
  // 네이티브 앱: 세션 확인이 끝나 로그인 버튼이 필요해지기 전까지는 로고+이름만 보이는 전환 화면
  // (로그인 상태면 이 화면 그대로 홈으로 넘어간다). _showOnboardingButtons()가 해제.
  if (window.Capacitor?.isNativePlatform()) _ov?.classList.add('onboarding-overlay--splash');

  // 강제 업데이트 대상이면 여기서 완전히 멈춤 — 푸시 딥링크도 오버레이를 통과할 수 없다.
  if (await checkForceUpdate()) return;
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
