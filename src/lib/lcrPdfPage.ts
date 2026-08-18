/**
 * Dados BRUTOS de uma página de PDF, como a WebView os entrega, e a montagem do texto a partir
 * deles (`specs/pdf-import-table-grid.md`, passo 1 do plano).
 *
 * Por que a WebView devolve dados crus em vez de texto pronto: qualquer lógica que viva lá dentro
 * precisa ser injetada como STRING literal — `${minhaFuncao}` funciona em desenvolvimento e morre
 * em build de produção, porque a minificação deixa a função anônima (SyntaxError ao injetar) e o
 * Hermes não guarda o fonte das funções. Nada disso roda no jest, então cada linha lá dentro é
 * código não testado que só falha no aparelho. Mantendo a bridge fina, tudo isto aqui é TS normal,
 * testável, e a duplicação literal que existia (`ROW_GAP_THRESHOLD_JS`) deixa de ser necessária.
 *
 * Os segmentos e retângulos vêm junto desde já, embora só a grade (passos 2+) os use: mudar o
 * contrato da WebView duas vezes custaria dois testes de aparelho em vez de um.
 */
import { rowGapThreshold } from './lcrPdfLayout';
import { parseLcrText, type LcrParseResult } from './lcrPdfParser';
import { readGrid, type LcrFallbackReason } from './lcrPdfGrid';

/** Um fragmento de texto com sua posição. O pdf.js quebra por troca de fonte, então acentos vêm à parte. */
export interface LcrTextItem {
  x: number;
  y: number;
  /** Avanço horizontal do fragmento; usado para decidir se o próximo item encosta ou não. */
  w: number;
  /** Tamanho do glifo, base da tolerância de "encosta". */
  size: number;
  s: string;
}

/**
 * Uma matriz afim `[a, b, c, d, e, f]` — o CTM que estava em vigor quando o desenho foi emitido.
 *
 * As coordenadas de um path NÃO vêm no mesmo espaço do texto: elas estão no sistema que o próprio
 * content stream instalou com um operador `cm`. Nos PDFs do LCR esse CTM é `[0.75, 0, 0, -0.75, 0,
 * altura]` — um documento desenhado a 96dpi. Nada disso é constante do formato, então a matriz vem
 * anexada e a conversão acontece aqui, em TS testável, e não dentro da WebView.
 */
export type LcrMatrix = readonly number[];

/** Um traço do desenho da página, nas coordenadas do seu próprio CTM. */
export interface LcrSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  m: LcrMatrix;
}

/** Um retângulo preenchido (faixa de fundo), nas coordenadas do seu próprio CTM. */
export interface LcrRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cor de preenchimento como veio, sem interpretação — a grade não pode depender de um valor. */
  color: string;
  m: LcrMatrix;
}

export interface LcrRawPage {
  width: number;
  height: number;
  items: LcrTextItem[];
  segments: LcrSegment[];
  rects: LcrRect[];
}

