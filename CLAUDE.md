# Chorditor — CLAUDE.md

---

## ⛔🚨 CRITICAL — staging/main 커밋 전 필수 (컴팩션 후에도 반드시 적용)

### 1. DEV ONLY 코드 제거 확인
```bash
grep -n "DEV ONLY" app.js   # 출력이 없어야 정상
```
출력이 한 줄이라도 나오면 → **커밋 중단** → 해당 블록 전체 삭제 후 재진행.

```js
// ── 이 블록 전체 제거 ──
// ── DEV ONLY: 온보딩 건너뜀 (USB 디버깅 환경에서 Google 로그인 불가) ──
hideOnboarding(); _authReady = true; _authResolve(); return;
// ── /DEV ──
```

### 2. 파일 동기화
```bash
cp app.js www/app.js && cp index.html www/index.html && cp style.css www/style.css
npx cap copy android
```

### 3. 버전 두 곳 일치 확인
- `app.js` → `APP_VERSION`
- `android/app/build.gradle` → `versionCode` / `versionName`

---

## ⛔ 절대 수정 금지

- `chord-voicings.js` — 보이싱 데이터 원본. Claude 수정 금지.
- `parseChordNameToComponents()` — 코드 파싱 함수. 수정 시 텐션 파싱 깨짐.
- `applyChordSuggestion()` — 추천 코드명 적용 함수. 수정 금지.

---

## 동기화 규칙

app.js / index.html / style.css 수정 후 **항상** 동기화:

```bash
cp app.js www/app.js && cp index.html www/index.html && cp style.css www/style.css
npx cap copy android
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

`_supabase` 클라이언트는 Android에서 세션 자동 인식 안 함 → `auth.uid() = null` → RLS 차단.
**반드시 raw fetch + Bearer 토큰 방식 사용** (fetchPlanWithToken, updateSupabasePlan 패턴 참고)

---

## 상세 문서 (topic별)

@docs/architecture.md
@docs/branch-deploy.md
@docs/billing.md
@docs/library.md
@docs/ui-rules.md
