import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Share, Alert,
} from 'react-native';
import ChordDiagram from '../components/editor/ChordDiagram';
import WheelPicker   from '../components/editor/WheelPicker';
import OpenMuteRow   from '../components/editor/OpenMuteRow';
import { createEmptyChord, buildChordName } from '../lib/chord';
import { playString, playChord, stopAll, buildBarreMap } from '../lib/audio';
import { entryToChord } from '../lib/chord-library';
import { ROOTS_SHARP, ROOTS_FLAT } from '../constants/app';

// ── 피커 항목 ─────────────────────────────────────────────────
const TRIAD_ITEMS = [
  { value: '',    label: '-'   },
  { value: 'm',   label: 'm'   },
  { value: 'aug', label: 'aug' },
  { value: 'dim', label: 'dim' },
];
const SEVENTH_ITEMS = [
  { value: '',   label: '-'  },
  { value: 'M7', label: 'M7' },
  { value: '7',  label: '7'  },
  { value: '6',  label: '6'  },
];
const FUNC_ITEMS = [
  { value: '',      label: '-'    },
  { value: 'sus2',  label: 'sus2' },
  { value: 'sus4',  label: 'sus4' },
  { value: 'add9',  label: 'add9' },
  { value: 'b5',    label: 'b5'   },
];
const TENSION_ITEMS = [
  { value: '',    label: '-'   },
  { value: 'b9',  label: 'b9'  },
  { value: '9',   label: '9'   },
  { value: '#9',  label: '#9'  },
  { value: '11',  label: '11'  },
  { value: '#11', label: '#11' },
  { value: 'b13', label: 'b13' },
  { value: '13',  label: '13'  },
];

const FINGER_NUMS = [1, 2, 3, 4, 'T'];

// ── 유틸 ─────────────────────────────────────────────────────
function getBarreFrets(dots) {
  const count = {};
  dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[Number(f)] >= 2).map(Number);
}
function removeDotsUnderBarre(dots, f) {
  const same = dots.filter(d => d.f === f);
  if (same.length < 2) return dots;
  const minS = Math.min(...same.map(d => d.s));
  const maxS = Math.max(...same.map(d => d.s));
  return dots.filter(d => !(d.f < f && d.s >= minS && d.s <= maxS));
}
// 코드 객체 → 공유코드 문자열 (간단 JSON 포맷)
function encodeShareCode(chord) {
  try {
    if (!chord.dots?.length && !chord.root) return '';
    const data = {
      n: chord.name,
      fn: chord.fretNumber,
      d: chord.dots.map(d => [d.s, d.f, d.n ?? 0]),
      b: chord.barre,
      om: chord.openMute,
      acc: chord.accidental,
      root: chord.root,
    };
    return JSON.stringify(data);
  } catch { return ''; }
}

