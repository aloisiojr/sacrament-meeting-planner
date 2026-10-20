import { MAX_PDF_BYTES, decodedBase64Bytes, isBase64TooLarge } from '../lib/pdfExtraction';

describe('pdfExtraction limits (RAP-01)', () => {
  it('estimates decoded bytes accounting for padding', () => {
    expect(decodedBase64Bytes('')).toBe(0);
    expect(decodedBase64Bytes('QUJD')).toBe(3); // "ABC"
    expect(decodedBase64Bytes('QUI=')).toBe(2);
    expect(decodedBase64Bytes('QQ==')).toBe(1);
  });

  it('flags base64 above the 10 MB ceiling and accepts at/below it', () => {
    const atCeiling = 'A'.repeat(Math.ceil((MAX_PDF_BYTES / 3) * 4));
    expect(isBase64TooLarge('QUJD')).toBe(false);
    expect(decodedBase64Bytes(atCeiling)).toBeLessThanOrEqual(MAX_PDF_BYTES + 3);
    expect(isBase64TooLarge('A'.repeat(14_000_004))).toBe(true);
  });
});
