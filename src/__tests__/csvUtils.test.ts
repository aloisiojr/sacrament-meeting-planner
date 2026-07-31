import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  generateCsv,
  parseCsvBool,
  splitPhoneNumber,
  CSV_DEFAULT_HEADERS,
  EXAMPLE_MEMBERS_BY_LANG,
  getExampleMembers,
  type CsvExportMember,
} from '../lib/csvUtils';

const FULL_HEADER = 'Nome,Nome Informal,Telefone Completo,Preside,Conduz,Rege,Piano,Reconhecer,Responsável,Chamado';

describe('parseCsv', () => {
  it('parses a valid full-dump CSV with capabilities and responsible', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,X,,,,X,Maria Santos,Bispo\nMaria Santos,Maria,+5521888888888,,X,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toEqual({
      full_name: 'Joao Silva',
      informal_name: 'Joao',
      phone: '+5511999999999',
      can_preside: true,
      can_conduct: false,
      can_lead_music: false,
      can_play_piano: false,
      can_be_recognized: true,
      responsible_name: 'Maria Santos',
      calling: 'Bispo',
    });
    expect(result.members[1].can_conduct).toBe(true);
    expect(result.members[1].responsible_name).toBe('');
  });

  it('rejects a legacy 3-column header (all 10 columns now required → INVALID_HEADER)', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_HEADER');
  });

  it('pads a data row with fewer columns than the header (trailing empties dropped)', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0]).toEqual({
      full_name: 'Joao Silva',
      informal_name: 'Joao',
      phone: '+5511999999999',
      can_preside: false,
      can_conduct: false,
      can_lead_music: false,
      can_play_piano: false,
      can_be_recognized: false,
      responsible_name: '',
      calling: '',
    });
  });

  it('rejects a header with fewer than the 10 known columns (INVALID_HEADER)', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_HEADER');
  });

  it('rejects an unrelated 10+ column spreadsheet (anchor-header guard, prevents roster wipe)', () => {
    // A random ≥10-col sheet: col 0 is not a Name header and col 2 is not a Phone header.
    const csv = 'Produto,Qtd,Preço,A,B,C,D,E,F,G\nCafé,2,10,,,,,,,';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_HEADER');
  });

  it('accepts localized export headers (en-US / es-LA)', () => {
    const en = 'Name,Informal Name,Full Phone,Presides,Conducts,Leads Music,Piano,Can Be Recognized,Responsible,calling';
    const es = 'Nombre,Nombre Informal,Teléfono Completo,Preside,Dirige,Dirige la Música,Piano,Puede Ser Reconocido,Responsable,llamamiento';
    expect(parseCsv(`${en}\nJoao Silva,Joao,+5511999999999,,,,,,,`).success).toBe(true);
    expect(parseCsv(`${es}\nJoao Silva,Joao,+5511999999999,,,,,,,`).success).toBe(true);
  });

  it('handles UTF-8 BOM prefix', () => {
    const csv = `\uFEFF${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,X,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].full_name).toBe('Joao Silva');
    expect(result.members[0].can_preside).toBe(true);
  });

  it('handles empty phone numbers', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,,,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].phone).toBe('');
  });

  it('rejects empty CSV', () => {
    const result = parseCsv('');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects CSV with only header', () => {
    const result = parseCsv(FULL_HEADER);
    expect(result.success).toBe(false);
  });

  it('accepts phone without + prefix', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,11999999999,,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].phone).toBe('11999999999');
  });

  it('rejects rows without name (NAME_REQUIRED, column = Nome)', () => {
    const csv = `${FULL_HEADER}\n,,+5511999999999,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('NAME_REQUIRED');
    expect(result.errors[0].column).toBe('Nome');
    expect(result.errors[0].line).toBe(2);
  });

  it('handles quoted fields with commas (name and responsible)', () => {
    const csv = `${FULL_HEADER}\n"Silva, Joao",Joao,+5511999999999,,,,,,"Santos, Maria",\n"Santos, Maria",Maria,+5521888888888,,,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Silva, Joao');
    expect(result.members[0].responsible_name).toBe('Santos, Maria');
  });

  it('skips empty lines', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,,,,,,\n\nMaria Santos,Maria,+5521888888888,,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
  });

  it('handles Windows-style line endings', () => {
    const csv = `${FULL_HEADER}\r\nJoao Silva,Joao,+5511999999999,X,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].can_preside).toBe(true);
  });

  it('defaults informal name to first word of full name when empty', () => {
    const csv = `${FULL_HEADER}\nJoao Carlos Silva,,+5511999999999,,,,,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].informal_name).toBe('Joao');
  });

  it('rejects a row with MORE columns than the header (TOO_MANY_COLUMNS)', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,true,false,false,false,true,,Bispo,extra`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('TOO_MANY_COLUMNS');
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].column).toBe('formato');
  });

  it('rejects an invalid phone (INVALID_PHONE), keeping the bad value', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,(11) 99999-9999,false,false,false,false,false,,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    const err = result.errors.find((e) => e.code === 'INVALID_PHONE');
    expect(err).toBeDefined();
    expect(err?.value).toBe('(11) 99999-9999');
    expect(err?.line).toBe(2);
  });

  it('parses all five capability flags independently', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,X,X,X,X,X,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    const m = result.members[0];
    expect(m.can_preside).toBe(true);
    expect(m.can_conduct).toBe(true);
    expect(m.can_lead_music).toBe(true);
    expect(m.can_play_piano).toBe(true);
    expect(m.can_be_recognized).toBe(true);
  });
});

