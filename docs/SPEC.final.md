# SPEC.final — Gerenciador da Reuniao Sacramental

**Data:** 14 de Fevereiro de 2026
**Versao:** 1.0

> Este documento consolida TODA a especificacao do projeto: user stories, acceptance criteria,
> edge cases, assumptions, modelo de dados, stack tecnologico e especificacoes visuais.

---

## 1. Goal

Construir um app multi-plataforma (iOS, Android, Web) para gerenciar designacoes de discursos e a agenda da reuniao sacramental em alas da Igreja SUD, permitindo ao bispado designar discursantes/temas, ao secretario montar a agenda completa da reuniao e gerenciar convites via WhatsApp, com isolamento de dados entre alas e suporte a i18n (pt-BR, en, es).

---

## 2. In Scope

- CRUD de membros (manual + importacao/exportacao via CSV) em iOS, Android e Web
- CRUD de temas na Colecao da Ala + ativacao/desativacao de Colecoes Gerais
- Marcacao de tipo de domingo (Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro) via dropdown no card expandido das abas Discursos e Home
- Auto-atribuicao em lote do tipo de domingo ao carregar a lista, com persistencia imediata
- Designacao de discursantes e temas (3 discursos por domingo: 1o, 2o, 3o Discurso)
- Ciclo de status: Nao-designado → Designado/Nao-Convidado → Convidado → Confirmado | Desistiu
- Indicadores de status como LEDs 3D com animacao
- Aba Home personalizada por papel (Bispado, Secretario, Observador)
- Integracao com WhatsApp via links wa.me com mensagem pre-preenchida
- Sincronizacao entre abas em ate 5 segundos (Realtime + polling fallback)
- Scroll infinito na aba Discursos (12 meses passados + 12 meses futuros, +6 ao scroll)
- i18n: pt-BR, en, es (interface + Colecoes Gerais por idioma)
- Multi-tenancy com isolamento completo de dados entre Alas (RLS)
- 3 papeis: Bispado (total), Secretario (sem designacao), Observador (somente leitura)
- CRUD completo de usuarios (criar, listar, editar papel, remover)
- Suporte offline com sincronizacao ao reconectar
- Dark mode e light mode com deteccao automatica do sistema
- Dialogo de confirmacao ao sair do app
- Suporte a gerenciadores de senha na tela de login
- Script admin para importacao de Colecoes Gerais via CSV
- Aba Agenda para configurar a agenda completa da reuniao sacramental de cada domingo
- Cadastro de atores da reuniao (quem preside, dirige, reconhecer, musica) com gestao inline
- Tabela de hinos da Igreja com suporte a i18n, importada via script admin
- Modo Apresentacao da reuniao sacramental: tela full-screen read-only com cards acordeao
- Designacao de discursantes diretamente pela aba Agenda (Bispado + Secretario)
- Push notifications para fluidez no fluxo de designacoes: notificacao ao secretario apos designacao (5 min, agrupada por domingo), lembrete semanal para bispado/secretario, notificacao imediata ao confirmar ou desistir
- Fuso horario configuravel por ala para agendamento de notificacoes
- Self-registration do primeiro usuario de uma ala (cria ala + usuario sem CLI)
- Convite por link (deep link) para novos usuarios, gerado por Bispado ou Secretario
- Historico de acoes (audit log) read-only com busca, retencao de 2 anos

## 3. Out of Scope

- Envio direto de mensagens (SMS/email) — app so abre links wa.me (push notifications sao suportadas)
- Gestao de outros aspectos da ala (frequencia, chamados, financas)
- Colaboracao multi-usuario simultanea
- Integracao com sistemas oficiais da Igreja SUD
- Gestao de Estacas
- Fotos de membros
- Autenticacao federada / SSO
- Relatorios e analytics
- Historico de auditoria detalhado
- Lista de convites pendentes na UI (apenas botao convidar)

---

## 4. Personas e Permissoes

### 4.1 Personas

| Persona | Descricao |
|---------|-----------|
| **Bispado** | Bispo + 2 Conselheiros (3 pessoas por ala). Responsaveis por decisoes estrategicas — designam discursantes e temas, alteram status, gerenciam usuarios, convidam novos usuarios por link. |
| **Secretario** | 1 pessoa por ala. Executa decisoes do bispado — gerencia membros, temas, excecoes, altera status, envia convites via WhatsApp, convida novos usuarios por link. |
| **Observador** | Membros com acesso somente-leitura. Visualizam discursos e designacoes sem poder editar. Sem acesso a aba Configuracoes. |
| **Admin do Sistema** | Papel tecnico (nao usa o app). Importa Colecoes Gerais via script CSV. |

### 4.2 Tabela de Permissoes

| Permissao | Bispado | Secretario | Observador |
|-----------|---------|------------|------------|
| Designar discursantes/temas | ✅ | ❌ | ❌ |
| Alterar status de discursos | ✅ | ✅ | ❌ |
| Remover designacao | ✅ | ❌ | ❌ |
| Gerenciar membros (CRUD) | ✅ | ✅ | ❌ |
| Gerenciar temas da Ala | ✅ | ✅ | ❌ |
| Ativar/desativar Colecoes | ✅ | ✅ | ❌ |
| Marcar tipo de domingo (dropdown) | ✅ | ✅ | ❌ (visivel, desabilitado) |
| Gerenciar convites WhatsApp | ❌ | ✅ | ❌ |
| Configurar idioma da Ala | ✅ | ✅ | ❌ |
| Gerenciar usuarios (CRUD) | ✅ | ❌ | ❌ |
| Convidar usuarios (link) | ✅ | ✅ | ❌ |
| Visualizar Historico | ✅ | ✅ | ❌ |
| Visualizar Home (3 domingos) | ✅ | ✅ | ✅ (read-only) |
| Visualizar aba Discursos | ✅ | ✅ | ✅ (read-only) |
| Acessar aba Configuracoes | ✅ | ✅ | ❌ |
| Ver "Proximas designacoes" | ✅ | ❌ | ❌ |
| Ver "Gerenciamento de convites" | ❌ | ✅ | ❌ |
| Alterar tema visual (dark/light) | ✅ | ✅ | Sistema apenas |
| Editar agenda da reuniao | ✅ | ✅ | ❌ (read-only) |
| Designar discursante via Agenda | ✅ | ✅ | ❌ |
| Visualizar aba Agenda | ✅ | ✅ | ✅ (read-only) |
| Iniciar Modo Apresentacao | ✅ | ✅ | ✅ (read-only) |
| Receber push notifications | ✅ | ✅ | ❌ |

### 4.3 Modelo de Permissoes (lib/permissions.ts)

```typescript
type Role = 'bishopric' | 'secretary' | 'observer';

type Permission =
  | 'speech:assign' | 'speech:unassign' | 'speech:change_status'
  | 'member:read' | 'member:write' | 'member:import'
  | 'topic:write' | 'collection:toggle' | 'sunday_type:write'
  | 'settings:access' | 'settings:language' | 'settings:whatsapp' | 'settings:users'
  | 'invite:manage' | 'home:next_assignments' | 'home:invite_mgmt'
  | 'agenda:read' | 'agenda:write' | 'agenda:assign_speaker'  //
  | 'presentation:start'                                       //
  | 'push:receive'                                              //
  | 'invitation:create'                                        //
  | 'history:read';                                             //
```

---

## 5. Stack Tecnologico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React Native + Expo SDK 54, TypeScript, Expo Router (file-based) |
| State Management | TanStack Query (server state), React Context (theme, auth) |
| Backend | Supabase (Auth, PostgREST, Realtime, Edge Functions) |
| Banco de Dados | PostgreSQL com RLS (Row-Level Security) |
| i18n | react-i18next com locales pt-BR, en, es |
| Testes | Vitest (unit, integration, component) |
| Offline | Fila de mutacoes em AsyncStorage + last-write-wins |
| Push Notifications | Expo Push Notifications (expo-notifications) + Supabase Edge Function |
| Gestos | react-native-gesture-handler + react-native-reanimated |
| Deep Links | expo-linking (para convites por link) |

---

## 6. Modelo de Dados

### 6.1 Tabelas

#### wards
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador da ala |
| name | text NOT NULL | Nome da ala |
| stake_name | text NOT NULL | Nome da estaca |
| language | text NOT NULL DEFAULT 'pt-BR' | Idioma (pt-BR, en, es) |
| timezone | text NOT NULL DEFAULT 'America/Sao_Paulo' | Fuso horario IANA da ala (ex: America/New_York) |
| whatsapp_template | text NOT NULL | Template editavel para mensagens |
| created_at / updated_at | timestamptz | Timestamps |

**Unique:** `(stake_name, name)`

#### users (via auth.users do Supabase)
```json
{
  "app_metadata": {
    "ward_id": "uuid",
    "role": "bishopric | secretary | observer"
  }
}
```
Gerenciado via 6 Edge Functions: `register-first-user`, `create-invitation`, `register-invited-user`, `list-users`, `update-user-role`, `delete-user`.

#### members
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | Ala do membro |
| full_name | text NOT NULL | Nome completo |
| country_code | text NOT NULL | Codigo do pais (ex: "+55") |
| phone | text NOT NULL | Numero sem codigo |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, country_code, phone)`

#### ward_topics
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| title | text NOT NULL | Titulo do tema |
| link | text NULL | URL opcional |
| created_at / updated_at | timestamptz | |

#### general_collections / general_topics
Colecoes globais por idioma, sem ward_id. Importadas via script admin.

#### ward_collection_config
Ponte entre ala e colecoes gerais. Campo `active` (boolean) controla ativacao.

#### sunday_exceptions
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| date | date NOT NULL | Data do domingo |
| reason | text NOT NULL | Tipo do domingo |

**Unique:** `(ward_id, date)` — **Check:** apenas domingos
**Valores validos de reason:** `Discursos`, `Reuniao de Testemunho`, `Conferencia Geral`, `Conferencia de Estaca`, `Conferencia de Ala`, `Apresentacao Especial da Primaria`, `Outro`
**Nota:** "Discursos" indica domingo normal com discursos (sem excecao). Todos os domingos possuem uma entrada nesta tabela apos a auto-atribuicao em lote.
**Nota:** Para reason = "Outro", o campo `reason` contem o texto customizado digitado pelo usuario (ex: "Feriado local").
**Auto-atribuicao em lote:** Ao carregar a lista de domingos (aba Discursos ou Home), para cada domingo sem entrada nesta tabela:
- Padrao: `Discursos`
- 1o domingo de Jan, Fev, Mar, Mai, Jun, Jul, Ago, Set, Nov, Dez: `Reuniao de Testemunho`
- 1o domingo de Abr e Out: `Conferencia Geral`
- 2o domingo de Abr e Out: `Reuniao de Testemunho`
- Todos os valores auto-atribuidos sao persistidos imediatamente no banco.
- Ao carregar +6 meses (scroll infinito), a auto-atribuicao roda para os novos domingos.

#### speeches
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| sunday_date | date NOT NULL | Data do domingo |
| position | smallint NOT NULL (1,2,3) | 1o, 2o, 3o Discurso |
| member_id | uuid FK→members NULL | Referencia ao membro (NULL se removido) |
| speaker_name | text NULL | Snapshot do nome |
| speaker_phone | text NULL | Snapshot do telefone |
| topic_title | text NULL | Snapshot do titulo do tema |
| topic_link | text NULL | Snapshot do link |
| topic_collection | text NULL | Snapshot da colecao |
| status | text NOT NULL DEFAULT 'not_assigned' | Status do discurso |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, sunday_date, position)`
**Status validos:** `not_assigned`, `assigned_not_invited`, `assigned_invited`, `assigned_confirmed`, `gave_up`

### 6.2 Snapshot Pattern (ADR-005)

Discursos armazenam `speaker_name`, `speaker_phone`, `topic_title`, `topic_link`, `topic_collection` como texto denormalizado. Exclusao de membro/tema preserva dados historicos. Edicao de membro NAO propaga para discursos existentes (by design).

### 6.3 Tabelas da Agenda

#### meeting_actors
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala |
| name | text NOT NULL | Nome do ator |
| can_preside | boolean NOT NULL DEFAULT false | Pode presidir a reuniao |
| can_conduct | boolean NOT NULL DEFAULT false | Pode dirigir a reuniao (implica can_preside) |
| can_recognize | boolean NOT NULL DEFAULT false | Pode ser reconhecido (autoridades visitantes, etc.) |
| can_music | boolean NOT NULL DEFAULT false | Pode ser pianista ou regente |
| created_at / updated_at | timestamptz | |

**Indices:** `(ward_id, name)`
**Regra:** Se `can_conduct = true`, `can_preside` e automaticamente `true` (enforced pela aplicacao)

#### hymns
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| language | text NOT NULL | Idioma (pt-BR, en, es) |
| number | integer NOT NULL | Numero do hino no hinario |
| title | text NOT NULL | Titulo do hino |
| is_sacramental | boolean NOT NULL DEFAULT false | Se e um hino sacramental |

**Unique:** `(language, number)`
**Indices:** `(language)`, `(language, is_sacramental)`
**Nota:** Tabela global, sem ward_id. Importada via script `import-hymns`. ~300 hinos por idioma.

