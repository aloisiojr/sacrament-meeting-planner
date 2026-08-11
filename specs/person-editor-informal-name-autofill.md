# Nome informal acompanha o primeiro nome enquanto ninguém o personalizar

## Problem / intent

Hoje o campo "Nome Informal" do editor de pessoa começa vazio. O informal é o que aparece nas
mensagens de WhatsApp (`{nome informal}`), e na prática quase sempre é o primeiro nome — o import
de PDF e a própria criação de membro já assumem isso.

**Correção de premissa (achada no baseline, 2026-08-11):** ao CRIAR, `useCreateMember`
(`useMembers.ts:130`) já grava `input.informal_name || primeiro nome`, então o dado não fica
faltando — ele é escolhido sem o usuário ver. Ao EDITAR, `useUpdateMember` não faz nada disso.
Logo as duas regras entregam coisas diferentes:

- **Criar** — o valor já vai para o banco hoje; o que falta é *mostrá-lo antes de salvar*, para o
  usuário conferir ou trocar em vez de descobrir depois.
- **Editar** — aqui há mudança real de comportamento: hoje trocar o nome completo deixa o informal
  apontando para o nome antigo, e ninguém percebe.

O editor deve preencher sozinho e continuar acompanhando o primeiro nome, até o momento em que
alguém escrever algo diferente ali.

## In scope / Out of scope

- **In:** `src/components/PersonEditor.tsx` — a única tela de criar/editar pessoa, usada pelo
  `PeoplePicker` e pelo `InviteManagementSection`.
- **In:** preenchimento na abertura quando o editor recebe um nome pré-preenchido (`initialName`).
- **In:** atualização ao sair do campo do nome completo, tanto criando quanto editando.
- **Out:** a tela de revisão do import de PDF (`PdfImportReview`) — o import já aplica a convenção
  ao gravar.
- **Out:** reescrever `informal_name` de pessoas já cadastradas; nada é migrado.
- **Out:** qualquer mudança de schema, de API ou de i18n.
- **Out:** tratar títulos eclesiásticos ("Bispo João") — não existe esse conceito no `main`.

## Baseline (evidence)

- `src/components/PersonEditor.tsx:122-123` — estados `fullName` e `informalName`.
- `:151-152` — modo edição: carrega `member.full_name` e `member.informal_name ?? ''`.
- `:166-167` — modo criação: carrega `initialName ?? ''` e informal **vazio**.
- `:333-334` e `:346-347` — os dois `TextInput`; o do nome completo **não tem `onBlur`** hoje.
- `:249` — grava `informalName.trim() || null`.
- A convenção "informal = primeiro nome" já existe em QUATRO lugares, com fallbacks levemente
  diferentes: `members.tsx:238`, `useApplyMemberImport.ts:51`, `useMembers.ts:130` (a criação) e
  `csvUtils.ts:207`. Nenhum deles é compartilhado.
- `useMembers.ts:160` — `useUpdateMember` NÃO aplica a convenção; o caminho de edição é o único
  sem nenhuma rede de proteção.
- Não existe `src/lib/nameUtils.ts` no `main` (era da branch UX-2.0, descartada), então não há
  tratamento de títulos a considerar.

## Acceptance criteria (EARS)

- AC1: WHEN o editor abre para criar uma pessoa com um nome pré-preenchido, the system SHALL
  preencher o nome informal com o primeiro nome desse nome.
- AC2: WHEN o campo do nome completo perde o foco E o nome informal está vazio, the system SHALL
  preencher o nome informal com o primeiro nome.
- AC3: WHILE o nome informal for igual ao primeiro nome anterior, WHEN o campo do nome completo
  perde o foco com um primeiro nome diferente, the system SHALL atualizar o nome informal para o
  novo primeiro nome. Isso vale tanto criando quanto editando.
- AC9: WHEN o formulário é salvo, the system SHALL aplicar a mesma reconciliação antes de montar o
  payload, mesmo que o campo do nome completo nunca tenha perdido o foco.
- AC10: IF o nome informal já diz a mesma coisa que o primeiro nome atual (ignorando caixa e
  acentos), THEN the system SHALL deixá-lo exatamente como está, sem renormalizar a grafia.
- AC4: IF o nome informal foi personalizado (não é igual ao primeiro nome anterior nem está vazio),
  THEN the system SHALL deixá-lo intocado quando o nome completo mudar.
- AC5: WHEN comparar o nome informal com o primeiro nome anterior, the system SHALL ignorar
  maiúsculas/minúsculas, acentos e espaços em volta.
- AC6: IF o nome completo estiver vazio ou só com espaços, THEN the system SHALL deixar o nome
  informal como está, sem apagá-lo.
- AC7: WHEN o editor abre para editar uma pessoa existente, the system SHALL exibir o
  `informal_name` gravado sem alterá-lo.
- AC8: WHEN o usuário digita no campo do nome informal, the system SHALL respeitar o que foi
  digitado e não sobrescrevê-lo por causa de uma edição posterior do nome completo — exceto quando
  o digitado coincidir com o primeiro nome anterior (AC3).

## Open questions

Nenhuma.

## Notes

**Decisões do usuário (2026-08-11):**
- O automático **nunca sobrescreve** um informal já digitado (AC4).
- Quando o nome vem pré-preenchido, o informal é preenchido **na abertura** do editor, não só no
  blur — senão quem salva sem tocar no campo ficaria sem informal (AC1).
- A comparação **ignora maiúsculas e acentos**, para que "joao" conte como igual a "João" (AC5).
- Fora de escopo: a revisão do import de PDF.

**Assumido por mim, explicitado ao usuário:** as duas regras que ele descreveu (preencher ao criar,
acompanhar ao editar) são tratadas como uma só — *o informal segue o primeiro nome até alguém
personalizá-lo*. Sem isso, criar "João Silva" e corrigir para "Pedro Silva" antes de salvar
deixaria o informal em "João", o que contraria a intenção.

**"Primeiro nome"** = primeiro token separado por espaço do nome completo com `trim`. Mesma regra
já usada em `members.tsx:238`.

**Comparação com o primeiro nome ANTERIOR:** a regra depende do valor que o nome completo tinha
antes desta edição, então o componente precisa lembrar o último nome completo aplicado — não basta
olhar o estado atual.

**AC9 e AC10 vieram da verificação adversarial (2026-08-11), não do pedido original.**

- **AC9 — o pedido dizia "quando o foco sair do campo", e o código cumpria isso à risca. Só que o
  botão Salvar fica no cabeçalho, FORA do `ScrollView`: tocar nele não tira o foco de um
  `TextInput`.** Editar o nome e salvar direto — o fluxo mais provável — não disparava o `onBlur`.
  Na criação o fallback de `useMembers.ts:130` disfarçava; na edição, que é a metade que esta
  mudança existe para consertar, o informal continuava apontando para o nome antigo. Estendido para
  o salvar; se o usuário preferir a semântica literal de só-no-blur, basta reverter esse commit.
- **AC10** — sem essa guarda, apenas visitar o campo do nome reescrevia um informal "joao" como
  "Joao". Era uma escrita que o usuário não pediu, e o espelho invertido da promessa do AC4.

**Comportamento conhecido, deliberado:** se alguém apagar o nome informal de propósito e depois
mexer no nome completo, o informal volta a ser preenchido (AC2). Não há como salvar uma pessoa com
informal em branco se o campo do nome for revisitado. Aceitável porque `useCreateMember` já impunha
o primeiro nome de qualquer forma.

**Sem deploy, sem migração.** Mudança de cliente apenas.
