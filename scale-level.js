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
const FORM_NAMES_HM    = ['Gm폼', 'Em폼', 'Dm폼', 'Cm폼', 'Am폼'];
// Ch.2 secondary-iv: 원폼(bi) → 짝궁폼(bi) 매핑 (4도 메이저 전환)
const PAIR_PARTNER_BI  = { 0: 3, 1: 4, 2: 0, 3: 1, 4: 2 };
// bi별 짝궁폼의 startFret 오프셋 (짝궁_startFret = cur.startFret + offset)
// G폼(bi=1)↔C폼만 +1, 나머지는 동일
const PAIR_STARTFRET_OFFSET = { 1: 1 };

// Ch.2 secondary-v: 원폼(bi) → 짝궁폼(bi) 매핑 (5도 메이저 전환)
const PAIR_PARTNER_BI_V       = { 0: 2, 1: 3, 2: 4, 3: 0, 4: 1 };
// A↔E, G↔D, E↔C, D↔A, C↔G
const PAIR_STARTFRET_OFFSET_V = { 4: -1 };

// Ch.2 secondary-ii: major 원폼(bi) → harmonic-minor 짝궁폼(bi) 매핑 (6도 마이너 전환)
const PAIR_PARTNER_BI_II       = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }; // A폼↔Gm폼, G폼↔Em폼, E폼↔Dm폼, D폼↔Cm폼, C폼↔Am폼
const PAIR_STARTFRET_OFFSET_II = {};        // offset 없음 (같은 startFret)

// Ch.2 secondary-vi: major 원폼(bi) → harmonic-minor 짝궁폼(bi) 매핑 (2도 마이너 전환)
const PAIR_PARTNER_BI_VI       = { 0: 3, 1: 4, 2: 0, 3: 1, 4: 2 }; // A↔Cm, G↔Am, E↔Gm, D↔Em, C↔Dm
const PAIR_STARTFRET_OFFSET_VI = { 1: 1 };  // G폼↔Am폼: Am폼 startFret = G폼 + 1

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
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E B G D A E (string 0=1번줄)

function playScaleNote(stringIdx, absFret) {
  GuitarAudio.stop();
  GuitarAudio.playNote(OPEN_MIDI[stringIdx] + absFret, 2.5);
}

