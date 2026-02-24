/**
 * QA Tests for CR-002 batch (20 Change Requests: CR-11 to CR-30)
 *
 * Covers acceptance criteria for:
 * CR-11: App language follows ward language on start
 * CR-12: "Apresentacao Especial" label rename
 * CR-13: Remove {tema} from WhatsApp template
 * CR-14: Default WhatsApp template update
 * CR-15: WhatsApp clickable placeholders (structural)
 * CR-16: WhatsApp template larger fonts (structural)
 * CR-17: WhatsApp back button (structural)
 * CR-18: Human-readable activity log descriptions
 * CR-19: History screen back button (structural)
 * CR-20: Topics screen back button (structural)
 * CR-21: Move add button to Ward Topics section (structural)
 * CR-22: Human-readable dates in activity log
 * CR-23: Secretary has settings:users permission
 * CR-24: Sunday type dropdown wiring (structural)
 * CR-25: Show speech slots for non-excluded exception types
 * CR-26: ActorSelector inline add (structural)
 * CR-27: DebouncedTextInput component
 * CR-28: Recognized names free-text editable (structural)
 * CR-29: Section header uses custom_reason for "other" type (structural)
 * CR-30: "Modelo de Convite pelo WhatsApp" settings label
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import {
  hasPermission,
  getPermissions,
} from '../lib/permissions';
import {
  formatDateHumanReadable,
  formatDate,
  parseLocalDate,
  getMonthAbbr,
} from '../lib/dateUtils';
import {
  isExcludedFromAgenda,
  isSpecialMeeting,
  EXCLUDED_EXCEPTION_TYPES,
} from '../hooks/useAgenda';
import {
  enforceActorRules,
} from '../hooks/useActors';
import type { Role, Permission } from '../types/database';

// =============================================================================
// CR-11: App language follows ward language on start
// =============================================================================

describe('CR-11: App language follows ward language', () => {
  it('should have SUPPORTED_LANGUAGES exported', async () => {
    const mod = await import('../i18n');
    expect(mod.SUPPORTED_LANGUAGES).toContain('pt-BR');
    expect(mod.SUPPORTED_LANGUAGES).toContain('en');
    expect(mod.SUPPORTED_LANGUAGES).toContain('es');
  });

  it('should export changeLanguage function', async () => {
    const mod = await import('../i18n');
    expect(typeof mod.changeLanguage).toBe('function');
  });

  it('AuthContext should import changeLanguage', async () => {
    // Structural check: AuthContext imports from i18n
    const fs = await import('fs');
    const authContent = fs.readFileSync(
      new URL('../contexts/AuthContext.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(authContent).toContain('changeLanguage');
    expect(authContent).toContain('SUPPORTED_LANGUAGES');
    // Should have an effect that watches wardId
    expect(authContent).toContain('wardId');
    expect(authContent).toContain("from('wards')");
  });
});

// =============================================================================
// CR-12: "Apresentacao Especial" label rename
// =============================================================================

describe('CR-12: Musical number renamed to special presentation', () => {
  it('pt-BR: agenda.musicalNumber should be "Apresentacao Especial"', () => {
    expect(ptBR.agenda.musicalNumber).toBe('Apresentacao Especial');
  });

  it('en: agenda.musicalNumber should be "Special Presentation"', () => {
    expect(en.agenda.musicalNumber).toBe('Special Presentation');
  });

  it('es: agenda.musicalNumber should be "Presentacion Especial"', () => {
    expect(es.agenda.musicalNumber).toBe('Presentacion Especial');
  });
});

// =============================================================================
// CR-13: Remove {tema} from WhatsApp template
// =============================================================================

describe('CR-13: WhatsApp template default does not use {tema}', () => {
  it('Edge Function default template should not contain {tema}', async () => {
    const fs = await import('fs');
    const edgeFnContent = fs.readFileSync(
      new URL('../../supabase/functions/register-first-user/index.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(edgeFnContent).not.toContain('{tema}');
  });

  it('Edge Function default template should contain {colecao}, {titulo}, {link}', async () => {
    const fs = await import('fs');
    const edgeFnContent = fs.readFileSync(
      new URL('../../supabase/functions/register-first-user/index.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(edgeFnContent).toContain('{colecao}');
    expect(edgeFnContent).toContain('{titulo}');
    expect(edgeFnContent).toContain('{link}');
    expect(edgeFnContent).toContain('{data}');
    // CR-231: {posicao} no longer used, templates use ordinal words instead
    expect(edgeFnContent).toContain('primeiro discurso');
  });
});

// =============================================================================
// CR-14: Default WhatsApp template in ward language
// =============================================================================

describe('CR-14: Default WhatsApp template is in Portuguese', () => {
  it('should have a Portuguese default template', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../supabase/functions/register-first-user/index.ts', import.meta.url).pathname,
      'utf-8'
    );
    // Template should be in Portuguese (with proper accents)
    expect(content).toContain('Olá');
    expect(content).toContain('discurso');
  });
});

// =============================================================================
// CR-15: WhatsApp clickable placeholders (structural)
// =============================================================================

describe('CR-15: WhatsApp placeholders are clickable', () => {
  it('WhatsApp screen should use Pressable for placeholders', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/whatsapp.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Placeholders should be wrapped in Pressable, not just View
    expect(content).toContain('insertPlaceholder');
    expect(content).toContain('onSelectionChange');
  });
});

// =============================================================================
// CR-16: WhatsApp template larger fonts (structural)
// =============================================================================

describe('CR-16: WhatsApp template screen has larger fonts', () => {
  it('editor should have fontSize >= 17', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/whatsapp.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Check that editor and preview have larger font sizes
    expect(content).toContain('fontSize: 17');
    expect(content).toContain('lineHeight: 24');
  });
});

// =============================================================================
// CR-17: WhatsApp back button (structural)
// =============================================================================

describe('CR-17: WhatsApp screen has back button', () => {
  it('should import useRouter and have back button', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/whatsapp.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('useRouter');
    expect(content).toContain('router.back()');
    expect(content).toContain("t('common.back')");
  });
});

// =============================================================================
// CR-18: Human-readable activity log descriptions
// =============================================================================

describe('CR-18: Activity log descriptions are human-readable', () => {
  it('useMembers should have descriptive log messages', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useMembers.ts', import.meta.url).pathname,
      'utf-8'
    );
    // Uses buildLogDescription with structured format
    expect(content).toContain('buildLogDescription');
    expect(content).toContain("'member:create'");
    expect(content).toContain("'member:update'");
    expect(content).toContain("'member:delete'");
    // Should not use old style
    expect(content).not.toContain('Membro criado:');
  });

  it('useActors should have descriptive log messages', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useActors.ts', import.meta.url).pathname,
      'utf-8'
    );
    // Uses buildLogDescription with structured format
    expect(content).toContain('buildLogDescription');
    expect(content).toContain("'actor:create'");
    expect(content).not.toContain('Ator criado:');
  });

  it('useTopics should have descriptive log messages', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useTopics.ts', import.meta.url).pathname,
      'utf-8'
    );
    // Uses buildLogDescription with structured format
    expect(content).toContain('buildLogDescription');
    expect(content).toContain("'topic:create'");
    expect(content).not.toContain('Tema criado:');
  });
});

// =============================================================================
// CR-19: History screen back button (structural)
// =============================================================================

describe('CR-19: History screen has back button', () => {
  it('should import useRouter and have back button', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/history.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('useRouter');
    expect(content).toContain('router.back()');
    expect(content).toContain("t('common.back')");
  });
});

// =============================================================================
// CR-20: Topics screen back button (structural)
// =============================================================================

describe('CR-20: Topics screen has back button', () => {
  it('should import useRouter and have back button', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/topics.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('useRouter');
    expect(content).toContain('router.back()');
    expect(content).toContain("t('common.back')");
  });
});

// =============================================================================
// CR-21: Move add button to Ward Topics section (structural)
// =============================================================================

describe('CR-21: Add button is in Ward Topics section', () => {
  it('Topics screen should have sectionHeader style with add button', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/settings/topics.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Should have a sectionHeader layout with both title and add button
    expect(content).toContain('sectionHeader');
    // Add button should be inside the section header, not in the global header
    expect(content).toContain("t('topics.wardTopics')");
  });
});

// =============================================================================
// CR-22: Human-readable dates in activity log
// =============================================================================

describe('CR-22: formatDateHumanReadable', () => {
  it('should format pt-BR correctly', () => {
    expect(formatDateHumanReadable('2026-02-15', 'pt-BR')).toBe('15 de Fevereiro de 2026');
  });

  it('should format en correctly', () => {
    expect(formatDateHumanReadable('2026-02-15', 'en')).toBe('February 15, 2026');
  });

  it('should format es correctly', () => {
    expect(formatDateHumanReadable('2026-02-15', 'es')).toBe('15 de Febrero de 2026');
  });

  it('should handle January 1st correctly', () => {
    expect(formatDateHumanReadable('2026-01-01', 'pt-BR')).toBe('1 de Janeiro de 2026');
    expect(formatDateHumanReadable('2026-01-01', 'en')).toBe('January 1, 2026');
  });

  it('should handle December 31st correctly', () => {
    expect(formatDateHumanReadable('2026-12-31', 'pt-BR')).toBe('31 de Dezembro de 2026');
    expect(formatDateHumanReadable('2026-12-31', 'en')).toBe('December 31, 2026');
  });

  it('should default to pt-BR when no locale given', () => {
    expect(formatDateHumanReadable('2026-06-07')).toBe('7 de Junho de 2026');
  });

  it('useSundayTypes uses buildLogDescription', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useSundayTypes.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('buildLogDescription');
  });

  it('useSpeeches imports formatDateHumanReadable', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useSpeeches.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('formatDateHumanReadable');
  });

  it('useAgenda uses buildLogDescription', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../hooks/useAgenda.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('buildLogDescription');
  });
});

// =============================================================================
// CR-23: Secretary has settings:users permission
// =============================================================================

describe('CR-23: Secretary has settings:users permission', () => {
  it('secretary should have settings:users permission', () => {
    expect(hasPermission('secretary', 'settings:users')).toBe(true);
  });

  it('observer should NOT have settings:users permission', () => {
    expect(hasPermission('observer', 'settings:users')).toBe(false);
  });

  it('bishopric should have settings:users permission', () => {
    expect(hasPermission('bishopric', 'settings:users')).toBe(true);
  });

  it('secretary permissions should include settings:users', () => {
    const perms = getPermissions('secretary');
    expect(perms).toContain('settings:users');
  });
});

// =============================================================================
// CR-24: Sunday type dropdown wiring (structural)
// =============================================================================

describe('CR-24: Sunday type dropdown works correctly', () => {
  it('SundayCard should always render children when expanded (not just speeches)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../components/SundayCard.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Should render children unconditionally when expanded
    // Old code had: {isSpeechesType && children}
    // New code should have just: {children}
    expect(content).not.toContain('isSpeechesType && children');
    expect(content).toContain('{children}');
  });
});

// =============================================================================
// CR-25: Show speech slots for non-excluded exception types
// =============================================================================

describe('CR-25: Non-excluded exception types show speech slots', () => {
  it('testimony_meeting should NOT be excluded from agenda', () => {
    expect(isExcludedFromAgenda('testimony_meeting')).toBe(false);
  });

  it('ward_conference should NOT be excluded from agenda', () => {
    expect(isExcludedFromAgenda('ward_conference')).toBe(false);
  });

  it('primary_presentation should NOT be excluded from agenda', () => {
    expect(isExcludedFromAgenda('primary_presentation')).toBe(false);
  });

  it('other should NOT be excluded from agenda', () => {
    expect(isExcludedFromAgenda('other')).toBe(false);
  });

  it('general_conference SHOULD be excluded from agenda', () => {
    expect(isExcludedFromAgenda('general_conference')).toBe(true);
  });

  it('stake_conference SHOULD be excluded from agenda', () => {
    expect(isExcludedFromAgenda('stake_conference')).toBe(true);
  });

  it('speeches.tsx should use direct type check, not isExcludedFromAgenda', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/speeches.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).not.toContain('isExcludedFromAgenda');
    expect(content).toContain("exception.reason === 'speeches'");
  });
});

// =============================================================================
// CR-26: ActorSelector / enforceActorRules is identity (CR-71 removed auto-rule)
// =============================================================================

describe('CR-26: enforceActorRules is identity function (CR-71)', () => {
  it('enforceActorRules: can_conduct=true should NOT auto-set can_preside (CR-71)', () => {
    const result = enforceActorRules({ name: 'Test', can_conduct: true });
    expect(result.can_preside).toBeUndefined();
    expect(result.can_conduct).toBe(true);
  });

  it('enforceActorRules: can_preside=true without can_conduct should stay', () => {
    const result = enforceActorRules({ name: 'Test', can_preside: true });
    expect(result.can_preside).toBe(true);
    expect(result.can_conduct).toBeUndefined();
  });

  it('enforceActorRules: no flags should not add any', () => {
    const result = enforceActorRules({ name: 'Test' });
    expect(result.can_preside).toBeUndefined();
    expect(result.can_conduct).toBeUndefined();
  });
});

// =============================================================================
// CR-27: DebouncedTextInput component
// =============================================================================

describe('CR-27: DebouncedTextInput exists and is used', () => {
  it('DebouncedTextInput component should exist', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../components/DebouncedTextInput.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('DebouncedTextInput');
    expect(content).toContain('onSave');
    expect(content).toContain('delay');
    // Should handle blur
    expect(content).toContain('onBlur');
    // Should use setTimeout for debouncing
    expect(content).toContain('setTimeout');
  });

  it('AgendaForm should import and use DebouncedTextInput', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../components/AgendaForm.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain("from './DebouncedTextInput'");
    expect(content).toContain('DebouncedTextInput');
    expect(content).toContain('onSave');
  });
});

// =============================================================================
// CR-28: Recognized names free-text editable (structural)
// =============================================================================

describe('CR-28: Recognized names uses ActorSelector (CR-73)', () => {
  it('AgendaForm recognizing should use SelectorField with ActorSelector (CR-73)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../components/AgendaForm.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Should use ActorSelector for recognized_names via SelectorField
    expect(content).toContain("recognized_names");
    // Recognizing opens ActorSelector with can_recognize roleFilter
    expect(content).toContain("field: 'recognizing', roleFilter: 'can_recognize'");
  });
});

// =============================================================================
// CR-29: Section header uses custom_reason for "other" type
// =============================================================================

describe('CR-29: Section labels use custom_reason for "other"', () => {
  it('AgendaForm should accept customReason prop', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../components/AgendaForm.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('customReason');
    // Should check exceptionReason === 'other' for section header
    expect(content).toContain("exceptionReason === 'other'");
  });

  it('agenda.tsx should pass customReason to AgendaForm', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../app/(tabs)/agenda.tsx', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('customReason');
    expect(content).toContain('custom_reason');
  });
});

// =============================================================================
// CR-30: WhatsApp settings label
// =============================================================================

describe('CR-30: Settings WhatsApp label is descriptive', () => {
  it('pt-BR label should be "Modelo de Convite pelo WhatsApp"', () => {
    expect(ptBR.settings.whatsappTemplate).toBe('Modelo de Convite pelo WhatsApp');
  });

  it('en label should be "WhatsApp Invitation Template"', () => {
    expect(en.settings.whatsappTemplate).toBe('WhatsApp Invitation Template');
  });

  it('es label should be "Modelo de Invitacion por WhatsApp"', () => {
    expect(es.settings.whatsappTemplate).toBe('Modelo de Invitacion por WhatsApp');
  });
});
