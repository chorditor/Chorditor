// ═══════════════════════════════════════════════════════════════
// chord-combo.js — 코드 조합 훈련 페이지
// ═══════════════════════════════════════════════════════════════

// ── 뷰 전환 상태 ─────────────────────────────────────────────
let _comboInQuiz = false;

// 괄호 표기(텐션·(b5) 등)를 위첨자로 작게 표기 — 코드명/라벨 텍스트에 섞인 (...) 전부 <sup>로 감쌈
function _ccFormatB5(text) {
  return String(text).replace(/\([^)]*\)/g, m => `<sup>${m}</sup>`);
}

// ── 제출 정/오답 효과음 (코드 맞추기 퀴즈 chord-name-quiz.js의 벨/차임 사운드 그대로 이식) ──
let _comboAudioCtx  = null;
let _comboSfxMaster = null;

function _comboGetAudioCtx() {
  if (!_comboAudioCtx) {
    _comboAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_comboAudioCtx.state === 'suspended') _comboAudioCtx.resume();
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
  if (_comboInQuiz) {
    showLeavePracticeModal(exitComboQuiz);
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

// ── 시작하기 (피크 3 소모 → 퀴즈 뷰 진입) ───────────────────
// 1~8장 지원 (1~6장 알고리즘 생성, 7·8장은 손으로 뽑은 20개 진행 중 랜덤).
async function comboStartTraining(e) {
  const card = e?.target.closest('.combo-card');
  const chapter = card?.dataset.chapter || '1';
  if (!['1', '2', '3', '4', '5', '6', '7', '8'].includes(chapter)) return;
  _playSfx('pop.mp3');
  // TODO: 피크 소모 임시 중단 — 재개 시 주석 해제
  // if (!(await consumePeak(3))) return;
  const activeCard = card.querySelector('.combo-difficulty-card.active');
  const difficulty = activeCard?.dataset.difficulty === 'high' ? 'high'
    : activeCard?.dataset.difficulty === 'mid' ? 'mid' : 'low';
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

// ── 현재 장에 맞는 문제 렌더 (2·3·4장 모두 교체형만) ──
// 매 문제 렌더 전 퀴즈 뷰를 순정 HTML로 통째 복원 → 이전 문제/이전 장이 남긴 어떤 DOM 변경도
// 무조건 초기화된 상태에서 렌더 시작. (개별 항목 리셋 추적 방식은 새 장 추가 시 계속 새어서 폐기.)
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
}

// ── 트레이 카드 배열 규칙 ──
//   ① 1줄은 폭이 허용하는 만큼(최대 4개) 항상 꽉 채움
//   ② 3줄이 되면 2번째 줄이 1·3번째 줄 이하 → 남는 카드를 반씩 나누되 작은 쪽을 가운데로
const COMBO_TRAY_MAX_PER_ROW = 4;
function _comboTrayRowCounts(n, maxPerRow) {
  const MAX = maxPerRow || COMBO_TRAY_MAX_PER_ROW;
  if (n <= 0) return [];
  if (n <= MAX) return [n];
  const first = MAX;
  const rest  = Math.min(n, MAX * 3) - first;
  if (rest <= MAX) return [first, rest];
  const mid = Math.floor(rest / 2);
  return [first, mid, rest - mid];
}

// ── 한 줄에 실제로 몇 장까지 안 넘치고 들어가는지 폭으로 측정 (최대 4) ──
// 카드 폭이 코드명 길이에 따라 제각각(C vs D#m7(b5))이라, 어떤 카드가 어느 줄에 오든
// 안전하도록 "가장 넓은 k장" 조합 기준으로 판정. 4장이 들어가면 항상 4장을 씀.
function _comboMeasureMaxPerRow(items, blocksWrap) {
  blocksWrap.innerHTML = '';
  const widths = items.map(({ chord }) => {
    const block = document.createElement('div');
    block.className = 'combo-block';
    block.innerHTML = _ccFormatB5(chord);
    blocksWrap.appendChild(block);
    return block.offsetWidth;
  });
  const containerW = blocksWrap.clientWidth;
  const gap = parseFloat(getComputedStyle(blocksWrap).columnGap || getComputedStyle(blocksWrap).gap) || 0;
  blocksWrap.innerHTML = '';

  const widest = [...widths].sort((a, b) => b - a);
  for (let k = COMBO_TRAY_MAX_PER_ROW; k > 1; k--) {
    const need = widest.slice(0, k).reduce((a, b) => a + b, 0) + gap * (k - 1);
    if (need <= containerW) return k;
  }
  return 1;
}

// fitted 배열을 위 행 배열 규칙대로 blocksWrap에 렌더(줄 사이엔 강제 줄바꿈 스페이서 삽입).
function _comboRenderTrayBlocks(items, blocksWrap) {
  const rows = _comboTrayRowCounts(items.length, _comboMeasureMaxPerRow(items, blocksWrap));
  blocksWrap.innerHTML = '';
  let idx = 0;
  rows.forEach((count, r) => {
    for (let i = 0; i < count && idx < items.length; i++) {
      const { degree, chord } = items[idx++];
      const block = document.createElement('div');
      block.className = 'combo-block';
      block.innerHTML = _ccFormatB5(chord);
      block.dataset.degree = degree;
      block.dataset.chord = chord;
      blocksWrap.appendChild(block);
    }
    if (r < rows.length - 1) {
      const br = document.createElement('div');
      br.className = 'combo-block-break';
      blocksWrap.appendChild(br);
    }
  });
}

// ── 트레이 후보를 실제 렌더 폭 기준 최대 3줄까지만 채워지도록 동적으로 개수 조절 ──
// candidates: {degree,chord}[] 전체 후보. mustInclude: 반드시 포함되어야 할 정답 도수 배열.
// 순서를 1번만 섞어서 그 순서 그대로 측정+렌더(측정 후 다시 섞으면 블록마다 폭이 달라서
// 줄바꿈 지점이 어긋나는 버그가 있었음 — 측정에 쓴 순서를 최종 순서로 그대로 씀).
function _comboFitTray(candidates, mustInclude, blocksWrap) {
  const mustSet = new Set(mustInclude);
  const must = candidates.filter(c => mustSet.has(c.degree));
  const rest = candidates.filter(c => !mustSet.has(c.degree));
  const ordered = _ccShuffle([...must, ...rest]);

  const capacity = _comboMeasureMaxPerRow(ordered, blocksWrap) * 3; // 최대 3줄
  let kept = ordered.slice(0, capacity);
  // 잘려나간 정답이 있으면 마지막 자리와 바꿔서라도 반드시 포함시킴
  const missingMust = must.filter(m => !kept.some(k => k.degree === m.degree));
  if (missingMust.length) {
    kept = kept.slice(0, Math.max(0, kept.length - missingMust.length)).concat(missingMust);
  }

  blocksWrap.innerHTML = '';
  return kept;
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
  if (blocksWrap) {
    const fitted = _comboFitTray(q.tray, q.degrees, blocksWrap);
    _comboRenderTrayBlocks(fitted, blocksWrap);
  }
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
      promptEl.textContent = promptText || (q.substituteLabels
        ? `표시된 부분을 순서대로 ${q.substituteLabels.join(' · ')}(으)로 바꿔보세요`
        : `표시된 부분을 ${q.substituteLabel}(으)로 바꿔보세요`);
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
  }
  if (type === 'placement') _comboUpdateBracket(null);

  const blocksWrap = document.getElementById('combo-quiz-blocks');
  if (blocksWrap) {
    const mustInclude = type === 'placement' ? q.degrees : (q.substituteDegrees || [q.substituteDegree]);
    const fitted = _comboFitTray(q.tray, mustInclude, blocksWrap);
    _comboRenderTrayBlocks(fitted, blocksWrap);
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
  document.querySelector('.combo-top-bar')?.classList.add('combo-top-bar--quiz');
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
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  _comboResetDragState();
  _comboInQuiz = false;
  document.getElementById('combo-view-quiz')?.classList.add('quiz-view--right');
  document.getElementById('combo-view-select')?.classList.remove('quiz-view--left');
  const prog = document.getElementById('combo-quiz-progress');
  if (prog) prog.style.display = 'none';
  const currency = document.getElementById('topbar-currency');
  if (currency) currency.style.display = '';
  document.querySelector('.combo-top-bar')?.classList.remove('combo-top-bar--quiz');
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

  _playSfx('pop.mp3');

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

  console.log('chord-combo: 제출 결과 —', allCorrect ? '정답' : '오답');
  comboPlaySound(allCorrect ? 'correct' : 'wrong');

  _comboSubmitted = true;
  const btn = document.getElementById('combo-quiz-submit');
  const isLast = _comboQuestionIndex >= COMBO_QUESTIONS_PER_SESSION - 1;
  if (btn) btn.textContent = isLast ? '완료' : '다음';
}

// ── 채점 후 각 슬롯에 정답 코드의 운지 다이어그램 표시 ──────────
// 보이싱은 _comboResolveVoicing 한 곳에서만 결정 → 화면의 운지와 클릭 사운드가 항상 같은 보이싱.
const COMBO_DIAGRAM_W = 64; // CSS px (비율은 VoicingCanvas BASE_W:BASE_H 고정)
function _comboShowAnswerDiagrams() {
  if (typeof VoicingCanvas === 'undefined') return;
  const dpr = window.devicePixelRatio || 1;
  document.querySelectorAll('#combo-quiz-answer .combo-answer-slot').forEach((slot, i) => {
    slot.querySelector('.combo-answer-diagram')?.remove();
    const voicing = _comboResolveVoicing(_comboCorrectDegreeForSlot(i), slot.dataset.answerChord);
    if (!voicing) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'combo-answer-diagram';
    slot.insertBefore(canvas, slot.firstChild); // 슬롯 최상단(코드블록 위)
    VoicingCanvas.draw(canvas, voicing, { ratio: (COMBO_DIAGRAM_W * dpr) / VoicingCanvas.BASE_W, transparent: true });
    canvas.style.width  = COMBO_DIAGRAM_W + 'px';
    canvas.style.height = Math.round(COMBO_DIAGRAM_W * VoicingCanvas.BASE_H / VoicingCanvas.BASE_W) + 'px';
  });
}

// ── 다음 문제로 (COMBO_QUESTIONS_PER_SESSION문제 다 풀면 선택 뷰로 복귀) ──
function comboNextQuestion() {
  _playTap();
  if (typeof GuitarAudio !== 'undefined' && GuitarAudio.stop) GuitarAudio.stop();
  if (_comboQuestionIndex >= COMBO_QUESTIONS_PER_SESSION - 1) {
    exitComboQuiz();
    return;
  }
  _comboQuestionIndex++;
  _comboSubmitted = false;
  renderComboQuestion();
  resetComboSubmitBtn();
  updateComboQuizProgress(_comboQuestionIndex);
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
  if (_comboDragClone) { _comboDragClone.remove(); _comboDragClone = null; }
  _comboDragBlock = null;
  _comboDragFrom  = null;
  _comboDragSourceType = null;
}

function _comboBlockPointerMove(e) {
  if (!_comboDragClone) return;
  _comboDragClone.style.left = (e.clientX - _comboDragOffX) + 'px';
  _comboDragClone.style.top  = (e.clientY - _comboDragOffY) + 'px';
}

function _comboBlockPointerUp(e) {
  document.removeEventListener('pointermove', _comboBlockPointerMove);
  if (_comboDragClone) { _comboDragClone.remove(); _comboDragClone = null; }

  const block      = _comboDragBlock;
  const from        = _comboDragFrom;
  const sourceType  = _comboDragSourceType;
  _comboDragBlock = null;
  _comboDragFrom  = null;
  _comboDragSourceType = null;
  if (!block) return;
  block.classList.remove('combo-block--source-hidden');

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
  const tensionMatch = _comboChapter === '6' ? (chordStr || '').match(/\([^)]*\)$/) : null;
  const tension      = tensionMatch ? tensionMatch[0] : null;

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
  return _comboGetLowestFretVoicing(rootSemitone, quality, _comboKeyIdx, bass, tension);
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

function _comboBlockPointerDown(e) {
  const block = e.target.closest('.combo-block');
  if (!block) return;
  e.preventDefault();

  // 교체형 잠긴 슬롯의 고정 코드는 드래그 금지 — 사운드만 재생
  const parentSlot = block.parentElement?.closest?.('.combo-answer-slot');
  if (parentSlot && parentSlot.dataset.locked === '1') {
    comboPlayBlockSound(block);
    return;
  }

  _comboDragStartX = e.clientX;
  _comboDragStartY = e.clientY;

  _comboDragBlock = block;
  _comboDragFrom  = block.parentElement;
  _comboDragSourceType = (_comboDragFrom.id === 'combo-quiz-blocks') ? 'tray' : 'slot';

  const rect = block.getBoundingClientRect();
  _comboDragOffX = e.clientX - rect.left;
  _comboDragOffY = e.clientY - rect.top;

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

  // 트레이에서 시작한 드래그는 원본을 그대로 두어(복사) 개수가 줄지 않게 함
  if (_comboDragSourceType === 'slot') block.classList.add('combo-block--source-hidden');

  document.addEventListener('pointermove', _comboBlockPointerMove);
  document.addEventListener('pointerup', _comboBlockPointerUp, { once: true });
}

function initComboDragDrop() {
  const wrap = document.querySelector('.combo-quiz-wrap');
  if (!wrap) return;
  wrap.addEventListener('pointerdown', _comboBlockPointerDown);
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
  const viewportCenter = window.innerWidth / 2;
  track.querySelectorAll('.combo-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.left + rect.width / 2;
    const dist = Math.abs(cardCenter - viewportCenter) / window.innerWidth;
    const scale = Math.max(COMBO_CAROUSEL_MIN_SCALE, 1 - dist / COMBO_CAROUSEL_FALLOFF * (1 - COMBO_CAROUSEL_MIN_SCALE));
    card.style.transform = `scale(${scale})`;
  });
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

  // 슬라이드업 진입 애니메이션
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  lucide.createIcons();
  initTutorialCarousel();
  initDifficultySelector();
  initChapterCarousel();
  initComboDragDrop();
  _comboSnapshotQuizWrap(); // 순정 퀴즈 뷰 HTML 저장 (장 전환 시 전체 복원용)

  // 페이지 커버 제거
  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }
});
