import { manageCollection, getRelatedShows } from "../api/shows.js";
import { markEpisodes } from "../api/episodes.js";
import {
  attachEpisodeInfoHandler,
  updateMarkButton,
  updateSeasonProgress,
} from "./episodeModal.js";

function computeSeasonProgress(episodes) {
  const total = episodes.length;
  if (total === 0) return { progressBarPercent: 0, progressText: "0/0" };

  const completed = episodes.filter((ep) => Boolean(ep.watched_at)).length;

  return {
    progressBarPercent: Math.round((completed / total) * 100),
    progressText: `${completed}/${total}`,
    seasonCompleted: completed >= total,
  };
}

function computeEpisodeProgress(episode) {
  const epWatched = !!episode.watched_at;
  const btnClass = epWatched ? "unmark-watched" : "mark-watched";
  const btnText = epWatched ? "Unmark" : "Mark";

  const firstAiredDate = new Date(episode.first_aired);
  let airedStr;
  if (isNaN(firstAiredDate.getTime())) {
    airedStr = "Unknown";
  } else {
    airedStr = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(firstAiredDate);
  }

  const episodeInfo = `S${String(episode.season_number).padStart(
    2,
    "0"
  )}E${String(episode.episode_number).padStart(2, "0")} - ${airedStr}`;

  return { episodeInfo, btnClass, btnText };
}

function renderSeasonEpisodes(episodes) {
  return `
      ${episodes
        .map((ep) => {
          const { episodeInfo, btnClass, btnText } = computeEpisodeProgress(ep);

          return `
          <div class="episode" data-episode-id="${ep.id}">
            <div class="episode_info-container">
              <p class="episode_title">${ep.title || "Untitled"}</p>
              <p class="episode_info">${episodeInfo}</p>
            </div>

            <button class="${btnClass}">${btnText}</button>
          </div>`;
        })
        .join("")}
    `;
}

function renderSeason(season) {
  const seasonDiv = document.createElement("div");
  seasonDiv.classList.add("season");
  seasonDiv.dataset.seasonId = season.season_number;

  const { progressBarPercent, progressText, seasonCompleted } =
    computeSeasonProgress(season.episodes);

  seasonDiv.innerHTML = `
      <div class="season-container">
        <button class="${
          seasonCompleted ? "unmark-watched" : "mark-watched"
        } season_mark_btn">${seasonCompleted ? "Unmark" : "Mark"}</button>
        <p class="season_number">Season ${season.season_number}</p>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progressBarPercent}%;"></div>
          </div>
          <p class="progress_text">${progressText}</p>
        </div>
        <button class="expand_btn">
          <svg class="icon" width="14" height="14" viewBox="0 0 24 24">
            <path d="M8 9l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>
      </div>
      <div class="episodes">${renderSeasonEpisodes(season.episodes)}</div>
    `;
  return seasonDiv;
}

/**
 * Renders show details (title, overview, images, collection button).
 * @param {Object} show - Show object from API
 */
export function renderShowDetails(show) {
  const showContainer = document.getElementById("show-container");

  const collectionBtnClass = show.in_collection
    ? "collection-btn in-collection"
    : "collection-btn";
  const collectionBtnText = show.in_collection
    ? "In Collection"
    : "Add to Collection";

  showContainer.innerHTML = `
    <div class="show_banner-container">
      <img class="show_banner-img" src="https://${show.image_fanart}">
    </div>
    <div class="show_poster-container">
      <img class="show_poster-img" src="https://${show.image_poster}">
      <div class="show-top-container">
        <h2>${show.title} (${show.year})</h2>
        <p class="status">Status: ${show.status}</p>
      </div>
    </div>
    <button class="${collectionBtnClass}" id="collection-btn" data-show-id="${
    show.id
  }">${collectionBtnText}</button>
    <div class="show_other_info-container">
      <p class="tagline">${show.tagline}</p>
      <br>
      <p class="overview">${show.overview}</p>
      <br>
      <div class="more_info-row">
        <p class="rating">⭐ ${parseFloat(show.rating).toFixed(1)}</p>
        -
        <p class="genres">${show.genres}</p>
        -
        <p class="runtime">${show.runtime} min</p>
        -
        <p class="network">${show.network}</p>
      </div>
    </div>
    <div id="seasons"></div>
    <div id="related-shows-section" class="related-shows-section" aria-live="polite"></div>
  `;

  const collectionBtn = showContainer.querySelector("#collection-btn");
  if (collectionBtn) {
    collectionBtn.addEventListener("click", async () => {
      const showId = collectionBtn.dataset.showId;
      if (!showId) return;

      const shouldAdd = !collectionBtn.classList.contains("in-collection");

      collectionBtn.disabled = true;

      try {
        await manageCollection(showId, shouldAdd);

        collectionBtn.textContent = shouldAdd
          ? "In Collection"
          : "Add to Collection";

        collectionBtn.classList.toggle("in-collection", shouldAdd);
      } catch (error) {
        console.error("Failed to manage collection:", error);
        alert("Failed to update collection.");
      } finally {
        collectionBtn.disabled = false;
      }
    });
  }

  renderShowSeasons(showContainer, show.seasons, show.id);
  void renderRecommendedShows(showContainer, show);
}

