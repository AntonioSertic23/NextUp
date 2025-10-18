// ========================================================
// api.js - Trakt API calls (currently using dummy data)
// ========================================================

/**
 * Fetches the list of watched shows for the logged-in user.
 * @param {string} token - Trakt OAuth token
 * @returns {Promise<Array>} Array of shows
 */
export async function getWatchedShows(token) {
  const res = await fetch("/.netlify/functions/getWatchedShows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  return await res.json();
}

/**
 * Dummy function to simulate fetching upcoming shows from API
 */
export async function getUpcomingShows() {
  return [
    { show: { ids: { trakt: 1 }, title: "Breaking Bad", year: 2008 } },
    { show: { ids: { trakt: 2 }, title: "Stranger Things", year: 2016 } },
    { show: { ids: { trakt: 3 }, title: "Game of Thrones", year: 2011 } },
  ];
}

/**
 * Dummy data fetcher for testing
 */
export async function getShowDetails(showId) {
  return {
    id: showId,
    title: "Breaking Bad",
    year: 2008,
    overview:
      "A high school chemistry teacher turns to making methamphetamine...",
    seasons: [
      {
        number: 1,
        episodes: [
          { number: 1, title: "Pilot" },
          { number: 2, title: "Cat's in the Bag..." },
        ],
      },
      {
        number: 2,
        episodes: [
          { number: 1, title: "Seven Thirty-Seven" },
          { number: 2, title: "Grilled" },
        ],
      },
    ],
  };
}
