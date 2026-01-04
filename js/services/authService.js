// ========================================================
// services/authService.js - Supabase authentication with email/password
// ========================================================

import { getSupabaseClient } from "./supabaseService.js";
import { getUser, clearUserStore } from "../stores/userStore.js";

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
    const SUPABASE = await getSupabaseClient();

    const { id: userId } = getUser();

    // Fetch user data to get trakt_token
    const { data: userData, error } = await SUPABASE.from("users")
      .select("trakt_token")
      .eq("id", userId)
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
    const SUPABASE = await getSupabaseClient();

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
    const SUPABASE = await getSupabaseClient();

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
    const SUPABASE = await getSupabaseClient();

    // Sign out from Supabase
    await SUPABASE.auth.signOut();

    clearUserStore();

    // Reload page to clear state
    window.location.reload();
  } catch (error) {
    console.error("Error during logout:", error);
    // Still reload even if there's an error
    window.location.reload();
  }
}
