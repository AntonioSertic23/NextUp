// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getToken } from "../auth.js";
import { getCollection } from "../api.js";
import { renderCollection } from "../ui.js";

const sortOptions = [
  { value: "last_updated_at", label: "Last Updated" },
  { value: "last_collected_at", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "top_rated", label: "Top Rated" },
  { value: "episodes_left", label: "Episodes Left" },
];

const orderOptions = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

/**
 * Renders sorting controls (dropdowns) for sorting TV show collection.
 * Appends controls to main and wires up change events.
 * @param {HTMLElement} main - Main DOM container.
 * @param {HTMLElement} collectionDiv - Collection container (list parent).
 * @param {string} token - Trakt user token.
 */
async function renderSortControls(main, collectionDiv, token) {
  // Sort controls UI
  const sortDiv = document.createElement("div");
  sortDiv.className = "sort-controls";
  sortDiv.innerHTML = `
    <label for="sort-by">Sort by:
      <select id="sort-by">
        ${sortOptions
          .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
          .join("")}
      </select>
    </label>
    <label for="sort-order">Order:
      <select id="sort-order">
        ${orderOptions
          .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
          .join("")}
      </select>
    </label>
  `;
  main.appendChild(sortDiv);

  sortDiv
    .querySelector("#sort-by")
    .addEventListener("change", () => renderList(collectionDiv, token));
  sortDiv
    .querySelector("#sort-order")
    .addEventListener("change", () => renderList(collectionDiv, token));
}

/**
 * Renders a sorted/filtered list of TV shows in the given container.
 * @param {HTMLElement} listContainer - Element to render shows into.
 * @param {string} token - Trakt user token.
 */
async function renderList(listContainer, token) {
  const sortDiv = document.querySelector(".sort-controls");
  const sortBy = sortDiv.querySelector("#sort-by").value;
  const order = sortDiv.querySelector("#sort-order").value;

  let shows = await getCollection(token, sortBy);

  if (order === "asc") {
    shows = [...shows].reverse();
  }

  renderCollection(listContainer, shows);

  // Add click event to each show card to navigate to its details page
  listContainer.querySelectorAll(".show-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      location.hash = `show/${id}`; // Update hash to trigger router
    });
  });
}

/**
 * Renders the home page: sorting controls and the collection list.
 * @param {HTMLElement} main - Main app container for this page.
 * @returns {Promise<void>}
 */
export async function renderHome(main) {
  const token = await getToken();

  const collectionDiv = document.createElement("div");
  collectionDiv.className = "collection-container";

  renderSortControls(main, collectionDiv, token);

  main.appendChild(collectionDiv);

  renderList(collectionDiv, token);
}
