import { getShowDetails } from "../api/shows.js";
import { renderShowDetails } from "../ui/showDetails.js";

/**
 * Render the single show details page.
 *
 * @param {HTMLElement} main - Main application container
 * @param {string} [traktIdentifier] - Trakt show identifier (slug or numeric ID).
 */
export async function renderShow(main, traktIdentifier) {
  const container = document.createElement("div");
  container.id = "show-container";
  container.innerHTML = "<p class='loading-text'>Loading...</p>";
  main.appendChild(container);

  try {
    const show = await getShowDetails(traktIdentifier);

    if (!show) {
      container.innerHTML = "<p>Show not found.</p>";
      return;
    }

    renderShowDetails(show);
  } catch (err) {
    console.error("Failed to render show page:", err);
    container.innerHTML = "<p>Failed to load show details.</p>";
  }
}
