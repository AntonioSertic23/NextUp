// ========================================================
// services/traktService.js
// ========================================================

import { getSupabaseClient } from "./supabaseService.js";
import { getUser, getSession } from "../stores/userStore.js";

/**
 * Persist the authenticated user's Trakt OAuth token.
 *
 * @param {string} token - Trakt OAuth access token
 * @throws {Error} If user is not authenticated or DB update fails
 */
async function saveTraktToken(token) {
  const SUPABASE = await getSupabaseClient();

  const { id: userId } = getUser();

  const { error } = await SUPABASE.from("users")
    .update({ trakt_token: token })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Handle Trakt OAuth redirect callback.
 *
 * - Extracts access_token from URL hash
 * - Saves token to database
 * - Removes OAuth data from URL
 *
 * Should be called once on app startup.
 */
export async function handleTraktAuthRedirect() {
  const hash = window.location.hash;
  if (!hash.includes("access_token")) return;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get("access_token");
  if (!token) return;

  try {
    await saveTraktToken(token);
    console.info("Trakt token saved");

    // Clean URL without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (err) {
    console.error("Failed to store Trakt token:", err.message);
  }
}

/**
 * Redirect the user to Trakt OAuth authorization page.
 *
 * Uses implicit OAuth flow (response_type=token).
 */
export async function connectTraktAccount() {
  try {
    const res = await fetch("/.netlify/functions/getClientId");
    if (!res.ok) throw new Error("Failed to load Trakt client ID");

    const { clientId } = await res.json();
    const redirectUri = window.location.origin;

    const authUrl =
      `https://trakt.tv/oauth/authorize` +
      `?response_type=token` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.assign(authUrl);
  } catch (err) {
    console.error("Trakt OAuth init failed:", err.message);
  }
}

/**
 * Trigger backend synchronization of Trakt data.
 *
 * - Authenticates request using Supabase session
 * - Backend reads Trakt token from database
 *
 * @throws {Error} If request fails
 */
export async function syncTraktAccount() {
  const { access_token } = getSession();

  const res = await fetch("/.netlify/functions/syncTraktAccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Sync failed: ${message}`);
  }
}
