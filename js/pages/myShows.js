// ========================================================
// pages/myShows.js - Render My Shows Page
// ========================================================

import { getToken } from "../services/authService.js";
import { getNextEpisodes } from "../api.js";
import { renderMyShowsCollection } from "../ui.js";

/**
 * Calculates the number of days and hours until a given date.
 * @param {string} firstAired - ISO date string of when episode airs (includes time)
 * @returns {Object|null} Object with days and hours until the episode airs, or null if in the past
 */
function calculateTimeUntil(firstAired) {
  if (!firstAired) return null;

  const now = new Date();
  const airedDate = new Date(firstAired);

  // Only consider future episodes
  if (airedDate < now) return null;

  // Calculate difference in milliseconds
  const diffMs = airedDate - now;

  // Calculate days and remaining hours
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { days, hours };
}

/**
 * Renders the My Shows page showing collection sorted by days until next episode.
 * @param {HTMLElement} main - Main app container for this page.
 * @returns {Promise<void>}
 */
export async function renderMyShows(main) {
  const token = await getToken();

  const collectionDiv = document.createElement("div");
  collectionDiv.id = "collection-container";

  main.appendChild(collectionDiv);

  // Show loading state
  collectionDiv.innerHTML = "<p class='loading-text'>Loading shows...</p>";

  // TODO: Commented out until the retrieval and storage of series is moved to Supabase instead of localStorage.
  /* try {
    // Fetch collection (without sorting, we'll sort by days)
    // const shows = await getMyShowsData(token, null);

    if (shows.length === 0) {
      collectionDiv.innerHTML =
        "<p class='no-results'>No shows found in your collection.</p>";
      return;
    }

    // Extract show IDs for next episode API call
    const showIds = shows.map((show) => show.ids.trakt).filter(Boolean);

    // Fetch next episode information from Trakt API
    const nextEpisodesData = await getNextEpisodes(token, showIds);

    // Load cache to check for episode details
    const cache = loadCache();

    // Create a map of showId -> nextEpisode for quick lookup
    const nextEpisodeMap = {};
    nextEpisodesData.forEach((item) => {
      if (item.nextEpisode) {
        nextEpisodeMap[item.showId] = item.nextEpisode;
      }
    });

    // For each show with nextEpisode, find the episode details (especially first_aired)
    const showsWithNextEpisode = await Promise.all(
      shows.map(async (show) => {
        const nextEpisodeBasic = nextEpisodeMap[show.ids.trakt];
        if (!nextEpisodeBasic) {
          return null;
        }

        // Try to find episode in cache first
        let episodeDetails = null;
        const showInCache = cache[show.ids.trakt];
        if (
          showInCache &&
          Array.isArray(showInCache.seasons) &&
          showInCache.seasons.length > 0
        ) {
          const season = showInCache.seasons.find(
            (s) => s.number === nextEpisodeBasic.season
          );
          if (season && Array.isArray(season.episodes)) {
            episodeDetails = season.episodes.find(
              (ep) => ep.number === nextEpisodeBasic.number
            );
          }
        }

        // If not in cache, fetch episode details from Trakt API
        if (!episodeDetails) {
          try {
            const res = await fetch(`/.netlify/functions/getEpisodeDetails`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                showId: show.ids.trakt,
                season: nextEpisodeBasic.season,
                episode: nextEpisodeBasic.number,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              episodeDetails = data.episode;
            }
          } catch (err) {
            console.warn(
              `Failed to fetch episode details for ${show.ids.trakt} S${nextEpisodeBasic.season}E${nextEpisodeBasic.number}:`,
              err
            );
          }
        }

        if (!episodeDetails || !episodeDetails.first_aired) {
          return null;
        }

        const timeUntil = calculateTimeUntil(episodeDetails.first_aired);
        if (timeUntil === null) {
          return null;
        }

        return {
          ...show,
          daysUntilNext: timeUntil.days,
          hoursUntilNext: timeUntil.hours,
          nextEpisode: {
            ...nextEpisodeBasic,
            ...episodeDetails,
            seasonNumber: nextEpisodeBasic.season,
            episodeNumber: nextEpisodeBasic.number,
          },
        };
      })
    );

    // Filter out null values and sort by time until next episode (days + hours)
    const filteredShows = showsWithNextEpisode.filter(Boolean).sort((a, b) => {
      // Sort by total hours until next episode (ascending - fewer hours first)
      const totalHoursA = a.daysUntilNext * 24 + a.hoursUntilNext;
      const totalHoursB = b.daysUntilNext * 24 + b.hoursUntilNext;
      return totalHoursA - totalHoursB;
    });

    if (filteredShows.length === 0) {
      collectionDiv.innerHTML =
        "<p class='no-results'>No upcoming episodes found in your collection.</p>";
      return;
    }

    // Render the collection with days until next episode
    renderMyShowsCollection(collectionDiv, filteredShows);

    // Add click event to each show card to navigate to its details page
    collectionDiv.querySelectorAll(".show-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        location.hash = `show/${id}`;
      });
    });
  } catch (error) {
    console.error("Error loading My Shows:", error);
    collectionDiv.innerHTML = `<p class='error-text'>Error loading shows: ${error.message}</p>`;
  } */
}
