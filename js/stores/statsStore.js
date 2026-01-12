// ========================================================
// stores/statsStore.js - Stats state & sorting logic
// ========================================================

let stats = [];

/**
 * Sets the stats array in the store.
 *
 * @param {Array<Object>} data - Array of stats objects
 */
export function setStats(data) {
  stats = data;
}

/**
 * Gets the stats array from the store.
 *
 * @returns {Array<Object>} Array of stats objects
 */
export function getStats() {
  return stats;
}
