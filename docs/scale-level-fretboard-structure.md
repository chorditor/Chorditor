# scale-level.html 레이아웃 & 기타지판 구조

컴팩션 전 정리. 스케일훈련 진입화면(scale-level.html) 작업 시작 전 참고.

## 1. 전체 레이아웃 단위

`.scale-level-layout { --cs: calc(100vw / 375); }`

- 스케일훈련 리스트(scale-training.html) 캐러셀의 `--cs`(카드폭/287 기준)와는 **별개 체계**.
- 이 페이지는 **뷰포트 전체 폭 기준**(375px 레퍼런스)으로 `--cs` 잡음.
- 형제 노드인 `.scale-test-overlay`(테스트 모달)도 상속 안 타서 `--cs`를 별도로 다시 선언.

구조 (2026-09-22 그룹 순서 개편 후, `.scale-level-layout`이 `justify-content:space-between`으로 4개
그룹을 직접 배치 — `.scale-level-bottom`은 더 이상 존재하지 않음):
```
.scale-level-layout (flex column, justify-content:space-between)
├─ .key-selector-section   — 그룹1: 타이틀 + 12key 선택 그리드 (맨 위)
├─ .scale-level-top        — 그룹2: 프렛보드 영역 (flex-shrink:0, 안 찌그러짐)
├─ .scale-mic-wrap         — 그룹3: 마이크/재생 버튼 (남는 공간 균등 분배로 흡수)
└─ .scale-test-btn-group   — 그룹4: 테스트 시작 버튼 (맨 아래)
```
고정 px 간격 대신 "남는 공간 나누기"(space-between) 방식이라, 공간이 부족해도 그룹끼리 겹치지 않고
그룹2·3 사이 간격만 줄어든다.

## 2. 기타지판(fretboard) 구조

**2026-09-22 "사진 확대" 스케일 시스템 도입으로 세로 좌표계·확대축소 메커니즘이 전면 교체됨**
(스펙은 `docs/style-guide.md` §17이 SSOT, 아래는 그 시스템이 이 페이지에 실제로 적용된 결과).

### HTML은 껍데기만
```
.fb-viewport (JS가 width/height 인라인 지정, mask-image로 좌우 페이드)
├─ .fb-viewport-inner (실제 7프렛 클릭 가능 영역, JS가 width/height 지정)
│  └─ .fb-full-wrapper (JS가 width 지정 + transform:scale()+translateX()로 확대·이동)
│     ├─ .fb-full-neck   — 줄·프렛·점·음표
│     └─ .fb-full-nums   — 프렛 번호
├─ .fb-peek-blocker--left  (좌측 "고스트 프렛" 클릭 차단용, JS가 width 지정)
└─ .fb-peek-blocker--right (우측 동일)
```
실제 내용물은 전부 `renderFullNeck()` (scale-level.js:1614)이 JS로 생성. HTML엔 빈 컨테이너만 존재.
`fb-viewport-inner`/peek-blocker는 뷰포트 폭이 남을 때 좌우로 다음 프렛을 살짝 미리 보여주는
"고스트 프렛 peek" 연출용(`computeFbPeek()`, scale-level.js:169) — 여유 공간이 40px 미만이면 폭 0으로
사실상 없는 것과 동일하게 동작.

### 상수
- `scale-data.js:24-25` — `FRETS_VISIBLE = 7` (한 화면에 보이는 프렛 수), `TOTAL_FRETS = 23` (0~22프렛 전체)
- `scale-level.js:135-138` — `STRINGS = 6`, `STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5]`(1~6번줄 굵기 다름), `SINGLE_DOT_FRETS`(3,5,7,9,15,17,19), `DOUBLE_DOT_FRETS`(12) — 포지션마커 위치
- `scale-level.js:144-154` — `FB_REF_*` 상수(360px 기준 고정 디자인값, `style.css` `.fretboard-row`의 `--fb-ref-*`와 동기화 필요 — §17 참고)

