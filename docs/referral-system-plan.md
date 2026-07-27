# 초대코드 / 프로모션 코드 시스템 — 기획서

상태: **초대코드·프로모션 코드 양쪽 모두 코드 레벨 구현 완료** (dev_132 브랜치, 미커밋). SQL 전부 라이브 반영됨. 남은 건 **실기기 테스트뿐**.

## 0. 완료된 작업 (dev_132 브랜치)

### 0-1. 초대코드 (리퍼럴) — 완료

**SQL** [supabase/referral_system.sql](../supabase/referral_system.sql) — 라이브 반영됨
- `subscriptions.invite_code` + `_gen_invite_code()`(32자 문자셋, 충돌 재시도) + insert 트리거 + 기존 유저 백필
- `referrals` 테이블 (`invitee_id` PK = 1인 1회 강제), RLS 전면 차단
- `check_invite_code(code)` — 읽기 전용 검증(anon 허용). `redeem_invite_code(code)` — 기록 + 피초대자 상자 10개 지급
- `sync_user_xp()` 교체 — 누적 50XP(레벨2) 도달 시 `referrals.confirmed_at` 즉시 채움. **cron 없음**
- `get_invite_quest()` / `claim_invite_quest()` + `invite_quest_claimed` 컬럼

**온보딩** ([onboarding.html](../onboarding.html), [onboarding.js](../onboarding.js))
- **Step6** "초대코드가 있으신가요?" 있어요/없어요 → "없어요"는 바로 완료
- **Step7** 코드 입력 → `check_invite_code` 호출. 성공은 Step8, 실패는 **화면전환 없이 인라인**(빨간 밑줄 + 흔들림 + `navigator.vibrate(30)` + 사유별 문구). "넘어가기"로 스킵 가능
- **Step8** 확인 완료 페이지 (타이틀 → 안내문 → gift.png 순차 라이즈업)
- 실제 지급은 `_obFinishOnboarding()`에서 `_saveOnboardingData()` **직후** `redeem_invite_code` 호출 — subscriptions row 생성 전에 지급하면 상자가 유실되므로 순서가 중요
- 전 스텝(1~8) 진입 애니메이션, `onboarding.html?ob=1` 테스트 진입로
- 부수 수정: 약관 동의 바텀시트(체크박스 문구, 필수 체크 전 버튼 비활성화, 닫힘 애니메이션)

**퀘스트** ([shared.js](../shared.js))
- `INVITE_QUEST_TIERS = [[1,3,200],[3,5,400],[5,8,700],[10,15,1500]]`, 이후 매 +5회당 8상자
- 카드 "친구 초대" — 누적 훈련시간 아래, 코드 맞추기 구분선 앞에 배치
- 확정 수는 서버만 아는 값(다른 유저 XP 의존)이라 **로컬 폴백 없음**. 비로그인/오프라인 시엔 카드는 그대로 노출하되 진행도만 `0 / 1`

### 0-2. 프로모션 쿠폰 — 완료

**SQL** [supabase/promo_code_system.sql](../supabase/promo_code_system.sql) — 라이브 반영됨
- `subscriptions.promo_plan` / `promo_expires_at` 컬럼
- `get_my_plan()` 교체 — 유효 프로모션 우선, 없으면 기존 결제 판정 로직(그대로 보존)
- `promo_codes` / `promo_redemptions` 테이블, 둘 다 RLS 전면 차단
- `redeem_promo_code(code)` — 수량 검증+카운트를 UPDATE 한 문장으로 원자 처리

**프론트** ([home.html](../home.html), [home.js](../home.js), [style.css](../style.css), [shared.js](../shared.js))
- 프로필 "코드 입력" 카드 → `submitProfileCode()`가 `redeem_promo_code` 호출. `maxlength` 없음(코드 길이 자유)
- 상자 지급은 기존 피크상자 수령 모달 재사용, pro 지급은 신규 `promo-pro-modal`(기존 `event-modal` CSS 재사용). 둘 다면 상자 → pro 순차 표시
- 거부 사유 7종 문구 분기, 중복 클릭 방지 플래그
- 프로필 플랜 표시 — `row.plan`(결제 원본)만 읽어 **프로모션 Pro가 Free로 보이던 버그 수정**. 유효 플랜 합성 후 만료일 라인(`profile-plan-expiry`) 표시
- 플랜 시트 자동갱신 안내 문구 분기 — 프로모션 유저에겐 "자동 결제나 갱신은 되지 않습니다"로 교체. `chorditor_promo_until` localStorage 캐시로 결제 pro와 구분(`get_my_plan`은 'pro' 문자열만 반환해 출처 구분 불가)
- `code-result-modal` / `promo-pro-modal` 진입 애니메이션(fade + scale-in)

