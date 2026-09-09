# 페이월(paywall_viewed) trigger_source 전체 목록

`paywall_viewed` 이벤트의 `properties.trigger_source` 값 정의. 대시보드
`paywall_path_history`/`paywall_path_window_summary` 테이블이 이 값을 path로 씀.

## 활성 트리거

| trigger_source | 설명 | 발생 지점 |
|---|---|---|
| `profile` | 프로필 화면에서 자발적으로 "업그레이드" 버튼 클릭 | `home.js openPlanModal()`, `home.html .profile-upgrade-btn` |
| `note_limit` | 노트 개수 한도 초과로 강제 노출(화면이동 없음, 홈에서 그 자리에 바로 뜸) | `home.js promptCreateProject()`/`confirmCreateProject()` |
| `note_save` | 노트 저장 시도 시 무료 플랜 한도 초과 | `user_project.js _noteSaveGate()` |
| `note_locked` | 한도 초과로 잠긴 프로젝트 열람 시도 | `home.js openProject()` 등 |
| `image_transparent` | 이미지 저장 시 투명배경(프리미엄 전용) 옵션 시도 | `home.js` |
| `image_scale` | 이미지 저장 시 배율 한도 초과. **노트저장 + 라이브러리내보내기 두 경로가 통합돼있음(의도적 유지, 표본이 적어 분리 안 함)** | `home.js onImgSave()`/`_doSavePNG()`/`_doExportLibChordImage()` |
| `peak_buffer` | 피크 부족 → 완충모달 경유 → "Pro 플랜 보기" 클릭. `properties.training_type`으로 어떤 훈련에서 왔는지 구분(`quiz`/`chord_combo`/`scale`/`progression`/`strum`) | `shared.js consumePeak()` → `_peakBufferOpenPlan()` |
| `promo_expiry_notice` | 프로모션 만료 임박 알림에서 업그레이드 클릭 | `shared.js promoExpiryUpgrade()` |

## 구버전 (더 이상 발생 안 함)

| trigger_source | 설명 | 비고 |
|---|---|---|
| `peak_insufficient` | 피크 부족 시 요금제 시트 직접 노출 | 2026-08-30 A/B실험(즉시노출 vs 완충모달) 종료, 이후 전부 `peak_buffer`로 통일됨 |

## 죽은 코드 (호출부는 있지만 실데이터에 한 번도 안 잡힘)

**2026-09-09 기준 방치 — 삭제하지 않음.** 과거 데이터가 소급 안 되기 때문에, 나중에
"이 시점부터 프리미엄 레벨이 사라졌다"는 걸 데이터 쪽에서 역으로 판별해 테이블 값을
갱신해야 할 수도 있어서 코드 흔적을 남겨둠.

| trigger_source | 설명 | 상태 |
|---|---|---|
| `quiz_level` | 코드맞추기 프리미엄 레벨 진입 시도 | `chord-name-quiz.js cfg.premium` 체크 — 프리미엄 레벨 자체가 없어져서 사실상 도달 불가 |
| `scale_premium` | 스케일 훈련 프리미엄 카드 진입 시도 | `scale-training.js dataset.premium` 체크 — 위와 동일 사유 |
| `scale_limit` / `project_limit` / `image_transparent`(user_project.js 경로) / `upgrade_modal` | `user_project.js`(노트 편집페이지)의 구버전 `showUpgradeModal()` 경로 | 실데이터 0건, 원인 미상, 조사 안 함 |

## 이중 로깅 버그 수정 (2026-09-09)

`openPlanModal()`/`_noteSaveGate()`/`chord-name-quiz.js`/`scale-training.js` 4곳이
`openPlanSheet()` 호출 전에 자체적으로 `paywall_viewed`를 한 번 더 트래킹하고 있었음
(`openPlanSheet()` 내부에서도 트래킹하므로 이 4곳만 조회수가 2배로 찍혔음). 중복 트래킹
라인 제거로 수정 — **이 수정 이전 데이터는 여전히 2배 부풀려진 views 값**임(distinct_users/
converted_users/전환율은 영향 없음).

## `profile` 라벨 변경 이력 (2026-09-09)

원래 `profile` 하나로 자발적 클릭/노트한도 강제유도가 뭉쳐있었음. 코드에서 `profile`(자발)
/ `note_limit`(강제)로 분리 — **이 변경 이후 이벤트부터만 정확히 구분됨**. 과거 데이터는
`paywall_path_snapshot`/`paywall_path_range_snapshot` SQL의 CASE문으로 "그 유저가 과거에
`project_limit_hit`를 겪은 적 있으면 `note_limit`로 추정" 방식으로 소급 처리(정확한 소급 아님,
추정치).
