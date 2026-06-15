// ═══════════════════════════════════════════════════════════════
// lesson.js — 레슨 (Ch.1 세부1: 기타 코드 소개)
// 탭/버튼으로 한 화면씩 진행. 친근한 말투. 최소 정보.
// ═══════════════════════════════════════════════════════════════

// 한 줄씩 진행하는 대사 비트
// diagramsFirst:true → 다이어그램 먼저 등장, 이후 텍스트 페이드인
const LESSON_BEATS = [
  { text: '기타의 세계에 오신 것을 \n환영합니다!' },
  { text: '여러분은 처음 기타를 잡고\n해보고 싶은 게 무엇인가요?' },
  { text: '역시 직접 소리를 내보는 것이겠죠?' },
  { text: '이번 챕터에서는 아래의\n두 가지 코드를 연주해 볼 거예요!', diagrams: true, diagramsFirst: true },
  { text: '직접 터치해서\n어떤 소리가 나는지 들어볼까요?', diagrams: true },
  { text: 'A, E 코드는 앞으로 가장 중요한 코드가 될 거예요.\n꼭 기억해 주세요!', diagrams: true },
  { text: '그런데... 이걸 어떻게\n잡아야 하는 걸까요?', diagrams: true },
  { text: '다음엔 이 그림을\n해석하는 방법을 알려드릴게요!', diagrams: true, btn: '레슨 완료', last: true },
];

// 타이밍 상수
// 텍스트 비트 간 딜레이 — 자동 진행/버튼 활성/다이어그램 후 텍스트 모두 통일
const LESSON_BEAT_DELAY  = 2200;
const LESSON_READ_DELAY  = LESSON_BEAT_DELAY;  // 수동 비트 버튼 활성화 지연
const LESSON_AUTO_DELAY  = LESSON_BEAT_DELAY;  // 자동 비트 → 다음 비트 간격
const DIAGRAM_TEXT_DELAY = LESSON_BEAT_DELAY;  // diagramsFirst: 텍스트 등장 지연
const DIAGRAM_A_DELAY    = 600;   // A 다이어그램 등장 지연
const DIAGRAM_E_DELAY    = 2000;  // E 다이어그램 등장 지연

let _lessonIdx = -1;
let _lessonBtnTimer = null;
let _lessonAutoTimer = null;
let _diagramsShown = false;

// 코드 데이터 (VoicingCanvas는 1현→6현 순서 입력)
const LESSON_VOICINGS = {
  a: { frets: [0, 2, 2, 2, 0, null], source: 'static' },
  e: { frets: [0, 0, 1, 2, 2, 0],   source: 'static' },
};

function closeLesson() {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'episode.html'; }, 260);
  } else {
    location.href = 'episode.html';
  }
}

// 다음 비트로
function lessonNext() {
  const btn = document.getElementById('lesson-next');
  if (btn && btn.disabled) return;

  const beat = LESSON_BEATS[_lessonIdx];
  if (beat && beat.last) { closeLesson(); return; }

  _lessonShow(_lessonIdx + 1);
}

// 이전 비트로 (딜레이 없이 즉시 표시)
function lessonPrev() {
  if (_lessonIdx <= 0) return;
  _lessonShow(_lessonIdx - 1, true);
}

// 이전 버튼 활성/비활성
function _updatePrevBtn() {
  const prev = document.getElementById('lesson-prev');
  if (prev) prev.disabled = (_lessonIdx <= 0);
}

