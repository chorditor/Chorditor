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

// ── 도장 달력 렌더 (디자인 전용 — DB/상태 조회 없이 목업 값으로 표시) ──
const ATTENDANCE_MOCK_DAY = 7;
const ATTENDANCE_MOCK_DONE_TODAY = false;

function renderAttendanceStatus() {
  const el = document.getElementById('attendance-status');
  if (!el) return;
  el.textContent = ATTENDANCE_MOCK_DONE_TODAY ? '오늘은 출석을 완료했어요' : '아직 오늘 출석을 못했어요';
  el.classList.toggle('attendance-status--done', ATTENDANCE_MOCK_DONE_TODAY);
}

function renderAttendanceMonth() {
  const el = document.getElementById('attendance-month');
  if (!el) return;
  const kstMonth = new Date(Date.now() + 9 * 3600000).getUTCMonth() + 1;
  el.textContent = kstMonth + '월 출석';
}

function renderAttendanceCalendar() {
  const grid = document.getElementById('attendance-cal-grid');
  if (!grid) return;

  const stamped = ATTENDANCE_MOCK_DAY;
  const today = Math.min(stamped + 1, ATTENDANCE_TOTAL_DAYS); // 오늘 찍어야 할 날짜
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
document.addEventListener('DOMContentLoaded', () => {

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
  renderAttendanceCalendar();
  renderAttendanceStatus();
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
