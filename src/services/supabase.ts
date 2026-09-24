/**
 * HomeFix Supabase Client Configuration
 * 
 * Initializes the official Supabase JavaScript client using environment variables
 * with seamless fallback to provided project credentials.
 */

import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://wnnnlvgrmeijijnjzqdh.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dYQBl7KxTEc_zlbcO6Soag_jjkQdS31';

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
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Checks whether Supabase client is configured with non-empty URL and Key.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
