// ═══════════════════════════════════════════════════════════════
// chord-name-quiz.js — 코드 이름 맞추기 퀴즈
// ═══════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✏️  피드백 메세지 — 여기서 직접 수정하세요
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FEEDBACK_MESSAGES = {

  // 정답 · 반응속도별 ─────────────────────────────────────────
  correct: {
    s0_9 : [ // 0 ~ 0.9s  (이상값·찍기 포함)
      '헉, 이렇게 빨리 맞추시다니 대단하신걸요...?',
      '엄청 빠르네요!! 혹시 찍으신 건 아니겠죠?! ',
      '탈인간적 속도입니다!!',
      '이 정도 속도면 상위 1% 는 넘겠는걸요?!',
    ],
    s0_9_1_2: [ // 0.9 ~ 1.2s  (추후 상위 10%)
      '당신은 이미 이 레벨은 마스터하셨네요!! ',
      '상위 10%만이 이 속도로 맞출 수 있어요! 훌륭해요!',
      '기타를 이미 잘 치시는 것 같네요!!',
    ],
    s1_2: [ // 1.2 ~ 2.0s  (추후 상위 40~50%)
      '정답입니다! 열심히 외우신게 느껴지네요~!',
      '와! 조금만 더 빨라지면 마스터 하시겠는걸요?!',
      '기타에 소질이 있으시네요! 이대로 계속 파이팅~!',
    ],
    s2  : [ // 2.0 ~ 3.5s  (추후 상위 70~80%)
      '정답입니다. 조금만 더 빨라지면 충분히 연주하실 수 있겠어요!',
      '축하합니다, 정답이예요! 금방 코드를 다 외우시겠는걸요~?',
      '정답입니다! 더욱 빠른 속도를 목표로 도전해보세요!',
    ],
    s3_5: [ // 3.5s ~  (추후 하위 20%)
      '정답입니다!! 포기하지 않고 결국 맞추셨네요!',
      '약간 헷갈리셨지만 정답이예요 축하합니다!',
      '휴~! 간신히 정답을 맞추셨어요!! 축하드립니다!',
    ],
  },

  // 오답 ──────────────────────────────────────────────────────
  wrong: [
    '앗, 약간 헷갈리셨나봐요! 얼마든지 도전할 수 있어요',
    '아쉽게도 틀리셨네요ㅠㅠ 금방 외워질거예요!',
    '에고, 틀리셨네요! 실수로 잘못 누르신거죠~?',
    '틀리셔도 괜찮아요! 시간은 많답니다~',
  ],

  // 시간 초과 ─────────────────────────────────────────────────
  timeout: [
    '앗, 고민이 길으셨나봐요. 괜찮아요 다음엔 맞출 수 있을거예요!',
    '헷갈리는 코드가 있으셨나봐요! 약간의 차이에 집중해보세요!',
    '타임오버! 다음 번엔 꼭 맞춰보세요! 파이팅~!',
  ],
};
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 캔버스 상수 (home.js와 동일) ──────────────────────────────
const STRINGS     = 6;
const FRETS       = 4;
const BASE_OPEN_W = 70;
const BASE_PAD_L  = 35;   // nut 포함 시각 중앙정렬: tl=(BASE_W-FBW+nutW)/2=105, PAD_L=105-OPEN_W
const BASE_PAD_R  = 95;   // 우측 여백 = BASE_W - tl - FBW = 95
const BASE_PAD_T  = 80;
const BASE_PAD_B  = 80;
const BASE_FBW    = 240;
const BASE_FBH    = 192;
const BASE_W      = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R; // 440
const BASE_H      = BASE_PAD_T + BASE_FBH + BASE_PAD_B;               // 352

