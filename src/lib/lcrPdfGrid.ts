/**
 * Fronteiras de registro e de coluna lidas do DESENHO da página (`specs/pdf-import-table-grid.md`).
 *
 * A ideia que organiza este módulo é do usuário e vale escrever por extenso: uma tabela em que cada
 * célula pode ocupar mais de uma linha **precisa** de algum separador visual, senão fica ilegível
 * para uma pessoa. Então em vez de inferir estatisticamente onde um registro termina — que foi o
 * que errou três vezes — procura-se a evidência que o gerador desenhou. E o corolário é igualmente
 * útil: se não houver separador nenhum, cada linha da tabela cabe numa linha de texto, e aí o
 * limiar de gap está certo por construção. "Não achei" não é falha, é um caso com resposta conhecida.
 *
 * Nada aqui reconhece cor, espessura ou comprimento absoluto. Um traço vira fronteira quando o
 * CONJUNTO de traços naquela altura atravessa a tabela — que é como as bordas de célula do LCR
 * funcionam: seis pedaços de 48 a 148pt que só juntos cobrem a largura toda.
 */
import { applyMatrix, joinTextRun, type LcrRawPage, type LcrSegment, type LcrTextItem } from './lcrPdfPage';
import { countAnchors } from './lcrPdfParser';
import { rowGapThreshold } from './lcrPdfLayout';

/** Duas alturas a menos disto são a mesma fronteira (ruído de arredondamento). */
const Y_TOLERANCE = 1;
/** Dois X a menos disto são a mesma coluna — a página 1 dos PDFs reais tem 34,3 e 35,1. */
const X_TOLERANCE = 2;
/** Fração da largura ocupada por texto que uma fronteira precisa cobrir. */
const MIN_COVERAGE = 0.7;
/** Acima disto um segmento é vertical e não delimita linha. */
const FLATNESS = 0.6;

/** Faixa horizontal ocupada por texto na página; a base do critério relativo de cobertura. */
export function textExtent(page: LcrRawPage): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const o of page.items) {
    if (!o.s.trim()) continue;
    min = Math.min(min, o.x);
    max = Math.max(max, o.x + o.w);
  }
  return min <= max ? { min, max } : null;
}

/** Comprimento coberto por um conjunto de intervalos, contando sobreposição uma vez só. */
function coveredLength(intervals: [number, number][]): number {
  if (!intervals.length) return 0;
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [start, end] = sorted[0];
  for (const [a, b] of sorted.slice(1)) {
    if (a > end) {
      total += end - start;
      [start, end] = [a, b];
    } else if (b > end) {
      end = b;
    }
  }
  return total + (end - start);
}

/** Agrupa valores próximos e devolve o primeiro de cada grupo, em ordem crescente. */
export function columnStarts(values: readonly number[], tolerance = X_TOLERANCE): number[] {
  const sorted = values.slice().sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (!out.length || v - out[out.length - 1] > tolerance) out.push(v);
  }
  return out;
}

/** Um segmento levado ao espaço do texto pelo CTM que veio com ele. */
function inTextSpace(s: LcrSegment): { x1: number; y1: number; x2: number; y2: number } {
  const [x1, y1] = applyMatrix(s.m, s.x1, s.y1);
  const [x2, y2] = applyMatrix(s.m, s.x2, s.y2);
  return { x1, y1, x2, y2 };
}

/** Agrupa alturas próximas e devolve uma fronteira por grupo, do topo para baixo. */
function mergeYs(entries: { y: number; span: [number, number] }[], width: number): number[] {
  const sorted = entries.slice().sort((a, b) => b.y - a.y);
  const out: number[] = [];
  let group: typeof sorted = [];
  const flush = () => {
    if (!group.length) return;
    if (coveredLength(group.map((g) => g.span)) >= width * MIN_COVERAGE) out.push(group[0].y);
    group = [];
  };
  for (const e of sorted) {
    if (group.length && Math.abs(group[group.length - 1].y - e.y) > Y_TOLERANCE) flush();
    group.push(e);
  }
  flush();
  return out;
}

/**
 * Fronteiras vindas de traços desenhados, do topo para baixo.
 *
 * Traços quase horizontais são agrupados por altura; o grupo vira fronteira quando a união dos seus
 * intervalos cobre a maior parte do texto da página. É a união que importa: uma borda de célula
 * sozinha cobre um quinto da tabela e seria descartada por qualquer critério individual.
 */
export function ruleBoundaries(page: LcrRawPage): number[] {
  const extent = textExtent(page);
  if (!extent) return [];
  const entries: { y: number; span: [number, number] }[] = [];
  for (const s of page.segments) {
    const t = inTextSpace(s);
    if (Math.abs(t.y1 - t.y2) > FLATNESS) continue;
    entries.push({ y: t.y1, span: [Math.min(t.x1, t.x2), Math.max(t.x1, t.x2)] });
  }
  return mergeYs(entries, extent.max - extent.min);
}

