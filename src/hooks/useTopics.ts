/**
 * TanStack Query hooks for topic and collection management.
 * Ward topics CRUD + general collection toggle + active topics aggregation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction, buildLogDescription } from '../lib/activityLog';
import { toDbLocale } from '../i18n';
import type {
  WardTopic,
  GeneralCollection,
  WardCollectionConfig,
  GeneralTopic,
  CreateTopicInput,
  TopicWithCollection,
} from '../types/database';

// --- Query Keys ---

export const topicKeys = {
  all: ['topics'] as const,
  wardTopics: (wardId: string) => ['topics', 'ward', wardId] as const,
  activeTopics: (wardId: string) => ['topics', 'active', wardId] as const,
  collections: (wardId: string, language: string) =>
    ['topics', 'collections', wardId, language] as const,
  collectionConfig: (wardId: string) =>
    ['topics', 'collectionConfig', wardId] as const,
  collectionTopics: (collectionId: string) =>
    ['topics', 'collectionTopics', collectionId] as const,
};

// --- Utilities ---

function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// --- Ward Topics Hooks ---

/**
 * Fetch ward-specific topics, sorted alphabetically.
 */
export function useWardTopics(search?: string) {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: topicKeys.wardTopics(wardId),
    queryFn: async (): Promise<WardTopic[]> => {
      const { data, error } = await supabase
        .from('ward_topics')
        .select('*')
        .eq('ward_id', wardId)
        .order('title', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId,
    select: (data: WardTopic[]) => {
      if (!search?.trim()) return data;
      const normalized = normalizeForSearch(search);
      return data.filter((t) => normalizeForSearch(t.title).includes(normalized));
    },
  });
}

/**
 * Create a new ward topic.
 */
export function useCreateWardTopic() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTopicInput): Promise<WardTopic> => {
      const { data, error } = await supabase
        .from('ward_topics')
        .insert({
          ward_id: wardId,
          title: input.title,
          link: input.link ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: topicKeys.wardTopics(wardId) });
      queryClient.invalidateQueries({ queryKey: topicKeys.activeTopics(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'topic:create', buildLogDescription('topic:create', { titulo: data.title }), userName);
      }
    },
  });
}

/**
 * Update an existing ward topic.
 */
export function useUpdateWardTopic() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; title?: string; link?: string | null }): Promise<WardTopic> => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from('ward_topics')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: topicKeys.wardTopics(wardId) });
      queryClient.invalidateQueries({ queryKey: topicKeys.activeTopics(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'topic:update', buildLogDescription('topic:update', { titulo: data.title }), userName);
      }
    },
  });
}

/**
 * Check if a ward topic has future speeches.
 */
export async function checkTopicFutureSpeeches(topicTitle: string, wardId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('speeches')
    .select('*', { count: 'exact', head: true })
    .eq('ward_id', wardId)
    .eq('topic_title', topicTitle)
    .gte('sunday_date', today);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete a ward topic.
 * Speeches with this topic will preserve snapshot fields (topic_title, topic_link, topic_collection).
 */
export function useDeleteWardTopic() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, topicTitle }: { topicId: string; topicTitle: string }): Promise<string> => {
      const { error } = await supabase.from('ward_topics').delete().eq('id', topicId);
      if (error) throw error;
      return topicTitle;
    },
    onSuccess: (topicTitle) => {
      queryClient.invalidateQueries({ queryKey: topicKeys.wardTopics(wardId) });
      queryClient.invalidateQueries({ queryKey: topicKeys.activeTopics(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'topic:delete', buildLogDescription('topic:delete', { titulo: topicTitle }), userName);
      }
    },
  });
}

// --- General Collections Hooks ---

interface CollectionWithConfig extends GeneralCollection {
  active: boolean;
  configId: string | null;
}

/**
 * Fixed sort priority for known collection names (3 per language).
 * Unknown names (general conference collections) get priority 3
 * and are sorted by name descending (newest first).
 */
export const FIXED_COLLECTION_ORDER: Record<string, number> = {
  // pt-BR
  'Temas Especiais': 0,
  'Para a Forca da Juventude': 1,
  'Principios do Evangelho': 2,
  // en-US
  'Special Topics': 0,
  'For the Strength of Youth': 1,
  'Gospel Principles': 2,
  // es-LA
  'Temas Especiales': 0,
  'Para la Fortaleza de la Juventud': 1,
  'Principios del Evangelio': 2,
};

/**
 * Fetch general collections for the ward's language with their activation status.
 * Returns: Ward Topics section is handled separately.
 * Collections are sorted in fixed order: known collections by priority (0-2),
 * then conference collections (priority 3) by name descending (newest first).
 */
