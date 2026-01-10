// ========================================================
// utils.js
// ========================================================

/**
 * Formats a date string or Date object into `DD/MM/YYYY` format.
 *
 * @param {string|Date} input - The date to format.
 * @returns {string} Formatted date string in `DD/MM/YYYY` format.
 */
export function formatDate(input) {
  if (!input) return "";

  const d = input instanceof Date ? input : new Date(input);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats an episode string in the form `SxxExx - Title`.
 *
 * Pads season and episode numbers to 2 digits.
 *
 * @param {number|string} seasonNumber - Season number.
 * @param {number|string} episodeNumber - Episode number.
 * @param {string} [title] - Optional episode title.
 * @returns {string} Formatted episode string, e.g. `S01E05 - Pilot`.
 */
export function formatEpisodeInfo(seasonNumber, episodeNumber, title) {
  if (seasonNumber == null || episodeNumber == null) return "";

  const season = String(seasonNumber).padStart(2, "0");
  const episode = String(episodeNumber).padStart(2, "0");

  return `S${season}E${episode}${title ? ` - ${title}` : ""}`;
}
