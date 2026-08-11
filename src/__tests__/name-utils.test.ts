/**
 * Pure name helpers behind "the informal name follows the first name"
 * (specs/person-editor-informal-name-autofill.md).
 */
import { getFirstName, isSameName } from '../lib/nameUtils';

describe('getFirstName', () => {
  it('takes the first whitespace-separated token', () => {
    expect(getFirstName('João Silva')).toBe('João');
    expect(getFirstName('João')).toBe('João');
    expect(getFirstName('Maria da Silva Souza')).toBe('Maria');
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(getFirstName('   João   Silva  ')).toBe('João');
    expect(getFirstName('João\tSilva')).toBe('João');
  });

  it('returns an empty string for a blank name', () => {
    expect(getFirstName('')).toBe('');
    expect(getFirstName('    ')).toBe('');
  });
});

describe('isSameName', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(isSameName('João', 'joao')).toBe(true);
    expect(isSameName('JOÃO', 'joão')).toBe(true);
    expect(isSameName(' joão ', 'João')).toBe(true);
    expect(isSameName('José', 'Jose')).toBe(true);
  });

  it('tells different names apart', () => {
    expect(isSameName('João', 'Joãozinho')).toBe(false);
    expect(isSameName('João', 'Pedro')).toBe(false);
  });

  it('never matches when either side is blank', () => {
    // Blank is "no informal name yet", which the editor handles separately from "matches the
    // previous first name" — conflating them would make an empty field look customized.
    expect(isSameName('', '')).toBe(false);
    expect(isSameName('', 'João')).toBe(false);
    expect(isSameName('João', '   ')).toBe(false);
  });
});
