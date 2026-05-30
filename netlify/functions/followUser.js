import {
  resolveUserIdFromToken,
} from "../lib/supabase.js";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function handler(event) {
  let followerId;
  try {
    followerId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  if (event.httpMethod === "GET") {
    try {
      const { data: rows, error } = await admin
        .from("user_follows")
        .select("following_id, created_at")
        .eq("follower_id", followerId);

      if (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: error.message }),
        };
      }

      const ids = (rows ?? []).map((r) => r.following_id);
      let profileMap = new Map();
      if (ids.length) {
        const { data: users } = await admin
          .from("users")
          .select("id, email, display_name")
          .in("id", ids);
        profileMap = new Map((users ?? []).map((u) => [u.id, u]));
      }

      const following = (rows ?? []).map((r) => {
        const u = profileMap.get(r.following_id);
        return {
          userId: r.following_id,
          followedAt: r.created_at,
          displayName:
            u?.display_name || u?.email?.split("@")[0] || "User",
          email: u?.email,
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ following }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { action, email, userId: targetUserId } = body;

  try {
    if (action === "follow") {
      if (!email?.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Email is required" }),
        };
      }

      const { data: target, error: lookupErr } = await admin
        .from("users")
        .select("id, email, display_name")
        .ilike("email", email.trim())
        .maybeSingle();

      if (lookupErr || !target) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "No user found with that email" }),
        };
      }

      if (target.id === followerId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "You cannot follow yourself" }),
        };
      }

      const { error } = await admin.from("user_follows").insert({
        follower_id: followerId,
        following_id: target.id,
      });

      if (error) {
        if (error.code === "23505") {
          return {
            statusCode: 409,
            body: JSON.stringify({ error: "Already following this user" }),
          };
        }
        throw error;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            userId: target.id,
            displayName:
              target.display_name || target.email?.split("@")[0] || "User",
            email: target.email,
          },
        }),
      };
    }

    if (action === "unfollow") {
      if (!targetUserId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "userId is required" }),
        };
      }

      const { error } = await admin
        .from("user_follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", targetUserId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