### 0-3. 부수 보안 수정

[supabase/revoke_set_my_plan.sql](../supabase/revoke_set_my_plan.sql) — 라이브 반영됨

`set_my_plan`이 `PUBLIC`/`anon`/`authenticated`에 열려 있어 **로그인한 누구나 콘솔에서 `set_my_plan('pro')`로 자가 승급 가능**한 상태였음. `status` 게이트가 방어할 거라 기대했으나 전 계정이 `status='active'`(98/98)라 무방비였음. 실제 악용 흔적은 없었고(pro 계정 전부 운영자가 직접 부여), `postgres`/`service_role`만 남기고 회수 완료.

결제 후 plan 반영은 RevenueCat 웹훅(service_role)이 담당하므로 결제 흐름은 영향 없음. 클라의 `updateSupabasePlan()`은 이제 403을 받지만 `console.error`만 남고 로컬 `setPlan()`은 선반영되어 UI도 정상 — 요청 없이 삭제하지 않고 그대로 둠.

### 0-4. 미완

- **실기기 테스트 전무** — 초대코드 실가입 흐름, 상자 10개 지급, 레벨2 확정, 프로모션 쿠폰(`TEST1`) 실사용 모두 미검증
- **`npx cap sync android` 미실행** — 안드로이드 assets가 이 작업들 이전 상태. 실기기 빌드 전 필수
- dev_132 브랜치 미커밋

## 1. 초대코드 (리퍼럴)

**목적**: 기존 유저를 통한 신규 유입.

**발급**
- 전 유저에게 고유 코드 1개씩 부여 (DB 컬럼)
- 발급 시점: 미정 — 가입 즉시 자동 발급 / 프로필 첫 진입 시 lazy 발급 중 택1

**코드 형식**
- 대문자+숫자 6자리, 대소문자 구분 없음 → 36^6 = 21.7억 조합
- (검토) 헷갈리는 문자(0/O, 1/I) 제외 시 33^6 ≈ 13.9억 조합 — 이쪽 추천

**흐름**
1. 초대자가 자신의 코드를 배포
2. 피초대자가 가입 시(또는 온보딩 중) 코드 입력 → 보너스 보상 **1회** 지급
3. 피초대자가 레벨2 도달 → 초대자의 퀘스트 진행도 갱신 (DB 감지, cron 폴링)
4. 초대자는 퀘스트 목록에서 "초대한 유저 레벨2 달성 수" 항목으로 보상 **무한 수령**

**보상**
- 피초대자: 피크박스 (수량 미정 — 추후 논의)
- 초대자: 퀘스트 티어 보상(피크박스, 기존 `X_QUEST_TIERS` 패턴과 동일 구조)

**기존 퀘스트 시스템과의 통합**
- `home.html` quest-modal + `shared.js`의 티어 퀘스트 패턴 재사용
- 기존 예시(`ATT_QUEST_TIERS` 등): `[임계값, 보상(상자수), XP]` 배열 + `get_X_quest`/`claim_X_quest` RPC 페어
- 신규 항목만 추가하면 됨 — 퀘스트 시스템 자체는 이미 존재, 새로 안 만듦

## 2. 프로모션 코드 (제휴)

**목적**: 학원 등 외부 제휴처 대상 이벤트.

**발급**: 운영자가 고객사와 협의 후 직접 생성 (Dashboard/SQL 수동 발급으로 추정, UI 필요 여부 미정)

**배포**: 제휴처 담당자가 최종 사용자에게 코드 배포 (앱 밖에서 이루어짐, 앱은 입력만 받음)

