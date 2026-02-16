# ARCH Audit Report

**Data:** 2026-02-16
**Auditor:** architect (devteam)

## Sumario Executivo
- Total de divergencias encontradas: 27
- Dimensao 1 (ARCH vs SPEC): 11 divergencias
- Dimensao 2 (ARCH vs Codigo): 16 divergencias
- Novos CRs propostos: CR-44 a CR-61

**ERRATA v2 (2026-02-16):** Corrigidos D2-008 e D2-014 conforme decisao do usuario: o valor "speeches" DEVE ser persistido no banco. O comentario em useSundayTypes.ts esta CORRETO; o codigo que filtra speeches e que esta ERRADO. Adicionado CR-56 para corrigir persistencia e CHECK constraint. Adicionadas divergencias D1-011 e D2-016 e CRs CR-57 a CR-61 para tratamento global de excecoes.

## Dimensao 1: ARCH vs SPECs e Documentos de Entrada

### [D1-001] ARCH_M002 nao inclui coluna custom_reason na tabela sunday_exceptions
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Spec relacionada:** SPEC_CR.md (CR-6)
- **Doc de entrada:** CHANGE_REQUESTS_1.txt item 6
- **O que a ARCH diz:** ARCH_M002 Data Model lista sunday_exceptions com colunas `[id, ward_id, date, reason]` (linha 141)
- **O que a SPEC/Doc diz:** CR-6 adicionou o tipo "Outro" que requer um campo `custom_reason` para o usuario escrever o motivo. ARCH_CR001 documenta a migracao 008 que adiciona `custom_reason TEXT`
- **Divergencia:** O modulo base ARCH_M002 nunca foi atualizado para incluir `custom_reason` na lista de colunas. O dado esta no ARCH_CR001 mas a definicao canonica do modulo M002 esta desatualizada
- **Impacto:** Baixo (informacao correta existe em ARCH_CR001, mas inconsistencia cria confusao)
- **CR proposto:** CR-44: Atualizar ARCH_M002 Data Model para incluir custom_reason na tabela sunday_exceptions

---

### [D1-002] ARCH_M002 enum de sunday_exceptions.reason desatualizado
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Spec relacionada:** SPEC_CR.md (CR-6), SPEC_F007.md
- **Doc de entrada:** CHANGE_REQUESTS_1.txt item 6
- **O que a ARCH diz:** ARCH_M002 nao lista os valores validos do enum reason na definicao da tabela
- **O que a SPEC/Doc diz:** Apos CR-6, os valores corretos sao: testimony_meeting, general_conference, stake_conference, ward_conference, primary_presentation, other
- **Divergencia:** ARCH_M002 nunca foi atualizado para refletir a correcao do enum feita em CR-6 e documentada em ARCH_CR001
- **Impacto:** Baixo (informacao correta existe em ARCH_CR001)
- **CR proposto:** CR-44 (mesmo CR) - consolidar enum correto no ARCH_M002

---

### [D1-003] ARCH_M002 diagrama ainda mostra "Actors" como item do Settings tab
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Spec relacionada:** SPEC_CR2.md (CR-26)
- **Doc de entrada:** CHANGE_REQUESTS_2.txt item 26
- **O que a ARCH diz:** ARCH_M002 diagrama (linha 29) mostra "Actors" como item do Settings tab, e componente #5 "ActorManagementScreen" lista CRUD de atores como tela de configuracoes
- **O que a SPEC/Doc diz:** CR-26 removeu completamente a tela de gerenciamento de atores das Configuracoes. Atores sao agora gerenciados inline dentro dos cards de agenda via ActorSelectorDialog
- **Divergencia:** ARCH_M002 nao foi atualizado apos CR-26. O diagrama e a lista de componentes ainda referenciam ActorManagementScreen que nao deve mais existir
- **Impacto:** Medio (pode confundir desenvolvedores que leiam o modulo base)
- **CR proposto:** CR-45: Atualizar ARCH_M002 para remover ActorManagementScreen e atualizar diagrama

---

### [D1-004] ARCH_M006 SyncEngine nao reflete integracao com OfflineManager
- **Modulo ARCH:** ARCH_M006 (SyncEngine), ARCH_M007 (OfflineManager)
- **Spec relacionada:** SPEC_F011.md, SPEC_F022.md
- **Doc de entrada:** PRODUCT_SPECIFICATION RNF-04, RNF-05
- **O que a ARCH diz:** ARCH_M006 define RealtimeSubscriber e PollingFallback como componentes separados. ARCH_M007 define ConnectionDetector e OfflineGuard. Os dois modulos sao independentes
- **O que a SPEC/Doc diz:** RNF-04 exige sincronizacao em tempo real (ate 5s). RNF-05 exige funcionamento offline com sync ao reconectar. Os dois devem trabalhar integrados
- **Divergencia:** A ARCH define os modulos mas nao descreve COMO eles se integram no _layout.tsx ou em qual ponto do ciclo de vida da app eles sao inicializados. Nao ha um diagrama de integracao entre M006 e M007
- **Impacto:** Alto (na pratica, como mostra D2-001 abaixo, nenhum dos dois esta conectado ao app)
- **CR proposto:** CR-46: Adicionar secao de integracao entre M006/M007 na ARCH definindo o ponto de montagem

---

### [D1-005] ARCH_M008 nao documenta Settings sub-screens criados por CRs
- **Modulo ARCH:** ARCH_M008 (UIShell)
- **Spec relacionada:** SPEC_CR.md, SPEC_CR2.md, SPEC_CR3.md
- **Doc de entrada:** CHANGE_REQUESTS 1-3
- **O que a ARCH diz:** ARCH_M008 lista 8 componentes no modulo UIShell. Nao inclui ThemeScreen, AboutScreen, HistoryScreen, TimezoneScreen, MembersScreen, TopicsScreen, WhatsAppScreen, UsersScreen como componentes do modulo
- **O que a SPEC/Doc diz:** Todas essas telas existem e sao parte do Settings flow gerenciado pelo UIShell
- **Divergencia:** ARCH_M008 original nao contempla a maioria das sub-telas de Settings que foram criadas. Os ARCH_CR* documentam as mudancas, mas o modulo base nunca foi atualizado para listar todos os seus componentes
- **Impacto:** Medio (falta uma visao completa do modulo)
- **CR proposto:** CR-47: Atualizar ARCH_M008 com lista completa de componentes incluindo todas as sub-telas de Settings

---

