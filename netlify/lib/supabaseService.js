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
 * @returns {Promise<string|null>} Returns UUID of the show in the DB, or null if failed
 * @throws Will throw an error if upsert fails critically
 */
export async function saveShow(show, lastWatchedAt) {
  try {
    const {
      data: { id: showId },
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
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save show:", show.title, error);
      throw new Error(`Failed to save show '${show.title}': ${error.message}`);
    }

    if (!showId) {
      console.warn("Upsert returned no data for show:", show.title);
      return null;
    }

    return showId;
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
export async function saveUserEpisodes(seasons, showId, userId) {
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
 * Retrieve a show with its nested seasons and episodes.
 *
 * - Fetches the show from the "shows" table by ID
 * - Fetches all seasons for that show
 * - Fetches all episodes for those seasons
 * - Returns a nested structure where each season includes its episodes
 *
 * @param {string} showId - The ID of the show to fetch
 * @returns {Promise<Object|null>} A show object with nested `seasons` array,
 *                                each season containing an `episodes` array.
 *                                Returns `null` if the show is not found or on error.
 */
export async function getShowWithSeasonsAndEpisodes(showId) {
  try {
    // Fetch show
    const { data: show, error: showError } = await SUPABASE.from("shows")
      .select("*")
      .eq("id", showId)
      .single();

    if (showError || !show) {
      console.error("Show not found:", showError?.message);
      return null;
    }

    // Fetch seasons for this show
    const { data: seasons, error: seasonsError } = await SUPABASE.from(
      "seasons"
    )
      .select("*")
      .eq("show_id", showId)
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

    // Nest episodes into seasons
    const seasonsWithEpisodes = seasons.map((season) => ({
      ...season,
      episodes: episodes
        ? episodes.filter((ep) => ep.season_id === season.id)
        : [],
    }));

    // Return show with nested seasons & episodes
    return {
      ...show,
      seasons: seasonsWithEpisodes,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return null;
  }
}

/**
 * Saves a watched episode for a user in the database
 * and returns the Trakt episode ID.
 *
 * @param {string} userId - User UUID.
 * @param {string} episodeId - Episode UUID.
 * @returns {Promise<number>} Trakt episode ID.
 * @throws {Error} If insert or lookup fails.
 */
export async function saveUserEpisode(userId, episodeId) {
  try {
    // Insert watched episode
    await SUPABASE.from("user_episodes").upsert(
      {
        user_id: userId,
        episode_id: episodeId,
      },
      { onConflict: "user_id,episode_id" }
    );

    // Fetch trakt_id from episodes table
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("trakt_id")
      .eq("id", episodeId)
      .single();

    if (fetchError || !data) {
      throw new Error("Failed to fetch trakt_id for episode");
    }

    return data.trakt_id;
  } catch (err) {
    console.error("saveUserEpisode failed:", episodeId, err);
    throw err;
  }
}

/**
 * Deletes a watched episode entry for a user
 * and returns the Trakt episode ID.
 *
 * @param {string} userId - User UUID.
 * @param {string} episodeId - Episode UUID.
 * @returns {Promise<number>} Trakt episode ID.
 * @throws {Error} If delete or lookup fails.
 */
export async function deleteUserEpisode(userId, episodeId) {
  try {
    // 1. Fetch trakt_id first
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("trakt_id")
      .eq("id", episodeId)
      .single();

    if (fetchError || !data) {
      throw new Error("Failed to fetch trakt_id for episode");
    }

    const traktId = data.trakt_id;

    // 2. Delete watched episode
    const { error: deleteError } = await SUPABASE.from("user_episodes")
      .delete()
      .eq("user_id", userId)
      .eq("episode_id", episodeId);

    if (deleteError) {
      throw deleteError;
    }

    return traktId;
  } catch (err) {
    console.error("deleteUserEpisode failed:", episodeId, err);
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
 * Updates the list_shows entry after marking or unmarking an episode.
 *
 * - Increments or decrements watched_episodes
 * - Recomputes next_episode
 * - Updates completion state only when incrementing
 *
 * @param {string} userId - User UUID.
 * @param {string} showId - Show UUID.
 * @param {"increment" | "decrement"} direction - Update direction.
 * @throws {Error} If database operations fail.
 */
export async function updateListShows(userId, showId, direction) {
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
    const delta = direction === "increment" ? 1 : -1;
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

    if (direction === "increment") {
      updatePayload.is_completed = isCompleted;
      updatePayload.completed_at = isCompleted
        ? new Date().toISOString()
        : null;
    }

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
