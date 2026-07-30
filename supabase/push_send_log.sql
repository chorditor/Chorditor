-- ───────────────────────────────────────────────────────────
-- push_send_log.sql : 모든 푸시 발송 1건 = 1행 통합 기록 (CTR 분모).
--   기존 push_nudge_log / push_winback_log 는 "중복발송 방지"용이라 종류가 한정적이고
--   문구 정보가 없음 → 분석 전용으로 이 테이블을 새로 둠(기존 테이블은 그대로 유지).
--
--   클릭 매칭: id 를 FCM data.logId 로 실어 보내고, 앱이 알림 탭 시
--   analytics 'push_opened' 이벤트의 properties.log_id 로 되돌려줌 → 1:1 정확 매칭.
--   (시간창 추정 조인 불필요)
-- ───────────────────────────────────────────────────────────

create table if not exists public.push_send_log (
  id          uuid primary key,                    -- Edge Function이 생성해 FCM payload에 실어보냄
  user_id     uuid        not null references auth.users(id) on delete cascade,
  push_type   text        not null,                -- nudge / winback / quiz_abandoned / quiz_pattern / quiz_link / peak_full
  category    text,                                -- push_message_templates.category (풀 기반 문구는 null)
  template_id bigint,                              -- push_message_templates.id (풀 기반 문구는 null)
  title       text        not null,
  body        text        not null,                -- 치환 완료된 실제 발송 본문
  deeplink    text,                                -- 목적지 요약 ('scale:major', 'combo:5', 'quiz:6' 등)
  sent_at     timestamptz not null default now()
);

create index if not exists push_send_log_sent_idx on public.push_send_log (sent_at desc);
create index if not exists push_send_log_type_idx on public.push_send_log (push_type, sent_at desc);
create index if not exists push_send_log_user_idx on public.push_send_log (user_id, sent_at desc);

alter table public.push_send_log enable row level security;
-- service_role(Edge Function)만 접근. 일반 정책 없음 = anon/authenticated 차단.

-- ── 문구 조회 함수에 id 추가 (어떤 문구가 나갔는지 기록용) ──────
-- 반환 타입이 바뀌므로 create or replace 불가 → drop 후 재생성.
-- 기존 호출부는 rows[0].title/.body 만 쓰므로 id 추가는 하위호환.
drop function if exists public.get_random_push_message(text);

create function public.get_random_push_message(p_category text)
returns table (id bigint, title text, body text)
language sql
security definer
set search_path = public
as $$
  select id, title, body
  from public.push_message_templates
  where category = p_category and active
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_push_message(text) to service_role;

-- 확인: select push_type, count(*) from push_send_log group by push_type;
