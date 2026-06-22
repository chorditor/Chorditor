-- ───────────────────────────────────────────────────────────
-- push_winback : 윈백(리텐션) 푸시 문구·주기 DB 관리
--   목적지=홈(안정 route) → 앱 업데이트 없이 문구/주기 실시간 조정.
--   예약 엔진은 앱(로컬알림)에서 동작. 이 테이블은 '무엇을·언제 규칙으로' 만 제공.
--   읽기 전용 공개(anon select). 쓰기는 service_role(대시보드)만.
-- delay_rule 형식:
--   1차: {"from":"last_access","boundaryShiftHours":3,"days":3,"hour":17,"weekday":null}
--   2차~: {"from":"prev","days":7,"hour":17,"weekday":1}   (weekday: 0=일 … 1=월 … 6=토)
--   4차: {"from":"prev","months":6,"hour":17,"weekday":1}
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_winback (
  stage      int primary key,
  title      text not null,
  body_pool  jsonb not null,          -- ["문구1","문구2",...] (셔플백 풀)
  delay_rule jsonb not null,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_winback enable row level security;

-- 공개 읽기 (앱이 anon 키로 조회). 동일 이름 정책 있으면 교체.
drop policy if exists push_winback_read on public.push_winback;
create policy push_winback_read
  on public.push_winback
  for select
  to anon, authenticated
  using (true);

-- 시드 (확정 문구/주기)
insert into public.push_winback (stage, title, body_pool, delay_rule) values
(1, '잠깐 기타 어때요? 🎸',
 '["오랜만이에요! 오늘 코드 한 번 잡아볼까요?","잠깐 들러서 손가락 풀어볼래요?","3분이면 충분해요, 가볍게 한 곡 어때요?","며칠 지났는데, 코드 안 까먹었죠? 😉"]'::jsonb,
 '{"from":"last_access","boundaryShiftHours":3,"days":3,"hour":20,"minute":30,"weekday":null}'::jsonb),
(2, '다시 함께해요',
 '["한동안 안 보이시네요. 천천히 다시 시작해볼까요?","며칠 쉬어도 괜찮아요, 돌아오기 딱 좋은 날이에요.","잊은 코드 없나 살짝 점검해볼래요?","오늘 한 곡, 가볍게 다시 잡아봐요 🎸"]'::jsonb,
 '{"from":"prev","days":7,"hour":20,"minute":30,"weekday":1}'::jsonb),
(3, '오랜만이에요',
 '["그동안 잘 지내셨어요? 기타, 아직 거기 있죠?","한 달 만이네요. 손이 기억하는지 확인해볼까요?","가볍게 다시 시작해도 괜찮아요 🌱","잠깐이면 돼요, 다시 한 번 잡아볼래요?"]'::jsonb,
 '{"from":"prev","days":30,"hour":20,"minute":30,"weekday":1}'::jsonb),
(4, '절 잊으셨나요…? 🥺',
 '["먼지 쌓인 기타가 울고 있어요… 😢","저… 곧 잊혀질 것 같아요. 마지막 기회 주실래요? 🥹","우리, 이렇게 끝인가요…?","포기하기엔 아까운 실력이었는데… 딱 한 번만요.","당신 손가락을 아직 기억하는 코드가 있어요 🥺","마지막 인사라도… 코드 하나 잡아주실래요?"]'::jsonb,
 '{"from":"prev","months":6,"hour":20,"minute":30,"weekday":1}'::jsonb)
on conflict (stage) do update set
  title      = excluded.title,
  body_pool  = excluded.body_pool,
  delay_rule = excluded.delay_rule,
  updated_at = now();
