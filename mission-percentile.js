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

    // 반응시간(초) — 페르소나별 로그정규 μ/σ. 2026-08-28 산출: 코드맞추기 레벨1~8·c1·c2
    // 실측(평균/표준편차)에서 난이도가 가장 가까운 레벨을 하나씩 골라 그대로 가져옴
    // (회귀·보간 없이 매칭만) — 데일리미션 풀과 레벨풀 구성이 완전히 겹치진 않아서
    // 정밀 모델보다 이 방식이 더 안전하다고 판단(설계 논의 결론).
    //   언박싱1일차 ← L1(오픈 트라이어드, n=26429, avg2.164/sd0.737)
    //   굳은살비기너 ← L2+L3 평균(바레트라이어드+sus/add9, avg2.806/sd1.006)
    //   악보의존자   ← L5(7th코드, n=146, avg3.582/sd0.955)
    //   방구석기타마스터 ← L8(7th전종류, n=12, avg3.726/sd1.125)
    //   기타마스터   ← c2(심화챌린지, n=47, avg3.774/sd1.247)
    // muLn/sigma는 avg·sd를 로그정규 모멘트매칭으로 역산(σ²=ln(1+(sd/avg)²), μ=lnavg−σ²/2).
    // varBetween/varWithin 분해(사람간 편차 vs 문항노이즈, k로 조정)는 이번엔 안 씀 — 항목별
    // sd가 이미 섞인 값이라 분해할 근거 없음. 표본이 작은 페르소나(방구석·기타마스터)는
    // 추후 실측 쌓이면 교체
    rtByPersona: {
      unboxing:      { muLn: 0.7171, sigma: 0.3313 },
      beginner:      { muLn: 0.9713, sigma: 0.3477 },
      sheet_reader:  { muLn: 1.2416, sigma: 0.2620 },
      home_master:   { muLn: 1.2717, sigma: 0.2954 },
      guitar_master: { muLn: 1.2763, sigma: 0.3219 },
    },

    // 정답 k개 이상을 받은 유저 비율 — 페르소나별. 2026-08-28 산출: 코드맞추기 레벨1~8·c1·c2
    // 실측 정답수 히스토그램(analytics_events quiz_completed)에서 난이도가 가까운 레벨(들)을
    // n으로 합산 → 정답비율(k/total) 표본으로 베타분포 모멘트매칭(α,β) → 그 α,β로
    // 페르소나 자신의 문항수(N)에 대한 베타-이항분포 외삽. 시간 통계(QUIZ.rtByPersona)와
    // 같은 레벨 매칭 사용, 단 표본을 합쳐 안정화한 게 다름:
    //   언박싱1일차 ← L1 (n=10866)
    //   굳은살비기너 ← L2+L3 (n=2344)
    //   악보의존자   ← L5 (n=50) ⚠ 표본 얇음
    //   방구석기타마스터 ← L6+L7+L8 (n=37) ⚠⚠ 표본 매우 얇음, 만점 확률 0.04%로 극단적
    //   기타마스터   ← c1+c2 (n=170)
    // 표본이 얇은 페르소나는 추후 실측 쌓이면 교체할 것
    cumAtLeastByPersona: {
      unboxing: {
        10: 0.5226, 9: 0.6786, 8: 0.7728, 7: 0.8385, 6: 0.8870,
        5: 0.9236, 4: 0.9512, 3: 0.9716, 2: 0.9861, 1: 0.9954, 0: 1.0,
      },
      beginner: {
        12: 0.1560, 11: 0.2898, 10: 0.4088, 9: 0.5154, 8: 0.6105,
        7: 0.6950, 6: 0.7690, 5: 0.8329, 4: 0.8868, 3: 0.9307,
        2: 0.9644, 1: 0.9876, 0: 1.0,
      },
      sheet_reader: {
        15: 0.0055, 14: 0.0188, 13: 0.0415, 12: 0.0743, 11: 0.1176,
        10: 0.1715, 9: 0.2357, 8: 0.3094, 7: 0.3917, 6: 0.4812,
        5: 0.5758, 4: 0.6731, 3: 0.7700, 2: 0.8618, 1: 0.9422, 0: 1.0,
      },
      home_master: {
        15: 0.0004, 14: 0.0017, 13: 0.0048, 12: 0.0104, 11: 0.0197,
        10: 0.0338, 9: 0.0541, 8: 0.0822, 7: 0.1200, 6: 0.1697,
        5: 0.2339, 4: 0.3161, 3: 0.4209, 2: 0.5555, 1: 0.7335, 0: 1.0,
      },
      guitar_master: {
        15: 0.0183, 14: 0.0527, 13: 0.1010, 12: 0.1612, 11: 0.2311,
        10: 0.3086, 9: 0.3916, 8: 0.4779, 7: 0.5652, 6: 0.6513,
        5: 0.7337, 4: 0.8101, 3: 0.8779, 2: 0.9343, 1: 0.9762, 0: 1.0,
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
    const total = records.length;
    const correct = records.filter(r => r.isCorrect);
    const n = correct.length;
    const capped = sec => Math.min(Math.max(sec, ITEM_SEC_FLOOR), ITEM_SEC_CAP);
    const rt = QUIZ.rtByPersona[personaId] || QUIZ.rtByPersona.unboxing;
    const cumAtLeast = QUIZ.cumAtLeastByPersona[personaId] || QUIZ.cumAtLeastByPersona.unboxing;

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

  return { quiz, phi, phiInv, ITEM_SEC_CAP, ITEM_SEC_FLOOR, QUIZ };
})();
