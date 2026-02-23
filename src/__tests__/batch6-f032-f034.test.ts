/**
 * Tests for Batch 6, Phase 2: Features F032-F034
 *
 * F032 (CR-87): Swipe Action Icons (pencil/trash) instead of Text
 * F033 (CR-88): Topics Screen Explanatory Text
 * F034 (CR-89): Collection Topics View (expand/collapse read-only list)
 *
 * Covers all acceptance criteria:
 *   AC-F032-01..05, AC-F033-01..06, AC-F034-01..08
 * Covers edge cases:
 *   EC-01..05
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import en from '../i18n/locales/en.json';
import ptBR from '../i18n/locales/pt-BR.json';
import es from '../i18n/locales/es.json';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F032 (CR-87): Swipe Action Icons (pencil/trash) instead of Text
// =============================================================================

describe('F032 (CR-87): Swipe Action Icons (pencil/trash) instead of Text', () => {

  describe('AC-F032-01: Edit button shows pencil icon, Delete button shows wastebasket icon', () => {
    it('should render PencilIcon SVG component in Edit button', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // The Edit button should use the PencilIcon SVG component
      expect(source).toContain('PencilIcon');
    });

    it('should render TrashIcon SVG component in Delete button', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // The Delete button should use the TrashIcon SVG component
      expect(source).toContain('TrashIcon');
    });

    it('should NOT render editLabel text inside Edit button content', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Verify the Edit button Text does NOT contain editLabel as visible text
      // The old pattern was {editLabel ?? 'Edit'} as button text
      expect(source).not.toMatch(/<Text[^>]*>\s*\{editLabel/);
    });

    it('should NOT render deleteLabel text inside Delete button content', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Verify the Delete button Text does NOT contain deleteLabel as visible text
      // The old pattern was {deleteLabel ?? 'Delete'} as button text
      expect(source).not.toMatch(/<Text[^>]*>\s*\{deleteLabel/);
    });
  });

  describe('AC-F032-02: Edit button onPress calls onEdit callback', () => {
    it('should have handleEdit that fires onEdit callback on press', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('onPress={handleEdit}');
      expect(source).toContain('onEdit?.()');
    });

    it('should have handleEdit that closes card before calling onEdit', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      const handleEditMatch = source.match(/const handleEdit = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleEditMatch).not.toBeNull();
      const body = handleEditMatch![0];
      expect(body).toContain('withSpring(0');
      expect(body).toContain('onReveal(null)');
      expect(body).toContain('onEdit?.()');
    });
  });

  describe('AC-F032-03: Delete button onPress calls onDelete callback', () => {
    it('should have handleDelete that fires onDelete callback on press', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('onPress={handleDelete}');
      expect(source).toContain('onDelete?.()');
    });

    it('should have handleDelete that closes card before calling onDelete', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      const handleDeleteMatch = source.match(/const handleDelete = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleDeleteMatch).not.toBeNull();
      const body = handleDeleteMatch![0];
      expect(body).toContain('withSpring(0');
      expect(body).toContain('onReveal(null)');
      expect(body).toContain('onDelete?.()');
    });
  });

  describe('AC-F032-04: accessibilityLabel uses text labels, not Unicode icons', () => {
    it('should have accessibilityLabel on Edit button using editLabel', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Edit Pressable should have accessibilityLabel={editLabel ?? 'Edit'}
      expect(source).toMatch(/accessibilityLabel=\{editLabel \?\? 'Edit'\}/);
    });

    it('should have accessibilityLabel on Delete button using deleteLabel', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Delete Pressable should have accessibilityLabel={deleteLabel ?? 'Delete'}
      expect(source).toMatch(/accessibilityLabel=\{deleteLabel \?\? 'Delete'\}/);
    });

    it('should NOT have Unicode pencil character in any accessibilityLabel', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // accessibilityLabel should never contain the icon characters
      const accessibilityLabels = source.match(/accessibilityLabel=\{[^}]+\}/g) ?? [];
      accessibilityLabels.forEach((label) => {
        expect(label).not.toContain('\\u270F');
        expect(label).not.toContain('\\uD83D\\uDDD1');
      });
    });

    it('should keep editLabel and deleteLabel in SwipeableCardProps interface', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('editLabel?: string');
      expect(source).toContain('deleteLabel?: string');
    });
  });

  describe('AC-F032-05: Icon styling (fontSize, color, contrast)', () => {
    it('should have actionIcon style with fontSize 20', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      const actionIconMatch = source.match(/actionIcon:\s*\{([^}]+)\}/);
      expect(actionIconMatch).not.toBeNull();
      expect(actionIconMatch![1]).toContain('fontSize: 20');
    });

    it('should have actionIcon style with textAlign center', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      const actionIconMatch = source.match(/actionIcon:\s*\{([^}]+)\}/);
      expect(actionIconMatch).not.toBeNull();
      expect(actionIconMatch![1]).toContain("textAlign: 'center'");
    });

    it('should use PencilIcon with size 20 for Edit button', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Edit button uses PencilIcon SVG component with size=20
      expect(source).toContain('PencilIcon size={20}');
    });

    it('should use TrashIcon with size 20 for Delete button', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Delete button uses TrashIcon SVG component with size=20
      expect(source).toContain('TrashIcon size={20}');
    });

    it('should use colors.onPrimary for Edit icon color', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // The Edit button PencilIcon should have color={colors.onPrimary}
      expect(source).toContain('<PencilIcon size={20} color={colors.onPrimary}');
    });

    it('should use #FFFFFF for Delete icon color', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // The Delete button TrashIcon should have color="#FFFFFF"
      expect(source).toContain('<TrashIcon size={20} color="#FFFFFF"');
    });

    it('should use colors.primary as Edit button background', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Edit button Pressable should have backgroundColor: colors.primary
      const editButton = source.match(/onPress=\{handleEdit\}[\s\S]{0,200}/);
      expect(editButton).not.toBeNull();
      // Look for the style on the Pressable with handleEdit
      expect(source).toMatch(/backgroundColor: colors\.primary[\s\S]*?onPress=\{handleEdit\}/);
    });

    it('should use colors.error as Delete button background', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Delete button Pressable should have backgroundColor: colors.error
      expect(source).toMatch(/backgroundColor: colors\.error[\s\S]*?onPress=\{handleDelete\}/);
    });
  });
});

// =============================================================================
// F033 (CR-88): Topics Screen Explanatory Text
// =============================================================================

describe('F033 (CR-88): Topics Screen Explanatory Text', () => {

  describe('AC-F033-01: Description text visible below header', () => {
    it('should render t(topics.description) text in the topics screen', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain("t('topics.description')");
    });

    it('should render description between header and Ward Topics section', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // The description should appear after the header View closes and before the Ward Topics section
      const headerEndIndex = source.indexOf('{/* Screen description */}');
      const wardTopicsIndex = source.indexOf('{/* Ward Topics Section */}');
      expect(headerEndIndex).toBeGreaterThan(-1);
      expect(wardTopicsIndex).toBeGreaterThan(-1);
      expect(headerEndIndex).toBeLessThan(wardTopicsIndex);

      // Verify the description text is between them
      const between = source.substring(headerEndIndex, wardTopicsIndex);
      expect(between).toContain("t('topics.description')");
    });
  });

  describe('AC-F033-02: Text explains ward topics and collection activation', () => {
    it('should mention ward topics in en description', () => {
      const text = (en as any).topics.description;
      expect(text.toLowerCase()).toContain('ward topics');
    });

    it('should mention activating/deactivating collections in en description', () => {
      const text = (en as any).topics.description;
      expect(text.toLowerCase()).toContain('activating');
      expect(text.toLowerCase()).toContain('deactivating');
    });

    it('should mention speeches in en description', () => {
      const text = (en as any).topics.description;
      expect(text.toLowerCase()).toContain('speeches');
    });

    it('should mention adding/editing/deleting in en description', () => {
      const text = (en as any).topics.description;
      expect(text.toLowerCase()).toContain('added');
      expect(text.toLowerCase()).toContain('edited');
      expect(text.toLowerCase()).toContain('deleted');
    });
  });

  describe('AC-F033-03: i18n key exists in all 3 locale files', () => {
    it('should have topics.description in en.json', () => {
      expect((en as any).topics.description).toBeDefined();
      expect(typeof (en as any).topics.description).toBe('string');
      expect((en as any).topics.description.length).toBeGreaterThan(0);
    });

    it('should have topics.description in pt-BR.json', () => {
      expect((ptBR as any).topics.description).toBeDefined();
      expect(typeof (ptBR as any).topics.description).toBe('string');
      expect((ptBR as any).topics.description.length).toBeGreaterThan(0);
    });

    it('should have topics.description in es.json', () => {
      expect((es as any).topics.description).toBeDefined();
      expect(typeof (es as any).topics.description).toBe('string');
      expect((es as any).topics.description.length).toBeGreaterThan(0);
    });

    it('should have topics.noTopics in en.json', () => {
      expect((en as any).topics.noTopics).toBeDefined();
      expect(typeof (en as any).topics.noTopics).toBe('string');
      expect((en as any).topics.noTopics.length).toBeGreaterThan(0);
    });

    it('should have topics.noTopics in pt-BR.json', () => {
      expect((ptBR as any).topics.noTopics).toBeDefined();
      expect(typeof (ptBR as any).topics.noTopics).toBe('string');
      expect((ptBR as any).topics.noTopics.length).toBeGreaterThan(0);
    });

    it('should have topics.noTopics in es.json', () => {
      expect((es as any).topics.noTopics).toBeDefined();
      expect(typeof (es as any).topics.noTopics).toBe('string');
      expect((es as any).topics.noTopics.length).toBeGreaterThan(0);
    });
  });

  describe('AC-F033-04: Description styling matches CR-80 pattern', () => {
    it('should have description style with fontSize 13', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain('fontSize: 13');
    });

    it('should have description style with textAlign center', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain("textAlign: 'center'");
    });

    it('should have description style with paddingHorizontal 16', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain('paddingHorizontal: 16');
    });

    it('should have description style with marginBottom 8', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain('marginBottom: 8');
    });

    it('should use colors.textSecondary for description text color', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // The description Text should have color: colors.textSecondary
      const descMatch = source.match(/t\('topics\.description'\)[\s\S]{0,200}/);
      expect(descMatch).not.toBeNull();
      // Look backwards to find the Text element with color
      const descSection = source.match(/<Text style=\{[^}]*colors\.textSecondary[^}]*\}[^>]*>\s*\{t\('topics\.description'\)\}/);
      expect(descSection).not.toBeNull();
    });
  });

  describe('AC-F033-05: Text wraps naturally on small screens', () => {
    it('should NOT have numberOfLines on description Text', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // Find the description Text element and verify no numberOfLines
      const descSection = source.match(/<Text[^>]*>\s*\{t\('topics\.description'\)\}\s*<\/Text>/);
      expect(descSection).not.toBeNull();
      expect(descSection![0]).not.toContain('numberOfLines');
    });

    it('should have paddingHorizontal on description for safe wrapping', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain('paddingHorizontal: 16');
    });
  });

  describe('AC-F033-06: All 3 locale files have same topics keys structure', () => {
    it('should have same set of topics keys in all 3 locales', () => {
      const enKeys = Object.keys((en as any).topics).sort();
      const ptBRKeys = Object.keys((ptBR as any).topics).sort();
      const esKeys = Object.keys((es as any).topics).sort();

      expect(enKeys).toEqual(ptBRKeys);
      expect(enKeys).toEqual(esKeys);
    });

    it('should have all existing topics keys preserved (no removal)', () => {
      // These are the minimum expected keys in topics section
      const requiredKeys = ['title', 'wardTopics', 'addTopic', 'topicTitle', 'topicLink', 'collections', 'description', 'noTopics'];
      requiredKeys.forEach((key) => {
        expect((en as any).topics).toHaveProperty(key);
        expect((ptBR as any).topics).toHaveProperty(key);
        expect((es as any).topics).toHaveProperty(key);
      });
    });

    it('all 3 locale files should be valid JSON', () => {
      const localeDir = path.resolve(__dirname, '..', 'i18n', 'locales');
      const files = ['en.json', 'pt-BR.json', 'es.json'];
      files.forEach((file) => {
        const content = fs.readFileSync(path.join(localeDir, file), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      });
    });
  });
});

