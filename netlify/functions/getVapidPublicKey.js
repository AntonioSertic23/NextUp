import { getVapidPublicKey } from "../lib/webPush.js";

const JSON_HDR = { "Content-Type": "application/json" };

export async function handler() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return {
      statusCode: 503,
      headers: JSON_HDR,
      body: JSON.stringify({
        error: "Push notifications are not configured on this server.",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: JSON_HDR,
    body: JSON.stringify({ publicKey }),
  };
}
