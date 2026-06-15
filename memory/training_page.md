# 훈련소 페이지 (training.html)

## 개요
기타 실력 향상을 위한 반복훈련 미니게임 모음 페이지.
홈 화면의 '훈련소' 블록 탭 시 `training.html`로 진입 (슬라이드업 애니메이션).

## 파일 목록
- `training.html` — 훈련소 페이지
- `training.js` — 페이지 로직 (통계 로드, 카드 탭 이벤트, 닫기)
- `style.css` — 훈련소 전용 CSS (파일 하단 섹션에 위치)

## 진입/이탈 방식
- **홈 → 훈련소**: `home.js`의 `enterFromBlock(event, el, 'training')` → `location.href = 'training.html'`
- **훈련소 → 홈**: `closeTrainingPage()` → `.app-shell`에 `project-exit` 클래스 추가 후 260ms 뒤 `location.href = 'home.html'`
- 진입 애니메이션: `.app-shell.project-enter` (기존 user_project와 동일한 슬라이드업)

## 현재 UI 구조 (training.html)

```
.app-shell
  .top-bar                         ← 탑바 (연회색 배경, X 버튼만)
  .main-content
    .training-scroll               ← height:100%, flex 컬럼, overflow-y:auto
      .training-page-title         ← "훈련소" (24px, 800)
      .training-stats-wrap         ← 통계 카드 (흰색, border-radius:20px)
        .training-stats-icon       ← bar-chart-2 아이콘 (오렌지 그라디언트)
        .training-stats-title      ← "훈련 통계" (13px, secondary색)
        .training-stats-row        ← 3개 stat 가로 묶음
          .training-stat-card × 3  ← 연속 기록 / 정답률 / 훈련 완료
      .training-section-label      ← "훈련 목록"
      .training-grid               ← 3열 그리드, flex:1, grid-auto-rows:1fr
        .training-card × 4         ← 아래 참조
```

## 훈련 카드 목록

| key | 클래스 | 아이콘 | 이름 | 상태 |
|-----|--------|--------|------|------|
| chord-name | `--chord-name` | help-circle | 코드 이름 맞추기 | **활성** |
| chord-diagram | `--chord-diagram` | grid-3x3 | 코드 다이어그램 찾기 | 준비중 |
| fretboard | `--fretboard` | music | 지판 음 위치 익히기 | 준비중 |
| rhythm | `--rhythm` | activity | 리듬 훈련 | 준비중 |

## 카드 디자인 규칙
- 카드 배경: 흰색 (`#fff`)
- 아이콘: 35×35px, border-radius:10px 라운드 정사각형에 액센트 그라디언트
- 이름: 좌하단, 13px, 700, `var(--text-primary)`
- 카드별 액센트 컬러:
  - chord-name: `#4f7cff → #274bdb` (파랑)
  - chord-diagram: `#f97b4a → #d44a1a` (오렌지)
  - fretboard: `#2dc98e → #16956a` (초록)
  - rhythm: `#a46df7 → #7635d4` (보라)

## 통계 카드 CSS 핵심
- `.training-stats-wrap`: `padding: 20px`, `display: flex; flex-direction: column; gap: 20px`
- `.training-stat-card`: `padding: 0`, `align-items: flex-start`
- 아이콘 (오렌지 그라디언트 `#ff9f43 → #ee5a24`)

## 그리드 동적 높이 처리
- `.training-scroll`: `height: 100%` → main-content 전체 채움
- `.training-grid`: `flex: 1; grid-auto-rows: 1fr` → 남은 공간 균등 분배
- `.training-card`: aspect-ratio 없음 (그리드가 높이 결정)

## 다음 작업 예정
- **코드 이름 맞추기** 게임 구현
  - 코드 다이어그램(캔버스) 표시 → 사용자가 이름 맞추는 퀴즈 형태
  - 정답/오답 처리 및 통계 기록 (localStorage or Supabase)
  - training.js에 게임 로직 추가 또는 별도 파일 분리
