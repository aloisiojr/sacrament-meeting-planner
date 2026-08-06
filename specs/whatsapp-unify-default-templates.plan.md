# Plan: Unificar os textos padrão de WhatsApp
(spec: `specs/whatsapp-unify-default-templates.md`)

## Reuse (extend these, don't recreate)

- `src/lib/whatsappUtils.ts` — as 15 constantes e os dois getters já são o ponto único de leitura
  do default no app. Nenhuma função nova.
- `src/__tests__/whatsapp-utils.test.ts` — já cobre os defaults por idioma; estender.
- `src/__tests__/edge-register-first-user.test.ts` — já executa a edge function e inspeciona o
  payload do insert em `wards` (`wardInsert()`), e já tem o `it.each` por idioma. O teste de
  contrato (AC3) entra aqui, comparando o payload com os getters importados do código.
- `src/__tests__/helpers/edgeFunctionHarness.ts` — harness existente, sem alteração.

## Steps (1 step = 1 commit)

1. **`feat(whatsapp): nova redação única dos 5 textos padrão`**
   Reescrever as 15 constantes de `whatsappUtils.ts` com os textos aprovados no spec.
   Testes existentes que mudam legitimamente (a serem declarados no commit):
   - `'default template contains proper accents'` assertava `'título'`, palavra que sai do texto
     (sobra só o token `{titulo}`); passa a assertar os acentos que o texto novo realmente tem.
   - `'the pt-BR speech defaults still say which speech it is'` assertava
     `primeiro/segundo/terceiro discurso`; passa a `1º` / `2º` / `último`.
   — covers: AC1, AC5, AC6, AC7
   — tests: `whatsapp-utils.test.ts` — a redação exata por idioma; a linha em branco preservada;
   um discurso sem `{link}` resolvido sem espaço duplo nem linha órfã; nenhum `{nome}`.

2. **`fix(register): semear exatamente o texto padrão do código`**
   Reescrever as 15 strings do `switch` da edge function com a mesma redação, e adicionar o teste
   de contrato.
   — covers: AC2, AC3, AC4, AC8
   — tests: `edge-register-first-user.test.ts` — `it.each` sobre `pt-BR`/`en-US`/`es-LA`/`fr-FR`
   comparando cada uma das 5 colunas semeadas com `getDefaultSpeechTemplate(lang, n)` /
   `getDefaultPrayerTemplate(lang, tipo)` por igualdade EXATA (`toBe`, não `toContain`), com
   `fr-FR` esperando a redação en-US.

## AC → coverage matrix

| AC  | Step(s) | Test(s) |
|-----|---------|---------|
| AC1 | 1       | whatsapp-utils: redação exata por idioma |
| AC2 | 2       | edge-register-first-user: contrato `toBe` por idioma |
| AC3 | 2       | o próprio contrato — diverge um caractere, fica vermelho |
| AC4 | 2       | contrato com `fr-FR` esperando en-US |
| AC5 | 1       | whatsapp-utils: `\n\n` antes da pergunta final |
| AC6 | 1       | whatsapp-utils: resolver sem `link` |
| AC7 | 1, 2    | asserções `{nome informal}` / `not {nome}` nos dois lados |
| AC8 | 2       | teste existente de template personalizado (`v2-invite-delegation`) |

## Risks / deploys

- **DEPLOY:** `supabase functions deploy register-first-user`. Sem ele, alas novas continuam com a
  redação antiga e o teste de contrato passa a mentir sobre a produção (ele valida o código-fonte
  da função, não a versão implantada).
- **Risco 1 — teste de contrato frouxo.** Se for escrito com `toContain`, deixa de proteger. Tem
  de ser `toBe` sobre a string inteira.
- **Risco 2 — asserções antigas que casavam por acaso.** Dois testes existentes mudam de forma
  legítima (passo 1); qualquer outro que quebre deve ser investigado, não ajustado.
- **Risco 3 — terminologia.** A auditoria de i18n contra os manuais da Igreja roda na verificação,
  como etapa própria, e não como parte do build.

## Rollback

Dois commits independentes; `git revert` de qualquer um volta ao texto anterior. Nada persistido
muda — alas existentes não são reescritas. Se só o passo 2 for revertido, o contrato de AC3 falha
e denuncia a divergência, que é o comportamento desejado.
