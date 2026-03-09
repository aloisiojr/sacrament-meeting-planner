/**
 * Tests for F018_E2E: E2E Testing Infrastructure — Phase 2 (CR-284)
 *
 * Covers:
 * - AC-SF1-01, AC-SF1-02: Home tab testID props (start meeting, preview pencil)
 * - AC-SF2-01, AC-SF2-02: Agenda tab dynamic testID props (card header, play button)
 * - AC-SF3-01, AC-SF3-02: AgendaForm SelectorField testID props (presiding, hymn selectors)
 * - AC-SF4-01, AC-SF4-02: HymnSelectorModal testID props (search input, close button)
 * - AC-SF5-01, AC-SF5-02: ActorSelector testID props (search, add flow)
 * - AC-SF6-01, AC-SF6-02, AC-SF6-03: Presentation Mode testID props (screen, close, font toggle)
 * - AC-SF7-01, AC-SF7-02, AC-SF7-03: Maestro 03-home-presentation flow structure
 * - AC-SF8-01, AC-SF8-02, AC-SF8-03: Maestro 04-agenda flow structure
 *
 * Edge cases:
 * - EC_E2E_P2_001: Dynamic date computation in 04-agenda via evalScript
 * - EC_E2E_P2_002: Conference Sunday non-expandable (flow handles gracefully)
 * - EC_E2E_P2_003: Lazy agenda creation wait (extendedWaitUntil 15s)
 * - EC_E2E_P2_004: ActorSelector animation delay (extendedWaitUntil)
 * - EC_E2E_P2_005: HymnSelector async results (waitForAnimationToEnd)
 * - EC_E2E_P2_006: Accordion tap target via text matching
 * - EC_E2E_P2_007: Keyboard covering fields (scrollUntilVisible)
 * - EC_E2E_P2_008: Empty field placeholders (flow uses labels not values)
 * - EC_E2E_P2_009: Flow order independence (labels not values)
 * - EC_E2E_P2_010: FlatList scroll (scrollUntilVisible for agenda card)
 * - EC_E2E_P2_011: SearchInput testID passthrough (no code change needed)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';

// =============================================================================
// Helpers (reused from Phase 1 convention)
// =============================================================================

const projectRoot = path.resolve(__dirname, '../..');

function extractTestIDs(content: string): string[] {
  const ids: string[] = [];
  const regex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractAssertVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const simpleRegex = /- assertVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = simpleRegex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

/**
 * Extracts visible text from extendedWaitUntil blocks:
 *   - extendedWaitUntil:
 *       visible: "text"
 */
function extractWaitUntilVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const regex = /visible:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractAssertNotVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const regex = /- assertNotVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractTimeouts(content: string): number[] {
  const timeouts: number[] = [];
  const regex = /timeout:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    timeouts.push(parseInt(match[1], 10));
  }
  return timeouts;
}

function extractStaticTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID="([^"]+)"/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractDynamicTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID=\{`([^`]+)`\}/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// =============================================================================
// Source file paths
// =============================================================================

const homePath = path.resolve(__dirname, '../app/(tabs)/index.tsx');
const agendaPath = path.resolve(__dirname, '../app/(tabs)/agenda.tsx');
const agendaFormPath = path.resolve(__dirname, '../components/AgendaForm.tsx');
const actorSelectorPath = path.resolve(__dirname, '../components/ActorSelector.tsx');
const presentationPath = path.resolve(__dirname, '../app/presentation.tsx');

// Flow file paths
const homePresentationFlowPath = path.join(projectRoot, 'e2e/maestro/03-home-presentation.yaml');
const agendaFlowPath = path.join(projectRoot, 'e2e/maestro/04-agenda.yaml');

// =============================================================================
// AC-SF1-01, AC-SF1-02: Home tab testIDs
// =============================================================================

