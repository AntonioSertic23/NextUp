import {
  resolveUserIdFromToken,
} from "../lib/supabase.js";
import {
  upsertPushSubscription,
  getVapidPublicKey,
} from "../lib/webPush.js";

const JSON_HDR = { "Content-Type": "application/json" };

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!getVapidPublicKey()) {
    return {
      statusCode: 503,
      headers: JSON_HDR,
      body: JSON.stringify({ error: "Push is not configured." }),
    };
  }

  let userId;
  try {
    userId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      headers: JSON_HDR,
      body: JSON.stringify({ error: err.message }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HDR,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  try {
    await upsertPushSubscription(
      userId,
      body.subscription,
      event.headers["user-agent"],
    );
    return {
      statusCode: 200,
      headers: JSON_HDR,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("savePushSubscription:", err);
    return {
      statusCode: 500,
      headers: JSON_HDR,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
