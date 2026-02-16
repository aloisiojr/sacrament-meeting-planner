# Especificação de Produto: Gerenciador de Reunião Sacramental

**Versão:** 1.0
**Data:** 14 de Fevereiro de 2026
**Autor:** Aloisio Almeida Jr

---

## 1. Contexto e Problema

### 1.1 Quem são os usuários

Os usuários primários deste aplicativo são:

**Bispado (3 pessoas):**
- **Bispo:** Líder da ala, responsável por supervisionar todas as atividades
- **Primeiro Conselheiro:** Auxilia o bispo na liderança da ala
- **Segundo Conselheiro:** Auxilia o bispo na liderança da ala

O bispado é responsável por **decisões estratégicas e espirituais**, incluindo:
- Decidir quem deve ser convidado para dar discursos
- Escolher temas apropriados para cada discursante
- Aprovar designações de discursos

**Secretário de Ala:**
- Auxilia o bispado com tarefas administrativas
- Executa as decisões do bispado no sistema
- Faz contato com os membros para convidar e confirmar discursos
- Mantém registro atualizado de designações e status
- Gerencia cadastro de membros, temas e exceções de domingos

**Observador:**
- Membro da ala com acesso somente-leitura ao sistema
- Pode visualizar discursos e designações, mas não pode fazer alterações
- Não tem acesso à aba Configurações
- Ideal para membros do bispado que querem acompanhar sem fazer gestão ativa

**Responsabilidades e Permissões:**
- **Bispado:** Designar discursantes e temas, alterar status de discursos, acessar todas as funcionalidades, editar agenda da reunião sacramental, designar discursantes pela aba Agenda, convidar novos usuários por link
- **Secretário:** Cadastrar membros, cadastrar temas, marcar exceções, alterar status de discursos, gerenciar convites via WhatsApp, editar agenda da reunião sacramental, designar discursantes pela aba Agenda, convidar novos usuários por link
- **Observador:** Apenas visualizar discursos, designações e agenda (sem permissão de edição)

### 1.2 Problema a ser resolvido

Atualmente, a gestão de discursos é feita de forma manual (planilhas, cadernos, mensagens de WhatsApp), o que gera diversos problemas:

- **Perda de informação:** Anotações em papel podem ser perdidas ou esquecidas
- **Falta de visibilidade:** Difícil visualizar rapidamente quais domingos já têm discursantes designados
- **Retrabalho:** Precisar consultar múltiplas fontes para saber quem já deu discurso recentemente
- **Comunicação fragmentada:** Confirmações e mudanças de status acontecem via mensagens dispersas
- **Planejamento limitado:** Difícil planejar com antecedência (6-12 meses) sem uma ferramenta adequada

### 1.3 Por que uma solução digital é necessária

Uma solução digital centralizada permite:

- **Visão consolidada:** Ver todos os domingos e seus status em uma única tela
- **Histórico completo:** Acessar rapidamente quem deu discurso sobre qual tema e quando
- **Planejamento antecipado:** Organizar designações com meses de antecedência
- **Sincronização automática:** Mudanças refletem imediatamente em todas as visualizações
- **Acessibilidade:** Acessar de qualquer dispositivo (celular, tablet, computador)

### 1.4 Escopo

**O app RESOLVE:**
- Cadastro e gerenciamento de membros da ala
- Cadastro e gerenciamento de temas de discursos
- Marcação de domingos sem discursos (exceções)
- Designação de discursantes para domingos específicos
- Visualização de status de designações (Não-designado, Designado/Não-Convidado, Designado/Convidado, Designado/Confirmado, Desistiu)
- Sincronização em tempo real entre diferentes visualizações
- **Configuração completa da agenda da reunião sacramental** (quem preside, dirige, hinos, orações, discursos, sacramentos)
- **Modo Apresentação** para acompanhar a reunião em tempo real (tela full-screen read-only)
- **Cadastro de atores da reunião** (presidência, quem dirige, pianista, regente, autoridades visitantes)
- **Catálogo de hinos** com suporte a internacionalização e subconjunto de hinos sacramentais
- **Suporte a múltiplas Alas simultaneamente**, cada uma com seu bispado/secretário trabalhando sobre dados isolados de sua Ala
- **Isolamento completo de dados entre Alas** - dados de uma Ala nunca são visíveis para outra Ala
- **Push notifications** para fluidez no fluxo de designações: notificação ao secretário após designação (5 min, agrupada por domingo), lembrete semanal para bispado/secretário, notificação imediata ao confirmar ou desistir
- **Fuso horário configurável por ala** para agendamento de notificações
- **Self-registration do primeiro usuário** de uma ala (cria ala + usuário sem CLI)
- **Convite por link** (deep link) para novos usuários, gerado por Bispado ou Secretário
- **Histórico de ações** (audit log) read-only com busca, retenção de 2 anos

**O app NÃO RESOLVE:**
- Comunicação direta com os membros (não envia SMS/email/WhatsApp — push notifications são suportadas)
- Gestão de outros aspectos da ala (frequência, chamados, etc)
- Colaboração multi-usuário simultânea (apenas um usuário por Ala usa por vez)
- Integração com sistemas oficiais da Igreja

---

## 2. Requisitos Funcionais

### RF-01: Acessar tela de gerenciamento de membros
**Descrição:** O usuário deve conseguir acessar uma tela dedicada para gerenciar membros da ala.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Configurações"
- **Quando** clica no card "Membros"
- **Então** navega para tela cheia de gerenciamento de membros
- **E** vê botão de voltar (à esquerda do campo de search)
- **E** vê campo de search no topo
- **E** vê botão "+" (à direita do campo de search)
- **E** vê lista de membros (cards recolhidos, ordenados alfabeticamente por nome)

**Prioridade:** Must have

---

### RF-01.1: Buscar membros em tempo real
**Descrição:** O usuário deve conseguir filtrar a lista de membros digitando no campo de search.

**Critérios de aceitação:**
- **Dado** que o usuário está na tela de gerenciamento de membros
- **Quando** digita no campo de search
- **Então** a lista filtra em tempo real (a cada tecla)
- **E** busca por nome (case-insensitive)
- **E** ignora acentos ("João" encontrado ao digitar "Joao")
- **E** busca parcial ("João Silva" encontrado ao digitar "Silva")

**Prioridade:** Must have

---

### RF-01.2: Adicionar novo membro manualmente
**Descrição:** O usuário deve conseguir adicionar novos membros manualmente.

**Critérios de aceitação:**
- **Dado** que o usuário está na tela de gerenciamento de membros
- **Quando** clica no botão "+"
- **Então** um card expandido vazio aparece no topo da lista
- **E** vê campos editáveis:
  - Nome Completo (obrigatório)
  - Código do País (dropdown com ~195 países ordenados alfabeticamente, obrigatório)
  - Telefone (campo numérico, obrigatório)
- **E** ao preencher todos os campos e clicar fora do card, membro é salvo automaticamente
- **E** ao tentar clicar fora sem preencher Nome ou Telefone, diálogo de confirmação aparece: "Deseja cancelar a adição? Os dados não foram inseridos corretamente."
- **E** ao confirmar cancelamento, card é removido sem salvar

**Prioridade:** Must have

---

### RF-02: Editar membro manualmente
**Descrição:** O usuário deve conseguir editar informações de membros existentes via swipe-to-reveal.

**Critérios de aceitação:**
- **Dado** que existe um membro cadastrado na lista
- **Quando** o usuário faz swipe para a esquerda no card do membro
- **Então** revela 2 botões: lápis (editar) e lixeira (excluir)
- **E** apenas 1 card com botões revelados por vez
- **E** swipe só ativa após threshold (~20px horizontal com pouco vertical)
- **Quando** clica no botão lápis
- **Então** o card expande mostrando:
  - Nome Completo (campo editável, **largura total** da tela)
  - Código do País (dropdown compacto com **bandeira emoji** — ex: 🇧🇷 +55)
  - Telefone (campo editável, **largura total** da tela)
- **E** **NÃO há botões Salvar/Cancelar** — salvamento automático ao clicar fora
- **E** ao clicar fora do card, mudanças são salvas automaticamente
- **E** se nada foi alterado, fecha sem requisição ao backend
- **E** ao tentar clicar fora com Nome ou Telefone vazios, diálogo de erro aparece, valores revertidos
- **E** edição de nome **não atualiza** discursos passados ou futuros (preserva snapshot do momento da designação)
- **E** clicar no campo de código internacional NÃO deve fechar o card
- **E** lista do dropdown de código não ultrapassa limites visuais
- **E** Observador: swipe desabilitado
- **E** **tap no card NÃO abre edição** (apenas swipe)

**Prioridade:** Must have

---

### RF-03: Excluir membro manualmente
**Descrição:** O usuário deve conseguir remover membros via swipe-to-reveal.

**Critérios de aceitação:**
- **Dado** que um card de membro teve swipe para a esquerda revelando botões
- **Quando** o usuário clica no botão lixeira (excluir)
- **Então** sistema verifica se membro está designado para discursos futuros
- **E** se membro está designado para discursos futuros, diálogo aparece: "Este membro está designado para X discursos futuros. As correções deverão ser feitas manualmente. Deseja continuar?"
- **E** se membro não está designado para discursos futuros, diálogo aparece: "Tem certeza que deseja excluir este membro?"
- **E** ao confirmar, o membro é removido permanentemente da tabela
- **E** discursos passados e futuros designados para esse membro preservam o nome (snapshot)
- **E** membro não aparece mais na lista de discursantes disponíveis

**Prioridade:** Must have

---

### RF-04: Baixar planilha de membros
**Descrição:** O usuário deve conseguir baixar uma planilha com todos os membros atuais.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Configurações"
- **Quando** clica no card "Sobrescrever Lista de Membros"
- **Então** o card expande mostrando botões "Download" e "Upload"
- **E** ao clicar em "Download"
- **Então** sistema gera arquivo (Excel/CSV) com 2 colunas:
  - `Nome` (ex: "João Silva")
  - `Telefone Completo` (ex: "+5511987654321")
- **E** arquivo contém todos os membros atuais da ala
- **E** em **Web**: cria Blob + download como "membros.csv"
- **E** em **Mobile**: usa `expo-file-system` + `expo-sharing` para compartilhar

**Prioridade:** Must have

---

### RF-05: Sobrescrever lista de membros via planilha
**Descrição:** O usuário deve conseguir substituir completamente a lista de membros fazendo upload de uma planilha.

**Critérios de aceitação:**
- **Dado** que o card "Sobrescrever Lista de Membros" está expandido
- **Quando** o usuário clica em "Upload" e seleciona arquivo (Web: file input aceita .csv; Mobile: `expo-document-picker`)
- **Então** sistema valida que:
  - Arquivo tem 2 colunas: `Nome` e `Telefone Completo`
  - Todas as linhas têm ambos os campos preenchidos
  - Não há linhas duplicadas
  - Telefone está no formato `+xxyyyyyyyy` (ex: +5511987654321)
- **E** se validação OK:
  1. Sistema **apaga TODOS** os membros atuais da tabela (para aquela Estaca/Ala)
  2. Sistema **insere todos** os membros da planilha
  3. Mensagem de sucesso aparece: "Lista de membros atualizada com sucesso"
- **E** se validação FALHA:
  - Nenhuma alteração é feita no banco de dados
  - Mensagem de erro aparece explicando o problema

**Prioridade:** Must have

---

### RF-06: Acessar gerenciamento de temas e coleções
**Descrição:** O usuário deve conseguir visualizar e gerenciar Coleções de temas (Gerais e da Ala).

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Configurações"
- **Quando** clica no card "Temas"
- **Então** card expande inline mostrando lista de Coleções
- **E** vê Coleções na seguinte ordem:
  1. "Temas da Ala" (sempre primeiro)
  2. Coleções Gerais ativas (mais recentes primeiro)
  3. Coleções Gerais inativas (mais recentes primeiro)
- **E** cada Coleção tem checkbox à esquerda indicando se está ativa
- **E** "Temas da Ala" é expansível (ao clicar, mostra lista de temas)
- **E** Coleções Gerais não são expansíveis (apenas checkbox para ativar/desativar)

**Prioridade:** Must have

---

### RF-06.1: Ativar/Desativar Coleção Geral
**Descrição:** O usuário deve conseguir ativar ou desativar Coleções Gerais para uso da Ala.

**Critérios de aceitação:**
- **Dado** que uma Coleção Geral está desativada
- **Quando** o usuário marca o checkbox
- **Então** Coleção é ativada para a Ala
- **E** temas dessa Coleção ficam disponíveis para seleção ao designar discursos
- **E** Coleção move para seção "ativas" (ordenadas por mais recentes primeiro)
- **E** quando o usuário desmarca o checkbox de Coleção ativa
- **Então** sistema verifica se há temas dessa Coleção designados para discursos futuros
- **E** se houver, diálogo aparece: "Existem X temas desta coleção designados para discursos futuros. Se desejada, a alteração terá que ser manual. Deseja continuar?"
- **E** ao confirmar, Coleção é desativada
- **E** Coleção move para seção "inativas"
- **E** discursos futuros preservam título do tema (snapshot)

**Prioridade:** Must have

---

### RF-06.2: Ativar/Desativar Coleção da Ala
**Descrição:** O usuário deve conseguir ativar ou desativar a Coleção "Temas da Ala".

**Critérios de aceitação:**
- **Dado** que "Temas da Ala" está ativada
- **Quando** o usuário desmarca o checkbox
- **Então** sistema verifica se há temas desta Coleção designados para discursos futuros
- **E** se houver, diálogo aparece: "Existem X temas desta coleção designados para discursos futuros. Se desejada, a alteração terá que ser manual. Deseja continuar?"
- **E** ao confirmar, Coleção é desativada
- **E** temas desta Coleção não ficam mais disponíveis para seleção ao designar novos discursos
- **E** discursos futuros preservam título do tema (snapshot)

**Prioridade:** Must have

---

### RF-07: Adicionar tema na Coleção da Ala
**Descrição:** O usuário deve conseguir criar novos temas personalizados na Coleção "Temas da Ala".

**Critérios de aceitação:**
- **Dado** que "Temas da Ala" está expandida
- **Quando** o usuário vê lista de temas existentes (cards contraídos, ordenados alfabeticamente por título)
- **E** vê card "Adicionar Tema" como último item da lista
- **E** clica no card "Adicionar Tema"
- **Então** card expande mostrando campos editáveis:
  - Título (obrigatório)
  - Link (opcional, URL)
- **E** ao preencher ambos os campos e clicar fora do card
- **Então** tema é salvo automaticamente
- **E** card recolhe e aparece na lista ordenada alfabeticamente
- **E** tema fica disponível para seleção ao designar discursos (se Coleção estiver ativa)
- **E** ao tentar clicar fora sem preencher Título, diálogo aparece: "Erro: Título é obrigatório. Deseja cancelar a adição?"
- **E** ao confirmar cancelamento, card é removido sem salvar

**Prioridade:** Must have

---

### RF-08: Editar tema da Coleção da Ala
**Descrição:** O usuário deve conseguir editar temas personalizados via swipe-to-reveal.

**Critérios de aceitação:**
- **Dado** que "Temas da Ala" está expandida
- **E** existe um tema cadastrado
- **Quando** o usuário faz swipe para a esquerda no card do tema
- **Então** revela botões lápis (editar) e lixeira (excluir)
- **E** apenas 1 card com botões revelados por vez
- **E** **tap no card NÃO abre edição** (apenas swipe)
- **Quando** clica no botão lápis
- **Então** card expande mostrando:
  - Título (campo editável, **largura total**)
  - Link (campo editável, opcional, **largura total**)
- **E** **NÃO há botões Salvar/Cancelar** — salvamento automático ao clicar fora
- **E** ao clicar fora do card, mudanças são salvas automaticamente
- **E** ao tentar clicar fora com Título vazio, diálogo de erro aparece, valor revertido

**Prioridade:** Must have

---

### RF-08.1: Excluir tema da Coleção da Ala
**Descrição:** O usuário deve conseguir remover temas via swipe-to-reveal.

**Critérios de aceitação:**
- **Dado** que o card de tema teve swipe para a esquerda revelando botões
- **Quando** o usuário clica no botão lixeira
- **Então** sistema verifica se tema está em discursos futuros
- **E** se tema está em discursos futuros, diálogo informa quantidade
- **E** diálogo de confirmação aparece
- **E** ao confirmar, tema é removido da lista
- **E** card desaparece
- **E** discursos passados e futuros designados com esse tema preservam o título (snapshot)
- **E** tema não aparece mais na lista de seleção ao designar novos discursos

**Prioridade:** Must have

---

### RF-08.2: Importar Coleções Gerais via script (Admin)
**Descrição:** O administrador do sistema deve conseguir importar Coleções Gerais e seus temas via script CSV.

**Critérios de aceitação:**
- **Dado** que o administrador tem arquivo CSV com formato:
  ```
  Idioma,Coleção,Título,Link
  pt-BR,Conferência Geral Out/2025,Fé em Jesus Cristo,https://...
  pt-BR,Conferência Geral Out/2025,Arrependimento,https://...
  en,General Conference Oct/2025,Faith in Jesus Christ,https://...
  en,General Conference Oct/2025,Repentance,https://...
  es,Conferencia General Oct/2025,Fe en Jesucristo,https://...
  ```
- **Quando** executa script de importação (ex: `pnpm import-themes themes.csv`)
- **Então** script lê arquivo CSV
- **E** cria Coleções Gerais com idioma específico (se não existirem)
- **E** cria temas dentro das Coleções
- **E** Coleções aparecem automaticamente para Alas do mesmo idioma (desativadas por padrão)
- **E** script exibe resumo: "Importadas 3 coleções (pt-BR: 2, en: 1), 45 temas"

**Prioridade:** Must have

**Nota técnica:** Script pode ficar em `/scripts/import-themes.ts` ou `/server/scripts/import-themes.ts`

---

### RF-08.3: Configurar idioma da Ala
**Descrição:** O usuário deve conseguir configurar o idioma da Ala, que determina quais Coleções Gerais estarão disponíveis.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Configurações"
- **Quando** clica no card "Configurações" (ou equivalente)
- **Então** vê opção "Idioma da Ala"
- **E** vê idioma atual selecionado (ex: "Português (pt-BR)")
- **E** ao clicar, modal abre com opções: Português (pt-BR), Inglês (en), Espanhol (es)
- **E** ao selecionar novo idioma diferente do atual
- **Então** diálogo de aviso aparece: "Ao mudar o idioma, apenas Coleções Gerais do novo idioma ficarão disponíveis. Coleções ativas do idioma anterior serão desativadas. Deseja continuar?"
- **E** ao confirmar:
  - Idioma da Ala é atualizado
  - Todas as Coleções Gerais ativas do idioma anterior são desativadas
  - Coleções Gerais do novo idioma ficam disponíveis (desativadas por padrão)
  - Interface do app muda para o novo idioma
  - Formatos de data/hora adaptam para o novo idioma
- **E** "Temas da Ala" permanece visível (não é afetada por mudança de idioma)
- **E** discursos futuros com temas de Coleções desativadas preservam título e link (snapshot)

**Prioridade:** Must have

---

### RF-09: Selecionar tipo de domingo (exceções) via dropdown
**Descrição:** O usuário deve conseguir selecionar o tipo de cada domingo diretamente no card expandido das abas Discursos e Home, via dropdown no topo do card. A seção "Domingos sem Discursos" da aba Configurações foi removida.

**Critérios de aceitação:**
- **Dado** que o usuário expande um card de domingo na aba "Discursos" ou na aba "Home"
- **Então** vê um **dropdown de tipo de domingo** no topo do card, logo abaixo do título
- **E** dropdown com opções: Discursos, Reunião de Testemunho, Conferência Geral, Conferência de Estaca, Conferência de Ala, Apresentação Especial da Primária, Outro
- **E** quando dropdown = "Discursos": mostra campos de discursantes e temas (comportamento normal)
- **E** quando dropdown = qualquer exceção: campos de discursos **somem**
- **E** ao selecionar "Outro": **diálogo** abre para digitar motivo customizado + botão OK; ao confirmar, salva; ao cancelar, dropdown volta
- **E** se domingo tinha discursantes ou temas e usuário seleciona exceção: diálogo de confirmação "Os discursos designados para este domingo serão apagados. Deseja continuar?"
- **E** ao confirmar: entries deletadas da tabela `speeches`; ao cancelar: dropdown volta para "Discursos"
- **E** ao mudar de exceção para "Discursos": 3 speeches vazios criados imediatamente e campos de discurso aparecem
- **E** card contraído mostra texto da exceção no lugar dos LEDs (quando exceção selecionada)
- **E** Bispado e Secretário podem editar o dropdown
- **E** Observador: dropdown **visível mas desabilitado** (read-only)

**Auto-atribuição em lote:**
- Ao carregar a lista de domingos (aba Discursos ou Home), para cada domingo sem entrada na tabela `sunday_exceptions`:
  - Padrão: `Discursos`
  - 1º domingo de Jan, Fev, Mar, Mai, Jun, Jul, Ago, Set, Nov, Dez: `Reunião de Testemunho`
  - 1º domingo de Abr e Out: `Conferência Geral`
  - 2º domingo de Abr e Out: `Reunião de Testemunho`
- **Todos os valores** auto-atribuídos são **persistidos imediatamente** no banco (inclusive "Discursos")
- Ao carregar +6 meses (scroll infinito), a auto-atribuição roda para os novos domingos

**Prioridade:** Must have

---

### RF-10: Auto-atribuir tipo de domingo em lote
**Descrição:** O sistema deve automaticamente atribuir valores padrão para domingos sem entrada na tabela ao carregar a lista.

**Critérios de aceitação:**
- **Dado** que a aba Discursos ou Home carrega domingos
- **Quando** há domingos sem entrada na tabela `sunday_exceptions`
- **Então** sistema auto-atribui e **persiste imediatamente**:
  - Maioria dos domingos: "Discursos" (domingo normal)
  - 1º domingo de Jan, Fev, Mar, Mai, Jun, Jul, Ago, Set, Nov, Dez: "Reunião de Testemunho"
  - 1º domingo de Abr e Out: "Conferência Geral"
  - 2º domingo de Abr e Out: "Reunião de Testemunho"
- **E** valores auto-atribuídos podem ser editados pelo Bispado e Secretário
- **E** após edição manual, o sistema NÃO re-auto-atribui (entrada já existe no banco)

**Prioridade:** Must have

---

### RF-11: Mudar tipo de domingo de exceção para Discursos
**Descrição:** O usuário deve conseguir mudar o dropdown de uma exceção para "Discursos", criando speeches vazios.

**Critérios de aceitação:**
- **Dado** que um domingo tem exceção selecionada no dropdown
- **Quando** o usuário muda o dropdown para "Discursos"
- **Então** a entrada na tabela `sunday_exceptions` é atualizada para "Discursos"
- **E** 3 speeches vazios (não designados) são criados imediatamente
- **E** campos de discurso aparecem no card expandido
- **E** card contraído volta a mostrar LEDs em vez de texto de exceção

