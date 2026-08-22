// ═══════════════════════════════════════════════════════════════
// scale-training.js — 스케일 훈련 페이지
// ═══════════════════════════════════════════════════════════════

// ── 프리미엄 전역 스위치 (출시 직전 true로 변경) ─────────────
const PREMIUM_ENABLED = false;

// ── 페이지 닫기 (훈련소로 복귀) ─────────────────────────────
function closeScaleTraining() {
  _playTap();
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
  _playTap();
  const key   = el.dataset.key;
  const level = parseInt(el.dataset.level, 10);

  // 프리미엄 카드 + 무료 플랜 → 구독 모달
  if (PREMIUM_ENABLED && el.dataset.premium === '1' && getPlan() === 'free') {
    analytics.track('paywall_viewed', { trigger_source: 'scale_premium', current_plan: 'free', level });
    openPlanSheet('scale_premium');
    return;
  }

  analytics.track('scale_item_tapped', { scale_key: key, level });
  const shell = document.querySelector('.app-shell');
  const url = `scale-level.html?key=${key}&level=${level}`;
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = url; }, 260);
  } else {
    location.href = url;
  }
}

// ── 카드 도수 렌더링 (C키 기준, grid 도수에서 계산) ────────────
// grid 도수(1~7, b2~b7 = 음수)를 도수 라벨로 오름차순 표시.
const _CARD_MAJOR_SEMI = [0, 2, 4, 5, 7, 9, 11];  // 도수 1~7 반음 위치

// 도수(음수=플랫) → 루트 기준 반음(0~11)
function _cardDegreeSemitone(degree) {
  const idx  = (Math.abs(degree) - 1) % 7;
  const base = _CARD_MAJOR_SEMI[idx];
  return (base + (degree < 0 ? -1 : 0) + 12) % 12;
}

// 도수 라벨 (scale-level.js degreeLabel과 동일 — 디테일 페이지 표기 그대로).
// scaleKey별 재즈 표기: 얼터드 1 b9 #9 3 #11 b13 b7 등.
function _cardDegreeLabel(degree, scaleKey) {
  if (degree === -5 && scaleKey === 'lydian') return '#4';
  if (scaleKey === 'altered') {
    if (degree === -2) return 'b9';
    if (degree === -3) return '#9';
    if (degree === -5) return '#11';
    if (degree === -6) return 'b13';
  }
  // 프리지안 도미넌트 = 믹솔리디안 b9 b13 과 동일 음정 → 표기도 동일
  if (scaleKey === 'mixolydian-b9b13' || scaleKey === 'phrygian-dominant') {
    if (degree === -2) return 'b9';
    if (degree === 4)  return '11';
    if (degree === -6) return 'b13';
  }
  if (scaleKey === 'mixolydian-b13') {
    if (degree === 2)  return '9';
    if (degree === 4)  return '11';
    if (degree === -6) return 'b13';
  }
  if (scaleKey === 'lydian-dominant') {
    if (degree === 2)  return '9';
    if (degree === -5) return '#11';
    if (degree === 6)  return '13';
  }
  if (scaleKey === 'locrian-sharp2') {
    if (degree === 2)  return '9';
    if (degree === 4)  return '11';
    if (degree === -6) return 'b13';
  }
  if (scaleKey === 'locrian-sharp6') {
    if (degree === -2) return 'b9';
    if (degree === 4)  return '11';
    if (degree === 6)  return '13';
  }
  return degree < 0 ? 'b' + (-degree) : '' + degree;
}

// Ch.2 세컨더리 도미넌트 카드: 로마자 코드 진행 (세컨더리 도미넌트 → 해결 코드)
const SECONDARY_CARD_ROMAN = {
  'secondary-iv':  ['I7',   'IVM7'],
  'secondary-v':   ['II7',  'V7'],
  'secondary-ii':  ['III7', 'VIm7'],
  'secondary-vi':  ['VI7',  'IIm7'],
  'secondary-iii': ['VII7', 'IIIm7'],
};

