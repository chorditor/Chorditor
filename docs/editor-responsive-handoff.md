# 코드 에디터 반응형 — 작업 인수인계 노트

> 세션 진행 중 컨텍스트 압축 대비용. `docs/responsive_design_strategy.md` §10과 함께 볼 것.

## 파일 동기화 규칙 (매 수정마다)
```bash
cd "H:\Project\Project\Chords_editor" && cp style.css www/style.css && cp home.js www/home.js
```
브라우저는 `www/`를 봄. 루트만 고치면 반영 안 됨.

## 핵심 구조 (실제 DOM)
```
#view-editor      position:absolute; inset:0; flex column; overflow-y:auto;
                  align-items:stretch; padding: 0 0 20px
├─ span.editor-page-title    margin-inline:20px; padding:0 0 0 6px;
│                            margin-top:auto; margin-bottom:12px
└─ div.editor-card           flex:1; margin:20px; margin-top:0; margin-bottom:auto
   └─ div.editor-inner       flex column; padding:16px; gap:2vh; justify-content:space-between
      ├─ .chord-preview           (코드명 + 추천, align-items:baseline)
      ├─ .chord-builder → .wheel-picker → .builder-col ×6
      ├─ .toolbar                 (핑거 번호)
      ├─ .canvas-wrap             flex:1; padding:2.5% 2.5% 6%
      │   └─ .canvas-unit         grid 3열: 23.864% / 54.545% / 21.591%
      │       ├─ .canvas-topbar   (샵플랫 토글 좌 · 초기화 우)
      │       ├─ .canvas-inner    grid 3×3, aspect-ratio:440/352
      │       │    canvas #c = 전체 덮는 배경 / #fret-ctrl(col2,row3)
      │       │    / #btn-reset-chord·#canvas-main-btns(col3)
      │       └─ #barre-wrap      (col2 = 프렛보드 컬럼 자동 정렬)
      └─ .add-to-project-row
```

## 절대 불변식 2개
1. **모든 요소는 한 화면에** (세로모드). 가로/저높이는 스크롤 허용.
2. **타이틀 가로 박스 = 카드 가로 박스 + `padding-left:6px`**
   - base: 둘 다 `margin-inline:20px`
   - 스코프: 둘 다 `width:N` + `margin-inline:auto`
   - 새 뷰포트 추가 시 **카드·타이틀에 같은 width만 주면** 정렬 자동으로 맞음

## 캔버스 좌표계 (절대 건드리지 말 것)
`home.js` `BASE_*` 상수(440×352, 5:4)는 `voicing-canvas.js`를 통해 팔레트·코드사전·
노트슬롯·저장이미지까지 공용. **바꾸면 앱 전체 다이어그램 모양이 바뀜.**
CSS grid의 % 값은 이 상수를 '복제'만 한 것:
- 컬럼 105/240/95 → 23.864% / 54.545% / 21.591%
- 행 80/192/80 → 22.727% / 54.545% / 22.727%

`resizeCanvas()`는 `.canvas-unit` 폭 하나만 측정해서 캔버스 크기 결정.
**ResizeObserver로 `.canvas-unit` 감시 중** — 미디어쿼리로 폭만 바뀌는 경우도 자동 재계산.
(예전엔 window resize / 뷰 진입 rAF만 있어서 stale 값이 남는 버그 있었음)

`--picker-item-h`(휠피커 아이템 높이)는 `home.js`가 `getComputedStyle`로 실시간 읽음.
JS 상수 하드코딩 없음 → CSS 변수만 스코프별로 바꾸면 스냅 계산까지 자동 일치.
resize 시 기존 스크롤 위치도 idx 유지한 채 새 pitch로 재정렬함.

## 뷰포트별 확정값 (파일 등장 순서 = override 순서)

| 스코프 | 조건 | `.editor-card` width | 비고 |
|---|---|---|---|
| base 모바일세로 | — | `margin:20px` (폭 캡 없음) | inner padding 16px |
| 모바일브라우저 | `≤559 × ≤750` | 상속 | `flex:none`+스크롤 |
| landscape 전체 | `orientation:landscape` | `min(400px, 100vw-64px)` | `flex:none`+스크롤 |
| Flip 세로 | `355~365 × 820~900` | 상속 | 캔버스+버튼 힌지 하단, inner `gap:6vh`·`padding-top:3vh`·`padding-bottom:16px`, `.toolbar{margin-top:calc(3vh - 6vh)}` |
| 태블릿세로 | `≥560 × ≥600, aspect≤1` | `60vw` | `--picker-item-h:36px`, 타이틀 28px, chord-display 36px, inner 40px, `.builder-col{padding:3vh 0}` |
| Fold세로 | `580~760 × ≥700, 3/4~1/1` | `min(340px,…)` | 태블릿세로 값 전부 모바일 기준으로 리셋 |
| 태블릿가로 Min | `1133~1156` | `26vw` | |
| 태블릿가로 Base | `1157~1278` | `28vw` | |
| 태블릿가로 Max | `1279~1599` | `32vw` | |
| 랩탑 | `1260~1300` | `25vw` | Tablet Max 범위와 겹쳐 뒤에 배치 |
| Fold가로힌지 | `≥700 × 580~760, 1/1~4/3` | `min(34vw, 85vh*400/671)` | chord-display 22px, inner 16px, `--picker-item-h:24px` |
| Fold8와이드 | `834~950 × 680~770` | `min(340px,…)` | |
| 데스크탑 | `≥1600`(2026-08-31, 기존 1440에서 상향) | `min(27vw, 47vh)` | 47vh = 주소창 고려 높이 캡, vw/vh 값 자체는 재계산 없이 유지 |
| 데스크탑 FHD | `≥1920` | 상속 | inner 40px |