// ?? ?ㅻ퉬寃뚯씠???쒗??鍮뚮뱶 ????????????????????????????????????
// 紐⑤뱺 block 횞 position???섎굹???좏삎 諛곗뿴濡??쇱묠
// 諛섑솚: [{ block, bi, startFret }, ...]
function buildNavSequence() {
  // Ch.2: secondary-iv / secondary-v / secondary-ii 는 major 블럭 사용
  const blockKey = (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') ? 'major' : _scaleKey;
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

  const isV        = _scaleKey === 'secondary-v';
  const isII       = _scaleKey === 'secondary-ii';
  const isVI       = _scaleKey === 'secondary-vi';
  const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
  const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
  const offset     = offsetMap[cur.bi] || 0;
  const ghostStartFret = _pairTransitioned ? cur.startFret : cur.startFret + offset;
  const ghostBi    = _pairTransitioned ? cur.bi : partnerMap[cur.bi];
  // secondary-ii/vi: 전환 전=harmonic-minor ghost, 전환 후=major ghost
  const ghostScaleKey = (isII || isVI) ? (_pairTransitioned ? 'major' : 'harmonic-minor') : 'major';
  const ghostBlock = ScaleData.getBlocks(ghostScaleKey)[ghostBi];
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
  if (_scaleKey === 'secondary-v') { _transitionPairV(); return; }
  if (_scaleKey === 'secondary-ii') { _transitionPairII(); return; }
  if (_scaleKey === 'secondary-vi') { _transitionPairVI(); return; }
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      // 6번줄(s=5) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      // 6번줄(s=5) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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

// ── Ch.2 secondary-v: 5도 메이저 전환 애니메이션 ────────────────
function _transitionPairV() {
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

  // ── A폼 (bi=0) ↔ E폼 ──────────────────────────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → E폼
      // 2번줄(s=1) degree=4 페이드 아웃
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,5':1, '0,6':2,
          '1,2':5, '1,3':6,
          '2,6':2, '2,7':3, '2,1':4,
          '3,3':6, '3,5':1,
          '4,7':3, '4,1':4, '4,2':5,
          '5,5':1, '5,6':2,
        });
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // E폼 → A폼 (역전환)
      // 1번줄(s=0), 6번줄(s=5) degree=7 페이드 아웃
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 5, 1, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── G폼 (bi=1) ↔ D폼 ──────────────────────────────────────────
  } else if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → D폼
      // 1번줄(s=0) degree=1 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 0 && parseInt(el.dataset.degree) === 1) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 1, 3, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // D폼 → G폼 (역전환)
      // 4번줄(s=3) degree=7 페이드 아웃
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 5, 0, 1);
        _spawnNote(neckEl, cur.startFret + 5, 4, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── E폼 (bi=2) ↔ C폼 ──────────────────────────────────────────
  } else if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → C폼
      // 3번줄(s=2) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 2 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,7':3, '0,1':4, '0,2':5,
          '1,5':1, '1,6':2,
          '2,2':5, '2,3':6,
          '3,6':2, '3,7':3, '3,1':4,
          '4,3':6, '4,5':1,
          '5,7':3, '5,1':4, '5,2':5,
        });
        _spawnNote(neckEl, cur.startFret + 1, 1, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // C폼 → E폼 (역전환)
      // 2번줄(s=1) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 1 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 5번줄(s=4) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,3':7, '0,4':1, '0,5':2,
          '1,1':5, '1,2':6,
          '2,5':2, '2,6':3,
          '3,2':6, '3,3':7, '3,4':1,
          '4,6':3, '4,1':5,
          '5,3':7, '5,4':1, '5,5':2,
        });
        _spawnNote(neckEl, cur.startFret + 4, 2, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── D폼 (bi=3) ↔ A폼 ──────────────────────────────────────────
  } else if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → A폼
      // 6번줄(s=5) degree=4 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 1, 4, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // A폼 → D폼 (역전환)
      // 5번줄(s=4) degree=7 페이드 아웃
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 4 && parseInt(el.dataset.degree) === 7) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      // 3번줄(s=2) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 2 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 5, 5, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  // ── C폼 (bi=4) ↔ G폼 (offset = −1) ───────────────────────────
  } else if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → G폼
      // 4번줄(s=3) degree=4 페이드 아웃
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      // 6번줄(s=5) degree=4 → 오른쪽 1프렛, degree=7
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 4) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret, 2, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // G폼 → C폼 (역전환)
      // 3번줄(s=2) degree=7 페이드 아웃
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
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 4;
        }
      });
      // 6번줄(s=5) degree=7 → 왼쪽 1프렛, degree=4
      activeEls.forEach(el => {
        if (parseInt(el.dataset.s) === 5 && parseInt(el.dataset.degree) === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
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
        _spawnNote(neckEl, cur.startFret + 4, 3, 4);
        _finishTransition(false);
      }, DURATION + 60);
    }

  } else {
    _transitioning = false;
  }
}

