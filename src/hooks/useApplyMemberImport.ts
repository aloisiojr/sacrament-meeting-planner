/**
 * S5 — apply a confirmed PDF-import merge to the members table. Non-destructive & batched:
 *  - inserts: new members (one batched `.insert`), capabilities/responsible/calling blank.
 *  - phoneUpdates: matched members getting a phone (empty-fill + conflicts the user resolved to PDF).
 *  - removeIds: ONLY the members the user explicitly marked in the removal review.
 * Online-only (RLS-gated write path, migration 044). No local queue.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
}

export function useApplyMemberImport() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apply: MemberImportApply): Promise<MemberImportResult> => {
      // Inserts (batched). Derive informal_name = first word (matches useCreateMember default).
      if (apply.inserts.length > 0) {
        const rows = apply.inserts.map((i) => {
          const split = i.phone ? splitPhoneNumber(i.phone) : { countryCode: '+55', phone: '' };
          return {
            ward_id: wardId,
            full_name: i.name,
            informal_name: i.name.split(' ')[0] || i.name,
            country_code: split.countryCode,
            phone: split.phone || null,
            can_preside: false,
            can_conduct: false,
            can_lead_music: false,
            can_play_piano: false,
            can_be_recognized: false,
            contact_via_responsible: false,
            responsible_id: null,
            calling: null,
          };
        });
        const { error } = await supabase.from('members').insert(rows);
        if (error) throw error;
      }

      // Phone updates (matched members). Small in practice → per-row update.
      for (const u of apply.phoneUpdates) {
        const split = splitPhoneNumber(u.phone);
        const { error } = await supabase
          .from('members')
          .update({ country_code: split.countryCode, phone: split.phone || null })
          .eq('id', u.id);
        if (error) throw error;
      }

      // Removals — only the explicitly-marked ids.
      if (apply.removeIds.length > 0) {
        const { error } = await supabase.from('members').delete().in('id', apply.removeIds);
        if (error) throw error;
      }

      return {
        inserted: apply.inserts.length,
        updated: apply.phoneUpdates.length,
        removed: apply.removeIds.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
    },
  });
}
