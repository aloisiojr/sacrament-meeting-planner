import { describe, it, expect } from 'vitest';
import { formatDesignationLines } from '../lib/designations';
import type { Designation } from '../types/database';

// A minimal translator that maps the label keys this helper uses.
const t = (key: string): string => {
  const map: Record<string, string> = {
    'agenda.designations.type.sustain': 'Apoio',
    'agenda.designations.type.release': 'Desobrigação',
    'agenda.designations.type.priesthood': 'Avanço',
    'agenda.designations.type.new_member': 'Novo Membro',
    'agenda.designations.office.deacon': 'Diácono',
    'agenda.designations.office.teacher': 'Mestre',
    'agenda.designations.office.priest': 'Sacerdote',
  };
  return map[key] ?? key;
};

const base = { person_name: 'João Silva', member_id: 'm1', calling: null, office: null } as const;

describe('formatDesignationLines', () => {
  it('sustain: name — type on line 1, calling on line 2', () => {
    const item: Designation = { ...base, type: 'sustain', calling: 'Presidente do Quórum de Élderes' };
    expect(formatDesignationLines(item, t)).toEqual({
      line1: 'João Silva — Apoio',
      line2: 'Presidente do Quórum de Élderes',
    });
  });

  it('release: calling being released from goes on line 2', () => {
    const item: Designation = { ...base, type: 'release', calling: 'Secretário da Ala' };
    expect(formatDesignationLines(item, t)).toEqual({
      line1: 'João Silva — Desobrigação',
      line2: 'Secretário da Ala',
    });
  });

  it('priesthood: office label on line 2, no calling', () => {
    const item: Designation = { ...base, type: 'priesthood', office: 'deacon' };
    expect(formatDesignationLines(item, t)).toEqual({
      line1: 'João Silva — Avanço',
      line2: 'Diácono',
    });
  });

  it('new_member: single line, no second segment', () => {
    const item: Designation = { ...base, type: 'new_member' };
    expect(formatDesignationLines(item, t)).toEqual({ line1: 'João Silva — Novo Membro' });
  });

  it('sustain with blank calling: no second line', () => {
    const item: Designation = { ...base, type: 'sustain', calling: '   ' };
    expect(formatDesignationLines(item, t)).toEqual({ line1: 'João Silva — Apoio' });
  });
});
