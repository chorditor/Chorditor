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
| 1 | 로컬 브랜치 `ios_dev` 생성 후 `npm i @capacitor/ios` → `npx cap add ios` (로컬 전용, 커밋·푸시 없음) | `package.json`, `package-lock.json` 수정 + `ios/` 신규 | **보류** (사용자 승인 대기) |
| 1b | `.gitignore`에 iOS 비밀 파일 패턴 추가 (§5-4 조건 1) — 푸시 전에 선행 | `.gitignore` 수정 | 미착수 |
| 2 | `ios_dev` 브랜치를 공개 레포에 푸시 | 외부 전송 발생 → 별도 승인 | 미착수 |
| 3 | 수동 실행 전용 워크플로 작성(Secrets 미사용), 서명 없는 `.ipa` 빌드 | 공개 레포 `.github/workflows` | 미착수 |
| 4 | Sideloadly로 iPad 설치 | 내 PC | 미착수 |
| 5 | 주요 화면 크래시 확인 및 결과 정리 | - | 미착수 |
| 6 | 문제 없으면 Apple Developer Program 구매 → 서명·TestFlight 설계 | - | 미착수 |

## 8. 미결정 사항

- [x] 1단계 작업 위치: 로컬 브랜치 `ios_dev` (§3-1, 폐기 용이). 단 실제 브랜치 생성은 1단계 승인 시
- [x] 레포 공개 여부: **공개 레포 사용 결정**(한도 없음, §5-4 조건 준수, 2026-10-11)
- [ ] iPad의 정확한 iPadOS 버전 (설정 → 일반 → 정보)
- [ ] Sideloadly용 Apple ID를 본 계정으로 쓸지, 별도 계정을 만들지

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

## 9. 알려진 iOS 이식 주의 지점 (스모크 테스트에서 확인할 것)

- 플러그인: AdMob, Google 로그인, 푸시, 로컬 알림 — iOS용 네이티브 설정(`Info.plist`, plist 파일 등)이 별도로 필요
- 한글 IME, 터치 이벤트, 오디오 자동재생 정책 등 Safari(WebKit) 고유 동작
- Android 전용 처리(하드웨어 뒤로가기 `backButton`, `OnBackPressedCallback` 등)가 iOS에서 무시되는지
