-- ───────────────────────────────────────────────────────────
-- drop_subscriptions_persona.sql : subscriptions.persona 컬럼 삭제.
--   user_persona_profile.persona로 완전히 대체됨(2026-08-31). 온보딩 관문
--   (checkNeedsOnboarding)·온보딩 저장(_saveOnboardingData)·프로필 표시
--   (loadProfileFromDB)·배치스크립트(compute-persona-profile.js) 전부
--   코드 수정 완료 후에 돌릴 것 — 순서 반대로 하면 온보딩 관문이 깨짐.
--
--   friend_subscriptions/pure_subscriptions 뷰가 persona를 단순 통과컬럼으로만
--   갖고 있어서(WHERE절엔 미사용) CASCADE로 같이 지우고 persona 뺀 채 재생성한다.
-- ───────────────────────────────────────────────────────────

alter table public.subscriptions drop column if exists persona cascade;

create view public.friend_subscriptions as
SELECT id, user_id, nickname, plan, status, current_period_end, cancel_at_period_end,
    created_at, updated_at, guitar_experience, gender, onboarding_completed_at,
    birth_year, stat_images, stat_shares, consent_agreed_at, streak, training_time_min,
    total_completed, streak_synced_date, review_rated, peak_balance, peak_updated_at,
    peakbox_count, attendance_claimed_date, att_day, att_last_date, att_makeup_left,
    att_total, att_quest_claimed, img_quest_claimed, stat_notes, note_quest_claimed,
    share_quest_claimed, time_quest_claimed, quiz_quest_claimed, perfect_claimed,
    challenge_perfect, challenge_claimed, scale_completed, scale_quest_claimed,
    scale_cleared, scale_lvl_quest_claimed, scale_perfect, scale_perfect_claimed,
    user_xp, progression_completed, progression_quest_claimed, strum_completed,
    strum_quest_claimed, peak_full_notified_at, event_130_claimed, quiz_lvl_quest_claimed
   FROM subscriptions
  WHERE (user_id = ANY (ARRAY['316fae6d-3a51-4958-b5a9-fab6ddb0d056'::uuid, 'e9d9e05b-2db1-426c-ba0e-016079db55da'::uuid, 'b9e7a7bb-a1b7-48af-beef-761f01e1bc0c'::uuid, '670dccca-b0bc-4ffa-9eb2-07380dcea27e'::uuid, 'ac04c12e-66e9-428b-b82a-e4b32469db99'::uuid, 'f8ba9c70-6d72-4e3a-99fb-99527d403119'::uuid, '753cd87a-8bd7-4e28-b241-30b2a3652399'::uuid, 'c159ae4b-c68d-4eb2-95e6-773ca742aead'::uuid, '143b4030-46aa-4e0b-8f02-8354552252ae'::uuid, '88e07c9c-e7c7-4a1b-a2bc-fa0416c89293'::uuid, 'cadf1696-7408-434a-b812-187f2ce41727'::uuid, '5932a6a2-6d8f-4b0c-9b5c-e0841352d50a'::uuid, '6f4d0222-1bb5-41b7-a655-cd62aef59417'::uuid, '55b63a47-58f4-4cdb-b426-7f20410e3543'::uuid, '381ef69f-208f-4505-97cc-8b53c09ea567'::uuid, 'a6ab5bb5-4237-4f3f-bc4b-d726b19f947a'::uuid, '431ab6b1-9813-4621-823b-638e6122694a'::uuid, '1027cbe2-d662-4ec5-bfa1-1803ca4c3fd7'::uuid, 'e6c11626-0c74-4417-b554-52c0c7b9bdac'::uuid, 'c8feb216-bcd0-4170-838f-20bf8c8fc6fd'::uuid, '672b598d-0883-4f70-bee9-f214a32937f4'::uuid, 'f6c8cb03-11c4-43a9-b316-41c20644990d'::uuid, 'fadcc93a-7eb0-4be1-ba9b-006339a06c56'::uuid, 'ab45b1d0-c70e-4848-9281-36592833a2ac'::uuid, 'c806c2ca-7ad1-4268-ae9d-a2e4e93665e5'::uuid, '81f2fb01-53dd-4f93-bfa9-122b145c773d'::uuid, 'baf1098a-31df-45c7-990d-8767ed84b15a'::uuid, 'a0f5e55b-ce8f-4e14-912b-6274266a9913'::uuid, '66d3165b-565b-4a47-8920-4792ff438757'::uuid, '55d99431-3e2a-4312-803e-3409ea8e6bfe'::uuid, '7f4ae1d4-26bc-45a1-b3d5-1aa2ee219079'::uuid]));

