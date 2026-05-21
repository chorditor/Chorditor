// ═══════════════════════════════════════════════════════════════
// training.js — 훈련소 페이지
// ═══════════════════════════════════════════════════════════════

// ── 훈련소 닫기 (홈으로 복귀) ────────────────────────────────
function closeTrainingPage() {
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
  console.log('training:', key);
}

// ── 훈련 시간 포맷 ───────────────────────────────────────────
function formatTrainingTime(min) {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min.toFixed(1)}분`;
  return `${(min / 60).toFixed(1)}시간`;
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
  if (streakEl) streakEl.textContent = stats.streak            ?? 0;
  if (timeEl)   timeEl.textContent   = formatTrainingTime(stats.training_time_min);
  if (totalEl)  totalEl.textContent  = stats.total_completed   ?? 0;
}

// ── 훈련 통계 DB 동기화 (하루 경과 시 플러시) ─────────────────
async function flushTrainingStatsToDB() {
  const stats = JSON.parse(localStorage.getItem('training_stats') || 'null');
  if (!stats) return;

  const today = new Date().toISOString().slice(0, 10);
  if ((stats._last_synced_date || '') >= today) return; // 오늘 이미 동기화됨

  // auth 정보
  let accessToken = null, userId = null;
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken  = parsed?.access_token ?? null;
      userId       = parsed?.user?.id     ?? null;
    }
  } catch (_) {}
  if (!accessToken || !userId) return; // 비로그인이면 다음 기회에

  const overview = {
    streak:            stats.streak            || 0,
    training_time_min: stats.training_time_min || 0,
    total_completed:   stats.total_completed   || 0,
    synced_date:       today,
  };

  try {
    // 기존 stats row 읽기 (JSONB 병합 목적)
    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_training_stats?user_id=eq.${userId}&select=stats`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${accessToken}` } }
    );
    let existingStats = {};
    if (getResp.ok) {
      const rows = await getResp.json();
      if (rows.length > 0) existingStats = rows[0].stats || {};
    }

    // training_overview 키만 덮어쓰고 upsert
    const merged = { ...existingStats, training_overview: overview };
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/user_training_stats`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer':        'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id:    userId,
        stats:      merged,
        updated_at: new Date().toISOString(),
      }),
    });

    if (upsertResp.ok) {
      stats._last_synced_date = today;
      localStorage.setItem('training_stats', JSON.stringify(stats));
      console.log('[Training] 통계 DB 동기화 완료');
    } else {
      console.warn('[Training] 통계 동기화 실패:', upsertResp.status);
    }
  } catch (err) {
    console.warn('[Training] 통계 동기화 오류 (다음 실행 시 재시도):', err.message);
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

  loadTrainingStats();
  flushTrainingStatsToDB(); // 전일 이전 통계 DB 동기화 (백그라운드)

  // 훈련소 진입 이벤트
  const _stats = JSON.parse(localStorage.getItem('training_stats') || 'null');
  analytics.track('training_page_viewed', {
    streak:            _stats?.streak            ?? 0,
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
      if (!_moved) onTrainingCardTap(card.dataset.key);
    });
  });
});
