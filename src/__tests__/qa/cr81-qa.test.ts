/**
 * Comprehensive QA Tests for CR-81: User Name Field
 *
 * Covers ALL 20 acceptance criteria and 7 edge cases from SPEC_CR81.
 *
 * Test strategy:
 * - Source-code analysis for UI components (deterministic, no flakiness)
 * - Unit tests for utility functions (logAction, createLogger)
 * - Type verification for database interfaces
 * - i18n key validation across all 3 locales
 * - Edge function contract validation via source inspection
 * - Migration SQL validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read a file relative to src/ */
function readSourceFile(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', relativePath),
    'utf-8'
  );
}

/** Read a file relative to project root */
function readProjectFile(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', relativePath),
    'utf-8'
  );
}

// ── Source files (read once) ───────────────────────────────────────────────

const registerSource = readSourceFile('app/(auth)/register.tsx');
const tokenSource = readSourceFile('app/(auth)/invite/[token].tsx');
const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
const historySource = readSourceFile('app/(tabs)/settings/history.tsx');
const authContextSource = readSourceFile('contexts/AuthContext.tsx');
const activityLogSource = readSourceFile('lib/activityLog.ts');
const offlineGuardSource = readSourceFile('lib/offlineGuard.ts');
const databaseTypesSource = readSourceFile('types/database.ts');
const useActivityLogSource = readSourceFile('hooks/useActivityLog.ts');

const registerFirstUserSource = readProjectFile(
  'supabase/functions/register-first-user/index.ts'
);
const registerInvitedUserSource = readProjectFile(
  'supabase/functions/register-invited-user/index.ts'
);
const updateUserNameSource = readProjectFile(
  'supabase/functions/update-user-name/index.ts'
);
const updateUserRoleSource = readProjectFile(
  'supabase/functions/update-user-role/index.ts'
);
const listUsersSource = readProjectFile(
  'supabase/functions/list-users/index.ts'
);
const createInvitationSource = readProjectFile(
  'supabase/functions/create-invitation/index.ts'
);
const migrationSource = readProjectFile(
  'supabase/migrations/011_add_user_name_support.sql'
);

const ptBR = require('../../i18n/locales/pt-BR.json');
const en = require('../../i18n/locales/en.json');
const es = require('../../i18n/locales/es.json');

// Hook sources
const useActorsSource = readSourceFile('hooks/useActors.ts');
const useMembersSource = readSourceFile('hooks/useMembers.ts');
const useSpeechesSource = readSourceFile('hooks/useSpeeches.ts');
const useAgendaSource = readSourceFile('hooks/useAgenda.ts');
const useTopicsSource = readSourceFile('hooks/useTopics.ts');
const useSundayTypesSource = readSourceFile('hooks/useSundayTypes.ts');

// =============================================================================
// AC-1: Self-registration Name field as first input
// =============================================================================

describe('AC-1: Self-registration screen Name field', () => {
  it('register.tsx has a fullName state variable', () => {
    expect(registerSource).toContain("const [fullName, setFullName] = useState('')");
  });

  it('register.tsx renders Name TextInput before Email TextInput', () => {
    const nameInputIdx = registerSource.indexOf("t('auth.fullName')");
    const emailInputIdx = registerSource.indexOf("t('auth.email')");
    expect(nameInputIdx).toBeGreaterThan(-1);
    expect(emailInputIdx).toBeGreaterThan(-1);
    expect(nameInputIdx).toBeLessThan(emailInputIdx);
  });

  it('register.tsx Name input uses autoCapitalize="words"', () => {
    // Find the Name input block
    const nameBlockStart = registerSource.indexOf('{/* Full Name */}');
    const emailBlockStart = registerSource.indexOf('{/* Email */}');
    expect(nameBlockStart).toBeGreaterThan(-1);
    const nameBlock = registerSource.slice(nameBlockStart, emailBlockStart);
    expect(nameBlock).toContain('autoCapitalize="words"');
  });

  it('register.tsx Name input uses correct i18n label key', () => {
    const nameBlockStart = registerSource.indexOf('{/* Full Name */}');
    const emailBlockStart = registerSource.indexOf('{/* Email */}');
    const nameBlock = registerSource.slice(nameBlockStart, emailBlockStart);
    expect(nameBlock).toContain("t('auth.fullName')");
  });

  it('register.tsx Name input uses correct i18n placeholder key', () => {
    const nameBlockStart = registerSource.indexOf('{/* Full Name */}');
    const emailBlockStart = registerSource.indexOf('{/* Email */}');
    const nameBlock = registerSource.slice(nameBlockStart, emailBlockStart);
    expect(nameBlock).toContain("t('auth.fullNamePlaceholder')");
  });

  it('register.tsx Name field is the first form input (before all other inputs)', () => {
    const returnIdx = registerSource.indexOf('return (');
    const afterReturn = registerSource.slice(returnIdx);
    const formStart = afterReturn.indexOf('<View style={styles.formContainer}>');
    const formContent = afterReturn.slice(formStart);

    // Find first TextInput with onChangeText
    const firstEditableInput = formContent.match(
      /onChangeText=\{(\w+)\}/
    );
    expect(firstEditableInput).not.toBeNull();
    expect(firstEditableInput![1]).toBe('setFullName');
  });
});

