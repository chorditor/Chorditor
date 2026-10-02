# Chorditor 스타일 가이드 (기반 문서)

> 신규 작업·리팩터링 기준. 기존 페이지 CSS는 해당 페이지 작업 시 점진 전환.

## 1. 컬러 토큰

`style.css` `:root`에 정의. 새 색상 임의 추가 금지.

```css
--bg: #FAFAF9;
--surface: #ffffff;
--border: #d9d4cc;
--gray-light: #ECECEA; /* --border보다 연한 회색 */
--text-primary: #242729;
--text-secondary: #6b6560;
--text-muted: #a09b95;
--accent: #e03c31;
--brand: #1a1a1a; /* 로고 차콜블랙, CTA 배경 표준 */
--blue: #4f7cff;
--blue-light: rgba(59, 130, 246, 0.08);
--charcoal-blue: #334155;
--icon-purple: #7B52CC;
--icon-green:  #2E9E72;
--icon-coral:  #E0332A;
--icon-blue:   #4f7cff;
--icon-yellow: #E8C000;
--icon-pink:   #C94B7A;

/* 파스텔 — 카드리스트 등 배경색 전용 */
--pastel-red:    #FCE9E7;
--pastel-orange: #FDEEE1;
--pastel-yellow: #FDF8E3;
--pastel-green:  #EBF5EC;
--pastel-blue:   #E9F1FD;
--pastel-purple: #EFEAFA;
```

## 2. 폰트 토큰

Material 3 / iOS HIG 타입스케일 기반 6카테고리 12토큰, §4 5단계별 확대(업계 표준은 고정 크기 — 넓은
뷰포트 커버 위해 자체 채택). 홀수는 Material/iOS 표준값 일치 목적일 때만(11px=iOS Caption2,
13px=iOS Footnote). **모바일→데스크탑 증가폭은 4px 이내**(Display만 8px까지) — 업계 UI 앱 기준.

| 카테고리 | 토큰 | 용도 (우리 앱 예시) | 모바일 | 태블릿 | 큰태블릿 | 랩탑 | 데스크탑 |
|---|---|---|---|---|---|---|---|
| Caption | `--font-caption` | 버전텍스트, 타임스탬프, 보조라벨(독바 라벨) | 11 | 11 | 12 | 12 | 12 |
| Label | `--font-label-sm` | 작은 뱃지/칩("신규" 배지, 필박스 통화숫자) | 12 | 12 | 13 | 13 | 13 |
| Label | `--font-label-lg` | 버튼 텍스트, 폼 라벨 | 14 | 14 | 14 | 16 | 16 |
| Body | `--font-body-sm` | 카드 설명문(홈블럭 desc, 배너 desc) | 13 | 13 | 14 | 14 | 14 |
| Body | `--font-body` | 기본 본문, 페이지 안내문 | 14 | 16 | 16 | 17 | 18 |
| Title | `--font-title-sm` | 작은 카드제목(프로필 카드 제목) | 16 | 18 | 18 | 18 | 18 |
| Title | `--font-title` | 섹션 제목(홈블럭 타이틀, 배너 타이틀) | 18 | 20 | 20 | 22 | 22 |
| Title | `--font-title-lg` | 큰 섹션제목(카드 헤더, 모달 타이틀) | 20 | 22 | 22 | 24 | 24 |
| Headline | `--font-headline-sm` | 페이지 타이틀(`.page-title`, 뒤로가기 옆 텍스트) | 24 | 24 | 26 | 28 | 28 |
| Headline | `--font-headline` | 온보딩 헤드라인 등 큰 제목 | 28 | 28 | 30 | 32 | 32 |
| Display | `--font-display-sm` | 중간 강조숫자(레벨 숫자, 통계카드 큰값) | 32 | 32 | 34 | 36 | 36 |
| Display | `--font-display` | 초대형 숫자/타이머(스톱워치, 대형강조) | 40 | 42 | 44 | 46 | 48 |

구현: `:root` 기본값 + `@media(min-width:481/769/1080/1600px)` 오버라이드(값 안 바뀌는 구간은 재선언 안 함).

### 2-1. 폰트 두께 (뷰포트 무관 고정)

| 토큰 | 값 | 적용 |
|---|---|---|
| `--weight-regular` | 400 | Caption, Label, Body |
| `--weight-semibold` | 600 | Title, Display |
| `--weight-bold` | 700 | Headline |
| `--font-body-bold` | 600 | Body 크기 그대로 두께만 강조 |

### 2-2. 타입 토큰 `--type-*` (두께+크기+행간+글꼴 한 줄)

사용: `font: var(--type-headline)` — `font-size`/`font-weight`/`line-height`를 따로 쓰지 않음. 크기는
`--font-*`를 참조하므로 뷰포트별 반응형 그대로. 크기만 `calc()`에 쓸 때는 `--font-*` 직접 사용.

