import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  generateCsv,
  splitPhoneNumber,
} from '../lib/csvUtils';

describe('parseCsv', () => {
  it('parses a valid CSV with header and data', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999\nMaria Santos,+5521888888888';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toEqual({ full_name: 'Joao Silva', phone: '+5511999999999' });
    expect(result.members[1]).toEqual({ full_name: 'Maria Santos', phone: '+5521888888888' });
  });

  it('handles empty phone numbers', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0]).toEqual({ full_name: 'Joao Silva', phone: '' });
  });

  it('rejects empty CSV', () => {
    const result = parseCsv('');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects CSV with only header', () => {
    const csv = 'Nome,Telefone Completo';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,11999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('Telefone Completo');
  });

  it('rejects duplicate phone numbers', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999\nMaria Santos,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Duplicate');
  });

  it('rejects rows without name', () => {
    const csv = 'Nome,Telefone Completo\n,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('Nome');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Nome,Telefone Completo\n"Silva, Joao",+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Silva, Joao');
  });

  it('skips empty lines', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,+5511999999999\n\nMaria Santos,+5521888888888';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
  });

  it('handles Windows-style line endings', () => {
    const csv = 'Nome,Telefone Completo\r\nJoao Silva,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
  });
});

describe('generateCsv', () => {
  it('generates CSV with header and data rows', () => {
    const members = [
      { full_name: 'Joao Silva', country_code: '+55', phone: '11999999999' },
      { full_name: 'Maria Santos', country_code: '+55', phone: '21888888888' },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Nome,Telefone Completo');
    expect(lines[1]).toBe('Joao Silva,+5511999999999');
    expect(lines[2]).toBe('Maria Santos,+5521888888888');
  });

  it('handles null phone', () => {
    const members = [
      { full_name: 'Joao Silva', country_code: '+55', phone: null },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Joao Silva,');
  });

  it('escapes names with commas', () => {
    const members = [
      { full_name: 'Silva, Joao', country_code: '+55', phone: '11999999999' },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Silva, Joao",+5511999999999');
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