#### sunday_agendas
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | |
| sunday_date | date NOT NULL | Data do domingo |
| — BOAS-VINDAS E ANUNCIOS — | | |
| presiding_name | text NULL | Snapshot: nome de quem preside |
| presiding_actor_id | uuid FK→meeting_actors NULL | Ref ao ator (NULL se deletado) |
| conducting_name | text NULL | Snapshot: nome de quem dirige |
| conducting_actor_id | uuid FK→meeting_actors NULL | |
| recognized_names | jsonb NULL | Snapshot: array de nomes reconhecidos |
| announcements | text NULL | Anuncios (texto livre) |
| pianist_name | text NULL | Snapshot: nome do pianista |
| pianist_actor_id | uuid FK→meeting_actors NULL | |
| conductor_name | text NULL | Snapshot: nome do regente |
| conductor_actor_id | uuid FK→meeting_actors NULL | |
| opening_hymn_id | uuid FK→hymns NULL | Primeiro hino |
| opening_prayer_member_id | uuid FK→members NULL | Membro que faz a 1a oracao |
| opening_prayer_name | text NULL | Nome de quem faz a 1a oracao (membro ou customizado) |
| — DESIGNACOES E SACRAMENTO — | | |
| sustaining_releasing | text NULL | Apoios e desobrigacoes (texto livre) |
| has_baby_blessing | boolean NOT NULL DEFAULT false | Tem bencao de recem-nascidos? |
| baby_blessing_names | text NULL | Nomes dos bebes (texto livre, se has_baby_blessing=true) |
| has_baptism_confirmation | boolean NOT NULL DEFAULT false | Tem confirmacao de batismo? |
| baptism_confirmation_names | text NULL | Nomes (texto livre, se has_baptism_confirmation=true) |
| has_stake_announcements | boolean NOT NULL DEFAULT false | Tem anuncios da Estaca? |
| sacrament_hymn_id | uuid FK→hymns NULL | Hino sacramental (subset Sacramental=S) |
| — DISCURSOS (reuniao normal) — | | |
| has_special_presentation | boolean NOT NULL DEFAULT false | Tem apresentacao especial entre 1o e 2o discurso? |
| special_presentation_description | text NULL | Descricao da apresentacao especial |
| intermediate_hymn_id | uuid FK→hymns NULL | Hino intermediario (se has_special_presentation=false) |
| — ENCERRAMENTO — | | |
| closing_hymn_id | uuid FK→hymns NULL | Hino final |
| closing_prayer_member_id | uuid FK→members NULL | Membro que faz a ultima oracao |
| closing_prayer_name | text NULL | Nome de quem faz a ultima oracao (membro ou customizado) |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, sunday_date)`
**Nota:** Os discursos (1o, 2o, 3o) vem da tabela `speeches` via JOIN por `(ward_id, sunday_date)`. A agenda referencia indiretamente os speeches pela data.
**Nota:** O tipo de reuniao (normal, testemunho, conferencia de ala, primaria) e determinado pela tabela `sunday_exceptions`. Se o domingo tem excecao "Reuniao de Testemunho", "Conferencia de Ala" ou "Apresentacao Especial da Primaria", a agenda usa o layout de reuniao especial. Caso contrario, usa layout normal.
**Nota:** Atores sao armazenados como snapshot (nome) + FK opcional (para lookup). Se o ator for deletado, o nome permanece na agenda.
**Nota:** Hinos sao armazenados como FK (referencia). Se um hino for removido da tabela, a FK fica NULL.
**Nota:** Oracoes: se e um membro da ala, `*_member_id` aponta para `members` e `*_name` contem o snapshot do nome. Se e um nome customizado, `*_member_id` e NULL e `*_name` contem o nome digitado.

#### device_push_tokens
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK→auth.users NOT NULL | Usuario dono do dispositivo |
| ward_id | uuid FK→wards NOT NULL | Ala do usuario |
| expo_push_token | text NOT NULL | Token do Expo Push Notifications |
| created_at / updated_at | timestamptz | |

**Unique:** `(user_id, expo_push_token)`
**Nota:** Um usuario pode ter multiplos dispositivos (tokens). Observadores NAO registram tokens (nao recebem push).
**Nota:** Token atualizado a cada login ou abertura do app. Tokens invalidos removidos automaticamente apos falha de envio.

#### notification_queue
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala |
| type | text NOT NULL | Tipo: designation, weekly_assignment, weekly_confirmation, speaker_confirmed, speaker_withdrew |
| sunday_date | date NOT NULL | Domingo relacionado |
| speech_position | smallint NULL | Posicao do discurso (1,2,3) — para types speaker_confirmed e speaker_withdrew |
| speaker_name | text NULL | Nome do discursante (snapshot) |
| target_role | text NOT NULL | Destinatario: secretary, bishopric, secretary_and_bishopric |
| status | text NOT NULL DEFAULT 'pending' | pending, sent, cancelled |
| send_after | timestamptz NOT NULL | Momento a partir do qual pode ser enviada |
| created_at | timestamptz | |

**Nota:** Para type=designation: send_after = created_at + 5 min. Notificacoes do mesmo (ward_id, sunday_date, type=designation) sao agrupadas em um unico push ao enviar.
**Nota:** Para type=speaker_confirmed e speaker_withdrew: send_after = created_at (envio imediato).
**Nota:** Para type=weekly_assignment e weekly_confirmation: send_after = proximo domingo 18:00 no fuso da ala.
**Nota:** Uma Edge Function agendada (cron, a cada minuto) processa notificacoes pendentes com send_after <= now().

#### invitations
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala do convite |
| email | text NOT NULL | Email do convidado |
| role | text NOT NULL | Papel: bishopric, secretary, observer |
| token | text NOT NULL UNIQUE | Token unico para o deep link |
| expires_at | timestamptz NOT NULL | Data de expiracao (created_at + 30 dias) |
| used_at | timestamptz NULL | NULL se nao usado; preenchido ao completar registro |
| created_by | uuid FK→auth.users NOT NULL | Quem criou o convite |
| created_at | timestamptz | |

**Nota:** Token gerado aleatoriamente, unico no sistema. Deep link: `wardmanager://invite/{token}`.
**Nota:** Convite expira em 30 dias (expires_at = created_at + 30 dias).
**Nota:** Reenvio permitido: novo convite para mesmo email cria novo registro (token diferente).

#### activity_log
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala onde a acao ocorreu |
| user_id | uuid FK→auth.users NOT NULL | Usuario que executou a acao |
| user_email | text NOT NULL | Snapshot do email do usuario |
| action_type | text NOT NULL | Tipo da acao (ver lista abaixo) |
| description | text NOT NULL | Descricao legivel da acao (no idioma da ala no momento da acao) |
| created_at | timestamptz NOT NULL DEFAULT now() | Data-hora da acao |

**Indices:** `(ward_id, created_at DESC)` para consulta paginada ordenada
**Retencao:** Entradas com mais de 2 anos sao removidas automaticamente (cron ou database job)
**Read-only:** Entradas nunca sao editadas ou apagadas manualmente. Apenas o job de retencao remove entradas antigas.

**Valores validos de action_type:**
- `member:create` — Membro adicionado
- `member:update` — Membro editado (nome, telefone)
- `member:delete` — Membro removido
- `member:import` — Lista de membros sobrescrita via CSV
- `topic:create` — Tema da Ala criado
- `topic:update` — Tema da Ala editado
- `topic:delete` — Tema da Ala removido
- `collection:activate` — Colecao Geral ativada
- `collection:deactivate` — Colecao Geral desativada
- `sunday_type:change` — Tipo de domingo alterado
- `speech:assign` — Discursante e/ou tema designado
- `speech:unassign` — Designacao removida
- `speech:status_change` — Status de discurso alterado
- `user:self_register` — Primeiro usuario se registrou (self-registration)
- `user:invite` — Convite por link gerado
- `user:register_via_invite` — Usuario se registrou via convite
- `user:role_change` — Papel de usuario alterado
- `user:delete` — Usuario removido
- `settings:language` — Idioma da ala alterado
- `settings:timezone` — Fuso horario da ala alterado
- `settings:whatsapp_template` — Template WhatsApp editado
- `agenda:edit` — Agenda de domingo editada
- `actor:create` — Ator da reuniao criado
- `actor:update` — Ator da reuniao editado
- `actor:delete` — Ator da reuniao removido

**Nota:** Acoes automaticas do sistema (auto-atribuicao de tipo de domingo, lazy creation de speeches/agendas, processamento de push notifications, registro de token) NAO sao logadas.
**Nota:** A descricao e gerada no idioma da ala no momento da acao. Se o idioma mudar depois, descricoes antigas permanecem no idioma original (snapshot).

**Exemplos de descricao (pt-BR):**
- "Adicionou o membro Joao Silva (+5511987654321)"
- "Editou o membro Joao Silva: nome alterado para Joao Pedro Silva"
- "Removeu o membro Joao Silva"
- "Importou lista de membros via CSV (52 membros)"
- "Designou Joao Silva para o 1o discurso do dia 08 FEV com o tema 'Fe em Jesus Cristo'"
- "Alterou o status do 1o discurso de Joao Silva (08 FEV) para 'Confirmado'"
- "Convidou secretario@email.com para a ala como Secretario"
- "Alterou o tipo do domingo 13 ABR para 'Conferencia de Estaca'"
- "Editou a agenda do domingo 16 FEV"

---

## 7. Especificacao por Tela

### 7.1 Tela de Login

**Titulo:** "Gerenciador da Reuniao Sacramental" (i18n)
**Subtitulo:** "discursos e agenda" (i18n)

**Campos:**
- Email: `textContentType="emailAddress"`, `autoComplete="email"`
- Senha: `textContentType="password"`, `autoComplete="password"`, `secureTextEntry`

**Comportamento:**
- Gerenciadores de senha detectam e preenchem os campos automaticamente
- Login com credenciais invalidas mostra erro: "Email ou senha incorretos"
- Login com credenciais validas redireciona para Home
- Usuario nao autenticado e redirecionado para tela de login (AC-041)
- **Link/botao abaixo do botao Login:** "Criar conta para o primeiro usuario de uma Ala"
  - pt: "Criar conta para o primeiro usuario de uma Ala"
  - en: "Create account for the first user of a Ward"
  - es: "Crear cuenta para el primer usuario de una Ala"
  - Ao clicar: navega para tela de Self-Registration (secao 7.1.1)

---

### 7.1.1 Tela de Self-Registration

**Campos:**
- Email (obrigatorio, formato valido)
- Senha (obrigatorio, minimo 6 caracteres)
- Confirmar Senha (deve ser igual a Senha)
- Estaca (texto livre, obrigatorio)
- Ala (texto livre, obrigatorio)
- Papel (dropdown: Bispado, Secretario — sem Observador)
- Lingua (dropdown: pt-BR, en, es)
- Fuso Horario (auto-detect do device, editavel — formato IANA)

**Validacoes:**
- Email: formato valido, nao existe no sistema
- Senha: minimo 6 caracteres
- Confirmar Senha: deve ser igual a Senha
- Estaca + Ala: combinacao nao existe no sistema
  - pt: "Esta combinacao de Estaca e Ala ja existe."
  - en: "This Stake and Ward combination already exists."
  - es: "Esta combinacion de Estaca y Ala ya existe."
- Todos os campos obrigatorios preenchidos

**Ao clicar "Criar":**
1. Edge Function `register-first-user` cria ward (com stake_name, name, language, timezone, whatsapp_template default) + user (com app_metadata ward_id e role)
2. Usuario logado automaticamente
3. Redireciona para Home

---

### 7.1.2 Tela de Registro por Convite

**Acesso:** Via deep link nativo (Expo): `wardmanager://invite/{token}`

**Campos exibidos (read-only, do convite):**
- Estaca (read-only)
- Ala (read-only)
- Papel (read-only)
- Email (pre-preenchido, read-only)

**Campo editavel:**
- Senha (minimo 6 caracteres)
- Confirmar Senha (deve ser igual a Senha)

**Ao clicar "Criar conta":**
1. Edge Function `register-invited-user` valida token:
   - Se token expirado: erro "Convite expirado. Solicite um novo convite."
     - pt: "Convite expirado. Solicite um novo convite."
     - en: "Invitation expired. Request a new invitation."
     - es: "Invitacion expirada. Solicite una nueva invitacion."
   - Se token ja usado: erro "Este convite ja foi utilizado."
     - pt: "Este convite ja foi utilizado."
     - en: "This invitation has already been used."
     - es: "Esta invitacion ya fue utilizada."
   - Se valido: cria user, preenche `used_at`, loga automaticamente
2. Redireciona para Home

---

### 7.2 Aba Home

#### 7.2.1 Secao "Proximos 3 Domingos" (todos os papeis)