async function closeScaleLevel() {
  _recordScaleSessionTime();
  await GuitarAudio.stop({ wait: true });
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
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') {
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

  // Ch.2: 소스폼 ghost (hint 없음)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') {
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
  const isV        = _scaleKey === 'secondary-v';
  const isII       = _scaleKey === 'secondary-ii';
  const isVI       = _scaleKey === 'secondary-vi';
  const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
  const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
  const offset       = offsetMap[bi] || 0;
  const partnerBi    = partnerMap[bi];
  const srcBi        = forward ? bi : partnerBi;
  const srcStartFret = forward ? startFret : startFret + offset;
  // secondary-ii/vi: forward=소스가 major, reverse=소스가 harmonic-minor
  const srcScaleKey  = (isII || isVI) ? (forward ? 'major' : 'harmonic-minor') : 'major';

  const srcBlock = ScaleData.getBlocks(srcScaleKey)[srcBi];
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
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') {
    const { bi, forward } = _testItem;
    const isV        = _scaleKey === 'secondary-v';
    const isII       = _scaleKey === 'secondary-ii';
    const isVI       = _scaleKey === 'secondary-vi';
    const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
    const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
    const offset = offsetMap[bi] || 0;
    const tgtBi = forward ? partnerMap[bi] : bi;
    // secondary-ii/vi: forward=major→harmonic-minor, reverse=harmonic-minor→major
    const tgtScaleKey = (isII || isVI) ? (forward ? 'harmonic-minor' : 'major') : 'major';
    _answerBlock = ScaleData.getBlocks(tgtScaleKey)[tgtBi];
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
    forward:    _testItem.forward ?? null,
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
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') {
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
    if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v') {
      const { bi, forward } = _testItem;
      const isV        = _scaleKey === 'secondary-v';
      const partnerMap = isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
      const interval   = isV ? 7 : 5;
      const partnerBi  = partnerMap[bi];
      const srcBi      = forward ? bi : partnerBi;
      const tgtBi      = forward ? partnerBi : bi;
      const srcKeyNote = forward ? _rootNote : (_rootNote + interval) % 12;
      const tgtKeyNote = forward ? (_rootNote + interval) % 12 : _rootNote;
      questionHtml = `${names[srcKeyNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[tgtKeyNote]}메이저 ${FORM_NAMES[tgtBi]}으로 전환해보세요!`;
    } else if (_scaleKey === 'secondary-ii') {
      const { bi, forward } = _testItem;
      const partnerBi  = PAIR_PARTNER_BI_II[bi];
      const srcBi      = forward ? bi : (partnerBi !== undefined ? partnerBi : bi);
      const tgtBi      = forward ? (partnerBi !== undefined ? partnerBi : bi) : bi;
      const hmKeyNote  = (_rootNote + 9) % 12;
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[tgtBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[srcBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[tgtBi]}으로<br>전환해보세요!`;
      }
    } else if (_scaleKey === 'secondary-vi') {
      const { bi, forward } = _testItem;
      const partnerBi  = PAIR_PARTNER_BI_VI[bi];
      const srcBi      = forward ? bi : (partnerBi !== undefined ? partnerBi : bi);
      const tgtBi      = forward ? (partnerBi !== undefined ? partnerBi : bi) : bi;
      const hmKeyNote  = (_rootNote + 2) % 12;
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[srcBi]}에서<br>${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[tgtBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[hmKeyNote]} 하모닉 마이너 ${FORM_NAMES_HM[srcBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[tgtBi]}으로<br>전환해보세요!`;
      }
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
// ── Ch.2 secondary-ii: 2도 마이너 전환 애니메이션 ────────────────
function _transitionPairII() {
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

  // ── C폼(bi=4) ↔ Am폼(harmonic-minor) ──────────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼 → Am폼: s=0,2,5 에서 deg5 slide +1 → deg7
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 2 || s === 5) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left     = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf   = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,3':'5',  '0,4':'b6',
          '1,7':'2',  '1,1':'b3', '1,2':'4',
          '2,6':1,
          '3,2':'4',  '3,3':'5',  '3,4':'b6',
          '4,6':1,    '4,7':'2',  '4,1':'b3',
          '5,3':'5',  '5,4':'b6',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Am폼 → C폼: s=0,2,5 에서 deg7 slide -1
      // ⚠️ Phase1에서 degree 변경 안 함: degMap '0,5':'3'이 슬라이드 노트와 충돌 방지
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 2 || s === 5) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          // degree는 degMap 이후에 변경
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,5':'3',   '0,b6':'4',
          '1,2':'7',   '1,b3':1,   '1,4':'2',
          '2,1':'6',
          '3,4':'2',   '3,5':'3',  '3,b6':'4',
          '4,1':'6',   '4,2':'7',  '4,b3':1,
          '5,5':'3',   '5,b6':'4',
        });
        // degMap 이후 슬라이드 노트 degree 변경 (충돌 없음)
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── A폼(bi=0) ↔ Gm폼(harmonic-minor) ─────────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼 → Gm폼: s=0,3,5 에서 deg5 slide +1 → deg7
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 3 || s === 5) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,6':1,
          '1,2':'4',   '1,3':'5',   '1,4':'b6',
          '2,6':1,     '2,7':'2',   '2,1':'b3',
          '3,3':'5',   '3,4':'b6',
          '4,7':'2',   '4,1':'b3',  '4,2':'4',
          '5,6':1,
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Gm폼 → A폼: s=0,3,5 에서 deg7 slide -1 (degree는 degMap 이후에 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 3 || s === 5) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,1':6,
          '1,4':'2',   '1,5':'3',   '1,b6':'4',
          '2,1':6,     '2,2':'7',   '2,b3':1,
          '3,5':'3',   '3,b6':'4',
          '4,2':'7',   '4,b3':1,    '4,4':'2',
          '5,1':6,
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── E폼(bi=2) ↔ Dm폼(harmonic-minor) ─────────────────────────
  if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼 → Dm폼: s=1,4 에서 deg5 slide +1 → deg7 (즉시 degree 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 1 || s === 4) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,7':'2',  '0,1':'b3', '0,2':'4',
          '1,6':1,
          '2,2':'4',  '2,3':'5',  '2,4':'b6',
          '3,6':1,    '3,7':'2',  '3,1':'b3',
          '4,3':'5',  '4,4':'b6',
          '5,7':'2',  '5,1':'b3', '5,2':'4',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Dm폼 → E폼: s=1,4 에서 deg7 slide -1 (degree는 degMap 이후 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 1 || s === 4) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,2':'7',  '0,b3':1,  '0,4':'2',
          '1,1':6,
          '2,4':'2',  '2,5':'3',  '2,b6':'4',
          '3,1':6,    '3,2':'7',  '3,b3':1,
          '4,5':'3',  '4,b6':'4',
          '5,2':'7',  '5,b3':1,  '5,4':'2',
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── D폼(bi=3) ↔ Cm폼(harmonic-minor) ─────────────────────────
  if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼 → Cm폼: s=2,4 에서 deg5 slide +1 → deg7 (즉시 degree 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 2 || s === 4) && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,2':'4',  '0,3':'5',
          '1,6':1,    '1,7':'2',  '1,1':'b3',
          '2,3':'5',  '2,4':'b6',
          '3,7':'2',  '3,1':'b3', '3,2':'4',
          '4,6':1,
          '5,2':'4',  '5,3':'5',  '5,4':'b6',
        });
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Cm폼 → D폼: s=2,4 에서 deg7 slide -1 (degree는 degMap 이후 변경)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 2 || s === 4) && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        _applyDegMap(neckEl, {
          '0,4':'2',  '0,5':'3',
          '1,1':6,    '1,2':'7',  '1,b3':1,
          '2,5':'3',  '2,b6':'4',
          '3,2':'7',  '3,b3':1,   '3,4':'2',
          '4,1':6,
          '5,4':'2',  '5,5':'3',  '5,b6':'4',
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── G폼(bi=1) ↔ Em폼(harmonic-minor) ─────────────────────────
  if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼 → Em폼: s=1 deg5 fade, s=3 deg5 slide+1
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 1 && d === 5) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 3 && d === 5) {
          const newAbsF = parseInt(el.dataset.absf) + 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          el.dataset.degree = 7;
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseInt(el.dataset.s) === 1 && parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,6':1,     '0,7':'2',   '0,1':'b3',
          '1,3':'5',   '1,4':'b6',
          '2,7':'2',   '2,1':'b3',  '2,2':'4',
          '3,6':1,
          '4,2':'4',   '4,3':'5',   '4,4':'b6',
          '5,6':1,     '5,7':'2',   '5,1':'b3',
        });
        _spawnNote(neckEl, cur.startFret + 1, 0, 7);
        _spawnNote(neckEl, cur.startFret + 1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);

    } else {
      // Em폼 → G폼: s=0,s=5 deg7 fade, s=3 deg7 slide-1 (degree는 degMap 이후 변경)
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if ((s === 0 || s === 5) && d === 7 && parseInt(el.dataset.absf) === cur.startFret + 1) {
          el.style.opacity   = '0';
          el.style.transform = 'translate(-50%, -50%) scale(0)';
        }
      });
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = parseInt(el.dataset.degree);
        if (s === 3 && d === 7) {
          const newAbsF = parseInt(el.dataset.absf) - 1;
          el.style.left   = ((newAbsF + 0.5) / TOTAL_FRETS * 100) + '%';
          el.dataset.absf = newAbsF;
          el.classList.toggle('fb-note--open', newAbsF === 0);
          slidNodes.push(el);
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if ((parseInt(el.dataset.s) === 0 || parseInt(el.dataset.s) === 5) &&
              parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {
          '0,1':6,     '0,2':'7',   '0,b3':1,
          '1,5':'3',   '1,b6':'4',
          '2,2':'7',   '2,b3':1,    '2,4':'2',
          '3,1':6,
          '4,4':'2',   '4,5':'3',   '4,b6':'4',
          '5,1':6,     '5,2':'7',   '5,b3':1,
        });
        slidNodes.forEach(el => {
          el.dataset.degree = 5;
          el.classList.remove('fb-note--root');
        });
        _spawnNote(neckEl, cur.startFret + 5, 1, 5);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }
}

