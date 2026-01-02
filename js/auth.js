// ========================================================
// auth.js - Supabase authentication with email/password
// ========================================================

import { getSupabaseClient } from "./database.js";

const SUPABASE = await getSupabaseClient();

/**
 * Retrieves the current user's Trakt OAuth token from the database.
 *
 * NOTE:
 * - This is NOT a Supabase auth token.
 * - The token is stored in the `users.trakt_token` column.
 * - Returns null if the user is not authenticated or the token is missing.
 *
 * @returns {Promise<string|null>} Trakt OAuth token or null
 */
export async function getToken() {
  try {
    const {
      data: { user },
    } = await SUPABASE.auth.getUser();

    if (!user) {
      return null;
    }

    // Fetch user data to get trakt_token
    const { data: userData, error } = await SUPABASE.from("users")
      .select("trakt_token")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      console.error("Error fetching user data:", error);
      return null;
    }

    return userData.trakt_token || null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

/**
 * Registers a new user using email and password authentication.
 *
 * Notes:
 * - Supabase authentication handles user creation.
 * - A corresponding user record is automatically created
 *   via a database trigger.
 *
 * @param {string} email - User email address.
 * @param {string} password - User password.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function register(email, password) {
  try {
    const { data, error } = await SUPABASE.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // User record is automatically created by database trigger
    // See supabase_migration.sql for the trigger definition

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logs in a user using email and password authentication.
 *
 * @param {string} email - User email address.
 * @param {string} password - User password.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function login(email, password) {
  try {
    const { data, error } = await SUPABASE.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logs out the currently authenticated user.
 *
 * Behavior:
 * - Signs the user out from Supabase.
 * - Reloads the page to clear all in-memory application state.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    // Sign out from Supabase
    await SUPABASE.auth.signOut();

    // Reload page to clear state
    window.location.reload();
  } catch (error) {
    console.error("Error during logout:", error);
    // Still reload even if there's an error
    window.location.reload();
  }
}

/**
 * Checks whether a valid authentication session exists.
 *
 * Implementation detail:
 * - Uses Supabase auth claims to determine session validity.
 *
 * @returns {Promise<boolean>} True if the user is authenticated.
 */
export async function isAuthenticated() {
  try {
    const {
      data: { claims },
    } = await SUPABASE.auth.getClaims();

    return !!claims;
  } catch (error) {
    return false;
  }
}

/**
 * Retrieves basic information about the currently authenticated user.
 *
 * @returns {Promise<{id: string, email: string} | null>}
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
    } = await SUPABASE.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Updates the authenticated user's Trakt OAuth token in the database.
 *
 * @param {string} traktToken - Trakt OAuth access token.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateTraktToken(traktToken) {
  try {
    const {
      data: { user },
    } = await SUPABASE.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { error } = await SUPABASE.from("users")
      .update({ trakt_token: traktToken })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handles the redirect callback from Trakt OAuth authentication.
 *
 * Behavior:
 * - Extracts the OAuth access token from the URL hash.
 * - Persists the token to the database.
 * - Cleans up the URL after successful handling.
 *
 * This function should be called on app initialization.
 *
 * @returns {Promise<void>}
 */
export async function handleTraktAuthRedirect() {
  const hash = window.location.hash;

  if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash.replace("#", ""));
    const token = params.get("access_token");

    if (token) {
      const result = await updateTraktToken(token);

      if (result.success) {
        console.log("Trakt token updated successfully");
        // Clean up URL (remove #access_token part)
        window.history.replaceState({}, document.title, "/");
        return;
      } else {
        console.error("Error updating Trakt token:", result.error);
      }
    }
  }
}

/**
 * Initiates the Trakt OAuth authentication flow.
 *
 * Implementation details:
 * - Uses the implicit OAuth flow (`response_type=token`).
 * - The Trakt access token is returned in the URL hash.
 * - Redirect URI is set dynamically to the current origin.
 *
 * @returns {Promise<void>}
 */
export async function connectTraktAccount() {
  // TODO: Move this and everything related to Trakt into a new trakt.js file

  try {
    const res = await fetch("/.netlify/functions/getClientId");
    const data = await res.json();
    const clientId = data.clientId;

    // Automatically use current origin as redirect URI
    const redirectUri = window.location.origin;

    const AUTH_URL = `https://trakt.tv/oauth/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    // Redirect the user to Trakt OAuth
    window.location.href = AUTH_URL;
  } catch (error) {
    console.error("Error initiating Trakt OAuth:", error);
  }
}

/**
 * Synchronizes the user's Trakt data with the application backend.
 *
 * Behavior:
 * - Sends the user's Trakt OAuth token to a serverless function.
 * - Authenticates the request using the Supabase session access token.
 *
 * @param {string} token - Trakt OAuth access token.
 * @returns {Promise<void>}
 * @throws {Error} If the sync request fails.
 */
export async function syncTraktAccount(token) {
  const {
    data: { session },
  } = await SUPABASE.auth.getSession();

  const res = await fetch("/.netlify/functions/syncTraktAccount", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Trakt sync error: ${res.status} ${text}`);
  }
}
