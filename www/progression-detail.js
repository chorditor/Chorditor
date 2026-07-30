'use strict';

// 진행 데이터: progression-data.js + progression.js 에서 window.PROGRESSIONS 로 로드

const KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_TO_SHARP   = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };

function _getKeyDisplayName(k) {
  return _useFlat ? KEY_NAMES_FLAT[k] : KEY_NAMES_SHARP[k];
}

const _SEMITONE_TO_DEGREE   = { 0:'I', 1:'bII', 2:'II', 3:'bIII', 4:'III', 5:'IV', 6:'#IV', 7:'V', 8:'bVI', 9:'VI', 10:'bVII', 11:'VII' };
const _SEMITONE_TO_BASS_NUM = { 0:'1', 1:'b2', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'#4', 7:'5', 8:'b6', 9:'6', 10:'b7', 11:'7' };

function _getRomanNumeral(semitones, quality, bass, tension) {
  const norm  = ((semitones % 12) + 12) % 12;
  const roman = _SEMITONE_TO_DEGREE[norm] || '?';
  const sfx   = { M:'', m:'m', '7':'7', M7:'M7', m7:'m7', dim:'dim', dim7:'dim7', aug:'aug', sus4:'sus4', sus2:'sus2', '7sus4':'7sus4', m6:'m6', '6':'6', 'm7(b5)':'m7(b5)' };
  const suffix = sfx[quality] ?? '';
  let result  = roman + (suffix ? `<span class="progd-prog-sfx">${suffix}</span>` : '');
  if (tension) result += `<span class="progd-prog-sfx">${tension}</span>`;
  if (bass != null) {
    const bassNorm = ((bass % 12) + 12) % 12;
    const bassNum  = _SEMITONE_TO_BASS_NUM[bassNorm];
    if (bassNum != null) result += `<span class="progd-prog-sfx">/${bassNum}</span>`;
  }
  return result;
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
function _resetCountDots() {
  const wrap = document.getElementById('detail-count-dots');
  if (!wrap) return;
  wrap.querySelectorAll('.progd-count-dot').forEach(d => d.classList.remove('progd-count-dot--active'));
}

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
  _resetCountDots();
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

  // 점 업데이트 (비트 시각에 맞춰)
  const dotDelay = Math.max(0, (t - now) * 1000);
  setTimeout(() => {
    if (!_playing) return;
    const dots = document.querySelectorAll('#detail-count-dots .progd-count-dot');
    dots.forEach((d, i) => d.classList.toggle('progd-count-dot--active', i === beatPhase));
  }, dotDelay);

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
  const wrap    = document.getElementById('detail-count-dots');
  const dots    = wrap ? wrap.querySelectorAll('.progd-count-dot') : [];
  const beatSec = 60 / _bpm;
  const anchor  = Tone.now() + 0.12;

  dots.forEach(d => d.classList.remove('progd-count-dot--active'));

  for (let i = 0; i < 4; i++) {
    const t = anchor + i * beatSec;
    if (typeof DrumAudio !== 'undefined') DrumAudio.hit('hat', t);
    const delay = Math.max(0, (t - Tone.now()) * 1000);
    setTimeout(() => {
      if (!_playing) return;
      dots.forEach((d, j) => d.classList.toggle('progd-count-dot--active', j === i));
    }, delay);
  }

  const startTime = anchor + 4 * beatSec;
  const startDelay = Math.max(0, (startTime - Tone.now()) * 1000);
  setTimeout(() => {
    if (!_playing) return;
    _resetCountDots();
    onComplete(startTime);
  }, startDelay);
}

// 연습 시작(피크 1회 소모)으로 재생 잠금 해제. 이후 재생은 무한.
let _practiceUnlocked = false;
async function unlockPractice() {
  _playSfx('pop.mp3');
  if (_practiceUnlocked) return;
  if (!(await consumePeak(2))) return;
  _practiceUnlocked = true;
  const gate = document.getElementById('detail-practice-gate');
  if (gate) gate.style.display = 'none';
  const btn = document.getElementById('detail-play-btn');
  if (btn) { btn.style.display = ''; }
}

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

