// ========================================================
// local_storage.js - Local caching for Trakt API data
// ========================================================

const STORAGE_KEY = "collection";

/**
 * Load the entire localStorage cache object.
 *
 * @returns {Object} The parsed cache object, or an empty object if nothing is stored.
 */
export function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (err) {
    console.error("Error loading cache:", err);
    return {};
  }
}

/**
 * Save the given data object to localStorage under STORAGE_KEY.
 *
 * @param {Object} data - The full cache object to store.
 */
export function saveCache(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Retrieve a specific show's data from cache.
 *
 * @param {number|string} id - The Trakt show ID.
 * @returns {Object|null} Cached show data, or null if not found.
 */
export function getCachedShow(id) {
  const cache = loadCache();
  const show = cache[id];
  if (!show) return null;
  return show;
}

/**
 * Add or update a show's data in the cache.
 * If the show already exists, its data will be replaced.
 *
 * @param {number|string} id - The Trakt show ID.
 * @param {Object} newData - The new show data to cache.
 */
export function updateCache(id, newData) {
  const cache = loadCache();
  cache[id] = { ...newData };
  saveCache(cache);
}

/**
 * Remove a single show from the cache by its ID.
 *
 * @param {number|string} id - The Trakt show ID to remove.
 */
export function removeShowFromCache(id) {
  const cache = loadCache();
  delete cache[id];
  saveCache(cache);
}

/**
 * Completely clear the collection cache from localStorage.
 */
export function clearCache() {
  localStorage.removeItem(STORAGE_KEY);
}