/**
 * Fronteiras vindas de faixas de fundo: as duas arestas de cada retângulo largo o bastante.
 *
 * As duas arestas, e não só uma, porque o LCR pinta linhas ALTERNADAS — a aresta de baixo de uma
 * faixa cinza e a de cima da seguinte delimitam a linha branca entre elas. Sem isso, metade dos
 * registros ficaria sem fronteira. A cor não é lida: nada garante o mesmo cinza noutro PDF.
 */
export function fillBoundaries(page: LcrRawPage): number[] {
  const extent = textExtent(page);
  if (!extent) return [];
  const width = extent.max - extent.min;
  const entries: { y: number; span: [number, number] }[] = [];
  for (const r of page.rects) {
    const [x1, y1] = applyMatrix(r.m, r.x, r.y);
    const [x2, y2] = applyMatrix(r.m, r.x + r.w, r.y + r.h);
    const span: [number, number] = [Math.min(x1, x2), Math.max(x1, x2)];
    if (span[1] - span[0] < width * MIN_COVERAGE) continue;
    entries.push({ y: y1, span }, { y: y2, span });
  }
  return mergeYs(entries, width);
}

/** Uma faixa entre duas fronteiras, com o texto que caiu dentro dela. */
export interface LcrBand {
  top: number;
  bottom: number;
  items: LcrTextItem[];
  text: string;
}

/** As faixas de uma página mais o texto que ficou fora da grade, em cima e embaixo. */
export interface LcrBands extends Array<LcrBand> {
  above: string;
  below: string;
}

/**
 * Parte as linhas de texto da página nas fronteiras dadas (topo → base).
 *
 * O que sobra fora da grade vem separado, e não descartado: é ali que mora metade de um registro
 * partido entre páginas, e jogar fora custaria os 39 que o algoritmo antigo acerta.
 */
export function bandsOf(page: LcrRawPage, boundaries: readonly number[]): LcrBands {
  const ys = boundaries.slice().sort((a, b) => b - a);
  const bands = [] as unknown as LcrBands;
  const inRange = (o: LcrTextItem, top: number, bottom: number) => o.y < top - 0.5 && o.y > bottom - 0.5;

  for (let i = 0; i < ys.length - 1; i++) {
    const items = page.items.filter((o) => inRange(o, ys[i], ys[i + 1]));
    bands.push({ top: ys[i], bottom: ys[i + 1], items, text: joinTextRun(items) });
  }
  const first = ys.length ? ys[0] : Infinity;
  const last = ys.length ? ys[ys.length - 1] : -Infinity;
  bands.above = joinTextRun(page.items.filter((o) => o.y >= first - 0.5));
  bands.below = joinTextRun(page.items.filter((o) => o.y <= last - 0.5));
  return bands;
}

/** Quão bem um particionamento explica o dado. */
export interface LcrPartitionScore {
  exactlyOne: number;
  twoOrMore: number;
  empty: number;
  /** Nenhuma banda com dois registros. É condição de uso, não preferência. */
  valid: boolean;
}

/**
 * Julga um particionamento contando registros por banda (AC5, AC6).
 *
 * Banda vazia não é erro — o cabeçalho de coluna ocupa uma. Banda com dois registros é veto, mesmo
 * que todo o resto esteja certo: fundir dois membros faz um deles sumir sem aviso, e é o único erro
 * que a tela de revisão não consegue mostrar, porque o registro simplesmente não chega lá.
 */
export function scorePartition(bands: readonly LcrBand[]): LcrPartitionScore {
  let exactlyOne = 0;
  let twoOrMore = 0;
  let empty = 0;
  for (const b of bands) {
    const n = countAnchors(b.text);
    if (n === 1) exactlyOne += 1;
    else if (n === 0) empty += 1;
    else twoOrMore += 1;
  }
  return { exactlyOne, twoOrMore, empty, valid: twoOrMore === 0 && exactlyOne > 0 };
}

/** De onde vieram as fronteiras escolhidas. `gap` é o algoritmo anterior à grade. */
export type LcrBoundarySource = 'rules' | 'fills' | 'gap';

export interface LcrChoice {
  source: LcrBoundarySource;
  /** Fronteiras por página, na ordem das páginas. Vazio quando a fonte é `gap`. */
  perPage: number[][];
}

