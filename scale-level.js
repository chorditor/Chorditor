// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// scale-level.js ???ㅼ????덈꺼 ?덈젴 ?섏씠吏
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// ?? ?곸닔 ????????????????????????????????????????????????????
const SCALE_TITLES = {
  'major':          '메이저 스케일',
  'pentatonic':     '펜타토닉 스케일',
  'blues':          '블루스 스케일',
  'natural-minor':  '내추럴 마이너 스케일',
  'harmonic-minor': '하모닉 마이너 스케일',
  'mixolydian':     '믹솔리디안 스케일',
};

const SCALE_SHORT_NAMES = {
  'major':          '메이저',
  'pentatonic':     '펜타토닉',
  'blues':          '블루스',
  'natural-minor':  '내추럴 마이너',
  'harmonic-minor': '하모닉 마이너',
  'mixolydian':     '믹솔리디안',
};

const FORM_NAMES       = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼'];
const KEY_NAMES        = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const STRINGS          = 6;
const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19]);
const DOUBLE_DOT_FRETS = new Set([12]);

// ?? ?곹깭 ????????????????????????????????????????????????????
let _scaleKey  = 'major';
let _rootNote  = 0;
let _navIdx    = 0;
let _useFlat   = false;
let _testItem    = null;        // ?뚯뒪??以묒씤 { block, bi, startFret }
let _testHint      = null;        // ?뚰듃 ?꾩튂 { s, col } ???ш린??dot 紐?李띿쓬
let _placedNotes   = new Set();   // ?뚮젅?댁뼱媛 李띿? dot: "s,col" 臾몄옄??Set
let _testSubmitted = false;       // ?쒖텧 ??異붽? ?낅젰 李⑤떒

// ?? Audio Engine (Karplus-Strong) ????????????????????????????
const _AudioCtx   = window.AudioContext || window.webkitAudioContext;
let   _audioCtx   = null;
const _audioCache = {};

const OPEN_MIDI   = [64, 59, 55, 50, 45, 40]; // E B G D A E (string 0=1踰덉쨪)
const _midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

async function _renderKS(freq, duration) {
  const sr      = 44100;
  const total   = Math.round(sr * duration);
  const offline = new OfflineAudioContext(1, total, sr);
  const N       = Math.round(sr / freq);
  const d       = new Float32Array(total);
  const delay   = new Float32Array(N);
  const decay   = 1 - (0.5 / (N * 2));
  for (let i = 0; i < N; i++) delay[i] = (Math.random() * 2 - 1) * 0.5;
  for (let i = 0; i < total; i++) {
    const idx  = i % N;
    const next = (i + 1) % N;
    d[i] = delay[idx];
    delay[idx] = decay * 0.5 * (delay[idx] + delay[next]);
  }
  const buf = offline.createBuffer(1, total, sr);
  buf.getChannelData(0).set(d);
  const gain = offline.createGain();
  gain.gain.setValueAtTime(0.5, 0);
  gain.gain.exponentialRampToValueAtTime(0.001, duration);
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

async function _getBuffer(freq) {
  const key = freq.toFixed(2);
  if (!_audioCache[key]) _audioCache[key] = await _renderKS(freq, 2.5);
  return _audioCache[key];
}

async function playScaleNote(stringIdx, absFret) {
  if (!_audioCtx) _audioCtx = new _AudioCtx();
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();
  const midi = OPEN_MIDI[stringIdx] + absFret;
  const freq = _midiToFreq(midi);
  const buf  = await _getBuffer(freq);
  const src  = _audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(_audioCtx.destination);
  src.start();
}

// ?? ?ㅻ퉬寃뚯씠???쒗??鍮뚮뱶 ????????????????????????????????????
// 紐⑤뱺 block 횞 position???섎굹???좏삎 諛곗뿴濡??쇱묠
// 諛섑솚: [{ block, bi, startFret }, ...]
function buildNavSequence() {
  const blocks = ScaleData.getBlocks(_scaleKey);
  const seq = [];
  blocks.forEach((block, bi) => {
    const startFrets = ScaleData.getStartFrets(block, _rootNote);
    startFrets.forEach(sf => {
      seq.push({ block, bi, startFret: sf });
    });
  });
  // startFret ?ㅻ쫫李⑥닚 ?뺣젹 ?????꾩튂 ?쒖꽌?濡??대룞
  seq.sort((a, b) => a.startFret - b.startFret);
  return seq;
}

// ?? ?섏씠吏 ?リ린 ??????????????????????????????????????????????
function closeScaleLevel() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'scale-training.html'; }, 260);
  } else {
    location.href = 'scale-training.html';
  }
}

