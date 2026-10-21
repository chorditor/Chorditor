# 코드반주 훈련 — 기획 문서

> 상태: **연습 화면 구현 완료(2026-10-22), 백엔드 남음**. 디자인 → 구현 → 백엔드 순으로 진행.
> 코드 진행 리스트(`progression`)와 주법 리듬 훈련(`strumming`)을 하나의 훈련으로 통합한다.

## 1. 한 줄 정의

**코드 진행을 고르고, 같은 진행에 여러 주법을 붙여가며 백킹과 함께 반주를 연습하는 훈련.**
앱 정체성(레슨 선생님) 관점에서 "반주 코드"와 "주법"을 따로 두지 않고, 실제 연주처럼 한 번에 익히게 한다.

## 2. 이름

- 메인 타이틀: **코드반주 훈련**
- 진입 페이지 서브타이틀: **반주를 연습할 코드 진행을 골라주세요!**
- 훈련소 카드는 기존 둘("코드 진행 리스트", "주법 리듬 훈련")이 **하나로 줄어든다**.

## 3. 화면 흐름

1. **진입 페이지(목록)**: 지금 코드 진행 리스트의 카드를 거의 그대로 사용. 타이틀·서브타이틀로 안내.
2. 진행을 고르면 **상세(연습) 페이지**로 이동. 큰 구조는 현재 진행 상세 페이지와 비슷하다.

### 상세 페이지 구성 (위 → 아래)

- 헤더: 타이틀 = 진행 이름, 선택 버튼, 키 셀렉터
- 코드 캐러셀
- **주법 선택 섹션(신규)** — 같은 진행에 다른 주법을 쉽게 골라가며 붙여보는 활동
- 부가: BPM 조절, 점진 가속, 백킹 선택(드럼/메트로놈)

## 4. 핵심 규칙

### 4-1. 주법이 1순위
- 사용자가 고르는 1순위는 **주법**. 백킹 스타일은 두지 않는다(2026-10-22 제외 — 아래 4-2).
- **추천 주법 기능은 없다**(2026-10-22 폐기). 주법 목록 팝업은 전체 + 레벨 필터만 둔다.

### 4-2. 백킹 = 드럼 또는 메트로놈 (2026-10-22 변경)
- **백킹 트랙 "스타일"은 제외**한다(드럼+베이스+키보드 세트, 스타일별 기본 BPM, 주법별 허용 스타일 모두 폐기).
- 대신 사용자가 **드럼 비트 / 메트로놈 중 하나**를 고른다(기본 = 드럼). 드럼은 박자별 드럼 세트(`drum-sets.js`), 메트로놈은 박마다 클릭(마디 첫 박 강세).
- 연습 화면에서는 "주법 목록" 버튼 아래에 드럼·메트로놈 아이콘을 세로로 놓고 하나를 고른다.

### 4-3. 세션 on/off — 폐기 (2026-10-22)
- 백킹을 드럼/메트로놈 선택으로 바꾸면서 드럼·베이스·키보드·기타 세션별 on/off 버튼은 두지 않는다.

### 4-4. 코드와 마디
- 4코드 진행: 한 마디에 코드 1개(4마디).
- 8코드 진행: **이 경우에도 한 마디에 코드 1개**(박자 무관).
- **1사이클 = 진행 전체를 1회 연주**. 4코드는 4마디, 8코드는 8마디.

### 4-5. BPM — 앱 전체 중심 규칙
- 범위는 앞으로 **통합 10~300 BPM**. 우리 앱의 중심 규칙으로 삼는다.
- 현재 코드의 범위(메트로놈 1~300, 진행 상세 40~200, 주법 30~200)를 구현 단계에서 맞춘다.

### 4-6. 점진 가속
- 느린 BPM에서 시작해 목표 BPM까지 점차 빨라지게 한다.
- 옵션 두 가지: **몇 사이클마다** 올릴지, **한 번에 몇 BPM** 올릴지.
- 범위: 10~300 BPM.
- **무료로 푼다**(2026-10-22). 유료 구분은 두지 않는다.

## 5. 피크 소모와 퀘스트

