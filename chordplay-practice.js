'use strict';

// 진행 데이터: progression-data.js + progression.js 에서 window.PROGRESSIONS 로 로드

const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_TO_SHARP   = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

function _getChordName(rootKey, semitones, quality, bass, tension) {
  const names   = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const noteIdx = (rootKey + semitones + 12) % 12;
  const note    = names[noteIdx];
  const sfx     = { M: '', m: 'm', '7': '7', M7: 'M7', m7: 'm7', dim: 'dim', dim7: 'dim7', aug: 'aug', sus4: 'sus4', sus2: 'sus2', '7sus4': '7sus4', m6: 'm6', '6': '6', 'm7(b5)': 'm7(b5)' };
  let result    = note + (sfx[quality] ?? '') + (tension || '');
  if (bass != null) {
    const bassIdx = (noteIdx + bass) % 12;
    result += '/' + names[bassIdx];
  }
  return result;
}

// ── 상태 ────────────────────────────────────────────────────
let _prog               = null;
let _key                = 0;
let _useFlat            = false;
let _showFingers        = false; // 운지 손가락 번호 표시 on/off
let _bpm                = 80;
let _playing            = false;
let _starting           = false; // 시작 비동기 구간 재진입 가드
let _playSession        = 0;     // 재생 세션 토큰 (정지/재시작 시 예약 콜백 무효화)
let _currentDisplayStep = 0;
let _masterBeat         = 0;     // 재생 시작 후 누적 비트 수
let _playStartMs        = 0;     // 재생 시작 시각 (훈련시간 측정)
let _attendanceCountedThisVisit = false; // 이번 방문 내 출석 카운트 1회 제한 (재생-정지 반복 방지)
let _schedTimer         = null;  // 오디오클럭 lookahead 스케줄러 (무드리프트)
let _beatNextTime       = 0;     // 다음 비트의 절대 오디오 시각(초)
const SCHED_LOOKAHEAD   = 0.1;
const SCHED_TICK_MS     = 25;
// _prevCenterFret 제거됨 — cyclic DP로 대체

// ── 캔버스 상수 (voicing-canvas.js 모듈 위임) ───────────────────────
const _BASE_W = VoicingCanvas.BASE_W;
const _BASE_H = VoicingCanvas.BASE_H;

// ── 보이싱 사운드 재생 ───────────────────────────────────────
// 캔버스 인덱스 순서: 0=1번줄(e4=64) … 5=6번줄(E2=40)
const _OPEN_MIDI = [64, 59, 55, 50, 45, 40];

function _voicingMidis(voicing) {
  if (!voicing) return [];
  // chordsLibrary frets는 절대 프렛 → MIDI = 개방현 + 절대프렛 (offset 불필요)
  const midis = [];
  // 6번줄(s=5) → 1번줄(s=0) 순서로 스트럼
  for (let s = 5; s >= 0; s--) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(_OPEN_MIDI[s] + f);
  }
  return midis;
}

// 다이어그램 탭 → 현재 표시 중인 코드 즉시 스트럼 (재생 중 스트럼과 동일한 간격)
async function _playCurrentChord() {
  if (typeof GuitarAudio === 'undefined') return;
  const cached = _stepCache && _stepCache[_currentDisplayStep];
  const midis  = _voicingMidis(cached && cached.voicing);
  if (!midis.length) return;
  if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
  GuitarAudio.strumNotes(midis, 0.008);
}

// 절대 오디오 시각 t에 스트럼 (드리프트 없는 스케줄용). dur 동안 울린 뒤 감쇄.
function _strumVoicingAt(voicing, t, dur) {
  const midis = _voicingMidis(voicing);
  if (midis.length) GuitarAudio.strumAt(midis, 0.008, t, dur, 0.3);
}

// 보이싱 후보 조회 (progression-voicings.js 기반)
function _getCandidates(rootSemitone, quality, bass, tension) {
  if (typeof ProgressionVoicings === 'undefined') return [];
  return ProgressionVoicings.getCandidates(rootSemitone, quality, _key, bass, tension);
}

// 캔버스 드로잉 → voicing-canvas.js 모듈(VoicingCanvas) 위임
function _drawVoicingCanvas(canvas, voicing, chordName, ratio) {
  VoicingCanvas.draw(canvas, voicing, { chordName, ratio, transparent: true, fingerNumMode: _showFingers });
}

// 현재 표시 중인 슬롯 4개를 재드로우 (재생 정지 없이 손가락번호 토글용)
function _redrawAllSlots() {
  if (!_slotDoms || !_slotData) return;
  _slotDoms.forEach((dom, i) => {
    const canvas = dom.querySelector('canvas');
    const d = _slotData[i];
    if (canvas && d) requestAnimationFrame(() => _redrawCanvas(canvas, dom, d.voicing, d.chordName));
  });
}

// ── 오디오 컨텍스트 (Tone 동기화용) ──────────────────────────
const _MetroCtx = window.AudioContext || window.webkitAudioContext;
let   _metroCtx = null;

// ── 재생 로직 ────────────────────────────────────────────────
async function _stopPlay(options = {}) {
  _playSession++;   // 예약된 setTimeout/countin 콜백 전부 무효화
  _starting = false;
  if (_schedTimer) { clearInterval(_schedTimer); _schedTimer = null; }
  // 훈련시간 적립 (재생한 만큼) + 10초 이상 재생 후 정지 시 출석 인정
  if (_playStartMs) {
    const _elapsedSec = (Date.now() - _playStartMs) / 1000;
    if (typeof recordTrainingTime === 'function') recordTrainingTime(_elapsedSec);
    if (_elapsedSec >= 10 && !_attendanceCountedThisVisit && typeof recordTrainingAttendance === 'function') {
      _attendanceCountedThisVisit = true;
      recordTrainingAttendance();
    }
  }
  _playStartMs = 0;
  if (typeof DrumAudio !== 'undefined' && DrumAudio.stop) DrumAudio.stop();
  const stopPromise = GuitarAudio.stop({ wait: options.wait === true });
  _playing    = false;
  window._chordSoundPlaying = false;
  _masterBeat = 0;
  _updateActiveCard(-1);
  _updatePlayBtn();
  if (options.wait) await stopPromise;
}

// 한 박자(beatPhase) 분량의 드럼 step을 절대시각 t에 스케줄 (DRUM_SETS[1])
function _drumBeatAt(beatPhase, t, beatSec) {
  if (typeof DrumAudio === 'undefined' || !window.DRUM_SETS) return;
  const set = window.DRUM_SETS[1];
  if (!set) return;
  const stepsPerBeat = set.steps / 4;          // 8 step / 4박 = 2
  const stepSec = beatSec / stepsPerBeat;
  for (let k = 0; k < stepsPerBeat; k++) {
    const step = beatPhase * stepsPerBeat + k;
    const tt = t + k * stepSec;
    if ((set.kick  || []).includes(step)) DrumAudio.hit('kick',  tt);
    if ((set.snare || []).includes(step)) DrumAudio.hit('snare', tt);
    if ((set.hat   || []).includes(step)) DrumAudio.hit('hat',   tt);
  }
}

// 비트 1개 스케줄 (오디오=절대시각, 비주얼=시각 맞춰 setTimeout)
function _scheduleBeat(beatIndex, t) {
  const beatPhase = beatIndex % 4;
  const beatSec   = 60 / _bpm;
  const count     = _prog.steps.length;
  const now       = Tone.now();
  // 코드당 박수: 8코드 진행은 1/2마디(2박)마다, 그 외 1마디(4박)마다 코드 전환
  const bpc        = (count === 8) ? 2 : 4;
  const chordPhase = beatIndex % bpc;

  // 드럼 (절대시각)
  _drumBeatAt(beatPhase, t, beatSec);

  // 코드 경계: 스트럼 (절대시각, 코드 지속만큼 울림)
  if (chordPhase === 0) {
    const currDomIdx = _slotRoles ? _slotRoles.indexOf(2) : -1;
    const voicing    = (currDomIdx >= 0 && _slotData) ? _slotData[currDomIdx]?.voicing : null;
    _strumVoicingAt(voicing, t, beatSec * bpc);
  }

  // 코드 마지막 박 + 0.5박에 다음 코드 슬라이드
  if (chordPhase === bpc - 1) {
    const nextChordIdx = (Math.floor(beatIndex / bpc) + 1) % count;
    const slideDelay = Math.max(0, (t + beatSec * 0.5 - now) * 1000);
    setTimeout(() => {
      if (!_playing) return;
      _updateActiveCard(nextChordIdx);
    }, slideDelay);
  }
}

