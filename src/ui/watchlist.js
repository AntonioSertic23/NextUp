import {
  getWatchlist,
  changeSort,
  changeOrder,
} from "../stores/watchlistStore.js";
import { formatEpisodeInfo } from "../utils/format.js";
import { attachEpisodeInfoHandler } from "./episodeModal.js";

const sortOptions = [
  { value: "added_at", label: "Last Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "rating", label: "Top Rated" },
  { value: "last_watched_at", label: "Last Watched" },
  { value: "episodes_left", label: "Episodes Left" },
];

function computeShowProgress(show) {
  const nextEpisodeInfo = formatEpisodeInfo(
    show.next_episode.season_number,
    show.next_episode.episode_number,
    show.next_episode.title,
  );

  const total = show.total_episodes || 0;
  const watched = show.watched_episodes || 0;

  const progressBarPercent =
    total > 0 ? Math.round((watched / total) * 100) : 0;
  const progressText = `${watched}/${total}`;
  const episodesLeft = Math.max(0, total - watched);

  return { nextEpisodeInfo, progressBarPercent, progressText, episodesLeft };
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
  sortDiv.className = "sort-controls";
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
      } = computeShowProgress(show);

      return `
        <div class="show-card" data-id="${show.shows.slug_id}">
          <div class="poster-container">
            <img
              class="poster"
              src="https://${show.shows.image_poster}"
              alt="${show.shows.title} poster"
            />
          </div>

          <div class="info-container">
            <p class="title">${show.shows.title}</p>
            <p class="next_episode">${nextEpisodeInfo}</p>

            <div class="progress-container">
              <div class="progress-bar">
                <div
                  class="progress-bar-fill"
                  style="width: ${progressBarPercent}%;"
                ></div>
              </div>
              <p class="progress_text">${progressText}</p>
            </div>

            <div class="next_episode_info_container">
              <button
                class="episode_info_btn"
                data-episode="${show.next_episode.id}"
              >
                Episode info
              </button>
              <p class="episodes_left">${episodesLeft} left</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".episode_info_btn").forEach((btn) => {
    attachEpisodeInfoHandler(btn);
  });
}