// ── drawCanvas (home.js의 함수를 그대로 활용) ──────────────────
// data 객체로만 호출 (에디터 전역 상태 불필요)
function drawCanvas(c, ratio, data) {
  const _root     = data.root     ?? '';
  const _triad    = data.triad    ?? '';
  const _seventh  = data.seventh  ?? '';
  const _func     = data.func     ?? '';
  const _tensions = data.tensions ?? [];
  const _bass     = data.bass     ?? '';
  const _dots     = data.dots     ?? [];
  const _barre    = data.barre    ?? {};
  const _openMute = data.openMute ?? [];
  const _fingerNumMode = data.fingerNumMode ?? false;
  const _nameOverride  = data.nameOverride  ?? null;
  const _fretNum = data.fretNumber >= 2 ? String(data.fretNumber) : '';

  const w   = Math.round(BASE_W   * ratio);
  const ch  = Math.round(BASE_H   * ratio);
  const tl  = Math.round((BASE_PAD_L + BASE_OPEN_W) * ratio);
  const tr  = Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * ratio);
  const tt  = Math.round(BASE_PAD_T  * ratio);
  const tb  = Math.round((BASE_PAD_T + BASE_FBH) * ratio);
  const fw  = (tr - tl) / FRETS;
  const sh  = (tb - tt) / (STRINGS - 1);
  const ds  = Math.round(sh * 0.95);
  const sc  = w / BASE_W;

  c.clearRect(0, 0, w, ch);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, ch);

  // 너트
  const nutW = Math.max(1, Math.round(9 * sc));
  const lineW = Math.max(1, 3 * sc);
  const nx = tl - nutW, ny = tt - lineW / 2, nw = nutW, nh = (tb - tt) + lineW;
  c.fillStyle = '#242729';
  c.fillRect(nx, ny, nw, nh);

  // 프렛선
  c.strokeStyle = '#242729';
  c.lineWidth = Math.max(1, 3 * sc);
  c.lineCap = 'butt';
  for (let f = 0; f <= FRETS; f++) {
    const x = tl + f * fw;
    c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
  }

  // 줄선
  for (let s = 0; s < STRINGS; s++) {
    const y = tt + s * sh;
    c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
  }

  // 바레 커버 범위 미리 계산
  const _barreCount = {};
  _dots.forEach(d => { _barreCount[d.f] = (_barreCount[d.f] || 0) + 1; });
  const coveredByBarre = new Set();
  Object.keys(_barreCount).filter(f => _barreCount[Number(f)] >= 2 && _barre[Number(f)]).forEach(f => {
    const same = _dots.filter(d => d.f === Number(f));
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
  });

  // 오픈/뮤트
  _openMute.forEach((v, s) => {
    if (_dots.some(d => d.s === s)) return;
    if (v !== 'mute' && coveredByBarre.has(s)) return;
    const y = tt + s * sh;
    const x = tl - Math.round(BASE_OPEN_W / 2 * sc);
    if (v === 'mute') {
      const half = ds * 0.38;
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth = Math.round(ds * 0.18);
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - half, y - half); c.lineTo(x + half, y + half); c.stroke();
      c.beginPath(); c.moveTo(x + half, y - half); c.lineTo(x - half, y + half); c.stroke();
      c.restore();
    } else {
      const r  = ds * 0.45;
      const lw = Math.max(1, ds * 0.15);
      c.save();
      c.strokeStyle = '#242729';
      c.lineWidth = lw;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  });

  // 바레
  const barreFrets = [];
  Object.keys(_barreCount).filter(f => _barreCount[f] >= 2).map(Number).forEach(f => {
    if (!_barre[f]) return;
    let minS, maxS;
    if (data.barreRange) {
      minS = data.barreRange.min;
      maxS = data.barreRange.max;
    } else {
      const same = _dots.filter(d => d.f === f);
      minS = Math.min(...same.map(d => d.s));
      maxS = Math.max(...same.map(d => d.s));
    }
    if (maxS <= minS) return;
    barreFrets.push(f);
    const cx   = tl + (f - 0.5) * fw;
    const topY = tt + minS * sh;
    const botY = tt + maxS * sh;
    const r    = ds / 2;
    c.save();
    c.fillStyle = '#242729';
    c.beginPath();
    c.arc(cx, topY, r, Math.PI, 0);
    c.lineTo(cx + r, botY);
    c.arc(cx, botY, r, 0, Math.PI);
    c.lineTo(cx - r, topY);
    c.closePath();
    c.fill();
    c.restore();
  });

  // 도트
  _dots.forEach(d => {
    if (_barre[d.f] && barreFrets.includes(d.f)) return;
    const cx = tl + (d.f - 0.5) * fw;
    const cy = tt + d.s * sh;
    const r  = ds / 2;
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = '#242729';
    c.fill();
    if (_fingerNumMode && d.n !== undefined) {
      const numStr = d.n === 0 ? 'T' : String(d.n);
      const fontSize = Math.round(r * 1.35);
      c.fillStyle = '#ffffff';
      c.font = `400 ${fontSize}px "Pretendard", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(numStr, cx, cy + fontSize * 0.05);
    }
    c.restore();
  });

  // 코드명
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(tl, 0, w - tl, tt - ds / 2);
  c.fillStyle = '#242729';
  c.textBaseline = 'alphabetic';

  const bSize = Math.round(48 * sc);
  const sSize = Math.round(30 * sc);
  const bY    = tt - Math.round(30 * sc);
  const sY    = bY - Math.round(14 * sc);

  let cxName = tl;
  if (_nameOverride !== null) {
    if (_nameOverride) {
      let _nBase = _nameOverride;
      let _nTension = '';
      let _nBass = '';
      const _slashIdx = _nBase.lastIndexOf('/');
      if (_slashIdx !== -1) { _nBass = _nBase.slice(_slashIdx); _nBase = _nBase.slice(0, _slashIdx); }
      const _parenIdx = _nBase.indexOf('(');
      if (_parenIdx !== -1) { _nTension = _nBase.slice(_parenIdx); _nBase = _nBase.slice(0, _parenIdx); }
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText(_nBase, cxName, bY);
      cxName += c.measureText(_nBase).width;
      if (_nTension) {
        c.font = `500 ${sSize}px "Pretendard", sans-serif`;
        c.fillText(_nTension, cxName, sY);
        cxName += c.measureText(_nTension).width;
      }
      if (_nBass) {
        c.font = `500 ${bSize}px "Pretendard", sans-serif`;
        c.fillText(_nBass, cxName, bY);
      }
    }
  } else {
    const base = _root + _triad + _seventh + (_func === 'b5' ? '' : _func);
    c.font = `500 ${bSize}px "Pretendard", sans-serif`;
    c.fillText(base, cxName, bY);
    cxName += c.measureText(base).width;
    if (_func === 'b5') {
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText('(b5)', cxName, sY);
      cxName += c.measureText('(b5)').width;
    }
    if (_tensions && _tensions.length) {
      const ts = '(' + _tensions.join(',') + ')';
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText(ts, cxName, sY);
      cxName += c.measureText(ts).width;
    }
    if (_bass) {
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText('/' + _bass, cxName, bY);
    }
  }

  // 프렛 번호
  if (_fretNum) {
    c.font = `500 ${Math.round(28 * sc)}px "Pretendard", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(_fretNum, tl + 1.5 * fw, tb + Math.round(28 * sc));
  }

  c.restore();
}

// ── chordsLibrary 항목 → drawCanvas 호출 (home.js _drawLibCanvas 패턴) ──
function drawLibEntry(canvas, entry) {
  const ratio      = canvas.width / BASE_W;
  const fretOffset = entry.fretNumber >= 2 ? entry.fretNumber - 2 : 0;

  const dots = entry.frets
    .map((f, s) => f !== null && f > 0
      ? { s, f: f - fretOffset, n: 0 }
      : null)
    .filter(Boolean);

  const activeBarre = entry.barres?.[0] ?? {};
  const normBarre   = {};
  Object.entries(activeBarre).forEach(([f, v]) => {
    normBarre[Number(f) - fretOffset] = v;
  });
  const barreRange = entry.barreRanges?.[0] ?? null;

  drawCanvas(canvas.getContext('2d'), ratio, {
    root: '', triad: '', seventh: '', func: '', tensions: [], bass: '',
    nameOverride:  '',           // 퀴즈: 캔버스에 코드명 숨김
    dots,
    openMute:      entry.openMute,
    barre:         normBarre,
    barreRange,
    fretNumber:    entry.fretNumber,
    fingerNumMode: false,
  });
}

// 이름 표시 버전 (예습 모달용)
function drawLibEntryWithName(canvas, entry, name) {
  const ratio      = canvas.width / BASE_W;
  const fretOffset = entry.fretNumber >= 2 ? entry.fretNumber - 2 : 0;

  const dots = entry.frets
    .map((f, s) => f !== null && f > 0 ? { s, f: f - fretOffset, n: 0 } : null)
    .filter(Boolean);

  const activeBarre = entry.barres?.[0] ?? {};
  const normBarre   = {};
  Object.entries(activeBarre).forEach(([f, v]) => {
    normBarre[Number(f) - fretOffset] = v;
  });
  const barreRange = entry.barreRanges?.[0] ?? null;

  drawCanvas(canvas.getContext('2d'), ratio, {
    root: '', triad: '', seventh: '', func: '', tensions: [], bass: '',
    nameOverride:  name,
    dots,
    openMute:      entry.openMute,
    barre:         normBarre,
    barreRange,
    fretNumber:    entry.fretNumber,
    fingerNumMode: false,
  });
}

// ══════════════════════════════════════════════════════════════
// 레벨 설정
// ══════════════════════════════════════════════════════════════

const LEVEL_CONFIGS = [
  { id: '1',  poolReady: true,  premium: false, name: '필수 코드',     info: '필수 코드 10개',                  timePerQ: '5초', timeSec: 5, count: 5,  locked: false },
  { id: '2',  poolReady: true,  premium: false, name: '하이코드 입문', info: '하이코드 기초 M vs m',             timePerQ: '5초', timeSec: 5, count: 7,  locked: false },
  { id: '3',  poolReady: true,  premium: false, name: '코드 꾸미기',   info: '세련된 소리가 나는 코드 모음',      timePerQ: '5초', timeSec: 5, count: 10, locked: false },
  { id: '4',  poolReady: true,  premium: false, name: '필수 분수코드', info: '노래에서 자주 쓰이는 분수코드',     timePerQ: '5초', timeSec: 5, count: 10, locked: false },
  { id: '5',  poolReady: true,  premium: false, name: '필수 7th코드',  info: 'M7 / m7 / 7 코드 정복하기',       timePerQ: '5초', timeSec: 5, count: 10, locked: false },
  { id: 'c1', poolReady: true,  premium: true,  type: 'challenge', name: '기본코드 챌린지', info: 'LEVEL1~5까지의 모든 코드가 등장합니다!', timePerQ: '5초', timeSec: 5, count: 10, locked: false },
  { id: '6',  poolReady: false, premium: true,  name: '프렛의 확장',         info: '다양한 프렛에서의 코드를 익혀보세요.',     timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: '7',  poolReady: false, premium: true,  name: '기능성 & 오픈코드',   info: '개방현을 활용하는 불규칙적인 코드',       timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: '8',  poolReady: false, premium: true,  name: '7th 코드 정복하기',   info: '모든 7음 코드를 정복해보세요.',           timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: 'c2', poolReady: false, premium: true,  type: 'challenge', name: '심화코드 챌린지',      info: '대부분의 코드가 수록되어 있습니다.',                              timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: '9',  poolReady: false, premium: true,  name: '쉘 보이싱 & 드롭 보이싱', info: '다양한 보이싱을 익혀보세요.',          timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: '10', poolReady: false, premium: true,  name: '텐션코드',             info: '텐션의 세계로 여러분을 초대합니다.',     timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: '11', poolReady: false, premium: true,  name: '하이브리드 코드',      info: '코드 표기의 오묘한 세계',               timePerQ: '—', timeSec: null, count: null, locked: true },
  { id: 'c3', poolReady: false, premium: true,  type: 'challenge', name: '코드마스터 챌린지',    info: '코디터의 모든 코드가 수록되어 있습니다!',                         timePerQ: '—', timeSec: null, count: null, locked: true },
];

const _MODE_DEFAULT = () => ({ totalPlayed: 0, totalCorrect: 0, bestSpeedSec: null, sessionsCompleted: 0 });

// ── 레벨 리스트 상태 ──────────────────────────────────────────
let _lwRealIdx = 0; // 현재 선택된 레벨 인덱스 (0..LW_N-1)
const LW_N     = LEVEL_CONFIGS.length;

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function loadLevelStats(levelId) {
  const raw = JSON.parse(localStorage.getItem(`quiz_stats_level${levelId}`) || 'null') || {};
  return {
    'name-from-diagram': raw['name-from-diagram'] ?? _MODE_DEFAULT(),
    'diagram-from-name': raw['diagram-from-name'] ?? _MODE_DEFAULT(),
  };
}

// 레벨 카드의 data-stat 셀에 실제 값 반영
function updateLevelCardStats(levelId) {
  const all = loadLevelStats(levelId);
  const panel = document.getElementById('level-detail-panel');
  if (!panel) return;

  const modes = {
    'name':    all['name-from-diagram'],
    'diagram': all['diagram-from-name'],
  };
  for (const [key, s] of Object.entries(modes)) {
    const bestEl = panel.querySelector(`[data-stat-best="${key}"]`);
    const accEl  = panel.querySelector(`[data-stat-acc="${key}"]`);
    const pct    = s.totalPlayed > 0 ? (s.totalCorrect / s.totalPlayed * 100).toFixed(1) : null;
    if (bestEl) bestEl.textContent = s.bestSpeedSec !== null ? `${s.bestSpeedSec.toFixed(2)}s` : '—';
    if (accEl) accEl.textContent = pct !== null
      ? `${formatCount(s.totalCorrect)}/${formatCount(s.totalPlayed)}`
      : '0/0';
  }
}

/** 상단 상세 패널 HTML 골격 한 번만 생성 (DOM 파괴 없이 텍스트만 갱신하기 위해 분리) */
function _lwBuildDetailShell() {
  const panel = document.getElementById('level-detail-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="ldp-header-row">
      <i class="ph-fill ph-grid-nine ldp-icon"></i>
      <span class="ldp-header-title">코드 맞추기</span>
    </div>
    <div class="ldp-badge-row">
      <span class="ldp-badge"></span>
      <span class="ldp-count"></span>
    </div>
    <div class="ldp-name"></div>
    <div class="ldp-divider"></div>
    <div class="ldp-info"></div>
    <div class="ldp-actions">
      <button class="level-action-btn level-action-btn--secondary">예습하기</button>
      <button class="level-action-btn level-action-btn--primary">시작하기</button>
    </div>
    <div class="ldp-stats-grid">
      <!-- 1행: 헤더 -->
      <div class="ldp-sg-cell ldp-sg-empty"></div>
      <div class="ldp-sg-cell ldp-sg-header" data-mode="name-from-diagram">코드이름 맞추기</div>
      <div class="ldp-sg-cell ldp-sg-header" data-mode="diagram-from-name">운지법 맞추기</div>
      <!-- 2행: 최고기록 -->
      <div class="ldp-sg-cell ldp-sg-label">최고기록</div>
      <div class="ldp-sg-cell ldp-sg-value" data-stat-best="name">—</div>
      <div class="ldp-sg-cell ldp-sg-value" data-stat-best="diagram">—</div>
      <!-- 3행: 정답률 -->
      <div class="ldp-sg-cell ldp-sg-label">정답률</div>
      <div class="ldp-sg-cell ldp-sg-value" data-stat-acc="name">0/0</div>
      <div class="ldp-sg-cell ldp-sg-value" data-stat-acc="diagram">0/0</div>
    </div>
    <div class="ldp-locked-msg"></div>
  `;

  // 이벤트는 골격 생성 시 한 번만 바인딩 (이벤트 위임)
  panel.querySelector('.level-action-btn--secondary').addEventListener('pointerup', e => {
    e.stopPropagation();
    const cfg = LEVEL_CONFIGS[_lwRealIdx];
    if (cfg.poolReady) openPreviewModal(cfg.id);  // 풀이 구현된 레벨만 예습 허용
  });
  panel.querySelector('.level-action-btn--primary').addEventListener('pointerup', e => {
    e.stopPropagation();
    const cfg = LEVEL_CONFIGS[_lwRealIdx];
    // 프리미엄 체크 먼저 — locked여도 플랜 시트 노출
    if (cfg.premium && getPlan() === 'free') {
      analytics.track('paywall_viewed', { trigger_source: 'quiz_level', current_plan: 'free' });
      openPlanSheet('quiz_level');
      return;
    }
    if (cfg.locked) return;
    startLevel(cfg.id);
  });
  panel.querySelectorAll('.ldp-sg-header[data-mode]').forEach(col => {
    col.addEventListener('pointerup', e => {
      e.stopPropagation();
      const cfg = LEVEL_CONFIGS[_lwRealIdx];
      openChartModal(cfg.id, col.dataset.mode);
    });
  });
}

/** 상단 상세 패널 내용 갱신 — DOM 파괴 없이 텍스트·visibility만 변경 */
function _lwUpdateDetail() {
  const panel = document.getElementById('level-detail-panel');
  if (!panel) return;
  const cfg = LEVEL_CONFIGS[_lwRealIdx];

  // 텍스트 갱신
  const badgeEl = panel.querySelector('.ldp-badge');
  badgeEl.textContent = cfg.type === 'challenge' ? 'CHALLENGE' : `LEVEL ${cfg.id}`;
  badgeEl.classList.remove('ldp-badge--bronze', 'ldp-badge--silver', 'ldp-badge--gold');
  if (cfg.id === 'c1') badgeEl.classList.add('ldp-badge--bronze');
  else if (cfg.id === 'c2') badgeEl.classList.add('ldp-badge--silver');
  else if (cfg.id === 'c3') badgeEl.classList.add('ldp-badge--gold');
  panel.querySelector('.ldp-name').textContent    = cfg.name;
  panel.querySelector('.ldp-info').textContent    = cfg.info;

  const countEl = panel.querySelector('.ldp-count');
  countEl.textContent   = cfg.count ? `${cfg.count}문제 · 문제 당 ${cfg.timePerQ}` : '';
  countEl.style.display = cfg.count ? '' : 'none';

  // 통계 그리드 항상 표시 / 잠금 메시지 항상 숨김
  panel.querySelector('.ldp-stats-grid').style.display  = '';
  panel.querySelector('.ldp-locked-msg').style.display  = 'none';

  // 풀 미구현 레벨은 통계값 전부 '—' 으로 덮어씀
  if (!cfg.poolReady) {
    ['name', 'diagram'].forEach(key => {
      const bestEl = panel.querySelector(`[data-stat-best="${key}"]`);
      const accEl  = panel.querySelector(`[data-stat-acc="${key}"]`);
      if (bestEl) bestEl.textContent = '—';
      if (accEl)  accEl.textContent  = '—';
    });
  }

  // 버튼 상태
  panel.querySelector('.level-action-btn--secondary').disabled = !cfg.poolReady;
  // 프리미엄 레벨은 잠겨도 버튼 활성화 유지 (클릭 → 플랜 시트)
  // 비프리미엄 locked만 disabled
  panel.querySelector('.level-action-btn--primary').disabled   = !!cfg.locked && !cfg.premium;

  if (cfg.count) updateLevelCardStats(cfg.id);
}

/** 레벨 스크롤 리스트 초기화 */
function buildLevelList() {
  const track = document.getElementById('level-wheel-track');
  if (!track) return;

  track.innerHTML = '';
  _lwRealIdx = 0;

  LEVEL_CONFIGS.forEach((cfg, i) => {
    const el = document.createElement('div');
    const challengeClass = cfg.id === 'c1' ? ' lw-item--challenge-bronze'
                         : cfg.id === 'c2' ? ' lw-item--challenge-silver'
                         : cfg.id === 'c3' ? ' lw-item--challenge-gold'
                         : '';
    el.className = `lw-item${challengeClass}${cfg.locked ? ' lw-item--locked' : ''}${!cfg.poolReady ? ' lw-item--coming-soon' : ''}${i === 0 ? ' lw-item--selected' : ''}`;
    const badgeText = cfg.type === 'challenge' ? 'CHALLENGE' : `LEVEL ${cfg.id}`;
    el.innerHTML = `
      <div class="lw-row1">
        <span class="lw-badge">${badgeText}</span>
        <span class="lw-row1-right">
          ${cfg.count ? `<span class="lw-count">${cfg.count}문제 · 문제 당 ${cfg.timePerQ}</span>` : ''}
          ${cfg.premium ? '<i class="ph-fill ph-crown lw-premium-crown"></i>' : ''}
        </span>
      </div>
      <div class="lw-row2">
        <span class="lw-name">${cfg.name}</span>
      </div>
      ${!cfg.poolReady ? '<span class="lw-coming-soon">COMING SOON</span>' : ''}
    `;
    el.addEventListener('pointerup', () => {
      track.querySelectorAll('.lw-item').forEach(e => e.classList.remove('lw-item--selected'));
      el.classList.add('lw-item--selected');
      _lwRealIdx = i;
      _lwUpdateDetail();
    });
    track.appendChild(el);
  });

  // 패널 골격 생성 후 Level 1 내용으로 초기화, 높이 고정
  _lwBuildDetailShell();
  requestAnimationFrame(() => {
    _lwUpdateDetail();
    requestAnimationFrame(() => {
      const panel = document.getElementById('level-detail-panel');
      if (panel) panel.style.minHeight = panel.offsetHeight + 'px';
    });
  });
}

// ── 예습 모달 ─────────────────────────────────────────────────
const ROOT_ORDER = ['A','B','C','D','E','F','G'];
function _getRoot(name) { return name.match(/^([A-G][#b]?)/)?.[1] ?? name; }

// ── 예습 모달 상태 ──────────────────────────────────────────────
let _previewLevelId = null;
let _previewPool    = null;
let _previewAccMode = 'sharp'; // 'sharp' | 'flat' (챌린지 모드 전용)

// 크로매틱 피치 → 정렬용 (임시표 포함)
// 근음 정렬: A부터 시작하는 크로매틱 순서
const _CHROMATIC_PITCH = {
  'A':0,'A#':1,'Bb':1,'B':2,
  'C':3,'C#':4,'Db':4,'D':5,'D#':6,'Eb':6,'E':7,
  'F':8,'F#':9,'Gb':9,'G':10,'G#':11,'Ab':11,
};
function _getRootPitch(name) { return _CHROMATIC_PITCH[_getRoot(name)] ?? 0; }

// 코드 타입 정렬: 트라이어드 → 분수코드 → 기능성 → 7th → 텐션
// M → m 순서
function _getAvgFret(entry) {
  const frets = entry.frets.filter(f => f > 0);
  if (!frets.length) return 0;
  return frets.reduce((s, f) => s + f, 0) / frets.length;
}

function _getQualitySortKey(name) {
  if (name.includes('/')) return 20; // 분수코드
  const suffix = name.match(/^[A-G][#b]?(.*)$/)?.[1] ?? '';
  const ORDER = {
    '':     0,  // M (메이저 트라이어드)
    'm':    1,  // 마이너 트라이어드
    'sus4': 30, 'sus2': 31, 'add9': 32, // 기능성 코드
    'M7':   40, 'm7':   41, '7':    42, // 7th
    'aug':  50, 'dim':  51, 'aug7': 52, 'dim7': 53, 'm7(b5)': 54, // 기타
    '6':    60, 'm6':   61,
  };
  return ORDER[suffix] ?? 99;
}

// 챌린지 모드 표시 이름 변환 (# ↔ b)
// # only(F#), b only(Bb) 는 고정 / both(C#↔Db, D#↔Eb, G#↔Ab)만 전환
const _ACC_SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'G#':'Ab' };
const _ACC_FLAT_TO_SHARP = { 'Db':'C#', 'Eb':'D#', 'Ab':'G#' };

// 코드명의 루트·베이스 음이름에 # / b 포함 여부 (suffix의 b5 등은 무시)
function _noteAccidental(name) {
  const si = name.indexOf('/');
  const parts = si > 0 ? [name.slice(0, si), name.slice(si + 1)] : [name];
  let sharp = false, flat = false;
  for (const p of parts) {
    const m = p.match(/^[A-G]([#b])/);
    if (m) { if (m[1] === '#') sharp = true; else flat = true; }
  }
  return { sharp, flat };
}
function _getPreviewDisplayName(name, mode) {
  // # 모드: b표기(both 카테고리) → # 변환 (Ab→G#, Db→C#, Eb→D#)
  // b 모드: #표기(both 카테고리) → b 변환 (G#→Ab, C#→Db, D#→Eb)
  // F#(# only), Bb(b only)는 양쪽 모두 변환 대상 아님
  const _conv = n => mode === 'sharp'
    ? (_ACC_FLAT_TO_SHARP[n] || n)
    : (_ACC_SHARP_TO_FLAT[n] || n);
  const si = name.indexOf('/');
  if (si > 0) {
    const main = name.slice(0, si);
    const bass = name.slice(si + 1);
    const m = main.match(/^([A-G][#b]?)(.*)$/);
    const rootNote = m?.[1] ?? '';
    const mainNorm = m ? _conv(rootNote) + m[2] : main;

    // ── 화성학 원칙: 자연음 루트 분수코드의 베이스음은 토글 변환 금지 ──
    // 자연음 루트 메이저: 베이스음은 # 고정 (A/C# → 절대 A/Db 안 됨)
    // 자연음 루트 마이너: 베이스음은 b 고정 (Fm/Ab → 절대 Fm/G# 안 됨)
    // 이유: 각 조성의 스케일이 # 또는 b 중 하나만 사용하므로
    //       베이스음을 반대 표기로 바꾸면 음이름 중복(C와 C#, G와 G# 등) 발생
    const isNaturalRoot = rootNote.length === 1; // '#' 또는 'b' 없는 경우
    const bassNorm = isNaturalRoot ? bass : _conv(bass);

    return mainNorm + '/' + bassNorm;
  }
  const m = name.match(/^([A-G][#b]?)(.*)$/);
  return m ? _conv(m[1]) + m[2] : name;
}

function openPreviewModal(levelId) {
  const cfg = LEVEL_CONFIGS.find(c => c.id === levelId);
  if (!cfg) return;

  _previewLevelId = levelId;
  _previewPool    = buildLevelPool(levelId);
  analytics.track('quiz_preview_opened', {
    level_id:    levelId,
    level_name:  cfg.name,
    chord_count: _previewPool.length,
  });
  _previewAccMode = 'sharp'; // 열 때마다 # 모드로 초기화

  const isChallenge = cfg.type === 'challenge';

  // 토글 바 표시 제어
  const bar = document.getElementById('preview-accidental-bar');
  if (bar) bar.style.display = isChallenge ? '' : 'none';
  document.getElementById('preview-acc-sharp')?.classList.add('preview-acc-btn--active');
  document.getElementById('preview-acc-flat')?.classList.remove('preview-acc-btn--active');

  // 제목
  const badge = isChallenge ? 'CHALLENGE' : `LEVEL ${levelId}`;
  document.getElementById('preview-modal-title').textContent =
    `${badge} · ${_previewPool.length}개`;

  document.getElementById('preview-modal-overlay').classList.add('preview-modal-overlay--show');
  lucide.createIcons();

  _renderPreviewGrid();
}

function _renderPreviewGrid() {
  if (!_previewPool) return;
  const isChallenge = _previewLevelId === 'c1';
  const grid = document.getElementById('preview-modal-grid');
  grid.innerHTML = '';

  // 표시 이름 적용 (챌린지만 #/b 변환)
  let displayItems = _previewPool.map(item => ({
    entry:       item.entry,
    displayName: isChallenge
      ? _getPreviewDisplayName(item.name, _previewAccMode)
      : item.name,
  }));

  // 챌린지 모드: 현재 모드와 반대 임시표를 가진 코드 숨김
  // → # 모드에서 b 포함 코드 숨김 / b 모드에서 # 포함 코드 숨김
  if (isChallenge) {
    displayItems = displayItems.filter(({ displayName }) => {
      const { sharp, flat } = _noteAccidental(displayName);
      if (_previewAccMode === 'sharp' && flat)  return false;
      if (_previewAccMode === 'flat'  && sharp) return false;
      return true;
    });
  }

  // 크로매틱 피치 기준 정렬
  displayItems.sort((a, b) => {
    const pd = _getRootPitch(a.displayName) - _getRootPitch(b.displayName);
    if (pd !== 0) return pd;
    const qd = _getQualitySortKey(a.displayName) - _getQualitySortKey(b.displayName);
    if (qd !== 0) return qd;
    return _getAvgFret(a.entry) - _getAvgFret(b.entry);
  });

  // 근음별 그룹화
  const groups = [];
  displayItems.forEach(({ displayName, entry }) => {
    const root = _getRoot(displayName);
    const last = groups[groups.length - 1];
    if (last && last.root === root) last.items.push({ displayName, entry });
    else groups.push({ root, items: [{ displayName, entry }] });
  });

  // DOM 생성
  const canvasItems = [];
  groups.forEach(({ root, items }) => {
    const label = document.createElement('div');
    label.className = 'preview-section-label';
    label.textContent = root;
    grid.appendChild(label);
    items.forEach(({ displayName, entry }) => {
      const canvas = document.createElement('canvas');
      canvas.className = 'preview-chord-canvas';
      grid.appendChild(canvas);
      canvasItems.push({ canvas, entry, name: displayName });
    });
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    canvasItems.forEach(({ canvas, entry, name }) => {
      const w = canvas.offsetWidth;
      const h = Math.round(w * BASE_H / BASE_W);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      drawLibEntryWithName(canvas, entry, name);
    });
  }));
}

function closePreviewModal() {
  document.getElementById('preview-modal-overlay').classList.remove('preview-modal-overlay--show');
}

function setPreviewAccidental(mode) {
  if (_previewAccMode === mode) return;
  _previewAccMode = mode;
  document.getElementById('preview-acc-sharp')
    ?.classList.toggle('preview-acc-btn--active', mode === 'sharp');
  document.getElementById('preview-acc-flat')
    ?.classList.toggle('preview-acc-btn--active', mode === 'flat');
  _renderPreviewGrid();
}

// toggleLevelCard → 휠피커 도입으로 제거됨

// ══════════════════════════════════════════════════════════════
// LEVEL1 퀴즈 로직
// ══════════════════════════════════════════════════════════════

const LEVEL1_NAMES = [
  'C', 'D', 'Dm', 'E', 'Em', 'F', 'G', 'A', 'Am', 'Bm',
];

// 레벨 2: 레벨1 오픈 10개 + 바레 14개 = 24개, 동일 보이싱 중복 제거 → 약 22개
// [코드명, voicingLabel, 최대 fretNumber]
const LEVEL2_CHORD_SPECS = [
  // E-폼 (6번줄 바레) — 자연음 근음 프렛 0~7
  ['F',  '6번줄 바레', 8], ['Fm',  '6번줄 바레', 8],
  ['G',  '6번줄 바레', 8], ['Gm',  '6번줄 바레', 8],
  ['A',  '6번줄 바레', 8], ['Am',  '6번줄 바레', 8],
  ['B',  '6번줄 바레', 8], ['Bm',  '6번줄 바레', 8],
  // A-폼 (5번줄 바레) — 자연음 근음 프렛 0~7
  ['B',  '5번줄 바레', 8], ['Bm',  '5번줄 바레', 8],
  ['C',  '5번줄 바레', 8], ['Cm',  '5번줄 바레', 8],
  ['D',  '5번줄 바레', 8], ['Dm',  '5번줄 바레', 8],
  ['E',  '5번줄 바레', 8], ['Em',  '5번줄 바레', 8],
];
// 선택지용 유니크 이름 (오픈+바레 통합 14개)
const LEVEL2_NAMES = [...new Set([...LEVEL1_NAMES, ...LEVEL2_CHORD_SPECS.map(s => s[0])])];

// 레벨 3 = 레벨 1 전체 + sus2/sus4/add9 오픈코드 + 도미넌트7 오픈코드
// 레벨 3 = 레벨2 전체(누적) + 오픈 sus2/sus4/add9 + 바레 sus2/sus4 (E폼/A폼, 자연음, ≤7프렛)

// 오픈 보이싱 (개방현 포함, frets ≤ 4)
const LEVEL3_OPEN_NAMES = [
  'Csus4', 'Dsus4', 'Asus4', 'Gsus4',             // sus4 (Bsus4 [x 2 4 4 0 0] 제외)
  'Csus2', 'Dsus2', 'Asus2',                       // sus2
  'Cadd9', 'Gadd9', 'Aadd9', 'Eadd9',             // add9
];

// 바레 보이싱 (E폼/A폼, 자연음 근음 ≤7프렛)
const LEVEL3_BARRE_SPECS = [
  // E-폼 sus4 (6번줄) — 근음 E(0),F(1),G(3),A(5),B(7)
  ['Esus4', '6번줄 바레', 8], ['Fsus4', '6번줄 바레', 8],
  ['Gsus4', '6번줄 바레', 8], ['Asus4', '6번줄 바레', 8], ['Bsus4', '6번줄 바레', 8],
  // A-폼 sus4 (5번줄) — 근음 A(0),B(2),C(3),D(5),E(7)
  ['Asus4', '5번줄 바레', 8], ['Bsus4', '5번줄 바레', 8],
  ['Csus4', '5번줄 바레', 8], ['Dsus4', '5번줄 바레', 8], ['Esus4', '5번줄 바레', 8],
  // A-폼 sus2 (5번줄) — 근음 A(0),B(2),C(3),D(5),E(7)  (E폼 sus2 패턴 없음)
  ['Asus2', '5번줄 바레', 8], ['Bsus2', '5번줄 바레', 8],
  ['Csus2', '5번줄 바레', 8], ['Dsus2', '5번줄 바레', 8], ['Esus2', '5번줄 바레', 8],
];

// 선택지용 유니크 이름
const LEVEL3_NAMES = [...new Set([
  ...LEVEL2_NAMES,
  ...LEVEL3_OPEN_NAMES,
  ...LEVEL3_BARRE_SPECS.map(s => s[0]),
])];

// 레벨 4 = 분수코드 독립 풀 (누적 없음)
// 오픈/바레 모두 포함, fretNumber ≤ 8
const LEVEL4_NAMES = [
  'C/E', 'C/G',
  'D/F#', 'D/A',
  'E/G#', 'E/B',
  'F/A', 'F/C', 'Fm/Ab',
  'G/B', 'G/D',
  'A/C#', 'A/E',
  'B/D#',
];

// 레벨 5 = 7th코드 독립 풀 (누적 없음)
// E폼(6번줄) / A폼(5번줄) / D폼(4번줄), M7·m7·7, 자연음 근음 ≤7프렛
// [코드명, voicingLabel, 최대 fretNumber]
const LEVEL5_CHORD_SPECS = [
  // ── E-폼 (6번줄 바레) — 근음 E(0) F(1) G(3) A(5) B(7) ─────
  ['EM7', '6번줄 바레', 8], ['FM7', '6번줄 바레', 8], ['GM7', '6번줄 바레', 8], ['AM7', '6번줄 바레', 8], ['BM7', '6번줄 바레', 8],
  ['Em7', '6번줄 바레', 8], ['Fm7', '6번줄 바레', 8], ['Gm7', '6번줄 바레', 8], ['Am7', '6번줄 바레', 8], ['Bm7', '6번줄 바레', 8],
  ['E7',  '6번줄 바레', 8], ['F7',  '6번줄 바레', 8], ['G7',  '6번줄 바레', 8], ['A7',  '6번줄 바레', 8], ['B7',  '6번줄 바레', 8],
  // ── A-폼 (5번줄 바레) — 근음 A(0) B(2) C(3) D(5) E(7) ─────
  ['AM7', '5번줄 바레', 8], ['BM7', '5번줄 바레', 8], ['CM7', '5번줄 바레', 8], ['DM7', '5번줄 바레', 8], ['EM7', '5번줄 바레', 8],
  ['Am7', '5번줄 바레', 8], ['Bm7', '5번줄 바레', 8], ['Cm7', '5번줄 바레', 8], ['Dm7', '5번줄 바레', 8], ['Em7', '5번줄 바레', 8],
  ['A7',  '5번줄 바레', 8], ['B7',  '5번줄 바레', 8], ['C7',  '5번줄 바레', 8], ['D7',  '5번줄 바레', 8], ['E7',  '5번줄 바레', 8],
  // ── D-폼 (4번줄 바레) — 근음 D(0) E(2) F(3) G(5) A(7) ─────
  ['DM7', '4번줄 바레', 8], ['EM7', '4번줄 바레', 8], ['FM7', '4번줄 바레', 8], ['GM7', '4번줄 바레', 8], ['AM7', '4번줄 바레', 8],
  ['Dm7', '4번줄 바레', 8], ['Em7', '4번줄 바레', 8], ['Fm7', '4번줄 바레', 8], ['Gm7', '4번줄 바레', 8], ['Am7', '4번줄 바레', 8],
  ['D7',  '4번줄 바레', 8], ['E7',  '4번줄 바레', 8], ['F7',  '4번줄 바레', 8], ['G7',  '4번줄 바레', 8], ['A7',  '4번줄 바레', 8],
];
// 선택지용 유니크 이름
const LEVEL5_NAMES = [...new Set(LEVEL5_CHORD_SPECS.map(s => s[0]))];

const QUIZ_COUNT = 5;

function pickFeedbackMsg(isCorrect, speedSec, isTimeout = false) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  if (isTimeout)   return pick(FEEDBACK_MESSAGES.timeout);
  if (!isCorrect)  return pick(FEEDBACK_MESSAGES.wrong);
  const c = FEEDBACK_MESSAGES.correct;
  if (speedSec < 0.9)  return pick(c.s0_9);      // 0 ~ 0.9s
  if (speedSec < 1.2)  return pick(c.s0_9_1_2);  // 0.9 ~ 1.2s
  if (speedSec < 2.0)  return pick(c.s1_2);       // 1.2 ~ 2.0s
  if (speedSec < 3.5)  return pick(c.s2);         // 2.0 ~ 3.5s
  return pick(c.s3_5);                             // 3.5s ~
}

function showFeedbackMsg(msg) {
  const el = document.getElementById('quiz-feedback-msg');
  if (el) el.textContent = msg;
}

const FLAT_TO_SHARP = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };

// chordsLibrary에서 지정된 이름 목록 + frets ≤ 4 조건으로 풀 구성
function _buildPoolFromNames(nameList) {
  const pool = [];
  const lib  = window.chordsLibrary;
  if (!lib) { console.warn('[Quiz] chordsLibrary 없음'); return pool; }

  for (const targetName of nameList) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    // 조건: 이름 일치 + 모든 프렛값 ≤ 4
    const entry = entries.find(e =>
      e.name === targetName &&
      e.frets.every(f => f === null || f <= 4)
    );
    if (entry) {
      pool.push({ name: targetName, entry });
    } else {
      console.warn(`[Quiz] "${targetName}" 항목을 찾지 못했습니다.`);
    }
  }
  return pool;
}

function buildLevel1Pool() { return _buildPoolFromNames(LEVEL1_NAMES); }

function buildLevel2Pool() {
  // ① 레벨1 오픈 보이싱 전체 (10개)
  const pool = _buildPoolFromNames(LEVEL1_NAMES);

  // ② 바레 보이싱 추가 (LEVEL2_CHORD_SPECS 순서대로)
  //    동일 name + 동일 frets인 항목은 중복 제거 (F, Bm 등 오픈=바레인 경우)
  const lib = window.chordsLibrary;
  if (!lib) return pool;

  for (const [targetName, preferredLabel, maxFretNum] of LEVEL2_CHORD_SPECS) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    const candidates = entries.filter(e =>
      e.name === targetName &&
      e.voicingLabel === preferredLabel &&
      e.fretNumber <= maxFretNum
    );
    candidates.sort((a, b) => a.fretNumber - b.fretNumber);
    const barreEntry = candidates[0];
    if (!barreEntry) {
      console.warn(`[Quiz] L2 "${targetName}" (${preferredLabel}) 항목 없음`);
      continue;
    }

    // 동일 name + 동일 frets 중복 체크
    const isDupe = pool.some(p =>
      p.name === targetName &&
      p.entry.frets.every((f, i) => f === barreEntry.frets[i])
    );
    if (!isDupe) pool.push({ name: targetName, entry: barreEntry });
  }

  console.log(`[Quiz] L2 풀 크기: ${pool.length}개`);
  return pool;
}

function buildLevel3Pool() {
  // ① 레벨2 풀 전체 상속
  const pool = buildLevel2Pool();
  const lib  = window.chordsLibrary;
  if (!lib) return pool;

  const isDupe = (name, frets) => pool.some(p =>
    p.name === name && p.entry.frets.every((f, i) => f === frets[i])
  );

  // ② 오픈 sus2/sus4/add9 추가
  for (const item of _buildPoolFromNames(LEVEL3_OPEN_NAMES)) {
    if (!isDupe(item.name, item.entry.frets)) pool.push(item);
  }

  // ③ 바레 sus2/sus4 추가 (E폼/A폼)
  for (const [targetName, preferredLabel, maxFretNum] of LEVEL3_BARRE_SPECS) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    const candidates = entries.filter(e =>
      e.name === targetName &&
      e.voicingLabel === preferredLabel &&
      e.fretNumber <= maxFretNum
    );
    candidates.sort((a, b) => a.fretNumber - b.fretNumber);
    const entry = candidates[0];

    if (!entry) { console.warn(`[Quiz] L3 "${targetName}" (${preferredLabel}) 항목 없음`); continue; }
    if (!isDupe(targetName, entry.frets)) pool.push({ name: targetName, entry });
  }

  console.log(`[Quiz] L3 풀 크기: ${pool.length}개`);
  return pool;
}

// 레벨4 개별 제외 항목 — { name, frets } (1번줄→6번줄 순)
const LEVEL4_EXCLUDED_ENTRIES = [
  // G/B 'x r+2 r r r x' 패턴 (r=0, rootStr=5) → 'x 2 0 0 0 x' → reversed
  { name: 'G/B', frets: [null, 0, 0, 0, 2, null] },
];

function buildLevel4Pool() {
  // 분수코드 독립 풀 — 레벨1~3 누적 없음
  // fretNumber ≤ 8 / 오픈+바레 공존 시 바레만 남김
  const pool = [];
  const lib  = window.chordsLibrary;
  if (!lib) { console.warn('[Quiz] chordsLibrary 없음'); return pool; }

  // barre 객체에 키가 1개 이상 = 실제 바레 보이싱
  const isBarreEntry = (e) => Object.keys(e.barre || {}).length > 0;

  for (const targetName of LEVEL4_NAMES) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    // ① 이름 일치 + fretNumber ≤ 8
    const candidates = entries.filter(e =>
      e.name === targetName &&
      (e.fretNumber == null || e.fretNumber <= 8)
    );

    // ② 바레가 하나라도 있으면 바레만 / 없으면 전체
    const hasAnyBarre = candidates.some(isBarreEntry);
    const chosen = hasAnyBarre ? candidates.filter(isBarreEntry) : candidates;

    // ③ 중복 제거 + 개별 제외
    const seen = new Set();
    for (const entry of chosen) {
      const isExcluded = LEVEL4_EXCLUDED_ENTRIES.some(ex =>
        ex.name === targetName && ex.frets.every((f, i) => f === entry.frets[i])
      );
      if (isExcluded) continue;
      const key = entry.frets.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        pool.push({ name: targetName, entry });
      }
    }

    if (!chosen.length) console.warn(`[Quiz] L4 "${targetName}" 항목 없음`);
  }

  // ② 오픈(정적) 보이싱 추가 — voicingLabel === 'Open'
  for (const targetName of LEVEL4_NAMES) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    const openEntries = entries.filter(e =>
      e.name === targetName && e.voicingLabel === 'Open'
    );
    for (const entry of openEntries) {
      const isExcluded = LEVEL4_EXCLUDED_ENTRIES.some(ex =>
        ex.name === targetName && ex.frets.every((f, i) => f === entry.frets[i])
      );
      if (isExcluded) continue;
      const key = entry.frets.join(',');
      if (!pool.some(p => p.name === targetName && p.entry.frets.join(',') === key)) {
        pool.push({ name: targetName, entry });
      }
    }
  }

  console.log(`[Quiz] L4 풀 크기: ${pool.length}개`, pool.map(p => p.name));
  return pool;
}

// 제거할 패턴 — fingering 배열로 식별 (chords-library에서 .reverse() 저장됨)
// [r r+2 r r r r]       fingers '1 3 1 1 1 1' → reversed [1,1,1,1,3,1]      (m7 E폼)
// [x r r+2 r+1 r+2 x]   fingers 'x 1 2 3 4 x' → reversed [null,4,3,2,1,null] (M7 A폼)
// [x r+1 x r+1 r+2 x]   fingers 'x 1 x 2 3 x' → reversed [null,3,2,null,1,null] (m7 A폼)
const LEVEL5_EXCLUDED_FINGERINGS = [
  [1, 1, 1, 1, 3, 1],
  [null, 4, 3, 2, 1, null],
  [null, 3, 2, null, 1, null],
];
function _isExcludedL5(entry) {
  const fingerings = entry.fingerings || [entry.fingering];
  return LEVEL5_EXCLUDED_FINGERINGS.some(excl =>
    fingerings.some(f =>
      f && f.length === excl.length && f.every((v, i) => v === excl[i])
    )
  );
}

// 개별 제외 항목 — { name, frets } (frets는 라이브러리 저장 순서: 1번줄→6번줄)
// 사용자 표기 [6번줄→1번줄]을 reverse() 한 값
const LEVEL5_EXCLUDED_ENTRIES = [
  // B7:  [x 2 1 2 0 x] → reversed
  { name: 'B7',  frets: [null, 0, 2, 1, 2, null] },
  // EM7: [0 x 1 1 0 x] → reversed
  { name: 'EM7', frets: [null, 0, 1, 1, null, 0] },
  // E7:  [0 x 0 1 0 x] → reversed
  { name: 'E7',  frets: [null, 0, 1, 0, null, 0] },
];
function _isIndividualExcludeL5(name, frets) {
  return LEVEL5_EXCLUDED_ENTRIES.some(ex =>
    ex.name === name && ex.frets.every((f, i) => f === frets[i])
  );
}

// 바레 표기 제거 대상 fingering (barre:true 이지만 바레 아닌 것으로 표시할 패턴)
// 'r x r+1 r+1 r x'  fingers '1 x 2 3 1 x' → reversed
// 'r x r r+1 r x'    fingers '1 x 1 2 1 x' → reversed
const LEVEL5_DEBARRE_FINGERINGS = [
  [null, 1, 3, 2, null, 1],
  [null, 1, 2, 1, null, 1],
];
// 오픈 보이싱 개별 제외 — frets 기준 (사용자 표기 [6번줄→1번줄] reversed)
const LEVEL5_EXCLUDED_FRETS = [
  [0, 0, 6, 6, 0, null],     // 'x 0 6 6 0 0'  AM7
  [3, 2, 2, 2, 0, null],     // 'x 0 2 2 2 3'  A7
  [0, 0, 5, 5, 3, null],     // 'x 3 5 5 0 0'  CM7
  [0, 0, 8, 9, 7, 0],        // '0 7 9 8 0 0'  EM7
  [0, 3, 0, 2, null, null],  // 'x x 2 0 3 0'  Em7
  [3, 3, 0, 2, null, null],  // 'x x 2 0 3 3'  Em7
  [0, 0, 7, 6, 7, 0],        // '0 7 6 7 0 0'  E7
  [0, 0, 7, 9, 7, 0],        // '0 7 9 7 0 0'  E7
];
function _isExcludedByFretsL5(frets) {
  return LEVEL5_EXCLUDED_FRETS.some(ex => ex.every((f, i) => f === frets[i]));
}

// 오픈 보이싱 바레 제거 — frets 기준
const LEVEL5_DEBARRE_FRETS = [
  [1, 1, 2, 0, null, null],  // 'x x 0 2 1 1'  Dm7
];
function _debarreByFretsL5(entry) {
  const matches = LEVEL5_DEBARRE_FRETS.some(t => t.every((f, i) => f === entry.frets[i]));
  if (!matches) return entry;
  return { ...entry, barre: {}, barreRange: null, barres: (entry.barres || []).map(() => ({})) };
}

function _debarreL5(entry) {
  const fingerings = entry.fingerings || [entry.fingering];
  const needsDebarre = LEVEL5_DEBARRE_FINGERINGS.some(target =>
    fingerings.some(f =>
      f && f.length === target.length && f.every((v, i) => v === target[i])
    )
  );
  if (!needsDebarre) return entry;
  return {
    ...entry,
    barre:      {},
    barreRange: null,
    barres:     (entry.barres || []).map(() => ({})),
  };
}

function buildLevel5Pool() {
  // 7th코드 독립 풀 — 레벨1~4 누적 없음
  // E폼·A폼·D폼 전체 후보, 제외 패턴 필터링 후 frets 중복 제거
  const pool = [];
  const lib  = window.chordsLibrary;
  if (!lib) return pool;

  const isDupe = (name, frets) => pool.some(p =>
    p.name === name && p.entry.frets.every((f, i) => f === frets[i])
  );

  for (const [targetName, preferredLabel, maxFretNum] of LEVEL5_CHORD_SPECS) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    const candidates = entries.filter(e =>
      e.name === targetName &&
      e.voicingLabel === preferredLabel &&
      e.fretNumber <= maxFretNum
    );
    if (!candidates.length) { console.warn(`[Quiz] L5 "${targetName}" (${preferredLabel}) 항목 없음`); continue; }
    for (const entry of candidates) {
      if (_isExcludedL5(entry)) continue;
      if (_isIndividualExcludeL5(targetName, entry.frets)) continue;
      if (!isDupe(targetName, entry.frets)) pool.push({ name: targetName, entry: _debarreL5(entry) });
    }
  }

  // ④ 오픈(정적) 보이싱 추가 — voicingLabel === 'Open'
  for (const targetName of LEVEL5_NAMES) {
    const root    = targetName.match(/^([A-G][#b]?)/)?.[1];
    if (!root) continue;
    const rootKey = FLAT_TO_SHARP[root] || root;
    const entries = lib[rootKey] || [];

    const openEntries = entries.filter(e =>
      e.name === targetName && e.voicingLabel === 'Open'
    );
    for (const entry of openEntries) {
      if (_isExcludedByFretsL5(entry.frets)) continue;
      const finalEntry = _debarreByFretsL5(entry);
      if (!isDupe(targetName, finalEntry.frets)) pool.push({ name: targetName, entry: finalEntry });
    }
  }

  console.log(`[Quiz] L5 풀 크기: ${pool.length}개`);
  return pool;
}

// ── 챌린지 모드 코드명 표기 정규화 ─────────────────────────────
// 풀은 항상 # 정규형으로 유지 (예습 모달 b 토글은 표시 시점에 변환)
//   # only  : Gb  → F#
//   b only  : A#  → Bb
//   # or b  : Ab  → G#, Db → C#, Eb → D#  (풀은 #, 표시 시 b 토글로 전환)
function _normalizeChallengeChordName(name) {
  const _conv = n => {
    if (n === 'Gb') return 'F#';
    if (n === 'A#') return 'Bb';
    if (n === 'Ab') return 'G#';
    if (n === 'Db') return 'C#';
    if (n === 'Eb') return 'D#';
    return n;
  };
  // slash 코드: 루트 + 베이스 음 각각 변환
  const slashIdx = name.indexOf('/');
  if (slashIdx > 0) {
    const main = name.slice(0, slashIdx);
    const bass = name.slice(slashIdx + 1);
    const m = main.match(/^([A-G][#b]?)(.*)$/);
    const mainNorm = m ? _conv(m[1]) + m[2] : main;
    return mainNorm + '/' + _conv(bass);
  }
  // 일반 코드: 루트만 변환
  const m = name.match(/^([A-G][#b]?)(.*)$/);
  return m ? _conv(m[1]) + m[2] : name;
}

function buildChallengePool() {
  // 레벨1~5 풀을 그대로 합산 — 별도 필터 로직 없음
  const combined = [
    ...buildLevel1Pool(),
    ...buildLevel2Pool(),
    ...buildLevel3Pool(),
    ...buildLevel4Pool(),
    ...buildLevel5Pool(),
  ];

  // name + frets 기준 중복 제거
  const seen = new Set();
  const pool = [];
  for (const item of combined) {
    const key = item.name + '§' + item.entry.frets.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      pool.push(item);
    }
  }

  console.log(`[Quiz] Challenge 풀 크기: ${pool.length}개`, pool.map(p => p.name));
  return pool;
}

/** 현재 레벨 ID에 맞는 풀·이름 목록 반환 */
function buildLevelPool(levelId) {
  if (levelId === '1') return buildLevel1Pool();
  if (levelId === '2') return buildLevel2Pool();
  if (levelId === '3') return buildLevel3Pool();
  if (levelId === '4') return buildLevel4Pool();
  if (levelId === '5') return buildLevel5Pool();
  if (levelId === 'c1') return buildChallengePool();
  return buildLevel1Pool();
}
function getLevelNames(levelId) {
  if (levelId === '1') return LEVEL1_NAMES;
  if (levelId === '2') return LEVEL2_NAMES;
  if (levelId === '3') return LEVEL3_NAMES;
  if (levelId === '4') return LEVEL4_NAMES;
  if (levelId === '5') return LEVEL5_NAMES;
  if (levelId === 'c1') return [...new Set(buildChallengePool().map(p => p.name))];
  return LEVEL1_NAMES;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 다이어그램 4지선다 생성 — 동일 코드명이 오답에 포함되지 않도록 이름 기준으로 완전 필터링
function generateDiagramChoices(correctItem, pool) {
  const wrongPool = pool.filter(item => item.name !== correctItem.name);
  const wrong     = shuffle(wrongPool).slice(0, 3);
  return shuffle([correctItem, ...wrong]);
}

function selectDiagramChoice(selectedName, correctName) {
  clearQuestionTimer();
  // 중복 탭 방지
  document.querySelectorAll('.quiz-diagram-choice').forEach(el => {
    el.style.pointerEvents = 'none';
  });

  const speedMs  = Date.now() - _questionStartTime;
  const speedSec = speedMs / 1000;
  document.getElementById('quiz-speed').textContent = `${speedSec.toFixed(2)}s`;

  const isCorrect = selectedName === correctName;
  playSound(isCorrect ? 'correct' : 'wrong');
  _results.push({ name: correctName, isCorrect, speedSec });
  analytics.track('quiz_answer_given', {
    level_id: _currentLevel, mode: _currentMode,
    chord_name: correctName, is_correct: isCorrect,
    speed_sec: speedSec, question_no: _current + 1,
  });

  // 피드백 메세지
  showFeedbackMsg(pickFeedbackMsg(isCorrect, speedSec));

  // 피드백 색상 적용
  document.querySelectorAll('.quiz-diagram-choice').forEach(el => {
    if (el.dataset.name === selectedName && !isCorrect) {
      el.classList.add('quiz-diagram-choice--wrong');
    }
    if (el.dataset.name === correctName) {
      el.classList.add('quiz-diagram-choice--correct');
    }
  });

  // 다음 버튼 등장
  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.textContent = (_current === _questions.length - 1) ? '결과 보기' : '다음';
  nextBtn.classList.add('quiz-next-btn--active');
}

// ── 뷰 상태 ──────────────────────────────────────────────────
let _currentView  = 'level-select'; // 'level-select' | 'mode-select' | 'quiz'
let _currentLevel = null;
let _currentMode  = null;

// ── 퀴즈 상태 ─────────────────────────────────────────────────
let _questions         = [];
let _current           = 0;
let _questionStartTime = 0; // 문제 노출 시각 (ms)
let _sessionStartTime  = 0; // 퀴즈 세션 시작 시각 (ms) — 훈련 시간 측정용
let _results           = []; // { name, isCorrect, speedSec } 배열
let _attendanceAchieved = false; // 이번 세션에서 오늘 1회 달성 여부
let _newRecordSpeed     = null;  // 신기록 달성 시 기록값 (null이면 미달성)
let _timerTimeout       = null;  // 문제 타임어택 타이머 ID
let _countdownTimers    = [];    // 카운트다운 setTimeout ID 목록

const TRAINING_STATS_KEY = 'training_stats';

// ── 효과음 ────────────────────────────────────────────────────
let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// 짧은 게임 비프 (카운트다운용)
function _playBeep(freq, duration) {
  try {
    const ctx = _getAudioCtx();
    const t   = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.20, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch (e) {}
}

// 벨/차임 질감: 비조화 배음 4개 + 피치 글라이드 + 빠른 어택
function _playBell(freq, startDelay, gainVal) {
  try {
    const ctx = _getAudioCtx();
    const t   = ctx.currentTime + startDelay;
    // 배음 비율·게인·감쇠 (높을수록 찰랑 질감)
    const partials = [
      { r: 1,      g: gainVal,        d: 0.8  },
      { r: 2.756,  g: gainVal * 0.55, d: 0.5  },
      { r: 5.404,  g: gainVal * 0.35, d: 0.3  },
      { r: 8.933,  g: gainVal * 0.18, d: 0.15 },
      { r: 13.46,  g: gainVal * 0.08, d: 0.08 },
    ];
    partials.forEach(({ r, g, d }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      // 피치 글라이드: 어택 직후 1.5% 하강 (실제 벨 특성)
      osc.frequency.setValueAtTime(freq * r * 1.015, t);
      osc.frequency.exponentialRampToValueAtTime(freq * r, t + 0.02);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(g, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);
      osc.start(t);
      osc.stop(t + d + 0.01);
    });
  } catch (e) {}
}

function playSound(type) {
  if (type === 'correct') {
    _playBell(523.25, 0,    0.20);  // C5 → 상승
    _playBell(698.46, 0.13, 0.20);  // F5
  } else if (type === 'wrong') {
    _playBell(349.23, 0,    0.20);  // F4 → 하강
    _playBell(261.63, 0.13, 0.20);  // C4
  }
}

// ── 타이머 함수 ───────────────────────────────────────────────

/** 진행 중인 타이머 + 바 애니메이션 동결 */
function clearQuestionTimer() {
  if (_timerTimeout !== null) {
    clearTimeout(_timerTimeout);
    _timerTimeout = null;
  }
  const bar = document.getElementById('quiz-timer-bar');
  if (!bar) return;
  // CSS transition 중이더라도 현재 위치에서 동결
  const computed = getComputedStyle(bar).width;
  bar.style.transition = 'none';
  bar.style.width = computed;
}

/** 문제 타이머 시작 — timeSec이 null/0 이면 바 숨김 */
function startQuestionTimer(timeSec) {
  clearQuestionTimer();
  const bar = document.getElementById('quiz-timer-bar');
  if (!bar) return;

  if (!timeSec) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = '';
  bar.style.transition  = 'none';
  bar.style.width       = '100%';
  bar.classList.remove('quiz-timer-bar--urgent');

  // 레이아웃 플러시 후 트랜지션 시작
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = `width ${timeSec}s linear`;
    bar.style.width      = '0%';
  }));

  _timerTimeout = setTimeout(() => handleTimeout(), timeSec * 1000);
}

/** 시간 초과 처리 */
function handleTimeout() {
  _timerTimeout = null;
  const { name } = _questions[_current];

  // 제한시간 값 그대로 기록 (오답)
  const _lvCfg  = LEVEL_CONFIGS.find(c => c.id === _currentLevel);
  const timeSec = _lvCfg?.timeSec ?? 0;
  _results.push({ name, isCorrect: false, speedSec: timeSec });
  analytics.track('quiz_timeout', {
    level_id: _currentLevel, mode: _currentMode,
    chord_name: name, question_no: _current + 1,
  });

  playSound('wrong');
  document.getElementById('quiz-speed').textContent = '시간 초과';
  showFeedbackMsg(pickFeedbackMsg(false, timeSec, true));

  if (_currentMode === 'name-from-diagram') {
    document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
      btn.style.pointerEvents = 'none';
      if (btn.textContent === name) btn.classList.add('quiz-choice-btn--correct');
    });
  } else {
    document.querySelectorAll('.quiz-diagram-choice').forEach(el => {
      el.style.pointerEvents = 'none';
      if (el.dataset.name === name) el.classList.add('quiz-diagram-choice--correct');
    });
  }

  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.textContent = (_current === _questions.length - 1) ? '결과 보기' : '다음';
  nextBtn.classList.add('quiz-next-btn--active');
}

/** quiz-inner를 quiz-wrap 안 공간에 맞게 비례 축소 */
function fitQuizToScreen() {
  const inner = document.querySelector('.quiz-inner');
  const wrap  = document.querySelector('.quiz-wrap');
  if (!inner || !wrap) return;

  // 초기화: 인라인 스타일 제거 → CSS flex:1 + max-height 적용
  inner.style.zoom   = '1';
  inner.style.height = '';

  requestAnimationFrame(() => {
    const naturalH = inner.scrollHeight;  // 콘텐츠 자연 높이

    // quiz-wrap content area (padding 제외) — flex:1 기준 실제 가용 높이
    const wStyle = getComputedStyle(wrap);
    const padT   = parseFloat(wStyle.paddingTop)    || 0;
    const padB   = parseFloat(wStyle.paddingBottom) || 0;
    const availH = wrap.clientHeight - padT - padB;

    if (naturalH > availH) {
      // height를 naturalH로 고정 후 zoom 적용
      // → 시각 높이 = naturalH × zoom = availH (딱 맞음)
      inner.style.height = naturalH + 'px';
      inner.style.zoom   = String(availH / naturalH);
    } else {
      inner.style.height = '';  // flex:1 자동 조절로 복귀
      inner.style.zoom   = '1';
    }
  });
}

function startCountdown(callback) {
  updateProgressDots();

  const canvas      = document.getElementById('quiz-canvas');
  const wrap        = canvas.parentElement;
  const _nameDisplay = document.getElementById('quiz-chord-name-display');

  // 카운트 중에는 항상 canvas-wrap 표시 (두 모드 모두 동일 크기 5:4)
  wrap.style.display = '';
  if (_nameDisplay) _nameDisplay.style.display = 'none';
  // 타임바: 빈 상태로 표시
  const _bar = document.getElementById('quiz-timer-bar');
  if (_bar) { _bar.style.display = ''; _bar.style.transition = 'none'; _bar.style.width = '0%'; }

  const cs = getComputedStyle(wrap);
  const W  = Math.round(wrap.clientWidth
               - parseFloat(cs.paddingLeft)
               - parseFloat(cs.paddingRight));
  const H  = Math.round(W * BASE_H / BASE_W);
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 피드백·속도·다음버튼 초기화
  document.getElementById('quiz-feedback-msg').textContent = '';
  document.getElementById('quiz-speed').textContent = '';
  const _nextBtn1 = document.getElementById('quiz-next-btn');
  _nextBtn1.textContent = '다음';
  _nextBtn1.classList.remove('quiz-next-btn--active');

  // 4지선다: 모드에 맞는 회색 플레이스홀더 표시
  const choicesEl   = document.getElementById('quiz-choices');
  choicesEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const ghost = document.createElement('div');
    ghost.className = 'quiz-choice-ghost';
    choicesEl.appendChild(ghost);
  }

  const el = document.getElementById('quiz-countdown');

  const showNum = (n) => {
    el.style.display = ''; // 인라인 스타일 초기화 (재시작 시 대비)
    el.classList.remove('active');
    void el.offsetWidth; // reflow → 애니메이션 재시작
    el.textContent = String(n);
    el.classList.add('active');
  };

  // 이전 카운트다운 잔여 타이머 제거
  _countdownTimers.forEach(id => clearTimeout(id));
  _countdownTimers = [];

  fitQuizToScreen();
  showNum(3); _playBeep(600, 0.06);
  _countdownTimers.push(setTimeout(() => { showNum(2); _playBeep(600, 0.06); }, 1000));
  _countdownTimers.push(setTimeout(() => { showNum(1); _playBeep(600, 0.06); }, 2000));
  _countdownTimers.push(setTimeout(() => {
    _countdownTimers = [];
    el.classList.remove('active');
    el.style.display = 'none';
    _playBell(1046.50, 0, 0.20);
    callback();
  }, 3000));
}

function initQuiz() {
  clearQuestionTimer();
  const pool     = buildLevelPool(_currentLevel);
  const cfg      = LEVEL_CONFIGS.find(c => c.id === _currentLevel);
  const quizCount = cfg?.count ?? QUIZ_COUNT;
  // 셔플 후 이름 중복 제거 — 동일 코드명은 한 세션에 하나만 출제
  const seen = new Set();
  const deduped = shuffle(pool).filter(item => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
  console.log(`[Quiz] LEVEL ${_currentLevel} 풀 크기: ${pool.length}개 → 이름 중복제거: ${deduped.length}개`);
  _questions        = deduped.slice(0, quizCount);
  _current          = 0;
  _results          = [];
  _sessionStartTime = Date.now(); // 훈련 시간 측정 시작
  startCountdown(() => renderQuestion());
}

// 정답 1개 + 오답 3개 랜덤 선택 후 셔플
function generateChoices(correctName) {
  const others = getLevelNames(_currentLevel).filter(n => n !== correctName);
  const wrong  = shuffle(others).slice(0, 3);
  return shuffle([correctName, ...wrong]);
}

function renderQuestion() {
  const { name, entry } = _questions[_current];

  updateProgressDots();

  // 공통 초기화
  document.getElementById('quiz-speed').textContent = '';
  const _nextBtn2 = document.getElementById('quiz-next-btn');
  _nextBtn2.textContent = '다음';
  _nextBtn2.classList.remove('quiz-next-btn--active');

  const canvasWrap  = document.querySelector('.quiz-canvas-wrap');
  const nameDisplay = document.getElementById('quiz-chord-name-display');
  const container   = document.getElementById('quiz-choices');
  container.innerHTML = '';

  if (_currentMode === 'name-from-diagram') {
    // ── 다이어그램 보여주기, 코드명 숨기기 ───────────────────
    canvasWrap.style.display  = '';
    nameDisplay.style.display = 'none';

    const canvas = document.getElementById('quiz-canvas');
    const wrap   = canvas.parentElement;
    const cs     = getComputedStyle(wrap);
    const W      = Math.round(wrap.clientWidth
                     - parseFloat(cs.paddingLeft)
                     - parseFloat(cs.paddingRight));
    const H      = Math.round(W * BASE_H / BASE_W);
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    drawLibEntry(canvas, entry);

    // 텍스트 4지선다
    const choices = generateChoices(name);
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className   = 'quiz-choice-btn';
      btn.textContent = choice;
      btn.addEventListener('pointerup', () => selectChoice(choice, name));
      container.appendChild(btn);
    });

  } else {
    // ── 코드명 보여주기, 다이어그램 캔버스 숨기기 ─────────────
    canvasWrap.style.display  = 'none';
    nameDisplay.style.display = '';
    nameDisplay.textContent   = name;

    // 다이어그램 4지선다 — 같은 코드명은 오답에서 제외
    const pool    = buildLevelPool(_currentLevel);
    const choices = generateDiagramChoices({ name, entry }, pool);

    choices.forEach(item => {
      const div = document.createElement('div');
      div.className    = 'quiz-diagram-choice';
      div.dataset.name = item.name;
      const cv = document.createElement('canvas');
      div.appendChild(cv);
      container.appendChild(div);
      div.addEventListener('pointerup', () => selectDiagramChoice(item.name, name));
    });

    // 레이아웃 확정 후 캔버스 드로잉 + 화면 맞춤
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const divs = container.querySelectorAll('.quiz-diagram-choice');
      choices.forEach((item, i) => {
        const cv = divs[i].querySelector('canvas');
        const w  = cv.offsetWidth;
        const h  = Math.round(w * BASE_H / BASE_W);
        cv.width  = w;
        cv.height = h;
        drawLibEntry(cv, item.entry);
      });
      fitQuizToScreen();
    }));
  }

  if (_currentMode === 'name-from-diagram') fitQuizToScreen();
  _questionStartTime = Date.now();
  const _lvCfg = LEVEL_CONFIGS.find(c => c.id === _currentLevel);
  startQuestionTimer(_lvCfg?.timeSec ?? null);
}

function selectChoice(selected, correct) {
  clearQuestionTimer(); // 타임어택 타이머 중단
  // 중복 탭 방지
  document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
    btn.style.pointerEvents = 'none';
  });

  // 반응속도 계산
  const speedMs  = Date.now() - _questionStartTime;
  const speedSec = (speedMs / 1000).toFixed(2);

  // 반응속도 상단 표시
  document.getElementById('quiz-speed').textContent = `${speedSec}s`;

  const isCorrect = selected === correct;
  playSound(isCorrect ? 'correct' : 'wrong');

  // 결과 기록
  _results.push({ name: correct, isCorrect, speedSec: speedMs / 1000 });
  analytics.track('quiz_answer_given', {
    level_id: _currentLevel, mode: _currentMode,
    chord_name: correct, is_correct: isCorrect,
    speed_sec: speedMs / 1000, question_no: _current + 1,
  });

  // 피드백 메세지
  showFeedbackMsg(pickFeedbackMsg(isCorrect, speedMs / 1000));

  // 피드백 색상 적용
  document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
    if (btn.textContent === selected && !isCorrect) {
      btn.classList.add('quiz-choice-btn--wrong');
    }
    if (btn.textContent === correct) {
      btn.classList.add('quiz-choice-btn--correct');
    }
  });

  // 다음 버튼 등장
  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.textContent = (_current === _questions.length - 1) ? '결과 보기' : '다음';
  nextBtn.classList.add('quiz-next-btn--active');
}

function advanceQuestion() {
  if (_current < _questions.length - 1) {
    _current++;
    renderQuestion();
  } else {
    showResultModal();
  }
}

// ── 세션 stats 저장 ──────────────────────────────────────────
function saveSessionStats() {
  const levelId = _currentLevel;
  const key     = `quiz_stats_level${levelId}`;
  const all     = loadLevelStats(levelId);
  const stats   = all[_currentMode];

  const correctResults = _results.filter(r => r.isCorrect);
  const sessionCorrect = correctResults.length;
  const sessionAvg     = correctResults.length > 0
    ? Math.round(correctResults.reduce((s, r) => s + r.speedSec, 0) / correctResults.length * 1000) / 1000
    : null;

  stats.totalPlayed       += _results.length;
  stats.totalCorrect      += sessionCorrect;
  stats.sessionsCompleted += 1;
  // 최고기록 = 전문제 정답 달성 세션의 정답 평균 중 역대 최솟값
  _newRecordSpeed = null;
  const isPerfect = correctResults.length === _results.length;
  if (isPerfect && sessionAvg !== null && (stats.bestSpeedSec === null || sessionAvg < stats.bestSpeedSec)) {
    stats.bestSpeedSec = sessionAvg;
    _newRecordSpeed    = sessionAvg;
  }

  all[_currentMode] = stats;
  localStorage.setItem(key, JSON.stringify(all));

  // 레벨 카드 통계 즉시 갱신
  updateLevelCardStats(levelId);

  // 차트용 로컬 히스토리 영구 기록 — 전부 오답이면 레벨 제한시간을 기록
  const _lvCfgForHistory = LEVEL_CONFIGS.find(c => c.id === _currentLevel);
  appendSessionHistory(sessionAvg ?? (_lvCfgForHistory?.timeSec ?? null));

  // DB 업로드용 로컬 캐시에 이번 세션 추가
  cacheSessionRecord();

  // 훈련소 전체 통계 갱신 (연속기록 / 훈련 시간 / 훈련 완료)
  const durationMin = Math.round((Date.now() - _sessionStartTime) / 60000 * 10) / 10;
  updateTrainingOverviewStats(Math.max(0.1, durationMin));
}

// ── 훈련소 전체 통계 갱신 ────────────────────────────────────
function updateTrainingOverviewStats(durationMin) {
  const today = new Date().toISOString().slice(0, 10);
  const raw   = localStorage.getItem(TRAINING_STATS_KEY);
  const stats = raw ? JSON.parse(raw) : {};

  // 날짜 바뀌면 오늘 카운터 리셋
  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }

  stats.today_sessions    = (stats.today_sessions    || 0) + 1;
  stats.total_completed   = (stats.total_completed   || 0) + 1;
  stats.training_time_min = Math.round(
    ((stats.training_time_min || 0) + durationMin) * 10
  ) / 10;

  // 스트릭 갱신 — 오늘 정확히 3번째 달성 시점에만 1회 적용
  if (stats.today_sessions === 1) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (stats.streak_last_counted_date === yesterday) {
      stats.streak = (stats.streak || 0) + 1;
    } else {
      stats.streak = 1; // 첫 스트릭 또는 연속 끊긴 후 재시작
    }
    stats.streak_last_counted_date = today;
    _attendanceAchieved = true; // 출석 완료 플래그
  }

  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  syncTrainingStatsToDB(); // 즉시 DB 반영 (fire-and-forget)
}

// ── 세션 로컬 캐시 & DB 플러시 ───────────────────────────────
const QUIZ_PENDING_KEY  = 'quiz_pending_sessions';
const QUIZ_HISTORY_KEY  = 'quiz_session_history';

/** localStorage에 저장된 Supabase 세션에서 userId, accessToken 추출 */
function _getAuthInfo() {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return { userId: null, accessToken: null };
    const parsed = JSON.parse(stored);
    return {
      userId:      parsed?.user?.id       ?? null,
      accessToken: parsed?.access_token   ?? null,
    };
  } catch (_) {
    return { userId: null, accessToken: null };
  }
}

/** 이번 세션 결과를 pending 캐시에 추가 */
function cacheSessionRecord() {
  const { userId } = _getAuthInfo();
  const today          = new Date().toISOString().slice(0, 10);
  const correctResults = _results.filter(r => r.isCorrect);
  const correctSpeeds  = correctResults.map(r => r.speedSec);
  const avg  = correctSpeeds.length > 0
    ? correctSpeeds.reduce((s, v) => s + v, 0) / correctSpeeds.length
    : 0;
  const best = correctSpeeds.length > 0 ? Math.min(...correctSpeeds) : 0;

  const record = {
    user_id:       userId,
    level_id:      parseInt(_currentLevel, 10),
    mode:          _currentMode,
    average_speed: Math.round(avg  * 1000) / 1000,
    best_speed:    Math.round(best * 1000) / 1000,
    correct_count: correctResults.length,
    created_at:    today,
  };

  const cache = JSON.parse(localStorage.getItem(QUIZ_PENDING_KEY) || '[]');
  cache.push(record);
  localStorage.setItem(QUIZ_PENDING_KEY, JSON.stringify(cache));
}

/** 세션 결과를 로컬 히스토리에 영구 저장 (차트용) */
function appendSessionHistory(avgSpeed) {
  const record = {
    level:     _currentLevel,
    mode:      _currentMode,
    avg_speed: avgSpeed,
    correct:   _results.filter(r => r.isCorrect).length,
    total:     _results.length,
    date:      new Date().toISOString().slice(0, 10),
    ts:        Date.now(),
  };
  const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
  history.push(record);
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history));
}

// ── 차트 모달 ─────────────────────────────────────────────────
let _chartSpeed    = null;
let _chartAccuracy = null;

function openChartModal(levelId, mode) {
  analytics.track('quiz_chart_opened', { level_id: levelId, mode });
  const modeLabel = mode === 'name-from-diagram' ? '코드이름 맞추기' : '운지법 맞추기';
  document.getElementById('chart-modal-title').textContent = `LEVEL ${levelId} · ${modeLabel}`;

  const history  = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
  const filtered = history
    .filter(r => r.level === levelId && r.mode === mode)
    .sort((a, b) => a.ts - b.ts);

  document.getElementById('chart-modal-overlay').classList.add('chart-modal-overlay--show');
  lucide.createIcons();

  // 레이아웃 확정 후 차트 렌더링
  requestAnimationFrame(() => {
    if (_chartSpeed)    { _chartSpeed.destroy();    _chartSpeed    = null; }
    if (_chartAccuracy) { _chartAccuracy.destroy(); _chartAccuracy = null; }

    if (filtered.length === 0) {
      document.getElementById('chart-speed-wrap').innerHTML    = '<p class="chart-empty">아직 기록이 없어요</p>';
      document.getElementById('chart-accuracy-wrap').innerHTML = '<p class="chart-empty">아직 기록이 없어요</p>';
      return;
    }

    // 날짜 레이블 (M/D 형식)
    const labels = filtered.map(r => {
      const d = new Date(r.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    // 평균 반응속도 차트 (null 제외)
    document.getElementById('chart-speed-wrap').innerHTML = '<canvas id="chart-speed"></canvas>';
    _chartSpeed = new Chart(document.getElementById('chart-speed'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: filtered.map(r => r.avg_speed),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true, tension: 0,
          pointRadius: filtered.length === 1 ? 4 : 0,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 2.2,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            ticks: { callback: v => parseFloat(v.toFixed(2)) + 's', font: { size: 11 } },
          },
        },
      },
    });

    // 정답률 차트
    document.getElementById('chart-accuracy-wrap').innerHTML = '<canvas id="chart-accuracy"></canvas>';
    _chartAccuracy = new Chart(document.getElementById('chart-accuracy'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: (() => {
            let cumCorrect = 0, cumTotal = 0;
            return filtered.map(r => {
              cumCorrect += r.correct;
              cumTotal   += r.total;
              return cumTotal > 0 ? Math.round(cumCorrect / cumTotal * 100) : 0;
            });
          })(),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.08)',
          fill: true, tension: 0,
          pointRadius: filtered.length === 1 ? 4 : 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 2.2,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            min: 0, max: 110,
            afterBuildTicks: axis => {
              axis.ticks = [0, 25, 50, 75, 100].map(v => ({ value: v }));
            },
            ticks: { callback: v => v + '%', font: { size: 11 } },
          },
        },
      },
    });
  });
}

function closeChartModal() {
  document.getElementById('chart-modal-overlay').classList.remove('chart-modal-overlay--show');
  if (_chartSpeed)    { _chartSpeed.destroy();    _chartSpeed    = null; }
  if (_chartAccuracy) { _chartAccuracy.destroy(); _chartAccuracy = null; }
}

/**
 * 오늘 이전 날짜의 캐시 레코드를 Supabase에 일괄 업로드하고 캐시에서 제거.
 * 로그인 상태일 때만 실행. 비로그인 세션은 user_id를 현재 유저로 채워 올림.
 */
async function flushPendingSessions() {
  const cache = JSON.parse(localStorage.getItem(QUIZ_PENDING_KEY) || '[]');
  if (cache.length === 0) return;

  const today     = new Date().toISOString().slice(0, 10);
  const toFlushRaw = cache.filter(r => r.created_at < today);
  if (toFlushRaw.length === 0) return;

  const { accessToken, userId } = _getAuthInfo();
  if (!accessToken || !userId) return; // 비로그인이면 다음 기회에

  // null user_id 레코드는 현재 로그인 유저로 채움
  const toFlush = toFlushRaw.map(r => ({ ...r, user_id: r.user_id ?? userId }));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_session_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(toFlush),
    });

    if (res.ok) {
      const toKeep = cache.filter(r => r.created_at >= today);
      localStorage.setItem(QUIZ_PENDING_KEY, JSON.stringify(toKeep));
      console.log(`[Quiz] ${toFlush.length}개 세션 레코드 DB 업로드 완료`);
    } else {
      const msg = await res.text().catch(() => res.status);
      console.warn('[Quiz] 세션 업로드 실패:', msg);
    }
  } catch (err) {
    console.warn('[Quiz] 세션 업로드 오류 (다음 실행 시 재시도):', err.message);
  }
}

// ── 결과 모달 ────────────────────────────────────────────────
function showResultModal() {
  saveSessionStats();

  const correctResults = _results.filter(r => r.isCorrect);
  const correctCount   = correctResults.length;
  const avgSec         = correctResults.length > 0
    ? correctResults.reduce((s, r) => s + r.speedSec, 0) / correctResults.length
    : null;
  analytics.track('quiz_completed', {
    level_id:      _currentLevel,
    mode:          _currentMode,
    correct_count: correctCount,
    total:         _results.length,
    avg_speed_sec: avgSec !== null ? Math.round(avgSec * 1000) / 1000 : null,
    is_perfect:    correctCount === _results.length,
    is_new_record: _newRecordSpeed !== null,
  });

  document.getElementById('result-modal-score').textContent =
    `${correctCount} / ${_results.length}`;
  document.getElementById('result-modal-avg').textContent =
    avgSec !== null ? `정답 평균  ${avgSec.toFixed(2)}s` : '정답 없음';

  const container = document.getElementById('result-items');
  container.innerHTML = '';
  _results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <span class="result-item-name">${r.name}</span>
      <span class="result-item-ox ${r.isCorrect ? 'result-item-ox--correct' : 'result-item-ox--wrong'}">${r.isCorrect ? 'O' : 'X'}</span>
      <span class="result-item-speed">${r.isCorrect ? r.speedSec.toFixed(2) + 's' : '—'}</span>
    `;
    container.appendChild(item);
  });

  document.getElementById('result-modal-overlay').classList.add('result-modal-overlay--show');

  // 신기록 달성 팝업
  if (_newRecordSpeed !== null) {
    const speed = _newRecordSpeed;
    _newRecordSpeed = null;
    setTimeout(() => showNewRecordModal(speed), 500);
  }

  // 오늘 1회 달성 시 출석 완료 팝업 (결과 모달 등장 후 딜레이)
  if (_attendanceAchieved) {
    _attendanceAchieved = false;
    const streak = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}').streak || 1;
    setTimeout(() => showAttendanceModal(streak), 650);
  }
}

