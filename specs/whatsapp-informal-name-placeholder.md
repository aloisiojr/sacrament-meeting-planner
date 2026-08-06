# Placeholder "Nome Informal" nos templates de WhatsApp

## Problem / intent

Hoje o token `{nome}` dos templates de WhatsApp resolve para o nome **informal** do membro
(`speaker_informal_name || speaker_name`), e não existe nenhuma forma de usar o nome **completo**
na mensagem. Os dois nomes existem no banco, mas o template só alcança um deles, e o que ele
alcança não é o que o token diz. Queremos separar os dois: `{nome}` passa a ser o nome completo e
um novo token `{nome informal}` entrega o nome informal, ambos disponíveis como chips na tela
Configurações → Modelos de WhatsApp. Os textos padrão são reescritos para saudar a pessoa pelo
nome informal.

## In scope / Out of scope

- **In:** novo placeholder `{nome informal}` (chip + substituição + preview) nas 5 abas atuais
  (1º/2º/3º discurso, oração de abertura, oração de encerramento).
- **In:** mudança de semântica de `{nome}` — passa a resolver para o nome completo (`speaker_name`).
- **In:** reescrita dos 5 textos padrão nas 3 línguas (pt-BR, en-US, es-LA).
- **In:** chaves i18n do novo chip nas 3 línguas.
- **Out:** aba de edição do **wrapper de delegação** (`whatsapp_template_delegation_wrapper`) —
  achado real registrado abaixo, tratado em mudança separada.
- **Out:** texto padrão do wrapper de delegação (permanece como está).
- **In (adicionado 2026-08-05, após a verificação):** os textos que a edge function
  `register-first-user` semeia em cada ala nova passam a usar `{nome informal}` na saudação.
- **Out:** qualquer alteração de schema ou migração. Nenhuma outra edge function muda.
- **Out:** os templates de Assuntos da Ala (`settings/designations.tsx`), que passam pelo mesmo
  `TemplateEditorScreen` mas têm seu próprio conjunto de tokens.

## Baseline (evidence)

- `src/lib/whatsappUtils.ts` — constantes dos 15 textos padrão (5 templates × 3 línguas),
  `WA_TOKEN_ALIASES` (linhas 163-169) e `resolveTemplate` (linha 175). O campo `name` hoje recebe
  `vars.speakerName`.
- `src/components/InviteManagementSection.tsx:159,173` — chama `resolveTemplate` com
  `speakerName: speech.speaker_informal_name || speech.speaker_name || ''`. É aqui que `{nome}`
  vira o nome informal.
- `src/app/(tabs)/settings/whatsapp.tsx:33-40` — `SPEECH_PLACEHOLDERS` (5 chips) e
  `PRAYER_PLACEHOLDERS` (os 2 primeiros). Chip = token canônico pt + label localizado.
- `src/components/TemplateEditorScreen.tsx` — editor compartilhado: chips inserem `p.token`,
  preview substitui `p.token` por `p.sample`.
- `src/types/database.ts:159-160` — `speeches.speaker_name` e `speeches.speaker_informal_name`
  (snapshots por discurso). `speaker_name` recebe `member.full_name`
  (`speeches/[date].tsx:131`, `AgendaForm.tsx:170`, `NextAssignmentsSection.tsx:121`);
  `speaker_informal_name` recebe `member.informal_name`, que é nullable.
- Os textos padrão em **todas** as línguas usam os tokens canônicos pt sem acento
  (`{nome}`, `{data}`, `{colecao}`, `{titulo}`); só o label do chip é traduzido. O novo token
  segue essa mesma convenção.

### Achado fora do escopo

`whatsapp_template_delegation_wrapper` é lido e aplicado em `InviteManagementSection.tsx:186`,
mas não aparece no mapa `COLUMN` de `settings/whatsapp.tsx` — não há aba, então o template é usado
e ninguém consegue editá-lo pelo app. A coluna já existe no banco.

