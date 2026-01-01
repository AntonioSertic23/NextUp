// ========================================================
// auth.js - Supabase authentication with email/password
// ========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase client - initialized lazily
let supabase = null;
let configPromise = null;

/**
 * Fetches Supabase configuration from Netlify serverless function
 * @returns {Promise<{url: string, anonKey: string}>}
 */
async function fetchSupabaseConfig() {
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const res = await fetch("/.netlify/functions/getSupabaseConfig");
      const data = await res.json();
      return { url: data.url, anonKey: data.anonKey };
    } catch (error) {
      console.error("Error fetching Supabase config:", error);
      throw error;
    }
  })();

  return configPromise;
}

/**
 * Gets or initializes Supabase client
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
async function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  const config = await fetchSupabaseConfig();
  supabase = createClient(config.url, config.anonKey);
  return supabase;
}

/**
 * Checks if user is logged in and returns Trakt token
 * @returns {Promise<string|null>} Trakt token or null
 */
export async function getToken() {
  try {
    const client = await getSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session || !session.user) {
      return null;
    }

    // Fetch user data to get trakt_token
    const { data: userData, error } = await client
      .from("users")
      .select("trakt_token")
      .eq("id", session.user.id)
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
 * Checks if user has Trakt token connected
 * @returns {Promise<boolean>}
 */
export async function hasTraktToken() {
  const token = await getToken();
  return !!token;
}

/**
 * Registers a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function register(email, password) {
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signUp({
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
 * Logs in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function login(email, password) {
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Create session record (for multi-device support)
    if (data.session) {
      const { error: sessionError } = await client.from("sessions").insert({
        user_id: data.user.id,
        session_token: data.session.access_token,
        expires_at: new Date(data.session.expires_at * 1000).toISOString(),
      });

      if (sessionError) {
        console.error("Error creating session record:", sessionError);
        // Don't fail login if session record creation fails
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logs out the current user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const client = await getSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();

    if (session) {
      // Delete session record from database
      await client
        .from("sessions")
        .delete()
        .eq("session_token", session.access_token);
    }

    // Sign out from Supabase
    await client.auth.signOut();

    // Reload page to clear state
    window.location.reload();
  } catch (error) {
    console.error("Error during logout:", error);
    // Still reload even if there's an error
    window.location.reload();
  }
}

/**
 * Checks if user is currently authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const client = await getSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    return !!session;
  } catch (error) {
    return false;
  }
}

/**
 * Gets current user data
 * @returns {Promise<{id: string, email: string} | null>}
 */
export async function getCurrentUser() {
  try {
    const client = await getSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();

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
 * Updates user's Trakt token in database
 * @param {string} traktToken - Trakt OAuth token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateTraktToken(traktToken) {
  try {
    const client = await getSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { error } = await client
      .from("users")
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
 * Handles redirect back from Trakt OAuth (for connecting Trakt account)
 * This should be called after user completes Trakt OAuth flow
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
        // Reload page to refresh token in all components
        window.location.reload();
        return;
      } else {
        console.error("Error updating Trakt token:", result.error);
      }
    }

    // Clean up URL (remove #access_token part)
    window.history.replaceState({}, document.title, "/");
  }
}

/**
 * Initiates Trakt OAuth flow to connect Trakt account
 * @returns {Promise<void>}
 */
export async function connectTraktAccount() {
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