// ── Ch.2 secondary-vi: 2도 마이너 전환 애니메이션 ────────────────
function _transitionPairVI() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) return;
  const bi = cur.bi;
  const sf = cur.startFret;

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

  // ── C폼(bi=4) ↔ Dm폼(HM bi=2), offset=0 ──────────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // C폼→Dm폼: fade s1-7@sf+1, slidNode s1-1@sf+2→sf+3, slide s4-7@sf+3→sf+2(b6), slidNode s4-1@sf+4→sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === '7' && absf === sf+1)   { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '1' && absf === sf+2)   { el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+3; el.classList.toggle('fb-note--open', sf+3===0); slidNodes.push(el); }
        if (s === 4 && d === '7' && absf === sf+3)   { el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+2; el.classList.toggle('fb-note--open', sf+2===0); el.dataset.degree = 'b6'; el.classList.remove('fb-note--root'); }
        if (s === 4 && d === '1' && absf === sf+4)   { el.style.left = ((sf+5+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+5; el.classList.toggle('fb-note--open', sf+5===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,3':'2','0,4':'b3','0,5':'4', '1,2':1, '2,5':'4','2,6':'5', '3,2':1,'3,3':'2','3,4':'b3', '4,6':'5', '5,3':'2','5,4':'b3','5,5':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 7; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+4, 2, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Dm폼→C폼: fade s2-b6@sf+4, slidNode s1-7@sf+3→sf+2(→1), slide s4-b6@sf+2→sf+3(7), slidNode s4-7@sf+5→sf+4(→1)
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 2 && d === 'b6' && absf === sf+4)  { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '7'  && absf === sf+3)  { el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+2; el.classList.toggle('fb-note--open', sf+2===0); slidNodes.push(el); }
        if (s === 4 && d === 'b6' && absf === sf+2)  { el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+3; el.classList.toggle('fb-note--open', sf+3===0); el.dataset.degree = '7'; }
        if (s === 4 && d === '7'  && absf === sf+5)  { el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf = sf+4; el.classList.toggle('fb-note--open', sf+4===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':'3','0,b3':'4','0,4':'5', '1,1':'2', '2,4':'5','2,5':'6', '3,1':'2','3,2':'3','3,b3':'4', '4,5':'6', '5,2':'3','5,b3':'4','5,4':'5' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 1, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── A폼(bi=0) ↔ Cm폼(HM bi=3), offset=0 ──────────────────────
  if (bi === 0) {
    if (!_pairTransitioned) {
      // A폼→Cm폼: fade s4-7@sf+1, slide s2-7@sf+3→sf+2(b6), slidNode s2-1@sf+4→sf+5(→7), slidNode s4-1@sf+2→sf+3(→7), spawn s5 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 4 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 2 && d === '7' && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 2 && d === '1' && absf === sf+4) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 4 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'4','0,6':'5', '1,2':1,'1,3':'2','1,4':'b3', '2,6':'5', '3,3':'2','3,4':'b3','3,5':'4', '4,2':1, '5,5':'4','5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 5, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Cm폼→A폼: fade s5-b6@sf+5, slide s2-b6@sf+2→sf+3(7), slidNode s2-7@sf+5→sf+4(→1), slidNode s4-7@sf+3→sf+2(→1), spawn s4 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 5 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 2 && d === 'b6' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 2 && d === '7'  && absf === sf+5) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 4 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,4':'5','0,5':'6', '1,1':'2','1,2':'3','1,b3':'4', '2,5':'6', '3,2':'3','3,b3':'4','3,4':'5', '4,1':'2', '5,4':'5','5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 4, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── G폼(bi=1) ↔ Am폼(HM bi=4), offset=+1 ─────────────────────
  if (bi === 1) {
    if (!_pairTransitioned) {
      // G폼→Am폼: fade s2-7@sf+1, slide s0-7@sf+4→sf+3(b6), slidNode s0-1@sf+5→sf+6(→7), slidNode s2-1@sf+2→sf+3(→7), slide s5-7@sf+4→sf+3(b6), slidNode s5-1@sf+5→sf+6(→7), spawn s3 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 2 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 0 && d === '1' && absf === sf+5) { const nf=sf+6; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 2 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 5 && d === '1' && absf === sf+5) { const nf=sf+6; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,6':'5', '1,3':'2','1,4':'b3','1,5':'4', '2,2':1, '3,5':'4','3,6':'5', '4,2':1,'4,3':'2','4,4':'b3', '5,6':'5' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 3, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Am폼→G폼: fade s3-b6@sf+5, slide s0-b6@sf+3→sf+4(7), slidNode s0-7@sf+6→sf+5(→1), slidNode s2-7@sf+3→sf+2(→1), slide s5-b6@sf+3→sf+4(7), slidNode s5-7@sf+6→sf+5(→1), spawn s2 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 3 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 0 && d === '7'  && absf === sf+6) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 2 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 5 && d === '7'  && absf === sf+6) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,5':'6', '1,2':'3','1,b3':'4','1,4':'5', '2,1':'2', '3,4':'5','3,5':'6', '4,1':'2','4,2':'3','4,b3':'4', '5,5':'6' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 2, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── E폼(bi=2) ↔ Gm폼(HM bi=0), offset=0 ──────────────────────
  if (bi === 2) {
    if (!_pairTransitioned) {
      // E폼→Gm폼: fade s0-7@sf+1, slidNode s0-1@sf+2→sf+3(→7), slide s3-7@sf+3→sf+2(b6), slidNode s3-1@sf+4→sf+5(→7), fade s5-7@sf+1, slidNode s5-1@sf+2→sf+3(→7), spawn s1 b6@sf+5
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 0 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 3 && d === '7' && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '1' && absf === sf+4) { const nf=sf+5; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 5 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1, '1,5':'4','1,6':'5', '2,2':1,'2,3':'2','2,4':'b3', '3,6':'5', '4,3':'2','4,4':'b3','4,5':'4', '5,2':1 });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+5, 1, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Gm폼→E폼: fade s1-b6@sf+5, slidNode s0-7@sf+3→sf+2(→1), slide s3-b6@sf+2→sf+3(7), slidNode s3-7@sf+5→sf+4(→1), slidNode s5-7@sf+3→sf+2(→1), spawn s0 7@sf+1, spawn s5 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 3 && d === 'b6' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7'  && absf === sf+5) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
        if (s === 5 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2', '1,4':'5','1,5':'6', '2,1':'2','2,2':'3','2,b3':'4', '3,5':'6', '4,2':'3','4,b3':'4','4,4':'5', '5,1':'2' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 0, 7);
        _spawnNote(neckEl, sf+1, 5, 7);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── D폼(bi=3) ↔ Em폼(HM bi=1), offset=0 ──────────────────────
  if (bi === 3) {
    if (!_pairTransitioned) {
      // D폼→Em폼: fade s1-1@sf+5, slide s1-7@sf+4→sf+3(b6), fade s3-7@sf+1, slidNode s3-1@sf+2→sf+3(→7), spawn s0 7@sf+1 b3@sf+5, spawn s4 b6@sf+5, spawn s5 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 1 && d === '1' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === '7' && absf === sf+4) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='b6'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7' && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 3 && d === '1' && absf === sf+2) { const nf=sf+3; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,2':1,'0,3':'2', '1,6':'5', '2,3':'2','2,4':'b3','2,5':'4', '3,2':1, '4,5':'4','4,6':'5', '5,2':1,'5,3':'2','5,4':'b3' });
        slidNodes.forEach(el => { el.dataset.degree = '7'; el.classList.remove('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 0, 7);
        _spawnNote(neckEl, sf+5, 0, 'b3');
        _spawnNote(neckEl, sf+5, 4, 'b6');
        _spawnNote(neckEl, sf+1, 5, 7);
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // Em폼→D폼: fade s0-7@sf+1 s0-b3@sf+5 s4-b6@sf+5 s5-7@sf+1, slide s1-b6@sf+3→sf+4(7), slidNode s3-7@sf+3→sf+2(→1), spawn s1 1@sf+5, spawn s3 7@sf+1
      const slidNodes = [];
      activeEls.forEach(el => {
        const s = parseInt(el.dataset.s);
        const d = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        if (s === 0 && d === '7'  && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 0 && d === 'b3' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 4 && d === 'b6' && absf === sf+5) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 5 && d === '7'  && absf === sf+1) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; }
        if (s === 1 && d === 'b6' && absf === sf+3) { const nf=sf+4; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); el.dataset.degree='7'; el.classList.remove('fb-note--root'); }
        if (s === 3 && d === '7'  && absf === sf+3) { const nf=sf+2; el.style.left=((nf+0.5)/TOTAL_FRETS*100)+'%'; el.dataset.absf=nf; el.classList.toggle('fb-note--open',nf===0); slidNodes.push(el); }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => { if (parseFloat(el.style.opacity) === 0) el.remove(); });
        _applyDegMap(neckEl, { '0,1':'2','0,2':'3', '1,5':'6', '2,2':'3','2,b3':'4','2,4':'5', '3,1':'2', '4,4':'5','4,5':'6', '5,1':'2','5,2':'3','5,b3':'4' });
        slidNodes.forEach(el => { el.dataset.degree = 1; el.classList.add('fb-note--root'); });
        _spawnNote(neckEl, sf+1, 3, 7);
        _spawnNote(neckEl, sf+5, 1, 1);
        _finishTransition(false);
      }, DURATION + 60);
    }
  }
}

function updateFormLabel() {
  const el = document.getElementById('form-label');
  if (!el) return;
  const seq = buildNavSequence();
  if (seq.length === 0) { el.textContent = ''; return; }
  const { block, bi } = seq[_navIdx];

  // Ch.2: "[Key]메이저 [Form]폼" 형식 (짝궁 전환 시 파트너 키+폼 표시)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v') {
    const names      = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    const isV        = _scaleKey === 'secondary-v';
    const partnerMap = isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
    const interval   = isV ? 7 : 5;
    if (_pairTransitioned) {
      const partnerKey = (_rootNote + interval) % 12;
      const partnerBi  = partnerMap[bi];
      el.textContent = `${names[partnerKey]}메이저 ${FORM_NAMES[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }
  // Ch.2 secondary-ii: 전환 전=메이저, 전환 후=하모닉 마이너 표시 (6도 마이너)
  if (_scaleKey === 'secondary-ii') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const hmKey    = (_rootNote + 9) % 12;
      const partnerBi = PAIR_PARTNER_BI_II[bi];
      el.textContent = `${names[hmKey]} 하모닉 마이너 ${FORM_NAMES_HM[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }
  // Ch.2 secondary-vi: 전환 전=메이저, 전환 후=하모닉 마이너 표시 (2도 마이너)
  if (_scaleKey === 'secondary-vi') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    if (_pairTransitioned) {
      const hmKey     = (_rootNote + 2) % 12;   // 2도 위 (D in key of C)
      const partnerBi = PAIR_PARTNER_BI_VI[bi];
      el.textContent = `${names[hmKey]} 하모닉 마이너 ${FORM_NAMES_HM[partnerBi]}`;
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
    sharpSpan.classList.toggle('active', !_useFlat);
    flatSpan.classList.toggle('active',   _useFlat);
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
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi') {
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
