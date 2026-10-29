# Chorditor 스타일 가이드 (기반 문서)

> 신규 작업·리팩터링 기준. 기존 페이지 CSS는 해당 페이지 작업 시 점진 전환.

## 0. 카드로 묶는 그룹화는 매우 신중하게 (최우선 원칙, 2026-10-28)

**아래 모든 규칙(카드 §13-1, 옵션패널 §20 등)보다 먼저 적용한다.**

- 묶음은 먼저 **여백·간격·크기만으로** 만든다. 충분히 가까이 붙은 요소는 카드 없이도 한 묶음으로 보이고, 멀리 떨어진 요소는 다른 묶음으로 보인다(§5 "마진 = 묶음 기준값").
- 묶음마다 카드(배경·테두리·그림자가 있는 박스)를 씌우면 화면이 난잡하고 복잡해진다. 카드는 **꼭 필요한 부분에서만** 쓴다.
- 새 카드를 넣기 전에 "여백·간격·크기만으로는 왜 안 되는가"를 먼저 정한다. 이유가 없으면 카드를 쓰지 않는다.
- 카드 안에 또 카드를 넣지 않는다.

## 1. 컬러 토큰

`style.css` `:root`에 정의. 새 색상 임의 추가 금지.

```css
--bg: #FEFEFD;
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

/* 퀴즈 레벨 라벨(배경 / 글자) — 코드맞추기 문제 카드 좌상단 라벨 전용. 일반 레벨 4색 + 챌린지 금속 3종 */
--level-gray-bg:   #E2E0DB;  --level-gray-text:   #6B6560;   /* Lv1~2 */
--level-green-bg:  #D8EBAA;  --level-green-text:  #547A12;   /* Lv3~5 */
--level-blue-bg:   #C2E1F0;  --level-blue-text:   #2F6F91;   /* Lv6~8 */
--level-purple-bg: #DFCBF0;  --level-purple-text: #7B4A94;   /* Lv9~ */
--level-bronze-bg: linear-gradient(135deg, #F7D3AE 0%, #DBA06A 40%, #C98048 70%, #E8B888 100%);  --level-bronze-text: #ffffff;   /* C1 */
--level-silver-bg: linear-gradient(135deg, #F3F5F8 0%, #C3CBD6 40%, #9AA6B5 70%, #DDE2E9 100%);  --level-silver-text: #ffffff;   /* C2 */
--level-gold-bg:   linear-gradient(135deg, #FFF1B8 0%, #F2C94C 40%, #D4A017 70%, #F7DC7A 100%);  --level-gold-text:   #ffffff;   /* C3 */
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
| 모바일 | 360~480px | 6 | 16px | 16px | 없음 |
| 태블릿 | 481~768px | 6 | 16px | 16px | 없음 |
| 큰 태블릿 | 769~1079px | 8 | 20px | 20px | 없음 |
| 태블릿 가로/랩탑 | 1080~1599px | 12 | 20px | 20px | 1440px |
| 데스크탑 | 1600px~ | 12 | 20px | 20px | 1440px |

> 2026-10-20: 마진·거터를 16/16/20/20/20으로 하향(이전 마진 20/24/28/32/32, 거터 16/24/24/24/24). 마진=거터 동일값.

**마진 = 묶음 기준값 (그룹핑 규칙)**

그리드의 좌우 마진 값은 "컴포넌트 사이가 묶여 있다"는 기준 값이 된다.
- 컴포넌트 간격이 **마진 값 이하**(모바일이면 16px 이하)면 암묵적으로 **한 묶음**이다.
- 컴포넌트 간격이 **마진 값보다 넓으면**(모바일이면 16px 초과) **서로 다른 묶음**이라는 것을 시각적으로 보여준다.
- 기준값은 구간별 마진을 따른다(모바일·태블릿 16px, 큰태블릿~데스크탑 20px). 컴포넌트 간격을 정할 때 "같은 묶음인가"를 먼저 정하고 그에 맞춰 마진 이하/초과로 둘 것.

- 토큰: `--grid-cols` / `--grid-margin` / `--grid-gutter` / `--grid-track`(컬럼 1칸 폭).
- 큰 태블릿(8컬럼)은 12컬럼 배치값을 그대로 못 씀 — 8칸 기준으로 따로 잡음.
- **캡 1440px**: 넘는 폭은 `margin-inline:auto`로 좌우 대칭 흡수(데스크탑 사이드바 2026-09-23 폐기 →
  화면 전체 기준 대칭 그리드). 근거: 대형 태블릿 가로(Galaxy Tab S10 FE+ 1440px, iPad Pro 13" 1376px)에서
  안정적으로 꽉 차도록. 트랙 98.33px(소수점, 마진·거터 20 기준)은 브라우저가 처리해서 정수화 안 함.
- `.app-shell`·`cd-topbar`·`cd-main` 박스는 항상 뷰포트 전체 폭. 캡은 박스가 아니라 **안쪽 패딩
  `--cd-inset`**(§11)으로 걸어 내용만 1440px 그리드 안에 가운데 정렬.
- 캡 사용처: `--cd-inset`, `--grid-track`(`min(100vw, 1440px)` 기준), `--grid-container-max`,
  `--grid-content-w`, `.top-bar` `max-width`. 변수화 안 됨 — 바꿀 땐
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

탑바 전용 토큰 `--cd-peak-*`(2026-10-19). **5단계 전부 같은 값(모바일 기준 고정, 구간 분기 없음)**.
**모든 `cd-topbar` 페이지 공통** — 페이지별 덮어쓰기 금지(훈련소 메인 전용 규칙도 삭제됨). 값은 `:root`.

| 토큰 | 값 | 의미 |
|---|---|---|
| `--cd-peak-box` | 20px | 아이콘 박스 |
| `--cd-peak-img-square` | 18px | 선물상자 이미지(정사각 키라인) |
| `--cd-peak-img-tall` | 16px | 피크 이미지 높이(세로 직사각 키라인, 폭 자동) |
| `--cd-peak-h` | 36px | **알약 높이 고정값**(`#topbar-currency`·`.currency-item`에 `height`로 직접 지정, 내용·줄높이와 무관) |
| `--cd-peak-pad-x` | 16px | 알약 좌우 여백 |
| `--cd-peak-gap` | 4px | 아이콘-숫자 간격 |
| `--cd-peak-font` | 14px | 숫자(`--font-label-lg` 모바일값) |

