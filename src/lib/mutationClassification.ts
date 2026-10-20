/**
 * Offline classification of every mutation in the app (EST-03 / DEC-01, owner decision — hybrid):
 *
 *  - `queued`: meeting flows (agenda, speeches/prayers, designations). A write made offline is
 *    persisted by `withOfflineQueue` and replayed on reconnect. It never silently disappears.
 *  - `blocked-offline`: everything else (settings, import, admin/users, the topic library outside
 *    the meeting flow). Offline, the edit is blocked BEFORE touching the server with a clear,
 *    translated message — instead of faking success.
 *
 * Every `useMutation` site goes through `useClassifiedMutation(name, ...)` with a name registered
 * here. An unregistered name throws when the hook runs, so a new mutation cannot be born
 * unclassified and pass a test run that renders it. The inventory below covers all 32 mutation
 * sites found by the v2.0 audit (23 hooks + 9 inline in settings screens).
 */

export type OfflineClass = 'queued' | 'blocked-offline';

export const MUTATION_OFFLINE_CLASS = {
  // --- Meeting flows: real offline queue (DEC-01) ---
  useUpdateAgenda: 'queued',
  useUpdateAgendaByDate: 'queued',
  useAssignSpeaker: 'queued',
  useAssignTopic: 'queued',
  useChangeStatus: 'queued',
  useUpdateSpeechContact: 'queued',
  useRemoveAssignment: 'queued',
  // Members: update/delete were already queued (update is used by the designations meeting
  // flow); create joins them with a client-assigned id instead of diverging from its siblings.
  useCreateMember: 'queued',
  useUpdateMember: 'queued',
  useDeleteMember: 'queued',

  // --- Everything else: blocked offline with visible feedback (DEC-01) ---
  useLazyCreateAgenda: 'blocked-offline',
  useLazyCreateSpeeches: 'blocked-offline',
  // Multi-row delete by position: not expressible as an id-scoped queue replay.
  useDeleteSpeechesByDate: 'blocked-offline',
  useAutoAssignSundayTypes: 'blocked-offline',
  useSetSundayType: 'blocked-offline',
  useRemoveSundayException: 'blocked-offline',
  useCreateWardTopic: 'blocked-offline',
  useUpdateWardTopic: 'blocked-offline',
  useDeleteWardTopic: 'blocked-offline',
  useUpdateWardInfo: 'blocked-offline',
  useUpdateWardDesignationTemplate: 'blocked-offline',
  useSetNotificationsEnabled: 'blocked-offline',
  useApplyMemberImport: 'blocked-offline',
  'settings.toggleManagePrayers': 'blocked-offline',
  'settings.wardLanguageChange': 'blocked-offline',
  'settings.whatsappTemplateSave': 'blocked-offline',
  'settings.membersImport': 'blocked-offline',
  'settings.inviteUser': 'blocked-offline',
  'settings.changeUserRole': 'blocked-offline',
  'settings.deleteUser': 'blocked-offline',
  'settings.updateUserName': 'blocked-offline',
  'settings.saveTimezone': 'blocked-offline',
} as const satisfies Record<string, OfflineClass>;

export type MutationName = keyof typeof MUTATION_OFFLINE_CLASS;

/** The offline class for a mutation name, or undefined when unregistered. */
export function offlineClassFor(name: string): OfflineClass | undefined {
  return (MUTATION_OFFLINE_CLASS as Record<string, OfflineClass>)[name];
}
