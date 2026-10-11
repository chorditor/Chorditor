# iOS 빌드 / 테스트 계획

> 2026-10-10 논의 정리. 아직 **실행한 작업 없음**(코드·패키지·`ios/` 폴더 변경 0건). 논의 결과만 기록.

## 1. 목적과 범위

- 현재 코드(HTML/CSS/JS 웹앱 + Capacitor)를 **큰 리팩토링 없이** iOS에서 구동해 본다.
- 확인 대상은 "앱이 켜지는가 / 주요 기능에서 크래시가 나는가"뿐인 **스모크 테스트**.
- 큰 문제가 없으면 Apple Developer Program(유료, $99/년) 구매를 결정한다.
- 반응형 디자인은 별도로 확인 가능하므로 이번 범위가 아님.

## 2. 현재 상태 (확인된 사실)

| 항목 | 상태 |
|---|---|
| `ios/` 폴더 | **없음** (`android/`만 존재) |
| `@capacitor/ios` 패키지 | **미설치** (`@capacitor/android`만 있음) |
| 개발 환경 | Windows 10, 맥 없음, iOS 기기 없음(아래 테스트 기기 제외) |
| 테스트 기기 | iPad Pro 11" 5세대(M4, 2024) — 사용자 확인. iPadOS 17.5 이상 기본 탑재이므로 설치 가능성에 문제 없음 |
| 레포 | `chorditor/Chorditor`, **공개(public)** |
| 이미 공개 레포에 커밋된 설정 파일 | `android/app/google-services.json` |
| `.gitignore`로 보호 중 | `*.jks`, `*.keystore`, `.env`, `.env.*` |

**결론: 현재 코드만으로는 iOS 설치 파일을 바로 빌드할 수 없다.**

1. `ios/` 프로젝트가 아직 없다. (`npx cap add ios`로 Windows에서도 생성 가능)
2. iOS 빌드는 Xcode(macOS 전용)가 필요하다. Windows에서 `.ipa`를 직접 만들 수 없다.

## 3. 선택한 방식 (맥 없이 무료)

1. Windows에서 `@capacitor/ios` 설치 + `ios/` 프로젝트 생성
2. GitHub Actions의 macOS 러너가 **서명 없이** `.ipa` 빌드
3. `.ipa`를 Windows로 내려받아 **Sideloadly**로 내 Apple ID 서명 후 iPad에 USB 설치

다른 선택지(참고): Codemagic(월 500분 무료), 클라우드 맥 대여(유료), 유료 계정 + TestFlight(가장 쉬움).

## 3-1. 브랜치 / 동시 개발 방침

### 구조
```
프로젝트 루트
├─ www/        ← 공통 웹 코드 (하나)
├─ android/    ← 안드로이드 네이티브 껍데기
└─ ios/        ← iOS 네이티브 껍데기 (신규)
```
- 같은 브랜치 안에서 `android/`와 `ios/`는 서로 다른 폴더라 충돌하지 않는다.
- 웹 코드는 한 번 고치면 양쪽에 반영된다. 안드로이드·iOS 동시 개발 가능(Capacitor 표준 구조).

### 브랜치
- **iOS 전용 장기 브랜치는 만들지 않는다.** 웹 코드가 공통이라 브랜치를 나누면 머지·충돌이 반복되고 코드가 어긋난다.
- 기존 흐름(dev → pre → main)을 그대로 쓰고, `ios/`는 폴더 하나가 추가되는 것으로 취급한다.
- 플랫폼별 차이는 브랜치가 아니라 코드의 `Capacitor.getPlatform()` 분기로 처리한다.
- **스모크 테스트 단계만 예외**: 현재 브랜치에서 짧게 쓰는 로컬 브랜치(`ios_dev`)를 따서 1단계를 수행한다. 결과가 좋지 않으면 브랜치만 버린다.

### 동시 개발 시 달라지는 점
1. **동기화 단계 증가**: 기존 `루트 → www → android assets → cap sync` 규칙에 iOS 쪽(`ios/App/App/public`)이 추가된다. `npx cap sync`를 플랫폼 지정 없이 실행하면 둘 다 갱신된다.
2. **버전 번호 위치 증가**: 현재 `build.gradle` + `app.js(APP_VERSION)`에 더해, iOS는 Xcode 프로젝트의 `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`도 맞춰야 한다. 버전 규칙에 추가 필요.
3. `package.json`에 `@capacitor/ios`가 들어가도 안드로이드 빌드에는 영향 없음.

