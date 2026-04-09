// ── 캔버스 설정 ──
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

// ── 논리 기준 크기 (4:3, 400×300) ──
const BASE_W     = 400;
const BASE_H     = 300;
const BASE_Y_OFF = 55;   // 코드명 상단 영역
const BASE_MX    = 45;   // 좌우 여백 (오픈/뮤트 포함)
const BASE_MY    = 18;   // 격자 상하 내부 여백
const BASE_TABLE_H = BASE_H - BASE_Y_OFF - 40; // 하단 여백 40
const STRINGS    = 6;
const FRETS      = 4;

let RATIO = 1;

const r  = () => RATIO;
const W  = () => Math.round(BASE_W       * r());
const CH = () => Math.round(BASE_H       * r());
const TH = () => Math.round(BASE_TABLE_H * r());
const YO = () => Math.round(BASE_Y_OFF   * r());
const MX = () => Math.round(BASE_MX      * r());
const MY = () => Math.round(BASE_MY      * r());
const TL = () => MX();
const TR = () => W() - MX();
const TT = () => YO() + MY();
const TB = () => YO() + TH() - MY();
const FW = () => (TR() - TL()) / FRETS;
const SH = () => (TB() - TT()) / (STRINGS - 1);
const DS = () => Math.round(SH() * 0.85);

function resizeCanvas() {
  const availW = canvas.parentElement.clientWidth || BASE_W;
  RATIO = availW / BASE_W; // 화면에 꽉 차도록 (max 제한 없음)
  canvas.width  = W();
  canvas.height = CH();
  draw();
}

// ── 이미지 로드 ──
const IMAGES = {};
const IMAGE_LIST = [
  'root_t','root1','root2','root3','root4',
  'common_t','common1','common2','common3','common4',
  'barre_two','barre_three','barre_four','barre_five','barre_six',
  'open','open_root','mute'
];
const BARRE_KEYS = { 2:'barre_two', 3:'barre_three', 4:'barre_four', 5:'barre_five', 6:'barre_six' };

let loadedCount = 0;
IMAGE_LIST.forEach(key => {
  const img = new Image();
  img.src = `image/${key}.png`;
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) resizeCanvas(); };
  IMAGES[key] = img;
});

// ── 코드명 상태 ──
const ROOTS_SHARP = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const ROOTS_FLAT  = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];

let accidental      = 'sharp';
let selectedRoot    = 'A';
let selectedTriad   = '';
let selectedSeventh = '';
let selectedFunc    = '';
let selectedTensions = [];
let selectedBass    = '';

function renderBtnGroup(groupId, items, getCurrent, onSelect, noneLabel) {
  const group = document.getElementById(groupId);
  group.innerHTML = '';
  if (noneLabel !== undefined) {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (getCurrent() === '' ? ' active' : '');
    btn.textContent = noneLabel;
    btn.onclick = () => { onSelect(''); updateChordDisplay(); };
    group.appendChild(btn);
  }
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (item === getCurrent() ? ' active' : '');
    btn.textContent = item;
    btn.onclick = () => { onSelect(item); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

function renderRootBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  if (!roots.includes(selectedRoot)) selectedRoot = roots[0];
  renderBtnGroup('root-group', roots, () => selectedRoot, v => { selectedRoot = v; renderRootBtns(); });
}

function renderBassBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  renderBtnGroup('bass-group', roots, () => selectedBass, v => { selectedBass = v; renderBassBtns(); }, '없음');
}

function setAccidental(mode) {
  accidental = mode;
  document.getElementById('acc-sharp').classList.toggle('active', mode === 'sharp');
  document.getElementById('acc-flat').classList.toggle('active', mode === 'flat');
  renderRootBtns();
  renderBassBtns();
  updateChordDisplay();
}

