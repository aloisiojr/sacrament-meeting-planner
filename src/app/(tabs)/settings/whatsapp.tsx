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
import { getDefaultSpeechTemplate, getDefaultPrayerTemplate } from '../../../lib/whatsappUtils';
import { useWardManagePrayers } from '../../../hooks/useSpeeches';

// F116: Placeholder keys mapped to i18n keys for app-language-aware display
const PLACEHOLDER_I18N_KEYS = [
  'whatsapp.placeholderName',
  'whatsapp.placeholderDate',
  'whatsapp.placeholderCollection',
  'whatsapp.placeholderTitle',
  'whatsapp.placeholderLink',
] as const;

// Actual placeholder tokens used in the template (language-neutral)
const PLACEHOLDER_TOKENS = [
  '{nome}',
  '{data}',
  '{colecao}',
  '{titulo}',
  '{link}',
] as const;

// CR-221: Prayer templates only use {nome} and {data}
const PRAYER_PLACEHOLDER_I18N_KEYS = [
  'whatsapp.placeholderName',
  'whatsapp.placeholderDate',
] as const;

const PRAYER_PLACEHOLDER_TOKENS = [
  '{nome}',
  '{data}',
] as const;

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  '{nome}': 'Maria Silva',
  '{data}': '2026-03-01',
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

type ActiveTab = 'speech_1' | 'speech_2' | 'speech_3' | 'opening_prayer' | 'closing_prayer';

