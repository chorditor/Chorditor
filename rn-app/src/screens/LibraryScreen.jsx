/**
 * LibraryScreen — 코드 사전
 * app.js / style.css 원본 완전 이식
 *
 * 레이아웃:
 *  [검색창]        ← 중앙, underline only
 *  [lib-viewer]   ← 선택 코드 큰 다이어그램 + 재생버튼
 *  [lib-action-bar] ← #/b + T(손가락번호) + 이미지저장 + 가져오기
 *  [lib-bottom]   ← root-list(45px) | card-grid(4열, 코드명 그룹화)
 *
 * 카드 그룹화: 동일 코드명 → 1장 카드 + 개수 뱃지
 * 복수 보이싱 클릭 → 보이싱 피커 모달(scale 팝업)
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, FlatList, StyleSheet, Dimensions,
  Modal, Pressable, Alert,
} from 'react-native';
import ChordDiagram from '../components/editor/ChordDiagram';
import { chordsLibrary, entryToChord } from '../lib/chord-library';
import { playChord } from '../lib/audio';

// ── 색상 (style.css :root 변수) ─────────────────────────────
const C = {
  bg:      '#ffffff',
  surface: '#ffffff',
  border:  '#d9d4cc',
  textPri: '#1a1714',
  textSec: '#6b6560',
  textMut: '#a09b95',
};

// ── 치수 ─────────────────────────────────────────────────────
const ALL_ROOTS  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_MAP   = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
const CARD_COLS  = 4;
const ROOT_W     = 45;   // lib-root-list: 45px (style.css)
const screenW    = Dimensions.get('window').width;
const GRID_W     = screenW - ROOT_W - 1;
const GAP        = 6;
const CARD_W     = Math.floor((GRID_W - GAP * (CARD_COLS - 1)) / CARD_COLS);
const DIAG_W     = Math.min(56, CARD_W - 4);   // lib-card-canvas: 56px CSS
const DIAG_H     = Math.round(DIAG_W * 3 / 4); // 4:3 비율
const VIEWER_W   = Math.min(screenW - 32, 320); // lib-canvas: 320px CSS

// ── 표시 이름 ─────────────────────────────────────────────────
function dispName(entry, useFlat) {
  return useFlat ? (entry.flatName || entry.name) : entry.name;
}

// ── 코드 카드 (미니 다이어그램, 고정 56px) ─────────────────
const ChordCard = React.memo(({ repEntry, allEntries, useFlat, showFinger, isActive, onPress }) => {
  const chord = useMemo(() => ({ ...entryToChord(repEntry), fingerNumMode: showFinger }), [repEntry, showFinger]);
  const count = allEntries.length;
  const name  = dispName(repEntry, useFlat);

  return (
    <TouchableOpacity
      style={[card.wrap, isActive && card.wrapActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {count > 1 && (
        <View style={card.badge}>
          <Text style={card.badgeTxt}>{count}</Text>
        </View>
      )}
      {/* 다이어그램 — 56px 고정, 4:3 */}
      <View style={card.diag}>
        <ChordDiagram chord={chord} width={DIAG_W} />
      </View>
      {/* 코드명 — Times New Roman serif 11px */}
      <Text style={card.name} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
});

