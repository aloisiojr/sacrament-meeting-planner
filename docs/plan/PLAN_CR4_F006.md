# PLAN_CR4_F006 - UI/UX Small Fixes

```yaml
type: plan
feature: F006
title: "UI/UX Small Fixes"
change_requests: [CR-62, CR-63, CR-65, CR-69, CR-70]
total_steps: 6
parallel_tracks: 5
dependencies: "Existing codebase (post PLAN_CR003)"
coverage:
  acceptance_criteria: "all CRs covered"
  edge_cases: "template encoding, i18n completeness, icon hit area, re-render optimization"
```

---

## STEP-01: CR-62 - About Screen (i18n + disclaimer + credits fix)

### Objetivo
- Adicionar chave `about.disclaimer` nos 3 idiomas
- Alterar `about.creditsValue` de `"Aloísio Jr"` para `"Aloisio Almeida Jr"` nos 3 idiomas
- Adicionar View no `about.tsx` com texto do disclaimer

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/i18n/locales/pt-BR.json` | EDIT: alterar `about.creditsValue`, adicionar `about.disclaimer` |
| `src/i18n/locales/en.json` | EDIT: alterar `about.creditsValue`, adicionar `about.disclaimer` |
| `src/i18n/locales/es.json` | EDIT: alterar `about.creditsValue`, adicionar `about.disclaimer` |
| `src/app/(tabs)/settings/about.tsx` | EDIT: adicionar View com disclaimer abaixo da section |

### Detalhes de Implementacao

#### 1. Locales (3 arquivos)
Em cada arquivo, dentro do bloco `"about"`, fazer:

**pt-BR.json (linha 129):**
```json
"creditsValue": "Aloisio Almeida Jr",
```
Adicionar apos `"supportUrl"`:
```json
"disclaimer": "Este aplicativo nao e um produto oficial de A Igreja de Jesus Cristo dos Santos dos Ultimos Dias."
```

**en.json (linha 129):**
```json
"creditsValue": "Aloisio Almeida Jr",
```
Adicionar:
```json
"disclaimer": "This app is not an official product of The Church of Jesus Christ of Latter-day Saints."
```

**es.json (linha 129):**
```json
"creditsValue": "Aloisio Almeida Jr",
```
Adicionar:
```json
"disclaimer": "Esta aplicacion no es un producto oficial de La Iglesia de Jesucristo de los Santos de los Ultimos Dias."
```

#### 2. about.tsx
Apos o `</View>` da section (linha 69), antes do `</SafeAreaView>`, adicionar:
```tsx
<View style={styles.disclaimerContainer}>
  <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
    {t('about.disclaimer')}
  </Text>
</View>
```

Adicionar no `StyleSheet.create`:
```ts
disclaimerContainer: {
  marginHorizontal: 16,
  marginTop: 16,
  paddingHorizontal: 16,
},
disclaimerText: {
  fontSize: 12,
  textAlign: 'center',
  fontStyle: 'italic',
},
```

### Verificacao
- [ ] `about.creditsValue` = "Aloisio Almeida Jr" nos 3 idiomas
- [ ] `about.disclaimer` presente nos 3 idiomas
- [ ] Disclaimer renderiza com fontSize 12, textSecondary, center, italic
- [ ] Layout nao quebra em telas pequenas

---

## STEP-02: CR-63 - Template WhatsApp (acentos corretos)

### Objetivo
Atualizar o DEFAULT_TEMPLATE_PT_BR em `whatsappUtils.ts` e o template em `register-first-user/index.ts` para ter acentos corretos e ser IDENTICO.

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/lib/whatsappUtils.ts` | EDIT: linha 8-9, substituir template |
| `supabase/functions/register-first-user/index.ts` | EDIT: linha 79-80, substituir template |
| `src/__tests__/whatsapp-utils.test.ts` | EDIT: atualizar teste que valida o template default |

### Detalhes de Implementacao