**Prioridade:** Must have

---

### RF-12: Visualizar domingos com discursos
**Descrição:** O usuário deve conseguir ver uma lista de todos os domingos que terão discursos.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Discursos"
- **Então** vê lista de domingos (12 meses passados + 12 meses futuros)
- **E** lista abre automaticamente no próximo domingo (posicionado no topo da tela, sem animação)
- **E** scroll suave sem desaparecer, sem spinner, sem reposicionar
- **E** cada domingo mostra **DateBlock** à esquerda: dia com 2 dígitos (**zero-padding** — 01, 02, ... 09), mês com 3 letras
- **E** margem esquerda equilibrada visualmente com margem direita
- **E** cada domingo mostra 3 **LEDs 3D** à direita (ou texto de exceção)
- **E** separadores de ano intercalados na lista
- **E** domingos passados: opacidade reduzida quando contraído
- **E** próximo domingo: borda primária destacada
- **E** domingos com exceções aparecem com motivo em texto

**Prioridade:** Must have

---

### RF-13: Designar discursante e tema
**Descrição:** O usuário (bispado) deve conseguir designar um membro para dar discurso sobre um tema específico.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Discursos"
- **Quando** clica em um card de domingo
- **Então** card expande mostrando 3 discursos com labels ordinais: "1º Discurso", "2º Discurso", "3º Discurso" (Unicode U+00BA)
- **E** header do card mantém posição fixa ao expandir/fechar
- **E** card scrolla suavemente para ficar totalmente visível
- **E** ao clicar no campo "Discursante" (com **seta dropdown** na direita), modal abre com lista de membros (ordenados alfabeticamente)
- **E** ao selecionar membro, campo mostra nome e status muda para "Designado/Não-Convidado" (LED amarelo fading)
- **E** ao clicar no campo "Tema" (com **seta dropdown** na direita), modal abre com lista de temas de Coleções ativas
- **E** lista mostra temas no formato: "Coleção : Título" (ex: "Conferência Geral Abr/2026 : Fé em Jesus Cristo")
- **E** lista é ordenada alfabeticamente pela string concatenada completa
- **E** ao selecionar tema, campo mostra "Coleção : Título"
- **E** se tema tem Link, Link é armazenado junto (será enviado ao discursante posteriormente)

**Prioridade:** Must have

---

### RF-14: Alterar status de discurso
**Descrição:** O usuário (secretário) deve conseguir atualizar o status de um discurso conforme o processo avança.

**Critérios de aceitação:**
- **Dado** que um discurso tem discursante designado
- **Quando** o usuário clica no LED 3D de status **ou** no texto do status
- **Então** modal abre com opções: Designado/Não-Convidado, Designado/Convidado, Designado/Confirmado, Desistiu
- **E** ao selecionar novo status, LED 3D muda de aparência:
  - Designado/Não-Convidado: LED com **fading contínuo** entre apagado e amarelo
  - Designado/Convidado: LED amarelo **fixo** com efeito 3D
  - Designado/Confirmado: LED verde forte com efeito 3D
  - Desistiu: LED vermelho forte com efeito 3D
- **E** mudança reflete imediatamente em todas as visualizações

**Prioridade:** Must have

---

### RF-15: Remover designação de discurso
**Descrição:** O usuário deve conseguir remover a designação de um discursante.

**Critérios de aceitação:**
- **Dado** que um discurso tem discursante designado
- **Quando** o usuário clica no "X" ao lado do nome do discursante
- **Então** um diálogo de confirmação aparece
- **E** ao confirmar, discursante é removido
- **E** status volta para "não designado" (círculo cinza)
- **E** tema permanece selecionado (se houver)

**Prioridade:** Must have

---

### RF-16: Carregar mais domingos ao scrollar
**Descrição:** O sistema deve carregar dinamicamente mais domingos ao usuário scrollar para o início ou fim da lista.

**Critérios de aceitação:**
- **Dado** que o usuário está na aba "Discursos"
- **Quando** scrolla até o início da lista (domingos mais antigos)
- **Então** sistema carrega mais 6 meses no passado
- **E** quando scrolla até o fim da lista (domingos mais futuros)
- **Então** sistema carrega mais 6 meses no futuro
- **E** carregamento acontece de forma suave, sem travar a interface
- **E** novos dados carregados **sem remover existentes** da tela
- **E** scroll suave sem desaparecer, sem spinner, sem reposicionar

**Prioridade:** Should have

---

### RF-17: Sincronizar dados entre abas
**Descrição:** O sistema deve sincronizar mudanças entre todas as abas em tempo real.

**Critérios de aceitação:**
- **Dado** que o usuário faz uma mudança em qualquer aba
- **Então** mudança reflete em todas as outras abas em até 5 segundos
- **E** isso inclui:
  - Criar/editar/excluir membros
  - Criar/editar/excluir temas
  - Marcar/remover exceções de domingos
  - Designar/remover discursantes
  - Alterar status de discursos

**Prioridade:** Must have

---

### RF-18: Visualizar próximos 3 domingos na aba Home
**Descrição:** Todos os usuários devem ver os 3 próximos domingos na aba Home, independente de terem exceção ou não.

**Critérios de aceitação:**
- **Dado** que o usuário abre a aba Home
- **Então** vê a seção "Discursos nos próximos 3 domingos"
- **E** vê 3 cards contraídos, cada um mostrando:
  - Data do domingo (à esquerda)
  - 3 círculos coloridos de status (à direita)
- **E** se o domingo tem exceção, o card mostra o motivo da exceção
- **E** ao clicar no card, ele expande mostrando **dropdown de tipo de domingo** no topo e os 3 discursos (se dropdown = "Discursos")
- **E** **Bispado** pode designar discursantes/temas, alterar status e tipo de domingo
- **E** **Secretário** pode alterar status e tipo de domingo (não pode designar)
- **E** **Observador** pode apenas visualizar (dropdown visível mas desabilitado)

**Prioridade:** Must have

---

### RF-19: Visualizar próximas designações pendentes (Bispado)
**Descrição:** O bispado deve ver uma seção mostrando o próximo domingo com designações pendentes, após os 3 primeiros domingos estarem completos.

**Critérios de aceitação:**
- **Dado** que o usuário é do **Bispado**
- **E** os 3 próximos domingos já possuem todos os 9 discursos designados (discursante + tema + status diferente de "Não-designado" ou "Desistiu")
- **Então** aparece a seção "Próximas designações"
- **E** mostra o 4º domingo (ou o primeiro domingo após os 3 primeiros que tenha pelo menos um discurso "Não-designado" ou "Desistiu")
- **E** o card é idêntico aos cards da seção anterior (contraído, expansível)
- **E** ao resolver todas as designações desse domingo, a seção mostra o próximo domingo pendente
- **E** se não houver domingos pendentes, a seção não aparece
- **E** **Secretário** e **Observador** **não** veem esta seção

**Prioridade:** Should have

---

### RF-20: Gerenciar convites via WhatsApp (Secretário)
**Descrição:** O secretário deve ver uma lista de designações pendentes de convite/confirmação e poder enviar mensagens via WhatsApp.

**Critérios de aceitação:**
- **Dado** que o usuário é **Secretário**
- **Então** vê a seção "Gerenciamento dos convites"
- **E** vê uma lista de designações com status "Designado/Não-Convidado" ou "Designado/Convidado"
- **E** cada item mostra:
  - Data do domingo (formato compacto: "18 FEV")
  - Número do discurso ("1º Discurso", "2º Discurso", "3º Discurso")
  - Botão de ação
- **E** lista é ordenada por data (mais próximas primeiro)
- **E** **Bispado** e **Observador** **não** veem esta seção

**Critérios de aceitação - Ações por Status:**

**Status "Designado/Não-Convidado":**
- **Quando** secretário clica no botão de ação
- **Então** abre WhatsApp (wa.me) com mensagem pré-preenchida:
  ```
  Olá, tudo bom! O Bispado gostaria de te convidar para fazer o <1º/2º/3º> discurso no domingo dia <dia de mês por extenso>! Você falará sobre um tema da <coleção> com o título <título> <link se houver>. Podemos confirmar o seu discurso?
  ```
- **E** após enviar, status muda automaticamente para "Designado/Convidado"

**Status "Designado/Convidado":**
- **Quando** secretário clica no botão de ação
- **Então** abre um seletor com 3 opções:
  1. **Ir para conversa do WhatsApp** - Abre WhatsApp (wa.me) com a mesma mensagem de convite pré-preenchida
  2. **Marcar como Confirmado** - Muda status para "Designado/Confirmado" e remove da lista após 3 segundos
  3. **Marcar como Desistiu** - Muda status para "Desistiu" e remove da lista após 3 segundos

**Prioridade:** Must have

---

### RF-21: Configurar agenda da reunião sacramental
**Descrição:** O usuário (Bispado ou Secretário) deve conseguir configurar a agenda completa de cada domingo na aba Agenda.

**Critérios de aceitação:**
- **Dado** que o usuário navega para a aba "Agenda"
- **Então** vê lista de domingos com scroll infinito (12 meses passados + 12 meses futuros)
- **E** cada domingo mostra apenas DateBlock (sem indicador de completude)
- **E** domingos com exceções que NÃO têm reunião sacramental (Conferência Geral, Conferência de Estaca, Outro) NÃO aparecem na lista
- **E** domingos com "Reunião de Testemunho", "Conferência de Ala" ou "Apresentação Especial da Primária" aparecem (formato especial)
- **Quando** clica em um domingo
- **Então** agenda é criada automaticamente (lazy creation) com todos os campos vazios
- **E** formulário mostra 4 seções para reunião normal: Boas-vindas e Anúncios, Designações e Sacramento, Primeiro e Segundo Discurso, Último Discurso
- **E** formulário mostra 3 seções para reunião especial (testemunho/primária): Boas-vindas e Anúncios, Designações e Sacramento, Reunião Especial
- **E** Observador vê todos os campos como read-only

**Prioridade:** Must have

---

### RF-21.1: Seção Boas-vindas e Anúncios da Agenda
**Descrição:** Configurar a seção de abertura da reunião sacramental.

**Critérios de aceitação:**
- **Dado** que o formulário da agenda está aberto
- **Quando** preenche a seção "Boas-vindas e Anúncios"
- **Então** pode selecionar:
  - Quem preside: seletor de ator com papel "Presidir" (inclui quem tem "Dirigir")
  - Quem dirige: seletor de ator com papel "Dirigir"
  - Reconhecer presença: multi-select de atores com papel "Reconhecer"
  - Anúncios: campo de texto livre multilinha
  - Pianista: seletor de ator com papel "Música"
  - Regente: seletor de ator com papel "Música"
  - Primeiro hino: busca por número ou título (todos os hinos do idioma da ala)
  - Primeira oração: seletor de membro da ala OU campo para nome customizado
- **E** nenhum campo é obrigatório (todos podem ficar vazios)
- **E** alterações são salvas automaticamente

**Prioridade:** Must have

---

### RF-21.2: Seção Designações e Sacramento da Agenda
**Descrição:** Configurar a seção de ordenanças e sacramentos da reunião.

**Critérios de aceitação:**
- **Dado** que o formulário da agenda está aberto
- **Quando** preenche a seção "Designações e Sacramento"
- **Então** pode configurar:
  - Apoios e desobrigações: campo de texto livre multilinha
  - Bênção de recém-nascidos: toggle sim/não + campo de texto com nomes (se sim)
  - Confirmação de batismo: toggle sim/não + campo de texto com nomes (se sim)
  - Anúncios da Estaca: toggle sim/não
  - Hino sacramental: busca por número ou título (APENAS hinos com Sacramental=S)
- **E** nenhum campo é obrigatório

**Prioridade:** Must have

---

### RF-21.3: Seção Discursos da Agenda (reunião normal)
**Descrição:** Configurar a seção de discursos e encerramento em reuniões normais.

**Critérios de aceitação:**
- **Dado** que o domingo NÃO tem exceção "Reunião de Testemunho", "Conferência de Ala" nem "Apresentação Especial da Primária"
- **Quando** preenche a seção "Primeiro e Segundo Discurso"
- **Então** pode configurar:
  - 1º Discurso: mostra discursante da tabela speeches (editável — ao designar, status → assigned_confirmed)
  - 2º Discurso: mostra discursante da tabela speeches (editável — ao designar, status → assigned_confirmed)
  - Apresentação especial: toggle sim/não + campo de descrição (se sim)
  - Hino intermediário: busca de hino (visível APENAS se apresentação especial = não)
- **E** na seção "Último Discurso":
  - 3º Discurso: mostra discursante da tabela speeches (editável — ao designar, status → assigned_confirmed)
  - Hino final: busca de hino
  - Última oração: seletor de membro OU nome customizado
- **E** tanto Bispado quanto Secretário podem designar discursantes pela aba Agenda (exceção à regra geral onde apenas Bispado designa)
- **E** tema do discurso NÃO é visível nem editável na aba Agenda

**Prioridade:** Must have

---

### RF-21.4: Seção Reunião Especial da Agenda
**Descrição:** Configurar a seção de encerramento em reuniões de testemunho ou apresentação da primária.

**Critérios de aceitação:**
- **Dado** que o domingo tem exceção "Reunião de Testemunho", "Conferência de Ala" ou "Apresentação Especial da Primária"
- **Quando** preenche a seção "Reunião Especial"
- **Então** pode configurar:
  - Tipo de reunião: exibido automaticamente a partir da exceção (read-only)
  - Hino final: busca de hino
  - Última oração: seletor de membro OU nome customizado
- **E** seções de discursos NÃO aparecem (não há discursos em reuniões especiais)
- **E** "Reunião de Testemunho", "Conferência de Ala" e "Apresentação Especial da Primária" usam o mesmo layout

**Prioridade:** Must have

---

### RF-22: Gerenciar atores da reunião
**Descrição:** O usuário deve conseguir cadastrar e gerenciar atores da reunião diretamente na aba Agenda.

**Critérios de aceitação:**
- **Dado** que o usuário clica em um campo de ator (ex: "Quem preside")
- **Então** seletor abre mostrando:
  - Lista de atores existentes filtrados pelo papel requerido
  - Campo de busca/filtro no topo
  - Botão "Adicionar novo ator" ao final da lista
  - Ícone de lixeira ao lado de cada ator para deletar
- **Quando** clica em "Adicionar novo ator"
- **Então** campo de nome aparece. Ao salvar, o papel é inferido automaticamente do campo de ator clicado (ex: campo "Pianista" define can_music=true). Ator com papel "Dirigir" automaticamente qualifica para "Presidir".
- **E** um ator pode ter múltiplos papéis (ex: Presidir + Música)
- **Quando** clica no ícone de lixeira de um ator
- **Então** diálogo de confirmação aparece
- **E** ao confirmar: ator removido da lista; nome preservado como snapshot em agendas existentes (FK vira NULL)

**Prioridade:** Must have

---

### RF-23: Selecionar hinos para a agenda
**Descrição:** O usuário deve conseguir selecionar hinos da Igreja para cada campo de hino da agenda.

**Critérios de aceitação:**
- **Dado** que o usuário clica em um campo de hino (primeiro, sacramental, intermediário ou final)
- **Então** seletor abre com:
  - Campo de busca no topo (filtra por número ou título)
  - Lista de hinos no formato "Número — Título" (ex: "123 — Conta as Bênçãos")
  - Lista ordenada por número
- **E** para campo "Hino sacramental": mostra APENAS hinos com flag Sacramental
- **E** para demais campos: mostra todos os hinos do idioma da ala
- **E** ao selecionar, hino é armazenado como referência (FK) à tabela de hinos

**Prioridade:** Must have

---

### RF-23.1: Importar hinos via script (Admin)
**Descrição:** O administrador deve conseguir importar o hinário completo via script CSV.

**Critérios de aceitação:**
- **Dado** que o administrador tem arquivo CSV com formato: `Lingua,Numero,Titulo,Sacramental(S/N)`
- **Quando** executa script `pnpm import-hymns hinario.csv`
- **Então** script importa hinos para o idioma especificado
- **E** hinos existentes para o mesmo idioma+número são atualizados (upsert)
- **E** script exibe resumo: "Importados X hinos para idioma Y"
- **E** CSV inválido não importa nada e mostra erro detalhado com linha/campo

**Prioridade:** Must have

---

### RF-24: Selecionar membro ou nome customizado para orações
**Descrição:** O usuário deve conseguir selecionar quem faz a primeira e última oração.

**Critérios de aceitação:**
- **Dado** que o usuário clica no campo de oração (primeira ou última)
- **Então** seletor abre mostrando:
  - Lista de todos os membros da ala ordenados alfabeticamente
  - Campo de busca no topo (case-insensitive, sem acentos)
  - Campo "Nome diferente" ao final da lista
- **Quando** seleciona um membro da ala
- **Então** nome é armazenado como snapshot + FK para members
- **Quando** digita um nome no campo "Nome diferente"
- **Então** nome é armazenado APENAS na agenda daquele domingo (sem persistir em membros nem atores)

**Prioridade:** Must have

---

### RF-25: Modo Apresentação da reunião sacramental
**Descrição:** O usuário deve conseguir abrir uma visualização full-screen da agenda para acompanhar a reunião.

**Critérios de aceitação:**
- **Dado** que é domingo (00:00 até 23:59)
- **Então** botão "Iniciar Reunião Sacramental" aparece no topo da aba Home
- **E** botão é visível para todos os papéis (Bispado, Secretário, Observador)
- **Quando** clica no botão
- **Então** tela full-screen abre com agenda do domingo atual
- **E** layout é acordeão com 4 cards (reunião normal) ou 3 cards (reunião especial):
  1. BOAS-VINDAS E ANÚNCIOS (expandido inicialmente)
  2. DESIGNAÇÕES E SACRAMENTO
  3. PRIMEIRO E SEGUNDO DISCURSO (ou REUNIÃO ESPECIAL)
  4. ÚLTIMO DISCURSO (apenas reunião normal)
- **E** exatamente 1 card expandido por vez
- **E** cards contraídos anteriores ao expandido ficam empilhados no topo
- **E** cards contraídos posteriores ficam empilhados no final
- **E** todos os cards contraídos SEMPRE visíveis (nunca saem da tela)
- **E** se conteúdo do card expandido excede espaço disponível: scroll interno
- **Quando** clica em card contraído
- **Então** card atual contrai, clicado expande (animação suave)
- **E** todos os campos são read-only (nenhuma edição permitida)
- **E** se NÃO é domingo, botão NÃO aparece na Home

**Prioridade:** Must have

---

### RF-26: Enviar push notification após designação (Case 1)
**Descrição:** O sistema deve enviar push notification ao secretário 5 minutos após uma designação de discursante feita pelo bispado. Múltiplas designações para o mesmo domingo dentro da janela de 5 min são agrupadas em um único push. Designações para domingos diferentes geram pushes separados.

**Critérios de aceitação:**
- **Dado** que o bispado designou um discursante
- **Quando** 5 minutos se passam desde a designação
- **Então** push notification enviado ao(s) secretário(s)
- **E** texto (1 designação): "{nome} foi designado para discursar no dia {data}. Hora de fazer o convite!"
- **E** texto (múltiplas, mesmo domingo): "{nome1}, {nome2} e {nome3} foram designados para discursar no dia {data}. Hora de fazer o convite!"
- **E** se o domingo tem exceção (tipo != "Discursos"), push é suprimido
- **E** texto traduzido para o idioma da ala (pt, en, es)
- **E** ao tocar na notificação, app abre na aba Home

**Prioridade:** Must have

---

### RF-27: Enviar lembrete semanal para bispado (Case 2)
**Descrição:** Todo domingo às 18:00 no fuso horário da ala, enviar push notification para todos do bispado se o próximo domingo tiver discursos não designados.

**Critérios de aceitação:**
- **Dado** que é domingo às 18:00 no fuso da ala
- **Quando** próximo domingo tem tipo = "Discursos" E pelo menos 1 dos 3 discursos com status `not_assigned`
- **Então** push enviado a todos do bispado
- **E** texto: "Ainda faltam discursantes a serem designado para domingo que vem!"
- **E** se próximo domingo tem exceção (tipo != "Discursos"), push NÃO é enviado
- **E** texto traduzido para o idioma da ala (pt, en, es)

**Prioridade:** Must have

---

### RF-28: Enviar lembrete semanal para secretário (Case 3)
**Descrição:** Todo domingo às 18:00 no fuso horário da ala, enviar push notification para o secretário se o próximo domingo tiver discursos não confirmados.

**Critérios de aceitação:**
- **Dado** que é domingo às 18:00 no fuso da ala
- **Quando** próximo domingo tem tipo = "Discursos" E pelo menos 1 dos 3 discursos com status != `assigned_confirmed`
- **Então** push enviado ao secretário
- **E** texto: "Ainda faltam discursantes a serem designado para domingo que vem!"
- **E** se próximo domingo tem exceção (tipo != "Discursos"), push NÃO é enviado
- **E** texto traduzido para o idioma da ala (pt, en, es)

**Prioridade:** Must have

---

### RF-29: Enviar push ao confirmar discursante (Case 4)
**Descrição:** Sempre que o status de um discurso mudar para "Confirmado" (assigned_confirmed), enviar push notification imediato para secretário e bispado.

**Critérios de aceitação:**
- **Dado** que o status de um discurso muda para `assigned_confirmed`
- **Então** push enviado imediatamente a secretário e todos do bispado
- **E** texto: "{nome} foi confirmado para fazer o {1º, 2º ou 3º} discurso do dia {data}."
- **E** texto traduzido para o idioma da ala (pt, en, es)

**Prioridade:** Must have

---

### RF-30: Enviar push ao discursante desistir (Case 5)
**Descrição:** Sempre que o status de um discurso mudar para "Desistiu", enviar push notification imediato para todos do bispado.

**Critérios de aceitação:**
- **Dado** que o status de um discurso muda para `desistiu`
- **Então** push enviado imediatamente a todos do bispado
- **E** texto: "ATENÇÃO! {nome} NÃO poderá fazer o {1º, 2º ou 3º} discurso do dia {data}. Designe outro discursante!"
- **E** texto traduzido para o idioma da ala (pt, en, es)

**Prioridade:** Must have

---

### RF-31: Configurar fuso horário da ala
**Descrição:** O bispado e o secretário devem poder configurar o fuso horário da ala, usado para agendar push notifications.

**Critérios de aceitação:**
- **Dado** que o usuário (Bispado ou Secretário) está na aba Configurações
- **Então** vê campo de seleção de fuso horário
- **E** formato IANA (ex: America/Sao_Paulo, America/New_York, Europe/Madrid)
- **E** padrão baseado no idioma da ala: America/Sao_Paulo (pt-BR), America/New_York (en), America/Mexico_City (es)
- **E** ao alterar, salva imediatamente no banco

**Prioridade:** Must have

---

