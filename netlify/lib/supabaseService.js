// ========================================================
// lib/supabaseService.js
// ========================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Resolves the authenticated Supabase user ID from an Authorization header.
 *
 * Expects a Bearer token containing a valid Supabase access token (JWT).
 *
 * @async
 * @param {string} authorization - Authorization header value ("Bearer <token>")
 * @returns {Promise<string>} Supabase user ID
 * @throws {Error} If the token is missing or invalid
 */
export async function resolveUserIdFromToken(authorization) {
  const accessToken = authorization?.replace("Bearer ", "");

  if (!accessToken) throw new Error("Missing access token");

  const { data, error } = await SUPABASE.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new Error("Invalid or expired token");
  }

  return data.user.id;
}

/**
 * Saves or updates a show in the database.
 * @param {Object} show - Show object from Trakt API
 * @param {string|null} lastWatchedAt - Last watched timestamp
 * @returns {Promise<string|null>} Returns slug_id of the show in the DB, or null if failed
 * @throws Will throw an error if upsert fails critically
 */
export async function saveShow(show, lastWatchedAt) {
  try {
    const {
      data: { id: showId, slug_id: traktIdentifier },
      error,
    } = await SUPABASE.from("shows")
      .upsert(
        {
          trakt_id: show.ids?.trakt,
          slug_id: show.ids?.slug ?? null,
          tvdb_id: show.ids?.tvdb ?? null,
          imdb_id: show.ids?.imdb ?? null,
          tmdb_id: show.ids?.tmdb ?? null,
          last_watched_at: lastWatchedAt ?? null,
          title: show.title ?? null,
          year: show.year ?? null,
          tagline: show.tagline ?? null,
          overview: show.overview ?? null,
          first_aired: show.first_aired ?? null,
          airs_day: show.airs?.day ?? null,
          airs_time: show.airs?.time ?? null,
          airs_timezone: show.airs?.timezone ?? null,
          runtime: show.runtime ?? null,
          country: show.country ?? null,
          status: show.status ?? null,
          rating: show.rating ?? null,
          votes: show.votes ?? null,
          trailer: show.trailer ?? null,
          homepage: show.homepage ?? null,
          network: show.network ?? null,
          updated_at: show.updated_at ?? null,
          language: show.language ?? null,
          genres: show.genres.join(",") ?? null,
          subgenres: show.subgenres.join(",") ?? null,
          aired_episodes: show.aired_episodes ?? null,
          image_fanart: show.images?.fanart[0] ?? null,
          image_poster: show.images?.poster[0] ?? null,
          image_logo: show.images?.logo[0] ?? null,
          image_clearart: show.images?.clearart[0] ?? null,
          image_banner: show.images?.banner[0] ?? null,
          image_thumb: show.images?.thumb[0] ?? null,
        },
        { onConflict: "trakt_id", returning: "representation" }
      )
      .select("id, slug_id")
      .single();

    if (error) {
      console.error("Failed to save show:", show.title, error);
      throw new Error(`Failed to save show '${show.title}': ${error.message}`);
    }

    if (!showId || !traktIdentifier) {
      console.warn("Upsert returned no data for show:", show.title);
      return null;
    }

    return { showId, traktIdentifier };
  } catch (err) {
    console.error("Unexpected error in saveShow:", show.title, err);
    throw err;
  }
}

/**
 * Gets episode ID from database
 * @param {number} showId
 * @param {number} seasonNumber
 * @param {number} episodeNumber
 * @returns {Promise<number|null>} Episode ID or null if not found
 */
async function getEpisodeId(showId, seasonNumber, episodeNumber) {
  const { data, error } = await SUPABASE.from("episodes")
    .select("id")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .eq("episode_number", episodeNumber)
    .single();

  if (error || !data) {
    console.warn(
      `Episode not found: show ${showId}, season ${seasonNumber}, episode ${episodeNumber}`
    );
    return null;
  }

  return data.id;
}

/**
 * Saves all user episode watch data
 * @param {Array} seasons - Array of season objects from Trakt
 * @param {number} showId - Supabase show id
 * @param {string} userId - Supabase user id
 * @returns {Promise<void>}
 */
