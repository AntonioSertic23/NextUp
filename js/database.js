// ========================================================
// database.js
// ========================================================

/**
 * Fetches the user's Trakt collection.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {string} [sortBy] - Optional sort criteria: 'title', 'year', 'rating', etc.
 * @returns {Promise<Array>} A list (array) of shows from the user's collection.
 */
export async function getWatchlistData(token, sortBy) {
  const res = await fetch("/.netlify/functions/getWatchlistData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  return sortBy ? sortShows(data, sortBy) : data;
}