- 이미지 에셋(`gift.png` 512×512, `peak.svg` 13.4×16.22)은 투명 여백 없이 박스를 꽉 채워 lucide보다 커 보임 →
  Material 키라인(24 박스 기준 정사각 18 / 세로 직사각 16×20)을 박스 비율로 환산해 별도 크기. 홀수는 반픽셀이라 올림(21→22).
- 숫자 두께 700·색 `--text-secondary`는 전역 `.currency-count` 그대로.

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

### 8-1. 아이콘 버튼 크기 토큰 (`--cd-icon-btn-*`, 2026-10-12)

위 §8(원형, 구간별 가변)과 별개로, 신규 작업용 **터치 영역 고정** 아이콘 버튼 규격. 5단계 전부 같은 값. (탑바 안 버튼은 별도 `--cd-topbar-*`, §11-3b)

| 토큰 | 값 | 의미 |
|---|---|---|
| `--cd-icon-btn-size` | 44px | 터치 영역(정사각) — 터치 최소 44px 확보 |
| `--cd-icon-btn-icon` | 24px | 그 안의 아이콘(lucide) — 터치 영역 대비 약 0.55 |

- 근거: 독바·탑바 로고·피크바 아이콘이 이미 24px(§7·§11), Material 48dp 안 24dp / iOS 44pt 안 22~28pt.
- 24px에서 lucide 기본 선 굵기(`stroke-width: 2`)가 그대로 맞아 별도 보정 불필요.
- 적용: 사전 패널(`.lib-panel`) 안 `.icon-btn` 등 — `width/height: var(--cd-icon-btn-size)`, `padding: 0`,
  `svg`는 `var(--cd-icon-btn-icon)`. 탑바 안 버튼은 이 토큰이 아니라 `--cd-topbar-*`. 탑바 밖 기본 `.icon-btn`(18px/패딩 4px)은 그대로.
- 새 아이콘 버튼은 크기를 직접 쓰지 말고 이 토큰을 참조할 것. 배경·테두리 스타일은 컴포넌트별.

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
| `cd-topbar` 높이 | 전 구간 `56px + safe-area-inset-top`(2026-10-11: 481px~ `56px` 예외 삭제 — iPad 상단 안전영역 24px에 내용 영역이 눌렸음) |
| `cd-topbar` 좌우 | `padding-inline: var(--cd-inset)` (박스는 뷰포트 전체) |
| `cd-main` 배경 | 기본 투명(앱 배경), `cd-main--white` 수식어 = `#fff` |
| `cd-main--stage` | 자식이 `position:absolute`로 겹쳐 슬라이드 전환하는 페이지용(홈 탭). `relative`+`overflow:hidden`+패딩 없음. 스크롤·여백은 자식이 담당 |
| `cd-dockbar` | A종 하단 탭 내비. 높이 `56px + safe-area-inset-bottom` **전 구간 고정**, 흰 배경 + 위 1px `--border`. 항목 `cd-dockbar-item`: 아이콘 24px + 라벨 `--font-caption`/500, 활성 시 `--text-primary`, 비활성 `--text-muted` |
| `cd-topbar` 배경 | `var(--topbar-bg, var(--bg))`, `--white` 수식어 = `#fff` |
| `cd-topbar--split-hidden` | 코드 사전(`library.html`) 가로 스플릿 뷰(769px~, 가로·세로 모드 무관)에서 탑바를 `display:none`. 뒤로가기는 사전패널 안에 둠. `.cd-topbar{display:flex}`가 파일 뒤쪽이라 `.cd-topbar.cd-topbar--split-hidden`(2클래스)로 우선순위를 올려 선언. 세로·모바일에선 탑바 그대로 |
| `cd-main` | `flex:1` + `overflow-y:auto` + `padding-inline: var(--cd-inset)` + `padding-bottom: calc(var(--grid-margin) + env(safe-area-inset-bottom))` + 세로 flex + 스크롤바 숨김 (박스는 뷰포트 전체) |
| `--cd-inset` | `max(var(--grid-margin), calc((100vw - 1440px) / 2 + var(--grid-margin)))` — 1440 이하 = 그리드 마진, 초과분은 좌우 균등 분배. `%`가 아니라 `vw`인 이유: 패딩과 자식 마진에서 기준이 달라지지 않게 |
| 피크바 | 마크업 인라인 `margin-left:auto`로 우측 끝. 크기는 `--cd-peak-*`(§7) |
| 브랜드 슬롯 `cd-topbar-brand` | 로고(`cd-topbar-logo` 24px) + 앱이름 24px/800 + 버전(`cd-topbar-version` 11px). 폭과 무관하게 고정. 홈만 사용, 서브뷰에선 JS가 `.hidden` |
| 우측 슬롯 `cd-topbar-end` | `margin-left:auto`. 여러 개면 보이는 첫 번째만 우측으로 밀고 나머지는 이어 붙음. 마지막 `.icon-btn`은 `margin-right: calc((--cd-topbar-icon − --cd-topbar-touch)/2)`(= -10px)로 아이콘 끝선을 그리드 끝선에 맞춤 |

### 11-3b. 탑바 전용 토큰 (2026-10-19)

`cd-topbar` 안 요소(아이콘 버튼·뒤로가기·피크바)는 **모든 페이지 공통 디자인**. 크기는 아래 토큰만 참조하고
페이지별·스코프별 덮어쓰기(`.app-shell:has(...)` 등)는 금지. 값은 `:root`, 769px~ 값은 페이지 셸 섹션 `@media`.

