// ═══════════════════════════════════════════════════════════════
// plan.js — 요금제 페이지 전용 스크립트
// shared.js의 getPlan, setPlan, purchasePlan 유틸 사용
// ═══════════════════════════════════════════════════════════════

// ── 뒤로가기 ─────────────────────────────────────────────────
function goBack() {
  const back = new URLSearchParams(location.search).get('back');
  if (back) {
    location.href = back;
  } else {
    history.back();
  }
}

// ── 결제 계정 확인 모달 ────────────────────────────────────────
let _purchaseConfirmResolve = null;

function showPurchaseConfirm() {
  return new Promise(resolve => {
    _purchaseConfirmResolve = resolve;
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      const email = stored ? (JSON.parse(stored)?.user?.email ?? '') : '';
      const emailEl = document.getElementById('purchase-confirm-email');
      if (emailEl) emailEl.textContent = email || '(이메일 없음)';
    } catch(e) {}
    document.getElementById('purchase-confirm-modal')?.classList.remove('hidden');
  });
}

function closePurchaseConfirm(confirmed) {
  document.getElementById('purchase-confirm-modal')?.classList.add('hidden');
  if (_purchaseConfirmResolve) { _purchaseConfirmResolve(!!confirmed); _purchaseConfirmResolve = null; }
}

// ── 결제 FAQ 모달 ─────────────────────────────────────────────
function openBillingFaq() {
  document.getElementById('billing-faq-modal')?.classList.remove('hidden');
  lucide.createIcons();
}

function closeBillingFaq() {
  document.getElementById('billing-faq-modal')?.classList.add('hidden');
}

// ── 구독 구매 ─────────────────────────────────────────────────
async function purchasePlan(planId) {
  if (!window._RC) {
    alert('결제 초기화 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const confirmed = await showPurchaseConfirm();
  if (!confirmed) return;

  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      if (session.user?.id) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
    }
  } catch(e) {}

  const productId = planId === 'pro' ? PRODUCT_PRO : PRODUCT_STANDARD;
  try {
    const offeringsResult = await window._RC.getOfferings();
    const offerings = offeringsResult?.offerings ?? offeringsResult;
    const current = offerings?.current ?? null;
    if (!current) throw new Error('상품 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');

    const pkg = current.availablePackages.find(p =>
      p.identifier === productId || p.product?.identifier?.includes(productId)
    );
    if (!pkg) throw new Error('상품을 찾을 수 없습니다: ' + productId);

    const purchaseParams = { aPackage: pkg };
    try {
      const { customerInfo: currentInfo } = await window._RC.getCustomerInfo();
      const activeSubs = currentInfo?.activeSubscriptions || [];
      if (activeSubs.length > 0) {
        purchaseParams.upgradeInfo = { oldSKU: activeSubs[0], prorationMode: 1 };
      }
    } catch(e) {}

    const { customerInfo } = await window._RC.purchasePackage(purchaseParams);

    const active = customerInfo?.entitlements?.active || {};
    const newPlan = active[ENTITLEMENT_PRO] ? 'pro'
                  : active[ENTITLEMENT_STANDARD] ? 'standard'
                  : planId;
    setPlan(newPlan);
    await updateSupabasePlan(newPlan);

    analytics.track('plan_upgrade_completed', { to_plan: newPlan });
    history.back();
  } catch(e) {
    const msg = (e?.message || e?.code || '').toLowerCase();
    const isCancelled = msg.includes('cancel');
    analytics.track(isCancelled ? 'plan_upgrade_cancelled' : 'plan_upgrade_started', {
      to_plan: planId,
      error: isCancelled ? 'user_cancelled' : (e?.message || 'unknown'),
    });
    if (!isCancelled) {
      console.error('[Billing] purchasePlan 실패:', e);
      alert(e?.message || '결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
}

// ── 구매 복원 ─────────────────────────────────────────────────
async function restorePurchases() {
  if (!window._RC) {
    alert('인앱 결제를 사용할 수 없는 환경입니다.');
    return;
  }
  try {
    await window._RC.restorePurchases();
    await syncPlanFromBilling();
    analytics.track('purchase_restored', { plan: getPlan() });
    alert('구매 내역을 복원했습니다.');
  } catch(e) {
    console.error('[Billing] restorePurchases 실패:', e);
  }
}

// ── 페이지 초기화 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initBilling();

  const plan = getPlan();
  const isNative = window.Capacitor?.isNativePlatform();

  // 현재 플랜 버튼 상태
  ['standard', 'pro'].forEach(p => {
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
