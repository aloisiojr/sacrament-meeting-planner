/**
 * Exports a Sunday's agenda as a PDF and opens the share sheet.
 *
 * Lives beside the "Iniciar" control on the expanded agenda card. Kept as its own component rather
 * than inlined so the affordance — press, lock, failure — is testable without mounting the whole
 * agenda tab.
 */

import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { ShareIcon } from './icons';
import { useAgendaPdfExport } from '../hooks/useAgendaPdfExport';
import type { Speech, SundayAgenda, SundayException } from '../types/database';

export interface AgendaExportPdfButtonProps {
  date: string;
  /** The card's agenda; undefined before it is lazily created. */
  agenda?: SundayAgenda | null;
  speeches: Speech[];
  exception?: SundayException | null;
}

export function AgendaExportPdfButton({
  date,
  agenda,
  speeches,
  exception,
}: AgendaExportPdfButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { exportAgenda, isExporting } = useAgendaPdfExport();

  const handlePress = useCallback(async () => {
    try {
      await exportAgenda({
        date,
        // A Sunday with no agenda row yet still prints: a blank form is the useful output.
        agenda: agenda ?? null,
        speeches,
        exception: exception ?? null,
      });
    } catch {
      // A button that appears to do nothing reads as a broken app.
      Alert.alert(t('common.error'), t('agenda.pdfFailed'));
    }
  }, [exportAgenda, date, agenda, speeches, exception, t]);

  return (
    <Pressable
      testID={`agenda-export-pdf-${date}`}
      onPress={handlePress}
      disabled={isExporting}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('agenda.exportPdf')}
      style={[styles.button, { borderColor: colors.primary }, isExporting && styles.busy]}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <ShareIcon size={15} color={colors.primary} />
      )}
      <Text style={[styles.text, { color: colors.primary }]}>{t('agenda.exportPdf')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginRight: 8,
  },
  busy: { opacity: 0.6 },
  text: { fontSize: 13, fontWeight: '700' },
});
