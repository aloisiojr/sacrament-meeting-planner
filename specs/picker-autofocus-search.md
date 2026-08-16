# O seletor de pessoas abre com a busca ativa

## Problem / intent

Ao abrir o seletor de pessoas, o campo de busca não recebe foco e o teclado não abre — é preciso um
toque extra antes de começar a digitar. O seletor de temas já se comporta como desejado; só o de
pessoas está fora do padrão.

## In scope / Out of scope

- **In:** `src/components/PeoplePicker.tsx` — o `SearchInput` passa a receber foco quando o seletor
  abre.
- **Out:** `src/components/TopicSelectorModal.tsx` — já tem `autoFocus` na busca (`:200`); nada a
  fazer.
- **Out:** `HymnSelector` e as buscas das telas de configurações; o pedido é sobre pessoas e temas.
- **Out:** mudar layout, ordenação ou filtro do seletor.

## Baseline (evidence)

- `src/components/PeoplePicker.tsx:413-420` — `<SearchInput testID="people-picker-search" …>` **sem**
  `autoFocus`.
- `src/components/TopicSelectorModal.tsx:195-200` — `<SearchInput … autoFocus />`. É o padrão a
  seguir.
- Ambos vivem dentro de um `Modal`; o seletor é montado com `visible` controlado pelo pai.

## Acceptance criteria (EARS)

- AC1: WHEN o seletor de pessoas é aberto, the system SHALL colocar o foco no campo de busca.
- AC2: WHEN o seletor de pessoas é aberto, the system SHALL abrir o teclado virtual.
- AC3: WHEN o seletor é fechado e reaberto, the system SHALL focar a busca novamente.
- AC4: WHEN o seletor abre, the system SHALL manter a busca vazia e a lista completa, como hoje.
- AC5: WHERE o usuário não tem permissão de seleção, the system SHALL continuar se comportando como
  hoje quanto ao restante da tela.

## Open questions

Nenhuma.

## Notes

**Cuidado conhecido:** `autoFocus` dentro de `Modal` no Android é historicamente instável — o foco
pode ser perdido na animação de abertura. Se o `autoFocus` simples não bastar, a alternativa é um
`ref` com `focus()` disparado quando `visible` vira verdadeiro. O plano deve verificar qual das duas
funciona, não assumir.

**Interação com o outro spec em andamento:** `specs/picker-select-new-person.md` mexe no mesmo
componente. Construir um de cada vez para não confundir a origem de eventual regressão.

**Sem migração, sem deploy.**
