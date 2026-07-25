// ═══════════════════════════════════════════════════════════════
// training.js — 훈련소 페이지
// ═══════════════════════════════════════════════════════════════

// ── 훈련소 닫기 (홈으로 복귀) ────────────────────────────────
function closeTrainingPage() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

// ── 훈련 카드 탭 ────────────────────────────────────────────
function onTrainingCardTap(key) {
  analytics.track('training_card_tapped', { key });
  if (key === 'chord-name') {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'chord-name-quiz.html'; }, 260);
    } else {
      location.href = 'chord-name-quiz.html';
    }
    return;
  }
  if (key === 'scale') {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'scale-training.html'; }, 260);
    } else {
      location.href = 'scale-training.html';
    }
    return;
  }
  if (key === 'progression') {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'progression.html'; }, 260);
    } else {
      location.href = 'progression.html';
    }
    return;
  }
  if (key === 'strumming') {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'strumming.html'; }, 260);
    } else {
      location.href = 'strumming.html';
    }
    return;
  }
  if (key === 'reharmony') {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'chord-combo.html'; }, 260);
    } else {
      location.href = 'chord-combo.html';
    }
    return;
  }
  console.log('training:', key);
}

// ── 훈련 시간 포맷 ───────────────────────────────────────────
function formatTrainingTime(min) {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min.toFixed(1)}<span class="stat-unit"> 분</span>`;
  return `${(min / 60).toFixed(1)}<span class="stat-unit"> 시간</span>`;
}

// ── 통계 로드 ────────────────────────────────────────────────
function loadTrainingStats() {
  const stats    = JSON.parse(localStorage.getItem('training_stats') || 'null');
  const streakEl = document.getElementById('stat-streak');
  const timeEl   = document.getElementById('stat-time');
  const totalEl  = document.getElementById('stat-total');

  if (!stats) {
    if (streakEl) streakEl.textContent = '0';
    if (timeEl)   timeEl.textContent   = '—';
    if (totalEl)  totalEl.textContent  = '0';
    return;
  }
  if (streakEl) streakEl.textContent = effectiveStreak(stats);
  if (timeEl)   timeEl.innerHTML     = formatTrainingTime(stats.training_time_min);
  if (totalEl)  totalEl.textContent  = stats.total_completed   ?? 0;
}

// flushTrainingStatsToDB → shared.js의 syncTrainingStatsToDB()로 통합됨

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

  // DB→localStorage 복원 후 UI 갱신 (앱 재설치 시 데이터 복구)
  restoreTrainingStatsFromDB().then(() => {
    loadTrainingStats();
    syncTrainingStatsToDB();
  });

  // 퀴즈 레벨 통계 복원
  if (typeof restoreQuizLevelStatsFromDB === 'function') restoreQuizLevelStatsFromDB();

  // 훈련소 진입 이벤트
  const _stats = JSON.parse(localStorage.getItem('training_stats') || 'null');
  analytics.track('training_page_viewed', {
    streak:            effectiveStreak(_stats),
    total_completed:   _stats?.total_completed   ?? 0,
    training_time_min: _stats?.training_time_min ?? 0,
  });

  // 훈련 카드 터치 이벤트 (slop 8px 이내만 탭으로 인정)
  document.querySelectorAll('.training-card:not(.training-card--soon)').forEach(card => {
    let _startX = 0, _startY = 0, _moved = false;

    card.addEventListener('pointerdown', e => {
      _startX = e.clientX;
      _startY = e.clientY;
      _moved  = false;
    });

    card.addEventListener('pointermove', e => {
      if (Math.abs(e.clientX - _startX) > 8 || Math.abs(e.clientY - _startY) > 8) {
        _moved = true;
      }
    });

    card.addEventListener('pointerup', () => {
      if (!_moved) { _playTap(); onTrainingCardTap(card.dataset.key); }
    });
  });
});
