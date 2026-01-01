// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

/**
 * Formats a raw Trakt show object into a standardized format for caching.
 *
 * @param {Object} rawShow - Raw show object from Trakt API
 * @param {Array} seasons - Array of seasons (optional, defaults to rawShow.seasons)
 * @param {string|null} lastCollectedAt - Last collected timestamp (optional)
 * @param {string|null} lastUpdatedAt - Last updated timestamp (optional)
 * @returns {Object} Formatted show object
 */
function formatShowObject(
  rawShow,
  seasons = null,
  lastCollectedAt = null,
  lastUpdatedAt = null
) {
  // Use provided seasons or fall back to rawShow.seasons
  const showSeasons =
    seasons !== null
      ? seasons
      : Array.isArray(rawShow.seasons)
      ? rawShow.seasons
      : [];

  // Transform images from Trakt format (images.poster.full) to expected format (images.poster)
  const images = rawShow.images || {};
  const formattedImages = {
    poster: images.poster?.full || images.poster || "",
    fanart: images.fanart?.full || images.fanart || "",
  };

  return {
    last_collected_at: lastCollectedAt || null,
    last_updated_at:
      lastUpdatedAt || rawShow.last_updated_at || rawShow.updated_at || null,
    title: rawShow.title || "",
    year: rawShow.year || 0,
    ids: rawShow.ids || {},
    tagline: rawShow.tagline || "",
    overview: rawShow.overview || "",
    first_aired: rawShow.first_aired || "",
    airs: rawShow.airs || {},
    runtime: rawShow.runtime || 0,
    certification: rawShow.certification || "",
    country: rawShow.country || "",
    status: rawShow.status || "",
    rating: rawShow.rating || 0,
    trailer: rawShow.trailer || "",
    homepage: rawShow.homepage || "",
    network: rawShow.network || "",
    updated_at: rawShow.updated_at || "",
    language: rawShow.language || "",
    genres: rawShow.genres || [],
    images: formattedImages,
    seasons: showSeasons,
  };
}

/**
 * Formats raw Trakt API collection data into a simplified
 * object structure optimized for localStorage caching.
 *
 * @param {Array} data - Raw data array returned from Trakt API.
 * @returns {Object} Formatted object where each key is a show's Trakt ID.
 *
 * Example return format:
 * {
 *   "48587": {
 *     title: "Brooklyn Nine-Nine",
 *     ids: { trakt: 48587, slug: "brooklyn-nine-nine", ... },
 *     year: 2013
 *   },
 *   ...
 * }
 */
export function formatCollectionData(data) {
  const formatted = {};

  data.forEach((item) => {
    // Use seasons from item.show if present (server may have enriched), otherwise fall back to progress.seasons
    const seasons = Array.isArray(item.show && item.show.seasons)
      ? item.show.seasons
      : Array.isArray(item.progress && item.progress.seasons)
      ? item.progress.seasons
      : [];

    formatted[item.show.ids.trakt] = formatShowObject(
      item.show,
      seasons,
      item.last_collected_at,
      item.last_updated_at
    );
  });

  return formatted;
}