| 토큰 | 두께 | 크기 | 행간 |
|---|---|---|---|
| `--type-caption` / `-label-sm` / `-label-lg` | 400 | `--font-caption` / `-label-sm` / `-label-lg` | 1.2 |
| `--type-body-sm` / `-body` | 400 | `--font-body-sm` / `-body` | 1.5 |
| `--type-body-bold` | 600 | `--font-body` | 1.5 |
| `--type-title-sm` / `-title` / `-title-lg` | 600 | `--font-title-sm` / `-title` / `-title-lg` | 1.2 |
| `--type-headline-sm` / `-headline` | 700 | `--font-headline-sm` / `-headline` | 1.2 |
| `--type-display-sm` / `-display` | 600 | `--font-display-sm` / `-display` | 1.2 |

- 행간: 긴 설명(Body 계열)은 `--leading-normal`(1.5), 제목·라벨·숫자 등 나머지는 `--leading-tight`(1.2). 글꼴: `--font-family`(Pretendard).
- **자간은 전 텍스트 `--tracking-base`(-0.04em) 단일값.** `font` 단축에 자간이 안 들어가므로, 4가지(크기·두께·행간·자간)를
  한 번에 쓰려면 **`.type-*` 클래스**(예: `class="type-headline"`) 또는 CSS 두 줄
  `font: var(--type-body); letter-spacing: var(--tracking-base);`. 클래스 13개는 `--type-*`와 1:1.
- 예외 크기·두께가 필요하면 단축 뒤에 해당 longhand만 덮어씀(예: `font: var(--type-title); font-weight: 700;`).
- 적용 현황: `.page-title`·`.scale-chapter-title`·`.scale-chapter-subtitle`·scale 카드 뱃지/이름만 적용(§19-2). 나머지는 기존 `font-size: var(--font-*)` 방식 → 점진 전환.

## 3. 여백(spacing) — 4px 배수

| 토큰 | 값 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-7` | 28px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

배수 밖 값(3/6/7/9/13/22/26/30px 등) 금지. 아이콘 내부 좌표 등 수학적으로 불가피한 경우만 예외.

## 4. 브레이크포인트 (전 페이지 공통 SSOT)

새 스코프는 이 5단계에서 고름 — 임의 min-width 조합 신설 금지.

| 단계 | 폭 범위 |
|---|---|
| 모바일 | 360~480px |
| 태블릿 | 481~768px |
| 큰 태블릿 | 769~1079px |
| 태블릿 가로/랩탑 | 1080~1599px |
| 데스크탑 | 1600px~ |

- 하한 360px — 미만은 자연 열화만(스토어 차단 안 함).
- 플랫폼 차이(안드로이드 앱 / iOS 브라우저 주소창)는 폭이 아니라 높이 문제 → 폭 분기 없이 `100dvh`로 흡수(§10).
- Fold/Fold8/Flip은 표준 밖 예외(`fold_hinge_orientation_naming` 메모리).
- 모바일 퍼스트: 기본 CSS = 모바일, 커질수록 `min-width`로 덮어씀. 기존 `max-width` 위주 페이지는 페이지 단위 점진 전환.

## 5. 그리드 시스템

| 단계 | 폭 | 컬럼 | 마진 | 거터 | 컨테이너 캡 |
|---|---|---|---|---|---|
| 모바일 | 360~480px | 6 | 20px | 16px | 없음 |
| 태블릿 | 481~768px | 6 | 24px | 24px | 없음 |
| 큰 태블릿 | 769~1079px | 8 | 28px | 24px | 없음 |
| 태블릿 가로/랩탑 | 1080~1599px | 12 | 32px | 24px | 1440px |
| 데스크탑 | 1600px~ | 12 | 32px | 24px | 1440px |

- 토큰: `--grid-cols` / `--grid-margin` / `--grid-gutter` / `--grid-track`(컬럼 1칸 폭).
- 큰 태블릿(8컬럼)은 12컬럼 배치값을 그대로 못 씀 — 8칸 기준으로 따로 잡음.
- **캡 1440px**: 넘는 폭은 `margin-inline:auto`로 좌우 대칭 흡수(데스크탑 사이드바 2026-09-23 폐기 →
  화면 전체 기준 대칭 그리드). 근거: 대형 태블릿 가로(Galaxy Tab S10 FE+ 1440px, iPad Pro 13" 1376px)에서
  안정적으로 꽉 차도록. 트랙 92.67px(소수점)은 브라우저가 처리해서 정수화 안 함.
- `.app-shell`·`cd-topbar`·`cd-main` 박스는 항상 뷰포트 전체 폭. 캡은 박스가 아니라 **안쪽 패딩
  `--cd-inset`**(§11)으로 걸어 내용만 1440px 그리드 안에 가운데 정렬.
- 캡 사용처: `--cd-inset`, `--grid-track`(`min(100vw, 1440px)` 기준), `--grid-container-max`,
  `--grid-content-w`, `.top-bar`/`.scale-level-layout` `max-width`. 변수화 안 됨 — 바꿀 땐
  style.css `1440px` 전수 grep 후 일괄 교체.

### 5-1. "그리드에 맞춰줘" 작업 순서

1. 폭 제어는 그 컴포넌트 전용 스코프 한 곳에만(`#컴포넌트id .공용클래스`) — 공용 클래스 직접 수정 금지.
2. 데스크탑 캡: `cd-*` 뼈대 페이지는 `--cd-inset`(§11)이 자동 처리. 아직 이전 안 된 기존 페이지만
   `--grid-container-max` + `margin-inline:auto` 재사용 — 새 캡값 금지.
