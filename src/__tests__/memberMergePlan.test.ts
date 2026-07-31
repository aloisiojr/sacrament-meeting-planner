/**
 * S4 tests — merge plan classification (Rule 4; AC7/AC8/AC9-classify).
 */
import { describe, it, expect } from 'vitest';
import { buildMergePlan, type ParsedMember } from '../lib/memberMergePlan';
import type { Member } from '../types/database';

const member = (over: Partial<Member> & { full_name: string }): Member =>
  ({ id: over.full_name, ward_id: 'w', informal_name: null, country_code: '+55', phone: null,
     can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
     can_be_recognized: false, contact_via_responsible: false, responsible_id: null, calling: null,
     created_at: '', updated_at: '', ...over } as Member);

const p = (name: string, phone: string | null, age = 30): ParsedMember => ({ name, phone, age });

describe('buildMergePlan', () => {
  it('classifies a brand-new PDF member as insert', () => {
    const plan = buildMergePlan([p('Fernando de Oliveira', '+5511999990000')], []);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].name).toBe('Fernando de Oliveira');
  });

  it('matches by normalized name (accent/case) and fills an empty DB phone', () => {
    const db = [member({ full_name: 'João Silva', country_code: '+55', phone: null })];
    const plan = buildMergePlan([p('joao silva', '+5511900000011')], db);
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toEqual([{ member: db[0], phone: '+5511900000011' }]);
  });

  it('treats similar-but-different names as different people (no fuzzy match)', () => {
    const db = [member({ full_name: 'João Silva' })];
    const plan = buildMergePlan([p('Alfa Beta Sobrenome', '+5511999998888')], db);
    expect(plan.toInsert).toHaveLength(1); // the PDF person is new
    expect(plan.absentInDb).toHaveLength(1); // the DB person is absent from the PDF
  });

  it('flags a phone conflict (both present, differ) without auto-updating', () => {
    const db = [member({ full_name: 'Maria Santos', country_code: '+55', phone: '11955551111' })];
    const plan = buildMergePlan([p('Maria Santos', '+5511977772222')], db);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.phoneConflicts).toHaveLength(1);
    expect(plan.phoneConflicts[0]).toMatchObject({
      appPhone: '5511955551111',
      pdfPhone: '+5511977772222',
    });
  });

  it('counts an unchanged match when phones are the same', () => {
    const db = [member({ full_name: 'Ana Lima', country_code: '+55', phone: '11900000011' })];
    const plan = buildMergePlan([p('Ana Lima', '+5511900000011')], db);
    expect(plan.unchanged).toBe(1);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.phoneConflicts).toHaveLength(0);
  });

  it('does not flag a conflict when the DB stored a national phone with no country_code', () => {
    // Legacy row: national phone, country_code null → digits are a suffix of the PDF full number.
    const db = [member({ full_name: 'Ana Lima', country_code: null as unknown as string, phone: '11900000011' })];
    const plan = buildMergePlan([p('Ana Lima', '+5511900000011')], db);
    expect(plan.phoneConflicts).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it('keeps the DB member unchanged when the PDF has no phone', () => {
    const db = [member({ full_name: 'Bob Reis', country_code: '+55', phone: '11912345678' })];
    const plan = buildMergePlan([p('Bob Reis', null)], db);
    expect(plan.unchanged).toBe(1);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it('lists DB members absent from the PDF for the removal review', () => {
    const db = [member({ full_name: 'Gone Person' }), member({ full_name: 'Stays Person' })];
    const plan = buildMergePlan([p('Stays Person', null)], db);
    expect(plan.absentInDb.map((m) => m.full_name)).toEqual(['Gone Person']);
  });

  it('preserves DB-only columns by never touching them (only phone in toUpdate)', () => {
    const db = [member({ full_name: 'Cap Holder', phone: null, can_preside: true, calling: 'Bishop' })];
    const plan = buildMergePlan([p('Cap Holder', '+5511999990000')], db);
    // toUpdate carries only {member, phone}; capabilities/calling on the member object are untouched.
    expect(plan.toUpdate[0].member.can_preside).toBe(true);
    expect(plan.toUpdate[0].member.calling).toBe('Bishop');
    expect(Object.keys(plan.toUpdate[0])).toEqual(['member', 'phone']);
  });
});
