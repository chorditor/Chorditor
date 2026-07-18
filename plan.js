// ═══════════════════════════════════════════════════════════════
// plan.js — 요금제 페이지(plan.html) 전용 초기화
// purchasePlan / restorePurchases 등 결제 함수는 shared.js에 위치
// ═══════════════════════════════════════════════════════════════

// ── 뒤로가기 ─────────────────────────────────────────────────
function goBack() {
  _playTap();
  const back = new URLSearchParams(location.search).get('back');
  if (back) {
    location.href = back;
  } else {
    history.back();
  }
}

// ── 페이지 초기화 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initBilling();

  const plan = getPlan();
  const isNative = window.Capacitor?.isNativePlatform();
  analytics.track('plan_page_viewed', { current_plan: plan });

  // 현재 플랜 버튼 상태
  ['pro'].forEach(p => {
    const btn = document.getElementById('plan-btn-' + p);
    if (!btn) return;
    if (p === plan) {
      btn.textContent = '현재 플랜';
      btn.disabled = true;
      btn.onclick = null;
    } else {
      btn.disabled = false;
      if (isNative) {
        btn.textContent = '구독하기';
        btn.onclick = () => purchasePlan(p);
      } else {
        btn.textContent = '앱에서 구독';
        btn.onclick = () => alert('구독은 Android 앱에서 가능합니다.\nGoogle Play에서 Chorditor를 다운로드하세요.');
      }
    }
  });

  // Android에서만 복원/FAQ 버튼 표시
  const restoreBtn = document.getElementById('plan-restore-btn');
  if (restoreBtn) restoreBtn.style.display = isNative ? '' : 'none';
  const faqBtn = document.getElementById('plan-faq-btn');
  if (faqBtn) faqBtn.style.display = isNative ? '' : 'none';

  lucide.createIcons();

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
});