// =============================================================================
// AC-2: Self-registration validates empty name
// =============================================================================

describe('AC-2: Self-registration name validation', () => {
  it('validate() checks fullName.trim() as the first validation rule', () => {
    const validateFn = registerSource.match(
      /const validate[\s\S]*?return null;\s*\}/
    );
    expect(validateFn).not.toBeNull();
    const validateBody = validateFn![0];

    // fullName check should come before email check
    const nameCheckIdx = validateBody.indexOf('fullName.trim()');
    const emailCheckIdx = validateBody.indexOf('email.trim()');
    expect(nameCheckIdx).toBeGreaterThan(-1);
    expect(emailCheckIdx).toBeGreaterThan(-1);
    expect(nameCheckIdx).toBeLessThan(emailCheckIdx);
  });

  it('validate() returns auth.nameRequired when name is empty', () => {
    const validateFn = registerSource.match(
      /const validate[\s\S]*?return null;\s*\}/
    );
    expect(validateFn).not.toBeNull();
    expect(validateFn![0]).toContain("t('auth.nameRequired')");
  });
});

// =============================================================================
// AC-3: Self-registration sends fullName to edge function
// =============================================================================

describe('AC-3: Self-registration sends fullName in request body', () => {
  it('register.tsx sends fullName.trim() in edge function body', () => {
    expect(registerSource).toContain('fullName: fullName.trim()');
  });

  it('register.tsx calls register-first-user edge function', () => {
    expect(registerSource).toContain("'register-first-user'");
  });

  it('register-first-user EF stores full_name in app_metadata', () => {
    expect(registerFirstUserSource).toContain(
      'full_name: input.fullName.trim()'
    );
  });
});

// =============================================================================
// AC-4: Invite registration Name field
// =============================================================================

describe('AC-4: Invite registration screen Name field', () => {
  it('[token].tsx has a fullName state variable', () => {
    expect(tokenSource).toContain("const [fullName, setFullName] = useState('')");
  });

  it('[token].tsx renders Name input AFTER read-only email field', () => {
    // The read-only email field is before the fullName input
    const emailReadOnly = tokenSource.indexOf("t('auth.email')");
    const nameInput = tokenSource.indexOf("t('auth.fullName')");
    expect(emailReadOnly).toBeGreaterThan(-1);
    expect(nameInput).toBeGreaterThan(-1);
    expect(nameInput).toBeGreaterThan(emailReadOnly);
  });

  it('[token].tsx renders Name input BEFORE password fields', () => {
    const nameInputIdx = tokenSource.indexOf('{/* Full Name */}');
    const passwordIdx = tokenSource.indexOf('{/* Password fields */}');
    expect(nameInputIdx).toBeGreaterThan(-1);
    expect(passwordIdx).toBeGreaterThan(-1);
    expect(nameInputIdx).toBeLessThan(passwordIdx);
  });

  it('[token].tsx Name input uses autoCapitalize="words"', () => {
    const nameBlockStart = tokenSource.indexOf('{/* Full Name */}');
    const passwordBlockStart = tokenSource.indexOf('{/* Password fields */}');
    const nameBlock = tokenSource.slice(nameBlockStart, passwordBlockStart);
    expect(nameBlock).toContain('autoCapitalize="words"');
  });

  it('[token].tsx Name input is editable (not read-only)', () => {
    const nameBlockStart = tokenSource.indexOf('{/* Full Name */}');
    const passwordBlockStart = tokenSource.indexOf('{/* Password fields */}');
    const nameBlock = tokenSource.slice(nameBlockStart, passwordBlockStart);
    // It should NOT have readOnlyInput style or editable={false}
    expect(nameBlock).not.toContain('styles.readOnlyInput');
    expect(nameBlock).not.toContain('editable={false}');
  });
});

// =============================================================================
// AC-5: Invite registration validates empty name
// =============================================================================

describe('AC-5: Invite registration name validation', () => {
  it('handleRegister checks fullName.trim() before password check', () => {
    const handleFn = tokenSource.match(
      /const handleRegister[\s\S]*?setSubmitting\(false\);\s*\}\s*\}/
    );
    expect(handleFn).not.toBeNull();
    const handleBody = handleFn![0];

    const nameCheckIdx = handleBody.indexOf('fullName.trim()');
    const passwordCheckIdx = handleBody.indexOf('password.length < 6');
    expect(nameCheckIdx).toBeGreaterThan(-1);
    expect(passwordCheckIdx).toBeGreaterThan(-1);
    expect(nameCheckIdx).toBeLessThan(passwordCheckIdx);
  });

  it('handleRegister uses auth.nameRequired error key', () => {
    expect(tokenSource).toContain("t('auth.nameRequired')");
  });
});

// =============================================================================
// AC-6: Invite registration sends fullName to edge function
// =============================================================================

describe('AC-6: Invite registration sends fullName in request body', () => {
  it('[token].tsx sends fullName.trim() in edge function body', () => {
    expect(tokenSource).toContain('fullName: fullName.trim()');
  });

  it('[token].tsx calls register-invited-user edge function', () => {
    expect(tokenSource).toContain("'register-invited-user'");
  });

  it('register-invited-user EF stores full_name in app_metadata', () => {
    expect(registerInvitedUserSource).toContain(
      'full_name: input.fullName.trim()'
    );
  });
});