### 확대·이동 메커니즘 ("사진 확대" 방식)
- 23프렛 전체를 **360px 기준 좌표계에 고정 치수로** 한 번만 그려놓음(뷰포트 폭에 따라 재계산 안 함).
- `computeFbScale()`(scale-level.js:160)이 `.fretboard-row` 실측 폭 기준으로 배율을 계산 —
  `min(폭의 80%, 최대 480px 고정캡) / FB_REF_SPAN`.
- `applyFbScale()`(scale-level.js:177)이 그 배율로 `.fb-viewport-inner` 실측 width/height를 세팅하고,
  `.fb-full-wrapper`에 `transform: scale(배율) translateX(팬값)`을 적용 — **scale이 먼저(오른쪽) 합성**되어야
  이동량도 같은 배율로 늘어남(순서 반대로 하면 어긋남, §17 원칙 3).
- 좌우 화살표(`fb-arrow-prev/next`) → `scrollToFret()`(scale-level.js:1691)이 `_fbPanRef`(기준좌표계 px)를
  애니메이션시키고 `applyFbScale()`을 재호출 — **`viewport.scrollLeft`가 아니라 `transform: translateX()`로
  이동한다** (함수 이름은 과거 scrollLeft 방식 때 이름이 그대로 남은 것).
- `window resize` 시 `initFbScaleResize()`(scale-level.js:218)가 `applyFbScale()`을 재호출해 배율을 다시 계산.
- `block-indicator`가 현재 어느 7프렛 블록을 보고 있는지 표시.

### 좌표계
- 가로: **% 기반 절대좌표** — `left: (f + 0.5) / TOTAL_FRETS * 100%` 식. 전체 23프렛을 360px 기준
  좌표계에 그려놓고, 그 좌표계 전체를 `.fb-full-wrapper`의 `transform:scale()`로 통째로 확대·축소.
- 세로: `--fbu` 배수 — `.fb-full-neck` 높이 `calc(160 * var(--fbu, var(--cs, 1px)))`, `.fb-dot` 크기
  `calc(12 * var(--fbu, var(--cs, 1px)))`. `--fbu`는 `.fretboard-row`에서 360px 기준 고정값으로
  선언되는 **상수**(뷰포트에 안 좌우됨) — 실제 화면 크기 반영은 오직 JS의 `transform:scale()` 하나가 담당.
  `--cs`(`100vw/375`, 페이지 전역 단위)는 `.fretboard-row` 스코프 밖으로 나갔을 때만 쓰이는 폴백.
- 예외: `.fb-note`(음표 원)만 `22px` 고정 px — `--cs`/`--fbu` 안 탐(scale-training 카드 안 프리뷰의
  `.fb-note`와는 다른 룰, 그쪽은 `calc(24 * var(--cs, 1px))`로 별도 정의됨).

### 레이어 순서 (z-index)
1. `.fb-string` (줄, z2)
2. `.fb-nut-line` (너트, z2)
3. `.fb-fret-line` (프렛선, z1)
4. `.fb-dot` (포지션 점, z-index 없음/기본)
5. `.fb-fret-num` (프렛번호, 별도 트랙 `.fb-full-nums`)
6. `.fb-note` (음표, z3) — 사용자 인터랙션(짝궁 전환 등)으로 동적 추가·이동. scale-level.js 300~1200줄대에 반복 패턴 다수(코드별 노트 배치 로직).

### 기타
- 좌우 페이드 그라디언트 `.fretboard-fade-left/right` (68px 고정폭)가 뷰포트 잘리는 경계를 흐림 처리.

## 3. 핵심 요약

| 축 | 기준 | 비고 |
|---|---|---|
| 가로 | % 기반 절대좌표 (전체 23프렛 항상 존재, `.fb-viewport-inner` 창으로 7프렛만 노출) | JS 계산, `TOTAL_FRETS`/`FRETS_VISIBLE` 상수 |
| 세로 | `--fbu` = 360px 기준 고정값(`.fretboard-row`) | 뷰포트 반영은 `transform:scale()` 하나로만, `--cs`(`100vw/375`)는 스코프 밖 폴백 — §17(style-guide.md) 참고 |
