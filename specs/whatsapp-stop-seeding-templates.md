# A ala nova não recebe mais textos semeados (plano B)

## Problem / intent

`specs/whatsapp-unify-default-templates.md` unificou a redação fazendo a edge function
`register-first-user` IMPORTAR os textos do app e gravá-los em cada ala nova. Isso resolveu a
divergência no repositório, mas deixou duas fragilidades permanentes: o `supabase functions deploy`
empacota uma CÓPIA CONGELADA do texto, então mudar a redação sem redeployar reintroduz a
divergência em silêncio (e o teste de contrato, que compara arquivos do repositório, continua
verde); e o deploy passa a depender de o bundler aceitar um import para fora de `supabase/`.

A edge function deixa de semear. As 5 colunas nascem `NULL` e o app cai no texto do código. O texto
passa a existir em UM lugar de verdade — nenhuma cópia implantada, nenhum redeploy para mudar
redação, nenhum acoplamento de bundler.

## In scope / Out of scope

- **In:** `register-first-user` para de gravar as 5 colunas `whatsapp_template_*` e perde o import
  de `../../../src/lib/whatsappUtils.ts`.
- **In:** remoção de `src/__tests__/whatsapp-utils-dependency-free.test.ts` — ele existia só para
  proteger aquele import; sem ele, a guarda proibiria imports em `whatsappUtils.ts` sem motivo.
- **In:** os testes da edge function passam a afirmar que NENHUM texto é semeado.
- **Out:** a redação em si (inalterada), qualquer migração, qualquer mudança no app.
- **Out:** alas existentes — nada é reescrito; quem já tem texto gravado continua com ele.
- **Out:** o `delegation_wrapper`, que já nasce NULL desde sempre.

## Baseline (evidence)

- `supabase/functions/register-first-user/index.ts` — importa os dois getters e grava as 5 colunas
  no insert de `wards`.
- **O comportamento NULL já está em produção há tempos, num caso real:**
  `whatsapp_template_delegation_wrapper` foi criada em `037_unified_people_model.sql:23` sem
  DEFAULT, nunca foi semeada e não tem tela de edição — logo é NULL em todas as alas, e o envio
  delegado funciona caindo no default do código.
- Só dois consumidores leem essas colunas, e ambos tratam NULL:
  `InviteManagementSection.tsx:157` (`customTemplate ?? getDefaultPrayerTemplate`) e `:171`
  (`speechTemplateMap[...] || getDefaultSpeechTemplate`); `settings/whatsapp.tsx:87,95` passa
  `?? null` e o editor exibe `value ?? defaultText`.
- `v2-invite-delegation.test.tsx` já roda com as 5 colunas em `null` e prova que a mensagem sai
  com o texto padrão.
- Clientes 1.x também tratam NULL: `v1.x:…/settings/whatsapp.tsx:121`,
  `v1.x:…/whatsappUtils.ts:178`.

## Acceptance criteria (EARS)

- AC1: WHEN uma ala nova é criada, the system SHALL gravar a linha em `wards` sem definir nenhuma
  das 5 colunas `whatsapp_template_*`, em qualquer idioma.
- AC2: WHEN uma ala nova é criada, the system SHALL continuar gravando nome, estaca, idioma e
  fuso horário como hoje.
- AC3: WHERE a coluna do template está NULL, the system SHALL enviar a mensagem com o texto padrão
  do idioma da ala, sem exigir que alguém abra as Configurações.
- AC4: WHERE a coluna do template está NULL, the system SHALL exibir o texto padrão no editor de
  Configurações.
- AC5: WHEN alguém personaliza um template, the system SHALL gravar o texto e continuar usando-o.
- AC6: IF a redação padrão mudar no código, THEN a ala nova SHALL passar a usar a redação nova sem
  nenhum deploy da edge function.

## Open questions

Nenhuma.

## Notes

**Reversão de decisão (2026-08-06).** O spec anterior registrou "a edge function CONTINUA semeando".
Isso é revertido aqui, a pedido do usuário, depois de eu apresentar a fragilidade da cópia
congelada. O motivo original para semear — todo cliente ler o mesmo texto do banco durante a cauda
da 1.x — é temporário e expira no cutover da 2.0; o custo era permanente.

**Consequência aceita:** com NULL, a redação passa a vir da versão do app de quem envia. Dois
usuários da mesma ala em versões diferentes do app mandam redações levemente diferentes até o
cutover da 2.0. Não afeta dados, só o texto da mensagem.

**Cobertura que sai e onde ela passa a viver.** Os testes que afirmavam "semeia o texto certo por
idioma" deixam de fazer sentido. O que eles protegiam — a redação correta por idioma — continua
coberto por `whatsapp-utils.test.ts` (15 literais exatos) e o fallback por
`v2-invite-delegation.test.tsx` (roda com tudo NULL).

**DEPLOY NECESSÁRIO:** `supabase functions deploy register-first-user` — uma última vez, para que a
função implantada pare de semear. Depois disso, mudanças de redação nunca mais exigem deploy.