export async function saveTraktUserEpisodes(seasons, showId, userId) {
  for (const season of seasons) {
    for (const episode of season.episodes) {
      const episodeId = await getEpisodeId(
        showId,
        season.number,
        episode.number
      );

      if (!episodeId) {
        console.warn("Skipping episode:", season.number, episode.number);
        continue;
      }

      await SUPABASE.from("user_episodes").upsert(
        {
          user_id: userId,
          episode_id: episodeId,
          watched_at: episode.last_watched_at ?? null,
        },
        { onConflict: "user_id,episode_id" }
      );
    }
  }
}

/**
 * Saves all seasons and episodes for a show
 * @param {Array} seasons - Array of season objects from Trakt
 * @param {number} showId - Supabase show id
 * @returns {Promise<void>}
 */
export async function saveShowSeasonsAndEpisodes(seasons, showId) {
  for (const season of seasons) {
    const { data } = await SUPABASE.from("seasons")
      .upsert(
        {
          tmdb_id: season.ids?.tmdb ?? null,
          tvdb_id: season.ids?.tvdb ?? null,
          trakt_id: season.ids?.trakt,
          show_id: showId,
          season_number: season.number,
          title: season.title ?? null,
          episode_count: season.episode_count ?? null,
          aired_episodes: season.aired_episodes ?? null,
          votes: season.votes ?? null,
          rating: season.rating ?? null,
          image_thumb: season.images?.thumb[0] ?? null,
          image_poster: season.images?.poster[0] ?? null,
          overview: season.overview ?? null,
          updated_at: season.updated_at ?? null,
          first_aired: season.first_aired ?? null,
        },
        { onConflict: "trakt_id", returning: "representation" }
      )
      .select("id")
      .single();

    let seasonId = data?.id;

    for (const episode of season.episodes) {
      await SUPABASE.from("episodes").upsert(
        {
          show_id: showId,
          season_id: seasonId,
          trakt_id: episode.ids?.trakt,
          imdb_id: episode.ids?.imdb ?? null,
          tmdb_id: episode.ids?.tmdb ?? null,
          tvdb_id: episode.ids?.tvdb ?? null,
          title: episode.title ?? null,
          votes: episode.votes ?? null,
          image_screenshot: episode.images?.screenshot[0] ?? null,
          episode_number: episode.number,
          rating: episode.rating ?? null,
          season_number: episode.season,
          runtime: episode.runtime ?? null,
          overview: episode.overview ?? null,
          updated_at: episode.updated_at ?? null,
          first_aired: episode.first_aired ?? null,
          episode_type: episode.episode_type ?? null,
        },
        { onConflict: "trakt_id" }
      );
    }
  }
}

/**
 * Retrieves a show from the database together with its seasons, episodes,
 * user watch progress, and collection status.
 *
 * Lookup strategy:
 * - Matches by internal show ID if provided
 * - Optionally matches by Trakt-related identifiers (slug, trakt_id, imdb_id, etc.)
 *   with automatic type handling (numeric vs string identifiers)
 *
 * Data returned:
 * - Show base fields
 * - Nested seasons with episodes
 * - Each episode enriched with optional user watch metadata
 * - Boolean `in_collection` indicating whether the show exists
 *   in the user's default list
 *
 * Notes:
 * - All data is retrieved from Supabase
 *
 * @param {string} userId - Authenticated user UUID
 * @param {string} traktIdentifier - Trakt identifier (slug ID)
 * @returns {Promise<Object|null>}
 * Returns `null` if the show does not exist or on unrecoverable error.
 */
