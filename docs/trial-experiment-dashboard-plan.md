# 7일 체험권 실험 — 대시보드 설계 문서

> 목적: 다른 세션(Chorditor_dashboard)에서 이 문서만 읽고 목업데이터로 대시보드 UI를
> 먼저 완성한다. 실제 백엔드(쿼리·크론·테이블)는 이 문서 작성 세션(Chords_editor)에서
> 별도로 이어감 — 여기 적힌 쿼리 스케치는 "이런 계산이 필요하다"는 명세이지 최종
> SQL이 아니다.

## 1. 실험 배경

- 현재 페이월 도달 대비 실결제 전환: **8명**(전체 다운로드 약 1만명 기준 0.08%), 이 8명
  전부 8/8~8/17 유튜브 스파이크 초반 10일에 집중. 이후 자연전환 0건(테스트계정 1건 제외).
- 게이트식 유도(피크소진·노트한도·이미지제한) 경로는 노출량과 무관하게 전환기여 **0%**.
  손실회피 프레임(기존 프로모만료알림)만 유일하게 실적 있음(6.25%, n=16로 작음).
- MAU 30일 기준 7,000명. **목표: MAU의 1% = 70명 결제전환**(현재 8명 대비 62명 순증).
- 산수 근거: profile 자발클릭 경로만으론 도달을 MAU 전체로 늘려도 070명 달성 어려움 →
  전원 대상 체험판 배포가 유일하게 물량으로 목표치를 커버할 수 있는 방식으로 채택.

## 2. 실험 설계 확정 사항

- **배포 시점**: 다음 앱 업데이트. "1만 다운로드 달성" 명분으로 공지.
- **대상**: MAU 전원(전략1) — 별도 "고관여 유저만 타겟" 캠페인(전략2)은 없음. 대신
  대시보드 코호트분석(§4의 4번 섹션)으로 사후 흡수.
- **채널**: 앱 내 배너/모달 + 푸시알림 동시.
- **지급 로직**: 기존 프로모코드 체험 로직(`promo_plan`/`promo_expires_at`,
  `supabase/promo_code_system.sql`) 그대로 재사용. 신규 개발 없음.
- **6일차 리마인드 푸시 추가**: 만료 임박을 알려 재접속을 유도(안 그러면 재접속 안
  하는 유저는 만료알림 자체를 못 보고 전환기회도 없음 — FCM 윈백 사다리 인프라 재사용).
- **정지조건**: 만료자(체험 종료, pro→free) 수가 **300명**에 도달하면 실험 종료. 기간
  캡은 없음(잠정 "약 1개월"은 예상치일 뿐 별도 조건 아님, 2026-09-09 세션에서 정정됨).
- **정지조건 계산 방식**: 클라이언트 이벤트(앱 재접속) 의존하지 않음. `subscriptions`의
  `promo_expires_at`이 서버(`get_my_plan` RPC)에서 매 조회 시 `promo_expires_at > now()`로
  동적 합성되므로, 만료자 수는 **`promo_expires_at < now()`인 유저 카운트**로 언제든
  정확히 계산 가능(`supabase/promo_code_system.sql` 참고).
- **노출문구**: 아직 미정 — 대시보드 설계와 무관, 추후 별도 결정.

## 3. 대시보드 컴포넌트 — 총 3개 카드

### 3-1. 메인 퍼널 (막대형, 4단계)

**중요: 각 단계는 반드시 이전 단계의 부분집합이어야 함(막대가 아래로 갈수록 작아지거나 같아야 함).**
이 문서의 정의를 그대로 따르면 그 성질이 보장된다 — 임의로 다른 이벤트/조건으로 바꾸지 말 것.

| 단계 | 정의 | 데이터 소스 | 부분집합 보장 근거 |
|---|---|---|---|
| 1. 지급 | 이번 실험으로 체험판(promo) 부여된 유저 | `subscriptions` 테이블, 이번 배포 배치로 `promo_plan`/`promo_expires_at` 세팅된 행 (배포 시점 기준으로 별도 식별 필요 — 배치 실행 시각 또는 전용 플래그로 이번 실험 대상만 특정할 것) | 기준 집합 |
| 2. 재접속 | 1의 유저 중 지급 이후 `app_open` 이벤트 1회 이상 | `analytics_events`, `event_name='app_open'` | `app_open`은 1번 목록에 속한 user_id만 필터링하므로 정의상 부분집합 |
| 3. 알림노출 | 2의 유저 중 `promo_expiry_notice_shown` 발생 | `analytics_events`, `event_name='promo_expiry_notice_shown'` | `checkPromoExpiryNotice()`가 홈화면(`home.js`) 진입 시에만 호출되고, `app_open`이 그보다 항상 먼저 트래킹됨(2026-09-09 확인, 인증 완료 직후 `app_open`, 그 뒤 500ms+ 딜레이 체인 끝에 알림체크) — 재접속 없이는 알림노출 이벤트 자체가 발생 불가 |
| 4. 결제(알림경유) | 3의 유저 중 `plan_upgrade_completed` 발생 **AND** 직전 `paywall_viewed.properties.trigger_source = 'promo_expiry_notice'` | `analytics_events`, 두 이벤트 조인 | `promoExpiryUpgrade()`가 알림모달을 닫고 곧바로 이어서 결제시트를 여는 구조라, 이 trigger_source는 알림을 보지 않고는 발생 불가 |

