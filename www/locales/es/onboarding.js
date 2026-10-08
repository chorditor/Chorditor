// 스페인어 사전 — 온보딩(onboarding.html / onboarding.js)
I18N.add('es', {
  exact: {
    '기타 코드표 제작 도구': 'Creador de diagramas de acordes',
    '로그인 중...': 'Iniciando sesión...',
    '다른 계정으로 변경': 'Usar otra cuenta',
    'Google 계정으로 계속하기': 'Continuar con Google',
    '외부 브라우저에서 열어주세요': 'Ábrelo en tu navegador',
    '현재 인앱 브라우저에서는 Google 로그인이 제한됩니다.': 'El inicio de sesión con Google no funciona en este navegador integrado.',
    'Chrome 또는 Safari에서 다시 열어주세요.': 'Vuelve a abrir esta página en Chrome o Safari.',
    '외부 브라우저로 열기': 'Abrir en el navegador',
    'URL 복사하기': 'Copiar URL',
    'URL 복사됨!': '¡URL copiada!',

    // 페르소나 부제
    '기타 막 샀어요': 'Con la etiqueta todavía puesta',
    '조금씩 연습 중': 'Practicando poco a poco',
    '악보 없으면 못 쳐요': 'Sin tabs me pierdo',
    '혼자선 잘 쳐요': 'Me luzco cuando nadie mira',

    // 약관 동의
    '약관에 동의해 주세요': 'Acepta los términos',
    '여러분의 정보는 더 나은 코디터를 위해 활용됩니다. 여러분의 개인 정보는 꼭 지켜드릴게요.':
      'Usamos tu información para mejorar Chorditor, y cuidamos tus datos personales.',
    '(필수)': '(Obligatorio)',
    '(선택)': '(Opcional)',
    '이용약관 동의': 'Acepto los Términos de Servicio',
    '개인정보처리방침 동의': 'Acepto la Política de Privacidad',
    '만 14세 이상입니다': 'Tengo 14 años o más',
    '앱 푸시 허용': 'Permitir notificaciones push',
    '동의하고 계속하기': 'Aceptar y continuar',

    // 선택지
    '1개월 미만': 'Menos de 1 mes',
    '6개월 미만': 'Menos de 6 meses',
    '1년 이상': 'Más de 1 año',
    '3년 이상': 'Más de 3 años',
    '닉네임 입력': 'Escribe un apodo',
    '초대코드 입력': 'Ingresa el código de invitación',
    '보상은 접속하면 받을 수 있어요.': 'Tu recompensa te estará esperando al entrar.',

    // 초대코드 확인
    '확인 중...': 'Verificando...',
    '저장 중...': 'Guardando...',
    '유효하지 않은 코드입니다.': 'Ese código no es válido.',
    '본인의 코드는 사용할 수 없어요.': 'No puedes usar tu propio código.',
    '이미 초대코드를 사용했어요.': 'Ya usaste un código de invitación.',
    '잠시 후 다시 시도해 주세요.': 'Inténtalo de nuevo en un momento.',
  },

  // 줄바꿈(<br>)으로 나뉜 단계 제목 — 어순이 달라 문장 단위로 번역(열쇠에 <br> 자리를 그대로 적음)
  mixed: {
    '나는 어떤<br>기타리스트인가요?': '¿Qué tipo de<1/>guitarrista eres?',
    '기타를 친 지<br>얼마나 됐나요?': '¿Cuánto tiempo llevas<1/>tocando guitarra?',
    '성별을<br>알려주세요': '¿Cuál es<1/>tu género?',
    '태어난 년도를<br>선택해주세요': '¿En qué año<1/>naciste?',
    '어떻게<br>불러드릴까요?': '¿Cómo quieres<1/>que te llamemos?',
    '초대코드가<br>있으신가요?': '¿Tienes un código<1/>de invitación?',
    '초대코드를<br>입력해주세요!': '¡Ingresa tu código<1/>de invitación!',
    '초대코드가<br>확인되었습니다!': '¡Código de invitación<1/>confirmado!',
  },

  scoped: [
    ['.ob-big-card', { '남': 'Hombre', '여': 'Mujer', '있어요': 'Sí', '없어요': 'No' }],
  ],

  patterns: [
    [/^(\d{4})년$/, '{1}'], // 태어난 년도 휠
  ],
});
