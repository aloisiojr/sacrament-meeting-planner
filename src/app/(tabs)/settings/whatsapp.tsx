import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../lib/activityLog';

const PLACEHOLDERS = [
  '{nome}',
  '{data}',
  '{posicao}',
  '{duracao}',
  '{colecao}',
  '{titulo}',
  '{link}',
] as const;

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  '{nome}': 'Maria Silva',
  '{data}': '2026-03-01',
  '{posicao}': '1',
  '{duracao}': '10 min',
  '{colecao}': 'Temas da Ala',
  '{titulo}': 'Fe em Jesus Cristo',
  '{link}': 'https://example.com/topic',
};

function resolveTemplate(template: string): string {
  let result = template;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

export default function WhatsAppTemplateScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Fetch ward to get current template
  const { data: ward } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('whatsapp_template')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!wardId,
  });

  const [template, setTemplate] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize template from DB
  useEffect(() => {
    if (ward?.whatsapp_template && !initialized) {
      setTemplate(ward.whatsapp_template);
      setInitialized(true);
    }
  }, [ward, initialized]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp atualizado');
      }
    },
  });

  // Handle template change with auto-save debounce
  const handleChange = useCallback(
    (text: string) => {
      setTemplate(text);

      // Debounce auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate(text);
      }, 1000);
    },
    [saveMutation]
  );

  const preview = resolveTemplate(template);

  // Insert placeholder at cursor position (CR-15)
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const pos = selection.start;
      const before = template.substring(0, pos);
      const after = template.substring(pos);
      const newTemplate = before + placeholder + after;
      setTemplate(newTemplate);
      const newPos = pos + placeholder.length;
      setSelection({ start: newPos, end: newPos });

      // Trigger auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate(newTemplate);
      }, 1000);
    },
    [template, selection, saveMutation]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[styles.backButton, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('settings.whatsappTemplate')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Placeholder list */}
        <View style={styles.placeholderSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Placeholders:
          </Text>
          <View style={styles.placeholderList}>
            {PLACEHOLDERS.map((p) => (
              <Pressable
                key={p}
                style={[styles.placeholderChip, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => insertPlaceholder(p)}
              >
                <Text style={[styles.placeholderText, { color: colors.text }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Template editor */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Template:
        </Text>
        <TextInput
          style={[
            styles.editor,
            {
              color: colors.text,
              borderColor: colors.divider,
              backgroundColor: colors.surfaceVariant,
            },
          ]}
          value={template}
          onChangeText={handleChange}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Preview */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Preview:
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.previewText, { color: colors.text }]}>
            {preview || '(empty)'}
          </Text>
        </View>

        {saveMutation.isPending && (
          <Text style={[styles.savingText, { color: colors.textSecondary }]}>
            Saving...
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  placeholderSection: {
    marginBottom: 4,
  },
  placeholderList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  placeholderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 15,
    fontFamily: 'monospace',
  },
  editor: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    minHeight: 160,
    lineHeight: 24,
  },
  previewCard: {
    borderRadius: 10,
    padding: 14,
    minHeight: 60,
  },
  previewText: {
    fontSize: 17,
    lineHeight: 24,
  },
  savingText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
