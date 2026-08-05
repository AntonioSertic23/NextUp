import {
  getNextEpisodeById,
  updateNextEpisode,
  removeShowFromWatchlist,
  resortWatchlist,
} from "../stores/watchlistStore.js";
import { markEpisodes } from "../api/episodes.js";
import { getShowNextEpisode } from "../api/watchlist.js";
import { formatDate, formatEpisodeInfo } from "../utils/format.js";
import { MARK_ICON, UNMARK_ICON } from "../utils/icons.js";
import { computeListShowProgress } from "../utils/progress.js";
import { hasEpisodeAired } from "../utils/aired.js";

/**
 * Updates the mark/unmark button to reflect the watched state.
 * The button is icon-only — labels are exposed via `aria-label` /
 * `title` so screen readers and tooltips stay informative.
 *
 * @param {HTMLElement} markBtn - The button element to update.
 * @param {boolean} watched - Whether the episode is marked as watched.
 */
export function updateMarkButton(markBtn, watched) {
  if (watched) {
    markBtn.classList.remove("mark-watched");
    markBtn.classList.add("unmark-watched");
    markBtn.innerHTML = UNMARK_ICON;
    markBtn.setAttribute("aria-label", "Unmark as watched");
    markBtn.setAttribute("title", "Unmark as watched");
  } else {
    markBtn.classList.remove("unmark-watched");
    markBtn.classList.add("mark-watched");
    markBtn.innerHTML = MARK_ICON;
    markBtn.setAttribute("aria-label", "Mark as watched");
    markBtn.setAttribute("title", "Mark as watched");
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
    computeListShowProgress(nextEpisode);

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
  if (episodeInfoBtn && nextEpisode.next_episode?.id)
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

    const updateUICallback = async (listShow) => {
      if (episode) {
        const markButton = element.querySelector("button");
        const nowWatched = !episodeData.watched_at;
        updateSeasonProgress(markButton, nowWatched);
        episodeData.watched_at = nowWatched
          ? new Date().toISOString()
          : null;
        return;
      }

      const nextEpisode =
        listShow ?? (await getShowNextEpisode(episodeData.show_id));

      if (!nextEpisode) return;

      if (!nextEpisode.is_completed) {
        updateNextEpisode(nextEpisode);
        resortWatchlist();
        // Dynamic import avoids circular dependency with watchlist.js
        const { renderWatchlist } = await import("./watchlist.js");
        await renderWatchlist();
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
 *   Receives optional refreshed `listShow` from the mark response.
 * @param {boolean} [isWatched=false] - Whether the episode is already marked as watched.
 */
function showEpisodeInfoModal(episode, updateUICallback, isWatched = false) {
  const overlay = document.getElementById("episode-info-modal-overlay");
  const modal = document.getElementById("episode-info-modal");

  overlay.style.display = "flex";
  modal.style.display = "flex";
  document.body.classList.add("modal-open");

  function closeModal() {
    if (markingInFlight) return;
    overlay.style.display = "none";
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }
  document.addEventListener("keydown", onKeyDown);

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeModal;

  const info = modal.querySelector(".episode-info-info");
  info.textContent =
    formatEpisodeInfo(
      episode.season_number,
      episode.episode_number,
      episode.title
    ) || "";

  const date = modal.querySelector(".episode-info-date");
  const airedStr = episode.first_aired ? formatDate(episode.first_aired) : "";
  date.textContent = airedStr ? `Aired on ${airedStr}` : "Air date unknown";

  const overviewEl = modal.querySelector(".episode-info-overview");
  overviewEl.textContent = episode.overview || "";

  const imgTag = modal.querySelector(".modal-img-tag");
  const imgWrap = modal.querySelector(".modal-img");
  if (episode.image_screenshot) {
    imgTag.src = `https://${episode.image_screenshot}`;
    imgTag.style.display = "";
    if (imgWrap) imgWrap.style.display = "";
  } else {
    imgTag.removeAttribute("src");
    imgTag.style.display = "none";
    if (imgWrap) imgWrap.style.display = "none";
  }

  const markBtn = modal.querySelector(".modal-mark-btn");
  updateMarkButton(markBtn, isWatched);

  const episodeAired = hasEpisodeAired(episode);
  markBtn.disabled = !isWatched && !episodeAired;
  markBtn.classList.remove("is-busy");
  markBtn.removeAttribute("aria-busy");
  if (markBtn.disabled) {
    markBtn.setAttribute("title", "Not yet aired");
  }

  let mark = isWatched;
  let markingInFlight = false;

  markBtn.onclick = async () => {
    if (markBtn.disabled || markingInFlight) return;

    markingInFlight = true;
    markBtn.disabled = true;
    markBtn.classList.add("is-busy");
    markBtn.setAttribute("aria-busy", "true");
    markBtn.setAttribute("title", "Saving…");

    const nextMark = !mark;

    try {
      const result = await markEpisodes(
        episode.show_id,
        [episode.id],
        nextMark
      );

      if (result?.success === false) {
        throw new Error("markEpisodes returned unsuccessful");
      }

      mark = nextMark;
      updateMarkButton(markBtn, mark);

      if (typeof updateUICallback === "function") {
        await updateUICallback(result?.listShow ?? null);
      }

      markingInFlight = false;
      markBtn.classList.remove("is-busy");
      markBtn.removeAttribute("aria-busy");
      closeModal();
    } catch (err) {
      alert("Failed to mark episode as watched. Please try again.");
      markingInFlight = false;
      markBtn.disabled = !mark && !episodeAired;
      markBtn.classList.remove("is-busy");
      markBtn.removeAttribute("aria-busy");
      updateMarkButton(markBtn, mark);
      if (markBtn.disabled) {
        markBtn.setAttribute("title", "Not yet aired");
      }
    }
  };
}
