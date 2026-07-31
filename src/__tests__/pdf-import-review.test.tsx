/**
 * S7 — PdfImportReview behavioral test (3-step wizard). Verifies the confirmed apply payload built
 * across steps: manual phone entry for a blank (step 1), phone conflicts defaulting to the app's
 * number unless toggled to PDF — individually or via the master toggle (step 2), and removals
 * defaulting to none unless toggled — individually or via the master toggle (step 3).
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

function render(onApply: ReturnType<typeof vi.fn>, blanks: { name: string; memberId?: string }[] = [], plan = makePlan()) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(PdfImportReview, {
        plan,
        blanks,
        countryCode: '+55',
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
function typeText(r: TestRenderer.ReactTestRenderer, testID: string, v: string) {
  act(() => { (r.root.findAll((n) => n.props?.testID === testID)[0].props.onChangeText as (x: string) => void)(v); });
}
/** Advance the wizard to the last step and press Finish (Próximo → … → Concluir). */
function finish(r: TestRenderer.ReactTestRenderer, steps: number) {
  for (let i = 0; i < steps; i++) press(r, 'pdf-next');
}

describe('PdfImportReview wizard', () => {
  let onApply: ReturnType<typeof vi.fn>;
  beforeEach(() => { onApply = vi.fn(); });

  it('defaults across all steps: inserts all, phone-fill only, conflicts keep app, no removals', () => {
    const r = render(onApply); // steps: conflicts, removals (no blanks) → 1 Próximo then Concluir
    finish(r, 2);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual({
      inserts: [{ name: 'New One', phone: '+5511999990000' }, { name: 'New Two', phone: null }],
      phoneUpdates: [{ id: 'm-up', phone: '+5511900000011' }],
      removeIds: [],
    });
  });

  it('step 1: a manually typed phone for a NEW blank member fills its insert', () => {
    const r = render(onApply, [{ name: 'New Two' }]); // steps: blanks, conflicts, removals
    typeText(r, 'pdf-blank-input-0', '11 98888-7777');
    finish(r, 3);
    const inserts = onApply.mock.calls[0][0].inserts;
    expect(inserts).toContainEqual({ name: 'New Two', phone: '+5511988887777' });
  });

  it('step 1: a manually typed phone for an EXISTING blank member adds a phone update', () => {
    const r = render(onApply, [{ name: 'Existing Blank', memberId: 'm-x' }]);
    typeText(r, 'pdf-blank-input-0', '+55 11 97777-0000');
    finish(r, 3);
    expect(onApply.mock.calls[0][0].phoneUpdates).toContainEqual({ id: 'm-x', phone: '+5511977770000' });
  });

  it('step 2: toggling a conflict to PDF (switch off) adds its phone update', () => {
    const r = render(onApply); // step 0 = conflicts (no blanks)
    toggle(r, 'pdf-conflict-toggle-m-cf', false); // false = use PDF
    finish(r, 2); // → removals → Concluir
    expect(onApply.mock.calls[0][0].phoneUpdates).toContainEqual({ id: 'm-cf', phone: '+5511977772222' });
  });

  it('step 2 master: moving all to PDF switches every conflict', () => {
    const r = render(onApply);
    toggle(r, 'pdf-conflict-master', false); // all → PDF
    finish(r, 2);
    expect(onApply.mock.calls[0][0].phoneUpdates).toContainEqual({ id: 'm-cf', phone: '+5511977772222' });
  });

  it('step 3: toggling an absent member on marks it for removal', () => {
    const r = render(onApply);
    finish(r, 1); // → removals (still on it)
    toggle(r, 'pdf-remove-m-ab', true);
    press(r, 'pdf-next'); // Concluir
    expect(onApply.mock.calls[0][0].removeIds).toEqual(['m-ab']);
  });

  it('step 3 master: selecting all marks every absent member for removal', () => {
    const r = render(onApply);
    finish(r, 1);
    toggle(r, 'pdf-remove-master', true);
    press(r, 'pdf-next');
    expect(onApply.mock.calls[0][0].removeIds).toEqual(['m-ab']);
  });
});
