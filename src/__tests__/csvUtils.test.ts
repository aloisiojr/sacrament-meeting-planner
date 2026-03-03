import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  generateCsv,
  splitPhoneNumber,
} from '../lib/csvUtils';

describe('parseCsv', () => {
  it('parses a valid 3-column CSV with header and data', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999\nMaria Santos,Maria,+5521888888888';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toEqual({ full_name: 'Joao Silva', informal_name: 'Joao', phone: '+5511999999999' });
    expect(result.members[1]).toEqual({ full_name: 'Maria Santos', informal_name: 'Maria', phone: '+5521888888888' });
  });

  it('rejects 2-column CSV (requires 3 columns)', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_HEADER');
  });

  it('handles UTF-8 BOM prefix', () => {
    const csv = '\uFEFFNome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].full_name).toBe('Joao Silva');
  });

  it('handles empty phone numbers', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0]).toEqual({ full_name: 'Joao Silva', informal_name: 'Joao', phone: '' });
  });

  it('rejects empty CSV', () => {
    const result = parseCsv('');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects CSV with only header', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
  });

  it('accepts phone without + prefix', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,11999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].phone).toBe('11999999999');
  });

  it('accepts duplicate phone numbers', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999\nMaria Santos,Maria,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
  });

  it('rejects rows without name', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\n,,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('Nome');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\n"Silva, Joao",Joao,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Silva, Joao');
  });

  it('skips empty lines', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Silva,Joao,+5511999999999\n\nMaria Santos,Maria,+5521888888888';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
  });

  it('handles Windows-style line endings', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\r\nJoao Silva,Joao,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
  });

  it('defaults informal name to first word of full name when empty', () => {
    const csv = 'Nome,Nome Informal,Telefone Completo\nJoao Carlos Silva,,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].informal_name).toBe('Joao');
  });
});

describe('generateCsv', () => {
  it('generates CSV with BOM, header, and data rows', () => {
    const members = [
      { full_name: 'Joao Silva', informal_name: 'Joao', country_code: '+55', phone: '11999999999' },
      { full_name: 'Maria Santos', informal_name: 'Maria', country_code: '+55', phone: '21888888888' },
    ];
    const csv = generateCsv(members);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('\uFEFFNome,Nome Informal,Telefone Completo');
    expect(lines[1]).toBe('Joao Silva,Joao,+5511999999999');
    expect(lines[2]).toBe('Maria Santos,Maria,+5521888888888');
  });

  it('handles null phone', () => {
    const members = [
      { full_name: 'Joao Silva', informal_name: 'Joao', country_code: '+55', phone: null },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Joao Silva,Joao,');
  });

  it('escapes names with commas', () => {
    const members = [
      { full_name: 'Silva, Joao', informal_name: 'Joao', country_code: '+55', phone: '11999999999' },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Silva, Joao",Joao,+5511999999999');
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
