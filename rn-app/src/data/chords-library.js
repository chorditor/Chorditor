// ═══════════════════════════════════════════════════════════════
// chords-library.js  — 코드 라이브러리 빌더
// 보이싱 원본 데이터: chord-voicings.js (반드시 먼저 로드)
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 음정 헬퍼 ────────────────────────────────────────────────
  // 줄 인덱스 (0=6번줄, 1=5번줄, ..., 5=1번줄) 기준 개방 음 피치 클래스
  const _PCS = [4, 9, 2, 7, 11, 4];
  const _S   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const _F   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // fn(줄인덱스, 프렛, flat?) → 음이름
  function fn(si, fret, flat = false) {
    return (flat ? _F : _S)[(_PCS[si] + fret) % 12];
  }
  // chord-voicings.js의 name 함수에서 음이름 계산에 사용할 수 있도록 전역 노출
  // 줄 인덱스: 0=6번줄(E), 1=5번줄(A), 2=4번줄(D), 3=3번줄(G), 4=2번줄(B), 5=1번줄(e)
  window.chordNoteName = fn;

  // 플랫 근음 → 샵 근음 정규화 (라이브러리 키 분류용)
  const FLAT_TO_SHARP = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };

  // 샵 음이름 → 플랫 음이름 자동 변환 (STATIC flatName 생성용)
  const SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
  function toFlatName(name) {
    return name.replace(/[A-G]#/g, m => SHARP_TO_FLAT[m] || m);
  }

  // quality → 코드명 접미사 ('M'은 빈 문자열)
  const Q_SUFFIX = {
    'M':'', 'm':'m', 'M7':'M7', '7':'7', 'm7':'m7',
    'sus4':'sus4', '7sus4':'7sus4', 'add9':'add9', 'sus2':'sus2',
    'aug':'aug', 'dim':'dim', 'aug7':'aug7', 'dim7':'dim7',
    'm7(b5)':'m7(b5)', '6':'6', 'm6':'m6',
  };

  // ── 품질 정렬 순서 ────────────────────────────────────────────
  const QUALITY_ORDER = [
    'M', 'm', 'M7', '7', 'm7', 'sus4', '7sus4', 'add9',
    'sus2', 'aug', 'dim', 'aug7', 'dim7', 'm7(b5)', '6', 'm6',
    'slash', 'hybrid', 'tension',  // 후순위 — 분수 → 하이브리드 → 텐션
  ];

  // ── 파싱 헬퍼 ────────────────────────────────────────────────

  // 'x 3 2 0 1 0'  → [null, 3, 2, 0, 1, 0]
  // 'x r r+2 r r'  → [null, 'r', 'r+2', 'r', 'r']  (패턴 토큰 보존)
  function parseTokens(str) {
    return str.trim().split(/\s+/).map(t => {
      if (t === 'x') return null;
      if (/^\d+$/.test(t)) return parseInt(t, 10);
      return t; // 'r', 'r+2', 'r-1' 등 패턴 토큰
    });
  }

  // 'x 1 3 2 x x' → [null, 1, 3, 2, null, null]
  function parseFingers(str) {
    return str.trim().split(/\s+/).map(t => {
      if (t === 'x' || t === '0') return null;
      if (t === 'T') return 'T';
      return parseInt(t, 10);
    });
  }

  // 패턴 토큰 배열 + r값 → 실제 프렛 배열
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

  // Rule 4: 바레 프렛보다 작은 실제 프렛 값이 있는 현은 바레 범위에서 제외
  // min/max 양쪽에서 fret < barreFret 인 경우 범위 축소 → 범위가 역전되면 null 반환
  function applyBarreRule4(range, frets, barreFret) {
    if (!range) return null;
    let { min, max } = range;
    while (min <= max && frets[min] !== null && frets[min] < barreFret) min++;
    while (max >= min && frets[max] !== null && frets[max] < barreFret) max--;
    return min <= max ? { min, max } : null;
  }

  // frets 배열 → openMute 배열 자동 추론
  // null → 'mute'(×), 0 → 'open'(○), 양수 → null(dot)
  function deriveOpenMute(frets) {
    return frets.map(f => {
      if (f === null) return 'mute';
      if (f === 0)   return 'open';
      return null;
    });
  }

  // ── 라이브러리 빌드 ──────────────────────────────────────────
  function buildLibrary() {
    const lib = {};
    const ALL_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

    const STATIC  = window.CHORD_STATIC  || [];
    const PATTERN = window.CHORD_PATTERN || [];

    // 1) 패턴 보이싱 ─────────────────────────────────────────
    PATTERN.forEach(pat => {
      // 입력: 6번줄→1번줄 순 / 캔버스: 1번줄→6번줄 순 → 반전
      const tokens    = parseTokens(pat.pattern).reverse();
      const fingerArr = parseFingers(pat.fingers).reverse();
      const si        = 6 - pat.rootStr;  // 줄 인덱스 (6번줄=0, 5번줄=1, ...)
      const suffix    = Q_SUFFIX[pat.quality] ?? pat.quality;
      const nameFn    = pat.name || ((r, flat) => fn(si, r, flat) + suffix);
      const voicingLabel = `${pat.rootStr}번줄 바레`;

      for (let r = 0; r <= 11; r++) {
        const frets = evalPat(tokens, r);
        if (frets.some(f => f !== null && f < 0)) continue;

        const sharpName = nameFn(r, false);
        const flatName  = nameFn(r, true);
        const rootNote  = sharpName.match(/^([A-G]#?)/)?.[1] ?? sharpName[0];
        if (!lib[rootNote]) lib[rootNote] = [];

        // ── 바레 프렛 탐지 + 커버 범위 결정 ──────────────────────
        // barre: true 이더라도 바레가 걸리는 실제 프렛은 r이 아닐 수 있다.
        // 손가락 번호 1이 2회 이상 등장하는 포지션의 실제 프렛을 바레 프렛으로 결정.
        //
        // 커버 범위(바레 라인 그림 범위) 규칙 (canvas 인덱스 0=1번줄 기준):
        //  Rule 1/3: canvas 0(1번줄)부터 연속 non-null 블록 안에 1이 2개 이상 → min=0, max=가장 먼 1의 위치
        //  Rule 2  : 그 외 → min=첫번째 1, max=마지막 1
        let barreObj = {};
        let barreRange = null;
        if (pat.barre) {
          const oneIdxs = fingerArr.reduce((acc, f, i) => { if (f === 1) acc.push(i); return acc; }, []);
          const barreFret = oneIdxs.length >= 2 ? (frets[oneIdxs[0]] ?? r) : r;
          barreObj = { [barreFret]: true };

          if (oneIdxs.length >= 2) {
            // canvas 0부터 연속 non-null 블록 끝 계산
            let blockEnd = -1;
            for (let i = 0; i < frets.length; i++) {
              if (frets[i] === null) break;
              blockEnd = i;
            }
            const oneInBlock = oneIdxs.filter(i => i <= blockEnd);
            if (blockEnd >= 0 && oneInBlock.length >= 2) {
              // Rule 1/3: 1번줄(canvas 0)부터 전체에서 가장 먼 1번 손가락 위치까지
              barreRange = { min: 0, max: Math.max(...oneIdxs) };
            } else {
              // Rule 2: 첫 1번 손가락 ~ 마지막 1번 손가락
              barreRange = { min: Math.min(...oneIdxs), max: Math.max(...oneIdxs) };
            }
            // Rule 4: 바레 프렛보다 작은 실제 프렛 값이 있는 현은 바레 범위에서 제외
            barreRange = applyBarreRule4(barreRange, frets, barreFret);
          }
        }
        const openMute  = frets.map(f => f === null ? 'mute' : null);
        // 패턴 보이싱: fretNumber 직접 지정 시 사용, 생략 시 Math.max(2, r+1)
        // fretNumber는 슬롯2 위치의 프렛 번호 → 슬롯1 = r이 되려면 r+1 필요
        const minFret   = pat.fretNumber !== undefined ? pat.fretNumber : Math.max(2, r + 1);

        const patEntry = {
          quality:      pat.quality,
          voicingLabel,
          frets,
          fingering:    fingerArr,
          barre:        barreObj,
          barreRange,
          openMute,
          fretNumber:   minFret,
          name:         sharpName,
          flatName,
          source:       'pattern',
        };
        lib[rootNote].push(patEntry);
      }
    });

    // 2) 정적 보이싱 ─────────────────────────────────────────
    STATIC.forEach(([fretsStr, names, fingersStr, quality, fretNum, opts]) => {
      // 입력: 6번줄→1번줄 순 / 캔버스: 1번줄→6번줄 순 → 반전
      const frets   = parseTokens(fretsStr).reverse();
      const fingers = parseFingers(fingersStr).reverse();
      const openMute  = deriveOpenMute(frets);
      const positives = frets.filter(f => f !== null && f > 0);
      // fretNum 직접 지정 시 사용, 생략 시 최솟값 자동 계산
      const minFret   = fretNum !== undefined ? fretNum
                      : (positives.length ? Math.min(...positives) : 0);

      // ── opts.barre: true → PATTERN과 동일한 Rules 1/2/3 바레 탐지 ──
      let staticBarre = {};
      let staticBarreRange = null;
      if (opts?.barre) {
        const oneIdxs = fingers.reduce((acc, f, i) => { if (f === 1) acc.push(i); return acc; }, []);
        if (oneIdxs.length >= 2) {
          const barreFret = frets[oneIdxs[0]];
          if (barreFret != null && barreFret > 0) {
            staticBarre = { [barreFret]: true };
            let blockEnd = -1;
            for (let i = 0; i < frets.length; i++) {
              if (frets[i] === null) break;
              blockEnd = i;
            }
            const oneInBlock = oneIdxs.filter(i => i <= blockEnd);
            if (blockEnd >= 0 && oneInBlock.length >= 2) {
              staticBarreRange = { min: 0, max: Math.max(...oneIdxs) };
            } else {
              staticBarreRange = { min: Math.min(...oneIdxs), max: Math.max(...oneIdxs) };
            }
            // Rule 4: 바레 프렛보다 작은 실제 프렛 값이 있는 현은 바레 범위에서 제외
            staticBarreRange = applyBarreRule4(staticBarreRange, frets, barreFret);
          }
        }
      }

      names.forEach(name => {
        // 코드명 첫 토큰에서 근음 추출 (슬래시 코드는 분자 기준)
        const rootMatch = name.match(/^([A-G][#b]?)/);
        const rootNote  = rootMatch ? rootMatch[1] : name[0];
        // 플랫 근음 → 샵으로 정규화하여 라이브러리 키 분류
        const rootKey   = FLAT_TO_SHARP[rootNote] || rootNote;
        if (!lib[rootKey]) lib[rootKey] = [];

        // opts.flat: true → 샵 음이름을 플랫으로 자동 변환하여 flatName 생성
        const flatName = opts?.flat ? toFlatName(name) : name;

        const staticEntry = {
          quality,
          voicingLabel: 'Open',
          frets,
          fingering:    fingers,
          barre:        staticBarre,
          barreRange:   staticBarreRange,
          openMute,
          fretNumber:   minFret,
          name,
          flatName,
          source:       'static',
        };
        lib[rootKey].push(staticEntry);
      });
    });

    // 3) 각 근음별 정렬: 1차 품질 우선순위 → 2차 프렛번호 오름차순
    ALL_ROOTS.forEach(root => {
      if (!lib[root]) return;
      lib[root].sort((a, b) => {
        const ai = QUALITY_ORDER.indexOf(a.quality);
        const bi = QUALITY_ORDER.indexOf(b.quality);
        const av = ai === -1 ? 999 : ai;
        const bv = bi === -1 ? 999 : bi;
        if (av !== bv) return av - bv;
        if ((a.fretNumber ?? 0) !== (b.fretNumber ?? 0))
          return (a.fretNumber ?? 0) - (b.fretNumber ?? 0);
        // 동일 quality + 동일 fretNumber → CHORD_STATIC 우선
        const sa = a.source === 'static' ? 0 : 1;
        const sb = b.source === 'static' ? 0 : 1;
        return sa - sb;
      });
    });

    // 4) 동일 보이싱(name + frets) 병합 → fingerings[] 배열로 통합
    // CHORD_STATIC / CHORD_PATTERN 소스 무관하게 동일 fret 위치 + 동일 코드명이면 운지만 다른 것으로 처리
    ALL_ROOTS.forEach(root => {
      if (!lib[root]) return;
      const merged = [];
      const keyMap = new Map();
      lib[root].forEach(entry => {
        const key = entry.name + '§' + entry.frets.join(',');
        if (keyMap.has(key)) {
          keyMap.get(key).fingerings.push(entry.fingering);
          keyMap.get(key).barres.push(entry.barre);
          keyMap.get(key).barreRanges.push(entry.barreRange);
        } else {
          entry.fingerings   = [entry.fingering];
          entry.barres       = [entry.barre];
          entry.barreRanges  = [entry.barreRange];
          keyMap.set(key, entry);
          merged.push(entry);
        }
      });
      lib[root] = merged;
    });

    return lib;
  }

  // ── 품질 → 에디터 코드 구성요소 매핑 ─────────────────────────
  window.qualityToComponents = function(quality) {
    const map = {
      'M':      { triad: '',     seventh: '',    func: '',      tensions: [] },
      'm':      { triad: 'm',    seventh: '',    func: '',      tensions: [] },
      'M7':     { triad: '',     seventh: 'M7',  func: '',      tensions: [] },
      '7':      { triad: '',     seventh: '7',   func: '',      tensions: [] },
      'm7':     { triad: 'm',    seventh: '7',   func: '',      tensions: [] },
      'sus4':   { triad: '',     seventh: '',    func: 'sus4',  tensions: [] },
      '7sus4':  { triad: '',     seventh: '7',   func: 'sus4',  tensions: [] },
      'add9':   { triad: '',     seventh: '',    func: 'add9',  tensions: [] },
      'sus2':   { triad: '',     seventh: '',    func: 'sus2',  tensions: [] },
      'aug':    { triad: 'aug',  seventh: '',    func: '',      tensions: [] },
      'dim':    { triad: 'dim',  seventh: '',    func: '',      tensions: [] },
      'aug7':   { triad: 'aug',  seventh: '7',   func: '',      tensions: [] },
      'dim7':   { triad: 'dim',  seventh: '7',   func: '',      tensions: [] },
      'm7(b5)': { triad: 'm',    seventh: '7',   func: 'b5',    tensions: [] },
      'mM7':    { triad: 'm',    seventh: 'M7',  func: '',      tensions: [] },
      '6':      { triad: '',     seventh: '6',   func: '',      tensions: [] },
      'm6':     { triad: 'm',    seventh: '6',   func: '',      tensions: [] },
    };
    return map[quality] || { triad: '', seventh: '', func: '', tensions: [] };
  };

  window.chordsLibrary = buildLibrary();

})();