| 토큰 | ~768px | 769px~ | 적용 |
|---|---|---|---|
| `--cd-topbar-icon` | 24px | 28px | `.cd-topbar .icon-btn svg`, `#back-btn svg`(뒤로가기·X·설정·튜토리얼·검색) |
| `--cd-topbar-touch` | 44px | 48px | `.cd-topbar .icon-btn` 터치 영역. `#back-btn`은 박스가 아이콘 크기(좌측 끝선 그리드 정렬)이고 터치는 `::before`로 확장 |
| `--cd-peak-*` | §7 (구간 무관 고정) | §7 (구간 무관 고정) | 피크바 |

- 근거: Material·iOS 순정은 아이콘 24, 터치 44~48을 기기 크기와 무관하게 고정. 큰 화면(769px~)에서 상대적으로
  작아 보여 +4px만 확대(증가폭 4px 이내 원칙). dp/pt = CSS px.
- `#back-btn` 전역 규칙(`--icon-back-svg` 24px)은 탑바 밖(설정 페이지 탑바 등)에서만 유효.

### 11-3a. `cd-main` 안쪽 — `cd-head` / `cd-body` (2026-10-03)

`cd-main` 직속 자식 공통 구조. 타이틀+셀렉터 묶음(헤드)과 페이지 고유 콘텐츠(본문)를 나눔.

```html
<main class="cd-main">
  <header class="cd-head">                 <!-- 스크롤 중 상단 고정이면 cd-head--sticky 추가 -->
    <div class="cd-title">제목</div>
    <div class="cd-selector">…</div>       <!-- 선택 요소(키 선택기, 챕터 점 등). 없으면 생략 -->
  </header>
  <section class="cd-body">…페이지 고유 콘텐츠…</section>
</main>
```

| 요소 | 규격 |
|---|---|
| `cd-head` | `flex-shrink:0` + 세로 flex + `padding-top: var(--cd-head-pad)`(탑바↔타이틀) |
| `cd-title` | `font: var(--type-headline-sm)` + `letter-spacing: var(--tracking-base)`, `align-self:flex-start` |
| `cd-selector` | `margin-top: var(--cd-title-gap)`(타이틀↔셀렉터). 안쪽 배치는 페이지 고유 |
| `cd-body` | `flex:1; min-height:0` + 세로 flex + `margin-top: var(--cd-head-gap)`(헤드↔본문) |
| `cd-head--sticky` | `position:sticky; top:0; z-index:5` + `margin-inline: calc(var(--cd-inset) * -1)` + `padding-inline: var(--cd-inset)` + 배경 `var(--bg-primary, #fff)` (배경·구분선 풀블리드, 내용은 그리드 안) |

간격 토큰 (`:root`, 5단계 중 3구간만 분기):

| 토큰 | 의미 | 모바일 | 481px~ | 769px~ |
|---|---|---|---|---|
| `--cd-head-pad` | 탑바 ↔ 타이틀 | 16px | 20px | 24px |
| `--cd-title-gap` | 타이틀 ↔ 셀렉터 | 16px | 16px | 20px |
| `--cd-head-gap` | 헤드 ↔ 본문 | 24px | 24px | 32px |

- 간격 규칙(아래 요소 `margin-top` 한 곳)은 §19-1과 동일. 탑바↔타이틀만 `cd-head` 상단 패딩.
- 간격은 토큰만 사용. 페이지별 간격 오버라이드 금지(공통 토큰을 바꿔서 전 페이지 일괄 적용).
- 본문이 `min-height`로 커지면 `cd-main`이 스크롤(예: scale-training `.cd-body{min-height:auto}`).

### 11-4. 규칙

- 뼈대 CSS는 "페이지 셸" 섹션 한 곳에만. 페이지별 구역에 뼈대 규칙 금지.
- 페이지 간 차이는 수식어(`--modifier`)·CSS 변수로만. **페이지 이름으로 덮어쓰기 금지.**
  새 변종은 수식어 추가 후 여기 등록.
- 피크바 유무는 마크업으로 결정(필요한 페이지만 넣음, CSS로 숨기지 않음).
- **불필요한 wrapper 금지.** 뼈대 바로 안에 내용물. 레이아웃 목적만의 중간 div(`.main-content`/
  `.xxx-scroll` 류) 금지. wrapper는 내용상 묶음일 때만(예: 같이 sticky되는 `cd-head--sticky`).
- 내용물은 페이지 고유 클래스 유지, 자기 좌우 마진 없음(이중 인셋 방지).
- 뷰포트 끝까지 닿아야 하는 풀블리드 요소(구분선, 바 배경, 캐러셀)는 `margin-inline: calc(var(--cd-inset) * -1)`로
  `cd-main` 패딩 상쇄 (예: `.cd-head--sticky`, `.st-track`, `.scale-item-list`). 안쪽 패딩도
  `--cd-inset`으로 되돌려 내용은 그리드 안에 유지.
- **하단 여백: `cd-main`은 항상 `padding-bottom` = 그리드 마진(`--grid-margin`: 16/16/20/20/20px, §5) + 안전영역을 둠(2026-10-06 24px 고정 → 2026-10-21 그리드 마진으로 변경).** 내용이 얼마나 많아도 스크롤 끝에서 하단에 여백이 남아 안정감을 줌. 안쪽 요소에 하단 여백을 따로 넣지 말 것. 본문 높이를 JS로 계산하는 페이지는 `cd-main` 하단 패딩을 빼야 함(예: scale-level `updateScaleGapScrollMode`).
- 하단 안전영역(`safe-area-inset-bottom`)은 `cd-main`이 `padding-bottom`으로 전담. **이전하는 페이지가 안쪽 요소에서 이미 같은 값을 쓰고 있으면 이중 적용 → 이전 시 안쪽 값을 뺄 것.**
- **새 페이지는 반드시 `cd-*` 뼈대** → 그리드 마진·캡·중앙정렬 자동. 컬럼 배치(col2~11 등)는 콘텐츠별 판단.

### 11-5. 기존 페이지 이전

