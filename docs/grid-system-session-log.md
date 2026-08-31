# 그리드 시스템 작업 로그 (홈탭 적용, 1일차)

> 오늘 한 작업 정리. 내일 이어서 할 때 여기부터 읽으면 됨.
> 관련 문서: `docs/style-guide.md` (그리드 값 정의 최종본)
>
> ⚠️ **이 로그의 브레이크포인트 수치는 작성 당시(1440px) 기준 — 이후 데스크탑 경계가
> 1600px로 상향 확정됨(`style-guide.md` §4/§5).** 아래 표·본문의 1440/1439는 당시 기록
> 그대로 남겨두고, 최신 기준은 `style-guide.md`를 본다.

## 오늘 한 일 요약

1. `docs/style-guide.md` 신규 작성 — 폰트 스케일/spacing 스케일/브레이크포인트 표/그리드 시스템(§5) 정의
2. 그리드 CSS 토큰 도입 (`style.css` 최하단, `:root`)
3. 홈탭(`home.html`)에 그리드 실제 적용 — 4개 브레이크포인트 티어 + Z Flip 2개 특수 스코프
4. `.top-bar`/`.bottom-nav` 높이 고정(54px), `.top-bar` 마진 토큰화
5. `G` 키 그리드 디버그 오버레이 추가 (`shared.js`, localhost/`?griddebug=1` 전용)

## 브레이크포인트 4단계 (확정)

| 티어 | 범위 | 컬럼 | 마진 | 거터 |
|---|---|---|---|---|
| 모바일 | ~480px | 6 | 20px | 16px |
| 작은태블릿 | 481~768px | 6 | 24px | 20px |
| 와이드태블릿 | 769~1439px | 12 | 32px | 24px |
| 데스크탑 | 1440px~ | 12 | 32px | 24px (+컨테이너 캡 `min(100%,1600px)`) |

토큰: `--grid-margin`, `--grid-gutter`, `--grid-cols`, `--grid-container-max` (`style.css` 최하단 `:root`).

## 핵심 패턴: 마진은 `#tab-view-*` 공유 wrapper에 margin으로

`.tab-view{position:absolute;inset:0}`라 margin을 주면 박스 자체가 줄어들고, 자식(`#view-home` 등)이 그 줄어든 박스를 그대로 상속받음. 그래서:
- `#tab-view-home`에 `margin-left/right: var(--grid-margin)`, `margin-top/bottom` 값
- 자식(`#view-home`)은 좌우 `padding:0` — 안 그러면 이중 인셋

**주의(오늘 발견한 실수)**: 요소가 이미 상위에서 margin으로 한 번 인셋됐으면, 그 안에서 또 `var(--grid-margin)`이 들어간 계산식을 쓰면 마진이 두 번 들어감. `#view-home`이 이 실수를 했다가 고침 — `--grid-margin` 빼고 `track+gutter`만 남김.

## 홈탭 요소 구조

`#view-home`(flex-column) 안에:
- `.home-top-stack` — 기본 `display:contents`(투명, 자식이 바로 `#view-home`의 flex 자식이 됨). Fold/Flip 힌지 스코프에서만 실제 flex 박스로 되살아남(자기들 세로분할용) — 이거 때문에 그리드 작업 중 "col1에 뭉침" 버그 발생, `.home-top-stack{display:contents}` 강제 리셋으로 해결.
  - `.home-daily-board` (출석/퀘스트 배너)
  - `.home-ad-banner` (광고 캐러셀)
- `.home-blocks` (에디터/코드사전/훈련소 카드, 2x2)

## 티어별 daily-board : ad-banner : home-blocks 비율 (flex, 최종값)

| 티어 | 비율 | 요소간 갭 |
|---|---|---|
| 모바일(~480) | 2 : 1 : 4 | 20px |
| 작은태블릿(481~768) | 2 : 1 : 3.5 | 20px |
| 와이드태블릿(769~1439) | 2 : 1 : 2.4 | 20px |

**와이드태블릿은 처음에 12컬럼 grid(`col2-11`/`col2-6`/`col7-11`)로 짰다가, 세로 비율(flex) 요구사항 때문에 전면 flex-column으로 전환함.** 12컬럼 grid는 가로 배치엔 좋은데 세로 비율 분배엔 안 맞음(grid-template-rows로 하려면 홈블럭 2x2가 행 하나를 벗어나는 문제). 좌우 인셋은 top-bar와 같은 `track+gutter` calc 재사용.

