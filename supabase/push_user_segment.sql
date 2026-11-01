-- ───────────────────────────────────────────────────────────
-- push_user_segment.sql : 윈백 대상 판정용 "한때 잘 쓰던 유저" 표시 (2026-11-02).
--   윈백은 헤비·습관형이던 유저에게만 보낸다(원래 잘 안 쓰던 유저는 귀찮게 하지 않음).
--   engagement_type 은 배치가 돌 때마다 덮어써져서 "예전엔 잘 썼음"이 남지 않으므로,
--   한 번이라도 heavy_user / habitual 이 되면 true 로 올리고 이후 내리지 않는 표시를 따로 둔다.
--   · 올리는 곳: scripts/compute-persona-profile.js (분류 결과가 heavy_user·habitual 일 때만 true 를 씀)
--   · 읽는 곳: get_winback_targets() (push_winback_server.sql)
--   ⚠ 실행 순서: 이 파일 → push_winback_server.sql. 순서가 바뀌면 윈백 함수가 없는 컬럼을 읽어 실패한다.
-- ───────────────────────────────────────────────────────────

alter table public.user_persona_profile
  add column if not exists ever_active boolean not null default false;

-- 지금 이미 헤비·습관형인 유저를 한 번에 표시 (과거에 헤비였다가 이미 유형이 바뀐 유저는 이 값으로 복구할 수 없음)
update public.user_persona_profile
set ever_active = true
where engagement_type in ('heavy_user', 'habitual')
  and not ever_active;

-- 확인:
--   select engagement_type, ever_active, count(*) from public.user_persona_profile group by 1, 2 order by 1, 2;
