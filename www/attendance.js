// ═══════════════════════════════════════════════════════════════
// attendance.js — 출석체크 페이지
// ═══════════════════════════════════════════════════════════════

// ── 출석체크 닫기 (홈으로 복귀) ──────────────────────────────
function closeAttendancePage() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

// ── 상단 CTA (오늘의 훈련 루틴 / 오늘 훈련 결과보기) ─────────────
// mission-session.js _msTodayKey()와 동일 형식(로컬 자정 기준, KST 아님 — 기존 그대로 맞춤).
function _attTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function _attHasTodayMissionResult() {
  try {
    const s = JSON.parse(localStorage.getItem('ms_today_result') || 'null');
    return !!(s && s.date === _attTodayKey() && s.records);
  } catch (_) { return false; }
}
function renderAttendanceCta() {
  const label = document.getElementById('attendance-cta-label');
  if (!label) return;
  label.textContent = _attHasTodayMissionResult() ? '오늘 훈련 결과보기' : '오늘의 훈련 루틴 하러가기';
}
// 완료 전엔 게이트로, 완료 후엔 결과화면으로 직행(?view=result — daily-mission.html의
// "이미 봤으면 home으로" 게이트를 우회, 유저가 명시적으로 누른 거니 다시 보여준다).
function attendanceCtaClick() {
  _playTap();
  location.href = _attHasTodayMissionResult() ? 'mission-session.html?view=result' : 'daily-mission.html';
}

// ── 도장 달력 렌더 (실제 DB값 — shared.js loadAttendanceState()/_attState 기준) ──
// 오늘 이미 도장을 찍었으면(doneToday) 마지막 찍은 칸(_attState.day)이 곧 "오늘" 칸이고,
// 아직이면 다음에 찍을 칸(_attState.day + 1)이 "오늘" 칸 — 도장 자체는 여기서 찍지 않는다
// (진행은 데일리미션 완료 시 advanceAttendance()가 찍음, 이 페이지는 조회 전용).
let _attDoneToday = false;

function renderAttendanceStatus() {
  const el = document.getElementById('attendance-status');
  if (!el) return;
  el.textContent = _attDoneToday ? '오늘은 출석을 완료했어요' : '아직 오늘 출석을 못했어요';
  el.classList.toggle('attendance-status--done', _attDoneToday);
}

function renderAttendanceMonth() {
  const el = document.getElementById('attendance-month');
  if (!el) return;
  const kstMonth = new Date(Date.now() + 9 * 3600000).getUTCMonth() + 1;
  el.textContent = kstMonth + '월 출석';
}

// 2026-09-01 개편(월 리셋+25 캡): 보충출석은 갭 상태에서만 뜨는 버튼이 아니라 항상
// 보이는 버튼 — 정규출석 안 한 날에 유저가 원할 때 씀. _attCanMakeup은 loadAttendanceState()가
// 계산(정규출석 이미 함/보충 이미 씀/이번 달 다 채움/보충권 소진 중 하나라도 걸리면 false).
let _attCanMakeup = false;

function renderAttendanceMakeup() {
  const btn = document.getElementById('attendance-makeup-btn');
  const countEl = document.getElementById('attendance-makeup-count');
  if (!btn) return;
  btn.disabled = !_attCanMakeup;
  if (countEl) countEl.textContent = _attState.makeup_left;
}

