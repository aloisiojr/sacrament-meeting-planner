import React, { Component } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import i18n from '../i18n';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  colors?: Partial<ThemeColors>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches rendering errors in its children.
 * Displays a fallback UI with i18n support and optional theme colors.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const c = this.props.colors;
      return (
        <View style={[styles.container, { backgroundColor: c?.background ?? '#FFFFFF' }]}>
          <Text style={[styles.title, { color: c?.text ?? '#333' }]}>
            {this.props.fallbackTitle ?? i18n.t('errors.boundaryTitle')}
          </Text>
          <Text style={[styles.message, { color: c?.textSecondary ?? '#666' }]}>
            {this.props.fallbackMessage ?? i18n.t('errors.boundaryMessage')}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={[styles.errorDetail, { backgroundColor: c?.surfaceVariant ?? '#f5f5f5' }]}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable
            style={[styles.button, { backgroundColor: c?.primary ?? '#007AFF' }]}
            onPress={this.handleReset}
          >
            <Text style={[styles.buttonText, { color: c?.onPrimary ?? '#FFFFFF' }]}>
              {i18n.t('common.retry')}
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * ThemedErrorBoundary: wraps ErrorBoundary with theme colors from ThemeContext.
 */
export function ThemedErrorBoundary(props: Omit<ErrorBoundaryProps, 'colors'>) {
  const { colors } = useTheme();
  return <ErrorBoundary {...props} colors={colors}>{props.children}</ErrorBoundary>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorDetail: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