### RF-32: Registrar token de push ao abrir o app
**Descrição:** O app deve registrar o Expo Push Token do dispositivo no backend a cada login ou abertura do app.

**Critérios de aceitação:**
- **Dado** que o usuário (Bispado ou Secretário) faz login ou abre o app
- **Então** app solicita permissão de notificação ao OS (se ainda não concedida)
- **E** obtém Expo Push Token via expo-notifications
- **E** salva token na tabela `device_push_tokens`
- **E** se Observador, NÃO registra token (sem push)
- **E** tokens inválidos removidos automaticamente após falha de envio

**Prioridade:** Must have

---

### RF-33: Self-registration do primeiro usuário
**Descrição:** Um novo usuário deve conseguir criar uma ala e se registrar como primeiro usuário dessa ala, sem necessidade de CLI ou intervenção de admin.

**Critérios de aceitação:**
- **Dado** que o usuário está na tela de login
- **Quando** clica em "Criar conta para o primeiro usuário de uma Ala"
- **Então** navega para tela de self-registration
- **E** vê campos: Email, Senha (mín 6 chars), Confirmar Senha, Estaca (texto livre), Ala (texto livre), Papel (dropdown: Bispado, Secretário), Língua (dropdown: pt-BR, en, es), Fuso Horário (auto-detect, editável)
- **E** ao preencher todos os campos e clicar "Criar":
  1. Edge Function `register-first-user` cria ward (com stake_name, name, language, timezone, whatsapp_template default) + user
  2. Usuário logado automaticamente
  3. Redireciona para Home
- **E** se email já existe: erro "Este email já está em uso"
- **E** se combinação estaca+ala já existe: erro "Esta combinação de Estaca e Ala já existe"
- **E** se senha < 6 caracteres: validação impede envio
- **E** se senhas não coincidem: validação impede envio

**Prioridade:** Must have

---

### RF-34: Convidar usuário por link
**Descrição:** O Bispado ou Secretário deve conseguir gerar um link de convite (deep link) para convidar novos usuários à ala.

**Critérios de aceitação:**
- **Dado** que o usuário (Bispado ou Secretário) está na seção Usuários
- **Quando** clica no botão "Convidar"
- **Então** vê formulário com Email (obrigatório) e Papel (dropdown: Bispado, Secretário, Observador)
- **E** ao confirmar: Edge Function `create-invitation` gera token + deep link
- **E** deep link formato: `wardmanager://invite/{token}`
- **E** link copiado para clipboard E/OU abre sheet de compartilhamento do OS
- **E** convite expira em 30 dias
- **E** reenvio permitido: novo convite para mesmo email gera novo token

**Prioridade:** Must have

---

### RF-35: Registrar-se via link de convite
**Descrição:** Um usuário convidado deve conseguir se registrar usando o deep link recebido.

**Critérios de aceitação:**
- **Dado** que o usuário abre o deep link `wardmanager://invite/{token}`
- **Então** vê tela de registro com dados read-only (Estaca, Ala, Papel, Email) e campo editável (Senha, mín 6 chars, Confirmar Senha)
- **E** ao clicar "Criar conta":
  1. Edge Function `register-invited-user` valida token
  2. Se válido: cria user, preenche `used_at`, loga automaticamente, redireciona para Home
- **E** se token expirado: erro "Convite expirado. Solicite um novo convite."
- **E** se token já usado: erro "Este convite já foi utilizado."
- **E** se token inválido/inexistente: erro genérico

**Prioridade:** Must have

---

### RF-36: Reenviar convite
**Descrição:** O Bispado ou Secretário deve conseguir reenviar um convite para o mesmo email.

**Critérios de aceitação:**
- **Dado** que já existe um convite para determinado email
- **Quando** o Bispado/Secretário cria novo convite para o mesmo email
- **Então** novo convite é criado com novo token e nova data de expiração
- **E** convite anterior permanece (se não foi usado, continua válido até expirar)
- **E** novo deep link é gerado e compartilhado

**Prioridade:** Must have

---

### RF-37: Histórico de ações
**Descrição:** O sistema deve manter um log de todas as ações manuais que geram persistência no banco de dados, visível para Bispado e Secretário na aba Configurações.

**Critérios de aceitação:**
- **Dado** que o usuário (Bispado ou Secretário) está na aba Configurações
- **Quando** clica no card "Histórico"
- **Então** navega para tela de histórico com lista de entradas ordenada por data-hora decrescente
- **E** cada entrada exibe: data-hora (fuso da ala), email do usuário, descrição da ação (multilinha)
- **E** campo de busca no topo filtra nos 3 campos (data-hora, email, descrição)
- **E** todas as ações manuais são logadas: membros (CRUD, import CSV), temas (CRUD), coleções (ativar/desativar), tipo de domingo (alterar), discursos (designar, desdesignar, status), usuários (self-register, convite, registro via convite, papel, remoção), configurações (idioma, fuso, template WhatsApp), agenda (editar, atores CRUD)
- **E** ações automáticas NÃO são logadas: auto-atribuição de tipo de domingo, lazy creation, push notifications, registro de token
- **E** histórico é read-only (sem edição/exclusão manual)
- **E** retenção de 2 anos (entradas mais antigas removidas automaticamente)
- **E** Observador NÃO vê o card Histórico

**Prioridade:** Must have

---

### RNF-01: Performance
- Lista de domingos deve carregar em < 2 segundos
- Busca de membros deve filtrar em < 200ms
- Sincronização entre abas deve ocorrer em até 5 segundos

**Justificativa:** Garantir experiência fluida e responsiva.

---

### RNF-02: Usabilidade
- App deve funcionar em modo retrato (one-handed usage)
- Seguir Apple Human Interface Guidelines (HIG)
- Componentes devem ter feedback visual ao toque (press states)
- Textos devem ser legíveis (mínimo 14px)

**Justificativa:** Facilitar uso em dispositivos móveis durante reuniões.

---

### RNF-03: Acessibilidade
- Cores devem ter contraste adequado (WCAG AA)
- Ícones devem ter labels descritivos
- Campos de formulário devem ter labels claros

**Justificativa:** Garantir que todos os usuários possam usar o app.

---

### RNF-04: Dados
- Sincronização em tempo real entre abas (até 5 segundos)
- Isolamento completo de dados entre Alas
- Dados devem ser persistidos no backend (não apenas local)

**Justificativa:** Garantir consistência e segurança dos dados.

---

### RNF-05: Offline
- App deve funcionar sem internet (dados locais)
- Mudanças offline devem sincronizar ao reconectar

**Justificativa:** Igrejas podem ter WiFi instável.

---

### RNF-06: Plataforma
- Suporte a iOS, Android e Web
- Mesma experiência em todas as plataformas

**Justificativa:** Usuários podem usar diferentes dispositivos.

---

### RNF-07: Segurança
- Dados de uma Ala nunca visíveis para outra Ala
- Autenticação de usuários (bispado/secretário)
- Dados criptografados em trânsito e em repouso

**Justificativa:** Proteger privacidade dos membros.

---

### RNF-08: Internacionalização (i18n)
- Suporte total a múltiplos idiomas
- Idioma inicial: **Português (pt-BR)**
- Idiomas planejados: **Inglês (en)**, **Espanhol (es)**
- Sistema deve ser facilmente expansível para novos idiomas
- **Escopo de tradução:**
  - Interface do usuário (botões, labels, placeholders)
  - Mensagens de erro e validação
  - Nomes de status (Não-designado, Designado/Não-Convidado, Designado/Convidado, Designado/Confirmado, Desistiu)
  - Nomes de exceções (Reunião de Testemunho, Conferência Geral, etc)
  - Formatos de data/hora (ex: "08 FEV" em PT, "FEB 08" em EN, "08 FEB" em ES)
- **NÃO traduzido:**
  - Dados inseridos pelo usuário (nomes de membros, títulos de temas da Ala)
- **Coleções Gerais:**
  - Não são traduzidas
  - São específicas de idioma (cada idioma tem suas próprias Coleções)
  - Apenas Coleções Gerais do idioma configurado da Ala são exibidas
- **Seleção de idioma:**
  - Usuário seleciona idioma nas configurações da Ala (aba Configurações)
  - Pode mudar idioma a qualquer momento
  - Ao mudar idioma, apenas Coleções Gerais do novo idioma ficam disponíveis
  - Sistema exibe diálogo de aviso antes de mudar idioma

**Justificativa:** Igreja SUD é global, com membros falando diversos idiomas. Suporte a i18n permite uso do app em diferentes países e regiões.

---

## 4. Regras de Negócio

### RN-01: Auto-atribuição de tipo de domingo
O sistema auto-atribui o tipo de cada domingo ao carregar a lista, persistindo imediatamente no banco. O primeiro domingo de cada mês é marcado como "Reunião de Testemunho" por padrão (exceto Abril e Outubro, onde o 1º é "Conferência Geral" e o 2º é "Reunião de Testemunho"). Demais domingos são marcados como "Discursos". O usuário pode alterar qualquer valor via dropdown no card expandido.

**Justificativa:** Prática padrão na Igreja SUD, com valores auto-atribuídos editáveis.

---

### RN-02: Domingos com exceções não têm discursos
Se um domingo tem exceção selecionada no dropdown (qualquer valor exceto "Discursos"), os campos de discurso **somem** do card expandido. Se o domingo tinha discursantes/temas e o usuário seleciona exceção, um diálogo de confirmação aparece antes de apagar os speeches. Ao mudar de exceção para "Discursos", 3 speeches vazios são criados imediatamente.

**Justificativa:** Eventos especiais não incluem discursos preparados.

---

### RN-03: Cada domingo tem exatamente 3 discursos
Todo domingo (sem exceção) tem **exatamente 3 discursos**:
- 1º Discurso
- 2º Discurso
- 3º Discurso

Cada discurso pode estar em diferentes estados (não designado, convidado, confirmado, etc), mas a estrutura de 3 discursos é fixa.

**Justificativa:** Formato padrão das reuniões sacramentais na Igreja SUD.

---

### RN-04: Um membro pode ter múltiplos discursos
Um mesmo membro pode ser designado para dar discursos em múltiplos domingos diferentes. Não há restrição de frequência ou limite de discursos por membro.

**Justificativa:** Flexibilidade para o bispado gerenciar conforme necessidade da ala.

---

### RN-05: Ciclo de vida de um discurso
Um discurso passa pelos seguintes estados:

1. **Não-designado** (cinza): Nenhum discursante foi selecionado
2. **Designado/Não-Convidado** (amarelo): Discursante foi designado mas ainda não foi convidado via WhatsApp
3. **Designado/Convidado** (amarelo): Convite foi enviado via WhatsApp mas discursante ainda não confirmou
4. **Designado/Confirmado** (verde): Discursante confirmou oficialmente que fará o discurso
5. **Desistiu** (vermelho): Discursante desistiu ou não compareceu

**Transições permitidas:**
- Não-designado → Designado/Não-Convidado (ao selecionar discursante)
- Designado/Não-Convidado → Designado/Convidado (ao enviar convite via WhatsApp)
- Designado/Convidado → Designado/Confirmado (ao confirmar)
- Qualquer estado → Desistiu (se discursante desistir)
- Qualquer estado → Não-designado (ao remover discursante)

**Justificativa:** Refletir o processo real de designação, convite via WhatsApp e confirmação de discursantes.

---

### RN-06: Janela de visualização é 12 meses passados + 12 meses futuros
O sistema deve gerar e mostrar domingos de **12 meses no passado** até **12 meses no futuro** (total de 25 meses). Ao scrollar para o início ou fim da lista, mais 6 meses são carregados dinamicamente.

**Justificativa:** Permitir planejamento antecipado e manter histórico recente acessível.

---

### RN-07: Discursos armazenam nome do discursante como texto (snapshot)
Discursos armazenam o **nome do discursante como texto** (não como referência/ID ao membro). Isso significa que:
- Ao designar um discursante, o nome é copiado para o discurso (snapshot)
- Editar nome do membro **não atualiza** discursos já designados
- Excluir membro **não afeta** discursos (nome preservado)
- Temas também são preservados como texto ao serem excluídos

**Justificativa:** Simplifica gestão de membros e preserva histórico de discursos, mesmo que membros saiam da ala.

---

### RN-08: Sincronização entre abas em até 5 segundos
Mudanças feitas em qualquer aba devem refletir em todas as outras abas em **até 5 segundos**. Isso inclui:
- Criar/editar/excluir membros
- Criar/editar/excluir temas
- Marcar/remover exceções de domingos
- Designar/remover discursantes
- Alterar status de discursos

**Justificativa:** Garantir que o usuário sempre veja informações atualizadas, independente de qual aba está visualizando.

---

### RN-09: Validação de dados obrigatórios
- **Membro:** Nome Completo (obrigatório), Telefone Internacional (obrigatório, formato `+xxyyyyyyyy`)
- **Coleção:** Nome (obrigatório), Tipo (obrigatório: "geral" ou "ala")
- **Tema:** Título (obrigatório), Link (opcional, deve ser URL válida se preenchido), Coleção ID (obrigatório)
- **Exceção:** Motivo (obrigatório, pode ser selecionado de lista ou customizado)
- **Discurso:** Discursante (opcional), Tema (opcional), Status (obrigatório, padrão "não designado")
- **Planilha de Membros:** Todas as linhas devem ter Nome e Telefone preenchidos, sem duplicatas
- **CSV de Coleções/Temas:** Todas as linhas devem ter Coleção e Título preenchidos, Link opcional

**Justificativa:** Garantir integridade dos dados e evitar registros incompletos.

---

### RN-10: Ordenação de listas
- **Membros:** Ordem alfabética (A-Z) por nome
- **Temas dentro de Coleção:** Ordem alfabética (A-Z) por título
- **Temas no modal de seleção:** Ordem alfabética (A-Z) pela string concatenada "Coleção : Título"
- **Coleções:**
  1. "Temas da Ala" (sempre primeiro)
  2. Coleções Gerais ativas (mais recentes primeiro, por data de criação)
  3. Coleções Gerais inativas (mais recentes primeiro, por data de criação)

**Justificativa:** Facilitar localização rápida e organização lógica.

---

### RN-11: Isolamento de dados entre Alas
Dados de uma Ala (membros, temas da Ala, discursos, exceções, ativação de Coleções) **nunca** devem ser visíveis ou acessíveis para outra Ala. Cada Ala opera de forma completamente isolada.

**Exceção:** Coleções Gerais e seus temas são compartilhadas, mas:
- Apenas Coleções Gerais do **mesmo idioma** da Ala são visíveis
- Cada Ala controla individualmente quais Coleções Gerais (do seu idioma) estão ativas
- Ao mudar idioma da Ala, Coleções Gerais do idioma anterior desaparecem e Coleções do novo idioma aparecem

**Justificativa:** Privacidade e segurança dos dados dos membros, com compartilhamento controlado de conteúdo curado pelo administrador, respeitando diferenças de idioma.

---

### RN-12: Push notifications para fluxo de designações
O sistema envia push notifications para bispado e secretário em 5 cenários:
1. **Designação (Case 1):** 5 min após bispado designar, push para secretário (agrupado por domingo)
2. **Lembrete semanal — bispado (Case 2):** Domingo 18:00 (fuso da ala), se faltam designações para próximo domingo
3. **Lembrete semanal — secretário (Case 3):** Domingo 18:00 (fuso da ala), se faltam confirmações para próximo domingo
4. **Confirmação (Case 4):** Imediato ao confirmar discursante, push para secretário e bispado
5. **Desistência (Case 5):** Imediato ao desistir, push para bispado

Observadores NÃO recebem notificações. Notificações são obrigatórias (sem opt-out). Textos traduzidos para o idioma da ala (pt, en, es). Ao tocar, app abre na aba Home. Push suprimido se domingo tem exceção (tipo != "Discursos") nos Cases 1, 2 e 3.

---

### RN-13: Self-registration e convite por link
O sistema permite dois fluxos de criação de usuários:

1. **Self-registration (primeiro usuário):** Qualquer pessoa pode criar a primeira conta de uma ala via tela de self-registration. Ao se registrar, a ala é criada junto com o usuário. O papel pode ser Bispado ou Secretário (sem Observador). A combinação estaca+ala deve ser única no sistema. Campo Estaca é texto livre. Senha mínimo 6 caracteres.

2. **Convite por link (demais usuários):** Bispado ou Secretário gera link de convite com email e papel pré-definidos. Deep link no formato `wardmanager://invite/{token}`. Convite expira em 30 dias. Ao abrir o link, usuário vê dados da ala (read-only) e define apenas a senha. Reenvio de convite para mesmo email é permitido (gera novo token).

**Edge Functions:**
- `register-first-user`: cria ala + primeiro usuário
- `create-invitation`: gera token + deep link
- `register-invited-user`: valida token + cria user
- `list-users`, `update-user-role`, `delete-user`: mantidas

**CLI `create-ward` e Edge Function `create-user` foram REMOVIDAS** — substituídas por self-registration e convite.

**Justificativa:** Eliminar dependência de CLI para criação de alas e de compartilhamento manual de credenciais para novos usuários.

---

### RN-14: Histórico de ações (audit log)
O sistema mantém um log de todas as ações manuais que geram persistência no banco de dados:

1. **Campos por entrada:** data-hora (timestamptz), email do usuário (snapshot), descrição legível da ação (no idioma da ala no momento da ação)
2. **Ações logadas:** Todas as ações que resultam em INSERT, UPDATE ou DELETE no banco, executadas por um usuário humano
3. **Ações NÃO logadas:** Auto-atribuição de tipo de domingo, lazy creation de speeches/agendas, processamento de push notifications, registro de push token
4. **Visibilidade:** Bispado e Secretário (permissão `history:read`). Observador NÃO vê
5. **Read-only:** Entradas nunca são editadas ou apagadas manualmente
6. **Retenção:** 2 anos. Entradas mais antigas removidas automaticamente por job agendado
7. **Busca:** Campo de busca que filtra nos 3 campos (data-hora, email, descrição) — case-insensitive, ignora acentos
8. **Ordenação:** Mais recentes primeiro (created_at DESC)
9. **Descrição:** Texto legível no idioma da ala, pode ser multilinha. Se o idioma da ala mudar, descrições antigas permanecem no idioma original (snapshot)
10. **Log a nível de aplicação:** Gerado pelo frontend ou Edge Function após cada ação, não via triggers de banco

---

## 5. Modelo de Domínio

### 5.1 Entidades

#### Membro
Representa uma pessoa da ala que pode ser designada para dar discursos.

**Atributos:**
- **Nome Completo:** Nome da pessoa (obrigatório)
- **Telefone Internacional:** Número completo no formato `+xxyyyyyyyy` (obrigatório)
  - Exemplo: `+5511987654321` (Brasil), `+12025551234` (EUA)
- **Ala ID:** Identificador da ala à qual o membro pertence (para isolamento de dados)
- **Data de Criação:** Quando o membro foi cadastrado
- **Data de Atualização:** Última modificação

**Comportamentos:**
- Pode ser designado para múltiplos discursos
- Pode ser editado a qualquer momento (alterações salvam automaticamente)
- Ao ser excluído, é removido permanentemente da tabela
- Discursos passados e futuros preservam o nome como texto (snapshot do momento da designação)
- Edição de nome **não atualiza** discursos já designados

---

#### Coleção
Representa um agrupamento de temas. Existem dois tipos: Coleções Gerais (criadas pelo admin, disponíveis para Alas do mesmo idioma) e Coleção da Ala (específica de cada Ala).

**Atributos:**
- **ID:** Identificador único
- **Nome:** Nome da coleção (ex: "Conferência Geral Out/2025", "General Conference Oct/2025", "Temas da Ala")
- **Tipo:** "geral" ou "ala"
- **Idioma:** Código do idioma (pt-BR, en, es) - obrigatório para tipo "geral", NULL para tipo "ala"
- **Ala ID:** Identificador da ala (apenas para tipo "ala", NULL para tipo "geral")
- **Data de Criação:** Quando a coleção foi criada

**Comportamentos:**
- Coleções Gerais (tipo "geral"):
  - Criadas apenas pelo administrador via script CSV
  - Específicas de idioma (cada idioma tem suas próprias Coleções)
  - Visíveis apenas para Alas do mesmo idioma
  - Não podem ser editadas ou excluídas por secretários/bispado
  - Podem ser ativadas/desativadas por cada Ala individualmente
- Coleção da Ala (tipo "ala"):
  - Cada Ala tem exatamente uma Coleção da Ala (nome fixo: "Temas da Ala")
  - Criada automaticamente ao criar Ala
  - Não tem idioma específico (NULL), sempre visível independente do idioma da Ala
  - Temas dentro podem ser criados/editados/excluídos pelo secretário/bispado
  - Pode ser ativada/desativada

---

#### Tema
Representa um assunto que pode ser abordado em discursos. Temas pertencem a Coleções.

**Atributos:**
- **ID:** Identificador único
- **Título:** Nome do tema (obrigatório)
- **Link:** URL com material de referência (opcional)
- **Coleção ID:** Identificador da coleção à qual o tema pertence (obrigatório)
- **Data de Criação:** Quando o tema foi cadastrado
- **Data de Atualização:** Última modificação

**Comportamentos:**
- Temas de Coleções Gerais:
  - Criados apenas pelo administrador via script CSV
  - Não podem ser editados ou excluídos por secretários/bispado
  - Ficam disponíveis para seleção apenas se Coleção estiver ativa para a Ala
- Temas da Coleção da Ala:
  - Podem ser criados/editados/excluídos pelo secretário/bispado
  - Ficam disponíveis para seleção apenas se Coleção "Temas da Ala" estiver ativa
- Ao ser designado para discurso, título e link são copiados como texto (snapshot)
- Ao ser excluído (apenas temas da Ala), discursos passados/futuros preservam título e link

---

#### Domingo
Representa uma data específica que pode ter discursos ou exceções.

**Atributos:**
- **Data:** Data do domingo (YYYY-MM-DD)
- **Ala ID:** Identificador da ala à qual o domingo pertence (para isolamento de dados)
- **Tem Exceção:** Booleano indicando se é um domingo sem discursos
- **Motivo da Exceção:** Se tem exceção, qual o motivo (Reunião de Testemunho, Conferência Geral, etc)

**Comportamentos:**
- Se tem exceção, não pode ter discursos
- Se não tem exceção, deve ter 3 discursos (podem estar não designados)
- Primeiro domingo do mês é automaticamente marcado como "Reunião de Testemunho"

---

#### Discurso
Representa a atribuição de um membro para falar sobre um tema em um domingo específico.

**Atributos:**
- **ID:** Identificador único
- **Domingo:** Referência à data do domingo
- **Ala ID:** Identificador da ala à qual o discurso pertence (para isolamento de dados)
- **Posição:** 1, 2 ou 3 (indica qual dos 3 discursos)
- **Duração:** 5, 10 ou 15 minutos (correspondente à posição)
- **Discursante:** Nome do membro como texto/string (opcional, snapshot do momento da designação)
- **Tema:** Referência ao tema (opcional)
- **Status:** não-designado, designado/não-convidado, designado/convidado, designado/confirmado, desistiu
- **Data de Criação:** Quando o discurso foi criado
- **Data de Atualização:** Última modificação

