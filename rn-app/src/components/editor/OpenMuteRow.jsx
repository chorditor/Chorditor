import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { STRINGS } from '../../constants/app';

const STRING_LABELS = ['①', '②', '③', '④', '⑤', '⑥'];

export default function OpenMuteRow({ openMute, onChange }) {
  const toggle = (s) => {
    const next = [...openMute];
    next[s] = next[s] === 'mute' ? 'open' : 'mute';
    onChange(next);
  };

  return (
    <View style={styles.row}>
      {Array.from({ length: STRINGS }, (_, s) => {
        const isMute = openMute[s] === 'mute';
        return (
          <TouchableOpacity
            key={s}
            style={[styles.btn, isMute && styles.btnMute]}
            onPress={() => toggle(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isMute && styles.labelMute]}>
              {isMute ? '✕' : '○'}
            </Text>
            <Text style={styles.stringNum}>{STRING_LABELS[s]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  btn: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    minWidth: 40,
    backgroundColor: '#f5f5f5',
  },
  btnMute: {
    backgroundColor: '#fdecea',
  },
  label: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  labelMute: {
    color: '#c0392b',
  },
  stringNum: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});