**보상**: pro 플랜 일정 기간 부여
- `subscriptions` 테이블에 임시 pro 상태 기록, 기간 만료 시 자동으로 이전 플랜(free/standard)으로 복귀시키는 배치/cron 필요
- 이미 결제로 pro인 유저가 프로모션 코드 입력 시 처리 방식 미정(연장/무시/에러)

**제한**: DB에서 관리
- 기간 제한(코드 유효기간)
- 수량 제한(사전 협의된 인원수)

## 3. UI 진입점

**온보딩 Step6/7**: 초대코드 **전용**. 여기서만 초대코드를 입력받는다.

**프로필 페이지 "코드 입력"**: **프로모션 코드 전용**.
- 이유: 초대 이벤트는 신규 유입 목적. 이미 가입한 유저가 초대코드를 입력할 상황 자체가 없음.
- placeholder "프로모션 쿠폰 코드입력" 적용 완료. 초대코드와는 완전히 분리됐으므로 별도 안내 문구(`wrong_place` 등)는 **폐기** — 초대코드를 넣으면 그냥 유효하지 않은 코드로 처리된다.

## 4. 확정된 사항

- 피초대자 보상: 1회만, 이후 영구 중복 불가
- 초대자 보상: 퀘스트 목록 통해 무한 수령 (레벨2 달성 수 기준)
- 초대 성공 카운트는 **예비 → 확정** 2단계. 코드 입력 시점엔 예비, 피초대자가 레벨2 도달해야 확정. 퀘스트는 **확정 카운트만** 인정.
- 프로모션 코드 보상 종류: pro 플랜 기간제 부여
- 코드 형식: 6자리 영숫자(대소문자 미구분)
- 초대코드 입력 창구: 온보딩 전용 / 프로필 입력창: 프로모션 전용

## 5. 구현 가이드라인 (초대코드)

### 5-1. 코드 발급

`subscriptions`에 컬럼 추가. **가입 즉시 자동 발급** (lazy 발급은 "내 코드 조회 시 없으면 생성" 분기가 클라·서버 양쪽에 생겨 복잡해짐).

```sql
alter table public.subscriptions
  add column if not exists invite_code text unique;
```

- 문자셋: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (0/O/1/I/L 제외, 32자) → 32^6 = 10.7억 조합
- 생성: `generate_invite_code()` — 랜덤 6자리 생성 후 unique 충돌 시 재시도(최대 10회)
- 발급 시점: 신규 `subscriptions` row insert 트리거 또는 최초 로그인 시 호출되는 기존 RPC에 끼워넣기 (어느 쪽인지는 구현 직전 실제 가입 경로 확인 후 결정)

### 5-2. 초대 관계 기록 테이블

카운트를 컬럼으로 비정규화하지 않는다. 관계 테이블 하나만 두고 `count(*)`로 집계 — 기존 `quiz_quest`가 `quiz_level_stats`를 집계하는 패턴과 동일.

```sql
create table if not exists public.referrals (
  invitee_id   uuid primary key references auth.users(id) on delete cascade,
  inviter_id   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz   -- 레벨2 도달 시각. null = 예비
);
create index if not exists referrals_inviter_idx on public.referrals (inviter_id);
```

- `invitee_id` PK → **1인 1회 입력이 DB 제약으로 강제됨** (별도 중복방지 로직 불필요)
- 예비 카운트 = `count(*) where inviter_id = me`
- 확정 카운트 = `count(*) where inviter_id = me and confirmed_at is not null`

### 5-3. 코드 입력 검증 (`redeem_invite_code(p_code text)`)

온보딩 Step7의 `_checkInviteCode()` 스텁을 이 RPC로 교체.

거부 조건 순서:
1. 코드에 해당하는 `invite_code` 없음 → `invalid`
2. 그 코드가 **본인 코드** → `self`
3. 이미 `referrals`에 내 row 존재 → `already`
4. 통과 → `referrals` insert(예비) + 피초대자 보상 즉시 지급(`peakbox_count += N`)

반환: `{ ok, reason, reward }`. UI는 `ok=false`면 기존 인라인 에러(빨간 밑줄+흔들림+진동) 재사용, reason별 문구만 분기.

