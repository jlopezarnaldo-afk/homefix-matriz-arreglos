/**
 * HomeFix Supabase Client Configuration & Shared Cloud Auth
 * 
 * Configures the Supabase client with live cloud connectivity and shared credentials
 * to provide instantaneous multi-device synchronization across phones and PCs.
 */

import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://wnnnlvgrmeijijnjzqdh.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dYQBl7KxTEc_zlbcO6Soag_jjkQdS31';
export const SUPABASE_AUTH_EMAIL = 'taller-mk4@sistema.interno';
export const SUPABASE_AUTH_PASSWORD = 'Mk4_TallerSeguro_2026!';

const nodeProcessEnv = typeof globalThis !== 'undefined' ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env : undefined;

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  nodeProcessEnv?.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  nodeProcessEnv?.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

let authPromise: Promise<boolean> | null = null;

/**
 * Ensures shared authenticated session for multi-device sync
 */
export async function ensureSupabaseAuth(): Promise<boolean> {
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData && sessionData.session) {
        return true;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: SUPABASE_AUTH_EMAIL,
        password: SUPABASE_AUTH_PASSWORD
      });
      if (error) {
        console.warn('[HomeFix Supabase Auth Warning]:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[HomeFix Supabase Auth Error]:', e);
      return false;
    }
  })();

  return authPromise;
}

/**
 * Checks whether Supabase client is configured with non-empty URL and Key.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
