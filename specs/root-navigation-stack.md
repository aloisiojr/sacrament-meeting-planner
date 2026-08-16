# Voltar de uma tela empilhada deve retornar de onde veio

## Problem / intent

Ao salvar um apoio ou desobrigação, o app vai para a aba Home em vez de voltar para o card expandido
na aba Agendas, de onde a edição começou. A tela já chama `router.back()`; o problema é estrutural.

**O layout raiz renderiza `<Slot />`, não `<Stack />`** (`src/app/_layout.tsx:129`). `Slot` desenha
a rota atual sem navegador de pilha, então não há histórico nesse nível: abrir `/designations/[date]`
DESMONTA o grupo `(tabs)`, e o `router.back()` não tem o que desempilhar — cai na rota inicial, que
é a primeira aba. O card fecha junto porque a expansão é `useState` local da aba
(`(tabs)/agenda.tsx:87`), que morre com o desmonte.

Isso não é específico dos apoios: as três rotas fora das abas sofrem o mesmo.

## In scope / Out of scope

- **In:** `src/app/_layout.tsx` — `<Slot />` vira `<Stack />`, seguindo a convenção que
  `(auth)/_layout.tsx` e `(tabs)/settings/_layout.tsx` já usam (`headerShown: false` +
  `contentStyle` com a cor de fundo do tema).
- **In:** conferir que as 6 chamadas de `router.back()` das três rotas empilhadas passam a voltar
  para a origem correta.
- **Out:** mudar as telas de apoios, discursos ou apresentação — nenhuma precisa mudar se a raiz
  ganhar pilha.
- **Out:** remover o mecanismo de `expandDate` de `(tabs)/agenda.tsx`. Ele continua servindo o lápis
  da Apresentação e o card da Home, que navegam de propósito para uma data específica.
- **Out:** transformar a expansão do card em contexto ou persisti-la; com a aba montada, o
  `useState` local basta.
- **Out:** qualquer migração, mudança de API ou de i18n.

## Baseline (evidence)

- `src/app/_layout.tsx:2,129` — importa e renderiza `Slot`. Não há `Stack` em lugar nenhum da raiz.
- `src/app/(auth)/_layout.tsx` e `src/app/(tabs)/settings/_layout.tsx` — ambos já usam
  `<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />`;
  o de settings acrescenta `animation: 'none'`.
- Rotas fora de `(tabs)`/`(auth)`, todas afetadas: `designations/[date].tsx` (4× `router.back()`),
  `speeches/[date].tsx` (1×), `presentation.tsx` (1×).
- `src/app/(tabs)/agenda.tsx:87` — `expandedDateState` é `useState` local.
- `src/app/(tabs)/agenda.tsx:170-190` — efeito que reexpande via parâmetro `expandDate`, descrito
  como vindo "do lápis da Apresentação / do card da Home". É um contorno pré-existente para o mesmo
  buraco.
- `src/app/_layout.tsx:75-94` — `NavigationGuard`: `router.replace('/(auth)/login')` quando não
  autenticado fora do grupo auth, `router.replace('/(tabs)')` quando autenticado dentro dele.
- **Nenhum teste renderiza o layout raiz nem o `NavigationGuard`** (confirmado varrendo
  `src/__tests__`). A superfície de regressão desta mudança é justamente a que a suíte não cobre.

## Acceptance criteria (EARS)

- AC1: WHEN o usuário salva um apoio/desobrigação aberto a partir do card expandido na aba Agendas,
  the system SHALL retornar à aba Agendas com o mesmo card ainda expandido.
- AC2: WHEN o usuário cancela ou volta dessa mesma tela sem salvar, the system SHALL retornar à aba
  Agendas com o card ainda expandido.
- AC3: WHEN o usuário sai da tela de edição de discursos, the system SHALL retornar à tela de onde
  entrou, e não à primeira aba.
