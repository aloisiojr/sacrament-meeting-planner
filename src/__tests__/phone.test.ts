import { buildFullPhone } from '../lib/phone';

describe('buildFullPhone', () => {
  it('prepends the country code to a national number', () => {
    expect(buildFullPhone('+55', '11999998888')).toBe('+5511999998888');
  });
  it('normalizes a country code missing the +', () => {
    expect(buildFullPhone('55', '11999998888')).toBe('+5511999998888');
  });
  it('returns a phone that already carries a country code as-is', () => {
    expect(buildFullPhone('+55', '+15551234567')).toBe('+15551234567');
  });
  it('strips spaces, dashes and parentheses', () => {
    expect(buildFullPhone('+55', '(11) 99999-8888')).toBe('+5511999998888');
  });
  it('returns just the phone when no country code', () => {
    expect(buildFullPhone(null, '11999998888')).toBe('11999998888');
  });
  it('returns null when there is no phone', () => {
    expect(buildFullPhone('+55', null)).toBeNull();
    expect(buildFullPhone('+55', '')).toBeNull();
  });
});