### 5-1. 피크
- **코드 진행 기준**으로 소모. 소모량은 **5개**(기존 3개에서 상향).
- 소모 시점은 **연습 화면의 "연습하기" 버튼**: 옵션패널이 흰색 반투명 블러로 덮여 있고 가운데 버튼을 누르면 피크를 소모하며 열린다. 목록에서는 소모·확인 모달 없음(딥링크·URL 직접 진입도 같은 관문을 지남). 푼 상태는 새로고침에는 유지, 나가면 해제. **Pro는 처음부터 열림**.
- 한 진행 안에서는 주법·BPM·키를 바꿔도 추가 소모 없음.
- 이탈 확인 모달, 새로고침 시 잠금 유지, 프로 플랜 무소모는 지금 규칙을 그대로 따른다.

### 5-2. 퀘스트(진행 퀘스트 + 주법 퀘스트 통합)
- 카운터는 **4사이클을 연속으로 끝까지 연주하면 1회**.
- 계속 연주하면 **4사이클마다 +1**.
- **정지하거나 주법·키를 바꾸면 누적 사이클은 0으로 리셋**(쪼개서 세는 것 방지).
- 기존 카운터 값 이관 방식(합산 여부 등)은 백엔드 단계에서 확정.

### 5-3. 점진 가속 퀘스트 (2026-10-22)
- 점진 가속을 켜고 **시작 BPM에서 목표 BPM에 도달**하면 1회(재생 한 번에 한 번, 시작 = 목표면 안 셈). 도달 전 정지하면 안 셈.
- 티어는 코드반주 퀘스트와 같음(1·5·15·30·50·100·200·300·400·500회, 이후 매 100회). 보상(상자 / XP): 2/50 · 2/75 · 3/150 · 3/150 · 3/250 · 4/500 · 4/600 · 4/750 · 4/1000 · 6/1000, 이후 매 100회 3/250.
- 서버(컬럼·RPC·통계 병합)는 SQL 승인 후 추가 — 그 전까지 클라이언트는 로컬 카운터(`training_stats.ramp_completed`)로 동작.

## 6. 재활용할 기존 코드(구조 파악 결과)

- 진행 데이터(`progression-data.js`/`progression-parser.js`, 도수 이름·`title`): 그대로 사용.
- 주법 데이터(`strumming-list.js`, 22개): 주법 선택 섹션의 원본. 박자·컷팅·악센트·난이도 포함.
- 코드 보이싱·캔버스(`progression-voicings.js`, `voicing-canvas.js`): 그대로 사용.
- 재생 스케줄러: **`strum-play.js`의 셀 단위 스케줄러**가 이미 "진행 × 주법" 구조(`STRUM_PROG`가 가짜 A E A E일 뿐). 점진 가속(램프)도 이미 있어 "몇 사이클마다 몇 BPM"으로 일반화하면 된다.
- 중복된 것은 통합 대상: 코드 캐러셀(상세 vs 주법), BPM 휠(상세·주법·메트로놈), 재생 스케줄러, 연습 시작 잠금.
- 스케일 훈련의 `BackingTrack`(드럼+피아노+베이스)은 스케일 전용 엔진 — 참고 대상이며 그대로 쓰지 않는다.
- 기존 드럼 세트(`drum-sets.js`)의 박자별 드럼(4/4·3/4·12/8·6/8)을 그대로 사용한다.

## 7. 남은 논의 (백엔드 단계)

- 연습 화면 URL 직접 진입 시 피크 소모 우회 방지 — 푸시 관리와 함께 논의.
- 퀘스트 카운터(4사이클 연속 1회) 구현과 기존 카운터 값 이관(합산 여부).
- 기존 두 콘텐츠의 이관 세부: 푸시 넛지·딥링크(`progression-detail.html?no=`) 처리, 분석 이벤트 이름 정리, DB 컬럼·퀘스트 RPC 통합, 옛 `progression`·`strumming` 카드 정리.
- 5단계(1600px~) 캐러셀 높이 확정(지금 임시 180px).

## 8. 백엔드 후속 작업 (나중에 — 쿼리·Edge Function은 아직 작성하지 않음)

푸시는 테스트 출시를 해야만 확인할 수 있으므로, 앱 코드(푸시 딥링크 라우팅)만 먼저 반영했다. 아래 서버 쪽은 상황이 바뀔 수 있어 **그때 새로 작성**한다.

