# 튜토리얼 안정화 기록 (1.3.3_pre4)

STEP1~5 전 구간을 대상으로 "유저가 너무 빨리 조작하거나 설명과 다른 동작을 해서
진행이 막히는" 경로를 전수 검수하고 수정한 내용이다.

---

## 1. 근본 원인 두 가지

### (A) `target`에 컨테이너를 주면 그 안 모든 컨트롤이 열린다

가드(`tutorial.js`의 `_guardAllows`)는 현재 구간의 `target` 셀렉터로 찾은 요소가
터치 대상을 **`contains`** 하면 통과시킨다. 그래서 `target`에 모달·드롭다운·시트·줄 전체를
주면 그 안에 있는 **모든 버튼이 함께 열린다.**

유저가 지목되지 않은 버튼을 누르면
→ 모달이 닫히거나 대상이 사라지고
→ `advanceOn`은 이미 없어진 요소를 계속 기다리게 되어
→ **건너뛰기 말고는 탈출구가 없는 영구 정지**가 된다.

> 규칙: `target`은 **그 구간이 시키는 컨트롤 하나**만 연다.
> 스크롤이 필요해서 영역을 열어야 한다면, 그 안에 상태를 바꾸는 컨트롤이 없는지 반드시 확인한다.
> (읽기 전용 카드 목록은 열어도 되고, 슬라이더·토글·저장 버튼이 있으면 안 된다)

### (B) 구간 전환 딜레이(500ms) 동안 가드는 아직 "이전 구간"을 쓴다

`next()`는 `ADVANCE_DELAY_MS = 500` 만큼 기다렸다가 `_render()`에서 `_idx`를 올린다.
즉 **전환 딜레이 동안 가드가 참조하는 target은 여전히 이전 구간의 것**이다.

이전 구간 target이 넓으면 그 틈에 다음 조작이 먼저 들어가고,
그때 오는 알림은 `next()` 첫 줄의 `if (_advanceTimer) return;` 에 막혀 **통째로 버려진다.**

실제 발생 사례 — 마디 정보 수정:

1. "1마디" 체크 → 조건 충족 → `next()` → 500ms 타이머 시작
2. 그 사이 유저가 저장 탭 → 이전 구간 target이 `#row-meter-overlay .modal`이라 **통과**
3. `confirmRowMeterSave()` 실행 → 모달 닫힘 + `notify('rowmeter:saved')`
4. 그 알림은 `_advanceTimer`에 막혀 폐기
5. 500ms 만료 → 저장 구간 렌더. 모달도 알림도 이미 없음 → **영구 정지**

---

## 2. 수정 목록

### 진행 불가 (soft-lock) — 9건

| 스텝(변형 B 기준) | 구간 | 문제 | 수정 |
|---|---|---|---|
| STEP5 | 마디 정보 BPM / 박자 / 마디 수 | `#row-meter-overlay .modal` → 저장·취소·X까지 열림 | 각 구간이 시키는 박스만 (`#row-meter-bpm-box` / `#row-meter-sig-box` / `#row-meter-bars-toggle`) |
| STEP4 | 줄 지우기 | `.row-menu-dropdown` → 항목 6개 전부 열림 | `.row-menu-dropdown [data-action="delete"]` |
| STEP5 | 줄 복사 | 동일. "이 줄 삭제"가 눌리면 시드 줄 소멸 | `.row-menu-dropdown [data-action="duplicate"]` |
| STEP5 | 마디 정보 메뉴 열기 | 동일 | `.row-menu-dropdown [data-action="meter"]` |
| STEP2 | 코드 고르기 | `.lib-cards-area` → G 아닌 카드를 누르면 보이싱 모달이 뜨는데 닫을 경로가 차단됨 | `#lib-voicing-overlay` 추가 (여백 탭으로 복구) |
| STEP4 | C 코드 담기 | 동일 | 동일 |
| STEP4 | 소리 듣기 | `.chord-row-wrapper` → 편집 모드 슬롯의 **✕ 삭제 버튼**이 열림. C를 지우면 재생 대상이 없어 '다음'이 영영 안 풀림 | `.chord-slot-img` |
| STEP5 | 카포 전 / 후 듣기 (2곳) | 동일 | `.chord-slot-img` |
| STEP3 | 훈련 목록 | `.training-grid` → 아무 훈련 카드나 눌러 다른 페이지로 이탈. 그쪽엔 이어받기가 없음 | `target` 제거 (설명 전용 구간, pulse만) |