- 3 cards contraidos: DateBlock a esquerda, 3 LEDs 3D a direita (AC-031)
- Domingos com excecao mostram motivo em vez de LEDs
- Card expande ao clicar, conteudo aparece ABAIXO do header fixo
- Header (data + LEDs/texto) NAO muda de posicao ao expandir/fechar
- Ao expandir, lista rola para que todo o conteudo fique visivel
- **Dropdown de tipo de domingo** no topo do card expandido, logo abaixo do titulo
  - Opcoes: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro
  - Quando "Discursos": mostra campos de discursantes e temas (comportamento normal)
  - Quando excecao selecionada: campos de discursos somem
  - Quando "Outro": dialogo para digitar motivo customizado + OK
  - Se domingo tinha discursos e usuario seleciona excecao: dialogo de confirmacao para apagar speeches
  - Observador: dropdown visivel mas desabilitado
- Bispado pode designar discursantes/temas (AC-032)
- Secretario pode alterar status e tipo de domingo, NAO pode designar (AC-033)
- Observador somente visualiza (AC-034)

#### 7.2.2 Secao "Proximas Designacoes" (Bispado apenas)

- Aparece quando todos 9 discursos dos proximos 3 domingos estao designados (AC-035)
- Mostra primeiro domingo apos os 3 proximos com designacoes pendentes
- Desaparece quando nao ha mais pendencias (AC-036)

#### 7.2.3 Secao "Gerenciamento de Convites" (Secretario apenas)

- Lista de designacoes com status Nao-Convidado ou Convidado (AC-037)
- Ordenadas por data
- Para Nao-Convidado: abre WhatsApp, muda status para Convidado (AC-038)
- Para Convidado: opcoes ir p/ WhatsApp, marcar Confirmado, marcar Desistiu (AC-039)

---

### 7.3 Aba Discursos

#### 7.3.1 Lista de Domingos

- Range inicial: 12 meses passados + 12 meses futuros (AC-023)
- Scroll inicial posiciona no proximo domingo, sem animacao (AC-023)
- Scroll suave sem desaparecer, sem spinner, sem reposicionar
- Scroll infinito: +6 meses ao atingir limites (AC-028, AC-029)
- Novos dados carregados sem remover existentes da tela
- Separadores de ano intercalados na lista

#### 7.3.2 Card de Domingo (contraido)

- **DateBlock** a esquerda: dia com 2 digitos (zero-padding), mes com 3 letras cuja largura iguala a do dia
- Margem esquerda equilibrada visualmente com margem direita
- 3 **LEDs 3D** a direita (ou texto de excecao)
- Domingos passados: opacidade reduzida quando contraido
- Proximo domingo: borda primaria destacada

#### 7.3.3 Card de Domingo (expandido)

- Header fixo — mesma posicao que no estado contraido
- **Dropdown de tipo de domingo** no topo, logo abaixo do header
  - Opcoes: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro
  - Editavel por Bispado e Secretario; Observador: visivel mas desabilitado
  - "Outro": abre dialogo para digitar motivo customizado + OK
- **Quando dropdown = "Discursos"** (sem excecao):
  - Conteudo (3 discursos) aparece ABAIXO do dropdown
  - Speeches criados via lazy creation ao expandir (se nao existiam)
  - Cada discurso mostra:
    - Label ordinal: "1o Discurso", "2o Discurso", "3o Discurso" (Unicode U+00BA)
    - Campo Discursante com **seta dropdown** na direita
    - Campo Tema com **seta dropdown** na direita
    - LED de status + texto do status
  - Menu de status abre ao clicar no LED **ou** no texto do status
  - Ao expandir, lista rola para que todo o conteudo fique visivel
- **Quando dropdown = excecao** (qualquer valor exceto "Discursos"):
  - Campos de discursos NAO aparecem (somem)
  - Card mostra apenas o dropdown com o valor selecionado
- **Mudar de "Discursos" para excecao:**
  - Se domingo tinha discursantes ou temas designados: dialogo de confirmacao
  - "Os discursos designados para este domingo serao apagados. Deseja continuar?"
  - Ao confirmar: apaga entries da tabela `speeches` para aquele (ward_id, sunday_date)
  - Ao cancelar: dropdown volta para "Discursos"
- **Mudar de excecao para "Discursos":**
  - Cria 3 speeches vazios imediatamente
  - Campos de discursos aparecem

#### 7.3.4 StatusLED 3D

| Status | Efeito Visual |
|--------|--------------|
| Nao-designado | LED apagado (cinza, sem brilho) |
| Designado/Nao-Convidado | LED com fading continuo entre apagado e amarelo |
| Designado/Convidado | LED aceso em amarelo fixo |
| Designado/Confirmado | LED aceso em verde forte |
| Desistiu | LED aceso em vermelho forte |

- Efeito 3D: gradiente radial (centro claro → borda escura)
- Animacao de fading: ~2s por ciclo (1s fade-in, 1s fade-out)
- `Reduzir movimento` ativado: LED mostra cor estatica sem animacao
- Tamanho: 16px (card aberto), 14px (card fechado)
- **Pressable:** abre menu de status ao clicar

#### 7.3.5 DateBlock

- Dia em cima: fonte 26px bold, **zero-padding** (01, 02, ... 09)
- Mes embaixo: 3 letras, fonte ajustada para largura = largura do dia
- Ano (se diferente do atual): ao lado do mes em fonte menor (ex: "fev 27")
- Container: 48px largura, alinhado a esquerda do card
- Margem esquerda equilibrada com margem direita
- Opacidade reduzida para datas passadas
- i18n: mes abreviado no idioma da ala (fev/Feb/feb)

---

### 7.4 Configuracoes > Membros

#### 7.4.1 Lista de Membros

- Cards contraidos: nome e telefone
- **Tap no card NAO abre edicao**
- **Swipe para a esquerda** revela 2 botoes: lapis (editar) e lixeira (excluir)
- Apenas 1 card com botoes revelados por vez
- Swipe so ativa apos threshold (~20px horizontal com pouco vertical)
- Botao FAB (+) no canto inferior direito para adicionar
- Campo de busca com filtro em tempo real (debounce ≤300ms, case-insensitive, sem acentos) (AC-002)
- Observador: swipe desabilitado

#### 7.4.2 Card de Edicao de Membro

- Campos nome e telefone: **largura total** da tela
- Campo codigo internacional: **largura compacta** (apenas conteudo)
- **Bandeira emoji** do pais no campo de codigo (ex: 🇧🇷 +55)
- **Sem botoes Salvar/Cancelar** — auto-save ao fechar o card
- Clicar fora do card fecha e salva automaticamente (AC-005)
- Se nada foi alterado, fecha sem requisicao ao backend
- Nome ou telefone vazio: dialogo de erro, reverte para original (AC-006)
- Clicar no campo de codigo internacional NAO deve fechar o card

#### 7.4.3 Dropdown de Codigo Internacional

- Lista com scroll interno, nao ultrapassa limites visuais
- Posiciona acima do campo se proximo ao final da tela
- Mostra bandeira + label completo na lista de opcoes

#### 7.4.4 Exclusao de Membro

- Membro com discursos futuros: dialogo informa quantidade, ao confirmar exclui, snapshots preservados (AC-007)
- Membro sem discursos futuros: dialogo simples de confirmacao (AC-008)

---

### 7.5 Configuracoes > Import/Export CSV

- **Download CSV:** gera arquivo com colunas Nome e Telefone Completo (AC-009)
  - Web: cria Blob + download como "membros.csv"
  - Mobile: `expo-file-system` + `expo-sharing`
- **Upload CSV:** valida e substitui todos os membros (AC-010)
  - Web: file input aceita .csv
  - Mobile: `expo-document-picker`
- CSV invalido: nenhuma alteracao, erro com linha/campo (AC-011)
- Validacoes: campos obrigatorios, formato telefone, sem duplicatas

---

### 7.6 Configuracoes > Temas da Ala

#### 7.6.1 Lista de Temas

- **Tap no card NAO abre edicao**
- **Swipe para a esquerda** revela botoes lapis e lixeira
- Apenas 1 card com botoes revelados por vez
- Exclusao com discursos futuros: dialogo informa quantidade (AC-017, AC-044)
- Botao de adicionar novo tema (dashed border)

#### 7.6.2 Card de Edicao de Tema

- Campos titulo e link: **largura total** da tela
- **Sem botoes Salvar/Cancelar** — auto-save ao fechar
- Titulo vazio: dialogo de erro, reverte para original (EC-012)
- Link opcional

#### 7.6.3 Colecoes Gerais

- Filtradas por idioma da ala
- Ordenacao: ativas primeiro (recentes), inativas depois (recentes) (AC-012)
- Toggle de ativacao/desativacao (AC-013)
- Desativacao com temas em discursos futuros: dialogo de aviso (AC-014)

---

### 7.7 [Reservado]

> Secao reservada. A selecao de tipo de domingo (excecoes) acontece
> diretamente no card expandido das abas Discursos e Home, via dropdown no topo do card.
> A auto-atribuicao de valores padrao ocorre em lote ao carregar a lista.
> Ver secoes 7.2.1 e 7.3.3 para detalhes.

---

### 7.8 Configuracoes > Usuarios

- Card "Usuarios" visivel apenas para **Bispado** (permissao `settings:users`)
- Secretario e Observador NAO veem o card
- **Nota:** Secretario pode convidar usuarios via botao "Convidar" visivel em outro local (permissao `invitation:create`)

#### 7.8.1 Lista de Usuarios

- Lista todos os usuarios da ala com email e papel, ordenados por data de criacao
- Card expandivel mostrando email (read-only), seletor de papel, botao "Remover"
- Proprio usuario: seletor de papel desabilitado, botao remover oculto

#### 7.8.2 Convidar Usuario

- **Botao "Convidar"** substitui o formulario de criar usuario diretamente
  - pt: "Convidar"
  - en: "Invite"
  - es: "Invitar"
- Ao clicar: formulario com:
  - Email (obrigatorio)
  - Papel (dropdown: Bispado, Secretario, Observador)
- Ao confirmar: Edge Function `create-invitation` gera token + deep link
- Deep link copiado para clipboard E/OU abre sheet de compartilhamento do OS
- Deep link formato: `wardmanager://invite/{token}`
- Expiracao: 30 dias
- Reenvio permitido: novo convite para mesmo email gera novo token
- Quem pode convidar: Bispado e Secretario (permissao `invitation:create`)

#### 7.8.3 Editar Papel

- Seletor de papel: altera via Edge Function `update-user-role`
- NAO pode alterar proprio papel
- Ao alterar ultimo Bispado: aviso especial

#### 7.8.4 Remover Usuario

- Dialogo de confirmacao: "Remover [email]?" (AC-CR003-4)
- NAO pode remover a si mesmo
- Remocao via Edge Function `delete-user` (hard delete)
- Usuario removido logado em outro dispositivo: 401 no proximo request

---

### 7.9 Configuracoes > Template WhatsApp

- Editor com preview em tempo real (AC-043)
- Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}
- Template salvo por ala
- Acessivel a Bispado e Secretario

---

### 7.10 Configuracoes > Idioma

- Seletor com 3 opcoes: pt-BR, en, es (AC-019)
- Dialogo de aviso ao mudar (AC-019)
- Ao confirmar: idioma atualizado, colecoes do idioma anterior desativadas, interface muda, formatos de data adaptam
- Temas da Ala nao afetados

---

### 7.10.1 Configuracoes > Fuso Horario

- Seletor de fuso horario IANA (ex: America/Sao_Paulo, America/New_York)
- Padrao baseado no idioma da ala: America/Sao_Paulo (pt-BR), America/New_York (en), America/Mexico_City (es)
- Acessivel a Bispado e Secretario
- Usado para agendar push notifications (Cases 2 e 3)

---

### 7.11 Configuracoes > Tema Visual

- Seletor com 3 opcoes: Automatico (icone telefone), Claro (sol), Escuro (lua)
- "Automatico" segue tema do sistema operacional em tempo real
- Preferencia armazenada em AsyncStorage (por dispositivo)
- Observador usa apenas modo do sistema (sem override manual)
- Contraste WCAG AA em ambos os modos
- LEDs 3D mantam visibilidade em ambos os modos
- Troca suave entre modos (sem flash branco/preto)

---

### 7.12 Configuracoes > Sair

- Botao "Sair" com icone e cor de erro
- Ao clicar: **dialogo de confirmacao** com titulo "Sair" e mensagem "Deseja realmente sair?"
- Botao "Confirmar/Sair" (destrutivo) executa logout e redireciona para login
- Botao "Cancelar" fecha dialogo, usuario permanece logado
- Dialogo internacionalizado (i18n)

---

### 7.12.1 Configuracoes > Historico

- Card "Historico" visivel para **Bispado** e **Secretario** (permissao `history:read`)
- Observador NAO ve o card
- Ao clicar: navega para tela cheia de historico

#### Layout da Tela

- **Campo de busca** no topo: filtra em tempo real nos 3 campos (data-hora, email, descricao)
  - Case-insensitive, ignora acentos
  - Debounce de 200-300ms
- **Lista de entradas** ordenada por data-hora decrescente (mais recentes primeiro)
- Scroll infinito ou paginado
- Cada entrada exibe:
  - **Data-hora** (formato: YYYY-MM-DD HH:MM, no fuso da ala)
  - **Email** do usuario que executou a acao
  - **Descricao** da acao (pode ser multilinha para descricoes completas)
- **Read-only:** nenhum botao de editar ou apagar
- **Retencao:** Entradas com mais de 2 anos sao removidas automaticamente