### [D1-006] ARCH_M001 AuthContext nao documenta funcao signOut (pre-CR-43)
- **Modulo ARCH:** ARCH_M001 (AuthModule)
- **Spec relacionada:** SPEC_CR3.md (CR-43)
- **Doc de entrada:** CHANGE_REQUESTS_3.txt item 43
- **O que a ARCH diz:** ARCH_M001 contrato AuthContext lista `signOut(): Promise<void>` na interface
- **O que a SPEC/Doc diz:** CR-43 pede botao de sign-out. ARCH_CR003 documenta a implementacao
- **Divergencia:** Nao ha divergencia real aqui -- ARCH_M001 ja previa signOut no contrato. Porem a ARCH_M001 nao documenta o fluxo de sign-out (queryClient.clear -> signOut -> redirect). Isso so esta em ARCH_CR003
- **Impacto:** Baixo (informacao existe em ARCH_CR003)
- **CR proposto:** Nenhum (coberto pela atualizacao geral proposta em CR-47)

---

### [D1-007] ARCH_M004 nao documenta formatFullDate e dateHeader do Presentation Mode
- **Modulo ARCH:** ARCH_M004 (AgendaModule)
- **Spec relacionada:** SPEC_CR3.md (CR-38)
- **Doc de entrada:** CHANGE_REQUESTS_3.txt item 38
- **O que a ARCH diz:** ARCH_M004 nao menciona data formatada no header do Presentation Mode
- **O que a SPEC/Doc diz:** CR-38 especifica que o header do Presentation Mode deve mostrar a data por extenso (ex: "Domingo, 16 de Fevereiro de 2026")
- **Divergencia:** ARCH_M004 base nao foi atualizado para incluir a exibicao de data no Presentation Mode. Documentado apenas em ARCH_CR003
- **Impacto:** Baixo
- **CR proposto:** CR-48: Atualizar ARCH_M004 PresentationMode contract para incluir formatFullDate

---

### [D1-008] PRODUCT_SPECIFICATION nao atualizado apos CRs 6, 26, 29, 30
- **Modulo ARCH:** N/A (documento de entrada)
- **Spec relacionada:** SPEC_CR.md (CR-6), SPEC_CR2.md (CR-26, CR-29, CR-30)
- **Doc de entrada:** PRODUCT_SPECIFICATION.md
- **O que a ARCH diz:** ARCH_CR001 e ARCH_CR002 documentam as mudancas
- **O que a SPEC/Doc diz:** PRODUCT_SPECIFICATION ainda referencia: (a) Sunday types errados nos RFs (RF-21 menciona "Domingo de Jejum", "Programa Especial", "Sem Reuniao" que foram removidos por CR-6), (b) RF-22 ainda descreve checkboxes para atores (mudado por CR-26), (c) RF-21.3 labels de secao nao refletem CR-29/CR-30
- **Divergencia:** PRODUCT_SPECIFICATION.md nao foi atualizado para refletir CRs que mudaram comportamento do produto. Como documento de entrada, ele deveria ser a fonte de verdade, mas esta inconsistente
- **Impacto:** Alto (desenvolvedores novos que leiam PRODUCT_SPECIFICATION vao encontrar informacao desatualizada)
- **CR proposto:** CR-49: Atualizar PRODUCT_SPECIFICATION.md para refletir CRs 6, 26, 29, 30

---

### [D1-009] SPEC.final.md secao 7.8 nao atualizada para Secretario (CR-23)
- **Modulo ARCH:** N/A (documento de entrada)
- **Spec relacionada:** SPEC_CR2.md (CR-23), SPEC_CR3.md (CR-37)
- **Doc de entrada:** SPEC.final.md, CHANGE_REQUESTS_3.txt item 37
- **O que a ARCH diz:** ARCH_CR002 documenta que permissions.ts ja foi atualizado para secretario com settings:users
- **O que a SPEC/Doc diz:** CR-37 (CHANGE_REQUESTS_3) diz explicitamente que SPEC.final.md secao 7.8 e 4.2 precisam ser atualizados para refletir que Secretario agora tem acesso a gerenciamento de usuarios
- **Divergencia:** CR-37 esta na ARCH_CR003 como F025 (docs-only), mas a correcao nos documentos de entrada pode nao ter sido feita. SPEC.final.md ainda diz "Secretario=No" para gerenciamento de usuarios
- **Impacto:** Medio (contradiz o codigo implementado)
- **CR proposto:** CR-50: Executar correcoes docs-only de F025 (CR-31, CR-34, CR-36, CR-37) no SPEC.final.md e PRODUCT_SPECIFICATION

---

### [D1-010] ARCH nao documenta o script de importacao de hinos (RF-23.1)
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Spec relacionada:** SPEC_F006.md
- **Doc de entrada:** PRODUCT_SPECIFICATION RF-23.1
- **O que a ARCH diz:** ARCH_M002 componente #6 "HymnsCatalog" menciona "admin script import" mas nao detalha o script, sua localizacao, ou como roda
- **O que a SPEC/Doc diz:** RF-23.1 especifica: "O administrador deve conseguir importar o hinario completo via script CSV. Formato: Lingua,Numero,Titulo,Sacramental(S/N). Comando: pnpm import-hymns hinario.csv"
- **Divergencia:** A ARCH nao tem uma secao detalhando o script de importacao, seus parametros, validacao, e formato de saida. Nao existe diretorio `/scripts` no codigo
- **Impacto:** Baixo (feature funcional via seed/migration, mas sem CLI conforme spec)
- **CR proposto:** CR-51: Criar script pnpm import-hymns conforme RF-23.1 e documentar na ARCH

---

### [D1-011] ARCH nao define estrategia global de tratamento de excecoes
- **Modulo ARCH:** Todos (M001-M008)
- **Spec relacionada:** PRODUCT_SPECIFICATION RNF-01 (usabilidade), RNF-06 (seguranca)
- **Doc de entrada:** PRODUCT_SPECIFICATION.md, decisao do usuario
- **O que a ARCH diz:** Nenhum modulo da ARCH define uma estrategia global de tratamento de excecoes. Nao ha ADR para error handling. Nao ha padrao definido para: (a) como mutations devem tratar erros, (b) como queries devem exibir erros na UI, (c) quando usar Error Boundary vs try/catch, (d) como logar erros, (e) como internacionalizar mensagens de erro
- **O que a SPEC/Doc diz:** RNF-01 exige usabilidade ("interface limpa e intuitiva"). Mensagens de erro tecnicas ou em ingles hardcoded violam esse requisito. O usuario demanda tratamento de excecoes completo
- **Divergencia:** A ARCH nao tem modulo ou secao transversal que defina a estrategia de error handling. Cada modulo trata erros de forma ad-hoc ou simplesmente nao trata
- **Impacto:** CRITICO -- Ausencia de tratamento de excecoes consistente resulta em: excecoes silenciosas, mensagens de erro em ingles hardcoded, tabs inteiras sem feedback de erro, e mutations sem onError
- **CR proposto:** CR-57 a CR-61: Tratamento global de excecoes (ver secao abaixo)

---

## Dimensao 2: ARCH vs Codigo Implementado