// ── 메인 화면 ────────────────────────────────────────────────
export default function EditorScreen({ importedEntry }) {
  const [chord, setChord]               = useState(createEmptyChord());
  const [selectedFinger, setSelectedFinger] = useState(1);
  const [strummedStrings, setStrummedStrings] = useState([]);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const strumTimer = useRef(null);

  const screenW      = Dimensions.get('window').width;
  const diagramWidth = Math.min(screenW - 48, 300);

  // 라이브러리에서 가져오기 { entry, fingeringIdx, ts }
  useEffect(() => {
    if (!importedEntry?.entry) return;
    const { entry, fingeringIdx } = importedEntry;
    const imported = entryToChord(entry, fingeringIdx ?? 0);
    setChord({
      ...createEmptyChord(),
      ...imported,
      name: entry.name || '',
    });
  }, [importedEntry]);

  // ── 파생값 ─────────────────────────────────────────────────
  const roots      = chord.accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const rootItems  = roots.map(r => ({ value: r, label: r }));
  const bassItems  = [{ value: '', label: '-' }, ...roots.map(r => ({ value: r, label: r }))];
  const barreFrets = getBarreFrets(chord.dots);
  const shareCode  = encodeShareCode(chord);

  // ── 상태 업데이트 ───────────────────────────────────────────
  const updateChord = useCallback((updater) => {
    setChord(prev => {
      const result = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (result === prev) return prev;
      result.name = buildChordName(result);
      return result;
    });
  }, []);

  // ── #/b 토글 ───────────────────────────────────────────────
  const setAccidental = useCallback((mode) => {
    setChord(prev => {
      const oldRoots = prev.accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
      const newRoots = mode === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
      const rootIdx  = oldRoots.indexOf(prev.root);
      const newRoot  = rootIdx >= 0 ? newRoots[rootIdx] : prev.root;
      const bassIdx  = ['', ...oldRoots].indexOf(prev.bass);
      const newBass  = bassIdx > 0 ? newRoots[bassIdx - 1] : '';
      const next = { ...prev, accidental: mode, root: newRoot, bass: newBass };
      next.name = buildChordName(next);
      return next;
    });
  }, []);

  // ── 초기화 ─────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopAll();
    setChord(createEmptyChord());
  }, []);

  // ── 재생 ───────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) { stopAll(); setIsPlaying(false); return; }
    setIsPlaying(true);
    try { await playChord(chord); } catch (e) {}
    setIsPlaying(false);
  }, [chord, isPlaying]);

  // ── 스트럼 ─────────────────────────────────────────────────
  const handleStrumString = useCallback((s) => {
    playString(s, chord);
    setStrummedStrings([s]);
    clearTimeout(strumTimer.current);
    strumTimer.current = setTimeout(() => setStrummedStrings([]), 800);
  }, [chord]);

  // ── 다이어그램 탭 ──────────────────────────────────────────
  const handleDiagramTap = useCallback((type, { s, f }) => {
    if (type === 'openMute') {
      updateChord(prev => {
        const hasDot = prev.dots.some(d => d.s === s);
        if (hasDot) {
          return {
            ...prev,
            dots: prev.dots.filter(d => d.s !== s),
            openMute: prev.openMute.map((v, i) => i === s ? 'open' : v),
          };
        }
        return {
          ...prev,
          openMute: prev.openMute.map((v, i) => i === s ? (v === 'mute' ? 'open' : 'mute') : v),
        };
      });
    } else if (type === 'dot') {
      updateChord(prev => {
        const barreMapCheck = buildBarreMap(prev.dots, prev.barre || {});
        const existingIdx   = prev.dots.findIndex(d => d.s === s && d.f === f);
        let newDots;
        const newOpenMute = [...prev.openMute];
        const fn = selectedFinger === 'T' ? 0 : selectedFinger;

        if (existingIdx !== -1) {
          newDots = prev.dots.filter((_, i) => i !== existingIdx);
          if (!newDots.some(d => d.s === s)) newOpenMute[s] = 'open';
        } else {
          const barreF = barreMapCheck[s];
          if (barreF !== undefined && f > barreF) {
            newDots = prev.dots.filter(d => d.s !== s || d.f === barreF);
          } else {
            newDots = prev.dots.filter(d => d.s !== s);
          }
          newDots.push({ s, f, n: fn });
          newOpenMute[s] = 'open';
        }
        return { ...prev, dots: newDots, openMute: newOpenMute };
      });
    }
  }, [selectedFinger, updateChord]);

  // ── 바레 토글 ───────────────────────────────────────────────
  const toggleBarre = useCallback((f) => {
    updateChord(prev => {
      const newBarre = { ...prev.barre };
      if (newBarre[f]) {
        newBarre[f] = false;
      } else {
        const activeCount = Object.values(newBarre).filter(Boolean).length;
        if (activeCount >= 2) return prev;
        newBarre[f] = true;
        const newDots = removeDotsUnderBarre(prev.dots, f);
        return { ...prev, barre: newBarre, dots: newDots };
      }
      return { ...prev, barre: newBarre };
    });
  }, [updateChord]);

  // ── 프렛 조정 ───────────────────────────────────────────────
  const adjustFret = useCallback((delta) => {
    updateChord(prev => ({ ...prev, fretNumber: Math.max(1, Math.min(12, prev.fretNumber + delta)) }));
  }, [updateChord]);

  // ── 공유 ────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Chorditor 공유코드: ${shareCode}\n코드명: ${chord.name || '—'}`,
      });
    } catch (e) {}
  }, [shareCode, chord.name]);

  return (
    <ScrollView
      style={st.root}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* ══ 카드: 코드명 + 피커 ═══════════════════════════════ */}
      <View style={st.card}>
        {/* 상단: #/b 토글 + 코드명 */}
        <View style={st.cardHeader}>
          <View style={st.accToggle}>
            <TouchableOpacity
              style={[st.accBtn, chord.accidental === 'sharp' && st.accBtnOn]}
              onPress={() => setAccidental('sharp')}
            >
              <Text style={[st.accText, chord.accidental === 'sharp' && st.accTextOn]}>#</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.accBtn, chord.accidental === 'flat' && st.accBtnOn]}
              onPress={() => setAccidental('flat')}
            >
              <Text style={[st.accText, chord.accidental === 'flat' && st.accTextOn]}>b</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.chordName} numberOfLines={1} adjustsFontSizeToFit>
            {chord.name || '—'}
          </Text>
        </View>

        {/* 피커 6열 */}
        <View style={st.pickerRow}>
          <PickerCol label="근음"  items={rootItems}     value={chord.root}              onSelect={v => updateChord({ root: v })} />
          <PickerCol label="3화음" items={TRIAD_ITEMS}   value={chord.triad}             onSelect={v => updateChord({ triad: v })} />
          <PickerCol label="7음"   items={SEVENTH_ITEMS} value={chord.seventh}           onSelect={v => updateChord({ seventh: v })} />
          <PickerCol label="기능"  items={FUNC_ITEMS}    value={chord.func}              onSelect={v => updateChord({ func: v })} />
          <PickerCol label="텐션"  items={TENSION_ITEMS} value={chord.tensions[0] ?? ''} onSelect={v => updateChord({ tensions: v ? [v] : [] })} />
          <PickerCol label="분수"  items={bassItems}     value={chord.bass}              onSelect={v => updateChord({ bass: v })} last />
        </View>
      </View>

      {/* ══ 카드: 다이어그램 ══════════════════════════════════ */}
      <View style={st.card}>
        {/* 모드 툴바 */}
        <View style={st.toolbar}>
          {/* 손가락 번호 버튼 (항상 표시) */}
          <View style={st.fingerRow}>
            {FINGER_NUMS.map(n => (
              <TouchableOpacity
                key={n}
                style={[st.fingerBtn, selectedFinger === n && st.fingerBtnOn]}
                onPress={() => setSelectedFinger(n)}
                activeOpacity={0.7}
              >
                <Text style={[st.fingerBtnText, selectedFinger === n && st.fingerBtnTextOn]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 프렛 조절 */}
          <View style={st.fretCtrl}>
            <Text style={st.fretLabel}>프렛</Text>
            <TouchableOpacity style={st.fretBtn} onPress={() => adjustFret(-1)}>
              <Text style={st.fretBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={st.fretVal}>{chord.fretNumber}</Text>
            <TouchableOpacity style={st.fretBtn} onPress={() => adjustFret(1)}>
              <Text style={st.fretBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 다이어그램 */}
        <View style={st.diagramWrap}>
          <ChordDiagram
            chord={chord}
            width={diagramWidth}
            onStrumString={handleStrumString}
            strummedStrings={strummedStrings}
            onTap={handleDiagramTap}
          />
          {/* 바레 버튼 */}
          {barreFrets.length > 0 && (
            <View style={st.barreRow}>
              {barreFrets.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[st.barreBtn, chord.barre[f] && st.barreBtnOn]}
                  onPress={() => toggleBarre(f)}
                >
                  <Text style={[st.barreBtnText, chord.barre[f] && st.barreBtnTextOn]}>B</Text>
                  <Text style={[st.barreBtnSub,  chord.barre[f] && st.barreBtnSubOn]}>{f}프</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 오픈/뮤트 행 */}
        <OpenMuteRow
          openMute={chord.openMute}
          onChange={om => updateChord({ openMute: om })}
        />

        {/* 힌트 */}
        <Text style={st.hint}>다이어그램을 탭하거나 좌우로 스트럼해 보세요</Text>

        {/* 액션 버튼: 초기화 / 재생 / 이미지저장 */}
        <View style={st.actionRow}>
          <TouchableOpacity style={st.actionBtn} onPress={handleReset}>
            <Text style={st.actionIcon}>↺</Text>
            <Text style={st.actionText}>초기화</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.actionBtn, isPlaying && st.actionBtnPlaying]}
            onPress={handlePlay}
          >
            <Text style={[st.actionIcon, isPlaying && st.actionIconPlaying]}>
              {isPlaying ? '■' : '▶'}
            </Text>
            <Text style={[st.actionText, isPlaying && st.actionTextPlaying]}>
              {isPlaying ? '정지' : '재생'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.actionBtn}
            onPress={() => Alert.alert('이미지 저장', '이미지 저장 기능은 준비 중입니다.')}
          >
            <Text style={st.actionIcon}>🖼</Text>
            <Text style={st.actionText}>이미지</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ 카드: 프로젝트에 저장 ════════════════════════════ */}
      <View style={st.card}>
        <Text style={st.sectionTitle}>프로젝트에 저장</Text>
        <Text style={st.sectionSub}>코드를 저장할 프로젝트를 선택하세요</Text>
        <TouchableOpacity
          style={st.saveBtn}
          onPress={() => Alert.alert('프로젝트 저장', '프로젝트 연동 기능은 준비 중입니다.')}
        >
          <Text style={st.saveBtnText}>+ 프로젝트에 저장</Text>
        </TouchableOpacity>
      </View>

      {/* ══ 카드: 공유코드 ══════════════════════════════════ */}
      <View style={[st.card, st.cardLast]}>
        <Text style={st.sectionTitle}>공유코드</Text>
        {shareCode ? (
          <>
            <View style={st.codeBox}>
              <Text style={st.codeText} numberOfLines={3} selectable>
                {shareCode}
              </Text>
            </View>
            <TouchableOpacity style={st.shareBtn} onPress={handleShare}>
              <Text style={st.shareBtnText}>코드 공유하기</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={st.sectionSub}>코드를 만든 후 공유코드가 생성됩니다</Text>
        )}
      </View>

    </ScrollView>
  );
}