### `ios/` 위치 (2026-10-11 결정: 공개 레포 사용)
- 코드가 두 레포로 갈라지면 동기화가 깨지고 맥 빌드 월 한도(약 200분)에도 걸리므로, **현재 공개 레포(`chorditor/Chorditor`)에 `ios/` 폴더를 두고 거기서 빌드**한다.
- `ios/` 네이티브 폴더 자체(프로젝트 파일, 번들 ID 등)는 `android/`가 이미 공개된 것과 같은 성격이라 비밀이 아니다. 위험한 것은 그 안에 들어갈 설정·서명 파일이며, 이는 이번 단계에 존재하지 않는다.
- 이 결정은 **비밀이 하나도 없는 동안에만 유효**하다. 조건과 전환 시점은 §5-4 참고.

## 4. 무료 Apple ID 한계

- 앱이 **7일마다 만료** → 재설치 필요
- **푸시 알림 사용 불가** (FCM 푸시, 일부 로컬 알림 테스트 불가)
- 이 단계는 "죽는지 여부"만 보므로 감수. 푸시·AdMob·Google 로그인의 기능 검증은 유료 계정 이후.
- 예상 위험: Firebase / AdMob 초기화 단계에서 앱이 죽을 수 있음. 이는 "크래시 확인" 결과로 그대로 기록한다.

## 5. 보안 원칙 (보수적 접근 — 사용자 지시)

> 보안 관련해서는 항상 보수적으로 접근한다.

### 5-1. 파일 분류

| 구분 | 예시 | 처리 |
|---|---|---|
| 식별자(비밀 아님) | `GoogleService-Info.plist`, AdMob 앱 ID, `serverClientId` | 이번 단계에서는 **빌드에 넣지 않음**. 넣게 되더라도 비공개 레포 Secrets로만 |
| 진짜 비밀 | Apple 서명 인증서(`.p12`), 프로비저닝 프로파일, App Store Connect API 키(`AuthKey_*.p8`), Apple ID 비밀번호, 서비스 계정 JSON, Supabase `service_role` 키 | **어떤 레포에도 커밋 금지.** 유료 단계에서도 Secrets 또는 비공개 레포만 |
| 빌드 산출물 | `.ipa` | 공개 레포의 Actions 아티팩트는 GitHub 로그인한 누구나 받을 수 있음. 이번 단계의 `.ipa`에는 plist·서명 파일이 없고 이미 공개된 `www/`만 들어가므로 새 노출 없음. 보존 1일 |

### 5-2. 확정한 보수적 설정

| 항목 | 결정 |
|---|---|
| 빌드 장소 | **공개 레포(현재 레포)의 GitHub Actions** — 비밀이 없는 동안만(§5-4) |
| `ios/` 폴더 | 공개 레포에 커밋(비밀 파일 패턴은 `.gitignore`로 선차단, §5-4 조건 1) |
| `GoogleService-Info.plist` | 이번 단계 제외. 필요해지는 시점에 §5-4 전환 절차 적용 |
| 워크플로 트리거 | `workflow_dispatch`(수동 실행)만. `pull_request_target` 등 외부 트리거 금지 |
| 서명 비밀 | 없음. Apple ID는 내 PC의 Sideloadly에만 입력, GitHub에 전송하지 않음 |
| 아티팩트 보존 | 1일 |

### 5-4. 공개 레포 사용 조건 (2026-10-11 결정)

공개 레포에서 빌드하는 것은 "이 단계에 지킬 비밀이 없다"는 전제 위에서만 안전하다. 아래를 **모두** 지킨다.

1. **plist·인증서·API 키 파일을 일절 넣지 않는다.** 푸시 전에 `.gitignore`에 `GoogleService-Info.plist`, `*.p12`, `*.mobileprovision`, `AuthKey_*.p8`을 먼저 추가한다.
2. 워크플로 트리거는 `workflow_dispatch`(수동)만. `pull_request_target` 등 외부 트리거 금지.
3. 이 워크플로에서 **Secrets를 한 개도 쓰지 않는다.**
4. 아티팩트 보존 1일.
5. 빌드 로그에 환경변수를 출력하지 않는다.

**전환 시점**: plist나 서명 파일이 필요해지는 순간(= 유료 계정 단계)부터는 공개 레포의 아티팩트·로그에 섞일 수 있으므로, 비공개 레포로 옮기거나 Secrets + 비공개 아티팩트 구조로 다시 설계한다. 이 시점에 이 절을 갱신한다.

### 5-3. 별도 점검 필요 (이번 작업과 별개)

- 이미 공개된 `android/app/google-services.json`의 API 키에 Google Cloud 콘솔에서 **앱 패키지명 제한**이 걸려 있는지 확인.

