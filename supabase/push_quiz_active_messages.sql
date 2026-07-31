-- ───────────────────────────────────────────────────────────
-- push_quiz_active_messages.sql : 5번(적극형) 주간 결산 문구.
--   category 2종으로 나눠 50:50 랜덤 픽(Edge Function에서 코인플립 후 카테고리 선택):
--     quiz_active_continue  — 하던 훈련 계속 유도
--     quiz_active_recommend — 가장 안 한 훈련 추천
--   placeholder: {닉네임} {훈련명} {N} {추천컨텐츠}
-- ───────────────────────────────────────────────────────────

delete from public.push_message_templates
where category in ('quiz_active_continue', 'quiz_active_recommend');

insert into public.push_message_templates (category, title, body) values
('quiz_active_continue', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n타 유저보다 {훈련명}을 {N}배 더 노력하셨어요 💪\n이 기세로 계속 이어가볼까요?'),
('quiz_active_continue', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n{훈련명}, 타 유저 평균의 {N}배나 완료하셨네요!\n다음 주도 이 페이스 기대할게요'),
('quiz_active_continue', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n이번 주 {훈련명} 완료량, 타 유저 대비 {N}배예요\n꾸준함이 진짜 실력이 됩니다'),
('quiz_active_continue', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n{훈련명}에 타 유저보다 {N}배 더 진심이셨어요 🔥\n이대로만 하면 금방 늘겠어요'),

('quiz_active_recommend', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n타 유저보다 {훈련명}을 {N}배 더 노력하셨어요 💪\n이번엔 {추천컨텐츠}도 한번 해볼까요?'),
('quiz_active_recommend', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n{훈련명}, 타 유저 평균의 {N}배나 완료하셨네요!\n{추천컨텐츠}까지 더하면 완벽할 듯해요'),
('quiz_active_recommend', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n이번 주 {훈련명} 완료량, 타 유저 대비 {N}배예요\n다른 훈련({추천컨텐츠})도 궁금하지 않으세요?'),
('quiz_active_recommend', '이번 주 결산',
 E'{닉네임}님의 1주일 결산 보고!\n{훈련명}에 타 유저보다 {N}배 더 진심이셨어요 🔥\n{추천컨텐츠}도 이 정도로 해보면 어떨까요?');
