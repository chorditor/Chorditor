-- push_scale_abandoned_messages.sql : 스케일 중단인지형(2번) 문구.
-- title='스케일 훈련' 고정(목적지가 항상 스케일 자신 — 딥링크 불변식).
-- placeholder: {스케일명} {닉네임}

delete from public.push_message_templates where category = 'scale_abandoned';

insert into public.push_message_templates (category, title, body) values
('scale_abandoned', '스케일 훈련',
 E'{스케일명} 풀던 중이셨네요! 다시 이어서 해볼까요?'),
('scale_abandoned', '스케일 훈련',
 E'잠깐 멈추셨던 {스케일명}, 마저 끝내볼까요?'),
('scale_abandoned', '스케일 훈련',
 E'{스케일명}, 반쯤 하다 마셨어요! 완주해볼까요?'),
('scale_abandoned', '스케일 훈련',
 E'{스케일명} 손가락이 아직 기억하고 있을 거예요, 이어가볼까요?'),
('scale_abandoned', '스케일 훈련',
 E'{닉네임}님, {스케일명} 마무리만 남았어요!');