## 6. 비용 / 한도

- **공개 레포의 GitHub Actions는 맥 러너 포함 무료·무제한**이라 분량 제한을 받지 않는다. (공개 레포 사용의 이유)
- 참고: 비공개 레포로 전환하면 macOS 분 단위가 10배로 차감되어 월 약 200분 수준이 된다. 유료 계정 단계에서 비공개 전환 시 이 한도를 다시 고려.

## 7. 진행 단계

| # | 단계 | 변경 범위 | 상태 |
|---|---|---|---|
| 1 | 로컬 브랜치 `ios_dev` 생성 후 `npm i @capacitor/ios` → `npx cap add ios` | `package.json`, `package-lock.json` 수정 + `ios/` 신규 | ✅ 완료 (`5dd4274`) |
| 1b | `.gitignore`에 iOS 비밀 파일 패턴 추가 (§5-4 조건 1) — 푸시 전에 선행 | `.gitignore` 수정 | ✅ 완료 (`5dd4274`) |
| 2 | `ios_dev` 브랜치를 공개 레포에 푸시 | 외부 전송 | ✅ 완료 |
| 3 | 수동 실행 전용 워크플로 작성(Secrets 미사용), 서명 없는 `.ipa` 빌드 | `.github/workflows/ios-build.yml` (`ios_dev` + `main`) | ✅ 완료 (빌드 성공, 약 4~5분) |
| 3b | iOS 구글 로그인 + 실행 크래시 방지 설정 | `shared.js`, `onboarding.js`, `Info.plist`, `capacitor.config.json` | ✅ 완료 (`7a66c9d`) |
| 4 | Sideloadly로 iPad 설치 | 내 PC | ✅ 완료 (앱 실행·구글 로그인 정상) |
| 5 | 주요 화면 크래시 확인 및 결과 정리 | - | 🔶 진행 중 — 전수조사 결과는 §11 |
| 6 | 문제 없으면 Apple Developer Program 구매 → 서명·TestFlight 설계 | - | 미착수 |

## 8. 미결정 사항

- [x] 1단계 작업 위치: 로컬 브랜치 `ios_dev` (§3-1, 폐기 용이). 단 실제 브랜치 생성은 1단계 승인 시
- [x] 레포 공개 여부: **공개 레포 사용 결정**(한도 없음, §5-4 조건 준수, 2026-10-11)
- [ ] iPad의 정확한 iPadOS 버전 (설정 → 일반 → 정보)
- [x] Sideloadly용 Apple ID: 스모크 테스트는 개인 계정으로 진행. 개발 전용 계정은 추후 생성 예정(유료 가입 시 그 계정 사용 검토)
- [x] §11 전수조사 항목 수정: 웹·설정으로 가능한 항목은 1차 수정 완료(§11-7). 나머지는 사유와 함께 §11-7에 기록
- [ ] `ios_dev`를 `main`에 합치기 전 안드로이드 영향 점검 (§10 발견 6)

## 10. 진행 로그 / 발견 사항

### 2026-10-11 — 1단계 완료 (로컬, 커밋·푸시 없음)
- 브랜치 `ios_dev` 생성(기존 규칙이 `버전_dev`라 `ios-smoke` 대신 변경).
- `@capacitor/ios@8.3.0` 설치. core·android·cli가 모두 8.3.0이라 버전을 맞춤(최신 8.5.3은 `core ^8.5.0` 요구 → 안드로이드까지 올려야 해서 보류).
- `npx cap add ios`로 `ios/` 생성. 비밀 파일(`GoogleService-Info.plist`, `.p12`, `.mobileprovision`) 없음 확인.
- 커밋 대상 후보 19개(프로젝트 파일·아이콘·스플래시·`Info.plist` 등). `App/App/public`(www 복사본), `capacitor.config.json`, `Pods`는 Capacitor `ios/.gitignore`가 이미 제외.

### 발견 1 — `npm i`가 기존부터 peer 충돌 (iOS와 무관)
- `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4`가 `@capacitor/core ^6`을 요구하는데 프로젝트는 core 8.
- lockfile에 이 불일치가 이미 들어 있어서, 지금까지 사실상 `--legacy-peer-deps`로 설치해 온 상태.
- 이번 설치도 `--legacy-peer-deps`로 진행. 변경은 `package.json` 1줄 + lock 10줄뿐 확인.

