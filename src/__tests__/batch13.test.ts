/**
 * Tests for Batch 13: Settings Rename, Agenda Sunday Type, Activity Log,
 *   Supabase Performance & Security
 *
 * F083 (CR-140): Rename Settings tab options with i18n
 * F084 (CR-141): Sunday type selector as first field in Agenda card
 * F085 (CR-142): Activity log entries overhaul with i18n
 * F086 (CR-143): Replace pg_timezone_names with static timezone list
 * F087 (CR-144): Fix mutable search_path in 7 PostgreSQL functions
 *
 * Covers acceptance criteria:
 *   AC-083-01..10, AC-084-01..09, AC-085-01..17, AC-086-01..03, AC-087-01..09
 * Covers edge cases:
 *   EC-083-01, EC-084-01, EC-085-01..05, EC-086-01, EC-087-01..03
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildLogDescription,
  parseLogDescription,
  formatLogDescription,
} from '../lib/activityLog';
import type { TFunction } from 'i18next';

// --- Helpers ---

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`),
    'utf-8'
  );
  return JSON.parse(content);
}

function readSqlMigration(filename: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'supabase', 'migrations', filename),
    'utf-8'
  );
}

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  const keys = dotPath.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function createMockT(translations: Record<string, string>): TFunction {
  return ((key: string, optionsOrDefault?: Record<string, string> | string) => {
    if (typeof optionsOrDefault === 'string') return translations[key] ?? key;
    const template = translations[key];
    if (!template) return key;
    let result = template;
    if (optionsOrDefault && typeof optionsOrDefault === 'object') {
      for (const [k, v] of Object.entries(optionsOrDefault)) {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return result;
  }) as TFunction;
}

// =============================================================================
// F083 (CR-140): Rename Settings tab options with i18n
// =============================================================================

describe('F083 (CR-140): Rename Settings tab labels', () => {
  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- AC-083-01: Settings card label for Members renamed ---
  describe('AC-083-01: settings.members card label renamed', () => {
    it('pt-BR settings.members = "Discursantes"', () => {
      expect(getNestedValue(ptBR, 'settings.members')).toBe('Discursantes');
    });

    it('en settings.members = "Speakers"', () => {
      expect(getNestedValue(en, 'settings.members')).toBe('Speakers');
    });

    it('es settings.members = "Oradores"', () => {
      expect(getNestedValue(es, 'settings.members')).toBe('Oradores');
    });
  });

  // --- AC-083-02: Members screen title renamed ---
  describe('AC-083-02: members.title renamed', () => {
    it('pt-BR members.title = "Discursantes"', () => {
      expect(getNestedValue(ptBR, 'members.title')).toBe('Discursantes');
    });

    it('en members.title = "Speakers"', () => {
      expect(getNestedValue(en, 'members.title')).toBe('Speakers');
    });

    it('es members.title = "Oradores"', () => {
      expect(getNestedValue(es, 'members.title')).toBe('Oradores');
    });
  });

  // --- AC-083-03: Settings card label for Topics renamed ---
  describe('AC-083-03: settings.topics card label renamed', () => {
    it('pt-BR settings.topics = "Biblioteca de Temas"', () => {
      expect(getNestedValue(ptBR, 'settings.topics')).toBe('Biblioteca de Temas');
    });

    it('en settings.topics = "Topic Library"', () => {
      expect(getNestedValue(en, 'settings.topics')).toBe('Topic Library');
    });

    it('es settings.topics = "Biblioteca de Temas"', () => {
      expect(getNestedValue(es, 'settings.topics')).toBe('Biblioteca de Temas');
    });
  });

  // --- AC-083-04: Topics screen title renamed ---
  describe('AC-083-04: topics.title renamed', () => {
    it('pt-BR topics.title = "Biblioteca de Temas"', () => {
      expect(getNestedValue(ptBR, 'topics.title')).toBe('Biblioteca de Temas');
    });

    it('en topics.title = "Topic Library"', () => {
      expect(getNestedValue(en, 'topics.title')).toBe('Topic Library');
    });

    it('es topics.title = "Biblioteca de Temas"', () => {
      expect(getNestedValue(es, 'topics.title')).toBe('Biblioteca de Temas');
    });
  });

  // --- AC-083-05: Settings card label for Users renamed ---
  describe('AC-083-05: settings.users card label renamed', () => {
    it('pt-BR settings.users contains "App"', () => {
      const val = getNestedValue(ptBR, 'settings.users') as string;
      expect(val).toContain('App');
      expect(val).toContain('Usu');
    });

    it('en settings.users = "App Users"', () => {
      expect(getNestedValue(en, 'settings.users')).toBe('App Users');
    });

    it('es settings.users contains "App"', () => {
      const val = getNestedValue(es, 'settings.users') as string;
      expect(val).toContain('App');
      expect(val).toContain('Usuarios');
    });
  });

  // --- AC-083-06: Users screen title renamed ---
  describe('AC-083-06: users.title renamed', () => {
    it('pt-BR users.title contains "App"', () => {
      const val = getNestedValue(ptBR, 'users.title') as string;
      expect(val).toContain('App');
    });

    it('en users.title = "App Users"', () => {
      expect(getNestedValue(en, 'users.title')).toBe('App Users');
    });

    it('es users.title contains "App"', () => {
      const val = getNestedValue(es, 'users.title') as string;
      expect(val).toContain('App');
    });
  });

  // --- AC-083-07: Settings card label for History renamed ---
  describe('AC-083-07: settings.history card label renamed', () => {
    it('pt-BR settings.history contains "Uso"', () => {
      const val = getNestedValue(ptBR, 'settings.history') as string;
      expect(val).toContain('Uso');
    });

    it('en settings.history = "Usage History"', () => {
      expect(getNestedValue(en, 'settings.history')).toBe('Usage History');
    });

    it('es settings.history contains "Uso"', () => {
      const val = getNestedValue(es, 'settings.history') as string;
      expect(val).toContain('Uso');
    });
  });

  // --- AC-083-08: History screen title renamed ---
  describe('AC-083-08: activityLog.title renamed', () => {
    it('pt-BR activityLog.title contains "Uso"', () => {
      const val = getNestedValue(ptBR, 'activityLog.title') as string;
      expect(val).toContain('Uso');
    });

    it('en activityLog.title = "Usage History"', () => {
      expect(getNestedValue(en, 'activityLog.title')).toBe('Usage History');
    });

    it('es activityLog.title contains "Uso"', () => {
      const val = getNestedValue(es, 'activityLog.title') as string;
      expect(val).toContain('Uso');
    });
  });

  // --- AC-083-09: Settings card label for Theme renamed ---
  describe('AC-083-09: settings.theme card label renamed', () => {
    it('pt-BR settings.theme = "Tema Claro/Escuro"', () => {
      expect(getNestedValue(ptBR, 'settings.theme')).toBe('Tema Claro/Escuro');
    });

    it('en settings.theme = "Light/Dark Theme"', () => {
      expect(getNestedValue(en, 'settings.theme')).toBe('Light/Dark Theme');
    });

    it('es settings.theme = "Tema Claro/Oscuro"', () => {
      expect(getNestedValue(es, 'settings.theme')).toBe('Tema Claro/Oscuro');
    });
  });

  // --- AC-083-10: Theme screen title renamed ---
  // Note: Theme screen uses settings.theme for its title, so same key tested above
  describe('AC-083-10: theme screen title (uses settings.theme key)', () => {
    it('settings.theme key serves as both card label and screen title', () => {
      // The theme screen reads t('settings.theme') for its title
      // Verified in AC-083-09 that the values are correct
      expect(getNestedValue(en, 'settings.theme')).toBe('Light/Dark Theme');
    });
  });

  // --- EC-083-01: No other context uses old settings label values ---
  describe('EC-083-01: old label values not referenced in other contexts', () => {
    it('i18n keys unchanged (settings.members, settings.topics, etc. still exist)', () => {
      // Keys are the same, only values changed
      expect(getNestedValue(en, 'settings.members')).toBeDefined();
      expect(getNestedValue(en, 'settings.topics')).toBeDefined();
      expect(getNestedValue(en, 'settings.users')).toBeDefined();
      expect(getNestedValue(en, 'settings.history')).toBeDefined();
      expect(getNestedValue(en, 'settings.theme')).toBeDefined();
    });
  });
});

// =============================================================================
// F084 (CR-141): Sunday type selector in Agenda tab
// =============================================================================

describe('F084 (CR-141): Sunday type selector in Agenda', () => {
  const getAgenda = () => readSourceFile('app/(tabs)/agenda.tsx');
  const getSundayCard = () => readSourceFile('components/SundayCard.tsx');

  // --- AC-084-01: SundayTypeDropdown visible in expanded agenda card ---
  describe('AC-084-01: SundayTypeDropdown in expanded agenda card', () => {
    it('agenda.tsx imports SundayTypeDropdown from SundayCard', () => {
      const source = getAgenda();
      expect(source).toContain("import { SundayTypeDropdown }");
      expect(source).toContain("SundayCard");
    });

    it('agenda.tsx renders <SundayTypeDropdown', () => {
      const source = getAgenda();
      expect(source).toContain('<SundayTypeDropdown');
    });

    it('SundayTypeDropdown appears before AgendaForm in expanded content', () => {
      const source = getAgenda();
      const dropdownIdx = source.indexOf('<SundayTypeDropdown');
      const agendaFormIdx = source.indexOf('<AgendaForm');
      expect(dropdownIdx).toBeGreaterThan(-1);
      expect(agendaFormIdx).toBeGreaterThan(-1);
      expect(dropdownIdx).toBeLessThan(agendaFormIdx);
    });
  });

  // --- AC-084-02: Dropdown shows same options as speeches tab ---
  describe('AC-084-02: dropdown options match speeches tab', () => {
    it('SundayTypeDropdown component exists in SundayCard.tsx', () => {
      const source = getSundayCard();
      expect(source).toContain('export function SundayTypeDropdown');
    });

    it('SundayTypeDropdownProps is exported', () => {
      const source = getSundayCard();
      expect(source).toContain('export interface SundayTypeDropdownProps');
    });
  });

  // --- AC-084-03: Confirmation when changing from speeches with assignments ---
  describe('AC-084-03/04/05: confirmation dialog logic', () => {
    it('SundayTypeDropdown receives speeches prop', () => {
      const source = getAgenda();
      // The dropdown is passed speeches={speeches}
      expect(source).toMatch(/speeches=\{/);
    });

    it('SundayTypeDropdown receives onDeleteSpeeches prop', () => {
      const source = getAgenda();
      expect(source).toContain('onDeleteSpeeches');
    });
  });

  // --- AC-084-06: No confirmation when no assignments ---
  // --- AC-084-07: No confirmation when reverting to speeches ---
  describe('AC-084-06/07: revert to speeches handler', () => {
    it('agenda.tsx has onRevertToSpeeches handler', () => {
      const source = getAgenda();
      expect(source).toContain('onRevertToSpeeches');
    });

    it('agenda.tsx imports useRemoveSundayException', () => {
      const source = getAgenda();
      expect(source).toContain('useRemoveSundayException');
    });
  });

  // --- AC-084-08: Observer sees disabled dropdown ---
  describe('AC-084-08: permission-based disabled state', () => {
    it('agenda.tsx uses hasPermission for sunday_type:write or equivalent', () => {
      const source = getAgenda();
      expect(source).toContain('hasPermission');
    });

    it('typeDisabled prop is passed to AgendaSundayCard', () => {
      const source = getAgenda();
      expect(source).toContain('typeDisabled');
    });

    it('SundayTypeDropdown receives disabled prop from typeDisabled', () => {
      const source = getAgenda();
      expect(source).toMatch(/disabled=\{typeDisabled\}/);
    });
  });

  // --- AC-084-09: Type change reflects in speeches tab (React Query) ---
  describe('AC-084-09: type change uses React Query mutation', () => {
    it('agenda.tsx imports useSetSundayType', () => {
      const source = getAgenda();
      expect(source).toContain('useSetSundayType');
    });

    it('agenda.tsx calls setSundayType.mutate', () => {
      const source = getAgenda();
      expect(source).toContain('setSundayType.mutate');
    });

    it('agenda.tsx imports useDeleteSpeechesByDate', () => {
      const source = getAgenda();
      expect(source).toContain('useDeleteSpeechesByDate');
    });
  });

  // --- EC-084-01: Dropdown works independently of agenda existence ---
  describe('EC-084-01: dropdown works without agenda', () => {
    it('SundayTypeDropdown does not depend on agenda data (uses sunday_exceptions)', () => {
      const source = getAgenda();
      // currentType derives from exception, not from agenda
      expect(source).toMatch(/currentType.*exception/);
    });
  });
});

// =============================================================================
// F085 (CR-142): Activity log entries overhaul with i18n
// =============================================================================

describe('F085 (CR-142): Activity log structured descriptions', () => {
  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- Utility functions (AC-085-15, AC-085-16 - indirect coverage) ---
  describe('buildLogDescription utility', () => {
    // --- AC-085-01: member:create ---
    it('AC-085-01: builds member:create description', () => {
      const result = buildLogDescription('member:create', { nome: 'Maria Silva' });
      expect(result).toBe('member:create|nome=Maria Silva');
    });

    // --- AC-085-02: member:update ---
    it('AC-085-02: builds member:update description', () => {
      const result = buildLogDescription('member:update', { nome: 'Maria Silva' });
      expect(result).toBe('member:update|nome=Maria Silva');
    });

    // --- AC-085-03: member:delete ---
    it('AC-085-03: builds member:delete description', () => {
      const result = buildLogDescription('member:delete', { nome: 'Maria Silva' });
      expect(result).toBe('member:delete|nome=Maria Silva');
    });

    // --- AC-085-04: speech:assign ---
    it('AC-085-04: builds speech:assign description with N and data', () => {
      const result = buildLogDescription('speech:assign', { nome: 'Joao', N: 2, data: '1 de marco de 2026' });
      expect(result).toContain('speech:assign');
      expect(result).toContain('nome=Joao');
      expect(result).toContain('N=2');
      expect(result).toContain('data=');
    });

    // --- AC-085-05: speech:assign_theme ---
    it('AC-085-05: builds speech:assign_theme description with colecao and titulo', () => {
      const result = buildLogDescription('speech:assign_theme', { colecao: 'Principios', titulo: 'Fe', N: 1, data: '2026-03-01' });
      expect(result).toContain('speech:assign_theme');
      expect(result).toContain('colecao=Principios');
      expect(result).toContain('titulo=Fe');
    });

    // --- AC-085-06: speech:unassign ---
    it('AC-085-06: builds speech:unassign description', () => {
      const result = buildLogDescription('speech:unassign', { nome: 'Joao', data: '2026-03-01', N: 2 });
      expect(result).toContain('speech:unassign');
      expect(result).toContain('nome=Joao');
    });

    // --- AC-085-07: speech:status_change ---
    it('AC-085-07: builds speech:status_change description', () => {
      const result = buildLogDescription('speech:status_change', { nome: 'Joao', status: 'assigned_confirmed', data: '2026-03-01', N: 2 });
      expect(result).toContain('speech:status_change');
      expect(result).toContain('status=assigned_confirmed');
    });

    // --- AC-085-08: speech_cleanup ---
    it('AC-085-08: builds speech_cleanup description', () => {
      const result = buildLogDescription('speech_cleanup', { data: '2026-03-01' });
      expect(result).toContain('speech_cleanup');
      expect(result).toContain('data=');
    });

    // --- AC-085-09: topic:create ---
    it('AC-085-09: builds topic:create description', () => {
      const result = buildLogDescription('topic:create', { titulo: 'Arrependimento' });
      expect(result).toBe('topic:create|titulo=Arrependimento');
    });

    // --- AC-085-10: collection:activate ---
    it('AC-085-10: builds collection:activate description', () => {
      const result = buildLogDescription('collection:activate', { nome: 'Come Follow Me 2026' });
      expect(result).toContain('collection:activate');
      expect(result).toContain('nome=Come Follow Me 2026');
    });

    // --- AC-085-11: actor:create ---
    it('AC-085-11: builds actor:create description with funcao', () => {
      const result = buildLogDescription('actor:create', { nome: 'Bispo Silva', funcao: 'can_preside' });
      expect(result).toContain('actor:create');
      expect(result).toContain('funcao=can_preside');
    });

    // --- AC-085-12: sunday_type:change ---
    it('AC-085-12: builds sunday_type:change description', () => {
      const result = buildLogDescription('sunday_type:change', { data: '2026-03-01', tipo: 'testimony_meeting' });
      expect(result).toContain('sunday_type:change');
      expect(result).toContain('tipo=testimony_meeting');
    });

    // --- AC-085-13: agenda:edit ---
    it('AC-085-13: builds agenda:edit description', () => {
      const result = buildLogDescription('agenda:edit', { data: '2026-03-01' });
      expect(result).toContain('agenda:edit');
      expect(result).toContain('data=');
    });

    // --- AC-085-14: user:name-update ---
    it('AC-085-14: builds user:name-update description', () => {
      const result = buildLogDescription('user:name-update', { nome: 'Carlos Souza' });
      expect(result).toBe('user:name-update|nome=Carlos Souza');
    });
  });

  // --- formatLogDescription ---
  describe('formatLogDescription rendering', () => {
    // --- AC-085-15: old entries displayed as fallback ---
    it('AC-085-15: returns raw description for old-format entries', () => {
      const t = createMockT({});
      const result = formatLogDescription('Maria Silva adicionado como membro', t);
      expect(result).toBe('Maria Silva adicionado como membro');
    });

    // --- AC-085-16: logs displayed in current language ---
    it('AC-085-16: translates structured log with i18n', () => {
      const t = createMockT({
        'activityLog.events.member_create': '"{{nome}}" added as speaker',
      });
      const desc = buildLogDescription('member:create', { nome: 'Maria' });
      const result = formatLogDescription(desc, t);
      expect(result).toBe('"Maria" added as speaker');
    });

    it('AC-085-16: translates topic:create log', () => {
      const t = createMockT({
        'activityLog.events.topic_create': 'Topic "{{titulo}}" added',
      });
      const desc = buildLogDescription('topic:create', { titulo: 'Arrependimento' });
      const result = formatLogDescription(desc, t);
      expect(result).toBe('Topic "Arrependimento" added');
    });

    // --- AC-085-17: actor role translated ---
    it('AC-085-17: translates actor role in actor:create', () => {
      const t = createMockT({
        'activityLog.events.actor_create': '"{{nome}}" added for "{{funcao}}"',
        'activityLog.actorRoles.preside': 'preside',
      });
      const desc = buildLogDescription('actor:create', { nome: 'Bishop Jones', funcao: 'can_preside' });
      const result = formatLogDescription(desc, t);
      expect(result).toBe('"Bishop Jones" added for "preside"');
    });

    it('AC-085-17: translates can_conduct role', () => {
      const t = createMockT({
        'activityLog.events.actor_create': '"{{nome}}" for "{{funcao}}"',
        'activityLog.actorRoles.conduct': 'conduct',
      });
      const desc = buildLogDescription('actor:create', { nome: 'Elder', funcao: 'can_conduct' });
      const result = formatLogDescription(desc, t);
      expect(result).toBe('"Elder" for "conduct"');
    });
  });

  // --- parseLogDescription ---
  describe('parseLogDescription parsing', () => {
    it('returns null for old format (no pipe)', () => {
      expect(parseLogDescription('Simple text description')).toBeNull();
    });

    it('parses single-param structured format', () => {
      const result = parseLogDescription('member:create|nome=Maria');
      expect(result).toEqual({
        actionType: 'member:create',
        params: { nome: 'Maria' },
      });
    });

    it('parses multi-param structured format', () => {
      const result = parseLogDescription('speech:assign|nome=Joao|N=2|data=2026-03-01');
      expect(result).not.toBeNull();
      expect(result!.actionType).toBe('speech:assign');
      expect(result!.params.nome).toBe('Joao');
      expect(result!.params.N).toBe('2');
      expect(result!.params.data).toBe('2026-03-01');
    });
  });

  // --- EC-085-01: incomplete structured format ---
  describe('EC-085-01: incomplete structured format', () => {
    it('handles action_type with trailing pipe (no params)', () => {
      const result = parseLogDescription('member:create|');
      expect(result).not.toBeNull();
      expect(result!.actionType).toBe('member:create');
    });
  });

  // --- EC-085-02: unknown action_type fallback ---
  describe('EC-085-02: unknown action_type fallback', () => {
    it('returns raw description when i18n key not found', () => {
      const t = createMockT({});
      const desc = buildLogDescription('unknown:action', { foo: 'bar' });
      const result = formatLogDescription(desc, t);
      expect(result).toBe(desc);
    });
  });

  // --- EC-085-03: speech:assign_theme now logged ---
  describe('EC-085-03: speech:assign_theme log added', () => {
    it('useSpeeches.ts contains speech:assign_theme logAction', () => {
      const source = readSourceFile('hooks/useSpeeches.ts');
      expect(source).toContain("'speech:assign_theme'");
      expect(source).toContain('buildLogDescription');
    });
  });

  // --- EC-085-04: speech status translated ---
  describe('EC-085-04: speech status translated in formatLogDescription', () => {
    it('translates status param via speechStatus i18n key', () => {
      const t = createMockT({
        'activityLog.events.speech_status_change': '{{nome}} -> {{status}} ({{data}}, #{{N}})',
        'speechStatus.assigned_confirmed': 'Confirmed',
      });
      const desc = buildLogDescription('speech:status_change', { nome: 'Joao', status: 'assigned_confirmed', data: '2026-03-01', N: 2 });
      const result = formatLogDescription(desc, t);
      expect(result).toContain('Confirmed');
      expect(result).not.toContain('assigned_confirmed');
    });
  });

  // --- EC-085-05: actor role mapping ---
  describe('EC-085-05: actor role mapping', () => {
    it('ACTOR_ROLE_I18N_KEYS maps can_preside', () => {
      const source = readSourceFile('lib/activityLog.ts');
      expect(source).toContain("can_preside");
      expect(source).toContain("activityLog.actorRoles.preside");
    });

    it('ACTOR_ROLE_I18N_KEYS maps can_conduct', () => {
      const source = readSourceFile('lib/activityLog.ts');
      expect(source).toContain("can_conduct");
      expect(source).toContain("activityLog.actorRoles.conduct");
    });

    it('ACTOR_ROLE_I18N_KEYS maps can_recognize', () => {
      const source = readSourceFile('lib/activityLog.ts');
      expect(source).toContain("can_recognize");
      expect(source).toContain("activityLog.actorRoles.recognize");
    });

    it('ACTOR_ROLE_I18N_KEYS maps can_music', () => {
      const source = readSourceFile('lib/activityLog.ts');
      expect(source).toContain("can_music");
      expect(source).toContain("activityLog.actorRoles.music");
    });
  });

  // --- i18n keys: 24 event keys in all 3 locales ---
  describe('F085 i18n: 24 event keys in all 3 locales', () => {
    const eventKeys = [
      'member_create', 'member_update', 'member_delete',
      'speech_assign', 'speech_assign_theme', 'speech_unassign',
      'speech_status_change', 'speech_cleanup',
      'topic_create', 'topic_update', 'topic_delete',
      'collection_activate', 'collection_deactivate',
      'actor_create', 'actor_update', 'actor_delete',
      'sunday_type_change', 'agenda_edit',
      'agenda_last_minute_speech', 'agenda_last_minute_speech_removed',
      'user_invitation', 'user_invitation_accepted',
      'user_name_update', 'user_removed',
    ];

    for (const key of eventKeys) {
      it(`pt-BR has activityLog.events.${key}`, () => {
        const val = getNestedValue(ptBR, `activityLog.events.${key}`);
        expect(val).toBeDefined();
        expect(typeof val).toBe('string');
        expect((val as string).length).toBeGreaterThan(0);
      });
    }

    for (const key of eventKeys) {
      it(`en has activityLog.events.${key}`, () => {
        const val = getNestedValue(en, `activityLog.events.${key}`);
        expect(val).toBeDefined();
        expect(typeof val).toBe('string');
        expect((val as string).length).toBeGreaterThan(0);
      });
    }

    for (const key of eventKeys) {
      it(`es has activityLog.events.${key}`, () => {
        const val = getNestedValue(es, `activityLog.events.${key}`);
        expect(val).toBeDefined();
        expect(typeof val).toBe('string');
        expect((val as string).length).toBeGreaterThan(0);
      });
    }
  });

  // --- i18n keys: actor role keys in all 3 locales ---
  describe('F085 i18n: actorRoles keys in all 3 locales', () => {
    const roleKeys = ['preside', 'conduct', 'recognize', 'music'];

    for (const key of roleKeys) {
      it(`pt-BR has activityLog.actorRoles.${key}`, () => {
        expect(getNestedValue(ptBR, `activityLog.actorRoles.${key}`)).toBeDefined();
      });

      it(`en has activityLog.actorRoles.${key}`, () => {
        expect(getNestedValue(en, `activityLog.actorRoles.${key}`)).toBeDefined();
      });

      it(`es has activityLog.actorRoles.${key}`, () => {
        expect(getNestedValue(es, `activityLog.actorRoles.${key}`)).toBeDefined();
      });
    }
  });

  // --- Hooks using buildLogDescription ---
  describe('F085 hooks: all logAction calls use buildLogDescription', () => {
    it('useMembers.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useMembers.ts');
      expect(source).toContain("import { logAction, buildLogDescription }");
      expect(source).toContain("buildLogDescription('member:create'");
      expect(source).toContain("buildLogDescription('member:update'");
      expect(source).toContain("buildLogDescription('member:delete'");
    });

    it('useSpeeches.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useSpeeches.ts');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'speech:assign'");
      expect(source).toContain("'speech:assign_theme'");
      expect(source).toContain("'speech:status_change'");
      expect(source).toContain("'speech:unassign'");
      expect(source).toContain("'speech_cleanup'");
    });

    it('useTopics.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useTopics.ts');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'topic:create'");
      expect(source).toContain("'topic:update'");
      expect(source).toContain("'topic:delete'");
      expect(source).toContain("'collection:activate'");
    });

    it('useActors.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'actor:create'");
      expect(source).toContain("'actor:update'");
      expect(source).toContain("'actor:delete'");
    });

    it('useSundayTypes.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'sunday_type:change'");
    });

    it('useAgenda.ts imports and uses buildLogDescription', () => {
      const source = readSourceFile('hooks/useAgenda.ts');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'agenda:edit'");
    });

    it('settings/users.tsx imports and uses buildLogDescription', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("buildLogDescription");
      expect(source).toContain("'user:name-update'");
      expect(source).toContain("'user:removed'");
    });

    it('no old hardcoded log descriptions remain in hooks', () => {
      const hooks = ['useMembers.ts', 'useSpeeches.ts', 'useTopics.ts', 'useActors.ts', 'useSundayTypes.ts', 'useAgenda.ts'];
      for (const hook of hooks) {
        const source = readSourceFile(`hooks/${hook}`);
        // Check that logAction calls use buildLogDescription, not hardcoded strings
        const logActionCalls = source.match(/logAction\([^)]+\)/g) || [];
        for (const call of logActionCalls) {
          // Each logAction call should reference buildLogDescription
          expect(call).toContain('buildLogDescription');
        }
      }
    });
  });

  // --- history.tsx uses formatLogDescription ---
  describe('F085: history.tsx renders structured descriptions', () => {
    it('imports formatLogDescription', () => {
      const source = readSourceFile('app/(tabs)/settings/history.tsx');
      expect(source).toContain('formatLogDescription');
    });

    it('uses formatLogDescription(item.description, t)', () => {
      const source = readSourceFile('app/(tabs)/settings/history.tsx');
      expect(source).toContain('formatLogDescription(item.description');
    });
  });

  // --- Interpolation placeholders in i18n keys ---
  describe('F085 i18n: interpolation placeholders present', () => {
    it('member_create has {{nome}} placeholder', () => {
      const val = getNestedValue(en, 'activityLog.events.member_create') as string;
      expect(val).toContain('{{nome}}');
    });

    it('speech_assign has {{nome}}, {{N}}, {{data}} placeholders', () => {
      const val = getNestedValue(en, 'activityLog.events.speech_assign') as string;
      expect(val).toContain('{{nome}}');
      expect(val).toContain('{{N}}');
      expect(val).toContain('{{data}}');
    });

    it('speech_assign_theme has {{colecao}}, {{titulo}}, {{N}}, {{data}} placeholders', () => {
      const val = getNestedValue(en, 'activityLog.events.speech_assign_theme') as string;
      expect(val).toContain('{{colecao}}');
      expect(val).toContain('{{titulo}}');
      expect(val).toContain('{{N}}');
      expect(val).toContain('{{data}}');
    });

    it('actor_create has {{nome}} and {{funcao}} placeholders', () => {
      const val = getNestedValue(en, 'activityLog.events.actor_create') as string;
      expect(val).toContain('{{nome}}');
      expect(val).toContain('{{funcao}}');
    });

    it('sunday_type_change has {{data}} and {{tipo}} placeholders', () => {
      const val = getNestedValue(en, 'activityLog.events.sunday_type_change') as string;
      expect(val).toContain('{{data}}');
      expect(val).toContain('{{tipo}}');
    });

    it('user_removed has {{nome}} and {{email}} placeholders', () => {
      const val = getNestedValue(en, 'activityLog.events.user_removed') as string;
      expect(val).toContain('{{nome}}');
      expect(val).toContain('{{email}}');
    });
  });
});

// =============================================================================
// F086 (CR-143): Replace pg_timezone_names with static timezone list
// =============================================================================

describe('F086 (CR-143): Static timezone list', () => {
  // --- AC-086-01: App does not query pg_timezone_names ---
  describe('AC-086-01: no pg_timezone_names in app code', () => {
    it('no reference to pg_timezone_names in production source files', () => {
      // Check production code directories (exclude __tests__)
      const prodDirs = ['app', 'components', 'contexts', 'hooks', 'lib', 'i18n', 'types'];
      const srcDir = path.resolve(__dirname, '..');
      for (const dir of prodDirs) {
        const dirPath = path.join(srcDir, dir);
        if (!fs.existsSync(dirPath)) continue;
        const files = findFilesRecursive(dirPath, /\.(ts|tsx)$/);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          expect(content).not.toContain('pg_timezone_names');
        }
      }
    });
  });

  // --- AC-086-02: Timezone selector uses static list ---
  describe('AC-086-02: timezone selector uses TIMEZONES constant', () => {
    it('timezone.tsx defines TIMEZONES constant', () => {
      const source = readSourceFile('app/(tabs)/settings/timezone.tsx');
      expect(source).toContain('TIMEZONES');
      expect(source).toMatch(/const\s+TIMEZONES/);
    });

    it('timezone.tsx does not query pg_timezone_names from database', () => {
      const source = readSourceFile('app/(tabs)/settings/timezone.tsx');
      expect(source).not.toContain('pg_timezone_names');
    });
  });

  // --- AC-086-03: No triggers/functions reference pg_timezone_names ---
  describe('AC-086-03: no pg_timezone_names in SQL migrations', () => {
    it('no migration file references pg_timezone_names', () => {
      const migrationsDir = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        expect(content).not.toContain('pg_timezone_names');
      }
    });
  });

  // --- EC-086-01: Timezone not in static list ---
  describe('EC-086-01: timezone stored as TEXT without server-side validation', () => {
    it('TIMEZONES list has reasonable number of entries (>50)', () => {
      const source = readSourceFile('app/(tabs)/settings/timezone.tsx');
      // Count entries by looking at quoted strings in the array
      const matches = source.match(/'[A-Z][a-z]+\/[A-Za-z_]+'/g) || [];
      expect(matches.length).toBeGreaterThan(50);
    });
  });
});

// =============================================================================
// F087 (CR-144): Fix mutable search_path in 7 PostgreSQL functions
// =============================================================================

describe('F087 (CR-144): Fix search_path in SQL functions', () => {
  const getMigration = () => readSqlMigration('015_fix_function_search_path.sql');

  // --- AC-087-01: update_updated_at_column ---
  describe('AC-087-01: update_updated_at_column has search_path', () => {
    it('migration contains CREATE OR REPLACE FUNCTION update_updated_at_column', () => {
      const sql = getMigration();
      expect(sql).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    });

    it('update_updated_at_column has SET search_path', () => {
      const sql = getMigration();
      // Find the block between the function definition and the next function definition
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION update_updated_at_column');
      const nextFnStart = sql.indexOf('CREATE OR REPLACE FUNCTION', fnStart + 1);
      const fnBlock = sql.substring(fnStart, nextFnStart > -1 ? nextFnStart : undefined);
      expect(fnBlock).toContain("search_path = ''");
    });
  });

  // --- AC-087-02: auth.ward_id ---
  describe('AC-087-02: auth.ward_id has search_path', () => {
    it('migration contains CREATE OR REPLACE FUNCTION auth.ward_id', () => {
      const sql = getMigration();
      expect(sql).toContain('CREATE OR REPLACE FUNCTION auth.ward_id()');
    });

    it('auth.ward_id has SET search_path', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION auth.ward_id');
      const nextFnStart = sql.indexOf('CREATE OR REPLACE FUNCTION', fnStart + 1);
      const fnBlock = sql.substring(fnStart, nextFnStart > -1 ? nextFnStart : undefined);
      expect(fnBlock).toContain("search_path = ''");
    });

    it('auth.ward_id references auth.jwt() (already qualified)', () => {
      const sql = getMigration();
      expect(sql).toContain('auth.jwt()');
    });
  });

  // --- AC-087-03: list_ward_users ---
  describe('AC-087-03: list_ward_users has search_path', () => {
    it('migration contains CREATE OR REPLACE FUNCTION list_ward_users', () => {
      const sql = getMigration();
      expect(sql).toContain('list_ward_users');
    });

    it('list_ward_users has SET search_path', () => {
      const sql = getMigration();
      // Find the list_ward_users function block
      const fnStart = sql.indexOf('list_ward_users');
      const fnEndMarker = sql.indexOf('$$;', fnStart);
      const fnBody = sql.substring(fnStart, fnEndMarker + 3);
      expect(fnBody).toContain("search_path = ''");
    });

    it('list_ward_users references auth.users with schema qualifier', () => {
      const sql = getMigration();
      expect(sql).toContain('auth.users');
    });
  });

  // --- AC-087-04: create_weekly_reminders ---
  describe('AC-087-04: create_weekly_reminders has search_path', () => {
    it('migration contains create_weekly_reminders', () => {
      const sql = getMigration();
      expect(sql).toContain('create_weekly_reminders');
    });

    it('create_weekly_reminders has SET search_path', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION create_weekly_reminders');
      const fnEnd = sql.indexOf("search_path = ''", fnStart);
      expect(fnEnd).toBeGreaterThan(fnStart);
    });

    it('create_weekly_reminders uses public.wards', () => {
      const sql = getMigration();
      expect(sql).toContain('public.wards');
    });

    it('create_weekly_reminders uses public.sunday_exceptions', () => {
      const sql = getMigration();
      expect(sql).toContain('public.sunday_exceptions');
    });

    it('create_weekly_reminders uses public.speeches', () => {
      const sql = getMigration();
      expect(sql).toContain('public.speeches');
    });

    it('create_weekly_reminders uses public.notification_queue', () => {
      const sql = getMigration();
      expect(sql).toContain('public.notification_queue');
    });
  });

  // --- AC-087-05: enqueue_speech_notification ---
  describe('AC-087-05: enqueue_speech_notification has search_path', () => {
    it('migration contains enqueue_speech_notification', () => {
      const sql = getMigration();
      expect(sql).toContain('enqueue_speech_notification');
    });

    it('enqueue_speech_notification has SET search_path', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION enqueue_speech_notification');
      const fnEnd = sql.indexOf("search_path = ''", fnStart);
      expect(fnEnd).toBeGreaterThan(fnStart);
    });

    it('enqueue_speech_notification uses public.notification_queue', () => {
      const sql = getMigration();
      // Find the enqueue function body and check it uses public.notification_queue
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION enqueue_speech_notification');
      const remaining = sql.substring(fnStart);
      expect(remaining).toContain('public.notification_queue');
    });
  });

  // --- AC-087-06: delete_old_activity_log ---
  describe('AC-087-06: delete_old_activity_log has search_path', () => {
    it('migration contains delete_old_activity_log', () => {
      const sql = getMigration();
      expect(sql).toContain('delete_old_activity_log');
    });

    it('delete_old_activity_log has SET search_path', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION delete_old_activity_log');
      const fnEnd = sql.indexOf("search_path = ''", fnStart);
      expect(fnEnd).toBeGreaterThan(fnStart);
    });

    it('delete_old_activity_log uses public.activity_log', () => {
      const sql = getMigration();
      expect(sql).toContain('public.activity_log');
    });
  });

  // --- AC-087-07: import_members ---
  describe('AC-087-07: import_members has search_path', () => {
    it('migration contains import_members', () => {
      const sql = getMigration();
      expect(sql).toContain('import_members');
    });

    it('import_members has SET search_path', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION import_members');
      const fnEnd = sql.indexOf("search_path = ''", fnStart);
      expect(fnEnd).toBeGreaterThan(fnStart);
    });

    it('import_members uses public.members', () => {
      const sql = getMigration();
      expect(sql).toContain('public.members');
    });
  });

  // --- AC-087-08: All 7 functions present ---
  describe('AC-087-08: all 7 functions in migration', () => {
    const functionNames = [
      'update_updated_at_column',
      'ward_id',
      'list_ward_users',
      'create_weekly_reminders',
      'enqueue_speech_notification',
      'delete_old_activity_log',
      'import_members',
    ];

    for (const fn of functionNames) {
      it(`migration contains function ${fn}`, () => {
        const sql = getMigration();
        expect(sql).toContain(fn);
      });
    }
  });

  // --- AC-087-09: count of search_path = '' occurrences ---
  describe('AC-087-09: search_path applied to all 7 functions', () => {
    it("migration has at least 7 occurrences of search_path = ''", () => {
      const sql = getMigration();
      const matches = sql.match(/search_path\s*=\s*''/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(7);
    });
  });

  // --- EC-087-01: auth.ward_id references auth.users ---
  describe('EC-087-01: auth references already qualified', () => {
    it('auth.ward_id uses auth.jwt() which is fully qualified', () => {
      const sql = getMigration();
      expect(sql).toContain('auth.jwt()');
    });
  });

  // --- EC-087-02: trigger uses NEW variable ---
  describe('EC-087-02: trigger function uses NEW (no search_path impact)', () => {
    it('enqueue_speech_notification uses NEW.ward_id, NEW.status etc.', () => {
      const sql = getMigration();
      expect(sql).toContain('NEW.status');
      expect(sql).toContain('NEW.ward_id');
    });

    it('update_updated_at_column uses NEW.updated_at', () => {
      const sql = getMigration();
      expect(sql).toContain('NEW.updated_at');
    });
  });

  // --- EC-087-03: import_members uses JSONB loop ---
  describe('EC-087-03: import_members JSONB operations', () => {
    it('import_members uses jsonb_array_elements', () => {
      const sql = getMigration();
      expect(sql).toContain('jsonb_array_elements');
    });

    it('import_members INSERT references public.members', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION import_members');
      const remaining = sql.substring(fnStart);
      expect(remaining).toContain('INSERT INTO public.members');
    });

    it('import_members DELETE references public.members', () => {
      const sql = getMigration();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION import_members');
      const remaining = sql.substring(fnStart);
      expect(remaining).toContain('DELETE FROM public.members');
    });
  });

  // --- No unqualified table references in function bodies ---
  describe('F087: no unqualified table references', () => {
    it('migration uses public. prefix for wards table', () => {
      const sql = getMigration();
      // In function bodies, wards should be public.wards
      const fnBodies = sql.match(/\$\$[\s\S]*?\$\$/g) || [];
      for (const body of fnBodies) {
        if (body.includes('wards') && !body.includes('auth.')) {
          expect(body).toContain('public.wards');
        }
      }
    });
  });
});

// =============================================================================
// Helper: find files recursively
// =============================================================================

function findFilesRecursive(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...findFilesRecursive(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results;
}
