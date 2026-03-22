// ========================================================
// getRelatedShows.js - Related shows for a show (Trakt API)
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/trakt.js";
import {
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabase.js";

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

  const { traktIdentifier, page = 1, limit = 20 } = body;

  if (!traktIdentifier || !String(traktIdentifier).trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing 'traktIdentifier' in request body.",
      }),
    };
  }

  try {
    let traktToken;
    try {
      traktToken = await getValidTraktToken(userId);
    } catch {
      // Public endpoint works with client id only
    }

    const id = encodeURIComponent(String(traktIdentifier).trim());
    const url = `${TRAKT_BASE_URL}/shows/${id}/related?extended=full,images&page=${page}&limit=${limit}`;

    const res = await fetch(url, { headers: getTraktHeaders(traktToken) });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const data = await res.json();

    const pagination = {
      page: parseInt(res.headers.get("X-Pagination-Page") || "1", 10),
      limit: parseInt(res.headers.get("X-Pagination-Limit") || "10", 10),
      pageCount: parseInt(
        res.headers.get("X-Pagination-Page-Count") || "1",
        10
      ),
      itemCount: parseInt(
        res.headers.get("X-Pagination-Item-Count") || "0",
        10
      ),
    };

    const shows = Array.isArray(data)
      ? data.map((item) => item.show || item)
      : [];

    return {
      statusCode: 200,
      body: JSON.stringify({ shows, pagination }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