### 발견 2 — ⚠ iOS 빌드 첫 번째 블로커 후보
```
[warn] @codetrix-studio/capacitor-google-auth does not have a Package.swift
[warn] Some installed packages are not compatable with SPM
```
- Capacitor 8 iOS는 SPM(Swift Package Manager) 기본인데, **Google 로그인 플러그인이 SPM 미지원**.
- 이 플러그인은 Capacitor 6용이라 iOS에서 빌드 자체가 실패하거나 해당 플러그인만 동작하지 않을 가능성이 있음.
- 아직 실제 빌드 전이라 **확정 아님**. 클라우드 빌드(3단계) 결과로 판단.
- 대응 후보(빌드 실패 시 논의): ① CocoaPods 프로젝트로 생성, ② 플러그인 교체/제거 후 iOS 분기, ③ iOS에서만 Google 로그인 비활성. 이 단계 범위(리팩토링 없음)를 벗어나므로 결과 보고 결정.

### 2026-10-11 — 2~4단계 완료 (빌드·로그인·설치)

**결과: 현재 코드 + iOS 껍데기 + 로그인 분기만으로 iOS 빌드·설치·실행·구글 로그인까지 성공.**

### 발견 3 — CI 워크플로 관련
- Capacitor CLI 8.x는 **Node 22 이상** 필요(워크플로를 20 → 22로 수정, `f6eee54`).
- `workflow_dispatch`는 워크플로 파일이 기본 브랜치(`main`)에 있어야 실행 버튼이 나타남 → 같은 파일을 `main`에도 추가(`0f07cec`). 앱 코드 변경 없음.
- 실행 시 **"Use workflow from"을 `ios_dev`로 바꿔야 함**(기본값 `main`). `main`의 파일은 Node 20인 채로 "존재"만 하는 용도.
- 이 레포는 GitHub Pages가 켜져 있어 `main` 푸시마다 Pages 빌드가 돈다.
- 아티팩트는 실행 **요약(Summary) 페이지 맨 아래**에 있고, 다운로드는 GitHub 로그인이 필요.

### 발견 4 — 구글 로그인 (플러그인 교체로 해결)
- `capacitor-google-auth`는 SPM 미지원이라 iOS 빌드에서 제외됨 → iOS에서 로그인 버튼이 무반응(`onboarding.js`의 `if (!GoogleAuth) return;`).
- **해결**: `@capgo/capacitor-social-login@8.5.15`(버전 고정) 추가, iOS일 때만 사용. 안드로이드 경로는 그대로.
- 이 플러그인은 **Google·Apple 로그인을 한 플러그인에서 지원** → Apple 로그인도 같은 플러그인으로 붙일 예정(유료 계정 후, 별도 커밋).
- `capacitor.config.json`의 `SocialLogin.providers`에서 `facebook: false`로 Facebook SDK를 제외(플러그인 훅이 실제로 의존성을 주석 처리함).
- **nonce**: iOS 구글 SDK가 ID 토큰에 nonce를 넣으므로, 해시는 구글에·원본은 Supabase에 보내야 검증 통과. Supabase의 "Skip nonce checks"는 운영 보안을 낮추므로 쓰지 않음.
- `iOSServerClientId`를 기존 웹 클라이언트 ID로 두어 Supabase 설정 변경 없이 동작.

**Google Cloud 설정 (실제 경로)**
- 구글 로그인용 OAuth 클라이언트는 **Firebase 프로젝트(`chorditor-50f9f`, 번호 `165777454179`)가 아닌 별도 Google Cloud 프로젝트(번호 `495859421223`)** 에 있고, 소유 계정도 다르다(예전 다른 서비스 때 쓰던 계정). 통합은 비용 문제로 보류.
- 프로젝트 선택창은 번호가 아닌 이름으로 보여 찾기 어렵다 → 주소로 직접 진입: `https://console.cloud.google.com/apis/credentials?project=495859421223`
- iOS 클라이언트 생성 폼의 체크박스 2개(**Firebase 앱 체크로 보호**, **Use this client for an AI-powered agent**)는 둘 다 해제. 앱 체크는 SDK 연동 없이 켜면 로그인이 막힐 수 있음.
- iOS 클라이언트는 보안 비밀이 없고 ID는 콘솔에서 언제든 다시 볼 수 있음. 번들 ID는 `com.chorditor.app.dev`.

### 발견 5 — 실행 직후 크래시 요인 3개 (사전 차단)
| 요인 | 조치 (`Info.plist`) |
|---|---|
| AdMob이 모든 페이지에서 초기화되는데(`shared.js`) `GADApplicationIdentifier`가 없으면 앱 강제 종료 | Google 공개 테스트 앱 ID 추가. **출시 전 iOS용 실제 AdMob 앱 ID로 교체 필요** |
| 튜너의 마이크 접근에 사용 문구 없음 | `NSMicrophoneUsageDescription` 추가 |
| 구글 로그인 콜백용 URL scheme 없음 | `CFBundleURLTypes`에 역방향 클라이언트 ID 추가 |