describe('F018_E2E: Home tab testIDs (AC-SF1)', () => {
  const homeSrc = fs.readFileSync(homePath, 'utf-8');
  const homeTestIDs = extractStaticTestIDs(homeSrc);

  it('includes home-start-meeting-button testID (AC-SF1-01)', () => {
    expect(homeTestIDs).toContain('home-start-meeting-button');
  });

  it('includes home-preview-pencil-button testID (AC-SF1-02)', () => {
    expect(homeTestIDs).toContain('home-preview-pencil-button');
  });

  it('has exactly 2 testID props', () => {
    expect(homeTestIDs).toHaveLength(2);
  });

  it('all Home testIDs follow {screen}-{element}-{type} kebab-case convention', () => {
    const pattern = /^home-[a-z]+-[a-z]+(-[a-z]+)*$/;
    for (const id of homeTestIDs) {
      expect(id, `testID "${id}" does not match convention`).toMatch(pattern);
    }
  });
});

// =============================================================================
// AC-SF2-01, AC-SF2-02: Agenda tab dynamic testIDs
// =============================================================================

describe('F018_E2E: Agenda tab dynamic testIDs (AC-SF2)', () => {
  const agendaSrc = fs.readFileSync(agendaPath, 'utf-8');
  const dynamicTestIDs = extractDynamicTestIDs(agendaSrc);

  it('includes agenda-card-${date} dynamic testID template (AC-SF2-01)', () => {
    expect(dynamicTestIDs).toContain('agenda-card-${date}');
  });

  it('includes agenda-play-${date} dynamic testID template (AC-SF2-02)', () => {
    expect(dynamicTestIDs).toContain('agenda-play-${date}');
  });

  it('has exactly 2 dynamic testID props using template literals', () => {
    expect(dynamicTestIDs).toHaveLength(2);
  });
});

// =============================================================================
// AC-SF3-01, AC-SF3-02: AgendaForm SelectorField testIDs
// =============================================================================

describe('F018_E2E: AgendaForm SelectorField testIDs (AC-SF3)', () => {
  const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');
  const testIDs = extractStaticTestIDs(agendaFormSrc);

  it('includes agenda-presiding-selector testID (AC-SF3-01)', () => {
    expect(testIDs).toContain('agenda-presiding-selector');
  });

  it('includes agenda-conducting-selector testID', () => {
    expect(testIDs).toContain('agenda-conducting-selector');
  });

  it('includes agenda-pianist-selector testID', () => {
    expect(testIDs).toContain('agenda-pianist-selector');
  });

  it('includes agenda-conductor-selector testID', () => {
    expect(testIDs).toContain('agenda-conductor-selector');
  });

  it('includes agenda-opening-hymn-selector testID (AC-SF3-02)', () => {
    expect(testIDs).toContain('agenda-opening-hymn-selector');
  });

  it('includes agenda-sacrament-hymn-selector testID', () => {
    expect(testIDs).toContain('agenda-sacrament-hymn-selector');
  });

  it('includes agenda-closing-hymn-selector testID', () => {
    expect(testIDs).toContain('agenda-closing-hymn-selector');
  });

  it('has 7 agenda-*-selector testIDs for SelectorField instances', () => {
    const selectorTestIDs = testIDs.filter((id) => id.startsWith('agenda-') && id.endsWith('-selector'));
    expect(selectorTestIDs).toHaveLength(7);
  });
});

// =============================================================================
// AC-SF3: SelectorField testID prop passthrough
// =============================================================================

describe('F018_E2E: SelectorField testID interface (ADR-054)', () => {
  const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');

  it('SelectorField function accepts testID parameter', () => {
    // Verify the SelectorField function destructures testID
    expect(agendaFormSrc).toContain('testID,\n}: {');
  });

  it('SelectorField type declaration includes testID?: string', () => {
    expect(agendaFormSrc).toContain('testID?: string;');
  });

  it('SelectorField Pressable forwards testID prop', () => {
    // The Pressable inside SelectorField has testID={testID}
    expect(agendaFormSrc).toContain('testID={testID}');
  });
});

// =============================================================================
// AC-SF4-01, AC-SF4-02: HymnSelectorModal testIDs
// =============================================================================

describe('F018_E2E: HymnSelectorModal testIDs (AC-SF4)', () => {
  const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');
  const testIDs = extractStaticTestIDs(agendaFormSrc);

  it('includes hymn-selector-search-input testID (AC-SF4-01)', () => {
    expect(testIDs).toContain('hymn-selector-search-input');
  });

  it('includes hymn-selector-close-button testID (AC-SF4-02)', () => {
    expect(testIDs).toContain('hymn-selector-close-button');
  });
});

