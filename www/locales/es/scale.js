// 스페인어 사전 — 스케일 훈련(scale-training / scale-level / scale-data): 레벨 화면, 암기 테스트, "?" 미니 강의
(() => {
  // 스케일·폼 이름 — 스페인어는 어순이 달라(명사 먼저) 낱말 단위가 아니라 구 단위로 옮긴다.
  //   "메이저 펜타토닉 스케일 A폼" → "Escala Pentatónica Mayor, forma A"
  //   "C메이저 스케일"            → "Escala Mayor de C"
  const NAME = {
    '메이저': 'Mayor', '마이너': 'Menor', '펜타토닉': 'Pentatónica', '블루스': 'de Blues',
    '메이저 펜타토닉': 'Pentatónica Mayor', '메이저 블루스': 'de Blues Mayor',
    '마이너 펜타토닉': 'Pentatónica Menor', '마이너 블루스': 'de Blues Menor',
    '내추럴 마이너': 'Menor Natural', '하모닉 마이너': 'Menor Armónica', '멜로딕 마이너': 'Menor Melódica',
    '아이오니안': 'Jónica', '도리안': 'Dórica', '프리지안': 'Frigia', '리디안': 'Lidia',
    '믹솔리디안': 'Mixolidia', '에올리안': 'Eolia', '로크리안': 'Locria', '얼터드': 'Alterada',
    '프리지안 도미넌트': 'Frigia Dominante', '리디안 도미넌트': 'Lidia Dominante',
    '믹솔리디안 b9 b13': 'Mixolidia b9 b13', '믹솔리디안 9 b13': 'Mixolidia 9 b13',
    '믹솔리디안 b13': 'Mixolidia b13',
    '로크리안 내추럴2': 'Locria Natural 2', '로크리안 내추럴6': 'Locria Natural 6',
  };
  // 문자열을 [근음, 이름 구, '스케일' 여부, 폼]으로 쪼갠다. 표에 없는 구가 끼면 null.
  function parse(s) {
    const tok = s.split(' ');
    let form = null, root = null, hasScale = false, m;
    const last = tok[tok.length - 1];
    if ((m = /^([A-G][#b]?m?)폼$/.exec(last)) || (m = /^(\d+)번폼$/.exec(last))) { form = m[1]; tok.pop(); }
    if (tok[tok.length - 1] === '스케일') { hasScale = true; tok.pop(); }
    if (tok.length && /^[A-G][#b]?m?$/.test(tok[0])) root = tok.shift();           // "A 하모닉 마이너"
    else if (tok.length && (m = /^([A-G][#b]?)(.+)$/.exec(tok[0])) && NAME[[m[2]].concat(tok.slice(1)).join(' ')]) {
      root = m[1]; tok[0] = m[2];                                                   // "C메이저"
    }
    const phrase = tok.join(' ');
    if (phrase && !NAME[phrase]) return null;
    if (!phrase && !form) return null;
    return { root, name: phrase ? NAME[phrase] : '', hasScale, form };
  }
  function build(p) {
    let out = p.name;
    if (p.hasScale) out = 'Escala ' + out;
    else if (out.startsWith('de ')) out = out.slice(3);                              // "Blues Menor" (Escala 없이)
    if (p.root) out += ' de ' + p.root;
    if (p.form) out += (out ? ', forma ' : 'forma ') + p.form;
    return out;
  }
  const scaleName = m => build(parse(m[0]));
  const SCALE_RE = { exec(s) { return parse(s) ? [s] : null; } };

  const KEYQ = { '메이저': 'mayor', '하모닉 마이너': 'menor armónica', '내추럴 마이너': 'menor natural' };

  I18N.add('es', {
    exact: {
      'Chorditor - 스케일 훈련': 'Chorditor - Bloques de Escalas',

      // ── 스케일 훈련 목록 ──
      '기초 스케일 연습': 'Práctica de escalas básicas',
      '세컨더리 도미넌트 활용': 'Uso de dominantes secundarias',
      '모드 스케일': 'Modos',
      '고급 스케일': 'Escalas avanzadas',
      '스케일 훈련이 처음이시네요!': '¿Primera vez en Bloques de Escalas?',
      '연습을 시작할까요?': '¿Empezamos a practicar?',
      '피크': 'Púas',

      // ── 레벨 화면 ──
      '음이름 표시 (누르면 도수)': 'Mostrando notas (toca para ver grados)',
      '도수 표시 (누르면 미표시)': 'Mostrando grados (toca para ocultar)',
      '라벨 미표시 (누르면 음이름)': 'Etiquetas ocultas (toca para ver notas)',
      '렛링(울림 유지)': 'Let ring (dejar sonar)',
      '기타 버튼': 'Botón de guitarra',
      '직접 연주해보기': 'Tócala tú',
      '음표 버튼': 'Botón de nota',
      '스케일 들어보기': 'Escuchar la escala',
      '스타일': 'Estilo',
      '팝': 'Pop',
      '기본': 'Básico',
      '선택한 블럭 암기하기': 'Memorizar el bloque elegido',

      // ── 암기 테스트 ──
      '완벽해요!': '¡Perfecto!',
      '정확해요!': '¡Exacto!',
      '맞았어요! 잘하고 있어요.': '¡Correcto! Vas muy bien.',
      '거의 다 왔어요!': '¡Ya casi!',
      '아쉬워요...! 다시 도전해보세요!': '¡Por poco...! ¡Inténtalo de nuevo!',
      '조금 더 연습해보아요!': '¡Practiquemos un poco más!',
      '다시 풀기': 'Reintentar',
      '전환해보세요!': '',
      '암기 테스트를 그만두시겠어요?': '¿Salir de la prueba de memoria?',
      '지금 나가면 푸는 중이던 테스트는 사라져요.': 'Si sales ahora, se pierde la prueba que estabas haciendo.',
      '언제든지 다시 도전할 수 있어요!': '¡Puedes volver a intentarlo cuando quieras!',
      '지금 나가면 푸는 중이던 테스트는 사라져요. 언제든지 다시 도전할 수 있어요!':
        'Si sales ahora, se pierde la prueba que estabas haciendo.\n¡Puedes volver a intentarlo cuando quieras!',
      '지금 나가면 튜토리얼을': 'Si sales ahora, tendrás que',
      '처음부터 다시 봐야 해요.': 'ver el tutorial desde el principio.',
      '지금 나가면 튜토리얼을 처음부터 다시 봐야 해요.': 'Si sales ahora, tendrás que ver el tutorial desde el principio.',

      // ── 챕터 2 레벨 이름 ──
      '4도 메이저 전환': 'Cambio a IV (mayor)',
      '5도 메이저 전환': 'Cambio a V (mayor)',
      '6도 마이너 전환': 'Cambio a vi (menor)',
      '2도 마이너 전환': 'Cambio a ii (menor)',
      '3도 마이너 전환': 'Cambio a iii (menor)',
      '도레미파솔라시': 'Do Re Mi Fa Sol La Si',

      // ── "?" 미니 강의: 도입 ──
      '거의 모든 멜로디의 뼈대가 되는 중요한 스케일이에요.': 'Es una escala importante:\nla base de casi todas las melodías.',
      '가요, 팝, 록, J-pop 같은 대중음악 멜로디의 뼈대가 되는 스케일이에요.':
        'Es la base de las melodías\ndel pop, el rock y casi toda la música popular.',
      '구성음은 다음과 같아요!': '¡Estas son sus notas!',
      '직접 들어볼까요?': '¡Vamos a escucharla!',

      // 챕터 3 도입
      '챕터3에서는 모드 스케일에 대한 개념을 배울거예요.': 'En el Capítulo 3 vas a aprender\nqué son los modos.',
      "모드란, 쉽게 말하자면 '특색 있는 분위기'를 표현해주는 도구라고 생각하면 돼요.":
        'Dicho simple, un modo es una herramienta\npara crear un ambiente con carácter.',
      '이번 챕터에서 여러가지 모드들을 배워보도록 할게요!': '¡En este capítulo vamos a ver\nvarios modos distintos!',
      "그 첫번째는 '아이오니안 스케일'이에요.": 'El primero es\nla escala jónica.',

      // 모드별 감상
      '도리안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color dórico?',
      '일반적으로는 신비로움 또는 웅장하고 영웅적인 분위기, 중세 유럽같은 느낌을 낸다고 평가를 많이 해요.':
        'Se suele describir como misterioso,\no grandioso y heroico,\ncon aire de Europa medieval.',
      '프리지안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color frigio?',
      '일반적으로는 어둡고 강렬한 긴장감 있는 분위기, 스페인 플라멩고 같은 느낌을 낸다고 평가를 많이 해요.':
        'Se suele describir como oscuro, intenso y tenso,\ncon aire de flamenco.',
      '리디안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color lidio?',
      '신비로운 미지의 세계, 초현실적인 경험에 대한 설렘을 느끼게 해요.':
        'Se siente como un mundo misterioso y desconocido,\nla emoción de algo surreal.',
      '디즈니, SF영화, 어드벤처 장르의 배경음악으로 많이 들을 수 있어요.':
        'Se escucha mucho en música de Disney,\nciencia ficción y aventuras.',
      '믹솔리디안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color mixolidio?',
      '호쾌하고 털털한 분위기를 느끼게 해요.': 'Tiene un aire audaz\ny relajado.',
      '영미권의 락 음악에서 많이 들을 수 있어요.': 'Se escucha mucho\nen el rock clásico.',
      '에올리안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color eolio?',
      "사실 에올리안은 '내추럴 마이너'의 다른 이름이에요.": 'En realidad, eolio es\notro nombre de la menor natural.',
      '슬프고 서정적인 음악을 할 때 제일 많이 쓰이는 무난한 음계예요.':
        'Es la escala de cabecera\npara la música triste y lírica.',
      '로크리안의 색채는 어떻게 느껴졌나요?': '¿Cómo sentiste\nel color locrio?',
      '기괴함과 공포, 극도의 불안감을 자아내는 분위기예요.': 'Suena inquietante y aterrador,\nlleno de desasosiego.',
      '대중음악보다는 영화음악처럼 목적이 있는 곳에 많이 쓰여요.':
        'Se usa menos en el pop\ny más en música de cine, donde hay un propósito claro.',

      // 기초 스케일 설명
      '기타에서는 음이름을 알파벳으로 많이 표기해요. 그 음의 순서를 숫자로도 나타낼 수 있어요.':
        'En guitarra, las notas suelen escribirse con letras.\nSu orden también se puede mostrar con números.',
      '앞으로는 음이름과 숫자(도수)를 사용할게요. 기타에서는 두 방식이 주로 쓰여요.':
        'De aquí en adelante usaremos letras y números (grados).\nSon los dos sistemas principales en guitarra.',
      '메이저 스케일에서 4도와 7도를 빼면 메이저 펜타토닉이 돼요.':
        'Quita la 4ª y la 7ª de la escala mayor\ny obtienes la pentatónica mayor.',
      '음이 5개뿐이라 어느 음을 눌러도 어색하지 않아서 연습하기 좋아요.':
        'Con solo 5 notas, nada suena mal,\nasí que es ideal para practicar.',
      "메이저 펜타토닉에 한 음을 더하면 '메이저 블루스 스케일'이 돼요.":
        'Agrega una nota a la pentatónica mayor\ny obtienes la escala de blues mayor.',
      "이렇게 추가된 음(b3)을 '블루스 노트'라고 불러요.": 'Esa nota añadida (b3)\nse llama "blue note".',
      '블루스 노트의 엇나간 멜로디가 느낌있는 멜로디 진행을 만들어요!':
        'El sonido algo "fuera" de la blue note\nles da a las melodías ese sabor especial.',
      '5가지 블럭에서 블루스 노트는 색깔로 표시했어요!': 'En los 5 bloques, las blue notes\nestán marcadas con color.',
      '그런데, 왜 C로 시작하지 않은 걸까요?': 'Pero ¿por qué no empieza en C?',
      '그건 단순히 A로 시작하는게 더 쉽기 때문이에요!': '¡Simplemente porque empezar en A es más fácil!',
      "나중에 '마이너 스케일'을 배울 때 자세히 알려드릴게요!": 'Te lo explicamos mejor\ncuando llegues a la escala menor.',
      "마이너 펜타토닉에 한 음을 더하면 '블루스 스케일'이 돼요.":
        'Agrega una nota a la pentatónica menor\ny obtienes la escala de blues.',
      "이렇게 추가된 음을 '블루스 노트'라고 불러요.": 'Esa nota añadida\nse llama "blue note".',
      'Am 마이너 스케일은 사실 C메이저 스케일과 구성음이 같아요!':
        '¡La escala de A menor tiene en realidad\nlas mismas notas que la escala de C mayor!',
      "이렇게 구성음이 같은 관계를 '나란한조'라고 불러요.": 'Las tonalidades que comparten notas así\nse llaman "tonalidades relativas".',
      'C를 근음으로 마이너 스케일을 만들면 3도·6도·7도가 반음씩 내려가요.':
        'Si construyes una escala menor sobre C,\nla 3ª, la 6ª y la 7ª bajan medio tono.',
      '대부분의 노래는 메이저 곡과 마이너 곡으로 나뉘어요.': 'Casi todas las canciones están\nen tonalidad mayor o menor.',
      '발라드, 트로트, 슬로우 락 같은 장르에서 많이 쓰인답니다!': '¡Se escucha mucho\nen baladas y slow rock!',
      '내추럴 마이너의 b7음을 7로 올리면 하모닉 마이너가 돼요!':
        'Sube la b7 de la menor natural a 7\ny obtienes la menor armónica.',
      '이 반음 하나 때문에 아랍이나 인도 느낌의 신비로운 소리가 나요.':
        'Ese solo medio tono le da\nun sonido misterioso, de aire árabe o indio.',
      "나중에 배울 '세컨더리 도미넌트'라는 테크닉에서 꼭 필요한 스케일이에요!":
        'Es clave para una técnica que verás más adelante:\nlas dominantes secundarias.',
      '사실 우리가 아는 메이저 스케일이랑 똑같아요!': '¡En realidad es igual a\nla escala mayor que ya conoces!',
      "앞으로 다른 모드스케일의 느낌을 '미뉴엣'으로 비교해볼거예요. 아이오니안 스케일은 우리가 잘 아는 멜로디예요.":
        'De aquí en adelante compararemos cómo se siente cada modo\nusando el Minueto.\nLa escala jónica es la melodía que ya conoces.',

      // 챕터 4 파생 설명
      "이 스케일은 사실 '하모닉 마이너 스케일'에서 나왔어요.": 'Esta escala en realidad viene de\nla escala menor armónica.',
      "이 스케일은 사실 '멜로딕 마이너 스케일'에서 나왔어요.": 'Esta escala en realidad viene de\nla escala menor melódica.',
      '정확히는 하모닉 마이너의 5번째 모드예요.': 'Para ser exactos, es el 5º modo\nde la menor armónica.',
      '정확히는 하모닉 마이너의 2번째 모드예요.': 'Para ser exactos, es el 2º modo\nde la menor armónica.',
      '정확히는 멜로딕 마이너의 7번째 모드예요.': 'Para ser exactos, es el 7º modo\nde la menor melódica.',
      '정확히는 멜로딕 마이너의 4번째 모드예요.': 'Para ser exactos, es el 4º modo\nde la menor melódica.',
      '정확히는 멜로딕 마이너의 5번째 모드예요.': 'Para ser exactos, es el 5º modo\nde la menor melódica.',
      '정확히는 멜로딕 마이너의 6번째 모드예요.': 'Para ser exactos, es el 6º modo\nde la menor melódica.',
      '멜로딕 마이너는 재즈에서 아주 중요한 스케일이에요.': 'La menor melódica es\nuna escala muy importante en el jazz.',
      '이후 배울 여러 스케일들이 사실 이 스케일에서 파생돼요.': 'Muchas de las escalas que vienen\nen realidad derivan de ella.',

      // 스케일 블럭 개념
      '기타는 피아노와 달리 음이 잘 보이지 않죠?': 'A diferencia del piano, en la guitarra cuesta ver las notas, ¿verdad?',
      "그래서 기타에는 '스케일 블럭'이라는 개념이 존재해요!": 'Por eso en guitarra existe\nla idea de los "bloques de escala".',
      '대표적으로 5개의 스케일 블럭을 알고 있어야, 원하는 연주를 할 수 있을 거예요!':
        'Conviene conocer los 5 bloques principales\npara tocar lo que tienes en mente.',
      '좌우로 넘겨서 5가지 폼을 확인해보세요! 점들을 클릭해서 소리도 들어보세요!':
        '¡Desliza a los lados para ver las 5 formas!\nToca los puntos para escucharlas.',
      "각 모드는 그 모드만의 '특징음'을 가지고 있어요.": 'Cada modo tiene su propia\n"nota característica".',
      '특징음은 그 모드의 분위기를 가장 잘 보여주는 음이에요.': 'Es la nota que mejor muestra\nel ambiente de ese modo.',
      '아이오니안의 특징음은 4번째 음(4도)이에요.': 'La nota característica del jónico\nes la 4ª.',
      '노래를 틀어놓고, 이 스케일을 아무렇게 연주해보면서 감을 키워보는 연습을 해보세요!':
        'Pon una canción y juega libremente con esta escala\npara ir agarrándole el feeling.',

      // 챕터 4 용도 설명
      '마이너 코드로 해결되는 세컨더리 도미넌트에서 정석적으로 활용되는 스케일이에요.':
        'Es la escala estándar sobre dominantes secundarias\nque resuelven a un acorde menor.',
      '대중음악에서도 아주 널리 쓰여서 익혀두면 정말 유용한 스케일이에요.':
        'También se usa muchísimo en música popular,\nasí que vale la pena aprenderla.',
      '마이너 코드에서, 특히 재즈적인 색채를 낼 때 많이 사용돼요.':
        'Se usa sobre acordes menores,\nsobre todo para un color jazzero.',
      '이후 나올 파생 스케일들의 기초가 되니 잘 익혀두세요!':
        'Es la base de las escalas derivadas que vienen,\n¡así que apréndela bien!',
      '얼터드 도미넌트(7alt) 코드 위에서 주로 쓰이는 대표적인 재즈 스케일이에요.':
        'Es una escala clásica del jazz,\nque se usa sobre acordes dominantes alterados (7alt).',
      '모든 텐션(b9,#9,#11,b13)이 들어있어서 다음 마이너 코드로 강하게 해결돼요.':
        'Contiene todas las tensiones alteradas (b9, #9, #11, b13),\nasí que resuelve con fuerza al siguiente acorde menor.',
      '마이너 키의 ii-V-i에서 m7(b5) 코드 위에 쓰여요.': 'Se usa sobre el acorde m7(b5)\nen un ii-V-i menor.',
      '일반 로크리안보다 조금 더 부드러운 느낌을 줘요.': 'Suena un poco más suave\nque el locrio normal.',
      '도미넌트7(#11) 코드 위에서 주로 쓰여요.': 'Se usa sobre todo sobre\nacordes dominantes 7(#11).',
      '리디안처럼 밝으면서도 블루지한 느낌을 더해줘요.': 'Es brillante como el lidio,\ncon un toque blusero.',
      '도미넌트7(b13) 코드 위에서 주로 쓰여요.': 'Se usa sobre todo sobre\nacordes dominantes 7(b13).',
      '믹솔리디안보다 살짝 어두운 느낌을 줘요.': 'Suena un poco más oscura\nque el mixolidio.',
      '메이저 키의 ii-V-i에서 m7(b5) 코드 위에 주로 쓰여요.': 'Se usa sobre todo sobre el acorde m7(b5)\nen un ii-V-i mayor.',
      "'하프디미니시드 스케일'이라는 다른 이름으로도 불려요.": 'También se conoce como\nla escala semidisminuida.',
      '수고하셨어요! 스케일 블럭의 기본 개념을 배웠어요! 이제 자유롭게 연습해보세요!':
        '¡Buen trabajo! Ya conoces\nlo básico de los bloques de escala.\n¡Ahora practica con libertad!',

      // 챕터 2(스케일 전환)
      "챕터2에서는 '스케일 전환'을 알아볼게요!": 'En el Capítulo 2 veremos\nel "cambio de escala".',
      '패밀리코드라는 개념을 알고 있어야 이해할 수 있을거예요.': 'Se entiende mejor\nsi ya sabes qué son los acordes diatónicos.',
      "코드를 진행하다보면 패밀리코드가 아닌 '7'코드가 종종 등장해요.":
        'En las progresiones a veces aparece\nun acorde "7" que no es diatónico.',
      "그 '7'코드 뒤에 나오는 패밀리코드에 따라 사용할 스케일이 달라져요!":
        'La escala que usas depende de\nqué acorde diatónico viene después de ese "7".',
      "레벨8에서는 4도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배울거예요.":
        'En el Nivel 8 aprenderás la escala para\nun acorde "7" que lleva al IV.',
      '처음엔 개념이 조금 어려울 수 있어요. 보통은 바뀌는 음에 익숙해지는 방법이 있어요.':
        'Al principio puede costar un poco.\nUna forma común es acostumbrarte a las notas que cambian.',
      '그리고 바뀐 후의 스케일블럭을 보면, F메이저 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Y si miras el bloque después del cambio,\n¡verás que es igual a la escala de F mayor!',
      '각자 받아들이기 편한 방법을 찾아서 숙달해보세요!': 'Encuentra la forma que mejor te funcione\ny domínala.',
      "이번엔 5도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        'Esta vez veremos la escala para\nun acorde "7" que lleva al V.',
      '바뀐 후의 스케일블럭을 보면, G메이저 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Mira el bloque después del cambio:\n¡es igual a la escala de G mayor!',
      '마찬가지로, 바뀌는 음에 익숙해지는 연습을 해보세요!': 'Igual que antes: practica hasta acostumbrarte\na las notas que cambian.',
      "이번엔 6도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        'Esta vez veremos la escala para\nun acorde "7" que lleva al vi.',
      "이번엔 메이저가 아니라 '마이너'로 전환됐어요!": '¡Esta vez el cambio fue a menor,\nno a mayor!',
      '바뀐 후의 스케일블럭을 보면, A 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Mira el bloque después del cambio:\n¡es igual a la escala de A menor armónica!',
      "이번엔 2도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        'Esta vez veremos la escala para\nun acorde "7" que lleva al ii.',
      "이번에도 메이저가 아니라 '마이너'로 전환돼요!": '¡Otra vez el cambio es a menor,\nno a mayor!',
      '바뀐 후의 스케일블럭을 보면, D 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Mira el bloque después del cambio:\n¡es igual a la escala de D menor armónica!',
      "이번엔 3도로 이어지는 '7'코드에 쓸 수 있는 스케일을 배워볼게요.":
        'Esta vez veremos la escala para\nun acorde "7" que lleva al iii.',
      '바뀐 후의 스케일블럭을 보면, E 하모닉 마이너 스케일이랑 똑같다는 걸 알 수 있어요!':
        'Mira el bloque después del cambio:\n¡es igual a la escala de E menor armónica!',
      '이걸로 챕터2의 5가지 전환을 모두 배웠어요!': '¡Con esto ya viste los 5 cambios\ndel Capítulo 2!',
    },

    scoped: [
      ['#test-note-grid', { '도': 'Do', '레': 'Re', '미': 'Mi', '파': 'Fa', '솔': 'Sol', '라': 'La', '시': 'Si' }],
    ],

    patterns: [
      // "?" 미니 강의 — 스케일 이름이 끼어드는 문구
      [/^이번 시간에는 '(.+)'을 배워볼게요!$/, '¡Esta vez vamos a aprender: {1}!'],
      [/^(.+)은 우리에게 익숙한 '(.+)' 음계를 의미해요\.$/, '{1}: es la conocida escala\n"{2}".'],
      [/^(.+)은 '(.+)'로 이루어져요\.$/, '{1}: está formada por\n"{2}".'],
      [/^도수로 표현한다면 (.+) 가 돼요!$/, '¡En grados, eso es {1}!'],
      [/^(.+)의 특징음은 (.+) 음이에요\.$/, '{1}: su nota característica\nes la {2}.'],
      [/^(.+)의 색을 입힌 미뉴엣은 어떤 느낌일 지 들어봅시다!$/, 'Escuchemos cómo suena el Minueto con este color: {1}.'],
      [/^아래의 블럭은 (.+)이라고 할게요\. (.+)코드 모양과 닮았기 때문이에요\.$/,
        'Al bloque de abajo lo llamaremos {1}.\nEs porque se parece a la forma del acorde {2}.'],
      [/^(.+)의 5가지 블럭은 아래와 같아요\.$/, '{1}:\nestos son sus 5 bloques.'],
      [/^특징음을 중심으로 연습해서 (.+)에 익숙해져보세요!$/, 'Practica alrededor de la nota característica\npara familiarizarte: {1}.'],
      [/^수고하셨어요! (.+) 튜토리얼을 완료할게요!$/, '¡Buen trabajo! Aquí termina\nel tutorial: {1}.'],
      [/^수고하셨어요! '(.+)'을 배웠어요\. 자유롭게 연습해보세요!$/, '¡Buen trabajo! Ya aprendiste:\n{1}. ¡Ahora practica con libertad!'],
      [/^수고하셨어요! (.+)는 여기서 마칠게요!$/, '¡Buen trabajo! Hasta aquí:\n{1}.'],

      // 암기 테스트 지문(줄마다 한 조각)
      [/^([A-G][#b]?) ?(메이저|하모닉 마이너|내추럴 마이너) (\S+)에서$/,
        m => 'Desde ' + m[1] + ' ' + KEYQ[m[2]] + ', ' + I18N.t(m[3]) + ','],
      [/^([A-G][#b]?) ?(메이저|하모닉 마이너|내추럴 마이너) (\S+)으로(?: 전환해보세요!)?$/,
        m => '¡cambia a ' + m[1] + ' ' + KEYQ[m[2]] + ', ' + I18N.t(m[3]) + '!'],
      [/^([A-G][#b]?) (.+)의$/, 'En {1} {2},'],
      [/^(\S+폼)을 입력해주세요!$/, '¡completa la {1}!'],

      // 스케일·폼 이름(구 단위) — 다른 패턴보다 뒤에 둘 것
      [/^(.+) 스케일$/, m => { const r = SCALE_RE.exec(m[0]); return r ? scaleName(r) : 'Escala ' + I18N.t(m[1]); }],
      [SCALE_RE, scaleName],
    ],
  });
})();