// =============================================================================
// AC-7: register-first-user auto-creates actor for bishopric
// =============================================================================

describe('AC-7: register-first-user auto-actor creation for bishopric', () => {
  it('register-first-user creates actor when role is bishopric', () => {
    expect(registerFirstUserSource).toContain(
      "if (input.role === 'bishopric')"
    );
  });

  it('actor name comes from fullName, not email', () => {
    expect(registerFirstUserSource).toContain(
      'const actorName = input.fullName.trim()'
    );
  });

  it('actor has can_preside=true and can_conduct=true', () => {
    // Inside the auto-actor block
    const actorBlock = registerFirstUserSource.slice(
      registerFirstUserSource.indexOf("if (input.role === 'bishopric')")
    );
    expect(actorBlock).toContain('can_preside: true');
    expect(actorBlock).toContain('can_conduct: true');
  });

  it('auto-actor creation is best-effort (errors caught)', () => {
    expect(registerFirstUserSource).toContain(
      'Auto-actor creation failed:'
    );
  });

  it('checks for existing actor with ilike match', () => {
    const actorBlock = registerFirstUserSource.slice(
      registerFirstUserSource.indexOf("if (input.role === 'bishopric')")
    );
    expect(actorBlock).toContain('.ilike(');
  });

  it('updates existing actor flags if needed', () => {
    const actorBlock = registerFirstUserSource.slice(
      registerFirstUserSource.indexOf("if (input.role === 'bishopric')")
    );
    expect(actorBlock).toContain(
      'if (!existing.can_preside || !existing.can_conduct)'
    );
  });
});

// =============================================================================
// AC-8: list_ward_users RPC returns full_name
// =============================================================================

describe('AC-8: list_ward_users RPC returns full_name', () => {
  it('migration adds full_name to list_ward_users RETURNS TABLE', () => {
    expect(migrationSource).toContain('full_name text');
  });

  it('migration uses COALESCE for backward compatibility', () => {
    expect(migrationSource).toContain(
      "COALESCE(u.raw_app_meta_data->>'full_name', '') AS full_name"
    );
  });

  it('migration returns 5 columns: id, email, role, full_name, created_at', () => {
    const returnsBlock = migrationSource.match(
      /RETURNS TABLE[\s\S]*?\)/
    );
    expect(returnsBlock).not.toBeNull();
    const block = returnsBlock![0];
    expect(block).toContain('id uuid');
    expect(block).toContain('email text');
    expect(block).toContain('role text');
    expect(block).toContain('full_name text');
    expect(block).toContain('created_at timestamptz');
  });
});

// =============================================================================
// AC-9: Users screen shows full_name as primary text
// =============================================================================