**Comportamentos:**
- Só pode existir se o domingo não tem exceção
- Ao ser criado, status padrão é "não-designado"
- Ao selecionar discursante, status muda para "designado/não-convidado"
- Status pode ser alterado manualmente pelo usuário
- Discursante é armazenado como texto (não como referência/ID), então exclusão de membro não afeta discursos
- Se tema for excluído, preserva título como texto

---

#### Ala
Representa uma congregação local da Igreja SUD.

**Atributos:**
- **ID:** Identificador único
- **Nome:** Nome da ala (ex: "Ala São Paulo Centro")
- **Estaca:** Nome da estaca à qual a ala pertence (ex: "Estaca São Paulo Norte")
- **Idioma:** Código do idioma configurado (pt-BR, en, es) - determina quais Coleções Gerais estão disponíveis
- **Data de Criação:** Quando a ala foi criada
- **Data de Atualização:** Última modificação

**Comportamentos:**
- Ao ser criada (via self-registration), idioma e fuso horário são definidos pelo primeiro usuário
- Ao ser criada, Coleção da Ala ("Temas da Ala") é criada automaticamente
- Combinação estaca + nome deve ser única no sistema
- Idioma pode ser alterado a qualquer momento pelo usuário
- Ao mudar idioma:
  - Coleções Gerais ativas do idioma anterior são desativadas
  - Coleções Gerais do novo idioma ficam disponíveis (desativadas por padrão)
  - Interface do app muda para o novo idioma
  - Formatos de data/hora adaptam para o novo idioma
- Todos os dados da Ala (membros, temas da Ala, discursos, exceções) são isolados de outras Alas

---

#### Ator da Reunião
Representa uma pessoa que participa da reunião sacramental em papéis específicos (presidir, dirigir, reconhecer presença, pianista, regente). Não necessariamente é membro da ala.

**Atributos:**
- **Nome:** Nome do ator (obrigatório)
- **Ala ID:** Identificador da ala à qual o ator pertence
- **Pode Presidir:** Booleano indicando se pode presidir a reunião
- **Pode Dirigir:** Booleano indicando se pode dirigir a reunião (implica automaticamente "Pode Presidir")
- **Pode Reconhecer:** Booleano indicando se pode ser reconhecido (autoridades visitantes, etc.)
- **Pode Música:** Booleano indicando se pode ser pianista ou regente
- **Data de Criação / Atualização:** Timestamps

**Comportamentos:**
- Atores são cadastrados inline na aba Agenda (ao editar um campo de ator)
- Um ator pode ter múltiplos papéis simultaneamente
- Se "Pode Dirigir" = true, "Pode Presidir" é automaticamente true
- Ao ser deletado: nome preservado como snapshot nas agendas existentes (FK vira NULL)
- Atores são filtrados por papel ao selecionar (ex: campo "Quem preside" mostra apenas atores com "Pode Presidir")

---

#### Hino
Representa um hino do hinário da Igreja, com suporte a múltiplos idiomas.

**Atributos:**
- **Idioma:** Código do idioma (pt-BR, en, es)
- **Número:** Número do hino no hinário (inteiro)
- **Título:** Título do hino
- **É Sacramental:** Booleano indicando se é um hino sacramental (subconjunto)

**Comportamentos:**
- Tabela global (sem ward_id), importada pelo admin via script `import-hymns`
- ~300 hinos por idioma
- Hinos sacramentais são um subconjunto usado apenas no campo "Hino sacramental" da agenda
- Seleção via campo de busca (por número ou título)
- Armazenado como FK na agenda (não snapshot)

---

#### Agenda da Reunião Sacramental
Representa a agenda completa de um domingo, incluindo todos os participantes, hinos e orações.

**Atributos:**
- **Ala ID:** Identificador da ala
- **Data do Domingo:** Data do domingo
- **Boas-vindas:** Quem preside (snapshot + FK ator), quem dirige (snapshot + FK ator), reconhecer presença (array de nomes), anúncios (texto), pianista (snapshot + FK ator), regente (snapshot + FK ator), primeiro hino (FK hino), primeira oração (FK membro + nome)
- **Designações:** Apoios/desobrigações (texto), bênção de bebês (toggle + nomes), confirmação de batismo (toggle + nomes), anúncios da estaca (toggle), hino sacramental (FK hino)
- **Discursos (normal):** Apresentação especial (toggle + descrição), hino intermediário (FK hino)
- **Encerramento:** Hino final (FK hino), última oração (FK membro + nome)
- **Data de Criação / Atualização:** Timestamps

**Comportamentos:**
- Criada automaticamente (lazy creation) ao abrir um domingo na aba Agenda
- Uma agenda por domingo por ala (unique: ward_id + sunday_date)
- Tipo de reunião determinado pela tabela de exceções (normal, testemunho, conferência de ala, primária)
- Discursos vêm da tabela speeches via JOIN por (ward_id, sunday_date)
- Atores armazenados como snapshot (nome) + FK opcional
- Hinos armazenados como FK
- Orações: FK membro + snapshot nome, ou apenas nome customizado (sem FK)
- Agendas passadas são editáveis (sem restrição temporal)
- Todos os campos são opcionais (podem ficar vazios)

---

### 5.2 Relacionamentos

```
Membro (1) ----< (N) Discurso
  - Um membro pode ter múltiplos discursos
  - Discurso armazena NOME do membro como texto (snapshot), não referência/ID
  - Exclusão de membro não afeta discursos

Coleção (1) ----< (N) Tema
  - Uma coleção tem múltiplos temas
  - Um tema pertence a uma coleção
  - Coleções Gerais (tipo "geral") são visíveis para todas as Alas
  - Coleção da Ala (tipo "ala") é visível apenas para a Ala dona

Tema (1) ----< (N) Discurso
  - Um tema pode ser usado em múltiplos discursos
  - Discurso armazena TÍTULO e LINK do tema como texto (snapshot), não referência/ID
  - Exclusão de tema não afeta discursos

Domingo (1) ----< (3) Discurso
  - Um domingo tem exatamente 3 discursos (se não tem exceção)
  - Um discurso pertence a um domingo

Domingo (1) ----< (0..1) Exceção
  - Um domingo pode ter uma exceção
  - Uma exceção pertence a um domingo

Ala (1) ----< (N) Membro
  - Uma ala tem múltiplos membros
  - Um membro pertence a uma ala

Ala (1) ----< (1) Coleção da Ala
  - Uma ala tem exatamente uma Coleção da Ala (nome: "Temas da Ala")
  - Coleção da Ala pertence a uma ala

Ala (N) ----< (N) Coleção Geral (Ativação)
  - Uma ala pode ativar múltiplas Coleções Gerais
  - Uma Coleção Geral pode estar ativa em múltiplas alas
  - Relacionamento muitos-para-muitos via tabela de ativação

Ala (1) ----< (N) Domingo
  - Uma ala tem múltiplos domingos
  - Um domingo pertence a uma ala

Ala (1) ----< (N) Ator da Reunião
  - Uma ala tem múltiplos atores
  - Um ator pertence a uma ala
  - Atores podem ter múltiplos papéis (presidir, dirigir, reconhecer, música)

Ala (1) ----< (N) Agenda
  - Uma ala tem múltiplas agendas (uma por domingo)
  - Uma agenda pertence a uma ala

Domingo (1) ----< (0..1) Agenda
  - Um domingo pode ter uma agenda (lazy creation)
  - Uma agenda pertence a um domingo

Agenda (N) ----< (N) Ator da Reunião
  - Uma agenda referencia múltiplos atores (snapshot + FK)
  - Um ator pode estar em múltiplas agendas

Agenda (N) ----< (N) Hino
  - Uma agenda referencia até 4 hinos (FK)
  - Um hino pode estar em múltiplas agendas

Agenda (N) ----< (N) Membro (orações)
  - Uma agenda pode referenciar membros para orações
  - Também aceita nomes customizados (sem FK)

Ala (1) ----< (N) Convite
  - Uma ala tem múltiplos convites
  - Um convite pertence a uma ala
  - Convite tem token único, email, papel, expiração (30 dias)

Ala (1) ----< (N) Entrada do Histórico
  - Uma ala tem múltiplas entradas de histórico
  - Uma entrada pertence a uma ala
  - Entrada tem data-hora, email do usuário, descrição da ação
  - Read-only, retenção de 2 anos
```

---

## 6. Fluxos de Usuário

### Fluxo 1: Adicionar novo membro manualmente

1. Secretário abre o app
2. Navega para aba "Configurações"
3. Vê card "Membros"
4. Clica no card "Membros"
5. Navega para tela cheia de gerenciamento de membros
6. Vê:
   - Botão voltar (à esquerda)
   - Campo de search (centro)
   - Botão "+" (à direita)
   - Lista de membros existentes (cards recolhidos, ordenados alfabeticamente)
7. Clica no botão "+"
8. Card expandido vazio aparece no topo da lista
9. Vê campos editáveis:
   - Nome Completo (vazio)
   - Código do País (dropdown, padrão: Brasil +55)
   - Telefone (vazio, só aceita números)
10. Preenche "Nome Completo": "João Silva"
11. Seleciona "Código do País": "+55" (Brasil)
12. Preenche "Telefone": "11987654321"
13. Clica fora do card
14. Sistema salva automaticamente como "+5511987654321"
15. Card recolhe e aparece na lista ordenada alfabeticamente
16. Membro agora está disponível para seleção ao designar discursos

**Variações:**
- Se tentar clicar fora sem preencher Nome ou Telefone, diálogo aparece: "Deseja cancelar a adição? Os dados não foram inseridos corretamente."
- Ao confirmar cancelamento, card é removido sem salvar

---

### Fluxo 1.1: Editar membro existente

1. Secretário está na tela de gerenciamento de membros
2. Vê lista de membros (cards recolhidos)
3. Faz swipe para a esquerda no card de "João Silva"
4. Dois botões são revelados: lápis (editar) e lixeira (excluir)
5. Clica no botão lápis
6. Card expande mostrando:
   - Nome Completo: "João Silva" (editável, largura total)
   - Código do País: "🇧🇷 +55" (dropdown com emoji flag)
   - Telefone: "11987654321" (editável, largura total)
7. Altera "Nome Completo" para "João Pedro Silva"
8. Clica fora do card
9. Sistema salva automaticamente (sem botões Salvar/Cancelar)
10. Card recolhe mostrando novo nome
11. Discursos passados e futuros **mantêm** "João Silva" (snapshot)

**Variações:**
- Pode editar apenas um campo (Nome, Código ou Telefone)
- Ao clicar em outro card, card atual recolhe e salva automaticamente
- Se tentar clicar fora com Nome ou Telefone vazio, diálogo aparece: "Erro: Nome e Telefone são obrigatórios. Deseja cancelar a edição?"
- Ao confirmar cancelamento, valores são revertidos para originais

---

### Fluxo 1.2: Excluir membro

1. Secretário está na tela de gerenciamento de membros
2. Faz swipe para a esquerda no card do membro
3. Dois botões são revelados: lápis e lixeira
4. Clica no botão lixeira
5. Sistema verifica se membro está designado para discursos futuros
6. Se membro está designado para 3 discursos futuros, diálogo aparece: "Este membro está designado para 3 discursos futuros. As correções deverão ser feitas manualmente. Deseja continuar?"
7. Clica em "Confirmar"
8. Membro é removido permanentemente da tabela
9. Card desaparece da lista
10. Discursos passados e futuros preservam o nome "João Silva"
11. Membro não aparece mais na lista de discursantes disponíveis

**Variações:**
- Se clicar em "Cancelar", membro não é excluído
- Se membro não está designado para discursos futuros, diálogo simplificado aparece: "Tem certeza que deseja excluir este membro?"

---

### Fluxo 1.3: Sobrescrever lista de membros via planilha

1. Secretário está na aba "Configurações"
2. Vê card "Sobrescrever Lista de Membros" (abaixo do card "Membros")
3. Clica no card para expandir
4. Vê botões "Download" e "Upload"
5. Clica em "Download"
6. Sistema gera arquivo Excel/CSV com 2 colunas:
   - `Nome` (ex: "João Silva")
   - `Telefone Completo` (ex: "+5511987654321")
7. Arquivo contém todos os 50 membros atuais da ala
8. Secretário abre arquivo no Excel/Google Sheets
9. Edita alguns nomes, adiciona 5 novos membros, remove 3 membros
10. Salva arquivo
11. Volta para o app
12. Clica em "Upload"
13. Seleciona arquivo editado
14. Sistema valida:
    - Todas as linhas têm Nome e Telefone preenchidos ✓
    - Telefones estão no formato `+xxyyyyyyyy` ✓
    - Não há duplicatas ✓
15. Validação OK!
16. Sistema **apaga TODOS os 50 membros** atuais da tabela
17. Sistema **insere os 52 membros** da planilha (50 - 3 + 5)
18. Mensagem de sucesso aparece: "Lista de membros atualizada com sucesso"
19. Card recolhe
20. Ao abrir tela de gerenciamento de membros, vê 52 membros

**Variações:**
- Se validação falhar (ex: linha sem telefone), mensagem de erro aparece e **nenhuma alteração** é feita
- Se arquivo tiver formato errado (ex: 3 colunas), validação falha

---

### Fluxo 2: Selecionar tipo de domingo

1. Secretário abre o app
2. Navega para aba "Discursos"
3. Vê lista de domingos com cards contraídos
4. Clica no card do domingo 13 ABR para expandir
5. Card expande mostrando dropdown de tipo no topo (valor auto-atribuído: "Discursos")
6. Abaixo do dropdown, vê os 3 campos de discurso
7. Clica no dropdown
8. Opções: Discursos, Reunião de Testemunho, Conferência Geral, Conferência de Estaca, Conferência de Ala, Apresentação Especial da Primária, Outro
9. Seleciona "Conferência de Estaca"
10. Se havia discursantes/temas, diálogo de confirmação aparece
11. Ao confirmar, speeches deletados; campos de discurso somem
12. Card contraído agora mostra "Conferência de Estaca" em vez dos LEDs
13. Domingo 13 ABR não aparece na aba Agenda (Conf. Estaca não tem agenda)

**Variações:**
- Se selecionar "Outro", diálogo abre para digitar motivo customizado + OK
- Se mudar de exceção de volta para "Discursos", 3 speeches vazios são criados imediatamente
- Auto-atribuição em lote já marcou 1º domingo de Abril como "Conferência Geral" e 2º como "Reunião de Testemunho"

---

### Fluxo 3: Designar discursante e tema

1. Bispo abre o app
2. Navega para aba "Discursos"
3. Vê lista de domingos com discursos (sem exceções)
4. Lista abre automaticamente no próximo domingo (ex: 08 FEV 2026)
5. Próximo domingo aparece no topo da tela (não centralizado)
6. Clica no card do domingo 08 FEV para expandir
7. Card expande mostrando 3 seções:
   - 1º Discurso - LED apagado (cinza), status "Não-designado"
   - 2º Discurso - LED apagado (cinza), status "Não-designado"
   - 3º Discurso - LED apagado (cinza), status "Não-designado"
8. Card scrolla suavemente para ficar totalmente visível
9. Clica no campo "Discursante" do 1º Discurso
10. Modal abre com lista de todos os membros (ordenados alfabeticamente)
11. Seleciona "Maria Santos"
12. Modal fecha
13. Campo "Discursante" agora mostra "Maria Santos"
14. Círculo muda para amarelo, status muda para "Designado/Não-Convidado"
15. Clica no campo "Tema" do 1º Discurso
16. Modal abre com lista de todos os temas + opção "Criar novo tema"
17. Seleciona tema existente "Fé em Jesus Cristo"
18. Modal fecha
19. Campo "Tema" agora mostra "Fé em Jesus Cristo"
20. Designação está completa
21. Secretário fará contato com Maria Santos para convidar

**Variações:**
- Pode designar apenas discursante (sem tema)
- Pode designar apenas tema (sem discursante)
- Ao selecionar "Criar novo tema", modal de criação abre

---

### Fluxo 4: Atualizar status de discurso

1. Secretário abre o app
2. Navega para aba "Discursos"
3. Vê domingo 08 FEV com 1º Discurso designado para "Maria Santos" (círculo amarelo, status "Designado/Convidado")
4. Secretário liga para Maria Santos e ela confirma
5. Clica no card do domingo 08 FEV para expandir
6. Clica no círculo amarelo do 1º Discurso
7. Modal abre com opções de status: Designado/Não-Convidado, Designado/Convidado, Designado/Confirmado, Desistiu
8. Seleciona "Designado/Confirmado"
9. Modal fecha
10. Círculo muda para verde
11. Status mostra "Designado/Confirmado"
12. Mudança reflete imediatamente em todas as visualizações

**Variações:**
- Se Maria desistir, selecionar "Desistiu" (círculo vermelho)

---

### Fluxo 5: Configurar agenda da reunião sacramental

1. Secretário abre o app
2. Navega para aba "Agenda" (segunda tab)
3. Vê lista de domingos com scroll infinito
4. Domingos com Conferência Geral/Estaca/Outro não aparecem
5. Clica no domingo 16 FEV 2026
6. Agenda é criada automaticamente (lazy creation) com todos os campos vazios
7. Formulário mostra 4 seções (reunião normal):

**Seção: Boas-vindas e Anúncios**
8. Clica em "Quem preside"
9. Seletor abre mostrando atores com papel Presidir
10. Não há atores cadastrados — clica "Adicionar novo ator"
11. Preenche: Nome = "Bispo Carlos", Papéis = [Presidir ✓, Dirigir ✓]
12. Ator criado e selecionado automaticamente
13. Clica em "Quem dirige" — seleciona "Bispo Carlos" (tem papel Dirigir)
14. Clica em "Pianista" — adiciona novo ator "Irmã Ana" com papel Música
15. Clica em "Regente" — adiciona novo ator "Irmão Paulo" com papel Música
16. Clica em "Primeiro hino" — digita "123", seleciona "123 — Conta as Bênçãos"
17. Clica em "Primeira oração" — seleciona membro "João Silva" da lista

**Seção: Designações e Sacramento**
18. Preenche "Apoios e desobrigações": "Apoio do novo professor da EFY"
19. Marca "Bênção de recém-nascidos": Sim → digita "Maria Clara da Silva"
20. Marca "Anúncios da Estaca": Não
21. Clica em "Hino sacramental" — vê apenas hinos sacramentais, seleciona "169 — Enquanto o Pão Se Partir"

**Seção: Primeiro e Segundo Discurso**
22. Campo "1º Discurso" mostra "Maria Santos" (da tabela speeches)
23. Campo "2º Discurso" está vazio — clica e seleciona "Pedro Oliveira"
24. Status de Pedro muda para "Designado/Confirmado" na tabela speeches
25. Marca "Apresentação especial": Não
26. Seleciona hino intermediário: "152 — Deus Nos Rege com Amor"

**Seção: Último Discurso**
27. Campo "3º Discurso" mostra "Ana Costa" (da tabela speeches)
28. Seleciona hino final: "136 — Que Firmes Alicerces"
29. Clica em "Última oração" — digita nome customizado "José Visitante" (não é membro)
30. Nome armazenado apenas na agenda deste domingo
31. Agenda salva automaticamente

---

### Fluxo 6: Usar Modo Apresentação no domingo

1. É domingo, 09:30
2. Secretário abre o app
3. Na aba Home, vê botão "Iniciar Reunião Sacramental" no topo
4. Clica no botão
5. Tela full-screen abre com agenda do domingo
6. Vê 4 cards empilhados:
   - **BOAS-VINDAS E ANÚNCIOS** (expandido) — mostra quem preside, dirige, pianista, regente, hino, oração
   - **DESIGNAÇÕES E SACRAMENTO** (contraído no final da tela)
   - **PRIMEIRO E SEGUNDO DISCURSO** (contraído)
   - **ÚLTIMO DISCURSO** (contraído)
7. Após abertura da reunião, clica em "DESIGNAÇÕES E SACRAMENTO"
8. Card anterior contrai (empilha no topo), card clicado expande
9. Vê apoios, bênção, hino sacramental
10. Após sacramento, clica em "PRIMEIRO E SEGUNDO DISCURSO"
11. Card expande mostrando discursantes e hino intermediário
12. Se conteúdo excede espaço: scrolla internamente
13. Ao final, clica em "ÚLTIMO DISCURSO"
14. Vê 3º discursante, hino final e última oração
15. Todos os campos são read-only (nenhuma edição possível)
16. Clica botão fechar para voltar à Home

---

### Fluxo 7: Push notification após designação

1. Bispo abre o app e navega para aba Discursos
2. Expande card do domingo 20 ABR (tipo "Discursos")
3. Designa Maria como 1ª discursante
4. Designa João como 2º discursante (2 minutos depois)
5. Sistema insere 2 entradas na `notification_queue` com send_after = created_at + 5 min
6. 5 minutos após a 1ª designação, Edge Function cron agrupa as 2 designações para o mesmo domingo
7. Push enviado ao Secretário: "Maria e João foram designados para discursar no dia 20 ABR. Hora de fazer o convite!"
8. Secretário recebe a notificação no celular
9. Ao tocar, app abre na aba Home

**Variações:**
- Se bispo designa para domingos diferentes (20 ABR e 27 ABR), pushes separados são enviados
- Se domingo 20 ABR tem exceção "Conferência de Estaca", push é suprimido
- Se designação é desfeita (discurso volta a not_assigned) antes de 5 min, notificação cancelada

---

### Fluxo 8: Lembrete semanal e desistência

1. É domingo, 18:00 (fuso America/Sao_Paulo)
2. Edge Function cron verifica próximo domingo (27 ABR) para todas as alas
3. Ala "São Paulo 1ª" tem domingo 27 ABR com tipo "Discursos"
4. 1º discurso: confirmado, 2º discurso: convidado, 3º discurso: não designado
5. Há discurso(s) não designado(s) → push enviado ao Bispado: "Ainda faltam discursantes a serem designado para domingo que vem!"
6. Há discurso(s) não confirmado(s) → push enviado ao Secretário: "Ainda faltam discursantes a serem designado para domingo que vem!"
7. Na segunda-feira, secretário marca João como "Desistiu"
8. Push imediato ao Bispado: "ATENÇÃO! João NÃO poderá fazer o 2º discurso do dia 27 ABR. Designe outro discursante!"
9. Bispo designa Pedro como substituto
10. 5 min depois, push ao Secretário: "Pedro foi designado para discursar no dia 27 ABR. Hora de fazer o convite!"
11. Secretário confirma Pedro
12. Push imediato a Secretário e Bispado: "Pedro foi confirmado para fazer o 2º discurso do dia 27 ABR."

---

### Fluxo 9: Self-registration do primeiro usuário

