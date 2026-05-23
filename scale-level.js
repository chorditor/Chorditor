// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// scale-level.js ???ㅼ????덈꺼 ?덈젴 ?섏씠吏
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// ?? ?곸닔 ????????????????????????????????????????????????????
const SCALE_TITLES = {
  'major':          '메이저 스케일',
  'pentatonic':     '마이너 펜타토닉 스케일',
  'blues':          '마이너 블루스 스케일',
  'natural-minor':  '내추럴 마이너 스케일',
  'harmonic-minor': '하모닉 마이너 스케일',
  'mixolydian':     '믹솔리디안 스케일',
};

const SCALE_SHORT_NAMES = {
  'major':          '메이저',
  'pentatonic':     '마이너 펜타토닉',
  'blues':          '마이너 블루스',
  'natural-minor':  '내추럴 마이너',
  'harmonic-minor': '하모닉 마이너',
  'mixolydian':     '믹솔리디안',
};

const FORM_NAMES       = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼'];
// Ch.2 secondary-iv: 원폼(bi) → 짝궁폼(bi) 매핑 (4도 메이저 전환)
const PAIR_PARTNER_BI  = { 0: 3, 1: 4, 2: 0, 3: 1, 4: 2 };
// bi별 짝궁폼의 startFret 오프셋 (짝궁_startFret = cur.startFret + offset)
// G폼(bi=1)↔C폼만 +1, 나머지는 동일
const PAIR_STARTFRET_OFFSET = { 1: 1 };
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

let _shuffleBag = null;  // ShuffleBag 인스턴스 — lazy 초기화
let _scaleSessionStart = 0; // 페이지 진입 시각 (훈련 시간 측정)

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
  // Ch.2: secondary-iv는 major 블럭 사용
  const blockKey = _scaleKey === 'secondary-iv' ? 'major' : _scaleKey;
  const blocks = ScaleData.getBlocks(blockKey);
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

// ================================================================
// Ch.2 C폼 -> E폼 전환 애니메이션
// ================================================================
let _transitioning = false;
let _pairTransitioned = false; // 전환 버튼으로 짝궁 폼으로 이동한 상태

// Ch.2: 현재 _pairTransitioned 상태 기준으로 파트너 블럭을 ghost로 렌더
// _pairTransitioned=false → 파트너폼(전환 대상) ghost 표시
// _pairTransitioned=true  → 원래폼(복구 대상) ghost 표시
function _refreshSecondaryGhost() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;
  neckEl.querySelectorAll('.fb-note--ghost').forEach(el => el.remove());

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;

  const offset     = PAIR_STARTFRET_OFFSET[cur.bi] || 0;
  // 전환 전: 파트너폼을 실제 startFret(+offset)으로 ghost 표시
  // 전환 후: 원폼을 실제 startFret(offset 없음)으로 ghost 표시
  const ghostStartFret = _pairTransitioned ? cur.startFret : cur.startFret + offset;
  const ghostBi    = _pairTransitioned ? cur.bi : PAIR_PARTNER_BI[cur.bi];
  const ghostBlock = ScaleData.getBlocks('major')[ghostBi];
  if (!ghostBlock) return;

  const parsed    = ScaleData.parseGrid(ghostBlock.grid);
  const firstReal = neckEl.querySelector('.fb-note:not(.fb-note--ghost)');
  parsed.notes.forEach(note => {
    const absF = ghostStartFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    neckEl.insertBefore(createNoteEl(absF, note.s, note.degree, true), firstReal || null);
  });
}

// 전환 완료 공통 마무리 — 상태 저장 + 버튼 라벨 + 폼 라벨 + ghost 갱신 + 뷰포트 + 잠금 해제
function _finishTransition(forward) {
  _pairTransitioned = forward;
  updateFormLabel();
  _refreshSecondaryGhost();
  _transitioning = false;
}