/** Trakt slug preferred for routing / DB lookup; fallback to numeric trakt id. */
function traktShowLookupId(show) {
  if (show.slug_id) return String(show.slug_id).trim();
  if (show.trakt_id != null && show.trakt_id !== "") return String(show.trakt_id);
  return null;
}

const RELATED_SLIDER_THRESHOLD = 6;

/**
 * Loads Trakt related shows and renders them below seasons (grid or slider).
 *
 * @param {HTMLElement} container - #show-container
 * @param {Object} show - Current show from API
 */
async function renderRecommendedShows(container, show) {
  const sectionEl = container.querySelector("#related-shows-section");
  if (!sectionEl) return;

  const lookupId = traktShowLookupId(show);
  if (!lookupId) {
    sectionEl.remove();
    return;
  }

  sectionEl.innerHTML = `<p class="loading-text related-shows-loading">Loading recommendations…</p>`;

  try {
    const { shows } = await getRelatedShows(lookupId, 1, 24);
    const currentTrakt = show.trakt_id != null ? Number(show.trakt_id) : null;
    const filtered = (shows || []).filter((s) => {
      if (currentTrakt == null || !s?.ids?.trakt) return true;
      return Number(s.ids.trakt) !== currentTrakt;
    });

    if (!filtered.length) {
      sectionEl.remove();
      return;
    }

    const useSlider = filtered.length >= RELATED_SLIDER_THRESHOLD;

    const cardsHtml = filtered
      .map((s) => {
        const poster = s.images?.poster?.[0];
        const posterSrc = poster ? `https://${poster}` : "";
        const navId = s.ids?.slug ?? s.ids?.trakt ?? "";
        const safeTitle = (s.title || "").replace(/</g, "&lt;");
        const encNav = encodeURIComponent(String(navId));
        return `
          <div class="discover-card" data-nav-id="${encNav}">
            <div class="discover-card-poster">
              ${posterSrc ? `<img src="${posterSrc}" alt="${safeTitle}" loading="lazy" />` : ""}
            </div>
            <p class="discover-card-title">${safeTitle}</p>
            <p class="discover-card-year">${s.year ?? ""}</p>
          </div>`;
      })
      .join("");

    if (useSlider) {
      sectionEl.innerHTML = `
        <section class="discover-section related-shows-inner">
          <h2 class="discover-section-title">Recommended shows</h2>
          <div class="discover-slider-wrapper">
            <button type="button" class="slider-arrow slider-arrow-left" aria-label="Scroll left">&#8249;</button>
            <div class="discover-slider">${cardsHtml}</div>
            <button type="button" class="slider-arrow slider-arrow-right" aria-label="Scroll right">&#8250;</button>
          </div>
        </section>
      `;

      const slider = sectionEl.querySelector(".discover-slider");
      const leftArrow = sectionEl.querySelector(".slider-arrow-left");
      const rightArrow = sectionEl.querySelector(".slider-arrow-right");
      const scrollAmount = 500;

      leftArrow.addEventListener("click", () => {
        slider.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      });
      rightArrow.addEventListener("click", () => {
        slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
      });

      function updateArrowVisibility() {
        const maxScroll = slider.scrollWidth - slider.clientWidth;
        leftArrow.classList.toggle("hidden", slider.scrollLeft <= 0);
        rightArrow.classList.toggle(
          "hidden",
          slider.scrollLeft >= maxScroll - 1
        );
      }
      slider.addEventListener("scroll", updateArrowVisibility);
      requestAnimationFrame(updateArrowVisibility);
    } else {
      sectionEl.innerHTML = `
        <section class="discover-section related-shows-inner">
          <h2 class="discover-section-title">Recommended shows</h2>
          <div class="related-shows-grid">${cardsHtml}</div>
        </section>
      `;
    }

    sectionEl.querySelectorAll(".discover-card").forEach((card) => {
      card.addEventListener("click", () => {
        const enc = card.getAttribute("data-nav-id");
        if (enc) {
          const id = decodeURIComponent(enc);
          location.hash = `show?traktIdentifier=${encodeURIComponent(id)}`;
        }
      });
    });
  } catch (err) {
    console.error("Failed to load related shows:", err);
    sectionEl.innerHTML = `<p class="error-text related-shows-error">Recommendations are unavailable right now.</p>`;
  }
}

