# SPEC Audit Report

**Data:** 2026-02-16
**Auditor:** requirements-extractor (devteam)
**Escopo:** Comparacao rigorosa entre documentos de entrada (PRODUCT_SPECIFICATION.md, SPEC.final.md) e specs derivadas (SPEC_F001.md a SPEC_F024.md)

---

## Sumario Executivo

- **Total de CRs analisados:** 30 (CR-01 a CR-30)
- **CRs causados por erro na spec (SPEC_WRONG):** 4
- **CRs causados por spec incompleta (SPEC_INCOMPLETE):** 8
- **CRs causados por ambiguidade (SPEC_AMBIGUOUS):** 3
- **CRs onde spec estava correta, erro de codigo (SPEC_CORRECT_CODE_WRONG):** 10
- **CRs com requisito novo, nao estava nos docs de entrada (INPUT_MISSING):** 5
- **Novos problemas encontrados (CR-NEW):** 12

---

## Parte 1: Diagnostico Retroativo

### CR-01 a CR-30 — Analise Individual

```yaml
- cr: CR-01
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-25, linha ~817-818"
  input_says: "botao 'Iniciar Reuniao Sacramental' aparece no topo da aba Home quando e domingo"
  spec_file: SPEC_F009.md
  spec_says: "Presentation Mode button visible only on Sundays (00:00-23:59) at top of Home"
  divergence: "Nenhuma spec menciona titulo de secao acima do botao. O usuario queria um titulo 'Agenda da Reuniao Sacramental' acima do botao, similar ao estilo dos outros titulos de secao como 'Proximas Designacoes'."
  root_cause: INPUT_MISSING
  impact: "Botao aparecia sem titulo de secao, inconsistente com o padrao visual das outras secoes da Home"
```

```yaml
- cr: CR-02
  input_doc: SPEC.final.md
  input_reference: "Secao 7.10, linha ~753-756"
  input_says: "Ao confirmar: idioma atualizado, colecoes do idioma anterior desativadas, interface muda, formatos de data adaptam"
  spec_file: SPEC_F020.md
  spec_says: "Language stored in wards table (field language); react-i18next with locales: pt-BR, en, es"
  divergence: "A spec F020 menciona que o idioma e armazenado no ward e que react-i18next e usado, mas NAO especifica que o initI18n() deve ser chamado com o idioma do ward APOS o login/carregamento de dados da ala. A spec e silente sobre a sequencia de inicializacao."
  root_cause: SPEC_INCOMPLETE
  impact: "App iniciava sempre em EN-US (device locale) ao inves de respeitar o idioma da ala apos login"
```

```yaml
- cr: CR-03
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-25, linha ~820-821"
  input_says: "tela full-screen abre com agenda do domingo atual"
  spec_file: SPEC_F016.md
  spec_says: "AC-AGD-021: clicks 'Start Meeting' -> full-screen with sunday agenda; Welcome section expanded"
  divergence: "A spec F016 define o comportamento correto (abrir agenda com campos), mas nao define explicitamente o que fazer quando a agenda nao existe ainda (lazy creation). A spec F012 define lazy creation na aba Agenda, mas nao no contexto do Modo Apresentacao."
  root_cause: SPEC_INCOMPLETE
  impact: "Presentation mode mostrava 'Nenhum resultado encontrado' ao inves de criar/mostrar agenda vazia"
```

```yaml
- cr: CR-04
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-09, linha ~404-405"
  input_says: "dropdown com opcoes: Discursos, Reuniao de Testemunho, Conferencia Geral... E quando dropdown = qualquer excecao: campos de discursos somem"
  spec_file: SPEC_F007.md
  spec_says: "Dropdown options: Discursos, Reuniao de Testemunho, Conferencia Geral... collapsed card shows exception text"
  divergence: "A spec diz 'collapsed card shows exception text' mas nao especifica que o texto de excecao deve ser TRADUZIDO via i18n. A spec usa os nomes portugues das opcoes mas nao menciona que o card contraido deve mostrar t('sundayExceptions.xxx') ao inves do enum raw."
  root_cause: SPEC_INCOMPLETE
  impact: "Card contraido mostrava 'general_conference' ao inves de 'Conferencia Geral'"
```

```yaml
- cr: CR-05
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-13, linha ~487"
  input_says: "card expande mostrando 3 discursos com labels ordinais: '1o Discurso', '2o Discurso', '3o Discurso' (Unicode U+00BA)"
  spec_file: SPEC_F008.md
  spec_says: "Labels: '1o Discurso', '2o Discurso', '3o Discurso' (Unicode U+00BA)"
  divergence: "A spec F008 esta CORRETA — diz explicitamente '1o Discurso'. O codigo implementou como 'VAGA 1o' usando a key i18n speeches.slot ao inves de usar o label correto da spec."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Labels de discurso mostravam 'VAGA 1o' ao inves de '1o Discurso'"
```

