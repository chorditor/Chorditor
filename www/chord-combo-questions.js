// ═══════════════════════════════════════════════════════════════
// chord-combo-questions.js — 코드 조합 훈련 문제은행
// ═══════════════════════════════════════════════════════════════
//
// [표기 규칙 — 내부 로직용 도수 코드]
//   · 다이어토닉 3/4화음: I IIm V7 VIIdim VIIm7(b5) ...
//   · 슬래시코드: 분자/분모 둘 다 도수 (Ckey C/E → I/III)
//   · 세컨더리 도미넌트: UI 표기 V7/II 형태, 내부 코드는 아래 치환
//       V7/II → VI7 · V7/V → II7 · V7/VI → III7 · V7/III → VII7
//     (다이어토닉 자리는 minor/dim이라 표기 안 겹침)
//
// [난이도] 장(챕터) 전체 단위 3단계(low/mid/high). 장 안에서 문제별로 안 갈림.
//
// [문제 타입]
//   · placement    : { id, type:'placement', degrees:[...] }  degrees = 정답 순서
//   · substitution : { id, type:'substitution', baseDegrees, targetIndex, answerDegree, displayDegree }
// ═══════════════════════════════════════════════════════════════

// ── 제 1장: 패밀리코드 배치형 — 알고리즘 생성 ────────────────────
// 패밀리코드 기능 분류:
//   해결(resolution) : I, IIIm, VIm  (1·3·6도)
//   예비(preparation): IV, IIm        (4·2도)
//   긴장(tension)    : V, (VII)       (5·7도) — VII은 거의 안 쓰여 생략
// 규칙:
//   · 첫 코드는 긴장(V·VII)·3도(IIIm) 제외 → {I, IIm, IV, VIm}
//   · 같은 코드 연속 등장 금지 (한 칸 이상 떨어지면 중복 허용)
//   · 2도(IIm)·3도(IIIm)는 진행 전체에서 최대 1회만 등장 (연속 여부 무관)
//   · 길이 4
// 나열 대신 런타임 랜덤 생성(위 제약 전부 만족할 때까지 재시도).
const CH1_POOL       = ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];
const CH1_FIRST      = ['I', 'IIm', 'IV', 'VIm'];
const CH1_ONCE_ONLY  = ['IIm', 'IIIm']; // 최대 1회 등장 제한 대상

// 해결/예비/긴장 — 4개 진행 안에 각 기능이 최소 1번씩은 등장해야 함
const CH1_FUNC_GROUPS = [
  ['I', 'IIIm', 'VIm'], // 해결
  ['IV', 'IIm'],        // 예비
  ['V'],                 // 긴장
];

function _ch1CoversAllFunctions(seq) {
  return CH1_FUNC_GROUPS.every(group => seq.some(d => group.includes(d)));
}

// avoidSeqs: 이번 세션에서 이미 나온 진행들(도수 배열의 배열).
// 1단계: 전부 다 피하도록 시도(후보가 충분하면 10문제 전부 서로 다른 진행이 됨).
// 2단계: 후보 공간이 부족해 전부 피하지 못하면, 최소한 "바로 직전" 진행과는 겹치지 않게 폴백.
function generateCh1Progression(avoidSeqs) {
  avoidSeqs = avoidSeqs || [];
  const matches = (seq, other) => other && seq.every((d, i) => d === other[i]);

  function buildValidSeq() {
    let seq;
    do {
      seq = [CH1_FIRST[Math.floor(Math.random() * CH1_FIRST.length)]];
      for (let i = 1; i < 4; i++) {
        const used = seq.filter(d => CH1_ONCE_ONLY.includes(d));
        const candidates = CH1_POOL.filter(d => {
          if (d === seq[i - 1]) return false; // 연속 중복 금지
          if (CH1_ONCE_ONLY.includes(d) && used.includes(d)) return false; // 2도·3도 1회 제한
          if (seq[i - 1] === 'IIIm' && d === 'V') return false; // 3도→5도 연결 금지(잘 안 쓰고 어색함)
          if (seq[i - 1] === 'IIIm' && d === 'I') return false; // 3도→1도 연결 금지(어색함)
          return true;
        });
        seq.push(candidates[Math.floor(Math.random() * candidates.length)]);
      }
    } while (!_ch1CoversAllFunctions(seq)); // 해결·예비·긴장 각 1회 이상 등장할 때까지 재생성
    return seq;
  }

  let seq;
  for (let i = 0; i < 60; i++) {
    seq = buildValidSeq();
    if (!avoidSeqs.some(prev => matches(seq, prev))) return seq;
  }

  // 후보 소진 — 바로 직전 진행과만 다르면 됨
  const last = avoidSeqs[avoidSeqs.length - 1];
  for (let i = 0; i < 20 && matches(seq, last); i++) {
    seq = buildValidSeq();
  }
  return seq;
}

// ── key ↔ 코드명 변환 ────────────────────────────────────────
const CC_KEY_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CC_KEY_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// key 표기 규칙 (12키 기준):
//   # 표기: G D A E B F# C#
//   b 표기: Gb Db Ab Eb Bb F
//   자연음(C D E F G A B)은 두 목록에 동시 등장하지만 실제 표기는 어차피 동일(#/b 없음).
//   둘 다 목록에 있는 idx(1=C#/Db, 6=F#/Gb)만 진짜 선택지 → 랜덤.
//   한쪽 목록에만 있는 idx(3=Eb, 8=Ab, 10=Bb)는 그 표기로 고정.
const CC_FLAT_ONLY_KEYS = new Set([3, 5, 8, 10]);  // Eb F Ab Bb — flat 고정
const CC_EITHER_KEYS    = new Set([1, 6]);         // C#/Db, F#/Gb — 랜덤 선택

function pickUseFlatForKey(keyIdx) {
  if (CC_FLAT_ONLY_KEYS.has(keyIdx)) return true;
  if (CC_EITHER_KEYS.has(keyIdx)) return Math.random() < 0.5;
  return false; // 자연음 키 — sharp/flat 무관, 표기 동일
}

// ── 7장 전용: 마이너 key 표기 규칙(메이저와 조표 체계가 달라 별도 관리) ──
//   b 표기 고정: Cm Dm Fm Gm
//   # 표기 고정: C#m Em F#m Bm
//   양쪽 가능(랜덤): D#m/Ebm, G#m/Abm, A#m/Bbm, Am(자연음)
const CH7_FLAT_ONLY_KEYS  = new Set([0, 2, 5, 7]);   // Cm Dm Fm Gm
const CH7_SHARP_ONLY_KEYS = new Set([1, 4, 6, 11]);  // C#m Em F#m Bm

function pickUseFlatForCh7Key(keyIdx) {
  if (CH7_FLAT_ONLY_KEYS.has(keyIdx)) return true;
  if (CH7_SHARP_ONLY_KEYS.has(keyIdx)) return false;
  return Math.random() < 0.5; // D#m/Ebm, G#m/Abm, A#m/Bbm, Am — 둘 다 가능
}