- **주의**: 4단계는 "이 코호트의 전체 결제자 수"가 아니라 **알림경유 결제자만**. 다른
  경로(profile 자발클릭 등)로 이 코호트 유저가 결제했더라도 4번엔 안 잡힘 — 의도된
  설계(퍼널의 순수성 유지 목적, 2026-09-09 세션에서 "전체결제자 별도 KPI" 안을 검토했으나
  불필요하다고 최종 판단해 뺌).

### 3-2. 진행 카운터 (프로그레스바, 단일)

- 표시: **만료자 수 / 300**
- 계산: `subscriptions` 중 이번 실험 대상이면서 `promo_expires_at < now()`인 행 카운트.
- 특이 형태 주의: 전원 일괄 지급이라 **첫 7일간은 만료자 0명**으로 평평하다가 8일차부터
  차오르기 시작함 — 버그 아님, 목업데이터도 이 지연출발 패턴을 반영해서 만들 것.
- 1개월 등 기간 캡은 없음(§2 참고) — 진행카운터 외 다른 시간축 요소 불필요.

### 3-3. 코호트 비교 (4개 서브섹션, 각각 "그룹별 전환율 막대")

4개 섹션 전부 시각화 형태는 동일(그룹별 막대, y축=전환율%) — 그룹 나누는 기준만 다름.
"전환율"의 분자/분모는 3-1의 4단계(알림경유 결제) 기준을 그대로 따른다(즉 각 그룹 안에서도
지급→재접속→알림노출→결제 퍼널을 돌리고, 최종 전환율만 막대로 비교).

| 섹션 | 그룹 기준 | 데이터 소스 |
|---|---|---|
| 성별 | `gender` | `subscriptions.gender` |
| 나이대 | `birth_year` → 10살 단위 파생(20대/30대/40대...) | `subscriptions.birth_year` |
| 페르소나 | 최신 페르소나 | **`user_persona_profile`** 테이블 사용 (⚠️ `subscriptions.persona`는 온보딩 시점 스냅샷이라 이후 승급/강등 미반영, 쓰지 말 것) |
| 피크소진 횟수구간 | 체험판 지급 시점 **이전**의 피크소진 경험 횟수(구간: 1회 / 2~4회 / 5~9회 / 10회+ 등, 정확한 컷은 목업 단계에서 자유롭게) | `analytics_events`에서 **`peak_insufficient`(구버전, ~2026-08-30까지) + `peak_buffer_shown`(신버전, 그 이후)** 두 이벤트를 UNION해서 유저별 카운트 |

- 소진횟수 구간 참고치(2026-09-09, 최근 30일 스냅샷 기준, 실험 시행 시점엔 재산정 필요):
  전체 소진경험 유저 160명 중 1회 8명, 2회 이상 152명. 분포 꼬리가 길어서(최대 62회)
  상위 몇 % 헤비유저가 존재 — 구간 설계 시 참고.

## 4. 데이터 소스 요약

| 이름 | 종류 | 용도 |
|---|---|---|
| `subscriptions` | Supabase 테이블 | 플랜상태, promo 지급/만료시각, gender, birth_year |
| `user_persona_profile` | Supabase 테이블 | 최신 페르소나(코호트 분류용) |
| `analytics_events` | Supabase 테이블(30일 롤링) + BigQuery(30일 이전 전체) | 전 이벤트 로그. 이번 실험 관찰기간이 30일 넘어가면 Supabase만으론 부족할 수 있음 — BigQuery 병행 조회 고려 |
| `app_open` | 이벤트 | 재접속 판정 |
| `promo_expiry_notice_shown` | 이벤트 | 알림노출 판정 |
| `paywall_viewed` (`properties.trigger_source='promo_expiry_notice'`) | 이벤트 | 알림경유 페이월 진입 판정 |
| `plan_upgrade_completed` | 이벤트 | 실결제 판정(유일하게 실결제에만 찍힘, 프로모지급과 무관 — 2026-09-09 확인) |
| `peak_insufficient` | 이벤트(구버전, ~2026-08-30) | 소진횟수 카운트용 |
| `peak_buffer_shown` | 이벤트(신버전, 2026-08-30~) | 소진횟수 카운트용 |
| `docs/paywall-trigger-sources.md` | 문서 | 기존 페이월 trigger_source 전체 정의(이번 실험과 별개로 이미 있는 문서, 참고용) |

