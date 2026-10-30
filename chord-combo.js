// ═══════════════════════════════════════════════════════════════
// chord-combo.js — 리하모니 화성학 페이지
// ═══════════════════════════════════════════════════════════════

// ── 뷰 전환 상태 ─────────────────────────────────────────────
let _comboInQuiz = false;
window._leaveGuardActive = () => _comboInQuiz; // shared.js 사이드바 네비 이탈 확인용

// 괄호 표기(텐션·(b5) 등)를 위첨자로 작게 표기 — 코드명/라벨 텍스트에 섞인 (...) 전부 <sup>로 감쌈
function _ccFormatB5(text) {
  // 한 덩어리(span)로 감싸는 것이 핵심: 카드·칩은 display:flex라서 자식 <sup>이 별개 flex 아이템이 되면 vertical-align이 무시돼 위첨자가 안 올라감.
  // span 하나가 flex 아이템이 되고 그 안은 일반 인라인 배치라 sup이 제대로 올라감. 크기·높이는 style.css 전역 .cc-sup
  return '<span class="cc-chord">' + String(text).replace(/\([^)]*\)/g, m => `<sup class="cc-sup">${m}</sup>`) + '</span>';
}

// ── 제출 정/오답 효과음 (코드 맞추기 퀴즈 chord-name-quiz.js의 벨/차임 사운드 그대로 이식) ──
let _comboAudioCtx  = null;
let _comboSfxMaster = null;

function _comboGetAudioCtx() {
  if (!_comboAudioCtx) {
    _comboAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_comboAudioCtx.state !== 'running') _comboAudioCtx.resume();
  return _comboAudioCtx;
}

function _comboGetSfxBus(ctx) {
  if (!_comboSfxMaster) {
    _comboSfxMaster = ctx.createGain();
    _comboSfxMaster.connect(ctx.destination);
  }
  _comboSfxMaster.gain.value = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
  return _comboSfxMaster;
}

// 벨/차임 질감: 비조화 배음 4개 + 피치 글라이드 + 빠른 어택
function _comboPlayBell(freq, startDelay, gainVal) {
  try {
    const ctx = _comboGetAudioCtx();
    const t   = ctx.currentTime + startDelay;
    const bus = _comboGetSfxBus(ctx);
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

function comboPlaySound(type) {
  if (type === 'correct') {
    _comboPlayBell(523.25, 0,    0.20);  // C5 → 상승
    _comboPlayBell(698.46, 0.13, 0.20);  // F5
  } else if (type === 'wrong') {
    _comboPlayBell(349.23, 0,    0.20);  // F4 → 하강
    _comboPlayBell(261.63, 0.13, 0.20);  // C4
  }
}

// ── 탑바 X 버튼: 퀴즈 중이면 그만두기 모달, 아니면 페이지 닫기 ──
function handleComboBack() {
  if (typeof comboV2LectureBack === 'function' && comboV2LectureBack()) return;   // 미니강의/수강 완료 페이지가 떠 있으면 그것부터 닫음(Android 뒤로가기 포함)
  if (_comboV2SkipPending) { _comboV2SkipPageClose(true); return; }   // 건너뛰기 안내 페이지가 떠 있으면 그것부터 닫음(Android 뒤로가기 포함)
  if (_comboV2InQuiz) { // 문제 화면 v2: 그만두기 확인 후 선택 뷰 v2로 복귀
    if (_comboV2ClearOn) { _comboV2CloseClear(); return; }   // 클리어 화면에선 확인 없이 바로 나감
    if (_comboV2Sess && _comboV2Sess.test) { showLeavePracticeModal(function () { comboV2ExitQuiz(); }, { desc: '지금 나가면 건너뛰기 테스트가 종료돼요.' }); return; }
    showLeavePracticeModal(function () { comboV2ExitQuiz(); }, getPlan() === 'pro' ? undefined : {
      desc: '지금 나가면 아직 돌려받지 못한 피크는<br>받을 수 없고, 다시 연습할 때<br>피크를 사용해야 해요.',
    });
    return;
  }
  if (_comboInQuiz) {
    showLeavePracticeModal(() => {
      if (typeof analytics !== 'undefined') {
        analytics.track('combo_training_abandoned', {
          chapter: _comboChapter, difficulty: _comboDifficulty,
          question_index: _comboQuestionIndex, correct: _comboCorrectCount,
        });
      }
      exitComboQuiz();
    });
    return;
  }
  closeChordCombo();
}

// ── 페이지 닫기 (훈련소로 복귀) ─────────────────────────────
function closeChordCombo() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'training.html'; }, 260);
  } else {
    location.href = 'training.html';
  }
}

// ── 시작하기 (피크 1 소모 → 퀴즈 뷰 진입) ───────────────────
// 1~8장 지원 (1~6장 알고리즘 생성, 7·8장은 손으로 뽑은 20개 진행 중 랜덤).
async function comboStartTraining(e) {
  const card = e?.target.closest('.combo-card');
  const chapter = card?.dataset.chapter || '1';
  if (!['1', '2', '3', '4', '5', '6', '7', '8'].includes(chapter)) return;
  _playConfirmSfx();
  if (!(await consumePeak(2, 'chord_combo'))) return;
  const activeCard = card.querySelector('.combo-difficulty-card.active');
  const difficulty = activeCard?.dataset.difficulty === 'high' ? 'high'
    : activeCard?.dataset.difficulty === 'mid' ? 'mid' : 'low';
  if (typeof analytics !== 'undefined') analytics.track('combo_training_started', { chapter, difficulty });
  enterComboQuiz(difficulty, chapter);
}

// ── 현재 문제 상태 (채점용) ──────────────────────────────────
const COMBO_QUESTIONS_PER_SESSION = 10; // 1회 진행당 총 문제 수
let _comboCurrentQuestion = null;
let _comboDifficulty      = 'low';
let _comboKeyIdx           = 0;    // 퀴즈 진입 시 1회 고정, 세션 내내 동일 key
let _comboUseFlat          = false; // 퀴즈 진입 시 1회 고정 (#/b 둘 다 가능한 key만 랜덤 결정)
let _comboQuestionIndex   = 0;   // 0-based, 총 COMBO_QUESTIONS_PER_SESSION 문제
let _comboSubmitted       = false; // 현재 문제 채점 완료 여부 (제출↔다음 버튼 상태)
let _comboChapter          = '1';  // 현재 장 ('1' | '2' | '3')
let _comboQuestionType     = 'placement'; // 2·3장 문제 타입 (문제마다 결정)
let _comboSeenProgressions = []; // 이번 세션(COMBO_QUESTIONS_PER_SESSION문제)에 나온 기저 진행들 — 중복 방지용
let _comboLastTarget       = null; // 3·4장: 직전 문제의 타겟 도수 — 연속 반복 회피용
let _comboCorrectCount     = 0; // 이번 세션에서 전부 맞춘 문제 수 — 완료 모달 결과 표시용
let _comboSessionStartMs   = 0; // 퀴즈 진입 시각 — 훈련시간 측정용 (0이면 측정 중 아님)

// ── 훈련시간 적립 (퀴즈 진입 ~ 완료/이탈) ────────────────────
// 완료·그만두기·페이지 이탈 어느 경로로 빠져도 한 번만 적립되도록 시작시각을 즉시 0으로 되돌린다.
function _comboFlushTrainingTime() {
  if (!_comboSessionStartMs) return;
  const elapsedSec = (Date.now() - _comboSessionStartMs) / 1000;
  _comboSessionStartMs = 0;
  if (typeof recordTrainingTime === 'function') recordTrainingTime(elapsedSec);
}

// ── 현재 장에 맞는 문제 렌더 (2·3·4장 모두 교체형만) ──
// 매 문제 렌더 전 퀴즈 뷰를 순정 HTML로 통째 복원 → 이전 문제/이전 장이 남긴 어떤 DOM 변경도
// 무조건 초기화된 상태에서 렌더 시작. (개별 항목 리셋 추적 방식은 새 장 추가 시 계속 새어서 폐기.)
// ── 힌트보기 — 장별 힌트 문구 생성 함수 레지스트리 (없는 장은 버튼 숨김) ──
const _ccScaleHint = () => {
  const q = _comboCurrentQuestion;
  if (!q) return null;
  const notes = getMajorScaleNotes(q.keyIdx, _comboUseFlat);
  return `${q.keyName} 스케일은 ${notes.join(' ')} 예요.`;
};
const CC_CHAPTER_HINTS = {
  '1': _ccScaleHint,
  '2': _ccScaleHint,
  '3': () => {
    const q = _comboCurrentQuestion;
    if (!q || !q.targetDegree) return null;
    const rootChord = degreeToChordName(q.targetDegree, q.keyIdx, false, _comboUseFlat);
    const root = rootChord.match(/^([A-G][#b]?)/)?.[1] || rootChord;
    return `타겟인 ${root}의 5번째 코드를 찾아보세요!`;
  },
  '4': () => {
    const q = _comboCurrentQuestion;
    if (!q || !q.targetDegree) return null;
    const rootChord = degreeToChordName(q.targetDegree, q.keyIdx, false, _comboUseFlat);
    const root = rootChord.match(/^([A-G][#b]?)/)?.[1] || rootChord;
    return `타겟인 ${root}의 2번째와 5번째 코드를 찾아보세요!`;
  },
  '5': () => {
    const q = _comboCurrentQuestion;
    if (!q || !q.targetDegree || !q.substituteDegree) return null;
    const rootChord = degreeToChordName(q.targetDegree, q.keyIdx, false, _comboUseFlat);
    const root = rootChord.match(/^([A-G][#b]?)/)?.[1] || rootChord;
    // 1전위(.../3)·디미니쉬7(..._DIM7) = 타겟 반음 아래(리딩톤) / 트라이톤서브(..._SUBV) = 타겟 반음 위(bII)
    const direction = q.substituteDegree.endsWith('_SUBV') ? '높은' : '낮은';
    return `타겟인 ${root}의 반음 ${direction} 음을 찾으세요!`;
  },
  '6': () => {
    const q = _comboCurrentQuestion;
    if (!q || !q.targetDegree) return null;
    const info = (typeof CC_DEGREE_TRIAD !== 'undefined') ? CC_DEGREE_TRIAD[q.targetDegree] : null;
    const quality = info && info.quality7; // 6장은 항상 7화음 고정이라 quality7만 봄
    if (quality === 'M7') return 'M7코드는 9, #11, 13 텐션을 사용할 수 있어요!';
    if (quality === 'm7') return 'm7코드는 9, 11 텐션을 사용할 수 있어요!';
    if (quality === '7')  return '7코드는 모든 텐션을 사용할 수 있어요!';
    return null;
  },
  '7': () => {
    const q = _comboCurrentQuestion;
    if (!q) return null;
    const notes = getMinorScaleNotes(q.keyIdx, _comboUseFlat);
    return `${q.keyName} 스케일은 ${notes.join(' ')} 예요!`;
  },
  '8': _ccScaleHint,
};

// 어려움 난이도는 힌트 미제공. 해당 장에 힌트가 정의 안 됐으면 버튼 숨김.
function _comboUpdateHintVisibility() {
  const btn = document.getElementById('combo-quiz-hint');
  if (!btn) return;
  const available = _comboDifficulty !== 'high' && !!CC_CHAPTER_HINTS[_comboChapter];
  btn.classList.toggle('combo-quiz-hint--hidden', !available);
}

function comboShowHint() {
  if (_comboDifficulty === 'high') return;
  const fn = CC_CHAPTER_HINTS[_comboChapter];
  if (!fn) return;
  const text = fn();
  if (!text) return;
  const bubble = document.getElementById('combo-hint-bubble');
  if (!bubble) return;
  const showing = bubble.style.display !== 'none';
  if (showing) {
    bubble.style.display = 'none';
    bubble.classList.remove('combo-hint-bubble--show');
    return;
  }
  bubble.textContent = text;
  bubble.style.display = 'block';
  bubble.classList.remove('combo-hint-bubble--show');
  void bubble.offsetWidth;
  bubble.classList.add('combo-hint-bubble--show');
}

function renderComboQuestion() {
  _comboRestoreQuizWrap();
  if (_comboChapter === '8') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh8Question, _comboQuestionType, { hideNonTargetLabels: false, prefillTarget: true, noBracket: true });
  } else if (_comboChapter === '7') {
    renderChapterQuestion(generateCh7Question, 'placement');
  } else if (_comboChapter === '6') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh6Question, _comboQuestionType, { hideNonTargetLabels: false, prefillTarget: true, promptText: '어울리는 텐션을 찾아서 바꿔보세요' });
  } else if (_comboChapter === '5') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh5Question, _comboQuestionType, { hideNonTargetLabels: false, prefillTarget: true });
  } else if (_comboChapter === '4') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh4Question, _comboQuestionType, { hideNonTargetLabels: false, prefillTarget: false });
  } else if (_comboChapter === '3') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh3Question, _comboQuestionType, { hideNonTargetLabels: false, prefillTarget: false });
  } else if (_comboChapter === '2') {
    _comboQuestionType = 'substitution';
    renderChapterQuestion(generateCh2Question, _comboQuestionType);
  } else {
    renderCh1Question(_comboDifficulty);
  }
  _comboUpdateHintVisibility();
}

// ── 트레이 카드 배열 — 1줄 고정 + 가로 스크롤(2026-09-08, daily-mission 레이아웃과 통일) ──
// 예전엔 최대 3줄로 줄바꿈해서 담았음(폭 측정+트리밍 로직 필요, mission-session.js
// _msComboRenderTray 주석 참고 — 미션 레이아웃에서 3줄이면 제출버튼이 밀려나서 그쪽만
// 먼저 스크롤로 바꿨던 걸 여기도 통일). 스크롤이면 트리밍이 필요 없어져 로직도 단순해짐.
function _comboRenderTray(candidates, mustInclude, blocksWrap) {
  const mustSet = new Set(mustInclude);
  const must = candidates.filter(c => mustSet.has(c.degree));
  const rest = candidates.filter(c => !mustSet.has(c.degree));
  const ordered = _ccShuffle([...must, ...rest]);

  blocksWrap.innerHTML = '';
  ordered.forEach(({ degree, chord }) => {
    const block = document.createElement('div');
    block.className = 'combo-block';
    block.innerHTML = _ccFormatB5(chord);
    block.dataset.degree = degree;
    block.dataset.chord = chord;
    blocksWrap.appendChild(block);
  });

  blocksWrap.scrollLeft = 0; // 새 문제는 항상 맨 왼쪽부터 보이게
  _comboUpdateScrollHint();
}

// ── 문제 1개를 퀴즈 뷰 DOM에 렌더 ────────────────────────────
function renderCh1Question(difficulty) {
  const q = generateCh1Question(difficulty, _comboKeyIdx, _comboUseFlat, _comboSeenProgressions);
  _comboCurrentQuestion = q;
  _comboSeenProgressions.push(q.degrees);

  const keyEl = document.querySelector('.combo-quiz-key');
  if (keyEl) keyEl.textContent = `${q.keyName} key`;

  const slots = document.querySelectorAll('#combo-quiz-answer .combo-answer-slot');
  slots.forEach((slot, i) => {
    const drop = slot.querySelector('.combo-answer-drop');
    if (drop) {
      drop.innerHTML = '';
      drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong');
    }
    const label = slot.querySelector('.combo-answer-degree');
    if (label) label.innerHTML = _ccFormatB5(q.labels[i]);
    slot.dataset.answerChord = q.chords[i];
  });

  const blocksWrap = document.getElementById('combo-quiz-blocks');
  if (blocksWrap) _comboRenderTray(q.tray, q.degrees, blocksWrap);
}

// ── 2·3장 공용 문제 렌더: 배치형 = 1장과 동일, 교체형 = 원본 제시+1개 강조 교체 ──
// generatorFn: generateCh2Question | generateCh3Question (시그니처 동일)
// options.hideNonTargetLabels: 강조 슬롯 외 도수라벨 숨김(2장=true, 3장=false — 3장은 전부 표기)
// options.prefillTarget: 강조 슬롯에 원본 코드 미리 채움(2장=true) vs 빈칸으로 시작(3장=false)
function renderChapterQuestion(generatorFn, type, options = {}) {
  const { hideNonTargetLabels = true, prefillTarget = true, promptText = null, noBracket = false } = options;
  const q = generatorFn(type, _comboDifficulty, _comboKeyIdx, _comboUseFlat, _comboSeenProgressions, _comboLastTarget);
  _comboCurrentQuestion = q;
  _comboSeenProgressions.push(q.degrees || q.baseDegrees);
  if (q.targetDegree) _comboLastTarget = q.targetDegree;

  const keyEl = document.querySelector('.combo-quiz-key');
  if (keyEl) keyEl.textContent = `${q.keyName} key`;
  const promptEl = document.querySelector('.combo-quiz-prompt');

  const slots = document.querySelectorAll('#combo-quiz-answer .combo-answer-slot');
  // 이전 문제 채점 후 그려진 다이어그램 잔상 제거(안 지우면 다음 문제 타겟 슬롯에 이전 정답 모양이 남음)
  slots.forEach(slot => slot.querySelector('.combo-answer-diagram')?.remove());

  if (type === 'placement') {
    if (promptEl) promptEl.textContent = '주어진 진행을 순서대로 배치하세요';
    slots.forEach((slot, i) => {
      slot.classList.remove('combo-answer-slot--target');
      slot.dataset.locked = '';
      const drop = slot.querySelector('.combo-answer-drop');
      if (drop) {
        drop.innerHTML = '';
        drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong', 'combo-answer-drop--locked');
      }
      const label = slot.querySelector('.combo-answer-degree');
      if (label) label.innerHTML = _ccFormatB5(q.labels[i]);
      slot.dataset.answerChord = q.chords[i];
    });
  } else {
    // 교체형: 원본 진행을 전부 배치, 강조 슬롯(1개 또는 4장의 2개)만 대상 코드로 교체
    const targets = q.targetIndices || [q.targetIndex];
    const answerAt = {};
    if (q.substituteChords) {
      targets.forEach((idx, k) => { answerAt[idx] = q.substituteChords[k]; });
    } else {
      answerAt[q.targetIndex] = q.substituteChord;
    }
    if (promptEl) {
      // substituteLabel(s)에 "(b5)" 등 실제 텐션 괄호가 섞일 수 있어 그 부분만 sup 처리 —
      // 문장 전체에 _ccFormatB5를 걸면 "(으)로"의 괄호까지 sup 처리되어 라벨 조각에만 적용.
      promptEl.innerHTML = promptText || (q.substituteLabels
        ? `표시된 부분을 순서대로 ${q.substituteLabels.map(_ccFormatB5).join(' · ')}(으)로 바꿔보세요`
        : `표시된 부분을 ${_ccFormatB5(q.substituteLabel)}(으)로 바꿔보세요`);
    }
    slots.forEach((slot, i) => {
      const isTarget = targets.includes(i);
      const label = slot.querySelector('.combo-answer-degree');
      if (label) label.innerHTML = (!hideNonTargetLabels || isTarget) ? _ccFormatB5(q.labels[i]) : '';
      const drop = slot.querySelector('.combo-answer-drop');
      if (drop) {
        drop.innerHTML = '';
        drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong');
        drop.classList.toggle('combo-answer-drop--locked', !isTarget);
        // 잠긴 슬롯은 항상 원본 코드 미리 채움. 강조 슬롯은 prefillTarget 옵션 따름(3·4장=빈칸 시작).
        if (!isTarget || prefillTarget) {
          const block = document.createElement('div');
          block.className = 'combo-block';
          block.innerHTML = _ccFormatB5(q.originalChords[i]);
          block.dataset.degree = q.baseDegrees[i];
          block.dataset.chord  = q.originalChords[i];
          drop.appendChild(block);
        }
      }
      slot.classList.toggle('combo-answer-slot--target', isTarget);
      slot.dataset.locked = isTarget ? '' : '1';
      slot.dataset.answerChord = isTarget ? answerAt[i] : q.originalChords[i];
    });
    _comboUpdateBracket(noBracket ? null : (q.bracketIndices || (targets.length > 1 ? targets : null)));
    _comboShowLockedDiagrams();
  }
  if (type === 'placement') _comboUpdateBracket(null);

  const blocksWrap = document.getElementById('combo-quiz-blocks');
  if (blocksWrap) {
    const mustInclude = type === 'placement' ? q.degrees : (q.substituteDegrees || [q.substituteDegree]);
    _comboRenderTray(q.tray, mustInclude, blocksWrap);
  }
}

// ── 4장: 관련 IIm·세컨더리 도미넌트 두 슬롯을 하단 브래킷으로 연결 ──
// targets가 null이면 브래킷 숨김. 2개 이상이면 최소~최대 인덱스 슬롯을 감싸는 위치로 계산.
function _comboUpdateBracket(targets) {
  const bracket = document.getElementById('combo-answer-bracket');
  if (!bracket) return;
  if (!targets || targets.length < 2) { bracket.style.display = 'none'; return; }
  const container = document.getElementById('combo-quiz-answer');
  const slotEls = container?.querySelectorAll('.combo-answer-slot');
  if (!container || !slotEls?.length) { bracket.style.display = 'none'; return; }
  const sorted = [...targets].sort((a, b) => a - b);
  const startSlot = slotEls[sorted[0]];
  const endSlot   = slotEls[sorted[sorted.length - 1]];
  if (!startSlot || !endSlot) { bracket.style.display = 'none'; return; }
  const containerRect = container.getBoundingClientRect();
  const startRect = startSlot.getBoundingClientRect();
  const endRect   = endSlot.getBoundingClientRect();
  // 양 끝을 슬롯 가장자리가 아니라 텍스트(슬롯) 중앙에 맞춤
  const startCenter = startRect.left + startRect.width / 2 - containerRect.left;
  const endCenter    = endRect.left + endRect.width / 2 - containerRect.left;
  bracket.style.display = '';
  bracket.style.left  = startCenter + 'px';
  bracket.style.width = (endCenter - startCenter) + 'px';
}

// ── 퀴즈 뷰 진입 ────────────────────────────────────────────
function enterComboQuiz(difficulty, chapter) {
  _comboResetDragState(); // 이전 장에서 드래그 도중 이탈했을 경우의 잔재 정리
  Object.keys(_comboVoicingCache).forEach(k => delete _comboVoicingCache[k]); // 장 전환 시 보이싱 캐시 초기화

  _comboInQuiz = true;
  _comboDifficulty    = difficulty || 'low';
  _comboChapter        = chapter || '1';
  _comboKeyIdx        = _comboChapter === '6' ? ch6PickRandomKey(_comboDifficulty) : pickRandomKey(_comboDifficulty);
  _comboUseFlat       = _comboChapter === '7' ? pickUseFlatForCh7Key(_comboKeyIdx) : pickUseFlatForKey(_comboKeyIdx);
  _comboQuestionIndex = 0;
  _comboSubmitted      = false;
  _comboCurrentQuestion = null;
  _comboSeenProgressions = [];
  _comboLastTarget = null;
  _comboCorrectCount = 0;
  _comboSessionStartMs = Date.now(); // 훈련시간 측정 시작

  try {
    renderComboQuestion();
  } catch (err) {
    // 문제 생성 중 예외가 나면 이전 장 화면이 그대로 남아 먹통처럼 보이는 걸 방지 —
    // 항상 안전한 1장 알고리즘으로 강제 폴백해서 최소한 화면은 갱신되게 함.
    console.error('[chord-combo] 문제 생성 실패, 1장으로 폴백:', err);
    _comboChapter = '1';
    renderCh1Question(_comboDifficulty);
  }
  resetComboSubmitBtn();
  document.getElementById('combo-view-select')?.classList.add('quiz-view--left');
  document.getElementById('combo-view-quiz')?.classList.remove('quiz-view--right');
  const prog = document.getElementById('combo-quiz-progress');
  if (prog) {
    prog.style.display = '';
    prog.innerHTML = '';
    for (let i = 0; i < COMBO_QUESTIONS_PER_SESSION; i++) {
      const dot = document.createElement('span');
      dot.className = 'combo-quiz-dot' + (i === 0 ? ' active' : '');
      prog.appendChild(dot);
    }
  }
  const currency = document.getElementById('topbar-currency');
  if (currency) currency.style.display = 'none';
}

// ── 제출 버튼 라벨을 "제출하기"로 초기화 ─────────────────────
function resetComboSubmitBtn() {
  const btn = document.getElementById('combo-quiz-submit');
  if (btn) btn.textContent = '제출하기';
}

