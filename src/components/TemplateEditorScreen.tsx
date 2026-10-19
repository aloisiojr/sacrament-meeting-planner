/**
 * TemplateEditorScreen — shared editor for per-ward message/text templates. Both the WhatsApp
 * invitation templates and the Ward Business (supports/releases) templates render through this so
 * they stay structurally identical: a tab per template, tappable placeholder chips that insert a
 * token at the cursor, a live preview with sample data, per-template "restore default", and
 * debounced auto-save (also flushed on blur / tab switch).
 *
 * Non-edited fields always reflect the latest `value ?? defaultText` from props, so a field never
 * shows a stale default before the ward query resolves and only fields the user actually edited are
 * persisted.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { KeyboardAvoider } from './KeyboardAvoider';

export interface TemplatePlaceholder {
  token: string; // e.g. "{nome}"
  label: string; // chip label (app language)
  sample: string; // value used in the preview
}

export interface TemplateTab {
  key: string;
  label: string;
  value: string | null | undefined; // stored override; null/undefined => use defaultText
  defaultText: string;
  placeholders: TemplatePlaceholder[];
}

export interface TemplateEditorScreenProps {
  title: string;
  tabs: TemplateTab[];
  /** Persist an override; `null` clears it (revert to default). */
  onSave: (key: string, value: string | null) => void;
  /** 'raw' saves the text as typed; 'collapse' saves null when blank or equal to the default. */
  saveMode?: 'raw' | 'collapse';
  /** Editor auto-capitalization (default 'sentences'; WhatsApp uses 'none' for tokened templates). */
  autoCapitalize?: 'none' | 'sentences';
}

const SAVE_DEBOUNCE_MS = 800;

