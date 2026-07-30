-- ───────────────────────────────────────────────────────────
-- push_nudge_retire_quiz.sql : 기존 '코드맞추기' 일반 넛지 폐기.
--   push_quiz_pattern.sql(성적형/레벨업/챌린지/재정비 패턴)이 대체함.
--   행 삭제 대신 active=false — 필요하면 나중에 되살릴 수 있음(scale/progression/strum과 동일 취급).
--   get_nudge_targets()는 그대로 둠(pn.active=true 조건이 있어 quiz 비활성화만으로 자동 제외됨).
-- ───────────────────────────────────────────────────────────

update public.push_nudge
set active = false
where nudge_type = 'quiz';
