// 스페인어 사전 — 퀘스트체인 튜토리얼(tutorial.js / tutorial-steps.js)과 튜토리얼 모달 본문(tutorial-content.js)
// 스텝 문구는 tutorial.js _fillSteps가 {S} 토큰을 채우기 전에 번역하므로 {S}·{S:key}를 그대로 둔다.
// 원문의 줄바꿈(\n)은 열쇠에서 공백 하나로 적는다.
I18N.add('es', {
  exact: {
    // ── 공통 ──
    '← 프렛 번호': '← Número de traste',
    '이어서 할래요!': '¡Seguir!',
    '잠김': 'Bloqueado',
    '다시 보기': 'Ver otra vez',
    '시작': 'Empezar',
    '튜토리얼을 그만두시겠어요?': '¿Salir del tutorial?',
    '지금 나가면 진행 중인 스텝을': 'Si sales ahora, tendrás que',
    '처음부터 다시 해야 해요.': 'empezar este paso de nuevo.',
    '지금 나가면 진행 중인 스텝을 처음부터 다시 해야 해요.': 'Si sales ahora, tendrás que empezar este paso de nuevo.',
    '튜토리얼을 모두 마쳤어요.': 'Terminaste todo el tutorial.',
    '가사 복사하기': 'Copiar letra',

    // ── 스텝 제목 ──
    '{S} | 코드 에디터': '{S} | Editor de Acordes',
    '{S} | 코드 사전': '{S} | Diccionario de Acordes',
    '{S} | 노트': '{S} | Canciones',
    '{S} | 노트 더 알아보기': '{S} | Más sobre Canciones',
    '{S} | 훈련소': '{S} | Sala de Ensayo',
    '{S} 완료': '{S} completo',
    '줄': 'Cuerdas',
    '개방현': 'Cuerdas al aire',
    '뮤트': 'Mute',
    '개방현 · 뮤트 바꾸기': 'Cambiar entre al aire y mute',
    '코드 만들기': 'Crear un acorde',
    '소리 듣기': 'Escucharlo',
    '바레': 'Cejilla',
    '# / b 바꾸기': 'Cambiar # / b',
    '프렛 번호': 'Número de traste',
    '코드 이름 바꾸기': 'Cambiar el nombre del acorde',
    '노트에 담기': 'Guardar en una canción',
    '근음 고르기': 'Elegir la raíz',
    '코드 고르기': 'Elegir un acorde',
    '잡는 법 고르기': 'Elegir la digitación',
    '검색으로 찾기': 'Buscar',
    '표기 바꾸기': 'Cambiar la notación',
    '에디터로 가져가기': 'Llevar al Editor',
    '노트 만들기': 'Crear una canción',
    '노트 더 알아보기': 'Más sobre Canciones',
    '편집 시작': 'Empezar a editar',
    '코드 팔레트': 'Paleta de acordes',
    '코드 담기': 'Añadir un acorde',
    '직접 만들기': 'Crear el tuyo',
    'C 코드 담기': 'Añadir un acorde C',
    '가사 쓰기': 'Escribir la letra',
    '붙여넣기': 'Pegar',
    '줄 지우기': 'Borrar una línea',
    '코드 놓기': 'Colocar un acorde',
    '전체 재생': 'Reproducir todo',
    '코드 칸과 마디': 'Casillas y compases',
    '줄 복사': 'Copiar una línea',
    '마디 수정': 'Editar compases',
    '되돌리기': 'Deshacer',
    '화면 방향': 'Orientación de pantalla',
    '뷰 모드': 'Modo de vista',
    '노트 목록': 'Lista de canciones',
    '노트 분류': 'Ordenar canciones',
    '무료 플랜': 'Plan gratis',
    '중요로 지정': 'Marcar como Importante',
    '피크상자': 'Cajita de Púas',

    // ── 완료 모달 ──
    '코드 에디터를 다 둘러봤어요.': 'Ya recorriste el Editor de Acordes.',
    '코드 사전을 다 둘러봤어요.': 'Ya recorriste el Diccionario de Acordes.',
    '노트를 만들어 곡 한 줄을 완성했어요.': 'Creaste una canción y completaste una línea.',
    '노트를 자유롭게 다룰 수 있게 됐어요.': 'Ya manejas las canciones con soltura.',
    '훈련소를 다 둘러봤어요.': 'Ya recorriste la Sala de Ensayo.',

    // ── 코드 에디터 스텝 ──
    '안녕하세요, 코디터에 오신 것을 환영해요! {S}에서는 코드 에디터 사용법을 배워볼 거예요.':
      '¡Hola, te damos la bienvenida a Chorditor!\nEn {S} vas a aprender a usar el Editor de Acordes.',
    '방금 사전에서 코드를 골라봤죠? {S}에서는 코드를 직접 만들고 바꿔볼 거예요.':
      'Acabas de elegir acordes en el diccionario, ¿verdad?\nEn {S} vas a crear y cambiar acordes tú.',
    '우선, 화면에 보이는 코드 에디터를 눌러 주세요!': 'Primero, toca Editor de Acordes en la pantalla.',
    '이곳은 코드 다이어그램을 편집해서 저장하고 활용해보는 곳이에요.':
      'Aquí editas diagramas de acordes,\nlos guardas y los usas.',
    '화면에 보이는 코드는 A 코드로 설명할게요.': 'Usaremos el acorde A de la pantalla para explicar.',
    '가로선은 기타 줄이에요. 가장 얇은 줄이 1번, 가장 두꺼운 줄이 6번이에요.':
      'Las líneas horizontales son las cuerdas.\nLa más delgada es la 1ª y la más gruesa es la 6ª.',
    '세로선은 프렛이에요. 몇 번째 칸인지 세는 거라고 보면 돼요.':
      'Las líneas verticales son los trastes.\nPiensa que cuentan en qué espacio estás.',
    '○는 개방현이에요. 누르지 않고 그대로 치는, 0프렛이라고 보면 돼요.':
      '○ es una cuerda al aire.\nSe toca sin pisar, como el traste 0.',
    '✕는 뮤트예요. 소리를 내지 않는 줄이에요.': '✕ es mute.\nEsa cuerda no suena.',
    '○와 ✕는 눌러서 서로 바꿀 수 있어요. 지금은 그대로 두고 넘어갈게요!':
      'Toca ○ o ✕ para cambiar entre uno y otro.\nPor ahora los dejamos como están.',
    '그럼 이제 에디터를 직접 만져볼까요? 깜빡이는 자리를 눌러 Am 코드로 바꿔 볼게요!':
      '¿Probamos el editor?\nToca el punto que parpadea para convertirlo en Am.',
    '잘하셨어요! Am 코드를 만들었어요! 에디터를 편집하면 자동으로 코드 이름이 추천돼요.':
      '¡Bien! ¡Hiciste un acorde Am!\nAl editar, el editor sugiere nombres de acordes automáticamente.',
    '코드 편집을 완료했다면, 직접 소리를 들어볼 수 있어요! 재생 버튼을 클릭해 보세요.':
      'Cuando tu acorde esté listo, ¡puedes escucharlo!\nToca el botón de reproducir.',
    '다음 설명을 위해 제가 A# 코드를 만들어 드릴게요.': 'Para lo que sigue, voy a prepararte un acorde A#.',
    '한 손가락으로 여러 줄을 한 번에 누르는 걸 바레라고 해요. 3프렛의 B 버튼을 눌러 보세요.':
      'Pisar varias cuerdas con un solo dedo se llama\ncejilla. Toca el botón B del traste 3.',
    '같은 버튼을 다시 누르면 바레가 풀려요. 한 번 더 눌러 보세요.':
      'Toca el mismo botón otra vez para quitar la cejilla.\nTócalo una vez más.',
    'A# 코드는 1프렛을 바레로 눌러요. 1프렛 B 버튼을 눌러 보세요.':
      'El acorde A# lleva cejilla en el traste 1.\nToca el botón B del traste 1.',
    '같은 코드도 A#과 Bb, 두 가지로 부를 수 있어요. b를 눌러 표기를 바꿔 보세요.':
      'El mismo acorde se puede llamar A# o Bb.\nToca b para cambiar la notación.',
    '잘하셨어요! Bb 코드를 완성했네요!': '¡Bien! ¡Hiciste un acorde Bb!',
    '이번엔 프렛 번호를 조작해볼게요. ▶ 버튼을 두 번 눌러 4로 만들어 주세요!':
      'Ahora cambiemos el número de traste.\nToca ▶ dos veces para que quede en 4.',
    '손 모양은 그대로지만 C 코드를 만들 수 있어요!': 'La misma forma de la mano, ¡pero ahora es un acorde C!',
    '손가락 번호를 표시할 수도 있어요! 버튼을 눌러 켜 보세요.':
      '¡También puedes mostrar los números de dedos!\nToca el botón para activarlos.',
    '검지가 1번, 새끼손가락이 4번이에요. 엄지는 T예요. 2번을 고른 뒤 4번 줄의 점을 눌러 보세요.':
      'El índice es 1, el meñique es 4 y el pulgar es T.\nElige 2 y luego toca el punto de la 4ª cuerda.',
    '이번엔 3번을 고르고 3번 줄의 점을 눌러 보세요.': 'Ahora elige 3 y toca el punto de la 3ª cuerda.',
    '마지막으로 4번을 고르고 2번 줄의 점을 눌러 보세요. 지울 때는 같은 번호로 클릭하면 지울 수 있어요.':
      'Por último, elige 4 y toca el punto de la 2ª cuerda.\nPara quitar un número, tócalo otra vez con el mismo número.',
    '이렇게 만든 코드는 이미지로 저장할 수 있어요. 이미지 아이콘을 클릭해 봐요!':
      'Puedes guardar tu acorde como imagen.\nToca el ícono de imagen.',
    '이곳에선 아래에서 저장될 이미지를 미리 볼 수 있어요.': 'Aquí puedes ver la imagen antes de guardarla.',
    '저장한 이미지는 개인 노트나 자료 제작에 쓰거나, 지인들에게 코드를 알려줄 때도 활용할 수 있겠죠?':
      'Usa las imágenes guardadas en tus apuntes y materiales,\no para mostrarle un acorde a alguien.',
    '코드 이름은 여기서 직접 바꿀 수도 있어요!': '¡Puedes cambiar el nombre del acorde aquí mismo!',
    '추천에 없는 코드나 이름을 직접 정하고 싶을 때 써요. 휠은 코드가 확장되는 순서대로 놓여 있어요.':
      'Úsalo cuando el acorde no aparezca sugerido o quieras tu propio nombre.\nLas ruedas siguen el orden en que se construyen los acordes.',
    '위쪽 휠을 돌려서 코드 이름을 마음껏 바꿔보세요!': '¡Gira las ruedas de arriba y cambia el nombre como quieras!',
    '노트는 나만의 악보집이에요. 코드 진행을 저장해두고 언제든 다시 꺼내 볼 수 있어요.':
      'Canciones es tu cancionero personal.\nGuarda progresiones de acordes y vuelve a ellas cuando quieras.',
    '만든 코드는 노트에 담아 모아둘 수 있어요. "노트 추가" 버튼을 눌러 보세요.':
      'Puedes reunir los acordes que creas en una canción. Toca el botón "Añadir a canción".',
    '여기서 담을 노트를 고르면 돼요. 노트 기능은 나중에 알려드릴게요. 닫기를 눌러 주세요.':
      'Aquí eliges la canción. Veremos las canciones más adelante. Toca Cerrar.',

    // ── 코드 사전 스텝 ──
    '이번엔 코드 사전을 살펴볼게요. 깜빡이는 곳을 눌러 주세요!': 'Ahora veamos el Diccionario de Acordes.\nToca el punto que parpadea.',
    '이곳은 거의 모든 코드를 담은 사전이에요. 직접 하나하나 검수했답니다!':
      'Este diccionario tiene casi todos los acordes.\n¡Cada uno fue revisado a mano!',
    '왼쪽에서 근음을 고르면 오른쪽에 해당 코드들이 나와요. G를 찾아서 눌러 보세요.':
      'Elige una raíz a la izquierda y sus acordes aparecen a la derecha.\nBusca G y tócala.',
    '이렇게 G를 근음으로 하는 코드들이 나와요. 첫 번째 G 코드를 눌러볼까요?':
      'Estos son los acordes construidos sobre G.\nToca el primer acorde G.',
    '같은 G라도 잡는 법이 여러 가지예요. 첫 번째를 눌러 보세요.':
      'Hay varias formas de tocar el mismo G.\nToca la primera.',
    '같은 자리를 잡아도 손가락 번호는 다를 수 있어요. 화살표로 넘겨 보세요.':
      'Incluso en la misma posición, la digitación puede variar.\nUsa las flechas para verlas.',
    '여기서도 소리를 듣고 이미지로 저장할 수 있어요. 지금은 재생 버튼만 눌러볼까요?':
      'Aquí también puedes escuchar y guardar imágenes.\nPor ahora, solo toca el botón de reproducir.',
    '찾는 코드가 있으면 검색이 더 빨라요. G7을 입력하고 확인을 눌러 보세요.':
      'Si ya sabes qué acorde quieres, buscar es más rápido.\nEscribe G7 y confirma.',
    '이렇게 G7과 관련된 코드들이 모여서 나와요. 첫 번째를 눌러볼까요?':
      'Los acordes relacionados con G7 aparecen juntos.\nToca el primero.',
    '고른 코드는 바로 위에서 확인할 수 있어요. #/b 표기와 손가락 번호도 바꿀 수 있답니다.':
      'El acorde elegido se muestra justo arriba.\nTambién puedes cambiar la notación #/b y los números de dedos.',
    '고른 코드를 에디터로 가져가 편집할 수 있어요. {S:editor}에서 배운 그 에디터예요.':
      'Puedes llevar el acorde al Editor para editarlo.\nEs el mismo Editor de {S:editor}.',
    '고른 코드를 에디터로 가져가 편집할 수 있어요. 에디터는 다음 스텝에서 배워볼게요!':
      'Puedes llevar el acorde al Editor para editarlo.\n¡Verás el Editor en el siguiente paso!',
    '마음에 드는 코드는 노트에 담아둘 수 있어요. {S:editor}에서 배운 것과 똑같아요.':
      'Guarda en una canción los acordes que te gusten.\nFunciona igual que en {S:editor}.',
    '마음에 드는 코드는 노트에 담아둘 수 있어요. 노트는 뒤에서 자세히 알려드릴게요.':
      'Guarda en una canción los acordes que te gusten.\nVeremos las canciones en detalle más adelante.',
    '코드 사전은 여기까지예요! 다음 단계에서는 훈련소를 둘러볼게요.':
      '¡Eso es todo del Diccionario de Acordes!\nLo que sigue: un recorrido por la Sala de Ensayo.',
    '코드 사전은 여기까지예요! 다음 단계에서는 코드 에디터를 배워볼게요.':
      '¡Eso es todo del Diccionario de Acordes!\nLo que sigue: el Editor de Acordes.',

    // ── 노트 스텝 ──
    '코드 악보를 매번 검색하거나 손으로 적어두느라 번거롭지 않으셨나요?':
      '¿Te cansa buscar cifrados cada vez\no escribirlos a mano?',
    '이번 스텝에서는 나만의 코드 악보집을 만드는 방법을 알려드릴게요.':
      'En este paso aprenderás a armar\ntu propio cancionero de acordes.',
    '그럼 바로 시작해 볼까요? 아래 노트 탭을 눌러 주세요!': 'Empecemos.\nToca la pestaña Canciones de abajo.',
    '이곳이 작성한 노트를 모아 보는 곳이에요. 오른쪽 위 + 버튼을 눌러 주세요!':
      'Aquí viven todas tus canciones.\nToca el botón + de arriba a la derecha.',
    '이름은 "새 노트"로 채워 뒀어요. 만들기를 눌러 주세요.':
      'Ya pusimos el nombre "Nueva canción".\nToca Crear.',
    '새 노트가 만들어졌어요. 연필 버튼을 눌러 편집을 시작해 주세요.':
      'Tu nueva canción está lista.\nToca el botón del lápiz para empezar a editar.',
    '아래 이곳은 코드를 모아두는 팔레트예요. 앞서 담아둔 코드도 전부 여기 모여요.':
      'Aquí abajo está la paleta, donde se guardan tus acordes.\nLos que guardaste antes también están aquí.',
    '그럼 직접 하나 담아 볼까요? + 버튼을 눌러 주세요!': 'Añadamos uno.\nToca el botón +.',
    '{S:library}의 코드 사전이 여기에도 담겨 있죠? 이곳에서 원하는 코드를 바로 담을 수 있어요!':
      'El Diccionario de Acordes de {S:library} también está aquí.\n¡Puedes añadir el acorde que quieras desde aquí mismo!',
    '사전에 없는 코드가 있다면 직접 에디터에서 만들어 담을 수도 있어요!':
      'Si un acorde no está en el diccionario,\n¡puedes crearlo en el Editor y añadirlo!',
    '그럼 C 코드를 담아 볼까요? 맨 앞의 C를 눌러 주세요!': 'Añadamos un acorde C.\nToca la C del principio.',
    '이렇게 C를 잡는 방법들이 나와요. 첫 번째를 눌러볼까요?': 'Estas son las formas de tocar C.\nToca la primera.',
    '팔레트에 C가 담겼어요! 이제 닫기를 눌러볼까요?': '¡C ya está en tu paleta!\nAhora toca Cerrar.',
    '팔레트에 C가 들어왔죠? 담은 코드는 이렇게 하나씩 쌓여요.': '¿Ves C en la paleta?\nLos acordes que añades se van acumulando aquí.',
    '코드가 많아지면 이렇게 옆으로 넘겨서 찾을 수 있어요.': 'Cuando tengas muchos acordes,\ndesliza así hacia los lados para encontrarlos.',
    '노트엔 코드뿐 아니라 가사나 메모도 함께 적을 수 있어요.': 'Además de acordes, una canción puede tener\nletra y apuntes.',
    '먼저 가사부터 적어 볼까요? 첫 줄에 "반짝반짝 작은 별"을 적어 주세요!':
      'Empecemos con la letra.\nEscribe "Twinkle twinkle little star" en la primera línea.',
    '잘하셨어요! 첫 줄이 채워졌네요. 맨 아래 + 버튼으로 두 번째 줄을 추가해 볼까요?':
      '¡Bien! La primera línea está completa.\nToca el botón + de abajo para añadir una segunda línea.',
    '가사는 여러 줄을 한 번에 붙여넣을 수도 있어요. 아래 버튼을 누르면 두 줄을 복사해 드릴게요!':
      'Puedes pegar varias líneas de letra a la vez.\nToca el botón de abajo y te copio dos líneas.',
    '이제 두 번째 줄에 붙여 보세요! 길게 누르고 있으면 붙일 수 있을 거예요.':
      'Ahora pégalas en la segunda línea.\nMantén presionado para pegar.',
    '앗...! 첫 번째 가사가 중복되어 버렸네요. 점 세 개 버튼을 눌러보실래요?':
      '¡Ups...! La primera línea quedó repetida.\nToca el botón de tres puntos.',
    '다행히 지울 수 있는 버튼이 있었네요! "이 줄 삭제"를 눌러 주세요.':
      '¡Menos mal, hay un botón para borrar!\nToca "Eliminar esta línea".',
    '가사가 정리되었으니 코드를 넣어봐야겠죠? 팔레트의 C 코드를 끌어다 놓아 보세요!':
      'La letra quedó ordenada, así que pongamos un acorde.\nArrastra el acorde C desde la paleta y suéltalo.',
    'C가 첫 번째 칸에 놓였어요! 이런 식으로 나만의 코드 악보를 만들 수 있어요.':
      '¡C quedó en la primera casilla!\nAsí armas tu propio cifrado.',
    '악보만 만드는 거면 조금 아쉽겠죠? 그래서 연습에 더 도움이 되는 기능을 넣어두었어요!':
      'Solo hacer cifrados sabría a poco, ¿no?\nPor eso hay funciones que también te ayudan a practicar.',
    '반짝이는 C 코드를 한 번 눌러볼까요?': 'Toca el acorde C que brilla.',
    '어떠셨어요? C 코드 소리가 났죠! 적용한 코드는 언제든 눌러서 확인할 수 있어요.':
      '¿Qué tal? ¡Sonó el acorde C!\nToca cualquier acorde que hayas colocado para escucharlo.',
    '연습할 땐 박자도 중요하겠죠? 메트로놈을 활성화해 볼까요?':
      'Al practicar, el pulso importa.\nActivemos el metrónomo.',
    '이제 처음부터 끝까지 들어 볼까요? 재생하면 메트로놈도 함께 들릴 거예요!':
      'Ahora escuchémoslo de principio a fin.\nDale a reproducir y también oirás el metrónomo.',
    '코드 칸 하나는 2박자 길이예요. 한 줄은 2마디라서 칸이 네 개랍니다.':
      'Cada casilla dura 2 tiempos.\nUna línea tiene 2 compases, así que son cuatro casillas.',
    '나만의 코드 악보가 완성되었어요! 다음 단계에선 박자, 카포 같은 기능을 다뤄볼게요.':
      '¡Tu propio cifrado está listo!\nLo que sigue: cosas como el compás y el capo.',

    // ── 노트 더 알아보기 스텝 ──
    '이번 스텝에선 노트를 더 자세히 다루고 정리하고 관리하는 법까지 알아볼 거예요!':
      'En este paso profundizamos en las canciones,\nincluyendo cómo ordenarlas y gestionarlas.',
    "제가 '작은 별' 한 소절을 미리 만들어 뒀어요. 이걸로 기능을 익혀 봅시다!":
      'Te dejé preparado un fragmento de "Estrellita".\n¡Usémoslo para aprender las funciones!',
    '노래 가사는 반복되는 부분이 많죠? 일일이 작성하려면 시간이 오래 걸릴 거예요.':
      'Las letras se repiten mucho.\nEscribir cada línea tomaría una eternidad.',
    '하지만 만들어 둔 줄을 복사하면 편리하겠죠? 점 세 개 메뉴를 눌러 보세요!':
      'Copiar una línea que ya hiciste es mucho más fácil.\nToca el menú de tres puntos.',
    '"현재 줄 복사"를 눌러 주세요.': 'Toca "Copiar esta línea".',
    '아래에 똑같은 줄이 생겼어요! 복사된 줄은 항상 맨 아래에 생기니 유의해주세요!':
      '¡Apareció una línea idéntica abajo!\nOjo: las líneas copiadas siempre van al final.',
    '다음 설명을 위해 방금 만든 줄을 삭제합시다. 버튼을 눌러서 삭제해주세요!':
      'Para lo que sigue, borremos esa línea nueva.\nToca el botón para eliminarla.',
    '어떤 곡은 중간에 박자나 마디 수가 바뀌기도 하고, 템포가 달라지는 노래도 있어요.':
      'Algunas canciones cambian de compás o de número de compases a la mitad,\ny otras cambian de tempo.',
    '그런 복잡한 노래도 얼마든지 만들 수 있어요! 다시 한 번 점 세 개 메뉴를 눌러주세요!':
      '¡También puedes escribir canciones así!\nToca otra vez el menú de tres puntos.',
    '"마디 정보 수정"을 눌러 주세요.': 'Toca "Editar datos del compás".',
    'BPM은 곡의 빠르기예요. 확실히 느려지도록 60으로 낮춰 볼까요?':
      'El BPM es el tempo de la canción.\nBajémoslo a 60 para que se note más lento.',
    '아래 숫자는 누를 때마다 정해진 값으로 바뀌고 위 숫자는 직접 입력해요. 6/8로 만들어 볼까요?':
      'El número de abajo cambia entre valores fijos al tocarlo,\ny el de arriba lo escribes tú. Pongamos 6/8.',
    '마디 수는 한 줄에 담을 마디 개수예요. 1마디를 골라 주세요.':
      'Compases es cuántos compases caben en una línea.\nElige 1 compás.',
    '이 줄만 느려지고 6/8박자가 됐어요. 저장을 눌러볼까요?': 'Solo esta línea quedó más lenta y en 6/8.\nToca Guardar.',
    '두 번째 줄만 빠르기와 박자가 달라졌어요. 메트로놈을 켜 뒀으니 재생해서 끝까지 들어볼까요?':
      'Solo la segunda línea tiene otro tempo y otro compás.\nEl metrónomo está activo, así que reproduce y escucha hasta el final.',
    '어때요? 확실히 바뀌었죠? 단, 마디를 줄이면 잘려나간 마디의 코드는 사라지니 유의해주세요!':
      '¿Notas la diferencia? Ojo: si reduces los compases,\nlos acordes de los compases eliminados se pierden.',
    '혹시 실수로 바뀌었다면 되돌릴 수 있어요! 되돌리기 버튼을 눌러볼까요?':
      'Si cambias algo por error, ¡puedes deshacerlo!\nToca el botón de deshacer.',
    '휴~ 수정하기 전으로 제대로 되돌아갔죠? 실수해도 걱정 말고 마음껏 편집해 보세요!':
      'Uf, volvió a como estaba.\nNo te preocupes por los errores. ¡Edita con libertad!',
    '카포를 사용해야 하는 곡들도 많이 있어요. 직접 카포를 적용해봅시다!':
      'Muchas canciones necesitan capo.\n¡Probemos a ponerlo!',
    '먼저 적용하기 전의 C 코드를 들어볼까요?': 'Primero escuchemos el acorde C sin capo.',
    '이제 카포를 1 올려서 1프렛에 카포를 낀 효과를 줍시다! C# 코드가 되겠죠?':
      'Ahora sube el capo en 1, como si estuviera en el traste 1.\nEso lo convierte en un acorde C#.',
    '다시 한 번 C 코드를 들어봅시다.': 'Escuchemos el acorde C otra vez.',
    '어떤가요? 제대로 카포가 적용되었어요! 이렇게 카포 적용까지 알아봤어요.':
      '¿Lo oyes? ¡El capo funciona!\nAsí se aplica un capo.',
    '코드가 빽빽하거나 가사가 긴 곡은 세로 화면이 답답할 수 있어요.':
      'Las canciones con muchos acordes o letra larga\npueden sentirse apretadas en vertical.',
    '가로로 돌리면 한 마디의 코드 칸이 4개로 늘고 줄도 넓어져 긴 가사까지 시원하게 담겨요.':
      'En horizontal, cada compás tiene 4 casillas\ny las líneas son más anchas, así que la letra larga cabe cómoda.',
    '버튼 없이 기기를 가로로 돌리기만 하면 화면이 자동으로 가로 모드로 바뀌어요.':
      'No hace falta ningún botón. Solo gira el dispositivo\ny la pantalla pasa a horizontal.',
    '편집이 끝났다면 체크 버튼을 눌러 편집을 마칠 수 있어요.': 'Cuando termines de editar,\ntoca el botón de check para finalizar.',
    '눈동자 아이콘을 누르면 코드 그림을 숨겨 가사만 깔끔하게 볼 수 있어요. 눌러볼까요?':
      'Toca el ícono del ojo para ocultar los diagramas\ny ver solo la letra. Tócalo.',
    '가사랑 코드이름만 남아 화면이 깔끔해졌죠? 다시 눌러 코드를 되돌려 주세요.':
      'Ahora solo quedan la letra y los nombres de acordes. Más limpio, ¿no?\nToca otra vez para recuperar los diagramas.',
    '이제 악보 만드는 기능은 전부 마스터하셨어요! 남은 건 만든 노트를 정리하는 방법이에요.':
      '¡Ya dominas todo lo necesario para crear cifrados!\nSolo falta ver cómo ordenar tus canciones.',
    '목록으로 나가 볼까요? 왼쪽 위 버튼을 눌러 주세요!': 'Volvamos a la lista.\nToca el botón de arriba a la izquierda.',
    '노트가 쌓이면 원하는 곡을 찾기 어려워지죠? 그래서 최근 · 즐겨찾기 · 중요로 나눠 뒀어요.':
      'Cuando se acumulan canciones, cuesta encontrar la que buscas.\nPor eso están divididas en Recientes, Favoritas e Importantes.',
    '자주 펼쳐 보는 노트는 즐겨찾기에 올려두면 매번 찾지 않아도 돼요!':
      'Pon en Favoritas las canciones que abres seguido\ny no tendrás que buscarlas.',
    '무료 이용자라면 노트는 3개까지 만들 수 있어요.': 'Con el plan gratis puedes crear hasta 3 canciones.',
    '만약 구독 중에 더 많은 노트를 만들어 두셨다면 중요 목록에 등록해야 잠기지 않을 수 있어요!':
      'Si creaste más canciones mientras tenías suscripción,\nagrégalas a Importantes para que no se bloqueen.',
    "아끼는 노트는 미리 옮겨두는 게 좋겠죠? '작은 별' 오른쪽 점 세 개 버튼을 눌러 보세요!":
      'Conviene mover con tiempo las canciones que más quieres.\nToca el botón de tres puntos a la derecha de "Estrellita".',
    '왕관 버튼을 누르면 중요로 옮겨져요. 왕관 버튼을 눌러주세요!': 'El botón de la corona la pasa a Importantes.\nToca el botón de la corona.',
    '노트를 다루는 법을 전부 익히셨어요! 이제 나만의 악보집을 채워 나가면 돼요.':
      '¡Ya aprendiste todo sobre las canciones!\nAhora ve llenando tu propio cancionero.',
    '틈틈이 훈련소도 들러 실력을 쌓아 보세요! 튜토리얼은 여기까지예요, 수고하셨어요!':
      'Pasa de vez en cuando por la Sala de Ensayo para seguir mejorando.\nAquí termina el tutorial. ¡Gran trabajo!',

    // ── 훈련소 스텝 ──
    '안녕하세요, 코디터에 오신 것을 환영해요! {S}에서는 훈련소를 둘러볼 거예요.':
      '¡Hola, te damos la bienvenida a Chorditor!\nEn {S} haremos un recorrido por la Sala de Ensayo.',
    '기타 연습, 뭘 어떻게 해야 할지 막막할 때가 있죠?': '¿A veces no sabes qué practicar\nni cómo?',
    '이번 스텝에선 기타를 더 재미있고 효율적으로 연습할 수 있는 훈련 시스템을 소개드릴게요!':
      'En este paso te presento un sistema de práctica\nque hace la guitarra más divertida y efectiva.',
    '그래서 재미있고 알차게 연습할 수 있는 훈련 컨텐츠를 준비해뒀어요!':
      'Por eso preparamos contenido de práctica\ndivertido y que vale la pena.',
    '어떤 컨텐츠가 있는지 살펴볼까요?': 'Veamos qué hay adentro.',
    '기타 연습을 더 재미있고 쉽게 할 수 있도록 여러 가지 훈련 컨텐츠를 만들어 두었어요!':
      'Creamos distintos contenidos de práctica\npara que la guitarra sea más fácil y divertida.',
    '코드 암기를 게임처럼! 제한 시간 안에 빠르게 맞혀보는 훈련이에요.':
      '¡Memorizar acordes como un juego!\nDi el nombre rápido antes de que se acabe el tiempo.',
    '기타 솔로, 즉흥 연주가 꿈이라면 필수예요. 스케일을 손에 익혀보세요.':
      'Imprescindible si sueñas con solos e improvisación.\nLleva las escalas a tus manos.',
    '매번 따로 외워야 했던 코드 진행, 패턴으로 몸에 각인시켜요.':
      'Las progresiones que antes memorizabas una por una:\napréndelas como patrones que tu cuerpo recuerda.',
    '노래에 자주 쓰이는 리듬 패턴만 집중적으로 공략해요.': 'Enfócate solo en los patrones rítmicos\nmás usados en las canciones.',
    '어렵게만 느껴지던 화성학, 퀴즈만 풀어도 자연스럽게 익혀져요.':
      '¿La teoría siempre te pareció difícil?\nSolo juega los quizzes y se te queda sola.',
    '흐릿한 카드는 준비 중이에요. 앞으로 계속 늘어날 거예요.': 'Las tarjetas atenuadas llegan pronto.\nSe irán sumando más.',
    '훈련에는 피크가 들어가요. 30분마다 1개씩, 하루 30개까지 채워져요.':
      'Practicar usa púas.\nRecibes 1 cada 30 minutos, hasta 30 al día.',
    '피크상자를 열면 피크를 한 번에 채울 수 있어요. 출석이나 보상으로 받아요.':
      'Abre una Cajita de Púas para recargar todas de una vez.\nLas consigues con check-ins y recompensas.',
    '직접 한 판 해볼게요. 코드 맞추기를 눌러 주세요.': 'Juguemos una ronda.\nToca Quiz de Acordes.',
    '레벨 1로 맞춰 뒀어요. 예습하기로 어떤 코드가 나오는지 볼까요?':
      'Está en el Nivel 1.\nToca Vista previa para ver qué acordes saldrán.',
    '이 레벨에서 나올 코드들이에요. 미리 보고 나서 시작할 수 있어요.':
      'Estos son los acordes de este nivel.\nPuedes revisarlos antes de empezar.',
    '충분히 보신 다음에 닫아주세요!': 'Ciérralo cuando los hayas visto bien.',
    '이제 시작해 볼게요. 시작하기를 눌러 주세요.': 'Ahora sí, empecemos.\nToca Empezar.',
    '코드를 보고 이름을 맞추는 모드로 해볼게요. 틀려도 괜찮으니 끝까지 풀어 보세요!':
      'Usaremos el modo en que ves un acorde y dices su nombre.\nNo importa si fallas, ¡juega hasta el final!',
    '수고했어요! 방금 한 판이 어떻게 남았는지 볼까요?': '¡Buen trabajo!\nVeamos cómo quedó registrada esa ronda.',
    '방금 한 판이 그대로 기록됐어요. 연속 기록, 훈련 시간, 훈련 완료가 올라갔죠?':
      'Esa ronda ya quedó registrada.\n¡Subieron Racha, Tiempo de práctica y Completadas!',
    '튜토리얼에선 코드 맞추기만 해봤지만 다른 훈련들도 즐겨보세요!':
      'En el tutorial solo probamos el Quiz de Acordes,\n¡pero disfruta también las otras prácticas!',
    '훈련소 설명이 전부 끝났어요! 다음 스텝에선 나만의 악보를 만들어 볼게요.':
      '¡Ese fue todo el recorrido por la Sala de Ensayo!\nEn el siguiente paso crearás tu propio cifrado.',
    '훈련소 설명이 전부 끝났어요! 다음 스텝에선 코드 사전을 둘러볼게요!':
      '¡Ese fue todo el recorrido por la Sala de Ensayo!\nEn el siguiente paso exploraremos el Diccionario de Acordes.',

    // ── 튜토리얼 모달 본문(tutorial-content.js) ──
    "코디터가 '누구나 언제 어디서나 기타를 즐기는 세상'이라는 슬로건으로 완전히 새롭게 돌아왔습니다!":
      '¡Chorditor vuelve completamente renovado con una idea: guitarra para todo el mundo, en cualquier momento y lugar!',
    '다양한 도구, 훈련 기능, 레슨 등의 콘텐츠로 방구석이든 공원이든 언제 어디서나 친근한 기타 앱으로서의 성장을 목표로 나아가고 있습니다.앞으로의 코디터 기대해 주세요!':
      'Con herramientas, modos de práctica, lecciones y más, queremos ser una app de guitarra cercana donde sea que toques, en tu cuarto o en el parque. ¡Atención a lo que viene!',
    '주법 리듬 훈련 컨텐츠 개방': 'Patrones de Rasgueo disponible',
    '스케일 훈련 Ch.3 개방': 'Bloques de Escalas Cap. 3 disponible',
    '코드 재생 시 기본 드럼 비트 삽입': 'Ritmo básico de batería al reproducir acordes',
    '개발자의 한 마디': 'Unas palabras de quien desarrolla la app',
    '코디터에 오신 걸 진심으로 환영합니다! 누구나 기타를 쉽게 배우고, 배움이 부담스러워서 포기하시는 분들에게도 기타의 즐거움을 알려주고 싶어서 코디터 개발을 기획하게 되었습니다.':
      '¡Te doy la más cordial bienvenida a Chorditor! Empecé a crearla para que cualquiera pueda aprender guitarra con facilidad, y para que quienes se rindieron porque aprender se sentía demasiado pesado también descubran lo divertida que es.',
    '아직은 기능적으로, 디자인적으로 부족하지만 여러분께 최고의 기타 앱으로 기억되도록 노력하겠습니다.':
      'Todavía le falta en funciones y en diseño, pero seguiré trabajando para que sea la mejor app de guitarra que hayas usado.',
    '코디터 간단 설명서': 'Guía rápida de Chorditor',
    '이제 프랫보드의 운지를 변경하면 즉시 가장 알맞은 코드명으로 변경됩니다! 상단에는 해당 코드의 추천명이 뜰 텐데, 보통 1~2개만 뜰 때는 직접 입력해 둔 코드이기 때문에 안심하셔도 됩니다. 하지만 추천명이 여러 개가 뜬다면 그 코드명은 정확하지 않을 가능성이 높습니다. 앞으로 세상의 모든 코드 이름이 정확하게 표기될 수 있도록 개선할 것입니다.':
      'Cambia la digitación en el diapasón y el nombre del acorde se actualiza al instante con la mejor coincidencia. Arriba aparecen los nombres sugeridos. Cuando solo salen uno o dos, son acordes que ingresamos a mano, así que puedes confiar en ellos. Si salen varios, es más probable que el nombre no sea exacto. Seguiremos mejorando hasta que todos los acordes se nombren con precisión.',
    '휠피커는 이론적으로 코드가 만들어지는 순서라고 생각하셔도 됩니다. 각 기능에 어떤 법칙이 숨어 있는지는 앞으로의 레슨을 기대해 주세요!':
      'Piensa que las ruedas siguen el orden en que se construyen los acordes en teoría. ¡Las reglas detrás de cada parte se verán en futuras lecciones!',
    '만들어진 코드는 재생해서 들어볼 수 있고, 이미지로 저장해서 여러 가지 용도로 활용하실 수 있습니다. 손바닥 아이콘으로 손가락 번호를 지정해 연습에 활용하실 수도 있습니다. 영상 제작에 활용하셔도 되고 개인 자료로 활용하셔도 좋습니다. 마음껏 사용해 주세요!':
      'Puedes reproducir los acordes que creas y guardarlos como imágenes para lo que necesites. Usa el ícono de la mano para asignar números de dedos y practicar. Úsalos en videos o en tus propios materiales. ¡Úsalos como quieras!',
    '노트를 만드셨다면 (혹은 만드실 때) 에디터에서 작성한 코드를 그대로 노트로 가져올 수 있습니다. 노트에서도 편집 시 언제든지 에디터로 수정할 수 있습니다.':
      'Cuando tengas una canción (o mientras la creas), puedes llevar los acordes del Editor directamente a ella. Al editar una canción, puedes ir al Editor para cambiar un acorde cuando quieras.',
    '거의 모든 코드가 담겨 있는 코드 사전입니다. 화성학 이론과 경험을 바탕으로 기타에서 잡을 수 있는 거의 모든 코드를 탑재할 것입니다. 이미 충분한 양의 코드를 탑재하였기 때문에 코드가 문제 되는 일은 없을 것입니다!':
      'Un diccionario con casi todos los acordes. A partir de la teoría y la experiencia, busca incluir casi todos los acordes que se pueden tocar en guitarra. Ya hay muchísimos, ¡así que no deberían faltarte!',
    '만든 코드를 팔레트에 모아두세요. 그리고 나만의 연습장을 만드세요. 매번 프랫보드에 한 땀 한 땀 점을 찍는 일은 안 하셔도 됩니다. 4칸/8칸 모드, 카포, BPM을 설정한 후 재생하면서 연습하실 수 있습니다!':
      'Reúne tus acordes en la paleta y arma tu propia hoja de práctica. Se acabó eso de marcar el diapasón punto por punto. Elige el modo de 4 u 8 casillas, el capo y el BPM, ¡y practica mientras suena!',
    '4칸 모드 : 한 슬롯 당 1마디': 'Modo de 4 casillas: 1 compás por casilla',
    '8칸 모드 : 한 슬롯 당 1/2마디': 'Modo de 8 casillas: 1/2 compás por casilla',
    '텍스트에 노래 가사 또는 코드 설명을 작성해서 자유롭게 활용하시면 됩니다. 이렇게 만든 노트는 공유 코드로 지인들과 공유할 수 있습니다.':
      'Escribe la letra o apuntes sobre los acordes en el área de texto y úsala como quieras. Puedes compartir tus canciones con un código.',
    '단, 제목이나 텍스트 내용은 공유되지 않습니다. 노래 저작권 문제로 해당 내용은 공유에서 제외됩니다. (앞으로 코디터가 성장해서 저작권을 취득하고 더욱 풍성한 콘텐츠를 제공할 수 있도록 여러분의 많은 관심 부탁드립니다!)':
      'Ten en cuenta que los títulos y el texto no se comparten. Se excluyen por los derechos de autor de las canciones. (Esperamos crecer lo suficiente para licenciar canciones y ofrecer contenido más rico, ¡gracias por tu apoyo!)',
    '훈련소 / 나의 기타 여정': 'Sala de Ensayo / Mi Camino con la Guitarra',
    "'훈련소'에서는 지루한 반복 학습을 재미있게 할 수 있는 여러 가지 훈련 콘텐츠가 제공됩니다.":
      'La Sala de Ensayo ofrece contenido de práctica que vuelve divertidos los ejercicios repetitivos.',
    "'나의 기타 여정'에서는 코디터만의 커리큘럼으로 여러분이 자연스럽게 기타 실력을 향상해 가는 레슨 콘텐츠를 기획하고 있습니다. 자연스럽게 따라만 하면 나도 모르게 중·고급 화성학을 연주할 수 있는 여정이 될 것입니다. 기대해 주세요!":
      'En Mi Camino con la Guitarra estamos planeando lecciones con el plan de estudios propio de Chorditor para que mejores de forma natural. Solo sigue el camino y, sin darte cuenta, estarás tocando armonía intermedia y avanzada. ¡Atención a lo que viene!',
  },

  patterns: [
    [/^STEP ?(\d+) 완료!$/, '¡STEP {1} completo!'],
    [/^STEP(\d+) \| (.*)$/, 'STEP{1} | {2}'],
  ],
});
