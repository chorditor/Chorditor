// ═══════════════════════════════════════════════════════════════
// episode.js — 에피소드 상세 (노선도 + 정보 카드)
// 현재: 정적 디자인만. 기능 미구현.
// ═══════════════════════════════════════════════════════════════

// 드래그(스크롤)와 탭 구분
let _epDragged = false;
let _epAutoScroll = false;     // 프로그램 스크롤은 드래그로 치지 않음
let _epAutoTimer = null;

// ── active 설정 + 카드 갱신 (스크롤 없음) ────────────────────
let _epActiveEl = null;
function _epSetActive(el) {
  if (!el || el === _epActiveEl) return;
  if (_epActiveEl) _epActiveEl.classList.remove('ep-stop--active');
  el.classList.add('ep-stop--active');
  _epActiveEl = el;

  // 카드 갱신: Ch 타이틀은 항상, 세부 단계는 선택에 따라
  const k = document.getElementById('ep-info-kicker');
  const t = document.getElementById('ep-info-title');
  const s = document.getElementById('ep-info-step');
  if (k) k.textContent = el.dataset.kicker || '';
  if (t) t.textContent = el.dataset.chapter || '';
  if (s) s.textContent = el.dataset.title || '';
}

// stop을 뷰포트 중앙으로 (rect 기반 → 패딩 영향 없음)
function _epCenterStop(el, smooth) {
  const scroller = document.getElementById('ep-line-scroll');
  if (!scroller || !el) return;
  const vc = scroller.getBoundingClientRect();
  const r  = el.getBoundingClientRect();
  const delta = (r.left + r.width / 2) - (vc.left + vc.width / 2);
  _epAutoScroll = true;
  scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior: smooth ? 'smooth' : 'auto' });
  clearTimeout(_epAutoTimer);
  _epAutoTimer = setTimeout(() => { _epAutoScroll = false; }, smooth ? 450 : 80);
}

// 탭 → active + 중앙으로 부드럽게 슬라이드
function selectStop(el) {
  if (_epDragged) return;
  _epSetActive(el);
  _epCenterStop(el, true);
}

// 뷰포트 중앙에 가장 가까운 stop (rect 기반)
function _epNearestStop() {
  const scroller = document.getElementById('ep-line-scroll');
  if (!scroller) return null;
  const vc = scroller.getBoundingClientRect();
  const viewportCenter = vc.left + vc.width / 2;
  let best = null, bestDist = Infinity;
  document.querySelectorAll('.ep-stop').forEach(s => {
    const r = s.getBoundingClientRect();
    const c = r.left + r.width / 2;
    const d = Math.abs(c - viewportCenter);
    if (d < bestDist) { bestDist = d; best = s; }
  });
  return best;
}

// 레슨 열기 (현재 Ch.1 세부1만 구현)
function openLesson() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'lesson.html'; }, 260);
  } else {
    location.href = 'lesson.html';
  }
}

function closeEpisode() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'guitar-journey.html'; }, 260);
  } else {
    location.href = 'guitar-journey.html';
  }
}

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

  // 노선도 드래그/탭 구분
  _epActiveEl = document.querySelector('.ep-stop--active');

  const scroller = document.getElementById('ep-line-scroll');
  if (scroller) {
    // 양끝 stop도 중앙에 올 수 있도록 좌우에 뷰포트 절반 여백 확보
    const pad = Math.round(scroller.clientWidth / 2);
    scroller.style.paddingLeft  = pad + 'px';
    scroller.style.paddingRight = pad + 'px';
    // 기본 active를 중앙으로 (즉시)
    requestAnimationFrame(() => _epCenterStop(_epActiveEl, false));

    scroller.addEventListener('pointerdown', () => { _epDragged = false; });
    // 드래그 중 실시간: 중앙에 닿는 stop이 즉시 선택+확대 (rAF 스로틀)
    let raf = null;
    scroller.addEventListener('scroll', () => {
      if (!_epAutoScroll) _epDragged = true;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const s = _epNearestStop();
        if (s) _epSetActive(s);
        raf = null;
      });
    });
  }
});
