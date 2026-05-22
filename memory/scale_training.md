# 스케일 훈련 (scale-training / scale-level)

## 개요
기타 스케일 블럭을 폼별로 학습하고, 셔플백 기반 테스트로 균등 반복 훈련하는 기능.

## 파일 목록
| 파일 | 역할 |
|------|------|
| `scale-training.html/js` | 스케일 목록 페이지 (Ch.1 ~ 스케일 종류 카드) |
| `scale-level.html/js` | 스케일 레벨 페이지 (프랫보드 뷰 + 테스트 오버레이) |
| `scale-data.js` | 스케일 블럭 데이터 + ScaleData 접근 모듈 |
| `shuffle-bag.js` | 셔플백 알고리즘 모듈 (범용) |

## 진입 흐름
```
training.html → scale-training.html → scale-level.html?key=major
```
- `scale-training.html`: 스케일 종류 카드 탭 → `scale-level.html?key=<scaleKey>` 이동
- `scale-level.html`: URL param `key`로 스케일 종류 결정, KEY 선택 + 테스트 시작

---

## scale-data.js 핵심 구조

### SCALE_BLOCKS
```javascript
SCALE_BLOCKS['major'] = [
  { id: 'major-pos1', label: 'Shape 1', grid: [ /* 6행×7열 */ ] },
  ...  // Shape 1~5
]
```

### grid 규칙
- 6행(1번줄→6번줄) × 7열(startFret→+6)
- `.` = 빈칸, `1` = 근음, `2`~`7` = 스케일 음계
- anchor = 가장 위쪽 줄 첫 번째 `1`

### ScaleData 주요 함수
```javascript
ScaleData.getBlocks(scaleKey)           // 스케일 블럭 배열
ScaleData.getStartFrets(block, rootNote) // 해당 키에서 유효한 startFret 목록
ScaleData.parseGrid(grid)               // { notes, roots, anchorString, anchorCol }
```

### 폼 이름 매핑
```javascript
const FORM_NAMES = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼'];
// CAGED 시스템 기반
```

---

## scale-level.js 핵심 구조

### 상태 변수
```javascript
let _scaleKey      = 'major';   // URL param
let _rootNote      = 0;         // 0=C ~ 11=B
let _navIdx        = 0;         // 메인 프랫보드 현재 폼 인덱스
let _useFlat       = false;     // #/b 토글
let _testItem      = null;      // 현재 테스트 중인 { block, bi, startFret }
let _testHint      = null;      // 힌트로 표시된 근음 위치 { s, col }
let _placedNotes   = new Set(); // 플레이어가 찍은 dot Set ("s,col")
let _testSubmitted = false;
let _shuffleBag    = null;      // ShuffleBag 인스턴스
```

### buildNavSequence()
선택된 키+스케일에서 유효한 모든 (폼 × startFret) 조합 반환:
```javascript
// 반환: [{ block, bi, startFret }, ...]  — startFret 오름차순 정렬
```

### 테스트 핵심 흐름
```
startTest()
  → buildNavSequence() → ShuffleBag.next() → _testItem 결정
  → renderTestNeck(startFret)  // 7프랫 고정 뷰
  → renderTestNotes()          // 힌트 근음 1개만 표시
  → 800ms 후 문제 텍스트 애니메이션

플레이어 탭 → addTestDot(key) / removeTestDot(key) (개별 DOM 조작)
            → playScaleNote(s, absF)

제출 → checkAnswer() → 정답(초록)/오답(빨강)/누락(점선) 분류
```

### renderTestNeck(startFret)
- 7프랫 고정 뷰 (스크롤 없음)
- `startFret ≤ 0` 이면 넛(fb-nut-line) 표시 + 넛 왼쪽 프랫선 제거
- 개방현 위치에 `fb-open-hint` 원 사전 배치 (pointer-events:none)
- 위치 공식: `leftPct = (absF - startFret + 0.5) / FRETS_VISIBLE * 100`

### checkAnswer() 분류 기준
```
correctSet = 블럭 전체 음 - 힌트 근음
placed ∩ correctSet  → fb-note--correct (초록)
placed - correctSet  → fb-note--wrong   (빨강)
correctSet - placed  → fb-note--missed  (점선)
```

### 사운드
Karplus-Strong 알고리즘 — `playScaleNote(string, absFret)`
- dot 찍을 때, 제출 후 정답 확인 시에도 탭하면 소리

---

## shuffle-bag.js (범용 모듈)

### 개념
셔플백(Shuffle Bag): 주머니에 모든 항목을 넣고 하나씩 꺼내는 방식.
주머니가 비면 재충전 + 재셔플 → 균등 반복 보장.

### 사용법
```javascript
const bag = new ShuffleBag('my-key', itemsArray);
bag.next()        // 다음 항목 (겹침 없음, 주머니 빌 때 자동 재충전)
bag.reset()       // 강제 초기화
bag.remaining     // 남은 개수
bag.total         // 전체 개수
```

### localStorage 저장 형태
```
키: 'shuffle-bag:<storageKey>'
값: { version: 1, order: [2, 5, 0, 3, ...] }  // 남은 인덱스 순서
```

### scale-level에서 사용
```javascript
const bagKey = `scale-test:${_scaleKey}:${_rootNote}`;
// 키/스케일 변경 시 새 인스턴스 생성, 동일 키면 localStorage에서 복원해 이어서 진행
if (!_shuffleBag || _shuffleBag._storageKey !== `shuffle-bag:${bagKey}`) {
  _shuffleBag = new ShuffleBag(bagKey, seq);
}
_testItem = _shuffleBag.next();
```

---

## CSS 주요 클래스 (style.css)

| 클래스 | 설명 |
|--------|------|
| `.scale-test-overlay` | 테스트 오버레이 (fixed, is-open 클래스로 슬라이드인) |
| `.scale-test-fb-wrap` | 테스트 프랫보드 래퍼 (padding: 0 36px) |
| `.fb-open-hint` | 개방현 비활성 힌트 원 (독립 클래스, background:transparent) |
| `.fb-note--placed` | 플레이어가 찍은 dot (pop 애니메이션) |
| `.fb-note--correct` | 정답 dot (초록 #34C759) |
| `.fb-note--wrong` | 오답 dot (빨강 #FF3B30) |
| `.fb-note--missed` | 누락 dot (점선 테두리) |
| `.fb-note--root` | 근음 dot (진한 #1a1a1a) |
| `.test-question--in` | 문제 텍스트 슬라이드인 애니메이션 (1.2s) |

---

## 현재 스케일 데이터 완성도
| 스케일 | 상태 |
|--------|------|
| major | ✅ Shape 1~5 완성 |
| pentatonic | ⬜ 미입력 |
| blues | ⬜ 미입력 |
| natural-minor | ⬜ 미입력 |
| harmonic-minor | ⬜ 미입력 |
| mixolydian | ⬜ 미입력 |

## 다음 작업 예정
- 나머지 스케일(pentatonic, blues, natural-minor, harmonic-minor, mixolydian) 블럭 데이터 입력
