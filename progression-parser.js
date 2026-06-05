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
  const QUALITY_SUFFIXES = ['dim7','dim','aug','M7','m7','7','m','M',''];
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

  function parseChord(str) {
    // 전위코드 (slash chord): 'C/E', 'Am/C', 'C/G' 등
    const slashIdx = str.indexOf('/');
    if (slashIdx !== -1) {
      const chordPart = str.slice(0, slashIdx);
      const bassPart  = str.slice(slashIdx + 1).trim();
      const { semitones, quality } = _parseChordSimple(chordPart);
      const bassAbsC = ROOT_MAP[bassPart];
      if (bassAbsC === undefined) {
        console.error('[progression-parser] 알 수 없는 베이스음:', str);
        return { semitones, quality };
      }
      // bass: 루트로부터의 반음 간격 (0-11)
      const bass = ((bassAbsC - semitones) + 12) % 12;
      return { semitones, quality, bass };
    }
    return _parseChordSimple(str);
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
    // 조성/모드 (C기준 작성). key=부모 장조 음명, mode=조성명. 미지정 시 C Major
    mode:        prog.mode ?? 'Major',
    key:         prog.key  ?? 'C',
    keySemitone: ROOT_MAP[prog.key ?? 'C'] ?? 0,
    roots: Array.isArray(prog.roots) ? prog.roots : (prog.roots ? [prog.roots] : []),
    steps: prog.steps.map(s => {
      const { semitones, quality, bass } = parseChord(s.chord);
      return { semitones, quality, bass };
    }),
  }));
})();
