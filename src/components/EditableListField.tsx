/**
 * EditableListField: Reusable structured list UI for editable \n-joined text fields.
 * Supports add, delete, inline-edit, and drag-to-reorder (via react-native-draggable-flatlist).
 * Storage format: \n-joined TEXT string (no migration needed).
 * Disabled state: read-only plain text, no controls.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../contexts/ThemeContext';
import { XIcon, GripIcon } from './icons';

// --- Helpers (exported for testing) ---

export function parseItems(value: string | string[] | null): string[] {
  if (Array.isArray(value)) return value.filter((s) => s.trim() !== '');
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

export function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

// --- Props ---

interface EditableListFieldProps {
  value: string | string[] | null;
  onSave: (value: string | null) => void;
  disabled: boolean;
  placeholder: string;
  onItemPress?: (index: number, item: string) => void;
  onAddPress?: () => void;
}

// --- Component ---

export function EditableListField({ value, onSave, disabled, placeholder, onItemPress, onAddPress }: EditableListFieldProps) {
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

  // --- Add (with auto-split for \n) ---
  const handleAdd = useCallback(() => {
    const newEntries = addText.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (newEntries.length === 0) return;
    const newItems = [...items, ...newEntries];
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
    const newEntries = editText.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (newEntries.length === 0) {
      // Delete item (all empty after split)
      const newItems = items.filter((_, i) => i !== editingIndex);
      saveItems(newItems);
    } else if (newEntries.length === 1) {
      // Update single item
      const newItems = items.map((item, i) => (i === editingIndex ? newEntries[0] : item));
      saveItems(newItems);
    } else {
      // Replace 1 item with N items at same position
      const newItems = [...items];
      newItems.splice(editingIndex, 1, ...newEntries);
      saveItems(newItems);
    }
    setEditingIndex(null);
    setEditText('');
    isEditingRef.current = false;
  }, [editingIndex, editText, items, saveItems]);

  // --- Reorder (drag-and-drop) ---
  const handleDragEnd = useCallback(
    ({ data }: { data: string[] }) => {
      setEditingIndex(null);
      setEditText('');
      isEditingRef.current = false;
      saveItems(data);
    },
    [saveItems]
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
            <Text style={[styles.disabledText, { color: colors.text }]}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // --- Render item for DraggableFlatList ---
  const renderItem = ({ item, drag, getIndex }: RenderItemParams<string>) => {
    const idx = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <View style={[styles.itemRow, { borderColor: colors.border }]}>
          <Pressable hitSlop={6} onLongPress={drag}>
            <GripIcon size={16} color={colors.textTertiary} />
          </Pressable>
          {onItemPress ? (
            <Pressable style={styles.itemTextPressable} onPress={() => onItemPress(idx, item)}>
              <Text style={[styles.itemText, { color: colors.text }]}>
                {item}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              style={[styles.itemText, styles.editInput, { color: colors.text }]}
              value={editingIndex === idx ? editText : item}
              onChangeText={(text) => {
                if (editingIndex !== idx) startEdit(idx);
                setEditText(text);
              }}
              onFocus={() => { if (editingIndex !== idx) startEdit(idx); }}
              onSubmitEditing={finishEdit}
              onBlur={finishEdit}
              multiline
              blurOnSubmit
              returnKeyType="done"
            />
          )}
          <Pressable hitSlop={6} onPress={() => handleDelete(idx)}>
            <XIcon size={18} color={colors.error} />
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  };

  // --- Active state ---
  return (
    <View>
      <DraggableFlatList
        data={items}
        keyExtractor={(_, index) => `${index}`}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        scrollEnabled={false}
        dragHitSlop={{ left: 0, width: 40 }}
      />
      {onAddPress ? (
        <Pressable
          style={[styles.addInput, { borderColor: colors.border }]}
          onPress={onAddPress}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 15 }}>
            {placeholder}
          </Text>
        </Pressable>
      ) : (
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
          multiline
          blurOnSubmit
        />
      )}
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
    flex: 1,
    fontSize: 15,
  },
  editInput: {
    paddingVertical: 0,
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
