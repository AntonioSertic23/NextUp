// markEpisode.js - Netlify function to mark/unmark an episode as watched on Trakt
import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

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

  const { token, action, traktId } = body;
  if (!token || !action) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing token or action" }),
    };
  }
  if (!traktId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing traktId (episode id) - required",
      }),
    };
  }

  try {
    if (action === "mark") {
      // POST /sync/history
      const payload = { episodes: [] };
      payload.episodes.push({ ids: { trakt: parseInt(traktId, 10) } });

      const res = await fetch(`${BASE_URL}/sync/history`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
          "User-Agent": "NextUp/1.0.0",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: text }),
        };
      }

      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    } else if (action === "unmark") {
      // POST /sync/history/remove
      const payload = { episodes: [] };
      payload.episodes.push({ ids: { trakt: parseInt(traktId, 10) } });

      const res = await fetch(`${BASE_URL}/sync/history/remove`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
          "User-Agent": "NextUp/1.0.0",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: text }),
        };
      }

      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Unknown action" }),
      };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
