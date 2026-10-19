// ═══════════════════════════════════════════════════════════════
// journey.js — 나의 기타 여정 (경로 화면) — UI 껍데기
// 6줄 사인파 곡선 + 교차점 노드(눕힌 디스크, 안에 순번 숫자 — journey-numbers.js)만 그린다. 기능(클릭·진행 상태·훈련 연결)은 아직 없음.
// 노드 x/y와 줄 곡선은 같은 사인 함수로 계산한다.
// ═══════════════════════════════════════════════════════════════

const JNY_COUNT = 9;      // 노드 수
const JNY_N = 4;          // 반 파장당 노드 수
const JNY_S = 96;         // 노드 간격(px)
const JNY_Y0 = 40;        // 첫 노드 y (헤더 카드 아래부터의 값)
const JNY_REF_W = 360;
const JNY_ACTIVE = 0;    // 활성(현재) 노드 순번 — 지금은 디자인용 고정값

function renderJourney() {
  const stage = document.getElementById('journey-stage');
  const svg = document.getElementById('journey-svg');
  const nodesEl = document.getElementById('journey-nodes');
  if (!stage || !svg || !nodesEl) return;

  const W = Math.min(stage.parentElement.clientWidth || JNY_REF_W, 420);
  const k = W / JNY_REF_W;
  const CX = W / 2;
  const A = Math.min(64 * k, W / 2 - 34 - 8); // 노드가 화면 밖으로 나가지 않게
  const G = 5;          // 줄 퍼짐
  const T = 1.4;        // 줄 두께(6번줄 기준)
  const LINES = 6;
  const H = JNY_N * JNY_S;
  const total = JNY_Y0 + (JNY_COUNT - 1) * JNY_S + JNY_Y0;

  stage.style.width = W + 'px';
  stage.style.height = total + 'px';
  svg.setAttribute('width', W);
  svg.setAttribute('height', total);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + total);

  let paths = '';
  for (let i = 0; i < LINES; i++) {
    const amp = A + (i - (LINES - 1) / 2) * G;
    let d = '';
    for (let y = JNY_Y0; y <= total; y += 4) { // 첫 노드부터 시작 — 그 이전엔 줄 없음
      const x = CX + amp * Math.sin(Math.PI * (y - JNY_Y0) / H);
      d += (y === JNY_Y0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y;
    }
    const w = T - T * 0.5 * (i / (LINES - 1));
    paths += '<path d="' + d + '" fill="none" stroke="#e3e1dc" stroke-width="' + w.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  svg.innerHTML = paths;

  let html = '';
  for (let i = 0; i < JNY_COUNT; i++) {
    const y = JNY_Y0 + i * JNY_S;
    const x = CX + A * Math.sin(Math.PI * i / JNY_N);
    html += '<div class="journey-node' + (i === JNY_ACTIVE ? ' journey-node--active' : '') + '" style="left:' + x.toFixed(1) + 'px;top:' + y + 'px">' + jnyNumSvg(i + 1) + '</div>';
  }
  nodesEl.innerHTML = html;
}

function closeJourney() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  renderJourney();

  let _rt = null;
  window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(renderJourney, 120); });

  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
});