3. 물려받는 클래스에 폭 규칙(`max-width`/`margin`/`padding`)이 이미 있는지 grep 선확인 — 겹치면
   **이중 인셋** 버그. 불필요한 건 `#id.클래스 { … !important }`로 무효화.
4. 컴포넌트별 미디어쿼리 경계값이 §4와 일치하는지 실측 재검증(예전 786px 등 잔존 가능).
5. 컬럼 수 바뀌는 구간(8↔12)에서 "N칸 중 M칸" 비율 공식 복붙 금지 — 그 구간 `--grid-cols`로 재계산.

## 6. 적용 원칙

- 폰트는 §2, 여백은 §3, 반응형 분기는 §4에서 고름. 표에 없는 값은 이유 확인 후 추가.
- `font-size` 11px 미만 금지. 홀수 px는 §2 표 값만.
- 한 화면에 맞춰야 하는 컨테이너는 `100dvh`.
- 회전 시 세로공간 부족은 §10 순서대로(dvh → 헤더/푸터 고정 → 축소·스크롤 → 장식 숨김).

## 7. 피크바(`.topbar-currency`)

아이콘 크기 기준 역산. 데스크탑(1600px~)만 확정, 나머지 구간 미정.

| 요소 | 데스크탑 값 |
|---|---|
| 아이콘 | 24px (마진 없음) |
| 숫자 폰트 | 18px |
| 아이콘-숫자 갭 | 4px |
| 배지 상하 패딩 | 8px → 배지·필박스 높이 40px |
| 필박스 좌우 패딩 / 배지간 갭 | 20px / 10px |

## 8. 원형 아이콘 버튼 (`--icon-circle-*`)

적용: `.project-icon-btn`, `.metronome-btn`, `.play-all-btn`, `.slot-toggle-btn`, `.add-line-btn`
(전부 `var(--icon-circle-size)`/`var(--icon-circle-svg)` 참조). 카포/BPM은 별도 컴포넌트지만 크기만 재사용.

| 구간 | 원 크기 | 아이콘 |
|---|---|---|
| ~768px | `clamp(26px, round(nearest, calc(100vw * 28 / 412), 1px), 28px)` | `clamp(15px, round(nearest, calc(100vw * 16 / 412), 1px), 16px)` |
| 769~1599px | 32px | 18px |
| 1600px~ | 미정 | 미정 |

- ~768px: 412px에서 28/16px로 수렴, `round()`로 정수 스냅(`@supports`로 구형 폴백).
- `--icon-circle-gap` 6px(~768px): 원형 버튼 2개+ 가로 그룹 내부 간격(`.project-title-btns`,
  `.project-header-row1-right`, `.project-header-row2-right`).
- 스타일: 아웃라인 — 배경 `#fff` + `box-shadow: 0 0 0 1px rgba(0,0,0,0.08)`
  (`.add-line-btn`만 `border: 1.5px solid var(--border)`).

## 9. 뒤로가기 아이콘 옆 타이틀 정렬

lucide 아이콘은 viewBox 안쪽에 획이 그려져 시각 중심이 살짝 안쪽 → 타이틀에 `margin-left: 2px`
(`.metronome-scroll .page-title` 사례).

## 10. 디바이스 회전 대응 (4단계 계층방어)

세로 기준 레이아웃이 가로모드에서 세로공간 부족할 때 순서대로 적용:

0. **`100dvh`** — 최상위 컨테이너 높이. 주소창·회전 자동 반영.
1. **헤더/푸터 고정, 본문만 유동** — 헤더·푸터 `flex-shrink:0`, 본문 `flex:1; overflow-y:auto`.
2. **자식에 `min-height`** — `flex:1` 비율분배 자식에 최소 높이를 줘야 찌그러지는 대신 스크롤로 전환됨
   (공간 충분 → 비율분배, 부족 → 자동 스크롤. `orientation` 분기 불필요). 예: `.metronome-scroll` 각 영역.
3. **장식요소 순차 숨김** — 없어도 기능 지장 없는 것부터 `display:none`(페이지별 판단). 타이틀·데이터·액션은 유지.

- 축 전환(column→row)은 공수 커서 핵심 화면만 선별 적용.
- `orientation:landscape`는 폰/태블릿 가로 구분 못 함 → 배치 변경이 필요하면 `min-width`+`min-height` 조합 사용.

## 11. 페이지 뼈대 — `cd-topbar` / `cd-main` / `cd-dockbar`

**최우선 규칙. 결정 순서: 뼈대 → 그리드(§5) → 컴포넌트(§7~).** 뼈대가 제각각이면 그리드를 맞춰도
탑바·메인 시작점이 페이지마다 어긋남.

### 11-1. 뼈대 2종

| 종류 | 구조 | 해당 |
|---|---|---|
| A | 탑바 - 메인 - 독바(탭 내비) | `home.html` |
| B | 탑바(뒤로가기+피크바) - 메인 | 그 외 서브페이지 |

- 하단 CTA 버튼(예: scale-level "암기하기")은 독바가 아니라 메인 안의 요소.
- 미적용: `daily-mission`/`onboarding`(탑바 없는 풀스크린), `index`/`Privacy`/`Terms`/`delete-account`/`sound-test`.