export async function getShowWithSeasonsAndEpisodes(userId, traktIdentifier) {
  try {
    // TODO: This can be implemented in a simpler way, similar to getStatsData()

    // Fetch show from database
    const { data: show, error: showError } = await SUPABASE.from("shows")
      .select("*")
      .eq("slug_id", traktIdentifier)
      .maybeSingle();

    if (showError || !show) {
      console.error("Show not found:", showError?.message);
      return null;
    }

    // Fetch seasons for this show
    const { data: seasons, error: seasonsError } = await SUPABASE.from(
      "seasons"
    )
      .select("*")
      .eq("show_id", show.id)
      .order("season_number", { ascending: true });

    if (seasonsError) {
      console.error("Error fetching seasons:", seasonsError.message);
      return { ...show, seasons: [] };
    }

    const seasonIds = seasons.map((s) => s.id);

    // Fetch episodes for these seasons
    const { data: episodes, error: episodesError } = await SUPABASE.from(
      "episodes"
    )
      .select("*")
      .in("season_id", seasonIds)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      console.error("Error fetching episodes:", episodesError.message);
    }

    // Fetch user episodes for show
    const episodeIds = episodes?.map((ep) => ep.id) ?? [];

    // Count watched episodes from user_episodes
    const { data: watchedData, error: watchedError } = await SUPABASE.from(
      "user_episodes"
    )
      .select("episode_id, watched_at")
      .eq("user_id", userId)
      .in("episode_id", episodeIds || []);

    if (watchedError) {
      console.error("Error fetching watched episodes:", watchedError);
    }

    let seasonsWithEpisodes;

    if (watchedData?.length) {
      // Nest watched data into episodes
      const episodesWithWatchedData = episodes.map((episode) => ({
        ...episode,
        watched_at: watchedData
          ? watchedData.find((ep) => ep.episode_id === episode.id)
              ?.watched_at || null
          : null,
      }));

      // Nest episodes with watched data into seasons
      seasonsWithEpisodes = seasons.map((season) => ({
        ...season,
        episodes: episodesWithWatchedData
          ? episodesWithWatchedData.filter((ep) => ep.season_id === season.id)
          : [],
      }));
    } else {
      // Nest episodes into seasons
      seasonsWithEpisodes = seasons.map((season) => ({
        ...season,
        episodes: episodes
          ? episodes.filter((ep) => ep.season_id === season.id)
          : [],
      }));
    }

    let in_collection = false;
    const listId = await getDefaultListId(userId);

    // Check if show is in the default list
    const { count, error: lsError } = await SUPABASE.from("list_shows")
      .select("id", { count: "exact", head: true })
      .eq("show_id", show.id)
      .eq("list_id", listId);

    if (lsError) {
      console.error(
        "Error checking if show is in collection:",
        lsError.message
      );
      return { ...show, seasons: seasonsWithEpisodes, in_collection };
    }

    in_collection = (count ?? 0) > 0;

    // Return show with nested seasons & episodes
    return {
      ...show,
      seasons: seasonsWithEpisodes,
      in_collection,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return null;
  }
}

/**
 * Marks one or more episodes as watched for a user and returns their Trakt IDs.
 *
 * @param {string} userId - User UUID.
 * @param {string[]} episodeIds - List of episode UUIDs.
 * @returns {Promise<number[]>} Array of Trakt episode IDs.
 * @throws {Error} If upsert or lookup fails.
 */
export async function saveUserEpisodes(userId, episodeIds) {
  try {
    // Prepare rows for bulk upsert
    const rows = episodeIds.map((episodeId) => ({
      user_id: userId,
      episode_id: episodeId,
    }));

    //  Bulk upsert
    const { error: upsertError } = await SUPABASE.from("user_episodes").upsert(
      rows,
      { onConflict: "user_id,episode_id" }
    );

    if (upsertError) {
      throw upsertError;
    }

    // Fetch trakt_ids for all episodes
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("trakt_id")
      .in("id", episodeIds);

    if (fetchError) {
      throw fetchError;
    }

    return data.map((row) => row.trakt_id);
  } catch (err) {
    console.error("saveUserEpisodes failed:", episodeIds, err);
    throw err;
  }
}

/**
 * Deletes one or more watched episodes for a user and returns their Trakt IDs.
 *
 * @param {string} userId - User UUID.
 * @param {string[]} episodeIds - List of episode UUIDs to delete.
 * @returns {Promise<number[]>} Array of Trakt episode IDs of deleted episodes.
 * @throws {Error} If delete or lookup fails.
 */