- iOS에서는 `initBilling`을 건너뜀(안드로이드 RevenueCat 키로 configure 방지). **결제는 유료 계정 후 별도 작업.**

### 발견 6 — 새 플러그인의 안드로이드 영향 (⚠ `main` 병합 전 점검 필수)
- `@capgo/capacitor-social-login`은 npm 패키지라 `cap sync android` 시 안드로이드 빌드에도 포함된다.
- 플러그인 훅(`capacitor:sync:before`)이 `cap sync`마다 실행되어 `node_modules` 안 파일과 안드로이드 `gradle.properties`를 수정하는 코드가 있다.
- 지금은 `ios_dev`에만 있어 출시 앱(`main`)과 무관. **병합 전 안드로이드 빌드의 매니페스트(특히 AD_ID 권한)와 앱 크기를 확인할 것.**

### 발견 7 — 설치 도구
- iTunes는 음악 앱이지만 Windows용 설치 파일에 iPad USB 드라이버(`Apple Mobile Device Support`)가 들어 있어 필요하다.
- **Microsoft Store 버전 iTunes는 안 됨**(드라이버 서비스가 등록되지 않음). Apple 공식 사이트의 설치형으로 교체해야 `AppleMobileDeviceService`가 실행된다.
- Sideloadly의 Advanced Options에서 **Bundle ID를 `com.chorditor.app.dev`로 지정**(구글 iOS 클라이언트와 일치, 출시용 `com.chorditor.app`과 충돌 방지).
- 무료 서명은 **7일 후 만료** → 같은 `.ipa`로 재설치.
- 이 빌드는 **운영 DB에 그대로 연결**된다. 테스트 행동이 실제 계정 데이터에 반영됨.

## 9. 알려진 iOS 이식 주의 지점 (스모크 테스트에서 확인할 것)

- 플러그인: AdMob, Google 로그인, 푸시, 로컬 알림 — iOS용 네이티브 설정(`Info.plist`, plist 파일 등)이 별도로 필요
- 한글 IME, 터치 이벤트, 오디오 자동재생 정책 등 Safari(WebKit) 고유 동작
- Android 전용 처리(하드웨어 뒤로가기 `backButton`, `OnBackPressedCallback` 등)가 iOS에서 무시되는지

## 11. iOS 호환성 전수조사 (2026-10-11 조사 / 수정 이력은 §11-7)

**범위**: 루트 JS 45개(약 4.7만 줄), HTML 28개, `style.css`(약 2.1만 줄), 안드로이드 네이티브 코드(`MainActivity` 등), Capacitor iOS 소스.
**방법**: 정적 분석(코드 읽기·패턴 검색). 렌더링 문제는 실기기 확인 전까지 "의심" 단계.
**줄 번호는 `ios_dev` `7a66c9d` 기준**이라 이후 수정으로 달라질 수 있다.

### 11-1. 실기기에서 관찰된 증상 (iPad Pro 11" M4)
| 증상 | 재현 조건 |
|---|---|
| 코드 에디터의 이미지 저장·재생 버튼이 안 보임 | 앱을 새로 켠 직후에도 발생 |
| 이미지 저장이 안 됨(체크 애니메이션 없음) | 코드 사전 |
| 페이지 전환 시 깜빡임 | 항상 |
| 스케일 훈련 레벨 카드를 넘길 때 심한 떨림 | 항상 |
| 백그라운드에서 돌아오면 UI가 무너지고 이후 소리가 안 남 | 백그라운드 → 복귀. 앱 재시작 시 복구 |

