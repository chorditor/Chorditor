# 백킹 트랙 (Backing Tracks)

> 배경 반주(드럼 + 피아노)를 깔아 주는 공용 기능. 첫 사용처는 스케일 훈련(`scale-level.html`)의
> 연습모드(기타 버튼). 메트로놈·코드진행 등 다른 페이지도 같은 엔진·데이터를 재사용할 수 있다.
>
> **상태 (2026-10-02): 구현됨.** 파트는 드럼·피아노. 베이스는 이후 확장. 기타 마이크 연주인식은 이 기능으로 대체되어 삭제됨.

## 1. 구성 파일

| 역할 | 파일 | 내용 |
|---|---|---|
| 엔진 + 스타일/진행 데이터 | `backing-track.js` (`BackingTrack`) | 스케줄러, `STYLES`, `QUALITIES`, `PROGRESSIONS` |
| 드럼 패턴 데이터 | `drum-sets.js` (`window.DRUM_SETS`) | 세트 id → `{steps, kick[], snare[], hat[]}` (step 인덱스). 스타일 '기본'은 1번(기본 8비트) |
| 드럼 소리 | `drum-audio.js` (`DrumAudio`) | `hit(inst, absTime, vel)`, `stop()`, `ready()`, `resume()` |
| 피아노 소리 | `guitar-audio.js` (`GuitarAudio`) | `playPianoChord(midis, duration, time, velocity)`, `pianoReady()`, `warmupPiano()`, `resetPiano()` — FluidR3_GM 그랜드(CDN) |
| 화면(연습모드) | `scale-level.js` / `scale-level.html` / `style.css` | 옵션 UI, 코드 진행 표시·강조, 챕터2 자동 전환 |

로드 순서: Tone.js → `guitar-audio.js` → `drum-sets.js` → `drum-audio.js` → `backing-track.js` → 페이지 JS.

## 2. 핵심 원칙

1. **시계는 하나.** `AudioContext.currentTime` 기준 룩어헤드 스케줄러(0.15s 앞, 25ms 주기, 시작 지연 0.1s) 한 곳에서 드럼·피아노를 같이 예약. 파트별 타이머 금지.
2. **오디오와 동기화되는 화면 효과는 `setTimeout` 금지.** rAF가 오디오 시계 기준 값(`getCurrentChordIndex()`, `consumeDueForm()`)을 읽는다 — 출력 지연(`outputLatency`)까지 반영.
3. **데이터와 엔진 분리.** 스타일·코드 진행은 `backing-track.js` 상단 데이터, 재생 로직은 엔진. 화면의 코드 이름 표시도 같은 진행 데이터를 읽는다(하드코딩 금지 — 소리와 화면이 어긋나지 않게).
4. **정지 = 즉각 무음 + 초기화.** 피아노는 `releaseAll`로 꼬리·예약분이 남아서 `resetPiano()`(샘플러 폐기·재생성)로 끊는다. 드럼은 `DrumAudio.stop()`이 예약분까지 정리.

## 3. 엔진 API (`BackingTrack`)

```js
BackingTrack.start(getParams, styleId)   // getParams: () => ({ bpm, root, level }) — 매 스텝/마디 읽음 → 재생 중 BPM·키 변경 반영
BackingTrack.stop()                       // 재생 중일 때만 정리 (아니면 no-op)
BackingTrack.isPlaying()
BackingTrack.getProgression(level)        // [{offset, suffix, sup, label, repeat}] — 화면 표시용
BackingTrack.getCurrentChordIndex()       // 지금 들리는 코드의 진행 내 인덱스(없으면 -1)
BackingTrack.consumeDueForm()             // 도달한 폼 전환 신호 'orig' | 'pair' | null (챕터2 자동 전환)
```

- BPM은 다음 스텝부터, 키(root)는 다음 마디부터 반영. 1스텝 = 8분음표, 1마디 = 8스텝(4/4).
- 샘플 로딩(`DrumAudio.ready`, `GuitarAudio.pianoReady`)과 `Tone.start()`를 `start()` 안에서 기다림. 대기 중 `stop()`이 불리면 시작하지 않고 `false` 반환.

## 4. 스타일 '기본'

| 파트 | 정의 |
|---|---|
| 드럼 | `DRUM_SETS` 1번 — 기본 8비트 (킥 1·3박, 스네어 2·4박, 하이햇 8분음표) |
| 피아노 | 한 마디에 코드 2번: 1번째 칸에서 길이 3, 4번째 칸에서 길이 5 (3+5 싱코페이션). 세기 0.7 |
| 보이싱 | 왼손: 베이스 한 음(슬래시 코드는 지정 베이스, 아니면 근음) E2~D#3 / 오른손: 코드 구성음을 G3~D5 안의 닫힌 배치로, 직전 코드와 평균 음높이가 가장 가까운 전위를 선택(음 이동 최소화, 첫 코드는 D4 근처). 7th 코드는 근음을 오른손에서 생략하고 3·5·7도 중심 |

