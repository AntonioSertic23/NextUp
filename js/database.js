// ========================================================
// database.js - Supabase client and data utilities
// ========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

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
export async function fetchSupabaseConfig() {
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const res = await fetch("/.netlify/functions/getSupabaseConfig");
      const data = await res.json();
      return { url: data.url, anonKey: data.anonKey };
    } catch (error) {
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
    },
  });
  return supabase;
}

/**
 * Fetches the watchlist data for a specific user list.
 *
 * Notes:
 * - This uses a Netlify serverless function for secure data retrieval.
 * - `token` is the user's Trakt OAuth token.
 *
 * @param {string} token - Trakt OAuth token
 * @param {string} listId - The ID of the watchlist to fetch
 * @returns {Promise<Array<Object>>} Array of watchlist items
 * @throws {Error} If the fetch fails or response is invalid
 */
export async function getWatchlistData(token, listId) {
  const res = await fetch("/.netlify/functions/getWatchlistData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, listId }),
  });

  return await res.json();
}
