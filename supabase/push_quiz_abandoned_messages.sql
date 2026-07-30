-- ───────────────────────────────────────────────────────────
-- push_quiz_abandoned_messages.sql
-- 코드맞추기 '중단 인지형(패턴2)' 넛지 문구 등록 — push_message_templates 재사용.
--   category: quiz_abandoned
--   {레벨명}은 fillQuizPlaceholders()에서 이미 '레벨N - 이름' 형태로 작은따옴표까지
--   포함해 치환되므로, 여기 본문엔 따옴표를 따로 넣지 않음(이중따옴표 방지).
-- ───────────────────────────────────────────────────────────

-- 재실행 안전: 기존 행 지우고 다시 채움(중복 누적 방지)
delete from public.push_message_templates
where category = 'quiz_abandoned';

insert into public.push_message_templates (category, title, body) values
('quiz_abandoned', '코드 맞추기', '{레벨명} 풀던 중이셨네요! 다시 도전해볼까요?'),
('quiz_abandoned', '코드 맞추기', '{레벨명} 마저 끝내지 못하셨나 봐요. 잠깐 시간 되실 때 다시 해봐요!'),
('quiz_abandoned', '코드 맞추기', '잠깐 자리 비우셨나 봐요, {레벨명} 다시 도전해보세요!')
;