### [D2-001] SyncEngine (M006) e OfflineManager (M007) nao conectados ao app
- **Modulo ARCH:** ARCH_M006 (SyncEngine), ARCH_M007 (OfflineManager)
- **Arquivo(s) de codigo:** src/hooks/useRealtimeSync.ts, src/hooks/useConnection.ts, src/components/OfflineBanner.tsx
- **O que a ARCH define:** M006 define useRealtimeSync como hook de sincronizacao via Realtime/polling. M007 define useConnection para monitorar status da rede e OfflineBanner para exibir ao usuario
- **O que o codigo implementa:** Os hooks existem em src/hooks/ e o componente OfflineBanner existe em src/components/, mas NENHUM deles e importado ou utilizado em nenhum componente da app. Busca por "useRealtimeSync", "useConnection" e "OfflineBanner" em src/app/ retorna zero resultados
- **Divergencia:** Os modulos M006 e M007 estao implementados como codigo morto -- existem mas nao estao conectados ao ciclo de vida do app. Nao ha chamada a useRealtimeSync() em nenhum componente, portanto o app NAO tem sincronizacao em tempo real. Nao ha OfflineBanner renderizado, portanto o usuario nao ve indicacao de estar offline
- **Impacto:** CRITICO -- O requisito RNF-04 (sincronizacao em ate 5 segundos) e RNF-05 (funcionamento offline) nao estao sendo atendidos. O app depende exclusivamente de refetch manual ou staleTime do TanStack Query (5 minutos)
- **CR proposto:** CR-52: Conectar useRealtimeSync e useConnection no _layout.tsx root e renderizar OfflineBanner

---

### [D2-002] NotificationModule (M005) hooks nao conectados ao app
- **Modulo ARCH:** ARCH_M005 (NotificationModule)
- **Arquivo(s) de codigo:** src/hooks/useNotifications.ts, src/lib/notificationUtils.ts
- **O que a ARCH define:** M005 define useRegisterPushToken (chamado no mount do app) e useNotificationHandler (navegacao ao tocar na notificacao)
- **O que o codigo implementa:** O hook useNotifications.ts existe em src/hooks/ mas NAO e importado em nenhum componente de src/app/. Busca por "useNotifications", "useRegisterPush" e "notificationUtils" em src/app/ retorna zero resultados
- **Divergencia:** O modulo M005 esta implementado como codigo morto. Push tokens nao sao registrados e notificacoes ao tocar nao tem handler. Os DB triggers (migration 003) e a Edge Function process-notifications existem, mas o lado cliente nao esta conectado
- **Impacto:** CRITICO -- Push notifications (RF-26 a RF-32) nao funcionam no lado cliente. Os triggers do servidor enfileiram notificacoes, mas os tokens dos dispositivos nunca sao registrados
- **CR proposto:** CR-53: Conectar useNotifications no root _layout.tsx para registrar push token e handler de navegacao

---

### [D2-003] OfflineQueue (M007) nao e utilizado por nenhuma mutation
- **Modulo ARCH:** ARCH_M007 (OfflineManager)
- **Arquivo(s) de codigo:** src/lib/offlineQueue.ts, src/lib/offlineGuard.ts
- **O que a ARCH define:** M007 define que mutations devem ser enfileiradas offline via offlineQueue e processadas FIFO ao reconectar. OfflineGuard bloqueia Edge Functions offline
- **O que o codigo implementa:** offlineQueue.ts e offlineGuard.ts existem com implementacao completa (enqueue, dequeue, clearQueue, etc.) mas NENHUM hook de mutation importa ou usa essas funcoes. Nenhuma mutation chama enqueue() ou verifica isOnline antes de executar
- **Divergencia:** O sistema de fila offline esta implementado mas nunca integrado aos hooks de mutation (useMembers, useTopics, useSpeechMutations, useAgenda, etc.). Mutacoes offline simplesmente falham com erro de rede
- **Impacto:** Alto -- O requisito RNF-05 (offline com sync ao reconectar) nao funciona para mutations. Leituras funcionam via cache do TanStack Query, mas escritas offline falham
- **CR proposto:** CR-52 (mesmo CR) - integrar offlineQueue nos hooks de mutation

---

### [D2-004] Export CSV nao distingue cancelamento do usuario de erros reais
- **Modulo ARCH:** ARCH_CR003 (F026, CR-42)
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/members.tsx:370
- **O que a ARCH define:** ARCH_CR003 F026 prescreve: `if (err?.message !== 'User did not share') { Alert.alert(...); }` -- distinguir cancelamento do share sheet de erros reais
- **O que o codigo implementa:** `catch { Alert.alert(t('common.error'), t('members.exportFailed')); }` -- catch generico que mostra erro para QUALQUER excecao, incluindo cancelamento pelo usuario
- **Divergencia:** Usuario que cancela o share sheet ve um alerta de erro desnecessario
- **Impacto:** Baixo (UX, nao funcional)
- **CR proposto:** CR-54: Adicionar guard de cancelamento no catch do export CSV

---

### [D2-005] Import CSV tem mensagem de erro hardcoded em ingles
- **Modulo ARCH:** ARCH_CR003 (F026, CR-42)
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/members.tsx:447
- **O que a ARCH define:** Usar t('members.importFailed') para mensagens de erro i18n
- **O que o codigo implementa:** String hardcoded 'Failed to read file' em ingles
- **Divergencia:** Viola o principio de i18n. Chave importFailed existe nos 3 locales mas nao e usada neste ponto
- **Impacto:** Baixo (i18n)
- **CR proposto:** CR-54 (mesmo CR) - corrigir mensagem hardcoded

---

### [D2-006] MIME types do import CSV divergem da ARCH
- **Modulo ARCH:** ARCH_CR003 (F026, CR-42)
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/members.tsx:438
- **O que a ARCH define:** `['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain']`
- **O que o codigo implementa:** `['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']`
- **Divergencia:** Codigo usa `*/*` ao inves de `application/csv`. Funcionalmente aceitavel (mais amplo), mas diferente da spec
- **Impacto:** Muito baixo (funcional, apenas diferente do prescrito)
- **CR proposto:** Nenhum (desvio aceitavel)

---

### [D2-007] Falta headerSpacer no Members screen quando canWrite=false
- **Modulo ARCH:** ARCH_CR003 (F028, CR-33)
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/members.tsx:485-495
- **O que a ARCH define:** Quando canWrite=false, adicionar `<View style={styles.headerSpacer} />` com width 36 para balanceamento visual do header de 3 elementos
- **O que o codigo implementa:** Quando canWrite=false, o botao "+" simplesmente nao e renderizado. Nao existe spacer para manter o titulo centralizado
- **Divergencia:** O titulo deslocara para a direita quando o usuario nao tem permissao de escrita
- **Impacto:** Baixo (cosmetico)
- **CR proposto:** CR-55: Adicionar headerSpacer no Members screen para centering visual

---