const card = StyleSheet.create({
  wrap: {
    width: CARD_W,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingVertical: 6,
    paddingHorizontal: 2,
    position: 'relative',
    // border-radius: 0 (원본과 동일)
  },
  wrapActive:  { borderColor: C.textPri },
  badge: {
    position: 'absolute', top: 3, right: 3,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: C.textPri,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  badgeTxt: { color: '#fff', fontSize: 8, fontWeight: '700' },
  diag:     { width: DIAG_W, height: DIAG_H, overflow: 'hidden' },
  name: {
    fontFamily: 'serif',
    fontSize: 11,
    color: C.textPri,
    textAlign: 'center',
    marginTop: 3,
    width: CARD_W - 4,
  },
});

// ── 메인 ─────────────────────────────────────────────────────
export default function LibraryScreen({ onImport }) {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [useFlat,      setUseFlat]      = useState(false);
  const [showFinger,   setShowFinger]   = useState(true);   // T 버튼 = 손가락번호 표시
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeEntry,  setActiveEntry]  = useState(null);   // 뷰어에 표시 중
  const [activeFinIdx, setActiveFinIdx] = useState(0);

  // 보이싱 피커 모달
  const [voicingGroup, setVoicingGroup] = useState(null); // { name, entries }
  const voicingOpen = !!voicingGroup;

  // 루트 레이블
  const rootLabel = r => useFlat ? (FLAT_MAP[r] || r) : r;

  // 현재 근음의 엔트리 목록
  const entriesForRoot = useMemo(() =>
    chordsLibrary[selectedRoot] || []
  , [selectedRoot]);

  // 코드명 기준 그룹화 (원본 renderLibCards 로직과 동일)
  const groups = useMemo(() => {
    const list = searchQuery.trim()
      ? (() => {
          const q = searchQuery.trim().toLowerCase();
          const out = [];
          ALL_ROOTS.forEach(r => {
            (chordsLibrary[r] || []).forEach(e => {
              if ((e.name||'').toLowerCase().includes(q) ||
                  (e.flatName||'').toLowerCase().includes(q)) out.push(e);
            });
          });
          return out;
        })()
      : entriesForRoot;

    const map = new Map(); // name → [entry, ...]
    list.forEach(e => {
      if (!map.has(e.name)) map.set(e.name, []);
      map.get(e.name).push(e);
    });
    // Map → 배열로
    return Array.from(map.entries()).map(([name, entries]) => ({ name, entries, rep: entries[0] }));
  }, [entriesForRoot, searchQuery]);

  // 뷰어 chord (showFinger 반영)
  const viewerChord = useMemo(() => {
    if (!activeEntry) return null;
    return { ...entryToChord(activeEntry, activeFinIdx), fingerNumMode: showFinger };
  }, [activeEntry, activeFinIdx, showFinger]);

  // 카드 클릭
  const handleCardPress = useCallback((grp) => {
    if (grp.entries.length === 1) {
      setActiveEntry(grp.entries[0]);
      setActiveFinIdx(0);
    } else {
      // 복수 보이싱 → 피커 모달
      setVoicingGroup(grp);
    }
  }, []);

  // 보이싱 피커에서 항목 선택
  const handleVoicingSelect = useCallback((entry) => {
    setActiveEntry(entry);
    setActiveFinIdx(0);
    setVoicingGroup(null);
  }, []);

  // 재생
  const handlePlay = useCallback(async () => {
    if (!viewerChord) return;
    try { await playChord(viewerChord); } catch {}
  }, [viewerChord]);

  // 가져오기
  const handleImport = useCallback(() => {
    if (!activeEntry || !onImport) return;
    onImport(activeEntry, activeFinIdx);
  }, [activeEntry, activeFinIdx, onImport]);

  // 근음 탭
  const handleRootPress = useCallback((root) => {
    setSelectedRoot(root);
    setSearchQuery('');
    setVoicingGroup(null);
  }, []);

  // FlatList 4열 rows
  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < groups.length; i += CARD_COLS)
      r.push(groups.slice(i, i + CARD_COLS));
    return r;
  }, [groups]);

  const renderRow = useCallback(({ item: rowGrps }) => (
    <View style={st.gridRow}>
      {rowGrps.map((grp, i) => (
        <ChordCard
          key={grp.name + i}
          repEntry={grp.rep}
          allEntries={grp.entries}
          useFlat={useFlat}
          showFinger={showFinger}
          isActive={activeEntry ? activeEntry.name === grp.name : false}
          onPress={() => handleCardPress(grp)}
        />
      ))}
      {Array.from({ length: CARD_COLS - rowGrps.length }).map((_, i) => (
        <View key={'e'+i} style={{ width: CARD_W }} />
      ))}
    </View>
  ), [useFlat, showFinger, activeEntry, handleCardPress]);

  return (
    <View style={st.root}>

      {/* ── 1. 검색창 ── */}
      <View style={st.searchBar}>
        <Text style={st.searchIcon}>🔍</Text>
        <TextInput
          style={st.searchInput}
          placeholder="코드 검색... (C, Am, G7)"
          placeholderTextColor={C.textMut}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}
            hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Text style={st.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. 뷰어 ── */}
      <View style={st.viewer}>
        {viewerChord ? (
          <>
            <Text style={st.viewerName}>{dispName(activeEntry, useFlat)}</Text>
            <ChordDiagram chord={viewerChord} width={VIEWER_W} />
            {/* 운지 내비 */}
            {activeEntry?.fingerings?.length > 1 && (
              <View style={st.fingerNav}>
                <TouchableOpacity style={st.fingerNavBtn}
                  onPress={() => setActiveFinIdx(i => Math.max(0, i - 1))}>
                  <Text style={st.fingerNavArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={st.fingerNavLabel}>
                  {activeFinIdx + 1} / {activeEntry.fingerings.length}
                </Text>
                <TouchableOpacity style={st.fingerNavBtn}
                  onPress={() => setActiveFinIdx(i =>
                    Math.min(activeEntry.fingerings.length - 1, i + 1))}>
                  <Text style={st.fingerNavArrow}>›</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={st.playBtn} onPress={handlePlay}>
              <Text style={st.playBtnText}>▶</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={st.viewerEmpty}>
            <Text style={st.viewerEmptyTxt}>코드를 선택하세요</Text>
          </View>
        )}
      </View>

      {/* ── 3. 액션 바 ── */}
      <View style={st.actionBar}>
        {/* #/b 토글 */}
        <View style={st.accToggle}>
          <TouchableOpacity
            style={[st.accBtn, !useFlat && st.accBtnOn]}
            onPress={() => setUseFlat(false)}>
            <Text style={[st.accText, !useFlat && st.accTextOn]}>#</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.accBtn, useFlat && st.accBtnOn]}
            onPress={() => setUseFlat(true)}>
            <Text style={[st.accText, useFlat && st.accTextOn]}>b</Text>
          </TouchableOpacity>
        </View>

        {/* T — 손가락 번호 표시 토글 */}
        <TouchableOpacity
          style={[st.modeBtn, showFinger && st.modeBtnOn]}
          onPress={() => setShowFinger(v => !v)}>
          <Text style={[st.modeBtnTxt, showFinger && st.modeBtnTxtOn]}>T</Text>
        </TouchableOpacity>

        <View style={st.abSpacer} />

        <TouchableOpacity style={st.abBtn}
          onPress={() => Alert.alert('이미지 저장', '준비 중입니다.')}>
          <Text style={st.abBtnTxt}>이미지 저장</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.abBtn, st.abBtnPri]}
          onPress={handleImport}
          disabled={!activeEntry}>
          <Text style={[st.abBtnTxt, st.abBtnPriTxt]}>가져오기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. 하단: 근음 + 카드 그리드 ── */}
      <View style={st.bottom}>

        {/* 근음 목록 */}
        <ScrollView style={st.rootList} showsVerticalScrollIndicator={false}>
          {ALL_ROOTS.map(root => (
            <TouchableOpacity
              key={root}
              style={[st.rootItem, selectedRoot === root && !searchQuery && st.rootItemOn]}
              onPress={() => handleRootPress(root)}>
              <Text style={[st.rootTxt, selectedRoot === root && !searchQuery && st.rootTxtOn]}>
                {rootLabel(root)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 카드 그리드 */}
        {groups.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyTxt}>등록된 코드 없음</Text>
          </View>
        ) : (
          <FlatList
            style={st.cardsArea}
            data={rows}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.cardsContent}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews
          />
        )}

        {/* 보이싱 피커 오버레이 (lib-voicing-modal 이식) */}
        {voicingOpen && (
          <TouchableOpacity
            style={st.voicingOverlay}
            activeOpacity={1}
            onPress={() => setVoicingGroup(null)}
          />
        )}
        {voicingOpen && (
          <View style={st.voicingModal}>
            {/* 모달 헤더 */}
            <View style={st.voicingHeader}>
              <Text style={st.voicingHeaderTxt}>
                {dispName(voicingGroup.rep, useFlat)} — 보이싱 선택
              </Text>
              <TouchableOpacity
                onPress={() => setVoicingGroup(null)}
                hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Text style={st.voicingClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* 보이싱 그리드 */}
            <ScrollView>
              <View style={st.voicingGrid}>
                {voicingGroup.entries.map((entry, i) => {
                  const ch = entryToChord(entry);
                  const isAct = activeEntry === entry;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[card.wrap, isAct && card.wrapActive]}
                      onPress={() => handleVoicingSelect(entry)}
                      activeOpacity={0.7}>
                      <View style={card.diag}>
                        <ChordDiagram chord={ch} width={DIAG_W} />
                      </View>
                      <Text style={card.name} numberOfLines={1}>
                        {dispName(entry, useFlat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

      </View>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* 1. 검색창 */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: Math.min(320, screenW - 24),
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginTop: 14,
    gap: 8,
    flexShrink: 0,
  },
  searchIcon:  { fontSize: 13, color: C.textMut },
  searchInput: { flex: 1, fontSize: 14, color: C.textPri, height: 24 },
  clearBtn:    { fontSize: 13, color: C.textMut, paddingLeft: 4 },

  /* 2. 뷰어 */
  viewer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  viewerName: {
    fontFamily: 'serif',
    fontSize: 24,
    color: C.textPri,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  viewerEmpty: {
    height: Math.round(VIEWER_W * 3 / 4) + 56,
    alignItems: 'center', justifyContent: 'center',
  },
  viewerEmptyTxt: { fontSize: 13, color: C.textMut },

  fingerNav: { flexDirection:'row', alignItems:'center', gap:4, marginTop:6 },
  fingerNavBtn: {
    width:28, height:28, alignItems:'center', justifyContent:'center',
    borderWidth:1, borderColor:C.border, borderRadius:6,
  },
  fingerNavArrow: { fontSize:18, color:C.textSec, lineHeight:22 },
  fingerNavLabel: { fontSize:12, color:C.textMut, minWidth:32, textAlign:'center' },

  playBtn: {
    width: Math.min(320, screenW - 32),
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  playBtnText: { fontSize: 18, color: C.textSec },

  /* 3. 액션 바 */
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
    flexShrink: 0,
  },
  accToggle: {
    flexDirection:'row',
    borderWidth:1, borderColor:C.border,
    borderRadius:6, overflow:'hidden',
  },
  accBtn:    { paddingHorizontal:12, paddingVertical:4 },
  accBtnOn:  { backgroundColor: C.textPri },
  accText:   { fontSize:13, fontWeight:'500', color:C.textSec },
  accTextOn: { color:'#fff' },

  modeBtn: {
    height:32, paddingHorizontal:12,
    borderRadius:6, borderWidth:1, borderColor:C.border,
    alignItems:'center', justifyContent:'center',
    backgroundColor:'transparent',
  },
  modeBtnOn:    { backgroundColor: C.textPri, borderColor: C.textPri },
  modeBtnTxt:   { fontSize:13, color:C.textSec, fontWeight:'500' },
  modeBtnTxtOn: { color:'#fff' },

  abSpacer: { flex:1 },
  abBtn: {
    height:32, paddingHorizontal:12,
    borderRadius:6, borderWidth:1, borderColor:C.border,
    alignItems:'center', justifyContent:'center',
    backgroundColor:'transparent',
  },
  abBtnPri:    { backgroundColor:C.textPri, borderColor:C.textPri },
  abBtnTxt:    { fontSize:12, color:C.textSec, letterSpacing:0.02 },
  abBtnPriTxt: { color:'#fff', fontWeight:'600' },

  /* 4. 하단 */
  bottom: {
    flex:1,
    flexDirection:'row',
    position:'relative',
    overflow:'hidden',
  },

  /* 근음 목록 */
  rootList:   { width:ROOT_W, borderRightWidth:1, borderRightColor:C.border },
  rootItem:   {
    height:ROOT_W,
    alignItems:'center', justifyContent:'center',
    borderBottomWidth:1, borderBottomColor:C.border,
  },
  rootItemOn: { backgroundColor: C.textPri },
  rootTxt:    { fontSize:13, color:C.textSec, fontWeight:'500' },
  rootTxtOn:  { color:'#fff', fontWeight:'700' },

  /* 카드 그리드 */
  cardsArea:    { flex:1 },
  cardsContent: { paddingBottom:24 },
  gridRow:      { flexDirection:'row', gap:GAP, paddingTop:GAP },

  /* 빈 결과 */
  empty:    { flex:1, alignItems:'center', justifyContent:'center' },
  emptyTxt: { fontSize:13, color:C.textMut },

  /* 보이싱 피커 오버레이/모달 */
  voicingOverlay: {
    position:'absolute',
    top:0, bottom:0,
    left:ROOT_W + 1,
    right:0,
    backgroundColor:'rgba(0,0,0,0.35)',
    zIndex:100,
  },
  voicingModal: {
    position:'absolute',
    top:0, bottom:0,
    left:ROOT_W + 1,
    right:0,
    backgroundColor: C.bg,
    zIndex:101,
  },
  voicingHeader: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:12,
    paddingVertical:10,
    borderBottomWidth:1,
    borderBottomColor:C.border,
  },
  voicingHeaderTxt: { fontSize:13, color:C.textSec },
  voicingClose:     { fontSize:18, color:C.textMut },
  voicingGrid: {
    flexDirection:'row',
    flexWrap:'wrap',
    gap:GAP,
    padding:GAP,
  },
});
