-- ───────────────────────────────────────────────────────────
-- push_codeplay_merge.sql : 주법 훈련 + 코드 진행 리스트 → 코드반주 훈련 통합 (2026-11-02).
--   앱에서 두 훈련이 코드반주 훈련으로 합쳐져서 푸시도 코드진행 기반 하나로 합친다.
--   1) 주법 문구(quiz_link_strum / scale_link_strum) 삭제 — 한국어 + en·ja·es
--   2) 코드진행 문구(quiz_link_progression / scale_link_progression)의 title 을 '코드반주 훈련' 으로
--      — 서버 deeplinkByTitle() 이 이 문자열로 목적지를 정한다. 한국어 title 과 Edge Function 은 반드시 같은 값.
--   3) 번역 title 을 용어집 이름으로 교체 (Chord Accompaniment / コード伴奏 / Acompañamiento de Acordes)
--      · 본문은 그대로 둔다. 단 en·es 는 옛 메뉴 이름(Chord Loops / Progresiones)이 고유명으로 박혀 있는 문장만 새 이름으로 바꾼다.
--        ja 의 'コード進行' 은 일반 음악 용어로도 쓰여서 건드리지 않는다.
--   4) 일반넛지 페르소나 추천에서 주법 행 삭제
--   5) (같은 배치) 한국어 title '코드 조합 훈련' → '리하모니 화성학' (1-2 번 항목)
--
--   번역 테이블(push_templates_en/ja/es)이 아직 라이브에 없으면 그 부분은 건너뛴다.
--   나중에 번역 SQL 을 적용했다면, 그 뒤에 이 파일을 한 번 더 실행할 것(시드가 옛 문구를 다시 넣기 때문).
--   ⚠ 이 파일은 Edge Function(push-dispatch 등) 배포와 같은 시점에 적용한다.
--     한쪽만 먼저 반영되면 title 이 어긋나 코드진행 푸시가 건너뛰어진다.
-- ───────────────────────────────────────────────────────────

-- 1) 한국어: 주법 문구 삭제 + 코드진행 title 교체
delete from public.push_message_templates
where category in ('quiz_link_strum', 'scale_link_strum');

update public.push_message_templates
set title = '코드반주 훈련'
where category in ('quiz_link_progression', 'scale_link_progression');

-- 1-2) 한국어: 코드 조합 훈련 → 리하모니 화성학 (앱에서 개명됨. title 은 deeplinkByTitle() 과 같은 값이어야 함)
--      본문은 이름을 직접 부르는 문장만 바꾼다. 번역 title(Reharm Quiz 등)은 이미 새 이름이라 그대로.
update public.push_message_templates
set title = '리하모니 화성학',
    body  = replace(replace(replace(replace(body,
              '코드 조합 훈련', '리하모니 화성학'),
              '코드조합훈련',   '리하모니 화성학'),
              '코드 조합 {레벨}', '리하모니 {레벨}'),
              '코드 조합으로',  '리하모니 화성학으로')
where category in ('quiz_link_combo', 'scale_link_combo');

-- 2) 번역: 테이블이 있을 때만
do $$
begin
  if to_regclass('public.push_templates_en') is not null then
    delete from public.push_templates_en where category in ('quiz_link_strum', 'scale_link_strum');
    update public.push_templates_en
    set title = 'Chord Accompaniment',
        body  = replace(body, 'Chord Loops', 'Chord Accompaniment')
    where category in ('quiz_link_progression', 'scale_link_progression');
  end if;

  if to_regclass('public.push_templates_ja') is not null then
    delete from public.push_templates_ja where category in ('quiz_link_strum', 'scale_link_strum');
    update public.push_templates_ja
    set title = 'コード伴奏'
    where category in ('quiz_link_progression', 'scale_link_progression');
  end if;

  if to_regclass('public.push_templates_es') is not null then
    delete from public.push_templates_es where category in ('quiz_link_strum', 'scale_link_strum');
    update public.push_templates_es
    set title = 'Acompañamiento de Acordes',
        body  = replace(body, 'Progresiones', 'Acompañamiento de Acordes')
    where category in ('quiz_link_progression', 'scale_link_progression');
  end if;
end $$;

-- 3) 일반넛지 페르소나 추천: 주법 행 삭제 (진행 행은 그대로 — 코드반주 연습이 ?no= 그룹으로 랜덤 진행을 뽑음)
delete from public.push_nudge_persona where training = 'strum';

-- 확인(모두 0 이어야 함):
--   select count(*) from public.push_message_templates where category like '%strum%';
--   select count(*) from public.push_nudge_persona where training = 'strum';
-- 확인(title 이 모두 '코드반주 훈련'):
--   select category, title, count(*) from public.push_message_templates
--   where category in ('quiz_link_progression', 'scale_link_progression') group by 1, 2;
-- 확인(title 이 모두 '리하모니 화성학', 본문에 '코드 조합' 이 남지 않음 → 0):
--   select category, title, count(*) from public.push_message_templates
--   where category in ('quiz_link_combo', 'scale_link_combo') group by 1, 2;
--   select count(*) from public.push_message_templates where body like '%코드 조합%' or body like '%코드조합%';
