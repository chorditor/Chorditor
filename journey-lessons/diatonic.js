// ───────────────────────────────────────────────────────────
// 여정 노드: 다이어토닉 코드의 이해 (코드반주 D13)
//   리하모니 화성학 1장 강의(chord-combo-lecture.js STEPS_CH1)를 그대로 옮기고 문구만 노드1~12 흐름에 맞춤(2026-11-17 사용자 지정).
//   무대 = 리하모니 1장과 같은 7열 격자(.lec-grid — 코드명 → 번호 → 음 3줄 + 가사), 연출·소리도 원본 그대로.
//   바뀐 곳(학습자 시선 — CLAUDE.md 0-5):
//     · 음이름(A~G)·C 메이저스케일은 D2에서 배움 → 원본의 '라 = A / A~G 7개 / 도 = C' 세 단계를 'C 메이저스케일 기억나시죠? → 음이름으로는 C D E F G A B'로 줄임
//     · 1·3·5번째 음을 쌓는 원리(트라이어드)·dim은 D12에서 배움 → 쌓기를 'C코드를 만든 방법을 모든 음에서'로 이어받고, Bdim에 '지난 시간에 배운 dim'
//     · 작은 별은 D5·D8에서 연주함 → '앞에서 연주했던 작은 별'
//     · 마지막 안내는 퀴즈(C key만) 안내로
//   퀴즈 = 리하모니 1-1 레벨(C key)과 같은 두 유형: 연결형(코드 이름 ↔ 도수) + 빈칸형(4코드 진행의 한 칸, 20%는 반대 = 도수). 문제 수 10/15/20, 별 2·3은 D key 10%·25%(사용자 지정)
// ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  const J = window.JourneyLesson;
  const $ = J.$, em = J.em, fx = J.fx, wait = J.wait, later = J.later;
  const FADE_MS = J.FADE_MS, SPREAD_MS = 500;   // 음이 줄어들며 열이 벌어지는 전환(엔진 --lec-spread와 같은 값)

  // ── 소리 데이터(리하모니 1장과 같음) ──
  const SCALE_MIDI = [48, 50, 52, 53, 55, 57, 59, 60];   // 5번줄 3프렛 C3부터 한 옥타브
  const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];          // 6→1번줄
  const VOICINGS = {   // 오픈 보이싱(줄 6→1, -1 = 안 침) — 퀴즈 빈칸형 진행 소리도 이것으로
    C: [-1, 3, 2, 0, 1, 0], Dm: [-1, -1, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0], F: [1, 3, 3, 2, 1, 1],
    G: [3, 2, 0, 0, 0, 3], Am: [-1, 0, 2, 2, 1, 0], Bdim: [-1, 2, 3, 4, 3, -1],
  };
  function fretsToMidis(frets) { const out = []; frets.forEach(function (f, i) { if (f >= 0) out.push(OPEN_STRINGS[i] + f); }); return out; }
  const C_NAMES = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'];
  const D_NAMES = ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'];
  const ROMANS = ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VIIdim'];
  const ROWS = { 1: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 2: ['E', 'F', 'G', 'A', 'B', 'C', 'D'], 3: ['G', 'A', 'B', 'C', 'D', 'E', 'F'] };
  const D_ROWS = { 1: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], 2: ['F#', 'G', 'A', 'B', 'C#', 'D', 'E'], 3: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'] };
  function romanHtml(r) { const m = /^([IV]+)(.*)$/.exec(r); return m[1] + (m[2] ? '<span class="lec-rq">' + m[2] + '</span>' : ''); }   // 'VIIdim' → VII 크게 + dim 작게

  // 작은 별 — 80 BPM, 코드는 기타(약하게) · 멜로디는 피아노. 가사 한 글자 = 멜로디 한 음(리하모니 1장과 같음)
  const SONG_BEAT = 60 / 80;
  const SONG_CHORDS = [['C', 0, 4], ['F', 4, 2], ['C', 6, 2], ['F', 8, 2], ['C', 10, 2], ['G', 12, 2], ['C', 14, 2]];
  const SONG_MELODY = [[60, 0, 1], [60, 1, 1], [67, 2, 1], [67, 3, 1], [69, 4, 1], [69, 5, 1], [67, 6, 2],
                       [65, 8, 1], [65, 9, 1], [64, 10, 1], [64, 11, 1], [62, 12, 1], [62, 13, 1], [60, 14, 2]];
  const SONG_SYL = ['반', '짝', '반', '짝', '작', '은', '별', '아', '름', '답', '게', '비', '치', '네'];
  const SONG_AFTER = { 3: ' ', 5: ' ', 6: '\n', 10: ' ' };
  const SONG_COL = { C: 0, F: 3, G: 4 };
  const SONG_BEATS = 16;
  const SONG_GUITAR_TRIM = 0.3, SONG_PIANO_GAIN = 1.4;   // 리하모니·D5와 같은 균형(칸이 끝나면 엔진이 되돌림)

  // ── 무대(리하모니 1장 buildStage와 같은 구조) ──
  function q(sel) { return Array.prototype.slice.call(document.querySelectorAll('#combo-v2-lec-stage ' + sel)); }
  function grid() { return $('lec-grid'); }
  function cols() { return q('#lec-grid .lec-col'); }
  function rowOf(row) { return q('#lec-grid .lec-note[data-row="' + row + '"]'); }
  function allNotes() { return rowOf(1).concat(rowOf(2), rowOf(3)); }
  function nums() { return q('#lec-grid .lec-num'); }
  function names() { return q('#lec-grid .lec-name'); }
  function hot(i) {   // 지금 울리는 열만 파랑(번호·코드명), 나머지는 흐리게. i < 0이면 해제
    const g = grid();
    if (!g) return;
    g.classList.toggle('is-playing', i >= 0);
    cols().forEach(function (c, j) { c.classList.toggle('is-hot', j === i); });
  }
  function build(stage) {
    stage.classList.add('is-jny', 'n13-stage');   // 무대 220px(다른 노드와 같음) — 가사 간격만 이 노드 전용(.n13-stage)
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.warmupPiano) GuitarAudio.warmupPiano();   // 작은 별 멜로디 피아노 샘플을 미리
    let colHtml = '';
    for (let i = 0; i < 7; i++) {
      colHtml += '<div class="lec-col"><span class="lec-name">&nbsp;</span><span class="lec-num">&nbsp;</span><div class="lec-stack">' +
        '<span class="lec-note" data-row="1">&nbsp;</span><span class="lec-note" data-row="2">&nbsp;</span><span class="lec-note" data-row="3">&nbsp;</span>' +
        '</div></div>';
    }
    stage.innerHTML = '<div class="lec-grid" id="lec-grid">' + colHtml + '</div><div class="lec-lyrics" id="lec-lyrics">&nbsp;<br>&nbsp;</div>';
  }
  function none() { return Promise.resolve(); }

  // ── 단계 — 칸 하나 = 멈춤 지점. 각 칸의 "핵심"(새 내용 / 배운 것의 복습·적용)은 주석 ──
  //  강의 최종 목적: C key 다이어토닉 코드 7개의 이름 ↔ 로마숫자 도수를 외움(퀴즈). key가 바뀌어도 번호는 그대로라는 것
  // 솔로연주 비기너 D21(2026-11-23 — docs/solo-beginner-curriculum.md): 솔로 과정의 마지막 노드. 작은 별을 친 적이 없고 dim은 D19에서 배움 — 그 두 문구와 마무리(축하·승급)만 다름
  const SOLO = /[?&]course=soloing/.test(location.search);
  const steps = [
    // P1 스케일과 도수
    // 0 핵심(복습 — D2): 출발점 = C 메이저스케일. 도레미가 울리고 음이름으로 바뀜. 끝 화면 = C D E F G A B
    J.chainSteps([
      { text: '이번 시간에는 ' + em('다이어토닉 코드') + '를\n배워볼게요!', run: none },
      { text: em('C 메이저스케일') + ' 기억나시죠?', ms: 5160, run: function () {   // ms = 측정값(scripts/journey-lesson-timing.js)
        const els = rowOf(1), STEP = 420, syl = ['도', '레', '미', '파', '솔', '라', '시'];
        els.forEach(function (el, i) { el.textContent = syl[i]; });
        grid().classList.add('is-quick');
        return fx(els, 'is-in', true).then(function () { return wait(300); }).then(function () {
          const t0 = J.audioT0(), lead = J.leadMs();
          els.forEach(function (el, i) {
            J.note(SCALE_MIDI[i], t0 + i * STEP / 1000, STEP / 1000, 0.18);
            later(function () { if (i > 0) els[i - 1].classList.remove('is-focus'); el.classList.add('is-focus'); }, lead + i * STEP);
          });
          J.note(SCALE_MIDI[7], t0 + 7 * STEP / 1000, 1.2, 0.8);
          later(function () { els[6].classList.remove('is-focus'); els[0].classList.add('is-focus'); }, lead + 7 * STEP);
          later(function () { els[0].classList.remove('is-focus'); }, lead + 7 * STEP + 900);
          return wait(lead + 7 * STEP + 900 + FADE_MS);
        });
      } },
      { text: '음이름으로는\n' + em('C D E F G A B') + '였죠?', run: function () {
        grid().classList.remove('is-quick');
        const els = rowOf(1);
        return Promise.all(els.map(function (el, i) { return J.swap(el, function () { el.textContent = ROWS[1][i]; }, i * 60); }));
      } },
    ]),
    // 1 핵심(새 내용): C key, 시작음 C = 1도, 다음 음부터 2도·3도(도수라는 말은 D12에서 배움 — 스케일에 적용). 끝 화면 = 음 위 번호 1~7
    J.chainSteps([
      { text: em('C') + '에서 시작하는 메이저스케일로\n만든 곡을 ' + em('C key') + '라고 해요', run: function () {
        const els = rowOf(1), SW = 110;
        els.forEach(function (el, i) { later(function () { if (i > 0) els[i - 1].classList.remove('is-focus'); el.classList.add('is-focus'); }, i * SW); });
        later(function () { els[6].classList.remove('is-focus'); els[0].classList.add('is-focus'); }, 7 * SW);
        return wait(7 * SW + FADE_MS);
      } },
      { text: '시작음 ' + em('C') + '가 ' + em('1도') + '예요', run: function () {
        const n0 = nums()[0];
        n0.textContent = '1';
        return fx([n0], ['is-in', 'is-focus'], true);
      } },
      { text: '그다음 음부터\n2도, 3도…로 세어요', run: function () {
        const ns = nums();
        ns.forEach(function (el, i) { el.textContent = String(i + 1); });
        return fx(ns.slice(1), 'is-in', true, 90).then(function () { return fx([ns[0], rowOf(1)[0]], 'is-focus', false); });
      } },
    ]),
    // P2 코드 쌓기와 도수
    // 2 핵심(D12 적용): C코드 = 1·3·5번째 음(C E G) → 같은 방법을 모든 음에서(한 칸씩 건너뛰어 쌓기). 끝 화면 = 세 줄, 마지막 줄 파랑
    J.chainSteps([
      { text: em('C코드') + '는 1번째, 3번째, 5번째 음을\n쌓아서 만들었죠?', ms: 3340, run: function () {
        const r1 = rowOf(1), r2 = rowOf(2), r3 = rowOf(3), t0 = J.audioT0(), lead = J.leadMs(), STEP = 350;
        fx(nums(), 'is-dim', true);   // 번호는 쌓는 동안 옅게(쌓이는 줄이 주인공) — 번호 칸에서 돌아옴
        r2.forEach(function (el, i) { el.textContent = ROWS[2][i]; });
        r3.forEach(function (el, i) { el.textContent = ROWS[3][i]; });
        [0, 2, 4].forEach(function (c, k) {   // 스케일에서 C·E·G가 차례로 파랑 + 한 음씩
          J.note(SCALE_MIDI[c], t0 + k * STEP / 1000, 1.6 - k * STEP / 1000, 0.6);
          later(function () { r1[c].classList.add('is-focus'); }, lead + k * STEP);
        });
        J.strum([48, 52, 55], t0 + 1.4, 1.6, 0.8);   // 세 음이 C 열에 쌓이며 함께
        later(function () {
          r1[2].classList.remove('is-focus'); r1[4].classList.remove('is-focus');
          fx([r2[0], r3[0]], ['is-in', 'is-focus'], true, 120);
        }, lead + 1400);
        return wait(lead + 1400 + 120 + FADE_MS + 1200);
      } },
      { text: '이걸 스케일의 모든 음에서 해볼게요\n' + em('한 칸씩 건너뛰어') + ' 쌓으면 돼요', run: function () {
        const STAG = 70, ROW_MS = 6 * STAG + FADE_MS, PAUSE = 300, r1 = rowOf(1), r2 = rowOf(2), r3 = rowOf(3);
        fx([r1[0], r2[0], r3[0]], 'is-focus', false);
        fx(r1, 'is-dim', true);
        fx(r2, ['is-in', 'is-focus'], true, STAG);
        later(function () { fx(r2, 'is-focus', false); fx(r2, 'is-dim', true); fx(r3, ['is-in', 'is-focus'], true, STAG); }, ROW_MS + PAUSE);
        return wait(2 * ROW_MS + PAUSE);
      } },
    ]),
    // 3 핵심(새 내용): 세로 3음 = 코드 하나 = 다이어토닉 코드(용어). 끝 화면 = 세 줄 같은 진하기
    { text: '이렇게 메이저스케일에서 만든 코드를\n' + em('다이어토닉 코드') + '라고 해요', run: function () {
      fx(allNotes(), ['is-dim', 'is-focus'], false);
      cols().forEach(function (c, i) {
        const ns = Array.prototype.slice.call(c.querySelectorAll('.lec-note'));
        later(function () { ns.forEach(function (n) { n.classList.add('is-focus'); }); }, FADE_MS + i * 150);
        later(function () { ns.forEach(function (n) { n.classList.remove('is-focus'); }); }, FADE_MS + i * 150 + 450);
      });
      return wait(FADE_MS + 7 * 150 + 450 + FADE_MS);
    } },
    // 4 핵심(새 내용 + D12 복습): 코드 이름 7개(음은 줄어들고 옅어짐 — 의도된 유일한 크기 전환) / Bdim = 지난 시간에 배운 dim. 끝 화면 = 이름 7개
    Object.assign(J.chainSteps([
      { text: '각 코드의 이름은 이렇게 돼요', run: function () {
        const nm = names();
        nm.forEach(function (el, i) { el.textContent = C_NAMES[i]; });
        grid().classList.add('is-spread');
        fx(allNotes(), 'is-dim', true);
        return wait(SPREAD_MS).then(function () { return fx(nm, 'is-in', true, 60); });
      } },
      { text: em('Bdim') + '은 ' + (SOLO ? '앞에서' : '지난 시간에') + ' 배운\n' + em('dim') + ' 코드예요', run: function () {
        const b = names()[6];
        return fx([b], 'is-focus', true).then(function () { return wait(1200); }).then(function () { return fx([b], 'is-focus', false); });
      } },
    ]), { ms: 4660 }),
    // 5 핵심(새 내용): 코드 번호 = 시작하는 음의 번호(번호와 시작음이 함께 지나감). 끝 화면 = 번호 다시 진하게
    { text: '코드의 번호는\n시작하는 음의 번호를 따라가요', ms: 3050, run: function () {
      const ns = nums(), r1 = rowOf(1), SW = 300;
      fx(ns, 'is-dim', false);
      ns.forEach(function (el, i) {
        later(function () { el.classList.add('is-focus'); r1[i].classList.add('is-focus'); }, FADE_MS + i * SW);
        later(function () { el.classList.remove('is-focus'); r1[i].classList.remove('is-focus'); }, FADE_MS + i * SW + 450);
      });
      return wait(FADE_MS + 6 * SW + 450 + FADE_MS);
    } },
    // 6 핵심(새 내용): 로마숫자 표기·읽는 법 → 어떤 key여도 숫자는 그대로(이름은 옅게, 번호만 파랑). 끝 화면 = 이름 + 로마숫자
    Object.assign(J.chainSteps([
      { text: '코드의 순서는 로마숫자로 표시해요\n읽을 때는 ' + em('1도 메이저, 2도 마이너') + '처럼 읽어요', run: function () {
        return Promise.all(nums().map(function (el, i) { return J.swap(el, function () { el.innerHTML = romanHtml(ROMANS[i]); }, i * 60); }));
      } },
      { text: '어떤 key더라도\n이 숫자는 변하지 않아요', run: function () {
        const ns = nums(), nm = names();
        fx(nm, 'is-dim', true);
        return fx(ns, 'is-focus', true).then(function () { return wait(1200); }).then(function () {
          fx(ns, 'is-focus', false);
          return fx(nm, 'is-dim', false);
        });
      } },
    ]), { ms: 7200 }),
    // P3 소리와 노래
    // 7 핵심: 이름 ↔ 번호 ↔ 소리(울리는 열만 파랑), 마지막에 I 한 번 더
    { text: '7개의 다이어토닉 코드를 들어봅시다!', ms: 7020, run: function () {
      const t0 = J.audioT0(), lead = J.leadMs(), SLOT = 750;
      for (let k = 0; k < 8; k++) {
        const i = k % 7;
        J.strum(fretsToMidis(VOICINGS[C_NAMES[i]]), t0 + k * SLOT / 1000, k === 7 ? 1.7 : 0.72, k === 7 ? 1.0 : 0.4);
        later(function () { hot(i); }, lead + k * SLOT);
      }
      later(function () { hot(-1); }, lead + 8 * SLOT + 400);
      return wait(lead + 8 * SLOT + 400 + FADE_MS);
    } },
    // 8 핵심: 이 7개 세트가 뼈대(패밀리 코드). 음은 거의 사라짐
    { text: '대부분의 노래는 이 7가지 뼈대로 만들어져요\n' + em('패밀리 코드') + '라고도 불려요!', run: function () {
      return fx(allNotes(), 'is-faint', true);
    } },
    // 9 핵심(D5·D8 노래 적용): 작은 별에 쓰인 코드가 위 7개에서 파랑. 가사만 아래에
    { text: SOLO ? em('작은 별') + '에 어떻게\n적용되는지 들어볼까요?' : '앞에서 연주했던 작은 별에\n어떻게 적용되는지 들어볼까요?', ms: 12620, run: function () {
      const ly = $('lec-lyrics');
      ly.innerHTML = SONG_SYL.map(function (s, i) { return '<span class="lec-syl">' + s + '</span>' + (SONG_AFTER[i] || ''); }).join('');
      ly.classList.add('is-in');
      const gen = ++songGen;
      const ready = (typeof GuitarAudio !== 'undefined' && GuitarAudio.pianoReady) ? GuitarAudio.pianoReady() : Promise.resolve();
      return wait(FADE_MS).then(function () { return Promise.race([ready, wait(3000)]); }).then(function () {
        // 피아노 준비를 기다리는 사이 칸을 떠났으면(세대 번호·가사 장면) 이어서 울리지 않음 — 0-7
        if (gen !== songGen || !ly.isConnected || !ly.classList.contains('is-in')) return new Promise(function () {});
        J.songMix(SONG_GUITAR_TRIM, SONG_PIANO_GAIN);
        const t0 = J.audioT0(), lead = J.leadMs(), BEAT_MS = SONG_BEAT * 1000;
        const syl = Array.prototype.slice.call(ly.querySelectorAll('.lec-syl'));
        SONG_CHORDS.forEach(function (ch) {
          J.strum(fretsToMidis(VOICINGS[ch[0]]), t0 + ch[1] * SONG_BEAT, ch[2] * SONG_BEAT * 0.95, 0.6, 'weak');
          later(function () { hot(SONG_COL[ch[0]]); }, lead + ch[1] * BEAT_MS);
        });
        SONG_MELODY.forEach(function (m, i) {
          J.piano(m[0], t0 + m[1] * SONG_BEAT, m[2] * SONG_BEAT * 0.95);
          later(function () { syl.forEach(function (el, j) { el.classList.toggle('is-on', j === i); el.classList.toggle('is-sung', j < i); }); }, lead + m[1] * BEAT_MS);
        });
        const end = lead + SONG_BEATS * BEAT_MS;
        later(function () { hot(-1); syl.forEach(function (el) { el.classList.remove('is-on'); el.classList.add('is-sung'); }); }, end);
        return wait(end);
      });
    } },
    // P4 key가 바뀌면
    // 10 핵심(새 내용, D 메이저스케일은 D2 복습): 가사가 걷히고 → D key(코드명만 돌며 바뀌고 번호는 그대로) → D가 1도
    J.chainSteps([
      { enter: function () { songGen++; $('lec-lyrics').classList.remove('is-in'); }, text: '이번엔 다른 key에서는\n어떻게 적용하는지 알아볼게요!', run: function () {
        $('lec-lyrics').classList.remove('is-in');
        return wait(FADE_MS);
      } },
      { text: em('D') + '에서 시작하는 메이저스케일로\n바꿔 볼게요', run: function () {
        $('lec-lyrics').classList.remove('is-in');
        [1, 2, 3].forEach(function (r) { rowOf(r).forEach(function (el, i) { el.textContent = D_ROWS[r][i]; }); });
        return Promise.all(names().map(function (el, i) { return J.spin(el, function () { el.textContent = D_NAMES[i]; }, i * 100); }).concat([wait(FADE_MS)]));
      } },
      { text: 'D 메이저스케일로 만든 곡은 ' + em('D key') + '\n이제 D가 ' + em('1도') + '가 돼요', run: function () {
        const a = [names()[0], nums()[0]];
        fx(a, 'is-focus', true);
        return wait(1200).then(function () { return fx(a, 'is-focus', false); });
      } },
    ]),
    // 11 핵심: D key의 4도 코드는?(4열만 남기고 이름은 ?)
    { text: '그러면 D key의\n' + em('4도 코드') + '는 뭘까요?', run: function () {
      const ns = nums(), nm = names(), rest = ns.concat(nm).filter(function (el) { return el !== ns[3] && el !== nm[3]; });
      fx(rest, 'is-dim', true);
      ns[3].classList.add('is-focus');
      nm[3].classList.add('is-focus');
      return Promise.all([J.swap(nm[3], function () { nm[3].textContent = '?'; }), wait(FADE_MS)]);
    } },
    // 12 핵심: 1도 D부터 네 칸 세기(세는 음 줄이 원래 크기로, 소리와 함께 파랑이 쌓임)
    J.chainSteps([
      { text: '1도 ' + em('D') + '부터\n네 칸을 세어 봐요', run: function () {
        grid().classList.add('is-count');
        fx(rowOf(2).concat(rowOf(3)), 'is-in', false);
        return fx(rowOf(1), ['is-dim', 'is-faint'], false);
      } },
      { text: em('D, E, F#, G') + '\n네 번째 음이 ' + em('G') + '예요', ms: 2920, run: function () {
        const r1 = rowOf(1), STEP = 500, t0 = J.audioT0(), lead = J.leadMs(), midis = [50, 52, 54, 55];
        midis.forEach(function (m, k) {
          J.note(m, t0 + k * STEP / 1000, k === 3 ? 1.2 : STEP / 1000, k === 3 ? 0.8 : 0.18);
          later(function () { r1[k].classList.add('is-focus'); }, lead + k * STEP);
        });
        return wait(lead + 3 * STEP + 1200);
      } },
    ]),
    // 13 핵심: 4도 = G(코드 소리) / C key에서는 F — 번호는 같고 이름만 다름
    Object.assign(J.chainSteps([
      { text: 'D key의 4도 코드는\n' + em('G') + '예요', run: function () {
        const ns = nums(), nm = names(), rest = ns.concat(nm).filter(function (el) { return el !== ns[3] && el !== nm[3]; });
        grid().classList.remove('is-count');
        fx(rowOf(1), 'is-focus', false);
        fx(rowOf(1), ['is-dim', 'is-faint'], true);
        fx(rest, 'is-dim', false);
        J.strum(fretsToMidis(VOICINGS.G), J.audioT0(), 1.6, 0.8);
        return J.swap(nm[3], function () { nm[3].textContent = D_NAMES[3]; }).then(function () { return wait(1200); });
      } },
      { text: 'C key에서는 ' + em('F') + '였죠?\n번호는 같고 이름만 달라요', run: function () {
        const nm = names()[3];
        return J.swap(nm, function () { nm.textContent = C_NAMES[3]; }).then(function () { return wait(1200); })
          .then(function () { return J.swap(nm, function () { nm.textContent = D_NAMES[3]; }); })
          .then(function () { nm.classList.remove('is-focus'); nums()[3].classList.remove('is-focus'); });
      } },
    ]), { ms: 5200 }),
    // 14 핵심: 이 노드의 목표(도수와 친숙해지기 — 원본 1장 목표 문구)
    { text: '도수와 ' + em('친숙해지는 것') + '이\n이번 시간의 목표예요', run: none },
    // 15 핵심: 다음 할 일 = 퀴즈(C key만)
    SOLO ? J.chainSteps([
      { text: '축하드려요! ' + em('솔로연주 비기너') + ' 과정의\n모든 것을 학습하셨어요~!', run: none },
      { text: '이번 여정에서 ' + em('필수 스케일') + '들과\n' + em('기초적인 코드') + '들이 잡혔을 거예요', run: none },   // 문구 사용자 지정 2026-11-24
      { text: '마지막 관문인 ' + em('다이어토닉') + '도 퀴즈를\n반복적으로 풀면 감을 잡을 수 있을 거예요!', run: none },
      { text: '퀴즈를 마치면 승급시험에 도전해서', run: none },
      { text: em('굳은살 비기너') + '로의 승급에 도전해보세요!\n더 많은 것들을 배울 수 있을 거예요!', run: none },
    ]) : { text: '이제 퀴즈로 C key의 다이어토닉 코드와\n도수를 복습해봐요!', run: none },
  ];
  let songGen = 0;   // 작은 별 — 피아노 준비를 기다린 뒤 칸이 바뀌었으면 울리지 않게
  // 페이즈(진행 바): 1 스케일과 도수 [0·1] / 2 코드 쌓기와 도수 [2~6] / 3 소리와 노래 [7~9] / 4 key가 바뀌면 + 목표·퀴즈 안내 [10~15]
  const groups = [[0, 1], [2, 3, 4, 5, 6], [7, 8, 9], [10, 11, 12, 13, 14, 15]];

  // ═══════════════════════════════════════════════════════════════
  // 퀴즈 — D12(triads.js) 퀴즈 엔진(별 진행·피크·오답풀이·이어 풀기·오버레이)을 복사해 유형만 바꿈.
  //   유형 = 리하모니 화성학 1-1 레벨(C key)과 같음(사용자 지정 2026-11-17: 연결형 + 빈칸형, 배치형 없음):
  //     ① pair — C key 다이어토닉 7개 중 3개(70%)·4개(30%)를 출제 가중치대로 뽑아 코드 이름 ↔ 로마숫자 도수 짝짓기.
  //        가중치 I 5 · IIm 4 · IIIm 3 · IV 5 · V 5 · VIm 4 · VIIdim 1, VIIdim이 든 문제는 3쌍까지(chord-combo.js COMBO_V2_DEGS와 같음). 한 판 안에서 같은 조합은 다시 안 나옴
  //     ② fill — 코드반주 기초(no 1) C key 3화음 진행 21개 중 하나, 4칸 중 한 칸이 빈칸(정답 도수도 같은 가중치). 20%는 반대(칸에 도수, 빈칸에 도수를 고름)
  //        보기 = 정답 + 오답 2(이 key 다이어토닉 7개에서), 고른 뒤 제출. 안내 카드 스피커 = 정답 진행 소리(문제 진입 후 자동 1회)
  //   오답풀이(CLAUDE.md 0-8): 리하모니와 같이 같은 화면에서 맞힐 때까지 — 연결형은 맞힌 짝을 남기고 틀린 짝만 풀림, 빈칸형은 틀린 보기를 연한 오답색으로 막음
  //   문제 수(사용자 지정): 별 1 10 / 별 2 15 / 별 3 20. 두 유형 반반(홀수면 한쪽이 하나 더, 무작위)
  //   key: 별 1은 C key만, 별 2·3은 D key도 섞음(사용자 지정 2026-11-17: 별 2 약 10% · 별 3 약 25% — 15·20문제에서 2·5문제, 유형과 무관하게 무작위 자리).
  //     문제 데이터는 C key 이름으로 만들고(도수가 같으면 정답도 같음) 화면·소리만 그 문제의 key로 바꿔 보여 줌(nm·VOICINGS_D)
  //   저장: 별 수 = jnyStars(노드 id별), 하던 퀴즈 = jnyQuizSess:diatonic
  // ═══════════════════════════════════════════════════════════════
  const QZ_STAR_N = { 1: 10, 2: 15, 3: 20 };   // 별 → 문제 수
  const QZ_D_RATE = { 1: 0, 2: 0.1, 3: 0.25 };  // 별 → D key 문제 비율(사용자 지정)
  const QZ_REFUND_EVERY = 5;      // 정답 이만큼마다
  const QZ_REFUND_AMOUNT = 4;     // 이만큼 돌려줌 → 5문제당 순소모 1(사용자 지정 2026-11-12)
  function netCost() { return Math.ceil(qz.qs.length / QZ_REFUND_EVERY); }   // 퀴즈 1회 최종 순소모 = 5문제당 1
  const STARS_KEY = 'jnyStars';
  const NODE_ID = 'diatonic';
  let qz = null;   // 세션 { star, qs, idx, wrong[], phase: 'main'|'review', rvPos, done, judged, canRetry, paid{}, correct, refunded, short }
  // ── 이어 풀기 — 새로고침·앱 종료·백그라운드 뒤에도 하던 퀴즈를 그 문제부터. 문제(순서·보기·짝)·진행·틀린 목록·피크 지불 기록을 이 기기에 저장 ──
  //  X → '그만할래요'로 직접 나갔을 때와 완주했을 때만 지움. 저장분의 별이 지금 풀 별과 다르면 버림
  const SESS_KEY = 'jnyQuizSess:' + NODE_ID;   // 노드마다 따로(다른 노드 저장분을 덮지 않게)
  const SESS_FIELDS = ['star', 'qs', 'idx', 'wrong', 'phase', 'rvPos', 'done', 'judged', 'canRetry', 'paid', 'correct', 'refunded'];
  function sessSave() {
    if (!qz || qz.over || qz.quit) return;
    const o = { node: NODE_ID };
    SESS_FIELDS.forEach(function (k) { o[k] = qz[k]; });
    try { localStorage.setItem(SESS_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function sessLoad() {
    try {
      const o = JSON.parse(localStorage.getItem(SESS_KEY) || 'null');
      if (!o || o.node !== NODE_ID || o.star !== window.JourneyLesson.quizStar(starsGet()) || !Array.isArray(o.qs)) return null;
      return o;
    } catch (e) { return null; }
  }
  function sessClear() { try { localStorage.removeItem(SESS_KEY); } catch (e) {} }

  function starsGet() { try { return JSON.parse(localStorage.getItem(STARS_KEY) || '{}')[NODE_ID] || 0; } catch (e) { return 0; } }
  function starsSet(n) {
    if (typeof analytics !== 'undefined' && n > starsGet()) analytics.track('journey_quiz_cleared', { node_id: NODE_ID, quiz_k: n, course_kind: new URLSearchParams(location.search).get('course') });   // 분석(2026-11-26 여정 텍소노미): 처음 깬 단계만
    try { const o = JSON.parse(localStorage.getItem(STARS_KEY) || '{}'); o[NODE_ID] = Math.max(o[NODE_ID] || 0, n); localStorage.setItem(STARS_KEY, JSON.stringify(o)); } catch (e) {}
    // 퀴즈 노드 3(별 3)을 처음 클리어한 시각 = 묶음 완료 — 다음 설명 노드의 6시간 타이머 기준(journey.js jnyOpenAt, 2026-11-24 노드 늘리기). 처음 한 번만 기록
    try { const t = JSON.parse(localStorage.getItem('jnyDoneAt') || '{}'); if (n >= 3 && !t[NODE_ID]) { t[NODE_ID] = Date.now(); localStorage.setItem('jnyDoneAt', JSON.stringify(t)); } } catch (e) {}
  }
  function isPro() { return typeof getPlan === 'function' && getPlan() === 'pro'; }
  // 문제 확정 — 퀴즈를 시작할 때 한 번에 전부 만든다. 짝·보기·순서도 여기서 정해 오답풀이·이어 풀기 때 같은 화면
  const DIA = [
    { deg: 'I', chord: 'C', w: 5 }, { deg: 'IIm', chord: 'Dm', w: 4 }, { deg: 'IIIm', chord: 'Em', w: 3 }, { deg: 'IV', chord: 'F', w: 5 },
    { deg: 'V', chord: 'G', w: 5 }, { deg: 'VIm', chord: 'Am', w: 4 }, { deg: 'VIIdim', chord: 'Bdim', w: 1, only3: true },
  ];
  function diaByChord(c) { return DIA.filter(function (x) { return x.chord === c; })[0]; }
  const PAIR3_RATE = 0.7;      // 짝 3개 문제 비율(나머지 4개) — chord-combo.js COMBO_V2_PAIR3_RATE
  const REVERSE_RATE = 0.2;    // 빈칸형을 반대(도수)로 — chord-combo.js COMBO_V2_REVERSE_RATE
  // 코드반주 기초(no 1)·C key·다이어토닉 3화음만으로 된 진행(progression-data.js에서 리하모니 _comboV2SwPool과 같은 조건으로 뽑은 21개, 2026-11-17)
  const PROGS = [['F', 'G', 'C', 'C'], ['Dm', 'G', 'C', 'C'], ['F', 'G', 'Am', 'Am'], ['C', 'F', 'G', 'C'], ['C', 'G', 'Am', 'F'], ['C', 'Am', 'F', 'G'], ['C', 'Am', 'Dm', 'G'],
    ['F', 'G', 'C', 'Am'], ['F', 'G', 'Am', 'C'], ['F', 'G', 'Em', 'Am'], ['F', 'C', 'Am', 'G'], ['Am', 'C', 'F', 'G'], ['Am', 'C', 'Dm', 'G'], ['Am', 'G', 'F', 'G'],
    ['Am', 'Em', 'F', 'G'], ['Am', 'F', 'C', 'G'], ['Dm', 'G', 'C', 'Am'], ['Dm', 'G', 'Am', 'C'], ['Dm', 'G', 'Em', 'Am'], ['Em', 'Am', 'F', 'G'], ['Em', 'Am', 'Dm', 'G']];
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function weightedPick(items, n) {   // 가중치 비례 비복원 추출(chord-combo.js _comboV2WeightedPick)
    const pool = items.slice(), out = [];
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce(function (a, x) { return a + x.w; }, 0), i = 0;
      while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function makePair(used) {
    let pick, key, guard = 0;
    do {
      pick = weightedPick(DIA, Math.random() < PAIR3_RATE ? 3 : 4);
      if (pick.length > 3 && pick.some(function (x) { return x.only3; })) {   // 4개짜리에 VIIdim이 뽑히면 나머지 중 하나를 빼서 3개로
        const rest = pick.filter(function (x) { return !x.only3; });
        pick.splice(pick.indexOf(rest[rnd(rest.length)]), 1);
      }
      key = pick.map(function (x) { return x.deg; }).sort().join();
    } while (used.indexOf(key) >= 0 && ++guard < 50);
    used.push(key);
    return { type: 'pair', left: shuffle(pick.map(function (x) { return x.deg; })), right: shuffle(pick.map(function (x) { return x.deg; })) };   // 왼쪽(코드 이름)·오른쪽(도수) 순서를 따로 섞음
  }
  function makeFill(prev) {
    const cands = PROGS.filter(function (p) { return p !== prev.p; });
    const prog = cands[rnd(cands.length)];
    prev.p = prog;
    const distinct = prog.filter(function (c, i) { return prog.indexOf(c) === i; }).map(diaByChord);
    const ans = weightedPick(distinct, 1)[0];
    const spots = [];
    prog.forEach(function (c, i) { if (c === ans.chord) spots.push(i); });
    const reverse = Math.random() < REVERSE_RATE;
    const val = function (x) { return reverse ? x.deg : x.chord; };
    const wrong = shuffle(DIA.filter(function (x) { return x !== ans; })).slice(0, 2).map(val);
    return { type: 'fill', prog: prog.slice(), target: spots[rnd(spots.length)], reverse: reverse, answer: val(ans), choices: shuffle(wrong.concat([val(ans)])) };
  }
  function makeQuestions(star) {
    const n = QZ_STAR_N[star], nPair = n % 2 ? (n - 1) / 2 + rnd(2) : n / 2;
    const kinds = shuffle(Array.from({ length: n }, function (_, k) { return k < nPair ? 'pair' : 'fill'; }));
    const used = [], prev = { p: null };
    const qs = kinds.map(function (k) { return k === 'pair' ? makePair(used) : makeFill(prev); });
    const nD = Math.round(n * QZ_D_RATE[star]);
    qs.forEach(function (q, i) { q.key = i >= n - nD ? 'D' : 'C'; });   // C key는 앞, D key는 뒤로 확실히 나눔(사용자 지정 2026-11-17). 유형 순서는 kinds에서 이미 섞임
    return J.noRepeat(qs, function (q) { return q.key === 'D' ? 1 : 0; });   // rank = key — 같은 문제 피하려고 옮길 때도 C/D 경계를 넘지 않음   // 같은 문제가 바로 다음에 나오지 않게(엔진 noRepeat — 전 노드 공통)
  }
  // 도수 표기 — 로마숫자 크게 + 퀄리티(m·dim) 작게(chord-combo.js _comboV2RomanHtml과 같은 마크업, CSS .rm .rn .rq 공용)
  function roman(deg) { const m = /^([IV]+)(.*)$/.exec(deg); return '<span class="rm"><span class="rn">' + m[1] + '</span>' + (m[2] ? '<span class="rq">' + m[2] + '</span>' : '') + '</span>'; }
  // 화면 표시용 코드 이름 — 문제 데이터(C key 이름)를 그 문제의 key로(같은 도수 자리). key가 없는 예전 저장분은 C
  function nm(c, key) { return key === 'D' ? D_NAMES[C_NAMES.indexOf(c)] : c; }
  function fmt(v, reverse, key) { return reverse ? roman(v) : nm(v, key); }
  const VOICINGS_D = {   // D key 다이어토닉 소리(줄 6→1, -1 = 안 침) — 열쇠는 같은 도수의 C key 이름(D·Em·F#m·G·A·Bm·C#dim)
    C: [-1, -1, 0, 2, 3, 2], Dm: [0, 2, 2, 0, 0, 0], Em: [2, 4, 4, 2, 2, 2], F: [3, 2, 0, 0, 0, 3],
    G: [-1, 0, 2, 2, 2, 0], Am: [-1, 2, 4, 4, 3, 2], Bdim: [-1, 4, 5, 6, 5, -1],
  };
  function degOfChord(c) { return diaByChord(c).deg; }

  // ── 소리 — 정답(상승)·오답(하강) 벨: 리하모니(chord-combo.js comboPlaySound)와 같은 소리 ──
  let qzCtx = null;
  function bell(freq, delay, gainVal) {
    try {
      if (!qzCtx) qzCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (qzCtx.state !== 'running') qzCtx.resume();
      const t = qzCtx.currentTime + delay;
      const vol = (typeof _getSfxMasterVolume === 'function') ? _getSfxMasterVolume() : 1;
      [[1, 1, 0.8], [2.756, 0.55, 0.5], [5.404, 0.35, 0.3], [8.933, 0.18, 0.15], [13.46, 0.08, 0.08]].forEach(function (pt) {
        const osc = qzCtx.createOscillator(), g = qzCtx.createGain();
        osc.connect(g); g.connect(qzCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * pt[0] * 1.015, t);
        osc.frequency.exponentialRampToValueAtTime(freq * pt[0], t + 0.02);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gainVal * pt[1] * vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + pt[2]);
        osc.start(t); osc.stop(t + pt[2] + 0.05);
      });
    } catch (e) {}
  }
  function judgeSound(ok) {
    if (typeof _sfxMarkPlayed === 'function') _sfxMarkPlayed();   // 공용 클릭음(제출하기 누른 소리)과 겹치지 않게 — 정답·오답음이 그 탭의 소리
    if (ok) { bell(523.25, 0, 0.2); bell(698.46, 0.13, 0.2); } else { bell(349.23, 0, 0.2); bell(261.63, 0.13, 0.2); }
  }
  // ── 화면 — 리하모니 문제 화면(#combo-view-quiz-v2) 틀: 헤드(타이틀 + 오답풀기 배지) / 본문 / 하단 버튼 ──
  const QZ_TITLES = { pair: '같은 짝끼리 이어주세요', fill: '빈칸에 알맞은 코드를 배치하세요', fillRev: '빈칸에 알맞은 도수를 배치하세요' };   // 리하모니 COMBO_V2_TYPE_META·빈칸형 타이틀과 같은 문구
  // 안내 카드 — 리하모니 _comboV2BuildInfoCard와 같은 2줄(앞 문구의 "C key"만 진하게). speaker = 좌상단 스피커(빈칸형)
  function infoCard(head, tail, speaker) {
    return '<div class="combo-v2-info-card cd-card">' + (speaker ? '<button type="button" class="combo-v2-speaker" aria-label="코드 진행 듣기"><i data-lucide="volume-2"></i></button>' : '') +
      '<p class="combo-v2-info-text"><span>' + head.replace(/^(\S+ key)/, '<strong>$1</strong>') + '</span><span>' + tail + '</span></p></div>';
  }
  function qBtn(label, enabled, verdict) {
    const b = $('jq-btn');
    b.textContent = label;
    b.dataset.sfx = label === '제출하기' ? 'none' : 'pop';   // 공용 클릭음: 제출하기는 없음(채점 벨만), 다음·완료·다시 풀기·이어서 풀기는 pop
    b.disabled = !enabled;
    b.classList.toggle('combo-v2-submit--ok', verdict === true);
    b.classList.toggle('combo-v2-submit--ng', verdict === false);
  }
  function qProgress() {
    const total = qz.qs.length + qz.wrong.length;
    const pct = Math.sqrt(qz.done / total) * 100;
    const el = $('jq-fill');
    el.style.width = pct + '%';
    el.style.background = pct >= 90 ? '#FFD60A' : pct >= 75 ? '#4CBB17' : '';
  }
  function cur() { return qz.qs[qz.phase === 'review' ? qz.wrong[qz.rvPos] : qz.idx]; }
  // ── 소리 — 빈칸형 정답 진행(안내 카드 스피커, 문제 진입 후 자동 1회). 리하모니 comboV2PlayProgression과 같은 빠르기(120 BPM, 코드당 2박)
  //  하드컷(CLAUDE.md 0-7): 문제 전환(render)·제출(채점)·다시 풀기·오답풀이 진입·완주·이탈. 스피커를 다시 누르면 멈춤. 예약은 세대 번호로 무시
  const PLAY_STEP_SEC = 60 / 120 * 2, AUTOPLAY_MS = 250;
  const play = { gen: 0, on: false, timer: null, auto: null };
  function stopSound() {
    play.gen++;
    clearTimeout(play.timer); clearTimeout(play.auto);
    play.timer = play.auto = null;
    play.on = false;
    document.querySelectorAll('#jq-content .combo-v2-speaker.is-playing').forEach(function (el) { el.classList.remove('is-playing'); });
    if (typeof GuitarAudio !== 'undefined' && GuitarAudio.panic) GuitarAudio.panic();
  }
  function playProg() {
    if (play.on) { stopSound(); return; }
    const it = cur();
    if (!qz || it.type !== 'fill' || typeof GuitarAudio === 'undefined') return;
    const names = it.prog.map(function (c, i) { return i === it.target && !it.reverse ? it.answer : c; });   // 반대 문제는 칸이 코드 이름 그대로
    const gen = ++play.gen;
    Promise.resolve().then(function () { return GuitarAudio.resume && GuitarAudio.resume(); }).then(function () { return GuitarAudio.ready && GuitarAudio.ready(); }).catch(function () {}).then(function () {
      if (gen !== play.gen || !qz || qz.quit || qz.over || cur() !== it) return;   // 기다리는 사이 정리·이탈·문제 전환
      const t0 = Tone.now() + 0.08;
      names.forEach(function (c, i) { GuitarAudio.strumAt(fretsToMidis((it.key === 'D' ? VOICINGS_D : VOICINGS)[c]), 0.012, t0 + i * PLAY_STEP_SEC, PLAY_STEP_SEC * 0.92, 0.35); });
      play.on = true;
      const btn = $('jq-content').querySelector('.combo-v2-speaker');
      if (btn) btn.classList.add('is-playing');
      play.timer = setTimeout(function () {   // 정상 종료: 소리는 이미 페이드로 끝남 → 상태만 되돌림
        play.on = false; play.timer = null;
        if (btn) btn.classList.remove('is-playing');
      }, names.length * PLAY_STEP_SEC * 1000 + 400);
    });
  }

  let pairSel = null, pairs = [], fillSel = null;
  function render() {
    stopSound();   // 앞 문제 소리·예약을 하드컷 — 새 문제는 무음에서 시작(CLAUDE.md 0-7)
    if (needsPay() && peakAvail() < 1) { showShort(); return; }   // 답할 피크가 없으면 문제 대신 부족 안내
    qz.short = false;
    qz.judged = false;
    qz.canRetry = false;
    sessSave();
    pairSel = null; pairs = []; fillSel = null;
    const it = cur(), box = $('jq-content');
    $('jq-review-badge').hidden = qz.phase !== 'review';
    if (it.type === 'pair') {
      $('jq-title').textContent = QZ_TITLES.pair;
      const col = function (side) {
        return '<div class="combo-v2-pair-col" data-side="' + side + '">' + it[side].map(function (d) {
          return '<button type="button" class="combo-v2-pair-card cd-card" data-pair="' + d + '">' + (side === 'left' ? nm(DIA.filter(function (x) { return x.deg === d; })[0].chord, it.key) : roman(d)) + '</button>';
        }).join('') + '</div>';
      };
      box.innerHTML = infoCard((it.key || 'C') + ' key 다이어토닉 코드를', '짝지어 주세요') + '<div class="combo-v2-pairs jq-pairs">' + col('left') + col('right') + '</div>';
      box.querySelector('.jq-pairs').addEventListener('click', function (e) { const c = e.target.closest('.combo-v2-pair-card'); if (c && !c.classList.contains('is-ok')) pairTap(c); });   // 오답풀이 재도전 중 맞힌 짝은 그대로
    } else {
      $('jq-title').textContent = it.reverse ? QZ_TITLES.fillRev : QZ_TITLES.fill;
      // 보통: 칸에 코드 이름 / 아래 도수 힌트. 반대: 칸에 도수 / 아래 코드 이름 힌트(chord-combo.js _comboV2SwBuild)
      const blanks = it.prog.map(function (c, i) {
        const t = i === it.target, deg = degOfChord(c);
        return '<div class="combo-v2-blank ' + (t ? 'is-target' : 'is-fixed') + '"><div class="combo-v2-blank-slot">' + (t ? '' : '<span class="combo-v2-fixed-text">' + (it.reverse ? roman(deg) : nm(c, it.key)) + '</span>') + '</div>' +
          '<div class="combo-v2-blank-deg' + (it.reverse ? ' is-chord' : '') + '">' + (it.reverse ? nm(c, it.key) : roman(deg)) + '</div></div>';
      }).join('');
      box.innerHTML = infoCard((it.key || 'C') + ' key 다이어토닉 코드에서', it.reverse ? '빈칸에 알맞은 도수를 채워주세요' : '빈칸에 알맞은 코드를 채워주세요', true) +
        '<div class="combo-v2-blanks-wrap"><div class="combo-v2-blanks" id="jq-blanks">' + blanks + '</div></div>' +
        '<div class="combo-v2-choices" id="jq-choices">' + it.choices.map(function (v) { return '<button type="button" class="combo-v2-chip combo-v2-chip--choice cd-card" data-v="' + v + '">' + fmt(v, it.reverse, it.key) + '</button>'; }).join('') + '</div>';
      if (window.lucide) lucide.createIcons();
      box.querySelector('.combo-v2-speaker').addEventListener('click', playProg);
      $('jq-choices').addEventListener('click', function (e) { const b = e.target.closest('.combo-v2-chip--choice'); if (b) fillChoose(b); });
      play.auto = setTimeout(function () { play.auto = null; if (qz && !qz.judged && cur() === it) playProg(); }, AUTOPLAY_MS);   // 문제 진입 후 자동 1회(리하모니 COMBO_V2_AUTOPLAY_MS)
    }
    qBtn('제출하기', false);
  }

  // ── 피크 — 답할 때 1개 차감(사용자 지정 2026-11-12: 문제가 나올 때가 아니라 답을 낼 때. 진입만으로는 빠지지 않음) ──
  //  문제를 보여 줄 때는 빼지 않고 잔액만 미리 확인 → 0이면 그 문제 대신 '피크가 부족해요' + 공용 완충 모달(답을 다 고른 뒤 막히지 않게)
  //  답하는 순간(찾아 누르기 = 누를 때, 사지선다·짝 = 제출할 때) 차감. 서버 차감(consumePeak)은 답과 함께 보내고 채점은 기다리지 않음(문제마다 멈칫하지 않게)
  //  본 문제 한 문제당 한 번만(paid — 이어 풀기 때도 다시 안 뺌), 오답풀이·Pro는 없음
  function peakAvail() {
    if (typeof _peakState === 'undefined') return Infinity;
    return (_peakState.balance || 0) + (typeof _peakRefundPending === 'function' ? _peakRefundPending() : 0);
  }
  function needsPay() { return qz.phase === 'main' && !qz.paid[qz.idx] && !isPro(); }
  function payOnAnswer() {
    if (!needsPay()) return;
    qz.paid[qz.idx] = true;
    if (typeof APP_VERSION !== 'undefined' && APP_VERSION.includes('_dev')) {
      // DEV 빌드: 공용 consumePeak는 소모 없이 통과(shared.js 규칙)라 확인이 안 됨 → 화면 숫자만 흉내(서버·로컬 잔액은 그대로)
      if (typeof _peakState !== 'undefined') { _peakState = Object.assign({}, _peakState, { balance: (_peakState.balance || 0) - 1 }); if (typeof renderPeakBadge === 'function') renderPeakBadge(); }
    } else if (typeof consumePeak === 'function') consumePeak(1, 'journey');
    peakPop('−1');
  }
  function showShort() {
    qz.short = true;
    if (typeof openPeakBuffer === 'function') openPeakBuffer('journey');
    $('jq-title').textContent = QZ_TITLES[cur().type];
    $('jq-review-badge').hidden = true;
    $('jq-content').innerHTML = infoCard('피크가 부족해요', '', '충전한 뒤 이어서 풀 수 있어요');
    qBtn('이어서 풀기', true);
  }
  // 피크 연출 — 리하모니 화성학(chord-combo.js _comboV2PeakPop)과 같은 코드: 탑바 피크 개수가 통통 튀고 아래로 글자가 떠올랐다 사라짐.
  //  환급은 리하모니와 같이 '+N'(노랑, .combo-v2-peak-plus). 소모는 리하모니엔 퀴즈 중 연출이 없어(입장할 때 한 번에 냄) 같은 연출에 '−N'만 바꿔 씀
  function peakPop(text) {
    const pill = $('topbar-currency');
    if (!pill) return;
    pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    const r = pill.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'combo-v2-peak-plus';
    el.textContent = text;
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = r.bottom + 'px';
    document.body.appendChild(el);
    const a = el.animate([
      { opacity: 0, transform: 'translate(-50%, 0)' },
      { opacity: 1, transform: 'translate(-50%, 6px)', offset: 0.25 },
      { opacity: 0, transform: 'translate(-50%, 22px)' },
    ], { duration: 900, easing: 'ease-out' });
    a.onfinish = a.oncancel = function () { el.remove(); };
  }
  // ① 짝 맞추기 — 리하모니 연결형과 같은 조작: 카드 탭 → 반대편 카드 탭 = 짝, 짝인 카드를 다시 탭하면 풀림. 다 짝지으면 제출
  const PAIR_COLORS = ['var(--icon-blue)', 'var(--icon-purple)', 'var(--icon-yellow)', 'var(--icon-pink)'];   // 리하모니 COMBO_V2_PAIR_COLORS
  function pairTap(card) {
    if (qz.judged) return;
    if (typeof _playConfirmSfx === 'function') _playConfirmSfx();
    const side = function (c) { return c.parentNode.dataset.side; };
    const ex = pairs.find(function (p) { return p.a === card || p.b === card; });
    if (ex) {
      [ex.a, ex.b].forEach(function (c) { c.classList.remove('is-paired'); c.style.removeProperty('--pair-c'); });
      pairs.splice(pairs.indexOf(ex), 1);
    } else if (pairSel && side(pairSel) !== side(card)) {
      const used = pairs.map(function (p) { return p.color; });
      const color = PAIR_COLORS.find(function (c) { return used.indexOf(c) < 0; }) || PAIR_COLORS[0];
      const a = side(card) === 'left' ? card : pairSel, b = a === card ? pairSel : card;
      [a, b].forEach(function (c) { c.classList.remove('is-sel'); c.classList.add('is-paired'); c.style.setProperty('--pair-c', color); });
      pairs.push({ a: a, b: b, color: color });
      pairSel = null;
    } else {
      if (pairSel) pairSel.classList.remove('is-sel');
      pairSel = card;
      card.classList.add('is-sel');
      return;
    }
    if (pairSel) { pairSel.classList.remove('is-sel'); pairSel = null; }
    qBtn('제출하기', pairs.length === cur().left.length);
  }
  function pairJudge() {
    let all = true;
    pairs.forEach(function (p) {
      const ok = p.a.dataset.pair === p.b.dataset.pair;
      if (!ok) all = false;
      [p.a, p.b].forEach(function (c) { c.classList.remove('is-paired'); c.classList.add(ok ? 'is-ok' : 'is-ng'); });
    });
    $('jq-content').querySelector('.jq-pairs').classList.add('is-locked');
    verdict(all);
  }
  // ② 빈칸 — 보기를 탭하면 빈칸에 칩이 바로 들어감(다른 보기 = 선택 변경), 제출하기로 채점(리하모니 교체형·빈칸형과 같음)
  function fillTarget(popped) {
    const it = cur(), slot = $('jq-blanks').querySelector('.is-target .combo-v2-blank-slot');
    slot.innerHTML = fillSel == null ? '' : '<div class="combo-v2-chip cd-card' + (popped ? ' combo-block--pop' : '') + '">' + fmt(fillSel, it.reverse, it.key) + '</div>';
  }
  function fillChoose(b) {
    if (qz.judged || b.classList.contains('is-miss') || b.dataset.v === fillSel) return;   // 오답풀이에서 이미 틀린 보기는 다시 못 고름
    if (typeof _playConfirmSfx === 'function') _playConfirmSfx();
    fillSel = b.dataset.v;
    $('jq-choices').querySelectorAll('.combo-v2-chip--choice').forEach(function (c) { c.classList.toggle('is-sel', c === b); });
    fillTarget(true);
    qBtn('제출하기', true);
  }
  function fillJudge() {
    const it = cur(), ok = fillSel === it.answer;
    const chip = $('jq-blanks').querySelector('.is-target .combo-v2-chip');
    if (chip) chip.classList.add(ok ? 'is-ok' : 'is-ng');
    const deg = $('jq-blanks').querySelector('.is-target .combo-v2-blank-deg');   // 채점 후 정답 도수를 칩 색과 같은 색으로(반대 문제는 코드 이름 힌트 색만)
    if (deg) { if (!it.reverse) deg.innerHTML = roman(degOfChord(it.answer)); deg.classList.add(ok ? 'is-ok' : 'is-ng'); }
    $('jq-choices').classList.add('is-locked');
    verdict(ok);
  }
  // 오답풀이 재도전(CLAUDE.md 0-8) — 같은 화면에서: 연결형은 맞힌 짝을 남기고 틀린 짝만 풀림(표시 없음), 빈칸형은 틀린 보기를 연한 오답색으로 막고 빈칸을 비움
  function retry() {
    stopSound();
    const it = cur();
    if (!$('jq-content').querySelector(it.type === 'pair' ? '.jq-pairs' : '#jq-blanks')) { render(); return; }   // 이어 풀기로 막 들어옴(화면이 없음) — 같은 문제를 새로 그림
    qz.judged = false;
    qz.canRetry = false;
    if (it.type === 'pair') {
      pairs = pairs.filter(function (p) {
        if (p.a.dataset.pair === p.b.dataset.pair) return true;
        [p.a, p.b].forEach(function (c) { c.classList.remove('is-ng'); c.style.removeProperty('--pair-c'); });
        return false;
      });
      $('jq-content').querySelector('.jq-pairs').classList.remove('is-locked');
    } else {
      $('jq-choices').querySelectorAll('.combo-v2-chip--choice').forEach(function (b) { if (b.dataset.v === fillSel) { b.classList.remove('is-sel'); b.classList.add('is-miss'); } });
      fillSel = null;
      $('jq-choices').classList.remove('is-locked');
      const deg = $('jq-blanks').querySelector('.is-target .combo-v2-blank-deg');   // 채점 때 채운 정답 도수를 원래 힌트로(정답이 남지 않게)
      if (deg) { deg.classList.remove('is-ok', 'is-ng'); if (!it.reverse) deg.innerHTML = roman(degOfChord(it.prog[it.target])); }
      fillTarget(false);
    }
    qBtn('제출하기', false);
  }

  // 채점 — 본 문제는 맞든 틀리든 한 칸 진행(틀리면 오답풀이 몫이 전체에 더해짐), 오답풀이는 맞혔을 때만 한 칸.
  //  delay: 정답·오답음과 게이지를 이만큼 늦춤(찾아 누르기 — 누른 자리 소리가 먼저). 버튼은 그 순간 함께
  function verdict(ok, delay) {
    payOnAnswer();
    qz.judged = true;
    if (ok) qz.correct++;
    const due = ok && qz.correct % QZ_REFUND_EVERY === 0;   // 정답 5개째 — 환급은 정답음과 같은 순간에(아래 show)
    if (qz.phase === 'main') { if (!ok) qz.wrong.push(qz.idx); qz.done++; }
    else if (ok) qz.done++;
    qz.canRetry = qz.phase === 'review' && !ok;
    const last = qz.phase === 'review' ? (ok && qz.rvPos >= qz.wrong.length - 1) : (qz.idx >= qz.qs.length - 1 && !qz.wrong.length);
    sessSave();
    const show = function () {
      judgeSound(ok);
      qProgress();
      if (due) { refund(QZ_REFUND_AMOUNT); sessSave(); }   // (그 사이 새로고침돼 놓친 몫은 완주 때 맞춰 돌려줌)
      qBtn(qz.canRetry ? '다시 풀기' : last ? '완료' : '다음', true, ok);
    };
    if (!delay) { show(); return; }
    const tok = qz;
    setTimeout(function () { if (qz === tok && !qz.quit) show(); }, delay);
  }
  // 환급 — 대기분에 쌓고 화면 숫자만 바로 올림(서버는 완주·이탈 때 한 번에). 퀴즈 1회 환급 합계는 문제 수 − 순소모(5문제당 1)를 넘지 않음
  function refund(n) {
    if (isPro()) return;
    const room = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const amt = Math.min(n, room);
    if (amt <= 0 || typeof addPendingRefund !== 'function') return;
    if (addPendingRefund(amt)) { qz.refunded += amt; peakPop('+' + amt); }
  }
  function next() {
    if (qz.short) { render(); return; }   // 피크 부족 → 이어서 풀기(다시 확인)
    if (!qz.judged) {   // 제출하기
      const it = cur();
      stopSound();   // 답을 낸 순간 문제 소리는 끊음(CLAUDE.md 0-7)
      if (it.type === 'pair') pairJudge();
      else if (fillSel != null) fillJudge();
      return;
    }
    if (qz.canRetry) { retry(); return; }   // 오답풀이에서 또 틀림 — 같은 화면에서 다시
    if (qz.phase === 'main') {
      if (qz.idx < qz.qs.length - 1) { qz.idx++; render(); return; }
      if (qz.wrong.length) { showIntro(); return; }
    } else if (qz.rvPos < qz.wrong.length - 1) { qz.rvPos++; render(); return; }
    showClear();
  }

  // ── 오버레이 — 리하모니 화성학(chord-combo.js)과 같은 시스템: 오답풀이 안내 / 완주(트로피·칭찬·색종이) ──
  //  .combo-v2-seq 요소를 순서대로 하나씩(다음 요소는 앞 요소의 animationend 뒤). 이탈은 overlayAbort가 즉시 정리
  const SEQ_GAP_MS = 150, INTRO_GAP_MS = 900, INTRO_HOLD_MS = 2000;   // 리하모니 COMBO_V2_SEQ_GAP_MS·INTRO_GAP_MS·INTRO_HOLD_MS와 같은 값
  let seqRun = null, ovTok = 0;
  function seqStop() { if (seqRun) { seqRun.stopped = true; clearTimeout(seqRun.timer); } seqRun = null; }
  //  seq.el = 지금 등장 중인 요소 / seq.fire = 기다리는 중인 다음 일(다음 요소 또는 마지막 hold 뒤 onDone) — 터치 스킵(seqSkip)이 씀. fire는 한 번만 실행(arm)
  function seqPlay(scene, hold, onDone, gap) {
    seqStop();
    const seq = { timer: null, stopped: false, el: null, fire: null };
    seqRun = seq;
    const els = Array.prototype.filter.call(scene.querySelectorAll('.combo-v2-seq'), function (el) { return !el.hidden; });
    els.forEach(function (el) { el.classList.remove('is-in'); });
    let i = 0;
    const arm = function (fn, ms) { seq.fire = function () { seq.fire = null; clearTimeout(seq.timer); if (!seq.stopped) fn(); }; seq.timer = setTimeout(seq.fire, ms); };
    const nextEl = function () {
      if (seq.stopped) return;
      seq.el = null;
      if (i >= els.length) { arm(function () { if (onDone) onDone(); }, hold); return; }
      const el = els[i++];
      seq.el = el;
      const after = function () {
        if (seq.stopped || seq.el !== el) return;
        seq.el = null;
        const g = gap == null ? SEQ_GAP_MS : gap;
        if (i >= els.length) arm(function () { if (onDone) onDone(); }, g + hold);   // 마지막 요소 뒤 = 간격 + hold를 한 번에(시간은 예전과 같음) — 터치 스킵에서 눈에 안 보이는 빈 단계가 생기지 않게
        else arm(nextEl, g);
      };
      el.addEventListener('animationend', function h(e) { if (e.target !== el) return; el.removeEventListener('animationend', h); after(); });
      el.classList.add('is-in');
      if (getComputedStyle(el).animationName === 'none') after();
    };
    nextEl();
  }
  // 터치 스킵(사용자 지정 2026-11-15) — 오답풀이 안내·완주 화면을 누르면 한 단계씩: 등장 중인 요소는 애니메이션을 끝 상태로(→ animationend로 다음 대기),
  //  다음 요소·마지막 hold를 기다리는 중이면 기다림 없이 바로 다음으로. 여러 번 눌러야 끝까지 감
  function seqSkip() {
    const seq = seqRun;
    if (!seq || seq.stopped) return;
    if (seq.el) {
      seq.el.getAnimations().forEach(function (a) { try { a.finish(); } catch (e) {} });   // 끝 상태로 → animationend(비동기로 도착) → after가 다음 대기를 걸음
      return;
    }
    if (seq.fire) seq.fire();
  }
  function overlayShow(sceneId) {
    const ov = $('combo-v2-overlay');
    ovTok++;
    ov.classList.remove('is-out', 'combo-v2-overlay--exit');
    ov.hidden = false;
    ov.querySelectorAll('.combo-v2-scene').forEach(function (el) { el.hidden = el.id !== sceneId; });
    return $(sceneId);
  }
  function overlayFade() {
    const ov = $('combo-v2-overlay');
    if (ov.hidden) return;
    const tok = ++ovTok;
    ov.classList.add('is-out');
    ov.addEventListener('animationend', function h(e) {
      if (e.target !== ov) return;
      ov.removeEventListener('animationend', h);
      if (tok !== ovTok) return;
      ov.hidden = true;
      ov.classList.remove('is-out');
    });
  }
  function overlayAbort() {
    seqStop();
    ovTok++;
    const ov = $('combo-v2-overlay');
    if (!ov) return;
    ov.hidden = true;
    ov.classList.remove('is-out', 'combo-v2-overlay--exit');
    ov.querySelectorAll('.combo-v2-seq').forEach(function (el) { el.classList.remove('is-in'); });
    document.querySelectorAll('.combo-v2-confetti').forEach(function (el) { el.remove(); });
  }
  // 오답풀이 안내 — 끝나면 틀린 첫 문제를 오버레이 아래에 그려 두고 오버레이가 걷히며 드러남.
  //  피크: 남은 환급이 있으면 '오답을 모두 풀면 사용한 피크를 돌려받아요'(개수는 쓰지 않음 — 사용자 지정), Pro·남은 환급 없음은 '이제 오답풀이예요'
  function showIntro() {
    stopSound();   // 오답풀이 진입 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    const remain = Math.max(0, qz.qs.length - netCost() - qz.refunded);
    const usePeak = !isPro() && remain > 0;
    document.querySelectorAll('#combo-v2-intro [data-peak]').forEach(function (el) { el.hidden = !usePeak; });
    $('combo-v2-intro-title-pro').hidden = usePeak;
    qz.phase = 'review'; qz.rvPos = 0; qz.judged = false; qz.canRetry = false;
    sessSave();
    const scene = overlayShow('combo-v2-intro');
    seqPlay(scene, INTRO_HOLD_MS, function () {
      render();
      overlayFade();
    }, INTRO_GAP_MS);
  }
  // 완주 — 별 저장(이 기기 localStorage jnyStars), 나머지 피크 환급, 트로피·칭찬·색종이. 돌아가기 → 홈
  function showClear() {
    qz.over = true;
    starsSet(qz.star);
    sessClear();
    refund(qz.qs.length);   // 남은 몫이 있으면 한꺼번에(합계 = 문제 수 − 순소모) — 보통은 정답 5개마다 이미 다 받음
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();   // 완주 화면 = 맥락 전환 → 하드컷(CLAUDE.md 0-7)
    $('combo-v2-clear-title').textContent = '완주!';
    $('combo-v2-clear-level').textContent = '다이어토닉 코드의 이해 · 퀴즈 ' + qz.star;
    $('combo-v2-clear-refund').hidden = isPro() || !qz.refunded;
    $('combo-v2-clear-praise').textContent = qz.wrong.length ? '틀린 문제도 끝까지 풀어냈어요. 정말 잘했어요!' : '한 문제도 안 틀렸어요. 완벽해요!';
    const scene = overlayShow('combo-v2-clear');
    if (typeof _playSfx === 'function') _playSfx('reward.mp3');
    seqPlay(scene, 0, null);
    confetti();
    J.setQuizBack(J.goHome);
  }
  function confetti() {
    const ov = $('combo-v2-overlay'), trophy = document.querySelector('#combo-v2-clear .combo-v2-clear-trophy');
    if (!ov || !trophy) return;
    const o = ov.getBoundingClientRect(), t = trophy.getBoundingClientRect();
    const cx = t.left + t.width / 2 - o.left, cy = t.top + t.height / 2 - o.top;
    const colors = ['var(--icon-purple)', 'var(--icon-green)', 'var(--icon-coral)', 'var(--icon-blue)', 'var(--icon-yellow)', 'var(--icon-pink)'];
    for (let k = 0; k < 18; k++) {
      const d = document.createElement('div');
      d.className = 'combo-v2-confetti';
      d.style.left = cx + 'px'; d.style.top = cy + 'px'; d.style.background = colors[k % colors.length];
      ov.appendChild(d);
      const ang = (Math.PI * 2 * k) / 18 + Math.random() * 0.3, dist = 90 + Math.random() * 80;
      const a = d.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px, ' + (Math.sin(ang) * dist + 40) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 },
      ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: 250, fill: 'both' });
      a.onfinish = a.oncancel = function () { d.remove(); };
    }
  }

  function startQuiz() {
    const star = window.JourneyLesson.quizStar(starsGet());   // 순차: 다음 별(별 3 이후엔 별 3 반복)
    qz = { star: star, qs: makeQuestions(star), idx: 0, wrong: [], phase: 'main', rvPos: 0, done: 0, judged: false, canRetry: false, over: false, paid: {}, correct: 0, refunded: 0, short: false };
    const saved = sessLoad();
    if (saved) SESS_FIELDS.forEach(function (k) { if (saved[k] !== undefined) qz[k] = saved[k]; });
    $('jq-track').hidden = false;
    $('jq-fill').style.width = '0%';
    $('jq-btn').onclick = function () { if (qz.over) return; next(); };
    $('combo-v2-clear-btn').onclick = function () { if (typeof _playConfirmSfx === 'function') _playConfirmSfx(); J.goHome(); };
    $('combo-v2-overlay').onclick = function (e) { if (!e.target.closest('button')) seqSkip(); };   // 오답풀이 안내·완주 화면 터치 = 한 단계씩 스킵(돌아가기 버튼은 제외)
    J.setQuizBack(function () {
      if (qz.phase === 'review') { quitQuiz(); J.goHome(); return; }   // 오답풀이 중엔 낸 피크가 없어 확인 없이
      if (typeof isLeavePracticeOpen === 'function' && isLeavePracticeOpen()) return;
      showLeavePracticeModal(function () { quitQuiz(); J.goHome(); }, { title: '퀴즈를 그만두시겠어요?', desc: '지금 나가면 퀴즈를<br>처음부터 다시 풀어야 해요.' });
    });
    if (saved) {
      qProgress();
      if (qz.judged) next(); else render();   // 채점이 끝난 문제였으면 그다음으로(오답풀이 재도전이면 같은 문제)
    } else render();
    $('jq-view').classList.remove('quiz-view--right');   // 리하모니와 같은 전환 — 오른쪽에서 들어옴
  }
  // 직접 그만두기(X → 그만할래요, 오답풀이 중 X) — 저장분을 지우고 정리. 울리는 기타 소리 하드컷(CLAUDE.md 0-2)
  function quitQuiz() {
    if (qz) qz.quit = true;   // 늦게 오는 정답·오답음 막음
    sessClear();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');   // 이미 받은 도중 환급은 서버에 반영(회수하지 않음 — §1-5)
    overlayAbort();
    stopSound();
  }
  // 백그라운드·새로고침·앱 종료(pagehide) — 소리만 즉시 끊고 환급은 서버로. 퀴즈 상태는 그대로(돌아오거나 다시 열면 이어서 — sessSave)
  function pauseQuiz() {
    if (!qz || qz.over) return;
    sessSave();
    if (typeof flushPendingRefund === 'function') flushPendingRefund('journey');
    stopSound();
  }
  window.addEventListener('pagehide', pauseQuiz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseQuiz(); });


  J.register('diatonic', { steps: steps, groups: groups, build: build, doneLabel: '퀴즈 시작!', replayCut: 15, quiz: startQuiz, canResume: function () { return !!sessLoad(); } });   // 15 = 마무리(퀴즈 안내) 칸 — 설명 다시듣기에선 빼고 종료
})();