// 도수별 루트 반음 오프셋 + 3화음/4화음 접미사·라벨 (메이저 다이어토닉 기준)
// quality/quality7: progression-voicings.js·chords-library.js가 쓰는 quality 코드('M' 'm' '7' 'M7' 'm7' 'dim' 'm7(b5)')
const CC_DEGREE_TRIAD = {
  I:      { offset: 0,  suffix: '',      label7: 'IM7',       suffix7: 'M7',     quality: 'M',   quality7: 'M7'     },
  IIm:    { offset: 2,  suffix: 'm',     label7: 'IIm7',      suffix7: 'm7',     quality: 'm',   quality7: 'm7'     },
  IIIm:   { offset: 4,  suffix: 'm',     label7: 'IIIm7',     suffix7: 'm7',     quality: 'm',   quality7: 'm7'     },
  IV:     { offset: 5,  suffix: '',      label7: 'IVM7',      suffix7: 'M7',     quality: 'M',   quality7: 'M7'     },
  V:      { offset: 7,  suffix: '',      label7: 'V7',        suffix7: '7',      quality: 'M',   quality7: '7'      },
  VIm:    { offset: 9,  suffix: 'm',     label7: 'VIm7',      suffix7: 'm7',     quality: 'm',   quality7: 'm7'     },
  VIIdim: { offset: 11, suffix: 'dim',   label7: 'VIIm7(b5)', suffix7: 'm7(b5)', quality: 'dim', quality7: 'm7(b5)' },

  // ── 세컨더리 도미넌트 (3장) — 난이도 무관 항상 도미넌트7th 고정 ──
  // 내부 키(VI7 등)는 대상 다이어토닉 코드와 같은 루트에 quality만 '7'로 치환한 것.
  // alwaysLabel: degreeToLabel에서 useSeventh 무관하게 항상 이 라벨(V7/II 등) 사용.
  VI7:  { offset: 9,  suffix: '7', label7: '7', suffix7: '7', quality: '7', quality7: '7', alwaysLabel: 'V7/II'  },
  VII7: { offset: 11, suffix: '7', label7: '7', suffix7: '7', quality: '7', quality7: '7', alwaysLabel: 'V7/III' },
  I7:   { offset: 0,  suffix: '7', label7: '7', suffix7: '7', quality: '7', quality7: '7', alwaysLabel: 'V7/IV'  },
  II7:  { offset: 2,  suffix: '7', label7: '7', suffix7: '7', quality: '7', quality7: '7', alwaysLabel: 'V7/V'   },
  III7: { offset: 4,  suffix: '7', label7: '7', suffix7: '7', quality: '7', quality7: '7', alwaysLabel: 'V7/VI'  },

  // ── 관련 IIm (Related II) — 4장. 세컨더리 도미넌트 루트+7반음(완전5도 위).
  // 타겟이 메이저(IV·V)면 m7, 마이너(IIm·IIIm·VIm)면 m7(b5). 로마자 표기는 항상 'IIm7'/'IIm7(b5)' 고정.
  RII_VI7:  { offset: 4,  suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: 'IIm7(b5)' }, // 타겟 IIm
  RII_VII7: { offset: 6,  suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: 'IIm7(b5)' }, // 타겟 IIIm
  RII_I7:   { offset: 7,  suffix: 'm7',     label7: 'm7',     suffix7: 'm7',     quality: 'm7',     quality7: 'm7',     alwaysLabel: 'IIm7'     }, // 타겟 IV
  RII_II7:  { offset: 9,  suffix: 'm7',     label7: 'm7',     suffix7: 'm7',     quality: 'm7',     quality7: 'm7',     alwaysLabel: 'IIm7'     }, // 타겟 V
  RII_III7: { offset: 11, suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: 'IIm7(b5)' }, // 타겟 VIm

  // ── 도미넌트의 대리코드 (5장) — 세컨더리 도미넌트 자리를 교체하는 3가지 대체 폼 ──
  // 디미니쉬7: 세컨더리 도미넌트의 3음(+4반음) 위에 쌓은 dim7. 트라이톤을 공유해 대체 가능.
  //   (G7→Bdim7과 같은 원리. VIIdim(기존 다이어토닉 vii 하프디미니쉬)와는 별개 — 여긴 풀디미니쉬7)
  //   상행(2→#IV→I 등)하는 패턴이므로 key 무관 항상 #으로만 표기(forceSharp).
  VI7_DIM7:  { offset: 1, suffix: 'dim7', label7: 'dim7', suffix7: 'dim7', quality: 'dim7', quality7: 'dim7', alwaysLabel: '#Idim7',  forceSharp: true }, // 타겟 IIm
  VII7_DIM7: { offset: 3, suffix: 'dim7', label7: 'dim7', suffix7: 'dim7', quality: 'dim7', quality7: 'dim7', alwaysLabel: '#IIdim7', forceSharp: true }, // 타겟 IIIm
  I7_DIM7:   { offset: 4, suffix: 'dim7', label7: 'dim7', suffix7: 'dim7', quality: 'dim7', quality7: 'dim7', alwaysLabel: 'IIIdim7', forceSharp: true }, // 타겟 IV
  II7_DIM7:  { offset: 6, suffix: 'dim7', label7: 'dim7', suffix7: 'dim7', quality: 'dim7', quality7: 'dim7', alwaysLabel: '#IVdim7', forceSharp: true }, // 타겟 V
  III7_DIM7: { offset: 8, suffix: 'dim7', label7: 'dim7', suffix7: 'dim7', quality: 'dim7', quality7: 'dim7', alwaysLabel: '#Vdim7',  forceSharp: true }, // 타겟 VIm

  // 대리 도미넌트(트라이톤 서브): 타겟 루트+1반음(bII of 타겟). 세컨더리 도미넌트(V7/x)와 같은 방식으로
  // 항상 'bII7/타겟' 고정(bII 부분은 안 바뀌고 /뒤 타겟만 바뀜). 프라이머리는 접미사 없이 'bII7'.
  // II→bII7→I 처럼 항상 하행하는 패턴이므로 key 무관 항상 b으로만 표기(forceFlat).
  // 모든 bII7은 항상 (#11) 텐션 코드로 등장 — quality:'tension'은 chord-voicings.js의
  // 전용 7(#11) 보이싱(quality:'tension', C7(#11) 패턴)과 매칭시키기 위함.
  VI7_SUBV:  { offset: 3,  suffix: '7(#11)', label7: '7(#11)', suffix7: '7(#11)', quality: 'tension', quality7: 'tension', alwaysLabel: 'bII7/II',  forceFlat: true }, // 타겟 IIm
  VII7_SUBV: { offset: 5,  suffix: '7(#11)', label7: '7(#11)', suffix7: '7(#11)', quality: 'tension', quality7: 'tension', alwaysLabel: 'bII7/III', forceFlat: true }, // 타겟 IIIm
  I7_SUBV:   { offset: 6,  suffix: '7(#11)', label7: '7(#11)', suffix7: '7(#11)', quality: 'tension', quality7: 'tension', alwaysLabel: 'bII7/IV',  forceFlat: true }, // 타겟 IV
  II7_SUBV:  { offset: 8,  suffix: '7(#11)', label7: '7(#11)', suffix7: '7(#11)', quality: 'tension', quality7: 'tension', alwaysLabel: 'bII7/V',   forceFlat: true }, // 타겟 V
  III7_SUBV: { offset: 10, suffix: '7(#11)', label7: '7(#11)', suffix7: '7(#11)', quality: 'tension', quality7: 'tension', alwaysLabel: 'bII7/VI',  forceFlat: true }, // 타겟 VIm

  // ── 마이너 패밀리코드 (7장) — 자연단조 다이어토닉 + 멜로딕/하모닉 마이너 차용 2개.
  // 전부 난이도 무관 항상 이 quality 고정(alwaysLabel도 고정) — 1~4장의 트라이어드/7화음 토글 없음.
  m_I:      { offset: 0,  suffix: 'm7',     label7: 'm7',     suffix7: 'm7',     quality: 'm7',     quality7: 'm7',     alwaysLabel: 'Im7'      },
  m_II:     { offset: 2,  suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: 'IIm7(b5)' },
  m_III:    { offset: 3,  suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bIIIM7'   },
  m_IV:     { offset: 5,  suffix: 'm7',     label7: 'm7',     suffix7: 'm7',     quality: 'm7',     quality7: 'm7',     alwaysLabel: 'IVm7'     },
  m_V:      { offset: 7,  suffix: '7',      label7: '7',      suffix7: '7',      quality: '7',      quality7: '7',      alwaysLabel: 'V7'       }, // 멜로딕 마이너 차용(자연단조는 Vm7)
  m_VI:     { offset: 8,  suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bVIM7'    },
  m_VII:    { offset: 10, suffix: '7',      label7: '7',      suffix7: '7',      quality: '7',      quality7: '7',      alwaysLabel: 'bVII7'    },
  m_VIIdim: { offset: 11, suffix: 'dim7',   label7: 'dim7',   suffix7: 'dim7',   quality: 'dim7',   quality7: 'dim7',   alwaysLabel: 'VIIdim7'  }, // 하모닉 마이너 차용

  // ── 모달 인터체인지 (8장) — I·IV·V 자리에 빌려올 수 있는 코드들. 여러 소스가 같은 코드를
  // 공유할 수 있어(예: bVIM7은 I·IV·V 전부 대상) 실제 코드 1개당 키 1개로 유일하게 관리.
  // 로마자 표기가 b면 코드명도 항상 b, #면 항상 #(key의 #/b 표기와 무관, forceFlat/forceSharp).
  mi_bIII:    { offset: 3,  suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bIIIM7',    forceFlat: true  },
  mi_shIVdim: { offset: 6,  suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: '#IVm7(b5)', forceSharp: true },
  mi_bVI:     { offset: 8,  suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bVIM7',     forceFlat: true  },
  mi_bII:     { offset: 1,  suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bIIM7',     forceFlat: true  },
  mi_IIdim:   { offset: 2,  suffix: 'm7(b5)', label7: 'm7(b5)', suffix7: 'm7(b5)', quality: 'm7(b5)', quality7: 'm7(b5)', alwaysLabel: 'IIm7(b5)'  },
  mi_IVm7:    { offset: 5,  suffix: 'm7',     label7: 'm7',     suffix7: 'm7',     quality: 'm7',     quality7: 'm7',     alwaysLabel: 'IVm7'      },
  mi_IVm6:    { offset: 5,  suffix: 'm6',     label7: 'm6',     suffix7: 'm6',     quality: 'm6',     quality7: 'm6',     alwaysLabel: 'IVm6'      },
  mi_bVII7:   { offset: 10, suffix: '7',      label7: '7',      suffix7: '7',      quality: '7',      quality7: '7',      alwaysLabel: 'bVII7',     forceFlat: true  },
  mi_bVIIM7:  { offset: 10, suffix: 'M7',     label7: 'M7',     suffix7: 'M7',     quality: 'M7',     quality7: 'M7',     alwaysLabel: 'bVIIM7',    forceFlat: true  },
};

// ── 슬래시(분수)코드 — 2장 대리코드·5장 세컨더리 도미넌트 1전위용 ──
// key: 도수표기('I/3' 등) → base(원본 도수) + bassOffset(루트로부터 반음, 장3도=4)
// labelSep: 라벨에서 base라벨과 '3' 사이 구분자(기본 '/'). 5장은 base라벨에 이미 '/'가 있어
// 겹치면 헷갈리므로(V7/II/3) 콤마로 구분 → 'V7/II,3'.
// 표기 = 베이스가 코드의 3음. 4화음이면 base가 M7 → 'CM7/E', 라벨 'IM7/3'.
const CC_SLASH_INFO = {
  'I/3':  { base: 'I',  bassOffset: 4 },
  'IV/3': { base: 'IV', bassOffset: 4 },
  'V/3':  { base: 'V',  bassOffset: 4 },
  // 5장: 세컨더리 도미넌트 1전위 (라벨 'V7/II,3' 형태)
  'VI7/3':  { base: 'VI7',  bassOffset: 4, labelSep: ',' },
  'VII7/3': { base: 'VII7', bassOffset: 4, labelSep: ',' },
  'I7/3':   { base: 'I7',   bassOffset: 4, labelSep: ',' },
  'II7/3':  { base: 'II7',  bassOffset: 4, labelSep: ',' },
  'III7/3': { base: 'III7', bassOffset: 4, labelSep: ',' },
};

// useSeventh=true면 4화음(7th) 표기/코드로 변환 (어려움 난이도용)
// useFlat: 세션 시작 시 1회 결정된 표기 방식(pickUseFlatForKey) 그대로 전달
function degreeToChordName(degree, keyIdx, useSeventh, useFlat) {
  const slash = CC_SLASH_INFO[degree];
  if (slash) {
    const baseName = degreeToChordName(slash.base, keyIdx, useSeventh, useFlat);
    const names    = useFlat ? CC_KEY_NAMES_FLAT : CC_KEY_NAMES_SHARP;
    const baseOff  = CC_DEGREE_TRIAD[slash.base].offset;
    const bassIdx  = (keyIdx + baseOff + slash.bassOffset + 12) % 12;
    return baseName + '/' + names[bassIdx];
  }
  const info = CC_DEGREE_TRIAD[degree];
  if (!info) return degree;
  // 5장 디미니쉬7/대리도미넌트: key의 #/b 표기와 무관하게 항상 고정 표기(forceSharp/forceFlat).
  const effectiveUseFlat = info.forceFlat ? true : info.forceSharp ? false : useFlat;
  const names = effectiveUseFlat ? CC_KEY_NAMES_FLAT : CC_KEY_NAMES_SHARP;
  const noteIdx = (keyIdx + info.offset + 12) % 12;
  return names[noteIdx] + (useSeventh ? info.suffix7 : info.suffix);
}

function degreeToLabel(degree, useSeventh) {
  const slash = CC_SLASH_INFO[degree];
  if (slash) return degreeToLabel(slash.base, useSeventh) + (slash.labelSep || '/') + '3';
  const info = CC_DEGREE_TRIAD[degree];
  if (!info) return degree;
  if (info.alwaysLabel) return info.alwaysLabel; // 세컨더리 도미넌트: 난이도 무관 고정 표기
  return useSeventh ? info.label7 : degree;
}

function getKeyDisplayName(keyIdx, useFlat) {
  return (useFlat ? CC_KEY_NAMES_FLAT : CC_KEY_NAMES_SHARP)[keyIdx];
}

// 메이저 스케일 7음 이름(다이어토닉) — key의 #/b 표기(useFlat)를 그대로 따라가면
// 표준 조표와 일치함(예: F key(useFlat)→F G A Bb C D E, G key(useSharp)→G A B C D E F#).
const CC_MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
function getMajorScaleNotes(keyIdx, useFlat) {
  const names = useFlat ? CC_KEY_NAMES_FLAT : CC_KEY_NAMES_SHARP;
  return CC_MAJOR_SCALE_OFFSETS.map(off => names[(keyIdx + off) % 12]);
}

// 자연단조 7음 — 7장 전용(useFlat은 pickUseFlatForCh7Key 표기 규칙 그대로 사용).
const CC_MINOR_SCALE_OFFSETS = [0, 2, 3, 5, 7, 8, 10];
function getMinorScaleNotes(keyIdx, useFlat) {
  const names = useFlat ? CC_KEY_NAMES_FLAT : CC_KEY_NAMES_SHARP;
  return CC_MINOR_SCALE_OFFSETS.map(off => names[(keyIdx + off) % 12]);
}

// ── 난이도별 key 후보 풀 (반음 인덱스, 0=C) ─────────────────────
const CC_DIFFICULTY_KEY_POOL = {
  low:  [0, 2, 4, 7, 9],               // C D E G A
  mid:  [0, 2, 4, 5, 7, 9, 10],        // C D E F G A Bb
  high: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 전체
};

function pickRandomKey(difficulty) {
  const pool = CC_DIFFICULTY_KEY_POOL[difficulty] || CC_DIFFICULTY_KEY_POOL.low;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 배열 셔플 (Fisher-Yates)
function _ccShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 1장 문제 1개 생성: key + 진행(도수/코드) + 트레이 카드블록 ──
// keyIdx/useFlat을 넘기면 그대로 고정 사용(세션 내내 동일), 없으면 새로 랜덤 선택.
// prevDegrees를 넘기면 그 진행과 동일한 진행은 재생성(직전 문제와 중복 방지).
function generateCh1Question(difficulty, keyIdx, useFlat, prevDegrees) {
  if (keyIdx == null) keyIdx = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);
  const useSeventh = difficulty === 'high'; // 어려움 난이도 = 4화음
  const degrees = generateCh1Progression(prevDegrees);
  const chords = degrees.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat));
  const labels = degrees.map(d => degreeToLabel(d, useSeventh));

  // 트레이: 기본 후보군(CH1_POOL 6개)을 키에 맞게 변환 후 셔플 — 순서대로면 바로 정답 유추 가능해서 랜덤 배치
  // VIIdim은 dim 보이싱이 라이브러리에 없어서(dim7만 존재) 후보에서 제외
  // → 진행에 쓰인 도수는 항상 CH1_POOL 부분집합이라 정답이 항상 포함됨
  const tray = _ccShuffle(CH1_POOL.map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, useSeventh, useFlat),
  })));

  return {
    keyIdx,
    keyName: getKeyDisplayName(keyIdx, useFlat),
    degrees,
    labels,
    chords,
    tray,
  };
}

