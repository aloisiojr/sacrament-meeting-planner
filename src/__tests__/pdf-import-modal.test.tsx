/**
 * RAP-01 — PdfImportModal extraction-error surface: a failed/timed-out extraction shows a
 * visible, localized error with retry (remounting the extractor) instead of an eternal
 * spinner or an alert that closes the import. Extractor and data hooks are mocked.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { PdfImportModal } from '../components/PdfImportModal';
import { PDF_TIMEOUT } from '../lib/pdfExtraction';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockExtractor = {
  mounts: 0,
  props: null as null | { onError: (m: string) => void; onResult: (p: never[]) => void },
};

jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next') as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#777', primary: '#07f', divider: '#333', error: '#f00' },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ wardId: 'w1' }) }));
jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));
jest.mock('../hooks/useApplyMemberImport', () => ({
  useApplyMemberImport: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('../components/PdfTextExtractor', () => {
  const ReactLocal = require('react') as typeof React;
  return {
    PdfTextExtractor: (props: { onError: (m: string) => void; onResult: (p: never[]) => void }) => {
      ReactLocal.useEffect(() => {
        mockExtractor.mounts += 1;
      }, []);
      mockExtractor.props = props;
      return null;
    },
  };
});

function renderModal() {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(PdfImportModal, {
        visible: true,
        base64: 'QUJD',
        countryCode: '+55',
        areaCode: '11',
        onClose: jest.fn(),
      })
    );
  });
  return r;
}
const byTestID = (r: TestRenderer.ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props?.testID === id);

describe('PdfImportModal extraction error (RAP-01)', () => {
  it('shows the timeout error with retry, and retry remounts the extractor', () => {
    const r = renderModal();
    expect(mockExtractor.mounts).toBe(1);
    act(() => {
      mockExtractor.props?.onError(PDF_TIMEOUT);
    });
    const errors = byTestID(r, 'pdf-extract-error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].props.children).toBe('pdfImport.extractTimeout');
    // Retry: error clears and a fresh extractor mounts.
    act(() => {
      (byTestID(r, 'pdf-extract-retry')[0].props.onPress as () => void)();
    });
    expect(byTestID(r, 'pdf-extract-error').length).toBe(0);
    expect(mockExtractor.mounts).toBe(2);
    act(() => r.unmount());
  });
});
