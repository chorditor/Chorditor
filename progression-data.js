'use strict';
// ═══════════════════════════════════════════════════════════════
// progression-data.js — 코드 진행 데이터 (C키 기준 직접 입력)
//
// 코드명 표기 규칙 (C키 기준):
//   root:    C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B
//   quality: (없음)=장3화음  m=단3화음  7=도미넌트7  M7=장7
//            m7=단7  dim=감3  dim7=감7  aug=증3
//   예시:    'C'=C장, 'Am'=A단, 'G7'=G도미넌트7, 'FM7'=F장7
//            'Dm7'=D단7, 'Bdim'=B감, 'Bdim7'=B감7
//
// 로마숫자 표기 규칙: id값으로 식별 (예: 'I-V-VIm-IV')
// steps 각 항목: { chord: 'C키 코드명' }
// ═══════════════════════════════════════════════════════════════
const PROGRESSION_DATA = [

  // Tier 0: 3개짜리 코드
  {
    id: 'IV-V-I-I',
    no: 1,
    keys: ['C', 'D', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'F' },
      { chord: 'G' },
      { chord: 'C' },
      { chord: 'C' },
    ],
  },
  {
    id: 'IIm-V-I-I',
    no: 1,
    keys: ['C', 'D', 'G'],
    steps: [
      { chord: 'Dm' },
      { chord: 'G'  },
      { chord: 'C'  },
      { chord: 'C'  },
    ],
  },
  {
    id: 'IV-V-VIm-VIm',
    no: 1,
    keys: ['C', 'D', 'G', 'A'],
    steps: [
      { chord: 'F'  },
      { chord: 'G'  },
      { chord: 'Am' },
      { chord: 'Am' },
    ],
  },
  // Tier 1: 초보자용 진행
  // I로 시작
  {
    id: 'I-IV-V-I',
    no: 1,
    keys: ['C', 'D', 'G', 'A'],
    steps: [
      { chord: 'C' },
      { chord: 'F' },
      { chord: 'G' },
      { chord: 'C' },
    ],
  },
  {
    id: 'I-V-VIm-IV',
    no: 1,
    keys: ['C', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'C'  },
      { chord: 'G'  },
      { chord: 'Am' },
      { chord: 'F'  },
    ],
  },
  {
    id: 'I-VIm-IV-V',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'C'  },
      { chord: 'Am' },
      { chord: 'F'  },
      { chord: 'G'  },
    ],
  },
  {
    id: 'I-VIm-IV-IVm',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'C'  },
      { chord: 'Am' },
      { chord: 'F'  },
      { chord: 'Fm'  },
    ],
  },
  {
    id: 'I-VIm-IIm-V',
    no: 1,
    keys: ['C', 'D', 'G'],
    steps: [
      { chord: 'C'  },
      { chord: 'Am' },
      { chord: 'Dm' },
      { chord: 'G'  },
    ],
  },
  {
    id: 'I-I/3-IV-V',
    no: 1,
    keys: ['C', 'D', 'G'],
    recommended: true,
    steps: [
      { chord: 'C'   },
      { chord: 'C/E' },
      { chord: 'F'   },
      { chord: 'G'   },
    ],
  },
  // IV로 시작
  {
    id: 'IV-V-I-VIm',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'F'  },
      { chord: 'G'  },
      { chord: 'C'  },
      { chord: 'Am' },
    ],
  },
  {
    id: 'IV-V-VIm-I',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'F'  },
      { chord: 'G'  },
      { chord: 'Am' },
      { chord: 'C'  },
    ],
  },
  {
    id: 'IV-V-VIm-I/3',
    no: 1,
    keys: ['C', 'D', 'G'],
    recommended: true,
    steps: [
      { chord: 'F'  },
      { chord: 'G'  },
      { chord: 'Am' },
      { chord: 'C/E'  },
    ],
  },
  {
    id: 'IV-V-IIIm-VIm',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'F'  },
      { chord: 'G'  },
      { chord: 'Em' },
      { chord: 'Am' },
    ],
  },
  {
    id: 'IV-I-VIm-V',
    no: 1,
    recommended: true,
    keys: ['C', 'G'],
    steps: [
      { chord: 'F'  },
      { chord: 'C'  },
      { chord: 'Am' },
      { chord: 'G'  },
    ],
  },
  // VIm로 시작
  {
    id: 'VIm-I-IV-V',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Am' },
      { chord: 'C'  },
      { chord: 'F'  },
      { chord: 'G'  },
    ],
  },
  {
    id: 'VIm-I-IIm-V',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Am' },
      { chord: 'C'  },
      { chord: 'Dm' },
      { chord: 'G'  },
    ],
  },
  {
    id: 'VIm-V-IV-V',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Am' },
      { chord: 'G'  },
      { chord: 'F'  },
      { chord: 'G'  },
    ],
  },
  {
    id: 'VIm-IIIm-IV-V',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'Am' },
      { chord: 'Em' },
      { chord: 'F'  },
      { chord: 'G'  },
    ],
  },
  {
    id: 'VIm-IIIm-IV-IVm',
    no: 1,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'Am' },
      { chord: 'Em' },
      { chord: 'F'  },
      { chord: 'Fm'  },
    ],
  },
  {
    id: 'VIm-IV-I-V',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Am' },
      { chord: 'F'  },
      { chord: 'C'  },
      { chord: 'G'  },
    ],
  },
  // IIm로 시작
  {
    id: 'IIm-V-I-VIm',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Dm' },
      { chord: 'G'  },
      { chord: 'C'  },
      { chord: 'Am' },
    ],
  },
  {
    id: 'IIm-V-VIm-I',
    no: 1,
    keys: ['C', 'G'],
    steps: [
      { chord: 'Dm' },
      { chord: 'G'  },
      { chord: 'Am' },
      { chord: 'C'  },
    ],
  },
  {
    id: 'IIm-V-IIIm-VIm',
    no: 1,
    keys: ['C'],
    steps: [
      { chord: 'Dm' },
      { chord: 'G'  },
      { chord: 'Em' },
      { chord: 'Am' },
    ],
  },
  // IIIm로 시작
  {
    id: 'IIIm-VIm-IV-V',
    no: 1,
    keys: ['C'],
    steps: [
      { chord: 'Em' },
      { chord: 'Am' },
      { chord: 'F'  },
      { chord: 'G'  },
    ],
  },
  {
    id: 'IIIm-VIm-IIm-V',
    no: 1,
    keys: ['C'],
    recommended: true,
    steps: [
      { chord: 'Em' },
      { chord: 'Am' },
      { chord: 'Dm' },
      { chord: 'G'  },
    ],
  },

  // Tier 2: 7th 코드
  // I로 시작
  {
    id: 'I-V-VIm7-IV',
    no: 2,
    keys: ['C', 'G'],
    recommended: true,
    steps: [
      { chord: 'C'   },
      { chord: 'G' },
      { chord: 'Am7'   },
      { chord: 'F'  },
    ],
  },
  {
    id: 'I-V/3-VIm7-IV',
    no: 2,
    keys: ['C', 'G'],
    steps: [
      { chord: 'C'   },
      { chord: 'G/B' },
      { chord: 'Am7'   },
      { chord: 'F'  },
    ],
  },
  {
    id: 'I-V/3-VIm7-IIIm7',
    no: 2,
    keys: ['C', 'G'],
    steps: [
      { chord: 'C'   },
      { chord: 'G/B' },
      { chord: 'Am7'   },
      { chord: 'Em7'  },
    ],
  },
  {
    id: 'I-VIm7-IV-V7',
    no: 2,
    keys: ['C', 'G'],
    steps: [
      { chord: 'C'   },
      { chord: 'Am7' },
      { chord: 'F'   },
      { chord: 'G7'  },
    ],
  },
  {
    id: 'I/3-IV-V-VIm7',
    no: 2,
    keys: ['D', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'C/E'   },
      { chord: 'F' },
      { chord: 'G'   },
      { chord: 'Am7'  },
    ],
  },
  {
    id: 'I-III7-VIm7-IV',
    no: 2,
    keys: ['C', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'C'   },
      { chord: 'E7'  },
      { chord: 'Am7' },
      { chord: 'F'   },
    ],
  },
  {
    id: 'I-VI7-IIm7-V7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'C'   },
      { chord: 'A7'  },
      { chord: 'Dm7' },
      { chord: 'G7'   },
    ],
  },
  // IIm로 시작
  {
    id: 'IIm7-V7-IM7-VIm7',
    no: 2,
    keys: ['C', 'D', 'E', 'F', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'Dm7' },
      { chord: 'G7'  },
      { chord: 'CM7' },
      { chord: 'Am7' },
    ],
  },
  {
    id: 'IIm7-V7-I-I7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'Dm7' },
      { chord: 'G7'  },
      { chord: 'C' },
      { chord: 'C7' },
    ],
  },
  {
    id: 'IIm7-V7-III7-VIm7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'Dm7' },
      { chord: 'G7'  },
      { chord: 'E7' },
      { chord: 'Am7' },
    ],
  },
  // IV로 시작
  {
    id: 'IV-I-V-VIm7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'F'   },
      { chord: 'C'   },
      { chord: 'G' },
      { chord: 'Am7' },
    ],
  },
  {
    id: 'IV-V-I-I7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'F'   },
      { chord: 'G'   },
      { chord: 'C' },
      { chord: 'C7' },
    ],
  },
  {
    id: 'IV-V-VIm7-IIIm7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'F'   },
      { chord: 'G'   },
      { chord: 'Am7' },
      { chord: 'Em7' },
    ],
  },
  {
    id: 'IV-V-VIm7-I/3',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'F'   },
      { chord: 'G'   },
      { chord: 'Am7' },
      { chord: 'C/E' },
    ],
  },
  {
    id: 'IV-V-IIIm7-VIm7',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'F'   },
      { chord: 'G'   },
      { chord: 'Em7' },
      { chord: 'Am7' },
    ],
  },
  {
    id: 'IV-III7-VIm7-I',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    recommended: true,
    steps: [
      { chord: 'F'   },
      { chord: 'E7'  },
      { chord: 'Am7' },
      { chord: 'C'   },
    ],
  },
  {
    id: 'IV/3-V/3-I-I/3',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'F/A'   },
      { chord: 'G/B'   },
      { chord: 'C' },
      { chord: 'C/E' },
    ],
  },
  //VIm로 시작
  {
    id: 'VIm7-IIIm7-IV-I',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'Am7'   },
      { chord: 'Em7'   },
      { chord: 'F' },
      { chord: 'C' },
    ],
  },
  {
    id: 'VIm7-IIIm7-IV-V',
    no: 2,
    keys: ['C', 'D', 'E', 'G', 'A'],
    steps: [
      { chord: 'Am7'   },
      { chord: 'Em7'   },
      { chord: 'F' },
      { chord: 'G' },
    ],
  },
  {
    id: 'VIm7-IV-V-I',
    no: 2,
    keys: ['D', 'G', 'A'],
    steps: [
      { chord: 'Am7'   },
      { chord: 'F'   },
      { chord: 'G' },
      { chord: 'C' },
    ],
  },
];
