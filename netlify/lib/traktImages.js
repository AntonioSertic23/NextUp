/**
 * Trakt image fields are usually a list of host paths
 * (`media.trakt.tv/...`). Older payloads use a single string or
 * `{ full, medium, thumb }`. Stored values stay without a scheme
 * because the UI prefixes `https://`.
 *
 * @param {Object|null|undefined} images
 * @param {string} key
 * @returns {string|null}
 */
export function traktImagePath(images, key) {
  const value = images?.[key];
  if (value == null) return null;

  let raw = value;
  if (Array.isArray(value)) raw = value.find((item) => item != null && item !== "");
  if (raw && typeof raw === "object") {
    raw = raw.full || raw.medium || raw.thumb || null;
  }
  if (typeof raw !== "string") return null;

  const path = raw.trim().replace(/^https?:\/\//i, "");
  return path || null;
}

/**
 * Columns to include in an upsert. Empty values are omitted so a
 * payload without images does not wipe posters already in the database.
 *
 * @param {Object|null|undefined} images
 * @param {Array<[string, string]>} keys - [trakt key, column name]
 * @returns {Object<string, string>}
 */
export function traktImageColumns(images, keys) {
  /** @type {Object<string, string>} */
  const columns = {};
  for (const [traktKey, column] of keys) {
    const path = traktImagePath(images, traktKey);
    if (path) columns[column] = path;
  }
  return columns;
}
