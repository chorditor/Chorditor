// ═══════════════════════════════════════════════════════════════
// guitar-journey.js — 나의 기타 여정 (에피소드 형식)
// ═══════════════════════════════════════════════════════════════

const GJ_INTRO_SEEN_KEY = 'chorditor_journey_intro_seen';

const GJ_PERSONA_LABEL = {
  unboxing:    '언박싱 1일차',
  beginner:    '굳은살 비기너',
  sheet_reader:'악보의존자',
  home_master: '방구석 기타마스터',
};

// ── 페이지 닫기 (홈으로 복귀) ────────────────────────────────
function closeJourneyPage() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

// 스와이프와 탭 구분용 플래그
let _gjDragged = false;

// ── 에피소드 카드 탭 ─────────────────────────────────────────
function onEpisodeTap(ep) {
  if (_gjDragged) return;       // 스와이프 중이면 탭 무시
  analytics.track('journey_episode_tapped', { ep });
  if (ep === 1) {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.add('project-exit');
      setTimeout(() => { location.href = 'episode.html'; }, 260);
    } else {
      location.href = 'episode.html';
    }
    return;
  }
  // TODO: EP2~ 상세 페이지 (미구현)
  console.log('episode tap:', ep);
}

// ── 캐러셀: 중앙 카드 활성화 + dots ──────────────────────────
function _gjInitCarousel() {
  const carousel = document.getElementById('gj-carousel');
  const dotsWrap = document.getElementById('gj-dots');
  if (!carousel) return;
  const cards = Array.from(carousel.querySelectorAll('.gj-ep-card'));
  if (!cards.length) return;

  // dots 생성
  if (dotsWrap && !dotsWrap.children.length) {
    cards.forEach(() => {
      const d = document.createElement('div');
      d.className = 'gj-dot';
      dotsWrap.appendChild(d);
    });
  }
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

  // 중앙에 가장 가까운 카드 → active
  function updateActive() {
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    cards.forEach((c, i) => {
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(cc - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    cards.forEach((c, i) => c.classList.toggle('gj-ep-card--active', i === best));
    dots.forEach((d, i) => d.classList.toggle('gj-dot--active', i === best));
  }

  let raf = null;
  carousel.addEventListener('scroll', () => {
    _gjDragged = true;          // 스크롤 발생 = 스와이프 → 탭 무시
    if (raf) return;
    raf = requestAnimationFrame(() => { updateActive(); raf = null; });
  });

  // 탭 시작 시 플래그 초기화 (스크롤 없으면 false 유지 → 탭 인정)
  carousel.addEventListener('pointerdown', () => { _gjDragged = false; });

  updateActive();
}

// ── 에피소드 선택 뷰 노출 ────────────────────────────────────
function _gjRevealEpisodes() {
  const topbar   = document.getElementById('gj-topbar');
  const episodes = document.getElementById('gj-episodes');
  if (topbar)   topbar.classList.add('show');
  if (episodes) episodes.classList.add('show');
  // 레이아웃 확정 후 캐러셀 초기화
  requestAnimationFrame(() => _gjInitCarousel());
}

// ── 인트로 시퀀스 (첫 접속만) ────────────────────────────────
function _gjRunIntro(persona) {
  const line1 = document.getElementById('gj-intro-line1');
  const line2 = document.getElementById('gj-intro-line2');
  const intro = document.getElementById('gj-intro');

  // 페르소나별 EP 개방 안내 문구
  const label = GJ_PERSONA_LABEL[persona];
  if (label) {
    line2.innerHTML = `당신은 <b>${label}</b>이군요!<br>그렇다면 EP1부터 에피소드를 열어드릴게요.`;
  } else {
    line2.innerHTML = `기타 여정을 시작할 준비가 되셨군요!<br>EP1부터 에피소드를 열어드릴게요.`;
  }

  // Phase 1: 첫 문구 슬라이드업
  setTimeout(() => { line1.classList.add('show'); }, 300);

  // Phase 1 → 퇴장
  setTimeout(() => { line1.classList.add('hide'); }, 2400);

  // Phase 2: 페르소나 문구 슬라이드업
  setTimeout(() => { line2.classList.add('show'); }, 2900);

  // Phase 2 → 퇴장 + 에피소드 전환
  setTimeout(() => {
    line2.classList.add('hide');
    if (intro) intro.classList.add('gj-intro-out');
  }, 5400);

  setTimeout(() => {
    if (intro) intro.style.display = 'none';
    _gjRevealEpisodes();
    localStorage.setItem(GJ_INTRO_SEEN_KEY, '1');
  }, 5900);
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

  analytics.track('journey_page_viewed', {});

  const persona = (typeof getCachedPersona === 'function') ? getCachedPersona() : null;
  const seen    = localStorage.getItem(GJ_INTRO_SEEN_KEY);

  if (seen) {
    // 재접속: 인트로 스킵 → 에피소드 선택 바로 노출 (진입 전환)
    const intro = document.getElementById('gj-intro');
    if (intro) intro.style.display = 'none';
    requestAnimationFrame(() => _gjRevealEpisodes());
  } else {
    // 첫 접속: 인트로 풀시퀀스
    _gjRunIntro(persona);
  }
});
