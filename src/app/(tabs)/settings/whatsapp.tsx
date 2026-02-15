import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.whatsappTemplate')}
        </Text>

        {/* Placeholder list */}
        <View style={styles.placeholderSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Placeholders:
          </Text>
          <View style={styles.placeholderList}>
            {PLACEHOLDERS.map((p) => (
              <View
                key={p}
                style={[styles.placeholderChip, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text style={[styles.placeholderText, { color: colors.text }]}>{p}</Text>
              </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  editor: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  previewCard: {
    borderRadius: 10,
    padding: 14,
    minHeight: 60,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  savingText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
