/**
 * EST-20 — getStartupGateState: a tabela inteira da decisão de startup.
 */
import { getStartupGateState } from '../lib/startupGate';

describe('getStartupGateState (EST-20)', () => {
  it('loading domina qualquer outra combinação', () => {
    expect(getStartupGateState({ loading: true, isAuthenticated: false, inAuthGroup: false })).toBe('loading');
    expect(getStartupGateState({ loading: true, isAuthenticated: true, inAuthGroup: true })).toBe('loading');
    expect(getStartupGateState({ loading: true, isAuthenticated: true, inAuthGroup: false })).toBe('loading');
  });

  it('sem sessão fora do grupo de auth, manda para o login', () => {
    expect(getStartupGateState({ loading: false, isAuthenticated: false, inAuthGroup: false })).toBe('redirect-login');
  });

  it('com sessão dentro do grupo de auth, manda para a home', () => {
    expect(getStartupGateState({ loading: false, isAuthenticated: true, inAuthGroup: true })).toBe('redirect-home');
  });

  it('pronto nos demais casos', () => {
    expect(getStartupGateState({ loading: false, isAuthenticated: true, inAuthGroup: false })).toBe('ready');
    expect(getStartupGateState({ loading: false, isAuthenticated: false, inAuthGroup: true })).toBe('ready');
  });
});
