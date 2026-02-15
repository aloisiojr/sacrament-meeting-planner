/**
 * MemberManagementScreen: CRUD members with search, inline add/edit,
 * swipe-to-reveal actions, auto-save on blur, and country code with emoji flags.
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SwipeableCard } from '../../../components/SwipeableCard';
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  checkFutureSpeeches,
} from '../../../hooks/useMembers';
import type { Member } from '../../../types/database';

// --- Country Code Data ---

interface CountryCode {
  code: string;
  flag: string;
  label: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', label: 'Brasil (+55)' },
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', label: 'USA (+1)' },
  { code: '+52', flag: '\u{1F1F2}\u{1F1FD}', label: 'Mexico (+52)' },
  { code: '+54', flag: '\u{1F1E6}\u{1F1F7}', label: 'Argentina (+54)' },
  { code: '+56', flag: '\u{1F1E8}\u{1F1F1}', label: 'Chile (+56)' },
  { code: '+57', flag: '\u{1F1E8}\u{1F1F4}', label: 'Colombia (+57)' },
  { code: '+58', flag: '\u{1F1FB}\u{1F1EA}', label: 'Venezuela (+58)' },
  { code: '+51', flag: '\u{1F1F5}\u{1F1EA}', label: 'Peru (+51)' },
  { code: '+591', flag: '\u{1F1E7}\u{1F1F4}', label: 'Bolivia (+591)' },
  { code: '+595', flag: '\u{1F1F5}\u{1F1FE}', label: 'Paraguay (+595)' },
  { code: '+598', flag: '\u{1F1FA}\u{1F1FE}', label: 'Uruguay (+598)' },
  { code: '+593', flag: '\u{1F1EA}\u{1F1E8}', label: 'Ecuador (+593)' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', label: 'Portugal (+351)' },
  { code: '+244', flag: '\u{1F1E6}\u{1F1F4}', label: 'Angola (+244)' },
  { code: '+258', flag: '\u{1F1F2}\u{1F1FF}', label: 'Mozambique (+258)' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', label: 'UK (+44)' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', label: 'Spain (+34)' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', label: 'France (+33)' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', label: 'Germany (+49)' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', label: 'Italy (+39)' },
  { code: '+81', flag: '\u{1F1EF}\u{1F1F5}', label: 'Japan (+81)' },
];

function getFlagForCode(code: string): string {
  const entry = COUNTRY_CODES.find((c) => c.code === code);
  return entry?.flag ?? '\u{1F30D}'; // globe emoji fallback
}

// --- Inline Editor ---

interface MemberEditorProps {
  member?: Member;
  onSave: (data: { full_name: string; country_code: string; phone: string }) => void;
  onCancel?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function MemberEditor({ member, onSave, onCancel, colors }: MemberEditorProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [countryCode, setCountryCode] = useState(member?.country_code ?? '+55');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus name field on mount for new member
    if (!member) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = fullName.trim();
    if (!trimmed) return;
    onSave({ full_name: trimmed, country_code: countryCode, phone: phone.trim() });
  }, [fullName, countryCode, phone, onSave]);

  return (
    <View style={[styles.editor, { backgroundColor: colors.surface }]}>
      <TextInput
        ref={nameRef}
        style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('members.fullName')}
        placeholderTextColor={colors.placeholder}
        onBlur={handleSave}
        returnKeyType="next"
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
      />
      <View style={styles.phoneRow}>
        <Pressable
          style={[styles.countryCodeBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
          onPress={() => setShowCountryPicker(true)}
          accessibilityLabel={t('members.countryCode')}
        >
          <Text style={styles.flagText}>{getFlagForCode(countryCode)}</Text>
          <Text style={[styles.codeText, { color: colors.text }]}>{countryCode}</Text>
        </Pressable>
        <TextInput
          style={[styles.phoneInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('members.phone')}
          placeholderTextColor={colors.placeholder}
          onBlur={handleSave}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCountryPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.countryItem,
                    item.code === countryCode && { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// --- Member Row ---

interface MemberRowProps {
  member: Member;
  isEditing: boolean;
  activeSwipeId: string | null;
  onSwipeReveal: (id: string | null) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onSave: (data: { full_name: string; country_code: string; phone: string }) => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function MemberRow({
  member,
  isEditing,
  activeSwipeId,
  onSwipeReveal,
  onEdit,
  onDelete,
  onSave,
  disabled,
  colors,
}: MemberRowProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <MemberEditor
        member={member}
        onSave={onSave}
        colors={colors}
      />
    );
  }

  return (
    <SwipeableCard
      id={member.id}
      activeId={activeSwipeId}
      onReveal={onSwipeReveal}
      disabled={disabled}
      onEdit={() => onEdit(member)}
      onDelete={() => onDelete(member)}
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
    >
      <View style={[styles.memberRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {member.full_name}
          </Text>
          {member.phone && (
            <Text style={[styles.memberPhone, { color: colors.textSecondary }]}>
              {getFlagForCode(member.country_code)} {member.country_code} {member.phone}
            </Text>
          )}
        </View>
      </View>
    </SwipeableCard>
  );
}

// --- Main Screen ---

export default function MembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const canWrite = hasPermission('member:write');

  const { data: members, isLoading } = useMembers(search);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleAdd = useCallback(() => {
    setActiveSwipeId(null);
    setEditingId(null);
    setIsAdding(true);
  }, []);

  const handleSaveNew = useCallback(
    (data: { full_name: string; country_code: string; phone: string }) => {
      if (!data.full_name) {
        setIsAdding(false);
        return;
      }
      createMember.mutate(
        { full_name: data.full_name, country_code: data.country_code, phone: data.phone || null },
        { onSuccess: () => setIsAdding(false) }
      );
    },
    [createMember]
  );

  const handleEdit = useCallback((member: Member) => {
    setActiveSwipeId(null);
    setIsAdding(false);
    setEditingId(member.id);
  }, []);

  const handleSaveEdit = useCallback(
    (memberId: string) =>
      (data: { full_name: string; country_code: string; phone: string }) => {
        if (!data.full_name) {
          setEditingId(null);
          return;
        }
        updateMember.mutate(
          { id: memberId, full_name: data.full_name, country_code: data.country_code, phone: data.phone || null },
          { onSuccess: () => setEditingId(null) }
        );
      },
    [updateMember]
  );

  const handleDelete = useCallback(
    async (member: Member) => {
      try {
        const futureCount = await checkFutureSpeeches(member.id);
        const message =
          futureCount > 0
            ? `${t('members.deleteConfirm')} (${futureCount} future speeches)`
            : t('members.deleteConfirm');

        Alert.alert(t('common.confirm'), message, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => deleteMember.mutate(member.id),
          },
        ]);
      } catch {
        Alert.alert(t('common.confirm'), t('members.deleteConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => deleteMember.mutate(member.id),
          },
        ]);
      }
    },
    [t, deleteMember]
  );

  const renderItem = useCallback(
    ({ item }: { item: Member }) => (
      <MemberRow
        member={item}
        isEditing={editingId === item.id}
        activeSwipeId={activeSwipeId}
        onSwipeReveal={setActiveSwipeId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSave={handleSaveEdit(item.id)}
        disabled={!canWrite}
        colors={colors}
      />
    ),
    [editingId, activeSwipeId, handleEdit, handleDelete, handleSaveEdit, canWrite, colors]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('members.title')}</Text>
          {canWrite && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel={t('members.addMember')}
            >
              <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Add new member form */}
        {isAdding && (
          <MemberEditor
            onSave={handleSaveNew}
            onCancel={() => setIsAdding(false)}
            colors={colors}
          />
        )}

        {/* Member list */}
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('common.noResults')}
                </Text>
              </View>
            ) : null
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
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
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  flagText: {
    fontSize: 18,
  },
  codeText: {
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  memberRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    borderRadius: 12,
    width: '100%',
    maxHeight: 400,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryLabel: {
    fontSize: 16,
  },
});