function showAttendanceFullModal() {
  document.getElementById('attendance-full-modal-overlay')?.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeAttendanceFullModal() {
  _playConfirmSfx();
  document.getElementById('attendance-full-modal-overlay')?.classList.add('hidden');
}

// 이미 떠있는 달력의 해당 칸에 직접 도장을 찍는다 — mission-session.js _msRunStampFlow()와
// 동일 CSS(.acc-cell--done/.acc-stamp/.acc-cell--animate, stamp-press 키프레임)·타이밍
// (STAMP_ANIM_MS=1100ms, STAMP_IMPACT_OFFSET_MS=700ms) 재사용. 모달 없이 그 자리에서 연출.
function _attAnimateStamp(day) {
  return new Promise(resolve => {
    const grid = document.getElementById('attendance-cal-grid');
    const cell = grid?.querySelector(`.acc-cell[data-day="${day}"]`);
    if (!cell || cell.classList.contains('acc-cell--done')) { resolve(); return; }
    cell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    cell.classList.add('acc-cell--done');
    const stamp = document.createElement('span');
    stamp.className = 'acc-stamp';
    stamp.innerHTML = '<i data-lucide="guitar"></i>';
    cell.appendChild(stamp);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    cell.classList.add('acc-cell--animate');
    if (typeof _playSfx === 'function') setTimeout(() => _playSfx('stamp.mp3'), STAMP_IMPACT_OFFSET_MS);
    setTimeout(resolve, STAMP_ANIM_MS);
  });
}

// 보충출석 클릭 → shared.js makeupAttendance() 실행 후 그 자리에서 도장 연출, 재렌더.
// 마일스톤(피크상자) 획득 팝업은 shared.js makeupAttendance()가 자체 딜레이로 이미 띄워준다.
// 정규출석과 별개 트랙이라(같은 날 정규출석 여부는 안 건드림) 성공해도 _attDoneToday는 안 바꾼다.
async function attendanceMakeupClick() {
  const btn = document.getElementById('attendance-makeup-btn');
  if (btn) btn.disabled = true;
  const res = await makeupAttendance();
  if (!res || !res.ok) {
    if (res && res.reason === 'full') showAttendanceFullModal();
    renderAttendanceMakeup(); // 실패해도 btn.disabled는 _attCanMakeup 기준으로 다시 계산
    return;
  }

  _playConfirmSfx();
  await _attAnimateStamp(res.day);
  const state = await loadAttendanceState(); // canMakeup 등 최신 상태 재조회
  _attDoneToday = state.doneToday;
  _attCanMakeup = state.canMakeup;
  renderAttendanceStatus();
  renderAttendanceMakeup();
}

function renderAttendanceCalendar() {
  const grid = document.getElementById('attendance-cal-grid');
  if (!grid) return;

  const stamped = _attState.day;
  const today = _attDoneToday ? stamped : Math.min(stamped + 1, ATTENDANCE_TOTAL_DAYS); // 오늘 칸
  const boxSvg = '<img src="image/gift.png" class="acc-box-icon" alt="">';

  let html = '';
  for (let d = 1; d <= ATTENDANCE_TOTAL_DAYS; d++) {
    const done      = d <= stamped;
    const milestone = ATTENDANCE_MILESTONES[d];
    const cls = ['acc-cell'];
    if (done) cls.push('acc-cell--done');
    if (milestone) cls.push('acc-cell--milestone');
    if (d === today) cls.push('acc-cell--today');
    const base = milestone
      ? boxSvg + '<span class="acc-box-count">' + milestone + '</span>'
      : '<span class="acc-day-num">' + d + '</span>';
    const inner = base + (done ? '<span class="acc-stamp"><i data-lucide="guitar"></i></span>' : '');
    html += '<div class="' + cls.join(' ') + '" data-day="' + d + '">' + inner + '</div>';
  }
  grid.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const todayEl = grid.querySelector('.acc-cell--today');
  if (todayEl) {
    requestAnimationFrame(() => {
      const target = todayEl.offsetLeft - (grid.clientWidth / 2) + (todayEl.offsetWidth / 2);
      grid.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
    });
  }

  initGridMouseDrag(grid);
}

// 상단 그라데이션이 .attendance-cta-row 지점에서 정확히 끝나도록 실측 offsetTop을 CSS 변수로 전달
function positionAttendanceGradient() {
  const scroll = document.querySelector('.attendance-scroll');
  const cta = document.querySelector('.attendance-cta-row');
  if (!scroll || !cta) return;
  scroll.style.setProperty('--attendance-gradient-end', cta.offsetTop + 'px');
}

// .attendance-cta-row 하단 ~ .attendance-month 상단, 실측 offsetTop 기준 정중앙에 아이콘 배치
function positionAttendanceCalIcon() {
  const icon = document.querySelector('.attendance-cal-icon');
  const cta = document.querySelector('.attendance-cta-row');
  const month = document.getElementById('attendance-month');
  if (!icon || !cta || !month) return;
  const ctaBottom = cta.offsetTop + cta.offsetHeight;
  const monthTop = month.offsetTop;
  const mid = (ctaBottom + monthTop) / 2;
  icon.style.top = (mid - icon.offsetHeight / 2) + 'px';
}

// 데스크탑 마우스 드래그로도 가로스크롤 가능하게 (터치는 overflow-x:auto가 기본 처리)
function initGridMouseDrag(grid) {
  if (grid._dragInit) return;
  grid._dragInit = true;
  let dragging = false, startX = 0, startScroll = 0;

  grid.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    startX = e.clientX;
    startScroll = grid.scrollLeft;
    grid.classList.add('attend-cal-grid--dragging');
  });
  grid.addEventListener('pointermove', e => {
    if (!dragging) return;
    grid.scrollLeft = startScroll - (e.clientX - startX);
  });
  const endDrag = () => { dragging = false; grid.classList.remove('attend-cal-grid--dragging'); };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointerleave', endDrag);
}

// ── DOMContentLoaded ─────────────────────────────────────────
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

  renderAttendanceMonth();
  renderAttendanceCta();
  positionAttendanceCalIcon();
  positionAttendanceGradient();

  const state = await loadAttendanceState();
  _attDoneToday = state.doneToday;
  _attCanMakeup = state.canMakeup;
  renderAttendanceCalendar();
  renderAttendanceStatus();
  renderAttendanceMakeup();
  // 달력이 실제 도장 수로 새로 그려지면서 폭이 바뀔 수 있어 위치 재계산
  positionAttendanceCalIcon();
  positionAttendanceGradient();

  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      positionAttendanceCalIcon();
      positionAttendanceGradient();
    }, 150);
  });
});