// ?? ?꾩껜 ??援ъ“ ?뚮뜑留?(1?뚮쭔 ?몄텧) ?????????????????????????
// ids: { neck, nums, wrapper } ???앸왂 ??湲곕낯 硫붿씤 ?꾨옯蹂대뱶 ID ?ъ슜
function renderFullNeck(ids = {}) {
  const neckEl  = document.getElementById(ids.neck    || 'fb-full-neck');
  const numsEl  = document.getElementById(ids.nums    || 'fb-full-nums');
  const wrapper = document.getElementById(ids.wrapper || 'fb-full-wrapper');
  if (!neckEl || !numsEl || !wrapper) return;

  // ?섑띁쨌?Β룸꽆踰??덈퉬 = TOTAL_FRETS / VISIBLE_FRETS 횞 100%
  const widthPct = `${(TOTAL_FRETS / FRETS_VISIBLE) * 100}%`;
  wrapper.style.width = widthPct;
  neckEl.style.width  = '100%';
  numsEl.style.width  = '100%';

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  // ?? 以???(?쏆뿉???쒖옉) ??
  const nutLeftPct = 1 / TOTAL_FRETS * 100;
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px; left:${nutLeftPct}%;`;
    neckEl.appendChild(el);
  }

  // ?? ??(fret 0怨?1 ?ъ씠) ??
  const nutEl = document.createElement('div');
  nutEl.className = 'fb-nut-line';
  nutEl.style.left = `${1 / TOTAL_FRETS * 100}%`;
  neckEl.appendChild(nutEl);

  // ?? ?꾨옯 ??(fret 2~20 ?쇱そ 寃쎄퀎) ??
  for (let f = 2; f < TOTAL_FRETS; f++) {
    const leftPct = f / TOTAL_FRETS * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ?? 媛?대뱶 ?꾪듃 ??
  SINGLE_DOT_FRETS.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    const dot = document.createElement('div');
    dot.className = 'fb-dot';
    dot.style.cssText = `left:${cx}%; top:50%;`;
    neckEl.appendChild(dot);
  });

  DOUBLE_DOT_FRETS.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    [33, 67].forEach(y => {
      const dot = document.createElement('div');
      dot.className = 'fb-dot';
      dot.style.cssText = `left:${cx}%; top:${y}%;`;
      neckEl.appendChild(dot);
    });
  });

  // ?? ?꾨옯 踰덊샇 (?꾪듃 ?꾩튂留? ??
  const allDotFrets = new Set([...SINGLE_DOT_FRETS, ...DOUBLE_DOT_FRETS]);
  allDotFrets.forEach(fretNum => {
    if (fretNum >= TOTAL_FRETS) return;
    const cx = (fretNum + 0.5) / TOTAL_FRETS * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-num';
    el.style.left = `${cx}%`;
    el.textContent = fretNum;
    numsEl.appendChild(el);
  });
}

// ?? 酉고룷???ㅽ겕濡??좊땲硫붿씠???????????????????????????????????
function scrollToFret(startFret, animate = true, viewportId = 'fb-viewport') {
  const viewport = document.getElementById(viewportId);
  if (!viewport) return;

  const vw = viewport.clientWidth;
  // 釉붾윮 以묒븰 fret = startFret + FRETS_VISIBLE/2
  // 洹??꾩튂瑜?酉고룷??以묒븰???ㅺ쾶 ?섎젮硫?
  // targetLeft = (startFret + FRETS_VISIBLE/2) / FRETS_VISIBLE * vw - vw/2
  //            = startFret / FRETS_VISIBLE * vw
  const targetLeft = (startFret / FRETS_VISIBLE) * vw;

  if (!animate) {
    viewport.scrollLeft = targetLeft;
    return;
  }

  const startLeft = viewport.scrollLeft;
  const diff      = targetLeft - startLeft;
  if (Math.abs(diff) < 1) return;

  const duration  = 350;
  const startTime = performance.now();

  function step(now) {
    const t    = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    viewport.scrollLeft = startLeft + diff * ease;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ?? ?뚰몴 DOM ?앹꽦 ?ы띁 ???????????????????????????????????????
function createNoteEl(absF, s, degree, ghost = false) {
  const leftPct = (absF + 0.5) / TOTAL_FRETS * 100;
  const topPct  = (s + 0.5) / STRINGS * 100;
  const isRoot  = degree === 1;
  const isOpen  = absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note'
    + (isRoot  ? ' fb-note--root'  : '')
    + (isOpen  ? ' fb-note--open'  : '')
    + (ghost   ? ' fb-note--ghost' : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;

  if (!ghost) {
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      el.classList.add('fb-note--pressed');
    });

    el.addEventListener('pointerup', e => {
      e.stopPropagation();
      el.classList.remove('fb-note--pressed');
      // ?뚮룞 ?붿냼 ?앹꽦
      const ripple = document.createElement('span');
      ripple.className = 'fb-note-ripple';
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
      playScaleNote(s, absF);
    });

    el.addEventListener('pointerleave', () => {
      el.classList.remove('fb-note--pressed');
    });
  }

  return el;
}

// ?? ?ㅼ????뚰몴 ?뚮뜑留?????????????????????????????????????????
// ?꾩옱 ?ъ??? ?쇰컲 dot / ?섎㉧吏 ?ъ??? ghost(?고븳) dot
function renderNotes(animate = true) {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // ghost 癒쇱? ?뚮뜑 (z-index ??쾶 源붾┝)
  seq.forEach((item, i) => {
    if (i === _navIdx) return;
    const parsed = ScaleData.parseGrid(item.block.grid);
    parsed.notes.forEach(note => {
      const absF = item.startFret + note.col;
      if (absF < 0 || absF >= TOTAL_FRETS) return;
      neckEl.appendChild(createNoteEl(absF, note.s, note.degree, true));
    });
  });

  // ?꾩옱 ?ъ????뚮뜑 (?꾩뿉 ?щ씪??
  const current = seq[_navIdx];
  const parsed  = ScaleData.parseGrid(current.block.grid);
  parsed.notes.forEach(note => {
    const absF = current.startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    neckEl.appendChild(createNoteEl(absF, note.s, note.degree, false));
  });

  scrollToFret(current.startFret, animate);
}

// ?? 媛???믪? ?쇱튂??洹쇱쓬 諛섑솚 ????????????????????????????????
// { s, absF, degree:1 } ?먮뒗 null
function findHighestRoot(block, startFret) {
  const parsed = ScaleData.parseGrid(block.grid);
  let highest     = null;
  let highestMidi = -1;

  parsed.notes
    .filter(n => n.degree === 1)
    .forEach(note => {
      const absF = startFret + note.col;
      if (absF < 0 || absF >= TOTAL_FRETS) return;
      const midi = OPEN_MIDI[note.s] + absF;
      if (midi > highestMidi) {
        highestMidi = midi;
        highest = { s: note.s, absF, degree: 1 };
      }
    });

  return highest;
}

// ?? ?뚯뒪?????뚮뜑 (7?꾨옯 怨좎젙 ?뺤쟻 酉? ?????????????????????
// startFret ~ startFret+6 援ш컙??100% ?덈퉬 ?덉뿉 ?뺤쟻 ?뚮뜑
function renderTestNeck(startFret) {
  const neckEl = document.getElementById('test-fb-full-neck');
  const numsEl = document.getElementById('test-fb-full-nums');
  if (!neckEl || !numsEl) return;

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  const showNut    = startFret <= 0;
  const nutLeftPct = showNut ? (1 - startFret) / FRETS_VISIBLE * 100 : 0;

  // ?? 以?????
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px; left:${showNut ? nutLeftPct : 0}%;`;
    neckEl.appendChild(el);
  }

  // ?? ????
  if (showNut) {
    const nutEl = document.createElement('div');
    nutEl.className = 'fb-nut-line';
    nutEl.style.left = `${nutLeftPct}%`;
    neckEl.appendChild(nutEl);
  }

  // ?? ?꾨옯 ??(媛???寃쎄퀎) ??
  for (let col = 1; col < FRETS_VISIBLE; col++) {
    const leftPct = col / FRETS_VISIBLE * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ?? 媛?대뱶 ?꾪듃 & ?꾨옯 踰덊샇 ??
  for (let col = 0; col < FRETS_VISIBLE; col++) {
    const fretNum = startFret + col;
    if (fretNum < 0) continue;
    const cx = (col + 0.5) / FRETS_VISIBLE * 100;

    if (SINGLE_DOT_FRETS.has(fretNum)) {
      const dot = document.createElement('div');
      dot.className = 'fb-dot';
      dot.style.cssText = `left:${cx}%; top:50%;`;
      neckEl.appendChild(dot);
      const num = document.createElement('div');
      num.className = 'fb-fret-num';
      num.style.left = `${cx}%`;
      num.textContent = fretNum;
      numsEl.appendChild(num);
    } else if (DOUBLE_DOT_FRETS.has(fretNum)) {
      [33, 67].forEach(y => {
        const dot = document.createElement('div');
        dot.className = 'fb-dot';
        dot.style.cssText = `left:${cx}%; top:${y}%;`;
        neckEl.appendChild(dot);
      });
      const num = document.createElement('div');
      num.className = 'fb-fret-num';
      num.style.left = `${cx}%`;
      num.textContent = fretNum;
      numsEl.appendChild(num);
    }
  }

  // 媛쒕갑?꾩씠 蹂댁씠??寃쎌슦: 媛?以꾩뿉 ?먮┛ 鍮꾪솢????諛곗튂 (?쒓컖 媛?대뱶)
  if (startFret <= 0) {
    const openCol = -startFret;
    for (let s = 0; s < STRINGS; s++) {
      const leftPct = (openCol + 0.5) / FRETS_VISIBLE * 100;
      const topPct  = (s + 0.5) / STRINGS * 100;
      const el = document.createElement('div');
      el.className = 'fb-open-hint';
      el.dataset.openHint = `${s},${openCol}`;
      el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
      neckEl.appendChild(el);
    }
  }
}

