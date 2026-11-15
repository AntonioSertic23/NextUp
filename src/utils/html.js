/**
 * Small helpers for building HTML strings safely.
 */

/**
 * Escapes a value for use in HTML text and double-quoted attributes.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Turns a stored image path (`media.trakt.tv/...`, no scheme) into a URL.
 * Returns "" for missing values so callers can render a placeholder.
 *
 * @param {string|null|undefined} path
 * @returns {string}
 */
export function imageUrl(path) {
  if (typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

/** Class added to an image (or used for a stand-in div) when there is no picture. */
export const IMG_PLACEHOLDER_CLASS = "img-placeholder";

/**
 * Builds an `<img>` tag, or a placeholder `<div>` when there is no image.
 * Images load lazily unless `eager` is set.
 *
 * @param {Object} opts
 * @param {string|null|undefined} opts.path - Stored image path or URL
 * @param {string} [opts.alt]
 * @param {string} [opts.className]
 * @param {boolean} [opts.eager]
 * @returns {string}
 */
export function posterImg({ path, alt = "", className = "", eager = false }) {
  const src = imageUrl(path);
  const cls = escapeHtml(className);
  if (!src) {
    return `<div class="${cls} ${IMG_PLACEHOLDER_CLASS}" role="img" aria-label="${escapeHtml(alt)}"></div>`;
  }
  const loading = eager ? "eager" : "lazy";
  return `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" />`;
}

/**
 * Marks images that fail to load so CSS can show a placeholder.
 * `error` does not bubble, so this listens in the capture phase.
 *
 * @param {Document|HTMLElement} [root]
 */
export function installImageFallback(root = document) {
  root.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.classList.contains(IMG_PLACEHOLDER_CLASS)) return;
      img.classList.add(IMG_PLACEHOLDER_CLASS);
      img.removeAttribute("srcset");
      img.src = TRANSPARENT_PIXEL;
    },
    true,
  );
}

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
