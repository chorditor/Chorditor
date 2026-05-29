// ═══════════════════════════════════════════════════════════════
// 캔버스 상수 (canvas_structure.md 기준 — home.js와 동일)
// ═══════════════════════════════════════════════════════════════
const STRINGS        = 6;
const FRETS          = 4;
const BASE_OPEN_W    = 70;
const BASE_PAD_L     = 35;   // nut 포함 시각 중앙정렬: tl=(BASE_W-FBW+nutW)/2=105, PAD_L=105-OPEN_W
const BASE_PAD_R     = 95;   // 우측 여백 = BASE_W - tl - FBW = 440-105-240 = 95
const BASE_PAD_T     = 80;
const BASE_PAD_B     = 80;
const BASE_FBW       = 240;
const BASE_FBH       = 192;
const BASE_W         = BASE_PAD_L + BASE_OPEN_W + BASE_FBW + BASE_PAD_R;  // 440
const BASE_H         = BASE_PAD_T + BASE_FBH + BASE_PAD_B;                 // 352
const EXPORT_BASE_W  = 100;  // 이미지 저장 1배 기준 너비
const EXPORT_BASE_H  = 80;   // 이미지 저장 1배 기준 높이 (5:4)

let RATIO = 1;

const r  = () => RATIO;
const W  = () => Math.round(BASE_W  * r());
const CH = () => Math.round(BASE_H  * r());
const TL = () => Math.round((BASE_PAD_L + BASE_OPEN_W) * r());
const TR = () => Math.round((BASE_PAD_L + BASE_OPEN_W + BASE_FBW) * r());
const TT = () => Math.round(BASE_PAD_T * r());
const TB = () => Math.round((BASE_PAD_T + BASE_FBH) * r());
const FW = () => (TR() - TL()) / FRETS;
const SH = () => (TB() - TT()) / (STRINGS - 1);
const DS = () => Math.round(SH() * 0.95);

// ═══════════════════════════════════════════════════════════════
// 코드명 상태
// ═══════════════════════════════════════════════════════════════
const ROOTS_SHARP = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const ROOTS_FLAT  = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];

// ── 코드명 추천 엔진 ──