export default function WhatsAppTemplateScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { wardId, wardLanguage, user, userName } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const speech1SaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech2SaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech3SaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // CR-221: Segmented control state
  const { managePrayers } = useWardManagePrayers();
  const [activeTab, setActiveTab] = useState<ActiveTab>('speech_1');

  // F116: Build translated placeholder display labels
  const placeholderLabels = PLACEHOLDER_I18N_KEYS.map((key) => t(key));
  const prayerPlaceholderLabels = PRAYER_PLACEHOLDER_I18N_KEYS.map((key) => t(key));

  // Fetch ward to get current templates
  const { data: ward } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('whatsapp_template_speech_1, whatsapp_template_speech_2, whatsapp_template_speech_3, whatsapp_template_opening_prayer, whatsapp_template_closing_prayer, language')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!wardId,
  });

  // Speech template states (3 separate)
  const [speech1Template, setSpeech1Template] = useState('');
  const [speech1Initialized, setSpeech1Initialized] = useState(false);
  const [speech2Template, setSpeech2Template] = useState('');
  const [speech2Initialized, setSpeech2Initialized] = useState(false);
  const [speech3Template, setSpeech3Template] = useState('');
  const [speech3Initialized, setSpeech3Initialized] = useState(false);

  // CR-221: Prayer template states
  const [openingTemplate, setOpeningTemplate] = useState('');
  const [openingInitialized, setOpeningInitialized] = useState(false);
  const [closingTemplate, setClosingTemplate] = useState('');
  const [closingInitialized, setClosingInitialized] = useState(false);

  // Initialize speech 1 template from DB
  useEffect(() => {
    if (ward && !speech1Initialized) {
      const val = ward.whatsapp_template_speech_1;
      if (val === null || val === undefined) {
        setSpeech1Template(getDefaultSpeechTemplate(wardLanguage ?? 'pt-BR', 1));
      } else if (val === '') {
        setSpeech1Template('');
      } else {
        setSpeech1Template(val);
      }
      setSpeech1Initialized(true);
    }
  }, [ward, speech1Initialized, wardLanguage]);

  // Initialize speech 2 template from DB
  useEffect(() => {
    if (ward && !speech2Initialized) {
      const val = ward.whatsapp_template_speech_2;
      if (val === null || val === undefined) {
        setSpeech2Template(getDefaultSpeechTemplate(wardLanguage ?? 'pt-BR', 2));
      } else if (val === '') {
        setSpeech2Template('');
      } else {
        setSpeech2Template(val);
      }
      setSpeech2Initialized(true);
    }
  }, [ward, speech2Initialized, wardLanguage]);

  // Initialize speech 3 template from DB
  useEffect(() => {
    if (ward && !speech3Initialized) {
      const val = ward.whatsapp_template_speech_3;
      if (val === null || val === undefined) {
        setSpeech3Template(getDefaultSpeechTemplate(wardLanguage ?? 'pt-BR', 3));
      } else if (val === '') {
        setSpeech3Template('');
      } else {
        setSpeech3Template(val);
      }
      setSpeech3Initialized(true);
    }
  }, [ward, speech3Initialized, wardLanguage]);

  // CR-221: Initialize opening prayer template from DB
  useEffect(() => {
    if (ward && !openingInitialized) {
      const val = ward.whatsapp_template_opening_prayer;
      if (val === null || val === undefined) {
        setOpeningTemplate(getDefaultPrayerTemplate(wardLanguage ?? 'pt-BR', 'opening'));
      } else if (val === '') {
        setOpeningTemplate('');
      } else {
        setOpeningTemplate(val);
      }
      setOpeningInitialized(true);
    }
  }, [ward, openingInitialized, wardLanguage]);

  // CR-221: Initialize closing prayer template from DB
  useEffect(() => {
    if (ward && !closingInitialized) {
      const val = ward.whatsapp_template_closing_prayer;
      if (val === null || val === undefined) {
        setClosingTemplate(getDefaultPrayerTemplate(wardLanguage ?? 'pt-BR', 'closing'));
      } else if (val === '') {
        setClosingTemplate('');
      } else {
        setClosingTemplate(val);
      }
      setClosingInitialized(true);
    }
  }, [ward, closingInitialized, wardLanguage]);

  // F141: Reset initialized flags when wardLanguage changes (skip initial mount)
  const prevWardLanguageRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevWardLanguageRef.current !== undefined && prevWardLanguageRef.current !== wardLanguage) {
      setSpeech1Initialized(false);
      setSpeech2Initialized(false);
      setSpeech3Initialized(false);
      setOpeningInitialized(false);
      setClosingInitialized(false);
    }
    prevWardLanguageRef.current = wardLanguage;
  }, [wardLanguage]);

  // Auto-save mutation for speech 1 template
  const saveSpeech1Mutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template_speech_1: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp 1o discurso atualizado', userName);
      }
    },
  });

  // Auto-save mutation for speech 2 template
  const saveSpeech2Mutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template_speech_2: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp 2o discurso atualizado', userName);
      }
    },
  });

  // Auto-save mutation for speech 3 template
  const saveSpeech3Mutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template_speech_3: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp 3o discurso atualizado', userName);
      }
    },
  });

  // CR-221: Auto-save mutation for opening prayer template
  const saveOpeningMutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template_opening_prayer: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp oração abertura atualizado', userName);
      }
    },
  });

  // CR-221: Auto-save mutation for closing prayer template
  const saveClosingMutation = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ whatsapp_template_closing_prayer: newTemplate })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', 'Modelo WhatsApp oração encerramento atualizado', userName);
      }
    },
  });

  // Handle speech 1 template change with auto-save debounce
  const handleSpeech1Change = useCallback(
    (text: string) => {
      setSpeech1Template(text);
      if (speech1SaveTimerRef.current) clearTimeout(speech1SaveTimerRef.current);
      speech1SaveTimerRef.current = setTimeout(() => {
        saveSpeech1Mutation.mutate(text);
      }, 1000);
    },
    [saveSpeech1Mutation]
  );

  // Handle speech 2 template change with auto-save debounce
  const handleSpeech2Change = useCallback(
    (text: string) => {
      setSpeech2Template(text);
      if (speech2SaveTimerRef.current) clearTimeout(speech2SaveTimerRef.current);
      speech2SaveTimerRef.current = setTimeout(() => {
        saveSpeech2Mutation.mutate(text);
      }, 1000);
    },
    [saveSpeech2Mutation]
  );

  // Handle speech 3 template change with auto-save debounce
  const handleSpeech3Change = useCallback(
    (text: string) => {
      setSpeech3Template(text);
      if (speech3SaveTimerRef.current) clearTimeout(speech3SaveTimerRef.current);
      speech3SaveTimerRef.current = setTimeout(() => {
        saveSpeech3Mutation.mutate(text);
      }, 1000);
    },
    [saveSpeech3Mutation]
  );

  // CR-221: Handle opening prayer template change
  const handleOpeningChange = useCallback(
    (text: string) => {
      setOpeningTemplate(text);
      if (openingSaveTimerRef.current) clearTimeout(openingSaveTimerRef.current);
      openingSaveTimerRef.current = setTimeout(() => {
        saveOpeningMutation.mutate(text);
      }, 1000);
    },
    [saveOpeningMutation]
  );

  // CR-221: Handle closing prayer template change
  const handleClosingChange = useCallback(
    (text: string) => {
      setClosingTemplate(text);
      if (closingSaveTimerRef.current) clearTimeout(closingSaveTimerRef.current);
      closingSaveTimerRef.current = setTimeout(() => {
        saveClosingMutation.mutate(text);
      }, 1000);
    },
    [saveClosingMutation]
  );

  // Get current template/preview/handlers based on active tab
  const currentTemplate = activeTab === 'speech_1' ? speech1Template
    : activeTab === 'speech_2' ? speech2Template
    : activeTab === 'speech_3' ? speech3Template
    : activeTab === 'opening_prayer' ? openingTemplate
    : closingTemplate;

  const currentHandleChange = activeTab === 'speech_1' ? handleSpeech1Change
    : activeTab === 'speech_2' ? handleSpeech2Change
    : activeTab === 'speech_3' ? handleSpeech3Change
    : activeTab === 'opening_prayer' ? handleOpeningChange
    : handleClosingChange;

  const currentIsSaving = activeTab === 'speech_1' ? saveSpeech1Mutation.isPending
    : activeTab === 'speech_2' ? saveSpeech2Mutation.isPending
    : activeTab === 'speech_3' ? saveSpeech3Mutation.isPending
    : activeTab === 'opening_prayer' ? saveOpeningMutation.isPending
    : saveClosingMutation.isPending;

  const preview = resolveTemplate(currentTemplate);

  const isPrayerTab = activeTab === 'opening_prayer' || activeTab === 'closing_prayer';
  const currentTokens = isPrayerTab ? PRAYER_PLACEHOLDER_TOKENS : PLACEHOLDER_TOKENS;
  const currentLabels = isPrayerTab ? prayerPlaceholderLabels : placeholderLabels;

  // Build tabs array based on managePrayers
  const speechTabs: ActiveTab[] = ['speech_1', 'speech_2', 'speech_3'];
  const prayerTabs: ActiveTab[] = ['opening_prayer', 'closing_prayer'];
  const tabs = managePrayers ? [...speechTabs, ...prayerTabs] : speechTabs;

  const tabLabel = (tab: ActiveTab): string => {
    switch (tab) {
      case 'speech_1': return t('whatsapp.tabSpeech1');
      case 'speech_2': return t('whatsapp.tabSpeech2');
      case 'speech_3': return t('whatsapp.tabSpeech3');
      case 'opening_prayer': return t('whatsapp.tabOpeningPrayer');
      case 'closing_prayer': return t('whatsapp.tabClosingPrayer');
    }
  };

  // Insert placeholder at cursor position
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const pos = selection.start;
      const before = currentTemplate.substring(0, pos);
      const after = currentTemplate.substring(pos);
      const newTemplate = before + placeholder + after;

      currentHandleChange(newTemplate);

      const newPos = pos + placeholder.length;
      setSelection({ start: newPos, end: newPos });
    },
    [currentTemplate, selection, currentHandleChange]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <Text style={[styles.backButton, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('settings.whatsappTemplate')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* CR-231: Segmented control always shown (3 speech tabs, or 5 with prayers) */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[
                  styles.segmentedTab,
                  isActive && { backgroundColor: colors.card },
                ]}
                onPress={() => {
                  setActiveTab(tab);
                  setSelection({ start: 0, end: 0 });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentedTabText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                    isActive && { fontWeight: '600' },
                  ]}
                  numberOfLines={1}
                >
                  {tabLabel(tab)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Placeholder list */}
        <View style={styles.placeholderSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('settings.whatsapp.placeholders')}
          </Text>
          <View style={styles.placeholderList}>
            {currentTokens.map((token, idx) => (
              <Pressable
                key={token}
                style={[styles.placeholderChip, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => insertPlaceholder(token)}
              >
                <Text style={[styles.placeholderText, { color: colors.text }]}>
                  {currentLabels[idx]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Template editor */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.whatsapp.template')}
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
          value={currentTemplate}
          onChangeText={currentHandleChange}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Preview */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.whatsapp.preview')}
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.previewText, { color: colors.text }]}>
            {preview || '(empty)'}
          </Text>
        </View>

        {currentIsSaving && (
          <Text style={[styles.savingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
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
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginBottom: 8,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentedTabText: {
    fontSize: 13,
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
