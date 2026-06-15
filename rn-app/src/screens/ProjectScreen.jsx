import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChordDiagram from '../components/editor/ChordDiagram';
import {
  loadProjects, createProject, updateProject, deleteProject,
} from '../lib/projects';
import { createEmptyLine } from '../lib/utils';
import { playChord, stopAll } from '../lib/audio';

const C = {
  bg:            '#ffffff',
  border:        '#d9d4cc',
  textPrimary:   '#1a1714',
  textSecondary: '#6b6560',
  textMuted:     '#a09b95',
  accent:        '#e03c31',
  surface:       '#f5f4f2',
  playing:       'rgba(255,200,0,0.35)',
};

// ── 루트: 리스트 ↔ 상세 전환 ─────────────────────────────────────
export default function ProjectScreen() {
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return (
      <ProjectDetailView
        projectId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }
  return <ProjectListView onSelect={setSelectedId} />;
}

// ════════════════════════════════════════════════════════════════
// 프로젝트 목록
// ════════════════════════════════════════════════════════════════
function ProjectListView({ onSelect }) {
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const createInputRef = useRef(null);

  const refresh = useCallback(async () => {
    const list = await loadProjects();
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    setProjects(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startCreate = useCallback(() => {
    setNewName('');
    setCreating(true);
    setTimeout(() => createInputRef.current?.focus(), 80);
  }, []);

  const confirmCreate = useCallback(async () => {
    const name = newName.trim();
    setCreating(false);
    if (!name) return;
    const p = await createProject(name);
    setProjects(prev => [p, ...prev]);
  }, [newName]);

  const handleDelete = useCallback((id) => {
    Alert.alert('프로젝트 삭제', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deleteProject(id);
          setProjects(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.listHeader}>
        <Text style={s.listTitle}>프로젝트</Text>
        <TouchableOpacity style={s.createBtn} onPress={startCreate} activeOpacity={0.75}>
          <Text style={s.createBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 새 프로젝트 인라인 입력 */}
      {creating && (
        <View style={s.createRow}>
          <TextInput
            ref={createInputRef}
            style={s.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="프로젝트 이름"
            placeholderTextColor={C.textMuted}
            returnKeyType="done"
            onSubmitEditing={confirmCreate}
            autoFocus
          />
          <TouchableOpacity style={s.createConfirmBtn} onPress={confirmCreate} activeOpacity={0.8}>
            <Text style={s.createConfirmBtnText}>추가</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.createCancelBtn} onPress={() => setCreating(false)} activeOpacity={0.7}>
            <Text style={s.createCancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.textPrimary} />
      ) : projects.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>아직 프로젝트가 없어요</Text>
          <Text style={s.emptyHint}>+ 버튼으로 새 프로젝트를 만드세요</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={s.projectItem}
              onPress={() => onSelect(p.id)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.projectName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.projectMeta}>
                  코드 {p.chords?.length ?? 0}개 · 줄 {p.arrangement?.length ?? 0}개
                </Text>
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDelete(p.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════
// 프로젝트 상세
// ════════════════════════════════════════════════════════════════
function ProjectDetailView({ projectId, onBack }) {
  const [project,        setProject]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [editMode,       setEditMode]       = useState(false);
  const [selectedThumb,  setSelectedThumb]  = useState(null);
  const [playingSlot,    setPlayingSlot]    = useState(null);
  const [playbackActive, setPlaybackActive] = useState(false);

  const playTimerRef = useRef(null);

  // ── 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const list = await loadProjects();
      const p = list.find(x => x.id === projectId) || null;
      if (p) {
        if (!p.arrangement || p.arrangement.length === 0) {
          p.arrangement = [createEmptyLine()];
        }
        p.arrangement.forEach(row => {
          if (!row.slots) row.slots = new Array(8).fill(null);
          else if (row.slots.length < 8) {
            const ns = new Array(8).fill(null);
            row.slots.forEach((id, i) => { if (id) ns[i * 2] = id; });
            row.slots = ns;
          }
        });
        p.colCount = p.colCount || 4;
      }
      setProject(p);
      setLoading(false);
    })();
    return () => { clearTimeout(playTimerRef.current); stopAll(); };
  }, [projectId]);

  // ── 저장 헬퍼 ─────────────────────────────────────────────────
  const saveProject = useCallback(async (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    setProject(next);
    await updateProject(next);
  }, []);

  if (loading || !project) {
    return (
      <SafeAreaView style={s.container}>
        {loading
          ? <ActivityIndicator style={{ marginTop: 60 }} color={C.textPrimary} />
          : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.textMuted, marginBottom: 16 }}>프로젝트를 찾을 수 없어요</Text>
              <TouchableOpacity onPress={onBack}>
                <Text style={{ color: C.accent }}>← 돌아가기</Text>
              </TouchableOpacity>
            </View>
          )
        }
      </SafeAreaView>
    );
  }

  const colCount     = project.colCount || 4;
  const screenW      = Dimensions.get('window').width;
  const slotAreaW    = screenW - 32 - (editMode ? 36 : 0);
  const slotW        = Math.floor(slotAreaW / colCount) - 4;
  const slotH        = Math.round(slotW / (4 / 3));
  const thumbW       = 80;
  const dataIndices  = colCount === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];

  // ── 컨트롤 핸들러 ─────────────────────────────────────────────
  const adjustCapo = (delta) => {
    const next = { ...project, capo: Math.max(0, Math.min(12, (project.capo ?? 0) + delta)) };
    saveProject(next);
  };

  const toggleColCount = () => saveProject({ ...project, colCount: colCount === 4 ? 8 : 4 });

  const addLine = () => {
    saveProject({ ...project, arrangement: [...project.arrangement, createEmptyLine()] });
  };

  const deleteLine = (lineId) => {
    if (project.arrangement.length <= 1) return;
    saveProject({ ...project, arrangement: project.arrangement.filter(r => r.id !== lineId) });
  };

  const addLineAbove = (lineId) => {
    const idx = project.arrangement.findIndex(r => r.id === lineId);
    if (idx === -1) return;
    const arr = [...project.arrangement];
    arr.splice(idx, 0, createEmptyLine());
    saveProject({ ...project, arrangement: arr });
  };

  const updateLineText = (lineId, text) => {
    const arr = project.arrangement.map(r => r.id === lineId ? { ...r, text } : r);
    setProject(prev => ({ ...prev, arrangement: arr }));
  };

  const flushLineText = () => updateProject({ ...project, updatedAt: Date.now() });

  const placeChordInSlot = (lineId, dataIdx, chordId) => {
    const arr = project.arrangement.map(r => {
      if (r.id !== lineId) return r;
      const slots = [...r.slots];
      slots[dataIdx] = chordId;
      return { ...r, slots };
    });
    saveProject({ ...project, arrangement: arr });
  };

  const handleSlotTap = (lineId, dataIdx, chordId) => {
    if (editMode) {
      if (selectedThumb) {
        placeChordInSlot(lineId, dataIdx, selectedThumb);
        setSelectedThumb(null);
      } else if (chordId) {
        placeChordInSlot(lineId, dataIdx, null);
      }
    } else {
      if (chordId) {
        const chord = project.chords?.find(c => c.id === chordId);
        if (chord) {
          playChord(chord, project.capo ?? 0);
          setPlayingSlot({ lineId, dataIdx });
          setTimeout(() => setPlayingSlot(null), 1500);
        }
      }
    }
  };

  const playAll = async () => {
    if (playbackActive) { stopAll(); setPlaybackActive(false); clearTimeout(playTimerRef.current); return; }
    const bpm    = project.bpm ?? 120;
    const beatMs = 60000 / bpm;
    const slotMs = colCount === 4 ? beatMs * 4 : beatMs * 2;
    const capo   = project.capo ?? 0;
    const ordered = project.arrangement.flatMap(row =>
      dataIndices.map(di => ({ lineId: row.id, dataIdx: di, chordId: row.slots[di] ?? null }))
    );
    if (!ordered.length) return;
    setPlaybackActive(true);
    let i = 0;
    const next = () => {
      if (i >= ordered.length) { setPlaybackActive(false); setPlayingSlot(null); return; }
      const item = ordered[i++];
      setPlayingSlot({ lineId: item.lineId, dataIdx: item.dataIdx });
      if (item.chordId) {
        const chord = project.chords?.find(c => c.id === item.chordId);
        if (chord) playChord(chord, capo);
      }
      playTimerRef.current = setTimeout(next, slotMs);
    };
    next();
  };

  const deleteChordFromProject = (chordId) => {
    const chords = project.chords.filter(c => c.id !== chordId);
    const arrangement = project.arrangement.map(row => ({
      ...row,
      slots: row.slots.map(s => s === chordId ? null : s),
    }));
    saveProject({ ...project, chords, arrangement });
    if (selectedThumb === chordId) setSelectedThumb(null);
  };

  return (
    <SafeAreaView style={s.container}>

      {/* ── 헤더 1행 ── */}
      <View style={s.detailHeader1}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={s.projectNameInput}
          value={project.name}
          onChangeText={t => setProject(prev => ({ ...prev, name: t }))}
          onBlur={() => saveProject(project)}
          selectTextOnFocus
          returnKeyType="done"
        />
        <TouchableOpacity style={s.colToggleBtn} onPress={toggleColCount} activeOpacity={0.75}>
          <Text style={s.colToggleBtnText}>{colCount === 4 ? '4칸' : '8칸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.editBtn, editMode && s.editBtnActive]}
          onPress={() => setEditMode(e => !e)}
          activeOpacity={0.75}
        >
          <Text style={[s.editBtnText, editMode && s.editBtnTextActive]}>
            {editMode ? '완료' : '편집'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 헤더 2행 ── */}
      <View style={s.detailHeader2}>
        <View style={s.capoControl}>
          <Text style={s.controlLabel}>Capo</Text>
          <TouchableOpacity style={s.controlBtn} onPress={() => adjustCapo(-1)} activeOpacity={0.7}>
            <Text style={s.controlBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.controlValue}>{project.capo ?? 0}</Text>
          <TouchableOpacity style={s.controlBtn} onPress={() => adjustCapo(1)} activeOpacity={0.7}>
            <Text style={s.controlBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={s.bpmControl}>
          <Text style={s.controlLabel}>BPM</Text>
          <TextInput
            style={s.bpmInput}
            value={String(project.bpm ?? 120)}
            keyboardType="number-pad"
            onChangeText={v => setProject(prev => ({ ...prev, bpm: parseInt(v) || prev.bpm }))}
            onBlur={() => saveProject(project)}
            selectTextOnFocus
          />
        </View>

        <TouchableOpacity
          style={[s.playAllBtn, playbackActive && s.playAllBtnActive]}
          onPress={playAll}
          activeOpacity={0.8}
        >
          <Text style={[s.playAllBtnText, playbackActive && { color: '#fff' }]}>
            {playbackActive ? '■' : '▶'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 코드 썸네일 ── */}
      {project.chords?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.thumbScroll}
          contentContainerStyle={s.thumbContainer}
        >
          {project.chords.map(chord => (
            <TouchableOpacity
              key={chord.id}
              style={[s.thumbItem, selectedThumb === chord.id && s.thumbItemSelected]}
              onPress={() => setSelectedThumb(selectedThumb === chord.id ? null : chord.id)}
              onLongPress={() => {
                if (!editMode) return;
                Alert.alert('코드 삭제', `"${chord.name}"을(를) 삭제할까요?`, [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => deleteChordFromProject(chord.id) },
                ]);
              }}
              activeOpacity={0.75}
            >
              <ChordDiagram chord={chord} width={thumbW} />
              <Text style={[s.thumbName, selectedThumb === chord.id && s.thumbNameSelected]} numberOfLines={1}>
                {chord.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── 라인 목록 ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {project.arrangement.map(line => (
          <LineRow
            key={line.id}
            line={line}
            project={project}
            editMode={editMode}
            dataIndices={dataIndices}
            slotW={slotW}
            slotH={slotH}
            playingSlot={playingSlot}
            selectedThumb={selectedThumb}
            onSlotTap={handleSlotTap}
            onTextChange={updateLineText}
            onTextBlur={flushLineText}
            onDelete={() => deleteLine(line.id)}
            onAddAbove={() => addLineAbove(line.id)}
          />
        ))}

        <TouchableOpacity style={s.addLineBtn} onPress={addLine} activeOpacity={0.75}>
          <Text style={s.addLineBtnText}>+ 줄 추가</Text>
        </TouchableOpacity>
      </ScrollView>

    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════
// 줄 (라인) 컴포넌트
// ════════════════════════════════════════════════════════════════
function LineRow({
  line, project, editMode, dataIndices,
  slotW, slotH, playingSlot, selectedThumb,
  onSlotTap, onTextChange, onTextBlur,
  onDelete, onAddAbove,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={s.lineRow}>
      {/* 코드 슬롯 행 */}
      <View style={s.chordArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            {dataIndices.map(di => {
              const chordId  = line.slots?.[di] ?? null;
              const chord    = chordId ? project.chords?.find(c => c.id === chordId) : null;
              const isPlaying = playingSlot?.lineId === line.id && playingSlot?.dataIdx === di;
              const isTarget  = editMode && !!selectedThumb && !chord;

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    s.slot,
                    { width: slotW, height: slotH + 18 },
                    isPlaying && s.slotPlaying,
                    isTarget  && s.slotTarget,
                  ]}
                  onPress={() => onSlotTap(line.id, di, chordId)}
                  activeOpacity={chord ? 0.8 : 0.5}
                >
                  {chord ? (
                    <>
                      <ChordDiagram chord={chord} width={slotW - 4} />
                      <Text style={s.slotChordName} numberOfLines={1}>{chord.name}</Text>
                      {editMode && (
                        <View style={s.slotDelBtn}>
                          <Text style={s.slotDelBtnText}>✕</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={[s.slotEmpty, { width: slotW - 4, height: slotH - 4 }]}>
                      {isTarget && <Text style={s.slotTargetText}>+</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 편집 모드: 3-dot 메뉴 */}
        {editMode && (
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={s.rowMenuBtn}
              onPress={() => setMenuOpen(m => !m)}
              activeOpacity={0.7}
            >
              <Text style={s.rowMenuBtnText}>⋮</Text>
            </TouchableOpacity>
            {menuOpen && (
              <View style={s.rowMenu}>
                <TouchableOpacity
                  style={s.rowMenuItem}
                  onPress={() => { setMenuOpen(false); onAddAbove(); }}
                >
                  <Text style={s.rowMenuItemText}>위에 줄 추가</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.rowMenuItem, { borderTopWidth: 1, borderTopColor: C.border }]}
                  onPress={() => { setMenuOpen(false); onDelete(); }}
                >
                  <Text style={[s.rowMenuItemText, { color: C.accent }]}>줄 삭제</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 가사/텍스트 */}
      <TextInput
        style={s.lineText}
        value={line.text || ''}
        onChangeText={t => onTextChange(line.id, t)}
        onBlur={onTextBlur}
        multiline
        placeholder="가사나 메모를 입력하세요"
        placeholderTextColor={C.textMuted}
        editable={editMode}
      />

      <View style={s.lineDivider} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// 스타일
// ════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── 리스트 뷰 ──
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  listTitle: { fontSize: 20, fontWeight: '600', color: C.textPrimary },
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  createBtnText: { fontSize: 22, color: '#fff', lineHeight: 28 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, color: C.textSecondary },
  emptyHint: { fontSize: 13, color: C.textMuted },

  projectItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  projectName: { fontSize: 16, fontWeight: '500', color: C.textPrimary, marginBottom: 2 },
  projectMeta: { fontSize: 12, color: C.textMuted },
  deleteBtn:   { padding: 8 },
  deleteBtnText: { fontSize: 14, color: C.textMuted },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 16 },

  // ── 새 프로젝트 입력 ──
  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  createInput: {
    flex: 1, fontSize: 14, color: C.textPrimary,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.bg,
  },
  createConfirmBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.textPrimary, borderRadius: 8,
  },
  createConfirmBtnText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  createCancelBtn: { paddingHorizontal: 8, paddingVertical: 7 },
  createCancelBtnText: { fontSize: 13, color: C.textMuted },

  // ── 상세 헤더 ──
  detailHeader1: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 20, color: C.textPrimary },
  projectNameInput: { flex: 1, fontSize: 16, fontWeight: '500', color: C.textPrimary, padding: 0 },
  colToggleBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
  },
  colToggleBtnText: { fontSize: 12, color: C.textSecondary },
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  editBtnActive:     { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
  editBtnText:       { fontSize: 12, color: C.textSecondary },
  editBtnTextActive: { color: '#fff', fontWeight: '500' },

  detailHeader2: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  controlLabel: { fontSize: 11, color: C.textSecondary },
  capoControl: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  bpmControl: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  controlBtn: {
    width: 18, height: 18, borderWidth: 1, borderColor: C.border,
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },
  controlBtnText: { fontSize: 13, color: C.textPrimary, lineHeight: 18 },
  controlValue:   { fontSize: 11, color: C.textPrimary, minWidth: 16, textAlign: 'center' },
  bpmInput: { fontSize: 11, color: C.textPrimary, minWidth: 36, textAlign: 'center', padding: 0 },
  playAllBtn: {
    marginLeft: 'auto',
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  playAllBtnActive: { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
  playAllBtnText:   { fontSize: 14, color: C.textPrimary },

  // ── 썸네일 ──
  thumbScroll: { borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 130 },
  thumbContainer: { paddingHorizontal: 8, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  thumbItem: {
    alignItems: 'center', padding: 4,
    borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  thumbItemSelected: { borderColor: C.accent, backgroundColor: 'rgba(224,60,49,0.06)' },
  thumbName:         { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  thumbNameSelected: { color: C.accent, fontWeight: '600' },

  // ── 라인 ──
  lineRow: { paddingHorizontal: 16, paddingTop: 8 },
  chordArea: { flexDirection: 'row', alignItems: 'flex-start' },
  slot: {
    marginRight: 4, borderRadius: 6, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  slotPlaying: { backgroundColor: C.playing },
  slotTarget:  { borderWidth: 1.5, borderColor: C.accent, borderRadius: 6 },
  slotEmpty: {
    backgroundColor: C.surface, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  slotTargetText: { fontSize: 20, color: C.accent },
  slotChordName: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  slotDelBtn: {
    position: 'absolute', top: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  slotDelBtnText: { fontSize: 8, color: '#fff', lineHeight: 12 },

  rowMenuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rowMenuBtnText: { fontSize: 20, color: C.textMuted },
  rowMenu: {
    position: 'absolute', right: 0, top: 32, zIndex: 100,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, minWidth: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  rowMenuItem:     { paddingHorizontal: 14, paddingVertical: 10 },
  rowMenuItemText: { fontSize: 14, color: C.textPrimary },

  lineText: {
    fontSize: 14, color: C.textPrimary,
    paddingVertical: 6, minHeight: 36, lineHeight: 20,
  },
  lineDivider: { height: 1, backgroundColor: C.border, marginTop: 4 },

  addLineBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  addLineBtnText: {
    fontSize: 13, color: C.textMuted,
    borderWidth: 1, borderColor: C.border, borderRadius: 6,
    paddingHorizontal: 16, paddingVertical: 6,
  },
});