// ═══════════════════════════════════════════════════════════════
// 렌더링: drawCanvas (home.js와 동일 — 순수 캔버스 드로잉)
// ═══════════════════════════════════════════════════════════════
function drawCanvas(c, ratio, data = null) {
  const _root     = data ? data.root     : selectedRoot;
  const _triad    = data ? data.triad    : selectedTriad;
  const _seventh  = data ? data.seventh  : selectedSeventh;
  const _func     = data ? data.func     : selectedFunc;
  const _tensions = data ? data.tensions : selectedTensions;
  const _bass     = data ? data.bass     : selectedBass;
  const _dots     = data ? data.dots     : dots;
  const _barre    = data ? data.barre    : barreActive;
  const _openMute = data ? data.openMute : openMute;
  const _fingerNumMode = data ? data.fingerNumMode : fingerNumMode;
  const _fretNum  = data
    ? (data.fretNumber >= 2 ? String(data.fretNumber) : '')
    : (currentFretNumber >= 2 ? String(currentFretNumber) : '');
  const _nameOverride = data ? (data.nameOverride ?? null) : null;

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
  const nutW = Math.max(4, 9 * sc);
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

  // 바레 커버 범위
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

  // barre
  const barreFrets = [];
  Object.keys(_barreCount).filter(f => _barreCount[f] >= 2).map(Number).forEach(f => {
    if (!_barre[f]) return;
    let minS, maxS;
    if (data && data.barreRange) {
      minS = data.barreRange.min; maxS = data.barreRange.max;
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

  // dot
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
  c.fillRect(tl, 0, w - tl, tt - ds/2);
  c.fillStyle = '#242729';
  c.textBaseline = 'alphabetic';

  const bSize = Math.round(48 * sc);
  const sSize = Math.round(30 * sc);
  const bY    = tt - Math.round(30 * sc);
  const sY    = bY - Math.round(14 * sc);

  let cx = tl;
  if (_nameOverride !== null) {
    if (_nameOverride) {
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText(_nameOverride, cx, bY);
    }
  } else {
    const base = _root + _triad + _seventh + (_func === 'b5' ? '' : _func);
    c.font = `500 ${bSize}px "Pretendard", sans-serif`;
    c.fillText(base, cx, bY);
    cx += c.measureText(base).width;

    if (_func === 'b5') {
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText('(b5)', cx, sY);
      cx += c.measureText('(b5)').width;
    }

    if (_tensions && _tensions.length) {
      const ts = '(' + _tensions.join(',') + ')';
      c.font = `500 ${sSize}px "Pretendard", sans-serif`;
      c.fillText(ts, cx, sY);
      cx += c.measureText(ts).width;
    }

    if (_bass) {
      c.font = `500 ${bSize}px "Pretendard", sans-serif`;
      c.fillText('/' + _bass, cx, bY);
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

// ═══════════════════════════════════════════════════════════════
// 전역 상태 변수 (user_project.html 전용)
// ═══════════════════════════════════════════════════════════════

// 프로젝트 뷰 상태
let currentProjectId   = null;
let isEditMode         = true;
let contextProjectId   = null;

// 탭 네비게이션 상태 (home.html SPA에서 이관 — _updateBackBtn 등에서 참조)
let _activeTab         = 'projects';
let _homeSubView       = 'home';
let _projectsSubView   = 'project';  // user_project는 항상 개별 프로젝트 뷰

// 에디터 상태 폴백 (drawCanvas data=null 호출 시 / _doSavePNG 에서 사용)
let fingerNumMode   = false;
let selectedRoot    = 'A';
let selectedTriad   = '';
let selectedSeventh = '';
let selectedFunc    = '';
let selectedTensions = [];
let selectedBass    = '';
let dots            = [];
let barreActive     = {};
let openMute        = ['open','open','open','open','open','open'];
let rootMode        = false;
let rootIndex       = -1;
let accidental      = 'sharp';

let _chordDirty = false;

// ═══════════════════════════════════════════════════════════════
// PNG 저장
// ═══════════════════════════════════════════════════════════════

// 이미지 저장 배율 드롭다운 (에디터/라이브러리 공용)
let _scaleDropdownMode = 'editor'; // 'editor' | 'library'
let _scaleDropdownClose = null;

function showScaleDropdown(anchorEl, mode) {
  const dd = document.getElementById('scale-dropdown');
  if (!dd) return;
  _scaleDropdownMode = mode;

  // 잠금 상태 갱신
  const max = getPlanLimit('maxScale');
  dd.querySelectorAll('.scale-dropdown-item').forEach(item => {
    const v = parseFloat(item.dataset.scale);
    item.classList.toggle('locked', v > max);
  });

  // 위치: 버튼 우측 끝 기준 정렬, 버튼 위쪽에 표시
  const rect = anchorEl.getBoundingClientRect();
  dd.style.left   = '';
  dd.style.right  = (window.innerWidth - rect.right) + 'px';
  dd.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
  dd.style.top    = '';
  dd.classList.add('open');

  // 외부 클릭 시 닫기
  if (_scaleDropdownClose) document.removeEventListener('pointerdown', _scaleDropdownClose);
  _scaleDropdownClose = (e) => {
    if (!dd.contains(e.target) && e.target !== anchorEl) closeScaleDropdown();
  };
  setTimeout(() => document.addEventListener('pointerdown', _scaleDropdownClose), 0);
}

function closeScaleDropdown() {
  const dd = document.getElementById('scale-dropdown');
  if (dd) dd.classList.remove('open');
  if (_scaleDropdownClose) {
    document.removeEventListener('pointerdown', _scaleDropdownClose);
    _scaleDropdownClose = null;
  }
}

async function onScaleSelect(el) {
  const scale = parseFloat(el.dataset.scale);
  if (isNaN(scale)) return;
  closeScaleDropdown();
  if (el.classList.contains('locked')) { showUpgradeModal('scale_limit'); return; }
  if (_scaleDropdownMode === 'library') {
    await _doExportLibChordImage(scale);
  } else {
    await _doSavePNG(scale);
  }
}

async function _doSavePNG(scale) {
  await refreshPlanFromDB();
  if (!canUseScale(scale)) { showUpgradeModal('scale_limit'); return; }

  const exp = document.createElement('canvas');
  exp.width  = Math.round(EXPORT_BASE_W * scale);
  exp.height = Math.round(EXPORT_BASE_H * scale);
  const ec = exp.getContext('2d');
  const _es = EXPORT_BASE_W / BASE_W * scale;
  ec.scale(_es, _es);
  drawCanvas(ec, 1);

  const base64   = exp.toDataURL('image/png').split(',')[1];
  const fileName = buildChordName() + '_chord.png';

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const SaveImage = window.Capacitor.Plugins.SaveImage;
      await SaveImage.saveToGallery({ base64, fileName: fileName.replace(/[^\w.\-]/g, '_') });
      showSaveToast();
      analytics.track('image_saved', { scale, source: 'editor', success: true });
    } catch (e) { console.error('저장 실패:', e); analytics.track('image_saved', { scale, source: 'editor', success: false }); }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    analytics.track('image_saved', { scale, source: 'editor', success: true });
  }
}

// 드롭다운 진입점 (에디터 저장 버튼 → showScaleDropdown 호출로 대체)
async function savePNG() { /* 직접 호출 시 드롭다운 없이 scale=1 */ await _doSavePNG(1); }
// resizeCanvas 제거됨 (에디터 전용) — resize 리스너 불필요

// ═══════════════════════════════════════════════════════════════
// fret 입력
// ═══════════════════════════════════════════════════════════════
let currentFretNumber = 2;

// Audio Engine (Karplus-Strong)
// ═══════════════════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
const STRUM_INTERVAL = 0.008;

function playChord(chord) {
  const notes = [];
  const fretBase = chord.fretNumber >= 2 ? chord.fretNumber - 2 : 0;
  const capoOffset = getProject(currentProjectId)?.capo ?? 0;
  const barreMap = buildBarreMap(chord.dots, chord.barre || {});
  for (let s = 0; s < STRINGS; s++) {
    if (chord.openMute[s] === 'mute') continue;
    const sd = chord.dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const barreFret = barreMap[s];
    let fret = 0;
    if (dot !== undefined && barreFret !== undefined) {
      fret = fretBase + Math.max(dot.f, barreFret);
    } else if (dot !== undefined) {
      fret = fretBase + dot.f;
    } else if (barreFret !== undefined) {
      fret = fretBase + barreFret;
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret + capoOffset });
  }
  const sorted = notes.sort((a, b) => b.s - a.s);
  if (!sorted.length) return;
  GuitarAudio.strumNotes(sorted.map(n => n.midi), STRUM_INTERVAL);
}

function buildBarreMap(dotList, barre) {
  const count = {};
  dotList.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  const map = {};
  Object.keys(count).filter(f => count[f] >= 2 && barre[Number(f)]).forEach(f => {
    const fNum = Number(f);
    const same = dotList.filter(d => d.f === fNum);
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) map[s] = fNum;
  });
  return map;
}

// ═══════════════════════════════════════════════════════════════
function showStorageWarning() {
  document.getElementById('storage-warning').classList.remove('hidden');
}

function hideStorageWarning() {
  document.getElementById('storage-warning').classList.add('hidden');
}






// 저장 완료 체크 애니메이션
let _toastTimer = null;
function showSaveToast() {
  const el = document.getElementById('save-toast');
  if (!el) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  // 애니메이션 재시작을 위해 클래스 제거 후 reflow
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
}


// ── 온보딩 오버레이 없음 (home.html) — no-op 스텁 ────────────
function showOnboarding() {}
function hideOnboarding() {}

// ── 공지 팝업 ────────────────────────────────────────────────────
let _currentNoticeId = null;

async function checkAndShowNotice() {
  if (!_authReady) return;
  const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
  if (!stored) return;
  let session;
  try { session = JSON.parse(stored); } catch(e) { return; }
  if (!session?.access_token || !session?.user?.id) return;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + session.access_token,
  };

  try {
    // 읽은 공지 ID 목록
    const readsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/notice_reads?select=notice_id&user_id=eq.${session.user.id}`,
      { headers }
    );
    const reads = readsResp.ok ? await readsResp.json() : [];
    const readIds = reads.map(r => r.notice_id);

    // 안 읽은 공지 중 가장 오래된 것 1개
    let url = `${SUPABASE_URL}/rest/v1/notices?select=id,title,message&order=created_at.asc&limit=1`;
    if (readIds.length > 0) {
      url += `&id=not.in.(${readIds.join(',')})`;
    }
    const noticesResp = await fetch(url, { headers });
    const notices = noticesResp.ok ? await noticesResp.json() : [];
    if (!notices?.length) return;

    const notice = notices[0];
    _currentNoticeId = notice.id;
    document.getElementById('notice-modal-title').textContent = notice.title;
    document.getElementById('notice-modal-message').textContent = notice.message.replace(/\\n/g, '\n');
    document.getElementById('notice-modal-overlay').classList.remove('hidden');
  } catch(e) { /* 무시 */ }
}

async function closeNoticeModal() {
  document.getElementById('notice-modal-overlay').classList.add('hidden');
  if (!_currentNoticeId) return;
  const noticeId = _currentNoticeId;
  _currentNoticeId = null;

  const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
  if (!stored) return;
  let session;
  try { session = JSON.parse(stored); } catch(e) { return; }
  if (!session?.access_token || !session?.user?.id) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/notice_reads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + session.access_token,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ user_id: session.user.id, notice_id: noticeId }),
    });
  } catch(e) { /* 무시 */ }
}




function renderAuthUI(user) {
  // 로그인 UI는 노출하지 않음 — 자동 로그인으로만 처리
  // 플랜 배지만 갱신
  renderPlanBadge();
}


// 플랜 관련 함수는 plan.js로 이전됨

// ── 배율 옵션 잠금 제어 ─────────────────────────────────────────
function updateExportScaleOptions() {
  const max = getPlanLimit('maxScale');
  const dd = document.getElementById('scale-dropdown');
  if (!dd) return;
  dd.querySelectorAll('.scale-dropdown-item').forEach(item => {
    item.classList.toggle('locked', parseFloat(item.dataset.scale) > max);
  });
}

// ── 요금제 바텀시트 열기 ─────────────────────────────────────
function openPlanModal() {
  analytics.track('paywall_viewed', { trigger_source: 'upgrade_modal', current_plan: getPlan() });
  openPlanSheet('upgrade_modal');
}

// ── 업그레이드 유도 모달 ───────────────────────────────────────
const UPGRADE_MESSAGES = {
  project_limit: {
    title: '프로젝트 한도에 도달했습니다',
    desc: {
      free:     '무료 플랜은 프로젝트를 3개까지 만들 수 있습니다. Pro로 업그레이드하면 무제한으로 사용할 수 있습니다.',
      pro:      '',
    },
  },
  scale_limit: {
    title: '이 배율은 Pro 플랜 전용입니다',
    desc: {
      free:     'x2, x3 고화질 저장은 Pro 플랜에서 사용할 수 있습니다.',
      pro:      '',
    },
  },
};

function showUpgradeModal(reason) {
  const plan = getPlan();
  const msg = UPGRADE_MESSAGES[reason];
  if (!msg) return;
  document.getElementById('upgrade-modal-title').textContent = msg.title;
  document.getElementById('upgrade-modal-desc').textContent  = msg.desc[plan] || '';
  document.getElementById('upgrade-modal-overlay').classList.remove('hidden');
  analytics.track('paywall_viewed', { trigger_source: reason, current_plan: plan });
}

function closeUpgradeModal() {
  document.getElementById('upgrade-modal-overlay').classList.add('hidden');
}

// ── 사이드바 플랜 배지 ─────────────────────────────────────────
function renderPlanBadge() {
  const el = document.getElementById('sidebar-plan-badge');
  if (!el) return;
  const plan = getPlan();
  const labels = { free: 'FREE', pro: 'PRO' };
  el.textContent = labels[plan] || 'FREE';
  el.dataset.plan = plan;
}

function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

function updateProject(updated) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }
  saveProjects(projects);
}

// ═══════════════════════════════════════════════════════════════
// 네비게이션
// ═══════════════════════════════════════════════════════════════
// contextProjectId는 초기화 시점 이전에도 참조되므로 파일 상단에 선언
// (let 선언은 TDZ로 인해 선언 전 접근 시 ReferenceError 발생)


// ─── Android 네이티브 뒤로가기 (double-back to exit) ──────────
let _backPressTimestamp = 0;

function handleNativeBack() {
  const now = Date.now();
  if (now - _backPressTimestamp < 2000) {
    window.Capacitor?.Plugins?.App?.exitApp?.();
    return;
  }
  _backPressTimestamp = now;
  const toast = document.getElementById('exit-toast');
  if (!toast) return;
  toast.textContent = '한 번 더 누르면 앱이 종료됩니다';
  toast.classList.remove('visible');
  clearTimeout(toast._hideTimer);
  requestAnimationFrame(() => {
    toast.classList.add('visible');
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  });
}

function _updateBackBtn() {
  const show =
    (_activeTab === 'home' && _homeSubView !== 'home') ||
    (_activeTab === 'projects' && _projectsSubView !== 'list');
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  if (show) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// ─── navigateTo: 프로젝트 탭 내 개별 프로젝트 진입 ────────────
function navigateTo(view, projectId, opts = {}) {
  analytics.setScreen(view);
  analytics.track('screen_view', { view, project_id: projectId || null });
  stopPlayAll();
  stopMetronome();

  if (currentProjectId) {
    const currentLinesEl = document.getElementById('project-lines-' + currentProjectId);
    if (currentLinesEl) saveAllLines(currentProjectId, currentLinesEl);
  }

  if (view === 'project' && projectId) {
    // 프로젝트 탭으로 이동 후 개별 프로젝트 표시
    switchTab('projects');
    _projectsSubView = 'project';
    contextProjectId = null;
    isEditMode = true;

    document.getElementById('view-projects-list')?.classList.add('hidden');
    document.getElementById('view-project')?.classList.remove('hidden');
    _updateBackBtn();

    renderProjectView(projectId);
    if (screen.orientation?.unlock) { try { screen.orientation.unlock(); } catch(e) {} }

    const _p = loadProjects().find(p => p.id === projectId);
    if (_p) {
      const chordCount = (_p.arrangement || []).reduce((acc, l) => acc + (l.chords?.length || 0), 0);
      const ageDays = _p.createdAt
        ? Math.floor((Date.now() - new Date(_p.createdAt)) / 86400000)
        : null;
      analytics.track('project_opened', { project_id: projectId, chord_count: chordCount, age_days: ageDays });
    }
    return;
  }

  if (view === 'editor') {
    enterFromHome('editor');
    return;
  }

  if (view === 'library') {
    enterFromHome('library');
    return;
  }
}

function switchMainTab(tab) {
  if (tab === 'editor' || tab === 'library') enterFromHome(tab);
}

// ═══════════════════════════════════════════════════════════════
// 사이드바
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() { /* 사이드바 제거됨 — no-op */ }


function closeSidebar() { /* 사이드바 제거됨 — no-op */ }

function renderSidebar() {
  renderProjectsList();
}

function renderProjectsList() {
  const container = document.getElementById('projects-list-body');
  if (!container) return;

  const projects = loadProjects();
  const important = projects.filter(p => p.important).sort((a, b) => (a.importantOrder || 0) - (b.importantOrder || 0));
  const pinned    = projects.filter(p => p.pinned && !p.important).sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));
  const recent    = projects.filter(p => !p.pinned && !p.important).sort((a, b) => b.updatedAt - a.updatedAt);

  container.innerHTML = '';

  if (important.length > 0) _renderProjectsSection(container, '중요', important);
  if (pinned.length > 0)    _renderProjectsSection(container, '즐겨찾기', pinned);
  if (recent.length > 0)    _renderProjectsSection(container, '최근', recent);

  if (projects.length === 0) {
    container.innerHTML = '<p style="padding:32px 20px;color:var(--text-muted);font-size:14px;text-align:center;">프로젝트가 없습니다.<br>+ 버튼으로 새 프로젝트를 만들어보세요.</p>';
  }

  lucide.createIcons();
}

function _renderProjectsSection(container, label, projects) {
  const section = document.createElement('div');
  section.className = 'projects-section';

  const sectionLabel = document.createElement('div');
  sectionLabel.className = 'projects-section-label';
  sectionLabel.textContent = label;
  section.appendChild(sectionLabel);

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'projects-item';
    item.dataset.id = project.id;

    const name = document.createElement('span');
    name.className = 'projects-item-name';
    name.textContent = project.name;

    const actions = document.createElement('div');
    actions.className = 'projects-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = '<i data-lucide="pencil"></i>';
    renameBtn.title = '이름 변경';
    renameBtn.onclick = (e) => { e.stopPropagation(); renameProject(project.id); };

    const pinBtn = document.createElement('button');
    pinBtn.innerHTML = '<i data-lucide="pin"></i>';
    pinBtn.title = project.pinned ? '고정 해제' : '고정';
    if (project.pinned) pinBtn.classList.add('pinned');
    pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(project.id); };

    const starBtn = document.createElement('button');
    starBtn.innerHTML = '<i data-lucide="star"></i>';
    starBtn.title = project.important ? '중요 해제' : '중요';
    if (project.important) starBtn.classList.add('important');
    starBtn.onclick = (e) => { e.stopPropagation(); toggleImportant(project.id); };

    actions.appendChild(renameBtn);
    actions.appendChild(pinBtn);
    actions.appendChild(starBtn);

    item.appendChild(name);
    item.appendChild(actions);

    item.addEventListener('click', () => navigateTo('project', project.id));

    let holdTimer = null;
    item.addEventListener('pointerdown', () => {
      holdTimer = setTimeout(() => item.classList.toggle('show-actions'), 500);
    });
    item.addEventListener('pointerup',    () => clearTimeout(holdTimer));
    item.addEventListener('pointerleave', () => clearTimeout(holdTimer));

    section.appendChild(item);
  });

  const divider = document.createElement('div');
  divider.className = 'projects-section-divider';
  section.appendChild(divider);

  container.appendChild(section);
}


function togglePin(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  p.pinned = !p.pinned;
  analytics.track('project_pinned', { project_id: projectId, pinned: p.pinned });
  if (p.pinned) {
    // 중요와 상호 배타적
    p.important = false;
    p.importantOrder = 0;
    const maxOrder = Math.max(0, ...projects.filter(x => x.pinned).map(x => x.pinnedOrder || 0));
    p.pinnedOrder = maxOrder + 1;
  } else {
    p.pinnedOrder = 0;
  }
  saveProjects(projects);
  renderSidebar();
}

function renameProject(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  const newName = prompt('프로젝트 이름을 입력하세요:', p.name);
  if (newName && newName.trim()) {
    p.name = newName.trim();
    saveProjects(projects);
    renderSidebar();
    // 현재 프로젝트 뷰에 있으면 제목 업데이트
    const nameInput = document.querySelector('.project-name-input');
    if (nameInput && nameInput.dataset.projectId === projectId) {
      nameInput.value = p.name;
    }
  }
}

function reorderPinned(dragId, targetId) {
  const projects = loadProjects();
  const dragP = projects.find(p => p.id === dragId);
  const targetP = projects.find(p => p.id === targetId);
  if (!dragP || !targetP) return;
  const dragOrder = dragP.pinnedOrder;
  dragP.pinnedOrder = targetP.pinnedOrder;
  targetP.pinnedOrder = dragOrder;
  saveProjects(projects);
  renderSidebar();
}

function toggleImportant(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  if (!p.important) {
    // 중요 추가 시 최대 3개 제한
    const importantCount = projects.filter(x => x.important).length;
    if (importantCount >= 3) {
      alert('중요 항목은 최대 3개까지 등록할 수 있습니다.');
      return;
    }
    analytics.track('project_marked_important', { project_id: projectId, important: true });
    // 즐겨찾기와 상호 배타적
    p.pinned = false;
    p.pinnedOrder = 0;
    const maxOrder = Math.max(0, ...projects.filter(x => x.important).map(x => x.importantOrder || 0));
    p.importantOrder = maxOrder + 1;
    p.important = true;
  } else {
    analytics.track('project_marked_important', { project_id: projectId, important: false });
    p.important = false;
    p.importantOrder = 0;
  }
  saveProjects(projects);
  renderSidebar();
}

function reorderImportant(dragId, targetId) {
  const projects = loadProjects();
  const dragP = projects.find(p => p.id === dragId);
  const targetP = projects.find(p => p.id === targetId);
  if (!dragP || !targetP) return;
  const dragOrder = dragP.importantOrder;
  dragP.importantOrder = targetP.importantOrder;
  targetP.importantOrder = dragOrder;
  saveProjects(projects);
  renderSidebar();
}

/**
 * 구독 만료 시 활성 유지할 프로젝트를 우선순위에 따라 자동 선택.
 * 우선순위: 중요 → 즐겨찾기 → 최근 수정순
 * @param {Array} projects - 전체 프로젝트 배열
 * @param {number} limit   - 활성 유지할 프로젝트 수 (기본 2)
 * @returns {Array} 활성 유지할 프로젝트 배열
 */
function selectActiveProjects(projects, limit = 2) {
  const selected = [];
  const usedIds  = new Set();

  // 1순위: 중요 (importantOrder 오름차순)
  projects
    .filter(p => p.important)
    .sort((a, b) => (a.importantOrder || 0) - (b.importantOrder || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  // 2순위: 즐겨찾기 (pinnedOrder 오름차순)
  projects
    .filter(p => p.pinned && !usedIds.has(p.id))
    .sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  // 3순위: 최근 수정순
  projects
    .filter(p => !usedIds.has(p.id))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach(p => {
      if (selected.length < limit) { selected.push(p); usedIds.add(p.id); }
    });

  return selected;
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 생성
// ═══════════════════════════════════════════════════════════════
async function promptCreateProject() {
  await refreshPlanFromDB();
  if (!canCreateProject()) {
    analytics.track('project_limit_hit', {
      current_count: loadProjects().length,
      plan_limit: getPlanLimit('maxProjects'),
    });
    showUpgradeModal('project_limit');
    return;
  }
  const input = document.getElementById('create-project-name-input');
  input.value = '';
  document.getElementById('modal-create-project').classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => input.focus());
}

function confirmCreateProject() {
  const input = document.getElementById('create-project-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  closeModal('modal-create-project');

  const projects = loadProjects();
  const newProject = {
    id: genId(),
    name,
    pinned: false,
    pinnedOrder: 0,
    important: false,
    importantOrder: 0,
    capo: 0,
    bpm: 120,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: [],
    arrangement: []
  };
  projects.push(newProject);
  saveProjects(projects);
  renderSidebar();
  analytics.track('project_created', { total_count: projects.length });
  navigateTo('project', newProject.id);
}

// ═══════════════════════════════════════════════════════════════
// 에디터 → 프로젝트에 추가
// ═══════════════════════════════════════════════════════════════
let userSelectedProjectId = null;

// ═══════════════════════════════════════════════════════════════
// 프로젝트 뷰 렌더링
// ═══════════════════════════════════════════════════════════════
let currentColCount  = 4;
let playbackActive = false;
let currentPlayTimeout = null;
let metronomeActive = false;
let metronomeSchedulerTimeout = null;
let metronomeNextBeatTime = 0;
let metronomeBeatCount = 0;
let playbackStartAudioTime = 0;
let playbackEndAudioTime = 0;   // 곡 종료 오디오 시각 (0 = 제한 없음)

function metronomeClick(time, isDownbeat) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.3;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'sine';
  osc.frequency.value = isDownbeat ? 740 : 520;

  const vol = isDownbeat ? 0.38 : 0.22;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  osc.start(time);
  osc.stop(time + 0.06);
}

function scheduleMetronome() {
  if (!metronomeActive || !playbackActive || !audioCtx) return;
  const bpm = getProject(currentProjectId)?.bpm ?? 120;
  const beatDuration = 60 / bpm;
  const now = audioCtx.currentTime;

  while (metronomeNextBeatTime < now + 0.12) {
    if (playbackEndAudioTime > 0 && metronomeNextBeatTime >= playbackEndAudioTime) break;
    metronomeClick(metronomeNextBeatTime, metronomeBeatCount % 4 === 0);
    metronomeNextBeatTime += beatDuration;
    metronomeBeatCount++;
  }
  metronomeSchedulerTimeout = setTimeout(scheduleMetronome, 50);
}

function syncMetronomeToPlayback() {
  // 재생 중이면 playbackStartAudioTime 기준으로 다음 박자 경계에 맞춤
  if (playbackActive && playbackStartAudioTime > 0) {
    const bpm = getProject(currentProjectId)?.bpm ?? 120;
    const beatDuration = 60 / bpm;
    const now = audioCtx.currentTime;
    const elapsed = now - playbackStartAudioTime;
    const beatsPassed = Math.max(0, Math.floor(elapsed / beatDuration));
    metronomeBeatCount = beatsPassed;
    metronomeNextBeatTime = playbackStartAudioTime + metronomeBeatCount * beatDuration;
  } else {
    metronomeBeatCount = 0;
    metronomeNextBeatTime = audioCtx.currentTime + 0.05;
  }
}

async function startMetronome(synced = false) {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
  if (synced) {
    syncMetronomeToPlayback();
  } else {
    metronomeBeatCount = 0;
    metronomeNextBeatTime = audioCtx.currentTime + 0.05;
  }
  scheduleMetronome();
}

function _stopMetronomeAudio() {
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
}

function stopMetronome() {
  metronomeActive = false;
  _stopMetronomeAudio();
  const btn = document.getElementById('metronome-btn');
  if (btn) btn.classList.remove('active');
}

function toggleMetronome() {
  metronomeActive = !metronomeActive;
  analytics.track('metronome_toggled', { active: metronomeActive });
  const btn = document.getElementById('metronome-btn');
  if (btn) btn.classList.toggle('active', metronomeActive);
  if (metronomeActive && playbackActive) {
    // 재생 중에 켜면 즉시 싱크 시작
    startMetronome(true);
  } else if (!metronomeActive) {
    // 끄면 오디오 즉시 중단
    _stopMetronomeAudio();
  }
}

async function stopPlayAll(autoStop = false, options = {}) {
  playbackActive = false;
  playbackEndAudioTime = 0;
  _stopMetronomeAudio();
  if (currentPlayTimeout) { clearTimeout(currentPlayTimeout); currentPlayTimeout = null; }
  const stopPromise = GuitarAudio.stop({ wait: options.wait === true });
  document.querySelectorAll('.chord-slot--playing').forEach(el => el.classList.remove('chord-slot--playing'));
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="play"></i>'; lucide.createIcons(); }
  // 코드슬롯 자동 종료 시 메트로놈 off
  if (autoStop) stopMetronome();
  if (options.wait) await stopPromise;
}

async function playAll(projectId, startIndex = 0) {
  stopPlayAll();

  const project = getProject(projectId);
  if (!project) return;

  const isFirstInit = !audioCtx;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (isFirstInit) await GuitarAudio.syncContext(audioCtx); // Tone.js 동기화
  else await GuitarAudio.resume();

  const bpm = project.bpm ?? 120;
  const beatMs = 60000 / bpm;
  const slotMs = currentColCount === 4 ? beatMs * 4 : beatMs * 2;
  // startIndex 슬롯의 박자 오프셋만큼 역산해서 기준 시각 계산
  const beatsPerSlot = currentColCount === 4 ? 4 : 2;
  playbackStartAudioTime = audioCtx.currentTime + 0.05 - startIndex * beatsPerSlot * (60 / bpm);

  const playDataIndices = currentColCount === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  const orderedSlots = project.arrangement.flatMap(row =>
    playDataIndices.map(dataIdx => ({ chordId: row.slots[dataIdx] ?? null, lineId: row.id, slotIdx: dataIdx }))
  );
  if (!orderedSlots.length) return;

  playbackEndAudioTime = playbackStartAudioTime + orderedSlots.length * (slotMs / 1000);
  playbackActive = true;
  analytics.track('playall_started', { project_id: projectId, bpm, start_index: startIndex });
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="square"></i>'; lucide.createIcons(); }

  // 메트로놈이 켜져 있으면 재생 기준으로 재동기화
  if (metronomeActive) await startMetronome(true);

  // 드리프트 방지: startIndex 슬롯이 재생됐어야 할 절대 기준 시각
  const refWallTime = performance.now() - startIndex * slotMs;
  let i = startIndex;
  async function next() {
    if (!playbackActive) { stopPlayAll(); return; }
    if (i >= orderedSlots.length) { stopPlayAll(true); return; }
    const item = orderedSlots[i++];

    // 이전 강조 제거 후 현재 슬롯 강조
    document.querySelectorAll('.chord-slot--playing').forEach(el => el.classList.remove('chord-slot--playing'));
    const slotEl = document.querySelector(`[data-line-id="${item.lineId}"][data-slot-idx="${item.slotIdx}"]`);
    if (slotEl) {
      slotEl.classList.add('chord-slot--playing');
      const lineEl = slotEl.closest('.project-line');
      if (lineEl) {
        const scrollEl = document.getElementById('project-lines-' + projectId);
        if (scrollEl) {
          const firstLine = scrollEl.querySelector('.project-line');
          const anchorTop = firstLine ? firstLine.offsetTop : 0;
          scrollEl.scrollTo({ top: lineEl.offsetTop - anchorTop, behavior: 'smooth' });
        }
      }
    }

    if (item.chordId) {
      const p = getProject(projectId);
      const chord = p?.chords.find(c => c.id === item.chordId);
      if (chord) await playChord(chord);
    }
    // playChord 소요 시간을 빼고 정확한 다음 슬롯 시각까지만 대기
    const nextExpected = refWallTime + i * slotMs;
    const delay = Math.max(0, nextExpected - performance.now());
    currentPlayTimeout = setTimeout(next, delay);
  }
  next();
}

function getGlobalSlotIndex(project, lineId, dataIdx) {
  let globalIdx = 0;
  for (const row of project.arrangement) {
    if (row.id === lineId) {
      const visualIdx = currentColCount === 4 ? dataIdx / 2 : dataIdx;
      return globalIdx + visualIdx;
    }
    globalIdx += currentColCount;
  }
  return 0;
}


function renderProjectView(projectId) {
  currentProjectId = projectId;
  const project = getProject(projectId);
  if (!project) return;

  // 슬롯 배열 8칸 고정 마이그레이션 (기존 4-슬롯 rows 변환)
  let migrated = false;
  project.arrangement.forEach(row => {
    if (!row.slots) { row.slots = new Array(8).fill(null); migrated = true; }
    else if (row.slots.length < 8) {
      const ns = new Array(8).fill(null);
      row.slots.forEach((id, i) => { if (id) ns[i * 2] = id; });
      row.slots = ns; migrated = true;
    }
  });
  if (migrated) updateProject(project);

  currentColCount = project.colCount || 4;

  const viewEl = document.getElementById('view-project');
  viewEl.innerHTML = '';
  viewEl.classList.toggle('view-mode', !isEditMode);

  const maxW = currentColCount === 8 ? '1600px' : '850px';

  // ── 헤더 (<header> 로 분리) ──
  const header = document.createElement('div');
  header.className = 'project-header';

  const nameInput = document.createElement('input');
  nameInput.className = 'project-name-input';
  nameInput.type = 'text';
  nameInput.value = project.name;
  nameInput.dataset.projectId = projectId;
  nameInput.placeholder = '프로젝트 이름';
  nameInput.readOnly = !isEditMode;
  if (!isEditMode) nameInput.style.pointerEvents = 'none';
  let nameDebounce = null;
  nameInput.addEventListener('input', () => {
    clearTimeout(nameDebounce);
    nameDebounce = setTimeout(() => {
      const p = getProject(projectId);
      if (p) { p.name = nameInput.value.trim() || p.name; p.updatedAt = Date.now(); updateProject(p); renderSidebar(); }
    }, 500);
  });

  // 편집/완료 토글 버튼
  const modeBtn = document.createElement('button');
  modeBtn.className = 'project-icon-btn';
  modeBtn.innerHTML = isEditMode ? '<i data-lucide="check"></i>' : '<i data-lucide="pencil"></i>';
  modeBtn.onclick = () => {
    isEditMode = !isEditMode;
    renderProjectView(projectId);
  };

  // 4칸/8칸 토글
  const colToggle = document.createElement('div');
  colToggle.className = 'col-toggle';
  [4, 8].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'col-toggle-btn' + (currentColCount === n ? ' active' : '');
    btn.textContent = n + '칸';
    btn.onclick = () => {
      currentColCount = n;
      const p = getProject(projectId);
      if (p) { p.colCount = n; updateProject(p); }
      renderProjectView(projectId);
    };
    colToggle.appendChild(btn);
  });

  // ── 1행: [좌] 4칸/8칸 | [우] 공유하기 · 완료/편집 · [삭제] ──
  const headerRow1 = document.createElement('div');
  headerRow1.className = 'project-header-row1';

  const shareBtn = document.createElement('button');
  shareBtn.className = 'project-icon-btn';
  shareBtn.innerHTML = '<i data-lucide="share-2"></i>';
  shareBtn.onclick = () => openShareModal(projectId);

  const row1Right = document.createElement('div');
  row1Right.className = 'project-header-row1-right';
  row1Right.appendChild(shareBtn);
  row1Right.appendChild(modeBtn);
  if (isEditMode) {
    const deleteProjectBtn = document.createElement('button');
    deleteProjectBtn.className = 'project-icon-btn project-icon-btn--danger';
    deleteProjectBtn.innerHTML = '<i data-lucide="x"></i>';
    deleteProjectBtn.onclick = () => openDeleteConfirm(projectId);
    row1Right.appendChild(deleteProjectBtn);
  }

  headerRow1.appendChild(colToggle);
  headerRow1.appendChild(row1Right);
  header.appendChild(headerRow1);

  // ── 2행: [Capo BPM 메트로놈 재생 오른쪽] ──
  const headerRow2 = document.createElement('div');
  headerRow2.className = 'project-header-row2';

  // 오른쪽 컨트롤 그룹
  const row2Controls = document.createElement('div');
  row2Controls.className = 'project-header-row2-controls';

  // 카포 컨트롤
  const capoWrap = document.createElement('div');
  capoWrap.className = 'capo-control';
  const capoLabel = document.createElement('span');
  capoLabel.className = 'capo-label';
  capoLabel.textContent = 'Capo';
  const capoDown = document.createElement('button');
  capoDown.className = 'capo-btn';
  capoDown.textContent = '−';
  const capoVal = document.createElement('span');
  capoVal.className = 'capo-value';
  capoVal.textContent = project.capo ?? 0;
  const capoUp = document.createElement('button');
  capoUp.className = 'capo-btn';
  capoUp.textContent = '+';
  capoDown.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) > 0) { p.capo = (p.capo ?? 0) - 1; updateProject(p); capoVal.textContent = p.capo; analytics.track('capo_changed', { value: p.capo, direction: 'down', project_id: projectId }); }
  };
  capoUp.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) < 12) { p.capo = (p.capo ?? 0) + 1; updateProject(p); capoVal.textContent = p.capo; analytics.track('capo_changed', { value: p.capo, direction: 'up', project_id: projectId }); }
  };
  capoWrap.append(capoLabel, capoDown, capoVal, capoUp);
  row2Controls.appendChild(capoWrap);

  // BPM 컨트롤
  const bpmWrap = document.createElement('div');
  bpmWrap.className = 'bpm-control';
  const bpmLabel = document.createElement('span');
  bpmLabel.className = 'bpm-label';
  bpmLabel.textContent = 'BPM';
  const bpmInput = document.createElement('input');
  bpmInput.className = 'bpm-input';
  bpmInput.type = 'number';
  bpmInput.min = 40; bpmInput.max = 240;
  bpmInput.value = project.bpm ?? 120;
  bpmInput.addEventListener('change', () => {
    const val = Math.min(240, Math.max(40, parseInt(bpmInput.value) || 120));
    bpmInput.value = val;
    const p = getProject(projectId);
    if (p) { p.bpm = val; updateProject(p); analytics.track('bpm_changed', { value: val, project_id: projectId }); }
  });
  bpmWrap.append(bpmLabel, bpmInput);
  row2Controls.appendChild(bpmWrap);

  // 메트로놈 버튼
  const metronomeBtn = document.createElement('button');
  metronomeBtn.id = 'metronome-btn';
  metronomeBtn.className = 'btn metronome-btn' + (metronomeActive ? ' active' : '');
  metronomeBtn.innerHTML = '<i data-lucide="metronome"></i>';
  metronomeBtn.title = '메트로놈';
  metronomeBtn.onclick = () => toggleMetronome();
  row2Controls.appendChild(metronomeBtn);

  // 전체재생 버튼
  const playAllBtn = document.createElement('button');
  playAllBtn.id = 'play-all-btn';
  playAllBtn.className = 'btn play-all-btn';
  playAllBtn.innerHTML = playbackActive ? '<i data-lucide="square"></i>' : '<i data-lucide="play"></i>';
  playAllBtn.onclick = () => {
    if (playbackActive) stopPlayAll();
    else playAll(projectId);
  };
  row2Controls.appendChild(playAllBtn);

  headerRow2.appendChild(row2Controls);
  header.appendChild(headerRow2);

  // ── 타이틀 컨테이너 ──
  const titleBar = document.createElement('div');
  titleBar.className = 'project-title-bar';
  titleBar.appendChild(nameInput);

  // ── 고정 헤더 영역 ──
  const chordPalette = buildChordPalette(project, isEditMode);
  const stickyBar = document.createElement('header');
  stickyBar.className = 'project-sticky-bar';
  stickyBar.style.maxWidth = maxW;
  stickyBar.appendChild(titleBar);
  stickyBar.appendChild(header);
  stickyBar.appendChild(chordPalette);

  // ── 스크롤 콘텐츠 영역 ──
  const linesEl = buildLinesSection(project, isEditMode);
  const wrapper = document.createElement('div');
  wrapper.className = 'project-view-wrapper';
  wrapper.style.maxWidth = maxW;
  wrapper.appendChild(linesEl);

  const inner = document.createElement('div');
  inner.className = 'project-inner';
  inner.appendChild(stickyBar);
  inner.appendChild(wrapper);
  viewEl.appendChild(inner);

  lucide.createIcons();

  linesEl.scrollTop = 0;
  // linesEl.focus() 제거: 프로그래밍적 focus → 커서가 chord-area 앞에 잡힘
  // → 사용자 탭 시 커서 이동 → Android IME context 재초기화 → 첫 한글 자모 분리
  // 사용자가 직접 탭하면 cursor position이 처음부터 올바르게 설정됨
}

function getLineText(lineDiv) {
  const lineTextEl = lineDiv.querySelector('.line-text');
  if (!lineTextEl) return '';
  let text = '';
  for (const node of lineTextEl.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    else if (node.nodeName === 'BR') text += '\n';
  }
  // 브라우저 placeholder <br> 로 인한 trailing \n 제거
  return text.replace(/\n$/, '');
}

// 커서 이전 문자 오프셋 계산 (line-text 기준, <br>='\n' 포함)
function getCursorOffsetInLine(lineDiv, range) {
  const lineTextEl = lineDiv.querySelector('.line-text');
  if (!lineTextEl) return 0;
  // range.startContainer가 lineTextEl 자체인 경우
  if (range.startContainer === lineTextEl) {
    let off = 0;
    for (let i = 0; i < range.startOffset; i++) {
      const child = lineTextEl.childNodes[i];
      if (!child) break;
      if (child.nodeType === Node.TEXT_NODE) off += child.textContent.length;
      else if (child.nodeName === 'BR') off += 1;
    }
    return off;
  }
  let offset = 0, found = false;
  function walk(node) {
    if (found) return;
    if (node === range.startContainer) { offset += range.startOffset; found = true; return; }
    if (node.nodeType === Node.TEXT_NODE) { offset += node.textContent.length; }
    else if (node.nodeName === 'BR') { offset += 1; }
    else { for (const c of node.childNodes) { if (found) return; walk(c); } }
  }
  for (const c of lineTextEl.childNodes) { if (found) break; walk(c); }
  return offset;
}

function setLineText(lineDiv, text) {
  const lineTextEl = lineDiv.querySelector('.line-text');
  if (!lineTextEl) return;
  while (lineTextEl.firstChild) lineTextEl.removeChild(lineTextEl.firstChild);
  if (!text) { lineTextEl.appendChild(document.createElement('br')); return; }
  const parts = text.split('\n');
  parts.forEach((part, i) => {
    if (part) lineTextEl.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) lineTextEl.appendChild(document.createElement('br'));
  });
}

function buildChordArea(line, project, editMode = true) {
  const area = document.createElement('div');
  area.className = `chord-area cols-${currentColCount}`;
  area.contentEditable = 'false';
  const base = line.slots || [];
  const dataIndices = currentColCount === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  dataIndices.forEach(dataIdx => {
    const chordId = base[dataIdx] ?? null;
    const slot = document.createElement('div');
    slot.dataset.slotIdx = dataIdx;
    slot.dataset.lineId = line.id;
    slot.dataset.chordId = chordId || ''; // DOM fallback for saveAllLines

    if (chordId && project.chords) {
      const chord = project.chords.find(c => c.id === chordId);
      if (chord) {
        slot.className = 'chord-slot';
        const cv = document.createElement('canvas');
        cv.width = 400; cv.height = 300;
        drawCanvas(cv.getContext('2d'), 1, chord);
        const img = document.createElement('img');
        img.src = cv.toDataURL('image/png');
        img.className = 'chord-slot-img';
        img.addEventListener('click', () => {
          if (playbackActive) {
            const p = getProject(project.id);
            if (p) playAll(project.id, getGlobalSlotIndex(p, line.id, dataIdx));
          } else {
            playChord(chord);
            analytics.track('project_chord_played', { chord_name: chord.name, project_id: project.id });
          }
        });

        slot.appendChild(img);

        if (editMode) {
          img.addEventListener('contextmenu', e => {
            e.preventDefault();
            // 데스크탑(마우스)에서만 우클릭 삭제 — 모바일 길게 누르기(~600ms contextmenu)는 무시
            if (window.matchMedia('(pointer: fine)').matches) {
              placeChordInSlot(project.id, line.id, dataIdx, null);
            }
          });

          // 삭제 버튼
          const slotDel = document.createElement('button');
          slotDel.className = 'chord-slot-delete';
          slotDel.textContent = '✕';
          slotDel.onclick = e => { e.stopPropagation(); placeChordInSlot(project.id, line.id, dataIdx, null); };
          slot.appendChild(slotDel);


          slot.draggable = true;
          slot.addEventListener('dragstart', e => {
            e.stopPropagation();
            e.dataTransfer.setData('drag-slot-id', chordId);
            e.dataTransfer.setData('drag-slot-line-id', line.id);
            e.dataTransfer.setData('drag-slot-idx', String(dataIdx));
            slot.classList.add('dragging');
          });
          slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
        }
      } else {
        slot.className = editMode ? 'chord-slot' : 'chord-slot slot-empty';
      }
    } else {
      // 빈 슬롯
      slot.className = editMode ? 'chord-slot' : 'chord-slot slot-empty';
    }

    if (editMode) {
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (e.dataTransfer.types.includes('drag-slot-id')) {
          const srcLineId = e.dataTransfer.getData('drag-slot-line-id');
          const srcIdx = parseInt(e.dataTransfer.getData('drag-slot-idx'));
          swapChordSlots(project.id, srcLineId, srcIdx, line.id, dataIdx);
          return;
        }
        const dropped = e.dataTransfer.getData('chord-palette-id');
        const fromProject = e.dataTransfer.getData('chord-palette-project');
        if (dropped && fromProject === project.id) placeChordInSlot(project.id, line.id, dataIdx, dropped);
      });
    }
    area.appendChild(slot);
  });

  // 항상 chord-row-wrapper로 감싸서 뷰/에딧 레이아웃 통일
  const wrapper = document.createElement('div');
  wrapper.className = 'chord-row-wrapper';
  wrapper.appendChild(area);

  if (editMode) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'row-menu-btn';
    menuBtn.setAttribute('aria-label', '행 메뉴');
    menuBtn.innerHTML = '<i data-lucide="more-vertical"></i>';
    // 터치: touchstart에서 line-text.contentEditable=false → 키보드 차단
    let _btnTouchPending = false;
    let _activeLineText = null;
    menuBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      _btnTouchPending = true;
      const lineText = menuBtn.closest('.project-line')?.querySelector('.line-text');
      if (lineText) { lineText.contentEditable = 'false'; _activeLineText = lineText; }
    }, { passive: false });
    menuBtn.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      if (_btnTouchPending) {
        _btnTouchPending = false;
        openRowMenu({ currentTarget: menuBtn }, line.id, project.id);
      }
    }, { passive: false });
    menuBtn.addEventListener('touchcancel', () => {
      _btnTouchPending = false;
      if (_activeLineText) { _activeLineText.contentEditable = 'true'; _activeLineText = null; }
    });
    // 마우스: mousedown으로 포커스 방지, click에서 메뉴 호출
    menuBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      openRowMenu(e, line.id, project.id);
    });
    wrapper.appendChild(menuBtn);
  }

  return wrapper;
}

function buildProjectLine(line, project, editMode) {
  if (!line.slots) line.slots = new Array(8).fill(null);
  const div = document.createElement('div');
  div.className = 'project-line';
  div.dataset.lineId = line.id;

  div.appendChild(buildChordArea(line, project, editMode));

  const lineText = document.createElement('div');
  lineText.className = 'line-text';
  if (editMode) {
    lineText.contentEditable = 'true';
    lineText.spellcheck = false;
  }
  // text 내용 렌더링: \n → <br>
  const textParts = (line.text || '').split('\n');
  textParts.forEach((part, i) => {
    if (part) lineText.appendChild(document.createTextNode(part));
    if (i < textParts.length - 1) lineText.appendChild(document.createElement('br'));
  });
  if (!lineText.childNodes.length) lineText.appendChild(document.createElement('br'));
  div.appendChild(lineText);

  return div;
}

function buildLinesSection(project, editMode = true) {
  if (!project.arrangement || project.arrangement.length === 0) {
    project.arrangement = [{ id: genId(), text: '', slots: new Array(8).fill(null) }];
    updateProject(project);
  }
  const linesEl = document.createElement('div');
  linesEl.className = 'project-lines';
  linesEl.id = 'project-lines-' + project.id;
  // linesEl은 contenteditable 아님 — 각 line-text가 개별 contenteditable

  project.arrangement.forEach(line => {
    linesEl.appendChild(buildProjectLine(line, project, editMode));
  });

  if (editMode) {
    // 맨 아래 + 버튼 (줄 추가)
    const addLineBtn = document.createElement('button');
    addLineBtn.className = 'add-line-btn';
    addLineBtn.setAttribute('aria-label', '줄 추가');
    addLineBtn.textContent = '+';
    addLineBtn.addEventListener('mousedown', e => e.preventDefault());
    addLineBtn.addEventListener('click', () => {
      const p = getProject(project.id);
      const newId = genId();
      const newObj = { id: newId, text: '', slots: new Array(8).fill(null) };
      const newDiv = buildProjectLine(newObj, p || project, true);
      newDiv.classList.add('project-line-enter');
      newDiv.addEventListener('animationend', () => newDiv.classList.remove('project-line-enter'), { once: true });
      linesEl.insertBefore(newDiv, addLineBtn);
      saveAllLines(project.id, linesEl);
      lucide.createIcons();
    });
    linesEl.appendChild(addLineBtn);

    let saveDebounce = null;

    let _isComposing = false;

    linesEl.addEventListener('compositionstart', () => {
      _isComposing = true;
    });
    linesEl.addEventListener('compositionend', () => {
      _isComposing = false;
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => saveAllLines(project.id, linesEl), 300);
    });

    linesEl.addEventListener('input', (e) => {
      if (!e.target.classList?.contains('line-text')) return;
      if (e.isComposing || _isComposing) return;
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => saveAllLines(project.id, linesEl), 300);
    });

    // Samsung 키보드: 여러 줄 붙여넣기가 insertText + \n 으로 들어오는 경우 처리
    linesEl.addEventListener('beforeinput', e => {
      if (!e.target.classList?.contains('line-text')) return;
      if (e.inputType !== 'insertText') return;
      const text = e.data || '';
      if (!text.includes('\n')) return;
      e.preventDefault();
      applyPastedText(text, lastFocusedLine);
    });

    // 드래그 드롭 이미지 삽입 차단
    linesEl.addEventListener('dragover', e => {
      if (e.target.closest('.chord-slot')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'none';
    });
    linesEl.addEventListener('drop', e => {
      if (e.target.closest('.chord-slot')) return;
      e.preventDefault();
    });

    linesEl.addEventListener('keydown', e => {
      if (!e.target.classList?.contains('line-text')) return;

      // Ctrl+A / Cmd+A: 모든 line-text의 텍스트를 전체 선택
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const lineTexts = Array.from(linesEl.querySelectorAll('.line-text'));
        if (lineTexts.length === 0) return;
        const sel = window.getSelection();
        const range = document.createRange();
        const first = lineTexts[0];
        const last = lineTexts[lineTexts.length - 1];
        range.setStart(first, 0);
        range.setEnd(last, last.childNodes.length);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement('br');
        range.insertNode(br);
        // br이 마지막 자식이면 커서가 다음 줄에 보이도록 추가 br 삽입
        if (!br.nextSibling) br.after(document.createElement('br'));
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        clearTimeout(saveDebounce);
        saveDebounce = setTimeout(() => saveAllLines(project.id, linesEl), 300);
        return;
      }

      if (e.key === 'Backspace') {
        const lineEl = e.target.closest('.project-line');
        if (!lineEl) return;

        const sel = window.getSelection();
        if (!sel?.rangeCount || !sel.isCollapsed) return;

        const isAtStart = getCursorOffsetInLine(lineEl, sel.getRangeAt(0)) === 0;

        if (isAtStart) {
          e.preventDefault();
          const prevLineEl = lineEl.previousElementSibling;
          if (!prevLineEl?.classList?.contains('project-line')) return; // 첫 줄: 아무것도 안 함

          // 이전 줄 텍스트 끝 위치 계산 (커서 복원용)
          const prevText = getLineText(prevLineEl);
          const curText  = getLineText(lineEl);

          // 이전 줄에 합치기 & 현재 줄 제거
          setLineText(prevLineEl, prevText + curText);
          lineEl.remove();

          // 커서를 이전 줄의 prevText.length 위치에 놓기
          const prevLineTextEl = prevLineEl.querySelector('.line-text');
          prevLineTextEl.focus();
          let remaining = prevText.length;
          const newRange = document.createRange();
          let placed = false;
          for (const node of prevLineTextEl.childNodes) {
            if (placed) break;
            if (node.nodeType === Node.TEXT_NODE) {
              if (remaining <= node.textContent.length) {
                newRange.setStart(node, remaining);
                newRange.collapse(true);
                placed = true;
              } else {
                remaining -= node.textContent.length;
              }
            } else if (node.nodeName === 'BR') {
              if (remaining === 0) {
                newRange.setStartBefore(node);
                newRange.collapse(true);
                placed = true;
              } else {
                remaining -= 1;
              }
            }
          }
          if (!placed) { newRange.selectNodeContents(prevLineTextEl); newRange.collapse(false); }
          sel.removeAllRanges();
          sel.addRange(newRange);

          saveAllLines(project.id, linesEl);
          return;
        }

        // 빈 줄이 아닌 경우 기본 동작 허용
        if (!getLineText(lineEl)) e.preventDefault();
      }
    });

    linesEl.addEventListener('focusout', e => {
      if (!e.relatedTarget || !linesEl.contains(e.relatedTarget)) {
        clearTimeout(saveDebounce);
        saveAllLines(project.id, linesEl);
      }
    });

    // line-text 외부 터치 시 커서 해제
    const _blurOnTapOutside = (e) => {
      if (!linesEl.isConnected) {
        document.removeEventListener('touchstart', _blurOnTapOutside);
        return;
      }
      const active = document.activeElement;
      if (!active?.classList?.contains('line-text')) return;
      if (!linesEl.contains(active)) return;
      if (e.target.closest('.line-text')) return;
      active.blur();
    };
    document.addEventListener('touchstart', _blurOnTapOutside, { passive: true });
  }

  // 마지막 포커스된 라인 추적
  let lastFocusedLine = null;
  linesEl.addEventListener('focusin', e => {
    const lineEl = e.target.closest?.('.project-line');
    if (lineEl && linesEl.contains(lineEl)) lastFocusedLine = lineEl;
  });
  linesEl.addEventListener('touchstart', e => {
    const lineEl = e.target.closest?.('.project-line');
    if (lineEl && linesEl.contains(lineEl)) lastFocusedLine = lineEl;
  }, { passive: true });

  // 클립보드 히스토리 경로 차단 (Android WebView)
  linesEl.addEventListener('beforeinput', e => {
    if (!e.target.classList?.contains('line-text')) return;
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') return;
    const anchorLine = lastFocusedLine;
    const dt = e.dataTransfer;
    let pasted = dt?.getData('text/plain') || dt?.getData('text') || '';
    if (!pasted && dt) {
      const html = dt.getData('text/html') || '';
      if (html) pasted = htmlClipboardToText(html);
    }
    if (pasted) { e.preventDefault(); applyPastedText(pasted, anchorLine); return; }
    e.preventDefault();
    navigator.clipboard?.readText().then(text => {
      if (text) applyPastedText(text, anchorLine);
    }).catch(() => {});
  });

  function applyPastedText(pasted, anchorLine) {
    const segments = pasted
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .replace(/\u2028/g, '\n').replace(/\u2029/g, '\n')
      .split('\n');
    const sel = window.getSelection();
    let currentLine = null, cursorOff = 0, before = '', after = '';

    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      let node = range.startContainer;
      while (node && node !== linesEl) {
        if (node.classList?.contains('project-line')) { currentLine = node; break; }
        node = node.parentElement;
      }
      if (currentLine) {
        cursorOff = getCursorOffsetInLine(currentLine, range);
        const fullText = getLineText(currentLine);
        before = fullText.substring(0, cursorOff);
        after = fullText.substring(cursorOff);
      }
    }

    if (!currentLine) {
      currentLine = anchorLine || lastFocusedLine;
      if (!currentLine) {
        let el = document.activeElement;
        while (el && el !== linesEl) {
          if (el.classList?.contains('project-line')) { currentLine = el; break; }
          el = el.parentElement;
        }
      }
      if (!currentLine) {
        const allLines = linesEl.querySelectorAll('.project-line');
        currentLine = allLines[allLines.length - 1] || null;
      }
      if (!currentLine) return;
      before = getLineText(currentLine);
      after = '';
    }

    const p = getProject(project.id);

    let lastLine = currentLine;

    if (segments.length === 1) {
      // 단일 줄 붙여넣기: 커서 위치에 삽입
      setLineText(currentLine, before + segments[0] + after);
    } else {
      // 여러 줄 붙여넣기: 첫 번째 줄은 현재 줄에 병합, 나머지는 새 줄로 순서대로 삽입
      // 기존 다음 줄은 덮어쓰지 않고 새 줄을 삽입하여 밀어냄
      setLineText(currentLine, before + segments[0]);
      for (let i = 1; i < segments.length; i++) {
        const text = i === segments.length - 1 ? segments[i] + after : segments[i];
        const newLineId = genId();
        const newLine = { id: newLineId, text, slots: new Array(8).fill(null) };
        const newDiv = buildProjectLine(newLine, p || project, true);
        lastLine.insertAdjacentElement('afterend', newDiv);
        lastLine = newDiv;
      }
      lucide.createIcons();
    }

    const endLineText = lastLine.querySelector('.line-text') || lastLine;
    const endRange = document.createRange();
    endRange.selectNodeContents(endLineText);
    endRange.collapse(false);
    if (sel) { sel.removeAllRanges(); sel.addRange(endRange); }
    saveAllLines(project.id, linesEl);
  }

  function htmlClipboardToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const lines = [];
    let cur = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) { cur += node.textContent; }
      else if (node.nodeName === 'BR') { lines.push(cur); cur = ''; }
      else if (['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) {
        if (cur || lines.length > 0) { lines.push(cur); cur = ''; }
        for (const c of node.childNodes) walk(c);
        if (cur || lines.length > 0) { lines.push(cur); cur = ''; }
      } else { for (const c of node.childNodes) walk(c); }
    };
    for (const c of tmp.childNodes) walk(c);
    if (cur) lines.push(cur);
    return lines.filter((l, i, a) => !(i === 0 && l === '') && !(i === a.length - 1 && l === '')).join('\n');
  }

  linesEl.addEventListener('paste', async e => {
    if (!e.target.classList?.contains('line-text')) return;
    e.preventDefault();
    const sel = window.getSelection();
    let targetLine = null;
    if (sel?.rangeCount) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== linesEl) {
        if (node.classList?.contains('project-line')) { targetLine = node; break; }
        node = node.parentElement;
      }
    }
    if (!targetLine) targetLine = lastFocusedLine;
    const cd = e.clipboardData || window.clipboardData;
    let pasted = cd?.getData('text/plain') || cd?.getData('text') || '';
    if (pasted && !/[\n\r\u2028\u2029]/.test(pasted)) {
      const html = cd?.getData('text/html') || '';
      if (html) {
        const fromHtml = htmlClipboardToText(html);
        if (/\n/.test(fromHtml)) pasted = fromHtml;
      }
    }
    if (pasted) { applyPastedText(pasted, targetLine || lastFocusedLine); return; }
    if (navigator.clipboard?.readText) {
      try {
        pasted = await navigator.clipboard.readText();
        if (pasted) applyPastedText(pasted, targetLine || lastFocusedLine);
      } catch {}
    }
  });

  // input 폴백: line-text에 HTML이 삽입된 경우 정리
  linesEl.addEventListener('input', e => {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') return;
    if (!e.target.classList?.contains('line-text')) return;
    const lineTextEl = e.target;
    const lineDiv = lineTextEl.closest('.project-line');
    if (!lineDiv) return;
    const hasDirty = Array.from(lineTextEl.childNodes).some(n =>
      n.nodeType === Node.ELEMENT_NODE && n.nodeName !== 'BR'
    );
    if (!hasDirty) return;
    const segments = [];
    let cur = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) { cur += node.textContent; }
      else if (node.nodeName === 'BR') { segments.push(cur); cur = ''; }
      else if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'SPAN'].includes(node.nodeName)) {
        if (cur || segments.length > 0) { segments.push(cur); cur = ''; }
        for (const c of node.childNodes) walk(c);
        if (cur || segments.length > 0) { segments.push(cur); cur = ''; }
      } else { for (const c of node.childNodes) walk(c); }
    };
    for (const c of lineTextEl.childNodes) walk(c);
    if (cur || segments.length === 0) segments.push(cur);
    while (segments.length > 1 && segments[0] === '') segments.shift();
    while (segments.length > 1 && segments[segments.length - 1] === '') segments.pop();
    setLineText(lineDiv, segments[0] || '');
    const p = getProject(project.id);
    let lastInsertedLine = lineDiv;
    for (let i = 1; i < segments.length; i++) {
      const newLineId = genId();
      const newDiv = buildProjectLine({ id: newLineId, text: segments[i], slots: new Array(8).fill(null) }, p || project, true);
      lastInsertedLine.insertAdjacentElement('afterend', newDiv);
      lastInsertedLine = newDiv;
    }
    const endLineText = lastInsertedLine.querySelector('.line-text') || lastInsertedLine;
    const sel = window.getSelection();
    const endRange = document.createRange();
    endRange.selectNodeContents(endLineText);
    endRange.collapse(false);
    if (sel) { sel.removeAllRanges(); sel.addRange(endRange); }
    saveAllLines(project.id, linesEl);
  });

  return linesEl;
}

function saveAllLines(projectId, linesEl) {
  const p = getProject(projectId);
  if (!p) return;
  const lineDivs = linesEl.querySelectorAll('.project-line');
  p.arrangement = Array.from(lineDivs).map(div => {
    if (!div.dataset.lineId) div.dataset.lineId = genId();
    const existing = p.arrangement.find(l => l.id === div.dataset.lineId);
    let slots;
    if (existing) {
      slots = existing.slots;
    } else {
      // DOM fallback: 붙여넣기 등으로 새 div가 생성된 경우 data-chord-id에서 복원
      slots = new Array(8).fill(null);
      div.querySelectorAll('[data-slot-idx]').forEach(slotEl => {
        const idx = parseInt(slotEl.dataset.slotIdx);
        const cid = slotEl.dataset.chordId || '';
        if (!isNaN(idx) && cid) slots[idx] = cid;
      });
    }
    return {
      id: div.dataset.lineId,
      text: getLineText(div),
      slots
    };
  });
  p.updatedAt = Date.now();
  updateProject(p);
}

function insertNewLineAtCursor(linesEl, projectId) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  let currentLine = range.startContainer;
  while (currentLine && currentLine !== linesEl) {
    if (currentLine.classList?.contains('project-line')) break;
    currentLine = currentLine.parentElement;
  }
  if (!currentLine || currentLine === linesEl) return;
  const cursorOff = getCursorOffsetInLine(currentLine, range);
  const fullText = getLineText(currentLine);
  const before = fullText.substring(0, cursorOff);
  const after = fullText.substring(cursorOff);
  setLineText(currentLine, before);
  const p = getProject(projectId);

  // 다음 줄이 있으면 텍스트를 한 칸씩 아래로 민다 (새 DOM 행 추가 없이)
  const nextSibling = currentLine.nextElementSibling;
  if (nextSibling) {
    // 마지막 행까지 순회해 텍스트를 한 칸씩 밀고, 마지막 남은 텍스트를 새 행에 추가
    // 먼저 기존 행들의 텍스트를 수집
    const rows = [];
    let cur = nextSibling;
    while (cur) {
      rows.push(cur);
      cur = cur.nextElementSibling;
    }
    // 마지막으로 밀려난 텍스트를 담을 변수
    let displaced = after;
    for (const row of rows) {
      const rowText = getLineText(row);
      setLineText(row, displaced);
      displaced = rowText;
    }
    // displaced가 남아 있으면 새 행을 맨 끝에 추가
    const lastRow = rows[rows.length - 1];
    const newLineId = genId();
    const newLine = { id: newLineId, text: displaced, slots: new Array(8).fill(null) };
    const newDiv = document.createElement('div');
    newDiv.className = 'project-line';
    newDiv.dataset.lineId = newLineId;
    newDiv.appendChild(buildChordArea(newLine, p || { id: projectId, chords: [] }));
    if (displaced) {
      newDiv.appendChild(document.createTextNode(displaced));
    } else {
      newDiv.appendChild(document.createElement('br'));
    }
    lastRow.insertAdjacentElement('afterend', newDiv);
    // 커서를 nextSibling(밀린 후 첫 번째 기존 행)의 시작으로 이동
    const newRange = document.createRange();
    const firstTextNode = Array.from(nextSibling.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (firstTextNode) {
      newRange.setStart(firstTextNode, 0);
    } else {
      const br = nextSibling.querySelector('br');
      if (br) newRange.setStartBefore(br);
      else { newRange.selectNodeContents(nextSibling); newRange.collapse(true); }
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    requestAnimationFrame(() => nextSibling.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  } else {
    // 다음 줄 없음: 새 행을 바로 추가
    const newLineId = genId();
    const newLine = { id: newLineId, text: after, slots: new Array(8).fill(null) };
    const newDiv = document.createElement('div');
    newDiv.className = 'project-line';
    newDiv.dataset.lineId = newLineId;
    newDiv.appendChild(buildChordArea(newLine, p || { id: projectId, chords: [] }));
    if (after) {
      newDiv.appendChild(document.createTextNode(after));
    } else {
      newDiv.appendChild(document.createElement('br'));
    }
    currentLine.insertAdjacentElement('afterend', newDiv);
    const newRange = document.createRange();
    if (after) {
      newRange.setStart(newDiv.lastChild, 0);
    } else {
      newRange.setStartBefore(newDiv.lastChild);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    requestAnimationFrame(() => newDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  saveAllLines(projectId, linesEl);
}

// 코드 슬롯이 하나라도 채워져 있으면 true
function lineHasChords(lineDiv, projectId) {
  const p = getProject(projectId);
  const line = p?.arrangement.find(l => l.id === lineDiv.dataset.lineId);
  if (line?.slots?.some(s => s !== null)) return true;
  // DOM 폴백 (saveAllLines 전 상태)
  return Array.from(lineDiv.querySelectorAll('[data-slot-idx]')).some(el => el.dataset.chordId);
}

// ═══════════════════════════════════════════════════════════════
// 행 메뉴 (3-dot) — 코드 슬롯 행 독립 관리
// ═══════════════════════════════════════════════════════════════
let _rowMenuEl      = null;
let _backdropEl     = null;
let _rowMenuLineId  = null;
let _rowMenuProjId  = null;
let _rowMenuLinesEl = null;

function _ensureRowMenuEl() {
  if (_rowMenuEl) return;
  // 백드롭: 투명 전체화면 → 터치/클릭 시 메뉴 닫기
  _backdropEl = document.createElement('div');
  _backdropEl.className = 'row-menu-backdrop hidden';
  _backdropEl.addEventListener('click', _closeRowMenu);
  _backdropEl.addEventListener('touchstart', e => {
    e.preventDefault();
    _closeRowMenu();
  }, { passive: false });
  document.body.appendChild(_backdropEl);
  // 드롭다운
  const d = document.createElement('div');
  d.className = 'row-menu-dropdown hidden';
  d.innerHTML = `
    <button data-action="above">위에 줄 추가</button>
    <button data-action="below">아래에 줄 추가</button>
    <button data-action="clear">코드 슬롯 초기화</button>
    <hr />
    <button data-action="delete" class="danger">이 줄 삭제</button>`;
  d.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) _rowMenuAction(btn.dataset.action);
  });
  document.body.appendChild(d);
  _rowMenuEl = d;
}

function openRowMenu(e, lineId, projectId) {
  _ensureRowMenuEl();
  _rowMenuLineId  = lineId;
  _rowMenuProjId  = projectId;
  const lineDiv   = e.currentTarget.closest('.project-line');
  _rowMenuLinesEl = lineDiv?.parentElement ?? null;

  // position: fixed → 뷰포트 기준 좌표 (내부 스크롤 무관)
  const rect   = e.currentTarget.getBoundingClientRect();
  const MENU_H = 176; // 드롭다운 예상 높이
  const viewH  = window.innerHeight;
  if (rect.bottom + MENU_H > viewH) {
    // 아래 공간 부족 → 버튼 위쪽으로 뒤집어 표시
    _rowMenuEl.style.top    = 'auto';
    _rowMenuEl.style.bottom = (viewH - rect.top + 4) + 'px';
  } else {
    _rowMenuEl.style.top    = (rect.bottom + 4) + 'px';
    _rowMenuEl.style.bottom = 'auto';
  }
  _rowMenuEl.style.right = (window.innerWidth - rect.right) + 'px';
  _rowMenuEl.style.left  = 'auto';

  _backdropEl.classList.remove('hidden');
  _rowMenuEl.classList.remove('hidden');

  // 내부 스크롤 발생 시 자동 닫기
  _rowMenuLinesEl?.addEventListener('scroll', _closeRowMenu, { once: true });

  // 마지막 줄이면 "이 줄 삭제" 비활성화
  const lines = _rowMenuLinesEl?.querySelectorAll('.project-line');
  _rowMenuEl.querySelector('[data-action="delete"]').disabled = (lines?.length ?? 0) <= 1;
}

function _closeRowMenu() {
  _rowMenuEl?.classList.add('hidden');
  _backdropEl?.classList.add('hidden');
  // 메뉴 닫힐 때 line-text contentEditable 복원 (터치로 열었을 때 비활성화됐던 것)
  if (_rowMenuLinesEl) {
    _rowMenuLinesEl.querySelectorAll('.line-text').forEach(lt => {
      lt.contentEditable = 'true';
    });
  }
}

function _rowMenuAction(action) {
  _closeRowMenu();
  const linesEl   = _rowMenuLinesEl;
  const projectId = _rowMenuProjId;
  const lineId    = _rowMenuLineId;
  if (!linesEl || !projectId || !lineId) return;

  const lineDiv = linesEl.querySelector(`.project-line[data-line-id="${lineId}"]`);
  const p       = getProject(projectId);
  if (!lineDiv || !p) return;

  if (action === 'above' || action === 'below') {
    const newId  = genId();
    const newObj = { id: newId, text: '', slots: new Array(8).fill(null) };
    const newDiv = buildProjectLine(newObj, p, true);
    newDiv.classList.add('project-line-enter');
    newDiv.addEventListener('animationend', () => newDiv.classList.remove('project-line-enter'), { once: true });
    lineDiv.insertAdjacentElement(action === 'above' ? 'beforebegin' : 'afterend', newDiv);
    saveAllLines(projectId, linesEl);
    lucide.createIcons();

  } else if (action === 'clear') {
    const line = p.arrangement.find(l => l.id === lineId);
    if (!line) return;
    line.slots    = new Array(8).fill(null);
    p.updatedAt   = Date.now();
    updateProject(p);
    // 코드 영역(wrapper) 재빌드
    const oldWrapper = lineDiv.querySelector('.chord-row-wrapper') ?? lineDiv.querySelector('.chord-area');
    if (oldWrapper) {
      const newWrapper = buildChordArea({ id: lineId, text: line.text, slots: line.slots }, p, true);
      oldWrapper.replaceWith(newWrapper);
      lucide.createIcons();
    }

  } else if (action === 'delete') {
    if (linesEl.querySelectorAll('.project-line').length <= 1) return;
    lineDiv.remove();
    saveAllLines(projectId, linesEl);
  }
}

function buildChordPalette(project, editMode = true) {
  // ── 섹션 래퍼 (팔레트 + 스크롤바) ──
  const section = document.createElement('div');
  section.className = 'palette-section';
  section.id = 'palette-section-' + project.id;

  // ── 팔레트 ──
  const chordPalette = document.createElement('div');
  chordPalette.className = 'chord-palette' + (editMode ? ' edit-mode' : '');
  chordPalette.id = 'chord-palette-' + project.id;

  project.chords.forEach((chord, idx) => {
    const thumb = createPaletteItem(chord, idx, project.id, editMode);
    chordPalette.appendChild(thumb);
  });

  if (editMode) {
    const addBtn = document.createElement('div');
    addBtn.className = 'chord-palette-add';
    addBtn.title = '코드 추가';
    addBtn.innerHTML = '+';
    addBtn.onclick = async () => {
      await stopPlayAll(false, { wait: true });
      location.href = 'home.html?view=editor&from_project=' + project.id;
    };
    chordPalette.appendChild(addBtn);
  }

  // 데스크톱: 마우스 휠로 좌우 스크롤
  chordPalette.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      chordPalette.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  section.appendChild(chordPalette);

  // ── 스크롤바 (에딧모드에서만) ──
  if (editMode) {
    const scrollbar = document.createElement('div');
    scrollbar.className = 'palette-scrollbar';
    const track = document.createElement('div');
    track.className = 'palette-scrollbar-track';
    const dot = document.createElement('div');
    dot.className = 'palette-scrollbar-dot';
    track.appendChild(dot);
    scrollbar.appendChild(track);
    section.appendChild(scrollbar);
    requestAnimationFrame(() => initPaletteScrollbar(chordPalette, track, dot));
  }

  return section;
}

function initPaletteScrollbar(palette, track, dot) {
  function updateDot() {
    const maxScroll = palette.scrollWidth - palette.clientWidth;
    const dotRange = track.offsetWidth - dot.offsetWidth;
    if (maxScroll <= 0) {
      dot.style.left = '0px';
      return;
    }
    dot.style.left = (palette.scrollLeft / maxScroll) * dotRange + 'px';
  }

  palette.addEventListener('scroll', updateDot, { passive: true });
  updateDot();

  // ── 도트 드래그 (터치+마우스 통합, setPointerCapture) ──
  let startClientX = 0;
  let startScrollLeft = 0;
  let startDotLeft = 0;

  dot.addEventListener('pointerdown', e => {
    e.stopPropagation();
    e.preventDefault();
    dot.setPointerCapture(e.pointerId);
    dot.style.transition = 'none'; // 드래그 중 transition 제거
    startClientX = e.clientX;
    startScrollLeft = palette.scrollLeft;
    startDotLeft = parseFloat(dot.style.left) || 0;
  });

  dot.addEventListener('pointermove', e => {
    if (!dot.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startClientX;
    const maxScroll = palette.scrollWidth - palette.clientWidth;
    const dotRange = track.offsetWidth - dot.offsetWidth;
    if (dotRange <= 0) return;
    if (maxScroll <= 0) {
      dot.style.left = Math.max(0, Math.min(dotRange, startDotLeft + dx)) + 'px';
    } else {
      palette.scrollLeft = Math.max(0, Math.min(maxScroll,
        startScrollLeft + (dx / dotRange) * maxScroll
      ));
    }
  });

  dot.addEventListener('pointerup', e => {
    dot.style.transition = '';
    dot.releasePointerCapture(e.pointerId);
  });
  dot.addEventListener('pointercancel', e => {
    dot.style.transition = '';
    dot.releasePointerCapture(e.pointerId);
  });

  // ── 트랙 빈 곳 탭 시 점프 (데스크톱) ──
  track.addEventListener('pointerdown', e => {
    if (e.target === dot) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left - dot.offsetWidth / 2;
    const dotRange = track.offsetWidth - dot.offsetWidth;
    const maxScroll = palette.scrollWidth - palette.clientWidth;
    if (maxScroll <= 0) {
      dot.style.left = Math.max(0, Math.min(dotRange, x)) + 'px';
    } else {
      palette.scrollLeft = Math.max(0, Math.min(maxScroll, (x / dotRange) * maxScroll));
    }
  });
}

function createPaletteItem(chord, idx, projectId, editMode = true) {
  const thumb = document.createElement('div');
  thumb.className = 'chord-palette-item';
  thumb.dataset.chordId = chord.id;
  thumb.dataset.idx = idx;

  const cv = document.createElement('canvas');
  const _thumbW = 160;
  const _thumbH = Math.round(BASE_H * _thumbW / BASE_W);
  cv.width = _thumbW; cv.height = _thumbH;
  drawCanvas(cv.getContext('2d'), _thumbW / BASE_W, chord);
  const thumbImg = document.createElement('img');
  thumbImg.src = cv.toDataURL('image/png');

  thumb.appendChild(thumbImg);

  if (editMode) {
    const delBtn = document.createElement('button');
    delBtn.className = 'chord-palette-delete';
    delBtn.textContent = '✕';
    delBtn.onclick = e => { e.stopPropagation(); deleteChordFromProject(projectId, chord.id); };
    thumb.appendChild(delBtn);

    // HTML5 드래그: 슬롯으로 이동 + 썸네일 순서 변경
    thumb.draggable = true;
    thumb.addEventListener('dragstart', e => {
      e.dataTransfer.setData('chord-palette-id', chord.id);
      e.dataTransfer.setData('chord-palette-project', projectId);
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    thumb.addEventListener('dragover', e => {
      e.preventDefault();
      thumb.classList.add('reorder-over');
    });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('reorder-over'));
    thumb.addEventListener('drop', e => {
      e.preventDefault();
      thumb.classList.remove('reorder-over');
      const sourceId = e.dataTransfer.getData('chord-palette-id');
      const fromProject = e.dataTransfer.getData('chord-palette-project');
      if (sourceId && sourceId !== chord.id && fromProject === projectId) {
        reorderChords(projectId, sourceId, chord.id);
      }
    });

    // ── 모바일 (터치) ──
    setupPaletteTouchDrag(thumb, chord, projectId);
  }

  // ── 클릭: 에딧모드 → 에디터 이동, 뷰모드 → 모달 ──
  let mouseDragged = false;
  thumb.addEventListener('mousedown', () => { mouseDragged = false; });
  thumb.addEventListener('mousemove', () => { mouseDragged = true; });
  thumb.addEventListener('click', async e => {
    if (mouseDragged) return;
    if (editMode) {
      await stopPlayAll(false, { wait: true });
      location.href = 'home.html?view=editor&from_project=' + projectId + '&chord_id=' + chord.id;
    } else {
      openViewModal(chord, projectId);
    }
  });

  return thumb;
}

function setupPaletteTouchDrag(thumb, chord, projectId) {
  // 에딧모드에서 팔레트 좌우 스크롤이 막혀 있으므로
  // 스크롤 방지 로직 없이 단순하게 드래그만 처리
  const DRAG_THRESHOLD = 8; // px

  thumb.addEventListener('contextmenu', e => e.preventDefault());

  let ghost = null;
  let startX = 0, startY = 0;
  let dragging = false;
  let lastOverSlot = null;

  function cleanup() {
    if (ghost) { ghost.remove(); ghost = null; }
    thumb.classList.remove('dragging');
    document.querySelectorAll('.chord-slot').forEach(s => s.classList.remove('drag-over'));
    dragging = false;
    lastOverSlot = null;
  }

  function startGhost(cx, cy) {
    const ghostCv = document.createElement('canvas');
    ghostCv.width = 160; ghostCv.height = 120;
    drawCanvas(ghostCv.getContext('2d'), 160 / BASE_W, chord);
    ghost = document.createElement('img');
    ghost.src = ghostCv.toDataURL('image/png');
    ghost.className = 'drag-ghost';
    ghost.style.width = '80px'; ghost.style.height = '60px';
    ghost.style.left = (cx - 40) + 'px';
    ghost.style.top  = (cy - 30) + 'px';
    document.body.appendChild(ghost);
    thumb.classList.add('dragging');
  }

  thumb.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dragging = false;
    lastOverSlot = null;
  }, { passive: true });

  thumb.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!dragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      dragging = true;
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      startGhost(t.clientX, t.clientY);
    }

    if (dragging) {
      e.preventDefault();
      ghost.style.left = (t.clientX - 40) + 'px';
      ghost.style.top  = (t.clientY - 30) + 'px';
      document.querySelectorAll('.chord-slot').forEach(s => s.classList.remove('drag-over'));
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const slot = el ? el.closest('.chord-slot') : null;
      lastOverSlot = slot || null;
      if (slot) slot.classList.add('drag-over');
    }
  }, { passive: false });

  thumb.addEventListener('touchend', e => {
    if (dragging) {
      if (lastOverSlot && lastOverSlot.dataset.lineId) {
        placeChordInSlot(projectId, lastOverSlot.dataset.lineId, parseInt(lastOverSlot.dataset.slotIdx), chord.id);
      }
      cleanup();
      e.preventDefault();
    } else {
      if (e.target.closest('.chord-palette-delete')) { cleanup(); return; }
      cleanup();
      openViewModal(chord, projectId);
    }
  });

  thumb.addEventListener('click', e => {
    if (dragging) e.stopPropagation();
  });

  thumb.addEventListener('touchcancel', cleanup);
}

function placeChordInSlot(projectId, rowId, slotIdx, chordId) {
  const p = getProject(projectId);
  if (!p) return;
  const row = p.arrangement.find(r => r.id === rowId);
  if (!row) return;
  if (!row.slots) row.slots = new Array(8).fill(null);
  row.slots[slotIdx] = chordId;
  p.updatedAt = Date.now();
  updateProject(p);
  const chord = p.chords.find(c => c.id === chordId);
  analytics.track('chord_slot_placed', { project_id: projectId, chord_name: chord?.name ?? '' });
  reRenderChordArea(rowId, row, p);
  // 드롭 애니메이션
  requestAnimationFrame(() => {
    const slot = document.querySelector(`.project-line[data-line-id="${rowId}"] .chord-slot[data-slot-idx="${slotIdx}"]`);
    if (slot) {
      slot.classList.add('slot-drop-anim');
      slot.addEventListener('animationend', () => slot.classList.remove('slot-drop-anim'), { once: true });
    }
  });
}

function reRenderChordArea(lineId, line, project) {
  const lineDiv = document.querySelector(`.project-line[data-line-id="${lineId}"]`);
  if (!lineDiv) return;

  // 편집 모드: chord-row-wrapper(래퍼+3-dot)가 있으면 래퍼째 교체
  const oldWrapper = lineDiv.querySelector('.chord-row-wrapper');
  if (oldWrapper) {
    oldWrapper.replaceWith(buildChordArea(line, project, true));
    lucide.createIcons(); // 새 3-dot 아이콘 렌더링
    return;
  }

  // 뷰 모드: chord-area만 교체
  const oldArea = lineDiv.querySelector('.chord-area');
  if (!oldArea) return;
  oldArea.replaceWith(buildChordArea(line, project, false));
}

function swapChordSlots(projectId, srcLineId, srcIdx, tgtLineId, tgtIdx) {
  const p = getProject(projectId);
  if (!p) return;
  const srcLine = p.arrangement.find(l => l.id === srcLineId);
  const tgtLine = p.arrangement.find(l => l.id === tgtLineId);
  if (!srcLine || !tgtLine) return;
  if (!srcLine.slots) srcLine.slots = new Array(8).fill(null);
  if (!tgtLine.slots) tgtLine.slots = new Array(8).fill(null);
  if (srcLineId === tgtLineId && srcIdx === tgtIdx) return;
  const tmp = srcLine.slots[srcIdx];
  srcLine.slots[srcIdx] = tgtLine.slots[tgtIdx];
  tgtLine.slots[tgtIdx] = tmp;
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderChordArea(srcLineId, srcLine, p);
  if (srcLineId !== tgtLineId) reRenderChordArea(tgtLineId, tgtLine, p);
}

function reorderChords(projectId, sourceId, targetId) {
  const p = getProject(projectId);
  if (!p) return;
  const srcIdx = p.chords.findIndex(c => c.id === sourceId);
  if (srcIdx === -1) return;
  const [chord] = p.chords.splice(srcIdx, 1);
  const tgtIdx = p.chords.findIndex(c => c.id === targetId);
  p.chords.splice(tgtIdx, 0, chord);
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderThumbList(projectId);
}

function reRenderThumbList(projectId) {
  const p = getProject(projectId);
  if (!p) return;
  const old = document.getElementById('palette-section-' + projectId);
  if (!old) return;
  old.replaceWith(buildChordPalette(p, isEditMode));
  lucide.createIcons();
}

function deleteChordFromProject(projectId, chordId) {
  if (!confirm('이 코드를 삭제하시겠습니까?')) return;
  const p = getProject(projectId);
  if (!p) return;
  p.chords = p.chords.filter(c => c.id !== chordId);
  // 배열에서도 제거
  p.arrangement.forEach(row => {
    row.slots = row.slots.map(s => s === chordId ? null : s);
  });
  p.updatedAt = Date.now();
  updateProject(p);
  renderProjectView(projectId);
}

function openDeleteConfirm(projectId) {
  const overlay = document.getElementById('delete-confirm-overlay');
  const modal   = overlay.querySelector('.delete-confirm-modal');
  const confirmBtn = document.getElementById('delete-confirm-btn');
  confirmBtn.onclick = () => { closeDeleteConfirm(); deleteProject(projectId); };
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('open');
    modal.style.animation = 'deleteConfirmIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  });
}

function closeDeleteConfirm() {
  const overlay = document.getElementById('delete-confirm-overlay');
  const modal   = overlay.querySelector('.delete-confirm-modal');
  modal.style.animation = 'deleteConfirmOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards';
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('open');
    modal.style.animation = '';
  }, 220);
}

async function deleteProject(projectId) {
  let projects = loadProjects();
  const target = projects.find(p => p.id === projectId);
  const chordCount = target?.chords?.length ?? 0;
  analytics.track('project_deleted', { project_id: projectId, chord_count: chordCount });
  projects = projects.filter(p => p.id !== projectId);
  saveProjects(projects);
  renderSidebar();
  await stopPlayAll(false, { wait: true });
  location.href = 'home.html?tab=projects';
}

// ═══════════════════════════════════════════════════════════════
// Orientation 감지
// ═══════════════════════════════════════════════════════════════
function setupOrientationListener() {
  const mq = window.matchMedia('(orientation: portrait)');
  const handler = () => {
    if (!isMobileOrTablet()) return;
    if (currentProjectId && !document.getElementById('view-project').classList.contains('hidden')) {
      renderProjectView(currentProjectId);
    }
  };
  try { mq.addEventListener('change', handler); } catch(e) { mq.addListener(handler); }
}

// ═══════════════════════════════════════════════════════════════
// 모달: 뷰
// ═══════════════════════════════════════════════════════════════
let viewModalChord    = null;
let viewModalProjectId = null;

function openViewModal(chord, projectId) {
  viewModalChord = chord;
  viewModalProjectId = projectId;
  analytics.track('chord_view_modal_opened', { chord_name: chord?.name ?? '', project_id: projectId });

  document.getElementById('modal-view-title').textContent = buildChordName(chord);

  const cv = document.getElementById('modal-view-canvas');
  cv.width  = 480; cv.height = 360;
  drawCanvas(cv.getContext('2d'), 480 / BASE_W, chord);

  // 재생
  document.getElementById('modal-view-play').onclick = () => playChord(chord);

  document.getElementById('modal-view').classList.remove('hidden');
  lucide.createIcons();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════
// 공유 기능
// ═══════════════════════════════════════════════════════════════

function encodeOpenMute(arr) {
  return arr.map(v => v === 'mute' ? 'm' : 'o').join('');
}
function decodeOpenMute(str) {
  return typeof str === 'string'
    ? str.split('').map(c => c === 'm' ? 'mute' : 'open')
    : str;
}
function toBase64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromBase64url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64 + '=='.slice(0, (4 - b64.length % 4) % 4))));
}

// deflate-raw 압축 → base64url (CompressionStream 미지원 시 무압축 fallback)
async function toBase64urlZ(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    const binary = Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch(e) {
    return toBase64url(str); // fallback
  }
}
// 압축 해제 (실패 시 무압축으로 재시도)
async function fromBase64urlZ(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch(e) {
    return fromBase64url(b64url); // fallback: 무압축 legacy
  }
}

function buildSharePayload(project) {
  const idToIdx = {};
  project.chords.forEach((c, i) => idToIdx[c.id] = i);
  const chords = project.chords.map((c, i) => ({
    i, name: c.name, root: c.root, triad: c.triad, seventh: c.seventh,
    func: c.func, tensions: c.tensions, bass: c.bass, accidental: c.accidental,
    dots: c.dots, openMute: encodeOpenMute(c.openMute),
    barre: c.barre, fretNumber: c.fretNumber, fingerNumMode: c.fingerNumMode
  }));
  const arr = project.arrangement.map(line =>
    (line.slots || new Array(8).fill(null))
      .map(id => id !== null && idToIdx[id] !== undefined ? idToIdx[id] : null)
  );
  return JSON.stringify({ v: 2, bpm: project.bpm ?? 120, capo: project.capo ?? 0,
                          col: project.colCount || 4, chords, arr });
}
async function generateShareCode(project) {
  return await toBase64urlZ(buildSharePayload(project));
}
async function generateShareUrl(project) {
  return 'https://chorditor.github.io/chord_editor/share/?share=' + await toBase64urlZ(buildSharePayload(project));
}

async function parseShareCode(raw) {
  let b64;
  // legacy prefix 지원 (이전에 생성된 공유 코드 호환)
  if (raw.startsWith('chorditor:v2:')) b64 = raw.slice(13).trim();
  else if (raw.startsWith('chorditor:v1:')) {
    // v1: 무압축 legacy
    try {
      const payload = JSON.parse(fromBase64url(raw.slice(13).trim()));
      return payload.v === 1 ? payload : null;
    } catch(e) { return null; }
  }
  else if (raw.includes('?share=')) b64 = new URL(raw).searchParams.get('share');
  else b64 = raw.trim();
  if (!b64) return null;
  try {
    const json = await fromBase64urlZ(b64);
    const payload = JSON.parse(json);
    return (payload.v === 1 || payload.v === 2) ? payload : null;
  } catch(e) { return null; }
}

async function openShareModal(projectId) {
  const project = getProject(projectId);
  if (!project) return;
  const code    = await generateShareCode(project);
  const fullUrl = await generateShareUrl(project);
  const codeEl     = document.getElementById('share-code-input');
  const urlEl      = document.getElementById('share-url-input');
  const urlCopyBtn = document.getElementById('share-url-copy-btn');
  // 공유 코드: 앞 20자 + … + 뒤 6자 (복사용 전체값은 data-full에 보관)
  const shorten = s => s.length > 30 ? s.slice(0, 20) + '…' + s.slice(-6) : s;
  codeEl.value        = shorten(code);
  codeEl.dataset.full = code;
  // URL 필드: 로딩 중 표시 후 is.gd 단축 URL로 교체
  urlEl.value         = '단축 링크 생성 중…';
  urlEl.dataset.full  = fullUrl;   // fallback용 미리 저장
  urlCopyBtn.disabled = true;
  document.getElementById('modal-share').classList.remove('hidden');
  lucide.createIcons();
  // is.gd API 호출
  try {
    const res  = await fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(fullUrl));
    const text = (await res.text()).trim();
    if (text.startsWith('ERROR') || !text.startsWith('http')) throw new Error(text);
    urlEl.value        = text;   // 예: https://is.gd/aBcDeF (~21자)
    urlEl.dataset.full = text;   // 단축 URL 자체를 복사 대상으로
  } catch (e) {
    // API 실패 시 전체 URL 단축 표시로 fallback
    urlEl.value        = shorten(fullUrl);
    urlEl.dataset.full = fullUrl;
  } finally {
    urlCopyBtn.disabled = false;
  }
}
function _fallbackCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}
function _flashBtn(id, msg) {
  const btn = document.getElementById(id), orig = btn.textContent;
  btn.textContent = msg; setTimeout(() => btn.textContent = orig, 1500);
}
async function copyShareCode() {
  const el = document.getElementById('share-code-input');
  const val = el.dataset.full || el.value;
  if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => _fallbackCopy(val));
  else _fallbackCopy(val);
  _flashBtn('share-code-copy-btn', '복사됨!');
  analytics.track('share_initiated', { type: 'code' });
}
async function copyShareUrl() {
  const el = document.getElementById('share-url-input');
  const val = el.dataset.full || el.value;
  if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => _fallbackCopy(val));
  else _fallbackCopy(val);
  _flashBtn('share-url-copy-btn', '복사됨!');
  analytics.track('share_initiated', { type: 'url' });
}

let _pendingImportPayload = null;

function openImportModal(payload) {
  _pendingImportPayload = payload;
  document.getElementById('import-meta').textContent =
    `BPM ${payload.bpm} · Capo ${payload.capo} · ${payload.col}칸 · 코드 ${payload.chords.length}개 · ${payload.arr.length}줄`;
  const sel = document.getElementById('import-project-select');
  sel.innerHTML = '<option value="">프로젝트 선택…</option>';
  loadProjects().forEach(p => {
    sel.appendChild(Object.assign(document.createElement('option'), { value: p.id, textContent: p.name }));
  });
  document.getElementById('import-new-name').value = '';
  document.getElementById('modal-import').classList.remove('hidden');
  lucide.createIcons();
}

function confirmImport(mode) {
  const payload = _pendingImportPayload; if (!payload) return;
  const opts = {
    applyBpm:  document.getElementById('import-apply-bpm').checked,
    applyCapo: document.getElementById('import-apply-capo').checked,
    applyCol:  document.getElementById('import-apply-col').checked,
  };
  let targetId;
  if (mode === 'new') {
    const name = document.getElementById('import-new-name').value.trim();
    if (!name) { alert('프로젝트 이름을 입력하세요.'); return; }
    const p = { id: genId(), name, pinned: false, pinnedOrder: 0, important: false, importantOrder: 0, capo: 0, bpm: 120,
                colCount: 4, createdAt: Date.now(), updatedAt: Date.now(), chords: [], arrangement: [] };
    const list = loadProjects(); list.push(p); saveProjects(list); targetId = p.id;
  } else {
    targetId = document.getElementById('import-project-select').value;
    if (!targetId) { alert('프로젝트를 선택하세요.'); return; }
  }
  applyImportPayload(targetId, payload, opts);
  closeModal('modal-import');
  analytics.track('import_completed', {
    chord_count: payload.chords?.length || 0,
    target: mode === 'new' ? 'new_project' : 'existing_project',
  });
  _pendingImportPayload = null;
  renderSidebar();
  navigateTo('project', targetId);
}

function applyImportPayload(projectId, payload, opts) {
  const p = getProject(projectId); if (!p) return;
  if (opts.applyBpm)  p.bpm      = payload.bpm;
  if (opts.applyCapo) p.capo     = payload.capo;
  if (opts.applyCol)  p.colCount = payload.col;
  const indexToNewId = {};
  payload.chords.forEach(pc => {
    const newId = genId(); indexToNewId[pc.i] = newId;
    p.chords.push({ id: newId, name: pc.name, root: pc.root, triad: pc.triad,
      seventh: pc.seventh, func: pc.func, tensions: pc.tensions, bass: pc.bass,
      accidental: pc.accidental, dots: pc.dots, openMute: decodeOpenMute(pc.openMute),
      barre: pc.barre, fretNumber: pc.fretNumber, fingerNumMode: pc.fingerNumMode });
  });
  payload.arr.forEach((slotRow, rowIdx) => {
    const slots = (slotRow || []).map(idx =>
      idx !== null && indexToNewId[idx] !== undefined ? indexToNewId[idx] : null);
    while (slots.length < 8) slots.push(null);
    if (rowIdx < p.arrangement.length) {
      // 기존 라인이 있으면 텍스트는 보존하고 슬롯만 덮어쓰기
      p.arrangement[rowIdx].slots = slots.slice(0, 8);
    } else {
      // 기존 라인보다 많으면 새 빈 라인 추가
      p.arrangement.push({ id: genId(), text: '', slots: slots.slice(0, 8) });
    }
  });
  p.updatedAt = Date.now(); updateProject(p);
}


// Android Activity → WebView 진입점
window._handleShareImport = async function(rawCode) {
  const payload = await parseShareCode(rawCode);
  if (payload) openImportModal(payload);
  else alert('공유 코드가 올바르지 않습니다.');
};

// ── OAuth 리다이렉트 후 처리 (웹 전용, shared.js에서 typeof 가드로 호출) ──
function onAuthSignedIn() {
  setTimeout(() => checkAndShowNotice(), 500);
}

// ═══════════════════════════════════════════════════════════════
// 초기화 (home.html 전용)
// ═══════════════════════════════════════════════════════════════
// ─── 프로젝트 페이지 닫기 (슬라이드다운 애니메이션) ──────────────
async function closeProjectPage() {
  await stopPlayAll(false, { wait: true });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => {
      location.href = 'home.html?tab=projects&return=1';
    }, 260);
  } else {
    location.href = 'home.html?tab=projects&return=1';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // ── 페이지 진입 애니메이션 ────────────────────────────────
  // project-enter(슬라이드업)와 page-cover(fade-out)를 동시에 진행
  // → 슬라이드가 절반쯤 진행됐을 때 커버가 걷혀 자연스럽게 노출
  const _shell = document.querySelector('.app-shell');
  if (_shell) _shell.classList.add('project-enter');

  // ── UI 초기화 ──────────────────────────────────────────────
  setupOrientationListener();
  updateExportScaleOptions();
  renderPlanBadge();
  lucide.createIcons();
  initAppVersion();

  // ── 페이지 커버 제거 (project-enter 슬라이드와 동시에 fade-out) ──
  {
    const _cover = document.getElementById('page-cover');
    if (_cover) {
      requestAnimationFrame(() => {
        _cover.classList.add('cover-out');
        setTimeout(() => { _cover.style.display = 'none'; }, 200);
      });
    }
  }

  // 뒤로가기 버튼 항상 표시 (프로젝트 목록으로 이동)
  const _backBtn = document.getElementById('back-btn');
  if (_backBtn) _backBtn.classList.remove('hidden');

  // 새 프로젝트 모달 Enter 키
  document.getElementById('create-project-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmCreateProject(); });

  // URL ?id= 파라미터로 프로젝트 자동 렌더링
  const params = new URLSearchParams(location.search);
  const projectIdParam = params.get('id');
  if (projectIdParam) {
    renderProjectView(projectIdParam);
  } else {
    // id 없이 접근한 경우 홈으로 리다이렉트
    location.href = 'home.html';
    return;
  }

  // URL share 파라미터 처리
  const shareParam = params.get('share');
  if (shareParam) {
    history.replaceState(null, '', location.pathname);
    parseShareCode(shareParam).then(payload => {
      if (payload) openImportModal(payload);
      else alert('공유 코드가 올바르지 않습니다.');
    });
  }

  await initBilling();

  // ── DEV 빌드: 인증 체크 없이 바로 진입 ──────────────────────
  if (APP_VERSION.includes('_dev')) {
    initSupabase().catch(() => {});
    setTimeout(() => checkAndShowNotice(), 800);
    return;
  }

  // ── Android: localStorage 세션 유효성 확인 ───────────────────
  if (window.Capacitor?.isNativePlatform()) {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) { window.location.replace('onboarding.html'); return; }
    try {
      const session = JSON.parse(stored);
      const now = Math.floor(Date.now() / 1000);
      // 만료 5분 유예 (네트워크 지연 대비)
      if (!session.user || (session.expires_at && session.expires_at < now - 300)) {
        window.location.replace('onboarding.html'); return;
      }
      _authReady = true;
      analytics.setUserId(session.user.id);
      analytics.track('app_open', { platform: 'android', project_count: loadProjects().length });
      _billingReady.then(async () => {
        if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
        await syncPlanFromBilling();
        fetchPlanWithToken(session.access_token).catch(() => {});
      }).catch(() => {});
    } catch(e) { window.location.replace('onboarding.html'); return; }
    initSupabase().catch(() => {});
    setTimeout(() => checkAndShowNotice(), 500);
    return;
  }

  // ── 웹: Supabase 세션 복원 ───────────────────────────────────
  await initSupabase();
  analytics.track('app_open', { platform: 'web', project_count: loadProjects().length });
  setTimeout(() => checkAndShowNotice(), 1000);
});