describe('AC-9: Users screen name display', () => {
  it('WardUser interface includes full_name field', () => {
    expect(usersSource).toContain('full_name: string');
  });

  it('user card shows full_name with email fallback', () => {
    expect(usersSource).toContain('{u.full_name || u.email}');
  });

  it('user card header displays role below name', () => {
    const headerBlock = usersSource.slice(
      usersSource.indexOf('<View style={styles.userHeader}>')
    );
    const nameIdx = headerBlock.indexOf('u.full_name || u.email');
    const roleIdx = headerBlock.indexOf("t(`roles.${u.role}`)");
    expect(nameIdx).toBeGreaterThan(-1);
    expect(roleIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeLessThan(roleIdx);
  });
});

// =============================================================================
// AC-10: Legacy user (no name) shows email as primary
// =============================================================================

describe('AC-10: Legacy user backward compatibility in Users screen', () => {
  it('uses || fallback operator for name display', () => {
    expect(usersSource).toContain('u.full_name || u.email');
  });

  it('expanded card only shows name field if full_name is non-empty', () => {
    // The pattern: {u.full_name ? ( ... ) : null}
    expect(usersSource).toContain('u.full_name ? (');
  });
});

// =============================================================================
// AC-11: Self card expanded shows editable name (NOT IMPLEMENTED - READ-ONLY)
// AC-12: Save calls update-user-name and refreshes
// AC-13: Other user card shows name as read-only
// =============================================================================

describe('AC-11/AC-12/AC-13: Users screen name edit behavior', () => {
  it('self user card expanded shows editable TextInput for name', () => {
    // When isSelf is true, expanded card should show TextInput (not read-only Text)
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    // Self user gets editable input
    expect(expandedSection).toContain('isSelf ?');
    expect(expandedSection).toContain('editingName');
    expect(expandedSection).toContain('setEditingName');
    expect(expandedSection).toContain('styles.nameInput');
  });

  it('self user card has Save button in expanded section', () => {
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    expect(expandedSection).toContain('styles.saveButton');
    expect(expandedSection).toContain('styles.saveButtonText');
    expect(expandedSection).toContain("t('common.save')");
  });

  it('Save button calls handleSaveName with current full_name', () => {
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    expect(expandedSection).toContain('handleSaveName(u.full_name)');
  });

  it('Save button is disabled when name is unchanged', () => {
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    expect(expandedSection).toContain('editingName.trim() === u.full_name');
  });

  it('Save button is disabled when name is empty', () => {
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    expect(expandedSection).toContain('!editingName.trim()');
  });

  it('users.tsx has updateNameMutation that calls update-user-name EF', () => {
    expect(usersSource).toContain('updateNameMutation');
    expect(usersSource).toContain("callEdgeFunction('update-user-name'");
  });

  it('updateNameMutation onSuccess invalidates users query', () => {
    expect(usersSource).toContain(
      'queryClient.invalidateQueries({ queryKey: userManagementKeys.users })'
    );
  });

  it('updateNameMutation onSuccess refreshes auth session', () => {
    expect(usersSource).toContain('supabase.auth.refreshSession()');
  });

  it('updateNameMutation onSuccess shows nameUpdated alert', () => {
    expect(usersSource).toContain("t('users.nameUpdated')");
  });

  it('updateNameMutation onError shows nameUpdateFailed alert', () => {
    expect(usersSource).toContain("t('users.nameUpdateFailed')");
  });

  it('other user card shows name as read-only text (not TextInput)', () => {
    // Non-self users get read-only Text display
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    // After the isSelf ternary, the else branch shows fieldValue style
    expect(expandedSection).toContain('styles.fieldValue');
    expect(expandedSection).toContain('{u.full_name}');
  });

  it('other user card shows email as read-only text', () => {
    expect(usersSource).toContain('{u.email}');
  });

  it('delete button is hidden for self user', () => {
    expect(usersSource).toContain('{!isSelf && (');
  });

  it('role selector is disabled for self user', () => {
    expect(usersSource).toContain('disabled={isSelf');
  });

  it('editingName is initialized when expanding self card', () => {
    expect(usersSource).toContain('setEditingName(u.full_name)');
  });

  it('TextInput for self uses autoCapitalize words', () => {
    const expandedSection = usersSource.slice(
      usersSource.indexOf('<View style={[styles.expandedSection')
    );
    expect(expandedSection).toContain('autoCapitalize="words"');
  });
});

// =============================================================================
// AC-14: update-user-name edge function
// =============================================================================

describe('AC-14: update-user-name edge function', () => {
  it('EF exists as a separate file', () => {
    expect(updateUserNameSource.length).toBeGreaterThan(0);
  });

  it('validates JWT from Authorization header', () => {
    expect(updateUserNameSource).toContain("req.headers.get('Authorization')");
  });

  it('gets caller from JWT token', () => {
    expect(updateUserNameSource).toContain('supabaseAdmin.auth.getUser(token)');
  });

  it('validates fullName is non-empty', () => {
    expect(updateUserNameSource).toContain('!fullName.trim()');
  });

  it('returns 400 when fullName is empty', () => {
    expect(updateUserNameSource).toContain("{ error: 'Name is required' }");
    expect(updateUserNameSource).toContain('status: 400');
  });

  it('updates caller own app_metadata.full_name only', () => {
    expect(updateUserNameSource).toContain(
      'supabaseAdmin.auth.admin.updateUserById'
    );
    expect(updateUserNameSource).toContain('caller.id');
  });

  it('spreads existing app_metadata to preserve ward_id and role', () => {
    expect(updateUserNameSource).toContain('...caller.app_metadata');
  });

  it('returns success response', () => {
    expect(updateUserNameSource).toContain("{ success: true }");
  });

  it('does NOT accept a targetUserId parameter', () => {
    expect(updateUserNameSource).not.toContain('targetUserId');
  });

  it('handles CORS preflight', () => {
    expect(updateUserNameSource).toContain("req.method === 'OPTIONS'");
    expect(updateUserNameSource).toContain('Access-Control-Allow-Origin');
  });
});

// =============================================================================
// AC-15: Activity log includes user_name column
// =============================================================================

// Mock supabase before any imports that use it
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('AC-15: Activity log user_name column', () => {
  it('migration adds user_name column to activity_log', () => {
    expect(migrationSource).toContain(
      'ALTER TABLE activity_log'
    );
    expect(migrationSource).toContain(
      'ADD COLUMN user_name TEXT'
    );
  });

  it('ActivityLog interface has user_name: string | null', () => {
    expect(databaseTypesSource).toContain('user_name: string | null');
  });

  it('logAction accepts optional userName as 6th parameter', () => {
    expect(activityLogSource).toContain('userName?: string');
  });

  it('logAction inserts user_name using userName || null', () => {
    expect(activityLogSource).toContain('user_name: userName || null');
  });

  it('createLogger accepts optional userName as 4th parameter', () => {
    const createLoggerSignature = activityLogSource.match(
      /export function createLogger\([^)]+\)/
    );
    expect(createLoggerSignature).not.toBeNull();
    expect(createLoggerSignature![0]).toContain('userName?: string');
  });

  it('createLogger passes userName to logAction', () => {
    expect(activityLogSource).toContain(
      'logAction(wardId, userId, userEmail, actionType, description, userName)'
    );
  });

  it('all hooks pass userName to logAction calls', () => {
    const hookSources = [
      { name: 'useActors', source: useActorsSource },
      { name: 'useMembers', source: useMembersSource },
      { name: 'useSpeeches', source: useSpeechesSource },
      { name: 'useAgenda', source: useAgendaSource },
      { name: 'useTopics', source: useTopicsSource },
      { name: 'useSundayTypes', source: useSundayTypesSource },
    ];

    for (const { name, source } of hookSources) {
      // Each hook must destructure userName from useAuth
      expect(source).toContain('userName');

      // Every logAction call should have 6 arguments (including userName)
      const logActionCalls = source.match(/logAction\([^)]+\)/g) ?? [];
      expect(logActionCalls.length).toBeGreaterThan(0);
      for (const call of logActionCalls) {
        // Count commas to verify 6 arguments (5 commas = 6 args)
        const commaCount = (call.match(/,/g) ?? []).length;
        expect(commaCount).toBe(5);
      }
    }
  });
});