새 스타일은 `STYLES`에 `{ name, drum: <DRUM_SETS id>, piano: [{step, len}, ...] }` 추가. 화면 옵션 목록은 `scale-level.js`의 `PRACTICE_STYLE_OPTIONS`(id = `STYLES` 키).

## 5. 코드 진행 데이터 (`PROGRESSIONS`)

> 레벨 번호는 **내부 번호(ID)**다. 챕터 1의 메이저 펜타토닉·메이저 블루스는 기존 기록을 지키려고 ID 25·26을 쓰고, 화면에는 2·3번으로 보인다(`shared.js`의 `scaleLevelDisplayNo`).

> 화면의 "KEY" 버튼은 **스케일의 근음**이다. 진행의 로마숫자는 기본적으로 이 근음 기준(챕터 3의 모드 레벨 `i`·`bII` 등). 단, 레벨 18처럼 선택한 근음이 `V7`의 근음인 경우는 그 `V7` 기준으로 ii를 계산한다.

레벨 번호 → 한 마디에 코드 하나, 순환. 항목 = `[루트에서 반음 거리, 코드 종류, 코드 위 라벨, 폼, 베이스 음]` (뒤쪽은 생략 가능). 베이스 음은 슬래시 코드용(키 루트 기준 반음 거리, 피아노 한 옥타브 아래 추가, 화면에 `/C`로 표기).

