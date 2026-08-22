// ═══════════════════════════════════════════════════════════════
// strumming.js — 주법 리듬 훈련 페이지
// ═══════════════════════════════════════════════════════════════

// ── 페이지 닫기 (훈련소로 복귀) ─────────────────────────────
function closeStrumming() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// ── 구분선 그룹 크기 계산 ────────────────────────────────────
// mainBeats = (분모==8) ? 분자/3 : 분자 / group = 칸수 / mainBeats
function strumGroupSize(beat, cells) {
  const [n, d] = String(beat).split('/').map(Number);
  if (!n || !d) return 0;
  const mainBeats = d === 8 ? n / 3 : n;
  const g = cells / mainBeats;
  return Number.isInteger(g) && g > 1 ? g : 0;
}

// ── 스트로크 문자열 결정 ─────────────────────────────────────
// strokes 명시 → 그대로(불규칙·생략 패턴용). 없으면 count+alt로 생성.
//   count : 칸 수
//   alt   : false=DU 반복 모션(기본) / true=DD 반복 모션(전부 D)
//   skip  : 생략(-)할 1-based 위치 배열 (선택)
function strumStrokeString(item) {
  if (item.strokes) return item.strokes.toUpperCase();
  const n = item.count || 0;
  const alt = item.alt === true;
  const skip = item.skip || [];
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6; // 분모8(12/8 등)=3연음 DDU / 6/8은 제외(DU 연속)
  let s = '';
  for (let i = 1; i <= n; i++) {
    if (skip.includes(i)) { s += '-'; continue; }
    if (triplet) s += (i - 1) % 3 === 2 ? 'U' : 'D';
    else s += alt ? 'D' : (i % 2 ? 'D' : 'U');
  }
  return s;
}

// ── 스트로크 1칸 HTML ────────────────────────────────────────
// ch: 'D'/'U'(소리냄) / '-'(헛스트로크=모션은 하나 소리 안냄)
// pos: 1-based 위치, alt: 모션 종류 → 헛스트로크 방향 결정
//   헛스트로크 방향 = 그 자리 모션 (alt=false면 DU 홀수D/짝수U, alt=true면 전부 D)
function strumCellHtml(ch, pos, alt, isCut, triplet) {
  let dir = ch; // 'D' | 'U'
  let ghost = false;
  if (ch === '-') {
    ghost = true;
    dir = triplet ? ((pos - 1) % 3 === 2 ? 'U' : 'D')
                  : (alt ? 'D' : (pos % 2 ? 'D' : 'U'));
  }
  const ghostCls = ghost ? ' strum-stroke--ghost' : '';
  let inner = '';
  if (dir === 'U') {
    inner = `<svg class="strum-stroke strum-stroke--up${ghostCls}" viewBox="0 0 10 10" fill="none"><path d="M1.5 1 L5 9 L8.5 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else if (dir === 'D') {
    inner = `<span class="strum-stroke strum-stroke--down${ghostCls}"></span>`;
  }
  // 컷팅: 셀 상단에 X 아이콘 (뮤트 스트로크)
  const cutHtml = isCut ? '<span class="strum-cut">✕</span>' : '';
  return `<div class="strum-beat-cell">${cutHtml}${inner}</div>`;
}

// ── 카드 1개 HTML ────────────────────────────────────────────
function strumCardHtml(item) {
  const strokes = strumStrokeString(item);
  const cells = strokes.length;
  const alt = item.alt === true;
  const cut = item.cut || [];
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6;
  const group = strumGroupSize(item.beat, cells);
  const gClass = group ? ` strum-beat-grid--g${group}` : '';

  // 16칸 초과 시 2행 분리
  const rows = cells > 12 ? 2 : 1;
  const rowSize = cells / rows;

  let gridsHtml = '';
  for (let r = 0; r < rows; r++) {
    const slice = strokes.slice(r * rowSize, (r + 1) * rowSize);
    let cellsHtml = '';
    for (let c = 0; c < slice.length; c++) {
      const pos = r * rowSize + c + 1; // 1-based 전체 위치
      cellsHtml += strumCellHtml(slice[c], pos, alt, cut.includes(pos), triplet);
    }
    gridsHtml += `<div class="strum-beat-grid${gClass}">${cellsHtml}</div>`;
  }

  return `
    <div class="strum-item" data-id="${item.id}">
      <span class="strum-item-badges">
        ${item.recommend ? '<span class="strum-item-badge strum-item-badge--rec">추천</span>' : ''}
        <span class="strum-item-badge strum-item-badge--lv${item.level}">Lv${item.level}</span>
      </span>
      <span class="strum-item-title">${item.title}</span>
      <span class="strum-item-desc">${item.desc}</span>
      ${gridsHtml}
      <i class="strum-item-arrow" data-lucide="chevron-right"></i>
    </div>`;
}

// ── 필터 ─────────────────────────────────────────────────────
// _strumFilter: null=전체 / 'rec'=추천 / 'lv1'~'lv5'=레벨
let _strumFilter = null;
const STRUM_FILTERS = [
  { key: 'rec', label: '추천' },
  { key: 'lv1', label: 'Lv1' },
  { key: 'lv2', label: 'Lv2' },
  { key: 'lv3', label: 'Lv3' },
  { key: 'lv4', label: 'Lv4' },
  { key: 'lv5', label: 'Lv5' },
];

function buildFilterBar() {
  const bar = document.querySelector('.strum-filter-bar');
  if (!bar) return;
  bar.innerHTML = STRUM_FILTERS.map((f) =>
    `<button class="strum-filter-tag strum-filter-tag--${f.key}" data-filter="${f.key}">${f.label}</button>`
  ).join('');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.strum-filter-tag');
    if (!btn) return;
    _playTap();
    const key = btn.dataset.filter;
    _strumFilter = (_strumFilter === key) ? null : key; // 같은 태그 재클릭 = 해제
    bar.querySelectorAll('.strum-filter-tag').forEach((b) =>
      b.classList.toggle('active', b.dataset.filter === _strumFilter));
    renderStrummingList();
  });
}

function strumFilterMatch(item) {
  if (!_strumFilter) return true;
  if (_strumFilter === 'rec') return item.recommend === true;
  const lv = parseInt(_strumFilter.slice(2), 10);
  return item.level === lv;
}

// ── 리스트 렌더 ──────────────────────────────────────────────
function renderStrummingList() {
  const list = document.getElementById('strum-list');
  if (!list || !window.STRUMMING_LIST) return;
  list.innerHTML = window.STRUMMING_LIST.filter(strumFilterMatch).map(strumCardHtml).join('');
  if (window.lucide) lucide.createIcons();
}

// ── 카드 진입 (연습 페이지로 이동) ───────────────────────────
function openStrumItem(id) {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = `strum-play.html?id=${id}`; }, 260);
  } else {
    location.href = `strum-play.html?id=${id}`;
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // 뒤로가기+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  buildFilterBar();
  renderStrummingList();

  // 카드 탭 → 연습 페이지 진입
  const list = document.getElementById('strum-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.strum-item');
      if (item) openStrumItem(Number(item.dataset.id));
    });
  }

  lucide.createIcons();

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('strumming_training_viewed', {});
});