#### 1. whatsappUtils.ts (linha 8-9)
**De:**
```ts
export const DEFAULT_TEMPLATE_PT_BR =
  'Ola, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Voce falara sobre um tema da {colecao} com o titulo {titulo} {link}. Podemos confirmar o seu discurso?';
```
**Para:**
```ts
export const DEFAULT_TEMPLATE_PT_BR =
  'Olá, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título {titulo} {link}. Podemos confirmar o seu discurso?';
```

#### 2. register-first-user/index.ts (linha 79-80)
**De:**
```ts
const defaultWhatsappTemplate =
  'Ola {nome}, voce foi designado(a) para o {posicao} discurso no dia {data} sobre o tema {colecao} - {titulo} ({link}). Podemos confirmar o seu discurso? Obrigado!';
```
**Para (IDENTICO ao whatsappUtils.ts):**
```ts
const defaultWhatsappTemplate =
  'Olá, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título {titulo} {link}. Podemos confirmar o seu discurso?';
```

#### 3. whatsapp-utils.test.ts (linha 94-104)
O teste `'uses default template when empty'` verifica que a URL contém `encodeURIComponent('Bispado')`. Este teste continua valido pois o template atualizado ainda contem "Bispado". Porem, convem adicionar um teste que valide os acentos:

Adicionar teste:
```ts
it('default template contains proper accents', () => {
  expect(DEFAULT_TEMPLATE_PT_BR).toContain('Olá');
  expect(DEFAULT_TEMPLATE_PT_BR).toContain('Você');
  expect(DEFAULT_TEMPLATE_PT_BR).toContain('falará');
  expect(DEFAULT_TEMPLATE_PT_BR).toContain('título');
});
```

Atualizar import para incluir `DEFAULT_TEMPLATE_PT_BR`:
```ts
import { resolveTemplate, buildWhatsAppUrl, DEFAULT_TEMPLATE_PT_BR } from '../lib/whatsappUtils';
```

### Verificacao
- [ ] DEFAULT_TEMPLATE_PT_BR em whatsappUtils.ts tem acentos corretos
- [ ] Template em register-first-user/index.ts e IDENTICO ao whatsappUtils.ts
- [ ] Teste de acentos passa
- [ ] Testes existentes continuam passando (encodeURIComponent de 'Bispado' ainda presente)

---

## STEP-03: CR-65 - Theme Toggle (otimizacao de re-renders)

### Objetivo
O setState ja e sincrono, porem ha re-renders desnecessarios em toda a arvore de componentes quando o tema muda. Otimizar com React.memo nos componentes que nao precisam re-renderizar inteiramente, e com separacao de contexto de `colors` dos demais valores.

### Analise da Arquitetura Atual

**Provider tree:** `ThemeProvider` -> `InnerLayout` -> `AuthProvider` -> `NavigationGuard` -> `Slot` -> Tabs/Screens

**Problema identificado:**
O `ThemeContext` expoe um unico contexto com `{ mode, preference, setPreference, toggleMode, colors, loading }`. Quando `colors` muda (toggle de tema), TODOS os consumidores de `useTheme()` re-renderizam, incluindo aqueles que so usam `setPreference` ou `mode`. Mais importante: como `ThemeProvider` esta no topo da arvore, o re-render propaga para todos os filhos.

**Componentes que chamam `useTheme()` diretamente (17 call-sites):**
- Tab screens: `HomeTab`, `SpeechesTab`, `AgendaTab`
- Layout files: `InnerLayout`, `NavigationGuard`, `TabsLayout`, `SettingsLayout`
- Components: `AgendaForm`, `SundayCard`, `SpeechSlot`, `ActorSelector`, `HymnSelector`, `MemberSelectorModal`, `TopicSelectorModal`, `StatusChangeModal`, `PrayerSelector`, `AccordionCard`, `SwipeableCard`, `DebouncedTextInput`, `NextSundaysSection`, `NextAssignmentsSection`, `InviteManagementSection`, `OfflineBanner`, `ExitConfirmation`

**Nota:** Como esses componentes consomem o contexto via `useTheme()`, `React.memo` neles NAO evitaria re-renders causados pela mudanca de contexto. `React.memo` so previne re-renders causados por mudanca de props do pai.

