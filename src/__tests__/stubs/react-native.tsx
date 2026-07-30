/**
 * Test-only stub for `react-native`, wired via a vitest resolve alias (see vitest.config.ts).
 *
 * Why: vitest (`environment: node`) cannot parse the real `react-native` (Flow syntax in
 * react-native/index.js). This stub renders each RN primitive as a plain host element via
 * React.createElement, so components can be rendered with `react-test-renderer` in node — no
 * jsdom, no react-native-web, no extra deps. Type-checking of production code still uses the
 * real RN types (tsc does not use this alias).
 */
import React from 'react';

type StubProps = Record<string, unknown> & { children?: React.ReactNode };

function host(name: string): React.FC<StubProps> {
  const Component: React.FC<StubProps> = (props) => React.createElement(name, props);
  Component.displayName = name;
  return Component;
}

export const View = host('View');
export const Text = host('Text');
export const TextInput = host('TextInput');
export const TouchableOpacity = host('TouchableOpacity');
export const TouchableHighlight = host('TouchableHighlight');
export const TouchableWithoutFeedback = host('TouchableWithoutFeedback');
export const Pressable = host('Pressable');
export const ScrollView = host('ScrollView');
export const FlatList = host('FlatList');
export const SectionList = host('SectionList');
export const ActivityIndicator = host('ActivityIndicator');
export const KeyboardAvoidingView = host('KeyboardAvoidingView');
export const Modal = host('Modal');
export const Switch = host('Switch');
export const Image = host('Image');
export const SafeAreaView = host('SafeAreaView');
export const RefreshControl = host('RefreshControl');

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  flatten: <T,>(styles: T): T => styles,
  hairlineWidth: 1,
  absoluteFill: {} as Record<string, number>,
  absoluteFillObject: {} as Record<string, number>,
};

export const Platform = {
  OS: 'ios' as const,
  select: (spec: { ios?: unknown; android?: unknown; default?: unknown }) =>
    spec.ios ?? spec.default,
  Version: 1,
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812, scale: 2, fontScale: 2 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const Alert = { alert: (..._args: unknown[]) => {} };

// Test stub: expose the config as `panHandlers` so tests can invoke the named callbacks
// (onPanResponderGrant/Move/Release, etc.) directly on the host element's props.
export const PanResponder = {
  create: (config: Record<string, unknown>) => ({ panHandlers: { ...config } }),
};

const ReactNativeStub = {
  View, Text, TextInput, TouchableOpacity, TouchableHighlight,
  TouchableWithoutFeedback, Pressable, ScrollView, FlatList, SectionList,
  ActivityIndicator, KeyboardAvoidingView, Modal, Switch, Image, SafeAreaView,
  RefreshControl, StyleSheet, Platform, Dimensions, Alert, PanResponder,
};

export default ReactNativeStub;
