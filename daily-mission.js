// ═══════════════════════════════════════════════════════════════
// daily-mission.js — 데일리 미션 게이트
// ═══════════════════════════════════════════════════════════════

function dmGateStart() {
  _playTap();
  _playConfirmSfx();
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_gate_start', {});
  // 사운드가 실제로 들리기 전에 페이지 이동이 끊어버리는 걸 방지 — 짧게 지연 후 이동
  setTimeout(() => { location.href = 'mission-session.html'; }, 150);
}

// 오늘 미션을 이미 끝냈으면 게이트("시작할래요!")를 건너뛰고 바로 결산으로 보낸다.
// 저장 형식은 mission-session.js _msSaveTodayResult()/_msTodayKey()와 동일해야 한다.
function _dmTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function _dmHasTodayResult() {
  try {
    const s = JSON.parse(localStorage.getItem('ms_today_result') || 'null');
    return !!(s && s.date === _dmTodayKey() && s.records);
  } catch (_) { return false; }
}
// mission-session.js _msTodayResultSeen()과 같은 키·형식 — 결산화면을 이미 한 번 봤다면
// 게이트를 건너뛰고 결산으로 보내는 것도 하지 않는다(그러면 매번 재접속마다 결산으로 튕김).
function _dmTodayResultSeen() {
  try { return localStorage.getItem('ms_today_result_seen') === _dmTodayKey(); } catch (_) { return false; }
}

// "OO님" 목업 텍스트를 실제 닉네임으로 교체. home.js loadProfileFromDB()/shared.js
// loadSidebarUserInfo()와 동일한 subscriptions.nickname 조회 패턴, 폴백도 '—'로 통일.
async function _dmLoadNickname() {
  const el = document.getElementById('dm-nickname');
  if (!el) return;
  try {
    const { token, userId } = getStoredAuth();
    if (!token || !userId) return; // 비로그인/dev는 목업 "OO" 그대로 둠
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=nickname`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) return;
    const rows = await resp.json();
    if (rows.length && rows[0].nickname) el.textContent = rows[0].nickname;
  } catch (e) { console.warn('[DailyMission] 닉네임 로드 실패:', e); }
}

function dmGateLater() {
  _playTap();
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_gate_skipped', {});
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('chorditor_dm_cleared_date', today);
  location.href = 'home.html';
}

// 상단 그라데이션이 카드리스트 시작점(.ob-step8-icon-wrap)에서 정확히 끝나도록 실측
function positionDmGateGradient() {
  const gate = document.getElementById('dm-gate');
  const target = document.querySelector('.ob-step8-icon-wrap');
  if (!gate || !target) return;
  gate.style.setProperty('--dm-gate-gradient-end', target.offsetTop + 'px');
}

document.addEventListener('DOMContentLoaded', () => {
  if (_dmHasTodayResult()) {
    // 이미 결산까지 봤으면 다시 결산으로 보내지 않고 home으로 — 안 봤으면(완료 직후 이탈 등)
    // 여전히 mission-session.html로 보내서 한 번은 보여준다.
    location.href = _dmTodayResultSeen() ? 'home.html' : 'mission-session.html';
    return;
  }
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_gate_viewed', {});
  lucide.createIcons();
  positionDmGateGradient();
  _dmLoadNickname();
  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(positionDmGateGradient, 150);
  });
});
