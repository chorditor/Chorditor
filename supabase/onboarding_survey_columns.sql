-- ───────────────────────────────────────────────────────────
-- onboarding_survey_columns.sql : 온보딩 설문 3문항 답변 보존
--
--   온보딩에서 고른 답(활용 목적·학습 빈도·유입경로)을 subscriptions에 남긴다.
--   이 값은 패턴이 매달 갱신돼도 바뀌지 않는 "처음 답변" 기록이다
--   (패턴 자체는 user_persona_profile.pref_type / engagement_type 이 현재 값을 가진다).
--
--   ⚠ 적용 순서: 이 SQL을 먼저 실행한 뒤에 새 앱 빌드(동기화)를 내보낼 것.
--     새 빌드가 이 컬럼을 보내는데 컬럼이 없으면 subscriptions 저장이 400으로 실패한다.
-- ───────────────────────────────────────────────────────────

-- ① 컬럼 추가 (여러 번 실행해도 안전)
alter table public.subscriptions
  add column if not exists onboarding_purpose     text,   -- comping / soloing / harmony / editor / dictionary / chord_sheet / tools
  add column if not exists onboarding_weekly_freq text,   -- lt1(주 1회 미만) / 1to2(주 1~2회) / gte3(주 3회 이상)
  add column if not exists onboarding_source      text;   -- store / youtube / instagram / search / referral

comment on column public.subscriptions.onboarding_purpose     is '온보딩 답변: 주로 앱을 어떻게 활용하고 싶은지(처음 답변, 갱신 안 됨)';
comment on column public.subscriptions.onboarding_weekly_freq is '온보딩 답변: 1주일 학습 계획 횟수 구간(처음 답변, 갱신 안 됨)';
comment on column public.subscriptions.onboarding_source      is '온보딩 답변: 코디터를 알게 된 경로(처음 답변, 갱신 안 됨)';

-- ② 확인용 (읽기 전용) — 위 컬럼 3개가 보이면 정상
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'subscriptions' and column_name like 'onboarding\_%'
order by column_name;

-- ③ 확인용 (읽기 전용) — user_persona_profile에 'toolkit'(도구형)을 넣을 수 있는지 확인
--    첫 번째 결과(값 제약)에 pref_type 관련 check가 있으면 toolkit을 허용하도록 고쳐야 한다. 없으면 그대로 저장된다.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.user_persona_profile'::regclass and contype = 'c';

--    생성 컬럼(pref_type_kr 등)이 pref_type 값을 한글로 바꾸는 식이면 'toolkit'이 빈 값으로 나온다 — 식을 확인
select column_name, generation_expression
from information_schema.columns
where table_schema = 'public' and table_name = 'user_persona_profile' and is_generated = 'ALWAYS';
