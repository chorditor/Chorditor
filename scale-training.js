// ═══════════════════════════════════════════════════════════════
// scale-training.js — 스케일 훈련 페이지
// ═══════════════════════════════════════════════════════════════

// ── 페이지 닫기 (훈련소로 복귀) ─────────────────────────────
function closeScaleTraining() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// ── 스케일 아이템 탭 ─────────────────────────────────────────
function onScaleItemTap(el) {
  const key = el.dataset.key;
  analytics.track('scale_item_tapped', { key });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = `scale-level.html?key=${key}`; }, 260);
  } else {
    location.href = `scale-level.html?key=${key}`;
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('scale_training_viewed', {});
});