### [D2-008] useSundayTypes filtra "speeches" e nao persiste no banco (BUG)
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Arquivo(s) de codigo:** src/hooks/useSundayTypes.ts:183-185
- **O que a ARCH define:** ARCH_M002 Flow "Auto-assign Sunday Types" diz: "Batch INSERT all missing entries", incluindo "Discursos". A ARCH esta CORRETA: todos os tipos devem ser persistidos
- **O que o codigo implementa:** Linha 184 tem comentario correto: `// Per F007: "Discursos" is also stored, so actually all sundays get entries`. Porem linha 185 faz `if (type === SUNDAY_TYPE_SPEECHES) return null;` -- CONTRADIZENDO o comentario e a ARCH. O codigo filtra "speeches" e NAO insere no banco
- **Divergencia:** O CODIGO esta ERRADO. O comentario e a ARCH estao corretos. O valor "speeches" DEVE ser persistido na tabela sunday_exceptions como qualquer outro tipo. Alem disso, o CHECK constraint atual (migration 008) NAO inclui "speeches" como valor valido, impedindo a persistencia mesmo se o filtro fosse removido
- **Impacto:** CRITICO -- Todos os domingos regulares (com discursos) nao tem registro persistido no banco. A logica de auto-assign nao funciona como esperado para o tipo padrao. Isto pode causar inconsistencias na exibicao e na logica de negocios
- **CR proposto:** CR-56: Persistir "speeches" no banco -- adicionar ao CHECK constraint e remover filtro do codigo

---

### [D2-009] Naming inconsistency: formatFullDate vs formatDateFull entre ARCH docs
- **Modulo ARCH:** ARCH_CR003, ARCH_CR3_F029
- **Arquivo(s) de codigo:** src/lib/dateUtils.ts:215
- **O que a ARCH define:** ARCH_CR003 (parent) usa `formatFullDate`. ARCH_CR3_F029 usa `formatDateFull` no SPEC_SUMMARY mas `formatDateFull` no Change Plan
- **O que o codigo implementa:** Funcao se chama `formatFullDate` (alinhado com ARCH_CR003 parent)
- **Divergencia:** Inconsistencia de naming entre documentos de ARCH. Codigo esta correto
- **Impacto:** Muito baixo (inconsistencia documental)
- **CR proposto:** CR-44 (mesmo CR) - alinhar naming nos docs

---

### [D2-010] Sign-out ordering ambiguity entre ARCH docs
- **Modulo ARCH:** ARCH_CR003, ARCH_CR3_F027
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/index.tsx:139-140
- **O que a ARCH define:** ARCH_CR003 (parent) diz `queryClient.clear()` ANTES de `signOut()`. ARCH_CR3_F027 (feature) diz `signOut()` ANTES de `queryClient.clear()`
- **O que o codigo implementa:** `queryClient.clear()` primeiro, depois `await signOut()` -- segue ARCH_CR003
- **Divergencia:** Inconsistencia entre parent e feature ARCH doc. Codigo segue o parent (correto)
- **Impacto:** Muito baixo (funcional, nao importa a ordem)
- **CR proposto:** CR-44 (mesmo CR) - alinhar ARCH_CR3_F027 com ARCH_CR003

---

### [D2-011] Presentation Mode mostra data como subtitulo ao inves de substituir titulo
- **Modulo ARCH:** ARCH_CR003 (F029, CR-38)
- **Arquivo(s) de codigo:** src/app/presentation.tsx:78-84
- **O que a ARCH define:** ARCH_CR003 diz "Replace header title text" com a data formatada
- **O que o codigo implementa:** Mantem o titulo `home.startMeeting` e adiciona a data como subtitulo abaixo
- **Divergencia:** Implementacao mostra data como subtitulo adicional em vez de substituir o titulo. Aprovado no QA Report como "melhor UX"
- **Impacto:** Nenhum (desvio aprovado, melhor que o prescrito)
- **CR proposto:** Nenhum (desvio positivo aceito)

---

### [D2-012] ARCH_M002 MemberImportExport contract usa File/Blob, codigo usa expo modules
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Arquivo(s) de codigo:** src/app/(tabs)/settings/members.tsx
- **O que a ARCH define:** Contract `useImportMembers(): UseMutationResult<ImportResult, Error, File>` e `useExportMembers(): UseMutationResult<Blob, Error, void>` -- tipos web (File, Blob)
- **O que o codigo implementa:** Import/export usam expo-document-picker, expo-file-system, expo-sharing com handlers inline (nao como hooks separados). Nao existem hooks useImportMembers ou useExportMembers
- **Divergencia:** A ARCH define contracts com tipos web (File, Blob) que nao sao usados em mobile. O codigo implementa import/export como funcoes inline no componente em vez de hooks reutilizaveis
- **Impacto:** Medio (o codigo funciona mas nao segue o padrao de hooks definido na ARCH)
- **CR proposto:** CR-44 (mesmo CR de docs) - atualizar ARCH_M002 contracts para refletir abordagem mobile

---

### [D2-013] ARCH_M006 contract useRealtimeSync() nao recebe parametros, codigo recebe
- **Modulo ARCH:** ARCH_M006 (SyncEngine)
- **Arquivo(s) de codigo:** src/hooks/useRealtimeSync.ts:29
- **O que a ARCH define:** `function useRealtimeSync(): void;` -- sem parametros
- **O que o codigo implementa:** `function useRealtimeSync({ isOnline, setWebSocketConnected }: UseRealtimeSyncOptions): void` -- requer parametros de conexao
- **Divergencia:** Contract no ARCH e mais simples que a implementacao. O hook precisa de estado de conexao como input
- **Impacto:** Baixo (ARCH simplifica mas codigo esta correto)
- **CR proposto:** CR-44 (mesmo CR de docs) - atualizar ARCH_M006 contract

---

### [D2-014] Codigo de auto-assign nao persiste "speeches" contrariando a ARCH (BUG)
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Arquivo(s) de codigo:** src/hooks/useSundayTypes.ts:180-192
- **O que a ARCH define:** ARCH_M002 Flows, "Auto-assign Sunday Types", step 3: "Batch INSERT all missing entries" e step 2b: "Default: Discursos". A ARCH CORRETAMENTE prescreve que TODOS os tipos sejam persistidos, incluindo "Discursos"
- **O que o codigo implementa:** Linha 185: `if (type === SUNDAY_TYPE_SPEECHES) return null;` -- filtra entradas "speeches" e NAO insere no banco
- **Divergencia:** O CODIGO esta ERRADO. A ARCH esta CORRETA. Conforme decisao do usuario, o valor "speeches" deve ser um valor valido no CHECK constraint do banco e deve ser persistido na tabela sunday_exceptions. O filtro na linha 185 deve ser removido para que todos os domingos tenham registro persistido
- **Impacto:** CRITICO -- Domingos com discursos nao tem registro no banco. Esto viola a decisao de design de que todo domingo deve ter um tipo persistido
- **CR proposto:** CR-56 (mesmo CR de D2-008): Persistir "speeches" no banco

---

