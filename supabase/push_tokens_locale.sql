-- ───────────────────────────────────────────────────────────
-- push_tokens_locale.sql : 기기별 앱 언어·시간대 (영어 푸시 문구 선택 + 현지 시각 발송용).
--   lang : 앱 언어 코드(i18n.js getLang()). 구버전 앱은 이 값을 안 보내므로 기본 'ko'.
--   tz   : IANA 시간대 이름(예: 'America/New_York'). null = 모름 → 서버는 'Asia/Seoul' 로 취급.
--   클라이언트 shared.js _savePushToken() 이 토큰 upsert 때 같이 저장.
--   ⚠ 이 SQL 을 먼저 적용한 뒤에 새 클라이언트를 배포할 것 —
--     컬럼이 없는 상태에서 새 클라이언트가 upsert 하면 요청 전체가 거부돼 토큰 저장이 실패함.
-- ───────────────────────────────────────────────────────────

alter table public.push_tokens
  add column if not exists lang text not null default 'ko',
  add column if not exists tz   text;

-- 확인: select lang, tz, count(*) from push_tokens group by 1, 2 order by 3 desc;
