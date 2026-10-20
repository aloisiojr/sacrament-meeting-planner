/**
 * S5 — apply a confirmed PDF-import merge to the members table. Non-destructive:
 *  - inserts: new members, capabilities/responsible/calling blank.
 *  - phoneUpdates: matched members getting a phone (empty-fill + conflicts the user resolved to PDF).
 *  - removeIds: ONLY the members the user explicitly marked in the removal review.
 *
 * CONF-07: the whole merge is ONE call to the transactional `apply_member_import` RPC
 * (migration 060) — inserts, batched phone updates and removals commit or roll back
 * together, and the RPC deduplicates inserts by natural key (ward + normalized name),
 * so re-running the same import never duplicates a member. An RPC error propagates:
 * no silent partial state. Online-only (blocked-offline classification, as before).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useClassifiedMutation } from './useClassifiedMutation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { splitPhoneNumber } from '../lib/countryCodes';
import { memberKeys } from './useMembers';

export interface MemberImportInsert {
  /** Full name, already "First Last" (Rule 1). */
  name: string;
  /** Full phone "+<digits>" or null. */
  phone: string | null;
}

export interface MemberImportPhoneUpdate {
  id: string;
  phone: string; // full "+<digits>"
}

export interface MemberImportApply {
  inserts: MemberImportInsert[];
  phoneUpdates: MemberImportPhoneUpdate[];
  removeIds: string[];
}

export interface MemberImportResult {
  inserted: number;
  updated: number;
  removed: number;
  /** Inserts the RPC skipped because the member already exists in the ward (retry-safe). */
  skipped: number;
}

export function useApplyMemberImport() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useClassifiedMutation('useApplyMemberImport', {
    mutationFn: async (apply: MemberImportApply): Promise<MemberImportResult> => {
      // Prepare the payload; the RPC does every write in one transaction.
      // informal_name = first word (matches useCreateMember default).
      const inserts = apply.inserts.map((i) => {
        const split = i.phone ? splitPhoneNumber(i.phone) : { countryCode: '+55', phone: '' };
        return {
          full_name: i.name,
          informal_name: i.name.split(' ')[0] || i.name,
          country_code: split.countryCode,
          phone: split.phone || null,
        };
      });
      const phoneUpdates = apply.phoneUpdates.map((u) => {
        const split = splitPhoneNumber(u.phone);
        return { id: u.id, country_code: split.countryCode, phone: split.phone || null };
      });

      const { data, error } = await supabase.rpc('apply_member_import', {
        p_ward_id: wardId,
        p_inserts: inserts,
        p_phone_updates: phoneUpdates,
        p_remove_ids: apply.removeIds,
      });
      if (error) throw error;

      const result = (data ?? {}) as Partial<MemberImportResult>;
      return {
        inserted: result.inserted ?? 0,
        updated: result.updated ?? 0,
        removed: result.removed ?? 0,
        skipped: result.skipped ?? 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
    },
  });
}
