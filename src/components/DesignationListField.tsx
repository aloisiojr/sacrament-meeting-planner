/**
 * DesignationListField — read-only multi-row list of structured supports/releases
 * (Apoios e Desobrigações). Mirrors EditableListField's read/select VISUAL (rows + dashed
 * "add" affordance + per-row X remove) but operates on the structured `Designation[]` array:
 * each row is display-only (up to two lines via formatDesignationLines) and a tap routes to
 * the designation edit screen. No inline text editing and no drag-reorder.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { XIcon } from './icons';
import { formatDesignationLines } from '../lib/designations';
import type { Designation } from '../types/database';

interface DesignationListFieldProps {
  value: Designation[];
  placeholder: string;
  onItemPress: (index: number) => void;
  onAddPress: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  testID?: string;
}

export function DesignationListField({
  value,
  placeholder,
  onItemPress,
  onAddPress,
  onRemove,
  disabled,
  testID,
}: DesignationListFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const renderLines = (item: Designation) => {
    const { line1, line2 } = formatDesignationLines(item, t);
    return (
      <>
        <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>
          {line1}
        </Text>
        {line2 ? (
          <Text style={[styles.itemSubText, { color: colors.textSecondary }]} numberOfLines={1}>
            {line2}
          </Text>
        ) : null}
      </>
    );
  };

  // --- Disabled (read-only) state ---
  if (disabled) {
    if (value.length === 0) {
      return (
        <View style={[styles.addRow, { borderColor: colors.border, opacity: 0.5 }]} testID={testID}>
          <Text style={{ color: colors.textTertiary, fontSize: 15 }}>{placeholder}</Text>
        </View>
      );
    }
    return (
      <View testID={testID}>
        {value.map((item, idx) => (
          <View key={idx} style={styles.disabledRow}>
            {renderLines(item)}
          </View>
        ))}
      </View>
    );
  }

  // --- Active state ---
  return (
    <View testID={testID}>
      {value.map((item, idx) => (
        <View key={idx} style={[styles.itemRow, { borderColor: colors.border }]}>
          <Pressable
            style={styles.itemTextPressable}
            testID={`designation-row-${idx}`}
            onPress={() => onItemPress(idx)}
          >
            {renderLines(item)}
          </Pressable>
          <Pressable
            hitSlop={6}
            testID={`designation-remove-${idx}`}
            onPress={() => onRemove(idx)}
          >
            <XIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}
      <Pressable
        style={[styles.addRow, { borderColor: colors.border }]}
        testID="designation-add"
        onPress={onAddPress}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 15 }}>{placeholder}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
    gap: 6,
  },
  itemTextPressable: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
  },
  itemSubText: {
    fontSize: 13,
    marginTop: 2,
  },
  addRow: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  disabledRow: {
    paddingVertical: 4,
  },
});
