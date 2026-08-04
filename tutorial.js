'use strict';
// ═══════════════════════════════════════════════════════════════
// tutorial.js — 퀘스트 체인 튜토리얼
//   진행도(step)는 DB(subscriptions.tutorial_*)가 source of truth,
//   localStorage는 오프라인/미로그인 폴백 미러.
//
//   분기1 (step 0 + 미건너뜀) : 홈 진입 시 시작 모달 자동 노출.
//                               이 상태에선 출석·랜덤피크 모달을 보류시킨다.
//   분기2 (건너뛴 유저)        : 자동 노출 없음. 우상단 물음표 아이콘으로 재진입.
//
//   콘솔 테스트: startTutorial()  강제 시작
//                resetTutorial()  로컬 진행도 초기화(자동 노출 재현용)
// ═══════════════════════════════════════════════════════════════

const Tutorial = (() => {
  const LS_KEY  = 'chorditor_tutorial_state'; // DB 미러 (폴백)
  // 진행 위치(챕터·구간). 페이지가 바뀌어도(user_project.html 등) 이어가기 위한 인계용.
  const RUN_KEY = 'chorditor_tut_run';

  // STEP1 — 코드 에디터. 구간 단위로 순차 구현 중.
  //   title     : 설명 패널 제목
  //   text      : 설명 패널 문구
  //   panel     : 패널 위치 'top' | 'bottom' | 'card-top' (가리면 안 되는 UI 반대편)
  //   target    : 조작 허용 + 펄스 대상 셀렉터. 배열이면 여럿 허용. 없으면 설명만.
  //   pulse     : false=펄스 없음 / 셀렉터=그 대상만 펄스 / 생략=target 전체 펄스
  //   canvasCell: {s,f} 캔버스에서 허용할 칸. 고스트 dot이 여기 표시된다.
  //   setup     : 구간 진입 시 1회 실행(편집 상태 강제 세팅 등)
  //   simulate  : [{s,f}...] 유저가 찍는 것처럼 순서대로 자동 입력. 끝나면 'sim:done'.
  //   optional  : true면 패널에 "이 구간만 넘기기" 버튼을 띄운다(튜토리얼은 계속 진행).
  //   nextLabel : optional 버튼 문구. 기본 '다음에 할게요'.
  //   advanceOn : 이 이벤트가 오면 다음 구간으로 넘어간다.
  const STEP1_STEPS = [
    {
      title: 'STEP1 : 코드 에디터',
      text: '먼저 코드 에디터를 살펴볼게요.\n깜빡이는 곳을 눌러주세요!',
      panel: 'top',
      target: '#home-block-editor',
      advanceOn: 'view:editor',
    },
    {
      title: '코드 만들기',
      text: '지판을 눌러 코드를 만들어요.\n깜빡이는 자리를 눌러보세요!',
      panel: 'card-top',
      target: '#c',
      pulse: false,
      canvasCell: { s: 1, f: 1 }, // 2번줄 1프렛 → A 코드가 Am 으로 바뀐다
      setup: () => {
        // A 코드 (6번줄 뮤트 / 4·3·2번줄 2프렛)
        window.tutorialSetChord?.(
          [{ s: 1, f: 2, n: 1 }, { s: 2, f: 2, n: 2 }, { s: 3, f: 2, n: 3 }],
          {},
          ['open', 'open', 'open', 'open', 'open', 'mute']
        );
      },
      advanceOn: 'dot:1:1',
    },
    {
      title: '소리 듣기',
      text: '이렇게 코드를 만들고 소리를 들어볼 수 있어요!\n재생 버튼을 클릭해 보세요.',
      panel: 'card-top',
      target: '#btn-play-chord',
      advanceOn: 'play',
    },
    {
      // 버퍼 구간 — 유저 입력 없이 A#(1프렛 바레 폼)을 대신 찍어준다.
      // 완성형: 1·5번줄 1프렛 + 2·3·4번줄 3프렛 + 6번줄 뮤트 → 1프렛/3프렛 바레 버튼이 모두 생긴다.
      title: 'A# 코드',
      text: '다음 설명을 위해 제가 A# 코드를 만들어 드릴게요.',
      panel: 'card-top',
      simulate: [
        { s: 0, f: 1 }, // 1번줄 1프렛
        { s: 1, f: 3 }, // 2번줄 3프렛
        { s: 2, f: 3 }, // 3번줄 3프렛
        { s: 3, f: 3 }, // 4번줄 3프렛
        { s: 4, f: 1 }, // 5번줄 1프렛
      ],
      advanceOn: 'sim:done',
    },
    {
      title: '바레',
      text: '한 손가락으로 여러 줄을 한 번에 누르는 걸 바레라고 해요.\n3프렛의 B 버튼을 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="3"]',
      advanceOn: 'barre:3:on',
    },
    {
      title: '바레 해제',
      text: '같은 버튼을 다시 누르면 바레가 풀려요.\n한 번 더 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="3"]',
      advanceOn: 'barre:3:off',
    },
    {
      title: '바레로 코드 완성',
      text: 'A# 코드는 1프렛을 바레로 눌러요.\n1프렛의 B 버튼을 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="1"]',
      advanceOn: 'barre:1:on',
    },
    {
      title: '# / b 바꾸기',
      text: '같은 코드도 A#과 Bb, 두 가지로 부를 수 있어요.\nb 를 눌러 표기를 바꿔 보세요.',
      panel: 'card-top',
      target: '.canvas-wrap-acc-overlay',
      advanceOn: 'acc:flat',
    },
    {
      title: '손가락 번호',
      text: '손가락 번호를 표시할 수도 있어요!\n버튼을 눌러 켜 보세요.',
      panel: 'card-top',
      target: '#btn-finger-num',
      advanceOn: 'fingermode:on',
    },
    // 1프렛 바레는 1번(검지) 그대로 두고, 3프렛 dot 세 개만 2·3·4번으로 바꾸게 한다.
    // 번호 버튼과 캔버스를 동시에 열어주되 펄스는 번호 버튼에만 — 캔버스는 고스트가 자리를 가리킨다.
    {
      title: '손가락 번호',
      text: '검지가 1번, 새끼손가락이 4번이에요. 엄지는 T예요.\n2번을 고른 뒤 4번 줄의 점을 눌러 보세요.',
      panel: 'card-top',
      target: ['#f2', '#c'],
      pulse: '#f2',
      canvasCell: { s: 3, f: 3 },
      advanceOn: 'finger:3:3:2',
    },
    {
      title: '손가락 번호',
      text: '이번엔 3번을 고르고 3번 줄의 점을 눌러 보세요.',
      panel: 'card-top',
      target: ['#f3', '#c'],
      pulse: '#f3',
      canvasCell: { s: 2, f: 3 },
      advanceOn: 'finger:2:3:3',
    },
    {
      title: '손가락 번호',
      text: '마지막으로 4번을 고르고 2번 줄의 점을 눌러 보세요.\n지울 때는 같은 번호로 클릭하면 지울 수 있어요.',
      panel: 'card-top',
      target: ['#f4', '#c'],
      pulse: '#f4',
      canvasCell: { s: 1, f: 3 },
      advanceOn: 'finger:1:3:4',
    },
    {
      // 선택 구간 — 실제로 저장해도 되고 "다음에 할게요"로 넘어가도 된다.
      // 저장 시트 안에서 프리미엄 안내(요금제 시트)로 빠질 수 있어 그쪽도 열어둔다. 안 그러면 갇힌다.
      title: '이미지 저장',
      text: '만든 코드는 이미지로 저장할 수 있어요.\n한번 저장해 보세요. 나중에 해도 괜찮아요.',
      panel: 'card-top',
      target: ['#btn-save-image', '#img-save-modal', '#img-save-backdrop', '#plan-sheet', '#plan-sheet-overlay'],
      pulse: '#btn-save-image',
      optional: true,
      advanceOn: 'imgsave:done',
    },
    {
      // 휠피커는 화면 위쪽에 있으니 패널을 아래로 내려 가리지 않게 한다.
      // 앞 구간에서 저장 시트를 열어둔 채 넘어왔을 수 있어 먼저 닫는다.
      title: '코드 고르기',
      text: '위쪽 휠을 돌려서 코드를 직접 고를 수도 있어요.\n한번 돌려 보세요.',
      panel: 'bottom',
      setup: () => {
        window.closeImgSaveModal?.();
        window.closePlanSheet?.();
      },
      target: '.wheel-picker',
      advanceOn: 'wheel',
    },
    {
      title: '노트에 담기',
      text: '만든 코드는 노트에 담아 모아둘 수 있어요.\n"노트 추가" 버튼을 눌러 보세요.',
      panel: 'card-top',
      target: '#btn-add-to-project',
      // 스크롤이 잠겨 있어 버튼이 화면 밖이면 하이라이트가 안 보인다
      setup: () => {
        document.getElementById('btn-add-to-project')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      advanceOn: 'notesheet:open',
    },
    {
      // 닫기 버튼만 열어둔다 — 목록의 노트를 누르면 코드가 실제로 저장되며 흐름이 끊긴다.
      title: '노트에 담기',
      text: '여기서 담을 노트를 고르면 돼요.\n노트 기능은 다음 스텝에서 알려드릴게요. 닫기를 눌러 주세요.',
      panel: 'card-top',
      target: '.project-sheet-close',
      advanceOn: 'notesheet:close',
    },
  ];

  // STEP2 — 코드 사전. 구간 단위로 순차 구현 중.
  const STEP2_STEPS = [
    {
      title: 'STEP2 : 코드 사전',
      text: '이번엔 코드 사전을 살펴볼게요.\n깜빡이는 곳을 눌러주세요!',
      panel: 'top',
      target: '#home-block-library',
      advanceOn: 'view:library',
    },
    {
      // 목록 전체를 열어 직접 스크롤해서 G를 찾게 한다.
      // (scrollIntoView로 끌어오면 상위 스크롤 컨테이너까지 같이 움직여 레이아웃이 틀어짐)
      title: '근음 고르기',
      text: '왼쪽에서 근음을 고르면 오른쪽에 해당 코드들이 나와요.\nG를 눌러 보세요.',
      panel: 'top', // 근음 목록이 화면 아래쪽이라 패널은 위로

      target: '#lib-root-tabs',
      pulse: false,
      scrollHint: '#lib-root-tabs', // 위아래로 넘길 수 있다는 표시
      advanceOn: 'libroot:G',
    },
    {
      // 카드 영역 전체를 열어 스크롤 가능하게 두고, 펄스는 G 카드에만.
      title: '코드 고르기',
      text: 'G로 시작하는 코드들이에요.\nG를 눌러 보세요.',
      panel: 'top',
      target: '.lib-cards-area',
      pulse: '.lib-card[data-chord="G"]',
      advanceOn: 'libcard:G',
    },
    {
      // 모달 여백을 누르면 닫히므로, 다시 열 수 있게 카드 영역도 함께 열어둔다.
      title: '잡는 법 고르기',
      text: '같은 G라도 잡는 법이 여러 가지예요.\n첫 번째를 눌러 보세요.',
      panel: 'top',
      target: ['#lib-voicing-modal', '.lib-cards-area'],
      pulse: '#lib-voicing-grid .lib-card[data-vpos="0"]',
      advanceOn: 'libvoicing:0',
    },
    {
      // #lib-fingering-nav는 보이싱이 아니라 entry.fingerings(손가락 번호 배리에이션)를 넘긴다.
      // G Open은 3·1·2번 / 4·2·3번 두 벌이 들어 있어 이 구간이 성립한다.
      title: '손가락 번호',
      text: '같은 자리를 잡아도 손가락 번호는 다를 수 있어요.\n화살표로 넘겨 보세요.',
      panel: 'top',
      target: '#lib-fingering-nav',
      advanceOn: 'libfinger:1',
    },
    {
      // 두 버튼을 함께 가리키되(펄스는 그룹) 실제 조작은 재생만 허용.
      // 이미지 저장까지 열면 저장 시트로 빠져 흐름이 끊긴다 — STEP1에서 이미 해본 기능이라 언급만.
      title: '소리 듣기',
      text: '여기서도 소리를 듣고 이미지로 저장할 수 있어요.\n재생 버튼을 눌러 보세요.',
      panel: 'bottom',
      target: '#lib-btn-play',
      pulse: '.lib-canvas-side-btns',
      advanceOn: 'libplay',
    },
    {
      title: '검색으로 찾기',
      text: '찾는 코드가 있으면 검색이 더 빨라요.\nG7을 입력하고 확인을 눌러 보세요.',
      panel: 'bottom',
      target: '#lib-search',
      advanceOn: 'libsearch:open:G7',
    },
    {
      // 결과 목록은 스크롤될 수 있어 모달 전체를 열어두고, 펄스는 첫 카드에만.
      // ※ 결과를 골라도 모달은 닫히지 않는다 — 다음 구간 setup에서 closeLibSearchModal() 필요.
      title: '검색으로 찾기',
      text: '검색 결과에서 바로 고를 수 있어요.\n첫 번째를 눌러 보세요.',
      panel: 'top',
      target: '#lib-search-modal',
      pulse: '#lib-search-cards .lib-card:first-child',
      advanceOn: 'libsearchpick:0',
    },
    {
      // 위치만 짚는 구간 — target을 비워 조작은 막고 pulse로 버튼만 가리킨다.
      // 누르면 에디터로 넘어가 흐름이 끊기고, STEP1에서 이미 해본 동작이라 반복 가치도 없다.
      title: '에디터로 가져가기',
      text: '고른 코드를 에디터로 가져가 편집할 수 있어요.\nSTEP1에서 배운 그 에디터예요.',
      panel: 'top',
      pulse: '#lib-btn-to-editor',
      optional: true,
      nextLabel: '다음',
      // 검색 결과 모달이 액션바 아래를 덮고 있어 먼저 닫아야 버튼이 보인다
      setup: () => { window.closeLibSearchModal?.(); },
    },
    {
      // 여기도 위치만 짚는다 — 누르면 노트 선택 시트가 열려 흐름이 끊긴다.
      title: '노트에 저장',
      text: '마음에 드는 코드는 노트에 담아둘 수 있어요.\nSTEP1에서 배운 것과 똑같아요.',
      panel: 'top',
      pulse: '#lib-btn-save-note',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 마무리 — 완료 사실을 알리고 다음 스텝을 예고한다. 하이라이트 없이 설명만.
      title: 'STEP2 완료',
      text: '코드 사전은 여기까지예요!\n다음 STEP3에서는 만든 코드를 모아두는 노트를 배워볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '보상 받기',
    },
  ];

  // STEP3 — 노트. 구간 단위로 순차 구현 중.
  const STEP3_STEPS = [
    {
      title: 'STEP3 : 노트',
      text: '이번엔 노트를 만들어 볼게요.\n아래 노트 탭을 눌러 주세요.',
      panel: 'top',
      target: '#nav-projects',
      advanceOn: 'tab:projects',
    },
    {
      // 샌드박스 덕분에 무료 3개 한도에 안 걸린다(목록이 비어 있는 상태로 시작)
      title: '노트 만들기',
      text: '노트는 코드와 가사를 함께 적어두는 곳이에요.\n오른쪽 위 + 버튼을 눌러 주세요.',
      panel: 'bottom',
      target: '#btn-create-note',
      advanceOn: 'notecreate:open',
    },
    {
      // 이름은 우리가 채워준다 — 입력칸은 열지 않고 "만들기"만 누르게 한다.
      // (promptCreateProject가 rAF에서 input.focus()를 걸므로 그 뒤에 blur해야 키보드가 안 뜬다)
      title: '노트 만들기',
      text: '이름은 "새 노트"로 채워 뒀어요.\n만들기를 눌러 주세요.',
      panel: 'top',
      target: '#btn-confirm-create-note',
      setup: () => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const el = document.getElementById('create-project-name-input');
          if (el) { el.value = '새 노트'; el.blur(); }
        }));
      },
      advanceOn: 'notecreate:done',
    },
    {
      // 여기서부터 user_project.html — 페이지가 바뀌므로 resume()이 이어받아 그린다
      title: '편집 시작',
      text: '새 노트가 만들어졌어요.\n연필 버튼을 눌러 편집을 시작해 주세요.',
      panel: 'bottom',
      target: '#project-mode-btn',
      advanceOn: 'editmode:on',
    },
  ];

  // 스텝(챕터) 목록. no는 DB의 tutorial_step 값과 1:1로 대응한다.
  const CHAPTERS = [
    {
      no: 1,
      steps: STEP1_STEPS,
      // enterFirst: 0번 구간이 있는 화면 / enter: 중간 구간부터 시작할 때 진입할 화면
      enterFirst: () => window.enterFromHome?.('home', true),
      enter:      () => window.enterFromHome?.('editor', true),
      doneTitle: 'STEP 1 완료!',
      doneDesc:  '코드 에디터를 다 둘러봤어요.\n보상을 받아 가세요.',
      nextLabel: '코드 사전 배우기',
    },
    {
      no: 2,
      steps: STEP2_STEPS,
      enterFirst: () => window.enterFromHome?.('home', true),
      enter:      () => window.enterFromHome?.('library', true),
      doneTitle: 'STEP 2 완료!',
      doneDesc:  '코드 사전을 다 둘러봤어요.\n보상을 받아 가세요.',
      nextLabel: '노트 배우기',
    },
    {
      no: 3,
      steps: STEP3_STEPS,
      // 실제 노트·DB를 건드리지 않도록 이 스텝 동안만 샌드박스를 켠다
      onStart:    () => window.tutorialSandboxStart?.(),
      enterFirst: () => { window.switchTab?.('home', true); return window.enterFromHome?.('home', true); },
      enter:      () => window.switchTab?.('projects', true),
      doneTitle: 'STEP 3 완료!',
      doneDesc:  '노트를 만들어 곡 한 줄을 완성했어요.\n보상을 받아 가세요.',
      nextLabel: '다음 스텝 계속하기',
    },
  ];

  let _state  = null; // { step, skipped, completed }
  let _loaded = false;
  let _chapter = 0;   // CHAPTERS 인덱스
  let _idx     = 0;   // 현재 챕터 내 구간 인덱스
  let _running = false;

  function _chap()  { return CHAPTERS[_chapter]; }
  function _steps() { return _chap()?.steps || []; }

  // 아직 구간이 채워진 다음 챕터가 있는가 (완료 모달의 "이어서 하기" 노출 조건)
  function _hasNextChapter() {
    return !!CHAPTERS[_chapter + 1]?.steps?.length;
  }

  // ── 상태 저장소 ────────────────────────────────────────────
  function _localGet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { step: 0, skipped: false, completed: null };
  }

  function _localSet(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  // ── 진행 위치 인계 (페이지 이동 대응) ──────────────────────
  function _runSave() {
    try { sessionStorage.setItem(RUN_KEY, JSON.stringify({ chapter: _chapter, idx: _idx })); } catch (_) {}
  }
  function _runRead() {
    try { return JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null'); } catch (_) { return null; }
  }
  function _runClear() {
    try { sessionStorage.removeItem(RUN_KEY); } catch (_) {}
  }
  // 튜토리얼이 진행 중인가 (다른 페이지에서도 판정 가능 — 샌드박스 유지 여부에 쓴다)
  function isRunning() { return _running || !!_runRead(); }

  // DB 우선, 실패(미로그인·오프라인)면 로컬 폴백.
  // step은 되돌아가지 않도록 두 값 중 큰 쪽을 취한다.
  async function loadState() {
    const local = _localGet();
    let merged  = local;

    if (typeof _peakRpc === 'function') {
      const r = await _peakRpc('get_tutorial_state');
      if (r) {
        merged = {
          step:      Math.max(r.step || 0, local.step || 0),
          skipped:   !!r.skipped || !!local.skipped,
          completed: r.completed || local.completed || null,
        };
      }
    }

    _state  = merged;
    _loaded = true;
    _localSet(merged);
    return merged;
  }

  function getState() { return _state || _localGet(); }

  async function setStep(step) {
    const s = getState();
    const next = { ...s, step: Math.max(s.step || 0, step) };
    _state = next;
    _localSet(next);
    if (typeof _peakRpc === 'function') await _peakRpc('set_tutorial_step', { p_step: step });
    return next;
  }

  // ── 자동 시작 판정 ─────────────────────────────────────────
  // step1도 완료하지 않았고 건너뛴 적도 없는 유저만 자동 노출.
  function shouldAutoStart() {
    const s = getState();
    return (s.step || 0) === 0 && !s.skipped;
  }

  // ── 시작 안내 모달 ─────────────────────────────────────────
  function openStartModal() {
    const overlay = document.getElementById('tutorial-start-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    if (typeof _playSfx === 'function') _playSfx('page.mp3');
    if (typeof analytics !== 'undefined') analytics.track('tutorial_start_modal_viewed', {});
  }

  function closeStartModal() {
    const overlay = document.getElementById('tutorial-start-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // ── 홈 진입 오케스트레이터 ─────────────────────────────────
  // 튜토리얼 자동 노출 대상이면 출석·랜덤피크 모달을 보류한다.
  // (건너뛰기/완료 시 _releaseHomeFlow에서 이어서 실행)
  async function runHomeEntryFlow() {
    // 노트 페이지에서 홈으로 돌아온 경우 — 진행 위치를 이어받고 출석 플로우는 띄우지 않는다
    if (resume()) return;

    // 진행 중이 아닌데 샌드박스가 남아 있으면(앱을 도중에 닫은 경우) 정리.
    // 안 지우면 실제 노트 목록이 빈 것처럼 보인다.
    if (typeof tutorialSandboxEnd === 'function') tutorialSandboxEnd();

    await loadState();
    if (shouldAutoStart()) { openStartModal(); return; }
    if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
  }

  // 보류해둔 홈 진입 플로우(출석 도장 → 마일스톤 상자 → 랜덤피크) 실행
  function _releaseHomeFlow() {
    if (typeof runDailyAttendanceFlow === 'function') runDailyAttendanceFlow();
  }

  // 튜토리얼 이탈 시 홈 화면으로 복귀시킨 뒤 보류 플로우 실행.
  // 노트 페이지(user_project.html)에는 탭 전환 함수가 없으므로 페이지 이동으로 대체한다.
  function _returnHomeAndRelease() {
    if (typeof switchTab !== 'function') { location.href = 'home.html'; return; }
    switchTab('home', true);
    if (typeof enterFromHome === 'function') enterFromHome('home', true);
    _releaseHomeFlow();
  }

  // ── 시작 / 건너뛰기 ────────────────────────────────────────
  function startFromModal() {
    closeStartModal();
    if (typeof analytics !== 'undefined') analytics.track('tutorial_started', { step: getState().step || 0 });
    start();
  }

  // ── 조작 차단 ──────────────────────────────────────────────
  // z-index 스태킹에 휘둘리지 않도록 오버레이가 아닌 capture 리스너로 막는다.
  // 통과 대상: 튜토리얼 레이어 자신(건너뛰기 버튼) + 현재 구간의 target. 그 외는 전부 차단.
  //
  // 탭뿐 아니라 스크롤·스와이프·휠피커 회전·키보드까지 막아야 하므로 move/wheel/key 계열도 포함한다.
  // touchmove·wheel은 리스너가 passive면 preventDefault가 무시되므로 passive:false로 등록해야 한다.
  const _GUARD_EVENTS = [
    'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'mousedown', 'mouseup', 'click', 'dblclick',
    'wheel', 'keydown', 'keyup', 'contextmenu',
  ];
  const _GUARD_OPTS = { capture: true, passive: false };

  // target은 문자열/배열 모두 허용 — 항상 배열로 정규화해서 쓴다.
  function _targetSels(step) {
    const t = step?.target;
    if (!t) return [];
    return Array.isArray(t) ? t : [t];
  }

  function _guardAllows(target) {
    const layer = document.getElementById('tut-layer');
    if (layer && layer.contains(target)) return true;
    return _targetSels(_steps()[_idx]).some(sel => {
      const el = document.querySelector(sel);
      return el && el.contains(target);
    });
  }

  function _guard(e) {
    if (_guardAllows(e.target)) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }

  function _installGuard() {
    _GUARD_EVENTS.forEach(ev => document.addEventListener(ev, _guard, _GUARD_OPTS));
    // 네이티브 스크롤·핀치줌은 이벤트 취소만으론 새는 경로가 있어 CSS로도 잠근다.
    document.body.classList.add('tut-lock');
  }
  function _removeGuard() {
    _GUARD_EVENTS.forEach(ev => document.removeEventListener(ev, _guard, true));
    document.body.classList.remove('tut-lock');
  }

  // ── 고스트 dot ─────────────────────────────────────────────
  // 캔버스 위에 겹쳐 두는 DOM 요소. 캔버스를 다시 그리지 않아도 깜빡일 수 있고
  // 물리→CSS 변환은 바레 버튼과 같은 방식(실측 비율)을 쓴다.
  function _hideGhost() {
    const g = document.getElementById('tut-ghost');
    if (g) g.hidden = true;
  }

  function _showGhost(cell) {
    const canvas = document.getElementById('c');
    const inner  = canvas?.parentElement;
    if (!canvas || !inner || !canvas.style.width) return;

    let g = document.getElementById('tut-ghost');
    if (!g) {
      g = document.createElement('div');
      g.id = 'tut-ghost';
      inner.appendChild(g);
    }
    const ds   = parseFloat(canvas.style.width) / canvas.width;
    const size = SH() * 0.95 * ds; // 실제 dot 지름과 동일
    const cx   = (TL() + (cell.f - 0.5) * FW()) * ds;
    const cy   = (TT() + cell.s * SH()) * ds;
    g.style.width  = size + 'px';
    g.style.height = size + 'px';
    g.style.left   = (cx - size / 2) + 'px';
    g.style.top    = (cy - size / 2) + 'px';
    g.hidden = false;
  }

  // ── 자동 입력 시뮬레이션 ───────────────────────────────────
  // 고스트 dot을 잠깐 띄웠다가(누르는 시늉) 실제 입력을 반영 — 유저가 직접 찍는 것처럼 보이게 한다.
  let _simTimers = [];

  function _clearSim() {
    _simTimers.forEach(clearTimeout);
    _simTimers = [];
  }

  const SIM_LEAD_MS  = 500; // 설명 읽을 여유
  const SIM_HOLD_MS  = 320; // 고스트 표시 시간
  const SIM_GAP_MS   = 200; // 찍은 뒤 다음 탭까지
  const SIM_TAIL_MS  = 400; // 마지막 입력 후 다음 구간까지

  function _runSimulation(step) {
    _clearSim();
    let t = SIM_LEAD_MS;
    const alive = () => _running && _steps()[_idx] === step;

    step.simulate.forEach(cell => {
      _simTimers.push(setTimeout(() => { if (alive()) _showGhost(cell); }, t));
      t += SIM_HOLD_MS;
      _simTimers.push(setTimeout(() => {
        if (!alive()) return;
        _hideGhost();
        window.tutorialTapDot?.(cell.s, cell.f);
      }, t));
      t += SIM_GAP_MS;
    });

    _simTimers.push(setTimeout(() => { if (alive()) notify('sim:done'); }, t + SIM_TAIL_MS));
  }

  // ── 세로 스와이프 유도 힌트 ────────────────────────────────
  // 목록 중앙에 손가락 원을 띄워 위아래로 훑게 하고, 진입 시 한 번 넛지한다.
  // (원 = 어디를 만질지, 넛지 = 실제로 움직인다는 증거)
  let _nudgeAborted = false;
  let _hintRaf      = null;
  let _hintTimer    = null;

  function _hideScrollHint() {
    const hint = document.getElementById('tut-scrollhint');
    if (hint) hint.hidden = true;
    if (_hintRaf)   { cancelAnimationFrame(_hintRaf); _hintRaf = null; }
    if (_hintTimer) { clearTimeout(_hintTimer);       _hintTimer = null; }
    _nudgeAborted = true;
  }

  // 화면 전환 슬라이드 중에 재면 transform이 적용된 중간 위치가 나온다.
  // 한 번만 재지 않고 활성 중엔 매 프레임 대상 위치를 따라간다 — 슬라이드·스크롤·리사이즈 전부 커버.
  const HINT_NUDGE_DELAY_MS = 400; // 뷰 슬라이드(250ms)가 끝난 뒤에 넛지

  function _showScrollHint(sel) {
    const el   = document.querySelector(sel);
    const hint = document.getElementById('tut-scrollhint');
    if (!el || !hint) return;

    const follow = () => {
      const r = el.getBoundingClientRect();
      if (r.height >= 1) {
        hint.style.left = (r.left + r.width / 2) + 'px';
        hint.style.top  = (r.top + r.height / 2) + 'px';
        hint.hidden = false;
      }
      _hintRaf = requestAnimationFrame(follow);
    };
    follow();

    _hintTimer = setTimeout(() => _nudgeScroll(el), HINT_NUDGE_DELAY_MS);
  }

  // 살짝 내렸다 되돌리는 1회 넛지. 유저가 만지면 즉시 중단해 조작을 방해하지 않는다.
  const NUDGE_DIST_PX = 28;
  const NUDGE_MS      = 900;

  function _nudgeScroll(el) {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 4) return; // 스크롤할 게 없으면 넛지도 없다

    const start = el.scrollTop;
    const dist  = Math.min(NUDGE_DIST_PX, max - start);
    if (dist <= 0) return;

    _nudgeAborted = false;
    const abort = () => { _nudgeAborted = true; };
    el.addEventListener('pointerdown', abort, { once: true });
    el.addEventListener('wheel',       abort, { once: true });

    const t0 = performance.now();
    const tick = (t) => {
      if (_nudgeAborted) return;
      const p = Math.min(1, (t - t0) / NUDGE_MS);
      el.scrollTop = start + dist * Math.sin(p * Math.PI); // 0 → dist → 0
      if (p < 1) requestAnimationFrame(tick);
      else el.removeEventListener('pointerdown', abort);
    };
    requestAnimationFrame(tick);
  }

  // ── 구간 렌더 ──────────────────────────────────────────────
  function _clearTarget() {
    document.querySelectorAll('.tut-target').forEach(el => {
      el.classList.remove('tut-target');
      if (el.dataset.tutPos) { el.style.position = ''; delete el.dataset.tutPos; }
    });
    document.querySelectorAll('.tut-allow').forEach(el => el.classList.remove('tut-allow'));
  }

  // z-index는 static 요소엔 안 먹는다. static일 때만 relative를 인라인으로 부여 —
  // 이미 absolute/fixed로 배치된 대상은 건드리지 않아야 레이아웃이 안 깨진다.
  function _markTarget(el) {
    el.classList.add('tut-target');
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
      el.dataset.tutPos = '1';
    }
  }

  // 허용/펄스 표시를 현재 구간 기준으로 다시 입힌다.
  // 목록이 다시 그려져 대상 DOM이 교체되면(근음 탭 등) 표시가 날아가므로 repaint()로 재호출한다.
  function _applyTargets(step) {
    _clearTarget();
    // .tut-allow — body.tut-lock의 touch-action:none을 여기서만 되돌려
    // 목록·휠피커처럼 스크롤이 필요한 대상이 실제로 움직이게 한다.
    _targetSels(step).forEach(sel => document.querySelector(sel)?.classList.add('tut-allow'));
    if (step.pulse === false) return;
    // pulse에 셀렉터를 주면 그 대상만, 없으면 허용 대상 전체에 펄스
    const pulseSels = typeof step.pulse === 'string' ? [step.pulse] : _targetSels(step);
    pulseSels.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) _markTarget(el);
    });
  }

  // 앱 쪽에서 목록을 다시 그린 뒤 호출 — 교체된 DOM에 하이라이트를 되살린다
  function repaint() {
    if (!_running) return;
    const step = _steps()[_idx];
    if (step) _applyTargets(step);
  }

  function _render() {
    const step  = _steps()[_idx];
    const layer = document.getElementById('tut-layer');
    if (!step || !layer) return;

    _runSave(); // 구간이 바뀔 때마다 위치 기록 — 페이지가 넘어가도 여기서 이어진다
    layer.classList.remove('hidden');

    const panel = document.getElementById('tut-panel');
    panel.classList.toggle('tut-panel--top',      step.panel === 'top');
    panel.classList.toggle('tut-panel--card-top', step.panel === 'card-top');
    panel.classList.toggle('tut-panel--bottom',   step.panel === 'bottom');

    document.getElementById('tut-title').textContent = step.title || '';
    document.getElementById('tut-text').textContent  = step.text;

    const nextBtn = document.getElementById('tut-next');
    if (nextBtn) {
      nextBtn.classList.toggle('hidden', !step.optional);
      nextBtn.textContent = step.nextLabel || '다음에 할게요';
    }

    _applyTargets(step);

    step.setup?.();

    // 캔버스 리사이즈(rAF)가 끝난 뒤라야 좌표가 맞는다
    _clearSim();
    _hideGhost();
    _hideScrollHint();
    if (step.scrollHint) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showScrollHint(step.scrollHint);
      }));
    }
    if (step.canvasCell) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _showGhost(step.canvasCell);
      }));
    }
    if (step.simulate) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (_running && _steps()[_idx] === step) _runSimulation(step);
      }));
    }
  }

  function _teardown() {
    _running = false;
    _runClear();
    // 샌드박스는 튜토리얼이 멈추는 순간 반드시 해제 — 남으면 실제 노트 목록이 빈 것처럼 보인다
    if (typeof tutorialSandboxEnd === 'function') tutorialSandboxEnd();
    _removeGuard();
    _clearSim();
    _clearTarget();
    _hideGhost();
    _hideScrollHint();
    document.getElementById('tut-layer')?.classList.add('hidden');
  }

  // ── 진행 제어 ──────────────────────────────────────────────
  // 저장된 진행도(step)에 이어서 시작. step=1이면 STEP2부터.
  // 이미 다 끝냈거나 아직 구간이 안 채워진 챕터면 시작하지 않는다.
  function start() {
    const from = CHAPTERS.findIndex(c => c.no > (getState().step || 0));
    _chapter = from === -1 ? 0 : from;
    if (!_steps().length) return;
    _chap().onStart?.();
    _idx     = 0;
    _running = true;
    _installGuard();
    _render();
  }

  // 페이지가 바뀐 뒤(user_project.html 진입/복귀) 저장된 위치에서 이어서 그린다.
  // 반환값: 이어받았으면 true — 호출부는 이때 자기 초기 플로우를 건너뛴다.
  function resume() {
    const run = _runRead();
    if (!run) return false;
    _chapter = run.chapter;
    _idx     = run.idx;
    if (!_steps()[_idx]) { _runClear(); return false; } // 구간 구성이 바뀐 경우 방어
    _running = true;
    _installGuard();
    _render();
    return true;
  }

  function next() {
    if (!_running) return;
    if (_idx >= _steps().length - 1) { _finishStep(); return; }
    _idx++;
    _render();
  }

  // ── 스텝 완료 ──────────────────────────────────────────────
  async function _finishStep() {
    const chap = _chap();
    _teardown();
    if (typeof analytics !== 'undefined') analytics.track('tutorial_step_completed', { step: chap.no });

    const s = getState();
    const merged = { ...s, step: Math.max(s.step || 0, chap.no) };
    _state = merged;
    _localSet(merged);

    // 모달을 먼저 띄운다 — 서버 응답이 늦거나 실패해도 완료 화면은 반드시 보이게.
    _openDoneModal(chap);

    // 보상 금액은 서버가 정한다(클라가 액수를 보내지 않음). 재지급은 서버에서 차단.
    if (typeof _peakRpc === 'function') {
      const r = await _peakRpc('complete_tutorial_step', { p_step: chap.no });
      if (r?.ok && r.reward > 0) _showDoneReward(r.reward);
    }
  }

  function _openDoneModal(chap) {
    const overlay = document.getElementById('tutorial-done-overlay');
    if (!overlay) { _returnHomeAndRelease(); return; }

    document.getElementById('tutorial-done-title').textContent   = chap.doneTitle;
    document.getElementById('tutorial-done-message').textContent = chap.doneDesc;

    // 보상 줄은 서버 응답이 오면 그때 채운다 (이미 받은 스텝이면 끝까지 감춰짐)
    document.getElementById('tutorial-done-reward').classList.add('hidden');

    // 이어서 할 챕터가 준비돼 있을 때만 "계속하기"를 띄운다
    const contBtn = document.getElementById('tutorial-done-continue');
    const hasNext = _hasNextChapter();
    contBtn.classList.toggle('hidden', !hasNext);
    if (hasNext) contBtn.textContent = chap.nextLabel || '다음 스텝 계속하기';
    document.getElementById('tutorial-done-later').textContent = hasNext ? '나중에 할게요' : '받기';

    overlay.classList.remove('hidden');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
  }

  function _showDoneReward(reward) {
    document.getElementById('tutorial-done-reward-count').textContent = '+' + reward + ' 상자';
    document.getElementById('tutorial-done-reward').classList.remove('hidden');
  }

  function _hideDoneModal() {
    document.getElementById('tutorial-done-overlay')?.classList.add('hidden');
    if (typeof renderPeakboxBadge === 'function') renderPeakboxBadge();
  }

  // 완료 모달 → 다음 스텝 바로 이어가기
  async function continueNext() {
    _hideDoneModal();
    if (typeof analytics !== 'undefined') analytics.track('tutorial_step_continued', { step: _chap().no });
    _chapter++;
    if (!_steps().length) { _returnHomeAndRelease(); return; }
    _chap().onStart?.();

    // 앞 스텝이 끝난 화면(에디터 등)에 머물러 있으므로 0번 구간이 있는 화면으로 되돌린다
    if (_chap().enterFirst) {
      await _chap().enterFirst();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    _idx     = 0;
    _running = true;
    _installGuard();
    _render();
  }

  // 완료 모달 → 여기서 잠시 중단. 건너뛰기와 달리 skipped 플래그는 세우지 않는다
  // (다음 접속 때 남은 스텝을 이어서 안내할 수 있도록).
  function closeDoneModal() {
    _hideDoneModal();
    _returnHomeAndRelease();
  }

  // 앱 쪽에서 상태 변화를 알려주는 창구 (예: notify('view:editor'))
  function notify(evt) {
    if (!_running) return;
    if (_steps()[_idx]?.advanceOn === evt) next();
  }

  // 캔버스 클릭 허용 칸 — home.js 클릭 핸들러가 게이트로 쓴다.
  function canvasCell() {
    return _running ? (_steps()[_idx]?.canvasCell || null) : null;
  }

  // 시작 모달에서든 스텝 중간에서든 동일 경로. 진행도(step)는 보존한다.
  async function skip() {
    closeStartModal();
    _teardown();
    const s = getState();
    const next = { ...s, skipped: true };
    _state = next;
    _localSet(next);
    if (typeof analytics !== 'undefined') analytics.track('tutorial_skipped', { step: s.step || 0 });
    if (typeof _peakRpc === 'function') _peakRpc('skip_tutorial');
    _returnHomeAndRelease();
  }

  // ── 콘솔 테스트용 ──────────────────────────────────────────
  // 특정 스텝의 특정 구간부터 강제 시작. 앞 구간의 setup·simulate를 즉시 재생해
  // 캔버스 상태를 최대한 맞춘다. 단 바레·샵플랫·손가락번호처럼 유저가 눌러야
  // 바뀌는 상태는 재현되지 않으니, 그 구간을 볼 땐 직접 눌러 도달할 것.
  async function startAt(stepNo = 1, idx = 0) {
    const ci = CHAPTERS.findIndex(c => c.no === stepNo);
    if (ci === -1 || !CHAPTERS[ci].steps.length) return;

    _teardown();
    _chapter = ci;
    _chap().onStart?.();
    const steps  = _steps();
    const target = Math.max(0, Math.min(idx, steps.length - 1));

    // 해당 구간이 있는 화면으로 먼저 이동 — 캔버스·목록이 있어야 좌표가 잡힌다
    const enterFn = target > 0 ? _chap().enter : _chap().enterFirst;
    if (enterFn) {
      await enterFn();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    for (let i = 0; i < target; i++) {
      steps[i].setup?.();
      steps[i].simulate?.forEach(cell => window.tutorialTapDot?.(cell.s, cell.f));
    }

    _idx     = target;
    _running = true;
    _installGuard();
    _render();
  }

  function reset() {
    _state  = { step: 0, skipped: false, completed: null };
    _loaded = false;
    _localSet(_state);
  }

  return {
    loadState, getState, setStep, shouldAutoStart,
    runHomeEntryFlow, openStartModal, closeStartModal,
    startFromModal, start, startAt, resume, isRunning, next, notify, repaint, canvasCell, skip, reset,
    continueNext, closeDoneModal,
    CHAPTERS,
  };
})();

// ── 전역 노출 (HTML onclick / 콘솔) ────────────────────────────
if (typeof window !== 'undefined') {
  window.Tutorial         = Tutorial;
  window.runHomeEntryFlow = () => Tutorial.runHomeEntryFlow();
  // startTutorial()        → 저장된 진행도에 이어서 처음부터
  // startTutorial(1, 7)    → STEP1의 8번째 구간부터 (0부터 셈)
  window.startTutorial    = (stepNo, idx) => {
    Tutorial.closeStartModal();
    if (stepNo === undefined) Tutorial.start();
    else                      Tutorial.startAt(stepNo, idx || 0);
  };
  window.resetTutorial    = () => Tutorial.reset();
}