// ── 제 2장: 패밀리코드의 대리코드 — 알고리즘 생성 ────────────────
// 1장 진행 1개를 가져와 4개 중 1개를 같은 역할의 대리코드로 교체.
//   · 배치형(placement)    : 교체된 진행을 트레이에서 순서 배치.
//   · 교체형(substitution) : 원본 진행 제시 → 강조된 1개를 대리코드로 바꾸기.
// 트레이는 두 타입 공통, 해당 난이도 등장가능 코드 전부(셔플).
// 역할 멤버 (슬래시 중간다리 포함). VIIdim=VIIm7(b5)는 dim 트라이어드 사운드 없어 7화음(high)만.
const CH2_ROLE_MEMBERS = {
  resolution:  ['I',  'IIIm',   'VIm', 'I/3'],
  preparation: ['IV', 'IIm',    'IV/3'],
  tension:     ['V',  'VIIdim', 'V/3'],
};
const CH2_DEGREE_ROLE = {
  I: 'resolution', IIIm: 'resolution', VIm: 'resolution',
  IV: 'preparation', IIm: 'preparation',
  V: 'tension',
};

// 특정 도수의 대리 후보 = 같은 역할의 다른 멤버들 (난이도 필터)
function ch2SubstitutesFor(degree, useSeventh) {
  const role = CH2_DEGREE_ROLE[degree];
  if (!role) return [];
  return CH2_ROLE_MEMBERS[role].filter(m =>
    m !== degree && (useSeventh || m !== 'VIIdim')
  );
}