describe('parseCsvBool', () => {
  it('treats x/sim/yes/si as true (case- and accent-insensitive, trimmed)', () => {
    for (const v of ['x', 'X', ' sim ', 'SIM', 'yes', 'Yes', 'si', 'Sí']) {
      expect(parseCsvBool(v)).toBe(true);
    }
  });

  it('treats empty/undefined as false', () => {
    for (const v of ['', undefined]) {
      expect(parseCsvBool(v)).toBe(false);
    }
  });

  it('treats old (now unsupported) tokens as false', () => {
    for (const v of ['true', '1', 'verdadeiro', 'não', 'no', '0']) {
      expect(parseCsvBool(v)).toBe(false);
    }
  });
});

describe('generateCsv', () => {
  it('generates full-dump CSV with BOM, 10-column header, capabilities, responsible and calling', () => {
    const members: CsvExportMember[] = [
      {
        full_name: 'Joao Silva',
        informal_name: 'Joao',
        country_code: '+55',
        phone: '11999999999',
        can_preside: true,
        can_conduct: false,
        can_lead_music: false,
        can_play_piano: false,
        can_be_recognized: true,
        responsible_name: 'Maria Santos',
        calling: 'Bispo',
      },
    ];
    const csv = generateCsv(members);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(`\uFEFF${FULL_HEADER}`);
    expect(lines[1]).toBe('Joao Silva,Joao,+5511999999999,X,,,,X,Maria Santos,Bispo');
  });

  it('handles null phone and missing responsible', () => {
    const members: CsvExportMember[] = [
      { full_name: 'Joao Silva', informal_name: 'Joao', country_code: '+55', phone: null },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Joao Silva,Joao,,,,,,,,');
  });

  it('escapes names and responsible with commas', () => {
    const members: CsvExportMember[] = [
      {
        full_name: 'Silva, Joao',
        informal_name: 'Joao',
        country_code: '+55',
        phone: '11999999999',
        responsible_name: 'Santos, Maria',
      },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Silva, Joao",Joao,+5511999999999,,,,,,"Santos, Maria",');
  });

  it('uses provided (localized) headers', () => {
    const csv = generateCsv([], {
      ...CSV_DEFAULT_HEADERS,
      name: 'Name',
      responsible: 'Responsible',
      calling: 'Calling',
    });
    const header = csv.replace('\uFEFF', '').split('\n')[0];
    expect(header).toBe('Name,Nome Informal,Telefone Completo,Preside,Conduz,Rege,Piano,Reconhecer,Responsible,Calling');
  });
});

describe('CSV full-dump round-trip', () => {
  it('export → parse preserves identity, capabilities, and responsible name', () => {
    const members: CsvExportMember[] = [
      {
        full_name: 'Joao Silva',
        informal_name: 'Joao',
        country_code: '+55',
        phone: '11999999999',
        can_preside: true,
        can_conduct: false,
        can_lead_music: true,
        can_play_piano: false,
        can_be_recognized: true,
        responsible_name: '',
        calling: 'Bispo',
      },
      {
        full_name: 'Maria Santos',
        informal_name: 'Maria',
        country_code: '+55',
        phone: '21888888888',
        can_preside: false,
        can_conduct: true,
        can_lead_music: false,
        can_play_piano: true,
        can_be_recognized: false,
        responsible_name: 'Joao Silva',
        calling: '',
      },
    ];
    const csv = generateCsv(members);
    const parsed = parseCsv(csv);
    expect(parsed.success).toBe(true);
    expect(parsed.members).toHaveLength(2);

    expect(parsed.members[0]).toEqual({
      full_name: 'Joao Silva',
      informal_name: 'Joao',
      phone: '+5511999999999',
      can_preside: true,
      can_conduct: false,
      can_lead_music: true,
      can_play_piano: false,
      can_be_recognized: true,
      responsible_name: '',
      calling: 'Bispo',
    });
    expect(parsed.members[1]).toEqual({
      full_name: 'Maria Santos',
      informal_name: 'Maria',
      phone: '+5521888888888',
      can_preside: false,
      can_conduct: true,
      can_lead_music: false,
      can_play_piano: true,
      can_be_recognized: false,
      responsible_name: 'Joao Silva',
      calling: '',
    });
  });

  it('round-trips a calling with a comma (quoted)', () => {
    const members: CsvExportMember[] = [
      {
        full_name: 'Ricardo Almeida',
        informal_name: 'Ricardo',
        country_code: '+55',
        phone: '11999999999',
        can_be_recognized: true,
        responsible_name: '',
        calling: 'Bispo, Ala Central',
      },
    ];
    const csv = generateCsv(members);
    const parsed = parseCsv(csv);
    expect(parsed.success).toBe(true);
    expect(parsed.members[0].calling).toBe('Bispo, Ala Central');
  });

  // I9: round-trip guarantee — a representative set incl. delegated (no phone, responsible set),
  // a calling, an accented name, and a name containing a comma and a quote.
  it('round-trips a representative set (delegated, calling, accents, comma+quote name)', () => {
    const members: CsvExportMember[] = [
      {
        full_name: 'Conceição D\'Ávila, Jr.',
        informal_name: 'Conceição',
        country_code: '+55',
        phone: '11988887777',
        can_preside: true,
        can_conduct: true,
        can_lead_music: false,
        can_play_piano: false,
        can_be_recognized: true,
        responsible_name: '',
        calling: 'Bispo',
      },
      {
        // delegated member: no phone, references the accented/comma/quote member as responsible
        full_name: 'João Pé de Feijão',
        informal_name: 'João',
        country_code: '+55',
        phone: null,
        can_preside: false,
        can_conduct: false,
        can_lead_music: false,
        can_play_piano: false,
        can_be_recognized: false,
        responsible_name: 'Conceição D\'Ávila, Jr.',
        calling: '',
      },
    ];
    const parsed = parseCsv(generateCsv(members));
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parsed.members).toHaveLength(2);
    expect(parsed.members[0].full_name).toBe('Conceição D\'Ávila, Jr.');
    expect(parsed.members[1].phone).toBe('');
    expect(parsed.members[1].responsible_name).toBe('Conceição D\'Ávila, Jr.');
  });
});

describe('parseCsv strict validation', () => {
  const row = (
    name: string,
    informal = 'x',
    phone = '',
    b3 = '',
    b4 = '',
    b5 = '',
    b6 = '',
    b7 = '',
    responsible = '',
    calling = ''
  ) => `${name},${informal},${phone},${b3},${b4},${b5},${b6},${b7},${responsible},${calling}`;

  it('rejects an unrecognized boolean token (INVALID_BOOL with column + value)', () => {
    const csv = `${FULL_HEADER}\n${row('Ana', 'Ana', '', 'maybe')}`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    const err = result.errors.find((e) => e.code === 'INVALID_BOOL');
    expect(err).toBeDefined();
    expect(err?.column).toBe('Preside');
    expect(err?.value).toBe('maybe');
    expect(err?.line).toBe(2);
  });

  it('accepts x/sim/yes/si and empty as boolean tokens (accent/case-insensitive)', () => {
    const csv = `${FULL_HEADER}\n${row('Ana', 'Ana', '', 'sim', '', 'X', 'yes', 'Sí')}`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    const m = result.members[0];
    expect([m.can_preside, m.can_conduct, m.can_lead_music, m.can_play_piano, m.can_be_recognized])
      .toEqual([true, false, true, true, true]);
  });

  it('rejects Responsável that matches no Nome (RESPONSIBLE_NOT_FOUND)', () => {
    const csv = `${FULL_HEADER}\n${row('Ana', 'Ana', '', '', '', '', '', '', 'Ninguém')}`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    const err = result.errors.find((e) => e.code === 'RESPONSIBLE_NOT_FOUND');
    expect(err).toBeDefined();
    expect(err?.column).toBe('Responsável');
    expect(err?.value).toBe('Ninguém');
  });

  it('resolves Responsável case- and accent-insensitively', () => {
    const csv = `${FULL_HEADER}\n${row('José Álvaro', 'Jose')}\n${row('Ana', 'Ana', '', '', '', '', '', '', 'jose alvaro')}`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
  });

  it('allows duplicate Nomes (round-trip guarantee) and ambiguous Responsável resolves without error', () => {
    const csv = `${FULL_HEADER}\n${row('João Silva', 'J1')}\n${row('João Silva', 'J2')}\n${row('Ana', 'Ana', '', '', '', '', '', '', 'João Silva')}`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(3);
  });

  it('collects ALL errors instead of stopping at the first', () => {
    const csv =
      `${FULL_HEADER}` +
      `\n${row('', 'x')}` + // NAME_REQUIRED (line 2)
      `\n${row('Bob', 'Bob', 'abc')}` + // INVALID_PHONE (line 3)
      `\n${row('Cid', 'Cid', '', 'nope')}`; // INVALID_BOOL (line 4)
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('NAME_REQUIRED');
    expect(codes).toContain('INVALID_PHONE');
    expect(codes).toContain('INVALID_BOOL');
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('example members (localized)', () => {
  const LANGS = ['pt-BR', 'en-US', 'es-LA'] as const;

  it('getExampleMembers falls back to pt-BR for unknown languages', () => {
    expect(getExampleMembers('xx-YY')).toEqual(EXAMPLE_MEMBERS_BY_LANG['pt-BR']);
    expect(getExampleMembers(undefined)).toEqual(EXAMPLE_MEMBERS_BY_LANG['pt-BR']);
  });

  it('en-US uses +1 and English names; es-LA uses +52 (Mexico) and Spanish names', () => {
    expect(getExampleMembers('en-US').every((m) => m.country_code === '+1')).toBe(true);
    expect(getExampleMembers('en-US')[0].full_name).toContain('Example');
    expect(getExampleMembers('es-LA').every((m) => m.country_code === '+52')).toBe(true);
    expect(getExampleMembers('es-LA')[0].full_name).toContain('Ejemplo');
  });

  for (const lang of LANGS) {
    it(`${lang}: >=2 rows, one references the other, and round-trips (X2)`, () => {
      const examples = getExampleMembers(lang);
      expect(examples.length).toBeGreaterThanOrEqual(2);
      const names = examples.map((m) => m.full_name);
      const delegated = examples.find((m) => m.responsible_name);
      expect(delegated).toBeDefined();
      expect(names).toContain(delegated?.responsible_name);

      const parsed = parseCsv(generateCsv(examples));
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toEqual([]);
      expect(parsed.members).toHaveLength(examples.length);
    });
  }
});

describe('splitPhoneNumber', () => {
  it('splits Brazilian phone numbers', () => {
    const result = splitPhoneNumber('+5511999999999');
    expect(result).toEqual({ countryCode: '+55', phone: '11999999999' });
  });

  it('splits US phone numbers', () => {
    const result = splitPhoneNumber('+12025551234');
    expect(result).toEqual({ countryCode: '+1', phone: '2025551234' });
  });

  it('splits 3-digit country code', () => {
    const result = splitPhoneNumber('+591123456789');
    expect(result).toEqual({ countryCode: '+591', phone: '123456789' });
  });

  it('handles empty phone', () => {
    const result = splitPhoneNumber('');
    expect(result).toEqual({ countryCode: '+55', phone: '' });
  });

  it('handles phone without + prefix', () => {
    const result = splitPhoneNumber('5511999999999');
    expect(result).toEqual({ countryCode: '+55', phone: '5511999999999' });
  });
});

describe('CSV formula-injection guard (P2)', () => {
  const member = (over: Partial<CsvExportMember>): CsvExportMember => ({
    full_name: 'Ok Person', informal_name: '', country_code: '+55', phone: null,
    can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
    can_be_recognized: false, responsible_name: '', calling: '', ...over,
  });

  it('prefixes a formula-leading field with a single quote on export', () => {
    const csv = generateCsv([member({ full_name: '=HYPERLINK("http://evil")', calling: '@cmd' })]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'@cmd");
  });

  it('guards every dangerous leading char (= + - @) and round-trips them', () => {
    for (const lead of ['=', '+', '-', '@']) {
      const result = parseCsv(generateCsv([member({ full_name: `${lead}danger` })]));
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe(`${lead}danger`);
    }
  });

  it('round-trips a guarded value back to its original text on import', () => {
    const original = member({ full_name: '=SUM(A1)', calling: '-danger' });
    const result = parseCsv(generateCsv([original]));
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('=SUM(A1)');
    expect(result.members[0].calling).toBe('-danger');
  });

  it('leaves a legitimate leading apostrophe untouched', () => {
    const result = parseCsv(generateCsv([member({ full_name: "O'Brien" })]));
    expect(result.members[0].full_name).toBe("O'Brien");
  });
});

describe('CSV multi-line round-trip (P2)', () => {
  it('re-imports a value that contains an embedded newline', () => {
    const original: CsvExportMember = {
      full_name: 'Multi Line', informal_name: 'Multi', country_code: '+55', phone: '11999990000',
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
      can_be_recognized: false, responsible_name: '', calling: 'Line one\nLine two',
    };
    const result = parseCsv(generateCsv([original]));
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].calling).toBe('Line one\nLine two');
  });

  it('does NOT split a field on a bare carriage return (no spurious rows)', () => {
    const original: CsvExportMember = {
      full_name: 'Solo Member', informal_name: 'Solo', country_code: '+55', phone: '11999990000',
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
      can_be_recognized: false, responsible_name: '', calling: 'A\rB',
    };
    const result = parseCsv(generateCsv([original]));
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].full_name).toBe('Solo Member');
    expect(result.members[0].calling).toBe('A\rB');
  });
});