function _applyDegMap(neckEl, degMap) {
  neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
    const nd = degMap[el.dataset.s + ',' + el.dataset.degree];
    if (nd !== undefined) {
      el.dataset.degree = nd;
      el.classList.toggle('fb-note--root', nd === 1);
      if (nd === 1) {
        el.classList.add('fb-note--root-pop');
        setTimeout(() => el.classList.remove('fb-note--root-pop'), 400);
      }
    }
  });
}

function _spawnNote(neckEl, absF, s, degree) {
  const newEl = createNoteEl(absF, s, degree, false);
  newEl.style.opacity   = '0';
  newEl.style.transform = 'translate(-50%, -50%) scale(0)';
  newEl.style.transition = 'opacity 200ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)';
  neckEl.appendChild(newEl);
  void newEl.offsetHeight;
  newEl.style.opacity   = '1';
  newEl.style.transform = 'translate(-50%, -50%) scale(1)';
}

function transitionPair() {
  if (_transitioning) return;
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;
  const bi = cur.bi;

  const activeEls = [...neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)')];
  if (!activeEls.length) return;

  const DURATION = 350;
  _transitioning = true;

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── C폼 (bi=4) ↔ E폼 ──────────────────────────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → E폼
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':7,'0,4':1,'0,5':2,
          '1,1':5,'1,2':6,
          '2,5':2,'2,6':3,
          '3,2':6,'3,3':7,'3,4':1,
          '4,6':3,'4,4':4,'4,1':5,
          '5,3':7,'5,4':1,'5,5':2,
        });
        _spawnNote(neckEl, cur.startFret + 4, 2, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // E폼 → C폼
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,7':3,'0,1':4,'0,2':5,
          '1,5':1,'1,6':2,
          '2,2':5,'2,3':6,
          '3,6':2,'3,7':3,'3,1':4,
          '4,3':6,'4,7':7,'4,5':1,
          '5,7':3,'5,1':4,'5,2':5,
        });
        _spawnNote(neckEl, cur.startFret + 1, 1, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── A폼 (bi=0) ↔ D폼 ──────────────────────────────────────────
  } else if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → D폼
      // 5번줄(s=4) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=7 → 왼쪽 1프렛 슬라이드, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 4 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':2, '0,6':3,
          '1,2':6, '1,3':7, '1,4':1,
          '2,6':3, '2,1':5,
          '3,3':7, '3,4':1, '3,5':2,
          '4,1':5, '4,2':6,
          '5,5':2, '5,6':3,
        });
        // 6번줄(s=5) degree=6 오른쪽에 degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 5, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // D폼 → A폼 (역전환)
      // 6번줄(s=5) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=4 → 오른쪽 1프렛 슬라이드, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 5 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':5, '0,3':6,
          '1,6':2, '1,7':3, '1,1':4,
          '2,3':6, '2,5':1,
          '3,7':3, '3,1':4, '3,2':5,
          '4,5':1, '4,6':2,
          '5,2':5, '5,3':6,
        });
        // 5번줄(s=4) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 4, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── G폼 (bi=1) ↔ C폼 ──────────────────────────────────────────
  } else if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → C폼
      // 3번줄(s=2) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      // 6번줄(s=5) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':3, '0,1':5,
          '1,3':7, '1,4':1, '1,5':2,
          '2,1':5, '2,2':6,
          '3,5':2, '3,6':3,
          '4,2':6, '4,3':7, '4,4':1,
          '5,6':3, '5,1':5,
        });
        // 4번줄(s=3) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 3, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // C폼 → G폼 (역전환)
      // 4번줄(s=3) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 1번줄(s=0) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      // 6번줄(s=5) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 3 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':6, '0,5':1,
          '1,7':3, '1,1':4, '1,2':5,
          '2,5':1, '2,6':2,
          '3,2':5, '3,3':6,
          '4,6':2, '4,7':3, '4,1':4,
          '5,3':6, '5,5':1,
        });
        // 3번줄(s=2) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 2, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── E폼 (bi=2) ↔ A폼 ──────────────────────────────────────────
  } else if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → A폼
      // 1번줄(s=0), 6번줄(s=5) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        if ((s === 0 || s === 5) && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,1':5, '0,2':6,
          '1,5':2, '1,6':3,
          '2,2':6, '2,3':7, '2,4':1,
          '3,6':3, '3,1':5,
          '4,3':7, '4,4':1, '4,5':2,
          '5,1':5, '5,2':6,
        });
        // 2번줄(s=1) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 1, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // A폼 → E폼 (역전환)
      // 2번줄(s=1) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 4번줄(s=3) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':1, '0,6':2,
          '1,2':5, '1,3':6,
          '2,6':2, '2,7':3, '2,1':4,
          '3,3':6, '3,5':1,
          '4,7':3, '4,1':4, '4,2':5,
          '5,5':1, '5,6':2,
        });
        // 1번줄(s=0), 6번줄(s=5) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── D폼 (bi=3) ↔ G폼 ──────────────────────────────────────────
  } else if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → G폼
      // 4번줄(s=3) degree=7 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 3 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,2':6, '0,3':7,
          '1,6':3, '1,1':5,
          '2,3':7, '2,4':1, '2,5':2,
          '3,1':5, '3,2':6,
          '4,5':2, '4,6':3,
          '5,2':6, '5,3':7, '5,4':1,
        });
        // 1번줄(s=0) degree=1 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 0, 1);
        // 5번줄(s=4) degree=4 생성 (startFret+5)
        _spawnNote(neckEl, cur.startFret + 5, 4, 4);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // G폼 → D폼 (역전환)
      // 1번줄(s=0) degree=1, 5번줄(s=4) degree=4 페이드 아웃 (삭제)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 && d === 1) || (s === 4 && d === 4)) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 2번줄(s=1) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':2, '0,7':3,
          '1,3':6, '1,5':1,
          '2,7':3, '2,1':4, '2,2':5,
          '3,5':1, '3,6':2,
          '4,2':5, '4,3':6,
          '5,6':2, '5,7':3, '5,1':4,
        });
        // 4번줄(s=3) degree=7 생성 (startFret+1)
        _spawnNote(neckEl, cur.startFret + 1, 3, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }

  } else {
    // 미구현 폼: 즉시 해제
    _transitioning = false;
  }
}

