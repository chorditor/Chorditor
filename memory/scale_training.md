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

---

## Ch.2 — 4도 메이저 전환 (secondary-iv) 시스템

### 개념
- `scaleKey === 'secondary-iv'`일 때 major 블럭 사용 (buildNavSequence에서 blockKey='major')
- 같은 startFret를 공유하는 두 폼이 "짝궁 블럭" — C메이저 C폼 ↔ F메이저 E폼 등

### CAGED 짝궁 매핑 (4도 전환)
| 원래 폼 (bi) | 짝궁 폼 | 방향 |
|-------------|---------|------|
| C폼 (bi=4)  | E폼     | ✅ 구현 완료 |
| A폼 (bi=0)  | D폼     | ✅ 구현 완료 |
| G폼 (bi=1)  | C폼     | ⬜ 미구현 |
| D폼 (bi=3)  | G폼     | ⬜ 미구현 |
| E폼 (bi=2)  | A폼     | ⬜ 미구현 |

### 새 폼 쌍 구현 프로세스 (Step-by-step)

#### Step 1. 사용자에게 줄별 전환 규칙 받기
사용자가 아래 형식으로 알려줌:
```
1번줄: 5→2, 6→3
2번줄: 2→6, 3→7, 4→1
3번줄: 6→3, 7을 왼쪽으로 한칸 옮긴 후 4로 전환, 1→5
...
```
→ 직접 물어보거나 사용자가 자발적으로 제공

#### Step 2. scale-data.js에서 두 폼 grid 읽기
```
FORM_NAMES = ['A폼', 'G폼', 'E폼', 'D폼', 'C폼']  ← bi 0~4 순서
SCALE_BLOCKS['major'][bi] 로 접근
```
grid 행 순서: 1번줄(s=0) → 6번줄(s=5), 열 순서: col 0~6 (startFret+0 ~ startFret+6)

#### Step 3. C major 기준 startFret 계산
```
anchor = 가장 위쪽 줄(s=0부터)에서 첫 '1'이 있는 (s, col)
anchorAbsF = 해당 줄에서 C음이 나오는 프렛
  → OPEN_MIDI = [64, 59, 55, 50, 45, 40]  (s=0=high E ~ s=5=low E)
  → target_midi: C 음들 = 60(C4), 72(C5), 48(C3) 등 중 OPEN_MIDI[s]보다 크거나 같은 최솟값
  → fret = target_midi - OPEN_MIDI[s]
startFret = anchorAbsF - anchorCol
```
**두 폼의 startFret가 같아야 짝궁** — 다르면 구현 불가 (뷰포트 이동 없이 dot만 이동하는 전제 깨짐)

#### Step 4. 줄별 (degree, absF) 비교 표 작성
각 폼의 absF = startFret + col

| string | 원폼 노트들 | 짝궁폼 노트들 | 처리 분류 |
|--------|-----------|------------|---------|
| s=N | dX@absF, ... | dY@absF, ... | 아래 규칙 적용 |

**처리 분류 규칙:**
- 위치 동일 + degree만 다름 → **degMap** (`'s,원degree': 새degree`)
- 한 폼에는 있고 다른 폼에는 없는 노트 → **삭제** 또는 **생성**
- absF가 ±1 다르고 대응되는 노트가 있음 → **슬라이드** (한 프렛 이동 + degree 교체)
  - 슬라이드는 전환당 **반드시 1개**만 존재 (양쪽 전환 모두)

#### Step 5. Phase 1 / Phase 2 코드 분류

**Phase 1 (즉시 실행, `transitionPair()` 진입 직후):**
- 삭제 대상: opacity=0, scale=0 fade-out 시작
- 슬라이드 대상: left % 변경 + dataset.absf/degree 업데이트

**Phase 2 (`setTimeout(fn, DURATION + 60)` 내부):**
1. fade-out된 요소 DOM 제거 (opacity===0 체크)
2. `_applyDegMap(neckEl, degMap)` 호출
3. `_spawnNote(neckEl, absF, s, degree)` 호출

**생성 노트의 absF 계산:**
- `cur.startFret + col` 형태 — col은 짝궁폼 grid에서 해당 노트의 열 번호
- 또는 인접 노트의 absF ± 1 (예: "6 오른쪽에 4 생성" → d6의 absF + 1)

#### Step 6. 역전환 degMap 작성
정방향 degMap의 키-값을 반전:
```
정방향: '0,5':2  →  역방향: '0,2':5
정방향: '1,4':1  →  역방향: '1,1':4
```
역전환의 슬라이드/삭제/생성도 정방향과 대칭으로 작성

#### Step 7. transitionPair()에 블록 추가
```javascript
} else if (bi === N) {  // 새 폼 bi 번호
  if (!_pairTransitioned) {
    // 정방향: Phase 1 즉시 코드
    setTimeout(function() {
      // Phase 2: 제거 → _applyDegMap → _spawnNote → 라벨/상태
    }, DURATION + 60);
  } else {
    // 역방향: 동일 구조
  }
}
```

