# UI & CSS 규칙

## CSS 변수

```css
:root {
  --bg: #ffffff;
  --surface: #ffffff;
  --border: #d9d4cc;
  --text-primary: #1a1714;
  --text-secondary: #6b6560;
  --text-muted: #a09b95;
  --accent: #e03c31;
  --radius: 8px;
  --radius-lg: 14px;
}
```

---

## 애니메이션 표준값

```css
transition: transform .55s cubic-bezier(0.22, 1, 0.36, 1);
```

- 열기와 닫기 항상 동일한 속도·이징
- `.hidden`(`display: none`)은 트랜지션 즉시 차단 → 슬라이드/페이드에 사용 금지
- 대신 `.open` 클래스로 제어:

```css
.my-modal {
  transform: translateY(100%);
  transition: transform .55s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.my-modal.open {
  transform: translateY(0);
  pointer-events: auto;
}
```

---

## 모바일/데스크탑 삭제 버튼 분기

```css
/* 모바일: 항상 표시 */
@media (pointer: coarse) { .delete-btn { display: flex; } }
/* 데스크탑: hover 시 표시 */
@media (hover: hover) and (pointer: fine) { .delete-btn { display: none; } .item:hover .delete-btn { display: flex; } }
```

## 반응형 분기
- 768px: 태블릿
- 480px: 모바일
- 가로 모드 별도 처리

---

## 터치 이벤트 주의사항 (Android)

- `touchstart.preventDefault()` → 이후 합성 `click` 이벤트 억제됨
  → 터치(touchstart→touchend)와 마우스(mousedown→click) 별도 핸들러로 분리
- 버튼에 `touchstart.preventDefault()` 걸어도 상위 `contenteditable`이 포커스 가져가 키보드 뜸
  → `touchstart` 시점에 `linesEl.contentEditable = 'false'` 즉시 비활성화 → 메뉴 닫힐 때 `'true'` 복원

---

## 기타 주의사항

### hidden 클래스 관련
- `display: flex`인 요소에 `.hidden { display: none }` 규칙이 없으면 hidden이 무효화됨
- 새 요소에 `.hidden` 사용 시 반드시 CSS에 명시적으로 선언

### 자식/부모 컨테이너 정렬
- 자식 컨테이너 위치 조정 시 **부모 컨테이너 값 먼저 참조**

### 홈 아이콘 흰 화면 버그 (One UI 7 / Galaxy S25)
- `mipmap-anydpi-v26/ic_launcher.xml`의 `<monochrome>` 레이어 → Samsung 런처 렌더링 실패 시 흰 화면
- 해결: `<monochrome>` 레이어 제거

### Android Google 로그인 "Something went wrong"
- 원인: `tryAutoSignIn()`에서 `GoogleAuth.refresh()` 호출 시 네이티브 작업 충돌
- 해결: `tryAutoSignIn()`에서 `GoogleAuth.refresh()` 완전 제거. GoogleAuth는 `onboardingSignIn()`에서만 호출.

---

## 웹뷰 텍스트 처리

- paste, beforeinput, input, composition 이벤트 모두 고려
- 클립보드 히스토리 경로에서 HTML 유입 방지 → text/plain만 사용
- DOM range.insertNode, innerHTML 직접 삽입 방식 사용 금지
- 붙여넣기: 브라우저 기본 삽입 막고 clipboard에서 plain text 추출 후 삽입
