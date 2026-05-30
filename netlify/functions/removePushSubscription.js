import { resolveUserIdFromToken } from "../lib/supabase.js";
import { deletePushSubscriptionsForUser } from "../lib/webPush.js";

const JSON_HDR = { "Content-Type": "application/json" };

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
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

  let endpoint;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    endpoint = body.endpoint;
  } catch {
    endpoint = undefined;
  }

  try {
    await deletePushSubscriptionsForUser(userId, endpoint);
    return {
      statusCode: 200,
      headers: JSON_HDR,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("removePushSubscription:", err);
    return {
      statusCode: 500,
      headers: JSON_HDR,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
