-- ───────────────────────────────────────────────────────────
-- push_nudge_messages.sql : 일반넛지 문구(3순위, 다른 조건 미해당자 캐치올).
--   nudge_repeat  — 마지막에 한 훈련 한 번 더 유도.  placeholder: {닉네임} {훈련명}
--   nudge_persona — 페르소나별 추천.                placeholder: {닉네임} {추천컨텐츠}
--   title 은 DB 값을 그대로 사용. 훈련명을 지칭하지 않는 중립 문구만 쓸 것 —
--   딥링크 대상은 유저의 마지막/추천 훈련이라 title 이 특정 훈련을 지칭하면
--   "오늘 퀴즈 어때요?" → 스케일 훈련으로 이동 같은 불일치가 생김.
-- ───────────────────────────────────────────────────────────

delete from public.push_message_templates
where category in ('nudge_repeat', 'nudge_persona');

insert into public.push_message_templates (category, title, body) values
('nudge_repeat', '기다리고 있었어요',
 E'마지막에 {훈련명}을 하셨네요!\n한 번 더 학습해보는 건 어떨까요?'),
('nudge_repeat', '오늘도 한 걸음 🎸',
 E'{닉네임}님, 지난번 {훈련명} 기억나시죠?\n오늘 한 번만 더 복습해볼까요?'),
('nudge_repeat', '잠깐, 5분만 어때요?',
 E'{훈련명}, 이어서 해볼까요?\n딱 5분만 잡아도 감이 살아나요'),
('nudge_repeat', '짧게라도 괜찮아요',
 E'{닉네임}님의 마지막 훈련은 {훈련명}이었어요\n오늘도 가볍게 한 판 어떠세요?'),

('nudge_persona', '기타 잡아볼까요?',
 E'{닉네임}님, 오늘은 {추천컨텐츠}를 해보는 건 어떨까요!'),
('nudge_persona', '오늘도 한 걸음 🎸',
 E'오늘의 랜덤 훈련!\n{추천컨텐츠}가 무난할 거예요'),
('nudge_persona', '기타 잡아볼까요?',
 E'{닉네임}님께 딱 맞는 훈련을 골라봤어요\n오늘은 {추천컨텐츠} 어떠세요?'),
('nudge_persona', '짧게라도 괜찮아요',
 E'기타 잡기 좋은 시간이에요 🎸\n{추천컨텐츠}로 가볍게 시작해볼까요?');
