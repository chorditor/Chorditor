-- ───────────────────────────────────────────────────────────
-- push_nudge_persona.sql : 일반넛지 — 페르소나별 추천 커리큘럼 정의.
--   기존 push_nudge(persona별 body_pool/deeplink_pool jsonb) 구조는 폐기하고,
--   훈련·레벨 범위를 행 단위로 관리(추가/수정이 Table Editor에서 바로 되도록).
--
--   priority : 낮을수록 우선 추천(1=핵심, 2=보조). 발송 시 1순위 그룹에서 먼저 뽑음.
--   levels   : 딥링크에 그대로 넘길 값(콤마 다중값 가능). 클라이언트가 그중 랜덤 선택.
--              아직 미구현 레벨(주법 4·5, 퀴즈 c3 등)도 미리 적어둠 —
--              해당 페이지가 존재하는 것만 필터링하므로, 구현되면 코드 수정 없이 자동 포함.
--   difficulty : 코드조합 훈련 전용(low/high). 나머지 훈련은 null.
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_nudge_persona (
  id         bigint generated always as identity primary key,
  persona    text    not null,   -- unboxing / beginner / sheet_reader / home_master
  training   text    not null,   -- quiz / scale / progression / strum / combo
  levels     text    not null,   -- 딥링크 값(콤마 다중값)
  difficulty text,               -- combo 전용: low(쉬움) / high(어려움)
  priority   int     not null default 1,
  active     boolean not null default true
);

create index if not exists push_nudge_persona_idx
  on public.push_nudge_persona (persona) where active;

delete from public.push_nudge_persona;

insert into public.push_nudge_persona (persona, training, levels, difficulty, priority) values
-- ── 언박싱 1일차: 코드 암기·무작정 진행 연습 우선. 스케일은 후순위, 코드조합 제외 ──
('unboxing', 'quiz',        '1,2',   null,  1),
('unboxing', 'progression', '1',     null,  1),
('unboxing', 'strum',       '1',     null,  1),
('unboxing', 'scale',       '1',     null,  2),

-- ── 굳은살 비기너: 코드·진행·주법 우선, 약간의 화성학(코드조합) → 스케일 ──
('beginner', 'quiz',        '3,4,5', null,  1),
('beginner', 'progression', '1,2',   null,  1),
('beginner', 'strum',       '2',     null,  1),
('beginner', 'combo',       '1,2',   'low', 2),
('beginner', 'scale',       '1,2,3,4', null, 3),

-- ── 악보 의존자: 코드·주법은 익혔고 화성학/스케일이 비어있음 ──
('sheet_reader', 'combo',       '1,2,3,4,5,6',            'low', 1),
('sheet_reader', 'scale',       '1,2,3,4,5,6,7,8,9,10',   null,  1),
('sheet_reader', 'quiz',        '6,7,8',                  null,  2),
('sheet_reader', 'progression', '4',                      null,  2),
('sheet_reader', 'strum',       '3,4,5',                  null,  2),

-- ── 방구석 기타마스터: 챌린지·상급 스케일·어려움 난이도 코드조합만 ──
('home_master', 'combo', '3,4,5,6,7,8', 'high', 1),
('home_master', 'scale', '11,12,13,14,15,16,17,18,19,20,21,22,23,24,25', null, 1),
('home_master', 'quiz',  'c2,c3',       null,  2);

-- 확인: select persona, training, levels, difficulty, priority from push_nudge_persona order by persona, priority, training;
