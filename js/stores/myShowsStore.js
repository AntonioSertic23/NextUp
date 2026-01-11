// ========================================================
// stores/myShowsStore.js - My Shows state & sorting logic
// ========================================================

let upcomingEpisodes = [];

/**
 * Sets the myShows array in the store.
 *
 * @param {Array<Object>} data - Array of show objects with upcoming episode info
 */
export function setUpcomingEpisodes(data) {
  upcomingEpisodes = data;
}

/**
 * Gets the myShows array from the store.
 *
 * @returns {Array<Object>} Array of show objects with upcoming episode info
 */
export function getUpcomingEpisodes() {
  return upcomingEpisodes;
}
