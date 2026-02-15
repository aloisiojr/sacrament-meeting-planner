/**
 * TopicsManagementScreen: Ward topics CRUD with swipe-to-reveal,
 * general collections toggle, and inline add/edit.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SwipeableCard } from '../../../components/SwipeableCard';
import {
  useWardTopics,
  useCreateWardTopic,
  useUpdateWardTopic,
  useDeleteWardTopic,
  useCollections,
  useToggleCollection,
} from '../../../hooks/useTopics';
import { getCurrentLanguage } from '../../../i18n';
import type { WardTopic } from '../../../types/database';

// --- Topic Editor ---

interface TopicEditorProps {
  topic?: WardTopic;
  onSave: (data: { title: string; link: string | null }) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function TopicEditor({ topic, onSave, colors }: TopicEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(topic?.title ?? '');
  const [link, setLink] = useState(topic?.link ?? '');
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!topic) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({ title: trimmedTitle, link: link.trim() || null });
  }, [title, link, onSave]);

  return (
    <View style={[styles.editor, { backgroundColor: colors.surface }]}>
      <TextInput
        ref={titleRef}
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        value={title}
        onChangeText={setTitle}
        placeholder={t('topics.topicTitle')}
        placeholderTextColor={colors.placeholder}
        onBlur={handleSave}
        returnKeyType="next"
        autoCapitalize="sentences"
      />
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        value={link}
        onChangeText={setLink}
        placeholder={t('topics.topicLink')}
        placeholderTextColor={colors.placeholder}
        onBlur={handleSave}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="URL"
      />
    </View>
  );
}

// --- Topic Row ---

interface TopicRowProps {
  topic: WardTopic;
  isEditing: boolean;
  activeSwipeId: string | null;
  onSwipeReveal: (id: string | null) => void;
  onEdit: (topic: WardTopic) => void;
  onDelete: (topic: WardTopic) => void;
  onSave: (data: { title: string; link: string | null }) => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function TopicRow({
  topic,
  isEditing,
  activeSwipeId,
  onSwipeReveal,
  onEdit,
  onDelete,
  onSave,
  disabled,
  colors,
}: TopicRowProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return <TopicEditor topic={topic} onSave={onSave} colors={colors} />;
  }

  return (
    <SwipeableCard
      id={topic.id}
      activeId={activeSwipeId}
      onReveal={onSwipeReveal}
      disabled={disabled}
      onEdit={() => onEdit(topic)}
      onDelete={() => onDelete(topic)}
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
    >
      <View style={[styles.topicRow, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.topicTitle, { color: colors.text }]} numberOfLines={1}>
          {topic.title}
        </Text>
        {topic.link && (
          <Text style={[styles.topicLink, { color: colors.primary }]} numberOfLines={1}>
            {topic.link}
          </Text>
        )}
      </View>
    </SwipeableCard>
  );
}

// --- Collection Toggle Row ---

interface CollectionRowProps {
  name: string;
  active: boolean;
  onToggle: (active: boolean) => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CollectionRow({ name, active, onToggle, disabled, colors }: CollectionRowProps) {
  return (
    <View style={[styles.collectionRow, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.collectionName, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Switch
        value={active}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

// --- Main Screen ---

export default function TopicsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const language = getCurrentLanguage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const canWrite = hasPermission('topic:write');
  const canToggle = hasPermission('collection:toggle');

  const { data: wardTopics } = useWardTopics();
  const { data: collections } = useCollections(language);
  const createTopic = useCreateWardTopic();
  const updateTopic = useUpdateWardTopic();
  const deleteTopic = useDeleteWardTopic();
  const toggleCollection = useToggleCollection();

  const handleAdd = useCallback(() => {
    setActiveSwipeId(null);
    setEditingId(null);
    setIsAdding(true);
  }, []);

  const handleSaveNew = useCallback(
    (data: { title: string; link: string | null }) => {
      if (!data.title) {
        setIsAdding(false);
        return;
      }
      createTopic.mutate(
        { title: data.title, link: data.link },
        { onSuccess: () => setIsAdding(false) }
      );
    },
    [createTopic]
  );

  const handleEdit = useCallback((topic: WardTopic) => {
    setActiveSwipeId(null);
    setIsAdding(false);
    setEditingId(topic.id);
  }, []);

  const handleSaveEdit = useCallback(
    (topicId: string) =>
      (data: { title: string; link: string | null }) => {
        if (!data.title) {
          setEditingId(null);
          return;
        }
        updateTopic.mutate(
          { id: topicId, title: data.title, link: data.link },
          { onSuccess: () => setEditingId(null) }
        );
      },
    [updateTopic]
  );

  const handleDelete = useCallback(
    (topic: WardTopic) => {
      Alert.alert(t('common.confirm'), t('members.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteTopic.mutate({ topicId: topic.id, topicTitle: topic.title }),
        },
      ]);
    },
    [t, deleteTopic]
  );

  const handleToggleCollection = useCallback(
    (collectionId: string, active: boolean) => {
      toggleCollection.mutate({ collectionId, active });
    },
    [toggleCollection]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setActiveSwipeId(null)}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('topics.title')}</Text>
            {canWrite && (
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={t('topics.addTopic')}
              >
                <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+</Text>
              </Pressable>
            )}
          </View>

          {/* Ward Topics Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('topics.wardTopics')}
            </Text>

            {isAdding && (
              <TopicEditor onSave={handleSaveNew} colors={colors} />
            )}

            {wardTopics && wardTopics.length > 0 ? (
              wardTopics.map((item) => (
                <TopicRow
                  key={item.id}
                  topic={item}
                  isEditing={editingId === item.id}
                  activeSwipeId={activeSwipeId}
                  onSwipeReveal={setActiveSwipeId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSave={handleSaveEdit(item.id)}
                  disabled={!canWrite}
                  colors={colors}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('common.noResults')}
                </Text>
              </View>
            )}
          </View>

          {/* General Collections Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('topics.collections')}
            </Text>

            {collections && collections.length > 0 ? (
              collections.map((item) => (
                <CollectionRow
                  key={item.id}
                  name={item.name}
                  active={item.active}
                  onToggle={(active) => handleToggleCollection(item.id, active)}
                  disabled={!canToggle}
                  colors={colors}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('common.noResults')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 26,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  editor: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  topicRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  topicLink: {
    fontSize: 13,
    marginTop: 2,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  collectionName: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