### [D2-015] Data directory nao tem scripts/ conforme PRODUCT_SPECIFICATION
- **Modulo ARCH:** ARCH_M002 (WardDataModule)
- **Arquivo(s) de codigo:** (ausente) scripts/
- **O que a ARCH define:** ARCH_M002 menciona "admin script import" para hinos. PRODUCT_SPECIFICATION RF-23.1 define `pnpm import-hymns hinario.csv`
- **O que o codigo implementa:** Nao existe diretorio `scripts/`. Hinos sao importados via seed SQL ou migracao. O arquivo `data/hinos-pt-en-es.csv` existe mas nao ha script CLI para importa-lo
- **Divergencia:** O mecanismo de importacao de hinos via CLI nao esta implementado conforme RF-23.1
- **Impacto:** Medio (admin nao pode importar hinos via CLI conforme especificado)
- **CR proposto:** CR-51 (mesmo CR) - Criar script import-hymns

---

### [D2-016] Tratamento de excecoes ausente ou inadequado em multiplas camadas
- **Modulo ARCH:** Todos (M001-M008)
- **Arquivo(s) de codigo:** Multiplos (ver detalhes abaixo)
- **O que a ARCH define:** Nenhum padrao explicito de error handling
- **O que o codigo implementa:** Tratamento inconsistente e incompleto. Analise detalhada:

**A) Mutations sem onError (15 mutations):**
- `useCreateMember` (src/hooks/useMembers.ts:86) -- sem onError
- `useUpdateMember` (src/hooks/useMembers.ts:118) -- sem onError
- `useDeleteMember` (src/hooks/useMembers.ts:166) -- sem onError
- `useCreateActor` (src/hooks/useActors.ts:100) -- sem onError
- `useUpdateActor` (src/hooks/useActors.ts:136) -- sem onError
- `useDeleteActor` (src/hooks/useActors.ts:167) -- sem onError
- `useLazyCreateSpeeches` (src/hooks/useSpeeches.ts:143) -- sem onError
- `useAssignSpeaker` (src/hooks/useSpeeches.ts:186) -- sem onError
- `useAssignTopic` (src/hooks/useSpeeches.ts:219) -- sem onError
- `useChangeStatus` (src/hooks/useSpeeches.ts:250) -- sem onError
- `useRemoveSpeaker` (src/hooks/useSpeeches.ts:293) -- sem onError
- `useCreateTopic` (src/hooks/useTopics.ts:76) -- sem onError
- `useUpdateTopic` (src/hooks/useTopics.ts:108) -- sem onError
- `useDeleteTopic` (src/hooks/useTopics.ts:155) -- sem onError
- `useLazyCreateAgenda` (src/hooks/useAgenda.ts:91) -- sem onError
- `useUpdateAgenda` (src/hooks/useAgenda.ts:135) -- sem onError
- `useAutoAssignSundayTypes` (src/hooks/useSundayTypes.ts:158) -- sem onError
- Somente `useSetSundayType` e `useRemoveSundayException` tem onError (apenas invalidate queries, sem feedback ao usuario)

**B) Tabs principais sem tratamento de erro de query (3 tabs):**
- `src/app/(tabs)/index.tsx` (Home) -- usa queries mas NENHUM check de `error` ou `isError`
- `src/app/(tabs)/speeches.tsx` (Speeches) -- usa useSpeeches/useSundayExceptions, NENHUM check de error
- `src/app/(tabs)/agenda.tsx` (Agenda) -- usa useSundayExceptions, NENHUM check de error
- Se qualquer query falhar, data sera `undefined` e a UI mostrara lista vazia ou pode crashar

**C) catch {} vazios que engolem excecoes (6 ocorrencias):**
- `src/contexts/ThemeContext.tsx:33` -- loadTheme catch {} (aceitavel: non-critical)
- `src/contexts/ThemeContext.tsx:41` -- saveTheme catch {} (aceitavel: non-critical)
- `src/i18n/index.ts:60` -- detectDeviceLocale catch {} (aceitavel: fallback to pt-BR)
- `src/app/(auth)/register.tsx:41` -- timezone detection catch {} (aceitavel: fallback to default)
- `src/lib/offlineQueue.ts:38` -- readQueue catch {} (questionavel: pode mascarar corrupcao)
- `src/app/(tabs)/settings/users.tsx:158` -- Share.share catch {} (questionavel: pode mascarar erros reais)

**D) Strings de erro hardcoded em ingles (5 ocorrencias):**
- `src/lib/whatsapp.ts:26` -- `'WhatsApp is not installed on this device.'`
- `src/lib/whatsapp.ts:29` -- `'Failed to open WhatsApp.'`
- `src/components/ErrorBoundary.tsx:42` -- `'Something went wrong'`
- `src/components/ErrorBoundary.tsx:43` -- `'An unexpected error occurred. Please try again.'`
- `src/components/ErrorBoundary.tsx:53` -- `'Try Again'`
- `src/app/(tabs)/settings/members.tsx:447` -- `'Failed to read file'`

**E) ErrorBoundary com cobertura limitada:**
- ErrorBoundary existe e envolve o root layout (src/app/_layout.tsx:80)
- Porem nao envolve telas individuais ou tabs. Um crash no SpeechSlot derruba TODA a tela
- ErrorBoundary nao usa i18n (hardcoded em ingles)
- ErrorBoundary nao usa cores do tema (hardcoded #333, #666, #007AFF)

**F) Edge Functions com error responses mas sem i18n:**
- Todas as 7 Edge Functions retornam `{ error: "string em ingles" }`
- O cliente recebe essas mensagens e em alguns casos as exibe diretamente ao usuario
- Aceitavel para Edge Functions (server-side), mas o cliente deve traduzir

**G) TanStack Query global config sem onError callback:**
- `src/app/_layout.tsx:12-18` -- QueryClient criado com `retry: 2` e `staleTime: 5min`
- Sem `onError` global para queries ou mutations
- Sem `throwOnError` configurado
- Sem `queryCache` ou `mutationCache` error handlers

- **Divergencia:** O codigo tem lacunas significativas no tratamento de excecoes em todas as camadas
- **Impacto:** CRITICO -- Erros de rede, timeout, 500 do servidor, e falhas de validacao sao silenciosamente ignorados ou mostram mensagens em ingles. O usuario nao recebe feedback adequado quando algo falha
- **CR proposto:** CR-57 a CR-61 (ver abaixo)

## Novos Change Requests Propostos

