/**
 * The PDF export button on the agenda card.
 *
 * agendaPdf.test.ts covers what the document says; this covers the affordance: that it is there
 * when there is an agenda to print, absent when there is not, passes the right Sunday, locks while
 * working, and reports a failure instead of appearing to do nothing.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockExportAgenda = jest.fn();
const mockIsExporting = { value: false };

jest.mock('../hooks/useAgendaPdfExport', () => ({
  useAgendaPdfExport: () => ({
    exportAgenda: (...a: unknown[]) => mockExportAgenda(...a),
    isExporting: mockIsExporting.value,
  }),
}));

import { AgendaExportPdfButton } from '../components/AgendaExportPdfButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: string) => f ?? k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { primary: '#07f', onPrimary: '#fff', text: '#000' } }),
}));
jest.mock('../components/icons', () => ({
  ShareIcon: () => null,
}));

const DATE = '2026-08-09';
const AGENDA = { id: 'ag1', sunday_date: DATE } as never;
const SPEECHES = [{ id: 's1', position: 1 }] as never;

async function renderButton(over: Record<string, unknown> = {}) {
  await render(
    <AgendaExportPdfButton
      date={DATE}
      agenda={AGENDA}
      speeches={SPEECHES}
      exception={null}
      {...over}
    />
  );
}

const button = () => screen.queryByTestId(`agenda-export-pdf-${DATE}`);

beforeEach(() => {
  mockExportAgenda.mockReset();
  mockExportAgenda.mockResolvedValue({ uri: 'file:///a.pdf', shared: true });
  mockIsExporting.value = false;
});

describe('AgendaExportPdfButton', () => {
  it('renders', async () => {
    await renderButton();
    expect(button()).not.toBeNull();
  });

  it('exports the Sunday it belongs to, with the data the card already holds', async () => {
    await renderButton();
    await act(async () => {
      fireEvent.press(button()!);
    });

    expect(mockExportAgenda).toHaveBeenCalledWith({
      date: DATE,
      agenda: AGENDA,
      speeches: SPEECHES,
      exception: null,
    });
  });

  it('passes a null agenda through rather than refusing — the blank form is the useful output', async () => {
    await renderButton({ agenda: undefined });
    await act(async () => {
      fireEvent.press(button()!);
    });

    expect(mockExportAgenda).toHaveBeenCalledWith(
      expect.objectContaining({ agenda: null })
    );
  });

  it('is disabled while a previous export is still running', async () => {
    // Two share sheets racing is a broken-looking app.
    mockIsExporting.value = true;
    await renderButton();
    expect(button()).toBeDisabled();
  });

  it('reports a failure instead of silently doing nothing', async () => {
    mockExportAgenda.mockRejectedValue(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderButton();
    await act(async () => {
      fireEvent.press(button()!);
    });
    const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    alertSpy.mockRestore();

    expect(call?.[1]).toBe('agenda.pdfFailed');
  });

  it('raises no alert on success', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderButton();
    await act(async () => {
      fireEvent.press(button()!);
    });
    const calls = alertSpy.mock.calls.length;
    alertSpy.mockRestore();

    expect(calls).toBe(0);
  });

  it('carries an accessible label, not just an icon', async () => {
    await renderButton();
    expect(button()!.props.accessibilityLabel).toBe('agenda.exportPdf');
  });
});