// ── 피커 컬럼 ────────────────────────────────────────────────
function PickerCol({ label, items, value, onSelect, last }) {
  return (
    <View style={[st.pickerCol, last && { borderRightWidth: 0 }]}>
      <Text style={st.pickerLabel}>{label}</Text>
      <WheelPicker items={items} selectedValue={value} onSelect={onSelect} />
    </View>
  );
}

// ── 스타일 ───────────────────────────────────────────────────
const C = {
  bg:      '#ffffff',
  border:  '#d9d4cc',
  text:    '#1a1714',
  textSub: '#6b6560',
  textMut: '#a09b95',
  accent:  '#1a1714',
  blue:    '#5E9EFF',
};

const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingVertical: 20, paddingHorizontal: 20, paddingBottom: 60 },

  /* 카드 — 원본: border 1px, border-radius 14px, 패딩 없음(내부 섹션이 패딩) */
  card: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardLast: { marginBottom: 0 },

  /* 카드 헤더: 코드명 */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  accToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    overflow: 'hidden',
  },
  accBtn:    { paddingHorizontal: 10, paddingVertical: 5 },
  accBtnOn:  { backgroundColor: C.accent },
  accText:   { fontSize: 13, fontWeight: '500', color: C.text },
  accTextOn: { color: '#fff' },
  chordName: {
    flex: 1, fontSize: 24, fontWeight: '300',
    color: C.text, letterSpacing: -0.5,
  },

  /* 피커 */
  pickerRow: { flexDirection: 'row' },
  pickerCol: {
    flex: 1, alignItems: 'center',
    borderRightWidth: 1, borderRightColor: C.border,
  },
  pickerLabel: { fontSize: 9, color: C.textMut, marginTop: 4, marginBottom: 1 },

  /* 툴바 */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  /* 손가락 번호 */
  fingerRow: { flexDirection: 'row', gap: 5 },
  fingerBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  fingerBtnOn:      { backgroundColor: C.accent, borderColor: C.accent },
  fingerBtnText:    { fontSize: 12, color: C.textSub, fontWeight: '500' },
  fingerBtnTextOn:  { color: '#fff', fontWeight: '700' },

  /* 프렛 */
  fretCtrl: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: C.border, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  fretLabel:   { fontSize: 10, color: C.textSub },
  fretBtn:     { width: 18, height: 18, borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  fretBtnText: { fontSize: 13, color: C.text, lineHeight: 18 },
  fretVal:     { fontSize: 11, color: C.text, minWidth: 16, textAlign: 'center' },

  /* 다이어그램 */
  diagramWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  barreRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  barreBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#888',
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  barreBtnOn:       { backgroundColor: C.accent, borderColor: C.accent },
  barreBtnText:     { fontSize: 14, fontWeight: '600', color: '#888' },
  barreBtnTextOn:   { color: '#fff' },
  barreBtnSub:      { fontSize: 8, color: '#aaa', marginTop: -2 },
  barreBtnSubOn:    { color: 'rgba(255,255,255,0.7)' },

  /* 힌트 */
  hint: {
    textAlign: 'center', fontSize: 11, color: C.textMut,
    paddingVertical: 4, paddingBottom: 8,
  },

  /* 액션 버튼 */
  actionRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingBottom: 14,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f0eeec', borderRadius: 9,
    paddingVertical: 10, gap: 5,
    borderWidth: 1, borderColor: C.border,
  },
  actionBtnPlaying: { backgroundColor: '#fff3f2', borderColor: '#ffb3ae' },
  actionIcon:       { fontSize: 15, color: C.textSub },
  actionIconPlaying:{ color: '#e03c31' },
  actionText:       { fontSize: 13, color: C.textSub, fontWeight: '500' },
  actionTextPlaying:{ color: '#e03c31', fontWeight: '600' },

  /* 섹션 공통 */
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  sectionSub:   { fontSize: 12, color: C.textMut, paddingHorizontal: 14, paddingBottom: 12 },

  /* 프로젝트 저장 */
  saveBtn: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: C.accent,
    borderRadius: 9, paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* 공유코드 */
  codeBox: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#f5f5f5', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#e8e8e8',
  },
  codeText: { fontSize: 11, color: '#555', fontFamily: 'monospace', lineHeight: 18 },
  shareBtn: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: C.blue,
    borderRadius: 9, paddingVertical: 11, alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
