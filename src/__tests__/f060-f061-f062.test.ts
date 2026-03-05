/**
 * Tests for F060 (Prayer-Aware Designation Notification Text),
 * F061 (User-Friendly Error Messages), and F062 (Refresh Session).
 *
 * CR-270, CR-271, CR-272
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import {
  buildNotificationText,
  formatNameList,
} from '../lib/notificationUtils';
import type { OrdinalLanguage } from '../lib/notificationUtils';

// =============================================================================
// F061: i18n keys exist in all 3 locales (STEP-01)
// =============================================================================

describe('F061: i18n keys for error messages', () => {
  const locales = [
    { name: 'pt-BR', data: ptBR },
    { name: 'en-US', data: enUS },
    { name: 'es-LA', data: esLA },
  ];

  it.each(locales)('$name has settings.languageChangeFailed', ({ data }) => {
    expect((data as any).settings.languageChangeFailed).toBeTruthy();
    expect(typeof (data as any).settings.languageChangeFailed).toBe('string');
  });

  it.each(locales)('$name has settings.signOutFailed', ({ data }) => {
    expect((data as any).settings.signOutFailed).toBeTruthy();
    expect(typeof (data as any).settings.signOutFailed).toBe('string');
  });

  it.each(locales)('$name has members.futureSpeechWarning with {{count}}', ({ data }) => {
    expect((data as any).members.futureSpeechWarning).toBeTruthy();
    expect((data as any).members.futureSpeechWarning).toContain('{{count}}');
  });

  it.each(locales)('$name has members.importRpcError', ({ data }) => {
    expect((data as any).members.importRpcError).toBeTruthy();
    expect(typeof (data as any).members.importRpcError).toBe('string');
  });

  it.each(locales)('$name has users.sessionExpired', ({ data }) => {
    expect((data as any).users.sessionExpired).toBeTruthy();
    expect(typeof (data as any).users.sessionExpired).toBe('string');
  });

  it.each(locales)('$name has auth.registrationFailed', ({ data }) => {
    expect((data as any).auth.registrationFailed).toBeTruthy();
    expect(typeof (data as any).auth.registrationFailed).toBe('string');
  });

  it('no key collision - new keys do not shadow existing ones', () => {
    // Verify the new keys are distinct from existing keys
    expect(ptBR.settings.languageChangeFailed).not.toBe(ptBR.settings.signOut);
    expect(ptBR.settings.signOutFailed).not.toBe(ptBR.settings.signOut);
    expect(ptBR.members.importRpcError).not.toBe(ptBR.members.importFailed);
  });
});

// =============================================================================
// F060: Prayer-aware designation notification text (STEP-02, STEP-03)
// =============================================================================

describe('F060: buildNotificationText - prayer-aware designation', () => {
  // AC-060-5 / STEP-03: Opening prayer (position 0) in pt-BR
  it('designation with position=0 returns prayer title in pt-BR', () => {
    const result = buildNotificationText('designation', 'pt-BR', {
      position: 0,
      name: 'João',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Designação de Oração');
    expect(result.body).toContain('oração de abertura');
    expect(result.body).toContain('João');
  });

  // AC-060-5: Opening prayer (position 0) in en-US
  it('designation with position=0 returns prayer title in en-US', () => {
    const result = buildNotificationText('designation', 'en-US', {
      position: 0,
      name: 'John',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Prayer Assignment');
    expect(result.body).toContain('opening prayer');
    expect(result.body).toContain('John');
  });

  // AC-060-5: Closing prayer (position 4) in es-LA
  it('designation with position=4 returns prayer title in es-LA', () => {
    const result = buildNotificationText('designation', 'es-LA', {
      position: 4,
      name: 'Juan',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Asignación de Oración');
    expect(result.body).toContain('oración de clausura');
    expect(result.body).toContain('Juan');
  });

  // Closing prayer (position 4) in pt-BR
  it('designation with position=4 returns prayer title in pt-BR', () => {
    const result = buildNotificationText('designation', 'pt-BR', {
      position: 4,
      name: 'Maria',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Designação de Oração');
    expect(result.body).toContain('oração de encerramento');
    expect(result.body).toContain('Maria');
  });

  // Closing prayer (position 4) in en-US
  it('designation with position=4 returns prayer title in en-US', () => {
    const result = buildNotificationText('designation', 'en-US', {
      position: 4,
      name: 'Mary',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Prayer Assignment');
    expect(result.body).toContain('closing prayer');
    expect(result.body).toContain('Mary');
  });

  // Speech designation (no position) remains unchanged
  it('designation without position returns speech title (unchanged)', () => {
    const result = buildNotificationText('designation', 'pt-BR', {
      names: ['A', 'B'],
      date: '2026-03-08',
    });
    expect(result.title).toBe('Designação de Discurso');
  });

  // Speech designation (position 2) remains unchanged
  it('designation with position=2 returns speech title', () => {
    const result = buildNotificationText('designation', 'en-US', {
      names: ['A'],
      date: '2026-03-08',
      position: 2,
    });
    expect(result.title).toBe('Speech Assignment');
  });

  // EC-060-2: undefined position treated as speech fallback
  it('designation with undefined position returns speech title', () => {
    const result = buildNotificationText('designation', 'en-US', {
      names: ['A'],
      date: '2026-03-08',
    });
    expect(result.title).toBe('Speech Assignment');
  });
});
