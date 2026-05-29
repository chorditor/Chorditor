// ═══════════════════════════════════════════════════════════════
// progression.js — 코드 진행 리스트 페이지
// 데이터: progression-data.js (PROGRESSION_DATA) 에서 로드
// ═══════════════════════════════════════════════════════════════

// window.PROGRESSIONS 빌드: progression-parser.js에서 처리

// ── 키 상수 ─────────────────────────────────────────────────
const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const USE_FLAT_KEY    = new Set([1, 3, 6, 8, 10]); // Db Eb Gb Ab Bb

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

const _SEMITONE_TO_DEGREE   = { 0:'I', 2:'II', 4:'III', 5:'IV', 7:'V', 9:'VI', 11:'VII' };
const _SEMITONE_TO_BASS_NUM = { 0:1, 2:2, 4:3, 5:4, 7:5, 9:6, 11:7 };

function _getRomanNumeral(semitones, quality, bass) {
  const norm   = ((semitones % 12) + 12) % 12;
  const roman  = _SEMITONE_TO_DEGREE[norm] || '?';
  const sfx    = { M:'', m:'m', '7':'7', M7:'M7', m7:'m7', dim:'dim', dim7:'dim7', aug:'aug' };
  const suffix = sfx[quality] ?? '';
  let result   = roman + (suffix ? `<span class="prog-chord-sfx">${suffix}</span>` : '');
  if (bass != null) {
    const bassNorm = ((bass % 12) + 12) % 12;
    const bassNum  = _SEMITONE_TO_BASS_NUM[bassNorm];
    if (bassNum != null) result += `<span class="prog-chord-sfx">/${bassNum}</span>`;
  }
  return result;
}

function _getChordName(rootKey, semitones, quality, bass) {
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const noteIdx = (rootKey + semitones + 12) % 12;
  const note    = names[noteIdx];
  const sfx     = { M: '', m: 'm', '7': '7', M7: 'M7', m7: 'm7', dim: 'dim', dim7: 'dim7', aug: 'aug' };
  let result    = note + (sfx[quality] ?? '');
  if (bass != null) {
    const bassIdx = (noteIdx + bass) % 12;
    result += '/' + names[bassIdx];
  }
  return result;
}

// ── no 라벨 맵 ───────────────────────────────────────────────
const _NO_LABELS = {
  1: '초보자용 코드진행',
  2: '7th 코드',
  3: '고급 코드진행',
};
const _NO_CHIP_LABELS = {
  0: '목록 별',
  1: '초보자',
  2: '7th',
  3: '고급',
};

// ── 상태 ────────────────────────────────────────────────────
let _currentKey   = 0;
let _useFlat      = false;
let _playingId    = null;
let _playStep     = 0;
let _playTimer    = null;
let _stepsFilter  = 0; // 0=전체, 4=4개, 8=8개
let _noFilter     = 0; // 0=전체, 1/2/3=해당 no만

// ── 재생/정지 ───────────────────────────────────────────────
async function _stopPlay(options = {}) {
  if (_playTimer) { clearTimeout(_playTimer); _playTimer = null; }
  if (_playingId) {
    const card = document.querySelector(`.prog-card[data-id="${_playingId}"]`);
    if (card) {
      card.querySelectorAll('.prog-chord-cell').forEach(c => c.classList.remove('prog-chord-cell--playing'));
      const btn = card.querySelector('.prog-play-btn');
      if (btn) { btn.innerHTML = '<i data-lucide="chevron-right"></i>'; lucide.createIcons({ nodes: [btn] }); }
    }
  }
  _playingId = null;
  _playStep  = 0;
  const stopPromise = GuitarAudio.stop({ wait: options.wait === true });
  if (options.wait) await stopPromise;
}

function _startPlay(progId) {
  if (_playingId === progId) { _stopPlay(); return; }
  _stopPlay();

  const prog = PROGRESSIONS.find(p => p.id === progId);
  if (!prog) return;

  _playingId = progId;
  _playStep  = 0;

  const card = document.querySelector(`.prog-card[data-id="${progId}"]`);
  const btn  = card?.querySelector('.prog-play-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="square"></i>'; lucide.createIcons({ nodes: [btn] }); }

  analytics.track('progression_played', {
    prog_id: progId,
    key:     _getKeyDisplayName(_currentKey),
  });

  function tick() {
    const cells = card?.querySelectorAll('.prog-chord-cell');
    if (cells) {
      cells.forEach(c => c.classList.remove('prog-chord-cell--playing'));
      const activeCell = cells[_playStep % prog.steps.length];
      if (activeCell) activeCell.classList.add('prog-chord-cell--playing');
    }

    const step = prog.steps[_playStep % prog.steps.length];
    GuitarAudio.playChord(_currentKey, step.semitones, step.quality);

    _playStep++;
    const msPerChord = (60000 / 80) * 2; // 2박자 per chord (BPM 고정 80 — 연습실로 이식 예정)
    _playTimer = setTimeout(tick, msPerChord);
  }
  tick();
}

