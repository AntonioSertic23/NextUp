import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.trakt.tv";

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Saves or updates a show in the database.
 * @param {Object} show - Show object from Trakt API
 * @param {string|null} lastWatchedAt - Last watched timestamp
 * @returns {Promise<string|null>} Returns UUID of the show in the DB, or null if failed
 * @throws Will throw an error if upsert fails critically
 */
async function saveShow(show, lastWatchedAt) {
  try {
    const { data, error } = await SUPABASE.from("shows")
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
          airs_day: show.airs.day ?? null,
          airs_time: show.airs.time ?? null,
          airs_timezone: show.airs.timezone ?? null,
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

    if (!data?.id) {
      console.warn("Upsert returned no data for show:", show.title);
      return null;
    }

    return data.id;
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
async function saveUserEpisodes(seasons, showId, userId) {
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
async function saveShowSeasonsAndEpisodes(seasons, showId) {
  for (const season of seasons) {
    const { data, error } = await SUPABASE.from("seasons")
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
          image_thumb: season.images?.thumb ?? null,
          image_poster: season.images?.poster ?? null,
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
          image_screenshot: episode.images?.screenshot ?? null,
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
 * Serverless handler to sync user's Trakt collection
 *
 * Behavior:
 * - Fetches watched shows from Trakt
 * - Saves shows, seasons, episodes and user watched episodes to Supabase
 * - Processes all shows sequentially with a 300ms delay between shows
 *
 * @param {import('@netlify/functions').HandlerEvent} event - Netlify function event
 * @returns {Promise<{statusCode: number, body?: string}>} HTTP response
 */
export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let traktToken;
  try {
    traktToken = JSON.parse(event.body)?.token;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  if (!traktToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing Trakt token" }),
    };
  }

  const supabaseAccessToken = event.headers.authorization?.replace(
    "Bearer ",
    ""
  );

  if (!supabaseAccessToken) {
    return {
      statusCode: 401,
      body: "Missing supabase token in headers",
    };
  }

  const { data: userData, error } = await SUPABASE.auth.getUser(
    supabaseAccessToken
  );

  if (error || !userData?.user)
    return { statusCode: 401, body: "Invalid user" };

  const userId = userData.user.id;

  // Fetch watched shows
  const watchedRes = await fetch(
    `${BASE_URL}/users/me/watched/shows?extended=images,full`,
    {
      headers: {
        Authorization: `Bearer ${traktToken}`,
        "trakt-api-version": "2",
        "trakt-api-key": process.env.TRAKT_CLIENT_ID,
        "Content-Type": "application/json",
      },
    }
  );

  if (!watchedRes.ok) {
    return {
      statusCode: watchedRes.status,
      body: JSON.stringify({ error: "Failed to fetch watched shows" }),
    };
  }

  const data = await watchedRes.json();

  for (const show of data) {
    try {
      const showId = await saveShow(show.show, show.last_watched_at);

      // Fetch seasons
      const seasonsRes = await fetch(
        `${BASE_URL}/shows/${show.show.ids.trakt}/seasons?extended=episodes,images&specials=false&count_specials=false`,
        {
          headers: {
            Authorization: `Bearer ${traktToken}`,
            "trakt-api-version": "2",
            "trakt-api-key": process.env.TRAKT_CLIENT_ID,
            "Content-Type": "application/json",
          },
        }
      );

      if (!seasonsRes.ok) continue;

      const seasons = await seasonsRes.json();

      await saveShowSeasonsAndEpisodes(seasons, showId);

      // Safely access seasons property from Trakt response
      if (show.seasons?.length) {
        await saveUserEpisodes(show.seasons, showId, userId);
      }

      await delay(300);
    } catch (err) {
      console.error("Error processing show:", show.show.title, err);
      continue; // Continue with next show
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Sync completed" }),
  };
}
