// 스페인어 사전 — 데일리 미션(daily-mission / mission-session / mission-result-messages), 출석(attendance)
(() => {
  const MONTH = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const pl = (n, one, many) => n + ' ' + (Number(n) === 1 ? one : (many || one + 's'));

  I18N.add('es', {
    exact: {
      'Chorditor - 오늘의 미션': 'Chorditor - Reto Diario',
      'Chorditor - 출석체크': 'Chorditor - Check-in Diario',

      // ── 출석 ──
      '꾸준히 연습해서 실력을 키워봐요!': '¡Sigue practicando y verás cómo mejoras!',
      '오늘의 훈련 루틴 하러가기': 'Ir a la rutina de hoy',
      '오늘 훈련 결과보기': 'Ver los resultados de hoy',
      '오늘은 출석을 완료했어요': 'Ya hiciste check-in hoy',
      '아직 오늘 출석을 못했어요': 'Aún no haces check-in hoy',
      '보충출석': 'Congelar Racha',
      '이번 달 출석 완료!': '¡Mes completo!',
      '이번 달 출석을 모두 채웠어요.': 'Completaste todos los check-ins de este mes.',
      '다음 달에 새로 시작해요!': '¡El próximo mes empezamos de nuevo!',

      // ── 데일리 미션 입구 ──
      '매일 연습 루틴': 'Rutina Diaria de Práctica',
      '아래의 훈련을 진행해요': 'Esto es lo que toca hoy',
      '코드맞추기': 'Quiz de Acordes',
      '코드조합훈련': 'Quiz de Reharm',
      '코드 조합': 'Quiz de Reharm',
      '시작할래요!': '¡Vamos!',

      // ── 준비 화면 ──
      '오늘의 미션을 준비하고 있어요': 'Preparando tu Reto Diario',
      '학습 데이터를 불러오는 중': 'Cargando tus datos de práctica',
      '실력에 맞는 문제를 고르는 중': 'Eligiendo preguntas para tu nivel',
      '오늘의 미션을 준비하는 중': 'Armando tu Reto Diario',
      '기타가 있다면 지금 가져와주세요.': '¿Tienes una guitarra cerca? Ve por ella.',
      '직접 잡아보며 연습하면 훨씬 도움이 돼요!': '¡Practicar con ella en las manos ayuda muchísimo!',

      // ── 코드맞추기 ──
      '헷갈리는 코드 암기를 재미있게 훈련해요': 'Una forma divertida de memorizar acordes difíciles',
      '기타가 있다면 직접 잡아보면서 암기해봐요!': 'Si tienes tu guitarra, ¡toca cada uno mientras avanzas!',
      '이번 훈련에 등장할 코드예요': 'Estos son los acordes que vienen',
      '클릭하면 소리가 들려요!': '¡Toca uno para escucharlo!',
      '준비됐어요!': '¡Listo!',
      '맞춰주세요!': 'para responder todo.',
      '최대한 빠르게 맞춰보세요!': '¡Responde lo más rápido que puedas!',
      '카운트가 시작됩니다.': 'Empieza la cuenta regresiva.',
      '올바른 정답을 선택하세요': 'Elige la respuesta correcta',
      '헉, 이렇게 빨리 맞추시다니 대단하신걸요...?': '¡Guau, qué rapidez! Impresionante.',
      '엄청 빠르네요!! 혹시 찍으신 건 아니겠죠?!': '¡¡Rapidísimo!! No fue al azar, ¿verdad?',
      '탈인간적 속도입니다!!': '¡¡Velocidad sobrehumana!!',
      '정답입니다! 열심히 외우신게 느껴지네요~!': '¡Correcto! Se nota todo lo que has practicado.',
      '와! 조금만 더 빨라지면 마스터 하시겠는걸요?!': '¡Guau! Un poco más rápido y lo dominas.',
      '정답입니다. 조금만 더 빨라지면 충분히 연주하실 수 있겠어요!': 'Correcto. Un poco más rápido y lo estarás tocando de verdad.',
      '축하합니다, 정답이예요! 금방 코드를 다 외우시겠는걸요~?': '¡Bien, es correcto! Pronto te sabrás todos estos acordes.',
      '정답입니다!! 포기하지 않고 결국 맞추셨네요!': '¡¡Correcto!! No te rendiste y lo lograste.',
      '약간 헷갈리셨지만 정답이예요 축하합니다!': 'Dudaste un poquito, pero acertaste. ¡Bien!',
      '앗, 약간 헷갈리셨나봐요! 얼마든지 도전할 수 있어요': '¡Ups, esa era difícil! Puedes intentarlo las veces que quieras',
      '아쉽게도 틀리셨네요ㅠㅠ 금방 외워질거예요!': 'Esta vez no. ¡Pronto se te queda!',
      '틀리셔도 괜찮아요! 시간은 많답니다~': '¡No pasa nada por fallar! Hay tiempo de sobra.',

      // ── 스케일 ──
      '기타 솔로 연주에 필수 훈련!': '¡Práctica esencial para los solos de guitarra!',
      '스케일 블럭을 외우는 훈련이예요': 'Aquí memorizas bloques de escala',
      '이번 훈련에 나올 5가지 블럭이예요': 'Estos 5 bloques son los que vienen',
      'Tip. 2칸 차이, 3칸 차이에 주목해보세요!': 'Tip: ¡fíjate en los saltos de 2 y de 3 trastes!',
      '마이너 펜타토닉': 'Pentatónica Menor',
      '메이저': 'Mayor',
      '메이저 펜타토닉': 'Pentatónica Mayor',
      '메이저 블루스': 'Blues Mayor',
      '마이너 블루스': 'Blues Menor',
      '내추럴 마이너': 'Menor Natural',
      '하모닉 마이너': 'Menor Armónica',
      '프리지안 도미넌트': 'Frigia Dominante',
      '믹솔리디안 b9 b13': 'Mixolidia b9 b13',
      '얼터드': 'Alterada',
      'A폼': 'forma A',
      'G폼': 'forma G',
      'E폼': 'forma E',
      'D폼': 'forma D',
      'C폼': 'forma C',
      '올바른 곳을 채우세요!': '¡Completa los lugares correctos!',
      '제출하기': 'Enviar',

      // ── 코드 조합 ──
      '코드 진행을 연습할 수 있어요!': '¡Practica progresiones de acordes reales!',
      '악보 없이 연주하는데 최고의 연습이 될 거예요!': '¡El mejor entrenamiento para tocar sin partitura!',
      '순서를 외워주세요!': '¡Memoriza el orden!',
      '주어진 진행을 순서대로 배치하세요': 'Ordena la progresión',
      '힌트보기': 'Pista',
      'M7코드는 9, #11, 13 텐션을 사용할 수 있어요!': '¡Los acordes M7 admiten las tensiones 9, #11 y 13!',
      'm7코드는 9, 11 텐션을 사용할 수 있어요!': '¡Los acordes m7 admiten las tensiones 9 y 11!',
      '7코드는 모든 텐션을 사용할 수 있어요!': '¡Los acordes 7 admiten cualquier tensión!',
      '어울리는 텐션을 찾아서 바꿔보세요': 'Busca una tensión que encaje y cámbiala',
      '아래에서 정답을 찾아 배치하세요!': '¡Busca la respuesta abajo y colócala!',
      '아래에서 정답을 찾아 바꿔보세요!': '¡Busca la respuesta abajo y cámbiala!',
      '(으)로 바꿔보세요': '',

      // ── 이탈 확인 ──
      '풀이를 그만두시겠어요?': '¿Parar aquí?',
      '지금 나가면 오늘 진행 상황이': 'Si sales ahora, tu avance de hoy',
      '저장되지 않아요.': 'no se guardará.',
      '지금 나가면 오늘 진행 상황이 저장되지 않아요.': 'Si sales ahora, tu avance de hoy no se guardará.',

      // ── 결산 ──
      '훈련 결과!': '¡Tus resultados!',
      '낮음': 'Bajo',
      '평균': 'Prom.',
      '높음': 'Alto',
      '정답이 없어 통계를 낼 수 없어요': 'Sin aciertos no hay estadísticas esta vez',
      '맞춘 노트': 'Notas acertadas',
      '틀린 노트': 'Notas falladas',
      '오답 풀기': 'Repasar fallos',
      '종료하기': 'Terminar',
      '오답 풀고 추가 보상 받아가세요!': '¡Repasa tus fallos y llévate una recompensa extra!',
      '오늘의 훈련을 모두 마쳤어요!': '¡Terminaste la práctica de hoy!',
      '광고 보고 2배': 'Ver anuncio para ×2',
      '광고 보상 2배 적용!': '¡Recompensa ×2 por anuncio aplicada!',
      'Pro 보상 2배 적용!': '¡Recompensa ×2 de Pro aplicada!',
      '보상 2배 받기': 'Recibir recompensa ×2',
      '훈련 루틴 완료!': '¡Rutina Diaria completa!',
      '오늘의 훈련을 끝냈어요': 'Terminaste la práctica de hoy.',
      '보상을 받아가세요!': '¡Llévate tu recompensa!',
      '오답 풀기 완료!': '¡Repaso completo!',
      '틀린 문제를 전부 다시 맞혔어요': 'Corregiste todo lo que habías fallado.',
      '추가 보상을 받아가세요!': '¡Llévate tu recompensa extra!',
      '전 문항 정답!': '¡Todo correcto!',
      '만점이에요!': '¡Puntaje perfecto!',
      '오답 풀기 몫까지 한 번에 받아가세요!': '¡Te llevas también el bono de repaso, todo junto!',
      '오늘 보상은 이미 받았어요': 'Ya reclamaste la recompensa de hoy',
      '전부 다시 맞혔어요!': '¡Esta vez acertaste todo!',
      '오늘 추가 보상은 이미 받았어요': 'Ya reclamaste el bono de hoy',
      '코드 이름과 운지를 보자마자 떠올리는 순발력을 기릅니다': 'Entrena el recuerdo instantáneo de nombres y digitaciones de acordes',
      '지판 위 스케일 블럭을 손이 기억하게 만드는 훈련입니다': 'Entrena tus manos para recordar los bloques de escala en el diapasón',
      '코드끼리 자연스럽게 이어붙이는 화성 감각을 기릅니다': 'Desarrolla tu sentido para conectar acordes con naturalidad',

      // ── 승급 시험 ──
      '다음 단계': 'el siguiente nivel',
      '그동안 쌓은 실력을 확인할 시간이에요': 'Es hora de mostrar lo que has construido',
      '3영역을 모두 통과하면 승급합니다': 'Aprueba las 3 secciones para subir de nivel',
      '영역마다 제한시간이 있어요': 'Cada sección tiene un límite de tiempo',
      '시험 도전!': '¡Hacer la prueba!',
      '오늘 도전 횟수를 다 썼어요': 'Ya usaste todos los intentos de hoy',
      '아래 기준을 넘으면 이 영역은 통과예요': 'Supera el mínimo de abajo para aprobar esta sección',
      '문항 수': 'Preguntas',
      '통과 기준': 'Mínimo para aprobar',
      '제한 시간': 'Límite de tiempo',
      '추후 안내': 'Por anunciar',
      '준비됐으면 시험을 시작합니다!': '¡Empieza cuando quieras!',
      '승급 성공!': '¡Subiste de nivel!',
      '3영역 모두 통과했어요': 'Aprobaste las 3 secciones',
      '새 페르소나': 'Nuevo nivel',
      '획득 경험치': 'XP ganada',
      '다음 단계 콘텐츠가 열렸어요!': '¡Se desbloqueó el contenido del siguiente nivel!',
      '아쉬워요': 'Por poco',
      '이번엔 기준을 못 넘었어요': 'Esta vez no alcanzaste el mínimo',
      '괜찮아요, 다시 도전하면 돼요!': 'No pasa nada, ¡inténtalo otra vez!',
      '영역별 결과예요': 'Resultados por sección',
      '제한시간을 초과해서 나머지는 시간 제한 없이 풀었어요': 'Se acabó el tiempo, así que terminaste el resto sin límite',
      '언제든 다시 도전할 수 있어요': 'Puedes reintentar cuando quieras',
      '나중에': 'Después',
      '시간 초과로 실패했어요': 'Se acabó el tiempo',
      '그래도 남은 문제를 연습 삼아 풀어볼까요?': '¿Quieres terminar el resto como práctica?',
      '나가기': 'Salir',
      '끝까지 풀기': 'Terminar igual',
    },

    scoped: [
      // "OO님, 오늘의 훈련 루틴을 준비했어요! / 하루 3분 훈련하고 추가 보상 받아가세요"
      ['.ob-step8-desc', {
        '님, 오늘의 훈련 루틴을 준비했어요!': ', ¡tu rutina de hoy está lista!',
        '하루': 'Practica',
        '3분': '3 min',
        '훈련하고': 'al día y recibe',
        '추가 보상': 'recompensas extra',
        '받아가세요': '',
      }],
      // "매일의 훈련 루틴을 완료해서 출석해요"
      ['.attendance-desc', {
        '매일의': 'Completa tu',
        '훈련 루틴': 'Rutina Diaria',
        '을 완료해서': ' para hacer',
        '출석': 'check-in',
        '해요': '',
      }],
      ['.ms-result-stat-headline', { '상위': 'Top' }],
    ],

    patterns: [
      [/^(\d+)월 출석$/, m => 'Check-ins de ' + MONTH[m[1] - 1]],
      [/^제한시간 (\d+)초 안에$/, 'Tienes {1} segundos'],

      // 스케일
      [/^(.+) 스케일 (.+) 블럭을 채워주세요$/, m => 'Completa el bloque: Escala ' + I18N.t(m[1]) + ', ' + I18N.t(m[2])],
      [/^(\d+)번폼$/, 'forma {1}'],
      [/^오답 (\d+)개$/, m => pl(m[1], 'fallo')],

      // 코드 조합 힌트·지문
      [/^([A-G][#b]?) ?메이저 스케일은 (.+) 예요[.!]$/, 'La escala de {1} mayor es {2}.'],
      [/^([A-G][#b]?m?) ?마이너 스케일은 (.+) 예요[.!]$/, 'La escala de {1} menor es {2}.'],
      [/^(.+) 스케일은 (.+) 예요[.!]$/, 'La escala {1} es {2}.'],
      [/^타겟인 (.+)의 5번째 코드를 찾아보세요!$/, '¡Busca el acorde V de {1}, tu objetivo!'],
      [/^타겟인 (.+)의 2번째와 5번째 코드를 찾아보세요!$/, '¡Busca los acordes ii y V de {1}, tu objetivo!'],
      [/^타겟인 (.+)의 반음 (높은|낮은) 음을 찾으세요!$/,
        m => '¡Busca la nota medio tono ' + (m[2] === '높은' ? 'arriba' : 'abajo') + ' de ' + m[1] + ', tu objetivo!'],
      [/^표시된 부분을 순서대로 (.+)\(으\)로 바꿔보세요$/, 'Cambia los acordes marcados, en orden, por {1}'],
      [/^표시된 부분을 (.+)\(으\)로 바꿔보세요$/, 'Cambia el acorde marcado por {1}'],
      [/^표시된 부분을 순서대로 (.*)$/, 'Cambia los acordes marcados, en orden, por {1}'],
      [/^표시된 부분을 (.*)$/, 'Cambia el acorde marcado por {1}'],
      [/^(.*)\(으\)로 바꿔보세요$/, '{1}'],

      // 결산
      [/^(\d+)점$/, '{1} pts'],
      [/^가 (\d+)개 이상 맞췄어요!$/, ' acertó {1} o más.'],
      [/^가 평균 ([\d.]+)초만에 맞췄어요!$/, ' respondió en {1} s en promedio.'],
      [/^이번에 학습한 Key : (.+)$/, 'Tonalidad practicada: {1}'],
      [/^피크상자 \+(\d+)$/, 'Cajitas de Púas +{1}'],
      [/^경험치 \+(\d+)XP · Pro 보상 2배 적용!$/, 'XP +{1} · ¡Recompensa ×2 de Pro aplicada!'],
      [/^경험치 \+(\d+)XP$/, 'XP +{1}'],

      // 승급 시험
      [/^(.+) 승급 시험$/, 'Prueba de Ascenso: {1}'],
      [/^(.+)\(으\)로 승급하려면$/, 'Para subir a {1}'],
      [/^(\d+)문제 중 (\d+)개 이상$/, '{2} o más de {1}'],
      [/^(.+) 시험 안내$/, 'Sobre la prueba: {1}'],
      [/^(\d+)문제$/, m => pl(m[1], 'pregunta')],
      [/^(\d+)개 이상 정답$/, '{1} o más correctas'],
      [/^(\d+)초$/, '{1} s'],
      [/^이제부터 (.+)예요$/, 'Ahora eres: {1}'],
      [/^(\d+)\/(\d+) 통과$/, '{1}/{2} aprobado'],
      [/^(\d+)\/(\d+) 미달$/, '{1}/{2} insuficiente'],
      [/^오늘 (\d+)번 더 도전할 수 있어요$/, m => (Number(m[1]) === 1 ? 'Te queda 1 intento hoy' : 'Te quedan ' + m[1] + ' intentos hoy')],
      [/^재도전 ?(.*)$/, 'Reintentar {1}'],
    ],
  });

  // ── 결산 평가 문구 — mission-result-messages.js 의 CASE_TEXTS·POOLS와 같은 모양(키·순서) ──
  // {strong}·{weak}·{next}는 원문과 같이 그대로 둔다(치환은 mission-result-messages.js가 함).
  I18N.data.missionResult = {
    CASE_TEXTS: {
      high_high_high: [
        'Quiz de Acordes, Bloques de Escalas, Quiz de Reharm: ¡pasaste los tres sin titubear! Los días en que todo encaja a la vez no son frecuentes, y significa que lo que has construido ya está de verdad en tus manos.\n\nTodo indica que puedes subir a {next}, así que es buen momento para intentar la Prueba de Ascenso desde tu Perfil.',
        'Acertaste absolutamente todo. Acordes, escalas, reharm: lo resolviste sin una sola duda. Tanta repetición ya se convirtió en habilidad real.\n\nCon este nivel puedes aprobar la Prueba de Ascenso de {next}, ¡así que inténtala!',
        'Hoy no hay puntos flojos que señalar. Terminar los tres con tanta estabilidad significa que tus manos ya se mueven solas en lugar de dudar.\n\nSi siguen llegando días así, es hora de pasar a {next}. ¡Haz la Prueba de Ascenso cuando quieras!',
      ],
      high_high_mid: [
        'Tus acordes están tan bien memorizados que la mano reacciona antes de pensar, ¡y ya te sientes a gusto encontrando líneas melódicas con las escalas!\n\nA tu sentido para conectar acordes solo le falta un poquito, y puedes seguir avanzando tal como vas.',
        '¡La memoria de acordes y la melodía están firmes!\n\nTu sentido para ordenar acordes armónicamente está a un poco de práctica, así que con este nivel puedes seguir adelante sin problema.',
        'Acordes y escalas salieron fluidos. Colocar acordes en el Quiz de Reharm es algo que irás completando con la práctica, así que en conjunto es un gran resultado.\n\nSolo ten presente esa área mientras avanzas.',
      ],
      high_high_low: [
        '¡Ya dominas acordes y escalas!\n\nLo siguiente es aprender a tejer esos acordes en progresiones naturales. Eso es justo lo que desarrolla el Quiz de Reharm, así que es ideal para continuar.',
        '¡El Quiz de Acordes y las escalas estuvieron sólidos!\n\nEl siguiente paso es crear progresiones con los acordes que ya sabes. Desarrollar ese sentido con el Quiz de Reharm hará que todo lo aprendido se sienta mucho más completo.',
        '¡Ya no hay de qué preocuparse con acordes ni escalas! Para dar un paso más necesitas sentir cómo fluyen los acordes entre sí, y el Quiz de Reharm entrena exactamente eso.\n\n¡Pruébalo a continuación!',
      ],
      high_mid_high: [
        '¡Dominas el Quiz de Acordes y el Quiz de Reharm! Recordar el acorde que quieres y armar una progresión con él es el corazón de disfrutar la guitarra, y tienes ambas cosas.\n\nLas escalas (melodía) van bien a tu ritmo actual, ¡así que podrías intentar la Prueba de Ascenso de {next}!',
        'Entiendes la memoria y la colocación de acordes que hacen falta para acompañar. Las escalas son un área que puedes tomar con calma cuando te interese, así que no hay por qué agobiarse.\n\nCon este nivel, la Prueba de Ascenso de {next} no debería ser problema. ¡Ponte a prueba!',
        '¡Quiz de Acordes y Quiz de Reharm, ambos perfectos! Esos dos son el núcleo de acompañar una canción, así que las escalas están bien como están.\n\nTodo indica que puedes subir a {next}, ¡así que haz la Prueba de Ascenso!',
      ],
      high_mid_mid: [
        '¡Ya recuerdas los acordes al instante! Las escalas y el reharm piden una sensibilidad más compleja, así que es natural que tomen más tiempo.\n\nUn poco más de tiempo en esas dos y tu forma de tocar va a subir de nivel.',
        '¡La memoria de acordes está asegurada! Las escalas y el reharm son mucho más complejos que memorizar acordes, así que ir así de bien ya significa que vas por buen camino.\n\nRefuerza un poco más y el siguiente nivel está justo enfrente.',
        '¡Tu recuerdo instantáneo de nombres y digitaciones está firme! Las escalas y el reharm crecen despacio porque son difíciles, y vas claramente en la dirección correcta.\n\nMantén este ritmo en esas dos y pronto llegará un salto de verdad.',
      ],
      high_mid_low: [
        '¡Tu recuerdo instantáneo de nombres y digitaciones está firme! También vas siguiendo bien el paso al encontrar líneas melódicas con las escalas.\n\nEl Quiz de Reharm te enseña, de forma natural, que las progresiones siguen reglas. Cuando ese sentido se asienta, puedes acompañar sin partitura y entender las canciones mucho más a fondo. Sigue repitiéndolo y un día notarás que esas reglas ya están en tus manos.',
        'Tus acordes están tan firmes que la mano reacciona al verlos, ¡y las escalas van bien! El Quiz de Reharm te entrena para sentir los patrones con que se conectan los acordes. A medida que eso se acumula, podrás acompañar canciones sin partitura y entenderlas con otra profundidad.\n\nCuanto más lo veas, más natural se volverá ese flujo.',
        'Tu memoria de acordes ya es un punto fuerte, ¡y se nota que también sigues el paso con las escalas! El Quiz de Reharm te acostumbra a las reglas detrás de las progresiones. A medida que crezca, podrás acompañar sin partitura y entender las canciones mucho mejor.\n\nVuelve a él seguido y ese sentido se quedará por sí solo.',
      ],
      high_low_high: [
        '¡La memoria de acordes y el reharm están sólidos! Con solo estas dos cosas tienes todo lo necesario para acompañar las canciones que te gustan.\n\nSi sumas las escalas, podrás expresar una canción con mucho más color a través de la melodía, así que échales un vistazo cuando te dé curiosidad.',
        '¡Quiz de Acordes y Quiz de Reharm, ambos perfectos! Es más que suficiente para disfrutar la guitarra acompañando.\n\nCuando las escalas también estén en tus manos, podrás tocar la misma canción de una forma nueva con la melodía, y se abre otro tipo de diversión.',
        'Recordar el acorde que quieres y armar progresiones con él: ¡tienes las dos cosas! Es todo lo que necesitas para disfrutar las canciones acompañando.\n\nLas escalas no son obligatorias: son una forma de ampliar tu mundo guitarrístico, así que nunca es tarde para empezar cuando te dé curiosidad.',
      ],
      high_low_mid: [
        'Los acordes están por completo en tus manos, ¡y tu sentido para armar progresiones crece con paso firme! Ya ahora te alcanza para acompañar las canciones que quieras.\n\nLas escalas pueden esperar hasta que te interesen, así que por ahora disfruta de acompañar.',
        'Tu Quiz de Acordes está impecable, y en el Quiz de Reharm ya lees más de la mitad de cómo fluye una canción. ¡Eso alcanza para acompañar una canción completa!\n\nAprender escalas te permite tocar la misma canción de otra forma con la melodía, pero es un extra que puedes empezar cuando te provoque.',
        'Está claro que dominas los acordes, y tu sentido para tejerlos sigue creciendo. ¡Ya tocas lo suficiente para disfrutar las canciones acompañando!\n\nPuedes disfrutar la guitarra perfectamente sin escalas (melodía); piénsalas como una extensión divertida que más adelante te dejará expresar las canciones de muchas más formas.',
      ],
      high_low_low: [
        'Ves el nombre de un acorde y la digitación te viene de inmediato. Resolver las preguntas de hoy casi sin dudar muestra que las formas de los acordes están bien grabadas en tus manos y tus ojos. Desde aquí hay dos caminos: las escalas desarrollan tu sentido para expresar canciones con la melodía, y el Quiz de Reharm tu sentido para tejer acordes en un flujo natural.\n\nAmbos son una diversión distinta a memorizar acordes, así que échales un vistazo cuando quieras disfrutar la guitarra de más maneras.',
        'Tu capacidad de unir nombres de acordes con digitaciones reales está firme. Eliges cualquier acorde al instante sin confundirlos, así que esto ya no es algo que tengas que pensar.\n\nLa guitarra tiene dos sentidos más allá de eso: las escalas te dejan expresar una canción con la melodía, como al cantar, y el Quiz de Reharm consiste en crear tus propias progresiones con los acordes que sabes. Si hasta ahora has construido sobre los acordes, estas dos le darán mucha más dimensión a tu forma de tocar.',
        'Tanto tu velocidad como tu precisión al unir nombres y digitaciones están en un nivel sólido. Hay dos áreas hacia las que vale la pena crecer: las escalas desarrollan tu sentido para tocar melodía, y el Quiz de Reharm tu sensibilidad para el flujo y las reglas entre acordes.\n\nVas bien solo con los acordes, pero sumar estas dos ampliará las formas en que puedes disfrutar la guitarra.',
      ],
      mid_high_high: [
        'Escalas y reharm: ¡dominas ambas! Las escalas implican memorizar todo el diapasón, y el reharm solo funciona cuando entiendes cómo se relacionan los acordes, así que un puntaje alto en las dos es un gran activo para lo que viene.\n\nAl Quiz de Acordes solo le falta memorización, así que hay poco de qué preocuparse. Con este nivel, ¡vale mucho la pena intentar la Prueba de Ascenso de {next}!',
        '¡Escalas y reharm, ambas perfectas! Las dos exigen repetición y comprensión a la vez, así que un puntaje alto aquí significa que tu base ya es fuerte.\n\nEl Quiz de Acordes llega solo cuando dedicas tiempo a memorizar, así que tranquilidad. ¡Es buen momento para intentar la Prueba de Ascenso de {next}!',
        '¡Un puntaje alto en escalas y reharm es de verdad impresionante! Las escalas implican memorizar posiciones completas en el diapasón, y el reharm entender cómo se relacionan los acordes, así que ninguno de los dos puntajes sale fácil.\n\nEl Quiz de Acordes es pura memorización y solo necesita un poco más. Con esta base ya puedes con {next}, ¡así que haz la Prueba de Ascenso!',
      ],
      mid_high_mid: [
        '¡Tu ojo para los bloques de escala destaca de verdad! Leer rápido las líneas melódicas en el diapasón es una gran base para pasar después a los solos y la improvisación.\n\nEl Quiz de Acordes y el Quiz de Reharm también están en un nivel en el que vale la pena intentar el siguiente paso. Y a medida que crezca tu comprensión de la armonía, manejarás la melodía con mucha más libertad. ¡Intenta la Prueba de Ascenso de {next}!',
        '¡Distinguir y leer escalas es claramente lo tuyo! Ese sentido es la base para combinar distintas escalas y armar líneas de solo sobre la marcha.\n\nEl Quiz de Acordes y el Quiz de Reharm también están lo bastante firmes para intentar subir, y profundizar tu armonía desde aquí sumará comprensión de acordes a tu sentido melódico para tocar con mucha más riqueza. ¡Ve por la Prueba de Ascenso de {next}!',
        '¡Tu comprensión de las escalas es un punto fuerte claro! Leer bien las líneas melódicas puede llevarte a improvisar, donde las usas con libertad.\n\nEsa forma libre de tocar se vuelve mucho más profunda cuando se une con la comprensión de acordes y armonía. El Quiz de Acordes y el Quiz de Reharm también alcanzan para avanzar, ¡así que haz la Prueba de Ascenso de {next} y haz crecer esa comprensión en el camino!',
      ],
      mid_high_low: [
        '¡Tu ojo para los bloques de escala es muy bueno! Ya tienes un punto fuerte al encontrar líneas melódicas.\n\nEl Quiz de Acordes también se va completando poco a poco. Puede que ahora encuentres melodías por intuición, pero cuando el Quiz de Reharm te presente la armonía, esa intuición se convierte en intención clara: podrás explicar por qué elegiste una nota. Tus melodías ganan confianza.',
        '¡La melodía es claramente tu punto fuerte! El Quiz de Acordes también sigue a buen ritmo.\n\nLa armonía es la herramienta que te da una razón clara de por qué una nota encaja sobre el acorde que suena, en vez de dejar la melodía solo a la intuición. El Quiz de Reharm desarrolla ese sentido, y junto con tu manejo de escalas te lleva a tocar con una intención mucho más clara.',
        '¡Mostraste verdadera habilidad en escalas! El Quiz de Acordes también crece sin problemas.\n\nEl Quiz de Reharm (armonía) es la herramienta que te deja elegir notas de la melodía con razones y no solo por intuición. Suma esa comprensión al sentido melódico que ya tienes y cada cosa que toques empezará a llevar una intención clara.',
      ],
      mid_mid_high: [
        '¡Tu puntaje alto en el Quiz de Reharm destaca! Esta área solo funciona cuando entiendes cómo se relacionan los acordes, así que hacerlo bien aquí significa que tu armonía es bastante sólida.\n\nEl Quiz de Acordes y las escalas están en buen nivel, así que nada de qué preocuparse. Solo ten en cuenta que el gusto por entender puede quitarle tiempo a la práctica mecánica, así que conviene darle de vez en cuando su parte a la repetición de acordes y escalas.',
        'Mostraste un punto fuerte real en el Quiz de Reharm. ¡Tener ya una sensibilidad para cómo funcionan las progresiones no es común! El Quiz de Acordes y las escalas también siguen en buen nivel.\n\nEstá bien seguir disfrutando de profundizar en la teoría, y si además cuidas de vez en cuando la repetición con el instrumento, tus habilidades crecerán de forma más pareja.',
        '¡Mostraste un punto fuerte real en el Quiz de Reharm! Significa que tu capacidad de entender los acordes armónicamente ya está bien formada.\n\nEl Quiz de Acordes y las escalas siguen bien, así que no hay problema, pero ya que le tomaste el gusto a la teoría, darle algo de atención a la práctica mecánica de vez en cuando hará que todo quede más equilibrado.',
      ],
      mid_mid_mid: [
        '¡Quiz de Acordes, escalas y armonía (Quiz de Reharm) suben parejos en un nivel similar! Mantener la armonía al lado de las otras significa que tu equilibrio es bastante bueno.\n\nSigue repitiendo con este equilibrio y las tres crecerán juntas de forma natural.',
        '¡Las tres van al mismo paso en un nivel similar, sin que ninguna se quede atrás! Es admirable que mantengas la armonía al mismo ritmo que acordes y escalas.\n\nSigue así: es un buen flujo para que las tres se afiancen juntas.',
        '¡Tus puntajes en acordes, escalas y armonía (Quiz de Reharm) están muy parejos! Cuidar las tres a la vez es un verdadero punto fuerte.\n\nSolo sigue repitiendo lo que haces y la habilidad llegará sola.',
      ],
      mid_mid_low: [
        'El Quiz de Acordes te entrena para unir nombres y digitaciones al instante, y las escalas entrenan a tu cuerpo para saber dónde están las líneas melódicas en el diapasón. El Quiz de Reharm es otra cosa: desarrolla la comprensión para colocar los acordes que sabes, con naturalidad, dentro de una progresión real.\n\nCuanto más lo repitas, más claras se verán las reglas con que se conectan los acordes.',
        'El Quiz de Acordes y las escalas son entrenamiento de repetición para el recuerdo rápido y el sentido del diapasón, así que crecen solos si eres constante.\n\nEl Quiz de Reharm abre una puerta nueva de comprensión llamada armonía, y resulta mucho más fácil si intentas sentir cómo se relacionan los acordes en lugar de memorizar.',
        'El Quiz de Acordes y las escalas desarrollan la velocidad para reconocer acordes y el sentido melódico en el diapasón, así que crecen a medida que sumas repeticiones. El Quiz de Reharm es donde conoces la armonía: crear progresiones con esos acordes.\n\nEs bueno trabajarlo poco a poco, desarrollando ese sentido junto con los demás.',
      ],
      mid_low_high: [
        'Tu puntaje alto en el Quiz de Reharm impresiona. ¡Está claro que captaste el sentido para entender y aplicar cómo funcionan las progresiones! El Quiz de Acordes también sigue bien.\n\nEn realidad, las escalas y la armonía van de la mano. Necesitas armonía para ver qué escala encaja con qué acorde, y practicar escalas hasta sentir el grado de cada nota fortalece a su vez tu armonía. Con tu comprensión, las escalas empezarán a rendir frutos pronto.',
        '¡Tu sentido para tejer acordes armónicamente está firme! El Quiz de Acordes también va a buen ritmo.\n\nLas escalas y la armonía se impulsan entre sí cuando las trabajas juntas en lugar de profundizar solo en una. Saber armonía te muestra qué escala encaja con un acorde, y aprender los grados con las escalas alimenta de vuelta tu armonía.',
        '¡Mostraste un punto fuerte real en el Quiz de Reharm, lo que significa que entiendes por qué los acordes se conectan como lo hacen! El Quiz de Acordes también va fluido.\n\nEs fácil pensar que practicar escalas es algo aparte de la armonía, pero se alimentan mutuamente. La armonía te da razones para elegir una escala, y la sensibilidad para los grados que te da la práctica de escalas te ayuda a entender la armonía más a fondo.',
      ],
      mid_low_mid: [
        'El Quiz de Acordes y el Quiz de Reharm siguen a un ritmo parecido. Las escalas entrenan a tu cuerpo para saber dónde están las líneas melódicas en el diapasón, así que la repetición lo es todo, y por ahora esas repeticiones suman un poco menos que en las otras dos.\n\nMantén tu ritmo en acordes y reharm, refuerza las escalas de vez en cuando, y todo se equilibrará.',
        'El Quiz de Acordes y el Quiz de Reharm crecen bien. A diferencia de esos dos, las escalas son entrenamiento de repetición en el que manos y ojos tienen que aprender posiciones del diapasón, así que mejoran con seguridad cuanto más las ves.\n\nSigue cuidando los acordes como hasta ahora, comparte un poco de tiempo con las escalas, y las tres avanzarán parejas.',
        'El Quiz de Acordes y el Quiz de Reharm están estables en un nivel similar. Solo tu puntaje de escalas salió relativamente bajo, y es porque las escalas necesitan mucha repetición para llegar a las manos.\n\nMantén tu ritmo actual en acordes, ve llevando las escalas con constancia, y sin duda se pondrán al día.',
      ],
      mid_low_low: {
        common: [
          'El Quiz de Acordes sigue a buen ritmo. Las escalas y el reharm necesitan repetición y comprensión a la vez, así que por ahora están menos en tus manos que los acordes.\n\nMantén tu sentido para el Quiz de Acordes y comparte un poco más de tiempo con estas dos, y todo se equilibrará.',
          'El Quiz de Acordes crece bien. Las escalas son entrenamiento de repetición para aprender posiciones del diapasón, y el Quiz de Reharm trata de entender cómo se relacionan los acordes, así que cada uno pide un enfoque distinto.\n\nEn ambos importa más el tiempo dedicado que el puntaje de hoy, así que verlos poco y seguido los traerá de forma natural.',
          'El Quiz de Acordes se va asentando con constancia. Tus puntajes de escalas y reharm salieron relativamente bajos, lo cual es natural porque ambos toman más tiempo que memorizar acordes.\n\nMantén tu ritmo en acordes, dedica un poco más de tiempo a estas dos, y sin duda se pondrán al día.',
        ],
        unboxing: [
          'Es natural que los puntajes de escalas y reharm salgan bajos, así que sin presión. Las dos simplemente toman tiempo.\n\nMantén tu sentido para el Quiz de Acordes, repite las otras dos de a poco, y llegarán solas.',
          'Por supuesto que las escalas y el reharm se sienten extraños ahora.\n\nYa sigues muy bien el Quiz de Acordes, así que mira las otras dos un poco cada día y pronto estarán en tus manos.',
        ],
      },
      low_high_high: [
        'Un puntaje alto en escalas y reharm es de verdad impresionante. Dominar ambas significa que tienes comprensión armónica y sentido melódico a la vez, ¡una combinación poco común!\n\nSolo el Quiz de Acordes salió bajo. Revisa si respondiste con prisa; la próxima vez puede ayudar ir un poco más despacio.',
        '¡Escalas y reharm son puntos fuertes claros! Con este nivel, más que no saberte los acordes, parece que por un momento te confundieron opciones parecidas.\n\nHaz el Quiz de Acordes otra vez con calma y se pondrá al día rápido.',
        'Puntajes altos en escalas y en reharm. ¡Tus habilidades son claramente sólidas!\n\nSorprende un poco que solo el Quiz de Acordes haya salido bajo. La próxima vez resuelve las preguntas un poco más despacio y esta área se pondrá al día rápido.',
      ],
      low_high_mid: [
        '¡Tu ojo para los bloques de escala es muy bueno! El Quiz de Reharm también sigue a buen ritmo.\n\nEsta vez el Quiz de Acordes salió bajo, y quienes se enfocan en la melodía en realidad tienen más motivos para conocer muchas formas de acordes. Conocerlas te permite caer con naturalidad en las notas del acorde al armar melodías. Refuerza el Quiz de Acordes y tu sentido de las escalas se sentirá mucho más libre.',
        '¡Encontrar líneas melódicas es claramente lo tuyo! El Quiz de Reharm también sigue bien.\n\nVale la pena cuidar también el Quiz de Acordes: conocer varias formas del mismo acorde te permite armar melodías alrededor de sus notas. A medida que el Quiz de Acordes se complete, tendrás mucho más material para crear melodías.',
        '¡Tu comprensión de las escalas es muy buena! El Quiz de Reharm también avanza sin problemas.\n\nEsta vez el Quiz de Acordes salió bajo. Conocer varias formas del mismo acorde te permite armar melodías alrededor de las notas que contienen, así que ese conocimiento importa mucho incluso si lo tuyo es la melodía. Suma el Quiz de Acordes a tu sentido de las escalas y podrás expresar mucho más.',
      ],
      low_high_low: [
        'Tu sentido de las escalas es un punto fuerte real, ¡y tu capacidad de encontrar líneas melódicas es sólida! Con este nivel ya puedes disfrutar haciendo solos sobre las canciones que te gustan.\n\nEso sí, si quieres improvisar o mejorar de forma más sistemática, el Quiz de Acordes y el Quiz de Reharm ayudan mucho. Saber acordes y cómo ordenarlos deja claro por qué tocas cada nota, y aprenderás canciones notablemente más rápido.',
        '¡Tu sentido para encontrar melodías ya es bueno! Alcanza para disfrutar los solos de las canciones que te gustan.\n\nEl Quiz de Acordes y el Quiz de Reharm salieron bajos esta vez, pero cuando se completen, las melodías que antes encontrabas por intuición tendrán razones detrás, y la improvisación llegará sola. Sobre todo, saber acordes hace que aprender canciones nuevas sea mucho más rápido.',
        '¡Tu sentido de las escalas es excelente! Con este nivel puedes disfrutar haciendo solos sobre la canción que quieras.\n\nPero refuerza el Quiz de Acordes y el Quiz de Reharm, y las melodías que has ido encontrando por intuición tendrán una base, y la improvisación será mucho más libre. Saber acordes también acorta el tiempo que toma aprender una canción.',
      ],
      low_mid_high: [
        'Tu puntaje alto en el Quiz de Reharm impresiona. ¡Significa que de verdad sientes cómo se mueven las progresiones! Las escalas también siguen bien.\n\nSolo el Quiz de Acordes salió bajo. Puede que entiendas qué hacen los acordes y solo falte unirlos con nombres y digitaciones exactas. Refuerza eso y podrás tocar de verdad lo que entiendes.',
        '¡Tus habilidades en el Quiz de Reharm destacan! Las escalas también siguen bien.\n\nEl Quiz de Acordes salió bajo, pero saber cómo se conectan los acordes armónicamente y recordar al instante nombres y digitaciones concretas son dos sentidos distintos. Con la comprensión que mostraste en reharm, el Quiz de Acordes se pondrá al día rápido.',
        '¡Mostraste un punto fuerte real en el Quiz de Reharm! Las escalas también van bien.\n\nSolo el Quiz de Acordes está notablemente bajo. Parece que ya entiendes cómo fluyen las progresiones, así que solo falta un poco más de práctica uniendo nombres con digitaciones. Refuerza eso y comprensión y ejecución encajarán en una habilidad mucho más estable.',
      ],
      low_mid_mid: [
        'Las escalas y el reharm siguen a un ritmo parecido. El Quiz de Acordes entrena la unión instantánea de nombres y digitaciones, así que da un salto cuando se acumulan repeticiones, y por ahora tiene un poco menos recorrido que las otras dos.\n\nMantén tu ritmo en escalas y reharm, refuerza el Quiz de Acordes de vez en cuando, y todo se equilibrará.',
        'Las escalas y el reharm crecen bien. Más que las otras dos, el Quiz de Acordes depende simplemente de cuántas veces lo repites, así que sube con seguridad cuanto más lo ves.\n\nSigue cuidando escalas y reharm como hasta ahora, comparte un poco de tiempo con el Quiz de Acordes, y las tres avanzarán parejas.',
        'Las escalas y el reharm están estables en un nivel similar. Solo tu puntaje del Quiz de Acordes salió relativamente bajo, y es un área que se pone al día rápido cuando la vista se acostumbra.\n\nMantén tu ritmo actual en escalas y reharm, ve llevando el Quiz de Acordes con constancia, y sin duda se equilibrará.',
      ],
      low_mid_low: {
        common: [
          'Las escalas siguen a buen ritmo.\n\nPuede que el Quiz de Acordes y el Quiz de Reharm sean algo exigentes ahora, pero crecen solos con repetición constante, así que está bien seguir tal como vas.',
          'Tu sentido de las escalas se va asentando bien.\n\nEl Quiz de Acordes y el Quiz de Reharm salieron bajos, y en estos dos lo que importa es la repetición constante, así que complétalos de uno en uno, sin prisa.',
          'Las escalas avanzan con constancia.\n\nPuede que el Quiz de Acordes y el Quiz de Reharm se sientan difíciles ahora. Si es así, puedes seguir practicando a este ritmo, o si resulta demasiado, bajar un nivel y reconstruir con más margen también es buena opción.',
        ],
        unboxing: [
          'Las escalas entrenan a tu cuerpo para saber dónde están las líneas melódicas en el diapasón, ¡y ese sentido crece bien! El Quiz de Acordes entrena la unión instantánea de nombres y digitaciones, y el Quiz de Reharm te entrena para tejer esos acordes en progresiones naturales.\n\nLas tres mejoran seguro con un poco de repetición diaria, ¡así que sigue justo así!',
          'Tu sentido de las escalas se va asentando bien, ¡y este ritmo es el adecuado! El Quiz de Acordes desarrolla tu capacidad de recordar un acorde al verlo, y el Quiz de Reharm tu sentido para crear progresiones con esos acordes.\n\nEstas áreas mejoran seguro aunque las refuerces solo un poco cada día, ¡así que adelante!',
        ],
      },
      low_low_high: [
        '¡Puntaje alto en el Quiz de Reharm! Tu sentido de la armonía es claramente bueno. En realidad te sabes esto y solo pasaste rápido por las primeras partes, ¿verdad? Si no es así, conviene enfocarte más en el Quiz de Acordes y los Bloques de Escalas.\n\nCuando la armonía empieza a tener sentido, es fácil engancharse con ella y descuidar la repetición. ¡Poder tocarlo de verdad es lo que hace a alguien tocar realmente bien!',
        '¡Tu puntaje en el Quiz de Reharm muestra que de verdad entiendes la armonía! No pasaste los dos primeros tocando al azar, ¿verdad? Si no es así, conviene dedicar más tiempo a la repetición del Quiz de Acordes y las escalas.\n\nCuando la teoría empieza a encajar, es fácil sumergirse en ella y posponer la práctica con el instrumento, pero al final la habilidad real viene de poder tocarlo.',
        'La comprensión que mostraste en el Quiz de Reharm es auténtica, ¡y significa que tienes un gran sentido de la armonía! Quizás solo pasaste volando por los otros dos por diversión.\n\nSi esos puntajes sí reflejan tu nivel real, conviene enfocarte más en el Quiz de Acordes y las escalas. Cuando la armonía se vuelve divertida es fácil hundirse en la teoría y descuidar la práctica, pero esa práctica es la que al final marca la diferencia.',
      ],
      low_low_mid: {
        common: [
          'El Quiz de Reharm sigue a buen ritmo.\n\nEl Quiz de Acordes te permite recordar acordes al instante para que tu acompañamiento nunca se trabe, y las escalas le enseñan el diapasón a tu cuerpo para que también manejes la melodía. Puede que ambos sean algo exigentes ahora, pero crecen solos con repetición constante, así que está bien seguir tal como vas.',
          'Tu sentido para el Quiz de Reharm se va asentando bien. El Quiz de Acordes desarrolla el recuerdo rápido que necesitas para tocar progresiones de verdad, y las escalas la base para expresar la melodía.\n\nEn ambos lo que importa es la repetición, así que complétalos de uno en uno, sin prisa.',
          'El Quiz de Reharm avanza con constancia. El Quiz de Acordes hace fluidos tus cambios de acorde al acompañar una canción, y las escalas son el trampolín para tocar melodías y solos más adelante.\n\nSi ahora se siente difícil, puedes seguir a este ritmo, o si resulta demasiado, bajar un nivel y reconstruir con más margen también es buena opción.',
        ],
        unboxing: [
          'El Quiz de Reharm te entrena para tejer acordes en progresiones naturales, ¡y ese sentido crece bien! El Quiz de Acordes entrena la unión instantánea de nombres y digitaciones, y las escalas entrenan a tu cuerpo para saber dónde están las líneas melódicas en el diapasón.\n\nLas tres mejoran seguro con un poco de repetición diaria, ¡así que sigue justo así!',
          'Tu sentido para el Quiz de Reharm se va asentando bien, ¡y este ritmo es el adecuado! El Quiz de Acordes desarrolla tu capacidad de recordar un acorde al verlo, y las escalas entrenan a tu cuerpo para saber dónde están las melodías en el diapasón.\n\nEstas áreas mejoran seguro aunque las refuerces solo un poco cada día, ¡así que adelante!',
        ],
      },
      low_low_low: {
        common: [
          'Las tres estuvieron duras hoy, ¿verdad? El Quiz de Acordes desarrolla el recuerdo instantáneo de acordes, las escalas enseñan dónde están las líneas melódicas en el diapasón, y el Quiz de Reharm tu sentido para tejer acordes en progresiones naturales. Si acabas de subir de nivel, es natural que todo se sienta extraño, y si sigue pesando así, puede que este nivel todavía no sea el adecuado.\n\nNinguna de las dos cosas es mala. Solo es señal de que hace falta un poco más de práctica.',
          'Parece que hoy las tres estuvieron especialmente difíciles. El Quiz de Acordes desarrolla el recuerdo rápido para tocar progresiones de verdad, las escalas tu sentido para encontrar la melodía, y el Quiz de Reharm tu comprensión de cómo se relacionan los acordes.\n\nSi acabas de llegar a este nivel, puede que aún te estés adaptando, y si sigue así, puede que la dificultad sea un poco alta por ahora. En cualquier caso, no significa que te falte algo. Solo significa que es momento de repetir más.',
          'Parece que hoy fue difícil en general. El Quiz de Acordes desarrolla el recuerdo rápido que mantiene fluido el acompañamiento, las escalas son el trampolín para melodías y solos más adelante, y el Quiz de Reharm tu sentido para leer cómo fluye una canción.\n\nSi acabas de subir, esto es parte natural del proceso, y si pesa cada vez, puede que este nivel sea un poco pronto. En cualquier caso, ahora es simplemente momento de dejar que la práctica se acumule.',
        ],
        unboxing: [
          'Parece que hoy las tres estuvieron duras. El Quiz de Acordes desarrolla el recuerdo instantáneo de acordes, las escalas enseñan dónde están las líneas melódicas en el diapasón, y el Quiz de Reharm tu sentido para tejer acordes en progresiones naturales.\n\nAl principio todo se siente extraño, ¡así que un poco de repetición diaria marcará una diferencia real!',
          'Parece que hoy fue especialmente difícil en general. Quiz de Acordes, escalas y Quiz de Reharm son extraños al principio, pero con un poco de repetición diaria se asientan solos en tus manos.\n\nSin presión. ¡Solo sigue intentándolos de uno en uno, como ahora!',
        ],
      },
    },
    POOLS: {
      ALL_HIGH: [
        'Las tres casi perfectas. ¡Ya puedes subir al siguiente nivel!',
        'Acordes, escalas, reharm: todo dominado. Hoy tu forma de tocar subió un escalón.',
        'Ni un hueco. ¿Te animas con algo un poco más difícil?',
        '¡Puntajes altos en todo! Tus manos se acuerdan. Nos vemos en el siguiente nivel.',
        'La práctica de hoy fue simplemente excelente. Te iría muy bien con más dificultad.',
      ],
      ALL_MID: [
        'Estable en general. Un poco más de repetición y se te queda de verdad.',
        'Tu base está pareja. Con este ritmo vas a mejorar rápido.',
        'Te fue bien en todo, sin tropiezos fuertes. ¿Mismo ritmo mañana?',
        'Todavía no es perfecto, pero vas justo en la dirección correcta. La respuesta es repetir.',
        'Acertaste más de la mitad en todo. Solo repasa lo que se te complicó.',
      ],
      ALL_LOW: [
        'Hoy estuvo difícil, ¿no? Todo el mundo empieza así. Inténtalo otra vez y te resultará mucho más familiar.',
        'En la guitarra, a las manos les toma tiempo recordar. Repasa con calma lo que fallaste hoy.',
        'No pasa nada: empezar siempre es lo más difícil. Con solo repasar tus fallos cambia mucho.',
        'Más que el puntaje, importa que hoy te sentaste a practicar. ¡Nos vemos mañana!',
        'Es normal que todavía se sienta raro. Sin prisa: empieza por repasar lo que fallaste.',
      ],
      TWO_HIGH: [
        '¡Dos ya las tienes! Refuerza un poco {weak} y queda completo.',
        'Ya casi. Solo repasa lo que se te complicó en {weak}.',
        'Excelente en casi todo. {weak} es el único punto flojo, así que enfócate ahí.',
        'Se nota que mejoraste. Refuerza {weak} y lo tienes todo cubierto.',
        '{weak} te frenó un poco, ¡pero lo demás estuvo perfecto!',
      ],
      ONE_HIGH: [
        '¡Se te da muy bien {strong}! Lleva esa sensación a lo demás.',
        '{strong} es un punto fuerte claro. Repite {weak} de la misma forma y subirá rápido.',
        'Ya hiciste tuyo {strong}. Lo que sigue: {weak}.',
        'Vas muy bien en {strong}. Parece que {weak} necesita un poco más de tiempo.',
        '¡Tu puntaje en {strong} destaca! Cuando {weak} se ponga al día, quedará equilibrado.',
      ],
      ONE_LOW: [
        'Nada mal en general. Parece que {weak} fue lo más difícil.',
        '{weak} te complicó bastante. Usa Repasar fallos para ver solo esa parte.',
        'Lo demás estuvo bien. {weak} todavía no está en tus manos, así que necesita repetición.',
        '{weak} es el punto flojo de hoy. Domínalo y vas a dar un salto.',
        'Seguiste casi todo, pero {weak} se quedó corto. Sin prisa: inténtalo de nuevo.',
      ],
      MIXED: [
        'Hay puntos fuertes y puntos flojos. Empieza por {weak} y avanza paso a paso.',
        'Todavía un poco disparejo. Mantén {strong} y dedícale más tiempo a {weak}.',
        'La siguiente meta es subir todo de forma pareja. Por hoy, con repasar {weak} es suficiente.',
        'Hay diferencia entre áreas. Refuerza {weak} y todo sube junto.',
        '{strong} está estable. {weak} necesita un poco más de tiempo para volverse familiar.',
      ],
    },
    DOWNGRADE_SUFFIX: ' Si se siente demasiado difícil, está bien bajar un nivel y empezar de nuevo.',
  };
})();
