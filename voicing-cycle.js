'use strict';
// ═══════════════════════════════════════════════════════════════
// voicing-cycle.js — 코드 진행 보이싱 순환 선택 (cyclic DP)
//
// 코드반주 훈련(chordplay-practice.js)의 선택 규칙을 모듈로 옮긴 것:
//   첫 코드 = 후보 중 최저 fretNumber 고정 → 나머지는 이동 비용 최소 경로 → 마지막→첫 코드 이동 비용까지 포함.
// 후보는 ProgressionVoicings.getCandidates (progression-voicings.js).
// ═══════════════════════════════════════════════════════════════

const VoicingCycle = (() => {
  const CROSS_PENALTY     = 2;     // 근음 줄이 바뀔 때
  const HIGH_FRET_THRESH  = 5;     // 이 프렛 초과부터 페널티
  const HIGH_FRET_FACTOR  = 0.8;   // 초과 프렛당 페널티
  const THIN_ROOT_PENALTY = 2.5;   // 3번줄 이상 근음
  const FOUR_STR_PENALTY  = 2.5;   // 4번줄 근음
  const LOW_FRET_BONUS    = 1.5;   // 0~1프렛 오픈 포지션 보너스

  const IIV_SHELL_BONUS   = 3;     // ii→V 쉘 연결 가산점
  const NOTE_SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const M7B5_SHELL_SHAPE = [null, 0, 1, 1, null, 1];   // r+1 x r+1 r+1 r x (rootStr:6)
  const DOM7_PLAIN_SHAPE = [0, 2, 0, 2, 0, null];      // x r r+2 r r+2 r   (rootStr:5)
  const DOM7_ALT_SHAPE   = [null, 0, 2, 1, 2, null];   // x r+2 r+1 r+2 r x (rootStr:5)

  // 탑노트·베이스(최저음) 이동 가중 (반음당). 보이싱 연결의 선율 이동을 줄임
  let cfg = { topW: 0, bassW: 0, cyclic: true };   // pick 호출마다 opts로 덮어씀
  let dropOpen = false;   // 병목 코드가 있으면(오픈 포지션 불가) 개방현을 쓰는 보이싱은 후보에서 뺌
  const noOpen = list => { const f = list.filter(v => !v.frets.some(x => x === 0)); return f.length ? f : list; };
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];   // 캔버스 인덱스 0=1번줄 … 5=6번줄
  function topBot(v) {
    let top = -1, bot = 999;
    v.frets.forEach((f, i) => { if (f === null) return; const m = OPEN_MIDI[i] + f; if (m > top) top = m; if (m < bot) bot = m; });
    return [top, bot];
  }

  const fret = v => (v && v.fretNumber) || 0;
  function relShape(frets) {
    if (!frets) return null;
    const vals = frets.filter(f => f !== null);
    if (!vals.length) return frets;
    const min = Math.min(...vals);
    return frets.map(f => f === null ? null : f - min);
  }
  const shapeEq = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
  function rootSemi(v) {
    const m = v && v.name && v.name.match(/^([A-G][#b]?)/);
    return m ? NOTE_SEMI[m[1]] : null;
  }
  function rootStr(v) {   // 근음 줄 인덱스 (6번줄=5 … 1번줄=0)
    if (!v || !v.frets) return -1;
    for (let s = 5; s >= 0; s--) if (v.frets[s] !== null) return s;
    return -1;
  }
  function dist(a, b) {
    const hfp = Math.max(0, fret(b) - HIGH_FRET_THRESH) * HIGH_FRET_FACTOR;
    const trp = rootStr(b) < 3 ? THIN_ROOT_PENALTY : 0;
    const fsp = rootStr(b) === 3 ? FOUR_STR_PENALTY : 0;
    const lfb = fret(b) <= 1 ? LOW_FRET_BONUS : 0;
    // ii→V 쉘 연결: m7(b5) 6번줄 쉘 다음에 완전4도 위 V7이 오면 같은 자리로 이어지는 alt shape를 우선
    let iiV = 0;
    if (a && b && a.quality === 'm7(b5)' && b.quality === '7' && rootStr(b) === 4 &&
        shapeEq(relShape(a.frets), M7B5_SHELL_SHAPE) && ((rootSemi(b) - rootSemi(a) + 12) % 12) === 5) {
      const bs = relShape(b.frets);
      if (shapeEq(bs, DOM7_ALT_SHAPE)) iiV = -IIV_SHELL_BONUS;
      else if (shapeEq(bs, DOM7_PLAIN_SHAPE)) iiV = IIV_SHELL_BONUS;
    }
    let mel = 0;
    if ((cfg.topW || cfg.bassW) && a && b && a.frets && b.frets) {
      const ta = topBot(a), tb = topBot(b);
      mel = cfg.topW * Math.abs(ta[0] - tb[0]) + cfg.bassW * Math.abs(ta[1] - tb[1]);
    }
    return Math.abs(fret(a) - fret(b)) + (rootStr(a) !== rootStr(b) ? CROSS_PENALTY : 0) + hfp + trp + fsp - lfb + iiV + mel;
  }

  // steps: [{root: 0~11, quality, bass?, tension?}], keyIdx: 진행 key(오픈 보이싱 고정 판정용)
  // 반환: 스텝별 보이싱 배열. 후보 없는 스텝이 하나라도 있으면 null
  // 병목 코드 규칙: 진행 안에서 가장 낮은 후보 프렛이 높은 코드(=3프렛 이상에만 보이싱이 있어 오픈 포지션이 불가능한 코드)가 있으면
  // 그 코드(최저 프렛 후보)를 고정 시작점으로 삼고, 나머지는 오픈 고정을 풀어(정적+패턴 전부 후보) 그 위치 근처 보이싱을 고른다.
  // 그런 코드가 없으면(모두 낮은 프렛 후보가 있음) 기존 규칙 그대로.
  const BOTTLENECK_FRET = 3;
  // opts: {cyclic: true(기본, 마지막→처음 이동 비용 포함) | false(한 번만 재생: 순환 비용 없음), topW/bassW: 탑노트·베이스 이동 가중(반음당)}
  function pick(steps, keyIdx, opts) {
    cfg = Object.assign({ topW: 0, bassW: 0, cyclic: true }, opts);
    dropOpen = false;
    const n = steps.length;
    let a = -1, aLow = -1;
    for (let i = 0; i < n; i++) {
      const c = ProgressionVoicings.getCandidates(steps[i].root, steps[i].quality, -1, steps[i].bass ?? undefined, steps[i].tension ?? undefined);
      if (!c.length) return null;
      const low = Math.min(...c.map(fret));
      if (low > aLow) { aLow = low; a = i; }
    }
    if (a < 0 || aLow < BOTTLENECK_FRET) return pickLinear(steps, keyIdx);
    dropOpen = true;
    if (!cfg.cyclic) return pickAnchored(steps, a);
    const rotated = steps.slice(a).concat(steps.slice(0, a));
    const res = pickLinear(rotated, -1);
    if (!res) return null;
    return steps.map((_, i) => res[(i - a + n) % n]);
  }

  // 한 방향 사슬: start 보이싱에서 출발해 lists를 차례로 잇는 최소 비용 경로(순환 비용 없음)
  function chain(start, lists) {
    if (!lists.length) return [];
    let dp = lists[0].map(c => dist(start, c));
    const tr = [lists[0].map(() => 0)];
    for (let i = 1; i < lists.length; i++) {
      const ndp = [], ntr = [];
      lists[i].forEach(c => {
        let best = Infinity, bk = 0;
        lists[i - 1].forEach((p, k) => {
          const cost = dp[k] + dist(p, c);
          if (cost < best || (cost === best && fret(p) < fret(lists[i - 1][bk]))) { best = cost; bk = k; }
        });
        ndp.push(best); ntr.push(bk);
      });
      dp = ndp; tr.push(ntr);
    }
    let j = 0;
    dp.forEach((v, k) => { if (v < dp[j] || (v === dp[j] && fret(lists[lists.length - 1][k]) < fret(lists[lists.length - 1][j]))) j = k; });
    const out = new Array(lists.length);
    for (let i = lists.length - 1; i >= 0; i--) { out[i] = lists[i][j]; j = tr[i][j]; }
    return out;
  }

  // 병목 코드(a)를 최저 프렛 보이싱으로 고정하고, 앞뒤로 뻗어 나가는 두 사슬을 각각 잇는다(마지막→처음 연결 없음)
  function pickAnchored(steps, a) {
    const cands = steps.map(s => noOpen(ProgressionVoicings.getCandidates(s.root, s.quality, -1, s.bass ?? undefined, s.tension ?? undefined)));
    const anchor = cands[a].reduce((x, y) => fret(x) <= fret(y) ? x : y);
    const right = chain(anchor, cands.slice(a + 1));
    const left = chain(anchor, cands.slice(0, a).reverse()).reverse();
    return left.concat([anchor], right);
  }

  function pickLinear(steps, keyIdx) {
    const n = steps.length;
    if (!n) return [];
    const cands = steps.map(s => { const c = ProgressionVoicings.getCandidates(s.root, s.quality, keyIdx, s.bass ?? undefined, s.tension ?? undefined); return dropOpen ? noOpen(c) : c; });
    if (cands.some(c => !c.length)) return null;

    const first = cands[0].reduce((a, b) => fret(a) <= fret(b) ? a : b);
    if (n === 1) return [first];

    let dp = cands[1].map(c => dist(first, c));
    const track = new Array(n);
    track[1] = cands[1].map(() => 0);
    for (let i = 2; i < n; i++) {
      const ndp = [], ntr = [];
      for (let j = 0; j < cands[i].length; j++) {
        let best = Infinity, bk = 0;
        for (let k = 0; k < cands[i - 1].length; k++) {
          const cost = dp[k] + dist(cands[i - 1][k], cands[i][j]);
          if (cost < best || (cost === best && fret(cands[i - 1][k]) < fret(cands[i - 1][bk]))) { best = cost; bk = k; }
        }
        ndp.push(best); ntr.push(bk);
      }
      dp = ndp; track[i] = ntr;
    }
    let bestJ = 0, bestCost = Infinity;
    cands[n - 1].forEach((c, j) => {
      const t = dp[j] + (cfg.cyclic ? dist(c, first) : 0);
      if (t < bestCost || (t === bestCost && fret(c) < fret(cands[n - 1][bestJ]))) { bestCost = t; bestJ = j; }
    });
    const choice = new Array(n);
    choice[n - 1] = bestJ;
    for (let i = n - 1; i >= 2; i--) choice[i - 1] = track[i][choice[i]];
    return cands.map((c, i) => i === 0 ? first : c[choice[i]]);
  }

  return { pick, _cfg: cfg };
})();