#### Acoes Logadas

Todas as acoes que geram persistencia no banco de dados sao logadas, **exceto** acoes automaticas do sistema:

**Membros:**
- Adicionar membro
- Editar membro (nome, telefone)
- Remover membro
- Importar lista via CSV

**Temas:**
- Criar tema da Ala
- Editar tema da Ala
- Remover tema da Ala

**Colecoes:**
- Ativar colecao geral
- Desativar colecao geral

**Tipo de Domingo:**
- Alterar tipo de domingo (via dropdown)

**Discursos:**
- Designar discursante e/ou tema
- Remover designacao
- Alterar status de discurso

**Usuarios:**
- Self-registration (primeiro usuario)
- Gerar convite por link
- Registrar-se via convite
- Alterar papel de usuario
- Remover usuario

**Configuracoes:**
- Alterar idioma da ala
- Alterar fuso horario da ala
- Editar template WhatsApp

**Agenda:**
- Editar agenda de domingo
- Criar ator da reuniao
- Editar ator da reuniao
- Remover ator da reuniao

**NAO logadas (automaticas):**
- Auto-atribuicao de tipo de domingo (ao renderizar cards)
- Lazy creation de speeches
- Lazy creation de agendas
- Processamento de push notifications (cron)
- Registro de push token
- Limpeza de tokens invalidos

---

### 7.13 Aba Agenda

**Tabs atualizadas:** Home, **Agenda**, Discursos, Configuracoes (4 tabs)

#### 7.13.1 Lista de Domingos

- Scroll infinito igual a aba Discursos (12 meses passados + 12 meses futuros, +6 ao scroll)
- Card contraido: apenas **DateBlock** (sem indicador de completude)
- Domingos com excecoes que NAO tem reuniao sacramental (Conferencia Geral, Conferencia de Estaca, Outro) NAO aparecem na lista
- Domingos com "Reuniao de Testemunho", "Conferencia de Ala" ou "Apresentacao Especial da Primaria" aparecem (tem agenda de formato especial)
- Ao clicar: abre formulario de edicao da agenda daquele domingo
- **Lazy creation:** agenda criada automaticamente ao abrir o domingo pela primeira vez
- Agendas passadas: editaveis (sem restricao temporal)
- Bispado + Secretario: podem editar
- Observador: somente leitura (campos desabilitados)

#### 7.13.2 Formulario da Agenda — Reuniao Normal

Exibido quando o domingo NAO tem excecao "Reuniao de Testemunho", "Conferencia de Ala" nem "Apresentacao Especial da Primaria".

**SECAO: BOAS-VINDAS E ANUNCIOS**

| Campo | Tipo | Selecao | Obrigatorio |
|-------|------|---------|-------------|
| Quem preside | Ator (Presidir) | Seletor de ator com papel Presidir (inclui quem tem Dirigir) | Nao |
| Quem dirige | Ator (Dirigir) | Seletor de ator com papel Dirigir | Nao |
| Reconhecer presenca | Lista de Atores (Reconhecer) | Multi-select de atores com papel Reconhecer | Nao |
| Anuncios | Texto livre | Campo de texto multilinha | Nao |
| Pianista | Ator (Musica) | Seletor de ator com papel Musica | Nao |
| Regente | Ator (Musica) | Seletor de ator com papel Musica | Nao |
| Primeiro hino | Hino | Busca por numero ou titulo (todos os hinos do idioma) | Nao |
| Primeira oracao | Membro ou nome livre | Seletor de membro + campo para nome customizado | Nao |

**SECAO: DESIGNACOES E SACRAMENTO**

| Campo | Tipo | Selecao | Obrigatorio |
|-------|------|---------|-------------|
| Apoios e desobrigacoes | Texto livre | Campo de texto multilinha | Nao |
| Bencao de recem-nascidos | Toggle + Texto | Toggle sim/nao; se sim, campo de texto com nomes | Nao |
| Confirmacao de batismo | Toggle + Texto | Toggle sim/nao; se sim, campo de texto com nomes | Nao |
| Anuncios da Estaca | Toggle | Sim/Nao | Nao |
| Hino sacramental | Hino (sacramental) | Busca por numero ou titulo (APENAS hinos com Sacramental=S) | Nao |

**SECAO: PRIMEIRO E SEGUNDO DISCURSO**

| Campo | Tipo | Selecao | Obrigatorio |
|-------|------|---------|-------------|
| 1o Discurso | Discursante | Vem da tabela speeches (position=1); editavel — ao designar aqui, status → assigned_confirmed | Nao |
| 2o Discurso | Discursante | Vem da tabela speeches (position=2); editavel — ao designar aqui, status → assigned_confirmed | Nao |
| Apresentacao especial | Toggle + Texto | Toggle sim/nao; se sim, campo de descricao da apresentacao | Nao |
| Hino intermediario | Hino | Busca por numero ou titulo (todos os hinos); visivel APENAS se apresentacao especial = nao | Nao |

**SECAO: ULTIMO DISCURSO**

| Campo | Tipo | Selecao | Obrigatorio |
|-------|------|---------|-------------|
| 3o Discurso | Discursante | Vem da tabela speeches (position=3); editavel — ao designar aqui, status → assigned_confirmed | Nao |
| Hino final | Hino | Busca por numero ou titulo (todos os hinos) | Nao |
| Ultima oracao | Membro ou nome livre | Seletor de membro + campo para nome customizado | Nao |

#### 7.13.3 Formulario da Agenda — Reuniao Especial

Exibido quando o domingo tem excecao "Reuniao de Testemunho", "Conferencia de Ala" ou "Apresentacao Especial da Primaria". Mesma estrutura para todos os tipos.

**SECAO: BOAS-VINDAS E ANUNCIOS** — identica a reuniao normal

**SECAO: DESIGNACOES E SACRAMENTO** — identica a reuniao normal

**SECAO: REUNIAO ESPECIAL**

| Campo | Tipo | Selecao | Obrigatorio |
|-------|------|---------|-------------|
| Tipo de reuniao | Texto (auto) | Preenchido automaticamente a partir da excecao (read-only) | — |
| Hino final | Hino | Busca por numero ou titulo (todos os hinos) | Nao |
| Ultima oracao | Membro ou nome livre | Seletor de membro + campo para nome customizado | Nao |

#### 7.13.4 Seletor de Ator (inline)

Ao clicar em um campo de ator:

- Mostra lista dos atores existentes **filtrados pelo papel** requerido pelo campo
- Campo de busca/filtro no topo
- **Botao "Adicionar novo ator"** ao final da lista
  - Abre mini-formulario inline: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)
  - Ao salvar: ator criado, automaticamente selecionado no campo
- **Opcao de deletar** ator: icone de lixeira ao lado de cada ator na lista
  - Se ator ja esta associado a agendas: snapshot preservado (nome fica, referencia vira NULL)
  - Dialogo de confirmacao antes de deletar

#### 7.13.5 Seletor de Oracao (membro ou nome livre)

Ao clicar no campo de oracao (primeira ou ultima):

- Mostra lista de todos os membros da ala, ordenados alfabeticamente
- Campo de busca no topo (mesma logica de busca de membros: case-insensitive, sem acentos)
- **Campo "Nome diferente"** ao final da lista: permite digitar um nome que NAO e membro
  - Nome customizado e armazenado APENAS na agenda daquele domingo (campo `*_prayer_name`)
  - NAO e persistido na tabela de membros nem de atores

#### 7.13.6 Seletor de Hino

Ao clicar em um campo de hino:

- Campo de busca no topo: filtra por **numero** (ex: "123") ou **titulo** (ex: "Conta as")
- Lista exibe: "Numero — Titulo" (ex: "123 — Conta as Bencaos")
- Ordenada por numero
- Para hino sacramental: mostra APENAS hinos com `is_sacramental = true`
- Para demais hinos: mostra todos os hinos do idioma da ala

#### 7.13.7 Discursantes na Agenda

- Campos de discurso (1o, 2o, 3o) mostram o nome do discursante designado (da tabela `speeches`)
- Se nao designado: campo vazio com placeholder
- **Editavel:** ao clicar, abre seletor de membro (mesmo modal da aba Discursos)
- Ao designar pela agenda:
  - Atualiza a tabela `speeches` (speaker_name, speaker_phone, member_id)
  - Status automaticamente definido como `assigned_confirmed`
  - NAO mostra tema; tema NAO e editavel pela agenda
- **EXCECAO de permissao:** Na aba Agenda, tanto Bispado quanto Secretario podem designar discursantes (na aba Discursos, apenas Bispado pode)

---

### 7.14 Modo Apresentacao

#### 7.14.1 Acesso

- Botao "Iniciar Reuniao Sacramental" na aba Home
- Visivel **apenas no domingo** (dia inteiro, do 00:00 ate 23:59 do domingo)
- Visivel para **todos os papeis** (Bispado, Secretario, Observador)
- Abre tela full-screen com a agenda do proximo domingo (ou do domingo atual)

#### 7.14.2 Layout Acordeao

- Lista de cards verticais, **exatamente 1 expandido** por vez
- Cards contraidos anteriores ao expandido: empilhados no **topo** da tela
- Cards contraidos posteriores ao expandido: empilhados no **final** da tela
- **Todos os cards contraidos SEMPRE visiveis** (nunca saem da tela)
- Card expandido ocupa o espaco entre os contraidos de cima e os de baixo
- Se conteudo do card expandido excede o espaco disponivel: **scroll interno** no card
- Inicia com a secao **BOAS-VINDAS E ANUNCIOS** expandida
- Clicar em card contraido: anterior contrai, clicado expande (animacao suave)

#### 7.14.3 Cards — Reuniao Normal (4 cards)

1. **BOAS-VINDAS E ANUNCIOS** — Exibe: quem preside, quem dirige, reconhecer, anuncios, pianista, regente, primeiro hino (numero + titulo), primeira oracao
2. **DESIGNACOES E SACRAMENTO** — Exibe: apoios/desobrigacoes, bencao de bebes, confirmacao de batismo, anuncios da estaca, hino sacramental (numero + titulo)
3. **PRIMEIRO E SEGUNDO DISCURSO** — Exibe: 1o discursante, 2o discursante, apresentacao especial (se houver) OU hino intermediario
4. **ULTIMO DISCURSO** — Exibe: 3o discursante, hino final (numero + titulo), ultima oracao

#### 7.14.4 Cards — Reuniao Especial (3 cards)

1. **BOAS-VINDAS E ANUNCIOS** — identico
2. **DESIGNACOES E SACRAMENTO** — identico
3. **REUNIAO ESPECIAL** — Exibe: tipo da reuniao, hino final (numero + titulo), ultima oracao

#### 7.14.5 Modo Read-Only

- **Nenhum campo e editavel** no Modo Apresentacao
- Todos os dados vem da agenda previamente configurada na aba Agenda
- Botao para fechar/voltar no header

---

### 7.15 Push Notifications

O app envia push notifications via Expo Push Notifications para manter bispado e secretario informados sobre o fluxo de designacoes. Observadores NAO recebem notificacoes. Ao abrir o app ou fazer login, o dispositivo registra seu Expo Push Token no backend (tabela `device_push_tokens`).

**Ao tocar em qualquer notificacao:** o app abre na aba Home.

#### 7.15.1 Caso 1 — Designacao realizada (atrasado, agrupado por domingo)

- **Gatilho:** Bispado designa um discursante
- **Delay:** 5 minutos apos a designacao
- **Agrupamento:** Se multiplas designacoes para o MESMO domingo acontecem dentro da janela de 5 min, agrupa em um unico push. Designacoes para domingos DIFERENTES geram pushes separados.
- **Destinatario:** Secretario
- **Suprimido se:** O domingo tem excecao (tipo != "Discursos")
- **Texto (1 designacao):**
  - pt: `{nome} foi designado para discursar no dia {data}. Hora de fazer o convite!`
  - en: `{name} has been assigned to speak on {date}. Time to send the invitation!`
  - es: `{nombre} fue designado para hablar el dia {fecha}. ¡Hora de enviar la invitacion!`
- **Texto (multiplas designacoes, mesmo domingo):**
  - pt: `{nome1}, {nome2} e {nome3} foram designados para discursar no dia {data}. Hora de fazer o convite!`
  - en: `{name1}, {name2} and {name3} have been assigned to speak on {date}. Time to send the invitation!`
  - es: `{nombre1}, {nombre2} y {nombre3} fueron designados para hablar el dia {fecha}. ¡Hora de enviar la invitacion!`

#### 7.15.2 Caso 2 — Lembrete semanal: discursos nao designados (bispado)

- **Gatilho:** Todo domingo as 18:00 no fuso horario da ala
- **Condicao:** Proximo domingo tem tipo = "Discursos" E pelo menos 1 dos 3 discursos com status `not_assigned`
- **Destinatario:** Todos do Bispado
- **Texto:**
  - pt: `Ainda faltam discursantes a serem designado para domingo que vem!`
  - en: `There are still speakers to be assigned for next Sunday!`
  - es: `¡Aun faltan discursantes por designar para el proximo domingo!`

#### 7.15.3 Caso 3 — Lembrete semanal: discursos nao confirmados (secretario)