function _lessonShow(idx, back) {
  if (idx >= LESSON_BEATS.length) return;
  _lessonIdx = idx;
  const beat = LESSON_BEATS[idx];
  _updatePrevBtn();

  const textEl = document.getElementById('lesson-text');
  const btn = document.getElementById('lesson-next');
  clearTimeout(_lessonBtnTimer);
  clearTimeout(_lessonAutoTimer);

  // 다이어그램: 최초 진입은 순차 연출, 이후/뒤로는 즉시 토글
  if (beat.diagrams && !_diagramsShown) {
    _diagramsShown = true;
    _lessonRevealDiagrams();
  } else {
    _lessonToggleDiagrams(beat.diagrams);
  }

  // 뒤로 이동: 딜레이·다이어그램 단계연출 없이 즉시 표시 + 버튼 즉시 활성
  if (back) {
    if (textEl) {
      textEl.classList.remove('lesson-text--in');
      textEl.innerHTML = beat.text.replace(/\n/g, '<br>');
      void textEl.offsetWidth;
      textEl.classList.add('lesson-text--in');
    }
    if (btn) {
      btn.disabled = false;
      btn.classList.add('lesson-next--active');
      btn.textContent = beat.btn || '다음';
    }
    return;
  }

  if (beat.diagramsFirst) {
    // 텍스트 내용 설정만, 아직 invisible (--in 미부여)
    if (textEl) {
      textEl.classList.remove('lesson-text--in');
      textEl.innerHTML = beat.text.replace(/\n/g, '<br>');
    }
  } else {
    // 대사 교체 (페이드 슬라이드)
    if (textEl) {
      textEl.classList.remove('lesson-text--in');
      textEl.innerHTML = beat.text.replace(/\n/g, '<br>');
      void textEl.offsetWidth;
      textEl.classList.add('lesson-text--in');
    }
  }

  if (beat.auto) {
    // 자동 연속 재생: 버튼 비활성 유지, 일정 시간 후 다음 비트로
    if (btn) {
      btn.disabled = true;
      btn.classList.remove('lesson-next--active');
      btn.textContent = '다음';
    }
    _lessonAutoTimer = setTimeout(() => { _lessonShow(idx + 1); }, LESSON_AUTO_DELAY);
    return;
  }

  if (beat.diagramsFirst) {
    // 다이어그램 먼저, 이후 텍스트 페이드인 → 그 후 버튼 활성
    if (btn) {
      btn.disabled = true;
      btn.classList.remove('lesson-next--active');
      btn.textContent = beat.btn || '다음';
    }
    _lessonBtnTimer = setTimeout(() => {
      // 텍스트 페이드인
      if (textEl) { void textEl.offsetWidth; textEl.classList.add('lesson-text--in'); }
      // 텍스트 읽을 여유 후: 자동 다음 비트 or 버튼 활성
      _lessonAutoTimer = setTimeout(() => {
        if (beat.autoAfterText) {
          _lessonShow(idx + 1);
        } else if (btn) {
          btn.disabled = false; btn.classList.add('lesson-next--active');
        }
      }, LESSON_READ_DELAY);
    }, DIAGRAM_TEXT_DELAY);
    return;
  }

  // 수동 진행: 비활성(회색) → 읽을 여유 후 활성(블루)
  if (btn) {
    btn.disabled = true;
    btn.classList.remove('lesson-next--active');
    btn.textContent = beat.btn || '다음';
    _lessonBtnTimer = setTimeout(() => {
      btn.disabled = false;
      btn.classList.add('lesson-next--active');
    }, LESSON_READ_DELAY);
  }
}

// 개방현 MIDI (frets 배열 순서: 1현→6현)
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];

// frets(1현→6현) → 다운스트럼 MIDI 배열(저음 6현 → 고음 1현)
function _lessonChordMidis(frets) {
  const midis = [];
  for (let i = 5; i >= 0; i--) {
    const f = frets[i];
    if (f === null || f === undefined) continue;  // 뮤트
    midis.push(OPEN_MIDI[i] + f);
  }
  return midis;
}

// 다이어그램 탭 → 코드 스트럼
async function _lessonStrum(frets) {
  if (typeof GuitarAudio === 'undefined') return;
  await GuitarAudio.resume();   // 첫 탭: AudioContext 시작 대기 (유실 방지)
  await GuitarAudio.ready();    // 샘플 로드 대기
  GuitarAudio.strumNotes(_lessonChordMidis(frets), 0.05);
}

// 다이어그램 터치 피드백 + 스트럼 바인딩
function _lessonBindTouch(el, frets) {
  if (!el) return;
  const press = () => {
    el.classList.add('lesson-diagram--press');
    _lessonStrum(frets);
  };
  const release = () => el.classList.remove('lesson-diagram--press');
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('pointercancel', release);
}

// 다이어그램 표시/숨김 (즉시) — 앞뒤 이동용
function _lessonToggleDiagrams(show) {
  const a = document.getElementById('lesson-diagram-a');
  const e = document.getElementById('lesson-diagram-e');
  [a, e].forEach(el => {
    if (!el) return;
    el.classList.toggle('lesson-diagram--in', !!show);
  });
}

// A → E 순차 페이드인
function _lessonRevealDiagrams() {
  if (typeof VoicingCanvas !== 'undefined') {
    VoicingCanvas.draw(document.getElementById('lesson-canvas-a'), LESSON_VOICINGS.a, { chordName: 'A', source: 'static', transparent: true });
    VoicingCanvas.draw(document.getElementById('lesson-canvas-e'), LESSON_VOICINGS.e, { chordName: 'E', source: 'static', transparent: true });
  }
  const a = document.getElementById('lesson-diagram-a');
  const e = document.getElementById('lesson-diagram-e');
  _lessonBindTouch(a, LESSON_VOICINGS.a.frets);
  _lessonBindTouch(e, LESSON_VOICINGS.e.frets);
  setTimeout(() => { if (a) a.classList.add('lesson-diagram--in'); }, DIAGRAM_A_DELAY);
  setTimeout(() => { if (e) e.classList.add('lesson-diagram--in'); }, DIAGRAM_E_DELAY);
}

document.addEventListener('DOMContentLoaded', () => {
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

  _lessonShow(0);
});
