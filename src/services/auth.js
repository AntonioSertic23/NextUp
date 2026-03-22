/**
 * @module services/auth
 *
 * Handles Supabase email/password authentication and Trakt token retrieval.
 *
 * Auth lifecycle:
 *   login / register  →  Supabase stores session in localStorage
 *   getToken           →  reads Trakt token from `users` table
 *   logout             →  signs out of Supabase, clears state, replaces history
 *   setupAuthGuard     →  listens to onAuthStateChange for session expiry / cross-tab logout
 */

import { getSupabaseClient } from "./supabase.js";
import { getUser, clearUserStore } from "../stores/userStore.js";

/**
 * Retrieves the current user's Trakt OAuth token from the database.
 *
 * @returns {Promise<string|null>} Trakt OAuth token or null
 */
export async function getToken() {
  try {
    const SUPABASE = await getSupabaseClient();
    const user = getUser();
    if (!user) return null;

    const { data, error } = await SUPABASE.from("users")
      .select("trakt_token")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("Error fetching Trakt token:", error);
      return null;
    }

    return data.trakt_token || null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

/**
 * Registers a new user. A corresponding `users` row is created
 * automatically by a database trigger (see db/migration.sql).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function register(email, password) {
  try {
    const SUPABASE = await getSupabaseClient();

    const { error } = await SUPABASE.auth.signUp({ email, password });

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logs in a user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function login(email, password) {
  try {
    const SUPABASE = await getSupabaseClient();

    const { error } = await SUPABASE.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logs the user out, clears all client state, and redirects to the login page.
 *
 * Uses `location.replace` so the authenticated page is removed from the
 * browser history stack — pressing "back" after logout will NOT return
 * to the app.
 */
export async function logout() {
  try {
    const SUPABASE = await getSupabaseClient();
    await SUPABASE.auth.signOut();
  } catch (error) {
    console.error("Error during sign-out:", error);
  }

  clearUserStore();

  window.location.replace("/login.html");
}

/**
 * Subscribes to Supabase auth state changes.
 *
 * Handles:
 * - SIGNED_OUT: clears state and redirects to login (covers token expiry,
 *   session revocation, and sign-out from another tab).
 * - TOKEN_REFRESHED: no action needed — Supabase updates localStorage automatically.
 *
 * @returns {Function} Unsubscribe callback
 */
export async function setupAuthGuard() {
  const SUPABASE = await getSupabaseClient();

  const {
    data: { subscription },
  } = SUPABASE.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      clearUserStore();

      if (!window.location.pathname.includes("login.html")) {
        window.location.replace("/login.html");
      }
    }
  });

  return () => subscription.unsubscribe();
}