## dvh 관련 결정 (실무 원칙 정리)

- **한 화면에 다 맞춰야 함(스크롤 없음)**: 최상위(`.app-shell`/`body`)만 `dvh`로 실제 화면 높이 확보 → 안쪽은 전부 flex 비율(`flex:N`)로 분배. `Nvh`/`calc(vh-px)` 같은 개별 매직넘버 금지.
- **스크롤 허용 화면**: dvh 아예 안 씀. `auto`(콘텐츠 기준) + 필요하면 px 고정값만.
- `.app-shell`/`body`/`#page-cover` svh→dvh 전환 완료 (앱 전체 최상위, 주소창 실시간 대응).
- `.top-bar`(54px)=`.bottom-nav`(54px) 대칭으로 맞춰서 (원래 60px였음) `#view-home` 실제 높이 절반 = 물리 힌지 위치가 수학적으로 정확히 일치하게 만듦 — Fold/Flip 힌지 정렬 정확도의 핵심 트릭.

## Z Flip 스코프 (신규 확정값)

**주의: 기존 메모리 `mobile_viewport_reference.md`의 "Flip분할 360×440"은 부정확하다고 사용자가 정정함. 이 문서 값이 최신.**

### 펼친 상태
`min-width:360px, max-width:412px, min-aspect-ratio:9/22, max-aspect-ratio:9/22`

**실수했다가 잡은 것**: 세로로 긴 화면인데 `22/9`(가로긴 값)로 썼다가 미디어쿼리가 한 번도 안 걸림 — `9/22`로 고침. `mistakes.md`의 "미디어쿼리 축 뒤바뀜" 패턴 재발.

- 힌지가 화면 정중앙 가로선 → 배너묶음(`.home-top-stack`, daily-board+ad-banner) 위 50%, `.home-blocks` 아래 50%
- 갭 20px, `#view-home{gap:20px}` + `.home-top-stack`/`.home-blocks` 둘 다 `flex:1` → 자동으로 정확히 반반(탑바=바텀탭=54 대칭 덕분에 근사치 calc 없이도 정확)
- `.home-top-stack` 내부(daily-board:ad-banner)는 갭 20px, 비율 2:1 — 이 내부 갭은 top-stack 자기 몫(위 50%) 안에서만 소비돼서 바깥 힌지 갭엔 영향 없음

### 접힌 상태 (커버 스크린)
`min-width:360px, max-width:412px, min-height:412px, max-height:500px`

화면이 좁아서 스크롤 허용 설계로 전환 — `#view-home{overflow-y:auto}`, 세 요소 전부 `flex:none`(콘텐츠 기준 자연 높이). 배너+광고배너가 첫 화면에 보이고 홈블럭은 스크롤해야 보임.

## 기타 변경

- `.app-shell{max-width:400px}` "모바일 프레임 고정" 정책 완전 삭제 (모달/시트 등 다른 400px 캡은 안 건드림 — 별개 정책이라 유지)
- Fold/Fold8 힌지 스코프의 `--view-home-gap`(4곳), 힌지 시각화 DEV ONLY 오버레이(7곳)를 리터럴 px 대신 `var(--grid-gutter)`로 통일
- `#tutorial-entry-btn`: 오른쪽 마진 15px→0px, 아이콘 18px→24px
- `G` 키: 그리드 오버레이 토글 (`#grid-overlay-debug`, localhost 또는 `?griddebug=1`에서만 활성)

## 안 한 것 (내일 이어갈 것)

- **데스크탑(1440px~) 타어 홈탭 적용 전혀 안 함** — 지금 데스크탑은 사이드바 레이아웃(`.app-shell{display:grid;grid-template-columns:240px 1fr}`)이라 완전히 다른 구조, 별도 설계 필요
- 홈탭 외 다른 탭(노트/프로필)엔 그리드 시스템 적용 안 함 — `#tab-view-projects`, `#tab-view-profile`에 같은 패턴(margin 방식) 재사용 가능
- Flip 두 스코프 실기기/실측 검증 아직 안 함
- `--grid-track` 변수가 top-bar에서는 이제 안 쓰임(margin-inline이 그냥 `var(--grid-margin)`으로 단순화됨) — `#view-home`(와이드태블릿)에서는 여전히 씀. 나중에 top-bar 관련 주석/정리 필요할 수도
