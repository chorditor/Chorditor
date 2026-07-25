'use strict';
// ═══════════════════════════════════════════════════════════════
// progression-voicings.js — 코드 진행용 보이싱 룩업
//
// 데이터 소스: window.chordsLibrary (chords-library.js)
// 허용 목록:   progression-voicing-list.js
//              (PROGRESSION_ALLOWED_STATIC, isAllowedPatternVoicing)
// ═══════════════════════════════════════════════════════════════

const ProgressionVoicings = (() => {

  const NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTE_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  function _libKey(semitone) { return NOTE_SHARP[semitone]; }

  // 오픈 보이싱(static) 허용 키: C D E G A (반음 인덱스)
  const OPEN_VOICING_KEYS = new Set([0, 2, 4, 7, 9]);

  // 허용된 후보 보이싱 전부 반환 (static 우선, 그 다음 pattern)
  // 외부에서 cyclic DP 로 최적 선택
  // bass: 루트로부터의 반음 간격 (전위코드), undefined/null 이면 일반 보이싱
  function getCandidates(rootSemitone, quality, progressionKey, bass, tension) {
    const lib = window.chordsLibrary;
    if (!lib) return [];

    const key     = _libKey(rootSemitone);
    const entries = lib[key];
    if (!entries || !entries.length) return [];

    // ── 텐션코드: name 문자열 매칭 (quality:'tension' 버킷 내 특정 텐션만 선별) ──
    if (tension) {
      const qualSfx = { M:'', m:'m', '7':'7', M7:'M7', m7:'m7', '7sus4':'7sus4' };
      const sfx   = qualSfx[quality] ?? '';
      const nameS = NOTE_SHARP[rootSemitone] + sfx + tension;
      const nameF = NOTE_FLAT[rootSemitone]  + sfx + tension;
      const nameMatch = v => v.name === nameS || v.name === nameF ||
                             v.flatName === nameS || v.flatName === nameF;

      const matches  = entries.filter(v => v.quality === 'tension' && nameMatch(v));
      // static(오픈) 텐션 보이싱은 존재하지 않으므로 slash/일반 경로처럼 static 1개로 고정할 수 없음.
      // 매칭되는 pattern 후보를 전부 반환해 호출부(예: 최저 fret 선택 로직)가 직접 고르게 함.
      return matches.filter(v => isAllowedTensionVoicing(v));
    }

    // ── 전위코드(slash): name 문자열 매칭 ────────────────────────
    if (bass != null) {
      const qualSfx = { M:'', m:'m', '7':'7', M7:'M7', m7:'m7', dim:'dim', dim7:'dim7', aug:'aug' };
      const sfx      = qualSfx[quality] ?? '';
      const bassNorm = (rootSemitone + bass) % 12;
      const nameS    = NOTE_SHARP[rootSemitone] + sfx + '/' + NOTE_SHARP[bassNorm];
      const nameF    = NOTE_FLAT[rootSemitone]  + sfx + '/' + NOTE_FLAT[bassNorm];
      const nameMatch = v => v.name === nameS || v.name === nameF ||
                             v.flatName === nameS || v.flatName === nameF;

      const slashStatics  = entries.filter(v => isAllowedSlashStaticVoicing(v) && nameMatch(v));
      const slashPatterns = entries.filter(v => isAllowedSlashVoicing(v)  && nameMatch(v));

      if (OPEN_VOICING_KEYS.has(progressionKey ?? rootSemitone)) {
        return slashStatics.length ? [slashStatics[0]] : slashPatterns;
      }
      return slashStatics.length ? [...slashStatics, ...slashPatterns] : slashPatterns;
    }

    // ── 일반 보이싱 ──────────────────────────────────────────────
    const matches = entries.filter(v => v.quality === quality);
    if (!matches.length) return [];

    // EM7: 4번줄 바레 패턴 강제 우선 (static/6번줄 shape 등 다른 후보 배제)
    if (key === 'E' && quality === 'M7') {
      const forced = matches.filter(v => v.source === 'pattern' && v.voicingLabel === '4번줄 바레');
      if (forced.length) return forced;
    }

    const statics = matches.filter(v => isAllowedStaticVoicing(v));

    const patterns = matches.filter(v => isAllowedPatternVoicing(v));

    // C,D,E,G,A key: static 우선 고정 (1개), DP 선택지 오염 방지
    // 그 외 key: static + pattern 전부 후보 → DP가 최적 선택
    if (OPEN_VOICING_KEYS.has(progressionKey ?? rootSemitone)) {
      return statics.length ? [statics[0]] : patterns;
    }
    return statics.length ? [...statics, ...patterns] : patterns;
  }

  return { getCandidates };
})();