/**
 * Renders seasons and episodes of a show.
 * @param {HTMLElement} container - Container element to append seasons to
 * @param {Array} seasons - Show seasons
 * @param {string} showId - Internal show UUID.
 */
export function renderShowSeasons(container, seasons, showId) {
  const seasonsContainer = container.querySelector("#seasons");
  const seasonsTitle = document.createElement("p");
  seasonsTitle.classList.add("seasons_title");
  seasonsTitle.textContent = "Seasons";
  seasonsContainer.appendChild(seasonsTitle);

  seasons.forEach((season) => {
    seasonsContainer.appendChild(renderSeason(season));
  });

  seasonsContainer.querySelectorAll(".expand_btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const seasonDiv = btn.closest(".season");
      const episodesDiv = seasonDiv.querySelector(".episodes");

      episodesDiv.classList.toggle("open");
      btn.classList.toggle("open");
    });
  });

  seasonsContainer
    .querySelectorAll(".episode .mark-watched, .episode .unmark-watched")
    .forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.stopPropagation();

        btn.disabled = true;

        const episodeDiv = btn.closest(".episode");
        const episodeId = episodeDiv.dataset.episodeId;
        const markAsWatched = btn.classList.contains("mark-watched");

        try {
          const showUpdated = await markEpisodes(
            showId,
            [episodeId],
            markAsWatched
          );

          if (showUpdated) {
            updateMarkButton(btn, markAsWatched);
            updateSeasonProgress(btn, markAsWatched);
          }
        } catch (err) {
          console.log("err", err);
          alert("Failed to mark episode as watched.");
        } finally {
          btn.disabled = false;
        }
      });
    });

  seasonsContainer.querySelectorAll(".episode").forEach((element) => {
    const episodeId = element.getAttribute("data-episode-id");

    const episodeData = seasons
      .flatMap((season) => season.episodes)
      .find((episode) => episode.id === episodeId);

    if (!episodeData) return;

    attachEpisodeInfoHandler(element, { ...episodeData, show_id: showId });
  });

  seasonsContainer.querySelectorAll(".season_mark_btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();

      btn.disabled = true;
      const seasonDiv = btn.closest(".season");
      const markAsWatched = btn.classList.contains("mark-watched");
      const episodeElements = seasonDiv.querySelectorAll(`.episode`);

      const episodeIds = Array.from(episodeElements)
        .filter((epEl) => {
          const btn = epEl.querySelector("button");
          if (!btn) return false;
          return markAsWatched ? btn.classList.contains("mark-watched") : true;
        })
        .map((epEl) => epEl.dataset.episodeId);

      try {
        const showUpdated = await markEpisodes(
          showId,
          episodeIds,
          markAsWatched
        );

        if (showUpdated) {
          updateMarkButton(btn, markAsWatched);
          updateSeasonProgress(btn, markAsWatched, true);
        }
      } catch (err) {
        console.log("err", err);
        alert("Failed to mark episode as watched.");
      } finally {
        btn.disabled = false;
      }
    });
  });
}
