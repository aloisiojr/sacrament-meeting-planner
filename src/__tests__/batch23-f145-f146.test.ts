/**
 * Batch 23 Phase 1 - Tests for F145 (CR-209) and F146 (CR-210).
 *
 * CR-209 (F145): Replace all Unicode/emoji icons with inline SVG components
 * CR-210 (F146): Play icon placement adjustments (Home tab + Agenda tab)
 *
 * F145 ACs: AC-145-01 through AC-145-18 (18 ACs)
 * F146 ACs: AC-146-01 through AC-146-06 (6 ACs)
 * F145 ECs: EC-145-01 through EC-145-05 (5 ECs)
 * F146 ECs: EC-146-01 through EC-146-02 (2 ECs)
 *
 * Testing strategy: Source code analysis (fs.readFileSync) following project conventions.
 * Tests verify icon imports, icon component usage, absence of old Unicode characters,
 * prop forwarding, default values, and placement constraints.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readRootFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

// --- Icon module source ---
const iconsSource = readSrcFile('components/icons/index.tsx');

// --- Consumer file sources ---
const layoutSource = readSrcFile('app/(tabs)/_layout.tsx');
const indexSource = readSrcFile('app/(tabs)/index.tsx');
const agendaSource = readSrcFile('app/(tabs)/agenda.tsx');
const presentationSource = readSrcFile('app/presentation.tsx');
const settingsIndexSource = readSrcFile('app/(tabs)/settings/index.tsx');
const usersSource = readSrcFile('app/(tabs)/settings/users.tsx');
const timezoneSource = readSrcFile('app/(tabs)/settings/timezone.tsx');
const themeSource = readSrcFile('app/(tabs)/settings/theme.tsx');
const swipeableCardSource = readSrcFile('components/SwipeableCard.tsx');
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');
const searchInputSource = readSrcFile('components/SearchInput.tsx');
const sundayCardSource = readSrcFile('components/SundayCard.tsx');
const accordionCardSource = readSrcFile('components/AccordionCard.tsx');
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const inviteManagementSource = readSrcFile('components/InviteManagementSection.tsx');
const inviteActionSource = readSrcFile('components/InviteActionDropdown.tsx');
const packageJson = readRootFile('package.json');


// ============================================================================
// F145 (CR-209): Replace all Unicode/emoji icons with inline SVG components
// ============================================================================

describe('F145 (CR-209): Icons module', () => {

  // --- AC-145-01: Icons module exports all 14 icon components ---

  describe('AC-145-01: Icons module exports all 14 icon components', () => {
    const expectedIcons = [
      'HomeIcon', 'ClipboardListIcon', 'MicIcon', 'SettingsIcon',
      'TrashIcon', 'PlayIcon', 'PencilIcon', 'XIcon',
      'ChevronDownIcon', 'ChevronUpIcon', 'ChevronRightIcon',
      'CheckIcon', 'MoreVerticalIcon', 'WhatsAppIcon',
      'SquareIcon', 'CheckSquareIcon',
    ];

    it.each(expectedIcons)('exports %s as a named export', (iconName) => {
      const exportPattern = new RegExp(`export\\s+const\\s+${iconName}\\s*=`);
      expect(iconsSource).toMatch(exportPattern);
    });

    it('exports exactly 16 icon components', () => {
      const exportMatches = iconsSource.match(/export\s+const\s+\w+Icon\s*=/g) || [];
      expect(exportMatches).toHaveLength(16);
    });

    it('exports IconProps interface', () => {
      expect(iconsSource).toMatch(/export\s+interface\s+IconProps/);
    });

    it('IconProps has size and color optional properties', () => {
      expect(iconsSource).toContain('size?: number');
      expect(iconsSource).toContain('color?: string');
    });
  });

  // --- AC-145-02: All icons follow WhatsAppIcon pattern using react-native-svg ---

  describe('AC-145-02: Icon components use react-native-svg pattern', () => {
    it('imports Svg and Path from react-native-svg', () => {
      expect(iconsSource).toMatch(/import\s+.*Svg.*from\s+['"]react-native-svg['"]/);
      expect(iconsSource).toMatch(/import\s+.*Path.*from\s+['"]react-native-svg['"]/);
    });

    it('stroke-based icons use viewBox="0 0 24 24" fill="none"', () => {
      // All Svg elements should have viewBox="0 0 24 24"
      const svgMatches = iconsSource.match(/viewBox="0 0 24 24"/g) || [];
      expect(svgMatches.length).toBeGreaterThanOrEqual(16);
    });

    it('stroke-based icons use strokeWidth={2}', () => {
      const strokeWidthMatches = iconsSource.match(/strokeWidth=\{2\}/g) || [];
      // Multiple Paths per icon, so many matches
      expect(strokeWidthMatches.length).toBeGreaterThan(10);
    });

    it('stroke-based icons use strokeLinecap="round" and strokeLinejoin="round"', () => {
      expect(iconsSource).toContain('strokeLinecap="round"');
      expect(iconsSource).toContain('strokeLinejoin="round"');
    });

    it('stroke-based icons default color to currentColor', () => {
      // 15 stroke-based icons should default to 'currentColor' (13 original + SquareIcon + CheckSquareIcon)
      const currentColorDefaults = iconsSource.match(/color\s*=\s*'currentColor'/g) || [];
      expect(currentColorDefaults.length).toBe(15);
    });

    it('stroke-based icons default size to 24', () => {
      const sizeDefaults = iconsSource.match(/size\s*=\s*24/g) || [];
      expect(sizeDefaults.length).toBe(16); // all 16 icons default to 24
    });

    it('WhatsAppIcon uses fill-based rendering (fill={color})', () => {
      // WhatsAppIcon section should have fill={color} on Path
      const whatsappSection = iconsSource.substring(iconsSource.indexOf('WhatsAppIcon'));
      expect(whatsappSection).toContain('fill={color}');
    });

    it('WhatsAppIcon defaults color to #25D366', () => {
      const whatsappSection = iconsSource.substring(iconsSource.indexOf('WhatsAppIcon'));
      expect(whatsappSection).toContain("color = '#25D366'");
    });
  });

  // --- AC-145-03: Tab bar icons use SVG icons ---

  describe('AC-145-03: Tab bar uses SVG icons instead of emojis', () => {
    it('imports HomeIcon, ClipboardListIcon, MicIcon, SettingsIcon from icons module', () => {
      expect(layoutSource).toMatch(/import\s*\{[^}]*HomeIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(layoutSource).toMatch(/import\s*\{[^}]*ClipboardListIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(layoutSource).toMatch(/import\s*\{[^}]*MicIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(layoutSource).toMatch(/import\s*\{[^}]*SettingsIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('renders HomeIcon with color and size from tabBarIcon callback', () => {
      expect(layoutSource).toMatch(/<HomeIcon\s+color=\{color\}\s+size=\{size\}/);
    });

    it('renders ClipboardListIcon with color and size from tabBarIcon callback', () => {
      expect(layoutSource).toMatch(/<ClipboardListIcon\s+color=\{color\}\s+size=\{size\}/);
    });

    it('renders MicIcon with color and size from tabBarIcon callback', () => {
      expect(layoutSource).toMatch(/<MicIcon\s+color=\{color\}\s+size=\{size\}/);
    });

    it('renders SettingsIcon with color and size from tabBarIcon callback', () => {
      expect(layoutSource).toMatch(/<SettingsIcon\s+color=\{color\}\s+size=\{size\}/);
    });

    it('does NOT contain emoji characters for tab icons', () => {
      // house, clipboard, microphone, gear emojis
      expect(layoutSource).not.toContain('\u{1F3E0}');
      expect(layoutSource).not.toContain('\u{1F4CB}');
      expect(layoutSource).not.toContain('\u{1F399}');
      expect(layoutSource).not.toContain('\u2699');
    });
  });

  // --- AC-145-04: SwipeableCard delete button uses TrashIcon ---

  describe('AC-145-04: SwipeableCard delete button uses TrashIcon', () => {
    it('imports TrashIcon from icons module', () => {
      expect(swipeableCardSource).toMatch(/import\s*\{[^}]*TrashIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('renders TrashIcon with color="#FFFFFF"', () => {
      expect(swipeableCardSource).toMatch(/<TrashIcon\s+size=\{20\}\s+color="#FFFFFF"/);
    });

    it('does NOT contain wastebasket emoji U+1F5D1', () => {
      expect(swipeableCardSource).not.toContain('\u{1F5D1}');
    });
  });

  // --- AC-145-05: SwipeableCard edit button uses PencilIcon ---

  describe('AC-145-05: SwipeableCard edit button uses PencilIcon', () => {
    it('imports PencilIcon from icons module', () => {
      expect(swipeableCardSource).toMatch(/import\s*\{[^}]*PencilIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('renders PencilIcon with color={colors.onPrimary}', () => {
      expect(swipeableCardSource).toMatch(/<PencilIcon\s+size=\{20\}\s+color=\{colors\.onPrimary\}/);
    });

    it('does NOT contain pencil Unicode U+270F', () => {
      expect(swipeableCardSource).not.toContain('\u270F');
    });
  });

  // --- AC-145-06: Play icon uses PlayIcon SVG in Home tab and Agenda tab ---

  describe('AC-145-06: PlayIcon in Home and Agenda tabs', () => {
    it('index.tsx imports PlayIcon from icons module', () => {
      expect(indexSource).toMatch(/import\s*\{[^}]*PlayIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('agenda.tsx imports PlayIcon from icons module', () => {
      expect(agendaSource).toMatch(/import\s*\{[^}]*PlayIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('index.tsx renders PlayIcon component', () => {
      expect(indexSource).toContain('<PlayIcon');
    });

    it('agenda.tsx renders PlayIcon component', () => {
      expect(agendaSource).toContain('<PlayIcon');
    });

    it('index.tsx does NOT contain play triangle Unicode U+25B6', () => {
      expect(indexSource).not.toContain('\u25B6');
    });

    it('agenda.tsx does NOT contain play triangle Unicode U+25B6', () => {
      expect(agendaSource).not.toContain('\u25B6');
    });
  });

  // --- AC-145-07: PencilIcon in all locations ---

  describe('AC-145-07: PencilIcon in Home, presentation, and AgendaForm', () => {
    it('index.tsx imports PencilIcon', () => {
      expect(indexSource).toMatch(/import\s*\{[^}]*PencilIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('presentation.tsx imports PencilIcon', () => {
      expect(presentationSource).toMatch(/import\s*\{[^}]*PencilIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('AgendaForm.tsx imports PencilIcon', () => {
      expect(agendaFormSource).toMatch(/import\s*\{[^}]*PencilIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('index.tsx renders PencilIcon', () => {
      expect(indexSource).toContain('<PencilIcon');
    });

    it('presentation.tsx renders PencilIcon', () => {
      expect(presentationSource).toContain('<PencilIcon');
    });

    it('AgendaForm.tsx renders PencilIcon', () => {
      expect(agendaFormSource).toContain('<PencilIcon');
    });

    it('NO pencil Unicode U+270F in index.tsx', () => {
      expect(indexSource).not.toContain('\u270F');
    });

    it('NO pencil Unicode U+270F in presentation.tsx', () => {
      expect(presentationSource).not.toContain('\u270F');
    });

    it('NO pencil Unicode U+270F in AgendaForm.tsx', () => {
      expect(agendaFormSource).not.toContain('\u270F');
    });
  });

  // --- AC-145-08: Close X icon uses XIcon in presentation ---

  describe('AC-145-08: XIcon in presentation header', () => {
    it('presentation.tsx imports XIcon', () => {
      expect(presentationSource).toMatch(/import\s*\{[^}]*XIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('presentation.tsx renders XIcon', () => {
      expect(presentationSource).toContain('<XIcon');
    });

    it('does NOT contain close X Unicode U+2715', () => {
      expect(presentationSource).not.toContain('\u2715');
    });
  });

  // --- AC-145-09: Multiply X (clear/remove) uses XIcon in all locations ---

  describe('AC-145-09: XIcon for clear/remove in SpeechSlot, SearchInput, AgendaForm', () => {
    it('SpeechSlot.tsx imports XIcon', () => {
      expect(speechSlotSource).toMatch(/import\s*\{[^}]*XIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('SearchInput.tsx imports XIcon', () => {
      expect(searchInputSource).toMatch(/import\s*\{[^}]*XIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('AgendaForm.tsx imports XIcon', () => {
      expect(agendaFormSource).toMatch(/import\s*\{[^}]*XIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('SpeechSlot.tsx renders XIcon', () => {
      expect(speechSlotSource).toContain('<XIcon');
    });

    it('SearchInput.tsx renders XIcon', () => {
      expect(searchInputSource).toContain('<XIcon');
    });

    it('AgendaForm.tsx renders XIcon', () => {
      expect(agendaFormSource).toContain('<XIcon');
    });

    it('SpeechSlot.tsx does NOT contain multiply X Unicode U+00D7', () => {
      expect(speechSlotSource).not.toContain('\u00D7');
    });

    it('SearchInput.tsx does NOT contain multiply X Unicode U+00D7', () => {
      expect(searchInputSource).not.toContain('\u00D7');
    });

    it('AgendaForm.tsx does NOT contain multiply X Unicode U+00D7', () => {
      expect(agendaFormSource).not.toContain('\u00D7');
    });
  });

  // --- AC-145-10: Chevron down/up icons ---

  describe('AC-145-10: ChevronDownIcon/ChevronUpIcon in all locations', () => {
    it('SpeechSlot.tsx imports ChevronDownIcon', () => {
      expect(speechSlotSource).toMatch(/import\s*\{[^}]*ChevronDownIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('SundayCard.tsx imports ChevronDownIcon', () => {
      expect(sundayCardSource).toMatch(/import\s*\{[^}]*ChevronDownIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('AccordionCard.tsx imports ChevronDownIcon and ChevronUpIcon', () => {
      expect(accordionCardSource).toMatch(/import\s*\{[^}]*ChevronDownIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(accordionCardSource).toMatch(/import\s*\{[^}]*ChevronUpIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('agenda.tsx imports ChevronDownIcon and ChevronUpIcon', () => {
      expect(agendaSource).toMatch(/import\s*\{[^}]*ChevronDownIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(agendaSource).toMatch(/import\s*\{[^}]*ChevronUpIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('users.tsx imports ChevronDownIcon and ChevronUpIcon', () => {
      expect(usersSource).toMatch(/import\s*\{[^}]*ChevronDownIcon[^}]*\}\s*from\s*['"].*icons['"]/);
      expect(usersSource).toMatch(/import\s*\{[^}]*ChevronUpIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('SpeechSlot.tsx renders ChevronDownIcon', () => {
      expect(speechSlotSource).toContain('<ChevronDownIcon');
    });

    it('SundayCard.tsx renders ChevronDownIcon', () => {
      expect(sundayCardSource).toContain('<ChevronDownIcon');
    });

    it('AccordionCard.tsx renders ChevronDownIcon and ChevronUpIcon', () => {
      expect(accordionCardSource).toContain('<ChevronDownIcon');
      expect(accordionCardSource).toContain('<ChevronUpIcon');
    });

    it('agenda.tsx renders ChevronDownIcon and ChevronUpIcon', () => {
      expect(agendaSource).toContain('<ChevronDownIcon');
      expect(agendaSource).toContain('<ChevronUpIcon');
    });

    it('users.tsx renders ChevronDownIcon and ChevronUpIcon', () => {
      expect(usersSource).toContain('<ChevronDownIcon');
      expect(usersSource).toContain('<ChevronUpIcon');
    });

    it('NO down arrow Unicode U+25BC in consumer files', () => {
      expect(speechSlotSource).not.toContain('\u25BC');
      expect(sundayCardSource).not.toContain('\u25BC');
      expect(accordionCardSource).not.toContain('\u25BC');
      expect(agendaSource).not.toContain('\u25BC');
      expect(usersSource).not.toContain('\u25BC');
    });

    it('NO up arrow Unicode U+25B2 in consumer files', () => {
      expect(accordionCardSource).not.toContain('\u25B2');
      expect(agendaSource).not.toContain('\u25B2');
      expect(usersSource).not.toContain('\u25B2');
    });
  });

  // --- AC-145-11: ChevronRightIcon in settings ---

  describe('AC-145-11: ChevronRightIcon in settings items', () => {
    it('settings/index.tsx imports ChevronRightIcon', () => {
      expect(settingsIndexSource).toMatch(/import\s*\{[^}]*ChevronRightIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('settings/index.tsx renders ChevronRightIcon', () => {
      expect(settingsIndexSource).toContain('<ChevronRightIcon');
    });

    it('does NOT contain right arrow Unicode U+203A', () => {
      expect(settingsIndexSource).not.toContain('\u203A');
    });
  });

  // --- AC-145-12: CheckIcon in all selection screens ---

  describe('AC-145-12: CheckIcon in settings, timezone, theme', () => {
    it('settings/index.tsx imports CheckIcon', () => {
      expect(settingsIndexSource).toMatch(/import\s*\{[^}]*CheckIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('timezone.tsx imports CheckIcon', () => {
      expect(timezoneSource).toMatch(/import\s*\{[^}]*CheckIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('theme.tsx imports CheckIcon', () => {
      expect(themeSource).toMatch(/import\s*\{[^}]*CheckIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('settings/index.tsx renders CheckIcon', () => {
      expect(settingsIndexSource).toContain('<CheckIcon');
    });

    it('timezone.tsx renders CheckIcon', () => {
      expect(timezoneSource).toContain('<CheckIcon');
    });

    it('theme.tsx renders CheckIcon', () => {
      expect(themeSource).toContain('<CheckIcon');
    });

    it('NO checkmark Unicode U+2713 in settings screens', () => {
      expect(settingsIndexSource).not.toContain('\u2713');
      expect(timezoneSource).not.toContain('\u2713');
      expect(themeSource).not.toContain('\u2713');
    });
  });

  // --- AC-145-13: MoreVerticalIcon in invite management ---

  describe('AC-145-13: MoreVerticalIcon in InviteManagementSection', () => {
    it('imports MoreVerticalIcon from icons module', () => {
      expect(inviteManagementSource).toMatch(/import\s*\{[^}]*MoreVerticalIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('renders MoreVerticalIcon', () => {
      expect(inviteManagementSource).toContain('<MoreVerticalIcon');
    });

    it('does NOT contain vertical ellipsis Unicode U+22EE', () => {
      expect(inviteManagementSource).not.toContain('\u22EE');
    });
  });

  // --- AC-145-14: WhatsAppIcon consolidated ---

  describe('AC-145-14: WhatsAppIcon consolidated from duplicate definitions', () => {
    it('InviteManagementSection imports WhatsAppIcon from icons module', () => {
      expect(inviteManagementSource).toMatch(/import\s*\{[^}]*WhatsAppIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('InviteActionDropdown imports WhatsAppIcon from icons module', () => {
      expect(inviteActionSource).toMatch(/import\s*\{[^}]*WhatsAppIcon[^}]*\}\s*from\s*['"].*icons['"]/);
    });

    it('InviteManagementSection does NOT have local WhatsAppIcon definition', () => {
      // Should not have a local function/const WhatsAppIcon definition
      expect(inviteManagementSource).not.toMatch(/(?:const|function)\s+WhatsAppIcon\s*[=(]/);
    });

    it('InviteActionDropdown does NOT have local WhatsAppIcon definition', () => {
      expect(inviteActionSource).not.toMatch(/(?:const|function)\s+WhatsAppIcon\s*[=(]/);
    });

    it('InviteManagementSection does NOT import Svg/Path from react-native-svg', () => {
      expect(inviteManagementSource).not.toMatch(/import\s.*from\s+['"]react-native-svg['"]/);
    });

    it('InviteActionDropdown does NOT import Svg/Path from react-native-svg', () => {
      expect(inviteActionSource).not.toMatch(/import\s.*from\s+['"]react-native-svg['"]/);
    });

    it('InviteManagementSection renders WhatsAppIcon', () => {
      expect(inviteManagementSource).toContain('<WhatsAppIcon');
    });

    it('InviteActionDropdown renders WhatsAppIcon', () => {
      expect(inviteActionSource).toContain('<WhatsAppIcon');
    });
  });

  // --- AC-145-15: Zero new dependencies ---

  describe('AC-145-15: No new dependencies added', () => {
    it('package.json contains react-native-svg', () => {
      expect(packageJson).toContain('"react-native-svg"');
    });

    it('package.json does NOT contain lucide-react-native', () => {
      expect(packageJson).not.toContain('lucide-react-native');
    });

    it('package.json does NOT contain @expo/vector-icons', () => {
      expect(packageJson).not.toContain('@expo/vector-icons');
    });

    it('package.json does NOT contain react-native-vector-icons', () => {
      expect(packageJson).not.toContain('react-native-vector-icons');
    });

    it('icons module does NOT import from lucide', () => {
      expect(iconsSource).not.toMatch(/from\s+['"]lucide/);
    });
  });

  // --- AC-145-16: All icons render identically on iOS and Android ---

  describe('AC-145-16: Cross-platform SVG rendering', () => {
    it('icons module uses Svg element with viewBox for vector scaling', () => {
      // Every icon has <Svg ... viewBox="0 0 24 24"> -- SVG is resolution-independent
      // Match only actual Svg elements (not comments) by requiring the < before Svg
      const svgElementViewBoxCount = (iconsSource.match(/<Svg[^>]*viewBox="0 0 24 24"/g) || []).length;
      expect(svgElementViewBoxCount).toBe(16); // all 16 icons
    });

    it('icons module uses width={size} height={size} for consistent sizing', () => {
      const widthSizeCount = (iconsSource.match(/width=\{size\}/g) || []).length;
      const heightSizeCount = (iconsSource.match(/height=\{size\}/g) || []).length;
      expect(widthSizeCount).toBe(16);
      expect(heightSizeCount).toBe(16);
    });
  });

  // --- AC-145-17: No Unicode/emoji icon characters remain ---

  describe('AC-145-17: No old Unicode/emoji icon chars in production code', () => {
    // List of all production source files that were migrated
    const allConsumerSources = [
      { name: '_layout.tsx', src: layoutSource },
      { name: 'index.tsx', src: indexSource },
      { name: 'agenda.tsx', src: agendaSource },
      { name: 'presentation.tsx', src: presentationSource },
      { name: 'settings/index.tsx', src: settingsIndexSource },
      { name: 'users.tsx', src: usersSource },
      { name: 'timezone.tsx', src: timezoneSource },
      { name: 'theme.tsx', src: themeSource },
      { name: 'SwipeableCard.tsx', src: swipeableCardSource },
      { name: 'SpeechSlot.tsx', src: speechSlotSource },
      { name: 'SearchInput.tsx', src: searchInputSource },
      { name: 'SundayCard.tsx', src: sundayCardSource },
      { name: 'AccordionCard.tsx', src: accordionCardSource },
      { name: 'AgendaForm.tsx', src: agendaFormSource },
      { name: 'InviteManagementSection.tsx', src: inviteManagementSource },
      { name: 'InviteActionDropdown.tsx', src: inviteActionSource },
    ];

    // These are the Unicode chars that were replaced
    const replacedChars: Array<{ char: string; name: string }> = [
      { char: '\u{1F3E0}', name: 'house emoji U+1F3E0' },
      { char: '\u{1F4CB}', name: 'clipboard emoji U+1F4CB' },
      { char: '\u{1F399}', name: 'microphone emoji U+1F399' },
      { char: '\u{1F5D1}', name: 'wastebasket emoji U+1F5D1' },
      { char: '\u25B6', name: 'play triangle U+25B6' },
      { char: '\u270F', name: 'pencil U+270F' },
      { char: '\u2715', name: 'close X U+2715' },
      { char: '\u25BC', name: 'down arrow U+25BC' },
      { char: '\u25B2', name: 'up arrow U+25B2' },
      { char: '\u203A', name: 'right arrow U+203A' },
      { char: '\u2713', name: 'checkmark U+2713' },
      { char: '\u22EE', name: 'vertical ellipsis U+22EE' },
    ];

    for (const file of allConsumerSources) {
      for (const { char, name } of replacedChars) {
        it(`${file.name} does NOT contain ${name}`, () => {
          expect(file.src).not.toContain(char);
        });
      }
    }
  });

  // --- AC-145-18: DD-25 updated (verified via ARCH_CONSOLIDATED) ---

  describe('AC-145-18: DD-25 updated in architecture', () => {
    it('ARCH_CONSOLIDATED references DD-25 updated to inline SVG', () => {
      const archConsolidated = readRootFile('docs/arch/ARCH_CONSOLIDATED.yaml');
      expect(archConsolidated).toContain("DD-25 updated to 'inline SVG (no icon library)'");
    });

    it('ADR-096 documents the centralized SVG icons module decision', () => {
      const archConsolidated = readRootFile('docs/arch/ARCH_CONSOLIDATED.yaml');
      expect(archConsolidated).toContain('ADR-096');
      // ADR-096 title references centralized SVG icons
      expect(archConsolidated).toMatch(/id:\s*ADR-096/);
      expect(archConsolidated).toMatch(/Centralized SVG icons module/i);
    });
  });
});


// ============================================================================
// F145 Edge Cases
// ============================================================================

describe('F145 (CR-209): Edge cases', () => {

  // --- EC-145-01: Icon rendered with size=0 ---

  describe('EC-145-01: Icon with size=0', () => {
    it('icon components accept size as a number prop (size=0 valid per TypeScript)', () => {
      // The IconProps interface defines size?: number, which includes 0
      expect(iconsSource).toContain('size?: number');
    });

    it('Svg elements use width={size} and height={size}, so size=0 produces 0x0 Svg', () => {
      // All icons use width={size} height={size} -- passing 0 produces width=0 height=0
      const allUseSize = iconsSource.match(/width=\{size\}\s+height=\{size\}/g) || [];
      expect(allUseSize.length).toBe(16);
    });
  });

  // --- EC-145-02: Icon rendered with very large size ---

  describe('EC-145-02: Icon with large size (e.g., 200)', () => {
    it('icons use viewBox="0 0 24 24" for proportional scaling at any size', () => {
      // viewBox ensures the icon scales proportionally regardless of width/height
      // Match only actual Svg elements (not comments) by requiring < before Svg
      const viewBoxCount = (iconsSource.match(/<Svg[^>]*viewBox="0 0 24 24"/g) || []).length;
      expect(viewBoxCount).toBe(16);
    });
  });

  // --- EC-145-03: Icon rendered with undefined color ---

  describe('EC-145-03: Icon with undefined color falls back to default', () => {
    it('stroke-based icons default color to currentColor', () => {
      const defaults = iconsSource.match(/color\s*=\s*'currentColor'/g) || [];
      expect(defaults.length).toBe(15); // 15 stroke-based icons (13 original + SquareIcon + CheckSquareIcon)
    });

    it('WhatsAppIcon defaults color to #25D366', () => {
      expect(iconsSource).toMatch(/WhatsAppIcon.*color\s*=\s*'#25D366'/s);
    });
  });

  // --- EC-145-04: Tab bar icon receives numeric size from Expo Router ---

  describe('EC-145-04: Tab bar icon receives numeric size from Expo Router', () => {
    it('tabBarIcon callbacks destructure { color, size } and pass directly to icon', () => {
      // Verify all 4 tab bar icons receive color and size directly
      const tabBarIconCallbacks = layoutSource.match(/tabBarIcon:\s*\(\{\s*color,\s*size\s*\}\)/g) || [];
      expect(tabBarIconCallbacks.length).toBe(4);
    });

    it('icon components receive size directly (no conversion)', () => {
      expect(layoutSource).toContain('size={size}');
    });
  });

  // --- EC-145-05: XIcon used for both close and clear with different sizes ---

  describe('EC-145-05: XIcon for close (U+2715) and clear (U+00D7) with different sizes', () => {
    it('icons module has a single XIcon component (not separate close/clear variants)', () => {
      const xIconExports = iconsSource.match(/export\s+const\s+XIcon\s*=/g) || [];
      expect(xIconExports.length).toBe(1);
    });

    it('presentation.tsx uses XIcon with size=18 for close button', () => {
      expect(presentationSource).toMatch(/<XIcon\s+size=\{18\}/);
    });

    it('SearchInput.tsx uses XIcon with size=18 for clear button', () => {
      expect(searchInputSource).toMatch(/<XIcon\s+size=\{18\}/);
    });

    it('SpeechSlot.tsx uses XIcon with different sizes for different actions', () => {
      // SpeechSlot uses XIcon in multiple locations (remove speaker, clear topic)
      const xIconUsages = (speechSlotSource.match(/<XIcon\s+size=\{/g) || []);
      expect(xIconUsages.length).toBeGreaterThanOrEqual(2);
    });
  });
});


// ============================================================================
// F146 (CR-210): Play icon placement adjustments
// ============================================================================

describe('F146 (CR-210): Play icon placement', () => {

  // --- AC-146-01: Home tab play icon stays inside button ---

  describe('AC-146-01: Home tab PlayIcon inside Start Meeting button', () => {
    it('PlayIcon renders inside meetingButtonContent View', () => {
      // PlayIcon is inside the meetingButtonContent styled View
      expect(indexSource).toContain('meetingButtonContent');
      expect(indexSource).toContain('<PlayIcon');
    });

    it('PlayIcon has size=20 matching the previous text fontSize', () => {
      expect(indexSource).toMatch(/<PlayIcon\s+size=\{20\}/);
    });

    it('PlayIcon has color={colors.onPrimary}', () => {
      expect(indexSource).toMatch(/<PlayIcon\s+size=\{20\}\s+color=\{colors\.onPrimary\}/);
    });

    it('PlayIcon is wrapped in playIconWrapper View with marginRight: 8', () => {
      expect(indexSource).toContain('playIconWrapper');
      // The playIconWrapper style should have marginRight: 8
      expect(indexSource).toMatch(/playIconWrapper[^}]*\{[^}]*marginRight:\s*8/s);
    });
  });

  // --- AC-146-02: Agenda tab play icon positioned next to chevron with gap ---

  describe('AC-146-02: Agenda tab PlayIcon near chevron with gap', () => {
    it('PlayIcon has marginRight: 16 via playButton style (increased from 8 by F153 CR-217)', () => {
      // CR-235: circle outline removed, style simplified back to style={styles.playButton}
      expect(agendaSource).toContain('styles.playButton');
      expect(agendaSource).toMatch(/playButton[^}]*\{[^}]*marginRight:\s*16/s);
    });

    it('PlayIcon uses color={colors.textSecondary}', () => {
      // CR-235: PlayIcon size changed from 18 to 24
      expect(agendaSource).toMatch(/<PlayIcon\s+size=\{24\}\s+color=\{colors\.textSecondary\}/);
    });

    it('ChevronUpIcon and ChevronDownIcon also use textSecondary color', () => {
      expect(agendaSource).toMatch(/<ChevronUpIcon\s+size=\{12\}\s+color=\{colors\.textSecondary\}/);
      expect(agendaSource).toMatch(/<ChevronDownIcon\s+size=\{12\}\s+color=\{colors\.textSecondary\}/);
    });
  });

  // --- AC-146-03: Play icon works with light theme ---

  describe('AC-146-03: PlayIcon works with light theme', () => {
    it('Home tab PlayIcon uses colors.onPrimary (theme-aware)', () => {
      expect(indexSource).toContain('color={colors.onPrimary}');
    });

    it('Agenda tab PlayIcon uses colors.textSecondary (theme-aware)', () => {
      // PlayIcon in agenda.tsx uses colors.textSecondary
      const playIconLine = agendaSource.match(/<PlayIcon.*color=\{colors\.textSecondary\}/);
      expect(playIconLine).not.toBeNull();
    });
  });

  // --- AC-146-04: Play icon works with dark theme ---

  describe('AC-146-04: PlayIcon works with dark theme', () => {
    it('PlayIcon uses dynamic theme colors (not hardcoded)', () => {
      // Home: colors.onPrimary (dynamic)
      expect(indexSource).not.toMatch(/<PlayIcon[^>]*color=['"]#/);
      // Agenda: colors.textSecondary (dynamic)
      expect(agendaSource).not.toMatch(/<PlayIcon[^>]*color=['"]#/);
    });

    it('both locations use useTheme() for color values', () => {
      expect(indexSource).toContain('useTheme');
      expect(agendaSource).toContain('useTheme');
    });
  });

  // --- AC-146-05: Play icon in Agenda only visible when expanded ---

  describe('AC-146-05: PlayIcon only renders when expandable && isExpanded', () => {
    it('PlayIcon is wrapped in expandable && isExpanded conditional', () => {
      // The play icon Pressable is inside {expandable && isExpanded && (...)}
      expect(agendaSource).toMatch(/expandable\s*&&\s*isExpanded\s*&&\s*\(\s*\n?\s*<Pressable[\s\S]*?<PlayIcon/);
    });

    it('Chevron icons render when expandable (regardless of expanded state)', () => {
      // The chevron section is inside {expandable && (...)}
      expect(agendaSource).toMatch(/\{expandable\s*&&\s*\(\s*\n?\s*isExpanded/);
    });
  });

  // --- AC-146-06: Play icon is monochromatic SVG, not emoji ---

  describe('AC-146-06: PlayIcon is monochromatic SVG', () => {
    it('PlayIcon in icons module uses stroke-based rendering', () => {
      const playSection = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf('export const PencilIcon')
      );
      expect(playSection).toContain('stroke={color}');
      expect(playSection).toContain('fill="none"');
    });

    it('PlayIcon is NOT an emoji or Unicode character', () => {
      // Verify no U+25B6 (play triangle Unicode) in agenda or index
      expect(agendaSource).not.toContain('\u25B6');
      expect(indexSource).not.toContain('\u25B6');
    });
  });
});


// ============================================================================
// F146 Edge Cases
// ============================================================================

describe('F146 (CR-210): Edge cases', () => {

  // --- EC-146-01: Non-expandable cards show no play icon ---

  describe('EC-146-01: Non-expandable cards show no play icon or chevron', () => {
    it('PlayIcon rendering is gated by expandable && isExpanded', () => {
      // Already verified in AC-146-05 but confirm the conditional
      expect(agendaSource).toMatch(/expandable\s*&&\s*isExpanded\s*&&/);
    });

    it('chevron rendering is gated by expandable', () => {
      expect(agendaSource).toMatch(/\{expandable\s*&&\s*\(/);
    });
  });

  // --- EC-146-02: Narrow screen play icon and chevron maintain separation ---

  describe('EC-146-02: Play icon and chevron maintain separation on narrow screens', () => {
    it('playButton style has fixed marginRight: 16 (increased from 8 by F153 CR-217)', () => {
      // SUPERSEDED by F153 (CR-217): marginRight changed from 8 to 16
      expect(agendaSource).toMatch(/playButton[^}]*\{[^}]*marginRight:\s*16/s);
    });

    it('PlayIcon and chevron icons have fixed sizes (not percentage-based)', () => {
      // CR-235: PlayIcon uses size={24} (changed from 18), chevrons use size={12} -- fixed pixel sizes
      expect(agendaSource).toMatch(/<PlayIcon\s+size=\{24\}/);
      expect(agendaSource).toMatch(/<ChevronUpIcon\s+size=\{12\}/);
      expect(agendaSource).toMatch(/<ChevronDownIcon\s+size=\{12\}/);
    });
  });
});


// ============================================================================
// Structural integrity checks
// ============================================================================

describe('F145/F146: Structural integrity', () => {

  it('icons/index.tsx file exists and is non-empty', () => {
    expect(iconsSource.length).toBeGreaterThan(100);
  });

  it('icons module has ISC license attribution comment', () => {
    // ISC or MIT reference for Lucide
    expect(iconsSource).toMatch(/ISC|Lucide/i);
  });

  it('icons module imports Circle from react-native-svg (for MoreVerticalIcon/SettingsIcon)', () => {
    expect(iconsSource).toMatch(/import.*Circle.*from\s+['"]react-native-svg['"]/);
  });

  it('WhatsAppIcon has unique path data (brand logo, different from Lucide)', () => {
    // WhatsAppIcon path starts with M17.472 (WhatsApp brand logo data)
    expect(iconsSource).toContain('M17.472 14.382');
  });

  it('all consumer files import from the correct relative path to icons module', () => {
    // Components import from './icons' or '../icons'
    expect(swipeableCardSource).toMatch(/from\s+['"]\.\/icons['"]/);
    expect(searchInputSource).toMatch(/from\s+['"]\.\/icons['"]/);
    // Screens import with relative paths like '../../components/icons'
    expect(indexSource).toMatch(/from\s+['"].*components\/icons['"]/);
    expect(agendaSource).toMatch(/from\s+['"].*components\/icons['"]/);
  });
});