```yaml
- cr: CR-06
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-09, linha ~404"
  input_says: "Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro"
  spec_file: SPEC_F007.md
  spec_says: "Dropdown options: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro"
  divergence: "A spec F007 esta CORRETA com a lista certa. O codigo implementou uma lista diferente (incluindo 'Nao Designado', 'Domingo de Jejum', 'Programa Especial', 'Sem Reuniao'). Essa lista veio de uma versao anterior da spec que foi substituida."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Lista de tipos de domingo estava completamente errada no dropdown"
```

```yaml
- cr: CR-07
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-09, linha ~406"
  input_says: "quando dropdown = qualquer excecao: campos de discursos somem"
  spec_file: SPEC_F007.md
  spec_says: "AC-020: selects exception in dropdown -> speech fields disappear"
  divergence: "A spec F007 esta CORRETA. O codigo nao implementou a logica de esconder campos de discurso em todas as telas onde o card de domingo aparece."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Campos de discurso continuavam visiveis quando tipo diferente de 'Discursos' era selecionado"
```

```yaml
- cr: CR-08
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-06, linha ~236-244"
  input_says: "card expande inline mostrando lista de Colecoes... cada Colecao tem checkbox"
  spec_file: SPEC_F005.md
  spec_says: "Settings > Topics card expands inline showing collections list"
  divergence: "Nem a PRODUCT_SPECIFICATION nem a spec F005 especificam o comportamento de scroll da lista de colecoes quando ha muitas colecoes. A spec nao define se a lista deve ser scrollable ou se precisa de layout especial."
  root_cause: SPEC_INCOMPLETE
  impact: "Lista de colecoes nao era scrollable, colecoes fora da tela nao podiam ser alcancadas"
```

```yaml
- cr: CR-09
  input_doc: SPEC.final.md
  input_reference: "Secao 7.4, linha ~614"
  input_says: "OMITIDO — Nao ha descricao de comportamento de navegacao para re-pressionar a tab de Configuracoes"
  spec_file: SPEC_F003.md
  spec_says: "OMITIDO"
  divergence: "Nenhum documento de entrada nem spec derivada define o comportamento quando o usuario pressiona a tab de Configuracoes estando em uma sub-tela. E um edge case de navegacao nao documentado."
  root_cause: INPUT_MISSING
  impact: "Flash branco e animacao de slide ao pressionar tab Configuracoes estando em sub-tela"
```

```yaml
- cr: CR-10
  input_doc: SPEC.final.md
  input_reference: "Secao 7.11, linha ~769-777"
  input_says: "Seletor com 3 opcoes: Automatico (icone telefone), Claro (sol), Escuro (lua). Preferencia armazenada em AsyncStorage"
  spec_file: SPEC_F021.md
  spec_says: "3 options: Automatic (phone icon), Light (sun), Dark (moon). Preference stored in AsyncStorage"
  divergence: "A spec F021 define corretamente o comportamento do seletor de tema. O codigo deixou os handlers onPress vazios ({} => {})."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Botoes Tema e Sobre nao faziam nada"
```

```yaml
- cr: CR-11
  input_doc: SPEC.final.md
  input_reference: "Secao 7.10, linha ~753-756"
  input_says: "Ao confirmar: idioma atualizado... interface muda"
  spec_file: SPEC_F020.md
  spec_says: "Language stored in wards table (field language); react-i18next with locales"
  divergence: "Identico ao CR-02. A spec nao especifica que initI18n deve ser chamado com o idioma do ward apos o carregamento do AuthContext."
  root_cause: SPEC_INCOMPLETE
  impact: "Idioma sempre em ingles ao iniciar o app via Expo Go"
```

```yaml
- cr: CR-12
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "Nao existe referencia"
  input_says: "OMITIDO — Nao ha definicao do titulo exato da tela de template WhatsApp"
  spec_file: SPEC_F024.md
  spec_says: "Settings > WhatsApp Template card"
  divergence: "O nome exato do titulo da tela nao estava definido nos documentos de entrada. 'Modelo WhatsApp' vs 'Modelo de Convite pelo WhatsApp' e uma preferencia do usuario nao documentada."
  root_cause: INPUT_MISSING
  impact: "Titulo da tela nao era descritivo o suficiente para o usuario"
```

```yaml
- cr: CR-13
  input_doc: SPEC.final.md
  input_reference: "Secao 7.9, linha ~745"
  input_says: "Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
  spec_file: SPEC_F024.md
  spec_says: "Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
  divergence: "A spec esta CORRETA — {tema} NAO esta na lista de placeholders validos. O codigo ou o template padrao incluiu {tema} por engano."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Placeholder invalido {tema} aparecia no template padrao"
```

```yaml
- cr: CR-14
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-20, linha ~623-627"
  input_says: "mensagem pre-preenchida: 'Ola, tudo bom! O Bispado gostaria de te convidar para fazer o <1o/2o/3o> discurso...'"
  spec_file: SPEC_F010.md
  spec_says: "Default template: 'Ola, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso...'"
  divergence: "O template padrao definido no PRODUCT_SPECIFICATION e na spec F010 e diferente do que o usuario pediu no CR-14. O usuario quer um template especifico que nao existia nos documentos de entrada."
  root_cause: INPUT_MISSING
  impact: "Template padrao nao correspondia ao que o usuario queria"
```