export function formatEpisodesData(seasons, show) {
  // Ensure show.seasons exists
  show.seasons = show.seasons || [];

  // Helper to find watched info in show.progress (raw watched object)
  const watchedRaw = show.progress || null;

  // Loop through each fetched season and merge into cached show
  seasons.forEach((fSeason) => {
    // Find or create the corresponding season in the cached show
    let cSeason = show.seasons.find((s) => s.number === fSeason.number);
    if (!cSeason) {
      // push a copy of fetched season
      cSeason = {
        ...fSeason,
      };
      show.seasons.push(cSeason);
    } else {
      // merge basic fields from fetched season
      cSeason.title = cSeason.title || fSeason.title;
      cSeason.episode_count = cSeason.episode_count || fSeason.episode_count;
      cSeason.episodes = cSeason.episodes || [];
    }

    // Ensure episodes array exists on fetched season
    if (!Array.isArray(fSeason.episodes)) return;

    // For each fetched episode, find or add to cached season and merge details
    fSeason.episodes.forEach((fEp) => {
      let cEp = cSeason.episodes.find((ep) => ep.number === fEp.number);
      if (!cEp) {
        cEp = { ...fEp };
        cSeason.episodes.push(cEp);
      } else {
        // Merge title and other missing fields
        cEp.title = cEp.title || fEp.title;
        cEp.first_aired = cEp.first_aired || fEp.first_aired;
        cEp.overview = cEp.overview || fEp.overview;
        cEp.images = cEp.images || fEp.images;
      }

      // Attach watched metadata from watchedRaw if available
      if (watchedRaw && Array.isArray(watchedRaw.seasons)) {
        const wSeason = watchedRaw.seasons.find(
          (ws) => ws.number === fSeason.number
        );
        if (wSeason && Array.isArray(wSeason.episodes)) {
          const wEp = wSeason.episodes.find((we) => we.number === fEp.number);
          if (wEp) {
            cEp.watched = !!(wEp.plays != null ? wEp.plays > 0 : wEp.completed);
            if (wEp.plays != null) cEp.plays = wEp.plays;
            if (wEp.last_watched) cEp.last_watched = wEp.last_watched;
          }
        }
      } else {
        // If fetched season/episode already contains 'watched' flag, preserve it
        if (typeof fEp.watched === "boolean") {
          cEp.watched = fEp.watched;
        } else if (cEp.watched == null) {
          cEp.watched = false;
        }
      }
    });
  });

  return show;
}

/**
 * Sorts an array of shows based on the specified sort criteria.
 * @param {Array} shows - Array of show objects to sort
 * @param {string} [sortBy='title'] - Sort criteria: 'title', 'year', 'rating', 'top_rated', 'episodes_left', 'last_collected_at', 'last_updated_at'
 * @returns {Array} Sorted array of shows
 */
function sortShows(shows, sortBy = "title") {
  if (!Array.isArray(shows) || shows.length === 0) return shows;

  const sorted = [...shows];

  switch (sortBy) {
    case "title":
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "year":
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case "top_rated":
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "episodes_left":
      // TODO
      break;
    case "last_collected_at":
      sorted.sort((a, b) => {
        const aDate = a.last_collected_at
          ? new Date(a.last_collected_at).getTime()
          : 0;
        const bDate = b.last_collected_at
          ? new Date(b.last_collected_at).getTime()
          : 0;
        return bDate - aDate; // Most recently collected first
      });
      break;
    case "last_updated_at":
      sorted.sort((a, b) => {
        const aDate = a.last_updated_at
          ? new Date(a.last_updated_at).getTime()
          : 0;
        const bDate = b.last_updated_at
          ? new Date(b.last_updated_at).getTime()
          : 0;
        return bDate - aDate; // Most recently updated first
      });
      break;
    default:
      // Default: no sorting (return as-is)
      break;
  }

  return sorted;
}

/**
 * Returns only shows that have at least one unwatched episode.
 * @param {Array} shows - Array of show objects (from cache or API)
 * @returns {Array}
 */