// =============================================================================
// F034 (CR-89): Collection Topics View (expand/collapse read-only list)
// =============================================================================

describe('F034 (CR-89): Collection Topics View (expand/collapse read-only list)', () => {

  describe('AC-F034-01: Tapping collection shows topics below', () => {
    it('should have expandedCollectionId state in TopicsScreen', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('expandedCollectionId');
      expect(source).toMatch(/useState<string \| null>\(null\)/);
    });

    it('should have handleCollectionPress that toggles expandedCollectionId', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('handleCollectionPress');
      expect(source).toContain('setExpandedCollectionId');
    });

    it('should render CollectionTopicsList when collection is expanded', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // Verify conditional rendering of CollectionTopicsList
      expect(source).toContain('CollectionTopicsList');
      expect(source).toMatch(/expandedCollectionId === item\.id && [\s\S]*?CollectionTopicsList/);
    });

    it('should pass collectionId to CollectionTopicsList', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toMatch(/CollectionTopicsList collectionId=\{item\.id\}/);
    });
  });

  describe('AC-F034-02: Tapping expanded collection collapses it', () => {
    it('should toggle expandedCollectionId to null when same collection is tapped', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // handleCollectionPress should use a state updater that toggles: prev === collectionId ? null : collectionId
      expect(source).toContain('setExpandedCollectionId((prev) => (prev === collectionId ? null : collectionId))');
    });
  });

  describe('AC-F034-03: Topics fetched from general_topics by collection_id', () => {
    it('should have useCollectionTopics hook in useTopics.ts', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      expect(source).toContain('export function useCollectionTopics');
    });

    it('should query general_topics table in useCollectionTopics', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      const hookSection = source.match(/useCollectionTopics[\s\S]*?(?=export function|$)/);
      expect(hookSection).not.toBeNull();
      expect(hookSection![0]).toContain("from('general_topics')");
    });

    it('should filter by collection_id in useCollectionTopics', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      const hookSection = source.match(/useCollectionTopics[\s\S]*?(?=export function|$)/);
      expect(hookSection).not.toBeNull();
      expect(hookSection![0]).toContain("eq('collection_id'");
    });

    it('should order results by title ascending in useCollectionTopics', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      const hookSection = source.match(/useCollectionTopics[\s\S]*?(?=export function|$)/);
      expect(hookSection).not.toBeNull();
      expect(hookSection![0]).toContain("order('title'");
      expect(hookSection![0]).toContain('ascending: true');
    });

    it('should be disabled when collectionId is null', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      const hookSection = source.match(/useCollectionTopics[\s\S]*?(?=export function|$)/);
      expect(hookSection).not.toBeNull();
      expect(hookSection![0]).toContain('enabled: !!collectionId');
    });

    it('should have collectionTopics in topicKeys', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      expect(source).toContain('collectionTopics:');
      expect(source).toMatch(/collectionTopics:.*collectionId/);
    });

    it('should render topic title in collection topics list', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // CollectionTopicsList should render topic.title
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('topic.title');
    });

    it('should render topic link when available in collection topics list', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('topic.link');
      // Optional link rendering (conditional)
      expect(listSection![0]).toMatch(/topic\.link &&/);
    });

    it('should use primary color for topic link text', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('colors.primary');
    });
  });

  describe('AC-F034-04: Loading state shows ActivityIndicator', () => {
    it('should import ActivityIndicator from react-native', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('ActivityIndicator');
      expect(source).toMatch(/import[\s\S]*?ActivityIndicator[\s\S]*?from 'react-native'/);
    });

    it('should render ActivityIndicator when isLoading is true', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('isLoading');
      expect(listSection![0]).toContain('<ActivityIndicator');
    });

    it('should use small size and primary color for ActivityIndicator', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('size="small"');
      expect(listSection![0]).toContain('color={colors.primary}');
    });
  });

  describe('AC-F034-05: Empty state shows noTopics message', () => {
    it('should render t(topics.noTopics) when topics array is empty', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain("t('topics.noTopics')");
    });

    it('should check for empty or null topics', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      // Should check !topics || topics.length === 0
      expect(listSection![0]).toMatch(/!topics|topics\.length === 0/);
    });

    it('should style empty state text as italic', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const emptyTextStyle = source.match(/collectionTopicsEmptyText:\s*\{([^}]+)\}/);
      expect(emptyTextStyle).not.toBeNull();
      expect(emptyTextStyle![1]).toContain("fontStyle: 'italic'");
    });
  });

  describe('AC-F034-06: Switch toggle works independently of collection tap', () => {
    it('should have Switch outside of the Pressable in CollectionRow', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // CollectionRow should have Pressable wrapping chevron+name, then Switch as sibling
      const collectionRow = source.match(/function CollectionRow[\s\S]*?(?=\/\/ --- Collection Topics|function CollectionTopics)/);
      expect(collectionRow).not.toBeNull();
      const rowContent = collectionRow![0];
      // Switch should be after Pressable closes
      const pressableClose = rowContent.lastIndexOf('</Pressable>');
      const switchIndex = rowContent.indexOf('<Switch');
      expect(pressableClose).toBeGreaterThan(-1);
      expect(switchIndex).toBeGreaterThan(-1);
      expect(switchIndex).toBeGreaterThan(pressableClose);
    });

    it('should pass onToggle to Switch onValueChange (not to Pressable)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const collectionRow = source.match(/function CollectionRow[\s\S]*?(?=\/\/ --- Collection Topics|function CollectionTopics)/);
      expect(collectionRow).not.toBeNull();
      expect(collectionRow![0]).toContain('onValueChange={onToggle}');
    });

    it('should pass onPress to Pressable (not to Switch)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const collectionRow = source.match(/function CollectionRow[\s\S]*?(?=\/\/ --- Collection Topics|function CollectionTopics)/);
      expect(collectionRow).not.toBeNull();
      // Pressable should have onPress={onPress}
      expect(collectionRow![0]).toMatch(/<Pressable[\s\S]*?onPress=\{onPress\}/);
    });

    it('should have isExpanded and onPress in CollectionRowProps', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('isExpanded: boolean');
      expect(source).toContain('onPress: () => void');
    });
  });

  describe('AC-F034-07: Accordion pattern (one collection expanded at a time)', () => {
    it('should use single expandedCollectionId (not an array/set)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // State should be string | null, not Set or array
      expect(source).toMatch(/const \[expandedCollectionId, setExpandedCollectionId\] = useState<string \| null>\(null\)/);
    });

    it('should toggle by comparing prev with collectionId', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // When a new collection is clicked, previous one auto-closes because
      // expandedCollectionId changes to the new one
      expect(source).toContain('prev === collectionId ? null : collectionId');
    });
  });

  describe('AC-F034-08: Visual nesting and styling of expanded topics', () => {
    it('should have chevron showing ChevronRightIcon when collapsed', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // ChevronRightIcon for collapsed (right-pointing)
      expect(source).toContain('ChevronRightIcon');
    });

    it('should have chevron showing ChevronDownIcon when expanded', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // ChevronDownIcon for expanded (down-pointing)
      expect(source).toContain('ChevronDownIcon');
    });

    it('should toggle chevron based on isExpanded prop', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      // Ternary: isExpanded ? ChevronDownIcon : ChevronRightIcon
      expect(source).toContain('isExpanded');
      expect(source).toContain('ChevronDownIcon');
      expect(source).toContain('ChevronRightIcon');
    });

    it('should have chevron style with fontSize 10 and width 16', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const chevronStyle = source.match(/chevron:\s*\{([^}]+)\}/);
      expect(chevronStyle).not.toBeNull();
      expect(chevronStyle![1]).toContain('fontSize: 10');
      expect(chevronStyle![1]).toContain('width: 16');
    });

    it('should have collectionPressable style with flex 1 and flexDirection row', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const pressableStyle = source.match(/collectionPressable:\s*\{([^}]+)\}/);
      expect(pressableStyle).not.toBeNull();
      expect(pressableStyle![1]).toContain('flex: 1');
      expect(pressableStyle![1]).toContain("flexDirection: 'row'");
    });

    it('should have collection topics container with paddingLeft 32 (visual nesting)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const containerStyle = source.match(/collectionTopicsContainer:\s*\{([^}]+)\}/);
      expect(containerStyle).not.toBeNull();
      expect(containerStyle![1]).toContain('paddingLeft: 32');
    });

    it('should use textSecondary color for topic titles', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('colors.textSecondary');
    });

    it('should have hairlineWidth separator between topic items', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('StyleSheet.hairlineWidth');
    });

    it('should NOT have swipe or edit buttons in collection topics (read-only)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      // CollectionTopicsList should not use SwipeableCard
      expect(listSection![0]).not.toContain('SwipeableCard');
      expect(listSection![0]).not.toContain('onEdit');
      expect(listSection![0]).not.toContain('onDelete');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases (EC-01 to EC-05)', () => {

  describe('EC-01: Unicode emoji rendering (widely supported characters)', () => {
    it('should use PencilIcon SVG component (widely supported vector graphics)', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('PencilIcon');
    });

    it('should use TrashIcon SVG component (widely supported vector graphics)', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('TrashIcon');
    });
  });

  describe('EC-02: Long text wrapping on small screens', () => {
    it('should have no numberOfLines constraint on description', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descSection = source.match(/<Text[^>]*>\s*\{t\('topics\.description'\)\}\s*<\/Text>/);
      expect(descSection).not.toBeNull();
      expect(descSection![0]).not.toContain('numberOfLines');
    });

    it('should have paddingHorizontal for safe margins on small screens', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const descStyle = source.match(/description:\s*\{([^}]+)\}/);
      expect(descStyle).not.toBeNull();
      expect(descStyle![1]).toContain('paddingHorizontal: 16');
    });
  });

  describe('EC-03: Collection with zero topics (empty state)', () => {
    it('should show noTopics message when topics array is empty', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain("t('topics.noTopics')");
      expect(listSection![0]).toMatch(/topics\.length === 0/);
    });

    it('should show noTopics message when topics is null/undefined', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('!topics');
    });
  });

  describe('EC-04: Network latency on first collection expand (loading state)', () => {
    it('should show ActivityIndicator during loading', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const listSection = source.match(/function CollectionTopicsList[\s\S]*?(?=\/\/ --- Main Screen|function TopicsScreen)/);
      expect(listSection).not.toBeNull();
      expect(listSection![0]).toContain('isLoading');
      expect(listSection![0]).toContain('ActivityIndicator');
    });

    it('should have loading container with paddingVertical 16', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const loadingStyle = source.match(/collectionTopicsLoading:\s*\{([^}]+)\}/);
      expect(loadingStyle).not.toBeNull();
      expect(loadingStyle![1]).toContain('paddingVertical: 16');
    });
  });

  describe('EC-05: Switch tap vs collection row tap event conflict', () => {
    it('should wrap only chevron and name in Pressable (not Switch)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const collectionRow = source.match(/function CollectionRow[\s\S]*?(?=\/\/ --- Collection Topics|function CollectionTopics)/);
      expect(collectionRow).not.toBeNull();
      const content = collectionRow![0];
      // Verify structure: Pressable contains chevron + name, Switch is sibling
      expect(content).toMatch(/<Pressable[\s\S]*?chevron[\s\S]*?collectionName[\s\S]*?<\/Pressable>/);
      // Switch should NOT be inside Pressable
      const pressableContent = content.match(/<Pressable[\s\S]*?<\/Pressable>/);
      expect(pressableContent).not.toBeNull();
      expect(pressableContent![0]).not.toContain('<Switch');
    });
  });
});

