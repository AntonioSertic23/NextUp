// ========================================================
// stores/discoverStore.js - Store for managing discover page state
// ========================================================

let currentQuery = "";
let currentPage = 1;
let paginationInfo = null;
let results = [];

/**
 * Resets discover store state to initial values.
 * Used when rendering a new discover page.
 */
export function resetDiscoverStore() {
  currentQuery = "";
  currentPage = 1;
  paginationInfo = null;
}

/**
 * Sets new search query and resets page to 1.
 * @param {string} query - New search query.
 */
export function setCurrentQuery(query) {
  currentQuery = query;
  currentPage = 1; // Reset page on new query
}

/**
 * Sets current pagination page.
 * @param {number} page - Page number (1-based).
 */
export function setCurrentPage(page) {
  currentPage = page;
}

/**
 * Sets pagination info.
 * @param {Object} pagination - Pagination data object.
 */
export function setPaginationInfo(pagination) {
  paginationInfo = pagination;
}

/**
 * Sets search results array.
 * @param {Array} newResults - Array of search result objects.
 */
export function setResults(newResults) {
  results = newResults;
}

/**
 * Returns current state as an object.
 * Useful for debugging or logging.
 * @returns {Object} Copy of current state.
 */
export function getDiscoverState() {
  return {
    currentQuery,
    currentPage,
    paginationInfo,
    results,
  };
}

/** * Sets the entire discover state from an object.
 * Useful for restoring state.
 * @param {Object} state - State object with keys matching store properties.
 */
export function setDiscoverState(state) {
  currentQuery = state.currentQuery || "";
  currentPage = state.currentPage || 1;
  paginationInfo = state.paginationInfo || null;
  results = state.results || [];
}
