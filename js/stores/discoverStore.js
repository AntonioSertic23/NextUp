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
  results = [];
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
  currentQuery = state.currentQuery;
  currentPage = state.currentPage;
  paginationInfo = state.paginationInfo;
  results = state.results;
}
