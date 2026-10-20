/**
 * Behavioral tests for DebouncedTextInput (P0-3 release fix + core debounce/flush behavior).
 * The RN stub renders TextInput as a host element; we drive onChangeText/onFocus/onBlur via props.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { DebouncedTextInput } from '../components/DebouncedTextInput';

global.IS_REACT_ACT_ENVIRONMENT = true;

const input = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n: any) => typeof n.type === 'string' && n.type === 'TextInput')[0] as any;

describe('DebouncedTextInput', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does NOT revert to a stale value when a newer external value arrives while unfocused (P0-3)', () => {
    const onSave = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<DebouncedTextInput value="A" onSave={onSave} />); });

    // External/realtime update A → B while the field is not focused.
    act(() => { r.update(<DebouncedTextInput value="B" onSave={onSave} />); });
    expect(input(r).props.value).toBe('B'); // local value tracks the external change

    // Navigating away (unmount) must not fire a spurious onSave('A').
    act(() => { r.unmount(); });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('flushes the user\'s edit on blur', () => {
    const onSave = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<DebouncedTextInput value="A" onSave={onSave} />); });

    act(() => input(r).props.onFocus({}));
    act(() => input(r).props.onChangeText('C'));
    act(() => input(r).props.onBlur({}));
    expect(onSave).toHaveBeenLastCalledWith('C');
  });

  it('debounces: saves once after the delay while typing', () => {
    const onSave = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<DebouncedTextInput value="" onSave={onSave} delay={800} />); });

    act(() => input(r).props.onFocus({}));
    act(() => input(r).props.onChangeText('h'));
    act(() => input(r).props.onChangeText('hi'));
    expect(onSave).not.toHaveBeenCalled(); // still within debounce window
    act(() => { jest.advanceTimersByTime(800); });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith('hi');
  });

  // EST-25: one flush path. After the debounce timer saves, blur and unmount must not save
  // the same text again just because the parent has not re-rendered with the new `value` yet.
  it('saves exactly once across timer, blur and unmount for the same text (EST-25)', () => {
    const onSave = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<DebouncedTextInput value="A" onSave={onSave} delay={800} />); });

    act(() => input(r).props.onFocus({}));
    act(() => input(r).props.onChangeText('B'));
    act(() => { jest.advanceTimersByTime(800); }); // timer saves 'B'
    act(() => input(r).props.onBlur({}));          // blur must not re-save
    act(() => { r.unmount(); });                   // unmount must not re-save
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith('B');
  });

  it('flushes a pending typed edit on unmount', () => {
    const onSave = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<DebouncedTextInput value="A" onSave={onSave} />); });

    act(() => input(r).props.onFocus({}));
    act(() => input(r).props.onChangeText('typed'));
    act(() => { r.unmount(); });
    expect(onSave).toHaveBeenLastCalledWith('typed');
  });
});
