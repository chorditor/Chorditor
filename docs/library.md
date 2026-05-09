# 코드 라이브러리 아키텍처

## ⛔ 절대 수정 금지
- `chord-voicings.js` — 개발자가 직접 편집하는 보이싱 데이터. Claude 수정 금지.
- `parseChordNameToComponents()` — 코드 파싱 함수. 건드리면 텐션 파싱 깨짐.
- `applyChordSuggestion()` — 추천 코드명 적용 함수. 수정 금지.

---

## 데이터 파이프라인

```
chord-voicings.js          chords-library.js              app.js
──────────────────         ─────────────────────          ──────────────
CHORD_STATIC  ──┐          buildLibrary()                 chordsLibrary
CHORD_PATTERN ──┴─────────► Step1: PATTERN 파싱           (근음별 엔트리
                             Step2: STATIC 파싱            딕셔너리)
                             Step3: 정렬
                             Step4: 운지 병합
                            ────────────────────►  window.chordsLibrary
```

**로드 순서 고정:** `chord-voicings.js` → `chords-library.js` (index.html script 태그 순서)

---

## ⚠️ 바레 프렛·커버 범위 탐지 규칙 (절대 변경 금지)

### 바레 프렛 결정
`barre: true`인 패턴은 **손가락 번호 1이 2회 이상 등장하는 실제 프렛**을 바레 프렛으로 결정.

```js
// ✅ 올바른 구현
if (pat.barre) {
  const oneIdxs = fingerArr.reduce((acc, f, i) => { if (f === 1) acc.push(i); return acc; }, []);
  const barreFret = oneIdxs.length >= 2 ? (frets[oneIdxs[0]] ?? r) : r;
  barreObj = { [barreFret]: true };
}
// ❌ 절대 금지
// barreObj = pat.barre ? { [r]: true } : {};
```

### 바레 커버 범위 규칙 (fingers 6번줄→1번줄 순서)
- **Rule 1:** 1번줄부터 빈칸 없이 연속, 1이 2개 이상 → 1번줄~연속구간 끝
- **Rule 2:** 1과 1 사이 간격 있어도 처음 1~끝 1 전체에 바레
- **Rule 3:** Rule 1과 Rule 2 혼합 → Rule 1 우선

### 렌더링 흐름
```
chords-library.js → entry.barreRange = { min, max }
_drawLibCanvas    → data.barreRange 로 전달
drawCanvas        → barreRange 있으면 dots 기반 계산 대신 이 값 사용
```

---

## UI 레이아웃

```
┌─────────────────────────────┐
│  🔍 검색창 (lib-search-bar) │
├─────────────────────────────┤
│  lib-canvas (뷰어 캔버스)   │
│  [◀ 1/2 ▶] 운지 내비게이션 │
├─────────────────────────────┤
│  [#][b]  [▶재생] [저장][가져오기] │
├──────────┬──────────────────┤
│ C        │ □□□□             │
│ C#/Db    │ □□□□             │  lib-root-list / lib-cards-area
└──────────┴──────────────────┘
```

## 관련 전역 상태 변수
```js
let _libRoot         = 'C';
let _libEntry        = null;
let _libFingerMode   = true;
let _libFingeringIdx = 0;
let _libCurrentIdx   = -1;
let _voicingModalChord = null;
```

---

## 보이싱 데이터 표준 포맷 (chord-voicings.js)

### 공통 규칙
- 줄 순서: **6번줄(저음 E) → 1번줄(고음 e)**
- frets 토큰: `x`=뮤트 | `0`=개방 | 숫자=프렛 | `r`=근음프렛 | `r+N`/`r-N`=상대프렛
- fingers 토큰: `x`=없음 | `1~4`=손가락번호 | `T`=엄지

### CHORD_STATIC
```js
// [ frets, names, fingers, quality, fretNumber? ]
['x 3 2 0 1 0', ['C'], 'x 3 2 x 1 x', 'M', 2]
```

### CHORD_PATTERN
```js
// { pattern, rootStr, fingers, barre, quality, fretNumber?, name? }
{ pattern: 'r r+2 r+2 r+1 r r', rootStr: 6, fingers: '1 3 4 2 1 1', barre: true, quality: 'M' }
```

### quality 정렬 우선순위
`M → m → M7 → 7 → m7 → sus4 → 7sus4 → add9 → sus2 → aug → dim → aug7 → dim7 → m7(b5) → 6 → m6 → slash → hybrid → tension`

---

## 캔버스 렌더링 주의

라이브러리 엔트리의 `frets`는 **절대 프렛값**, `drawCanvas`는 **슬롯 번호(1~4)** 기준 → 변환 필수:
```js
const fretOffset = entry.fretNumber - 2;
슬롯 번호 = 절대프렛 - fretOffset
```

---

## 취급 코드 목록 (C 기준)

**Triad:** C, Cm, Caug, Cdim, Csus4, Csus2

**7th:** CM7, C7, C6, CmM7, Cm7, Cm6, Cdim7, Cm7(b5), Caug7, C7sus4

**전위:** C/E, CM7/E, C7/E, C/G, CM7/G, C7/G, C/B, C/Bb, Cm/Eb, Cm7/Eb, Cm/G, Cm7/G, Cm/Bb, Csus4/E, Csus4/G, Cadd9/E, Cadd9/G

**Tension:** Cadd9, CM7(9), CM7(#11), CM7(13), C7(b9), C7(9), C7(#11), C7(b13), C7(13), Cm7(9), Cm7(11)

**하이브리드:** C/D, C/F, CM7/F, C/A, Cm/Db, Cm/D, Cm/F, Cm/Ab, Cm/A, Cm/B
