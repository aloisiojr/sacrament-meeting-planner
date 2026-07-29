/**
 * Tests for contact-delegation resolution (src/lib/contact.ts) — v2.0.
 */

import { describe, it, expect } from 'vitest';
import { resolveContactSnapshot } from '../lib/contact';
import type { Member } from '../types/database';

function makeMember(overrides: Partial<Member> & { full_name: string }): Member {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    full_name: overrides.full_name,
    informal_name: overrides.informal_name ?? null,
    country_code: overrides.country_code ?? '+55',
    phone: overrides.phone ?? null,
    can_preside: overrides.can_preside ?? false,
    can_conduct: overrides.can_conduct ?? false,
    can_lead_music: overrides.can_lead_music ?? false,
    can_play_piano: overrides.can_play_piano ?? false,
    can_be_recognized: overrides.can_be_recognized ?? false,
    contact_via_responsible: overrides.contact_via_responsible ?? false,
    responsible_id: overrides.responsible_id ?? null,
    calling: overrides.calling ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

describe('resolveContactSnapshot', () => {
  it('uses the member own phone (not delegated) when contact_via_responsible is false', () => {
    const member = makeMember({ full_name: 'João Silva', country_code: '+55', phone: '11987654321' });
    expect(resolveContactSnapshot(member)).toEqual({
      contact_phone: '+5511987654321',
      is_delegated: false,
      delegate_for_name: null,
    });
  });

  it('delegates to the responsible full phone when flag on and responsible supplied', () => {
    const member = makeMember({
      full_name: 'Ana Menor',
      informal_name: 'Ana',
      contact_via_responsible: true,
      responsible_id: 'resp-1',
      country_code: '+55',
      phone: '11000000000',
    });
    const responsible = makeMember({
      id: 'resp-1',
      full_name: 'Pai Responsável',
      country_code: '+55',
      phone: '11999998888',
    });
    expect(resolveContactSnapshot(member, responsible)).toEqual({
      contact_phone: '+5511999998888',
      is_delegated: true,
      delegate_for_name: 'Ana',
    });
  });

  it('uses full_name for delegate_for_name when informal_name is missing', () => {
    const member = makeMember({
      full_name: 'Carlos Sem Apelido',
      informal_name: null,
      contact_via_responsible: true,
      responsible_id: 'resp-1',
    });
    const responsible = makeMember({ id: 'resp-1', full_name: 'Resp', phone: '11999998888' });
    expect(resolveContactSnapshot(member, responsible).delegate_for_name).toBe('Carlos Sem Apelido');
  });

  it('orphaned delegation (flag on, no responsible) falls back to own phone, not delegated', () => {
    const member = makeMember({
      full_name: 'Orfão',
      contact_via_responsible: true,
      responsible_id: 'resp-missing',
      country_code: '+55',
      phone: '11987654321',
    });
    expect(resolveContactSnapshot(member, null)).toEqual({
      contact_phone: '+5511987654321',
      is_delegated: false,
      delegate_for_name: null,
    });
  });

  it('returns null contact_phone when the resolved contact has no phone', () => {
    const member = makeMember({ full_name: 'No Phone', phone: null });
    expect(resolveContactSnapshot(member).contact_phone).toBeNull();
  });

  it('falls back to the member own phone (not delegated) when the responsible has no phone', () => {
    // P2 #2: an orphaned responsible with no usable phone must NOT produce a delegated snapshot,
    // otherwise the WhatsApp message would be wrapped with an empty {responsavel}.
    const member = makeMember({
      full_name: 'Ana',
      informal_name: 'Ana',
      contact_via_responsible: true,
      responsible_id: 'resp-1',
      country_code: '+55',
      phone: '11987654321',
    });
    const responsible = makeMember({ id: 'resp-1', full_name: 'Resp', phone: null });
    expect(resolveContactSnapshot(member, responsible)).toEqual({
      contact_phone: '+5511987654321',
      is_delegated: false,
      delegate_for_name: null,
    });
  });

  it('falls back to null (not delegated) when both responsible and member have no phone', () => {
    const member = makeMember({
      full_name: 'Ana',
      informal_name: 'Ana',
      contact_via_responsible: true,
      responsible_id: 'resp-1',
      phone: null,
    });
    const responsible = makeMember({ id: 'resp-1', full_name: 'Resp', phone: null });
    expect(resolveContactSnapshot(member, responsible)).toEqual({
      contact_phone: null,
      is_delegated: false,
      delegate_for_name: null,
    });
  });
});
