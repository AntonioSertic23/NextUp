// ========================================================
// services/supabase.js
// ========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const CONFIG_KEY = "nextup_supabase_config";

function readCachedConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    return config?.url && config?.anonKey ? config : null;
  } catch {
    return null;
  }
}

// Supabase client - initialized lazily
let supabase = null;
/** @type {Promise<{url: string, anonKey: string}> | null} */
let configPromise = null;

/**
 * Fetches Supabase configuration from a Netlify serverless function.
 *
 * Notes:
 * - The result is cached to avoid repeated network requests.
 *
 * @returns {Promise<{url: string, anonKey: string}>} Supabase URL and anonymous key
 * @throws {Error} If fetching configuration fails
 */
async function fetchSupabaseConfig() {
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const res = await fetch("/.netlify/functions/getSupabaseConfig");
      const data = await res.json();
      const config = { url: data.url, anonKey: data.anonKey };
      if (config.url && config.anonKey) {
        try {
          localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch {
          /* storage unavailable */
        }
      }
      return config;
    } catch (error) {
      // Offline: reuse the last config (public URL + anon key only).
      const cached = readCachedConfig();
      if (cached) return cached;
      configPromise = null;
      console.error("Error fetching Supabase config:", error);
      throw error;
    }
  })();

  return configPromise;
}

/**
 * Returns a Supabase client singleton, initializing it if needed.
 *
 * Side effects:
 * - Initializes the client with localStorage persistence for auth sessions.
 * - Sets auto-refresh for session tokens.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  const config = await fetchSupabaseConfig();
  supabase = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // Implicit recovery links carry tokens in the URL hash, so the reset
      // email works in any browser. PKCE codes only work in the browser that
      // requested the reset, and `?code=` would collide with Trakt OAuth.
      flowType: "implicit",
    },
  });
  return supabase;
}
