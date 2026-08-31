// ═══════════════════════════════════════════════════════════════
// scale-block-preview.js — 스케일 블럭 미리보기(모양만) 렌더 모듈
// scale-level.js의 프렛보드 렌더링(.fb-string/.fb-dot/.fb-note 등, style.css 재사용)을
// 비인터랙티브·좁은카드용으로 축소한 버전. 실제 절대 프렛 위치는 의미 없음(움직이는 폼) —
// 블럭 grid 자체가 이미 5프렛 이내로 만들어져 있어 col을 그대로 로컬 프렛으로 사용.
// 의존: scale-data.js(ScaleData, TOTAL_FRETS는 미사용) — 반드시 먼저 로드
// ═══════════════════════════════════════════════════════════════

const ScaleBlockPreview = (() => {
  const STRINGS = 6;
  const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];

  // ── 넥 뼈대(줄 선 + 프렛 세로선)만 공통으로 그리는 헬퍼 ──
  function _drawNeckGrid(neckEl, numCols) {
    for (let s = 0; s < STRINGS; s++) {
      const topPct = (s + 0.5) / STRINGS * 100;
      const el = document.createElement('div');
      el.className = 'fb-string';
      el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px;`;
      neckEl.appendChild(el);
    }
    for (let col = 1; col < numCols; col++) {
      const leftPct = col / numCols * 100;
      const el = document.createElement('div');
      el.className = 'fb-fret-line';
      el.style.left = `${leftPct}%`;
      neckEl.appendChild(el);
    }
  }

  // container: 카드 안의 빈 wrapper 엘리먼트. block: SCALE_BLOCKS[key][i]
  // .scale-card-shot(--cs/zoom 기반) 시스템은 scale-level.html 전용 vh예산 계산에 묶여있어
  // 재사용 시 neck 높이가 0으로 무너지는 버그가 남 — 대신 우리 카드 폭 기준 고정 --fbu만 계산
  function render(container, block) {
    if (!container || !block) return;
    container.classList.add('ms-scale-block-preview', 'degrees-on');
    const formName = (block.label || '').split(' ').pop(); // "마이너 펜타토닉 스케일 Gm폼" → "Gm폼"
    container.innerHTML = `
      <span class="ms-scale-card-form-name">${formName}</span>
      <div class="fb-full-neck"></div>
      <div class="fb-full-nums"></div>
    `;
    const neckEl = container.querySelector('.fb-full-neck');

    // 카드 실제 폭 기준으로 --fbu 산출 — .fb-full-neck 높이는 base 규칙(calc(160*var(--fbu)))이라
    // fbu = w/320 으로 잡으면 neck 높이 ≈ 폭의 절반(가로로 넓은 프렛보드 비율) 정도가 됨.
    // .fb-dot/.fb-note/.fb-fret-num도 전부 이 값의 배수라 카드 크기에 비례해서 같이 커짐
    const w = container.offsetWidth || 140;
    container.style.setProperty('--fbu', (w / 320) + 'px');

    const parsed = ScaleData.parseGrid(block.grid);
    // 블럭마다 grid상의 실제 시작 열(minCol)이 다름(예: Cm폼은 col1~5, Em폼은 col2~5) —
    // minCol만큼 왼쪽으로 당겨서 5칸 창(0~4) 안에 항상 맞춤(실측: 전 블럭 중 최대 span=5)
    const cols   = parsed.notes.map(n => n.col);
    const minCol = cols.length ? Math.min(...cols) : 0;
    const numCols = 5;

    _drawNeckGrid(neckEl, numCols);

    // ── 노트 점 (클릭 없음 — 비인터랙티브) ──
    parsed.notes.forEach(note => {
      const leftPct = (note.col - minCol + 0.5) / numCols * 100;
      const topPct  = (note.s + 0.5) / STRINGS * 100;
      const isRoot  = note.degree === 1;

      const el = document.createElement('div');
      el.className = 'fb-note' + (isRoot ? ' fb-note--root' : '');
      el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
      neckEl.appendChild(el);
    });
  }

  // 문제풀이용 — 노트 없이 빈 넥만 크게. numCols 기본 7(표준 프렛뷰)
  // scale-level.html 테스트 오버레이의 넥 비율 공식(--fb-ratio:2.3, --fb-neck-h 산출식)을
  // 그대로 가져오되, vh예산/--cs 체인 대신 컨테이너 실측 폭(절대 px)으로 직접 계산
  function renderBlank(container, { numCols = 7 } = {}) {
    if (!container) return;
    container.classList.add('ms-scale-block-preview');
    container.innerHTML = `
      <div class="fb-full-neck"></div>
      <div class="fb-full-nums"></div>
    `;
    const neckEl = container.querySelector('.fb-full-neck');
    const w = container.offsetWidth || 140;
    const FB_RATIO = 2.3; // scale-level.html --fb-ratio와 동일
    const fbSpan  = w / FB_RATIO;
    const neckH   = (fbSpan - 2.25) * 6 / 5; // --fb-neck-h 공식 그대로
    const fbu     = neckH / 160;
    container.style.setProperty('--fbu', fbu + 'px');
    _drawNeckGrid(neckEl, numCols);
  }

  return { render, renderBlank };
})();