function hideResultModal() {
  document.getElementById('result-modal-overlay').classList.remove('result-modal-overlay--show');
}

function closeResultModal() {
  hideResultModal();
  showModeSelect();
}

function retryFromResult() {
  analytics.track('quiz_retried', { level_id: _currentLevel, mode: _currentMode });
  hideResultModal();
  initQuiz();
}

// ── 신기록 모달 ───────────────────────────────────────────────
function showNewRecordModal(speedSec) {
  analytics.track('quiz_new_record', { level_id: _currentLevel, mode: _currentMode, speed_sec: speedSec });
  const speedEl = document.getElementById('newrecord-modal-speed');
  if (speedEl) speedEl.textContent = `${speedSec.toFixed(2)}s`;
  const overlay = document.getElementById('newrecord-modal-overlay');
  if (overlay) overlay.classList.add('newrecord-modal-overlay--show');
  lucide.createIcons();
}

function closeNewRecordModal() {
  const overlay = document.getElementById('newrecord-modal-overlay');
  if (overlay) overlay.classList.remove('newrecord-modal-overlay--show');
}

// ── 출석 완료 모달 ────────────────────────────────────────────
function showAttendanceModal(streak) {
  analytics.track('quiz_attendance_achieved', { streak });
  const streakEl = document.getElementById('attendance-modal-streak');
  if (streakEl) {
    streakEl.textContent = streak === 1 ? '오늘부터 시작 · 1일 연속' : `${streak}일 연속 달성`;
  }
  const overlay = document.getElementById('attendance-modal-overlay');
  if (overlay) overlay.classList.add('attendance-modal-overlay--show');
  lucide.createIcons();
}