- **Gatilho:** Todo domingo as 18:00 no fuso horario da ala
- **Condicao:** Proximo domingo tem tipo = "Discursos" E pelo menos 1 dos 3 discursos com status != `assigned_confirmed`
- **Destinatario:** Secretario
- **Texto:** Identico ao Caso 2

#### 7.15.4 Caso 4 — Discursante confirmado (imediato)

- **Gatilho:** Status de um discurso muda para `assigned_confirmed`
- **Delay:** Imediato
- **Destinatario:** Secretario e Bispado
- **Texto:**
  - pt: `{nome} foi confirmado para fazer o {ordinal} discurso do dia {data}.`
  - en: `{name} has been confirmed to give the {ordinal} speech on {date}.`
  - es: `{nombre} fue confirmado para dar el {ordinal} discurso del dia {fecha}.`
- **Nota:** {ordinal} = "1o", "2o", "3o" (pt) / "1st", "2nd", "3rd" (en) / "1er", "2do", "3er" (es)

#### 7.15.5 Caso 5 — Discursante desistiu (imediato)

- **Gatilho:** Status de um discurso muda para `desistiu`
- **Delay:** Imediato
- **Destinatario:** Bispado
- **Texto:**
  - pt: `ATENCAO! {nome} NAO podera fazer o {ordinal} discurso do dia {data}. Designe outro discursante!`
  - en: `ATTENTION! {name} will NOT be able to give the {ordinal} speech on {date}. Assign another speaker!`
  - es: `¡ATENCION! {nombre} NO podra dar el {ordinal} discurso del dia {fecha}. ¡Designe otro discursante!`

#### 7.15.6 Configuracao de Fuso Horario

- Campo `timezone` na tabela `wards`, configuravel na aba Configuracoes por Bispado e Secretario
- Formato: IANA timezone (ex: "America/Sao_Paulo", "America/New_York", "Europe/Madrid")
- Padrao: "America/Sao_Paulo" (pt-BR), "America/New_York" (en), "America/Mexico_City" (es)
- Usado para agendar notificacoes dos Casos 2 e 3

---

## 8. User Stories Consolidadas

### 8.1 Membros (US-001 a US-006)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-001 | Secretario | acessar tela de gerenciamento de membros com busca e listagem | manter cadastro atualizado |
| US-002 | Secretario | buscar membros com filtro em tempo real | encontrar membro rapidamente |
| US-003 | Secretario | adicionar membro (nome + telefone) | membro fique disponivel para designacao |
| US-004 | Secretario | editar membro com salvamento automatico ao fechar card | manter dados atualizados |
| US-005 | Secretario | excluir membro via swipe-to-reveal | lista de discursantes atualizada |
| US-006 | Secretario | download/upload de planilha CSV em mobile e web | edicao em massa |

### 8.2 Temas (US-007 a US-009)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-007 | Secretario | gerenciar Colecoes de temas com toggle | controlar temas disponiveis |
| US-008 | Secretario | CRUD de temas da Ala com auto-save e swipe | temas personalizados |
| US-009 | Admin | importar Colecoes Gerais via CSV | temas curados para todas as alas |

### 8.3 Excecoes (US-010 a US-011)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-010 | Secretario | configurar idioma da Ala | interface e colecoes no idioma correto |
| US-011 | Secretario | selecionar tipo de domingo via dropdown no card expandido (Discursos/Home) com auto-atribuicao em lote | domingos especiais configurados sem tela separada |

### 8.4 Discursos (US-012 a US-016)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-012 | Bispado | visualizar domingos com discursos, proximo domingo no topo | visao consolidada |
| US-013 | Bispado | designar discursante e tema com setas de dropdown | membros saibam o que falar |
| US-014 | Secretario | alterar status clicando no LED ou no texto | bispado acompanhe progresso |
| US-015 | Bispado | remover designacao | redesignar outro membro |
| US-016 | Bispado | scroll infinito sem lista sumir | acesso a historico |

### 8.5 Home (US-017 a US-020)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-017 | Qualquer | sincronizacao entre abas em < 5s | informacoes atualizadas |
| US-018 | Qualquer | ver 3 proximos domingos na Home com cards estaveis | visao rapida |
| US-019 | Bispado | ver proximas designacoes pendentes | saber onde agir |
| US-020 | Secretario | gerenciar convites via WhatsApp | convites eficientes |

### 8.6 Seguranca e Config (US-021 a US-024)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-021 | Qualquer | isolamento de dados entre Alas | privacidade |
| US-022 | Qualquer | autenticacao com papeis e suporte a password managers | acesso controlado |
| US-023 | Bispado | listar, editar papel e remover usuarios; convidar usuarios por link | gerenciar acesso |
| US-024 | Secretario/Bispado | editar template WhatsApp | personalizar convites |

### 8.7 User Stories Adicionais

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-CR001 | Qualquer | LEDs 3D com efeito de profundidade | identifique status intuitivamente |
| US-CR002 | Qualquer | dark/light mode com deteccao do sistema | conforto visual |
| US-CR006 | Qualquer | LED piscando no status Nao-Convidado | saiba quais precisam de convite |
| US-CR008 | Qualquer | labels "1o Discurso" sem duracao | leitura mais natural |
| US-CR020 | Secretario | selecionar tipo de domingo via dropdown no card expandido | configurar excecoes sem tela separada |
| US-CR023 | Qualquer | confirmacao ao clicar em Sair | nao saia acidentalmente |
| US-CR024 | Qualquer | nome correto do app na tela de login | saiba o proposito do app |

### 8.8 Agenda e Modo Apresentacao

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-AGD-001 | Secretario | configurar a agenda completa de um domingo (quem preside, dirige, hinos, oracoes) na aba Agenda | a reuniao sacramental esteja organizada |
| US-AGD-002 | Secretario | designar discursantes diretamente pela aba Agenda | nao precisar alternar entre abas |
| US-AGD-003 | Secretario | cadastrar e gerenciar atores da reuniao (presidencia, dirigir, musica) inline | seleciona-los rapidamente em futuros domingos |
| US-AGD-004 | Secretario | selecionar hinos por numero ou titulo | encontrar o hino rapidamente |
| US-AGD-005 | Secretario | definir quem faz as oracoes (membro da ala ou nome avulso) | oracao designada sem cadastrar visitantes |
| US-AGD-006 | Qualquer | abrir o Modo Apresentacao no domingo | acompanhar a reuniao em tempo real |
| US-AGD-007 | Qualquer | navegar entre secoes da reuniao no Modo Apresentacao | ver cada parte da reuniao de forma clara |
| US-AGD-008 | Secretario | preencher a agenda de reuniao especial (testemunho/primaria) | reunioes sem discurso tenham agenda tambem |
| US-AGD-009 | Admin | importar hinario completo via CSV por idioma | hinos estejam disponiveis para todas as alas |

### 8.9 Push Notifications

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-PN-001 | Secretario | receber push 5 min apos designacao (agrupado por domingo) | possa convidar o discursante rapidamente |
| US-PN-002 | Bispado | receber lembrete domingo 18h se faltam designacoes para o proximo domingo | designe discursantes a tempo |
| US-PN-003 | Secretario | receber lembrete domingo 18h se faltam confirmacoes para o proximo domingo | convide/confirme discursantes a tempo |
| US-PN-004 | Secretario/Bispado | receber push imediato quando discursante confirma | saiba que o discurso esta garantido |
| US-PN-005 | Bispado | receber push imediato quando discursante desiste | designe substituto imediatamente |
| US-PN-006 | Bispado/Secretario | configurar fuso horario da ala | notificacoes agendadas cheguem no horario correto |

### 8.10 Self-Registration e Convite por Link

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-REG-001 | Novo usuario | criar conta como primeiro usuario de uma ala (self-registration) | comecar a usar o app sem depender de CLI |
| US-REG-002 | Bispado/Secretario | gerar link de convite para novos usuarios | novos usuarios possam se registrar com seguranca |
| US-REG-003 | Usuario convidado | me registrar usando um link de convite recebido | acessar a ala com o papel correto |
| US-REG-004 | Bispado/Secretario | reenviar convite para o mesmo email | usuario receba novo link caso o anterior tenha expirado |

### 8.11 Historico

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-HIST-001 | Bispado/Secretario | visualizar o historico de todas as acoes da ala com busca | acompanhar quem fez o que e quando |
| US-HIST-002 | Bispado/Secretario | buscar no historico por data, email ou descricao | encontrar uma acao especifica rapidamente |

---

## 9. Acceptance Criteria Consolidados

### 9.1 Membros

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-001 | usuario na aba Configuracoes | clica no card Membros | navega para tela com busca e listagem ordenada alfabeticamente |
| AC-002 | na tela de membros | digita no campo de search | filtra em tempo real (≤300ms), case-insensitive, ignorando acentos |
| AC-003 | na tela de membros | clica '+', preenche dados, clica fora | membro salvo automaticamente com telefone +xxyyyyyyyy |
| AC-004 | adicionando membro | clica fora sem preencher Nome ou Telefone | dialogo de confirmacao de cancelamento |
| AC-005 | card de membro expandido | altera nome e clica fora | mudancas salvas automaticamente, sem botoes Salvar/Cancelar |
| AC-006 | editando membro | tenta fechar com Nome ou Telefone vazio | dialogo de erro, reverte para originais |
| AC-007 | membro com 3 discursos futuros | clica deletar (via swipe) | dialogo informa discursos futuros; confirma → exclui, snapshots preservados |
| AC-008 | membro sem discursos futuros | clica deletar (via swipe) | dialogo simples de confirmacao |

### 9.2 CSV

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-009 | na tela de import/export | clica Download | CSV gerado com Nome e Telefone; mobile usa sheet de compartilhamento |
| AC-010 | na tela de import/export | upload de CSV valido | substitui todos os membros, mensagem de sucesso |
| AC-011 | na tela de import/export | upload de CSV invalido | nenhuma alteracao, erro com linha/campo |

### 9.3 Temas e Colecoes

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-012 | na secao Temas | visualiza colecoes | Temas da Ala primeiro, Gerais ativas (recentes), Gerais inativas |
| AC-013 | colecao geral desativada | marca checkbox | ativada, temas disponiveis para selecao |
| AC-014 | colecao ativa com temas em discursos futuros | desmarca | dialogo avisa; confirma → desativada, snapshots preservados |
| AC-015 | Temas da Ala expandida | preenche titulo e clica fora | tema salvo automaticamente, sem botoes Salvar/Cancelar |
| AC-016 | tema existente | altera titulo e clica fora | mudancas salvas automaticamente |
| AC-017 | card de tema via swipe | clica lixeira e confirma | tema removido, snapshots preservados |
| AC-044 | tema em discursos futuros | clica remover (via swipe) | dialogo informa quantidade; confirma → removido |

### 9.4 Tipo de Domingo (Excecoes)

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-020 | card de domingo expandido (Discursos ou Home) | seleciona excecao no dropdown | tipo salvo no banco; campos de discurso somem; card contraido mostra texto da excecao |
| AC-021 | lista de domingos carregada | domingos sem entrada na tabela | auto-atribuicao em lote: "Discursos" para maioria; 1o dom de Jan-Mar,Mai-Set,Nov-Dez → "Reuniao de Testemunho"; 1o dom Abr/Out → "Conferencia Geral"; 2o dom Abr/Out → "Reuniao de Testemunho"; todos persistidos |
| AC-022 | dropdown com excecao selecionada | usuario muda para "Discursos" | entrada atualizada; 3 speeches vazios criados imediatamente; campos de discurso aparecem |
| AC-022b | domingo com discursantes/temas | usuario seleciona excecao | dialogo confirma apagamento; ao confirmar: speeches deletados da tabela; ao cancelar: dropdown volta |
| AC-022c | dropdown | usuario seleciona "Outro" | dialogo abre para digitar motivo customizado + botao OK; ao confirmar: salva; ao cancelar: dropdown volta |
| AC-022d | Observador expande card | ve dropdown | dropdown visivel mas desabilitado (read-only) |

### 9.5 Discursos

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-023 | navega para aba Discursos | lista renderizada | domingos de 12 meses passados a 12 futuros; proximo domingo no topo, sem animacao; cada domingo com DateBlock (zero-padded) e 3 LEDs 3D |
| AC-024 | Bispado clica campo Discursante | modal abre | membros ordenados; ao selecionar, nome exibido, status muda para amarelo, campo com seta dropdown |
| AC-025 | Bispado clica campo Tema | modal abre | temas de colecoes ativas, formato "Colecao : Titulo", campo com seta dropdown |
| AC-026 | discurso com discursante designado | clica no LED ou no texto do status | modal com opcoes de status; circulo muda de cor |
| AC-027 | discurso com discursante | clica X e confirma | discursante removido, status volta para nao-designado (LED apagado), tema permanece |
| AC-028 | scroll ate final da lista | atinge limite | +6 meses futuros carregados suavemente, sem desaparecer |
| AC-029 | scroll ate inicio da lista | atinge limite | +6 meses passados carregados suavemente |