### 8-1. 앱 쪽 반영 완료 (코드)
- 푸시 라우팅(`shared.js`): `progId`·`progNo` → 새 연습 화면(`chordplay-practice.html`), `strumId`·`strumLv`·주간 결산(`trainingHome`)의 진행/주법 → 코드반주 훈련 목록(`chordplay.html`).
- `?no=`로 열면 랜덤으로 뽑은 진행을 주소(`id=`)에 고정(새로고침해도 같은 진행, 푼 상태 유지).
- 서버가 보내는 푸시 데이터 키(`progNo`, `strumLv` 등)는 **바꾸지 않음** — 옛 앱 호환.
- 옛 페이지(`progression*`, `strumming`, `strum-play`)는 새 앱에서 도달 경로가 없지만 지우지 않음(웹 버전·옛 앱 사용자 대비).

### 8-2. 배포 순서 (이 순서를 지킬 것)
1. 새 앱 스토어 반영 확인
2. `app_config.min_version` 상향 → 옛 앱은 강제 업데이트 화면에서 멈춤(푸시 딥링크로 들어와도 통과 불가)
3. Edge Function 수정 배포 + DB 푸시 제목 변경을 **같은 시점에 연달아** (한쪽만 먼저 하면 제목으로 템플릿을 못 찾아 코드진행 푸시가 건너뛰어짐)
4. 옛 페이지·옛 훈련소 카드 정리

옛 앱 사용자에게 **푸시 제목과 이동 화면이 어긋나면 안 된다** — 푸시 제목 변경은 반드시 2번 이후.

### 8-3. 나중에 작성할 쿼리 (DB)
- `strum_completed` → `progression_completed` 합산 이관(수령값은 둘 중 큰 값, 새 앱 배포 시점에 **1회만** 실행. 옛 앱이 살아 있는 동안 돌리면 그 사이 쌓인 주법 진행이 누락됨)
- 푸시 문구 템플릿 제목 변경: "코드 진행 리스트" → "코드반주 훈련" (`push_message_templates` 및 en·ja·es 템플릿)
- 주법 푸시 폐기: 주법 관련 템플릿·카테고리(`quiz_link_strum`, `scale_link_strum`, 넛지 주법 행) 비활성화
- 활성 푸시 대상 함수 `get_quiz_active_targets()`가 진행·주법을 따로 집계 — 합쳐서 집계할지 확인
- 대시보드 뷰(`friend_subscriptions`, `pure_subscriptions`)에 새 카운터 컬럼(`ramp_completed` 등) 반영 여부

### 8-4. 나중에 수정할 Edge Function
- `push-dispatch`: 코드진행 제목 상수(연동형 두 카테고리 맵, 훈련 이름), 이동 판정에서 새·옛 제목 둘 다 인식, 주법 분기(`strumLv`)·`resolveStrumLv`·연동형의 주법 항목 제거, 일반 넛지의 주법 분기 제거
- `push-active`: 훈련 이름 표(`TRAINING_NAME`)의 진행 이름 변경
- 둘 다 제목 전환은 8-2의 3번 시점에 DB 변경과 함께.

### 8-5. 번역 (미정)
- 푸시 제목 "코드반주 훈련"의 영어·일본어·스페인어, 앱 안 `locales`의 해당 키(지금 없음), `docs/glossary.md` 항목
- `TRAINING_NAME_I18N`(진행 이름 번역)도 같이 정할 것

### 8-6. 기타
- 푸시 동작 확인은 테스트 출시 후에만 가능.
- 앱 코드에는 이미 `ramp_completed` 동기화가 들어가 있고, 서버 SQL(`supabase/ramp_quest.sql`)은 실행 완료.

## 9. 진행 순서

1. **기획**(이 문서) → 2. **디자인**(화면 구조, 5단계 스코프) → 3. **구현**(재생 엔진 통합, 3버튼, 훈련소 카드) → 4. **백엔드**(통계·퀘스트·분석·푸시 이관)

## 10. 이벤트 로그 택소노미 (2026-10-22)

접두어는 `chordplay_`, 카테고리 `chordplay`(`analytics-sdk.js` CATEGORY_MAP). **옛 이벤트(`progression_*`, `strum_*`)는 새 앱에서 더 이상 쏘지 않고 병행하지도 않는다** — 옛 앱 이벤트는 옛 앱이 그대로 기록한다. 분석 때는 옛·새 이름을 합쳐서 봐야 한다.

