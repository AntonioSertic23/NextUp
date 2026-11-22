import { getShowDetails } from "../api/shows.js";
import { renderShowDetails } from "../ui/showDetails.js";
import { skeletonShowPage } from "../ui/skeleton.js";
import { toastError, toastWarning } from "../ui/toast.js";
import { escapeHtml } from "../utils/html.js";

/**
 * Render the single show details page.
 *
 * @param {HTMLElement} main - Main application container
 * @param {string} [traktIdentifier] - Trakt show identifier (slug or numeric ID).
 */
export async function renderShow(main, traktIdentifier) {
  const container = document.createElement("div");
  container.id = "show-container";
  container.innerHTML = skeletonShowPage();
  main.appendChild(container);

  try {
    const show = await getShowDetails(traktIdentifier);

    if (!show) {
      container.innerHTML = "<p class=\"error-text\">Show not found.</p>";
      return;
    }

    if (show.traktReconnectRequired || show.traktWarning) {
      toastWarning(
        "Show loaded, but your Trakt connection needs reconnecting in Profile for sync.",
      );
    }

    renderShowDetails(show);
  } catch (err) {
    console.error("Failed to render show page:", err);

    const notFound =
      err?.code === "SHOW_NOT_FOUND" || err?.status === 404;
    const message = notFound
      ? "Show not found."
      : err?.message || "Failed to load show details.";

    container.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;

    if (err?.traktReconnectRequired) {
      toastError(
        "Trakt connection expired. Open Profile and reconnect Trakt, then try again.",
      );
    } else if (!notFound) {
      toastError(message);
    }
  }
}
