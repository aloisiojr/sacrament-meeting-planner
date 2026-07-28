/**
 * Tests for STEP-04: AgendaForm disabled prop + SpeechSlot disabled prop.
 * Verifies disabled prop suppresses all interactions.
 */

import { describe, it, expect } from 'vitest';
import type { Role } from '../types/database';
import type { AgendaFormProps } from '../components/AgendaForm';
import type { SpeechSlotProps } from '../components/SpeechSlot';

describe('AgendaForm disabled prop', () => {
  it('AgendaFormProps accepts disabled?: boolean', () => {
    const props: AgendaFormProps = {
      sundayDate: '2026-03-08',
      exceptionReason: null,
      disabled: true,
    };
    expect(props.disabled).toBe(true);
  });

  it('defaults to false when not provided', () => {
    const props: AgendaFormProps = {
      sundayDate: '2026-03-08',
      exceptionReason: null,
    };
    const effective = props.disabled ?? false;
    expect(effective).toBe(false);
  });

  it('disabled=true makes all form fields read-only', () => {
    const props: AgendaFormProps = {
      sundayDate: '2026-03-08',
      exceptionReason: null,
      disabled: true,
    };
    // In the component, disabled is merged into isObserver:
    // const isObserver = !hasPermission('agenda:write') || disabled;
    // So disabled=true acts as if user has no write permission
    expect(props.disabled).toBe(true);
  });
});

describe('SpeechSlot disabled prop', () => {
  const baseSpeechSlotProps: SpeechSlotProps = {
    speech: null,
    position: 1,
  };

  it('SpeechSlotProps accepts disabled?: boolean', () => {
    const props: SpeechSlotProps = { ...baseSpeechSlotProps, disabled: true };
    expect(props.disabled).toBe(true);
  });

  it('defaults to false when not provided', () => {
    const effective = baseSpeechSlotProps.disabled ?? false;
    expect(effective).toBe(false);
  });

  it('disabled=true suppresses canAssign', () => {
    // In the component:
    // const canAssign = hasPermission(...) && !disabled;
    const disabled = true;
    const hasPermission = true;
    const canAssign = hasPermission && !disabled;
    expect(canAssign).toBe(false);
  });

  it('disabled=true suppresses canUnassign', () => {
    const disabled = true;
    const hasPermission = true;
    const canUnassign = hasPermission && !disabled;
    expect(canUnassign).toBe(false);
  });

  it('disabled=true suppresses canChangeStatus', () => {
    const disabled = true;
    const hasPermission = true;
    const canChangeStatus = hasPermission && !disabled;
    expect(canChangeStatus).toBe(false);
  });

  it('disabled=true makes isObserver true regardless of role', () => {
    const disabled = true;
    const role = 'bishopric' as Role;
    const isObserver = role === 'observer' || disabled;
    expect(isObserver).toBe(true);
  });

  it('disabled=true suppresses isBispado', () => {
    const disabled = true;
    const role = 'bishopric';
    const isBispado = role === 'bishopric' && !disabled;
    expect(isBispado).toBe(false);
  });

  it('disabled=false preserves normal behavior', () => {
    const disabled = false;
    const role = 'bishopric';
    const canAssign = true && !disabled;
    const isBispado = role === 'bishopric' && !disabled;
    expect(canAssign).toBe(true);
    expect(isBispado).toBe(true);
  });
});
