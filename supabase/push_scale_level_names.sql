-- ───────────────────────────────────────────────────────────
-- push_scale_level_names.sql : 스케일 레벨(1~25) 표시이름 + scale_key 매핑.
--   scale-training.html data-level/data-key 와 1:1 동일(소프트코딩).
--   {스케일명}/{다음레벨명} 치환, level_id↔scale_key 상호 조회에 사용.
-- ───────────────────────────────────────────────────────────

create table if not exists public.scale_level_names (
  level_id     int  primary key,
  scale_key    text not null unique,
  display_name text not null
);

insert into public.scale_level_names (level_id, scale_key, display_name) values
(1,  'major',              '메이저 스케일'),
(2,  'pentatonic',         '마이너 펜타토닉 스케일'),
(3,  'blues',               '마이너 블루스 스케일'),
(4,  'natural-minor',      '내추럴 마이너 스케일'),
(5,  'harmonic-minor',     '하모닉 마이너 스케일'),
(6,  'secondary-iv',       '4도 세컨더리 도미넌트'),
(7,  'secondary-v',        '5도 세컨더리 도미넌트'),
(8,  'secondary-ii',       '6도 세컨더리 도미넌트'),
(9,  'secondary-vi',       '2도 세컨더리 도미넌트'),
(10, 'secondary-iii',      '3도 세컨더리 도미넌트'),
(11, 'ionian',              '아이오니안 스케일'),
(12, 'dorian',              '도리안 스케일'),
(13, 'phrygian',            '프리지안 스케일'),
(14, 'lydian',              '리디안 스케일'),
(15, 'mixolydian',          '믹솔리디안 스케일'),
(16, 'aeolian',             '에올리안 스케일'),
(17, 'locrian',             '로크리안 스케일'),
(18, 'melodic-minor',       '멜로딕 마이너 스케일'),
(19, 'altered',             '얼터드 스케일'),
(20, 'phrygian-dominant',   '프리지안 도미넌트 스케일'),
(21, 'lydian-dominant',     '리디안 도미넌트 스케일'),
(22, 'mixolydian-b9b13',    '믹솔리디안 b9 b13 스케일'),
(23, 'mixolydian-b13',      '믹솔리디안 9 b13 스케일'),
(24, 'locrian-sharp2',      '로크리안 내추럴2 스케일'),
(25, 'locrian-sharp6',      '로크리안 내추럴6 스케일')
on conflict (level_id) do update set
  scale_key = excluded.scale_key,
  display_name = excluded.display_name;

-- 확인: select * from scale_level_names order by level_id;
