/**
 * Roda o pipeline REAL de import sobre cada PDF de uma pasta e reporta o que mudou.
 *
 *   node scripts/check-lcr-pdfs.mjs [pasta]      # padrão: raiz do repositório
 *
 * Por que isto existe e não é um teste: uma fixture de página real carregaria nome, telefone e
 * e-mail de membros, e esses dados não entram no repositório. Os testes usam geometria sintética;
 * a conferência contra os arquivos de verdade acontece aqui, na máquina. É a verificação de AC15
 * (contagem declarada), AC16 (nome sem resíduo de outra coluna) e AC17 (registros partidos entre
 * páginas) de `specs/pdf-import-table-grid.md`.
 *
 * Também é como se confere um PDF NOVO: a grade é lida do desenho de cada arquivo, e uma ala nova
 * pode ter um layout que nunca vimos. Se a grade não se aplicar, o script diz — e o app cai no
 * algoritmo antigo, que é o comportamento anterior a esta mudança.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { rawPages, loadLib } from './lcr-raw.mjs';

const dir = process.argv[2] ?? '.';

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (!files.length) {
  console.log(`nenhum PDF em ${dir}`);
  process.exit(0);
}

const lib = await loadLib(['lcrPdfLayout', 'lcrPdfParser', 'lcrPdfGrid', 'lcrPdfPage']);
const { readLcrPages, buildLcrText, parseLcrText, chooseBoundaries, bandsOf, countAnchors } = lib;

/** Resíduo de outra coluna dentro de um nome: e-mail, fragmento de TLD ou gênero solto. */
const CONTAMINADO = /@|\.com|\bcom\b|\bCOM\b|\som$|\sm$|\bbr\b/i;

let problemas = 0;

for (const f of files) {
  const pages = await rawPages(join(dir, f));

  // Caminho novo (grade) e caminho antigo (texto achatado), lado a lado.
  const agora = readLcrPages(pages);
  const antes = parseLcrText(buildLcrText(pages));

  // Quantos registros ficam FORA da grade — são os partidos entre páginas, que a fusão recupera.
  const choice = chooseBoundaries(pages);
  const partidos = pages.reduce((n, p, i) => {
    const b = bandsOf(p, choice.perPage[i]);
    return n + countAnchors(b.below);
  }, 0);

  const bate = agora.expectedCount == null || agora.records.length === agora.expectedCount;
  const sujos = agora.records.filter((r) => CONTAMINADO.test(r.name));
  const sujosAntes = antes.records.filter((r) => CONTAMINADO.test(r.name));
  if (!bate || sujos.length) problemas += 1;

  console.log(
    `\n${f}\n  fonte: ${agora.usedGrid ? 'grade desenhada' : 'limiar de gap (FALLBACK)'}` +
      `  |  registros ${agora.records.length}` +
      (agora.expectedCount == null
        ? ' (PDF não declara total)'
        : `/${agora.expectedCount} ${bate ? 'OK' : '✗ NÃO BATE'}`) +
      `  |  partidos entre páginas: ${partidos}` +
      `  |  sem telefone ${agora.records.filter((r) => !r.rawPhone).length}` +
      ` (antes ${antes.records.filter((r) => !r.rawPhone).length})`
  );
  console.log(
    `  nomes com resíduo de outra coluna: ${sujos.length} (antes ${sujosAntes.length})` +
      (sujos.length ? '  ✗' : '')
  );
  for (const r of sujos) console.log(`    ✗ ${JSON.stringify(r.name)}`);

  // Diff por registro, para uma diferença aparecer como nome ou telefone mudando de dono.
  const chave = (r) => `${r.name} | ${r.rawPhone ?? 'sem telefone'} | ${r.age}`;
  const antigos = new Set(antes.records.map(chave));
  const novos = agora.records.map(chave).filter((k) => !antigos.has(k));
  const sumiram = [...antigos].filter((k) => !new Set(agora.records.map(chave)).has(k));
  if (novos.length) {
    console.log(`  ${novos.length} registro(s) mudam em relação ao caminho antigo — confira se melhoraram:`);
    for (let i = 0; i < Math.max(novos.length, sumiram.length) && i < 12; i++) {
      if (sumiram[i]) console.log(`    - ${sumiram[i]}`);
      if (novos[i]) console.log(`    + ${novos[i]}`);
    }
    if (Math.max(novos.length, sumiram.length) > 12) {
      console.log(`    … e mais ${Math.max(novos.length, sumiram.length) - 12}. Nada foi omitido do total acima.`);
    }
  }
}

console.log(
  problemas ? `\n✗ ${problemas} arquivo(s) com problema` : '\n✔ todos os arquivos batem a contagem, sem resíduo em nomes'
);