function renderScaleCardNotes() {
  document.querySelectorAll('.scale-card-notes').forEach(slot => {
    const card = slot.closest('.scale-item-card');
    if (!card) return;

    // Ch.2: 로마자 코드 진행 표기
    const roman = SECONDARY_CARD_ROMAN[card.dataset.key];
    if (roman) {
      const [from, to] = roman;
      slot.innerHTML =
        `<span class="scale-card-note">${from}</span>` +
        `<span class="scale-card-note scale-card-note--arrow">→</span>` +
        `<span class="scale-card-note">${to}</span>`;
      return;
    }

    const blocks = ScaleData.getBlocks(card.dataset.key);
    if (!blocks.length) return;

    // 모든 폼에서 도수 수집 → 반음 위치별 대표 도수 1개
    const seen = new Map();  // semitone → degree
    blocks.forEach(b => {
      ScaleData.parseGrid(b.grid).notes.forEach(n => {
        const semi = _cardDegreeSemitone(n.degree);
        if (!seen.has(semi)) seen.set(semi, n.degree);
      });
    });

    const scaleKey = card.dataset.key;
    const ordered = [...seen.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
    slot.innerHTML = ordered
      .map(d => `<span class="scale-card-note">${_cardDegreeLabel(d, scaleKey)}</span>`)
      .join('');
  });
}

// ── 연습하기 버튼 → 레벨 진입 (피크 소모 없음, pop 사운드) ──────
function onScalePracticeTap(btn) {
  _playSfx('pop.mp3');
  const card  = btn.closest('.scale-item-card');
  if (!card) return;
  const key   = card.dataset.key;
  const level = parseInt(card.dataset.level, 10);

  // 복귀 시 이 위치(챕터+레벨)로 되돌아오도록 저장
  const chapterEl = card.closest('.scale-chapter[id^="ch-"]');
  const chapter = chapterEl ? parseInt(chapterEl.id.replace('ch-', ''), 10) : 1;
  try {
    sessionStorage.setItem('scaleReturnState', JSON.stringify({ chapter, level }));
  } catch (e) {}

  analytics.track('scale_item_tapped', { scale_key: key, level });
  const shell = document.querySelector('.app-shell');
  const url = `scale-level.html?key=${key}&level=${level}`;
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = url; }, 260);
  } else {
    location.href = url;
  }
}

// ── 챕터 탭: 클릭한 챕터만 표시, 나머지는 완전히 숨김 ───────────
function onChapterTabTap(el) {
  _playTap();
  const n = parseInt(el.dataset.chapter, 10);

  document.querySelectorAll('.st-node').forEach(node => {
    const nn = parseInt(node.dataset.chapter, 10);
    node.classList.toggle('active', nn === n);
    node.classList.toggle('done', nn < n);
  });

  document.querySelectorAll('.scale-chapter[id^="ch-"]').forEach(ch => {
    ch.classList.toggle('scale-chapter--hidden', ch.id !== `ch-${n}`);
  });

  document.querySelector('.scale-scroll').scrollTo({ top: 0, behavior: 'auto' });

  // 선택 챕터의 캐러셀: 중앙 카드 pop-in (통통 튀는 이징)
  const list = document.getElementById(`ch-${n}`)?.querySelector('.scale-item-list--carousel');
  if (list) {
    list.scrollLeft = 0;
    _updateCarouselScale(list);
    const first = list.querySelector('.scale-item-card');
    if (first) {
      first.classList.remove('scale-item-card--popin');
      void first.offsetWidth;   // 리플로우 강제 → 애니메이션 재시작
      first.classList.add('scale-item-card--popin');
      // 애니메이션 fill(both)이 inline transform을 덮어써 원근감 축소가 안 먹히는 문제 방지
      first.addEventListener('animationend', () => {
        first.classList.remove('scale-item-card--popin');
        _updateCarouselScale(list);
      }, { once: true });
    }
  }
}

// ── 캐러셀 원근감: 스냅 기준점(scroll-padding-left)에서 멀어질수록 카드 축소·흐려짐 ─────
const CAROUSEL_MIN_SCALE   = 0.88;
const CAROUSEL_MIN_OPACITY = 0.15;
const CAROUSEL_FALLOFF     = 0.6;  // 화면폭 대비 거리로 축소량 정규화

// CSS scroll-snap-align:start + scroll-padding-left(=--sc-offset, 그리드로 계산한 카드
// 시작 x좌표)가 실제 정렬 기준점 — 뷰포트/캐러셀 진짜 중앙(center)으로 하면
// 그리드 위치와 어긋나서(37px 등) 여기 원근감·스크롤 계산도 전부 이 기준으로 통일
function _snapAnchor(list) {
  return list.getBoundingClientRect().left + parseFloat(getComputedStyle(list).scrollPaddingLeft || 0);
}

