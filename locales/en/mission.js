// 영어 사전 — 데일리 미션(daily-mission / mission-session / mission-result-messages), 출석(attendance)
(() => {
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pl = (n, one, many) => n + ' ' + (Number(n) === 1 ? one : (many || one + 's'));

  I18N.add('en', {
    exact: {
      'Chorditor - 오늘의 미션': 'Chorditor - Daily Mission',
      'Chorditor - 출석체크': 'Chorditor - Daily Check-in',

      // ── 출석 ──
      '꾸준히 연습해서 실력을 키워봐요!': 'Keep at it and watch your skills grow!',
      '오늘의 훈련 루틴 하러가기': "Go to today's routine",
      '오늘 훈련 결과보기': "See today's results",
      '오늘은 출석을 완료했어요': "You're checked in for today",
      '아직 오늘 출석을 못했어요': "You haven't checked in yet today",
      '보충출석': 'Streak Freeze',
      '이번 달 출석 완료!': 'Month complete!',
      '이번 달 출석을 모두 채웠어요.': "You've filled in every check-in this month.",
      '다음 달에 새로 시작해요!': 'A fresh start next month!',

      // ── 데일리 미션 입구 ──
      '매일 연습 루틴': 'Daily Practice Routine',
      '아래의 훈련을 진행해요': "Here's today's lineup",
      '코드맞추기': 'Chord Quiz',
      '코드조합훈련': 'Reharm Quiz',
      '코드 조합': 'Reharm Quiz',
      '시작할래요!': "Let's go!",

      // ── 준비 화면 ──
      '오늘의 미션을 준비하고 있어요': 'Getting your Daily Mission ready',
      '학습 데이터를 불러오는 중': 'Loading your practice data',
      '실력에 맞는 문제를 고르는 중': 'Picking questions for your level',
      '오늘의 미션을 준비하는 중': 'Setting up your Daily Mission',
      '기타가 있다면 지금 가져와주세요.': 'Got a guitar nearby? Grab it now.',
      '직접 잡아보며 연습하면 훨씬 도움이 돼요!': 'Practicing with it in your hands helps a lot!',

      // ── 코드맞추기 ──
      '헷갈리는 코드 암기를 재미있게 훈련해요': 'A fun way to memorize tricky chords',
      '기타가 있다면 직접 잡아보면서 암기해봐요!': 'If you have your guitar, play each one as you go!',
      '이번 훈련에 등장할 코드예요': 'These chords are coming up',
      '클릭하면 소리가 들려요!': 'Tap one to hear it!',
      '준비됐어요!': "I'm ready!",
      '맞춰주세요!': 'to answer them all!',
      '최대한 빠르게 맞춰보세요!': 'Answer as fast as you can!',
      '카운트가 시작됩니다.': 'Countdown starting.',
      '올바른 정답을 선택하세요': 'Pick the right answer',
      '헉, 이렇게 빨리 맞추시다니 대단하신걸요...?': 'Whoa, that was fast. Impressive!',
      '엄청 빠르네요!! 혹시 찍으신 건 아니겠죠?!': "So fast!! You didn't just guess, did you?!",
      '탈인간적 속도입니다!!': 'Inhuman speed!!',
      '정답입니다! 열심히 외우신게 느껴지네요~!': 'Correct! All that practice is showing!',
      '와! 조금만 더 빨라지면 마스터 하시겠는걸요?!': "Wow! A little faster and you'll have it mastered!",
      '정답입니다. 조금만 더 빨라지면 충분히 연주하실 수 있겠어요!': "Correct. A bit faster and you'll be playing it for real!",
      '축하합니다, 정답이예요! 금방 코드를 다 외우시겠는걸요~?': "Nice, that's right! You'll know all these chords in no time.",
      '정답입니다!! 포기하지 않고 결국 맞추셨네요!': 'Correct!! You stuck with it and got there!',
      '약간 헷갈리셨지만 정답이예요 축하합니다!': 'A little hesitation, but you got it. Nice!',
      '앗, 약간 헷갈리셨나봐요! 얼마든지 도전할 수 있어요': 'Oops, that one was tricky! You can try as many times as you like',
      '아쉽게도 틀리셨네요ㅠㅠ 금방 외워질거예요!': "Not quite this time. It'll stick soon!",
      '틀리셔도 괜찮아요! 시간은 많답니다~': "No worries about missing it! There's plenty of time.",

      // ── 스케일 ──
      '기타 솔로 연주에 필수 훈련!': 'Essential practice for guitar solos!',
      '스케일 블럭을 외우는 훈련이예요': 'Here you memorize scale blocks',
      '이번 훈련에 나올 5가지 블럭이예요': 'These 5 blocks are coming up',
      'Tip. 2칸 차이, 3칸 차이에 주목해보세요!': 'Tip: watch for the 2-fret and 3-fret gaps!',
      '마이너 펜타토닉': 'Minor Pentatonic',
      '메이저': 'Major',
      '메이저 펜타토닉': 'Major Pentatonic',
      '메이저 블루스': 'Major Blues',
      '마이너 블루스': 'Minor Blues',
      '내추럴 마이너': 'Natural Minor',
      '하모닉 마이너': 'Harmonic Minor',
      '프리지안 도미넌트': 'Phrygian Dominant',
      '믹솔리디안 b9 b13': 'Mixolydian b9 b13',
      '얼터드': 'Altered',
      'A폼': 'A form',
      'G폼': 'G form',
      'E폼': 'E form',
      'D폼': 'D form',
      'C폼': 'C form',
      '올바른 곳을 채우세요!': 'Fill in the right spots!',
      '제출하기': 'Submit',

      // ── 코드 조합 ──
      '코드 진행을 연습할 수 있어요!': 'Practice real chord progressions!',
      '악보 없이 연주하는데 최고의 연습이 될 거예요!': 'The best training for playing without a chart!',
      '순서를 외워주세요!': 'Memorize the order!',
      '주어진 진행을 순서대로 배치하세요': 'Put the progression in order',
      '힌트보기': 'Hint',
      'M7코드는 9, #11, 13 텐션을 사용할 수 있어요!': 'M7 chords can take the 9, #11, and 13 extensions!',
      'm7코드는 9, 11 텐션을 사용할 수 있어요!': 'm7 chords can take the 9 and 11 extensions!',
      '7코드는 모든 텐션을 사용할 수 있어요!': '7 chords can take any extension!',
      '어울리는 텐션을 찾아서 바꿔보세요': 'Find an extension that fits and swap it in',
      '아래에서 정답을 찾아 배치하세요!': 'Find the answer below and place it!',
      '아래에서 정답을 찾아 바꿔보세요!': 'Find the answer below and swap it in!',
      '(으)로 바꿔보세요': '',

      // ── 이탈 확인 ──
      '풀이를 그만두시겠어요?': 'Stop here?',
      '지금 나가면 오늘 진행 상황이': "If you leave now, today's progress",
      '저장되지 않아요.': "won't be saved.",
      '지금 나가면 오늘 진행 상황이 저장되지 않아요.': "If you leave now, today's progress won't be saved.",

      // ── 결산 ──
      '훈련 결과!': 'Your results!',
      '낮음': 'Low',
      '평균': 'Avg',
      '높음': 'High',
      '정답이 없어 통계를 낼 수 없어요': 'No correct answers, so no stats this time',
      '맞춘 노트': 'Notes hit',
      '틀린 노트': 'Notes missed',
      '오답 풀기': 'Retry missed',
      '종료하기': 'Finish',
      '오답 풀고 추가 보상 받아가세요!': 'Retry what you missed for a bonus reward!',
      '오늘의 훈련을 모두 마쳤어요!': "You've finished today's practice!",
      '광고 보고 2배': 'Watch ad for 2×',
      '광고 보상 2배 적용!': '2× ad reward applied!',
      'Pro 보상 2배 적용!': 'Pro 2× reward applied!',
      '보상 2배 받기': 'Get 2× reward',
      '훈련 루틴 완료!': 'Daily Routine complete!',
      '오늘의 훈련을 끝냈어요': "You finished today's practice.",
      '보상을 받아가세요!': 'Grab your reward!',
      '오답 풀기 완료!': 'Retry complete!',
      '틀린 문제를 전부 다시 맞혔어요': 'You fixed every one you missed.',
      '추가 보상을 받아가세요!': 'Grab your bonus reward!',
      '전 문항 정답!': 'All correct!',
      '만점이에요!': 'Perfect score!',
      '오답 풀기 몫까지 한 번에 받아가세요!': 'You get the retry bonus too, all at once!',
      '오늘 보상은 이미 받았어요': "You've already claimed today's reward",
      '전부 다시 맞혔어요!': 'You got them all this time!',
      '오늘 추가 보상은 이미 받았어요': "You've already claimed today's bonus",
      '코드 이름과 운지를 보자마자 떠올리는 순발력을 기릅니다': 'Builds instant recall of chord names and fingerings',
      '지판 위 스케일 블럭을 손이 기억하게 만드는 훈련입니다': 'Trains your hands to remember scale blocks on the fretboard',
      '코드끼리 자연스럽게 이어붙이는 화성 감각을 기릅니다': 'Builds your feel for connecting chords naturally',

      // ── 승급 시험 ──
      '다음 단계': 'the next level',
      '그동안 쌓은 실력을 확인할 시간이에요': "Time to show what you've built up",
      '3영역을 모두 통과하면 승급합니다': 'Pass all 3 sections to level up',
      '영역마다 제한시간이 있어요': 'Each section has a time limit',
      '시험 도전!': 'Take the test!',
      '오늘 도전 횟수를 다 썼어요': "You've used all of today's attempts",
      '아래 기준을 넘으면 이 영역은 통과예요': 'Meet the bar below to pass this section',
      '문항 수': 'Questions',
      '통과 기준': 'Passing score',
      '제한 시간': 'Time limit',
      '추후 안내': 'TBA',
      '준비됐으면 시험을 시작합니다!': "Start when you're ready!",
      '승급 성공!': 'You leveled up!',
      '3영역 모두 통과했어요': 'You passed all 3 sections',
      '새 페르소나': 'New level',
      '획득 경험치': 'XP earned',
      '다음 단계 콘텐츠가 열렸어요!': 'Next-level content is unlocked!',
      '아쉬워요': 'So close',
      '이번엔 기준을 못 넘었어요': "You didn't clear the bar this time",
      '괜찮아요, 다시 도전하면 돼요!': "That's okay, just try again!",
      '영역별 결과예요': 'Results by section',
      '제한시간을 초과해서 나머지는 시간 제한 없이 풀었어요': 'Time ran out, so you finished the rest untimed',
      '언제든 다시 도전할 수 있어요': 'You can retry anytime',
      '나중에': 'Later',
      '시간 초과로 실패했어요': 'Time ran out',
      '그래도 남은 문제를 연습 삼아 풀어볼까요?': 'Want to finish the rest for practice?',
      '나가기': 'Exit',
      '끝까지 풀기': 'Finish anyway',
    },

    scoped: [
      // "OO님, 오늘의 훈련 루틴을 준비했어요! / 하루 3분 훈련하고 추가 보상 받아가세요"
      ['.ob-step8-desc', {
        '님, 오늘의 훈련 루틴을 준비했어요!': ', your routine for today is ready!',
        '하루': 'Practice',
        '3분': '3 min',
        '훈련하고': 'a day and get',
        '추가 보상': 'bonus rewards',
        '받아가세요': '',
      }],
      // "매일의 훈련 루틴을 완료해서 출석해요"
      ['.attendance-desc', {
        '매일의': 'Finish your',
        '훈련 루틴': 'Daily Routine',
        '을 완료해서': ' to',
        '출석': 'check in',
        '해요': '',
      }],
      ['.ms-result-stat-headline', { '상위': 'Top' }],
    ],

    patterns: [
      [/^(\d+)월 출석$/, m => MONTH[m[1] - 1] + ' check-ins'],
      [/^제한시간 (\d+)초 안에$/, 'You have {1} seconds'],

      // 스케일
      [/^(.+) 스케일 (.+) 블럭을 채워주세요$/, 'Fill in the {1} scale, {2} block'],
      [/^(\d+)번폼$/, 'Form {1}'],
      [/^오답 (\d+)개$/, '{1} missed'],

      // 코드 조합 힌트·지문
      [/^([A-G][#b]?) ?메이저 스케일은 (.+) 예요[.!]$/, 'The {1} major scale is {2}.'],
      [/^([A-G][#b]?m?) ?마이너 스케일은 (.+) 예요[.!]$/, 'The {1} minor scale is {2}.'],
      [/^(.+) 스케일은 (.+) 예요[.!]$/, 'The {1} scale is {2}.'],
      [/^타겟인 (.+)의 5번째 코드를 찾아보세요!$/, 'Find the V chord of {1}, your target!'],
      [/^타겟인 (.+)의 2번째와 5번째 코드를 찾아보세요!$/, 'Find the ii and V chords of {1}, your target!'],
      [/^타겟인 (.+)의 반음 (높은|낮은) 음을 찾으세요!$/,
        m => 'Find the note a half step ' + (m[2] === '높은' ? 'above' : 'below') + ' ' + m[1] + ', your target!'],
      [/^표시된 부분을 순서대로 (.+)\(으\)로 바꿔보세요$/, 'Replace the marked chords, in order, with {1}'],
      [/^표시된 부분을 (.+)\(으\)로 바꿔보세요$/, 'Replace the marked chord with {1}'],
      [/^표시된 부분을 순서대로 (.*)$/, 'Replace the marked chords, in order, with {1}'],
      [/^표시된 부분을 (.*)$/, 'Replace the marked chord with {1}'],
      [/^(.*)\(으\)로 바꿔보세요$/, '{1}'],

      // 결산
      [/^(\d+)점$/, '{1} pts'],
      [/^가 (\d+)개 이상 맞췄어요!$/, ' of players got {1} or more right!'],
      [/^가 평균 ([\d.]+)초만에 맞췄어요!$/, ' of players answered in {1}s on average!'],
      [/^이번에 학습한 Key : (.+)$/, 'Key you practiced: {1}'],
      [/^피크상자 \+(\d+)$/, 'Pick Boxes +{1}'],
      [/^경험치 \+(\d+)XP · Pro 보상 2배 적용!$/, 'XP +{1} · Pro 2× reward applied!'],
      [/^경험치 \+(\d+)XP$/, 'XP +{1}'],

      // 승급 시험
      [/^(.+) 승급 시험$/, '{1} Level-Up Test'],
      [/^(.+)\(으\)로 승급하려면$/, 'To level up to {1}'],
      [/^(\d+)문제 중 (\d+)개 이상$/, '{2}+ of {1} correct'],
      [/^(.+) 시험 안내$/, '{1} test info'],
      [/^(\d+)문제$/, '{1} questions'],
      [/^(\d+)개 이상 정답$/, '{1}+ correct'],
      [/^(\d+)초$/, '{1} sec'],
      [/^이제부터 (.+)예요$/, "You're now: {1}"],
      [/^(\d+)\/(\d+) 통과$/, '{1}/{2} pass'],
      [/^(\d+)\/(\d+) 미달$/, '{1}/{2} short'],
      [/^오늘 (\d+)번 더 도전할 수 있어요$/, m => pl(m[1], 'more attempt') + ' today'],
      [/^재도전 ?(.*)$/, 'Retry {1}'],
    ],
  });

  // ── 결산 평가 문구 — mission-result-messages.js 의 CASE_TEXTS·POOLS와 같은 모양(키·순서) ──
  // {strong}·{weak}·{next}는 원문과 같이 그대로 둔다(치환은 mission-result-messages.js가 함).
  I18N.data.missionResult = {
    CASE_TEXTS: {
      high_high_high: [
        "Chord Quiz, Scale Blocks, Reharm Quiz: you got through all three without a wobble! Days where everything clicks at once don't come often, and it means what you've built up is really in your hands now.\n\nYou look ready to move up to {next}, so it might be a good time to try the Level-Up Test from your Profile.",
        "You nailed every single one. Chords, scales, combos, all solved without a hint of confusion. All that repetition has clearly turned into real skill.\n\nAt this level you can pass the {next} Level-Up Test, so give it a shot!",
        "No weak spots to point out today. Finishing all three this steadily means your hands now move naturally instead of second-guessing!\n\nIf days like this keep coming, it's time to move on to {next}. Try the Level-Up Test whenever you feel ready!",
      ],
      high_high_mid: [
        "Your chords are memorized well enough that your hand reacts before you think, and you're getting comfortable finding melody lines with scales!\n\nYour feel for connecting chords just needs a little more filling in, and you're fine to keep moving forward as you are.",
        "Chord memory and melody are firmly in place!\n\nYour sense for arranging chords harmonically is just a bit of practice away, so at this level you can keep moving ahead comfortably.",
        "Chords and scales both went smoothly. Placing chords in the Reharm Quiz is something you can fill in as you keep practicing, so overall this is a great result!\n\nJust keep that one area in mind as you move on.",
      ],
      high_high_low: [
        "You've got chords and scales down!\n\nThe next sense to pick up is weaving those chords into natural progressions. That's exactly what the Reharm Quiz builds, so it's a great one to try next.",
        "Chord Quiz and scales were rock solid!\n\nThe next step is making progressions with the chords you know. Building that sense through the Reharm Quiz will make everything you've learned feel much more complete.",
        "No worries about chords or scales anymore! To go one step further you need a feel for how chords flow into each other, and the Reharm Quiz is the training for exactly that.\n\nGive it a try next!",
      ],
      high_mid_high: [
        "You've got Chord Quiz and Reharm Quiz down! Recalling the chord you want and building a progression with it is the heart of enjoying guitar, and both are in place.\n\nScales (melody) are fine at your current pace, so you could try the {next} Level-Up Test!",
        "You understand the chord memory and chord placement you need for accompaniment. Scales are an area you can take slowly as your interest grows, so no need to stress about them.\n\nAt this level the {next} Level-Up Test should be no problem. Go test yourself!",
        "Chord Quiz and Reharm Quiz were both perfect! Those two are really the core of accompanying a song, so scales are fine just as they are.\n\nYou look ready to move up to {next}, so go take the Level-Up Test!",
      ],
      high_mid_mid: [
        "You can call up chords right away now! Scales and combos take a more complex kind of feel, so it's natural for them to take longer.\n\nA little more time on those two and your playing is about to step up a level!",
        "Chord memory is locked in! Scales and combos are much more complex than memorizing chords, so doing this well already means you're on the right track.\n\nFill in a little more here and the next level is right in front of you!",
        "Your instant recall of chord names and fingerings is firmly in place! Scales and combos grow slowly because they're hard, and you're clearly headed the right way.\n\nKeep this pace on those two and a real jump in your playing is coming soon!",
      ],
      high_mid_low: [
        "Your instant recall of chord names and fingerings is firmly in place! You're keeping up steadily with finding melody lines through scales, too.\n\nThe Reharm Quiz teaches you, naturally, that chord progressions follow rules. Once that sense sticks, you can accompany without a chart and understand songs much more deeply. Keep repeating it and one day you'll find those rules are in your hands.",
        "Your chords are solid enough that your hand reacts on sight, and scales are coming along fine! The Reharm Quiz trains you to feel the patterns in how chords connect. As that builds up, you'll be able to accompany songs without a chart and understand them at a whole new depth.\n\nThe more you see it, the more naturally that flow will stand out.",
        "Your chord memory is now a real strength, and it shows that you're keeping up with scales too! The Reharm Quiz gets you used to the rules behind chord progressions. As it grows, you'll be able to accompany without a chart and understand songs far more deeply.\n\nKeep coming back to it and that sense will stick on its own.",
      ],
      high_low_high: [
        "Chord memory and chord combos are both solid! With just these two you have everything you need to accompany the songs you love.\n\nAdd scales and you can express a song much more colorfully through melody, so take a look whenever you get curious.",
        "Chord Quiz and Reharm Quiz were both perfect! That's plenty for enjoying guitar as an accompanist.\n\nOnce scales are in your hands too, you'll be able to play the same song in a fresh way through melody, and a whole new kind of fun opens up.",
        "Recalling the chord you want and building progressions with it: you've got both! That's all you need to enjoy songs through accompaniment.\n\nScales aren't required so much as a way to widen your guitar world, so it's never too late to start when you're curious.",
      ],
      high_low_mid: [
        "Chords are completely in your hands, and your sense for building progressions is growing steadily! Even now, it's enough to accompany the songs you want.\n\nScales can wait until you're interested, so for now feel free to focus on enjoying accompaniment.",
        "Your Chord Quiz is spotless, and in the Reharm Quiz you're reading more than half of how a song flows. That's plenty to accompany a full song!\n\nLearning scales lets you play the same song differently through melody, but that's an add-on you can start whenever you feel like it.",
        "You've clearly mastered chords, and your feel for weaving them together keeps growing. You're already good enough to enjoy songs through accompaniment!\n\nYou can enjoy guitar perfectly well without scales (melody), but think of them as a fun extension that lets you express songs in many more ways later.",
      ],
      high_low_low: [
        "You see a chord name and the fingering comes right to mind. Getting through today's questions almost without hesitation shows chord shapes are firmly stamped into your hands and eyes. From here there are two paths forward: scales build your sense for expressing songs through melody, and the Reharm Quiz builds your sense for weaving chords into a natural flow.\n\nBoth are a different kind of fun from memorizing chords, so take a look whenever you want to enjoy guitar in more ways.",
        "Your ability to match chord names with real fingerings is firmly in place. You pick out any chord right away without mixing them up, so this is no longer something you need to think about.\n\nGuitar has two more senses beyond that: scales let you express a song through melody, like singing, and the Reharm Quiz is about making your own progressions with the chords you know. If you've been building on chords so far, these two will give your playing much more dimension.",
        "Both your speed and accuracy at matching chord names to fingerings are at a solid level. There are two areas worth expanding into next: scales build your sense for playing melody, and the Reharm Quiz builds your feel for the flow and rules between chords.\n\nYou're doing well with chords alone, but adding these two will widen the ways you can enjoy guitar.",
      ],
      mid_high_high: [
        "Scales and combos: you've got both down! Scales mean memorizing the whole fretboard, and combos only work once you understand how chords relate, so scoring high on both is a huge asset for your playing going forward.\n\nThe Chord Quiz just needs memorization to fill in, so there's little to worry about. At this level the {next} Level-Up Test is well worth a try!",
        "Scales and combos were both perfect! Each demands repetition and understanding at the same time, so scoring high here means your fundamentals are already strong.\n\nThe Chord Quiz follows naturally as you spend time memorizing, so don't worry. Now's a good time to try the {next} Level-Up Test!",
        "Scoring high on scales and combos is really impressive! Scales mean memorizing whole positions on the fretboard, and combos mean understanding how chords relate, so neither score comes easily.\n\nThe Chord Quiz is pure memorization and just needs a bit more. With this foundation you're ready for {next}, so go take the Level-Up Test!",
      ],
      mid_high_mid: [
        "Your eye for scale blocks really stands out! Reading melody lines on the fretboard quickly is a great base for moving into solos and improvising later.\n\nChord Quiz and Reharm Quiz are also at a level where the next step is worth trying. And as your understanding of harmony grows, you'll handle melody with much more freedom and skill. Try the {next} Level-Up Test!",
        "Telling scales apart and reading them is clearly your strength! That sense becomes the groundwork for combining different scales and building solo lines on the fly.\n\nChord Quiz and Reharm Quiz are solid enough for a level-up attempt too, and deepening your harmony from here will layer chord understanding on top of your melody sense for much richer playing. Go for the {next} Level-Up Test!",
        "Your understanding of scales is clearly a strength! Reading melody lines well means it can lead into improvising, where you use them freely.\n\nThat kind of free playing gets much deeper once it's paired with an understanding of chords and harmony. Chord Quiz and Reharm Quiz are good enough to move on as well, so take the {next} Level-Up Test and grow that understanding along the way!",
      ],
      mid_high_low: [
        "Your eye for scale blocks is really good! You already have a strength in picking out melody lines.\n\nThe Chord Quiz is filling in bit by bit, too. Right now you may be finding melodies by feel, but once the Reharm Quiz introduces you to harmony, that feel turns into clear intent, where you can explain why you chose a note. Your melodies gain confidence.",
        "Melody is clearly your strength! The Chord Quiz is keeping up at a decent pace, too.\n\nHarmony is the tool that gives you a clear reason why a note fits over the chord that's playing, instead of leaving melody to feel alone. The Reharm Quiz builds that sense, and combined with your scale skills it leads to playing with much clearer intent.",
        "You showed real skill in scales! The Chord Quiz is growing smoothly, too.\n\nThe Reharm Quiz (harmony) is the tool that lets you choose melody notes with reasons rather than by feel. Add that understanding to the melody sense you already have and each thing you play will start to carry clear intent.",
      ],
      mid_mid_high: [
        "Your high score in the Reharm Quiz stands out! This area only works once you understand how chords relate, so doing well here means your harmony is quite solid.\n\nChord Quiz and scales are at a decent level, so nothing to worry about. Just know that the fun of understanding can pull time away from rote practice, so it helps to give Chord Quiz and scale repetition a balanced share now and then.",
        "You showed a real strength in the Reharm Quiz. Already having a feel for how progressions work is not common! Chord Quiz and scales are keeping up at a good level, too.\n\nIt's fine to keep focusing on the fun of digging into theory, and if you also look after hands-on repetition from time to time, your skills will grow more evenly.",
        "You showed a real strength in the Reharm Quiz! It means your ability to understand chords harmonically is already well formed.\n\nChord Quiz and scales are keeping up nicely, so there's no problem, but since you've caught the theory bug, giving rote practice some attention now and then will make your skills more balanced overall.",
      ],
      mid_mid_mid: [
        "Chord Quiz, scales, and harmony (Reharm Quiz) are all rising evenly at a similar level! Keeping harmony right alongside the others means your balance is quite good.\n\nKeep repeating with this balance and all three will grow together naturally.",
        "All three are keeping pace at a similar level, with nothing falling behind! It's impressive that you're keeping harmony at the same pace as chords and scales.\n\nCarry on like this and it's a good flow for all three to get solid together.",
        "Your scores in chords, scales, and harmony (Reharm Quiz) are nicely even! Looking after all three side by side is a real strength.\n\nJust keep repeating what you're doing and your skills will follow naturally!",
      ],
      mid_mid_low: [
        "The Chord Quiz trains you to match chord names and fingerings instantly, and scales train your body to know where melody lines sit on the fretboard. The Reharm Quiz is a different kind of thing: it builds the understanding to place the chords you know naturally inside a real progression.\n\nThe more you repeat it, the more the rules for how chords connect will come into view.",
        "Chord Quiz and scales are repetition-based training for quick recall and fretboard sense, so they grow naturally if you keep at them.\n\nThe Reharm Quiz opens a new door of understanding called harmony, and it comes much more easily if you try to feel how chords relate rather than memorize.",
        "Chord Quiz and scales build chord recognition speed and melody sense on the fretboard, so they grow as your repetitions add up. The Reharm Quiz is where you meet harmony, making progressions out of those chords.\n\nIt's a good one to work on bit by bit, building that sense alongside the others.",
      ],
      mid_low_high: [
        "Your high score in the Reharm Quiz is impressive. You've clearly picked up the sense for understanding and applying how progressions work! The Chord Quiz is keeping up nicely, too.\n\nScales and harmony actually work hand in hand. You need harmony to see which scale fits which chord, and practicing scales until you feel each note's degree makes your harmony stronger in turn. With your understanding, scales will start paying off quickly.",
        "Your sense for weaving chords together harmonically is firmly in place! The Chord Quiz is at a decent pace, too.\n\nScales and harmony lift each other up when you work on them together rather than digging into just one. Knowing harmony shows you which scale fits a chord, and learning note degrees through scales feeds right back into your harmony.",
        "You showed a real strength in the Reharm Quiz, which means you understand why chords connect the way they do! The Chord Quiz is going smoothly, too.\n\nIt's easy to think of scale practice as separate from harmony, but they feed each other. Harmony gives you reasons for choosing a scale, and the feel for note degrees you get from scale practice helps you understand harmony more deeply.",
      ],
      mid_low_mid: [
        "Chord Quiz and Reharm Quiz are keeping up at a similar pace. Scales train your body to know where melody lines sit on the fretboard, so repetition is everything, and right now those repetitions have added up a little less than the other two.\n\nKeep your pace on Chord Quiz and combos, fill in scales here and there, and things will balance out.",
        "Chord Quiz and Reharm Quiz are both growing nicely. Unlike those two, scales are repetition-based training where your hands and eyes have to learn fretboard positions, so they improve reliably the more you see them.\n\nKeep looking after chords as you are, share a little time with scales, and all three will come along evenly.",
        "Chord Quiz and Reharm Quiz are steady at a similar level. Only your scale score came out relatively low, and that's because scales need a lot of repetition to get into your hands.\n\nKeep your current pace on the chord side, bring scales along steadily, and you'll definitely catch up.",
      ],
      mid_low_low: {
        common: [
          "The Chord Quiz is keeping up at a good pace. Scales and combos both need repetition and understanding together, so right now they're less in your hands than chords are.\n\nKeep your Chord Quiz sense and share a little more time with these two, and things will balance out.",
          "The Chord Quiz is growing nicely. Scales are repetition training for learning fretboard positions, and the Reharm Quiz is about understanding how chords relate, so each calls for a different approach.\n\nFor both, time spent matters more than today's score, so seeing them a little and often will bring them along naturally.",
          "The Chord Quiz is settling in steadily. Your scale and combo scores came out relatively low, which is natural because both take more time than memorizing chords.\n\nKeep your pace on chords, spend a little more time on these two, and you'll definitely catch up.",
        ],
        unboxing: [
          "It's natural for scale and combo scores to come out low, so no pressure. Both simply take time.\n\nKeep your Chord Quiz sense, repeat the other two a little at a time, and they'll come along naturally.",
          "Of course scales and combos feel unfamiliar right now.\n\nYou're already keeping up well with the Chord Quiz, so see the other two a little every day and they'll be in your hands before long.",
        ],
      },
      low_high_high: [
        "Scoring high on scales and combos is really impressive. Being good at both means you have harmonic understanding and melody sense together, which is a rare combination!\n\nOnly the Chord Quiz came out low. Check whether you rushed your answers, and next time it might help to take it a little slower.",
        "Scales and combos are both clear strengths! At this level it looks less like you didn't know the chords and more like similar-looking choices threw you for a moment.\n\nTake the Chord Quiz slowly again and it'll catch up quickly.",
        "High scores on both scales and combos. Your skills are clearly solid!\n\nIt's a little surprising that only the Chord Quiz came out low. Next time, work through the questions a bit more slowly and this area will catch up fast.",
      ],
      low_high_mid: [
        "Your eye for scale blocks is really good! The Reharm Quiz is keeping up at a good pace, too.\n\nThe Chord Quiz came out low this time, and melody-focused players actually have more reason to know lots of chord shapes. Knowing chord forms lets you land naturally on a chord's notes (chord tones) as you build melodies. Fill in the Chord Quiz and your scale sense will feel much freer.",
        "Picking out melody lines is clearly your strength! The Reharm Quiz is keeping up nicely, too.\n\nIt's worth looking after the Chord Quiz as well: knowing several forms of the same chord lets you build melodies around its chord tones. As the Chord Quiz fills in, you'll have far more material to make melodies with.",
        "Your understanding of scales is really good! The Reharm Quiz is coming along smoothly, too.\n\nThe Chord Quiz came out low this time. Knowing several forms of the same chord lets you build melodies around the chord tones inside them, so chord form knowledge matters a lot even for melody-focused players. Add the Chord Quiz to your scale sense and you'll be able to express much more.",
      ],
      low_high_low: [
        "Your scale sense is a real strength, and your ability to pick out melody lines is solid! At this level you can already enjoy soloing over songs you love.\n\nIf you want to improvise or improve more systematically, though, Chord Quiz and Reharm Quiz help a lot. Knowing chords and how to arrange them makes it clear why you're playing each note, and you'll learn songs noticeably faster.",
        "Your sense for picking out melodies is already good! That's enough to enjoy the solos of songs you love.\n\nChord Quiz and Reharm Quiz came out low this time, but once they fill in, the melodies you used to find by feel will have reasons behind them, and improvising will follow naturally. Above all, knowing chords makes learning new songs much faster.",
        "Your scale sense is excellent! At this level you can enjoy soloing over any song you want.\n\nFill in Chord Quiz and Reharm Quiz, though, and the melodies you've been finding by feel will have a foundation, and improvising gets much freer. Knowing chords also cuts down the time it takes to learn a song.",
      ],
      low_mid_high: [
        "Your high score in the Reharm Quiz is impressive. It means you have a real feel for how chord progressions move! Scales are keeping up nicely, too.\n\nOnly the Chord Quiz came out low. It may be that you understand what the chords do and just need to match them to exact names and fingerings. Fill that in and you'll be able to actually play what you understand.",
        "Your Reharm Quiz skills really stand out! Scales are keeping up nicely, too.\n\nThe Chord Quiz came out low, but knowing how chords connect harmonically and instantly recalling specific chord names and fingerings are two different senses. With the understanding you showed in combos, the Chord Quiz will catch up quickly.",
        "You showed a real strength in the Reharm Quiz! Scales are good, too.\n\nOnly the Chord Quiz is notably low. You already seem to understand how progressions flow, so it looks like you just need a little more practice matching names to fingerings. Fill that in and understanding and execution will lock together into much steadier skill.",
      ],
      low_mid_mid: [
        "Scales and combos are keeping up at a similar pace. The Chord Quiz trains instant matching of chord names and fingerings, so it jumps as repetitions add up, and right now it has a little less behind it than the other two.\n\nKeep your pace on scales and combos, fill in the Chord Quiz here and there, and things will balance out.",
        "Scales and combos are both growing nicely. More than the other two, the Chord Quiz is purely about how many times you repeat it, so it rises reliably the more you see it.\n\nKeep looking after scales and combos as you are, share a little time with the Chord Quiz, and all three will come along evenly.",
        "Scales and combos are steady at a similar level. Only your Chord Quiz score came out relatively low, and it's an area that catches up fast once your eyes get used to it.\n\nKeep your current pace on scales and combos, bring the Chord Quiz along steadily, and it'll definitely balance out.",
      ],
      low_mid_low: {
        common: [
          "Scales are keeping up at a good pace.\n\nChord Quiz and Reharm Quiz may be a bit much right now, but they grow naturally with steady repetition, so it's fine to keep going just as you are.",
          "Your scale sense is settling in nicely.\n\nChord Quiz and Reharm Quiz both came out low, and for these two steady repetition is what matters, so just fill them in one at a time without rushing.",
          "Scales are coming along steadily.\n\nChord Quiz and Reharm Quiz may feel hard right now. If so, you can keep practicing at this pace, or if it feels like too much, stepping down a level and rebuilding with some breathing room is a good option too.",
        ],
        unboxing: [
          "Scales train your body to know where melody lines sit on the fretboard, and that sense is growing well! The Chord Quiz trains instant matching of chord names and fingerings, and the Reharm Quiz trains you to weave those chords into natural progressions.\n\nAll three improve for sure with a little repetition every day, so keep going just like this!",
          "Your scale sense is settling in nicely, and this pace is just right! The Chord Quiz builds your ability to recall a chord on sight, and the Reharm Quiz builds your sense for making progressions with those chords.\n\nThese areas improve for sure even if you fill them in just a little each day, so keep it up!",
        ],
      },
      low_low_high: [
        "A high score in the Reharm Quiz! Your sense of harmony is clearly good. You actually know this stuff and just breezed through the first parts, right? If not, you'll want to focus more on Chord Quiz and Scale Blocks!\n\nOnce harmony starts to make sense, it's easy to get hooked on it and neglect repetition. Being able to actually play is what makes a truly good player!",
        "Your Reharm Quiz score shows you've really got harmony! You didn't just tap through the first two, did you? If not, you'll want to put more time into Chord Quiz and scale repetition!\n\nWhen theory is clicking, it's easy to get absorbed in it and put off hands-on practice, but in the end real skill comes from being able to play it yourself!",
        "The understanding you showed in the Reharm Quiz is the real thing, and it means you have a great sense of harmony! Maybe you just flew through the other two for fun.\n\nIf those scores do reflect your real level, you'll want to focus more on Chord Quiz and scales! When harmony gets fun, it's easy to sink into theory and neglect hands-on practice, but that practice is what makes a good player in the end!",
      ],
      low_low_mid: {
        common: [
          "The Reharm Quiz is keeping up at a good pace.\n\nThe Chord Quiz lets you call up chords instantly so your accompaniment never stalls, and scales teach your body the fretboard so you can handle melody too. Both may be a bit much right now, but they grow naturally with steady repetition, so it's fine to keep going just as you are.",
          "Your Reharm Quiz sense is settling in nicely. The Chord Quiz builds the quick recall you need to actually play through progressions, and scales build the foundation for expressing melody.\n\nFor both, repetition is what matters, so just fill them in one at a time without rushing.",
          "The Reharm Quiz is coming along steadily. The Chord Quiz makes your chord changes smooth when you accompany a song, and scales are the springboard for playing melodies and solos later.\n\nIf it feels hard right now, you can keep going at this pace, or if it feels like too much, stepping down a level and rebuilding with some breathing room is a good option too.",
        ],
        unboxing: [
          "The Reharm Quiz trains you to weave chords into natural progressions, and that sense is growing well! The Chord Quiz trains instant matching of chord names and fingerings, and scales train your body to know where melody lines sit on the fretboard.\n\nAll three improve for sure with a little repetition every day, so keep going just like this!",
          "Your Reharm Quiz sense is settling in nicely, and this pace is just right! The Chord Quiz builds your ability to recall a chord on sight, and scales train your body to know where melodies sit on the fretboard.\n\nThese areas improve for sure even if you fill them in just a little each day, so keep it up!",
        ],
      },
      low_low_low: {
        common: [
          "All three were tough today, weren't they? The Chord Quiz builds instant chord recall, scales teach where melody lines sit on the fretboard, and the Reharm Quiz builds your sense for weaving chords into natural progressions. If you've only just moved up a level, it's natural for things to feel unfamiliar, and if it keeps feeling this heavy, this level may not be the right fit yet.\n\nNeither is a bad thing. It's just a sign that a little more practice is needed.",
          "All three seem to have been especially hard today. The Chord Quiz builds the quick recall to actually play through progressions, scales build your sense for picking out melody, and the Reharm Quiz builds your understanding of how chords relate.\n\nIf you've just reached this level, you may still be adjusting, and if it keeps going like this, the difficulty may be a bit much for now. Either way, it doesn't mean you're lacking. It just means this is a time for more repetition.",
          "Today seems to have been hard across the board. The Chord Quiz builds the quick recall that keeps accompaniment smooth, scales are the springboard for melodies and solos later, and the Reharm Quiz builds your sense for reading how a song flows.\n\nIf you've only just moved up, this is a natural part of the process, and if it's heavy every time, this level may be a little early. Either way, right now is simply a time to let more practice add up.",
        ],
        unboxing: [
          "All three seem to have been tough today. The Chord Quiz builds instant chord recall, scales teach where melody lines sit on the fretboard, and the Reharm Quiz builds your sense for weaving chords into natural progressions.\n\nEverything feels unfamiliar at first, so just a little repetition every day will make a real difference!",
          "Today seems to have been especially hard across the board. Chord Quiz, scales, and Reharm Quiz are all unfamiliar at first, but with a little repetition every day they settle naturally into your hands.\n\nNo pressure. Just keep trying them one at a time, like you are now!",
        ],
      },
    },
    POOLS: {
      ALL_HIGH: [
        "All three are close to perfect. You're ready to move up to the next level!",
        "Chords, scales, combos: you got them all. Your playing clearly went up a notch today.",
        "No gaps at all. Ready to push yourself with something a little harder?",
        "High scores across the board! Your hands remember. See you at the next level.",
        "Today's practice was simply excellent. You'd keep up just fine at a higher difficulty.",
      ],
      ALL_MID: [
        "Steady overall. A little more repetition and it'll really stick.",
        "Your basics are evenly in place. Keep this pace and you'll improve fast.",
        "You did well across the board, with nothing falling apart. Same rhythm tomorrow?",
        "Not perfect yet, but you're headed exactly the right way. Repetition is the answer.",
        "You got more than half right, evenly. Just go over the parts that tripped you up.",
      ],
      ALL_LOW: [
        "Today was tough, wasn't it? Everyone starts there. Try once more and it'll feel much more familiar.",
        "Guitar takes time until your hands remember. Go back over what you missed today, slowly.",
        "That's okay, starting is always the hardest part. Just retrying what you missed makes a big difference.",
        "What matters more than the score is that you sat down and did it today. See you tomorrow!",
        "Of course it still feels unfamiliar. Don't rush ahead. Start by going over what you missed.",
      ],
      TWO_HIGH: [
        "You've got two of them down! Fill in a little more of {weak} and you're complete.",
        "Almost there. Just revisit what tripped you up in {weak}.",
        "Mostly excellent. {weak} is the only soft spot, so focus there.",
        "Your skills have clearly grown. Shore up {weak} and you've covered everything.",
        "{weak} held you back a little, but the rest was perfect!",
      ],
      ONE_HIGH: [
        "You're clearly good at {strong}! Try bringing that feel to the others.",
        "{strong} is a clear strength. Repeat {weak} the same way and it'll come up fast.",
        "You've truly made {strong} your own. Next up: {weak}.",
        "You're clearly good at {strong}. {weak} looks like it needs a little more time.",
        "Your {strong} score stands out! Once {weak} catches up, you'll be balanced.",
      ],
      ONE_LOW: [
        "Not bad overall. {weak} just seems to have been especially hard.",
        "{weak} tripped you up a lot. Use Retry missed to go over just that part.",
        "The rest was fine. {weak} isn't in your hands yet, so it needs repetition.",
        "{weak} is today's weak spot. Get that down and you'll shoot up.",
        "You kept up with almost everything, but {weak} fell short. No rush, just try again.",
      ],
      MIXED: [
        "A mix of strong spots and soft spots. Start with {weak} and work through it step by step.",
        "Still a bit uneven. Hold on to {strong} and spend more time on {weak}.",
        "Bringing everything up evenly is the next goal. Today, just revisiting {weak} is plenty.",
        "There's a gap between areas. Fill in {weak} and everything rises together.",
        "{strong} is steady. {weak} needs a little more time to feel familiar.",
      ],
    },
    DOWNGRADE_SUFFIX: " If it feels too hard, it's fine to step down a level and start again.",
  };
})();
