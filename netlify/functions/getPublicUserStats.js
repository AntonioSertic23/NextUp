import {
  resolveUserIdFromToken,
  getDefaultListId,
} from "../lib/supabase.js";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let viewerId;
  try {
    viewerId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const params = event.queryStringParameters || {};
  const targetUserId = params.userId;

  if (!targetUserId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "userId query parameter required" }),
    };
  }

  try {
    const { data: followRow } = await admin
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", viewerId)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (!followRow && targetUserId !== viewerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Follow this user to view their statistics",
        }),
      };
    }

    const { data: profile } = await admin
      .from("users")
      .select("id, email, display_name")
      .eq("id", targetUserId)
      .single();

    const listId = await getDefaultListId(targetUserId);
    if (!listId) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          user: formatProfile(profile),
          shows: [],
        }),
      };
    }

    const { data, error } = await admin
      .from("list_shows")
      .select(
        `
        show:shows (
          *,
          show_genres (
            genres (name, slug)
          ),
          seasons (
            *,
            episodes (
              *,
              user_episodes (
                watched_at,
                user_id
              )
            )
          )
        )
        `,
      )
      .eq("list_id", listId);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    const normalizedShows =
      data
        ?.filter(({ show }) => show?.seasons)
        .map(({ show }) => ({
          ...show,
          seasons: show.seasons.map((season) => ({
            ...season,
            episodes: (season.episodes || []).map(
              ({ user_episodes, ...ep }) => {
                const ue = (user_episodes || []).find(
                  (u) => u.user_id === targetUserId,
                );
                return {
                  ...ep,
                  watched_at: ue?.watched_at ?? null,
                  watched: !!ue,
                };
              },
            ),
          })),
        })) ?? [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: formatProfile(profile),
        shows: normalizedShows,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

function formatProfile(profile) {
  return {
    userId: profile.id,
    displayName:
      profile.display_name || profile.email?.split("@")[0] || "User",
    email: profile.email,
  };
}