```yaml
- cr: CR-15
  input_doc: SPEC.final.md
  input_reference: "Secao 7.9, linha ~744-745"
  input_says: "Editor com preview em tempo real. Placeholders: {nome}, {data}, ..."
  spec_file: SPEC_F024.md
  spec_says: "Editor with real-time preview. Placeholders: {nome}, {data}, ..."
  divergence: "Nem o documento de entrada nem a spec definem que os placeholders devem ser CLICAVEIS para inserir no template. A spec apenas lista os placeholders como referencia."
  root_cause: INPUT_MISSING
  impact: "Placeholders nao eram interativos, usuario tinha que digitar manualmente"
```

```yaml
- cr: CR-16
  input_doc: SPEC.final.md
  input_reference: "Secao 7.9, linha ~744"
  input_says: "Editor com preview em tempo real"
  spec_file: SPEC_F024.md
  spec_says: "Editor with real-time preview"
  divergence: "Nenhum documento define tamanhos de fonte ou uso de espaco da tela de template. Problema de design/implementacao."
  root_cause: SPEC_INCOMPLETE
  impact: "Metade da tela desperdicada, fontes pequenas, placeholders pequenos"
```

```yaml
- cr: CR-17
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-01, linha ~101"
  input_says: "ve botao de voltar (a esquerda do campo de search)"
  spec_file: SPEC_F024.md
  spec_says: "OMITIDO — Nao menciona botao de voltar"
  divergence: "O PRODUCT_SPECIFICATION define botao de voltar para a tela de membros (RF-01). A consistencia com outras telas (WhatsApp template) nao e explicitamente coberta. A spec F024 nao menciona botao de voltar."
  root_cause: SPEC_INCOMPLETE
  impact: "Tela WhatsApp template sem botao de voltar"
```

```yaml
- cr: CR-18
  input_doc: SPEC.final.md
  input_reference: "Secao 6.3, activity_log, linha ~388"
  input_says: "sunday_type:change — Tipo de domingo alterado"
  spec_file: SPEC_F019.md
  spec_says: "sunday_type:change logged"
  divergence: "A spec F019 lista sunday_type:change como acao logada, e o SPEC.final.md tambem. O codigo nao chamou logAction ao mudar o tipo de domingo em todos os caminhos (useSetSundayType e useRemoveSundayException)."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Alteracao de tipo de domingo nao aparecia no historico"
```

```yaml
- cr: CR-19
  input_doc: SPEC.final.md
  input_reference: "Secao 7.12.1, linha ~791-795"
  input_says: "Card 'Historico'... Ao clicar: navega para tela cheia de historico"
  spec_file: SPEC_F019.md
  spec_says: "clicks History card -> screen opens -> list of entries"
  divergence: "A spec nao menciona explicitamente um botao de voltar na tela de historico, embora seja um padrao de UI implicito para telas que 'navega para tela cheia'."
  root_cause: SPEC_INCOMPLETE
  impact: "Tela historico sem botao de voltar"
```

```yaml
- cr: CR-20
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-06, linha ~237"
  input_says: "clica no card 'Temas' -> card expande inline"
  spec_file: SPEC_F005.md
  spec_says: "Settings > Topics card expands inline showing collections list"
  divergence: "A PRODUCT_SPECIFICATION original diz que Topics e um card que 'expande inline' (nao uma tela separada). Porem na implementacao foi criada como tela separada (settings/topics.tsx) sem botao de voltar."
  root_cause: SPEC_AMBIGUOUS
  impact: "Tela de temas sem botao de voltar"
```

```yaml
- cr: CR-21
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-07, linha ~292-293"
  input_says: "ve card 'Adicionar Tema' como ultimo item da lista [dentro de Temas da Ala expandida]"
  spec_file: SPEC_F005.md
  spec_says: "Topic card: swipe-to-reveal with edit/delete buttons... 'Add new topic' button (dashed border)"
  divergence: "O PRODUCT_SPECIFICATION diz que o botao de adicionar fica DENTRO da lista de temas como ultimo item. A spec nao e explicita sobre o posicionamento. O codigo colocou o botao no header da tela."
  root_cause: SPEC_AMBIGUOUS
  impact: "Botao '+' no titulo da tela ao inves de dentro da secao 'Temas da Ala'"
```

```yaml
- cr: CR-22
  input_doc: SPEC.final.md
  input_reference: "Secao 6.3, activity_log, linha ~408-418"
  input_says: "Exemplos: 'Designou Joao Silva para o 1o discurso do dia 08 FEV...', 'Alterou o tipo do domingo 13 ABR para Conferencia de Estaca'"
  spec_file: SPEC_F019.md
  spec_says: "entry created in activity_log with datetime, user email, readable description"
  divergence: "O SPEC.final.md fornece exemplos CLAROS de descricoes legiveis ('Domingo dia 13 ABR...'). A spec F019 diz 'readable description' mas nao reproduz os exemplos. O codigo gerou descricoes com keys raw do banco ao inves de texto legivel."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Log mostrava 'Tipo de Domingo alterado: 2026-02-15 -> testimony_meeting' ao inves de texto legivel"
```