// 오디오클럭 lookahead 스케줄러 — 절대시각 누적 → 무드리프트
function _masterTick() {
  if (!_playing || !_prog) return;
  const now = Tone.now();
  while (_beatNextTime < now + SCHED_LOOKAHEAD) {
    _scheduleBeat(_masterBeat, _beatNextTime);
    _masterBeat++;
    _beatNextTime += 60 / _bpm; // 라이브 BPM
  }
}

// 4비트 hat 카운트인 (오디오클럭) 후 onComplete(startTime) 호출
function _runCountIn(onComplete) {
  const beatSec = 60 / _bpm;
  const anchor  = Tone.now() + 0.12;

  // 시작 전 4박 카운트인 — 소리(하이햇)만, 점 표시는 없음
  for (let i = 0; i < 4; i++) {
    const t = anchor + i * beatSec;
    if (typeof DrumAudio !== 'undefined') DrumAudio.hit('hat', t);
  }

  const startTime = anchor + 4 * beatSec;
  const startDelay = Math.max(0, (startTime - Tone.now()) * 1000);
  setTimeout(() => {
    if (!_playing) return;
    onComplete(startTime);
  }, startDelay);
}

// 연습 화면은 처음부터 열려 있음 — 피크(5)는 코드반주 훈련 목록(chordplay.js)에서 진입할 때 소모. 이후 재생은 무한.
let _practiceUnlocked = true;
window._leaveGuardActive = () => _practiceUnlocked; // shared.js 사이드바 네비 이탈 확인용
window._clearLeaveGuard = () => {}; // shared.js 사이드바 네비로 이탈 확정 시 호출(언락 상태를 따로 저장하지 않으므로 할 일 없음)

async function togglePlay() {
  if (!_practiceUnlocked) return;
  if (_playing || _starting) {
    await _stopPlay();
    return;
  }
  _starting = true;
  const sess = _playSession; // 이 시작 시도의 세션. 중간에 정지/키변경되면 폐기
  // _metroCtx와 Tone.js 동기화 (첫 재생 시)
  if (!_metroCtx) _metroCtx = new _MetroCtx();
  if (_metroCtx.state === 'suspended') await _metroCtx.resume();
  await GuitarAudio.syncContext(_metroCtx);
  // 드럼도 동일 컨텍스트로 재생성 후 샘플 로드 대기
  if (typeof DrumAudio !== 'undefined') {
    DrumAudio.rebuild();
    try { await DrumAudio.ready(); } catch (e) {}
  }
  // await 동안 정지/재시작/키변경됐으면 이 시도 폐기
  if (sess !== _playSession || !_starting) { _starting = false; return; }

  _starting   = false;
  _playing    = true;
  window._chordSoundPlaying = true; // 음량조절 A코드 프리뷰 중복재생 방지용 전역 플래그
  _masterBeat = 0;
  // 재생 시작 = 첫 코드로 복귀. 멀티스텝 슬라이드는 슬롯 스택 정합성이 깨져
  // (연속 동일코드 시 2번째를 첫 코드로 오인) → 클린 리빌드로 정확히 step0 리셋.
  if (_currentDisplayStep !== 0) {
    _currentDisplayStep = 0;
    _renderStage();
  }
  _playStartMs = Date.now(); // 훈련시간 측정 시작
  analytics.track('progression_detail_played', { prog_id: _prog?.id, key: _getKeyDisplayName(_key), bpm: _bpm });
  _updatePlayBtn();
  const playSess = _playSession;
  _runCountIn((startTime) => {
    if (!_playing || playSess !== _playSession) return;
    _masterBeat   = 0;
    _beatNextTime = startTime;
    _schedTimer   = setInterval(_masterTick, SCHED_TICK_MS);
  });
}

const BPM_MIN = 10;   // 앱 중심 규칙: 통합 10~300 BPM
const BPM_MAX = 300;
let _bpmItemH = 30; // 실제 렌더 높이로 아래서 갱신됨 (뷰포트별 CSS 크기 변화 대응)

function _initBpmWheel() {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  wheel.innerHTML = '';
  for (let b = BPM_MIN; b <= BPM_MAX; b++) {
    const item = document.createElement('div');
    item.className = 'progd-bpm-item';
    item.dataset.bpm = b;
    item.textContent = b;
    item.addEventListener('pointerup', () => _setBpm(b));
    wheel.appendChild(item);
  }
  if (wheel.firstElementChild) _bpmItemH = wheel.firstElementChild.getBoundingClientRect().height; // offsetHeight는 정수 반올림 → idx 큰 값에서 오차 누적
  _scrollBpmWheel(_bpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / _bpmItemH);
    const newBpm = BPM_MIN + idx;
    if (newBpm !== _bpm) {
      _bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, newBpm));
      _updateBpmActiveItem();
    }
  }, { passive: true });

  enableMouseDragScroll(wheel); // 웹 브라우저 마우스 드래그 지원
}

function _scrollBpmWheel(bpm, smooth) {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  const idx = bpm - BPM_MIN;
  wheel.scrollTo({ top: idx * _bpmItemH, behavior: smooth ? 'smooth' : 'instant' });
  _updateBpmActiveItem();
}

function _updateBpmActiveItem() {
  const wheel = document.getElementById('detail-bpm-wheel');
  if (!wheel) return;
  wheel.querySelectorAll('.progd-bpm-item').forEach(el => {
    el.classList.toggle('progd-bpm-item--active', parseInt(el.dataset.bpm) === _bpm);
  });
}

function _setBpm(bpm) {
  _bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
  _scrollBpmWheel(_bpm, true);
}

function changeBpm(delta) {
  _playTap();
  _setBpm(_bpm + delta);
}

function _updatePlayBtn() {
  const btn = document.getElementById('detail-play-btn');
  if (!btn) return;
  btn.innerHTML = _playing
    ? '<i class="ph-fill ph-stop"></i>'
    : '<i class="ph-fill ph-play"></i>';
}

function _updateActiveCard(idx) {
  if (idx < 0) {
    // 정지: 스텝 0으로 전체 리셋
    _currentDisplayStep = 0;
    _renderStage();
  } else {
    // 재생 중 스텝 진행: 애니메이션
    _currentDisplayStep = idx;
    _advanceStage(idx);
  }
}

// ── 뒤로가기 ────────────────────────────────────────────────
// 뒤로가기 요청: 연습 잠금해제 상태면 경고 모달, 아니면 바로 나감.
function requestBack() {
  _playTap();
  if (isLeavePracticeOpen()) return;
  if (_practiceUnlocked) { showLeavePracticeModal(goBack); return; }
  goBack();
}

async function goBack() {
  await _stopPlay({ wait: true });
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'chordplay.html'; }, 260);
  } else {
    location.href = 'chordplay.html';
  }
}

