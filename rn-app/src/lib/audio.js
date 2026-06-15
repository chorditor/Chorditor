import { AudioContext } from 'react-native-audio-api';
import { STRINGS } from '../constants/app';

// 개방현 MIDI 번호 (s=0: 1번줄 고음 E, s=5: 6번줄 저음 E)
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

let audioCtx = null;
const renderedCache = {};
let activeSources = [];

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ── Karplus-Strong 합성 ──────────────────────────────────────────
async function renderKarplusStrong(freq, duration) {
  const ctx = getAudioCtx();
  const sr    = ctx.sampleRate || 44100;
  const total = Math.round(sr * duration);
  const N     = Math.round(sr / freq);
  const d     = new Float32Array(total);
  const delay = new Float32Array(N);
  const decay = 1 - (0.5 / (N * 2));

  for (let i = 0; i < N; i++) delay[i] = (Math.random() * 2 - 1) * 0.5;
  for (let i = 0; i < total; i++) {
    const idx  = i % N;
    const next = (i + 1) % N;
    d[i] = delay[idx];
    delay[idx] = decay * 0.5 * (delay[idx] + delay[next]);
  }

  const buf = ctx.createBuffer(1, total, sr);
  buf.copyToChannel(d, 0);
  return buf;
}

async function getBuffer(freq, duration) {
  const key = freq.toFixed(2) + '_' + duration;
  if (!renderedCache[key]) {
    renderedCache[key] = await renderKarplusStrong(freq, duration);
  }
  return renderedCache[key];
}

// ── 바레 맵 빌드 ────────────────────────────────────────────────
export function buildBarreMap(dotList, barre) {
  const count = {};
  dotList.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  const map = {};
  Object.keys(count)
    .filter(f => count[f] >= 2 && barre[Number(f)])
    .forEach(f => {
      const fNum = Number(f);
      const same = dotList.filter(d => d.f === fNum);
      const minS = Math.min(...same.map(d => d.s));
      const maxS = Math.max(...same.map(d => d.s));
      for (let s = minS; s <= maxS; s++) map[s] = fNum;
    });
  return map;
}

// ── 코드 음표 계산 ───────────────────────────────────────────────
export function calcChordNotes(chord, capoOffset = 0) {
  // fretNumber=1: column1=fret1, fretBase=0
  // fretNumber=2: column1=fret2, fretBase=1  → fretBase = fretNumber - 1
  const fretBase  = Math.max(0, (chord.fretNumber || 1) - 1);
  const barreMap  = buildBarreMap(chord.dots, chord.barre || {});
  const notes     = [];

  for (let s = 0; s < STRINGS; s++) {
    if (chord.openMute[s] === 'mute') continue;
    const sd       = chord.dots.filter(d => d.s === s);
    const dot      = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const barreFret = barreMap[s];
    let fret = 0;

    if (dot !== undefined && barreFret !== undefined) {
      fret = fretBase + Math.max(dot.f, barreFret);
    } else if (dot !== undefined) {
      fret = fretBase + dot.f;
    } else if (barreFret !== undefined) {
      fret = fretBase + barreFret;
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret + capoOffset });
  }
  return notes;
}

// ── 단일 줄 재생 (스트럼 제스처용) ──────────────────────────────
export async function playString(stringIndex, chord, capoOffset = 0) {
  const notes = calcChordNotes(chord, capoOffset);
  const note  = notes.find(n => n.s === stringIndex);
  if (!note) return; // muted string

  const ctx  = getAudioCtx();
  const freq = midiToFreq(note.midi);
  const buf  = await getBuffer(freq, 2.5);

  const src  = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(ctx.currentTime);
  activeSources.push(src);
}

// ── 코드 전체 재생 (자동 스트럼) ─────────────────────────────────
export async function playChord(chord, capoOffset = 0) {
  const ctx   = getAudioCtx();
  const notes = calcChordNotes(chord, capoOffset).sort((a, b) => b.s - a.s);
  if (!notes.length) return;

  stopAll();
  const DURATION = 2.5;
  const INTERVAL = 0.075;
  const now      = ctx.currentTime + 0.05;
  const buffers  = await Promise.all(notes.map(n => getBuffer(midiToFreq(n.midi), DURATION)));

  buffers.forEach((buf, i) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(now + i * INTERVAL);
    activeSources.push(src);
  });
}

// ── 재생 중지 ────────────────────────────────────────────────────
export function stopAll() {
  activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  activeSources = [];
}