// 난이도별 트레이 도수 풀. VIIdim(VIIm7b5)은 7화음만.
function ch2TrayPool(useSeventh) {
  const degs = ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'I/3', 'IV/3', 'V/3'];
  if (useSeventh) degs.push('VIIdim');
  return degs;
}

// type: 'placement' | 'substitution'
// keyIdx/useFlat 고정 사용(세션 내내 동일), prevDegrees로 직전 진행 중복 방지.
function generateCh2Question(type, difficulty, keyIdx, useFlat, prevDegrees) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);
  const useSeventh = difficulty === 'high';

  const base = generateCh1Progression(prevDegrees); // 원본 진행 4개

  // 정답이 분수코드(I/3·IV/3·V/3)인 문제 50% / 일반 대리코드인 문제 50%로 균형 배분.
  // V(긴장)는 low·mid에서 대리 후보가 V/3 하나뿐이라(dim 사운드 없음), 균형 안 잡으면
  // V가 타겟일 때마다 무조건 분수코드로 쏠림 — 타겟 자체를 정답 종류에 맞게 먼저 고름.
  const wantSlash = Math.random() < 0.5;
  const isSlashDeg = m => m.includes('/');
  const eligible = base
    .map((d, i) => i)
    .filter(i => ch2SubstitutesFor(base[i], useSeventh).some(m => isSlashDeg(m) === wantSlash));
  const pool = eligible.length ? eligible : base.map((d, i) => i); // 안전망(이론상 항상 존재)
  const targetIndex = pool[Math.floor(Math.random() * pool.length)];

  const subsAll = ch2SubstitutesFor(base[targetIndex], useSeventh);
  const subsTyped = subsAll.filter(m => isSlashDeg(m) === wantSlash);
  const subs       = subsTyped.length ? subsTyped : subsAll; // 안전망
  const substitute  = subs[Math.floor(Math.random() * subs.length)];

  // 트레이 (두 타입 공통): 해당 난이도 등장가능 코드 전부 셔플
  const tray = _ccShuffle(ch2TrayPool(useSeventh).map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, useSeventh, useFlat),
  })));
  const keyName = getKeyDisplayName(keyIdx, useFlat);

  if (type === 'placement') {
    const degrees = base.slice();
    degrees[targetIndex] = substitute;
    return {
      type: 'placement', targetIndex, keyIdx, keyName, degrees,
      labels: degrees.map(d => degreeToLabel(d, useSeventh)),
      chords: degrees.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat)),
      tray,
    };
  }

  // substitution: 원본 진행 제시 + 1개 강조 → 대리코드로 교체
  const originalChords = base.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat));
  const labels         = base.map(d => degreeToLabel(d, useSeventh));
  labels[targetIndex]  = degreeToLabel(substitute, useSeventh); // 강조 슬롯 라벨 = 대리 도수(~~~)
  return {
    type: 'substitution', targetIndex, keyIdx, keyName,
    baseDegrees: base,
    originalChords,
    labels,
    substituteDegree: substitute,
    substituteChord: degreeToChordName(substitute, keyIdx, useSeventh, useFlat),
    substituteLabel: degreeToLabel(substitute, useSeventh),
    tray,
  };
}

// ── 제 3장: 세컨더리 도미넌트 — 알고리즘 생성 ─────────────────────
// 1장 진행 1개를 가져와 "타겟" 앞 1칸을 세컨더리 도미넌트로 교체.
//   · 배치형(placement)    : 교체된 진행을 트레이에서 순서 배치.
//   · 교체형(substitution) : 원본 진행 제시 → 강조된 1개를 세컨더리 도미넌트로 바꾸기.
// 생성 규칙: 교체 대상 1개만 / 타겟 개념(교체 코드 바로 다음 칸이 타겟과 일치해야 함) /
//           첫 코드(index 0)는 세컨더리 도미넌트로 교체 불가 / 위 규칙 위반 진행은 재생성.
//           예외: 마지막 코드(index 3)는 진행 순환 반복 전제로 첫 코드를 타겟으로 하는 세컨더리 도미넌트 등장 가능(턴어라운드).
// 세컨더리 도미넌트 5개(다이어토닉엔 없는 V7/I 제외) — 타겟 도수 → 내부 코드.
const CH3_TARGET_TO_SECDOM = {
  IIm:  'VI7',   // V7/II  → VIm 대신 IIm 앞에서 VI7
  IIIm: 'VII7',  // V7/III
  IV:   'I7',    // V7/IV
  V:    'II7',   // V7/V
  VIm:  'III7',  // V7/VI
};

// 타겟 도수별 등장 가중치 — 실제 곡에서 자주 쓰이는 순서(6도>4도>2도>5도>3도)를 반영.
const CH3_TARGET_WEIGHT = { VIm: 5, IV: 4, IIm: 3, V: 2, IIIm: 1 };