### 의도치 않은 동작 — 3건

| 스텝 | 구간 | 문제 | 수정 |
|---|---|---|---|
| STEP1 | "화면에 보이는 코드는 A 코드" | `target: '#c'` → 캔버스 전체 개방. 이후 모든 구간이 A 코드를 전제하는데 유저가 dot·개방현을 바꿔버릴 수 있었음 | `target` 제거 |
| STEP3 | 퀴즈 결과 모달 | `#result-modal-overlay` 전체 개방 → '다시하기'로 피크가 또 소모되고 새 판이 시작됨 | `#result-items` (스크롤 영역만) |
| STEP4 | 붙여넣기 | 결과가 어긋나면 열린 곳이 둘째 줄뿐이라 복구 불가 | `optional: true` 탈출구 추가 |

### 이벤트 유실 방어 — 1건

STEP5 마디 정보 **저장** 구간의 `advanceOn`을 이벤트 문자열에서 상태 판정으로 교체.
단발 알림은 놓치면 끝이지만, 상태는 이후 아무 `notify`에서나 다시 참이 된다.

```js
// before
advanceOn: 'rowmeter:saved',

// after
advanceOn: () => {
  const ov = document.getElementById('row-meter-overlay');
  return !!ov?.classList.contains('hidden')
      && document.querySelector(TUT_LINE_NTH(1))?.dataset.rowBpm === '60';
},
```

---

## 3. 검수했고 안전한 것 (수정하지 않음)

- **프렛 번호 ▶ 초과** — ◀로 되돌아올 수 있음
- **코드 사전 검색 오타** — 검색 모달이 `lib-action-bar` 상단에서 시작해 검색바가 계속 노출됨 → 재입력 가능
- **보이싱 오선택** — `selectLibEntry`가 모달을 닫지 않아 다시 고를 수 있음
- **손가락 번호 화살표** — 모듈로 순환이라 어느 방향으로도 도달
- **`canvasCell` 구간** — `home.js`가 지정 칸 외 입력을 차단하고, `_placeDot`이 지정 dot 삭제도 막음

### 남은 경미 사항 (정지 아님)

직전 구간과 다음 구간이 **같은 토글 버튼**을 쓰는 두 곳. 전환 딜레이 중에 눌리면
상태가 반전된 채 시작하지만, 토글이라 두 번 더 누르면 스스로 복구된다.

- STEP1 바레 `barre:3:on` → `barre:3:off` (`#barre-btns button[data-fret="3"]`)
- STEP5 뷰 모드 `slotshidden:true` → `false` (`.slot-toggle-btn`)

필요하면 이 둘도 상태 판정으로 바꿔 헛도는 것까지 없앨 수 있다.

---

## 4. 새 구간을 추가할 때 체크리스트

1. `target`이 컨테이너인가? → 그 안에 상태를 바꾸는 컨트롤이 있으면 좁힌다
2. 잘못 눌렀을 때 **되돌아올 경로**가 있는가? → 없으면 복구용 셀렉터를 함께 열거나 `optional`을 준다
3. 다음 구간의 컨트롤이 **이 구간 target 안에** 들어 있는가? → 전환 딜레이 중 유실된다
4. `advanceOn`이 단발 이벤트라면, 그 이벤트를 놓쳤을 때 되살아날 방법이 있는가?
5. 설명만 하는 구간이면 `target` 없이 `pulse`만 준다 (조작은 전부 잠긴다)