- AC4: WHEN o usuário sai do modo apresentação, the system SHALL retornar à tela de onde entrou.
- AC5: WHILE o usuário não está autenticado, WHEN qualquer rota fora do grupo `(auth)` é aberta,
  the system SHALL redirecionar para o login, como hoje.
- AC6: WHEN um usuário autenticado cai numa rota do grupo `(auth)`, the system SHALL redirecionar
  para as abas, como hoje.
- AC7: WHEN o app abre por um link de convite ou de redefinição de senha, the system SHALL levar à
  tela correspondente, como hoje.
- AC8: WHILE a versão do app estiver abaixo do mínimo suportado, the system SHALL continuar
  bloqueando a navegação, como hoje.
- AC9: WHEN qualquer rota empilhada é exibida, the system SHALL não mostrar cabeçalho de navegador
  e SHALL usar a cor de fundo do tema.
- AC10: WHEN a suíte roda, the system SHALL falhar se a raiz voltar a não ter pilha — um teste de
  navegação real afirma que, após `push` numa rota irmã e `back`, o caminho volta à origem E o
  estado local da aba (o card expandido) sobrevive.

## Open questions

Nenhuma.

## Notes

**Decisão do usuário (2026-08-15):** corrigir a raiz em vez de contornar só na tela de apoios. O
contorno por parâmetro (`expandDate`) resolveria uma das três telas e viraria o terceiro consumidor
do mesmo remendo.

**Parte disto É automatizável — corrigido em 2026-08-15 após pesquisa.** A afirmação anterior de
que a verificação seria só manual estava errada. `expo-router/testing-library` monta um roteador
real em memória e permite afirmar `push`/`back` e a sobrevivência do estado da aba (AC10).

Três coisas são necessárias, e a razão de nenhuma ser óbvia é um bug upstream:
`renderRouter` do expo-router 57.0.9 não dá `await` no `render` do `@testing-library/react-native`
v14, que passou a ser assíncrono (a lib é desenvolvida contra a v13). Sem o `await`, nada monta, o
`screen` fica desamarrado e `router.push`/`back` viram no-op.

1. `standard-navigation` entra em `transformIgnorePatterns` (é ESM).
2. Um helper que dá `await` no `renderRouter` e reata os getters (`getPathname` etc.), documentando
   o motivo. **Não usar `testRouter`** — quebra pela mesma causa; usar
   `await act(async () => { router.back(); })`.
3. `afterEach(() => jest.useRealTimers())` — `renderRouter` liga fake timers e não restaura.

Vale reportar o bug ao expo/expo.

**O que o teste NÃO cobre, e continua manual no dispositivo:** o teste usa um mapa de rotas que
espelha a estrutura real (grupo `(tabs)` + rota irmã na raiz), não o `src/app` de verdade. Montar o
`src/app` é possível — o caminho correto é `'./src/app'`, relativo ao diretório do processo e não ao
arquivo de teste, ao contrário do que a documentação oficial diz — mas arrasta Supabase,
expo-notifications, AuthProvider e React Query. Logo AC5-AC8 (auth, deep links, version gate)
seguem sendo conferência manual:

1. Agendas → expandir card → adicionar apoio → salvar → deve voltar ao card expandido.
2. O mesmo, cancelando em vez de salvar.
3. O mesmo com a variante que pergunta sobre atualizar o chamado (a tela tem 3 saídas distintas).
4. Home → tocar nos oradores → editar discurso → voltar.
5. Iniciar apresentação → sair.
6. Sair da conta e reabrir o app (guard de auth).
7. Abrir um link de convite com o app fechado e com o app aberto.
8. Abrir um link de redefinição de senha.

Os itens 1-5 ganham cobertura automatizada equivalente por AC10; percorrê-los no dispositivo segue
valendo porque o teste usa rotas espelhadas. Os itens 6-8 são só manuais.

**Mudança visível esperada:** as telas empilhadas passam a entrar com animação de push em vez de
troca instantânea. É o comportamento padrão do `Stack` e o mesmo que o grupo `(auth)` já tem.

**Sem deploy, sem migração.** Cliente apenas.