### Estrategia de Otimizacao

A otimizacao correta envolve duas tecnicas complementares:

#### Tecnica 1: React.memo nos filhos pesados que NAO usam useTheme()

Componentes filhos que recebem `colors` via PROPS (nao via hook) podem ser memoizados. O principal candidato e:
- **`SettingsItem`** em `settings/index.tsx` (recebe `colors` como prop, renderiza ~8 vezes)

Alem disso, `React.memo` ajuda em componentes que sao filhos de um consumidor de contexto mas que eles mesmos NAO chamam `useTheme()`:
- **`AgendaSundayCard`** em `agenda.tsx` (funcao interna, mas chama useTheme() diretamente -- memo nao ajuda aqui)

#### Tecnica 2: Splitting do ThemeContext (colors vs actions)

Separar o contexto em dois:
- `ThemeColorsContext`: contem apenas `colors` e `mode` (muda quando tema muda)
- `ThemeActionsContext`: contem `preference`, `setPreference`, `toggleMode`, `loading` (NUNCA muda apos mount, pois setPreference e toggleMode sao useCallback estaveis)

Isso permite que componentes como `ThemeScreen` (que precisa de `setPreference` mas nao de `colors` para decidir re-render) nao re-renderizem quando colors muda. Na pratica, porem, quase todos os componentes precisam de `colors`, entao o ganho e marginal.

