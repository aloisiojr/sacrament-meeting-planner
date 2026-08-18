/**
 * Passo 3 de `specs/app-health-events.plan.md` — AC10, AC11, AC12: o canal de diagnóstico.
 *
 * Três propriedades, e cada uma existe por um motivo concreto:
 *
 * - **Só números e valores de conjunto fechado no payload** (AC10). O relatório do LCR que motiva
 *   este canal carrega nome, telefone, e-mail e data de nascimento de membros reais. O filtro fica
 *   aqui, no emissor, e não na disciplina de quem chama.
 * - **Nunca atrapalha o que observa** (AC11). Diagnóstico que quebra a funcionalidade que ele
 *   observa é pior que diagnóstico nenhum.
 * - **Não pede a linha de volta.** A tabela não tem policy de SELECT, e o Postgres aplica policies
 *   de SELECT ao RETURNING — então `.select()` faria toda escrita falhar. Combinado com o AC11,
 *   que engole o erro, o canal ficaria mudo sem nenhum sinal. Verificado contra o staging em
 *   2026-08-17; ver o comentário em `048_app_health_events.sql`.
 */
import { reportHealthEvent, sanitizeHealthDetails } from '../lib/appHealth';
import { supabase } from '../lib/supabase';

// jest-expo não popula expoConfig; sem isto app_version sairia null e o teste passaria por sorte.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.0' } },
}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: (...a: unknown[]) => mockInsert(...a) })) },
}));

/**
 * O `insert` devolve sempre um thenable que TAMBÉM oferece `.select()`.
 *
 * Não é capricho: com um `mockRejectedValue` simples, acrescentar `.select()` ao código deixaria uma
 * promise rejeitada órfã e o Node derrubaria o worker do jest — o mutante seria "detectado" por um
 * crash, e o próximo mantenedor receberia um diagnóstico errado sobre o que quebrou. Assim a
 * asserção falha, legivelmente.
 */
const respondeCom = (valor: unknown, rejeita = false) => ({
  select: mockSelect,
  then: (ok: (v: unknown) => void, falha: (e: unknown) => void) =>
    (rejeita ? falha(valor) : ok(valor)),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockResolvedValue({ error: null });
  mockInsert.mockReturnValue(respondeCom({ error: null }));
});

describe('sanitizeHealthDetails — só número e conjunto fechado (AC10)', () => {
  it('mantém números', () => {
    expect(sanitizeHealthDetails({ pages: 14, records: 364 })).toEqual({ pages: 14, records: 364 });
  });

  it('mantém booleanos', () => {
    expect(sanitizeHealthDetails({ usedGrid: false })).toEqual({ usedGrid: false });
  });

  it('DESCARTA qualquer string, mesmo curta e aparentemente inofensiva', () => {
    // Uma cauda de e-mail ("m", "l.com") ou um sobrenome cabem nesta categoria.
    expect(sanitizeHealthDetails({ nome: 'Exemplo, Fulana', tail: 'l.com', n: 3 })).toEqual({ n: 3 });
  });

  it('descarta objetos e arrays aninhados, por onde texto entraria escondido', () => {
    expect(sanitizeHealthDetails({ amostra: ['Exemplo'], meta: { nome: 'Exemplo' }, n: 1 })).toEqual({ n: 1 });
  });

  it('descarta NaN e Infinity, que viram null no JSON e confundem a leitura', () => {
    expect(sanitizeHealthDetails({ a: NaN, b: Infinity, c: 0 })).toEqual({ c: 0 });
  });
});

describe('reportHealthEvent — a escrita', () => {
  it('grava tipo, ala, versão e plataforma', async () => {
    await reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 14 });

    expect(supabase.from).toHaveBeenCalledWith('app_health_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ward_id: 'ward-1',
        event_type: 'pdf_import_fallback',
        details: { pages: 14 },
        app_version: '2.0.0',
      })
    );
  });

  it('passa o details pelo filtro antes de enviar (AC10)', async () => {
    await reportHealthEvent('ward-1', 'pdf_import_fallback', { nome: 'Exemplo, Fulana', pages: 14 });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ details: { pages: 14 } }));
  });

  it('NÃO pede a linha de volta — a tabela não tem policy de SELECT', async () => {
    // O retorno é um thenable que TAMBÉM oferece .select(), resolvendo normalmente: se alguém
    // acrescentar .select() no código, esta asserção falha de forma legível. Um mock que quebrasse
    // nesse caso derrubaria o worker do jest e daria ao próximo mantenedor um diagnóstico errado.
    await reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 14 });

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe('reportHealthEvent — nunca atrapalha quem o chama (AC11, AC12)', () => {
  it('não rejeita quando o Supabase devolve erro', async () => {
    mockInsert.mockReturnValue(respondeCom({ error: { message: 'row-level security' } }));

    await expect(reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 1 })).resolves.toBeUndefined();
  });

  it('não rejeita quando a chamada explode', async () => {
    mockInsert.mockReturnValue(respondeCom(new Error('network down'), true));

    await expect(reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 1 })).resolves.toBeUndefined();
  });

  it('não tenta nada quando não há ala — e não explode por isso', async () => {
    await expect(reportHealthEvent(null, 'pdf_import_fallback', { pages: 1 })).resolves.toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('escreve direto no Supabase, sem intermediário que pudesse enfileirar (AC12)', async () => {
    // A versão anterior deste teste mockava offlineQueue e afirmava que `enqueue` não foi chamado —
    // vacuamente verdadeiro, porque appHealth nem importa esse módulo. Passaria contra qualquer
    // implementação que enfileirasse por outro caminho. O que dá para afirmar de verdade é que a
    // escrita vai direto à tabela na mesma chamada, e é isso que garante que nada é reenviado
    // depois: um diagnóstico fora de contexto três dias atrasado é ruído.
    await reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 1 });

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('quando a escrita falha, o evento é PERDIDO e não guardado para depois', async () => {
    mockInsert.mockReturnValue(respondeCom(new Error('network down'), true));
    await reportHealthEvent('ward-1', 'pdf_import_fallback', { pages: 1 });

    expect(mockInsert).toHaveBeenCalledTimes(1); // uma tentativa, sem retry nem fila
  });
});