## Acceptance criteria (EARS)

**Placeholder e substituição**

- AC1: WHEN o usuário abre Configurações → Modelos de WhatsApp em qualquer das 5 abas, the system
  SHALL exibir um chip de placeholder para o nome informal, rotulado `{nome informal}` em pt-BR,
  `{informal name}` em en-US e `{nombre informal}` em es-LA.
- AC2: WHEN o usuário toca esse chip, the system SHALL inserir o token canônico `{nome informal}`
  na posição do cursor do editor.
- AC3: WHEN um template contém `{nome informal}` e o discurso tem `speaker_informal_name`
  preenchido, the system SHALL substituí-lo pelo valor de `speaker_informal_name`.
- AC4: IF `speaker_informal_name` está vazio ou nulo, THEN the system SHALL substituir
  `{nome informal}` pelo valor de `speaker_name` (nome completo).
- AC5: WHEN um template contém `{nome}`, the system SHALL substituí-lo pelo valor de
  `speaker_name` (nome completo), e não mais pelo nome informal.
- AC6: WHEN um template contém `{nome informal}`, the system SHALL substituí-lo aceitando também
  os aliases `{informal name}` e `{nombre informal}`, do mesmo modo que os tokens já existentes.
- AC7: WHILE um template contém tanto `{nome}` quanto `{nome informal}`, the system SHALL
  substituir cada um pelo seu próprio valor, sem que a substituição de um corrompa o outro.
- AC8: WHEN o preview é renderizado com `{nome informal}` no texto, the system SHALL mostrar o
  valor de exemplo do nome informal, distinto do valor de exemplo de `{nome}`.

**Textos padrão**

- AC9: WHERE a ala não personalizou o template do discurso N (N ∈ {1,2,3}), the system SHALL usar
  o texto padrão do idioma da ala começando por `Olá {nome informal}, tudo bom!` (pt-BR) e os
  equivalentes en-US/es-LA definidos em Notes.
- AC10: WHERE a ala não personalizou o template de oração (abertura ou encerramento), the system
  SHALL usar o texto padrão que saúda com `{nome informal}` no lugar do `{nome}` anterior,
  preservando o restante do texto atual.
- AC11: WHEN o usuário toca "restaurar padrão" em qualquer das 5 abas, the system SHALL gravar
  `NULL` na coluna e exibir o novo texto padrão do idioma da ala.

**Não-regressão**

- AC12: WHEN uma ala tem um template personalizado gravado, the system SHALL continuar usando o
  texto gravado sem alteração — apenas a resolução de `{nome}` muda (AC5).
- AC13: WHEN um convite delegado é enviado, the system SHALL manter o wrapper de delegação
  inalterado, com `{responsavel}`, `{nome}` (= `delegate_for_name`) e `{mensagem}` resolvidos como
  hoje.
- ~~AC14: WHEN uma ala nova é criada pelo registro do primeiro usuário, the system SHALL semear os
  5 templates de WhatsApp com `{nome informal}` na saudação e sem nenhum `{nome}`, em qualquer das
  3 línguas.~~ **SUPERADO em 2026-08-06 por `specs/whatsapp-stop-seeding-templates.md`:** a ala nova
  não recebe mais nenhum texto semeado — as colunas nascem NULL e o app cai no padrão do código.
  A saudação por `{nome informal}` continua garantida, agora pelos literais exatos de
  `whatsapp-utils.test.ts` em vez de pela semeadura.

## Open questions

Nenhuma.

## Notes

**Permissões:** inalteradas — a tela segue atrás de `settings:whatsapp`.

**i18n:** uma chave nova (`whatsapp.placeholderInformalName`) nos 3 arquivos de locale.

**Offline:** inalterado — a gravação usa a mesma mutation da tela.

**Banco / release:** nenhuma migração, nenhuma mudança de schema. Os dois valores já estão em
`speeches`. Não há implicação de versão de app (não há release 1.x adiante).