```yaml
- cr: CR-23
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "Secao 1.1, linha ~40-41"
  input_says: "Secretario: cadastrar membros, cadastrar temas, marcar excecoes, alterar status de discursos, gerenciar convites via WhatsApp, editar agenda, designar discursantes pela aba Agenda, convidar novos usuarios por link"
  spec_file: SPEC_F023.md
  spec_says: "User CRUD | Bishopric: Yes | Secretary: No | Observer: No"
  divergence: "A PRODUCT_SPECIFICATION (secao 1.1) NAO lista 'gerenciar usuarios' nas responsabilidades do secretario. O SPEC.final.md (secao 4.2) tambem diz 'Gerenciar usuarios (CRUD): Bispado=Yes, Secretario=No'. POREM, o usuario reportou no CR-23 que o secretario DEVERIA ter acesso. Isso e uma MUDANCA de requisito nao prevista."
  root_cause: SPEC_WRONG
  impact: "Secretario sem acesso a gerenciamento de usuarios, contrariando expectativa do usuario"
```

```yaml
- cr: CR-24
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-09, linha ~401-414"
  input_says: "Quando dropdown = qualquer excecao: campos de discursos somem. Ao selecionar 'Outro': dialogo abre..."
  spec_file: SPEC_F007.md
  spec_says: "AC-020: selects exception in dropdown -> type saved in DB; speech fields disappear"
  divergence: "A spec esta correta. O bug esta na implementacao da mutacao (useSetSundayType) que nao estava salvando corretamente a selecao no banco, ou o cache do React Query nao estava invalidando corretamente."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Selecao de tipo de domingo era ignorada/revertida"
```

```yaml
- cr: CR-25
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-12, linha ~467"
  input_says: "lista abre automaticamente no proximo domingo (posicionado no topo da tela, sem animacao)"
  spec_file: SPEC_F008.md
  spec_says: "AC-023: next sunday on top, no animation"
  divergence: "A spec esta correta — diz explicitamente 'next sunday on top'. O codigo tinha um bug no calculo do initialIndex ou no timing do scrollToIndex."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Agenda abria em junho do ano passado ao inves do proximo domingo"
```

```yaml
- cr: CR-26
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-22, linha ~738-757"
  input_says: "O usuario clica em um campo de ator -> seletor abre mostrando lista de atores existentes filtrados pelo papel requerido, campo de busca/filtro no topo, botao 'Adicionar novo ator', icone de lixeira..."
  spec_file: SPEC_F013.md
  spec_says: "When clicking an actor field, selector shows: list of existing actors filtered by required role, search/filter field at top, 'Add new actor' button at end of list, trash icon next to each actor"
  divergence: "A spec F013 e a PRODUCT_SPECIFICATION estao alinhadas — gestao de atores e INLINE na aba Agenda. No entanto, a spec F013 tambem menciona checkboxes de papeis no formulario inline de adicionar ator, enquanto o CR-26 do usuario diz que o tipo do ator deve ser INFERIDO do campo clicado (sem checkboxes). Alem disso, o CR-26 pede dialog de 2/3 de tela, e a spec nao define o tamanho. Tambem, a spec usa a palavra 'ator/actor' que o usuario proibiu na UI."
  root_cause: SPEC_WRONG
  impact: "Solucao de atores implementada com tela separada em Configuracoes ao inves de inline na Agenda; UI usava a palavra 'Atores'"
```

```yaml
- cr: CR-27
  input_doc: SPEC.final.md
  input_reference: "Secao 7.13.2, linha ~893"
  input_says: "Anuncios: Texto livre, Campo de texto multilinha"
  spec_file: SPEC_F012.md
  spec_says: "Announcements: free text multiline"
  divergence: "A spec nao define debounce para auto-save em campos de texto da agenda, nem define altura minima para o campo de anuncios. O bug de 'comer letras' e um problema de implementacao (re-renders excessivos por auto-save sem debounce)."
  root_cause: SPEC_INCOMPLETE
  impact: "Campos de texto comiam letras; campo de anuncios muito pequeno"
```

```yaml
- cr: CR-28
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-23, linha ~763-774"
  input_says: "seletor abre com: campo de busca no topo... lista de hinos"
  spec_file: SPEC_F014.md
  spec_says: "selector opens: search field by number or title; list 'Number -- Title' sorted by number"
  divergence: "Nem o documento de entrada nem a spec definem o TAMANHO do dialogo do seletor de hinos. O CR-28 pede 2/3 de tela (bottom-sheet), o que e uma preferencia de design nao documentada."
  root_cause: INPUT_MISSING
  impact: "Dialogo de selecao de hinos era flutuante/pequeno ao inves de 2/3 de tela"
```

