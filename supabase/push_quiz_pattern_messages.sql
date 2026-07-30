-- ───────────────────────────────────────────────────────────
-- push_quiz_pattern_messages.sql
-- 코드맞추기 '성적형(패턴4)' 넛지 문구 등록 — push_message_templates 재사용.
--   category: quiz_level_up(다음레벨) / quiz_challenge(챌린지 초대) / quiz_reinforce(재정비)
--   본문에 {레벨명}/{다음레벨명}/{챌린지명} 플레이스홀더 포함 → 발송 시 Edge Function에서 치환.
--   문구 추가/삭제는 Table Editor에서 직접 행 추가·active 토글로 관리(코드 배포 불필요).
-- ───────────────────────────────────────────────────────────

-- 재실행 안전: 이 3개 category 기존 행 지우고 다시 채움(중복 누적 방지)
delete from public.push_message_templates
where category in ('quiz_level_up', 'quiz_challenge', 'quiz_reinforce');

insert into public.push_message_templates (category, title, body) values
('quiz_level_up', '코드 맞추기', '{레벨명}, 완전히 익히셨네요! 다음 레벨로 넘어가볼까요?'),
('quiz_level_up', '코드 맞추기', '{레벨명}은/는 이제 익숙해지셨나 봐요. 다음 단계 준비됐어요!'),
('quiz_level_up', '코드 맞추기', '{레벨명}은/는 이제 쉬우신 것 같아요! 다음 코드들도 외워봐요!'),
('quiz_level_up', '코드 맞추기', '{레벨명}의 코드들은 충분히 외우신 것 같네요😀 다음 레벨 도전해봐요!'),
('quiz_level_up', '코드 맞추기', '{레벨명} 정답률이 충분히 높아요! {다음레벨명}에 도전해보는 건 어때요~?'),

('quiz_challenge', '코드 맞추기', '여기까지 오신 분들만 만나는 {챌린지명}에 도전해보시겠어요?'),
('quiz_challenge', '코드 맞추기', '{레벨명}까지는 탄탄하시네요! {챌린지명}로 실력을 확인해보세요!'),
('quiz_challenge', '코드 맞추기', '이 정도면 {챌린지명}에 도전할 자격 충분해요!!'),
('quiz_challenge', '코드 맞추기', '{레벨명}에서 이 정도는 아무나 못해요...! {챌린지명}에 도전할 타이밍이에요!'),
('quiz_challenge', '코드 맞추기', '{챌린지명}에 도전하실 자격이 충분해요!'),

('quiz_reinforce', '코드 맞추기', '예습하기로 코드들을 한 번 더 다지고 가면 훨씬 편해질 거예요!'),
('quiz_reinforce', '코드 맞추기', '{레벨명}에 나오는 코드를 직접 잡아보면 외우기가 편해질 거예요!'),
('quiz_reinforce', '코드 맞추기', '{레벨명}이 아직 조금 어려우신가 봐요. 괜찮아요! 한 번 더 도전해봐요!'),
('quiz_reinforce', '코드 맞추기', '{레벨명}이 조금 헷갈리셨나 봐요. 예습하기에서 코드를 다시 외워보아요!'),
('quiz_reinforce', '코드 맞추기', '속도보다 중요한 건 확실히 익히는 거죠! {레벨명} 다시 한 번 어때요?')
;
