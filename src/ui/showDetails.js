import { manageCollection } from "../api/shows.js";
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
