import { renderDiscoverElements } from "../ui/discover.js";

/**
 * Renders the discover page with search functionality.
 * @param {HTMLElement} main - The main container element
 */
export async function renderDiscover(main) {
  const searchDiv = document.createElement("div");
  searchDiv.id = "discover-container";
  main.appendChild(searchDiv);

  await renderDiscoverElements(main);
}