### 11-2. 🔴 확정 — iOS에 기능 자체가 없음
| # | 내용 | 위치 |
|---|---|---|
| 1 | **글자 크기 90% 축소가 iOS에 없음.** 안드로이드는 `setTextZoom(90)`으로 전체 글자를 줄인다. iOS는 100%라 모든 화면 글자가 약 11% 큼 → 넘침·줄바꿈·레이아웃 차이의 가장 큰 원인 후보 | `MainActivity.java:24` |
| 2 | 이미지 저장 플러그인(`SaveImage`)이 안드로이드 전용. `undefined` 호출 → 오류가 `catch`에서 삼켜져 무반응 | `home.js:1593, 6039`, `user_project.js` |
| 3 | 하드웨어 뒤로가기 없음. `handleNativeBack`·`backButton` 리스너가 호출되지 않음. 화면 안에 뒤로가기 버튼이 없는 화면은 빠져나올 수 없음. `exitApp`도 무동작 | `mission-session.js:4093`, `progression-detail.js:808`, `strum-play.js:721`, `home.js:2750` |
| 4 | 공유 링크 딥링크(`chorditor://import`)가 네이티브 인텐트 처리. iOS는 URL scheme 미등록(`appUrlOpen` 리스너는 `shared.js:1731`에 있음) | `MainActivity.java:71` |
| 5 | 푸시(FCM), RevenueCat 키, 광고 단위 ID 3개, Play 스토어 링크 3곳이 안드로이드용 | `shared.js:595-597, 2121, 2172, 5204, 2218` |
| 6 | 분석 이벤트가 플랫폼을 `android`로 고정 기록(5곳) → iOS 데이터가 안드로이드로 섞임 | `home.js:5491`, `onboarding.js:570, 719, 739`, `user_project.js:4934` |
| 7 | 마이크 사용 후 오디오 모드 복구(`AudioMode`)가 안드로이드 전용. 진동(`navigator.vibrate`) 2곳 미지원 | `tuner.js:357`, `onboarding.js:369`, `shared.js:1196` |
| 8 | `Info.plist`에 사진 저장 문구(`NSPhotoLibraryAddUsageDescription`) 없음. iPad는 추가 설정 없이는 방향 고정이 무시됨 | `metronome.js:612, 626` |

### 11-3. 🟠 높은 확신 — 동작 차이로 생기는 버그
| # | 증상 | 원인 |
|---|---|---|
| 9 | 스케일 카드 떨림 | 스크롤 이벤트마다 JS가 모든 카드에 `scale()`을 다시 넣는데(`scale-training.js:258, 342`), 카드에 `transition: transform 0.1s`가 걸려 있고(`style.css:14516`) 스냅이 강제(`scroll-snap-type: x mandatory`)다. iOS는 관성 스크롤 중 이벤트가 늦게 와서 세 가지가 충돌 |
| 10 | 페이지 전환 깜빡임 | 화면마다 실제 페이지 이동(`location.href`, 260ms 지연). 그 사이 웹뷰 배경이 시스템 기본색(다크 모드면 검정)으로 비침. `capacitor.config.json`에 `backgroundColor` 설정 없음. 매 페이지가 CDN 스크립트(lucide `@latest`, Tone.js)를 다시 로드 |
| 11 | 백그라운드 후 무음 | 복귀 시 오디오를 깨우는 코드가 없음. 오디오 컨텍스트 직접 생성 5곳(`chord-combo.js:20`, `chord-name-quiz.js:1469`, `metronome.js:395`, `mission-session.js:730`, `scale-level.js:776`)과 `GuitarAudio.strumNotes` 모두 해당. `pagehide`에서 건 음소거(`home.js:1750`, `user_project.js:1469`)를 푸는 곳이 `strum-play.js:516`뿐 |
| 12 | 화면이 확대됨 | 뷰포트 메타에 확대 금지가 없어 핀치·더블탭 확대 가능. 입력칸 글자가 16px 미만이면 포커스 시 자동 확대(`.line-text` 14px, 검색창 12~14px: `style.css:4386, 4854, 8779`) |
| 13 | 길게 누르면 텍스트 선택·돋보기 | `user-select`에 `-webkit-` 접두어가 없는 규칙 23개, `-webkit-touch-callout` 0건 |
| 14 | 탭 후 눌린 색이 남음 | `:hover` 규칙 57개(터치 기기에서 hover 고착) |