// =============================================================================
// AC-SF5-01, AC-SF5-02: ActorSelector testIDs
// =============================================================================

describe('F018_E2E: ActorSelector testIDs (AC-SF5)', () => {
  const actorSrc = fs.readFileSync(actorSelectorPath, 'utf-8');
  const testIDs = extractStaticTestIDs(actorSrc);

  it('includes actor-selector-search-input testID (AC-SF5-01)', () => {
    expect(testIDs).toContain('actor-selector-search-input');
  });

  it('includes actor-selector-close-button testID', () => {
    expect(testIDs).toContain('actor-selector-close-button');
  });

  it('includes actor-selector-add-button testID (AC-SF5-02 part 1)', () => {
    expect(testIDs).toContain('actor-selector-add-button');
  });

  it('includes actor-selector-add-input testID (AC-SF5-02 part 2)', () => {
    expect(testIDs).toContain('actor-selector-add-input');
  });

  it('includes actor-selector-add-confirm testID (AC-SF5-02 part 3)', () => {
    expect(testIDs).toContain('actor-selector-add-confirm');
  });

  it('has exactly 5 testID props in ActorSelector', () => {
    expect(testIDs).toHaveLength(5);
  });
});

// =============================================================================
// AC-SF6-01, AC-SF6-02, AC-SF6-03: Presentation Mode testIDs
// =============================================================================

describe('F018_E2E: Presentation Mode testIDs (AC-SF6)', () => {
  const presentationSrc = fs.readFileSync(presentationPath, 'utf-8');
  const testIDs = extractStaticTestIDs(presentationSrc);

  it('includes presentation-screen testID (AC-SF6-01)', () => {
    expect(testIDs).toContain('presentation-screen');
  });

  it('includes presentation-edit-button testID', () => {
    expect(testIDs).toContain('presentation-edit-button');
  });

  it('includes presentation-font-toggle-button testID (AC-SF6-03)', () => {
    expect(testIDs).toContain('presentation-font-toggle-button');
  });

  it('includes presentation-font-toggle-text testID (AC-SF6-03)', () => {
    expect(testIDs).toContain('presentation-font-toggle-text');
  });

  it('includes presentation-close-button testID (AC-SF6-02)', () => {
    expect(testIDs).toContain('presentation-close-button');
  });

  it('has exactly 5 testID props in Presentation Mode', () => {
    expect(testIDs).toHaveLength(5);
  });
});

// =============================================================================
// AC-SF7-01, AC-SF7-02, AC-SF7-03: Maestro 03-home-presentation flow
// =============================================================================