export async function deleteUserEpisodes(userId, episodeIds) {
  try {
    if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
      return [];
    }

    // 1. Fetch trakt_ids first
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("id, trakt_id")
      .in("id", episodeIds);

    if (fetchError) throw fetchError;

    const traktIds = data.map((row) => row.trakt_id);

    // 2. Bulk delete watched episodes
    const { error: deleteError } = await SUPABASE.from("user_episodes")
      .delete()
      .eq("user_id", userId)
      .in("episode_id", episodeIds);

    if (deleteError) throw deleteError;

    return traktIds;
  } catch (err) {
    console.error("deleteUserEpisodes failed:", episodeIds, err);
    throw err;
  }
}

/**
 * Fetches the next unwatched episode for a given show and list of watched episode IDs.
 *
 * @async
 * @param {number|string} showId - Supabase show ID
 * @param {Array<number|string>} watchedIds - Array of watched episode IDs
 * @returns {Promise<number|null>} ID of the next unwatched episode, or null if all watched
 * @throws {Error} If the query fails
 */
export async function getNextUnwatchedEpisode(showId, watchedIds) {
  try {
    const { data: nextEpisode, error } = await SUPABASE.from("episodes")
      .select("id")
      .eq("show_id", showId)
      .not("id", "in", `(${watchedIds.join(",")})`)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return nextEpisode?.id ?? null;
  } catch (err) {
    console.error("getNextUnwatchedEpisode failed:", err);
    throw err;
  }
}

/**
 * Updates the list_shows entry after marking or unmarking episodes.
 *
 * - Can increment or decrement watched_episodes by a specified count.
 * - Recomputes `next_episode` based on user's watched episodes.
 * - Updates `is_completed` and `completed_at` only when incrementing or decrementing.
 *
 * @param {string} userId - UUID of the user.
 * @param {string} showId - UUID of the show.
 * @param {"increment" | "decrement"} direction - Update direction.
 * @param {number} count - Number of episodes to increment or decrement (default 0).
 * @throws {Error} If database operations fail.
 */
export async function updateListShows(userId, showId, direction, count = 0) {
  try {
    const {
      data: { id: listId },
      error: listError,
    } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (listError || !listId) {
      throw new Error("Default list not found for user");
    }

    // Fetch current list_shows row
    const { data: listShow, error: fetchError } = await SUPABASE.from(
      "list_shows"
    )
      .select("id, watched_episodes, total_episodes")
      .eq("list_id", listId)
      .eq("show_id", showId)
      .single();

    if (fetchError || !listShow) {
      throw new Error("Failed to fetch list_shows entry");
    }

    // Compute new watched count
    const delta = direction === "increment" ? count : -count;
    const newWatchedCount = Math.max(0, listShow.watched_episodes + delta);

    const isCompleted =
      direction === "increment" && newWatchedCount >= listShow.total_episodes;

    // Fetch all episodes already watched by the user
    const { data: watchedEpisodes, error: watchedError } = await SUPABASE.from(
      "user_episodes"
    )
      .select("episode_id")
      .eq("user_id", userId);

    if (watchedError) throw watchedError;

    // Convert the result to a simple array of IDs
    const watchedIds = watchedEpisodes.map((ep) => ep.episode_id);

    const nextEpisodeId = await getNextUnwatchedEpisode(showId, watchedIds);

    // Build update payload
    const updatePayload = {
      watched_episodes: newWatchedCount,
      next_episode: nextEpisodeId,
    };

    updatePayload.is_completed = isCompleted;
    updatePayload.completed_at = isCompleted ? new Date().toISOString() : null;

    // Update by primary key
    const { error: updateError } = await SUPABASE.from("list_shows")
      .update(updatePayload)
      .eq("id", listShow.id);

    if (updateError) {
      throw updateError;
    }
  } catch (err) {
    console.error("updateListShows failed:", err);
    throw err;
  }
}

/**
 * Get the default list ID for a given user.
 *
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} The default list ID, or null if not found / error
 */
