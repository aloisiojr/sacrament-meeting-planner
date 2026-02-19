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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SwipeableCard } from '../../../components/SwipeableCard';
import { SearchInput } from '../../../components/SearchInput';
import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../lib/activityLog';
import { generateCsv, parseCsv, splitPhoneNumber, type CsvErrorCode } from '../../../lib/csvUtils';
import { COUNTRY_CODES, getFlagForCode, type CountryCode } from '../../../lib/countryCodes';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  checkFutureSpeeches,
  memberKeys,
} from '../../../hooks/useMembers';
import type { Member } from '../../../types/database';

// --- Inline Editor ---

interface MemberEditorProps {
  member?: Member;
  onSave: (data: { full_name: string; country_code: string; phone: string }) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function MemberEditor({ member, onSave, onCancel, colors }: MemberEditorProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [countryCode, setCountryCode] = useState(member?.country_code ?? '+55');
  const [countryLabel, setCountryLabel] = useState(
    () => COUNTRY_CODES.find((c) => c.code === (member?.country_code ?? '+55'))?.label ?? 'Brazil (+55)'
  );
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
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>

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
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.countryItem,
                    item.label === countryLabel && { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setCountryLabel(item.label);
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
  onCancel: () => void;
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
  onCancel,
  disabled,
  colors,
}: MemberRowProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <MemberEditor
        member={member}
        onSave={onSave}
        onCancel={onCancel}
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

// --- CSV Error Translation Helper ---

function translateCsvError(
  code: CsvErrorCode | undefined,
  t: (key: string) => string
): string {
  switch (code) {
    case 'EMPTY_FILE': return t('members.csvErrorEmptyFile');
    case 'INVALID_HEADER': return t('members.csvErrorInvalidHeader');
    case 'INSUFFICIENT_COLUMNS': return t('members.csvErrorInsufficientColumns');
    case 'NAME_REQUIRED': return t('members.csvErrorNameRequired');
    case 'NO_DATA': return t('members.csvErrorNoData');
    default: return code ?? 'Unknown error';
  }
}

// --- Main Screen ---

export default function MembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { hasPermission, wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

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
            onPress: () => deleteMember.mutate({ memberId: member.id, memberName: member.full_name }),
          },
        ]);
      } catch {
        Alert.alert(t('common.confirm'), t('members.deleteConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => deleteMember.mutate({ memberId: member.id, memberName: member.full_name }),
          },
        ]);
      }
    },
    [t, deleteMember]
  );

  // Export guard to prevent double-tap
  const exportingRef = useRef(false);

  // CSV Export handler
  const handleExport = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;

    try {
      const csv = generateCsv(members ?? [], {
        name: t('members.csvHeaderName'),
        phone: t('members.csvHeaderPhone'),
      });
      console.log('[Export] CSV length:', csv.length);

      if (Platform.OS === 'web') {
        // Web: Blob download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'membros.csv';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile: Write temp file and share via expo-sharing
        const file = new File(Paths.cache, 'membros.csv');
        console.log('[Export] fileUri:', file.uri);
        file.write(csv);
        console.log('[Export] File written successfully');
        console.log('[Export] Opening share sheet...');
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: t('members.exportCsv'),
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch (err: any) {
      console.error('Export CSV failed:', err);
      const msg = (err?.message ?? '').toLowerCase();
      if (msg !== 'user did not share' && !msg.includes('cancelled')) {
        Alert.alert(t('common.error'), t('members.exportFailed'));
      }
    } finally {
      exportingRef.current = false;
    }
  }, [members, t]);

  // CSV Import mutation (atomic overwrite via RPC)
  const importMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const result = parseCsv(csvContent);

      if (!result.success) {
        const errorMessages = result.errors
          .map((e) => t('members.importErrorLine', { line: String(e.line), field: e.field, error: translateCsvError(e.code, t) }))
          .join('\n');
        throw new Error(errorMessages);
      }

      if (result.members.length === 0) {
        throw new Error(t('members.importEmpty'));
      }

      // Build members array for the RPC
      const newMembers = result.members.map((m) => {
        const { countryCode, phone } = splitPhoneNumber(m.phone);
        return {
          full_name: m.full_name,
          country_code: countryCode,
          phone: phone || null,
        };
      });

      // Atomic transaction via RPC: DELETE all + INSERT new
      const { data, error } = await supabase
        .rpc('import_members', {
          target_ward_id: wardId,
          new_members: newMembers,
        });

      if (error) throw error;
      return { imported: data as number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      Alert.alert(t('common.success'), t('members.importSuccess', { count: data.imported }));
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:import', `Members imported via CSV: ${data.imported} members`, userName);
      }
    },
    onError: (err: Error) => {
      Alert.alert(t('common.error'), err.message);
    },
  });

  // CSV Import - actual file picker logic
  const performImport = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web: file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const text = await file.text();
        importMutation.mutate(text);
      };
      input.click();
    } else {
      // Mobile: DocumentPicker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
          copyToCacheDirectory: true,
        });
        console.log('[Import] DocumentPicker result:', {
          uri: result.assets?.[0]?.uri,
          name: result.assets?.[0]?.name,
          mimeType: result.assets?.[0]?.mimeType,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const pickedFile = new File(result.assets[0].uri);
        const content = await pickedFile.text();
        console.log('[Import] File content length:', content.length);
        importMutation.mutate(content);
      } catch (err: any) {
        console.error('Import CSV failed:', err);
        const msg = (err?.message ?? '').toLowerCase();
        if (msg.includes('cancel') || msg.includes('cancelled')) return;
        const errorKey = (msg.includes('read') || msg.includes('encoding'))
          ? 'members.importReadError'
          : 'members.importFailed';
        Alert.alert(t('common.error'), t(errorKey));
      }
    }
  }, [importMutation, t]);

  // CSV Import handler with confirmation dialog
  const handleImport = useCallback(() => {
    Alert.alert(
      t('members.importConfirmTitle'),
      t('members.importConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'default', onPress: () => performImport() },
      ]
    );
  }, [t, performImport]);

  const canImport = hasPermission('member:import');

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
        onCancel={() => setEditingId(null)}
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
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.backButton, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{t('members.title')}</Text>
          {canWrite ? (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel={t('members.addMember')}
            >
              <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+</Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Screen description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('members.description')}
        </Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
          />
        </View>

        {/* CSV Import/Export */}
        {canImport && (
          <>
          <View style={styles.csvActions}>
            <Pressable
              style={[styles.csvButton, { borderColor: colors.primary }]}
              onPress={handleExport}
              accessibilityRole="button"
              accessibilityLabel={t('members.exportCsv')}
            >
              <Text style={[styles.csvButtonText, { color: colors.primary }]}>
                {t('members.exportCsv')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.csvButton, { borderColor: colors.primary }]}
              onPress={handleImport}
              disabled={importMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('members.importCsv')}
            >
              {importMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.csvButtonText, { color: colors.primary }]}>
                  {t('members.importCsv')}
                </Text>
              )}
            </Pressable>
          </View>
          <Text style={[styles.csvHelp, { color: colors.textSecondary }]}>
            {t('members.csvHelp')}
          </Text>
          </>
        )}

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
          style={styles.flex}
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
  backButton: {
    fontSize: 16,
    fontWeight: '600',
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  csvActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  csvButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  csvButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  csvHelp: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
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
