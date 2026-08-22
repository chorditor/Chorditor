# 디버깅 로그

> 발생한 버그와 문제해결 과정을 누적 기록. 새 항목은 위에 추가.

---

## 2026-08-11: 태블릿 세로 gap 값 변경이 화면에 반영 안 됨

### 증상
`#view-home`의 `--view-home-gap`을 12→24→32→100px까지 올려도 화면상 간격 변화가 전혀 없었음. 같은 블록에서 `justify-content: center`는 정상 작동(가운데로 몰림).

### 잘못 짚었던 방향 (시간 소모)
- 미디어쿼리(`max-aspect-ratio: 1/1`) 자체가 안 먹는 것 아닌가 의심 — 사용자에게 콘솔 스크립트로 실측 요청까지 감 (실제로는 매칭 정상, `justify-content`는 먹혔으므로 애초에 성립 불가능한 가설이었음)

### 진짜 원인
`.home-ad-banner`에 이미 `margin-block: calc(20px - var(--view-home-gap))`가 걸려있었음(모바일 기본값 기준 미세조정용). `--view-home-gap`을 키우면 이 계산식이 자동으로 더 큰 음수 마진을 만들어 배너를 위아래로 끌어당겨서 gap 증가분을 상쇄함. gap 100px → margin-block -80px, 거의 다 잡아먹힘.

### 결정적 진단법
"바뀐 값이 안 먹는다" 유형은 미디어쿼리 매칭 여부부터 의심하기 전에, **내가 조작 중인 CSS 변수를 이미 참조하고 있는 다른 규칙(특히 `calc()`로 상쇄 작용 가능한 것)이 있는지 먼저 grep**했어야 함. `justify-content`는 먹혔다는 사실 자체가 "미디어쿼리 안 먹음" 가설을 이미 반증하고 있었는데도 계속 그 쪽으로 의심을 이어감.

### 교훈 (Claude 자체 약점, 사용자 지적)
레이아웃 정렬 방식을 스스로 바꿔놓고(`justify-content: space-between → center`, `--view-home-gap` 오버라이드 추가 등), **그 바뀐 상태를 기준으로 다시 점검하는 능력이 부족함**. 새 문제가 생기면 방금 내가 바꾼 코드와의 상호작용을 먼저 재검토하지 않고, 엉뚱하게 예전 코드/무관한 메커니즘(미디어쿼리 매칭 등)부터 의심하는 경향이 있음. 다음부턴 "방금 내가 뭘 바꿨는지"를 최우선 용의선상에 놓고, 그 변경과 겹치는 기존 규칙(같은 selector, 같은 CSS 변수 참조)부터 grep할 것.

### 수정
`H:\Project\Project\Chords_editor\style.css` 태블릿 세로 전용 블록(`max-aspect-ratio: 1/1`) 안에 `.home-ad-banner { margin-block: 0; }` 추가해서 상쇄 제거.

---

## 2026-08-10: 홈 탭 하단 여백 안 보임 (grid overflow)

### 증상
홈 탭 스크롤을 끝까지 내려도 마지막 `.home-block` 카드 줄과 하단탭(`.bottom-nav`) 사이 여백이 전혀 안 보임. `margin-bottom` 값을 20→40→40(재확인)px로 바꿔도 시각적으로 변화 없음.

### 잘못 짚었던 방향 (시간 소모)
- `margin-bottom` 값 자체 조정 (clamp min/max 순서, 고정값 vs 변수)
- ResponsivelyApp 캐시 의심 (실제로 한 번은 진짜 캐시 문제였지만, 이번 건 아니었음)
- JS 커스텀 모멘텀 스크롤이 true bottom에 도달 못하는 것 의심 (`scrollTop === maxScroll` 확인으로 배제됨)
- 배경색 대비 부족 의심 (`--bg` #FAFAF9 vs 카드 흰색, 차이 5~6/255) — 부분적으로 맞는 지적이었으나 진짜 원인 아니었음

### 진짜 원인
`.home-blocks`(display:grid, 카드 aspect-ratio 기반 auto 행높이)에 **동시에** `flex:1` + `min-height:420px`가 걸려있었음. 부모 `#view-home`이 flex-column이라 `flex:1`이 grid 컨테이너의 박스 높이를 "남은 공간"만큼 강제로 계산했는데, 이 계산값이 그리드 실제 콘텐츠(카드 2줄)가 필요로 하는 높이보다 작았음.

결과:
- 그리드 컨테이너의 **박스 자체**(margin-bottom이 붙는 기준선, `getBoundingClientRect()`/`scrollHeight` 계산 기준)는 작은 값 그대로
- 근데 마지막 줄 카드는 그 작은 박스 밖으로 **시각적으로 overflow**되어 그려짐 (grid는 기본적으로 overflow 안 잘림)
- 그래서 margin-bottom은 DOM/CSS 계산상 완벽히 정상 존재하는데, 실제 화면에서는 카드가 그 자리를 덮어버려 안 보였음
- "스크롤 위치·타이밍과 무관하게 항상 정확히 딱 붙는다"는 사용자 관찰이 핵심 단서였음 — margin 문제였다면 그렇게 항상 정확히 0px로 붙을 이유가 없음. 구조적 overflow라 매번 동일하게 재현된 것.

### 결정적 진단법
일반적인 방법(Computed 패널 margin 값 확인, `getBoundingClientRect()`로 gap 계산)은 전부 "정상"으로 나와서 원인을 못 잡음 — 이 수치들은 **박스 모델**만 알려주지 **실제로 그 픽셀에 뭐가 그려지는지**는 안 알려주기 때문.

결정적으로 원인을 찾은 방법:
```js
document.elementFromPoint(x, y)
```
여백이 있어야 할 좌표를 직접 찍어서 "거기 실제로 뭐가 그려지고 있는지"를 물어봄. `.home-blocks`의 `getBoundingClientRect()` 기준으로는 이미 끝난 좌표인데도 `.home-block--soon` 카드가 잡혀서, 카드가 컨테이너 박스보다 더 크게 그려지고 있다는 게 바로 드러남.

### 교훈
"계산된 수치는 정상인데 화면엔 안 보인다" 류의 버그는 margin/padding 값 자체를 의심하기 전에, **`elementFromPoint()`로 그 좌표에 실제로 뭐가 렌더링되는지부터 확인**할 것. box model 수치와 실제 페인트 결과가 다를 수 있다는 걸 먼저 가정.

### 수정
`H:\Project\Project\Chords_editor\style.css` — `.home-blocks`에서 `flex: 1`, `min-height: 420px`, `align-self: flex-end` 제거. `margin-bottom`은 `var(--view-home-inset, 20px)`로 좌우 padding과 통일.

### 미완료
- `www/style.css`, `android/app/src/main/assets/public/style.css` 동기화 아직 안 함 (사용자가 나중에 몰아서 하기로 함)
- 375x812 기준 확인 완료. 다른 기기 비율(태블릿/폴드/플립/데스크탑)에서도 재확인 필요 — 사용자가 "전체 다 해결함"이라 답했으나 각 사이즈별 스크린샷 기반 검증은 아님
