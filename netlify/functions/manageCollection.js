// ========================================================
// functions/manageCollection.js - Netlify serverless function for adding/removing shows from collection
// ========================================================

import {
  addShowToList,
  removeShowFromList,
  getDefaultListId,
  resolveUserIdFromToken,
} from "../lib/supabaseService.js";

/**
 * Netlify serverless function to add or remove a show from user's Trakt collection.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with `token`, `showId`, and `action` ("add" or "remove").
 * - Uses `process.env.TRAKT_CLIENT_ID` for API authentication.
 * - Returns 500 with an error message if a network or API issue occurs.
 */
export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
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

  const { showId, action } = body;

  if (!showId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'showId' in request body." }),
    };
  }

  if (!action || (action !== "add" && action !== "remove")) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or invalid 'action'. Must be 'add' or 'remove'.",
      }),
    };
  }

  try {
    // const userId = await resolveUserIdFromToken(token);
    const listId = await getDefaultListId(userId);

    if (action === "add") {
      await addShowToList(showId, listId, userId);
    } else {
      await removeShowFromList(listId, showId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("manageCollection failed:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
