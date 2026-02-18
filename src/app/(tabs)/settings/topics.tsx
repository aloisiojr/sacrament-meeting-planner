/**
 * TopicsManagementScreen: Ward topics CRUD with swipe-to-reveal,
 * general collections toggle, and inline add/edit.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SwipeableCard } from '../../../components/SwipeableCard';
import { SearchInput } from '../../../components/SearchInput';
import {
  useWardTopics,
  useCreateWardTopic,
  useUpdateWardTopic,
  useDeleteWardTopic,
  useCollections,
  useToggleCollection,
  useCollectionTopics,
} from '../../../hooks/useTopics';
import { getCurrentLanguage } from '../../../i18n';
import type { WardTopic } from '../../../types/database';

// --- Topic Editor ---

interface TopicEditorProps {
  topic?: WardTopic;
  onSave: (data: { title: string; link: string | null }) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function TopicEditor({ topic, onSave, onCancel, colors }: TopicEditorProps) {
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
        returnKeyType="next"
        autoCapitalize="sentences"
      />
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        value={link}
        onChangeText={setLink}
        placeholder={t('topics.topicLink')}
        placeholderTextColor={colors.placeholder}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="URL"
      />

      {/* Save/Cancel buttons */}
      <View style={styles.editorButtons}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityRole="button"
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
            {t('common.save')}
          </Text>
        </Pressable>
      </View>
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
  onCancel: () => void;
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
  onCancel,
  disabled,
  colors,
}: TopicRowProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return <TopicEditor topic={topic} onSave={onSave} onCancel={onCancel} colors={colors} />;
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
  isExpanded: boolean;
  onToggle: (active: boolean) => void;
  onPress: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CollectionRow({ name, active, isExpanded, onToggle, onPress, disabled, colors }: CollectionRowProps) {
  return (
    <View style={[styles.collectionRow, { borderBottomColor: colors.divider }]}>
      <Pressable
        style={styles.collectionPressable}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </Text>
        <Text style={[styles.collectionName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
      <Switch
        value={active}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

// --- Collection Topics List (expanded view) ---

interface CollectionTopicsListProps {
  collectionId: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CollectionTopicsList({ collectionId, colors }: CollectionTopicsListProps) {
  const { t } = useTranslation();
  const { data: topics, isLoading } = useCollectionTopics(collectionId);

  if (isLoading) {
    return (
      <View style={styles.collectionTopicsLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <View style={styles.collectionTopicsEmpty}>
        <Text style={[styles.collectionTopicsEmptyText, { color: colors.textSecondary }]}>
          {t('topics.noTopics')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.collectionTopicsContainer, { backgroundColor: colors.surface }]}>
      {topics.map((topic, index) => (
        <View
          key={topic.id}
          style={[
            styles.collectionTopicItem,
            index < topics.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[styles.collectionTopicTitle, { color: colors.textSecondary }]}>
            {topic.title}
          </Text>
          {topic.link && (
            <Text style={[styles.collectionTopicLink, { color: colors.primary }]} numberOfLines={1}>
              {topic.link}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

// --- Main Screen ---

export default function TopicsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const language = getCurrentLanguage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);

  const canWrite = hasPermission('topic:write');
  const canToggle = hasPermission('collection:toggle');

  const { data: wardTopics } = useWardTopics();
  const filteredTopics = useMemo(() => {
    return wardTopics?.filter((topic) => {
      if (!search.trim()) return true;
      return topic.title.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [wardTopics, search]);
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

  const handleCollectionPress = useCallback((collectionId: string) => {
    setExpandedCollectionId((prev) => (prev === collectionId ? null : collectionId));
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.backButton, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('topics.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Screen description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('topics.description')}
        </Text>

        {/* Search field for Ward Topics */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('topics.wardTopics')}
          </Text>
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

        <View style={styles.searchContainer}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
          />
        </View>

        {/* Scrollable content: topics list and collections */}
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setActiveSwipeId(null)}
        >
          {/* Ward Topics Section */}
          <View style={styles.section}>
            {isAdding && (
              <TopicEditor onSave={handleSaveNew} onCancel={() => setIsAdding(false)} colors={colors} />
            )}

            {filteredTopics && filteredTopics.length > 0 ? (
              filteredTopics.map((item) => (
                <TopicRow
                  key={item.id}
                  topic={item}
                  isEditing={editingId === item.id}
                  activeSwipeId={activeSwipeId}
                  onSwipeReveal={setActiveSwipeId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSave={handleSaveEdit(item.id)}
                  onCancel={() => setEditingId(null)}
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
                <React.Fragment key={item.id}>
                  <CollectionRow
                    name={item.name}
                    active={item.active}
                    isExpanded={expandedCollectionId === item.id}
                    onToggle={(active) => handleToggleCollection(item.id, active)}
                    onPress={() => handleCollectionPress(item.id)}
                    disabled={!canToggle}
                    colors={colors}
                  />
                  {expandedCollectionId === item.id && (
                    <CollectionTopicsList collectionId={item.id} colors={colors} />
                  )}
                </React.Fragment>
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
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  editorButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  collectionPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 10,
    width: 16,
    textAlign: 'center',
  },
  collectionName: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  collectionTopicsContainer: {
    paddingLeft: 32,
    paddingRight: 16,
  },
  collectionTopicItem: {
    paddingVertical: 8,
    paddingLeft: 8,
  },
  collectionTopicTitle: {
    fontSize: 14,
  },
  collectionTopicLink: {
    fontSize: 12,
    marginTop: 2,
  },
  collectionTopicsLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  collectionTopicsEmpty: {
    paddingVertical: 12,
    paddingLeft: 40,
  },
  collectionTopicsEmptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