페이지 하나씩: `cd-*` 적용 → 그 페이지 전용 덮어쓰기 규칙(`:has(.xxx-scroll)`, 페이지명 셀렉터) 삭제 →
확인. 전부 끝나면 `.top-bar`/`.main-content` 삭제.

| 페이지 | 상태 |
|---|---|
| `scale-training.html` | ✅ 완료(2026-10-02), `cd-head--sticky`/`cd-body` 이식(2026-10-03), 구조는 §19-1 |
| `scale-level.html` | ✅ 뼈대 + `cd-head`/`cd-body` 이식(2026-10-03) — `.scale-level-layout` 제거됨. `.scale-level-main .cd-*` 오버라이드가 style.css에 남아 있음(정리 대상) |
| `progression.html` | ✅ `cd-head--sticky`(타이틀 + 필터 칩·`#/b` + 드롭다운) / `cd-body`(목록) 이식(2026-10-06) — `.prog-scroll`·`.prog-sticky-header`·기기별 폭 스코프 삭제, 카드·섹션 라벨 좌측 패딩 0(그리드 좌측선에 정렬) |
| `progression-detail.html` | ✅ `cd-head`(타이틀 + 코드 진행 + 12key 1줄 셀렉터) / `cd-body`(인디케이터·캐러셀·BPM·시작 버튼 한 묶음 `.progd-stack`, 등간격·세로 가운데) 이식(2026-10-06) — `.progd-layout` 삭제, 요소 크기는 `.progd-main`의 `--pd-*` 토큰(5단계 고정 px). 키 셀렉터 가로스크롤 함수는 `shared.js` 공용 |
| `strum-play.html` | ✅ `cd-head`(타이틀) / `cd-body`(캐러셀·비트 그리드·BPM 영역·시작 버튼, 높이 상한 900px, `space-between` + 세로 가운데) 이식(2026-10-06) — `.strum-play-area` 삭제, 비트 그리드는 `.strum-play-main`의 `--sg-*` 토큰(칸 32/52px). 다운·업·컷팅 아이콘은 `image/*_stroke.svg`(루시드 규격) 인라인 |
| `chord-combo.html` | ✅ `cd-head--sticky` + `cd-body`(챕터 카드 캐러셀) / 퀴즈 뷰 `cd-body` 이식(2026-10-06) — 선택 뷰 ↔ 퀴즈 뷰 슬라이드를 위해 `.combo-stage`(relative·overflow hidden) wrapper가 예외로 있음. `.combo-quiz-wrap`은 mission-session과 공용이라 이 페이지에서만 `#combo-view-quiz`로 덮음 |
| `home.html` 뼈대 | ✅ 탑바 `.top-bar.desktop-topbar` → `cd-topbar`(브랜드·튜토리얼·설정 슬롯), `.main-content` → `cd-main cd-main--stage`, `.bottom-nav` → `cd-dockbar`(2026-10-11). `.desktop-topbar`·`.bottom-nav`·데스크탑 사이드바 잔재(마크업·CSS) 삭제. 탭 안쪽(`cd-head`/`cd-body`)은 미착수 |
| `training` / `metronome` / `tuner` / `strumming` / `attendance` / `mission-session` / `chord-name-quiz` / `user_project` | ✅ 뼈대 이식(2026-10-11) — `.top-bar.desktop-topbar`(빈 껍데기) 삭제, 안쪽 `.top-bar` → `header.cd-topbar`(main 밖으로), `.main-content` → `main.cd-main.cd-main--stage`. **안쪽 스크롤 wrapper(`.training-scroll`·`.metronome-scroll`·`.tuner-wire-scroll`·`.strum-scroll`·`.attendance-scroll`·`.ms-scroll`·`.content-body` 등)와 `cd-head`/`cd-body` 구조화는 미착수** — `--stage`는 "자식이 스크롤·여백을 갖는" 중간 단계 |
| `home.html` 탭 본문 | 미착수(`cd-head`/`cd-body`) |
| `library.html` (코드 사전) | ✅ 홈 탭의 `#view-library`를 별도 페이지로 분리(2026-10-12) — B종 뼈대(`cd-topbar` + `cd-main--stage`). 가로(769px~)는 **스플릿 뷰**: 탑바를 `cd-topbar--split-hidden`으로 숨기고 좌측 사전패널(`.lib-panel`, 카드 16px 라운드, 아이콘 버튼은 §8-1 토큰) + 우측 코드 뷰. 로직은 `library.js`, "에디터로"는 sessionStorage 인계(`home.html?view=editor&from_lib=1`). 홈 쪽 원본 코드는 정리 전까지 남아 있음 |
| **정리 완료** | `.top-bar`·`.main-content`·`.desktop-topbar`·`.bottom-nav` 규칙 전부 삭제. `.top-bar-title/-version/-logo`만 `scale-level.html`이 써서 남음. 튜토리얼 모달 헤더는 `.tutorial-topbar` 자체 규칙 |

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

그림자·테두리: 카드 토큰(§13-1) 참조 — 코드 이전 예정.

### 13-1. 카드 `.cd-card` (2026-10-20)

모든 카드의 기본 디자인. **바탕은 `#fff` 단색**(앱 배경 `#FEFEFD`와 미세하게만 구분)이고, 깊이는 **그림자와 테두리 링의
대각선 그라데이션**으로만 준다. 투명·블러·바탕 그라데이션 없음. 값은 `:root` 토큰 한 곳 — 바꾸면 `.cd-card`를 쓰는
모든 카드가 일괄 변경된다.

| 토큰 | 값 | 의미 |
|---|---|---|
| `--cd-card-bg` | `var(--surface)` (`#fff`) | 카드 배경(단색) |
| `--cd-card-radius` | `var(--radius-lg)` (16px) | 모서리 |
| `--cd-card-shadow` | `inset 0 -1px 0 rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.05), 2px 8px 24px rgba(0,0,0,.10)` | 안쪽 아래 음영 + 접촉 그림자 + 넓은 번짐(왼쪽 위 빛 → 오른쪽 아래로 x 2px 치우침) |
| `--cd-card-ring` | `linear-gradient(135deg, rgba(0,0,0,.03) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,.10) 100%)` | 테두리 링: 왼쪽 위 아주 옅은 선 → 가운데 사라짐 → 오른쪽 아래 진한 선 |
| `--cd-card-ring-width` | `1px` | 링 두께 |

