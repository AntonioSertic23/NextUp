// ========================================================
// getEpisodeDetails.js - Netlify serverless function to fetch episode details
// ========================================================

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

/**
 * Fetches detailed information for a specific episode from Trakt API.
 * @param {Object} event - Netlify event object
 * @returns {Promise<Object>} Response with episode details
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { token, showId, season, episode } = body;

  if (!token || !showId || season == null || episode == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing token, showId, season, or episode",
      }),
    };
  }

  try {
    const res = await fetch(
      `${BASE_URL}/shows/${showId}/seasons/${season}/episodes/${episode}?extended=full,images`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
          "User-Agent": "NextUp/1.0.0",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const episodeData = await res.json();
    return { statusCode: 200, body: JSON.stringify({ episode: episodeData }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
