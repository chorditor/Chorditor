-- ───────────────────────────────────────────────────────────
-- push_balanced_message.sql : title(=훈련 콘텐츠) 균등 배분 문구 선택.
--
--   push_message_templates.title 이 곧 "어느 훈련으로 보낼지"를 결정함(=딥링크 대상).
--   문구 개수가 훈련마다 다르므로 전체 행을 그냥 랜덤하면 문구 많은 훈련이 더 자주 나감.
--   → ① 자격 있는 title 중 균등 랜덤 1개  ② 그 title 안에서 행 랜덤
--   문구를 몇 개 추가하든 title 선택 확률은 항상 균등하게 유지됨.
--
--   p_titles     : 이 유저에게 보낼 수 있는 title 목록(예: 주법은 코드맞추기 레벨9+ 제외)
--   p_categories : 이 유저가 자격을 갖춘 category 목록
--                  (예: 챌린지 안 열린 유저에게 quiz_challenge 문구가 가면 안 됨)
-- ───────────────────────────────────────────────────────────

create or replace function public.get_balanced_push_message(
  p_titles     text[],
  p_categories text[]
)
returns table (id bigint, category text, title text, body text)
language sql
security definer
set search_path = public
as $$
  with chosen as (
    -- ① 실제 보낼 행이 1개 이상 있는 title 중에서만 균등 랜덤
    select t.title
    from public.push_message_templates t
    where t.active
      and t.title    = any(p_titles)
      and t.category = any(p_categories)
    group by t.title
    order by random()
    limit 1
  )
  -- ② 뽑힌 title 안에서 행 랜덤
  select t.id, t.category, t.title, t.body
  from public.push_message_templates t
  join chosen c on c.title = t.title
  where t.active
    and t.category = any(p_categories)
  order by random()
  limit 1;
$$;

grant execute on function public.get_balanced_push_message(text[], text[]) to service_role;

-- 확인(균등성 검증): 같은 인자로 1000번 뽑아 title 분포 보기
-- select title, count(*) from (
--   select (get_balanced_push_message(
--     array['코드 맞추기','스케일 훈련','코드 진행 리스트','주법 리듬 훈련','코드 조합 훈련'],
--     array['quiz_abandoned','quiz_link_scale','quiz_link_progression','quiz_link_strum','quiz_link_combo']
--   )).title from generate_series(1, 1000)
-- ) s group by title order by count(*) desc;
