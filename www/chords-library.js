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

  // ── 다이어그램 2번째 칸 규칙 ─────────────────────────────────
  // "불가능한 경우가 아니라면 근음(슬래시 코드는 베이스 음)이 있는 프렛이 항상 코드 다이어그램의 2번째 칸에 온다."
  // frets: 캔버스 순서(0=1번줄 … 5=6번줄). 반환: 2번째 칸의 프렛 번호(=라벨 숫자) / 불가능하면 null.
  //  불가능 = 근음 점이 없거나(개방현·뮤트) 1프렛이거나, 2번째 칸에 맞추면 다른 점이 1~4칸 밖으로 나가는 경우.
  const _CANVAS_PCS = [4, 11, 7, 2, 9, 4];
  const _NAME_PC = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
  function slotFretFor(frets, name) {
    if (!frets || !name) return null;
    const slash = name.lastIndexOf('/');
    const m = (slash >= 0 ? name.slice(slash + 1) : name).match(/^[A-G][#b]?/);
    if (!m) return null;
    const pc = _NAME_PC[m[0]];
    const pressed = frets.filter(f => f !== null && f > 0);
    if (pc === undefined || !pressed.length) return null;
    const mn = Math.min(...pressed), mx = Math.max(...pressed);
    for (let s = frets.length - 1; s >= 0; s--) {   // 낮은 줄(6번줄) 쪽 근음부터
      const f = frets[s];
      if (f === null || f < 2 || (_CANVAS_PCS[s] + f) % 12 !== pc) continue;
      const off = f - 2;
      if (mn - off >= 1 && mx - off <= 4) return f;
    }
    return null;
  }
  window.slotFretFor = slotFretFor;
  // 사전 항목 → 라벨(2번째 칸) 프렛 번호. 에디터/노트로 저장할 때 fretNumber로 쓴다.
  // 2번째 칸 규칙이 불가능한 항목은 예전 계산(pattern은 patternR+1, static은 fretNumber, 최소 2).
  window.entryLabelFret = function (e) {
    if (e.slotFret != null) return e.slotFret;
    return Math.max(2, e.source === 'pattern' ? (e.patternR ?? e.fretNumber) + 1 : e.fretNumber);
  };

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

  // ── 운지법(손가락 번호) 추천 순서 ─────────────────────────────
  // 프렛 문자열이 같으면(코드명·소스 무관) 같은 손모양이므로, 손가락 번호 후보를 하나의 풀로 모아
  // 중복을 없앤 뒤 아래 순서로 정렬해 같은 프렛 문자열을 쓰는 모든 항목에 똑같이 준다.
  //   1) FINGERING_FIRST 예외 표에 있으면 그 후보가 맨 앞
  //   2) 새끼손가락(4번)이 없는 후보가 먼저 — 4번을 쓰는 운지가 일반적으로 더 어렵다.
  //      (둘 다 4번이 있거나 둘 다 없으면 이 규칙은 판단하지 않는다)
  //   3) 나머지는 라이브러리 순서 — 정적(CHORD_STATIC) 먼저, 같은 소스끼리는 데이터 파일 순서
  // 예외 표: 프렛 문자열(6번줄→1번줄) → 먼저 추천할 손가락 번호.
  const FINGERING_FIRST = {
    '3 2 0 0 0 3': '3 2 x x x 4',  // G — 현업에선 2 1 x x x 3과 반반이지만 Gsus4·G7 등 G 계열과 손가락 배치가 이어지게
  };

  // ── 보이싱(프렛 배치) 추천 순서 ────────────────────────────────
  // 같은 코드 이름 안에서 보이싱을 아래 단계 순으로 늘어놓는다(이름이 다른 항목끼리의 자리는 바꾸지 않는다).
  //    1) 오픈코드 — 개방현(0프렛)을 하나라도 쓰는 보이싱. 안에서는 OPEN_FIRST(선호 모양) → 낮은 프렛 → 베이스 줄이 낮은(6번줄) 순
  //    2) 자주 쓰는 패턴 — COMMON_PATTERNS 와 모양이 같은 것. 근음 프렛이 낮은 순 → 근음 6·5·4번줄 순 → 표에 적힌 순(`>`)
  //    3) 기타 특수코드 패턴 — 패턴 소스인데 위 표에 없는 것. 낮은 프렛 → 베이스 줄 순
  //    4) 나머지(정적 보이싱 중 오픈이 아닌 것). 낮은 프렛 → 베이스 줄 순
  //    5) 잘 안 쓰는 정적 — chord-voicings.js 의 CHORD_STATIC_RARE 에서 온 것(잘 쓰는 정적·패턴과 같은 모양이면 제외)
  //    6) 안 쓰는 패턴 — 패턴 소스이면서 개방현이 3개 이상(패턴의 r이 낮아서 생기는 모양). OPEN_UNUSED_EXEMPT 에 적힌 것은 제외
  // 낮은 프렛 = 눌린 줄 중 가장 낮은 프렛(개방현 제외). 데이터의 fretNumber 는 표시 위치용이라 쓰지 않는다.
  // 모양 비교 표기: 6번줄→1번줄, 근음 줄의 프렛을 5로 옮긴 값.
  const COMMON_PATTERNS = {
    'M':      { 6: ['577655'], 5: ['x57775'], 4: ['xx5787'] },
    'm':      { 6: ['577555'], 5: ['x57765'], 4: ['xx5786'] },
    'sus4':   { 6: ['577755'], 5: ['x57785'], 4: ['xx5788'] },
    'sus2':   {                5: ['x57755'], 4: ['xx5785'] },
    'M7':     { 6: ['5x665x', '576655'], 5: ['x57675', 'x5767x'], 4: ['xx5777'] },
    '7':      { 6: ['575655', '5x565x'], 5: ['x57575', 'x5453x'], 4: ['xx5767'] },
    'm7':     { 6: ['5x555x', '577585'], 5: ['x57565', 'x5356x'], 4: ['xx5766'] },
    'm7(b5)': { 6: ['5x554x'],           5: ['x5656x'],           4: ['xx5666'] },
  };
  // 오픈코드 중 먼저 추천할 모양 — 프렛 문자열(6번줄→1번줄)
  const OPEN_FIRST = new Set([
    '0 2 2 0 3 0',   // Em7
  ]);
  // 개방현이 없어도 오픈코드처럼 맨 앞 단계에 둘 정적 보이싱 — 프렛 문자열(6번줄→1번줄)
  const STATIC_FIRST = new Set([
    'x x 3 2 1 1',   // F
  ]);
  // 개방현 3개 이상이어도 실제로 쓰이는 패턴 보이싱 — 프렛 문자열(6번줄→1번줄)
  const OPEN_UNUSED_EXEMPT = new Set([
    '0 2 2 2 0 0',   // Esus4
    'x 2 2 0 0 0',   // Em/B
    '0 2 0 1 2 0',   // E7(13)
  ]);
  // 이 quality 는 지금 순서가 이미 맞아서 건드리지 않는다
  const VOICING_ORDER_SKIP = new Set(['dim7']);

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

    // 운지 후보 풀: 프렛 문자열(6번줄→1번줄) → 후보들. 항목을 만들 때마다 poolAdd로 모은다
    const fretKey   = frets => frets.slice().reverse().map(f => f === null ? 'x' : f).join(' ');
    const fingerKey = fg    => fg.slice().reverse().map(f => f === null ? 'x' : f).join(' ');
    const pool = new Map();
    let poolSeq = 0;
    const poolAdd = e => {
      const k = fretKey(e.frets);
      if (!pool.has(k)) pool.set(k, []);
      pool.get(k).push({
        key: fingerKey(e.fingering), fingering: e.fingering, barre: e.barre, barreRange: e.barreRange,
        rank: (e.source === 'static' ? 0 : 1e6) + poolSeq++,   // 정적 먼저, 같은 소스끼리는 생성(=데이터 파일) 순서
      });
    };

    const STATIC  = window.CHORD_STATIC  || [];
    const RARE    = window.CHORD_STATIC_RARE || [];   // 잘 안 쓰는 정적 보이싱 — 추천 순서에서 뒤쪽
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

      for (let r = -1; r <= 11; r++) {
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
        // 패턴 보이싱: fretNumber 직접 지정 시 사용, 생략 시 실제 사용된 프렛 중 최솟값
        // (r 자체가 아니라 frets 최솟값 기준 — 토큰이 r+1 이상부터 시작하는 패턴도 정확히 반영,
        //  r=-1(개방현 포함) 케이스에서 fretNumber가 음수로 새는 것도 방지)
        const playedFrets = frets.filter(f => f !== null);
        const minFret   = pat.fretNumber !== undefined ? pat.fretNumber : Math.min(...playedFrets);

        const patEntry = {
          quality:      pat.quality,
          voicingLabel,
          frets,
          fingering:    fingerArr,
          barre:        barreObj,
          barreRange,
          openMute,
          fretNumber:   minFret,
          // 캔버스 드로잉 전용 — 패턴 변수 r 그대로. fretNumber(=실제 최소 프렛)는
          // 최소 토큰이 r+1 이상인 패턴에서 r과 달라지므로, offset/라벨 계산에 쓰면 한 칸 밀림.
          patternR:     r,
          name:         sharpName,
          flatName,
          source:       'pattern',
          rare:         false,
        };
        lib[rootNote].push(patEntry);
        poolAdd(patEntry);
      }
    });

    // 2) 정적 보이싱 ─────────────────────────────────────────
    STATIC.concat(RARE).forEach(([fretsStr, names, fingersStr, quality, fretNum, opts], rowIdx) => {
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
          rare:         rowIdx >= STATIC.length,   // CHORD_STATIC_RARE 에서 온 항목
        };
        lib[rootKey].push(staticEntry);
        poolAdd(staticEntry);
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
          const base = keyMap.get(key);
          base.fingerings.push(entry.fingering);
          base.barres.push(entry.barre);
          base.barreRanges.push(entry.barreRange);
          base.rare = !!base.rare && !!entry.rare;   // 잘 쓰는 정적·패턴과 겹치는 모양이면 "잘 안 쓰는" 취급 안 함
          // static source 우선 보존: pattern이 먼저 정렬돼도 static entry와 병합 시 source='static' 유지
          if (entry.source === 'static') {
            base.source      = 'static';
            base.fretNumber  = entry.fretNumber;
          }
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

    // 4-1) 보이싱 추천 순서 — 같은 코드 이름의 항목끼리만 자리를 바꾼다(그 이름 항목들이 차지하던 자리 안에서)
    const voicingKey = (e, idx) => {
      const key    = fretKey(e.frets);
      const zeros  = e.frets.filter(f => f === 0).length;
      const fretted = e.frets.filter(f => f !== null && f > 0);
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      let bass = 0;                                    // 가장 낮은 소리가 나는 줄(6번줄=6). 캔버스 배열은 0=1번줄
      for (let i = e.frets.length - 1; i >= 0; i--) if (e.frets[i] !== null) { bass = i + 1; break; }
      const bassRank = 6 - bass;                       // 6번줄 0, 5번줄 1, ...
      const pure = e.source === 'pattern';             // 정적 보이싱과 겹치지 않은 순수 패턴
      if (pure && zeros >= 3 && !OPEN_UNUSED_EXEMPT.has(key)) return [6, idx];
      if (e.rare) return [5, minFret, bassRank, idx];
      if (zeros >= 1 || STATIC_FIRST.has(key)) return [1, OPEN_FIRST.has(key) ? 0 : 1, minFret, bassRank, idx];
      const table = COMMON_PATTERNS[e.quality];
      if (table) {
        for (const rs of [6, 5, 4]) {
          const rootFret = e.frets[rs - 1];
          if (!table[rs] || rootFret == null || rootFret <= 0) continue;
          const shape = e.frets.slice().reverse().map(f => f === null ? 'x' : f - rootFret + 5).join('');
          const at = table[rs].indexOf(shape);
          if (at !== -1) return [2, rootFret, 6 - rs, at, idx];
        }
      }
      return [pure ? 3 : 4, minFret, bassRank, idx];
    };
    const cmpKey = (a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return (a[i] ?? -1) - (b[i] ?? -1);
      return 0;
    };
    ALL_ROOTS.forEach(root => {
      const list = lib[root];
      if (!list) return;
      const slots = new Map();   // 코드 이름 → 그 이름 항목들의 자리(index)
      list.forEach((e, i) => {
        if (VOICING_ORDER_SKIP.has(e.quality)) return;
        if (!slots.has(e.name)) slots.set(e.name, []);
        slots.get(e.name).push(i);
      });
      slots.forEach(idxs => {
        if (idxs.length < 2) return;
        const sorted = idxs.map(i => ({ e: list[i], k: voicingKey(list[i], i) })).sort((x, y) => cmpKey(x.k, y.k)).map(x => x.e);
        idxs.forEach((slot, n) => { list[slot] = sorted[n]; });
      });
    });

    // 5) 운지법 추천 순서 — 프렛 문자열이 같은 항목은 코드명·소스와 무관하게 같은 풀·같은 순서를 쓴다
    const orderedPool = new Map();
    const getOrdered = k => {
      if (orderedPool.has(k)) return orderedPool.get(k);
      const uniq = [];
      pool.get(k).slice().sort((a, b) => a.rank - b.rank).forEach(c => {
        const dup = uniq.find(u => u.key === c.key);
        if (!dup) { uniq.push(c); return; }
        // 같은 손가락 번호가 소스마다 바레 정보만 다르면, 바레 정보가 있는 쪽을 쓴다
        if (Object.keys(dup.barre).length === 0 && Object.keys(c.barre).length > 0) {
          dup.barre = c.barre; dup.barreRange = c.barreRange;
        }
      });
      const first = FINGERING_FIRST[k];
      const rankOf = c => (c.key === first ? 0 : 2) + (c.fingering.includes(4) ? 1 : 0);   // 예외 표 < 4번 없음 < 4번 있음
      const ordered = uniq.map((c, i) => ({ c, i })).sort((a, b) => rankOf(a.c) - rankOf(b.c) || a.i - b.i).map(x => x.c);
      orderedPool.set(k, ordered);
      return ordered;
    };
    ALL_ROOTS.forEach(root => {
      (lib[root] || []).forEach(entry => {
        const o = getOrdered(fretKey(entry.frets));
        entry.fingerings  = o.map(c => c.fingering);
        entry.barres      = o.map(c => c.barre);
        entry.barreRanges = o.map(c => c.barreRange);
        entry.fingering   = o[0].fingering;
        entry.barre       = o[0].barre;
        entry.barreRange  = o[0].barreRange;
        entry.slotFret    = slotFretFor(entry.frets, entry.name);   // 2번째 칸 규칙 (null = 불가능 → 예전 방식)
      });
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
