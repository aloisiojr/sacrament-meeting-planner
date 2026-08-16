# Plan: Pilha de navegação na raiz
(spec: `specs/root-navigation-stack.md`)

## Reuse (extend these, don't recreate)

- `src/app/(auth)/_layout.tsx` e `src/app/(tabs)/settings/_layout.tsx` — o formato do `<Stack>` a
  copiar (`headerShown: false` + `contentStyle` com a cor do tema). Nada de inventar opções.
- `src/__tests__/helpers/` — já é a casa dos helpers de teste (`edgeFunctionHarness.ts`).
- `expo-router/testing-library` — já instalado; não é dependência nova.

## Steps (1 step = 1 commit)

1. **`test(nav): harness de navegação real + o teste que prova o defeito`**
   - `jest.config.js`: `standard-navigation` entra em `transformIgnorePatterns` (é ESM; sem isso o
     import de `expo-router` quebra o parse).
   - Novo `src/__tests__/helpers/renderApp.tsx`: dá `await` no `renderRouter` e reata os getters,
     com comentário explicando que é contorno do bug upstream (expo-router 57.0.9 não aguarda o
     `render` assíncrono do RNTL v14).
   - Novo `src/__tests__/root-navigation.test.tsx`, com `afterEach(() => jest.useRealTimers())`:
     - **T1** — `push` numa rota irmã e `back` volta ao caminho de origem.
     - **T2** — o estado local da aba (card expandido) sobrevive ao `push`+`back`.
     Ambos com um layout raiz `<Slot />`, espelhando o app de hoje: **devem falhar**.
   — covers: AC10 (e prende AC1-AC4 por equivalência)
   — Este passo é commitado apenas depois do passo 2, para não deixar a suíte vermelha na história.
   Na prática: escrever, VER FALHAR com `Slot`, então seguir para o passo 2 e commitar os dois.

2. **`fix(nav): pilha na raiz — voltar retorna de onde veio`**
   - `src/app/_layout.tsx`: `<Slot />` → `<Stack screenOptions={{ headerShown: false, contentStyle:
     { backgroundColor: colors.background } }} />`, e o teste passa a montar `Stack`.
   — covers: AC1, AC2, AC3, AC4, AC9, AC10
   — tests: T1 e T2 ficam verdes; suíte inteira permanece verde.

## AC → coverage matrix

| AC   | Step | Test |
|------|------|------|
| AC1  | 2    | T2 (estado da aba sobrevive) + conferência manual 1-3 |
| AC2  | 2    | T1/T2 (o caminho de volta é o mesmo, salvando ou não) + manual 2 |
| AC3  | 2    | T1 + manual 4 |
| AC4  | 2    | T1 + manual 5 |
| AC5  | —    | manual 6 — exige o app real montado |
| AC6  | —    | manual 6 |
| AC7  | —    | manual 7 e 8 |
| AC8  | —    | manual — version gate |
| AC9  | 2    | inspeção do `screenOptions` + manual (ausência de cabeçalho) |
| AC10 | 1, 2 | T1 e T2 falham com `Slot`, passam com `Stack` |

## Risks / deploys

- **Nenhum deploy, nenhuma migração.**
- **Risco 1 — o teste pode passar pelo motivo errado.** T1/T2 precisam ser vistos FALHANDO com
  `Slot` antes de a correção entrar. Sem isso, não provam nada.
- **Risco 2 — fake timers vazando.** `renderRouter` chama `jest.useFakeTimers()` e não restaura;
  sem o `afterEach`, testes seguintes no arquivo herdam timers falsos.
- **Risco 3 — `transformIgnorePatterns` é global.** A entrada nova é aditiva e só afeta quem importa
  `standard-navigation`, mas a suíte inteira deve ser rodada para confirmar.
- **Risco 4 — a superfície que o teste NÃO cobre** (auth, deep links, version gate) é justamente a
  mais perigosa desta mudança. Conferência manual obrigatória antes do merge.
- **Não usar `testRouter`** — quebra pelo mesmo bug upstream. Só `await act(async () => {...})`.

## Rollback

`git revert` do passo 2 devolve o `<Slot />` e deixa T1/T2 vermelhos — que é o comportamento
correto, já que eles descrevem o defeito. Revertendo os dois passos, nada resta.
