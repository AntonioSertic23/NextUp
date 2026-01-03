import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client using Service Role key
 * NOTE: This should only run in a trusted server environment (Netlify function)
 */
const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Netlify function to fetch the current user's watchlist.
 *
 * Behavior:
 * - Only returns shows that are not completed (is_completed = false)
 * - Requires POST method
 * - Expects { token, listId } in JSON body
 *
 * @param {import('@netlify/functions').HandlerEvent} event - Netlify function event
 * @returns {Promise<{statusCode: number, body: string}>} Response
 */
export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON in request body" }),
    };
  }

  const { token, listId } = body;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }
  try {
    const { data, error } = await SUPABASE.from("list_shows")
      .select(
        `
        added_at,
        is_completed,
        completed_at,
        watched_episodes,
        total_episodes,
        next_episode (
          id,
          episode_number,
          season_number,
          title,
          image_screenshot,
          overview,
          first_aired
        ),
        shows (
          id,
          title,
          image_poster
        )
        `
      )
      .eq("list_id", listId)
      .eq("is_completed", false);

    if (error) {
      console.error("Supabase query error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error("Handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}
