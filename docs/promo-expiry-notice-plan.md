# 프로모션 Pro 만료 알림 — 기획서

작성 2026-07-27 / 작업 예정 2026-07-28
상태: **계획만 확정, 코드 착수 안 함**

## 배경

프로모션 쿠폰으로 받은 Pro는 `promo_expires_at`이 지나면 `get_my_plan()`이 자동으로 원래 플랜을 반환하며 조용히 끝난다. 강등 처리가 필요 없다는 게 설계상 장점이지만, **유저에게 아무 안내가 없다**는 부작용이 있다.

현재 `promo_expires_at`을 읽는 곳은 3군데뿐이고 전부 표시용이다.
- [home.js:1974](../home.js) 프로필 플랜 판정
- [home.js:1995](../home.js) 만료일 텍스트
- [shared.js:1554](../shared.js) 플랜 시트 안내 문구 분기

만료를 **감지해서 알리는 코드는 0줄**. 학원 제휴 유저 입장에선 어느 날 갑자기 피크가 30개 제한으로 돌아가고 고급 기능이 잠기는데 이유를 알 수 없다 → 문의·이탈. 동시에 **만료 시점은 곧 결제 전환 기회**인데 이를 전혀 활용하지 못하고 있다.

이미 있는 것은 **입력 시점 거부 안내**뿐이다(`PROMO_ERROR_MESSAGES`의 `expired`/`soldout`) — 남이 다 쓴 코드나 기간 지난 코드를 입력했을 때만 뜬다. 내 플랜 만료와는 무관.

## 목표

| # | 항목 | 목적 |
|---|---|---|
| A | 만료 **후** 1회 모달 | 혼란 제거 |
| B | 만료 **임박** 배너 | 결제 전환 |
| C | FCM 푸시 | 앱 미접속자 회수 |

셋 다 구현. A·B는 클라이언트 전용(SQL 불필요), C만 서버 작업 필요.

---

## A. 만료 후 1회 모달

### 판정 방식

`getPromoUntil()`은 만료 시각이 지나면 자동으로 `null`을 반환한다([shared.js:1013](../shared.js)). 따라서 "직전까지 프로모션이 있었다"는 흔적을 따로 남겨야 만료 전환을 감지할 수 있다.

localStorage 키 1개 추가:

```
chorditor_promo_seen  = 마지막으로 관측된 promo_expires_at (ISO)
```

`setPromoUntil()`이 값을 세팅할 때 `chorditor_promo_seen`에도 같이 기록. 이후 앱 진입 시:

```
getPromoUntil() === null  &&  chorditor_promo_seen 존재
  → 만료됨 → 모달 1회 표시 → chorditor_promo_seen 제거
```

`chorditor_promo_seen`을 지우는 것으로 "1회만" 보장. 재설치/기기 변경 시엔 흔적이 없어 안 뜨는데, 이미 만료된 뒤이므로 안 띄우는 게 맞다.

⚠️ **주의**: `setPromoUntil(null)`은 `fetchPlanWithToken`에서 plan이 pro가 아닐 때도 호출된다. `seen`은 여기서 지우면 안 된다(지우면 만료 감지가 영영 불가). `seen`은 **모달을 띄운 뒤에만** 제거할 것.

### 표시 내용

기존 `promo-pro-modal`과 같은 `event-modal` CSS 재사용. 아이콘만 다르게(gift → 시계/일반 알림 계열).

```
Pro 이용 기간이 끝났어요
프로모션으로 드린 Pro 혜택이 종료됐어요.
계속 이용하시려면 업그레이드해주세요.

[나중에]  [업그레이드]
```

"업그레이드" → `openPlanSheet('promo_expired')`. 기존 `openPlanSheet(triggerSource)`가 analytics `paywall_view`에 trigger를 실어보내므로 **전환율 측정이 자동으로 붙는다**.

### 띄우는 위치

홈 진입 팝업이 이미 여럿 있다(출석, 이벤트, 리뷰 유도, 피크상자). 중첩되면 UX가 망가지므로 **기존 팝업 체인에 편입**해야 한다. `checkEventThanks130()`이 "모달 띄웠으면 true 반환"으로 중첩을 막는 패턴을 쓰고 있으므로 동일하게 맞출 것.

우선순위 제안: 출석 > 만료 알림 > 이벤트 > 리뷰 유도
(만료는 기능이 잠긴 상태라 즉시 인지가 필요하고, 결제 전환 기회라 뒤로 밀면 손해)

---

## B. 만료 임박 배너

### 조건

`getPromoUntil()`이 유효하고 남은 기간이 **3일 이하**일 때.

```js
const left = Math.ceil((promoUntil - Date.now()) / 86400000);
if (left >= 1 && left <= 3) → 노출
```

