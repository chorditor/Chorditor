// ═══════════════════════════════════════════════════════════════
// strumming-list.js — 주법 리듬 리스트 (데이터)
// ───────────────────────────────────────────────────────────────
// 카드 추가/수정은 이 배열만 편집하면 됨. (id는 순서대로 자동 부여 — 적지 말 것)
//   level    : 난이도 (1~5) → 배지 색상
//   beat     : 박자 "n/d" (구분선 그룹 자동 계산에 사용)
//   title    : 카드 제목
//   desc     : 카드 설명
//   recommend: true → '추천' 배지 (선택)
//   bpm      : 기본 목표 BPM (선택) — 미지정 시 6/8=목표50·시작30, 그 외=목표80
//   cut      : [1-based 위치] 컷팅(뮤트 스트로크) 셀 (선택)
//   accent   : [1-based 위치] 악센트 셀 (선택) — 강조 스트로크.
//              악센트 D=1~6현 전부 / 비악센트 D=4·5·6현만
//              악센트 U=1~4현    / 비악센트 U=1·2현만 + 벨로시티 상향
//   배치 지정 (둘 중 하나):
//     A) strokes: 'DUDU...' 문자열 직접. D=다운/U=업/-=생략. (불규칙·생략 패턴)
//     B) count + alt(+skip): count=칸수, alt=false(DU반복·기본)/true(DD반복·전부D),
//                            skip=[생략할 1-based 위치]. (규칙 패턴 간편 입력)
//        alt은 헛스트로크(-) 방향 결정에도 사용됨.
//     strokes가 있으면 우선 적용됨.
//
// 구분선 그룹은 beat + 칸 수에서 자동 도출:
//   mainBeats = (분모==8) ? 분자/3 : 분자
//   group     = 칸수 / mainBeats   (1 이하면 구분선 없음)
// ═══════════════════════════════════════════════════════════════

window.STRUMMING_LIST = [
  {
    level: 1,
    beat: '4/4',
    title: '4비트 연습',
    desc: '기초는 항상 중요하답니다!',
    count: 4,
    alt: true,
  },
  {
    level: 1,
    beat: '4/4',
    title: '8비트 연습',
    desc: '기초는 항상 중요하답니다! 2',
    count: 8,
    alt: true,
  },
  {
    level: 1,
    beat: '4/4',
    title: '8비트 다운업 연습',
    desc: '기초는 항상 중요하답니다...! 3',
    count: 8,
  },
  {
    level: 1,
    beat: '4/4',
    title: '8비트 응용',
    desc: '이제 주법을 응용해봅시다!',
    count: 8,
    skip: [2, 6],
  },
  {
    level: 1,
    beat: '4/4',
    title: '칼립소 주법',
    desc: '실전에서 아주 많이쓰는 8비트 주법',
    count: 8,
    skip: [2, 5],
    recommend: true,
  },
  {
    level: 2,
    beat: '4/4',
    title: '8비트 컷팅 주법',
    desc: '정기적금 정기적금...',
    count: 8,
    cut: [3, 7],
  },
  {
    level: 1,
    beat: '4/4',
    title: '16비트 다운업 연습',
    desc: '오른손이 부드러워 지도록 마음껏 긁어 보세요!',
    count: 16,
  },
  {
    level: 1,
    beat: '4/4',
    title: '16비트 다운업 연습',
    desc: '너에게 난 나에게 넌 인트로 주법',
    count: 16,
    skip: [2, 3, 6, 10, 11, 14],
    recommend: true,
  },
  {
    level: 1,
    beat: '4/4',
    title: '슬로우 고고',
    desc: '리듬감 있는 16비트 주법',
    count: 16,
    skip: [2, 4, 6, 10, 12, 14],
    accent: [5, 7, 8, 13, 15, 16]
  },
  {
    level: 1,
    beat: '4/4',
    title: '슬로우 고고 응용',
    desc: '기본 슬로우 고고 리듬에 약간에 변형을!',
    count: 16,
    skip: [2, 4, 6, 12, 14],
    accent: [5, 7, 8, 13, 15, 16]
  },
  {
    level: 1,
    beat: '4/4',
    title: '16비트 주법 응용',
    desc: '싸운날 주법',
    count: 16,
    skip: [2, 4, 6, 7, 10, 12, 14, 15],
  },
  {
    level: 2,
    beat: '4/4',
    title: '제일 많이쓰는 주법 TOP3',
    desc: '밴드, J-POP, 발라드 어디서나 무난한 주법계 GOAT!',
    count: 16,
    skip: [2, 3, 4, 6, 9, 12, 14],
    recommend: true,
  },
  {
    level: 3,
    beat: '4/4',
    title: '16비트 주법 응용1',
    desc: '어쿠스틱, 인디 느낌이 나는 경쾌한 주법',
    count: 16,
    skip: [2, 3, 8, 9],
  },
  {
    level: 1,
    beat: '3/4',
    title: '기본 왈츠',
    desc: '쿵-짝-짝, 3박자의 기본! 첫 박을 묵직하게',
    count: 3,
    alt: true,
    accent: [2, 3],
  },
  {
    level: 1,
    beat: '3/4',
    title: '6비트 기본 왈츠',
    desc: '다운-다운업-다운업, 부드러운 3박자 리듬',
    strokes: 'D-DUDU',
    accent: [3, 5],
  },
  {
    level: 2,
    beat: '12/8',
    title: '기본 셔플',
    desc: '롱-숏 튀는 3연음 셔플 리듬의 기본',
    strokes: 'D-UD-UD-UD-U',
  },
  {
    level: 1,
    beat: '6/8',
    title: '6/8박자 기본',
    desc: '두 박이 흔들리는 6/8 박자의 기본 — 다운업 연속',
    count: 12,
    strokes: 'D--UDUD--UDU'
  },
  {
    level: 2,
    beat: '6/8',
    title: '6/8 발라드 주법 ',
    desc: '발라드계 최고 GOAT 주법! ',
    count: 12,
    strokes: 'D-DUDUD-DUDU',
    recommend:true
  },
];

// id 자동 부여 — 리스트 순서대로 1부터 (데이터에 id 안 적어도 됨)
window.STRUMMING_LIST.forEach((it, i) => { it.id = i + 1; });
