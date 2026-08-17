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
import { applyMatrix, type LcrRawPage, type LcrSegment } from './lcrPdfPage';

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
