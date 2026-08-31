-- ───────────────────────────────────────────────────────────
-- user_persona_profile.sql : 유저성향 4축 통합 캐시테이블
--
--   BigQuery에서 계산한 성향 라벨을 Supabase로 되돌려쓰는 테이블.
--   앱은 이 테이블만 읽으면 됨(무거운 계산은 BigQuery/배치스크립트가 함).
--   설계 근거: persona_clustering_pipeline_plan.md
--
--   2026-08-29: 값은 전부 영문키로 통일(코드에서 쓰기 편하게).
--   persona 스킴은 기존 PERSONA_STAGES(shared.js:3390)와 동일하게 맞춤.
--   Postgres는 컬럼 재정렬 ALTER가 없어서 테이블 drop 후 재생성 방식.
-- ───────────────────────────────────────────────────────────

drop table if exists public.user_persona_profile;

create table public.user_persona_profile (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  nickname           text,        -- subscriptions에서 복사(가독성용, 조회는 user_id 기준)

  persona            text,        -- unboxing/beginner/sheet_reader/home_master/guitar_master
  pref_type          text,        -- comping/soloing/harmony/null(데이터부족)
  skill_type         text,        -- comping/soloing/harmony/null
  engagement_type    text not null default 'insufficient_data',
    -- heavy_user/habitual/immersive/light_user/insufficient_data

  computed_at        timestamptz not null default now(),

  pref_scores        jsonb,       -- {"comp":0.x,"solo":0.x,"harm":0.x} 원본점수
  skill_scores       jsonb,       -- {"comp":정답률,"solo":정답률,"harm":정답률}
  engagement_metrics jsonb        -- {"rate_per_week":x,"median_duration_min":x,"session_count":x}
);

alter table public.user_persona_profile enable row level security;

-- service_role만 쓰기(배치스크립트), 유저 본인은 자기 것만 읽기
create policy "user_persona_profile_select_own"
  on public.user_persona_profile for select
  using (auth.uid() = user_id);

-- 확인: select * from public.user_persona_profile limit 10;