// ── UI 렌더 ──────────────────────────────────────────────────
function _renderKeyGrid() {
  const grid = document.getElementById('prog-key-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let k = 0; k < 12; k++) {
    const btn = document.createElement('button');
    btn.className = 'prog-key-grid-btn' + (k === _currentKey ? ' prog-key-grid-btn--active' : '');
    btn.textContent = _getKeyDisplayName(k);
    btn.addEventListener('pointerup', () => {
      if (k === _currentKey) return;
      _stopPlay();
      _currentKey = k;
      _renderKeyGrid();
      _renderProgList();
      _updateKeyChipLabel();
    });
    grid.appendChild(btn);
  }
}

function _updateKeyChipLabel() {
  const chip = document.getElementById('filter-key');
  if (!chip) return;
  chip.textContent = _getKeyDisplayName(_currentKey);
}

function _renderProgList() {
  const list = document.getElementById('prog-list');
  if (!list) return;
  list.innerHTML = '';

  // steps 필터 + no 필터 적용
  let filtered = _stepsFilter === 0
    ? PROGRESSIONS
    : PROGRESSIONS.filter(p => p.steps.length === _stepsFilter);
  if (_noFilter !== 0) {
    filtered = filtered.filter(p => p.no === _noFilter);
  }

  // no별 그룹 렌더 (섹션 라벨 포함)
  const noGroups = [];
  filtered.forEach(prog => {
    const no = prog.no ?? 1;
    let group = noGroups.find(g => g.no === no);
    if (!group) { group = { no, items: [] }; noGroups.push(group); }
    group.items.push(prog);
  });

  noGroups.forEach(group => {
    const label = document.createElement('div');
    label.className = 'prog-section-label';
    label.textContent = _NO_LABELS[group.no] ?? `목록 ${group.no}`;
    list.appendChild(label);

    group.items.forEach(prog => {
    const card = document.createElement('div');
    card.className = 'prog-card';
    card.dataset.id = prog.id;

    const chordCells = prog.steps.map((step, i) => {
      const prev   = prog.steps[i - 1];
      const isSame = prev && prev.semitones === step.semitones && prev.quality === step.quality && (prev.bass ?? null) === (step.bass ?? null);
      const name   = isSame ? '-' : _getChordName(_currentKey, step.semitones, step.quality, step.bass);
      return `<div class="prog-chord-cell">
        <span class="prog-chord-name">${name}</span>
      </div>`;
    }).join('');

    const romanName = prog.steps.map((step, i) => {
      const prev   = prog.steps[i - 1];
      const isSame = prev && prev.semitones === step.semitones && prev.quality === step.quality && (prev.bass ?? null) === (step.bass ?? null);
      return isSame ? '-' : _getRomanNumeral(step.semitones, step.quality, step.bass);
    }).join('<span class="prog-card-name-sep"></span>');

    card.innerHTML = `
      <div class="prog-card-header">
        <span class="prog-card-name">${romanName}</span>
        ${prog.recommended ? '<i class="ph-fill ph-star prog-recommended-star"></i>' : ''}
        ${prog.keys?.length ? `<span class="prog-key-label">추천 key</span><span class="prog-key-tag">${prog.keys.join('&nbsp; ')}</span>` : ''}
      </div>
      <div class="prog-card-body">
        <div class="prog-chord-row">${chordCells}</div>
        <button class="prog-play-btn"><i data-lucide="chevron-right"></i></button>
      </div>`;

      card.querySelector('.prog-play-btn').addEventListener('pointerup', async () => {
        await _stopPlay({ wait: true });
        location.href = `progression-detail.html?id=${encodeURIComponent(prog.id)}&key=${_currentKey}&flat=${_useFlat ? 1 : 0}`;
      });
      list.appendChild(card);
    }); // group.items.forEach
  }); // noGroups.forEach

  lucide.createIcons();
}

