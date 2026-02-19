/**
 * Country codes: single source of truth for phone country codes, flags, and splitting.
 * Brazil (+55) listed first, then alphabetical by country name.
 */

export interface CountryCode {
  code: string;
  flag: string;
  label: string;
}

/**
 * ~200 country codes. Brazil first, then alphabetical by English country name.
 * Each entry: dial code, Regional Indicator Symbol flag emoji, "Country (code)" label.
 */
export const COUNTRY_CODES: CountryCode[] = [
  // Brazil first (default)
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', label: 'Brazil (+55)' },
  // Alphabetical by country name
  { code: '+93', flag: '\u{1F1E6}\u{1F1EB}', label: 'Afghanistan (+93)' },
  { code: '+355', flag: '\u{1F1E6}\u{1F1F1}', label: 'Albania (+355)' },
  { code: '+213', flag: '\u{1F1E9}\u{1F1FF}', label: 'Algeria (+213)' },
  { code: '+376', flag: '\u{1F1E6}\u{1F1E9}', label: 'Andorra (+376)' },
  { code: '+244', flag: '\u{1F1E6}\u{1F1F4}', label: 'Angola (+244)' },
  { code: '+54', flag: '\u{1F1E6}\u{1F1F7}', label: 'Argentina (+54)' },
  { code: '+374', flag: '\u{1F1E6}\u{1F1F2}', label: 'Armenia (+374)' },
  { code: '+61', flag: '\u{1F1E6}\u{1F1FA}', label: 'Australia (+61)' },
  { code: '+43', flag: '\u{1F1E6}\u{1F1F9}', label: 'Austria (+43)' },
  { code: '+994', flag: '\u{1F1E6}\u{1F1FF}', label: 'Azerbaijan (+994)' },
  { code: '+973', flag: '\u{1F1E7}\u{1F1ED}', label: 'Bahrain (+973)' },
  { code: '+880', flag: '\u{1F1E7}\u{1F1E9}', label: 'Bangladesh (+880)' },
  { code: '+375', flag: '\u{1F1E7}\u{1F1FE}', label: 'Belarus (+375)' },
  { code: '+32', flag: '\u{1F1E7}\u{1F1EA}', label: 'Belgium (+32)' },
  { code: '+501', flag: '\u{1F1E7}\u{1F1FF}', label: 'Belize (+501)' },
  { code: '+229', flag: '\u{1F1E7}\u{1F1EF}', label: 'Benin (+229)' },
  { code: '+975', flag: '\u{1F1E7}\u{1F1F9}', label: 'Bhutan (+975)' },
  { code: '+591', flag: '\u{1F1E7}\u{1F1F4}', label: 'Bolivia (+591)' },
  { code: '+387', flag: '\u{1F1E7}\u{1F1E6}', label: 'Bosnia and Herzegovina (+387)' },
  { code: '+267', flag: '\u{1F1E7}\u{1F1FC}', label: 'Botswana (+267)' },
  { code: '+673', flag: '\u{1F1E7}\u{1F1F3}', label: 'Brunei (+673)' },
  { code: '+359', flag: '\u{1F1E7}\u{1F1EC}', label: 'Bulgaria (+359)' },
  { code: '+226', flag: '\u{1F1E7}\u{1F1EB}', label: 'Burkina Faso (+226)' },
  { code: '+257', flag: '\u{1F1E7}\u{1F1EE}', label: 'Burundi (+257)' },
  { code: '+855', flag: '\u{1F1F0}\u{1F1ED}', label: 'Cambodia (+855)' },
  { code: '+237', flag: '\u{1F1E8}\u{1F1F2}', label: 'Cameroon (+237)' },
  // USA before Canada: +1 defaults to US flag (ADR-043)
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', label: 'United States (+1)' },
  { code: '+1', flag: '\u{1F1E8}\u{1F1E6}', label: 'Canada (+1)' },
  { code: '+238', flag: '\u{1F1E8}\u{1F1FB}', label: 'Cape Verde (+238)' },
  { code: '+236', flag: '\u{1F1E8}\u{1F1EB}', label: 'Central African Republic (+236)' },
  { code: '+235', flag: '\u{1F1F9}\u{1F1E9}', label: 'Chad (+235)' },
  { code: '+56', flag: '\u{1F1E8}\u{1F1F1}', label: 'Chile (+56)' },
  { code: '+86', flag: '\u{1F1E8}\u{1F1F3}', label: 'China (+86)' },
  { code: '+57', flag: '\u{1F1E8}\u{1F1F4}', label: 'Colombia (+57)' },
  { code: '+269', flag: '\u{1F1F0}\u{1F1F2}', label: 'Comoros (+269)' },
  { code: '+242', flag: '\u{1F1E8}\u{1F1EC}', label: 'Congo (+242)' },
  { code: '+243', flag: '\u{1F1E8}\u{1F1E9}', label: 'Congo DR (+243)' },
  { code: '+506', flag: '\u{1F1E8}\u{1F1F7}', label: 'Costa Rica (+506)' },
  { code: '+385', flag: '\u{1F1ED}\u{1F1F7}', label: 'Croatia (+385)' },
  { code: '+53', flag: '\u{1F1E8}\u{1F1FA}', label: 'Cuba (+53)' },
  { code: '+357', flag: '\u{1F1E8}\u{1F1FE}', label: 'Cyprus (+357)' },
  { code: '+420', flag: '\u{1F1E8}\u{1F1FF}', label: 'Czech Republic (+420)' },
  { code: '+45', flag: '\u{1F1E9}\u{1F1F0}', label: 'Denmark (+45)' },
  { code: '+253', flag: '\u{1F1E9}\u{1F1EF}', label: 'Djibouti (+253)' },
  { code: '+593', flag: '\u{1F1EA}\u{1F1E8}', label: 'Ecuador (+593)' },
  { code: '+20', flag: '\u{1F1EA}\u{1F1EC}', label: 'Egypt (+20)' },
  { code: '+503', flag: '\u{1F1F8}\u{1F1FB}', label: 'El Salvador (+503)' },
  { code: '+240', flag: '\u{1F1EC}\u{1F1F6}', label: 'Equatorial Guinea (+240)' },
  { code: '+291', flag: '\u{1F1EA}\u{1F1F7}', label: 'Eritrea (+291)' },
  { code: '+372', flag: '\u{1F1EA}\u{1F1EA}', label: 'Estonia (+372)' },
  { code: '+251', flag: '\u{1F1EA}\u{1F1F9}', label: 'Ethiopia (+251)' },
  { code: '+679', flag: '\u{1F1EB}\u{1F1EF}', label: 'Fiji (+679)' },
  { code: '+358', flag: '\u{1F1EB}\u{1F1EE}', label: 'Finland (+358)' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', label: 'France (+33)' },
  { code: '+241', flag: '\u{1F1EC}\u{1F1E6}', label: 'Gabon (+241)' },
  { code: '+220', flag: '\u{1F1EC}\u{1F1F2}', label: 'Gambia (+220)' },
  { code: '+995', flag: '\u{1F1EC}\u{1F1EA}', label: 'Georgia (+995)' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', label: 'Germany (+49)' },
  { code: '+233', flag: '\u{1F1EC}\u{1F1ED}', label: 'Ghana (+233)' },
  { code: '+30', flag: '\u{1F1EC}\u{1F1F7}', label: 'Greece (+30)' },
  { code: '+502', flag: '\u{1F1EC}\u{1F1F9}', label: 'Guatemala (+502)' },
  { code: '+224', flag: '\u{1F1EC}\u{1F1F3}', label: 'Guinea (+224)' },
  { code: '+245', flag: '\u{1F1EC}\u{1F1FC}', label: 'Guinea-Bissau (+245)' },
  { code: '+592', flag: '\u{1F1EC}\u{1F1FE}', label: 'Guyana (+592)' },
  { code: '+509', flag: '\u{1F1ED}\u{1F1F9}', label: 'Haiti (+509)' },
  { code: '+504', flag: '\u{1F1ED}\u{1F1F3}', label: 'Honduras (+504)' },
  { code: '+852', flag: '\u{1F1ED}\u{1F1F0}', label: 'Hong Kong (+852)' },
  { code: '+36', flag: '\u{1F1ED}\u{1F1FA}', label: 'Hungary (+36)' },
  { code: '+354', flag: '\u{1F1EE}\u{1F1F8}', label: 'Iceland (+354)' },
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', label: 'India (+91)' },
  { code: '+62', flag: '\u{1F1EE}\u{1F1E9}', label: 'Indonesia (+62)' },
  { code: '+98', flag: '\u{1F1EE}\u{1F1F7}', label: 'Iran (+98)' },
  { code: '+964', flag: '\u{1F1EE}\u{1F1F6}', label: 'Iraq (+964)' },
  { code: '+353', flag: '\u{1F1EE}\u{1F1EA}', label: 'Ireland (+353)' },
  { code: '+972', flag: '\u{1F1EE}\u{1F1F1}', label: 'Israel (+972)' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', label: 'Italy (+39)' },
  { code: '+225', flag: '\u{1F1E8}\u{1F1EE}', label: 'Ivory Coast (+225)' },
  { code: '+81', flag: '\u{1F1EF}\u{1F1F5}', label: 'Japan (+81)' },
  { code: '+962', flag: '\u{1F1EF}\u{1F1F4}', label: 'Jordan (+962)' },
  { code: '+7', flag: '\u{1F1F0}\u{1F1FF}', label: 'Kazakhstan (+7)' },
  { code: '+254', flag: '\u{1F1F0}\u{1F1EA}', label: 'Kenya (+254)' },
  { code: '+965', flag: '\u{1F1F0}\u{1F1FC}', label: 'Kuwait (+965)' },
  { code: '+996', flag: '\u{1F1F0}\u{1F1EC}', label: 'Kyrgyzstan (+996)' },
  { code: '+856', flag: '\u{1F1F1}\u{1F1E6}', label: 'Laos (+856)' },
  { code: '+371', flag: '\u{1F1F1}\u{1F1FB}', label: 'Latvia (+371)' },
  { code: '+961', flag: '\u{1F1F1}\u{1F1E7}', label: 'Lebanon (+961)' },
  { code: '+266', flag: '\u{1F1F1}\u{1F1F8}', label: 'Lesotho (+266)' },
  { code: '+231', flag: '\u{1F1F1}\u{1F1F7}', label: 'Liberia (+231)' },
  { code: '+218', flag: '\u{1F1F1}\u{1F1FE}', label: 'Libya (+218)' },
  { code: '+423', flag: '\u{1F1F1}\u{1F1EE}', label: 'Liechtenstein (+423)' },
  { code: '+370', flag: '\u{1F1F1}\u{1F1F9}', label: 'Lithuania (+370)' },
  { code: '+352', flag: '\u{1F1F1}\u{1F1FA}', label: 'Luxembourg (+352)' },
  { code: '+853', flag: '\u{1F1F2}\u{1F1F4}', label: 'Macau (+853)' },
  { code: '+261', flag: '\u{1F1F2}\u{1F1EC}', label: 'Madagascar (+261)' },
  { code: '+265', flag: '\u{1F1F2}\u{1F1FC}', label: 'Malawi (+265)' },
  { code: '+60', flag: '\u{1F1F2}\u{1F1FE}', label: 'Malaysia (+60)' },
  { code: '+960', flag: '\u{1F1F2}\u{1F1FB}', label: 'Maldives (+960)' },
  { code: '+223', flag: '\u{1F1F2}\u{1F1F1}', label: 'Mali (+223)' },
  { code: '+356', flag: '\u{1F1F2}\u{1F1F9}', label: 'Malta (+356)' },
  { code: '+222', flag: '\u{1F1F2}\u{1F1F7}', label: 'Mauritania (+222)' },
  { code: '+230', flag: '\u{1F1F2}\u{1F1FA}', label: 'Mauritius (+230)' },
  { code: '+52', flag: '\u{1F1F2}\u{1F1FD}', label: 'Mexico (+52)' },
  { code: '+373', flag: '\u{1F1F2}\u{1F1E9}', label: 'Moldova (+373)' },
  { code: '+377', flag: '\u{1F1F2}\u{1F1E8}', label: 'Monaco (+377)' },
  { code: '+976', flag: '\u{1F1F2}\u{1F1F3}', label: 'Mongolia (+976)' },
  { code: '+382', flag: '\u{1F1F2}\u{1F1EA}', label: 'Montenegro (+382)' },
  { code: '+212', flag: '\u{1F1F2}\u{1F1E6}', label: 'Morocco (+212)' },
  { code: '+258', flag: '\u{1F1F2}\u{1F1FF}', label: 'Mozambique (+258)' },
  { code: '+95', flag: '\u{1F1F2}\u{1F1F2}', label: 'Myanmar (+95)' },
  { code: '+264', flag: '\u{1F1F3}\u{1F1E6}', label: 'Namibia (+264)' },
  { code: '+977', flag: '\u{1F1F3}\u{1F1F5}', label: 'Nepal (+977)' },
  { code: '+31', flag: '\u{1F1F3}\u{1F1F1}', label: 'Netherlands (+31)' },
  { code: '+64', flag: '\u{1F1F3}\u{1F1FF}', label: 'New Zealand (+64)' },
  { code: '+505', flag: '\u{1F1F3}\u{1F1EE}', label: 'Nicaragua (+505)' },
  { code: '+227', flag: '\u{1F1F3}\u{1F1EA}', label: 'Niger (+227)' },
  { code: '+234', flag: '\u{1F1F3}\u{1F1EC}', label: 'Nigeria (+234)' },
  { code: '+850', flag: '\u{1F1F0}\u{1F1F5}', label: 'North Korea (+850)' },
  { code: '+389', flag: '\u{1F1F2}\u{1F1F0}', label: 'North Macedonia (+389)' },
  { code: '+47', flag: '\u{1F1F3}\u{1F1F4}', label: 'Norway (+47)' },
  { code: '+968', flag: '\u{1F1F4}\u{1F1F2}', label: 'Oman (+968)' },
  { code: '+92', flag: '\u{1F1F5}\u{1F1F0}', label: 'Pakistan (+92)' },
  { code: '+507', flag: '\u{1F1F5}\u{1F1E6}', label: 'Panama (+507)' },
  { code: '+675', flag: '\u{1F1F5}\u{1F1EC}', label: 'Papua New Guinea (+675)' },
  { code: '+595', flag: '\u{1F1F5}\u{1F1FE}', label: 'Paraguay (+595)' },
  { code: '+51', flag: '\u{1F1F5}\u{1F1EA}', label: 'Peru (+51)' },
  { code: '+63', flag: '\u{1F1F5}\u{1F1ED}', label: 'Philippines (+63)' },
  { code: '+48', flag: '\u{1F1F5}\u{1F1F1}', label: 'Poland (+48)' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', label: 'Portugal (+351)' },
  { code: '+974', flag: '\u{1F1F6}\u{1F1E6}', label: 'Qatar (+974)' },
  { code: '+40', flag: '\u{1F1F7}\u{1F1F4}', label: 'Romania (+40)' },
  { code: '+7', flag: '\u{1F1F7}\u{1F1FA}', label: 'Russia (+7)' },
  { code: '+250', flag: '\u{1F1F7}\u{1F1FC}', label: 'Rwanda (+250)' },
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', label: 'Saudi Arabia (+966)' },
  { code: '+221', flag: '\u{1F1F8}\u{1F1F3}', label: 'Senegal (+221)' },
  { code: '+381', flag: '\u{1F1F7}\u{1F1F8}', label: 'Serbia (+381)' },
  { code: '+232', flag: '\u{1F1F8}\u{1F1F1}', label: 'Sierra Leone (+232)' },
  { code: '+65', flag: '\u{1F1F8}\u{1F1EC}', label: 'Singapore (+65)' },
  { code: '+421', flag: '\u{1F1F8}\u{1F1F0}', label: 'Slovakia (+421)' },
  { code: '+386', flag: '\u{1F1F8}\u{1F1EE}', label: 'Slovenia (+386)' },
  { code: '+252', flag: '\u{1F1F8}\u{1F1F4}', label: 'Somalia (+252)' },
  { code: '+27', flag: '\u{1F1FF}\u{1F1E6}', label: 'South Africa (+27)' },
  { code: '+82', flag: '\u{1F1F0}\u{1F1F7}', label: 'South Korea (+82)' },
  { code: '+211', flag: '\u{1F1F8}\u{1F1F8}', label: 'South Sudan (+211)' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', label: 'Spain (+34)' },
  { code: '+94', flag: '\u{1F1F1}\u{1F1F0}', label: 'Sri Lanka (+94)' },
  { code: '+249', flag: '\u{1F1F8}\u{1F1E9}', label: 'Sudan (+249)' },
  { code: '+597', flag: '\u{1F1F8}\u{1F1F7}', label: 'Suriname (+597)' },
  { code: '+46', flag: '\u{1F1F8}\u{1F1EA}', label: 'Sweden (+46)' },
  { code: '+41', flag: '\u{1F1E8}\u{1F1ED}', label: 'Switzerland (+41)' },
  { code: '+963', flag: '\u{1F1F8}\u{1F1FE}', label: 'Syria (+963)' },
  { code: '+886', flag: '\u{1F1F9}\u{1F1FC}', label: 'Taiwan (+886)' },
  { code: '+992', flag: '\u{1F1F9}\u{1F1EF}', label: 'Tajikistan (+992)' },
  { code: '+255', flag: '\u{1F1F9}\u{1F1FF}', label: 'Tanzania (+255)' },
  { code: '+66', flag: '\u{1F1F9}\u{1F1ED}', label: 'Thailand (+66)' },
  { code: '+228', flag: '\u{1F1F9}\u{1F1EC}', label: 'Togo (+228)' },
  { code: '+676', flag: '\u{1F1F9}\u{1F1F4}', label: 'Tonga (+676)' },
  { code: '+216', flag: '\u{1F1F9}\u{1F1F3}', label: 'Tunisia (+216)' },
  { code: '+90', flag: '\u{1F1F9}\u{1F1F7}', label: 'Turkey (+90)' },
  { code: '+993', flag: '\u{1F1F9}\u{1F1F2}', label: 'Turkmenistan (+993)' },
  { code: '+256', flag: '\u{1F1FA}\u{1F1EC}', label: 'Uganda (+256)' },
  { code: '+380', flag: '\u{1F1FA}\u{1F1E6}', label: 'Ukraine (+380)' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', label: 'United Arab Emirates (+971)' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', label: 'United Kingdom (+44)' },
  { code: '+598', flag: '\u{1F1FA}\u{1F1FE}', label: 'Uruguay (+598)' },
  { code: '+998', flag: '\u{1F1FA}\u{1F1FF}', label: 'Uzbekistan (+998)' },
  { code: '+678', flag: '\u{1F1FB}\u{1F1FA}', label: 'Vanuatu (+678)' },
  { code: '+58', flag: '\u{1F1FB}\u{1F1EA}', label: 'Venezuela (+58)' },
  { code: '+84', flag: '\u{1F1FB}\u{1F1F3}', label: 'Vietnam (+84)' },
  { code: '+967', flag: '\u{1F1FE}\u{1F1EA}', label: 'Yemen (+967)' },
  { code: '+260', flag: '\u{1F1FF}\u{1F1F2}', label: 'Zambia (+260)' },
  { code: '+263', flag: '\u{1F1FF}\u{1F1FC}', label: 'Zimbabwe (+263)' },
];

/**
 * Return flag emoji for a dial code, or globe emoji as fallback.
 */
export function getFlagForCode(code: string): string {
  const entry = COUNTRY_CODES.find((c) => c.code === code);
  return entry?.flag ?? '\u{1F310}';
}

/**
 * Find a country entry by its unique label (e.g., 'United States (+1)').
 */
export function getCountryByLabel(label: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.label === label);
}

/**
 * Build lookup sets grouped by digit length (longest first) from COUNTRY_CODES.
 */
const CODE_SETS_BY_LENGTH: Array<{ len: number; codes: Set<string> }> = (() => {
  const byLen = new Map<number, Set<string>>();
  for (const entry of COUNTRY_CODES) {
    const digits = entry.code.substring(1); // remove '+'
    const len = digits.length;
    if (!byLen.has(len)) byLen.set(len, new Set());
    byLen.get(len)!.add(digits);
  }
  // Sort by length descending (longest first)
  return Array.from(byLen.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([len, codes]) => ({ len, codes }));
})();

/**
 * Extract country code and local number from a full phone string.
 * Tries longest matching code first. Defaults to +55 if no match.
 */
export function splitPhoneNumber(fullPhone: string): { countryCode: string; phone: string } {
  if (!fullPhone || !fullPhone.startsWith('+')) {
    return { countryCode: '+55', phone: fullPhone || '' };
  }

  const digits = fullPhone.substring(1); // remove '+'

  for (const { len, codes } of CODE_SETS_BY_LENGTH) {
    if (digits.length >= len) {
      const prefix = digits.substring(0, len);
      if (codes.has(prefix)) {
        return { countryCode: `+${prefix}`, phone: digits.substring(len) };
      }
    }
  }

  // Fallback: assume first 2 digits
  if (digits.length >= 2) {
    return { countryCode: `+${digits.substring(0, 2)}`, phone: digits.substring(2) };
  }

  return { countryCode: '+55', phone: fullPhone };
}