**DECISAO: Aplicar somente Tecnica 1 (React.memo em componentes de prop-drilling) + memoizar renderItem callbacks nos FlatLists.**

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/app/(tabs)/settings/index.tsx` | EDIT: envolver `SettingsItem` com `React.memo` |
| `src/app/(tabs)/speeches.tsx` | EDIT: envolver `renderItem` year-separator sub-component com memo |
| `src/components/SundayCard.tsx` | EDIT: envolver export com `React.memo` |
| `src/components/SpeechSlot.tsx` | EDIT: envolver export com `React.memo` |
| `src/components/AgendaForm.tsx` | EDIT: envolver export com `React.memo` |

### Detalhes de Implementacao

#### 1. settings/index.tsx - Memoizar SettingsItem

`SettingsItem` (linha 26) recebe `colors` como prop e renderiza ~8 vezes na SettingsScreen. Quando o pai (SettingsScreen) re-renderiza por mudanca de contexto, todos os SettingsItem re-renderizam tambem. React.memo evita isso quando as props nao mudaram.

**De:**
```tsx
function SettingsItem({ label, value, onPress, colors }: SettingsItemProps) {
```
**Para:**
```tsx
const SettingsItem = React.memo(function SettingsItem({ label, value, onPress, colors }: SettingsItemProps) {
  // ... corpo existente ...
});
```

Adicionar `import React` se ainda nao importado.

#### 2. SundayCard.tsx - React.memo no export

`SundayCard` e renderizado N vezes no FlatList do SpeechesTab. Como recebe props (nao usa contexto diretamente para decisao de render -- embora use useTheme internamente), React.memo pode evitar re-renders quando as props do card nao mudaram (ex: cards que nao estao expandidos).

**NOTA:** Como SundayCard chama `useTheme()` internamente, React.memo so ajuda quando o re-render vem do PAI (FlatList re-render), nao quando vem da mudanca de contexto. O beneficio e na reducao de renders quando apenas `expandedDate` muda (a maioria dos cards nao muda de props).

**De:**
```tsx
export function SundayCard({
```
**Para:**
```tsx
export const SundayCard = React.memo(function SundayCard({
  // ... corpo existente ...
});
```

#### 3. SpeechSlot.tsx - React.memo no export

Mesma logica: SpeechSlot e renderizado 3x por SundayCard expandido.

**De:**
```tsx
export function SpeechSlot({
```
**Para:**
```tsx
export const SpeechSlot = React.memo(function SpeechSlot({
  // ... corpo existente ...
});
```

#### 4. AgendaForm.tsx - React.memo no export

AgendaForm e o componente mais pesado (muitos campos, muitos hooks). Memoizar evita re-render do pai (AgendaSundayCard) quando as props nao mudam.

**De:**
```tsx
export function AgendaForm({ sundayDate, exceptionReason, customReason }: AgendaFormProps) {
```
**Para:**
```tsx
export const AgendaForm = React.memo(function AgendaForm({ sundayDate, exceptionReason, customReason }: AgendaFormProps) {
  // ... corpo existente ...
});
```

#### 5. speeches.tsx - Estabilizar renderItem

O `renderItem` no SpeechesTab (linha 234) tem `colors` nas dependencias do useCallback. Isso faz o FlatList re-renderizar TODOS os itens quando o tema muda. Remover `colors` das deps (o renderItem nao usa colors diretamente para year separator, pode usar via useTheme no componente filho).

**De (linha 288-301):**
```tsx
  [
    colors,
    speechMap,
    nextSunday,
    ...
  ]
```
**Para:**
```tsx
  [
    speechMap,
    nextSunday,
    ...
  ]
```

O `colors` pode ser removido porque os componentes filhos (SundayCard, SpeechSlot) ja consomem `useTheme()` internamente. O year separator sub-render inline usa `colors.textSecondary` -- extrair para um componente memoizado separado:

```tsx
const YearSeparator = React.memo(function YearSeparator({ year }: { year: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.yearSeparator}>
      <Text style={[styles.yearText, { color: colors.textSecondary }]}>
        {year}
      </Text>
    </View>
  );
});
```

E no renderItem, trocar:
```tsx
if (item.type === 'year') {
  return <YearSeparator year={item.year} />;
}
```

### Verificacao
- [ ] `SettingsItem` envolvido com `React.memo`
- [ ] `SundayCard` envolvido com `React.memo`
- [ ] `SpeechSlot` envolvido com `React.memo`
- [ ] `AgendaForm` envolvido com `React.memo`
- [ ] `renderItem` em speeches.tsx nao depende de `colors`
- [ ] `YearSeparator` extraido como componente memoizado em speeches.tsx
- [ ] Todos os testes existentes continuam passando
- [ ] Theme toggle nao apresenta delay perceptivel

---

## STEP-04: CR-69 - Labels Agenda (SOMENTE i18n)

### Objetivo
Alterar labels de agenda nos 3 idiomas. SEM mudanca de componentes.

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/i18n/locales/pt-BR.json` | EDIT: alterar 4 chaves em `agenda` |
| `src/i18n/locales/en.json` | EDIT: alterar 4 chaves em `agenda` |
| `src/i18n/locales/es.json` | EDIT: alterar 3 chaves em `agenda` |

### Detalhes de Implementacao

#### pt-BR.json (bloco `"agenda"`)
```
"conducting": "Dirigindo"           (era: "Conduzindo")
"wardBusiness": "Apoios e Agradecimentos"   (era: "Assuntos da Ala")
"stakeAnnouncements": "Apoios e Agradecimentos da Estaca"  (era: "Anúncios da Estaca")
"recognizing": "Reconhecendo a Presença"    (era: "Reconhecendo")
```

#### en.json (bloco `"agenda"`)
```
"conducting": "Directing"           (era: "Conducting")
"wardBusiness": "Sustainings and Releases"   (era: "Ward Business")
"stakeAnnouncements": "Stake Sustainings and Releases"  (era: "Stake Announcements")
"recognizing": "Recognizing Visitors"    (era: "Recognizing")
```

#### es.json (bloco `"agenda"`)
```
"wardBusiness": "Apoyos y Agradecimientos"   (era: "Asuntos del Barrio")
"stakeAnnouncements": "Apoyos y Agradecimientos de Estaca"  (era: "Anuncios de Estaca")
"recognizing": "Reconociendo la Presencia"    (era: "Reconociendo")
```
Nota: `"conducting"` em es.json ja esta correto como `"Dirigiendo"`.

### Verificacao
- [ ] pt-BR: 4 chaves alteradas corretamente
- [ ] en: 4 chaves alteradas corretamente
- [ ] es: 3 chaves alteradas corretamente (conducting nao muda)
- [ ] Nenhum componente TSX foi modificado

---

## STEP-05: CR-70 - Actor Icons (touch targets maiores)

### Objetivo
Aumentar tamanho dos icones de acao e areas de toque no ActorSelector.

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/components/ActorSelector.tsx` | EDIT: alterar estilos e hitSlop |

### Detalhes de Implementacao

#### ActorSelector.tsx - Estilos (StyleSheet, linhas 361-368)

**De:**
```ts
actorActions: {
  flexDirection: 'row',
  gap: 16,
  marginLeft: 12,
},
actionIcon: {
  fontSize: 18,
},
```

**Para:**
```ts
actorActions: {
  flexDirection: 'row',
  gap: 20,
  marginLeft: 16,
},
actionIcon: {
  fontSize: 24,
  padding: 4,
},
```

#### ActorSelector.tsx - hitSlop (linhas 159-160 e 168)

**De (linha 160):**
```tsx
hitSlop={8}
```
**Para:**
```tsx
hitSlop={12}
```

**De (linha 168):**
```tsx
<Pressable hitSlop={8} onPress={() => handleDelete(item)}>
```
**Para:**
```tsx
<Pressable hitSlop={12} onPress={() => handleDelete(item)}>
```

### Verificacao
- [ ] `actionIcon.fontSize`: 18 -> 24
- [ ] `actionIcon.padding`: adicionado 4
- [ ] `actorActions.gap`: 16 -> 20
- [ ] `actorActions.marginLeft`: 12 -> 16
- [ ] `hitSlop` (edit button): 8 -> 12
- [ ] `hitSlop` (delete button): 8 -> 12

---

## STEP-06: Testes QA para F006

### Objetivo
Criar/atualizar testes para validar as mudancas dos CRs 62, 63, 69, 70.

### Arquivos
| Arquivo | Acao |
|---------|------|
| `src/__tests__/whatsapp-utils.test.ts` | EDIT: adicionar teste de acentos (ja coberto no STEP-02) |
| `src/__tests__/cr004-f006-uiux-fixes.test.ts` | CREATE: testes para i18n labels e ActorSelector styles |

### Detalhes dos Testes

#### cr004-f006-uiux-fixes.test.ts

```ts
// CR-62: about.disclaimer exists in all 3 locales
// CR-62: about.creditsValue = "Aloisio Almeida Jr" in all 3 locales
// CR-63: DEFAULT_TEMPLATE_PT_BR contains accented characters
// CR-63: register-first-user template matches DEFAULT_TEMPLATE_PT_BR
// CR-65: SundayCard, SpeechSlot, AgendaForm exports are React.memo wrapped
// CR-69: agenda labels match expected values per locale
// CR-70: ActorSelector style constants (validate via snapshot or manual check)
```

### Verificacao
- [ ] Todos os testes passam com `pnpm test`
- [ ] Cobertura dos CRs 62, 63, 69 via testes de i18n
- [ ] CR-65 validado por inspecao (React.memo wrapping) e teste de export type
- [ ] CR-70 validado por inspecao (estilos nao sao testados unitariamente)

---

## Resumo de Dependencias entre Steps

```
STEP-01 (CR-62) ──┐
STEP-02 (CR-63) ──┤
STEP-03 (CR-65) ──┼── Todos independentes, podem rodar em paralelo
STEP-04 (CR-69) ──┤
STEP-05 (CR-70) ──┘
                  │
                  v
            STEP-06 (Testes) ── depende de STEP-01..05
```

Todos os 5 primeiros steps sao independentes e podem ser implementados em qualquer ordem ou em paralelo.
STEP-06 (testes) depende da conclusao dos demais.

---

## Commit Strategy

```
feat(about): add disclaimer and fix credits name (CR-62)
fix(whatsapp): add proper accents to default template (CR-63)
perf(theme): add React.memo to reduce unnecessary re-renders on theme toggle (CR-65)
fix(i18n): update agenda labels for pt-BR, en, es (CR-69)
style(actor-selector): increase icon size and touch targets (CR-70)
test(qa): add QA tests for F006 UI/UX fixes
```
