# Plan: Nenhum campo escondido atrás do teclado
(spec: `specs/keyboard-safe-form-fields.md`)

## Reuse (extend these, don't recreate)

- `src/app/(auth)/login.tsx:61-68` — o padrão do projeto:
  `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` envolvendo um
  `ScrollView` com `keyboardShouldPersistTaps="handled"`. As 5 telas de `(auth)` usam isso; copiar,
  não inventar um segundo mecanismo.
- `src/__tests__/app-config-variant.test.ts` — já executa `app.config.js` e afirma campos do
  resultado; é onde a asserção da config do Android entra.

## Refinamento do escopo (medido, não suposto)

O spec listou 10 arquivos. Três deles são **folhas** que vivem dentro de outra tela, e portanto são
cobertos ao proteger o pai:

| Folha | Vive dentro de |
|---|---|
| `EditableListField` | `AgendaForm` |
| `AttendanceBlock` | `(tabs)/agenda.tsx`, `UnifiedSundayCard` |
| `SundayCard` | `NextAssignmentsSection` |

Sobram **7 telas/modais** a proteger: `app/designations/[date].tsx` (a reportada),
`components/PersonEditor.tsx`, `components/TemplateEditorScreen.tsx`,
`app/(tabs)/settings/ward.tsx`, `app/(tabs)/settings/users.tsx`, `components/PdfImportReview.tsx`,
`components/TopicSelectorModal.tsx` — mais `app/(tabs)/agenda.tsx`, que hospeda `AgendaForm` e
`AttendanceBlock` e usa `FlatList` em vez de `ScrollView`.

## Steps (1 step = 1 commit)

1. **`fix(android): redimensionar a janela ao abrir o teclado`**
   `app.config.js`: `android.softwareKeyboardLayoutMode: 'resize'`. Hoje ausente; o padrão do Expo
   é `pan`, que desloca a tela inteira.
   — covers: AC6
   — tests: `app-config-variant.test.ts` — o config resolvido traz `resize`, nos dois variants.
   — **Exige build nativo novo.** Não vale recarregar o JS.

2. **`fix(designations): proteger os campos do teclado`**
   Só a tela reportada, com o padrão de `(auth)`. Serve de piloto: se o formato estiver certo aqui,
   os demais são repetição.
   — covers: AC1, AC2, AC3, AC4 (nessa tela)
   — tests: `designation-edit-screen` (novo ou existente) — o `ScrollView` está dentro de um
   `KeyboardAvoidingView` e `keyboardShouldPersistTaps` segue `handled`.

3. **`fix(forms): proteger as demais telas de formulário`**
   As outras 7, mesmo padrão.
   — covers: AC1-AC4 no restante
   — tests: um teste por tela afirmando o container, no mesmo formato do passo 2.

## AC → coverage matrix

| AC  | Step | Test |
|-----|------|------|
| AC1 | 2, 3 | estrutural por tela + **conferência manual** (ver Riscos) |
| AC2 | 2, 3 | idem |
| AC3 | 1, 2, 3 | manual |
| AC4 | 2, 3 | `keyboardShouldPersistTaps` continua `handled` |
| AC5 | —    | as telas de busca não aparecem no diff |
| AC6 | 1    | app-config-variant |

## Risks / deploys

- **O teste NÃO prova o AC1.** Não há teclado virtual no jest; o que se afirma é a presença e o
  encaixe do container, o que pega remoção acidental mas não prova que o campo ficou visível. Cada
  tela precisa ser tocada no aparelho, em **iOS e Android** — os mecanismos são distintos.
- **Passo 1 exige build nativo.** Sem novo build, o Android continua em `pan`.
- **`behavior="height"` no Android** pode brigar com `adjustResize` e causar salto duplo. Se isso
  aparecer no aparelho, a correção é `behavior={undefined}` no Android, deixando o `resize` nativo
  fazer o trabalho — decidir com o aparelho na mão, não aqui.
- **`TopicSelectorModal` e `PersonEditor` são modais.** `KeyboardAvoidingView` dentro de `Modal`
  tem comportamento próprio no iOS; verificar caso a caso.
- **`agenda.tsx` usa `FlatList`**, não `ScrollView` — envolver funciona, mas o auto-scroll existente
  (ADR-047) pode interagir. Tratar por último e com atenção.

## Rollback

Três commits independentes. Reverter o passo 1 devolve o Android ao padrão anterior (e pede build);
reverter 2 ou 3 devolve as telas ao estado atual, sem efeito colateral.