/** Leva um ponto do espaço de `m` para o espaço do texto. */
export function applyMatrix(m: LcrMatrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Junta fragmentos num texto: de cima para baixo por Y, da esquerda para a direita por X, com
 * espaço apenas quando existe um vão de verdade.
 *
 * A tolerância é proporcional ao glifo porque o pdf.js emite acentos como itens separados e
 * adjacentes ("Gon" + "ç" + "alves"): um espaço fixo colaria ou separaria errado conforme o corpo
 * da fonte. Empates de X preservam a ordem de emissão.
 */
export function joinTextRun(items: readonly LcrTextItem[]): string {
  const byY = new Map<number, LcrTextItem[]>();
  for (const o of items) {
    const y = Math.round(o.y);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push(o);
  }
  const parts: string[] = [];
  for (const y of Array.from(byY.keys()).sort((a, b) => b - a)) {
    const arr = byY.get(y)!.map((o, i) => ({ o, i }));
    arr.sort((a, b) => a.o.x - b.o.x || a.i - b.i);
    let text = '';
    let prevEnd: number | null = null;
    for (const { o } of arr) {
      if (prevEnd !== null && o.x - prevEnd > o.size * 0.2 && !text.endsWith(' ') && !o.s.startsWith(' ')) {
        text += ' ';
      }
      text += o.s;
      prevEnd = o.x + o.w;
    }
    parts.push(text.trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Linhas visuais de uma página: itens agrupados pelo Y arredondado, de cima para baixo. */
function visualLines(page: LcrRawPage): { ys: number[]; lines: Map<number, LcrTextItem[]> } {
  const lines = new Map<number, LcrTextItem[]>();
  for (const o of page.items) {
    if (typeof o.s !== 'string' || !o.s.trim()) continue;
    const y = Math.round(o.y);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y)!.push(o);
  }
  return { ys: Array.from(lines.keys()).sort((a, b) => b - a), lines };
}

/**
 * Fronteira X entre a coluna do nome e as colunas de dados: um pouco à esquerda da coluna de gênero.
 *
 * A mediana, e não o mínimo: existem fragmentos de uma letra `M`/`F`/`V` na coluna do NOME (nomes
 * partidos por acento), e eles puxariam a fronteira para a margem esquerda.
 */
function nameDataBoundary(pages: readonly LcrRawPage[]): number {
  const genderXs: number[] = [];
  for (const page of pages) {
    for (const o of page.items) {
      if (/^[VMF]$/.test(o.s.trim())) genderXs.push(o.x);
    }
  }
  if (!genderXs.length) return Infinity;
  genderXs.sort((a, b) => a - b);
  return genderXs[Math.floor(genderXs.length / 2)] - 4;
}

/**
 * Monta uma linha de texto por registro — `"<coluna do nome> <colunas de dados>"` — exatamente como
 * a WebView montava, para alimentar o `parseLcrText` sem mudança de comportamento.
 *
 * A frequência de gaps é contada sobre TODAS as páginas: uma página com poucos registros não tem
 * amostra para inferir o limiar sozinha, e a última página costuma ter uma linha só.
 */
export function buildLcrText(pages: readonly LcrRawPage[]): string {
  const boundary = nameDataBoundary(pages);
  const laid = pages.map(visualLines);

  const freq = new Map<number, number>();
  for (const { ys } of laid) {
    for (let k = 1; k < ys.length; k++) {
      const gap = Math.round(Math.abs(ys[k - 1] - ys[k]));
      if (gap > 0) freq.set(gap, (freq.get(gap) || 0) + 1);
    }
  }
  const threshold = rowGapThreshold(freq);

  const out: string[] = [];
  for (const { ys, lines } of laid) {
    let current: number[] = [];
    const flush = () => {
      if (!current.length) return;
      const items = current.flatMap((y) => lines.get(y)!);
      const line = `${joinTextRun(items.filter((o) => o.x < boundary))} ${joinTextRun(
        items.filter((o) => o.x >= boundary)
      )}`
        .replace(/\s+/g, ' ')
        .trim();
      if (line) out.push(line);
      current = [];
    };
    for (let k = 0; k < ys.length; k++) {
      if (k > 0 && Math.abs(ys[k - 1] - ys[k]) >= threshold) flush();
      current.push(ys[k]);
    }
    flush();
  }
  return out.join('\n');
}

export interface LcrPagesResult extends LcrParseResult {
  /** Se a grade desenhada foi usada. Sem isto, um fallback silencioso é indistinguível de sucesso. */
  usedGrid: boolean;
  /** Por que a grade foi recusada; null quando ela foi usada. Alimenta o canal de diagnóstico. */
  fallbackReason: LcrFallbackReason | null;
}

/**
 * Porta única do import: lê os registros de um PDF já extraído, pela grade ou pelo caminho antigo.
 *
 * A ordem não é preferência estética. A grade lê o que o gerador desenhou e se auto-confere; o
 * limiar de gap infere e não tem como saber se acertou. Quando a grade não valida, o caminho antigo
 * é o melhor comportamento conhecido — e é o certo, não só o tolerável, para uma tabela sem
 * separador, onde cada registro cabe numa linha de texto.
 */
export function readLcrPages(pages: readonly LcrRawPage[]): LcrPagesResult {
  // A contagem declarada sai do texto montado nos dois caminhos: ela é uma linha solta fora da
  // tabela, então a grade não a enxerga e não deveria enxergar.
  const flat = parseLcrText(buildLcrText(pages));
  const grid = readGrid(pages);
  return grid.ok
    ? { records: grid.records, expectedCount: flat.expectedCount, usedGrid: true, fallbackReason: null }
    : { ...flat, usedGrid: false, fallbackReason: grid.reason };
}
