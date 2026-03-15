// ========================================================
// stores/myShowsStore.js - My Shows state & sorting logic
// ========================================================

let upcomingEpisodes = [];
let allCollectionShows = [];

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

/**
 * Sets the allCollectionShows array in the store.
 *
 * @param {Array<Object>} data - Array of all shows in the user's collection
 */
export function setAllCollectionShows(data) {
  allCollectionShows = data;
}

/**
 * Gets the allCollectionShows array from the store.
 *
 * @returns {Array<Object>} Array of all shows in the user's collection
 */
export function getAllCollectionShows() {
  return allCollectionShows;
}
