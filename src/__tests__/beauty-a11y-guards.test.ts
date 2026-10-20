/**
 * Anti-regression guards for BEL-02/BEL-03 (Wave 5).
 * The audit measured `colors.warning` (a fill color) used as text at 2.61–3.19:1
 * and `textTertiary` ("large text only") used as placeholder at ~3:1. These
 * guards fail if either pattern returns in the named components.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const WARNING_TEXT_FILES = ['components/SundayCard.tsx', 'app/speeches/[date].tsx'];
const PLACEHOLDER_FILES = [
  'components/SundayCard.tsx',
  'components/TopicSelectorModal.tsx',
  'components/AgendaForm.tsx',
  'components/EditableListField.tsx',
  'app/(tabs)/settings/members.tsx',
  'app/designations/[date].tsx',
];

describe('BEL-02: warning fill color is never text color', () => {
  for (const file of WARNING_TEXT_FILES) {
    it(`${file} does not use colors.warning as text color`, () => {
      expect(read(file)).not.toMatch(/color:\s*colors\.warning(?![A-Za-z])/);
    });
  }
});

describe('BEL-03: textTertiary is never a placeholder color', () => {
  for (const file of PLACEHOLDER_FILES) {
    it(`${file} does not use textTertiary as placeholderTextColor`, () => {
      expect(read(file)).not.toContain('placeholderTextColor={colors.textTertiary}');
    });
  }
});
