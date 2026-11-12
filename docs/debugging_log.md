# 디버깅 로그

> 발생한 버그와 문제해결 과정을 누적 기록. 새 항목은 위에 추가.

---

## 2026-11-11: Android 노트 공유 버튼 무반응 — iframe의 Capacitor 플러그인 호출이 버려짐

### 증상
Android 앱에서 노트 공유 모달의 공유(OS 공유 시트) 버튼을 눌러도 아무 일도 없음. 링크 복사 버튼은 정상이라, 복사한 뒤 직접 붙여넣어야만 공유 가능.

### 처음 잘못 짚은 방향
`shareProjectViaOS()`(`shared.js`)와 `@capacitor/share` 플러그인 원본만 읽고 "코드 경로는 맞다, 실기기 logcat 없이는 원인 확정 불가"로 결론냄. **그 버튼이 어느 프레임에서 실행되는지**를 보지 않았음 — 1.4.x부터 노트는 항상 홈 노트 탭의 iframe(`user_project.html?embed=1`, `docs/notes-split-view-plan.md`) 안에서 열린다.

### 진짜 원인
- Capacitor Android는 iframe에도 `window.Capacitor`를 주입한다(`addDocumentStartJavaScript`는 같은 출처의 모든 프레임에 들어감) → iframe 코드는 자기가 네이티브 환경이라고 판단하고 `Capacitor.Plugins.Share.share()`를 부름.
- 그런데 네이티브 브리지 `node_modules/@capacitor/android/.../MessageHandler.java`는 `isMainFrame`이 아니면 `Logger.warn("Plugin execution is allowed in Main Frame only")`만 남기고 호출을 버린다.
- 호출한 쪽 약속(Promise)은 성공도 실패도 하지 않고 영원히 대기 → `catch`에도 안 걸려서 오류 하나 없이 무반응.
- `shared.js` 맨 위 `_embedCapacitorFacade`가 iframe 호출을 부모 프레임으로 넘겨 주는 장치였지만, **iOS 기준**(iframe에 `window.Capacitor`가 없음)으로만 만들어져 `if (window.Capacitor) return;`으로 Android를 건너뜀.
- 링크 복사는 플러그인이 아니라 웹 API(`navigator.clipboard`)라서 정상 동작 → "복사만 된다"는 증상과 일치.

### 수정
`_embedCapacitorFacade`가 iframe에 `window.Capacitor`가 이미 있을 때(Android)도 동작 — 자기 Capacitor는 두고 `PASS` 목록(`SaveImage`·`Share`·`Browser`)만 부모 프레임의 플러그인으로 바꿔 끼움(`Plugins`를 Proxy로 감쌈). 같은 원인으로 Android 노트의 이미지 저장(`SaveImage`)도 막혀 있었을 가능성이 높음(같이 해결, 실기기 확인 필요).

### 미리 감지하는 법 (체크리스트)
- **네이티브 플러그인을 부르는 코드를 만들거나 고칠 때: "이 코드가 iframe(`embed=1`) 안에서도 실행되는가?"부터 확인.** 노트 화면(`user_project.js`)과 거기서 쓰는 `shared.js` 함수는 iframe에서 실행된다.
- iframe에서 실행되면 그 플러그인이 `_embedCapacitorFacade`의 `PASS`에 있는지 확인하고 없으면 추가. iOS(주입 없음)와 Android(주입되지만 호출 버림) 둘 다 막히는 구조라 한쪽 기기에서만 확인하고 끝내지 말 것.
- "눌러도 아무 반응 없음 + 오류도 없음"이면 **끝나지 않는 약속**(네이티브가 응답을 안 줌)을 먼저 의심. 실기기 logcat에서 `Main Frame only` 경고를 찾으면 바로 확정된다.
- 코드 경로만 읽고 "원인 불명"으로 결론 내기 전에, 실행 위치(최상위 문서인가 iframe인가)와 플랫폼별 브리지 차이를 확인할 것.

---

## 2026-11-11: 공유 링크로 노트를 받으면 무료 한도(3개)를 넘김 → 기존 노트 전부 잠김 위험

### 증상(사용자 보고)
무료 유저가 노트 3개를 가진 상태에서 공유 링크를 열면 4번째 노트가 그대로 생성됨 — 한도를 막는 로직이 없음.

### 보고보다 더 컸던 실제 피해
노트 개수가 한도를 넘는 순간 `isNotesLockedState()`(`shared.js`, Pro→Free 강등용 잠금)가 참이 된다 → **'중요' 표시가 없는 기존 노트가 전부 잠김.** 유저 입장에선 링크 하나 열었더니 자기 노트들이 잠기는 사고. 보고된 증상("한도를 안 막는다")만 고쳤으면 이 연쇄를 놓쳤을 것.

### 원인
노트 생성 경로가 여러 개인데 한도 검사(`canCreateProject()`)는 새 노트 만들기 버튼 경로(`promptCreateProject`·`confirmCreateProject`)에만 있었고, 공유 링크 소비 경로 `_consumePendingShareCode()`(`home.js`·`user_project.js` 두 곳)는 `loadProjects() → push → saveProjects`로 바로 저장했음.

### 수정
- `_consumePendingShareCode()`에서 `canCreateProject()`가 거짓이면 노트를 만들지 않고 받은 내용을 `sessionStorage`(`np_share_waiting_payload`)에 보관 → 노트 탭으로 이동해 [기존 노트 삭제하기 / 불러오기 취소] 모달.
- 삭제를 고르면 목록 맨 위 [공유받은 노트 불러오기]가 자리가 날 때까지 비활성 → 자리가 나면 눌러서 생성.
- `user_project.js` 쪽 소비 경로는 한도가 찼으면 코드를 그대로 두고 홈으로 넘겨 같은 흐름을 탐.

### 미리 감지하는 법 (체크리스트)
- **노트(`projects`)를 새로 만드는 코드를 쓰거나 고칠 때: `loadProjects()` 결과에 `push`하고 `saveProjects()`하는 모든 경로에 `canCreateProject()` 검사가 있는지 grep.** 생성 경로: 새 노트 버튼, 공유 링크(`_consumePendingShareCode`), 붙여넣기 불러오기, 샘플 노트(`seedSampleNoteIfEmpty`), 튜토리얼, 로그인 동기화 복구(`syncProjectsOnLogin`) 등.
- 한도 관련 버그는 "한도를 넘는다"에서 끝나지 않는다 — **한도 초과 상태가 다른 기능(잠금 `isNotesLockedState`)의 트리거**가 되는지 같이 확인. 숫자 한도 하나가 여러 기능의 조건으로 쓰이면, 우회 경로 하나가 연쇄 피해를 만든다.
- 외부 진입(딥링크·푸시·공유·로그인 복구)은 버튼 UI를 거치지 않으므로 버튼 쪽 가드가 적용되지 않는다고 가정하고 따로 점검.
- **같은 구멍 발견 → 수정(2026-11-11 문서화 중 grep)**: 노트 탭 [불러오기](공유 코드 붙여넣기) → "새 노트로" 경로 `confirmImport('new')`(`home.js`)도 `canCreateProject()` 없이 `push → saveProjects` 하고 있었음. 새 노트 만들기와 같은 처리(모달 닫고 `openPlanModal('note_limit')`)로 막음. 기존 노트에 덮어쓰는 경로는 개수가 안 늘어서 해당 없음.
- 남은 확인점: 로그인 동기화(`syncProjectsOnLogin`)가 DB 노트를 복구하면서 한도를 넘길 수 있는지는 이번에 보지 않았음.

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