// ── UI 렌더 ──────────────────────────────────────────────────
// 키 셀렉터 라벨 — scale-level과 동일: #/b 토글과 무관하게 항상 같은 모양.
// 반음 키는 C#/Db 두 이름을 슬래시 기준 대각선(왼쪽 위 # · 오른쪽 아래 b)으로 함께 표기, 자연음 키는 한 줄.
function _keyBtnHtml(k) {
  const a = KEY_NAMES_SHARP[k], b = KEY_NAMES_FLAT[k];
  if (a === b) return a;
  return `<span class="key-acc key-acc--a">${a}</span><span class="key-acc key-acc--b">${b}</span>`;
}
// 키를 고르면 그 키의 기본 #/b로 토글 자동 전환: 자연음 키는 #, 반음 키는 b. 예외: F는 b(B♭이 있어서)
function _defaultFlatForKey(k) {
  return k === 5 || KEY_NAMES_SHARP[k] !== KEY_NAMES_FLAT[k];
}
function _syncAccidentalToKey(k) {
  _useFlat = _defaultFlatForKey(k);
  document.getElementById('detail-acc-sharp')?.classList.toggle('active', !_useFlat);
  document.getElementById('detail-acc-flat')?.classList.toggle('active',  _useFlat);
}

function _renderKeyStrip() {
  const strip = document.getElementById('detail-key-strip');
  if (!strip) return;
  if (!strip.querySelector('.key-btn')) {
    for (let k = 0; k < 12; k++) {
      const btn = document.createElement('button');
      btn.className = 'key-btn';
      btn.dataset.key = k;
      btn.innerHTML = _keyBtnHtml(k);
      btn.classList.toggle('key-btn--split', KEY_NAMES_SHARP[k] !== KEY_NAMES_FLAT[k]);
      btn.addEventListener('pointerup', async () => {
        _playTap();
        if (k === _key) return;
        await _stopPlay({ wait: true }); // 재생/예약 완전 정지 후 키 적용 (레이스 방지)
        _key = k;
        _syncAccidentalToKey(k); // 이 키의 기본 #/b로 토글 맞춤
        _renderKeyStrip();
        _renderStage();
      });
      strip.appendChild(btn);
    }
  }
  // 라벨은 #/b와 무관(항상 같은 모양)이라 다시 그리지 않음 — 선택 표시만 갱신
  strip.querySelectorAll('.key-btn').forEach(b => b.classList.toggle('key-btn--active', Number(b.dataset.key) === _key));
}

let _stageRO    = null; // ResizeObserver 인스턴스
let _slotDoms   = null; // [dom0, dom1, dom2] — 고정 슬롯 DOM 요소
let _slotRoles  = null; // _slotRoles[domIdx] = 0(prev)|1(current)|2(next)
let _slotData   = null; // _slotData[domIdx] = { voicing, chordName }
let _stepCache  = null; // _stepCache[stepIdx] = { voicing, chordName } — 스텝별 보이싱 캐시

// 캔버스 픽셀 크기 계산 + 드로잉 — 폭 기준 크기가 wrap(슬롯) 높이를 넘으면 비율 유지한 채 축소
// (wrap은 top:0/bottom:0으로 .progd-chord-view-inner 전체 높이를 그대로 물려받음)
function _redrawCanvas(canvas, wrap, voicing, chordName) {
  const dpr  = window.devicePixelRatio || 1;
  let cssW = wrap.offsetWidth;
  if (!cssW) return;
  let cssH = cssW * _BASE_H / _BASE_W;
  const availH = wrap.offsetHeight;
  if (availH && cssH > availH) {
    cssW = cssW * (availH / cssH);
    cssH = availH;
  }
  const ratio = (cssW * dpr) / _BASE_W;
  _drawVoicingCanvas(canvas, voicing, chordName, ratio);
  canvas.style.width  = Math.round(cssW) + 'px';
  canvas.style.height = Math.round(cssH) + 'px';
}

// 특정 슬롯 캔버스 업데이트 (캐시 우선 사용)
function _drawSlot(domIdx, stepIdx) {
  const count   = _prog.steps.length;
  const safeIdx = ((stepIdx % count) + count) % count;
  const cached  = _stepCache && _stepCache[safeIdx];
  const voicing   = cached ? cached.voicing   : null;
  const chordName = cached ? cached.chordName : '';
  _slotData[domIdx] = { voicing, chordName };
  const canvas = _slotDoms[domIdx].querySelector('canvas');
  requestAnimationFrame(() => _redrawCanvas(canvas, _slotDoms[domIdx], voicing, chordName));
}

// domIdx 슬롯의 역할(role) 반환
function _getSlotByRole(role) {
  return _slotRoles.indexOf(role);
}

// 슬롯 역할명 (인덱스 0~3)
const _ROLE_NAMES = ['far-left', 'prev', 'current', 'next'];

