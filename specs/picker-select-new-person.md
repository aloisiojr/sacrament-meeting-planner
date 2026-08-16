# Ao criar uma pessoa dentro do seletor, oferecer selecioná-la na hora

## Problem / intent

Dentro do seletor de pessoas existe um botão para adicionar alguém. Hoje, ao salvar, o editor apenas
fecha e o usuário volta para a lista, precisando encontrar e tocar na pessoa que acabou de criar —
e, se o seletor tiver capacidade associada, ainda leva um segundo diálogo perguntando se quer
conceder a capacidade. São três passos para o que quase sempre é uma intenção só: "criei esta pessoa
porque quero usá-la agora".

Passa a perguntar, logo após salvar, se a pessoa recém-criada deve ser selecionada para a ação em
curso. Dizendo sim, ela é selecionada — com a capacidade concedida por padrão, sem segundo diálogo.

## In scope / Out of scope

- **In:** `src/components/PeoplePicker.tsx` — o retorno do `PersonEditor` quando a pessoa é NOVA.
- **In:** chaves de i18n novas para a pergunta, nos 3 idiomas, incluindo a ação por contexto.
- **Out:** o fluxo de EDITAR alguém que já existe — continua fechando o editor e voltando à lista.
- **Out:** o diálogo de concessão de capacidade ao selecionar alguém já existente
  (`PeoplePicker.tsx:243`) e a concessão em massa ao salvar no modo múltiplo (`:212`) — ambos
  permanecem como estão.
- **Out:** `TopicSelectorModal` e o fluxo de adicionar tema.
- **Out:** mudar o que o `PersonEditor` grava.

## Baseline (evidence)

- `src/components/PeoplePicker.tsx:492-497` — `<PersonEditor … initialName={…} onSaved={() =>
  setEditorVisible(false)} />`. O `onSaved` recebe o membro salvo mas hoje o ignora.
- `:495` — ao adicionar, `initialName` vem do texto digitado na busca.
- `:242-262` — ao selecionar alguém sem a capacidade do contexto, pergunta antes de conceder.
- `:211-225` — no modo múltiplo, ao salvar, oferece conceder a capacidade a todos que não a têm.
- `:51-74` — `PickerContext` tem 8 valores (`speaker`, `opening_prayer`, `closing_prayer`,
  `preside`, `conduct`, `lead_music`, `play_piano`, `be_recognized`) e `CONTEXT_CAPABILITY` mapeia
  cada um para uma capacidade ou `null` (discursos e orações não têm capacidade).
- `:393` usa `people.pickerTitle`; `:444` usa `people.subtitles.${context}`. **Os subtítulos atuais
  não servem para a frase:** "Pessoas que podem presidir" produziria "Deseja selecionar Maria para
  Pessoas que podem presidir?".

## Acceptance criteria (EARS)

- AC1: WHEN o usuário salva uma pessoa NOVA criada de dentro do seletor, the system SHALL perguntar
  se deseja selecioná-la para a ação em curso, nomeando a pessoa e a ação.
- AC2: WHEN o usuário responde SIM em modo de seleção única, the system SHALL selecionar a pessoa e
  fechar o seletor, devolvendo o controle a quem o abriu, sem passar pela lista.
- AC3: WHEN o usuário responde SIM e o seletor tem capacidade associada, the system SHALL conceder
  essa capacidade à pessoa sem exibir nenhum diálogo adicional.
- AC4: WHEN o usuário responde NÃO, the system SHALL manter a pessoa gravada e voltar para a lista
  do seletor, sem selecioná-la.
- AC5: WHILE o seletor está em modo de múltipla escolha, WHEN o usuário responde SIM, the system
  SHALL marcar a pessoa na seleção e PERMANECER na lista.
- AC6: WHEN o usuário EDITA uma pessoa existente pelo seletor, the system SHALL fechar o editor e
  voltar à lista sem perguntar nada.
- AC7: WHERE o seletor não tem contexto de ação, the system SHALL perguntar sem nomear a ação.
- AC8: WHEN a pergunta é exibida, the system SHALL usar o idioma do app, nos 3 idiomas suportados.
- AC9: IF a gravação da pessoa falhar, THEN the system SHALL não perguntar nada e manter o
  comportamento de erro atual do editor.

## Open questions

Nenhuma.

## Notes

**Decisões do usuário (2026-08-15):** a ação vem do contexto do seletor; no modo múltiplo, marca e
continua na lista.

**Chaves de i18n novas.** Os subtítulos existentes descrevem o filtro da lista, não a ação, então é
preciso um grupo novo com a ação em forma verbal, 8 contextos × 3 idiomas. Em português a frase deve
ser neutra de gênero — "para o reconhecimento", não "para ser reconhecida". Esboço pt-BR:

| contexto | ação |
|---|---|
| `speaker` | o discurso |
| `opening_prayer` | a oração inicial |
| `closing_prayer` | a oração final |
| `preside` | presidir |
| `conduct` | dirigir |
| `lead_music` | reger |
| `play_piano` | tocar piano |
| `be_recognized` | o reconhecimento |

Aplicar a mesma checagem de terminologia da Igreja usada nos modelos de WhatsApp: em inglês
*conduct* é dirigir a reunião, e um discurso é *talk*, não *speech*.

**Offline.** A concessão de capacidade usa `updateMember.mutate`, que offline é enfileirada e
resolve `null`. O caminho existente em `:259-260` já trata isso selecionando o membro com a
capacidade aplicada localmente; o fluxo novo deve reusar essa mesma lógica em vez de recriá-la.

**Sem migração, sem deploy.**
