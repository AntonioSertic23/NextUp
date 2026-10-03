/**
 * Trakt status values grouped for the My Shows filter.
 * "continuing" is the newer name for a show that is still airing.
 *
 * @param {string|null|undefined} status
 * @returns {"returning"|"ended"|"canceled"|""}
 */
export function showStatusGroup(status) {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();
  if (value === "returning series" || value === "continuing") return "returning";
  if (value === "ended") return "ended";
  if (value === "canceled" || value === "cancelled") return "canceled";
  return "";
}

/**
 * Short label for a collection card. Known groups use a fixed label.
 * Anything else is shown as stored so it is not hidden.
 *
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function showStatusLabel(status) {
  const group = showStatusGroup(status);
  if (group === "returning") return "Returning";
  if (group === "ended") return "Ended";
  if (group === "canceled") return "Canceled";
  return String(status ?? "").trim();
}
