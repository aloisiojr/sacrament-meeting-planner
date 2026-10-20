/**
 * RAP-07 — PdfImportReview row memoization: with a ward-sized removals list, toggling one
 * row must not re-render the other rows. Render counts are taken at the AppSwitch each
 * row renders (mocked here purely as a render counter; behavior is covered elsewhere).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { PdfImportReview } from '../components/PdfImportReview';
import type { MergePlan } from '../lib/memberMergePlan';
import type { Member } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRenderCounts = new Map<string, number>();

jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next') as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#777',
      primary: '#07f', divider: '#333', error: '#f00', errorContainer: '#300',
    },
  }),
}));
jest.mock('../components/AppSwitch', () => ({
  AppSwitch: (props: { testID?: string }) => {
    if (props.testID) mockRenderCounts.set(props.testID, (mockRenderCounts.get(props.testID) ?? 0) + 1);
    return null;
  },
}));

const member = (id: string, full_name: string): Member =>
  ({ id, ward_id: 'w', full_name, informal_name: null, country_code: '+55', phone: null,
     can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
     can_be_recognized: false, contact_via_responsible: false, responsible_id: null, calling: null,
     created_at: '', updated_at: '' } as Member);

describe('PdfImportReview memo rows (RAP-07)', () => {
  it('toggling one removal in a long list does not re-render the other rows', () => {
    mockRenderCounts.clear();
    const absent = Array.from({ length: 30 }, (_, i) => member(`m${i}`, `Member ${i}`));
    const plan: MergePlan = { toInsert: [], toUpdate: [], phoneConflicts: [], absentInDb: absent, unchanged: 0 };
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        React.createElement(PdfImportReview, {
          plan,
          blanks: [],
          countryCode: '+55',
          areaCode: '',
          onCancel: jest.fn(),
          onApply: jest.fn(),
        })
      );
    });
    const renderedIds = [...mockRenderCounts.keys()].filter((k) => /^pdf-remove-m\d+$/.test(k));
    expect(renderedIds.length).toBeGreaterThan(3);
    const before = new Map(mockRenderCounts);

    const target = r.root.findAll((n) => n.props?.testID === 'pdf-remove-m0')[0];
    act(() => {
      (target.props.onValueChange as (v: boolean) => void)(true);
    });

    // The toggled row re-rendered (its value changed); every other row did not.
    expect(mockRenderCounts.get('pdf-remove-m0')).toBeGreaterThan(before.get('pdf-remove-m0') ?? 0);
    for (const id of renderedIds) {
      if (id === 'pdf-remove-m0') continue;
      expect(mockRenderCounts.get(id)).toBe(before.get(id));
    }
    act(() => r.unmount());
  });
});