마크업: 요소에 `cd-card` 클래스만 추가. `.cd-card`가 `position: relative`, 배경, 모서리, 그림자, `::before` 링을 선언한다.

```html
<div class="level-detail-panel cd-card">…</div>
```

- 링은 `::before`에 `padding: var(--cd-card-ring-width)` + 마스크(`mask-composite: exclude`)로 만든다(둥근 모서리에서 `border-image`가
  안 먹음). `::before`는 전역 `*{box-sizing:border-box}`가 안 먹어 content-box라 크기 계산이 패딩만큼 다르게 찍힘(정상).
- 안쪽 요소(내용)에 `overflow: hidden`을 걸 때는 카드 자신이 아니라 안쪽 래퍼(예: `.ldp-inner`)에 건다 — 카드 자신에 걸면 그림자가 같이 잘림.
- 스크롤 컨테이너(`overflow: auto`) 안의 카드는 좌우 그림자가 잘리므로 컨테이너에 번짐(24px)+오프셋을 고려한 안쪽 패딩을 두고
  음의 마진으로 상쇄(예: 레벨 리스트 `.level-wheel-track`, 16px).
- 카드 안에 카드를 넣지 않는다(§0).
- 크기·패딩은 컴포넌트별. 구간별 분기 없음.
- 적용 현황: 코드맞추기 레벨 상세 패널(`#level-detail-panel`), 레벨 리스트 일반 카드(`.lw-item.cd-card`, JS가 부착), 예습 모달 코드 카드(`.preview-chord-card.cd-card` — `canvas`는 `::before`가 안 그려지는 대체 요소라 감싸는 `div`에 `cd-card`를 붙임). 챌린지 3종(`.lw-item--challenge-*`)은
  레벨 정체성이라 컬러 테두리·그림자·금속색 배경 전용 디자인을 유지(`.cd-card` 미부착, 모서리만 `--cd-card-radius`). 나머지 카드(`.cd-cardlist`, `.cd-modal`, 코드 사전 등)는 순차 이전.
- `.cd-card`는 파일 뒤쪽에서 `background`를 선언하므로, 상태별 배경(예: 선택 `.lw-item--selected`)은 `.cd-card.상태클래스`로 특이도를 올려 덮는다.
- **`::before`/`::after`를 이미 쓰는 요소**(피크 뱃지 `.mode-card--peak`, 번호 `.ms-quiz-choice-card`)는 `.cd-card` 클래스를 못 붙이므로 토큰을 직접 쓴다:
  `border: var(--cd-card-ring-width) solid transparent; border-radius: var(--cd-card-radius); background: linear-gradient(var(--cd-card-bg), var(--cd-card-bg)) padding-box, var(--cd-card-ring) border-box; box-shadow: var(--cd-card-shadow);`
  (흰 단색 위에 링 그라데이션을 레이어로 깔아 링을 만듦 — 대신 border 1px만큼 안쪽이 줄어듦). 상태 그림자는 `box-shadow: <상태 링>, var(--cd-card-shadow)`로 합친다.
- 적용 현황 추가: 모드 선택 카드(`.mode-carousel-card.cd-card`, `.mode-card`는 직접 적용), 퀴즈 문제 카드·선택지 카드(`.ms-quiz-question-card`, `.ms-quiz-choice-card` — 데일리미션과 공용 규칙, 직접 적용).

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
| 외형(모서리·배경·테두리·그림자) | 카드 토큰(§13-1 `.cd-card`) 참조 — 코드 이전 예정 |
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

## 19. 작업 인수인계 (2026-10-02 scale-training 파일럿, 2026-10-03 cd-head/cd-body 이식 반영)

### 19-1. scale-training.html 구조 — `cd-main` 안쪽(위→아래, 공통 구조는 §11-3a)

```
header.cd-head.cd-head--sticky   스티키, 풀블리드
  ├─ .cd-title                   "스케일 훈련"
  └─ .cd-selector.st-track       챕터 점 4개
section.cd-body                  (.scale-training-main .cd-body { min-height:auto })
  ├─ .scale-chapter-header       "Ch. N" + 부제. 1개, 스크롤됨. 글자는 JS가 교체
  └─ .scale-item-list #ch-1~4    캐러셀 4개. 처음에 전부 DOM에 있고 선택 챕터만 표시(나머지 --hidden)
```

- 챕터 이름은 각 캐러셀의 `data-title`/`data-subtitle`. `_showChapter(n)`(scale-training.js) = 점 활성 + 캐러셀 표시/숨김 + 헤더 글자 교체.
  점 클릭(`onChapterTabTap`)과 복귀 복원(`restoreLastPosition`)이 공용으로 호출.
- **간격 규칙: 형제 사이 간격은 한쪽(아래 요소의 `margin-top`)에만.** 탑바↔타이틀 = `--cd-head-pad`,
  타이틀↔점 = `--cd-title-gap`, 헤드↔본문(챕터 헤더) = `--cd-head-gap`(전부 §11-3a 토큰, 페이지별 오버라이드 없음).
  챕터 헤더↔캐러셀 = 간격 없음(카드는 남은 공간 정중앙).
- 캐러셀(`.scale-item-list`) 핵심 — **카드 크기는 캐러셀 "높이"가 결정**:
  - `flex: 1 1 0` + `container-type: size` — `cd-body` 안에서 챕터 헤더 아래 남은 세로 공간을 전부 차지(높이 확정)하고, 자식(카드·스페이서)이
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
- 카드 내부 크기 단위 `--cs` = 카드폭 ÷ 287 → 카드가 커지면 내부도 같은 비율(§19-3).
  낮은 화면 특수 스코프(스티키바·챕터 헤더 간격 조정)는 cd-head/cd-body 이식 때 삭제됨 — 간격은 공통 토큰만 사용.

