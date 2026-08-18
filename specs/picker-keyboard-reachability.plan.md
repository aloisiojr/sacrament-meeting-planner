# Plan: Últimos itens alcançáveis com o teclado aberto
(spec: `specs/picker-keyboard-reachability.md`)

## Reuse (extend these, don't recreate)

- `src/components/KeyboardAvoider.tsx` — o componente já existe e este é exatamente o caso em que
  ele funciona (lista que transborda). Nada a criar.
- `src/components/TopicSelectorModal.tsx:236` — o modelo. A mudança no seletor de pessoas é a mesma
  linha, com o mesmo componente.
- `src/__tests__/people-picker.test.tsx` e `topic-selector-modal.test.tsx` — já montam os dois
  modais com os mocks necessários; as asserções novas entram neles, sem novo arquivo nem novo setup.
- `src/__tests__/keyboard-safe-forms.test.tsx` — o padrão (e a justificativa escrita) para afirmar
  a presença do container quando o teclado não é observável.

## Steps (1 step = 1 commit)

1. **`fix(people-picker): a lista encolhe quando o teclado abre`**
   Envolver o `FlatList` de `PeoplePicker` num `KeyboardAvoider`, como o seletor de temas faz.
   — covers: AC1, AC4
   — tests: em `people-picker.test.tsx`, a lista está dentro do avoider (aninhamento por testID);
   a suíte existente do componente continua verde, provando que envolver não quebrou nada.

2. **`feat(pickers): arrastar a lista fecha o teclado`** — ⚠️ **REVERTIDO** (usuário testou a ideia
   e não gostou, 2026-08-18). O `keyboardDismissMode` saiu dos dois componentes. Ficou o teste de
   que um toque numa linha seleciona com o teclado aberto, que não existia antes.
   — covers: AC2, AC3

## AC → coverage matrix

| AC | Step | Test |
|----|------|------|
| AC1 | 1 | aninhamento no `people-picker.test.tsx` + **conferência no aparelho** (ver Riscos) |
| AC2 | 2 | suíte do `topic-selector-modal` verde + o toque continua selecionando |
| AC3 | 2 | tocar numa linha seleciona, nos dois seletores |
| AC4 | 1 | as duas telas passam a usar o mesmo mecanismo |

## Risks / deploys

- **O AC1 não é observável em CI.** Não há teclado virtual no jest; o teste prende a presença e o
  encaixe do container, o que pega remoção acidental mas não prova que o último item ficou visível.
  Conferir no aparelho, em iOS **e** Android — os mecanismos são distintos.
- **Envolver o `FlatList` mexe no layout.** O `KeyboardAvoider` usa `flex: 1`; se algum ancestral do
  `PeoplePicker` não propagar altura, a lista pode colapsar. É o risco real deste passo, e aparece
  imediatamente na tela — não em silêncio.
- Sem migração, sem deploy, sem i18n, sem permissão.

## Rollback

Dois commits independentes; reverter qualquer um devolve a tela ao estado atual. Nada persiste.
