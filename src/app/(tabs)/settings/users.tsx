import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import type { Role } from '../../../types/database';

const ROLES: Role[] = ['bishopric', 'secretary', 'observer'];

interface WardUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export const userManagementKeys = {
  all: ['user-management'] as const,
  users: ['user-management', 'users'] as const,
};

async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
) {
  // Guard: verify session before calling invoke (ADR-024)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('auth/no-session');
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) {
    let serverMessage: string | undefined;
    try {
      if (error.context && typeof error.context.json === 'function') {
        const errorBody = await error.context.json();
        serverMessage = errorBody?.error;
      }
    } catch {
      // Extraction failed, fall through to generic message
    }
    throw new Error(serverMessage || error.message);
  }
  return data;
}

export default function UserManagementScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user: currentUser, session } = useAuth();
  const queryClient = useQueryClient();

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('observer');
  const [inviteResult, setInviteResult] = useState<{
    deepLink: string;
  } | null>(null);

  // Fetch ward users
  const {
    data: users = [],
    isLoading,
    error: usersError,
    refetch,
  } = useQuery({
    queryKey: userManagementKeys.users,
    queryFn: async (): Promise<WardUser[]> => {
      const result = await callEdgeFunction('list-users', {});
      return result.users ?? [];
    },
    enabled: !!session,
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      return callEdgeFunction('create-invitation', { email, role });
    },
    onSuccess: (data) => {
      setInviteResult({ deepLink: data.invitation.deepLink });
    },
    onError: () => {
      Alert.alert(t('common.error'), t('users.inviteFailed'));
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({
      targetUserId,
      newRole,
    }: {
      targetUserId: string;
      newRole: Role;
    }) => {
      return callEdgeFunction('update-user-role', { targetUserId, newRole });
    },
    onSuccess: (data) => {
      if (data.isLastBishopric) {
        Alert.alert(t('common.success'), t('users.lastBishopricWarning'));
      } else {
        Alert.alert(t('common.success'), t('users.roleChangeSuccess'));
      }
      queryClient.invalidateQueries({ queryKey: userManagementKeys.users });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.context?.body?.error;
      if (msg === 'cannot_change_own_role') {
        Alert.alert(t('common.error'), t('users.cannotChangeOwnRole'));
      } else {
        Alert.alert(t('common.error'), t('users.roleChangeFailed'));
      }
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      return callEdgeFunction('delete-user', { targetUserId });
    },
    onSuccess: () => {
      Alert.alert(t('common.success'), t('users.deleteSuccess'));
      setExpandedUserId(null);
      queryClient.invalidateQueries({ queryKey: userManagementKeys.users });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.context?.body?.error;
      if (msg === 'cannot_delete_self') {
        Alert.alert(t('common.error'), t('users.cannotDeleteSelf'));
      } else {
        Alert.alert(t('common.error'), t('users.deleteFailed'));
      }
    },
  });

  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }, [inviteEmail, inviteRole, inviteMutation]);

  const handleCopyLink = useCallback(async (link: string) => {
    await Clipboard.setStringAsync(link);
    Alert.alert(t('common.success'), t('users.linkCopied'));
  }, [t]);

  const handleShareLink = useCallback(async (link: string) => {
    try {
      await Share.share({ message: link });
    } catch {
      // User cancelled or error - silently ignore
    }
  }, []);

  const handleRoleChange = useCallback(
    (targetUser: WardUser, newRole: Role) => {
      if (targetUser.id === currentUser?.id) {
        Alert.alert(t('common.error'), t('users.cannotChangeOwnRole'));
        return;
      }
      changeRoleMutation.mutate({
        targetUserId: targetUser.id,
        newRole,
      });
    },
    [currentUser, changeRoleMutation, t]
  );

  const handleDelete = useCallback(
    (targetUser: WardUser) => {
      if (targetUser.id === currentUser?.id) {
        Alert.alert(t('common.error'), t('users.cannotDeleteSelf'));
        return;
      }
      Alert.alert(t('users.deleteUser'), t('users.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate(targetUser.id),
        },
      ]);
    },
    [currentUser, deleteUserMutation, t]
  );

  const openInviteModal = useCallback(() => {
    setInviteEmail('');
    setInviteRole('observer');
    setInviteResult(null);
    setInviteModalVisible(true);
  }, []);

  const closeInviteModal = useCallback(() => {
    setInviteModalVisible(false);
    setInviteResult(null);
    inviteMutation.reset();
  }, [inviteMutation]);

  const currentUserId = currentUser?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.backButton, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('users.title')}
          </Text>
          <Pressable
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={openInviteModal}
            accessibilityRole="button"
            accessibilityLabel={t('users.inviteUser')}
          >
            <Text style={styles.inviteButtonText}>{t('users.inviteUser')}</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {usersError && (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('users.loadError')}
            </Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !usersError && users.length === 0 && (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('users.noUsers')}
            </Text>
          </View>
        )}

        {users.map((u) => {
          const isExpanded = expandedUserId === u.id;
          const isSelf = u.id === currentUserId;

          return (
            <Pressable
              key={u.id}
              style={[styles.userCard, { backgroundColor: colors.card }]}
              onPress={() => setExpandedUserId(isExpanded ? null : u.id)}
              accessibilityRole="button"
            >
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userEmail, { color: colors.text }]}>
                    {u.email}
                  </Text>
                  <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                    {t(`roles.${u.role}`)}
                    {isSelf ? ` (${t('common.you') || 'you'})` : ''}
                  </Text>
                </View>
                <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </View>

              {isExpanded && (
                <View style={[styles.expandedSection, { borderTopColor: colors.divider }]}>
                  {/* Email (read-only) */}
                  <View style={styles.fieldRow}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('users.email')}
                    </Text>
                    <Text style={[styles.fieldValue, { color: colors.text }]}>
                      {u.email}
                    </Text>
                  </View>

                  {/* Role selector */}
                  <View style={styles.fieldRow}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('users.role')}
                    </Text>
                    <View style={styles.roleSelector}>
                      {ROLES.map((role) => (
                        <Pressable
                          key={role}
                          style={[
                            styles.roleOption,
                            {
                              backgroundColor:
                                u.role === role ? colors.primary : colors.surfaceVariant,
                              opacity: isSelf ? 0.5 : 1,
                            },
                          ]}
                          onPress={() => {
                            if (!isSelf && role !== u.role) {
                              handleRoleChange(u, role);
                            }
                          }}
                          disabled={isSelf || changeRoleMutation.isPending}
                          accessibilityRole="radio"
                          accessibilityState={{
                            selected: u.role === role,
                            disabled: isSelf,
                          }}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              {
                                color:
                                  u.role === role ? '#FFFFFF' : colors.text,
                              },
                            ]}
                          >
                            {t(`roles.${role}`)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Remove button (hidden for self) */}
                  {!isSelf && (
                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: colors.error }]}
                      onPress={() => handleDelete(u)}
                      disabled={deleteUserMutation.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={t('users.deleteUser')}
                    >
                      <Text style={styles.deleteButtonText}>
                        {t('users.deleteUser')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInviteModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeInviteModal}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('users.inviteUser')}
            </Text>

            {!inviteResult ? (
              <>
                {/* Email input */}
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.divider,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                  placeholder={t('users.email')}
                  placeholderTextColor={colors.textSecondary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Role selector */}
                <View style={styles.inviteRoleSelector}>
                  {ROLES.map((role) => (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor:
                            inviteRole === role ? colors.primary : colors.surfaceVariant,
                        },
                      ]}
                      onPress={() => setInviteRole(role)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: inviteRole === role }}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          {
                            color: inviteRole === role ? '#FFFFFF' : colors.text,
                          },
                        ]}
                      >
                        {t(`roles.${role}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Invite button */}
                <Pressable
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.primary },
                    (!inviteEmail.trim() || inviteMutation.isPending) && {
                      opacity: 0.5,
                    },
                  ]}
                  onPress={handleInvite}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  accessibilityRole="button"
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {t('users.inviteUser')}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {/* Success: show deep link */}
                <Text style={[styles.successText, { color: colors.text }]}>
                  {t('users.inviteSuccess')}
                </Text>
                <Text
                  style={[
                    styles.linkText,
                    { color: colors.primary, backgroundColor: colors.surfaceVariant },
                  ]}
                  selectable
                >
                  {inviteResult.deepLink}
                </Text>
                <View style={styles.linkActions}>
                  <Pressable
                    style={[styles.linkButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleCopyLink(inviteResult.deepLink)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.linkButtonText}>{t('users.copyLink')}</Text>
                  </Pressable>
                  {Platform.OS !== 'web' && (
                    <Pressable
                      style={[styles.linkButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleShareLink(inviteResult.deepLink)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.linkButtonText}>
                        {t('users.shareLink')}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={[styles.closeButton, { borderColor: colors.divider }]}
                  onPress={closeInviteModal}
                  accessibilityRole="button"
                >
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>
                    {t('common.close')}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
  },
  userCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  expandedSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inviteRoleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
