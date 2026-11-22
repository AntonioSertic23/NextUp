// ========================================================
// stores/userStore.js -
// ========================================================

import { getSupabaseClient } from "../services/supabase.js";

let user = null;
let claims = null;
let session = null;
let initialized = false;

/**
 * Loads user and claims from Supabase and caches them locally.
 * Safe to call multiple times.
 */
export async function initUserStore() {
  if (initialized) return;

  const SUPABASE = await getSupabaseClient();

  const {
    data: { user: userData },
    error: userError,
  } = await SUPABASE.auth.getUser();

  if (userError) {
    if (isNetworkError(userError)) {
      await useLocalSessionWhileOffline(SUPABASE);
      return;
    }
    console.error("Failed to get user:", userError);
    return;
  }

  const {
    data: { claims: claimsData },
    error: claimsError,
  } = await SUPABASE.auth.getClaims();

  if (claimsError) {
    console.error("Failed to get claims:", claimsError);
    return;
  }

  const {
    data: { session: sessionData },
    error: sessionError,
  } = await SUPABASE.auth.getSession();

  if (sessionError) {
    console.error("Failed to get session:", sessionError);
    return;
  }

  user = userData;
  claims = claimsData;
  session = sessionData;
  initialized = true;

  SUPABASE.auth.onAuthStateChange((event, updatedSession) => {
    if (event === "TOKEN_REFRESHED" && updatedSession) {
      session = updatedSession;
    }
  });
}

function isNetworkError(error) {
  return (
    !navigator.onLine ||
    error?.name === "AuthRetryableFetchError" ||
    error?.status === 0
  );
}

/**
 * Offline fallback: show the app from the locally stored session. The
 * server still enforces access (RLS), and the session is verified again
 * with getUser() as soon as the connection returns.
 */
async function useLocalSessionWhileOffline(SUPABASE) {
  const {
    data: { session: localSession },
  } = await SUPABASE.auth.getSession();
  if (!localSession?.user) return;

  user = localSession.user;
  session = localSession;
  claims = null;

  window.addEventListener(
    "online",
    () => {
      initialized = false;
      initUserStore().catch(() => {});
    },
    { once: true },
  );
}

/**
 * Returns cached user.
 */
export function getUser() {
  return user;
}

/**
 * Returns cached user ID.
 */
export function getUserId() {
  return user?.id || null;
}

/**
 * Returns cached claims.
 */
export function getClaims() {
  return claims;
}

/**
 * Returns cached session.
 */
export function getSession() {
  return session;
}

/**
 * Replaces the cached session (e.g. after Supabase refreshes the JWT).
 *
 * @param {object|null} nextSession
 */
export function setSession(nextSession) {
  session = nextSession;
}

/**
 * Returns a usable access token, refreshing from Supabase when possible.
 * Mobile PWAs often keep a stale in-memory JWT after backgrounding.
 *
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  try {
    const SUPABASE = await getSupabaseClient();
    const {
      data: { session: latest },
    } = await SUPABASE.auth.getSession();
    if (latest?.access_token) {
      session = latest;
      if (latest.user) user = latest.user;
      return latest.access_token;
    }
  } catch (err) {
    console.warn("getAccessToken: live session lookup failed:", err?.message);
  }

  return session?.access_token || null;
}

/**
 * Returns true if user is authenticated.
 */
export function isAuthenticated() {
  return !!user;
}

/**
 * Clears cached user data (on logout).
 */
export function clearUserStore() {
  user = null;
  claims = null;
  session = null;
  initialized = false;
}