## 5. 목업 단계에서 참고할 실제 규모감

- MAU(30일) 7,000명, 목표 결제전환 70명(1%)
- 기존 자연전환 베이스라인: 0.08%(8명/1만 다운로드)
- 손실회피 트리거 참고 전환율: 6.25%(작은 표본, 편향 있음) — 목업 수치의 현실성 참고용
- 진행카운터 300명 목표, 8일차부터 증가 시작하는 지연출발 곡선

## 6. 다음 단계

1. ~~(다른 세션) 이 문서 기반 목업데이터로 3개 카드 UI 완성~~ — 완료
   (Chorditor_dashboard `analytics-projects.html` FN_SECTIONS, 다크모드까지 포함)
2. (이 세션, Chords_editor) 실제 쿼리/뷰/크론 구현, 위 이벤트 이름·조인 로직 그대로 사용
   — 아래 §7 참고

## 7. 데이터 수집 구현 계획 (2026-09-10, UI 완료 후 정리)

### 7-1. 지급 대상자 식별 — 별도 테이블 불필요(2026-09-10 재설계로 폐기)

~~`trial_experiment_recipients` 신규 테이블~~ 방식은 "배치 시점 전원 강제지급" 모델
전제였는데, 2026-09-10에 **"클릭해야만 활성화"** 모델로 재설계되면서 불필요해짐
(윤리적 이유 — 원치 않는 유저에게 강제로 Pro 적용하는 게 부적절하다는 판단, 아래
§8 참고). 캠페인 전용 프로모 코드(`10K_TRIAL_7D`, `supabase/trial_experiment_promo_code.sql`)를
만들어 기존 `redeem_promo_code` RPC로 클레임하는 방식으로 대체 — `promo_redemptions`
테이블(PK: code+user_id)이 "누가 언제 클레임했는지"를 이미 다 갖고 있고 중복클레임
방지도 DB 제약으로 자동 처리되므로, 지급 대상자 식별은 그냥:

```sql
select user_id, redeemed_at from public.promo_redemptions
where code = '10K_TRIAL_7D';
```

### 7-2. 정지조건(진행카운터) — 실시간 쿼리로 충분, 별도 테이블 불필요

배치지급이 아니라 **클레임 시점 개인별로 7일 카운트다운이 시작**되므로(§8),
`subscriptions.promo_expires_at`(다른 프로모션과 공용 컬럼이라 값이 섞일 수 있음)
대신 이 코드의 `redeemed_at` 기준으로 직접 계산한다:

```sql
select count(*) from public.promo_redemptions
where code = '10K_TRIAL_7D'
  and redeemed_at + interval '7 days' < now();
```

트래픽 낮고(최대 MAU 7,000명 규모) 300명 도달 여부만 보면 되므로 즉시집계로
충분 — history 테이블 안 만듦(paywall처럼 장기간 반복집계 필요한 지표가 아님).

### 7-3. 메인퍼널 + 코호트비교 — 일별 스냅샷 테이블 (구현 완료, 2026-09-11)

`supabase/trial_experiment_funnel.sql` — `trial_experiment_funnel_daily` 테이블 +
`refresh_trial_experiment_funnel()` 함수 + admin uid RLS. 크론은
`supabase/trial_experiment_funnel_cron.sql`(매일 05:10 KST, 순수 SQL 함수라
Edge Function 불필요).

퍼널 4단계(§8 재설계 반영 — `granted`→`claimed`):

| 필드 | 정의 |
|---|---|
| `claimed` | `promo_redemptions`(code=`10K_TRIAL_7D`) 행 수 (= 지급 = 활성화, 한 이벤트) |
| `reopened` | 클레임 후 `app_open` 1회 이상(체험을 실제로 열어봄) |
| `notice_shown` | 클레임 후 `promo_expiry_notice_shown`(만료 하루전 인앱 모달) |
| `converted` | 클레임 후 `plan_upgrade_completed` **AND** `paywall_viewed(trigger_source='promo_expiry_notice')` (알림경유 결제, §3-1 B안) |

`segment_type`: `overall`(카드1 메인퍼널) / `gender` / `age`(10살단위) /
`persona`(user_persona_profile) / `peak_bucket`(클레임 이전 `peak_insufficient`+
`peak_buffer_shown` 횟수: `0회`/`1~4회`/`5~9회`/`10회+`) — 뒤 4개가 카드3 코호트비교.

