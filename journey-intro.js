// ═══════════════════════════════════════════════════════════════
// journey-intro.js — 여정 모드 선택 — 가입·업데이트 뒤 홈보다 먼저 거치는 필수 화면
// 디자인은 온보딩 단계 화면과 같은 틀(onboarding.html .ob-* 재사용 — 문구·그림·버튼 등장 연출도 온보딩 것 그대로).
// 활동유형(pref_type, 설문 임시값 → 매달 배치 갱신)으로 코드반주/솔로연주 중 하나를 먼저 제시하고,
// 작은 [다른 여정 볼래요]로 두 화면을 서로 오간다(온보딩 단계 전환과 같은 슬라이드).
// 여정 선택은 필수 — 닫기·뒤로가기 없음. 모든 유저는 언박싱 단계부터 시작한다.
// ═══════════════════════════════════════════════════════════════

const JI_NICK_WAIT_MS = 500;    // 닉네임 조회 대기 상한 — 넘으면 기본 호칭으로 진행(화면이 빈 채로 오래 기다리지 않게)
const JI_READY_MS = 1350;       // 버튼이 다 보이는 시각(CSS 등장 연출: 지연 0.65초 + 0.7초) — 그 전엔 눌러도 반응 안 함

let _jiRecommended = 'comping';
let _jiCurrent = null;
let _jiLeaving = false;          // 시작하기를 눌러 떠나는 중(연타·전환 중복 방지)
let _jiChosen = 'comping';       // 시작하기로 고른 여정(추가안내를 거쳐도 유지)
let _jiReadyAt = 0;              // 이 시각(performance.now) 전에는 버튼이 아직 투명하게 떠오르는 중 — 탭 무시

// 추천 여정: 활동유형이 솔로잉이면 솔로연주, 그 외(반주·화성·도구·없음)는 코드반주 — shared.js getCurrentCurriculum과 같은 기준
function _jiRecommendedKind() {
  return localStorage.getItem('user_pref_type') === 'soloing' ? 'soloing' : 'comping';
}

