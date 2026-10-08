-- ───────────────────────────────────────────────────────────
-- push_i18n.sql : 다국어 푸시 공용 준비물 (en·ja·es).
--   1) get_push_token_langs() — 한국어가 아닌 기기의 { token: lang }. Edge Function 이 문구 언어를 고르는 데 씀.
--   2) quiz_level_names / scale_level_names 에 display_name_ja, display_name_es 추가
--      (display_name_en 은 push_level_names_en.sql). 값은 앱 화면(locales/<lang>)과 동일하게 유지.
--   문구 자체는 push_templates_en.sql / _ja.sql / _es.sql.
-- ───────────────────────────────────────────────────────────

create or replace function public.get_push_token_langs()
returns jsonb
language sql security definer set search_path = public
as $$
  select coalesce(jsonb_object_agg(token, lang), '{}'::jsonb)
  from public.push_tokens
  where lang <> 'ko';
$$;

revoke all on function public.get_push_token_langs() from public, anon, authenticated;
grant execute on function public.get_push_token_langs() to service_role;

-- ── 코드 맞추기 레벨 이름 ──
alter table public.quiz_level_names
  add column if not exists display_name_ja text,
  add column if not exists display_name_es text;

update public.quiz_level_names q set display_name_ja = v.ja, display_name_es = v.es
from (values
  ('1',  '必須コード',                     'Acordes Esenciales'),
  ('2',  'バレーコード入門',               'Intro a la Cejilla'),
  ('3',  'コードの飾りつけ',               'Adornos de Acordes'),
  ('4',  '必須の分数コード',               'Acordes Slash Esenciales'),
  ('5',  '必須の7thコード',                'Acordes de Séptima Esenciales'),
  ('6',  'フレットを広げる',               'Más Allá de los Primeros Trastes'),
  ('7',  '機能コード & オープンコード',    'Acordes Funcionales y Abiertos'),
  ('8',  '7thコードを制覇',                'Domina los Acordes de Séptima'),
  ('9',  'シェル & ドロップボイシング',    'Voicings Shell y Drop'),
  ('10', 'テンションコード',               'Acordes con Tensiones'),
  ('11', 'ハイブリッドコード',             'Acordes Híbridos'),
  ('c1', '基本コードチャレンジ',           'Desafío de Acordes Básicos'),
  ('c2', '応用コードチャレンジ',           'Desafío de Acordes Avanzados'),
  ('c3', 'コードマスターチャレンジ',       'Desafío Maestro de Acordes')
) as v(level_id, ja, es)
where q.level_id = v.level_id;

-- ── 스케일 이름 (스케일 푸시가 라이브에 있을 때만) ──
do $$
begin
  if to_regclass('public.scale_level_names') is null then return; end if;
  alter table public.scale_level_names
    add column if not exists display_name_ja text,
    add column if not exists display_name_es text;
  update public.scale_level_names s set display_name_ja = v.ja, display_name_es = v.es
  from (values
    ('major',             'メジャースケール',                   'Escala Mayor'),
    ('pentatonic',        'マイナーペンタトニックスケール',     'Escala Pentatónica Menor'),
    ('blues',             'マイナーブルーススケール',           'Escala de Blues Menor'),
    ('natural-minor',     'ナチュラルマイナースケール',         'Escala Menor Natural'),
    ('harmonic-minor',    'ハーモニックマイナースケール',       'Escala Menor Armónica'),
    ('secondary-iv',      'IVへのセカンダリードミナント',       'Dominante Secundaria de IV'),
    ('secondary-v',       'Vへのセカンダリードミナント',        'Dominante Secundaria de V'),
    ('secondary-ii',      'viへのセカンダリードミナント',       'Dominante Secundaria de vi'),
    ('secondary-vi',      'iiへのセカンダリードミナント',       'Dominante Secundaria de ii'),
    ('secondary-iii',     'iiiへのセカンダリードミナント',      'Dominante Secundaria de iii'),
    ('ionian',            'アイオニアンスケール',               'Escala Jónica'),
    ('dorian',            'ドリアンスケール',                   'Escala Dórica'),
    ('phrygian',          'フリジアンスケール',                 'Escala Frigia'),
    ('lydian',            'リディアンスケール',                 'Escala Lidia'),
    ('mixolydian',        'ミクソリディアンスケール',           'Escala Mixolidia'),
    ('aeolian',           'エオリアンスケール',                 'Escala Eolia'),
    ('locrian',           'ロクリアンスケール',                 'Escala Locria'),
    ('melodic-minor',     'メロディックマイナースケール',       'Escala Menor Melódica'),
    ('altered',           'オルタードスケール',                 'Escala Alterada'),
    ('phrygian-dominant', 'フリジアンドミナントスケール',       'Escala Frigia Dominante'),
    ('lydian-dominant',   'リディアンドミナントスケール',       'Escala Lidia Dominante'),
    ('mixolydian-b9b13',  'ミクソリディアン b9 b13 スケール',   'Escala Mixolidia b9 b13'),
    ('mixolydian-b13',    'ミクソリディアン 9 b13 スケール',    'Escala Mixolidia 9 b13'),
    ('locrian-sharp2',    'ロクリアン ナチュラル2 スケール',    'Escala Locria Natural 2'),
    ('locrian-sharp6',    'ロクリアン ナチュラル6 スケール',    'Escala Locria Natural 6')
  ) as v(scale_key, ja, es)
  where s.scale_key = v.scale_key;
end $$;

-- 확인(0 이어야 함):
--   select count(*) from quiz_level_names where display_name_ja is null or display_name_es is null;