// 가중치 기반 랜덤 선택 (weightFn이 0 이하 반환 시 최소 1로 보정)
function _ccWeightedPick(items, weightFn) {
  const weights = items.map(it => Math.max(1, weightFn(it)));
  const total   = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// 진행에서 "타겟 바로 앞(첫 코드 제외)" 위치들을 전부 찾음 → 교체 후보 인덱스 목록
// i는 2부터 시작 — position(=i-1)이 0(첫 코드)이 되지 않도록 함(첫 코드는 세컨더리 도미넌트 교체 불가).
// 예외: 마지막 코드(index 3)는 진행이 순환 반복된다는 전제로 첫 코드(다음 마디의 시작)를 타겟으로 허용(턴어라운드).
function ch3ValidPositions(seq) {
  const positions = [];
  for (let i = 2; i < seq.length; i++) {
    if (CH3_TARGET_TO_SECDOM[seq[i]]) positions.push(i - 1);
  }
  const lastIdx = seq.length - 1;
  if (CH3_TARGET_TO_SECDOM[seq[0]]) positions.push(lastIdx);
  return positions;
}

// 교체 위치의 타겟 도수 — 마지막 코드는 순환 예외로 첫 코드를 타겟으로 봄.
function ch3TargetDegree(seq, pos) {
  return pos === seq.length - 1 ? seq[0] : seq[pos + 1];
}

// 트레이: 기본 6개 + 세컨더리 도미넌트 5개 (난이도 무관 — 세컨더리 도미넌트는 항상 7화음 고정)
function ch3TrayPool() {
  return ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VI7', 'VII7', 'I7', 'II7', 'III7'];
}

// type: 'placement' | 'substitution'
// keyIdx/useFlat 고정 사용(세션 내내 동일), prevDegrees로 직전 진행 중복 방지.
// prevTarget: 직전 문제의 타겟 도수 — 연속으로 같은 타겟이 뽑히는 것을 최대한 회피.
function generateCh3Question(type, difficulty, keyIdx, useFlat, prevDegrees, prevTarget) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);
  const useSeventh = difficulty === 'high'; // 다이어토닉 코드에만 적용, 세컨더리 도미넌트는 항상 7화음

  // 타겟 도수를 먼저 가중치(6도>4도>2도>5도>3도)로 뽑고(문제당 1회 고정), 그 타겟이 유효 후보로
  // 존재하는 진행이 나올 때까지 base만 재생성. 타겟 자체를 매번 다시 뽑으면(예전 방식) 같은
  // 타겟이 연속으로 뽑혔을 때 그 타겟에 맞는 진행 후보가 적어 같은 문제로 수렴하는 문제가 있었음
  // → 타겟은 직전 문제와 다르게 뽑히도록 먼저 보정.
  const targetKeys = Object.keys(CH3_TARGET_TO_SECDOM);
  let desiredTarget = _ccWeightedPick(targetKeys, d => CH3_TARGET_WEIGHT[d]);
  for (let i = 0; i < 10 && prevTarget && desiredTarget === prevTarget; i++) {
    desiredTarget = _ccWeightedPick(targetKeys, d => CH3_TARGET_WEIGHT[d]);
  }

  let base, validPositions;
  do {
    base = generateCh1Progression(prevDegrees);
    validPositions = ch3ValidPositions(base).filter(pos => ch3TargetDegree(base, pos) === desiredTarget);
  } while (!validPositions.length);

  const targetIndex   = validPositions[Math.floor(Math.random() * validPositions.length)];
  const secDomDegree  = CH3_TARGET_TO_SECDOM[desiredTarget];

  // 트레이 (두 타입 공통)
  const tray = _ccShuffle(ch3TrayPool().map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, useSeventh, useFlat),
  })));
  const keyName = getKeyDisplayName(keyIdx, useFlat);

  if (type === 'placement') {
    const degrees = base.slice();
    degrees[targetIndex] = secDomDegree;
    return {
      type: 'placement', targetIndex, keyIdx, keyName, degrees,
      labels: degrees.map(d => degreeToLabel(d, useSeventh)),
      chords: degrees.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat)),
      tray, targetDegree: desiredTarget,
    };
  }

  // substitution: 원본 진행 제시 + 1개 강조 → 세컨더리 도미넌트로 교체
  const originalChords = base.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat));
  const labels          = base.map(d => degreeToLabel(d, useSeventh));
  labels[targetIndex]   = degreeToLabel(secDomDegree, useSeventh); // 강조 슬롯 라벨 = 대상 표기(V7/II 등)
  return {
    type: 'substitution', targetIndex, keyIdx, keyName,
    baseDegrees: base,
    originalChords,
    labels,
    substituteDegree: secDomDegree,
    substituteChord: degreeToChordName(secDomDegree, keyIdx, useSeventh, useFlat),
    substituteLabel: degreeToLabel(secDomDegree, useSeventh),
    tray, targetDegree: desiredTarget,
  };
}

// ── 제 4장: Rel. IIm-V-I — 알고리즘 생성 ───────────────────────
// 3장의 세컨더리 도미넌트 자리 바로 왼쪽 칸에 관련 IIm(related ii)를 추가로 비워 총 2칸 교체.
// 관련 IIm이 첫 코드(index 0) 자리가 되는 것은 허용(세컨더리 도미넌트 자리만 index 0 금지 — 3장 규칙 유지).
const CH4_SECDOM_TO_RELATED_II = {
  VI7:  'RII_VI7',   // 타겟 IIm(마이너)  → IIm7(b5)
  VII7: 'RII_VII7',  // 타겟 IIIm(마이너) → IIm7(b5)
  I7:   'RII_I7',    // 타겟 IV(메이저)   → IIm7
  II7:  'RII_II7',   // 타겟 V(메이저)    → IIm7
  III7: 'RII_III7',  // 타겟 VIm(마이너)  → IIm7(b5)
};

// 실제 음악 등장빈도 순서(VIm > IV > IIIm > V > IIm) — 3장과 다른 가중치.
const CH4_TARGET_WEIGHT = { VIm: 5, IV: 4, IIIm: 3, V: 2, IIm: 1 };

// 트레이: 3장 트레이(11개) + 관련 IIm 5개
// 4장 정답은 항상 세컨더리 도미넌트(7)·관련 IIm(m7·m7(b5)) 셋 중 하나 — 쉬움 난이도에서
// 트라이어드(다이어토닉 6개)까지 섞이면 후보가 불필요하게 늘어나서 다이어토닉은 트레이에서 제외.
function ch4TrayPool() {
  return [
    ...Object.values(CH3_TARGET_TO_SECDOM),
    ...Object.values(CH4_SECDOM_TO_RELATED_II),
  ];
}

// type: 'placement' | 'substitution'
// keyIdx/useFlat 고정 사용(세션 내내 동일), prevDegrees로 직전 진행 중복 방지.
// prevTarget: 직전 문제의 타겟 도수 — 연속으로 같은 타겟이 뽑히는 것을 최대한 회피(3장과 동일 이유).
function generateCh4Question(type, difficulty, keyIdx, useFlat, prevDegrees, prevTarget) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);
  const useSeventh = difficulty === 'high'; // 다이어토닉 코드에만 적용

  // 타겟은 문제당 1회 고정으로 뽑고(직전 문제와 다르게 보정), base만 성립할 때까지 재생성
  const targetKeys = Object.keys(CH4_TARGET_WEIGHT);
  let desiredTarget = _ccWeightedPick(targetKeys, d => CH4_TARGET_WEIGHT[d]);
  for (let i = 0; i < 10 && prevTarget && desiredTarget === prevTarget; i++) {
    desiredTarget = _ccWeightedPick(targetKeys, d => CH4_TARGET_WEIGHT[d]);
  }

  let base, validPositions;
  do {
    base = generateCh1Progression(prevDegrees);
    validPositions = ch3ValidPositions(base).filter(pos => ch3TargetDegree(base, pos) === desiredTarget);
  } while (!validPositions.length);

  const secDomIndex   = validPositions[Math.floor(Math.random() * validPositions.length)];
  const relIIIndex    = secDomIndex - 1; // 세컨더리 도미넌트 바로 왼쪽 칸(첫 코드여도 무방)
  const secDomDegree  = CH3_TARGET_TO_SECDOM[desiredTarget];
  const relIIDegree   = CH4_SECDOM_TO_RELATED_II[secDomDegree];
  const targetIndices = [relIIIndex, secDomIndex];

  // 트레이 (두 타입 공통)
  const tray = _ccShuffle(ch4TrayPool().map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, useSeventh, useFlat),
  })));
  const keyName = getKeyDisplayName(keyIdx, useFlat);

  if (type === 'placement') {
    const degrees = base.slice();
    degrees[relIIIndex]  = relIIDegree;
    degrees[secDomIndex] = secDomDegree;
    return {
      type: 'placement', targetIndices, keyIdx, keyName, degrees,
      labels: degrees.map(d => degreeToLabel(d, useSeventh)),
      chords: degrees.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat)),
      tray, targetDegree: desiredTarget,
    };
  }

  // substitution: 원본 진행 제시 + 관련 IIm·세컨더리 도미넌트 2칸을 빈칸으로 교체
  const originalChords = base.map(d => degreeToChordName(d, keyIdx, useSeventh, useFlat));
  const labels          = base.map(d => degreeToLabel(d, useSeventh));
  labels[relIIIndex]    = degreeToLabel(relIIDegree, useSeventh);
  labels[secDomIndex]   = degreeToLabel(secDomDegree, useSeventh);
  return {
    type: 'substitution', targetIndices, keyIdx, keyName,
    baseDegrees: base,
    originalChords,
    labels,
    substituteDegrees: [relIIDegree, secDomDegree],
    substituteChords: [
      degreeToChordName(relIIDegree, keyIdx, useSeventh, useFlat),
      degreeToChordName(secDomDegree, keyIdx, useSeventh, useFlat),
    ],
    substituteLabels: [
      degreeToLabel(relIIDegree, useSeventh),
      degreeToLabel(secDomDegree, useSeventh),
    ],
    tray, targetDegree: desiredTarget,
  };
}

