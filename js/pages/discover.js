// ========================================================
// pages/discover.js - Render Discover Page
// ========================================================

import { getToken } from "../auth.js";
import { searchShows } from "../api.js";

let currentQuery = "";
let currentPage = 1;
let paginationInfo = null;

/**
 * Renders the discover page with search functionality.
 * @param {HTMLElement} main - The main container element
 * @returns {Promise<void>}
 */
export async function renderDiscover(main) {
  const token = await getToken();

  // Reset state
  currentQuery = "";
  currentPage = 1;
  paginationInfo = null;

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

  // Create pagination container
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "pagination-container";
  paginationDiv.id = "pagination-container";

  searchDiv.appendChild(searchForm);
  searchDiv.appendChild(resultsDiv);
  searchDiv.appendChild(paginationDiv);
  main.appendChild(searchDiv);

  // Add event listener for search button
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    currentQuery = query;
    currentPage = 1;
    await performSearch(token, query, 1, resultsDiv, paginationDiv);
  });

  // Allow Enter key to trigger search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });
}

/**
 * Performs a search and displays results with pagination.
 * @param {string} token - Trakt token
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {HTMLElement} resultsDiv - Results container
 * @param {HTMLElement} paginationDiv - Pagination container
 */
async function performSearch(token, query, page, resultsDiv, paginationDiv) {
  // Show loading state
  resultsDiv.innerHTML = "<p class='loading-text'>Searching...</p>";
  paginationDiv.innerHTML = "";

  try {
    const data = await searchShows(token, query, page, 10);
    paginationInfo = data.pagination;
    currentPage = page;

    displaySearchResults(resultsDiv, data.results);
    renderPagination(paginationDiv, paginationInfo, query, token, resultsDiv);
  } catch (error) {
    console.error("Search error:", error);
    resultsDiv.innerHTML = `<p class='error-text'>Error searching shows: ${error.message}</p>`;
    paginationDiv.innerHTML = "";
  }
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

/**
 * Renders pagination controls.
 * @param {HTMLElement} container - Container for pagination controls
 * @param {Object} pagination - Pagination info object
 * @param {string} query - Current search query
 * @param {string} token - Trakt token
 * @param {HTMLElement} resultsDiv - Results container
 */
function renderPagination(container, pagination, query, token, resultsDiv) {
  if (!pagination || pagination.pageCount <= 1) {
    container.innerHTML = "";
    return;
  }

  const { page, pageCount, itemCount } = pagination;
  const pages = [];

  // Previous button
  if (page > 1) {
    pages.push(
      `<button class="pagination-btn" data-page="${page - 1}">Previous</button>`
    );
  }

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(pageCount, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pages.push(`<button class="pagination-btn" data-page="1">1</button>`);
    if (startPage > 2) {
      pages.push(`<span class="pagination-ellipsis">...</span>`);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === page ? "active" : "";
    pages.push(
      `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`
    );
  }

  if (endPage < pageCount) {
    if (endPage < pageCount - 1) {
      pages.push(`<span class="pagination-ellipsis">...</span>`);
    }
    pages.push(
      `<button class="pagination-btn" data-page="${pageCount}">${pageCount}</button>`
    );
  }

  // Next button
  if (page < pageCount) {
    pages.push(
      `<button class="pagination-btn" data-page="${page + 1}">Next</button>`
    );
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing page ${page} of ${pageCount} (${itemCount} total results)
    </div>
    <div class="pagination-buttons">
      ${pages.join("")}
    </div>
  `;

  // Add event listeners to pagination buttons
  container.querySelectorAll(".pagination-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const newPage = parseInt(btn.dataset.page, 10);
      await performSearch(token, query, newPage, resultsDiv, container);
      // Scroll to top of results
      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