function closeAttendanceModal() {
  const overlay = document.getElementById('attendance-modal-overlay');
  if (overlay) overlay.classList.remove('attendance-modal-overlay--show');
}

// ── 뒤로 가기 ────────────────────────────────────────────────
function handleBack() {
  if (_currentView === 'quiz') {
    analytics.track('quiz_abandoned', {
      level_id:          _currentLevel,
      mode:              _currentMode,
      questions_answered: _results.length,
    });
    showModeSelect();
  } else if (_currentView === 'mode-select') {
    showLevelSelect();
  } else {
    closeToTraining();
  }
}

// 훈련소로 종료
function closeToTraining() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// 레벨 선택 화면으로 복귀 (모드 선택 → 레벨 선택)
function showLevelSelect() {
  _currentView = 'level-select';
  const vsEl = document.getElementById('view-level-select');
  const vmEl = document.getElementById('view-mode-select');
  vmEl.classList.add('quiz-view--right');
  vsEl.classList.remove('quiz-view--left');
  // 열려있던 카드 닫기
  document.querySelectorAll('.level-card--open').forEach(c => {
    c.classList.remove('level-card--open');
    const b = c.querySelector('.level-card-body');
    if (b) b.style.maxHeight = '0';
  });
  updateTopBar('level-select');
}

