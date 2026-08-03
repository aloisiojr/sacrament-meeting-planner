/**
 * NOTE — five source-text describes were deleted from this file.
 *
 * They grepped four screens for literals like "t('users.sessionExpired')", "String(err)" and
 * 'refreshSession()'.
 *
 * Replaced by behaviour:
 *   users-screen-role-gates.test.tsx — an invitation failure shows the i18n key and never the raw
 *                                      server message; an expired session is reported distinctly;
 *                                      and refreshSession is called BEFORE the edge function
 *                                      (asserted on invocation order, which a grep cannot do)
 *   invite-token-error.test.ts       — extractInviteError reads the code from a non-2xx body
 *   settings-role-matrix.test.tsx    — the settings screen rendered per role and connectivity
 */

/**
 * Tests for F060 (Prayer-Aware Designation Notification Text),
 * F061 (User-Friendly Error Messages), and F062 (Refresh Session).
 *
 * CR-270, CR-271, CR-272
 */

import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import {
  buildNotificationText,
} from '../lib/notificationUtils';

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

  // AC-060-1: Opening prayer (position 0) in es-LA
  it('designation with position=0 returns prayer title in es-LA', () => {
    const result = buildNotificationText('designation', 'es-LA', {
      position: 0,
      name: 'María',
      date: '2026-03-08',
    });
    expect(result.title).toBe('Asignación de Oración');
    expect(result.body).toContain('oración de apertura');
    expect(result.body).toContain('María');
  });

  // AC-060-3: Speech designation body text verification (all languages)
  it('speech designation body lists names and date in pt-BR', () => {
    const result = buildNotificationText('designation', 'pt-BR', {
      names: ['Ana', 'Carlos'],
      date: '2026-03-08',
    });
    expect(result.title).toBe('Designação de Discurso');
    expect(result.body).toContain('Ana');
    expect(result.body).toContain('Carlos');
    expect(result.body).toContain('2026-03-08');
  });

  it('speech designation body lists names in en-US', () => {
    const result = buildNotificationText('designation', 'en-US', {
      names: ['Alice'],
      date: '2026-03-15',
    });
    expect(result.title).toBe('Speech Assignment');
    expect(result.body).toContain('Alice');
    expect(result.body).toContain('2026-03-15');
  });

  it('speech designation body lists names in es-LA', () => {
    const result = buildNotificationText('designation', 'es-LA', {
      names: ['Pedro', 'Luis'],
      date: '2026-03-22',
    });
    expect(result.title).toBe('Asignación de Discurso');
    expect(result.body).toContain('Pedro');
    expect(result.body).toContain('Luis');
  });

  // AC-060-5: Prayer designation body includes date
  it('prayer designation body includes date', () => {
    const result = buildNotificationText('designation', 'en-US', {
      position: 0,
      name: 'Bob',
      date: '2026-04-05',
    });
    expect(result.body).toContain('2026-04-05');
  });

  // EC-060-1: Both opening and closing prayer - each gets individual text
  it('opening and closing prayer produce different labels', () => {
    const opening = buildNotificationText('designation', 'pt-BR', {
      position: 0,
      name: 'João',
      date: '2026-03-08',
    });
    const closing = buildNotificationText('designation', 'pt-BR', {
      position: 4,
      name: 'Maria',
      date: '2026-03-08',
    });
    expect(opening.title).toBe(closing.title); // Both 'Designação de Oração'
    expect(opening.body).toContain('oração de abertura');
    expect(closing.body).toContain('oração de encerramento');
    expect(opening.body).not.toBe(closing.body); // Different bodies
  });
});

// =============================================================================
// F060: Server-side buildDesignationText verification (STEP-02)
// =============================================================================


// =============================================================================
// F061: Source code verification - error i18n applied correctly (STEP-04..07)
// =============================================================================





// =============================================================================
// F062: Refresh Session Before Edge Function Invoke (STEP-04/CR-272)
// =============================================================================

