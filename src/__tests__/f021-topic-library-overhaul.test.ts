/**
 * F021: Topic Library Overhaul (CR-285, CR-286, CR-287, CR-288)
 *
 * Tester behavioral tests covering:
 * - CR-285: Delete special topics collection, FIXED_COLLECTION_ORDER cleanup, knownNames cleanup
 * - CR-286: is_default column, default topics, section rename, sort order, swipe disabled
 * - CR-287: Description text updated in all 3 languages
 * - CR-288: Search removed, Close removed, + button removed, inline add, canWrite guard
 *
 * ACs covered: AC-285-1..5, AC-286-1..7, AC-287-1..3, AC-288-1..8
 * ECs covered: EC-285-1, EC-286-1, EC-286-2, EC-288-1, EC-288-2
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import { FIXED_COLLECTION_ORDER } from '../hooks/useTopics';

// =============================================================================
// CR-285: Delete special topics collection
// =============================================================================

describe('CR-285: Delete special topics collection', () => {
  // AC-285-1: Migration 033 deletes special topics from general_collections
  describe('AC-285-1: Migration 033 deletes special topics', () => {
    const migrationPath = path.join(
      __dirname, '..', '..', 'supabase', 'migrations', '033_delete_special_topics.sql'
    );

    it('migration 033 file exists', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('contains DELETE FROM general_collections', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain('DELETE FROM general_collections');
    });

    it('deletes all 3 language variants', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain('Temas Especiais');
      expect(content).toContain('Special Topics');
      expect(content).toContain('Temas Especiales');
    });

    it('uses WHERE name IN clause', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toMatch(/WHERE\s+name\s+IN/i);
    });
  });

  // AC-285-2, AC-285-3: CASCADE handles cleanup (no explicit DELETE on child tables)
  describe('AC-285-2/3: CASCADE handles general_topics and ward_collection_config cleanup', () => {
    it('does NOT explicitly delete from general_topics (CASCADE handles it)', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '..', '..', 'supabase', 'migrations', '033_delete_special_topics.sql'),
        'utf-8'
      );
      expect(content).not.toMatch(/DELETE\s+FROM\s+general_topics/i);
    });

    it('does NOT explicitly delete from ward_collection_config (CASCADE handles it)', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '..', '..', 'supabase', 'migrations', '033_delete_special_topics.sql'),
        'utf-8'
      );
      expect(content).not.toMatch(/DELETE\s+FROM\s+ward_collection_config/i);
    });
  });

  // AC-285-4 / EC-285-1: Speech snapshots preserved (no FK to general_collections)
  describe('AC-285-4 / EC-285-1: Speech snapshots preserved', () => {
    it('migration does not touch speeches table', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '..', '..', 'supabase', 'migrations', '033_delete_special_topics.sql'),
        'utf-8'
      );
      expect(content).not.toContain('speeches');
    });
  });

  // AC-285-5: FIXED_COLLECTION_ORDER no longer has special topics
  describe('AC-285-5: FIXED_COLLECTION_ORDER has no special topics entries', () => {
    it('does not contain Temas Especiais', () => {
      expect(FIXED_COLLECTION_ORDER['Temas Especiais']).toBeUndefined();
    });

    it('does not contain Special Topics', () => {
      expect(FIXED_COLLECTION_ORDER['Special Topics']).toBeUndefined();
    });

    it('does not contain Temas Especiales', () => {
      expect(FIXED_COLLECTION_ORDER['Temas Especiales']).toBeUndefined();
    });

    it('has exactly 6 entries (2 per language, no special topics)', () => {
      expect(Object.keys(FIXED_COLLECTION_ORDER)).toHaveLength(6);
    });
  });

  // AC-285-5 continued: knownNames in register-first-user
  describe('AC-285-5: knownNames in register-first-user has no special topics', () => {
    const registerPath = path.join(
      __dirname, '..', '..', 'supabase', 'functions', 'register-first-user', 'index.ts'
    );

    it('register-first-user does not reference Temas Especiais in knownNames', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      // Extract the knownNames set content
      const knownNamesMatch = content.match(/const knownNames\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
      expect(knownNamesMatch).not.toBeNull();
      const knownNamesContent = knownNamesMatch![1];
      expect(knownNamesContent).not.toContain('Temas Especiais');
      expect(knownNamesContent).not.toContain('Special Topics');
      expect(knownNamesContent).not.toContain('Temas Especiales');
    });

    it('knownNames has exactly 6 entries (2 per language)', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      const knownNamesMatch = content.match(/const knownNames\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
      expect(knownNamesMatch).not.toBeNull();
      // Count single-quoted strings in the knownNames set
      const entries = knownNamesMatch![1].match(/'[^']+'/g);
      expect(entries).toHaveLength(6);
    });
  });
});

// =============================================================================
// CR-286: Default ward topics with is_default column
// =============================================================================

describe('CR-286: Default ward topics', () => {
  // AC-286-1: register-first-user inserts default topics
  describe('AC-286-1: register-first-user inserts 2 default ward topics', () => {
    const registerPath = path.join(
      __dirname, '..', '..', 'supabase', 'functions', 'register-first-user', 'index.ts'
    );

    it('has defaultTopicTitles map with pt-BR topics', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toContain("'Tema livre'");
      expect(content).toContain("'Seu testemunho'");
    });

    it('has defaultTopicTitles map with en-US topics', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toContain("'Open Topic'");
      expect(content).toContain("'Your Testimony'");
    });

    it('has defaultTopicTitles map with es-LA topics', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toContain("'Tema libre'");
      expect(content).toContain("'Tu testimonio'");
    });

    it('inserts with is_default: true', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toContain('is_default: true');
    });

    it('falls back to en-US for unknown language via ?? operator', () => {
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toMatch(/defaultTopicTitles\[wardLanguage\]\s*\?\?\s*defaultTopicTitles\['en-US'\]/);
    });
  });

  // AC-286-2, AC-286-7: Migration 034 adds is_default column + seeds defaults
  describe('AC-286-2/7: Migration 034 adds is_default and seeds defaults', () => {
    const migrationPath = path.join(
      __dirname, '..', '..', 'supabase', 'migrations', '034_add_default_ward_topics.sql'
    );

    it('migration 034 file exists', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('adds is_default column to ward_topics', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toMatch(/ALTER\s+TABLE\s+ward_topics\s+ADD\s+COLUMN\s+is_default/i);
    });

    it('is_default has NOT NULL DEFAULT false', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toMatch(/is_default\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/i);
    });

    it('inserts pt-BR defaults', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain("'Tema livre'");
      expect(content).toContain("'Seu testemunho'");
    });

    it('inserts en-US defaults', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain("'Open Topic'");
      expect(content).toContain("'Your Testimony'");
    });

    it('inserts es-LA defaults', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain("'Tema libre'");
      expect(content).toContain("'Tu testimonio'");
    });

    it('uses NOT EXISTS guard to prevent duplicates (AC-286-7)', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const notExistsCount = (content.match(/NOT\s+EXISTS/gi) || []).length;
      // 3 INSERT blocks (one per language), each with NOT EXISTS
      expect(notExistsCount).toBe(3);
    });

    it('uses CROSS JOIN with VALUES for topic titles', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const crossJoinCount = (content.match(/CROSS\s+JOIN/gi) || []).length;
      expect(crossJoinCount).toBe(3);
    });

    it('filters wards by language', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain("w.language = 'pt-BR'");
      expect(content).toContain("w.language = 'en-US'");
      expect(content).toContain("w.language = 'es-LA'");
    });

    it('all inserted rows have is_default set to true', () => {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      // Each INSERT has "true" as the is_default value in the SELECT
      const insertBlocks = content.split(/INSERT INTO ward_topics/i).slice(1);
      expect(insertBlocks).toHaveLength(3);
      for (const block of insertBlocks) {
        expect(block).toContain(', true');
      }
    });
  });

  // AC-286-3: Section title renamed to 'Custom Topics'
  describe('AC-286-3: Section title renamed to customTopics', () => {
    it('topics.tsx uses t("topics.customTopics") for section title', () => {
      const topicsPath = path.join(
        __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
      );
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain("t('topics.customTopics')");
    });

    it('topics.tsx does NOT use t("topics.wardTopics") for section title', () => {
      const topicsPath = path.join(
        __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
      );
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).not.toContain("t('topics.wardTopics')");
    });
  });

  // AC-286-4 / EC-286-2: Default topics sorted before custom topics
  describe('AC-286-4 / EC-286-2: Default topics sorted first', () => {
    it('useWardTopics orders by is_default DESC as first sort key', () => {
      const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      expect(content).toContain(".order('is_default', { ascending: false })");
    });

    it('useWardTopics orders by title ASC as second sort key', () => {
      const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      // is_default DESC comes before title ASC
      const isDefaultIndex = content.indexOf(".order('is_default'");
      const titleIndex = content.indexOf(".order('title'");
      expect(isDefaultIndex).toBeLessThan(titleIndex);
    });
  });

  // AC-286-5 / EC-286-1: SwipeableCard disabled for default topics
  describe('AC-286-5 / EC-286-1: SwipeableCard disabled for default topics', () => {
    it('TopicRow disabled includes is_default check', () => {
      const topicsPath = path.join(
        __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
      );
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // disabled={!canWrite || item.is_default}
      expect(content).toContain('item.is_default');
      expect(content).toMatch(/disabled=\{!canWrite\s*\|\|\s*item\.is_default\}/);
    });
  });

  // AC-286-6: useActiveTopics uses customTopics label
  describe('AC-286-6: useActiveTopics uses customTopics label', () => {
    it('useActiveTopics references topics.customTopics for ward topic label', () => {
      const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      expect(content).toContain("t('topics.customTopics')");
    });

    it('useActiveTopics does NOT use topics.wardTopics', () => {
      const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      expect(content).not.toContain("t('topics.wardTopics')");
    });
  });

  // WardTopic type has is_default field
  describe('WardTopic type has is_default field', () => {
    it('database.ts WardTopic interface includes is_default: boolean', () => {
      const typesPath = path.join(__dirname, '..', '..', 'src', 'types', 'database.ts');
      const content = fs.readFileSync(typesPath, 'utf-8');
      // Extract WardTopic interface
      const interfaceMatch = content.match(/export interface WardTopic\s*\{([\s\S]*?)\}/);
      expect(interfaceMatch).not.toBeNull();
      expect(interfaceMatch![1]).toContain('is_default: boolean');
    });
  });
});

// =============================================================================
// CR-287: Update descriptive text on topics screen
// =============================================================================

describe('CR-287: Description text updated in all 3 languages', () => {
  // AC-287-1: pt-BR description
  it('AC-287-1: pt-BR topics.description has correct text', () => {
    const topicsSection = (ptBR as Record<string, Record<string, string>>).topics;
    expect(topicsSection.description).toBe(
      'Crie temas personalizados ou ative cole\u00e7\u00f5es de temas pr\u00e9-definidos. Ativar uma cole\u00e7\u00e3o torna seus temas dispon\u00edveis para serem designados a discursantes. Deslize temas personalizados para editar ou remover.'
    );
  });

  // AC-287-2: en-US description
  it('AC-287-2: en-US topics.description has correct text', () => {
    const topicsSection = (enUS as Record<string, Record<string, string>>).topics;
    expect(topicsSection.description).toBe(
      'Create custom topics or activate predefined topic collections. Activating a collection makes its topics available for assigning to speakers. Swipe custom topics to edit or remove.'
    );
  });

  // AC-287-3: es-LA description
  it('AC-287-3: es-LA topics.description has correct text', () => {
    const topicsSection = (esLA as Record<string, Record<string, string>>).topics;
    expect(topicsSection.description).toBe(
      'Cree temas personalizados o active colecciones de temas predefinidos. Activar una colecci\u00f3n hace que sus temas est\u00e9n disponibles para asignar a oradores. Deslice temas personalizados para editar o eliminar.'
    );
  });
});

// =============================================================================
// CR-286 + CR-287: i18n keys
// =============================================================================

describe('CR-286 i18n: customTopics key exists in all locales', () => {
  it('pt-BR has topics.customTopics = "Temas Personalizados"', () => {
    const topicsSection = (ptBR as Record<string, Record<string, string>>).topics;
    expect(topicsSection.customTopics).toBe('Temas Personalizados');
  });

  it('en-US has topics.customTopics = "Custom Topics"', () => {
    const topicsSection = (enUS as Record<string, Record<string, string>>).topics;
    expect(topicsSection.customTopics).toBe('Custom Topics');
  });

  it('es-LA has topics.customTopics = "Temas Personalizados"', () => {
    const topicsSection = (esLA as Record<string, Record<string, string>>).topics;
    expect(topicsSection.customTopics).toBe('Temas Personalizados');
  });

  it('wardTopics key still exists for backward compatibility', () => {
    const ptTopics = (ptBR as Record<string, Record<string, string>>).topics;
    const enTopics = (enUS as Record<string, Record<string, string>>).topics;
    const esTopics = (esLA as Record<string, Record<string, string>>).topics;
    expect(ptTopics.wardTopics).toBeDefined();
    expect(enTopics.wardTopics).toBeDefined();
    expect(esTopics.wardTopics).toBeDefined();
  });
});

// =============================================================================
// CR-288: Replace search + add button with inline add field
// =============================================================================

describe('CR-288: Inline add replaces search + floating button', () => {
  const topicsPath = path.join(
    __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
  );

  // AC-288-1: No search field or Close button visible
  describe('AC-288-1: No search field or Close button', () => {
    it('does not import SearchInput', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).not.toContain('SearchInput');
    });

    it('does not have search state', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // No useState for search string
      expect(content).not.toMatch(/useState.*search/i);
      expect(content).not.toContain('setSearch');
    });

    it('does not have filteredTopics', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).not.toContain('filteredTopics');
    });

    it('does not have searchContainer style', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).not.toContain('searchContainer');
    });

    it('does not have closeButtonText style', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).not.toContain('closeButtonText');
    });
  });

  // AC-288-2: No floating '+' button
  describe('AC-288-2: No floating "+" button in section header', () => {
    it('does not have addButton style', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // addTopicRow and addTopicPlaceholder exist, but addButton/addButtonText should not
      expect(content).not.toMatch(/\baddButton\b(?!Text)/);
      expect(content).not.toContain('addButtonText');
    });

    it('sectionHeader does not contain a Pressable for add', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // Find the sectionHeader View - it should only contain the section title
      const sectionHeaderMatch = content.match(/sectionHeader\}[^]*?<\/View>/);
      if (sectionHeaderMatch) {
        // Should not contain a Pressable with + inside
        expect(sectionHeaderMatch[0]).not.toContain('handleAdd');
      }
    });
  });

  // AC-288-3: Inline add placeholder visible below topics
  describe('AC-288-3: Inline add placeholder below last topic', () => {
    it('has addTopicRow style', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('addTopicRow');
    });

    it('has addTopicPlaceholder style', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('addTopicPlaceholder');
    });

    it('uses t("topics.addTopic") for placeholder text', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain("t('topics.addTopic')");
    });

    it('addTopicPlaceholder has fontStyle italic', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      const stylesMatch = content.match(/addTopicPlaceholder:\s*\{([\s\S]*?)\}/);
      expect(stylesMatch).not.toBeNull();
      expect(stylesMatch![1]).toContain("fontStyle: 'italic'");
    });
  });

  // AC-288-4: TopicEditor expands on tap of inline placeholder
  describe('AC-288-4: TopicEditor expands inline on tap', () => {
    it('inline add area has Pressable that sets isAdding to true', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('setIsAdding(true)');
    });

    it('when isAdding is true, TopicEditor is rendered', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // isAdding triggers TopicEditor rendering
      expect(content).toContain('isAdding');
      expect(content).toContain('<TopicEditor');
    });
  });

  // AC-288-5: New topic created on save, editor collapses
  describe('AC-288-5: Save creates topic and collapses editor', () => {
    it('handleSaveNew calls createTopic.mutate', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('createTopic.mutate');
    });

    it('handleSaveNew sets isAdding to false on success', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('onSuccess: () => setIsAdding(false)');
    });
  });

  // AC-288-6: Cancel collapses editor
  describe('AC-288-6: Cancel collapses editor without creating topic', () => {
    it('TopicEditor onCancel sets isAdding to false', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('onCancel={() => setIsAdding(false)}');
    });
  });

  // AC-288-7 / EC-288-1: Inline add hidden for observers
  describe('AC-288-7 / EC-288-1: Inline add hidden when canWrite is false', () => {
    it('inline add area wrapped in canWrite guard', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      // {canWrite && ( ... isAdding ? TopicEditor : Pressable ... )}
      expect(content).toContain('canWrite');
      // Verify the pattern: canWrite && (isAdding ? ... : ...)
      expect(content).toMatch(/canWrite\s*&&\s*\(/);
    });
  });

  // AC-288-8 / EC-288-2: All topics shown without filtering
  describe('AC-288-8 / EC-288-2: All topics shown without filtering', () => {
    it('renders wardTopics directly (not filteredTopics)', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain('wardTopics.map');
      expect(content).not.toContain('filteredTopics');
    });

    it('useWardTopics called with no arguments', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toMatch(/useWardTopics\(\)/);
    });
  });

  // TopicEditor component has title and link fields
  describe('AC-288-4 continued: TopicEditor has title + link fields', () => {
    it('TopicEditor has title input', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain("placeholder={t('topics.topicTitle')}");
    });

    it('TopicEditor has link input', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain("placeholder={t('topics.topicLink')}");
    });

    it('TopicEditor has Save and Cancel buttons', () => {
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toContain("t('common.save')");
      expect(content).toContain("t('common.cancel')");
    });
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe('Edge cases', () => {
  // EC-021-02: Unknown ward language falls back to en-US in register-first-user
  describe('EC-021-02: Unknown language fallback to en-US', () => {
    it('defaultTopicTitles uses ?? for en-US fallback', () => {
      const registerPath = path.join(
        __dirname, '..', '..', 'supabase', 'functions', 'register-first-user', 'index.ts'
      );
      const content = fs.readFileSync(registerPath, 'utf-8');
      expect(content).toContain("?? defaultTopicTitles['en-US']");
    });
  });

  // EC-021-03: Migration 033 does not affect speeches table
  describe('EC-021-03: Speech snapshots not affected by migration', () => {
    it('migration 033 only deletes from general_collections', () => {
      const migrationPath = path.join(
        __dirname, '..', '..', 'supabase', 'migrations', '033_delete_special_topics.sql'
      );
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const deleteStatements = content.match(/DELETE\s+FROM\s+\w+/gi) || [];
      expect(deleteStatements).toHaveLength(1);
      expect(deleteStatements[0]).toMatch(/general_collections/i);
    });
  });

  // EC-021-05: SwipeableCard disabled for default topics
  describe('EC-021-05: Default topic swipe protection', () => {
    it('disabled prop combines canWrite and is_default', () => {
      const topicsPath = path.join(
        __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
      );
      const content = fs.readFileSync(topicsPath, 'utf-8');
      expect(content).toMatch(/disabled=\{!canWrite\s*\|\|\s*item\.is_default\}/);
    });
  });

  // FIXED_COLLECTION_ORDER priorities after shift
  describe('FIXED_COLLECTION_ORDER priorities after CR-285', () => {
    it('FSY collections have priority 0', () => {
      expect(FIXED_COLLECTION_ORDER['Para a Forca da Juventude']).toBe(0);
      expect(FIXED_COLLECTION_ORDER['For the Strength of Youth']).toBe(0);
      expect(FIXED_COLLECTION_ORDER['Para la Fortaleza de la Juventud']).toBe(0);
    });

    it('Gospel Principles collections have priority 1', () => {
      expect(FIXED_COLLECTION_ORDER['Principios do Evangelho']).toBe(1);
      expect(FIXED_COLLECTION_ORDER['Gospel Principles']).toBe(1);
      expect(FIXED_COLLECTION_ORDER['Principios del Evangelio']).toBe(1);
    });

    it('unknown collection names default to priority 3', () => {
      expect(FIXED_COLLECTION_ORDER['Unknown Collection'] ?? 3).toBe(3);
      expect(FIXED_COLLECTION_ORDER['Outubro 2025'] ?? 3).toBe(3);
    });
  });

  // normalizeForSearch still present (kept per team-lead instruction)
  describe('normalizeForSearch kept in useTopics.ts', () => {
    it('normalizeForSearch function still exists', () => {
      const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      expect(content).toContain('function normalizeForSearch');
    });
  });
});

// =============================================================================
// Cross-cutting: Verify no regressions in existing structure
// =============================================================================

describe('Cross-cutting: No regressions', () => {
  it('topics.tsx does not import from removed modules', () => {
    const topicsPath = path.join(
      __dirname, '..', '..', 'src', 'app', '(tabs)', 'settings', 'topics.tsx'
    );
    const content = fs.readFileSync(topicsPath, 'utf-8');
    // Should not import SearchInput
    expect(content).not.toMatch(/import.*SearchInput/);
  });

  it('useWardTopics has no search parameter in function signature', () => {
    const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
    const content = fs.readFileSync(hooksPath, 'utf-8');
    // useWardTopics() - no params
    expect(content).toMatch(/export function useWardTopics\(\)/);
  });

  it('useWardTopics has no select callback', () => {
    const hooksPath = path.join(__dirname, '..', '..', 'src', 'hooks', 'useTopics.ts');
    const content = fs.readFileSync(hooksPath, 'utf-8');
    // Extract useWardTopics function body
    const fnMatch = content.match(/export function useWardTopics\(\)([\s\S]*?)^export function/m);
    expect(fnMatch).not.toBeNull();
    // Should not have a select callback inside useWardTopics
    expect(fnMatch![1]).not.toContain('select:');
  });

  it('migrations are in correct order (033 before 034)', () => {
    const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    const migration033Idx = files.findIndex(f => f.startsWith('033'));
    const migration034Idx = files.findIndex(f => f.startsWith('034'));
    expect(migration033Idx).toBeLessThan(migration034Idx);
  });

  it('addTopic i18n key exists in all locales', () => {
    const ptTopics = (ptBR as Record<string, Record<string, string>>).topics;
    const enTopics = (enUS as Record<string, Record<string, string>>).topics;
    const esTopics = (esLA as Record<string, Record<string, string>>).topics;
    expect(ptTopics.addTopic).toBeDefined();
    expect(enTopics.addTopic).toBeDefined();
    expect(esTopics.addTopic).toBeDefined();
  });
});