원칙: 버튼은 클릭마다 로그를 찍지 않고 **한 방문 동안 횟수를 누적했다가 떠날 때 한 번에** 보낸다(로그 수 절감).

### 10-1. 이벤트
1. `chordplay_list_viewed` — 목록 진입 (옛 `progression_page_viewed`)
2. `chordplay_prog_selected` — 목록에서 진행 선택 `{prog_id, key, no}` (옛 `progression_detail_entered`)
3. `chordplay_list_left` — 목록 방문 요약 `{screen_sec, button_counts{preview_play, key_change}, via}`
4. `chordplay_practice_viewed` — 연습 화면 진입 `{prog_id, key, entry: list|push 종류|direct, plan}` (옛 `progression_detail_viewed`)
5. `chordplay_unlocked` — 옵션패널이 열린 순간 `{prog_id, via: peak|pro|restored}`
6. `chordplay_play_started` — 재생 시작 `{prog_id, key, strum_title, strum_level, beat, bpm, ramp_on, ramp_start, ramp_cycles, ramp_step, backing}` (옛 `progression_detail_played`)
7. `chordplay_play_stopped` — 재생 종료 요약 `{prog_id, strum_title, play_sec, cycles_done, counts_awarded, ramp_on, ramp_reached, reach_sec, stop_reason}` (`stop_reason`: user · strum_changed · key_changed · ramp_toggled · leave · background)
8. `chordplay_practice_left` — 연습 방문 요약 `{prog_id, key, unlocked, screen_sec, panel_open_sec, play_count, play_sec_total, button_counts, strum_picks, via}`

`button_counts` 키(연습): play_toggle · key_select · accidental_toggle · finger_toggle · chord_tap · carousel_swipe · bpm_slider · bpm_nudge · ramp_toggle · open_ramp-start-card / open_ramp-cycle-card / open_ramp-step-card · adjust_ramp-*-slider · backing_drum / backing_click · strum_modal_open · strum_filter. `strum_picks`는 주법 휠에서 0.7초 이상 유지된 선택의 제목별 횟수.

### 10-2. 분석 목표 ↔ 이벤트
- **버튼 사용 횟수**: `chordplay_practice_left.button_counts`, `chordplay_list_left.button_counts`
- **퍼널**: list_viewed → prog_selected → practice_viewed → unlocked → play_started → play_stopped(cycles_done, counts_awarded)
- **옵션패널을 연 뒤 머문 시간**: `chordplay_practice_left.panel_open_sec`
- **점진 가속 사용률/도달률**: `play_started.ramp_on` 대비 `play_stopped.ramp_reached`(도달까지 `reach_sec`)
- **이 진행에서 많이 선택된 주법**: `play_started.strum_title`(prog_id별) + `practice_left.strum_picks`
- **피크 소모 → 페이월 → 전환**: 새 이벤트 없이 기존 이벤트에 `training_type = 'chordplay'`가 실림 — `peak_consumed` / `peak_insufficient` → `peak_buffer_shown` → `paywall_viewed(trigger_source='peak_buffer')` → `plan_upgrade_*`. (프로 플랜은 피크 소모 없음.)

### 10-3. 후속 확인
- **페르소나 파이프라인 결정(2026-10-22): 코드반주 훈련은 pref_type의 '컴핑'에 통합한다.** `chordplay_play_started`를 컴핑의 주법(`strum_play_started`) 항목에 합산해서 센다(가중치 0.6 그대로). '화성학'의 진행(`progression_detail_played`) 항목은 옛 앱 이벤트만 계속 센다. 대상: `scripts/compute-persona-profile.js`(이벤트 목록·카운트), 조사용 `scripts/adhoc-pref-type.js`. 아직 수정 전 — 스크립트의 BigQuery 쿼리 수정 승인 후 반영. 같은 옛 이벤트를 읽는 `supabase/push_quiz_active.sql`, `push_nudge_server.sql`, `push_entry_funnel.sql`도 8장 서버 후속 작업에서 새 이벤트를 포함하도록 수정.
- 대시보드/BigQuery 쿼리에서 훈련별 집계 시 `chordplay_*` 카테고리와 `training_type='chordplay'` 추가.