// ?? ?뚯뒪???뚰듃 ?명듃 ?뚮뜑 (洹쇱쓬 1媛? ?????????????????????????
function renderTestNotes() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl || !_testItem) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  const { startFret } = _testItem;
  const hint = findHighestRoot(_testItem.block, startFret);
  if (!hint) return;

  // 7-fret 怨좎젙 酉??꾩튂 怨꾩궛
  const col = hint.absF - startFret;
  _testHint = { s: hint.s, col };  // ??媛?쒖슜 ???
  // ?뚰듃 ?꾩튂??媛쒕갑??鍮꾪솢???먯씠 ?덉쑝硫??④?
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${hint.s},${col}"]`)
        ?.style.setProperty('display', 'none');
  const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct  = (hint.s + 0.5) / STRINGS * 100;
  const isOpen  = hint.absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note fb-note--root' + (isOpen ? ' fb-note--open' : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:auto; cursor:pointer;`;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.classList.add('fb-note--pressed');
  });
  el.addEventListener('pointerup', e => {
    e.stopPropagation();
    el.classList.remove('fb-note--pressed');
    const ripple = document.createElement('span');
    ripple.className = 'fb-note-ripple';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    playScaleNote(hint.s, hint.absF);
  });
  el.addEventListener('pointerleave', () => el.classList.remove('fb-note--pressed'));

  neckEl.appendChild(el);
}