create view public.pure_subscriptions as
SELECT id, user_id, nickname, plan, status, current_period_end, cancel_at_period_end,
    created_at, updated_at, guitar_experience, gender, onboarding_completed_at,
    birth_year, stat_images, stat_shares, consent_agreed_at, streak, training_time_min,
    total_completed, streak_synced_date, review_rated, peak_balance, peak_updated_at,
    peakbox_count, attendance_claimed_date, att_day, att_last_date, att_makeup_left,
    att_total, att_quest_claimed, img_quest_claimed, stat_notes, note_quest_claimed,
    share_quest_claimed, time_quest_claimed, quiz_quest_claimed, perfect_claimed,
    challenge_perfect, challenge_claimed, scale_completed, scale_quest_claimed,
    scale_cleared, scale_lvl_quest_claimed, scale_perfect, scale_perfect_claimed,
    user_xp, progression_completed, progression_quest_claimed, strum_completed,
    strum_quest_claimed, peak_full_notified_at, event_130_claimed, quiz_lvl_quest_claimed
   FROM subscriptions
  WHERE (user_id <> ALL (ARRAY['316fae6d-3a51-4958-b5a9-fab6ddb0d056'::uuid, 'e9d9e05b-2db1-426c-ba0e-016079db55da'::uuid, 'b9e7a7bb-a1b7-48af-beef-761f01e1bc0c'::uuid, '670dccca-b0bc-4ffa-9eb2-07380dcea27e'::uuid, 'ac04c12e-66e9-428b-b82a-e4b32469db99'::uuid, 'f8ba9c70-6d72-4e3a-99fb-99527d403119'::uuid, '753cd87a-8bd7-4e28-b241-30b2a3652399'::uuid, 'c159ae4b-c68d-4eb2-95e6-773ca742aead'::uuid, '143b4030-46aa-4e0b-8f02-8354552252ae'::uuid, '88e07c9c-e7c7-4a1b-a2bc-fa0416c89293'::uuid, 'cadf1696-7408-434a-b812-187f2ce41727'::uuid, '5932a6a2-6d8f-4b0c-9b5c-e0841352d50a'::uuid, '6f4d0222-1bb5-41b7-a655-cd62aef59417'::uuid, '55b63a47-58f4-4cdb-b426-7f20410e3543'::uuid, '381ef69f-208f-4505-97cc-8b53c09ea567'::uuid, 'a6ab5bb5-4237-4f3f-bc4b-d726b19f947a'::uuid, '431ab6b1-9813-4621-823b-638e6122694a'::uuid, '1027cbe2-d662-4ec5-bfa1-1803ca4c3fd7'::uuid, 'e6c11626-0c74-4417-b554-52c0c7b9bdac'::uuid, 'c8feb216-bcd0-4170-838f-20bf8c8fc6fd'::uuid, '672b598d-0883-4f70-bee9-f214a32937f4'::uuid, 'f6c8cb03-11c4-43a9-b316-41c20644990d'::uuid, 'fadcc93a-7eb0-4be1-ba9b-006339a06c56'::uuid, 'ab45b1d0-c70e-4848-9281-36592833a2ac'::uuid, 'c806c2ca-7ad1-4268-ae9d-a2e4e93665e5'::uuid, '81f2fb01-53dd-4f93-bfa9-122b145c773d'::uuid, 'baf1098a-31df-45c7-990d-8767ed84b15a'::uuid, 'a0f5e55b-ce8f-4e14-912b-6274266a9913'::uuid, '66d3165b-565b-4a47-8920-4792ff438757'::uuid, '55d99431-3e2a-4312-803e-3409ea8e6bfe'::uuid, '7f4ae1d4-26bc-45a1-b3d5-1aa2ee219079'::uuid]));

-- 확인: select column_name from information_schema.columns where table_name='subscriptions' and column_name='persona'; (0행이면 성공)
-- 확인2: select * from friend_subscriptions limit 1; select * from pure_subscriptions limit 1; (정상 조회되는지)
