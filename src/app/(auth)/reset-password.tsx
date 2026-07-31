import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { token, type } = useLocalSearchParams<{
    token?: string;
    type?: string;
  }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  // Mirror sessionReady for the timeout closure below (avoids a stale-capture read).
  const sessionReadyRef = useRef(false);
  useEffect(() => {
    sessionReadyRef.current = sessionReady;
  }, [sessionReady]);

  useEffect(() => {
    // Safety net: never spin forever. If no recovery session is established within the
    // window (no token, no PASSWORD_RECOVERY event, no existing session), surface an error
    // and an escape route instead of an infinite spinner.
    const timeoutId = setTimeout(() => {
      if (!sessionReadyRef.current) {
        setError((prev) => prev ?? t('auth.resetExpired'));
      }
    }, 8000);

    // New: Handle deep link token (primary path)
    if (token && type === 'recovery') {
      supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      }).then(({ error }) => {
        if (error) {
          setError(t('auth.resetExpired'));
        } else {
          setSessionReady(true);
        }
      });
      return () => clearTimeout(timeoutId); // Skip onAuthStateChange listener when token is present
    }

    // Existing: Listen for PASSWORD_RECOVERY event (fallback path)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Check if session already exists (user may already be authenticated)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // `t` is only used inside async callbacks; excluding it avoids re-subscribing
    // the auth listener on every language change. Effect keys off token/type only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, type]);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        // Check for expired/invalid token
        setError(t('auth.resetExpired'));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t('auth.resetExpired'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  if (!sessionReady) {
    // Recovery link invalid/expired or verification timed out: show the reason and an
    // escape to login instead of a spinner that never resolves.
    if (error) {
      return (
        <View
          style={[
            styles.container,
            styles.centered,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.formContainer}>
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: colors.errorContainer },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.backToLoginLink}
              onPress={handleBackToLogin}
            >
              <Text style={[styles.backToLoginText, { color: colors.primary }]}>
                {t('auth.backToLogin')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.resetPasswordTitle')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: colors.errorContainer },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          {success ? (
            <View style={styles.successContainer}>
              <Text style={[styles.successText, { color: colors.text }]}>
                {t('auth.passwordUpdated')}
              </Text>
              <TouchableOpacity
                style={styles.backToLoginLink}
                onPress={handleBackToLogin}
              >
                <Text
                  style={[styles.backToLoginText, { color: colors.primary }]}
                >
                  {t('auth.backToLogin')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('auth.newPassword')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.newPassword')}
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('auth.confirmPassword')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPassword')}
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                  onSubmitEditing={handleUpdatePassword}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  { backgroundColor: colors.primary },
                  loading && styles.updateButtonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.updateButtonText,
                      { color: colors.onPrimary },
                    ]}
                  >
                    {t('auth.updatePassword')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginLink}
                onPress={handleBackToLogin}
                disabled={loading}
              >
                <Text
                  style={[styles.backToLoginText, { color: colors.primary }]}
                >
                  {t('auth.backToLogin')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  updateButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
