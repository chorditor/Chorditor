# scale-level.html 레이아웃 & 기타지판 구조

컴팩션 전 정리. 스케일훈련 진입화면(scale-level.html) 작업 시작 전 참고.

## 1. 전체 레이아웃 단위

`.scale-level-layout { --cs: calc(100vw / 375); }`

- 스케일훈련 리스트(scale-training.html) 캐러셀의 `--cs`(카드폭/287 기준)와는 **별개 체계**.
- 이 페이지는 **뷰포트 전체 폭 기준**(375px 레퍼런스)으로 `--cs` 잡음.
- 형제 노드인 `.scale-test-overlay`(테스트 모달)도 상속 안 타서 `--cs`를 별도로 다시 선언.

구조:
```
.scale-level-layout (flex column, height:100%)
├─ .scale-level-top (flex:1)     — 프렛보드 영역
└─ .scale-level-bottom (flex:1)  — 키 선택 영역
```
상하 반반(flex:1 / flex:1).

## 2. 기타지판(fretboard) 구조

### HTML은 껍데기만
```
.fb-viewport (고정폭 슬라이딩 창, overflow:hidden)
└─ .fb-full-wrapper (JS가 width 지정)
   ├─ .fb-full-neck   — 줄·프렛·점·음표
   └─ .fb-full-nums   — 프렛 번호
```
실제 내용물은 전부 `renderFullNeck()` (scale-level.js:1282)이 JS로 생성. HTML엔 빈 컨테이너만 존재.

### 상수
- `scale-data.js:24-25` — `FRETS_VISIBLE = 7` (한 화면에 보이는 프렛 수), `TOTAL_FRETS = 23` (0~22프렛 전체)
- `scale-level.js:135-138` — `STRINGS = 6`, `STRING_THICKNESS = [1, 1.5, 2, 2.5, 3, 3.5]`(1~6번줄 굵기 다름), `SINGLE_DOT_FRETS`(3,5,7,9,15,17,19), `DOUBLE_DOT_FRETS`(12) — 포지션마커 위치

### 슬라이딩 메커니즘
- `wrapper.style.width = (TOTAL_FRETS/FRETS_VISIBLE)*100%` (≈328%) — 23프렛 전체를 한 번에 그려놓음.
- `.fb-viewport`가 `overflow:hidden`으로 7프렛 폭만큼만 보이게 창을 좁힘.
- 좌우 화살표(`fb-arrow-prev/next`) → `scrollToFret()`(scale-level.js:1357)이 `viewport.scrollLeft`를 옮겨 이동.
- `block-indicator`가 현재 어느 7프렛 블록을 보고 있는지 표시.

### 좌표계
- 가로: **% 기반 절대좌표** — `left: f / TOTAL_FRETS * 100%` 식. 전체 23프렛 그려놓고 스크롤 윈도우로 자르는 방식.
- 세로: `--cs` 배수 — `.fb-full-neck` 높이 `calc(160 * var(--cs))`, `.fb-dot` 크기 `calc(12 * var(--cs))`.
- 예외: `.fb-note`(음표 원)만 `22px` 고정 px — `--cs` 안 탐(scale-training 카드 안 프리뷰의 `.fb-note`와는 다른 룰, 그쪽은 `calc(24 * var(--cs, 1px))`로 별도 정의됨).

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
| 가로 | % 기반 절대좌표 (전체 23프렛 항상 존재, 스크롤로 7프렛만 노출) | JS 계산, `TOTAL_FRETS`/`FRETS_VISIBLE` 상수 |
| 세로 | `--cs` = `100vw / 375` 배수 | scale-training 카드 안 `--cs`(카드폭 기준)와 다른 체계, 페이지 단위로 별도 선언 필요 |