export function TemplateEditorScreen({
  title,
  tabs,
  onSave,
  saveMode = 'raw',
  autoCapitalize = 'sentences',
}: TemplateEditorScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [activeKey, setActiveKey] = useState<string>(tabs[0]?.key ?? '');
  const [edits, setEdits] = useState<Record<string, string>>({});
  // Keys just reset to default: shown as the default, but NOT persisted again on flush.
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // EST-09: the flush's source of truth is this ref, updated synchronously with every keystroke.
  // Reading pending edits from inside a setState updater was the bug — an updater may never run
  // after unmount (and its side effects are not guaranteed to fire exactly once), so editing and
  // leaving quickly silently dropped the save. Refs for tabs/onSave/saveMode keep the unmount
  // flush working with the latest props without re-subscribing.
  const editsRef = useRef<Record<string, string>>({});
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const saveModeRef = useRef(saveMode);
  saveModeRef.current = saveMode;

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  const clearRestored = useCallback((key: string) => {
    setRestored((r) => {
      if (!r.has(key)) return r;
      const n = new Set(r);
      n.delete(key);
      return n;
    });
  }, []);

  const displayValue = useCallback(
    (tab: TemplateTab) => {
      if (tab.key in edits) return edits[tab.key];
      if (restored.has(tab.key)) return tab.defaultText;
      return tab.value ?? tab.defaultText;
    },
    [edits, restored]
  );
  const currentText = activeTab ? displayValue(activeTab) : '';

  const flush = useCallback(
    (key: string) => {
      if (timers.current[key]) {
        clearTimeout(timers.current[key]);
        delete timers.current[key];
      }
      // Synchronous, from the ref — never from inside a setState updater (EST-09).
      if (!(key in editsRef.current)) return;
      const tab = tabsRef.current.find((tb) => tb.key === key);
      if (!tab) return;
      const text = editsRef.current[key];
      const value =
        saveModeRef.current === 'collapse'
          ? text.trim() && text !== tab.defaultText
            ? text
            : null
          : text;
      onSaveRef.current(key, value);
    },
    []
  );

  /** Persist every pending edit right now (back button / unmount), cancelling all debounce timers. */
  const flushAll = useCallback(() => {
    Object.keys(editsRef.current).forEach((key) => flush(key));
    Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    timers.current = {};
  }, [flush]);

  // Leaving the screen must not lose an edit still inside its debounce window.
  const flushAllRef = useRef(flushAll);
  flushAllRef.current = flushAll;
  useEffect(
    () => () => {
      flushAllRef.current();
    },
    []
  );

  const handleBack = useCallback(() => {
    flushAll();
    router.back();
  }, [flushAll, router]);

  const schedule = useCallback(
    (key: string) => {
      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => flush(key), SAVE_DEBOUNCE_MS);
    },
    [flush]
  );

  const handleChange = useCallback(
    (text: string) => {
      editsRef.current = { ...editsRef.current, [activeKey]: text };
      setEdits(editsRef.current);
      clearRestored(activeKey);
      schedule(activeKey);
    },
    [activeKey, clearRestored, schedule]
  );

  const handleInsert = useCallback(
    (token: string) => {
      const pos = selection.start;
      const before = currentText.slice(0, pos);
      const after = currentText.slice(pos);
      const next = before + token + after;
      editsRef.current = { ...editsRef.current, [activeKey]: next };
      setEdits(editsRef.current);
      clearRestored(activeKey);
      schedule(activeKey);
      const np = pos + token.length;
      setSelection({ start: np, end: np });
    },
    [selection, currentText, activeKey, clearRestored, schedule]
  );

  const handleRestore = useCallback(() => {
    if (!activeTab) return;
    if (timers.current[activeKey]) {
      clearTimeout(timers.current[activeKey]);
      delete timers.current[activeKey];
    }
    // Drop any pending edit and mark restored (shows the default) — it must NOT be re-saved on the
    // next flush, or raw mode would persist the default text instead of the cleared NULL.
    if (activeKey in editsRef.current) {
      const n = { ...editsRef.current };
      delete n[activeKey];
      editsRef.current = n;
      setEdits(n);
    }
    setRestored((r) => new Set(r).add(activeKey));
    onSave(activeKey, null);
  }, [activeTab, activeKey, onSave]);

  const switchTab = useCallback(
    (key: string) => {
      flush(activeKey);
      setActiveKey(key);
      setSelection({ start: 0, end: 0 });
    },
    [flush, activeKey]
  );

  const preview = activeTab
    ? activeTab.placeholders.reduce((acc, p) => acc.split(p.token).join(p.sample), currentText)
    : '';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoider testID="template-editor-keyboard-avoider">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={handleBack} accessibilityRole="button" hitSlop={12} testID="template-editor-back">
              <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {tabs.length > 1 && (
            <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
              {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                return (
                  <Pressable
                    key={tab.key}
                    testID={`template-tab-${tab.key}`}
                    style={[styles.segmentedTab, isActive && { backgroundColor: colors.card }]}
                    onPress={() => switchTab(tab.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.segmentedTabText,
                        { color: isActive ? colors.primary : colors.textSecondary },
                        isActive && { fontWeight: '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {activeTab && activeTab.placeholders.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('settings.templateEditor.placeholders')}
              </Text>
              <View style={styles.placeholderList}>
                {activeTab.placeholders.map((p) => (
                  <Pressable
                    key={p.token}
                    testID={`template-chip-${p.token}`}
                    style={[styles.placeholderChip, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleInsert(p.token)}
                  >
                    <Text style={[styles.placeholderText, { color: colors.text }]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={styles.templateHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('settings.templateEditor.template')}
            </Text>
            <Pressable onPress={handleRestore} hitSlop={8} testID="template-restore">
              <Text style={[styles.restore, { color: colors.primary }]}>
                {t('settings.templateEditor.restoreDefault')}
              </Text>
            </Pressable>
          </View>
          <TextInput
            testID="template-editor"
            style={[styles.editor, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.surfaceVariant }]}
            value={currentText}
            onChangeText={handleChange}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            onBlur={() => flush(activeKey)}
            multiline
            textAlignVertical="top"
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
          />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('settings.templateEditor.preview')}
          </Text>
          <View style={[styles.previewCard, { backgroundColor: colors.card }]} testID="template-preview">
            <Text style={[styles.previewText, { color: colors.text }]}>{preview}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: { fontSize: 16, fontWeight: '600', width: 70 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 70 },
  segmentedControl: { flexDirection: 'row', borderRadius: 8, padding: 2, marginBottom: 8 },
  segmentedTab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  segmentedTabText: { fontSize: 13 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  placeholderList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  placeholderChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  placeholderText: { fontSize: 15, fontFamily: 'monospace' },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  restore: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  editor: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    minHeight: 160,
    lineHeight: 24,
  },
  previewCard: { borderRadius: 10, padding: 14, minHeight: 60 },
  previewText: { fontSize: 17, lineHeight: 24 },
});