**어뷰징 방지**: 신규가입 판정은 하지 않음. 온보딩에서만 입력받고 `referrals` PK로 1회 제한하는 것으로 충분 — "기존 유저가 나중에 입력"하는 경로가 UI에 존재하지 않기 때문.

### 5-4. 레벨2 확정 (cron 아님)

레벨2 = 누적 50 XP (`_xpNeed(1) = 50 * 1`).

cron 폴링 대신 **기존 `sync_user_xp(p_xp)` RPC 안에서 처리**한다. XP가 오르는 모든 경로가 이미 이 함수를 지나가므로 별도 감지기가 불필요하고, 반영도 즉시다.

```
sync_user_xp 말미에 추가:
  if v_xp >= 50 then
    update referrals set confirmed_at = now()
      where invitee_id = auth.uid() and confirmed_at is null;
  end if;
```

주의: 레벨2 임계 50 XP는 매우 낮다(퀘스트 1개로 도달). 어뷰징이 관측되면 확정 임계를 레벨3~5로 올리는 것을 검토 — 상수 하나만 바꾸면 되게 작성할 것.

### 5-5. 퀘스트 연동

기존 `get_X_quest`/`claim_X_quest` + `X_QUEST_TIERS` 패턴 그대로. 신규 항목 1개 추가.

```sql
alter table public.subscriptions
  add column if not exists invite_quest_claimed integer not null default 0;
```

- `get_invite_quest()`: total = 확정 카운트, `_invite_quest_next(claimed)`로 다음 티어 계산
- `claim_invite_quest()`: `quiz_quest` 구현을 그대로 복사해 total 산출부만 교체

**티어(확정)** — `[확정 초대 수, 피크상자, XP]`

```js
const INVITE_QUEST_TIERS = [[1, 3, 200], [3, 5, 400], [5, 8, 700], [10, 15, 1500]];
// 10회 이후: 매 +5회당 상자 8
```

근거: 실사용 유저 1명 획득은 어떤 그라인딩 퀘스트보다 가치가 높으므로 단위 보상을 크게 잡음. 10회까지 누적 31상자 = 155픽 ≈ 자연회복 3일치.

**피초대자 보상: 피크상자 10개** (확정). 신규 유입 전환이 목적이므로 과감하게 책정.

### 5-6. 구현 순서

1. ✅ `supabase/referral_system.sql` 작성·실행 — 에러 없음, 전 유저 코드 백필 확인
2. ✅ `invite_code` 발급 확인 — 미발급 0건
3. ✅ 온보딩 `_checkInviteCode()` → `check_invite_code` 연결 (지급은 `redeem_invite_code`로 분리)
4. ✅ XP 확정 로직 (`sync_user_xp` 내 처리) — **실동작 미검증**
5. ✅ 퀘스트 항목 UI 추가 — **실동작 미검증**

⚠️ 검증 방식 주의: SQL Editor는 `auth.uid()`가 null이라 `auth.uid()` 쓰는 쿼리는 항상 0행이다. 유저 기준 확인은 앱 콘솔이나 명시적 `user_id` 필터로 할 것.

**설계에서 바뀐 점**: 가이드라인엔 `redeem_invite_code` 하나였으나 **검증용/지급용 2개로 분리**했다. Step7 시점엔 `subscriptions` row가 아직 없을 수 있어 그때 지급하면 `peakbox_count` UPDATE가 0행에 매칭돼 보상이 조용히 유실된다. → Step7은 `check_invite_code`(읽기 전용), 온보딩 저장 완료 후 `redeem_invite_code`(지급).

## 6. 프로모션 쿠폰 코드 — 구현 가이드라인

**목적**: 학원·단체 제휴 및 이벤트. 운영자가 SQL로 직접 코드 발급 → 유저가 프로필에서 입력 → 보상 수령.
**보상 2종**: 피크상자 지급 / pro 플랜 기간제 부여 (둘 다 가능)
**제한**: 기간 제한, 수량 제한 — 각각 독립(둘 다 없음 / 하나만 / 둘 다 가능)

### 6-1. ⚠️ 핵심 리스크 — `plan` 컬럼을 직접 pro로 바꾸면 안 되는 이유

