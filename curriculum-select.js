// ═══════════════════════════════════════════════════════════════
// curriculum-select.js — 커리큘럼 선택 화면 (디자인 단계)
// 홈 책 버튼·시작 안내의 "다른 걸 배우고 싶어요"가 연다. 탑바는 X만.
// 가운데: ‹ 단계(페르소나) › 로 좌우 이동 → 아래에 통기타(코드반주) · 일렉기타(솔로잉) 로티 + 그림자 + 커리큘럼 이름.
// 커리큘럼 이름·열림 범위·고르고 난 뒤의 동작은 아직 미정 — 지금은 자리표시.
// ═══════════════════════════════════════════════════════════════

// 단계별 열림 범위(1차: 언박싱만). 커리큘럼 이름은 shared.js CURRICULUM_NAMES(홈 배너와 같은 원본).
const JCS_STAGES = PERSONA_STAGES.map((key, i) => ({
  key,
  badge: ['badge_1_bronze', 'badge_2_silver', 'badge_3_gold', 'badge_4_diamond', 'badge_5_challenger'][i],
  open: key === 'unboxing',
  names: CURRICULUM_NAMES[key],
}));

// 대표 그림 — 기본은 SVG(안에 CSS 애니메이션 포함: 칩이 둥실, 음표가 차례로 통통).
//   코드반주 = 코드 이름 C·Am·F 칩 / 솔로잉 = 곡선 오선지 위 동요 한 구절
// 같은 이름의 로티 파일(path)을 넣으면 코드 수정 없이 로티가 우선한다. 없으면(404) SVG를 쓴다.
const JCS_ART = {
  comping: { path: 'lottie/course_comping.json', fallback: 'image/course_comping.svg', fallbackClass: '' },
  soloing: { path: 'lottie/course_soloing.json', fallback: 'image/course_soloing.svg', fallbackClass: '' },
};

let _jcsIdx = 0;
let _jcsAnims = [];
let _jcsTimers = [];
let _jcsClosed = false;
let _jcsBusy = false;

function _jcsLater(fn, ms) {
  const id = setTimeout(() => { _jcsTimers = _jcsTimers.filter(t => t !== id); if (!_jcsClosed) fn(); }, ms);
  _jcsTimers.push(id);
}

// 이탈 정리 — 모든 출구(X·pagehide·앱 전환)가 같은 함수를 부른다. 멱등.
function _jcsCleanup() {
  _jcsClosed = true;
  _jcsTimers.forEach(clearTimeout);
  _jcsTimers = [];
  _jcsAnims.forEach(a => { try { a.destroy(); } catch (_) {} });
  _jcsAnims = [];
}

// 어디서 왔는지(?from=intro 면 시작 안내, 그 외는 홈)로 명시적으로 돌아간다.
// history.back()은 쓰지 않는다 — shared.js가 #back-btn이 있는 모든 페이지에 뒤로가기 가드용 더미 history를 쌓아 둬서,
// back()은 이전 페이지가 아니라 그 더미를 되감고 → popstate가 다시 이 함수를 불러 화면에서 못 나가는 루프가 된다.
function closeCurriculumSelect() {
  if (_jcsClosed) return;   // 연타·가드 재호출로 중복 이동 방지
  _jcsCleanup();
  const from = new URLSearchParams(location.search).get('from');
  const dest = from === 'intro' ? 'journey-intro.html' : 'home.html';
  const shell = document.querySelector('.app-shell');
  if (shell) { shell.classList.add('project-exit'); setTimeout(() => { location.href = dest; }, 260); } else location.href = dest;
}

function _jcsMountArt(kind) {
  const box = document.getElementById('jcs-art-' + kind);
  const cfg = JCS_ART[kind];
  const fallback = () => { if (!_jcsClosed) box.innerHTML = `<img class="jcs-art-img ${cfg.fallbackClass}" src="${cfg.fallback}" alt="">`; };
  if (typeof lottie === 'undefined') { fallback(); return; }
  fetch(cfg.path)
    .then(r => { if (!r.ok) throw new Error('no lottie'); return r.json(); })
    .then(data => {
      if (_jcsClosed) return;
      _jcsAnims.push(lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: true, animationData: data }));
    })
    .catch(fallback);
}

function _jcsRender() {
  const st = JCS_STAGES[_jcsIdx];
  document.getElementById('jcs-persona-badge').src = 'image/' + st.badge + '.png';
  document.getElementById('jcs-persona-name').textContent = PERSONA_NAMES[st.key];
  ['comping', 'soloing'].forEach(kind => {
    const el = document.getElementById('jcs-course-' + kind);
    el.dataset.open = st.open ? '1' : '0';
    el.setAttribute('aria-disabled', st.open ? 'false' : 'true'); // 닫힌 단계는 앱 공용 탭 효과음도 건너뛴다
    document.getElementById('jcs-name-' + kind).textContent = st.names[kind]; // 닫힌 단계도 이름은 보인다(흐리게 — CSS data-open=0)
  });
  document.getElementById('jcs-courses').classList.toggle('is-soon', !st.open);
  document.getElementById('jcs-prev').disabled = _jcsIdx === 0;
  document.getElementById('jcs-next').disabled = _jcsIdx === JCS_STAGES.length - 1;
}

// 단계 이동: 아래 두 코스를 옆으로 살짝 밀며 바꾼다(바깥으로 → 내용 교체 → 반대편에서 들어옴)
function jcsMove(dir) {
  const next = _jcsIdx + dir;
  if (_jcsBusy || next < 0 || next >= JCS_STAGES.length) return;
  _jcsBusy = true;
  const wrap = document.getElementById('jcs-courses');
  wrap.style.setProperty('--jcs-shift', (-dir * 24) + 'px');
  wrap.classList.add('jcs-swap-out');
  _jcsLater(() => {
    _jcsIdx = next;
    _jcsRender();
    wrap.style.setProperty('--jcs-shift', (dir * 24) + 'px');
    wrap.classList.remove('jcs-swap-out');
    wrap.classList.add('jcs-swap-pre');
    void wrap.offsetWidth;
    wrap.classList.remove('jcs-swap-pre');
    _jcsLater(() => { _jcsBusy = false; }, 180);
  }, 140);
}

// 코스를 눌렀을 때: 지금 걷는 코스로 저장하고 돌아간다. 확인창·코스 시작 등 이후 흐름은 정해지면 여기에 붙인다.
function jcsPick(kind) {
  const st = JCS_STAGES[_jcsIdx];
  if (!st.open) return;                       // 준비 중인 단계는 고를 수 없다
  setCurrentCurriculum(st.key, kind);         // 홈 배너의 커리큘럼 이름이 이 값을 따라간다
  if (typeof analytics !== 'undefined') analytics.track('journey_selected', { kind: kind, stage: st.key, entry: 'book', user_persona: getUserPersona() });   // 분석: 책 아이콘으로 과정 전환
  closeCurriculumSelect();                    // 고른 뒤 처음 온 곳(홈/시작 안내)으로 돌아간다 — 확정 흐름은 아직 미정(임시)
}

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');
  lucide.createIcons();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  // 이탈: 어느 경로로 나가든 로티·타이머를 멈춘다
  window.addEventListener('pagehide', _jcsCleanup);

  _jcsIdx = Math.max(0, PERSONA_STAGES.indexOf(getUserPersona())); // 내 단계에서 시작
  _jcsRender();
  _jcsMountArt('comping');
  _jcsMountArt('soloing');
});
