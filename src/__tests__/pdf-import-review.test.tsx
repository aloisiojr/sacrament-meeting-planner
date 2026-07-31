/**
 * S7 — PdfImportReview behavioral test (AC7/AC9/AC10 UI). Verifies the confirmed apply payload:
 * inserts all new; phone conflicts default to the app's number (excluded) unless switched to PDF;
 * removals default to none unless a member is toggled on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { PdfImportReview } from '../components/PdfImportReview';
import type { MergePlan } from '../lib/memberMergePlan';
import type { MemberImportApply } from '../hooks/useApplyMemberImport';
import type { Member } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#777', primary: '#07f', divider: '#333', error: '#f00', errorContainer: '#300' } }),
}));

const member = (id: string, full_name: string, phone: string | null = null): Member =>
  ({ id, ward_id: 'w', full_name, informal_name: null, country_code: '+55', phone,
     can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
     can_be_recognized: false, contact_via_responsible: false, responsible_id: null, calling: null,
     created_at: '', updated_at: '' } as Member);

function makePlan(): MergePlan {
  return {
    toInsert: [
      { name: 'New One', phone: '+5511999990000', age: 30 },
      { name: 'New Two', phone: null, age: 20 },
    ],
    toUpdate: [{ member: member('m-up', 'Fill Phone'), phone: '+5511900000011' }],
    phoneConflicts: [
      { member: member('m-cf', 'Conflict Guy', '11955551111'), appPhone: '5511955551111', pdfPhone: '+5511977772222' },
    ],
    absentInDb: [member('m-ab', 'Absent Person')],
    unchanged: 3,
  };
}

function render(onApply: ReturnType<typeof vi.fn>, plan = makePlan()) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(PdfImportReview, {
        plan,
        unrepaired: [],
        onCancel: vi.fn(),
        onApply: onApply as unknown as (a: MemberImportApply) => void,
      })
    );
  });
  return r;
}

function press(r: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => { (r.root.findAll((n) => n.props?.testID === testID)[0].props.onPress as () => void)(); });
}
function toggle(r: TestRenderer.ReactTestRenderer, testID: string, v: boolean) {
  act(() => { (r.root.findAll((n) => n.props?.testID === testID)[0].props.onValueChange as (x: boolean) => void)(v); });
}

describe('PdfImportReview', () => {
  let onApply: ReturnType<typeof vi.fn>;
  beforeEach(() => { onApply = vi.fn(); });

  it('defaults: inserts all, phone-fill updates, conflicts keep app (excluded), no removals', () => {
    const r = render(onApply);
    press(r, 'pdf-import-confirm');
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual({
      inserts: [{ name: 'New One', phone: '+5511999990000' }, { name: 'New Two', phone: null }],
      phoneUpdates: [{ id: 'm-up', phone: '+5511900000011' }], // conflict NOT included (default app)
      removeIds: [],
    });
  });

  it('switching a conflict to PDF adds its phone update', () => {
    const r = render(onApply);
    press(r, 'pdf-conflict-pdf-m-cf');
    press(r, 'pdf-import-confirm');
    expect(onApply.mock.calls[0][0].phoneUpdates).toContainEqual({ id: 'm-cf', phone: '+5511977772222' });
  });

  it('toggling an absent member on marks it for removal', () => {
    const r = render(onApply);
    toggle(r, 'pdf-remove-m-ab', true);
    press(r, 'pdf-import-confirm');
    expect(onApply.mock.calls[0][0].removeIds).toEqual(['m-ab']);
  });
});
