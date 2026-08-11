# Plan: Nome informal acompanha o primeiro nome
(spec: `specs/person-editor-informal-name-autofill.md`)

## Reuse (extend these, don't recreate)

- `src/components/PersonEditor.tsx` — o único editor de pessoa; nada de componente novo. O bloco de
  inicialização em render (`initKey`, linhas 145-181) é onde AC1 entra, sem efeito novo.
- Padrão de normalização de acentos já usado em `src/lib/topics.ts:21`, `csvUtils.ts:84`,
  `useMembers.ts:30`, `useHymns.ts:26`, `lcrPdfParser.ts:68` — a mesma expressão (`NFD` +
  `[̀-ͯ]`). O helper novo segue essa forma em vez de inventar outra.
- `src/__tests__/person-editor.test.tsx` — 18 casos já renderizam o editor com `member` e sem;
  os testes de comportamento entram lá.

## Steps (1 step = 1 commit)

1. **`feat(lib): getFirstName + isSameName`**
   Novo `src/lib/nameUtils.ts` (casa canônica para lógica pura de nome), com:
   - `getFirstName(fullName: string): string` — primeiro token de `trim()`; `''` para entrada vazia.
   - `isSameName(a: string, b: string): boolean` — compara com `trim`, minúsculas e acentos
     removidos; duas strings vazias contam como iguais? **Não** — vazio nunca "é igual" a nada,
     para não confundir AC2 (vazio) com AC3 (coincide).
   — covers: AC5, e a base de AC1-AC4
   — tests: novo `src/__tests__/name-utils.test.ts` — primeiro nome de "João", "João Silva",
   "  João   Silva  ", "" e "   "; igualdade "João"/"joao"/"JOÃO"/" joão "; desigualdade
   "João"/"Joãozinho"; vazio não casa com vazio nem com nome.

2. **`feat(person-editor): o nome informal segue o primeiro nome`**
   Em `PersonEditor.tsx`:
   - No bloco de init, ramo de criação: `setInformalName(getFirstName(initialName ?? ''))` (AC1);
     ramo de edição permanece `member.informal_name ?? ''` (AC7).
   - Novo estado `lastFullName`, semeado no init com o nome que foi carregado (`member.full_name`
     ou `initialName ?? ''`), que é a referência de "primeiro nome anterior".
   - `onBlur` no `TextInput` do nome completo: se o nome tiver conteúdo, e o informal estiver vazio
     OU `isSameName(informal, getFirstName(lastFullName))`, então `setInformalName(getFirstName(
     fullName))`. Em seguida `setLastFullName(fullName)` — sempre, para que a próxima comparação
     use a referência certa. Se o nome estiver em branco, não mexe em nada (AC6).
   — covers: AC1, AC2, AC3, AC4, AC6, AC7, AC8
   — tests: em `person-editor.test.tsx` — abrir criando com `initialName` preenche o informal;
   digitar nome + blur com informal vazio preenche; trocar o nome e dar blur atualiza um informal
   que casava (inclusive "joao" → "Pedro"); um informal personalizado sobrevive ao blur; nome
   apagado + blur não limpa o informal; abrir editando não altera o informal gravado; e o
   encadeamento criar→corrigir→corrigir mantém o informal seguindo.

## AC → coverage matrix

| AC  | Step(s) | Test(s) |
|-----|---------|---------|
| AC1 | 2       | person-editor: abre criando com `initialName` |
| AC2 | 2       | person-editor: blur com informal vazio |
| AC3 | 2       | person-editor: blur trocando o primeiro nome (criando E editando) |
| AC4 | 2       | person-editor: informal personalizado sobrevive |
| AC5 | 1, 2    | name-utils: acentos/caixa · person-editor: "joao" → "Pedro" |
| AC6 | 2       | person-editor: nome em branco não limpa o informal |
| AC7 | 2       | person-editor: abre editando, informal gravado intocado |
| AC8 | 2       | person-editor: digitar no informal e depois editar o nome |

## Risks / deploys

- **Nenhum deploy, nenhuma migração.** Cliente apenas.
- **Risco 1 — o init roda em render, não em efeito** (padrão documentado no próprio arquivo). Semear
  `lastFullName` no lugar errado causa loop de render. Deve entrar no mesmo bloco guardado por
  `initKey`.
- **Risco 2 — `onBlur` no React Native dispara também ao fechar o modal**, o que pode alterar o
  informal no caminho de saída. Os testes cobrem blur explícito; vale conferir que o valor só muda
  quando o nome realmente mudou.
- **Risco 3 — regressão silenciosa em `useCreateMember`.** Ele já preenche o informal ao salvar; se
  o editor passar a mandar sempre um valor, aquele fallback deixa de ser exercitado. Não é defeito,
  mas o teste existente que dependia dele não pode virar vacuoso.
- **Fora do escopo, registrado:** `split(' ')[0]` está duplicado em 4 lugares
  (`members.tsx:238`, `useApplyMemberImport.ts:51`, `useMembers.ts:130`, `csvUtils.ts:207`). Depois
  deste passo existirá um helper canônico; adotá-lo nos quatro é uma limpeza separada, não esta.

## Rollback

Dois commits independentes. `git revert` do passo 2 devolve o editor ao comportamento atual e
deixa o helper órfão mas inofensivo; revertendo os dois, nada resta.
