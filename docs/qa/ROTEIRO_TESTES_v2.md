# Roteiro de Testes Manuais — Sacrament Meeting Planner (v2.0 / staging)

Passo-a-passo para validar **todas** as funcionalidades do app no ambiente **staging**, via Expo Go.
Cada item tem **Passos** (o que fazer) e **Esperado** (o que deve acontecer). Marque `[x]` ao passar.

## Legenda
- `⏸ SEED` — pare e **me peça** para injetar dados no banco antes de continuar (eu gero/rodo o SQL).
- `🔑 PAPEL` — troque a conta logada (bispado / secretário / observador).
- `📴 OFFLINE` — coloque o dispositivo em modo avião (ou desligue o Wi-Fi).
- `📱 2 DISPOSITIVOS` — precisa de dois aparelhos/simuladores logados ao mesmo tempo.
- `⚙️ BACKEND` — a validação real é no servidor; na UI confira que o botão/afeta some ou dá erro.

## Pré-requisitos
1. App aberto no Expo Go apontando para o **Supabase staging** (o mesmo onde rodamos `db push`).
2. `⏸ SEED` **Contas de teste** — me peça para preparar 3 usuários no staging:
   - `bispado@teste` (papel **bishopric**)
   - `secretario@teste` (papel **secretary**)
   - `observador@teste` (papel **observer**)
   - todos na **mesma ala** de teste. (Auth users + app_metadata: eu preparo; você confirma a senha.)
3. `⏸ SEED` **Ala de teste** com nome e estaca conhecidos (ex.: Ala "Teste Norte", Estaca "Estaca Central").

> Dica: para cada bloco `🔑 PAPEL`, saia (Sign out) e entre com a conta indicada. O logout deve limpar
> o cache (ver teste 1.6) — então dados da conta anterior não podem aparecer.

---

## 1. Autenticação e onboarding

### 1.1 Login válido
- Passos: abra o app deslogado → informe email/senha do `bispado@teste` → entrar.
- Esperado: vai para a Home; título mostra "Agenda da Reunião Sacramental — {nome da ala}".

### 1.2 Login inválido
- Passos: informe uma senha errada → entrar.
- Esperado: mensagem de erro; permanece na tela de login (sem travar).

### 1.3 Reset de senha — link expirado / inválido
- Passos: abra um link de recuperação inválido (ex.: `.../reset-password?token=abc&type=recovery`).
- Esperado: **não** fica travado no spinner; aparece mensagem de erro + botão "Voltar ao login".

### 1.4 Reset de senha — sem token e sem sessão (timeout)
- Passos: abra a tela de reset sem token válido e aguarde ~8s.
- Esperado: após o timeout aparece erro + "Voltar ao login" (nunca spinner infinito).

### 1.5 Registro de usuário convidado (token)
- `⏸ SEED` peça um **convite válido** (deep link) para um email novo.
- Passos: abra o deep link → preencha nome + senha → registrar.
  - Esperado: cria a conta e entra na ala com o papel do convite.
- Repita com: `⏸ SEED` **convite expirado** → Esperado: "convite expirado".
- Repita com: **convite já usado** (use o mesmo deep link 2x) → Esperado: "convite já utilizado".
- Token adulterado (troque um caractere) → Esperado: "convite inválido".

### 1.6 Logout limpa o cache (privacidade entre usuários)
- Passos: logado como `bispado@teste`, navegue por Membros/Agenda (gera cache) → Sign out →
  entre como `secretario@teste` na **mesma ala**.
- Esperado: nenhuma tela mostra, por um instante, dados carregados da sessão anterior antes do refetch.

---

## 2. Home

### 2.1 Nome da ala no título
- Esperado: "Agenda da Reunião Sacramental — {ala}". Se o nome for alterado (teste 8.1), reflete aqui.

### 2.2 Próximos domingos / prontidão
- Esperado: cartões dos próximos domingos com indicadores de prontidão (oradores/orações/hinos).

### 2.3 Botão de apresentação (Play)
- Passos: toque no Play de um domingo com dados.
- Esperado: abre o modo de apresentação para aquela data.

---

## 3. Reunião / Domingos (aba Agenda)

### 3.1 Auto-atribuição do tipo de domingo (`sunday_type`) — FUNCIONALIDADE NOVA
- Pré: logado como **bispado/secretário**, **online**.
- Passos: abra a aba de Reuniões e observe os próximos domingos (role a lista se preciso).
- Esperado:
  - 1º domingo de mês comum → **Reunião de Testemunhos**.
  - Abril/Outubro: 1º domingo → **Conferência Geral**; 2º domingo → **Reunião de Testemunhos**.
  - Demais domingos → **Discursos**.
  - Domingos já definidos manualmente **não** são sobrescritos; domingos passados **não** mudam.
