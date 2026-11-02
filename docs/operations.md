# 운영 관리 (Operations)

이 세션(코디터 운영 세션)의 작업 총괄 파일. 두 파트로 구성.

---

## 1. 앱 운영 관리 (플레이스토어 전용)

Play Console 상 앱 등록정보, 카테고리, 정책 대응 등 관리.

### Play Console 최신 메뉴 경로 (확인된 것만 기록, 계속 갱신)

Play Console UI가 자주 개편되어 예전 지식/웹서치 결과와 실제 경로가 다를 수 있음.
**사용자가 실제 화면으로 확인해준 경로만 여기 기록** — 확인 안 된 추정 경로는 적지 말 것.

| 목적 | 경로 | 확인일 |
|---|---|---|
| 스토어 등록정보 연락처(전화번호/이메일/웹사이트, 사용자 공개용) | 사용자 늘리기 → 앱 정보 → 스토어 설정 | 2026-08-10 |

새 경로 확인되면 이 표에 행 추가. (틀린 경로 발견 시 바로 수정)

### 진행 이력

- **2026-08-10**: MDIA(한국가상융합디지털산업협회) 앱마켓 결제 가이드라인 점검 대응 (기한 2026-09-10)
  - 개발자 전화번호 미고지 → Play Console 스토어 설정(사용자늘리기→앱정보→스토어설정)에 전화번호 등록 완료
  - 이용약관/결제·환불/청약철회 미고지 → 앱 내 Terms.html에 이미 있었음(구버전 채증자료로 인한 오판 추정). 설정 메뉴에 "약관보기" 항목 추가해 노출 강화 (커밋 56de5b9, main 푸시 완료)
  - 네이티브 앱(AAB) 버전은 1.3.3.2 유지, 웹(www) 변경만 우선 반영. 정식 조치결과 등록은 9/10 전 별도 진행 필요

### 할 일

- [ ] MDIA 조치결과 등록 (기한 2026-09-10) — 스크린샷 증빙 첨부
- [ ] 카테고리 목록 최신화 (미착수)

---

## 2. 유저 고객 CS (피드백/리뷰 관리)

Play 스토어 리뷰 답변, 유저 피드백 대응.

### 진행 이력

- **2026-08-10**: 태블릿 가로보기 전체화면 호환 문의 리뷰에 답변 완료 (태블릿 개선 작업 중이라는 취지로 회신)

### 할 일

- (특이사항 있을 시 기록)

---

## 3. 백엔드 운영 (DB → BigQuery 연동)

Supabase(DB) → Google BigQuery 데이터 동기화 인프라. **키/시크릿 값은 이 문서에 절대 기록하지 않음** — 파일 위치와 상태만 기록.

### 구성 요소 (2026-08-28 기준)

| 항목 | 파일/위치 | 상태 |
|---|---|---|
| Supabase 접속 정보 (URL, SERVICE_ROLE_KEY) | `.env` (repo 루트) | ✅ 사용자가 채워넣음 |
| GCP 서비스 계정 키 | `gcp-service-account.json` (repo 루트) | ✅ 생성완료, IAM 권한 부여 완료 |
| BigQuery 데이터셋 | `chorditor_analytics` | ✅ 생성완료 |

두 파일 모두 `.gitignore`에 등록됨(`.env`, `.env.*`, `gcp-service-account*.json`) — git 추적 안 됨, 커밋 유출 위험 없음.

### 할 일

- [ ] DB → BigQuery 실제 동기화 파이프라인(스크립트/스케줄) 구현 — 미착수
- [ ] 동기화 대상 테이블/스키마 확정

---

## 4. iOS 앱스토어 출시 준비 (Apple 계정·키)

앱스토어 테스트 출시(TestFlight → 정식) 준비. **키 파일/시크릿 값은 기록하지 않음** — 식별자(비밀 아님)와 보관 위치·상태만 기록. 빌드·서명 계획은 `docs/ios-build.md` 참고.

### 식별자 (비밀 아님)

| 항목 | 값 | 비고 |
|---|---|---|
| Team ID | `D2AN2P8CL2` | Apple Developer 계정 우측 상단에도 표시 |
| 번들 ID | `com.chorditor.app` | App ID 등록 완료(2026-11-02). Capabilities: Push Notifications, Sign in with Apple, In-App Purchase |
| App Store Connect 앱 레코드 | `코디터 - 내 손안에 기타 연습소` (iOS 1.0, 기본 언어 한국어) | 생성 완료(2026-11-02), 상태 "제출 준비 중" |
| 참고 | `com.chorditor.app.D2AN2P8CL2` | Sideloadly가 자동 생성한 임시 ID. 사용 안 함, 지우지 않음 |

### 키 (값은 별도 보관)

| 항목 | 식별자 | 보관 위치 | 상태 |
|---|---|---|---|
| APNs 인증 키 `Chorditor APNs` | Key ID `T3HKZY534K` (파일명 `AuthKey_T3HKZY534K.p8`) | 사용자가 레포 밖에 별도 보관. 레포에 커밋 금지(`.gitignore`의 `AuthKey_*.p8`) | ✅ 발급 완료(2026-11-02). Environment=Sandbox & Production, Key Restriction=Team Scoped (All Topics) — 저장 후 변경 불가 |
| App Store Connect API 키 `Chorditor CI` | Key ID `CNANZ2A8Z2` (파일명 `AuthKey_CNANZ2A8Z2.p8`) | `.p8`은 사용자가 레포 밖에 별도 보관. 레포에 커밋 금지. CI 사용 시 GitHub Secrets에만 등록 | ✅ 발급 완료(2026-11-02). 용도: CI 서명·TestFlight 업로드 |
| Firebase iOS 앱 + `GoogleService-Info.plist` | - | 레포 밖(`.gitignore` 등록됨) | 미착수 |

### 계약·세금·규정 준수 (2026-11-02 기준)

| 항목 | 상태 |
|---|---|
| 무료 앱 계약 | 활성화됨 |
| 유료 앱 계약 | 처리 중 (서명 완료, 세금·은행 검증 대기) |
| 은행 계좌 | 등록, 처리 중 |
| U.S. W-8BEN / Certificate of Foreign Status | 활성화됨. Part II 입력값 = 조약 `8(1)`, 세율 0%, 앱 판매 소득 — **Apple 재무 문의/세무사 확인 전 값(확정 아님)** |
| 대한민국 세금 양식(사업자등록번호) | 대기 중 |
| 대한민국 전자상거래법 | 활성화됨 |
| 디지털 서비스법(EU 트레이더) | 심사 중 (EU 배포에만 영향, TestFlight·한국 배포 무관) |

### 할 일

- [ ] 유료 앱 계약·은행·한국 세금 양식 "활성화됨" 확인
- [ ] Firebase 콘솔에 iOS 앱 추가 + APNs 키(.p8) 업로드 + `GoogleService-Info.plist` 받기
- [ ] 코드: Firebase Messaging, `AppDelegate` APNs→FCM, entitlements(`aps-environment`), 백그라운드 모드
- [ ] Apple 로그인 연결 (Supabase Apple provider)
- [ ] 결제: App Store Connect 구독 상품 + RevenueCat iOS 앱·키, iOS용 `initBilling` 분기
- [ ] 광고: AdMob iOS 앱·광고 단위, `Info.plist` 테스트 앱 ID 교체
- [ ] 서명·TestFlight 업로드 방식 결정 (Codemagic 등) — `docs/ios-build.md` §5-4 전환 시점
- [ ] Part II 조약 청구값 Apple 재무 문의/세무사 확인
