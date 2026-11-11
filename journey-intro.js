// ═══════════════════════════════════════════════════════════════
// journey-intro.js — 나의 기타 여정 시작 안내 (언박싱 · 코드반주 코스) — 디자인 단계
// 1) 로딩: 기타가 둥둥 뜨는 버퍼(mission-session의 .ms-buffer 재사용) + "알아보고 있어요"
// 2) 결과: 승급시험 안내와 같은 구조(타이틀 → 본문 → 메인 → 하단 버튼)로 순차 등장
// 분기(코드반주/기타솔로)·실제 DB 조회·[다른 걸 배우고 싶어요] 동작은 아직 없음 — 지금은 코드반주형 고정.
// ═══════════════════════════════════════════════════════════════

const JI_LOADING_MS = 3000;   // 로딩 연출 최소 시간(실제 조회 붙이기 전까지 고정)
const JI_NICK_WAIT_MS = 1500; // 닉네임 조회 대기 상한 — 넘으면 기본 호칭으로 진행
const JI_STAGGER_DUR = 900;   // 순차 등장 한 요소의 재생시간 (mission-session MS_STAGGER_*와 같은 값)
const JI_STAGGER_GAP = 100;

let _jiTimers = [];
let _jiClosed = false;

function _jiLater(fn, ms) {
  const id = setTimeout(() => { _jiTimers = _jiTimers.filter(t => t !== id); if (!_jiClosed) fn(); }, ms);
  _jiTimers.push(id);
  return id;
}

// 이탈 정리 — 모든 출구(뒤로가기·pagehide·앱 전환)가 같은 함수를 부른다. 멱등.
function _jiCleanup() {
  _jiClosed = true;
  _jiTimers.forEach(clearTimeout);
  _jiTimers = [];
}

function closeJourneyIntro() {
  _playTap();
  _jiCleanup();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
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

function _jiSetTitle(text, iconClass, iconColor) {
  document.getElementById('ji-title-text').textContent = text;
  const icon = document.getElementById('ji-title-icon');
  if (iconClass) {
    icon.innerHTML = `<i class="${iconClass}" style="color:${iconColor}"></i>`;
    icon.style.display = '';
  } else {
    icon.style.display = 'none';
  }
}

// 요소를 숨긴 상태(.ms-stagger-pending)에서 시작해 순서대로 띄운다.
function _jiReveal(el) {
  if (!el) return;
  el.classList.remove('ms-stagger-in', 'ms-stagger-pending');
  void el.offsetWidth; // 리플레이 트릭
  el.style.setProperty('--ms-stagger-dur', JI_STAGGER_DUR + 'ms');
  el.classList.add('ms-stagger-in');
}

// steps: [{ els:[...], gapAfter? }] — 앞 스텝이 끝나야 다음 스텝 시작
function _jiPlay(steps, onDone) {
  const run = i => {
    if (i >= steps.length) { if (onDone) onDone(); return; }
    steps[i].els.forEach(_jiReveal);
    _jiLater(() => run(i + 1), JI_STAGGER_DUR + (steps[i].gapAfter ?? JI_STAGGER_GAP));
  };
  run(0);
}

// ── 1) 로딩 ──
function _jiShowLoading(nick) {
  _jiSetTitle(`${nick}님의 기타 학습 성향을 알아보고 있어요!`, null);
  document.getElementById('ji-title-desc').style.display = 'none';
  document.getElementById('ji-main').innerHTML = `
    <div class="ms-buffer">
      <div class="ms-buffer-visual">
        <div class="ms-buffer-icon"><img src="image/guitar.png" alt=""></div>
        <div class="ms-buffer-shadow"></div>
      </div>
      <p class="ms-buffer-note"><span class="ms-dots"></span></p>
    </div>`;
}

// ── 2) 결과: 코드반주형 ──
function _jiShowResultComping(nick) {
  _jiSetTitle(`${nick}님은 기타 반주에 관심이 많으신 것 같네요!`, 'ph-fill ph-music-notes', 'var(--blue)');
  document.getElementById('ji-title-desc').style.display = 'none';
  document.getElementById('ji-main').innerHTML = `
    <div class="ms-chord-tutorial ji-result">
      <p class="ms-chord-lead ji-lead ms-stagger-pending">이번 여정에서는 <b>기초 코드</b>를 암기하고</p>
      <p class="ms-chord-lead ji-lead ms-stagger-pending"><b>다양한 코드진행</b>을 다뤄보면서</p>
      <p class="ms-chord-lead ji-lead ms-stagger-pending"><b>노래에 적용</b>하는 과정을 학습해요!</p>
    </div>
    <div class="ms-bottom-actions ji-actions">
      <button class="cd-btn cd-btn--brand ji-btn-pending" id="ji-start-btn" onpointerup="jiStart()">코드반주 여정 시작하기!</button>
      <button class="ji-text-btn ji-btn-pending" id="ji-other-btn" onpointerup="jiOther()">다른 걸 배우고 싶어요</button>
    </div>`;

  const title = document.getElementById('ji-title-text');
  const icon = document.getElementById('ji-title-icon');
  title.classList.add('ms-stagger-pending');
  icon.classList.add('ms-stagger-pending');
  const leads = Array.from(document.querySelectorAll('#ji-main .ji-lead'));
  const btns = ['ji-start-btn', 'ji-other-btn'].map(id => document.getElementById(id));

  _jiPlay([
    { els: [icon, title], gapAfter: 500 },
    ...leads.map((el, i) => ({ els: [el], gapAfter: i === leads.length - 1 ? 300 : 200 })),
  ], () => btns.forEach(b => b.classList.remove('ji-btn-pending')));
}

// 아래 두 동작은 흐름 연결 단계에서 붙인다(디자인 단계 임시).
function jiStart() { _playTap(); location.href = 'journey.html'; }
function jiOther() { _playTap(); setTimeout(() => { if (!_jiClosed) location.href = 'curriculum-select.html?from=intro'; }, 150); }

document.addEventListener('DOMContentLoaded', async () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');
  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  // 이탈: 어느 경로로 나가든 타이머를 멈춘다
  window.addEventListener('pagehide', _jiCleanup);
  document.addEventListener('visibilitychange', () => { if (document.hidden) _jiCleanup(); });

  const nick = (await Promise.race([
    _jiFetchNickname(),
    new Promise(r => setTimeout(() => r(null), JI_NICK_WAIT_MS)),
  ])) || '회원';
  if (_jiClosed) return;

  _jiShowLoading(nick);
  _jiLater(() => _jiShowResultComping(nick), JI_LOADING_MS);
});