### 11-2. 마크업

```html
<div class="app-shell">                        <!-- 100dvh flex column -->
  <header class="cd-topbar cd-topbar--white">…</header>
  <main class="cd-main">…내용물 바로…</main>
  <nav class="cd-dockbar">…</nav>               <!-- A종만 -->
</div>
```

`cd-` = Chorditor 접두어. 위치 기반 이름 채택(Material·iOS가 "navigation bar"를 위/아래 반대로 써서).

### 11-3. 규격 (style.css 맨 끝 "페이지 셸" 섹션)

| 요소 | 규격 |
|---|---|
| `cd-topbar` 높이 | 모바일 `56px + safe-area-inset-top` / 481px~ `56px` |
| `cd-topbar` 좌우 | `padding-inline: var(--cd-inset)` (박스는 뷰포트 전체) |
| `cd-main` 배경 | 기본 투명(앱 배경), `cd-main--white` 수식어 = `#fff` |
| `cd-topbar` 배경 | `var(--topbar-bg, var(--bg))`, `--white` 수식어 = `#fff` |
| `cd-main` | `flex:1` + `overflow-y:auto` + `padding-inline: var(--cd-inset)` + `padding-bottom: env(safe-area-inset-bottom)` + 세로 flex + 스크롤바 숨김 (박스는 뷰포트 전체) |
| `--cd-inset` | `max(var(--grid-margin), calc((100vw - 1440px) / 2 + var(--grid-margin)))` — 1440 이하 = 그리드 마진, 초과분은 좌우 균등 분배. `%`가 아니라 `vw`인 이유: 패딩과 자식 마진에서 기준이 달라지지 않게 |
| 피크바 | 마크업 인라인 `margin-left:auto`로 우측 끝. 1600px~ 크기는 §7 |

### 11-4. 규칙

- 뼈대 CSS는 "페이지 셸" 섹션 한 곳에만. 페이지별 구역에 뼈대 규칙 금지.
- 페이지 간 차이는 수식어(`--modifier`)·CSS 변수로만. **페이지 이름으로 덮어쓰기 금지.**
  새 변종은 수식어 추가 후 여기 등록.
- 피크바 유무는 마크업으로 결정(필요한 페이지만 넣음, CSS로 숨기지 않음).
- **불필요한 wrapper 금지.** 뼈대 바로 안에 내용물. 레이아웃 목적만의 중간 div(`.main-content`/
  `.xxx-scroll` 류) 금지. wrapper는 내용상 묶음일 때만(예: 같이 sticky되는 `.scale-sticky-bar`).
- 내용물은 페이지 고유 클래스 유지, 자기 좌우 마진 없음(이중 인셋 방지).
- 뷰포트 끝까지 닿아야 하는 풀블리드 요소(구분선, 바 배경, 캐러셀)는 `margin-inline: calc(var(--cd-inset) * -1)`로
  `cd-main` 패딩 상쇄 (예: `.scale-sticky-bar`, `.st-track`, `.scale-item-list`). 안쪽 패딩도
  `--cd-inset`으로 되돌려 내용은 그리드 안에 유지.
- 하단 안전영역(`safe-area-inset-bottom`)은 `cd-main`이 `padding-bottom`으로 전담. **이전하는 페이지가 안쪽 요소에서 이미 같은 값을 쓰고 있으면 이중 적용 → 이전 시 안쪽 값을 뺄 것.**
- **새 페이지는 반드시 `cd-*` 뼈대** → 그리드 마진·캡·중앙정렬 자동. 컬럼 배치(col2~11 등)는 콘텐츠별 판단.

### 11-5. 기존 페이지 이전

페이지 하나씩: `cd-*` 적용 → 그 페이지 전용 덮어쓰기 규칙(`:has(.xxx-scroll)`, 페이지명 셀렉터) 삭제 →
확인. 전부 끝나면 `.top-bar`/`.main-content` 삭제.

| 페이지 | 상태 |
|---|---|
| `scale-training.html` | ✅ 완료(2026-10-02), 구조는 §19-1 |
| `scale-level.html` | ✅ 뼈대 이식(2026-10-02) — 안쪽 `.scale-level-layout` 래퍼는 space-between 배치 때문에 유지 |
| 그 외 서브페이지 12개 / `home.html` | 미착수 |

### 11-6. 미정

- 풀블리드 요소 표준 수식어(현재는 `--cd-inset` 음수 마진을 개별 선언)
- 데스크탑 로고 탑바(`.desktop-topbar`) 처리

## 12. `.cd-btn` (CTA 버튼)

신규 작업부터 사용. 기존 `.btn`(다른 스타일, 30곳+ 사용)과 이름 충돌 피하려 `cd-` 접두어.
`.sel-btn`(칩/토글)은 별개 컴포넌트.

### 크기 (§4 5단계)

| 토큰 | 모바일 | 태블릿 | 큰태블릿 | 랩탑 | 데스크탑 |
|---|---|---|---|---|---|
| `--cd-btn-height` | 44px | 46px | 48px | 50px | 52px |
| `--cd-btn-width` | 96px | 100px | 104px | 108px | 112px |
| `--cd-btn-padding-inline` | 20px | 20px | 24px | 24px | 28px |
| `--cd-btn-font-size` | 15px | 15px | 16px | 16px | 16px |
| `--cd-btn-radius` | 8px | 10px | 12px | 14px | 16px |
| `--cd-btn-icon-size` | 16px | 16px | 18px | 18px | 20px |
| `--cd-btn-icon-gap` | 4px | 4px | 8px | 8px | 8px |

