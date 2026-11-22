import { getAccessToken, getSession } from "../stores/userStore.js";
import { toastError, toastSuccess } from "../ui/toast.js";
import {
  createCodeChallenge,
  createCodeVerifier,
  storeCodeVerifier,
  takeCodeVerifier,
} from "../utils/pkce.js";

const TRAKT_AUTHORIZE_URL = "https://auth.trakt.tv/oauth/authorize";

/**
 * Handle Trakt OAuth redirect callback (authorization code + PKCE).
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

  const oauthError = params.get("error");
  const clearOauthParams = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (oauthError) {
    clearOauthParams();
    toastError(
      `Trakt authorization failed: ${params.get("error_description") || oauthError}`,
    );
    return;
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error(
        "You are not signed in to NextUp. Sign in, then use Reconnect Trakt again.",
      );
    }

    const redirectUri = window.location.origin;
    const codeVerifier = takeCodeVerifier();
    if (!codeVerifier) {
      throw new Error(
        "Trakt sign-in could not finish (missing PKCE verifier). Use Reconnect Trakt again from this same browser/app.",
      );
    }

    const res = await fetch("/.netlify/functions/traktAuth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code, redirectUri, codeVerifier }),
    });

    if (!res.ok) {
      let message = `Token exchange failed (${res.status})`;
      try {
        const payload = await res.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* non-JSON */
      }
      throw new Error(message);
    }

    clearOauthParams();
    toastSuccess("Trakt connected. You can sync now.");
    console.info("Trakt account connected");
  } catch (err) {
    clearOauthParams();
    console.error("Failed to exchange Trakt auth code:", err.message);
    toastError(err.message || "Failed to connect Trakt");
  }
}

/**
 * Redirect the user to Trakt OAuth authorization page (code + PKCE flow).
 */
export async function connectTraktAccount() {
  try {
    const res = await fetch("/.netlify/functions/getClientId");
    if (!res.ok) throw new Error("Failed to load Trakt client ID");

    const { clientId } = await res.json();
    if (!clientId) throw new Error("Trakt client ID is not configured");

    const redirectUri = window.location.origin;
    const verifier = createCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    storeCodeVerifier(verifier);

    const authUrl =
      `${TRAKT_AUTHORIZE_URL}` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent("public offline_access")}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&code_challenge_method=S256`;

    window.location.assign(authUrl);
  } catch (err) {
    console.error("Trakt OAuth init failed:", err.message);
    toastError(err.message || "Could not start Trakt sign-in");
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
  const accessToken = (await getAccessToken()) || getSession()?.access_token;
  if (!accessToken) {
    throw new Error("Not signed in");
  }

  const res = await fetch("/.netlify/functions/syncTraktAccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
