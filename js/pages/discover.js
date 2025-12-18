// ========================================================
// pages/discover.js - Render Discover Page
// ========================================================

import { getToken } from "../auth.js";
import { searchShows } from "../api.js";

/**
 * Renders the discover page with search functionality.
 * @param {HTMLElement} main - The main container element
 * @returns {Promise<void>}
 */
export async function renderDiscover(main) {
  const token = getToken();

  // Create search container
  const searchDiv = document.createElement("div");
  searchDiv.className = "discover-container";

  // Create search input and button
  const searchForm = document.createElement("div");
  searchForm.className = "search-form";
  searchForm.innerHTML = `
    <input 
      type="text" 
      id="search-input" 
      class="search-input" 
      placeholder="Enter show name..."
    />
    <button id="search-btn" class="search-btn">Search</button>
  `;

  // Create results container
  const resultsDiv = document.createElement("div");
  resultsDiv.className = "search-results";
  resultsDiv.id = "search-results";

  searchDiv.appendChild(searchForm);
  searchDiv.appendChild(resultsDiv);
  main.appendChild(searchDiv);

  // Add event listener for search button
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    // Show loading state
    resultsDiv.innerHTML = "<p class='loading-text'>Searching...</p>";

    try {
      const results = await searchShows(token, query);
      displaySearchResults(resultsDiv, results);
    } catch (error) {
      console.error("Search error:", error);
      resultsDiv.innerHTML = `<p class='error-text'>Error searching shows: ${error.message}</p>`;
    }
  });

  // Allow Enter key to trigger search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });
}

/**
 * Displays search results in the results container.
 * @param {HTMLElement} container - Container to display results in
 * @param {Array} results - Array of show objects from search
 */
function displaySearchResults(container, results) {
  if (!results || results.length === 0) {
    container.innerHTML = "<p class='no-results'>No shows found.</p>";
    return;
  }

  container.innerHTML = results
    .map((show) => {
      const title = show.show?.title || "";
      const showId = show.show?.ids?.trakt || "";

      return `
        <div class="search-result-card" data-id="${showId}">
          <div class="search-result-poster">
            <img src="https:////${show.show.images.poster[0]}" alt="${title}" />
          </div>
          <div class="search-result-info">
            <h3 class="search-result-title">${title} ${show.show?.year}</h3>
            <p class="search-result-overview">${show.show?.overview}</p>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event to navigate to show details
  container.querySelectorAll(".search-result-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (id) {
        location.hash = `show/${id}`;
      }
    });
  });
}