| 레벨 | 진행 (C 키 / A 마이너 기준) | 비고 |
|---|---|---|
| 1 | I – IV – I – V (`C F C G`) | 장조 |
| 2·3·4 | i – iv – i – V (`Am Dm Am E`) | 키 선택기 A 시작·`Am` 표기 |
| 5 | iim7(b5) – V7 – im – % (`Bm7⁽ᵇ⁵⁾ E7 Am %`) | 앞 마디와 같은 코드는 화면에 `%` 자동 표기 |
| 6 | IV – V – I – I7 (`F G C C7`) | `C7` 위에 '전환!' 라벨, `C7`은 전환 폼 연주 |
| 7~10 | 챕터 2 — 각 레벨 전환 코드 1개(`II7` `III7` `VI7` `VII7`) | 6번 줄 참고, 키 설정은 C 시작 |
| 11 | 레벨 1과 동일 (`C F C G`) | 이오니안 |
| 12 | i – IV7 – i – IV7 (`Cm F7 Cm F7`) | 도리안 |
| 13 | i – bIIM7 – i – bIIM7 (`Cm DbM7 Cm DbM7`) | 프리지안 |
| 14 | I – II7/I – I – II7/I (`C D7/C C D7/C`) | 리디안, 슬래시 코드 |
| 15 | I7 – % – bVII – % (`C7 % Bb %`) | 믹솔리디안 |
| 16 | i – iv – i – v (`Cm Fm Cm Gm`) | 에올리안, 키 선택기는 C 기준 |
| 17 | im7(b5) – % – bII – % (`Cm7⁽ᵇ⁵⁾ % Db %`) | 로크리안 |
| 18 | iim7(b5) – % – V7 – % (`Gm7⁽ᵇ⁵⁾ % C7 %`) | 선택한 C = V7의 근음 |
| 19 | imM7 – % – V7 – % (`CmM7 % G7 %`) | 멜로딕 마이너 |
| 20 | 7alt. – % – % – % (`C7alt. % % %`) | 얼터드. 선택한 C = 알터드 도미넌트의 근음 |
| 21 | im7(b5) – % – dim7 – % (`Cm7⁽ᵇ⁵⁾ % Cdim7 %`) | 로크리안 #6 |
| 22 | I7(#11) – % – % – % (`C7⁽#¹¹⁾ % % %`) | 리디안 도미넌트 |
| 23 | I7(9,b13) – % – % – % (`C7⁽⁹˒ᵇ¹³⁾ % % %`) | 믹솔리디안 b13 |
| 24 | im7(b5) – % – % – % (`Cm7⁽ᵇ⁵⁾ % % %`) | 로크리안 #2 |
| 25 | 메이저 펜타토닉: I – IV – I – V (`C F C G`) | 표시 번호 2, 키 선택기 C 기준 |
| 26 | 메이저 블루스: I7 – IV7 – I7 – V7 (`C7 F7 C7 G7`) | 표시 번호 3, 키 선택기 C 기준 |
| 27 이상 | (미정) | 레벨 1 진행으로 대체됨 |

- 코드 종류(`QUALITIES`): `M` 장3화음(오른손 근음 포함), `m` 단3화음(오른손 근음 포함), `7` 도미넌트7, `M7` 메이저7, `mM7` 마이너 메이저7, `m7` 마이너7, `7alt` 표기는 `7alt.`(점 포함), 소리는 도미넌트7 + #9 텐션만, `m7b5` 하프디미니시드, `dim7` 디미니시드7, `7s11` 도미넌트7(#11)(위첨자 `(#11)`), `7n9b13` 도미넌트7(9,b13)(위첨자 `(9,b13)`). 표기용 `suffix`(`m7`)와 위첨자 `sup`(`(b5)`) 분리. 새 종류는 여기에 추가.
- 키 선택기 설정은 `scale-level.js`의 `LEVEL_KEY_UI`(레벨별 시작 키·`m` 표기). 레벨 2~5는 A 시작.

## 6. 챕터2 자동 전환 (스케일 폼 ↔ 4도 폼 등)

연습모드에서 재생만 해도 반주 진행에 맞춰 스케일 블럭이 알아서 전환된다.

- 진행 항목의 4번째 값 `'pair'` = 그 코드는 **전환 후 폼**으로 연주. 생략 = 원래 폼.
- 다음 마디 코드의 폼이 지금과 다르면, **그 코드 시작 1박(4분음표) 전**에 전환 신호(`consumeDueForm()`)가 나오고 화면이 기존 `transitionPair()`를 호출.
  레벨 6: `C7` 직전에 전환 → 루프 첫 코드 `F` 직전에 원래 폼으로 복귀.
- 전환 애니메이션은 BPM과 무관하게 **약 290ms**(`scale-level.js`의 `PAIR_SLIDE_MS` 250 + `PAIR_WAIT_BUFFER_MS` 40)에 끝난다. 슬라이드·제거·새 dot 생성이 **동시에** 재생되고, 끝난 뒤 정리(제거·도수 재표기)만 한다. 신호 시점(코드 시작 몇 박 전)은 `backing-track.js`의 `CUE_LEAD_STEPS`(2 = 1박).
- 재생 시작은 항상 원래 폼에서. 정지 시 자동 전환으로 가 있던 경우에만 원래 폼으로 복귀(사용자가 직접 전환한 상태는 유지).
- 재생 중에도 **수동 전환 버튼과 블록 이동 화살표(좌우)는 그대로 사용 가능**(현재 폼이 새 블록에도 유지됨). 반대로 **키 변경은 재생 중 잠금**(정지 후 변경).
- 챕터2 레벨(`secondary-*`)이라도 진행에 `'pair'` 표시가 없으면 자동 전환 없음.

## 7. 연습모드 화면 규칙 (`scale-level`)

- 기타 버튼 = 연습모드 토글. 설명(`scale-mic-desc`) 자리가 같은 칸에 겹쳐 `[코드 진행 4칸] / [BPM · 재생 · 스타일]`로 교체(`visibility` 전환, 칸 높이 고정).
- 재생 버튼: 채운 검정 아이콘, 재생 중 ⏸. 스케일 재생·튜토리얼·암기 시작·뒤로가기·앱 백그라운드(`visibilitychange`)·`pagehide` 시 반주 즉시 중단. 키 선택 버튼은 재생 중 눌러도 반응 없음.
- 코드 4칸: `.scale-chord-item` 컴포넌트, `space-between`으로 좌우 끝 정렬, 글자 20px/800(토큰 미사용). 재생 중 코드는 `--blue`. 라벨은 `--type-label-sm`, 색 `--brand`.

## 8. 확장 방법

- **새 드럼 비트**: `drum-sets.js`에 세트 추가 → 스타일 `drum` 에서 id 참조.
- **새 스타일**: `STYLES` + `PRACTICE_STYLE_OPTIONS`에 추가.
- **새 레벨 진행**: `PROGRESSIONS[레벨]`, 필요하면 `LEVEL_KEY_UI[레벨]`.
- **베이스 파트**(후속): 스타일에 `bass` 필드 추가, 같은 스케줄러 루프에서 예약.
- **다른 페이지 재사용**: 위 로드 순서로 스크립트를 넣고 `BackingTrack.start()` 호출.

## 9. 알려진 한계 / 미정

1. 레벨 7 이상 코드 진행 미정 (레벨 1 진행으로 대체됨).
2. 샘플이 외부 CDN(`tonejs.github.io`, `gleitz.github.io`) — 오프라인·앱 환경에서 로딩 실패 시 처리 없음.
3. 피아노 세기(0.7)와 드럼 볼륨의 밸런스, `_getSfxMasterVolume` 연동은 임시.
4. 정지 직후 룩어헤드(0.15s) 분량이 드물게 한 번 더 울릴 수 있음 — `resetPiano()` 후 확인 필요.
5. 연습모드 옵션(BPM·스타일) 선택은 페이지를 나가면 초기화됨(저장 안 함).