// 스텝별 보이싱 캐시 빌드 — Cyclic DP
//
// 규칙:
//   1. 순환 경로(마지막→첫 wrap-around 포함) 전체 이동 비용 최소화
//   2. 같은 줄 이동 우선 — 줄 변경 시 CROSS_PENALTY 가산
//   3. 동률이면 더 낮은 프렛 보이싱 우선
//   4. 결과를 _stepCache에 고정 → 재생 반복 중 변경 없음
function _buildStepCache() {
  if (!_prog) return;
  const count = _prog.steps.length;
  if (count === 0) { _stepCache = []; return; }

  const CROSS_PENALTY       = 2;
  const HIGH_FRET_THRESH    = 5;   // 이 프렛 초과부터 페널티 시작
  const HIGH_FRET_FACTOR    = 0.8; // 초과 프렛당 페널티 (튜닝용)
  const THIN_ROOT_PENALTY   = 2.5; // 3번줄 이상 근음 페널티 (튜닝용)
  const FOUR_STR_PENALTY    = 2.5; // 4번줄 근음 페널티
  const LOW_FRET_BONUS      = 1.5; // fret 0~1 오픈 포지션 보너스 (튜닝용)
  const fret = v => (v && v.fretNumber) || 0;

  // 보이싱의 근음 줄 인덱스 (6번줄=5, 5번줄=4, 4번줄=3, …)
  function rootStr(v) {
    if (!v || !v.frets) return -1;
    for (let s = 5; s >= 0; s--) {
      if (v.frets[s] !== null) return s;
    }
    return -1;
  }

  // ii→V 쉘 보이싱 연결 보너스: m7(b5) 쉘(6번줄) 다음 V7가 같은 자리(5번줄 alt shape)로 이어지면 가산점
  const IIV_SHELL_BONUS   = 3;
  const NOTE_SEMI = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
  const M7B5_SHELL_SHAPE  = [null, 0, 1, 1, null, 1];  // r+1 x r+1 r+1 r x (rootStr:6)
  const DOM7_PLAIN_SHAPE  = [0, 2, 0, 2, 0, null];      // x r r+2 r r+2 r   (rootStr:5)
  const DOM7_ALT_SHAPE    = [null, 0, 2, 1, 2, null];   // x r+2 r+1 r+2 r x (rootStr:5)
  function _relShape(frets) {
    if (!frets) return null;
    const vals = frets.filter(f => f !== null);
    if (!vals.length) return frets;
    const min = Math.min(...vals);
    return frets.map(f => f === null ? null : f - min);
  }
  function _shapeEq(a, b) {
    return !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
  }
  function _rootSemi(v) {
    const m = v && v.name && v.name.match(/^([A-G][#b]?)/);
    return m ? NOTE_SEMI[m[1]] : null;
  }

  // 이동 비용: 프렛 차 + 줄 변경 페널티 + 고프렛 페널티 + 3번줄↑ 근음 페널티 + 4번줄 페널티 - 오픈 포지션 보너스
  function dist(a, b) {
    const hfp  = Math.max(0, fret(b) - HIGH_FRET_THRESH) * HIGH_FRET_FACTOR;
    const trp  = rootStr(b) < 3 ? THIN_ROOT_PENALTY : 0;
    const fsp  = rootStr(b) === 3 ? FOUR_STR_PENALTY : 0;
    const lfb  = fret(b) <= 1 ? LOW_FRET_BONUS : 0;

    // ii→V 쉘 연결: a가 m7(b5) 6번줄 쉘 + b가 완전4도 위(V7) + rootStr5 7 보이싱이면
    // alt shape(같은 자리 연결)는 가산점, plain shape는 감점 — alt가 우선 선택되도록.
    let iiVBias = 0;
    if (a && b && a.quality === 'm7(b5)' && b.quality === '7' &&
        rootStr(b) === 4 && _shapeEq(_relShape(a.frets), M7B5_SHELL_SHAPE) &&
        ((_rootSemi(b) - _rootSemi(a) + 12) % 12) === 5) {
      const bShape = _relShape(b.frets);
      if (_shapeEq(bShape, DOM7_ALT_SHAPE))        iiVBias = -IIV_SHELL_BONUS;
      else if (_shapeEq(bShape, DOM7_PLAIN_SHAPE))  iiVBias =  IIV_SHELL_BONUS;
    }

    return Math.abs(fret(a) - fret(b)) + (rootStr(a) !== rootStr(b) ? CROSS_PENALTY : 0) + hfp + trp + fsp - lfb + iiVBias;
  }

  // 각 스텝의 후보 목록 수집
  const stepData = _prog.steps.map(step => {
    const chordName    = _getChordName(_key, step.semitones, step.quality, step.bass, step.tension);
    const rootSemitone = (_key + step.semitones + 120) % 12;
    const candidates   = _getCandidates(rootSemitone, step.quality, step.bass, step.tension);
    return { chordName, candidates };
  });

  // 후보 없는 스텝 있으면 fallback (null voicing)
  if (stepData.some(s => !s.candidates.length)) {
    _stepCache = stepData.map(s => ({ voicing: s.candidates[0] || null, chordName: s.chordName }));
    return;
  }

  const cands = stepData.map(s => s.candidates);

  // ① 첫 코드: 최저 fretNumber 후보 고정
  const firstVoicing = cands[0].reduce((a, b) => fret(a) <= fret(b) ? a : b);

  if (count === 1) {
    _stepCache = [{ voicing: firstVoicing, chordName: stepData[0].chordName }];
    return;
  }

  // ② Cyclic DP (chord 0 고정, chord 1..n-1 최적화)
  // dp[j]      = chord i를 후보 j로 선택했을 때 chord 0→i까지 누적 최소 비용
  // track[i][j] = chord i가 j일 때 chord i-1의 최적 후보 인덱스

  let dp = cands[1].map(c => dist(firstVoicing, c));
  const track = new Array(count);
  track[1] = cands[1].map(() => 0);

  for (let i = 2; i < count; i++) {
    const ndp = [], ntr = [];
    for (let j = 0; j < cands[i].length; j++) {
      let best = Infinity, bk = 0;
      for (let k = 0; k < cands[i - 1].length; k++) {
        const cost = dp[k] + dist(cands[i - 1][k], cands[i][j]);
        if (cost < best || (cost === best && fret(cands[i - 1][k]) < fret(cands[i - 1][bk]))) {
          best = cost; bk = k;
        }
      }
      ndp.push(best); ntr.push(bk);
    }
    dp = ndp; track[i] = ntr;
  }

  // ③ wrap-around: 마지막 코드 → 첫 코드 이동 비용 포함해 bestJ 결정
  const totalCosts = cands[count - 1].map((c, jN) => dp[jN] + dist(c, firstVoicing));
  let bestJ = 0;
  for (let j = 1; j < totalCosts.length; j++) {
    if (totalCosts[j] < totalCosts[bestJ] ||
        (totalCosts[j] === totalCosts[bestJ] && fret(cands[count - 1][j]) < fret(cands[count - 1][bestJ]))) {
      bestJ = j;
    }
  }

  // ④ 역추적
  const choices = new Array(count);
  choices[count - 1] = bestJ;
  for (let i = count - 1; i >= 2; i--) {
    choices[i - 1] = track[i][choices[i]];
  }

  _stepCache = stepData.map((s, i) => ({
    voicing:   i === 0 ? firstVoicing : cands[i][choices[i]],
    chordName: s.chordName,
  }));
}

// 스테이지 초기화 (전체 재구성) — 4슬롯 모델
function _renderStage() {
  if (!_prog) return;
  const row = document.getElementById('detail-chord-row');
  if (!row) return;
  row.innerHTML = '';

  if (_stageRO) { _stageRO.disconnect(); _stageRO = null; }

  _buildStepCache(); // 보이싱 캐시 선빌드

  _slotDoms  = [];
  _slotRoles = [0, 1, 2, 3]; // dom0=far-left, dom1=prev, dom2=current, dom3=next
  _slotData  = [null, null, null, null];

  for (let i = 0; i < 4; i++) {
    const wrap   = document.createElement('div');
    wrap.className = 'progd-slot progd-slot--' + _ROLE_NAMES[i];
    const canvas = document.createElement('canvas');
    canvas.className = 'progd-chord-canvas';
    wrap.appendChild(canvas);
    row.appendChild(wrap);
    _slotDoms.push(wrap);
  }

  const cur   = _currentDisplayStep;
  const count = _prog.steps.length;
  _drawSlot(0, (cur - 2 + count) % count); // far-left
  _drawSlot(1, (cur - 1 + count) % count); // prev
  _drawSlot(2, cur);                         // current
  _drawSlot(3, (cur + 1) % count);           // next

  if (window.ResizeObserver) {
    _stageRO = new ResizeObserver(() => {
      _slotDoms.forEach((el, i) => {
        if (!_slotData[i]) return;
        const canvas = el.querySelector('canvas');
        _redrawCanvas(canvas, el, _slotData[i].voicing, _slotData[i].chordName);
      });
    });
    _slotDoms.forEach(el => _stageRO.observe(el));
  }
}

// 스텝 진행 애니메이션 (왼쪽 방향 무한 휠피커)
function _advanceStage(newCurrent) {
  if (!_slotDoms) { _renderStage(); return; }

  const count   = _prog.steps.length;
  const domFL   = _getSlotByRole(0); // far-left (완전히 화면 밖)
  const domPrev = _getSlotByRole(1); // prev
  const domCurr = _getSlotByRole(2); // current
  const domNext = _getSlotByRole(3); // next

  // 1. far-left 슬롯 → far-right 위치로 즉시 스냅 (완전히 보이지 않는 상태에서 이동)
  _slotDoms[domFL].className = 'progd-slot progd-slot--far-right progd-no-transition';

  // 2. 새 next+1 콘텐츠 미리 그리기 (opacity 0 상태라 보이지 않음)
  _drawSlot(domFL, (newCurrent + 1) % count);

  // 3. 강제 reflow → far-right 스냅 확정
  void _slotDoms[domFL].getBoundingClientRect();

  // 4. 4슬롯 전체 동시 슬라이드 (CSS transition)
  //    far-right → next (오른쪽에서 등장)
  //    prev      → far-left (왼쪽으로 퇴장)
  //    current   → prev
  //    next      → current
  _slotDoms[domFL].className   = 'progd-slot progd-slot--next';
  _slotDoms[domPrev].className = 'progd-slot progd-slot--far-left';
  _slotDoms[domCurr].className = 'progd-slot progd-slot--prev';
  _slotDoms[domNext].className = 'progd-slot progd-slot--current';

  // 5. 역할 갱신
  _slotRoles[domFL]   = 3; // next
  _slotRoles[domPrev] = 0; // far-left
  _slotRoles[domCurr] = 1; // prev
  _slotRoles[domNext] = 2; // current
}

// 역방향(이전 코드) 애니 — 스와이프 우→좌 반대용 (_advanceStage 미러)
// far-left 슬롯엔 이미 (cur-2) 콘텐츠가 있어 그대로 prev로 들어옴
function _advanceStageBack(newCurrent) {
  if (!_slotDoms) { _renderStage(); return; }
  const count   = _prog.steps.length;
  const domFL   = _getSlotByRole(0);
  const domPrev = _getSlotByRole(1);
  const domCurr = _getSlotByRole(2);
  const domNext = _getSlotByRole(3);

  // 슬라이드: far-left→prev, prev→current, current→next, next→far-right(퇴장)
  _slotDoms[domFL].className   = 'progd-slot progd-slot--prev';
  _slotDoms[domPrev].className = 'progd-slot progd-slot--current';
  _slotDoms[domCurr].className = 'progd-slot progd-slot--next';
  _slotDoms[domNext].className = 'progd-slot progd-slot--far-right';

  _slotRoles[domFL]   = 1; // prev
  _slotRoles[domPrev] = 2; // current
  _slotRoles[domCurr] = 3; // next
  _slotRoles[domNext] = 0; // far-left (숨김)

  // 퇴장 슬롯 → far-left 위치 스냅 복귀 + 새 far-left 콘텐츠(newCurrent-2)
  const exited = domNext;
  setTimeout(() => {
    _slotDoms[exited].className = 'progd-slot progd-slot--far-left progd-no-transition';
    void _slotDoms[exited].getBoundingClientRect();
    _drawSlot(exited, ((newCurrent - 2) % count + count) % count);
  }, 440);
}

// 임의 스텝을 한 번의 슬라이드로 들여보내며 이동 (재생 시작 시 첫 코드 복귀 애니)
//   fromRight=true: 오른쪽(next)에서 등장 / false: 왼쪽(prev)에서 등장
function _animateToStep(target, fromRight) {
  if (!_slotDoms) { _currentDisplayStep = target; _renderStage(); return; }
  if (fromRight) {
    _drawSlot(_getSlotByRole(3), target); // next 슬롯을 target으로 그린 뒤 슬라이드 인
    _currentDisplayStep = target;
    _advanceStage(target);
  } else {
    _drawSlot(_getSlotByRole(1), target); // prev 슬롯을 target으로
    _currentDisplayStep = target;
    _advanceStageBack(target);
  }
}

// ── DOMContentLoaded ────────────────────────────────────────
// ── 주법 그림(비트 박스보더) — 디자인 확인용. strum-play.js의 격자 코드를 복사했고, 선택된 주법 대신 샘플 주법 하나를 그림 ──
function strumGroupSize(beat, cells) {
  const [n, d] = String(beat).split('/').map(Number);
  if (!n || !d) return 0;
  const mainBeats = d === 8 ? n / 3 : n;
  const g = cells / mainBeats;
  return Number.isInteger(g) && g > 1 ? g : 0;
}

function strumStrokeString(item) {
  if (item.strokes) return item.strokes.toUpperCase();
  const n = item.count || 0;
  const alt = item.alt === true;
  const skip = item.skip || [];
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6; // 분모8(12/8 등)=3연음 DDU / 6/8은 제외(DU 연속)
  let s = '';
  for (let i = 1; i <= n; i++) {
    if (skip.includes(i)) { s += '-'; continue; }
    if (triplet) s += (i - 1) % 3 === 2 ? 'U' : 'D';
    else s += alt ? 'D' : (i % 2 ? 'D' : 'U');
  }
  return s;
}

// 스트로크·컷팅 아이콘 — image/down_stroke.svg · up_stroke.svg · cut_stroke.svg 와 같은 도형. 루시드 규격(24×24, currentColor)의 인라인 svg라
// 크기는 CSS(width/height), 색은 CSS color를 따름. (원본 디자인을 1.5배 확대해 24×24 가운데에 배치한 변환본)
const _STRUM_SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const STRUM_ICON_DOWN = `${_STRUM_SVG_OPEN}><line x1="18.75" y1="5.25" x2="5.25" y2="5.25" stroke-width="6"/><line x1="3.75" y1="5.25" x2="3.75" y2="20.25" stroke-width="3"/><line x1="20.25" y1="5.25" x2="20.25" y2="20.25" stroke-width="3"/></svg>`;
const STRUM_ICON_UP   = `${_STRUM_SVG_OPEN} stroke-width="3"><polyline points="3 3.75 12 20.25 21 3.75"/></svg>`;
const STRUM_ICON_CUT  = `${_STRUM_SVG_OPEN} stroke-width="3"><line x1="4.5" y1="3.75" x2="19.5" y2="20.25"/><line x1="19.5" y1="3.75" x2="4.5" y2="20.25"/></svg>`;

function strumCellHtml(ch, pos, alt, isCut, triplet) {
  let dir = ch;
  let ghost = false;
  if (ch === '-') {
    ghost = true;
    // 헛스트로크 방향: 3연음=DDU 패턴 / 그 외=alt·교차
    dir = triplet ? ((pos - 1) % 3 === 2 ? 'U' : 'D')
                  : (alt ? 'D' : (pos % 2 ? 'D' : 'U'));
  }
  const ghostCls = ghost ? ' strum-ico--ghost' : '';
  let inner = '';
  if (dir === 'U') {
    inner = `<span class="strum-ico${ghostCls}">${STRUM_ICON_UP}</span>`;
  } else if (dir === 'D') {
    inner = `<span class="strum-ico${ghostCls}">${STRUM_ICON_DOWN}</span>`;
  }
  // 컷팅: 셀 상단에 X 아이콘 (뮤트 스트로크)
  const cutHtml = isCut ? `<span class="strum-cut">${STRUM_ICON_CUT}</span>` : '';
  return `<div class="strum-beat-cell">${cutHtml}${inner}</div>`;
}


function renderStrumDisplay(selected) {
  const wrap = document.getElementById('strum-display');
  const list = window.STRUMMING_LIST || [];
  const item = selected || list.find(i => i.cut) || list[1] || list[0];
  if (!wrap || !item) return;
  const strokes = strumStrokeString(item);
  const cells = strokes.length;
  const alt = item.alt === true;
  const cut = item.cut || [];
  const [cn, bd] = String(item.beat || '4/4').split('/').map(Number);
  const triplet = bd === 8 && cn !== 6;
  const group = strumGroupSize(item.beat, cells);
  const gClass = group ? ` strum-beat-grid--g${group}` : '';
  const rows = cells > 12 ? 2 : 1;   // 12칸 초과 → 2줄 분할
  const rowSize = cells / rows;
  let gridsHtml = '';
  for (let r = 0; r < rows; r++) {
    let cellsHtml = '';
    for (let c = 0; c < rowSize; c++) {
      const pos = r * rowSize + c + 1;
      cellsHtml += strumCellHtml(strokes[pos - 1], pos, alt, cut.includes(pos), triplet);
    }
    gridsHtml += `<div class="strum-beat-grid${gClass}">${cellsHtml}</div>`;
  }
  wrap.innerHTML = gridsHtml;
}

// ── 주법 선택 화면 (옵션패널) — 라벨 "주법" + 주법 이름 휠피커. 디자인 확인용(선택하면 주법 디스플레이만 바뀜) ──
const SP_ITEM_H = 44;          // 휠 한 칸 높이(CSS --sp-item-h와 같은 값)
let _spItems = [];             // 휠에 올라간 주법들(데이터 순서 = 난이도 순)
let _spIdx = -1;
let _spLevel = 0;              // 레벨 칩 선택값 (0 = 전체)

// 전체 주법 — 레벨 오름차순(같은 레벨 안은 데이터 순서 유지). 데이터가 레벨 순이 아니어도 휠·모달 모두 이 순서를 씀
function _spAll() {
  return (window.STRUMMING_LIST || []).map((it, i) => ({ it, i })).sort((a, b) => a.it.level - b.it.level || a.i - b.i).map(o => o.it);
}

// 주법 선택 모달("모두 보기") — 레벨 디바이더별로 전체 주법 나열. 고르면 휠·주법 디스플레이가 그 주법으로 바뀌고 모달이 닫힘
function initSpAllModal() {
  const chip    = document.getElementById('sp-chip-all');
  const overlay = document.getElementById('sp-modal-overlay');
  const body    = document.getElementById('sp-modal-body');
  const closeBt = document.getElementById('sp-modal-close');
  if (!chip || !overlay || !body) return;
  const close = () => overlay.classList.add('hidden');
  const tabsBox = document.getElementById('sp-modal-level-tabs');
  const allTabs = () => overlay.querySelectorAll('.sp-modal-tab');
  let filter = 'all';   // 'all' | 'rec' | 레벨 숫자
  const levels = [...new Set(_spAll().map(i => i.level))].sort((x, y) => x - y);
  if (tabsBox) tabsBox.innerHTML = levels.map(l => `<button class="sp-modal-tab" data-f="${l}">Lv${l}</button>`).join('');
  const syncTabs = () => allTabs().forEach(b => b.classList.toggle('sp-modal-tab--active', b.dataset.f === String(filter)));
  const render = () => {
    const all = _spAll();
    const cur = _spItems[_spIdx];
    if (filter === 'rec') { body.innerHTML = '<div class="sp-modal-empty">추천 기준은 준비 중이에요</div>'; return; }   // 추천 기준 미정
    let html = '', lastLv = null;
    all.forEach((it, i) => {
      if (filter !== 'all' && it.level !== filter) return;
      if (it.level !== lastLv) { lastLv = it.level; html += `<div class="prog-section-label">Lv${it.level}</div>`; }
      const [bn, bd] = String(it.beat || '4/4').split('/');   // 박자표처럼 위(분자)·아래(분모)로 쌓음
      html += `<button class="sp-modal-item${it === cur ? ' sp-modal-item--active' : ''}" data-i="${i}"><span class="sp-modal-item-name">${it.title}</span><span class="sp-modal-item-beat"><b>${bn}</b><b>${bd}</b></span></button>`;
    });
    body.innerHTML = html;
  };
  overlay.querySelector('.sp-modal-tabs')?.addEventListener('pointerup', e => {
    const b = e.target.closest('.sp-modal-tab');
    if (!b) return;
    _playTap();
    filter = b.dataset.f === 'all' || b.dataset.f === 'rec' ? b.dataset.f : Number(b.dataset.f);
    syncTabs();
    render();
    body.scrollTop = 0;
  });
  chip.addEventListener('pointerup', e => {
    e.stopPropagation();
    _playTap();
    filter = 'all';   // 열 때는 항상 전체
    syncTabs();
    render();
    overlay.classList.remove('hidden');
    body.scrollTop = 0;
    const act = body.querySelector('.sp-modal-item--active');
    if (act) body.scrollTop = act.offsetTop - (body.clientHeight - act.offsetHeight) / 2;   // 현재 주법이 보이게
  });
  closeBt?.addEventListener('pointerup', () => { _playTap(); close(); });
  overlay.addEventListener('pointerup', e => { if (e.target === overlay) close(); });
  body.addEventListener('pointerup', e => {
    const b = e.target.closest('.sp-modal-item');
    if (!b) return;
    _playTap();
    const idx = Number(b.dataset.i);
    _spLevel = 0;                                            // 전체 보기 상태로 돌려서 휠에 모든 주법이 올라오게
    renderStrumPicker();
    const wheel = document.getElementById('strum-picker-wheel');
    wheel.scrollTop = idx * SP_ITEM_H;
    _spIdx = -1;
    _spSelect(idx);
    close();
  });
}

function renderStrumPicker() {
  const wheel = document.getElementById('strum-picker-wheel');
  const all = _spAll();
  _spItems = _spLevel === 0 ? all : all.filter(i => i.level === _spLevel);
  if (!wheel || !_spItems.length) return;
  wheel.innerHTML = _spItems.map((it, i) => `<div class="strum-picker-item" data-i="${i}">${it.title}</div>`).join('');
  wheel.onscroll = () => {
    cancelAnimationFrame(wheel._raf);
    wheel._raf = requestAnimationFrame(() => _spSelect(Math.round(wheel.scrollTop / SP_ITEM_H)));
  };
  wheel.onpointerup = e => {
    const el = e.target.closest('.strum-picker-item');
    if (el) wheel.scrollTo({ top: Number(el.dataset.i) * SP_ITEM_H, behavior: 'smooth' });
  };
  wheel.scrollTop = 0;
  _spIdx = -1;
  _spSelect(0);
}

function _spSelect(idx) {
  const wheel = document.getElementById('strum-picker-wheel');
  if (!wheel || !_spItems.length) return;
  idx = Math.max(0, Math.min(_spItems.length - 1, idx));
  if (idx === _spIdx) return;
  _spIdx = idx;
  wheel.querySelectorAll('.strum-picker-item').forEach((el, i) => el.classList.toggle('strum-picker-item--active', i === idx));
  renderStrumDisplay(_spItems[idx]);   // 위의 주법 디스플레이 갱신
}

// ── 재생 탭 팝업들 ───────────────────────────────────────────
// 목표 BPM(가로로 긴 슬라이더 팝업, 점진 가속 영역을 덮음) · 시작 BPM(같은 디자인, 목표 BPM 이하만) ·
// 사이클마다 / BPM씩(좁은 휠 팝업, 위로, 1~10·4칸 보임) · 스타일(좁은 목록, 위로). 팝업은 하나만 열리고, 바깥을 누르면 닫힘.
// 열림·닫힘은 통통 튀는 애니메이션(닫힘은 끝난 뒤 hidden). 값은 디자인 확인용 상태 — 점진 가속의 실제 동작은 구현 단계
let _rampStart  = 60;   // 점진 가속 시작 BPM (목표 BPM = _bpm 이하)
let _rampCycles = 1;    // 몇 사이클마다 올릴지 (1~10)
let _rampStep   = 2;    // 한 번에 몇 BPM씩 올릴지 (1~10)
const _popups = [];     // 열린 팝업을 하나로 유지하기 위한 목록

// 팝업은 옵션패널(overflow hidden)·옵션 페이지 안에서 잘리거나 가려지지 않게 .cd-main 직속으로 옮겨 position:fixed로 띄움.
// anchor(카드 또는 영역)의 화면 좌표로 위치를 계산하고, 위로 열면 anchor 위, 아래로 열면 anchor 아래. 화면 위/아래가 모자라면 반대로 뒤집음
function _placePopup(pop, anchor, wide, preferUp, cover) {
  const r = anchor.getBoundingClientRect();
  if (cover) {   // anchor를 위치·크기 그대로 정확히 덮음(아래 요소가 처음부터 없었던 것처럼)
    pop.style.left = r.left + 'px'; pop.style.top = r.top + 'px'; pop.style.width = r.width + 'px'; pop.style.height = r.height + 'px';
    pop.style.bottom = 'auto'; pop.style.transformOrigin = '50% 50%';
    return;
  }
  pop.style.height = '';
  const main = document.querySelector('.cd-main').getBoundingClientRect();
  if (wide) { pop.style.left = r.left + 'px'; pop.style.width = r.width + 'px'; }
  else { pop.style.left = Math.max(8, r.left + r.width / 2 - pop.offsetWidth / 2) + 'px'; }
  pop.style.top = 'auto'; pop.style.bottom = 'auto';
  const h = pop.offsetHeight, gap = 8;
  const roomAbove = r.top - main.top, roomBelow = main.bottom - r.bottom;
  let up = preferUp;
  if (up && roomAbove < h + gap && roomBelow >= h + gap) up = false;     // 위가 모자라면 아래로
  else if (!up && roomBelow < h + gap && roomAbove >= h + gap) up = true; // 아래가 모자라면 위로
  if (up) { pop.style.bottom = (window.innerHeight - r.top + gap) + 'px'; pop.style.transformOrigin = '50% 100%'; }
  else { pop.style.top = (r.bottom + gap) + 'px'; pop.style.transformOrigin = '50% 0'; }
}

function _makePopup(card, pop, onOpen, opts) {
  opts = opts || {};
  const anchor = opts.anchor || card;
  document.querySelector('.cd-main').appendChild(pop);   // 오버레이: 옵션패널 밖으로
  const isOpen = () => !pop.hidden && !pop.classList.contains('bpm-popup--closing') && !pop.classList.contains('mini-popup--closing');
  const closingCls = pop.classList.contains('mini-popup') ? 'mini-popup--closing' : 'bpm-popup--closing';
  const preferUp = !!opts.up;
  const ctl = {
    isOpen,
    close() {
      if (!isOpen()) return;
      card.classList.remove('play-card--open');
      pop.classList.add(closingCls);
      const done = () => {
        if (!pop.classList.contains(closingCls)) return;
        pop.classList.remove(closingCls);
        pop.hidden = true;
      };
      pop.addEventListener('animationend', done, { once: true });
      setTimeout(done, 300);
    },
    open() {
      _popups.forEach(p => { if (p !== ctl) p.close(); });
      pop.classList.remove(closingCls);
      pop.hidden = false;
      if (onOpen) onOpen();
      _placePopup(pop, anchor, !!opts.wide, preferUp, !!opts.cover);
      // 덮이는 영역 안의 카드(시작 BPM)는 테두리 강조를 안 줌 — 강조 링이 팝업 가장자리 밖으로 삐져나와 보이기 때문
      if (!(opts.cover && anchor.contains(card))) card.classList.add('play-card--open');
    },
  };
  card.addEventListener('pointerup', e => {
    e.stopPropagation();
    _playTap();
    if (isOpen()) ctl.close(); else ctl.open();
  });
  pop.addEventListener('pointerup', e => e.stopPropagation());
  _popups.push(ctl);
  window.addEventListener('resize', () => ctl.close());
  return ctl;
}

// 슬라이더 팝업(가운데 값 · 좌우 −/+ 1씩(길게 누르면 연속) · 아래 슬라이더). max()가 함수라 시작 BPM은 목표 BPM에 묶임
function _initSliderPopup(o) {
  const el = id => document.getElementById(id);
  const card = el(o.card), pop = el(o.pop), slider = el(o.slider), popVal = el(o.popVal), cardVal = el(o.cardVal), minus = el(o.minus), plus = el(o.plus);
  const mirror = o.mirror ? el(o.mirror) : null;   // 팝업 밖에 따로 놓인 슬라이더(값 동기화)
  if (!card || !pop || !slider || !popVal || !cardVal || !minus || !plus) return null;
  const set = v => {
    const max = o.max();
    v = Math.max(BPM_MIN, Math.min(max, Math.round(v)));
    o.write(v);
    cardVal.textContent = v;
    popVal.textContent = v;
    slider.min = BPM_MIN; slider.max = max; slider.value = v;
    const pct = (max > BPM_MIN ? (v - BPM_MIN) / (max - BPM_MIN) * 100 : 100) + '%';
    slider.style.setProperty('--pct', pct);
    if (mirror) { mirror.min = BPM_MIN; mirror.max = max; mirror.value = v; mirror.style.setProperty('--pct', pct); }
    if (o.onSet) o.onSet(v);
  };
  slider.addEventListener('input', () => set(Number(slider.value)));
  if (mirror) mirror.addEventListener('input', () => set(Number(mirror.value)));
  const hold = (btn, delta) => {
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      set(o.read() + delta);
      t1 = setTimeout(() => { t2 = setInterval(() => set(o.read() + delta), 60); }, 350);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  };
  hold(minus, -1);
  hold(plus, 1);
  const ctl = _makePopup(card, pop, () => set(o.read()), { anchor: o.anchor ? el(o.anchor) || document.querySelector(o.anchor) : card, wide: true, up: !!o.up, cover: !!o.cover });
  set(o.read());
  return { set, ctl };
}

// 좁은 휠 팝업 — 1~10, 한 번에 4칸 보임(위에서 두 번째 칸이 선택값 — scrollTop = (값-1) × 칸높이)
const MINI_ITEM_H = 36;   // CSS --mp-item-h와 같은 값
function _initMiniWheelPopup(o) {
  const el = id => document.getElementById(id);
  const card = el(o.card), pop = el(o.pop), wheel = el(o.wheel), cardVal = el(o.cardVal);
  if (!card || !pop || !wheel || !cardVal) return;
  let html = '';
  for (let v = o.min; v <= o.max; v++) html += `<div class="mini-item" data-v="${v}">${v}</div>`;
  wheel.innerHTML = html;
  const set = v => {
    v = Math.max(o.min, Math.min(o.max, v));
    o.write(v);
    cardVal.textContent = v;
    wheel.querySelectorAll('.mini-item--active').forEach(x => x.classList.remove('mini-item--active'));
    wheel.children[v - o.min]?.classList.add('mini-item--active');
  };
  wheel.addEventListener('scroll', () => {
    cancelAnimationFrame(wheel._raf);
    wheel._raf = requestAnimationFrame(() => set(o.min + Math.round(wheel.scrollTop / MINI_ITEM_H)));
  });
  wheel.addEventListener('pointerup', e => {
    const it = e.target.closest('.mini-item');
    if (it) wheel.scrollTo({ top: (Number(it.dataset.v) - o.min) * MINI_ITEM_H, behavior: 'smooth' });
  });
  if (typeof enableMouseDragScroll === 'function') enableMouseDragScroll(wheel);
  _makePopup(card, pop, () => { wheel.scrollTop = (o.read() - o.min) * MINI_ITEM_H; set(o.read()); }, { up: true });
  set(o.read());
}

// 스타일 선택 — 카드를 누르면 위로 열리는 좁은 목록 팝업(탭하면 선택하고 닫힘). 항목은 자리표시: 실제로는 선택한 주법에 허용된 백킹 스타일 세트
const PLAY_STYLES = ['기본1', '기본2', '기본3', '재즈1'];
let _playStyle = PLAY_STYLES[0];
function _initStylePopup() {
  const card = document.getElementById('play-style-card');
  const pop  = document.getElementById('play-style-pop');
  const list = document.getElementById('play-style-list');
  const val  = document.getElementById('play-style-val');
  if (!card || !pop || !list || !val) return;
  const render = () => {
    list.innerHTML = PLAY_STYLES.map(s => `<button class="style-item${s === _playStyle ? ' style-item--active' : ''}" data-s="${s}">${s}</button>`).join('');
  };
  const ctl = _makePopup(card, pop, render, { up: true });
  list.addEventListener('pointerup', e => {
    const b = e.target.closest('.style-item');
    if (!b) return;
    _playTap();
    _playStyle = b.dataset.s;
    val.textContent = _playStyle;
    ctl.close();
  });
}

function initPlayPopups() {
  // 목표 BPM — 값이 시작 BPM보다 낮아지면 시작 BPM도 같이 내려감
  let startApi = null;
  _initSliderPopup({
    card: 'play-bpm-card', pop: 'bpm-popup', slider: 'bpm-slider', mirror: 'bpm-inline-slider', popVal: 'bpm-popup-val', cardVal: 'play-bpm-val', minus: 'bpm-minus', plus: 'bpm-plus',
    read: () => _bpm, max: () => BPM_MAX, anchor: '.ramp-block', cover: true,   // 아래 점진 가속 영역(라벨+카드 3개)을 정확히 덮음
    write: v => { _bpm = v; if (_rampStart > v) { _rampStart = v; } startApi?.set(_rampStart); },
  });
  // 숫자 좌측 +/− — 슬라이더 값을 1씩 바꾸고 input 이벤트로 기존 set()을 태움(길게 누르면 연속)
  const nudgeSlider = document.getElementById('bpm-inline-slider');
  [['bpm-nudge-plus', 1], ['bpm-nudge-minus', -1]].forEach(([id, d]) => {
    const b = document.getElementById(id);
    if (!b || !nudgeSlider) return;
    let t1 = null, t2 = null;
    const step = () => { nudgeSlider.value = Math.max(BPM_MIN, Math.min(Number(nudgeSlider.max), Number(nudgeSlider.value) + d)); nudgeSlider.dispatchEvent(new Event('input')); };
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); step(); t1 = setTimeout(() => { t2 = setInterval(step, 60); }, 350); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  });
  // 시작 BPM — 목표 BPM(_bpm) 이하만
  startApi = _initSliderPopup({
    card: 'ramp-start-card', pop: 'ramp-start-pop', slider: 'ramp-start-slider', popVal: 'ramp-start-pop-val', cardVal: 'ramp-start-val', minus: 'ramp-start-minus', plus: 'ramp-start-plus',
    read: () => _rampStart, max: () => _bpm, anchor: '.ramp-block', cover: true,   // 목표 BPM 팝업과 같은 위치(점진 가속 영역을 덮음)
    write: v => { _rampStart = v; },
  });
  // 사이클마다 · BPM씩 — 1~10 좁은 휠 팝업(위로)
  _initMiniWheelPopup({ card: 'ramp-cycle-card', pop: 'ramp-cycle-pop', wheel: 'ramp-cycle-wheel', cardVal: 'ramp-cycle-val', min: 1, max: 10, read: () => _rampCycles, write: v => { _rampCycles = v; } });
  _initMiniWheelPopup({ card: 'ramp-step-card',  pop: 'ramp-step-pop',  wheel: 'ramp-step-wheel',  cardVal: 'ramp-step-val',  min: 1, max: 10, read: () => _rampStep,   write: v => { _rampStep = v; } });
  _initStylePopup();
  document.addEventListener('pointerup', () => _popups.forEach(p => p.close()));   // 바깥을 누르면 모두 닫힘
}

// 점진 가속 줄 정렬 — 라벨은 카드 안에서 가운데 정렬이라 카드 끝에서 안쪽으로 들어가 있어서, 그 거리를 실측해 맞춤:
//  · "점진 가속" 제목의 왼쪽 끝 = "시작 BPM" 라벨의 왼쪽 끝 (--ramp-title-indent)
//  · 스위치의 오른쪽 끝 = "BPM씩" 라벨의 오른쪽 끝에서 오른쪽으로 4px 더(시각 보정) (--ramp-switch-indent, 음수 가능)
// 재생 탭이 보일 때·화면 크기가 바뀔 때 다시 계산
function alignRampTitle() {
  const title = document.querySelector('.ramp-title');
  const label = document.querySelector('#ramp-start-card .play-card-lbl');
  const lastLabel = document.querySelector('#ramp-step-card .play-card-lbl');
  const block = document.querySelector('.ramp-block');
  if (!title || !label || !lastLabel || !block) return;
  const b = block.getBoundingClientRect(), l = label.getBoundingClientRect(), z = lastLabel.getBoundingClientRect();
  if (!b.width || !l.width || !z.width) return;   // 재생 탭이 숨겨진 상태면 측정 불가
  block.style.setProperty('--ramp-title-indent', Math.max(0, Math.round(l.left - b.left)) + 'px');
  block.style.setProperty('--ramp-switch-indent', Math.round(b.right - z.right - 4) + 'px');   // 라벨 오른쪽 끝에 맞춘 뒤 4px 더 오른쪽
}

document.addEventListener('DOMContentLoaded', () => {
  // URL 파라미터 파싱
  const params = new URLSearchParams(location.search);
  const progId = params.get('id');
  const progNo = params.get('no'); // 넛지: no 그룹만 지정 → 랜덤 진행 (콤마로 여러 그룹 합집합 가능)
  _key     = parseInt(params.get('key')  || '0', 10);
  _useFlat = params.get('flat') !== '0'; // 기본 플랫 (명시적 0만 샵)

  if (progId) {
    _prog = PROGRESSIONS.find(p => p.id === progId) || null;
  } else if (progNo != null) {
    const noList = String(progNo).split(',');
    const group = PROGRESSIONS.filter(p => noList.includes(String(p.no)));
    _prog = group.length ? group[Math.floor(Math.random() * group.length)] : null;
  } else {
    _prog = null;
  }
  const _titleEl = document.getElementById('detail-title');
  if (_titleEl) _titleEl.innerHTML = getProgressionNameHtml(_prog);
  document.documentElement.classList.toggle('peak-free', getPlan() === 'pro'); // 연습 시작 버튼 피크 배지: Pro는 숨김

  // 뒤로가기+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  // 페이지 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  // Android 하드웨어 백: 모달 열려있으면 닫기, 아니면 뒤로가기 요청
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      if (isLeavePracticeOpen()) { hideLeavePracticeModal(); return; }
      requestBack();
    });
  }

  // 페이지 이탈 중 재생이면 훈련시간 적립
  window.addEventListener('pagehide', () => { if (_playing) _stopPlay(); });

  // 페이지 커버
  lucide.createIcons();
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  // 샵/플랫 토글
  const sharpBtn = document.getElementById('detail-acc-sharp');
  const flatBtn  = document.getElementById('detail-acc-flat');

  function _setAccidental(useFlat) {
    _useFlat = useFlat;
    sharpBtn.classList.toggle('active', !useFlat);
    flatBtn .classList.toggle('active',  useFlat);
    _stopPlay();
    _renderKeyStrip();
    _renderStage();
  }

  const accToggle = document.getElementById('detail-accidental-toggle');
  if (accToggle) {
    accToggle.addEventListener('pointerup', () => { _playTap(); _setAccidental(!_useFlat); });
  }

  if (_useFlat) _setAccidental(true);

  // 손가락 번호 on/off 토글 (재생 정지 없이 슬롯만 재드로우)
  const fingerBtn = document.getElementById('detail-finger-toggle');
  if (fingerBtn) {
    fingerBtn.addEventListener('pointerup', () => {
      _playTap();
      _showFingers = !_showFingers;
      fingerBtn.classList.toggle('active', _showFingers);
      _redrawAllSlots();
    });
  }

  // 코드 캐러셀 스와이프 (정지 중에만) — 좌:다음 / 우:이전 (한 칸 애니)
  const stageInner = document.getElementById('detail-chord-row');
  if (stageInner) {
    let _sx = 0, _swiping = false, _busy = false;
    stageInner.addEventListener('pointerdown', (e) => {
      if (_playing) return;
      _sx = e.clientX; _swiping = true;
      try { stageInner.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const _endSwipe = (e) => {
      if (!_swiping || _playing) { _swiping = false; return; }
      _swiping = false;
      if (_busy || !_prog) return;
      const dx = e.clientX - _sx;
      if (Math.abs(dx) < 40) { _playCurrentChord(); return; } // 스와이프 아닌 탭 → 코드 사운드
      const count = _prog.steps.length;
      if (count < 2) return;
      _busy = true;
      setTimeout(() => { _busy = false; }, 460);
      if (dx < 0) { // 좌 → 다음
        _currentDisplayStep = (_currentDisplayStep + 1) % count;
        _advanceStage(_currentDisplayStep);
      } else {      // 우 → 이전
        _currentDisplayStep = (_currentDisplayStep - 1 + count) % count;
        _advanceStageBack(_currentDisplayStep);
      }
    };
    stageInner.addEventListener('pointerup', _endSwipe);
    stageInner.addEventListener('pointercancel', () => { _swiping = false; });
  }

  // 초기 렌더
  _initBpmWheel();
  _renderKeyStrip();
  const keyStrip = document.getElementById('detail-key-strip');
  if (keyStrip) {
    // 선택된 키가 화면 밖이면 보이는 위치로(URL key 파라미터 진입 등)
    const act = keyStrip.querySelector('.key-btn--active');
    if (act) keyStrip.scrollTo({ left: act.offsetLeft - (keyStrip.clientWidth - act.offsetWidth) / 2, behavior: 'instant' });
    initKeySelectorDragScroll(keyStrip);
    initKeySelectorFade(keyStrip);
  }
  _renderStage();
  renderStrumPicker();
  initSpAllModal();
  window.addEventListener('resize', alignRampTitle);
  requestAnimationFrame(alignRampTitle);   // 3단계 이상은 재생 화면이 처음부터 보이므로 바로 정렬 계산
  initPlayPopups();

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  analytics.track('progression_detail_viewed', { prog_id: progId, entry: _pushEntry || 'direct' });
});
