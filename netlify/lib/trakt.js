// ========================================================
// lib/trakt.js
// Shared Trakt API configuration used by all Netlify functions.
// ========================================================

import fetch from "node-fetch";

export const TRAKT_BASE_URL = "https://api.trakt.tv";

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
  const res = await fetch(`${TRAKT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
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
export async function refreshTraktAccessToken(refreshToken) {
  const res = await fetch(`${TRAKT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: process.env.URL || "urn:ietf:wg:oauth:2.0:oob",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}
