// ═══════════════════════════════════════════════════════════════
// tutorial-content.js — 튜토리얼 모달 본문 (문구 관리 전용)
// 문구 수정은 이 파일만 편집하면 됨. home.html #tutorial-body 에 주입됨.
// ───────────────────────────────────────────────────────────────
//  구조: 섹션 블록(접기/펼치기) + 구분선
//   - tutorial-section-header(onclick=toggleUpdateSection) → 접기 토글
//   - tutorial-update-title : 최신 업데이트 소식 제목(home.js에서도 설정)
// ═══════════════════════════════════════════════════════════════

window.TUTORIAL_BODY_HTML = `
  <!-- 업데이트 섹션 -->
  <div class="tutorial-section-block">
    <div class="tutorial-section-header open" onclick="toggleUpdateSection(this)">
      <h3 class="tutorial-section-title" id="tutorial-update-title">최신 업데이트 소식</h3>
      <i data-lucide="chevron-down" class="tutorial-section-arrow"></i>
    </div>
    <div class="tutorial-update-body">
      <div class="tutorial-update-content">
        <p class="tutorial-update-text">&nbsp;코디터가 '누구나 언제 어디서나 기타를 즐기는 세상'이라는 슬로건으로 완전히 새롭게 돌아왔습니다!<br><br>&nbsp;다양한 도구, 훈련 기능, 레슨 등의 콘텐츠로 방구석이든 공원이든 언제 어디서나 친근한 기타 앱으로서의 성장을 목표로 나아가고 있습니다.앞으로의 코디터 기대해 주세요!</p>
        <ul class="tutorial-update-list">
          <li>주법 리듬 훈련 컨텐츠 개방</li>
          <li>스케일 훈련 Ch.3 개방</li>
          <li>코드 재생 시 기본 드럼 비트 삽입</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="tutorial-divider"></div>

  <!-- 개발자의 한 마디 섹션 -->
  <div class="tutorial-section-block">
    <div class="tutorial-section-header open" onclick="toggleUpdateSection(this)">
      <h3 class="tutorial-section-title">개발자의 한 마디</h3>
      <i data-lucide="chevron-down" class="tutorial-section-arrow"></i>
    </div>
    <div class="tutorial-update-body">
      <div class="tutorial-update-content">
        <p class="tutorial-update-text">&nbsp;코디터에 오신 걸 진심으로 환영합니다! 누구나 기타를 쉽게 배우고, 배움이 부담스러워서 포기하시는 분들에게도 기타의 즐거움을 알려주고 싶어서 코디터 개발을 기획하게 되었습니다.<br><br>&nbsp;아직은 기능적으로, 디자인적으로 부족하지만 여러분께 최고의 기타 앱으로 기억되도록 노력하겠습니다.</p>
      </div>
    </div>
  </div>

  <div class="tutorial-divider"></div>

  <!-- 코디터 간단 설명서 섹션 -->
  <div class="tutorial-section-block">
    <div class="tutorial-section-header open" onclick="toggleUpdateSection(this)">
      <h3 class="tutorial-section-title">코디터 간단 설명서</h3>
      <i data-lucide="chevron-down" class="tutorial-section-arrow"></i>
    </div>
    <div class="tutorial-update-body">
      <div class="tutorial-update-content">

        <h4 class="tutorial-section">코드 에디터</h4>
        <p class="tutorial-update-text">&nbsp;이제 프랫보드의 운지를 변경하면 즉시 가장 알맞은 코드명으로 변경됩니다! 상단에는 해당 코드의 추천명이 뜰 텐데, 보통 1~2개만 뜰 때는 직접 입력해 둔 코드이기 때문에 안심하셔도 됩니다. 하지만 추천명이 여러 개가 뜬다면 그 코드명은 정확하지 않을 가능성이 높습니다. 앞으로 세상의 모든 코드 이름이 정확하게 표기될 수 있도록 개선할 것입니다.</p>
        <p class="tutorial-update-text">&nbsp;휠피커는 이론적으로 코드가 만들어지는 순서라고 생각하셔도 됩니다. 각 기능에 어떤 법칙이 숨어 있는지는 앞으로의 레슨을 기대해 주세요!</p>
        <p class="tutorial-update-text">&nbsp;만들어진 코드는 재생해서 들어볼 수 있고, 이미지로 저장해서 여러 가지 용도로 활용하실 수 있습니다. 손바닥 아이콘으로 손가락 번호를 지정해 연습에 활용하실 수도 있습니다. 영상 제작에 활용하셔도 되고 개인 자료로 활용하셔도 좋습니다. 마음껏 사용해 주세요!</p>
        <p class="tutorial-update-text">&nbsp;프로젝트를 만드셨다면 (혹은 만드실 때) 에디터에서 작성한 코드를 그대로 프로젝트로 가져올 수 있습니다. 프로젝트에서도 편집 시 언제든지 에디터로 수정할 수 있습니다.</p>

        <h4 class="tutorial-section">코드 사전</h4>
        <p class="tutorial-update-text">&nbsp;거의 모든 코드가 담겨 있는 코드 사전입니다. 화성학 이론과 경험을 바탕으로 기타에서 잡을 수 있는 거의 모든 코드를 탑재할 것입니다. 이미 충분한 양의 코드를 탑재하였기 때문에 코드가 문제 되는 일은 없을 것입니다!</p>

        <h4 class="tutorial-section">프로젝트</h4>
        <p class="tutorial-update-text">&nbsp;만든 코드를 팔레트에 모아두세요. 그리고 나만의 연습장을 만드세요. 매번 프랫보드에 한 땀 한 땀 점을 찍는 일은 안 하셔도 됩니다. 4칸/8칸 모드, 카포, BPM을 설정한 후 재생하면서 연습하실 수 있습니다!</p>
        <ul class="tutorial-update-list">
          <li>4칸 모드 : 한 슬롯 당 1마디</li>
          <li>8칸 모드 : 한 슬롯 당 1/2마디</li>
        </ul>
        <p class="tutorial-update-text">&nbsp;텍스트에 노래 가사 또는 코드 설명을 작성해서 자유롭게 활용하시면 됩니다. 이렇게 만든 프로젝트는 공유 코드로 지인들과 공유할 수 있습니다. <br><br>&nbsp;단, 제목이나 텍스트 내용은 공유되지 않습니다. 노래 저작권 문제로 해당 내용은 공유에서 제외됩니다. (앞으로 코디터가 성장해서 저작권을 취득하고 더욱 풍성한 콘텐츠를 제공할 수 있도록 여러분의 많은 관심 부탁드립니다!)</p>

        <h4 class="tutorial-section">훈련소 / 나의 기타 여정</h4>
        <p class="tutorial-update-text">&nbsp;'훈련소'에서는 지루한 반복 학습을 재미있게 할 수 있는 여러 가지 훈련 콘텐츠가 제공됩니다.</p>
        <p class="tutorial-update-text">&nbsp;'나의 기타 여정'에서는 코디터만의 커리큘럼으로 여러분이 자연스럽게 기타 실력을 향상해 가는 레슨 콘텐츠를 기획하고 있습니다. 자연스럽게 따라만 하면 나도 모르게 중·고급 화성학을 연주할 수 있는 여정이 될 것입니다. 기대해 주세요!</p>

      </div>
    </div>
  </div>
`;

// 본문 주입 (home.js DOMContentLoaded UI 초기화에서 호출)
function renderTutorialBody() {
  const el = document.getElementById('tutorial-body');
  if (!el || !window.TUTORIAL_BODY_HTML) return;
  el.innerHTML = window.TUTORIAL_BODY_HTML;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
