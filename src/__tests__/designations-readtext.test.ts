import { describe, it, expect } from 'vitest';
import { buildDesignationReadText, orderDesignations } from '../lib/designations';
import type { Designation } from '../types/database';

// Mirrors the shape of the real i18n default templates + office labels.
const TEMPLATES: Record<string, string> = {
  'agenda.designations.readText.sustain':
    '{name} foi chamado(a) como {calling}. Os que forem a favor, manifestem-se levantando a mão. [Pausa Breve] Se alguém se opuser, manifeste-se. [Pausa Breve]',
  'agenda.designations.readText.release':
    '{name} foi desobrigado(a) de {calling}. Aqueles que desejarem expressar gratidão pelo seu serviço podem manifestá-lo levantando a mão.',
  'agenda.designations.readText.priesthood':
    'É proposto que o irmão {name} receba o Sacerdócio Aarônico e seja ordenado {office}. [Pausa Breve]',
  'agenda.designations.readText.new_member':
    'É com alegria que apresentamos {name} como novo membro da Ala {ward}. [Pausa Breve]',
  'agenda.designations.office.deacon': 'Diácono',
  'agenda.designations.office.teacher': 'Mestre',
  'agenda.designations.office.priest': 'Sacerdote',
};
const t = (key: string): string => TEMPLATES[key] ?? key;

const base = { person_name: 'João Silva', member_id: 'm1', calling: null, office: null } as const;

describe('buildDesignationReadText', () => {
  it('sustain: substitutes {name} and {calling}, keeps stage directions verbatim', () => {
    const item: Designation = { ...base, type: 'sustain', calling: 'Presidente do Quórum de Élderes' };
    const out = buildDesignationReadText(item, {}, t);
    expect(out).toBe(
      'João Silva foi chamado(a) como Presidente do Quórum de Élderes. Os que forem a favor, manifestem-se levantando a mão. [Pausa Breve] Se alguém se opuser, manifeste-se. [Pausa Breve]'
    );
  });

  it('release: substitutes name + calling', () => {
    const item: Designation = { ...base, type: 'release', calling: 'Secretário da Ala' };
    expect(buildDesignationReadText(item, {}, t)).toContain('João Silva foi desobrigado(a) de Secretário da Ala.');
  });

  it('priesthood: substitutes the localized {office} label, no calling', () => {
    const item: Designation = { ...base, type: 'priesthood', office: 'deacon' };
    const out = buildDesignationReadText(item, {}, t);
    expect(out).toContain('seja ordenado Diácono');
    expect(out).not.toContain('{office}');
  });

  it('new_member: substitutes {ward} with the ward name', () => {
    const item: Designation = { ...base, type: 'new_member', person_name: 'Maria Souza' };
    const out = buildDesignationReadText(item, { wardName: 'Jardim' }, t);
    expect(out).toContain('apresentamos Maria Souza como novo membro da Ala Jardim.');
  });

  it('uses the built-in per-locale default when no override is given (AC7)', () => {
    const item: Designation = { ...base, type: 'release', calling: 'RS' };
    expect(buildDesignationReadText(item, {}, t)).toContain('foi desobrigado(a) de RS');
  });

  it('respects an explicit template override (AC7 — future ward config)', () => {
    const item: Designation = { ...base, type: 'sustain', calling: 'EQ' };
    const out = buildDesignationReadText(item, { template: 'Apoiamos {name} como {calling}.' }, t);
    expect(out).toBe('Apoiamos João Silva como EQ.');
  });

  it('leaves no token unresolved and preserves literal brackets', () => {
    const item: Designation = { ...base, type: 'sustain', calling: 'EQ' };
    const out = buildDesignationReadText(item, {}, t);
    expect(out).not.toMatch(/\{(name|calling|office|ward)\}/);
    expect(out).toContain('[Pausa Breve]');
  });
});

describe('orderDesignations', () => {
  it('orders by release → sustain → priesthood → new_member, stable within type', () => {
    const mk = (type: Designation['type'], name: string): Designation =>
      ({ ...base, type, person_name: name });
    const input = [
      mk('new_member', 'N1'),
      mk('sustain', 'S1'),
      mk('release', 'R1'),
      mk('priesthood', 'P1'),
      mk('sustain', 'S2'),
      mk('release', 'R2'),
    ];
    expect(orderDesignations(input).map((d) => d.person_name)).toEqual([
      'R1', 'R2', 'S1', 'S2', 'P1', 'N1',
    ]);
  });

  it('does not mutate the input array', () => {
    const input: Designation[] = [
      { ...base, type: 'new_member', person_name: 'N1' },
      { ...base, type: 'release', person_name: 'R1' },
    ];
    orderDesignations(input);
    expect(input.map((d) => d.person_name)).toEqual(['N1', 'R1']);
  });
});