### 9.6 Home

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-031 | abre aba Home | secao proximos 3 domingos | 3 cards com DateBlock a esquerda e LEDs 3D a direita; header fixo ao expandir; auto-scroll para visibilidade |
| AC-032 | Bispado expande card | card expandido | pode designar discursantes/temas e alterar status |
| AC-033 | Secretario expande card | card expandido | pode apenas alterar status |
| AC-034 | Observador expande card | card expandido | somente visualiza |
| AC-035 | Bispado, todos 9 discursos designados | Home renderizada | secao "Proximas designacoes" com proximo domingo pendente |
| AC-036 | todas designacoes resolvidas | Home atualiza | secao desaparece |
| AC-037 | Secretario na Home | secao de convites | lista de Nao-Convidado e Convidado, ordenados por data |
| AC-038 | item Nao-Convidado | clica acao | abre WhatsApp, status → Convidado |
| AC-039 | item Convidado | clica acao | opcoes: WhatsApp, Confirmado, Desistiu |

### 9.7 Sincronizacao e Seguranca

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-030 | mudanca em qualquer aba | navega para outra | mudanca refletida em < 5 segundos |
| AC-040 | usuario autenticado | requisicao ao backend | filtrado por ward_id; cross-ward → 403 + log |
| AC-041 | usuario nao autenticado | acessa qualquer tela | redirecionado para login |
| AC-042 | Bispado/Secretario em Configuracoes > Usuarios | preenche email e papel, clica Convidar | convite gerado com deep link; link copiado/compartilhado |
| AC-043 | Bispado/Secretario em Template WhatsApp | edita e salva | template customizado usado nos proximos convites |

### 9.8 Dark/Light Mode

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-CR002-1 | sistema em dark mode, app em Auto | abre app | interface em dark mode |
| AC-CR002-2 | sistema em light mode, app em Auto | abre app | interface em light mode |
| AC-CR002-3 | na aba Configuracoes | ve seletor de tema | 3 opcoes: Automatico, Claro, Escuro |
| AC-CR002-4 | seleciona Escuro | selecao salva | muda imediatamente para dark mode; persiste entre sessoes |
| AC-CR002-5 | seleciona Automatico | sistema alterna | interface acompanha em tempo real |

### 9.9 StatusLED

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-CR001-1 | status Nao-designado | LED renderizado | LED apagado (cinza, sem brilho) |
| AC-CR006-1 | status Nao-Convidado | LED renderizado | LED fading continuo entre apagado e amarelo |
| AC-CR006-2 | status Convidado | LED renderizado | LED amarelo fixo com efeito 3D |
| AC-CR001-4 | status Confirmado | LED renderizado | LED verde forte com efeito 3D |
| AC-CR001-5 | status Desistiu | LED renderizado | LED vermelho forte com efeito 3D |
| AC-CR006-3 | Reduzir movimento ativado | LED Nao-Convidado | amarelo estatico sem fading |

### 9.10 Logout

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-CR023-1 | na aba Configuracoes | clica Sair | dialogo "Deseja realmente sair?" |
| AC-CR023-2 | dialogo aberto | clica Confirmar | logout executado, redireciona para login |
| AC-CR023-3 | dialogo aberto | clica Cancelar | dialogo fecha, permanece logado |

### 9.11 Login

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-CR024-1 | tela de login em pt-BR | renderizada | titulo: "Gerenciador da Reuniao Sacramental", subtitulo: "discursos e agenda" |
| AC-CR025-1 | gerenciador de senhas ativo (iOS) | abre login | teclado mostra sugestao de preenchimento |
| AC-CR025-2 | gerenciador de senhas ativo (Android) | abre login | sistema oferece preenchimento |

### 9.12 Aba Agenda

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-AGD-001 | usuario navega para aba Agenda | lista renderizada | scroll infinito com domingos (12 meses passados + 12 futuros); domingos com Conf. Geral/Estaca/Outro NAO aparecem |
| AC-AGD-002 | clica em um domingo na aba Agenda | formulario abre | agenda criada automaticamente (lazy creation) com todos os campos vazios |
| AC-AGD-003 | formulario de agenda (reuniao normal) | secoes visiveis | 4 secoes: Boas-vindas, Designacoes/Sacramento, Primeiro e Segundo Discurso, Ultimo Discurso |
| AC-AGD-004 | formulario de agenda (reuniao especial) | secoes visiveis | 3 secoes: Boas-vindas, Designacoes/Sacramento, Reuniao Especial; tipo de reuniao exibido automaticamente |
| AC-AGD-005 | clica no campo "Quem preside" | seletor abre | lista de atores com papel Presidir (inclui Dirigir); opcao adicionar novo; opcao deletar |
| AC-AGD-006 | adiciona novo ator inline | preenche nome e papeis | ator criado, selecionado no campo, disponivel em futuros domingos |
| AC-AGD-007 | deleta ator que esta em agenda existente | confirma exclusao | ator removido da lista; nome permanece como snapshot nas agendas |
| AC-AGD-008 | clica no campo "Reconhecer presenca" | seletor abre | multi-select com atores de papel Reconhecer; pode marcar/desmarcar multiplos |
| AC-AGD-009 | clica no campo "Primeiro hino" | seletor abre | campo de busca por numero ou titulo; lista "Numero — Titulo" ordenada por numero |
| AC-AGD-010 | clica no campo "Hino sacramental" | seletor abre | mostra APENAS hinos com Sacramental=S; busca por numero ou titulo |
| AC-AGD-011 | clica no campo "Primeira oracao" | seletor abre | lista de membros da ala + campo "Nome diferente" para nome customizado |
| AC-AGD-012 | seleciona nome customizado na oracao | digita nome e confirma | nome salvo na agenda; NAO persistido em membros nem atores |
| AC-AGD-013 | campo 1o Discurso sem designacao | clica no campo | abre seletor de membros; ao selecionar, atualiza tabela speeches com status assigned_confirmed |
| AC-AGD-014 | Secretario designa discursante pela Agenda | seleciona membro | speeches.status = assigned_confirmed; sincroniza com aba Discursos |
| AC-AGD-015 | marca "Apresentacao especial" = sim | toggle ativado | campo de descricao aparece; hino intermediario oculto |
| AC-AGD-016 | marca "Apresentacao especial" = nao | toggle desativado | campo de hino intermediario aparece; descricao oculto |
| AC-AGD-017 | Observador abre aba Agenda | formulario renderizado | todos os campos read-only (desabilitados) |
| AC-AGD-018 | edita agenda de domingo passado | altera campos | salva normalmente (sem restricao temporal) |

### 9.13 Modo Apresentacao

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-AGD-019 | e domingo | abre aba Home | botao "Iniciar Reuniao Sacramental" visivel no topo |
| AC-AGD-020 | NAO e domingo | abre aba Home | botao NAO visivel |
| AC-AGD-021 | clica "Iniciar Reuniao" | tela abre | full-screen com agenda do domingo; secao Boas-vindas expandida; demais contraidas |
| AC-AGD-022 | Modo Apresentacao (reuniao normal) | tela renderizada | 4 cards: Boas-vindas, Designacoes, Discursos 1+2, Ultimo Discurso |
| AC-AGD-023 | Modo Apresentacao (reuniao especial) | tela renderizada | 3 cards: Boas-vindas, Designacoes, Reuniao Especial |
| AC-AGD-024 | clica em card contraido | card clicado | anterior contrai, clicado expande; cards contraidos sempre visiveis |
| AC-AGD-025 | conteudo do card expandido excede espaco | card renderizado | scroll interno no card; cards contraidos permanecem visiveis |
| AC-AGD-026 | qualquer campo no Modo Apresentacao | tenta interagir | campos read-only, nenhuma edicao permitida |

### 9.14 Hinos e Script

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-AGD-027 | admin executa import-hymns | CSV valido (Lingua,Numero,Titulo,Sacramental) | hinos importados para o idioma especificado |
| AC-AGD-028 | import-hymns com CSV invalido | executa script | erro detalhado com linha/campo; nenhum hino importado |
| AC-AGD-029 | import-hymns com idioma existente | executa script | hinos substituidos para aquele idioma (upsert) |

### 9.15 Excecao: Apresentacao da Primaria

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-AGD-030 | tela de excecoes | dropdown de motivo | nova opcao "Apresentacao Especial da Primaria" disponivel |
| AC-AGD-031 | domingo marcado como "Apresentacao Especial da Primaria" | abre agenda | formulario mostra layout de reuniao especial (3 secoes); tipo auto-preenchido |

### 9.16 Push Notifications

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-PN-001 | Bispado designa discursante | 5 min se passam sem outra designacao para o mesmo domingo | push enviado ao Secretario com nome do discursante e data |
| AC-PN-002 | Bispado designa 3 discursantes para o mesmo domingo em 2 min | 5 min se passam desde a primeira designacao | um unico push agrupado enviado ao Secretario com os 3 nomes |
| AC-PN-003 | Bispado designa discursantes para domingos diferentes em 2 min | 5 min se passam | pushes separados para cada domingo |
| AC-PN-004 | domingo 18:00 (fuso da ala) | proximo domingo tem tipo "Discursos" com discurso(s) not_assigned | push enviado a todos do Bispado |
| AC-PN-005 | domingo 18:00 (fuso da ala) | proximo domingo tem tipo "Discursos" com discurso(s) nao confirmados | push enviado ao Secretario |
| AC-PN-006 | domingo 18:00 (fuso da ala) | proximo domingo tem excecao (tipo != "Discursos") | NENHUM push enviado (Cases 2 e 3 suprimidos) |
| AC-PN-007 | status de discurso muda para assigned_confirmed | imediatamente | push enviado a Secretario e Bispado com nome, ordinal e data |
| AC-PN-008 | status de discurso muda para desistiu | imediatamente | push enviado ao Bispado com nome, ordinal e data (texto de urgencia) |
| AC-PN-009 | usuario faz login ou abre o app | dispositivo registra token | expo_push_token salvo em device_push_tokens |
| AC-PN-010 | Observador faz login | dispositivo NAO registra token | nenhum push sera recebido |
| AC-PN-011 | usuario toca em qualquer notificacao | app abre | navega para aba Home |
| AC-PN-012 | idioma da ala = pt-BR | push enviado | texto em portugues |
| AC-PN-013 | idioma da ala = en | push enviado | texto em ingles |
| AC-PN-014 | idioma da ala = es | push enviado | texto em espanhol |

### 9.17 Self-Registration e Convite por Link

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-REG-001 | tela de login | clica "Criar conta para o primeiro usuario de uma Ala" | navega para tela de self-registration |
| AC-REG-002 | tela de self-registration | preenche todos os campos validos e clica Criar | ala criada + usuario criado + logado automaticamente + redireciona para Home |
| AC-REG-003 | tela de self-registration | combinacao estaca+ala ja existe | erro "Esta combinacao de Estaca e Ala ja existe" |
| AC-REG-004 | tela de self-registration | email ja existe no sistema | erro "Este email ja esta em uso" |
| AC-REG-005 | tela de self-registration | senha com menos de 6 caracteres | validacao impede envio |
| AC-REG-006 | tela de self-registration | senhas nao coincidem | validacao impede envio |
| AC-REG-007 | Bispado/Secretario em Usuarios | clica Convidar, preenche email e papel | convite criado; deep link gerado e copiado/compartilhado |
| AC-REG-008 | deep link wardmanager://invite/{token} | usuario abre | tela de registro por convite com dados read-only (estaca, ala, papel, email) |
| AC-REG-009 | tela de registro por convite | preenche senha valida e clica Criar conta | usuario criado + used_at preenchido + logado + redireciona para Home |
| AC-REG-010 | tela de registro por convite | token expirado (> 30 dias) | erro "Convite expirado. Solicite um novo convite." |
| AC-REG-011 | tela de registro por convite | token ja utilizado (used_at != null) | erro "Este convite ja foi utilizado." |
| AC-REG-012 | Bispado/Secretario | reenvia convite para email existente | novo convite criado com novo token; convite anterior permanece (se nao usado) |

### 9.18 Historico

| ID | Dado | Quando | Entao |
|----|------|--------|-------|
| AC-HIST-001 | Bispado/Secretario na aba Configuracoes | ve cards | card "Historico" visivel |
| AC-HIST-002 | Observador na aba Configuracoes | ve cards | card "Historico" NAO visivel |
| AC-HIST-003 | clica no card Historico | tela abre | lista de entradas ordenada por data-hora decrescente (mais recentes primeiro) |
| AC-HIST-004 | na tela de historico | digita no campo de busca | filtra em tempo real nos 3 campos (data-hora, email, descricao); case-insensitive, ignora acentos |
| AC-HIST-005 | qualquer acao que gera persistencia no banco | acao executada | entrada criada no activity_log com data-hora, email do usuario, descricao legivel |
| AC-HIST-006 | acao automatica do sistema (auto-atribuicao, lazy creation) | acao executada | NENHUMA entrada criada no activity_log |
| AC-HIST-007 | entrada no historico com descricao longa | renderizada | descricao exibida em multiplas linhas (sem truncamento) |
| AC-HIST-008 | entrada no historico | tenta editar ou apagar | nao ha controles de edicao/exclusao (read-only) |
| AC-HIST-009 | entrada com mais de 2 anos | job de retencao executa | entrada removida automaticamente |

---

## 10. Edge Cases Consolidados