// ── 제 5장: 도미넌트의 대리코드 — 알고리즘 생성 ───────────────────
// 4장 출제로직을 그대로 가져와 릴레이티드 IIm·세컨더리 도미넌트가 이미 반영된 진행을 만든 뒤,
// 그중 세컨더리 도미넌트 자리를 1전위·디미니쉬7·대리 도미넌트(트라이톤서브) 중
// 하나로 교체하는 문제(교체형, 2장과 동일한 "원본 제시 → 1칸 교체" 패턴). 릴레이티드 IIm 자리는 그대로 유지.
const CH5_SUBS_FOR = {
  VI7:  ['VI7/3',  'VI7_DIM7',  'VI7_SUBV'],
  VII7: ['VII7/3', 'VII7_DIM7', 'VII7_SUBV'],
  I7:   ['I7/3',   'I7_DIM7',   'I7_SUBV'],
  II7:  ['II7/3',  'II7_DIM7',  'II7_SUBV'],
  III7: ['III7/3', 'III7_DIM7', 'III7_SUBV'],
};

// 트레이: 5개 세컨더리 도미넌트 각각의 대체 폼 3가지 전부(15개) 셔플
function ch5TrayPool() {
  return Object.values(CH5_SUBS_FOR).flat();
}

// keyIdx/useFlat 고정 사용(세션 내내 동일), prevDegrees/prevTarget은 4장 로직에 그대로 전달.
function generateCh5Question(type, difficulty, keyIdx, useFlat, prevDegrees, prevTarget) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);
  const useSeventh = difficulty === 'high';

  // 릴레이티드 IIm 동반 여부 50:50 — 매번 4장 로직(IIm-V 연결)만 쓰면 그 진행이 압도적으로
  // 많아져서, 절반은 3장 로직(세컨더리 도미넌트 단독)으로 베이스를 삼음.
  const useRelII = Math.random() < 0.5;
  const base = useRelII
    ? generateCh4Question('substitution', difficulty, keyIdx, useFlat, prevDegrees, prevTarget)
    : generateCh3Question('substitution', difficulty, keyIdx, useFlat, prevDegrees, prevTarget);
  const targetIndex   = useRelII ? base.targetIndices[1] : base.targetIndex; // 세컨더리 도미넌트 자리
  const secDomDegree  = useRelII ? base.substituteDegrees[1] : base.substituteDegree;
  const bracketIndices = useRelII ? base.targetIndices : null; // 릴레이티드 IIm 있을 때만 브래킷 표기

  const subs      = CH5_SUBS_FOR[secDomDegree];
  const altDegree = subs[Math.floor(Math.random() * subs.length)];

  // 베이스 진행에 (릴레이티드 IIm·)세컨더리 도미넌트가 이미 반영된 상태로 표시.
  const baseDegrees    = base.baseDegrees.slice();
  const originalChords = base.originalChords.slice();
  if (useRelII) {
    base.targetIndices.forEach((idx, k) => {
      baseDegrees[idx]    = base.substituteDegrees[k];
      originalChords[idx] = base.substituteChords[k];
    });
  } else {
    baseDegrees[targetIndex]    = secDomDegree;
    originalChords[targetIndex] = base.substituteChord;
  }

  // 트레이 후보 전체(15개) — 실제 3줄 최대치로 자르는 건 렌더 시점에 _comboFitTray가 처리.
  const tray = _ccShuffle(ch5TrayPool().map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, useSeventh, useFlat),
  })));

  return {
    type: 'substitution', targetIndex, keyIdx, keyName: base.keyName,
    baseDegrees, originalChords,
    labels: base.labels, // (릴레이티드 IIm·)세컨더리 도미넌트 라벨 이미 반영됨
    substituteDegree: altDegree,
    substituteChord: degreeToChordName(altDegree, keyIdx, useSeventh, useFlat),
    substituteLabel: degreeToLabel(altDegree, useSeventh),
    bracketIndices,
    tray, targetDegree: base.targetDegree,
  };
}

// ── 제 6장: 텐션코드 1 — 알고리즘 생성 ─────────────────────────
// 1장 패밀리코드 진행(항상 7화음 고정)에서 1칸을 골라 어울리는 텐션코드로 바꾸는 문제.
// 도수별 사용 가능 텐션(같은 코드질이라도 도수별로 실제 어울리는 텐션이 다름 — IIm7/IIIm7은 13 제외).
const CH6_TENSIONS = {
  I:    ['9', '13'],
  IV:   ['9', '#11', '13'],
  IIm:  ['9', '11'],
  IIIm: ['11'],
  VIm:  ['9', '11'],
  V:    ['b9', '9', '#9', '#11', 'b13', '13'],
};
// 오답 후보 풀(전체 텐션 심볼 합집합) — 타겟 도수에 안 맞는 텐션도 섞여서 오답으로 나옴(실제 코드가 없어 무음).
const CH6_ALL_TENSIONS = ['b9', '9', '#9', '11', '#11', 'b13', '13'];

// 도수별 텐션 등장 빈도(실제 곡에서 쓰이는 비율 반영, 합 100). 정답 선택·나머지 3칸 랜덤부여 둘 다 이 가중치 사용.
// I·IV: 9가 압도적(80) > 13 > #11 / IIm·IIIm: 9·11 균등분배 / VIm: 9·11 위주 + 13 소량 / V: 골고루지만 9 > 13 > b9 > b13 > #9 > #11 순
const CH6_TENSION_WEIGHTS = {
  I:    { '9': 80, '13': 20 },
  IV:   { '9': 80, '13': 14, '#11': 6 },
  IIm:  { '9': 50, '11': 50 },
  IIIm: { '11': 100 },
  VIm:  { '9': 50, '11': 50 },
  V:    { '9': 25, '13': 20, 'b9': 18, 'b13': 15, '#9': 12, '#11': 10 },
};

// 가중치 기반 텐션 랜덤 선택. exclude로 특정 텐션 심볼 제외 가능(예: 마지막 칸 M7(#11) 금지).
function ch6PickWeightedTension(degree, exclude) {
  const weights = CH6_TENSION_WEIGHTS[degree];
  const entries = Object.entries(weights).filter(([t]) => t !== exclude);
  const total   = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of entries) {
    r -= w;
    if (r <= 0) return t;
  }
  return entries[0][0];
}