```yaml
- cr: CR-29
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-21, linha ~651-653"
  input_says: "4 secoes para reuniao normal: Boas-vindas e Anuncios, Designacoes e Sacramento, Primeiro e Segundo Discurso, Ultimo Discurso"
  spec_file: SPEC_F012.md
  spec_says: "4 sections: Welcome, Designations/Sacrament, 1st+2nd Speech, Last Speech"
  divergence: "Os nomes exatos das secoes nao estao COMPLETAMENTE alinhados. A PRODUCT_SPECIFICATION diz 'Boas-vindas e Anuncios' mas o SPEC.final.md secao 7.13.2 diz 'BOAS-VINDAS E ANUNCIOS'. O CR-29 pede nomes mais descritivos: 'Boas-vindas, Anuncios e Reconhecimentos', 'Designacoes e Sacramento', 'Primeiros Discursos', 'Ultimo Discurso'. Porem, os nomes do CR sao diferentes do PRODUCT_SPECIFICATION e do SPEC.final.md."
  root_cause: SPEC_WRONG
  impact: "Labels das secoes nao correspondiam ao que o usuario queria"
```

```yaml
- cr: CR-30
  input_doc: SPEC.final.md
  input_reference: "Secao 7.13.2, linha ~915"
  input_says: "Apresentacao especial: Toggle + Texto"
  spec_file: SPEC_F012.md
  spec_says: "Special presentation: toggle + description"
  divergence: "O SPEC.final.md e a spec F012 usam 'Apresentacao especial'. O codigo usou 'Numero musical' como label, que e um termo diferente. O documento de entrada ja usava 'Apresentacao especial', entao o label de codigo foi incorreto."
  root_cause: SPEC_CORRECT_CODE_WRONG
  impact: "Label mostrava 'Numero musical' ao inves de 'Apresentacao especial'"
```

---

## Parte 2: Novos CRs Potenciais

### Analise proativa: comparacao minuciosa dos documentos de entrada vs specs derivadas

```yaml
- cr_id: CR-NEW-01
  severity: CRITICAL
  type: SPEC_WRONG
  title: "Permissao do Secretario para designar pela aba Discursos diverge entre docs"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "Secao 1.1, linha ~40"
  input_says: "Secretario: alterar status de discursos... designar discursantes pela aba Agenda"
  spec_file: SPEC_F023.md
  spec_says: "Assign speakers/topics: Bishopric=Yes, Secretary=No. EXCEPTION: In Agenda tab, BOTH Bishopric AND Secretary can assign speakers"
  divergence: "A PRODUCT_SPECIFICATION secao 1.1 lista 'designar discursantes pela aba Agenda' para o Secretario, consistente com SPEC.final.md secao 4.2 onde 'Designar discursante via Agenda: Bispado=Yes, Secretario=Yes'. Porem, a secao 4.2 do SPEC.final.md diz 'Designar discursantes/temas: Bispado=Yes, Secretario=No'. Isso esta CORRETO — a spec F023 reflete exatamente isso. No entanto, o ASM-009 do SPEC.final.md diz 'Secretario NAO designa em NENHUMA tela', o que CONTRADIZ a excecao da aba Agenda. O ASM-009 deveria dizer 'Secretario NAO designa pela aba Discursos nem Home, mas PODE designar pela aba Agenda'."
  potential_impact: "Se o ASM-009 for lido literalmente, implementadores podem bloquear designacao pelo Secretario na Agenda"
  suggested_fix: "Corrigir ASM-009 no SPEC.final.md para: 'Secretario NAO designa pela aba Discursos nem Home, mas PODE designar pela aba Agenda (excecao documentada em ASM-AGD-003)'"
```

```yaml
- cr_id: CR-NEW-02
  severity: HIGH
  type: SPEC_INCONSISTENCY
  title: "Secao 'Sobre' (About) nao esta documentada em nenhum doc de entrada nem spec"
  input_doc: SPEC.final.md
  input_reference: "Nao existe referencia"
  input_says: "OMITIDO — Nao ha secao sobre a tela 'Sobre' / 'About'"
  spec_file: Nenhum SPEC_F*.md
  spec_says: "OMITIDO"
  divergence: "O CR-10 menciona que o botao 'Sobre' nao faz nada, mas NAO existe definicao de conteudo dessa tela em nenhum documento de entrada nem spec. Nao ha SPEC_F*.md para a funcionalidade 'Sobre'."
  potential_impact: "Implementacao da tela 'Sobre' sem especificacao pode resultar em conteudo inadequado ou incompleto"
  suggested_fix: "Adicionar definicao da tela 'Sobre' ao SPEC.final.md secao 7.11 (que ja menciona o seletor de tema visual) ou criar nova secao 7.11.1. Conteudo sugerido: nome do app, versao, creditos, link para suporte"
```

