/**
 * PKCE helpers for Trakt OAuth (S256).
 * @see https://developer.trakt.tv/docs/pkce
 */

const VERIFIER_KEY = "trakt_pkce_verifier";
const VERIFIER_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * @param {number} [length=64]
 * @returns {string}
 */
export function createCodeVerifier(length = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) {
    out += VERIFIER_CHARS[b % VERIFIER_CHARS.length];
  }
  return out;
}

/**
 * @param {string} verifier
 * @returns {Promise<string>} base64url SHA-256 challenge
 */
export async function createCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Persist verifier for the OAuth round-trip (survives leaving the origin). */
export function storeCodeVerifier(verifier) {
  try {
    sessionStorage.setItem(VERIFIER_KEY, verifier);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(VERIFIER_KEY, verifier);
  } catch {
    /* private mode */
  }
}

/** @returns {string|null} */
export function takeCodeVerifier() {
  let value = null;
  try {
    value = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (!value) value = localStorage.getItem(VERIFIER_KEY);
    localStorage.removeItem(VERIFIER_KEY);
  } catch {
    /* ignore */
  }
  return value;
}
