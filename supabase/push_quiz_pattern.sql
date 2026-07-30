-- ───────────────────────────────────────────────────────────
-- push_quiz_pattern.sql : 코드맞추기 '성적형(패턴4)' 넛지 타겟팅.
--   레벨 컷값은 하드코딩(코드 배포로만 변경), 레벨 표시이름은 quiz_level_names
--   테이블로 소프트코딩(Table Editor에서 이름만 바꿔도 즉시 반영).
--
--   ▣ 후보 산출 = 독립된 2개 트랙 → 합쳐서 유저당 랜덤 1개 선택
--     트랙A(레벨): "마지막으로 수행한 레벨" 하나만 보고 판정
--        - 정답률 >= 레벨별 컷  → quiz_level_up (성적형, 다음 레벨 유도)
--        - 정답률 <  50         → quiz_reinforce(성장형, 현재 레벨 재정비)
--        - 그 사이              → 후보 없음
--     트랙B(챌린지): 마지막 레벨이 무엇이든 무관하게 독립 판정
--        - 레벨5 누적 정답률 >= 90 → c1 / 레벨8 >= 90 → c2 (둘 다면 c2)
--   → 트랙A·B 둘 다 걸리면 그 중 랜덤 1개만 발송(성적형/챌린지 or 성장형/챌린지).
--
--   최소 시도 3회 미만인 레벨은 각 트랙에서 개별 제외(한 트랙이 막혀도 다른 트랙은 살아남음).
--   문구는 push_message_templates(category: quiz_level_up/quiz_challenge/quiz_reinforce)에서 랜덤 발송.
-- ───────────────────────────────────────────────────────────

-- 레벨 표시이름(소프트코딩) — LEVEL_CONFIGS(chord-name-quiz.js)와 동기화 필요
create table if not exists public.quiz_level_names (
  level_id     text primary key,
  display_name text not null
);

-- 미구현(poolReady:false) 레벨로 딥링크가 나가지 않도록 플래그 추가
alter table public.quiz_level_names
  add column if not exists playable boolean not null default true;

insert into public.quiz_level_names (level_id, display_name) values
  ('1',  '필수 코드'),
  ('2',  '하이코드 입문'),
  ('3',  '코드 꾸미기'),
  ('4',  '필수 분수코드'),
  ('5',  '필수 7th코드'),
  ('6',  '프렛의 확장'),
  ('7',  '기능성 & 오픈코드'),
  ('8',  '7th 코드 정복하기'),
  ('9',  '쉘 보이싱 & 드롭 보이싱'),
  ('10', '텐션코드'),
  ('11', '하이브리드 코드'),
  ('c1', '기본코드 챌린지'),
  ('c2', '심화코드 챌린지'),
  ('c3', '코드마스터 챌린지')
on conflict (level_id) do update set display_name = excluded.display_name;

-- 아직 미구현 레벨(chord-name-quiz.js LEVEL_CONFIGS 의 poolReady:false)
update public.quiz_level_names set playable = false where level_id in ('9', '10', '11', 'c3');
update public.quiz_level_names set playable = true  where level_id not in ('9', '10', '11', 'c3');

create or replace function public.get_quiz_pattern_targets()
returns table (
  user_id        uuid,
  token          text,
  platform       text,
  category       text,
  level_id       text,
  next_level_id  text,
  challenge_id   text
)
language sql
security definer
set search_path = public
as $$
  with per_level as (
    -- 유저×레벨별 시도횟수·정답률(합산 방식 — 세션별 평균 아님)
    select
      user_id,
      properties->>'level_id'                                      as level_id,
      count(*)                                                     as attempts,
      sum((properties->>'correct_count')::int)                     as total_correct,
      sum((properties->>'total')::int)                             as total_questions,
      max(created_at)                                              as last_played_at
    from analytics_events
    where event_name = 'quiz_completed'
      and user_id is not null
      and (properties->>'level_id') ~ '^[0-9]+$'   -- 일반 레벨만(챌린지 c1~c3 제외)
    group by user_id, properties->>'level_id'
  ),
  scored as (
    select
      user_id, level_id, attempts, last_played_at,
      round(total_correct::numeric / nullif(total_questions, 0) * 100, 1) as accuracy_pct
    from per_level
    where attempts >= 3   -- 최소 시도 게이트
  ),

  -- ── 트랙A: 마지막으로 수행한 레벨 기준 성적형/성장형 ──────────
  latest as (
    select distinct on (user_id) user_id, level_id, accuracy_pct
    from scored
    order by user_id, last_played_at desc
  ),
  track_level as (
    select
      l.user_id,
      case
        when l.accuracy_pct >= (
          case l.level_id
            when '1' then 90 when '2' then 85 when '3' then 80 when '4' then 80
            else 75  -- 레벨5 이상 전부 바닥값 75(어떤 레벨도 75 밑으로 안 내려감)
          end
        ) then 'quiz_level_up'
        when l.accuracy_pct < 50 then 'quiz_reinforce'
      end                    as category,
      l.level_id,
      nx.level_id            as next_level_id,
      null::text             as challenge_id
    from latest l
    left join lateral (
      -- 다음으로 플레이 가능한 숫자 레벨(미구현 레벨 건너뜀)
      select n.level_id
      from quiz_level_names n
      where n.level_id ~ '^[0-9]+$'
        and n.playable
        and n.level_id::int > l.level_id::int
      order by n.level_id::int
      limit 1
    ) nx on true
  ),
  track_level_final as (
    select user_id, category, level_id, next_level_id, challenge_id
    from track_level
    where category is not null
      -- 다음 레벨이 없으면(최고 레벨 도달) 성적형은 보낼 곳이 없음 → 제외
      and (category <> 'quiz_level_up' or next_level_id is not null)
  ),

  -- ── 트랙B: 챌린지 (마지막 레벨과 무관, 독립 판정) ─────────────
  track_challenge as (
    select distinct on (s.user_id)
      s.user_id,
      'quiz_challenge'::text as category,
      s.level_id,
      null::text             as next_level_id,
      case s.level_id when '5' then 'c1' when '8' then 'c2' end as challenge_id
    from scored s
    where s.level_id in ('5', '8')
      and s.accuracy_pct >= 90
    order by s.user_id, s.level_id::int desc   -- 5·8 둘 다 자격이면 상위(c2) 우선
  ),

  -- ── 두 트랙 합쳐 유저당 랜덤 1개 ──────────────────────────────
  candidates as (
    select * from track_level_final
    union all
    select * from track_challenge
  ),
  picked as (
    select distinct on (user_id) *
    from candidates
    order by user_id, random()
  )
  select
    pt.user_id, pt.token, pt.platform,
    p.category, p.level_id, p.next_level_id, p.challenge_id
  from picked p
  join push_tokens pt on pt.user_id = p.user_id
  where pt.token is not null
    and pt.nudge_enabled = true;
$$;

grant execute on function public.get_quiz_pattern_targets() to service_role;