// 6장 전용 난이도별 key 풀(예외 — 다른 장과 다름, 모든 난이도 7화음 고정)
const CH6_DIFFICULTY_KEY_POOL = {
  low:  [0, 7],                                   // C G
  mid:  [0, 2, 4, 7, 9],                           // C D E G A
  high: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],    // 전체
};
function ch6PickRandomKey(difficulty) {
  const pool = CH6_DIFFICULTY_KEY_POOL[difficulty] || CH6_DIFFICULTY_KEY_POOL.low;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 6장 전용 진행 목록 — V는 항상 바로 다음에 I가 오는 패턴만(V7 텐션은 도미넌트→토닉 해결 문맥에서만 등장).
// 1장 규칙(해결/예비/긴장 각 1회 이상, 연속 중복 금지, IIm·IIIm 최대 1회, 첫 코드 V·IIIm 제외,
// IIIm→V·IIIm→I 연결 금지)은 그대로 유지한 채 V→I 강제 조건만 추가해 20개 손으로 큐레이션.
const CH6_PROGRESSIONS = [
  ['IV', 'IIm', 'V', 'I'],
  ['IIm', 'IV', 'V', 'I'],
  ['VIm', 'IV', 'V', 'I'],
  ['IV', 'VIm', 'V', 'I'],
  ['I', 'IIm', 'V', 'I'],
  ['VIm', 'IIm', 'V', 'I'],
  ['IIIm', 'IV', 'V', 'I'],
  ['I', 'IV', 'V', 'I'],
  ['IIm', 'I', 'V', 'I'],
  ['IIIm', 'IIm', 'V', 'I'],
  ['IV', 'V', 'I', 'VIm'],
  ['IIm', 'V', 'I', 'VIm'],
  ['VIm', 'V', 'I', 'IV'],
  ['VIm', 'V', 'I', 'IIm'],
  ['I', 'V', 'I', 'IV'],
  ['I', 'V', 'I', 'IIm'],
  ['IV', 'V', 'I', 'IIIm'],
  ['IIm', 'V', 'I', 'IIIm'],
  ['IIm', 'V', 'I', 'IV'],
  ['IV', 'V', 'I', 'IIm'],
];

// avoidSeqs 2단계 회피(1장 generateCh1Progression과 동일 패턴)
function generateCh6Progression(avoidSeqs) {
  avoidSeqs = avoidSeqs || [];
  const matches = (seq, other) => other && seq.every((d, i) => d === other[i]);

  let seq;
  for (let i = 0; i < 40; i++) {
    seq = CH6_PROGRESSIONS[Math.floor(Math.random() * CH6_PROGRESSIONS.length)];
    if (!avoidSeqs.some(prev => matches(seq, prev))) return seq;
  }

  const last = avoidSeqs[avoidSeqs.length - 1];
  for (let i = 0; i < 20 && matches(seq, last); i++) {
    seq = CH6_PROGRESSIONS[Math.floor(Math.random() * CH6_PROGRESSIONS.length)];
  }
  return seq;
}

// keyIdx/useFlat 고정 사용(세션 내내 동일), prevDegrees로 직전 진행 중복 방지.
function generateCh6Question(type, difficulty, keyIdx, useFlat, prevDegrees) {
  if (keyIdx == null)  keyIdx  = ch6PickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);

  // 타겟 후보: V(도미넌트, G7)는 모든 텐션이 다 어울려서 문제로 안 씀 → 후보에서 제외.
  const base = generateCh6Progression(prevDegrees);
  const candidates = base.map((d, i) => i).filter(i => base[i] !== 'V');
  const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];

  const targetDegree    = base[targetIndex];
  const validTensions   = CH6_TENSIONS[targetDegree];
  // 마지막(4번째) 칸은 M7(#11) 금지
  const lastSlotBanTension = (i, d) => (i === 3 && (d === 'I' || d === 'IV')) ? '#11' : undefined;
  const correctTension  = ch6PickWeightedTension(targetDegree, lastSlotBanTension(targetIndex, targetDegree));
  // 오답은 이 도수에서 애초에 안 어울리는 텐션만(같은 도수의 다른 유효 텐션은 그것도 정답이라 중복정답 됨 → 제외)
  const wrongPool = CH6_ALL_TENSIONS.filter(t => !validTensions.includes(t) && t !== lastSlotBanTension(targetIndex, targetDegree));
  const wrongTensions   = _ccShuffle(wrongPool).slice(0, 2);

  const keyName          = getKeyDisplayName(keyIdx, useFlat);
  const originalChords    = base.map(d => degreeToChordName(d, keyIdx, true, useFlat)); // 항상 7화음
  const labels            = base.map(d => degreeToLabel(d, true));

  // 타겟 제외 나머지 3칸도 각자 도수에 맞는 텐션을 랜덤 부여(진행 전체가 텐션코드로 보이게).
  base.forEach((d, i) => {
    if (i === targetIndex) return;
    const t = ch6PickWeightedTension(d, lastSlotBanTension(i, d));
    originalChords[i] = originalChords[i] + `(${t})`;
  });

  const targetChord  = originalChords[targetIndex]; // 텐션 붙기 전 원본(플레인 7화음) — 타겟 슬롯 시작 상태
  const correctChord = targetChord + `(${correctTension})`;

  const trayTensions = _ccShuffle([correctTension, ...wrongTensions]);
  const tray = trayTensions.map(t => ({
    degree: base[targetIndex],
    chord: targetChord + `(${t})`,
  }));

  return {
    type: 'substitution', targetIndex, keyIdx, keyName,
    baseDegrees: base, originalChords, labels,
    substituteDegree: base[targetIndex],
    substituteChord: correctChord,
    substituteLabel: labels[targetIndex] + `(${correctTension})`,
    tray, targetDegree: base[targetIndex],
  };
}

// ── 제 7장: 마이너 패밀리코드 — 배치형(1장과 동일), 손으로 뽑은 진행 20개 중 랜덤 출제 ──
// 실제 대중음악에서 쓰이는 진행만 골라서 고정 목록으로 관리(마이너 다이어토닉은 자유생성하면
// 어색한 연결이 너무 많이 나와서 1장처럼 규칙기반 생성 대신 손으로 큐레이션).
const CH7_PROGRESSIONS = [
  ['m_I', 'm_VI', 'm_III', 'm_VII'],
  ['m_I', 'm_IV', 'm_V', 'm_I'],
  ['m_I', 'm_VII', 'm_VI', 'm_V'],
  ['m_I', 'm_IV', 'm_VII', 'm_III'],
  ['m_VI', 'm_VII', 'm_I', 'm_IV'],
  ['m_I', 'm_V', 'm_VI', 'm_IV'],
  ['m_II', 'm_V', 'm_I', 'm_VI'],
  ['m_I', 'm_VI', 'm_IV', 'm_V'],
  ['m_I', 'm_IV', 'm_I', 'm_V'],
  ['m_VI', 'm_V', 'm_I', 'm_I'],
  ['m_I', 'm_III', 'm_VII', 'm_VI'],
  ['m_I', 'm_VII', 'm_IV', 'm_V'],
  ['m_IV', 'm_V', 'm_I', 'm_VI'],
  ['m_I', 'm_II', 'm_V', 'm_I'],
  ['m_VI', 'm_IV', 'm_I', 'm_V'],
  ['m_I', 'm_VI', 'm_VII', 'm_V'],
  ['m_I', 'm_VIIdim', 'm_I', 'm_V'],
  ['m_I', 'm_IV', 'm_VI', 'm_VII'],
  ['m_I', 'm_V', 'm_VI', 'm_VII'],
  ['m_IV', 'm_VII', 'm_III', 'm_VI'],
];

const CH7_TRAY_POOL = ['m_I', 'm_II', 'm_III', 'm_IV', 'm_V', 'm_VI', 'm_VII', 'm_VIIdim'];

