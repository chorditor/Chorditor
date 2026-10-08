// 영어 사전 — 퀘스트체인 튜토리얼(tutorial.js / tutorial-steps.js)과 튜토리얼 모달 본문(tutorial-content.js)
// 스텝 문구는 tutorial.js _fillSteps가 {S} 토큰을 채우기 전에 번역하므로 {S}·{S:key}를 그대로 둔다.
// 원문의 줄바꿈(\n)은 열쇠에서 공백 하나로 적는다.
I18N.add('en', {
  exact: {
    // ── 공통 ──
    '← 프렛 번호': '← Fret number',
    '이어서 할래요!': 'Keep going!',
    '잠김': 'Locked',
    '다시 보기': 'Replay',
    '시작': 'Start',
    '튜토리얼을 그만두시겠어요?': 'Quit the tutorial?',
    '지금 나가면 진행 중인 스텝을': "If you leave now, you'll have to",
    '처음부터 다시 해야 해요.': 'start this step over.',
    '지금 나가면 진행 중인 스텝을 처음부터 다시 해야 해요.': "If you leave now, you'll have to start this step over.",
    '튜토리얼을 모두 마쳤어요.': "You've finished the whole tutorial.",
    '가사 복사하기': 'Copy lyrics',

    // ── 스텝 제목 ──
    '{S} | 코드 에디터': '{S} | Chord Editor',
    '{S} | 코드 사전': '{S} | Chord Library',
    '{S} | 노트': '{S} | Songs',
    '{S} | 노트 더 알아보기': '{S} | More on Songs',
    '{S} | 훈련소': '{S} | Practice Room',
    '{S} 완료': '{S} complete',
    '줄': 'Strings',
    '개방현': 'Open strings',
    '뮤트': 'Mute',
    '개방현 · 뮤트 바꾸기': 'Switching open and mute',
    '코드 만들기': 'Making a chord',
    '소리 듣기': 'Hearing it',
    '바레': 'Barre',
    '# / b 바꾸기': 'Switching # / b',
    '프렛 번호': 'Fret number',
    '코드 이름 바꾸기': 'Renaming a chord',
    '노트에 담기': 'Saving to a Song',
    '근음 고르기': 'Choosing a root',
    '코드 고르기': 'Choosing a chord',
    '잡는 법 고르기': 'Choosing a fingering',
    '검색으로 찾기': 'Finding by search',
    '표기 바꾸기': 'Changing the notation',
    '에디터로 가져가기': 'Sending to the Editor',
    '노트 만들기': 'Creating a Song',
    '노트 더 알아보기': 'More on Songs',
    '편집 시작': 'Start editing',
    '코드 팔레트': 'Chord palette',
    '코드 담기': 'Adding a chord',
    '직접 만들기': 'Making your own',
    'C 코드 담기': 'Adding a C chord',
    '가사 쓰기': 'Writing lyrics',
    '붙여넣기': 'Pasting',
    '줄 지우기': 'Deleting a line',
    '코드 놓기': 'Placing a chord',
    '전체 재생': 'Play all',
    '코드 칸과 마디': 'Slots and bars',
    '줄 복사': 'Copying a line',
    '마디 수정': 'Editing bars',
    '되돌리기': 'Undo',
    '화면 방향': 'Screen orientation',
    '뷰 모드': 'View mode',
    '노트 목록': 'Song list',
    '노트 분류': 'Sorting Songs',
    '무료 플랜': 'Free plan',
    '중요로 지정': 'Marking as Important',
    '피크상자': 'Pick Box',

    // ── 완료 모달 ──
    '코드 에디터를 다 둘러봤어요.': "You've toured the Chord Editor.",
    '코드 사전을 다 둘러봤어요.': "You've toured the Chord Library.",
    '노트를 만들어 곡 한 줄을 완성했어요.': 'You created a Song and finished a line of music.',
    '노트를 자유롭게 다룰 수 있게 됐어요.': 'You can now handle Songs with confidence.',
    '훈련소를 다 둘러봤어요.': "You've toured the Practice Room.",

    // ── 코드 에디터 스텝 ──
    '안녕하세요, 코디터에 오신 것을 환영해요! {S}에서는 코드 에디터 사용법을 배워볼 거예요.':
      "Hi, and welcome to Chorditor!\nIn {S}, you'll learn how to use the Chord Editor.",
    '방금 사전에서 코드를 골라봤죠? {S}에서는 코드를 직접 만들고 바꿔볼 거예요.':
      "You just picked chords from the library, right?\nIn {S}, you'll build and change chords yourself.",
    '우선, 화면에 보이는 코드 에디터를 눌러 주세요!': 'First, tap Chord Editor on the screen!',
    '이곳은 코드 다이어그램을 편집해서 저장하고 활용해보는 곳이에요.':
      'This is where you edit chord diagrams,\nsave them, and put them to use.',
    '화면에 보이는 코드는 A 코드로 설명할게요.': "We'll use the A chord on screen to explain.",
    '가로선은 기타 줄이에요. 가장 얇은 줄이 1번, 가장 두꺼운 줄이 6번이에요.':
      'The horizontal lines are the strings.\nThe thinnest is string 1, the thickest is string 6.',
    '세로선은 프렛이에요. 몇 번째 칸인지 세는 거라고 보면 돼요.':
      "The vertical lines are the frets.\nThink of them as counting which space you're in.",
    '○는 개방현이에요. 누르지 않고 그대로 치는, 0프렛이라고 보면 돼요.':
      '○ means an open string.\nYou play it without pressing down, like fret 0.',
    '✕는 뮤트예요. 소리를 내지 않는 줄이에요.': "✕ means mute.\nThat string isn't played.",
    '○와 ✕는 눌러서 서로 바꿀 수 있어요. 지금은 그대로 두고 넘어갈게요!':
      "Tap ○ or ✕ to switch between them.\nWe'll leave them as they are for now!",
    '그럼 이제 에디터를 직접 만져볼까요? 깜빡이는 자리를 눌러 Am 코드로 바꿔 볼게요!':
      'Ready to try the editor yourself?\nTap the blinking spot to turn this into Am!',
    '잘하셨어요! Am 코드를 만들었어요! 에디터를 편집하면 자동으로 코드 이름이 추천돼요.':
      'Nice! You made an Am chord!\nAs you edit, the editor suggests chord names automatically.',
    '코드 편집을 완료했다면, 직접 소리를 들어볼 수 있어요! 재생 버튼을 클릭해 보세요.':
      'Once your chord is done, you can hear it!\nTap the play button.',
    '다음 설명을 위해 제가 A# 코드를 만들어 드릴게요.': "For the next part, I'll set up an A# chord for you.",
    '한 손가락으로 여러 줄을 한 번에 누르는 걸 바레라고 해요. 3프렛의 B 버튼을 눌러 보세요.':
      'Pressing several strings with one finger is called\na barre. Tap the B button at fret 3.',
    '같은 버튼을 다시 누르면 바레가 풀려요. 한 번 더 눌러 보세요.':
      'Tap the same button again to remove the barre.\nTap it once more.',
    'A# 코드는 1프렛을 바레로 눌러요. 1프렛 B 버튼을 눌러 보세요.':
      'The A# chord uses a barre at fret 1.\nTap the B button at fret 1.',
    '같은 코드도 A#과 Bb, 두 가지로 부를 수 있어요. b를 눌러 표기를 바꿔 보세요.':
      'The same chord can be called A# or Bb.\nTap b to switch the spelling.',
    '잘하셨어요! Bb 코드를 완성했네요!': "Nice! You've made a Bb chord!",
    '이번엔 프렛 번호를 조작해볼게요. ▶ 버튼을 두 번 눌러 4로 만들어 주세요!':
      "Now let's change the fret number.\nTap ▶ twice to make it 4!",
    '손 모양은 그대로지만 C 코드를 만들 수 있어요!': "Same hand shape, but now it's a C chord!",
    '손가락 번호를 표시할 수도 있어요! 버튼을 눌러 켜 보세요.':
      'You can show finger numbers, too!\nTap the button to turn them on.',
    '검지가 1번, 새끼손가락이 4번이에요. 엄지는 T예요. 2번을 고른 뒤 4번 줄의 점을 눌러 보세요.':
      'Index finger is 1, pinky is 4, and the thumb is T.\nPick 2, then tap the dot on string 4.',
    '이번엔 3번을 고르고 3번 줄의 점을 눌러 보세요.': 'Now pick 3 and tap the dot on string 3.',
    '마지막으로 4번을 고르고 2번 줄의 점을 눌러 보세요. 지울 때는 같은 번호로 클릭하면 지울 수 있어요.':
      'Last one: pick 4 and tap the dot on string 2.\nTo remove a number, tap it again with the same number.',
    '이렇게 만든 코드는 이미지로 저장할 수 있어요. 이미지 아이콘을 클릭해 봐요!':
      'You can save your chord as an image.\nTap the image icon!',
    '이곳에선 아래에서 저장될 이미지를 미리 볼 수 있어요.': 'Here you can preview the image before saving.',
    '저장한 이미지는 개인 노트나 자료 제작에 쓰거나, 지인들에게 코드를 알려줄 때도 활용할 수 있겠죠?':
      'Use saved images in your own notes and materials,\nor to show a chord to a friend.',
    '코드 이름은 여기서 직접 바꿀 수도 있어요!': 'You can change the chord name right here!',
    '추천에 없는 코드나 이름을 직접 정하고 싶을 때 써요. 휠은 코드가 확장되는 순서대로 놓여 있어요.':
      "Use it when the chord isn't suggested or you want your own name.\nThe wheels follow the order chords are built in.",
    '위쪽 휠을 돌려서 코드 이름을 마음껏 바꿔보세요!': 'Spin the wheels at the top and rename the chord however you like!',
    '노트는 나만의 악보집이에요. 코드 진행을 저장해두고 언제든 다시 꺼내 볼 수 있어요.':
      'Songs are your personal songbook.\nSave chord progressions and pull them up anytime.',
    '만든 코드는 노트에 담아 모아둘 수 있어요. "노트 추가" 버튼을 눌러 보세요.':
      'You can collect the chords you make in a Song. Tap the "Add to Song" button.',
    '여기서 담을 노트를 고르면 돼요. 노트 기능은 나중에 알려드릴게요. 닫기를 눌러 주세요.':
      "This is where you choose a Song. We'll cover Songs later. Tap Close.",

    // ── 코드 사전 스텝 ──
    '이번엔 코드 사전을 살펴볼게요. 깜빡이는 곳을 눌러 주세요!': "Now let's look at the Chord Library.\nTap the blinking spot!",
    '이곳은 거의 모든 코드를 담은 사전이에요. 직접 하나하나 검수했답니다!':
      'This library holds almost every chord.\nEach one was checked by hand!',
    '왼쪽에서 근음을 고르면 오른쪽에 해당 코드들이 나와요. G를 찾아서 눌러 보세요.':
      'Pick a root on the left and its chords appear on the right.\nFind G and tap it.',
    '이렇게 G를 근음으로 하는 코드들이 나와요. 첫 번째 G 코드를 눌러볼까요?':
      'Here are the chords built on G.\nTry tapping the first G chord.',
    '같은 G라도 잡는 법이 여러 가지예요. 첫 번째를 눌러 보세요.':
      'There are several ways to play the same G.\nTap the first one.',
    '같은 자리를 잡아도 손가락 번호는 다를 수 있어요. 화살표로 넘겨 보세요.':
      'Even in the same position, the fingering can differ.\nUse the arrows to flip through.',
    '여기서도 소리를 듣고 이미지로 저장할 수 있어요. 지금은 재생 버튼만 눌러볼까요?':
      'You can listen and save images here, too.\nFor now, just tap the play button.',
    '찾는 코드가 있으면 검색이 더 빨라요. G7을 입력하고 확인을 눌러 보세요.':
      'If you know the chord you want, search is faster.\nType G7 and press enter.',
    '이렇게 G7과 관련된 코드들이 모여서 나와요. 첫 번째를 눌러볼까요?':
      'Chords related to G7 show up together.\nTry tapping the first one.',
    '고른 코드는 바로 위에서 확인할 수 있어요. #/b 표기와 손가락 번호도 바꿀 수 있답니다.':
      'Your chosen chord shows right above.\nYou can switch #/b spelling and finger numbers, too.',
    '고른 코드를 에디터로 가져가 편집할 수 있어요. {S:editor}에서 배운 그 에디터예요.':
      "You can take the chord into the Editor to edit it.\nIt's the same Editor from {S:editor}.",
    '고른 코드를 에디터로 가져가 편집할 수 있어요. 에디터는 다음 스텝에서 배워볼게요!':
      "You can take the chord into the Editor to edit it.\nYou'll learn the Editor in the next step!",
    '마음에 드는 코드는 노트에 담아둘 수 있어요. {S:editor}에서 배운 것과 똑같아요.':
      'Save chords you like to a Song.\nIt works just like in {S:editor}.',
    '마음에 드는 코드는 노트에 담아둘 수 있어요. 노트는 뒤에서 자세히 알려드릴게요.':
      "Save chords you like to a Song.\nWe'll cover Songs in detail later.",
    '코드 사전은 여기까지예요! 다음 단계에서는 훈련소를 둘러볼게요.':
      "That's it for the Chord Library!\nNext up: a tour of the Practice Room.",
    '코드 사전은 여기까지예요! 다음 단계에서는 코드 에디터를 배워볼게요.':
      "That's it for the Chord Library!\nNext up: the Chord Editor.",

    // ── 노트 스텝 ──
    '코드 악보를 매번 검색하거나 손으로 적어두느라 번거롭지 않으셨나요?':
      'Tired of searching for chord charts every time,\nor writing them out by hand?',
    '이번 스텝에서는 나만의 코드 악보집을 만드는 방법을 알려드릴게요.':
      "In this step, you'll learn how to build\nyour own chord songbook.",
    '그럼 바로 시작해 볼까요? 아래 노트 탭을 눌러 주세요!': "Let's get started.\nTap the Songs tab below!",
    '이곳이 작성한 노트를 모아 보는 곳이에요. 오른쪽 위 + 버튼을 눌러 주세요!':
      'This is where all your Songs live.\nTap the + button at the top right!',
    '이름은 "새 노트"로 채워 뒀어요. 만들기를 눌러 주세요.':
      'We\'ve filled in the name "New Song" for you.\nTap Create.',
    '새 노트가 만들어졌어요. 연필 버튼을 눌러 편집을 시작해 주세요.':
      'Your new Song is ready.\nTap the pencil button to start editing.',
    '아래 이곳은 코드를 모아두는 팔레트예요. 앞서 담아둔 코드도 전부 여기 모여요.':
      'Down here is the palette, where your chords are kept.\nAny chords you saved earlier are here, too.',
    '그럼 직접 하나 담아 볼까요? + 버튼을 눌러 주세요!': "Let's add one.\nTap the + button!",
    '{S:library}의 코드 사전이 여기에도 담겨 있죠? 이곳에서 원하는 코드를 바로 담을 수 있어요!':
      'The Chord Library from {S:library} is here, too.\nYou can add any chord you want right from here!',
    '사전에 없는 코드가 있다면 직접 에디터에서 만들어 담을 수도 있어요!':
      "If a chord isn't in the library,\nyou can build it in the Editor and add it!",
    '그럼 C 코드를 담아 볼까요? 맨 앞의 C를 눌러 주세요!': "Let's add a C chord.\nTap C at the very front!",
    '이렇게 C를 잡는 방법들이 나와요. 첫 번째를 눌러볼까요?': 'Here are the ways to play C.\nTry tapping the first one.',
    '팔레트에 C가 담겼어요! 이제 닫기를 눌러볼까요?': 'C is in your palette!\nNow tap Close.',
    '팔레트에 C가 들어왔죠? 담은 코드는 이렇게 하나씩 쌓여요.': 'See C in the palette?\nChords you add stack up here one by one.',
    '코드가 많아지면 이렇게 옆으로 넘겨서 찾을 수 있어요.': 'When you have a lot of chords,\nswipe sideways like this to find them.',
    '노트엔 코드뿐 아니라 가사나 메모도 함께 적을 수 있어요.': 'Along with chords, a Song can hold\nlyrics and notes.',
    '먼저 가사부터 적어 볼까요? 첫 줄에 "반짝반짝 작은 별"을 적어 주세요!':
      'Let\'s start with lyrics.\nType "Twinkle twinkle little star" on the first line!',
    '잘하셨어요! 첫 줄이 채워졌네요. 맨 아래 + 버튼으로 두 번째 줄을 추가해 볼까요?':
      'Nice! The first line is filled in.\nTap the + button at the bottom to add a second line.',
    '가사는 여러 줄을 한 번에 붙여넣을 수도 있어요. 아래 버튼을 누르면 두 줄을 복사해 드릴게요!':
      "You can paste several lines of lyrics at once.\nTap the button below and I'll copy two lines for you!",
    '이제 두 번째 줄에 붙여 보세요! 길게 누르고 있으면 붙일 수 있을 거예요.':
      'Now paste them into the second line!\nPress and hold to paste.',
    '앗...! 첫 번째 가사가 중복되어 버렸네요. 점 세 개 버튼을 눌러보실래요?':
      'Oops...! The first lyric is there twice now.\nTry tapping the three-dot button.',
    '다행히 지울 수 있는 버튼이 있었네요! "이 줄 삭제"를 눌러 주세요.':
      'Good news, there\'s a delete button!\nTap "Delete this line."',
    '가사가 정리되었으니 코드를 넣어봐야겠죠? 팔레트의 C 코드를 끌어다 놓아 보세요!':
      "The lyrics are tidy, so let's add a chord.\nDrag the C chord from the palette and drop it in!",
    'C가 첫 번째 칸에 놓였어요! 이런 식으로 나만의 코드 악보를 만들 수 있어요.':
      'C is in the first slot!\nThis is how you build your own chord chart.',
    '악보만 만드는 거면 조금 아쉽겠죠? 그래서 연습에 더 도움이 되는 기능을 넣어두었어요!':
      'Just making charts would be a bit plain, right?\nSo there are features to help you practice, too!',
    '반짝이는 C 코드를 한 번 눌러볼까요?': 'Try tapping the glowing C chord.',
    '어떠셨어요? C 코드 소리가 났죠! 적용한 코드는 언제든 눌러서 확인할 수 있어요.':
      "How was that? You heard the C chord!\nTap any chord you've placed to hear it anytime.",
    '연습할 땐 박자도 중요하겠죠? 메트로놈을 활성화해 볼까요?':
      "Timing matters when you practice.\nLet's turn on the metronome.",
    '이제 처음부터 끝까지 들어 볼까요? 재생하면 메트로놈도 함께 들릴 거예요!':
      "Now let's hear it from start to finish.\nHit play and you'll hear the metronome, too!",
    '코드 칸 하나는 2박자 길이예요. 한 줄은 2마디라서 칸이 네 개랍니다.':
      'Each chord slot lasts 2 beats.\nA line is 2 bars, so it has four slots.',
    '나만의 코드 악보가 완성되었어요! 다음 단계에선 박자, 카포 같은 기능을 다뤄볼게요.':
      "Your own chord chart is done!\nNext, we'll cover things like time signatures and capo.",

    // ── 노트 더 알아보기 스텝 ──
    '이번 스텝에선 노트를 더 자세히 다루고 정리하고 관리하는 법까지 알아볼 거예요!':
      "In this step, we'll go deeper into Songs,\nincluding how to organize and manage them!",
    "제가 '작은 별' 한 소절을 미리 만들어 뒀어요. 이걸로 기능을 익혀 봅시다!":
      "I've set up a bit of 'Twinkle Twinkle' for you.\nLet's use it to learn the features!",
    '노래 가사는 반복되는 부분이 많죠? 일일이 작성하려면 시간이 오래 걸릴 거예요.':
      'Song lyrics repeat a lot.\nWriting each line out would take forever.',
    '하지만 만들어 둔 줄을 복사하면 편리하겠죠? 점 세 개 메뉴를 눌러 보세요!':
      "Copying a line you've already made is much easier.\nTap the three-dot menu!",
    '"현재 줄 복사"를 눌러 주세요.': 'Tap "Copy this line."',
    '아래에 똑같은 줄이 생겼어요! 복사된 줄은 항상 맨 아래에 생기니 유의해주세요!':
      'An identical line appeared below!\nNote that copied lines always go to the very bottom.',
    '다음 설명을 위해 방금 만든 줄을 삭제합시다. 버튼을 눌러서 삭제해주세요!':
      "For the next part, let's delete that new line.\nTap the button to delete it!",
    '어떤 곡은 중간에 박자나 마디 수가 바뀌기도 하고, 템포가 달라지는 노래도 있어요.':
      'Some songs change time signature or bar count midway,\nand some change tempo.',
    '그런 복잡한 노래도 얼마든지 만들 수 있어요! 다시 한 번 점 세 개 메뉴를 눌러주세요!':
      'You can chart songs like that, too!\nTap the three-dot menu again!',
    '"마디 정보 수정"을 눌러 주세요.': 'Tap "Edit bar info."',
    'BPM은 곡의 빠르기예요. 확실히 느려지도록 60으로 낮춰 볼까요?':
      "BPM is the song's tempo.\nLet's drop it to 60 so it clearly slows down.",
    '아래 숫자는 누를 때마다 정해진 값으로 바뀌고 위 숫자는 직접 입력해요. 6/8로 만들어 볼까요?':
      "The bottom number cycles through set values when tapped,\nand you type the top number. Let's make it 6/8.",
    '마디 수는 한 줄에 담을 마디 개수예요. 1마디를 골라 주세요.':
      'Bars is how many bars fit on one line.\nChoose 1 bar.',
    '이 줄만 느려지고 6/8박자가 됐어요. 저장을 눌러볼까요?': 'Only this line is slower and in 6/8 now.\nTap Save.',
    '두 번째 줄만 빠르기와 박자가 달라졌어요. 메트로놈을 켜 뒀으니 재생해서 끝까지 들어볼까요?':
      'Only the second line has a new tempo and time signature.\nThe metronome is on, so hit play and listen to the end.',
    '어때요? 확실히 바뀌었죠? 단, 마디를 줄이면 잘려나간 마디의 코드는 사라지니 유의해주세요!':
      'Hear the difference? Just note that if you reduce the bars,\nchords in the removed bars are lost!',
    '혹시 실수로 바뀌었다면 되돌릴 수 있어요! 되돌리기 버튼을 눌러볼까요?':
      'If you change something by mistake, you can undo it!\nTry tapping the undo button.',
    '휴~ 수정하기 전으로 제대로 되돌아갔죠? 실수해도 걱정 말고 마음껏 편집해 보세요!':
      "Phew, it's back to how it was.\nDon't worry about mistakes. Edit freely!",
    '카포를 사용해야 하는 곡들도 많이 있어요. 직접 카포를 적용해봅시다!':
      "Plenty of songs need a capo.\nLet's try applying one!",
    '먼저 적용하기 전의 C 코드를 들어볼까요?': "First, let's hear the C chord without it.",
    '이제 카포를 1 올려서 1프렛에 카포를 낀 효과를 줍시다! C# 코드가 되겠죠?':
      "Now raise the capo by 1, as if it's on fret 1!\nThat makes it a C# chord.",
    '다시 한 번 C 코드를 들어봅시다.': "Let's hear the C chord again.",
    '어떤가요? 제대로 카포가 적용되었어요! 이렇게 카포 적용까지 알아봤어요.':
      "Hear that? The capo is working!\nThat's how you apply a capo.",
    '코드가 빽빽하거나 가사가 긴 곡은 세로 화면이 답답할 수 있어요.':
      'Songs with dense chords or long lyrics\ncan feel cramped in portrait.',
    '가로로 돌리면 한 마디의 코드 칸이 4개로 늘고 줄도 넓어져 긴 가사까지 시원하게 담겨요.':
      'In landscape, each bar gets 4 chord slots\nand lines get wider, so long lyrics fit comfortably.',
    '버튼 없이 기기를 가로로 돌리기만 하면 화면이 자동으로 가로 모드로 바뀌어요.':
      'No button needed. Just turn your device sideways\nand the screen switches to landscape.',
    '편집이 끝났다면 체크 버튼을 눌러 편집을 마칠 수 있어요.': "When you're done editing,\ntap the check button to finish.",
    '눈동자 아이콘을 누르면 코드 그림을 숨겨 가사만 깔끔하게 볼 수 있어요. 눌러볼까요?':
      'Tap the eye icon to hide the chord diagrams\nfor a clean lyrics view. Give it a tap.',
    '가사랑 코드이름만 남아 화면이 깔끔해졌죠? 다시 눌러 코드를 되돌려 주세요.':
      'Just lyrics and chord names now. Much cleaner, right?\nTap again to bring the diagrams back.',
    '이제 악보 만드는 기능은 전부 마스터하셨어요! 남은 건 만든 노트를 정리하는 방법이에요.':
      "You've mastered everything for making charts!\nAll that's left is organizing your Songs.",
    '목록으로 나가 볼까요? 왼쪽 위 버튼을 눌러 주세요!': "Let's head back to the list.\nTap the button at the top left!",
    '노트가 쌓이면 원하는 곡을 찾기 어려워지죠? 그래서 최근 · 즐겨찾기 · 중요로 나눠 뒀어요.':
      "As Songs pile up, it gets harder to find the one you want.\nSo they're split into Recent, Favorites, and Important.",
    '자주 펼쳐 보는 노트는 즐겨찾기에 올려두면 매번 찾지 않아도 돼요!':
      "Put the Songs you open often in Favorites\nand you won't have to hunt for them!",
    '무료 이용자라면 노트는 3개까지 만들 수 있어요.': 'On the free plan, you can create up to 3 Songs.',
    '만약 구독 중에 더 많은 노트를 만들어 두셨다면 중요 목록에 등록해야 잠기지 않을 수 있어요!':
      'If you made more Songs while subscribed,\nadd them to Important to keep them from locking!',
    "아끼는 노트는 미리 옮겨두는 게 좋겠죠? '작은 별' 오른쪽 점 세 개 버튼을 눌러 보세요!":
      "It's a good idea to move your favorite Songs over ahead of time.\nTap the three-dot button to the right of 'Twinkle Twinkle'!",
    '왕관 버튼을 누르면 중요로 옮겨져요. 왕관 버튼을 눌러주세요!': 'The crown button moves it to Important.\nTap the crown button!',
    '노트를 다루는 법을 전부 익히셨어요! 이제 나만의 악보집을 채워 나가면 돼요.':
      "You've learned everything about Songs!\nNow go fill up your own songbook.",
    '틈틈이 훈련소도 들러 실력을 쌓아 보세요! 튜토리얼은 여기까지예요, 수고하셨어요!':
      "Stop by the Practice Room now and then to build your skills!\nThat's the end of the tutorial. Great job!",

    // ── 훈련소 스텝 ──
    '안녕하세요, 코디터에 오신 것을 환영해요! {S}에서는 훈련소를 둘러볼 거예요.':
      "Hi, and welcome to Chorditor!\nIn {S}, we'll take a tour of the Practice Room.",
    '기타 연습, 뭘 어떻게 해야 할지 막막할 때가 있죠?': 'Ever feel stuck on what to practice,\nor how?',
    '이번 스텝에선 기타를 더 재미있고 효율적으로 연습할 수 있는 훈련 시스템을 소개드릴게요!':
      "In this step, I'll introduce a practice system\nthat makes guitar practice more fun and effective!",
    '그래서 재미있고 알차게 연습할 수 있는 훈련 컨텐츠를 준비해뒀어요!':
      "That's why we've put together practice content\nthat's fun and worthwhile!",
    '어떤 컨텐츠가 있는지 살펴볼까요?': "Let's see what's inside.",
    '기타 연습을 더 재미있고 쉽게 할 수 있도록 여러 가지 훈련 컨텐츠를 만들어 두었어요!':
      "We've built a range of practice content\nto make guitar practice easier and more fun!",
    '코드 암기를 게임처럼! 제한 시간 안에 빠르게 맞혀보는 훈련이에요.':
      'Chord memorization, made into a game!\nName the chord quickly before time runs out.',
    '기타 솔로, 즉흥 연주가 꿈이라면 필수예요. 스케일을 손에 익혀보세요.':
      'A must if you dream of solos and improvising.\nGet scales into your hands.',
    '매번 따로 외워야 했던 코드 진행, 패턴으로 몸에 각인시켜요.':
      'Chord progressions you used to memorize one by one:\nlearn them as patterns your body remembers.',
    '노래에 자주 쓰이는 리듬 패턴만 집중적으로 공략해요.': 'Focus on just the rhythm patterns\nused most in songs.',
    '어렵게만 느껴지던 화성학, 퀴즈만 풀어도 자연스럽게 익혀져요.':
      'Music theory always felt hard?\nJust play the quizzes and it sinks in naturally.',
    '흐릿한 카드는 준비 중이에요. 앞으로 계속 늘어날 거예요.': 'Faded cards are coming soon.\nMore will keep being added.',
    '훈련에는 피크가 들어가요. 30분마다 1개씩, 하루 30개까지 채워져요.':
      'Practice uses Picks.\nYou get 1 every 30 minutes, up to 30 a day.',
    '피크상자를 열면 피크를 한 번에 채울 수 있어요. 출석이나 보상으로 받아요.':
      'Open a Pick Box to refill your Picks all at once.\nYou get them from check-ins and rewards.',
    '직접 한 판 해볼게요. 코드 맞추기를 눌러 주세요.': "Let's play a round.\nTap Chord Quiz.",
    '레벨 1로 맞춰 뒀어요. 예습하기로 어떤 코드가 나오는지 볼까요?':
      "It's set to Level 1.\nTap Preview to see which chords will come up.",
    '이 레벨에서 나올 코드들이에요. 미리 보고 나서 시작할 수 있어요.':
      'These are the chords in this level.\nYou can look them over before you start.',
    '충분히 보신 다음에 닫아주세요!': "Close it once you've had a good look!",
    '이제 시작해 볼게요. 시작하기를 눌러 주세요.': "Now let's begin.\nTap Start.",
    '코드를 보고 이름을 맞추는 모드로 해볼게요. 틀려도 괜찮으니 끝까지 풀어 보세요!':
      "We'll use the mode where you see a chord and name it.\nMistakes are fine, just play to the end!",
    '수고했어요! 방금 한 판이 어떻게 남았는지 볼까요?': "Nice work!\nLet's see how that round was recorded.",
    '방금 한 판이 그대로 기록됐어요. 연속 기록, 훈련 시간, 훈련 완료가 올라갔죠?':
      'That round is on the books.\nStreak, Practice time, and Completed all went up!',
    '튜토리얼에선 코드 맞추기만 해봤지만 다른 훈련들도 즐겨보세요!':
      'We only tried Chord Quiz in the tutorial,\nbut enjoy the other practice modes, too!',
    '훈련소 설명이 전부 끝났어요! 다음 스텝에선 나만의 악보를 만들어 볼게요.':
      "That's the whole Practice Room tour!\nIn the next step, you'll make your own chart.",
    '훈련소 설명이 전부 끝났어요! 다음 스텝에선 코드 사전을 둘러볼게요!':
      "That's the whole Practice Room tour!\nIn the next step, we'll explore the Chord Library!",

    // ── 튜토리얼 모달 본문(tutorial-content.js) ──
    "코디터가 '누구나 언제 어디서나 기타를 즐기는 세상'이라는 슬로건으로 완전히 새롭게 돌아왔습니다!":
      'Chorditor is back, completely rebuilt around one idea: guitar for everyone, anytime, anywhere!',
    '다양한 도구, 훈련 기능, 레슨 등의 콘텐츠로 방구석이든 공원이든 언제 어디서나 친근한 기타 앱으로서의 성장을 목표로 나아가고 있습니다.앞으로의 코디터 기대해 주세요!':
      "With tools, practice modes, lessons, and more, we want to be a friendly guitar app wherever you play, in your bedroom or at the park. Stay tuned for what's next!",
    '주법 리듬 훈련 컨텐츠 개방': 'Strumming Patterns unlocked',
    '스케일 훈련 Ch.3 개방': 'Scale Blocks Ch. 3 unlocked',
    '코드 재생 시 기본 드럼 비트 삽입': 'Basic drum beat added to chord playback',
    '개발자의 한 마디': 'A word from the developer',
    '코디터에 오신 걸 진심으로 환영합니다! 누구나 기타를 쉽게 배우고, 배움이 부담스러워서 포기하시는 분들에게도 기타의 즐거움을 알려주고 싶어서 코디터 개발을 기획하게 되었습니다.':
      'A warm welcome to Chorditor! I started building it so that anyone can learn guitar easily, and so that people who gave up because learning felt like too much can still discover how fun guitar is.',
    '아직은 기능적으로, 디자인적으로 부족하지만 여러분께 최고의 기타 앱으로 기억되도록 노력하겠습니다.':
      "It still has a way to go in features and design, but I'll keep working to make it the best guitar app you've used.",
    '코디터 간단 설명서': 'Chorditor quick guide',
    '이제 프랫보드의 운지를 변경하면 즉시 가장 알맞은 코드명으로 변경됩니다! 상단에는 해당 코드의 추천명이 뜰 텐데, 보통 1~2개만 뜰 때는 직접 입력해 둔 코드이기 때문에 안심하셔도 됩니다. 하지만 추천명이 여러 개가 뜬다면 그 코드명은 정확하지 않을 가능성이 높습니다. 앞으로 세상의 모든 코드 이름이 정확하게 표기될 수 있도록 개선할 것입니다.':
      "Change the fingering on the fretboard and the chord name updates right away to the best match! Suggested names appear at the top. When only one or two show up, they're chords we entered by hand, so you can trust them. If several show up, the name is more likely to be off. We'll keep improving until every chord is named accurately.",
    '휠피커는 이론적으로 코드가 만들어지는 순서라고 생각하셔도 됩니다. 각 기능에 어떤 법칙이 숨어 있는지는 앞으로의 레슨을 기대해 주세요!':
      'Think of the wheel pickers as following the order chords are built in theory. The rules behind each part will be covered in future lessons!',
    '만들어진 코드는 재생해서 들어볼 수 있고, 이미지로 저장해서 여러 가지 용도로 활용하실 수 있습니다. 손바닥 아이콘으로 손가락 번호를 지정해 연습에 활용하실 수도 있습니다. 영상 제작에 활용하셔도 되고 개인 자료로 활용하셔도 좋습니다. 마음껏 사용해 주세요!':
      'You can play back the chords you make and save them as images for any use. Use the hand icon to set finger numbers for practice. Use them in videos or in your own materials. Use them however you like!',
    '노트를 만드셨다면 (혹은 만드실 때) 에디터에서 작성한 코드를 그대로 노트로 가져올 수 있습니다. 노트에서도 편집 시 언제든지 에디터로 수정할 수 있습니다.':
      'Once you have a Song (or while creating one), you can bring chords from the Editor straight into it. While editing a Song, you can jump to the Editor to change a chord anytime.',
    '거의 모든 코드가 담겨 있는 코드 사전입니다. 화성학 이론과 경험을 바탕으로 기타에서 잡을 수 있는 거의 모든 코드를 탑재할 것입니다. 이미 충분한 양의 코드를 탑재하였기 때문에 코드가 문제 되는 일은 없을 것입니다!':
      "A library with almost every chord. Based on music theory and experience, it aims to include nearly every chord playable on guitar. There are already plenty in here, so you shouldn't run short!",
    '만든 코드를 팔레트에 모아두세요. 그리고 나만의 연습장을 만드세요. 매번 프랫보드에 한 땀 한 땀 점을 찍는 일은 안 하셔도 됩니다. 4칸/8칸 모드, 카포, BPM을 설정한 후 재생하면서 연습하실 수 있습니다!':
      'Collect your chords in the palette and build your own practice sheet. No more dotting the fretboard one note at a time. Set 4- or 8-slot mode, capo, and BPM, then play along as you practice!',
    '4칸 모드 : 한 슬롯 당 1마디': '4-slot mode: 1 bar per slot',
    '8칸 모드 : 한 슬롯 당 1/2마디': '8-slot mode: 1/2 bar per slot',
    '텍스트에 노래 가사 또는 코드 설명을 작성해서 자유롭게 활용하시면 됩니다. 이렇게 만든 노트는 공유 코드로 지인들과 공유할 수 있습니다.':
      'Write lyrics or chord notes in the text area and use it however you like. You can share your Songs with friends using a share code.',
    '단, 제목이나 텍스트 내용은 공유되지 않습니다. 노래 저작권 문제로 해당 내용은 공유에서 제외됩니다. (앞으로 코디터가 성장해서 저작권을 취득하고 더욱 풍성한 콘텐츠를 제공할 수 있도록 여러분의 많은 관심 부탁드립니다!)':
      "Note that titles and text are not shared. They're left out because of song copyright. (We hope to grow enough to license songs and offer richer content, so thanks for your support!)",
    '훈련소 / 나의 기타 여정': 'Practice Room / Guitar Roadmap',
    "'훈련소'에서는 지루한 반복 학습을 재미있게 할 수 있는 여러 가지 훈련 콘텐츠가 제공됩니다.":
      'The Practice Room offers practice content that makes repetitive drills fun.',
    "'나의 기타 여정'에서는 코디터만의 커리큘럼으로 여러분이 자연스럽게 기타 실력을 향상해 가는 레슨 콘텐츠를 기획하고 있습니다. 자연스럽게 따라만 하면 나도 모르게 중·고급 화성학을 연주할 수 있는 여정이 될 것입니다. 기대해 주세요!":
      "In Guitar Roadmap, we're planning lessons built on Chorditor's own curriculum to grow your playing naturally. Just follow along and you'll find yourself playing intermediate and advanced harmony before you know it. Stay tuned!",
  },

  patterns: [
    [/^STEP ?(\d+) 완료!$/, 'STEP {1} complete!'],
    [/^STEP(\d+) \| (.*)$/, 'STEP{1} | {2}'],
  ],
});