// ?? ?뺣떟 梨꾩젏 ?????????????????????????????????????????????????
function checkAnswer() {
  if (!_testItem || _testSubmitted) return;
  _testSubmitted = true;

  const parsed = ScaleData.parseGrid(_testItem.block.grid);
  const { startFret } = _testItem;

  // ?뚰듃瑜??쒖쇅???뺣떟 ?명듃 set
  const correctSet = new Set();
  parsed.notes.forEach(note => {
    const absF = startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    if (_testHint && note.s === _testHint.s && note.col === _testHint.col) return;
    correctSet.add(`${note.s},${note.col}`);
  });

  // ?뚮젅?댁뼱 dot 梨꾩젏
  let nCorrect = 0;
  _placedNotes.forEach(key => {
    const el = document.getElementById('test-fb-full-neck')
                       ?.querySelector(`.fb-note--placed[data-key="${key}"]`);
    if (!el) return;
    el.classList.remove('fb-note--placed');
    const [ps, pcol] = key.split(',').map(Number);
    const pAbsF = _testItem.startFret + pcol;
    if (correctSet.has(key)) {
      el.classList.add('fb-note--correct');
      nCorrect++;
    } else {
      el.classList.add('fb-note--wrong');
    }
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.addEventListener('pointerup', () => { if (pAbsF >= 0) playScaleNote(ps, pAbsF); });
  });

  // ?꾨씫???뺣떟 ?쒖떆
  const neckEl = document.getElementById('test-fb-full-neck');
  correctSet.forEach(key => {
    if (_placedNotes.has(key)) return;
    const [s, col] = key.split(',').map(Number);
    const absF    = _testItem.startFret + col;
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (s  + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-note fb-note--missed';
    el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:auto; cursor:pointer;`;
    el.addEventListener('pointerup', () => { if (absF >= 0) playScaleNote(s, absF); });
    neckEl?.appendChild(el);
  });

  // 寃곌낵 ?쒖떆
  const scoreEl  = document.getElementById('test-result-score');
  const detailEl = document.getElementById('test-result-detail');
  if (scoreEl)  scoreEl.textContent  = `${nCorrect} / ${correctSet.size}`;
  if (detailEl) detailEl.textContent = `정답 ${nCorrect}개`;

  document.getElementById('test-result-row')?.classList.add('is-visible');

  // 踰꾪듉 ???ㅼ떆 ?湲?+ ?뚯븘媛湲??쒖떆
  const btn = document.getElementById('test-submit-btn');
  if (btn) btn.textContent = '다시 풀기';
  document.getElementById('test-back-btn')?.classList.add('is-visible');
}

// ?? ?뚯뒪???쒖옉 ???????????????????????????????????????????????
function startTest() {
  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // ?곹깭 珥덇린??  clearTestDots();
  _testHint      = null;
  _testSubmitted = false;

  // ?쒕뜡 釉붾윮 ?좏깮
  _testItem = seq[Math.floor(Math.random() * seq.length)];

  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;

  // 7-fret ?뺤쟻 酉??뚮뜑 (?ㅽ겕濡?遺덊븘??
  renderTestNeck(_testItem.startFret);
  renderTestNotes();

  // 寃곌낵 珥덇린??  document.getElementById('test-result-row')?.classList.remove('is-visible');
  const btn = document.getElementById('test-submit-btn');
  if (btn) btn.textContent = '제출하기';
  document.getElementById('test-back-btn')?.classList.remove('is-visible');

  // 吏덈Ц ?띿뒪??珥덇린??(?좊땲硫붿씠???ъ떎??以鍮?
  const qEl = document.getElementById('test-question-text');
  if (qEl) {
    const formName = FORM_NAMES[_testItem.bi] ?? (_testItem.bi + 1 + '번폼');
    qEl.innerHTML = `${names[_rootNote]} ${SCALE_TITLES[_scaleKey]}의<br>${formName}을 입력해주세요!`;
    qEl.classList.remove('test-question--in');
    void qEl.offsetWidth; // reflow ???좊땲硫붿씠??由ъ뀑
  }

  // ?ㅻ쾭?덉씠 ?ㅽ뵂
  const overlay = document.getElementById('scale-test-overlay');
  if (overlay) overlay.classList.add('is-open');

  setTimeout(() => {
    qEl?.classList.add('test-question--in');
  }, 800);
}

// ?? ?뚮젅?댁뼱 dot 1媛?異붽? ????????????????????????????????????
function addTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  const [s, col] = key.split(',').map(Number);
  const leftPct  = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct   = (s  + 0.5) / STRINGS * 100;

  // 媛쒕갑??鍮꾪솢?????④?
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)
        ?.style.setProperty('display', 'none');

  const el = document.createElement('div');
  el.className = 'fb-note fb-note--placed';
  el.dataset.key = key;
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.classList.add('fb-note--pressed');
  });
  el.addEventListener('pointerup', e => {
    e.stopPropagation();
    removeTestDot(key);
  });
  el.addEventListener('pointerleave', () => el.classList.remove('fb-note--pressed'));

  neckEl.appendChild(el);
}

// ?? ?뚮젅?댁뼱 dot 1媛??쒓굅 ????????????????????????????????????
function removeTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`)?.remove();
  _placedNotes.delete(key);
  // 媛쒕갑??鍮꾪솢????蹂듭썝
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)
        ?.style.removeProperty('display');
}

// ?? ?꾩껜 placed dot 珥덇린??????????????????????????????????????
function clearTestDots() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (neckEl) {
    neckEl.querySelectorAll('.fb-note--placed').forEach(el => el.remove());
    neckEl.querySelectorAll('.fb-open-hint').forEach(el => el.style.removeProperty('display'));
  }
  _placedNotes.clear();
}

