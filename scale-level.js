// ═══════════════════════════════════════════════════════════════
// scale-level.js — 스케일 레벨 개별 훈련 페이지
// ═══════════════════════════════════════════════════════════════
// ── 상수 ─────────────────────────────────────────────────────
const SCALE_TITLES = {
  'major':          '메이저 스케일',
  'pentatonic':     '마이너 펜타토닉 스케일',
  'blues':          '마이너 블루스 스케일',
  'natural-minor':  '내추럴 마이너 스케일',
  'harmonic-minor': '하모닉 마이너 스케일',
  'melodic-minor':  '멜로딕 마이너 스케일',
  'phrygian-dominant': '프리지안 도미넌트 스케일',
  'mixolydian-b9b13':  '믹솔리디안 b9 b13 스케일',
  'mixolydian-b13':    '믹솔리디안 9 b13 스케일',
  'lydian-dominant':   '리디안 도미넌트 스케일',
  'locrian-sharp2':    '로크리안 내추럴2 스케일',
  'locrian-sharp6':    '로크리안 내추럴6 스케일',
  'altered':           '얼터드 스케일',
  'mixolydian':     '믹솔리디안 스케일',
  'ionian':         '아이오니안 스케일',
  'dorian':         '도리안 스케일',
  'phrygian':       '프리지안 스케일',
  'lydian':         '리디안 스케일',
  'aeolian':        '에올리안 스케일',
  'locrian':        '로크리안 스케일',
};

const SCALE_SHORT_NAMES = {
  'major':          '메이저',
  'pentatonic':     '마이너 펜타토닉',
  'blues':          '마이너 블루스',
  'natural-minor':  '내추럴 마이너',
  'harmonic-minor': '하모닉 마이너',
  'melodic-minor':  '멜로딕 마이너',
  'phrygian-dominant': '프리지안 도미넌트',
  'mixolydian-b9b13':  '믹솔리디안 b9 b13',
  'mixolydian-b13':    '믹솔리디안 9 b13',
  'lydian-dominant':   '리디안 도미넌트',
  'locrian-sharp2':    '로크리안 내추럴2',
  'locrian-sharp6':    '로크리안 내추럴6',
  'altered':           '얼터드',
  'mixolydian':     '믹솔리디안',
  'ionian':         '아이오니안',
  'dorian':         '도리안',
  'phrygian':       '프리지안',
  'lydian':         '리디안',
  'aeolian':        '에올리안',
  'locrian':        '로크리안',
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

// Ch.2 secondary-iii: major 원폼(bi) → natural-minor 짝궁폼(bi) 매핑 (내추럴 마이너 전환)
const PAIR_PARTNER_BI_III       = { 0: 4, 1: 0, 2: 1, 3: 2, 4: 3 }; // A↔Am, G↔Gm, E↔Em, D↔Dm, C↔Cm
const PAIR_STARTFRET_OFFSET_III = { 0: 1, 1: 1, 3: 1 };  // A폼↔Am폼, G폼↔Gm폼, D폼↔Dm폼: 짝궁 startFret = 원폼 + 1

const KEY_NAMES        = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const STRINGS          = 6;
const STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5];
const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19]);
const DOUBLE_DOT_FRETS = new Set([12]);

// ── 상태 ─────────────────────────────────────────────────────
let _scaleKey  = 'major';
let _scaleLevel = 0; // 레벨 첫완료 퀘스트용 (URL level 파라미터)
let _rootNote  = 0;
let _navIdx    = 0;
let _useFlat   = false;
let _showDegrees = false;
let _testItem    = null;        // 테스트 현재 아이템 { block, bi, startFret }
let _testHint      = null;        // 힌트 위치 { s, col } — 미리 찍어두는 dot 표시
let _placedNotes   = new Set();   // 플레이어가 찍은 dot: "s,col" 문자열의 Set
let _testSubmitted = false;       // 제출 후 입력 방지 플래그

let _shuffleBag = null;  // ShuffleBag 인스턴스 — lazy 초기화
let _scaleSessionStart = 0; // 페이지 진입 시각 (훈련 시간 측정)

// ── Audio Engine (Karplus-Strong) ───────────────────────────
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E B G D A E (string 0=1번줄)

function playScaleNote(stringIdx, absFret) {
  GuitarAudio.stop();
  GuitarAudio.playNote(OPEN_MIDI[stringIdx] + absFret, 2.5);
}

// ── 정답/오답 효과음 (chord-name-quiz.js playSound 이식) ─────
let _quizAudioCtx = null;
let _quizSfxMaster = null; // 설정>사운드 마스터 볼륨용 최종 게인(엔벨로프 뒤 → 낮은 볼륨서도 클릭 없음)
function _getQuizAudioCtx() {
  if (!_quizAudioCtx) _quizAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_quizAudioCtx.state === 'suspended') _quizAudioCtx.resume();
  return _quizAudioCtx;
}
function _getQuizSfxBus(ctx) {
  if (!_quizSfxMaster) {
    _quizSfxMaster = ctx.createGain();
    _quizSfxMaster.connect(ctx.destination);
  }
  _quizSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _quizSfxMaster;
}
function _playQuizBell(freq, startDelay, gainVal) {
  try {
    const ctx = _getQuizAudioCtx();
    const t   = ctx.currentTime + startDelay;
    const bus = _getQuizSfxBus(ctx); // 마스터 볼륨 일괄(엔벨로프 원형 유지)
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
      gain.connect(bus);
      osc.type = 'sine';
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
function playQuizSound(type) {
  if (type === 'correct') {
    _playQuizBell(523.25, 0,    0.20);
    _playQuizBell(698.46, 0.13, 0.20);
  } else if (type === 'wrong') {
    _playQuizBell(349.23, 0,    0.20);
    _playQuizBell(261.63, 0.13, 0.20);
  }
}

// ── 내비게이션 시퀀스 생성 ──────────────────────────────────
// 모든 block 및 position을 순서대로 정렬
// 諛섑솚: [{ block, bi, startFret }, ...]
function buildNavSequence() {
  // Ch.2: secondary-iv / secondary-v / secondary-ii 는 major 블럭 사용
  const blockKey = (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') ? 'major' : _scaleKey;
  const blocks = ScaleData.getBlocks(blockKey);
  const seq = [];
  blocks.forEach((block, bi) => {
    const startFrets = ScaleData.getStartFrets(block, _rootNote);
    startFrets.forEach(sf => {
      seq.push({ block, bi, startFret: sf });
    });
  });
  // startFret 오름차순 정렬 — 키 이동 시 순서대로
  seq.sort((a, b) => a.startFret - b.startFret);
  return seq;
}

// ── 페이지 초기화 ────────────────────────────────────────────

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
  const isIII      = _scaleKey === 'secondary-iii';
  const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isIII ? PAIR_PARTNER_BI_III : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
  const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isIII ? PAIR_STARTFRET_OFFSET_III : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
  const offset     = offsetMap[cur.bi] || 0;
  const ghostStartFret = _pairTransitioned ? cur.startFret : cur.startFret + offset;
  const ghostBi    = _pairTransitioned ? cur.bi : partnerMap[cur.bi];
  // secondary-ii/vi/iii: 전환 전=partner ghost, 전환 후=major ghost
  const ghostScaleKey = (isII || isVI) ? (_pairTransitioned ? 'major' : 'harmonic-minor')
                      : isIII ? (_pairTransitioned ? 'major' : 'natural-minor')
                      : 'major';
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
  // 전환 후 도수 라벨 전체 재작성 — 슬라이드로 dataset.degree만 바뀐 노트까지 포함
  const neckEl = document.getElementById('fb-full-neck');
  if (neckEl) {
    neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
      _setNoteDegreeLabel(el, el.dataset.degree);
    });
  }
  updateFormLabel();
  _refreshSecondaryGhost();
  _transitioning = false;
}