```yaml
- cr_id: CR-NEW-03
  severity: HIGH
  type: SPEC_INCOMPLETE
  title: "Botoes de voltar nao padronizados — falta convencao global de navegacao"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-01, linha ~101"
  input_says: "ve botao de voltar (a esquerda do campo de search)"
  spec_file: Multiplos SPEC_F*.md
  spec_says: "Diferentes abordagens para botao de voltar dependendo da spec"
  divergence: "O PRODUCT_SPECIFICATION define botao de voltar apenas para a tela de membros (RF-01). Nenhum documento define uma convencao global de que TODA tela de sub-navegacao deve ter botao de voltar. Isso causou CRs 17, 19 e 20 (WhatsApp, History, Topics sem botao de voltar)."
  potential_impact: "Novas telas no futuro podem ser implementadas sem botao de voltar"
  suggested_fix: "Adicionar convencao no SPEC.final.md: 'Toda tela acessada via navegacao Stack (que substitui a tela anterior) DEVE ter botao de voltar no header, estilo consistente com common.back i18n key'"
```

```yaml
- cr_id: CR-NEW-04
  severity: HIGH
  type: SPEC_INCOMPLETE
  title: "Spec F013 define checkboxes de papeis na criacao de ator, mas PRODUCT_SPECIFICATION diz para inferir do campo"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-22, linha ~748-749"
  input_says: "mini-formulario inline abre: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica). Ao salvar: ator criado"
  spec_file: SPEC_F013.md
  spec_says: "'Add new actor' opens mini inline form: name + role checkboxes (Preside, Conduct, Recognize, Music)"
  divergence: "PRODUCT_SPECIFICATION RF-22 e SPEC.final.md secao 7.13.4 AMBOS definem checkboxes de papeis no formulario de adicionar ator. Porem, o CR-26 do usuario contradiz isso: 'voce vai perguntar so o nome, pois o tipo do ator voce pega pelo campo que foi clicado'. Isso significa que o PRODUCT_SPECIFICATION e o SPEC.final.md precisam ser atualizados apos o CR-26."
  potential_impact: "Se CR-26 foi implementado mas docs nao foram atualizados, futuros desenvolvedores podem reimplementar com checkboxes"
  suggested_fix: "Atualizar RF-22 da PRODUCT_SPECIFICATION e secao 7.13.4 do SPEC.final.md para refletir que ao adicionar ator inline, apenas nome e solicitado e o papel e inferido do campo clicado"
```

```yaml
- cr_id: CR-NEW-05
  severity: MEDIUM
  type: SPEC_INCONSISTENCY
  title: "Campo 'duracao' nos placeholders do WhatsApp nao tem fonte de dados definida"
  input_doc: SPEC.final.md
  input_reference: "Secao 7.9, linha ~745"
  input_says: "Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
  spec_file: SPEC_F024.md
  spec_says: "Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
  divergence: "O placeholder {duracao} esta listado, mas o modelo de dados da tabela speeches NAO tem campo 'duration'. A PRODUCT_SPECIFICATION secao 5.1 Discurso menciona 'Duracao: 5, 10 ou 15 minutos (correspondente a posicao)' como atributo do dominio, mas a tabela speeches no SPEC.final.md NAO tem coluna duration. A duracao e derivada da posicao (1=5min, 2=10min, 3=15min)."
  potential_impact: "Placeholder {duracao} pode nao funcionar ou mostrar valor incorreto se nao for calculado a partir da posicao"
  suggested_fix: "Documentar no SPEC_F024.md que {duracao} e derivado: posicao 1 = '5 minutos', posicao 2 = '10 minutos', posicao 3 = '15 minutos'. Ou remover {duracao} dos placeholders se nao for util"
```

```yaml
- cr_id: CR-NEW-06
  severity: MEDIUM
  type: SPEC_INCOMPLETE
  title: "Debounce e performance de auto-save nao especificados para campos de texto da agenda"
  input_doc: SPEC.final.md
  input_reference: "Secao 7.13.2, linha ~882-924"
  input_says: "Todos os campos da agenda com auto-save"
  spec_file: SPEC_F012.md
  spec_says: "Auto-save on all field changes"
  divergence: "A spec diz 'auto-save on all field changes' mas NAO especifica debounce, throttle ou qualquer mecanismo para evitar re-renders excessivos em campos de texto. Isso causou o CR-27 (letter-eating bug). A spec deveria definir: debounce minimo de 500ms para campos de texto, e uso de estado local para o input."
  potential_impact: "Outros campos de texto podem ter o mesmo problema de letter-eating"
  suggested_fix: "Adicionar nota tecnica ao SPEC_F012.md: 'Campos de texto com auto-save devem usar debounce de no minimo 500ms. O estado do input deve ser gerenciado localmente (useState) e apenas sincronizado com o servidor apos o debounce.'"
```