// =============================================================================
// AC-16: Activity Log screen shows user_name with email fallback
// =============================================================================

describe('AC-16: Activity Log screen name display', () => {
  it('history.tsx displays user_name with email fallback', () => {
    expect(historySource).toContain(
      '{item.user_name || item.user_email}'
    );
  });

  it('ActivityLogEntry component receives item with correct type', () => {
    expect(historySource).toContain('item: ActivityLog');
  });
});

// =============================================================================
// AC-17: update-user-role uses full_name for auto-actor
// =============================================================================

describe('AC-17: update-user-role uses full_name for auto-actor', () => {
  it('reads full_name from target user app_metadata', () => {
    expect(updateUserRoleSource).toContain(
      "targetUser.app_metadata?.full_name"
    );
  });

  it('uses full_name when available', () => {
    expect(updateUserRoleSource).toContain('fullName');
    expect(updateUserRoleSource).toContain('fullName.trim()');
  });

  it('falls back to email prefix when full_name is absent', () => {
    // The ternary: fullName ? fullName.trim() : (email-based derivation)
    expect(updateUserRoleSource).toContain("targetUser.email ?? ''");
    expect(updateUserRoleSource).toContain(".split('@')[0]");
  });

  it('auto-actor is only created for bishopric role', () => {
    expect(updateUserRoleSource).toContain(
      "if (input.newRole === 'bishopric')"
    );
  });
});

// =============================================================================
// AC-18: create-invitation unchanged (still uses email prefix)
// =============================================================================

describe('AC-18: create-invitation unchanged', () => {
  it('create-invitation still uses email for actor name', () => {
    expect(createInvitationSource).toContain("input.email");
    expect(createInvitationSource).toContain(".split('@')[0]");
  });

  it('create-invitation does NOT reference full_name or fullName', () => {
    expect(createInvitationSource).not.toContain('full_name');
    expect(createInvitationSource).not.toContain('fullName');
  });
});

// =============================================================================
// AC-19: i18n keys in all 3 locales
// =============================================================================

describe('AC-19: i18n keys for user name feature', () => {
  const requiredAuthKeys = [
    'fullName',
    'fullNamePlaceholder',
    'nameRequired',
  ];
  const requiredUserKeys = ['name', 'nameUpdated', 'nameUpdateFailed'];

  describe('pt-BR locale', () => {
    for (const key of requiredAuthKeys) {
      it(`has auth.${key}`, () => {
        expect(ptBR.auth[key]).toBeTruthy();
      });
    }
    for (const key of requiredUserKeys) {
      it(`has users.${key}`, () => {
        expect(ptBR.users[key]).toBeTruthy();
      });
    }

    it('auth.fullName = "Nome"', () => {
      expect(ptBR.auth.fullName).toBe('Nome');
    });

    it('auth.fullNamePlaceholder = "Seu nome completo"', () => {
      expect(ptBR.auth.fullNamePlaceholder).toBe('Seu nome completo');
    });

    it('auth.nameRequired = "Nome \u00e9 obrigat\u00f3rio"', () => {
      expect(ptBR.auth.nameRequired).toBe('Nome \u00e9 obrigat\u00f3rio');
    });
  });

  describe('en locale', () => {
    for (const key of requiredAuthKeys) {
      it(`has auth.${key}`, () => {
        expect(en.auth[key]).toBeTruthy();
      });
    }
    for (const key of requiredUserKeys) {
      it(`has users.${key}`, () => {
        expect(en.users[key]).toBeTruthy();
      });
    }

    it('auth.fullName = "Name"', () => {
      expect(en.auth.fullName).toBe('Name');
    });

    it('auth.nameRequired = "Name is required"', () => {
      expect(en.auth.nameRequired).toBe('Name is required');
    });
  });

  describe('es locale', () => {
    for (const key of requiredAuthKeys) {
      it(`has auth.${key}`, () => {
        expect(es.auth[key]).toBeTruthy();
      });
    }
    for (const key of requiredUserKeys) {
      it(`has users.${key}`, () => {
        expect(es.users[key]).toBeTruthy();
      });
    }

    it('auth.fullName = "Nombre"', () => {
      expect(es.auth.fullName).toBe('Nombre');
    });

    it('auth.nameRequired = "Nombre es obligatorio"', () => {
      expect(es.auth.nameRequired).toBe('Nombre es obligatorio');
    });
  });
});

// =============================================================================
// AC-20: Activity log search includes user_name
// =============================================================================