### 11-4. 🟡 의심 — 실기기 확인 필요
| # | 내용 |
|---|---|
| 15 | **에디터 저장·재생 버튼 안 보임.** `.canvas-inner`가 `aspect-ratio`로 높이를 정하고 그 높이의 %로 격자 행을 나눔(`style.css:2931-2941`). 버튼은 `display: contents` 래퍼(`2866`) 아래에서 폭 %·`aspect-ratio: 1`(`2871-2877`)로 크기를 정함. WebKit이 이 %를 다르게 풀면 버튼 칸이 무너질 수 있음. 미디어쿼리·JS로 숨기는 코드는 없음을 확인. 같은 계열(`aspect-ratio` 97곳, `display: contents` 17곳)이 많아 다른 화면에도 숨은 문제 가능 |
| 16 | **백그라운드 복귀 시 UI 붕괴.** 원인 미확정. iOS가 웹 프로세스를 종료하면 Capacitor가 페이지를 자동으로 다시 불러오는데, 복원 처리(`pageshow`)가 한 곳도 없음. `visibilitychange`에서 연습 모드를 종료하는 코드(`scale-level.js:768`) 등도 영향 가능 |
| 17 | 컨테이너 단위(`cqh/cqw` 15곳, `container-type` 6곳), `round()` 5곳, `dvh` 17곳 — 지원은 되지만 스크롤 컨테이너와의 조합에서 차이 가능 |
| 18 | 가사 편집(`contenteditable`, 한글 조합 6곳, `execCommand` 5곳, `getSelection` 8곳) — WebKit은 동작이 달라 엔터·백스페이스·붙여넣기 버그가 다르게 재발할 수 있음 |
| 19 | 키보드가 뜰 때 하단 고정 요소(`position: fixed` 56곳, 키보드 플러그인 없음), 새 창 열기(`window.open` 7곳), 클립보드 17곳, 터치 기본 동작 차단(`preventDefault` 48곳, `passive: false` 9곳) |
| 20 | 효과음(HTML 오디오, `shared.js:822`)과 웹 오디오 혼용 — iOS 오디오 세션에서 지연·무음 가능 |

### 11-5. ✅ 확인했고 문제없음
- 자동 재생은 Capacitor iOS가 허용(`mediaTypesRequiringUserActionForPlayback = []`). 화면 전체 튕김(바운스)도 꺼져 있음.
- `MediaRecorder`, `ogg/webm/wav` 음원, `requestIdleCallback`, `scrollend`, `OffscreenCanvas` 등 iOS 미지원·차이 API는 0건.
- 뷰포트 `viewport-fit=cover`는 27개 중 25개 페이지에 적용, 안전영역 `env()` 33곳 사용.

### 11-6. 수정 시 우선순위 제안 (미결정)
1. **#1 글자 90%**, **#12 확대** — 한두 줄 설정으로 전 화면에 영향을 주므로 먼저 처리하면 나머지 증상을 다시 평가하기 쉬움.
2. **#10 배경색**, **#9 카드 떨림**, **#11 복귀 시 오디오** — 원인이 비교적 분명함.
3. **#15, #16** — 실제 화면(스크린샷 또는 WebKit 엔진 재현)으로 원인을 먼저 확정.
4. **#2~#8** — 기능 단위 iOS 구현(이미지 저장, 뒤로가기, 딥링크, 결제, 광고, 푸시). 유료 계정 단계와 묶어서 계획.

### 11-7. 수정 이력 (2026-10-11)

**실기기 결과(2차 빌드 `3d07fe1`)**: #1·#2·#9·#10·#12 정상, 코드 사전 재생 정상. #15 그대로, #16 그대로(→ 3차 수정).

모든 수정은 **iOS 앱에서만 켜지도록** 분기했다(웹·안드로이드 동작 변화 없음). 분기 기준은 `shared.js` 맨 위 `_iosNativeInit()`이 붙이는 `html.ios-native` 클래스.

