import {
  getNextEpisodeById,
  updateNextEpisode,
  removeShowFromWatchlist,
} from "../stores/watchlistStore.js";
import { markEpisodes } from "../api/episodes.js";
import { getShowNextEpisode } from "../api/watchlist.js";
import { formatDate, formatEpisodeInfo } from "../utils/format.js";

/**
 * Updates the mark/unmark button text and classes based on watched status.
 * @param {HTMLElement} markBtn - The button element to update.
 * @param {boolean} watched - Whether the episode is marked as watched.
 */
export function updateMarkButton(markBtn, watched) {
  if (watched) {
    markBtn.classList.remove("mark-watched");
    markBtn.classList.add("unmark-watched");
    markBtn.textContent = "Unmark";
  } else {
    markBtn.classList.remove("unmark-watched");
    markBtn.classList.add("mark-watched");
    markBtn.textContent = "Mark";
  }
}

/**
 * Updates the visual progress of a season when episodes or seasons are marked/unmarked.
 *
 * @param {HTMLElement} btn - The button that triggered the action.
 * @param {boolean} markAsWatched - Whether the episode/season is marked as watched.
 * @param {boolean} [setAll=false] - If true, updates the entire season at once.
 */
export function updateSeasonProgress(btn, markAsWatched, setAll = false) {
  const season = btn.closest(".season");
  if (!season) return;

  const progressBarFill = season.querySelector(".progress-bar-fill");
  const progressText = season.querySelector(".progress_text");

  let [watched, total] = progressText.textContent
    .split("/")
    .map((v) => parseInt(v.trim(), 10));

  if (setAll) {
    watched = markAsWatched ? total : 0;

    const episodeDivs = season.querySelectorAll(".episode");
    episodeDivs.forEach((epDiv) => {
      const epBtn = epDiv.querySelector("button");
      updateMarkButton(epBtn, markAsWatched);
    });
  } else {
    watched = markAsWatched ? watched + 1 : watched - 1;
    updateMarkButton(btn, markAsWatched);
  }

  watched = Math.max(0, Math.min(watched, total));

  const percent = Math.round((watched / total) * 100);

  progressBarFill.style.width = `${percent}%`;
  progressText.textContent = `${watched}/${total}`;
}

/**
 * Updates the watchlist show card with the next episode information.
 * @param {Object} nextEpisode - The next episode object.
 */
export function updateWatchlistShowCard(nextEpisode) {
  const showCard = document.querySelector(
    `.show-card[data-id="${nextEpisode.shows.slug_id}"]`
  );

  if (!showCard) {
    console.warn(`No show card found with ID ${nextEpisode.shows.slug_id}.`);
    return;
  }

  const { nextEpisodeInfo, progressBarPercent, progressText, episodesLeft } =
    computeShowCardProgress(nextEpisode);

  const nextEpisodeEl = showCard.querySelector(".next_episode");
  const progressBarFillEl = showCard.querySelector(".progress-bar-fill");
  const progressTextEl = showCard.querySelector(".progress_text");
  const episodesLeftEl = showCard.querySelector(".episodes_left");
  const episodeInfoBtn = showCard.querySelector(".episode_info_btn");

  if (nextEpisodeEl) nextEpisodeEl.textContent = nextEpisodeInfo || "";
  if (progressBarFillEl)
    progressBarFillEl.style.width = `${progressBarPercent}%`;
  if (progressTextEl) progressTextEl.textContent = progressText || "";
  if (episodesLeftEl)
    episodesLeftEl.textContent = episodesLeft ? `${episodesLeft} left` : "";
  if (episodeInfoBtn)
    episodeInfoBtn.setAttribute("data-episode", nextEpisode.next_episode.id);
}

/**
 * Removes a show card from the UI based on its slug identifier.
 * @param {string} traktIdentifier - The slug identifier of the show.
 */
export function removeWatchlistShowCard(traktIdentifier) {
  const showCard = document.querySelector(
    `.show-card[data-id="${traktIdentifier}"]`
  );

  if (showCard) {
    showCard.remove();
  } else {
    console.warn(`No show card found with ID ${traktIdentifier}.`);
  }
}

function computeShowCardProgress(show) {
  const nextEpisodeInfo = formatEpisodeInfo(
    show.next_episode.season_number,
    show.next_episode.episode_number,
    show.next_episode.title
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
 * Attaches a click handler to an episode element that opens the episode modal.
 *
 * @param {HTMLElement} element - The clickable episode element.
 * @param {Object} [episode] - Episode data. When omitted, looks up by data attribute.
 */
export function attachEpisodeInfoHandler(element, episode) {
  if (!element) return;

  element.addEventListener("click", (e) => {
    e.stopPropagation();

    let episodeData;

    if (!episode) {
      const episodeId = element.getAttribute("data-episode");
      if (!episodeId) {
        alert("Unable to show episode info: missing ID.");
        return;
      }

      episodeData = getNextEpisodeById(episodeId);
    } else {
      episodeData = episode;
    }

    if (!episodeData) {
      alert("Episode information could not be retrieved.");
      return;
    }

    const updateUICallback = async () => {
      if (episode) {
        const markButton = element.querySelector("button");
        updateSeasonProgress(markButton, !episodeData.watched_at);
        return;
      }

      const nextEpisode = await getShowNextEpisode(episodeData.show_id);

      if (!nextEpisode.is_completed) {
        updateWatchlistShowCard(nextEpisode);
        updateNextEpisode(nextEpisode);
      } else {
        removeWatchlistShowCard(nextEpisode.shows.slug_id);
        removeShowFromWatchlist(nextEpisode.shows.slug_id);
      }
    };

    showEpisodeInfoModal(
      episodeData,
      updateUICallback,
      !!episodeData.watched_at
    );
  });
}

/**
 * Shows the episode info modal and populates it with episode details.
 *
 * @param {Object} episode - The episode object to display.
 * @param {Function} updateUICallback - Callback invoked after marking/unmarking.
 * @param {boolean} [isWatched=false] - Whether the episode is already marked as watched.
 */
function showEpisodeInfoModal(episode, updateUICallback, isWatched = false) {
  const overlay = document.getElementById("episode-info-modal-overlay");
  const modal = document.getElementById("episode-info-modal");

  overlay.style.display = "flex";
  modal.style.display = "flex";

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  };

  const info = modal.querySelector(".episode-info-info");
  info.textContent =
    formatEpisodeInfo(
      episode.season_number,
      episode.episode_number,
      episode.title
    ) || "";

  const date = modal.querySelector(".episode-info-date");
  date.textContent = `Aired on ${formatDate(episode.first_aired)}`;

  const overviewEl = modal.querySelector(".episode-info-overview");
  overviewEl.textContent = episode.overview || "";

  const imgTag = modal.querySelector(".modal-img-tag");
  if (episode.image_screenshot) {
    imgTag.src = `https://${episode.image_screenshot}`;
  } else {
    imgTag.style.display = "none";
  }

  const markBtn = modal.querySelector(".modal-mark-btn");
  updateMarkButton(markBtn, isWatched);

  let mark = isWatched;

  markBtn.onclick = async () => {
    try {
      const showUpdated = await markEpisodes(
        episode.show_id,
        [episode.id],
        !mark
      );

      if (showUpdated) {
        mark = !mark;
        updateMarkButton(markBtn, mark);

        if (typeof updateUICallback === "function") {
          updateUICallback();
          overlay.style.display = "none";
        }
      }
    } catch (err) {
      alert("Failed to mark episode as watched. Please try again.");
    }
  };
}
