/**
 * ActorsManagementScreen: Meeting actors CRUD with swipe-to-reveal,
 * role checkboxes, and inline add/edit.
 * Business rule: can_conduct=true implies can_preside=true.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
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
  useActors,
  useCreateActor,
  useUpdateActor,
  useDeleteActor,
  enforceActorRules,
} from '../../../hooks/useActors';
import type { MeetingActor, CreateActorInput, UpdateActorInput } from '../../../types/database';

// --- Actor Editor ---

interface ActorEditorProps {
  actor?: MeetingActor;
  onSave: (data: CreateActorInput) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ActorEditor({ actor, onSave, colors }: ActorEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(actor?.name ?? '');
  const [canPreside, setCanPreside] = useState(actor?.can_preside ?? false);
  const [canConduct, setCanConduct] = useState(actor?.can_conduct ?? false);
  const [canRecognize, setCanRecognize] = useState(actor?.can_recognize ?? false);
  const [canMusic, setCanMusic] = useState(actor?.can_music ?? false);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!actor) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const input: CreateActorInput = {
      name: trimmedName,
      can_preside: canPreside,
      can_conduct: canConduct,
      can_recognize: canRecognize,
      can_music: canMusic,
    };
    onSave(enforceActorRules(input) as CreateActorInput);
  }, [name, canPreside, canConduct, canRecognize, canMusic, onSave]);

  // Enforce can_conduct -> can_preside in UI
  const handleConductChange = useCallback(
    (value: boolean) => {
      setCanConduct(value);
      if (value) setCanPreside(true);
    },
    []
  );

  return (
    <View style={[styles.editor, { backgroundColor: colors.surface }]}>
      <TextInput
        ref={nameRef}
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        value={name}
        onChangeText={setName}
        placeholder={t('actors.actorName')}
        placeholderTextColor={colors.placeholder}
        onBlur={handleSave}
        returnKeyType="done"
        autoCapitalize="words"
      />
      <View style={styles.rolesContainer}>
        <View style={[styles.roleRow, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.roleLabel, { color: colors.text }]}>{t('actors.canPreside')}</Text>
          <Switch
            value={canPreside}
            onValueChange={setCanPreside}
            disabled={canConduct}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.roleRow, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.roleLabel, { color: colors.text }]}>{t('actors.canConduct')}</Text>
          <Switch
            value={canConduct}
            onValueChange={handleConductChange}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.roleRow, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.roleLabel, { color: colors.text }]}>{t('actors.canRecognize')}</Text>
          <Switch
            value={canRecognize}
            onValueChange={setCanRecognize}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.roleRow}>
          <Text style={[styles.roleLabel, { color: colors.text }]}>{t('actors.canMusic')}</Text>
          <Switch
            value={canMusic}
            onValueChange={setCanMusic}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
      {canConduct && (
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          {t('actors.conductImpliesPreside')}
        </Text>
      )}
    </View>
  );
}

// --- Actor Row ---

interface ActorRowProps {
  actor: MeetingActor;
  isEditing: boolean;
  activeSwipeId: string | null;
  onSwipeReveal: (id: string | null) => void;
  onEdit: (actor: MeetingActor) => void;
  onDelete: (actor: MeetingActor) => void;
  onSave: (data: CreateActorInput) => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ActorRow({
  actor,
  isEditing,
  activeSwipeId,
  onSwipeReveal,
  onEdit,
  onDelete,
  onSave,
  disabled,
  colors,
}: ActorRowProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return <ActorEditor actor={actor} onSave={onSave} colors={colors} />;
  }

  const roles: string[] = [];
  if (actor.can_preside) roles.push(t('actors.canPreside'));
  if (actor.can_conduct) roles.push(t('actors.canConduct'));
  if (actor.can_recognize) roles.push(t('actors.canRecognize'));
  if (actor.can_music) roles.push(t('actors.canMusic'));

  return (
    <SwipeableCard
      id={actor.id}
      activeId={activeSwipeId}
      onReveal={onSwipeReveal}
      disabled={disabled}
      onEdit={() => onEdit(actor)}
      onDelete={() => onDelete(actor)}
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
    >
      <View style={[styles.actorRow, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
          {actor.name}
        </Text>
        {roles.length > 0 && (
          <Text style={[styles.actorRoles, { color: colors.textSecondary }]} numberOfLines={1}>
            {roles.join(' / ')}
          </Text>
        )}
      </View>
    </SwipeableCard>
  );
}

// --- Main Screen ---

export default function ActorsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const canWrite = hasPermission('settings:access');

  const { data: actors } = useActors('all');
  const createActor = useCreateActor();
  const updateActor = useUpdateActor();
  const deleteActor = useDeleteActor();

  const handleAdd = useCallback(() => {
    setActiveSwipeId(null);
    setEditingId(null);
    setIsAdding(true);
  }, []);

  const handleSaveNew = useCallback(
    (data: CreateActorInput) => {
      if (!data.name) {
        setIsAdding(false);
        return;
      }
      createActor.mutate(data, {
        onSuccess: () => setIsAdding(false),
      });
    },
    [createActor]
  );

  const handleEdit = useCallback((actor: MeetingActor) => {
    setActiveSwipeId(null);
    setIsAdding(false);
    setEditingId(actor.id);
  }, []);

  const handleSaveEdit = useCallback(
    (actorId: string) =>
      (data: CreateActorInput) => {
        if (!data.name) {
          setEditingId(null);
          return;
        }
        const updateData: UpdateActorInput = {
          id: actorId,
          name: data.name,
          can_preside: data.can_preside,
          can_conduct: data.can_conduct,
          can_recognize: data.can_recognize,
          can_music: data.can_music,
        };
        updateActor.mutate(updateData, {
          onSuccess: () => setEditingId(null),
        });
      },
    [updateActor]
  );

  const handleDelete = useCallback(
    (actor: MeetingActor) => {
      Alert.alert(t('common.confirm'), t('actors.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteActor.mutate(actor.id),
        },
      ]);
    },
    [t, deleteActor]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('actors.title')}</Text>
          {canWrite && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel={t('actors.addActor')}
            >
              <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+</Text>
            </Pressable>
          )}
        </View>

        {isAdding && (
          <ActorEditor onSave={handleSaveNew} colors={colors} />
        )}

        <FlatList
          data={actors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActorRow
              actor={item}
              isEditing={editingId === item.id}
              activeSwipeId={activeSwipeId}
              onSwipeReveal={setActiveSwipeId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSave={handleSaveEdit(item.id)}
              disabled={!canWrite}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('common.noResults')}
              </Text>
            </View>
          }
          onScrollBeginDrag={() => setActiveSwipeId(null)}
          keyboardShouldPersistTaps="handled"
        />
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
  rolesContainer: {
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roleLabel: {
    fontSize: 15,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actorRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actorName: {
    fontSize: 16,
    fontWeight: '500',
  },
  actorRoles: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
