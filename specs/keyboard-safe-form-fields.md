# Nenhum campo de texto pode ficar escondido atrás do teclado

## Problem / intent

Na tela de apoios e desobrigações, ao tocar num campo de texto o teclado virtual sobe e cobre o
campo — total ou parcialmente — e a tela não rola para trazê-lo à vista. O usuário digita às cegas.
O mesmo defeito existe em outras telas de formulário do app.

## In scope / Out of scope

- **In:** `app.config.js` — definir `softwareKeyboardLayoutMode: 'resize'` no Android. Hoje não está
  definido, e o padrão do Expo é `pan`, que empurra a tela inteira em vez de redimensioná-la.
- **In:** proteção de teclado nas 10 telas/componentes onde um campo pode ficar abaixo da linha do
  teclado: `app/designations/[date].tsx`, `components/PersonEditor.tsx`,
  `components/EditableListField.tsx`, `components/TemplateEditorScreen.tsx`,
  `app/(tabs)/settings/ward.tsx`, `app/(tabs)/settings/users.tsx`,
  `components/PdfImportReview.tsx`, `components/AgendaForm.tsx`,
  `components/TopicSelectorModal.tsx` (campos de adicionar/editar tema, não a busca),
  `components/AttendanceBlock.tsx` e `components/SundayCard.tsx`.
- **Out:** telas cujo único campo é a **busca no topo**, que o teclado nunca cobre:
  `settings/history.tsx`, `settings/timezone.tsx`, `settings/members.tsx`,
  `components/HymnSelector.tsx`, e o campo de busca do `PeoplePicker`/`TopicSelectorModal`.
- **Out:** as 5 telas de `(auth)`, que já usam `KeyboardAvoidingView`.
- **Out:** redesenhar formulários, mudar layout ou ordem de campos.

## Baseline (evidence)

Varredura de todos os `.tsx` com `<TextInput>`/`<SearchInput>`:

- **Já protegidas (5):** `(auth)/login`, `register`, `forgot-password`, `reset-password`,
  `invite/[token]` — todas com `KeyboardAvoidingView`. É o padrão a copiar.
- **Sem proteção (18)**, das quais 10 têm campo que pode ser coberto (lista acima) e 8 são só busca
  no topo.
- `app/designations/[date].tsx:185-187` — tem `ScrollView` com `keyboardShouldPersistTaps="handled"`,
  mas nenhum `KeyboardAvoidingView` nem `automaticallyAdjustKeyboardInsets`.
- `app.config.js` — nenhuma menção a `softwareKeyboardLayoutMode`, `windowSoftInputMode` ou
  `adjustResize`. No Android o padrão do Expo é `pan`.

## Acceptance criteria (EARS)

- AC1: WHEN o usuário toca num campo de texto em qualquer das telas do escopo, the system SHALL
  garantir que o campo fique inteiramente visível acima do teclado.
- AC2: WHILE o teclado está aberto, WHEN o usuário rola a tela, the system SHALL permitir alcançar
  qualquer campo do formulário.
- AC3: WHEN o teclado fecha, the system SHALL devolver o layout ao estado anterior, sem espaço
  vazio sobrando no rodapé.
- AC4: WHEN o usuário toca fora de um campo numa área rolável, the system SHALL preservar o
  comportamento atual de `keyboardShouldPersistTaps`, sem engolir o primeiro toque em botões.
- AC5: WHERE a tela tem apenas um campo de busca no topo, the system SHALL permanecer inalterada.
- AC6: WHEN o app roda no Android, the system SHALL redimensionar a janela ao abrir o teclado, em
  vez de deslocá-la.

## Open questions

Nenhuma.

## Notes

**Decisão do usuário (2026-08-15):** corrigir a classe inteira, não só a tela de apoios; e pular as
telas em que o único campo é a busca no topo.

**A verificação é majoritariamente manual.** O jest não tem teclado virtual: não há como afirmar
"o campo ficou visível" num teste de unidade. O que dá para automatizar é a não-regressão estrutural
(o container de teclado existe e envolve o formulário) e o fato de `keyboardShouldPersistTaps`
continuar valendo — isso não prova AC1, e o spec não vai fingir que prova. Cada tela do escopo
precisa ser tocada no aparelho, **em iOS e Android**, porque o mecanismo difere entre as duas.

**Risco de a config do Android bastar.** É possível que `softwareKeyboardLayoutMode: 'resize'`
sozinho resolva a maior parte dos casos no Android, deixando só o iOS precisando de tratamento por
tela. O plano deve começar por ela e medir, em vez de aplicar 10 correções às cegas.

**`softwareKeyboardLayoutMode` é campo nativo do `app.config.js`** — mudá-lo exige **novo build**,
não basta recarregar o JS.

**Sem migração, sem deploy de servidor.**