### 19-2. 남은 TODO (미정리)

- **`--type-*` 적용 현황**: `.cd-title`·`.page-title`, `.scale-chapter-title`(headline-sm), `.scale-chapter-subtitle`(title), scale 카드 뱃지(label-sm)·이름(title)만. 나머지 약 70곳은 `font-size: var(--font-*)` 그대로.
- **자간**: `--tracking-base`(-0.04em) 신규. 옛 `--tracking-tight/-tighter/-tightest`와 사용 4곳(style.css 943·1280·1530·1539줄) 미정리 — 정리하면 -2~-3% → -4%로 바뀜.
- `--font-headline-sm` 사용 7곳이 `font-weight: 800` 리터럴(토큰 아님) — Headline=700과 불일치.
- 여백 스케일(§3) 밖 값: `.st-track` `padding-bottom: 14px`(12 또는 16 권장).
- 컴포넌트 폰트 비토큰: `--cd-btn-font-size` 15px(§6 홀수 위반), `.cd-modal` 제목 17px/두께 800(두께 토큰에 800 없음, §15).
- `.scale-chapter-label` CSS는 어디서도 안 씀(삭제 후보). `scale-training.html`의 캐러셀 내부 들여쓰기 미정리(약 1300줄).
- 하단 안전영역: `.cd-main { padding-bottom: calc(var(--grid-margin) + env(safe-area-inset-bottom)) }`로 처리함(안전영역 2026-10-02, 24px 여백 2026-10-06, 그리드 마진 2026-10-21). 실기기(제스처바 있는 기기, Capacitor WebView가 env 값을 실제로 주는지)에서 카드 아래가 가려지지 않는지 확인 필요.
- `.desktop-topbar` 처리 미정(§11-6). `scale-level.js` 481줄 주석이 삭제된 `사운드인식테스트.html`을 언급(동작 무관).
- **동기화**: scale-training 작업은 커밋(`956b99a`) 후 `www/`·android assets·cap sync 3단계 동기화 완료(2026-10-02). 이후 수정분은 다시 동기화 필요.

### 19-3. 카드 내부 디자인 — 완료 (2026-10-02)

카드 외형·배치(위 19-1)와 내부 디자인 모두 확정. 내부 구조만 요약:
- 위→아래: **헤더**(`.scale-card-header`: 레벨 뱃지 + 스케일 이름 + 구분선, 카드 패딩을 음수 마진으로 상쇄해 위·좌·우 끝에 붙음) → **지판+음이름 묶음**(`.scale-card-shot` + `.scale-card-notes`, 지판 `margin-top:auto`와 버튼 `margin-top:auto`가 남는 공간을 반씩 나눠 헤더 구분선~버튼 사이 정중앙) → **연습하기 버튼**(맨 아래).
- 카드 패딩·간격은 `--cs` 배수(`--cs` = 카드폭 ÷ 287 → 카드가 커지면 내부도 같은 비율). 토큰은 `:root`에서 `--cs`를 못 쓰므로 규칙 안에서 `calc(N * var(--cs))`로 직접 씀.
- 글자: 뱃지·이름은 `--type-*` 토큰(뱃지 `label-sm`, 이름 `title`), 음이름은 `--cs` 기반 직접 지정. 연습하기 버튼은 `.cd-btn` 토큰(§12, 아이콘은 `--cd-btn-icon-*`)을 참조.
- 낮은 화면 특수 스코프의 카드 글자 오버라이드는 삭제함(토큰을 덮어쓰므로). 스코프 자체도 cd-head/cd-body 이식으로 모두 제거됨.

**미정**: 넓은 화면에서 첫 카드를 그리드 좌측 컬럼에 맞추는 규칙(규칙 4)과 3↔4 전환 기준, 카드 최대 크기 상한(1920×1080 등 큰 화면에서 카드가 매우 커짐),
모바일 카드 노출 폭 40px가 0.88배 축소 때문에 실제로 약 14px 덜 보이는 문제(축소 완화 여부).

## 20. 옵션패널 — 화면 하단에 붙는 컨트롤 패널 (2026-10-22, 원본: 코드반주 훈련 연습 화면)

화면 하단에 붙어서 값을 조절하는 컨트롤 묶음 디자인. 다른 훈련·메트로놈 등에도 같은 모양을 쓸 수 있다. 원본은 `chordplay-practice.html` / `style.css`의 `.chordplay-practice-main …` 규칙이며, **재사용하려면 그 접두어를 공용 클래스로 승격**해야 한다(지금은 이 페이지 전용 셀렉터).

### 20-1. 위치와 구조
- `cd-body`의 **마지막 자식** `.option-zone` → 그 안에 `.option-panel.cd-card`(§13-1) → 안에 칸(grid).
- **항상 뷰포트 하단에 붙는다.** 위의 본문(캐러셀 등)이 남는 공간의 세로 가운데를 차지하고, 패널은 내용 높이만큼만. 높이가 모자랄 때만 `cd-main`이 스크롤(내용을 줄이거나 자르지 않음).
- 하단 여백 = 그리드 마진 + 안전영역(§11-4 그대로). 좌우는 화면 끝까지 풀블리드(`cd-main` 패딩 음수 마진으로 상쇄 후 안쪽 패딩으로 복원).
- 패널: 배경 `#f5f5f5`, 모서리 `--cd-card-radius`, 안쪽 패딩 4px, 최소 높이 240px.

### 20-2. 칸(셀) 규칙
- 패널 안은 CSS grid, 칸 사이 간격 **4px**, `grid-template-areas`로 배치. 현재: 3열(왼쪽 고정폭 칸 / 가변 `1fr` / 오른쪽 고정폭 칸 88px) × 2행.
- 칸 하나 = **흰색 배경 + 1px `rgba(0,0,0,.12)` 테두리 + 모서리 16px + 안쪽 패딩 8px**.
- 칸 안 버튼·카드는 배경 없이 글자·아이콘만(칸이 이미 카드).

