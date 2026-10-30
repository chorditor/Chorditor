// ═══════════════════════════════════════════════════════════════
// attendance.js — 오늘의 미션 + 출석 통합 페이지 (2026-10-31)
//   미션 진행·완료 판정·출석 도장은 shared.js 일일 미션 블록(dmLoad / dailyMissionReport / dmEnsureAttended).
//   이 페이지는 보여주고 훈련 페이지로 보내기만 한다 — 도장은 미션 2개 완료 시점에 이미 찍혀 있고, 여기선 그 연출을 보여준다.
// ═══════════════════════════════════════════════════════════════

// ── 오늘의 미션 4개 (화면 순서) ─────────────────────────────────
// page = 해당 훈련의 레벨 선택 화면. tone = 카드 배경 파스텔(style.css .dm-mission--*, 코드맞추기 파랑·스케일 빨강·리하모니 보라 — 옛 게이트 카드 색 순서와 동일)
const DM_MISSION_LIST = [
  { id: 'quiz',  name: '코드맞추기',      page: 'chord-name-quiz.html', tone: 'blue'   },
  { id: 'scale', name: '스케일 훈련',     page: 'scale-training.html',  tone: 'red'    },
  { id: 'combo', name: '리하모니 화성학', page: 'chord-combo.html',     tone: 'purple' },
  { id: 'play',  name: '코드반주 훈련',   page: 'chordplay.html',       tone: 'green'  },
];

// 첫 접속(onboarding.js goToHome)으로 열렸는가 — 닫기가 X, 오늘 이미 출석했으면 건너뜀
const _attFromLaunch = new URLSearchParams(location.search).get('from') === 'launch';

// ── 닫기 (홈으로 복귀) ────────────────────────────────────────
function closeAttendancePage() {
  _playTap();
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.add('project-exit');
    setTimeout(() => { location.href = 'home.html'; }, 260);
  } else {
    location.href = 'home.html';
  }
}

