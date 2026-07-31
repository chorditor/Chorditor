-- ───────────────────────────────────────────────────────────
-- push_nudge_messages.sql : 일반넛지 문구(3순위, 다른 조건 미해당자 캐치올).
--   nudge_repeat  — 마지막에 한 훈련 한 번 더 유도.  placeholder: {닉네임} {훈련명}
--   nudge_persona — 페르소나별 추천.                placeholder: {닉네임} {추천컨텐츠}
--   title 은 발송 시 딥링크 대상 훈련명으로 덮어씀(push-dispatch 의 title=목적지 불변식).
-- ───────────────────────────────────────────────────────────

delete from public.push_message_templates
where category in ('nudge_repeat', 'nudge_persona');

insert into public.push_message_templates (category, title, body) values
('nudge_repeat', '(발송시 훈련명으로 자동설정)',
 E'마지막에 {훈련명}을 하셨네요!\n한 번 더 학습해보는 건 어떨까요?'),
('nudge_repeat', '(발송시 훈련명으로 자동설정)',
 E'{닉네임}님, 지난번 {훈련명} 기억나시죠?\n오늘 한 번만 더 복습해볼까요?'),
('nudge_repeat', '(발송시 훈련명으로 자동설정)',
 E'{훈련명}, 이어서 해볼까요?\n딱 5분만 잡아도 감이 살아나요'),
('nudge_repeat', '(발송시 훈련명으로 자동설정)',
 E'{닉네임}님의 마지막 훈련은 {훈련명}이었어요\n오늘도 가볍게 한 판 어떠세요?'),

('nudge_persona', '(발송시 훈련명으로 자동설정)',
 E'{닉네임}님, 오늘은 {추천컨텐츠}를 해보는 건 어떨까요!'),
('nudge_persona', '(발송시 훈련명으로 자동설정)',
 E'오늘의 랜덤 훈련!\n{추천컨텐츠}가 무난할 거예요'),
('nudge_persona', '(발송시 훈련명으로 자동설정)',
 E'{닉네임}님께 딱 맞는 훈련을 골라봤어요\n오늘은 {추천컨텐츠} 어떠세요?'),
('nudge_persona', '(발송시 훈련명으로 자동설정)',
 E'기타 잡기 좋은 시간이에요 🎸\n{추천컨텐츠}로 가볍게 시작해볼까요?');