- `📴 OFFLINE` / `🔑 PAPEL observador`: a auto-atribuição **não** grava (só leitura).

### 3.2 Trocar o tipo manualmente + "Outros"
- Passos: em um domingo, abra o seletor de tipo → escolha "Conferência de Estaca" → salve.
  Depois escolha "Outros" e digite um motivo.
- Esperado: tipo atualiza; "Outros" mostra o texto custom; reverter volta ao tipo automático.

### 3.3 Disclosure progressivo (colapsado → expandido → edição)
- Passos: toque na área de status (expande inline) e na área de oradores (abre tela de edição L3).
- Esperado: transições corretas; ao fechar a edição, a lista volta ao topo.

### 3.4 Oradores (tela de edição)
- `⏸ SEED` garanta ~5 membros na ala (para escolher como oradores).
- Passos: atribua um **orador** (escolha membro) e um **tema**; ative o 2º discurso; mude status
  (não designado → designado → convidado → confirmado); remova um orador.
- Esperado: cada ação persiste; badges/So status refletem; transições inválidas são bloqueadas.
- `🔑 PAPEL observador`: os controles de status/atribuição ficam desabilitados.

### 3.5 Orações (abertura/encerramento/intermediária)
- Passos: defina orador de oração de abertura e encerramento; se "gerenciar orações" estiver ligado,
  confira a oração intermediária.
- Esperado: persiste; aparece na apresentação.

### 3.6 Hinos (incl. intermediário) — seletor em tela cheia
- Passos: abra o seletor de hinos (deve abrir em tela cheia); busque por número e por título;
  use o scrubber lateral; selecione um hino.
- Esperado: seleção persiste; scrubber navega sem perder o gesto.

### 3.7 Ordenanças / anúncios
- Passos: marque "bênção de bebê" / "batismo-confirmação" / "anúncios da estaca" / "apresentação especial".
- Esperado: refletem no cartão e na apresentação.

### 3.8 Designações (apoio/desobrigação/sacerdócio/novo membro) + trava de permissão
- Passos: crie uma designação de **apoio** vinculada a um membro → salvar → confirme atualizar o chamado.
  Teste **desobrigação** (confirmar limpa o chamado; recusar mantém). Teste **sacerdócio** (mostra ofício).
- Esperado: snapshot salvo; chamado do membro atualizado conforme a escolha.
- `🔑 PAPEL observador` (deep link p/ `designations/{data}`): botão salvar **desabilitado**; não grava.

### 3.9 Presença (domingos passados)
- `⏸ SEED` peça um domingo **passado** com agenda.
- Passos: abra o cartão do domingo passado e informe a presença.
- Esperado: valor persiste (lazy-create + update).
- `📴 OFFLINE`: o campo de presença fica desabilitado.

### 3.10 Modo de apresentação
- Passos: inicie a apresentação de um domingo completo; navegue pelos itens.
- Esperado: mostra presidindo/dirigindo, hinos, orações, oradores, designações; sem quebrar em campos nulos.

---

## 4. Membros

### 4.1 Lista e busca
- Esperado: lista ordenada; busca por nome (com/sem acento) filtra corretamente.

### 4.2 Adicionar / editar pessoa (PersonEditor)
- Passos: adicione pessoa com capacidades (preside/dirige/rege/piano/reconhecer), chamado, e
  "contatar via responsável" (escolha um responsável). Edite depois.
- Esperado: salva e fecha; ao reabrir, os dados batem.

### 4.3 Feedback de falha ao salvar — FUNCIONALIDADE NOVA
- `📴 OFFLINE` (ou peça para eu forçar um erro): tente salvar uma pessoa.
- Esperado: aparece mensagem de erro e o **modal permanece aberto** (não fecha silenciosamente).

### 4.4 Exportar CSV
- Passos: exporte a lista (ou, se vazia, veja as linhas de exemplo).
- Esperado: 10 colunas fixas; abre no Excel/Sheets **sem executar fórmula** — um nome iniciado por
  `=`, `+`, `-` ou `@` aparece como texto (proteção contra injeção). `⏸ SEED` posso inserir um membro
  com nome `=SOMA(...)` para você exportar e conferir.