### CR-44: Consolidar correcoes documentais na ARCH base
- **Tipo:** ARCH_GAP
- **Descricao:** Atualizar ARCH_M002, ARCH_M004, ARCH_M006 para refletir mudancas acumuladas dos CRs 1-43. Inclui: (a) adicionar custom_reason a sunday_exceptions em ARCH_M002, (b) atualizar enum de reason incluindo "speeches", (c) alinhar naming formatFullDate, (d) alinhar ordering de sign-out, (e) atualizar contracts de MemberImportExport, (f) confirmar na ARCH que "speeches" e valor persistido no banco, (g) atualizar useRealtimeSync contract
- **Acceptance Criteria:**
  - ARCH_M002.md Data Model sunday_exceptions inclui custom_reason
  - ARCH_M002.md lista valores corretos do enum reason incluindo "speeches"
  - ARCH_M002.md MemberImportExport contracts refletem abordagem mobile
  - ARCH_M002.md Flow "Auto-assign" confirma que "speeches" e persistido como qualquer outro tipo
  - ARCH_M004.md PresentationMode contract inclui formatFullDate
  - ARCH_M006.md useRealtimeSync contract atualizado com parametros
  - ARCH_CR3_F029 naming corrigido para formatFullDate
  - ARCH_CR3_F027 ordering corrigido para queryClient.clear() antes de signOut()
- **Arquivos impactados:** docs/arch/ARCH_M002.md, docs/arch/ARCH_M004.md, docs/arch/ARCH_M006.md, docs/arch/ARCH_CR3_F027.md (se existir), docs/arch/ARCH_CR3_F029.md

### CR-45: Atualizar ARCH_M002 para remover ActorManagementScreen
- **Tipo:** ARCH_GAP
- **Descricao:** ARCH_M002 ainda lista ActorManagementScreen como componente #5 e mostra "Actors" no diagrama do Settings tab. CR-26 removeu esta tela; atores sao gerenciados inline via ActorSelectorDialog em AgendaForm. Atualizar diagrama e lista de componentes
- **Acceptance Criteria:**
  - ARCH_M002.md diagrama nao mostra "Actors" como item separado do Settings
  - ARCH_M002.md componente #5 atualizado ou renumerado
  - Referencia a ActorSelectorDialog inclusa na secao de AgendaModule (ARCH_M004) ou ARCH_M002
- **Arquivos impactados:** docs/arch/ARCH_M002.md

### CR-46: Documentar integracao de SyncEngine e OfflineManager na ARCH
- **Tipo:** ARCH_GAP
- **Descricao:** ARCH_M006 e ARCH_M007 sao definidos como modulos independentes sem descrever como se conectam ao app. Adicionar secao de integracao que define: (a) onde useRealtimeSync() e chamado, (b) onde useConnection() e chamado, (c) onde OfflineBanner e renderizado, (d) como o offlineQueue se integra com os hooks de mutation
- **Acceptance Criteria:**
  - ARCH_M006 tem secao "Integration Point" definindo montagem no _layout.tsx ou tab layout
  - ARCH_M007 tem secao "Integration Point" definindo montagem e integracao com mutations
  - Diagrama de fluxo mostra a relacao entre M006, M007 e o root layout
- **Arquivos impactados:** docs/arch/ARCH_M006.md, docs/arch/ARCH_M007.md

### CR-47: Atualizar ARCH_M008 com lista completa de componentes
- **Tipo:** ARCH_GAP
- **Descricao:** ARCH_M008 (UIShell) lista apenas 8 componentes mas nao inclui as sub-telas de Settings (theme.tsx, about.tsx, history.tsx, timezone.tsx, members.tsx, topics.tsx, whatsapp.tsx, users.tsx). Atualizar para refletir o estado atual
- **Acceptance Criteria:**
  - ARCH_M008 lista todos os componentes de src/app/(tabs)/settings/
  - Diagrama atualizado com todas as sub-telas de Settings
  - Dependencias de cada sub-tela documentadas
- **Arquivos impactados:** docs/arch/ARCH_M008.md

### CR-48: Atualizar ARCH_M004 PresentationMode contract
- **Tipo:** ARCH_GAP
- **Descricao:** ARCH_M004 PresentationMode contract nao inclui formatFullDate para exibicao de data no header. Adicionar ao contract e diagrama
- **Acceptance Criteria:**
  - ARCH_M004 PresentationMode section documenta formatFullDate(dateStr, language)
  - Dependencia de dateUtils.ts documentada
- **Arquivos impactados:** docs/arch/ARCH_M004.md

### CR-49: Atualizar PRODUCT_SPECIFICATION para refletir CRs implementados
- **Tipo:** SPEC_MISSING
- **Descricao:** PRODUCT_SPECIFICATION.md esta desatualizado em: (a) RF-21.3/RF-21.4 usam labels de secao antigos, (b) RF-22 descreve checkboxes de papeis (removidos por CR-26), (c) RN-01 e sunday types referenciam valores antigos do enum. Atualizar para refletir o estado atual do produto
- **Acceptance Criteria:**
  - RF-21 labels de secao atualizados (CR-29, CR-30)
  - RF-22 fluxo de atores atualizado para refletir CR-26
  - RN-01 enum de sunday types corrigido para valores atuais
  - Sunday type list corrigida em todos os RFs relevantes
- **Arquivos impactados:** docs/PRODUCT_SPECIFICATION.md

### CR-50: Executar correcoes docs-only de F025
- **Tipo:** SPEC_MISSING
- **Descricao:** F025 (CR-31, CR-34, CR-36, CR-37) sao correcoes documentais que podem nao ter sido executadas nos documentos de entrada. Verificar e aplicar: (a) CR-31: corrigir ASM-009 no SPEC.final.md, (b) CR-34: atualizar RF-22/7.13.4 para refletir CR-26, (c) CR-36: adicionar regra de debounce ao SPEC_F012, (d) CR-37: atualizar secoes 7.8 e 4.2 para Secretario
- **Acceptance Criteria:**
  - SPEC.final.md ASM-009 corrigido com excecao da aba Agenda
  - SPEC.final.md 7.8 e 4.2 atualizados para Secretario
  - SPEC_F012.md tem regra de debounce documentada
  - SPEC_F013.md atualizado para fluxo de atores sem checkboxes
- **Arquivos impactados:** docs/SPEC.final.md, docs/specs/SPEC_F012.md, docs/specs/SPEC_F013.md, docs/specs/SPEC_F023.md

### CR-51: Criar script pnpm import-hymns conforme RF-23.1
- **Tipo:** CODE_DRIFT
- **Descricao:** PRODUCT_SPECIFICATION RF-23.1 especifica `pnpm import-hymns hinario.csv` para importar hinario via CLI. O script nao existe. Hinos sao importados via seed/migracao mas nao ha CLI. Criar script e documentar na ARCH
- **Acceptance Criteria:**
  - Script executavel via `pnpm import-hymns <arquivo.csv>`
  - Formato CSV: Lingua,Numero,Titulo,Sacramental(S/N)
  - Upsert por (language, number)
  - Exibe resumo: "Importados X hinos para idioma Y"
  - CSV invalido nao importa nada e mostra erro com linha/campo
  - ARCH_M002 atualizado com documentacao do script
- **Arquivos impactados:** scripts/import-hymns.ts (novo), package.json, docs/arch/ARCH_M002.md