function filterUnwatchedShows(shows) {
  return shows.filter((show) => {
    if (!Array.isArray(show.seasons)) return false;
    // For each non-specials season, check if any episode is unwatched
    for (const season of show.seasons) {
      if (
        !season ||
        season.number === 0 ||
        (season.title && /special/i.test(season.title))
      )
        continue;
      if (!Array.isArray(season.episodes)) continue;
      for (const ep of season.episodes) {
        // Accept all variants: watched===false, watched==null, played==0/null, !completed, etc.
        if (!ep.watched && !(ep.plays > 0) && !ep.completed) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * Fetches the user's Trakt collection (persistent list, not auto-removed as with collection).
 *
 * - Checks if a cached version exists in localStorage.
 * - If it exists and `forceRefresh` is false, returns the cached data immediately.
 * - Otherwise, fetches the latest data from the Netlify serverless function (`/.netlify/functions/getCollection`, which now proxies /collection),
 *   formats it for local storage, saves it, and then returns it.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {string} [sortBy] - Optional sort criteria: 'title', 'year', 'rating', etc.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache and fetches the latest data from the API.
 * @returns {Promise<Array>} A list (array) of shows from the user's collection.
 */
export async function getCollection(token, sortBy, forceRefresh = false) {
  const cache = loadCache();
  const hasCache = Object.keys(cache).length > 0;

  if (hasCache && !forceRefresh) {
    console.log("Using cached collection");

    const filtered = filterUnwatchedShows(Object.values(cache));

    return sortBy ? sortShows(filtered, sortBy) : filtered;
  }

  clearCache();

  console.log("Fetching collection from Trakt API...");

  const res = await fetch("/.netlify/functions/getCollection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  // Format and store data in cache
  const formatted = formatCollectionData(data);
  saveCache(formatted);

  const filtered = filterUnwatchedShows(Object.values(formatted));

  return sortBy ? sortShows(filtered, sortBy) : filtered;
}

/**
 * Retrieves show details from cache or fetches from Trakt API if not cached.
 * If show is not in cache, it will be fetched, formatted, and added to cache.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {string} showId - The unique identifier of the show.
 * @returns {Promise<Object|null>} The show details, or null if not found.
 */
export async function getShowDetails(token, showId) {
  const cache = loadCache();
  let show = cache[showId];

  // If show is in cache, return it
  if (show) {
    // Ensure seasons and episodes arrays exist and normalize watched flags
    show.seasons = show.seasons || [];
    show.seasons.forEach((season) => {
      season.episodes = season.episodes || [];
      season.episodes.forEach((ep) => {
        if (ep.watched == null) ep.watched = false;
      });
    });
    return show;
  }

  // Show not in cache, fetch from Trakt API
  console.log(`Show ${showId} not in cache, fetching from Trakt API...`);

  try {
    const res = await fetch("/.netlify/functions/getShowDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, showId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`getShowDetails failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const rawShow = data.show;

    // Format show data to match cache structure
    const formattedShow = formatShowObject(
      rawShow,
      Array.isArray(rawShow.seasons) ? rawShow.seasons : [],
      null,
      null
    );

    // Ensure watched flags are normalized
    formattedShow.seasons.forEach((season) => {
      season.episodes = season.episodes || [];
      season.episodes.forEach((ep) => {
        if (ep.watched == null) ep.watched = false;
      });
    });

    // Only save to cache if show is already in user's collection
    // Check if show exists in collection by checking if it has last_collected_at
    // or by checking if it's in the collection cache
    const existingCache = loadCache();
    const isInCollection = existingCache[showId]?.last_collected_at != null;

    if (isInCollection) {
      // Show is in collection, update cache
      updateCache(showId, formattedShow);
    }
    // If not in collection, don't save to cache (fixes auto-add issue)

    return formattedShow;
  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Searches for TV shows on Trakt API using a query string.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {string} query - Search query (show name).
 * @param {number} [page=1] - Page number for pagination (default: 1).
 * @param {number} [limit=10] - Number of results per page (default: 10).
 * @returns {Promise<Object>} Object with `results` array and `pagination` info.
 */
export async function searchShows(token, query, page = 1, limit = 10) {
  if (!token || !query || !query.trim()) {
    throw new Error("Token and query are required");
  }

  const res = await fetch("/.netlify/functions/searchShows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      query: query.trim(),
      page,
      limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Mark or unmark an episode as watched via Netlify function + Trakt sync.
 * Updates local cache on success and returns the updated show object.
 *
 * @param {string} token - Trakt access token
 * @param {number|string} showId - Trakt show id
 * @param {number} seasonNumber - season number
 * @param {number} episodeNumber - episode number within season
 * @param {number|string} episodeTraktId - Trakt episode id
 * @param {boolean} mark - true = mark watched, false = unmark
 * @returns {Object|null} updated show object or null on failure
 */
export async function markEpisodeWatched(
  token,
  showId,
  seasonNumber,
  episodeNumber,
  episodeTraktId,
  mark
) {
  const res = await fetch("/.netlify/functions/markEpisode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      action: mark ? "mark" : "unmark",
      traktId: episodeTraktId,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`markEpisode failed: ${res.status} ${text}`);
  }

  // Update local cache: prefer direct update by showId + seasonNumber + episodeNumber
  const cache = loadCache();
  const show = cache[showId];
  const season = show.seasons.find((s) => s.number === seasonNumber);
  const ep = season.episodes.find((e) => e.number === episodeNumber);

  ep.watched = !!mark;
  if (mark) {
    ep.plays = (ep.plays ?? 0) + 1;
    ep.last_watched = new Date().toISOString();
  } else {
    ep.plays = 0;
    delete ep.last_watched;
  }

  updateCache(showId, show);
  return show;
}

/**
 * Mark/unmark all episodes in a season.
 * @param {string} token
 * @param {string|number} showId
 * @param {number} seasonNumber
 * @param {boolean} mark
 * @param {Array} episodeIds array of trakt episode ids
 * @returns {Object|null} updated show or null
 */
export async function markSeasonWatched(
  token,
  showId,
  seasonNumber,
  mark,
  episodeIds
) {
  // Call markEpisode endpoint for each episode trakt id sequentially to avoid rate spikes
  for (const traktId of episodeIds) {
    try {
      const res = await fetch("/.netlify/functions/markEpisode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: mark ? "mark" : "unmark",
          traktId,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(
          `markSeasonWatched: episode ${traktId} failed: ${res.status} ${text}`
        );
      } else {
        // consume body to avoid connection leaks
        await res.json().catch(() => null);
      }
    } catch (err) {
      console.warn(
        "markSeasonWatched: network error for episode",
        traktId,
        err.message
      );
    }
  }

  // Update cache locally by matching episode trakt ids
  const cache = loadCache();
  const show = cache[showId];
  if (!show) return null;

  const season = (show.seasons || []).find((s) => s.number === seasonNumber);
  if (!season) return null;

  const idsSet = new Set(episodeIds.map((id) => String(id)));
  for (const ep of season.episodes || []) {
    if (ep.ids && idsSet.has(String(ep.ids.trakt))) {
      ep.watched = !!mark;
      if (mark) {
        ep.plays = (ep.plays ?? 0) + 1;
        ep.last_watched = new Date().toISOString();
      } else {
        ep.plays = 0;
        delete ep.last_watched;
      }
    }
  }

  updateCache(showId, show);
  return show;
}

/**
 * Add or remove a show from user's Trakt collection.
 *
 * @param {string} token - Trakt access token
 * @param {string|number} showId - Trakt show ID
 * @param {boolean} add - true to add, false to remove
 * @returns {Promise<Object>} Response from Trakt API
 */
export async function manageCollection(token, showId, add) {
  const res = await fetch("/.netlify/functions/manageCollection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      showId,
      action: add ? "add" : "remove",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`manageCollection failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Fetches next episode information for multiple shows from Trakt API.
 *
 * @param {string} token - Trakt access token
 * @param {Array<string|number>} showIds - Array of Trakt show IDs
 * @returns {Promise<Array>} Array of objects with showId and nextEpisode
 */
export async function getNextEpisodes(token, showIds) {
  if (!token || !Array.isArray(showIds) || showIds.length === 0) {
    throw new Error("Token and non-empty showIds array are required");
  }

  const res = await fetch("/.netlify/functions/getNextEpisodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      showIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getNextEpisodes failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}
