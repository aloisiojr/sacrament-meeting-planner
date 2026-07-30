/**
 * Push notification hooks: token registration and notification handling.
 * Registers Expo push token on app mount (non-observers only).
 * Handles notification taps by navigating to Home tab.
 *
 * Pure utility functions (ordinals, text builders) are in lib/notificationUtils.ts.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// --- Notification display configuration ---

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- Token Registration ---

/**
 * Register Expo push token on app mount.
 * Observer role does NOT register (they don't receive notifications).
 * Token is upserted: updated on every login/app open.
 * Deferred to next app opening if offline.
 */
export function useRegisterPushToken(isOnline: boolean): void {
  const { user, role, wardId, hasPermission } = useAuth();
  // Remember which identity we last registered for, so an in-session ward/role switch
  // re-registers the token (a single boolean would leave the token's ward_id stale).
  const registeredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Gate by permission, not role: observers lack push:receive and don't register.
    if (!user || !wardId || !hasPermission('push:receive')) return;
    const registrationKey = `${user.id}:${wardId}:${role}`;
    if (registeredKeyRef.current === registrationKey) return;
    if (!isOnline) return; // Defer to next app opening with connection

    const userId = user.id;
    let cancelled = false;

    async function register() {
      try {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.warn('Push token registration skipped: projectId not available');
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const expoPushToken = tokenData.data;

        if (cancelled) return;

        // Android channel setup
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        // Upsert token in device_push_tokens (role for SQL filtering; app_version/platform
        // let the update-nudge job target outdated clients).
        const { error } = await supabase
          .from('device_push_tokens')
          .upsert(
            {
              user_id: userId,
              ward_id: wardId,
              expo_push_token: expoPushToken,
              role,
              app_version: Constants.expoConfig?.version ?? null,
              platform: Platform.OS,
            },
            {
              onConflict: 'user_id,expo_push_token',
            }
          );

        if (error) {
          console.warn('Failed to register push token:', error.message);
        } else {
          registeredKeyRef.current = registrationKey;
        }
      } catch (err) {
        console.warn('Push token registration error:', err);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [user, role, wardId, isOnline, hasPermission]);
}

// --- Notification Preference (master opt-out) ---

const notificationPrefKey = (userId: string | undefined) => ['notificationsEnabled', userId];

/**
 * Read the current user's master push opt-out. Enabled unless every one of the user's device
 * tokens is disabled; treated as enabled when there are no tokens yet (default state).
 */
export function useNotificationsEnabled(): { enabled: boolean; isLoading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: notificationPrefKey(user?.id),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('device_push_tokens')
        .select('notifications_enabled')
        .eq('user_id', user!.id);
      if (error) throw error;
      if (!data || data.length === 0) return true; // no devices yet → default on
      return data.some((t) => t.notifications_enabled);
    },
    enabled: !!user,
  });

  return { enabled: data ?? true, isLoading };
}

/**
 * Toggle the master push opt-out across all of the user's device tokens. process-notifications
 * only sends to tokens with notifications_enabled = true (migration 046).
 */
export function useSetNotificationsEnabled() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('device_push_tokens')
        .update({ notifications_enabled: enabled })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPrefKey(user?.id) });
    },
  });
}

// --- Notification Handler ---

/**
 * Handle notification taps: navigate to Home tab.
 * Registered on app mount.
 */
export function useNotificationHandler(): void {
  const router = useRouter();

  const handleResponse = useCallback(
    (_response: Notifications.NotificationResponse) => {
      // Navigate to Home tab on any notification tap
      router.replace('/(tabs)');
    },
    [router]
  );

  useEffect(() => {
    // Handle notification taps when app is in foreground/background
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Handle notification taps when app was killed (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleResponse(response);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleResponse]);
}
