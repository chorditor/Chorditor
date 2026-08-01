-- push_scale_pattern_messages.sql : 스케일 성적형(4번) 문구.
-- scale_level_up: {스케일명} {닉네임} {다음레벨명} / scale_reinforce: {스케일명} {닉네임}

delete from public.push_message_templates
where category in ('scale_level_up', 'scale_reinforce');

insert into public.push_message_templates (category, title, body) values
('scale_level_up', '스케일 훈련',
 E'최근 {스케일명} 정답률이 좋으시네요! {다음레벨명}로 넘어가볼까요?'),
('scale_level_up', '스케일 훈련',
 E'{닉네임}님, 요즘 {스케일명} 실력이 늘고 있어요 — {다음레벨명} 어때요?'),
('scale_level_up', '스케일 훈련',
 E'{스케일명}는 이제 익숙해지신 것 같아요, {다음레벨명}도 도전해볼까요?'),
('scale_level_up', '스케일 훈련',
 E'최근 기록을 보니 다음 단계로 가도 되겠어요 — {다음레벨명}'),
('scale_level_up', '스케일 훈련',
 E'{닉네임}님, {스케일명} 꾸준히 잘하고 계세요! {다음레벨명}로 넘어가봐요'),

('scale_reinforce', '스케일 훈련',
 E'최근 {스케일명}이 조금 헷갈리시나 봐요, 한 번 더 익혀볼까요?'),
('scale_reinforce', '스케일 훈련',
 E'{닉네임}님, 요즘 {스케일명}가 살짝 아쉬워요 — 다시 짚어볼까요?'),
('scale_reinforce', '스케일 훈련',
 E'지판 위치가 아직 낯설 수 있어요, {스케일명} 복습해볼까요?'),
('scale_reinforce', '스케일 훈련',
 E'{스케일명}, 급하지 않게 다시 확인해봐요'),
('scale_reinforce', '스케일 훈련',
 E'{닉네임}님, 이 스케일은 반복이 답이에요 — 한 번 더 해볼까요?');