### 20-3. 재사용할 수 있는 구성요소
- **큰 숫자 + 슬라이더 줄**: 숫자 56px(481px~는 64px)·두께 400·자간 -0.08em, 라벨은 숫자 오른쪽 13px(481px~는 14px). 아래에 `−` 슬라이더 `+` 줄: 슬라이더는 브랜드 색, 좌우 원형 버튼은 보이는 크기 24px에 터치 영역 44px(`::before inset:-10px`).
- **값 변경 오도미터**: 숫자가 바뀔 때 자리별 숫자 띠가 CSS transition으로 이동(0.7s, Material 표준 곡선 `cubic-bezier(0.4,0,0.2,1)`). 올라가면 위로, 내려가면 아래로, 9→0처럼 넘어갈 땐 띠를 한 바퀴 이어 붙여 같은 방향 유지. 자리 위·아래 가장자리 12%를 마스크로 흐리게. 자리수가 바뀌면 맨 앞 칸 폭이 자라고 줄어듦.
- **세로 슬라이더 팝업**: 눌린 카드 오른쪽 8px 옆에 열림. 폭 48px, 버튼 32px(터치 44px), 슬라이더는 브랜드 색. 구형 웹뷰 호환을 위해 `writing-mode`가 아니라 가로 `input[type=range]`를 -90° 회전해 세움(아래=최소, 위=최대). 높이는 칸 높이 전체이거나 짧게(120px, 카드와 세로 중앙, 칸 밖으로 안 나감). 열림은 통통 튀는 애니메이션, 한 번에 하나만 열림, 바깥 탭으로 닫힘.
- **아이콘 선택 버튼**: 터치 44px, 박스 없음, 선택된 쪽은 아이콘 선이 `--blue`(배경은 안 바뀜). 둘 중 하나만 선택(라디오).
- **휠 피커**: 한 칸 44px, 가운데 칸이 선택값, 한 줄 말줄임. 전체 목록은 모달에서(필터 알약 칩: 배경 `#f5f5f5`·글자 13px/600·선택 시 `--brand`, 왼쪽 고정 + 오른쪽 가로 스크롤).

### 20-4. 잠금(관문) 패턴
- 패널 전체를 `position:absolute; inset:0` 흰색 반투명 레이어로 덮고(55% + `backdrop-filter: blur(3px)`, 블러를 못 쓰는 웹뷰는 85% 불투명), 가운데에 `.cd-btn--peak` 버튼. 내용에는 `inert`를 걸어 포커스·키보드도 막는다.
- 푼 상태는 대상 id별 `sessionStorage`(새로고침 유지, 나갈 때 삭제). 프로 플랜은 처음부터 풀림.
- 이 패턴은 피크를 쓰는 어떤 패널에도 그대로 쓸 수 있다(관문 → 소모 → 해제).

### 20-5. 재사용 체크리스트
1. 구조 `option-zone → option-panel → grid 칸`을 복사하고 칸 안 내용만 바꾼다.
2. 칸 사이 4px, 칸 안 8px 외 간격 금지(§3 4px 배수).
3. 값 입력은 슬라이더 + 증감 버튼 조합, 값 표시는 오도미터로.
4. 팝업은 전부 카드 옆으로 열고, 컨트롤 잠금이 필요하면 20-4 방식.
5. 위 셀렉터 접두어(`.chordplay-practice-main`) 의존 — 두 번째 사용처가 생길 때 공용 클래스(`.cd-optionpanel` 등)로 승격하고 이 절 업데이트.

## 21. 진행 막대 (`.ms-progress-track` / `.ms-progress-fill`) — 행동심리학 장치 (2026-10-28)

탑바 가운데에 놓는 훈련 진행 막대. **코드 맞추기**(`updateProgressDots`)·**데일리 미션**(`msUpdateProgress`)·**리하모니 화성학**(`comboV2SetProgress`)이 같은 컴포넌트와 같은 곡선을 쓴다. 겉보기엔 단순한 막대지만 **의도된 심리 장치**이므로 아래를 임의로 바꾸지 않는다.

### 21-1. 곡선과 경고색 (바꾸지 말 것)
- 채움 폭 = **√(진행 ÷ 전체) × 100%**. 선형이 아니다.
- 색은 **파랑(기본) → 밝은 연두 초록 `#4CBB17`(75%↑, 정답 색과 같음) → 노랑 `#FFD60A`(90%↑)**(2026-10-28 변경 — 빨강은 "뭔가 잘못하고 있다"는 느낌을 줘서 쓰지 않음). 회색 알약 바탕 + 파란 채움 + 반사광.
- **채움 이징**: `.ms-progress-fill`의 폭 전환은 `0.3s cubic-bezier(0.16, 1, 0.3, 1)`(easeOutExpo — 초반에 거의 다 차고 끝에서 아주 강하게 감속, √ 곡선의 "쭉쭉 나가다 조금 남는" 느낌과 맞춤), 색 전환은 `0.6s ease`. 세 화면 공용.
- **적용 현황**: 리하모니 화성학(`comboV2SetProgress`)만 새 색. 코드 맞추기(`updateProgressDots`)·데일리 미션(`msUpdateProgress`)은 아직 옛 색(75% 노랑 / 90% 빨강) — 통일 여부 미정. 데일리 미션 승급시험의 "남은 시간" 게이지(`mission-session.js` 4012줄 부근)의 빨강은 시간 경고라 별개.

### 21-2. 왜 √ 곡선인가 (의도)
- **초반에는 시원하게 찬다** → 진도가 쭉쭉 나간다는 느낌을 줘서 몰입시킨다.
- **뒤로 갈수록 조금만 남는다** → 남은 작은 구간을 채우고 싶다는 열망(목표 가속·완료 욕구)을 만든다.
- 그래서 곡선을 선형으로 바꾸거나, 색 전환 임계값(75%·90%)을 옮기거나, 진행을 정답 수 기준으로 바꾸는 것은 이 장치를 깨는 변경이다.

