# Chorditor — Project Rules

---

## CRITICAL — staging/main 커밋 필수 확인

### 1. DEV ONLY 코드 제거 확인
```bash
grep -n "DEV ONLY" app.js   # 출력이 없어야 정상
```
출력이 한 줄이라도 나오면 **커밋 중단** 후 해당 블록 전체를 제거하십시오.

```js
// ── 이 블록 전체 제거 ──
// ── DEV ONLY: 온보딩 건너뛰기 (USB 디버깅 환경에서 Google 로그인 불가) ──
hideOnboarding(); _authReady = true; _authResolve(); return;
// ── /DEV ──
```

### 2. 파일 동기화
```bash
Get-ChildItem -File | Where-Object { $_.Name -notlike '.*' -and $_.Extension -ne '.md' } | Copy-Item -Destination www -Force
npx.cmd cap copy android
```

### 3. 버전 번호 일치 확인
- `app.js` 의 `APP_VERSION`
- `android/app/build.gradle` 의 `versionCode` / `versionName`

---

## 디자인 현황

### 프로젝트 뷰 헤더
- **Row1** (4칸/8칸, 공유하기, 완료, 삭제): 높이 28px 고정 (`box-sizing: border-box`)
- **Row2** (카포, BPM, 메트로놈, 재생): 높이 28px 통일
- Row1 과 Row2 간격: `gap: 8px`

### 프로젝트 줄(line) 구조
- 구분선: `rgba(180,168,152,0.35)` 사용, `padding-bottom: 5px` / `margin-bottom: 19px`
- `+` 버튼: 33px 원형, `margin-top: 20px`
- 새 줄 생성 애니메이션: `cubic-bezier(0.22,1,0.36,1)` 0.28s 슬라이드

### 아이콘
- 아이콘 라이브러리: **Lucide** (`lucide@latest` CDN)
- 메트로놈 아이콘: `metronome` (v0.575.0 이상)
- 메트로놈·재생 버튼 SVG 크기: 13px (버튼 원형 28px)

---

## 안전상 수정 금지

- `chord-voicings.js` 는 보이싱 데이터 원본입니다. Claude 수정 금지.
- `parseChordNameToComponents()` 는 코드 파싱 함수입니다. 수정 시 텐션 파싱이 깨질 수 있습니다.
- `applyChordSuggestion()` 은 추천 코드명 적용 함수입니다. 수정 금지.

---

## 동기화 규칙

루트 폴더의 앱 파일 수정 후 **항상** 동기화하십시오.
특정 파일 목록을 고정하지 말고, 매번 루트 폴더의 일반 파일 전체를 확인해 `/www`로 복사하십시오.
단, dotfile(`.*`)과 Markdown 문서(`*.md`)는 동기화 대상에서 제외해도 됩니다.

```bash
Get-ChildItem -File | Where-Object { $_.Name -notlike '.*' -and $_.Extension -ne '.md' } | Copy-Item -Destination www -Force
npx.cmd cap copy android
```

4곳 버전 검증:
```bash
grep "APP_VERSION" app.js | head -1
grep "APP_VERSION" www/app.js | head -1
grep "APP_VERSION" android/app/src/main/assets/public/app.js | head -1
grep "versionCode\|versionName" android/app/build.gradle
```

---

## Supabase DB 쿼리 규칙 (Android)

`_supabase` 클라이언트는 Android에서 세션 자동 인식 문제로 `auth.uid() = null` 이 되어 RLS에 차단될 수 있습니다.
**반드시 raw fetch + Bearer 토큰 방식 사용** (fetchPlanWithToken, updateSupabasePlan 패턴 참고)

---

## 상세 문서

@docs/architecture.md
@docs/branch-deploy.md
@docs/billing.md
@docs/library.md
@docs/ui-rules.md
