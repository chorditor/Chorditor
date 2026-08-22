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

  // 너트 — r(프렛번호)>=3이면 다이어그램 시작이 0프렛이 아니므로 두꺼운 선 생략 (r=2까지는 너트 표시)
  const nutW = Math.max(4, 9 * sc);
  const lineW = Math.max(1, 3 * sc);
  if (!_fretNum || _fretNum === '2') {
    const nx = tl - nutW, ny = tt - lineW / 2, nw = nutW, nh = (tb - tt) + lineW;
    c.fillStyle = '#242729';
    c.fillRect(nx, ny, nw, nh);
  }

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
let isEditMode         = false;
let contextProjectId   = null;
// 에디터 왕복 복귀 상태 (편집 모드 + 스크롤 위치 유지)
let _pendingEditRestore = null;

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
  const _curChord = {
    dots, openMute, barre: barreActive,
    fretNumber: currentFretNumber, fingerNumMode, name: buildChordName(),
  };
  VoicingCanvas.draw(exp, chordToVoicing(_curChord), {
    chordName: _curChord.name, fingerNumMode,
    ratio: EXPORT_BASE_W / VoicingCanvas.BASE_W * scale,
  });

  const base64   = exp.toDataURL('image/png').split(',')[1];
  const fileName = buildChordName() + '_chord.png';

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const SaveImage = window.Capacitor.Plugins.SaveImage;
      await SaveImage.saveToGallery({ base64, fileName: fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') });
      showSaveToast();
      incrementStat('images');
      analytics.track('image_saved', { scale, source: 'editor', success: true });
    } catch (e) { console.error('저장 실패:', e); analytics.track('image_saved', { scale, source: 'editor', success: false }); }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    incrementStat('images');
    analytics.track('image_saved', { scale, source: 'editor', success: true });
  }
}

// 드롭다운 진입점 (에디터 저장 버튼 → showScaleDropdown 호출로 대체)
async function savePNG() { /* 직접 호출 시 드롭다운 없이 scale=1 */ await _doSavePNG(1); }
// resizeCanvas 제거됨 (에디터 전용) — resize 리스너 불필요

// ═══════════════════════════════════════════════════════════════
// 노트 저장: 팔레트 코드 이미지(개별 저장) / 텍스트 클립보드 복사
//  - 이미지 저장 UI는 코드에디터의 img-save-modal(배율·투명배경) 이식
//  - 팔레트 코드는 합성하지 않고 각각 개별 PNG로 저장, 미리보기는 첫 코드만
// ═══════════════════════════════════════════════════════════════
let _imgScale = 1;
let _imgTransparent = false;
let _noteSaveProjectId = null;

function _paletteSaveChords() {
  return getProject(_noteSaveProjectId)?.chords || [];
}

// ── 저장 방식 선택 시트 ──
function openNoteSaveChoice(projectId) {
  _noteSaveProjectId = projectId;
  document.getElementById('note-save-overlay')?.classList.remove('hidden');
}
function closeNoteSaveChoice() {
  document.getElementById('note-save-overlay')?.classList.add('hidden');
}

// 프리미엄 게이트: 앱 공용 요금제 바텀시트 오픈
function _noteSaveGate() {
  analytics.track('paywall_viewed', { trigger_source: 'note_save', current_plan: 'free' });
  openPlanSheet('note_save');
}

function noteSaveChoosePaletteImages() {
  closeNoteSaveChoice();
  if (getPlan() === 'free') { _noteSaveGate(); return; } // 프리미엄 게이트 → 바텀시트 페이월
  if (_paletteSaveChords().length === 0) { alert('저장할 코드가 없습니다.'); return; }
  openImgSaveModal();
}

async function noteSaveChooseText() {
  closeNoteSaveChoice();
  if (getPlan() === 'free') { _noteSaveGate(); return; } // 프리미엄 게이트 → 바텀시트 페이월
  const p = getProject(_noteSaveProjectId);
  if (!p) return;
  // 미저장 편집 반영: 현재 라인 DOM이 있으면 먼저 저장
  const linesEl = document.querySelector('.project-lines');
  if (linesEl?.isConnected) saveAllLines(_noteSaveProjectId, linesEl);
  const fresh = getProject(_noteSaveProjectId) || p;
  const text = (fresh.arrangement || []).map(l => l.text || '').join('\n');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else _fallbackCopy(text);
    showSaveToast();
  } catch (e) { _fallbackCopy(text); showSaveToast(); }
}

// ── 이미지 저장 모달 (배율·투명배경) ──
function openImgSaveModal() {
  const modal    = document.getElementById('img-save-modal');
  const backdrop = document.getElementById('img-save-backdrop');
  if (!modal) return;
  const slider = document.getElementById('img-scale-slider');
  const chk    = document.getElementById('img-transparent-chk');
  if (slider) slider.value = _imgScale;
  if (getPlan() === 'free') _imgTransparent = false; // 투명배경은 프리미엄
  if (chk) chk.checked = _imgTransparent;
  _updateImgTransparentUI();
  _updateImgScaleUI();
  _renderImgPreview();
  if (backdrop) backdrop.classList.add('open');
  modal.classList.add('open');
}

function closeImgSaveModal() {
  document.getElementById('img-save-modal')?.classList.remove('open');
  document.getElementById('img-save-backdrop')?.classList.remove('open');
}

function onImgScaleInput(v) {
  _imgScale = parseFloat(v) || 1;
  _updateImgScaleUI();
}

function onImgTransparentToggle(checked) {
  if (checked && getPlan() === 'free') {
    const chk = document.getElementById('img-transparent-chk');
    if (chk) chk.checked = false;
    _imgTransparent = false;
    closeImgSaveModal();
    showUpgradeModal('image_transparent');
    return;
  }
  _imgTransparent = !!checked;
  _renderImgPreview();
}

function _updateImgTransparentUI() {
  const label = document.getElementById('img-transparent-label');
  if (label) label.classList.toggle('locked', getPlan() === 'free');
}

function _updateImgScaleUI() {
  const valEl = document.getElementById('img-scale-val');
  const w = Math.round(EXPORT_BASE_W * _imgScale);
  const h = Math.round(EXPORT_BASE_H * _imgScale);
  const locked = _imgScale > getPlanLimit('maxScale');
  if (valEl) valEl.textContent = `${_imgScale}배 · ${w}×${h} px`;
  const saveBtn = document.getElementById('img-save-btn');
  if (saveBtn) {
    saveBtn.classList.toggle('locked', locked);
    saveBtn.textContent = locked ? '업그레이드' : '저장';
  }
}

// 미리보기 — 팔레트 첫 코드만
function _renderImgPreview() {
  const cv = document.getElementById('img-preview-canvas');
  if (!cv) return;
  const chords = _paletteSaveChords();
  if (!chords.length) return;
  const cssW = cv.offsetWidth;
  if (!cssW) { requestAnimationFrame(_renderImgPreview); return; }
  const dpr = window.devicePixelRatio || 1;
  const first = chords[0];
  VoicingCanvas.draw(cv, chordToVoicing(first), {
    chordName: first.name, fingerNumMode: first.fingerNumMode,
    ratio: (cssW * dpr) / VoicingCanvas.BASE_W,
    transparent: _imgTransparent,
  });
  cv.classList.toggle('transparent-bg', _imgTransparent);
}

async function onImgSave() {
  if (_imgScale > getPlanLimit('maxScale')) { closeImgSaveModal(); showUpgradeModal('scale_limit'); return; }
  if (_imgTransparent && getPlan() === 'free') { closeImgSaveModal(); showUpgradeModal('image_transparent'); return; }
  closeImgSaveModal();
  await _saveAllPaletteImages(_imgScale, _imgTransparent);
}

// 팔레트 코드 전체를 각각 개별 PNG로 저장
async function _saveAllPaletteImages(scale, transparent) {
  await refreshPlanFromDB();
  if (!canUseScale(scale)) { showUpgradeModal('scale_limit'); return; }
  const chords = _paletteSaveChords();
  if (!chords.length) return;

  const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
  const usedNames = new Set();
  const webFiles = []; // 웹 zip용 [{name, base64}]
  let saved = 0;
  for (const chord of chords) {
    const exp = document.createElement('canvas');
    VoicingCanvas.draw(exp, chordToVoicing(chord), {
      chordName: chord.name, fingerNumMode: chord.fingerNumMode,
      ratio: EXPORT_BASE_W / VoicingCanvas.BASE_W * scale,
      transparent,
    });
    // 동일 코드명 중복 시 파일명 충돌 방지 (_2, _3 …)
    let base = ((chord.name || 'chord') + '_chord').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');
    let fileName = base + '.png', n = 2;
    while (usedNames.has(fileName)) fileName = base + '_' + (n++) + '.png';
    usedNames.add(fileName);
    const base64 = exp.toDataURL('image/png').split(',')[1];
    if (isNative) {
      try {
        await window.Capacitor.Plugins.SaveImage.saveToGallery({ base64, fileName });
        saved++;
      } catch (e) { console.error('저장 실패:', e); }
    } else {
      webFiles.push({ name: fileName, base64 });
      saved++;
    }
  }
  // 웹: 브라우저가 다중 자동 다운로드를 차단하므로 개별 PNG를 zip 1개로 묶어 저장(파일은 개별 유지)
  if (!isNative && webFiles.length) {
    const title = (getProject(_noteSaveProjectId)?.name || '').trim() || 'note';
    _downloadPngZip(webFiles, title + '.zip');
  }
  if (saved) { incrementStat('images'); showSaveToast(); }
  analytics.track('image_saved', { scale, source: 'note_palette', count: saved, success: saved > 0 });
}