describe('AC-20: Activity log search includes user_name', () => {
  it('useActivityLog .or() filter includes user_name.ilike', () => {
    expect(useActivityLogSource).toContain('user_name.ilike');
  });

  it('search filter includes both user_email and user_name', () => {
    expect(useActivityLogSource).toContain('user_email.ilike');
    expect(useActivityLogSource).toContain('user_name.ilike');
  });
});

// =============================================================================
// EC-1: Existing users without full_name
// =============================================================================

describe('EC-1: Backward compatibility for users without full_name', () => {
  it('users.tsx falls back to email when full_name is empty', () => {
    expect(usersSource).toContain('u.full_name || u.email');
  });

  it('history.tsx falls back to email when user_name is null', () => {
    expect(historySource).toContain(
      'item.user_name || item.user_email'
    );
  });

  it('migration uses COALESCE for full_name (empty string default)', () => {
    expect(migrationSource).toContain(
      "COALESCE(u.raw_app_meta_data->>'full_name', '')"
    );
  });

  it('AuthContext returns empty string when full_name is absent', () => {
    expect(authContextSource).toContain(
      "user.app_metadata?.full_name ?? ''"
    );
  });

  it('update-user-role falls back to email prefix for auto-actor', () => {
    // Should have a ternary with email fallback
    const autoActorBlock = updateUserRoleSource.slice(
      updateUserRoleSource.indexOf("if (input.newRole === 'bishopric')")
    );
    expect(autoActorBlock).toContain(".split('@')[0]");
    expect(autoActorBlock).toContain(".replace(/[._]/g, ' ')");
  });
});

// =============================================================================
// EC-2: Empty/whitespace name during registration
// =============================================================================

describe('EC-2: Empty/whitespace name validation', () => {
  it('register.tsx validates name with .trim()', () => {
    expect(registerSource).toContain('!fullName.trim()');
  });

  it('[token].tsx validates name with .trim()', () => {
    expect(tokenSource).toContain('!fullName.trim()');
  });

  it('register-first-user EF validates fullName server-side', () => {
    expect(registerFirstUserSource).toContain("!input.fullName?.trim()");
  });

  it('register-first-user EF returns 400 for empty name', () => {
    // Find the fullName validation block
    const validationBlock = registerFirstUserSource.slice(
      registerFirstUserSource.indexOf("!input.fullName?.trim()")
    );
    expect(validationBlock).toContain('status: 400');
    expect(validationBlock).toContain("'Name is required'");
  });

  it('register-invited-user EF validates fullName server-side', () => {
    expect(registerInvitedUserSource).toContain("!input.fullName?.trim()");
  });

  it('update-user-name EF validates fullName server-side', () => {
    expect(updateUserNameSource).toContain('!fullName.trim()');
  });
});

// =============================================================================
// EC-3: Very long name (>200 characters)
// =============================================================================

describe('EC-3: Long name handling', () => {
  it('no maxLength constraint on register.tsx Name input', () => {
    // Extract the name TextInput block
    const nameBlockStart = registerSource.indexOf('{/* Full Name */}');
    const emailBlockStart = registerSource.indexOf('{/* Email */}');
    const nameBlock = registerSource.slice(nameBlockStart, emailBlockStart);
    expect(nameBlock).not.toContain('maxLength');
  });

  it('no maxLength constraint on [token].tsx Name input', () => {
    const nameBlockStart = tokenSource.indexOf('{/* Full Name */}');
    const passwordBlockStart = tokenSource.indexOf('{/* Password fields */}');
    const nameBlock = tokenSource.slice(nameBlockStart, passwordBlockStart);
    expect(nameBlock).not.toContain('maxLength');
  });

  it('no server-side length validation in register-first-user EF', () => {
    // Should not have any length check for fullName (per CR-81)
    expect(registerFirstUserSource).not.toContain('fullName.length');
    expect(registerFirstUserSource).not.toContain('fullName.trim().length >');
  });

  it('no server-side length validation in update-user-name EF', () => {
    expect(updateUserNameSource).not.toContain('fullName.length >');
    expect(updateUserNameSource).not.toContain('fullName.trim().length >');
  });
});

// =============================================================================
// EC-4: User edits name to same value (no change)
// EC-5: Name edit API failure
// NOTE: These require the self-edit feature. Current implementation shows
//       name as read-only in expanded cards. Documenting as gap.
// =============================================================================

describe('EC-4/EC-5: Name edit behavior (self-edit feature)', () => {
  it('handleSaveName has no-change guard (EC-4)', () => {
    // handleSaveName should skip API call when name is unchanged
    expect(usersSource).toContain('editingName.trim() === currentFullName');
  });

  it('handleSaveName has empty-name guard', () => {
    expect(usersSource).toContain("if (!editingName.trim()) return");
  });

  it('updateNameMutation onError reverts editingName (EC-5)', () => {
    // On error, editingName should revert to the current user's full_name
    expect(usersSource).toContain('setEditingName(currentFullName)');
  });

  it('users.tsx has updateNameMutation calling update-user-name EF', () => {
    expect(usersSource).toContain("callEdgeFunction('update-user-name'");
    expect(usersSource).toContain('fullName: newName.trim()');
  });

  it('update-user-name is in ONLINE_ONLY_OPERATIONS', () => {
    expect(offlineGuardSource).toContain("'update-user-name'");
  });

  it('updateNameMutation logs the name change to activity log (R-5)', () => {
    expect(usersSource).toContain("'user:name-update'");
    expect(usersSource).toContain('logAction');
  });
});

