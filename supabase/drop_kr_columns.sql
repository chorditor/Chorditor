-- _kr 표시컬럼 제거 (2026-08-29) — 영문키만 남김
alter table public.user_persona_profile
  drop column if exists persona_kr,
  drop column if exists pref_type_kr,
  drop column if exists skill_type_kr,
  drop column if exists engagement_type_kr;
