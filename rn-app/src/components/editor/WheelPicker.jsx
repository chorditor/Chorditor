import React, { useRef, useEffect, useCallback } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';

const ITEM_W = 48;

export default function WheelPicker({ items, selectedValue, onSelect, renderLabel, style }) {
  const listRef = useRef(null);
  const selectedIdx = items.findIndex(it => (typeof it === 'object' ? it.value : it) === selectedValue);

  useEffect(() => {
    if (selectedIdx >= 0 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: selectedIdx, animated: true, viewPosition: 0.5 });
      }, 100);
    }
  }, [selectedIdx]);

  const renderItem = useCallback(({ item, index }) => {
    const value    = typeof item === 'object' ? item.value : item;
    const label    = renderLabel ? renderLabel(item) : (typeof item === 'object' ? item.label : (item === '' ? '—' : item));
    const isActive = value === selectedValue;
    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => onSelect(value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedValue, onSelect, renderLabel]);

  return (
    <FlatList
      ref={listRef}
      data={items}
      horizontal
      keyExtractor={(item, i) => String(typeof item === 'object' ? item.value : item) + i}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      snapToInterval={ITEM_W}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({ length: ITEM_W, offset: ITEM_W * index, index })}
      contentContainerStyle={styles.container}
      style={[styles.list, style]}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  container: {
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  item: {
    width: ITEM_W,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginHorizontal: 1,
  },
  itemActive: {
    backgroundColor: '#1a1714',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