// ?? ?뚯뒪???꾨옯蹂대뱶 ???몃뱾??珥덇린??(DOMContentLoaded ??1?? ?
function initTestTap() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  // pointerdown: ?쒖옉 醫뚰몴 湲곗뼲
  let _tapStartX = 0, _tapStartY = 0;
  neckEl.addEventListener('pointerdown', e => {
    _tapStartX = e.clientX;
    _tapStartY = e.clientY;
  });

  neckEl.addEventListener('pointerup', e => {
    // ?뚰듃 dot??stopPropagation?섎?濡??ш린???꾨떖 ?????????쒕━?꾪듃 泥댄겕留?    const dx = Math.abs(e.clientX - _tapStartX);
    const dy = Math.abs(e.clientY - _tapStartY);
    if (dx > 8 || dy > 8) return;   // ?먭????붾뱾由?臾댁떆
    if (_testSubmitted) return;      // ?쒖텧 ???낅젰 遺덇?

    const rect = neckEl.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left) / rect.width  * FRETS_VISIBLE);
    const s    = Math.floor((e.clientY - rect.top)  / rect.height * STRINGS);

    if (col < 0 || col >= FRETS_VISIBLE || s < 0 || s >= STRINGS) return;

    // ?뚰듃 ?꾩튂??臾댁떆
    if (_testHint && _testHint.s === s && _testHint.col === col) return;

    const key = `${s},${col}`;
    if (_placedNotes.has(key)) {
      removeTestDot(key);
    } else {
      _placedNotes.add(key);
      addTestDot(key);
      const absF = _testItem.startFret + col;
      if (absF >= 0) playScaleNote(s, absF);
    }
  });
}