### 핵심 검증 방법 요약
1. `scale-data.js` grid 읽기 (원폼/짝궁폼)
2. C major startFret 계산 + **두 폼 일치 확인**
3. 줄별 비교표 → 슬라이드 1개 / 삭제·생성 각 1개 / 나머지 degMap 식별
4. C major 기준 absF 수치로 코드 검증

### A폼↔D폼 C major 위치 검증 예시
A폼 startFret=1, D폼(F major) startFret=1 → 동일 ✓

| string | A폼 노트 | D폼 노트 | 처리 |
|--------|---------|---------|------|
| s=0 | d5@3, d6@5 | d2@3, d3@5 | degMap만 (위치 동일) |
| s=1 | d2@3, d3@5, d4@6 | d6@3, d7@5, d1@6 | degMap만 |
| s=2 | d6@2, **d7@4**, d1@5 | d3@2, **d4@3**, d5@5 | d7 슬라이드(-1프렛)+d4 / d6,d1 degMap |
| s=3 | d3@2, d4@3, d5@5 | d7@2, d1@3, d2@5 | degMap만 |
| s=4 | **d7@2**, d1@3, d2@5 | d5@3, d6@5 | d7 삭제 / d1,d2 degMap |
| s=5 | d5@3, d6@5 | d2@3, d3@5, **d4@6** | d4 생성(startFret+5) / d5,d6 degMap |

### 상태 변수 (`scale-level.js`)
```javascript
let _transitioning  = false;   // 애니메이션 진행 중 이중 호출 방지
let _pairTransitioned = false; // false=원폼, true=짝궁폼으로 전환된 상태
// renderNotes() 호출 시 자동 false 리셋 (블록 이동 시 초기화)
```

### transitionPair() 구조
```javascript
function transitionPair() {
  const bi = seq[_navIdx].bi;  // 현재 폼 인덱스로 분기

  if (bi === 4) {         // C폼 ↔ E폼
    if (!_pairTransitioned) { /* C→E */ } else { /* E→C */ }
  } else if (bi === 0) {  // A폼 ↔ D폼
    if (!_pairTransitioned) { /* A→D */ } else { /* D→A */ }
  } else {
    _transitioning = false; // 미구현 폼: 즉시 해제
  }
}
```

### 각 전환의 공통 패턴
모든 전환은 동일한 3단계 구조:
1. **Phase 1 (즉시)**: 삭제 대상 fade-out + 슬라이드 대상 position 이동
2. **Phase 2 (DURATION+60ms 후)**:
   - 페이드된 요소 DOM 제거
   - `_applyDegMap(neckEl, degMap)` → degree 재배정 + root 클래스 토글 + root-pop 애니메이션
   - `_spawnNote(neckEl, absF, s, degree)` → 새 노트 생성 + 스프링 팝인 애니메이션
3. **라벨/상태 업데이트**: `_pairTransitioned` 반전, 버튼 라벨 교체

### 헬퍼 함수
```javascript
_applyDegMap(neckEl, degMap)
// degMap 형식: { 's,degree': newDegree, ... }
// 예: '0,5':2 → s=0인 줄의 degree=5 노트를 degree=2로 교체
// root(degree===1) 되면 자동으로 fb-note--root-pop 클래스 추가 (400ms 후 제거)

_spawnNote(neckEl, absF, s, degree)
// 새 노트 생성 후 스프링 팝인 (cubic-bezier(0.34, 1.56, 0.64, 1))
```

### 새 폼 쌍 구현 체크리스트
- [ ] `scale-data.js`에서 두 폼의 grid 읽기
- [ ] C major 기준 startFret 계산 + 일치 확인
- [ ] 줄별 (s, degree, absF) 매핑표 작성
- [ ] 슬라이드할 노트 1개 찾기 (absF 차이 ±1)
- [ ] 삭제/생성 노트 찾기 (한 폼에만 존재하는 노트)
- [ ] 나머지 노트 → degMap 작성
- [ ] 역전환 degMap 작성 (키-값 반전)
- [ ] `transitionPair()`에 `else if (bi === N)` 블록 추가
- [ ] 역전환도 동일 구조로 추가

### 근음(root) 팝 애니메이션
```css
/* style.css */
@keyframes root-dot-pop { 0%{scale:0;opacity:0} 65%{scale:1.6;opacity:1} 100%{scale:1;opacity:1} }
.fb-note--root-pop::after { animation: root-dot-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) both; }
```
JS: `_applyDegMap()` 내부에서 자동 처리 (newDegree===1인 경우)

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
- Ch.2 나머지 짝궁 쌍 구현 (G폼↔C폼, D폼↔G폼, E폼↔A폼)
- 나머지 스케일(pentatonic, blues, natural-minor, harmonic-minor, mixolydian) 블럭 데이터 입력