// 닉네임: subscriptions.nickname → 구글 이름 → null (shared.js loadSidebarUserInfo와 같은 경로)
async function _jiFetchNickname() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    const token = session?.access_token;
    const userId = session?.user?.id;
    const fallback = session?.user?.user_metadata?.full_name || null;
    if (!token || !userId) return fallback;
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=nickname`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) return fallback;
    const rows = await resp.json();
    return rows[0]?.nickname || fallback;
  } catch (_) { return null; }
}

// 타이틀: 추천 여정 = "OO님께 추천하는 / △△ 여정이에요!", 다른 여정 = "이런 여정도 / 준비되어 있어요!"
function _jiFillTexts(nick) {
  const label = { comping: '코드반주', soloing: '솔로연주' };
  ['comping', 'soloing'].forEach(kind => {
    const step = document.getElementById('ji-step-' + kind);
    step.querySelector('.ji-title').innerHTML = kind === _jiRecommended
      ? `${nick}님께 추천하는<br>${label[kind]} 여정이에요!`
      : '이런 여정도<br>준비되어 있어요!';
    step.querySelector('.ji-course-name').textContent = CURRICULUM_NAMES.unboxing[kind];
  });
  // 추가안내 1: "OO님은 현재 / △△예요" + 지금 단계 배지
  // 이 안내는 언박싱보다 높은 단계만 본다. DEV ONLY(작업용 임시): 개발 빌드에서 내 단계가 언박싱이면 미리보기용으로 굳은살 비기너로 채운다
  let persona = getUserPersona();
  if (persona === 'unboxing' && APP_VERSION.includes('_dev')) persona = 'beginner';
  const pname = PERSONA_NAMES[persona] || PERSONA_NAMES.unboxing;
  document.getElementById('ji-notice1-title').innerHTML = `${nick}님은 현재<br>${pname}${_jiCopula(pname)}`;
  document.getElementById('ji-notice1-badge').src = 'image/' + JI_BADGES[Math.max(0, PERSONA_STAGES.indexOf(persona))] + '.png';
}

// 단계 배지(홈 탑바 배지와 같은 그림·순서 — home.js _HOME_BADGES)
const JI_BADGES = ['badge_1_bronze', 'badge_2_silver', 'badge_3_gold', 'badge_4_diamond', 'badge_5_challenger'];
// "~이에요/~예요": 마지막 글자에 받침이 있으면 이에요, 없으면(모음·영문·숫자) 예요
function _jiCopula(word) {
  const c = word.charCodeAt(word.length - 1);
  const hasJong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  return hasJong ? '이에요' : '예요';
}

// 온보딩 _showStep과 같은 전환: 나가는 화면은 왼쪽으로 사라지고, 들어오는 화면은 오른쪽에서 들어온다.
// 들어오는 화면은 hidden을 벗으며 안쪽 등장 연출(타이틀 → 부가설명 → 그림·버튼)이 처음부터 다시 재생된다.
// 분석(2026-11-26 여정 텍소노미 — docs/analytics-journey-taxonomy.md)
function _jiTrack(name, props) { if (typeof analytics !== 'undefined') analytics.track(name, props || {}); }
function _jiTrackView(kind) {
  if (kind === 'comping' || kind === 'soloing') _jiTrack('journey_select_viewed', { kind: kind, recommended: kind === _jiRecommended, user_persona: getUserPersona() });
  else if (kind === 'notice1' || kind === 'notice2') _jiTrack('journey_notice_viewed', { step: kind === 'notice1' ? 1 : 2, kind: _jiChosen, user_persona: getUserPersona() });
  else if (kind === 'soon') _jiTrack('journey_soon_viewed', { grade: JI_SOON });
}
function _jiShow(kind) {
  _jiTrackView(kind);
  const to = document.getElementById('ji-step-' + kind);
  const from = _jiCurrent ? document.getElementById('ji-step-' + _jiCurrent) : null;
  if (from) {
    from.classList.add('ob-step-exiting');
    setTimeout(() => {
      from.classList.add('hidden');
      from.classList.remove('ob-step-exiting');
    }, 200);
  }
  _jiCurrent = kind;
  _jiReadyAt = performance.now() + JI_READY_MS;
  to.classList.remove('hidden');
  to.classList.add('ob-step-entering');
  to.addEventListener('animationend', function onEnd(e) {
    if (e.target !== to) return;   // 안쪽 요소의 등장 연출 끝은 무시
    to.classList.remove('ob-step-entering');
    to.removeEventListener('animationend', onEnd);
  });
}

// [다른 여정 볼래요] — 코드반주 ↔ 솔로연주 반복
function jiOther(kind) {
  if (_jiLeaving || kind !== _jiCurrent || performance.now() < _jiReadyAt) return;
  _playTap();
  _jiTrack('journey_select_switched', { from_kind: kind, to_kind: kind === 'comping' ? 'soloing' : 'comping' });
  _jiShow(kind === 'comping' ? 'soloing' : 'comping');
}

// 여정 확정: 모든 유저는 언박싱 단계부터. 확정 뒤엔 노드1 설명으로 바로 들어간다(홈을 거치지 않음).
// 언박싱보다 높은 단계 유저는 추가안내(지금 단계·승급시험 → 아직 언박싱 여정뿐) 두 화면을 거친다.
// DEV ONLY(작업용 임시): 개발 빌드는 단계와 상관없이 추가안내를 보여 준다 — 흐름 확정 후 조건에서 삭제
function jiStart(kind) {
  if (_jiLeaving || kind !== _jiCurrent || performance.now() < _jiReadyAt) return;
  _playConfirmSfx();
  setCurrentCurriculum('unboxing', kind);
  _jiChosen = kind;
  _jiTrack('journey_selected', { kind: kind, recommended: kind === _jiRecommended, entry: 'intro', user_persona: getUserPersona() });
  const needNotice = getUserPersona() !== 'unboxing' || APP_VERSION.includes('_dev');
  if (!needNotice) { _jiLeave(); return; }
  document.getElementById('ji-notice2-art').src = 'image/course_' + kind + '.svg';   // 고른 여정의 그림·이름
  document.getElementById('ji-notice2-name').textContent = CURRICULUM_NAMES.unboxing[kind];
  _jiShow('notice1');
}
// 추가안내 [다음]: 1 → 2 → (다음 화면)
function jiNoticeNext(n) {
  if (_jiLeaving || _jiCurrent !== 'notice' + n || performance.now() < _jiReadyAt) return;
  _playTap();
  if (n === 1) _jiShow('notice2');
  else _jiLeave();
}
// 이 페이지를 떠나 고른 여정의 노드1 설명(강의)으로 바로 들어간다 — 홈 지도 말풍선 [시작하기](journey.js jnyStartNode)와 같은 주소.
// 노드1 설명이 끝나면 강의 페이지가 퀴즈 1-1로 이어 준다.
function _jiLeave() {
  _jiLeaving = true;
  document.getElementById('ji-step-' + _jiCurrent).classList.add('ob-step-exiting');
  const url = 'journey-lesson.html?course=' + _jiChosen + '&day=1';
  setTimeout(() => { location.href = url; }, 200);
}

// 필수 화면이라 뒤로가기로 홈에 빠져나가지 못하게 한다.
// Android 하드웨어 뒤로가기: shared.js 기본은 #back-btn이 없으면 history.back() → 여기선 앱의 첫 화면처럼 앱을 닫는다.
function handleNativeBack() {
  if (JI_SOON) { location.href = 'home.html'; return; }   // 준비 중 안내는 필수 화면이 아니라 홈으로
  const App = window.Capacitor?.Plugins?.App;
  if (App && App.exitApp) App.exitApp();
}

// ── 준비 중(?soon=등급) — 여정 승급시험 합격 뒤 오른 등급의 여정이 아직 없을 때. 여정 선택은 건너뛴다 ──
const JI_SOON = (function () {
  const g = new URLSearchParams(location.search).get('soon');
  return PERSONA_STAGES.indexOf(g) !== -1 ? g : null;
})();
function _jiShowSoon() {
  const name = PERSONA_NAMES[JI_SOON];
  document.getElementById('ji-soon-title').innerHTML = `${name} 여정은<br>아직 준비 중이에요`;
  document.getElementById('ji-soon-badge').src = 'image/' + JI_BADGES[PERSONA_STAGES.indexOf(JI_SOON)] + '.png';
  _jiShow('soon');
}
// [지금은 훈련하기] → 훈련소
function jiSoonTrain() {
  if (_jiLeaving || _jiCurrent !== 'soon' || performance.now() < _jiReadyAt) return;
  _jiLeaving = true;
  _playConfirmSfx();
  _jiTrack('journey_soon_cta_tapped', { grade: JI_SOON });
  document.getElementById('ji-step-soon').classList.add('ob-step-exiting');
  setTimeout(() => { location.href = 'training.html'; }, 200);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (JI_SOON) {   // 준비 중 안내만 — 뒤로가기 막지 않음
    const cover = document.getElementById('page-cover');
    if (cover) requestAnimationFrame(() => { cover.classList.add('cover-out'); setTimeout(() => { cover.style.display = 'none'; }, 200); });
    _jiShowSoon();
    return;
  }
  // 웹 브라우저 뒤로가기(주소창·제스처): 더미 history를 쌓아 두고 물러나면 다시 쌓아 제자리에 둔다
  history.pushState({ _jiGuard: true }, '');
  window.addEventListener('popstate', () => { history.pushState({ _jiGuard: true }, ''); });

  _jiRecommended = _jiRecommendedKind();
  const nick = (await Promise.race([
    _jiFetchNickname(),
    new Promise(r => setTimeout(() => r(null), JI_NICK_WAIT_MS)),
  ])) || '회원';
  _jiFillTexts(nick);

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
  _jiShow(_jiRecommended);
});