// =============================================================================
// EC-6: Legacy activity_log entries (user_name is NULL)
// =============================================================================

describe('EC-6: Legacy activity_log entries', () => {
  it('user_name column is nullable (TEXT without NOT NULL)', () => {
    // The migration just adds TEXT without NOT NULL constraint
    expect(migrationSource).toContain('ADD COLUMN user_name TEXT');
    expect(migrationSource).not.toContain('NOT NULL');
  });

  it('history.tsx shows email for entries with null user_name', () => {
    // JavaScript || operator: null || 'email' => 'email'
    expect(historySource).toContain(
      'item.user_name || item.user_email'
    );
  });

  it('ActivityLog type allows null user_name', () => {
    expect(databaseTypesSource).toContain('user_name: string | null');
  });

  it('logAction inserts null when userName is not provided', () => {
    // userName || null: undefined || null => null
    expect(activityLogSource).toContain('user_name: userName || null');
  });
});

// =============================================================================
// EC-7: Two users with the same full_name
// =============================================================================

describe('EC-7: Duplicate names allowed', () => {
  it('no unique constraint on full_name in migration', () => {
    expect(migrationSource).not.toContain('UNIQUE');
  });

  it('no unique validation on fullName in register-first-user EF', () => {
    // Should not have any UNIQUE constraint enforcement for names
    // The full_name references in register-first-user are only for storing in app_metadata
    // and for deriving actor name, NOT for uniqueness checks
    expect(registerFirstUserSource).not.toContain('.eq(\'full_name\'');
    // No error is returned for duplicate names
    expect(registerFirstUserSource).not.toContain('duplicate name');
    expect(registerFirstUserSource).not.toContain('name_exists');
  });

  it('no unique validation on fullName in update-user-name EF', () => {
    // Should not query for existing users with same name
    const queries = updateUserNameSource.match(/\.from\(['"]auth\.users['"]\)/g);
    expect(queries).toBeNull(); // No direct queries to auth.users
  });
});

// =============================================================================
// AuthContext: userName from app_metadata
// =============================================================================

describe('AuthContext: userName exposure', () => {
  it('AuthContextValue interface has userName: string field', () => {
    expect(authContextSource).toContain('userName: string;');
  });

  it('extractUserName function exists', () => {
    expect(authContextSource).toContain(
      'function extractUserName(user: User | null): string'
    );
  });

  it('extractUserName reads from app_metadata.full_name', () => {
    expect(authContextSource).toContain(
      "user.app_metadata?.full_name ?? ''"
    );
  });

  it('extractUserName returns empty string for null user', () => {
    expect(authContextSource).toContain("if (!user) return ''");
  });

  it('userName is in the provider value object', () => {
    // Check that the useMemo value object includes userName
    // The value object is between "() => ({" and "})" in the useMemo block
    const memoStart = authContextSource.indexOf('const value = useMemo');
    expect(memoStart).toBeGreaterThan(-1);
    const memoBlock = authContextSource.slice(memoStart, authContextSource.indexOf(');', memoStart + 100) + 2);
    expect(memoBlock).toContain('userName,');
  });

  it('userName is in useMemo dependency array', () => {
    // Check that userName appears in the dependency array
    // The deps array is on the line with [session, user, role, ...]
    const memoStart = authContextSource.indexOf('const value = useMemo');
    const memoBlock = authContextSource.slice(memoStart, authContextSource.indexOf(');', memoStart + 100) + 2);
    // Find the dependency array (the [...] after the closing })
    const depsLine = memoBlock.match(/\[session[^\]]+\]/);
    expect(depsLine).not.toBeNull();
    expect(depsLine![0]).toContain('userName');
  });
});

// =============================================================================
// Edge Function Registration Contracts
// =============================================================================

describe('Edge Function registration contracts', () => {
  it('register-first-user RegisterInput has fullName field', () => {
    expect(registerFirstUserSource).toContain('fullName: string');
  });

  it('register-invited-user RegisterInvitedInput has fullName field', () => {
    expect(registerInvitedUserSource).toContain('fullName: string');
  });

  it('list-users WardUser interface has full_name field', () => {
    expect(listUsersSource).toContain('full_name: string');
  });

  it('register-first-user sends fullName in app_metadata (not just storing)', () => {
    const appMetadataBlock = registerFirstUserSource.match(
      /app_metadata:\s*\{[\s\S]*?\}/
    );
    expect(appMetadataBlock).not.toBeNull();
    expect(appMetadataBlock![0]).toContain('full_name');
  });
});

// =============================================================================
// Database migration validation
// =============================================================================

describe('Database migration: 011_add_user_name_support.sql', () => {
  it('migration file exists', () => {
    expect(migrationSource.length).toBeGreaterThan(0);
  });

  it('adds user_name column to activity_log', () => {
    expect(migrationSource).toContain(
      'ALTER TABLE activity_log'
    );
    expect(migrationSource).toContain(
      'ADD COLUMN user_name TEXT'
    );
  });

  it('creates or replaces list_ward_users function', () => {
    expect(migrationSource).toContain(
      'CREATE OR REPLACE FUNCTION list_ward_users'
    );
  });

  it('RPC uses SECURITY DEFINER', () => {
    expect(migrationSource).toContain('SECURITY DEFINER');
  });

  it('RPC uses STABLE for query optimization', () => {
    expect(migrationSource).toContain('STABLE');
  });

  it('RPC filters by ward_id from raw_app_meta_data', () => {
    expect(migrationSource).toContain(
      "u.raw_app_meta_data->>'ward_id' = target_ward_id::text"
    );
  });

  it('RPC orders by created_at ASC', () => {
    expect(migrationSource).toContain('ORDER BY u.created_at ASC');
  });
});

// =============================================================================
// No regressions: existing features not broken
// =============================================================================

describe('No regressions', () => {
  it('register.tsx still validates email', () => {
    expect(registerSource).toContain("!email.trim()");
  });

  it('register.tsx still validates password length', () => {
    expect(registerSource).toContain('password.length < 6');
  });

  it('register.tsx still validates password match', () => {
    expect(registerSource).toContain('password !== confirmPassword');
  });

  it('register.tsx still validates stake name', () => {
    expect(registerSource).toContain("!stakeName.trim()");
  });

  it('register.tsx still validates ward name', () => {
    expect(registerSource).toContain("!wardName.trim()");
  });

  it('[token].tsx still validates password length', () => {
    expect(tokenSource).toContain('password.length < 6');
  });

  it('[token].tsx still validates password match', () => {
    expect(tokenSource).toContain('password !== confirmPassword');
  });

  it('users.tsx still has invite modal', () => {
    expect(usersSource).toContain('inviteModalVisible');
  });

  it('users.tsx still has role change mutation', () => {
    expect(usersSource).toContain('changeRoleMutation');
  });

  it('users.tsx still has delete user mutation', () => {
    expect(usersSource).toContain('deleteUserMutation');
  });

  it('history.tsx still uses FlatList for rendering', () => {
    expect(historySource).toContain('FlatList');
  });

  it('history.tsx still has search functionality', () => {
    expect(historySource).toContain('useActivityLogSearch');
  });

  it('logAction is still non-blocking (catches errors)', () => {
    expect(activityLogSource).toContain('} catch (err)');
    expect(activityLogSource).toContain('console.error');
  });
});

// =============================================================================
// logAction / createLogger unit tests (runtime behavior)
// =============================================================================

describe('logAction / createLogger runtime tests', () => {
  // These use the mocked supabase from above

  it('logAction completes with userName', async () => {
    const { logAction: la } = await import('../../lib/activityLog');
    await expect(
      la('ward-1', 'user-1', 'user@test.com', 'test:action', 'Test', 'John')
    ).resolves.not.toThrow();
  });

  it('logAction completes without userName', async () => {
    const { logAction: la } = await import('../../lib/activityLog');
    await expect(
      la('ward-1', 'user-1', 'user@test.com', 'test:action', 'Test')
    ).resolves.not.toThrow();
  });

  it('createLogger returns callable function with userName', async () => {
    const { createLogger: cl } = await import('../../lib/activityLog');
    const logger = cl('ward-1', 'user-1', 'user@test.com', 'John Smith');
    expect(typeof logger).toBe('function');
    await expect(logger('test:action', 'Test')).resolves.not.toThrow();
  });

  it('createLogger returns callable function without userName', async () => {
    const { createLogger: cl } = await import('../../lib/activityLog');
    const logger = cl('ward-1', 'user-1', 'user@test.com');
    expect(typeof logger).toBe('function');
    await expect(logger('test:action', 'Test')).resolves.not.toThrow();
  });
});

// =============================================================================
// Type safety: ActivityLog with user_name
// =============================================================================

describe('Type safety: ActivityLog with user_name', () => {
  it('ActivityLog accepts user_name as string', () => {
    const entry: import('../../types/database').ActivityLog = {
      id: 'test-id',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'test@test.com',
      user_name: 'John Smith',
      action_type: 'member:create',
      description: 'Created member',
      created_at: new Date().toISOString(),
    };
    expect(entry.user_name).toBe('John Smith');
  });

  it('ActivityLog accepts user_name as null', () => {
    const entry: import('../../types/database').ActivityLog = {
      id: 'test-id',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'test@test.com',
      user_name: null,
      action_type: 'member:create',
      description: 'Created member',
      created_at: new Date().toISOString(),
    };
    expect(entry.user_name).toBeNull();
  });

  it('displayName fallback logic works correctly', () => {
    // With name
    const withName = { user_name: 'John', user_email: 'john@test.com' };
    expect(withName.user_name || withName.user_email).toBe('John');

    // Without name (null)
    const withoutName = { user_name: null as string | null, user_email: 'john@test.com' };
    expect(withoutName.user_name || withoutName.user_email).toBe('john@test.com');

    // Without name (empty string)
    const emptyName = { user_name: '', user_email: 'john@test.com' };
    expect(emptyName.user_name || emptyName.user_email).toBe('john@test.com');
  });
});