`subscriptions.plan`은 **RevenueCat 웹훅의 소유물**이다. 직접 덮어쓰면 아래 경로에서 조용히 깨진다.

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | 프로모션 pro 유저가 **나중에 실결제** → 그 구독이 만료(`EXPIRATION`) | 웹훅이 `plan='free'`로 강등. **프로모션 기간이 남아있어도 같이 날아감** |
| 2 | 결제 이력 있는 유저가 프로모션 받음 → RC가 `REFUND`/`BILLING_ISSUE` 발송 | 위와 동일하게 프로모션이 덮어써짐 |
| 3 | 프로모션 기간 만료 | `plan`을 무엇으로 되돌릴지 알 수 없음. 원래 free였는지 결제 standard였는지 정보가 이미 소실됨 |

[revenuecat-webhook/index.ts](../supabase/functions/revenuecat-webhook/index.ts)의 `EXPIRATION` 분기에 `planRank` 방어 로직이 있으나, `currentRank > eventRank`일 때만 스킵한다. 프로모션 pro(2)와 이벤트 pro(2)는 동률이라 **스킵되지 않고 free로 내려간다.**

### 6-2. 해결책 — 프로모션 플랜을 별도 컬럼으로 분리

`plan`은 결제 진실값으로 그대로 두고(웹훅 전용, 절대 안 건드림), 프로모션은 별도 컬럼에 저장한 뒤 **읽는 시점에 합성**한다.

```sql
alter table public.subscriptions
  add column if not exists promo_plan       text,        -- 'pro' (없으면 null)
  add column if not exists promo_expires_at timestamptz; -- 만료 시각
```

`get_my_plan()`을 수정해 유효 플랜을 계산:

```
promo_plan이 있고 promo_expires_at > now()  → promo_plan 반환
아니면                                       → plan 반환
```

**이 설계의 결정적 장점: 만료 강등 cron이 아예 필요 없다.** `promo_expires_at`이 지나면 `get_my_plan()`이 자동으로 원래 `plan` 값을 반환하므로, 결제 유저는 원래 플랜으로, 무결제 유저는 free로 알아서 복귀한다. 웹훅과 프로모션이 서로를 덮어쓸 수 없다.

⚠️ **선행 확인 필요**: `get_my_plan` / `set_my_plan` RPC 정의가 repo에 없다(Dashboard에서 직접 생성됨). 수정 전에 현재 정의를 반드시 조회해야 한다 (아래 6-6).

### 6-3. 테이블

```sql
create table public.promo_codes (
  code           text primary key,        -- 대문자 저장, 조회 시 upper(trim())
  peakbox_amount integer not null default 0,
  pro_days       integer not null default 0,   -- 0 = pro 미지급
  max_uses       integer,                      -- null = 수량 무제한
  used_count     integer not null default 0,
  expires_at     timestamptz,                  -- null = 기간 무제한
  active         boolean not null default true, -- 긴급 중단 스위치
  memo           text,                          -- '○○기타학원 2026-08 30명'
  created_at     timestamptz not null default now()
);

create table public.promo_redemptions (
  code        text not null references public.promo_codes(code) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)   -- 같은 코드 1인 1회를 DB 제약으로 강제
);
```

두 테이블 모두 RLS enable + 정책 없음 → 클라 직접 접근 전면 차단, 전부 security definer RPC 경유. (`promo_codes`가 클라에 열리면 유효 코드 목록이 통째로 유출된다)

### 6-4. `redeem_promo_code(p_code text)` — 수량 제한의 원자성이 핵심

**절대 `select` 후 `update` 로 나누지 말 것.** 동시 입력 시 수량 초과가 발생한다. 검증과 카운트 증가를 UPDATE 한 문장으로 처리:

```sql
update public.promo_codes
   set used_count = used_count + 1
 where code = upper(trim(p_code))
   and active
   and (max_uses   is null or used_count < max_uses)
   and (expires_at is null or expires_at > now())
returning peakbox_amount, pro_days into ...;
-- not found → 코드 없음/비활성/소진/만료 (사유 구분은 별도 select로 조회)
```

지급 로직:
- 피크상자: `peakbox_count = peakbox_count + peakbox_amount`
- pro 기간: `promo_plan = 'pro'`, `promo_expires_at = greatest(coalesce(promo_expires_at, now()), now()) + (pro_days || ' days')::interval`
  → 이미 프로모션 pro인 유저가 또 입력하면 **연장(누적)**
