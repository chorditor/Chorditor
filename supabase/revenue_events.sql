-- ───────────────────────────────────────────────────────────
-- revenue_events.sql : 매출 기록 — RevenueCat 웹훅이 받는 모든 결제 이벤트를 한 줄씩 쌓는다(2026-11-27)
--   구독(월간·연간)과 일회성 상품(피크상자 10/30/50/100) 모두. 첫 구매·갱신·상품 변경·해지·환불·만료·결제 실패·일회성 구매.
--   매출 대시보드의 기준 데이터. 앱 이벤트(analytics_events)는 퍼널 확인용이고 매출 숫자는 이 테이블로 본다.
--   같은 이벤트가 다시 와도(웹훅 재시도) event_id로 한 번만 저장.
--   쓰기 = 웹훅(service role)만. RLS를 켜고 정책을 두지 않아 앱(anon·authenticated)은 읽기·쓰기 모두 불가.
--   대시보드에서 읽을 때는 관리자 전용 정책을 그때 따로 추가한다.
--   ⚠ 반영 순서: 이 SQL을 먼저 실행 → 그다음 revenuecat-webhook 배포(테이블이 없으면 기록만 실패하고 결제 처리는 그대로 진행됨)
-- ───────────────────────────────────────────────────────────

create table if not exists public.revenue_events (
  event_id                    text        primary key,      -- RevenueCat event.id
  event_type                  text        not null,         -- INITIAL_PURCHASE / RENEWAL / PRODUCT_CHANGE / CANCELLATION / UNCANCELLATION / REFUND / EXPIRATION / BILLING_ISSUE / NON_RENEWING_PURCHASE / TRANSFER ...
  user_id                     uuid,                         -- app_user_id가 Supabase 유저 id일 때만(익명 RevenueCat id면 null, 원래 값은 app_user_id)
  app_user_id                 text,
  product_id                  text,
  product_kind                text,                         -- sub_monthly / sub_yearly / peakbox_10 / peakbox_30 / peakbox_50 / peakbox_100 / other
  period_type                 text,                         -- TRIAL / INTRO / NORMAL / PROMOTIONAL
  store                       text,                         -- APP_STORE / PLAY_STORE ...
  environment                 text,                         -- PRODUCTION / SANDBOX
  price_in_purchased_currency numeric,                      -- 현지 통화 금액(환불은 음수로 옴)
  currency                    text,
  price_usd                   numeric,                      -- RevenueCat 달러 환산가(event.price)
  takehome_percentage         numeric,                      -- 스토어 수수료를 뺀 몫(0~1)
  country_code                text,
  transaction_id              text,
  original_transaction_id     text,
  purchased_at                timestamptz,
  expiration_at               timestamptz,
  event_at                    timestamptz,                  -- RevenueCat event_timestamp_ms
  raw                         jsonb       not null,         -- 원본 이벤트 전체(나중에 필요한 값을 꺼낼 수 있게)
  received_at                 timestamptz not null default now()
);

create index if not exists revenue_events_user_idx    on public.revenue_events (user_id);
create index if not exists revenue_events_event_at_idx on public.revenue_events (event_at);
create index if not exists revenue_events_kind_idx    on public.revenue_events (product_kind, event_type);

alter table public.revenue_events enable row level security;   -- 정책 없음 = service role 외 접근 불가

-- 확인
-- select event_type, product_kind, environment, count(*), sum(price_in_purchased_currency) from public.revenue_events group by 1, 2, 3 order by 1, 2;