| # | 상태 | 수정 내용 | 검증 |
|---|---|---|---|
| 1 | ✅ 수정 | `html.ios-native { -webkit-text-size-adjust: 90% }` (`style.css` 맨 끝) | 실기기에서 글자 크기가 안드로이드와 비슷한지 |
| 2 | 🔶 대체 | `SaveImage`가 없는 iOS는 **공유 시트**(`navigator.share`, "이미지 저장" 선택)로 대체. `saveImagesToDevice()`(`shared.js`) 신설, `home.js`·`user_project.js` 4곳 교체. 노트 팔레트 다중 저장은 iOS에서 공유 시트 1회로 묶음 | ⚠ 저장 버튼 → 플랜 조회(`await`) → 공유 순서라 사용자 제스처가 만료돼 `NotAllowedError`가 날 수 있음. 실패 시 네이티브 플러그인(Swift, `UIImageWriteToSavedPhotosAlbum`)으로 교체 |
| 3 | ⏸ 보류 | iOS엔 하드웨어 뒤로가기가 없음. 화면 안 뒤로가기 버튼이 없는 화면을 하나씩 정해야 하는 **디자인 결정** | 어떤 화면이 갇히는지 실기기 확인 후 |
| 4 | ⏸ 보류 | 딥링크는 URL scheme(`chorditor://`)·Universal Link 등록 필요. 공유 링크 정책 결정 + 유료 계정 단계 | - |
| 5 | ⏸ 보류 | 푸시·RevenueCat·AdMob 광고 단위·스토어 링크. 모두 Apple 계정·키가 필요 → 유료 계정 단계 | - |
| 6 | ✅ 수정 | `platform: 'android'` 하드코딩 4곳(`home.js`, `user_project.js`, `onboarding.js` 2곳) → `Capacitor.getPlatform()`. 서버 분석은 이미 `analytics-sdk.js`가 실제 플랫폼 사용 | iOS 이벤트가 `ios`로 들어오는지 |
| 7 | ✅ 확인 | `AudioMode`는 `.catch`로 감싸져 무해, `navigator.vibrate`는 존재 검사 있음 → 수정 불필요 | - |
| 8 | 🔶 일부 | `Info.plist`에 `NSPhotoLibraryAddUsageDescription` 추가. iPad 방향 고정(`UIRequiresFullScreen`)은 멀티태스킹이 꺼지는 제품 결정이라 보류 | - |
| 9 | ✅ 수정 | iOS에서 `.scale-item-card`의 `transform` 트랜지션 제거 | 카드 넘길 때 떨림 사라졌는지 |
| 10 | ✅ 수정 | `capacitor.config.json`에 `ios.backgroundColor: "#FAFAF9"`(앱 배경 `--bg`). 페이지 전환 자체는 그대로(실제 페이지 이동) | 전환 시 검은 깜빡임이 사라졌는지. 남으면 전환 구조 문제 |
| 11 | ✅ 수정 | ① `guitar-audio.js`: 복귀(`visibilitychange` visible·`pageshow`) 시 `Tone` 음소거 해제 + 컨텍스트 깨움, `strumNotes`도 깨움. ② 별도 AudioContext 5곳: `suspended`만 검사 → `!== 'running'`(iOS는 `interrupted`가 됨) | 백그라운드 → 복귀 후 소리가 나는지. **원인 가설**: iOS는 앱 백그라운드 시 `pagehide`가 와서 건 음소거가 영구 유지됨(안드로이드는 페이지 이동 때만 옴) |
| 12 | ✅ 수정 | iOS에서만 viewport에 `maximum-scale=1.0, user-scalable=no` 덧붙임(`_iosNativeInit`) | 입력창 포커스 시 확대되지 않는지 |
| 13 | 🔶 일부 | iOS에서 `-webkit-touch-callout: none`, 버튼 `-webkit-user-select: none`, 입력 영역은 선택 유지. 기존 `user-select` 23곳은 개별 수정하지 않음 | 길게 눌렀을 때 돋보기·메뉴 |
| 14 | ⏸ 보류 | `:hover` 57곳을 `@media (hover: hover)`로 감싸는 작업(대형 CSS 전반). 심각도 낮음 → 불편이 확인되면 처리 | - |
| 15 | ❌ 가설 기각 → 측정 중 | `aspect-ratio` 가설로 넣은 `12cqw` 고정 크기는 **효과 없음**(2차 빌드에서 여전히 안 보임) → 규칙 삭제. `home.js` 맨 끝에 **임시 측정 코드**(iOS 전용 "측정" 칩) 추가: 버튼·조상 요소의 실제 크기·표시 상태를 화면에 출력 | 측정값으로 원인 확정 후 임시 코드 삭제 |
| 16 | ✅ 수정(코드 사전은 원인 확정) | **원인**: iPad는 백그라운드 진입 시 스냅샷용으로 앱 크기를 세로·가로로 바꾼다. `matchMedia` `change`에 반응해 DOM을 옮기는 코드(`home.js` 코드 사전 와이드 배치 2곳)가 좁은 배치로 옮긴 뒤 되돌리는 신호를 놓쳐 **CSS는 와이드, DOM은 좁은 배치**로 어긋남(회전하면 복구되는 이유). **수정**: `shared.js`에 `onViewportResync(fn)` 추가 — iOS 복귀 시 등록 함수 재실행 + `resize` 발생. `home.js` 배치 함수 2개, `user_project.js` 방향·폭 재렌더(값이 달라졌을 때만) 등록 | 복귀 후 코드 사전·노트 화면이 정상인지. 노트 재생 시 깨짐은 같은 원인으로 추정(미확정) |
| 17~20 | ⏸ 보류 | 의심 단계 항목(컨테이너 단위·편집기·키보드·효과음). 증상이 확인되면 처리 | - |

**남은 작업**
- 실기기 확인을 위해 `www/`·`ios/App/App/public` 동기화(`cap sync`)와 재빌드가 필요(이번 수정은 루트 파일만 변경).
- `ios_dev` → `main` 병합 시 위 수정이 안드로이드에 영향이 없는지는 `html.ios-native` 분기·`_isIOSNative()` 분기 구조로 확인 가능하나, 안드로이드 이미지 저장 경로(`saveImagesToDevice`)는 한 번 실기기 확인 권장.
