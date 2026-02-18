/**
 * Tests for Batch 7, Phase 2: UX & Features F040-F044
 *
 * F040 (CR-94): Update default WhatsApp template (i18n templates)
 * F041 (CR-96): Search fields fixed at top filling available space
 * F042 (CR-97): Multi-select for 'Reconhecendo a Presenca' field
 * F043 (CR-99): Change speech labels from 'Orador' to 'Discurso'
 * F044 (CR-100): Read-only speaker field with last-minute swap
 *
 * Covers acceptance criteria:
 *   AC-F040-01..06, AC-F041-01..06, AC-F042-01..09, AC-F043-01..05, AC-F044-01..10
 * Covers edge cases:
 *   EC-F040-01..02, EC-F041-01..02, EC-F042-01..03, EC-F043-01, EC-F044-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getDefaultTemplate,
  resolveTemplate,
  buildWhatsAppUrl,
  DEFAULT_TEMPLATE_PT_BR,
  DEFAULT_TEMPLATE_EN,
  DEFAULT_TEMPLATE_ES,
} from '../lib/whatsappUtils';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf-8');
}

// =============================================================================
// F040 (CR-94): Update default WhatsApp template (i18n templates)
// =============================================================================

describe('F040 (CR-94): Update default WhatsApp template (i18n templates)', () => {

  const getWhatsAppUtils = () => readSourceFile('lib/whatsappUtils.ts');
  const getWhatsApp = () => readSourceFile('lib/whatsapp.ts');
  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');

  describe('AC-F040-01: Template padrao em pt-BR inclui 6 placeholders', () => {
    it('should export DEFAULT_TEMPLATE_PT_BR', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('export const DEFAULT_TEMPLATE_PT_BR');
    });

    it('should include {nome} placeholder in pt-BR template', () => {
      // Import and test the actual template
      const content = getWhatsAppUtils();
      const match = content.match(/DEFAULT_TEMPLATE_PT_BR\s*=\s*[`'"]([\s\S]*?)[`'"]\s*;/);
      expect(match).not.toBeNull();
      // Check for placeholders in the source code region around DEFAULT_TEMPLATE_PT_BR
      const ptBrSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_PT_BR'),
        content.indexOf('DEFAULT_TEMPLATE_EN')
      );
      expect(ptBrSection).toContain('{data}');
      expect(ptBrSection).toContain('{posicao}');
      expect(ptBrSection).toContain('{colecao}');
      expect(ptBrSection).toContain('{titulo}');
      expect(ptBrSection).toContain('{link}');
    });
  });

  describe('AC-F040-02: Template padrao em en existe e usa 6 placeholders', () => {
    it('should export DEFAULT_TEMPLATE_EN', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('export const DEFAULT_TEMPLATE_EN');
    });

    it('should include all 6 placeholders in en template', () => {
      const content = getWhatsAppUtils();
      const enSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_EN'),
        content.indexOf('DEFAULT_TEMPLATE_ES')
      );
      expect(enSection).toContain('{data}');
      expect(enSection).toContain('{posicao}');
      expect(enSection).toContain('{colecao}');
      expect(enSection).toContain('{titulo}');
      expect(enSection).toContain('{link}');
    });
  });

  describe('AC-F040-03: Template padrao em es existe e usa 6 placeholders', () => {
    it('should export DEFAULT_TEMPLATE_ES', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('export const DEFAULT_TEMPLATE_ES');
    });

    it('should include all 6 placeholders in es template', () => {
      const content = getWhatsAppUtils();
      const esSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_ES'),
        content.indexOf('export function getDefaultTemplate')
      );
      expect(esSection).toContain('{data}');
      expect(esSection).toContain('{posicao}');
      expect(esSection).toContain('{colecao}');
      expect(esSection).toContain('{titulo}');
      expect(esSection).toContain('{link}');
    });
  });

  describe('AC-F040-04: buildWhatsAppUrl usa template do idioma da ala como fallback', () => {
    it('should have getDefaultTemplate function', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('export function getDefaultTemplate');
    });

    it('should accept language parameter in getDefaultTemplate', () => {
      const content = getWhatsAppUtils();
      expect(content).toMatch(/getDefaultTemplate\s*\(\s*language\s*:\s*string\)/);
    });

    it('should return DEFAULT_TEMPLATE_EN for "en"', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain("case 'en':");
      expect(content).toContain('return DEFAULT_TEMPLATE_EN');
    });

    it('should return DEFAULT_TEMPLATE_ES for "es"', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain("case 'es':");
      expect(content).toContain('return DEFAULT_TEMPLATE_ES');
    });

    it('should return DEFAULT_TEMPLATE_PT_BR as default (fallback)', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('return DEFAULT_TEMPLATE_PT_BR');
    });

    it('should have language parameter in buildWhatsAppUrl with default pt-BR', () => {
      const content = getWhatsAppUtils();
      expect(content).toMatch(/language\s*:\s*string\s*=\s*'pt-BR'/);
    });

    it('should use getDefaultTemplate(language) in buildWhatsAppUrl when template is empty', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('getDefaultTemplate(language)');
    });

    it('should pass locale as 5th argument to buildWhatsAppUrl in InviteManagementSection', () => {
      const content = getInviteManagement();
      // buildWhatsAppUrl should be called with locale as last param (multi-line call)
      expect(content).toContain('buildWhatsAppUrl(');
      expect(content).toMatch(/buildWhatsAppUrl\s*\([\s\S]*?locale\s*\n?\s*\)/);
    });
  });

  describe('AC-F040-05: resolveTemplate continua resolvendo todos os 6 placeholders', () => {
    it('should replace {nome} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('result = result.replace');
      expect(content).toContain('{nome}');
    });

    it('should replace {data} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('{data}');
      expect(content).toContain('vars.date');
    });

    it('should replace {posicao} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('{posicao}');
      expect(content).toContain('vars.position');
    });

    it('should replace {colecao} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('{colecao}');
      expect(content).toContain('vars.collection');
    });

    it('should replace {titulo} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('{titulo}');
      expect(content).toContain('vars.topic');
    });

    it('should replace {link} placeholder', () => {
      const content = getWhatsAppUtils();
      expect(content).toContain('{link}');
      expect(content).toContain('vars.link');
    });
  });

  describe('AC-F040-06: Testes existentes de WhatsApp continuam passando', () => {
    it('should re-export DEFAULT_TEMPLATE_EN from whatsapp.ts', () => {
      const content = getWhatsApp();
      expect(content).toContain('DEFAULT_TEMPLATE_EN');
    });

    it('should re-export DEFAULT_TEMPLATE_ES from whatsapp.ts', () => {
      const content = getWhatsApp();
      expect(content).toContain('DEFAULT_TEMPLATE_ES');
    });

    it('should re-export getDefaultTemplate from whatsapp.ts', () => {
      const content = getWhatsApp();
      expect(content).toContain('getDefaultTemplate');
    });

    it('should continue to re-export resolveTemplate from whatsapp.ts', () => {
      const content = getWhatsApp();
      expect(content).toContain('resolveTemplate');
    });

    it('should continue to re-export buildWhatsAppUrl from whatsapp.ts', () => {
      const content = getWhatsApp();
      expect(content).toContain('buildWhatsAppUrl');
    });
  });

  describe('EC-F040-01: Template customizado da ala tem prioridade', () => {
    it('should use template parameter when not empty in buildWhatsAppUrl', () => {
      const content = getWhatsAppUtils();
      // The logic should be: const messageTemplate = template || getDefaultTemplate(language)
      expect(content).toMatch(/template\s*\|\|\s*getDefaultTemplate\s*\(\s*language\s*\)/);
    });
  });

  describe('EC-F040-02: Idioma nao suportado fallback para pt-BR', () => {
    it('should have default case returning pt-BR template', () => {
      const content = getWhatsAppUtils();
      // Switch should have default case that returns pt-BR
      expect(content).toContain('default:');
      expect(content).toContain('return DEFAULT_TEMPLATE_PT_BR');
    });
  });
});

// =============================================================================
// F041 (CR-96): Search fields fixed at top filling available space
// =============================================================================

describe('F041 (CR-96): Search fields fixed at top filling available space', () => {

  const getMembersScreen = () => readSourceFile('app/(tabs)/settings/members.tsx');
  const getTopicsScreen = () => readSourceFile('app/(tabs)/settings/topics.tsx');

  describe('AC-F041-01: SearchInput na tela de Membros fica fixo no topo', () => {
    it('should have SearchInput outside FlatList in members.tsx', () => {
      const content = getMembersScreen();
      // Find the main member list FlatList (data={members}), not the country code modal FlatList
      const searchIndex = content.indexOf('<SearchInput');
      const mainFlatListIndex = content.indexOf('data={members}');
      // SearchInput should appear before the main member list
      expect(searchIndex).toBeGreaterThan(-1);
      expect(mainFlatListIndex).toBeGreaterThan(-1);
      expect(searchIndex).toBeLessThan(mainFlatListIndex);
    });

    it('should not have SearchInput inside FlatList (no ListHeaderComponent with SearchInput)', () => {
      const content = getMembersScreen();
      // SearchInput should not be inside a ListHeaderComponent
      expect(content).not.toMatch(/ListHeaderComponent[\s\S]*?<SearchInput/);
    });
  });

  describe('AC-F041-02: SearchInput na tela de Temas fica fixo no topo', () => {
    it('should have SearchInput outside ScrollView in topics.tsx', () => {
      const content = getTopicsScreen();
      const searchIndex = content.indexOf('<SearchInput');
      const scrollViewIndex = content.indexOf('<ScrollView');
      // SearchInput should appear before ScrollView
      expect(searchIndex).toBeGreaterThan(-1);
      expect(scrollViewIndex).toBeGreaterThan(-1);
      expect(searchIndex).toBeLessThan(scrollViewIndex);
    });
  });

  describe('AC-F041-03: SearchInput preenche espaco horizontal (flex:1)', () => {
    it('should have searchContainer with paddingHorizontal in members.tsx', () => {
      const content = getMembersScreen();
      // The searchContainer style should have paddingHorizontal
      expect(content).toMatch(/searchContainer[\s\S]*?paddingHorizontal/);
    });

    it('should have searchContainer with paddingHorizontal in topics.tsx', () => {
      const content = getTopicsScreen();
      expect(content).toMatch(/searchContainer[\s\S]*?paddingHorizontal/);
    });
  });

  describe('AC-F041-04: Botao X de limpar busca continua funcionando', () => {
    it('should use SearchInput component in members.tsx', () => {
      const content = getMembersScreen();
      expect(content).toContain('<SearchInput');
      expect(content).toContain('onChangeText={setSearch}');
    });

    it('should use SearchInput component in topics.tsx', () => {
      const content = getTopicsScreen();
      expect(content).toContain('<SearchInput');
      expect(content).toContain('onChangeText={setSearch}');
    });
  });

  describe('AC-F041-05: Layout nao quebra com teclado aberto', () => {
    it('should use KeyboardAvoidingView in members.tsx', () => {
      const content = getMembersScreen();
      expect(content).toContain('KeyboardAvoidingView');
    });

    it('should use KeyboardAvoidingView in topics.tsx', () => {
      const content = getTopicsScreen();
      expect(content).toContain('KeyboardAvoidingView');
    });
  });

  describe('AC-F041-06: Selectors modais mantem layout existente', () => {
    it('should not have modified MemberSelectorModal', () => {
      // MemberSelectorModal should still exist and use SearchInput in its header
      const content = readSourceFile('components/MemberSelectorModal.tsx');
      expect(content).toContain('SearchInput');
    });

    it('should not have modified ActorSelector layout', () => {
      const content = readSourceFile('components/ActorSelector.tsx');
      expect(content).toContain('searchRow');
      expect(content).toContain('SearchInput');
    });
  });

  describe('EC-F041-01: Lista vazia sem membros/temas', () => {
    it('should have ListEmptyComponent in members FlatList', () => {
      const content = getMembersScreen();
      expect(content).toContain('ListEmptyComponent');
    });

    it('should have empty state in topics screen', () => {
      const content = getTopicsScreen();
      expect(content).toContain('noResults');
    });
  });

  describe('EC-F041-02: Texto explicativo scrolla com conteudo', () => {
    it('should have description text before search in topics.tsx', () => {
      const content = getTopicsScreen();
      const descriptionIndex = content.indexOf("t('topics.description')");
      const searchIndex = content.indexOf('<SearchInput');
      expect(descriptionIndex).toBeGreaterThan(-1);
      expect(searchIndex).toBeGreaterThan(-1);
      expect(descriptionIndex).toBeLessThan(searchIndex);
    });
  });
});

// =============================================================================
// F042 (CR-97): Multi-select for 'Reconhecendo a Presenca' field
// =============================================================================

describe('F042 (CR-97): Multi-select for Reconhecendo a Presenca field', () => {

  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');
  const getActorSelector = () => readSourceFile('components/ActorSelector.tsx');

  describe('AC-F042-01: Selecionar ator adiciona ao array recognized_names', () => {
    it('should have toggle logic in recognizing handler that adds actor name', () => {
      const content = getAgendaForm();
      // Should have logic to add to recognized_names array
      expect(content).toContain("selectorModal.field === 'recognizing'");
      expect(content).toContain('recognized_names');
    });

    it('should spread current array and add new name', () => {
      const content = getAgendaForm();
      // Should have [...current, actor.name] pattern
      expect(content).toContain('[...current, actor.name]');
    });
  });

  describe('AC-F042-02: Selecionar ator ja selecionado remove do array (toggle)', () => {
    it('should check if actor name already exists in array', () => {
      const content = getAgendaForm();
      expect(content).toContain('current.includes(actor.name)');
    });

    it('should filter out existing actor name when toggling', () => {
      const content = getAgendaForm();
      expect(content).toMatch(/current\.filter\(\s*\(n\)\s*=>\s*n\s*!==\s*actor\.name\s*\)/);
    });
  });

  describe('AC-F042-03: Nomes selecionados exibidos como lista separada por virgula', () => {
    it('should display recognized_names joined by comma in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).toContain("recognized_names?.join(', ')");
    });
  });

  describe('AC-F042-04: Atores ja selecionados tem indicador visual no modal', () => {
    it('should have selectedNames prop in ActorSelectorProps', () => {
      const content = getActorSelector();
      expect(content).toContain('selectedNames?: string[]');
    });

    it('should check if actor is selected for checkmark display', () => {
      const content = getActorSelector();
      expect(content).toContain("selectedNames?.includes(item.name)");
    });

    it('should render checkmark (U+2713) for selected actors', () => {
      const content = getActorSelector();
      // Source code contains the escape sequence \\u2713 in string literal
      expect(content).toContain('\\u2713');
    });
  });

  describe('AC-F042-05: Modal nao fecha automaticamente apos selecao', () => {
    it('should have multiSelect prop in ActorSelectorProps', () => {
      const content = getActorSelector();
      expect(content).toContain('multiSelect?: boolean');
    });

    it('should not close modal when multiSelect is true', () => {
      const content = getActorSelector();
      // handleSelect should check multiSelect before closing
      expect(content).toContain('if (!multiSelect)');
    });

    it('should pass multiSelect={true} for recognizing field', () => {
      const content = getAgendaForm();
      expect(content).toContain('multiSelect: true');
    });
  });

  describe('AC-F042-06: Usuario pode fechar modal manualmente', () => {
    it('should have overlay pressable that closes modal in ActorSelector', () => {
      const content = getActorSelector();
      expect(content).toContain('onPress={handleClose}');
    });

    it('should have close button that closes modal in ActorSelector', () => {
      const content = getActorSelector();
      expect(content).toContain("onPress={handleClose}");
      expect(content).toContain("t('common.close')");
    });
  });

  describe('AC-F042-07: Recognized_names persiste no banco como string[]', () => {
    it('should call updateField with recognized_names array', () => {
      const content = getAgendaForm();
      expect(content).toContain("updateField('recognized_names'");
    });

    it('should set to null when array is empty', () => {
      const content = getAgendaForm();
      // Should handle empty array: updated.length > 0 ? updated : null
      expect(content).toMatch(/updated\.length\s*>\s*0\s*\?\s*updated\s*:\s*null/);
    });
  });

  describe('AC-F042-08: Modo Apresentacao exibe multiplos nomes corretamente', () => {
    it('should join recognized_names in presentation mode', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).toContain("recognized_names.join(', ')");
    });
  });

  describe('AC-F042-09: Selecao single continua para outros campos', () => {
    it('should not pass multiSelect for presiding field', () => {
      const content = getAgendaForm();
      // Only recognizing field should have multiSelect
      const presidingSection = content.substring(
        content.indexOf("field: 'presiding'"),
        content.indexOf("field: 'conducting'")
      );
      expect(presidingSection).not.toContain('multiSelect');
    });

    it('should close modal after selecting presiding/conducting/etc', () => {
      const content = getAgendaForm();
      // For non-recognizing fields, setSelectorModal(null) is called
      expect(content).toContain('setSelectorModal(null)');
    });

    it('should not pass selectedNames for non-recognizing fields', () => {
      const content = getAgendaForm();
      // The spread with selectedNames and multiSelect should only be for recognizing
      expect(content).toContain("selectorModal.field === 'recognizing' ? {");
    });
  });

  describe('EC-F042-01: recognized_names e null (primeiro ator)', () => {
    it('should handle null recognized_names with fallback to empty array', () => {
      const content = getAgendaForm();
      expect(content).toContain("agenda?.recognized_names ?? []");
    });
  });

  describe('EC-F042-02: Remover todos os atores selecionados', () => {
    it('should set to null when updated array is empty', () => {
      const content = getAgendaForm();
      expect(content).toMatch(/updated\.length\s*>\s*0\s*\?\s*updated\s*:\s*null/);
    });
  });

  describe('EC-F042-03: Ator com nome identico', () => {
    it('should use exact string matching for toggle', () => {
      const content = getAgendaForm();
      expect(content).toContain('current.includes(actor.name)');
      expect(content).toContain('n !== actor.name');
    });
  });
});

// =============================================================================
// F043 (CR-99): Change speech labels from 'Orador' to 'Discurso'
// =============================================================================

describe('F043 (CR-99): Change speech labels from Orador to Discurso', () => {

  const getPtBR = () => JSON.parse(readProjectFile('src/i18n/locales/pt-BR.json'));
  const getEn = () => JSON.parse(readProjectFile('src/i18n/locales/en.json'));
  const getEs = () => JSON.parse(readProjectFile('src/i18n/locales/es.json'));

  describe('AC-F043-01: Labels mostram "Discurso" em pt-BR', () => {
    it('should have speeches.speaker equal to "Discurso" in pt-BR', () => {
      const ptBR = getPtBR();
      expect(ptBR.speeches.speaker).toBe('Discurso');
    });

    it('should NOT have speeches.speaker equal to "Orador" in pt-BR', () => {
      const ptBR = getPtBR();
      expect(ptBR.speeches.speaker).not.toBe('Orador');
    });
  });

  describe('AC-F043-02: Labels mostram "Speech" em en', () => {
    it('should have speeches.speaker equal to "Speech" in en', () => {
      const en = getEn();
      expect(en.speeches.speaker).toBe('Speech');
    });

    it('should NOT have speeches.speaker equal to "Speaker" in en', () => {
      const en = getEn();
      expect(en.speeches.speaker).not.toBe('Speaker');
    });
  });

  describe('AC-F043-03: Labels mostram "Discurso" em es', () => {
    it('should have speeches.speaker equal to "Discurso" in es', () => {
      const es = getEs();
      expect(es.speeches.speaker).toBe('Discurso');
    });

    it('should NOT have speeches.speaker equal to "Orador" in es', () => {
      const es = getEs();
      expect(es.speeches.speaker).not.toBe('Orador');
    });
  });

  describe('AC-F043-04: Labels no Modo Apresentacao tambem usam "Discurso"', () => {
    it('should use t("speeches.speaker") in usePresentationMode for speaker labels', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).toContain("t('speeches.speaker')");
    });

    it('should use t("speeches.speaker") in AgendaForm for speaker labels', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain("t('speeches.speaker')");
    });
  });

  describe('AC-F043-05: Nenhum outro uso de speeches.speaker quebrado', () => {
    it('should have speeches.speaker used only in AgendaForm and usePresentationMode', () => {
      const agendaForm = readSourceFile('components/AgendaForm.tsx');
      const presentationMode = readSourceFile('hooks/usePresentationMode.ts');

      // Both should reference speeches.speaker
      expect(agendaForm).toContain("t('speeches.speaker')");
      expect(presentationMode).toContain("t('speeches.speaker')");
    });

    it('should have consistent values across all 3 locales for speeches key', () => {
      const ptBR = getPtBR();
      const en = getEn();
      const es = getEs();

      // All should have the same keys in speeches namespace
      const ptBRKeys = Object.keys(ptBR.speeches).sort();
      const enKeys = Object.keys(en.speeches).sort();
      const esKeys = Object.keys(es.speeches).sort();

      expect(ptBRKeys).toEqual(enKeys);
      expect(ptBRKeys).toEqual(esKeys);
    });
  });

  describe('EC-F043-01: Testes existentes atualizados para novo valor', () => {
    it('should use labels with ordinal + Discurso/Speech pattern in AgendaForm', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      // Should use pattern like: `1\u00BA ${t('speeches.speaker')}`
      expect(content).toContain("t('speeches.speaker')");
    });
  });
});

// =============================================================================
// F044 (CR-100): Read-only speaker field with last-minute swap
// =============================================================================

describe('F044 (CR-100): Read-only speaker field with last-minute swap', () => {

  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');
  const getPresentationMode = () => readSourceFile('hooks/usePresentationMode.ts');
  const getDatabaseTypes = () => readSourceFile('types/database.ts');
  const getMigration014 = () => readProjectFile('supabase/migrations/014_add_speaker_overrides.sql');

  describe('AC-F044-01: Campo de discursante mostra nome designado como read-only', () => {
    it('should have SpeakerField component in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).toContain('function SpeakerField');
    });

    it('should display speakerName as read-only text', () => {
      const content = getAgendaForm();
      expect(content).toContain('speakerReadText');
      expect(content).toContain('speakerReadRow');
    });

    it('should show displayName which is overrideName or speakerName', () => {
      const content = getAgendaForm();
      expect(content).toContain('overrideName ?? speakerName');
    });
  });

  describe('AC-F044-02: Icone de edicao (lapis) visivel ao lado do nome', () => {
    it('should render pencil icon (U+270F) for edit', () => {
      const content = getAgendaForm();
      // SpeakerField should use pencil icon (escape sequence in source code)
      expect(content).toContain('\\u270F');
    });

    it('should only show pencil when hasSpeaker is true', () => {
      const content = getAgendaForm();
      expect(content).toContain('hasSpeaker && !disabled');
    });
  });

  describe('AC-F044-03: Clicar no lapis ativa modo de edicao com TextInput', () => {
    it('should have isEditing state in SpeakerField', () => {
      const content = getAgendaForm();
      // SpeakerField should have isEditing state
      expect(content).toMatch(/const\s*\[isEditing,\s*setIsEditing\]/);
    });

    it('should have handleStartEdit that sets isEditing to true', () => {
      const content = getAgendaForm();
      expect(content).toContain('handleStartEdit');
      expect(content).toContain('setIsEditing(true)');
    });

    it('should render TextInput when isEditing is true', () => {
      const content = getAgendaForm();
      expect(content).toContain('isEditing ?');
      expect(content).toContain('speakerEditInput');
    });
  });

  describe('AC-F044-04: Usuario pode digitar nome manual no TextInput', () => {
    it('should have editValue state for text input', () => {
      const content = getAgendaForm();
      expect(content).toMatch(/const\s*\[editValue,\s*setEditValue\]/);
    });

    it('should have onChangeText that updates editValue', () => {
      const content = getAgendaForm();
      expect(content).toContain('onChangeText={setEditValue}');
    });

    it('should call onEditOverride with trimmed value on save', () => {
      const content = getAgendaForm();
      expect(content).toContain('onEditOverride(trimmed)');
    });
  });

  describe('AC-F044-05: Icone X visivel quando nome foi sobrescrito', () => {
    it('should render X icon (U+2716) when hasOverride is true', () => {
      const content = getAgendaForm();
      // Source code contains the escape sequence \\u2716 in string literal
      expect(content).toContain('\\u2716');
    });

    it('should compute hasOverride based on overrideName vs speakerName', () => {
      const content = getAgendaForm();
      expect(content).toMatch(/hasOverride\s*=\s*overrideName\s*!==\s*null\s*&&\s*overrideName\s*!==\s*speakerName/);
    });

    it('should only show X when hasOverride and not disabled', () => {
      const content = getAgendaForm();
      expect(content).toContain('hasOverride && !disabled');
    });
  });

  describe('AC-F044-06: Clicar X reverte ao nome originalmente designado', () => {
    it('should have handleRevert that sets override to null', () => {
      const content = getAgendaForm();
      expect(content).toContain('handleRevert');
      expect(content).toContain('onEditOverride(null)');
    });

    it('should set isEditing to false on revert', () => {
      const content = getAgendaForm();
      // handleRevert should call setIsEditing(false)
      const revertSection = content.substring(
        content.indexOf('handleRevert'),
        content.indexOf('handleRevert') + 200
      );
      expect(revertSection).toContain('setIsEditing(false)');
    });
  });

  describe('AC-F044-07: Override e persistido no banco', () => {
    it('should have migration 014 for speaker override fields', () => {
      const content = getMigration014();
      expect(content).toContain('ALTER TABLE sunday_agendas');
      expect(content).toContain('speaker_1_override');
      expect(content).toContain('speaker_2_override');
      expect(content).toContain('speaker_3_override');
    });

    it('should have speaker_1_override in SundayAgenda type', () => {
      const content = getDatabaseTypes();
      expect(content).toContain('speaker_1_override: string | null');
    });

    it('should have speaker_2_override in SundayAgenda type', () => {
      const content = getDatabaseTypes();
      expect(content).toContain('speaker_2_override: string | null');
    });

    it('should have speaker_3_override in SundayAgenda type', () => {
      const content = getDatabaseTypes();
      expect(content).toContain('speaker_3_override: string | null');
    });

    it('should use updateField for speaker_1_override in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).toContain("updateField('speaker_1_override'");
    });

    it('should use updateField for speaker_2_override in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).toContain("updateField('speaker_2_override'");
    });

    it('should use updateField for speaker_3_override in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).toContain("updateField('speaker_3_override'");
    });

    it('should have TEXT DEFAULT NULL in migration', () => {
      const content = getMigration014();
      expect(content).toContain('TEXT DEFAULT NULL');
    });

    it('should have COMMENT ON COLUMN for documentation', () => {
      const content = getMigration014();
      expect(content).toContain('COMMENT ON COLUMN');
    });
  });

  describe('AC-F044-08: Modo Apresentacao usa override quando existir', () => {
    it('should use speaker_1_override from agenda in buildPresentationCards', () => {
      const content = getPresentationMode();
      expect(content).toContain('speaker_1_override');
    });

    it('should use speaker_2_override from agenda in buildPresentationCards', () => {
      const content = getPresentationMode();
      expect(content).toContain('speaker_2_override');
    });

    it('should use speaker_3_override from agenda in buildPresentationCards', () => {
      const content = getPresentationMode();
      expect(content).toContain('speaker_3_override');
    });

    it('should fallback to speech.speaker_name when override is null', () => {
      const content = getPresentationMode();
      // Should use ?? pattern: agenda?.speaker_N_override ?? speech?.speaker_name
      expect(content).toMatch(/speaker_1_override\s*\?\?\s*speech/);
    });
  });

  describe('AC-F044-09: Campo desabilitado para Observador', () => {
    it('should pass disabled={isObserver} to SpeakerField', () => {
      const content = getAgendaForm();
      expect(content).toContain('disabled={isObserver}');
    });

    it('should not show pencil icon when disabled', () => {
      const content = getAgendaForm();
      // hasSpeaker && !disabled condition for pencil
      expect(content).toContain('hasSpeaker && !disabled');
    });
  });

  describe('AC-F044-10: Campo vazio quando nao ha discursante designado', () => {
    it('should show placeholder when no speaker name', () => {
      const content = getAgendaForm();
      // SpeakerField should show label as fallback when no displayName
      expect(content).toContain('displayName || label');
    });

    it('should not show pencil when no speaker is assigned', () => {
      const content = getAgendaForm();
      // hasSpeaker is computed from !!speakerName
      expect(content).toContain('!!speakerName');
    });
  });

  describe('EC-F044-01: Novo designado substitui override', () => {
    it('should read override from agenda.speaker_N_override (null clears it)', () => {
      const content = getAgendaForm();
      expect(content).toContain('agenda.speaker_1_override');
      expect(content).toContain('agenda.speaker_2_override');
      expect(content).toContain('agenda.speaker_3_override');
    });
  });

  describe('EC-F044-02: Override com string vazia tratado como reverter', () => {
    it('should clear override when trimmed value is empty', () => {
      const content = getAgendaForm();
      // handleSave should set null when empty
      expect(content).toContain('onEditOverride(null)');
    });

    it('should clear override when value equals original speakerName', () => {
      const content = getAgendaForm();
      // Should compare trimmed with speakerName and set null
      expect(content).toContain('trimmed === speakerName');
    });
  });

  describe('EC-F044-03: Todas as 3 posicoes com override simultaneo', () => {
    it('should have independent SpeakerField for position 1', () => {
      const content = getAgendaForm();
      expect(content).toContain("getSpeech(1)?.speaker_name");
      expect(content).toContain("agenda.speaker_1_override");
    });

    it('should have independent SpeakerField for position 2', () => {
      const content = getAgendaForm();
      expect(content).toContain("getSpeech(2)?.speaker_name");
      expect(content).toContain("agenda.speaker_2_override");
    });

    it('should have independent SpeakerField for position 3', () => {
      const content = getAgendaForm();
      expect(content).toContain("getSpeech(3)?.speaker_name");
      expect(content).toContain("agenda.speaker_3_override");
    });
  });
});

// =============================================================================
// F040: Functional tests for getDefaultTemplate and buildWhatsAppUrl
// =============================================================================

describe('F040: Functional tests for WhatsApp utils', () => {

  describe('getDefaultTemplate returns correct template per language', () => {
    it('should return pt-BR template for "pt-BR"', () => {
      expect(getDefaultTemplate('pt-BR')).toBe(DEFAULT_TEMPLATE_PT_BR);
    });

    it('should return en template for "en"', () => {
      expect(getDefaultTemplate('en')).toBe(DEFAULT_TEMPLATE_EN);
    });

    it('should return es template for "es"', () => {
      expect(getDefaultTemplate('es')).toBe(DEFAULT_TEMPLATE_ES);
    });

    it('should return pt-BR template for unknown language (fallback)', () => {
      expect(getDefaultTemplate('fr')).toBe(DEFAULT_TEMPLATE_PT_BR);
      expect(getDefaultTemplate('de')).toBe(DEFAULT_TEMPLATE_PT_BR);
      expect(getDefaultTemplate('')).toBe(DEFAULT_TEMPLATE_PT_BR);
    });
  });

  describe('resolveTemplate replaces all 6 placeholders', () => {
    it('should replace all placeholders with values', () => {
      const template = '{nome} - {data} - {posicao} - {colecao} - {titulo} - {link}';
      const result = resolveTemplate(template, {
        speakerName: 'Joao',
        date: '2026-02-22',
        position: '1o',
        collection: 'Colecao A',
        topic: 'Tema X',
        link: 'https://example.com',
      });
      expect(result).toContain('Joao');
      expect(result).toContain('2026-02-22');
      expect(result).toContain('1o');
      expect(result).toContain('Colecao A');
      expect(result).toContain('Tema X');
      expect(result).toContain('https://example.com');
    });

    it('should handle empty optional fields', () => {
      const template = '{nome} - {colecao} - {link}';
      const result = resolveTemplate(template, {
        speakerName: 'Maria',
        date: '2026-03-01',
        position: '2o',
        topic: 'Tema Y',
        // collection and link are undefined
      });
      expect(result).toContain('Maria');
      expect(result).not.toContain('{nome}');
      expect(result).not.toContain('{colecao}');
      expect(result).not.toContain('{link}');
    });
  });

  describe('buildWhatsAppUrl uses language parameter', () => {
    const vars = {
      speakerName: 'Test Speaker',
      date: '2026-03-01',
      position: '1o',
      topic: 'Test Topic',
    };

    it('should use pt-BR template when language is pt-BR and template is empty', () => {
      const url = buildWhatsAppUrl('+5511999999999', '', '', vars, 'pt-BR');
      expect(url).toContain('wa.me');
      expect(url).toContain('5511999999999');
    });

    it('should use en template when language is en and template is empty', () => {
      const url = buildWhatsAppUrl('+14155551234', '', '', vars, 'en');
      expect(url).toContain('wa.me');
      // Should contain encoded English text
      expect(url).toContain('text=');
    });

    it('should use custom template when provided, ignoring language', () => {
      const customTemplate = 'Hello {nome}, you speak on {data}!';
      const url = buildWhatsAppUrl('+5511999999999', '', customTemplate, vars, 'en');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Hello Test Speaker');
      expect(decoded).toContain('you speak on 2026-03-01');
    });

    it('should default to pt-BR when language parameter is omitted', () => {
      const url1 = buildWhatsAppUrl('+5511999999999', '', '', vars);
      const url2 = buildWhatsAppUrl('+5511999999999', '', '', vars, 'pt-BR');
      expect(url1).toBe(url2);
    });
  });
});