function closeScaleLevel() {
  _recordScaleSessionTime();
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
  const isBlue5 = degree === -5;
  const isNat7  = degree === 7 && _scaleKey === 'harmonic-minor';
  const isOpen  = absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note'
    + (isRoot  ? ' fb-note--root'   : '')
    + (isBlue5 ? ' fb-note--blue5'  : '')
    + (isNat7  ? ' fb-note--nat7'   : '')
    + (isOpen  ? ' fb-note--open'   : '')
    + (ghost   ? ' fb-note--ghost'  : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
  el.dataset.s      = s;
  el.dataset.degree = degree;
  el.dataset.absf   = absF;

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
      playScaleNote(s, parseInt(el.dataset.absf));
      _trackBlockPlayed();
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

  // 블록 이동 시 전환 상태 초기화
  _pairTransitioned = false;

  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // ghost 癒쇱? ?뚮뜑 (z-index ??쾶 源붾┝)
  if (_scaleKey === 'secondary-iv') {
    // Ch.2: 전환 대상(짝궁) 블럭을 ghost로 표시 (_pairTransitioned=false이므로 파트너폼)
    _refreshSecondaryGhost();
  } else {
    // Ch.1/3: 인접 블럭 ghost 표시
    seq.forEach((item, i) => {
      if (i === _navIdx) return;
      const parsed = ScaleData.parseGrid(item.block.grid);
      parsed.notes.forEach(note => {
        const absF = item.startFret + note.col;
        if (absF < 0 || absF >= TOTAL_FRETS) return;
        neckEl.appendChild(createNoteEl(absF, note.s, note.degree, true));
      });
    });
  }

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
    const absFret = startFret + col;
    if (showNut ? absFret <= 1 : absFret <= 0) continue;
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

  // Ch.2: 소스폼 ghost + 타겟폼 hint
  if (_scaleKey === 'secondary-iv') {
    _renderTestNotesCh2(neckEl);
    return;
  }

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


// Ch.2 테스트 노트 렌더: 소스폼 ghost만 표시 (hint 없음)
function _renderTestNotesCh2(neckEl) {
  const { bi, startFret, forward } = _testItem;
  const offset       = PAIR_STARTFRET_OFFSET[bi] || 0;
  const partnerBi    = PAIR_PARTNER_BI[bi];
  const srcBi        = forward ? bi : partnerBi;
  const srcStartFret = forward ? startFret : startFret + offset;

  const srcBlock = ScaleData.getBlocks('major')[srcBi];
  if (!srcBlock) return;

  const srcParsed = ScaleData.parseGrid(srcBlock.grid);
  srcParsed.notes.forEach(note => {
    const absF = srcStartFret + note.col;
    const col  = absF - startFret;
    if (col < 0 || col >= FRETS_VISIBLE) return;
    const leftPct = (col + 0.5) / FRETS_VISIBLE * 100;
    const topPct  = (note.s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-note fb-note--ghost';
    el.style.cssText = `left:${leftPct}%; top:${topPct}%; pointer-events:none;`;
    neckEl.appendChild(el);
  });
}
// ?? ?뺣떟 梨꾩젏 ?????????????????????????????????????????????????
function checkAnswer() {
  if (!_testItem || _testSubmitted) return;
  _testSubmitted = true;
  _recordScaleSubmit();


  // Ch.2: 타겟폼 기준으로 정답 set 구성
  const { startFret } = _testItem;
  let _answerBlock = _testItem.block;
  let _answerStartFret = startFret;
  if (_scaleKey === 'secondary-iv') {
    const { bi, forward } = _testItem;
    const offset = PAIR_STARTFRET_OFFSET[bi] || 0;
    const tgtBi = forward ? PAIR_PARTNER_BI[bi] : bi;
    _answerBlock = ScaleData.getBlocks('major')[tgtBi];
    _answerStartFret = forward ? startFret + offset : startFret;
  }
  const parsed = ScaleData.parseGrid(_answerBlock.grid);

  const correctSet = new Set();
  parsed.notes.forEach(note => {
    const absF = _answerStartFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    const col = absF - startFret;
    if (col < 0 || col >= FRETS_VISIBLE) return;
    if (_testHint && note.s === _testHint.s && col === _testHint.col) return;
    correctSet.add(`${note.s},${col}`);
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
    el.addEventListener('pointerup', () => {
      if (pAbsF >= 0) playScaleNote(ps, pAbsF);
      const r = document.createElement('span');
      r.className = 'fb-note-ripple';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
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
    el.addEventListener('pointerup', () => {
      if (absF >= 0) playScaleNote(s, absF);
      const r = document.createElement('span');
      r.className = 'fb-note-ripple';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
    neckEl?.appendChild(el);
  });

  // 寃곌낵 ?쒖떆
  const scoreEl  = document.getElementById('test-result-score');
  const detailEl = document.getElementById('test-result-detail');
  const nPlacedWrong = _placedNotes.size - nCorrect;   // 잘못 찍은 수
  const nMissed      = correctSet.size - nCorrect;      // 안 찍은 정답 수
  const nWrong       = nPlacedWrong + nMissed;          // 총 오답 수
  const _pct = correctSet.size > 0
    ? (nWrong === 0 ? 1 : nCorrect / (correctSet.size + nPlacedWrong))
    : 0;
  const _PERFECT_MSGS = ['완벽해요!', '정확해요!', '맞았어요! 잘하고 있어요.'];
  const _scoreMsg = _pct === 1
    ? _PERFECT_MSGS[Math.floor(Math.random() * _PERFECT_MSGS.length)]
    : _pct >= 0.7
    ? '거의 다 왔어요!'
    : _pct >= 0.4
    ? '아쉬워요...! 다시 도전해보세요!'
    : '조금 더 연습해보아요!';

  if (scoreEl)  scoreEl.textContent  = `오답 ${nWrong}개`;
  if (detailEl) detailEl.textContent = '';

  analytics.track('scale_test_result', {
    scale_key:  _scaleKey,
    root_name:  (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    form:       _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼'),
    bi:         _testItem.bi,
    correct:    nCorrect,
    total:      correctSet.size,
    score_pct:  correctSet.size > 0 ? Math.round(nCorrect / correctSet.size * 100) : 0,
  });

  document.getElementById('test-result-row')?.classList.add('is-visible');

  // 문제 텍스트 재소 사용 — 정답 문구로 교체
  const qEl2 = document.getElementById('test-question-text');
  if (qEl2) {
    qEl2.classList.remove('test-question--in');
    void qEl2.offsetWidth;
    qEl2.textContent = _scoreMsg;
    qEl2.classList.add('test-question--in');
  }

  // 踰꾪듉 ???ㅼ떆 ?湲?+ ?뚯븘媛湲??쒖떆
  const btn = document.getElementById('test-submit-btn');
  if (btn) btn.textContent = '다시 풀기';
  document.getElementById('test-back-btn')?.classList.add('is-visible');
}

// ?? ?뚯뒪???쒖옉 ???????????????????????????????????????????????
function startTest() {
  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // 상태 초기화
  clearTestDots();
  _testHint      = null;
  _testSubmitted = false;

  // 셔플백: 키/스케일 변경 시 새로 생성, 동일 키는 이어서 진행
  const bagKey = `scale-test:${_scaleKey}:${_rootNote}`;
  let bagItems = seq;
  if (_scaleKey === 'secondary-iv') {
    // Ch.2: 각 블럭 × 정방향/역방향 = 2배 아이템
    bagItems = seq.flatMap(item => [
      { ...item, forward: true },
      { ...item, forward: false }
    ]);
  }
  if (!_shuffleBag || _shuffleBag._storageKey !== `shuffle-bag:${bagKey}`) {
    _shuffleBag = new ShuffleBag(bagKey, bagItems);
  }
  _testItem = _shuffleBag.next();

  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;

  // 7-fret ?뺤쟻 酉??뚮뜑 (?ㅽ겕濡?遺덊븘??
  renderTestNeck(_testItem.startFret);
  renderTestNotes();

  const resultRow = document.getElementById('test-result-row');
  if (resultRow) {
    resultRow.classList.remove('is-visible');
    const scoreEl  = resultRow.querySelector('#test-result-score');
    const detailEl = resultRow.querySelector('#test-result-detail');
    if (scoreEl)  scoreEl.textContent  = '';
    if (detailEl) detailEl.textContent = '';
  }
  const btn = document.getElementById('test-submit-btn');
  if (btn) btn.textContent = '제출하기';
  document.getElementById('test-back-btn')?.classList.remove('is-visible');

  // 吏덈Ц ?띿뒪??珥덇린??(?좊땲硫붿씠???ъ떎??以鍮?
  const qEl = document.getElementById('test-question-text');
  if (qEl) {
    let questionHtml;
    if (_scaleKey === 'secondary-iv') {
      const { bi, forward } = _testItem;
      const partnerBi  = PAIR_PARTNER_BI[bi];
      const srcBi      = forward ? bi : partnerBi;
      const tgtBi      = forward ? partnerBi : bi;
      const srcKeyNote = forward ? _rootNote : (_rootNote + 5) % 12;
      const tgtKeyNote = forward ? (_rootNote + 5) % 12 : _rootNote;
      questionHtml = `${names[srcKeyNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[tgtKeyNote]}메이저 ${FORM_NAMES[tgtBi]}으로 전환해보세요!`;
    } else {
      const _lbl = _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼');
      const formName = _lbl.split(' ').pop();
      questionHtml = `${names[_rootNote]} ${SCALE_TITLES[_scaleKey]}의<br>${formName}을 입력해주세요!`;
    }
    qEl.innerHTML = questionHtml;
    qEl.classList.remove('test-question--in');
    void qEl.offsetWidth;
  }

  // ?ㅻ쾭?덉씠 ?ㅽ뵂
  const overlay = document.getElementById('scale-test-overlay');
  if (overlay) overlay.classList.add('is-open');

  // 제출 버튼 비활성화 — 질문 애니메이션 중 입력 ̨차단
  const submitBtn = document.getElementById('test-submit-btn');
  if (submitBtn) submitBtn.disabled = true;
  setTimeout(() => {
    qEl?.classList.add('test-question--in');
  }, 800);
  setTimeout(() => {
    if (submitBtn) submitBtn.disabled = false;
  }, 2000);  // 800ms 딜레이 + 1200ms 애니메이션
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
  document.addEventListener('pointerdown', e => {
    _tapStartX = e.clientX;
    _tapStartY = e.clientY;
  });

  neckEl.addEventListener('pointerup', e => {
    const dx = Math.abs(e.clientX - _tapStartX);
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
  const { block, bi } = seq[_navIdx];

  // Ch.2 secondary-iv: "[Key]메이저 [Form]폼" 형식 (짝궁 전환 시 파트너 키+폼 표시)
  if (_scaleKey === 'secondary-iv') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const partnerKey = (_rootNote + 5) % 12;
      const partnerBi  = PAIR_PARTNER_BI[bi];
      el.textContent = `${names[partnerKey]}메이저 ${FORM_NAMES[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }

  const title = SCALE_TITLES[_scaleKey] || _scaleKey;
  el.textContent = block.label || `${title} ${FORM_NAMES[bi] ?? (bi + 1 + '번폼')}`;
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
    _trackBlockViewed();
  });

  document.getElementById('fb-arrow-next')?.addEventListener('pointerup', () => {
    const seq = buildNavSequence();
    if (seq.length <= 1) return;
    _navIdx = (_navIdx + 1) % seq.length;
    renderNotes();
    updateFormLabel();
    updateBlockIndicator();
    _trackBlockViewed();
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
// ── 훈련 통계 ────────────────────────────────────────────────────
const TRAINING_STATS_KEY = 'training_stats';

/** 제출 완료 1회: today_sessions / total_completed / streak 갱신 */
function _recordScaleSubmit() {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const stats     = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');

  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }

  stats.today_sessions  = (stats.today_sessions  || 0) + 1;
  stats.total_completed = (stats.total_completed || 0) + 1;

  // 하루 1회 완료 시 스트릭 갱신 (quiz와 공유 카운터)
  if (stats.today_sessions === 1) {
    if (stats.streak_last_counted_date === yesterday) {
      stats.streak = (stats.streak || 0) + 1;
    } else {
      stats.streak = 1;
    }
    stats.streak_last_counted_date = today;
  }

  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  syncTrainingStatsToDB(); // 즉시 DB 반영 (fire-and-forget)
}

/** 페이지 이탈 시 훈련 시간 누적 (문제 미완료여도 기록) */
function _recordScaleSessionTime() {
  if (!_scaleSessionStart) return;
  const durationMin = (Date.now() - _scaleSessionStart) / 60000;
  if (durationMin < 0.1) return; // 6초 미만 무시
  const stats = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');
  stats.training_time_min = Math.round(
    ((stats.training_time_min || 0) + durationMin) * 10
  ) / 10;
  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  _scaleSessionStart = 0; // 중복 기록 방지
}

// ── Analytics 헬퍼 ──────────────────────────────────────────────
// scale_block_viewed: 디바운스 1.5초
let _blockViewTimer = null;
function _trackBlockViewed() {
  clearTimeout(_blockViewTimer);
  _blockViewTimer = setTimeout(() => {
    const seq = buildNavSequence();
    if (seq.length === 0) return;
    const { block, bi, startFret } = seq[_navIdx];
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    analytics.track('scale_block_viewed', {
      scale_key:  _scaleKey,
      root_name:  names[_rootNote],
      form:       block.label || FORM_NAMES[bi] || (bi + 1 + '번폼'),
      bi,
      start_fret: startFret,
    });
  }, 1500);
}

// scale_block_played: 쓰로틀 5초
let _lastPlayedAt = 0;
function _trackBlockPlayed() {
  const now = Date.now();
  if (now - _lastPlayedAt < 5000) return;
  _lastPlayedAt = now;
  const seq = buildNavSequence();
  if (seq.length === 0) return;
  const { block, bi } = seq[_navIdx];
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  analytics.track('scale_block_played', {
    scale_key: _scaleKey,
    root_name: names[_rootNote],
    form:      block.label || FORM_NAMES[bi] || (bi + 1 + '번폼'),
    bi,
  });
}

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
    updateFormLabel();
    analytics.track('scale_accidental_toggled', {
      scale_key: _scaleKey,
      to: _useFlat ? 'flat' : 'sharp',
    });
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
      analytics.track('scale_key_selected', {
        scale_key: _scaleKey,
        root_note: semitone,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[semitone],
      });
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

  // Ch.2: 전환 버튼 표시
  if (_scaleKey === 'secondary-iv') {
    const btn = document.getElementById('pair-transition-btn');
    if (btn) {
      btn.style.display = 'inline-flex';
      btn.addEventListener('pointerup', () => transitionPair());
    }
  }

renderFullNeck();
  renderNotes(false);        // 珥덇린 ?뚮뜑???좊땲硫붿씠???놁씠 利됱떆 ?대룞
  updateFormLabel();
  updateBlockIndicator();
  initArrows();
  initAccidentalToggle();
  initKeySelector();

  initTestTap();

  // ?뚯뒪???쒖옉 踰꾪듉
  document.getElementById('start-test-btn')?.addEventListener('pointerup', () => {
    analytics.track('scale_test_started', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    analytics.track('scale_test_started', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    startTest();
  });

  // ?쒖텧?섍린 / ?ㅼ떆 ?湲?踰꾪듉
  document.getElementById('test-submit-btn')?.addEventListener('pointerup', (e) => {
    if (e.currentTarget.disabled) return;
    if (_testSubmitted) {
      analytics.track('scale_test_retry', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
      });
      startTest();
    } else {
      analytics.track('scale_test_submitted', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
        form:      _testItem.block.label || FORM_NAMES[_testItem.bi] || (_testItem.bi + 1 + '번폼'),
        bi:        _testItem?.bi,
      });
      checkAnswer();
    }
  });

  // ?뚯뒪???ㅻ쾭?덉씠 ?リ린 (X 踰꾪듉 / ?뚯븘媛湲?踰꾪듉 怨듯넻)
  const closeTestOverlay = () =>
    document.getElementById('scale-test-overlay')?.classList.remove('is-open');

  document.getElementById('test-close-btn')?.addEventListener('pointerup', closeTestOverlay);
  document.getElementById('test-back-btn')?.addEventListener('pointerup', () => {
    analytics.track('scale_test_closed', {
      scale_key: _scaleKey,
      root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
    });
    closeTestOverlay();
  });

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  analytics.track('scale_level_viewed', { key: _scaleKey });

  // 훈련 시간 측정 시작
  _scaleSessionStart = Date.now();

  // 브라우저 탭 닫기 / 뒤로가기 등 예외 경로 처리
  window.addEventListener('pagehide', _recordScaleSessionTime, { once: true });
});
