/**
 * voicing-library.js  — 코드명 추천 데이터 등록
 * ─────────────────────────────────────────────
 * chord-voicings.js 의 CHORD_STATIC / CHORD_PATTERN 을 단일 소스로 사용.
 * 로드 순서: app.js → chord-voicings.js → chords-library.js → voicing-library.js
 */
(function () {

  // ── 패턴 파싱 헬퍼 ──────────────────────────────────────────
  function parsePatStr(str) {
    return str.trim().split(/\s+/).map(t => {
      if (t === 'x') return null;
      if (/^\d+$/.test(t)) return parseInt(t, 10);
      return t; // 'r', 'r+2', 'r-1' 등
    });
  }

  function evalPat(tokens, r) {
    return tokens.map(p => {
      if (p === null) return null;
      if (typeof p === 'number') return p;
      if (p === 'r') return r;
      const m = String(p).match(/^r([+-]\d+)$/);
      if (m) return r + parseInt(m[1], 10);
      return parseInt(p, 10);
    });
  }

  // ── 1. 정적 보이싱 (CHORD_STATIC) ──────────────────────────
  // 형식: [ frets문자열, names배열, fingers문자열, quality, fretNumber? ]
  const STATIC = window.CHORD_STATIC || [];
  STATIC.forEach(([fretsStr, names]) => {
    chordSuggester.addVoicing(fretsStr, names);
  });

  // ── 2. 패턴 보이싱 (CHORD_PATTERN) ─────────────────────────
  // r = 0 ~ 15 순회하여 실제 프렛 배열 + 코드명 생성
  const PATTERN = window.CHORD_PATTERN || [];
  PATTERN.forEach(pat => {
    const tokens = parsePatStr(pat.pattern);
    for (let r = 0; r <= 15; r++) {
      const frets = evalPat(tokens, r);
      if (frets.some(f => f !== null && f < 0)) continue;
      const sharpName = pat.name(r, false);
      const flatName  = pat.name(r, true);
      chordSuggester.addVoicing(frets, [sharpName], [flatName]);
    }
  });

})();