⚠ **§3-1의 "지급→재접속" 순서는 배치선지급 전제라 폐기됨.** 위 표가 최종 정의.
클릭식 모델에선 클레임 자체가 앱을 켠 상태에서 일어나므로 "재접속"은 1단계가 아니라
"체험을 실제로 써봤나"를 보는 2단계 지표로 의미가 바뀜.

### 7-4. 필요 이벤트

| 용도 | 이벤트 | 비고 |
|---|---|---|
| 안내모달 노출 | `trial_offer_modal_shown` | **신규**(2026-09-11, `maybeShowTrialOfferModal()`) |
| 클레임 클릭/성공/실패 | `trial_offer_claim_clicked` / `trial_offer_claimed` / `trial_offer_claim_failed` | **신규**, `source` 프로퍼티로 3경로 구분(§8) |
| 재접속 판정 | `app_open` | 기존 |
| 알림노출 판정 | `promo_expiry_notice_shown` | 기존, `checkPromoExpiryNotice()` |
| 알림경유 결제판정 | `paywall_viewed` (`trigger_source='promo_expiry_notice'`) | 기존, [[paywall-trigger-sources.md]] |
| 실결제 판정 | `plan_upgrade_completed` | 기존 |
| 소진횟수(코호트) | `peak_insufficient`(구버전) + `peak_buffer_shown`(신버전) UNION | 기존 |

### 7-5. 실행 순서

1. ~~`trial_experiment_recipients` 테이블 생성~~ — 폐기, 불필요
2. `supabase/trial_offer_status.sql` 실행 — eligibility 조회 RPC(지금 실행해도 무해, 코드 없으면 항상 eligible:false) ✅ 완료
3. `supabase/trial_experiment_funnel.sql` + `trial_experiment_funnel_cron.sql` 실행 — 스냅샷 테이블/함수/크론
4. `supabase/push_trial_expiry.sql` → push-trial-expiry Edge Function 배포 → `push_cron_trial_expiry.sql` (6일차 리마인드 푸시) ✅ 완료
5. **실제 배포일에**: `supabase/trial_experiment_promo_code.sql` 실행 — `expires_at`이 `now()+30일`이라 미리 돌리면 클레임 기간이 그만큼 줄어듦
6. (대시보드 세션) `analytics-projects.html`의 `fnRenderTrialExperiment()` 목업 상수를 `trial_experiment_funnel_daily` REST 조회로 교체, 진행카운터(§7-2)는 실시간 쿼리
7. 앱 빌드/배포 (`1.3.5.5` — DEV 훅 없음, `APP_VERSION` `_dev` 제거)

## 8. 2026-09-10 모델 재설계 — 배치선지급 폐기, 클릭식 클레임으로 전환

**배경**: 배치 시점에 전원에게 강제로 Pro를 지급하는 원래 설계는 (a) 정말 원치 않는
유저에게 강제 적용하는 게 윤리적으로 부적절하고, (b) 클레임하지 않는 자유가 없어서
"선물"이라는 명분과 안 맞았음.

**바뀐 것**:
- 지급 메커니즘: 배치 insert → **캠페인 전용 프로모 코드**(`10K_TRIAL_7D`,
  `supabase/trial_experiment_promo_code.sql`) 클레임. 기존 `redeem_promo_code` RPC
  그대로 재사용, 중복클레임 방지는 `promo_redemptions` PK가 자동 처리.
- 활성화(7일 카운트다운 시작) 시점: 배치 실행 시각 → **클레임한 바로 그 순간**
  (`promo_redemptions.redeemed_at` + `promo_codes.pro_days`). 유저가 언제 업데이트하든
  본인 기준으로 온전한 7일을 씀.
- 클레임 경로 3곳(전부 `home.js`의 `claimTrialOffer(source)` 공용 호출, `source`로 구분):
  1. `modal_cta` — 1만다운로드 안내모달(`trial-offer-overlay`) "7일 체험 시작하기"
  2. `defer_modal` — "나중에 할래요" 클릭 시 뜨는 재확인모달(`trial-defer-overlay`) "지금 받기"
  3. `profile_banner` — 프로필 플랜배너의 "업그레이드" 버튼이 미클레임 상태면 "체험하기"로 바뀜(새 배너 아님, 기존 버튼 재활용)
- 캠페인 자체의 클레임 마감: **30일**(`promo_codes.expires_at`) — 이건 유지, 개인별
  7일 체험 기간과는 다른 값이니 혼동 금지.
- 트래킹: `trial_offer_claim_clicked`/`trial_offer_claimed`/`trial_offer_claim_failed`
  이벤트, `source` 프로퍼티로 3경로 구분.

**영향받는 곳**: §3-1(메인퍼널 재정의 필요, 위 7-4 경고 참고), §7-1/7-2(반영 완료).
