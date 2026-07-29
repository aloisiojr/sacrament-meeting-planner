import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  generateCsv,
  parseCsvBool,
  splitPhoneNumber,
  CSV_DEFAULT_HEADERS,
  type CsvExportMember,
} from '../lib/csvUtils';

const FULL_HEADER = 'Nome,Nome Informal,Telefone Completo,Preside,Conduz,Rege,Piano,Reconhecer,Responsável,Chamado';

describe('parseCsv', () => {
  it('parses a valid full-dump CSV with capabilities and responsible', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,true,false,false,false,true,Maria Santos,Bispo\nMaria Santos,Maria,+5521888888888,false,true,false,false,false,,`;
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

  it('parses legacy 3-column CSV, defaulting capabilities to false and responsible to empty', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999';
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

  it('rejects 2-column CSV (requires 3 columns)', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_HEADER');
  });

  it('handles UTF-8 BOM prefix', () => {
    const csv = `\uFEFF${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,true,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].full_name).toBe('Joao Silva');
    expect(result.members[0].can_preside).toBe(true);
  });

  it('handles empty phone numbers', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,,false,false,false,false,false,`;
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
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,11999999999,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].phone).toBe('11999999999');
  });

  it('rejects rows without name', () => {
    const csv = `${FULL_HEADER}\n,,+5511999999999,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('Nome');
  });

  it('handles quoted fields with commas (name and responsible)', () => {
    const csv = `${FULL_HEADER}\n"Silva, Joao",Joao,+5511999999999,false,false,false,false,false,"Santos, Maria"`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Silva, Joao');
    expect(result.members[0].responsible_name).toBe('Santos, Maria');
  });

  it('skips empty lines', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,false,false,false,false,false,\n\nMaria Santos,Maria,+5521888888888,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
  });

  it('handles Windows-style line endings', () => {
    const csv = `${FULL_HEADER}\r\nJoao Silva,Joao,+5511999999999,true,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].can_preside).toBe(true);
  });

  it('defaults informal name to first word of full name when empty', () => {
    const csv = `${FULL_HEADER}\nJoao Carlos Silva,,+5511999999999,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].informal_name).toBe('Joao');
  });

  it('rejects row with only 2 columns (INSUFFICIENT_COLUMNS)', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INSUFFICIENT_COLUMNS');
    expect(result.errors[0].line).toBe(2);
  });

  it('sanitizes phone with invalid characters to empty string', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,(11) 99999-9999,false,false,false,false,false,`;
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].phone).toBe('');
  });

  it('parses all five capability flags independently', () => {
    const csv = `${FULL_HEADER}\nJoao Silva,Joao,+5511999999999,true,true,true,true,true,`;
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
  it('treats common truthy strings as true (case-insensitive, trimmed)', () => {
    for (const v of ['true', 'TRUE', '1', 'sim', 'SIM', ' yes ', 'x', 'verdadeiro']) {
      expect(parseCsvBool(v)).toBe(true);
    }
  });

  it('treats everything else as false', () => {
    for (const v of ['false', '0', 'no', 'não', '', undefined]) {
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
    expect(lines[1]).toBe('Joao Silva,Joao,+5511999999999,true,false,false,false,true,Maria Santos,Bispo');
  });

  it('handles null phone and missing responsible', () => {
    const members: CsvExportMember[] = [
      { full_name: 'Joao Silva', informal_name: 'Joao', country_code: '+55', phone: null },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Joao Silva,Joao,,false,false,false,false,false,,');
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
    expect(lines[1]).toBe('"Silva, Joao",Joao,+5511999999999,false,false,false,false,false,"Santos, Maria",');
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