const BPM_MIN = 40;
const BPM_MAX = 200;
const BPM_ITEM_H = 30;

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
  _scrollBpmWheel(_bpm, false);

  wheel.addEventListener('scroll', () => {
    const idx = Math.round(wheel.scrollTop / BPM_ITEM_H);
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
  wheel.scrollTo({ top: idx * BPM_ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
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
    setTimeout(() => { location.href = 'progression.html'; }, 260);
  } else {
    location.href = 'progression.html';
  }
}

// ── UI 렌더 ──────────────────────────────────────────────────
function _renderKeyStrip() {
  const strip = document.getElementById('detail-key-strip');
  if (!strip) return;
  strip.innerHTML = '';
  for (let k = 0; k < 12; k++) {
    const btn = document.createElement('button');
    btn.className = 'key-btn' + (k === _key ? ' key-btn--active' : '');
    btn.textContent = _getKeyDisplayName(k);
    btn.addEventListener('pointerup', async () => {
      _playTap();
      if (k === _key) return;
      await _stopPlay({ wait: true }); // 재생/예약 완전 정지 후 키 적용 (레이스 방지)
      _key = k;
      _renderKeyStrip();
      _renderStage();
    });
    strip.appendChild(btn);
  }
}

let _stageRO    = null; // ResizeObserver 인스턴스
let _slotDoms   = null; // [dom0, dom1, dom2] — 고정 슬롯 DOM 요소
let _slotRoles  = null; // _slotRoles[domIdx] = 0(prev)|1(current)|2(next)
let _slotData   = null; // _slotData[domIdx] = { voicing, chordName }
let _stepCache  = null; // _stepCache[stepIdx] = { voicing, chordName } — 스텝별 보이싱 캐시

// 캔버스 픽셀 크기 계산 + 드로잉
function _redrawCanvas(canvas, wrap, voicing, chordName) {
  const dpr  = window.devicePixelRatio || 1;
  const cssW = wrap.offsetWidth;
  if (!cssW) return;
  const ratio = (cssW * dpr) / _BASE_W;
  _drawVoicingCanvas(canvas, voicing, chordName, ratio);
  canvas.style.width  = cssW + 'px';
  canvas.style.height = Math.round(cssW * _BASE_H / _BASE_W) + 'px';
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

// 코드 진행 바 렌더링
// 조성/모드 헤더 — root 선택(_key) 따라 전조. 형식: "{tonic} {mode} / {key} key"
function _renderKeyHeader() {
  const el = document.getElementById('detail-key-header-text');
  if (!el || !_prog) return;
  const names    = _useFlat ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const tonic    = _getKeyDisplayName(_key);                              // root 선택 = C기준 으뜸음
  const keyName  = names[(( _prog.keySemitone + _key) % 12 + 12) % 12];   // 부모 조 음명 전조
  el.textContent = `${tonic} ${_prog.mode} / ${keyName} key`;
}

function _renderProgBar() {
  _renderKeyHeader();
  const bar = document.getElementById('detail-prog-bar');
  if (!bar || !_prog) return;
  bar.innerHTML = '';
  // 4열 grid 직접 배치 → 위·아랫줄 컬럼 정렬 (8코드 → 2줄)
  _prog.steps.forEach((step, i) => {
    const prev   = _prog.steps[i - 1];
    const isSame = prev && prev.semitones === step.semitones && prev.quality === step.quality && (prev.bass ?? null) === (step.bass ?? null) && (prev.tension ?? null) === (step.tension ?? null);
    const name   = isSame ? '-' : _getRomanNumeral(step.semitones, step.quality, step.bass, step.tension);
    const chip = document.createElement('span');
    chip.className = 'progd-prog-chip';
    chip.innerHTML = name;
    bar.appendChild(chip);
  });
}

// 스테이지 초기화 (전체 재구성) — 4슬롯 모델
function _renderStage() {
  if (!_prog) return;
  const row = document.getElementById('detail-chord-row');
  if (!row) return;
  row.innerHTML = '';
  _renderProgBar();

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
  _renderStage();

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  analytics.track('progression_detail_viewed', { prog_id: progId, entry: _pushEntry || 'direct' });
});