// ?? ???덉씠釉??낅뜲?댄듃 ???????????????????????????????????????
function updateFormLabel() {
  const el = document.getElementById('form-label');
  if (!el) return;
  const seq = buildNavSequence();
  if (seq.length === 0) { el.textContent = ''; return; }
  const { bi } = seq[_navIdx];
  const title = SCALE_TITLES[_scaleKey] || _scaleKey;
  el.textContent = `${title} ${FORM_NAMES[bi] ?? (bi + 1 + '踰덊뤌')}`;
}

// ?? 釉붾윮 ?몃뵒耳?댄꽣 ?낅뜲?댄듃 ?????????????????????????????????
function updateBlockIndicator() {
  const el = document.getElementById('block-indicator');
  if (!el) return;

  const seq = buildNavSequence();
  el.innerHTML = '';
  seq.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'block-dot' + (i === _navIdx ? ' block-dot--active' : '');
    dot.addEventListener('pointerup', () => {
      _navIdx = i;
      renderNotes();
      updateFormLabel();
      updateBlockIndicator();
    });
    el.appendChild(dot);
  });
}

// ?? ?붿궡??踰꾪듉 (?쒗???대룞) ????????????????????????????????
function initArrows() {
  document.getElementById('fb-arrow-prev')?.addEventListener('pointerup', () => {
    const seq = buildNavSequence();
    if (seq.length <= 1) return;
    _navIdx = (_navIdx - 1 + seq.length) % seq.length;
    renderNotes();
    updateFormLabel();
    updateBlockIndicator();
  });

  document.getElementById('fb-arrow-next')?.addEventListener('pointerup', () => {
    const seq = buildNavSequence();
    if (seq.length <= 1) return;
    _navIdx = (_navIdx + 1) % seq.length;
    renderNotes();
    updateFormLabel();
    updateBlockIndicator();
  });
}