export function useCollections(language: string) {
  const { wardId } = useAuth();
  const dbLocale = toDbLocale(language);

  return useQuery({
    queryKey: topicKeys.collections(wardId, language),
    queryFn: async (): Promise<CollectionWithConfig[]> => {
      // Fetch all general collections for this language (using DB locale code)
      const { data: collections, error: collErr } = await supabase
        .from('general_collections')
        .select('*')
        .eq('language', dbLocale);

      if (collErr) throw collErr;

      // Fetch ward's collection config
      const { data: configs, error: confErr } = await supabase
        .from('ward_collection_config')
        .select('*')
        .eq('ward_id', wardId);

      if (confErr) throw confErr;

      const configMap = new Map<string, WardCollectionConfig>();
      (configs ?? []).forEach((c) => configMap.set(c.collection_id, c));

      return (collections ?? []).map((col) => {
        const config = configMap.get(col.id);
        return {
          ...col,
          active: config?.active ?? false,
          configId: config?.id ?? null,
        };
      });
    },
    enabled: !!wardId && !!language,
    select: (data: CollectionWithConfig[]) => {
      return [...data].sort((a, b) => {
        const pa = FIXED_COLLECTION_ORDER[a.name] ?? 3;
        const pb = FIXED_COLLECTION_ORDER[b.name] ?? 3;
        if (pa !== pb) return pa - pb;
        return b.name.localeCompare(a.name);
      });
    },
  });
}

/**
 * Fetch topics for a specific general collection (lazy, on-demand).
 * Used by F034 when a collection row is expanded in the Topics screen.
 */
export function useCollectionTopics(collectionId: string | null) {
  return useQuery({
    queryKey: topicKeys.collectionTopics(collectionId ?? ''),
    queryFn: async (): Promise<GeneralTopic[]> => {
      const { data, error } = await supabase
        .from('general_topics')
        .select('*')
        .eq('collection_id', collectionId!)
        .order('title', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!collectionId,
  });
}

/**
 * Toggle a general collection's activation for the current ward.
 */
export function useToggleCollection() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      collectionName,
      active,
    }: {
      collectionId: string;
      collectionName?: string;
      active: boolean;
    }): Promise<{ active: boolean; collectionName?: string }> => {
      // Single upsert with onConflict (UNIQUE(ward_id, collection_id) at 001_initial_schema.sql:81)
      const { error } = await supabase
        .from('ward_collection_config')
        .upsert(
          { ward_id: wardId, collection_id: collectionId, active },
          { onConflict: 'ward_id,collection_id' }
        );
      if (error) throw error;

      return { active, collectionName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      if (user && result.collectionName) {
        const action = result.active ? 'collection:activate' : 'collection:deactivate';
        logAction(wardId, user.id, user.email ?? '', action, buildLogDescription(action, { nome: result.collectionName }), userName);
      }
    },
  });
}

/**
 * Check if a collection has topics used in future speeches.
 */
export async function checkCollectionFutureSpeeches(
  collectionName: string,
  wardId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('speeches')
    .select('*', { count: 'exact', head: true })
    .eq('ward_id', wardId)
    .eq('topic_collection', collectionName)
    .gte('sunday_date', today);

  if (error) throw error;
  return count ?? 0;
}

// --- Active Topics (combined ward + general) ---

/**
 * Fetch all active topics: ward topics + topics from active general collections.
 * Returns TopicWithCollection[] sorted alphabetically by "Collection : Title".
 */
export function useActiveTopics() {
  const { wardId } = useAuth();
  const { t } = useTranslation();

  return useQuery({
    queryKey: topicKeys.activeTopics(wardId),
    queryFn: async (): Promise<TopicWithCollection[]> => {
      const results: TopicWithCollection[] = [];

      // Round 1: ward_topics and ward_collection_config in parallel (ADR-033)
      const [wardTopicsResult, activeConfigsResult] = await Promise.all([
        supabase
          .from('ward_topics')
          .select('*')
          .eq('ward_id', wardId),
        supabase
          .from('ward_collection_config')
          .select('collection_id')
          .eq('ward_id', wardId)
          .eq('active', true),
      ]);

      if (wardTopicsResult.error) throw wardTopicsResult.error;
      if (activeConfigsResult.error) throw activeConfigsResult.error;

      const wardTopicLabel = t('topics.wardTopics');
      (wardTopicsResult.data ?? []).forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          link: t.link,
          collection: wardTopicLabel,
          type: 'ward',
        });
      });

      const activeCollectionIds = (activeConfigsResult.data ?? []).map((c) => c.collection_id);

      if (activeCollectionIds.length > 0) {
        // Round 2: general_collections and general_topics in parallel (ADR-033)
        const [collectionsResult, generalTopicsResult] = await Promise.all([
          supabase
            .from('general_collections')
            .select('*')
            .in('id', activeCollectionIds),
          supabase
            .from('general_topics')
            .select('*')
            .in('collection_id', activeCollectionIds),
        ]);

        if (collectionsResult.error) throw collectionsResult.error;
        if (generalTopicsResult.error) throw generalTopicsResult.error;

        const collectionMap = new Map<string, string>();
        (collectionsResult.data ?? []).forEach((c) => collectionMap.set(c.id, c.name));

        (generalTopicsResult.data ?? []).forEach((t: GeneralTopic) => {
          const collectionName = collectionMap.get(t.collection_id) ?? '';
          results.push({
            id: t.id,
            title: t.title,
            link: t.link,
            collection: collectionName,
            type: 'general',
          });
        });
      }

      // Sort by "Collection : Title" concatenated string
      results.sort((a, b) => {
        const aKey = `${a.collection} : ${a.title}`;
        const bKey = `${b.collection} : ${b.title}`;
        return aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
      });

      return results;
    },
    enabled: !!wardId,
  });
}