/** Fronteiras derivadas do limiar de gap — a mesma regra de sempre, expressa como fronteira. */
function gapBoundaries(pages: readonly LcrRawPage[]): number[][] {
  const freq = new Map<number, number>();
  const perPageYs = pages.map((p) => {
    const ys = Array.from(new Set(p.items.map((o) => Math.round(o.y)))).sort((a, b) => b - a);
    for (let k = 1; k < ys.length; k++) {
      const gap = Math.round(Math.abs(ys[k - 1] - ys[k]));
      if (gap > 0) freq.set(gap, (freq.get(gap) || 0) + 1);
    }
    return ys;
  });
  const threshold = rowGapThreshold(freq);
  return perPageYs.map((ys) => {
    const cuts: number[] = ys.length ? [ys[0] + 1] : [];
    for (let k = 1; k < ys.length; k++) {
      if (Math.abs(ys[k - 1] - ys[k]) >= threshold) cuts.push((ys[k - 1] + ys[k]) / 2);
    }
    if (ys.length) cuts.push(ys[ys.length - 1] - 1);
    return cuts;
  });
}

/**
 * Escolhe, PARA O DOCUMENTO INTEIRO, de onde vêm as fronteiras (AC7, AC8).
 *
 * Por documento e não por página porque uma página atípica é comum e inofensiva — a última costuma
 * ter uma linha só, a primeira carrega título — enquanto alternar de critério no meio do arquivo
 * tornaria o resultado difícil de explicar quando desse errado.
 *
 * `gap` fecha a lista: se nenhum desenho serve, a tabela ou não tem separador — e então cada linha
 * cabe numa linha de texto, que é justamente o caso que o limiar resolve — ou tem um que não
 * reconhecemos, e aí o comportamento de hoje é o melhor conhecido.
 */
export function chooseBoundaries(pages: readonly LcrRawPage[]): LcrChoice {
  const candidates: { source: LcrBoundarySource; perPage: number[][] }[] = [
    { source: 'rules', perPage: pages.map(ruleBoundaries) },
    { source: 'fills', perPage: pages.map(fillBoundaries) },
  ];
  let best: { choice: LcrChoice; exactlyOne: number } | null = null;
  for (const c of candidates) {
    let exactlyOne = 0;
    let valid = true;
    for (let i = 0; i < pages.length; i++) {
      const score = scorePartition(bandsOf(pages[i], c.perPage[i]));
      if (score.twoOrMore > 0) valid = false;
      exactlyOne += score.exactlyOne;
    }
    if (!valid || !exactlyOne) continue;
    if (!best || exactlyOne > best.exactlyOne) best = { choice: c, exactlyOne };
  }
  return best ? best.choice : { source: 'gap', perPage: gapBoundaries(pages) };
}

/** Rodapé, título, cabeçalho de coluna e linha de contagem — tudo que não é registro. */
const CHROME =
  /intellectual reserve|church use|uso da igreja|uso exclusivo|^\s*(count|contagem|recuento|conteo)\s*:/i;

/**
 * Remove o cromo da página de um trecho solto, preservando o resto.
 *
 * O órfão de uma quebra de página vem grudado no rodapé, então limpar antes de parear não é
 * higiene: sem isso o par nunca casa.
 */
function stripChrome(text: string): string {
  if (!text) return '';
  const semRodape = text.replace(/\d{1,2}\s+\S+\s+\d{4}\s+(For Church Use|Somente para Uso|Para uso)[^]*$/i, '');
  return semRodape
    .split(/\s{2,}|\n/)
    .filter((part) => part.trim() && !CHROME.test(part))
    .join(' ')
    .replace(/©[^]*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Uma página já particionada: o texto de cada banda e o que sobrou fora da grade. */
export interface LcrPageBands {
  bands: string[];
  above: string;
  below: string;
}

/**
 * Junta as bandas de todas as páginas numa lista de registros, fundindo os partidos na virada.
 *
 * A forma da quebra, medida em 39 ocorrências nos 8 PDFs sem uma exceção: os DADOS ficam órfãos
 * abaixo da última fronteira da página N e o NOME abre a primeira banda da página N+1. Os dois
 * pedaços são complementares, e a fusão é a concatenação deles.
 *
 * O pareamento é por FORMA, não por posição: exige âncora no órfão e ausência de âncora na banda
 * seguinte. Se um PDF novo quebrar de outro jeito as formas não casam, nada funde, e o documento
 * segue para o fallback — que é bem melhor do que fundir errado em silêncio.
 */
export function mergePageBreaks(pages: readonly LcrPageBands[]): string[] {
  const out: string[] = [];
  const consumed = new Set<number>();

  pages.forEach((page, i) => {
    const orphan = stripChrome(page.below);
    const next = pages[i + 1];
    const canMerge =
      !!orphan &&
      countAnchors(orphan) === 1 &&
      !!next &&
      next.bands.length > 0 &&
      countAnchors(next.bands[0]) === 0 &&
      next.bands[0].trim().length > 0;

    page.bands.forEach((text, k) => {
      const skip = i > 0 && k === 0 && consumed.has(i);
      if (skip || !text.trim()) return;
      out.push(text);
    });

    if (canMerge) {
      consumed.add(i + 1);
      out.push(`${next.bands[0]} ${orphan}`.replace(/\s+/g, ' ').trim());
    }
  });
  return out;
}