### CR-52: Conectar SyncEngine e OfflineManager ao app
- **Tipo:** CODE_DRIFT
- **Descricao:** useRealtimeSync, useConnection e OfflineBanner existem como codigo morto. Nao estao conectados ao _layout.tsx. O app nao tem sincronizacao em tempo real nem deteccao de offline. Conectar os modulos conforme definido na ARCH
- **Acceptance Criteria:**
  - useConnection() chamado em componente de alto nivel (ex: tabs layout ou root InnerLayout)
  - useRealtimeSync({ isOnline, setWebSocketConnected }) chamado apos auth
  - OfflineBanner renderizado quando showOfflineBanner=true
  - Dados sincronizam entre clientes em ate 5 segundos via Realtime
  - Banner "Offline" aparece quando dispositivo perde conexao
  - offlineQueue.enqueue() chamado em mutations quando isOnline=false
- **Arquivos impactados:** src/app/_layout.tsx ou src/app/(tabs)/_layout.tsx, hooks de mutation

### CR-53: Conectar NotificationModule ao app
- **Tipo:** CODE_DRIFT
- **Descricao:** useNotifications existe em src/hooks/ mas nao e importado em nenhum componente do app. Push tokens nao sao registrados e handler de navegacao nao esta ativo. Conectar conforme ARCH_M005
- **Acceptance Criteria:**
  - useRegisterPushToken chamado no mount do app (apos auth)
  - useNotificationHandler ativo para navegacao ao Home quando notificacao e tocada
  - Push token registrado na tabela device_push_tokens
  - Observador NAO registra token
  - Funciona em iOS e Android
- **Arquivos impactados:** src/app/_layout.tsx ou src/app/(tabs)/_layout.tsx

### CR-54: Corrigir export/import CSV error handling
- **Tipo:** CODE_DRIFT
- **Descricao:** (a) Export CSV mostra alerta de erro quando usuario cancela share sheet. Deve distinguir cancelamento de erros reais. (b) Import CSV tem mensagem de erro hardcoded em ingles ao inves de usar chave i18n
- **Acceptance Criteria:**
  - Export catch block verifica `err?.message !== 'User did not share'` antes de mostrar alert
  - Import error message usa t('members.importFailed') ao inves de string hardcoded
- **Arquivos impactados:** src/app/(tabs)/settings/members.tsx

### CR-55: Adicionar headerSpacer no Members screen
- **Tipo:** CODE_DRIFT
- **Descricao:** ARCH_CR003 F028 prescreve headerSpacer (width 36) quando canWrite=false para manter titulo centralizado no header de 3 elementos. Codigo nao tem o spacer
- **Acceptance Criteria:**
  - Quando canWrite=false, renderizar `<View style={{ width: 36 }} />` no lugar do botao "+"
  - Titulo permanece centralizado visualmente
- **Arquivos impactados:** src/app/(tabs)/settings/members.tsx

### CR-56: Persistir "speeches" como valor valido na tabela sunday_exceptions
- **Tipo:** CODE_DRIFT
- **Descricao:** O valor "speeches" (Domingo com Discursos) deve ser um valor valido na tabela sunday_exceptions e deve ser persistido no banco como qualquer outro tipo de domingo. Atualmente: (a) o CHECK constraint da migration 008 NAO inclui "speeches", (b) o codigo em useSundayTypes.ts:185 filtra e NAO insere domingos com tipo "speeches" no banco. Ambos devem ser corrigidos
- **Acceptance Criteria:**
  - Nova migration (009) que adiciona "speeches" ao CHECK constraint: `ALTER TABLE sunday_exceptions DROP CONSTRAINT IF EXISTS sunday_exceptions_reason_check; ALTER TABLE sunday_exceptions ADD CONSTRAINT sunday_exceptions_reason_check CHECK (reason IN ('speeches', 'testimony_meeting', 'general_conference', 'stake_conference', 'ward_conference', 'primary_presentation', 'other'));`
  - A migration tambem insere retroativamente registros "speeches" para todos os domingos (dentro do range ativo) que nao tem nenhum registro em sunday_exceptions
  - Em src/hooks/useSundayTypes.ts: remover o bloco `if (type === SUNDAY_TYPE_SPEECHES) return null;` (linhas 183-185) para que domingos com tipo "speeches" sejam inseridos no banco
  - Em src/types/database.ts: o tipo SundayExceptionReason deve incluir "speeches" como valor valido (se ja nao inclui pela union com SUNDAY_TYPE_SPEECHES)
  - Verificar que useRemoveSundayException reverte para "speeches" (INSERT com reason='speeches') em vez de apenas deletar o registro
  - Testes atualizados para verificar persistencia de "speeches"
- **Arquivos impactados:** supabase/migrations/009_add_speeches_to_enum.sql (novo), src/hooks/useSundayTypes.ts, src/types/database.ts

### CR-57: Adicionar onError a todas as mutations com feedback i18n ao usuario
- **Tipo:** CODE_DRIFT
- **Descricao:** 17 mutations em 5 hooks nao tem callback onError. Quando uma mutation falha (erro de rede, timeout, 500, violacao de constraint), o usuario nao recebe nenhum feedback. Todas as mutations devem ter onError que mostra Alert.alert com mensagem i18n traduzida
- **Acceptance Criteria:**
  - TODAS as mutations em useMembers.ts (create, update, delete) tem onError com Alert.alert usando t()
  - TODAS as mutations em useActors.ts (create, update, delete) tem onError com Alert.alert usando t()
  - TODAS as mutations em useSpeeches.ts (lazyCreate, assignSpeaker, assignTopic, changeStatus, removeSpeaker) tem onError com Alert.alert usando t()
  - TODAS as mutations em useTopics.ts (create, update, delete, toggleCollection) tem onError com Alert.alert usando t()
  - TODAS as mutations em useAgenda.ts (lazyCreate, update) tem onError com Alert.alert usando t()
  - useAutoAssignSundayTypes em useSundayTypes.ts tem onError com feedback
  - As mensagens de erro devem ser genericas mas informativas. Ex: t('errors.memberCreateFailed'), t('errors.speechAssignFailed'), etc.
  - Novas chaves i18n adicionadas nos 3 locales (pt-BR, en, es) para cada tipo de erro
  - Mutations com update otimista (useSetSundayType, useRemoveSundayException) ja tem onError que faz rollback -- manter e ADICIONAR Alert.alert com feedback ao usuario
  - Nao mostrar stack traces ou mensagens tecnicas do Supabase ao usuario
- **Arquivos impactados:** src/hooks/useMembers.ts, src/hooks/useActors.ts, src/hooks/useSpeeches.ts, src/hooks/useTopics.ts, src/hooks/useAgenda.ts, src/hooks/useSundayTypes.ts, src/i18n/locales/pt-BR.json, src/i18n/locales/en.json, src/i18n/locales/es.json

