/**
 * SearchInput: Reusable search TextInput with a clear (X) button.
 * Uses useTheme() internally for colors (ADR-030).
 */

import React from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export interface SearchInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchInput({ value, onChangeText, style, ...rest }: SearchInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.inputBorder,
            backgroundColor: colors.inputBackground,
          },
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {value.length > 0 && (
        <Pressable
          style={styles.clearButton}
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text style={[styles.clearText, { color: colors.textSecondary }]}>
            {'\u00D7'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingRight: 36,
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  clearText: {
    fontSize: 18,
    lineHeight: 20,
  },
});
