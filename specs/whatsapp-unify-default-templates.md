# Unificar os textos padrão de WhatsApp (código × edge function)

## Problem / intent

Existem hoje DOIS conjuntos de "texto padrão" para as mesmas 5 mensagens de WhatsApp, com
redações diferentes: o que a edge function `register-first-user` grava em cada ala nova, e o que
`whatsappUtils.ts` devolve quando a coluna está NULL (ou seja, o que "restaurar padrão" entrega).
Uma ala criada hoje recebe um texto e, ao apertar "restaurar padrão", recebe outro — sem ter
pedido a mudança. Esta mudança adota uma redação única, escrita pelo usuário, nos dois lugares, e
prende a igualdade em teste para que não voltem a divergir.

## In scope / Out of scope

- **In:** nova redação dos 5 templates (3 discursos + 2 orações) nas 3 línguas, nas 15 constantes
  de `src/lib/whatsappUtils.ts` — o ÚNICO lugar onde o texto passa a existir.
- **In:** `supabase/functions/register-first-user/index.ts` deixa de ter strings próprias e passa
  a importar `getDefaultSpeechTemplate` / `getDefaultPrayerTemplate` do mesmo arquivo.
- **In:** teste de contrato afirmando que o que a edge function semeia é exatamente o que os
  getters devolvem, nas 3 línguas mais um idioma desconhecido.
- **In:** correções de terminologia da Igreja aprovadas pelo usuário (ver Notes).
- **Out:** a edge function continuar semeando (mantido — NÃO passa a gravar NULL).
- **Out:** renomear `speech`/`speeches` em código, tipos, tabelas ou testIDs. Só muda texto
  voltado ao membro.
- **Out:** o wrapper de delegação (só existe no código, não é semeado — já não diverge).
- **Out:** as strings de i18n da interface (`src/i18n/locales/*.json`). Só os templates.
- **Out:** qualquer migração; alas existentes não têm seus textos reescritos.

## Baseline (evidence)

- `src/lib/whatsappUtils.ts` — 15 constantes `DEFAULT_TEMPLATE_SPEECH_*` /
  `DEFAULT_*_PRAYER_TEMPLATE_*`, servidas por `getDefaultSpeechTemplate` e
  `getDefaultPrayerTemplate`.
- `supabase/functions/register-first-user/index.ts:98-134` — `switch (wardLanguage)` com 15
  strings próprias, gravadas no insert de `wards` (linhas 127-134). Nunca ficam NULL.
- Divergências medidas hoje (pt-BR): saudação `Olá` vs `Oi`; ordinal `primeiro` vs `1º`; o código
  cita `{colecao}` e a edge cita duração ("5 / 7-10 / 15-20 minutos"); o código tem instrução de
  reverência nas orações e a edge não; a edge quebra linha antes da pergunta final e o código não.
- Nada mais no app lê esses textos: `InviteManagementSection` usa o valor da coluna ou o default
  do código; a tela de configurações usa `value ?? defaultText`.

## Acceptance criteria (EARS)

- AC1: WHERE a ala não personalizou o template, the system SHALL usar, em cada idioma, exatamente
  a redação da seção "Textos aprovados" abaixo.
- AC2: WHEN uma ala nova é criada, the system SHALL semear os 5 templates com exatamente a mesma
  string que `getDefaultSpeechTemplate` / `getDefaultPrayerTemplate` devolvem para aquele idioma.
- AC3: IF a string semeada pela edge function e o default do código divergirem em qualquer
  caractere, em qualquer dos 5 templates de qualquer das 3 línguas, THEN a suíte SHALL falhar.
- AC4: WHEN o idioma pedido é desconhecido, the system SHALL semear e devolver a redação en-US
  nos dois caminhos.
- AC5: WHEN o texto padrão é renderizado, the system SHALL preservar a linha em branco antes da
  pergunta final.
- AC6: WHEN um discurso não tem link cadastrado, the system SHALL produzir a mensagem sem espaço
  duplo nem linha órfã no lugar do `{link}`.
- AC7: WHEN qualquer texto padrão é usado, the system SHALL saudar por `{nome informal}` e não
  conter `{nome}`.
- AC8: WHILE uma ala tiver um template personalizado gravado, the system SHALL continuar usando o
  texto gravado, sem reescrevê-lo.

## Open questions

Nenhuma.

## Notes

