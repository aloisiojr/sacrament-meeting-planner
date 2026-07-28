/**
 * Build a full international phone number from a member's `country_code` + `phone`.
 * Tolerant of legacy values: if `phone` already starts with '+', it's assumed to already carry the
 * country code and is returned as-is (normalized). Returns null when there is no phone.
 *
 * Fixes the WhatsApp bug where `speaker_phone` snapshots stored `member.phone` WITHOUT the country
 * code, then the wa.me link was built with countryCode='' → an incomplete number.
 */
export function buildFullPhone(
  countryCode: string | null | undefined,
  phone: string | null | undefined
): string | null {
  const rawPhone = (phone ?? '').replace(/[\s\-()]/g, '');
  if (!rawPhone) return null;
  if (rawPhone.startsWith('+')) return rawPhone; // already international
  const cc = (countryCode ?? '').replace(/[\s\-()]/g, '');
  if (!cc) return rawPhone;
  const ccNorm = cc.startsWith('+') ? cc : `+${cc}`;
  return `${ccNorm}${rawPhone}`;
}
