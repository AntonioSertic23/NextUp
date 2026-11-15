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

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    /* non-JSON body from the function / proxy */
  }

  if (!res.ok) {
    const base =
      data?.error ||
      (raw && raw.length < 400 ? raw : null) ||
      `Sync failed (${res.status})`;
    const detail = data?.detail
      ? typeof data.detail === "string"
        ? data.detail.slice(0, 280)
        : ""
      : "";
    throw new Error(detail ? `${base} ${detail}` : base);
  }

  return data;
}

const MAX_SYNC_ROUNDS = 40;

async function requestSyncChunk(offset) {
  const res = await fetch("/.netlify/functions/syncNextEpisodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offset }),
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    /* non-JSON body from the function / proxy */
  }

  if (!res.ok) {
    // Proxy errors come back as HTML pages; don't show markup to the user.
    const isHtml = /^\s*</.test(raw || "");
    const message =
      data?.error ||
      (!isHtml && raw && raw.length < 400 ? raw : null) ||
      (res.status === 504 || /timeout/i.test(raw || "")
        ? "The sync took too long to respond. Please try again; finished shows are skipped."
        : `Episode sync failed (${res.status}).`);
    throw new Error(message);
  }

  return data ?? {};
}

/**
 * Trigger the backend "new episodes" sync for all tracked shows.
 *
 * The HTTP handler works in time-limited chunks and returns `nextOffset`;
 * this keeps calling it until every show is processed. The daily cron uses
 * `syncNextEpisodes-background` instead — Netlify scheduled functions
 * cannot share a public URL with the Profile button.
 *
 * @param {{ onProgress?: (done: number, total: number) => void }} [options]
 * @returns {Promise<{message: string, updated: string[], skipped: string[], errors: Array<{show: string, error: string}>}>}
 * @throws {Error} If a request fails or the function returns a non-2xx status.
 */
export async function syncNewEpisodes({ onProgress } = {}) {
  const combined = { updated: [], skipped: [], errors: [] };
  let offset = 0;

  for (let round = 0; round < MAX_SYNC_ROUNDS; round++) {
    const data = await requestSyncChunk(offset);
    combined.updated.push(...(data.updated ?? []));
    combined.skipped.push(...(data.skipped ?? []));
    combined.errors.push(...(data.errors ?? []));

    const next = data.nextOffset;
    if (next == null || next <= offset) {
      return { message: data.message || "Sync completed", ...combined };
    }
    offset = next;
    onProgress?.(offset, data.total ?? 0);
  }

  return { message: "Sync stopped early; run it again to finish", ...combined };
}