**Decisão estrutural (revista em 2026-08-05, a pedido do usuário).** O primeiro plano era manter
o texto duplicado nos dois lugares e defender a igualdade com um teste. O usuário questionou por
que não pode ficar num lugar só, e estava certo: a duplicata foi ELIMINADA. A edge function
importa `../../../src/lib/whatsappUtils.ts` — o arquivo é TypeScript puro, sem um único `import`,
e `supabase/functions` está fora do `tsc`, então o Deno o carrega direto e o jest também
(o teste já fazia `require` de um caminho `.ts`).

A edge function CONTINUA semeando (não grava NULL), para que todo cliente — inclusive 1.x — leia
o mesmo texto do banco. Verificado que 1.x trataria NULL corretamente
(`v1.x:…/settings/whatsapp.tsx:121`, `v1.x:…/whatsappUtils.ts:178`), mas semear mantém o texto
igual entre versões do app durante a cauda 1.x.

O teste de contrato (AC3) permanece: ele não protege mais contra duas cópias divergirem, e sim
contra alguém reintroduzir strings literais na edge function.

**Verificação de deploy pendente:** o bundler do `supabase functions deploy` precisa aceitar um
import para fora de `supabase/`. Isso NÃO é verificável nesta máquina; confirmar no deploy. Se
falhar, o plano B é a edge function parar de semear (gravar NULL), que dá o mesmo lugar único
sem depender do bundler.

**Terminologia da Igreja — mudanças aprovadas pelo usuário em 2026-08-05:**
- en-US: `speech` → **talk** no texto voltado ao membro. Em inglês eclesiástico o membro faz um
  *talk*; *speech* é discurso secular. Código, tipos e tabela `speeches` NÃO mudam.
- es-LA: `oración de cierre` / `oración de clausura` → **oración final** (par usado nos manuais é
  *oración de apertura* / *oración final*).
- As orações passaram a convidar ("O bispado gostaria de te convidar para fazer a oração…") em
  vez de designar ("você foi designado(a) para fazer…"), por reescrita do usuário em 2026-08-05
  durante o build. Efeito colateral bem-vindo: some o `(a)` de gênero, e a saudação das orações
  passa a ser a mesma dos discursos (`Olá … tudo bom?`).
- en-US / es-LA: `Sacrament Meeting` / `Reunión Sacramental` → minúsculas (`sacrament meeting`,
  `reunión sacramental`), grafia dos manuais. **pt-BR mantém `Reunião Sacramental` maiúsculo**, por
  escolha explícita do usuário.
- es-LA: removida a exclamação, que hoje aparece sem o `¡` de abertura — erro de pontuação.
- Os três idiomas passam a nomear a reunião no texto dos discursos (pedido do usuário).

**Consequências aceitas:**
- O 3º discurso passa a ser chamado de "o último discurso" / "the last talk" / "el último
  discurso". Continua correto quando a ala desliga o 2º discurso (`has_second_speech`), pois a
  posição 3 segue sendo a última.
- `{colecao}` deixa de aparecer em qualquer texto padrão. O chip continua disponível.
- Alas que hoje usam o padrão do código (coluna NULL) verão o texto mudar. É o objetivo.

**DEPLOY NECESSÁRIO:** `supabase functions deploy register-first-user`.

### Textos aprovados

**pt-BR** — discurso N (`1º` / `2º` / `último`, com `5` / `7-10` / `15-20` minutos):
```
Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer o 1º discurso na Reunião Sacramental do domingo dia {data}! Você falará por 5 minutos sobre "{titulo}". {link}

Podemos confirmar o seu discurso?
```
orações (`abertura` / `encerramento`):
```
Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer a oração de abertura da Reunião Sacramental do dia {data}.

Podemos contar com você?
```

**en-US** — talk N (`1st` / `2nd` / `last`, com `5` / `7-10` / `15-20` minutes):
```
Hi {nome informal}, how are you? The bishopric would like to invite you to give the 1st talk in sacrament meeting on Sunday {data}! You will speak for 5 minutes about "{titulo}". {link}

Can we count on you?
```
orações (`opening` / `closing`):
```
Hi {nome informal}, how are you? The bishopric would like to invite you to give the opening prayer in sacrament meeting on {data}.

Can we count on you?
```

**es-LA** — discurso N (`1er` / `2do` / `último`, com `5` / `7-10` / `15-20` minutos):
```
Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a dar el primer discurso en la reunión sacramental del domingo {data}. Hablarás por 5 minutos sobre "{titulo}". {link}

¿Podemos confirmar tu discurso?
```
orações (`de apertura` / `final`):
```
Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a ofrecer la oración de apertura en la reunión sacramental del día {data}.

¿Podemos contar contigo?
```
