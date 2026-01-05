// ========================================================
// database.js - Supabase client and data utilities
// ========================================================

import { getToken } from "./services/authService.js";
import { getSupabaseClient } from "./services/supabaseService.js";
import { getUser } from "./stores/userStore.js";

/**
 * Fetches the watchlist data for a specific user list.
 *
 * Notes:
 * - This uses a Netlify serverless function for secure data retrieval.
 * - `token` is the user's Trakt OAuth token.
 *
 * @returns {Promise<Array<Object>>} Array of watchlist items
 * @throws {Error} If the fetch fails or response is invalid
 */
export async function getWatchlistData() {
  const listId = await getDefaultListId();

  const token = await getToken();

  const res = await fetch("/.netlify/functions/getWatchlistData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, listId }),
  });

  return await res.json();
}

/**
 * Get the default list ID for a given user.
 *
 * @returns {Promise<string|null>} The default list ID, or null if not found / error
 */
export async function getDefaultListId() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  try {
    const { data: list, error } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error) {
      console.error("Error fetching default list:", error.message);
      return null;
    }

    return list?.id ?? null;
  } catch (err) {
    console.error("Unexpected error fetching default list:", err);
    return null;
  }
}