| ID | Caso | Comportamento Esperado |
|----|------|----------------------|
| EC-001 | Membro excluido com discursos futuros | Dialogo informa quantidade; ao confirmar exclui, snapshots preservados |
| EC-002 | Upload planilha invalida | Nenhuma alteracao + erro detalhado com linha/campo |
| EC-003 | Edicao simultanea (raro) | Last-write-wins com updated_at |
| EC-004 | Excecao selecionada em domingo com discursos | Dialogo confirma apagamento; ao confirmar, speeches deletados da tabela |
| EC-005 | Lista de membros vazia | Mensagem informativa |
| EC-006 | 1o domingo em feriado | Auto-marca + permite alterar |
| EC-007 | Planilha sem telefones | Upload rejeitado |
| EC-008 | Acesso a dados de outra Ala | 403 Forbidden + log |
| EC-009 | Desativar colecao com temas designados | Dialogo avisa; snapshots preservados |
| EC-010 | Mudar idioma com colecoes ativas | Dialogo avisa; desativa anteriores |
| EC-011 | Mudar excecao para "Discursos" | 3 discursos vazios criados imediatamente |
| EC-012 | Adicionar tema sem titulo | Erro + opcao cancelar |
| EC-013 | Excluir tema usado em discursos | Snapshot preservado |
| EC-014 | App offline durante edicao | Salva localmente + sincroniza |
| EC-015 | Secretario tenta designar | Campo desabilitado |
| EC-016 | Observador tenta editar | Controles ocultos |
| EC-CR003-1 | Bispado tenta remover a si mesmo | Acao bloqueada (botao oculto) |
| EC-CR003-2 | Ultimo Bispado alterado | Aviso especial antes de confirmar |
| EC-CR003-3 | Bispado tenta alterar proprio papel | Seletor desabilitado |
| EC-CR003-4 | Usuario removido enquanto logado | Proxima acao falha; redireciona para login |
| EC-CR003-5 | Email ja existente | Erro "Este email ja esta em uso" |
| EC-CR003-6 | Remover/editar usuario offline | Erro "Requer conexao"; acao NAO enfileirada |
| EC-CR010-1 | Lista nao carregou quando scroll tentado | Aguardar carregamento; mostrar skeleton |
| EC-CR011-1 | Scroll rapido ultrapassa dados carregados | Loading no final sem remover conteudo |
| EC-CR011-2 | Erro de rede ao carregar mais meses | Mensagem de erro discreta; dados preservados |
| EC-CR013-1 | Swipe acidental durante scroll vertical | Threshold minimo horizontal |
| EC-CR014-1 | Nome limpo e clica fora | Dialogo de erro; valor revertido |
| EC-CR014-2 | Salvamento automatico falha | Mensagem de erro; dados mantidos no form |
| EC-CR019-1 | Usuario muda valor auto-atribuido | Alteracao manual respeitada e persistida; auto-atribuicao NAO reaplica (entrada ja existe) |
| EC-CR022-1 | useColorScheme retorna null | Fallback para light com log |
| EC-AGD-001 | Ator deletado com agendas futuras | Snapshot preservado; nome permanece, FK vira NULL |
| EC-AGD-002 | Membro usado em oracao e deletado | Nome permanece na agenda como snapshot |
| EC-AGD-003 | Hino removido da tabela hymns | FK fica NULL; campo de hino aparece vazio na agenda |
| EC-AGD-004 | Domingo normal vira excecao (Conf. Geral) com agenda ja preenchida | Agenda permanece no banco mas domingo some da lista da aba Agenda; dados preservados caso excecao seja removida |
| EC-AGD-005 | Domingo normal vira "Reuniao de Testemunho" com agenda normal ja preenchida | Agenda muda para layout especial; campos de discursos e hino intermediario ficam ocultos mas dados preservados no banco |
| EC-AGD-006 | Modo Apresentacao com agenda vazia (nenhum campo preenchido) | Exibe cards com campos vazios / placeholders; nao bloqueia acesso |
| EC-AGD-007 | can_conduct=true mas can_preside=false no banco | Aplicacao corrige: can_preside=true automaticamente |
| EC-AGD-008 | Import-hymns com numero de hino duplicado no mesmo idioma | Upsert: atualiza titulo/sacramental do hino existente |
| EC-AGD-009 | Secretario designa discursante pela Agenda e depois Bispado muda pela aba Discursos | Aba Discursos prevalece (last-write-wins); Agenda reflete o estado atual de speeches |
| EC-AGD-010 | Domingo com agenda configurada deixa de ser excecao testemunho/primaria | Agenda muda para layout normal; campos de discursos reaparecem com dados de speeches |
| EC-PN-001 | Push token expirado ou invalido | Expo retorna erro; token removido de device_push_tokens automaticamente |
| EC-PN-002 | Usuario sem dispositivo registrado (nenhum token) | Notificacao simplesmente nao e enviada; sem erro |
| EC-PN-003 | Designacao feita e desfeita dentro de 5 min | Se discurso volta a not_assigned antes do envio, notificacao do Case 1 cancelada (status=cancelled) |
| EC-PN-004 | Domingo muda de "Discursos" para excecao antes de domingo 18h | Notificacoes semanais (Cases 2/3) suprimidas para esse domingo |
| EC-PN-005 | App offline quando push deveria registrar token | Token registrado na proxima abertura do app com conexao |
| EC-PN-006 | Multiplos dispositivos do mesmo usuario | Push enviado para TODOS os dispositivos registrados |
| EC-PN-007 | Fuso horario da ala nao configurado | Usa default: America/Sao_Paulo |
| EC-REG-001 | Self-registration com email ja existente | Erro "Este email ja esta em uso" |
| EC-REG-002 | Self-registration com combinacao estaca+ala ja existente | Erro "Esta combinacao de Estaca e Ala ja existe" |
| EC-REG-003 | Convite expirado (> 30 dias) | Erro "Convite expirado. Solicite um novo convite." |
| EC-REG-004 | Convite ja utilizado | Erro "Este convite ja foi utilizado." |
| EC-REG-005 | Reenvio de convite para mesmo email | Novo convite criado com novo token; anterior permanece |
| EC-REG-006 | Deep link com token invalido/inexistente | Erro generico "Convite invalido." |
| EC-REG-007 | Self-registration offline | Erro "Requer conexao"; acao NAO enfileirada |
| EC-REG-008 | Registro por convite offline | Erro "Requer conexao"; acao NAO enfileirada |
| EC-HIST-001 | Historico com muitas entradas (milhares) | Paginacao/scroll infinito; performance aceitavel via indice (ward_id, created_at DESC) |
| EC-HIST-002 | Busca no historico sem resultados | Mensagem "Nenhum resultado encontrado" |
| EC-HIST-003 | Acao executada offline | Log criado quando a mutacao for sincronizada com o servidor (nao no momento offline) |
| EC-HIST-004 | Idioma da ala muda apos acoes logadas | Descricoes antigas permanecem no idioma original (snapshot); novas acoes usam o novo idioma |
| EC-HIST-005 | Job de retencao executado | Entradas com created_at < now() - 2 anos sao removidas; entradas mais recentes intactas |

---

## 11. Assumptions Consolidadas

### 11.1 Decisoes de Dominio

| ID | Assumption |
|----|------------|
| ASM-001 | Status "Realizado" e resquicio e NAO sera implementado |
| ASM-004/005 | Temas em discursos sao snapshot (texto), nao referencia |
| ASM-006 | Autenticacao apenas email/senha. Sem OAuth/Google |
| ASM-007 | Criacao de Alas via self-registration do primeiro usuario. Sem CLI |
| ASM-008 | Demais usuarios convidados por link (deep link) pelo Bispado ou Secretario |
| ASM-009 | Secretario NAO designa pela aba Discursos nem Home, mas PODE designar pela aba Agenda (excecao documentada em ASM-AGD-003) |
| ASM-010 | Template WhatsApp editavel, com default traduzido por idioma |
| ASM-011 | Discursos criados via lazy creation |
| ASM-012 | Formato de arquivo para membros: CSV (nao Excel nativo) |
| ASM-013 | Conflitos offline: last-write-wins com timestamp |
| ASM-014 | Observador sem aba Configuracoes mas com Home e Discursos (read-only) |
| ASM-017 | Maximo 1 Bispo, 1 Primeiro Conselheiro, 1 Segundo Conselheiro, 1 Secretario, multiplos Observadores |
| ASM-018 | Padrao de codigo de pais: pelo idioma da ala (+55 pt-BR, +1 en, +52 es) |

### 11.2 Decisoes Adicionais

| ID | Assumption |
|----|------------|
| ASM-CR001-1 | Efeito 3D via gradiente radial CSS/RN, sem imagens |
| ASM-CR001-2 | Fading: ~2s por ciclo (1s in, 1s out) |
| ASM-CR002-1 | Preferencia de tema: AsyncStorage local, nao sincronizada no backend |
| ASM-CR003-1 | Edicao de usuario: apenas papel. Email/senha NAO editaveis |
| ASM-CR003-2 | Remocao de usuario: hard delete do Supabase Auth |
| ASM-CR003-3 | 6 Edge Functions: register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user |
| ASM-CR004-2 | Largura do mes = container com largura fixa, centralizados |
| ASM-CR008-1 | Caracter ordinal: "o" (U+00BA) |
| ASM-CR014-1 | Bandeiras como emoji flags, nao imagens |
| ASM-CR016-1 | Download mobile: expo-file-system + expo-sharing |
| ASM-CR016-2 | Upload mobile: expo-document-picker |
| ASM-CR024-1 | "Scaramental" corrigido para "Sacramental" |

### 11.3 Decisoes da Agenda

| ID | Assumption |
|----|------------|
| ASM-AGD-001 | Aba Agenda e a segunda tab (Home, Agenda, Discursos, Config) |
| ASM-AGD-002 | Bispado + Secretario editam a agenda; Observador read-only na aba Agenda |
| ASM-AGD-003 | Na aba Agenda, AMBOS (Bispado e Secretario) podem designar discursantes. Esta e uma excecao a regra geral onde so Bispado designa |
| ASM-AGD-004 | Ao designar discursante pela Agenda, status = assigned_confirmed automaticamente |
| ASM-AGD-005 | Tema do discurso NAO e visivel nem editavel na aba Agenda |
| ASM-AGD-006 | Tipo de reuniao (normal/testemunho/conferencia de ala/primaria) determinado pela tabela sunday_exceptions |
| ASM-AGD-007 | "Apresentacao Especial da Primaria" e "Conferencia de Ala" sao tipos de excecao no dropdown |
| ASM-AGD-008 | Reuniao de Testemunho, Conferencia de Ala e Apresentacao da Primaria usam mesmo layout de agenda (3 secoes) |
| ASM-AGD-009 | Atores sao snapshot (nome) + FK opcional; hinos sao FK puro |
| ASM-AGD-010 | Oracoes aceitam membro da ala (FK + snapshot) OU nome customizado (texto puro, sem persistir) |
| ASM-AGD-011 | Nenhum campo da agenda e obrigatorio — todos podem ficar vazios |
| ASM-AGD-012 | Modo Apresentacao e 100% read-only (nenhuma edicao) |
| ASM-AGD-013 | Botao "Iniciar Reuniao" visivel apenas no domingo (00:00-23:59), para todos os papeis |
| ASM-AGD-014 | Modo Apresentacao usa layout acordeao com 1 card expandido e todos os contraidos sempre visiveis |
| ASM-AGD-015 | Tabela de hinos e global (sem ward_id), ~300 por idioma, importada via script import-hymns |
| ASM-AGD-016 | Script import-hymns: CSV com colunas Lingua,Numero,Titulo,Sacramental(S/N); upsert por (language, number) |
| ASM-AGD-017 | Agendas passadas sao editaveis sem restricao |
| ASM-AGD-018 | Domingos com Conf. Geral, Conf. Estaca, ou Outro NAO aparecem na aba Agenda |
| ASM-CR026-1 | Dropdown de tipo de domingo fica no topo do card expandido, nas abas Discursos e Home |
| ASM-CR026-2 | Auto-atribuicao em lote ao carregar lista; todos os valores persistidos (inclusive "Discursos") |
| ASM-CR026-3 | "Outro" abre dialogo para digitar motivo customizado + OK |
| ASM-CR026-4 | "Conferencia de Ala" e um tipo de excecao com reuniao sacramental em formato especial |
| ASM-CR026-5 | Secao "Domingos sem Discursos" removida da aba Configuracoes |

### 11.4 Push Notifications

| ID | Assumption |
|----|------------|
| ASM-PN-001 | Push notifications via Expo Push Notifications (expo-notifications) |
| ASM-PN-002 | Observadores NAO recebem notificacoes |
| ASM-PN-003 | Notificacoes sao obrigatorias — sem opt-out individual |
| ASM-PN-004 | Ao tocar em qualquer notificacao, app abre na aba Home |
| ASM-PN-005 | Case 1 (designacao): delay de 5 min com agrupamento por domingo; domingos diferentes geram pushes separados |
| ASM-PN-006 | Cases 2 e 3 (lembrete semanal): todo domingo as 18:00 no fuso da ala; suprimidos se proximo domingo tem excecao |
| ASM-PN-007 | Cases 4 e 5 (confirmacao/desistencia): envio imediato |
| ASM-PN-008 | Textos traduzidos para 3 idiomas (pt, en, es) conforme idioma da ala |
| ASM-PN-009 | Fuso horario da ala: configuracao manual (campo timezone na tabela wards) |
| ASM-PN-010 | Token de push registrado a cada login/abertura do app |
| ASM-PN-011 | Edge Function agendada (cron) processa fila de notificacoes a cada minuto |

