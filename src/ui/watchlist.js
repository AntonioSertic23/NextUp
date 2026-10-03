import {
  getWatchlist,
  changeSort,
  changeOrder,
} from "../stores/watchlistStore.js";
import { computeListShowProgress } from "../utils/progress.js";
import { attachEpisodeInfoHandler } from "./episodeModal.js";
import { getTonightFocusShowIds } from "./tonight.js";

const sortOptions = [
  { value: "added_at", label: "Last Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "rating", label: "Top Rated" },
  { value: "last_watched_at", label: "Last Watched" },
  { value: "last_aired_at", label: "Last aired" },
  { value: "episodes_left", label: "Episodes Left" },
];

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders sorting controls and binds UI events that mutate
 * the global watchlist ordering.
 *
 * @param {HTMLElement} main - Main page container.
 */
export async function renderSortControls(main) {
  const savedOrder = localStorage.getItem("watchlist_order") || "desc";

  const sortDiv = document.createElement("div");
  sortDiv.className = "sort-controls watchlist-toolbar";
  sortDiv.innerHTML = `
  <label for="sort-by">Sort by:</label>
  <select id="sort-by">
  ${sortOptions
    .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
    .join("")}
    </select>
    <button
    id="sort-order-btn"
    class="sort-order-btn"
    data-order="${savedOrder}"
    aria-label="Toggle sort order"
    title="Toggle sort order"
    ><img src="/img/down-arrow.png" alt="sort order" class="sort-order-icon ${savedOrder === "asc" ? "flipped" : ""}" /></button>
    `;

  main.prepend(sortDiv);

  const sortBySelect = sortDiv.querySelector("#sort-by");
  const orderBtn = sortDiv.querySelector("#sort-order-btn");

  const savedSortBy = localStorage.getItem("watchlist_sort");
  if (savedSortBy) {
    sortBySelect.value = savedSortBy;
  }

  sortBySelect.addEventListener("change", (e) => {
    const newSort = e.target.value;
    changeSort(newSort);
    renderWatchlist();
  });

  orderBtn.addEventListener("click", () => {
    const currentOrder = orderBtn.dataset.order;
    const newOrder = currentOrder === "desc" ? "asc" : "desc";

    orderBtn.dataset.order = newOrder;
    const icon = orderBtn.querySelector(".sort-order-icon");
    icon.classList.toggle("flipped", newOrder === "asc");

    changeOrder(newOrder);
    renderWatchlist();
  });
}

/**
 * Renders the user's active TV show watchlist.
 */
export async function renderWatchlist() {
  const shows = getWatchlist();
  const container = document.getElementById("watchlist-container");
  const focusIds = getTonightFocusShowIds();

  if (!shows.length) {
    container.innerHTML = `<p class="no-show-message">
          You don't have any saved series in your list. Add them via the Discover page, or use Sync with Trakt if you already have some saved there.
        </p>`;
    return;
  }

  container.innerHTML = shows
    .map((show) => {
      const {
        nextEpisodeInfo,
        progressBarPercent,
        progressText,
        episodesLeft,
        overview,
        isCompleted,
      } = computeListShowProgress(show);

      const overviewBlock = overview
        ? `<p class="next_episode_overview">${escapeHtml(overview)}</p>`
        : "";

      const episodeActions = isCompleted
        ? `<p class="episodes_left completed-label">All episodes watched</p>`
        : `
            <div class="next_episode_info_container">
              <button
                class="episode_info_btn"
                data-episode="${show.next_episode.id}"
              >
                Episode info
              </button>
              <p class="episodes_left">${episodesLeft} left</p>
            </div>
          `;

      const isFocus = focusIds.has(show.shows?.id);
      const focusClass = isFocus ? " is-tonight-focus" : "";
      const focusBadge = isFocus
        ? `<span class="tonight-focus-badge">Tonight</span>`
        : "";

      return `
        <div class="show-card${focusClass}" data-id="${show.shows.slug_id}">
          <div class="poster-container">
            <img
              class="poster"
              src="https://${show.shows.image_poster}"
              alt="${show.shows.title} poster"
            />
            ${focusBadge}
          </div>

          <div class="info-container">
            <p class="title">${show.shows.title}</p>
            <p class="next_episode">${escapeHtml(nextEpisodeInfo)}</p>
            ${overviewBlock}

            <div class="progress-container">
              <div class="progress-bar">
                <div
                  class="progress-bar-fill"
                  style="width: ${progressBarPercent}%;"
                ></div>
              </div>
              <p class="progress_text">${progressText}</p>
            </div>

            ${episodeActions}
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".episode_info_btn").forEach((btn) => {
    attachEpisodeInfoHandler(btn);
  });
}