function _updateCarouselScale(list) {
  const listRect = list.getBoundingClientRect();
  const anchor = _snapAnchor(list);
  let closestCard = null, closestDist = Infinity;
  list.querySelectorAll('.scale-item-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const dist = Math.abs(rect.left - anchor) / listRect.width;
    const scale = Math.max(CAROUSEL_MIN_SCALE, 1 - dist / CAROUSEL_FALLOFF * (1 - CAROUSEL_MIN_SCALE));
    const opacity = Math.max(CAROUSEL_MIN_OPACITY, 1 - dist / CAROUSEL_FALLOFF * (1 - CAROUSEL_MIN_OPACITY));
    card.style.transform = `scale(${scale})`;
    card.style.opacity = opacity;
    card.classList.remove('scale-item-card--selected');
    if (dist < closestDist) { closestDist = dist; closestCard = card; }
  });
  if (closestCard) closestCard.classList.add('scale-item-card--selected');
}

// 해당 카드를 스냅 기준점(scroll-padding-left)에 맞추는 스크롤 위치 계산
function _centerScrollLeft(list, card) {
  return card.offsetLeft - parseFloat(getComputedStyle(list).scrollPaddingLeft || 0);
}

// 현재 스크롤 위치에서 가장 가까운 카드로 스냅
function _snapToNearest(list) {
  let best = null, bestDist = Infinity;
  list.querySelectorAll('.scale-item-card').forEach(card => {
    const d = Math.abs(_centerScrollLeft(list, card) - list.scrollLeft);
    if (d < bestDist) { bestDist = d; best = card; }
  });
  if (best) list.scrollTo({ left: _centerScrollLeft(list, best), behavior: 'smooth' });
}

// 마우스 드래그 스크롤(데스크탑) — 터치는 브라우저 기본 스크롤이 처리
function _initCarouselDrag(list) {
  let dragging = false, moved = false, startX = 0, startLeft = 0, savedSnap = '';
  let suppressClickUntil = 0;

  list.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX;
    startLeft = list.scrollLeft;
  });

  list.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 3) {
      moved = true;
      savedSnap = list.style.scrollSnapType;
      list.style.scrollSnapType = 'none';   // 드래그 중엔 스냅이 방해되므로 해제
      list.classList.add('carousel--dragging');
      try { list.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (moved) {
      list.scrollLeft = startLeft - dx;
      e.preventDefault();
    }
  });

  const _endDrag = (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    dragging = false;
    if (!moved) return;
    list.classList.remove('carousel--dragging');
    suppressClickUntil = performance.now() + 80;  // 드래그 끝의 click이 카드 진입시키는 것 방지
    _snapToNearest(list);
    // 스냅 애니메이션이 끝난 뒤 원래 scroll-snap 복구(중간에 되돌리면 위치가 튄다)
    setTimeout(() => { list.style.scrollSnapType = savedSnap; }, 350);
  };
  list.addEventListener('pointerup', _endDrag);
  list.addEventListener('pointercancel', _endDrag);

  list.addEventListener('click', (ce) => {
    if (performance.now() < suppressClickUntil) { ce.stopPropagation(); ce.preventDefault(); }
  }, { capture: true });
}

function initCarousels() {
  document.querySelectorAll('.scale-item-list--carousel').forEach(list => {
    list.scrollLeft = 0;
    _updateCarouselScale(list);
    list.addEventListener('scroll', () => _updateCarouselScale(list), { passive: true });
    _initCarouselDrag(list);
  });
}

// ── 복귀 시 마지막 진입 위치(챕터+레벨) 복원 ──────────────────
function restoreLastPosition() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem('scaleReturnState')); } catch (e) {}
  if (!st || !st.chapter) return;
  const n = st.chapter;

  document.querySelectorAll('.st-node').forEach(node => {
    const nn = parseInt(node.dataset.chapter, 10);
    node.classList.toggle('active', nn === n);
    node.classList.toggle('done', nn < n);
  });
  document.querySelectorAll('.scale-chapter[id^="ch-"]').forEach(ch => {
    ch.classList.toggle('scale-chapter--hidden', ch.id !== `ch-${n}`);
  });

  const list = document.getElementById(`ch-${n}`)?.querySelector('.scale-item-list--carousel');
  if (list) {
    const card = list.querySelector(`.scale-item-card[data-level="${st.level}"]`);
    if (card) {
      // 해당 레벨 카드를 스냅 기준점(scroll-padding-left)에 맞춤
      list.scrollLeft = _centerScrollLeft(list, card);
    }
    _updateCarouselScale(list);
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // 뒤로가기+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  lucide.createIcons();

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  renderScaleCardNotes();
  initCarousels();
  restoreLastPosition();

  analytics.track('scale_training_viewed', {});
});
