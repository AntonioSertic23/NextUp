/**
 * Netlify serverless function to fetch the current user's watched shows from Trakt API.
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details
 * @returns {Promise<object>} Response object with statusCode and JSON body containing shows data or error
 *
 * Notes:
 * - Only allows POST requests; other methods return 405.
 * - Expects JSON body with a "token" field (user's Trakt access token).
 * - Uses process.env.TRAKT_CLIENT_ID for API authentication.
 * - Catches network or API errors and returns 500 with error message.
 */
import fetch from "node-fetch";

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { token } = JSON.parse(event.body);

  try {
    const res = await fetch("https://api.trakt.tv/users/me/watched/shows", {
      headers: {
        Authorization: `Bearer ${token}`,
        "trakt-api-version": "2",
        "trakt-api-key": process.env.TRAKT_CLIENT_ID,
        "Content-Type": "application/json",
        "User-Agent": "NextUp/1.0.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: text }) };
    }

    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
