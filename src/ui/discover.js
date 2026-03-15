import {
  resetDiscoverStore,
  getDiscoverState,
  setDiscoverState,
} from "../stores/discoverStore.js";
import { searchShows } from "../api/shows.js";

/**
 * Renders the Discover page with search functionality.
 */
export async function renderDiscoverElements() {
  const discoverState = getDiscoverState();
  const container = document.getElementById("discover-container");

  const searchForm = document.createElement("div");
  searchForm.className = "search-form";
  searchForm.innerHTML = `
      <input 
        type="text" 
        id="search-input" 
        class="search-input" 
        placeholder="Enter show name..."
        value="${discoverState.currentQuery}"
      />
      
      <button 
        type="button" 
        id="clear-btn" 
        class="clear-btn"
        style="
          display: ${discoverState.currentQuery ? "block" : "none"};
        "
      >X</button>

      <button id="search-btn" class="search-btn">Search</button>
    `;

  const resultsDiv = document.createElement("div");
  resultsDiv.className = "search-results";
  resultsDiv.id = "search-results";

  const paginationDiv = document.createElement("div");
  paginationDiv.className = "pagination-container";
  paginationDiv.id = "pagination-container";

  container.appendChild(searchForm);
  container.appendChild(resultsDiv);
  container.appendChild(paginationDiv);

  const searchBtn = searchForm.querySelector("#search-btn");
  const searchInput = searchForm.querySelector("#search-input");
  const clearBtn = searchForm.querySelector("#clear-btn");

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    await performSearch(query, 1, paginationDiv);
    clearBtn.style.display = "block";
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    resultsDiv.innerHTML = "";
    paginationDiv.innerHTML = "";
    resetDiscoverStore();
  });

  if (discoverState.results.length > 0) {
    displaySearchResults(discoverState.results);
    renderPagination(
      paginationDiv,
      discoverState.currentQuery,
      discoverState.paginationInfo
    );
  }
}

async function performSearch(query, page, paginationDiv) {
  const resultsDiv = document.getElementById("search-results");

  resultsDiv.innerHTML = "<p class='loading-text'>Searching...</p>";
  paginationDiv.innerHTML = "";

  try {
    const data = await searchShows(query, page, 10);

    setDiscoverState({
      currentQuery: query,
      currentPage: page,
      paginationInfo: data.pagination,
      results: data.results,
    });

    displaySearchResults(data.results);
    renderPagination(paginationDiv, query, data.pagination);
  } catch (error) {
    console.error("Search error:", error);
    resultsDiv.innerHTML = `<p class='error-text'>Error searching shows: ${error.message}</p>`;
    paginationDiv.innerHTML = "";
  }
}

function displaySearchResults(results) {
  const container = document.getElementById("search-results");

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
            <img src="https://${show.show.images.poster[0]}" alt="${title}" />
          </div>
          <div class="search-result-info">
            <h3 class="search-result-title">${title} ${show.show?.year}</h3>
            <p class="search-result-overview">${show.show?.overview}</p>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".search-result-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (id) {
        location.hash = `show?traktIdentifier=${id}`;
      }
    });
  });
}

async function renderPagination(container, query, pagination) {
  const resultsDiv = document.getElementById("search-results");

  if (!pagination || pagination.pageCount <= 1) {
    container.innerHTML = "";
    return;
  }

  const { page, pageCount, itemCount } = pagination;
  const pages = [];

  if (page > 1) {
    pages.push(
      `<button class="pagination-btn" data-page="${page - 1}">Previous</button>`
    );
  }

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

  container.querySelectorAll(".pagination-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const newPage = parseInt(btn.dataset.page, 10);

      await performSearch(query, newPage, container);

      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