만료 시각이 KST 그날 23:59:59로 정렬돼 있으므로([promo_code_system.sql](../supabase/promo_code_system.sql)) `ceil` 계산이 직관과 일치한다("오늘 만료"=1일 남음).

### 표시 방식 — 모달 아님

만료 임박은 3일 연속 뜰 수 있어서 모달로 하면 짜증난다. **홈 상단 배너**로:

```
Pro 이용 3일 남았어요 · 계속 이용하기 >
```

탭 → `openPlanSheet('promo_expiring')`.

배치는 `home-daily-board` 위 또는 아래. 기존 홈 광고 배너 3종이 이미 있으므로 그 슬롯 규칙과 충돌하지 않게 확인 필요.

### 하루 1회 제한

`chorditor_promo_warn_date` = 마지막 노출 날짜(YYYY-MM-DD). 같은 날 재진입 시 재노출 안 함.
(배너라 매번 떠도 무방하다고 판단되면 이 제한은 생략 가능 — 구현 시 결정)

---

## C. FCM 푸시

앱을 안 켜는 유저는 A·B를 볼 수 없다. 학원 제휴처럼 **대량 발급 건은 만료일이 몰려 있어** 푸시 효과가 크다.

### 기존 인프라 재사용

- 발송: `send-push` Edge Function
- 문구: `push_message_templates` 테이블 + `get_random_push_message(category)` — **category 값만 새로 추가하면 됨**
- 스케줄: `pg_cron` + `pg_net`, [push_cron.sql](../supabase/push_cron.sql) 패턴 그대로
- 수신 동의: `push_tokens.nudge_enabled` / `winback_enabled`

### 신규 필요분

**1. 대상 조회 함수**

```sql
create or replace function public.get_promo_expiring_targets(p_days_left integer)
-- promo_plan is not null
--   and promo_expires_at::date at KST = (오늘 + p_days_left)
--   and push_tokens 존재 + 동의 상태
```

**2. 발송 시점 — 2회**
- **만료 1일 전** (`promo_expire_soon`) — 결제 유도
- **만료 당일 종료 후** (`promo_expired`) — 회수

**3. cron 등록**

기존 윈백이 11:30 UTC(20:30 KST)에 돌고 있음. **같은 시각에 붙이면 유저가 하루에 푸시 2개를 연달아 받는다.** 시간대를 분리할 것 (예: 09:00 UTC = 18:00 KST).

**4. 카테고리 동의 컬럼**

`nudge_enabled`/`winback_enabled` 중 어디에 묶을지, 아니면 `promo_enabled`를 새로 팔지 결정 필요.
→ **제안: 별도 컬럼 안 만들고 동의 무관 발송.** 결제 관련 고지 성격이 강하고 유저당 최대 2회뿐. (단 정책상 문제 소지 있으면 `winback_enabled`에 묶기)

### 중복 발송 방지

`promo_expires_at`은 연장 시 갱신되므로, 발송 이력 없이 날짜만 보면 재발송 위험이 있다. 발송 로그 테이블 또는 `subscriptions`에 `promo_notified_at` 컬럼 1개 추가 검토.

---

## 구현 순서 (2026-07-28)

1. **A** — `chorditor_promo_seen` 기록 + 만료 감지 + 모달 → 확인: 콘솔로 `promo_expires_at`을 과거로 바꾼 뒤 앱 재진입 시 1회만 뜨는지, 두 번째 진입엔 안 뜨는지
2. **A 통합** — 홈 팝업 체인 우선순위 편입 → 확인: 출석 모달과 겹치지 않는지
3. **B** — 남은 일수 계산 + 홈 배너 → 확인: 3일/1일/0일 경계값, 하루 1회 제한
4. **C-1** — `get_promo_expiring_targets` + 템플릿 category 2종 → 확인: SQL로 대상 조회가 맞는지(테스트 계정)
5. **C-2** — cron 등록(윈백과 시간 분리) + 중복 방지 → 확인: 수동 호출 1회 발송

## 선행 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | B 배너 위치 | 홈 광고 배너 3종과의 슬롯 충돌 확인 필요 |
| 2 | C 동의 컬럼 | 무관 발송 / `winback_enabled`에 묶기 |
| 3 | C 중복 방지 | `promo_notified_at` 컬럼 vs 발송 로그 테이블 |
| 4 | 팝업 우선순위 | 출석 > 만료 > 이벤트 > 리뷰 (제안) |

## 관련 문서

- [referral-system-plan.md](referral-system-plan.md) — 프로모션 코드 시스템 본체
- [supabase/promo_code_system.sql](../supabase/promo_code_system.sql) — 만료 시각 KST 정렬 로직