**DEPLOY NECESSÁRIO:** a edge function `register-first-user` mudou e precisa ser reimplantada
(`supabase functions deploy register-first-user`). Sem o redeploy, alas criadas depois do release
continuam semeadas com `{nome}` e passam a saudar pelo nome completo.

**Reversão de decisão (2026-08-05).** O spec original declarava edge functions fora do escopo. A
verificação adversarial mostrou que `register-first-user` (`index.ts:101-134`) grava textos
próprios nas 5 colunas `whatsapp_template_*` de toda ala nova — logo essas colunas nunca ficam
NULL, os defaults do código são inalcançáveis para elas, e a mudança de semântica de `{nome}`
atingiria alas que nunca personalizaram nada. O usuário optou por trocar `{nome}` →
`{nome informal}` também lá (decisão de 2026-08-05), o que gerou AC14.

**Débito conhecido, deliberadamente não tratado:** os textos semeados pela edge function são
DIFERENTES dos defaults do código (mencionam duração — "5 / 7-10 / 15-20 minutos" — e não citam
`{colecao}`). Continuam existindo dois conjuntos de "padrão" divergentes: o que a ala recebe ao
nascer e o que "restaurar padrão" devolve. Unificá-los foi oferecido e recusado nesta mudança.

**Mudança visível assumida pelo usuário (decisão de 2026-08-05):** a semântica de `{nome}` muda
para alas que já personalizaram seus templates. Quem escreveu `{nome}` esperando "Maria" passará a
enviar "Maria Silva". Isso foi apresentado explicitamente e aceito; não haverá migração de texto
nem aviso in-app.

**Ordem de substituição:** `{nome informal}` deve ser resolvido de forma que o alias `{nome}` não
o corrompa. Os tokens não colidem por texto exato (`{nome informal}` não contém `{nome}`), mas a
ordem é uma armadilha fácil e AC7 existe para prendê-la em teste.

### Textos padrão — pt-BR (fornecidos pelo usuário)

- **1º/2º/3º discurso:** `Olá {nome informal}, tudo bom! O Bispado gostaria de te convidar para
  fazer o primeiro/segundo/terceiro discurso no domingo dia {data}! Você falará sobre um tema da
  {colecao} com o título "{titulo}" {link}. Podemos confirmar o seu discurso?`
- **Oração de abertura:** `Olá {nome informal}, você foi designado(a) para fazer a oração de
  abertura na Reunião Sacramental do dia {data}. Para ajudar na reverência, pedimos que você
  chegue 15min antes do início da reunião e se sente junto com o bispado ao púlpito. Podemos
  contar com você?`
- **Oração de encerramento:** `Olá {nome informal}, você foi designado(a) para fazer a oração de
  encerramento da Reunião Sacramental do dia {data}. Gostaríamos de pedir para que se junte ao
  bispado no púlpito durante o hino intermediário. Podemos contar com você?`

### Textos padrão — en-US / es-LA

Mantêm o texto atual, apenas ganhando a saudação com o nome informal:

- **en-US discurso N:** `Hi {nome informal}! The Bishopric would like to invite you to give the
  first/second/third speech on Sunday {data}! You will speak about a topic from {colecao} titled
  "{titulo}" {link}. Can we confirm your speech?`
- **en-US orações:** `Hello {nome informal}, you have been assigned to give the opening/closing
  prayer …` (restante idêntico ao atual).
- **es-LA discurso N:** `Hola {nome informal}, como estas? El Obispado te quiere invitar a dar el
  primer/segundo/tercer discurso el domingo {data}! Hablaras sobre un tema de {colecao} con el
  titulo "{titulo}" {link}. Podemos confirmar tu discurso?`
- **es-LA orações:** `Hola {nome informal}, has sido designado(a) para hacer la oración de
  apertura/cierre …` (restante idêntico ao atual).
