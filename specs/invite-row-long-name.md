# Nome longo empurra o aviso "(Falta Tema)" para fora da linha do convite

## Problem / intent

Em Gerenciamento de Convites, um nome longo faz o aviso `(Falta Tema)` sair pela borda direita e
passar por baixo do botão de ação. O aviso fica ilegível e o botão, visualmente sujo.

O defeito é antigo e não veio da mudança de import; ele só ficou visível agora porque a correção do
PDF passou a produzir nomes longos **corretos**, onde antes vinha um nome truncado errado.

## In scope / Out of scope

- **In:** a linha de convite em `src/components/InviteManagementSection.tsx` — nome e aviso repartem
  a largura disponível sem invadir o botão.
- **Out:** mudar o texto do aviso, encurtar o nome exibido, ou alterar o botão.
- **Out:** as demais telas que mostram o mesmo nome. O card de Designações já trunca corretamente —
  conferido na mesma tela do relato.

## Baseline (evidence)

- `InviteManagementSection.tsx:424` — `speakerNameRow` é uma `row` com dois filhos: o nome
  (`numberOfLines={1}`) e o aviso `(Falta Tema)`.
- **No React Native `flexShrink` é 0 por padrão**, ao contrário da web. Nenhum dos dois filhos cede
  espaço, então a soma das larguras intrínsecas transborda o `details` (`flex: 1`) e invade o botão
  de 36pt.
- O projeto já resolve isso assim em dois lugares: `DesignationReadModal.tsx:156` e
  `SacramentPrayerModal.tsx:152` usam `flexShrink: 1` no texto que pode ser longo.
- O card "Designações dos Próximos Domingos", na mesma tela, trunca o mesmo nome corretamente —
  então o problema é desta linha, não do nome nem do tema.

## Acceptance criteria (EARS)

- AC1: WHEN o nome do discursante é longo demais para a linha, the system SHALL truncá-lo, e SHALL
  manter o aviso `(Falta Tema)` inteiro e visível.
- AC2: WHILE o aviso está presente, the system SHALL manter nome e aviso dentro da área de texto,
  sem sobrepor nem deslocar o botão de ação.
- AC3: WHEN não há aviso a mostrar, the system SHALL usar toda a largura disponível para o nome.

## Open questions

Nenhuma.

## Notes

**Por que truncar o nome e não o aviso.** O aviso é curto, fixo e é a informação acionável — é ele
que diz por que o convite não pode ser enviado. O nome é longo, variável e continua identificável
truncado; e é assim que o card logo acima, na mesma tela, já se comporta.

**Limite do teste.** O jest não faz layout: larguras, truncamento e sobreposição não são
observáveis. O que dá para prender é que os estilos que repartem o espaço estão aplicados nos dois
textos — o suficiente para pegar remoção acidental, não para provar que ficou bonito. Isso é
conferência no aparelho, como em `specs/picker-keyboard-reachability.md`.

**Sem i18n, sem permissão, sem migração, sem deploy.** Um arquivo.
