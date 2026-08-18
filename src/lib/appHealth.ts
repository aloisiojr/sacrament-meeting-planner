/**
 * Canal de diagnóstico do app: registra "isto precisa da atenção do desenvolvedor".
 *
 * Spec: `specs/app-health-events.md` · Decisão: `docs/decisions/007-app-health-events.md`
 *
 * Existe porque o import de PDF cai num fallback SILENCIOSO quando a grade desenhada da tabela do
 * LCR não explica o documento. Isso é bom para robustez e péssimo para diagnóstico: sem canal, uma
 * mudança de layout do relatório degrada o import e ninguém fica sabendo até alguém estranhar um
 * nome. O import é o primeiro emissor; o canal nasce genérico para receber outros.
 *
 * Ninguém lê esta tabela pelo app — não há policy de SELECT. A leitura é do desenvolvedor, pela
 * Management API.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { LcrFallbackReason } from './lcrPdfGrid';

/** O que pode ir num `details`. Nada além disto sai do aparelho. */
export type HealthDetailValue = number | boolean;

/**
 * Filtra o payload para números e booleanos, descartando o resto.
 *
 * A restrição é dura porque a fonte é dura: o relatório do LCR que motiva este canal carrega nome,
 * telefone, e-mail e data de nascimento de membros reais. Texto de qualquer tamanho é recusado —
 * uma cauda de e-mail ("l.com") e um sobrenome têm exatamente a mesma cara para um filtro, então
 * não se tenta distinguir. Objetos e arrays também caem, porque são por onde texto entraria
 * escondido um nível abaixo.
 *
 * O filtro fica aqui, no emissor, e não na disciplina de quem chama: emissor futuro nenhum deveria
 * precisar lembrar desta regra para não vazar dado de membro.
 */
export function sanitizeHealthDetails(details: Record<string, unknown>): Record<string, HealthDetailValue> {
  const out: Record<string, HealthDetailValue> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/**
 * Registra um evento de saúde. Nunca lança, nunca bloqueia, nunca reenvia.
 *
 * Três propriedades deliberadas:
 *
 * 1. **Não pede a linha de volta.** `insert` sem `.select()`. A tabela não tem policy de SELECT, e
 *    o Postgres aplica policies de SELECT à cláusula RETURNING — com `.select()`, TODA escrita
 *    falharia. Como o erro aqui é engolido por desenho, o canal ficaria mudo sem nenhum sinal.
 *    Verificado contra o staging em 2026-08-17.
 * 2. **Engole qualquer falha.** Um diagnóstico que quebra a funcionalidade que ele observa é pior
 *    que diagnóstico nenhum.
 * 3. **Fora da fila offline.** Um evento reenviado três dias depois, fora de contexto, é ruído — e
 *    o import de PDF já é online-only. Perder o evento sem rede é o comportamento certo.
 */
export async function reportHealthEvent(
  wardId: string | null | undefined,
  eventType: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  if (!wardId) return;
  try {
    const { error } = await supabase.from('app_health_events').insert({
      ward_id: wardId,
      event_type: eventType,
      details: sanitizeHealthDetails(details),
      app_version: Constants.expoConfig?.version ?? null,
      platform: Platform.OS,
    });
    if (error) console.warn('Health event not recorded:', error.message);
  } catch (err) {
    console.warn('Health event not recorded:', err);
  }
}

/** O que o import de PDF terminou entregando, na forma que o diagnóstico entende. */
export interface PdfImportOutcome {
  usedGrid: boolean;
  fallbackReason: LcrFallbackReason | null;
  records: number;
  expectedCount: number | null;
  pages: number;
}

/**
 * Registra o que o import de PDF teve de digno de atenção — nada, se correu bem (AC6, AC8, AC9).
 *
 * Dois eventos possíveis, e eles são independentes: a grade pode ter sido recusada, a contagem pode
 * não bater, e os dois podem acontecer no mesmo import. Separá-los importa porque significam coisas
 * diferentes — "não entendi o desenho deste PDF" não é o mesmo problema que "li menos gente do que
 * o próprio arquivo diz que tem".
 *
 * O motivo do fallback vira três booleanos em vez de uma string. Parece contorcido, e é deliberado:
 * o filtro de privacidade recusa texto de qualquer tamanho, sem exceção nem lista de permitidos. Uma
 * exceção para "strings que eu sei que são seguras" seria a porta pela qual um emissor futuro passa
 * um sobrenome.
 *
 * Sucesso não é registrado (decisão do usuário, 2026-08-17). A consequência: distinguir "um PDF
 * esquisito de uma ala" de "o layout do LCR mudou" depende de contar `ward_id` distintos entre os
 * eventos.
 */
export async function reportPdfImportHealth(
  wardId: string | null | undefined,
  outcome: PdfImportOutcome
): Promise<void> {
  const { usedGrid, fallbackReason, records, expectedCount, pages } = outcome;

  if (!usedGrid) {
    await reportHealthEvent(wardId, 'pdf_import_fallback', {
      pages,
      records,
      reasonNoValidSource: fallbackReason === 'no-valid-source',
      reasonColumns: fallbackReason === 'columns',
      reasonUnexplained: fallbackReason === 'unexplained',
    });
  }

  if (expectedCount != null && expectedCount !== records) {
    await reportHealthEvent(wardId, 'pdf_import_count_mismatch', {
      pages,
      records,
      expected: expectedCount,
      usedGrid,
    });
  }
}
