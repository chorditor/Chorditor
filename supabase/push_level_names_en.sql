-- ───────────────────────────────────────────────────────────
-- push_level_names_en.sql : 레벨·스케일 표시이름 영어판 (영어 푸시의 {level} {scale} 치환용).
--   기존 테이블에 display_name_en 컬럼만 추가 — 서버는 유저 lang 에 따라 컬럼을 고름.
--   값은 앱 화면(locales/en/common.js, training.js)과 동일하게 유지할 것.
--   display_name_en 이 null 이면 서버는 display_name(한국어)로 폴백.
-- ───────────────────────────────────────────────────────────

alter table public.quiz_level_names  add column if not exists display_name_en text;

update public.quiz_level_names q set display_name_en = v.name
from (values
  ('1',  'Essential Chords'),
  ('2',  'Intro to Barre Chords'),
  ('3',  'Chord Embellishments'),
  ('4',  'Essential Slash Chords'),
  ('5',  'Essential 7th Chords'),
  ('6',  'Up the Fretboard'),
  ('7',  'Functional & Open Chords'),
  ('8',  'Mastering 7th Chords'),
  ('9',  'Shell & Drop Voicings'),
  ('10', 'Extended Chords'),
  ('11', 'Hybrid Chords'),
  ('c1', 'Basic Chords Challenge'),
  ('c2', 'Advanced Chords Challenge'),
  ('c3', 'Chord Master Challenge')
) as v(level_id, name)
where q.level_id = v.level_id;

-- 스케일 푸시(scale_level_names)는 라이브 미배포일 수 있음 — 테이블이 있을 때만 적용.
do $$
begin
  if to_regclass('public.scale_level_names') is null then return; end if;
  alter table public.scale_level_names add column if not exists display_name_en text;
  update public.scale_level_names s set display_name_en = v.name
  from (values
    ('major',             'Major Scale'),
    ('pentatonic',        'Minor Pentatonic Scale'),
    ('blues',             'Minor Blues Scale'),
    ('natural-minor',     'Natural Minor Scale'),
    ('harmonic-minor',    'Harmonic Minor Scale'),
    ('secondary-iv',      'Secondary Dominant of IV'),
    ('secondary-v',       'Secondary Dominant of V'),
    ('secondary-ii',      'Secondary Dominant of vi'),
    ('secondary-vi',      'Secondary Dominant of ii'),
    ('secondary-iii',     'Secondary Dominant of iii'),
    ('ionian',            'Ionian Scale'),
    ('dorian',            'Dorian Scale'),
    ('phrygian',          'Phrygian Scale'),
    ('lydian',            'Lydian Scale'),
    ('mixolydian',        'Mixolydian Scale'),
    ('aeolian',           'Aeolian Scale'),
    ('locrian',           'Locrian Scale'),
    ('melodic-minor',     'Melodic Minor Scale'),
    ('altered',           'Altered Scale'),
    ('phrygian-dominant', 'Phrygian Dominant Scale'),
    ('lydian-dominant',   'Lydian Dominant Scale'),
    ('mixolydian-b9b13',  'Mixolydian b9 b13 Scale'),
    ('mixolydian-b13',    'Mixolydian 9 b13 Scale'),
    ('locrian-sharp2',    'Locrian Natural 2 Scale'),
    ('locrian-sharp6',    'Locrian Natural 6 Scale')
  ) as v(scale_key, name)
  where s.scale_key = v.scale_key;
end $$;

-- 확인(둘 다 0 이어야 함):
--   select count(*) from quiz_level_names  where display_name_en is null;
--   select count(*) from scale_level_names where display_name_en is null;