### 11.5 Self-Registration e Convite por Link

| ID | Assumption |
|----|------------|
| ASM-REG-001 | Primeiro usuario de uma ala cria a ala via self-registration (sem CLI) |
| ASM-REG-002 | Papel do primeiro usuario: escolhe entre Bispado ou Secretario (sem Observador) |
| ASM-REG-003 | Campo Estaca: texto livre (sem validacao contra base externa) |
| ASM-REG-004 | Convite por link: deep link nativo via expo-linking (wardmanager://invite/{token}) |
| ASM-REG-005 | Expiracao do convite: 30 dias a partir da criacao |
| ASM-REG-006 | Quem pode convidar: Bispado e Secretario (permissao invitation:create) |
| ASM-REG-007 | Senha: minimo 6 caracteres, sem restricoes extras |
| ASM-REG-008 | Reenvio de convite: permitido (novo token para mesmo email) |
| ASM-REG-009 | CLI create-ward removido — substituido por self-registration |
| ASM-REG-010 | Edge Function create-user removida — substituida por create-invitation + register-invited-user |

### 11.6 Historico

| ID | Assumption |
|----|------------|
| ASM-HIST-001 | Historico e read-only — entradas nunca sao editadas ou apagadas manualmente |
| ASM-HIST-002 | Retencao de 2 anos — entradas mais antigas removidas automaticamente |
| ASM-HIST-003 | Visivel para Bispado e Secretario; Observador nao ve |
| ASM-HIST-004 | Busca funciona nos 3 campos: data-hora, email, descricao |
| ASM-HIST-005 | Descricao no idioma da ala no momento da acao (snapshot) |
| ASM-HIST-006 | Acoes automaticas do sistema NAO sao logadas |
| ASM-HIST-007 | Descricao pode ser multilinha para acomodar acoes complexas |
| ASM-HIST-008 | Ordenacao: mais recentes primeiro (created_at DESC) |
| ASM-HIST-009 | Log e gerado a nivel de aplicacao (frontend/Edge Function), nao via trigger de banco |

---

## 12. Open Questions — Todas Resolvidas

| ID | Pergunta | Decisao |
|----|----------|---------|
| OQ-001 | Metodo de autenticacao | Email/senha apenas |
| OQ-002 | Fluxo de criacao de Ala | Self-registration do primeiro usuario |
| OQ-003 | Como convidar usuarios | Bispado/Secretario gera link de convite (deep link); usuario se registra via link |
| OQ-004 | Secretario designa? | NAO, apenas Bispado |
| OQ-005 | Estrategia de conflito offline | Last-write-wins com timestamp |
| OQ-006 | Upload sobrescreve sem aviso? | Sim, sobrescrita total |
| OQ-007 | Template WhatsApp | Editavel pelo Bispado/Secretario |
| OQ-008 | Quando status muda ao clicar WhatsApp | Ao clicar (antes de enviar) |
| OQ-009 | Quem pode remover designacao | Apenas Bispado |
| OQ-010 | Limite de membros | Sem limite rigido; otimizado para 500 |
| OQ-011 | Backups | Automaticos diarios, retencao 30 dias |
| OQ-012 | Aviso ao excluir tema designado | Dialogo com quantidade de discursos futuros |
| OQ-CR002-1 | Onde Observador configura tema | Usa modo do sistema (sem override) |
| OQ-CR002-2 | Alerts nativos seguem qual tema | Tema do sistema (padrao) |
| OQ-CR003-1 | Bispado pode editar senha de outro | NAO, apenas recriacao (remove + cria) |
| OQ-CR004-1 | Ano em domingo de ano diferente | Ao lado do mes ("fev 27") |
| OQ-CR008-1 | Caracter ordinal em portugues | Unicode U+00BA |
| OQ-CR015-1 | Seletor de pais | Dropdown inline com scroll |
| OQ-CR024-1 | Titulo em ingles | "Sacrament Meeting Manager" |

---

## 13. Non-Functional Requirements

### 13.1 Seguranca

- Autenticacao obrigatoria (nenhum acesso anonimo)
- Isolamento por ward_id via RLS no PostgreSQL
- Tentativa cross-ward: 403 + log de seguranca
- TLS em transito; dados criptografados em repouso
- Permissoes por papel no frontend (UI condicional) e backend (RLS)
- Edge Functions validam papel e ward_id do chamador
- Self-registration apenas para primeiro usuario de uma ala (cria ala + usuario)
- Demais usuarios via convite por link gerado pelo Bispado ou Secretario

### 13.2 Performance

- Lista de domingos carrega em < 2s
- Busca de membros filtra em < 200ms (debounce 200-300ms)
- Sincronizacao entre abas em < 5s
- Scroll infinito carrega +6 meses suavemente

### 13.3 UX

- Mobile-first: modo retrato, operavel com uma mao
- Feedback visual ao toque (press states)
- Textos ≥ 14px
- Contraste WCAG AA em dark e light mode
- Icones com labels descritivos para acessibilidade
- Salvamento automatico (sem botoes Salvar explicitos)
- Swipe-to-reveal para acoes destrutivas
- Scroll inicial instantaneo; expansao de card suave
- i18n: interface, mensagens, status, excecoes traduzidos

### 13.4 Offline

- App detecta perda de conexao e mostra banner "Offline"
- Mutacoes enfileiradas em AsyncStorage
- UI atualiza otimisticamente
- Reconexao: fila processada FIFO, last-write-wins
- Operacoes de usuario (Edge Functions) NAO funcionam offline
- Limite de 100 mutacoes na fila

### 13.5 Observabilidade

- Logs de seguranca para acesso cross-ward
- Logs de erro para falhas de validacao
- Metricas: latencia API (p95 < 2s), taxa de erro (< 1%)
- Nomes, telefones e senhas NUNCA em logs

---

## 14. Data Contracts

### 14.1 Inputs

- **Membro:** `{ nome_completo: string, telefone_internacional: "+xxyyyyyyyy" }`
- **Tema da Ala:** `{ titulo: string (obrigatorio), link: string|null }`
- **Excecao:** `{ data: date (domingo), motivo: enum|string }`
- **Designacao:** `{ domingo_data, posicao: 1|2|3, snapshot de nome/tema }`
- **Status:** `{ status: enum dos 5 status }`
- **CSV Membros:** `colunas [Nome, Telefone Completo]`
- **CSV Colecoes (admin):** `colunas [Idioma, Colecao, Titulo, Link]`
- **Idioma:** `{ idioma: 'pt-BR'|'en'|'es' }`
- **Ator da Reuniao:** `{ nome: string, can_preside: bool, can_conduct: bool, can_recognize: bool, can_music: bool }`
- **Agenda:** `{ sunday_date, campos de boas-vindas, sacramento, discursos, encerramento }`
- **CSV Hinos (admin):** `colunas [Lingua, Numero, Titulo, Sacramental(S/N)]`
- **Push Token:** `{ expo_push_token: string }`
- **Timezone:** `{ timezone: string (IANA) }`
- **Self-Registration:** `{ email: string, password: string, stake_name: string, ward_name: string, role: 'bishopric'|'secretary', language: string, timezone: string }`
- **Criar Convite:** `{ email: string, role: 'bishopric'|'secretary'|'observer' }`
- **Registro por Convite:** `{ token: string, password: string }`

### 14.2 Outputs

- Lista de Membros: `[{ id, nome, codigo_pais, telefone, data_criacao }]`
- Lista de Domingos: `[{ data, excecao, discursos: [{ posicao, speaker, tema, status }] }]`
- Lista de Colecoes: `[{ id, nome, tipo, idioma, ativa, temas }]`
- CSV de Membros: download
- Convites Pendentes: `[{ data, posicao, discursante, telefone, tema, status }]`
- Link WhatsApp: `wa.me/...?text=...`
- Agenda de Domingo: `{ sunday_date, presiding, conducting, recognized[], announcements, pianist, conductor, hymns, prayers, speeches[], special_meeting_type }`
- Lista de Hinos: `[{ language, number, title, is_sacramental }]`
- Lista de Atores: `[{ id, name, can_preside, can_conduct, can_recognize, can_music }]`
- Push Notification: `{ title: string, body: string, data: { screen: 'home' } }`
- Deep Link de Convite: `wardmanager://invite/{token}`
- Dados do Convite (para tela de registro): `{ stake_name: string, ward_name: string, role: string, email: string, expired: boolean, used: boolean }`
- Lista de Historico: `[{ id, created_at, user_email, action_type, description }]` (paginado, ordenado por created_at DESC)

---

## 15. Constraints

- iOS, Android e Web — mesma experiencia
- Funcionar com conexao intermitente
- Apenas 1 usuario por Ala usa o app por vez
- Idiomas: pt-BR (padrao), en, es
- 3 discursos por domingo — estrutura fixa
- 1o domingo: auto-marcado (Reuniao de Testemunho ou Conferencia Geral em Abr/Out)
- Discursos armazenam snapshots (nao referencias)
- Upload de membros: sobrescrita total
- Colecoes Gerais: via script admin apenas
- 5 status de discurso (nao-designado, nao-convidado, convidado, confirmado, desistiu)
- 4 tabs: Home, Agenda, Discursos, Configuracoes
- Reuniao sacramental segue rito fixo com secoes definidas
- Hinos: tabela global importada por admin; ~300 por idioma
- Atores da reuniao: por ala, com 4 papeis (presidir, dirigir, reconhecer, musica)
- Tipo de domingo: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro
- Push notifications obrigatorias para Bispado e Secretario; Observadores excluidos
- Fuso horario da ala: IANA timezone, configurado manualmente
- 6 Edge Functions de usuario (register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user) + 1 Edge Function de cron para notificacoes
- Deep link scheme: wardmanager://invite/{token}
- Convites expiram em 30 dias
- Historico: retencao de 2 anos; read-only; busca nos 3 campos
- Tabela activity_log com indice (ward_id, created_at DESC)

---

## 16. Definition of Done

- Todos os requisitos Must have implementados e funcionais
- Cada AC (AC-001 a AC-044 + ACs adicionais) com pelo menos 1 teste automatizado
- Todos os edge cases (EC-001 a EC-016 + ECs adicionais) testados
- App funciona em iOS, Android e Web
- Autenticacao com 3 papeis e permissoes corretas
- Isolamento de dados validado (RLS)
- i18n para pt-BR, en, es
- Dark/light mode funcional com contraste WCAG AA
- Sincronizacao entre abas < 5s
- Lista de domingos carrega em < 2s
- Textos ≥ 14px
- Offline basico funcional
- Cobertura de testes ≥ 80% para logica de negocio
- Zero vulnerabilidades criticas (OWASP Top 10)
- Aba Agenda funcional: formulario de agenda, seletores de ator/hino/oracao, designacao de discursante
- Modo Apresentacao: layout acordeao read-only com navegacao entre secoes
- Tabela de hinos importada via script import-hymns
- Tipo de excecao "Apresentacao Especial da Primaria" e "Conferencia de Ala" funcional
- Dropdown de tipo de domingo no card expandido (Discursos/Home) com auto-atribuicao em lote
- Push notifications funcionais: 5 casos (designacao, lembrete semanal x2, confirmacao, desistencia) com textos i18n
- Registro de token de push ao login/abertura do app
- Edge Function de cron processando fila de notificacoes
- Fuso horario configuravel por ala
- Self-registration funcional: tela de self-registration cria ala + primeiro usuario
- Convite por link funcional: gerar convite, deep link, tela de registro por convite
- Tabela invitations com token, expiracao e controle de uso
- Tabela wards com stake_name e unique constraint (stake_name, name)
- 6 Edge Functions de usuario operacionais (register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user)
- Deep link scheme wardmanager://invite/{token} configurado
- Textos i18n para self-registration e convite em pt, en, es
- Historico funcional: tabela activity_log, tela read-only com busca, todas as acoes manuais logadas
- Retencao de 2 anos com job automatico de limpeza
- Descricoes de acoes geradas no idioma da ala

---

## 17. Itens Pendentes de Implementacao

Os seguintes itens ainda nao foram implementados:

| Item | Descricao | Status |
|------|-----------|--------|
| Auto-scroll Home | Auto-scroll para card expandido ficar visivel na tela Home | Pendente |
| Gerenciar usuarios | Secretario reporta nao ver opcao de gerenciar usuarios (comportamento esperado se nao e Bispado; investigar se e bug real de extracao de papel) | Pendente |
| Dropdown codigo | Clicar no campo de codigo internacional fecha o card do membro | Pendente |
| Botao Sair | Botao "Sair" nas Configuracoes nao faz nada | Pendente |

---

## 18. Historico de Alteracoes

| Versao | Data | Descricao |
|--------|------|-----------|
| 1.0 | 13/02/2026 | Versao inicial |
