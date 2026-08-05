/**
 * Tests for contact-delegation resolution (src/lib/contact.ts) — v2.0.
 */

import { resolveContactSnapshot, resolveInvitePhone } from '../lib/contact';
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


describe('resolveInvitePhone — the number actually dialled', () => {
  // Reported 2026-08-05: an invite sent via the responsible produced a wa.me link with no country
  // code. buildFullPhone was applied when the snapshot is WRITTEN, but rows written before that
  // fix — and rows seeded straight into the database — still hold a bare national number, and the
  // send path used the snapshot verbatim.
  const roberto = { country_code: '+55', phone: '11987650026' } as never;
  const sofia = { country_code: '+55', phone: null, responsible_id: 'r' } as never;

  it('repairs the exact case reported', () => {
    expect(
      resolveInvitePhone('11987650026', { isDelegated: true, member: sofia, responsible: roberto })
    ).toBe('+5511987650026');
  });

  it('takes the code from the RESPONSIBLE when delegated — the number is theirs', () => {
    // Using the speaker's code would fabricate a valid-looking WRONG number.
    const speakerAbroad = { country_code: '+1', phone: null } as never;
    expect(
      resolveInvitePhone('11987650026', {
        isDelegated: true,
        member: speakerAbroad,
        responsible: roberto,
      })
    ).toBe('+5511987650026');
  });

  it('takes the code from the speaker when NOT delegated', () => {
    const speaker = { country_code: '+1', phone: '2025550123' } as never;
    expect(resolveInvitePhone('2025550123', { isDelegated: false, member: speaker })).toBe(
      '+12025550123'
    );
  });

  it('leaves an already-international number alone', () => {
    expect(
      resolveInvitePhone('+5511987650026', { isDelegated: true, responsible: roberto })
    ).toBe('+5511987650026');
  });

  it('does not double the country code on a correct snapshot', () => {
    const out = resolveInvitePhone('+5511987650026', { isDelegated: true, responsible: roberto });
    expect(out).toBe('+5511987650026');
    expect(out).not.toContain('+55+55');
  });

  it('strips separators before deciding', () => {
    expect(
      resolveInvitePhone('(11) 98765-0026', { isDelegated: true, responsible: roberto })
    ).toBe('+5511987650026');
  });

  it.each([null, undefined, '', '   ', '()- '])('returns null for %p', (raw) => {
    expect(resolveInvitePhone(raw, { isDelegated: false })).toBeNull();
  });

  it('falls back to the raw digits when no country code can be found', () => {
    // No worse than the old behaviour; better than refusing to send at all.
    expect(resolveInvitePhone('11987650026', { isDelegated: true, responsible: null })).toBe(
      '11987650026'
    );
  });

  it('does not invent a code from the wrong person when the responsible is missing', () => {
    const speaker = { country_code: '+1', phone: null } as never;
    expect(
      resolveInvitePhone('11987650026', { isDelegated: true, member: speaker, responsible: null })
    ).toBe('11987650026');
  });
});
