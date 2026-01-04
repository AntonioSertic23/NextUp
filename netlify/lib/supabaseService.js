// ========================================================
// lib/supabaseService.js
// ========================================================

import { createClient } from "@supabase/supabase-js";

export const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