// 노트 el의 도수 라벨 span 재작성 (근음=라벨 없음)
// degVal: 숫자 1 또는 라벨 문자열('2','b3','4'...)
function _setNoteDegreeLabel(el, degVal) {
  el.querySelectorAll('.fb-note-deg').forEach(d => d.remove());
  if (String(degVal) === '1') return;   // 근음은 표시 생략
  // raw degree(음수=플랫) → 표시 라벨('b3','#4'...)로 변환해야 잉크박스 오프셋 키가 맞음
  const lbl = degreeLabel(Number(degVal), _scaleKey);
  const deg = document.createElement('span');
  deg.className = 'fb-note-deg';
  deg.textContent = lbl;
  deg.dataset.deg = lbl;
  applyDegOffset(deg, lbl);
  el.appendChild(deg);
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
  if (_scaleKey === 'secondary-iii') { _transitionPairIII(); return; }
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
  _playTap();
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

// ── 전체 넥 렌더링 (1번만 실행) ─────────────────────────────
// ids: { neck, nums, wrapper } 형태의 메인 엘리먼트 ID 사용
function renderFullNeck(ids = {}) {
  const neckEl  = document.getElementById(ids.neck    || 'fb-full-neck');
  const numsEl  = document.getElementById(ids.nums    || 'fb-full-nums');
  const wrapper = document.getElementById(ids.wrapper || 'fb-full-wrapper');
  if (!neckEl || !numsEl || !wrapper) return;

  // 전체 너비 = TOTAL_FRETS / VISIBLE_FRETS × 100%
  const widthPct = `${(TOTAL_FRETS / FRETS_VISIBLE) * 100}%`;
  wrapper.style.width = widthPct;
  neckEl.style.width  = '100%';
  numsEl.style.width  = '100%';

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  // ── 줄 선 (뒤에서 먼저 생성) ──
  const nutLeftPct = 1 / TOTAL_FRETS * 100;
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px; left:${nutLeftPct}%;`;
    neckEl.appendChild(el);
  }

  // ── 너트 (fret 0과 1 사이) ──
  const nutEl = document.createElement('div');
  nutEl.className = 'fb-nut-line';
  nutEl.style.left = `${1 / TOTAL_FRETS * 100}%`;
  neckEl.appendChild(nutEl);

  // ── 프렛 선 (fret 2~20 절반 위치) ──
  for (let f = 2; f < TOTAL_FRETS; f++) {
    const leftPct = f / TOTAL_FRETS * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ── 포지션 점 ──
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

  // ── 프렛 번호 (점 위치에만) ──
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

// ── 뷰포트 스크롤로 이동 ──────────────────────────────────────
function scrollToFret(startFret, animate = true, viewportId = 'fb-viewport') {
  const viewport = document.getElementById(viewportId);
  if (!viewport) return;

  const vw = viewport.clientWidth;
  // 釉붾윮 以묒븰 fret = startFret + FRETS_VISIBLE/2
  // 해당 위치를 뷰포트 중앙에 오도록 계산
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

// 도수 번호 라벨 문자열 (음수=플랫, 리디안 -5는 #4 표기)
function degreeLabel(degree, scaleKey) {
  if (degree === -5 && scaleKey === 'lydian') return '#4';
  if (scaleKey === 'altered') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === -3) return '#9';   // b3 → #9
    if (degree === -5) return '#11';  // b5 → #11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  // 프리지안 도미넌트 = 믹솔리디안 b9 b13 과 동일 음정(1 b2 3 4 5 b6 b7) → 표기도 동일
  if (scaleKey === 'mixolydian-b9b13' || scaleKey === 'phrygian-dominant') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'mixolydian-b13') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'lydian-dominant') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === -5) return '#11';  // b5(=#4) → #11
    if (degree === 6)  return '13';   // 6  → 13
  }
  if (scaleKey === 'locrian-sharp2') {
    if (degree === 2)  return '9';    // 2  → 9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === -6) return 'b13';  // b6 → b13
  }
  if (scaleKey === 'locrian-sharp6') {
    if (degree === -2) return 'b9';   // b2 → b9
    if (degree === 4)  return '11';   // 4  → 11
    if (degree === 6)  return '13';   // 6  → 13
  }
  return degree < 0 ? 'b' + (-degree) : '' + degree;
}

// ── 도수 라벨 잉크박스 실측 → 원 정중앙 정렬 오프셋 계산 ──────
// canvas measureText 의 actualBoundingBox(잉크 윤곽)로 글리프별 무게중심을
// 구해, left/top 50% 기준점에서 잉크 중심이 정확히 dot 중앙에 오도록 translate.
// b/# 처럼 폭·비대칭이 다른 라벨도 자동 보정됨.
const _DEG_OFFSETS = {};
function measureDegreeOffsets() {
  const cv  = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font         = '700 11px Pretendard, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  const labels = ['1','2','3','4','5','6','7','b2','b3','b5','b6','b7','#4','b9','#9','#11','b13','11','9','13'];
  labels.forEach(lbl => {
    const m = ctx.measureText(lbl);
    const abbL = m.actualBoundingBoxLeft;
    const abbR = m.actualBoundingBoxRight;
    const abbA = m.actualBoundingBoxAscent;
    const abbD = m.actualBoundingBoxDescent;
    const fA   = m.fontBoundingBoxAscent;
    const fD   = m.fontBoundingBoxDescent;
    // 잉크 가로 중심을 기준점(pen=box left=중앙)에 맞춤
    const tx = -((abbR - abbL) / 2);
    // box top=중앙 → baseline=top+fA, 잉크 세로 중심=baseline+(abbD-abbA)/2
    const ty = -(fA + (abbD - abbA) / 2);
    _DEG_OFFSETS[lbl] = { tx, ty, lh: fA + fD };
  });
}

function applyDegOffset(deg, lbl) {
  const o = _DEG_OFFSETS[lbl];
  if (!o) return;   // 미측정 시 CSS 폴백(translate(-50%,-50%)) 유지
  deg.style.transform  = `translate(${o.tx.toFixed(2)}px, ${o.ty.toFixed(2)}px)`;
  deg.style.lineHeight = o.lh.toFixed(2) + 'px';
}

// ── 노트 DOM 생성 함수 ───────────────────────────────────────
function createNoteEl(absF, s, degree, ghost = false) {
  const leftPct = (absF + 0.5) / TOTAL_FRETS * 100;
  const topPct  = (s + 0.5) / STRINGS * 100;
  const isRoot  = degree === 1;
  const isBlue5 = degree === -5 && _scaleKey !== 'altered';   // altered #11은 특징음 강조 없음
  const isNat7  = degree === 7 && _scaleKey === 'harmonic-minor';
  const isChar  = (degree === 4 && _scaleKey === 'ionian')
               || (degree === 6 && _scaleKey === 'dorian')
               || (degree === -2 && _scaleKey === 'phrygian')
               || (degree === -7 && _scaleKey === 'mixolydian')
               || (degree === -6 && _scaleKey === 'aeolian');
  const isOpen  = absF === 0;

  const el = document.createElement('div');
  el.className = 'fb-note'
    + (isRoot  ? ' fb-note--root'   : '')
    + (isBlue5 ? ' fb-note--blue5'  : '')
    + (isNat7  ? ' fb-note--nat7'   : '')
    + (isChar  ? ' fb-note--char'   : '')
    + (isOpen  ? ' fb-note--open'   : '')
    + (ghost   ? ' fb-note--ghost'  : '');
  el.style.cssText = `left:${leftPct}%; top:${topPct}%;`;
  el.dataset.s      = s;
  el.dataset.degree = degree;
  el.dataset.absf   = absF;

  // 도수 번호 라벨 (ghost·근음 제외) — .degrees-on 일 때만 표시
  if (!ghost && String(degree) !== '1') {
    const deg = document.createElement('span');
    deg.className = 'fb-note-deg';
    const _lbl = degreeLabel(degree, _scaleKey);
    deg.textContent = _lbl;
    deg.dataset.deg = _lbl;
    applyDegOffset(deg, _lbl);   // 잉크박스 실측 기반 정중앙 정렬
    el.appendChild(deg);
  }

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
      // 리플 효과 생성
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

// ── 뷰포트 노트 렌더링 ─────────────────────────────────────────
// 현재 블럭의 실제 dot / 인접 블럭의 ghost(희미한) dot
function renderNotes(animate = true) {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  // 블록 이동 시 전환 상태 초기화
  _pairTransitioned = false;

  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // ghost 먼저 렌더 (z-index 낮게 배치)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
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

  // 현재 블럭 렌더 (위에 쌓임)
  const current = seq[_navIdx];
  const parsed  = ScaleData.parseGrid(current.block.grid);
  parsed.notes.forEach(note => {
    const absF = current.startFret + note.col;
    if (absF < 0 || absF >= TOTAL_FRETS) return;
    neckEl.appendChild(createNoteEl(absF, note.s, note.degree, false));
  });

  scrollToFret(current.startFret, animate);
}

// ── 가장 높은 루트음 찾기 ────────────────────────────────────
// { s, absF, degree:1 } 또는 null
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

// ── 테스트 넥 렌더링 (7프렛 고정 위치) ──────────────────────
// startFret ~ startFret+6 범위를 100% 너비에 맞게 렌더
function renderTestNeck(startFret) {
  const neckEl = document.getElementById('test-fb-full-neck');
  const numsEl = document.getElementById('test-fb-full-nums');
  if (!neckEl || !numsEl) return;

  neckEl.innerHTML = '';
  numsEl.innerHTML = '';

  const showNut    = startFret <= 0;
  const nutLeftPct = showNut ? (1 - startFret) / FRETS_VISIBLE * 100 : 0;

  // ── 줄 선 ──
  for (let s = 0; s < STRINGS; s++) {
    const topPct = (s + 0.5) / STRINGS * 100;
    const el = document.createElement('div');
    el.className = 'fb-string';
    el.style.cssText = `top:${topPct}%; height:${STRING_THICKNESS[s]}px; left:${showNut ? nutLeftPct : 0}%;`;
    neckEl.appendChild(el);
  }

  // ── 너트 ──
  if (showNut) {
    const nutEl = document.createElement('div');
    nutEl.className = 'fb-nut-line';
    nutEl.style.left = `${nutLeftPct}%`;
    neckEl.appendChild(nutEl);
  }

  // ── 프렛 선 (현재 구간) ──
  for (let col = 1; col < FRETS_VISIBLE; col++) {
    const absFret = startFret + col;
    if (showNut ? absFret <= 1 : absFret <= 0) continue;
    const leftPct = col / FRETS_VISIBLE * 100;
    const el = document.createElement('div');
    el.className = 'fb-fret-line';
    el.style.left = `${leftPct}%`;
    neckEl.appendChild(el);
  }

  // ── 포지션 점 & 프렛 번호 ──
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

  // 개방현이 보이는 경우: 개방 위치에 hint 원 표시
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

// ── 테스트 힌트 노트 렌더링 (최고음 1개) ─────────────────────
function renderTestNotes() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl || !_testItem) return;

  neckEl.querySelectorAll('.fb-note').forEach(el => el.remove());

  // Ch.2: 소스폼 ghost (hint 없음)
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    _renderTestNotesCh2(neckEl);
    return;
  }

  const { startFret } = _testItem;
  const hint = findHighestRoot(_testItem.block, startFret);
  if (!hint) return;

  // 7-fret 고정 뷰 기준 위치 계산
  const col = hint.absF - startFret;
  _testHint = { s: hint.s, col };  // checkAnswer 채점용 저장
  // 힌트 위치에 개방현 hint가 있으면 숨김
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
// ── 정답 채점 ──────────────────────────────────────────────────
function checkAnswer() {
  if (!_testItem || _testSubmitted) return;
  GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
  _testSubmitted = true;
  _recordScaleSubmit();


  // Ch.2: 타겟폼 기준으로 정답 set 구성
  const { startFret } = _testItem;
  let _answerBlock = _testItem.block;
  let _answerStartFret = startFret;
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    const { bi, forward } = _testItem;
    const isV        = _scaleKey === 'secondary-v';
    const isII       = _scaleKey === 'secondary-ii';
    const isVI       = _scaleKey === 'secondary-vi';
    const isIII      = _scaleKey === 'secondary-iii';
    const partnerMap = isVI ? PAIR_PARTNER_BI_VI : isII ? PAIR_PARTNER_BI_II : isIII ? PAIR_PARTNER_BI_III : isV ? PAIR_PARTNER_BI_V : PAIR_PARTNER_BI;
    const offsetMap  = isVI ? PAIR_STARTFRET_OFFSET_VI : isII ? PAIR_STARTFRET_OFFSET_II : isIII ? PAIR_STARTFRET_OFFSET_III : isV ? PAIR_STARTFRET_OFFSET_V : PAIR_STARTFRET_OFFSET;
    const offset = offsetMap[bi] || 0;
    const tgtBi = forward ? partnerMap[bi] : bi;
    const tgtScaleKey = (isII || isVI) ? (forward ? 'harmonic-minor' : 'major')
                      : isIII ? (forward ? 'natural-minor' : 'major')
                      : 'major';
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
  // 플레이어 dot 채점
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

  // 미찍은 정답 표시
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

  // 결과 표시
  const scoreEl  = document.getElementById('test-result-score');
  const detailEl = document.getElementById('test-result-detail');
  const nPlacedWrong = _placedNotes.size - nCorrect;   // 잘못 찍은 수
  const nMissed      = correctSet.size - nCorrect;      // 안 찍은 정답 수
  const nWrong       = nPlacedWrong + nMissed;          // 총 오답 수
  const _pct = correctSet.size > 0
    ? (nWrong === 0 ? 1 : nCorrect / (correctSet.size + nPlacedWrong))
    : 0;

  // 레벨별 퍼펙트 퀘스트: 100%정답(오답0) 제출 누적
  if (_scaleLevel > 0 && _pct === 1) {
    const s2 = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');
    const sp = s2.scale_perfect || {};
    sp[_scaleLevel] = (sp[_scaleLevel] || 0) + 1;
    s2.scale_perfect = sp;
    localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(s2));
    if (typeof incrementScalePerfect === 'function') incrementScalePerfect(_scaleLevel);
  }

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

  playQuizSound(nWrong === 0 ? 'correct' : 'wrong');

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

  // 버튼 상태 갱신 + 뒤로가기 표시
  const label = document.getElementById('test-submit-btn-label');
  if (label) label.textContent = '다시 풀기';
  const retryCost = document.getElementById('test-retry-peak-cost');
  if (retryCost) retryCost.style.display = '';
  document.getElementById('test-back-btn')?.classList.add('is-visible');
}

// ── 테스트 시작 ────────────────────────────────────────────────
function startTest() {
  GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
  const seq = buildNavSequence();
  if (seq.length === 0) return;

  // 상태 초기화
  clearTestDots();
  _testHint      = null;
  _testSubmitted = false;

  // 셔플백: 키/스케일 변경 시 새로 생성, 동일 키는 이어서 진행
  const bagKey = `scale-test:${_scaleKey}:${_rootNote}`;
  let bagItems = seq;
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
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

  // 7-fret 고정 넥 렌더 (스크롤 없이 고정 표시)
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
  const submitLabel = document.getElementById('test-submit-btn-label');
  if (submitLabel) submitLabel.textContent = '제출하기';
  const retryCostReset = document.getElementById('test-retry-peak-cost');
  if (retryCostReset) retryCostReset.style.display = 'none';
  document.getElementById('test-back-btn')?.classList.remove('is-visible');

  // 질문 텍스트 초기화 (애니메이션 이후 바뀌도록 숨김)
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
    } else if (_scaleKey === 'secondary-iii') {
      const { bi, forward } = _testItem;
      const partnerBi = PAIR_PARTNER_BI_III[bi];
      const nmFormNames = ['Gm폼','Em폼','Dm폼','Cm폼','Am폼'];
      if (forward) {
        questionHtml = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}에서<br>${names[_rootNote]} 내추럴 마이너 ${nmFormNames[partnerBi]}으로<br>전환해보세요!`;
      } else {
        questionHtml = `${names[_rootNote]} 내추럴 마이너 ${nmFormNames[partnerBi]}에서<br>${names[_rootNote]}메이저 ${FORM_NAMES[bi]}으로<br>전환해보세요!`;
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

  // 오버레이 열기
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

// ── 플레이어 dot 1개 추가 ────────────────────────────────────
function addTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  const [s, col] = key.split(',').map(Number);
  const leftPct  = (col + 0.5) / FRETS_VISIBLE * 100;
  const topPct   = (s  + 0.5) / STRINGS * 100;

  // 개방현 hint 숨김
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

// ── 플레이어 dot 1개 삭제 ────────────────────────────────────
function removeTestDot(key) {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;
  neckEl.querySelector(`.fb-note--placed[data-key="${key}"]`)?.remove();
  _placedNotes.delete(key);
  // 개방현 hint 복원
  neckEl.querySelector(`.fb-open-hint[data-open-hint="${key}"]`)
        ?.style.removeProperty('display');
}

// ── 전체 placed dot 초기화 ──────────────────────────────────
function clearTestDots() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (neckEl) {
    neckEl.querySelectorAll('.fb-note--placed').forEach(el => el.remove());
    neckEl.querySelectorAll('.fb-open-hint').forEach(el => el.style.removeProperty('display'));
  }
  _placedNotes.clear();
}

// ── 테스트 넥 이벤트 초기화 (DOMContentLoaded 이후 1회) ──────
function initTestTap() {
  const neckEl = document.getElementById('test-fb-full-neck');
  if (!neckEl) return;

  // pointerdown: 시작 좌표 저장
  let _tapStartX = 0, _tapStartY = 0;
  document.addEventListener('pointerdown', e => {
    _tapStartX = e.clientX;
    _tapStartY = e.clientY;
  });

  neckEl.addEventListener('pointerup', e => {
    const dx = Math.abs(e.clientX - _tapStartX);
    const dy = Math.abs(e.clientY - _tapStartY);
    if (dx > 8 || dy > 8) return;   // 거리 초과 시 취소
    if (_testSubmitted) return;      // 제출 후 입력 차단

    const rect = neckEl.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left) / rect.width  * FRETS_VISIBLE);
    const s    = Math.floor((e.clientY - rect.top)  / rect.height * STRINGS);

    if (col < 0 || col >= FRETS_VISIBLE || s < 0 || s >= STRINGS) return;

    // 힌트 위치 제외
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

// ── 폼 레이블 업데이트 ─────────────────────────────────────────
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

// ── Ch.2 secondary-iii: 내추럴 마이너 전환 애니메이션 ────────────────
function _transitionPairIII() {
  const neckEl = document.getElementById('fb-full-neck');
  if (!neckEl) return;
  _transitioning = true;

  const seq = buildNavSequence();
  const cur = seq[_navIdx];
  if (!cur) { _transitioning = false; return; }
  const sf = cur.startFret;
  const bi = cur.bi;
  const DURATION = 350;

  const activeEls = Array.from(neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)'));

  activeEls.forEach(el => {
    el.style.transition =
      'left ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1),' +
      'opacity ' + Math.round(DURATION * 0.6) + 'ms ease,' +
      'transform ' + DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';
  });
  void neckEl.offsetHeight;

  // ── C폼(bi=4): major C폼 ↔ natural-minor Cm폼 ─────────────────
  if (bi === 4) {
    if (!_pairTransitioned) {
      // 정방향: major C폼 → natural-minor Cm폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: s=0(3), s=1(7), s=4(6), s=5(3) — 모두 col1
        if ((s===0 && d==='3' && absf===sf+1) ||
            (s===1 && d==='7' && absf===sf+1) ||
            (s===4 && d==='6' && absf===sf+1) ||
            (s===5 && d==='3' && absf===sf+1)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=2: col3=6 → col2=b6
        if (s===2 && d==='6' && absf===sf+3) {
          const nf = sf+2;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: 'b6' });
        }
        // slide s=3: col3=3 → col2=b3
        if (s===3 && d==='3' && absf===sf+3) {
          const nf = sf+2;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: 'b3' });
        }
        // slide s=4: col3=7 → col2=b7
        if (s===4 && d==='7' && absf===sf+3) {
          const nf = sf+2;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: 'b7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+5, 1, 'b3');
        _spawnNote(neckEl, sf+4, 2, 'b7');
        _spawnNote(neckEl, sf+5, 5, 'b6');
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // 역방향: natural-minor Cm폼 → major C폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: 정방향 spawn 역방향 — s=1(b3 col5), s=2(b7 col4), s=5(b6 col5)
        if ((s===1 && d==='b3' && absf===sf+5) ||
            (s===2 && d==='b7' && absf===sf+4) ||
            (s===5 && d==='b6' && absf===sf+5)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=2: col2=b6 → col3=6
        if (s===2 && d==='b6' && absf===sf+2) {
          const nf = sf+3;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: '6' });
        }
        // slide s=3: col2=b3 → col3=3
        if (s===3 && d==='b3' && absf===sf+2) {
          const nf = sf+3;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: '3' });
        }
        // slide s=4: col2=b7 → col3=7
        if (s===4 && d==='b7' && absf===sf+2) {
          const nf = sf+3;
          el.style.left = ((nf+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = nf;
          el.classList.toggle('fb-note--open', nf===0);
          slidNodes.push({ el, finalDeg: '7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+1, 0, '3');
        _spawnNote(neckEl, sf+1, 1, '7');
        _spawnNote(neckEl, sf+1, 4, '6');
        _spawnNote(neckEl, sf+1, 5, '3');
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── A폼(bi=0): major A폼 ↔ natural-minor Am폼 ─────────────────
  // Am폼 startFret = major A폼 startFret + 1 (PAIR_STARTFRET_OFFSET_III[0]=1)
  // major A폼(major-pos1): s0:sf+2=5,sf+4=6 / s1:sf+2=2,sf+4=3,sf+5=4
  //   s2:sf+1=6,sf+3=7,sf+4=1 / s3:sf+1=3,sf+2=4,sf+4=5
  //   s4:sf+1=7,sf+2=1,sf+4=2 / s5:sf+2=5,sf+4=6
  // natural-minor Am폼(at sf+1): s0:sf+2=5,sf+3=b6,sf+5=b7
  //   s1:sf+2=2,sf+3=b3,sf+5=4 / s2:sf+2=b7,sf+4=1
  //   s3:sf+2=4,sf+4=5,sf+5=b6 / s4:sf+2=1,sf+4=2,sf+5=b3
  //   s5:sf+2=5,sf+3=b6,sf+5=b7
  if (bi === 0) {
    if (!_pairTransitioned) {
      // 정방향: major A폼 → natural-minor Am폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: s=2의 6(sf+1), s=3의 3(sf+1), s=4의 7(sf+1)
        if ((s===2 && d==='6'  && absf===sf+1) ||
            (s===3 && d==='3'  && absf===sf+1) ||
            (s===4 && d==='7'  && absf===sf+1)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+4(6) → sf+3 → b6
        if (s===0 && d==='6' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b6' });
        }
        // slide s=1: sf+4(3) → sf+3 → b3
        if (s===1 && d==='3' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b3' });
        }
        // slide s=2: sf+3(7) → sf+2 → b7
        if (s===2 && d==='7' && absf===sf+3) {
          el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+2;
          slidNodes.push({ el, finalDeg: 'b7' });
        }
        // slide s=5: sf+4(6) → sf+3 → b6
        if (s===5 && d==='6' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b6' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+5, 0, 'b7');  // 1번줄: 원래 6자리(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 3, 'b6');  // 4번줄: 5(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 4, 'b3');  // 5번줄: 2(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 5, 'b7');  // 6번줄: 원래 6자리(sf+4)+1 = sf+5
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // 역방향: natural-minor Am폼 → major A폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: 정방향 spawn 역방향 — s=0(b7,sf+5), s=3(b6,sf+5), s=4(b3,sf+5), s=5(b7,sf+5)
        if ((s===0 && d==='b7' && absf===sf+5) ||
            (s===3 && d==='b6' && absf===sf+5) ||
            (s===4 && d==='b3' && absf===sf+5) ||
            (s===5 && d==='b7' && absf===sf+5)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+3(b6) → sf+4 → 6
        if (s===0 && d==='b6' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '6' });
        }
        // slide s=1: sf+3(b3) → sf+4 → 3
        if (s===1 && d==='b3' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '3' });
        }
        // slide s=2: sf+2(b7) → sf+3 → 7
        if (s===2 && d==='b7' && absf===sf+2) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: '7' });
        }
        // slide s=5: sf+3(b6) → sf+4 → 6
        if (s===5 && d==='b6' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '6' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+1, 2, '6');  // 3번줄: sf+1
        _spawnNote(neckEl, sf+1, 3, '3');  // 4번줄: sf+1
        _spawnNote(neckEl, sf+1, 4, '7');  // 5번줄: sf+1
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── D폼(bi=3): major D폼 ↔ natural-minor Dm폼 ─────────────────
  // Dm폼 startFret = major D폼 startFret + 1 (PAIR_STARTFRET_OFFSET_III[3]=1)
  // major D폼(major-pos4): s0:sf+2=2,sf+4=3 / s1:sf+2=6,sf+4=7,sf+5=1
  //   s2:sf+1=3,sf+2=4,sf+4=5 / s3:sf+1=7,sf+2=1,sf+4=2
  //   s4:sf+2=5,sf+4=6 / s5:sf+2=2,sf+4=3,sf+5=4
  if (bi === 3) {
    if (!_pairTransitioned) {
      // 정방향: major D폼 → natural-minor Dm폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: s=1의 6(sf+2), s=2의 3(sf+1), s=3의 7(sf+1)
        if ((s===1 && d==='6'  && absf===sf+2) ||
            (s===2 && d==='3'  && absf===sf+1) ||
            (s===3 && d==='7'  && absf===sf+1)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+4(3) → sf+3 → b3
        if (s===0 && d==='3' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b3' });
        }
        // slide s=1: sf+4(7) → sf+3 → b7
        if (s===1 && d==='7' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b7' });
        }
        // slide s=4: sf+4(6) → sf+3 → b6
        if (s===4 && d==='6' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b6' });
        }
        // slide s=5: sf+4(3) → sf+3 → b3
        if (s===5 && d==='3' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b3' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+5, 0, '4');   // 1번줄: 원래 3자리(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 2, 'b6');  // 3번줄: 5(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 3, 'b3');  // 4번줄: 2(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 4, 'b7');  // 5번줄: 원래 6자리(sf+4)+1 = sf+5
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // 역방향: natural-minor Dm폼 → major D폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: 정방향 spawn 역방향 — s=0(4,sf+5), s=2(b6,sf+5), s=3(b3,sf+5), s=4(b7,sf+5)
        if ((s===0 && d==='4'  && absf===sf+5) ||
            (s===2 && d==='b6' && absf===sf+5) ||
            (s===3 && d==='b3' && absf===sf+5) ||
            (s===4 && d==='b7' && absf===sf+5)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+3(b3) → sf+4 → 3
        if (s===0 && d==='b3' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '3' });
        }
        // slide s=1: sf+3(b7) → sf+4 → 7
        if (s===1 && d==='b7' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '7' });
        }
        // slide s=4: sf+3(b6) → sf+4 → 6
        if (s===4 && d==='b6' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '6' });
        }
        // slide s=5: sf+3(b3) → sf+4 → 3
        if (s===5 && d==='b3' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '3' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+2, 1, '6');  // 2번줄: sf+2
        _spawnNote(neckEl, sf+1, 2, '3');  // 3번줄: sf+1
        _spawnNote(neckEl, sf+1, 3, '7');  // 4번줄: sf+1
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── G폼(bi=1): major G폼 ↔ natural-minor Gm폼 ─────────────────
  // Gm폼 startFret = major G폼 startFret + 1 (PAIR_STARTFRET_OFFSET_III[1]=1)
  // major G폼(major-pos2): s0:sf+2=6,sf+4=7,sf+5=1 / s1:sf+2=3,sf+3=4,sf+5=5
  //   s2:sf+1=7,sf+2=1,sf+4=2 / s3:sf+2=5,sf+4=6
  //   s4:sf+2=2,sf+4=3,sf+5=4 / s5:sf+2=6,sf+4=7,sf+5=1
  if (bi === 1) {
    if (!_pairTransitioned) {
      // 정방향: major G폼 → natural-minor Gm폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: s=0의 6(sf+2), s=1의 3(sf+2), s=2의 7(sf+1), s=5의 6(sf+2)
        if ((s===0 && d==='6'  && absf===sf+2) ||
            (s===1 && d==='3'  && absf===sf+2) ||
            (s===2 && d==='7'  && absf===sf+1) ||
            (s===5 && d==='6'  && absf===sf+2)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+4(7) → sf+3 → b7
        if (s===0 && d==='7' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b7' });
        }
        // slide s=3: sf+4(6) → sf+3 → b6
        if (s===3 && d==='6' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b6' });
        }
        // slide s=4: sf+4(3) → sf+3 → b3
        if (s===4 && d==='3' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b3' });
        }
        // slide s=5: sf+4(7) → sf+3 → b7
        if (s===5 && d==='7' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+6, 1, 'b6');  // 2번줄: 5(sf+5)+1 = sf+6
        _spawnNote(neckEl, sf+5, 2, 'b3');  // 3번줄: 2(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 3, 'b7');  // 4번줄: 원래 6자리(sf+4)+1 = sf+5
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // 역방향: natural-minor Gm폼 → major G폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: 정방향 spawn 역방향 — s=1(b6,sf+6), s=2(b3,sf+5), s=3(b7,sf+5)
        if ((s===1 && d==='b6' && absf===sf+6) ||
            (s===2 && d==='b3' && absf===sf+5) ||
            (s===3 && d==='b7' && absf===sf+5)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=0: sf+3(b7) → sf+4 → 7
        if (s===0 && d==='b7' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '7' });
        }
        // slide s=3: sf+3(b6) → sf+4 → 6
        if (s===3 && d==='b6' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '6' });
        }
        // slide s=4: sf+3(b3) → sf+4 → 3
        if (s===4 && d==='b3' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '3' });
        }
        // slide s=5: sf+3(b7) → sf+4 → 7
        if (s===5 && d==='b7' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+2, 0, '6');  // 1번줄: sf+2
        _spawnNote(neckEl, sf+2, 1, '3');  // 2번줄: sf+2
        _spawnNote(neckEl, sf+1, 2, '7');  // 3번줄: sf+1
        _spawnNote(neckEl, sf+2, 5, '6');  // 6번줄: sf+2
        _finishTransition(false);
      }, DURATION + 60);
    }
  }

  // ── E폼(bi=2): major E폼 ↔ natural-minor Em폼 ─────────────────
  // 오프셋 없음: roots 동일 sf (PAIR_STARTFRET_OFFSET_III[2] 미설정)
  // major E폼(major-pos3): s0:sf+1=7,sf+2=1,sf+4=2 / s1:sf+2=5,sf+4=6
  //   s2:sf+1=2,sf+3=3,sf+4=4 / s3:sf+1=6,sf+3=7,sf+4=1
  //   s4:sf+1=3,sf+2=4,sf+4=5 / s5:sf+1=7,sf+2=1,sf+4=2
  if (bi === 2) {
    if (!_pairTransitioned) {
      // 정방향: major E폼 → natural-minor Em폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: s=0의 7(sf+1), s=3의 6(sf+1), s=4의 3(sf+1), s=5의 7(sf+1)
        if ((s===0 && d==='7'  && absf===sf+1) ||
            (s===3 && d==='6'  && absf===sf+1) ||
            (s===4 && d==='3'  && absf===sf+1) ||
            (s===5 && d==='7'  && absf===sf+1)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=1: sf+4(6) → sf+3 → b6
        if (s===1 && d==='6' && absf===sf+4) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: 'b6' });
        }
        // slide s=2: sf+3(3) → sf+2 → b3
        if (s===2 && d==='3' && absf===sf+3) {
          el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+2;
          slidNodes.push({ el, finalDeg: 'b3' });
        }
        // slide s=3: sf+3(7) → sf+2 → b7
        if (s===3 && d==='7' && absf===sf+3) {
          el.style.left = ((sf+2+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+2;
          slidNodes.push({ el, finalDeg: 'b7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+5, 0, 'b3');  // 1번줄: 2(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 1, 'b7');  // 2번줄: 원래 6자리(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 4, 'b6');  // 5번줄: 5(sf+4)+1 = sf+5
        _spawnNote(neckEl, sf+5, 5, 'b3');  // 6번줄: 2(sf+4)+1 = sf+5
        _finishTransition(true);
      }, DURATION + 60);
    } else {
      // 역방향: natural-minor Em폼 → major E폼
      const slidNodes = [];
      activeEls.forEach(el => {
        const s    = parseInt(el.dataset.s);
        const d    = el.dataset.degree;
        const absf = parseInt(el.dataset.absf);
        // fade: 정방향 spawn 역방향 — s=0(b3,sf+5), s=1(b7,sf+5), s=4(b6,sf+5), s=5(b3,sf+5)
        if ((s===0 && d==='b3' && absf===sf+5) ||
            (s===1 && d==='b7' && absf===sf+5) ||
            (s===4 && d==='b6' && absf===sf+5) ||
            (s===5 && d==='b3' && absf===sf+5)) {
          el.style.opacity = '0';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        // slide s=1: sf+3(b6) → sf+4 → 6
        if (s===1 && d==='b6' && absf===sf+3) {
          el.style.left = ((sf+4+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+4;
          slidNodes.push({ el, finalDeg: '6' });
        }
        // slide s=2: sf+2(b3) → sf+3 → 3
        if (s===2 && d==='b3' && absf===sf+2) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: '3' });
        }
        // slide s=3: sf+2(b7) → sf+3 → 7
        if (s===3 && d==='b7' && absf===sf+2) {
          el.style.left = ((sf+3+0.5)/TOTAL_FRETS*100)+'%';
          el.dataset.absf = sf+3;
          slidNodes.push({ el, finalDeg: '7' });
        }
      });
      setTimeout(function() {
        neckEl.querySelectorAll('.fb-note:not(.fb-note--ghost)').forEach(el => {
          if (parseFloat(el.style.opacity) === 0) el.remove();
        });
        _applyDegMap(neckEl, {});
        slidNodes.forEach(({ el, finalDeg }) => {
          el.dataset.degree = finalDeg;
          el.classList.toggle('fb-note--root', finalDeg === 1);
        });
        _spawnNote(neckEl, sf+1, 0, '7');  // 1번줄: sf+1
        _spawnNote(neckEl, sf+1, 3, '6');  // 4번줄: sf+1
        _spawnNote(neckEl, sf+1, 4, '3');  // 5번줄: sf+1
        _spawnNote(neckEl, sf+1, 5, '7');  // 6번줄: sf+1
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
  // Ch.2 secondary-iii: 전환 전=메이저, 전환 후=내추럴 마이너 표시
  if (_scaleKey === 'secondary-iii') {
    const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
    const nmFormNames = ['Gm폼','Em폼','Dm폼','Cm폼','Am폼'];
    if (_pairTransitioned) {
      const partnerBi = PAIR_PARTNER_BI_III[bi];
      el.textContent = `${names[_rootNote]} 내추럴 마이너 ${nmFormNames[partnerBi]}`;
    } else {
      el.textContent = `${names[_rootNote]}메이저 ${FORM_NAMES[bi]}`;
    }
    return;
  }

  const title = SCALE_TITLES[_scaleKey] || _scaleKey;
  el.textContent = block.label || `${title} ${FORM_NAMES[bi] ?? (bi + 1 + '번폼')}`;
}

// ── 블록 인디케이터 업데이트 ──────────────────────────────────
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

// ── 이전/다음 버튼 (탐색 이동) ───────────────────────────────
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

// ── 키 버튼 레이블 갱신 ──────────────────────────────────────
function updateKeyLabels() {
  const names = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES;
  document.querySelectorAll('.key-btn').forEach((btn, i) => {
    btn.textContent = names[i];
  });
  updateStartTestBtnLabel();
}

function updateStartTestBtnLabel() {
  const label = document.getElementById('start-test-btn-label');
  if (!label) return;
  const keyName = (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote];
  label.textContent = `${keyName}key 테스트 시작`;
}

// ── 임시/기록 관련 함수 ──────────────────────────────────────
// ── 훈련 통계 ────────────────────────────────────────────────────
const TRAINING_STATS_KEY = 'training_stats';

/** 제출 완료 1회: today_sessions / total_completed 갱신 (streak/출석모달은 claimDailyAttendance()로 이전) */
function _recordScaleSubmit() {
  const today = new Date().toISOString().slice(0, 10);
  const stats = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');

  if (stats.today_date !== today) {
    stats.today_sessions = 0;
    stats.today_date     = today;
  }

  stats.today_sessions  = (stats.today_sessions  || 0) + 1;
  stats.total_completed = (stats.total_completed || 0) + 1;
  stats.scale_completed = (stats.scale_completed || 0) + 1; // 스케일 누적완료 퀘스트 카운터

  // 레벨 첫완료 퀘스트: 이 레벨 clear 기록(로컬 폴백) + 서버
  if (_scaleLevel > 0) {
    const cl = stats.scale_cleared || {};
    if (!cl[_scaleLevel]) {
      cl[_scaleLevel] = true;
      stats.scale_cleared = cl;
      if (typeof markScaleLevelCleared === 'function') markScaleLevelCleared(_scaleLevel);
    }
  }

  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  syncTrainingStatsToDB(); // 즉시 DB 반영 (fire-and-forget)

  if (typeof addXp === 'function') addXp(BEHAVE_XP.scale); // 행동형 XP: 스케일 세션 완료 (사일런트)
}

/** 페이지 이탈 시 훈련 시간 누적 (문제 미완료여도 기록) */
function _recordScaleSessionTime() {
  if (!_scaleSessionStart) return;
  const durationMin = (Date.now() - _scaleSessionStart) / 60000;
  if (durationMin < 0.1) return; // 6초 미만 무시
  const stats = JSON.parse(localStorage.getItem(TRAINING_STATS_KEY) || '{}');
  const _oldMin = stats.training_time_min || 0;
  stats.training_time_min = Math.round(
    (_oldMin + durationMin) * 10
  ) / 10;
  localStorage.setItem(TRAINING_STATS_KEY, JSON.stringify(stats));
  _scaleSessionStart = 0; // 중복 기록 방지

  // 행동형 XP: 훈련시간 10분당 (사일런트)
  if (typeof addXp === 'function') {
    const _timeXp = (Math.floor(stats.training_time_min / 10) - Math.floor(_oldMin / 10)) * BEHAVE_XP.per10min;
    if (_timeXp > 0) addXp(_timeXp);
  }

  // 리뷰 유도 조건: 스케일 연속 3분+ 연습 후 이탈
  if (typeof reviewQualify === 'function' && durationMin >= 3) reviewQualify('scale_3min');
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
    _playTap();
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

function initDegreeToggle() {
  const btn = document.getElementById('degree-toggle-btn');
  if (!btn) return;
  btn.addEventListener('pointerup', () => {
    _playTap();
    _showDegrees = !_showDegrees;
    btn.classList.toggle('active', _showDegrees);
    document.body.classList.toggle('degrees-on', _showDegrees);
    analytics.track('scale_degree_toggled', {
      scale_key: _scaleKey,
      to: _showDegrees ? 'on' : 'off',
    });
  });
}

// ── 키 선택 UI ───────────────────────────────────────────────
function initKeySelector() {
  const el = document.getElementById('key-selector');
  if (!el) return;

  KEY_NAMES.forEach((name, semitone) => {
    const btn = document.createElement('button');
    btn.className = 'key-btn' + (semitone === _rootNote ? ' key-btn--active' : '');
    btn.textContent = name;
    btn.addEventListener('pointerup', () => {
      _playTap();
      _rootNote = semitone;
      _navIdx   = 0;   // 키 변경 시 첫 블럭으로 이동
      el.querySelectorAll('.key-btn').forEach(b => b.classList.remove('key-btn--active'));
      btn.classList.add('key-btn--active');
      renderNotes();
      updateFormLabel();
      updateBlockIndicator();
      updateStartTestBtnLabel();
      analytics.track('scale_key_selected', {
        scale_key: _scaleKey,
        root_note: semitone,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[semitone],
      });
    });
    el.appendChild(btn);
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();

  const params = new URLSearchParams(location.search);
  _scaleKey = params.get('key') || 'major';
  _scaleLevel = parseInt(params.get('level'), 10) || 0;

  // Ch.2: 전환 버튼 표시
  if (_scaleKey === 'secondary-iv' || _scaleKey === 'secondary-v' || _scaleKey === 'secondary-ii' || _scaleKey === 'secondary-vi' || _scaleKey === 'secondary-iii') {
    const btn = document.getElementById('pair-transition-btn');
    if (btn) {
      btn.style.display = 'inline-flex';
      btn.addEventListener('pointerup', () => { _playTap(); transitionPair(); });
    }
  }

  measureDegreeOffsets();    // 도수 라벨 정렬 오프셋 1차 측정
renderFullNeck();
  renderNotes(false);        // 초기 렌더 — 애니메이션 없이 즉시 표시

  // 웹폰트(Pretendard) 로드 완료 후 재측정 → 정확한 메트릭으로 재렌더
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureDegreeOffsets();
      renderNotes(false);
    });
  }
  updateFormLabel();
  updateBlockIndicator();
  initArrows();
  initAccidentalToggle();
  initDegreeToggle();
  initKeySelector();
  updateStartTestBtnLabel();

  initTestTap();

  // 테스트 시작 버튼 (피크 2개 소모)
  document.getElementById('start-test-btn')?.addEventListener('pointerup', async () => {
    _playTap();
    _playSfx('pop.mp3');
    if (!(await consumePeak(2))) return;
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

  // 제출하기 / 다시 풀기 버튼
  document.getElementById('test-submit-btn')?.addEventListener('pointerup', async (e) => {
    if (e.currentTarget.disabled) return;
    if (_testSubmitted) {
      _playSfx('pop.mp3');
      if (!(await consumePeak(2))) return;
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

  // 테스트 오버레이 초기화 (X 버튼 / 뒤로가기 버튼 처리)
  const closeTestOverlay = () => {
    GuitarAudio.stop();   // 뷰 전환: 울리던 노트 페이드아웃 후 중단
    document.getElementById('scale-test-overlay')?.classList.remove('is-open');
  };

  // 제출 전 이탈은 소모한 피크가 그대로 날아감 → 확인 모달. 제출 후엔 바로 닫기.
  const requestCloseTest = (onLeave) => {
    if (isLeavePracticeOpen()) return;
    if (!_testSubmitted) { showLeavePracticeModal(onLeave); return; }
    onLeave();
  };

  document.getElementById('test-close-btn')?.addEventListener('pointerup', () => {
    requestCloseTest(closeTestOverlay);
  });
  document.getElementById('test-back-btn')?.addEventListener('pointerup', () => {
    _playSfx('pop.mp3');
    requestCloseTest(() => {
      analytics.track('scale_test_closed', {
        scale_key: _scaleKey,
        root_name: (_useFlat ? KEY_NAMES_FLAT : KEY_NAMES)[_rootNote],
      });
      closeTestOverlay();
    });
  });

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  analytics.track('scale_level_viewed', { key: _scaleKey, entry: _pushEntry || 'direct' });

  // 훈련 시간 측정 시작
  _scaleSessionStart = Date.now();

  // 브라우저 탭 닫기 / 뒤로가기 등 예외 경로 처리
  window.addEventListener('pagehide', _recordScaleSessionTime, { once: true });
});
