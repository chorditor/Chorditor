'use strict';
// ═══════════════════════════════════════════════════════════════
// progression-parser.js — PROGRESSION_DATA → window.PROGRESSIONS 변환
// 의존: progression-data.js (먼저 로드)
// progression.html / progression-detail.html 공용
// ═══════════════════════════════════════════════════════════════
(function _buildProgressions() {
  const ROOT_MAP = {
    'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
    'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,
    'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
  };
  const QUALITY_SUFFIXES = ['dim7','dim','aug','M7','m7(b5)','m7','7sus4','7','sus4','sus2','m6','6','m','M',''];
  const QUALITY_FALLBACK = { '': 'M', 'M': 'M' };

  function _parseChordSimple(str) {
    let root, suffix;
    if (ROOT_MAP[str.slice(0, 2)] !== undefined && /[#b]/.test(str[1])) {
      root = str.slice(0, 2); suffix = str.slice(2);
    } else {
      root = str.slice(0, 1); suffix = str.slice(1);
    }
    const semitones = ROOT_MAP[root];
    if (semitones === undefined) {
      console.error('[progression-parser] 알 수 없는 근음:', str);
      return { semitones: 0, quality: 'M' };
    }
    for (const q of QUALITY_SUFFIXES) {
      if (suffix === q || (q === '' && suffix === ''))
        return { semitones, quality: QUALITY_FALLBACK[q] || q || 'M' };
    }
    console.error('[progression-parser] 알 수 없는 품질:', str);
    return { semitones, quality: 'M' };
  }

  // 텐션 표기 '(9)', '(#11)' 등을 코드문자열 끝에서 분리
  function _extractTension(part) {
    if (part.endsWith('m7(b5)')) return { base: part, tension: null };   // m7(b5)는 텐션이 아니라 코드 품질(QUALITY_SUFFIXES)
    const m = part.match(/(\([^)]*\))$/);
    if (!m) return { base: part, tension: null };
    return { base: part.slice(0, -m[1].length), tension: m[1] };
  }

  function parseChord(str) {
    // 전위코드 (slash chord): 'C/E', 'Am/C', 'C/G' 등
    const slashIdx = str.indexOf('/');
    if (slashIdx !== -1) {
      const chordPart = str.slice(0, slashIdx);
      const bassPart  = str.slice(slashIdx + 1).trim();
      const { base, tension } = _extractTension(chordPart);
      const { semitones, quality } = _parseChordSimple(base);
      const bassAbsC = ROOT_MAP[bassPart];
      if (bassAbsC === undefined) {
        console.error('[progression-parser] 알 수 없는 베이스음:', str);
        return { semitones, quality, tension };
      }
      // bass: 루트로부터의 반음 간격 (0-11)
      const bass = ((bassAbsC - semitones) + 12) % 12;
      return { semitones, quality, bass, tension };
    }
    const { base, tension } = _extractTension(str);
    return { ..._parseChordSimple(base), tension };
  }

  if (typeof PROGRESSION_DATA === 'undefined') {
    console.error('[progression-parser] PROGRESSION_DATA 없음');
    window.PROGRESSIONS = [];
    return;
  }

  window.PROGRESSIONS = PROGRESSION_DATA.map(prog => ({
    id:          prog.id,
    no:          prog.no ?? 1,
    recommended: prog.recommended ?? false,
    // 목록 카드 이름 예외(미지정 시 도수 숫자로 자동 생성, 예: "1364 진행")
    title:       prog.title ?? null,
    // 조성/모드 (C기준 작성). key=부모 장조 음명, mode=조성명. 미지정 시 C Major
    mode:        prog.mode ?? 'Major',
    key:         prog.key  ?? 'C',
    keySemitone: ROOT_MAP[prog.key ?? 'C'] ?? 0,
    roots: Array.isArray(prog.roots) ? prog.roots : (prog.roots ? [prog.roots] : []),
    steps: prog.steps.map(s => {
      const { semitones, quality, bass, tension } = parseChord(s.chord);
      return { semitones, quality, bass, tension };
    }),
  }));
})();

// 진행 이름(HTML) — 목록 카드 라벨·상세 페이지 타이틀 공용.
// 데이터에 title이 있으면 그대로, 없으면 도수 숫자만(예: C E7 Am F → "1364 진행").
// 앞 코드와 같은 반복은 건너뛰고 4코드씩 " / "로 묶음(8코드 → "1563 / 4145 진행").
// 도수 하나(반음 도수 b3·#4는 한 덩어리)씩 개별 span — 사이 간격은 .prog-num-group의 gap
window.getProgressionNameHtml = function (prog) {
  if (!prog) return '';
  if (prog.title) return prog.title;
  const DEG = { 0:'1', 1:'b2', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'#4', 7:'5', 8:'b6', 9:'6', 10:'b7', 11:'7' };
  const isRepeat = i => { const a = prog.steps[i - 1], b = prog.steps[i]; return a && a.semitones === b.semitones && a.quality === b.quality && (a.bass ?? null) === (b.bass ?? null) && (a.tension ?? null) === (b.tension ?? null); };
  const groups = [];
  prog.steps.forEach((step, i) => {
    const g = Math.floor(i / 4);
    (groups[g] = groups[g] || []);
    if (!isRepeat(i)) groups[g].push(DEG[((step.semitones % 12) + 12) % 12] ?? '?');
  });
  const numHtml = g => '<span class="prog-num-group">' + g.map(tok => '<span>' + tok + '</span>').join('') + '</span>';
  return groups.filter(g => g.length).map(numHtml).join(' / ') + ' 진행';
};