// ── store-only ZIP 생성기 (무의존, PNG는 이미 압축돼 있어 무압축 저장) ──
function _crc32(bytes) {
  if (!_crc32.table) {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    _crc32.table = t;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = _crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function _b64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function _downloadPngZip(files, zipName) {
  const enc = new TextEncoder();
  const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF];
  const u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
  const parts = [];   // 로컬 헤더 + 데이터
  const central = []; // 중앙 디렉터리
  let offset = 0;

  files.forEach(f => {
    const nameB = enc.encode(f.name);
    const data  = _b64ToBytes(f.base64);
    const crc   = _crc32(data);
    const lh = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
                         u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0));
    parts.push(new Uint8Array(lh), nameB, data);
    const cd = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
                         u32(crc), u32(data.length), u32(data.length),
                         u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
    central.push(new Uint8Array(cd), nameB);
    offset += lh.length + nameB.length + data.length;
  });

  const centralStart = offset;
  let centralSize = 0;
  central.forEach(c => centralSize += c.length);
  const eocd = [].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
                         u32(centralSize), u32(centralStart), u16(0));

  const blob = new Blob([...parts, ...central, new Uint8Array(eocd)], { type: 'application/zip' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  // 파일시스템 금지문자만 제거(한글 등 유니코드 제목 보존). 공백은 유지.
  link.download = zipName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || 'note_chords.zip';
  link.href = url;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

function playChord(chord, capoOverride) {
  const notes = [];
  const fretBase = chord.fretNumber >= 2 ? chord.fretNumber - 2 : 0;
  // capoOverride: 줄 단위 카포 변경점(line.capo)의 효력 카포. 미지정 시 프로젝트 기본 카포.
  const capoOffset = capoOverride != null ? capoOverride : (getProject(currentProjectId)?.capo ?? 0);
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
    title: '노트 한도에 도달했습니다',
    desc: {
      free:     '무료 플랜은 노트를 3개까지 만들 수 있습니다. Pro로 업그레이드하면 무제한으로 사용할 수 있습니다.',
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

// ── 되돌리기(Undo) — arrangement 스냅샷 스택 ─────────────────
// 대상: 텍스트 편집·붙여넣기·줄 생성/삭제/병합·코드슬롯 배치/교환/줄비우기.
// 팔레트(p.chords) 추가·삭제는 대상 아님(스냅샷에 arrangement만 담음).
// 스택은 페이지 세션 한정(페이지 이동 시 자연 소멸). 브라우저 네이티브 undo는
// keydown/beforeinput에서 차단 — 커스텀 스택과 이중 동작 시 br/캐럿 꼬임 방지.
let _undoStack = [];
let _undoProjectId = null;
const UNDO_MAX = 50;

// 변이 "직전" 상태를 저장 — 호출부는 반드시 arrangement 수정 전에 호출할 것
function pushUndoSnapshot(projectId) {
  const p = getProject(projectId);
  if (!p) return;
  if (_undoProjectId !== projectId) { _undoStack = []; _undoProjectId = projectId; }
  const snap = JSON.stringify(p.arrangement);
  if (_undoStack[_undoStack.length - 1] === snap) return; // 무변화 저장 중복 방지
  _undoStack.push(snap);
  if (_undoStack.length > UNDO_MAX) _undoStack.shift();
  _refreshUndoBtn();
}

function undoLastAction() {
  if (!_undoProjectId) return;
  const p = getProject(_undoProjectId);
  if (!p) return;
  const cur = JSON.stringify(p.arrangement);
  let snap = null;
  // 현재 상태와 동일한 스냅샷(결과적 무변화 저장)은 건너뛰고 실제 이전 상태까지 pop
  while (_undoStack.length) {
    const s = _undoStack.pop();
    if (s !== cur) { snap = s; break; }
  }
  if (snap === null) { _refreshUndoBtn(); return; }
  p.arrangement = JSON.parse(snap);
  p.updatedAt = Date.now();
  updateProject(p);
  renderProjectView(_undoProjectId);
  _refreshUndoBtn();
  window.Tutorial?.notify('undo:done'); // 재렌더 뒤에 알림
}

function _refreshUndoBtn() {
  const btn = document.getElementById('project-undo-btn');
  if (btn) btn.disabled = _undoStack.length === 0;
}

// ═══════════════════════════════════════════════════════════════
// 네비게이션
// ═══════════════════════════════════════════════════════════════
// contextProjectId는 초기화 시점 이전에도 참조되므로 파일 상단에 선언
// (let 선언은 TDZ로 인해 선언 전 접근 시 ReferenceError 발생)


// ─── Android 네이티브 뒤로가기 ────────────────────────────────
// 노트 페이지는 홈이 아니므로 종료하지 않는다 — 화면의 뒤로가기 버튼과 똑같이
// 노트 목록으로 물러난다. 앱 종료는 홈 탭 최상위(home.js)에서만 일어난다.
function handleNativeBack() {
  // 튜토리얼 중엔 화면을 옮기면 진행이 깨진다 → 그만둘지 묻는다(건너뛰기 버튼과 같은 경로).
  if (window.Tutorial?.isRunning?.()) { window.Tutorial.confirmSkip(); return; }
  closeProjectPage();
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
    const _projects = loadProjects();
    const _p0 = _projects.find(p => p.id === projectId);
    if (_p0 && isProjectLocked(_p0, _projects)) { openPlanSheet('note_locked'); return; }
    // 프로젝트 탭으로 이동 후 개별 프로젝트 표시
    switchTab('projects');
    _projectsSubView = 'project';
    contextProjectId = null;
    isEditMode = false;

    document.getElementById('view-projects-list')?.classList.add('hidden');
    const _viewProject = document.getElementById('view-project');
    if (_viewProject) {
      _viewProject.classList.remove('hidden');
      _viewProject.innerHTML = '<div class="project-loading-spinner"></div>';
    }
    _updateBackBtn();

    setTimeout(() => {
      renderProjectView(projectId);
      if (screen.orientation?.unlock) { try { screen.orientation.unlock(); } catch(e) {} }
    }, 200);

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

  const locked = isNotesLockedState(projects);
  if (important.length > 0 || locked) _renderProjectsSection(container, '중요', important);
  if (pinned.length > 0)    _renderProjectsSection(container, '즐겨찾기', pinned, locked);
  if (recent.length > 0)    _renderProjectsSection(container, '최근', recent, locked);

  if (projects.length === 0) {
    container.innerHTML = '<p style="padding:32px 20px;color:var(--text-muted);font-size:14px;text-align:center;">노트가 없습니다.<br>+ 버튼으로 새 노트를 만들어보세요.</p>';
  }

  lucide.createIcons();
}

function _renderProjectsSection(container, label, projects, locked = false) {
  const section = document.createElement('div');
  section.className = 'projects-section';

  const sectionLabel = document.createElement('div');
  sectionLabel.className = 'projects-section-label';
  sectionLabel.textContent = label;
  if (label === '중요') {
    const hint = document.createElement('span');
    hint.className = 'projects-section-hint';
    hint.textContent = '구독이 만료되어도 잠기지 않아요';
    sectionLabel.appendChild(hint);
  }
  if (locked && label === '최근') {
    const lockIcon = document.createElement('i');
    lockIcon.setAttribute('data-lucide', 'lock');
    lockIcon.className = 'projects-section-lock-icon';
    sectionLabel.appendChild(lockIcon);
  }
  section.appendChild(sectionLabel);

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'projects-item';
    item.dataset.id = project.id;
    if (locked && !project.important) item.classList.add('locked');

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
  const newName = prompt('노트 이름을 입력하세요:', p.name);
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
  incrementStat('notes'); // 노트 생성 퀘스트 누적 카운터
  navigateTo('project', newProject.id);
}

// ═══════════════════════════════════════════════════════════════
// 에디터 → 프로젝트에 추가
// ═══════════════════════════════════════════════════════════════
let userSelectedProjectId = null;

// ═══════════════════════════════════════════════════════════════
// 프로젝트 뷰 렌더링
// ═══════════════════════════════════════════════════════════════
let currentColCount  = 4; // (레거시) 신 모델은 currentOrient 사용
let currentOrient    = 'portrait'; // 'portrait'(세로) | 'landscape'(가로) — 헤더·팔레트 레이아웃 전용, 화면비 기준
let currentSlotLand  = false; // 코드슬롯 4/8개(박자 해상도) 결정 — currentOrient와 별개, 뷰포트 폭 787px 기준 순수 판정
let playbackActive = false;
let _userScrollHoldUntil = 0;   // 사용자 스크롤 감지 시 이 시각까지 자동스크롤 중단
let _autoScrollLineId = null;   // 자동스크롤이 마지막으로 처리한 줄 (줄 단위 갱신용)
let currentPlayTimeout = null;
let metronomeActive = false;
let metronomeSchedulerTimeout = null;
let metronomeBeats = []; // [{ ms, isDownbeat }] 재생 전 구간의 박 스케줄 — 줄마다 다른 BPM/박자를 반영
let metronomeNextBeatTime = 0;
let metronomeBeatCount = 0;
let playbackStartAudioTime = 0;
let playbackEndAudioTime = 0;   // 곡 종료 오디오 시각 (0 = 제한 없음)
// 코드 재생이 쓰는 시계(performance.now)의 '곡 0ms' 지점. 메트로놈도 이 값을 기준으로 붙는다.
// 예전엔 메트로놈만 audioCtx.currentTime으로 따로 원점을 잡아 두 시계가 어긋났다.
let playbackStartWallTime = 0;
let playbackTotalMs = 0;        // 곡 전체 길이(ms) — 메트로놈 종료 시각 계산용

// 스트로크 보정 — 코드는 한 점이 아니라 6줄을 STRUM_INTERVAL(8ms) 간격으로 훑는 소리다(총 ~40ms).
// 첫 음(6번줄)을 정박에 정확히 맞추면 귀가 느끼는 무게중심이 뒤에 있어 코드가 밀려 들린다.
// 실제 연주자도 정박보다 살짝 먼저 스트로크를 시작한다.
// 코드 재생 타이밍(refWallTime 체인)은 그대로 두고 메트로놈 원점만 이만큼 뒤로 미룬다
// — 상대적으로 코드가 먼저 시작되는 것과 같고, 재생 로직은 건드리지 않아 안전하다.
const STRUM_LEAD_MS = 20;

// 설정>사운드 마스터 볼륨용 최종 게인(엔벨로프 뒤 → 낮은 볼륨서도 클릭 없음)
let _upSfxMaster = null;
function _getUpSfxBus() {
  if (!_upSfxMaster || _upSfxMaster.context !== audioCtx) {
    _upSfxMaster = audioCtx.createGain();
    _upSfxMaster.connect(audioCtx.destination);
  }
  _upSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _upSfxMaster;
}

// 룩어헤드로 미리 예약해 둔 클릭 노드들. 재생이 멈추면 이걸 전부 꺼야 한다 —
// 타이머만 끄면 이미 예약된 최대 150ms 분량이 그대로 울리고, 페이지를 떠나도 따라온다.
let _metronomeNodes = [];

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
  gain.connect(_getUpSfxBus());

  osc.type = 'sine';
  osc.frequency.value = isDownbeat ? 740 : 520;

  // 스케줄러가 늦게 깨어나면 이미 지난 시각이 들어올 수 있다. 과거 시각은 파라미터 예약이
  // 무시되거나 순서가 뒤집혀 클릭이 뭉치므로 현재 시각으로 끌어올린다.
  if (time < audioCtx.currentTime) time = audioCtx.currentTime;

  const vol = isDownbeat ? 0.38 : 0.22;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  osc.start(time);
  osc.stop(time + 0.06);

  _metronomeNodes.push({ osc, gain });
  osc.onended = () => {
    _metronomeNodes = _metronomeNodes.filter(n => n.osc !== osc);
    try { gain.disconnect(); } catch (_) {}
  };
}

// 룩어헤드 스케줄러 — 소리 시각은 audioCtx 시계로 미리 예약하고, setTimeout은 "언제 다음
// 예약을 짤지" 깨우는 용도로만 쓴다. 주기를 룩어헤드보다 충분히 짧게 둬야 타이머가 한두 번
// 늦어도 구멍이 안 난다(50ms였을 땐 여유가 70ms뿐이라 스크롤·재렌더 한 번에 밀렸다).
const METRONOME_LOOKAHEAD = 0.15; // 미리 예약해 둘 범위(초)
const METRONOME_TICK_MS   = 25;   // 스케줄러 깨우는 주기

function scheduleMetronome() {
  if (!metronomeActive || !playbackActive || !audioCtx) return;
  const now = audioCtx.currentTime;

  while (metronomeNextBeatTime < now + METRONOME_LOOKAHEAD) {
    if (playbackEndAudioTime > 0 && metronomeNextBeatTime >= playbackEndAudioTime) break;
    if (metronomeBeatCount >= metronomeBeats.length) break; // 스케줄 끝(곡 종료)
    const beat = metronomeBeats[metronomeBeatCount];
    metronomeClick(metronomeNextBeatTime, beat.isDownbeat);
    metronomeNextBeatTime += beat.ms / 1000;
    metronomeBeatCount++;
  }
  metronomeSchedulerTimeout = setTimeout(scheduleMetronome, METRONOME_TICK_MS);
}

// metronomeBeats(줄마다 길이·강세가 다름)의 누적시간을 훑어, targetMs 이후에 오는 첫 박 경계를
// 찾는다. 줄마다 BPM·박자가 바뀌므로 고정 나눗셈이 아니라 누적합으로만 구할 수 있다.
// 반환 accMs는 그 박이 시작하는 곡 기준 시각(ms), idx는 그 박의 번호.
// targetMs가 박 중간이면 진행 중인 박은 건너뛴다 — 이미 지난 시각으로 예약하면 늦게 울린다.
function _metronomeIndexAtMs(targetMs) {
  let accMs = 0, idx = 0;
  while (idx < metronomeBeats.length && accMs < targetMs) {
    accMs += metronomeBeats[idx].ms;
    idx++;
  }
  return { idx, accMs };
}

// 메트로놈을 "지금 이 순간"의 코드 재생 위치에 붙인다.
// 기준은 코드 재생과 같은 시계(performance.now / playbackStartWallTime)로 잡고,
// 남은 시간만 오디오 시계로 옮긴다. 두 시계의 원점이 달라도 어긋날 수 없는 구조.
// → 재생 도중 껐다 켜도, 그 지점이 몇 번째 줄이든(다른 BPM·박자여도) 정확한 박에 재합류한다.
function syncMetronomeToPlayback() {
  if (!(playbackActive && playbackStartWallTime > 0)) {
    metronomeBeatCount = 0;
    metronomeNextBeatTime = audioCtx.currentTime + 0.05;
    return;
  }
  const elapsedMs = Math.max(0, performance.now() - playbackStartWallTime);
  const { idx, accMs } = _metronomeIndexAtMs(elapsedMs);
  metronomeBeatCount = idx;
  // (accMs - elapsedMs) = 다음 박까지 남은 시간. 이걸 그대로 오디오 시계에 얹는다.
  metronomeNextBeatTime = audioCtx.currentTime + (accMs - elapsedMs) / 1000;
  playbackEndAudioTime  = audioCtx.currentTime + (playbackTotalMs - elapsedMs) / 1000;
}

async function startMetronome() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
  syncMetronomeToPlayback();
  scheduleMetronome();
}

function _stopMetronomeAudio() {
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
  // 이미 예약된 클릭까지 즉시 끊는다. 타이머만 끄면 룩어헤드 분량이 그대로 울린다.
  const nodes = _metronomeNodes;
  _metronomeNodes = [];
  nodes.forEach(({ osc, gain }) => {
    try { osc.onended = null; } catch (_) {}
    try { gain.gain.cancelScheduledValues(0); gain.gain.value = 0; } catch (_) {}
    try { osc.stop(); } catch (_) {}   // 아직 시작 전이면 예약 자체가 취소된다
    try { gain.disconnect(); } catch (_) {}
  });
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
  window.Tutorial?.notify(`metronome:${metronomeActive ? 'on' : 'off'}`);
  if (metronomeActive && playbackActive) {
    // 재생 중에 켜면 지금 위치의 박에 맞춰 즉시 재합류
    startMetronome();
  } else if (!metronomeActive) {
    // 끄면 오디오 즉시 중단
    _stopMetronomeAudio();
  }
}

async function stopPlayAll(options = {}) {
  playbackActive = false;
  playbackEndAudioTime = 0;
  _stopMetronomeAudio();
  if (currentPlayTimeout) { clearTimeout(currentPlayTimeout); currentPlayTimeout = null; }
  const stopPromise = GuitarAudio.stop({ wait: options.wait === true });
  document.querySelectorAll('.row-playhead').forEach(el => el.remove());
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="play"></i>'; lucide.createIcons(); }
  if (options.wait) await stopPromise;
}

// 페이지 이탈(다른 화면으로 이동) 시 재생 중이던 사운드 잔류 방지 — 전환 애니메이션 동안
// 이전 문서가 살아있어 잔향(SUSTAIN 3.5초)이 다음 페이지까지 넘어가므로 하드컷으로 즉시 묵음.
window.addEventListener('pagehide', () => {
  playbackActive = false;
  _stopMetronomeAudio();
  if (currentPlayTimeout) { clearTimeout(currentPlayTimeout); currentPlayTimeout = null; }
  if (typeof Tone !== 'undefined') { try { Tone.getDestination().mute = true; } catch (e) {} }
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
});

async function playAll(projectId, startIndex = 0) {
  stopPlayAll();

  const project = getProject(projectId);
  if (!project) return;

  const isFirstInit = !audioCtx;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (isFirstInit) await GuitarAudio.syncContext(audioCtx); // Tone.js 동기화
  else await GuitarAudio.resume();

  const land = currentSlotLand;

  // 줄마다 박자·BPM·마디 수가 다를 수 있으므로 슬롯 하나하나의 재생 시간을 개별 계산해서 순서대로 나열.
  // 슬롯 수는 박자(분자)와 무관(마디 수 기준)이므로, 그 줄의 총 연주 시간(마디 수×분자×펄스)을
  // 슬롯 수만큼 균등 분할한다 — 분자가 슬롯 수와 안 맞아도(홀수 박자 등) 항상 정확히 나뉨.
  const orderedSlots = [];
  metronomeBeats = []; // 메트로놈도 줄마다 다른 BPM·박자를 따라가도록 같은 자리에서 스케줄 재생성
  let _runCapo = project.capo ?? 0; // 줄 카포 변경점 누적 — 변경점 이후 줄들에 계속 적용
  project.arrangement.forEach(row => {
    if (row.capo != null) _runCapo = row.capo;
    const meter  = getRowMeter(project, row);
    const rowBpm = getRowBpm(project, row);
    const bars   = getRowBars(row);
    const layout = computeRowLayout(bars) || computeRowLayout(2);
    const pulseMs = getPulseMs(rowBpm, meter.den);
    const slotCount = land ? layout.landscapeSlots : layout.portraitSlots;
    const step = land ? 1 : 2;
    const totalBeats = bars * meter.num;
    const totalMsForRow = totalBeats * pulseMs;
    const slotMs = totalMsForRow / slotCount;
    for (let k = 0; k < slotCount; k++) {
      const dataIdx = k * step;
      orderedSlots.push({
        chordId: row.slots?.[dataIdx] ?? null,
        lineId: row.id,
        slotIdx: dataIdx,
        slotMs,
        rowSlotCount: slotCount,
        posInRow: k,
        rowCapo: _runCapo,
      });
    }
    // 박(pulse) 단위 스케줄 — 마디 첫 박(다운비트)마다 강세, 분자 그대로 반영
    for (let b = 0; b < totalBeats; b++) {
      metronomeBeats.push({ ms: pulseMs, isDownbeat: (b % meter.num) === 0 });
    }
  });
  if (!orderedSlots.length) return;

  // startIndex 이전 슬롯들의 누적 시간(슬롯마다 길이가 다를 수 있어 합산 필요)
  let elapsedMsAtStart = 0;
  for (let k = 0; k < startIndex && k < orderedSlots.length; k++) elapsedMsAtStart += orderedSlots[k].slotMs;
  playbackStartAudioTime = audioCtx.currentTime + 0.05 - elapsedMsAtStart / 1000;

  playbackTotalMs = orderedSlots.reduce((s, o) => s + o.slotMs, 0);
  playbackEndAudioTime = playbackStartAudioTime + playbackTotalMs / 1000;
  playbackActive = true;
  analytics.track('playall_started', { project_id: projectId, bpm: project.bpm ?? 120, start_index: startIndex });
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="square"></i>'; lucide.createIcons(); }

  // 자동스크롤 상태 초기화 + 사용자 스크롤 감지 리스너 (스크롤 컨테이너당 1회만 부착)
  _autoScrollLineId = null;
  _userScrollHoldUntil = 0;
  const scrollHostEl = document.getElementById('project-lines-' + projectId);
  if (scrollHostEl && !scrollHostEl._userScrollHooked) {
    scrollHostEl._userScrollHooked = true;
    const markUserScroll = () => { _userScrollHoldUntil = Date.now() + 3000; };
    scrollHostEl.addEventListener('wheel', markUserScroll, { passive: true });
    scrollHostEl.addEventListener('touchmove', markUserScroll, { passive: true });
  }

  // 드리프트 방지: startIndex 슬롯이 재생됐어야 할 절대 기준 시각.
  // 메트로놈도 이 값을 원점으로 삼는다(playbackStartWallTime) — 여기서 두 시계가 하나로 묶인다.
  // analytics·lucide.createIcons 뒤에 잡아야 첫 코드가 실제로 울리는 시점과 원점이 일치한다.
  const refWallTime = performance.now() - elapsedMsAtStart;
  // 메트로놈만 STRUM_LEAD_MS 만큼 뒤로 — 코드 스트로크가 정박보다 살짝 먼저 시작되게 한다
  playbackStartWallTime = refWallTime + STRUM_LEAD_MS;
  let i = startIndex;
  let _accMs = elapsedMsAtStart;
  let _playheadEl = null;
  let _playheadLineId = null;
  async function next() {
    if (!playbackActive) { stopPlayAll(); return; }
    // 끝까지 재생됨(유저가 멈춘 게 아님) — 튜토리얼 완주 판정용
    if (i >= orderedSlots.length) {
      stopPlayAll();
      window.Tutorial?.notify('playall:done');
      // 튜토리얼: 끝까지 들었으면 '다음' 버튼만 풀어준다. 자동으로 넘기지 않는다.
      window.Tutorial?.enableNext?.();
      return;
    }
    const item = orderedSlots[i++];

    const slotEl = document.querySelector(`[data-line-id="${item.lineId}"][data-slot-idx="${item.slotIdx}"]`);
    if (slotEl) {
      const lineEl = slotEl.closest('.project-line');
      // 줄이 바뀌었을 때만 재생 막대를 새로 배치 — 같은 줄 안에서는 슬롯을 넘어가도
      // 애니메이션을 리셋하지 않고 계속 이어가서 끊김 없이 부드럽게 스윕.
      // (단, 코드슬롯 숨기기/보기 전환 등으로 chord-area가 재렌더되면 기존 막대가 DOM에서
      //  떨어져나가므로 lineId가 그대로여도 재삽입 — isConnected로 감지)
      if (lineEl && (item.lineId !== _playheadLineId || !_playheadEl?.isConnected)) {
        const areaEl = lineEl.querySelector('.chord-area');
        if (areaEl) {
          if (!_playheadEl) { _playheadEl = document.createElement('div'); _playheadEl.className = 'row-playhead'; }
          _playheadEl.remove(); // 재삽입해야 CSS 애니메이션이 다시 시작됨
          // 그리드는 항상 4/8칸 고정이지만 마디 수가 적은 줄(1마디)은 그중 절반만 사용
          // → 재생 막대도 텍스트 보조선 길이(=사용 중인 칸 비율)만큼만 스윕
          const maxSlots = land ? ROW_SLOT_CAP.landscape : ROW_SLOT_CAP.portrait;
          const usedFrac = item.rowSlotCount / maxSlots;
          const startPct = (item.posInRow / item.rowSlotCount) * usedFrac * 100;
          const endPct = usedFrac * 100;
          const remainingMs = (item.rowSlotCount - item.posInRow) * item.slotMs;
          _playheadEl.style.setProperty('--sweep-start', startPct + '%');
          _playheadEl.style.setProperty('--sweep-end', endPct + '%');
          _playheadEl.style.setProperty('--sweep-dur', remainingMs + 'ms');
          areaEl.appendChild(_playheadEl);
        }
        _playheadLineId = item.lineId;
      }
      // 자동스크롤: 슬롯마다가 아니라 줄이 바뀔 때만 갱신.
      // 사용자가 직접 스크롤하면(wheel/touchmove) 3초 동안 자동스크롤 중단.
      if (lineEl && item.lineId !== _autoScrollLineId) {
        _autoScrollLineId = item.lineId;
        if (Date.now() >= _userScrollHoldUntil) {
          const scrollEl = document.getElementById('project-lines-' + projectId);
          if (scrollEl) {
            const firstLine = scrollEl.querySelector('.project-line');
            const anchorTop = firstLine ? firstLine.offsetTop : 0;
            scrollEl.scrollTo({ top: lineEl.offsetTop - anchorTop, behavior: 'smooth' });
          }
        }
      }
    }

    if (item.chordId) {
      const p = getProject(projectId);
      const chord = p?.chords.find(c => c.id === item.chordId);
      if (chord) await playChord(chord, item.rowCapo);
    }
    // playChord 소요 시간을 빼고 정확한 다음 슬롯 시각까지만 대기
    _accMs += item.slotMs;
    const nextExpected = refWallTime + _accMs;
    const delay = Math.max(0, nextExpected - performance.now());
    currentPlayTimeout = setTimeout(next, delay);
  }

  // 메트로놈은 원점(playbackStartWallTime)이 확정된 뒤, 코드 재생과 같은 순간에 붙인다.
  // 예전엔 이 호출이 lucide.createIcons() 앞에 있어 두 시계의 원점이 수십 ms 어긋났다.
  if (metronomeActive) startMetronome();
  next();
}

// ═══════════════════════════════════════════════════════════════
// 줄(row) 단위 박자(meter)·마디 수 지원
// 코드슬롯 수는 박자(분자)와 무관 — "마디 수 × 오리엔테이션별 고정 분할수"로만 결정됨.
// (홀수 박자 곡도 코드 진행은 결국 마디를 짝수로 쪼개 배치하는 경우가 대부분이라,
//  분자를 슬롯 수 계산에 끌어들이면 오히려 부자연스러움 — 분자/분모는 재생 시간 계산에만 사용)
// ═══════════════════════════════════════════════════════════════
const ROW_SLOT_CAP    = { portrait: 4, landscape: 8 }; // 코드슬롯 그리드 최대 칸 수(고정 크기 기준)
const SLOTS_PER_BAR   = { portrait: 2, landscape: 4 };  // 마디 1개당 슬롯 수(오리엔테이션별 고정)

// 줄 → 프로젝트 기본 → 4/4. BPM(getRowBpm)과 같은 3단 폴백으로 통일.
// project.meter는 마디 정보 수정 모달의 "모든 줄에 적용"에서 설정된다.
function getRowMeter(project, row) {
  return row?.meter || project?.meter || { num: 4, den: 4 };
}
function getRowBpm(project, row) {
  return row?.bpm ?? project?.bpm ?? 120;
}
// 줄의 마디 수 설정 (기본 2마디/줄 — 기존 동작과 동일하게 유지). 1마디 · 반마디 선택 가능.
function getRowBars(row) {
  return row?.barsPerRow ?? 2;
}
// 줄 효력 카포: 이 줄(포함) 이전의 마지막 카포 변경점(line.capo), 없으면 프로젝트 기본 카포.
// 변경점은 그 줄부터 이후 줄에 계속 적용되고, 다음 변경점에서 갱신됨.
function getRowCapo(project, lineId) {
  let capo = project?.capo ?? 0;
  for (const row of project?.arrangement || []) {
    if (row.capo != null) capo = row.capo;
    if (row.id === lineId) break;
  }
  return capo;
}
// BPM은 4분음표 기준 — 분모가 4가 아니면 박(pulse) 하나의 실제 길이 보정 필요
function getPulseMs(bpm, den) {
  return (60000 / bpm) * (4 / (den || 4));
}
// 마디 수로부터 줄 레이아웃(세로/가로 슬롯 수) 계산. 박자 분자는 관여하지 않음.
function computeRowLayout(bars = 2) {
  const portraitSlots = bars * SLOTS_PER_BAR.portrait;
  const landscapeSlots = bars * SLOTS_PER_BAR.landscape;
  if (!Number.isInteger(portraitSlots) || !Number.isInteger(landscapeSlots)) return null;
  if (portraitSlots > ROW_SLOT_CAP.portrait || landscapeSlots > ROW_SLOT_CAP.landscape) return null;
  return { bars, portraitSlots, landscapeSlots };
}
// 줄의 슬롯 배열을 새 길이에 맞춰 리사이즈 (같은 인덱스=같은 박 순번이므로 앞부분은 그대로 보존)
function _resizeRowSlots(oldSlots, newLen) {
  const ns = new Array(newLen).fill(null);
  const src = oldSlots || [];
  for (let i = 0; i < Math.min(src.length, newLen); i++) ns[i] = src[i] ?? null;
  return ns;
}

function getGlobalSlotIndex(project, lineId, dataIdx) {
  const land = currentSlotLand;
  let globalIdx = 0;
  for (const row of project.arrangement) {
    const layout = computeRowLayout(getRowBars(row)) || computeRowLayout(2);
    if (row.id === lineId) {
      return globalIdx + (land ? dataIdx : dataIdx / 2);
    }
    globalIdx += land ? layout.landscapeSlots : layout.portraitSlots;
  }
  return 0;
}

// 재생 시작 지점: 스크롤 화면 최상단에 보이는 줄(절반 이상 보이는 첫 줄)의 첫 슬롯.
// 스크롤이 맨 위면 0(처음부터).
function getVisibleStartSlotIndex(projectId) {
  const scrollEl = document.getElementById('project-lines-' + projectId);
  if (!scrollEl || scrollEl.scrollTop <= 0) return 0;
  const lines = scrollEl.querySelectorAll('.project-line');
  if (!lines.length) return 0;
  const anchorTop = lines[0].offsetTop;
  for (const lineEl of lines) {
    const top = lineEl.offsetTop - anchorTop;
    if (top + lineEl.offsetHeight * 0.5 > scrollEl.scrollTop) {
      const p = getProject(projectId);
      if (!p || !lineEl.dataset.lineId) return 0;
      return getGlobalSlotIndex(p, lineEl.dataset.lineId, 0);
    }
  }
  // 모든 줄이 절반 기준을 못 넘김(맨 아래까지 스크롤) → 마지막 줄부터
  const lastEl = lines[lines.length - 1];
  const p = getProject(projectId);
  if (!p || !lastEl.dataset.lineId) return 0;
  return getGlobalSlotIndex(p, lastEl.dataset.lineId, 0);
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

  // 박 기준 canonical 이식 (1회): 저장 슬롯 = 박 위치 [0..7]
  //  - 구 ½마디(colCount 8): 코드 [0,1,2,3] → 박 [0,2,4,6] remap (무손실)
  //  - 구 1마디(colCount 4): 이미 [0,2,4,6] → 그대로 (1마디 모드 폐지)
  if (!project.slotBeatV2) {
    if (project.colCount === 8) {
      project.arrangement.forEach(row => {
        const s = row.slots || new Array(8).fill(null);
        const ns = new Array(8).fill(null);
        ns[0] = s[0] ?? null; ns[2] = s[1] ?? null; ns[4] = s[2] ?? null; ns[6] = s[3] ?? null;
        row.slots = ns;
      });
    }
    project.slotBeatV2 = true;
    migrated = true;
  }

  if (migrated) updateProject(project);

  // 뷰포트 실제 가로/세로 비율로 자동 판정 (기기 회전 시 setupOrientationListener가 재렌더)
  currentOrient = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  // 가로모드: 프레임을 812px까지 확장 (CSS .app-shell.app-land)
  document.querySelector('.app-shell')?.classList.toggle('app-land', currentOrient === 'landscape');
  // 코드슬롯 4/8개는 화면비가 아니라 뷰포트 폭 787px 기준 순수 판정(currentOrient와 무관)
  currentSlotLand = window.innerWidth >= 787;

  const viewEl = document.getElementById('view-project');
  viewEl.innerHTML = '';
  viewEl.classList.toggle('view-mode', !isEditMode);

  // #view-project 카드 자체 폭이 이제 양쪽 모드 모두 CSS로 고정됨(가로: app-land 규칙 / 세로: 기본 규칙)
  // → 자식(sticky-bar·wrapper)은 항상 100%로 부모(#view-project) 실제 폭을 그대로 따라감
  //   (예전엔 가로모드에서 600px 고정값을 따로 줘서 부모(최대 648px)와 어긋나 우측에 빈 공간 생겼음)
  const maxW = '100%';
  const fixedW = '100%';

  // ── 헤더 (<header> 로 분리) ──
  const header = document.createElement('div');
  header.className = 'project-header';

  const nameInput = document.createElement('input');
  nameInput.className = 'project-name-input';
  nameInput.type = 'text';
  nameInput.value = project.name;
  nameInput.dataset.projectId = projectId;
  nameInput.placeholder = '노트 이름';
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
  modeBtn.id = 'project-mode-btn'; // 튜토리얼이 지목할 수 있도록
  modeBtn.className = 'project-icon-btn';
  modeBtn.innerHTML = isEditMode ? '<i data-lucide="check"></i>' : '<i data-lucide="pencil"></i>';
  modeBtn.onclick = () => {
    isEditMode = !isEditMode;
    renderProjectView(projectId);
    window.Tutorial?.notify(`editmode:${isEditMode ? 'on' : 'off'}`);
  };

  // ── 1행: [좌] 1마디/½마디 | [우, 편집모드] 삭제 · 공유하기 · 완료/편집 ──
  const headerRow1 = document.createElement('div');
  headerRow1.className = 'project-header-row1';

  const shareBtn = document.createElement('button');
  shareBtn.className = 'project-icon-btn';
  shareBtn.innerHTML = '<i data-lucide="share-2"></i>';
  shareBtn.onclick = () => openShareModal(projectId);

  const row1Right = document.createElement('div');
  row1Right.className = 'project-header-row1-right';
  // 삭제(휴지통) 버튼은 항상 DOM에 두고, 보기모드에선 visibility만 숨김 → 편집/보기 전환 시 나머지 요소 위치 고정
  const deleteProjectBtn = document.createElement('button');
  deleteProjectBtn.className = 'project-icon-btn project-icon-btn--danger';
  deleteProjectBtn.innerHTML = '<i data-lucide="trash-2"></i>';
  deleteProjectBtn.onclick = () => openDeleteConfirm(projectId);
  if (!isEditMode) {
    deleteProjectBtn.style.visibility = 'hidden';
    deleteProjectBtn.style.pointerEvents = 'none';
  }
  // 되돌리기 버튼 (편집모드 전용). 클릭 시 line-text focusout → saveAllLines가
  // 먼저 동기 실행되어 미저장 타이핑이 스냅샷으로 확정된 뒤 undo 실행됨 (mousedown preventDefault 금지)
  const undoBtn = document.createElement('button');
  undoBtn.id = 'project-undo-btn';
  undoBtn.className = 'project-icon-btn';
  undoBtn.innerHTML = '<i data-lucide="undo-2"></i>';
  undoBtn.disabled = _undoProjectId !== projectId || _undoStack.length === 0;
  undoBtn.onclick = () => undoLastAction();
  // row1Right/append 위치는 방향별 분기부에서 처리(가로모드는 메트로놈·재생 그룹에 합쳐서
  // 원형버튼 간격 토큰을 셋 다 동일하게 적용하기 위함)

  // ── 2행: [코드슬롯 토글 왼쪽] ... [Capo BPM 메트로놈 재생 오른쪽] ──
  const headerRow2 = document.createElement('div');
  headerRow2.className = 'project-header-row2';

  // 코드슬롯 on/off 토글 (왼쪽 끝)
  const slotsHidden = project.slotsHidden === true;
  const slotToggleBtn = document.createElement('button');
  slotToggleBtn.className = 'btn slot-toggle-btn' + (slotsHidden ? '' : ' active');
  slotToggleBtn.title = slotsHidden ? '코드슬롯 표시' : '코드슬롯 숨기기';
  slotToggleBtn.innerHTML = slotsHidden
    ? '<i data-lucide="eye-off"></i>'
    : '<i data-lucide="eye"></i>';
  slotToggleBtn.onclick = () => {
    const p = getProject(projectId);
    if (p) { p.slotsHidden = !slotsHidden; updateProject(p); }
    renderProjectView(projectId);
    // 튜토리얼 뷰 모드 구간 — 숨김/표시 두 방향을 각각 판정한다
    window.Tutorial?.notify(`slotshidden:${!slotsHidden}`);
  };

  // row2 좌우 그룹 — 좌: BPM·카포 / 우: 메트로놈·재생
  const row2Left = document.createElement('div');
  row2Left.className = 'project-header-row2-controls project-header-row2-left';
  const row2Right = document.createElement('div');
  row2Right.className = 'project-header-row2-controls project-header-row2-right';

  // 카포 컨트롤
  const capoWrap = document.createElement('div');
  capoWrap.className = 'capo-control';
  const capoLabel = document.createElement('span');
  capoLabel.className = 'capo-label';
  capoLabel.textContent = 'Capo';
  const capoDown = document.createElement('button');
  capoDown.id = 'capo-btn-down'; // 튜토리얼이 지목할 수 있도록
  capoDown.className = 'capo-btn';
  capoDown.textContent = '−';
  const capoVal = document.createElement('span');
  capoVal.id = 'capo-value';
  capoVal.className = 'capo-value';
  capoVal.textContent = project.capo ?? 0;
  const capoUp = document.createElement('button');
  capoUp.id = 'capo-btn-up';
  capoUp.className = 'capo-btn';
  capoUp.textContent = '+';
  capoDown.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) > 0) {
      p.capo = (p.capo ?? 0) - 1; updateProject(p); capoVal.textContent = p.capo;
      analytics.track('capo_changed', { value: p.capo, direction: 'down', project_id: projectId });
      _refreshRowMetaFor(projectId);
      window.Tutorial?.notify(`capo:${p.capo}`);
    }
  };
  capoUp.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) < 12) {
      p.capo = (p.capo ?? 0) + 1; updateProject(p); capoVal.textContent = p.capo;
      analytics.track('capo_changed', { value: p.capo, direction: 'up', project_id: projectId });
      _refreshRowMetaFor(projectId);
      window.Tutorial?.notify(`capo:${p.capo}`);
    }
  };
  capoWrap.append(capoLabel, capoDown, capoVal, capoUp);

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
    if (p) {
      p.bpm = val; updateProject(p);
      analytics.track('bpm_changed', { value: val, project_id: projectId });
      _refreshRowMetaFor(projectId); // 줄의 ♩= 배지 즉시 반영
    }
  });
  bpmWrap.append(bpmLabel, bpmInput);
  row2Left.append(bpmWrap, capoWrap); // BPM → 카포 순서

  // 메트로놈 버튼
  const metronomeBtn = document.createElement('button');
  metronomeBtn.id = 'metronome-btn';
  metronomeBtn.className = 'btn metronome-btn' + (metronomeActive ? ' active' : '');
  metronomeBtn.innerHTML = '<i data-lucide="metronome"></i>';
  metronomeBtn.title = '메트로놈';
  metronomeBtn.onclick = () => toggleMetronome();
  row2Right.appendChild(metronomeBtn);

  // 전체재생 버튼
  const playAllBtn = document.createElement('button');
  playAllBtn.id = 'play-all-btn';
  playAllBtn.className = 'btn play-all-btn';
  playAllBtn.innerHTML = playbackActive ? '<i data-lucide="square"></i>' : '<i data-lucide="play"></i>';
  playAllBtn.onclick = () => {
    if (playbackActive) stopPlayAll();
    else playAll(projectId, getVisibleStartSlotIndex(projectId));
  };
  row2Right.appendChild(playAllBtn);
  headerRow2.append(row2Left, row2Right);

  // 가로모드: 2줄이 필요 없으므로 slot-toggle · row2Left · row2Right를
  // slot-toggle-btn 기준 좌→우 한 줄로 배치. 되돌리기는 row2Right(메트로놈·재생)에
  // 합쳐서 원형버튼 3개가 같은 --icon-circle-gap 간격을 쓰도록 함(별도 박스로 두면
  // landrow 자체 gap(8px, 그룹 사이용)이 끼어들어 메트로놈-재생은 6px인데
  // 재생-되돌리기만 8px로 어긋남). 세로모드는 기존 2행 구조 유지 —
  // 뷰모드(slot-toggle) 버튼은 row1로 옮겨서 [좌: 뷰모드][우: 되돌리기]로 채움
  // (row1이 되돌리기 하나뿐이라 휑했고, row2는 이미 4개라 더 못 채웠음)
  if (currentOrient === 'landscape') {
    undoBtn.style.display = isEditMode ? '' : 'none';
    row2Right.appendChild(undoBtn);
    const headerRowLand = document.createElement('div');
    headerRowLand.className = 'project-header-row1 project-header-landrow';
    headerRowLand.append(slotToggleBtn, row2Left, row2Right);
    header.appendChild(headerRowLand);
  } else {
    row1Right.appendChild(undoBtn);
    if (!isEditMode) row1Right.style.display = 'none';
    headerRow1.appendChild(slotToggleBtn);
    headerRow1.appendChild(row1Right);
    header.appendChild(headerRow1);
    header.appendChild(headerRow2);
  }

  // ── 타이틀 컨테이너 ──
  const titleBar = document.createElement('div');
  titleBar.className = 'project-title-bar';

  titleBar.appendChild(nameInput);

  // 저장 버튼 (공유 좌측) — 팔레트 코드 이미지 저장 / 텍스트 복사 선택
  const saveNoteBtn = document.createElement('button');
  saveNoteBtn.className = 'project-icon-btn';
  saveNoteBtn.innerHTML = '<i data-lucide="download"></i>';
  saveNoteBtn.onclick = () => openNoteSaveChoice(projectId);

  // 타이틀바 우측: 삭제 · 저장 · 공유 · 완료/편집 (기존 row1-right에서 이동)
  const titleBtns = document.createElement('div');
  titleBtns.className = 'project-title-btns';
  titleBtns.append(deleteProjectBtn, saveNoteBtn, shareBtn, modeBtn);
  titleBar.appendChild(titleBtns);

  // ── 고정 헤더 영역 ── (팔레트는 편집 모드에서만 필요)
  const stickyBar = document.createElement('header');
  stickyBar.className = 'project-sticky-bar';
  stickyBar.style.maxWidth = maxW;
  if (fixedW) stickyBar.style.width = fixedW;
  stickyBar.appendChild(titleBar);
  stickyBar.appendChild(header);
  if (isEditMode) stickyBar.appendChild(buildChordPalette(project, isEditMode));

  // ── 스크롤 콘텐츠 영역 ──
  const linesEl = buildLinesSection(project, isEditMode);
  const wrapper = document.createElement('div');
  wrapper.className = 'project-view-wrapper';
  wrapper.style.maxWidth = maxW;
  if (fixedW) wrapper.style.width = fixedW;
  wrapper.appendChild(linesEl);

  const inner = document.createElement('div');
  inner.className = 'project-inner';
  inner.appendChild(stickyBar);
  inner.appendChild(wrapper);
  viewEl.appendChild(inner);

  lucide.createIcons();

  // 에디터 복귀 시 스크롤 위치 복원, 그 외엔 맨 위
  if (_pendingEditRestore) {
    linesEl.scrollTop = _pendingEditRestore.scrollTop || 0;
    _pendingEditRestore = null;
  } else {
    linesEl.scrollTop = 0;
  }
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
  // 브라우저 placeholder <br> 로 인한 trailing \n 제거 + 엔터 커서 이동용 zero-width space 제거
  return text.replace(/​/g, '').replace(/\n$/, '');
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
  if (!text) return;
  const parts = text.split('\n');
  parts.forEach((part, i) => {
    if (part) lineTextEl.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) lineTextEl.appendChild(document.createElement('br'));
  });
}

