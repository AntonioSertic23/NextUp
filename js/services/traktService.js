// ========================================================
// services/traktService.js
// ========================================================

import { getSession } from "../stores/userStore.js";

/**
 * Handle Trakt OAuth redirect callback (authorization code flow).
 *
 * - Extracts the authorization `code` from the URL query string
 * - Sends it to the server to exchange for access + refresh tokens
 * - Cleans up the URL
 *
 * Should be called once on app startup.
 */
export async function handleTraktAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  const { access_token } = getSession() || {};
  if (!access_token) {
    console.error("Cannot exchange Trakt code: no Supabase session");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/traktAuth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        code,
        redirectUri: window.location.origin,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    console.info("Trakt account connected successfully");
  } catch (err) {
    console.error("Failed to exchange Trakt code:", err.message);
  }

  // Clean URL without reloading (remove ?code=... from the address bar)
  window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Redirect the user to Trakt OAuth authorization page.
 *
 * Uses the authorization code flow (response_type=code) which provides
 * refresh tokens for automatic token renewal.
 */
export async function connectTraktAccount() {
  try {
    const res = await fetch("/.netlify/functions/getClientId");
    if (!res.ok) throw new Error("Failed to load Trakt client ID");

    const { clientId } = await res.json();
    const redirectUri = window.location.origin;

    const authUrl =
      `https://trakt.tv/oauth/authorize` +
      `?response_type=code` +
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
 * - Backend reads and auto-refreshes Trakt token from the database
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

/**
 * Trigger backend check for new episodes across all tracked shows.
 *
 * Calls the scheduled syncNextEpisodes function manually.
 * No authentication needed — the function uses the server-side
 * Trakt API key and Supabase service role.
 *
 * @returns {Promise<Object>} Sync results with updated/skipped/errors arrays
 * @throws {Error} If the request fails
 */
export async function syncNextEpisodes() {
  const res = await fetch("/.netlify/functions/syncNextEpisodes", {
    method: "POST",
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Episode sync failed: ${message}`);
  }

  return res.json();
}
