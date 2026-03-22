import { getSession } from "../stores/userStore.js";

/**
 * Handle Trakt OAuth redirect callback (authorization code flow).
 *
 * After the user authorizes on Trakt, they are redirected back with
 * `?code=AUTH_CODE` in the query string. This function detects that code,
 * sends it to the backend for token exchange, and cleans the URL.
 *
 * Must run after initUserStore() so the Supabase session is available.
 */
export async function handleTraktAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  try {
    const { access_token } = getSession();
    const redirectUri = window.location.origin;

    const res = await fetch("/.netlify/functions/traktAuth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || `Token exchange failed (${res.status})`);
    }

    console.info("Trakt account connected");
  } catch (err) {
    console.error("Failed to exchange Trakt auth code:", err.message);
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Redirect the user to Trakt OAuth authorization page (code flow).
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
 * Trigger backend synchronization of Trakt watch history.
 * Authenticates using the Supabase session; the backend reads
 * the Trakt token from the database.
 *
 * @throws {Error} If the sync request fails
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
