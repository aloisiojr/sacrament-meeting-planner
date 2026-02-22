/**
 * Activity logging utility.
 * Logs user actions to the activity_log table.
 * Called from mutation hooks on successful operations.
 *
 * NOT logged: auto-assignment, lazy creation, push processing,
 * token registration, invalid token cleanup.
 *
 * Description format (ADR-062):
 * Pipe-delimited "action_type|k=v|k=v" stored in DB.
 * buildLogDescription() creates the structured string.
 * parseLogDescription() parses it back to action_type + params.
 * formatLogDescription() translates and renders for display.
 */

import { supabase } from './supabase';
import type { TFunction } from 'i18next';

// --- Structured Log Description ---

/**
 * Build a pipe-delimited log description for storage.
 * Format: "action_type|key1=value1|key2=value2"
 *
 * Values are escaped: '|' -> '\\|', '=' -> '\\='
 *
 * @example buildLogDescription('member:create', { nome: 'Maria Silva' })
 *   => "member:create|nome=Maria Silva"
 */
export function buildLogDescription(actionType: string, params: Record<string, string | number>): string {
  const parts = [actionType];
  for (const [key, value] of Object.entries(params)) {
    const escapedValue = String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/=/g, '\\=');
    parts.push(`${key}=${escapedValue}`);
  }
  return parts.join('|');
}

/**
 * Parse a pipe-delimited log description back to action_type + params.
 * Returns null if the string is not in structured format (no '|').
 *
 * @example parseLogDescription("member:create|nome=Maria Silva")
 *   => { actionType: 'member:create', params: { nome: 'Maria Silva' } }
 */
export function parseLogDescription(description: string): { actionType: string; params: Record<string, string> } | null {
  if (!description.includes('|')) return null;

  // Split on unescaped pipes
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < description.length; i++) {
    if (description[i] === '\\' && i + 1 < description.length) {
      current += description[i + 1];
      i++;
    } else if (description[i] === '|') {
      parts.push(current);
      current = '';
    } else {
      current += description[i];
    }
  }
  parts.push(current);

  if (parts.length < 1) return null;

  const actionType = parts[0];
  const params: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // Find unescaped '='
    let eqIdx = -1;
    for (let j = 0; j < part.length; j++) {
      if (part[j] === '\\' && j + 1 < part.length) {
        j++;
        continue;
      }
      if (part[j] === '=') {
        eqIdx = j;
        break;
      }
    }
    if (eqIdx >= 0) {
      const key = part.substring(0, eqIdx);
      const value = part.substring(eqIdx + 1);
      params[key] = value;
    }
  }

  return { actionType, params };
}

/**
 * Actor role i18n key mapping.
 * Maps database role fields to i18n keys for display.
 */
const ACTOR_ROLE_I18N_KEYS: Record<string, string> = {
  can_preside: 'activityLog.actorRoles.preside',
  can_conduct: 'activityLog.actorRoles.conduct',
  can_recognize: 'activityLog.actorRoles.recognize',
  can_pianist: 'activityLog.actorRoles.pianist',
  can_conductor: 'activityLog.actorRoles.conductor',
};

/**
 * Format a structured log description for display using i18n.
 * Falls back to raw description for old-format entries (no '|').
 *
 * @param description - The raw description from the database
 * @param t - The i18next translation function
 * @returns Human-readable translated description
 */
export function formatLogDescription(description: string, t: TFunction): string {
  const parsed = parseLogDescription(description);
  if (!parsed) return description; // Fallback: old plain-text format

  const { actionType, params } = parsed;

  // Normalize action_type for i18n key: 'member:create' -> 'member_create'
  const i18nKey = `activityLog.events.${actionType.replace(/[:-]/g, '_')}`;

  // Build interpolation params
  const interpolation: Record<string, string> = { ...params };

  // Translate speech status if present
  if (params.status) {
    interpolation.status = t(`speechStatus.${params.status}`, params.status);
  }

  // Translate actor role if present
  if (params.funcao) {
    const roleKey = ACTOR_ROLE_I18N_KEYS[params.funcao];
    interpolation.funcao = roleKey ? t(roleKey, params.funcao) : params.funcao;
  }

  // Translate sunday type if present
  if (params.tipo) {
    interpolation.tipo = t(`sundayExceptions.${params.tipo}`, params.tipo);
  }

  const result = t(i18nKey, interpolation);

  // If the translation returns the key itself, fall back to raw description
  if (result === i18nKey) return description;

  return result;
}

// --- Core Logging Functions ---

/**
 * Log an action to the activity_log table.
 * Non-blocking: errors are caught and logged to console but do not propagate.
 *
 * @param wardId - The ward ID
 * @param userId - The user ID performing the action
 * @param userEmail - The user's email
 * @param actionType - Machine-readable action type (e.g., 'member:create')
 * @param description - Structured pipe-delimited description or plain text
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
