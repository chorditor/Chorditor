# 프로젝트 아키텍처

## 개요
기타 코드(Guitar Chord) 제작 및 관리 도구. 웹 + Android(Capacitor) 크로스플랫폼.

- **앱 ID:** `com.chorditor.app`
- **앱명:** Chorditor
- **기술 스택:** Vanilla JS (ES6+) · HTML5 Canvas · Web Audio API · Capacitor 8 · Gradle
- **외부 라이브러리:** Lucide(아이콘, CDN), Pretendard(폰트, CDN) — 프레임워크 없음

---

## 파일 구조

```
Chords_editor/
├── app.js              # 메인 로직 전체 (~5000줄)
├── index.html          # 단일 HTML 파일
├── style.css           # 전체 스타일
├── analytics-sdk.js    # Analytics 클라이언트 SDK (AnalyticsSDK 클래스)
├── chord-voicings.js   # 보이싱 데이터 원본 (⛔ Claude 수정 금지)
├── chords-library.js   # 보이싱 파서 + 라이브러리 빌더
├── voicing-library.js  # 추가 보이싱 라이브러리
├── watch.js            # 파일 감시 유틸
├── privacy.html        # 개인정보처리방침
├── www/                # 빌드 출력 (app.js / index.html / style.css 복사본)
├── android/            # Android Studio 프로젝트
│   ├── app/src/main/assets/public/   # ← 앱 배포 파일 위치
│   └── variables.gradle              # compileSdk / targetSdk 버전 관리
├── supabase/
│   └── functions/revenuecat-webhook/ # RC 웹훅 Edge Function
├── docs/               # CLAUDE.md 분리 문서
└── capacitor.config.json
```

---

## 전역 상태 변수 (app.js)

```js
let currentProjectId = null;   // 현재 열린 프로젝트
let contextProjectId = null;   // 컨텍스트 프로젝트
let isEditMode = true;         // 편집모드 기본값
let playbackActive = false;    // 재생 모드 여부
let currentColCount = 4;       // 슬롯 열 수 (4 or 8)
```

---

## 주요 함수 참조

| 함수 | 역할 |
|------|------|
| `drawCanvas(c, ratio, data)` | 기타 코드 캔버스 렌더링 |
| `buildChordName(data)` | 코드명 문자열 생성 |
| `strumChord()` | 코드 음성 재생 |
| `navigateTo(view, projectId)` | 뷰 전환 (에디터 ↔ 프로젝트) |
| `renderProjectView(projectId)` | 프로젝트 상세뷰 렌더링 |
| `buildChordArea(line, project, editMode)` | 코드 슬롯 영역 생성 |
| `buildThumbList(project, editMode)` | 썸네일 리스트 생성 |
| `setupThumbTouchDrag(thumb, chord, projectId)` | 모바일 썸네일 터치/드래그 |
| `placeChordInSlot(projectId, rowId, slotIdx, chordId)` | 슬롯에 코드 배치/삭제 |
| `deleteChordFromProject(projectId, chordId)` | 프로젝트에서 코드 삭제 |
| `reRenderChordArea(lineId, line, project)` | 코드 영역 부분 재렌더링 |
| `tryAutoSignIn()` | 앱 시작 시 세션 복원 |
| `handleStart()` | 시작하기 버튼 핸들러 |
| `checkAndShowNotice()` | 공지 팝업 표시 |

---

## 주요 기능 영역

### 1. 코드 에디터
- 코드명 빌더: 근음 + 3화음(M/m/aug/dim) + 7음 + 기능음(sus4/add9/b5) + 텐션 + 분수코드
- Canvas 기반 기타 핑거링 입력 (6현 4프렛)
- Karplus-Strong 알고리즘으로 Web Audio API 기타 음성 합성
- PNG 내보내기 (x0.5 / x1 / x2 / x3)

### 2. 프로젝트 관리
- 여러 프로젝트 → 각 프로젝트 내 라인(가사) + 코드 슬롯(4 or 8열)
- 코드 썸네일 리스트: 드래그로 순서 변경, 슬롯으로 드롭
- LocalStorage 기반 저장

### 3. 코드 라이브러리
- 화성학 이론 기반 기타 코드 보이싱 사전 (읽기 전용)
- 상세 내용: `docs/library.md` 참고

### 4. 모바일(Android) 특화
- 터치 기반 thumb 드래그: 이동 8px 초과 시 드래그 모드
- `contextmenu` 이벤트 차단 (Android 길게 누르기 오동작 방지)
