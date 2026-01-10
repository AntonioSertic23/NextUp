// ========================================================
// pages/discover.js - Render Discover Page
// ========================================================

import { renderDiscoverElments } from "../ui.js";
import { resetDiscoverStore } from "../stores/discoverStore.js";

/**
 * Renders the discover page with search functionality.
 * @param {HTMLElement} main - The main container element
 * @returns {Promise<void>}
 */
export async function renderDiscover(main) {
  const searchDiv = document.createElement("div");
  searchDiv.id = "discover-container";
  main.appendChild(searchDiv);

  resetDiscoverStore();
  await renderDiscoverElments(main);
}