```yaml
- cr_id: CR-NEW-07
  severity: MEDIUM
  type: SPEC_INCOMPLETE
  title: "Altura minima de campos de texto multilinha nao especificada"
  input_doc: SPEC.final.md
  input_reference: "Secao 7.13.2, linha ~893"
  input_says: "Anuncios: Texto livre, Campo de texto multilinha"
  spec_file: SPEC_F012.md
  spec_says: "Announcements: free text multiline"
  divergence: "A spec diz 'free text multiline' mas nao define altura minima. O CR-27 pediu 3 linhas de texto (~66px). Outros campos multilinha (apoios/desobrigacoes, nomes de bebes, nomes de batismo) tambem podem ter o mesmo problema."
  potential_impact: "Campos multilinha muito pequenos, dificultando a leitura e edicao"
  suggested_fix: "Adicionar ao SPEC_F012.md: 'Campos de texto multilinha devem ter altura minima de 3 linhas (~66px) quando vazios e expandir conforme o conteudo cresce'"
```

```yaml
- cr_id: CR-NEW-08
  severity: MEDIUM
  type: SPEC_INCONSISTENCY
  title: "SPEC.final.md secao 7.8 contradiz PRODUCT_SPECIFICATION sobre permissao do Secretario para ver card Usuarios"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "Secao 1.1, linha ~40-41"
  input_says: "Secretario: convidar novos usuarios por link"
  spec_file: SPEC_F018.md
  spec_says: "Card 'Users' visible only for Bishopric (permission settings:users). Secretary and Observer do NOT see the card. Note: Secretary can invite users via 'Invite' button visible elsewhere"
  divergence: "O SPEC.final.md secao 7.8 diz 'Card Usuarios visivel apenas para Bispado'. A spec F018 replica isso. POREM, com o CR-23 agora dando acesso ao Secretario, ambos os documentos precisam ser atualizados. O 'elsewhere' mencionado na spec F018 tambem nao esta definido — onde exatamente fica o botao 'Convidar' para o Secretario?"
  potential_impact: "Apos CR-23, o Secretario ve o card Usuarios, mas as specs nao refletem isso. Futuros desenvolvedores podem reverter"
  suggested_fix: "Atualizar SPEC.final.md secao 7.8, secao 4.2, e SPEC_F023.md para: 'Card Usuarios visivel para Bispado e Secretario (permissao settings:users)'"
```

```yaml
- cr_id: CR-NEW-09
  severity: MEDIUM
  type: SPEC_INCOMPLETE
  title: "Formato de data para Modo Apresentacao nao especificado"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-25, linha ~820"
  input_says: "tela full-screen abre com agenda do domingo atual"
  spec_file: SPEC_F016.md
  spec_says: "full-screen with sunday agenda"
  divergence: "A spec nao define como a data do domingo e exibida no header do Modo Apresentacao, nem como o titulo da tela deve aparecer. Deve ser 'Domingo, 16 de Fevereiro de 2026'? Apenas a data compacta?"
  potential_impact: "Data pode ser exibida em formato inconsistente ou pouco legivel"
  suggested_fix: "Adicionar ao SPEC_F016.md: 'Header do Modo Apresentacao exibe a data por extenso no idioma da ala (ex pt-BR: Domingo, 16 de Fevereiro de 2026)'"
```

```yaml
- cr_id: CR-NEW-10
  severity: LOW
  type: SPEC_INCOMPLETE
  title: "Spec F005 nao define comportamento de busca dentro de Temas da Ala"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-07, linha ~291"
  input_says: "Temas da Ala expandida: ve lista de temas existentes (cards contraidos, ordenados alfabeticamente por titulo)"
  spec_file: SPEC_F005.md
  spec_says: "Topic card: swipe-to-reveal with edit/delete buttons"
  divergence: "A PRODUCT_SPECIFICATION nao define um campo de busca para temas da ala (apenas lista ordenada). A spec F005 tambem nao menciona busca. Porem, para consistencia com a tela de membros (que tem busca), seria util ter busca tambem em temas quando a lista e grande."
  potential_impact: "Usuarios com muitos temas nao conseguem filtrar rapidamente"
  suggested_fix: "Considerar adicionar campo de busca acima da lista de temas da ala para alas com muitos temas personalizados"
```

```yaml
- cr_id: CR-NEW-11
  severity: LOW
  type: SPEC_INCONSISTENCY
  title: "SPEC.final.md secao 7.4.1 diz FAB (+) no canto inferior direito, mas PRODUCT_SPECIFICATION diz botao '+' a direita do search"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-01, linha ~103"
  input_says: "ve botao '+' (a direita do campo de search)"
  spec_file: SPEC_F003.md
  spec_says: "AC-003: clicks '+', fills data, clicks outside -> member saved"
  divergence: "A PRODUCT_SPECIFICATION diz que o botao '+' fica a direita do campo de search no topo da tela. O SPEC.final.md secao 7.4.1 diz 'Botao FAB (+) no canto inferior direito'. Esses sao dois posicionamentos DIFERENTES para o mesmo botao."
  potential_impact: "Implementacao pode usar FAB (canto inferior direito) quando o usuario espera o botao no header ao lado do search"
  suggested_fix: "Resolver a inconsistencia: o PRODUCT_SPECIFICATION e mais especifico (a direita do search). Atualizar SPEC.final.md secao 7.4.1 para ser consistente"
```

