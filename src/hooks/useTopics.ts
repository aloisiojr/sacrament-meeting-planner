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
import { compareActiveTopics } from '../lib/topics';
import type {
  WardTopic,
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

// Kept per team-lead instruction (see f021-topic-library-overhaul test);
// retained as a reusable helper even though not currently referenced.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// --- Ward Topics Hooks ---

/**
 * Fetch ward-specific topics, sorted alphabetically.
 */
export function useWardTopics() {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: topicKeys.wardTopics(wardId),
    queryFn: async (): Promise<WardTopic[]> => {
      const { data, error } = await supabase
        .from('ward_topics')
        .select('*')
        .eq('ward_id', wardId)
        .order('is_default', { ascending: false })
        .order('title', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId,
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

// --- Active Topics (combined ward + general) ---

/**
 * Fetch every selectable topic: ward (custom) topics + ALL built-in library topics for the ward
 * language. No collection-visibility filter (removed in v2). Ordered for the picker via
 * compareActiveTopics: ward first, then evergreen libraries, then conferences newest-first.
 */
export function useActiveTopics() {
  const { wardId, wardLanguage } = useAuth();
  const { t } = useTranslation();
  const dbLocale = toDbLocale(wardLanguage ?? 'en-US');

  return useQuery({
    queryKey: [...topicKeys.activeTopics(wardId), dbLocale] as const,
    queryFn: async (): Promise<TopicWithCollection[]> => {
      const results: TopicWithCollection[] = [];

      // Ward topics + all general collections for the language, in parallel.
      const [wardTopicsResult, collectionsResult] = await Promise.all([
        supabase.from('ward_topics').select('*').eq('ward_id', wardId),
        supabase.from('general_collections').select('*').eq('language', dbLocale),
      ]);

      if (wardTopicsResult.error) throw wardTopicsResult.error;
      if (collectionsResult.error) throw collectionsResult.error;

      const wardTopicLabel = t('topics.customTopics');
      (wardTopicsResult.data ?? []).forEach((wt) => {
        results.push({ id: wt.id, title: wt.title, link: wt.link, collection: wardTopicLabel, type: 'ward' });
      });

      const collectionIds = (collectionsResult.data ?? []).map((c) => c.id);
      if (collectionIds.length > 0) {
        const { data: generalTopics, error: gtErr } = await supabase
          .from('general_topics')
          .select('*')
          .in('collection_id', collectionIds);
        if (gtErr) throw gtErr;

        const collectionMap = new Map<string, string>();
        (collectionsResult.data ?? []).forEach((c) => collectionMap.set(c.id, c.name));

        (generalTopics ?? []).forEach((gt: GeneralTopic) => {
          results.push({
            id: gt.id,
            title: gt.title,
            link: gt.link,
            collection: collectionMap.get(gt.collection_id) ?? '',
            type: 'general',
          });
        });
      }

      results.sort(compareActiveTopics);
      return results;
    },
    enabled: !!wardId,
  });
}
