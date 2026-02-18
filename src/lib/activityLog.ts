/**
 * Activity logging utility.
 * Logs user actions to the activity_log table.
 * Called from mutation hooks on successful operations.
 *
 * NOT logged: auto-assignment, lazy creation, push processing,
 * token registration, invalid token cleanup.
 */

import { supabase } from './supabase';

/**
 * Log an action to the activity_log table.
 * Non-blocking: errors are caught and logged to console but do not propagate.
 *
 * @param wardId - The ward ID
 * @param userId - The user ID performing the action
 * @param userEmail - The user's email
 * @param actionType - Machine-readable action type (e.g., 'member:create')
 * @param description - Human-readable description in ward language
 * @param userName - Optional user display name
 */
export async function logAction(
  wardId: string,
  userId: string,
  userEmail: string,
  actionType: string,
  description: string,
  userName?: string
): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      ward_id: wardId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName || null,
      action_type: actionType,
      description,
    });
  } catch (err) {
    // Non-fatal: log creation should never block the main operation
    console.error('Activity log error:', err);
  }
}

/**
 * Convenience wrapper that extracts user info from Supabase auth.
 * Returns a function that can be called with actionType and description.
 */
export function createLogger(wardId: string, userId: string, userEmail: string, userName?: string) {
  return (actionType: string, description: string) =>
    logAction(wardId, userId, userEmail, actionType, description, userName);
}
