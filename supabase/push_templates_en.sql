-- ───────────────────────────────────────────────────────────
-- push_templates_en.sql : 영어 푸시 문구 (초안, 라이브 미적용).
--   한국어(push_message_templates / push_winback / Edge Function 하드코딩)와 분리된 세트.
--   번역이 아니라 톤 재설계(가벼운 듀오링고식 유머, 죄책감·경쟁 유도 없음).
--   category 값은 한국어 테이블과 동일 → 서버는 언어만 보고 테이블을 고르면 됨.
--   한국어에 없는 category: winback_1~4(push_winback 대응), trial_expiry(하드코딩 대응).
--
--   title 규칙
--     - 훈련 이름 title(Chord Quiz / Scale Blocks / Chord Loops / Strumming Patterns / Reharm Quiz)
--       = 목적지. 한국어 쪽 deeplinkByTitle() 불변식과 같은 의미이므로 서버는
--       영어 title → 훈련 키 매핑을 따로 가져야 함.
--     - nudge_* 는 훈련을 지칭하지 않는 중립 title 만 사용.
--
--   placeholder (한국어 토큰 대응)
--     {name}        {닉네임}      호칭은 대괄호로 감쌈: "[{name}, ]your week…", "Psst[, {name}]"
--                                 닉네임이 있으면 대괄호만 벗기고, 없으면 그 구간을 통째로 뺌
--     {training}    {훈련명}      용어집 영어 이름
--     {pick}        {추천컨텐츠}  용어집 영어 이름
--     {level}       {레벨명}      "Level 3: <이름>" (따옴표 없음)
--     {next_level}  {다음레벨명}  (코드 맞추기)
--     {challenge}   {챌린지명}    관사 없이. 본문이 "the {challenge}" 로 씀
--     {scale}       {스케일명}    앱 화면(locales/en)과 같은 이름
--     {next_scale}  {다음레벨명}  (스케일)
--     {level_short} {레벨}        "Level 3" / "Chapter 3"
--     {n}           {N}
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_templates_en (
  id         bigint generated always as identity primary key,
  category   text        not null,
  title      text        not null,
  body       text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create index if not exists push_templates_en_category_idx
  on public.push_templates_en (category) where active;

-- 정책 없이 RLS 만 켬 → anon/로그인 유저는 읽기·쓰기 불가, Edge Function(service_role)만 접근.
alter table public.push_templates_en enable row level security;

-- 재실행 안전: 전부 지우고 다시 채움
delete from public.push_templates_en;

insert into public.push_templates_en (category, title, body) values

-- ── 일반 넛지 ──────────────────────────────────────────────
('nudge_repeat', 'Your guitar misses you',
 'It''s been staring at you all day. Give it 5 minutes of {training}?'),
('nudge_repeat', 'Hey[ {name}] 👋',
 '{training} called. It wants a rematch.'),
('nudge_repeat', '5 minutes. That''s it.',
 'One quick round of {training}. Your fingers will thank you.'),
('nudge_repeat', 'Psst[, {name}]',
 'You were on a roll with {training}. Don''t let it cool off.'),

('nudge_persona', 'Your guitar is getting dusty',
 'Kidding. Mostly. How about some {pick} today?'),
('nudge_persona', 'Today''s pick 🎸',
 '{pick}. No reason. We just have a good feeling about it.'),
('nudge_persona', 'We picked this for you',
 '{pick}[, {name}]. It fits where you''re at right now.'),
('nudge_persona', 'Calluses don''t build themselves',
 'A little {pick} today keeps them honest.'),

-- ── 중단인지형 ─────────────────────────────────────────────
('quiz_abandoned', 'Chord Quiz', '{level} is still open. It''s been wondering where you went.'),
('quiz_abandoned', 'Chord Quiz', 'You walked out on {level} mid-round. Bold move. Finish it?'),
('quiz_abandoned', 'Chord Quiz', 'Snack break over? {level} saved your spot.'),

('scale_abandoned', 'Scale Blocks', '{scale} is right where you left it. Pick it back up?'),
('scale_abandoned', 'Scale Blocks', 'You hit pause on {scale}. It''s still paused. Awkward.'),
('scale_abandoned', 'Scale Blocks', '{scale}, half done. Finish the run?'),
('scale_abandoned', 'Scale Blocks', 'Your fingers still remember {scale}. Prove it.'),
('scale_abandoned', 'Scale Blocks', '[{name}, ]you''re one push away from finishing {scale}.'),

-- ── 성적형 · 코드 맞추기 ───────────────────────────────────
('quiz_level_up', 'Chord Quiz', 'You''ve basically memorized {level}. Time to move on.'),
('quiz_level_up', 'Chord Quiz', '{level} isn''t even trying to stop you anymore. Next level''s ready.'),
('quiz_level_up', 'Chord Quiz', '{level} got too easy, didn''t it? New chords are waiting.'),
('quiz_level_up', 'Chord Quiz', 'Those {level} chords live in your head rent-free now 😀 Level up?'),
('quiz_level_up', 'Chord Quiz', 'Your {level} accuracy is showing off. Go pick on {next_level}.'),

('quiz_challenge', 'Chord Quiz', 'Not everyone gets this far. The {challenge} just unlocked for you.'),
('quiz_challenge', 'Chord Quiz', 'You''re solid through {level}. The {challenge} wants proof.'),
('quiz_challenge', 'Chord Quiz', 'You''ve earned a shot at the {challenge}. No pressure. (Some pressure.)'),
('quiz_challenge', 'Chord Quiz', 'Those {level} scores? Not normal. In a good way. Try the {challenge}.'),
('quiz_challenge', 'Chord Quiz', 'The {challenge} has been asking about you.'),

('quiz_reinforce', 'Chord Quiz', 'A quick look at Preview first makes the whole round easier. Promise.'),
('quiz_reinforce', 'Chord Quiz', 'Try playing the {level} chords on your guitar. Hands remember faster than eyes.'),
('quiz_reinforce', 'Chord Quiz', '{level} is a tough one. Everyone trips here. One more go?'),
('quiz_reinforce', 'Chord Quiz', '{level} got a little tangled? Preview will straighten it out.'),
('quiz_reinforce', 'Chord Quiz', 'Slow and right beats fast and wrong. Another pass at {level}?'),

-- ── 성적형 · 스케일 ────────────────────────────────────────
('scale_level_up', 'Scale Blocks', 'Your {scale} accuracy is looking sharp. {next_scale} is up next.'),
('scale_level_up', 'Scale Blocks', '[{name}, ]your {scale} keeps getting cleaner. Ready for {next_scale}?'),
('scale_level_up', 'Scale Blocks', '{scale} feels like home now, doesn''t it? Go meet {next_scale}.'),
('scale_level_up', 'Scale Blocks', 'Your recent runs say you''re ready. Next stop: {next_scale}.'),
('scale_level_up', 'Scale Blocks', '[{name}, ]you''ve been steady on {scale}. Time to unlock {next_scale}.'),

('scale_reinforce', 'Scale Blocks', '{scale} got a little slippery lately. One more pass?'),
('scale_reinforce', 'Scale Blocks', '[{name}, ]{scale} is almost there. Let''s tighten it up.'),
('scale_reinforce', 'Scale Blocks', 'The fretboard takes a while to feel familiar. Revisit {scale}?'),
('scale_reinforce', 'Scale Blocks', 'No rush. Take {scale} one more time, nice and slow.'),
('scale_reinforce', 'Scale Blocks', '[{name}, ]this one''s all about reps. Run it again?'),

-- ── 연동형 · 코드 맞추기 → 다른 훈련 ───────────────────────
('quiz_link_scale', 'Scale Blocks', '{level} chords: nailed. Ready to touch some melody? Try Scale Blocks.'),
('quiz_link_scale', 'Scale Blocks', 'Guitar solos look cool, right? Scale Blocks is where they start.'),
('quiz_link_scale', 'Scale Blocks', 'Chords are great. Chords plus a solo? Even better. Try Scale Blocks.'),
('quiz_link_scale', 'Scale Blocks', 'You made it to {level}. Time to flirt with improvising. Scale Blocks is waiting.'),
('quiz_link_scale', 'Scale Blocks', 'Want to rip a solo in front of your friends someday? It starts with Scale Blocks.'),
('quiz_link_scale', 'Scale Blocks', 'Chords make the backing. Scales make the melody. Your solo starts here.'),

('quiz_link_progression', 'Chord Loops', 'Want those chords to sound like an actual song? String them together in Chord Loops.'),
('quiz_link_progression', 'Chord Loops', 'Your {level} chords are way more fun in a row. Try them in Chord Loops.'),
('quiz_link_progression', 'Chord Loops', 'Memorizing alone gets lonely. Take those chords for a spin in Chord Loops.'),
('quiz_link_progression', 'Chord Loops', 'That feeling of playing a whole song? Chord Loops has it.'),
('quiz_link_progression', 'Chord Loops', 'Curious where those chords actually get used? Chord Loops will show you.'),
('quiz_link_progression', 'Chord Loops', 'Playing along without a chart is a real skill. Chord Loops builds it.'),
('quiz_link_progression', 'Chord Loops', 'Know those people who hear a song and just play it? Chord Loops is their secret.'),
('quiz_link_progression', 'Chord Loops', 'Done hunting for chord charts? Chord Loops is the shortcut.'),

('quiz_link_strum', 'Strumming Patterns', 'We''ve got a room just for rhythm. Check out Strumming Patterns.'),
('quiz_link_strum', 'Strumming Patterns', 'Start slow, lock in the groove. Strumming Patterns lets you practice rhythm on its own.'),
('quiz_link_strum', 'Strumming Patterns', 'Put the chords down for a sec. Your strumming hand wants some attention.'),
('quiz_link_strum', 'Strumming Patterns', 'Start slow, speed up as it clicks. That''s how Strumming Patterns works.'),
('quiz_link_strum', 'Strumming Patterns', 'Just want to drill the strum? Strumming Patterns is ready when you are.'),

('quiz_link_combo', 'Reharm Quiz', 'Great songs always have that one chord move, right? The secret''s smaller than you think. Reharm Quiz shows you.'),
('quiz_link_combo', 'Reharm Quiz', '"Harmony" sounds scary. Dragging chords around in a quiz? Not so much.'),
('quiz_link_combo', 'Reharm Quiz', 'No theory deep-dive needed. Swap a few chords in a quiz and you''ll start hearing arrangements.'),
('quiz_link_combo', 'Reharm Quiz', 'People who figure out songs by ear aren''t wizards. They just know a few patterns.'),
('quiz_link_combo', 'Reharm Quiz', 'Skip the textbook. Place chords, swap them, and let your ears learn it.'),
('quiz_link_combo', 'Reharm Quiz', 'Why does this chord sound right after that one? A few quizzes and it clicks.'),
('quiz_link_combo', 'Reharm Quiz', 'That "hidden" theory knowledge? A few rounds in and it''s not hidden anymore.'),
('quiz_link_combo', 'Reharm Quiz', 'Arranging and songwriting felt out of reach? Get your hands on it in Reharm Quiz.'),

-- ── 연동형 · 스케일 → 다른 훈련 ────────────────────────────
('scale_link_quiz', 'Chord Quiz', 'Scales all day gets tiring. Take a breather with Chord Quiz.'),
('scale_link_quiz', 'Chord Quiz', '[{name}, ]you went deep on scales today. Cool down with Chord Quiz {level_short}?'),
('scale_link_quiz', 'Chord Quiz', 'Eyes tired from staring at the fretboard? Chord Quiz is a nice change of scenery.'),
('scale_link_quiz', 'Chord Quiz', 'You put in the scale work. Chord Quiz is your palate cleanser.'),
('scale_link_quiz', 'Chord Quiz', '[{name}, ]rest those fingers. How about Chord Quiz {level_short}?'),

('scale_link_progression', 'Chord Loops', 'Lay that scale over a chord loop and it suddenly makes sense.'),
('scale_link_progression', 'Chord Loops', '[{name}, ]scales alone only go so far. Put them over chords and they become real.'),
('scale_link_progression', 'Chord Loops', 'Know the chords and you''ll see exactly where your scale fits. Take a look?'),
('scale_link_progression', 'Chord Loops', '[{name}, ]wonder how today''s scale works in an actual loop?'),
('scale_link_progression', 'Chord Loops', 'Scales + chord loops = actually using them. Keep it going?'),

('scale_link_strum', 'Strumming Patterns', 'Scaled out? Take a rhythm break.'),
('scale_link_strum', 'Strumming Patterns', 'Stop staring at the fretboard. Let your strumming hand have a turn.'),
('scale_link_strum', 'Strumming Patterns', '[{name}, ]forget finger positions for a minute. Just groove.'),
('scale_link_strum', 'Strumming Patterns', '[{name}, ]solid scale work today. Wrap up with some easy strumming?'),
('scale_link_strum', 'Strumming Patterns', 'Set the scales down. Fill up on rhythm.'),

('scale_link_combo', 'Reharm Quiz', '[{name}, ]scales plus diatonic chords? Now that''s a real weapon.'),
('scale_link_combo', 'Reharm Quiz', 'Scales are half the story. Reharm Quiz {level_short} gives you the other half.'),
('scale_link_combo', 'Reharm Quiz', '[{name}, ]learn diatonic chords and you''ll see why that scale fits.'),
('scale_link_combo', 'Reharm Quiz', 'Meet your scale''s harmonic partner in Reharm Quiz {level_short}.'),
('scale_link_combo', 'Reharm Quiz', 'After scales comes harmony. Continue with Reharm Quiz?'),

-- ── 적극형 (주간 결산) ─────────────────────────────────────
('quiz_active_continue', 'Your week in review',
 '[{name}, ]your weekly recap is in. You put in {n}x the average on {training} 💪 Keep it rolling?'),
('quiz_active_continue', 'Your week in review',
 '[{name}, ]weekly recap! You finished {n}x the average on {training}. Same energy next week?'),
('quiz_active_continue', 'Your week in review',
 '[{name}, ]the numbers are in: {n}x the average on {training}. Consistency is the whole game.'),
('quiz_active_continue', 'Your week in review',
 '[{name}, ]you were {n}x more committed to {training} than most 🔥 Keep this up and you''ll feel it fast.'),

('quiz_active_recommend', 'Your week in review',
 '[{name}, ]your weekly recap is in. {n}x the average on {training} 💪 Want to give {pick} a try too?'),
('quiz_active_recommend', 'Your week in review',
 '[{name}, ]weekly recap! {n}x the average on {training}. Add some {pick} and you''re set.'),
('quiz_active_recommend', 'Your week in review',
 '[{name}, ]the numbers are in: {n}x the average on {training}. Curious about {pick}?'),
('quiz_active_recommend', 'Your week in review',
 '[{name}, ]{n}x more committed to {training} than most 🔥 Imagine that energy on {pick}.'),

('quiz_active_high_continue', 'Your week in review',
 '[{name}, ]whoa. {n}x the average on {training} this week. That''s seriously impressive 👏 Keep the streak alive?'),
('quiz_active_high_continue', 'Your week in review',
 '[{name}, ]{n}x on {training}?! You meant business this week 🔥 Can''t wait to see next week.'),

('quiz_active_high_recommend', 'Your week in review',
 '[{name}, ]whoa. {n}x the average on {training} this week 👏 Bring that fire to {pick}?'),
('quiz_active_high_recommend', 'Your week in review',
 '[{name}, ]{n}x on {training}?! You meant business 🔥 Add {pick} and this month is yours.'),

-- ── 윈백 (push_winback stage 1~4 대응, 목적지=홈) ──────────
('winback_1', 'Quick guitar break? 🎸', 'Hey, it''s been a few days. Grab a chord with us?'),
('winback_1', 'Quick guitar break? 🎸', 'Stop by and loosen up those fingers.'),
('winback_1', 'Quick guitar break? 🎸', 'Three minutes. One tune. That''s all we''re asking.'),
('winback_1', 'Quick guitar break? 🎸', 'It''s been a few days. You still remember your chords, right? 😉'),

('winback_2', 'Still here for you', 'Haven''t seen you in a bit. Ease back in whenever you''re ready.'),
('winback_2', 'Still here for you', 'A few days off is fine. Today''s a great day to come back.'),
('winback_2', 'Still here for you', 'Quick check: any chords slip away while you were gone?'),
('winback_2', 'Still here for you', 'One song today. Nice and easy 🎸'),

('winback_3', 'Long time no see', 'How''ve you been? Your guitar''s still there, right?'),
('winback_3', 'Long time no see', 'It''s been a month. Let''s see if your hands remember.'),
('winback_3', 'Long time no see', 'Starting again small is totally fine 🌱'),
('winback_3', 'Long time no see', 'Just a minute or two. Pick it back up?'),

('winback_4', 'Did you forget about us? 🥺', 'Your guitar''s collecting dust. It''s being very dramatic about it 😢'),
('winback_4', 'Did you forget about us? 🥺', 'We''re starting to think you''re ghosting us. One more chance? 🥹'),
('winback_4', 'Did you forget about us? 🥺', 'So… is this how it ends?'),
('winback_4', 'Did you forget about us? 🥺', 'You were getting good. Seems a shame to stop. Just once more.'),
('winback_4', 'Did you forget about us? 🥺', 'Somewhere, a chord still remembers your fingers 🥺'),
('winback_4', 'Did you forget about us? 🥺', 'Okay, last one. Play a single chord for old times'' sake?'),

-- ── 단건 ───────────────────────────────────────────────────
('peak_full', 'Your picks are full!', 'All 30 picks, ready to go. Time to play.'),
('trial_expiry', 'Your Pro trial ends soon', 'Your 7-day trial wraps up tomorrow. Make the most of what''s left!')
;

-- 확인: select category, count(*) from push_templates_en group by 1 order by 1;
