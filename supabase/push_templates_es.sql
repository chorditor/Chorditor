-- ───────────────────────────────────────────────────────────
-- push_templates_es.sql : 스페인어 푸시 문구 (초안, 라이브 미적용 · 원어민 검수 전).
--   중남미 중립(es-419) + tú, 성별이 드러나지 않는 표현만.
--   톤: 따뜻한 응원. 유저를 놀리거나 지적하지 않음. 유머는 "기타가 널 그리워한다" 정도까지.
--   category·placeholder 는 push_templates_en.sql 과 동일.
--   서버를 언어 공용 구조(lang 컬럼)로 정리할 때 한 테이블로 합칠 예정.
--
--   닉네임 호칭은 대괄호로 감쌈: [, {name}]
--     닉네임이 있으면 대괄호만 벗기고, 없으면 대괄호 구간을 통째로 뺀다.
--     뺀 뒤 첫 글자 대문자 처리가 필요 없도록 호칭은 문장 앞이 아니라 뒤·중간에만 둠.
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_templates_es (
  id         bigint generated always as identity primary key,
  category   text        not null,
  title      text        not null,
  body       text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create index if not exists push_templates_es_category_idx
  on public.push_templates_es (category) where active;

alter table public.push_templates_es enable row level security;

delete from public.push_templates_es;

insert into public.push_templates_es (category, title, body) values

-- ── 일반 넛지 ──────────────────────────────────────────────
('nudge_repeat', 'Tu guitarra te extraña 🎸',
 'La última vez practicaste {training}. ¿Seguimos un ratito hoy?'),
('nudge_repeat', '¡Hola[, {name}]! 👋',
 'Un repaso rápido de {training} y se te queda mucho mejor.'),
('nudge_repeat', 'Con 5 minutos basta',
 'Una ronda más de {training}. Las prácticas cortas también suman.'),
('nudge_repeat', '¡Vas muy bien! ✨',
 'Llevas buen ritmo con {training}[, {name}]. ¿Lo mantenemos hoy?'),

('nudge_persona', 'La recomendación de hoy 🎸',
 '¿Qué tal un poco de {pick} hoy[, {name}]?'),
('nudge_persona', '¿Tocamos un ratito?',
 'Hoy te recomendamos {pick}. Es fácil empezar.'),
('nudge_persona', 'Elegido para ti',
 '{pick} va perfecto con tu nivel de ahora[, {name}].'),
('nudge_persona', 'Poquito a poco',
 'Buen momento para tomar la guitarra 🎸 Empieza suave con {pick}.'),

-- ── 중단인지형 ─────────────────────────────────────────────
('quiz_abandoned', 'Quiz de Acordes', '{level} te está esperando. Puedes retomarlo cuando quieras.'),
('quiz_abandoned', 'Quiz de Acordes', '¡Ya casi terminabas {level}! ¿Seguimos donde quedaste?'),
('quiz_abandoned', 'Quiz de Acordes', 'Guardamos tu lugar en {level}. Vuelve cuando tengas un momento.'),

('scale_abandoned', 'Bloques de Escalas', '{scale} sigue justo donde la dejaste. ¿La retomamos?'),
('scale_abandoned', 'Bloques de Escalas', 'Ya avanzaste una parte de {scale}. Puedes seguir desde ahí.'),
('scale_abandoned', 'Bloques de Escalas', '{scale}: ¡ya vas a la mitad! Vamos hasta el final.'),
('scale_abandoned', 'Bloques de Escalas', 'Tus dedos todavía se acuerdan de {scale}. ¿Continuamos?'),
('scale_abandoned', 'Bloques de Escalas', '¡A {scale} solo le falta el final[, {name}]!'),

-- ── 성적형 · 코드 맞추기 ───────────────────────────────────
('quiz_level_up', 'Quiz de Acordes', 'Ya tienes {level} bien aprendido. ¿Pasamos al siguiente nivel?'),
('quiz_level_up', 'Quiz de Acordes', '{level} ya se te hace natural. ¡El siguiente paso está listo!'),
('quiz_level_up', 'Quiz de Acordes', '¡{level} ya te sale con facilidad! Vamos por acordes nuevos.'),
('quiz_level_up', 'Quiz de Acordes', 'Ya te sabes los acordes de {level} 😀 ¡Prueba el siguiente nivel!'),
('quiz_level_up', 'Quiz de Acordes', '¡Tu precisión en {level} es muy alta! ¿Te animas con {next_level}?'),

('quiz_challenge', 'Quiz de Acordes', 'Solo quienes llegan hasta aquí pueden intentar el {challenge}. ¿Te animas?'),
('quiz_challenge', 'Quiz de Acordes', '¡Vas firme hasta {level}! Pon a prueba tu nivel en el {challenge}.'),
('quiz_challenge', 'Quiz de Acordes', '¡Con este nivel, te ganaste el derecho a intentar el {challenge}!'),
('quiz_challenge', 'Quiz de Acordes', 'Tus resultados en {level} son excelentes. ¡Es buen momento para el {challenge}!'),
('quiz_challenge', 'Quiz de Acordes', '¡Ya puedes intentar el {challenge}!'),

('quiz_reinforce', 'Quiz de Acordes', 'Un vistazo a Vista previa antes de empezar hace todo más fácil.'),
('quiz_reinforce', 'Quiz de Acordes', 'Prueba a tocar los acordes de {level} en tu guitarra. Así se memorizan mejor.'),
('quiz_reinforce', 'Quiz de Acordes', '{level} le toma tiempo a todo el mundo. Vamos otra vez, con calma.'),
('quiz_reinforce', 'Quiz de Acordes', 'En {level} hay acordes muy parecidos. ¿Los repasamos en Vista previa?'),
('quiz_reinforce', 'Quiz de Acordes', 'Más que la velocidad, importa aprenderlo bien. ¿Otra vuelta a {level}?'),

-- ── 성적형 · 스케일 ────────────────────────────────────────
('scale_level_up', 'Bloques de Escalas', '¡Tu precisión en {scale} va muy bien! ¿Pasamos a {next_scale}?'),
('scale_level_up', 'Bloques de Escalas', 'Cada vez te sale mejor {scale}[, {name}]. ¿Qué tal {next_scale}?'),
('scale_level_up', 'Bloques de Escalas', 'Ya te sientes a gusto con {scale}. Vamos también por {next_scale}.'),
('scale_level_up', 'Bloques de Escalas', 'Por tus últimos resultados, ya puedes dar el siguiente paso: {next_scale}.'),
('scale_level_up', 'Bloques de Escalas', '¡Vas con constancia en {scale}[, {name}]! Sigamos con {next_scale}.'),

('scale_reinforce', 'Bloques de Escalas', '{scale} es una escala que toma su tiempo. ¿La repasamos otra vez?'),
('scale_reinforce', 'Bloques de Escalas', '{scale} ya casi está[, {name}]. Vamos a terminar de afinarla.'),
('scale_reinforce', 'Bloques de Escalas', 'Acostumbrarse al diapasón lleva tiempo. Repasemos {scale}.'),
('scale_reinforce', 'Bloques de Escalas', 'Sin prisa. Veamos {scale} otra vez, despacio.'),
('scale_reinforce', 'Bloques de Escalas', 'En esta escala, repetir es el camino más corto[, {name}]. ¿Una vez más?'),

-- ── 연동형 · 코드 맞추기 → 다른 훈련 ───────────────────────
('quiz_link_scale', 'Bloques de Escalas', '¡Ya te sabes los acordes de {level}! ¿Probamos ahora un poco de melodía?'),
('quiz_link_scale', 'Bloques de Escalas', 'Los solos de guitarra suenan increíble, ¿verdad? Empiezan en Bloques de Escalas.'),
('quiz_link_scale', 'Bloques de Escalas', 'Si además de acordes tocas solos, se disfruta todavía más. Prueba Bloques de Escalas.'),
('quiz_link_scale', 'Bloques de Escalas', 'Ya llegaste a {level}. ¿Te animas a improvisar un poco?'),
('quiz_link_scale', 'Bloques de Escalas', '¿Te gustaría tocar un solo frente a tus amistades algún día? Empieza con Bloques de Escalas.'),
('quiz_link_scale', 'Bloques de Escalas', 'Los acordes acompañan; las escalas hacen la melodía. Tu solo empieza aquí.'),

('quiz_link_progression', 'Progresiones', '¿Tocamos como en una canción los acordes que ya sabes? Únelos en Progresiones.'),
('quiz_link_progression', 'Progresiones', 'Los acordes de {level} se disfrutan más cuando los tocas seguidos.'),
('quiz_link_progression', 'Progresiones', 'Ya memorizaste los acordes; ahora toca usarlos. Agarra el ritmo en Progresiones.'),
('quiz_link_progression', 'Progresiones', 'La sensación de tocar una canción completa te espera en Progresiones.'),
('quiz_link_progression', 'Progresiones', '¿Quieres ver cómo se usan de verdad los acordes que aprendiste? Mira Progresiones.'),
('quiz_link_progression', 'Progresiones', 'Acompañar sin partitura es una habilidad que se entrena en Progresiones.'),
('quiz_link_progression', 'Progresiones', 'El secreto de quienes escuchan una canción y la acompañan al instante: practicar progresiones.'),
('quiz_link_progression', 'Progresiones', 'Para tocar sin tener que buscar cifrados, practicar progresiones es el atajo.'),

('quiz_link_strum', 'Patrones de Rasgueo', 'Preparamos una práctica solo de ritmo. ¿Le echas un vistazo a Patrones de Rasgueo?'),
('quiz_link_strum', 'Patrones de Rasgueo', 'Empieza lento y avanza de a poco. Aquí practicas solo el ritmo.'),
('quiz_link_strum', 'Patrones de Rasgueo', 'Dejar los acordes un momento y enfocarte en el ritmo también es importante.'),
('quiz_link_strum', 'Patrones de Rasgueo', 'Empiezas lento y vas acelerando. Así se aprende el ritmo.'),
('quiz_link_strum', 'Patrones de Rasgueo', '¿Quieres practicar solo el rasgueo? ¡Ya está todo listo!'),

('quiz_link_combo', 'Quiz de Reharm', 'Las mejores canciones tienen algo especial en sus acordes. En Quiz de Reharm lo vas entendiendo de forma natural.'),
('quiz_link_combo', 'Quiz de Reharm', 'La teoría parece difícil, pero al ordenar acordes en un quiz resulta más simple de lo que crees.'),
('quiz_link_combo', 'Quiz de Reharm', 'No hace falta estudiar teoría a fondo. Con quizzes de cambiar acordes vas desarrollando oído para los arreglos.'),
('quiz_link_combo', 'Quiz de Reharm', 'Quienes sacan los acordes de una canción nueva solo conocen unos cuantos patrones.'),
('quiz_link_combo', 'Quiz de Reharm', 'En lugar de libros de teoría: ordena, cambia y aprende con el oído.'),
('quiz_link_combo', 'Quiz de Reharm', '¿Por qué este acorde suena bien después de aquel? Con unos quizzes empieza a verse claro.'),
('quiz_link_combo', 'Quiz de Reharm', 'La teoría se siente mucho más cercana después de resolver algunos quizzes.'),
('quiz_link_combo', 'Quiz de Reharm', '¿Te da curiosidad el mundo de los arreglos y la composición? Pruébalo en Quiz de Reharm.'),

-- ── 연동형 · 스케일 → 다른 훈련 ────────────────────────────
('scale_link_quiz', 'Quiz de Acordes', '¡Buen trabajo con las escalas! ¿Un respiro con Quiz de Acordes?'),
('scale_link_quiz', 'Quiz de Acordes', '¡Hoy te concentraste mucho en las escalas[, {name}]! ¿Cambiamos de aire con Quiz de Acordes {level_short}?'),
('scale_link_quiz', 'Quiz de Acordes', 'Después de tanto diapasón, despeja un poco con Quiz de Acordes.'),
('scale_link_quiz', 'Quiz de Acordes', 'Después de trabajar las escalas, ¿cambiamos de ritmo con Quiz de Acordes?'),
('scale_link_quiz', 'Quiz de Acordes', 'Descansa los dedos[, {name}]. ¿Qué tal Quiz de Acordes {level_short}?'),

('scale_link_progression', 'Progresiones', 'Pon la escala que aprendiste sobre una progresión y todo cobra sentido.'),
('scale_link_progression', 'Progresiones', 'Las escalas se vuelven habilidad real cuando las usas sobre acordes[, {name}].'),
('scale_link_progression', 'Progresiones', 'Cuando conoces la progresión, ves dónde encaja tu escala. ¿Lo revisamos?'),
('scale_link_progression', 'Progresiones', '¿Vemos cómo se usa en una progresión real la escala que aprendiste hoy[, {name}]?'),
('scale_link_progression', 'Progresiones', 'Escalas + progresiones = poder usarlas de verdad. ¿Seguimos?'),

('scale_link_strum', 'Patrones de Rasgueo', 'Después de las escalas, toma un respiro con Patrones de Rasgueo.'),
('scale_link_strum', 'Patrones de Rasgueo', 'Deja el diapasón un momento y despeja con algo de ritmo.'),
('scale_link_strum', 'Patrones de Rasgueo', 'Olvida un rato las posiciones[, {name}] y descansa practicando ritmo.'),
('scale_link_strum', 'Patrones de Rasgueo', '¡Hoy trabajaste muy bien las escalas[, {name}]! ¿Cerramos suave con un poco de rasgueo?'),
('scale_link_strum', 'Patrones de Rasgueo', 'Deja las escalas un momento y trabaja tu sentido del ritmo.'),

('scale_link_combo', 'Quiz de Reharm', 'Escalas más acordes diatónicos: una combinación muy poderosa[, {name}].'),
('scale_link_combo', 'Quiz de Reharm', 'Si además de escalas aprendes armonía en Quiz de Reharm {level_short}, tu mundo se amplía muchísimo.'),
('scale_link_combo', 'Quiz de Reharm', 'Cuando conoces los acordes diatónicos, ves por qué esa escala encaja[, {name}].'),
('scale_link_combo', 'Quiz de Reharm', '¿Vemos la armonía que va con tu escala en Quiz de Reharm {level_short}?'),
('scale_link_combo', 'Quiz de Reharm', 'Después de las escalas viene la armonía. Sigamos con Quiz de Reharm.'),

-- ── 적극형 (주간 결산) ─────────────────────────────────────
('quiz_active_continue', 'Tu resumen de la semana',
 '¡Aquí está tu resumen semanal[, {name}]! Practicaste {training} {n} veces más que el promedio 💪 ¿Seguimos así?'),
('quiz_active_continue', 'Tu resumen de la semana',
 '¡Resumen semanal[, {name}]! Completaste {n} veces el promedio en {training}. ¡Qué ganas de ver la próxima semana!'),
('quiz_active_continue', 'Tu resumen de la semana',
 'Tu {training} de esta semana fue {n} veces el promedio[, {name}]. La constancia es lo que se vuelve habilidad.'),
('quiz_active_continue', 'Tu resumen de la semana',
 'Esta semana te dedicaste a {training} {n} veces más que el promedio[, {name}] 🔥 A este paso vas a mejorar muy rápido.'),

('quiz_active_recommend', 'Tu resumen de la semana',
 '¡Aquí está tu resumen semanal[, {name}]! Practicaste {training} {n} veces más que el promedio 💪 ¿Probamos también {pick}?'),
('quiz_active_recommend', 'Tu resumen de la semana',
 '¡Completaste {n} veces el promedio en {training}[, {name}]! Si sumas {pick}, queda todavía más equilibrado.'),
('quiz_active_recommend', 'Tu resumen de la semana',
 'Tu {training} de esta semana fue {n} veces el promedio[, {name}]. ¿Le echas un vistazo a {pick}?'),
('quiz_active_recommend', 'Tu resumen de la semana',
 'Te dedicaste a {training} {n} veces más que el promedio[, {name}] 🔥 Lleva esa energía también a {pick}.'),

('quiz_active_high_continue', 'Tu resumen de la semana',
 '¡Increíble[, {name}]! Esta semana practicaste {training} {n} veces más que el promedio 👏 Sigamos con esa concentración.'),
('quiz_active_high_continue', 'Tu resumen de la semana',
 '¡{n} veces el promedio en {training}[, {name}]! Esta semana le pusiste muchas ganas 🔥 ¡Qué ganas de ver la próxima!'),

('quiz_active_high_recommend', 'Tu resumen de la semana',
 '¡Increíble[, {name}]! Esta semana practicaste {training} {n} veces más que el promedio 👏 ¿Llevamos esas ganas también a {pick}?'),
('quiz_active_high_recommend', 'Tu resumen de la semana',
 '¡{n} veces el promedio en {training}[, {name}]! Le pusiste muchas ganas 🔥 Suma {pick} y este mes queda redondo.'),

-- ── 윈백 (push_winback stage 1~4 대응, 목적지=홈) ──────────
('winback_1', '¿Un ratito de guitarra? 🎸', '¡Qué gusto saludarte! ¿Tocamos un acorde hoy?'),
('winback_1', '¿Un ratito de guitarra? 🎸', 'Pasa un momento y suelta los dedos.'),
('winback_1', '¿Un ratito de guitarra? 🎸', 'Con 3 minutos basta. ¿Una canción, sin presión?'),
('winback_1', '¿Un ratito de guitarra? 🎸', 'Han pasado unos días. Seguro tus dedos todavía se acuerdan de los acordes 😊'),

('winback_2', 'Aquí seguimos para ti', 'Con calma, empecemos de nuevo cuando quieras.'),
('winback_2', 'Aquí seguimos para ti', 'Descansar unos días está bien. Hoy es un gran día para volver.'),
('winback_2', 'Aquí seguimos para ti', '¿Repasamos un poquito los acordes que ya sabes?'),
('winback_2', 'Aquí seguimos para ti', 'Hoy, solo una canción. Sin apuro 🎸'),

('winback_3', '¿Cómo has estado?', '¿Cómo va todo? Tu guitarra sigue ahí, cerquita.'),
('winback_3', '¿Cómo has estado?', 'Ya pasó un mes. ¿Vemos si tus manos se acuerdan?'),
('winback_3', '¿Cómo has estado?', 'Volver a empezar de a poquito está muy bien 🌱'),
('winback_3', '¿Cómo has estado?', 'Con uno o dos minutos basta. ¿La tomamos otra vez?'),

('winback_4', 'Tu guitarra te espera 🎸', '¿Abrimos el estuche después de tanto tiempo? Con un acorde basta.'),
('winback_4', 'Tu guitarra te espera 🎸', 'Vuelve cuando quieras: puedes seguir justo donde quedaste.'),
('winback_4', 'Tu guitarra te espera 🎸', 'Nos encantará volver a tocar contigo.'),
('winback_4', 'Tu guitarra te espera 🎸', 'Lo que aprendiste no se perdió. ¿Tocamos una vez más?'),
('winback_4', 'Tu guitarra te espera 🎸', 'Tus dedos todavía se acuerdan de los acordes 🌱'),
('winback_4', 'Tu guitarra te espera 🎸', 'Con que suene un solo acorde, ya nos alegra el día.'),

-- ── 단건 ───────────────────────────────────────────────────
('peak_full', '¡Tus púas están llenas!', 'Tienes las 30 púas listas. ¡A practicar!'),
('trial_expiry', 'Tu prueba de Pro termina pronto', 'Tu prueba de 7 días termina mañana. ¡Aprovecha el tiempo que queda!')
;

-- 확인: select category, count(*) from push_templates_es group by 1 order by 1;
