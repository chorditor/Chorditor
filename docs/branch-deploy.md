# 브랜치 전략 & 배포

## 브랜치별 역할

| 브랜치 | 용도 | versionName 형식 |
|--------|------|-----------------|
| `dev` | 기능 개발 (USB 디버깅) | `X.Y.Z_devN` |
| `staging` | 내부 테스트 배포 | `X.Y.Z_preN` |
| `main` | 정식 출시 | `X.Y.Z` |

## versionCode 규칙
- 커밋마다 +1 증가 (브랜치 무관, 단조 증가)
- `android/app/build.gradle`에서 수동 관리

---

## dev 브랜치 규칙

### dev 브랜치 생성 원칙
- **dev는 항상 최신 main에서 분기**하여 생성
- 기존 dev가 있어도 새 작업 시작 전 `git checkout dev && git reset --hard main`으로 최신화

### USB 디버깅 (dev 전용) — 온보딩 건너뜀
Android USB 연결 환경에서는 Google 로그인이 불가하므로 `dev`에서만 온보딩을 건너뜀.

**위치:** `app.js` → `tryAutoSignIn()` 함수 최상단

```js
// ── DEV ONLY: 온보딩 건너뜀 (USB 디버깅 환경에서 Google 로그인 불가) ──
// main 병합 시 아래 3줄 제거
hideOnboarding(); _authReady = true; _authResolve(); return;
// ── /DEV ──
```

⚠️ **dev → staging/main 병합 시 반드시 위 블록 제거**

---

## staging 커밋 체크리스트

### 1. DEV ONLY 코드 제거 확인
```bash
grep -n "DEV ONLY" app.js   # 출력이 없어야 정상
```

### 2. 파일 동기화
```bash
Get-ChildItem -File | Where-Object { $_.Name -notlike '.*' -and $_.Extension -ne '.md' } | Copy-Item -Destination www -Force
npx.cmd cap copy android
```

### 3. Android Studio 브랜치 전환
```
Android Studio → Git 탭 → Branches → staging → Checkout
File → Sync Project with Gradle Files
```

### 4. 버전 확인
- `app.js`: `APP_VERSION` 값
- `build.gradle`: `versionCode` / `versionName`
- 두 곳이 일치해야 함

---

## 웹 버전 커밋 규칙 (GitHub Pages)

- **저장소:** `https://github.com/solka-dayco/chord_editor`
- **배포 URL:** `https://solka-dayco.github.io/chord_editor/`
- **배포 브랜치:** `web` (root)

**`git push origin main` 전 필수:**
1. `app.js` → `initAppVersion()` 웹 분기 하드코딩 값을 현재 모바일 versionName으로 업데이트

```js
// app.js initAppVersion() 웹 분기
el.textContent = 'v1.1.0'; // ← 모바일 versionName과 항상 일치시킬 것
```

2. **필수 파일:** `.nojekyll` (web 브랜치 루트에 반드시 존재해야 함)

### Supabase Redirect URL 등록
웹 Google 로그인이 동작하려면:
- **Supabase → Authentication → URL Configuration**
- Site URL & Redirect URLs: `https://solka-dayco.github.io/chord_editor/` 등록

---

## Android 빌드 설정

`android/variables.gradle`:
- `minSdkVersion = 24`
- `compileSdkVersion = 37`
- `targetSdkVersion = 37`
