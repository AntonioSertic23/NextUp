// ========================================================
// functions/traktAuth.js - Exchanges a Trakt authorization code for tokens
// ========================================================

import { exchangeTraktCode } from "../lib/trakt.js";
import {
  resolveUserIdFromToken,
  saveTraktTokens,
} from "../lib/supabase.js";

/**
 * Exchanges a Trakt OAuth authorization code for access + refresh tokens
 * and persists them in the database.
 *
 * Called by the client after the user is redirected back from Trakt
 * with an authorization code.
 *
 * @param {import('@netlify/functions').HandlerEvent} event
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { code, redirectUri } = body;

  if (!code || !redirectUri) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing code or redirectUri" }),
    };
  }

  let userId;
  try {
    userId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  try {
    const tokenData = await exchangeTraktCode(code, redirectUri);
    await saveTraktTokens(userId, tokenData);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("traktAuth failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