function buildChordArea(line, project, editMode = true) {
  const textMode = project.slotsHidden === true;
  const land = currentSlotLand;
  const layout = computeRowLayout(getRowBars(line)) || computeRowLayout(2); // 안전망(정상 데이터라면 항상 존재)
  const slotCount = land ? layout.landscapeSlots : layout.portraitSlots;
  const step = land ? 1 : 2; // 세로는 2칸씩 건너뛰며 표시(슬롯당 2칸)
  const area = document.createElement('div');
  // 컬럼 수는 항상 CSS 고정(세로4/가로8) — 슬롯 개수와 무관하게 각 슬롯은 자신의 데이터 인덱스가
  // 속한 고정 칸(=박자 위치)의 왼쪽에 붙어야 하므로 인라인 오버라이드 안 함.
  area.className = `chord-area ${land ? 'orient-land' : 'orient-port'}` + (textMode ? ' chord-area--text' : '');
  area.contentEditable = 'false';
  const base = line.slots || [];
  const dataIndices = Array.from({ length: slotCount }, (_, i) => i * step);
  dataIndices.forEach(dataIdx => {
    const chordId = base[dataIdx] ?? null;

    // 텍스트 모드: 캔버스 슬롯 대신 코드 이름만 표기 (한 줄, 컬럼 정렬 유지)
    if (textMode) {
      const chord = (chordId && project.chords) ? project.chords.find(c => c.id === chordId) : null;
      const cell = document.createElement('div');
      cell.className = 'chord-name-cell' + (chord ? ' filled' : '');
      cell.dataset.slotIdx = dataIdx;
      cell.dataset.lineId = line.id;
      if (chord) {
        // 소괄호 부분 위첨자 처리
        const pIdx = chord.name.indexOf('(');
        if (pIdx !== -1) {
          cell.appendChild(document.createTextNode(chord.name.slice(0, pIdx)));
          const sup = document.createElement('sup');
          sup.textContent = chord.name.slice(pIdx);
          cell.appendChild(sup);
        } else {
          cell.textContent = chord.name;
        }
        cell.addEventListener('click', () => {
          if (playbackActive) {
            const p = getProject(project.id);
            if (p) playAll(project.id, getGlobalSlotIndex(p, line.id, dataIdx));
          } else {
            playChord(chord, getRowCapo(getProject(project.id) || project, line.id));
            analytics.track('project_chord_played', { chord_name: chord.name, project_id: project.id });
            window.Tutorial?.notify('slot:played');
            // 튜토리얼: 자동으로 넘기지 않는다(STEP1 소리 듣기와 동일). 1초 뒤 '다음' 버튼만 풀어준다.
            setTimeout(() => window.Tutorial?.enableNext?.(), 1000);
          }
        });
      }
      area.appendChild(cell);
      return;
    }

    const slot = document.createElement('div');
    slot.dataset.slotIdx = dataIdx;
    slot.dataset.lineId = line.id;
    slot.dataset.chordId = chordId || ''; // DOM fallback for saveAllLines

    if (chordId && project.chords) {
      const chord = project.chords.find(c => c.id === chordId);
      if (chord) {
        slot.className = 'chord-slot';
        const cv = document.createElement('canvas');
        VoicingCanvas.draw(cv, chordToVoicing(chord), {
          chordName: chord.name, fingerNumMode: chord.fingerNumMode, ratio: 1,
        });
        const img = document.createElement('img');
        img.src = cv.toDataURL('image/png');
        img.className = 'chord-slot-img';
        img.addEventListener('click', () => {
          if (playbackActive) {
            const p = getProject(project.id);
            if (p) playAll(project.id, getGlobalSlotIndex(p, line.id, dataIdx));
          } else {
            playChord(chord, getRowCapo(getProject(project.id) || project, line.id));
            analytics.track('project_chord_played', { chord_name: chord.name, project_id: project.id });
            window.Tutorial?.notify('slot:played');
            // 튜토리얼: 자동으로 넘기지 않는다(STEP1 소리 듣기와 동일). 1초 뒤 '다음' 버튼만 풀어준다.
            setTimeout(() => window.Tutorial?.enableNext?.(), 1000);
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
      // touchcancel에만 있던 복원을 여기에도 둔다 — 없으면 메뉴를 한 번 연 줄은
      // contentEditable=false 인 채 남아 그 줄만 영영 입력이 안 된다.
      // 메뉴는 이미 열렸고 포커스도 끊긴 뒤라 여기서 되돌려도 키보드가 다시 뜨지 않는다.
      if (_activeLineText) { _activeLineText.contentEditable = 'true'; _activeLineText = null; }
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

function buildProjectLine(line, project, editMode, prevLine = null, isFirstLine = false) {
  if (!line.slots) line.slots = new Array(8).fill(null);
  const div = document.createElement('div');
  div.className = 'project-line';
  div.dataset.lineId = line.id;
  // 줄 메타(BPM·박자·마디수)를 DOM에 심어둠 → saveAllLines가 어떤 경로(복제·붙여넣기 등)로
  // 만들어진 줄이든 arrangement에 아직 없어도 여기서 복원 (없으면 기본값)
  if (line.meter) { div.dataset.meterNum = line.meter.num; div.dataset.meterDen = line.meter.den; }
  if (line.bpm != null) div.dataset.rowBpm = line.bpm;
  if (line.barsPerRow != null) div.dataset.rowBars = line.barsPerRow;
  if (line.capo != null) div.dataset.rowCapo = line.capo;

  // 박자 레일: project-line-text-row(보조선) 안에서 line-text-wrap 왼쪽에 붙는 고정폭 박스.
  // 같은 폭(--row-meter-rail-w)만큼 chord-row-wrapper에도 padding-left로 줘서
  // 코드슬롯1 좌측끝과 line-text 좌측끝이 정렬되게 함(CSS 참고).
  // → 박자가 커스텀일 때만 그 안에 세로 분수(분자/분모)를 표시, 아닐 땐 빈 채로 자리만 유지
  const rowMeter  = getRowMeter(project, line);
  const prevMeter = prevLine ? getRowMeter(project, prevLine) : null;
  // 첫 줄은 항상 기본세팅값 박자를 표기. 이후 줄은 앞줄의 실효 박자와 다를 때만 표기.
  // (프로젝트 기본 박자가 생기면서 "line.meter 유무"가 아니라 실효값 비교가 기준이 됐다)
  const showMeter = isFirstLine ||
    !!(prevMeter && (prevMeter.num !== rowMeter.num || prevMeter.den !== rowMeter.den));
  const meterRail = document.createElement('div');
  meterRail.className = 'row-meter-rail';
  if (showMeter) {
    meterRail.innerHTML = `
      <span class="row-meter-rail-num">${rowMeter.num}</span>
      <span class="row-meter-rail-bar"></span>
      <span class="row-meter-rail-den">${rowMeter.den}</span>`;
  }

  const bodyContent = document.createElement('div');
  bodyContent.className = 'project-line-content';

  // 첫 줄은 항상 기본세팅값(노트 전역 BPM) 표기.
  // 이후 줄은 앞줄의 실효 BPM과 다를 때만 표기 — 박자와 같은 기준.
  // ("line.bpm 보유 여부"로 판정하면, 앞줄이 90이고 새 줄이 기본 120으로 떨어져도
  //  아무 표기가 없어 90이 이어지는 것처럼 보인다)
  const rowBpm     = getRowBpm(project, line);
  const prevBpmEff = prevLine ? getRowBpm(project, prevLine) : null;
  const showBpm    = isFirstLine || (prevBpmEff != null && prevBpmEff !== rowBpm);
  // 카포: 효력 카포가 앞줄과 달라지는 줄(첫 줄 포함)에 템포 우측 표시. 0은 생략.
  const effCapo  = getRowCapo(project, line.id);
  const prevCapo = prevLine ? getRowCapo(project, prevLine.id) : null;
  const showCapo = effCapo > 0 && (isFirstLine || !prevLine || prevCapo !== effCapo);
  if (showBpm || showCapo) {
    const badge = document.createElement('div');
    badge.className = 'row-meta-badge';
    const parts = [];
    if (showBpm) parts.push(`♩=${getRowBpm(project, line)}`);
    if (showCapo) parts.push(`${effCapo} Capo`);
    badge.textContent = parts.join('  ');
    bodyContent.appendChild(badge);
  }

  bodyContent.appendChild(buildChordArea(line, project, editMode));

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
  // 빈 줄에 placeholder <br>를 넣으면 white-space:pre-wrap에서 trailing linebreak로
  // 인식돼 2줄 높이로 렌더됨(입력 시 br 제거되며 1줄로 복귀) → 진짜 빈 상태는 그대로 둠

  // line-text 자체는 contentEditable이라 배경/가상요소가 border-box에 클립됨 →
  // 가운데 세로선(.line-mid-tick)은 실측 너비를 공유하는 래퍼에 별도 엘리먼트로 붙임
  const lineTextWrap = document.createElement('div');
  lineTextWrap.className = 'line-text-wrap';
  lineTextWrap.appendChild(lineText);
  const midTick = document.createElement('span');
  midTick.className = 'line-mid-tick';
  lineTextWrap.appendChild(midTick);

  const textRow = document.createElement('div');
  textRow.className = 'project-line-text-row';
  textRow.appendChild(meterRail);
  textRow.appendChild(lineTextWrap);
  bodyContent.appendChild(textRow);

  const bodyRow = document.createElement('div');
  bodyRow.className = 'project-line-body';
  bodyRow.appendChild(bodyContent);
  div.appendChild(bodyRow);

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

  project.arrangement.forEach((line, i) => {
    linesEl.appendChild(buildProjectLine(line, project, editMode, project.arrangement[i - 1] ?? null, i === 0));
  });

  if (editMode) {
    // 맨 아래 + 버튼 (줄 추가)
    const addLineBtn = document.createElement('button');
    addLineBtn.className = 'add-line-btn';
    addLineBtn.setAttribute('aria-label', '줄 추가');
    addLineBtn.innerHTML = '<i data-lucide="plus"></i>';
    addLineBtn.addEventListener('mousedown', e => e.preventDefault());
    addLineBtn.addEventListener('click', () => {
      // 클로저의 linesEl을 쓰지 않고 버튼이 실제 붙어있는 컨테이너를 조회.
      // (위/아래 줄 추가 시 buildLinesSection이 만든 새 버튼의 클로저 linesEl은
      //  자식을 이식당한 detached 컨테이너라 insertBefore가 throw → 줄 생성 실패)
      const host = addLineBtn.parentElement;
      if (!host) return;
      const p = getProject(project.id);
      const newId = genId();
      const newObj = { id: newId, text: '', slots: new Array(8).fill(null) };
      const newDiv = buildProjectLine(newObj, p || project, true);
      newDiv.classList.add('project-line-enter');
      newDiv.addEventListener('animationend', () => newDiv.classList.remove('project-line-enter'), { once: true });
      host.insertBefore(newDiv, addLineBtn);
      saveAllLines(project.id, host);
      lucide.createIcons();
    });
    linesEl.appendChild(addLineBtn);

    let saveDebounce = null;

    let _isComposing = false;

    // 빈 줄일 때 브라우저가 caret 앵커용으로 남기는 placeholder <br>가 2줄 높이로 보이는 문제 방지
    // → 별도 CSS 클래스 없이, line-text가 실제로 비면 그 <br>까지 통째로 제거해서 진짜 빈 엘리먼트로 유지
    new MutationObserver(muts => {
      const touched = new Set();
      for (const m of muts) {
        const node = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        const lineText = node?.closest?.('.line-text');
        if (lineText) touched.add(lineText);
      }
      touched.forEach(el => {
        if (!el.textContent && el.innerHTML) el.innerHTML = '';
      });
    }).observe(linesEl, { childList: true, subtree: true, characterData: true });

    // 줄 병합 실수 방지: 줄 맨 앞 Backspace는 2회 눌러야 이전 줄과 합쳐짐
    let _mergeArmedLine  = null;
    let _mergeArmedTimer = null;
    let _mergeIconEl     = null;
    const disarmMerge = () => {
      if (_mergeArmedLine) _mergeArmedLine.classList.remove('line-merge-armed');
      if (_mergeIconEl) { _mergeIconEl.remove(); _mergeIconEl = null; }
      _mergeArmedLine = null;
      clearTimeout(_mergeArmedTimer);
    };

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

    // IME·컨텍스트메뉴 경유 네이티브 undo/redo 차단 (커스텀 undo 스택과 이중 동작 방지)
    linesEl.addEventListener('beforeinput', e => {
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        e.preventDefault();
        if (e.inputType === 'historyUndo') undoLastAction();
      }
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

      // Backspace 외 다른 키 입력 시 병합 무장 해제
      if (e.key !== 'Backspace' && _mergeArmedLine) disarmMerge();

      // Ctrl+Z / Cmd+Z: 브라우저 네이티브 undo 차단 → 커스텀 undo 스택 실행
      // (네이티브 undo가 line-text DOM을 임의 복원하면 저장 상태와 어긋나 br/캐럿 꼬임)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!e.shiftKey) undoLastAction(); // Shift+Z(redo)는 미지원 — 차단만
        return;
      }

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
        // Range.insertNode가 텍스트노드 끝(splitText)에서 빈 텍스트노드를 br 뒤에 남기는 경우가 있어
        // "br.nextSibling 없으면 줄 끝"으로 판단하면 항상 빗나감 → 빈 텍스트노드도 같은 취급으로 감지.
        // 캐럿은 반드시 "텍스트노드 안"(offset)에 둬야 크롬이 새 줄에 확실히 그려줌(엘리먼트+child-offset 경계는 불안정).
        let after = br.nextSibling;
        if (!after || (after.nodeType === Node.TEXT_NODE && after.textContent === '')) {
          if (after) after.remove();
          after = document.createTextNode('​');
          br.after(after);
        }
        const newRange = document.createRange();
        newRange.setStart(after, after.textContent === '​' ? 1 : 0);
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

        // 소프트 줄바꿈(엔터로 만든 br) 하위줄의 "마지막 한 글자" 삭제 케이스를 직접 처리.
        // 크롬 기본 동작에 맡기면 하위줄이 빈 상태가 되는 순간 placeholder <br>를 중복 삽입해
        // 줄이 하나 늘어나고 이후 입력 불가능한 고아 줄이 남는 버그가 있음.
        {
          const range0 = sel.getRangeAt(0);
          const container = range0.startContainer;
          const startOffset = range0.startOffset;
          if (container.nodeType === Node.TEXT_NODE && startOffset === 1 &&
              container.textContent.length === 1 && container.previousSibling?.nodeName === 'BR') {
            e.preventDefault();
            const br = container.previousSibling;
            if (container.textContent === '​') {
              // 이미 빈 하위줄(placeholder) 상태에서 또 지움 → br까지 제거하고 이전 줄과 병합
              const prevText = br.previousSibling;
              container.remove();
              br.remove();
              const newRange = document.createRange();
              if (prevText?.nodeType === Node.TEXT_NODE) newRange.setStart(prevText, prevText.textContent.length);
              else newRange.setStart(e.target, 0);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            } else {
              // 하위줄의 마지막 실제 글자 삭제 → 직접 지우고 zwsp placeholder로 교체(네이티브 동작 회피)
              container.textContent = '​';
              const newRange = document.createRange();
              newRange.setStart(container, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
            clearTimeout(saveDebounce);
            saveDebounce = setTimeout(() => saveAllLines(project.id, linesEl), 300);
            return;
          }
        }

        const isAtStart = getCursorOffsetInLine(lineEl, sel.getRangeAt(0)) === 0;

        if (isAtStart) {
          e.preventDefault();
          const prevLineEl = lineEl.previousElementSibling;
          if (!prevLineEl?.classList?.contains('project-line')) { disarmMerge(); return; } // 첫 줄: 아무것도 안 함

          // 실수 방지: 첫 Backspace는 무장만, 같은 줄에서 다시 눌러야 병합
          if (_mergeArmedLine !== lineEl) {
            disarmMerge();
            _mergeArmedLine = lineEl;
            lineEl.classList.add('line-merge-armed');
            // 텍스트란 바깥(좌측)에 위로 꺾인 아이콘 표시 (이전 줄로 합쳐짐을 안내)
            // body에 fixed로 렌더 → wrapper overflow:hidden 클립 회피
            const _lt = lineEl.querySelector('.line-text');
            const _icon = document.createElement('span');
            _icon.className = 'line-merge-icon';
            _icon.innerHTML = '<i data-lucide="corner-left-up"></i>';
            document.body.appendChild(_icon);
            lucide.createIcons();
            if (_lt) {
              const _r = _lt.getBoundingClientRect();
              _icon.style.left = (_r.left - 24) + 'px';
              _icon.style.top  = (_r.top + 2) + 'px';
            }
            _mergeIconEl = _icon;
            _mergeArmedTimer = setTimeout(disarmMerge, 1500);
            return;
          }
          disarmMerge(); // 2회째 → 병합 진행

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

        // 커서가 줄 맨 앞이 아니면 병합 무장 해제
        disarmMerge();
        // 빈 줄이 아닌 경우 기본 동작 허용
        if (!getLineText(lineEl)) e.preventDefault();
      }
    });

    // 커서 재배치(탭/클릭) 시 병합 무장 해제
    linesEl.addEventListener('pointerdown', () => { if (_mergeArmedLine) disarmMerge(); }, { passive: true });

    linesEl.addEventListener('focusout', e => {
      disarmMerge();
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
        // 이미 코드슬롯이 채워진 다음 줄이 있으면 새 줄을 만들지 않고 그 줄의 가사만 채운다
        // (공유받은 코드 진행에 가사만 붙여넣을 때 줄 구조가 깨지지 않도록)
        const existingNext = lastLine.nextElementSibling;
        if (existingNext && existingNext.classList?.contains('project-line')) {
          setLineText(existingNext, text);
          lastLine = existingNext;
        } else {
          const newLineId = genId();
          const newLine = { id: newLineId, text, slots: new Array(8).fill(null) };
          const newDiv = buildProjectLine(newLine, p || project, true);
          lastLine.insertAdjacentElement('afterend', newDiv);
          lastLine = newDiv;
        }
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

  // 복사/잘라내기: 선택 영역을 순수 텍스트(text/plain)로만 클립보드에 기록.
  // contenteditable 기본 복사는 text/html(<br>·태그 포함)도 함께 실리는데,
  // 그대로 붙여넣으면 html 경로로 원치 않은 줄바꿈·빈 줄이 생김.
  // 끝에 딸려오는 줄바꿈(선택이 줄 경계를 스친 경우)도 잘라냄.
  const _copySelectionAsPlainText = e => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    if (!linesEl.contains(sel.anchorNode)) return false;
    const text = sel.toString().replace(/[\n\r]+$/, '');
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    return true;
  };
  linesEl.addEventListener('copy', _copySelectionAsPlainText);
  linesEl.addEventListener('cut', e => {
    if (_copySelectionAsPlainText(e)) document.execCommand('delete'); // 기본동작 차단했으니 선택 삭제는 직접
  });

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
      const existingNext = lastInsertedLine.nextElementSibling;
      if (existingNext && existingNext.classList?.contains('project-line')) {
        setLineText(existingNext, segments[i]);
        lastInsertedLine = existingNext;
        continue;
      }
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
  // undo 재렌더 등으로 linesEl이 DOM에서 떨어진 뒤 지연 저장이 발동하면 옛 내용으로 덮어씀 → 차단
  if (!linesEl.isConnected) return;
  pushUndoSnapshot(projectId); // 변이 전 상태 스냅샷 (텍스트·줄 생성/삭제/병합·붙여넣기 공통 경로)
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
    // 줄 메타: arrangement에 있으면 그걸, 없으면(복제·붙여넣기 등 새 div) DOM data 속성에서 복원
    let meter = existing?.meter;
    if (!meter && div.dataset.meterNum != null) {
      meter = { num: parseInt(div.dataset.meterNum, 10), den: parseInt(div.dataset.meterDen, 10) };
    }
    let bpm = existing?.bpm;
    if (bpm == null && div.dataset.rowBpm != null) bpm = parseInt(div.dataset.rowBpm, 10);
    let barsPerRow = existing?.barsPerRow;
    if (barsPerRow == null && div.dataset.rowBars != null) barsPerRow = parseFloat(div.dataset.rowBars);
    let capo = existing?.capo;
    if (capo == null && div.dataset.rowCapo != null) capo = parseInt(div.dataset.rowCapo, 10);

    return {
      id: div.dataset.lineId,
      text: getLineText(div),
      slots,
      meter,
      bpm,
      barsPerRow,
      capo,
    };
  });
  p.updatedAt = Date.now();
  updateProject(p);
  _refreshRowMeta(linesEl, p);
  window.Tutorial?.notify('lines:saved'); // 가사·줄 구성 변화 알림 (튜토리얼 조건 판정용)
}

// 줄이 추가·삭제·이동되면 "앞줄과 값이 다른가" 판정이 전부 달라진다.
// buildProjectLine은 만들어질 당시의 앞줄만 알기 때문에, 새 줄이 기본값(4/4·전역 BPM)으로
// 생겨도 표기가 없어서 앞줄 값이 이어지는 것처럼 오해하게 된다.
// arrangement가 DOM과 동기화된 저장 직후에 박자 레일·BPM/카포 배지를 전부 다시 계산한다.
// 헤더에서 노트 전역 BPM·카포를 바꿨을 때 줄 배지를 즉시 갱신 (재렌더 없이)
function _refreshRowMetaFor(projectId) {
  const linesEl = document.getElementById('project-lines-' + projectId);
  const p = getProject(projectId);
  if (linesEl && p) _refreshRowMeta(linesEl, p);
}

function _refreshRowMeta(linesEl, project) {
  let prevMeter = null, prevBpm = null, prevCapo = null;

  linesEl.querySelectorAll('.project-line').forEach((div, i) => {
    const line    = project.arrangement.find(l => l.id === div.dataset.lineId);
    // arrangement에 아직 없는 div(막 삽입된 줄 등)는 건드리지 않는다.
    // 여기서 기본값으로 다시 그리면 방금 지정한 박자 표기가 지워진다.
    if (!line) return;
    const isFirst = i === 0;

    // 박자 레일
    const m = getRowMeter(project, line);
    const showMeter = isFirst || !prevMeter || prevMeter.num !== m.num || prevMeter.den !== m.den;
    const rail = div.querySelector('.row-meter-rail');
    if (rail) {
      rail.innerHTML = showMeter
        ? `<span class="row-meter-rail-num">${m.num}</span>` +
          `<span class="row-meter-rail-bar"></span>` +
          `<span class="row-meter-rail-den">${m.den}</span>`
        : '';
    }

    // BPM·카포 배지 — 표시될 때만 존재하므로 생성·제거까지 여기서 처리
    const bpm  = getRowBpm(project, line);
    const capo = getRowCapo(project, line?.id);
    const showBpm  = isFirst || (prevBpm != null && prevBpm !== bpm);
    const showCapo = capo > 0 && (isFirst || prevCapo == null || prevCapo !== capo);

    const content = div.querySelector('.project-line-content');
    let badge = content?.querySelector('.row-meta-badge');
    if (showBpm || showCapo) {
      if (!badge && content) {
        badge = document.createElement('div');
        badge.className = 'row-meta-badge';
        content.insertBefore(badge, content.firstChild);
      }
      if (badge) {
        const parts = [];
        if (showBpm)  parts.push(`♩=${bpm}`);
        if (showCapo) parts.push(`${capo} Capo`);
        badge.textContent = parts.join('  ');
      }
    } else if (badge) {
      badge.remove();
    }

    prevMeter = m; prevBpm = bpm; prevCapo = capo;
  });
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

// 포커스가 남은 입력 요소를 끊어 키보드를 내린다.
// 안드로이드는 편집 가능한 요소가 포커스를 쥐고 있으면, 화면 어디를 눌러도 키보드를 다시 올린다.
// (커서만 깜빡이고 키보드는 내려간 상태에서 다른 걸 누를 때 특히 티가 난다)
function _blurActiveEditable() {
  const el = document.activeElement;
  if (!el) return;
  const editable = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  if (editable && typeof el.blur === 'function') el.blur();
}

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
    <button data-action="duplicate">현재 줄 복사</button>
    <button data-action="clear">코드 슬롯 초기화</button>
    <button data-action="meter">마디 정보 수정</button>
    <hr />
    <button data-action="delete" class="danger">이 줄 삭제</button>`;
  d.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    _rowMenuAction(btn.dataset.action);
    // 동작이 끝난 뒤(DOM 반영 후) 알려야 튜토리얼 조건 판정이 맞는다
    window.Tutorial?.notify(`rowmenu:${btn.dataset.action}`);
  });
  document.body.appendChild(d);
  _rowMenuEl = d;
}

// 메뉴를 띄운 케밥 버튼. 리사이즈 때 다시 재기 위해 들고 있는다.
let _rowMenuAnchor = null;

// 드롭다운 위치 계산. position:fixed라 좌표는 뷰포트 기준이지만, 가둬야 하는 경계는
// 뷰포트가 아니라 "앱 프레임"과 "튜토리얼 설명창이 비켜준 영역"이다.
function _positionRowMenu() {
  if (!_rowMenuEl || !_rowMenuAnchor?.isConnected) return;
  const rect = _rowMenuAnchor.getBoundingClientRect();

  // ── 세로 ──────────────────────────────────────────────────
  // 튜토리얼 설명창이 떠 있으면 그만큼 쓸 수 있는 세로 폭이 줄어든다.
  // 이걸 빼지 않으면 "화면 기준으론 들어가니까" 아래로 펼쳐 놓고 마지막 항목
  // ('이 줄 삭제')이 하단 설명창에 덮여 튜토리얼 진행이 막힌다(리뷰 제보).
  // 브라우저는 주소창·하단탭까지 있어 여백이 더 빠듯하다.
  // 튜토리얼이 아닐 땐 두 값 모두 0이라 기존 동작 그대로다.
  const inset = n =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;

  // 높이도 상수로 어림하지 않고 실제로 잰다 — 항목 수·글자 크기에 따라 달라지는데
  // 어림값이 모자라면 마지막 항목만 화면 밖으로 나간다.
  const menuH  = _rowMenuEl.offsetHeight || 256;
  const topLim = inset('--tut-top-inset') + 4;              // 이 아래로만 그릴 수 있다
  const botLim = window.innerHeight - inset('--tut-bottom-inset') - 4; // 이 위로만

  const below = rect.bottom + 4;      // 버튼 아래에 펼칠 때의 상단 y
  const above = rect.top - 4 - menuH; // 버튼 위로 뒤집을 때의 상단 y

  if (below + menuH <= botLim) {
    _rowMenuEl.style.top = below + 'px';           // 아래에 그대로 들어감
  } else if (above >= topLim) {
    _rowMenuEl.style.top = above + 'px';           // 아래가 부족 → 위로 뒤집기
  } else {
    // 양쪽 다 빠듯 → 가능한 범위 안으로 밀어 넣는다. 위 경계를 우선해 첫 항목부터 보이게 한다.
    _rowMenuEl.style.top = Math.max(topLim, botLim - menuH) + 'px';
  }
  _rowMenuEl.style.bottom = 'auto';

  // ── 가로 ──────────────────────────────────────────────────
  // 뷰포트가 아니라 .app-shell(태블릿·데스크톱에서 400px로 캡되고 가운데 정렬)을 기준으로
  // 가둔다. 뷰포트 기준으로 잡으면 넓은 화면에서 메뉴만 프레임 바깥 빈 공간에 떠버린다.
  const shell  = document.querySelector('.app-shell')?.getBoundingClientRect();
  const frameL = shell ? shell.left  : 0;
  const frameR = shell ? shell.right : window.innerWidth;
  const menuW  = _rowMenuEl.offsetWidth;

  // 기본은 버튼 오른쪽 끝에 맞추고, 프레임을 벗어나면 안쪽으로 당긴다.
  let left = rect.right - menuW;
  left = Math.min(left, frameR - 4 - menuW);
  left = Math.max(left, frameL + 4);
  _rowMenuEl.style.left  = left + 'px';
  _rowMenuEl.style.right = 'auto';
}

function openRowMenu(e, lineId, projectId) {
  // 가사 입력 중(커서가 살아 있는 상태)에 메뉴를 열면 안드로이드가 포커스를 이유로
  // 키보드를 다시 올려버린다 — 메뉴가 가려지고, 튜토리얼 중에는 진행이 막힌다.
  // 케밥 버튼의 touchstart 처리는 "같은 줄"만 막으므로, 다른 줄·제목에서 온 포커스는 여기서 끊는다.
  _blurActiveEditable();

  _ensureRowMenuEl();
  _rowMenuLineId  = lineId;
  _rowMenuProjId  = projectId;
  const lineDiv   = e.currentTarget.closest('.project-line');
  _rowMenuLinesEl = lineDiv?.parentElement ?? null;

  _rowMenuAnchor = e.currentTarget;

  // display:none이면 크기를 못 재므로 먼저 펼치되, 그리기 전에 재고 위치를 잡는다
  // (같은 프레임 안이라 깜빡임 없음).
  _rowMenuEl.style.visibility = 'hidden';
  _rowMenuEl.classList.remove('hidden');
  _positionRowMenu();

  _backdropEl.classList.remove('hidden');
  _rowMenuEl.style.visibility = '';

  // 내부 스크롤 발생 시 자동 닫기
  _rowMenuLinesEl?.addEventListener('scroll', _closeRowMenu, { once: true });
  // 창 크기·회전이 바뀌면 열어둔 좌표가 그대로 남아 프레임 밖으로 튄다 → 다시 계산.
  window.addEventListener('resize', _positionRowMenu);

  // 마지막 줄이면 "이 줄 삭제" 비활성화
  const lines = _rowMenuLinesEl?.querySelectorAll('.project-line');
  _rowMenuEl.querySelector('[data-action="delete"]').disabled = (lines?.length ?? 0) <= 1;

  // 몇 번째 줄의 메뉴가 열렸는지까지 알려야 튜토리얼이 "첫 줄"을 지정할 수 있다
  const rowIdx = Array.prototype.indexOf.call(lines || [], lineDiv);
  window.Tutorial?.notify(`rowmenu:open:${rowIdx}`);
}

function _closeRowMenu() {
  _rowMenuEl?.classList.add('hidden');
  _backdropEl?.classList.add('hidden');
  window.removeEventListener('resize', _positionRowMenu);
  _rowMenuAnchor = null;
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
    lineDiv.insertAdjacentElement(action === 'above' ? 'beforebegin' : 'afterend', newDiv);
    saveAllLines(projectId, linesEl);
    // 줄 삽입으로 앞뒤 줄의 실효 BPM·박자 비교 기준이 바뀌므로 전체 재빌드해서 뱃지 재계산
    // linesEl 자체(이벤트 리스너 부착 대상)는 유지하고 내부 컨텐츠만 교체
    const fresh = getProject(projectId);
    const newLinesEl = buildLinesSection(fresh, true);
    while (linesEl.firstChild) linesEl.removeChild(linesEl.firstChild);
    while (newLinesEl.firstChild) linesEl.appendChild(newLinesEl.firstChild);
    const insertedDiv = linesEl.querySelector(`.project-line[data-line-id="${newId}"]`);
    insertedDiv?.classList.add('project-line-enter');
    insertedDiv?.addEventListener('animationend', () => insertedDiv.classList.remove('project-line-enter'), { once: true });
    lucide.createIcons();

  } else if (action === 'duplicate') {
    // 현재 줄(텍스트+슬롯)을 맨 아래에 복제
    saveAllLines(projectId, linesEl); // DOM의 미저장 편집 먼저 반영
    const fresh = getProject(projectId);
    const src   = fresh?.arrangement.find(l => l.id === lineId);
    if (!src) return;
    const newObj = {
      id: genId(), text: src.text ?? '', slots: (src.slots || new Array(8).fill(null)).slice(),
      meter: src.meter, bpm: src.bpm, barsPerRow: src.barsPerRow,
    };
    const newDiv = buildProjectLine(newObj, fresh, true);
    newDiv.classList.add('project-line-enter');
    newDiv.addEventListener('animationend', () => newDiv.classList.remove('project-line-enter'), { once: true });
    const addBtn = linesEl.querySelector('.add-line-btn');
    if (addBtn) linesEl.insertBefore(newDiv, addBtn);
    else        linesEl.appendChild(newDiv);
    saveAllLines(projectId, linesEl);
    lucide.createIcons();
    // 복제된 줄은 맨 아래 추가되지만 편집 중이던 자리 유지 위해 자동 스크롤 안 함

  } else if (action === 'clear') {
    const line = p.arrangement.find(l => l.id === lineId);
    if (!line) return;
    pushUndoSnapshot(projectId);
    const layout = computeRowLayout(getRowBars(line)) || computeRowLayout(2);
    line.slots    = new Array(layout.landscapeSlots).fill(null); // 저장 길이 = 이 줄 마디 수 기준 canonical 길이
    p.updatedAt   = Date.now();
    updateProject(p);
    // 코드 영역(wrapper) 재빌드
    const oldWrapper = lineDiv.querySelector('.chord-row-wrapper') ?? lineDiv.querySelector('.chord-area');
    if (oldWrapper) {
      const newWrapper = buildChordArea({ id: lineId, text: line.text, slots: line.slots, meter: line.meter, bpm: line.bpm, barsPerRow: line.barsPerRow }, p, true);
      oldWrapper.replaceWith(newWrapper);
      lucide.createIcons();
    }

  } else if (action === 'meter') {
    openRowMeterModal(projectId, lineId);

  } else if (action === 'delete') {
    if (linesEl.querySelectorAll('.project-line').length <= 1) return;
    lineDiv.remove();
    saveAllLines(projectId, linesEl);
  }
}

// ── 줄 BPM·박자 설정 모달 ────────────────────────────────────
let _rowMeterProjId = null;
let _rowMeterLineId = null;
let _rowMeterNum = 4;
let _rowMeterDen = 4;
let _rowMeterBars = 2;
let _rowMeterCapo = 0;
let _rowMeterLast = null; // 마지막 저장값 { meter:{num,den}, bpm, bars } — 미설정 줄 열 때 프리필

const ROW_METER_DEN_VALS = [2, 4, 8];

function setRowMeterBars(bars) {
  _rowMeterBars = bars;
  document.querySelectorAll('#row-meter-bars-toggle input[type="checkbox"]').forEach(cb => {
    cb.checked = Number(cb.dataset.bars) === bars;
  });
  window.Tutorial?.notify('rowmeter:change');
}

function _rowMeterRenderSig() {
  document.getElementById('row-meter-num-val').value = String(_rowMeterNum);
  document.getElementById('row-meter-den-val').textContent = String(_rowMeterDen);
  window.Tutorial?.notify('rowmeter:change');
}

// 카포 스테퍼 (스티키 바 capo-control과 동일 규칙: 0~12)
function rowMeterCapoStep(dir) {
  _rowMeterCapo = Math.max(0, Math.min(12, _rowMeterCapo + dir));
  document.getElementById('row-meter-capo-val').textContent = String(_rowMeterCapo);
}

// 박자 스테퍼: 분모는 [2,4,8] 사이클 (분자는 직접 입력)
function rowMeterStep(which, dir) {
  const i = ROW_METER_DEN_VALS.indexOf(_rowMeterDen);
  const n = (i + dir + ROW_METER_DEN_VALS.length) % ROW_METER_DEN_VALS.length;
  _rowMeterDen = ROW_METER_DEN_VALS[n];
  _rowMeterRenderSig();
}

function openRowMeterModal(projectId, lineId) {
  const p = getProject(projectId);
  const line = p?.arrangement.find(l => l.id === lineId);
  if (!p || !line) return;
  _rowMeterProjId = projectId;
  _rowMeterLineId = lineId;
  // 줄에 직접 설정한 값이 있으면 그 값, 없으면 마지막 저장값 프리필 (매번 기본값으로 초기화하지 않음)
  const hasOwn = !!(line.meter || line.barsPerRow || line.bpm != null);
  const src = hasOwn
    ? { meter: getRowMeter(p, line), bpm: line.bpm ?? '', bars: getRowBars(line) }
    : (_rowMeterLast || { meter: getRowMeter(p, line), bpm: '', bars: getRowBars(line) });
  _rowMeterNum = src.meter.num;
  _rowMeterDen = src.meter.den;

  const applyAllEl = document.getElementById('row-meter-applyall');
  if (applyAllEl) applyAllEl.checked = false; // 매번 꺼진 상태로 시작 — 실수로 전체가 바뀌지 않게

  _rowMeterCapo = getRowCapo(p, lineId); // 이 줄의 효력 카포 (이전 변경점 상속 포함)
  document.getElementById('row-meter-capo-val').textContent = String(_rowMeterCapo);

  const bpmInputEl = document.getElementById('row-meter-bpm-input');
  bpmInputEl.value = src.bpm;
  const bpmDefaultLabel = String(getRowBpm(p, line));
  bpmInputEl.placeholder = bpmDefaultLabel;
  bpmInputEl.onfocus = () => { bpmInputEl.placeholder = ''; };
  bpmInputEl.onblur = () => { bpmInputEl.placeholder = bpmDefaultLabel; };
  _rowMeterRenderSig();

  // addEventListener면 모달을 열 때마다 쌓이므로 프로퍼티 할당으로 덮어쓴다
  bpmInputEl.oninput = () => window.Tutorial?.notify('rowmeter:change');

  const numInputEl = document.getElementById('row-meter-num-val');
  numInputEl.oninput = () => {
    _rowMeterNum = parseInt(numInputEl.value, 10) || 1;
    window.Tutorial?.notify('rowmeter:change');
  };
  numInputEl.onblur = () => {
    _rowMeterNum = Math.max(1, Math.min(16, _rowMeterNum));
    numInputEl.value = String(_rowMeterNum);
  };

  setRowMeterBars(src.bars >= 1.5 ? 2 : 1);
  const errEl = document.getElementById('row-meter-error');
  errEl.style.display = 'none';
  errEl.textContent = '';
  document.getElementById('row-meter-overlay').classList.remove('hidden');
  document.getElementById('row-meter-save-btn').onclick = confirmRowMeterSave;
}

function closeRowMeterModal() {
  document.getElementById('row-meter-overlay').classList.add('hidden');
  _rowMeterProjId = null;
  _rowMeterLineId = null;
}

function confirmRowMeterSave() {
  const projectId = _rowMeterProjId;
  const lineId    = _rowMeterLineId;
  if (!projectId || !lineId) return;
  const p = getProject(projectId);
  const line = p?.arrangement.find(l => l.id === lineId);
  if (!p || !line) return;

  const errEl = document.getElementById('row-meter-error');
  const num = Math.max(1, Math.min(16, parseInt(document.getElementById('row-meter-num-val').value, 10) || 1));
  const den = _rowMeterDen;
  const bars = _rowMeterBars;

  const layout = computeRowLayout(bars);
  if (!layout || !Number.isInteger(num) || num < 1) {
    errEl.textContent = '지원하지 않는 마디 수입니다.';
    errEl.style.display = 'block';
    return;
  }

  const bpmRaw = document.getElementById('row-meter-bpm-input').value.trim();
  const bpm = bpmRaw === '' ? undefined : Math.min(240, Math.max(40, parseInt(bpmRaw, 10) || 120));
  pushUndoSnapshot(projectId); // 마디/BPM/박자 변경도 undo 대상 (슬롯 잘림 복구 포함)

  const applyAll = document.getElementById('row-meter-applyall')?.checked;
  if (applyAll) {
    // 프로젝트 기본값으로 올리고 줄별 값은 지운다 → 모든 줄이 기본값을 따라감.
    // (BPM은 헤더 bpm-control과 같은 필드라 여기서 바꾸면 그쪽 표시도 함께 맞춰짐)
    p.meter = { num, den };
    if (bpm !== undefined) p.bpm = bpm;
    p.arrangement.forEach(l => {
      delete l.meter;
      delete l.bpm;
      l.barsPerRow = bars;
      l.slots = _resizeRowSlots(l.slots, layout.landscapeSlots);
    });
  } else {
    line.meter = { num, den };
    line.bpm = bpm;
    line.barsPerRow = bars;
    line.slots = _resizeRowSlots(line.slots, layout.landscapeSlots); // 같은 박 순번은 보존, 넘치는 자리만 잘림
  }
  // 카포: 효력 카포와 다르게 바꿨을 때만 이 줄에 변경점 기록 — 이 줄부터 이후 줄에 계속 적용
  if (getRowCapo(p, lineId) !== _rowMeterCapo) {
    line.capo = _rowMeterCapo;
    analytics.track('capo_changed', { value: _rowMeterCapo, direction: 'modal', project_id: projectId });
  }
  _rowMeterLast = { meter: { num, den }, bpm: bpmRaw === '' ? '' : bpm, bars }; // 다음 열 때 프리필용
  p.updatedAt = Date.now();
  updateProject(p);

  closeRowMeterModal();
  // 재렌더 후에도 현재 스크롤 위치 유지 (기본은 맨 위로 리셋됨)
  const linesEl = document.getElementById('project-lines-' + projectId);
  if (linesEl) _pendingEditRestore = { scrollTop: linesEl.scrollTop };
  renderProjectView(projectId); // 슬롯 수·그리드·재생 타이밍이 전부 바뀌므로 전체 재렌더
  window.Tutorial?.notify('rowmeter:saved'); // 재렌더 뒤에 알림
}

// 아코디언 접기/펼치기 — 전체 리렌더 없이 body만 접어서 부드럽게 처리
function togglePaletteCollapse(projectId) {
  const p = getProject(projectId);
  const nowHidden = !(p?.paletteHidden === true);
  if (p) { p.paletteHidden = nowHidden; updateProject(p); }
  const wrap = document.getElementById('palette-section-' + projectId);
  if (wrap) wrap.classList.toggle('collapsed', nowHidden);
}

function buildChordPalette(project, editMode = true) {
  // ── 섹션 래퍼: 항상 보이는 바깥 wrap(핸들 포함) + 접히는 안쪽 body(팔레트+스크롤바) ──
  const wrap = document.createElement('div');
  wrap.className = 'palette-section' + (project.paletteHidden === true ? ' collapsed' : '');
  wrap.id = 'palette-section-' + project.id;

  const body = document.createElement('div');
  body.className = 'palette-collapse-body';

  // ── 팔레트 ──
  const chordPalette = document.createElement('div');
  chordPalette.className = 'chord-palette' + (editMode ? ' edit-mode' : '') + (currentOrient === 'landscape' ? ' pal-land' : '');
  chordPalette.id = 'chord-palette-' + project.id;

  project.chords.forEach((chord, idx) => {
    const thumb = createPaletteItem(chord, idx, project.id, editMode);
    chordPalette.appendChild(thumb);
  });

  if (editMode) {
    const addBtn = document.createElement('div');
    addBtn.id = 'palette-add-btn'; // 튜토리얼이 지목할 수 있도록
    addBtn.className = 'chord-palette-add';
    addBtn.title = '코드 추가';
    addBtn.innerHTML = '+';
    addBtn.onclick = () => openPaletteDictionary(project.id);
    chordPalette.appendChild(addBtn);
  }

  // 데스크톱: 마우스 휠로 좌우 스크롤
  chordPalette.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      chordPalette.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  body.appendChild(chordPalette);

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
    body.appendChild(scrollbar);
    requestAnimationFrame(() => initPaletteScrollbar(chordPalette, track, dot));
  }

  // ── 아코디언 화살표 핸들 (편집 모드에서만) — body보다 먼저 붙여서 항상 팔레트 위쪽에 고정 ──
  if (editMode) {
    const handle = document.createElement('button');
    handle.className = 'palette-collapse-handle';
    handle.title = '코드 팔레트 접기/펼치기';
    handle.innerHTML = '<i data-lucide="chevron-up"></i>';
    handle.onclick = () => togglePaletteCollapse(project.id);
    wrap.appendChild(handle);
  }

  wrap.appendChild(body);

  return wrap;
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

// 에디터로 이동하기 직전 복귀 상태 저장 (편집 모드 + 현재 스크롤 위치)
function _saveEditReturnState(projectId) {
  const linesEl = document.getElementById('project-lines-' + projectId);
  const scrollTop = linesEl ? linesEl.scrollTop : 0;
  try {
    sessionStorage.setItem('np_edit_return', JSON.stringify({ id: projectId, scrollTop }));
  } catch (_) {}
}

function createPaletteItem(chord, idx, projectId, editMode = true) {
  const thumb = document.createElement('div');
  thumb.className = 'chord-palette-item';
  thumb.dataset.chordId = chord.id;
  thumb.dataset.chordName = chord.name; // 튜토리얼이 특정 코드를 지목할 때 사용(id는 매번 달라짐)
  thumb.dataset.idx = idx;

  const cv = document.createElement('canvas');
  const _thumbW = 160;
  VoicingCanvas.draw(cv, chordToVoicing(chord), {
    chordName: chord.name, fingerNumMode: chord.fingerNumMode,
    ratio: _thumbW / VoicingCanvas.BASE_W,
  });
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
    if (window.Tutorial?.blocksNav?.()) return; // 드래그 유도 구간 — 실수 탭으로 에디터로 나가지 않게
    if (editMode) {
      _saveEditReturnState(projectId);
      await stopPlayAll({ wait: true });
      const _shell = document.querySelector('.app-shell');
      if (_shell) {
        _shell.classList.add('project-exit');
        setTimeout(() => { location.href = 'home.html?view=editor&from_project=' + projectId + '&chord_id=' + chord.id; }, 260);
      } else {
        location.href = 'home.html?view=editor&from_project=' + projectId + '&chord_id=' + chord.id;
      }
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
    VoicingCanvas.draw(ghostCv, chordToVoicing(chord), {
      chordName: chord.name, fingerNumMode: chord.fingerNumMode,
      ratio: 160 / VoicingCanvas.BASE_W,
    });
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

  // 튜토리얼이 특정 칸만 지정했으면 그 칸 외 드롭은 무시.
  // (HTML5 드래그 이벤트는 터치 가드를 안 타므로 여기서 막아야 한다)
  const _tutSlot = window.Tutorial?.slotCell?.();
  if (_tutSlot) {
    const rowIdx = p.arrangement.findIndex(r => r.id === rowId);
    if (rowIdx !== _tutSlot.line || slotIdx !== _tutSlot.slot) return;
  }
  pushUndoSnapshot(projectId);
  if (!row.slots) row.slots = new Array(8).fill(null);
  row.slots[slotIdx] = chordId;
  p.updatedAt = Date.now();
  updateProject(p);
  const chord = p.chords.find(c => c.id === chordId);
  analytics.track('chord_slot_placed', { project_id: projectId, chord_name: chord?.name ?? '' });
  reRenderChordArea(rowId, row, p);
  // 재렌더 뒤에 알려야 한다 — 튜토리얼이 DOM(슬롯의 data-chord-id)을 보고 판정하므로
  window.Tutorial?.notify('slot:placed');
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
  pushUndoSnapshot(projectId);
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

// ═══════════════════════════════════════════════════════════════
// 코드사전 추가 모달 (코드 팔레트 + 버튼)
//   코드사전(home.html lib-bottom-area)의 root탭·카드그리드·보이싱모달을
//   user_project로 이식. 카드/보이싱 탭 시 현재 프로젝트 팔레트에 즉시 추가.
//   캔버스 드로잉·코드데이터는 home.js / chords-library.js 와 동일 로직.
// ═══════════════════════════════════════════════════════════════
let _pdProjectId     = null;
let _libRoot         = 'C';
let _libFingerMode   = false;
let _voicingModalChord = null;

const _LIB_DPR       = Math.min(window.devicePixelRatio || 1, 3);
// 카드 다이어그램 비트맵 크기 = CSS 표시폭(활성 모달의 --pd-canvas-w, sm 56px/lg 72px) × DPR.
// 고정값으로 두면 lg 모달에서 CSS가 확대할 때 흐려진다 — 그릴 때마다 활성 모달에서 읽어 맞춘다.
function _libMiniW() {
  const card = _pdEl('palette-dict-modal')?.querySelector('.palette-dict-card');
  const css = card ? parseFloat(getComputedStyle(card).getPropertyValue('--pd-canvas-w')) : 56;
  return Math.ceil((css || 56) * _LIB_DPR);
}

// 코드사전 추가 모달은 560px 기준으로 완전히 분리된 두 벌(-sm 3x3 / -lg 4x4)로 존재한다.
// 여는 시점에 한 번만 어느 쪽인지 정하고(_pdActiveModal), 이후 모든 렌더/토글 함수는
// 이 헬퍼로 "지금 활성 모달"의 요소를 찾는다 — 함수 본문에 -sm/-lg 분기가 안 생기게.
let _pdActiveModal = 'sm'; // 'sm' | 'lg'
const _pdModalMq = window.matchMedia('(min-width: 560px)');
function _pdEl(baseId) {
  return document.getElementById(`${baseId}-${_pdActiveModal}`);
}

function openPaletteDictionary(projectId) {
  _pdProjectId = projectId;
  _voicingModalChord = null;
  _pdActiveModal = _pdModalMq.matches ? 'lg' : 'sm';
  // 샵/플랫 버튼을 전역 accidental 상태에 동기화
  _pdEl('lib-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  _pdEl('lib-acc-flat')?.classList.toggle('active', accidental === 'flat');
  renderLibRootTabs();
  renderLibCards(_libRoot);
  closeVoicingModal();
  _pdEl('palette-dict-modal').classList.remove('hidden');
  lucide.createIcons();
  analytics.track('palette_dict_opened', { project_id: projectId });
  window.Tutorial?.notify('palettedict:open');
}

function closePaletteDictionary() {
  closeVoicingModal();
  // 열려있던 쪽이 어느 쪽인지 모를 수 있어(리사이즈로 전환 가능성) 둘 다 닫는다
  document.getElementById('palette-dict-modal-sm')?.classList.add('hidden');
  document.getElementById('palette-dict-modal-lg')?.classList.add('hidden');
  window.Tutorial?.notify('palettedict:close');
}

// 모달을 열어둔 채로 560px 경계를 넘나들면 sm/lg를 실시간으로 전환한다
_pdModalMq.addEventListener('change', (e) => {
  const smOpen = document.getElementById('palette-dict-modal-sm')?.classList.contains('hidden') === false;
  const lgOpen = document.getElementById('palette-dict-modal-lg')?.classList.contains('hidden') === false;
  if (!smOpen && !lgOpen) return;
  const next = e.matches ? 'lg' : 'sm';
  if (next === _pdActiveModal) return;
  document.getElementById(`palette-dict-modal-${_pdActiveModal}`)?.classList.add('hidden');
  _pdActiveModal = next;
  _pdEl('lib-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  _pdEl('lib-acc-flat')?.classList.toggle('active', accidental === 'flat');
  renderLibRootTabs();
  renderLibCards(_libRoot);
  closeVoicingModal();
  _pdEl('palette-dict-modal').classList.remove('hidden');
  lucide.createIcons();
});

// "에디터로" — 기존 + 버튼의 에디터 이동 로직 이식
async function paletteDictToEditor() {
  const projectId = _pdProjectId;
  _saveEditReturnState(projectId);
  closePaletteDictionary();
  await stopPlayAll({ wait: true });
  const _shell = document.querySelector('.app-shell');
  if (_shell) {
    _shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html?view=editor&from_project=' + projectId; }, 260);
  } else {
    location.href = 'home.html?view=editor&from_project=' + projectId;
  }
}

// ── root 세로 탭 ──
function renderLibRootTabs() {
  const roots    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const flatMap  = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
  const useFlat  = accidental === 'flat';
  const container = _pdEl('lib-root-tabs');
  if (!container) return;
  container.innerHTML = roots.map(r => {
    const label = useFlat ? (flatMap[r] || r) : r;
    return `<button class="lib-root-item${r === _libRoot ? ' active' : ''}"
                    onclick="selectLibRoot('${r}')">${label}</button>`;
  }).join('');
}

function selectLibRoot(root) {
  closeVoicingModal();
  _libRoot = root;
  analytics.track('lib_tab_changed', { root_tab: root });
  renderLibRootTabs();
  renderLibCards(root);
}

// ── 코드 카드 그리드 (코드명 기준 그룹화) ──
function renderLibCards(root) {
  const entries   = (window.chordsLibrary || {})[root] || [];
  const container = _pdEl('lib-cards');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="lib-empty">등록된 코드 없음</div>';
    return;
  }

  const miniW     = _libMiniW();
  const miniRatio = miniW / VoicingCanvas.BASE_W;
  const useFlat = accidental === 'flat';
  const groups  = new Map(); // sharpName → [idx, ...]
  entries.forEach((e, i) => {
    if (!groups.has(e.name)) groups.set(e.name, []);
    groups.get(e.name).push(i);
  });

  const reps = [];
  let html   = '';
  let gi     = 0;
  for (const [sharpName, idxList] of groups) {
    const rep      = entries[idxList[0]];
    const dispName = useFlat ? rep.flatName : rep.name;
    const multi    = idxList.length > 1;
    html += `<div class="lib-card${multi ? ' lib-card-multi' : ''}"
                  data-chord="${sharpName}"
                  onclick="onLibCardClick(event,'${sharpName.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
               <canvas class="lib-card-canvas" data-gidx="${gi}"
                       width="${miniW}"
                       height="${Math.round(VoicingCanvas.BASE_H * miniRatio)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
               ${multi ? `<div class="lib-card-badge">${idxList.length}</div>` : ''}
             </div>`;
    reps.push(rep);
    gi++;
  }
  container.innerHTML = html;

  reps.forEach((rep, i) => {
    const c = container.querySelectorAll('.lib-card-canvas')[i];
    if (c) _drawLibCanvas(c, miniRatio, rep);
  });
}

// 카드 클릭: 보이싱 1개 → 직접 추가 / 복수 → 보이싱 모달
function onLibCardClick(event, sharpName) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  const idxList = entries.reduce((acc, e, i) => (e.name === sharpName ? [...acc, i] : acc), []);
  if (!idxList.length) return;

  const cardEl = event.currentTarget;
  cardEl.classList.add('lib-card-clicked');
  setTimeout(() => cardEl.classList.remove('lib-card-clicked'), 300);

  if (idxList.length === 1) {
    _pdFlyToPalette(cardEl);
    _pdAddEntryToProject(entries[idxList[0]]);
    return;
  }
  openVoicingModal(sharpName, cardEl);
  window.Tutorial?.notify(`libcard:${sharpName}`);
}

// 선택한 코드 다이어그램이 팔레트로 날아가는 애니메이션 (추가 인식 피드백)
function _pdFlyToPalette(sourceEl) {
  const target = document.getElementById('palette-section-' + _pdProjectId)
              || document.getElementById('chord-palette-' + _pdProjectId);
  const canvas = sourceEl?.querySelector('canvas');
  if (!sourceEl || !target || !canvas) return;

  const sr = sourceEl.getBoundingClientRect();
  const tr = target.getBoundingClientRect();

  const ghost = document.createElement('div');
  ghost.className = 'pd-fly-ghost';
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  ghost.appendChild(img);
  ghost.style.left   = sr.left + 'px';
  ghost.style.top    = sr.top  + 'px';
  ghost.style.width  = sr.width  + 'px';
  ghost.style.height = sr.height + 'px';
  document.body.appendChild(ghost);

  const dx = (tr.left + tr.width / 2) - (sr.left + sr.width / 2);
  const dy = (tr.top  + tr.height / 2) - (sr.top  + sr.height / 2);

  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(0.72)`, opacity: 0.95, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 }
  ], { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
  anim.onfinish   = () => ghost.remove();
  anim.oncancel   = () => ghost.remove();
}

// 캔버스 렌더 (미니 카드 공용) — voicing-canvas.js 모듈로 일원화
function _drawLibCanvas(canvas, ratio, entry, nameOverride = '') {
  VoicingCanvas.draw(canvas, {
    frets:      entry.frets,
    openMute:   entry.openMute,
    barre:      entry.barres?.[0] ?? entry.barre ?? {},
    barreRange: entry.barreRanges?.[0] ?? entry.barreRange ?? null,
    fretNumber: entry.fretNumber,
    patternR:   entry.patternR, // ★ 누락 시 fretNumber로 폴백 → r+1 시작 패턴이 한 칸 밀림
    source:     entry.source,   // ★ 누락 시 모듈이 static 취급 → offset/라벨 어긋남
    fingering:  entry.fingerings?.[0] ?? entry.fingering,
  }, {
    chordName:     nameOverride,
    fingerNumMode: _libFingerMode,
    ratio,
  });
}

// ── 보이싱 피커 모달 ──
function openVoicingModal(sharpName, cardEl) {
  const modal   = _pdEl('lib-voicing-modal');
  const overlay = _pdEl('lib-voicing-overlay');
  if (!modal) return;

  const bottomEl = _pdEl('palette-dict-modal')?.querySelector('.lib-bottom');
  if (bottomEl && cardEl) {
    const br = bottomEl.getBoundingClientRect();
    const cr = cardEl.getBoundingClientRect();
    const ox = cr.left + cr.width  / 2 - br.left;
    const oy = cr.top  + cr.height / 2 - br.top;
    modal.style.transformOrigin = `${ox}px ${oy}px`;
  }

  _voicingModalChord = sharpName;
  _renderVoicingGrid(sharpName);

  overlay?.classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    modal.classList.add('open');
  }));
}

function closeVoicingModal() {
  // 튜토리얼이 이 구간에서 목록을 잠갔으면 무시한다(모달 여백·오버레이 오터치 방지)
  if (window.Tutorial?.locksVoicing?.()) return;
  _pdEl('lib-voicing-modal')?.classList.remove('open');
  _pdEl('lib-voicing-overlay')?.classList.remove('open');
  _voicingModalChord = null;
}

function _renderVoicingGrid(sharpName) {
  const grid = _pdEl('lib-voicing-grid');
  if (!grid) return;
  const allEntries = (window.chordsLibrary || {})[_libRoot] || [];
  const miniW      = _libMiniW();
  const miniRatio  = miniW / VoicingCanvas.BASE_W;
  const useFlat    = accidental === 'flat';
  const filtered   = allEntries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.name === sharpName);

  grid.innerHTML = filtered.map(({ e, i }, pos) => {
    const dispName = useFlat ? e.flatName : e.name;
    // data-vpos: 코드 그룹 안에서 몇 번째 보이싱인지 (전역 인덱스는 코드마다 달라 튜토리얼이 못 쓴다)
    return `<div class="lib-card" data-vpos="${pos}"
                 onclick="event.stopPropagation(); onVoicingPick(event, ${i});">
               <canvas class="lib-card-canvas" data-vidx="${i}"
                       width="${miniW}"
                       height="${Math.round(VoicingCanvas.BASE_H * miniRatio)}"></canvas>
               <div class="lib-card-name">${dispName}</div>
             </div>`;
  }).join('');

  filtered.forEach(({ e, i }) => {
    const c = grid.querySelector(`[data-vidx="${i}"]`);
    if (c) _drawLibCanvas(c, miniRatio, e);
  });
}

// 보이싱 카드 탭 → 해당 보이싱을 프로젝트에 추가 (모달 유지)
function onVoicingPick(event, idx) {
  const entries = (window.chordsLibrary || {})[_libRoot] || [];
  const entry = entries[idx];
  if (!entry) return;
  const cardEl = event.currentTarget;
  cardEl.classList.add('lib-card-clicked');
  setTimeout(() => cardEl.classList.remove('lib-card-clicked'), 300);
  _pdFlyToPalette(cardEl);
  _pdAddEntryToProject(entry);
}

// ── 샵/플랫 토글 ──
function toggleLibAccidental() {
  const current = _pdEl('lib-acc-sharp')?.classList.contains('active') ? 'sharp' : 'flat';
  accidental = current === 'sharp' ? 'flat' : 'sharp';
  _pdEl('lib-acc-sharp')?.classList.toggle('active', accidental === 'sharp');
  _pdEl('lib-acc-flat')?.classList.toggle('active', accidental === 'flat');
  renderLibRootTabs();
  renderLibCards(_libRoot);
  if (_voicingModalChord) _renderVoicingGrid(_voicingModalChord);
}

// 라이브러리 엔트리 → 프로젝트 코드 객체 변환 후 추가 (home.js libSaveToProject 미러)
function _pdAddEntryToProject(entry) {
  const chordData = libEntryToChord(entry);
  if (!chordData) return;
  const p = getProject(_pdProjectId);
  if (!p) return;
  p.chords.push(chordData);
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderThumbList(_pdProjectId);
  analytics.track('chord_added', { chord_name: chordData.name, project_id: _pdProjectId, source: 'palette_dict' });
  window.Tutorial?.notify(`chordadded:${entry.name}`);
}

// ── 튜토리얼 시드 노트 ────────────────────────────────────────
// STEP4는 완성된 노트에서 시작한다(작은 별 1절). 샌드박스에만 쓰이므로 실제 노트에 영향 없음.
// 세로모드는 8칸 배열 중 짝수 인덱스(0·2·4·6)만 표시되므로 그 자리에 배치한다.
const TUT_SEED_LINES = [
  { text: '반짝반짝 작은 별', chords: ['C', null, 'F', 'C'] },
  { text: '아름답게 비치네', chords: ['F', 'C',  'G', 'C'] },
];
// 어떤 보이싱을 쓸지 — 코드명 → chordsLibrary 그룹 안 순번
const TUT_SEED_VOICING = {
  C: 0, // Open  x32010
  F: 1, // Open  xx3211 (약식)
  G: 0, // Open  320003
};

// ── STEP4 완료 선물: 완성된 '작은 별' 노트 ────────────────────
// 튜토리얼 시드(2줄 실습용)와는 별개다. 1절 전체가 완성된 악보를 그대로 준다.
// null = 앞 코드가 이어짐(악보의 % 표기) → 슬롯을 비운다.
const GIFT_SONG_NAME  = '작은 별';
const GIFT_SONG_KEY   = 'chorditor_tut_gift';
const GIFT_SONG_LINES = [
  { text: '반짝반짝 작은 별', chords: ['C', null, 'F', 'C'] },
  { text: '아름답게 비치네', chords: ['F', 'C',  'G', 'C'] },
  { text: '동쪽 하늘에서도', chords: ['G', null, 'G', null] },
  { text: '서쪽 하늘에서도', chords: ['G', null, 'G', null] },
  { text: '반짝반짝 작은 별', chords: ['C', null, 'F', 'C'] },
  { text: '아름답게 비치네', chords: ['F', 'C',  'G', 'C'] },
];

// 선물 노트를 만들어 sessionStorage에 보관한다.
// STEP4 완료 판정은 home.html에서 일어나는데 거기엔 라이브러리 변환 로직이 없어서,
// 시드를 만드는 이 자리에서 미리 만들어 넘겨준다(tutorial.js acceptGift가 꺼내 쓴다).
function stashTutorialGiftSong() {
  const chords = {};
  ['C', 'F', 'G'].forEach(name => {
    const chord = libEntryToChord(_tutFindEntry(name, TUT_SEED_VOICING[name]));
    if (chord) chords[name] = chord;
  });
  const arrangement = GIFT_SONG_LINES.map(line => {
    const slots = new Array(8).fill(null);
    line.chords.forEach((name, i) => {
      if (name && chords[name]) slots[i * 2] = chords[name].id; // 세로 표시 칸 = 짝수 인덱스
    });
    return { id: genId(), text: line.text, slots };
  });
  const note = {
    id: genId(),
    name: GIFT_SONG_NAME,
    pinned: false, pinnedOrder: 0,
    important: false, importantOrder: 0,
    capo: 0,
    bpm: 100,
    meter: { num: 4, den: 4 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: Object.values(chords),
    arrangement,
  };
  try { sessionStorage.setItem(GIFT_SONG_KEY, JSON.stringify(note)); } catch (_) {}
}

function _tutFindEntry(name, pos) {
  const list = ((window.chordsLibrary || {})[name[0]] || []).filter(e => e.name === name);
  return list[pos] ?? list[0] ?? null;
}

// 튜토리얼 시드 노트 이름 — 목록에서 지목할 때도 쓰이므로 한 곳에서만 정의
const TUT_SEED_MAIN_NAME   = '작은 별';
const TUT_SEED_PINNED_NAME = '연습 중인 곡';

// STEP4 시작 시 깔아둘 노트 목록.
//   [0] 작은 별   — 최근(기본). 편집 실습 대상
//   [1] 연습 중인 곡 — 즐겨찾기. 노트 분류를 설명하려면 각 칸에 예시가 있어야 한다
// 중요 칸은 비워둔다 — 마지막 구간에서 유저가 직접 옮겨 채운다.
function buildTutorialSeedProjects() {
  const main = buildTutorialSeedProject();
  const now  = Date.now();
  const pinned = {
    id: genId(),
    name: TUT_SEED_PINNED_NAME,
    pinned: true, pinnedOrder: 1,
    important: false, importantOrder: 0,
    capo: 0,
    bpm: 120,
    createdAt: now - 1000,
    updatedAt: now - 1000, // 작은 별이 최근 목록 위로 오도록 살짝 과거로
    chords: [],
    arrangement: [{ id: genId(), text: '', slots: new Array(8).fill(null) }],
  };
  return [main, pinned];
}

// 작은 별 1절이 완성된 노트를 만들어 반환 (저장은 호출부에서)
function buildTutorialSeedProject() {
  const chords = {};
  ['C', 'F', 'G'].forEach(name => {
    const chord = libEntryToChord(_tutFindEntry(name, TUT_SEED_VOICING[name]));
    if (chord) chords[name] = chord;
  });

  const arrangement = TUT_SEED_LINES.map(line => {
    const slots = new Array(8).fill(null);
    line.chords.forEach((name, i) => {
      if (name && chords[name]) slots[i * 2] = chords[name].id; // 세로 표시 칸 = 짝수 인덱스
    });
    return { id: genId(), text: line.text, slots };
  });

  return {
    id: genId(),
    name: TUT_SEED_MAIN_NAME,
    pinned: false, pinnedOrder: 0,
    important: false, importantOrder: 0,
    capo: 0,
    bpm: 100,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: Object.values(chords),
    arrangement,
  };
}

// 라이브러리 엔트리 → 노트에 담기는 코드 객체. 변환만 하고 저장은 하지 않는다.
// (팔레트 추가와 튜토리얼 시드 노트가 같은 규칙을 쓰도록 분리)
function libEntryToChord(entry) {
  if (!entry) return null;
  const useFlat    = accidental === 'flat';
  const dispName   = useFlat ? entry.flatName : entry.name;
  // 에디터 "슬롯2 = fretNumber" 모델 — pattern: 라벨 r+1/offset r-1, static: 라벨 r/offset r-2 (라벨 최소 2)
  // (static 공식 하드코딩 시 pattern 보이싱 dot이 에디터에서 우측 1칸 밀림 — importLibChordToProject와 동일 공식)
  const _saveFretNum = Math.max(2, entry.source === 'pattern' ? entry.fretNumber + 1 : entry.fretNumber);
  const fretOffset = _saveFretNum - 2;
  const activeFingering = entry.fingerings?.[0] ?? entry.fingering;

  const libDots = entry.frets
    .map((f, s) => (f !== null && f > 0)
      ? { s, f: f - fretOffset, n: _libFingerMode ? (typeof activeFingering?.[s] === 'number' ? activeFingering[s] : 0) : 0 }
      : null)
    .filter(Boolean);
  const libOpenMute = entry.frets.map((f, s) =>
    (f === null || entry.openMute[s] === 'mute') ? 'mute' : 'open');
  const libBarre = {};
  const importBarre = entry.barres?.[0] ?? entry.barre ?? {};
  Object.entries(importBarre).forEach(([f, v]) => { libBarre[parseInt(f) - fretOffset] = v; });

  const comp = parseChordNameToComponents(dispName)
    || { root: 'C', bass: '', triad: '', seventh: '', func: '', tension: '' };

  const chordData = {
    id: genId(),
    name: dispName,
    root: comp.root,
    triad: comp.triad  || '',
    seventh: comp.seventh || '',
    func: comp.func    || '',
    tensions: comp.tension ? [comp.tension] : [],
    bass: comp.bass    || '',
    dots: libDots,
    openMute: libOpenMute,
    barre: libBarre,
    barreRange: entry.barreRanges?.[0] ?? entry.barreRange ?? null, // 바레 현 범위 보존(카드 렌더 index 0과 일치)
    source: entry.source, // pattern/static — dot 세로 offset 결정, 누락 시 어긋남
    fretNumber: _saveFretNum,
    fingerNumMode: _libFingerMode,
    accidental: accidental,
    // 원본 보이싱 스냅샷 — 사전 카드(_drawLibCanvas)와 동일한 렌더 계약. chordToVoicing이 이걸 우선 사용.
    voicing: {
      frets:      entry.frets,
      openMute:   entry.openMute,
      barre:      entry.barres?.[0] ?? entry.barre ?? {},
      barreRange: entry.barreRanges?.[0] ?? entry.barreRange ?? null,
      fretNumber: entry.fretNumber,
      source:     entry.source,
      fingering:  _libFingerMode ? (entry.fingerings?.[0] ?? entry.fingering) : null,
    },
  };

  return chordData;
}

// 코드명 → 구성요소 파싱 (home.js parseChordNameToComponents verbatim 복제 — 수정 금지)
function parseChordNameToComponents(name) {
  const rootMatch = name.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  let rest = name.slice(root.length);

  let bass = '';
  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx >= 0) {
    bass = rest.slice(slashIdx + 1);
    rest = rest.slice(0, slashIdx);
  }

  const MAP = [
    ['mM7',    { triad: 'm',   seventh: 'M7', func: '' }],
    ['m7(b5)', { triad: 'm',   seventh: '7',  func: 'b5' }],
    ['m7',     { triad: 'm',   seventh: '7',  func: '' }],
    ['m6',     { triad: 'm',   seventh: '6',  func: '' }],
    ['M7',     { triad: '',    seventh: 'M7', func: '' }],
    ['7sus4',  { triad: '',    seventh: '7',  func: 'sus4' }],
    ['7',      { triad: '',    seventh: '7',  func: '' }],
    ['6',      { triad: '',    seventh: '6',  func: '' }],
    ['dim7',   { triad: 'dim', seventh: '7',  func: '' }],
    ['dim',    { triad: 'dim', seventh: '',   func: '' }],
    ['aug7',   { triad: 'aug', seventh: '7',  func: '' }],
    ['aug',    { triad: 'aug', seventh: '',   func: '' }],
    ['sus4',   { triad: '',    seventh: '',   func: 'sus4' }],
    ['sus2',   { triad: '',    seventh: '',   func: 'sus2' }],
    ['add9',   { triad: '',    seventh: '',   func: 'add9' }],
    ['m',      { triad: 'm',   seventh: '',   func: '' }],
    ['',       { triad: '',    seventh: '',   func: '' }],
  ];

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension: '', ...comp };
    }
  }

  let tension = '';
  const tensionMatch = rest.match(/\(([^)]+)\)/);
  if (tensionMatch) {
    tension = tensionMatch[1].split(',')[0].trim();
    rest = rest.replace(tensionMatch[0], '');
  }

  for (const [suffix, comp] of MAP) {
    if (rest === suffix) {
      return { root, bass, tension, ...comp };
    }
  }

  return { root, bass, tension, triad: '', seventh: '', func: '' };
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
  await stopPlayAll({ wait: true });
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

  // 코드슬롯 4/8개 판정 경계(787px) — 화면비 안 바뀌는 순수 폭 리사이즈(데스크탑 창 드래그 등)도
  // 이 경계를 넘으면 재렌더되도록 별도 감시
  const mqSlot = window.matchMedia('(min-width: 787px)');
  try { mqSlot.addEventListener('change', handler); } catch(e) { mqSlot.addListener(handler); }
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
  VoicingCanvas.draw(cv, chordToVoicing(chord), {
    chordName: chord.name, fingerNumMode: chord.fingerNumMode,
    ratio: 480 / VoicingCanvas.BASE_W,
  });

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

