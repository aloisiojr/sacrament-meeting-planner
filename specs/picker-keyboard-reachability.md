# Os últimos itens da lista somem atrás do teclado no seletor de pessoas

## Problem / intent

No seletor de pessoas, com o teclado aberto, rolar a lista até o fim não mostra os últimos itens: a
lista corre por trás do teclado. No seletor de temas, a mesma ação funciona. São dois modais com a
mesma forma — busca no topo, lista embaixo — e o usuário percebeu a diferença entre eles.

A correção é igualar as duas telas: a lista encolhe quando o teclado abre, e todo item continua
alcançável rolando.

## In scope / Out of scope

- **In:** `src/components/PeoplePicker.tsx` — a lista passa a encolher quando o teclado abre.
- **Out:** `HymnSelector`. Ele não tem campo de busca — o teclado nunca aparece ali, então o defeito
  não existe. Verificado, não suposto.
- **Out:** qualquer mudança de layout, ordenação ou conteúdo das listas.
- **Out:** as telas de formulário já cobertas por `specs/keyboard-safe-form-fields.md`.

## Baseline (evidence)

- `TopicSelectorModal.tsx:236` envolve o `FlatList` num `KeyboardAvoider`; `PeoplePicker.tsx:485`
  não. É a única diferença estrutural relevante entre os dois modais.
- `KeyboardAvoider` encolhe a área rolável pela altura do teclado, deixando todo item alcançável por
  rolagem. O docblock do componente registra que esse é justamente o caso em que ele funciona
  ("Long / overflowing form → this is enough; the user scrolls") — diferente de um formulário curto
  alinhado ao topo, onde ele não faz nada.
- O `PeoplePicker` foca a busca ao abrir (`PeoplePicker.tsx:427`, "Opens ready to type"), então o
  teclado sobe junto com o modal. É por isso que ele "nunca some".
- Os dois já usam `keyboardShouldPersistTaps="handled"`, que é o que permite tocar num item com o
  teclado aberto sem que o primeiro toque seja consumido para fechá-lo.
- `HymnSelector` tem `FlatList` e nenhum `TextInput` — conferido.

## Acceptance criteria (EARS)

- AC1: WHILE o teclado está aberto no seletor de pessoas, WHEN o usuário rola a lista até o fim,
  the system SHALL manter o último item alcançável.
- AC2: WHILE o teclado está aberto no seletor de temas, the system SHALL continuar se comportando
  como hoje — este é o caso que já funciona e não pode regredir.
- AC3: WHILE o teclado está aberto, WHEN o usuário toca num item da lista, the system SHALL
  selecionar esse item, e SHALL NOT gastar o toque apenas fechando o teclado.
- AC4: The system SHALL usar o mesmo mecanismo nos dois seletores, de modo que a diferença relatada
  deixe de existir em vez de trocar de lado.

## Open questions

Nenhuma.

## Notes

**Reversão (2026-08-18): o teclado NÃO fecha ao arrastar.** A primeira versão deste spec, aprovada
com essa opção, incluía um AC para fechar o teclado ao rolar a lista, nos dois seletores. O usuário
testou a ideia e não gostou; o AC foi removido e o `keyboardDismissMode` saiu dos dois componentes.
O que ficou é apenas o que resolve a queixa original: a lista encolhe.

Ficou de pé o que aquele passo trouxe de útil por tabela — o teste de que um toque numa linha
seleciona com o teclado aberto (AC3), que antes não existia em nenhum dos dois seletores.

**O que os testes conseguem provar aqui, e o que não conseguem.** O jest não tem teclado virtual,
então "o último item ficou visível" (AC1) não é observável em CI — é conferência no aparelho, como
já registrado em `specs/keyboard-safe-form-fields.md`. O que dá para prender é a presença e o
encaixe do container, e o AC3, que é comportamento de verdade: tocar numa linha seleciona a pessoa.
`src/__tests__/keyboard-safe-forms.test.tsx` já estabelece esse padrão e o justifica.

**Sem i18n, sem permissão, sem migração, sem deploy.** Cliente apenas, dois arquivos.
