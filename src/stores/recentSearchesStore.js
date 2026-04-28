// ========================================================
// stores/recentSearchesStore.js - Persisted Discover history
// ========================================================
//
// Keeps the last MAX search queries the user ran on the Discover
// page in localStorage. Most recent first, deduplicated case-
// insensitively (the most-recent casing is preserved).

const STORAGE_KEY = "discover_recent_searches";
const MAX = 5;

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((q) => (typeof q === "string" ? q.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/**
 * @returns {string[]} Most-recent first.
 */
export function getRecentSearches() {
  return readRaw();
}

/**
 * Adds (or promotes) a query to the top of the history.
 * No-ops on empty / whitespace input.
 */
export function addRecentSearch(query) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return;

  const lower = trimmed.toLowerCase();
  const current = readRaw().filter((q) => q.toLowerCase() !== lower);
  current.unshift(trimmed);

  persist(current.slice(0, MAX));
}

/**
 * Removes a single query (case-insensitive match).
 */
export function removeRecentSearch(query) {
  const target = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!target) return;

  const filtered = readRaw().filter((q) => q.toLowerCase() !== target);
  persist(filtered);
}

/**
 * Clears the entire search history.
 */
export function clearRecentSearches() {
  persist([]);
}
