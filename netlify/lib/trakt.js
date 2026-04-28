// ========================================================
// lib/trakt.js
// Shared Trakt API configuration used by all Netlify functions.
// ========================================================

import fetch from "node-fetch";

export const TRAKT_BASE_URL = "https://api.trakt.tv";

/**
 * Headers for Trakt OAuth (`/oauth/token`) calls.
 *
 * Trakt's edge sometimes responds with HTML 403 if no User-Agent is set
 * (looks like a bot to Cloudflare). Send the same UA we use for API calls.
 */
function getOauthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "NextUp/2.5.0",
  };
}

function describeOauthFailure(prefix, status, text) {
  const trimmed = (text || "").trimStart();
  const isHtml =
    trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");

  if (isHtml) {
    return `${prefix}: ${status} — Trakt returned an HTML error page. Common causes: wrong "Redirect URI" in your Trakt OAuth app (it must exactly match the URL you use, e.g. http://localhost:8888 for netlify dev), missing/invalid TRAKT_CLIENT_SECRET, or rate-limit. Open the network tab to inspect the response.`;
  }

  return `${prefix}: ${status} ${text.slice(0, 400)}`;
}

/**
 * Builds the standard headers for Trakt API requests.
 *
 * @param {string} [token] - Optional Trakt OAuth access token.
 *   When provided, an Authorization header is included (needed for
 *   user-specific endpoints like /users/me/* or /sync/*).
 *   When omitted, only the client API key is sent (sufficient for
 *   public endpoints like /shows/*).
 * @returns {Object} Headers object ready for fetch()
 */
export function getTraktHeaders(token) {
  const headers = {
    "trakt-api-version": "2",
    "trakt-api-key": process.env.TRAKT_CLIENT_ID,
    "Content-Type": "application/json",
    "User-Agent": "NextUp/2.5.0",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Exchanges a Trakt OAuth authorization code for access and refresh tokens.
 *
 * @param {string} code - Authorization code from Trakt redirect
 * @param {string} redirectUri - Must match the redirect_uri used in the authorization request
 * @returns {Promise<Object>} Token response: { access_token, refresh_token, expires_in, created_at, ... }
 * @throws {Error} If the exchange fails
 */
export async function exchangeTraktCode(code, redirectUri) {
  if (!process.env.TRAKT_CLIENT_ID || !process.env.TRAKT_CLIENT_SECRET) {
    throw new Error(
      "Missing TRAKT_CLIENT_ID or TRAKT_CLIENT_SECRET in environment.",
    );
  }

  const res = await fetch(`${TRAKT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: getOauthHeaders(),
    body: JSON.stringify({
      code,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      "[exchangeTraktCode] Trakt /oauth/token error",
      res.status,
      "redirect_uri:",
      redirectUri,
      "body[0..300]:",
      text.slice(0, 300),
    );
    throw new Error(describeOauthFailure("Token exchange failed", res.status, text));
  }

  return res.json();
}

/**
 * Refreshes an expired Trakt access token using a refresh token.
 *
 * @param {string} refreshToken - The stored refresh token
 * @returns {Promise<Object>} New token response: { access_token, refresh_token, expires_in, created_at, ... }
 * @throws {Error} If the refresh fails (user may need to re-authenticate)
 */
/**
 * @param {string} refreshToken - Trakt refresh token
 * @param {string} [oauthRedirectUri] - Must match the redirect_uri used in the authorize + code exchange steps
 *   (e.g. http://localhost:8888 locally). Persisted per user after connect — see saveTraktTokens.
 */
export async function refreshTraktAccessToken(refreshToken, oauthRedirectUri) {
  const redirectUri =
    (typeof oauthRedirectUri === "string" && oauthRedirectUri.trim()) ||
    process.env.TRAKT_REDIRECT_URI?.trim?.() ||
    process.env.URL?.trim?.() ||
    "urn:ietf:wg:oauth:2.0:oob";

  const res = await fetch(`${TRAKT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: getOauthHeaders(),
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      "[refreshTraktAccessToken] Trakt /oauth/token error",
      res.status,
      "redirect_uri:",
      redirectUri,
      "body[0..300]:",
      text.slice(0, 300),
    );
    throw new Error(describeOauthFailure("Token refresh failed", res.status, text));
  }

  return res.json();
}