1. Novo usuário abre o app pela primeira vez
2. Vê tela de login
3. Clica em "Criar conta para o primeiro usuário de uma Ala"
4. Navega para tela de self-registration
5. Preenche:
   - Email: "bispo@email.com"
   - Senha: "minhaSenha123"
   - Confirmar Senha: "minhaSenha123"
   - Estaca: "Estaca São Paulo Norte"
   - Ala: "Ala Centro"
   - Papel: "Bispado" (dropdown)
   - Língua: "pt-BR" (dropdown)
   - Fuso Horário: "America/Sao_Paulo" (auto-detectado)
6. Clica em "Criar"
7. Edge Function `register-first-user`:
   - Cria ward com stake_name="Estaca São Paulo Norte", name="Ala Centro", language="pt-BR", timezone="America/Sao_Paulo", whatsapp_template=default
   - Cria user com email/senha e app_metadata {ward_id, role: "bishopric"}
8. Usuário logado automaticamente
9. Redireciona para Home
10. Ala está pronta para uso

**Variações:**
- Se email já existe: erro "Este email já está em uso"
- Se combinação "Estaca São Paulo Norte" + "Ala Centro" já existe: erro "Esta combinação de Estaca e Ala já existe"
- Se senha < 6 caracteres: validação impede envio

---

### Fluxo 10: Convidar e registrar novo usuário por link

1. Bispo está na aba Configurações > Usuários
2. Clica no botão "Convidar"
3. Preenche:
   - Email: "secretario@email.com"
   - Papel: "Secretário" (dropdown)
4. Clica em "Confirmar"
5. Edge Function `create-invitation`:
   - Cria convite com token único, ward_id, email, role="secretary", expires_at=created_at+30 dias
   - Retorna deep link: `wardmanager://invite/abc123xyz`
6. Deep link copiado para clipboard / abre sheet de compartilhamento do OS
7. Bispo envia link ao secretário (via WhatsApp, email, etc.)
8. Secretário abre o deep link `wardmanager://invite/abc123xyz` no celular
9. App abre tela de registro por convite mostrando:
   - Estaca: "Estaca São Paulo Norte" (read-only)
   - Ala: "Ala Centro" (read-only)
   - Papel: "Secretário" (read-only)
   - Email: "secretario@email.com" (read-only)
10. Secretário preenche:
    - Senha: "minhaSenha456"
    - Confirmar Senha: "minhaSenha456"
11. Clica em "Criar conta"
12. Edge Function `register-invited-user`:
    - Valida token (existe, não expirado, não usado)
    - Cria user com email/senha e app_metadata {ward_id, role: "secretary"}
    - Preenche used_at no convite
13. Usuário logado automaticamente
14. Redireciona para Home

**Variações:**
- Se token expirado (> 30 dias): erro "Convite expirado. Solicite um novo convite."
- Se token já utilizado (used_at != null): erro "Este convite já foi utilizado."
- Se bispo quer reenviar: cria novo convite para mesmo email (novo token, nova expiração)

---

### Fluxo 11: Consultar histórico de ações

1. Secretário abre o app
2. Navega para aba "Configurações"
3. Vê card "Histórico"
4. Clica no card "Histórico"
5. Navega para tela cheia de histórico
6. Vê:
   - Campo de busca no topo
   - Lista de entradas ordenadas por data-hora (mais recentes primeiro)
7. Cada entrada exibe:
   - "2026-02-14 17:06" (data-hora no fuso da ala)
   - "aloisiojr@gmail.com" (email do usuário)
   - "Designou João Silva para o 1º discurso do dia 08 FEV com o tema 'Fé em Jesus Cristo'" (descrição multilinha)
8. Secretário digita "João" no campo de busca
9. Lista filtra mostrando apenas entradas que contêm "João" em qualquer um dos 3 campos
10. Secretário digita "2026-02-14" no campo de busca
11. Lista filtra mostrando apenas entradas daquela data
12. Secretário não consegue editar nem apagar nenhuma entrada

**Variações:**
- Se busca não encontra resultados: mensagem "Nenhum resultado encontrado"
- Observador não vê o card "Histórico" nas Configurações

---

## 7. Comportamentos Esperados

### 7.1 Scroll inicial na aba Discursos
Ao abrir a aba "Discursos", a lista deve:
- Posicionar automaticamente no **próximo domingo** (primeiro domingo >= hoje)
- Próximo domingo deve aparecer no **topo da tela** (não centralizado)
- Scroll deve ser **instantâneo** (sem animação visível)

**Implementação técnica sugerida:**
- Usar `initialScrollIndex` no FlatList
- Calcular índice do próximo domingo dinamicamente
- Usar `getItemLayout` para altura fixa dos cards (necessário para `initialScrollIndex`)

---

### 7.2 Expansão de card de domingo
Ao clicar em um card de domingo recolhido:
- Card expande mostrando 3 discursos
- Lista scrolla **suavemente** para mostrar o card completo
- Scroll deve ser **animado** (diferente do scroll inicial)

**Implementação técnica sugerida:**
- Usar `scrollToIndex` com `animated: true` ao expandir card
- Usar `viewPosition: 0` para posicionar card no topo

---

### 7.3 Sincronização entre abas
Mudanças em uma aba devem refletir em outras abas:
- **Tempo máximo:** 5 segundos
- **Sem reload manual:** Usuário não deve precisar recarregar página
- **Granularidade:** Apenas dados alterados devem ser atualizados (não recarregar tudo)

**Implementação técnica sugerida:**
- Usar polling (verificar mudanças a cada 2-3 segundos)
- Ou usar WebSockets para push em tempo real

---

### 7.4 Busca de membros em tempo real
Campo de search deve filtrar a lista:
- **A cada tecla digitada** (não apenas ao pressionar Enter)
- **Case-insensitive:** "joão" encontra "João Silva"
- **Ignora acentos:** "joao" encontra "João Silva"
- **Busca parcial:** "silva" encontra "João Silva"

**Implementação técnica sugerida:**
- Usar debounce de 200-300ms para evitar filtrar a cada tecla
- Normalizar strings (remover acentos, converter para minúsculas)

---

### 7.5 Validação de telefone internacional
Campo de telefone deve:
- **Aceitar apenas números** (não aceitar letras ou símbolos)
- **Dropdown de países** com ~195 países ordenados alfabeticamente
- **Armazenar no formato** `+xxyyyyyyyy` (ex: +5511987654321)
- **Exibir no formato** separado: Código País + Telefone

**Implementação técnica sugerida:**
- Usar biblioteca de códigos de país (ex: `react-native-country-picker-modal`)
- Validar formato ao salvar

---

### 7.6 Salvamento automático
Campos editáveis devem salvar automaticamente:
- **Ao clicar fora do card** (blur event)
- **Ao clicar em outro card** (card atual recolhe e salva)
- **Sem botão "Salvar"** explícito

**Validação:**
- Se dados inválidos (Nome ou Telefone vazio), mostrar diálogo de erro
- Oferecer opção de cancelar edição (reverter para valores originais)

---

### 7.7 Isolamento de dados entre Alas
Dados de uma Ala nunca devem ser visíveis para outra:
- **Membros:** Cada Ala vê apenas seus próprios membros
- **Temas:** Cada Ala vê apenas seus próprios temas
- **Discursos:** Cada Ala vê apenas seus próprios domingos e discursos

**Implementação técnica sugerida:**
- Adicionar `ala_id` em todas as tabelas
- Filtrar queries por `ala_id` do usuário logado
- Validar no backend que usuário só acessa dados de sua Ala

---

## 8. Casos Extremos

### 8.1 Membro designado para discurso futuro é excluído
**Cenário:** Secretário exclui membro que está designado para 3 discursos futuros.

**Comportamento esperado:**
1. Sistema detecta que membro está designado para discursos futuros
2. Diálogo aparece: "Este membro está designado para 3 discursos futuros. As correções deverão ser feitas manualmente. Deseja continuar?"
3. Se usuário confirmar:
   - Membro é excluído da tabela
   - Discursos futuros preservam o nome (snapshot)
   - Ao abrir aba Discursos, discursos mostram nome do membro excluído
   - Bispado/secretário deve manualmente redesignar outro membro

---

### 8.2 Planilha de membros com dados inválidos
**Cenário:** Secretário faz upload de planilha com linha sem telefone.

**Comportamento esperado:**
1. Sistema valida planilha antes de aplicar mudanças
2. Detecta linha 5 sem telefone
3. Mensagem de erro aparece: "Erro na linha 5: Telefone é obrigatório. Nenhuma alteração foi feita."
4. Nenhum membro é adicionado, editado ou excluído
5. Usuário corrige planilha e tenta novamente

---

### 8.3 Dois usuários editam mesmo membro simultaneamente
**Cenário:** Bispo e secretário editam nome do mesmo membro ao mesmo tempo.

**Comportamento esperado:**
1. Bispo altera "João Silva" para "João Pedro Silva" e salva
2. Secretário (que ainda vê "João Silva") altera para "João S. Silva" e salva
3. Sistema aceita última edição (secretário)
4. Nome final é "João S. Silva"
5. Edição do bispo é sobrescrita (last write wins)

**Nota:** Conflitos são raros pois apenas um usuário por Ala usa o app por vez.

---

### 8.4 Domingo com discursos recebe exceção via dropdown
**Cenário:** Secretário muda dropdown de "Discursos" para "Conferência de Estaca" no card expandido, mas domingo já tem 2 discursos designados.

**Comportamento esperado:**
1. Diálogo aparece: "Os discursos designados para este domingo serão apagados. Deseja continuar?"
2. Se usuário confirmar:
   - Entries deletadas da tabela `speeches` para aquele (ward_id, sunday_date)
   - Campos de discurso somem do card
   - Card contraído mostra "Conferência de Estaca" em vez dos LEDs
3. Se usuário cancelar:
   - Dropdown volta para "Discursos"
   - Nada é alterado

---

### 8.5 Lista de membros vazia
**Cenário:** Nova Ala sem membros cadastrados.

**Comportamento esperado:**
1. Ao abrir tela de gerenciamento de membros, lista está vazia
2. Mensagem aparece: "Nenhum membro cadastrado. Clique no botão + para adicionar."
3. Ao tentar designar discursante na aba Discursos, modal abre vazio
4. Mensagem aparece: "Nenhum membro disponível. Cadastre membros na aba Configurações."

---

### 8.6 Primeiro domingo do mês cai em feriado
**Cenário:** Primeiro domingo de dezembro é dia 01/12, mas ala não terá reunião (feriado local).

**Comportamento esperado:**
1. Sistema auto-marca 01/12 como "Reunião de Testemunho" (auto-atribuição em lote)
2. Secretário abre aba Discursos, clica no card de 01/12 para expandir
3. Vê dropdown de tipo no topo do card com "Reunião de Testemunho" selecionado
4. Clica no dropdown e altera para "Outro"
5. Diálogo abre para digitar motivo customizado; digita "Feriado local" e clica OK
6. 01/12 agora mostra "Feriado local" no card contraído

---

### 8.7 Membro sem telefone (migração de dados antigos)
**Cenário:** Ala migra de planilha antiga onde telefone não era obrigatório.

**Comportamento esperado:**
1. Sistema não permite importar membros sem telefone
2. Secretário deve preencher telefones antes de fazer upload
3. Se telefone não estiver disponível, usar placeholder (ex: +5500000000000)
4. Secretário pode editar depois para adicionar telefone correto

---

### 8.8 Usuário tenta acessar dados de outra Ala
**Cenário:** Usuário malicioso tenta acessar API com `ala_id` diferente.

**Comportamento esperado:**
1. Backend valida que `ala_id` na requisição corresponde ao `ala_id` do usuário logado
2. Se não corresponder, retorna erro 403 Forbidden
3. Nenhum dado é retornado
4. Log de segurança é criado

---

### 8.9 Ator deletado está em agendas futuras
**Cenário:** Secretário deleta ator "Bispo Carlos" que está como quem preside em 5 agendas futuras.

**Comportamento esperado:**
1. Diálogo de confirmação aparece
2. Se usuário confirmar:
   - Ator removido da lista de atores
   - Nome "Bispo Carlos" permanece nas 5 agendas como snapshot
   - FK do ator vira NULL nas agendas
   - Ator não aparece mais nos seletores de atores

---

### 8.10 Domingo normal vira exceção com agenda preenchida
**Cenário:** Secretário marca domingo 16 FEV como "Conferência de Estaca", mas agenda já estava completamente preenchida.

**Comportamento esperado:**
1. Domingo 16 FEV desaparece da aba Agenda (Conf. Estaca não tem agenda)
2. Dados da agenda permanecem no banco (preservados)
3. Se exceção for removida depois, agenda reaparece com dados intactos

---

### 8.11 Domingo normal vira "Reunião de Testemunho" com agenda normal preenchida
**Cenário:** Secretário marca domingo 16 FEV como "Reunião de Testemunho", mas agenda normal (4 seções com discursos) já estava preenchida.

**Comportamento esperado:**
1. Agenda muda para layout especial (3 seções)
2. Campos de discursos e hino intermediário ficam ocultos
3. Dados preservados no banco (se exceção for removida, voltam a aparecer)

---

### 8.12 Modo Apresentação com agenda vazia
**Cenário:** É domingo e usuário abre Modo Apresentação, mas nenhum campo da agenda foi preenchido.

**Comportamento esperado:**
1. Tela abre normalmente com os 4 cards (ou 3 se especial)
2. Cards exibem campos vazios com placeholders
3. Não bloqueia acesso — agenda parcialmente preenchida é válida

---

### 8.13 Hino removido da tabela referenciado em agenda
**Cenário:** Admin remove hino #123 da tabela de hinos, mas esse hino está em 10 agendas.

**Comportamento esperado:**
1. FK fica NULL nas agendas
2. Campo de hino aparece vazio na agenda
3. Usuário pode selecionar outro hino

---

## 9. Critérios de Sucesso

### 9.1 Eficiência
- Secretário consegue designar 3 discursos para um domingo em **< 2 minutos**
- Secretário consegue cadastrar 50 membros via planilha em **< 1 minuto**

### 9.2 Confiabilidade
- **Zero perda de dados** ao alternar entre abas
- **Zero conflitos** de sincronização em uso normal

### 9.3 Usabilidade
- Usuário consegue usar o app **sem treinamento** (interface intuitiva)
- Usuário consegue operar com **uma mão** (mobile-first)

### 9.4 Performance
- Lista de domingos carrega em **< 2 segundos**
- Sincronização entre abas ocorre em **< 5 segundos**

### 9.5 Segurança
- **Zero vazamento de dados** entre Alas
- **100% dos acessos autenticados** (nenhum acesso anônimo)

---

## 10. Restrições e Premissas

### Restrições
1. App deve funcionar em dispositivos iOS/Android/Web
2. Usuário tem conexão intermitente (igreja pode ter WiFi ruim)
3. Apenas um usuário por Ala usa o app por vez (não há colaboração simultânea)

### Premissas
1. Usuário conhece os membros da ala (não precisa de fotos)
2. Usuário sabe o que é "Reunião de Testemunho" (contexto SUD)
3. Bispado toma decisões de designação, secretário executa no sistema
4. Cada Ala tem telefone de todos os membros disponível

---

## 11. Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React Native + Expo SDK 54, TypeScript, Expo Router (file-based) |
| State Management | TanStack Query (server state), React Context (theme, auth) |
| Backend | Supabase (Auth, PostgREST, Realtime, Edge Functions) |
| Banco de Dados | PostgreSQL com RLS (Row-Level Security) |
| i18n | react-i18next com locales pt-BR, en, es |
| Testes | Vitest (unit, integration, component) |
| Offline | Fila de mutações em AsyncStorage + last-write-wins |
| Push Notifications | Expo Push Notifications (expo-notifications) + Supabase Edge Function |
| Gestos | react-native-gesture-handler + react-native-reanimated |
| Deep Links | expo-linking (para convites por link) |

---

## 12. Modelo de Dados (PostgreSQL)

### 12.1 Tabelas Existentes

#### wards
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | Identificador da ala |
| name | text NOT NULL | Nome da ala |
| stake_name | text NOT NULL | Nome da estaca |
| language | text NOT NULL DEFAULT 'pt-BR' | Idioma (pt-BR, en, es) |
| timezone | text NOT NULL DEFAULT 'America/Sao_Paulo' | Fuso horário IANA da ala (ex: America/New_York) |
| whatsapp_template | text NOT NULL | Template editável para mensagens |
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
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | Ala do membro |
| full_name | text NOT NULL | Nome completo |
| country_code | text NOT NULL | Código do país (ex: "+55") |
| phone | text NOT NULL | Número sem código |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, country_code, phone)`

#### ward_topics
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| title | text NOT NULL | Título do tema |
| link | text NULL | URL opcional |
| created_at / updated_at | timestamptz | |

#### general_collections / general_topics
Coleções globais por idioma, sem ward_id. Importadas via script admin.

#### ward_collection_config
Ponte entre ala e coleções gerais. Campo `active` (boolean) controla ativação.

#### sunday_exceptions
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| date | date NOT NULL | Data do domingo |
| reason | text NOT NULL | Tipo do domingo |

**Unique:** `(ward_id, date)` — **Check:** apenas domingos
**Valores válidos de reason:** `Discursos`, `Reunião de Testemunho`, `Conferência Geral`, `Conferência de Estaca`, `Conferência de Ala`, `Apresentação Especial da Primária`, `Outro`
**Nota:** "Discursos" indica domingo normal com discursos (sem exceção). Todos os domingos possuem uma entrada nesta tabela após a auto-atribuição em lote.
**Nota:** Para reason = "Outro", o campo `reason` contém o texto customizado digitado pelo usuário (ex: "Feriado local").
**Auto-atribuição em lote:** Ao carregar a lista de domingos (aba Discursos ou Home), para cada domingo sem entrada nesta tabela:
- Padrão: `Discursos`
- 1º domingo de Jan, Fev, Mar, Mai, Jun, Jul, Ago, Set, Nov, Dez: `Reunião de Testemunho`
- 1º domingo de Abr e Out: `Conferência Geral`
- 2º domingo de Abr e Out: `Reunião de Testemunho`
- Todos os valores auto-atribuídos são persistidos imediatamente no banco.
- Ao carregar +6 meses (scroll infinito), a auto-atribuição roda para os novos domingos.

#### speeches
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards | |
| sunday_date | date NOT NULL | Data do domingo |
| position | smallint NOT NULL (1,2,3) | 1º, 2º, 3º Discurso |
| member_id | uuid FK→members NULL | Referência ao membro (NULL se removido) |
| speaker_name | text NULL | Snapshot do nome |
| speaker_phone | text NULL | Snapshot do telefone |
| topic_title | text NULL | Snapshot do título do tema |
| topic_link | text NULL | Snapshot do link |
| topic_collection | text NULL | Snapshot da coleção |
| status | text NOT NULL DEFAULT 'not_assigned' | Status do discurso |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, sunday_date, position)`
**Status válidos:** `not_assigned`, `assigned_not_invited`, `assigned_invited`, `assigned_confirmed`, `gave_up`

### 12.2 Snapshot Pattern (ADR-005)

Discursos armazenam `speaker_name`, `speaker_phone`, `topic_title`, `topic_link`, `topic_collection` como texto denormalizado. Exclusão de membro/tema preserva dados históricos. Edição de membro NÃO propaga para discursos existentes (by design).

### 12.3 Tabelas da Agenda

#### meeting_actors
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala |
| name | text NOT NULL | Nome do ator |
| can_preside | boolean NOT NULL DEFAULT false | Pode presidir a reunião |
| can_conduct | boolean NOT NULL DEFAULT false | Pode dirigir a reunião (implica can_preside) |
| can_recognize | boolean NOT NULL DEFAULT false | Pode ser reconhecido (autoridades visitantes, etc.) |
| can_music | boolean NOT NULL DEFAULT false | Pode ser pianista ou regente |
| created_at / updated_at | timestamptz | |

**Índices:** `(ward_id, name)`
**Regra:** Se `can_conduct = true`, `can_preside` é automaticamente `true` (enforced pela aplicação)

#### hymns
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| language | text NOT NULL | Idioma (pt-BR, en, es) |
| number | integer NOT NULL | Número do hino no hinário |
| title | text NOT NULL | Título do hino |
| is_sacramental | boolean NOT NULL DEFAULT false | Se é um hino sacramental |

**Unique:** `(language, number)`
**Índices:** `(language)`, `(language, is_sacramental)`
**Nota:** Tabela global, sem ward_id. Importada via script `import-hymns`. ~300 hinos por idioma.

#### sunday_agendas
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | |
| sunday_date | date NOT NULL | Data do domingo |
| — BOAS-VINDAS E ANÚNCIOS — | | |
| presiding_name | text NULL | Snapshot: nome de quem preside |
| presiding_actor_id | uuid FK→meeting_actors NULL | Ref ao ator (NULL se deletado) |
| conducting_name | text NULL | Snapshot: nome de quem dirige |
| conducting_actor_id | uuid FK→meeting_actors NULL | |
| recognized_names | jsonb NULL | Snapshot: array de nomes reconhecidos |
| announcements | text NULL | Anúncios (texto livre) |
| pianist_name | text NULL | Snapshot: nome do pianista |
| pianist_actor_id | uuid FK→meeting_actors NULL | |
| conductor_name | text NULL | Snapshot: nome do regente |
| conductor_actor_id | uuid FK→meeting_actors NULL | |
| opening_hymn_id | uuid FK→hymns NULL | Primeiro hino |
| opening_prayer_member_id | uuid FK→members NULL | Membro que faz a 1ª oração |
| opening_prayer_name | text NULL | Nome de quem faz a 1ª oração (membro ou customizado) |
| — DESIGNAÇÕES E SACRAMENTO — | | |
| sustaining_releasing | text NULL | Apoios e desobrigações (texto livre) |
| has_baby_blessing | boolean NOT NULL DEFAULT false | Tem bênção de recém-nascidos? |
| baby_blessing_names | text NULL | Nomes dos bebês (texto livre, se has_baby_blessing=true) |
| has_baptism_confirmation | boolean NOT NULL DEFAULT false | Tem confirmação de batismo? |
| baptism_confirmation_names | text NULL | Nomes (texto livre, se has_baptism_confirmation=true) |
| has_stake_announcements | boolean NOT NULL DEFAULT false | Tem anúncios da Estaca? |
| sacrament_hymn_id | uuid FK→hymns NULL | Hino sacramental (subset Sacramental=S) |
| — DISCURSOS (reunião normal) — | | |
| has_special_presentation | boolean NOT NULL DEFAULT false | Tem apresentação especial entre 1º e 2º discurso? |
| special_presentation_description | text NULL | Descrição da apresentação especial |
| intermediate_hymn_id | uuid FK→hymns NULL | Hino intermediário (se has_special_presentation=false) |
| — ENCERRAMENTO — | | |
| closing_hymn_id | uuid FK→hymns NULL | Hino final |
| closing_prayer_member_id | uuid FK→members NULL | Membro que faz a última oração |
| closing_prayer_name | text NULL | Nome de quem faz a última oração (membro ou customizado) |
| created_at / updated_at | timestamptz | |

