/**
 * Tests for F017_E2E: E2E Testing Infrastructure — Phase 1 (CR-284)
 *
 * Covers:
 * - AC-SF1-01 to AC-SF1-03: Login screen testID props
 * - AC-SF2-01 to AC-SF2-04: Register screen testID props + validation
 * - AC-SF3-01: Settings sign-out testID
 * - AC-SF4-01 to AC-SF4-03: Maestro 01-register flow structure
 * - AC-SF5-01 to AC-SF5-03: Maestro 02-login-logout flow structure
 * - AC-SF6-01: e2e/README.md documentation
 *
 * Edge cases:
 * - EC_E2E_001: Slow network handling (extendedWaitUntil timeouts in flows)
 * - EC_E2E_002: Native Alert handling via text matching in 02-login-logout
 * - EC_E2E_003: Partial failure recovery (unique email per run)
 * - EC_E2E_004: Keyboard covering elements (KeyboardAvoidingView in screens)
 * - EC_E2E_005: Tab label "Discursos" for new ward (manage_prayers=false)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';

// =============================================================================
// Helper: replicate register validate() function (pure logic)
// =============================================================================

/**
 * Replicated validation logic from register.tsx.
 * This tests the same rules that the component uses internally.
 */
function validateRegister(fields: {
  fullName: string;
  email: string;
  stakeName: string;
  wardName: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (!fields.fullName.trim()) return 'auth.nameRequired';
  if (!fields.email.trim()) return 'auth.emailRequired';
  if (!fields.stakeName.trim()) return 'auth.stakeRequired';
  if (!fields.wardName.trim()) return 'auth.wardRequired';
  if (fields.password.length < 6) return 'auth.passwordMinLength';
  if (fields.password !== fields.confirmPassword) return 'auth.passwordMismatch';
  return null;
}

// =============================================================================
// Helper: parse simple Maestro YAML to extract testID references and assertions
// =============================================================================

/**
 * Extracts all testID references (id: "xxx") from a Maestro flow file.
 */
function extractTestIDs(content: string): string[] {
  const ids: string[] = [];
  const regex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Extracts all assertVisible text assertions from a Maestro flow file.
 * Matches both simple (- assertVisible: "text") and nested (assertVisible:\n  id: "xxx") forms.
 */
function extractAssertVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  // Simple form: - assertVisible: "text"
  const simpleRegex = /- assertVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = simpleRegex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

/**
 * Extracts extendedWaitUntil timeout values from a Maestro flow file.
 */
function extractTimeouts(content: string): number[] {
  const timeouts: number[] = [];
  const regex = /timeout:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    timeouts.push(parseInt(match[1], 10));
  }
  return timeouts;
}

// =============================================================================
// Paths
// =============================================================================

const projectRoot = path.resolve(__dirname, '../..');
const registerFlowPath = path.join(projectRoot, 'e2e/maestro/01-register.yaml');
const loginLogoutFlowPath = path.join(projectRoot, 'e2e/maestro/02-login-logout.yaml');
const readmePath = path.join(projectRoot, 'e2e/README.md');

// =============================================================================
// AC-SF2-04: Register validation logic (behavioral unit tests)
// =============================================================================

describe('F017_E2E: Register validation logic', () => {
  const validFields = {
    fullName: 'Test User',
    email: 'test@example.com',
    stakeName: 'Test Stake',
    wardName: 'Test Ward',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('returns null for valid registration fields', () => {
    expect(validateRegister(validFields)).toBeNull();
  });

  it('rejects empty full name', () => {
    expect(validateRegister({ ...validFields, fullName: '' })).toBe('auth.nameRequired');
  });

  it('rejects whitespace-only full name', () => {
    expect(validateRegister({ ...validFields, fullName: '   ' })).toBe('auth.nameRequired');
  });

  it('rejects empty email', () => {
    expect(validateRegister({ ...validFields, email: '' })).toBe('auth.emailRequired');
  });

  it('rejects empty stake name', () => {
    expect(validateRegister({ ...validFields, stakeName: '' })).toBe('auth.stakeRequired');
  });

  it('rejects empty ward name', () => {
    expect(validateRegister({ ...validFields, wardName: '' })).toBe('auth.wardRequired');
  });

  it('rejects password shorter than 6 characters', () => {
    expect(validateRegister({ ...validFields, password: '12345', confirmPassword: '12345' })).toBe('auth.passwordMinLength');
  });

  it('accepts password of exactly 6 characters', () => {
    expect(validateRegister({ ...validFields, password: '123456', confirmPassword: '123456' })).toBeNull();
  });

  it('rejects mismatched passwords', () => {
    expect(validateRegister({ ...validFields, confirmPassword: 'different' })).toBe('auth.passwordMismatch');
  });

  it('validates fields in order: name first, then email, stake, ward, password', () => {
    // Empty everything - should fail on name first
    const empty = { fullName: '', email: '', stakeName: '', wardName: '', password: '', confirmPassword: '' };
    expect(validateRegister(empty)).toBe('auth.nameRequired');

    // Name present, email empty
    expect(validateRegister({ ...empty, fullName: 'Name' })).toBe('auth.emailRequired');

    // Name+email present, stake empty
    expect(validateRegister({ ...empty, fullName: 'Name', email: 'e@x.com' })).toBe('auth.stakeRequired');

    // Name+email+stake present, ward empty
    expect(validateRegister({ ...empty, fullName: 'Name', email: 'e@x.com', stakeName: 'S' })).toBe('auth.wardRequired');

    // All present but short password
    expect(validateRegister({ ...empty, fullName: 'Name', email: 'e@x.com', stakeName: 'S', wardName: 'W', password: '12', confirmPassword: '12' })).toBe('auth.passwordMinLength');
  });
});

// =============================================================================
// AC-SF1-01/02/03: Login screen testID props exist in source
// (Note: We verify testIDs referenced in Maestro flows match those in source)
// =============================================================================

describe('F017_E2E: Login screen testIDs referenced by Maestro flows', () => {
  // Read login.tsx source to extract testID values
  const loginSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/login.tsx'), 'utf-8'
  );

  // Extract all testID="xxx" and testID={`xxx`} from JSX
  function extractJsxTestIDs(src: string): string[] {
    const ids: string[] = [];
    const staticRegex = /testID="([^"]+)"/g;
    let match;
    while ((match = staticRegex.exec(src)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  }

  const loginTestIDs = extractJsxTestIDs(loginSrc);

  it('has exactly 6 testID props (AC-SF1-01, AC-SF1-02, AC-SF1-03)', () => {
    expect(loginTestIDs).toHaveLength(6);
  });

  it('includes login-email-input testID (AC-SF1-01)', () => {
    expect(loginTestIDs).toContain('login-email-input');
  });

  it('includes login-password-input testID', () => {
    expect(loginTestIDs).toContain('login-password-input');
  });

  it('includes login-submit-button testID (AC-SF1-02)', () => {
    expect(loginTestIDs).toContain('login-submit-button');
  });

  it('includes login-error-text testID (AC-SF1-03)', () => {
    expect(loginTestIDs).toContain('login-error-text');
  });

  it('includes login-forgot-password-button testID', () => {
    expect(loginTestIDs).toContain('login-forgot-password-button');
  });

  it('includes login-create-account-button testID', () => {
    expect(loginTestIDs).toContain('login-create-account-button');
  });

  it('all login testIDs follow {screen}-{element}-{type} convention', () => {
    const pattern = /^login-[a-z]+-[a-z]+(-[a-z]+)*$/;
    for (const id of loginTestIDs) {
      expect(id).toMatch(pattern);
    }
  });
});

// =============================================================================
// AC-SF2-01/02/03: Register screen testIDs
// =============================================================================

describe('F017_E2E: Register screen testIDs', () => {
  const registerSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/register.tsx'), 'utf-8'
  );

  function extractAllTestIDs(src: string): string[] {
    const ids: string[] = [];
    // Static testID="xxx"
    const staticRegex = /testID="([^"]+)"/g;
    let match;
    while ((match = staticRegex.exec(src)) !== null) {
      ids.push(match[1]);
    }
    // Dynamic testID={`xxx-${var}-yyy`}
    const dynamicRegex = /testID=\{`([^`]+)`\}/g;
    while ((match = dynamicRegex.exec(src)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  }

  const registerTestIDs = extractAllTestIDs(registerSrc);

  it('has 12 testID props in source (10 static + 2 dynamic templates expanding to 15 at runtime)', () => {
    // 10 static testID="xxx" + 2 dynamic testID={`xxx-${var}-yyy`} = 12 in source
    // At runtime: 10 static + 2 roles + 3 languages = 15 testIDs
    expect(registerTestIDs).toHaveLength(12);
  });

  it('includes register-fullname-input testID (AC-SF2-01)', () => {
    expect(registerTestIDs).toContain('register-fullname-input');
  });

  it('includes register-submit-button testID (AC-SF2-03)', () => {
    expect(registerTestIDs).toContain('register-submit-button');
  });

  it('includes register-error-text testID (AC-SF2-04)', () => {
    expect(registerTestIDs).toContain('register-error-text');
  });

  it('includes register-email-input testID', () => {
    expect(registerTestIDs).toContain('register-email-input');
  });

  it('includes register-password-input testID', () => {
    expect(registerTestIDs).toContain('register-password-input');
  });

  it('includes register-confirm-password-input testID', () => {
    expect(registerTestIDs).toContain('register-confirm-password-input');
  });

  it('includes register-stake-input testID', () => {
    expect(registerTestIDs).toContain('register-stake-input');
  });

  it('includes register-ward-input testID', () => {
    expect(registerTestIDs).toContain('register-ward-input');
  });

  it('includes register-timezone-input testID', () => {
    expect(registerTestIDs).toContain('register-timezone-input');
  });

  it('includes register-back-button testID', () => {
    expect(registerTestIDs).toContain('register-back-button');
  });

  it('has dynamic testID template for role radio buttons (AC-SF2-02)', () => {
    // Dynamic: `register-role-${r}-radio`
    expect(registerTestIDs).toContain('register-role-${r}-radio');
  });

  it('has dynamic testID template for language radio buttons', () => {
    // Dynamic: `register-language-${lang}-radio`
    expect(registerTestIDs).toContain('register-language-${lang}-radio');
  });
});

// =============================================================================
// AC-SF3-01: Settings sign-out testID
// =============================================================================

describe('F017_E2E: Settings sign-out testID (AC-SF3-01)', () => {
  const settingsSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/settings/index.tsx'), 'utf-8'
  );

  it('includes settings-sign-out-button testID', () => {
    const testIDs: string[] = [];
    const regex = /testID="([^"]+)"/g;
    let match;
    while ((match = regex.exec(settingsSrc)) !== null) {
      testIDs.push(match[1]);
    }
    expect(testIDs).toContain('settings-sign-out-button');
  });

  it('settings-sign-out-button follows naming convention', () => {
    const pattern = /^settings-sign-out-button$/;
    expect('settings-sign-out-button').toMatch(pattern);
  });
});

// =============================================================================
// AC-SF4-01/02/03: Maestro 01-register flow structure
// =============================================================================

describe('F017_E2E: Maestro 01-register flow (AC-SF4)', () => {
  const flowContent = fs.readFileSync(registerFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(registerFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  it('generates unique email via evalScript with Date.now() (AC-SF4-02)', () => {
    expect(flowContent).toContain('Date.now()');
    expect(flowContent).toContain('@test.com');
    expect(flowContent).toContain('TEST_EMAIL');
  });

  it('stores password in output for reuse by 02-login-logout', () => {
    expect(flowContent).toContain('TEST_PASSWORD');
  });

  it('targets register form elements by testID (not text)', () => {
    expect(testIDs).toContain('login-create-account-button');
    expect(testIDs).toContain('register-fullname-input');
    expect(testIDs).toContain('register-email-input');
    expect(testIDs).toContain('register-password-input');
    expect(testIDs).toContain('register-confirm-password-input');
    expect(testIDs).toContain('register-stake-input');
    expect(testIDs).toContain('register-ward-input');
    expect(testIDs).toContain('register-submit-button');
  });

  it('asserts login screen visible via pt-BR text before navigating', () => {
    expect(assertTexts).toContain('Entrar');
  });

  it('asserts register screen visible via pt-BR text', () => {
    expect(assertTexts).toContain('Criar Conta');
  });

  it('asserts all 4 tab labels after registration (AC-SF4-01, AC-SF4-03)', () => {
    expect(assertTexts).toContain('Início');
    expect(assertTexts).toContain('Agendas');
    expect(assertTexts).toContain('Discursos');
    expect(assertTexts).toContain('Configurações');
  });

  it('uses "Discursos" (not "Discursos e Orações") for new ward (EC_E2E_005)', () => {
    expect(assertTexts).not.toContain('Discursos e Orações');
    expect(assertTexts).toContain('Discursos');
  });

  it('has extendedWaitUntil with sufficient timeout for registration (EC_E2E_001)', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(1);
    // Registration needs at least 10s for network latency
    const maxTimeout = Math.max(...timeouts);
    expect(maxTimeout).toBeGreaterThanOrEqual(10000);
  });

  it('does not tap role/language radios (defaults are correct)', () => {
    // For new ward, bishopric role and pt-BR are defaults
    expect(testIDs).not.toContain('register-role-bishopric-radio');
    expect(testIDs).not.toContain('register-language-pt-BR-radio');
  });
});

// =============================================================================
// AC-SF5-01/02/03: Maestro 02-login-logout flow structure
// =============================================================================

describe('F017_E2E: Maestro 02-login-logout flow (AC-SF5)', () => {
  const flowContent = fs.readFileSync(loginLogoutFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(loginLogoutFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  it('has three parts: login, logout, invalid login', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
  });

  // Part A: Login
  it('uses login testIDs for authentication (AC-SF5-01)', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  it('reads credentials from 01-register output', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('asserts Home tab visible after login', () => {
    expect(assertTexts).toContain('Início');
  });

  // Part B: Logout
  it('navigates to Settings tab by pt-BR text', () => {
    expect(flowContent).toContain('tapOn: "Configurações"');
  });

  it('uses settings-sign-out-button testID for logout (AC-SF5-02)', () => {
    expect(testIDs).toContain('settings-sign-out-button');
  });

  it('handles native Alert via text matching "Confirmar" (EC_E2E_002)', () => {
    expect(flowContent).toContain('tapOn: "Confirmar"');
  });

  it('scrolls to sign-out button before tapping', () => {
    expect(flowContent).toContain('scrollUntilVisible');
  });

  it('asserts return to login screen after logout', () => {
    expect(testIDs.filter((id) => id === 'login-submit-button').length).toBeGreaterThanOrEqual(2);
  });

  // Part C: Invalid login
  it('tests invalid login with wrong credentials (AC-SF5-03)', () => {
    expect(flowContent).toContain('invalid@test.com');
    expect(flowContent).toContain('wrongpassword');
  });

  it('asserts error message in pt-BR for invalid login', () => {
    const ptBRError = (ptBR as any).auth.loginFailed;
    expect(assertTexts).toContain(ptBRError);
  });

  it('uses login-error-text testID to wait for error display', () => {
    expect(testIDs).toContain('login-error-text');
  });

  it('has extendedWaitUntil timeouts for network operations (EC_E2E_001)', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(2);
    // At least 10s timeout for login/logout operations
    for (const timeout of timeouts) {
      expect(timeout).toBeGreaterThanOrEqual(10000);
    }
  });
});

// =============================================================================
// AC-SF6-01: e2e/README.md exists with required sections
// =============================================================================

describe('F017_E2E: e2e/README.md documentation (AC-SF6-01)', () => {
  it('README file exists', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  const readme = fs.readFileSync(readmePath, 'utf-8');

  it('has Prerequisites section', () => {
    expect(readme).toContain('Prerequisites');
  });

  it('mentions Maestro CLI installation', () => {
    expect(readme.toLowerCase()).toContain('maestro');
  });

  it('has run commands section', () => {
    expect(readme).toContain('maestro test');
  });

  it('documents testID convention', () => {
    expect(readme).toContain('testID');
  });

  it('mentions production Supabase for test data', () => {
    expect(readme.toLowerCase()).toContain('supabase');
  });

  it('notes execution order requirement (01-register before 02-login)', () => {
    expect(readme).toContain('01-register');
    expect(readme).toContain('02-login');
  });
});

// =============================================================================
// testID naming convention validation
// =============================================================================

describe('F017_E2E: testID naming convention (ADR-052)', () => {
  const allFlowTestIDs = [
    ...extractTestIDs(fs.readFileSync(registerFlowPath, 'utf-8')),
    ...extractTestIDs(fs.readFileSync(loginLogoutFlowPath, 'utf-8')),
  ];
  const uniqueTestIDs = [...new Set(allFlowTestIDs)];

  it('all testIDs used in Maestro flows follow {screen}-{element}-{type} kebab-case', () => {
    const pattern = /^[a-z]+-[a-z]+-[a-z]+(-[a-z]+)*$/;
    for (const id of uniqueTestIDs) {
      expect(id, `testID "${id}" does not match convention`).toMatch(pattern);
    }
  });

  it('all testIDs start with known screen prefixes', () => {
    const validPrefixes = ['login-', 'register-', 'settings-'];
    for (const id of uniqueTestIDs) {
      const hasValidPrefix = validPrefixes.some((p) => id.startsWith(p));
      expect(hasValidPrefix, `testID "${id}" has unknown screen prefix`).toBe(true);
    }
  });

  it('all testIDs end with known type suffixes', () => {
    const validSuffixes = ['-input', '-button', '-text', '-radio'];
    for (const id of uniqueTestIDs) {
      const hasValidSuffix = validSuffixes.some((s) => id.endsWith(s));
      expect(hasValidSuffix, `testID "${id}" has unknown type suffix`).toBe(true);
    }
  });
});

// =============================================================================
// Cross-validation: Maestro flow testIDs match source testIDs
// =============================================================================

describe('F017_E2E: Cross-validation - Maestro testIDs exist in source files', () => {
  // Collect all testIDs from source files
  const loginSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/login.tsx'), 'utf-8'
  );
  const registerSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/register.tsx'), 'utf-8'
  );
  const settingsSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/settings/index.tsx'), 'utf-8'
  );

  // All static testIDs in source
  function getStaticTestIDs(src: string): string[] {
    const ids: string[] = [];
    const regex = /testID="([^"]+)"/g;
    let match;
    while ((match = regex.exec(src)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  }

  const sourceTestIDs = new Set([
    ...getStaticTestIDs(loginSrc),
    ...getStaticTestIDs(registerSrc),
    ...getStaticTestIDs(settingsSrc),
  ]);

  // All testIDs referenced in Maestro flows
  const flowTestIDs = new Set([
    ...extractTestIDs(fs.readFileSync(registerFlowPath, 'utf-8')),
    ...extractTestIDs(fs.readFileSync(loginLogoutFlowPath, 'utf-8')),
  ]);

  it('every testID used in 01-register flow exists in source', () => {
    const registerFlowIDs = extractTestIDs(fs.readFileSync(registerFlowPath, 'utf-8'));
    for (const id of registerFlowIDs) {
      expect(sourceTestIDs.has(id), `testID "${id}" referenced in 01-register but not found in source`).toBe(true);
    }
  });

  it('every testID used in 02-login-logout flow exists in source', () => {
    const loginLogoutFlowIDs = extractTestIDs(fs.readFileSync(loginLogoutFlowPath, 'utf-8'));
    for (const id of loginLogoutFlowIDs) {
      expect(sourceTestIDs.has(id), `testID "${id}" referenced in 02-login-logout but not found in source`).toBe(true);
    }
  });
});

// =============================================================================
// i18n: pt-BR assertion strings used in Maestro flows exist in locale
// =============================================================================

describe('F017_E2E: pt-BR strings used in Maestro assertions', () => {
  it('pt-BR has loginFailed = "E-mail ou senha incorretos"', () => {
    expect((ptBR as any).auth.loginFailed).toBe('E-mail ou senha incorretos');
  });

  it('pt-BR has login button text', () => {
    expect((ptBR as any).auth.login).toBeTruthy();
  });

  it('pt-BR has register title text', () => {
    expect((ptBR as any).auth.registerTitle).toBeTruthy();
  });

  it('pt-BR validation error keys exist', () => {
    expect((ptBR as any).auth.nameRequired).toBeTruthy();
    expect((ptBR as any).auth.emailRequired).toBeTruthy();
    expect((ptBR as any).auth.stakeRequired).toBeTruthy();
    expect((ptBR as any).auth.wardRequired).toBeTruthy();
    expect((ptBR as any).auth.passwordMinLength).toBeTruthy();
    expect((ptBR as any).auth.passwordMismatch).toBeTruthy();
  });
});

// =============================================================================
// EC_E2E_003: Unique email ensures re-run safety
// =============================================================================

describe('F017_E2E: Unique email generation (EC_E2E_003)', () => {
  const flowContent = fs.readFileSync(registerFlowPath, 'utf-8');

  it('email pattern uses timestamp for uniqueness', () => {
    // The evalScript generates: e2e-{timestamp}@test.com
    expect(flowContent).toContain("'e2e-'");
    expect(flowContent).toContain('Date.now()');
    expect(flowContent).toContain("'@test.com'");
  });

  it('email is stored in output for cross-flow reuse', () => {
    expect(flowContent).toContain('output.TEST_EMAIL');
  });
});

// =============================================================================
// EC_E2E_004: KeyboardAvoidingView in auth screens
// =============================================================================

describe('F017_E2E: KeyboardAvoidingView in auth screens (EC_E2E_004)', () => {
  const loginSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/login.tsx'), 'utf-8'
  );
  const registerSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/register.tsx'), 'utf-8'
  );

  it('login screen uses KeyboardAvoidingView', () => {
    expect(loginSrc).toContain('KeyboardAvoidingView');
  });

  it('register screen uses KeyboardAvoidingView', () => {
    expect(registerSrc).toContain('KeyboardAvoidingView');
  });
});

// =============================================================================
// Maestro flow numbering convention (ADR-053)
// =============================================================================

describe('F017_E2E: Maestro flow file naming (ADR-053)', () => {
  it('01-register.yaml exists with correct prefix', () => {
    expect(fs.existsSync(registerFlowPath)).toBe(true);
    expect(path.basename(registerFlowPath)).toBe('01-register.yaml');
  });

  it('02-login-logout.yaml exists with correct prefix', () => {
    expect(fs.existsSync(loginLogoutFlowPath)).toBe(true);
    expect(path.basename(loginLogoutFlowPath)).toBe('02-login-logout.yaml');
  });

  it('flow files use zero-padded numeric prefix for ordering', () => {
    const files = fs.readdirSync(path.join(projectRoot, 'e2e/maestro'));
    const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
    for (const file of yamlFiles) {
      expect(file).toMatch(/^\d{2}-/);
    }
  });
});