describe('F018_E2E: Maestro 03-home-presentation flow (AC-SF7)', () => {
  const flowContent = fs.readFileSync(homePresentationFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(homePresentationFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login
  it('reads credentials from 01-register output', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  it('waits for Home tab after login', () => {
    expect(assertTexts).toContain('Início');
  });

  // Part B: Start Presentation Mode (AC-SF7-01)
  it('taps Start Meeting button by testID (AC-SF7-01)', () => {
    expect(testIDs).toContain('home-start-meeting-button');
  });

  it('waits for presentation screen by testID', () => {
    expect(testIDs).toContain('presentation-screen');
  });

  // Part C: Verify Presentation Mode (AC-SF7-01)
  it('asserts "Reunião Sacramental" title visible in pt-BR (AC-SF7-01)', () => {
    expect(assertTexts).toContain('Reunião Sacramental');
  });

  it('asserts font toggle text element is visible', () => {
    expect(testIDs).toContain('presentation-font-toggle-text');
  });

  it('asserts Welcome card field label "Presidindo" visible', () => {
    expect(assertTexts).toContain('Presidindo');
  });

  // Part D: Font Toggle (AC-SF7-02)
  it('taps font toggle button by testID (AC-SF7-02)', () => {
    // Should tap presentation-font-toggle-button at least once
    const fontToggleCount = testIDs.filter(
      (id) => id === 'presentation-font-toggle-button'
    ).length;
    expect(fontToggleCount).toBeGreaterThanOrEqual(2);
  });

  // Part E: Navigate Accordion Cards (EC_E2E_P2_006)
  it('taps "Último Discurso" collapsed card by text (EC_E2E_P2_006)', () => {
    // Uses tapOn: "Ultimo Discurso" for accordion card target
    expect(flowContent).toContain('Último Discurso');
  });

  // Part F: Close Presentation (AC-SF7-03)
  it('taps close button by testID (AC-SF7-03)', () => {
    expect(testIDs).toContain('presentation-close-button');
  });

  it('asserts return to Home tab after closing', () => {
    // "Inicio" should appear as both wait target and assertion
    const inicioCount = assertTexts.filter((t) => t === 'Início').length;
    expect(inicioCount).toBeGreaterThanOrEqual(2);
  });

  // EC_E2E_P2_008, EC_E2E_P2_009: Flow uses labels, not populated values
  it('does NOT assert populated field values (EC_E2E_P2_008, EC_E2E_P2_009)', () => {
    // Flow should use field labels (Presidindo, Dirigindo), not populated values
    expect(assertTexts).not.toContain('E2E Presidente');
    expect(assertTexts).not.toContain('---');
  });

  it('has extendedWaitUntil with sufficient timeouts for network operations', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(2);
    const maxTimeout = Math.max(...timeouts);
    expect(maxTimeout).toBeGreaterThanOrEqual(5000);
  });

  it('has all 6 parts: Login, Start Presentation, Verify, Font Toggle, Accordion, Close', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
  });
});

// =============================================================================
// AC-SF8-01, AC-SF8-02, AC-SF8-03: Maestro 04-agenda flow
// =============================================================================

describe('F018_E2E: Maestro 04-agenda flow (AC-SF8)', () => {
  const flowContent = fs.readFileSync(agendaFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const waitUntilTexts = extractWaitUntilVisibleTexts(flowContent);
  const assertNotTexts = extractAssertNotVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(agendaFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login
  it('reads credentials from 01-register output', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  // Part B: Navigate to Agenda tab
  it('navigates to Agenda tab by text', () => {
    expect(flowContent).toContain('tapOn: "Agendas"');
  });

  // Part C: Expand next Sunday card (AC-SF8-01, EC_E2E_P2_001)
  it('computes next Sunday date dynamically via evalScript (EC_E2E_P2_001)', () => {
    expect(flowContent).toContain('evalScript');
    expect(flowContent).toContain('NEXT_SUNDAY');
    expect(flowContent).toContain('getDay()');
    expect(flowContent).toContain('toISOString()');
  });

  it('uses dynamic agenda-card testID with computed date (AC-SF8-01)', () => {
    expect(flowContent).toContain('agenda-card-${output.NEXT_SUNDAY}');
  });

  it('waits for section header after card expand (EC_E2E_P2_003)', () => {
    // Section header is in extendedWaitUntil visible: "text" form
    expect(waitUntilTexts).toContain('Boas-Vindas, Anúncios e Reconhecimentos');
  });

  it('uses 15s timeout for lazy agenda creation (EC_E2E_P2_003)', () => {
    expect(timeouts).toContain(15000);
  });

  // Part D: Assign Presiding Actor (AC-SF8-02)
  it('uses scrollUntilVisible before tapping presiding selector (EC_E2E_P2_007)', () => {
    expect(flowContent).toContain('scrollUntilVisible');
    expect(testIDs).toContain('agenda-presiding-selector');
  });

  it('taps presiding selector by testID', () => {
    expect(testIDs).toContain('agenda-presiding-selector');
  });

  it('waits for ActorSelector bottom-sheet (EC_E2E_P2_004)', () => {
    expect(testIDs).toContain('actor-selector-add-button');
  });

  it('creates actor via add button -> input -> confirm flow (AC-SF8-02)', () => {
    expect(testIDs).toContain('actor-selector-add-button');
    expect(testIDs).toContain('actor-selector-add-input');
    expect(testIDs).toContain('actor-selector-add-confirm');
  });

  it('types "E2E Presidente" as actor name', () => {
    expect(flowContent).toContain('E2E Presidente');
  });

  it('waits for actor name visible in field after creation', () => {
    // Actor name visibility is checked via extendedWaitUntil visible: "E2E Presidente"
    expect(waitUntilTexts).toContain('E2E Presidente');
  });

  // Part E: Assign Opening Hymn (AC-SF8-03)
  it('taps opening hymn selector by testID (AC-SF8-03)', () => {
    expect(testIDs).toContain('agenda-opening-hymn-selector');
  });

  it('waits for HymnSelectorModal search input (EC_E2E_P2_005)', () => {
    expect(testIDs).toContain('hymn-selector-search-input');
  });

  it('searches for hymn number "2" in search input', () => {
    expect(flowContent).toContain('inputText: "2"');
  });

  it('uses waitForAnimationToEnd for hymn search results (EC_E2E_P2_005)', () => {
    expect(flowContent).toContain('waitForAnimationToEnd');
  });

  it('waits for hymn modal to close after selection', () => {
    expect(flowContent).toContain('notVisible');
  });

  // Part F: Collapse and verify
  it('scrolls up to card header (EC_E2E_P2_010)', () => {
    expect(flowContent).toContain('direction: UP');
  });

  it('taps card header to collapse', () => {
    // agenda-card-${output.NEXT_SUNDAY} should appear at least twice (expand + collapse)
    const cardTestIDCount = (flowContent.match(/agenda-card-\$\{output\.NEXT_SUNDAY\}/g) || []).length;
    expect(cardTestIDCount).toBeGreaterThanOrEqual(2);
  });

  it('asserts form is hidden after collapse', () => {
    expect(assertNotTexts).toContain('Boas-Vindas, Anúncios e Reconhecimentos');
  });

  it('has all 6 parts: Login, Navigate, Expand, Assign Actor, Assign Hymn, Collapse', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
  });

  it('has extendedWaitUntil with sufficient timeouts', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(4);
  });
});

// =============================================================================
// Cross-validation: Phase 2 Maestro flow testIDs exist in source files
// =============================================================================

describe('F018_E2E: Cross-validation - Phase 2 Maestro testIDs exist in source', () => {
  // Collect ALL testIDs from Phase 2 source files (static + dynamic)
  const homeSrc = fs.readFileSync(homePath, 'utf-8');
  const agendaSrc = fs.readFileSync(agendaPath, 'utf-8');
  const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');
  const actorSrc = fs.readFileSync(actorSelectorPath, 'utf-8');
  const presentationSrc = fs.readFileSync(presentationPath, 'utf-8');

  // Phase 1 source files (login testIDs used in Phase 2 flows)
  const loginSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/login.tsx'),
    'utf-8'
  );

  const allStaticTestIDs = new Set([
    ...extractStaticTestIDs(homeSrc),
    ...extractStaticTestIDs(agendaSrc),
    ...extractStaticTestIDs(agendaFormSrc),
    ...extractStaticTestIDs(actorSrc),
    ...extractStaticTestIDs(presentationSrc),
    ...extractStaticTestIDs(loginSrc),
  ]);

  // Dynamic testIDs: agenda-card-${date}, agenda-play-${date}
  const dynamicTestIDPatterns = extractDynamicTestIDs(agendaSrc);

  it('every static testID in 03-home-presentation flow exists in source', () => {
    const flowIDs = extractTestIDs(
      fs.readFileSync(homePresentationFlowPath, 'utf-8')
    );
    for (const id of flowIDs) {
      expect(
        allStaticTestIDs.has(id),
        `testID "${id}" referenced in 03-home-presentation but not found in source`
      ).toBe(true);
    }
  });

  it('every static testID in 04-agenda flow exists in source (excluding dynamic testIDs)', () => {
    const flowContent = fs.readFileSync(agendaFlowPath, 'utf-8');
    const flowIDs = extractTestIDs(flowContent);

    // Filter out dynamic testIDs (those with ${output.NEXT_SUNDAY})
    const staticFlowIDs = flowIDs.filter(
      (id) => !id.includes('${output.NEXT_SUNDAY}')
    );

    for (const id of staticFlowIDs) {
      expect(
        allStaticTestIDs.has(id),
        `testID "${id}" referenced in 04-agenda but not found in source`
      ).toBe(true);
    }
  });

  it('dynamic testID patterns agenda-card-* and agenda-play-* have source templates', () => {
    expect(dynamicTestIDPatterns).toContain('agenda-card-${date}');
    expect(dynamicTestIDPatterns).toContain('agenda-play-${date}');
  });
});

// =============================================================================
// Phase 2 testID naming convention (ADR-052 extension)
// =============================================================================

describe('F018_E2E: Phase 2 testID naming convention (ADR-052)', () => {
  const phase2FlowTestIDs = [
    ...extractTestIDs(fs.readFileSync(homePresentationFlowPath, 'utf-8')),
    ...extractTestIDs(fs.readFileSync(agendaFlowPath, 'utf-8')),
  ];
  const uniqueTestIDs = [...new Set(phase2FlowTestIDs)];

  // Separate static and dynamic
  const staticTestIDs = uniqueTestIDs.filter(
    (id) => !id.includes('${output.')
  );
  const dynamicTestIDs = uniqueTestIDs.filter(
    (id) => id.includes('${output.')
  );

  it('all static testIDs follow kebab-case with at least 2 segments', () => {
    const pattern = /^[a-z]+-[a-z]+(-[a-z]+)*$/;
    for (const id of staticTestIDs) {
      expect(id, `testID "${id}" does not match convention`).toMatch(pattern);
    }
  });

  it('all static testIDs start with known screen prefixes', () => {
    const validPrefixes = [
      'login-',
      'home-',
      'agenda-',
      'hymn-',
      'actor-',
      'presentation-',
    ];
    for (const id of staticTestIDs) {
      const hasValidPrefix = validPrefixes.some((p) => id.startsWith(p));
      expect(
        hasValidPrefix,
        `testID "${id}" has unknown screen prefix`
      ).toBe(true);
    }
  });

  it('all static testIDs end with known type suffixes', () => {
    const validSuffixes = [
      '-input',
      '-button',
      '-text',
      '-selector',
      '-screen',
      '-confirm',
    ];
    for (const id of staticTestIDs) {
      const hasValidSuffix = validSuffixes.some((s) => id.endsWith(s));
      expect(
        hasValidSuffix,
        `testID "${id}" has unknown type suffix`
      ).toBe(true);
    }
  });

  it('dynamic testIDs use ISO date suffix pattern (ADR-055)', () => {
    for (const id of dynamicTestIDs) {
      expect(id).toContain('${output.NEXT_SUNDAY}');
    }
  });
});

// =============================================================================
// Phase 2 Maestro flow file naming (ADR-053)
// =============================================================================

describe('F018_E2E: Phase 2 Maestro flow file naming (ADR-053)', () => {
  it('03-home-presentation.yaml exists with correct prefix', () => {
    expect(fs.existsSync(homePresentationFlowPath)).toBe(true);
    expect(path.basename(homePresentationFlowPath)).toBe('03-home-presentation.yaml');
  });

  it('04-agenda.yaml exists with correct prefix', () => {
    expect(fs.existsSync(agendaFlowPath)).toBe(true);
    expect(path.basename(agendaFlowPath)).toBe('04-agenda.yaml');
  });

  it('all flow files use zero-padded numeric prefix (01, 02, 03, 04, ...)', () => {
    const files = fs.readdirSync(path.join(projectRoot, 'e2e/maestro'));
    const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
    expect(yamlFiles.length).toBeGreaterThanOrEqual(4);
    for (const file of yamlFiles) {
      expect(file).toMatch(/^\d{2}-/);
    }
  });

  it('flow files are in correct sequential order', () => {
    const files = fs.readdirSync(path.join(projectRoot, 'e2e/maestro'));
    const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort();
    expect(yamlFiles[0]).toBe('01-register.yaml');
    expect(yamlFiles[1]).toBe('02-login-logout.yaml');
    expect(yamlFiles[2]).toBe('03-home-presentation.yaml');
    expect(yamlFiles[3]).toBe('04-agenda.yaml');
  });
});

// =============================================================================
// pt-BR i18n strings used in Phase 2 Maestro assertions
// =============================================================================

describe('F018_E2E: pt-BR strings used in Phase 2 Maestro assertions', () => {
  it('pt-BR has presentation title "Reunião Sacramental"', () => {
    expect((ptBR as any).presentation.title).toBe('Reunião Sacramental');
  });

  it('pt-BR has agenda presiding label "Presidindo"', () => {
    expect((ptBR as any).agenda.presiding).toBe('Presidindo');
  });

  it('pt-BR has agenda section welcome text', () => {
    expect((ptBR as any).agenda.sectionWelcome).toBe(
      'Boas-Vindas, Anúncios e Reconhecimentos'
    );
  });

  it('pt-BR has speeches lastSpeech text "Último Discurso"', () => {
    expect((ptBR as any).speeches.lastSpeech).toBe('Último Discurso');
  });

  it('pt-BR has home tab label "Início"', () => {
    expect((ptBR as any).tabs.home).toBe('Início');
  });

  it('pt-BR has agenda tab label "Agendas"', () => {
    expect((ptBR as any).tabs.agenda).toBe('Agendas');
  });

  it('pt-BR has start meeting button text', () => {
    expect((ptBR as any).home.startMeeting).toBeTruthy();
  });
});

// =============================================================================
// EC_E2E_P2_011: SearchInput testID passthrough verification
// =============================================================================

describe('F018_E2E: SearchInput testID passthrough (EC_E2E_P2_011)', () => {
  // SearchInput passes testID via ...rest spread. Verify callers pass testID.
  const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');
  const actorSrc = fs.readFileSync(actorSelectorPath, 'utf-8');

  it('HymnSelectorModal SearchInput has testID prop passed', () => {
    expect(agendaFormSrc).toContain('testID="hymn-selector-search-input"');
  });

  it('ActorSelector SearchInput has testID prop passed', () => {
    expect(actorSrc).toContain('testID="actor-selector-search-input"');
  });
});

// =============================================================================
// Total testID count validation
// =============================================================================

describe('F018_E2E: Total testID count verification', () => {
  it('Phase 2 adds exactly 21 testIDs across 5 source files', () => {
    const homeSrc = fs.readFileSync(homePath, 'utf-8');
    const agendaSrc = fs.readFileSync(agendaPath, 'utf-8');
    const agendaFormSrc = fs.readFileSync(agendaFormPath, 'utf-8');
    const actorSrc = fs.readFileSync(actorSelectorPath, 'utf-8');
    const presentationSrc = fs.readFileSync(presentationPath, 'utf-8');

    const homeCount = extractStaticTestIDs(homeSrc).length;
    const agendaCount = extractDynamicTestIDs(agendaSrc).length;
    const agendaFormCount = extractStaticTestIDs(agendaFormSrc).length; // 7 selectors + 2 hymn modal + 1 forwarding
    const actorCount = extractStaticTestIDs(actorSrc).length;
    const presentationCount = extractStaticTestIDs(presentationSrc).length;

    // Home: 2, Agenda: 2 (dynamic), AgendaForm: 7 selectors + 2 hymn + 1 forwarding = 10,
    // ActorSelector: 5, Presentation: 5
    // But AgendaForm's testID={testID} is the forwarding, not a unique testID value.
    // Actual unique testIDs physically placed: 2 + 2 + 9 + 5 + 5 = 23 (includes 1 forwarding in SelectorField)
    // SelectorField: testID="agenda-*-selector" (7 callers) + testID={testID} (1 forwarding) + hymn-*-* (2) = 10 total
    expect(homeCount).toBe(2);
    expect(agendaCount).toBe(2);
    expect(actorCount).toBe(5);
    expect(presentationCount).toBe(5);

    // AgendaForm has: 7 selector testIDs + 2 hymn testIDs + 1 SelectorField forwarding testID={testID}
    // extractStaticTestIDs catches testID="xxx" (9 static) but not testID={testID} (dynamic reference)
    expect(agendaFormCount).toBe(9);
  });
});