### 4.5 Importar CSV (destrutivo)
- Passos: importe um CSV válido (10 colunas) → confirme (apaga tudo e recria).
- Esperado: lista substituída corretamente; responsáveis resolvidos por nome.
- Casos de erro:
  - CSV com cabeçalho errado / colunas trocadas → **rejeitado** (não apaga a lista).
  - CSV com valor multi-linha (quebra de linha dentro de aspas) → reimporta **intacto**.
  - Nome iniciado por `=`/`@` (guardado com `'`) → reimporta como o texto original.
- `📴 OFFLINE`: botão de importar **desabilitado**.

### 4.6 Excluir membro
- Passos: exclua um membro sem discursos futuros.
- Esperado: some da lista.

---

## 5. Papéis e permissões (rode o app com cada conta)

### 5.1 Observador é somente-leitura
- `🔑 PAPEL observador`
- Esperado: Agenda/oradores/orações/hinos/designações **não editáveis**; sem grupo "Configurações da ala".

### 5.2 Observador na tela de Usuários (self-service) — FUNCIONALIDADE
- `🔑 PAPEL observador` → Configurações → (se acessível) Usuários.
- Esperado: **não** fica travado num erro de "sem permissão"; vê **apenas o próprio card** e pode
  editar o próprio nome / excluir a própria conta. Não vê a lista completa da ala.

### 5.3 `⚙️ BACKEND` RLS de escrita (P0-1)
- Contexto: mesmo que a UI não ofereça, o servidor bloqueia escrita de observador.
- Como validar: me peça para rodar, com a sessão do observador, um INSERT/UPDATE direto (ex.: em
  `members`/`speeches`) contra o staging → Esperado: **negado** (RLS `can_write()`).

---

## 6. Usuários e convites (Configurações → Usuários) — papéis bispado/secretário

### 6.1 Convidar usuário
- Passos: convide um email novo com papel "observador" → copie o deep link gerado.
- Esperado: convite criado; deep link válido (testado no 1.5).

### 6.2 Trocar papel
- Passos: mude o papel de outro usuário.
- Esperado: sucesso; UI atualiza.
- Casos: não pode mudar o **próprio** papel; ao rebaixar o **último bispado**, aparece a mensagem de
  bloqueio (não o erro genérico) — FUNCIONALIDADE corrigida.

### 6.3 Excluir usuário
- Passos: exclua outro usuário → depois exclua a **própria** conta.
- Esperado: excluir outro → some da lista; excluir a si → faz **sign out**.

### 6.4 Timeout de 30 dias + auto-revoke — FUNCIONALIDADE NOVA
- `⏸ SEED` peça 2 convites: um **expirado** (>30 dias) e um válido, ambos não usados.
- Passos: crie **um novo convite** na mesma ala.
- Esperado: ao criar, os convites **expirados e não usados** da ala são removidos automaticamente
  (limpeza preguiçosa). O convite expirado não pode ser usado (teste 1.5).
- `⚙️ BACKEND` (opcional): se o pg_cron estiver ativo, existe o job diário `revoke-expired-invitations`.

---

## 7. Notificações push

### 7.1 Registro do token (não-observadores)
- `🔑 PAPEL bispado/secretário`, conceda permissão de notificação no 1º acesso.
- Esperado: token registrado. `🔑 PAPEL observador`: **não** registra.

### 7.2 Opt-out mestre — FUNCIONALIDADE NOVA
- Passos: Configurações → **Notificações** → desligue o interruptor mestre.
- `⏸ SEED` peça para eu disparar um lembrete (ou enfileirar uma notificação) para a ala.
- Esperado: com opt-out **desligado**, o aparelho **não** recebe push; religando, volta a receber.
- `📴 OFFLINE`: interruptor desabilitado.

### 7.3 Textos distintos (assignment vs confirmation) — FUNCIONALIDADE
- `⏸ SEED` peça para eu enfileirar um `weekly_assignment` e um `weekly_confirmation`.
- Esperado: os corpos são **diferentes** (designar oradores vs. fazer acompanhamento).

### 7.4 Re-registro ao trocar de ala na sessão
- Pré: usuário que pertence a mais de uma ala (ou peça `⏸ SEED` para trocar o ward_id).
- Esperado: ao trocar de ala sem sair, o token é re-registrado para a nova ala.

---

## 8. Configurações

