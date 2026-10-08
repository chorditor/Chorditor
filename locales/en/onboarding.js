// 영어 사전 — 온보딩(onboarding.html / onboarding.js)
I18N.add('en', {
  exact: {
    '기타 코드표 제작 도구': 'Guitar chord chart maker',
    '로그인 중...': 'Signing in...',
    '다른 계정으로 변경': 'Use a different account',
    'Google 계정으로 계속하기': 'Continue with Google',
    '외부 브라우저에서 열어주세요': 'Please open in your browser',
    '현재 인앱 브라우저에서는 Google 로그인이 제한됩니다.': "Google sign-in isn't available in this in-app browser.",
    'Chrome 또는 Safari에서 다시 열어주세요.': 'Please reopen this page in Chrome or Safari.',
    '외부 브라우저로 열기': 'Open in browser',
    'URL 복사하기': 'Copy URL',
    'URL 복사됨!': 'URL copied!',

    // 페르소나 부제
    '기타 막 샀어요': 'Still has the tag on',
    '조금씩 연습 중': 'Practicing here and there',
    '악보 없으면 못 쳐요': 'Lost without the tabs',
    '혼자선 잘 쳐요': "Great when nobody's watching",

    // 약관 동의
    '약관에 동의해 주세요': 'Please agree to the terms',
    '여러분의 정보는 더 나은 코디터를 위해 활용됩니다. 여러분의 개인 정보는 꼭 지켜드릴게요.':
      'We use your info to make Chorditor better, and we keep your personal data safe.',
    '(필수)': '(Required)',
    '(선택)': '(Optional)',
    '이용약관 동의': 'Agree to the Terms of Service',
    '개인정보처리방침 동의': 'Agree to the Privacy Policy',
    '만 14세 이상입니다': "I'm 14 or older",
    '앱 푸시 허용': 'Allow push notifications',
    '동의하고 계속하기': 'Agree and continue',

    // 선택지
    '1개월 미만': 'Less than 1 month',
    '6개월 미만': 'Less than 6 months',
    '1년 이상': '1+ years',
    '3년 이상': '3+ years',
    '닉네임 입력': 'Enter a nickname',
    '초대코드 입력': 'Enter invite code',
    '보상은 접속하면 받을 수 있어요.': 'Your reward will be waiting when you sign in.',

    // 초대코드 확인
    '확인 중...': 'Checking...',
    '저장 중...': 'Saving...',
    '유효하지 않은 코드입니다.': "That code isn't valid.",
    '본인의 코드는 사용할 수 없어요.': "You can't use your own code.",
    '이미 초대코드를 사용했어요.': "You've already used an invite code.",
    '잠시 후 다시 시도해 주세요.': 'Please try again in a moment.',
  },

  // 줄바꿈(<br>)으로 나뉜 단계 제목 — 영어는 어순이 달라 문장 단위로 번역(열쇠에 <br> 자리를 그대로 적음)
  mixed: {
    '나는 어떤<br>기타리스트인가요?': 'What kind of<1/>guitarist are you?',
    '기타를 친 지<br>얼마나 됐나요?': 'How long have you<1/>been playing guitar?',
    '성별을<br>알려주세요': "What's your<1/>gender?",
    '태어난 년도를<br>선택해주세요': 'What year<1/>were you born?',
    '어떻게<br>불러드릴까요?': 'What should<1/>we call you?',
    '초대코드가<br>있으신가요?': 'Do you have<1/>an invite code?',
    '초대코드를<br>입력해주세요!': 'Enter your<1/>invite code!',
    '초대코드가<br>확인되었습니다!': 'Invite code<1/>confirmed!',
  },

  scoped: [
    ['.ob-big-card', { '남': 'Male', '여': 'Female', '있어요': 'Yes', '없어요': 'No' }],
  ],

  patterns: [
    [/^(\d{4})년$/, '{1}'], // 태어난 년도 휠
  ],
});