// 모드 선택 화면으로 복귀 (퀴즈 → 모드 선택)
function showModeSelect() {
  // 퀴즈 이탈 시 카운트다운 + 문제 타이머 모두 정리
  _countdownTimers.forEach(id => clearTimeout(id));
  _countdownTimers = [];
  clearQuestionTimer();
  hideResultModal();
  _currentView = 'mode-select';
  const vmEl = document.getElementById('view-mode-select');
  const vqEl = document.getElementById('view-quiz');
  vqEl.classList.add('quiz-view--right');
  vmEl.classList.remove('quiz-view--left');
  updateTopBar('mode-select');
}

// 레벨 선택 → 모드 선택
function startLevel(levelId) {
  const cfg = LEVEL_CONFIGS.find(c => c.id === levelId);
  analytics.track('quiz_level_started', {
    level_id:   levelId,
    level_name: cfg?.name     ?? '',
    is_premium: cfg?.premium  ?? false,
    pool_ready: cfg?.poolReady ?? false,
  });
  _currentLevel = levelId;
  _currentView  = 'mode-select';
  const vsEl = document.getElementById('view-level-select');
  const vmEl = document.getElementById('view-mode-select');
  vsEl.classList.add('quiz-view--left');
  vmEl.classList.remove('quiz-view--right');
  updateTopBar('mode-select');
}