// ── 퀴즈 진행 dot 갱신 (0-based 문제 인덱스) ────────────────
function updateComboQuizProgress(idx) {
  const prog = document.getElementById('combo-quiz-progress');
  if (!prog) return;
  prog.querySelectorAll('.combo-quiz-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ── 퀴즈 뷰 이탈 (선택 뷰로 복귀) ───────────────────────────
function exitComboQuiz() {
  _comboFlushTrainingTime(); // 중간 이탈분 적립 (완료 후 이탈이면 이미 적립돼 no-op)
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _comboResetDragState();
  _comboInQuiz = false;
  document.getElementById('combo-view-quiz')?.classList.add('quiz-view--right');
  document.getElementById('combo-view-select')?.classList.remove('quiz-view--left');
  const prog = document.getElementById('combo-quiz-progress');
  if (prog) prog.style.display = 'none';
  const currency = document.getElementById('topbar-currency');
  if (currency) currency.style.display = '';
}

// 슬롯 인덱스 i의 정답 도수 — 오답 힌트 텍스트 클릭 시 사운드 재생용(comboPlayBlockSound가 degree로 조회).
function _comboCorrectDegreeForSlot(i) {
  const q = _comboCurrentQuestion;
  if (!q) return null;
  if (q.degrees) return q.degrees[i]; // 배치형
  const targets = q.targetIndices || [q.targetIndex];
  const substituteDegrees = q.substituteDegrees || [q.substituteDegree];
  const k = targets.indexOf(i);
  return k !== -1 ? substituteDegrees[k] : q.baseDegrees[i];
}

// ── 제출 버튼: 채점 전엔 "제출", 채점 후엔 "다음" 역할 ──────────
function comboSubmitAnswer() {
  if (_comboSubmitted) {
    comboNextQuestion();
    return;
  }

  const slots = document.querySelectorAll('#combo-quiz-answer .combo-answer-slot');
  const drops = Array.from(slots).map(s => s.querySelector('.combo-answer-drop'));

  // 전부 채워지지 않았으면 제출 불가 — 빈 슬롯 흔들림 표시
  const emptyDrops = drops.filter(d => !d.querySelector('.combo-block'));
  if (emptyDrops.length) {
    emptyDrops.forEach(d => {
      d.classList.remove('combo-answer-drop--shake');
      void d.offsetWidth;
      d.classList.add('combo-answer-drop--shake');
    });
    return;
  }

  _playConfirmSfx();

  // 교체형에서 강조슬롯 외 도수라벨을 숨겼던 문제(2장)라도 제출 후엔 전부 보이게 복원
  const qLabels = _comboCurrentQuestion?.labels;
  if (qLabels) {
    slots.forEach((slot, i) => {
      const label = slot.querySelector('.combo-answer-degree');
      if (label) label.innerHTML = _ccFormatB5(qLabels[i]);
    });
  }

  let allCorrect = true;
  slots.forEach((slot, i) => {
    const drop  = slot.querySelector('.combo-answer-drop');
    const block = drop.querySelector('.combo-block');
    const isCorrect = block.dataset.chord === slot.dataset.answerChord;
    if (!isCorrect) allCorrect = false;
    drop.classList.remove('combo-answer-drop--correct', 'combo-answer-drop--wrong');
    drop.querySelector('.combo-answer-correct-hint')?.remove();
    // 교체형 잠긴(흐림처리) 슬롯은 항상 원본 그대로라 채점 대상이 아님 — 정오답 색상 표시 안 함
    if (slot.dataset.locked === '1') return;
    drop.classList.add(isCorrect ? 'combo-answer-drop--correct' : 'combo-answer-drop--wrong');
    if (!isCorrect) {
      const hint = document.createElement('span');
      hint.className = 'combo-answer-correct-hint';
      hint.innerHTML = _ccFormatB5(slot.dataset.answerChord);
      hint.dataset.degree = _comboCorrectDegreeForSlot(i);
      hint.dataset.chord  = slot.dataset.answerChord;
      hint.addEventListener('pointerup', () => comboPlayBlockSound(hint));
      drop.appendChild(hint);
    }
  });

  _comboShowAnswerDiagrams();

  if (allCorrect) _comboCorrectCount++;
  console.log('chord-combo: 제출 결과 —', allCorrect ? '정답' : '오답');
  comboPlaySound(allCorrect ? 'correct' : 'wrong');

  _comboSubmitted = true;
  const btn = document.getElementById('combo-quiz-submit');
  const isLast = _comboQuestionIndex >= COMBO_QUESTIONS_PER_SESSION - 1;
  if (btn) btn.textContent = isLast ? '완료' : '다음';
}

// ── 슬롯에 정답 코드의 운지 다이어그램 표시 ──────────────────
// 보이싱은 _comboResolveVoicing 한 곳에서만 결정 → 화면의 운지와 클릭 사운드가 항상 같은 보이싱.
// 5단계 반응형 — 슬롯 크기(§ .combo-answer-drop)에 맞춰 --combo-diagram-w도 단계별로 커짐
function _comboDiagramW() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--combo-diagram-w');
  return parseFloat(v) || 64;
}
function _comboDrawSlotDiagram(slot, i) {
  if (typeof VoicingCanvas === 'undefined') return;
  const dpr = window.devicePixelRatio || 1;
  const diagramW = _comboDiagramW();
  slot.querySelector('.combo-answer-diagram')?.remove();
  const voicing = _comboResolveVoicing(_comboCorrectDegreeForSlot(i), slot.dataset.answerChord);
  if (!voicing) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'combo-answer-diagram';
  slot.insertBefore(canvas, slot.firstChild); // 슬롯 최상단(코드블록 위)
  VoicingCanvas.draw(canvas, voicing, { ratio: (diagramW * dpr) / VoicingCanvas.BASE_W, transparent: true });
  canvas.style.width  = diagramW + 'px';
  canvas.style.height = Math.round(diagramW * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W) + 'px';
}
// 채점 후: 전체 슬롯(타겟 포함) 다이어그램 표시
function _comboShowAnswerDiagrams() {
  document.querySelectorAll('#combo-quiz-answer .combo-answer-slot').forEach((slot, i) => _comboDrawSlotDiagram(slot, i));
}
// 문제 렌더 시: 이미 채워진(잠긴) 슬롯만 다이어그램 표시 — 타겟(정답) 슬롯은 채점 전엔 그리지 않음(힌트 방지)
function _comboShowLockedDiagrams() {
  document.querySelectorAll('#combo-quiz-answer .combo-answer-slot').forEach((slot, i) => {
    if (slot.dataset.locked === '1') _comboDrawSlotDiagram(slot, i);
  });
}

// ── 다음 문제로 (COMBO_QUESTIONS_PER_SESSION문제 다 풀면 선택 뷰로 복귀) ──
function comboNextQuestion() {
  _playTap();
  _playConfirmSfx();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  if (_comboQuestionIndex >= COMBO_QUESTIONS_PER_SESSION - 1) {
    _comboRecordSessionComplete();
    _comboShowResultModal();
    return;
  }
  _comboQuestionIndex++;
  _comboSubmitted = false;
  renderComboQuestion();
  resetComboSubmitBtn();
  updateComboQuizProgress(_comboQuestionIndex);
}

// ── 10문제 완료 기록: 행동형 XP(정답 무관) ──
function _comboRecordSessionComplete() {
  _comboFlushTrainingTime(); // 완료까지 걸린 시간 적립
  const ch = _comboChapter;
  if (typeof addXp === 'function') addXp(BEHAVE_XP.combo); // 행동형 XP: 리하모니 화성학 완료 (사일런트, 정답 무관)
  if (typeof analytics !== 'undefined') {
    analytics.track('combo_training_completed', {
      chapter: ch, difficulty: _comboDifficulty,
      correct: _comboCorrectCount, total: COMBO_QUESTIONS_PER_SESSION,
    });
  }
}

// ── 10문제 완료 모달: 정답 수/문제 수 표시 + 돌아갈래요/다시할래요 ──
function _comboShowResultModal() {
  let ov = document.getElementById('combo-result-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'combo-result-overlay';
    ov.className = 'leave-practice-overlay';
    ov.innerHTML = `
      <div class="leave-practice-modal combo-result-modal">
        <div class="leave-practice-title">완료했어요!</div>
        <div class="combo-result-score"><span id="combo-result-correct">0</span> / <span id="combo-result-total">${COMBO_QUESTIONS_PER_SESSION}</span></div>
        <div class="leave-practice-actions">
          <button class="leave-practice-btn leave-practice-btn--ghost" id="combo-result-exit">그만할래요</button>
          <button class="leave-practice-btn leave-practice-btn--primary" id="combo-result-retry">
            <span>다시할래요</span>
            <span class="practice-gate-cost">
              <img src="image/white_peak.svg" alt="" class="practice-gate-icon">
              <span>x2</span>
            </span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#combo-result-exit').onclick  = () => { ov.style.display = 'none'; exitComboQuiz(); };
    ov.querySelector('#combo-result-retry').onclick = async () => {
      _playSfx('pop.mp3');
      if (!(await consumePeak(2, 'chord_combo'))) return;
      ov.style.display = 'none';
      enterComboQuiz(_comboDifficulty, _comboChapter);
    };
  }
  ov.querySelector('#combo-result-correct').textContent = _comboCorrectCount;
  ov.style.display = 'flex';
  const modal = ov.querySelector('.leave-practice-modal');
  if (modal) { modal.style.animation = 'none'; void modal.offsetWidth; modal.style.animation = ''; }
}

// ── 카드블록 드래그 배치 / 배치된 카드블록끼리 교체 ───────────
// 트레이 카드블록은 항상 복사만 됨(원본 유지, 개수 안 줄어듦).
// 슬롯에 이미 배치된 카드블록끼리는 실제로 이동/교체된다.
let _comboDragBlock      = null;
let _comboDragFrom       = null; // 드래그 시작 시 원래 부모(트레이 또는 슬롯 drop)
let _comboDragSourceType = null; // 'tray' | 'slot'
let _comboDragClone      = null;
let _comboDragOffX       = 0;
let _comboDragOffY       = 0;
let _comboDragStartX     = 0;
let _comboDragStartY     = 0;
const COMBO_TAP_MOVE_THRESHOLD = 8; // px — 이 이하 이동이면 드래그가 아닌 짧은 터치로 판정

// ── 트레이 가로스크롤 + 드래그 축판정(2026-09-08, mission-session.js에서 이식) ──
// 트레이는 가로 스크롤과 "카드 꺼내기" 드래그가 같은 영역에서 겹친다. 정답 슬롯이 트레이
// 바로 위에 있으므로 두 동작의 자연스러운 방향이 서로 직교함 → 첫 이동 방향으로 의도를 가른다.
let _comboDragPending = false; // 트레이 카드: 가로(스크롤) vs 세로(꺼내기) 방향 판정 대기 중
const COMBO_AXIS_LOCK_THRESHOLD = 6; // px — 이만큼 움직여야 방향을 판정
let _comboScrolling = false;       // 방향 판정 결과 "가로=스크롤"로 확정됐는지
let _comboScroller = null;         // 스크롤 대상 엘리먼트(#combo-quiz-blocks)
let _comboScrollStartLeft = 0;
let _comboScrollLastX = 0, _comboScrollLastT = 0, _comboScrollVelocity = 0;
let _comboScrollMomentumId = null;

function _comboScrollStopMomentum() {
  if (_comboScrollMomentumId) { cancelAnimationFrame(_comboScrollMomentumId); _comboScrollMomentumId = null; }
}
function _comboScrollRunMomentum() {
  const FRICTION = 0.88;
  const step = () => {
    _comboScrollVelocity *= FRICTION;
    if (Math.abs(_comboScrollVelocity) < 0.01 || !_comboScroller) { _comboScrollMomentumId = null; return; }
    _comboScroller.scrollLeft -= _comboScrollVelocity * 16;
    _comboScrollMomentumId = requestAnimationFrame(step);
  };
  _comboScrollMomentumId = requestAnimationFrame(step);
}

// 스크롤 가능(오른쪽에 더 남음)할 때만 화살표 힌트 노출 — 끝까지 스크롤하면 사라짐
function _comboUpdateScrollHint() {
  const scroller = document.getElementById('combo-quiz-blocks');
  const hint = document.getElementById('combo-scroll-hint');
  if (!scroller || !hint) return;
  const hasOverflow = scroller.scrollWidth - scroller.clientWidth > 4;
  const atEnd = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
  hint.classList.toggle('ms-combo-scroll-hint--hidden', !hasOverflow || atEnd);
  // 카드가 적어서 안 넘칠 땐 왼쪽 붙임 대신 가운데 정렬
  scroller.classList.toggle('ms-combo-blocks--fit', !hasOverflow);
}
function _comboInitScrollHint() {
  const scroller = document.getElementById('combo-quiz-blocks');
  if (!scroller || scroller._scrollHintInit) return;
  scroller._scrollHintInit = true;
  scroller.addEventListener('scroll', _comboUpdateScrollHint);
  window.addEventListener('resize', _comboUpdateScrollHint);
}

// ── 트레이 빈 공간(카드 사이 gap) 드래그로 가로스크롤 — 마우스 전용(터치는 overflow-x:auto가
// 기본 처리하고 카드 위 드래그는 축 잠금이 따로 처리하므로 여기는 "카드가 아닌 곳에서
// 시작한 마우스 드래그"만 다룬다) ──
function _comboInitTrayBackgroundDrag(scroller) {
  if (!scroller || scroller._dragInit) return;
  scroller._dragInit = true;
  let dragging = false, startX = 0, startScroll = 0;

  scroller.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return; // 터치는 네이티브 스크롤에 맡김
    if (e.target.closest('.combo-block')) return; // 카드 위 시작은 축 잠금 로직에 양보
    dragging = true;
    startX = e.clientX;
    startScroll = scroller.scrollLeft;
    scroller.classList.add('ms-combo-blocks-scroll--dragging');
  });
  scroller.addEventListener('pointermove', e => {
    if (!dragging) return;
    scroller.scrollLeft = startScroll - (e.clientX - startX);
  });
  const endDrag = () => { dragging = false; scroller.classList.remove('ms-combo-blocks-scroll--dragging'); };
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointerleave', endDrag);
}

function _comboGetDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const slotDrop = el.closest('.combo-answer-drop');
  if (slotDrop) return slotDrop;
  const tray = el.closest('#combo-quiz-blocks');
  if (tray) return tray;
  return null;
}

function _comboPopBlock(block) {
  block.classList.remove('combo-block--pop');
  void block.offsetWidth; // 리플로우 강제 → 애니메이션 재시작
  block.classList.add('combo-block--pop');
}

// 드래그 중이던 상태를 강제로 정리 — 퀴즈 이탈/재진입 시 이전 장의 드래그 잔재(고스트 클론,
// pointermove 리스너)가 남아있으면 다음 장에서 클릭/드래그가 먹통처럼 보일 수 있어 방어적으로 호출.
function _comboResetDragState() {
  document.removeEventListener('pointermove', _comboBlockPointerMove);
  document.removeEventListener('pointerup', _comboBlockPointerUp);
  document.removeEventListener('pointercancel', _comboEndDragTracking);
  if (_comboDragClone) { _comboDragClone.remove(); _comboDragClone = null; }
  _comboScroller?.classList.remove('ms-combo-blocks-scroll--dragging');
  _comboDragBlock = null;
  _comboDragFrom  = null;
  _comboDragSourceType = null;
  _comboDragPending = false;
  _comboScrolling = false;
  _comboScroller = null;
}

// 실제 드래그 시각효과(고스트 클론) 시작 — 방향 판정이 "세로=꺼내기"로 확정된 뒤에 호출
function _comboBeginDragVisual() {
  const block = _comboDragBlock;
  if (!block || _comboDragClone) return;
  const rect = block.getBoundingClientRect();
  _comboDragOffX = _comboDragStartX - rect.left;
  _comboDragOffY = _comboDragStartY - rect.top;

  const clone = block.cloneNode(true);
  clone.classList.add('combo-block--dragging-clone');
  clone.style.position = 'fixed';
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = 999;
  document.body.appendChild(clone);
  _comboDragClone = clone;

  if (_comboDragSourceType === 'slot') block.classList.add('combo-block--source-hidden');
}

function _comboBlockPointerMove(e) {
  // 방향 판정 대기 중(트레이 카드) — 가로 우세면 스크롤 시작, 세로 우세면 카드 꺼내기 시작
  if (_comboDragPending) {
    const dx = e.clientX - _comboDragStartX;
    const dy = e.clientY - _comboDragStartY;
    if (Math.hypot(dx, dy) < COMBO_AXIS_LOCK_THRESHOLD) return;
    _comboDragPending = false;
    // 드래그(문제 배치)가 주 동작이라 애매한 대각선은 드래그로 우선 판정 — 스크롤은
    // 가로가 세로보다 뚜렷하게(1.4배 이상) 우세할 때만.
    if (Math.abs(dx) > Math.abs(dy) * 1.4) {
      _comboScrolling = true;
      _comboScroller = document.getElementById('combo-quiz-blocks');
      _comboScrollStopMomentum();
      _comboScrollStartLeft = _comboScroller ? _comboScroller.scrollLeft : 0;
      _comboScrollLastX = e.clientX;
      _comboScrollLastT = performance.now();
      _comboScrollVelocity = 0;
      _comboScroller?.classList.add('ms-combo-blocks-scroll--dragging');
    } else {
      _comboBeginDragVisual();
    }
  }

  if (_comboScrolling) {
    if (_comboScroller) _comboScroller.scrollLeft = _comboScrollStartLeft - (e.clientX - _comboDragStartX);
    const now = performance.now();
    const dt = now - _comboScrollLastT;
    if (dt > 0) _comboScrollVelocity = (e.clientX - _comboScrollLastX) / dt;
    _comboScrollLastX = e.clientX;
    _comboScrollLastT = now;
    return;
  }

  if (!_comboDragClone) return;
  _comboDragClone.style.left = (e.clientX - _comboDragOffX) + 'px';
  _comboDragClone.style.top  = (e.clientY - _comboDragOffY) + 'px';
}

// 드래그 추적 종료 + 상태 초기화. 브라우저가 제스처를 가로채 pointercancel이 올 때도 여기로 온다
function _comboEndDragTracking() {
  document.removeEventListener('pointermove', _comboBlockPointerMove);
  document.removeEventListener('pointerup', _comboBlockPointerUp);
  document.removeEventListener('pointercancel', _comboEndDragTracking);
  if (_comboDragClone) { _comboDragClone.remove(); _comboDragClone = null; }
  _comboScroller?.classList.remove('ms-combo-blocks-scroll--dragging');
  _comboDragBlock?.classList.remove('combo-block--source-hidden');
  _comboDragBlock = null;
  _comboDragFrom = null;
  _comboDragSourceType = null;
  _comboDragPending = false;
  _comboScrolling = false;
  _comboScroller = null;
}

function _comboBlockPointerUp(e) {
  document.removeEventListener('pointermove', _comboBlockPointerMove);
  document.removeEventListener('pointercancel', _comboEndDragTracking);
  if (_comboDragClone) { _comboDragClone.remove(); _comboDragClone = null; }

  const block      = _comboDragBlock;
  const from        = _comboDragFrom;
  const sourceType  = _comboDragSourceType;
  const wasPending = _comboDragPending, wasScrolling = _comboScrolling;
  _comboDragBlock = null;
  _comboDragFrom  = null;
  _comboDragSourceType = null;
  _comboDragPending = false;
  if (wasScrolling) {
    _comboScroller?.classList.remove('ms-combo-blocks-scroll--dragging');
    const MAX_VELOCITY = 1.5;
    _comboScrollVelocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, _comboScrollVelocity));
    if (Math.abs(_comboScrollVelocity) > 0.05) _comboScrollRunMomentum();
    _comboScrolling = false;
    _comboScroller = null;
  }
  if (!block) return;
  block.classList.remove('combo-block--source-hidden');

  // 방향 판정 전에 손을 뗐다(탭) 또는 스크롤로 끝났다 — 카드 이동/드롭 판정은 안 함
  if (wasPending || wasScrolling) {
    if (wasPending) {
      const movedPending = Math.hypot(e.clientX - _comboDragStartX, e.clientY - _comboDragStartY);
      if (movedPending < COMBO_TAP_MOVE_THRESHOLD) comboPlayBlockSound(block);
    }
    return;
  }

  // 이동 거리가 짧으면(=드래그 아닌 짧은 터치) 사운드만 재생
  const moved = Math.hypot(e.clientX - _comboDragStartX, e.clientY - _comboDragStartY);
  if (moved < COMBO_TAP_MOVE_THRESHOLD) {
    comboPlayBlockSound(block);
    return;
  }

  const target = _comboGetDropTarget(e.clientX, e.clientY);
  if (!target || target === from) return; // 원래 자리 그대로 → 아무 변화 없음

  // 교체형 잠긴 슬롯엔 못 놓음
  const targetSlot = target.closest?.('.combo-answer-slot');
  if (targetSlot && targetSlot.dataset.locked === '1') return;

  if (sourceType === 'tray') {
    if (!target.classList.contains('combo-answer-drop')) return; // 슬롯 외엔 배치 불가
    const occupant = target.querySelector('.combo-block');
    if (occupant) occupant.remove(); // 트레이엔 이미 원본이 있으므로 그냥 버림
    const placed = block.cloneNode(true); // 트레이 원본은 그대로 두고 사본만 배치
    target.appendChild(placed);
    _comboPopBlock(placed);
  } else {
    if (target.classList.contains('combo-answer-drop')) {
      // 슬롯 ↔ 슬롯: 실제 이동 + 상대 슬롯에 있던 블록과 교체
      const occupant = target.querySelector('.combo-block');
      target.appendChild(block);
      _comboPopBlock(block);
      if (occupant && occupant !== block) {
        from.appendChild(occupant);
        _comboPopBlock(occupant);
      }
    } else {
      // 슬롯 → 트레이: 원본이 이미 트레이에 있으므로 배치 해제(버림)
      block.remove();
    }
  }
}

// ── 카드블록 클릭 사운드 — 낮은 프렛 보이싱 고정(코드진행 보이싱 알고리즘 후보군 중 최저 fretNumber 선택) ──
const _comboVoicingCache  = {}; // `${rootSemitone}_${quality}_${keyIdx}` → voicing (동일 조합 재조회 방지)
const _COMBO_OPEN_MIDI    = [64, 59, 55, 50, 45, 40]; // 1번줄→6번줄 개방현 MIDI

function _comboGetLowestFretVoicing(rootSemitone, quality, keyIdx, bass, tension) {
  if (typeof ProgressionVoicings === 'undefined') return null;
  const cacheKey = `${rootSemitone}_${quality}_${keyIdx}_${bass ?? ''}_${tension ?? ''}`;
  if (cacheKey in _comboVoicingCache) return _comboVoicingCache[cacheKey];
  const candidates = ProgressionVoicings.getCandidates(rootSemitone, quality, keyIdx, bass ?? undefined, tension ?? undefined);
  let best = null;
  candidates.forEach(v => { if (!best || v.fretNumber < best.fretNumber) best = v; });
  _comboVoicingCache[cacheKey] = best;
  return best;
}

function _comboVoicingMidis(voicing) {
  if (!voicing) return [];
  const midis = [];
  for (let s = 5; s >= 0; s--) {
    const f = voicing.frets[s];
    if (f === null) continue;
    midis.push(_COMBO_OPEN_MIDI[s] + f);
  }
  return midis;
}

// 도수+코드명 → 실제 사용할 보이싱. 사운드·다이어그램이 같은 보이싱을 쓰도록 여기 한 곳에서만 결정.
function _comboResolveVoicing(degree, chordStr) {
  const useSeventh   = _comboChapter === '6' ? true : _comboDifficulty === 'high'; // 6장은 항상 7화음
  const slash        = (typeof CC_SLASH_INFO !== 'undefined') ? CC_SLASH_INFO[degree] : null;

  let rootSemitone, quality, bass = null;
  if (slash) {
    // 슬래시코드: base 코드 + 베이스 오프셋(전위)
    const info = CC_DEGREE_TRIAD[slash.base];
    if (!info) return null;
    quality      = useSeventh ? info.quality7 : info.quality;
    rootSemitone = (_comboKeyIdx + info.offset) % 12;
    bass         = slash.bassOffset;
  } else {
    const info = CC_DEGREE_TRIAD[degree];
    if (!info) return null;
    quality      = useSeventh ? info.quality7 : info.quality;
    rootSemitone = (_comboKeyIdx + info.offset) % 12;
  }

  // 6장(텐션코드) 또는 quality:'tension'(5장 bII7(#11) 등)이면 코드명 끝 "(...)" 텐션 심볼을
  // getCandidates에 명시적으로 넘겨야 정확한 보이싱을 찾음.
  // bII7(#11)류는 CC_DEGREE_TRIAD.quality가 'tension' 버킷 이름 그 자체라 getCandidates 텐션 분기의
  // 코드명 조합(root+베이스코드질+텐션)에 못 씀 — 실제 베이스 코드질(항상 dominant 7)로 치환해서 넘김.
  const isTensionBucket = quality === 'tension';
  const tensionMatch    = (_comboChapter === '6' || isTensionBucket) ? (chordStr || '').match(/\([^)]*\)$/) : null;
  const tension          = tensionMatch ? tensionMatch[0] : null;
  const lookupQuality    = isTensionBucket ? '7' : quality;

  return _comboGetLowestFretVoicing(rootSemitone, lookupQuality, _comboKeyIdx, bass, tension);
}

async function comboPlayBlockSound(block) {
  if (typeof GuitarAudio === 'undefined') return;

  // 6장: 제출 전엔 트레이·타겟 슬롯의 "텐션이 실제로 붙은" 코드만 사운드 숨김 — 무음이 힌트가 되는 걸 방지.
  // 텐션 미적용(플레인 7화음) 상태는 힌트가 안 되므로 재생 허용. 잠긴 슬롯은 항상 재생 가능.
  if (_comboChapter === '6' && !_comboSubmitted) {
    const parentSlot = block.parentElement?.closest?.('.combo-answer-slot');
    const inTray   = block.parentElement?.id === 'combo-quiz-blocks';
    const inTarget = parentSlot?.classList.contains('combo-answer-slot--target');
    const hasTension = /\(/.test(block.dataset.chord || '');
    if ((inTray || inTarget) && hasTension) return;
  }

  const voicing = _comboResolveVoicing(block.dataset.degree, block.dataset.chord);
  const midis   = _comboVoicingMidis(voicing);
  if (!midis.length) return;
  if (GuitarAudio.resume) { try { await GuitarAudio.resume(); } catch (e) {} }
  GuitarAudio.strumNotes(midis, 0.008);
}

// ── v2 문제 설명 카드 스피커: 정답 코드 진행 재생 ──
// 보이싱은 VoicingCycle(코드반주 훈련과 같은 순환 규칙)이 고른다. 화면을 떠나거나 문제가 바뀌면 하드컷(GuitarAudio.panic)
const COMBO_V2_PLAY_BPM = 120;
const COMBO_V2_PLAY_BEATS = 2;   // 코드 하나가 차지하는 박 수
const COMBO_V2_PLAY_STEP_SEC = 60 / COMBO_V2_PLAY_BPM * COMBO_V2_PLAY_BEATS;   // 코드 하나의 길이(초)
const COMBO_V2_PLAY_BPM_8 = 90;   // 8코드 진행: 4코드를 2배로 압축한 박자(칸당 1박)
const COMBO_V2_PLAY_STEP_SEC_8 = 60 / COMBO_V2_PLAY_BPM_8;
const COMBO_V2_NOTE_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const COMBO_V2_PLAY_QUALITY = { '': 'M', m: 'm', dim: 'dim', aug: 'aug', M7: 'M7', '7': '7', m7: 'm7', 'm7(b5)': 'm7(b5)', dim7: 'dim7', sus4: 'sus4', sus2: 'sus2', add9: 'add9', '6': '6', m6: 'm6', '7sus4': '7sus4' };
// 한 번만 들려주므로 순환 비용 없음 + 탑노트·베이스 이동(반음당 0.5)을 줄이는 쪽으로 보이싱 선택
const COMBO_V2_PLAY_PICK = { cyclic: false, topW: 0.5, bassW: 0.5 };
let _comboV2Play = { on: false, timer: null, gen: 0 };   // gen: 재생 준비(await) 중에 정리되면 늦게 시작하지 않게 하는 세대 번호

function _comboV2NoteSemi(n) {
  const m = /^([A-G])([#b]?)$/.exec(n);
  if (!m) return null;
  return (COMBO_V2_NOTE_SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}
function _comboV2ChordStep(name) {   // 코드 이름 → {root, quality, bass}. 지원하지 않는 표기(텐션 등)는 null
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name);
  if (!m) return null;
  const root = _comboV2NoteSemi(m[1]);
  let q = COMBO_V2_PLAY_QUALITY[m[2]], tension = null;
  if (!q) {   // 텐션 코드: Dm7(9) → m7 + (9), G7sus4(9) → 7sus4 + (9)
    const tm = /^(M7|7sus4|m7|7)(\([^)]*\))$/.exec(m[2]);
    if (tm) { q = COMBO_V2_PLAY_QUALITY[tm[1]]; tension = tm[2]; }
  }
  if (root == null || !q) return null;
  let bass = null;
  if (m[3]) { const b = _comboV2NoteSemi(m[3]); if (b == null) return null; bass = (b - root + 12) % 12; }
  return { root: root, quality: q, bass: bass, tension: tension };
}
function _comboV2PlayChords() {   // 지금 문제의 정답 코드 진행(칸 순서). 없으면 null
  const s = _comboV2Sess;
  if (_comboV2Type === 'place') return s.playChords || null;
  if (_comboV2Type === 'swap') {
    const d = COMBO_V2_SW_DATA;
    if (!d.chords) return null;
    return d.chords.map(function (c, i) { return i === d.target && !d.reverse ? d.answer : c; });
  }
  return null;
}
const COMBO_V2_AUTOPLAY_MS = 250;   // 문제 진입 후 이만큼 뒤에 정답 진행을 자동으로 1회 재생
let _comboV2AutoTimer = null;
function _comboV2SoundStop() {   // 멱등. 예약된 스트럼이 남지 않게 항상 하드컷(GuitarAudio.panic)
  if (_comboV2AutoTimer) { clearTimeout(_comboV2AutoTimer); _comboV2AutoTimer = null; }   // 자동재생 예약도 함께 취소
  _comboV2Play.gen++;
  if (_comboV2Play.timer) { clearTimeout(_comboV2Play.timer); _comboV2Play.timer = null; }
  const was = _comboV2Play.on;
  _comboV2Play.on = false;
  document.querySelectorAll('.combo-v2-speaker.is-playing').forEach(function (el) { el.classList.remove('is-playing'); });
  if (typeof GuitarAudio === 'undefined') return;
  if (was) GuitarAudio.panic();
}
async function comboV2PlayProgression(btn) {
  if (_comboV2Play.on) { _comboV2SoundStop(); return; }
  if (typeof GuitarAudio === 'undefined' || typeof VoicingCycle === 'undefined') return;
  const names = _comboV2PlayChords();
  if (!names) return;
  // '%'는 소리를 내지 않고 직전 코드를 그 칸만큼 이어서 울림
  const seq = [];   // {step, len(칸 수, '%' 포함)}
  for (let i = 0; i < names.length; i++) {
    if (names[i] === '%' && seq.length) { seq[seq.length - 1].len++; continue; }
    const st = _comboV2ChordStep(names[i]);
    if (!st) return;
    seq.push({ step: st, len: 1 });
  }
  const voicings = VoicingCycle.pick(seq.map(function (x) { return x.step; }), _comboV2Sess.key.idx, COMBO_V2_PLAY_PICK);
  if (!voicings) return;
  const gen = ++_comboV2Play.gen;
  try { if (GuitarAudio.resume) await GuitarAudio.resume(); if (GuitarAudio.ready) await GuitarAudio.ready(); } catch (e) {}
  if (gen !== _comboV2Play.gen || !_comboV2InQuiz) return;   // await 중에 정리·이탈됨
  const stepSec = names.length > 4 ? COMBO_V2_PLAY_STEP_SEC_8 : COMBO_V2_PLAY_STEP_SEC;
  const t0 = Tone.now() + 0.08;
  let t = t0;
  seq.forEach(function (x, i) {
    GuitarAudio.strumAt(_comboVoicingMidis(voicings[i]), 0.012, t, x.len * stepSec * 0.92, 0.35);   // '%' 칸은 새 스트럼 없이 앞 코드가 이어서 울림
    t += x.len * stepSec;
  });
  _comboV2Play.on = true;
  if (btn) btn.classList.add('is-playing');
  _comboV2Play.timer = setTimeout(function () {   // 정상 종료: 소리는 이미 페이드로 끝남 → 상태만 되돌림(하드컷 불필요)
    _comboV2Play.on = false; _comboV2Play.timer = null;
    document.querySelectorAll('.combo-v2-speaker.is-playing').forEach(function (el) { el.classList.remove('is-playing'); });
  }, (t - t0) * 1000 + 400);
}
document.getElementById('combo-v2-quiz-content')?.addEventListener('click', function (e) {
  const btn = e.target.closest('.combo-v2-speaker');
  if (btn) comboV2PlayProgression(btn);
});
window.addEventListener('pagehide', function () { _comboV2SoundStop(); flushPendingRefund('chord_combo'); });   // 이탈 — 소리 즉시 정지 + 쌓인 피크 환급 전송(못 보내도 대기분이 남아 다음 로드 때 보냄)
document.addEventListener('visibilitychange', function () { if (document.hidden) { _comboV2SoundStop(); flushPendingRefund('chord_combo'); } });

function _comboBlockPointerDown(e) {
  const block = e.target.closest('.combo-block');
  if (!block) return;

  // 교체형 잠긴 슬롯의 고정 코드는 드래그 금지 — 사운드만 재생
  const parentSlot = block.parentElement?.closest?.('.combo-answer-slot');
  if (parentSlot && parentSlot.dataset.locked === '1') {
    e.preventDefault();
    comboPlayBlockSound(block);
    return;
  }

  // 항상 preventDefault — 안 부르면 마우스는 텍스트 드래그선택이, 터치는 브라우저 네이티브
  // 스크롤/줌 제스처가 가로채서 아무 반응이 없는 것처럼 보임. 가로 스크롤은 여기서 네이티브에
  // 기대지 않고 JS로 직접 처리하므로(_comboBlockPointerMove) 막아도 무방.
  e.preventDefault();

  _comboDragStartX = e.clientX;
  _comboDragStartY = e.clientY;
  _comboDragBlock = block;
  _comboDragFrom  = block.parentElement;
  _comboDragSourceType = (_comboDragFrom.id === 'combo-quiz-blocks') ? 'tray' : 'slot';

  // 트레이 카드는 가로 스크롤과 제스처가 겹치므로 방향이 확정될 때까지 드래그를 미룬다.
  // (슬롯 안 카드는 스크롤 영역이 아니라서 예전처럼 즉시 드래그)
  _comboDragPending = _comboDragSourceType === 'tray';
  if (!_comboDragPending) _comboBeginDragVisual();

  document.addEventListener('pointermove', _comboBlockPointerMove);
  document.addEventListener('pointerup', _comboBlockPointerUp, { once: true });
  document.addEventListener('pointercancel', _comboEndDragTracking, { once: true });
}

function initComboDragDrop() {
  const wrap = document.querySelector('.combo-quiz-wrap');
  if (!wrap) return;
  wrap.addEventListener('pointerdown', _comboBlockPointerDown);
  _comboInitScrollHint();
  _comboInitTrayBackgroundDrag(document.getElementById('combo-quiz-blocks'));
}

// 퀴즈 뷰 안쪽(.combo-quiz-wrap)의 최초(순정) HTML 스냅샷.
// 어떤 장이든 접속할 때 이걸로 통째 복원 → 이전 장이 남긴 어떤 변경도(prompt·bracket·슬롯
// target/locked·drop 내용·클래스 등 전부) 무조건 초기화됨. 개별 항목 추적 방식은 새 장 추가 시
// 계속 새어서, 아예 알려진 초기 상태로 전체 복원하는 방식으로 일원화.
// 드래그 리스너는 wrap 자체(부모)에 위임돼 있어 innerHTML 복원해도 유지되고,
// 제출 버튼은 inline onpointerup 라 복원 후에도 동작함.
let _comboQuizWrapPristine = null;
function _comboSnapshotQuizWrap() {
  const wrap = document.querySelector('.combo-quiz-wrap');
  if (wrap && _comboQuizWrapPristine == null) _comboQuizWrapPristine = wrap.innerHTML;
}
function _comboRestoreQuizWrap() {
  const wrap = document.querySelector('.combo-quiz-wrap');
  if (wrap && _comboQuizWrapPristine != null) wrap.innerHTML = _comboQuizWrapPristine;
}

// ── 챕터 캐러셀 원근감 (scale-training.js _updateCarouselScale와 동일 방식) ──
const COMBO_CAROUSEL_MIN_SCALE = 0.88;
const COMBO_CAROUSEL_FALLOFF   = 0.6;

function _updateComboCarouselScale(track) {
  // window.innerWidth/2가 아니라 실제 렌더 영역(.cd-main) 중심 기준으로 계산
  const stage = track.closest('.cd-main') || document.body;
  const stageRect = stage.getBoundingClientRect();
  const viewportCenter = stageRect.left + stageRect.width / 2;
  track.querySelectorAll('.combo-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.left + rect.width / 2;
    const dist = Math.abs(cardCenter - viewportCenter) / window.innerWidth;
    const scale = Math.max(COMBO_CAROUSEL_MIN_SCALE, 1 - dist / COMBO_CAROUSEL_FALLOFF * (1 - COMBO_CAROUSEL_MIN_SCALE));
    card.style.transform = `scale(${scale})`;
  });
}

// 데스크탑 마우스 드래그로 가로 스크롤(shared.js enableMouseDragScroll은 세로 전용이라 별도 구현).
// 터치(모바일)는 네이티브 스크롤 그대로 사용(pointerType 'mouse'만 처리).
function _comboEnableHorizontalDrag(el) {
  if (!el || el._mouseDragScroll) return;
  el._mouseDragScroll = true;
  let dragging = false, moved = false, startX = 0, startLeft = 0, savedSnap = '';
  let suppressClickUntil = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startLeft = el.scrollLeft;
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 3) {
      moved = true;
      savedSnap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none'; // 드래그 중 snap 간섭 방지
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (moved) { el.scrollLeft = startLeft - dx; e.preventDefault(); }
  });

  const _endDrag = (e) => {
    if (!dragging || e.pointerType !== 'mouse') return;
    dragging = false;
    if (moved) {
      el.style.scrollSnapType = savedSnap; // snap 복원 → 가까운 카드로 스냅
      suppressClickUntil = performance.now() + 80; // 드래그 직후 click 오작동 차단
    }
  };
  el.addEventListener('pointerup', _endDrag);
  el.addEventListener('pointercancel', _endDrag);

  el.addEventListener('click', (ce) => {
    if (performance.now() < suppressClickUntil) { ce.stopPropagation(); ce.preventDefault(); }
  }, { capture: true });
}

function initChapterCarousel() {
  const track = document.getElementById('combo-chapter-track');
  if (!track) return;
  const first = track.querySelector('.combo-card');

  // 첫 카드를 화면 중앙에 오도록 초기 스크롤 위치 보정 (scroll-snap 보정)
  if (first) {
    track.scrollLeft = first.offsetLeft - (track.clientWidth - first.offsetWidth) / 2;
  }

  _updateComboCarouselScale(track);
  track.addEventListener('scroll', () => _updateComboCarouselScale(track), { passive: true });
  _comboEnableHorizontalDrag(track); // 웹 브라우저 마우스 드래그 지원
}

// ── 난이도 선택 (카드 클릭 → 설명 텍스트 교체) — 챕터 카드마다 각각 초기화 ──
function initDifficultySelector() {
  document.querySelectorAll('.combo-difficulty-row').forEach(row => {
    const desc = row.parentElement.querySelector('.combo-difficulty-desc');
    if (!desc) return;

    row.addEventListener('click', (e) => {
      const card = e.target.closest('.combo-difficulty-card');
      if (!card) return;
      row.querySelectorAll('.combo-difficulty-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      desc.textContent = card.dataset.desc;
    });
  });
}

// ── 튜토리얼 캐러셀 (스와이프, dot 동기화) — 챕터 카드마다 각각 초기화 ──
function initTutorialCarousel() {
  document.querySelectorAll('.combo-info-card').forEach(card => {
    const track = card.querySelector('.combo-tutorial-track');
    const dots  = card.querySelectorAll('.combo-tutorial-dots .combo-tutorial-dot');
    if (!track || !dots.length) return;

    track.addEventListener('scroll', () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  var _pushEntry = null; try { _pushEntry = localStorage.getItem('_push_entry'); if (_pushEntry) localStorage.removeItem('_push_entry'); } catch(_) {}
  if (typeof analytics !== 'undefined') analytics.track('combo_page_viewed', { from: _pushEntry ? 'push' : 'training', entry: _pushEntry || 'direct' });

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');
  document.documentElement.classList.toggle('peak-free', getPlan() === 'pro'); // 시작하기 버튼 피크 배지: Pro는 숨김

  // 뒤로가기+피크바는 #main-content > .top-bar 안에 고정 — 모바일/데스크탑 공용, JS 이동 없음.

  lucide.createIcons();
  initTutorialCarousel();
  initDifficultySelector();
  initChapterCarousel();
  initComboDragDrop();
  _comboSnapshotQuizWrap(); // 순정 퀴즈 뷰 HTML 저장 (장 전환 시 전체 복원용)

  // 푸시 딥링크: ?chapter=<콤마 목록> → 그중 랜덤 1장 카드로 스크롤 (자동 시작 X, 난이도는 카드 기본값 low)
  try {
    const chapterParam = new URLSearchParams(location.search).get('chapter');
    if (chapterParam) {
      const list = chapterParam.split(',');
      const pick = list[Math.floor(Math.random() * list.length)];
      const track  = document.getElementById('combo-chapter-track');
      const target = track?.querySelector(`.combo-card[data-chapter="${pick}"]`);
      if (track && target) {
        requestAnimationFrame(() => {
          track.scrollLeft = target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2;
        });
      }
    }
  } catch (_) {}

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  // 탭 닫기 / 하드웨어 뒤로가기 등 exitComboQuiz 를 안 거치는 이탈 경로 처리
  window.addEventListener('pagehide', _comboFlushTrainingTime, { once: true });

  // 튜토리얼 진입 팝업 — 2026-09-08 방식 변경으로 잠정 비활성화(코드는 보존, 삭제 안 함)
  /*
  // 페이지 진입 애니메이션(.project-enter, style.css:460, 0.36s) 끝날 때까지 터치 막고,
  // 끝나면 튜토리얼 진입 팝업 표시 — chord-name-quiz.js startLevel()과 동일 패턴
  if (shell) shell.style.pointerEvents = 'none';
  setTimeout(() => {
    if (shell) shell.style.pointerEvents = '';
    const ov = document.getElementById('tutorial-entry-overlay');
    if (!ov) return;
    ov.classList.remove('hidden'); // 지금은 항상 표시(최초방문 판별은 나중에)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ov.querySelector('.cd-modal')?.classList.add('cd-modal--in');
    }));
  }, 360);
  */
});

// 튜토리얼 진입 팝업 닫기 — cd-modal--in도 같이 떼서 다음에 다시 뜰 때 등장 애니메이션 재생되게 함
function closeTutorialEntryModal() {
  const ov = document.getElementById('tutorial-entry-overlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.querySelector('.cd-modal')?.classList.remove('cd-modal--in');
}

// ── 선택 뷰 v2: 레벨 카드 탭 → 피크 소모 확인 모달 → 문제 화면 v2 진입 (지금은 1-1만 진입 가능) ──
// 스크롤 중 오작동을 막으려고 pointerup이 아니라 click을 씀(터치 스크롤은 click을 발생시키지 않음).
// 피크: 정답 5개마다 1개 환급 → 전부 맞히면 순소모 2개가 되도록 진입 비용 = 환급 총합 + 2 (10문제 4개 / 15문제 5개)
const COMBO_V2_REFUND_EVERY = 5;
const COMBO_V2_PEAK_NET = 2;
function _comboV2PeakCost(cfg) { return _comboV2QCount(cfg) / COMBO_V2_REFUND_EVERY + COMBO_V2_PEAK_NET; }
const COMBO_V2_TRIAD_RATE = 0.7;   // 챕터 2 기능·챕터 3: 3화음/7th를 고를 수 있는 문제 중 앞쪽 70%는 3화음, 뒤쪽 30%는 7th (문제 수가 늘어도 자동 적용)
const COMBO_V2_CH5_BIG_RATE = 0.4;   // 챕터 5: 진행이 나오는 문제(배치형·교체형·빈칸형) 중 뒤쪽 40%는 8코드 진행, 앞쪽 60%는 4코드 진행
const COMBO_V2_Q_SMALL = 10;   // 챕터 1~3: 본 문제 10개
const COMBO_V2_Q_BIG = 15;     // 챕터 4~9: 본 문제 15개
function _comboV2QCount(cfg) { return cfg && (cfg.ch4 || cfg.ch5 || cfg.ch6 || cfg.ch7 || cfg.ch8 || cfg.ch9) ? COMBO_V2_Q_BIG : COMBO_V2_Q_SMALL; }
let _comboV2InQuiz = false;
let _comboV2Level = null;   // 지금 하는 레벨 {num, name} — 클리어 화면 표시용
let _comboV2Entering = false; // 소모 처리 중 연타로 이중 차감되는 것 방지

async function _comboV2StartLevel(type, label) {
  if (_comboV2Entering) return;
  _comboV2Entering = true;
  try {
    if (!(await consumePeak(_comboV2PeakCost(type), 'chord_combo'))) return;
    comboV2EnterQuiz(type, label);
  } finally {
    _comboV2Entering = false;
  }
}

// 문제 화면 진입 — 탑바 가운데에 코드맞추기·데일리미션과 같은 진행 막대(.ms-progress-track)를 두고 피크바는 숨김.
// 선택 뷰는 왼쪽으로·문제 화면은 오른쪽에서 슬라이드
function comboV2EnterQuiz(type, label, opts) {   // opts.test = 건너뛰기 테스트 {to, level}
  _comboV2InQuiz = true;
  _comboV2TestMode = opts && opts.test ? opts.test : null;
  _comboV2Level = label || null;
  _comboV2CancelPendingFill();
  _comboV2DevBarSync();
  const quizView = document.getElementById('combo-view-quiz-v2');
  if (quizView && label) quizView.style.setProperty('--ch-accent', COMBO_V2_CH_COLORS[(parseInt(label.num, 10) || 1) - 1] || COMBO_V2_CH_COLORS[0]);   // 레벨 번호 앞자리 = 챕터
  comboV2SetType(type || 'pair');
  const prog = document.getElementById('combo-quiz-progress');
  if (prog) {
    prog.style.display = '';
    prog.innerHTML = '<div class="ms-progress-track"><div class="ms-progress-fill" id="ms-progress-fill"></div></div>';
  }
  document.getElementById('combo-view-select-v2')?.classList.add('quiz-view--left');
  document.getElementById('combo-view-quiz-v2')?.classList.remove('quiz-view--right');
}

// 진행 막대 갱신 — 코드맞추기 updateProgressDots와 같은 곡선(√). 색은 파랑 → 초록 → 노랑(빨강 없음). done = 끝낸 문제 수
function comboV2SetProgress(done) {
  const el = document.getElementById('ms-progress-fill');
  if (!el) return;
  const pct = Math.sqrt(done / (_comboV2Sess.n + (_comboV2Sess.test ? 0 : _comboV2Sess.wrong.length))) * 100;   // 전체 = 본 문제 + 틀려서 늘어난 오답풀이 몫(틀릴 때마다 전체가 하나씩 늘어남), 오답풀이까지 마쳐야 100%
  el.style.width = pct + '%';
  el.style.background = pct >= 90 ? '#FFD60A' : pct >= 75 ? '#4CBB17' : '';   // 파랑(기본) → 밝은 연두 초록(75%, 정답 색과 같은 #4CBB17) → 노랑(90%). 빨강은 뭔가 잘못하고 있다는 느낌이라 쓰지 않음
}

// ── 연결형 짝 맞추기 (목업) ──
// 흔한 짝 맞추기 방식: 카드를 탭해 선택 → 반대편 열 카드를 탭하면 둘이 짝이 됨(선택·짝지어진 카드는 회색).
// 같은 열 카드를 다시 탭하면 선택만 바뀌고, 이미 짝인 카드를 탭하면 그 짝이 풀림. 전부 짝지으면 제출 활성.
// 제출하면 카드별 정답 짝(data-pair 일치)을 채점해 초록/빨강으로 칠하고, 버튼은 "다시 하기"로 바뀜.
// 짝마다 다른 색 — 앱 아이콘 색. 카드 3개 이상을 상정해 앞 3개(빨강·파랑·초록)는 항상 쓰이고, 4번째부터 보라.
// 먼저 맺은 짝부터 비어 있는 첫 색을 받음
const COMBO_V2_PAIR_COLORS = ['var(--icon-blue)', 'var(--icon-purple)', 'var(--icon-yellow)', 'var(--icon-pink)'];   // 정답(초록)·오답(빨강)과 겹치는 색 제외
let _comboV2Sel = null;     // 선택 중인(아직 짝 없는) 카드
let _comboV2Pairs = [];     // [{a, b, color}] a=왼쪽 카드, b=오른쪽 카드
let _comboV2Judged = false; // 제출 후 잠금

function _comboV2Side(card) { return card.parentNode.dataset.side; }

function _comboV2ClearSel() {
  if (_comboV2Sel) _comboV2Sel.classList.remove('is-sel');
  _comboV2Sel = null;
}

function _comboV2UpdateSubmit() {
  const btn = document.getElementById('combo-v2-submit');
  if (!btn) return;
  if (_comboV2Type === 'place') { btn.disabled = !_comboV2PJudged && _comboV2PSlots.indexOf(null) >= 0; return; }
  if (_comboV2Type === 'swap') { btn.disabled = !_comboV2SwJudged && _comboV2SwSel == null; return; }
  if (_comboV2Type === 'sort') { btn.disabled = !_soJudged && _soQueue.length > 0; return; }
  const total = document.querySelectorAll('#combo-v2-quiz-content [data-side="left"] .combo-v2-pair-card').length;
  btn.disabled = !_comboV2Judged && _comboV2Pairs.length < total;
}

function _comboV2OnCardTap(card) {
  const existing = _comboV2Pairs.find(function (p) { return p.a === card || p.b === card; });
  if (existing) { // 이미 짝인 카드 → 그 짝을 풀고 두 카드 모두 원상태로
    [existing.a, existing.b].forEach(function (c) { c.classList.remove('is-paired'); c.style.removeProperty('--pair-c'); });
    _comboV2Pairs.splice(_comboV2Pairs.indexOf(existing), 1);
    _comboV2ClearSel();
    _comboV2UpdateSubmit();
    return;
  }
  if (_comboV2Sel && _comboV2Side(_comboV2Sel) !== _comboV2Side(card)) { // 반대편 선택 중 → 짝 성립
    const used = _comboV2Pairs.map(function (p) { return p.color; });
    const color = COMBO_V2_PAIR_COLORS.find(function (c) { return used.indexOf(c) < 0; }) || COMBO_V2_PAIR_COLORS[0];
    const left = _comboV2Side(card) === 'left' ? card : _comboV2Sel;
    const right = left === card ? _comboV2Sel : card;
    [left, right].forEach(function (c) { c.classList.remove('is-sel'); c.classList.add('is-paired'); c.style.setProperty('--pair-c', color); });
    _comboV2Pairs.push({ a: left, b: right, color: color });
    _comboV2Sel = null;
    _comboV2UpdateSubmit();
    return;
  }
  // 같은 열 카드이거나 선택 없음 → 이 카드를 선택(이전 선택은 해제)
  _comboV2ClearSel();
  _comboV2Sel = card;
  card.classList.add('is-sel');
}

function _comboV2Judge() {
  _comboV2Judged = true;
  let allOk = true;
  _comboV2Pairs.forEach(function (p) {
    const ok = p.a.dataset.pair === p.b.dataset.pair;
    if (!ok) allOk = false;
    [p.a, p.b].forEach(function (c) { c.classList.remove('is-paired'); c.classList.add(ok ? 'is-ok' : 'is-ng'); });
  });
  document.querySelector('#combo-v2-quiz-content .combo-v2-pairs')?.classList.add('is-locked');
  _comboV2Verdict(allOk);
}

function _comboV2ResetPairs() {
  _comboV2Judged = false;
  _comboV2ClearSel();
  _comboV2Pairs = [];
  document.querySelectorAll('#combo-v2-quiz-content .combo-v2-pair-card').forEach(function (c) {
    c.classList.remove('is-sel', 'is-paired', 'is-ok', 'is-ng');
    c.style.removeProperty('--pair-c');
  });
  document.querySelector('#combo-v2-quiz-content .combo-v2-pairs')?.classList.remove('is-locked');
  const btn = document.getElementById('combo-v2-submit');
  if (btn) {
    btn.textContent = '제출하기';
    btn.classList.remove('combo-v2-submit--ok', 'combo-v2-submit--ng');
  }
  _comboV2UpdateSubmit();
}

// ── 연결형 문제 생성 (1-1: C key 다이어토닉 7화음 중 4개를 뽑아 코드 이름 ↔ 도수 연결) ──
// 세션 = 본 문제 10개(챕터 4~는 15개). 문제마다 7개 중 4개를 가중치(w)대로 랜덤으로 뽑고(세션 안에서 같은 조합은 다시 안 나옴),
// 왼쪽(코드 이름)·오른쪽(도수) 열을 서로 독립적으로 섞음. 제출 후 버튼은 "다음"(마지막 문제는 "완료" → 선택 화면 복귀).
// w = 출제 빈도 가중치(챕터 1, 1도부터 5 4 3 5 5 4 1). 뽑힐 확률 ∝ w (한 문제 안에서는 중복 없이 뽑음)
const COMBO_V2_DEGS = [
  { deg: 'I', w: 5 }, { deg: 'IIm', w: 4 }, { deg: 'IIIm', w: 3 }, { deg: 'IV', w: 5 },
  { deg: 'V', w: 5 }, { deg: 'VIm', w: 4 }, { deg: 'VIIdim', w: 1, only3: true },   // only3 = 이 화음이 든 문제는 짝 3개까지만
];
// 12key(idx = C 기준 반음, flat = 플랫 표기). 이름·표기는 레벨 카드와 같고 코드 이름은 degreeToChordName(chord-combo-questions.js)이 만듦
const COMBO_V2_KEYS = {
  C: { name: 'C', idx: 0, flat: false }, Db: { name: 'Db', idx: 1, flat: true }, D: { name: 'D', idx: 2, flat: false },
  Eb: { name: 'Eb', idx: 3, flat: true }, E: { name: 'E', idx: 4, flat: false }, F: { name: 'F', idx: 5, flat: true },
  Gb: { name: 'Gb', idx: 6, flat: true }, G: { name: 'G', idx: 7, flat: false }, Ab: { name: 'Ab', idx: 8, flat: true },
  A: { name: 'A', idx: 9, flat: false }, Bb: { name: 'Bb', idx: 10, flat: true }, B: { name: 'B', idx: 11, flat: false },
};
// key의 다이어토닉 화음 [{deg(표시 도수), base(3화음 도수), w, only3?, chord}] — seventh면 7th 화음(IM7 IIm7 IIIm7 IVM7 V7 VIm7 VIIm7(b5))
function _comboV2Dia(key, seventh) {
  return COMBO_V2_DEGS.map(function (x) {
    return Object.assign({}, x, { base: x.deg, deg: seventh ? CC_DEGREE_TRIAD[x.deg].label7 : x.deg, chord: degreeToChordName(x.deg, key.idx, !!seventh, key.flat) });
  });
}
// 챕터 1 레벨 구성 — keys: 이 레벨에 나오는 key(문제마다 섞여 나옴), kinds: 나오는 유형(5문제에 균등 분배)
const COMBO_V2_KEY_KINDS = ['pair', 'swap'];            // 1-1~1-6: 연결형 + 빈칸형
const COMBO_V2_MIX_KINDS = ['pair', 'place', 'swap'];   // 1-7 이후(도전 레벨): 연결형 + 배치형 + 빈칸형
const COMBO_V2_LEVELS = {
  '1-1': { keys: ['C'], kinds: COMBO_V2_KEY_KINDS }, '1-2': { keys: ['G'], kinds: COMBO_V2_KEY_KINDS },
  '1-3': { keys: ['D'], kinds: COMBO_V2_KEY_KINDS }, '1-4': { keys: ['A'], kinds: COMBO_V2_KEY_KINDS },
  '1-5': { keys: ['E'], kinds: COMBO_V2_KEY_KINDS },
  '1-6': { keys: ['C', 'D', 'E', 'G', 'A'], kinds: COMBO_V2_KEY_KINDS },
  '1-7': { keys: ['F'], kinds: COMBO_V2_MIX_KINDS }, '1-8': { keys: ['Bb'], kinds: COMBO_V2_MIX_KINDS },
  '1-9': { keys: ['B'], kinds: COMBO_V2_MIX_KINDS }, '1-10': { keys: ['Db'], kinds: COMBO_V2_MIX_KINDS },
  '1-11': { keys: ['Eb'], kinds: COMBO_V2_MIX_KINDS }, '1-12': { keys: ['Gb'], kinds: COMBO_V2_MIX_KINDS },
  '1-13': { keys: ['Ab'], kinds: COMBO_V2_MIX_KINDS },
  '1-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_MIX_KINDS },
};
// 챕터 2 레벨 — seventh: 다이어토닉 7th 화음으로 출제(연결형·빈칸형·배치형)
const COMBO_V2_7TH_KINDS = ['pair', 'place', 'swap'];
Object.assign(COMBO_V2_LEVELS, {
  '2-1': { keys: ['C'], kinds: COMBO_V2_7TH_KINDS, seventh: true },
  '2-2': { keys: ['G'], kinds: COMBO_V2_7TH_KINDS, seventh: true },
});
// 챕터 2 기능·대리코드 레벨(2-3~) — func: 분류형 1문제(고정) + 교체형·빈칸형 2:2. 진행은 3화음·7th 원래 표기 그대로
const COMBO_V2_FUNC_COL = { I: 0, IIIm: 0, VIm: 0, IV: 1, IIm: 1, V: 2, VIIdim: 2 };   // 도수 → 기능 열(해결 0 / 예비 1 / 긴장 2)
const COMBO_V2_FUNC_NAME = ['해결', '예비', '긴장'];
Object.assign(COMBO_V2_LEVELS, {
  '2-3': { keys: ['C'], func: true }, '2-4': { keys: ['G'], func: true }, '2-5': { keys: ['D'], func: true },
  '2-6': { keys: ['A'], func: true }, '2-7': { keys: ['E'], func: true },
  '2-8': { keys: ['C', 'G', 'D', 'A', 'E'], func: true },
  '2-9': { keys: ['F'], func: true }, '2-10': { keys: ['Bb'], func: true }, '2-11': { keys: ['B'], func: true },
  '2-12': { keys: ['Db'], func: true }, '2-13': { keys: ['Eb'], func: true }, '2-14': { keys: ['Gb'], func: true },
  '2-15': { keys: ['Ab'], func: true },
  '2-16': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], func: true },
});
// 챕터 3 코드 꾸미기 레벨(3-1~) — 한 레벨에 한 key(종합·챌린지만 여러 key). ch3: 'both' = 문제마다 꾸밈코드(add9·sus2·sus4, 7th 없음, 분류형 없음) 또는 전위코드(I·IV·V 1전위, 분류형 포함, 3화음·7th) 중 하나 ('deco'/'inv'만 쓰는 레벨도 설정 가능)
const COMBO_V2_CH3_DECO = { I: ['add9', 'sus2', 'sus4'], IV: ['add9', 'sus2'], V: ['add9', 'sus2', 'sus4'] };   // IV sus4는 다이어토닉 밖(Bb)이라 제외
const COMBO_V2_CH3_ALL12 = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
Object.assign(COMBO_V2_LEVELS, {
  '3-1': { keys: ['C'], ch3: 'both' }, '3-2': { keys: ['G'], ch3: 'both' }, '3-3': { keys: ['D'], ch3: 'both' },
  '3-4': { keys: ['A'], ch3: 'both' }, '3-5': { keys: ['E'], ch3: 'both' },
  '3-6': { keys: ['C', 'G', 'D', 'A', 'E'], ch3: 'both' },
  '3-7': { keys: ['F'], ch3: 'both' }, '3-8': { keys: ['Bb'], ch3: 'both' }, '3-9': { keys: ['B'], ch3: 'both' },
  '3-10': { keys: ['Db'], ch3: 'both' }, '3-11': { keys: ['Eb'], ch3: 'both' }, '3-12': { keys: ['Gb'], ch3: 'both' },
  '3-13': { keys: ['Ab'], ch3: 'both' }, '3-14': { keys: COMBO_V2_CH3_ALL12, ch3: 'both' },
});
// 챕터 4 세컨더리 도미넌트 레벨(4-1~) — 한 레벨에 한 key(종합·챌린지만 여러 key). 유형 = 연결형·배치형·교체형·빈칸형 균등 분배. 도미넌트 6종(프라이머리 V7 + 세컨더리 V7/II~V7/VI)이 핵심 코드
const COMBO_V2_CH4_KINDS = ['pair', 'place', 'replace', 'fill'];
Object.assign(COMBO_V2_LEVELS, {
  '4-1': { keys: ['C'], kinds: COMBO_V2_CH4_KINDS, ch4: true }, '4-2': { keys: ['G'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-3': { keys: ['D'], kinds: COMBO_V2_CH4_KINDS, ch4: true }, '4-4': { keys: ['A'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-5': { keys: ['E'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-6': { keys: ['C', 'G', 'D', 'A', 'E'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-7': { keys: ['F'], kinds: COMBO_V2_CH4_KINDS, ch4: true }, '4-8': { keys: ['Bb'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-9': { keys: ['B'], kinds: COMBO_V2_CH4_KINDS, ch4: true }, '4-10': { keys: ['Db'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-11': { keys: ['Eb'], kinds: COMBO_V2_CH4_KINDS, ch4: true }, '4-12': { keys: ['Gb'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-13': { keys: ['Ab'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
  '4-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_CH4_KINDS, ch4: true },
});
// 챕터 5 릴레이티드 투-마이너 레벨(5-1~) — 챕터 4와 같은 구조. 8코드 진행(4코드 진행을 두 배로 늘려 반 마디씩, 같은 코드는 '%')에 투-파이브(투마이너 + 도미넌트)를 끼워 넣음
Object.assign(COMBO_V2_LEVELS, {
  '5-1': { keys: ['C'], kinds: COMBO_V2_CH4_KINDS, ch5: true }, '5-2': { keys: ['G'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-3': { keys: ['D'], kinds: COMBO_V2_CH4_KINDS, ch5: true }, '5-4': { keys: ['A'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-5': { keys: ['E'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-6': { keys: ['C', 'G', 'D', 'A', 'E'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-7': { keys: ['F'], kinds: COMBO_V2_CH4_KINDS, ch5: true }, '5-8': { keys: ['Bb'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-9': { keys: ['B'], kinds: COMBO_V2_CH4_KINDS, ch5: true }, '5-10': { keys: ['Db'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-11': { keys: ['Eb'], kinds: COMBO_V2_CH4_KINDS, ch5: true }, '5-12': { keys: ['Gb'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-13': { keys: ['Ab'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
  '5-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_CH4_KINDS, ch5: true },
});
const COMBO_V2_CH6_KINDS = ['pair', 'place', 'replace', 'replace'];   // 주제가 "이 코드가 이렇게 바뀐다"라 빈칸형 대신 교체형을 두 배로(빈칸형 코드는 보존)
// 챕터 6 도미넌트의 대리코드 레벨(6-1~) — 챕터 3~5와 같은 구조(한 레벨 한 key). 도미넌트(프라이머리 포함 6종)를 3도 위 dim7 / 트라이톤 대리 도미넌트로 교체
Object.assign(COMBO_V2_LEVELS, {
  '6-1': { keys: ['C'], kinds: COMBO_V2_CH6_KINDS, ch6: true }, '6-2': { keys: ['G'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-3': { keys: ['D'], kinds: COMBO_V2_CH6_KINDS, ch6: true }, '6-4': { keys: ['A'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-5': { keys: ['E'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-6': { keys: ['C', 'G', 'D', 'A', 'E'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-7': { keys: ['F'], kinds: COMBO_V2_CH6_KINDS, ch6: true }, '6-8': { keys: ['Bb'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-9': { keys: ['B'], kinds: COMBO_V2_CH6_KINDS, ch6: true }, '6-10': { keys: ['Db'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-11': { keys: ['Eb'], kinds: COMBO_V2_CH6_KINDS, ch6: true }, '6-12': { keys: ['Gb'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-13': { keys: ['Ab'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
  '6-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_CH6_KINDS, ch6: true },
});
// 챕터 7 텐션코드 레벨(7-1~) — 한 레벨에 한 key(종합·챌린지만 여러 key). 유형은 배치형·교체형만(연결형·빈칸형·분류형 없음). challenge: 도전 레벨(선택 구간)에서만 나오는 텐션 허용
const COMBO_V2_CH7_KINDS = ['place', 'replace'];
Object.assign(COMBO_V2_LEVELS, {
  '7-1': { keys: ['C'], kinds: COMBO_V2_CH7_KINDS, ch7: true }, '7-2': { keys: ['G'], kinds: COMBO_V2_CH7_KINDS, ch7: true },
  '7-3': { keys: ['D'], kinds: COMBO_V2_CH7_KINDS, ch7: true }, '7-4': { keys: ['A'], kinds: COMBO_V2_CH7_KINDS, ch7: true },
  '7-5': { keys: ['E'], kinds: COMBO_V2_CH7_KINDS, ch7: true },
  '7-6': { keys: ['C', 'G', 'D', 'A', 'E'], kinds: COMBO_V2_CH7_KINDS, ch7: true },
  '7-7': { keys: ['F'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true }, '7-8': { keys: ['Bb'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true },
  '7-9': { keys: ['B'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true }, '7-10': { keys: ['Db'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true },
  '7-11': { keys: ['Eb'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true }, '7-12': { keys: ['Gb'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true },
  '7-13': { keys: ['Ab'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true },
  '7-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_CH7_KINDS, ch7: true, challenge: true },
});
// ── 챕터 8 내추럴 마이너 ──
// 7개 마이너 다이어토닉 7th: Im7 IIm7(b5) bIIIM7 IVm7 Vm7 bVIM7 bVII7. 로마자 힌트는 트라이어드 도수(Im IIdim bIII IVm Vm bVI bVII). 전부 7th 코드만 사용.
// 출제 빈도 w = 옛 마이너 진행 20개(하모닉 마이너 차용 VIIdim7 진행 1개 제외, V7은 Vm7로 교체한 19개)의 도수 집계(Im 22 · IIdim 2 · bIII 4 · IVm 11 · Vm 13 · bVI 14 · bVII 10 / 76칸)를 반으로 나눠 반올림한 정수비
const COMBO_V2_MDEGS = [
  { deg: 'Im', mkey: 'm_I', w: 11 }, { deg: 'IIdim', mkey: 'm_II', w: 1, only3: true }, { deg: 'bIII', mkey: 'm_III', w: 2 }, { deg: 'IVm', mkey: 'm_IV', w: 6 },
  { deg: 'Vm', mkey: 'm_Vm', w: 3 }, { deg: 'V7', mkey: 'm_V', w: 4 }, { deg: 'bVI', mkey: 'm_VI', w: 7 }, { deg: 'bVII', mkey: 'm_VII', w: 5 },   // 5도: 내추럴 마이너 Vm7 3 + 하모닉 마이너에서 가져온 V7 4(집계 7을 나눔)
];
// 마이너 key 표기: Cm Dm Fm Gm Bbm Ebm = b / Em Bm F#m C#m G#m = # / Am = 자연음 (옛 규칙 CH7_FLAT_ONLY_KEYS · CH7_SHARP_ONLY_KEYS 따름). idx = 으뜸음의 C 기준 반음
Object.assign(COMBO_V2_KEYS, {
  Am: { name: 'Am', idx: 9, flat: false, minor: true }, Em: { name: 'Em', idx: 4, flat: false, minor: true }, Dm: { name: 'Dm', idx: 2, flat: true, minor: true },
  Gm: { name: 'Gm', idx: 7, flat: true, minor: true }, Cm: { name: 'Cm', idx: 0, flat: true, minor: true }, Bm: { name: 'Bm', idx: 11, flat: false, minor: true },
  'F#m': { name: 'F#m', idx: 6, flat: false, minor: true }, 'C#m': { name: 'C#m', idx: 1, flat: false, minor: true }, Fm: { name: 'Fm', idx: 5, flat: true, minor: true },
  Bbm: { name: 'Bbm', idx: 10, flat: true, minor: true }, Ebm: { name: 'Ebm', idx: 3, flat: true, minor: true }, 'G#m': { name: 'G#m', idx: 8, flat: false, minor: true },
});
function _comboV2MDia(key) {   // key의 마이너 다이어토닉 7th [{base, deg, w, only3?, chord}]
  return COMBO_V2_MDEGS.map(function (x) {
    return { base: x.deg, deg: x.deg, w: x.w, only3: x.only3, chord: degreeToChordName(x.mkey, key.idx, true, key.flat) };
  });
}
// 진행 19개 — 챕터 1과 달리 8-1부터 진행(배치형·빈칸형)이 나온다. 옛 CH7_PROGRESSIONS에서 V7 → Vm7, VIIdim7 진행 제외
const COMBO_V2_CH8_PROGS = [
  ['Im', 'bVI', 'bIII', 'bVII'], ['Im', 'IVm', 'Vm', 'Im'], ['Im', 'bVII', 'bVI', 'Vm'], ['Im', 'IVm', 'bVII', 'bIII'],
  ['bVI', 'bVII', 'Im', 'IVm'], ['Im', 'Vm', 'bVI', 'IVm'], ['IIdim', 'Vm', 'Im', 'bVI'], ['Im', 'bVI', 'IVm', 'Vm'],
  ['Im', 'IVm', 'Im', 'Vm'], ['bVI', 'Vm', 'Im', 'Im'], ['Im', 'bIII', 'bVII', 'bVI'], ['Im', 'bVII', 'IVm', 'Vm'],
  ['IVm', 'Vm', 'Im', 'bVI'], ['bVI', 'IVm', 'Im', 'Vm'], ['Im', 'bVI', 'bVII', 'Vm'], ['Im', 'IVm', 'bVI', 'bVII'],
  ['Im', 'Vm', 'bVI', 'bVII'], ['IVm', 'bVII', 'bIII', 'bVI'], ['Im', 'IIdim', 'Vm', 'Im'],
];
const COMBO_V2_CH8_KINDS = ['pair', 'place', 'fill', 'sort'];   // 진행은 8-1부터(별도 코드진행 레벨 없음), 챕터 1처럼 반대 문제(코드 → 도수) 20%, 분류형(기능 분류)은 한 판에 1문제
const COMBO_V2_MFUNC = { Im: 0, bIII: 0, IVm: 1, IIdim: 1, bVI: 1, Vm: 2, V7: 2, bVII: 2 };   // 마이너 기능 분류: 해결 Im·bIII / 예비 IVm·IIdim·bVI / 긴장 Vm·V7·bVII
const COMBO_V2_CH8_V7_RATE = 0.7;   // Vm이 든 진행을 낼 때 V7로 바꿔 내는 비율(나머지 30%는 Vm7 그대로)
Object.assign(COMBO_V2_LEVELS, {
  '8-1': { keys: ['Am'], kinds: COMBO_V2_CH8_KINDS, ch8: true }, '8-2': { keys: ['Em'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-3': { keys: ['Dm'], kinds: COMBO_V2_CH8_KINDS, ch8: true }, '8-4': { keys: ['Gm'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-5': { keys: ['Cm'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-6': { keys: ['Am', 'Em', 'Dm', 'Gm', 'Cm'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-7': { keys: ['Bm'], kinds: COMBO_V2_CH8_KINDS, ch8: true }, '8-8': { keys: ['F#m'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-9': { keys: ['C#m'], kinds: COMBO_V2_CH8_KINDS, ch8: true }, '8-10': { keys: ['Fm'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-11': { keys: ['Bbm'], kinds: COMBO_V2_CH8_KINDS, ch8: true }, '8-12': { keys: ['Ebm'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-13': { keys: ['G#m'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
  '8-14': { keys: ['Am', 'Em', 'Dm', 'Gm', 'Cm', 'Bm', 'F#m', 'C#m', 'Fm', 'Bbm', 'Ebm', 'G#m'], kinds: COMBO_V2_CH8_KINDS, ch8: true },
});
// 챕터 9 모달 인터체인지 레벨(9-1~) — 한 레벨에 한 key(종합·챌린지만 여러 key). 유형: 연결형·배치형·교체형(2배)·빈칸형. challenge: 도전 레벨(선택 구간)에서만 나오는 재즈 쪽 코드 허용
const COMBO_V2_CH9_KINDS = ['pair', 'place', 'replace', 'replace', 'fill'];
Object.assign(COMBO_V2_LEVELS, {
  '9-1': { keys: ['C'], kinds: COMBO_V2_CH9_KINDS, ch9: true }, '9-2': { keys: ['G'], kinds: COMBO_V2_CH9_KINDS, ch9: true },
  '9-3': { keys: ['D'], kinds: COMBO_V2_CH9_KINDS, ch9: true }, '9-4': { keys: ['A'], kinds: COMBO_V2_CH9_KINDS, ch9: true },
  '9-5': { keys: ['E'], kinds: COMBO_V2_CH9_KINDS, ch9: true },
  '9-6': { keys: ['C', 'G', 'D', 'A', 'E'], kinds: COMBO_V2_CH9_KINDS, ch9: true },
  '9-7': { keys: ['F'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true }, '9-8': { keys: ['Bb'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true },
  '9-9': { keys: ['B'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true }, '9-10': { keys: ['Db'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true },
  '9-11': { keys: ['Eb'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true }, '9-12': { keys: ['Gb'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true },
  '9-13': { keys: ['Ab'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true },
  '9-14': { keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], kinds: COMBO_V2_CH9_KINDS, ch9: true, challenge: true },
});
const COMBO_V2_REVERSE_RATE = 0.2;   // 배치형·빈칸형을 '반대'로 내는 비율 — 보통은 도수를 보고 코드를 맞추고, 반대는 코드를 보고 도수를 맞춤
const COMBO_V2_PAIR3_RATE = 0.7;   // 챕터 1: 짝 3개짜리 문제 비율(나머지는 4개짜리)
let _comboV2Sess = { idx: 0, correct: 0, used: [], prevId: null, prevKey: null, reverse: false, key: COMBO_V2_KEYS.C, dia: _comboV2Dia(COMBO_V2_KEYS.C), kinds: [], cfg: null };

function _comboV2WeightedPick(items, n) {   // 가중치 비례 비복원 추출
  const pool = items.slice();
  const out = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce(function (a, x) { return a + x.w; }, 0);
    let i = 0;
    while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function _comboV2PairPick() {
  let pick, key, guard = 0;
  if (_comboV2Sess.cfg.ch9) {   // 챕터 9: 모달 인터체인지 코드 ↔ 도수 (이 레벨에서 나올 수 있는 코드 중 3개 70% / 4개 30%)
    const opts9 = _comboV2Ch9Options();
    const n9 = Math.random() < COMBO_V2_PAIR3_RATE ? 3 : 4;
    do {
      pick = _comboV2SwShuffle(opts9.slice()).slice(0, n9).map(function (o) { return { id: o.deg, deg: o.deg, chord: _comboV2Ch9Chord(o), w: 1 }; });
      key = _comboV2Sess.key.name + ':' + pick.map(function (x) { return x.id; }).sort().join();
    } while (_comboV2Sess.used.indexOf(key) >= 0 && ++guard < 50);
    _comboV2Sess.used.push(key);
    return pick;
  }
  if (_comboV2Sess.cfg.ch6) {   // 챕터 6: dim7 짝(dd·di)은 구성음이 같은 dim7끼리 헷갈리지 않게 묶음(루트 반음 % 3)마다 하나씩 3개, 서브 짝(ds)은 3개(70%) / 4개(30%)
    const items6 = _comboV2Ch6Items();
    const v6 = _comboV2Sess.pairVar;
    do {
      if (v6 === 'ds') pick = _comboV2SwShuffle(items6.slice()).slice(0, Math.random() < COMBO_V2_PAIR3_RATE ? 3 : 4);
      else pick = [0, 1, 2].map(function (g) { return _comboV2Rand(items6.filter(function (x) { return x.group === g; })); });
      if (v6 !== 'ds') pick.forEach(function (x) { x.alt = !!x.m7b5 && Math.random() < COMBO_V2_CH6_M7B5_RATE; });   // 타겟이 메이저인 짝은 오른쪽 카드가 dim7 대신 m7(b5)일 수 있음(묶음마다 메이저 타겟이 하나라 짝끼리 겹치지 않음)
      key = _comboV2Sess.key.name + ':' + v6 + ':' + pick.map(function (x) { return x.id + (x.alt ? '*' : ''); }).sort().join();
    } while (_comboV2Sess.used.indexOf(key) >= 0 && ++guard < 50);
    _comboV2Sess.used.push(key);
    _comboV2Sess.pairAlt = pick.some(function (x) { return x.alt; });
    return pick;
  }
  if (_comboV2Sess.cfg.ch4 || _comboV2Sess.cfg.ch5) {   // 챕터 4·5: 6종(도미넌트 / 투마이너) 중 3개(70%) / 4개(30%), 한 판 안에서 같은 조합은 다시 안 나옴
    const doms = _comboV2Sess.cfg.ch5 ? _comboV2Ch5Items() : _comboV2DomItems();
    do {
      const n = Math.random() < COMBO_V2_PAIR3_RATE ? 3 : 4;
      pick = _comboV2Sess.cfg.ch5 ? _comboV2WeightedPick(doms, n) : _comboV2SwShuffle(doms.slice()).slice(0, n);   // 챕터 5는 투마이너 출제 빈도 가중치대로
      key = _comboV2Sess.key.name + ':' + pick.map(function (x) { return x.id || x.deg; }).sort().join();
    } while (_comboV2Sess.used.indexOf(key) >= 0 && ++guard < 50);
    _comboV2Sess.used.push(key);
    return pick;
  }
  const sets = _comboV2Sess.cfg.ch3 ? _comboV2Ch3Sets() : null;
  do {
    const n = Math.random() < COMBO_V2_PAIR3_RATE ? 3 : 4;
    if (sets) {   // 챕터 3: 꾸밈/전위 코드가 반드시 1개 이상 들어가도록 먼저 하나 뽑고 나머지를 전체에서 뽑음
      const first = _comboV2WeightedPick(sets.theme, 1)[0];
      pick = [first].concat(_comboV2WeightedPick(sets.all.filter(function (x) { return x !== first; }), n - 1));
    } else pick = _comboV2WeightedPick(_comboV2Sess.dia, n);
    if (pick.length > 3 && pick.some(function (x) { return x.only3; })) {   // 4개짜리에 only3 화음이 뽑히면 나머지 중 하나를 빼서 3개로
      const rest = pick.filter(function (x) { return !x.only3 && !(sets && sets.theme.indexOf(x) >= 0); });
      pick.splice(pick.indexOf(rest[Math.floor(Math.random() * rest.length)]), 1);
    }
    key = _comboV2Sess.key.name + ':' + pick.map(function (x) { return x.deg; }).sort().join();
  } while (_comboV2Sess.used.indexOf(key) >= 0 && ++guard < 50);
  _comboV2Sess.used.push(key);
  return pick;
}

function _comboV2PairBuild() {
  _comboV2ResetPairs();
  const pick = _comboV2PairPick();
  const root = document.querySelector('#combo-v2-quiz-content .combo-v2-pairs');
  if (!root) return;
  const fill = function (side, items, html) {
    const col = root.querySelector('[data-side="' + side + '"]');
    col.innerHTML = '';
    _comboV2SwShuffle(items.slice()).forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'combo-v2-pair-card cd-card';
      b.dataset.pair = x.id || x.deg;   // 챕터 5는 투마이너 라벨이 모두 같아 도수가 아니라 타겟 도수를 짝 식별자로 씀
      b.innerHTML = html(x);
      col.appendChild(b);
    });
  };
  const tc = _comboV2Sess.cfg.ch4 && _comboV2Sess.pairVar === 'tc';   // 챕터 4 '타겟 코드 ↔ 도미넌트 코드' 변형
  fill('left', pick, function (x) { return _ccFormatB5(_comboV2Sess.cfg.ch6 ? (_comboV2Sess.pairVar === 'di' ? x.inv : x.dom) : x.chord); });   // 도미넌트 코드가 항상 왼쪽(도미넌트 → 타겟 순서로 읽히게)
  fill('right', pick, function (x) {   // 도수 = 로마숫자 크게 + 퀄리티 작게
    if (_comboV2Sess.cfg.ch6) return _ccFormatB5(_comboV2Sess.pairVar === 'ds' ? x.sub : (x.alt ? x.m7b5 : x.dim));   // 챕터 6: 도미넌트(왼쪽) ↔ dim7(타겟이 메이저면 m7(b5)도) / 트라이톤 서브(오른쪽)
    if (_comboV2Sess.cfg.ch5) return _ccFormatB5(_comboV2Sess.pairVar === 'id' ? x.dom : x.tchord);   // 챕터 5: 투마이너(왼쪽) ↔ 도미넌트 / 타겟 코드(오른쪽)
    return tc ? _ccFormatB5(x.tchord) : _comboV2RomanHtml(x.deg);
  });
}

document.getElementById('combo-v2-quiz-content')?.addEventListener('click', function (e) {
  const card = e.target.closest('.combo-v2-pair-card');
  if (!card || _comboV2Judged || card.classList.contains('is-ok')) return;   // 오답풀이 재도전 중 이미 맞힌 짝은 그대로 둠
  _playConfirmSfx();
  _comboV2OnCardTap(card);
});
document.getElementById('combo-v2-submit')?.addEventListener('click', function () {
  if (_comboV2Sess.canRetry) { _comboV2Retry(); return; }
  if (_comboV2Type === 'place') {
    if (_comboV2PJudged) _comboV2Next(); else _comboV2PJudge();
    return;
  }
  if (_comboV2Type === 'swap') {
    if (_comboV2SwJudged) _comboV2Next(); else _comboV2SwJudge();
    return;
  }
  if (_comboV2Type === 'sort') {
    if (_soJudged) _comboV2Next(); else _soJudge();
    return;
  }
  if (_comboV2Judged) _comboV2Next(); else _comboV2Judge();
});

// ── 유형 전환(목업): 레벨 카드 → 유형 ──
const COMBO_V2_TYPE_META = {
  pair:  { title: '같은 짝끼리 이어주세요', sub: '' },
  place: { title: '주어진 진행에 맞게 배치하세요', sub: '' },
  swap:  { title: '표시된 부분을 바꿔주세요', sub: '' },   // 안내문구는 _comboV2SwBuild가 데이터로 만듦
  sort:  { title: '코드의 기능별로 분류해주세요', sub: '' },
};
let _comboV2Type = 'pair';

// 레벨 진입 — 세션 시작. type = COMBO_V2_LEVELS의 설정({keys, kinds}). 문자열('pair'|'place'|'swap'|'sort')이면 C key 한 유형(확인용)
function comboV2SetType(type) {
  const cfg = typeof type === 'string' ? { keys: ['C'], kinds: [type] } : type;
  const n = _comboV2QCount(cfg);
  let kinds = [];
  let themes = null;
  if (cfg.ch3) {   // 문제마다 테마(꾸밈/전위)를 정하고, 테마별로 유형을 한 바퀴씩 돌려가며 균등 분배(꾸밈 3유형 = 교체형 제외, 전위 5유형)
    const nDeco = Math.round(n * (Math.random() < 0.5 ? 0.6 : 0.4));   // 꾸밈·전위 6:4 또는 4:6 (5문제 때의 3:2·2:3 비율 그대로)
    const th = cfg.ch3 === 'both' ? _comboV2SwShuffle(Array(nDeco).fill('deco').concat(Array(n - nDeco).fill('inv'))) : Array(n).fill(cfg.ch3);
    const bags = {};
    themes = th;
    kinds = th.map(function (t) {
      if (!bags[t] || !bags[t].length) bags[t] = _comboV2SwShuffle(t === 'deco' ? ['pair', 'place', 'fill'] : ['pair', 'place', 'replace', 'fill', 'sort']);
      return bags[t].pop();
    });
  } else if (cfg.func) {   // 분류형은 한 판에 딱 1개(가치가 높아 최소 1개, 비중은 낮게), 나머지는 교체형·빈칸형 반반
    kinds = ['sort'];   // 분류형은 한 판에 딱 1개, 나머지는 교체형·빈칸형 반반
    for (let i = 1; i < n; i++) kinds.push(i % 2 ? 'replace' : 'fill');
  } else {
    const order = _comboV2SwShuffle(cfg.kinds.slice());
    for (let i = 0; i < n; i++) kinds.push(order[i % order.length]);   // 균등 분배(남는 문제는 무작위 유형이 하나 더), 순서는 섞음
  }
  if (!cfg.ch3) _comboV2SwShuffle(kinds);
  if (cfg.ch8) { let seenSort = false; kinds = kinds.map(function (k) { if (k !== 'sort') return k; if (!seenSort) { seenSort = true; return k; } return _comboV2Rand(['pair', 'place', 'fill']); }); }   // 챕터 8 분류형은 한 판에 딱 1개
  if (cfg.ch6) kinds = kinds.filter(function (k) { return k !== 'place'; }).concat(kinds.filter(function (k) { return k === 'place'; }));   // 챕터 6: 배치형은 후반부에
  // 3화음/7th 배분 — 표기를 고를 수 있는 문제(기능 레벨은 전부, 챕터 3은 전위 테마만; 꾸밈코드는 항상 3화음)를 순서대로 놓고 앞 70%는 3화음, 나머지는 7th
  const sev = kinds.map(function () { return false; });
  const capable = kinds.map(function (k, i) { return i; }).filter(function (i) { return cfg.func || (cfg.ch3 && themes[i] === 'inv'); });
  const nTri = Math.round(capable.length * COMBO_V2_TRIAD_RATE);
  capable.forEach(function (qi, n) { sev[qi] = n >= nTri; });
  // 챕터 5: 진행이 나오는 문제를 순서대로 놓고 앞 60%는 4코드 진행, 뒤 40%는 8코드 진행
  const big = kinds.map(function () { return false; });
  if (cfg.ch5 || cfg.ch7 || cfg.ch9) {
    const prog = kinds.map(function (k, i) { return i; }).filter(function (i) { return kinds[i] !== 'pair'; });
    const nSmall = Math.round(prog.length * (1 - COMBO_V2_CH5_BIG_RATE));
    prog.forEach(function (qi, n) { big[qi] = n >= nSmall; });
  }
  _comboV2Sess = { n: n, test: _comboV2TestMode, phase: 'main', wrong: [], rvPos: 0, canRetry: false, idx: 0, correct: 0, used: [], prevId: null, prevKey: null, reverse: false, key: null, dia: null, kinds: kinds, themes: themes, sev: sev, big: big, cfg: cfg };
  comboV2SetProgress(0);
  _comboV2QShow(kinds[0]);
}

// ── 같은 문제 재현(오답풀이용) ──
// 문제를 만들 때 쓰는 난수를 문제별 시드(mulberry32)로 고정하고, 만들기 직전의 세션 상태(prevKey·prevId·used)와 함께 s.snaps[idx]에 저장한다.
// 오답풀이는 저장한 시드·상태를 되돌린 뒤 같은 빌더를 다시 돌려, 틀렸던 문제를 칩·선택지 순서까지 똑같이 다시 만든다(문제 생성 중에만 시드 난수를 쓰고 끝나면 원래 Math.random 복구).
function _comboV2WithSeed(seed, fn) {
  const orig = Math.random;
  let a = seed >>> 0;
  Math.random = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { fn(); } finally { Math.random = orig; }
}

// 문제 하나 표시 — snap이 없으면 새 문제(시드·상태 저장), 있으면 그 문제를 그대로 재현. 세션 진행 상태는 건드리지 않음
function _comboV2QShow(kind, snap) {
  const s = _comboV2Sess;
  if (!s.snaps) s.snaps = [];
  if (!snap) {
    snap = { seed: Math.floor(Math.random() * 4294967296), prevKey: s.prevKey, prevId: s.prevId, used: s.used.slice(), idx: s.idx };
    s.snaps[s.idx] = snap;
  } else {
    s.idx = snap.idx; s.prevKey = snap.prevKey; s.prevId = snap.prevId; s.used = snap.used.slice();
  }
  _comboV2WithSeed(snap.seed, function () { _comboV2QBuild(kind); });
  s.canRetry = false;
  _comboV2AutoTimer = setTimeout(function () {   // 문제 진입 후 자동 1회 재생(소리가 없는 유형은 comboV2PlayProgression이 알아서 건너뜀)
    _comboV2AutoTimer = null;
    if (!_comboV2InQuiz) return;
    comboV2PlayProgression(document.querySelector('#combo-v2-quiz-content .combo-v2-type:not([hidden]) .combo-v2-speaker'));
  }, COMBO_V2_AUTOPLAY_MS);
  const badge = document.getElementById('combo-v2-review-badge');   // 오답풀이 중이면 타이틀 아래에 "오답풀기" 배지
  if (badge) { badge.hidden = !(s.phase === 'review' || s.test); badge.textContent = s.test ? '건너뛰기 테스트' : '오답풀기'; }
  _comboV2HeartsUpdate(false);
}

function _comboV2QBuild(kind) {
  const s = _comboV2Sess;
  _comboV2SoundStop();
  s.playChords = null;   // 챕터 5~9 배치형은 아직 소리 없음(각 빌더가 설정하지 않음)
  s.swMode = null;
  if (kind === 'replace' || kind === 'fill') { s.swMode = kind; kind = 'swap'; }   // 기능 레벨의 교체형·빈칸형은 swap 화면을 모드만 달리해서 씀
  const cand = s.cfg.keys.length > 1 ? s.cfg.keys.filter(function (k) { return k !== s.prevKey; }) : s.cfg.keys;   // key가 여러 개면 바로 앞 문제와 다른 key
  s.prevKey = cand[Math.floor(Math.random() * cand.length)];
  s.key = COMBO_V2_KEYS[s.prevKey];
  s.dia = _comboV2Dia(s.key, !!s.cfg.seventh);
  s.theme = null;
  s.form7 = !!(s.cfg.func && s.sev[s.idx]);   // 기능 레벨: 이 문제가 7th 구간인지
  if (s.cfg.func) s.dia = _comboV2Dia(s.key, s.form7);
  if (s.cfg.ch7 || s.cfg.ch9) { s.form7 = true; s.dia = _comboV2Dia(s.key, true); }
  if (s.cfg.ch8) { s.form7 = true; s.dia = _comboV2MDia(s.key); }   // 챕터 8: 내추럴 마이너 다이어토닉 7th   // 챕터 7: 텐션은 항상 7th 코드에만
  if (s.cfg.ch3) {   // 챕터 3: 이 문제의 테마와 표기(꾸밈 = 3화음, 전위 = 3화음 또는 7th 반반)
    s.theme = s.themes[s.idx];
    s.form7 = s.theme === 'inv' && s.sev[s.idx];
    s.dia = COMBO_V2_DEGS.map(function (x) { return _comboV2Ch3Item(x.deg, 'root', s.form7); });
  }
  s.reverse = !s.cfg.func && !s.cfg.ch3 && (kind === 'place' || (kind === 'swap' && s.swMode !== 'replace')) && !s.cfg.ch5 && !s.cfg.ch6 && !s.cfg.ch7 && !s.cfg.ch9 && Math.random() < COMBO_V2_REVERSE_RATE;   // 반대 문제(코드 → 도수). 챕터 2 기능·챕터 3은 없음, 교체형도 없음
  _comboV2PReset();      // 이전 문제 잔여물 정리(배치형 칩·드래그·채점 상태)
  _comboV2Type = kind;
  const meta = COMBO_V2_TYPE_META[kind];
  document.querySelectorAll('#combo-v2-quiz-content .combo-v2-type').forEach(function (el) { el.hidden = el.dataset.type !== kind; });
  const title = document.getElementById('combo-v2-q-title');
  if (title) title.textContent = meta.title;
  const sub = document.getElementById('combo-v2-q-sub');
  if (sub) { sub.textContent = meta.sub; sub.hidden = !meta.sub; }
  if (kind === 'pair') {
    if (s.cfg.ch4) s.pairVar = Math.random() < 0.5 ? 'tc' : 'dr';
    if (s.cfg.ch5) s.pairVar = Math.random() < 0.5 ? 'id' : 'it';
    if (s.cfg.ch6) s.pairVar = ['dd', 'di', 'ds'][Math.floor(Math.random() * 3)];   // 챕터 6: 도미넌트↔dim7 / 도미넌트 1전위↔dim7 / 도미넌트↔트라이톤 서브   // 챕터 5: 투마이너↔도미넌트 / 투마이너↔타겟 코드   // 챕터 4: 타겟 코드↔도미넌트 코드 / 도미넌트 코드↔도수
    _comboV2PairBuild();
    if (s.cfg.ch9) _comboV2BuildInfoCard(document.getElementById('combo-v2-pair-card'), s.key.name + ' key에서 모달 인터체인지 코드와', [], '알맞은 도수를 짝지어 주세요');
    else if (s.cfg.ch6) _comboV2BuildInfoCard(document.getElementById('combo-v2-pair-card'), s.key.name + (s.pairVar === 'di' ? ' key에서 도미넌트 1전위 코드와' : ' key에서 도미넌트 코드와'), [], s.pairVar === 'ds' ? '트라이톤 대리 도미넌트 코드를 짝지어 주세요' : (s.pairAlt ? '3도 위 디미니쉬 계열 코드를 짝지어 주세요' : '3도 위 디미니쉬 코드를 짝지어 주세요'));
    else if (s.cfg.ch5) _comboV2BuildInfoCard(document.getElementById('combo-v2-pair-card'), s.key.name + ' key에서 투마이너 코드와', [], s.pairVar === 'id' ? '그 도미넌트 코드를 짝지어 주세요' : '그 타겟 코드를 짝지어 주세요');
    else if (s.cfg.ch4) _comboV2BuildInfoCard(document.getElementById('combo-v2-pair-card'), s.key.name + ' key에서 도미넌트 코드와', [], s.pairVar === 'tc' ? '그 타겟 코드를 짝지어 주세요' : '알맞은 도수를 짝지어 주세요');
    else _comboV2BuildInfoCard(document.getElementById('combo-v2-pair-card'), _comboV2Sess.key.name + ' key ' + _comboV2Scope() + ' 코드를', [], '짝지어 주세요');   // 연결형 안내 카드(2줄)
  }
  if (kind === 'place') _comboV2PlaceBuild();
  if (kind === 'swap') { _comboV2SwGen(); _comboV2SwBuild(); }
  if (kind === 'swap' && title && COMBO_V2_SW_DATA.mode === 'fill') title.textContent = '빈칸에 알맞은 ' + (s.reverse ? '도수를' : '코드를') + ' 배치하세요';
  if (kind === 'place' && title && s.reverse) title.textContent = '주어진 진행에 맞게 도수를 배치하세요';   // 빈칸형 타이틀(교체형은 메타의 "표시된 부분을 바꿔주세요")
  if (kind === 'sort') _soBuild();
  _comboV2UpdateSubmit();
}

// 정답 처리 — 본 문제·오답풀이 정답을 합쳐 5개가 쌓일 때마다 피크 1개 환급(전부 맞히면 10문제 2개 / 15문제 3개). 서버 전송은 훈련을 나가거나 클리어할 때
function _comboV2Correct() {
  const s = _comboV2Sess;
  s.correct++;
  if (s.test) return;   // 건너뛰기 테스트는 피크를 쓰지 않아 환급도 없음
  if (s.correct % COMBO_V2_REFUND_EVERY !== 0) return;
  if (!addPendingRefund(1)) return;   // 화면 숫자만 올리고 대기분에 쌓음 — 서버 반영은 나가기·클리어 때 한 번에(flushPendingRefund)
  if (_comboV2InQuiz) _comboV2PeakPop();
}

// 환급 연출 — 탑바 피크 개수가 통통 튀고 아래로 "+1"이 떠올랐다 사라짐
function _comboV2PeakPop() {
  const pill = document.getElementById('topbar-currency');
  if (!pill) return;
  pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 420, easing: COMBO_V2_EASE });
  const r = pill.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'combo-v2-peak-plus';
  el.textContent = '+1';
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top = r.bottom + 'px';
  document.body.appendChild(el);
  const a = el.animate([
    { opacity: 0, transform: 'translate(-50%, 0)' },
    { opacity: 1, transform: 'translate(-50%, 6px)', offset: 0.25 },
    { opacity: 0, transform: 'translate(-50%, 22px)' },
  ], { duration: 900, easing: 'ease-out' });
  a.onfinish = a.oncancel = function () { el.remove(); };
}

// ── 채점 결과 처리(연결·배치·교체·분류형 공용) ──
// 본 문제: 틀리면 s.wrong에 기록하고 다음으로. 오답풀이: 맞힐 때까지 한 문제를 계속 풀어야 하므로 틀리면 "다시 풀기"(틀린 부분만 비움).
function _comboV2Verdict(ok) {
  const s = _comboV2Sess;
  const review = s.phase === 'review';
  comboPlaySound(ok ? 'correct' : 'wrong');
  if (ok) _comboV2Correct(); else if (!review) s.wrong.push(s.idx);
  if (s.test) _comboV2HeartsUpdate(true);
  if (!review) comboV2SetProgress(s.idx + 1);   // 본 문제: 맞든 틀리든 한 칸 진행(틀리면 위에서 오답풀이 몫이 전체에 더해짐)
  else if (ok) comboV2SetProgress(s.n + s.rvPos + 1);   // 오답풀이: 그 문제를 맞혔을 때 한 칸(재도전 중엔 안 움직임)
  s.canRetry = review && !ok;
  const last = review ? s.rvPos >= s.wrong.length - 1 : s.idx >= s.n - 1 && (s.test || !s.wrong.length);   // 건너뛰기 테스트는 오답풀이가 없어 마지막 문제가 끝   // 본 문제 마지막이라도 오답이 있으면 오답풀이가 이어짐
  const btn = document.getElementById('combo-v2-submit');
  if (btn) {
    btn.textContent = s.canRetry ? '다시 풀기' : last ? '완료' : '다음';
    btn.disabled = false;
    btn.classList.add(ok ? 'combo-v2-submit--ok' : 'combo-v2-submit--ng');
  }
}

// 건너뛰기 테스트 남은 기회 — 타이틀 오른쪽 노란 하트 3개. 오답이 나올 때마다 오른쪽 하트부터 회색으로 남음(3개 모두 회색이 되면 실패). 테스트가 아니면 숨김
function _comboV2HeartsUpdate(pop) {
  const s = _comboV2Sess;
  const box = document.getElementById('combo-v2-hearts');
  if (!box) return;
  box.hidden = !s.test;
  if (!s.test) return;
  const total = COMBO_V2_SKIP_MAX_WRONG + 1;
  const lost = Math.min(total, s.wrong.length);
  box.querySelectorAll('.combo-v2-heart').forEach(function (h, i) {
    const isLost = i >= total - lost;
    const was = h.classList.contains('is-lost');
    h.classList.toggle('is-lost', isLost);
    if (pop && isLost && !was && h.animate) h.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-in-out' });   // 방금 잃은 하트가 통통
  });
  box.setAttribute('aria-label', '남은 기회 ' + (total - lost) + '개');
}

// 오답풀이에서 틀린 뒤 "다시 풀기" — 같은 문제 그대로, 틀린 부분만 비우고 표시(맞힌 부분은 유지)
function _comboV2Retry() {
  const s = _comboV2Sess;
  s.canRetry = false;
  if (_comboV2Type === 'place') {
    _comboV2PMiss = {};
    _comboV2PBlanks().forEach(function (blank, i) {
      if (_comboV2PSlots[i] !== blank.dataset.answer) _comboV2PMiss[i] = _comboV2PSlots[i];   // 틀린 칩은 그 자리에 두고 배경만 연한 오답색으로 표시(옮기거나 빼면 표시 사라짐)
    });
    _comboV2PJudged = false;
    document.getElementById('combo-v2-blanks')?.classList.remove('is-locked');
    _comboV2PRender();
  } else if (_comboV2Type === 'swap') {
    const d = COMBO_V2_SW_DATA;
    const choices = document.getElementById('combo-v2-swap-choices');
    choices.querySelectorAll('.combo-v2-chip--choice').forEach(function (b) {
      if (b.dataset.chord !== _comboV2SwSel) return;
      b.classList.remove('is-sel');
      b.classList.add('is-miss');   // 틀린 선택지는 표시하고 다시 고를 수 없음
    });
    _comboV2SwSel = null;
    _comboV2SwJudged = false;
    choices.classList.remove('is-locked');
    const deg = document.querySelector('#combo-v2-swap-blanks .is-target .combo-v2-blank-deg');   // 채점 때 채운 정답 도수를 원래대로(정답 힌트가 남지 않게)
    if (deg) {
      deg.classList.remove('is-ok', 'is-ng');
      if (!d.reverse) deg.innerHTML = (d.mode === 'replace' || d.func != null) ? '' : _comboV2RomanHtml(d.degs[d.target]);
    }
    _comboV2SwRenderTarget(false);
  } else if (_comboV2Type === 'sort') {
    const wrong = [];
    _soCols = _soCols.map(function (col, c) {
      return col.filter(function (ch) { if (_soColMap[ch] === c) return true; wrong.push(ch); return false; });
    });
    _soMiss = wrong;
    _soQueue = wrong.concat(_soQueue);
    _soJudged = false;
    document.getElementById('combo-v2-sort')?.classList.remove('is-locked');
    _soRender();
  } else {
    const keep = [];
    _comboV2Pairs.forEach(function (p) {
      if (p.a.dataset.pair === p.b.dataset.pair) { keep.push(p); return; }
      [p.a, p.b].forEach(function (c) { c.classList.remove('is-ng'); c.style.removeProperty('--pair-c'); });   // 연결형은 틀린 짝만 풀고 따로 표시하지 않음
    });
    _comboV2Pairs = keep;
    _comboV2Judged = false;
    document.querySelector('#combo-v2-quiz-content .combo-v2-pairs')?.classList.remove('is-locked');
  }
  const btn = document.getElementById('combo-v2-submit');
  if (btn) {
    btn.textContent = '제출하기';
    btn.classList.remove('combo-v2-submit--ok', 'combo-v2-submit--ng');
  }
  _comboV2UpdateSubmit();
}

// 다음 — 본 문제를 다 풀면(오답이 있으면) 오답풀이, 오답풀이를 다 맞히면 클리어
function _comboV2Next() {
  const s = _comboV2Sess;
  if (s.phase === 'review') {
    if (s.rvPos >= s.wrong.length - 1) { _comboV2Finish(); return; }
    s.rvPos++;
    _comboV2ReviewShow();
    return;
  }
  if (s.test && s.wrong.length > COMBO_V2_SKIP_MAX_WRONG) { _comboV2TestEnd(false); return; }   // 오답 3개째 — 바로 실패
  if (s.idx >= s.n - 1) {
    if (s.test) { _comboV2TestEnd(true); return; }   // 건너뛰기 테스트는 오답풀이 없이 바로 결과
    if (s.wrong.length) _comboV2ShowIntro(); else _comboV2Finish();
    return;
  }
  s.idx++;
  _comboV2QShow(s.kinds[s.idx]);
}

function _comboV2StartReview() {
  const s = _comboV2Sess;
  s.phase = 'review';
  s.rvPos = 0;
  _comboV2ReviewShow();
}

// 틀렸던 문제를 그대로 다시 냄(저장한 시드·상태로 재현)
function _comboV2ReviewShow() {
  const s = _comboV2Sess;
  const i = s.wrong[s.rvPos];
  _comboV2QShow(s.kinds[i], s.snaps[i]);
}

// ── 오버레이: 오답풀이 안내 / 레벨 클리어 ──
// .combo-v2-seq 요소를 순서대로 하나씩 등장시킴(다음 요소는 앞 요소의 animationend 뒤 — 시간을 JS에 따로 하드코딩하지 않음, style-guide §18).
// 이탈(X·뒤로가기)은 comboV2ExitQuiz → _comboV2OverlayAbort가 타이머·리스너·표시를 즉시 정리하고, 늦게 도착하는 콜백은 seq.stopped / 토큰 가드로 무시됨.
const COMBO_V2_SEQ_GAP_MS = 150;       // 요소와 요소 사이(앞 요소 애니메이션 종료 후)
const COMBO_V2_INTRO_GAP_MS = 900;     // 오답풀이 안내: 줄과 줄 사이(앞 줄 애니메이션 종료 후) — 천천히 읽을 수 있게 길게
const COMBO_V2_INTRO_HOLD_MS = 2000;   // 안내 마지막 줄이 뜬 뒤 읽는 시간
let _comboV2Seq = null;
let _comboV2OvTok = 0;
let _comboV2ClearOn = false;

function _comboV2SeqStop() {
  if (_comboV2Seq) { _comboV2Seq.stopped = true; clearTimeout(_comboV2Seq.timer); }
  _comboV2Seq = null;
}

function _comboV2SeqPlay(scene, hold, onDone, gap) {
  _comboV2SeqStop();
  const seq = { timer: null, stopped: false };
  _comboV2Seq = seq;
  const els = Array.prototype.filter.call(scene.querySelectorAll('.combo-v2-seq'), function (el) { return !el.hidden; });
  els.forEach(function (el) { el.classList.remove('is-in'); });
  let i = 0;
  const next = function () {
    if (seq.stopped) return;
    if (i >= els.length) {
      seq.timer = setTimeout(function () { if (!seq.stopped && onDone) onDone(); }, hold);
      return;
    }
    const el = els[i++];
    const after = function () { if (!seq.stopped) seq.timer = setTimeout(next, gap == null ? COMBO_V2_SEQ_GAP_MS : gap); };
    el.addEventListener('animationend', function h(e) {
      if (e.target !== el) return;
      el.removeEventListener('animationend', h);
      after();
    });
    el.classList.add('is-in');
    if (getComputedStyle(el).animationName === 'none') after();   // 애니메이션이 없는 환경(모션 줄이기 등)에서도 멈추지 않게
  };
  next();
}

function _comboV2OverlayShow(sceneId) {
  const ov = document.getElementById('combo-v2-overlay');
  if (!ov) return null;
  _comboV2OvTok++;
  ov.classList.remove('is-out', 'combo-v2-overlay--exit');
  ov.hidden = false;
  ov.querySelectorAll('.combo-v2-scene').forEach(function (el) { el.hidden = el.id !== sceneId; });
  return document.getElementById(sceneId);
}

// 오버레이를 서서히 걷음(아래 문제 화면이 드러남)
function _comboV2OverlayFade() {
  const ov = document.getElementById('combo-v2-overlay');
  if (!ov || ov.hidden) return;
  const tok = ++_comboV2OvTok;
  ov.classList.add('is-out');
  ov.addEventListener('animationend', function h(e) {
    if (e.target !== ov) return;
    ov.removeEventListener('animationend', h);
    if (tok !== _comboV2OvTok) return;
    ov.hidden = true;
    ov.classList.remove('is-out');
  });
}

// 즉시 정리(멱등) — 이탈 공용
function _comboV2OverlayAbort() {
  _comboV2SeqStop();
  _comboV2OvTok++;
  _comboV2ClearOn = false;
  const ov = document.getElementById('combo-v2-overlay');
  if (!ov) return;
  ov.hidden = true;
  ov.classList.remove('is-out', 'combo-v2-overlay--exit');
  ov.querySelectorAll('.combo-v2-seq').forEach(function (el) { el.classList.remove('is-in'); });
  document.querySelectorAll('.combo-v2-confetti').forEach(function (el) { el.remove(); });
}

// 오답풀이로 넘어가기 전 안내 — 피크 환급 → 완주 조건 → 재도전 가능 순으로 뜨고, 끝나면 자동으로 틀린 첫 문제가 드러남
function _comboV2ShowIntro() {
  const s = _comboV2Sess;
  _comboV2SoundStop();   // 재생 중이던 정답 진행(·예약된 자동재생)을 즉시 끊음
  const pro = getPlan() === 'pro';
  const remain = s.n / COMBO_V2_REFUND_EVERY - Math.floor(s.correct / COMBO_V2_REFUND_EVERY);   // 아직 못 받은 환급(오답이 1개 이상이라 항상 1 이상)
  document.getElementById('combo-v2-intro-refund').textContent = remain;
  document.querySelectorAll('#combo-v2-intro [data-peak]').forEach(function (el) { el.hidden = pro; });   // Pro는 피크가 없어 환급 안내 생략
  document.getElementById('combo-v2-intro-title-pro').hidden = !pro;
  const scene = _comboV2OverlayShow('combo-v2-intro');
  if (!scene) { _comboV2StartReview(); return; }
  _comboV2SeqPlay(scene, COMBO_V2_INTRO_HOLD_MS, function () {
    _comboV2StartReview();   // 틀린 첫 문제를 오버레이 아래에 먼저 그려 두고
    _comboV2OverlayFade();   // 오버레이가 걷히며 그 문제가 드러남
  }, COMBO_V2_INTRO_GAP_MS);
}

// 레벨 클리어 — 푼 결과가 아니라 완주 축하·칭찬
function _comboV2Finish() {
  const s = _comboV2Sess;
  _comboV2SoundStop();   // 클리어 효과음과 겹치지 않게 재생 중이던 진행을 끊음
  const reviewed = s.wrong.length > 0;
  const lv = _comboV2Level;
  document.getElementById('combo-v2-clear-level').textContent = lv ? lv.num + ' · ' + lv.name : '';
  document.getElementById('combo-v2-clear-praise').textContent = reviewed ? '틀린 문제도 끝까지 풀어냈어요. 정말 잘했어요!' : '한 문제도 안 틀렸어요. 완벽해요!';
  const cleared = comboV2RecordClear(lv && lv.num);   // 완료 1회 기록 → 도넛 호 +1, 마지막 호면 레벨 클리어(다음 레벨 해금)
  if (lv && typeof dailyMissionReport === 'function') dailyMissionReport('combo', lv.num);   // 일일 미션: 리하모니 화성학 레벨 완료
  document.getElementById('combo-v2-clear-title').textContent = cleared ? '레벨 클리어!' : '완주!';   // 평소는 "완주!", 호를 다 채운 판만 "레벨 클리어!"
  document.getElementById('combo-v2-clear-refund').hidden = getPlan() === 'pro';   // 환급 안내 — 클리어는 전부 맞힌 상태라 환급 총합(문제 수 ÷ 5)을 그대로 알림. Pro는 피크가 없어 생략
  document.getElementById('combo-v2-clear-refund-n').textContent = s.n / COMBO_V2_REFUND_EVERY;
  document.querySelector('#combo-v2-clear .combo-v2-clear-trophy').hidden = false;   // 건너뛰기 실패 화면에서 숨겼을 수 있음
  _comboV2ClearOn = true;
  flushPendingRefund('chord_combo');   // 클리어 — 환급을 바로 서버에 반영(클리어 화면에서 앱이 꺼져도 안 잃음)
  const scene = _comboV2OverlayShow('combo-v2-clear');
  if (!scene) { comboV2ExitQuiz(); return; }
  _playSfx('reward.mp3');   // 클리어 효과음(앱 공용 보상음)
  _comboV2SeqPlay(scene, 0, null);
  _comboV2Confetti();
}

function _comboV2Confetti() {
  const ov = document.getElementById('combo-v2-overlay');
  const trophy = document.getElementById('combo-v2-clear').querySelector('.combo-v2-clear-trophy');
  if (!ov || !trophy) return;
  const o = ov.getBoundingClientRect(), t = trophy.getBoundingClientRect();
  const cx = t.left + t.width / 2 - o.left, cy = t.top + t.height / 2 - o.top;
  const colors = ['var(--icon-purple)', 'var(--icon-green)', 'var(--icon-coral)', 'var(--icon-blue)', 'var(--icon-yellow)', 'var(--icon-pink)'];
  for (let k = 0; k < 18; k++) {
    const d = document.createElement('div');
    d.className = 'combo-v2-confetti';
    d.style.left = cx + 'px';
    d.style.top = cy + 'px';
    d.style.background = colors[k % colors.length];
    ov.appendChild(d);
    const ang = (Math.PI * 2 * k) / 18 + Math.random() * 0.3, dist = 90 + Math.random() * 80;
    const a = d.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + Math.cos(ang) * dist + 'px, ' + (Math.sin(ang) * dist + 40) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 },
    ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: 250, fill: 'both' });   // 트로피가 팝인한 뒤에 터짐
    a.onfinish = a.oncancel = function () { d.remove(); };
  }
}

// 확인 → 선택 화면으로(오버레이도 문제 화면과 함께 오른쪽으로 빠짐)
function _comboV2CloseClear() {
  const ov = document.getElementById('combo-v2-overlay');
  _comboV2ClearOn = false;
  _comboV2SeqStop();
  if (ov && !ov.hidden) {
    const tok = ++_comboV2OvTok;
    ov.classList.add('combo-v2-overlay--exit');
    if (getComputedStyle(ov).transitionDuration === '0s') _comboV2OverlayAbort();   // 전환이 없는 환경이면 transitionend가 안 오므로 바로 정리
    ov.addEventListener('transitionend', function h(e) {
      if (e.target !== ov) return;
      ov.removeEventListener('transitionend', h);
      if (tok === _comboV2OvTok) _comboV2OverlayAbort();
    });
  }
  comboV2ExitQuiz(true);
  _comboV2AfterReturn(_comboV2PlayPendingFill);   // 선택 화면이 돌아온 뒤 도넛 호가 채워짐
}
document.getElementById('combo-v2-clear-btn')?.addEventListener('click', function () {
  _playConfirmSfx();
  _comboV2CloseClear();
});

// 설명 카드(배치형·교체형 공용) — 패턴 3줄: 앞 문구 / 도수들(강조, 도수마다 span) / 뒤 문구. 스피커 버튼은 남기고 문구만 다시 그림
const COMBO_V2_INFO = { scope: '다이어토닉' };
function _comboV2Scope() { return _comboV2Sess.cfg && _comboV2Sess.cfg.ch8 ? '마이너 다이어토닉' : _comboV2Sess.cfg && _comboV2Sess.cfg.ch4 ? '세컨더리 도미넌트' : _comboV2Sess.cfg && (_comboV2Sess.cfg.seventh || _comboV2Sess.form7) ? COMBO_V2_INFO.scope + ' 7th' : COMBO_V2_INFO.scope; }
function _comboV2BuildInfoCard(card, head, degs, tail, midHtml) {   // midHtml: 도수 줄 대신 앞뒤 줄과 같은 크기로 넣는 가운데 줄(HTML)
  if (!card) return;
  card.querySelectorAll('.combo-v2-info-text').forEach(function (el) { el.remove(); });
  const p = document.createElement('p');
  p.className = 'combo-v2-info-text';
  const line = function (tag, text) {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  const headEl = document.createElement('span');
  headEl.innerHTML = head.replace(/^(\S+ key)/, '<strong>$1</strong>');   // 앞 문구의 "C key"만 진하게(기능 이름 강조와 같은 규칙)
  p.append(headEl);
  if (degs.length) p.append(degs.reduce(function (b, d) { const sp = document.createElement('span'); sp.innerHTML = /^([#b]?[IVX]+|Sub\.)/.test(d) ? _comboV2RomanHtml(d) : d; b.appendChild(sp); return b; }, document.createElement('b')));   // 간격은 CSS gap. 도수가 없으면 2줄
  if (midHtml) { const mid = document.createElement('span'); mid.innerHTML = midHtml; p.append(mid); }
  p.append(line('span', tail));
  card.appendChild(p);
}
// 배치형: "C key 다이어토닉 코드에서" / "I IV V VIm"(빈칸 아래 로마자에서 읽음) / "순서대로 코드를 나열해주세요"
function _comboV2PBuildCard() {
  if (_comboV2Sess.cfg.ch5 || _comboV2Sess.cfg.ch6 || _comboV2Sess.cfg.ch7 || _comboV2Sess.cfg.ch9) { _comboV2BuildInfoCard(document.getElementById('combo-v2-place-card'), _comboV2Sess.key.name + ' key 코드진행에서', [], '빈칸에 알맞은 코드를 배치해주세요'); return; }
  const degs = Array.prototype.map.call(_comboV2PBlanks(), function (b) {
    return b.querySelector('.combo-v2-blank-deg').textContent;
  });
  _comboV2BuildInfoCard(document.getElementById('combo-v2-place-card'),
    _comboV2Sess.key.name + ' key ' + _comboV2Scope() + ' 코드에서', degs, _comboV2PRev ? '순서대로 도수를 나열해주세요' : '순서대로 코드를 나열해주세요');   // 반대 문제는 가운데 줄이 코드 이름(빈칸 아래 힌트)
}

// ── 배치형 (목업: 정답 I - IV - V - VIm = C F G Am, 풀 = C key 다이어토닉 7개) ──
// 채우기: 풀 칩을 탭하면 복사본이 날아가 "비어있는 칸의 가장 왼쪽"에 놓임(풀 칩은 그대로).
// 제거/이동: 채운 칩을 짧게 탭하면 제거(그 칸은 밑줄+로마자만 남고 나머지는 제자리 = 구멍 유지),
//            0.2초 이상 누른 채 움직이면 드래그 — 다른 칸에 놓으면 교환(빈칸이면 이동), 칸 밖에 놓으면 원위치.
// 드래그는 기존 방식(_comboBlockPointerDown/Up)처럼 고스트 클론 + elementFromPoint로 드롭 칸을 찾음.
const COMBO_V2_HOLD_MS = 200;   // 이만큼 누르고 있으면 드래그 시작(그 전에 떼면 탭 = 제거)
const COMBO_V2_MOVE_TOL = 8;    // px — 홀드 전에 이만큼 움직이면 탭도 드래그도 아닌 것으로 취소
const COMBO_V2_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';   // 앱 표준 이징(easeOutQuint)
let _comboV2PSlots = [null, null, null, null];   // 칸별로 채워진 코드(없으면 null)
let _comboV2PJudged = false;
let _comboV2PMiss = {};     // 오답풀이 재도전: 틀려서 그 자리에 남은 칩(칸 index → 코드) — 배경만 연한 오답색
let _comboV2PFlying = {};   // 날아오는 중인 칸 index → true (도착 전까지 칸 안 칩을 숨김)
let _comboV2PRev = false;   // 반대 문제 — 칸에 놓는 것이 도수(로마숫자)
let _comboV2PHold = -1;     // 드래그 중인 칩이 들어 있는 칸(없으면 -1)
let _comboV2PDrag = null;   // { i, chip, startX, startY, lastX, lastY, timer, active, cancelled, ghost, offX, offY, orig, perm, hover }

function _comboV2PBlanks() { return document.querySelectorAll('#combo-v2-blanks .combo-v2-blank'); }
function _comboV2PIndexOf(blank) { return Array.prototype.indexOf.call(_comboV2PBlanks(), blank); }

// 상태(_comboV2PSlots)대로 칸 안의 칩을 다시 그림. popIdx = 통통 튀는 효과를 줄 칸
function _comboV2PRender(popIdx) {
  _comboV2PBlanks().forEach(function (blank, i) {
    const slot = blank.querySelector('.combo-v2-blank-slot');
    slot.innerHTML = '';
    const chord = _comboV2PSlots[i];
    if (chord == null) return;
    const chip = document.createElement('button');
    chip.className = 'combo-v2-chip cd-card';
    chip.dataset.chord = chord;
    chip.innerHTML = _comboV2Fmt(chord, _comboV2PRev);   // (...) 텐션은 위첨자
    if (_comboV2PMiss[i] === chord) chip.classList.add('is-miss');
    if (_comboV2PFlying[i]) chip.classList.add('is-src-hidden');
    if (i === _comboV2PHold) chip.classList.add('is-src-hidden');   // 드래그 중인 칩의 자리(고스트가 대신 따라다님)
    if (popIdx && popIdx.indexOf(i) >= 0) chip.classList.add('combo-block--pop');
    slot.appendChild(chip);
  });
  _comboV2UpdateSubmit();
}

// 복제본을 화면 고정 좌표로 띄움(날아가기·제거 효과용)
function _comboV2PSpawnClone(src, cls) {
  const rect = src.getBoundingClientRect();
  const clone = src.cloneNode(true);
  clone.classList.remove('is-src-hidden', 'combo-block--pop', 'combo-v2-chip--shake');
  clone.classList.add(cls);
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.fontSize = getComputedStyle(src).fontSize;   // body에 붙는 복제본은 유형별 글자 크기 규칙을 못 받음
  document.body.appendChild(clone);
  return { clone: clone, rect: rect };
}

function _comboV2PFill(poolChip) {
  const i = _comboV2PSlots.indexOf(null);   // 항상 비어있는 칸의 가장 왼쪽부터
  if (i < 0) { // 4칸이 다 참 → 칩이 가볍게 흔들림
    poolChip.classList.remove('combo-v2-chip--shake');
    void poolChip.offsetWidth;
    poolChip.classList.add('combo-v2-chip--shake');
    return;
  }
  const chord = poolChip.dataset.chord;
  _comboV2PSlots[i] = chord;
  _comboV2PFlying[i] = true;
  _comboV2PRender();   // 칸에 (숨겨진) 진짜 칩을 먼저 놓아 도착 좌표를 정확히 잼
  const target = _comboV2PBlanks()[i].querySelector('.combo-v2-chip');
  const to = target.getBoundingClientRect();
  const spawned = _comboV2PSpawnClone(poolChip, 'combo-v2-fly');
  const anim = spawned.clone.animate([
    { transform: 'translate(0px, 0px)' },
    { transform: 'translate(' + (to.left - spawned.rect.left) + 'px, ' + (to.top - spawned.rect.top) + 'px)' },
  ], { duration: 400, easing: COMBO_V2_EASE, fill: 'forwards' });
  const done = function () {
    anim.onfinish = anim.oncancel = null;
    spawned.clone.remove();
    delete _comboV2PFlying[i];
    const chip = _comboV2PBlanks()[i] && _comboV2PBlanks()[i].querySelector('.combo-v2-chip');
    if (chip && _comboV2PSlots[i] === chord) {
      chip.classList.remove('is-src-hidden');
      chip.classList.add('combo-block--pop');   // 도착: 기존 통통 효과 재사용
    }
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

function _comboV2PRemove(i, chip) {
  const spawned = _comboV2PSpawnClone(chip, 'combo-v2-fly');
  _comboV2PSlots[i] = null;
  _comboV2PRender();   // 그 칸은 밑줄 + 로마자만 남음, 다른 칸은 그대로
  const anim = spawned.clone.animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(0.6)', opacity: 0 },
  ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
  anim.onfinish = anim.oncancel = function () { spawned.clone.remove(); };
}

function _comboV2PDown(e) {
  if (_comboV2PJudged || _comboV2PDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const chip = e.target.closest('.combo-v2-blank-slot .combo-v2-chip');
  if (!chip) return;
  const i = _comboV2PIndexOf(chip.closest('.combo-v2-blank'));
  if (i < 0 || _comboV2PFlying[i]) return;
  e.preventDefault();   // 텍스트 선택·네이티브 제스처가 끼어들지 않게(기존 드래그와 동일)
  _comboV2PDrag = {
    i: i, chip: chip, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
    timer: setTimeout(_comboV2PBeginDrag, COMBO_V2_HOLD_MS), active: false, cancelled: false, ghost: null, offX: 0, offY: 0,
  };
  document.addEventListener('pointermove', _comboV2PMove);
  document.addEventListener('pointerup', _comboV2PUp);
  document.addEventListener('pointercancel', _comboV2PCancel);
}

function _comboV2PBeginDrag() {
  const d = _comboV2PDrag;
  if (!d || d.cancelled) return;
  d.timer = null;
  d.active = true;
  const rect = d.chip.getBoundingClientRect();
  d.offX = d.lastX - rect.left;
  d.offY = d.lastY - rect.top;
  const ghost = d.chip.cloneNode(true);
  ghost.classList.add('combo-v2-chip--ghost');
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.fontSize = getComputedStyle(d.chip).fontSize;
  document.body.appendChild(ghost);
  d.ghost = ghost;
  d.orig = _comboV2PSlots.slice();                        // 드래그 시작 때의 칸 상태 — 미리 교체는 항상 이 상태에서 계산
  d.perm = d.orig.map(function (_, m) { return m; });     // perm[m] = 지금 m칸에 들어 있는 내용이 원래 있던 칸
  d.hover = -1;                                           // 지금 포인터가 올라가 있어 미리 교체된 칸
  d.pend = -1;
  d.hoverTimer = null;
  _comboV2PHold = d.i;
  _comboV2PRender();
}

const COMBO_V2_HOVER_MS = 90;     // 새 칸 위에 이만큼 머물러야 미리 교체(스쳐 지나갈 때 칩이 들썩이지 않게)
const COMBO_V2_HOVER_PAD_X = 10;  // 칸 판정을 좌우로 넓힘 — 칸 사이 틈에서 판정이 끊기지 않게
const COMBO_V2_HOVER_PAD_Y = 28;  // 위아래로도 넓힘 — 칩을 칸 위쪽으로 들고 있어도 그 칸으로 침

// 포인터 위치가 속한 칸(칸 판정 영역 안에서 중심이 가장 가까운 칸). 없으면 -1
function _comboV2PHit(x, y) {
  let best = -1, bestD = Infinity;
  _comboV2PBlanks().forEach(function (b, m) {
    const r = b.getBoundingClientRect();
    if (x < r.left - COMBO_V2_HOVER_PAD_X || x > r.right + COMBO_V2_HOVER_PAD_X || y < r.top - COMBO_V2_HOVER_PAD_Y || y > r.bottom + COMBO_V2_HOVER_PAD_Y) return;
    const dist = Math.abs(x - (r.left + r.width / 2));
    if (dist < bestD) { bestD = dist; best = m; }
  });
  return best;
}

// 드래그 중 미리 교체 — 포인터가 다른 칸 위에 잠깐 머물면 그 칸의 칩이 원래 칸으로 옮겨 가고(빈칸이면 빈 자리가 옮겨 감),
// 내가 든 칩은 그 칸에 들어간 것으로 침. 칸 밖이면 원래대로. 놓으면 그 상태가 확정(분류형과 같은 방식).
// now = true이면 머무는 시간 없이 즉시(놓을 때)
function _comboV2PPreview(d, x, y, now) {
  const j = _comboV2PHit(x, y);
  const target = (j >= 0 && j !== d.i && !_comboV2PFlying[j]) ? j : -1;
  if (target === d.hover) { clearTimeout(d.hoverTimer); d.hoverTimer = null; d.pend = d.hover; return; }
  if (!now) {
    if (d.pend === target && d.hoverTimer) return;   // 이미 이 칸으로 바뀌길 기다리는 중
    clearTimeout(d.hoverTimer);
    d.pend = target;
    d.hoverTimer = setTimeout(function () { d.hoverTimer = null; _comboV2PApplyHover(d, target); }, COMBO_V2_HOVER_MS);
    return;
  }
  clearTimeout(d.hoverTimer);
  d.hoverTimer = null;
  _comboV2PApplyHover(d, target);
}

function _comboV2PApplyHover(d, target) {
  if (_comboV2PDrag !== d && !d.finishing) return;   // 이미 끝난 드래그의 늦은 타이머
  if (target === d.hover) return;
  d.hover = target;
  const slotEls = Array.prototype.map.call(_comboV2PBlanks(), function (b) { return b.querySelector('.combo-v2-blank-slot'); });
  const rects = slotEls.map(function (e) { return e.getBoundingClientRect(); });
  const oldPerm = d.perm;
  const perm = d.orig.map(function (_, m) { return m; });
  if (target >= 0) { perm[d.i] = target; perm[target] = d.i; }
  d.perm = perm;
  _comboV2PSlots = perm.map(function (m) { return d.orig[m]; });
  _comboV2PHold = perm.indexOf(d.i);
  _comboV2PRender();
  perm.forEach(function (src, m) {   // 자리가 바뀐 칩은 이전 칸에서 부드럽게 이동(FLIP)
    const from = oldPerm.indexOf(src);
    if (from === m || m === _comboV2PHold || _comboV2PSlots[m] == null) return;
    const chip = slotEls[m].querySelector('.combo-v2-chip');
    if (!chip) return;
    chip.animate([
      { transform: 'translate(' + (rects[from].left - rects[m].left) + 'px, ' + (rects[from].top - rects[m].top) + 'px)' },
      { transform: 'translate(0px, 0px)' },
    ], { duration: 320, easing: COMBO_V2_EASE });
  });
}

function _comboV2PMove(e) {
  const d = _comboV2PDrag;
  if (!d) return;
  d.lastX = e.clientX;
  d.lastY = e.clientY;
  if (!d.active) {
    if (!d.cancelled && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > COMBO_V2_MOVE_TOL) {
      d.cancelled = true;   // 홀드 전에 움직임 → 탭도 드래그도 아님
      clearTimeout(d.timer);
      d.timer = null;
    }
    return;
  }
  d.ghost.style.left = (e.clientX - d.offX) + 'px';
  d.ghost.style.top = (e.clientY - d.offY) + 'px';
  _comboV2PPreview(d, e.clientX, e.clientY);
}

function _comboV2PEndTracking() {
  document.removeEventListener('pointermove', _comboV2PMove);
  document.removeEventListener('pointerup', _comboV2PUp);
  document.removeEventListener('pointercancel', _comboV2PCancel);
  if (_comboV2PDrag && _comboV2PDrag.timer) clearTimeout(_comboV2PDrag.timer);
  _comboV2PDrag = null;
}

function _comboV2PUp(e) {
  const d = _comboV2PDrag;
  if (!d) return;
  _comboV2PEndTracking();
  if (d.active) { // 드래그 끝 → 미리 교체된 상태를 확정. 칸 밖이면 원래대로(미리 교체가 이미 되돌려 둠)
    const gr = d.ghost.getBoundingClientRect();
    d.finishing = true;
    _comboV2PPreview(d, e.clientX, e.clientY, true);
    d.ghost.remove();
    _comboV2PHold = -1;
    _comboV2PRender();
    const chip = _comboV2PBlanks()[d.perm.indexOf(d.i)].querySelector('.combo-v2-chip');
    if (chip) {   // 놓은 칩이 고스트 위치에서 제자리로 들어옴
      const r = chip.getBoundingClientRect();
      chip.animate([
        { transform: 'translate(' + ((gr.left + gr.width / 2) - (r.left + r.width / 2)) + 'px, ' + ((gr.top + gr.height / 2) - (r.top + r.height / 2)) + 'px) scale(1.12)' },
        { transform: 'translate(0px, 0px) scale(1)' },
      ], { duration: 180, easing: COMBO_V2_EASE });
    }
    return;
  }
  if (d.cancelled) return;
  _playConfirmSfx();   // 짧은 탭 → 제거
  _comboV2PRemove(d.i, d.chip);
}

// 시스템이 제스처를 가로챈 경우·이탈 시: 드래그 중이던 고스트를 치우고 원래 칩을 되살림
function _comboV2PCancel() {
  const d = _comboV2PDrag;
  _comboV2PEndTracking();
  if (d && d.hoverTimer) { clearTimeout(d.hoverTimer); d.hoverTimer = null; }
  if (d && d.ghost) {   // 미리 교체돼 있던 칸도 드래그 시작 때 상태로 되돌림
    d.ghost.remove();
    if (d.orig) _comboV2PSlots = d.orig.slice();
    _comboV2PHold = -1;
    _comboV2PRender();
  }
}

function _comboV2PJudge() {
  _comboV2PJudged = true;
  let allOk = true;
  _comboV2PBlanks().forEach(function (blank, i) {
    const ok = _comboV2PSlots[i] === blank.dataset.answer;
    if (!ok) allOk = false;
    const chip = blank.querySelector('.combo-v2-chip');
    if (chip) chip.classList.add(ok ? 'is-ok' : 'is-ng');
  });
  document.getElementById('combo-v2-blanks')?.classList.add('is-locked');
  _comboV2Verdict(allOk);
}

// 초기화(멱등) — "다시 하기"·이탈 공용: 진행 중인 드래그/날아가기 효과까지 즉시 정리
function _comboV2PReset() {
  _comboV2PCancel();
  document.querySelectorAll('.combo-v2-fly, .combo-v2-chip--ghost').forEach(function (el) {
    el.getAnimations().forEach(function (a) { a.onfinish = null; a.oncancel = null; a.cancel(); });
    el.remove();
  });
  _comboV2PJudged = false;
  _comboV2PMiss = {};
  _comboV2PSlots =Array.prototype.map.call(_comboV2PBlanks(), function () { return null; });   // 빈칸 수만큼(챕터 5 배치형은 3~5칸)
  _comboV2PFlying = {};
  _comboV2PRender();
  document.getElementById('combo-v2-blanks')?.classList.remove('is-locked');
  const btn = document.getElementById('combo-v2-submit');
  if (btn && _comboV2Type === 'place') {
    btn.textContent = '제출하기';
    btn.classList.remove('combo-v2-submit--ok', 'combo-v2-submit--ng');
  }
  _comboV2UpdateSubmit();
}

document.querySelectorAll('#combo-v2-pool .combo-v2-chip').forEach(function (c) { c.innerHTML = _ccFormatB5(c.dataset.chord); });   // 풀 칩도 (...) 위첨자
document.getElementById('combo-v2-pool')?.addEventListener('click', function (e) {
  const chip = e.target.closest('.combo-v2-chip');
  if (!chip || _comboV2PJudged) return;
  _playConfirmSfx();
  _comboV2PFill(chip);
});
document.getElementById('combo-v2-blanks')?.addEventListener('pointerdown', _comboV2PDown);
document.getElementById('combo-v2-blanks')?.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // 안드로이드 길게 누르기 메뉴 차단

// ── 교체형 (목업: C key, 원래 진행 IV V I VIm = F G C Am) ──
// 두 가지: 'replace' = 표시된 칸을 다른 코드로 교체 / 'fill' = 빈칸에 알맞는 코드 넣기. 둘 다 정답은 딱 1칸.
// 안 바뀌는 칸은 순수 텍스트, 대상 칸만 칩. 선택지(정답 1 + 오답 2)를 탭하면 대상 칸이 바로 바뀜(날아가기 없음, 다른 선택지 탭 = 선택 변경).
// 오답 후보 = 해당 키 다이어토닉 7화음 − 정답 − (교체형이면 원래 코드). 문제에 들어올 때마다 랜덤 2개, 정답 위치도 섞음.
const COMBO_V2_SW_DIATONIC = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'];
const COMBO_V2_SW_DATA = {
  mode: 'replace',   // 'replace' | 'fill' (목업은 교체형)
  chords: ['F', 'G', 'C', 'Am'],
  degs: ['IV', 'V', 'I', 'VIm'],
  target: 0,
  answer: 'Dm',
  answerDeg: 'IIm',
};
let _comboV2SwSel = null;      // 지금 고른 선택지(코드 이름)
let _comboV2SwJudged = false;

function _comboV2RomanHtml(deg) {   // 'VIm' → 로마숫자 + 작은 퀄리티
  if (deg === 'Rel.IIm→') return '<span class="rm"><span class="rn rl">Rel.</span><span class="rn">II</span><span class="rq">m</span><span class="rs">→</span></span>';   // 릴레이티드 투마이너 자체 표기: Rel.는 로마숫자와 같은 크기의 회색, II는 브랜드색, 화살표는 진하게
  const dm = /^V7(?:\/([IVX]+))?(\(.+\))?$/.exec(deg);   // 도미넌트: V7(프라이머리) / V7/II(세컨더리) → V·타겟 로마숫자는 크게, 7과 /는 작게
  if (dm) return '<span class="rm"><span class="rn">V</span><span class="rq">7</span>' + (dm[1] ? '<span class="rs">/</span><span class="rn">' + dm[1] + '</span>' : '') + (dm[2] ? '<span class="rq">' + _ccFormatB5(dm[2]) + '</span>' : '') + '</span>';
  const sm = /^Sub\.V7(?:\/([IVX]+))?(\(.+\))?$/.exec(deg);   // 트라이톤 대리 도미넌트 자체 표기: Sub.V7 / Sub.V7/II — 7만 작게, Sub.는 로마숫자와 같은 크기의 회색
  if (sm) return '<span class="rm"><span class="rn rl">Sub.</span><span class="rn">V</span><span class="rq">7</span>' + (sm[1] ? '<span class="rs">/</span><span class="rn">' + sm[1] + '</span>' : '') + (sm[2] ? '<span class="rq">' + _ccFormatB5(sm[2]) + '</span>' : '') + '</span>';
  const m = /^([#b]?[IVXivx]+)(.*)$/.exec(deg);   // #Idim7처럼 앞의 #·b는 로마숫자와 같은 크기
  const inner = m ? '<span class="rn">' + m[1] + '</span>' + (m[2] ? '<span class="rq">' + _ccFormatB5(m[2]) + '</span>' : '') : '<span class="rn">' + deg + '</span>';
  return '<span class="rm">' + inner + '</span>';   // 칩·칸은 flex라 자식이 가운데 정렬됨 — 한 덩어리로 감싸야 로마숫자와 퀄리티가 같은 기준선에 붙음
}

function _comboV2SwShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// 대상 칸 안의 칩을 현재 선택 상태로 다시 그림(popped = 바뀔 때 통통 효과)
// 값 표시 — 반대 문제에서는 값이 도수(로마숫자), 아니면 코드 이름
function _comboV2Fmt(v, reverse) { return reverse ? _comboV2RomanHtml(v) : _ccFormatB5(v); }

function _comboV2SwRenderTarget(popped) {
  const d = COMBO_V2_SW_DATA;
  const slot = document.querySelector('#combo-v2-swap-blanks .is-target .combo-v2-blank-slot');
  if (!slot) return;
  slot.innerHTML = '';
  const chord = _comboV2SwSel != null ? _comboV2SwSel : (d.mode === 'replace' ? d.chords[d.target] : null);
  if (chord == null) return;   // 빈칸형 선택 전 = 밑줄만
  const chip = document.createElement('div');
  chip.className = 'combo-v2-chip cd-card' + (popped ? ' combo-block--pop' : '');
  chip.innerHTML = _comboV2Fmt(chord, d.reverse);
  slot.appendChild(chip);
}

// 문제 구성(칸·선택지·안내문구) — 진입 시·"다시 하기" 시 호출(선택지는 새로 뽑음)
function _comboV2SwBuild() {
  const d = COMBO_V2_SW_DATA;
  _comboV2SwSel = null;
  _comboV2SwJudged = false;
  const blanks = document.getElementById('combo-v2-swap-blanks');
  if (!blanks) return;
  blanks.classList.remove('is-locked');
  blanks.querySelectorAll('.combo-v2-blank').forEach(function (el) { el.remove(); });
  blanks.classList.toggle('combo-v2-blanks--8', d.chords.length > 4);   // 8코드 진행(챕터 5)은 4칸씩 두 줄
  d.chords.forEach(function (chord, i) {
    const blank = document.createElement('div');
    if (chord === '%') {   // 직전 코드 반복 기호
      blank.className = 'combo-v2-blank is-fixed';
      blank.innerHTML = '<div class="combo-v2-blank-slot"><span class="combo-v2-fixed-text">%</span></div><div class="combo-v2-blank-deg is-empty"></div>';
      blanks.appendChild(blank);
      return;
    }
    const isTarget = i === d.target;
    const hideDeg = isTarget && (d.mode === 'replace' || d.func != null);   // 기능 문제는 대상 칸 도수가 곧 답의 힌트라 비움
    blank.className = 'combo-v2-blank ' + (isTarget ? 'is-target' : 'is-fixed');
    // 보통: 칸에 코드 이름 / 아래 도수 힌트. 반대: 칸에 도수 / 아래 코드 이름 힌트
    const cellRoman = d.reverse && !d.domRev;                  // domRev(챕터 4 도미넌트 역할 맞추기): 칸에는 코드 이름, 빈칸 아래에만 코드 힌트
    const hintChord = d.reverse && (!d.domRev || isTarget);
    blank.innerHTML = '<div class="combo-v2-blank-slot">' + (isTarget ? '' : '<span class="combo-v2-fixed-text">' + (cellRoman ? _comboV2RomanHtml(d.degs[i]) : _ccFormatB5(chord)) + '</span>') + '</div>' +
      '<div class="combo-v2-blank-deg' + (hideDeg ? ' is-empty' : '') + (hintChord ? ' is-chord' : '') + '">' + (hideDeg ? '' : (hintChord ? _ccFormatB5(chord) : _comboV2RomanHtml(d.degs[i]))) + '</div>';   // 교체형의 대상 칸만 로마숫자를 비움(바뀔 도수라 안내와 중복, 줄 높이는 유지). 빈칸형은 빈칸에도 표기
    blanks.appendChild(blank);
  });
  _comboV2SwRenderTarget(false);
  const exclude = [d.answer].concat(d.mode === 'replace' ? [d.chords[d.target]] : []);
  const wrong = d.wrong ? d.wrong.slice() : _comboV2SwShuffle((d.pool || COMBO_V2_SW_DIATONIC).filter(function (c) { return exclude.indexOf(c) < 0; })).slice(0, 2);
  const choices = document.getElementById('combo-v2-swap-choices');
  choices.classList.remove('is-locked');
  choices.innerHTML = '';
  _comboV2SwShuffle(wrong.concat([d.answer])).forEach(function (chord) {
    const b = document.createElement('button');
    b.className = 'combo-v2-chip combo-v2-chip--choice cd-card';
    b.dataset.chord = chord;
    b.innerHTML = _comboV2Fmt(chord, d.reverse);
    choices.appendChild(b);
  });
  // 교체형: "C key 다이어토닉 코드에서" / "IV → IIm" / "코드로 교체해주세요" (빈칸형은 2줄: "C key 다이어토닉 코드에서" / "빈칸에 알맞은 코드를 채워주세요")
  const head = _comboV2Sess.key.name + ' key ' + _comboV2Scope() + ' 코드에서';
  const swCard = document.getElementById('combo-v2-swap-card');
  if (d.ch9) {   // 챕터 9: 교체형 "C key 코드진행에서 / FM7 코드를 / 같은 기능의 모달 인터체인지 코드로 교체해주세요", 빈칸형 "… / 빈칸에 알맞은 모달 인터체인지 코드를 채워주세요"
    const h9 = _comboV2Sess.key.name + ' key 코드진행에서';
    if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, h9, [], '같은 기능의 모달 인터체인지 코드로 교체해주세요', '<strong>' + _ccFormatB5(d.targetOrig) + '</strong> 코드를');
    else _comboV2BuildInfoCard(swCard, h9, [], '빈칸에 알맞은 모달 인터체인지 코드를 채워주세요');
  } else if (d.ch7) {   // 챕터 7 교체형: "C key 코드진행에서 / Dm7 코드를 / 어울리는 텐션 코드로 교체해주세요"
    _comboV2BuildInfoCard(swCard, _comboV2Sess.key.name + ' key 코드진행에서', [], '어울리는 텐션 코드로 교체해주세요', '<strong>' + _ccFormatB5(d.chords[d.target]) + '</strong> 코드를');
  } else if (d.ch6) {   // 챕터 6: 교체형 "A7 도미넌트 코드를 / 대리코드로 교체해주세요", 빈칸형 "… / 빈칸에 알맞은 대리코드를 채워주세요"
    const h6 = _comboV2Sess.key.name + ' key 코드진행에서';
    if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, h6, [], '대리코드로 교체해주세요', '<strong>' + _ccFormatB5(d.chords[d.target]) + '</strong> 도미넌트 코드를');
    else _comboV2BuildInfoCard(swCard, h6, [], '빈칸에 알맞은 대리코드를 채워주세요');
  } else if (d.ch5) {   // 챕터 5: 교체형 "E7 도미넌트 코드 앞의 칸을 / 투마이너 코드로 교체해주세요", 빈칸형 "E7 도미넌트 코드 앞에 오는 / 투마이너 코드를 채워주세요"
    const h5 = _comboV2Sess.key.name + ' key 코드진행에서';
    if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, h5, [], '투마이너 코드로 교체해주세요', '<strong>' + _ccFormatB5(d.domChord) + '</strong> 도미넌트 코드 앞의 칸을');
    else _comboV2BuildInfoCard(swCard, h5, [], '투마이너 코드를 채워주세요', '<strong>' + _ccFormatB5(d.domChord) + '</strong> 도미넌트 코드 앞에 오는');
  } else if (d.ch4) {   // 챕터 4: 교체형 "C key 코드진행에서 / Dm 코드를 향하는 도미넌트로 / 교체해주세요", 빈칸형 "… / 빈칸에 알맞은 도미넌트 코드를 채워주세요", 반대 빈칸형 "… / A7 도미넌트 코드가 / 무엇의 도미넌트인지 골라주세요"
    const h4 = _comboV2Sess.key.name + ' key 코드진행에서';
    if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, h4, [], '교체해주세요', '<strong>' + _ccFormatB5(d.targetChord) + '</strong> 코드를 향하는 도미넌트로');
    else if (d.domRev) _comboV2BuildInfoCard(swCard, h4, [], '무엇의 도미넌트인지 골라주세요', '<strong>' + _ccFormatB5(d.chords[d.target]) + '</strong> 도미넌트 코드가');
    else _comboV2BuildInfoCard(swCard, h4, [], '도미넌트 코드를 채워주세요', '<strong>' + _ccFormatB5(d.targetChord) + '</strong> 코드로 향하는');
  } else if (d.ch3 === 'deco') {   // 꾸밈코드: 교체형 "IV 코드를 꾸밈코드로 / 교체해주세요", 빈칸형 "빈칸에 알맞은 꾸밈코드를 채워주세요"
    if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, head, [], '교체해주세요', '<strong>' + d.targetBase + '</strong> 코드를 꾸밈코드로');
    else _comboV2BuildInfoCard(swCard, head, [], '빈칸에 알맞은 꾸밈코드를 채워주세요');
  } else if (d.func != null) {   // 기능 문제: 교체형 "예비 기능의 다른 코드를 / 빈칸에 채워주세요", 빈칸형 "예비 기능의 코드를 / 빈칸에 채워주세요"
    const fn = COMBO_V2_FUNC_NAME[d.func];
    _comboV2BuildInfoCard(swCard, head, [], '빈칸에 채워주세요', '<strong>' + fn + '</strong> 기능의 ' + (d.mode === 'replace' ? '다른 코드를' : '코드를'));   // 기능 이름만 진하게
  }
  else if (d.mode === 'replace') _comboV2BuildInfoCard(swCard, head, [d.degs[d.target], '→', d.answerDeg], '코드로 교체해주세요');
  else _comboV2BuildInfoCard(document.getElementById('combo-v2-swap-card'), head, [], d.reverse ? '빈칸에 알맞은 도수를 채워주세요' : '빈칸에 알맞은 코드를 채워주세요');
  const btn = document.getElementById('combo-v2-submit');
  if (btn && _comboV2Type === 'swap') {
    btn.textContent = '제출하기';
    btn.classList.remove('combo-v2-submit--ok', 'combo-v2-submit--ng');
  }
  _comboV2UpdateSubmit();
}

// ── 빈칸형 문제 생성 (1-3) ──
// 코드 반주 훈련의 진행 데이터(progression-data.js)에서 "기초(no 1) · C key · 다이어토닉 3화음으로만 된 진행"을 뽑아 4코드를 전부 보여주고
// 한 칸만 비움. 정답 도수는 연결형과 같은 가중치(COMBO_V2_DEGS.w)로 고르고(진행에 든 도수끼리 경쟁), 그 도수 자리 중 하나가 빈칸.
// 같은 코드가 반복돼도(IV V I I) 전부 표시. 바로 앞 문제와 같은 진행은 피함(그 외 중복은 허용). 오답 2개는 _comboV2SwBuild가 뽑음.
const COMBO_V2_C_CHORD_DEG = { C: 'I', Dm: 'IIm', Em: 'IIIm', F: 'IV', G: 'V', Am: 'VIm', Bdim: 'VIIdim' };   // 진행 데이터(C key 표기) → 도수
const COMBO_V2_C_CHORD_DEG7 = { CM7: 'I', Dm7: 'IIm', Em7: 'IIIm', FM7: 'IV', G7: 'V', Am7: 'VIm', 'Bm7(b5)': 'VIIdim' };   // 7th 표기도 같은 도수
// 도수 기반이라 key와 roots는 보지 않음 — 레벨의 key로 옮겨 씀. 3화음 레벨은 기초(no 1)의 3화음 진행만,
// 7th 레벨(챕터 2)은 no 제한 없이 다이어토닉 3화음·7th 코드로만 된 진행 전부(출제는 전부 7th로 치환)
function _comboV2SwPool() {
  if (typeof PROGRESSION_DATA === 'undefined') return [];
  const sev = !!(_comboV2Sess.cfg && (_comboV2Sess.cfg.seventh || _comboV2Sess.cfg.func || _comboV2Sess.cfg.ch3 || _comboV2Sess.cfg.ch4 || _comboV2Sess.cfg.ch5 || _comboV2Sess.cfg.ch6 || _comboV2Sess.cfg.ch7 || _comboV2Sess.cfg.ch9));
  return PROGRESSION_DATA.filter(function (p) {
    return (sev || p.no == null || p.no === 1) && (p.mode || 'Major') === 'Major' && (p.key || 'C') === 'C' &&
      p.steps.every(function (s) { return COMBO_V2_C_CHORD_DEG[s.chord] || (sev && COMBO_V2_C_CHORD_DEG7[s.chord]); });
  });
}

// 진행 하나 뽑기(배치형·빈칸형 공용) — 바로 앞 문제와 같은 진행은 피함. 도수를 이 문제의 key 코드로 바꿔 돌려줌. 데이터가 없으면 null
function _comboV2PickProg() {
  if (_comboV2Sess.cfg.ch8) {   // 챕터 8: 내추럴 마이너 진행 목록에서(바로 앞 문제와 같은 진행은 피함)
    const s8 = _comboV2Sess;
    const list8 = COMBO_V2_CH8_PROGS.filter(function (p) { return p.join() !== s8.prevId; });
    let degs8 = _comboV2Rand(list8);
    s8.prevId = degs8.join();
    if (degs8.indexOf('Vm') >= 0 && Math.random() < COMBO_V2_CH8_V7_RATE) degs8 = degs8.map(function (d) { return d === 'Vm' ? 'V7' : d; });   // 하모닉 마이너의 V7 진행 70%, 내추럴 Vm7 진행 30%
    return { chords: degs8.map(function (d) { return s8.dia.find(function (x) { return x.deg === d; }).chord; }), degs: degs8.slice() };
  }
  const pool = _comboV2SwPool();
  if (!pool.length) return null;
  const cands = pool.filter(function (p) { return p.id !== _comboV2Sess.prevId; });
  const list = cands.length ? cands : pool;
  const prog = list[Math.floor(Math.random() * list.length)];
  _comboV2Sess.prevId = prog.id;
  const items = prog.steps.map(function (s) {
    const base = COMBO_V2_C_CHORD_DEG[s.chord] || COMBO_V2_C_CHORD_DEG7[s.chord];
    return _comboV2Sess.dia.find(function (x) { return x.base === base; });
  });
  return { chords: items.map(function (x) { return x.chord; }), degs: items.map(function (x) { return x.deg; }) };
}
function _comboV2DiaByChord(c) { return _comboV2Sess.dia.find(function (x) { return x.chord === c; }); }

// 기능 레벨의 교체형·빈칸형 — 진행(원래 3화음/7th 표기 그대로) 중 한 칸이 대상.
// 교체형: 대상 칸을 같은 기능의 다른 코드로 교체(정답 1 = 같은 기능, 오답 2 = 다른 두 기능에서 하나씩). 빈칸형: 대상 칸 기능의 코드를 채움(정답 = 원래 코드, 오답은 같은 방식)
function _comboV2FuncItem(base, use7) {
  const k = _comboV2Sess.key;
  return { base: base, func: COMBO_V2_FUNC_COL[base], chord: degreeToChordName(base, k.idx, use7, k.flat), deg: use7 ? CC_DEGREE_TRIAD[base].label7 : base };
}
function _comboV2FuncGen(mode) {
  const pool = _comboV2SwPool();
  const cands = pool.filter(function (p) { return p.id !== _comboV2Sess.prevId; });
  const list = cands.length ? cands : pool;
  const prog = list[Math.floor(Math.random() * list.length)];
  _comboV2Sess.prevId = prog.id;
  const steps = prog.steps.map(function (st) {
    const use7 = _comboV2Sess.form7;   // 진행 데이터의 원래 표기와 무관하게 이 문제의 구간(3화음/7th)으로 통일
    return { use7: use7, item: _comboV2FuncItem(COMBO_V2_C_CHORD_DEG[st.chord] || COMBO_V2_C_CHORD_DEG7[st.chord], use7) };
  });
  const t = Math.floor(Math.random() * steps.length);
  const tgt = steps[t].item;
  const all = COMBO_V2_DEGS.map(function (x) { return _comboV2FuncItem(x.deg, steps[t].use7); });   // 선택지는 대상 칸과 같은 표기(3화음/7th)
  const rand = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  const ans = mode === 'replace' ? rand(all.filter(function (x) { return x.func === tgt.func && x.base !== tgt.base; })) : tgt;
  const wrong = [0, 1, 2].filter(function (f) { return f !== tgt.func; }).map(function (f) { return rand(all.filter(function (x) { return x.func === f; })).chord; });
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: steps.map(function (x) { return x.item.chord; }),
    degs: steps.map(function (x) { return x.item.deg; }),
    target: t,
    reverse: false,
    answer: ans.chord,
    answerDeg: ans.deg,
    wrong: wrong,
    func: tgt.func,
    ch3: null,
    ch4: null,
    ch5: null,
    ch6: null,
    domRev: false,
  });
}

function _comboV2SwGen() {
  COMBO_V2_SW_DATA.ch7 = null;   // 챕터 7·9 교체형만 켬(아래 생성기가 다시 설정)
  COMBO_V2_SW_DATA.ch9 = null;
  if (_comboV2Sess.cfg.ch9) { _comboV2Ch9Swap(_comboV2Sess.swMode); return; }
  if (_comboV2Sess.cfg.ch7) { _comboV2Ch7Swap(); return; }
  if (_comboV2Sess.cfg.ch6) { _comboV2Ch6Swap(_comboV2Sess.swMode); return; }
  if (_comboV2Sess.cfg.ch5) { _comboV2Ch5Swap(_comboV2Sess.swMode); return; }
  if (_comboV2Sess.cfg.ch4) { _comboV2Ch4Swap(_comboV2Sess.swMode); return; }
  if (_comboV2Sess.cfg.ch3) { _comboV2Ch3Swap(_comboV2Sess.swMode); return; }
  if (_comboV2Sess.cfg.func) { _comboV2FuncGen(_comboV2Sess.swMode); return; }
  const q = _comboV2PickProg();
  if (!q) return;   // 데이터가 없으면 기존 목업 데이터 그대로
  const distinct = q.chords.filter(function (c, i) { return q.chords.indexOf(c) === i; }).map(_comboV2DiaByChord);
  const ans = _comboV2WeightedPick(distinct, 1)[0];
  const spots = [];
  q.chords.forEach(function (c, i) { if (c === ans.chord) spots.push(i); });
  Object.assign(COMBO_V2_SW_DATA, {
    mode: 'fill',
    chords: q.chords,
    degs: q.degs,
    target: spots[Math.floor(Math.random() * spots.length)],
    reverse: _comboV2Sess.reverse,
    answer: _comboV2Sess.reverse ? ans.deg : ans.chord,
    answerDeg: ans.deg,
    wrong: null,
    func: null,
    ch3: null,
    ch4: null,
    ch5: null,
    ch6: null,
    domRev: false,
    pool: _comboV2Sess.dia.map(function (x) { return _comboV2Sess.reverse ? x.deg : x.chord; }),   // 오답 후보 = 이 key의 다이어토닉 7화음
  });
}

// ── 배치형 문제 생성 (코드진행 레벨) — 진행 4코드를 칸으로 만들고(정답 = 코드, 아래 로마자 힌트), 코드 풀은 이 key의 다이어토닉 7개 ──
// ── 챕터 9 (모달 인터체인지) 문제 재료 ──
// 기능별 모달 인터체인지 코드(분류: 해결 bIIIM7 / 예비 IVm7·IVm6·IIm7(b5)·bIIM7·bVIM7·#IVm7(b5) / 긴장 bVII7·bVIIM7). c = 도전 레벨에서만(재즈 쪽).
// 코드는 앱의 mi_* 표(옛 모달 인터체인지 9종)로 만들고, 로마자는 트라이어드 도수(IVm7은 IVm, IVm6은 IVm6, bVII7은 bVII7, bVIIM7은 bVII)
const COMBO_V2_MI = [
  { deg: 'bIII', mkey: 'mi_bIII', f: 0 },
  { deg: 'IVm', mkey: 'mi_IVm7', f: 1 }, { deg: 'bVI', mkey: 'mi_bVI', f: 1 },
  { deg: 'bVII7', mkey: 'mi_bVII7', f: 2 }, { deg: 'bVII', mkey: 'mi_bVIIM7', f: 2 },
  { deg: 'bII', mkey: 'mi_bII', f: 1 }, { deg: 'IIdim', mkey: 'mi_IIdim', f: 1 },
  { deg: 'IVm6', mkey: 'mi_IVm6', f: 1 }, { deg: '#IVdim', mkey: 'mi_shIVdim', f: 1 },
];
const COMBO_V2_CH9_PATTERNS = [[0, 1, 2], [1, 2], [2, 0], [1, 2, 0], [0, 0], [1, 1], [2, 2]];   // 기능 패턴: 해결-예비-긴장 / 예비-긴장 / 긴장-해결 / 예비-긴장-해결 + 같은 기능 두 칸(해결-해결, 예비-예비, 긴장-긴장: 둘 중 한 칸이 모달) (순환 없이 이어진 구간만)
function _comboV2Ch9Options(f) {   // 모달 코드 9종 전부(9-1부터, 기능 f로 거르기, 생략하면 전부)
  return COMBO_V2_MI.filter(function (o) { return f == null || o.f === f; });
}
function _comboV2Ch9Chord(o) { const k = _comboV2Sess.key; return degreeToChordName(o.mkey, k.idx, true, k.flat); }
// 진행: 코드 반주 훈련 진행(다이어토닉 7th 4코드)에서 기능 패턴이 이어진 구간 안의 I·IV·V 칸을 같은 기능의 모달 코드로 1개(70%) 또는 2개(30%, 서로 다른 기능, 이웃해도 됨) 바꿈.
// 모달 코드가 전반적으로 같은 비율로 나오게: 이 레벨의 모달 코드 중 하나를 먼저 균등하게 뽑고, 그 기능의 칸이 있는 진행이 나올 때까지 진행을 다시 뽑음(기능마다 패턴에 드는 정도가 달라서 칸부터 고르면 한쪽으로 쏠림)
const COMBO_V2_CH9_SLOT_BASES = ['I', 'IIm', 'IV', 'V'];   // 바꿀 수 있는 다이어토닉 칸(IIm 예비 추가). VIm은 해결 모달 코드가 bIIIM7뿐이라 Am7 → EbM7처럼 어색해서 제외
const COMBO_V2_CH9_SLOT_ONLY = { IIm: ['IIdim', 'IVm', 'IVm6', 'bVI'] };   // IIm 칸에 쓸 수 있는 예비 모달 코드(#IVdim·bII는 Dm7과 어울리지 않아 제외)
function _comboV2Ch9SlotOk(base, o) { const only = COMBO_V2_CH9_SLOT_ONLY[base]; return !only || only.indexOf(o.deg) >= 0; }
const COMBO_V2_CH9_TWO_RATE = 0.3;   // 모달 코드를 2개 넣는 진행의 비율
function _comboV2Ch9Weights(opts) {   // 두 번째 코드까지 합쳐 모든 모달 코드가 같은 비율이 되도록 "첫 번째 코드" 가중치를 반복 보정(기능마다 코드 수가 달라 두 번째 코드가 한쪽으로 쏠리는 것을 상쇄)
  const n = opts.length;
  const cntF = {}; opts.forEach(function (o) { cntF[o.f] = (cntF[o.f] || 0) + 1; });
  const w2 = function (o) { return 1 / (n - cntF[o.f]); };   // 두 번째 코드의 선택 가중치
  const a = opts.map(function () { return 1; });
  for (let it = 0; it < 80; it++) {
    const A = a.reduce(function (x, y) { return x + y; }, 0);
    const total = opts.map(function (x, xi) {
      let t2 = 0;
      opts.forEach(function (y, yi) {
        if (y.f === x.f) return;
        const sum = opts.filter(function (o) { return o.f !== y.f; }).reduce(function (acc, o) { return acc + w2(o); }, 0);
        t2 += (a[yi] / A) * (w2(x) / sum);
      });
      return a[xi] / A + COMBO_V2_CH9_TWO_RATE * t2;
    });
    opts.forEach(function (x, xi) { a[xi] *= (1 / n) / total[xi]; });
  }
  return a;
}
const COMBO_V2_CH9_BIG_COUNTS = [0.2, 0.5, 0.3];   // 8코드 진행의 모달 코드 개수: 1개 20% / 2개 50% / 3개 30%
function _comboV2Ch9Prog() {   // IIdim처럼 놓을 자리가 드문 코드가 뽑혀 진행을 못 만들면 코드부터 다시 뽑음(그 코드는 그만큼 덜 나옴)
  for (let t = 0; t < 40; t++) { const p = _comboV2Ch9ProgTry(); if (p) return p; }
  return null;
}
function _comboV2Ch9ProgTry() {
  const s = _comboV2Sess;
  const big = !!(s.big && s.big[s.idx]);
  const opts = _comboV2Ch9Options();
  const fw = _comboV2Ch9Weights(opts);
  const first = _comboV2WeightedPick(opts.map(function (o, i) { return { o: o, w: fw[i] }; }), 1)[0].o;
  const cntF = {}; opts.forEach(function (o) { cntF[o.f] = (cntF[o.f] || 0) + 1; });
  // 나머지 모달 코드도 진행을 뽑기 전에 정해 둠(그 기능의 칸이 없으면 코드는 그대로 두고 진행만 다시 뽑음 — 코드를 다시 뽑으면 칸이 흔한 기능으로 쏠려 비율이 어긋남)
  // 4코드: 70% 1개 / 30% 2개(다른 기능). 8코드: 1~3개(둘째는 다른 기능, 셋째부터는 아무 기능이나, 코드는 서로 다르게)
  let want = 1;
  if (big) { let r = Math.random(); for (let q = 0; q < COMBO_V2_CH9_BIG_COUNTS.length; q++) { if (r < COMBO_V2_CH9_BIG_COUNTS[q]) { want = q + 1; break; } r -= COMBO_V2_CH9_BIG_COUNTS[q]; } }
  else if (Math.random() < COMBO_V2_CH9_TWO_RATE) want = 2;
  const chosen = [first];
  while (chosen.length < want) {
    const rest = opts.filter(function (o) { return chosen.indexOf(o) < 0 && (chosen.length >= 2 || o.f !== first.f); });
    if (!rest.length) break;
    chosen.push(_comboV2WeightedPick(rest.map(function (o) { return { o: o, w: 1 / (opts.length - cntF[o.f]) }; }), 1)[0].o);
  }
  let guard = 0;
  while (guard++ < 150) {
    let slots = _comboV2Ch7Base4();
    if (big) {   // 4코드를 2배로 늘려 8칸으로: 각 코드 뒤 칸은 '%'(직전 코드 반복) — 이 빈자리도 모달 코드로 바꿀 수 있음
      const e = [];
      slots.forEach(function (x) { e.push(x); e.push({ role: 'pct', chord: '%', deg: '', base: x.base, held: x }); });
      slots = e;
    }
    const fn = slots.map(function (x) { return COMBO_V2_FUNC_COL[x.base]; });
    const inWin = [];
    for (let i = 0; i < slots.length; i++) COMBO_V2_CH9_PATTERNS.forEach(function (pt) {
      if (i + pt.length <= slots.length && pt.every(function (f, j) { return fn[i + j] === f; })) for (let j = 0; j < pt.length; j++) if (inWin.indexOf(i + j) < 0) inWin.push(i + j);
    });
    const elig = inWin.filter(function (i) { return COMBO_V2_CH9_SLOT_BASES.indexOf(slots[i].base) >= 0; });   // 모달 코드로 바꿀 수 있는 칸: I·IIm·IV·V
    const use = guard < 100 ? chosen : chosen.slice(0, 1);   // 100번 안에 안 맞으면 1개만(안전장치)
    const picks = [];
    let ok = true;
    for (let q = 0; q < use.length && ok; q++) {
      const o = use[q];
      const cand = elig.filter(function (i) { return fn[i] === o.f && _comboV2Ch9SlotOk(slots[i].base, o) && !picks.some(function (m) { return m.i === i; }); });
      if (!cand.length) { ok = false; break; }
      picks.push({ i: _comboV2Rand(cand), o: o });
    }
    if (!ok) continue;
    const mods = picks.map(function (m) { return { i: m.i, o: m.o, orig: slots[m.i].role === 'pct' ? slots[m.i].held.chord : slots[m.i].chord, f: m.o.f }; });
    mods.forEach(function (m) { slots[m.i] = { role: 'special', chord: _comboV2Ch9Chord(m.o), deg: m.o.deg }; });
    // IIm7(b5)(IIdim) 뒤에 V7이 바로 이어지면(%는 건너뜀, 마지막이면 첫 칸) 마이너 ii–V = 세컨더리 도미넌트처럼 들려 모달이 아니게 됨 → 진행을 다시 뽑음
    const toV = mods.some(function (m) {
      if (m.o.deg !== 'IIdim') return false;
      for (let k = 1; k < slots.length; k++) { const x = slots[(m.i + k) % slots.length]; if (x.role === 'pct') continue; return x.role !== 'special' && x.base === 'V'; }
      return false;
    });
    if (toV) continue;
    return { slots: slots, mods: mods };
  }
  return null;
}
// 오답: 정답과 다른 기능의 모달 코드에서 기능마다 하나씩(같은 기능의 모달 코드는 다 정답 후보라 오답으로 쓰지 않음)
function _comboV2Ch9Wrong(f) {
  return [0, 1, 2].filter(function (g) { return g !== f; }).map(function (g) { return _comboV2Ch9Chord(_comboV2Rand(_comboV2Ch9Options(g))); });
}
function _comboV2Ch9Swap(mode) {
  const p = _comboV2Ch9Prog();
  const m = _comboV2Rand(p.mods);
  const chords = p.slots.map(function (x) { return x.chord; });
  const degs = p.slots.map(function (x) { return x.deg; });
  if (mode === 'replace') chords[m.i] = m.orig;   // 교체형은 바뀔 칸에 원래 다이어토닉 코드가 칩으로 보임
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: chords,
    degs: degs,
    target: m.i,
    reverse: false,
    answer: _comboV2Ch9Chord(m.o),
    answerDeg: m.o.deg,
    wrong: _comboV2Ch9Wrong(m.f),
    func: null, ch3: null, ch4: null, ch5: null, ch6: null, ch7: null, ch9: true, domRev: false,
    targetOrig: m.orig,
  });
}
// 배치형: 4칸 전부 빈칸(칸 아래 도수 힌트), 풀 = 정답 코드 + 다른 기능의 모달 코드·다이어토닉 오답, 최대 8개
function _comboV2Ch9PlaceBuild() {
  const s = _comboV2Sess;
  _comboV2PRev = false;
  const p = _comboV2Ch9Prog();
  s.playChords = p.slots.map(function (x) { return x.chord; });   // 스피커로 들려줄 정답 진행
  const wrap = document.getElementById('combo-v2-blanks');
  const answers = [];
  if (wrap) {
    wrap.querySelectorAll('.combo-v2-blank, .combo-v2-fixcell').forEach(function (el) { el.remove(); });
    wrap.classList.toggle('combo-v2-blanks--8', p.slots.length > 4);
    p.slots.forEach(function (x) {
      const el = document.createElement('div');
      if (x.role === 'pct') {   // '%'(직전 코드 반복)는 글자 고정
        el.className = 'combo-v2-fixcell';
        el.innerHTML = '<div class="combo-v2-blank-slot"><span class="combo-v2-fixed-text">%</span></div><div class="combo-v2-blank-deg is-empty"></div>';
        wrap.appendChild(el);
        return;
      }
      el.className = 'combo-v2-blank';
      el.dataset.answer = x.chord;
      answers.push(x.chord);
      el.innerHTML = '<div class="combo-v2-blank-slot"></div><div class="combo-v2-blank-deg">' + _comboV2RomanHtml(x.deg) + '</div>';
      wrap.appendChild(el);
    });
  }
  const out = [];
  answers.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
  const extra = _comboV2SwShuffle(_comboV2Ch9Options().map(_comboV2Ch9Chord).concat(s.dia.map(function (x) { return x.chord; })));
  extra.forEach(function (c) { if (out.length < 8 && out.indexOf(c) < 0) out.push(c); });
  const pool = document.getElementById('combo-v2-pool');
  if (pool) {
    pool.innerHTML = '';
    _comboV2SwShuffle(out.slice()).forEach(function (c) {
      const b = document.createElement('button');
      b.className = 'combo-v2-chip cd-card';
      b.dataset.chord = c;
      b.innerHTML = _ccFormatB5(c);
      pool.appendChild(b);
    });
  }
  _comboV2PReset();
  _comboV2PBuildCard();
}

// ── 챕터 7 (텐션코드) 문제 재료 ──
// (표기: 코드 이름은 7th지만 로마자 힌트는 I IIm IIIm IV V7 VIm — 트라이어드 도수, V만 V7)
// 도수별 사용 가능한 텐션과 출제 빈도(옛 텐션 가중치 재사용). 텐션은 항상 7th 코드에만. VIIdim은 텐션 없음. 5도는 7sus4(9)(새 퀄리티)도 한 종류로(다이어토닉 5도에서만).
const COMBO_V2_CH7_ALL = ['b9', '9', '#9', '11', '#11', 'b13', '13'];
const COMBO_V2_CH7_VALID = {
  I: { '9': 80, '13': 20 }, IIm: { '9': 50, '11': 50 }, IIIm: { '11': 100 },
  IV: { '9': 80, '13': 14, '#11': 6 }, VIm: { '9': 50, '11': 50 },
  V: { '9': 25, '13': 20, 'b9': 18, 'b13': 15, '#9': 12, '#11': 10, '7sus4(9)': 100 },   // 7sus4(9)는 실제로 자주 쓰여서 V 텐션의 약 50%
};
// 세컨더리 도미넌트(타겟 도수별)에 붙이는 텐션과 빈도 — 강의 7장 규칙: 타겟이 메이저(IV·V)면 내추럴 텐션 9·13, 마이너(IIm·IIIm·VIm)면 b9·b13.
// A7(IIm) b9·b13 / B7(IIIm) b9·b13(칸으로 뽑히는 비중 낮게) / C7(IV) 9·13 / D7(V) 9·13 / E7(VIm) b9·b13.
// AMBIG = 이론상 쓸 수 있지만 강의 규칙에서 뺀 텐션(#9, 메이저 타겟의 b9·b13, D7의 #11 등) — 정답으로도 오답으로도 내지 않음
const COMBO_V2_CH7_DOMV = {
  IIm: { 'b9': 60, 'b13': 40 }, IIIm: { 'b9': 60, 'b13': 40 }, IV: { '9': 80, '13': 20 }, V: { '9': 60, '13': 40 }, VIm: { 'b9': 60, 'b13': 40 },
};
const COMBO_V2_CH7_DOMX = { IIm: ['#9'], IIIm: ['#9'], IV: ['#9', 'b9', 'b13'], V: ['#11', 'b9', 'b13'], VIm: ['#9'] };
const COMBO_V2_CH7_DOM_SLOT_W = { IIm: 6, IIIm: 1.8, IV: 6, V: 6, VIm: 6 };   // 텐션 칸으로 뽑힐 상대 비중(B7 = IIIm은 낮게)
const COMBO_V2_CH7_V_RATE = 0.4;   // 문제 중 5도 텐션(V7 텐션·7sus4(9))으로 내려고 시도하는 비율(V → I 문맥이 있는 진행을 골라냄)
const COMBO_V2_CH7_CHALLENGE = { I: ['13'], IV: ['#11', '13'], VIm: ['11'] };   // 도전 레벨(선택 구간)에서만 나오는 텐션(재즈 쪽 확장이라 필수 구간에선 제외)
function _comboV2Ch7Allowed(base) {   // 이 레벨에서 나올 수 있는 [{t, w}]
  const ban = _comboV2Sess.cfg.challenge ? [] : (COMBO_V2_CH7_CHALLENGE[base] || []);
  return Object.keys(COMBO_V2_CH7_VALID[base]).filter(function (t) { return ban.indexOf(t) < 0; }).map(function (t) { return { t: t, w: COMBO_V2_CH7_VALID[base][t] }; });
}
function _comboV2Ch7Names(base) {   // {plain: 7th 코드(CM7·Dm7·G7), root: 5도 sus4용 루트(G), lab: 도수 라벨(I·IIm·V7)}
  const k = _comboV2Sess.key;
  return { plain: degreeToChordName(base, k.idx, true, k.flat), root: degreeToChordName(base, k.idx, false, k.flat), lab: base === 'V' ? 'V7' : base };   // 로마자는 트라이어드 표기(I IIm …), V만 V7
}
function _comboV2Ch7Chord(base, t) {   // 텐션 코드: Dm7(9) / G7(b9) / G7sus4(9)
  const n = _comboV2Ch7Names(base);
  return t === '7sus4(9)' ? n.root + t : n.plain + '(' + t + ')';
}
function _comboV2Ch7Label(base, t) { return t === '7sus4(9)' ? 'V7sus4(9)' : _comboV2Ch7Names(base).lab + '(' + t + ')'; }
// ── 챕터 7 진행: 챕터 1~6의 진행 형태를 모두 쓰고, 그중 한 칸에만 텐션을 붙인다 ──
// slots[i] = {role: 'plain'(다이어토닉 7th, base 있음) | 'special'(kind: 'dom' 도미넌트 / 'sub' 트라이톤 서브 / 'dim' dim7 대리 / 'ii' 투마이너 / 'inv' 1전위) | 'pct'('%'), chord, deg}
// 텐션 후보 칸: 다이어토닉 7th 칸, 도미넌트('dom', 세컨더리는 타겟별 텐션 표), 트라이톤 서브('sub', #11). 후보가 아닌 특수 코드는 텐션 없이 글자로 고정.
// 앞쪽 60% 문제: 4코드 진행(그냥 / 세컨더리 도미넌트 / 1전위), 뒤쪽 40% 문제: 8코드 진행(릴레이티드 투-파이브 / 투-파이브 + 대리코드)
function _comboV2Ch7Base4() {   // 다이어토닉 7th 4코드(데이터는 코드 반주 훈련 진행)
  const s = _comboV2Sess;
  const pool = _comboV2SwPool();
  const cands = pool.filter(function (p) { return p.id !== s.prevId; });
  const prog = _comboV2Rand(cands.length ? cands : pool);
  s.prevId = prog.id;
  return prog.steps.map(function (st) {
    const base = COMBO_V2_C_CHORD_DEG[st.chord] || COMBO_V2_C_CHORD_DEG7[st.chord];
    const it = s.dia.find(function (x) { return x.base === base; });
    return { role: 'plain', base: base, chord: it.chord, deg: _comboV2Ch7Names(base).lab };
  });
}
function _comboV2Ch7Small() {
  const s = _comboV2Sess;
  const slots = _comboV2Ch7Base4();
  const r = Math.random();
  if (r < 0.4) return slots;   // 그냥 7th 진행
  if (r < 0.7) {   // 세컨더리 도미넌트 1개(챕터 4 규칙: 첫 칸 제외, 타겟 = 다음 칸·마지막은 첫 칸으로 순환, VIIdim 타겟 불가)
    const ok = [1, 2, 3].filter(function (i) { return slots[(i + 1) % 4].base !== 'VIIdim'; });
    if (!ok.length) return null;
    const d = _comboV2Rand(ok);
    const tgt = slots[(d + 1) % 4].base;
    const dom = _comboV2DomItems().find(function (x) { return x.base === tgt; });
    slots[d] = { role: 'special', kind: 'dom', tgt: tgt, chord: dom.chord, deg: dom.deg };
    return slots;
  }
  // 1전위: I·IV·V 중 1~2칸(V는 V7/3 = 도미넌트 1전위)
  const k = s.key;
  const elig = _comboV2SwShuffle([0, 1, 2, 3].filter(function (i) { return COMBO_V2_CH3_DECO[slots[i].base] && _comboV2InvOk(slots[i].base, slots[(i + 1) % 4].base); }));
  if (!elig.length) return null;   // 전위를 둘 수 있는 칸이 없으면 진행을 다시 뽑음
  const n = Math.random() < 0.7 ? 1 : 2;
  elig.slice(0, n).forEach(function (i) {
    const b = slots[i].base;
    slots[i] = { role: 'special', kind: 'inv', base: b, chord: degreeToChordName(b + '/3', k.idx, true, k.flat), deg: (b === 'V' ? 'V7' : b) + '/3' };
  });
  return slots;
}
const COMBO_V2_CH7_SUB_RATE = 0.62;   // 8코드 문제 중 대리코드(트라이톤 서브·dim7) 진행 비율. 서브 비율 70%·서브 칸 가중치(w)와 함께 서브 #11이 전체 문제의 약 15%가 되게 맞춤
const COMBO_V2_CH7_SUB_SLOT_W = 80;
// 트라이톤 서브에 붙는 텐션과 빈도(리디안 도미넌트): #11이 대표, 9·13도 쓸 수 있지만 대중음악에선 드물어서 둘을 합쳐 15% 미만(10%)
const COMBO_V2_CH7_SUBV = { '#11': 90, '9': 5, '13': 5 };
function _comboV2Ch7SubList() { return Object.keys(COMBO_V2_CH7_SUBV).map(function (t) { return { t: t, w: COMBO_V2_CH7_SUBV[t] }; }); }
function _comboV2Ch7Big() {
  const sub = Math.random() < COMBO_V2_CH7_SUB_RATE;
  const p = _comboV2Ch5Prog(true, sub);   // 대리코드 진행은 챕터 6처럼 1도를 향하는 투-파이브 제외
  const slots = p.slots.map(function (x) {
    if (x.role === 'plain') { const b = p.base4[x.m].base; return { role: 'plain', base: b, chord: x.chord, deg: _comboV2Ch7Names(b).lab }; }
    if (x.role === 'pct') return { role: 'pct', chord: '%', deg: '' };
    if (x.role === 'dom') return { role: 'special', kind: 'dom', tgt: p.tgt[x.m].base, chord: x.chord, deg: x.deg };
    return { role: 'special', kind: 'ii', chord: x.chord, deg: x.deg };
  });
  if (sub) {   // 투-파이브의 도미넌트 하나를 트라이톤 서브(70%, 텐션 #11을 붙일 수 있음) 또는 3도 위 dim7(30%)로 교체(약박 칸)
    const m = _comboV2Ch5Ask(p);
    const di = p.iiSlot[m] + 1;
    const it = _comboV2Ch6Items().find(function (x) { return x.base === p.tgt[m].base; });
    slots[di] = Math.random() < 0.7 ? { role: 'special', kind: 'sub', chord: it.sub, deg: it.subDeg } : { role: 'special', kind: 'dim', chord: it.dim, deg: it.dimDeg };
  }
  return slots;
}
// 한 칸에 붙일 텐션 후보. 반환 {i, kind: 'plain'|'dom'|'sub', key(plain=도수, dom=타겟 도수)}
function _comboV2Ch7Cands(slots) {
  const out = [];
  slots.forEach(function (x, i) {
    if (x.role === 'plain') {
      if (!COMBO_V2_CH7_VALID[x.base]) return;
      if (slots.filter(function (y) { return y.base === x.base; }).length !== 1) return;   // 같은 도수가 한 번만(1전위 특수 코드와도 겹치지 않게)
      if (x.base === 'V') {   // 5도 텐션은 다음 칸이 꾸미지 않은 1도일 때만(도미넌트 → 토닉)
        let j = (i + 1) % slots.length;
        while (slots[j].role === 'pct') j = (j + 1) % slots.length;
        if (!(slots[j].role === 'plain' && slots[j].base === 'I')) return;
      }
      out.push({ i: i, kind: 'plain', key: x.base, w: x.base === 'V' ? 8 : 1 });
    } else if (x.role === 'special' && x.kind === 'dom') {
      out.push(x.tgt === 'I' ? { i: i, kind: 'plain', key: 'V', w: 8 } : { i: i, kind: 'dom', key: x.tgt, w: COMBO_V2_CH7_DOM_SLOT_W[x.tgt] });   // 1도를 향하는 도미넌트 = 그냥 5도
    } else if (x.role === 'special' && x.kind === 'sub') {
      out.push({ i: i, kind: 'sub', key: 'sub', w: COMBO_V2_CH7_SUB_SLOT_W });
    }
  });
  return out;
}
// 배치형은 텐션 칸을 여러 개 둠 — 4코드: 1개 60% / 2개 40%, 8코드: 1개 40% / 2개 40% / 3개 20%
const COMBO_V2_CH7_MULTI_SMALL = [0.6, 0.4];
const COMBO_V2_CH7_MULTI_BIG = [0.4, 0.4, 0.2];
function _comboV2Ch7Prog(multi) {
  const s = _comboV2Sess;
  const big = !!(s.big && s.big[s.idx]);
  let slots, cands, guard = 0;
  const wantV = Math.random() < COMBO_V2_CH7_V_RATE;
  do {
    slots = big ? _comboV2Ch7Big() : _comboV2Ch7Small();
    cands = slots ? _comboV2Ch7Cands(slots) : [];
  } while ((!cands.length || (wantV && !cands.some(function (x) { return x.kind === 'plain' && x.key === 'V'; }))) && ++guard < 60);   // wantV: V→I 문맥이 있는 진행을 다시 뽑아 5도 텐션 비중을 높임
  const c = _comboV2WeightedPick(cands, 1)[0];
  let list;
  if (c.kind === 'plain') list = _comboV2Ch7Allowed(c.key);
  else if (c.kind === 'dom') list = Object.keys(COMBO_V2_CH7_DOMV[c.key]).map(function (t) { return { t: t, w: COMBO_V2_CH7_DOMV[c.key][t] }; });
  else list = _comboV2Ch7SubList();
  const t =_comboV2WeightedPick(list, 1)[0].t;
  const out = { slots: slots, i: c.i, kind: c.kind, key: c.key, base: c.key, t: t };
  out.picks = [{ i: c.i, kind: c.kind, key: c.key, t: t }];
  if (multi) {   // 텐션 칸을 더 붙임(서로 다른 칸)
    const dist = big ? COMBO_V2_CH7_MULTI_BIG : COMBO_V2_CH7_MULTI_SMALL;
    let r = Math.random(), want = 1;
    for (let q = 0; q < dist.length; q++) { if (r < dist[q]) { want = q + 1; break; } r -= dist[q]; }
    let rest = cands.filter(function (x) { return x.i !== c.i; });
    while (out.picks.length < want && rest.length) {
      const c2 = _comboV2WeightedPick(rest, 1)[0];
      rest = rest.filter(function (x) { return x.i !== c2.i; });
      let l2;
      if (c2.kind === 'plain') l2 = _comboV2Ch7Allowed(c2.key);
      else if (c2.kind === 'dom') l2 = Object.keys(COMBO_V2_CH7_DOMV[c2.key]).map(function (t2) { return { t: t2, w: COMBO_V2_CH7_DOMV[c2.key][t2] }; });
      else l2 = _comboV2Ch7SubList();
      out.picks.push({ i: c2.i, kind: c2.kind, key: c2.key, t: _comboV2WeightedPick(l2, 1)[0].t });
    }
  }
  return out;
}
// 그 칸의 텐션 코드 / 도수 표기(텐션 포함, 채점 후 표시)
function _comboV2Ch7AnsChord(p) {
  const x = p.slots[p.i];
  if (p.kind === 'plain') return _comboV2Ch7Chord(p.key, p.t);   // 다이어토닉 + 1도를 향하는 도미넌트(5도)
  return x.chord + '(' + p.t + ')';
}
function _comboV2Ch7AnsLabel(p) {
  const x = p.slots[p.i];
  if (p.kind === 'plain') return _comboV2Ch7Label(p.key, p.t);
  return x.deg + '(' + p.t + ')';
}
// 사용 불가능한 텐션(같은 음이름) 2개 — 그 코드의 정석 목록에 없는 텐션(이론상 쓸 수 있는 AMBIG는 제외).
// 5도(다이어토닉)는 사용 불가가 11뿐이라 부족한 하나는 M7(9)(도미넌트 기능을 잃음)로 채움
function _comboV2Ch7Wrong(p) {
  const x = p.slots[p.i];
  let bad, plain, root;
  if (p.kind === 'plain') {
    bad = COMBO_V2_CH7_ALL.filter(function (t) { return !COMBO_V2_CH7_VALID[p.key][t]; });
    plain = _comboV2Ch7Names(p.key).plain; root = _comboV2Ch7Names(p.key).root;
  } else if (p.kind === 'dom') {
    bad = COMBO_V2_CH7_ALL.filter(function (t) { return !COMBO_V2_CH7_DOMV[p.key][t] && COMBO_V2_CH7_DOMX[p.key].indexOf(t) < 0; });
    plain = x.chord; root = x.chord.replace(/7$/, '');
  } else {
    bad = ['11', 'b13', 'b9'];   // 서브 도미넌트는 #11(·드물게 9·13)이 정답, 이 세 개를 사용 불가로
    plain = x.chord; root = x.chord.replace(/7$/, '');
  }
  const out = _comboV2SwShuffle(bad).slice(0, 2).map(function (t) { return plain + '(' + t + ')'; });
  while (out.length < 2) out.push(root + 'M7(9)');
  return out;
}
// 교체형: 진행의 한 칸(텐션 없는 7th·도미넌트·서브)을 어울리는 텐션 코드로 교체. 정답 1(사용 가능) + 오답 2(사용 불가 텐션, 같은 음이름)
function _comboV2Ch7Swap() {
  const p = _comboV2Ch7Prog();
  Object.assign(COMBO_V2_SW_DATA, {
    mode: 'replace',
    chords: p.slots.map(function (x) { return x.chord; }),
    degs: p.slots.map(function (x) { return x.deg; }),
    target: p.i,
    reverse: false,
    answer: _comboV2Ch7AnsChord(p),
    answerDeg: _comboV2Ch7AnsLabel(p),
    wrong: _comboV2Ch7Wrong(p),
    func: null, ch3: null, ch4: null, ch5: null, ch6: null, ch7: true, domRev: false,
  });
}
// 배치형: 다이어토닉 7th 칸과 텐션을 붙이는 칸만 빈칸(칸 아래는 텐션 없는 도수 — 힌트가 되지 않게), 나머지 특수 코드('%'·투마이너·dim7 등)는 글자 고정, 텐션은 1곳.
// 풀에는 그 텐션 코드 하나와 사용 불가 텐션 오답만 두고, 같은 루트의 다른 사용 가능 텐션(Dm7(9) vs Dm7(11))이나 텐션 없는 같은 코드(Dm7)는 넣지 않아 정답이 하나가 되게 함
function _comboV2Ch7PlaceBuild() {
  const s = _comboV2Sess;
  _comboV2PRev = false;
  const p = _comboV2Ch7Prog(true);
  const ansAt = {};   // 칸 index → 텐션 정답 코드
  p.picks.forEach(function (pk) { ansAt[pk.i] = _comboV2Ch7AnsChord({ slots: p.slots, i: pk.i, kind: pk.kind, key: pk.key, t: pk.t }); });
  s.playChords = p.slots.map(function (x, i) { return ansAt[i] != null ? ansAt[i] : x.chord; });   // 스피커로 들려줄 정답 진행
  const wrap = document.getElementById('combo-v2-blanks');
  const answers = [];
  if (wrap) {
    wrap.querySelectorAll('.combo-v2-blank, .combo-v2-fixcell').forEach(function (el) { el.remove(); });
    wrap.classList.toggle('combo-v2-blanks--8', p.slots.length > 4);
    p.slots.forEach(function (x, i) {
      const isBlank = x.role === 'plain' || ansAt[i] != null;
      const chord = ansAt[i] != null ? ansAt[i] : x.chord;
      const el = document.createElement('div');
      el.className = isBlank ? 'combo-v2-blank' : 'combo-v2-fixcell';
      if (isBlank) { el.dataset.answer = chord; answers.push(chord); }
      el.innerHTML = '<div class="combo-v2-blank-slot">' + (isBlank ? '' : '<span class="combo-v2-fixed-text">' + (x.chord === '%' ? '%' : _ccFormatB5(x.chord)) + '</span>') + '</div>' +
        '<div class="combo-v2-blank-deg' + (x.deg ? '' : ' is-empty') + '">' + (x.deg ? _comboV2RomanHtml(x.deg) : '') + '</div>';
      wrap.appendChild(el);
    });
  }
  const askedPlain = p.picks.map(function (pk) { return p.slots[pk.i].chord; });   // 텐션이 붙는 칸의 원래(텐션 없는) 코드는 풀에 넣지 않음
  const out = [];
  answers.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
  const wrongs = [];   // 텐션 칸마다 사용 불가 텐션 오답 1개씩
  p.picks.forEach(function (pk) { wrongs.push(_comboV2Ch7Wrong({ slots: p.slots, i: pk.i, kind: pk.kind, key: pk.key })[0]); });
  const extra = wrongs.concat(_comboV2SwShuffle(s.dia.map(function (x) { return x.chord; }).filter(function (c) { return askedPlain.indexOf(c) < 0 && answers.indexOf(c) < 0; })));
  extra.forEach(function (c) { if (out.length < 8 && out.indexOf(c) < 0) out.push(c); });
  const pool = document.getElementById('combo-v2-pool');
  if (pool) {
    pool.innerHTML = '';
    _comboV2SwShuffle(out.slice()).forEach(function (c) {
      const b = document.createElement('button');
      b.className = 'combo-v2-chip cd-card';
      b.dataset.chord = c;
      b.innerHTML = _ccFormatB5(c);
      pool.appendChild(b);
    });
  }
  _comboV2PReset();
  _comboV2PBuildCard();
}

// ── 챕터 6 (도미넌트의 대리코드) 문제 재료 ──
// 도미넌트 6종(COMBO_V2_DOMS와 같은 순서)마다: 3도 위 dim7(항상 # 표기, 도수는 그 key의 1도 기준 절대 도수 #Idim7 등), 1전위, 트라이톤 대리 도미넌트(타겟 +1반음, 항상 b 표기, 앱 표준대로 7(#11))
// m7b5Lab: 3도 위 m7(b5)는 타겟이 메이저(I·IV·V)일 때만 대리코드로 쓰임(마이너 타겟은 dim7만) — 루트는 dim7과 같음
const COMBO_V2_SUBS = [
  { dimOff: 11, dimLab: 'VIIdim7', m7b5Lab: 'VIIm7(b5)', inv: 'V/3',    subOff: 1,  subLab: 'Sub.V7' },
  { dimOff: 1,  dimLab: '#Idim7',  inv: 'VI7/3',  subOff: 3,  subLab: 'Sub.V7/II' },
  { dimOff: 3,  dimLab: '#IIdim7', inv: 'VII7/3', subOff: 5,  subLab: 'Sub.V7/III' },
  { dimOff: 4,  dimLab: 'IIIdim7', m7b5Lab: 'IIIm7(b5)', inv: 'I7/3',   subOff: 6,  subLab: 'Sub.V7/IV' },
  { dimOff: 6,  dimLab: '#IVdim7', m7b5Lab: '#IVm7(b5)', inv: 'II7/3',  subOff: 8,  subLab: 'Sub.V7/V' },
  { dimOff: 8,  dimLab: '#Vdim7',  inv: 'III7/3', subOff: 10, subLab: 'Sub.V7/VI' },
];
const COMBO_V2_CH6_M7B5_RATE = 0.5;   // 타겟이 메이저일 때 3도 위 코드(dim7 계열)가 m7(b5)로 나오는 비율 — 나머지는 dim7
function _comboV2Ch6Items() {   // dim7은 대칭(C#dim7 = Edim7 …)이라 루트 반음 % 3이 같은 도미넌트끼리는 같은 코드 → group
  const k = _comboV2Sess.key;
  return COMBO_V2_DOMS.map(function (x, i) {
    const sb = COMBO_V2_SUBS[i];
    return {
      base: x.tgt, id: x.tgt, w: 1,
      dom: degreeToChordName(x.dom, k.idx, true, k.flat), domDeg: x.label,
      inv: degreeToChordName(sb.inv, k.idx, true, k.flat),
      dim: CC_KEY_NAMES_SHARP[(k.idx + sb.dimOff) % 12] + 'dim7', dimDeg: sb.dimLab,
      sub: CC_KEY_NAMES_FLAT[(k.idx + sb.subOff) % 12] + '7', subDeg: sb.subLab,   // 챕터 6은 텐션 없이(Db7). (#11)은 챕터 7에서 텐션으로 붙임
      m7b5: sb.m7b5Lab ? CC_KEY_NAMES_SHARP[(k.idx + sb.dimOff) % 12] + 'm7(b5)' : null, m7b5Deg: sb.m7b5Lab || null,   // 타겟이 메이저일 때만
      group: ((k.idx + sb.dimOff) % 12) % 3,
    };
  });
}
// 오답 2개 — 다른 도미넌트의 대리코드. 정답과 같은 코드가 될 수 있는 것(같은 도미넌트의 다른 대리코드, 같은 묶음 dim7)은 제외해 정답이 하나가 되게 함
function _comboV2Ch6Wrong(it) {
  const cand = [];
  _comboV2Ch6Items().forEach(function (x) {
    if (x.base === it.base) return;
    cand.push({ chord: x.sub });
    if (x.group !== it.group) cand.push({ chord: x.dim, group: x.group });
    if (x.m7b5) cand.push({ chord: x.m7b5 });   // m7(b5)가 정답일 때 그 하나만 m7(b5)로 튀지 않게 오답 후보에도 섞음
  });
  const out = [], usedG = {};   // 오답끼리도 같은 코드(같은 묶음 dim7)가 두 개 나오지 않게
  _comboV2SwShuffle(cand).forEach(function (c) {
    if (out.length >= 2 || (c.group != null && usedG[c.group])) return;
    if (c.group != null) usedG[c.group] = true;
    out.push(c.chord);
  });
  return out;
}
// 진행 하나 — 항상 8코드 진행(챕터 5의 투-파이브 진행). 대리코드는 한 마디를 온전히 쓰면 어색해서 짧게 건너가는 약박(반 마디의 뒤쪽 칸 = 짝수 번째 칸 2·4·6·8)에만 오며,
// 투-파이브의 도미넌트 칸이 바로 그 자리다(iiSlot + 1). 돌려주는 slots[i] = {chord, deg, role}, domSlot = 교체·질문 대상 도미넌트 칸
function _comboV2Ch6Prog() {
  let p, guard = 0;
  do {   // 1도를 향하는 투-파이브(ii–V–I)는 그냥 다이어토닉 진행이라 제외 — 후보가 하나도 없어 안전장치로 1도가 뽑히면 진행을 다시 뽑음
    p = _comboV2Ch5Prog(true, true);
  } while (p.M.some(function (i) { return p.tgt[i].base === 'I' || (i === 3 && p.tgt[i].base !== p.base4[0].base); }) && ++guard < 30);
  const m = _comboV2Ch5Ask(p);
  const targetSlots = p.M.map(function (i) { return i < 3 ? 2 * (i + 1) : 0; });   // 각 투-파이브의 타겟 칸(다음 마디, 마지막 마디는 첫 칸으로 순환)
  return { slots: p.slots, domSlot: p.iiSlot[m] + 1, base: p.tgt[m].base, big: true, targetSlots: targetSlots };
}
function _comboV2Ch6Answer(it, slots) {   // 대리코드 한 가지(3도 위 코드 / 트라이톤 서브)를 반반으로. 3도 위 코드는 타겟이 메이저면 dim7 / m7(b5) 둘 다 나옴
  if (Math.random() >= 0.5) return { chord: it.sub, deg: it.subDeg };
  const dupM7b5 = it.m7b5 && slots && slots.some(function (x) { return x.chord === it.m7b5; });   // 같은 진행에 이미 있는 코드(투마이너 등)와 겹치면 dim7로
  if (it.m7b5 && !dupM7b5 && Math.random() < COMBO_V2_CH6_M7B5_RATE) return { chord: it.m7b5, deg: it.m7b5Deg };
  return { chord: it.dim, deg: it.dimDeg };
}
// 교체형: 진행의 도미넌트 칸을 대리코드로 교체 / 빈칸형: 그 칸을 비우고 대리코드 표기(Sub.V7/II, #Idim7)를 보고 코드를 채움. 정답 1 + 오답 2
function _comboV2Ch6Swap(mode) {
  const p = _comboV2Ch6Prog();
  const it = _comboV2Ch6Items().find(function (x) { return x.base === p.base; });
  const ans = _comboV2Ch6Answer(it, p.slots);
  const chords = p.slots.map(function (x) { return x.chord; });
  const degs = p.slots.map(function (x) { return x.deg; });
  if (mode === 'fill') { chords[p.domSlot] = ans.chord; degs[p.domSlot] = ans.deg; }
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: chords,
    degs: degs,
    target: p.domSlot,
    reverse: false,
    answer: ans.chord,
    answerDeg: ans.deg,
    wrong: _comboV2Ch6Wrong(it),
    func: null,
    ch3: null,
    ch4: null,
    ch5: null,
    ch6: true,
    domRev: false,
  });
}
// 배치형: 대리코드 1개만 쓴 8코드 진행을 미리 계산. '%'와 타겟 코드(미리 표시해 길을 찾기 쉽게)를 뺀 모든 칸이 빈칸(문제 후반부에 나옴)
function _comboV2Ch6PlaceBuild() {
  const s = _comboV2Sess;
  _comboV2PRev = false;
  const p = _comboV2Ch6Prog();
  const items = _comboV2Ch6Items();
  const it = items.find(function (x) { return x.base === p.base; });
  const ans = _comboV2Ch6Answer(it, p.slots);
  const slots = p.slots.map(function (x, i) { return i === p.domSlot ? { chord: ans.chord, deg: ans.deg, role: 'dom' } : x; });
  s.playChords = slots.map(function (x) { return x.chord; });   // 스피커로 들려줄 정답 진행
  const wrap = document.getElementById('combo-v2-blanks');
  const answers = [];
  if (wrap) {
    wrap.querySelectorAll('.combo-v2-blank, .combo-v2-fixcell').forEach(function (el) { el.remove(); });
    wrap.classList.toggle('combo-v2-blanks--8', slots.length > 4);
    slots.forEach(function (x, i) {
      const isBlank = x.role !== 'pct' && p.targetSlots.indexOf(i) < 0;   // '%'와 타겟 코드(미리 표시)를 뺀 모든 칸을 배치
      const el = document.createElement('div');
      el.className = isBlank ? 'combo-v2-blank' : 'combo-v2-fixcell';
      if (isBlank) { el.dataset.answer = x.chord; answers.push(x.chord); }
      el.innerHTML = '<div class="combo-v2-blank-slot">' + (isBlank ? '' : '<span class="combo-v2-fixed-text">' + (x.chord === '%' ? '%' : _ccFormatB5(x.chord)) + '</span>') + '</div>' +
        '<div class="combo-v2-blank-deg' + (x.deg ? '' : ' is-empty') + '">' + (x.deg ? _comboV2RomanHtml(x.deg) : '') + '</div>';
      wrap.appendChild(el);
    });
  }
  const all = [];
  s.dia.forEach(function (x) { all.push({ chord: x.chord }); });
  items.forEach(function (x) { all.push({ chord: x.dom }); all.push({ chord: x.dim }); all.push({ chord: x.sub }); if (x.m7b5) all.push({ chord: x.m7b5 }); });
  _comboV2Ch5Items().forEach(function (x) { all.push({ chord: x.chord }); });   // 투마이너(Rel.IIm →)도 빈칸의 정답이 됨
  answers.forEach(function (c) { all.push({ chord: c }); });   // 안전장치: 정답은 무엇이든 반드시 풀에 있어야 함
  const seen = {};
  const uniq = all.filter(function (x) { if (seen[x.chord]) return false; seen[x.chord] = true; return true; });
  const out = uniq.filter(function (x) { return answers.indexOf(x.chord) >= 0; });
  _comboV2SwShuffle(uniq.filter(function (x) { return answers.indexOf(x.chord) < 0; })).forEach(function (x) { if (out.length < 8) out.push(x); });
  const pool = document.getElementById('combo-v2-pool');
  if (pool) {
    pool.innerHTML = '';
    uniq.filter(function (x) { return out.some(function (o) { return o.chord === x.chord; }); }).forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'combo-v2-chip cd-card';
      b.dataset.chord = x.chord;
      b.innerHTML = _ccFormatB5(x.chord);
      pool.appendChild(b);
    });
  }
  _comboV2PReset();
  _comboV2PBuildCard();
}

// ── 챕터 5 (릴레이티드 투-마이너) 문제 재료 ──
// 투마이너 = 도미넌트 루트의 완전5도 위(= 타겟의 2도). 타겟이 메이저(I·IV·V)면 m7, 마이너(IIm·IIIm·VIm)면 m7(b5). 프라이머리(타겟 I)는 다이어토닉 IIm7
const COMBO_V2_RII = { I: 'IIm', IIm: 'RII_VI7', IIIm: 'RII_VII7', IV: 'RII_I7', V: 'RII_II7', VIm: 'RII_III7' };   // 타겟 도수 → 투마이너 코드 키
const COMBO_V2_RII_W = { I: 2, IIm: 3, IIIm: 1, IV: 5, V: 2, VIm: 7 };   // 투마이너 출제 빈도(타겟 도수별): C key Dm7 2 · Em7(b5) 3 · F#m7(b5) 1 · Gm7 5 · Am7 2 · Bm7(b5) 7
const COMBO_V2_RII_LABEL = { I: 'Rel.IIm→', IIm: 'Rel.IIm→', IIIm: 'Rel.IIm→', IV: 'Rel.IIm→', V: 'Rel.IIm→', VIm: 'Rel.IIm→' };   // 릴레이티드 투마이너는 정석 로마자 표기가 없어 자체 표기 'Rel.IIm →'(뒤의 도미넌트로 이어진다는 느낌). 타겟은 도미넌트 라벨(V7/II)이 알려 줌
function _comboV2Ch5Items() {   // [{base(타겟 도수), chord(투마이너), dom(도미넌트), tchord(타겟 코드), deg(투마이너 라벨), domDeg(도미넌트 라벨), w}]
  const k = _comboV2Sess.key;
  return COMBO_V2_DOMS.map(function (x) {
    return {
      base: x.tgt, id: x.tgt, w: COMBO_V2_RII_W[x.tgt],
      chord: degreeToChordName(COMBO_V2_RII[x.tgt], k.idx, true, k.flat),
      dom: degreeToChordName(x.dom, k.idx, true, k.flat),
      tchord: degreeToChordName(x.tgt, k.idx, false, k.flat),
      deg: COMBO_V2_RII_LABEL[x.tgt], domDeg: x.label,
    };
  });
}
// 8코드 진행(챕터 5) — 4코드 진행을 두 배로 늘려 반 마디씩(같은 코드는 '%'), 일부 마디를 투-파이브(투마이너 + 도미넌트)로 바꿈.
// 투-파이브는 1~2개: 첫 마디는 제외, 타겟 = 바로 다음 마디 코드(투-파이브끼리 이웃하지 않음). 마지막 마디는 타겟이 첫 코드로 순환하거나(50%) 진행에 없는 코드여도 됨(챕터 5 허용). VIIdim은 타겟 불가
// 마지막 칸 투-파이브의 타겟 — 항상 첫 코드로 순환(진행에 없는 코드는 쓰지 않음). 첫 코드가 VIIdim이면 후보 없음. [{b, w}]
function _comboV2Ch5LastTargets(base4, validBases, wOf) {
  const first = base4[0].base;
  return validBases.indexOf(first) >= 0 ? [{ b: first, w: wOf(first) }] : [];
}
function _comboV2Ch5Prog(forceBig, noPrimary) {   // forceBig: 챕터 6처럼 항상 8코드 진행이 필요할 때 / noPrimary: 1도(프라이머리)를 향하는 투-파이브 제외
  const s = _comboV2Sess;
  const pool = _comboV2SwPool();
  const cands = pool.filter(function (p) { return p.id !== s.prevId; });
  const prog = _comboV2Rand(cands.length ? cands : pool);
  s.prevId = prog.id;
  const base4 = prog.steps.map(function (st) {
    const base = COMBO_V2_C_CHORD_DEG[st.chord] || COMBO_V2_C_CHORD_DEG7[st.chord];
    const it = s.dia.find(function (x) { return x.base === base; });
    return { base: base, chord: it.chord, deg: it.deg };
  });
  const items = _comboV2Ch5Items();
  const validBases = items.map(function (x) { return x.base; }).filter(function (b) { return !(noPrimary && b === 'I'); });
  const ok = function (b) { return validBases.indexOf(b) >= 0; };
  if (!(forceBig || (s.big && s.big[s.idx]))) {   // 4코드 진행: 투-파이브 1개가 두 칸(투마이너 + 도미넌트)을 차지, 타겟 = 그 다음 칸. 앞 칸 j=0,1,2 (마지막 j=2는 타겟이 첫 코드로 순환하거나 진행에 없는 코드)
    const wOf = function (b) { return COMBO_V2_RII_W[b]; };
    const cand = [];   // 후보 = (앞 칸 j, 타겟) — 가중치는 타겟 투마이너의 출제 빈도
    [0, 1].forEach(function (j) { if (ok(base4[j + 2].base)) cand.push({ j: j, b: base4[j + 2].base, w: wOf(base4[j + 2].base) }); });
    _comboV2Ch5LastTargets(base4, validBases, wOf).forEach(function (x) { cand.push({ j: 2, b: x.b, w: x.w }); });
    if (!cand.length) cand.push({ j: 2, b: validBases[0], w: 1 });   // (거의 없는 경우) 후보가 하나도 없을 때의 안전장치
    const pickC = _comboV2WeightedPick(cand, 1)[0];
    const j = pickC.j;
    const it = items.find(function (x) { return x.base === pickC.b; });
    const slots4 = base4.map(function (c, k) {
      if (k === j) return { chord: it.chord, deg: it.deg, role: 'ii', m: j };
      if (k === j + 1) return { chord: it.dom, deg: it.domDeg, role: 'dom', m: j };
      return { chord: c.chord, deg: c.deg, role: 'plain', m: k };
    });
    const t4 = {}; t4[j] = it;
    const iiSlot4 = {}; iiSlot4[j] = j;
    return { slots: slots4, M: [j], tgt: t4, base4: base4, iiSlot: iiSlot4 };
  }
  const wOf = function (b) { return COMBO_V2_RII_W[b]; };
  const lastT = _comboV2Ch5LastTargets(base4, validBases, wOf);
  let M, b3;
  if (Math.random() < 0.3 && ok(base4[2].base) && lastT.length) { M = [1, 3]; b3 = lastT[0].b; }
  else {   // 한 개: 마디 2·3·4 중 하나(후보 가중치 = 타겟 투마이너 출제 빈도)
    const cand = [];
    [1, 2].forEach(function (i) { if (ok(base4[i + 1].base)) cand.push({ i: i, b: base4[i + 1].base, w: wOf(base4[i + 1].base) }); });
    lastT.forEach(function (x) { cand.push({ i: 3, b: x.b, w: x.w }); });
    if (!cand.length) cand.push({ i: 3, b: validBases[0], w: 1 });   // 안전장치
    const c = _comboV2WeightedPick(cand, 1)[0];
    M = [c.i];
    b3 = c.b;
  }
  const tgt = {};
  M.forEach(function (i) {
    const b = i < 3 ? base4[i + 1].base : b3;
    tgt[i] = items.find(function (x) { return x.base === b; });
  });
  const slots = [];
  base4.forEach(function (c, m) {
    if (tgt[m]) { slots.push({ chord: tgt[m].chord, deg: tgt[m].deg, role: 'ii', m: m }); slots.push({ chord: tgt[m].dom, deg: tgt[m].domDeg, role: 'dom', m: m }); }
    else { slots.push({ chord: c.chord, deg: c.deg, role: 'plain', m: m }); slots.push({ chord: '%', deg: '', role: 'pct', m: m }); }
  });
  const iiSlot = {};
  M.forEach(function (i) { iiSlot[i] = i * 2; });
  return { slots: slots, M: M, tgt: tgt, base4: base4, iiSlot: iiSlot };
}
function _comboV2Ch5Ask(p) {   // 투-파이브가 2개인 진행에서 묻는 쪽 — 타겟 투마이너 출제 빈도로
  return _comboV2WeightedPick(p.M.map(function (m) { return { m: m, w: p.tgt[m].w }; }), 1)[0].m;
}
// 교체형: 도미넌트 앞 칸을 그 도미넌트의 투마이너로 교체 / 빈칸형: 투마이너를 채움(힌트 Rel.IIm→). 정답 1 + 오답 2(다른 투마이너). 도수 찾기(반대) 문제는 챕터 5에 없음
function _comboV2Ch5Swap(mode) {
  const s = _comboV2Sess;
  const p = _comboV2Ch5Prog();
  const m = _comboV2Ch5Ask(p);
  const a = p.iiSlot[m];
  const it = p.tgt[m];
  const wrongItems = _comboV2SwShuffle(_comboV2Ch5Items().filter(function (x) { return x.base !== it.base; })).slice(0, 2);
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: p.slots.map(function (x, i) { return mode === 'replace' && i === a ? p.base4[m].chord : x.chord; }),   // 교체형은 바뀔 칸에 원래 코드가 칩으로 보임
    degs: p.slots.map(function (x) { return x.deg; }),
    target: a,
    reverse: false,
    answer: it.chord,
    answerDeg: it.deg,
    wrong: wrongItems.map(function (x) { return x.chord; }),
    func: null,
    ch3: null,
    ch4: null,
    ch5: true,
    ch6: null,
    domRev: false,
    domChord: it.dom,
  });
}
// 배치형: 빈칸은 물어보는 투마이너 1개뿐, 나머지('%'·다이어토닉 코드·도미넌트·묻지 않는 투-파이브)는 글자로 고정(도미넌트는 묻지 않음)
function _comboV2Ch5PlaceBuild() {
  const s = _comboV2Sess;
  _comboV2PRev = false;
  const p = _comboV2Ch5Prog();
  const asked = _comboV2Ch5Ask(p);
  s.playChords = p.slots.map(function (x) { return x.chord; });   // 스피커로 들려줄 정답 진행('%' 포함)
  const wrap = document.getElementById('combo-v2-blanks');
  const answers = [];
  if (wrap) {
    wrap.querySelectorAll('.combo-v2-blank, .combo-v2-fixcell').forEach(function (el) { el.remove(); });
    wrap.classList.toggle('combo-v2-blanks--8', p.slots.length > 4);
    p.slots.forEach(function (x) {
      const isBlank = x.role === 'ii' && x.m === asked;   // 빈칸은 물어보는 투마이너 1개뿐
      const el = document.createElement('div');
      el.className = isBlank ? 'combo-v2-blank' : 'combo-v2-fixcell';
      if (isBlank) { el.dataset.answer = x.chord; answers.push(x.chord); }
      el.innerHTML = '<div class="combo-v2-blank-slot">' + (isBlank ? '' : '<span class="combo-v2-fixed-text">' + (x.chord === '%' ? '%' : _ccFormatB5(x.chord)) + '</span>') + '</div>' +
        '<div class="combo-v2-blank-deg' + (x.deg ? '' : ' is-empty') + '">' + (x.deg ? _comboV2RomanHtml(x.deg) : '') + '</div>';
      wrap.appendChild(el);
    });
  }
  const all = s.dia.concat(_comboV2Ch5Items().map(function (x) { return { chord: x.chord, deg: x.deg }; }));
  const out = all.filter(function (x) { return answers.indexOf(x.chord) >= 0; });
  _comboV2SwShuffle(all.filter(function (x) { return answers.indexOf(x.chord) < 0; })).forEach(function (x) { if (out.length < 8) out.push(x); });
  const pool = document.getElementById('combo-v2-pool');
  if (pool) {
    pool.innerHTML = '';
    all.filter(function (x) { return out.some(function (o) { return o.chord === x.chord; }); }).forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'combo-v2-chip cd-card';
      b.dataset.chord = x.chord;
      b.innerHTML = _ccFormatB5(x.chord);
      pool.appendChild(b);
    });
  }
  _comboV2PReset();
  _comboV2PBuildCard();
}

// ── 챕터 4 (세컨더리 도미넌트) 문제 재료 ──
// 도미넌트 6종: 타겟 도수 → 그 타겟의 도미넌트(프라이머리 V7 = 타겟 I, 세컨더리 V7/II~V7/VI). 코드 이름은 degreeToChordName이 만듦(VI7=A7 등)
const COMBO_V2_DOMS = [
  { tgt: 'I', dom: 'V', label: 'V7' }, { tgt: 'IIm', dom: 'VI7', label: 'V7/II' }, { tgt: 'IIIm', dom: 'VII7', label: 'V7/III' },
  { tgt: 'IV', dom: 'I7', label: 'V7/IV' }, { tgt: 'V', dom: 'II7', label: 'V7/V' }, { tgt: 'VIm', dom: 'III7', label: 'V7/VI' },
];
function _comboV2DomItems() {   // 이 key의 도미넌트 항목 [{base(타겟 도수), chord(도미넌트), tchord(타겟 코드), deg(V7/II 등), w}]
  const k = _comboV2Sess.key;
  return COMBO_V2_DOMS.map(function (x) {
    return { base: x.tgt, w: 1, chord: degreeToChordName(x.dom, k.idx, true, k.flat), tchord: degreeToChordName(x.tgt, k.idx, false, k.flat), deg: x.label };
  });
}
// 진행 하나 뽑기(챕터 4) — 다이어토닉 3화음 진행. withDom이면 한 칸을 도미넌트로 바꿈:
// 도미넌트는 진행에서 딱 1개, 첫 칸은 제외, 그 칸의 도미넌트는 바로 뒤 칸이 타겟(마지막 칸이면 첫 칸으로 순환). VIIdim은 타겟이 될 수 없음
function _comboV2Ch4Prog(withDom) {
  const s = _comboV2Sess;
  const pool = _comboV2SwPool();
  const cands = pool.filter(function (p) { return p.id !== s.prevId; });
  const prog = _comboV2Rand(cands.length ? cands : pool);
  s.prevId = prog.id;
  const steps = prog.steps.map(function (st) {
    const base = COMBO_V2_C_CHORD_DEG[st.chord] || COMBO_V2_C_CHORD_DEG7[st.chord];
    const it = s.dia.find(function (x) { return x.base === base; });
    return { base: base, chord: it.chord, deg: it.deg };
  });
  const n = steps.length;
  const ok = steps.map(function (x, i) { return i; }).filter(function (i) { return i >= 1 && steps[(i + 1) % n].base !== 'VIIdim'; });
  const d = _comboV2Rand(ok);
  const dom = _comboV2DomItems().find(function (x) { return x.base === steps[(d + 1) % n].base; });
  const orig = steps[d];
  if (withDom) steps[d] = { base: 'DOM', chord: dom.chord, deg: dom.deg };
  return { steps: steps, d: d, dom: dom, orig: orig, target: steps[(d + 1) % n] };
}
// 챕터 4 배치형 코드 풀(최대 8개) — 정답에 쓰인 코드 + 나머지는 다이어토닉 7화음·도미넌트 6종에서 채움
function _comboV2Ch4Pool(steps) {
  const all = _comboV2Sess.dia.concat(_comboV2DomItems());
  const used = steps.map(function (x) { return x.chord; });
  const out = all.filter(function (x) { return used.indexOf(x.chord) >= 0; });
  _comboV2SwShuffle(all.filter(function (x) { return used.indexOf(x.chord) < 0; })).forEach(function (x) { if (out.length < 8) out.push(x); });
  return all.filter(function (x) { return out.some(function (o) { return o.chord === x.chord; }); });
}
// 교체형: 한 칸을 바로 뒤 타겟을 향하는 도미넌트로 교체(정답 1 + 오답 2 = 다른 도미넌트). 빈칸형: 도미넌트 칸을 비움(도수 힌트 V7/II → 코드). 반대 빈칸형: 코드를 보고 도수를 고름
function _comboV2Ch4Swap(mode) {
  const s = _comboV2Sess;
  const doms = _comboV2DomItems();
  const p = _comboV2Ch4Prog(mode === 'fill');
  const ans = p.dom;
  const wrongItems = _comboV2SwShuffle(doms.filter(function (x) { return x !== ans && x.chord !== ans.chord; })).slice(0, 2);
  const rv = mode === 'fill' && s.reverse;
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: p.steps.map(function (x) { return x.chord; }),
    degs: p.steps.map(function (x) { return x.deg; }),
    target: p.d,
    reverse: rv,
    answer: rv ? ans.deg : ans.chord,
    answerDeg: ans.deg,
    wrong: wrongItems.map(function (x) { return rv ? x.deg : x.chord; }),
    func: null,
    ch3: null,
    ch4: true,
    ch5: null,
    ch6: null,
    domRev: rv,
    targetChord: p.target.chord,
  });
}

// ── 챕터 3 (코드 꾸미기) 문제 재료 ──
// 항목 = { base(3화음 도수), variant('root'|'inv'|'add9'|'sus2'|'sus4'), func(해결0/예비1/긴장2), w, chord, deg }. 전위는 1전위(베이스 3음)만, 꾸밈은 3화음에만(7th 없음)
// 이 key에서 소리가 나는 꾸밈 변형만 — 보이싱 후보가 없거나 모두 COMBO_V2_CH3_MAX_FRET보다 높으면 제외(add9가 빠지면 sus2·sus4로 출제됨)
// 1전위 규칙: 전위코드의 목적은 다음 코드의 근음을 부드럽게 잇는 것 → 전위 베이스(3음)와 다음 코드 근음이 2반음 이내여야 함(마지막 칸의 다음은 첫 칸).
// 1전위의 베이스 음(으뜸음 기준 반음): I/3 = 3음 E(4), IV/3 = A(9), V/3 = B(11)
const COMBO_V2_INV_BASS = { I: 4, IV: 9, V: 11 };
function _comboV2InvOk(base, nextBase) {
  const nx = CC_DEGREE_TRIAD[nextBase];
  if (!nx || COMBO_V2_INV_BASS[base] == null) return false;
  const d = Math.abs(COMBO_V2_INV_BASS[base] - nx.offset) % 12;
  return Math.min(d, 12 - d) <= 2;
}
const COMBO_V2_CH3_MAX_FRET = 7;
const COMBO_V2_CH3_OFFSET = { I: 0, IV: 5, V: 7 };
function _comboV2Ch3Decos(base) {
  const k = _comboV2Sess.key;
  return COMBO_V2_CH3_DECO[base].filter(function (v) {
    if (typeof ProgressionVoicings === 'undefined') return true;
    return ProgressionVoicings.getCandidates((k.idx + COMBO_V2_CH3_OFFSET[base]) % 12, v, k.idx).some(function (c) { return c.fretNumber <= COMBO_V2_CH3_MAX_FRET; });
  });
}
function _comboV2Ch3Item(base, variant, f7) {
  const k = _comboV2Sess.key, d0 = COMBO_V2_DEGS.find(function (x) { return x.deg === base; });
  const it = { base: base, variant: variant, w: d0.w, only3: d0.only3, func: COMBO_V2_FUNC_COL[base] };
  const lab = f7 ? CC_DEGREE_TRIAD[base].label7 : base;
  if (variant === 'root') { it.chord = degreeToChordName(base, k.idx, f7, k.flat); it.deg = lab; }
  else if (variant === 'inv') { it.chord = degreeToChordName(base + '/3', k.idx, f7, k.flat); it.deg = lab + '/3'; }   // IM7/3
  else { it.chord = degreeToChordName(base, k.idx, false, k.flat) + variant; it.deg = base + variant; }              // Iadd9
  return it;
}
function _comboV2Ch3Sets() {
  const s = _comboV2Sess;
  const theme = [];
  if (s.theme === 'deco') Object.keys(COMBO_V2_CH3_DECO).forEach(function (b) { _comboV2Ch3Decos(b).forEach(function (v) { theme.push(_comboV2Ch3Item(b, v, false)); }); });
  else ['I', 'IV', 'V'].forEach(function (b) { theme.push(_comboV2Ch3Item(b, 'inv', s.form7)); });
  return { roots: s.dia, theme: theme, all: s.dia.concat(theme) };
}
function _comboV2Rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
// 꾸밈 가능한 변형 — 1도 sus4는 바로 뒤가 (꾸미지 않은) 1도일 때만("Csus4 → C"로 풀려야 함). 5도 sus4는 그 자체로 완결
function _comboV2Ch3Variants(steps, i, marked) {
  const b = steps[i].base;
  return _comboV2Ch3Decos(b).filter(function (v) {
    return v !== 'sus4' || b !== 'I' || (i + 1 < steps.length && steps[i + 1].base === 'I' && marked.indexOf(i + 1) < 0);
  });
}
// 진행 하나 뽑기(챕터 3) — decorate면 1~2칸을 꾸밈/전위로 바꿈. 돌려줄 때 steps = 항목들, marked = 바뀐 칸
function _comboV2Ch3Prog(decorate) {
  const s = _comboV2Sess;
  const pool = _comboV2SwPool();
  const inv = s.theme !== 'deco';
  let steps, marked, guard = 0;
  do {   // 전위 테마는 1전위 규칙(_comboV2InvOk)을 만족하는 칸이 하나도 없는 진행이면 다시 뽑음
    const cands = pool.filter(function (p) { return p.id !== s.prevId; });
    const prog = _comboV2Rand(cands.length ? cands : pool);
    s.prevId = prog.id;
    steps = prog.steps.map(function (st) {
      const base = COMBO_V2_C_CHORD_DEG[st.chord] || COMBO_V2_C_CHORD_DEG7[st.chord];
      return s.dia.find(function (x) { return x.base === base; });
    });
    marked = [];
    const locked = [];
    if (decorate) {
      const elig = _comboV2SwShuffle(steps.map(function (x, i) { return i; }).filter(function (i) {
        return COMBO_V2_CH3_DECO[steps[i].base] && (!inv || _comboV2InvOk(steps[i].base, steps[(i + 1) % steps.length].base));
      }));
      const k = Math.random() < 0.7 ? 1 : 2;
      elig.forEach(function (i) {
        if (marked.length >= k || locked.indexOf(i) >= 0) return;
        const v = s.theme === 'deco' ? _comboV2Rand(_comboV2Ch3Variants(steps, i, marked)) : 'inv';
        if (v === 'sus4' && steps[i].base === 'I') locked.push(i + 1);   // 뒤의 1도는 그대로 둬야 함
        steps[i] = _comboV2Ch3Item(steps[i].base, v, s.form7);
        marked.push(i);
      });
    }
  } while (decorate && !marked.length && ++guard < 60);
  return { steps: steps, marked: marked };
}
// 배치형 코드 풀(최대 8개 = 2줄) — 정답에 쓰인 코드 + 나머지는 이 테마의 코드에서 채움
function _comboV2Ch3Pool(steps) {
  const sets = _comboV2Ch3Sets();
  const used = steps.map(function (x) { return x.chord; });
  const out = sets.all.filter(function (x) { return used.indexOf(x.chord) >= 0; });
  _comboV2SwShuffle(sets.all.filter(function (x) { return used.indexOf(x.chord) < 0; })).forEach(function (x) { if (out.length < 8) out.push(x); });
  return sets.all.filter(function (x) { return out.some(function (o) { return o.chord === x.chord; }); });
}

// 교체형·빈칸형(챕터 3)
// 꾸밈: 교체형 = 꾸미지 않은 I·IV·V를 그 도수의 꾸밈코드로 교체 / 빈칸형 = 빈칸에 도수 힌트에 맞는 꾸밈코드. 오답은 다른 도수의 꾸밈코드·꾸미지 않은 코드
// 전위: 교체형 = 같은 기능의 다른 코드로(전위가 정답이 되도록) / 빈칸형 = 전위가 든 진행의 전위 칸에 그 기능의 코드. 오답은 나머지 두 기능에서 하나씩
function _comboV2Ch3Swap(mode) {
  const s = _comboV2Sess;
  const sets = _comboV2Ch3Sets();
  let steps, t, ans, wrong, func = null, tgtBase = null;
  if (s.theme === 'deco') {
    const p = _comboV2Ch3Prog(false);
    steps = p.steps;
    const elig = _comboV2SwShuffle(steps.map(function (x, i) { return i; }).filter(function (i) { return COMBO_V2_CH3_DECO[steps[i].base]; }));
    t = elig[0];
    tgtBase = steps[t].base;
    const orig = steps[t];
    ans = _comboV2Ch3Item(tgtBase, _comboV2Rand(_comboV2Ch3Variants(steps, t, [])), false);
    const others = sets.theme.filter(function (x) { return x.base !== tgtBase; });
    if (mode === 'replace') wrong = _comboV2SwShuffle(others.slice()).slice(0, 2);
    else { steps[t] = ans; wrong = [orig, _comboV2Rand(others)]; }   // 빈칸형: 꾸미지 않은 같은 도수가 대표 오답
  } else {
    const all = sets.roots.concat(sets.theme);
    let p;
    if (mode === 'replace') {
      let inv, guard = 0, same;
      do {   // 바뀔 칸의 같은 기능 전위가 있고 다음 코드와 1전위 규칙을 만족하는 칸을 찾음
        p = _comboV2Ch3Prog(false);
        steps = p.steps;
        t = Math.floor(Math.random() * steps.length);
        same = all.filter(function (x) { return x.func === steps[t].func && x.chord !== steps[t].chord; });
        inv = same.filter(function (x) { return x.variant === 'inv' && _comboV2InvOk(x.base, steps[(t + 1) % steps.length].base); });
      } while (!inv.length && ++guard < 80);
      ans = _comboV2Rand(inv.length ? inv : same);   // 전위가 정답이 되게
    } else {
      p = _comboV2Ch3Prog(true);
      steps = p.steps;
      t = _comboV2Rand(p.marked);
      ans = steps[t];
    }
    func = ans.func;
    wrong = [0, 1, 2].filter(function (f) { return f !== func; }).map(function (f) { return _comboV2Rand(all.filter(function (x) { return x.func === f; })); });
  }
  Object.assign(COMBO_V2_SW_DATA, {
    mode: mode,
    chords: steps.map(function (x) { return x.chord; }),
    degs: steps.map(function (x) { return x.deg; }),
    target: t,
    reverse: false,
    answer: ans.chord,
    answerDeg: ans.deg,
    wrong: wrong.map(function (x) { return x.chord; }),
    func: func,
    ch3: s.theme,
    targetBase: tgtBase,
    ch4: null,
    ch5: null,
    ch6: null,
    domRev: false,
  });
}

function _comboV2PlaceBuild() {
  if (_comboV2Sess.cfg.ch9) { _comboV2Ch9PlaceBuild(); return; }
  if (_comboV2Sess.cfg.ch7) { _comboV2Ch7PlaceBuild(); return; }
  if (_comboV2Sess.cfg.ch6) { _comboV2Ch6PlaceBuild(); return; }
  if (_comboV2Sess.cfg.ch5) { _comboV2Ch5PlaceBuild(); return; }
  document.getElementById('combo-v2-blanks')?.classList.remove('combo-v2-blanks--8');
  document.querySelectorAll('#combo-v2-blanks .combo-v2-fixcell').forEach(function (el) { el.remove(); });
  const ch3 = _comboV2Sess.cfg.ch3, ch4 = _comboV2Sess.cfg.ch4;
  const p3 = ch3 ? _comboV2Ch3Prog(true) : ch4 ? _comboV2Ch4Prog(true) : null;
  const q = p3 ? { chords: p3.steps.map(function (x) { return x.chord; }), degs: p3.steps.map(function (x) { return x.deg; }) } : _comboV2PickProg();
  const poolItems = ch3 ? _comboV2Ch3Pool(p3.steps) : ch4 ? _comboV2Ch4Pool(p3.steps) : _comboV2Sess.dia;
  _comboV2PRev = !!(q && _comboV2Sess.reverse);
  _comboV2Sess.playChords = q ? q.chords.slice() : null;   // 스피커로 들려줄 정답 코드 진행
  const wrap = document.getElementById('combo-v2-blanks');
  if (q && wrap) {
    wrap.querySelectorAll('.combo-v2-blank').forEach(function (el) { el.remove(); });
    const fixIdx = ch4 ? (p3.d + 1) % q.chords.length : -1;   // 챕터 4: 도미넌트의 타겟 코드는 미리 표시(글자 고정)
    q.chords.forEach(function (chord, i) {
      const blank = document.createElement('div');
      if (i === fixIdx) {
        blank.className = 'combo-v2-fixcell';
        blank.innerHTML = '<div class="combo-v2-blank-slot"><span class="combo-v2-fixed-text">' + (_comboV2PRev ? _comboV2RomanHtml(q.degs[i]) : _ccFormatB5(chord)) + '</span></div>' +
          '<div class="combo-v2-blank-deg' + (_comboV2PRev ? ' is-chord' : '') + '">' + (_comboV2PRev ? _ccFormatB5(chord) : _comboV2RomanHtml(q.degs[i])) + '</div>';
        wrap.appendChild(blank);
        return;
      }
      blank.className = 'combo-v2-blank';
      blank.dataset.answer = _comboV2PRev ? q.degs[i] : chord;
      blank.innerHTML = '<div class="combo-v2-blank-slot"></div><div class="combo-v2-blank-deg' + (_comboV2PRev ? ' is-chord' : '') + '">' + (_comboV2PRev ? _ccFormatB5(chord) : _comboV2RomanHtml(q.degs[i])) + '</div>';
      wrap.appendChild(blank);
    });
  }
  const pool = document.getElementById('combo-v2-pool');
  if (pool) {   // 코드 풀 = 이 key의 다이어토닉 7화음
    pool.innerHTML = '';
    poolItems.forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'combo-v2-chip cd-card';
      b.dataset.chord = _comboV2PRev ? x.deg : x.chord;
      b.innerHTML = _comboV2Fmt(b.dataset.chord, _comboV2PRev);
      pool.appendChild(b);
    });
  }
  _comboV2PReset();
  _comboV2PBuildCard();
}

function _comboV2SwJudge() {
  const d = COMBO_V2_SW_DATA;
  _comboV2SwJudged = true;
  const ok = _comboV2SwSel === d.answer;
  const chip = document.querySelector('#combo-v2-swap-blanks .is-target .combo-v2-chip');
  if (chip) chip.classList.add(ok ? 'is-ok' : 'is-ng');
  const deg = document.querySelector('#combo-v2-swap-blanks .is-target .combo-v2-blank-deg');   // 채점 후 정답 도수를 칩 색과 같은 색으로 표시
  if (deg) { if (!d.reverse) deg.innerHTML = _comboV2RomanHtml(d.answerDeg); deg.classList.add(ok ? 'is-ok' : 'is-ng'); }
  document.getElementById('combo-v2-swap-choices')?.classList.add('is-locked');
  _comboV2Verdict(ok);
}

document.getElementById('combo-v2-swap-choices')?.addEventListener('click', function (e) {
  const b = e.target.closest('.combo-v2-chip--choice');
  if (!b || _comboV2SwJudged || b.classList.contains('is-miss') || b.dataset.chord === _comboV2SwSel) return;   // 오답풀이에서 이미 틀린 선택지는 다시 못 고름
  _playConfirmSfx();
  _comboV2SwSel = b.dataset.chord;
  this.querySelectorAll('.combo-v2-chip--choice').forEach(function (c) { c.classList.toggle('is-sel', c === b); });
  _comboV2SwRenderTarget(true);
  _comboV2UpdateSubmit();
});

// ── 분류형 (목업: C key, 2장 — 7개 코드를 해결/예비/긴장 3열로 나눔) ──
// 레인(열)에 칩이 위에서부터 겹침 없이 쌓임. 풀은 바닥 한 줄: 순서가 있는 대기열(_soQueue)의 앞에서부터 한 줄에 들어가는 만큼만 그림(넘치면 안 만듦).
// 홀드 0.2초 드래그: 풀→레인(놓으면 풀에서 빠지고 풀 칩이 왼쪽으로 슬라이드), 레인 안·레인 사이 이동. 드래그 중 포인터가 레인 위면
// 그 자리에 빈자리(플레이스홀더)가 열리고 나머지 칩이 FLIP으로 밀려남(일반적인 sortable 방식). 레인 칩을 짧게 탭하면 풀 맨 앞으로 복귀.
// 채점: 칩이 맞는 열에 있으면 연두, 아니면 코랄(열 안 순서는 무관).
const COMBO_V2_SO_COL = { C: 0, Em: 0, Am: 0, F: 1, Dm: 1, G: 2, Bdim: 2 };   // 코드 → 정답 열(해결 0 / 예비 1 / 긴장 2)
let _soColMap = COMBO_V2_SO_COL;   // 이번 문제의 코드 → 정답 열
let _soCols = [[], [], []];
let _soQueue = [];
let _soJudged = false;
let _soMiss = [];   // 오답풀이 재도전: 틀려서 풀로 돌아온 칩(표시용)
let _soDrag = null;   // { chord, from:'pool'|'lane', startX, startY, lastX, lastY, timer, active, cancelled, ghost, offX, offY, hover:null|{col,idx} }

function _soLanes() { return document.querySelectorAll('#combo-v2-sort .combo-v2-sort-lane'); }
function _soPoolEl() { return document.getElementById('combo-v2-sort-pool'); }

function _soMakeChip(chord, cls) {
  const b = document.createElement('button');
  b.className = 'combo-v2-chip cd-card ' + cls;
  b.dataset.chord = chord;
  b.innerHTML = _ccFormatB5(chord);
  return b;
}

// 상태(+드래그 중이면 빈자리·반투명 원본)대로 레인과 풀을 다시 그림
function _soRender() {
  const d = _soDrag && _soDrag.active ? _soDrag : null;
  _soLanes().forEach(function (lane, c) {
    lane.innerHTML = '';
    const list = _soCols[c].filter(function (ch) { return !(d && d.from === 'lane' && d.chord === ch); });
    const ph = d && d.hover && d.hover.col === c ? d.hover.idx : -1;
    list.forEach(function (ch, i) {
      if (i === ph) { const p = document.createElement('div'); p.className = 'combo-v2-sort-ph'; lane.appendChild(p); }
      lane.appendChild(_soMakeChip(ch, 'combo-v2-chip--lane'));
    });
    if (ph >= list.length) { const p = document.createElement('div'); p.className = 'combo-v2-sort-ph'; lane.appendChild(p); }
  });
  const pool = _soPoolEl();
  pool.innerHTML = '';
  _soQueue.forEach(function (ch) {
    const chip = _soMakeChip(ch, 'combo-v2-chip--pool');
    if (_soMiss.indexOf(ch) >= 0) chip.classList.add('is-miss');
    if (d && d.from === 'pool' && d.chord === ch) chip.classList.add('is-drag-src');
    pool.appendChild(chip);
  });
  // 앞에서부터 한 줄에 들어가는 만큼만 남기고 나머지는 만들지 않음
  const maxW = pool.clientWidth;
  const gap = parseFloat(getComputedStyle(pool).columnGap) || 0;
  let used = 0, cut = -1;
  Array.prototype.forEach.call(pool.children, function (el, i) {
    if (cut >= 0) return;
    const need = used + (i ? gap : 0) + el.offsetWidth;
    if (need > maxW + 0.5) cut = i; else used = need;
  });
  if (cut >= 0) while (pool.children.length > cut) pool.removeChild(pool.lastChild);
  const hint = document.getElementById('combo-v2-sort-hint');
  if (hint) hint.hidden = _soQueue.length === 0;   // 풀이 비면 안내도 숨김
  _comboV2UpdateSubmit();
}

function _soSnapshot() {
  const m = {};
  document.querySelectorAll('#combo-v2-sort .combo-v2-sort-lane .combo-v2-chip, #combo-v2-sort-pool .combo-v2-chip').forEach(function (el) {
    m[el.dataset.chord] = { rect: el.getBoundingClientRect(), node: el };
  });
  return m;
}

// 상태를 바꾸고 다시 그리면서, 칩이 옮겨진 만큼 부드럽게 이동(FLIP). ghostChord/ghostRect = 놓은 칩이 고스트 위치에서 제자리로 들어오게 함
function _soApply(mutate, ghostChord, ghostRect) {
  const prev = _soSnapshot();
  if (ghostChord && ghostRect) prev[ghostChord] = { rect: ghostRect, node: null };
  mutate();
  _soRender();
  const next = _soSnapshot();
  Object.keys(next).forEach(function (k) {
    const n = next[k], p = prev[k];
    if (!p) { n.node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }); return; }
    const dx = p.rect.left - n.rect.left, dy = p.rect.top - n.rect.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(p.rect.width - n.rect.width) < 0.5) return;
    n.node.animate([
      { transform: 'translate(' + dx + 'px, ' + dy + 'px)', width: p.rect.width + 'px' },
      { transform: 'translate(0px, 0px)', width: n.rect.width + 'px' },
    ], { duration: 220, easing: COMBO_V2_EASE });
  });
  Object.keys(prev).forEach(function (k) {   // 풀에서 넘쳐 사라지는 칩은 제자리에서 페이드아웃
    if (next[k] || !prev[k].node) return;
    const spawned = _comboV2PSpawnClone(prev[k].node, 'combo-v2-fly');
    const anim = spawned.clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = anim.oncancel = function () { spawned.clone.remove(); };
  });
}

function _soDown(e) {
  if (_soJudged || _soDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const chip = e.target.closest('.combo-v2-chip');
  if (!chip) return;
  e.preventDefault();
  _soDrag = {
    chord: chip.dataset.chord, from: chip.classList.contains('combo-v2-chip--lane') ? 'lane' : 'pool',
    startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
    timer: setTimeout(function () { _soBeginDrag(chip); }, COMBO_V2_HOLD_MS), active: false, cancelled: false, ghost: null, offX: 0, offY: 0, hover: null,
  };
  document.addEventListener('pointermove', _soMove);
  document.addEventListener('pointerup', _soUp);
  document.addEventListener('pointercancel', _soAbort);
}

function _soBeginDrag(chip) {
  const d = _soDrag;
  if (!d || d.cancelled) return;
  d.timer = null;
  const rect = chip.getBoundingClientRect();
  d.offX = d.lastX - rect.left;
  d.offY = d.lastY - rect.top;
  const ghost = chip.cloneNode(true);
  ghost.classList.add('combo-v2-chip--ghost');
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  document.body.appendChild(ghost);
  d.ghost = ghost;
  d.active = true;
  _soApply(function () {});   // 풀 원본은 반투명, 레인 원본은 빠지며 나머지가 올라옴
  _soUpdateHover(d.lastX, d.lastY);
}

// 포인터가 레인 위면 그 안의 삽입 위치(idx)를 구함. 빈자리 때문에 밀린 칩은 밀린 만큼 되돌려 계산(안 그러면 경계에서 깜빡임)
function _soUpdateHover(x, y) {
  const d = _soDrag;
  let hv = null;
  _soLanes().forEach(function (lane, c) {
    const r = lane.getBoundingClientRect();
    if (x < r.left - 4 || x > r.right + 4 || y < r.top - 12 || y > r.bottom + 12) return;
    const ph = lane.querySelector('.combo-v2-sort-ph');
    const shift = ph ? ph.offsetHeight + (parseFloat(getComputedStyle(lane).rowGap) || 0) : 0;
    const phTop = ph ? ph.getBoundingClientRect().top : 0;
    let idx = 0;
    lane.querySelectorAll('.combo-v2-chip').forEach(function (el) {
      const cr = el.getBoundingClientRect();
      let mid = cr.top + cr.height / 2;
      if (ph && cr.top > phTop) mid -= shift;
      if (mid < y) idx++;
    });
    hv = { col: c, idx: idx };
  });
  const old = d.hover;
  if ((!hv && !old) || (hv && old && hv.col === old.col && hv.idx === old.idx)) return;
  _soApply(function () { d.hover = hv; });
}

function _soMove(e) {
  const d = _soDrag;
  if (!d) return;
  d.lastX = e.clientX;
  d.lastY = e.clientY;
  if (!d.active) {
    if (!d.cancelled && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > COMBO_V2_MOVE_TOL) {
      d.cancelled = true;
      clearTimeout(d.timer);
      d.timer = null;
    }
    return;
  }
  d.ghost.style.left = (e.clientX - d.offX) + 'px';
  d.ghost.style.top = (e.clientY - d.offY) + 'px';
  _soUpdateHover(e.clientX, e.clientY);
}

function _soEndTracking() {
  document.removeEventListener('pointermove', _soMove);
  document.removeEventListener('pointerup', _soUp);
  document.removeEventListener('pointercancel', _soAbort);
  if (_soDrag && _soDrag.timer) clearTimeout(_soDrag.timer);
}

// 드래그 끝(놓음): hover 자리가 있으면 그 자리로 이동, 없으면 원위치. 고스트 위치에서 제자리로 부드럽게 들어옴
function _soFinishDrag(commit) {
  const d = _soDrag;
  const ghostRect = d.ghost.getBoundingClientRect();
  d.ghost.remove();
  const hv = commit ? d.hover : null;
  d.active = false;
  _soDrag = null;
  _soApply(function () {
    if (!hv) return;
    if (d.from === 'pool') _soQueue.splice(_soQueue.indexOf(d.chord), 1);
    else _soCols.forEach(function (col) { const k = col.indexOf(d.chord); if (k >= 0) col.splice(k, 1); });
    _soCols[hv.col].splice(hv.idx, 0, d.chord);
  }, d.chord, ghostRect);
}

function _soUp(e) {
  const d = _soDrag;
  if (!d) return;
  _soEndTracking();
  if (d.active) { _soFinishDrag(true); return; }
  _soDrag = null;
  if (d.cancelled || d.from !== 'lane') return;
  _playConfirmSfx();   // 짧은 탭: 레인 칩 → 풀 맨 앞으로 복귀
  _soApply(function () {
    _soCols.forEach(function (col) { const k = col.indexOf(d.chord); if (k >= 0) col.splice(k, 1); });
    _soQueue.unshift(d.chord);
  });
}

// 시스템이 제스처를 가로챈 경우·이탈 시: 드래그 중이면 원위치로, 아니면 그냥 정리
function _soAbort() {
  const d = _soDrag;
  if (!d) return;
  _soEndTracking();
  if (d.active) _soFinishDrag(false); else _soDrag = null;
}

function _soJudge() {
  _soJudged = true;
  let allOk = true;
  _soLanes().forEach(function (lane, c) {
    lane.querySelectorAll('.combo-v2-chip').forEach(function (el) {
      const ok = _soColMap[el.dataset.chord] === c;
      if (!ok) allOk = false;
      el.classList.add(ok ? 'is-ok' : 'is-ng');
    });
  });
  document.getElementById('combo-v2-sort')?.classList.add('is-locked');
  _comboV2Verdict(allOk);
}

// 문제 구성·초기화(멱등) — 진입·"다시 하기"·이탈 공용. 진행 중 드래그·고스트까지 즉시 정리
// 이 문제의 코드 7개와 정답 열. 기능 레벨은 3화음 / 7th / 섞음 중 하나를 문제마다 랜덤(섞음은 3화음과 7th가 둘 다 들어가게)
function _soGenSet() {
  const k = _comboV2Sess.key;
  if (!k) return COMBO_V2_SO_COL;
  if (_comboV2Sess.cfg && _comboV2Sess.cfg.ch8) {   // 챕터 8: 마이너 7th 7개를 해결·예비·긴장으로
    const m8 = {};
    _comboV2MDia(k).forEach(function (x) { m8[x.chord] = COMBO_V2_MFUNC[x.deg]; });
    return m8;
  }
  const variant = _comboV2Sess.cfg && (_comboV2Sess.cfg.func || _comboV2Sess.cfg.ch3) ? (_comboV2Sess.form7 ? ['sev', 'mix'][Math.floor(Math.random() * 2)] : 'tri') : 'tri';   // 3화음 구간 = 3화음만, 7th 구간 = 7th만 또는 3화음·7th 섞음
  let flags;
  do {
    flags = COMBO_V2_DEGS.map(function () { return variant === 'sev' ? true : variant === 'mix' ? Math.random() < 0.5 : false; });
  } while (variant === 'mix' && (flags.every(Boolean) || !flags.some(Boolean)));
  const map = {};
  COMBO_V2_DEGS.forEach(function (x, i) {
    const it = _comboV2FuncItem(x.deg, flags[i]);
    map[it.chord] = it.func;
    if (_comboV2Sess.cfg.ch3 && COMBO_V2_CH3_DECO[x.deg]) {   // 챕터 3 전위: I·IV·V 1전위가 근음형과 같은 열에 추가됨(표기는 근음형 짝을 따름)
      const inv = _comboV2Ch3Item(x.deg, 'inv', flags[i]);
      map[inv.chord] = inv.func;
    }
  });
  return map;
}

function _soBuild() {
  _soEndTracking();
  _soDrag = null;
  document.querySelectorAll('.combo-v2-chip--ghost').forEach(function (el) { el.remove(); });
  _soJudged = false;
  _soMiss = [];
  _soCols = [[], [], []];
  _soColMap = _soGenSet();
  const heads = _comboV2Sess.cfg && _comboV2Sess.cfg.ch8 ? ['Im', 'IVm', 'Vm'] : ['I', 'IV', 'V'];   // 열 헤더의 로마자(마이너는 Im IVm Vm)
  document.querySelectorAll('#combo-v2-sort .combo-v2-sort-deg').forEach(function (el, i) { el.innerHTML = _comboV2RomanHtml(heads[i]); });
  const keyEl = document.getElementById('combo-v2-sort-key');   // 어느 key의 코드인지 상단에 표시
  if (keyEl) keyEl.textContent = _comboV2Sess.key ? _comboV2Sess.key.name + ' key' : '';
  _soQueue = _comboV2SwShuffle(Object.keys(_soColMap));
  document.getElementById('combo-v2-sort')?.classList.remove('is-locked');
  _soRender();
  const btn = document.getElementById('combo-v2-submit');
  if (btn && _comboV2Type === 'sort') {
    btn.textContent = '제출하기';
    btn.classList.remove('combo-v2-submit--ok', 'combo-v2-submit--ng');
  }
  _comboV2UpdateSubmit();
}

document.getElementById('combo-v2-sort')?.addEventListener('pointerdown', _soDown);
document.getElementById('combo-v2-sort-pool')?.addEventListener('pointerdown', _soDown);
document.getElementById('combo-v2-sort')?.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.getElementById('combo-v2-sort-pool')?.addEventListener('contextmenu', function (e) { e.preventDefault(); });
window.addEventListener('resize', function () {   // 풀에 들어가는 개수가 폭에 따라 달라짐
  if (_comboV2Type === 'sort' && _comboV2InQuiz && !_soDrag && !_soJudged) _soRender();
});

// 문제 화면 이탈 — 선택 뷰 v2로 복귀(런타임 정리: 진행 점 숨김. 오디오·타이머는 이 화면에 아직 없음)
function comboV2ExitQuiz(keepOverlay) {   // keepOverlay: 클리어 확인으로 나갈 때 — 오버레이는 문제 화면과 함께 슬라이드로 빠지므로 여기서 안 지움
  _comboV2InQuiz = false;
  flushPendingRefund('chord_combo');
  _comboV2DevBarSync();   // 나가기(X 확인·클리어 확인) — 쌓인 환급을 서버에 반영
  if (keepOverlay) _comboV2SeqStop(); else { _comboV2OverlayAbort(); _comboV2CancelPendingFill(); }
  _comboV2ResetPairs(); // 다시 들어오면 처음부터(짝·선택·채점 상태 초기화)
  _comboV2PReset();     // 배치형도: 칩·드래그·날아가는 효과·채점 상태까지 즉시 정리
  _comboV2SwSel = null; // 교체형: 선택·채점 상태 초기화(다음 진입 때 _comboV2SwBuild가 다시 그림)
  _comboV2SwJudged = false;
  _soEndTracking();     // 분류형: 드래그·고스트·채점 상태 즉시 정리
  _soDrag = null;
  document.querySelectorAll('.combo-v2-chip--ghost').forEach(function (el) { el.remove(); });
  _soJudged = false;
  _soCols = [[], [], []];
  _soQueue = [];
  _comboV2SoundStop();   // 이탈은 하드컷
  _soMiss = [];
  document.getElementById('combo-v2-review-badge')?.setAttribute('hidden', '');
  const prog = document.getElementById('combo-quiz-progress');
  if (prog) { prog.style.display = 'none'; prog.innerHTML = ''; }
  document.getElementById('combo-view-quiz-v2')?.classList.add('quiz-view--right');
  document.getElementById('combo-view-select-v2')?.classList.remove('quiz-view--left');
}

document.getElementById('combo-v2-body')?.addEventListener('click', function (e) {
  const card = e.target.closest('.combo-v2-level:not(.combo-v2-level--locked)');
  const type = card ? COMBO_V2_LEVELS[card.dataset.level] : null;   // 레벨 설정(key·유형). data-level이 없는 카드는 진입 불가
  if (!type) return;
  _playConfirmSfx();
  const label = { num: card.querySelector('.combo-v2-donut-num').textContent, name: card.querySelector('.combo-v2-level-title').textContent };
  if (getPlan() === 'pro') { _comboV2StartLevel(type, label); return; } // Pro: 소모 없음 → 확인 생략
  showLeavePracticeModal(function () { _comboV2StartLevel(type, label); }, {
    title: '연습을 시작할까요?',
    desc: '<span class="peak-confirm-body"><img src="image/peak.svg" alt="피크"><span class="peak-confirm-count">-' + _comboV2PeakCost(type) + '</span></span>',
    stopText: '취소',
    continueText: '시작하기',
    confirmOnPrimary: true,
    sfx: null, // 카드 탭 사운드가 이미 났음
  });
});

// ── 선택 뷰 v2: 헤드 챕터 위치 표시 — 점(칸)을 누르면 원(현재 챕터)이 그 칸으로 미끄러져 이동 ──
// 트랙은 항상 9칸이라 점은 움직이지 않고, 원만 CSS left(--i 칸 번호)로 이동한다.
const COMBO_V2_CH_TOTAL = 9;
// 챕터별 포인트 컬러(1~9장, 2026-10-26 확정). 현재 챕터 원·문제 화면 --ch-accent에 쓰고, 선택 화면 카드 인라인 --ch-accent도 같은 값.
const COMBO_V2_CH_COLORS = ['#3b93f2', '#20b2c7', '#7b6cf0', '#c35ad8', '#ec5f94', '#f07a3a', '#e2a81c', '#7fb539', '#5b6b82'];
let _comboV2Cur = 1;
function _comboV2UpdateDots() {
  const row = document.querySelector('.combo-v2-chapter-dots');
  if (!row) return;
  const track = row.querySelector('.combo-v2-chapter-track');
  const cur = row.querySelector('.combo-v2-chapter-cur');
  track.style.setProperty('--i', _comboV2Cur - 1);
  cur.dataset.n = _comboV2Cur;
  cur.style.setProperty('--ch-accent', COMBO_V2_CH_COLORS[_comboV2Cur - 1] || COMBO_V2_CH_COLORS[0]);
  cur.textContent = _comboV2Cur;
  track.querySelectorAll('.combo-v2-chapter-slot').forEach(function (slot, idx) {
    slot.classList.toggle('is-cur', idx === _comboV2Cur - 1);
  });
}
document.querySelector('.combo-v2-chapter-dots')?.addEventListener('click', function (e) {
  const slot = e.target.closest('.combo-v2-chapter-slot');
  if (!slot) return;
  const next = Array.prototype.indexOf.call(slot.parentNode.querySelectorAll('.combo-v2-chapter-slot'), slot) + 1;
  if (next === _comboV2Cur) return;
  _comboV2Cur = next;
  _playConfirmSfx();
  _comboV2UpdateDots();
  _comboV2ScrollToChapter(next);
});
// 눌린 챕터의 카드(.combo-v2-chapter)가 스티키 헤드 바로 아래(그라데이션 띠 16px 아래)에 오도록 스크롤.
// 아직 카드가 없는 챕터(목업)는 스크롤하지 않는다. 스크롤 컨테이너 = #combo-view-select-v2(.cd-main).
function _comboV2ScrollToChapter(n, instant) {
  const main = document.getElementById('combo-view-select-v2');
  const card = main && main.querySelectorAll('.combo-v2-chapter')[n - 1];
  const head = main && main.querySelector('.cd-head--sticky');
  if (!card || !head) return;
  const delta = card.getBoundingClientRect().top - (head.getBoundingClientRect().bottom + 16);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  main.scrollBy({ top: delta, behavior: (reduce || instant) ? 'auto' : 'smooth' });
}
_comboV2UpdateDots();

// ── 레벨 카드 제목 균형 줄바꿈 폴백 ──
// CSS text-wrap: balance를 못 쓰는 웹뷰(iOS 17.5 미만, 구형 Android WebView)에서만 동작.
// 제목이 두 줄 이상이면 줄 수가 유지되는 최소 폭을 이진탐색으로 찾아 max-width로 걸어 줄 길이를 맞춘다.
function _comboV2BalanceTitles() {
  if (window.CSS && CSS.supports && CSS.supports('text-wrap', 'balance')) return;
  document.querySelectorAll('#combo-view-select-v2 .combo-v2-level-title').forEach(function (el) {
    el.style.maxWidth = '';
    const full = el.getBoundingClientRect();
    if (!full.width) return;   // 숨겨진 상태면 측정 불가
    const lh = parseFloat(getComputedStyle(el).lineHeight) || full.height;
    const lines = Math.round(full.height / lh);
    if (lines < 2) return;
    let lo = 0, hi = full.width;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      el.style.maxWidth = mid + 'px';
      if (Math.round(el.getBoundingClientRect().height / lh) > lines) lo = mid; else hi = mid;
    }
    el.style.maxWidth = Math.ceil(hi) + 'px';
  });
}
(function () {
  let raf = 0;
  const run = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(_comboV2BalanceTitles); };
  window.addEventListener('resize', run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  run();
})();

// ── 레벨 진행: 완료 횟수(도넛 호) + 필수 레벨 순차 해금 (2026-10-28) ──
// 완료 1회 = 레벨을 끝까지(오답풀이 포함) 마쳤을 때(클리어 화면 진입 시 기록). 클리어 = 완료 3회(도넛 호 3개).
// 키 레벨(챕터별 필수 구간 마지막 종합 레벨)은 클리어까지 완료 5회(도넛 호 5개), 나머지 레벨은 3회.
// 해금: 챕터 안의 모든 레벨(필수·선택 구간 모두)은 바로 앞 레벨을 클리어해야 다음이 열림(선택 구간 첫 레벨 N-7은 키 레벨 클리어 후). 챕터 N의 첫 레벨은 이전 챕터 키 레벨 클리어 후(1장은 항상).
// 저장은 기기 로컬(localStorage, 계정별 키). 서버 저장은 아직 없음.
const COMBO_V2_CLEAR_AT = 3;       // 일반 레벨의 클리어 완료 횟수
const COMBO_V2_CLEAR_AT_KEY = 5;   // 키 레벨(필수 구간 마지막 종합 레벨)의 클리어 완료 횟수
const COMBO_V2_REQ = { 1: 6, 2: 8, 3: 6, 4: 6, 5: 6, 6: 6, 7: 6, 8: 6, 9: 6 };   // 챕터별 필수 구간 마지막 = 키 레벨 번호 (챕터 2만 2-8)
const COMBO_V2_DEV_UNLOCK_KEY = 'chorditor_combo_dev_unlock';

function _comboV2ProgKey() {
  const a = typeof getStoredAuth === 'function' ? getStoredAuth() : null;
  return 'chorditor_combo_progress_v1_' + ((a && a.userId) || 'anon');
}
function _comboV2ProgLoad() {
  try {
    const o = JSON.parse(localStorage.getItem(_comboV2ProgKey()));
    return o && typeof o === 'object' ? o : {};
  } catch (_) { return {}; }
}
function _comboV2ProgSave(o) {
  try { localStorage.setItem(_comboV2ProgKey(), JSON.stringify(o)); } catch (_) {}
}
function _comboV2DevUnlocked() {   // 개발 빌드(_dev)에서만: 전체 열기
  try { return APP_VERSION.includes('_dev') && localStorage.getItem(COMBO_V2_DEV_UNLOCK_KEY) === '1'; } catch (_) { return false; }
}

function _comboV2ClearAt(lv) {   // 이 레벨의 클리어 완료 횟수 = 도넛 호 개수
  const p = lv.split('-');
  return +p[1] === COMBO_V2_REQ[+p[0]] ? COMBO_V2_CLEAR_AT_KEY : COMBO_V2_CLEAR_AT;
}
// 도넛 호 하나의 (보이는 길이, 나머지) — 둘레 119.38을 호 개수로 나눈 칸에서 양끝 둥근 끝(각 3px)과 틈 6px을 뺀 길이. 3개는 CSS 기본값, 5개는 .combo-v2-donut--5
function _comboV2ArcDash(clearAt) {
  const seg = 119.38 / clearAt, dash = +(seg - 12).toFixed(3);
  return [dash, +(119.38 - dash).toFixed(3)];
}

// ── 해금 판정 ──
// 저장하는 사실은 두 가지뿐: done(레벨별 직접 완주 횟수 — 퀘스트·보상은 이것만 봄)과 skips(통과한 건너뛰기 테스트의 대상 챕터, 판정엔 최댓값 S만 씀).
// 해금 상태는 따로 저장하지 않고 매번 이 두 사실에서 계산한다.
//   keyPassed(c)    챕터 c의 종합 관문 통과 = 챕터 c 또는 더 높은 챕터의 종합 레벨 클리어, 또는 c < S(더 높은 챕터로 건너뛰는 테스트 통과). 해금 전용 — done에는 아무것도 쓰지 않음
//   chapterOpen(n)  챕터 n의 미니강의를 들을 수 있는 권한 = n = 1 또는 keyPassed(n-1). 권한만으로는 레벨이 열리지 않는다
//   lectureDone(n)  챕터 n의 미니강의를 끝까지 봄(prog._lec에 기록) 또는 n < S(더 높은 챕터로 건너뛰는 테스트를 통과 → 그 아래 챕터 강의는 본 것으로 간주).
//                   아직 강의가 만들어지지 않은 챕터(COMBO_V2_LECTURE_READY에 없음)는 임시로 본 것으로 간주
//   levelOpen(c,m)  챕터 강의 권한이 있고 강의를 끝까지 봤어야 하며: 첫 레벨 = 그 즉시 / 필수 구간 = 앞 레벨 클리어 또는 keyPassed(c) / 선택 구간 첫 레벨 = keyPassed(c) / 선택 구간 나머지 = 앞 레벨 클리어
//   latestChapter   chapterOpen이 참인 가장 높은 챕터(접속 위치·미니강의 잠금·건너뛰기 카드 공통)
// 원칙: 건너뛰기로 챕터 S에 들어갈 자격을 얻었다면 S보다 낮은 챕터의 관문도 모두 통과한 것으로 본다(해금만 — 클리어 기록은 아님).
function _comboV2Skips(prog) {
  const a = Array.isArray(prog._skips) ? prog._skips.slice() : [];
  if (typeof prog._skip === 'number' && prog._skip > 0) a.push(prog._skip);   // 초기 개발본이 저장한 숫자 형식
  return a.filter(function (n, i) { return n >= 2 && n <= 9 && a.indexOf(n) === i; }).sort(function (x, y) { return x - y; });
}
function _comboV2Cleared(prog, lv) { return (prog[lv] || 0) >= _comboV2ClearAt(lv); }
function _comboV2KeyPassed(c, prog) {
  const sk = _comboV2Skips(prog);
  if (sk.length > 0 && c < sk[sk.length - 1]) return true;                       // 더 높은 챕터로 건너뛰는 테스트를 통과
  for (let k = c; k <= 9; k++) if (_comboV2Cleared(prog, k + '-' + COMBO_V2_REQ[k])) return true;   // 이 챕터 또는 더 높은 챕터의 종합을 직접 클리어(높은 관문을 통과했으면 낮은 관문도 통과한 것)
  return false;
}
function _comboV2ChapterOpen(n, prog) {
  return n === 1 || (n >= 2 && n <= 9 && _comboV2KeyPassed(n - 1, prog));
}
const COMBO_V2_LECTURE_READY = [1, 2, 3, 4, 5, 6, 7, 8, 9];   // 미니강의가 만들어진 챕터 — 새 강의를 만들면 여기에 추가(없는 챕터는 임시로 수강 완료로 간주해 레벨이 막히지 않게 함)
function _comboV2LectureDone(n, prog) {
  if (COMBO_V2_LECTURE_READY.indexOf(n) < 0) return true;
  if (Array.isArray(prog._lec) && prog._lec.indexOf(n) >= 0) return true;
  const sk = _comboV2Skips(prog);
  return sk.length > 0 && n < sk[sk.length - 1];   // 더 높은 챕터로 건너뛰는 테스트를 통과: 그 아래 챕터의 강의는 본 것으로 간주(언제든 다시 볼 수 있음)
}
function _comboV2MaxChapter(prog) {   // latestChapter
  for (let n = 9; n >= 2; n--) if (_comboV2ChapterOpen(n, prog)) return n;
  return 1;
}
function _comboV2LevelOpen(lv, prog) {
  if (_comboV2DevUnlocked()) return true;
  const p = lv.split('-'), c = +p[0], m = +p[1], req = COMBO_V2_REQ[c];
  if (!req || !_comboV2ChapterOpen(c, prog) || !_comboV2LectureDone(c, prog)) return false;   // 강의 권한 + 강의 수강 완료가 둘 다 있어야 챕터의 레벨이 열림
  if (m === 1) return true;                                              // 강의를 마친 챕터의 첫 레벨
  const prevCleared = _comboV2Cleared(prog, c + '-' + (m - 1));
  if (m <= req) return prevCleared || _comboV2KeyPassed(c, prog);        // 필수 구간 — 앞 레벨 클리어, 또는 이 챕터 관문을 이미 통과(지난·건너뛴 챕터)
  if (m === req + 1) return _comboV2KeyPassed(c, prog);                  // 선택 구간 첫 레벨 — 종합 관문 통과(직접 클리어 또는 건너뛰기)
  return prevCleared;                                                    // 선택 구간 나머지 — 한 단계씩
}

// 카드의 도넛 호·열림/잠김을 저장된 진행대로 그림(멱등)
function _comboV2RenderProgress() {
  const prog = _comboV2ProgLoad();
  if (_comboV2PendingFill) prog[_comboV2PendingFill.lv] = Math.max(0, (prog[_comboV2PendingFill.lv] || 0) - 1);   // 방금 기록한 완료 1회는 돌아온 뒤 채움 연출이 끝나야 화면에 반영(다음 레벨 해금도 그때)
  let needIcons = false;
  document.querySelectorAll('#combo-v2-body .combo-v2-level[data-level]').forEach(function (card) {
    const lv = card.dataset.level;
    const clearAt = _comboV2ClearAt(lv);
    const done = Math.min(clearAt, prog[lv] || 0);
    const open = _comboV2LevelOpen(lv, prog);
    card.style.setProperty('--ch-accent', COMBO_V2_CH_COLORS[(parseInt(lv, 10) || 1) - 1]);   // 잠겨 있던 카드도 열리면 챕터 색 도넛
    card.classList.toggle('combo-v2-level--locked', !open);
    const donut = card.querySelector('.combo-v2-donut');
    if (donut) {
      if (clearAt > COMBO_V2_CLEAR_AT && !donut.classList.contains('combo-v2-donut--5')) {   // 키 레벨 도넛은 호 5개
        const svg = donut.querySelector('svg');
        for (let k = svg.querySelectorAll('.combo-v2-donut-arc').length; k < clearAt; k++) svg.insertAdjacentHTML('beforeend', '<circle class="combo-v2-donut-arc" cx="22" cy="22" r="19"></circle>');
        donut.classList.add('combo-v2-donut--5');
      }
      donut.querySelectorAll('.combo-v2-donut-arc').forEach(function (arc, i) { arc.classList.toggle('is-on', i < done); });
      if (open) { donut.setAttribute('role', 'img'); donut.setAttribute('aria-label', done + '/' + clearAt); donut.removeAttribute('aria-hidden'); }
      else { donut.removeAttribute('role'); donut.removeAttribute('aria-label'); donut.setAttribute('aria-hidden', 'true'); }
    }
    const icon = card.querySelector('.combo-v2-lock-icon');
    if (!open && !icon) { card.insertAdjacentHTML('beforeend', '<i data-lucide="lock" class="combo-v2-lock-icon"></i>'); needIcons = true; }
    else if (open && icon) icon.remove();
  });
  // 챕터 카드 — 챕터가 열리기 전(챕터 첫 레벨이 잠김)에는 미니강의 버튼이 자물쇠 + "건너뛰기" 글자가 되고, 카드 전체를 눌러 건너뛰기 테스트를 시작함
  document.querySelectorAll('#combo-v2-body .combo-v2-chapter').forEach(function (ch) {
    const btn = ch.querySelector('.combo-v2-chapter-play');
    const label = ch.querySelector('.combo-v2-chapter-label');
    const n = label ? parseInt(label.textContent, 10) : 0;
    if (!btn || !n) return;
    const open = _comboV2DevUnlocked() || _comboV2ChapterOpen(n, prog);   // 강의 수강 권한 — 없으면 자물쇠 + 건너뛰기 테스트 (권한이 있어도 강의를 보기 전엔 레벨이 잠겨 있음)
    const icon = open ? 'play' : 'lock';
    ch.dataset.chapter = n;
    ch.classList.toggle('combo-v2-chapter--skip', !open);
    btn.classList.toggle('is-locked', !open);
    btn.setAttribute('aria-label', open ? '미니강의 듣기' : '미니강의 잠김 · 건너뛰기 테스트');
    if (!btn.querySelector('.combo-v2-chapter-skip-label')) btn.insertAdjacentHTML('beforeend', '<span class="combo-v2-chapter-skip-label">건너뛰기</span>');
    if ((btn.dataset.icon || 'play') !== icon) {
      const old = btn.querySelector('svg, i');
      if (old) old.remove();
      btn.insertAdjacentHTML('afterbegin', '<i data-lucide="' + icon + '"></i>');
      needIcons = true;
    }
    btn.dataset.icon = icon;
  });
  if (needIcons && window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  _comboV2UpdateHint(prog);
  if (typeof _comboV2BalanceTitles === 'function') _comboV2BalanceTitles();   // 자물쇠 유무로 제목 폭이 달라짐
}

// "지금 해야 할 것" 암시 — 열린 가장 높은 챕터에서: 강의를 아직 안 봤으면 그 챕터의 ▶ 버튼, 봤으면 풀 수 있는 가장 높은 레벨의 도넛에 약한 파동(.combo-v2-hint).
// 마지막 레벨까지 클리어해 풀 레벨이 없으면 파동 없음. 하나만 표시.
function _comboV2UpdateHint(prog) {
  const n = _comboV2MaxChapter(prog);
  let target = null;
  if (!_comboV2LectureDone(n, prog)) {
    target = document.querySelector('#combo-v2-body .combo-v2-chapter[data-chapter="' + n + '"] .combo-v2-chapter-play');
  } else {
    const cards = document.querySelectorAll('#combo-v2-body .combo-v2-level[data-level^="' + n + '-"]');
    for (let i = cards.length - 1; i >= 0; i--) {
      if (!cards[i].classList.contains('combo-v2-level--locked') && !_comboV2Cleared(prog, cards[i].dataset.level)) { target = cards[i].querySelector('.combo-v2-donut'); break; }
    }
  }
  // 파동 = 대상(도넛 또는 ▶ 아이콘)의 svg 복제본을 겹친 것 — 모양이 항상 대상과 같음. 같은 대상에 이미 있으면 그대로 둠(다시 그릴 때마다 애니메이션이 처음부터 시작하지 않게)
  document.querySelectorAll('#combo-v2-body .combo-v2-hint-wave').forEach(function (w) { if (!target || w.parentNode !== target) w.remove(); });
  if (!target || target.querySelector('.combo-v2-hint-wave')) return;
  const src = target.querySelector('svg:not(.combo-v2-hint-wave)');
  if (!src) return;   // lucide가 아직 아이콘을 그리기 전
  const wave = src.cloneNode(true);
  wave.classList.add('combo-v2-hint-wave');
  wave.setAttribute('aria-hidden', 'true');
  wave.querySelectorAll('.is-on').forEach(function (el) { el.classList.remove('is-on'); });
  target.appendChild(wave);
}

// 완료 1회 기록(완주 화면 진입 시). 클리어 횟수에서 멈춤. 이번 완료로 호를 마지막까지 채워 레벨이 클리어되면 true
function comboV2RecordClear(lv) {
  if (!lv || !COMBO_V2_REQ[parseInt(lv, 10)]) return false;
  const prog = _comboV2ProgLoad();
  const before = prog[lv] || 0;
  prog[lv] = Math.min(_comboV2ClearAt(lv), before + 1);
  _comboV2ProgSave(prog);
  _comboV2PendingFill = prog[lv] > before ? { lv: lv, arc: prog[lv] - 1 } : null;   // 클리어 횟수 초과 기록은 채울 호가 없음
  if (prog[lv] > before) _comboV2SyncPush({ t: 'lv', lv: lv });   // 서버에도 완료 1회 기록(실패하면 대기열에 남아 다시 보냄)
  _comboV2RenderProgress();
  const cleared = before < _comboV2ClearAt(lv) && prog[lv] >= _comboV2ClearAt(lv);
  if (cleared) {   // 퀘스트 달성 보고(소급 없음 — 클리어하는 이 순간만). 반복 퀘스트용 클리어 1회 + 종합(키) 레벨이면 1회성 퀘스트용 종합 클리어
    _comboV2SyncPush({ t: 'q', k: 'clear' });
    const c = parseInt(lv, 10);
    if (parseInt(lv.split('-')[1], 10) === COMBO_V2_REQ[c]) _comboV2SyncPush({ t: 'q', k: 'key', ch: c });
  }
  return cleared;
}

// 클리어 후 선택 화면으로 돌아왔을 때 새로 채워진 도넛 호가 그려지는 연출(easeOutQuart 600ms) + 끝난 직후 도넛(레벨 번호 포함)이 살짝 커졌다 작아짐.
// 원래 호는 회색 그대로 두고, 같은 모양의 챔터색 호(복제)를 위에서 시계 방향으로 키운다. 끝나면 실제 상태를 그림(다음 레벨 해금 포함).
let _comboV2PendingFill = null;   // { lv, arc } — 저장은 됐지만 아직 화면에 안 그린 완료 1회
let _comboV2FillAnim = null;
function _comboV2PlayPendingFill() {
  const pf = _comboV2PendingFill;
  if (!pf) return;
  const card = document.querySelector('#combo-v2-body .combo-v2-level[data-level="' + pf.lv + '"]');
  const svg = card && card.querySelector('.combo-v2-donut svg');
  const base = svg && svg.querySelectorAll('.combo-v2-donut-arc')[pf.arc];
  const finish = function (bump) {
    if (_comboV2PendingFill !== pf) return;   // 이미 취소·정리됨
    _comboV2PendingFill = null;
    _comboV2FillAnim = null;
    _comboV2RenderProgress();
    if (bump) _comboV2Bump(card);
  };
  if (!base || !base.animate) { finish(); return; }
  const clone = base.cloneNode(false);
  clone.classList.add('is-on');
  clone.style.strokeDashoffset = getComputedStyle(base).strokeDashoffset;   // 복제본은 nth-child 규칙을 못 받으므로 원본 오프셋을 그대로
  svg.appendChild(clone);
  const a = clone.animate([{ strokeDasharray: '0.01 119.37' }, { strokeDasharray: _comboV2ArcDash(_comboV2ClearAt(pf.lv)).join(' ') }], { duration: 600, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
  _comboV2FillAnim = a;
  a.onfinish = function () { clone.remove(); finish(true); };   // 다 채워진 직후에만 커졌다 작아지는 효과
  a.oncancel = function () { clone.remove(); finish(false); };
}
// 호가 채워진 직후 도넛(안의 레벨 번호 포함)이 약간 커졌다 돌아옴 — 값이 올랐다는 느낌
function _comboV2Bump(card) {
  const donut = card.querySelector('.combo-v2-donut');
  if (donut && donut.animate) donut.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-in-out' });
}
// 선택 화면이 슬라이드로 돌아온 뒤에 호출(전환이 없는 환경이면 바로)
function _comboV2AfterReturn(fn) {
  const sel = document.getElementById('combo-view-select-v2');
  if (!sel || getComputedStyle(sel).transitionDuration === '0s') { fn(); return; }
  sel.addEventListener('transitionend', function h(e) {
    if (e.target !== sel || e.propertyName !== 'transform') return;
    sel.removeEventListener('transitionend', h);
    fn();
  });
}
// 연출 중단(다른 레벨 진입·이탈) — 실제 상태를 바로 그림
function _comboV2CancelPendingFill() {
  if (_comboV2FillAnim) { _comboV2FillAnim.cancel(); return; }
  if (_comboV2PendingFill) { _comboV2PendingFill = null; _comboV2RenderProgress(); }
}

// 개발 빌드 전용 도구: 전체 열기 토글 / 진행 초기화
function _comboV2DevBar() {
  if (!APP_VERSION.includes('_dev') || document.getElementById('combo-v2-devbar')) return;
  const bar = document.createElement('div');
  bar.id = 'combo-v2-devbar';
  bar.className = 'combo-v2-devbar';
  bar.innerHTML = '<button type="button" data-act="unlock"></button><button type="button" data-act="reset">진행 초기화</button>';
  const sync = function () { bar.querySelector('[data-act="unlock"]').textContent = _comboV2DevUnlocked() ? '전체 열기 해제' : '전체 열기'; };
  bar.addEventListener('click', function (e) {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'unlock') { try { localStorage.setItem(COMBO_V2_DEV_UNLOCK_KEY, _comboV2DevUnlocked() ? '0' : '1'); } catch (_) {} }
    if (act === 'reset') { try { localStorage.removeItem(_comboV2ProgKey()); localStorage.removeItem(_comboV2SyncQKey()); } catch (_) {} }   // 서버에 이미 올라간 기록은 지워지지 않음(다음 접속 때 다시 병합)
    sync();
    _comboV2RenderProgress();
  });
  sync();
  document.body.appendChild(bar);
}
function _comboV2DevBarSync() {   // 문제 화면에서는 숨김
  const bar = document.getElementById('combo-v2-devbar');
  if (bar) bar.hidden = _comboV2InQuiz;
}

// ── 챕터 건너뛰기 테스트 ──
// 잠긴 챕터 N의 카드를 누르면 직전 챕터(N-1)의 종합(키) 레벨 문제를 푼다. 오답이 3개가 되면 바로 실패, 2개 이하로 끝까지 풀면 통과 →
// 그 종합 레벨이 클리어 처리되어 챕터 N이 열린다. 피크 소모·환급 없음, 오답풀이 없음. 통과해도 앞 필수 레벨(N-1 챕터의 1~5)은 그대로.
const COMBO_V2_SKIP_MAX_WRONG = 2;   // 오답 3개째에 실패 → 통과 허용은 2개까지
let _comboV2TestMode = null;         // 진행 중 테스트 {to, level} — comboV2EnterQuiz가 정하고 세션(s.test)이 이어받음
function _comboV2StartSkipTest(n) {
  const lv = (n - 1) + '-' + COMBO_V2_REQ[n - 1];
  const cfg = COMBO_V2_LEVELS[lv];
  if (!cfg) return;
  const card = document.querySelector('#combo-v2-body .combo-v2-level[data-level="' + lv + '"]');
  const titleEl = card && card.querySelector('.combo-v2-level-title');
  const label = { num: lv, name: titleEl ? titleEl.textContent : '' };
  _playConfirmSfx();
  _comboV2SkipPending = { cfg: cfg, label: label, test: { to: n, level: lv } };
  document.getElementById('combo-v2-skip-text').textContent = '건너뛰기 테스트를 통과하면 ' + n + '장부터 시작해요!';
  const page = document.getElementById('combo-v2-skip-page');
  _comboV2SkipTok++;
  page.classList.remove('is-out');
  page.hidden = false;
}
// 안내 페이지 닫기(멱등) — fade면 서서히, 아니면 즉시
let _comboV2SkipPending = null;   // 안내 페이지가 떠 있는 동안 시작할 테스트 정보
let _comboV2SkipTok = 0;
function _comboV2SkipPageClose(fade) {
  _comboV2SkipPending = null;
  const page = document.getElementById('combo-v2-skip-page');
  if (!page || page.hidden) return;
  const tok = ++_comboV2SkipTok;
  if (!fade) { page.hidden = true; page.classList.remove('is-out'); return; }
  page.classList.add('is-out');
  page.addEventListener('animationend', function h(e) {
    if (e.target !== page) return;
    page.removeEventListener('animationend', h);
    if (tok !== _comboV2SkipTok) return;   // 그 사이 다시 열렸거나 닫힘
    page.hidden = true;
    page.classList.remove('is-out');
  });
}
document.getElementById('combo-v2-skip-start')?.addEventListener('click', function () {
  const p = _comboV2SkipPending;
  if (!p) return;
  _playConfirmSfx();
  comboV2EnterQuiz(p.cfg, p.label, { test: p.test });   // 문제 화면이 슬라이드로 들어오는 동안 안내 페이지는 서서히 걷힘
  _comboV2SkipPageClose(true);
});
document.getElementById('combo-v2-skip-cancel')?.addEventListener('click', function () {
  _playSfx('cancel.mp3');
  _comboV2SkipPageClose(true);
});
document.getElementById('combo-v2-body')?.addEventListener('click', function (e) {
  const ch = e.target.closest('.combo-v2-chapter--skip');
  if (ch) _comboV2StartSkipTest(parseInt(ch.dataset.chapter, 10));
});

// 통과: 챕터 N을 해금만 한다 — 완료 횟수(클리어 진행도)는 채우지 않음(퀘스트 보상은 유저가 직접 클리어한 레벨에만).
// 이 테스트는 챕터 N-1 종합 레벨의 역할이라 N-1 선택 구간 첫 레벨이 열리고, 열린 챕터 N 아래 챕터들의 필수 구간은 _comboV2LevelOpen이 전부 열어 준다. 이미 쌓인 진행도는 그대로 유지.
function comboV2SkipPass(to) {
  const prog = _comboV2ProgLoad();
  const skips = _comboV2Skips(prog);
  if (skips.indexOf(to) < 0) skips.push(to);
  prog._skips = skips.sort(function (x, y) { return x - y; });
  delete prog._skip;
  _comboV2ProgSave(prog);
  _comboV2PendingFill = null;
  _comboV2RenderProgress();
  _comboV2SyncPush({ t: 'skip', ch: to });
}
// 결과 화면(통과/실패) — 완주 화면 오버레이를 문구만 바꿔 재사용
function _comboV2TestEnd(pass) {
  const s = _comboV2Sess, t = s.test;
  _comboV2SoundStop();
  if (pass) comboV2SkipPass(t.to);
  document.getElementById('combo-v2-clear-title').textContent = pass ? '건너뛰기 통과!' : '아쉽게 통과하지 못했어요';
  document.getElementById('combo-v2-clear-level').textContent = pass ? t.to + '장으로 건너뛰었어요' : (t.to - 1) + '장 종합 문제에서 오답이 3개가 됐어요';
  document.getElementById('combo-v2-clear-praise').textContent = pass ? '오답 ' + s.wrong.length + '개로 통과했어요. 정말 잘했어요!' : '다시 도전하거나, 레벨을 차례로 풀어봐도 좋아요';
  document.getElementById('combo-v2-clear-refund').hidden = true;
  document.querySelector('#combo-v2-clear .combo-v2-clear-trophy').hidden = !pass;
  _comboV2ClearOn = true;
  const scene = _comboV2OverlayShow('combo-v2-clear');
  if (!scene) { comboV2ExitQuiz(); return; }
  if (pass) _playSfx('reward.mp3'); else comboPlaySound('wrong');
  _comboV2SeqPlay(scene, 0, null);
  if (pass) _comboV2Confetti();
}

// ── 서버 동기화(대기열 + 병합) — 진행도는 DB가 기준, 로컬은 캐시 ──
// RPC 규약(서버 SQL은 별도): get_combo_progress() → {ok, levels:{"1-1":n,...}, skips:[3,5]} / record_combo_level(p_level) → {ok, done, cleared, first_clear} / record_combo_skip(p_chapter) → {ok, skips:[...]}
// 로그인 상태에서만 동작(비로그인은 로컬만). 기록은 로컬에 먼저 반영하고 대기열에 쌓아 순서대로 보냄 — RPC가 실패(네트워크·미배포)해도 대기열이 남아 다음에 다시 보낸다.
// 병합은 항상 큰 값 쪽(GREATEST): 로컬 값을 서버에 그대로 덮어쓰지 않는다.
function _comboV2SyncAuthed() {
  const a = typeof getStoredAuth === 'function' ? getStoredAuth() : null;
  return !!(a && a.token && a.userId);
}
function _comboV2SyncQKey() {
  const a = typeof getStoredAuth === 'function' ? getStoredAuth() : null;
  return 'chorditor_combo_sync_q_v1_' + ((a && a.userId) || 'anon');
}
function _comboV2SyncQLoad() {
  try { const q = JSON.parse(localStorage.getItem(_comboV2SyncQKey())); return Array.isArray(q) ? q : []; } catch (_) { return []; }
}
function _comboV2SyncQSave(q) {
  try { localStorage.setItem(_comboV2SyncQKey(), JSON.stringify(q)); } catch (_) {}
}
function _comboV2SyncPush(op) {
  if (!_comboV2SyncAuthed()) return;
  const q = _comboV2SyncQLoad();
  q.push(op);
  _comboV2SyncQSave(q);
  _comboV2SyncFlush();
}
// 서버 값을 로컬에 큰 값 기준으로 합침. 바뀐 게 있으면 true
function _comboV2MergeServer(srv) {
  const prog = _comboV2ProgLoad();
  let changed = false;
  Object.keys((srv && srv.levels) || {}).forEach(function (lv) {
    const v = Math.min(srv.levels[lv] | 0, COMBO_V2_REQ[parseInt(lv, 10)] ? _comboV2ClearAt(lv) : 0);
    if (v > (prog[lv] || 0)) { prog[lv] = v; changed = true; }
  });
  if (srv && Array.isArray(srv.skips)) {   // 건너뛴 챕터 목록은 합집합
    const mine = _comboV2Skips(prog);
    srv.skips.forEach(function (n) { if (n >= 2 && n <= 9 && mine.indexOf(n) < 0) { mine.push(n); changed = true; } });
    if (changed) { prog._skips = mine.sort(function (x, y) { return x - y; }); delete prog._skip; }
  }
  if (changed) _comboV2ProgSave(prog);
  return changed;
}
let _comboV2Syncing = false;
async function _comboV2SyncFlush() {
  if (_comboV2Syncing || !_comboV2SyncAuthed()) return;
  _comboV2Syncing = true;
  try {
    for (;;) {
      const q = _comboV2SyncQLoad();
      if (!q.length) break;
      const op = q[0];
      const r = op.t === 'q' ? await _peakRpc('report_combo_quest_event', { p_kind: op.k, p_chapter: op.ch || null })   // 퀘스트 달성 보고(shared.js 퀘스트, supabase/combo_quest.sql)
        : op.t === 'skip' ? await _peakRpc('record_combo_skip', { p_chapter: op.ch }) : await _peakRpc('record_combo_level', { p_level: op.lv });
      if (!r || !r.ok) break;   // 실패 — 대기열 유지(다음 접속·다음 기록 때 재시도)
      q.shift();
      _comboV2SyncQSave(q);
      if (op.t !== 'q') _comboV2MergeServer(op.t === 'skip' ? { skips: r.skips } : { levels: { [op.lv]: r.done } });
    }
  } finally {
    _comboV2Syncing = false;
  }
}
// 접속 시: 대기열 비우기 → 서버 진행도 받아 병합 → (서버에 없는 로컬 진행분은 한 번 올림) → 다시 그림
async function comboV2SyncPull() {
  if (!_comboV2SyncAuthed()) return;
  await _comboV2SyncFlush();
  if (_comboV2SyncQLoad().length) return;   // 아직 못 보낸 기록이 있으면 병합하지 않음(중복 방지)
  const r = await _peakRpc('get_combo_progress');
  if (!r || !r.ok || !r.levels) return;
  const before = _comboV2MaxChapter(_comboV2ProgLoad());
  const changed = _comboV2MergeServer(r);
  const local = _comboV2ProgLoad();
  const ops = [];   // 로컬에만 있는 진행분(기존 로컬 진행 / 오프라인 기록)을 서버에 올림
  Object.keys(local).forEach(function (lv) {
    if (lv.charAt(0) === '_') return;
    for (let k = (r.levels[lv] | 0); k < local[lv]; k++) ops.push({ t: 'lv', lv: lv });
  });
  const serverSkips = Array.isArray(r.skips) ? r.skips : [];
  _comboV2Skips(local).forEach(function (n) { if (serverSkips.indexOf(n) < 0) ops.push({ t: 'skip', ch: n }); });
  if (ops.length) { _comboV2SyncQSave(ops); _comboV2SyncFlush(); }
  if (changed) {
    _comboV2RenderProgress();
    if (_comboV2MaxChapter(_comboV2ProgLoad()) !== before) _comboV2PositionToLatest(true);
  }
}

// ── 접속 시 가장 마지막으로 열린 챕터의 시작점으로 열기 ──
// 열린 챕터가 많아도 매번 위에서부터 스크롤하지 않게, 선택 화면을 열 때 열린 최고 챕터 카드를 스티키 헤드 바로 아래에 맞추고 챕터 점도 그 챕터로 둔다.
// onlyIfUntouched: 서버 병합 뒤 재배치 — 유저가 아직 스크롤·점 이동을 안 했을 때만.
let _comboV2InitTop = null;
function _comboV2PositionToLatest(onlyIfUntouched) {
  const main = document.getElementById('combo-view-select-v2');
  if (!main) return;
  if (onlyIfUntouched && (_comboV2InitTop === null || main.scrollTop !== _comboV2InitTop)) return;
  const n = _comboV2MaxChapter(_comboV2ProgLoad());
  _comboV2Cur = n;
  _comboV2UpdateDots();
  if (n > 1) _comboV2ScrollToChapter(n, true);   // 1장이면 원래 위치 그대로
  _comboV2InitTop = main.scrollTop;
}

_comboV2RenderProgress();
requestAnimationFrame(function () { requestAnimationFrame(function () { _comboV2PositionToLatest(false); }); });   // 레이아웃·폰트가 자리 잡은 뒤
comboV2SyncPull();
_comboV2DevBar();
