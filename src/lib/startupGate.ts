/**
 * Decisão única de startup do `_layout` (EST-20). Antes o efeito de redirect e o
 * render de loading do NavigationGuard decidiam separadamente com condições
 * duplicadas que podiam divergir; agora os dois consomem esta função pura.
 */
export type StartupGateState = 'loading' | 'redirect-login' | 'redirect-home' | 'ready';

export interface StartupGateInput {
  loading: boolean;
  isAuthenticated: boolean;
  inAuthGroup: boolean;
}

export function getStartupGateState(input: StartupGateInput): StartupGateState {
  if (input.loading) return 'loading';
  if (!input.isAuthenticated && !input.inAuthGroup) return 'redirect-login';
  if (input.isAuthenticated && input.inAuthGroup) return 'redirect-home';
  return 'ready';
}