// 모드 선택 → 퀴즈 시작
function startQuiz(mode) {
  if (mode !== 'name-from-diagram' && mode !== 'diagram-from-name') return;
  analytics.track('quiz_mode_selected', { level_id: _currentLevel, mode });
  _currentMode = mode;
  _currentView = 'quiz';
  const vmEl = document.getElementById('view-mode-select');
  const vqEl = document.getElementById('view-quiz');
  vmEl.classList.add('quiz-view--left');
  vqEl.classList.remove('quiz-view--right');
  updateTopBar('quiz');
  initQuiz();
}

// 진행 dots 업데이트
function updateProgressDots() {
  const el = document.getElementById('quiz-progress-dots');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < _questions.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'quiz-progress-dot' + (i === _current ? ' quiz-progress-dot--active' : '');
    el.appendChild(dot);
  }
}

// 탑바 아이콘·텍스트 전환
function updateTopBar(view) {
  const backBtn = document.getElementById('back-btn');
  const center  = document.getElementById('quiz-topbar-center');
  if (view === 'level-select') {
    backBtn.style.visibility = '';
    backBtn.innerHTML = '<i data-lucide="x"></i>';
    center.innerHTML  = '';
  } else if (view === 'mode-select') {
    backBtn.style.visibility = '';
    backBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
    center.innerHTML  = '';
  } else {
    backBtn.style.visibility = 'hidden'; // 퀴즈 중 이탈 버튼 제거
    center.innerHTML  = '<div id="quiz-progress-dots" class="quiz-progress-dots"></div>';
  }
  lucide.createIcons();
}