## 높이 캡(`Nvh`) 계산법 — 추측 금지, 실측 후 산출
카드는 **폭으로만 크기가 정해지므로**(캔버스가 폭 기준), 세로가 짧은 뷰포트에선
`width: min(폭캡, Nvh)`로 높이 제약을 걸어야 한 화면에 들어감.

**실측값 (Fold8 933×704 기준)**
- 카드 종횡비 **H/W = 1.815**
- ⚠️ **`vh`는 `innerHeight` 기준인데 `#view-editor` 실제 높이는 그보다 작음**
  (704 → 590px, 탑바+하단탭이 114px). 이걸 무시하면 과대평가돼서 넘침.

**공식**
```
가용 = #view-editor.clientHeight − 타이틀높이(24) − 타이틀 margin-bottom(12)
       − #view-editor padding-bottom(20)
필요폭 = 가용 / 1.815
N     = 필요폭 / innerHeight × 100
```

**측정 명령**
```js
(() => {
  const c = document.querySelector('.editor-card').getBoundingClientRect();
  const t = document.querySelector('.editor-page-title').getBoundingClientRect();
  const v = document.getElementById('view-editor');
  console.log('card W×H:', c.width.toFixed(1), '×', c.height.toFixed(1), '| ratio H/W:', (c.height/c.width).toFixed(3));
  console.log('title H:', t.height.toFixed(1));
  console.log('view clientH:', v.clientHeight, '| scrollH:', v.scrollHeight, '| 넘침:', v.scrollHeight - v.clientHeight);
  console.log('innerH:', window.innerHeight);
})();
```

> 데스크탑(1600+, 기존 1440+에서 상향)의 `47vh`는 이 실측 이전에 1.68 추정으로 잡은 값 — 넘치면 같은 방법으로 재산출할 것.

## 캐스케이드 함정 (반복해서 걸린 것)
1. **파일 등장 순서** — 스코프 블록이 base 규칙보다 **앞**에 있으면 무효화됨.
   `.chord-preview`(1897줄), `.chord-display`(1931), `.chord-suggest-item`(1949) 관련
   스코프는 반드시 그 뒤(1980~)에 위치.
2. **명세 우선순위** — `@media(max-width:1400px)` 블록에 `.builder-col .sel-btn`(클래스 2개)가
   있어서 plain `.sel-btn` 오버라이드가 항상 짐. → **4184줄 부근**에 같은 명세로 다시 덮어야 함.
   현재 태블릿세로(24px/14px), Fold세로(16px/10px), Fold가로(14px/8px)가 거기 있음.
3. **`margin` shorthand** — `.editor-card{margin:20px}`가 margin-top도 잡아서 타이틀
   margin-bottom과 합산됨. `margin-top:0`으로 따로 끔.
4. **`justify-content:center`로 중앙정렬 금지** — 콘텐츠가 넘칠 때 위쪽이 스크롤로 접근 불가.
   `margin-block:auto`(타이틀 `margin-top:auto` + 카드 `margin-bottom:auto`) 사용.
5. **flex gap 위에 margin은 '더해짐'** — 특정 간격만 좁히려면 음수 margin으로 상쇄.
   예: `.toolbar{margin-top:calc(3vh - 6vh)}`

## 데스크탑 전용 처리
- `#back-btn`을 `home.js`가 `matchMedia(min-width:1600px)`로 `.top-bar` ↔ `#main-content` 간
  **DOM 이동**(튜토리얼/설정 버튼과 동일 패턴). CSS: `#main-content > #back-btn{position:absolute;top:20px;left:20px}`
- grid: `"topbar topbar" / "nav main"`

## 해결된 이슈 기록
- **사이드바 경험치바 안 보임** (해결)
  - 원인: `@media(min-width:1440px)` 안 `.profile-xp{width:calc(50% - 16px)}` — 프로필 탭
    XP바를 폴드 힌지 좌측에 맞추려던 값인데, 클래스를 공유하는 사이드바 XP바
    (`.sidebar-user-xp.profile-xp`)에도 새어들어감. 실측 91.5px(부모 콘텐츠폭 215px 기준),
    거기서 padding 32px 빠져 트랙 ~59px → 사라진 것처럼 보임.
  - 해결: `.sidebar-user-xp.profile-xp`(클래스 2개, 명세 더 높음)에 `width:100%` 추가.
    프로필 탭 값은 그대로 유지.
  - **교훈**: 프로필 탭 전용으로 준 값이 클래스 공유하는 사이드바 미러 요소로 샐 수 있음.
    `.profile-*` 계열 건드릴 때 사이드바(`.sidebar-user-*`)도 같이 확인할 것.

## 미해결 / 진행 중
- Flip 세로 힌지 정렬 2단계(정확히 Y=50%) 미착수 — 현재는 `margin-top:auto` 근사
- 실기기 최종 검증은 사용자 쪽
