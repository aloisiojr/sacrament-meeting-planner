/**
 * AnnouncementsList: Structured list UI for announcements.
 * Supports add, delete, inline-edit, and reorder (up/down arrows).
 * Storage format: \n-joined TEXT string (no migration needed).
 * Disabled state: read-only with bullet prefix, no controls.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { XIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

// --- Helpers (exported for testing) ---

export function parseItems(value: string | null): string[] {
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

export function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

// --- Props ---

interface AnnouncementsListProps {
  value: string | null;
  onSave: (value: string | null) => void;
  disabled: boolean;
  placeholder: string;
}

// --- Component ---

export function AnnouncementsList({ value, onSave, disabled, placeholder }: AnnouncementsListProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState<string[]>(() => parseItems(value));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [addText, setAddText] = useState('');
  const isEditingRef = useRef(false);
  const addInputRef = useRef<TextInput>(null);

  // External value sync
  useEffect(() => {
    if (editingIndex === null && !isEditingRef.current) {
      setItems(parseItems(value));
    }
  }, [value, editingIndex]);

  const saveItems = useCallback(
    (newItems: string[]) => {
      setItems(newItems);
      onSave(joinItems(newItems));
    },
    [onSave]
  );

  // --- Add ---
  const handleAdd = useCallback(() => {
    const trimmed = addText.trim();
    if (trimmed === '') return;
    const newItems = [...items, trimmed];
    saveItems(newItems);
    setAddText('');
    setTimeout(() => addInputRef.current?.focus(), 50);
  }, [addText, items, saveItems]);

  // --- Delete ---
  const handleDelete = useCallback(
    (index: number) => {
      if (editingIndex === index) {
        setEditingIndex(null);
        setEditText('');
        isEditingRef.current = false;
      }
      const newItems = items.filter((_, i) => i !== index);
      saveItems(newItems);
    },
    [items, editingIndex, saveItems]
  );

  // --- Inline Edit ---
  const startEdit = useCallback(
    (index: number) => {
      if (disabled) return;
      setEditingIndex(index);
      setEditText(items[index]);
      isEditingRef.current = true;
    },
    [disabled, items]
  );

  const finishEdit = useCallback(() => {
    if (editingIndex === null) return;
    const trimmed = editText.trim();
    if (trimmed === '') {
      // Delete item
      const newItems = items.filter((_, i) => i !== editingIndex);
      saveItems(newItems);
    } else {
      // Update item
      const newItems = items.map((item, i) => (i === editingIndex ? trimmed : item));
      saveItems(newItems);
    }
    setEditingIndex(null);
    setEditText('');
    isEditingRef.current = false;
  }, [editingIndex, editText, items, saveItems]);

  // --- Reorder ---
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      if (editingIndex !== null) {
        setEditingIndex(null);
        setEditText('');
        isEditingRef.current = false;
      }
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      saveItems(newItems);
    },
    [items, editingIndex, saveItems]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === items.length - 1) return;
      if (editingIndex !== null) {
        setEditingIndex(null);
        setEditText('');
        isEditingRef.current = false;
      }
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      saveItems(newItems);
    },
    [items, editingIndex, saveItems]
  );

  // --- Disabled state ---
  if (disabled) {
    if (items.length === 0) {
      return <View />;
    }
    return (
      <View>
        {items.map((item, idx) => (
          <View key={idx} style={styles.disabledRow}>
            <Text style={[styles.disabledText, { color: colors.text }]} numberOfLines={1}>
              {'\u2022 '}{item}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // --- Active state ---
  return (
    <View>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={[styles.itemRow, { borderColor: colors.border }]}
        >
          {editingIndex === idx ? (
            <TextInput
              style={[styles.itemText, { color: colors.text }]}
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={finishEdit}
              onBlur={finishEdit}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Pressable style={styles.itemTextPressable} onPress={() => startEdit(idx)}>
              <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>
                {item}
              </Text>
            </Pressable>
          )}
          <Pressable
            hitSlop={6}
            onPress={() => handleMoveUp(idx)}
            disabled={idx === 0}
            style={{ opacity: idx === 0 ? 0.3 : 1 }}
          >
            <ChevronUpIcon size={16} color={colors.textTertiary} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => handleMoveDown(idx)}
            disabled={idx === items.length - 1}
            style={{ opacity: idx === items.length - 1 ? 0.3 : 1 }}
          >
            <ChevronDownIcon size={16} color={colors.textTertiary} />
          </Pressable>
          <Pressable hitSlop={6} onPress={() => handleDelete(idx)}>
            <XIcon size={18} color={colors.error} />
          </Pressable>
        </View>
      ))}
      <TextInput
        ref={addInputRef}
        style={[styles.addInput, { color: colors.text, borderColor: colors.border }]}
        value={addText}
        onChangeText={setAddText}
        onSubmitEditing={handleAdd}
        onBlur={handleAdd}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    fontSize: 15,
  },
  addInput: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  disabledRow: {
    paddingVertical: 4,
  },
  disabledText: {
    fontSize: 15,
  },
});