// ── 닫기 ────────────────────────────────────────────────────
async function closeProgressionPage() {
  await _stopPlay({ wait: true });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// ── DOMContentLoaded ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // progression-detail.html 등 다른 페이지에서 로드 시 DOM 초기화 건너뜀
  if (!document.getElementById('prog-action-bar')) return;

  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  _renderKeyGrid();
  _renderProgList();

  // Key 드롭다운 토글
  const keyChip    = document.getElementById('filter-key');
  const keyDropdown = document.getElementById('prog-key-dropdown');

  keyChip.addEventListener('pointerup', e => {
    e.stopPropagation();
    const open = !keyDropdown.hidden;
    keyDropdown.hidden = open;
    keyChip.classList.toggle('prog-filter-chip--active', !open);
  });

  document.addEventListener('pointerup', () => {
    if (!keyDropdown.hidden) {
      keyDropdown.hidden = true;
      keyChip.classList.remove('prog-filter-chip--active');
    }
  });

  keyDropdown.addEventListener('pointerup', e => e.stopPropagation());

  // 목록 별(no) 필터 드롭다운
  const diffBtn      = document.getElementById('filter-difficulty');
  const noDropdown   = document.getElementById('prog-no-dropdown');
  const noList       = document.getElementById('prog-no-list');

  function _renderNoList() {
    if (!noList) return;
    noList.innerHTML = '';
    const availableNos = [...new Set(PROGRESSIONS.map(p => p.no ?? 1))].sort((a, b) => a - b);
    const options = [{ no: 0, label: '전체' }, ...availableNos.map(n => ({ no: n, label: _NO_LABELS[n] ?? `목록 ${n}` }))];
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'prog-no-list-btn' + (opt.no === _noFilter ? ' prog-no-list-btn--active' : '');
      btn.innerHTML = `<span>${opt.label}</span>${opt.no === _noFilter ? '<span class="prog-no-list-check"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></span>' : ''}`;
      btn.addEventListener('pointerup', () => {
        _noFilter = opt.no;
        diffBtn.classList.toggle('prog-filter-chip--active', _noFilter !== 0);
        noDropdown.hidden = true;
        diffBtn.classList.remove('prog-filter-chip--active-open');
        _stopPlay();
        _renderProgList();
      });
      noList.appendChild(btn);
    });
  }

  if (diffBtn && noDropdown) {
    diffBtn.addEventListener('pointerup', e => {
      e.stopPropagation();
      // key 드롭다운 닫기
      if (keyDropdown && !keyDropdown.hidden) {
        keyDropdown.hidden = true;
        keyChip.classList.remove('prog-filter-chip--active');
      }
      const open = !noDropdown.hidden;
      noDropdown.hidden = open;
      if (!open) _renderNoList();
      diffBtn.classList.toggle('prog-filter-chip--active', !open || _noFilter !== 0);
    });

    document.addEventListener('pointerup', () => {
      if (!noDropdown.hidden) {
        noDropdown.hidden = true;
        diffBtn.classList.toggle('prog-filter-chip--active', _noFilter !== 0);
      }
    });

    noDropdown.addEventListener('pointerup', e => e.stopPropagation());
  }

  // 4/8 스텝 필터
  const stepsBtn = document.getElementById('filter-steps');
  const _STEPS_CYCLE = [0, 4, 8];
  const _STEPS_LABEL = { 0: '전체', 4: '4코드', 8: '8코드' };
  if (stepsBtn) {
    // "4코드" 기준 너비 고정
    stepsBtn.textContent = '4코드';
    stepsBtn.style.minWidth = stepsBtn.offsetWidth + 'px';
    stepsBtn.textContent = _STEPS_LABEL[_stepsFilter];

    stepsBtn.addEventListener('pointerup', () => {
      const idx = _STEPS_CYCLE.indexOf(_stepsFilter);
      _stepsFilter = _STEPS_CYCLE[(idx + 1) % _STEPS_CYCLE.length];
      stepsBtn.textContent = _STEPS_LABEL[_stepsFilter];
      stepsBtn.classList.toggle('prog-filter-chip--active', _stepsFilter !== 0);
      _stopPlay();
      _renderProgList();
    });
  }

  // 샵/플랫 토글
  const sharpBtn = document.getElementById('acc-sharp');
  const flatBtn  = document.getElementById('acc-flat');

  function _setAccidental(useFlat) {
    _useFlat = useFlat;
    sharpBtn.classList.toggle('active', !useFlat);
    flatBtn .classList.toggle('active',  useFlat);
    _stopPlay();
    _renderKeyGrid();
    _renderProgList();
    _updateKeyChipLabel();
  }

  const accToggle = sharpBtn.closest('.accidental-toggle');
  if (accToggle) {
    accToggle.addEventListener('pointerup', () => _setAccidental(!_useFlat));
  }

  // 마우스 드래그 스크롤 (브라우저 환경)
  const scroller = document.querySelector('.prog-scroll');
  if (scroller) {
    let _dragging = false, _startY = 0, _scrollY = 0;
    scroller.addEventListener('mousedown', e => {
      _dragging = true;
      _startY   = e.clientY;
      _scrollY  = scroller.scrollTop;
      scroller.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_dragging) return;
      scroller.scrollTop = _scrollY - (e.clientY - _startY);
    });
    document.addEventListener('mouseup', () => {
      if (!_dragging) return;
      _dragging = false;
      scroller.style.cursor = '';
    });
  }

  analytics.track('progression_page_viewed', {});
});
