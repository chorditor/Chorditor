'use strict';
// ═══════════════════════════════════════════════════════════════
// tutorial-steps.js — 튜토리얼 구간 데이터 (엔진은 tutorial.js)
//
//   이 파일에 로직은 없다. "무엇을 띄우고 무엇을 기다릴지"에 대한 선언만 있다.
//     · 문구·순서·조건을 고칠 때  → 이 파일
//     · 진행 방식 자체를 고칠 때  → tutorial.js
//
//   tutorial.js보다 먼저 로드되어야 한다.
// ═══════════════════════════════════════════════════════════════

const TUTORIAL_CHAPTERS = (() => {
  // ── 구간(step) 속성 ────────────────────────────────────────
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

  // ── 노트 편집 화면 셀렉터·헬퍼 ─────────────────────────────
  // 줄 컨테이너 id가 project-lines-<프로젝트id>라 id를 모르는 상태에서 접두어로 지목한다.
  const TUT_LINES     = '[id^="project-lines-"]';
  const TUT_LINE_NTH  = (n) => `${TUT_LINES} > .project-line:nth-of-type(${n + 1})`;
  const TUT_FIRST_LINE_TEXT = `${TUT_LINE_NTH(0)} .line-text`;
  // 노트 목록에서 시드 노트를 이름으로 지목 (목록 순서가 중요→즐겨찾기→최근이라 위치로는 못 잡음)
  const TUT_NOTE_MAIN = '.projects-item[data-name="작은 별"]';

  // 여러 줄 붙여넣기를 보여주기 위해 튜토리얼이 대신 복사해 주는 가사
  const TUT_LYRICS_2 = '반짝반짝 작은 별\n아름답게 비치네';

  // n번째 줄에 실제로 입력된 가사 (공백 정리 후)
  function _lineTextAt(n) {
    const el = document.querySelector(`${TUT_LINE_NTH(n)} .line-text`);
    return (el?.innerText || '').replace(/\s+/g, ' ').trim();
  }

  // 마디 정보 수정 모달이 원하는 값으로 맞춰졌는가 (저장 전 폼 상태 기준)
  function _meterModalIs({ bpm, num, den, bars }) {
    const $ = (id) => document.getElementById(id);
    return $('row-meter-bpm-input')?.value.trim() === bpm
        && $('row-meter-num-val')?.value.trim()   === num
        && $('row-meter-den-val')?.textContent.trim() === den
        && !!document.querySelector(`#row-meter-bars-toggle input[data-bars="${bars}"]`)?.checked;
  }

  // 클립보드에 넣어준다. setup은 next()와 같은 콜스택에서 실행되므로
  // "복사하기" 버튼 클릭 제스처가 살아 있는 동안 호출된다 → 권한 프롬프트 없이 통과.
  function _copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => _copyViaTextarea(text));
    } else {
      _copyViaTextarea(text);
    }
  }

  // 폴백 — body.tut-lock이 user-select:none이라 인라인으로 풀어줘야 select()가 먹는다
  function _copyViaTextarea(text) {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;user-select:text;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }

  // STEP1 — 코드 에디터. 구간 단위로 순차 구현 중.
  const STEP1_STEPS = [
    {
      // 인사·주제 소개 전용 — 조작 없음. 시작 모달 바로 뒤라 보상 언급은 반복이라 뺐다.
      // A는 에디터가 첫 챕터라 여기서 인사한다. B는 훈련소가 첫 챕터라 인사가 그쪽에 있다.
      variant: 'A',
      title: '{S} | 코드 에디터',
      text: '안녕하세요, 코디터에 오신 것을 환영해요!\n{S}에서는 코드 에디터 사용법을 배워볼 거예요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // B 전용 — 에디터가 3번 자리(사전 다음)라 인사 대신 앞 챕터에서 이어받는다.
      variant: 'B',
      title: '{S} | 코드 에디터',
      text: '방금 사전에서 코드를 골라봤죠?\n{S}에서는 코드를 직접 만들고 바꿔볼 거예요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} | 코드 에디터',
      text: '우선, 화면에 보이는 코드 에디터를 눌러 주세요!',
      panel: 'top',
      target: '#home-block-editor',
      advanceOn: 'view:editor',
    },
    {
      // 이 구간부터 A코드를 화면에 세팅해 둔다 — 이후 버퍼 구간들이 실물을 보며 설명한다.
      title: '코드 에디터',
      text: '이곳은 코드 다이어그램을 편집해서 저장하고\n활용해보는 곳이에요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
      setup: () => {
        // A 코드 (6번줄 뮤트 / 4·3·2번줄 2프렛)
        window.tutorialSetChord?.(
          [{ s: 1, f: 2, n: 1 }, { s: 2, f: 2, n: 2 }, { s: 3, f: 2, n: 3 }],
          {},
          ['open', 'open', 'open', 'open', 'open', 'mute']
        );
      },
    },
    {
      // target을 주면 안 된다 — 캔버스가 통째로 열려 설명을 듣는 중에 눌러 A 코드가 바뀐다.
      // 이후 구간들이 전부 "화면의 A 코드"를 전제로 쓰여 있어 한 번 깨지면 설명과 화면이 어긋난다.
      title: '코드 에디터',
      text: '화면에 보이는 코드는 A 코드로 설명할게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 하이라이트 대신 직접 라벨링 — 캔버스에 그려진 것 옆에 좌표를 계산해 붙이므로
      // stringNumbers/fretNumArrow 라는 별도 오버레이로 처리한다.
      // 줄과 프렛을 각각 자기 설명과 짝지어 보여주려고 구간을 둘로 나눴다.
      // optional을 빼서 기본 비활성 상태로 시작 — 라벨이 전부 등장한 뒤 engine이
      // enableNext()로 풀어준다. 다 뜨기 전에 넘기지 못하게 막는 것.
      // 개방현·뮤트 구간과 같은 이유로 target을 주지 않는다 — 캔버스가 열리면
      // 설명만 듣는 중에 눌러서 코드가 바뀐다. 라벨은 캔버스 좌표로 직접 그려 target이 필요 없다.
      title: '줄',
      text: '가로선은 기타 줄이에요.\n가장 얇은 줄이 1번, 가장 두꺼운 줄이 6번이에요.',
      panel: 'top',
      pulse: false,
      stringNumbers: true,
      nextLabel: '다음',
    },
    {
      title: '프렛',
      text: '세로선은 프렛이에요.\n몇 번째 칸인지 세는 거라고 보면 돼요.',
      panel: 'top',
      pulse: false,
      fretNumArrow: true,
      nextLabel: '다음',
    },
    {
      // 기호를 말로 풀지 않고 ○ · ✕ 를 그대로 쓴다 — 화면에 그려진 것과 1:1로 읽힌다.
      // 설명 순서와 화살표가 어긋나지 않게 개방현·뮤트를 각각 짚는다.
      // 화살표는 왼쪽에 붙인다(오른쪽은 프렛보드라 시선이 안쪽으로 쏠린다).
      // A 코드 기준 5번줄(s:4)이 개방현, 6번줄(s:5)이 뮤트 — 붙어 있어 시선이 아래로 이어진다.
      // target을 주면 안 된다 — 캔버스가 통째로 열려 ○/✕ 영역을 눌러 A 코드가 바뀌어 버린다.
      // 설명만 하는 구간이라 조작은 잠그고 화살표로만 짚는다(arrowString은 target 없이도 그려진다).
      title: '개방현',
      text: '○는 개방현이에요.\n누르지 않고 그대로 치는, 0프렛이라고 보면 돼요.',
      panel: 'top',
      pulse: false,
      arrowString: { s: 4, side: 'left' },
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '뮤트',
      text: '✕는 뮤트예요.\n소리를 내지 않는 줄이에요.',
      panel: 'top',
      pulse: false,
      arrowString: { s: 5, side: 'left' },
      optional: true,
      nextLabel: '다음',
    },
    {
      // 바꾸는 법도 알려준다 — 앞 두 구간이 기호의 뜻만 설명해서, 유저가 직접 눌러보다
      // 코드를 망가뜨리는 경로가 실제로 있었다. 여기서도 조작은 잠근 채 설명만 한다.
      title: '개방현 · 뮤트 바꾸기',
      text: '○와 ✕는 눌러서 서로 바꿀 수 있어요.\n지금은 그대로 두고 넘어갈게요!',
      panel: 'top',
      pulse: false,
      arrowString: { s: 5, side: 'left' },
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '코드 만들기',
      text: '그럼 이제 에디터를 직접 만져볼까요?\n깜빡이는 자리를 눌러 Am 코드로 바꿔 볼게요!',
      panel: 'card-top',
      target: '#c',
      pulse: false,
      canvasCell: { s: 1, f: 1 }, // 2번줄 1프렛 → A 코드가 Am 으로 바뀐다
      advanceOn: 'dot:1:1',
    },
    {
      // 버퍼 구간 — 방금 만든 걸 짚어주고 코드이름 자동 추천을 함께 알린다.
      title: '코드 만들기',
      text: '잘하셨어요! Am 코드를 만들었어요!\n에디터를 편집하면 자동으로 코드 이름이 추천돼요.',
      panel: 'card-top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 자동으로 안 넘어간다 — 재생 후 1초 뒤(enableNext, home.js strumChord) 버튼이 풀리고,
      // 유저가 원하는 만큼 듣다가 직접 다음으로 넘긴다.
      // 재생 버튼도 어두워 펄스 링이 잘 안 보인다 — 버튼 아래 화살표로 짚는다.
      title: '소리 듣기',
      text: '코드 편집을 완료했다면, 직접 소리를 들어볼 수 있어요!\n재생 버튼을 클릭해 보세요.',
      panel: 'card-top',
      target: '#btn-play-chord',
      pulse: false,
      elArrow: { sel: '#btn-play-chord', side: 'bottom' },
      nextLabel: '다음',
    },
    {
      // 버퍼 구간 — 유저 입력 없이 A#(1프렛 바레 폼)을 대신 찍어준다.
      // 완성형: 1·5번줄 1프렛 + 2·3·4번줄 3프렛 + 6번줄 뮤트 → 1프렛/3프렛 바레 버튼이 모두 생긴다.
      // 자동으로 안 넘어간다 — 시뮬레이션이 끝나면 engine이 enableNext()로 버튼만 풀어준다.
      // (다른 구간이 전부 "직접 눌러 넘김"이라 여기만 자동이면 조작 감각이 어긋난다)
      title: '바레',
      text: '다음 설명을 위해 제가 A# 코드를 만들어 드릴게요.',
      panel: 'card-top',
      simulate: [
        { s: 0, f: 1 }, // 1번줄 1프렛
        { s: 1, f: 3 }, // 2번줄 3프렛
        { s: 2, f: 3 }, // 3번줄 3프렛
        { s: 3, f: 3 }, // 4번줄 3프렛
        { s: 4, f: 1 }, // 5번줄 1프렛
      ],
      nextLabel: '다음',
    },
    {
      title: '바레',
      text: '한 손가락으로 여러 줄을 한 번에 누르는 걸 바레라고\n해요. 3프렛의 B 버튼을 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="3"]',
      advanceOn: 'barre:3:on',
    },
    {
      title: '바레',
      text: '같은 버튼을 다시 누르면 바레가 풀려요.\n한 번 더 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="3"]',
      advanceOn: 'barre:3:off',
    },
    {
      title: '바레',
      text: 'A# 코드는 1프렛을 바레로 눌러요.\n1프렛 B 버튼을 눌러 보세요.',
      panel: 'card-top',
      target: '#barre-btns button[data-fret="1"]',
      advanceOn: 'barre:1:on',
    },
    {
      title: '# / b 바꾸기',
      text: '같은 코드도 A#과 Bb, 두 가지로 부를 수 있어요.\nb를 눌러 표기를 바꿔 보세요.',
      panel: 'card-top',
      target: '.canvas-wrap-acc-overlay',
      advanceOn: 'acc:flat',
    },
    {
      // 버퍼 구간 — 바레·샵플랫까지 끝낸 걸 짚어주고 프렛 번호로 넘어간다.
      // 앞 구간에서 b 표기로 바꿨으므로 여기서는 Bb로 부르는 게 화면과 일치한다.
      title: '# / b 바꾸기',
      text: '잘하셨어요! Bb 코드를 완성했네요!',
      panel: 'card-top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    // ── 프렛 번호 ──
    // 바레 폼을 그대로 위로 옮기면 다른 코드가 된다는 걸 보여주는 자리.
    // 에디터 모델상 currentFretNumber는 2에서 시작하고 calcActualFret(f) = (n-2)+f 이므로
    // 2 → 4 가 되면 실제 프렛이 1·3 에서 3·5 로 밀린다 = Bb(1프렛 바레) → C(3프렛 바레).
    {
      // fretNumArrow를 여기 쓰면 안 된다 — 그 처리는 라벨 등장 후 enableNext()를 부르는데,
      // advanceOn이 있는 이 구간에서는 조작 없이 넘어갈 수 있게 열려 버린다.
      title: '프렛 번호',
      text: '이번엔 프렛 번호를 조작해볼게요.\n▶ 버튼을 두 번 눌러 4로 만들어 주세요!',
      panel: 'card-top',
      target: '#fret-ctrl',
      pulse: '#fret-ctrl',
      advanceOn: 'fretnum:4',
    },
    {
      title: '프렛 번호',
      text: '손 모양은 그대로지만 C 코드를 만들 수 있어요!',
      panel: 'card-top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
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
      arrowCell: { s: 3, f: 3 },
      advanceOn: 'finger:3:3:2',
    },
    {
      title: '손가락 번호',
      text: '이번엔 3번을 고르고 3번 줄의 점을 눌러 보세요.',
      panel: 'card-top',
      target: ['#f3', '#c'],
      pulse: '#f3',
      canvasCell: { s: 2, f: 3 },
      arrowCell: { s: 2, f: 3 },
      advanceOn: 'finger:2:3:3',
    },
    {
      title: '손가락 번호',
      text: '마지막으로 4번을 고르고 2번 줄의 점을 눌러 보세요.\n지울 때는 같은 번호로 클릭하면 지울 수 있어요.',
      panel: 'card-top',
      target: ['#f4', '#c'],
      pulse: '#f4',
      canvasCell: { s: 1, f: 3 },
      arrowCell: { s: 1, f: 3 },
      advanceOn: 'finger:1:3:4',
    },
    {
      // 버튼을 누르는 것까지는 필수(시트가 열리면 통과). 실제 저장 여부는 다음 구간에서 선택.
      // 저장 시트 안에서 프리미엄 안내(요금제 시트)로 빠질 수 있어 그쪽도 열어둔다. 안 그러면 갇힌다.
      // 아이콘이 어두워 펄스 링이 잘 안 보이므로 하이라이트 대신 버튼 위쪽 화살표로 짚는다.
      title: '이미지 저장',
      text: '이렇게 만든 코드는 이미지로 저장할 수 있어요.\n이미지 아이콘을 클릭해 봐요!',
      panel: 'card-top',
      target: ['#btn-save-image', '#img-save-modal', '#img-save-backdrop', '#plan-sheet', '#plan-sheet-overlay'],
      pulse: false,
      elArrow: { sel: '#btn-save-image', side: 'top' },
      advanceOn: 'imgsave:open',
    },
    // 시트가 올라온 상태에서 설명 3구간 — 패널을 상단으로 올려 시트를 가리지 않는다.
    // 시트 요소를 target에 넣어 터치 가드에서 열어두되, 펄스는 각 구간이 가리키는 곳에만.
    {
      // target으로 시트 전체를 열면 안 된다 — 안에 있는 배율 슬라이더·투명배경 토글까지
      // 조작 가능해져서, 유저가 건드리면 미리보기가 가려지거나 설명과 화면이 어긋난다.
      // 설명만 하는 구간이라 조작은 전부 잠그고 pulse로만 짚는다.
      // (시트는 다음 '코드 이름 바꾸기' 구간의 setup에서 closeImgSaveModal()로 닫는다)
      title: '이미지 저장',
      text: '이곳에선 아래에서 저장될 이미지를 미리 볼 수 있어요.',
      panel: 'top',
      pulse: '#img-preview-canvas',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '이미지 저장',
      text: '저장한 이미지는 개인 노트나 자료 제작에 쓰거나,\n지인들에게 코드를 알려줄 때도 활용할 수 있겠죠?',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 버퍼 A — 시트를 닫고 "여기가 어디인지"부터 짚는다.
      // 용도(버퍼 B)보다 정의가 먼저 와야 유저가 뭘 보고 있는지 알고 설명을 듣는다.
      // 유료 기능(배율·투명배경) 안내는 넣지 않는다. 튜토리얼 단계에서 진입장벽이 된다.
      // 다음 구간들이 화면 위쪽 휠피커를 가리키므로 패널을 미리 아래로 내려 위치를 맞춰둔다.
      // target 없이 pulse만 주면 조작은 잠긴 채 하이라이트만 표시된다.
      title: '코드 이름 바꾸기',
      text: '코드 이름은 여기서 직접 바꿀 수도 있어요!',
      panel: 'bottom',
      pulse: '.wheel-picker',
      setup: () => {
        window.closeImgSaveModal?.();
        window.closePlanSheet?.();
      },
      optional: true,
      nextLabel: '다음',
    },
    {
      // 버퍼 B — 언제 쓰는지 + 열 순서 규칙
      title: '코드 이름 바꾸기',
      text: '추천에 없는 코드나 이름을 직접 정하고 싶을 때 써요.\n휠은 코드가 확장되는 순서대로 놓여 있어요.',
      panel: 'bottom',
      pulse: '.wheel-picker',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 휠피커는 화면 위쪽에 있으니 패널을 아래로 내려 가리지 않게 한다.
      // 앞 구간에서 저장 시트를 열어둔 채 넘어왔을 수 있어 먼저 닫는다.
      // 자동으로 안 넘어간다 — 유저가 원하는 만큼 자유롭게 돌려보고 직접 다음으로 넘기게 한다.
      title: '코드 이름 바꾸기',
      text: '위쪽 휠을 돌려서 코드 이름을 마음껏 바꿔보세요!',
      panel: 'bottom',
      setup: () => {
        window.closeImgSaveModal?.();
        window.closePlanSheet?.();
      },
      target: '.wheel-picker',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 버퍼 구간 — 노트 기능 자체는 STEP3에서 다루지만, "왜 담는지"를 먼저 알려야
      // 다음 조작(노트 추가)이 목적 있는 행동으로 읽힌다.
      title: '노트에 담기',
      text: '노트는 나만의 악보집이에요.\n코드 진행을 저장해두고 언제든 다시 꺼내 볼 수 있어요.',
      panel: 'card-top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '노트에 담기',
      text: '만든 코드는 노트에 담아 모아둘 수 있어요. "노트 추가" 버튼을 눌러 보세요.',
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
      // "다음 스텝"이라고 쓰면 거짓이 된다 — 노트는 A에서 3번, B에서 4번 자리다.
      text: '여기서 담을 노트를 고르면 돼요. 노트 기능은 나중에 알려드릴게요. 닫기를 눌러 주세요.',
      panel: 'card-top',
      target: '.project-sheet-close',
      advanceOn: 'notesheet:close',
    },
  ];

  // STEP2 — 코드 사전. 구간 단위로 순차 구현 중.
  const STEP2_STEPS = [
    {
      title: '{S} | 코드 사전',
      text: '이번엔 코드 사전을 살펴볼게요.\n깜빡이는 곳을 눌러 주세요!',
      panel: 'top',
      target: '#home-block-library',
      advanceOn: 'view:library',
    },
    {
      // 버퍼 구간 — 조작을 시키기 전에 이 페이지가 뭐 하는 곳인지부터 알린다.
      // 다음 구간이 panel:'top'이라 여기서부터 위에 붙여 둔다(전환 시 패널이 안 튀게).
      title: '코드 사전',
      text: '이곳은 거의 모든 코드를 담은 사전이에요.\n직접 하나하나 검수했답니다!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 목록 전체를 열어 직접 스크롤해서 G를 찾게 한다.
      // (scrollIntoView로 끌어오면 상위 스크롤 컨테이너까지 같이 움직여 레이아웃이 틀어짐)
      title: '근음 고르기',
      text: '왼쪽에서 근음을 고르면 오른쪽에 해당 코드들이 나와요.\nG를 찾아서 눌러 보세요.',
      panel: 'top', // 근음 목록이 화면 아래쪽이라 패널은 위로

      target: '#lib-root-tabs',
      pulse: false,
      scrollHint: '#lib-root-tabs', // 위아래로 넘길 수 있다는 표시
      advanceOn: 'libroot:G',
    },
    {
      // 카드 영역 전체를 열어 스크롤 가능하게 두고, 펄스는 G 카드에만.
      // 문구는 "방금 한 조작의 결과 → 다음 지시" 순서. 별도 버퍼 구간 없이 한 구간 안에서 잇는다.
      title: '코드 고르기',
      text: '이렇게 G를 근음으로 하는 코드들이 나와요.\n첫 번째 G 코드를 눌러볼까요?',
      panel: 'top',
      // 보이싱 오버레이도 함께 열어야 한다 — G가 아닌 카드를 잘못 누르면 그 코드의 보이싱 모달이
      // 뜨는데, 오버레이가 잠겨 있으면 닫지도 못하고 그 아래 G 카드도 못 눌러 진행이 막힌다.
      // (이 구간은 lockVoicing이 아니라서 여백을 누르면 닫힌다 → 다시 G를 고를 수 있다)
      target: ['.lib-cards-area', '#lib-voicing-overlay'],
      pulse: '.lib-card[data-chord="G"]',
      advanceOn: 'libcard:G',
    },
    {
      // lockVoicing: 모달 여백·오버레이를 눌러도 닫히지 않게 잠근다.
      // 목록이 사라지면 설명이 가리킬 대상이 없어져 흐름이 끊긴다.
      title: '잡는 법 고르기',
      text: '같은 G라도 잡는 법이 여러 가지예요.\n첫 번째를 눌러 보세요.',
      panel: 'top',
      lockVoicing: true,
      target: '#lib-voicing-modal',
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
      // 조작은 재생만 허용. 이미지 저장까지 열면 저장 시트로 빠져 흐름이 끊긴다
      // — STEP1에서 이미 해본 기능이라 언급만.
      // 재생 버튼이 어두워 펄스 링이 잘 안 보인다 — STEP1처럼 버튼 우측 화살표로 짚는다.
      // 넘기는 방식도 STEP1 소리 듣기와 동일 — 재생 1초 뒤 enableNext(libPlayChord)로 버튼만 풀린다.
      title: '소리 듣기',
      text: '여기서도 소리를 듣고 이미지로 저장할 수 있어요.\n지금은 재생 버튼만 눌러볼까요?',
      panel: 'bottom',
      target: '#lib-btn-play',
      pulse: false,
      elArrow: { sel: '#lib-btn-play', side: 'right' },
      nextLabel: '다음',
    },
    {
      title: '검색으로 찾기',
      text: '찾는 코드가 있으면 검색이 더 빨라요.\nG7을 입력하고 확인을 눌러 보세요.',
      panel: 'bottom',
      target: '#lib-search',
      // 앞 구간(뷰어 짚기)이 캔버스를 화면 가운데로 끌어오면서 위에 있는 검색창이
      // 화면 밖으로 밀려난다. 범용 자동스크롤(_ensureTargetVisible)이 뒤이어 돌지만
      // 렌더 직후 한 프레임 늦게 붙어 체감상 안 끌려오는 경우가 있었다 — 여기서 바로 당긴다.
      setup: () => {
        document.getElementById('lib-search')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      advanceOn: 'libsearch:open:G7',
    },
    {
      // 결과 목록은 스크롤될 수 있어 모달 전체를 열어두고, 펄스는 첫 카드에만.
      // ※ 결과를 골라도 모달은 닫히지 않는다 — 다음 구간 setup에서 closeLibSearchModal() 필요.
      title: '검색으로 찾기',
      text: '이렇게 G7과 관련된 코드들이 모여서 나와요.\n첫 번째를 눌러볼까요?',
      panel: 'top',
      target: '#lib-search-modal',
      pulse: '#lib-search-cards .lib-card:first-child',
      advanceOn: 'libsearchpick:0',
    },
    {
      // 버퍼 구간 — 검색으로 고른 결과를 짚고, 액션바의 나머지 두 버튼을 한 번에 언급한다.
      // 조작은 시키지 않는다(target 없음). 여기서 검색 모달을 닫아야 액션바가 드러난다.
      title: '표기 바꾸기',
      text: '고른 코드는 바로 위에서 확인할 수 있어요.\n#/b 표기와 손가락 번호도 바꿀 수 있답니다.',
      panel: 'top',
      // .accidental-toggle은 에디터 캔버스에도 있어 그냥 쓰면 숨어 있는 쪽이 잡힌다 → 뷰로 한정
      pulse: ['#view-library .accidental-toggle', '#lib-finger-btn'],
      optional: true,
      nextLabel: '다음',
      // 검색 결과 모달이 액션바를 덮고 있어 먼저 닫아야 버튼이 보인다
      setup: () => { window.closeLibSearchModal?.(); },
    },
    {
      // 위치만 짚는 구간 — target을 비워 조작은 막고 pulse로 버튼만 가리킨다.
      // 누르면 에디터로 넘어가 흐름이 끊기고, STEP1에서 이미 해본 동작이라 반복 가치도 없다.
      title: '에디터로 가져가기',
      // A는 에디터를 이미 배운 뒤라 과거형, B는 아직 안 배워서 예고형으로 갈린다.
      variant: 'A',
      text: '고른 코드를 에디터로 가져가 편집할 수 있어요.\n{S:editor}에서 배운 그 에디터예요.',
      panel: 'top',
      pulse: '#lib-btn-to-editor',
      optional: true,
      nextLabel: '다음',
    },
    {
      variant: 'B',
      title: '에디터로 가져가기',
      text: '고른 코드를 에디터로 가져가 편집할 수 있어요.\n에디터는 다음 스텝에서 배워볼게요!',
      panel: 'top',
      pulse: '#lib-btn-to-editor',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 여기도 위치만 짚는다 — 누르면 노트 선택 시트가 열려 흐름이 끊긴다.
      // 위 구간과 같은 이유로 A는 과거형, B는 예고형.
      variant: 'A',
      title: '노트에 저장',
      text: '마음에 드는 코드는 노트에 담아둘 수 있어요.\n{S:editor}에서 배운 것과 똑같아요.',
      panel: 'top',
      pulse: '#lib-btn-save-note',
      optional: true,
      nextLabel: '다음',
    },
    {
      variant: 'B',
      title: '노트에 저장',
      text: '마음에 드는 코드는 노트에 담아둘 수 있어요.\n노트는 뒤에서 자세히 알려드릴게요.',
      panel: 'top',
      pulse: '#lib-btn-save-note',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 마무리 — 완료 사실을 알리고 다음 스텝을 예고한다. 하이라이트 없이 설명만.
      // 구A 전용 문구(사전→노트 예고)는 구A 폐기로 죽은 코드, 새B용으로 재활용 불가(내용 안 맞음).
      variant: '__dead_old_A',
      title: '{S} 완료',
      text: '코드 사전은 여기까지예요!\n다음 단계에서는 노트 기능에 대해 배워볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      variant: 'A',
      title: '{S} 완료',
      text: '코드 사전은 여기까지예요!\n다음 단계에서는 훈련소를 둘러볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      variant: 'B',
      title: '{S} 완료',
      text: '코드 사전은 여기까지예요!\n다음 단계에서는 코드 에디터를 배워볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
  ];

  // STEP3 — 노트. 구간 단위로 순차 구현 중.
  const STEP3_STEPS = [
    {
      // 문제제기 → 보상 예고 → 행동. 유저가 "왜 이걸 배우는지"를 먼저 잡아준다.
      // 시니어 유저 비중이 늘어 "손으로 적어두다"를 명시적으로 넣었다.
      title: '{S} | 노트',
      text: '코드 악보를 매번 검색하거나\n손으로 적어두느라 번거롭지 않으셨나요?',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} | 노트',
      text: '이번 스텝에서는 나만의 코드 악보집을\n만드는 방법을 알려드릴게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} | 노트',
      text: '그럼 바로 시작해 볼까요?\n아래 노트 탭을 눌러 주세요!',
      panel: 'top',
      target: '#nav-projects',
      advanceOn: 'tab:projects',
    },
    {
      // 샌드박스 덕분에 무료 3개 한도에 안 걸린다(목록이 비어 있는 상태로 시작)
      title: '노트 만들기',
      text: '이곳이 작성한 노트를 모아 보는 곳이에요.\n오른쪽 위 + 버튼을 눌러 주세요!',
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
    {
      // "팔레트"는 유저에게 낯선 말이라, 조작을 시키기 전에 자리부터 정의해 준다.
      // 앞 스텝에서 담은 코드가 여기로 모인다는 연결도 이 구간에서 짚는다.
      title: '코드 팔레트',
      // 번호를 쓰면 B에서 'STEP3·STEP2'로 역순이 되어 읽기 나쁘다 → 번호 없이 쓴다.
      text: '아래 이곳은 코드를 모아두는 팔레트예요.\n앞서 담아둔 코드도 전부 여기 모여요.',
      panel: 'bottom',
      pulse: `.chord-palette`,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '코드 담기',
      text: '그럼 직접 하나 담아 볼까요?\n+ 버튼을 눌러 주세요!',
      panel: 'bottom',
      target: '#palette-add-btn',
      advanceOn: 'palettedict:open',
    },
    {
      title: '코드 담기',
      text: '{S:library}의 코드 사전이 여기에도 담겨 있죠?\n이곳에서 원하는 코드를 바로 담을 수 있어요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '직접 만들기',
      text: '사전에 없는 코드가 있다면\n직접 에디터에서 만들어 담을 수도 있어요!',
      panel: 'bottom',
      pulse: '#pd-btn-to-editor',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: 'C 코드 담기',
      text: '그럼 C 코드를 담아 볼까요?\n맨 앞의 C를 눌러 주세요!',
      panel: 'top',
      // STEP2 '코드 고르기'와 같은 이유로 보이싱 오버레이를 함께 연다(오탭 복구 경로)
      target: ['.lib-cards-area', '#lib-voicing-overlay'],
      pulse: '.lib-card[data-chord="C"]',
      advanceOn: 'libcard:C',
    },
    {
      // lockVoicing: 모달 여백·오버레이를 눌러도 닫히지 않게 잠근다(STEP2와 동일).
      title: 'C 코드 담기',
      text: '이렇게 C를 잡는 방법들이 나와요.\n첫 번째를 눌러볼까요?',
      panel: 'top',
      lockVoicing: true,
      target: '#lib-voicing-modal',
      pulse: '#lib-voicing-grid .lib-card[data-vpos="0"]',
      advanceOn: 'chordadded:C',
    },
    {
      title: 'C 코드 담기',
      text: '팔레트에 C가 담겼어요!\n이제 닫기를 눌러볼까요?',
      panel: 'bottom',
      target: '.palette-dict-card .modal-header .icon-btn',
      advanceOn: 'palettedict:close',
    },
    {
      // 버퍼 — 담은 C가 팔레트에 실제로 들어온 걸 눈으로 확인시키고,
      // 이제 왜 가사를 적는지(노트가 코드 전용이 아님) 명분을 준다.
      title: '코드 팔레트',
      text: '팔레트에 C가 들어왔죠?\n담은 코드는 이렇게 하나씩 쌓여요.',
      panel: 'bottom',
      pulse: '.chord-palette-item[data-chord-name="C"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 팔레트는 가로 스크롤이라, 코드가 늘면 화면 밖으로 나간다는 걸 미리 알려둔다.
      // 조작은 시키지 않고 스크롤바 도트만 가볍게 움직여 보인다.
      title: '코드 팔레트',
      text: '코드가 많아지면\n이렇게 옆으로 넘겨서 찾을 수 있어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
      setup: () => {
        const dot = document.querySelector('.palette-scrollbar-dot');
        if (!dot) return;
        dot.classList.remove('palette-scrollbar-dot--demo');
        void dot.offsetWidth; // 재진입 시 애니메이션 재시작
        dot.classList.add('palette-scrollbar-dot--demo');
      },
    },
    {
      title: '가사 쓰기',
      text: '노트엔 코드뿐 아니라\n가사나 메모도 함께 적을 수 있어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 가사는 값까지 맞아야 하므로 함수형 조건 사용 (saveAllLines가 'lines:saved'로 알린다)
      title: '가사 쓰기',
      text: '먼저 가사부터 적어 볼까요?\n첫 줄에 "반짝반짝 작은 별"을 적어 주세요!',
      panel: 'bottom',
      target: TUT_FIRST_LINE_TEXT,
      advanceOn: () => _lineTextAt(0) === '반짝반짝 작은 별',
    },
    {
      title: '줄 추가',
      text: '잘하셨어요! 첫 줄이 채워졌네요.\n맨 아래 + 버튼으로 두 번째 줄을 추가해 볼까요?',
      panel: 'top',
      target: '.add-line-btn',
      advanceOn: () => document.querySelectorAll(`${TUT_LINES} > .project-line`).length >= 2,
    },
    {
      // 복사는 유저 제스처 안에서 일어나야 한다.
      // 이 버튼의 클릭 → next() → 다음 구간 setup이 같은 콜스택이라 제스처가 살아 있다.
      // 문구의 주어에 주의: 앱 기능은 "여러 줄 붙여넣기"이고, 복사는 튜토리얼이 대신 해준다.
      title: '붙여넣기',
      text: '가사는 여러 줄을 한 번에 붙여넣을 수도 있어요.\n아래 버튼을 누르면 두 줄을 복사해 드릴게요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '가사 복사하기',
    },
    {
      // 여러 줄 붙여넣기 — applyPastedText가 줄바꿈마다 새 줄로 나눠 넣는다.
      // 빈 둘째 줄에 캐럿을 두고 붙여넣어야 2·3번째 줄로 들어간다.
      title: '붙여넣기',
      // 조작을 "길게 누르기"로 못박지 않는다 — 웹에서 마우스로 쓰는 유저는 우클릭이다.
      text: '이제 두 번째 줄에 붙여 보세요!\n길게 누르고 있으면 붙일 수 있을 거예요.',
      panel: 'bottom',
      target: `${TUT_LINE_NTH(1)} .line-text`,
      setup: () => _copyToClipboard(TUT_LYRICS_2),
      advanceOn: () => _lineTextAt(1) === '반짝반짝 작은 별'
                    && _lineTextAt(2) === '아름답게 비치네',
      // 붙여넣기가 어긋나면(엉뚱한 내용이 들어가거나 줄이 밀리면) 열린 곳이 둘째 줄뿐이라
      // 스스로 되돌릴 수 없다 → 빠져나갈 문을 남긴다. 건너뛰어도 뒤 구간(줄 지우기·코드 놓기)은
      // 첫 줄만 쓰므로 그대로 성립한다.
      optional: true,
    },
    {
      // 첫 줄이 붙여넣은 둘째 줄과 겹치므로 여기서 줄 삭제를 배운다(STEP4에서 다시 쓴다)
      title: '줄 지우기',
      text: '앗...! 첫 번째 가사가 중복되어 버렸네요.\n점 세 개 버튼을 눌러보실래요?',
      panel: 'bottom',
      target: `${TUT_LINE_NTH(0)} .row-menu-btn`,
      advanceOn: 'rowmenu:open:0',
    },
    {
      // 드롭다운은 body 직속 fixed — 백드롭은 열지 않는다(누르면 닫혀서 흐름이 끊김)
      // ⚠ target으로 드롭다운 전체를 열면 안 된다 — 다른 항목(줄 추가·복사·슬롯 초기화·마디 수정)을
      //   누르면 메뉴가 닫히면서 advanceOn이 갈 곳을 잃어 진행이 완전히 막힌다.
      //   지목한 항목 하나만 연다. 나머지는 가드가 막으므로 오탭 자체가 일어나지 않는다.
      title: '줄 지우기',
      text: '다행히 지울 수 있는 버튼이 있었네요!\n"이 줄 삭제"를 눌러 주세요.',
      panel: 'bottom',
      target: '.row-menu-dropdown [data-action="delete"]',
      advanceOn: 'rowmenu:delete',
    },
    {
      // 팔레트 아이템과 첫 줄 코드슬롯을 모두 열어야 드래그가 성립한다.
      // (모바일은 setupPaletteTouchDrag의 터치 드래그 — 시작 요소가 target이라 통과된다)
      // 줄 삭제 뒤에 와야 한다 — 첫 줄을 지우면 거기 놓은 코드도 같이 사라지므로.
      title: '코드 놓기',
      text: '가사가 정리되었으니 코드를 넣어봐야겠죠?\n팔레트의 C 코드를 끌어다 놓아 보세요!',
      panel: 'bottom',
      target: ['.chord-palette-item[data-chord-name="C"]', `${TUT_LINE_NTH(0)} .chord-row-wrapper`],
      pulse: [`.chord-palette-item[data-chord-name="C"]`, `${TUT_LINE_NTH(0)} .chord-slot[data-slot-idx="0"]`],
      slotCell: { line: 0, slot: 0 }, // 첫 줄 첫 칸에만 놓을 수 있게 제한
      noNav: true, // 팔레트 아이템을 그냥 탭하면 에디터로 넘어가버리므로 이 구간에선 막는다
      // 빈 슬롯도 data-chord-id="" 를 항상 갖는다 → 속성 존재가 아니라 값이 있는지로 판정해야 한다
      advanceOn: () => !!document.querySelector(
        `${TUT_LINE_NTH(0)} .chord-slot[data-chord-id]:not([data-chord-id=""])`),
    },
    {
      // 버퍼 — 드래그 성공을 짚고, 지금까지 한 일이 무엇이었는지(나만의 코드 악보) 의미를 준다.
      title: '코드 놓기',
      text: 'C가 첫 번째 칸에 놓였어요!\n이런 식으로 나만의 코드 악보를 만들 수 있어요.',
      panel: 'bottom',
      pulse: `${TUT_LINE_NTH(0)} .chord-slot[data-chord-id]:not([data-chord-id=""])`,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 소리가 난다는 걸 미리 말하지 않는다 — 눌렀을 때의 놀라움이 이 구간의 보상이다.
      title: '소리 듣기',
      text: '악보만 만드는 거면 조금 아쉽겠죠?\n그래서 연습에 더 도움이 되는 기능을 넣어두었어요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 넘김 방식은 STEP1·2 소리 듣기와 동일 — 재생 1초 뒤 enableNext(user_project.js)로 버튼만 풀린다.
      title: '소리 듣기',
      text: '반짝이는 C 코드를 한 번 눌러볼까요?',
      panel: 'bottom',
      // ⚠ 줄 전체(.chord-row-wrapper)를 열면 안 된다 — 편집 모드의 슬롯에는 ✕ 삭제 버튼이 붙어 있어
      //   그걸 누르면 방금 놓은 C가 사라지고, 재생할 대상이 없어져 '다음'이 영영 안 풀린다.
      target: `${TUT_LINE_NTH(0)} .chord-slot-img`,
      pulse: `${TUT_LINE_NTH(0)} .chord-slot[data-chord-id]:not([data-chord-id=""])`,
      nextLabel: '다음',
    },
    {
      // 확인 버퍼 — 소리를 예고하지 않았으므로, 무음 환경에서 눌렀던 유저도 여기서 알아챈다.
      // "담아둔 코드"라고 쓰면 팔레트를 가리키게 되는데, 팔레트를 누르면 에디터로 넘어간다.
      // 소리가 나는 건 줄에 끌어다 놓은 코드다 → "적용한 코드"로 못박는다.
      title: '소리 듣기',
      text: '어떠셨어요? C 코드 소리가 났죠!\n적용한 코드는 언제든 눌러서 확인할 수 있어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // "켜다"라고 쓰면 누르는 순간 소리가 날 거라 기대하게 된다. 메트로놈은 재생 중에만
      // 울리므로(scheduleMetronome이 playbackActive를 본다) "활성화"로 표현한다.
      title: '메트로놈',
      text: '연습할 땐 박자도 중요하겠죠?\n메트로놈을 활성화해 볼까요?',
      panel: 'bottom',
      target: '#metronome-btn',
      advanceOn: 'metronome:on',
    },
    {
      // 끝까지 재생돼야 '다음'이 풀린다 — 중간에 멈추면 stopPlayAll만 되고 enableNext가 안 걸린다
      title: '전체 재생',
      text: '이제 처음부터 끝까지 들어 볼까요?\n재생하면 메트로놈도 함께 들릴 거예요!',
      panel: 'bottom',
      target: '#play-all-btn',
      nextLabel: '다음',
    },
    {
      // 세로 모드 기준: SLOTS_PER_BAR.portrait = 2, 기본 2마디 → 한 줄 4칸.
      // 4/4에서 한 마디가 4박이므로 칸 하나는 2박. (가로 모드는 칸당 1박)
      title: '코드 칸과 마디',
      text: '코드 칸 하나는 2박자 길이예요.\n한 줄은 2마디라서 칸이 네 개랍니다.',
      panel: 'bottom',
      pulse: `${TUT_LINE_NTH(0)} .chord-row-wrapper`,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} 완료',
      text: '나만의 코드 악보가 완성되었어요!\n다음 단계에선 박자, 카포 같은 기능을 다뤄볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
  ];

  // STEP4 — 노트 심화. 구간 단위로 순차 구현 중.
  // 진입 즉시 "작은 별 1절"이 완성된 노트가 열린 상태에서 시작한다
  // (STEP3를 이어서 하든 중간에 진입하든 동일 — 앞에서 만든 노트와는 무관).
  const STEP4_STEPS = [
    {
      // 브리핑 — 이 스텝에서 뭘 배우는지 먼저 알린다(STEP3 도입부와 같은 형식).
      title: '{S} | 노트 더 알아보기',
      text: '이번 스텝에선 노트를 더 자세히 다루고\n정리하고 관리하는 법까지 알아볼 거예요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} | 노트 더 알아보기',
      text: "제가 '작은 별' 한 소절을 미리 만들어 뒀어요.\n이걸로 기능을 익혀 봅시다!",
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 문제제기 먼저 — 기능을 소개하기 전에 왜 필요한지 유저 상황으로 깔아준다(STEP3 도입부와 동일).
      title: '줄 복사',
      text: '노래 가사는 반복되는 부분이 많죠?\n일일이 작성하려면 시간이 오래 걸릴 거예요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '줄 복사',
      text: '하지만 만들어 둔 줄을 복사하면 편리하겠죠?\n점 세 개 메뉴를 눌러 보세요!',
      panel: 'bottom',
      target: `${TUT_LINE_NTH(0)} .row-menu-btn`,
      advanceOn: 'rowmenu:open:0',
    },
    {
      // 드롭다운은 body 직속 fixed — 백드롭은 열지 않는다(누르면 닫혀서 흐름이 끊김)
      title: '줄 복사',
      // 지목한 항목만 연다(STEP3 '줄 지우기' 주석 참고) — 특히 여기서 "이 줄 삭제"가 열려 있으면
      // 시드 줄이 사라진 채 진행이 막힌다.
      text: '"현재 줄 복사"를 눌러 주세요.',
      panel: 'bottom',
      target: '.row-menu-dropdown [data-action="duplicate"]',
      advanceOn: 'rowmenu:duplicate',
    },
    {
      // 복사본은 맨 아래에 붙는다(insertBefore(addBtn)) — 시드가 2줄이니 세 번째 줄
      title: '줄 복사',
      text: '아래에 똑같은 줄이 생겼어요!\n복사된 줄은 항상 맨 아래에 생기니 유의해주세요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 삭제 방법은 STEP3에서 이미 배웠으므로 설명하지 않는다.
      // 메뉴 열기 → 삭제까지 한 구간에서 연속으로 — 아는 조작에 구간을 더 쓰지 않는다.
      // 링은 매 프레임 셀렉터를 다시 찾으므로, 드롭다운이 열리면 그때 삭제 항목에 자동으로 붙는다.
      title: '줄 복사',
      text: '다음 설명을 위해 방금 만든 줄을 삭제합시다.\n버튼을 눌러서 삭제해주세요!',
      panel: 'top',
      target: [`${TUT_LINE_NTH(2)} .row-menu-btn`, '.row-menu-dropdown [data-action="delete"]'],
      pulse: [`${TUT_LINE_NTH(2)} .row-menu-btn`, '.row-menu-dropdown [data-action="delete"]'],
      advanceOn: 'rowmenu:delete',
    },
    {
      // 문제제기 먼저 — 마디 정보가 왜 필요한 기능인지 곡의 상황으로 깔아준다.
      title: '마디 수정',
      text: '어떤 곡은 중간에 박자나 마디 수가 바뀌기도 하고,\n템포가 달라지는 노래도 있어요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '마디 수정',
      text: '그런 복잡한 노래도 얼마든지 만들 수 있어요!\n다시 한 번 점 세 개 메뉴를 눌러주세요!',
      panel: 'top',
      target: `${TUT_LINE_NTH(1)} .row-menu-btn`,
      advanceOn: 'rowmenu:open:1',
    },
    {
      title: '마디 수정',
      text: '"마디 정보 수정"을 눌러 주세요.',
      panel: 'top',
      // 지목한 항목만 연다(STEP3 '줄 지우기' 주석 참고)
      target: '.row-menu-dropdown [data-action="meter"]',
      advanceOn: 'rowmenu:meter',
    },
    {
      // 값 세 개를 한 번에 시키면 부담이 크다 → 항목별로 나누되 모달은 계속 열어둬
      // 끊김 없이 연속으로 입력하게 한다. 입력·스테퍼가 바뀔 때마다 'rowmeter:change'가 온다.
      // ⚠ target에 모달 전체('#row-meter-overlay .modal')를 주면 안 된다 — 저장·취소·X까지 열려서
      //   미리 저장을 눌러버리면 모달이 닫힌 채로 advanceOn이 사라진 입력칸을 계속 보게 되어
      //   영영 다음으로 못 넘어간다(실제 발생). 각 구간은 그 구간이 시키는 칸만 연다.
      title: '마디 수정',
      text: 'BPM은 곡의 빠르기예요.\n확실히 느려지도록 60으로 낮춰 볼까요?',
      panel: 'top',
      target: '#row-meter-bpm-box',
      advanceOn: () => document.getElementById('row-meter-bpm-input')?.value.trim() === '60',
    },
    {
      // 분모(den)는 클릭할 때마다 정해진 값으로 순환하고, 분자(num)는 숫자 입력이다.
      title: '마디 수정',
      text: '아래 숫자는 누를 때마다 정해진 값으로 바뀌고\n위 숫자는 직접 입력해요. 6/8로 만들어 볼까요?',
      panel: 'top',
      target: '#row-meter-sig-box',
      advanceOn: () => document.getElementById('row-meter-num-val')?.value.trim() === '6'
                    && document.getElementById('row-meter-den-val')?.textContent.trim() === '8',
    },
    {
      title: '마디 수정',
      text: '마디 수는 한 줄에 담을 마디 개수예요.\n1마디를 골라 주세요.',
      panel: 'top',
      // 라벨(.meter-bars-check)이 감싸고 있어 체크박스만 열면 라벨 탭이 막힌다 → 토글 묶음까지 연다.
      // 2마디를 눌러도 되돌릴 수 있으므로 이 범위는 막다른 길이 되지 않는다.
      target: '#row-meter-bars-toggle',
      pulse: '#row-meter-bars-toggle input[data-bars="1"]',
      advanceOn: () => !!document.querySelector('#row-meter-bars-toggle input[data-bars="1"]')?.checked,
    },
    {
      title: '마디 수정',
      text: '이 줄만 느려지고 6/8박자가 됐어요.\n저장을 눌러볼까요?',
      panel: 'top',
      target: '#row-meter-save-btn',
      // 'rowmeter:saved' 문자열로 잡지 않는다 — 그 알림은 딱 한 번만 오고, 구간 전환 딜레이
      // (ADVANCE_DELAY_MS) 중에 저장이 눌리면 next()가 _advanceTimer에 막혀 통째로 버려진다.
      // 그러면 저장 구간이 뜬 시점엔 모달도 알림도 이미 없어 영영 못 넘어간다(실제 발생).
      // 상태로 판정하면 어느 시점에 저장됐든, 이후 아무 알림에서나 되살아난다.
      advanceOn: () => {
        const ov = document.getElementById('row-meter-overlay');
        return !!ov?.classList.contains('hidden')
            && document.querySelector(TUT_LINE_NTH(1))?.dataset.rowBpm === '60';
      },
    },
    {
      // 넘김 방식은 STEP1~3과 동일 — 끝까지 재생되면 enableNext(user_project.js)로 버튼만 풀린다.
      title: '마디 수정',
      text: '두 번째 줄만 빠르기와 박자가 달라졌어요.\n메트로놈을 켜 뒀으니 재생해서 끝까지 들어볼까요?',
      panel: 'bottom',
      target: '#play-all-btn',
      // 박자 차이는 메트로놈이 있어야 확실히 들린다 — 꺼져 있으면 켜 준다
      setup: () => {
        if (typeof metronomeActive !== 'undefined' && !metronomeActive) window.toggleMetronome?.();
      },
      nextLabel: '다음',
    },
    {
      // 버퍼 겸 주의사항 — 마디를 줄이면 슬롯이 잘려 코드가 사라진다(_resizeRowSlots).
      // "사라졌다"는 사실이 바로 다음 되돌리기 구간의 동기가 된다.
      title: '마디 수정',
      text: '어때요? 확실히 바뀌었죠? 단, 마디를 줄이면\n잘려나간 마디의 코드는 사라지니 유의해주세요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '되돌리기',
      text: '혹시 실수로 바뀌었다면 되돌릴 수 있어요!\n되돌리기 버튼을 눌러볼까요?',
      panel: 'bottom',
      target: '#project-undo-btn',
      advanceOn: 'undo:done',
    },
    {
      // 버퍼 — 사라졌던 코드가 돌아온 걸 확인시킨다. 앞 구간의 불안을 여기서 해소.
      title: '되돌리기',
      text: '휴~ 수정하기 전으로 제대로 되돌아갔죠?\n실수해도 걱정 말고 마음껏 편집해 보세요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '카포',
      text: '카포를 사용해야 하는 곡들도 많이 있어요.\n직접 카포를 적용해봅시다!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 카포 전후를 비교하려면 먼저 원래 소리를 들어봐야 한다. 메트로놈은 방해되니 꺼 준다.
      title: '카포',
      text: '먼저 적용하기 전의 C 코드를 들어볼까요?',
      panel: 'bottom',
      // 슬롯 ✕ 삭제 버튼이 열리지 않도록 이미지만 연다(STEP3 '소리 듣기' 주석 참고)
      target: `${TUT_LINE_NTH(0)} .chord-slot-img`,
      pulse: `${TUT_LINE_NTH(0)} .chord-slot[data-chord-id]:not([data-chord-id=""])`,
      setup: () => {
        if (typeof metronomeActive !== 'undefined' && metronomeActive) window.toggleMetronome?.();
      },
      nextLabel: '다음',
    },
    {
      title: '카포',
      text: '이제 카포를 1 올려서 1프렛에 카포를 낀 효과를 줍시다!\nC# 코드가 되겠죠?',
      panel: 'bottom',
      target: '#capo-btn-up',
      advanceOn: 'capo:1',
    },
    {
      title: '카포',
      text: '다시 한 번 C 코드를 들어봅시다.',
      panel: 'bottom',
      target: `${TUT_LINE_NTH(0)} .chord-slot-img`,
      pulse: `${TUT_LINE_NTH(0)} .chord-slot[data-chord-id]:not([data-chord-id=""])`,
      nextLabel: '다음',
    },
    {
      title: '카포',
      text: '어떤가요? 제대로 카포가 적용되었어요!\n이렇게 카포 적용까지 알아봤어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 문제제기 — 가로 모드가 왜 필요한지 곡의 상황으로 깔아준다.
      title: '화면 방향',
      text: '코드가 빽빽하거나 가사가 긴 곡은\n세로 화면이 답답할 수 있어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 효과 두 가지(슬롯 확장·줄 여유)를 한 구간에 담는다. SLOTS_PER_BAR.landscape = 4.
      title: '화면 방향',
      text: '가로로 돌리면 한 마디의 코드 칸이 4개로 늘고\n줄도 넓어져 긴 가사까지 시원하게 담겨요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 전환 확인 모달이 뜨므로 모달도 함께 열어둔다(취소를 눌러도 이 구간에 머무름).
      // 웹(브라우저)에선 기기 회전 잠금 API가 없어 유저가 직접 돌려야 한다 → 조작 직전에 알린다.
      title: '화면 방향',
      text: '앱을 깔지 않으셨다면 화면도 직접 돌려주셔야 해요.\n가로 버튼을 눌러 전환해 볼까요?',
      panel: 'bottom',
      target: ['.col-toggle-btn[data-orient="landscape"]', '#orient-confirm-overlay'],
      pulse: '.col-toggle-btn[data-orient="landscape"]',
      advanceOn: 'orient:landscape',
    },
    {
      title: '화면 방향',
      text: '확인하셨으면 다시 세로로 돌아가 볼까요?',
      panel: 'bottom',
      target: ['.col-toggle-btn[data-orient="portrait"]', '#orient-confirm-overlay'],
      pulse: '.col-toggle-btn[data-orient="portrait"]',
      advanceOn: 'orient:portrait',
    },
    {
      // 눈동자 토글은 편집 모드에서도 보이지만, 여기까지가 편집 실습이므로 먼저 편집을 닫는다.
      title: '뷰 모드',
      text: '편집이 끝났다면 체크 버튼을 눌러\n편집을 마칠 수 있어요.',
      panel: 'bottom',
      target: '#project-mode-btn',
      advanceOn: 'editmode:off',
    },
    {
      title: '뷰 모드',
      text: '눈동자 아이콘을 누르면 코드 그림을 숨겨\n가사만 깔끔하게 볼 수 있어요. 눌러볼까요?',
      panel: 'bottom',
      target: '.slot-toggle-btn',
      advanceOn: 'slotshidden:true',
    },
    {
      // 숨긴 채로 두면 다음에 이 노트를 열었을 때 코드가 안 보여 당황한다 → 되돌리게 한다.
      title: '뷰 모드',
      text: '가사랑 코드이름만 남아 화면이 깔끔해졌죠?\n다시 눌러 코드를 되돌려 주세요.',
      panel: 'bottom',
      target: '.slot-toggle-btn',
      advanceOn: 'slotshidden:false',
    },
    {
      // 버퍼 — STEP4 전반부(악보 편집)를 닫고 후반부(노트 정리)를 연다.
      title: '노트 목록',
      text: '이제 악보 만드는 기능은 전부 마스터하셨어요!\n남은 건 만든 노트를 정리하는 방법이에요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 여기서 home.html?tab=projects 로 페이지가 바뀐다 — resume()이 이어받는다.
      // 탭 전환 알림은 resume 이전에 이미 지나가므로, 이벤트가 아니라 현재 상태로 판정해야 한다.
      title: '노트 목록',
      text: '목록으로 나가 볼까요?\n왼쪽 위 버튼을 눌러 주세요!',
      panel: 'bottom',
      target: '#back-btn',
      advanceOn: () => !!document.getElementById('nav-projects')?.classList.contains('active'),
    },
    {
      title: '노트 분류',
      text: '노트가 쌓이면 원하는 곡을 찾기 어려워지죠?\n그래서 최근 · 즐겨찾기 · 중요로 나눠 뒀어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '노트 분류',
      text: '자주 펼쳐 보는 노트는 즐겨찾기에 올려두면\n매번 찾지 않아도 돼요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '무료 플랜',
      text: '무료 이용자라면 노트는 3개까지 만들 수 있어요.',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 중요는 최대 3개(home.js importantCount >= 3), 잠김 상태에서도 열린다(shared.js isProjectLocked).
      title: '무료 플랜',
      text: '만약 구독 중에 더 많은 노트를 만들어 두셨다면\n중요 목록에 등록해야 잠기지 않을 수 있어요!',
      panel: 'bottom',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 목록은 중요 → 즐겨찾기 → 최근 순이라 첫 항목이 "작은 별"이 아니다. 이름으로 지목한다.
      title: '중요로 지정',
      text: "아끼는 노트는 미리 옮겨두는 게 좋겠죠?\n'작은 별' 오른쪽 점 세 개 버튼을 눌러 보세요!",
      panel: 'bottom',
      target: `${TUT_NOTE_MAIN} .projects-item-kebab`,
      // 액션은 항목의 show-actions 클래스로 펼쳐진다 (offsetParent로는 판정 안 됨)
      advanceOn: () => !!document.querySelector(`${TUT_NOTE_MAIN}.show-actions`),
    },
    {
      title: '중요로 지정',
      text: '왕관 버튼을 누르면 중요로 옮겨져요.\n왕관 버튼을 눌러주세요!',
      panel: 'bottom',
      target: `${TUT_NOTE_MAIN} [data-act="important"]`,
      advanceOn: 'important:true',
    },
    {
      // 선물('작은 별' 노트) 안내는 여기서 하지 않는다 — 완료 모달에서 조건별로 처리한다.
      // 구A 전용(뒤에 훈련소 남음 예고) — 구A 폐기로 죽은 코드, 새A/새B 둘 다 노트가 마지막이라 미사용.
      variant: '__dead_old_A',
      title: '{S} 완료',
      text: '노트를 다루는 법을 전부 익히셨어요!\n마지막 단계에선 실력을 키우는 훈련소로 가볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 새A·새B 둘 다 노트가 마지막 두 챕터라 변형 무관 공통 문구. 두 갈래 출구를 다 열어준다 —
      // 제작(내 노트 만들기)과 반복 방문(훈련소).
      title: '{S} 완료',
      text: '노트를 다루는 법을 전부 익히셨어요!\n이제 나만의 악보집을 채워 나가면 돼요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} 완료',
      text: '틈틈이 훈련소도 들러 실력을 쌓아 보세요!\n튜토리얼은 여기까지예요, 수고하셨어요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
  ];

  // STEP5 — 훈련소. home → training.html → chord-name-quiz.html → training.html 로 이어진다.
  // 퀴즈는 샌드박스 없이 일반 플레이와 동일하게 처리한다(피크 소모·통계·DB 모두 실제 반영).
  const STEP5_STEPS = [
    {
      // 문제제기 먼저 — 기능을 소개하기 전에 왜 필요한지 유저 상황으로 깔아준다(STEP3·4와 동일).
      // 구A 전용("악보 만들 수 있게 됐다" 전제, 훈련소가 노트 뒤) — 구A 폐기로 죽은 코드.
      // 새A는 훈련소가 노트보다 앞이고, 새B는 훈련소가 아예 첫 챕터라 둘 다 이 전제 안 맞음.
      variant: '__dead_old_A',
      title: '{S} | 훈련소',
      text: '악보를 만들 수 있게 됐지만\n손이 따라주지 않으면 아쉽겠죠?',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // B 전용 인사 — B는 훈련소가 첫 챕터라 여기가 튜토리얼의 첫인상이다.
      // A의 에디터 인사(STEP1_STEPS 맨 앞)와 같은 틀을 쓴다. 순서 말고 다른 변수가 끼면
      // 실험이 재는 것이 흐려진다.
      variant: 'B',
      title: '{S} | 훈련소',
      text: '안녕하세요, 코디터에 오신 것을 환영해요!\n{S}에서는 훈련소를 둘러볼 거예요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 앞 스텝을 전제하지 않는 범용 문구라 새A(훈련소=3번)·새B(훈련소=1번, 첫 챕터) 둘 다 그대로 맞는다.
      title: '{S} | 훈련소',
      text: '기타 연습, 뭘 어떻게 해야 할지\n막막할 때가 있죠?',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 브리핑 — 이 스텝에서 뭘 배우는지 먼저 알린다.
      // 구A 전용("마지막 스텝" 전제) — 새A/새B 둘 다 훈련소가 마지막이 아니라 죽은 코드.
      variant: '__dead_old_A',
      title: '{S} | 훈련소',
      text: '마지막 스텝에선 실력을 키우는\n훈련소를 둘러볼 거예요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // A는 이 챕터가 오기 전에 다른 챕터에서 이미 인사를 했으므로 버퍼가 2개(질문+답변)다.
      variant: 'A',
      title: '{S} | 훈련소',
      text: '이번 스텝에선 기타를 더 재미있고 효율적으로\n연습할 수 있는 훈련 시스템을 소개드릴게요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // B는 이 챕터가 첫 챕터라 인사가 하나 더 붙어 버퍼가 3개(인사+질문+답변)다 — 의도된 차이.
      // "막막할 때가 있죠?"라고 물어놓고 바로 진입시키면 질문만 던지고 답을 안 주는 셈이라
      // A 전용 문구를 그대로 빼지 않고 B만의 답변을 새로 넣는다.
      variant: 'B',
      title: '{S} | 훈련소',
      text: '그래서 재미있고 알차게 연습할 수 있는\n훈련 컨텐츠를 준비해뒀어요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} | 훈련소',
      text: '어떤 컨텐츠가 있는지 살펴볼까요?',
      panel: 'top',
      target: '#home-block-training',
      advanceOn: 'view:training',
    },
    {
      title: '훈련 목록',
      text: '기타 연습을 더 재미있고 쉽게 할 수 있도록\n여러 가지 훈련 컨텐츠를 만들어 두었어요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    // 카드별 소개 — 어떤 컨텐츠고 뭘 연습하고 싶을 때 좋은지 한 줄씩. 위 구간에서 이미
    {
      title: '코드 맞추기',
      text: '코드 암기를 게임처럼! 제한 시간 안에\n빠르게 맞혀보는 훈련이에요.',
      panel: 'top',
      pulse: '.training-card[data-key="chord-name"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '스케일 훈련',
      text: '기타 솔로, 즉흥 연주가 꿈이라면 필수예요.\n스케일을 손에 익혀보세요.',
      panel: 'top',
      pulse: '.training-card[data-key="scale"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '코드 진행 리스트',
      text: '매번 따로 외워야 했던 코드 진행,\n패턴으로 몸에 각인시켜요.',
      panel: 'top',
      pulse: '.training-card[data-key="progression"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '주법 리듬 훈련',
      text: '노래에 자주 쓰이는 리듬 패턴만\n집중적으로 공략해요.',
      panel: 'top',
      pulse: '.training-card[data-key="strumming"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '코드 조합 훈련',
      text: '어렵게만 느껴지던 화성학,\n퀴즈만 풀어도 자연스럽게 익혀져요.',
      panel: 'top',
      pulse: '.training-card[data-key="reharmony"]',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '훈련 목록',
      text: '흐릿한 카드는 준비 중이에요.\n앞으로 계속 늘어날 거예요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '피크',
      text: '훈련에는 피크가 들어가요.\n30분마다 1개씩, 하루 30개까지 채워져요.',
      panel: 'bottom',
      pulse: '#topbar-currency .currency-item:last-child',
      optional: true,
      nextLabel: '다음',
    },
    {
      // 개봉을 강요하지 않는다 — 상자가 0개면 openPeakboxModal이 아무것도 안 띄워 막힌다
      title: '피크상자',
      text: '피크상자를 열면 피크를 한 번에 채울 수 있어요.\n출석이나 보상으로 받아요.',
      panel: 'bottom',
      pulse: '#topbar-currency .currency-item:first-child',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '코드 맞추기',
      text: '직접 한 판 해볼게요.\n코드 맞추기를 눌러 주세요.',
      panel: 'bottom',
      target: '.training-card[data-key="chord-name"]',
      advanceOn: 'trainingcard:chord-name',
    },
    {
      // 레벨은 튜토리얼이 골라준다 — 레벨 목록이 그려진 뒤라 resume 직후에도 안전하다
      title: '코드 맞추기',
      text: '레벨 1로 맞춰 뒀어요.\n예습하기로 어떤 코드가 나오는지 볼까요?',
      panel: 'top',
      target: '.level-action-btn--secondary',
      // 레벨 화면 진입 애니(0.36s)와 커버 페이드(0.18s)가 끝난 뒤에 링을 켠다 —
      // 전환 중에 켜면 대상이 움직여 링 위치가 어긋난다.
      pulseDelay: 420,
      setup: () => window.selectLevelById?.(1),
      advanceOn: 'preview:open',
    },
    {
      // 오버레이 전체가 아니라 스크롤 영역만 연다 — 오버레이를 열면 바깥 여백을 눌러
      // 모달이 닫히면서 다음 구간(닫기 유도)이 갈 곳을 잃는다.
      title: '코드 맞추기',
      text: '이 레벨에서 나올 코드들이에요.\n미리 보고 나서 시작할 수 있어요.',
      panel: 'bottom',
      target: '#preview-modal-grid',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 목록을 끝까지 훑어볼 수 있어야 하므로 스크롤 영역도 함께 연다.
      // 여기 담기는 건 읽기 전용 코드 카드라 열어도 상태가 바뀌지 않는다
      // (조작 가능한 컨트롤이 들어 있는 시트를 통째로 여는 것과는 다른 경우).
      title: '코드 맞추기',
      text: '충분히 보신 다음에 닫아주세요!',
      panel: 'bottom',
      target: ['.preview-modal-header .icon-btn', '#preview-modal-grid'],
      pulse: '.preview-modal-header .icon-btn',
      advanceOn: 'preview:close',
    },
    {
      title: '코드 맞추기',
      text: '이제 시작해 볼게요.\n시작하기를 눌러 주세요.',
      panel: 'top',
      target: '.level-action-btn--primary',
      advanceOn: 'quizlevel:1',
    },
    {
      title: '코드 맞추기',
      text: '코드를 보고 이름을 맞추는 모드로 해볼게요.\n틀려도 괜찮으니 끝까지 풀어 보세요!',
      panel: 'top',
      target: '.mode-card[data-mode="name-from-diagram"]',
      advanceOn: 'quiz:started',
    },
    {
      // 화면 전체를 열어준다 — 보기 버튼·다음 버튼이 모두 눌려야 한다.
      // 푸는 동안은 설명창이 방해되므로 감춘다(안내는 앞 구간에서 끝냈다).
      title: '코드 맞추기',
      text: '',
      panel: 'top',
      target: '#view-quiz',
      pulse: false,
      hidePanel: true,
      advanceOn: 'quiz:result',
    },
    {
      title: '코드 맞추기',
      text: '수고했어요!\n방금 한 판이 어떻게 남았는지 볼까요?',
      panel: 'top',
      // 오답 목록만 훑어볼 수 있게 스크롤 영역만 연다 — 오버레이를 통째로 열면
      // '다시하기'가 눌려 피크가 또 소모되고 새 판이 시작돼 다음 구간과 어긋난다.
      target: '#result-items',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // setup은 퀴즈 페이지에서만 동작한다(훈련소엔 closeToTraining이 없다).
      // 페이지가 넘어가면 resume()이 이 구간을 다시 그리고, 그때 조건이 참이 되어 넘어간다.
      // 이동만 하는 구간이라 설명창은 감춘다 — 잠깐 떴다 사라지면 오히려 거슬린다.
      title: '훈련소',
      text: '',
      panel: 'top',
      pulse: false,
      hidePanel: true,
      setup: () => window.closeToTraining?.(),
      advanceOn: () => !!document.querySelector('.training-stats-wrap'),
    },
    {
      title: '훈련 통계',
      text: '방금 한 판이 그대로 기록됐어요.\n연속 기록, 훈련 시간, 훈련 완료가 올라갔죠?',
      panel: 'bottom',
      pulse: '.training-stats-wrap',
      optional: true,
      nextLabel: '다음',
    },
    {
      title: '{S} 완료',
      text: '튜토리얼에선 코드 맞추기만 해봤지만\n다른 훈련들도 즐겨보세요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 구A 전용(훈련소가 튜토리얼의 끝) — 새A/새B 둘 다 훈련소 뒤에 노트가 남아 죽은 코드.
      variant: '__dead_old_A',
      title: '{S} 완료',
      text: '한 번씩 둘러보며 실력을 쌓아 보세요!\n튜토리얼은 여기까지예요, 수고하셨어요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 새A(=구B)는 훈련소 다음이 바로 노트.
      variant: 'A',
      title: '{S} 완료',
      text: '한 번씩 둘러보며 실력을 쌓아 보세요!\n다음 스텝에선 나만의 악보를 만들어 볼게요.',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
    {
      // 새B는 훈련소 다음이 사전(2번).
      variant: 'B',
      title: '{S} 완료',
      text: '훈련소 설명이 전부 끝났어요!\n다음 스텝에선 코드 사전을 둘러볼게요!',
      panel: 'top',
      pulse: false,
      optional: true,
      nextLabel: '다음',
    },
  ];

  // 홈 화면(0번 구간)으로 되돌리는 진입 함수.
  // switchTab·enterFromHome은 home.js에만 있어서 training.html·user_project.html에서는 없다.
  // 변형에 따라 앞 챕터가 어느 페이지에서 끝날지 달라지므로(B: 훈련소 → 노트 만들기),
  // 함수가 없으면 페이지 자체를 옮긴다 — 진행 위치는 continueNext가 미리 저장해 두므로
  // home.html의 resume()이 그대로 이어받는다.
  const _enterHome = () => {
    if (typeof window.switchTab !== 'function') { location.href = 'home.html'; return; }
    window.switchTab('home', true);
    return window.enterFromHome?.('home', true);
  };

  // 챕터 정의. key는 순서가 바뀌어도 변하지 않는 식별자다 —
  // no(자리 번호)는 변형마다 달라지므로 코드에서 챕터를 가리킬 땐 항상 key를 쓴다.
  //   doneDesc : 이 챕터를 끝냈을 때의 문구. 마지막 자리에 오면 전체 완료 문구로 덮인다.
  const CHAPTER_DEFS = {
    'editor': {
      title: '코드 에디터',
      steps: STEP1_STEPS,
      // enterFirst: 0번 구간이 있는 화면 / enter: 중간 구간부터 시작할 때 진입할 화면
      enterFirst: () => window.enterFromHome?.('home', true),
      enter:      () => window.enterFromHome?.('editor', true),
      doneDesc:  '코드 에디터를 다 둘러봤어요.',
    },
    'library': {
      title: '코드 사전',
      steps: STEP2_STEPS,
      enterFirst: () => window.enterFromHome?.('home', true),
      enter:      () => window.enterFromHome?.('library', true),
      doneDesc:  '코드 사전을 다 둘러봤어요.',
    },
    'note-create': {
      title: '노트 만들기',
      steps: STEP3_STEPS,
      // 실제 노트·DB를 건드리지 않도록 이 스텝 동안만 샌드박스를 켠다
      onStart:    () => window.tutorialSandboxStart?.(),
      enterFirst: _enterHome,
      enter:      () => window.switchTab?.('projects', true),
      doneDesc:  '노트를 만들어 곡 한 줄을 완성했어요.',
    },
    'note-edit': {
      title: '노트 더 알아보기',
      steps: STEP4_STEPS,
      // 시드 노트는 user_project.js가 만든다(라이브러리 변환 로직이 그쪽에 있음).
      // ?tutseed=1로 넘기면 거기서 생성·저장하고 편집 모드로 열어준다.
      onStart:    () => window.tutorialSandboxStart?.(),
      enterFirst: () => { location.href = 'user_project.html?tutseed=1'; },
      enter:      () => { location.href = 'user_project.html?tutseed=1'; },
      doneDesc:  '노트를 자유롭게 다룰 수 있게 됐어요.',
    },
    'training': {
      title: '훈련소',
      steps: STEP5_STEPS,
      // 0번 구간이 홈이라 enterFirst는 홈으로, 중간 진입은 훈련소 페이지로 바로 보낸다
      enterFirst: _enterHome,
      enter:      () => { location.href = 'training.html'; },
      doneDesc:  '훈련소를 다 둘러봤어요.',
    },
  };

  // ── A/B 변형: 스텝 순서 실험 ────────────────────────────────
  //   A — 지금까지의 순서. 노트(제작)를 먼저 하고 훈련소로 마무리한다.
  //   B — 훈련소를 앞으로. 사전에서 배운 코드를 바로 퀴즈로 확인하고, 제작을 뒤로 미룬다.
  // 문구가 갈리는 구간은 각 구간의 variant 필드로 처리한다(필드가 없으면 두 변형 공통).
  const VARIANT_ORDER = {
    A: ['editor', 'library', 'training', 'note-create', 'note-edit'],
    B: ['training', 'library', 'editor', 'note-create', 'note-edit'],
  };

  // no는 "몇 번째 자리인가"이고 DB의 tutorial_step과 대응한다.
  // 변형마다 같은 번호가 다른 챕터를 가리키므로, 유저의 변형 배정값은 한 번 정해지면
  // 절대 다시 계산하지 않아야 한다(재배정되면 저장된 진행도의 의미가 깨진다).
  function buildChapters(variant) {
    const order = VARIANT_ORDER[variant] ? variant : 'A';
    const keys  = VARIANT_ORDER[order];
    return keys.map((key, i) => {
      const def  = CHAPTER_DEFS[key];
      const no   = i + 1;
      const last = i === keys.length - 1;
      return {
        ...def,
        key, no,
        steps: def.steps.filter(s => !s.variant || s.variant === order),
        doneTitle: `STEP ${no} 완료!`,
        doneDesc:  last ? '튜토리얼을 모두 마쳤어요.' : def.doneDesc,
      };
    });
  }

  // 변형 배정이 서버에서 늦게 오는 경우를 위해 빌더도 함께 내보낸다
  // (배정을 받은 뒤 다시 만들어 window.TUTORIAL_CHAPTERS를 교체하면 된다).
  if (typeof window !== 'undefined') window.TUTORIAL_BUILD_CHAPTERS = buildChapters;

  // 배정값은 바깥(실험 코드)에서 정한다. 없으면 A — 즉 기본 동작은 지금과 같다.
  return buildChapters(typeof window !== 'undefined' ? window.TUTORIAL_VARIANT : 'A');
})();

// ── 전역 노출 (tutorial.js가 참조) ─────────────────────────────
if (typeof window !== 'undefined') window.TUTORIAL_CHAPTERS = TUTORIAL_CHAPTERS;
