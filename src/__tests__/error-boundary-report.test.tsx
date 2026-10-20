/**
 * EST-07 — ErrorBoundary reporta via errorReporter; erro repetido é throttled (1 health event).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockReportHealthEvent = jest.fn(() => Promise.resolve());
jest.mock('../lib/appHealth', () => ({
  reportHealthEvent: (...a: unknown[]) => mockReportHealthEvent(...(a as [])),
}));

import { ErrorBoundary } from '../components/ErrorBoundary';
import { setErrorReporterWardId, resetErrorReporterForTests } from '../lib/errorReporter';

function Boom(): React.JSX.Element {
  throw new Error('boom repetido');
}

beforeEach(() => {
  jest.clearAllMocks();
  resetErrorReporterForTests();
  setErrorReporterWardId('ward-1');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  (console.error as jest.Mock).mockRestore?.();
});

describe('ErrorBoundary — EST-07', () => {
  it('reporta 1× sob erro repetido (throttle do reporter)', async () => {
    await render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(1);
    expect(mockReportHealthEvent).toHaveBeenCalledWith(
      'ward-1', 'app_error',
      expect.objectContaining({ fromBoundary: true, fromGlobalHandler: false })
    );
    // Reset mostra de novo o filho que lança o MESMO erro: o boundary captura de novo,
    // mas o throttle por assinatura suprime o segundo health event.
    fireEvent.press(screen.getByText(/retry|tentar/i));
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(1);
  });

  it('renderiza filhos sem erro e não reporta', async () => {
    await render(
      <ErrorBoundary>
        <Text>conteúdo ok</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('conteúdo ok')).toBeTruthy();
    expect(mockReportHealthEvent).not.toHaveBeenCalled();
  });
});