// ?? ??踰꾪듉 ?덉씠釉?媛깆떊 ??????????????????????????????????????
function updateKeyLabels() {
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  document.querySelectorAll('.key-btn').forEach((btn, i) => {
    btn.textContent = names[i];
  });
}

// ?? ???뚮옯 ?좉? ?????????????????????????????????????????????
function initAccidentalToggle() {
  const toggle    = document.getElementById('accidental-toggle');
  const sharpSpan = document.getElementById('toggle-sharp');
  const flatSpan  = document.getElementById('toggle-flat');
  if (!toggle) return;

  toggle.addEventListener('pointerup', () => {
    _useFlat = !_useFlat;
    sharpSpan.classList.toggle('toggle-opt--active', !_useFlat);
    flatSpan.classList.toggle('toggle-opt--active',   _useFlat);
    updateKeyLabels();
  });
}

// ?? ???좏깮 UI ????????????????????????????????????????????????
function initKeySelector() {
  const el = document.getElementById('key-selector');
  if (!el) return;

  KEY_NAMES.forEach((name, semitone) => {
    const btn = document.createElement('button');
    btn.className = 'key-btn' + (semitone === _rootNote ? ' key-btn--active' : '');
    btn.textContent = name;
    btn.addEventListener('pointerup', () => {
      _rootNote = semitone;
      _navIdx   = 0;   // ??諛붽씀硫?泥?踰덉㎏ ?ъ??섏쑝濡?由ъ뀑
      el.querySelectorAll('.key-btn').forEach(b => b.classList.remove('key-btn--active'));
      btn.classList.add('key-btn--active');
      renderNotes();
      updateFormLabel();
      updateBlockIndicator();
    });
    el.appendChild(btn);
  });
}

// ?? DOMContentLoaded ?????????????????????????????????????????
document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  const params = new URLSearchParams(location.search);
  _scaleKey = params.get('key') || 'major';

renderFullNeck();
  renderNotes(false);        // 珥덇린 ?뚮뜑???좊땲硫붿씠???놁씠 利됱떆 ?대룞
  updateFormLabel();
  updateBlockIndicator();
  initArrows();
  initAccidentalToggle();
  initKeySelector();

  // ?뚯뒪???꾨옯蹂대뱶 ??  initTestTap();

  // ?뚯뒪???쒖옉 踰꾪듉
  document.getElementById('start-test-btn')?.addEventListener('pointerup', () => {
    startTest();
  });

  // ?쒖텧?섍린 / ?ㅼ떆 ?湲?踰꾪듉
  document.getElementById('test-submit-btn')?.addEventListener('pointerup', () => {
    if (_testSubmitted) {
      startTest();
    } else {
      checkAnswer();
    }
  });

  // ?뚯뒪???ㅻ쾭?덉씠 ?リ린 (X 踰꾪듉 / ?뚯븘媛湲?踰꾪듉 怨듯넻)
  const closeTestOverlay = () =>
    document.getElementById('scale-test-overlay')?.classList.remove('is-open');

  document.getElementById('test-close-btn')?.addEventListener('pointerup', closeTestOverlay);
  document.getElementById('test-back-btn')?.addEventListener('pointerup', closeTestOverlay);

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('scale_level_viewed', { key: _scaleKey });
});