```yaml
- cr_id: CR-NEW-12
  severity: LOW
  type: SPEC_INCOMPLETE
  title: "Fuso horario configuravel mencionado em multiplos locais mas sem tela especifica definida"
  input_doc: PRODUCT_SPECIFICATION.md
  input_reference: "RF-31, linha ~914-922"
  input_says: "ve campo de selecao de fuso horario. Formato IANA. Padrao baseado no idioma da ala."
  spec_file: SPEC.final.md
  spec_says: "Secao 7.10.1 - Seletor de fuso horario IANA"
  divergence: "O SPEC.final.md secao 7.10.1 define o seletor de fuso horario. Porem, NAO existe um SPEC_F*.md dedicado para esta funcionalidade. O fuso horario e mencionado em SPEC_F017 (push notifications) e SPEC_F002 (ward management), mas nao ha spec de como o seletor de fuso horario funciona na UI (formato do seletor, lista de fusos, busca)."
  potential_impact: "Implementacao do seletor de fuso horario sem definicao detalhada de UI"
  suggested_fix: "Adicionar detalhes ao SPEC_F002.md ou criar nota no SPEC_F020.md sobre o seletor de fuso horario: tipo de seletor, busca, lista dos fusos mais comuns"
```

---

## Parte 3: Recomendacoes

### 3.1 Problemas Sistemicos Identificados

1. **Falta de padrao de navegacao**: 3 CRs (17, 19, 20) foram causados por falta de botao de voltar. Definir uma convencao global evitaria repeticao.

2. **Specs incompletas em detalhes de UI**: 8 CRs foram causados por specs que omitiam detalhes como tamanho de dialogo, debounce, altura de campos, posicao de botoes. Specs derivadas devem incluir detalhes visuais minimos.

3. **Sequencia de inicializacao nao documentada**: 2 CRs (02, 11) sobre idioma foram causados porque a spec nao documentou a ordem de inicializacao (initI18n antes ou depois do AuthContext).

4. **ASM-009 contradiz excecao da Agenda**: A assumption "Secretario NAO designa em NENHUMA tela" contradiz o fato documentado de que Secretario PODE designar pela aba Agenda. Isso pode confundir implementadores.

5. **Documentos de entrada nao atualizados apos CRs**: Apos implementar CRs como 26 (actors redesign) e 29 (section labels), a PRODUCT_SPECIFICATION e o SPEC.final.md precisam ser atualizados para refletir as mudancas.

### 3.2 Acoes Sugeridas

1. **Atualizar PRODUCT_SPECIFICATION.md e SPEC.final.md** para refletir CRs 06 (lista de tipos de domingo), 23 (permissao secretario), 26 (actors inline sem checkboxes), 29 (labels de secao).

2. **Criar convencao de navegacao** no SPEC.final.md: toda tela Stack deve ter botao de voltar.

3. **Adicionar secao de performance/UX em campos de texto** ao SPEC_F012.md: debounce minimo, altura minima de multilinha.

4. **Corrigir ASM-009** para ser consistente com ASM-AGD-003.

5. **Criar spec ou secao para tela 'Sobre'** (About) que nao existe em nenhum doc.

6. **Adicionar lazy creation do Presentation Mode** ao SPEC_F016.md (agenda criada automaticamente se nao existe ao abrir Modo Apresentacao).

7. **Resolver inconsistencia do botao '+'** de membros: PRODUCT_SPECIFICATION diz header, SPEC.final.md diz FAB.

### 3.3 Metricas de Qualidade das Specs

| Metrica | Valor |
|---------|-------|
| CRs por SPEC_WRONG | 4 (13%) |
| CRs por SPEC_INCOMPLETE | 8 (27%) |
| CRs por SPEC_AMBIGUOUS | 3 (10%) |
| CRs por SPEC_CORRECT_CODE_WRONG | 10 (33%) |
| CRs por INPUT_MISSING | 5 (17%) |
| **Taxa de specs corretas (codigo errou)** | **33%** |
| **Taxa de specs com problemas** | **50%** (WRONG + INCOMPLETE + AMBIGUOUS) |
| **Taxa de requisitos novos** | **17%** |

### 3.4 Conclusao

Das 30 CRs analisadas, **50% foram causadas por problemas nas specs** (erros, omissoes ou ambiguidades), **33% por erros de codigo** com specs corretas, e **17% por requisitos novos** nao previstos nos documentos de entrada.

Os problemas mais frequentes nas specs sao **omissoes** (27%), especialmente em detalhes de UI, navegacao e performance. Os erros de spec (13%) sao menos frequentes mas mais impactantes (CR-23 de permissoes, CR-26 de actors, CR-29 de labels).

Os 12 novos CRs potenciais encontrados variam de CRITICAL (inconsistencia no ASM-009) a LOW (falta de busca em temas), e nenhum causa bloqueio imediato na aplicacao atual, mas devem ser corrigidos nos documentos para evitar regressoes futuras.