function selectTriad(val) {
  selectedTriad = val;
  document.querySelectorAll('#triad-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? 'M' : val)));
  updateChordDisplay();
}

function selectSeventh(val) {
  selectedSeventh = val;
  document.querySelectorAll('#seventh-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val)));
  updateChordDisplay();
}

function selectFunc(val) {
  selectedFunc = val;
  document.querySelectorAll('#func-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val === 'b5' ? '(b5)' : val)));
  updateChordDisplay();
}

function toggleTension(val) {
  const idx = selectedTensions.indexOf(val);
  idx !== -1 ? selectedTensions.splice(idx, 1) : selectedTensions.push(val);
  document.querySelectorAll('#tension-group .sel-btn').forEach(b =>
    b.classList.toggle('active', selectedTensions.includes(b.textContent)));
  updateChordDisplay();
}

function buildChordName() {
  let n = selectedRoot + selectedTriad + selectedSeventh + selectedFunc;
  if (selectedTensions.length) n += '(' + selectedTensions.join(',') + ')';
  if (selectedBass) n += '/' + selectedBass;
  return n;
}

function buildChordHTML() {
  let n = selectedRoot + selectedTriad + selectedSeventh;
  if (selectedFunc === 'b5') n += '<sup>(b5)</sup>';
  else if (selectedFunc) n += selectedFunc;
  if (selectedTensions.length) n += '<sup>(' + selectedTensions.join(',') + ')</sup>';
  if (selectedBass) n += '/' + selectedBass;
  return n;
}

function updateChordDisplay() {
  document.getElementById('chord-display').innerHTML = buildChordHTML();
  draw();
}

// ── 편집 상태 ──
let selectedFinger  = 1;
let fingerNumMode   = false;

function toggleFingerNum() {
  fingerNumMode = !fingerNumMode;
  document.getElementById('btn-finger-num').classList.toggle('active', fingerNumMode);
  document.getElementById('finger-group').style.opacity = fingerNumMode ? '1' : '0.35';
  draw();
}
let dots        = [];
let barreActive = {};
let openMute    = new Array(STRINGS).fill('open');
let rootMode    = false;
let rootIndex   = -1;

function calcRootIndex() {
  const dotMaxS  = dots.length ? Math.max(...dots.map(d => d.s)) : -1;
  const openMaxS = openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

function toggleRootMode() {
  rootMode = !rootMode;
  document.getElementById('btn-root').classList.toggle('active', rootMode);
  rootIndex = rootMode ? calcRootIndex() : -1;
  draw();
}

function selectFinger(n) {
  selectedFinger = n;
  document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('f' + n).classList.add('selected');
}

function resetAll() {
  dots        = [];
  barreActive = {};
  openMute    = new Array(STRINGS).fill('open');
  draw();
}

function getBarreFrets() {
  const count = {};
  dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[f] >= 2).map(Number);
}

function getDotImgKey(n, isRoot) {
  if (!fingerNumMode) return isRoot ? 'open_root' : 'open';
  return (isRoot ? 'root' : 'common') + (n === 0 ? '_t' : String(n));
}

// ── 렌더링 ──
function drawCanvas(c, ratio) {
  const w   = Math.round(BASE_W       * ratio);
  const ch  = Math.round(BASE_H       * ratio);
  const th  = Math.round(BASE_TABLE_H * ratio);
  const yo  = Math.round(BASE_Y_OFF   * ratio);
  const mx  = Math.round(BASE_MX      * ratio);
  const my  = Math.round(BASE_MY      * ratio);
  const tl  = mx;
  const tr  = w - mx;
  const tt  = yo + my;
  const tb  = yo + th - my;
  const fw  = (tr - tl) / FRETS;
  const sh  = (tb - tt) / (STRINGS - 1);
  const ds  = Math.round(sh * 0.85);
  const sc  = w / BASE_W;

  c.clearRect(0, 0, w, ch);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, ch);

  // 너트
  c.strokeStyle = '#000000';
  c.lineWidth = Math.max(1, 3 * sc);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(tl, tt); c.lineTo(tl, tb); c.stroke();

  // 프렛선
  c.strokeStyle = '#2a2a2a';
  c.lineWidth = Math.max(0.5, sc);
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

  // 오픈/뮤트 (dot이 있는 줄은 표시 안 함)
  openMute.forEach((v, s) => {
    if (dots.some(d => d.s === s)) return;
    const y   = tt + s * sh;
    const x   = tl - 24 * sc;
    const key = v === 'mute' ? 'mute' : (rootMode && s === rootIndex) ? 'open_root' : 'open';
    if (IMAGES[key]) c.drawImage(IMAGES[key], x - ds/2, y - ds/2, ds, ds);
  });

  // barre
  const barreFrets = getBarreFrets();
  barreFrets.forEach(f => {
    if (!barreActive[f]) return;
    const same  = dots.filter(d => d.f === f);
    const minS  = Math.min(...same.map(d => d.s));
    const maxS  = Math.max(...same.map(d => d.s));
    const key   = BARRE_KEYS[maxS - minS + 1];
    if (!key || !IMAGES[key]) return;
    const x = tl + (f - 0.5) * fw;
    const y = tt + minS * sh;
    c.drawImage(IMAGES[key], x - ds/2, y - ds/2, ds, sh * (maxS - minS) + ds);
  });

  // dot
  dots.forEach(d => {
    if (barreActive[d.f] && barreFrets.includes(d.f)) return;
    const key = getDotImgKey(d.n, rootMode && d.s === rootIndex);
    if (!IMAGES[key]) return;
    c.drawImage(IMAGES[key], tl + (d.f - 0.5)*fw - ds/2, tt + d.s*sh - ds/2, ds, ds);
  });

  // 코드명
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, tt - ds/2);
  c.fillStyle = '#1a1714';
  c.textBaseline = 'alphabetic';

  const bSize = Math.round(36 * sc);
  const sSize = Math.round(20 * sc);
  const bY    = yo - Math.round(4 * sc);
  const sY    = bY - Math.round(14 * sc);

  let cx = tl;
  const base = selectedRoot + selectedTriad + selectedSeventh + (selectedFunc === 'b5' ? '' : selectedFunc);
  c.font = `400 ${bSize}px "Times New Roman", serif`;
  c.fillText(base, cx, bY);
  cx += c.measureText(base).width;

  if (selectedFunc === 'b5') {
    c.font = `400 ${sSize}px "Times New Roman", serif`;
    c.fillText('(b5)', cx, sY);
    cx += c.measureText('(b5)').width;
  }

  if (selectedTensions.length) {
    const ts = '(' + selectedTensions.join(',') + ')';
    c.font = `400 ${sSize}px "Times New Roman", serif`;
    c.fillText(ts, cx, sY);
    cx += c.measureText(ts).width;
  }

  if (selectedBass) {
    c.font = `400 ${bSize}px "Times New Roman", serif`;
    c.fillText('/' + selectedBass, cx, bY);
  }

  // 프렛 번호
  const fretNum = (document.getElementById('fret-number')?.value || '').trim();
  if (fretNum) {
    c.font = `400 ${Math.round(14 * sc)}px "Times New Roman", serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(fretNum, tl + 1.5 * fw, tb + Math.round(8 * sc));
  }

  c.restore();
}

function draw() {
  drawCanvas(ctx, RATIO);
  updateBarreBtns();
}

// ── 바레 버튼 ──
function updateBarreBtns() {
  const container = document.getElementById('barre-btns');
  container.innerHTML = '';
  getBarreFrets().forEach(f => {
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const left = TL() + (f - 0.5) * FW() - 12;
    const top  = TT() - DS() - 16;
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:24px;height:24px;
      border-radius:50%;border:1.5px solid #888;
      background:${barreActive[f] ? '#1a1714' : '#fff'};
      color:${barreActive[f] ? '#fff' : '#888'};
      font-size:11px;font-family:'Pretendard',sans-serif;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
    btn.onclick = () => { barreActive[f] = !barreActive[f]; draw(); };
    container.appendChild(btn);
  });
}

// ── 클릭 처리 ──
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W() / rect.width);
  const my = (e.clientY - rect.top)  * (CH() / rect.height);
  const si = Math.round((my - TT()) / SH());
  if (si < 0 || si > STRINGS - 1) return;

  // 오픈/뮤트 영역
  if (mx >= TL() - 50 && mx < TL()) {
    const hasDot = dots.some(d => d.s === si);
    if (hasDot) {
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
    } else {
      openMute[si] = openMute[si] === 'mute' ? 'open' : 'mute';
    }
    if (rootMode) rootIndex = calcRootIndex();
    draw(); return;
  }

  if (mx < TL() || mx > TR() + 5) return;

  const fi = Math.floor((mx - TL()) / FW()) + 1;
  if (fi < 1 || fi > FRETS) return;

  const idx = dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    dots.splice(idx, 1);
    openMute[si] = 'open';
  } else {
    dots = dots.filter(d => d.s !== si);
    openMute[si] = 'open';
    dots.push({ s: si, f: fi, n: selectedFinger });
  }
  if (rootMode) rootIndex = calcRootIndex();
  draw();
});

// ── PNG 저장 ──
// 배율 옵션: 0.5=200×150, 1=400×300, 2=800×600(잠금), 3=1200×900(잠금)
async function savePNG() {
  const select = document.getElementById('export-scale');
  const scale  = parseFloat(select.value);

  const exp = document.createElement('canvas');
  exp.width  = Math.round(BASE_W * scale);
  exp.height = Math.round(BASE_H * scale);
  const ec = exp.getContext('2d');
  ec.scale(scale, scale);
  drawCanvas(ec, 1); // ratio=1 기준으로 그린 후 scale 적용

  const base64  = exp.toDataURL('image/png').split(',')[1];
  const fileName = buildChordName() + '_chord.png';

  // Capacitor 환경 감지
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Media } = window.Capacitor.Plugins;

      const tempResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: 'CACHE',
        recursive: true,
      });

      const permStatus = await Media.checkPermissions();
      const isGranted = permStatus.photos === 'granted' ||
                        permStatus.publicStorage === 'granted' ||
                        permStatus.publicStorage13Plus === 'granted';

      if (!isGranted) {
        const reqStatus = await Media.requestPermissions();
        const isReqGranted = reqStatus.photos === 'granted' ||
                             reqStatus.publicStorage === 'granted' ||
                             reqStatus.publicStorage13Plus === 'granted';
        if (!isReqGranted) {
          alert('갤러리 접근 권한이 필요합니다.');
          return;
        }
      }

      let albumId = null;
      try {
        const { albums } = await Media.getAlbums();
        const existing = albums.find(a => a.name === 'Chorditor');
        if (existing) {
          albumId = existing.identifier;
        } else {
          await Media.createAlbum({ name: 'Chorditor' });
          const { albums: newAlbums } = await Media.getAlbums();
          const created = newAlbums.find(a => a.name === 'Chorditor');
          if (created) albumId = created.identifier;
        }
      } catch(e) {
        console.log('앨범 처리 실패, 기본 갤러리 사용:', e);
      }

      const saveOpts = { path: tempResult.uri };
      if (albumId) saveOpts.albumIdentifier = albumId;
      await Media.savePhoto(saveOpts);

      await Filesystem.deleteFile({ path: fileName, directory: 'CACHE' });
      alert('갤러리에 저장되었습니다.');
    } catch (e) {
      console.error('저장 실패:', e);
      alert('저장 실패: ' + JSON.stringify(e));
    }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ── 리사이즈 ──
window.addEventListener('resize', resizeCanvas);

// ── 초기화 ──
renderRootBtns();
renderBassBtns();
updateChordDisplay();
document.getElementById('finger-group').style.opacity = fingerNumMode ? '1' : '0.35';

// ── Audio Engine (Karplus-Strong) ──
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const renderedCache = {};
let activeSources = [];

const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // s=0(E4) ~ s=5(E2)

const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

async function renderKarplusStrong(freq, duration) {
  const sr = 44100;
  const total = Math.round(sr * duration);
  const offline = new OfflineAudioContext(1, total, sr);
  const N = Math.round(sr / freq);
  const d = new Float32Array(total);
  const delay = new Float32Array(N);

  const decay = 1 - (0.5 / (N * 2));

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

async function getBuffer(freq, duration) {
  const key = freq.toFixed(2);
  if (!renderedCache[key]) renderedCache[key] = await renderKarplusStrong(freq, duration);
  return renderedCache[key];
}

function onFretInput(el) {
  const v = parseInt(el.value);
  if (isNaN(v) || v < 2 || v > 18) { el.value = el.dataset.last || 2; return; }
  el.dataset.last = v;
  draw();
}

function calcActualFret(f) {
  const input = parseInt(document.getElementById('fret-number')?.value) || 2;
  return (input - 2) + f;
}

function calcStringNotes() {
  const notes = [];
  for (let s = 0; s < STRINGS; s++) {
    if (openMute[s] === 'mute') continue;
    const dot = dots.find(d => d.s === s);
    const midi = OPEN_MIDI[s] + (dot ? calcActualFret(dot.f) : 0);
    notes.push({ s, midi });
  }
  return notes;
}

async function strumChord() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
  activeSources = [];

  const notes = calcStringNotes().sort((a, b) => b.s - a.s);
  if (!notes.length) return;

  const DURATION = 2.5;
  const INTERVAL = 0.075;
  const now = audioCtx.currentTime + 0.05;

  const buffers = await Promise.all(notes.map(n => getBuffer(midiToFreq(n.midi), DURATION)));
  buffers.forEach((buf, i) => {
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(now + i * INTERVAL);
    activeSources.push(src);
  });
}