너비 고정 기본, 라벨 길이 가변일 때만 `cd-btn--auto-width`.
아이콘 있는 버튼(예: 재생 아이콘+라벨)은 `--cd-btn-icon-size`·`--cd-btn-icon-gap` 사용 — 폭이 아이콘 때문에 96px 이상 필요하므로 보통 auto-width.

### 색상 variant (§1 토큰만 사용)

| variant | background | text |
|---|---|---|
| `--cd-btn-brand` | `var(--brand)` (#1a1a1a) | `#fff` |
| `--cd-btn-gray` | `var(--gray-light)` (#ECECEA) | `var(--text-primary)` |
| `--cd-btn-blue` | `var(--blue)` (#4f7cff) | `#fff` |
| `--cd-btn-red` | `var(--accent)` (#e03c31) | `#fff` |

## 13. `.cd-cardlist` (Card List)

배경 있는 카드형 낱개 항목 리스트. 기본은 텍스트만, 아이콘 필요하면 `.cd-cardlist-item--icon`.

### 마크업

```html
<ul class="cd-cardlist">
  <li class="cd-cardlist-item cd-cardlist-item--icon">
    <i class="ph-fill ph-grid-nine"></i>
    <span>코드맞추기</span>
  </li>
</ul>
```

아이콘: Phosphor(`ph-fill ph-*`), 색 `--charcoal-blue`.

### 크기 (§4 5단계)

| 토큰 | 모바일 | 태블릿 | 큰태블릿 | 랩탑 | 데스크탑 |
|---|---|---|---|---|---|
| `--cd-cardlist-height` | 56px | 64px | 72px | 80px | 88px |
| `--cd-cardlist-font-size` | 16px | 18px | 20px | 22px | 24px |
| `--cd-cardlist-padding` | 16px | 16px | 20px | 20px | 24px |
| `--cd-cardlist-icon-size` | 24px | 26px | 28px | 30px | 32px (`--icon` variant 전용) |
| `--cd-cardlist-radius` | 8px | 10px | 12px | 14px | 16px |

그림자(고정): `box-shadow: 0 2px 8px rgba(0,0,0,0.20)`.

## 14. `docs/style-guide-preview.html` (실물 미리보기)

§1~13 토큰을 실제 컴포넌트로 렌더링하는 내부 전용 정적 페이지. 앱과 무관, `../style.css`만 로드.

- 섹션: `<section class="sg-section">` + `<h2 class="sg-section-title">`. 순서: 색상 → 뷰포트 → 텍스트 → 버튼 → 카드리스트 → 모달.
- 5단계 비교: `.sg-row-table-row` / `.sg-row-table-head` 테이블 재사용.
- 5단계 동시 표시라 토큰 대신 **리터럴 px를 JS 배열로 하드코딩**(`FONT_ROWS`/`BTN_SIZE`/`CL_SIZE`) —
  style.css 값 바뀌면 여기도 수정. 색상만 `var(--token)` 직접 사용.
- 툴팁 `#sg-tooltip`: 고정값은 `data-tip-vars`(CSS 변수 실시간 읽기), 5단계 표는 `data-tip-text`.

**새 컴포넌트 추가**: ① 이 문서에 토큰 확정 → ② preview에 섹션 추가 → ③ `<script>`에 리터럴 배열 +
행 생성 루프(`BTN_`/`CL_` 패턴) → ④ 툴팁 바인딩 코드(스크립트 맨 끝)보다 앞에 배치.

## 15. `.cd-modal` (정보성 팝업)

정보 안내용 모달 표준. 보상·축하 연출 모달(`.attendance-modal` 등)은 대상 아님.
오버레이는 기존 `.modal-overlay` 재사용, `.cd-modal`은 박스만.

| 토큰 | 값 |
|---|---|
| `--cd-modal-width` | `clamp(300px, 80vw, 480px)` (미디어쿼리 없이 모바일만 비율, 그 이상 480px) |
| `--cd-modal-padding` | `32px 24px 24px` |
| radius / border / background | `var(--radius-lg)` / `1px solid var(--border)` / `var(--surface)` |
| box-shadow | 없음 |
| `--cd-modal-scale-from` / `--cd-modal-duration` / `--cd-modal-ease` | `0.8` / `0.38s` / `cubic-bezier(0.34, 1.5, 0.64, 1)` |

텍스트: 제목 17px/800/`--text-primary`, 설명 13px/500/`--text-secondary`/line-height 1.5.

### 마크업 구조

```html
<div class="modal-overlay hidden" id="...">
  <div class="cd-modal">
    <button class="cd-modal-close" onclick="...">  <!-- 스타일3에만 포함, 스타일1/2엔 아예 없음 -->
      <i data-lucide="x"></i>
    </button>
    <div class="cd-modal-title">제목</div>
    <div class="cd-modal-desc">설명</div>
    <div class="cd-modal-actions">  <!-- 기본: 가로배치. --col 붙이면 세로배치 -->
      <button class="cd-btn cd-btn--gray">취소</button>
      <button class="cd-btn cd-btn--brand">확인</button>
    </div>
  </div>
</div>
```

### 스타일 3종 (버튼은 항상 2개)

| 스타일 | X버튼 | 버튼 배치 |
|---|---|---|
| 1 | 없음 | 가로 `.cd-modal-actions` |
| 2 | 없음 | 세로 `.cd-modal-actions--col` |
| 3 | 있음 `.cd-modal-close` | 가로 |

### 등장 애니메이션

기본 `scale(var(--cd-modal-scale-from))`+`opacity:0` → `.cd-modal--in`에서 `scale(1)`/`opacity:1`.
오버레이 `hidden` 제거 후 **더블 `requestAnimationFrame` 뒤에 `--in` 부착**(안 그러면 트랜지션 씹힘,
`chord-name-quiz.js` `startLevel()` 참고). 닫을 때 `--in`도 제거.

## 16. 상단 그라데이션 (`--fade-top-*` + `shared.js positionFadeTop()`)

위쪽 옅은 틴트가 다음 섹션 시작점에서 정확히 사라지는 패턴의 공용 헬퍼. 현재 실사용처 없음
(daily-mission/attendance/mission-session은 각자 구현 — 손댈 때 이 헬퍼로 교체).

그라데이션 걸 컨테이너 자신의 배경에 선언(다른 background 규칙과 공존 불가):

```css
.내-컨테이너 {
  background: linear-gradient(to bottom,
    var(--fade-top-tint, rgba(58, 46, 36, 0.04)),
    var(--fade-top-base, var(--bg)) var(--fade-top-end, 300px));
}
```

- `--fade-top-tint`: 시작 색(기본 갈색계열 틴트)
- `--fade-top-base`: 끝 색 — 그 컨테이너의 평소 배경색(`var(--bg)` 또는 `#fff`)
- `--fade-top-end`: 끝 지점 px — JS가 채움(기본값은 폴백)

JS: `positionFadeTop(containerEl, targetEl)` — target 위치를 실측해 `--fade-top-end`에 넣음. 로드 시 1회.

**주의**: 실제로 보이는 **가장 안쪽 불투명 박스**에 걸 것 — 위에 불투명 sticky 형제나 불투명 배경
자식이 있으면 가려짐(chord-combo에서 두 번 헛짚음).

## 17. 프렛보드 "사진 확대" 스케일 (`scale-level.html` 원본)

360px 기준 디자인을 한 벌만 만들고 `transform: scale()`로 통째로 확대/축소 → 모든 뷰포트에서
동일 비율, 서브픽셀 오차 없음. "내부 비율 고정 + 반응형 크기" 컴포넌트에 재사용.

### 원칙

1. 치수는 360px 기준 1벌만 — `calc(Nvw)` 같은 뷰포트 의존 값 금지.
2. 화면 반영은 `transform: scale()` 하나로만: `scale = 실제확보폭 / 기준폭`.
3. 순서는 `scale(S) translateX(X)` — 이동이 기준 좌표계에서 먼저 적용됨. 반대 순서면 프렛 위치 어긋남.
4. 터치 히트박스 최소 44px — 시각 크기가 작으면 `::before { inset: -Npx }`로 보충.

### JS 상수 (`scale-level.js`)

```js
const FB_REF_WIDTH      = 360;   // 기준 디자인 폭
const FB_ARROW_W        = 44;    // 좌우 화살표버튼 크기(터치타겟 44px)
const FB_RATIO          = 2.3;   // fb-viewport 자체의 가로:세로 비율(폭 기준 고정)
const FB_REF_SPAN       = (FB_REF_WIDTH - 2 * FB_ARROW_W) / FB_RATIO;
const FB_REF_NECK_H     = (FB_REF_SPAN - 2.25) * 6 / 5;
const FB_REF_FBU        = FB_REF_NECK_H / 160;           // 지판 내부 단위(fret-board-unit)
const FB_REF_NUMS_GAP   = 6 * FB_REF_FBU;
const FB_REF_NUMS_H     = 22 * FB_REF_FBU;
const FB_REF_TOTAL_H    = FB_REF_NECK_H + FB_REF_NUMS_GAP + FB_REF_NUMS_H;
const FB_REF_VIEWPORT_W = FB_REF_SPAN * FB_RATIO;
const FB_REF_FULL_W     = FB_REF_VIEWPORT_W * (TOTAL_FRETS / FRETS_VISIBLE);
```

내부 치수(줄 두께·dot·프렛번호 폰트)는 전부 `calc(N * var(--fbu))` / `N * FB_REF_FBU`로.

### 스케일 적용

- `computeFbScale()`: 폭 예산(현재 부모 폭 80%, 최대 480px) ÷ `FB_REF_SPAN`. 예산 공식만 바꾸면
  나머지 파이프라인 재사용.
- `applyFbScale()`: `#fb-viewport` width/height 인라인 세팅, `#fb-full-wrapper`에
  `scale() translateX()`, 화살표 세로중앙 재계산. **`resize`마다 재호출 필수**(JS 실측 방식).

### CSS 구조

```
.fretboard-row           flex, space-between (화살표 양끝)
  --fb-arrow-w: 44px     /* JS FB_ARROW_W와 동기화 */
  --fb-ratio / --fb-ref-* / --fbu   /* JS 상수와 같은 공식 */
  ├─ .fb-arrow-btn       44×44 터치영역, svg 32×32
  ├─ .fb-viewport        overflow:hidden; width/height는 JS 인라인
  │    box-sizing: content-box   /* 전역 border-box 되돌림 — 안 하면 padding이 높이 먹어 잘림 */
  │    padding-top:14px / margin-top:-14px   /* 위쪽 ripple bleed 허용 */
  │    └─ .fb-full-wrapper   transform-origin:0 0; width·transform은 JS
  │         ├─ .fb-full-neck  height: calc(160 * var(--fbu))
  │         └─ .fb-full-nums  height: calc(22 * var(--fbu)); margin-top: calc(6 * var(--fbu))
  └─ .fb-arrow-btn
```

### 재사용 체크리스트

1. 기준 폭과 그 폭의 세부 치수 먼저 확정.
2. CSS `--접두어-ref-*`와 JS `PREFIX_REF_*`를 항상 같이 수정.
3. `overflow:hidden` 안에 bleed 애니메이션 있으면 `box-sizing: content-box` 확인.
4. `resize` 리스너에서 재계산 호출.
5. 터치 대상은 44px 히트박스 보장.

## 18. 튜토리얼 미니강의 (`scale-level.js` 원본)

연습 화면 안에서 "?" 버튼으로 부르는 온디맨드 미니 강의(강제 온보딩 아님). 별도 화면 없이 실제
연습 무대(`#scale-test-overlay`, `.scale-test-overlay--tutorial`)를 재사용해 지판 시연이 본체, 텍스트는 보조.
`TUTORIAL_STEPS`(텍스트/액션 단계 순차). 향후 커리큘럼 시스템의 원형.

### 타이밍

- 텍스트 등장: 공통 `.test-question--in`(`1.5s cubic-bezier(0.22, 1, 0.36, 1)`).
- 액션 등장: 상황별 스태거(`octaveRun` 420ms/노트, `fillRemaining` 250ms/노트), dot 팝인은 공통
  `.fb-note--spawn`(0.2s).
- **"다음" 버튼은 애니메이션 실제 종료 + 0.1s(`TUTORIAL_NEXT_BTN_BUFFER_MS`)에만 활성화. 예외 없음.**
  duration을 JS에 따로 하드코딩하지 않음:
  - 텍스트: `animationend` 이벤트 청취.
  - 액션: `(개수-1) × stepMs + TUTORIAL_DOT_FADE_MS(0.2s)` + 버퍼.

## 19. 작업 인수인계 (2026-10-02, scale-training 파일럿 완료 기준)

### 19-1. scale-training.html 구조 — `cd-main` 직속 자식(위→아래)

```
.scale-sticky-bar        타이틀(.page-title) + .st-track(점 4개). sticky, 풀블리드(margin -cd-inset)
.scale-chapter-header    "Ch. N" + 부제. 1개, 스크롤됨. 글자는 JS가 교체
.scale-item-list #ch-1~4 캐러셀 4개. 처음에 전부 DOM에 있고 선택 챕터만 표시(나머지 --hidden)
```

- 챕터 이름은 각 캐러셀의 `data-title`/`data-subtitle`. `_showChapter(n)`(scale-training.js) = 점 활성 + 캐러셀 표시/숨김 + 헤더 글자 교체.
  점 클릭(`onChapterTabTap`)과 복귀 복원(`restoreLastPosition`)이 공용으로 호출.
- **간격 규칙: 형제 사이 간격은 한쪽(아래 요소의 `margin-top`)에만.** 스티키바↔헤더 = 헤더 `margin-top`
  (기본 40 / 낮은 화면 설정 32·28, 스티키바 아래 마진 없음). 헤더↔캐러셀 = 간격 없음(카드는 남은 공간 정중앙).
- 캐러셀(`.scale-item-list`) 핵심 — **카드 크기는 캐러셀 "높이"가 결정**:
  - `flex: 1 1 0` + `container-type: size` — 헤더 아래 남은 세로 공간을 전부 차지(높이 확정)하고, 자식(카드·스페이서)이
    `cqh`/`cqw`로 캐러셀 크기를 직접 참조. 카드는 `align-items:center`로 그 안에서 세로 정중앙. 상하 마진·패딩 0
    (상하 패딩이 비대칭이면 카드가 중앙에서 벗어남). 캐러셀 자기 자신의 속성(padding 등)에는 `cqh`를 못 씀.
  - 카드 높이 `--sc-card-h` = `max(400px, min(80cqh, 100cqh − 48px, (100cqw − 2×(gap+peek))×1.6))` — 캐러셀 높이의 80%,
    위아래 여백 최소 24px, 좁은 화면에서 옆 카드가 `--sc-peek`(40px)만큼 보이도록 폭 상한(화면폭 − 112px),
    **카드 최소 높이 400px(폭 250px)가 모두에 우선**. 폭 `--sc-card-w` = 높이 ÷ 1.6(`aspect-ratio: 1/1.6`). 카드 최대 상한은 없음.
  - `min-height: 448px`(= 카드 최소 400 + 여백 24×2) — 이보다 남은 공간이 작으면 카드를 줄이지 않고 `cd-main`이 스크롤
    (min-height 없이 카드만 400px면 캐러셀 `overflow-y:hidden`에 카드가 잘림).
  - 좌우 `margin:-cd-inset`으로 뷰포트 전체 폭. 첫/마지막 카드는 `::before`/`::after` 스페이서(폭
    `(100cqw − 카드폭)/2 − gap`)로 캐러셀 중앙에 놓고, 스냅은 `scroll-snap-align:center`. JS(`_snapAnchor`·`_centerScrollLeft`)도
    같은 기준(캐러셀 중앙)이라 둘을 같이 바꿀 것.
  - **`.scale-item-list--hidden{display:none}`은 `.scale-item-list{display:flex}`보다 파일에서 뒤에 둘 것**(같은 우선순위라 나중 규칙이 이김).
- 카드 내부 크기 단위 `--cs` = 카드폭 ÷ 287 → 카드가 커지면 내부도 같은 비율(§19-3). 낮은 화면 특수 스코프 8곳은
  `.scale-sticky-bar`·`.scale-chapter-header`를 조정 → `grep -n "^  \.scale-chapter-header {" style.css`.

### 19-2. 남은 TODO (미정리)

- **`--type-*` 적용 현황**: `.page-title`, `.scale-chapter-title`(headline-sm), `.scale-chapter-subtitle`(title), scale 카드 뱃지(label-sm)·이름(title)만. 나머지 약 70곳은 `font-size: var(--font-*)` 그대로.
- **자간**: `--tracking-base`(-0.04em) 신규. 옛 `--tracking-tight/-tighter/-tightest`와 사용 4곳(style.css 943·1280·1530·1539줄) 미정리 — 정리하면 -2~-3% → -4%로 바뀜.
- `--font-headline-sm` 사용 7곳이 `font-weight: 800` 리터럴(토큰 아님) — Headline=700과 불일치.
- 여백 스케일(§3) 밖 값: 스티키바 하단 패딩 14 / 10 / 8px, `.st-track` `padding-bottom: 14px`(12 또는 16 권장).
- 컴포넌트 폰트 비토큰: `--cd-btn-font-size` 15px(§6 홀수 위반), `.cd-modal` 제목 17px/두께 800(두께 토큰에 800 없음, §15).
- `.scale-chapter-label` CSS는 어디서도 안 씀(삭제 후보). `scale-training.html`의 캐러셀 내부 들여쓰기 미정리(약 1300줄).
- 하단 안전영역: `.cd-main { padding-bottom: env(safe-area-inset-bottom) }`로 처리함(2026-10-02). 실기기(제스처바 있는 기기, Capacitor WebView가 env 값을 실제로 주는지)에서 카드 아래가 가려지지 않는지 확인 필요.
- `.desktop-topbar` 처리 미정(§11-6). `scale-level.js` 481줄 주석이 삭제된 `사운드인식테스트.html`을 언급(동작 무관).
- **동기화**: scale-training 작업은 커밋(`956b99a`) 후 `www/`·android assets·cap sync 3단계 동기화 완료(2026-10-02). 이후 수정분은 다시 동기화 필요.

### 19-3. 카드 내부 디자인 — 완료 (2026-10-02)

카드 외형·배치(위 19-1)와 내부 디자인 모두 확정. 내부 구조만 요약:
- 위→아래: **헤더**(`.scale-card-header`: 레벨 뱃지 + 스케일 이름 + 구분선, 카드 패딩을 음수 마진으로 상쇄해 위·좌·우 끝에 붙음) → **지판+음이름 묶음**(`.scale-card-shot` + `.scale-card-notes`, 지판 `margin-top:auto`와 버튼 `margin-top:auto`가 남는 공간을 반씩 나눠 헤더 구분선~버튼 사이 정중앙) → **연습하기 버튼**(맨 아래).
- 카드 패딩·간격은 `--cs` 배수(`--cs` = 카드폭 ÷ 287 → 카드가 커지면 내부도 같은 비율). 토큰은 `:root`에서 `--cs`를 못 쓰므로 규칙 안에서 `calc(N * var(--cs))`로 직접 씀.
- 글자: 뱃지·이름은 `--type-*` 토큰(뱃지 `label-sm`, 이름 `title`), 음이름은 `--cs` 기반 직접 지정. 연습하기 버튼은 `.cd-btn` 토큰(§12, 아이콘은 `--cd-btn-icon-*`)을 참조.
- 낮은 화면 특수 스코프 8곳의 카드 글자 오버라이드는 삭제함(토큰을 덮어쓰므로). 스코프는 이제 `.scale-sticky-bar`·`.scale-chapter-header`만 조정.

**미정**: 넓은 화면에서 첫 카드를 그리드 좌측 컬럼에 맞추는 규칙(규칙 4)과 3↔4 전환 기준, 카드 최대 크기 상한(1920×1080 등 큰 화면에서 카드가 매우 커짐),
모바일 카드 노출 폭 40px가 0.88배 축소 때문에 실제로 약 14px 덜 보이는 문제(축소 완화 여부).