### 8.1 Editar nome da ala e da estaca — FUNCIONALIDADE NOVA
- `🔑 PAPEL bispado/secretário` → Configurações → **Nome da ala e estaca**.
- Passos: altere o nome da ala e da estaca → salvar.
- Esperado: salva; a Home reflete o novo nome (teste 2.1). Campo vazio → erro "nome obrigatório".
- `📴 OFFLINE`: salvar desabilitado. `🔑 PAPEL observador`: a entrada nem aparece.

### 8.2 Fuso horário / idioma do app / idioma da ala / tema
- Passos: mude cada um.
- Esperado: aplica imediatamente; idioma do app troca os textos (pt-BR/en-US/es-LA).

### 8.3 Gerenciar orações (toggle)
- Passos: ligue/desligue.
- Esperado: mostra/oculta a oração intermediária nos domingos. `📴 OFFLINE`: desabilitado.

### 8.4 Modelos de WhatsApp / designação
- Passos: edite um modelo (inclua **quebras de linha** e um placeholder vazio).
- Esperado: ao enviar (teste 9), as quebras de linha são **preservadas**; espaços de placeholder
  vazio são limpos (FUNCIONALIDADE corrigida).

### 8.5 Histórico / log de atividades
- Passos: abra o histórico; use a busca.
- Esperado: lista as ações; a busca com debounce filtra; sair da tela não gera warning.

---

## 9. WhatsApp

### 9.1 Enviar convite por WhatsApp
- Passos: em um orador designado com telefone, toque no botão do WhatsApp.
- Esperado: abre o WhatsApp com a mensagem certa (nome/data/tema; wrapper de delegação se aplicável).

### 9.2 Status "convidado" só quando abre de fato — FUNCIONALIDADE corrigida
- Passos: em um aparelho **sem WhatsApp instalado** (ou cancele a abertura), toque em enviar.
- Esperado: aparece o alerta "WhatsApp não instalado/erro" e o status **não** muda para "convidado".
  Com WhatsApp abrindo normalmente, o status muda para "convidado".

### 9.3 Delegação de contato
- `⏸ SEED` um membro com "contatar via responsável".
- Esperado: a mensagem vai para o **telefone do responsável**, com o wrapper de delegação.

---

## 10. Offline

### 10.1 Banner de offline
- `📴 OFFLINE`: aparece o banner global de offline.

### 10.2 Leitura funciona, escrita bloqueada
- `📴 OFFLINE`: navegar/ler funciona; edições (tipo de domingo, oradores, orações, presença, import,
  configs de ala) ficam **desabilitadas**.

### 10.3 Reconexão / prefetch
- Passos: volte a ficar online.
- Esperado: dados atualizam (prefetch dispara na reconexão, não só no cold start).

---

## 11. Tempo real (sincronização)

### 11.1 `📱 2 DISPOSITIVOS` mudança propaga
- Passos: em A, atribua um orador; observe B (mesma ala, mesma data).
- Esperado: B atualiza automaticamente (realtime); em conexão ruim, cai para polling e ainda atualiza.

### 11.2 Escrita concorrente (status de discurso) — FUNCIONALIDADE
- `📱 2 DISPOSITIVOS`: A e B mudam o status do **mesmo** discurso quase ao mesmo tempo.
- Esperado: a 2ª escrita, se o status já mudou, recebe erro de "tente novamente" (não aplica cega).

---

## 12. Regressões rápidas (sanidade)
- [ ] Trocar de aba não perde estado de expansão indevidamente.
- [ ] Nenhuma tela mostra spinner infinito.
- [ ] Textos nos 3 idiomas (pt-BR / en-US / es-LA) sem chaves faltando.
- [ ] Nenhum crash ao abrir domingos sem dados.

---

## Anexo — pontos `⏸ SEED` (o que eu injeto quando você pausar)
1. 3 usuários de teste (bishopric/secretary/observer) na mesma ala. *(auth users — preparo à parte)*
2. Ala de teste com nome/estaca conhecidos.
3. ~5 membros (para oradores/atribuições), incluindo 1 com "contatar via responsável".
4. 1 membro com nome iniciado por `=`/`@` (teste de injeção CSV, 4.4).
5. Convite válido / convite expirado / convite usado (1.5, 6.4).
6. Domingo passado com agenda (presença, 3.9).
7. Enfileirar notificações `weekly_assignment` e `weekly_confirmation` (7.2, 7.3).
8. (Opcional) segundo ward_id para o usuário, p/ testar re-registro de token (7.4).

> Quando chegar num `⏸ SEED`, me diga o número — eu gero o SQL e injeto no staging (ou te passo pra
> rodar via `supabase db execute`/SQL Editor se o sandbox bloquear a escrita direta).