// =============================================================================
// Regression checks (no existing features broken)
// =============================================================================

describe('Regression: Existing SwipeableCard functionality preserved', () => {
  it('should still have handleEdit function', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('const handleEdit');
    expect(source).toContain('onEdit?.()');
  });

  it('should still have handleDelete function', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('const handleDelete');
    expect(source).toContain('onDelete?.()');
  });

  it('should still have GestureDetector for pan gesture', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('GestureDetector');
    expect(source).toContain('panGesture');
  });

  it('should still have animated translateX style', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('useAnimatedStyle');
    expect(source).toContain('translateX');
  });

  it('should still have pointerEvents box-none on Animated.View', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('pointerEvents="box-none"');
  });

  it('should still have onReveal callback for single-reveal management', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('onReveal');
    expect(source).toContain('activeId');
  });
});

describe('Regression: Existing Topics screen functionality preserved', () => {
  it('should still have TopicEditor component', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('function TopicEditor');
  });

  it('should still have TopicRow component', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('function TopicRow');
  });

  it('should still have CollectionRow component', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('function CollectionRow');
  });

  it('should still import SwipeableCard', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain("import { SwipeableCard }");
  });

  it('should still import SearchInput', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain("import { SearchInput }");
  });

  it('should still have search functionality', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('setSearch');
    expect(source).toContain('SearchInput');
  });

  it('should still have ward topics CRUD', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('useCreateWardTopic');
    expect(source).toContain('useUpdateWardTopic');
    expect(source).toContain('useDeleteWardTopic');
  });

  it('should still have collection toggle', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('useToggleCollection');
    expect(source).toContain('handleToggleCollection');
  });
});

describe('Regression: useTopics hook integrity', () => {
  it('should still export useWardTopics', () => {
    const source = readSourceFile('hooks/useTopics.ts');
    expect(source).toContain('export function useWardTopics');
  });

  it('should still export useCollections', () => {
    const source = readSourceFile('hooks/useTopics.ts');
    expect(source).toContain('export function useCollections');
  });

  it('should still export useActiveTopics', () => {
    const source = readSourceFile('hooks/useTopics.ts');
    expect(source).toContain('export function useActiveTopics');
  });

  it('should still export useToggleCollection', () => {
    const source = readSourceFile('hooks/useTopics.ts');
    expect(source).toContain('export function useToggleCollection');
  });

  it('should export useCollectionTopics (new hook)', () => {
    const source = readSourceFile('hooks/useTopics.ts');
    expect(source).toContain('export function useCollectionTopics');
  });

  it('topics.tsx should import useCollectionTopics', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('useCollectionTopics');
    expect(source).toMatch(/import[\s\S]*?useCollectionTopics[\s\S]*?from[\s\S]*?useTopics/);
  });
});