// ── 미션 목록 ─────────────────────────────────────────────────
function _dmFmtSec(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// 훈련별 조건 문구 — 시작 레벨이 1이면 "아무 레벨"
function _dmCondText(id, state) {
  if (id === 'play') return '주법 재생 5분 · ' + _dmFmtSec(Math.min(state.play || 0, DM_PLAY_GOAL_SEC)) + ' / ' + _dmFmtSec(DM_PLAY_GOAL_SEC);
  const min = dmMinLevel(id);
  if (min <= 1) return '아무 레벨 1회';
  return id === 'combo' ? min + '-1 이상 레벨 중 1회' : '레벨 ' + min + ' 이상 중 1회';
}

function renderMissions() {
  const list = document.getElementById('dm-missions');
  if (!list) return;
  const s = dmLoad();
  list.innerHTML = DM_MISSION_LIST.map(m => {
    const done = !!s.done[m.id];
    const bar = m.id === 'play'
      ? '<span class="dm-mission-bar"><span style="width:' + (done ? 100 : Math.min(100, Math.round((s.play || 0) / DM_PLAY_GOAL_SEC * 100))) + '%"></span></span>'
      : '';
    const tail = done
      ? '<span class="dm-mission-done"><i data-lucide="circle-check"></i>완료</span>'
      : '<button type="button" class="dm-mission-go" onclick="dmGo(\'' + m.id + '\')">바로가기<i data-lucide="chevron-right"></i></button>';
    return '<li class="dm-mission dm-mission--' + m.tone + '">' +
        '<div class="dm-mission-info">' +
          '<span class="dm-mission-name">' + m.name + '</span>' +
          '<span class="dm-mission-cond">' + _dmCondText(m.id, s) + '</span>' +
          bar +
        '</div>' +
        tail +
      '</li>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function dmGo(id) {
  const m = DM_MISSION_LIST.find(x => x.id === id);
  if (!m) return;
  _playTap();
  location.href = m.page;
}

// ── 출석 달력 (실제 DB값 — shared.js loadAttendanceState()/_attState 기준) ──
// 도장은 미션 2개를 끝낸 시점에 shared.js dmEnsureAttended()가 이미 찍었다. 그 연출(stamp)이 아직 안 보여졌으면
// 도장 직전 상태로 그려 두고 _dmPlayStamp()가 그 칸에 도장을 내려찍는다. 그 외에는 조회 전용.
let _attDoneToday = false;
let _attInfo = null;   // loadAttendanceState() 결과(보충출석 안내 문구용)

function renderAttendanceStatus() {
  const el = document.getElementById('attendance-status');
  if (!el) return;
  const n = dmDoneCount(dmLoad());
  el.textContent = _attDoneToday ? '오늘은 출석을 완료했어요'
    : (n >= 1 ? (DM_REQUIRED - n) + '개만 더 완료하면 출석해요' : '아직 오늘 출석을 못했어요');
  el.classList.toggle('dm-att-status--done', _attDoneToday);

  const hint = document.getElementById('dm-att-hint');
  if (hint) {
    let t = '';
    if (_attInfo && !_attInfo.full) {
      if (_attInfo.makeup_left > 0) t = '이번 달 아무 때나 ' + _attInfo.makeup_left + '회 더 보충출석할 수 있어요';
      else if (_attInfo.canMakeupAd) t = '보충출석 3회를 다 썼어요. 광고를 보면 1칸씩 더 채울 수 있어요';
      else t = '이번 달 보충출석을 모두 썼어요';
    }
    hint.textContent = t;
  }
}

function renderAttendanceMonth() {
  const el = document.getElementById('attendance-month');
  if (!el) return;
  const kstMonth = new Date(Date.now() + 9 * 3600000).getUTCMonth() + 1;
  el.textContent = kstMonth + '월 출석';
}

// 보충출석(2026-10-31 개편): 항상 보이는 버튼. 일일 제한 없이 그 달 아무 때나 3회(정규출석을 한 날도 가능).
// 3회를 다 쓰면 버튼이 "광고 보고 보충출석"으로 바뀌어 광고를 끝까지 보면 1칸씩 채움. Pro는 광고가 없어 3회까지만.
// 상태는 loadAttendanceState()의 canMakeup / canMakeupAd — _attInfo에 담김.
function renderAttendanceMakeup() {
  const btn = document.getElementById('attendance-makeup-btn');
  const labelEl = document.getElementById('attendance-makeup-label');
  const countEl = document.getElementById('attendance-makeup-count');
  if (!btn || !_attInfo) return;
  const byAd = _attInfo.makeup_left <= 0 && _attInfo.canMakeupAd;
  btn.disabled = !(_attInfo.canMakeup || byAd);
  if (labelEl) labelEl.textContent = byAd ? '광고 보고 보충출석' : '보충출석';
  if (countEl) { countEl.hidden = byAd; countEl.textContent = _attInfo.makeup_left; }
}

function showAttendanceFullModal() {
  document.getElementById('attendance-full-modal-overlay')?.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeAttendanceFullModal() {
  _playConfirmSfx();
  document.getElementById('attendance-full-modal-overlay')?.classList.add('hidden');
}

// 이미 떠있는 달력의 해당 칸에 직접 도장을 찍는다 — mission-session.js _msRunStampFlow()와
// 동일 CSS(.acc-cell--done/.acc-stamp/.acc-cell--animate, stamp-press 키프레임)·타이밍
// (STAMP_ANIM_MS=1100ms, STAMP_IMPACT_OFFSET_MS=700ms) 재사용. 모달 없이 그 자리에서 연출.
function _attAnimateStamp(day) {
  return new Promise(resolve => {
    const grid = document.getElementById('attendance-cal-grid');
    const cell = grid?.querySelector(`.acc-cell[data-day="${day}"]`);
    if (!cell || cell.classList.contains('acc-cell--done')) { resolve(); return; }
    cell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    cell.classList.add('acc-cell--done');
    const stamp = document.createElement('span');
    stamp.className = 'acc-stamp';
    stamp.innerHTML = '<i data-lucide="guitar"></i>';
    cell.appendChild(stamp);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    cell.classList.add('acc-cell--animate');
    if (typeof _playSfx === 'function') setTimeout(() => _playSfx('stamp.mp3'), STAMP_IMPACT_OFFSET_MS);
    setTimeout(resolve, STAMP_ANIM_MS);
  });
}

// 보여주지 않은 도장 연출(미션 완료 직후 훈련 페이지에서 돌아온 경우) — 한 번만
function _dmPendingStamp() {
  const st = dmLoad().stamp;
  return st && !st.seen ? st : null;
}
async function _dmPlayStamp(p) {
  const s = dmLoad();
  if (s.stamp) { s.stamp.seen = true; dmSave(s); }   // 연출 도중 나가도 다시 재생하지 않음
  if (p.advanced) await _attAnimateStamp(p.day);
  _attDoneToday = true;
  const state = await loadAttendanceState();
  _attInfo = state;
  renderAttendanceStatus();
  renderAttendanceMakeup();
  if (p.advanced && p.reward > 0) showPeakboxRewardModal(p.reward, undefined, { source: 'attendance_milestone' });   // 5일 배수 피크상자 획득 연출(지급은 advanceAttendance가 이미 함)
}

// 보충출석 클릭 → 남은 횟수가 있으면 shared.js makeupAttendance(), 3회를 다 썼으면 광고 시청 후 makeupAttendanceByAd().
// 성공하면 그 자리에서 도장 연출 → 재렌더. 마일스톤(피크상자) 획득 팝업은 shared.js makeupAttendance()가 자체 딜레이로 이미 띄워준다.
// 정규출석과 별개 트랙이라(같은 날 정규출석 여부는 안 건드림) 성공해도 _attDoneToday는 안 바꾼다.
async function attendanceMakeupClick() {
  const btn = document.getElementById('attendance-makeup-btn');
  if (btn) btn.disabled = true;
  const res = (_attInfo && _attInfo.makeup_left > 0) ? await makeupAttendance(false) : await makeupAttendanceByAd();
  if (!res || !res.ok) {
    if (res && res.reason === 'full') showAttendanceFullModal();
    else if (res && res.reason === 'ad_not_rewarded' && typeof showTextToast === 'function') showTextToast('광고를 끝까지 봐야 채워져요');
    else if (res && res.reason === 'network' && typeof showTextToast === 'function') showTextToast('보충출석에 실패했어요. 다시 시도해주세요.');
    renderAttendanceMakeup(); // 실패해도 버튼 상태는 _attInfo 기준으로 다시 계산
    return;
  }

  _playConfirmSfx();
  await _attAnimateStamp(res.day);
  const state = await loadAttendanceState(); // canMakeup 등 최신 상태 재조회
  _attInfo = state;
  _attDoneToday = state.doneToday;
  renderAttendanceStatus();
  renderAttendanceMakeup();
}

// stamped = 화면에 도장이 찍힌 상태로 보일 칸 수(연출 전이면 오늘 도장 직전까지)
function renderAttendanceCalendar(stamped) {
  const grid = document.getElementById('attendance-cal-grid');
  if (!grid) return;

  const today = _attDoneToday ? stamped : Math.min(stamped + 1, ATTENDANCE_TOTAL_DAYS); // 오늘 칸
  const boxSvg = '<img src="image/gift.png" class="acc-box-icon" alt="">';

  let html = '';
  for (let d = 1; d <= ATTENDANCE_TOTAL_DAYS; d++) {
    const done      = d <= stamped;
    const milestone = ATTENDANCE_MILESTONES[d];
    const cls = ['acc-cell'];
    if (done) cls.push('acc-cell--done');
    if (milestone) cls.push('acc-cell--milestone');
    if (d === today) cls.push('acc-cell--today');
    const base = milestone
      ? boxSvg + '<span class="acc-box-count">' + milestone + '</span>'
      : '<span class="acc-day-num">' + d + '</span>';
    const inner = base + (done ? '<span class="acc-stamp"><i data-lucide="guitar"></i></span>' : '');
    html += '<div class="' + cls.join(' ') + '" data-day="' + d + '">' + inner + '</div>';
  }
  grid.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const todayEl = grid.querySelector('.acc-cell--today');
  if (todayEl) {
    requestAnimationFrame(() => {
      const target = todayEl.offsetLeft - (grid.clientWidth / 2) + (todayEl.offsetWidth / 2);
      grid.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
    });
  }

  initGridMouseDrag(grid);
}

// 데스크탑 마우스 드래그로도 가로스크롤 가능하게 (터치는 overflow-x:auto가 기본 처리)
function initGridMouseDrag(grid) {
  if (grid._dragInit) return;
  grid._dragInit = true;
  let dragging = false, startX = 0, startScroll = 0;

  grid.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    startX = e.clientX;
    startScroll = grid.scrollLeft;
    grid.classList.add('attend-cal-grid--dragging');
  });
  grid.addEventListener('pointermove', e => {
    if (!dragging) return;
    grid.scrollLeft = startScroll - (e.clientX - startX);
  });
  const endDrag = () => { dragging = false; grid.classList.remove('attend-cal-grid--dragging'); };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointerleave', endDrag);
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  const shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('project-enter');

  if (_attFromLaunch) {
    // 첫 접속: 닫기는 X. 오늘 이 페이지를 한 번 보여줬다고 기록(onboarding.js goToHome 판정용 — 날짜 형식 그대로)
    document.getElementById('dm-back-icon')?.setAttribute('data-lucide', 'x');
    try { localStorage.setItem('chorditor_dm_cleared_date', new Date().toISOString().slice(0, 10)); } catch (_) {}
  }
  lucide.createIcons();

  // 관리자 전용 진단: 제목을 1.5초 길게 누르면 서버 동기화 응답을 알림으로 보여줌(콘솔 없이 앱에서 확인용)
  if (typeof _isAdminUser === 'function' && _isAdminUser()) {
    const ttl = document.querySelector('#attendance-page .cd-title');
    let pressTimer = null;
    if (ttl) {
      ttl.addEventListener('pointerdown', () => { pressTimer = setTimeout(async () => { alert(await dmDebugSync()); }, 1500); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ttl.addEventListener(ev, () => clearTimeout(pressTimer)));
    }
  }

  await dmSyncPersona();      // 티어(시작 레벨)가 페르소나로 정해지므로 가장 먼저 — 새 기기·승급 직후 낡은 로컬 값 방지
  await dmSyncServer();       // 서버의 오늘 진행도와 합침(재설치·다른 기기) — 합친 결과로 미션 2개면 여기서 도장도 찍음
  await dmEnsureAttended();   // 미션을 이미 끝냈는데 도장이 안 찍혔다면(보고 도중 앱이 꺼진 경우 등) 여기서 찍음
  const state = await loadAttendanceState();
  const pending = _dmPendingStamp();

  // 첫 접속인데 오늘 출석을 이미 마쳤다면(연출도 이미 봤다면) 이 페이지를 건너뜀
  if (_attFromLaunch && state.doneToday && !pending) { location.replace('home.html'); return; }

  _attInfo = state;
  _attDoneToday = pending ? false : state.doneToday;   // 연출 전엔 아직 출석 전으로 보여줌
  const stampedShown = pending ? pending.day - (pending.advanced ? 1 : 0) : state.day;

  renderMissions();
  renderAttendanceMonth();
  renderAttendanceCalendar(stampedShown);
  renderAttendanceStatus();
  renderAttendanceMakeup();

  const cover = document.getElementById('page-cover');
  if (cover) {
    requestAnimationFrame(() => {
      cover.classList.add('cover-out');
      setTimeout(() => { cover.style.display = 'none'; }, 200);
    });
  }

  if (pending) setTimeout(() => { _dmPlayStamp(pending); }, 600);   // 페이지가 보인 뒤 도장 연출
});
