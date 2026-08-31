// ═══════════════════════════════════════════════════════════════
// daily-mission.js — 데일리 미션 게이트
// ═══════════════════════════════════════════════════════════════

function dmGateStart() {
  _playTap();
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_gate_start', {});
  location.href = 'mission-session.html';
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
  if (_dmHasTodayResult()) { location.href = 'mission-session.html'; return; }
  if (typeof analytics !== 'undefined') analytics.track('daily_mission_gate_viewed', {});
  lucide.createIcons();
  positionDmGateGradient();
  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(positionDmGateGradient, 150);
  });
});
