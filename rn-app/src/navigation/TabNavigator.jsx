import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditorScreen  from '../screens/EditorScreen';
import LibraryScreen from '../screens/LibraryScreen';
import { APP_VERSION } from '../constants/app';

// ── 색상 ──────────────────────────────────────────────────────
const C = {
  bg:       '#ffffff',
  border:   '#d9d4cc',
  textPri:  '#1a1714',
  textSec:  '#6b6560',
  textMut:  '#a09b95',
};

const TABS = [
  { key: 'editor',  label: '코드 에디터' },
  { key: 'library', label: '코드 사전'   },
  { key: 'lesson',  label: '기타 강좌'   },
];

// ── 도움말 내용 ───────────────────────────────────────────────
const HELP_SECTIONS = [
  {
    title: '기본 조작',
    items: [
      '다이어그램 칸을 탭하면 음표(dot)가 추가됩니다.',
      '이미 있는 음표를 다시 탭하면 제거됩니다.',
      '상단 ×/○ 행에서 뮤트·오픈 줄을 지정할 수 있습니다.',
    ],
  },
  {
    title: '손가락 번호',
    items: [
      '1~4 및 T(엄지) 버튼으로 운지 번호를 선택 후 탭하세요.',
      '동일 프렛에 2개 이상 배치하면 바레 코드가 됩니다.',
    ],
  },
  {
    title: '코드명 생성',
    items: [
      '근음·트라이어드·7th·기능을 선택하면 코드명이 자동 생성됩니다.',
      '텐션 음정도 추가할 수 있습니다.',
    ],
  },
  {
    title: '코드 사전',
    items: [
      '좌측 근음 버튼을 눌러 근음을 선택하세요.',
      '코드 카드를 탭하면 상단 큰 다이어그램으로 미리볼 수 있습니다.',
      '가져오기 버튼으로 에디터에 불러올 수 있습니다.',
    ],
  },
];

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [activeTab,     setActiveTab]     = useState('editor');
  const [menuVisible,   setMenuVisible]   = useState(false);
  const [helpVisible,   setHelpVisible]   = useState(false);
  const [importedEntry, setImportedEntry] = useState(null);

  const openMenu  = useCallback(() => setMenuVisible(true),  []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const openHelp  = useCallback(() => { closeMenu(); setHelpVisible(true);  }, [closeMenu]);
  const closeHelp = useCallback(() => setHelpVisible(false), []);

  const handleImport = useCallback((entry, fingeringIdx) => {
    setImportedEntry({ entry, fingeringIdx, ts: Date.now() });
    setActiveTab('editor');
  }, []);

  return (
    <View style={styles.root}>
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>
          Chorditor{' '}
          <Text style={styles.headerVersion}>v{APP_VERSION}</Text>
        </Text>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={openMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
        </TouchableOpacity>
      </View>

      {/* ── 탭 바 ──────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 콘텐츠 ────────────────────────────────────────── */}
      <View style={styles.content}>
        {activeTab === 'editor'  && <EditorScreen importedEntry={importedEntry} />}
        {activeTab === 'library' && <LibraryScreen onImport={handleImport} />}
        {activeTab === 'lesson'  && <LessonPlaceholder />}
      </View>

      {/* ── 햄버거 메뉴 ────────────────────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <Pressable style={styles.menuPanel} onPress={e => e.stopPropagation()}>
            <Text style={styles.menuSectionLabel}>메뉴</Text>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={styles.menuRow}
                onPress={() => { closeMenu(); setActiveTab(tab.key); }}
              >
                <Text style={styles.menuRowText}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={openHelp}>
              <Text style={styles.menuRowText}>도움말</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => { closeMenu(); Linking.openURL('mailto:support@chorditor.app'); }}
            >
              <Text style={styles.menuRowText}>문의하기</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <Text style={styles.menuVersion}>Chorditor v{APP_VERSION}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 도움말 모달 ─────────────────────────────────────── */}
      <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={closeHelp}>
        <View style={styles.helpOverlay}>
          <View style={styles.helpPanel}>
            <View style={styles.helpTitleRow}>
              <Text style={styles.helpTitle}>도움말</Text>
              <TouchableOpacity onPress={closeHelp} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Text style={styles.helpClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.helpScroll} showsVerticalScrollIndicator={false}>
              {HELP_SECTIONS.map(sec => (
                <View key={sec.title} style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>{sec.title}</Text>
                  {sec.items.map((item, i) => (
                    <Text key={i} style={styles.helpItem}>• {item}</Text>
                  ))}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.helpDoneBtn} onPress={closeHelp}>
              <Text style={styles.helpDoneText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── 기타 강좌 플레이스홀더 ──────────────────────────────────
function LessonPlaceholder() {
  return (
    <View style={ls.wrap}>
      <Text style={ls.emoji}>🎓</Text>
      <Text style={ls.title}>기타 강좌</Text>
      <Text style={ls.sub}>준비 중입니다</Text>
    </View>
  );
}
const ls = StyleSheet.create({
  wrap:  { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: C.bg },
  emoji: { fontSize:48, marginBottom:12 },
  title: { fontSize:20, fontWeight:'700', color: C.textPri },
  sub:   { fontSize:14, color: C.textMut, marginTop:6 },
});

// ── 스타일 ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* 헤더 — 흰 배경, 가운데 타이틀, 오른쪽 햄버거 */
  header: {
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 14,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '400',
    color: C.textPri,
    letterSpacing: 0.5,
    textAlign: 'center',
    flex: 1,
  },
  headerVersion: {
    fontSize: 11,
    color: C.textMut,
    fontWeight: '400',
    letterSpacing: 0.08,
  },
  menuBtn: { position: 'absolute', right: 16, padding: 4 },
  burgerLine: {
    width: 20, height: 1.5,
    backgroundColor: C.textSec,
    marginVertical: 3,
    borderRadius: 1,
  },

  /* 탭 바 — 흰 배경, active = 검정 배경+흰 글자 */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  tabItemActive: {
    backgroundColor: C.textPri,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSec,
    letterSpacing: 0.02,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  content: { flex: 1, backgroundColor: C.bg },

  /* 햄버거 메뉴 */
  menuOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-start', alignItems:'flex-end' },
  menuPanel: {
    marginTop: 60, marginRight: 12,
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 6,
    minWidth: 180,
    elevation: 8,
    shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:8,
  },
  menuSectionLabel: { fontSize:11, color:C.textMut, fontWeight:'600', paddingHorizontal:16, paddingVertical:6, letterSpacing:0.08 },
  menuRow:     { paddingHorizontal:16, paddingVertical:12 },
  menuRowText: { fontSize:14, color:C.textPri },
  menuDivider: { height:1, backgroundColor:C.border, marginVertical:4 },
  menuVersion: { fontSize:11, color:C.textMut, textAlign:'center', paddingVertical:8 },

  /* 도움말 모달 */
  helpOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  helpPanel: {
    backgroundColor: C.bg,
    borderTopLeftRadius:16, borderTopRightRadius:16,
    padding:20, maxHeight:'80%',
    borderTopWidth:1, borderTopColor:C.border,
  },
  helpTitleRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  helpTitle:        { fontFamily:'serif', fontSize:18, color:C.textPri },
  helpClose:        { fontSize:18, color:C.textMut },
  helpScroll:       { flexShrink:1 },
  helpSection:      { marginBottom:16 },
  helpSectionTitle: { fontSize:13, fontWeight:'700', color:C.textSec, marginBottom:6, letterSpacing:0.04 },
  helpItem:         { fontSize:13, color:C.textSec, lineHeight:20, marginBottom:3 },
  helpDoneBtn:      { marginTop:16, backgroundColor:C.textPri, borderRadius:8, paddingVertical:12, alignItems:'center' },
  helpDoneText:     { color:'#fff', fontWeight:'700', fontSize:14 },
});
