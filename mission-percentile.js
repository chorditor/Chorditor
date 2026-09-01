// ═══════════════════════════════════════════════════════════════
// mission-percentile.js — 데일리 미션 결산 상위% 통계
//
// 프리셋 출처: analytics_events의 quiz_completed(레벨1) 실측
//   표본 5,911세션 / v1.3.2.2+ / 로그인 유저 (2026-08-26 산출)
//   ※ 옛 버전 4,451세션은 answers 필드를 안 보내서 제외됨(실력 편향 아님)
//
// 레벨1은 5문항이고 우리 미션은 10문항이라 변환이 들어감:
//   - 정답수 분포: 베타-이항(α=7.15, β=1.12) 적합 후 n=10으로 외삽
//   - 반응속도: 문항당 값이라 μ는 그대로, σ만 평균낸 개수(k)로 조정
// ═══════════════════════════════════════════════════════════════

const MissionPercentile = (() => {

  // ── 표준정규 CDF (Abramowitz & Stegun 26.2.17 근사, 오차 < 7.5e-8) ──
  function phi(z) {
    const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937,
          b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419;
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z);
    const t = 1 / (1 + p * z);
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const prob = 1 - d * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
    return sign === 1 ? prob : 1 - prob;
  }

  // ── 표준정규 CDF 역함수 (Acklam 근사, 오차 < 1.15e-9) ──
  // 최종 상위%를 다시 z로 되돌려 정규분포 그래프의 막대 위치를 잡는 데 씀
  function phiInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return  Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
                1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
                6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
               -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01,
               2.445134137142996e+00, 3.754408661907416e+00];
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    if (p > pHigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }

  // 레벨1은 문항당 5초 제한이라 원본 분포의 상한이 5초 — 우리 미션은 제한이 없어서
  // 그대로 두면 느린 꼬리가 원본에 없는 영역으로 나감. 채점에만 같은 상한을 적용
  const ITEM_SEC_CAP = 5;
  // 시각인지 반응 하한(~250ms) 미만은 인간이 낼 수 없는 값 — 실측 DB에도 0.010초 같은
  // 연타 오터치 기록이 있음. 다음 문제 로드 직후 잔여 탭이 들어오는 경우를 방어
  const ITEM_SEC_FLOOR = 0.3;

  // ── 코드맞추기 프리셋 ──────────────────────────────────────
  const QUIZ = {
    // ⚠ 폐기: 종합 스코어 2·ln(N) − ln(ΣT) (μ=1.1230, σ=0.6668)
    //   정답수가 흩어진 전체 모집단의 σ를 쓰기 때문에, 정답수가 고정된 그룹(예: 만점자)
    //   안에서의 속도 우위가 짓눌려 꼬리에서 크게 틀림. 실측: 정답평균 1.2초인 만점자가
    //   상위 0.05%여야 하는데 6.7%로 계산됨. 아래 2층 구조에서 유도하는 방식으로 대체.

    // 반응시간(초) — 페르소나별 로그정규 μ/σ. 2026-09-01 재산출: 코드맞추기 레벨1~8·c1·c2
    // 신규 실측(평균/표준편차)에 인접레벨 완만평활(가중 0.7:0.15:0.15, 표본 얇은 L7 등
    // 튐값 보정, 사용자 지시)을 먼저 적용한 뒤 난이도가 가장 가까운 레벨을 매칭
    // (회귀·보간 없이 매칭만) — 데일리미션 풀과 레벨풀 구성이 완전히 겹치진 않아서
    // 정밀 모델보다 이 방식이 더 안전하다고 판단(설계 논의 결론).
    //   언박싱1일차 ← L1(오픈 트라이어드, 평활avg2.255/sd0.776)
    //   굳은살비기너 ← L2+L3 평균(바레트라이어드+sus/add9, 평활avg2.804/sd0.981)
    //   악보의존자   ← L5(7th코드, 평활avg3.584/sd0.944)
    //   방구석기타마스터 ← L8(7th전종류, 평활avg3.492/sd1.026)
    //   기타마스터   ← c2(심화챌린지, 평활avg3.694/sd1.209)
    // muLn/sigma는 avg·sd를 로그정규 모멘트매칭으로 역산(σ²=ln(1+(sd/avg)²), μ=lnavg−σ²/2).
    // varBetween/varWithin 분해(사람간 편차 vs 문항노이즈, k로 조정)는 이번에도 안 씀 — 항목별
    // sd가 이미 섞인 값이라 분해할 근거 없음. 표본이 작은 페르소나(방구석·기타마스터)는
    // 추후 실측 쌓이면 교체
    rtByPersona: {
      unboxing:      { muLn: 0.7572, sigma: 0.3345 },
      beginner:      { muLn: 0.9731, sigma: 0.3399 },
      sheet_reader:  { muLn: 1.2429, sigma: 0.2590 },
      home_master:   { muLn: 1.2091, sigma: 0.2878 },
      guitar_master: { muLn: 1.2558, sigma: 0.3190 },
    },

    // 정답 k개 이상을 받은 유저 비율 — 페르소나별. 2026-09-01 재산출: 코드맞추기 레벨1~8·c1·c2
    // 신규 실측 정답률(평균%/표준편차%)에 위와 같은 완만평활을 적용한 뒤, 매칭 레벨(들)의
    // 평활값을 비율(0~1) 평균·분산으로 베타분포 모멘트매칭(α,β) → 그 α,β로 페르소나 자신의
    // 문항수(N)에 대한 베타-이항분포 외삽. 시간 통계(QUIZ.rtByPersona)와 같은 레벨 매칭:
    //   언박싱1일차 ← L1
    //   굳은살비기너 ← L2+L3 평균
    //   악보의존자   ← L5 ⚠ 표본 얇음
    //   방구석기타마스터 ← L8 ⚠⚠ 표본 매우 얇음
    //   기타마스터   ← c2
    // 표본이 얇은 페르소나는 추후 실측 쌓이면 교체할 것
    cumAtLeastByPersona: {
      unboxing: {
        10: 0.4354, 9: 0.6478, 8: 0.7799, 7: 0.8658, 6: 0.9218,
        5: 0.9573, 4: 0.9788, 3: 0.9909, 2: 0.9969, 1: 0.9994, 0: 1.0,
      },
      beginner: {
        12: 0.1415, 11: 0.2743, 10: 0.3966, 9: 0.5079, 8: 0.6079,
        7: 0.6966, 6: 0.7739, 5: 0.8397, 4: 0.8941, 3: 0.9372,
        2: 0.9690, 1: 0.9899, 0: 1.0,
      },
      sheet_reader: {
        15: 0.0035, 14: 0.0131, 13: 0.0305, 12: 0.0572, 11: 0.0943,
        10: 0.1424, 9: 0.2016, 8: 0.2718, 7: 0.3524, 6: 0.4422,
        5: 0.5395, 4: 0.6417, 3: 0.7454, 2: 0.8456, 1: 0.9348, 0: 1.0,
      },
      home_master: {
        15: 0.0000, 14: 0.0000, 13: 0.0002, 12: 0.0008, 11: 0.0024,
        10: 0.0063, 9: 0.0147, 8: 0.0311, 7: 0.0609, 6: 0.1107,
        5: 0.1886, 4: 0.3024, 3: 0.4559, 2: 0.6444, 1: 0.8445, 0: 1.0,
      },
      guitar_master: {
        15: 0.0025, 14: 0.0113, 13: 0.0304, 12: 0.0632, 11: 0.1123,
        10: 0.1786, 9: 0.2616, 8: 0.3589, 7: 0.4664, 6: 0.5788,
        5: 0.6894, 4: 0.7912, 3: 0.8774, 2: 0.9425, 1: 0.9831, 0: 1.0,
      },
    },

    // ── 레벨별(코드맞추기 chord-name-quiz.js 독립 레벨 페이지 전용) ──────────
    // 위 rtByPersona/cumAtLeastByPersona는 데일리미션(유저 페르소나 기준, 문항수도
    // 페르소나마다 고정 10/12/15)용이라, 레벨 페이지에서 그대로 재사용하면 "레벨3에서
    // 9개 맞췄는데 상위%가 이상하다"처럼 레벨과 무관한 값이 나오는 문제가 있었음
    // (2026-09-01 사용자 지적, 완전 분리 지시). 레벨1~8·c1·c2 각자 실측(평균/표준편차,
    // 완만평활 적용)을 그대로 그 레벨 자신의 문항수(N)로 로그정규/베타-이항 산출.
    rtByLevel: {
      '1': { muLn: 0.7572, sigma: 0.3345 },
      '2': { muLn: 0.9293, sigma: 0.3460 },
      '3': { muLn: 1.0151, sigma: 0.3342 },
      '4': { muLn: 1.1712, sigma: 0.2802 },
      '5': { muLn: 1.2429, sigma: 0.2590 },
      '6': { muLn: 1.2239, sigma: 0.2355 },
      '7': { muLn: 0.9431, sigma: 0.2353 },
      '8': { muLn: 1.2091, sigma: 0.2878 },
      c1:  { muLn: 1.1538, sigma: 0.3037 },
      c2:  { muLn: 1.2558, sigma: 0.3190 },
    },
    cumAtLeastByLevel: {
      '1': { 5: 0.5796, 4: 0.8123, 3: 0.9244, 2: 0.9756, 1: 0.9952, 0: 1.0 },
      '2': {
        7: 0.2613, 6: 0.4765, 5: 0.6492, 4: 0.7828, 3: 0.8806,
        2: 0.9464, 1: 0.9845, 0: 1.0,
      },
      '3': {
        10: 0.1416, 9: 0.2761, 8: 0.4018, 7: 0.5180, 6: 0.6239,
        5: 0.7191, 4: 0.8028, 3: 0.8741, 2: 0.9319, 1: 0.9748, 0: 1.0,
      },
      '4': {
        10: 0.0295, 9: 0.0846, 8: 0.1618, 7: 0.2569, 6: 0.3659,
        5: 0.4842, 4: 0.6067, 3: 0.7277, 2: 0.8403, 1: 0.9355, 0: 1.0,
      },
      '5': {
        10: 0.0091, 9: 0.0333, 8: 0.0766, 7: 0.1414, 6: 0.2285,
        5: 0.3373, 4: 0.4650, 3: 0.6065, 2: 0.7536, 1: 0.8928, 0: 1.0,
      },
      '6': {
        10: 0.0014, 9: 0.0068, 8: 0.0196, 7: 0.0443, 6: 0.0859,
        5: 0.1500, 4: 0.2429, 3: 0.3705, 2: 0.5385, 1: 0.7501, 0: 1.0,
      },
      '7': {
        10: 0.0000, 9: 0.0001, 8: 0.0004, 7: 0.0016, 6: 0.0057,
        5: 0.0176, 4: 0.0478, 3: 0.1168, 2: 0.2614, 1: 0.5376, 0: 1.0,
      },
      '8': {
        15: 0.0000, 14: 0.0000, 13: 0.0002, 12: 0.0008, 11: 0.0024,
        10: 0.0063, 9: 0.0147, 8: 0.0311, 7: 0.0608, 6: 0.1107,
        5: 0.1886, 4: 0.3023, 3: 0.4559, 2: 0.6444, 1: 0.8444, 0: 1.0,
      },
      c1: {
        10: 0.0314, 9: 0.0925, 8: 0.1791, 7: 0.2855, 6: 0.4055,
        5: 0.5323, 4: 0.6587, 3: 0.7769, 2: 0.8789, 1: 0.9562, 0: 1.0,
      },
      c2: {
        15: 0.0025, 14: 0.0113, 13: 0.0304, 12: 0.0633, 11: 0.1123,
        10: 0.1787, 9: 0.2617, 8: 0.3589, 7: 0.4665, 6: 0.5788,
        5: 0.6894, 4: 0.7912, 3: 0.8774, 2: 0.9425, 1: 0.9831, 0: 1.0,
      },
    },
  };

  /**
   * 코드맞추기 결산 통계
   * 종합 상위%는 두 층에서 유도 — 화면에 같이 뜨는 정답수/속도 문구와 항상 정합함
   *   cum = P(정답수 < 내것) + P(정답수 = 내것) × P(나보다 느림)
   * @param {Array<{isCorrect:boolean, timeSec:number}>} records
   * @param {string} [personaId] - QUIZ.rtByPersona/cumAtLeastByPersona 키. 생략/미매칭 시 unboxing 기준 사용
   * @returns {{
   *   n:number, total:number,
   *   topPct:number|null, chartZ:number|null,
   *   rtSec:number|null, rtZ:number|null, fasterPct:number|null,
   *   atLeastPct:number, isPerfect:boolean
   * }}
   */
  function quiz(records, personaId) {
    const rt = QUIZ.rtByPersona[personaId] || QUIZ.rtByPersona.unboxing;
    const cumAtLeast = QUIZ.cumAtLeastByPersona[personaId] || QUIZ.cumAtLeastByPersona.unboxing;
    return _quizStats(records, rt, cumAtLeast);
  }

  /**
   * 코드맞추기 결산 통계 — 레벨 페이지(chord-name-quiz.js) 전용, 레벨 자신의 실측 기준.
   * quiz(records, personaId)는 데일리미션(유저 페르소나·고정 문항수 10/12/15) 기준이라
   * 레벨 페이지에서 그대로 쓰면 레벨과 무관한 값이 나옴(2026-09-01 완전 분리 지시).
   * @param {Array<{isCorrect:boolean, timeSec:number}>} records
   * @param {string} levelId - QUIZ.rtByLevel/cumAtLeastByLevel 키('1'~'8','c1','c2'). 미매칭 시 레벨1 기준
   */
  function quizByLevel(records, levelId) {
    const rt = QUIZ.rtByLevel[levelId] || QUIZ.rtByLevel['1'];
    const cumAtLeast = QUIZ.cumAtLeastByLevel[levelId] || QUIZ.cumAtLeastByLevel['1'];
    return _quizStats(records, rt, cumAtLeast);
  }

  function _quizStats(records, rt, cumAtLeast) {
    const total = records.length;
    const correct = records.filter(r => r.isCorrect);
    const n = correct.length;
    const capped = sec => Math.min(Math.max(sec, ITEM_SEC_FLOOR), ITEM_SEC_CAP);

    // ① 정답수 — 랭킹이 아니라 맥락 제공용 한 줄
    const atLeast     = cumAtLeast[n]     ?? 1;
    const atLeastNext = cumAtLeast[n + 1] ?? 0;
    const atLeastPct  = atLeast * 100; // 반올림/0.1% 바닥 처리는 표시 단계(mission-session.js)에서

    // ② 반응속도 — 2026-08-28부터 오답 포함 전 문항 평균으로 변경(정답만 재던 이전 방식 폐기).
    // 오답 RT가 찍기(빠름)/포기(느림)로 오염된다는 문제는 있지만, "전체 문항 평균"이라는
    // 더 단순하고 직관적인 지표를 쓰기로 결정 — 사용자 지시. σ는 페르소나별 고정값(rt.sigma) —
    // k(문항수)로 조정하던 varBetween/varWithin 분해는 폐기(위 QUIZ.rtByPersona 주석 참고)
    let rtSec = null, rtZ = null, fasterPct = null;
    if (total > 0) {
      rtSec     = records.reduce((a, r) => a + capped(r.timeSec), 0) / total;
      rtZ       = (Math.log(rtSec) - rt.muLn) / rt.sigma;
      fasterPct = phi(rtZ) * 100; // 나보다 빠른 유저 비율 — 반올림은 표시 단계(mission-session.js)에서
    }

    // ③ 종합 — ①의 구간을 ②로 세분. 임의 가중치 없음
    let topPct = null, chartZ = null;
    if (n > 0) {
      const pBelow  = 1 - atLeast;                       // 나보다 정답수가 적은 비율
      const pEqual  = Math.max(0, atLeast - atLeastNext); // 나와 정답수가 같은 비율
      const pSlower = 1 - phi(rtZ);                      // 같은 정답수 중 나보다 느린 비율
      const cum     = pBelow + pEqual * pSlower;
      topPct = (1 - cum) * 100;
      chartZ = phiInv(Math.min(0.999999, Math.max(0.000001, cum)));
    }

    return {
      n, total, topPct, chartZ,
      rtSec, rtZ, fasterPct, atLeastPct,
      isPerfect: n === total && total > 0,
    };
  }

  // 스케일/코드조합 — 통계 집계 안 함(코드맞추기만)

  return { quiz, quizByLevel, phi, phiInv, ITEM_SEC_CAP, ITEM_SEC_FLOOR, QUIZ };
})();