**Unique:** `(ward_id, sunday_date)`
**Nota:** Os discursos (1º, 2º, 3º) vêm da tabela `speeches` via JOIN por `(ward_id, sunday_date)`.
**Nota:** O tipo de reunião (normal, testemunho, conferência de ala, primária) é determinado pela tabela `sunday_exceptions`.
**Nota:** Atores são armazenados como snapshot (nome) + FK opcional (para lookup). Se o ator for deletado, o nome permanece na agenda.
**Nota:** Hinos são armazenados como FK (referência). Se um hino for removido da tabela, a FK fica NULL.
**Nota:** Orações: se é um membro da ala, `*_member_id` aponta para `members` e `*_name` contém o snapshot do nome. Se é um nome customizado, `*_member_id` é NULL e `*_name` contém o nome digitado.

#### device_push_tokens
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK→auth.users NOT NULL | Usuário dono do dispositivo |
| ward_id | uuid FK→wards NOT NULL | Ala do usuário |
| expo_push_token | text NOT NULL | Token do Expo Push Notifications |
| created_at / updated_at | timestamptz | |

**Unique:** `(user_id, expo_push_token)`
**Nota:** Um usuário pode ter múltiplos dispositivos (tokens). Observadores NÃO registram tokens (não recebem push).
**Nota:** Token atualizado a cada login ou abertura do app. Tokens inválidos removidos automaticamente após falha de envio.

#### notification_queue
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala |
| type | text NOT NULL | Tipo: designation, weekly_assignment, weekly_confirmation, speaker_confirmed, speaker_withdrew |
| sunday_date | date NOT NULL | Domingo relacionado |
| speech_position | smallint NULL | Posição do discurso (1,2,3) — para types speaker_confirmed e speaker_withdrew |
| speaker_name | text NULL | Nome do discursante (snapshot) |
| target_role | text NOT NULL | Destinatário: secretary, bishopric, secretary_and_bishopric |
| status | text NOT NULL DEFAULT 'pending' | pending, sent, cancelled |
| send_after | timestamptz NOT NULL | Momento a partir do qual pode ser enviada |
| created_at | timestamptz | |

**Nota:** Para type=designation: send_after = created_at + 5 min. Notificações do mesmo (ward_id, sunday_date, type=designation) são agrupadas em um único push ao enviar.
**Nota:** Para type=speaker_confirmed e speaker_withdrew: send_after = created_at (envio imediato).
**Nota:** Para type=weekly_assignment e weekly_confirmation: send_after = próximo domingo 18:00 no fuso da ala.
**Nota:** Uma Edge Function agendada (cron, a cada minuto) processa notificações pendentes com send_after <= now().

#### invitations
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala do convite |
| email | text NOT NULL | Email do convidado |
| role | text NOT NULL | Papel: bishopric, secretary, observer |
| token | text NOT NULL UNIQUE | Token único para o deep link |
| expires_at | timestamptz NOT NULL | Data de expiração (created_at + 30 dias) |
| used_at | timestamptz NULL | NULL se não usado; preenchido ao completar registro |
| created_by | uuid FK→auth.users NOT NULL | Quem criou o convite |
| created_at | timestamptz | |

**Nota:** Token gerado aleatoriamente, único no sistema. Deep link: `wardmanager://invite/{token}`.
**Nota:** Convite expira em 30 dias (expires_at = created_at + 30 dias).
**Nota:** Reenvio permitido: novo convite para mesmo email cria novo registro (token diferente).

#### activity_log
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| ward_id | uuid FK→wards NOT NULL | Ala onde a ação ocorreu |
| user_id | uuid FK→auth.users NOT NULL | Usuário que executou a ação |
| user_email | text NOT NULL | Snapshot do email do usuário |
| action_type | text NOT NULL | Tipo da ação (ver lista abaixo) |
| description | text NOT NULL | Descrição legível da ação (no idioma da ala no momento da ação) |
| created_at | timestamptz NOT NULL DEFAULT now() | Data-hora da ação |

**Índices:** `(ward_id, created_at DESC)` para consulta paginada ordenada
**Retenção:** Entradas com mais de 2 anos são removidas automaticamente (cron ou database job)
**Read-only:** Entradas nunca são editadas ou apagadas manualmente. Apenas o job de retenção remove entradas antigas.

**Valores válidos de action_type:**
- `member:create`, `member:update`, `member:delete`, `member:import`
- `topic:create`, `topic:update`, `topic:delete`
- `collection:activate`, `collection:deactivate`
- `sunday_type:change`
- `speech:assign`, `speech:unassign`, `speech:status_change`
- `user:self_register`, `user:invite`, `user:register_via_invite`, `user:role_change`, `user:delete`
- `settings:language`, `settings:timezone`, `settings:whatsapp_template`
- `agenda:edit`
- `actor:create`, `actor:update`, `actor:delete`

**Nota:** Ações automáticas do sistema (auto-atribuição de tipo de domingo, lazy creation, push notifications, registro de token) NÃO são logadas.
**Nota:** Descrição gerada no idioma da ala no momento da ação. Se o idioma mudar, descrições antigas permanecem no idioma original (snapshot).

**Exemplos de descrição (pt-BR):**
- "Adicionou o membro João Silva (+5511987654321)"
- "Designou João Silva para o 1º discurso do dia 08 FEV com o tema 'Fé em Jesus Cristo'"
- "Alterou o status do 1º discurso de João Silva (08 FEV) para 'Confirmado'"
- "Convidou secretario@email.com para a ala como Secretário"
- "Editou a agenda do domingo 16 FEV"

---

## 13. Tabela de Permissões e Modelo de Permissões

### 13.1 Tabela de Permissões

| Permissão | Bispado | Secretário | Observador |
|-----------|---------|------------|------------|
| Designar discursantes/temas | ✅ | ❌ | ❌ |
| Alterar status de discursos | ✅ | ✅ | ❌ |
| Remover designação | ✅ | ❌ | ❌ |
| Gerenciar membros (CRUD) | ✅ | ✅ | ❌ |
| Gerenciar temas da Ala | ✅ | ✅ | ❌ |
| Ativar/desativar Coleções | ✅ | ✅ | ❌ |
| Marcar tipo de domingo (dropdown) | ✅ | ✅ | ❌ (visível, desabilitado) |
| Gerenciar convites WhatsApp | ❌ | ✅ | ❌ |
| Configurar idioma da Ala | ✅ | ✅ | ❌ |
| Gerenciar usuários (CRUD) | ✅ | ❌ | ❌ |
| Convidar usuários (link) | ✅ | ✅ | ❌ |
| Visualizar Histórico | ✅ | ✅ | ❌ |
| Visualizar Home (3 domingos) | ✅ | ✅ | ✅ (read-only) |
| Visualizar aba Discursos | ✅ | ✅ | ✅ (read-only) |
| Acessar aba Configurações | ✅ | ✅ | ❌ |
| Ver "Próximas designações" | ✅ | ❌ | ❌ |
| Ver "Gerenciamento de convites" | ❌ | ✅ | ❌ |
| Alterar tema visual (dark/light) | ✅ | ✅ | Sistema apenas |
| Editar agenda da reunião | ✅ | ✅ | ❌ (read-only) |
| Designar discursante via Agenda | ✅ | ✅ | ❌ |
| Visualizar aba Agenda | ✅ | ✅ | ✅ (read-only) |
| Iniciar Modo Apresentação | ✅ | ✅ | ✅ (read-only) |
| Receber push notifications | ✅ | ✅ | ❌ |

### 13.2 Modelo de Permissões (lib/permissions.ts)

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

## 14. Especificações Visuais e de Interação

### 14.1 Tela de Login

**Título:** "Gerenciador da Reunião Sacramental" (i18n)
**Subtítulo:** "discursos e agenda" (i18n)

**Campos:**
- Email: `textContentType="emailAddress"`, `autoComplete="email"`
- Senha: `textContentType="password"`, `autoComplete="password"`, `secureTextEntry`

**Comportamento:**
- Gerenciadores de senha detectam e preenchem os campos automaticamente
- Login com credenciais inválidas mostra erro: "Email ou senha incorretos"
- Login com credenciais válidas redireciona para Home
- Usuário não autenticado é redirecionado para tela de login
- **Link/botão abaixo do botão Login:** "Criar conta para o primeiro usuário de uma Ala"
  - pt: "Criar conta para o primeiro usuário de uma Ala"
  - en: "Create account for the first user of a Ward"
  - es: "Crear cuenta para el primer usuario de una Ala"
  - Ao clicar: navega para tela de Self-Registration (seção 14.1.1)

### 14.1.1 Tela de Self-Registration

**Campos:**
- Email (obrigatório, formato válido)
- Senha (obrigatório, mínimo 6 caracteres)
- Confirmar Senha (deve ser igual à Senha)
- Estaca (texto livre, obrigatório)
- Ala (texto livre, obrigatório)
- Papel (dropdown: Bispado, Secretário — sem Observador)
- Língua (dropdown: pt-BR, en, es)
- Fuso Horário (auto-detect do device, editável — formato IANA)

**Validações:**
- Email: formato válido, não existe no sistema
- Senha: mínimo 6 caracteres
- Confirmar Senha: deve ser igual à Senha
- Estaca + Ala: combinação não existe no sistema
- Todos os campos obrigatórios preenchidos

**Ao clicar "Criar":**
1. Edge Function `register-first-user` cria ward + user
2. Usuário logado automaticamente
3. Redireciona para Home

### 14.1.2 Tela de Registro por Convite

**Acesso:** Via deep link nativo (Expo): `wardmanager://invite/{token}`

**Campos exibidos (read-only, do convite):**
- Estaca (read-only)
- Ala (read-only)
- Papel (read-only)
- Email (pré-preenchido, read-only)

**Campo editável:**
- Senha (mínimo 6 caracteres)
- Confirmar Senha (deve ser igual à Senha)

**Ao clicar "Criar conta":**
1. Edge Function `register-invited-user` valida token
2. Se válido: cria user, preenche `used_at`, loga automaticamente
3. Se token expirado: erro i18n (Convite expirado)
4. Se token já usado: erro i18n (Convite já utilizado)
5. Redireciona para Home

### 14.2 StatusLED 3D

| Status | Efeito Visual |
|--------|--------------|
| Não-designado | LED apagado (cinza, sem brilho) |
| Designado/Não-Convidado | LED com fading contínuo entre apagado e amarelo |
| Designado/Convidado | LED aceso em amarelo fixo |
| Designado/Confirmado | LED aceso em verde forte |
| Desistiu | LED aceso em vermelho forte |

- Efeito 3D: gradiente radial (centro claro → borda escura)
- Animação de fading: ~2s por ciclo (1s fade-in, 1s fade-out)
- `Reduzir movimento` ativado: LED mostra cor estática sem animação
- Tamanho: 16px (card aberto), 14px (card fechado)
- **Pressable:** abre menu de status ao clicar

### 14.3 DateBlock

- Dia em cima: fonte 26px bold, **zero-padding** (01, 02, ... 09)
- Mês embaixo: 3 letras, fonte ajustada para largura = largura do dia
- Ano (se diferente do atual): ao lado do mês em fonte menor (ex: "fev 27")
- Container: 48px largura, alinhado à esquerda do card
- Margem esquerda equilibrada com margem direita
- Opacidade reduzida para datas passadas
- i18n: mês abreviado no idioma da ala (fev/Feb/feb)

### 14.4 Tema Visual (Dark/Light Mode)

- Seletor com 3 opções: Automático (ícone telefone), Claro (sol), Escuro (lua)
- "Automático" segue tema do sistema operacional em tempo real
- Preferência armazenada em AsyncStorage (por dispositivo)
- Observador usa apenas modo do sistema (sem override manual)
- Contraste WCAG AA em ambos os modos
- LEDs 3D mantêm visibilidade em ambos os modos
- Troca suave entre modos (sem flash branco/preto)
- Se `useColorScheme` retornar `null`: fallback para light com log

### 14.5 Gerenciamento de Usuários

- Card "Usuários" visível apenas para **Bispado** (permissão `settings:users`)
- Secretário e Observador NÃO veem o card
- **Nota:** Secretário pode convidar usuários via botão "Convidar" visível em outro local (permissão `invitation:create`)

**Lista de Usuários:**
- Lista todos os usuários da ala com email e papel, ordenados por data de criação
- Card expandível mostrando email (read-only), seletor de papel, botão "Remover"
- Próprio usuário: seletor de papel desabilitado, botão remover oculto

**Convidar Usuário:**
- **Botão "Convidar"** substitui o formulário de criar usuário diretamente
  - pt: "Convidar"
  - en: "Invite"
  - es: "Invitar"
- Ao clicar: formulário com Email (obrigatório) e Papel (dropdown: Bispado/Secretário/Observador)
- Ao confirmar: Edge Function `create-invitation` gera token + deep link
- Deep link copiado para clipboard E/OU abre sheet de compartilhamento do OS
- Deep link formato: `wardmanager://invite/{token}`
- Expiração: 30 dias
- Reenvio permitido: novo convite para mesmo email gera novo token
- Quem pode convidar: Bispado e Secretário (permissão `invitation:create`)

**Editar Papel:**
- Seletor de papel: altera via Edge Function `update-user-role`
- NÃO pode alterar próprio papel
- Ao alterar último Bispado: aviso especial

**Remover Usuário:**
- Diálogo de confirmação: "Remover [email]?"
- NÃO pode remover a si mesmo
- Remoção via Edge Function `delete-user` (hard delete)
- Usuário removido logado em outro dispositivo: 401 no próximo request

### 14.6 Logout com Confirmação

- Botão "Sair" com ícone e cor de erro
- Ao clicar: **diálogo de confirmação** com título "Sair" e mensagem "Deseja realmente sair?"
- Botão "Confirmar/Sair" (destrutivo) executa logout e redireciona para login
- Botão "Cancelar" fecha diálogo, usuário permanece logado
- Diálogo internacionalizado (i18n)

### 14.7 Template WhatsApp

- Editor com preview em tempo real
- Placeholders: {nome}, {data}, {posição}, {duração}, {coleção}, {título}, {link}
- Template salvo por ala
- Acessível a Bispado e Secretário

### 14.8 Tabs do App

**Ordem atualizada:** Home, **Agenda**, Discursos, Configurações (4 tabs)

### 14.9 Push Notifications — Textos i18n

**Case 1 — Designação (1 discursante):**
| Idioma | Texto |
|--------|-------|
| pt | `{nome} foi designado para discursar no dia {data}. Hora de fazer o convite!` |
| en | `{name} has been assigned to speak on {date}. Time to send the invitation!` |
| es | `{nombre} fue designado para hablar el día {fecha}. ¡Hora de enviar la invitación!` |

**Case 1 — Designação (múltiplos, mesmo domingo):**
| Idioma | Texto |
|--------|-------|
| pt | `{nome1}, {nome2} e {nome3} foram designados para discursar no dia {data}. Hora de fazer o convite!` |
| en | `{name1}, {name2} and {name3} have been assigned to speak on {date}. Time to send the invitation!` |
| es | `{nombre1}, {nombre2} y {nombre3} fueron designados para hablar el día {fecha}. ¡Hora de enviar la invitación!` |

**Cases 2 e 3 — Lembrete semanal:**
| Idioma | Texto |
|--------|-------|
| pt | `Ainda faltam discursantes a serem designado para domingo que vem!` |
| en | `There are still speakers to be assigned for next Sunday!` |
| es | `¡Aún faltan discursantes por designar para el próximo domingo!` |

**Case 4 — Confirmação:**
| Idioma | Texto |
|--------|-------|
| pt | `{nome} foi confirmado para fazer o {1º/2º/3º} discurso do dia {data}.` |
| en | `{name} has been confirmed to give the {1st/2nd/3rd} speech on {date}.` |
| es | `{nombre} fue confirmado para dar el {1er/2do/3er} discurso del día {fecha}.` |

**Case 5 — Desistência:**
| Idioma | Texto |
|--------|-------|
| pt | `ATENÇÃO! {nome} NÃO poderá fazer o {1º/2º/3º} discurso do dia {data}. Designe outro discursante!` |
| en | `ATTENTION! {name} will NOT be able to give the {1st/2nd/3rd} speech on {date}. Assign another speaker!` |
| es | `¡ATENCIÓN! {nombre} NO podrá dar el {1er/2do/3er} discurso del día {fecha}. ¡Designe otro discursante!` |

### 14.10 Self-Registration e Convite — Textos i18n

**Botão na Login (link self-registration):**
| Idioma | Texto |
|--------|-------|
| pt | `Criar conta para o primeiro usuário de uma Ala` |
| en | `Create account for the first user of a Ward` |
| es | `Crear cuenta para el primer usuario de una Ala` |

**Botão Convidar:**
| Idioma | Texto |
|--------|-------|
| pt | `Convidar` |
| en | `Invite` |
| es | `Invitar` |

**Erro: Convite expirado:**
| Idioma | Texto |
|--------|-------|
| pt | `Convite expirado. Solicite um novo convite.` |
| en | `Invitation expired. Request a new invitation.` |
| es | `Invitación expirada. Solicite una nueva invitación.` |

**Erro: Convite já usado:**
| Idioma | Texto |
|--------|-------|
| pt | `Este convite já foi utilizado.` |
| en | `This invitation has already been used.` |
| es | `Esta invitación ya fue utilizada.` |

**Erro: Estaca+Ala já existe:**
| Idioma | Texto |
|--------|-------|
| pt | `Esta combinação de Estaca e Ala já existe.` |
| en | `This Stake and Ward combination already exists.` |
| es | `Esta combinación de Estaca y Ala ya existe.` |

### 14.11 Histórico

- Card "Histórico" na aba Configurações, visível para Bispado e Secretário
- Observador NÃO vê o card
- Ao clicar: navega para tela cheia de histórico

**Layout da Tela:**
- Campo de busca no topo (filtra nos 3 campos: data-hora, email, descrição)
- Lista de entradas ordenada por data-hora decrescente (mais recentes primeiro)
- Scroll infinito ou paginado
- Cada entrada exibe:
  - Data-hora (formato: YYYY-MM-DD HH:MM, no fuso da ala)
  - Email do usuário que executou a ação
  - Descrição da ação (pode ser multilinha)
- Read-only: sem botões de editar/apagar

---

## 15. User Stories Consolidadas

### 15.1 Membros (US-001 a US-006)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-001 | Secretário | acessar tela de gerenciamento de membros com busca e listagem | manter cadastro atualizado |
| US-002 | Secretário | buscar membros com filtro em tempo real | encontrar membro rapidamente |
| US-003 | Secretário | adicionar membro (nome + telefone) | membro fique disponível para designação |
| US-004 | Secretário | editar membro com salvamento automático ao fechar card | manter dados atualizados |
| US-005 | Secretário | excluir membro via swipe-to-reveal | lista de discursantes atualizada |
| US-006 | Secretário | download/upload de planilha CSV em mobile e web | edição em massa |

### 15.2 Temas (US-007 a US-009)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-007 | Secretário | gerenciar Coleções de temas com toggle | controlar temas disponíveis |
| US-008 | Secretário | CRUD de temas da Ala com auto-save e swipe | temas personalizados |
| US-009 | Admin | importar Coleções Gerais via CSV | temas curados para todas as alas |

### 15.3 Exceções (US-010 a US-011)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-010 | Secretário | configurar idioma da Ala | interface e coleções no idioma correto |
| US-011 | Secretário | selecionar tipo de domingo via dropdown no card expandido (Discursos/Home) com auto-atribuição em lote | domingos especiais configurados sem tela separada |

### 15.4 Discursos (US-012 a US-016)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-012 | Bispado | visualizar domingos com discursos, próximo domingo no topo | visão consolidada |
| US-013 | Bispado | designar discursante e tema com setas de dropdown | membros saibam o que falar |
| US-014 | Secretário | alterar status clicando no LED ou no texto | bispado acompanhe progresso |
| US-015 | Bispado | remover designação | redesignar outro membro |
| US-016 | Bispado | scroll infinito sem lista sumir | acesso a histórico |

### 15.5 Home (US-017 a US-020)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-017 | Qualquer | sincronização entre abas em < 5s | informações atualizadas |
| US-018 | Qualquer | ver 3 próximos domingos na Home com cards estáveis | visão rápida |
| US-019 | Bispado | ver próximas designações pendentes | saber onde agir |
| US-020 | Secretário | gerenciar convites via WhatsApp | convites eficientes |

### 15.6 Segurança e Config (US-021 a US-024)

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-021 | Qualquer | isolamento de dados entre Alas | privacidade |
| US-022 | Qualquer | autenticação com papéis e suporte a password managers | acesso controlado |
| US-023 | Bispado | listar, editar papel e remover usuários; convidar usuários por link | gerenciar acesso |
| US-024 | Secretário/Bispado | editar template WhatsApp | personalizar convites |

### 15.7 User Stories Adicionais

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-CR001 | Qualquer | LEDs 3D com efeito de profundidade | identifique status intuitivamente |
| US-CR002 | Qualquer | dark/light mode com detecção do sistema | conforto visual |
| US-CR006 | Qualquer | LED piscando no status Não-Convidado | saiba quais precisam de convite |
| US-CR008 | Qualquer | labels "1º Discurso" sem duração | leitura mais natural |
| US-CR020 | Secretário | selecionar tipo de domingo via dropdown no card expandido | configurar exceções sem tela separada |
| US-CR023 | Qualquer | confirmação ao clicar em Sair | não saia acidentalmente |
| US-CR024 | Qualquer | nome correto do app na tela de login | saiba o propósito do app |

### 15.8 Agenda e Modo Apresentação

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-AGD-001 | Secretário | configurar a agenda completa de um domingo na aba Agenda | a reunião sacramental esteja organizada |
| US-AGD-002 | Secretário | designar discursantes diretamente pela aba Agenda | não precisar alternar entre abas |
| US-AGD-003 | Secretário | cadastrar e gerenciar atores da reunião inline | selecioná-los rapidamente em futuros domingos |
| US-AGD-004 | Secretário | selecionar hinos por número ou título | encontrar o hino rapidamente |
| US-AGD-005 | Secretário | definir quem faz as orações (membro da ala ou nome avulso) | oração designada sem cadastrar visitantes |
| US-AGD-006 | Qualquer | abrir o Modo Apresentação no domingo | acompanhar a reunião em tempo real |
| US-AGD-007 | Qualquer | navegar entre seções da reunião no Modo Apresentação | ver cada parte da reunião de forma clara |
| US-AGD-008 | Secretário | preencher a agenda de reunião especial (testemunho/primária) | reuniões sem discurso tenham agenda também |
| US-AGD-009 | Admin | importar hinário completo via CSV por idioma | hinos estejam disponíveis para todas as alas |

