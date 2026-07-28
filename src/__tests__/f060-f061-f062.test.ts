/**
 * Tests for F060 (Prayer-Aware Designation Notification Text),
 * F061 (User-Friendly Error Messages), and F062 (Refresh Session).
 *
 * CR-270, CR-271, CR-272
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import {
  buildNotificationText,
} from '../lib/notificationUtils';

// Helper: read source file relative to project root
const projectRoot = resolve(__dirname, '../..');
function readSource(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf-8');
}

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

describe('F060: server process-notifications prayer designation', () => {
  const serverSource = readSource('supabase/functions/process-notifications/index.ts');

  // AC-060-1/AC-060-2: Server buildDesignationText accepts position parameter
  it('buildDesignationText accepts position parameter', () => {
    expect(serverSource).toContain('position?: number | null');
  });

  // AC-060-1: Server uses prayer-specific title
  it('server uses prayer-specific titles', () => {
    expect(serverSource).toContain("title: 'Designação de Oração'");
    expect(serverSource).toContain("title: 'Prayer Assignment'");
    expect(serverSource).toContain("title: 'Asignación de Oración'");
  });

  // AC-060-4: Server separates prayer from speech in grouping
  it('server routes prayer positions to immediateEntries', () => {
    expect(serverSource).toContain('entry.speech_position === 0 || entry.speech_position === 4');
    expect(serverSource).toContain('immediateEntries.push(entry)');
  });

  // AC-060-4: Server has designation case in immediate entries switch
  it('server switch has designation case for individual prayer processing', () => {
    expect(serverSource).toContain("case 'designation':");
    expect(serverSource).toContain('entry.speech_position');
  });

  // AC-060-3: Server grouped designations use speech text
  it('server grouped designations call buildDesignationText without position', () => {
    // The grouped designation path calls buildDesignationText(language, names, sundayDate)
    // without the 4th position argument
    expect(serverSource).toContain('buildDesignationText(language, names, sundayDate)');
  });
});

// =============================================================================
// F061: Source code verification - error i18n applied correctly (STEP-04..07)
// =============================================================================

describe('F061: users.tsx error i18n (STEP-04)', () => {
  const usersSource = readSource('src/app/(tabs)/settings/users.tsx');

  // AC-061-1: Invite error uses i18n key, not raw error
  it('inviteMutation.onError uses t(users.inviteFailed)', () => {
    expect(usersSource).toContain("t('users.inviteFailed')");
  });

  it('inviteMutation.onError does NOT show raw err.message in alert body', () => {
    // The old code had: Alert.alert(t('common.error'), err.message || t('users.inviteFailed'))
    // The new code should NOT have err.message in the Alert body
    const onErrorBlock = usersSource.slice(
      usersSource.indexOf('onError: (err: Error)'),
      usersSource.indexOf('onError: (err: Error)') + 300
    );
    // Ensure err.message is not passed to Alert.alert
    expect(onErrorBlock).not.toContain("Alert.alert(t('common.error'), err.message");
  });

  // EC-061-1: auth/no-session maps to t('users.sessionExpired')
  it('auth/no-session maps to t(users.sessionExpired)', () => {
    expect(usersSource).toContain("err.message === 'auth/no-session'");
    expect(usersSource).toContain("t('users.sessionExpired')");
  });
});

describe('F061: invite/[token].tsx error i18n (STEP-05)', () => {
  const inviteSource = readSource('src/app/(auth)/invite/[token].tsx');

  // AC-061-2: Unknown data.error uses registrationFailed
  it('unknown data.error uses t(auth.registrationFailed)', () => {
    // After the 3 known codes (token_expired, token_used, token_invalid),
    // data?.error catch-all uses registrationFailed
    expect(inviteSource).toContain("setError(t('auth.registrationFailed'))");
  });

  // AC-061-2: Known codes preserved
  it('token_expired still maps to auth.inviteExpired', () => {
    expect(inviteSource).toContain("data?.error === 'token_expired'");
    expect(inviteSource).toContain("t('auth.inviteExpired')");
  });

  it('token_used still maps to auth.inviteUsed', () => {
    expect(inviteSource).toContain("data?.error === 'token_used'");
    expect(inviteSource).toContain("t('auth.inviteUsed')");
  });

  it('token_invalid still maps to auth.inviteInvalid', () => {
    expect(inviteSource).toContain("data?.error === 'token_invalid'");
    expect(inviteSource).toContain("t('auth.inviteInvalid')");
  });

  // AC-061-3: Non-network catch-all uses registrationFailed, not raw message
  it('catch-all non-network uses registrationFailed, not raw message', () => {
    // The catch block should have: setError(t('auth.registrationFailed'))
    // NOT: setError(message) for non-network errors
    const catchStart = inviteSource.indexOf("} catch (err: unknown) {");
    const catchBlock = inviteSource.slice(catchStart, catchStart + 300);
    // Should use registrationFailed for non-network
    expect(catchBlock).toContain("t('auth.registrationFailed')");
    // Should NOT use raw setError(message) - the old pattern
    expect(catchBlock).not.toContain('setError(message)');
  });

  // Regression: Network error still uses auth.requiresConnection
  it('network error still uses auth.requiresConnection', () => {
    expect(inviteSource).toContain("t('auth.requiresConnection')");
  });
});

describe('F061: settings/index.tsx error i18n (STEP-06)', () => {
  const settingsSource = readSource('src/app/(tabs)/settings/index.tsx');

  // AC-061-4: Language change error uses i18n
  it('handleAppLanguageSelect uses t(settings.languageChangeFailed)', () => {
    expect(settingsSource).toContain("t('settings.languageChangeFailed')");
  });

  // AC-061-5: Sign out error uses i18n
  it('handleSignOut uses t(settings.signOutFailed)', () => {
    expect(settingsSource).toContain("t('settings.signOutFailed')");
  });

  // AC-061-4/5: No String(err) in alerts
  it('no String(err) used in alert dialogs', () => {
    expect(settingsSource).not.toContain('String(err)');
  });
});

describe('F061: members.tsx error i18n (STEP-07)', () => {
  const membersSource = readSource('src/app/(tabs)/settings/members.tsx');

  // AC-061-8: Future speeches warning uses i18n
  it('handleDelete uses t(members.futureSpeechWarning)', () => {
    expect(membersSource).toContain("t('members.futureSpeechWarning'");
  });

  // AC-061-8: No hardcoded "future speeches" English text
  it('no hardcoded "future speeches" in English', () => {
    expect(membersSource).not.toContain('future speeches)');
  });

  // AC-061-6: RPC error uses i18n
  it('importMutation.onError uses t(members.importRpcError) for RPC errors', () => {
    expect(membersSource).toContain("t('members.importRpcError')");
  });

  // AC-061-7: CSV parse errors still show err.message (already i18n)
  it('CSV parse errors pass err.message to Alert', () => {
    // onError should show err.message when it detects CSV parse error
    expect(membersSource).toContain('err.message');
  });

  // EC-061-2/EC-061-3: Detection of CSV vs RPC errors
  it('distinguishes CSV parse errors from RPC errors in onError', () => {
    // The onError handler must have logic to differentiate CSV vs RPC errors
    const onErrorStart = membersSource.indexOf("onError: (err: Error)");
    const onErrorSection = membersSource.slice(onErrorStart, onErrorStart + 500);
    expect(onErrorSection).toContain("t('members.importRpcError')");
    expect(onErrorSection).toContain('err.message');
  });
});

// =============================================================================
// F062: Refresh Session Before Edge Function Invoke (STEP-04/CR-272)
// =============================================================================

describe('F062: callEdgeFunction uses refreshSession', () => {
  const usersSource = readSource('src/app/(tabs)/settings/users.tsx');

  // AC-062-1: callEdgeFunction uses refreshSession() not getSession()
  it('callEdgeFunction calls refreshSession', () => {
    // Extract callEdgeFunction body
    const fnStart = usersSource.indexOf('async function callEdgeFunction');
    const fnBody = usersSource.slice(fnStart, fnStart + 500);
    expect(fnBody).toContain('refreshSession()');
  });

  // AC-062-2: Throws auth/no-session when no session
  it('callEdgeFunction throws auth/no-session when session is null', () => {
    expect(usersSource).toContain("throw new Error('auth/no-session')");
  });

  // AC-062-2: Checks refreshError
  it('callEdgeFunction checks refreshError', () => {
    const fnStart = usersSource.indexOf('async function callEdgeFunction');
    const fnBody = usersSource.slice(fnStart, fnStart + 500);
    expect(fnBody).toContain('refreshError');
  });
});