export async function getDefaultListId(userId) {
  try {
    const {
      data: { id: listId },
      error,
    } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error) {
      console.error("Error fetching default list:", error.message);
      return null;
    }

    return listId ?? null;
  } catch (err) {
    console.error("Unexpected error fetching default list:", err);
    return null;
  }
}

/**
 * Add a show to a user's list.
 *
 * @async
 * @param {number} showId - Supabase show ID
 * @param {number} listId - Supabase list ID
 * @param {string} userId - Supabase user ID
 * @returns {Promise<void>}
 */
export async function addShowToList(showId, listId, userId) {
  try {
    const listShow = await getListShowInformation(showId, listId, userId);

    const { error } = await SUPABASE.from("list_shows").upsert(listShow, {
      onConflict: "list_id,show_id",
    });

    if (error) throw error;
  } catch (err) {
    console.error("addShowToList failed:", err);
    throw err;
  }
}

/**
 * Remove a show from a list.
 *
 * @async
 * @param {number} listId - Supabase list ID
 * @param {number} showId - Supabase show ID
 * @returns {Promise<void>}
 */
export async function removeShowFromList(listId, showId) {
  try {
    const { error } = await SUPABASE.from("list_shows")
      .delete()
      .eq("list_id", listId)
      .eq("show_id", showId);

    if (error) throw error;
  } catch (err) {
    console.error("deleteUserEpisode failed:", err);
    throw err;
  }
}

/**
 * Retrieves all necessary information to insert a show into a user's list.
 *
 * @async
 * @param {number|string} showId - The Supabase ID of the show
 * @param {number|string} listId - The ID of the user's list
 * @param {string} userId - Supabase user ID
 * @returns {Promise<Object>} Object containing list-show information:
 *  - list_id
 *  - show_id
 *  - is_completed
 *  - completed_at
 *  - watched_episodes
 *  - total_episodes
 *  - next_episode (episode id)
 */
async function getListShowInformation(showId, listId, userId) {
  // Get all episode IDs of the show
  const { data: allEpisodes, error: episodesError } = await SUPABASE.from(
    "episodes"
  )
    .select("id")
    .eq("show_id", showId);

  if (episodesError) {
    console.error("Error fetching episodes:", episodesError);
    throw episodesError;
  }

  const episodeIds = allEpisodes?.map((ep) => ep.id);

  // Count watched episodes from user_episodes
  const { data: watchedData, error: watchedError } = await SUPABASE.from(
    "user_episodes"
  )
    .select("episode_id, watched_at")
    .eq("user_id", userId)
    .in("episode_id", episodeIds || []);

  if (watchedError) {
    console.error("Error fetching watched episodes:", watchedError);
    throw watchedError;
  }

  const watchedEpisodes = watchedData?.length || 0;

  // Total episodes for the show
  const { data: totalData, error: totalError } = await SUPABASE.from("episodes")
    .select("id")
    .eq("show_id", showId);

  if (totalError) {
    console.error("Error fetching total episodes:", totalError);
    throw totalError;
  }

  const totalEpisodes = totalData?.length || 0;

  // Determine if the show is completed
  const isCompleted = watchedEpisodes >= totalEpisodes;

  // Determine completed_at
  let completedAt = null;
  if (isCompleted) {
    const lastWatched = watchedData
      .map((ep) => new Date(ep.watched_at))
      .sort((a, b) => b - a)[0]; // most recent watched episode
    completedAt = lastWatched ? lastWatched.toISOString() : null;
  }

  // Find next episode if not completed
  let nextEpisodeId = null;
  if (!isCompleted) {
    const watchedIds = watchedData.map((ep) => ep.episode_id);

    nextEpisodeId = await getNextUnwatchedEpisode(showId, watchedIds);
  }

  return {
    list_id: listId,
    show_id: showId,
    is_completed: isCompleted,
    completed_at: completedAt,
    watched_episodes: watchedEpisodes,
    total_episodes: totalEpisodes,
    next_episode: nextEpisodeId,
  };
}