### 15.9 Push Notifications

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-PN-001 | Secretário | receber push 5 min após designação (agrupado por domingo) | possa convidar o discursante rapidamente |
| US-PN-002 | Bispado | receber lembrete domingo 18h se faltam designações para o próximo domingo | designe discursantes a tempo |
| US-PN-003 | Secretário | receber lembrete domingo 18h se faltam confirmações para o próximo domingo | convide/confirme discursantes a tempo |
| US-PN-004 | Secretário/Bispado | receber push imediato quando discursante confirma | saiba que o discurso está garantido |
| US-PN-005 | Bispado | receber push imediato quando discursante desiste | designe substituto imediatamente |
| US-PN-006 | Bispado/Secretário | configurar fuso horário da ala | notificações agendadas cheguem no horário correto |

### 15.10 Self-Registration e Convite por Link

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-REG-001 | Novo usuário | criar conta como primeiro usuário de uma ala (self-registration) | começar a usar o app sem depender de CLI |
| US-REG-002 | Bispado/Secretário | gerar link de convite para novos usuários | novos usuários possam se registrar com segurança |
| US-REG-003 | Usuário convidado | me registrar usando um link de convite recebido | acessar a ala com o papel correto |
| US-REG-004 | Bispado/Secretário | reenviar convite para o mesmo email | usuário receba novo link caso o anterior tenha expirado |

### 15.11 Histórico

| ID | Como | Quero | Para que |
|----|------|-------|----------|
| US-HIST-001 | Bispado/Secretário | visualizar o histórico de todas as ações da ala com busca | acompanhar quem fez o quê e quando |
| US-HIST-002 | Bispado/Secretário | buscar no histórico por data, email ou descrição | encontrar uma ação específica rapidamente |

---

## 16. Acceptance Criteria Consolidados

### 16.1 Membros

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-001 | usuário na aba Configurações | clica no card Membros | navega para tela com busca e listagem ordenada alfabeticamente |
| AC-002 | na tela de membros | digita no campo de search | filtra em tempo real (≤300ms), case-insensitive, ignorando acentos |
| AC-003 | na tela de membros | clica '+', preenche dados, clica fora | membro salvo automaticamente com telefone +xxyyyyyyyy |
| AC-004 | adicionando membro | clica fora sem preencher Nome ou Telefone | diálogo de confirmação de cancelamento |
| AC-005 | card de membro expandido | altera nome e clica fora | mudanças salvas automaticamente, sem botões Salvar/Cancelar |
| AC-006 | editando membro | tenta fechar com Nome ou Telefone vazio | diálogo de erro, reverte para originais |
| AC-007 | membro com 3 discursos futuros | clica deletar (via swipe) | diálogo informa discursos futuros; confirma → exclui, snapshots preservados |
| AC-008 | membro sem discursos futuros | clica deletar (via swipe) | diálogo simples de confirmação |

### 16.2 CSV

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-009 | na tela de import/export | clica Download | CSV gerado com Nome e Telefone; mobile usa sheet de compartilhamento |
| AC-010 | na tela de import/export | upload de CSV válido | substitui todos os membros, mensagem de sucesso |
| AC-011 | na tela de import/export | upload de CSV inválido | nenhuma alteração, erro com linha/campo |

### 16.3 Temas e Coleções

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-012 | na seção Temas | visualiza coleções | Temas da Ala primeiro, Gerais ativas (recentes), Gerais inativas |
| AC-013 | coleção geral desativada | marca checkbox | ativada, temas disponíveis para seleção |
| AC-014 | coleção ativa com temas em discursos futuros | desmarca | diálogo avisa; confirma → desativada, snapshots preservados |
| AC-015 | Temas da Ala expandida | preenche título e clica fora | tema salvo automaticamente, sem botões Salvar/Cancelar |
| AC-016 | tema existente | altera título e clica fora | mudanças salvas automaticamente |
| AC-017 | card de tema via swipe | clica lixeira e confirma | tema removido, snapshots preservados |
| AC-044 | tema em discursos futuros | clica remover (via swipe) | diálogo informa quantidade; confirma → removido |

### 16.4 Tipo de Domingo (Exceções)

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-020 | card de domingo expandido (Discursos ou Home) | seleciona exceção no dropdown | tipo salvo no banco; campos de discurso somem; card contraído mostra texto da exceção |
| AC-021 | lista de domingos carregada | domingos sem entrada na tabela | auto-atribuição em lote: "Discursos" para maioria; 1º dom de Jan-Mar,Mai-Set,Nov-Dez → "Reunião de Testemunho"; 1º dom Abr/Out → "Conferência Geral"; 2º dom Abr/Out → "Reunião de Testemunho"; todos persistidos |
| AC-022 | dropdown com exceção selecionada | usuário muda para "Discursos" | entrada atualizada; 3 speeches vazios criados imediatamente; campos de discurso aparecem |
| AC-022b | domingo com discursantes/temas | usuário seleciona exceção | diálogo confirma apagamento; ao confirmar: speeches deletados; ao cancelar: dropdown volta |
| AC-022c | dropdown | usuário seleciona "Outro" | diálogo abre para digitar motivo customizado + OK; ao confirmar: salva; ao cancelar: dropdown volta |
| AC-022d | Observador expande card | vê dropdown | dropdown visível mas desabilitado (read-only) |

### 16.5 Discursos

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-023 | navega para aba Discursos | lista renderizada | domingos de 12 meses passados a 12 futuros; próximo domingo no topo, sem animação; cada domingo com DateBlock (zero-padded) e 3 LEDs 3D |
| AC-024 | Bispado clica campo Discursante | modal abre | membros ordenados; ao selecionar, nome exibido, status muda para amarelo, campo com seta dropdown |
| AC-025 | Bispado clica campo Tema | modal abre | temas de coleções ativas, formato "Coleção : Título", campo com seta dropdown |
| AC-026 | discurso com discursante designado | clica no LED ou no texto do status | modal com opções de status; LED muda de cor |
| AC-027 | discurso com discursante | clica X e confirma | discursante removido, status volta para não-designado (LED apagado), tema permanece |
| AC-028 | scroll até final da lista | atinge limite | +6 meses futuros carregados suavemente, sem desaparecer |
| AC-029 | scroll até início da lista | atinge limite | +6 meses passados carregados suavemente |

### 16.6 Home

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-031 | abre aba Home | seção próximos 3 domingos | 3 cards com DateBlock à esquerda e LEDs 3D à direita; header fixo ao expandir; auto-scroll para visibilidade |
| AC-032 | Bispado expande card | card expandido | pode designar discursantes/temas e alterar status |
| AC-033 | Secretário expande card | card expandido | pode apenas alterar status |
| AC-034 | Observador expande card | card expandido | somente visualiza |
| AC-035 | Bispado, todos 9 discursos designados | Home renderizada | seção "Próximas designações" com próximo domingo pendente |
| AC-036 | todas designações resolvidas | Home atualiza | seção desaparece |
| AC-037 | Secretário na Home | seção de convites | lista de Não-Convidado e Convidado, ordenados por data |
| AC-038 | item Não-Convidado | clica ação | abre WhatsApp, status → Convidado |
| AC-039 | item Convidado | clica ação | opções: WhatsApp, Confirmado, Desistiu |

### 16.7 Sincronização e Segurança

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-030 | mudança em qualquer aba | navega para outra | mudança refletida em < 5 segundos |
| AC-040 | usuário autenticado | requisição ao backend | filtrado por ward_id; cross-ward → 403 + log |
| AC-041 | usuário não autenticado | acessa qualquer tela | redirecionado para login |
| AC-042 | Bispado/Secretário em Configurações > Usuários | preenche email e papel, clica Convidar | convite gerado com deep link; link copiado/compartilhado |
| AC-043 | Bispado/Secretário em Template WhatsApp | edita e salva | template customizado usado nos próximos convites |

### 16.8 Dark/Light Mode

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-CR002-1 | sistema em dark mode, app em Auto | abre app | interface em dark mode |
| AC-CR002-2 | sistema em light mode, app em Auto | abre app | interface em light mode |
| AC-CR002-3 | na aba Configurações | vê seletor de tema | 3 opções: Automático, Claro, Escuro |
| AC-CR002-4 | seleciona Escuro | seleção salva | muda imediatamente para dark mode; persiste entre sessões |
| AC-CR002-5 | seleciona Automático | sistema alterna | interface acompanha em tempo real |

### 16.9 StatusLED

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-CR001-1 | status Não-designado | LED renderizado | LED apagado (cinza, sem brilho) |
| AC-CR006-1 | status Não-Convidado | LED renderizado | LED fading contínuo entre apagado e amarelo |
| AC-CR006-2 | status Convidado | LED renderizado | LED amarelo fixo com efeito 3D |
| AC-CR001-4 | status Confirmado | LED renderizado | LED verde forte com efeito 3D |
| AC-CR001-5 | status Desistiu | LED renderizado | LED vermelho forte com efeito 3D |
| AC-CR006-3 | Reduzir movimento ativado | LED Não-Convidado | amarelo estático sem fading |

### 16.10 Logout

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-CR023-1 | na aba Configurações | clica Sair | diálogo "Deseja realmente sair?" |
| AC-CR023-2 | diálogo aberto | clica Confirmar | logout executado, redireciona para login |
| AC-CR023-3 | diálogo aberto | clica Cancelar | diálogo fecha, permanece logado |

### 16.11 Login

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-CR024-1 | tela de login em pt-BR | renderizada | título: "Gerenciador da Reunião Sacramental", subtítulo: "discursos e agenda" |
| AC-CR025-1 | gerenciador de senhas ativo (iOS) | abre login | teclado mostra sugestão de preenchimento |
| AC-CR025-2 | gerenciador de senhas ativo (Android) | abre login | sistema oferece preenchimento |

### 16.12 Aba Agenda

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-AGD-001 | usuário navega para aba Agenda | lista renderizada | scroll infinito com domingos (12 meses passados + 12 futuros); domingos com Conf. Geral/Estaca/Outro NÃO aparecem |
| AC-AGD-002 | clica em um domingo na aba Agenda | formulário abre | agenda criada automaticamente (lazy creation) com todos os campos vazios |
| AC-AGD-003 | formulário de agenda (reunião normal) | seções visíveis | 4 seções: Boas-vindas, Designações/Sacramento, Primeiro e Segundo Discurso, Último Discurso |
| AC-AGD-004 | formulário de agenda (reunião especial) | seções visíveis | 3 seções: Boas-vindas, Designações/Sacramento, Reunião Especial; tipo de reunião exibido automaticamente |
| AC-AGD-005 | clica no campo "Quem preside" | seletor abre | lista de atores com papel Presidir (inclui Dirigir); opção adicionar novo; opção deletar |
| AC-AGD-006 | adiciona novo ator inline | preenche nome e papéis | ator criado, selecionado no campo, disponível em futuros domingos |
| AC-AGD-007 | deleta ator que está em agenda existente | confirma exclusão | ator removido da lista; nome permanece como snapshot nas agendas |
| AC-AGD-008 | clica no campo "Reconhecer presença" | seletor abre | multi-select com atores de papel Reconhecer; pode marcar/desmarcar múltiplos |
| AC-AGD-009 | clica no campo "Primeiro hino" | seletor abre | campo de busca por número ou título; lista "Número — Título" ordenada por número |
| AC-AGD-010 | clica no campo "Hino sacramental" | seletor abre | mostra APENAS hinos com Sacramental=S; busca por número ou título |
| AC-AGD-011 | clica no campo "Primeira oração" | seletor abre | lista de membros da ala + campo "Nome diferente" para nome customizado |
| AC-AGD-012 | seleciona nome customizado na oração | digita nome e confirma | nome salvo na agenda; NÃO persistido em membros nem atores |
| AC-AGD-013 | campo 1º Discurso sem designação | clica no campo | abre seletor de membros; ao selecionar, atualiza tabela speeches com status assigned_confirmed |
| AC-AGD-014 | Secretário designa discursante pela Agenda | seleciona membro | speeches.status = assigned_confirmed; sincroniza com aba Discursos |
| AC-AGD-015 | marca "Apresentação especial" = sim | toggle ativado | campo de descrição aparece; hino intermediário oculto |
| AC-AGD-016 | marca "Apresentação especial" = não | toggle desativado | campo de hino intermediário aparece; descrição oculto |
| AC-AGD-017 | Observador abre aba Agenda | formulário renderizado | todos os campos read-only (desabilitados) |
| AC-AGD-018 | edita agenda de domingo passado | altera campos | salva normalmente (sem restrição temporal) |

### 16.13 Modo Apresentação

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-AGD-019 | é domingo | abre aba Home | botão "Iniciar Reunião Sacramental" visível no topo |
| AC-AGD-020 | NÃO é domingo | abre aba Home | botão NÃO visível |
| AC-AGD-021 | clica "Iniciar Reunião" | tela abre | full-screen com agenda do domingo; seção Boas-vindas expandida; demais contraídas |
| AC-AGD-022 | Modo Apresentação (reunião normal) | tela renderizada | 4 cards: Boas-vindas, Designações, Discursos 1+2, Último Discurso |
| AC-AGD-023 | Modo Apresentação (reunião especial) | tela renderizada | 3 cards: Boas-vindas, Designações, Reunião Especial |
| AC-AGD-024 | clica em card contraído | card clicado | anterior contrai, clicado expande; cards contraídos sempre visíveis |
| AC-AGD-025 | conteúdo do card expandido excede espaço | card renderizado | scroll interno no card; cards contraídos permanecem visíveis |
| AC-AGD-026 | qualquer campo no Modo Apresentação | tenta interagir | campos read-only, nenhuma edição permitida |

### 16.14 Hinos e Script

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-AGD-027 | admin executa import-hymns | CSV válido (Língua,Número,Título,Sacramental) | hinos importados para o idioma especificado |
| AC-AGD-028 | import-hymns com CSV inválido | executa script | erro detalhado com linha/campo; nenhum hino importado |
| AC-AGD-029 | import-hymns com idioma existente | executa script | hinos substituídos para aquele idioma (upsert) |

### 16.15 Exceção: Apresentação da Primária

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-AGD-030 | tela de exceções | dropdown de motivo | nova opção "Apresentação Especial da Primária" disponível |
| AC-AGD-031 | domingo marcado como "Apresentação Especial da Primária" | abre agenda | formulário mostra layout de reunião especial (3 seções); tipo auto-preenchido |

### 16.16 Push Notifications

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-PN-001 | Bispado designa discursante | 5 min se passam sem outra designação para o mesmo domingo | push enviado ao Secretário com nome do discursante e data |
| AC-PN-002 | Bispado designa 3 discursantes para o mesmo domingo em 2 min | 5 min se passam desde a primeira designação | um único push agrupado enviado ao Secretário com os 3 nomes |
| AC-PN-003 | Bispado designa discursantes para domingos diferentes em 2 min | 5 min se passam | pushes separados para cada domingo |
| AC-PN-004 | domingo 18:00 (fuso da ala) | próximo domingo tem tipo "Discursos" com discurso(s) not_assigned | push enviado a todos do Bispado |
| AC-PN-005 | domingo 18:00 (fuso da ala) | próximo domingo tem tipo "Discursos" com discurso(s) não confirmados | push enviado ao Secretário |
| AC-PN-006 | domingo 18:00 (fuso da ala) | próximo domingo tem exceção (tipo != "Discursos") | NENHUM push enviado (Cases 2 e 3 suprimidos) |
| AC-PN-007 | status de discurso muda para assigned_confirmed | imediatamente | push enviado a Secretário e Bispado com nome, ordinal e data |
| AC-PN-008 | status de discurso muda para desistiu | imediatamente | push enviado ao Bispado com nome, ordinal e data (texto de urgência) |
| AC-PN-009 | usuário faz login ou abre o app | dispositivo registra token | expo_push_token salvo em device_push_tokens |
| AC-PN-010 | Observador faz login | dispositivo NÃO registra token | nenhum push será recebido |
| AC-PN-011 | usuário toca em qualquer notificação | app abre | navega para aba Home |
| AC-PN-012 | idioma da ala = pt-BR | push enviado | texto em português |
| AC-PN-013 | idioma da ala = en | push enviado | texto em inglês |
| AC-PN-014 | idioma da ala = es | push enviado | texto em espanhol |

### 16.17 Self-Registration e Convite por Link

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-REG-001 | tela de login | clica "Criar conta para o primeiro usuário de uma Ala" | navega para tela de self-registration |
| AC-REG-002 | tela de self-registration | preenche todos os campos válidos e clica Criar | ala criada + usuário criado + logado automaticamente + redireciona para Home |
| AC-REG-003 | tela de self-registration | combinação estaca+ala já existe | erro "Esta combinação de Estaca e Ala já existe" |
| AC-REG-004 | tela de self-registration | email já existe no sistema | erro "Este email já está em uso" |
| AC-REG-005 | tela de self-registration | senha com menos de 6 caracteres | validação impede envio |
| AC-REG-006 | tela de self-registration | senhas não coincidem | validação impede envio |
| AC-REG-007 | Bispado/Secretário em Usuários | clica Convidar, preenche email e papel | convite criado; deep link gerado e copiado/compartilhado |
| AC-REG-008 | deep link wardmanager://invite/{token} | usuário abre | tela de registro por convite com dados read-only (estaca, ala, papel, email) |
| AC-REG-009 | tela de registro por convite | preenche senha válida e clica Criar conta | usuário criado + used_at preenchido + logado + redireciona para Home |
| AC-REG-010 | tela de registro por convite | token expirado (> 30 dias) | erro "Convite expirado. Solicite um novo convite." |
| AC-REG-011 | tela de registro por convite | token já utilizado (used_at != null) | erro "Este convite já foi utilizado." |
| AC-REG-012 | Bispado/Secretário | reenvia convite para email existente | novo convite criado com novo token; convite anterior permanece (se não usado) |

### 16.18 Histórico

| ID | Dado | Quando | Então |
|----|------|--------|-------|
| AC-HIST-001 | Bispado/Secretário na aba Configurações | vê cards | card "Histórico" visível |
| AC-HIST-002 | Observador na aba Configurações | vê cards | card "Histórico" NÃO visível |
| AC-HIST-003 | clica no card Histórico | tela abre | lista de entradas ordenada por data-hora decrescente (mais recentes primeiro) |
| AC-HIST-004 | na tela de histórico | digita no campo de busca | filtra em tempo real nos 3 campos (data-hora, email, descrição); case-insensitive, ignora acentos |
| AC-HIST-005 | qualquer ação que gera persistência no banco | ação executada | entrada criada no activity_log com data-hora, email do usuário, descrição legível |
| AC-HIST-006 | ação automática do sistema (auto-atribuição, lazy creation) | ação executada | NENHUMA entrada criada no activity_log |
| AC-HIST-007 | entrada no histórico com descrição longa | renderizada | descrição exibida em múltiplas linhas (sem truncamento) |
| AC-HIST-008 | entrada no histórico | tenta editar ou apagar | não há controles de edição/exclusão (read-only) |
| AC-HIST-009 | entrada com mais de 2 anos | job de retenção executa | entrada removida automaticamente |

---

## 17. Edge Cases Adicionais

| ID | Caso | Comportamento Esperado |
|----|------|----------------------|
| EC-CR003-1 | Bispado tenta remover a si mesmo | Ação bloqueada (botão oculto) |
| EC-CR003-2 | Último Bispado alterado | Aviso especial antes de confirmar |
| EC-CR003-3 | Bispado tenta alterar próprio papel | Seletor desabilitado |
| EC-CR003-4 | Usuário removido enquanto logado | Próxima ação falha; redireciona para login |
| EC-CR003-5 | Email já existente | Erro "Este email já está em uso" |
| EC-CR003-6 | Remover/editar usuário offline | Erro "Requer conexão"; ação NÃO enfileirada |
| EC-CR010-1 | Lista não carregou quando scroll tentado | Aguardar carregamento; mostrar skeleton |
| EC-CR011-1 | Scroll rápido ultrapassa dados carregados | Loading no final sem remover conteúdo |
| EC-CR011-2 | Erro de rede ao carregar mais meses | Mensagem de erro discreta; dados preservados |
| EC-CR013-1 | Swipe acidental durante scroll vertical | Threshold mínimo horizontal |
| EC-CR014-1 | Nome limpo e clica fora | Diálogo de erro; valor revertido |
| EC-CR014-2 | Salvamento automático falha | Mensagem de erro; dados mantidos no form |
| EC-CR019-1 | Usuário muda valor auto-atribuído | Alteração manual respeitada e persistida; auto-atribuição NÃO reaplica (entrada já existe) |
| EC-CR022-1 | useColorScheme retorna null | Fallback para light com log |
| EC-AGD-001 | Ator deletado com agendas futuras | Snapshot preservado; nome permanece, FK vira NULL |
| EC-AGD-002 | Membro usado em oração e deletado | Nome permanece na agenda como snapshot |
| EC-AGD-003 | Hino removido da tabela hymns | FK fica NULL; campo de hino aparece vazio na agenda |
| EC-AGD-004 | Domingo normal vira exceção com agenda preenchida | Agenda permanece no banco mas domingo some da lista da aba Agenda |
| EC-AGD-005 | Domingo normal vira "Reunião de Testemunho" com agenda normal | Agenda muda para layout especial; campos de discursos ocultos mas dados preservados |
| EC-AGD-006 | Modo Apresentação com agenda vazia | Exibe cards com campos vazios / placeholders; não bloqueia acesso |
| EC-AGD-007 | can_conduct=true mas can_preside=false no banco | Aplicação corrige: can_preside=true automaticamente |
| EC-AGD-008 | Import-hymns com número de hino duplicado | Upsert: atualiza título/sacramental do hino existente |
| EC-AGD-009 | Secretário designa pela Agenda e Bispado muda pela aba Discursos | Aba Discursos prevalece (last-write-wins); Agenda reflete estado atual |
| EC-AGD-010 | Domingo com agenda configurada deixa de ser exceção | Agenda muda para layout normal; campos de discursos reaparecem com dados |
| EC-PN-001 | Push token expirado ou inválido | Expo retorna erro; token removido de device_push_tokens automaticamente |
| EC-PN-002 | Usuário sem dispositivo registrado (nenhum token) | Notificação simplesmente não é enviada; sem erro |
| EC-PN-003 | Designação feita e desfeita dentro de 5 min | Se discurso volta a not_assigned antes do envio, notificação do Case 1 cancelada (status=cancelled) |
| EC-PN-004 | Domingo muda de "Discursos" para exceção antes de domingo 18h | Notificações semanais (Cases 2/3) suprimidas para esse domingo |
| EC-PN-005 | App offline quando push deveria registrar token | Token registrado na próxima abertura do app com conexão |
| EC-PN-006 | Múltiplos dispositivos do mesmo usuário | Push enviado para TODOS os dispositivos registrados |
| EC-PN-007 | Fuso horário da ala não configurado | Usa default: America/Sao_Paulo |
| EC-REG-001 | Self-registration com email já existente | Erro "Este email já está em uso" |
| EC-REG-002 | Self-registration com combinação estaca+ala já existente | Erro "Esta combinação de Estaca e Ala já existe" |
| EC-REG-003 | Convite expirado (> 30 dias) | Erro "Convite expirado. Solicite um novo convite." |
| EC-REG-004 | Convite já utilizado | Erro "Este convite já foi utilizado." |
| EC-REG-005 | Reenvio de convite para mesmo email | Novo convite criado com novo token; anterior permanece |
| EC-REG-006 | Deep link com token inválido/inexistente | Erro genérico "Convite inválido." |
| EC-REG-007 | Self-registration offline | Erro "Requer conexão"; ação NÃO enfileirada |
| EC-REG-008 | Registro por convite offline | Erro "Requer conexão"; ação NÃO enfileirada |
| EC-HIST-001 | Histórico com muitas entradas (milhares) | Paginação/scroll infinito; performance aceitável via índice (ward_id, created_at DESC) |
| EC-HIST-002 | Busca no histórico sem resultados | Mensagem "Nenhum resultado encontrado" |
| EC-HIST-003 | Ação executada offline | Log criado quando a mutação for sincronizada com o servidor (não no momento offline) |
| EC-HIST-004 | Idioma da ala muda após ações logadas | Descrições antigas permanecem no idioma original (snapshot); novas ações usam o novo idioma |
| EC-HIST-005 | Job de retenção executado | Entradas com created_at < now() - 2 anos são removidas; entradas mais recentes intactas |