### CR-58: Adicionar tratamento de erro de query nas tabs principais
- **Tipo:** CODE_DRIFT
- **Descricao:** As 3 tabs principais (Home, Speeches, Agenda) usam queries do TanStack Query mas NAO verificam o estado de erro. Se uma query falha, data e `undefined` e a UI mostra lista vazia ou pode crashar. Cada tab deve renderizar um componente de erro quando a query falha
- **Acceptance Criteria:**
  - src/app/(tabs)/index.tsx (Home): verificar isError/error de todas as queries usadas. Mostrar componente de erro inline com mensagem i18n e botao "Tentar novamente" que chama refetch()
  - src/app/(tabs)/speeches.tsx (Speeches): verificar isError de useSpeeches e useSundayExceptions. Mostrar erro inline
  - src/app/(tabs)/agenda.tsx (Agenda): verificar isError de useSundayExceptions. Mostrar erro inline
  - Criar componente reutilizavel `QueryErrorView` com: mensagem i18n, botao retry, e respeito ao tema (cores do ThemeContext)
  - QueryErrorView deve aceitar props: `error`, `onRetry`, `message?` (opcional override)
  - Nao usar strings hardcoded -- todas as mensagens via t()
  - Garantir que o componente de erro nao derruba a tab inteira -- apenas substitui a area de conteudo
- **Arquivos impactados:** src/components/QueryErrorView.tsx (novo), src/app/(tabs)/index.tsx, src/app/(tabs)/speeches.tsx, src/app/(tabs)/agenda.tsx, src/i18n/locales/*.json

### CR-59: Internacionalizar ErrorBoundary e strings hardcoded de erro
- **Tipo:** CODE_DRIFT
- **Descricao:** O ErrorBoundary e varias funcoes usam strings de erro hardcoded em ingles. Todas devem usar o sistema i18n. Alem disso, o ErrorBoundary deve respeitar o tema (dark/light mode)
- **Acceptance Criteria:**
  - ErrorBoundary.tsx: substituir 'Something went wrong' por t('errors.somethingWentWrong'), 'An unexpected error occurred...' por t('errors.unexpectedError'), 'Try Again' por t('errors.tryAgain')
  - ErrorBoundary.tsx: usar useTheme() para cores (se possivel -- classe component precisa de workaround). Alternativa: aceitar cores via props e passar do wrapper
  - src/lib/whatsapp.ts: substituir 'WhatsApp is not installed on this device.' por t('errors.whatsappNotInstalled'), 'Failed to open WhatsApp.' por t('errors.whatsappOpenFailed')
  - src/app/(tabs)/settings/members.tsx:447: substituir 'Failed to read file' por t('members.importFailed')
  - Adicionar todas as novas chaves i18n nos 3 locales
  - NOTA: whatsapp.ts importa Alert de react-native mas nao t(). Sera necessario receber t como parametro ou usar i18n.t() diretamente
- **Arquivos impactados:** src/components/ErrorBoundary.tsx, src/lib/whatsapp.ts, src/app/(tabs)/settings/members.tsx, src/i18n/locales/*.json

### CR-60: Adicionar Error Boundaries por tab e granulares em componentes criticos
- **Tipo:** CODE_DRIFT
- **Descricao:** Atualmente existe apenas 1 ErrorBoundary no root layout. Um crash em qualquer componente derruba TODA a aplicacao. Adicionar Error Boundaries granulares por tab e em componentes criticos (AgendaForm, SpeechSlot, SundayCard, PresentationMode)
- **Acceptance Criteria:**
  - Cada tab em src/app/(tabs)/ deve ser envolvida por um ErrorBoundary com fallback especifico para a tab
  - AgendaForm (src/components/AgendaForm.tsx) envolvido por ErrorBoundary individual -- crash em um campo nao derruba todo o formulario
  - SundayCard (src/components/SundayCard.tsx) envolvido por ErrorBoundary -- crash em um card nao derruba a lista de domingos
  - PresentationMode (src/app/presentation.tsx) envolvido por ErrorBoundary com botao "Voltar ao Inicio"
  - ErrorBoundary de tab deve exibir: titulo da tab + mensagem de erro + botao "Tentar novamente"
  - Usar o ErrorBoundary atualizado (com i18n e tema) do CR-59
- **Arquivos impactados:** src/app/(tabs)/index.tsx, src/app/(tabs)/speeches.tsx, src/app/(tabs)/agenda.tsx, src/app/(tabs)/settings/_layout.tsx, src/components/AgendaForm.tsx, src/components/SundayCard.tsx, src/app/presentation.tsx

### CR-61: Configurar TanStack Query global error handlers e definir retry/timeout policy
- **Tipo:** CODE_DRIFT
- **Descricao:** O QueryClient global (src/app/_layout.tsx:12-18) nao tem error handlers globais, nao define timeout, e usa retry:2 generico. Configurar error handlers no queryCache e mutationCache para logging centralizado e definir politicas de retry por tipo de operacao
- **Acceptance Criteria:**
  - QueryClient configurado com `queryCache: new QueryCache({ onError: (error, query) => { ... } })` para logging centralizado de erros de query
  - QueryClient configurado com `mutationCache: new MutationCache({ onError: (error, variables, context, mutation) => { ... } })` para logging centralizado de erros de mutation
  - Error handlers devem logar: tipo de erro (network/timeout/4xx/5xx), timestamp, query key ou mutation key
  - Em __DEV__ mode: console.error com detalhes. Em producao: logging silencioso (sem console.error para o usuario)
  - Retry policy definida: queries retry 2x com backoff exponencial. Mutations retry 0x (falha imediata para evitar duplicacao). Excecao: 401/403 nao faz retry (redireciona para login)
  - Timeout: queries com gcTime definido (ex: 10 minutos). networkMode configurado para 'online' (nao tenta queries offline)
  - Para erros 401/403 em queries: invalidar sessao e redirecionar para login (integracao com AuthContext)
- **Arquivos impactados:** src/app/_layout.tsx

---

## Resumo de Criticidade

| Criticidade | Qtd | Detalhes |
|-------------|-----|---------|
| CRITICO | 6 | D2-001 (Sync nao conectado), D2-002 (Notifications nao conectadas), D2-003 (Offline queue nao usado), D2-008 (speeches nao persistido - BUG), D2-014 (auto-assign filtra speeches - BUG), D1-011/D2-016 (excecoes nao tratadas) |
| ALTO | 2 | D1-004 (ARCH nao documenta integracao M006/M007), D1-008 (PRODUCT_SPECIFICATION desatualizado) |
| MEDIO | 4 | D1-003 (Actors no ARCH_M002), D1-009 (SPEC.final.md Secretario), D2-012 (Contracts web vs mobile), D2-015 (Script import-hymns) |
| BAIXO | 10 | D1-001, D1-002, D1-005, D1-006, D1-007, D1-010, D2-004, D2-005, D2-007, D2-013 |
| MUITO BAIXO | 3 | D2-006, D2-009, D2-010 |
| NENHUM | 1 | D2-011 (desvio positivo aceito) |
