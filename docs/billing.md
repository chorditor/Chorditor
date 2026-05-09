# 결제 시스템 (RevenueCat + Supabase)

## 결제 아키텍처

```
결제 성공
├── [즉시] purchasePackage() 반환 customerInfo
│         → setPlan()             앱 UI 즉시 반영
│         → updateSupabasePlan()  Supabase DB 직접 업데이트 (1차)
└── [수초 내] RevenueCat 웹훅 → Edge Function → subscriptions upsert (2차)

앱 재시작 시
  _billingReady 완료 대기
  → syncPlanFromBilling()   RC 유료 플랜이면 updateSupabasePlan()으로 DB 선반영
  → fetchPlanWithToken()    Supabase 읽기 (이미 올바른 값)
```

## 주요 상수 (app.js)
```js
const PRODUCT_STANDARD     = '$rc_monthly';
const PRODUCT_PRO          = 'pro_monthly';
const ENTITLEMENT_STANDARD = 'standard_entitlement';
const ENTITLEMENT_PRO      = 'pro_entitlement';
const REVENUECAT_ANDROID_KEY = 'goog_KNGCSoBxhHnHfZuTVgJoNKglKhM';
```

## ⚠️ fetchWebPlan() 호출 금지
결제/복원 직후 `fetchWebPlan()`을 호출하면 Supabase free로 덮어씀 → 절대 금지

---

## Supabase Edge Function (revenuecat-webhook)

- **함수명:** `revenuecat-webhook`
- **소스:** `supabase/functions/revenuecat-webhook/index.ts`
- **배포 URL:** `https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/revenuecat-webhook`
- **배포 시 필수 옵션:** `--no-verify-jwt` (없으면 401 오류)

```bash
SUPABASE_ACCESS_TOKEN=<토큰> npx supabase functions deploy revenuecat-webhook \
  --project-ref jbvkygeksohlysyvaoab --no-verify-jwt
```

### 이벤트별 처리
| 이벤트 | 처리 |
|--------|------|
| INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION, TRANSFER | plan 갱신, status: active |
| CANCELLATION | cancel_at_period_end: true |
| EXPIRATION, REFUND | plan: free, status: canceled (단, 더 높은 활성 플랜 있으면 스킵) |
| BILLING_ISSUE | status: past_due |

---

## Supabase DB 구조

### public.subscriptions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid UNIQUE FK | auth.users.id |
| plan | text | free / standard / pro |
| status | text | active / canceled / past_due |
| current_period_end | timestamptz | 구독 만료일 |
| cancel_at_period_end | boolean | 기간 말 해지 예약 |

### public.notices + notice_reads
- 앱 내 공지 팝업 시스템
- notices: 공지 내용 + target_user_ids (null=전체)
- notice_reads: 유저별 읽음 기록 (PK: user_id + notice_id)

---

## Supabase 클라이언트 주의사항

**Android에서 `_supabase` 클라이언트는 세션을 자동 인식하지 못함**
→ `auth.uid() = null` → RLS 차단 → 에러 없이 조용히 실패

**반드시 raw fetch + Bearer 토큰 방식 사용:**
```js
const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
const session = JSON.parse(stored);
const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON,
  'Authorization': 'Bearer ' + session.access_token,
};
const resp = await fetch(`${SUPABASE_URL}/rest/v1/테이블명?select=컬럼`, { headers });
```

---

## Play Console 주요 경로 (2026년 기준)

- 스토어 등록정보: `main-store-listing`
- 사용자 및 권한: `/users-and-permissions`
- 인앱 구독 테스트: Play Console → 설정 → 라이선스 테스트
  - 라이선스 응답: `RESPOND_NORMALLY` → **`LICENSED`** 로 변경 필요
  - 변경 후 Play Store 캐시 삭제 + 기기 재시작

## RevenueCat Offerings 설정
- default Offering → Current(기본) 설정 ✅
- `pro_monthly` 패키지 → `pro_monthly:pro-monthly-base` 연결 ✅
- `standard_monthly` 패키지 → identifier: `$rc_monthly` ✅

## ⚠️ Entitlement 상품 미연결 증상
- 결제 후 RC 고객 프로필에 "Unattached products" 표시
- 웹훅 `entitlement_ids = null` → plan = 'free'로 저장됨
- 해결: RC → Product catalog → Entitlements → Attach
