/**
 * S3 tests — phone repair (Rules 2+3, AC5/AC6/AC16) + ward-code pre-fill guess.
 */
import { repairPhones, normalizeLcrPhone } from '../lib/lcrPhoneRepair';
import { guessWardCodes } from '../lib/wardPhoneCodes';
import type { LcrRecord } from '../lib/lcrPdfParser';
import type { Member } from '../types/database';

const rec = (name: string, age: number, rawPhone: string | null): LcrRecord => ({ name, age, rawPhone });

describe('normalizeLcrPhone (Rule 3)', () => {
  it('prefixes country when the number already has an area/DDD (10–11 digits)', () => {
    expect(normalizeLcrPhone('(11) 90000-0011', '55', '11')).toBe('+5511900000011');
  });
  it('prefixes country + area for a local number (8–9 digits)', () => {
    expect(normalizeLcrPhone('90000-0010', '55', '11')).toBe('+5511900000010'); // 9-digit local
    expect(normalizeLcrPhone('65331034', '55', '11')).toBe('+551165331034'); // 8-digit local
  });
  it('keeps an already-international number', () => {
    expect(normalizeLcrPhone('5511999998888', '55', '11')).toBe('+5511999998888');
  });
  it('works for other countries via the provided codes (US +1)', () => {
    expect(normalizeLcrPhone('(801) 859-5405', '1', '801')).toBe('+18018595405');
  });
  it('treats an 11-digit national mobile whose DDD equals the country code as national (BR +55, DDD 55)', () => {
    // "(55) 90000-0022" → "55987654321"; must NOT be read as already-international (would drop the DDD).
    expect(normalizeLcrPhone('(55) 90000-0022', '55', '55')).toBe('+5555900000022');
  });
  it('accepts already-international numbers for 8–9-digit-national countries (no country-code doubling)', () => {
    expect(normalizeLcrPhone('34612345678', '34', '')).toBe('+34612345678'); // Spain (9-digit national)
    expect(normalizeLcrPhone('51987654321', '51', '')).toBe('+51987654321'); // Peru
    expect(normalizeLcrPhone('56987654321', '56', '')).toBe('+56987654321'); // Chile
    expect(normalizeLcrPhone('59812345678', '598', '')).toBe('+59812345678'); // Uruguay (8-digit)
    expect(normalizeLcrPhone('351912345678', '351', '')).toBe('+351912345678'); // Portugal
  });
  it('completes a national-only number for a 9-digit-national country via the country code', () => {
    expect(normalizeLcrPhone('612345678', '34', '')).toBe('+34612345678'); // Spain national → +34…
  });
  it('returns null for garbage / out-of-range (never invents digits)', () => {
    expect(normalizeLcrPhone('8600000000000000', '55', '11')).toBeNull(); // 16 digits
    expect(normalizeLcrPhone('129915075245', '55', '11')).toBeNull(); // 12, not intl
    expect(normalizeLcrPhone('123', '55', '11')).toBeNull(); // too short
  });
  it('returns null for a local number when no area code is available', () => {
    expect(normalizeLcrPhone('900000010', '55', '')).toBeNull();
  });
});

describe('repairPhones (Rules 2+3)', () => {
  it('blanks the phone for members under 12 but keeps them (Rule 2)', () => {
    const out = repairPhones([rec('Kid, Alfa', 8, '(11) 90000-0011')], { countryCode: '+55', areaCode: '11' });
    expect(out.resolved[0]).toEqual({ name: 'Kid, Alfa', age: 8, phone: null });
    expect(out.unrepaired).toHaveLength(0); // minor blanking is not an "unrepaired" failure
  });
  it('uses the provided ward codes as authoritative', () => {
    const out = repairPhones(
      [rec('A', 40, '90000-0010'), rec('B', 30, '(11) 90000-0011')],
      { countryCode: '+55', areaCode: '11' }
    );
    expect(out.resolved.map((r) => r.phone)).toEqual(['+5511900000010', '+5511900000011']);
  });
  it('lists a name in "unrepaired" when its printed phone cannot be completed', () => {
    const out = repairPhones([rec('Garbled, X', 50, '8600000000000000')], { countryCode: '+55', areaCode: '11' });
    expect(out.resolved[0].phone).toBeNull();
    expect(out.unrepaired).toContain('Garbled, X');
  });
  it('does not list members who simply had no phone', () => {
    const out = repairPhones([rec('NoPhone, Y', 50, null)], { countryCode: '+55', areaCode: '11' });
    expect(out.resolved[0].phone).toBeNull();
    expect(out.unrepaired).toHaveLength(0);
  });
  it('deduces the area code from the batch when none is provided', () => {
    const out = repairPhones(
      [
        rec('HasDDD1', 30, '11900000011'), // area 11 (11 digits)
        rec('HasDDD2', 30, '11955551234'), // area 11
        rec('Local', 30, '900000010'), // 9-digit local → should get deduced "11"
      ],
      { countryCode: '+55' } // no areaCode
    );
    expect(out.resolved[2].phone).toBe('+5511900000010');
  });
});

describe('guessWardCodes (AC16 pre-fill)', () => {
  const member = (over: Partial<Member>): Member =>
    ({ id: 'x', ward_id: 'w', full_name: 'N', informal_name: null, country_code: null, phone: null,
       can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
       can_be_recognized: false, contact_via_responsible: false, responsible_id: null, calling: null,
       created_at: '', updated_at: '', ...over } as Member);

  it('derives country + area from existing members', () => {
    const members = [
      member({ country_code: '+55', phone: '11900000011' }),
      member({ country_code: '+55', phone: '11955551234' }),
    ];
    expect(guessWardCodes(members, 'America/Sao_Paulo')).toEqual({ countryCode: '+55', areaCode: '11' });
  });
  it('falls back to the timezone calling code for a ward with no members', () => {
    expect(guessWardCodes([], 'America/New_York')).toEqual({ countryCode: '+1', areaCode: '' });
  });
  it('defaults to +55 when timezone is unknown and there are no members', () => {
    expect(guessWardCodes([], 'Pacific/Kiritimati')).toEqual({ countryCode: '+55', areaCode: '' });
    expect(guessWardCodes([], null)).toEqual({ countryCode: '+55', areaCode: '' });
  });
});