// ── DB 기반 공유(신규): 프로젝트당 코드 1개 고정, payload는 projects 테이블에 저장.
// 공용 로직(코드 생성/조회, DB 미러링)은 shared.js에 있음(getOrCreateShareCode, _fetchSharedPayload).
// 오프라인 base64 URL 방식(구)은 하위호환으로 계속 지원 — DB 접근 실패 시에만 폴백.

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

async function parseShareCode(raw) {
  raw = raw.trim();
  // 신규 DB 방식: URL의 ?c= 파라미터
  if (raw.includes('?c=')) {
    try {
      const code = new URL(raw).searchParams.get('c');
      if (code) { const p = await _fetchSharedPayload(code); if (p) return p; }
    } catch (e) {}
  }
  // 신규 DB 방식: 16자 코드 그대로 붙여넣기 (DB에 없으면 아래 legacy 경로로 계속 시도)
  if (SHARE_CODE16_RE.test(raw)) {
    const p = await _fetchSharedPayload(raw);
    if (p) return p;
  }
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
  const codeEl = document.getElementById('share-code-input');
  codeEl.value            = '코드 생성 중…';
  codeEl.dataset.full     = '';
  codeEl.dataset.shareUrl = '';
  codeEl.dataset.projectName = project.name || 'Chorditor';
  document.getElementById('modal-share').classList.remove('hidden');
  lucide.createIcons();

  // DB 방식(신규): 프로젝트당 코드 1개 고정 — 있으면 재사용(payload만 최신화), 없으면 새로 발급
  const payloadStr = buildSharePayload(project);
  const dbCode = await getOrCreateShareCode(project, payloadStr);
  if (dbCode) {
    if (project.shareCode !== dbCode) { project.shareCode = dbCode; updateProject(project); }
    codeEl.value = dbCode;
    codeEl.dataset.full = dbCode;
    codeEl.dataset.shareUrl = 'https://chorditor.github.io/Chorditor/share/?c=' + dbCode;
    return;
  }

  // DB 저장 실패(오프라인 등) 시에만 기존 base64 payload 코드로 폴백 (길 수 있어 표시만 축약)
  const code = await generateShareCode(project);
  const shorten = s => s.length > 30 ? s.slice(0, 20) + '…' + s.slice(-6) : s;
  codeEl.value        = shorten(code);
  codeEl.dataset.full = code;
  codeEl.dataset.shareUrl = 'https://chorditor.github.io/Chorditor/share/?share=' + code;
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
  incrementStat('shares');
  analytics.track('share_initiated', { type: 'code' });
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


// 공유 링크로 들어온 코드 처리 — 모달 없이 바로 새 노트 생성 후 그 페이지로 이동.
// shared.js의 window._handleShareImport(Android 딥링크)와 아래 ?share=/?c= URL 파라미터
// 처리 둘 다 세션스토리지에 저장만 해두고 여기서 소비함(로그인 전 도착해도 로그인 후 자동 처리).
async function _consumePendingShareCode() {
  const raw = sessionStorage.getItem(PENDING_SHARE_CODE_KEY);
  if (!raw) return;
  sessionStorage.removeItem(PENDING_SHARE_CODE_KEY);
  const payload = await parseShareCode(raw);
  if (!payload) { alert('공유 코드가 올바르지 않습니다.'); return; }
  const p = {
    id: genId(), name: '공유받은 노트', pinned: false, pinnedOrder: 0, important: false, importantOrder: 0,
    capo: 0, bpm: 120, colCount: 4, createdAt: Date.now(), updatedAt: Date.now(), chords: [], arrangement: [],
  };
  const list = loadProjects(); list.push(p); saveProjects(list);
  applyImportPayload(p.id, payload, { applyBpm: true, applyCapo: true, applyCol: true });
  location.href = 'user_project.html?id=' + p.id;
}

// ── OAuth 리다이렉트 후 처리 (웹 전용, shared.js에서 typeof 가드로 호출) ──
function onAuthSignedIn() {
  setTimeout(() => checkAndShowNotice(), 500);
}

// ═══════════════════════════════════════════════════════════════
// 초기화 (home.html 전용)
// ═══════════════════════════════════════════════════════════════
// ─── 프로젝트 페이지 닫기 (슬라이드다운 애니메이션) ──────────────
async function closeProjectPage() {
  _playTap();
  await stopPlayAll({ wait: true });
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

  // 뒤로가기 버튼 항상 표시 (프로젝트 목록으로 이동)
  const _backBtn = document.getElementById('back-btn');
  if (_backBtn) _backBtn.classList.remove('hidden');

  // 뒤로가기는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  // 마우스 드래그 스크롤 (브라우저 환경, progression.js와 동일 패턴) — .project-lines는
  // 렌더될 때마다 새로 생성되므로 document에 위임. 코드슬롯/텍스트 편집은 그대로 두고
  // 빈 영역을 누른 드래그만 스크롤로 처리
  (() => {
    let _dragScroller = null, _startY = 0, _scrollY = 0;
    document.addEventListener('mousedown', e => {
      const scroller = e.target.closest('.project-lines');
      if (!scroller || e.target.closest('.line-text, .chord-slot, button')) return;
      _dragScroller = scroller;
      _startY = e.clientY;
      _scrollY = scroller.scrollTop;
      scroller.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_dragScroller) return;
      _dragScroller.scrollTop = _scrollY - (e.clientY - _startY);
    });
    document.addEventListener('mouseup', () => {
      if (!_dragScroller) return;
      _dragScroller.style.cursor = '';
      _dragScroller = null;
    });
  })();

  // 새 프로젝트 모달 Enter 키
  document.getElementById('create-project-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmCreateProject(); });

  // URL ?id= 파라미터로 프로젝트 자동 렌더링
  const params = new URLSearchParams(location.search);
  let projectIdParam = params.get('id');

  // 튜토리얼 STEP4 진입 — 작은 별 1절이 완성된 노트를 즉석에서 만들어 그걸로 시작한다.
  // 샌드박스에만 저장되므로 실제 노트에는 영향이 없고, STEP3 진행 여부와도 무관하다.
  if (params.get('tutseed')) {
    const seeds = buildTutorialSeedProjects();
    saveProjects(seeds);
    stashTutorialGiftSong(); // STEP4 완료 시 줄 완성본을 미리 만들어 둔다
    const seed = seeds[0]; // 작은 별 — 편집 실습 대상
    projectIdParam = seed.id;
    isEditMode = true; // 편집 모드로 열어 바로 이어갈 수 있게
    history.replaceState(null, '', location.pathname + '?id=' + seed.id);
  }

  const _allProjects = loadProjects();
  const _paramProject = projectIdParam ? _allProjects.find(p => p.id === projectIdParam) : null;
  if (projectIdParam && _paramProject && isProjectLocked(_paramProject, _allProjects)) {
    location.href = 'home.html';
    return;
  }
  // 조회 불가한 id로 들어오면 스피너만 남아 무한 로딩처럼 보인다 → 홈으로 돌려보낸다
  // (튜토리얼 샌드박스가 해제된 뒤 그 노트로 이동하는 경우 등)
  if (projectIdParam && !_paramProject) {
    location.href = 'home.html';
    return;
  }
  if (projectIdParam) {
    // 에디터 왕복 복귀: 편집 모드 + 스크롤 위치 복원
    try {
      const _ret = sessionStorage.getItem('np_edit_return');
      if (_ret) {
        const o = JSON.parse(_ret);
        if (o && o.id === projectIdParam) {
          isEditMode = true;
          _pendingEditRestore = { scrollTop: o.scrollTop || 0 };
        }
      }
    } catch (_) {}
    sessionStorage.removeItem('np_edit_return');
    const _vp = document.getElementById('view-project');
    if (_vp) _vp.innerHTML = '<div class="project-loading-spinner"></div>';

    const _cover = document.getElementById('page-cover');
    setTimeout(() => {
      renderProjectView(projectIdParam);
      // 튜토리얼 진행 중이면 이어받기 — 대상 요소가 생긴 뒤라야 위치가 잡힌다
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (typeof Tutorial !== 'undefined') Tutorial.resume();
      }));
      if (_cover) {
        _cover.classList.add('cover-out');
        setTimeout(() => { _cover.style.display = 'none'; }, 200);
      }
    }, 200);
  } else {
    // id 없이 접근한 경우 홈으로 리다이렉트
    location.href = 'home.html';
    return;
  }

  // URL share 파라미터 처리 (구: ?share=<base64 payload>, 신: ?c=<DB 16자 코드>)
  // 여기서 바로 파싱하지 않고 저장만 함 — 로그인 안 된 상태면 곧 onboarding.html로
  // 리다이렉트될 수 있어서, 그 전에 파싱해봤자 결과가 버려짐. _consumePendingShareCode가 나중에 처리.
  const shareParam = params.get('share') || params.get('c');
  if (shareParam) {
    history.replaceState(null, '', location.pathname);
    sessionStorage.setItem(PENDING_SHARE_CODE_KEY, shareParam);
  }

  await initBilling();

  // ── DEV 빌드: 인증 체크 없이 바로 진입 ──────────────────────
  if (APP_VERSION.includes('_dev')) {
    initSupabase().catch(() => {});
    _consumePendingShareCode();
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
      _consumePendingShareCode();
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
  _consumePendingShareCode();
  setTimeout(() => checkAndShowNotice(), 1000);
});

