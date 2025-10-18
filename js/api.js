// ========================================================
// api.js - Trakt API calls (currently using dummy data)
// ========================================================

const BASE_URL = "https://api.trakt.tv";
// TODO: Replace with your actual Trakt Client ID for production
const CLIENT_ID = "YOUR_CLIENT_ID";

/**
 * Fetches the list of watched shows for the logged-in user.
 * @param {string} token - Trakt OAuth token stored in localStorage
 * @returns {Promise<Array>} Array of shows
 */
export async function getWatchedShows(token) {
  // TODO: Uncomment and use actual API call when ready
  /*
  const res = await fetch(`${BASE_URL}/users/me/watched/shows`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": CLIENT_ID,
    },
  });
  return res.json();
  */

  // Dummy data for initial UI development
  return [
    { show: { ids: { trakt: 1 }, title: "Breaking Bad", year: 2008 } },
    { show: { ids: { trakt: 2 }, title: "Stranger Things", year: 2016 } },
    { show: { ids: { trakt: 3 }, title: "Game of Thrones", year: 2011 } },
  ];
}

/**
 * Dummy function to simulate fetching upcoming shows from API
 * @returns {Promise<Array>} Array of upcoming shows
 */
export async function getUpcomingShows() {
  // TODO: Replace with actual Trakt API call later
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
  // Dummy data for now
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