---

## 18. Assumptions (Decisões de Projeto)

### 18.1 Decisões de Domínio

| ID | Assumption |
|----|------------|
| ASM-001 | Status "Realizado" é resquício e NÃO será implementado |
| ASM-004/005 | Temas em discursos são snapshot (texto), não referência |
| ASM-006 | Autenticação apenas email/senha. Sem OAuth/Google |
| ASM-007 | Criação de Alas via self-registration do primeiro usuário. Sem CLI |
| ASM-008 | Demais usuários convidados por link (deep link) pelo Bispado ou Secretário |
| ASM-009 | Secretário NÃO designa em nenhuma tela (exceto aba Agenda) |
| ASM-010 | Template WhatsApp editável, com default traduzido por idioma |
| ASM-011 | Discursos criados via lazy creation |
| ASM-012 | Formato de arquivo para membros: CSV (não Excel nativo) |
| ASM-013 | Conflitos offline: last-write-wins com timestamp |
| ASM-014 | Observador sem aba Configurações mas com Home e Discursos (read-only) |
| ASM-017 | Máximo 1 Bispo, 1 Primeiro Conselheiro, 1 Segundo Conselheiro, 1 Secretário, múltiplos Observadores |
| ASM-018 | Padrão de código de país: pelo idioma da ala (+55 pt-BR, +1 en, +52 es) |

### 18.2 Decisões Adicionais

| ID | Assumption |
|----|------------|
| ASM-CR001-1 | Efeito 3D via gradiente radial CSS/RN, sem imagens |
| ASM-CR001-2 | Fading: ~2s por ciclo (1s in, 1s out) |
| ASM-CR002-1 | Preferência de tema: AsyncStorage local, não sincronizada no backend |
| ASM-CR003-1 | Edição de usuário: apenas papel. Email/senha NÃO editáveis |
| ASM-CR003-2 | Remoção de usuário: hard delete do Supabase Auth |
| ASM-CR003-3 | 6 Edge Functions: register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user |
| ASM-CR004-2 | Largura do mês = container com largura fixa, centralizados |
| ASM-CR008-1 | Caractere ordinal: "º" (U+00BA) |
| ASM-CR014-1 | Bandeiras como emoji flags, não imagens |
| ASM-CR016-1 | Download mobile: expo-file-system + expo-sharing |
| ASM-CR016-2 | Upload mobile: expo-document-picker |
| ASM-CR024-1 | "Scaramental" corrigido para "Sacramental" |

### 18.3 Decisões da Agenda

| ID | Assumption |
|----|------------|
| ASM-AGD-001 | Aba Agenda é a segunda tab (Home, Agenda, Discursos, Config) |
| ASM-AGD-002 | Bispado + Secretário editam a agenda; Observador read-only |
| ASM-AGD-003 | Na aba Agenda, AMBOS (Bispado e Secretário) podem designar discursantes. Exceção à regra geral |
| ASM-AGD-004 | Ao designar discursante pela Agenda, status = assigned_confirmed automaticamente |
| ASM-AGD-005 | Tema do discurso NÃO é visível nem editável na aba Agenda |
| ASM-AGD-006 | Tipo de reunião (normal/testemunho/conferência de ala/primária) determinado pela tabela sunday_exceptions |
| ASM-AGD-007 | "Apresentação Especial da Primária" e "Conferência de Ala" são tipos de exceção no dropdown |
| ASM-AGD-008 | Reunião de Testemunho, Conferência de Ala e Apresentação da Primária usam mesmo layout de agenda (3 seções) |
| ASM-AGD-009 | Atores são snapshot (nome) + FK opcional; hinos são FK puro |
| ASM-AGD-010 | Orações aceitam membro da ala (FK + snapshot) OU nome customizado (texto puro, sem persistir) |
| ASM-AGD-011 | Nenhum campo da agenda é obrigatório — todos podem ficar vazios |
| ASM-AGD-012 | Modo Apresentação é 100% read-only (nenhuma edição) |
| ASM-AGD-013 | Botão "Iniciar Reunião" visível apenas no domingo (00:00-23:59), para todos os papéis |
| ASM-AGD-014 | Modo Apresentação usa layout acordeão com 1 card expandido e todos os contraídos sempre visíveis |
| ASM-AGD-015 | Tabela de hinos é global (sem ward_id), ~300 por idioma, importada via script import-hymns |
| ASM-AGD-016 | Script import-hymns: CSV com colunas Língua,Número,Título,Sacramental(S/N); upsert por (language, number) |
| ASM-AGD-017 | Agendas passadas são editáveis sem restrição |
| ASM-AGD-018 | Domingos com Conf. Geral, Conf. Estaca, ou Outro NÃO aparecem na aba Agenda |
| ASM-CR026-1 | Dropdown de tipo de domingo fica no topo do card expandido, nas abas Discursos e Home |
| ASM-CR026-2 | Auto-atribuição em lote ao carregar lista; todos os valores persistidos (inclusive "Discursos") |
| ASM-CR026-3 | "Outro" abre diálogo para digitar motivo customizado + OK |
| ASM-CR026-4 | "Conferência de Ala" é um tipo de exceção com reunião sacramental em formato especial |
| ASM-CR026-5 | Seção "Domingos sem Discursos" removida da aba Configurações |

### 18.4 Push Notifications

| ID | Assumption |
|----|------------|
| ASM-PN-001 | Push notifications via Expo Push Notifications (expo-notifications) |
| ASM-PN-002 | Observadores NÃO recebem notificações |
| ASM-PN-003 | Notificações são obrigatórias — sem opt-out individual |
| ASM-PN-004 | Ao tocar em qualquer notificação, app abre na aba Home |
| ASM-PN-005 | Case 1 (designação): delay de 5 min com agrupamento por domingo; domingos diferentes geram pushes separados |
| ASM-PN-006 | Cases 2 e 3 (lembrete semanal): todo domingo às 18:00 no fuso da ala; suprimidos se próximo domingo tem exceção |
| ASM-PN-007 | Cases 4 e 5 (confirmação/desistência): envio imediato |
| ASM-PN-008 | Textos traduzidos para 3 idiomas (pt, en, es) conforme idioma da ala |
| ASM-PN-009 | Fuso horário da ala: configuração manual (campo timezone na tabela wards) |
| ASM-PN-010 | Token de push registrado a cada login/abertura do app |
| ASM-PN-011 | Edge Function agendada (cron) processa fila de notificações a cada minuto |

### 18.5 Self-Registration e Convite por Link

| ID | Assumption |
|----|------------|
| ASM-REG-001 | Primeiro usuário de uma ala cria a ala via self-registration (sem CLI) |
| ASM-REG-002 | Papel do primeiro usuário: escolhe entre Bispado ou Secretário (sem Observador) |
| ASM-REG-003 | Campo Estaca: texto livre (sem validação contra base externa) |
| ASM-REG-004 | Convite por link: deep link nativo via expo-linking (wardmanager://invite/{token}) |
| ASM-REG-005 | Expiração do convite: 30 dias a partir da criação |
| ASM-REG-006 | Quem pode convidar: Bispado e Secretário (permissão invitation:create) |
| ASM-REG-007 | Senha: mínimo 6 caracteres, sem restrições extras |
| ASM-REG-008 | Reenvio de convite: permitido (novo token para mesmo email) |
| ASM-REG-009 | CLI create-ward removido — substituído por self-registration |
| ASM-REG-010 | Edge Function create-user removida — substituída por create-invitation + register-invited-user |

### 18.6 Histórico

| ID | Assumption |
|----|------------|
| ASM-HIST-001 | Histórico é read-only — entradas nunca são editadas ou apagadas manualmente |
| ASM-HIST-002 | Retenção de 2 anos — entradas mais antigas removidas automaticamente |
| ASM-HIST-003 | Visível para Bispado e Secretário; Observador não vê |
| ASM-HIST-004 | Busca funciona nos 3 campos: data-hora, email, descrição |
| ASM-HIST-005 | Descrição no idioma da ala no momento da ação (snapshot) |
| ASM-HIST-006 | Ações automáticas do sistema NÃO são logadas |
| ASM-HIST-007 | Descrição pode ser multilinha para acomodar ações complexas |
| ASM-HIST-008 | Ordenação: mais recentes primeiro (created_at DESC) |
| ASM-HIST-009 | Log é gerado a nível de aplicação (frontend/Edge Function), não via trigger de banco |

---

## 19. Open Questions — Todas Resolvidas

| ID | Pergunta | Decisão |
|----|----------|---------|
| OQ-001 | Método de autenticação | Email/senha apenas |
| OQ-002 | Fluxo de criação de Ala | Self-registration do primeiro usuário |
| OQ-003 | Como convidar usuários | Bispado/Secretário gera link de convite (deep link); usuário se registra via link |
| OQ-004 | Secretário designa? | NÃO, apenas Bispado (exceção: aba Agenda) |
| OQ-005 | Estratégia de conflito offline | Last-write-wins com timestamp |
| OQ-006 | Upload sobrescreve sem aviso? | Sim, sobrescrita total |
| OQ-007 | Template WhatsApp | Editável pelo Bispado/Secretário |
| OQ-008 | Quando status muda ao clicar WhatsApp | Ao clicar (antes de enviar) |
| OQ-009 | Quem pode remover designação | Apenas Bispado |
| OQ-010 | Limite de membros | Sem limite rígido; otimizado para 500 |
| OQ-011 | Backups | Automáticos diários, retenção 30 dias |
| OQ-012 | Aviso ao excluir tema designado | Diálogo com quantidade de discursos futuros |
| OQ-CR002-1 | Onde Observador configura tema | Usa modo do sistema (sem override) |
| OQ-CR002-2 | Alerts nativos seguem qual tema | Tema do sistema (padrão) |
| OQ-CR003-1 | Bispado pode editar senha de outro | NÃO, apenas recriação (remove + cria) |
| OQ-CR004-1 | Ano em domingo de ano diferente | Ao lado do mês ("fev 27") |
| OQ-CR008-1 | Caractere ordinal em português | Unicode U+00BA |
| OQ-CR015-1 | Seletor de país | Dropdown inline com scroll |
| OQ-CR024-1 | Título em inglês | "Sacrament Meeting Manager" |

---

## 20. Data Contracts

### 20.1 Inputs

- **Membro:** `{ nome_completo: string, telefone_internacional: "+xxyyyyyyyy" }`
- **Tema da Ala:** `{ titulo: string (obrigatório), link: string|null }`
- **Exceção:** `{ data: date (domingo), motivo: enum|string }`
- **Designação:** `{ domingo_data, posição: 1|2|3, snapshot de nome/tema }`
- **Status:** `{ status: enum dos 5 status }`
- **CSV Membros:** `colunas [Nome, Telefone Completo]`
- **CSV Coleções (admin):** `colunas [Idioma, Coleção, Título, Link]`
- **Idioma:** `{ idioma: 'pt-BR'|'en'|'es' }`
- **Ator da Reunião:** `{ nome: string, can_preside: bool, can_conduct: bool, can_recognize: bool, can_music: bool }`
- **Agenda:** `{ sunday_date, campos de boas-vindas, sacramento, discursos, encerramento }`
- **CSV Hinos (admin):** `colunas [Língua, Número, Título, Sacramental(S/N)]`
- **Push Token:** `{ expo_push_token: string }`
- **Timezone:** `{ timezone: string (IANA) }`
- **Self-Registration:** `{ email: string, password: string, stake_name: string, ward_name: string, role: 'bishopric'|'secretary', language: string, timezone: string }`
- **Criar Convite:** `{ email: string, role: 'bishopric'|'secretary'|'observer' }`
- **Registro por Convite:** `{ token: string, password: string }`

### 20.2 Outputs

- Lista de Membros: `[{ id, nome, código_país, telefone, data_criação }]`
- Lista de Domingos: `[{ data, exceção, discursos: [{ posição, speaker, tema, status }] }]`
- Lista de Coleções: `[{ id, nome, tipo, idioma, ativa, temas }]`
- CSV de Membros: download
- Convites Pendentes: `[{ data, posição, discursante, telefone, tema, status }]`
- Link WhatsApp: `wa.me/...?text=...`
- Agenda de Domingo: `{ sunday_date, presiding, conducting, recognized[], announcements, pianist, conductor, hymns, prayers, speeches[], special_meeting_type }`
- Lista de Hinos: `[{ language, number, title, is_sacramental }]`
- Lista de Atores: `[{ id, name, can_preside, can_conduct, can_recognize, can_music }]`
- Push Notification: `{ title: string, body: string, data: { screen: 'home' } }`
- Deep Link de Convite: `wardmanager://invite/{token}`
- Dados do Convite (para tela de registro): `{ stake_name: string, ward_name: string, role: string, email: string, expired: boolean, used: boolean }`
- Histórico (Activity Log): `[{ id: uuid, user_email: string, action_type: string, description: string, created_at: timestamptz }]` — ordenado por created_at DESC, filtrado por ward_id

---

## 21. Definition of Done

- Todos os requisitos Must have implementados e funcionais
- Cada AC (AC-001 a AC-044 + ACs adicionais + ACs AGD) com pelo menos 1 teste automatizado
- Todos os edge cases (EC-001 a EC-016 + ECs adicionais + ECs AGD) testados
- App funciona em iOS, Android e Web
- Autenticação com 3 papéis e permissões corretas
- Isolamento de dados validado (RLS)
- i18n para pt-BR, en, es
- Dark/light mode funcional com contraste WCAG AA
- Sincronização entre abas < 5s
- Lista de domingos carrega em < 2s
- Textos ≥ 14px
- Offline básico funcional
- Cobertura de testes ≥ 80% para lógica de negócio
- Zero vulnerabilidades críticas (OWASP Top 10)
- Aba Agenda funcional: formulário de agenda, seletores de ator/hino/oração, designação de discursante
- Modo Apresentação: layout acordeão read-only com navegação entre seções
- Tabela de hinos importada via script import-hymns
- Tipo de exceção "Apresentação Especial da Primária" funcional
- Push notifications funcionais: 5 casos (designação, lembrete semanal x2, confirmação, desistência) com textos i18n
- Registro de token de push ao login/abertura do app
- Edge Function de cron processando fila de notificações
- Fuso horário configurável por ala
- Self-registration funcional: tela de self-registration cria ala + primeiro usuário
- Convite por link funcional: gerar convite, deep link, tela de registro por convite
- Tabela invitations com token, expiração e controle de uso
- Tabela wards com stake_name e unique constraint (stake_name, name)
- 6 Edge Functions de usuário operacionais (register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user)
- Deep link scheme wardmanager://invite/{token} configurado
- Textos i18n para self-registration e convite em pt, en, es
- Histórico funcional: tela read-only com lista de ações logadas, busca nos 3 campos
- Tabela activity_log com índice (ward_id, created_at DESC)
- Todas as ações manuais que geram persistência logadas no activity_log
- Ações automáticas (auto-atribuição, lazy creation) NÃO logadas
- Retenção de 2 anos com remoção automática de entradas antigas
- Permissão history:read restrita a Bispado e Secretário

---

## 22. Itens Pendentes de Implementação

Os seguintes itens ainda não foram implementados:

| Item | Descrição | Status |
|------|-----------|--------|
| Auto-scroll Home | Auto-scroll para card expandido ficar visível na tela Home | Pendente |
| Gerenciar usuários | Secretário reporta não ver opção de gerenciar usuários (comportamento esperado se não é Bispado; investigar se é bug real de extração de papel) | Pendente |
| Dropdown código | Clicar no campo de código internacional fecha o card do membro | Pendente |
| Botão Sair | Botão "Sair" nas Configurações não faz nada | Pendente |

---

## 23. Requisitos Não-Funcionais Detalhados (Complemento)

### 23.1 Segurança (Detalhado)

- Autenticação obrigatória (nenhum acesso anônimo)
- Isolamento por ward_id via RLS no PostgreSQL
- Tentativa cross-ward: 403 + log de segurança
- TLS em trânsito; dados criptografados em repouso
- Permissões por papel no frontend (UI condicional) e backend (RLS)
- Edge Functions validam papel e ward_id do chamador
- Self-registration apenas para primeiro usuário de uma ala (cria ala + usuário)
- Demais usuários via convite por link gerado pelo Bispado ou Secretário

### 23.2 UX (Detalhado)

- Mobile-first: modo retrato, operável com uma mão
- Feedback visual ao toque (press states)
- Textos ≥ 14px
- Contraste WCAG AA em dark e light mode
- Ícones com labels descritivos para acessibilidade
- Salvamento automático (sem botões Salvar explícitos)
- Swipe-to-reveal para ações destrutivas
- Scroll inicial instantâneo; expansão de card suave
- i18n: interface, mensagens, status, exceções traduzidos

### 23.3 Offline (Detalhado)

- App detecta perda de conexão e mostra banner "Offline"
- Mutações enfileiradas em AsyncStorage
- UI atualiza otimisticamente
- Reconexão: fila processada FIFO, last-write-wins
- Operações de usuário (Edge Functions) NÃO funcionam offline
- Limite de 100 mutações na fila

### 23.4 Observabilidade

- Logs de segurança para acesso cross-ward
- Logs de erro para falhas de validação
- Métricas: latência API (p95 < 2s), taxa de erro (< 1%)
- Nomes, telefones e senhas NUNCA em logs

---

## 24. Glossário

**Ala:** Congregação local da Igreja SUD (~200-400 membros). Equivalente a uma paróquia em outras denominações.

**Bispado:** Liderança da ala composta por 3 pessoas: Bispo (líder principal) + Primeiro Conselheiro + Segundo Conselheiro. Responsáveis por decisões administrativas e espirituais.

**Estaca:** Grupo de ~8-12 alas em uma região geográfica. Equivalente a uma diocese em outras denominações.

**Reunião de Testemunho:** Reunião especial realizada no primeiro domingo de cada mês onde membros compartilham testemunhos espontâneos. Não há discursos preparados nesta reunião.

**Conferência Geral:** Evento semestral (abril e outubro) transmitido mundialmente onde líderes da Igreja falam. Alas locais não têm reuniões sacramentais nestes domingos.

**Conferência de Estaca:** Evento trimestral onde todas as alas de uma estaca se reúnem. Alas locais não têm reuniões sacramentais nestes domingos.

**Conferência de Ala:** Evento anual específico de cada ala. Tipo de exceção que tem reunião sacramental com formato especial (3 seções na agenda, sem discursos preparados). Aparece na aba Agenda.

**Apresentação da Primária:** Evento anual onde crianças (3-11 anos) apresentam músicas e mensagens. Não há discursos preparados regulares neste domingo.

**Apresentação Especial da Primária:** Tipo de exceção de domingo onde a reunião sacramental segue formato especial (sem discursos preparados), com as crianças apresentando um programa musical/espiritual. Agenda usa layout de reunião especial (3 seções).

**Ator da Reunião:** Pessoa que participa da reunião sacramental em papéis específicos (presidir, dirigir, reconhecer presença, pianista, regente). Pode ou não ser membro da ala. Cadastrado diretamente na aba Agenda.

**Agenda da Reunião Sacramental:** Programa completo de um domingo incluindo quem preside, dirige, hinos, orações, discursos, ordenanças e anúncios. Configurada na aba Agenda.

**Modo Apresentação:** Visualização full-screen read-only da agenda, com layout acordeão (cards empilhados, 1 expandido por vez). Disponível apenas no domingo.

**Discursante:** Membro designado para dar um discurso (falar sobre um tema específico) durante a reunião sacramental.

**Reunião Sacramental:** Reunião semanal aos domingos onde membros da ala se reúnem para adoração, incluindo 3 discursos preparados. Segue um rito definido com boas-vindas, anúncios, hinos, sacramento, discursos e oração final.

**Hino:** Canção religiosa do hinário oficial da Igreja. Cada hino tem um número e título, com ~300 hinos por idioma. Um subconjunto é marcado como "sacramental" para uso durante a ordenança do sacramento.

**Hinário:** Livro de hinos oficial da Igreja SUD. Cada idioma tem seu próprio hinário com numeração e títulos específicos.

**SUD:** Santos dos Últimos Dias - nome oficial dos membros de A Igreja de Jesus Cristo dos Santos dos Últimos Dias.

**Push Notification:** Notificação enviada pelo servidor ao dispositivo do usuário via Expo Push Notifications. Usada para manter bispado e secretário informados sobre o fluxo de designações de discursos.

**Expo Push Token:** Identificador único do dispositivo gerado pelo Expo Push Notifications, necessário para enviar notificações push ao dispositivo correto.

**Convite (Invitation):** Link de convite gerado por Bispado ou Secretário para convidar novos usuários à ala. Contém um token único com validade de 30 dias, formato de deep link `wardmanager://invite/{token}`. Ao abrir o link, o convidado vê os dados da ala e define apenas a senha para criar sua conta.

**Deep Link:** URL especial que abre diretamente uma tela específica dentro do app nativo. No contexto deste projeto, usado para links de convite no formato `wardmanager://invite/{token}`. Implementado via expo-linking.

**Self-Registration:** Fluxo que permite ao primeiro usuário de uma ala criar a ala e sua conta simultaneamente, sem necessidade de CLI ou intervenção de administrador. Disponível via botão na tela de login.

**Histórico (Activity Log):** Log auditável de todas as ações manuais que geram persistência no banco de dados. Exibido em tela read-only na aba Configurações, com busca nos 3 campos (data-hora, email, descrição). Retenção de 2 anos. Visível para Bispado e Secretário.

---

## 25. Referências

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design (Android)](https://material.io/design)
- [React Native Documentation](https://reactnative.dev/)
- [A Igreja de Jesus Cristo dos Santos dos Últimos Dias](https://www.churchofjesuschrist.org/)

---

**Fim da Especificação**