// avoidSeqs 2단계 회피(1장 generateCh1Progression과 동일 패턴) — 전체 후보 20개 중 세션 10문제라
// 사실상 항상 전부 서로 다른 진행이 나옴.
function generateCh7Progression(avoidSeqs) {
  avoidSeqs = avoidSeqs || [];
  const matches = (seq, other) => other && seq.every((d, i) => d === other[i]);

  let seq;
  for (let i = 0; i < 40; i++) {
    seq = CH7_PROGRESSIONS[Math.floor(Math.random() * CH7_PROGRESSIONS.length)];
    if (!avoidSeqs.some(prev => matches(seq, prev))) return seq;
  }
  const last = avoidSeqs[avoidSeqs.length - 1];
  for (let i = 0; i < 20 && matches(seq, last); i++) {
    seq = CH7_PROGRESSIONS[Math.floor(Math.random() * CH7_PROGRESSIONS.length)];
  }
  return seq;
}

// type 인자는 무시 — 7장은 배치형만 존재. keyIdx/useFlat 고정 사용(세션 내내 동일).
function generateCh7Question(type, difficulty, keyIdx, useFlat, prevDegrees) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForCh7Key(keyIdx);

  const degrees = generateCh7Progression(prevDegrees);
  const chords  = degrees.map(d => degreeToChordName(d, keyIdx, true, useFlat));
  const labels  = degrees.map(d => degreeToLabel(d, true));

  const tray = _ccShuffle(CH7_TRAY_POOL.map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, true, useFlat),
  })));

  return {
    type: 'placement', keyIdx, keyName: getKeyDisplayName(keyIdx, useFlat) + 'm',
    degrees, labels, chords, tray,
  };
}

// ── 제 8장: 모달 인터체인지 — 교체형, 손으로 뽑은 진행 20개 중 랜덤 출제 ──
// 1장 규칙(연속중복 금지·IIIm 최대1회·IIIm→I,V 금지) 지키면서 IV·V가 정확히 1번씩 들어가게
// 손으로 큐레이션한 진행(7장과 같은 이유로 규칙기반 자유생성 대신 고정 목록 사용).
const CH8_PROGRESSIONS = [
  ['I', 'IV', 'V', 'I'],
  ['I', 'IV', 'V', 'VIm'],
  ['VIm', 'IV', 'V', 'I'],
  ['I', 'V', 'IV', 'I'],
  ['IV', 'V', 'I', 'VIm'],
  ['VIm', 'IV', 'V', 'VIm'],
  ['I', 'IIIm', 'IV', 'V'],
  ['IV', 'V', 'VIm', 'I'],
  ['I', 'IV', 'VIm', 'V'],
  ['VIm', 'V', 'IV', 'I'],
  ['VIm', 'IIIm', 'IV', 'V'],
  ['I', 'VIm', 'IV', 'V'],
  ['IV', 'I', 'V', 'VIm'],
  ['VIm', 'IV', 'I', 'V'],
  ['I', 'IV', 'V', 'IIIm'],
  ['IV', 'VIm', 'V', 'I'],
  ['I', 'V', 'VIm', 'IV'],
  ['VIm', 'IV', 'V', 'IIIm'],
  ['IV', 'VIm', 'I', 'V'],
  ['IV', 'I', 'VIm', 'V'],
];

// 모달 인터체인지 대상 소스 도수(I·IV·V만) → 빌려올 수 있는 코드 목록
const CH8_SUBS_FOR = {
  I:  ['mi_bIII', 'mi_shIVdim', 'mi_bVI'],
  IV: ['mi_bII', 'mi_IIdim', 'mi_IVm7', 'mi_IVm6', 'mi_shIVdim', 'mi_bVI'],
  V:  ['mi_bII', 'mi_IIdim', 'mi_IVm7', 'mi_IVm6', 'mi_bVII7', 'mi_bVI', 'mi_bVIIM7'],
};

function ch8TrayPool() {
  return ['mi_bIII', 'mi_shIVdim', 'mi_bVI', 'mi_bII', 'mi_IIdim', 'mi_IVm7', 'mi_IVm6', 'mi_bVII7', 'mi_bVIIM7'];
}

// avoidSeqs 2단계 회피(7장 generateCh7Progression과 동일 패턴)
function generateCh8Progression(avoidSeqs) {
  avoidSeqs = avoidSeqs || [];
  const matches = (seq, other) => other && seq.every((d, i) => d === other[i]);

  let seq;
  for (let i = 0; i < 40; i++) {
    seq = CH8_PROGRESSIONS[Math.floor(Math.random() * CH8_PROGRESSIONS.length)];
    if (!avoidSeqs.some(prev => matches(seq, prev))) return seq;
  }
  const last = avoidSeqs[avoidSeqs.length - 1];
  for (let i = 0; i < 20 && matches(seq, last); i++) {
    seq = CH8_PROGRESSIONS[Math.floor(Math.random() * CH8_PROGRESSIONS.length)];
  }
  return seq;
}

// 난이도별 교체 칸 수(1개/2개) 등장 비율 — 쉬움 항상 1개 / 보통 50:50 / 어려움 30%:70%
function ch8PickTargetCount(difficulty, maxAvailable) {
  let n = 1;
  if (difficulty === 'mid')  n = Math.random() < 0.5 ? 2 : 1;
  if (difficulty === 'high') n = Math.random() < 0.7 ? 2 : 1;
  return Math.min(n, maxAvailable);
}

// type 인자는 무시 — 8장은 교체형만 존재. keyIdx/useFlat 고정 사용(세션 내내 동일).
function generateCh8Question(type, difficulty, keyIdx, useFlat, prevDegrees) {
  if (keyIdx == null)  keyIdx  = pickRandomKey(difficulty);
  if (useFlat == null) useFlat = pickUseFlatForKey(keyIdx);

  const base = generateCh8Progression(prevDegrees);
  // I·IV·V 자리만 대상 + 바로 뒤 코드도 1·4·5도(I/IV/V)일 때만 교체 가능(맨 마지막 칸은 뒤가 없어서 제외)
  const eligible = base
    .map((d, i) => i)
    .filter(i => CH8_SUBS_FOR[base[i]] && i < base.length - 1 && CH8_SUBS_FOR[base[i + 1]]);

  const targetCount   = ch8PickTargetCount(difficulty, eligible.length);
  const targetIndices = _ccShuffle(eligible).slice(0, targetCount).sort((a, b) => a - b);
  const substituteDegrees = targetIndices.map(idx => {
    const subs = CH8_SUBS_FOR[base[idx]];
    return subs[Math.floor(Math.random() * subs.length)];
  });

  const keyName        = getKeyDisplayName(keyIdx, useFlat);
  const originalChords = base.map(d => degreeToChordName(d, keyIdx, true, useFlat));
  const labels          = base.map(d => degreeToLabel(d, true));
  targetIndices.forEach((idx, k) => { labels[idx] = degreeToLabel(substituteDegrees[k], true); }); // 강조 슬롯 라벨 = 바꿔야 할 로마자

  const tray = _ccShuffle(ch8TrayPool().map(d => ({
    degree: d,
    chord: degreeToChordName(d, keyIdx, true, useFlat),
  })));

  const substituteChords = substituteDegrees.map(d => degreeToChordName(d, keyIdx, true, useFlat));
  const substituteLabels = substituteDegrees.map(d => degreeToLabel(d, true));

  if (targetIndices.length === 1) {
    return {
      type: 'substitution', targetIndex: targetIndices[0], keyIdx, keyName,
      baseDegrees: base, originalChords, labels,
      substituteDegree: substituteDegrees[0],
      substituteChord: substituteChords[0],
      substituteLabel: substituteLabels[0],
      tray, targetDegree: base[targetIndices[0]],
    };
  }
  return {
    type: 'substitution', targetIndices, keyIdx, keyName,
    baseDegrees: base, originalChords, labels,
    substituteDegrees, substituteChords, substituteLabels,
    tray, targetDegree: base[targetIndices[0]],
  };
}

// ── 정적 문제은행 (제9장부터, 손으로 작성) ──────────────────────
// 구조: { 챕터번호: { low: [...], mid: [...], high: [...] } }
const CHORD_COMBO_QUESTIONS = {
  // 1~8장은 알고리즘 생성 → 여기 비워둠
};
