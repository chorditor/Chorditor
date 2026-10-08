// 영어 사전 — 스케일 훈련(scale-training / scale-level / scale-data): 레벨 화면, 암기 테스트, "?" 미니 강의
(() => {
  // 스케일·폼 이름은 낱말 단위로 옮긴다("메이저 펜타토닉 스케일 A폼" → "Major Pentatonic Scale A form")
  const WORD = {
    '메이저': 'Major', '마이너': 'Minor', '펜타토닉': 'Pentatonic', '블루스': 'Blues',
    '내추럴': 'Natural', '하모닉': 'Harmonic', '멜로딕': 'Melodic', '도미넌트': 'Dominant',
    '아이오니안': 'Ionian', '도리안': 'Dorian', '프리지안': 'Phrygian', '리디안': 'Lydian',
    '믹솔리디안': 'Mixolydian', '에올리안': 'Aeolian', '로크리안': 'Locrian', '얼터드': 'Altered',
    '내추럴2': 'Natural 2', '내추럴6': 'Natural 6', '스케일': 'Scale',
  };
  function word(tok) {
    if (WORD[tok]) return WORD[tok];
    let m;
    if ((m = /^([A-G][#b]?m?)폼$/.exec(tok))) return m[1] + ' form';
    if ((m = /^(\d+)번폼$/.exec(tok))) return 'Form ' + m[1];
    if ((m = /^([A-G][#b]?)(.+)$/.exec(tok)) && WORD[m[2]]) return m[1] + ' ' + WORD[m[2]]; // "C메이저"
    if (/^[\x21-\x7E]+$/.test(tok)) return tok; // b9, b13, 9 등
    return null;
  }
  function scaleName(m) {
    const out = m[0].split(' ').map(word);
    return out.join(' ');
  }
  // 낱말이 전부 위 표로 옮겨질 때만 일치
  const SCALE_RE = { exec(s) { return s.split(' ').every(tok => word(tok) != null) ? [s] : null; } };

  const KEYQ = { '메이저': 'major', '하모닉 마이너': 'harmonic minor', '내추럴 마이너': 'natural minor' };

  I18N.add('en', {
    exact: {
      'Chorditor - 스케일 훈련': 'Chorditor - Scale Blocks',

      // ── 스케일 훈련 목록 ──
      '기초 스케일 연습': 'Basic scale practice',
      '세컨더리 도미넌트 활용': 'Using secondary dominants',
      '모드 스케일': 'Modes',
      '고급 스케일': 'Advanced scales',
      '스케일 훈련이 처음이시네요!': 'First time in Scale Blocks?',
      '연습을 시작할까요?': 'Start practicing?',
      '피크': 'Picks',

      // ── 레벨 화면 ──
      '음이름 표시 (누르면 도수)': 'Showing note names (tap for degrees)',
      '도수 표시 (누르면 미표시)': 'Showing degrees (tap to hide)',
      '라벨 미표시 (누르면 음이름)': 'Labels hidden (tap for note names)',
      '렛링(울림 유지)': 'Let ring (sustain)',
      '기타 버튼': 'Guitar button',
      '직접 연주해보기': 'Play it yourself',
      '음표 버튼': 'Note button',
      '스케일 들어보기': 'Hear the scale',
      '스타일': 'Style',
      '팝': 'Pop',
      '기본': 'Basic',
      '선택한 블럭 암기하기': 'Memorize selected block',

      // ── 암기 테스트 ──
      '완벽해요!': 'Perfect!',
      '정확해요!': 'Spot on!',
      '맞았어요! 잘하고 있어요.': "Correct! You're doing great.",
      '거의 다 왔어요!': 'Almost there!',
      '아쉬워요...! 다시 도전해보세요!': 'So close...! Try again!',
      '조금 더 연습해보아요!': "Let's practice a bit more!",
      '다시 풀기': 'Try again',
      '전환해보세요!': '',
      '암기 테스트를 그만두시겠어요?': 'Quit the memory test?',
      '지금 나가면 푸는 중이던 테스트는 사라져요.': 'If you leave now, your current test will be lost.',
      '언제든지 다시 도전할 수 있어요!': 'You can try again anytime!',
      '지금 나가면 푸는 중이던 테스트는 사라져요. 언제든지 다시 도전할 수 있어요!':
        'If you leave now, your current test will be lost.\nYou can try again anytime!',
      '지금 나가면 튜토리얼을': "If you leave now, you'll have to",
      '처음부터 다시 봐야 해요.': 'watch the tutorial from the start.',
      '지금 나가면 튜토리얼을 처음부터 다시 봐야 해요.': "If you leave now, you'll have to watch the tutorial from the start.",

      // ── 챕터 2 레벨 이름 ──
      '4도 메이저 전환': 'Switching to IV (major)',
      '5도 메이저 전환': 'Switching to V (major)',
      '6도 마이너 전환': 'Switching to vi (minor)',
      '2도 마이너 전환': 'Switching to ii (minor)',
      '3도 마이너 전환': 'Switching to iii (minor)',
      '도레미파솔라시': 'Do Re Mi Fa So La Ti',

      // ── "?" 미니 강의: 도입 ──
      '거의 모든 멜로디의 뼈대가 되는 중요한 스케일이에요.': "It's an important scale,\nthe backbone of almost every melody.",
      '가요, 팝, 록, J-pop 같은 대중음악 멜로디의 뼈대가 되는 스케일이에요.':
        "It's the backbone of melodies\nin pop, rock, and most popular music.",
      '구성음은 다음과 같아요!': 'Here are its notes!',
      '직접 들어볼까요?': "Let's have a listen!",

      // 챕터 3 도입
      '챕터3에서는 모드 스케일에 대한 개념을 배울거예요.': "In Chapter 3 you'll learn\nwhat modes are.",
      "모드란, 쉽게 말하자면 '특색 있는 분위기'를 표현해주는 도구라고 생각하면 돼요.":
        "Put simply, a mode is a tool\nfor creating a distinctive mood.",
      '이번 챕터에서 여러가지 모드들을 배워보도록 할게요!': "In this chapter we'll go through\nseveral different modes!",
      "그 첫번째는 '아이오니안 스케일'이에요.": "The first one is\nthe Ionian scale.",

      // 모드별 감상
      '도리안의 색채는 어떻게 느껴졌나요?': 'How did the Dorian color\nfeel to you?',
      '일반적으로는 신비로움 또는 웅장하고 영웅적인 분위기, 중세 유럽같은 느낌을 낸다고 평가를 많이 해요.':
        'People often describe it as mysterious,\nor grand and heroic,\nwith a medieval Europe feel.',
      '프리지안의 색채는 어떻게 느껴졌나요?': 'How did the Phrygian color\nfeel to you?',
      '일반적으로는 어둡고 강렬한 긴장감 있는 분위기, 스페인 플라멩고 같은 느낌을 낸다고 평가를 많이 해요.':
        'People often describe it as dark, intense, and tense,\nwith a Spanish flamenco feel.',
      '리디안의 색채는 어떻게 느껴졌나요?': 'How did the Lydian color\nfeel to you?',
      '신비로운 미지의 세계, 초현실적인 경험에 대한 설렘을 느끼게 해요.':
        'It feels like a mysterious unknown world,\nthe thrill of something surreal.',
      '디즈니, SF영화, 어드벤처 장르의 배경음악으로 많이 들을 수 있어요.':
        'You hear it a lot in Disney, sci-fi,\nand adventure soundtracks.',
      '믹솔리디안의 색채는 어떻게 느껴졌나요?': 'How did the Mixolydian color\nfeel to you?',
      '호쾌하고 털털한 분위기를 느끼게 해요.': 'It has a bold,\neasygoing feel.',
      '영미권의 락 음악에서 많이 들을 수 있어요.': 'You hear it a lot\nin classic rock.',
      '에올리안의 색채는 어떻게 느껴졌나요?': 'How did the Aeolian color\nfeel to you?',
      "사실 에올리안은 '내추럴 마이너'의 다른 이름이에요.": "Aeolian is actually\nanother name for natural minor.",
      '슬프고 서정적인 음악을 할 때 제일 많이 쓰이는 무난한 음계예요.':
        "It's the go-to scale\nfor sad, lyrical music.",
      '로크리안의 색채는 어떻게 느껴졌나요?': 'How did the Locrian color\nfeel to you?',
      '기괴함과 공포, 극도의 불안감을 자아내는 분위기예요.': 'It sounds eerie and frightening,\nfull of unease.',
      '대중음악보다는 영화음악처럼 목적이 있는 곳에 많이 쓰여요.':
        "It's used less in pop\nand more in film scores, where there's a specific purpose.",

      // 기초 스케일 설명
      '기타에서는 음이름을 알파벳으로 많이 표기해요. 그 음의 순서를 숫자로도 나타낼 수 있어요.':
        'On guitar, notes are usually written as letters.\nYou can also show their order with numbers.',
      '앞으로는 음이름과 숫자(도수)를 사용할게요. 기타에서는 두 방식이 주로 쓰여요.':
        "From here on we'll use note names and numbers (degrees).\nThese are the two main systems on guitar.",
      '메이저 스케일에서 4도와 7도를 빼면 메이저 펜타토닉이 돼요.':
        'Take the 4th and 7th out of the major scale\nand you get the major pentatonic.',
      '음이 5개뿐이라 어느 음을 눌러도 어색하지 않아서 연습하기 좋아요.':
        'With only 5 notes, nothing sounds wrong,\nso it\'s great for practice.',
      "메이저 펜타토닉에 한 음을 더하면 '메이저 블루스 스케일'이 돼요.":
        'Add one note to the major pentatonic\nand you get the major blues scale.',
      "이렇게 추가된 음(b3)을 '블루스 노트'라고 불러요.": "This added note (b3)\nis called the 'blue note.'",
      '블루스 노트의 엇나간 멜로디가 느낌있는 멜로디 진행을 만들어요!':
        'The slightly off sound of the blue note\ngives melodies their soulful feel!',
      '5가지 블럭에서 블루스 노트는 색깔로 표시했어요!': 'In the 5 blocks, the blue notes\nare marked in color!',
      '그런데, 왜 C로 시작하지 않은 걸까요?': "But why doesn't it start on C?",
      '그건 단순히 A로 시작하는게 더 쉽기 때문이에요!': "Simply because starting on A is easier!",
      "나중에 '마이너 스케일'을 배울 때 자세히 알려드릴게요!": "We'll explain more\nwhen you get to the minor scale!",
      "마이너 펜타토닉에 한 음을 더하면 '블루스 스케일'이 돼요.":
        'Add one note to the minor pentatonic\nand you get the blues scale.',
      "이렇게 추가된 음을 '블루스 노트'라고 불러요.": "This added note\nis called the 'blue note.'",
      'Am 마이너 스케일은 사실 C메이저 스케일과 구성음이 같아요!':
        'The A minor scale actually has\nthe same notes as the C major scale!',
      "이렇게 구성음이 같은 관계를 '나란한조'라고 불러요.": "Keys that share the same notes like this\nare called 'relative keys.'",
      'C를 근음으로 마이너 스케일을 만들면 3도·6도·7도가 반음씩 내려가요.':
        'Build a minor scale on C\nand the 3rd, 6th, and 7th each drop a half step.',
      '대부분의 노래는 메이저 곡과 마이너 곡으로 나뉘어요.': 'Most songs are either\nin a major key or a minor key.',
      '발라드, 트로트, 슬로우 락 같은 장르에서 많이 쓰인답니다!': "You'll hear it a lot\nin ballads and slow rock!",
      '내추럴 마이너의 b7음을 7로 올리면 하모닉 마이너가 돼요!':
        'Raise the b7 of the natural minor to 7\nand you get the harmonic minor!',
      '이 반음 하나 때문에 아랍이나 인도 느낌의 신비로운 소리가 나요.':
        'That one half step gives it\na mysterious, Middle Eastern or Indian sound.',
      "나중에 배울 '세컨더리 도미넌트'라는 테크닉에서 꼭 필요한 스케일이에요!":
        "It's essential for a technique you'll learn later,\ncalled secondary dominants!",
      '사실 우리가 아는 메이저 스케일이랑 똑같아요!': "It's actually the same as\nthe major scale you already know!",
      "앞으로 다른 모드스케일의 느낌을 '미뉴엣'으로 비교해볼거예요. 아이오니안 스케일은 우리가 잘 아는 멜로디예요.":
        "From here on we'll compare how each mode feels\nusing the Minuet.\nThe Ionian scale is the melody you already know.",

      // 챕터 4 파생 설명
      "이 스케일은 사실 '하모닉 마이너 스케일'에서 나왔어요.": 'This scale actually comes from\nthe harmonic minor scale.',
      "이 스케일은 사실 '멜로딕 마이너 스케일'에서 나왔어요.": 'This scale actually comes from\nthe melodic minor scale.',
      '정확히는 하모닉 마이너의 5번째 모드예요.': "To be exact, it's the 5th mode\nof the harmonic minor.",
      '정확히는 하모닉 마이너의 2번째 모드예요.': "To be exact, it's the 2nd mode\nof the harmonic minor.",
      '정확히는 멜로딕 마이너의 7번째 모드예요.': "To be exact, it's the 7th mode\nof the melodic minor.",
      '정확히는 멜로딕 마이너의 4번째 모드예요.': "To be exact, it's the 4th mode\nof the melodic minor.",
      '정확히는 멜로딕 마이너의 5번째 모드예요.': "To be exact, it's the 5th mode\nof the melodic minor.",
      '정확히는 멜로딕 마이너의 6번째 모드예요.': "To be exact, it's the 6th mode\nof the melodic minor.",
      '멜로딕 마이너는 재즈에서 아주 중요한 스케일이에요.': 'The melodic minor is\na very important scale in jazz.',
      '이후 배울 여러 스케일들이 사실 이 스케일에서 파생돼요.': "Many of the scales coming up\nare actually derived from it.",

      // 스케일 블럭 개념
      '기타는 피아노와 달리 음이 잘 보이지 않죠?': "Unlike on a piano, notes are hard to see on a guitar, right?",
      "그래서 기타에는 '스케일 블럭'이라는 개념이 존재해요!": "That's why guitar has\nthe idea of 'scale blocks'!",
      '대표적으로 5개의 스케일 블럭을 알고 있어야, 원하는 연주를 할 수 있을 거예요!':
        "You'll want to know the 5 main scale blocks\nto play what you have in mind!",
      '좌우로 넘겨서 5가지 폼을 확인해보세요! 점들을 클릭해서 소리도 들어보세요!':
        'Swipe left and right to see all 5 forms!\nTap the dots to hear them, too!',
      "각 모드는 그 모드만의 '특징음'을 가지고 있어요.": "Each mode has its own\n'characteristic note.'",
      '특징음은 그 모드의 분위기를 가장 잘 보여주는 음이에요.': "It's the note that best shows\nthe mood of that mode.",
      '아이오니안의 특징음은 4번째 음(4도)이에요.': "Ionian's characteristic note\nis the 4th.",
      '노래를 틀어놓고, 이 스케일을 아무렇게 연주해보면서 감을 키워보는 연습을 해보세요!':
        'Put on a song and noodle around with this scale\nto build your feel for it!',

      // 챕터 4 용도 설명
      '마이너 코드로 해결되는 세컨더리 도미넌트에서 정석적으로 활용되는 스케일이에요.':
        "It's the standard scale over secondary dominants\nthat resolve to a minor chord.",
      '대중음악에서도 아주 널리 쓰여서 익혀두면 정말 유용한 스케일이에요.':
        "It's used all over popular music too,\nso it's really worth learning.",
      '마이너 코드에서, 특히 재즈적인 색채를 낼 때 많이 사용돼요.':
        "It's used over minor chords,\nespecially for a jazzy color.",
      '이후 나올 파생 스케일들의 기초가 되니 잘 익혀두세요!':
        "It's the basis for the derived scales coming up,\nso learn it well!",
      '얼터드 도미넌트(7alt) 코드 위에서 주로 쓰이는 대표적인 재즈 스케일이에요.':
        "It's a classic jazz scale,\nused mostly over altered dominant (7alt) chords.",
      '모든 텐션(b9,#9,#11,b13)이 들어있어서 다음 마이너 코드로 강하게 해결돼요.':
        'It contains every altered extension (b9, #9, #11, b13),\nso it resolves strongly to the next minor chord.',
      '마이너 키의 ii-V-i에서 m7(b5) 코드 위에 쓰여요.': "It's used over the m7(b5) chord\nin a minor-key ii-V-i.",
      '일반 로크리안보다 조금 더 부드러운 느낌을 줘요.': 'It sounds a little softer\nthan plain Locrian.',
      '도미넌트7(#11) 코드 위에서 주로 쓰여요.': "It's used mostly over\ndominant 7(#11) chords.",
      '리디안처럼 밝으면서도 블루지한 느낌을 더해줘요.': "It's bright like Lydian,\nwith a bluesy touch.",
      '도미넌트7(b13) 코드 위에서 주로 쓰여요.': "It's used mostly over\ndominant 7(b13) chords.",
      '믹솔리디안보다 살짝 어두운 느낌을 줘요.': 'It sounds slightly darker\nthan Mixolydian.',
      '메이저 키의 ii-V-i에서 m7(b5) 코드 위에 주로 쓰여요.': "It's used mostly over the m7(b5) chord\nin a major-key ii-V-i.",
      "'하프디미니시드 스케일'이라는 다른 이름으로도 불려요.": "It's also known as\nthe half-diminished scale.",
      '수고하셨어요! 스케일 블럭의 기본 개념을 배웠어요! 이제 자유롭게 연습해보세요!':
        "Nice work! You've learned\nthe basics of scale blocks!\nNow go practice freely!",

      // 챕터 2(스케일 전환)
      "챕터2에서는 '스케일 전환'을 알아볼게요!": "In Chapter 2 we'll look at\n'switching scales'!",
      '패밀리코드라는 개념을 알고 있어야 이해할 수 있을거예요.': "It'll make sense\nonce you know what diatonic chords are.",
      "코드를 진행하다보면 패밀리코드가 아닌 '7'코드가 종종 등장해요.":
        "In progressions, you'll sometimes run into\na '7' chord that isn't diatonic.",
      "그 '7'코드 뒤에 나오는 패밀리코드에 따라 사용할 스케일이 달라져요!":
        "The scale you use depends on\nwhich diatonic chord comes after that '7' chord!",
      "레벨8에서는 4도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배울거예요.":
        "In Level 8 you'll learn the scale to use\nover a '7' chord leading to the IV.",
      '처음엔 개념이 조금 어려울 수 있어요. 보통은 바뀌는 음에 익숙해지는 방법이 있어요.':
        "It can feel tricky at first.\nOne common approach is to get used to the notes that change.",
      '그리고 바뀐 후의 스케일블럭을 보면, F메이저 스케일이랑 똑같다는 걸 알 수 있어요!':
        'And if you look at the block after the switch,\nyou can see it\'s the same as the F major scale!',
      '각자 받아들이기 편한 방법을 찾아서 숙달해보세요!': 'Find the way that clicks for you\nand get it under your fingers!',
      "이번엔 5도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        "This time, let's learn the scale to use\nover a '7' chord leading to the V.",
      '바뀐 후의 스케일블럭을 보면, G메이저 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Look at the block after the switch\nand you can see it\'s the same as the G major scale!',
      '마찬가지로, 바뀌는 음에 익숙해지는 연습을 해보세요!': 'Same as before: practice getting used to\nthe notes that change!',
      "이번엔 6도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        "This time, let's learn the scale to use\nover a '7' chord leading to the vi.",
      "이번엔 메이저가 아니라 '마이너'로 전환됐어요!": "This time it switched to minor,\nnot major!",
      '바뀐 후의 스케일블럭을 보면, A 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Look at the block after the switch\nand you can see it\'s the same as the A harmonic minor scale!',
      "이번엔 2도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        "This time, let's learn the scale to use\nover a '7' chord leading to the ii.",
      "이번에도 메이저가 아니라 '마이너'로 전환돼요!": "Again, it switches to minor,\nnot major!",
      '바뀐 후의 스케일블럭을 보면, D 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Look at the block after the switch\nand you can see it\'s the same as the D harmonic minor scale!',
      "이번엔 3도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        "This time, let's learn the scale to use\nover a '7' chord leading to the iii.",
      '바뀐 후의 스케일블럭을 보면, E 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Look at the block after the switch\nand you can see it\'s the same as the E harmonic minor scale!',
      '이걸로 챕터2의 5가지 전환을 모두 배웠어요!': "That's all 5 switches\nin Chapter 2!",
    },

    scoped: [
      ['#test-note-grid', { '도': 'Do', '레': 'Re', '미': 'Mi', '파': 'Fa', '솔': 'So', '라': 'La', '시': 'Ti' }],
    ],

    patterns: [
      // "?" 미니 강의 — 스케일 이름이 끼어드는 문구
      [/^이번 시간에는 '(.+)'을 배워볼게요!$/, "This time, let's learn the {1}!"],
      [/^(.+)은 우리에게 익숙한 '(.+)' 음계를 의미해요\.$/, "The {1} is the familiar\n'{2}'\nscale."],
      [/^(.+)은 '(.+)'로 이루어져요\.$/, "The {1} is made of\n'{2}'."],
      [/^도수로 표현한다면 (.+) 가 돼요!$/, "In scale degrees, that's {1}!"],
      [/^(.+)의 특징음은 (.+) 음이에요\.$/, 'The characteristic note of the {1}\nis the {2}.'],
      [/^(.+)의 색을 입힌 미뉴엣은 어떤 느낌일 지 들어봅시다!$/, "Let's hear how the Minuet sounds in {1}!"],
      [/^아래의 블럭은 (.+)이라고 할게요\. (.+)코드 모양과 닮았기 때문이에요\.$/,
        "We'll call the block below the {1}.\nThat's because it looks like the {2} chord shape."],
      [/^(.+)의 5가지 블럭은 아래와 같아요\.$/, 'Here are the 5 blocks\nof the {1}.'],
      [/^특징음을 중심으로 연습해서 (.+)에 익숙해져보세요!$/, 'Practice around the characteristic note\nto get comfortable with the {1}!'],
      [/^수고하셨어요! (.+) 튜토리얼을 완료할게요!$/, 'Nice work! That wraps up\nthe {1} tutorial!'],
      [/^수고하셨어요! '(.+)'을 배웠어요\. 자유롭게 연습해보세요!$/, "Nice work! You've learned the\n{1}. Now practice freely!"],
      [/^수고하셨어요! (.+)는 여기서 마칠게요!$/, "Nice work! That's it\nfor {1}!"],

      // 암기 테스트 지문(줄마다 한 조각)
      [/^([A-G][#b]?) ?(메이저|하모닉 마이너|내추럴 마이너) (\S+)에서$/,
        m => 'From ' + m[1] + ' ' + KEYQ[m[2]] + ', ' + I18N.t(m[3]) + ','],
      [/^([A-G][#b]?) ?(메이저|하모닉 마이너|내추럴 마이너) (\S+)으로(?: 전환해보세요!)?$/,
        m => 'switch to ' + m[1] + ' ' + KEYQ[m[2]] + ', ' + I18N.t(m[3]) + '!'],
      [/^([A-G][#b]?) (.+)의$/, 'In {1} {2},'],
      [/^(\S+폼)을 입력해주세요!$/, 'fill in the {1}!'],

      // 스케일·폼 이름(낱말 단위) — 다른 패턴보다 뒤에 둘 것
      [/^(.+) 스케일$/, m => { const r = SCALE_RE.exec(m[0]); return r ? scaleName(r) : I18N.t(m[1]) + ' Scale'; }],
      [SCALE_RE, scaleName],
    ],
  });
})();