// ── 튜토리얼 캐러셀 ──────────────────────────────────────────
function initModeCarousel() {
  const track = document.getElementById('mode-carousel-track');
  if (!track) return;

  const cards    = track.querySelectorAll('.mode-carousel-card');
  const dots     = document.querySelectorAll('.mode-carousel-dot');
  const total    = cards.length;
  let current    = 0;
  let startX     = 0;
  let isDragging = false;

  function goTo(index) {
    current = Math.max(0, Math.min(index, total - 1));
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle('mode-carousel-dot--active', i === current);
    });
  }

  track.addEventListener('pointerdown', e => {
    startX     = e.clientX;
    isDragging = true;
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener('pointerup', e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.clientX - startX;
    if      (diff < -40) goTo(current + 1);
    else if (diff >  40) goTo(current - 1);
  });

  track.addEventListener('pointercancel', () => { isDragging = false; });

  track.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 5) e.preventDefault();
  }, { passive: false });
}

// ── DOMContentLoaded ──────────────────────────────────────────
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

  analytics.track('quiz_page_viewed', { from: 'training' });
  buildLevelList();
  initModeCarousel();
  // initQuiz()는 startLevel()에서 호출

  // 화면 회전 등 크기 변경 시 재계산
  window.addEventListener('resize', () => {
    if (_currentView === 'quiz') fitQuizToScreen();
  });

  // 전일 이전 세션 캐시 → DB 플러시 (백그라운드)
  flushPendingSessions();
});