- `promo_redemptions` insert (PK 충돌 = 이미 사용 → 이 경우 전체 트랜잭션 롤백되어 used_count도 복구됨)

거부 사유: `invalid`(없는 코드) / `inactive` / `expired` / `soldout` / `already`(본인이 이미 사용) / `no_auth`

반환: `{ ok, reason, peakbox, pro_days, plan }`

### 6-5. 클라이언트 — 구현 완료

**입력창**: 프로필 "코드 입력". placeholder "프로모션 쿠폰 코드입력", `maxlength` 없음(운영자가 코드 길이 자유롭게 지정 가능해야 함 — 초대코드 기준 6자 제한이 남아 있어 제거함)

`submitProfileCode()`:
- 상자만 → 기존 피크상자 수령 모달(`showPeakboxRewardModal`) 재사용
- pro만 → 신규 `showPromoProModal(days)`
- **둘 다 → 상자 모달 닫힌 뒤 pro 모달 순차 표시** (`showPeakboxRewardModal`의 `onClose` 콜백 사용)
- 거부 → `showCodeResultModal('invalid', 사유별문구)`, 네트워크 실패 → `'error'`
- `_submittingProfileCode` 플래그로 연타 방지

pro 지급 시 `setPlan('pro')` + `refreshPromoUntil()` 즉시 호출.

**플랜 출처 구분 (`chorditor_promo_until`)**: `get_my_plan()`은 `'pro'` 문자열만 반환해 결제 pro와 프로모션 pro를 구분할 수 없다. 플랜 시트의 자동갱신 안내를 분기하려면 출처가 필요하므로 만료일을 localStorage에 캐싱한다. `fetchPlanWithToken`/`fetchWebPlan`에서 **plan이 `'pro'`일 때만** `subscriptions` REST로 조회 → free 유저는 추가 왕복 없음. `getPromoUntil()`은 만료 시각이 지나면 자동으로 null 반환.

### 6-6. 운영 — 쿠폰 발급 치트시트

**기본형** (상자 1 + pro 1일 + 선착순 1명)
```sql
insert into public.promo_codes (code, peakbox_amount, pro_days, max_uses, memo)
values ('여기에코드', 1, 1, 1, '설명 메모');
```

**기간 제한 추가**
```sql
insert into public.promo_codes (code, peakbox_amount, pro_days, max_uses, expires_at, memo)
values ('ACADEMY1', 0, 90, 30, '2026-12-31', '○○기타학원 30명');
```
`max_uses` 생략 = 수량 무제한, `expires_at` 생략 = 기간 무제한.

**주의**
- 코드는 반드시 **대문자**로 저장. 앱이 `upper(trim())`으로 조회하므로 소문자로 넣으면 영원히 매칭 안 됨
- `used_count`/`created_at`은 서버 관리값 — 직접 넣지 말 것
- `active`는 기본 `true`. 긴급 중단: `update promo_codes set active = false where code = '...'`

**현황 조회**
```sql
select code, used_count, max_uses, expires_at, active, memo from public.promo_codes;
```

### 6-7. 구현 순서

1. ✅ `get_my_plan` 원본 확보 후 유효플랜 합성 로직으로 교체 — 결제 판정 로직은 원문 그대로 2순위에 보존
2. ✅ `supabase/promo_code_system.sql` 작성·실행 — 기존 유료 30계정 영향 없음 확인, 프로모션 0건
3. ✅ 테스트 코드(`TEST1`) 발급
4. ✅ `submitProfileCode()` 연결 + pro 발급 모달 + 만료일 표시 + 자동갱신 문구 분기
5. ⬜ **실사용 테스트 미완** — `TEST1` 실입력, pro 기능 개방, 만료 후 원래 플랜 복귀

### 6-8. 판단 후 미채택

- **프로필 "업그레이드" 버튼을 프로모션 pro 유저에게 숨기기** — 실결제 유도 목적이 유효하다고 판단해 그대로 노출 유지
- **프로필에 초대코드 입력 시 전용 안내 문구** — 초대코드와 완전히 분리되어 폐기