### 21-3. 진행 규칙
- **맞든 틀리든 문제를 풀면 한 칸 진행**한다(유저 입장에서 푼 만큼은 전진해야 함).
- **오답으로 풀어야 할 문제가 늘어나면 전체(분모)가 그만큼 늘어난다.** 처음부터 본 문제 + 오답 몫을 채워야 했던 것처럼, 본 문제를 다 풀어도 오답 몫만큼 막대가 남는다. 예: 10문제 중 3개 틀림 → 본 문제를 마친 시점 10/13(√ 곡선으로 약 88%), 오답풀이를 다 맞혀야 100%.
- 틀려서 분모가 늘어도 막대는 **줄어들지 않는다**(`(진행+1)/(전체+1) ≥ 진행/전체`).
- 오답풀이에서 같은 문제를 다시 도전하는 동안은 움직이지 않고, 그 문제를 맞혔을 때 한 칸 찬다.
- 리하모니 화성학 구현: 본 문제 = `comboV2SetProgress(idx+1)`, 오답풀이 정답 = `comboV2SetProgress(n + 오답풀이 순번 + 1)`, 분모 = `n + wrong.length`.
- 데일리 미션은 오답 풀기 구간에서 분모를 틀린 문제 수로 **갈아끼우는** 별도 방식(`_msTotalSteps`)이라 이 규칙(분모를 늘림)과 다르다. 통일 여부는 미정.

## 22. 모바일 시선 분포와 배치 원칙 (2026-10-28)

화면에 요소를 얹을 때 **"어디에 두면 읽히는가"**의 기준. 새 화면·안내 화면·결과 화면의 배치를 정할 때 먼저 참고한다.

### 22-1. 연구 요약 (아이트래킹)
- **중앙·상단 절반에 집중**: 모바일 시선 연구(Lagun 등, Inspectlet 모바일 히트맵 가이드)에서 주의력은 화면의 **중앙과 상단 절반**에 압도적으로 몰린다. 데스크톱의 F자 패턴(좌상단 시작)과 달리, 좁은 화면에서는 좌우 주변부로 흩어지지 않고 **중앙 축을 따라 상단에 고정**되는 경향이 강하다.
- **중앙 바이어스**: 스마트폰 카메라 기반 AI 아이트래킹(Nature Communications 등)에서도, 자유롭게 볼 때 시선 핫스팟이 화면 중심에서 **약간 위쪽 중앙**에 조밀하게 생긴다.
- **하단으로 갈수록 시선이 급감**: 닐슨 노먼 그룹의 모바일 아이트래킹에서 화면 하단(스크롤해야 보이는 영역 아래, 최하단)으로 갈수록 시선 고정(fixation) 비율이 급격히 떨어진다. 텍스트는 **상단 20~30%**에서 시선이 가장 많이 머물고, 아래로 갈수록 필요한 것만 짚는 **점박이 패턴**으로 바뀐다.
- **스크롤 중에도 시선은 한 곳에**: 피드를 스크롤할 때 눈은 화면 전체를 따라 움직이지 않고 **상단에서 1/3~1/2 지점(중앙에서 약간 위)**에 고정해 둔 채 콘텐츠를 밀어 올리며 받아들인다.
- **시선과 엄지의 불일치**: 시선은 중앙·상단에 머물지만, 한 손으로 쥘 때 엄지가 편하게 닿는 영역(Natural Thumb Zone)은 **중앙·하단**이다.
- 정확한 비율은 콘텐츠 종류(텍스트·이미지·영상)와 행동(탐색·스크롤·정독)에 따라 연구마다 다르다. 원문 정리에 있던 "정보 인지의 60~70% 이상이 상·중단에서 처리"는 **출처가 특정되지 않은 대략치**라서 수치로 인용하지 않고 경향으로만 쓴다.

### 22-2. 이 앱에서의 배치 원칙
1. **꼭 읽혀야 하는 것(핵심 문구·핵심 숫자·강조 아이콘)은 화면의 상단~중앙 영역**에 둔다. 하단 끝에 핵심 정보를 두지 않는다.
2. **주요 버튼(CTA)·되돌아가기 같은 동작은 하단**(엄지 영역)에 둔다. 터치 영역은 44px 이상, 하단 여백은 그리드 마진 + 안전영역(§11-4).
3. 한 화면에 **읽는 것**과 **누르는 것**이 같이 있으면, 읽는 것은 위쪽 묶음·누르는 것은 아래 묶음으로 **나눠서** 배치한다(시선 위치와 엄지 위치가 다르다는 것을 그대로 따름).
4. **보충 설명은 읽기 우선순위가 낮으므로 하단 묶음**으로 내린다. 핵심 문구와는 간격을 넉넉히 둬서 서로 다른 묶음임이 보이게 한다(§5 마진 = 묶음 기준값).
5. 순차로 등장하는 안내(오답풀이 안내 등)는 **핵심 → 보충** 순서로 띄우고, 핵심은 위쪽에서 먼저 읽히게 한다.
6. 글자는 시선이 빨리 훑을 수 있게 안내성 화면의 문구는 **18px 이상**(§2 `--font-title` 이상), 색은 진한 본문색(`--text-primary`)을 쓴다.

### 22-3. 적용 사례
- **리하모니 화성학 오답풀이 안내 화면**: 윗묶음 = 피크 아이콘 + "오답을 풀면 피크 N개를 돌려받아요"(화면 위쪽 절반의 가운데), 아랫묶음 = 완주 조건·재도전 보충 설명(그 아래 중하단, 맨 아래는 비움).
- **리하모니 화성학 클리어 화면**: 트로피·"완주!"(호를 다 채운 판만 "레벨 클리어!")·칭찬 문구가 위·중앙, "돌아가기" 텍스트 버튼이 하단.
- **리하모니 화성학 건너뛰기 테스트 안내 페이지**: 문구 한 줄이 위쪽 영역, "시작하기"·"취소"가 하단(모달 대신 전체 화면 페이지).
- 새 화면을 만들 때는 위 22-2 중 어느 항목을 따랐는지 확인하고, 어긋나는 배치(핵심 문구를 하단에, CTA를 상단에)는 이유를 정한 뒤에만 쓴다.
