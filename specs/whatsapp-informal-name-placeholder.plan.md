# Plan: Placeholder "Nome Informal" nos templates de WhatsApp
(spec: `specs/whatsapp-informal-name-placeholder.md`)

## Reuse (extend these, don't recreate)

- `src/lib/whatsappUtils.ts` — `WA_TOKEN_ALIASES` + `resolveTemplate`: o mecanismo de token/alias
  já existe; basta um campo novo. Nada de função nova de substituição.
- `src/components/TemplateEditorScreen.tsx` — **sem alteração**. Chips, inserção no cursor,
  preview e restore-default já são genéricos sobre `TemplateTab.placeholders`.
- `src/app/(tabs)/settings/whatsapp.tsx` — as listas `SPEECH_PLACEHOLDERS` / `PRAYER_PLACEHOLDERS`
  são o único ponto de configuração dos chips.
- `src/__tests__/whatsapp-utils.test.ts` — suíte de `resolveTemplate` e dos defaults, já
  importando as constantes por nome.
- `src/__tests__/v2-invite-delegation.test.tsx` — harness que renderiza `InviteManagementSection`,
  dispara o envio e inspeciona a URL do `wa.me`; é onde a resolução ponta-a-ponta se prova.
- `src/__tests__/template-editor-screen.test.tsx` — padrão para o teste de tela nova.

## Steps (1 step = 1 commit)

1. **`feat(whatsapp): separar {nome} (completo) de {nome informal}`**
   Em `whatsappUtils.ts`: adicionar `speakerInformalName?: string` a `WhatsAppVariables`; novo
   campo `informalName` em `WA_TOKEN_ALIASES` com os aliases `nome informal` / `informal name` /
   `nombre informal`; resolver `informalName` **antes** de `name`; valor =
   `vars.speakerInformalName || vars.speakerName`. `name` passa a ser literalmente
   `vars.speakerName`.
   — covers: AC3, AC4, AC5, AC6, AC7
   — tests: `whatsapp-utils.test.ts` — casos novos: informal preenchido; informal vazio cai no
   completo; os dois tokens no mesmo template resolvem cada um com seu valor (ordem não corrompe);
   cada um dos 3 aliases resolve.

2. **`fix(invite): enviar o nome completo em {nome}, o informal em {nome informal}`**
   Em `InviteManagementSection.tsx:158` e `:172`: trocar
   `speakerName: speech.speaker_informal_name || speech.speaker_name || ''` por
   `speakerName: speech.speaker_name || ''` +
   `speakerInformalName: speech.speaker_informal_name || ''`. Wrapper de delegação intocado.
   — covers: AC5, AC4 (ponta-a-ponta), AC12, AC13
   — tests: `v2-invite-delegation.test.tsx` — um discurso com `speaker_name: 'Maria Silva'` /
   `speaker_informal_name: 'Maria'` e template personalizado com os dois tokens produz a URL com
   os dois valores certos; membro sem informal usa o completo nos dois; o envio delegado continua
   embrulhando igual.

3. **`feat(settings): chip "Nome Informal" nas abas de template do WhatsApp`**
   Em `settings/whatsapp.tsx`: inserir `{nome informal}` na lista de placeholders logo após
   `{nome}` (sample `'Maria'`, contra `'Maria Silva'` do `{nome}`), e trocar
   `PRAYER_PLACEHOLDERS = SPEECH_PLACEHOLDERS.slice(0, 2)` por `slice(0, 3)` para as orações
   ganharem o chip. Nova chave `whatsapp.placeholderInformalName` nos 3 locales
   (`{nome informal}` / `{informal name}` / `{nombre informal}`).
   — covers: AC1, AC2, AC8
   — tests: novo `src/__tests__/settings-whatsapp-templates.test.tsx` — renderiza a tela, afirma
   que o chip existe nas abas de discurso E de oração, que tocá-lo insere o token canônico no
   editor, e que o preview substitui `{nome}` e `{nome informal}` por valores distintos.

4. **`feat(whatsapp): novos textos padrão, saudando pelo nome informal`**
   Reescrever as 15 constantes de default (3 discursos + 2 orações × pt-BR/en-US/es-LA) conforme
   a seção "Textos padrão" do spec.
   — covers: AC9, AC10, AC11
   — tests: `whatsapp-utils.test.ts` — cada default das 3 línguas contém `{nome informal}` e
   nenhum default de discurso/oração contém mais `{nome}` isolado; `getDefaultSpeechTemplate` e
   `getDefaultPrayerTemplate` devolvem o texto novo por idioma; resolver o default de oração com
   um membro sem nome informal produz a saudação com o nome completo (AC4 + AC10 juntos).
   AC11 (restore) já é coberto por `template-editor-screen.test.tsx`, que grava `null` e exibe
   `defaultText`; o teste de tela do passo 3 confirma que `defaultText` é o texto novo.

## AC → coverage matrix

| AC   | Step(s) | Test(s) |
|------|---------|---------|
| AC1  | 3       | settings-whatsapp-templates: chip presente nas 5 abas |
| AC2  | 3       | settings-whatsapp-templates: inserção do token canônico |
| AC3  | 1       | whatsapp-utils: informal preenchido |
| AC4  | 1, 2, 4 | whatsapp-utils: fallback; v2-invite-delegation: membro sem informal |
| AC5  | 1, 2    | whatsapp-utils: `{nome}` = completo; v2-invite-delegation: URL |
| AC6  | 1       | whatsapp-utils: os 3 aliases |
| AC7  | 1       | whatsapp-utils: os dois tokens no mesmo template |
| AC8  | 3       | settings-whatsapp-templates: preview com samples distintos |
| AC9  | 4       | whatsapp-utils: defaults de discurso nas 3 línguas |
| AC10 | 4       | whatsapp-utils: defaults de oração nas 3 línguas |
| AC11 | 3, 4    | template-editor-screen (restore → null + defaultText) + tela do passo 3 |
| AC12 | 2       | v2-invite-delegation: template personalizado gravado é usado como está |
| AC13 | 2       | v2-invite-delegation: envio delegado inalterado |

## Risks / deploys

- **Nenhuma migração, nenhum deploy.** Sem mudança de schema, de edge function ou de cache local.
- **Risco 1 — ordem de substituição.** Se `name` for resolvido antes de `informalName`, um alias
  mal escrito pode comer parte do outro token. Mitigado resolvendo `informalName` primeiro e
  prendendo o comportamento em AC7.
- **Risco 2 — regressão silenciosa de saudação.** Alas que personalizaram com `{nome}` mudam de
  "Maria" para "Maria Silva". É a decisão explícita do spec, não um defeito; nenhum teste deve
  travar o comportamento antigo.
- **Risco 3 — chips das orações.** `PRAYER_PLACEHOLDERS` é um `slice` da lista de discurso; a
  posição em que `{nome informal}` for inserido muda o que as orações recebem. O teste do passo 3
  cobre a aba de oração explicitamente, não só a de discurso.
- **Baseline de teste:** `npx jest --ci` deve continuar verde nos dois projects (ios/android).

## Rollback

Cada passo é um commit atômico e independente de dados: `git revert <sha>` de qualquer um deles
restaura o comportamento anterior sem tocar no banco. Revertendo o passo 2 sozinho, `{nome}` volta
a ser o nome informal e `{nome informal}` continua funcionando — não há estado persistido a
desfazer.
