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

/**
 * Returns time remaining until a future date in days and hours.
 *
 * @param {string} isoDate - ISO datetime string (e.g. 2025-11-07T02:00:00+00)
 * @returns {string} Formatted time text or "Aired" if date is in the past
 */
export function getTimeUntil(isoDate) {
  if (!isoDate) return "N/A";

  const now = new Date();
  const target = new Date(isoDate);

  const diffMs = target - now;

  if (diffMs <= 0) return "Aired";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h`;
}
