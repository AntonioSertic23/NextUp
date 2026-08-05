// Manual HTTP trigger — Profile / local testing.
// Scheduled cron lives in notifyAiredEpisodes-background.js.

import { notifyRecentlyAiredEpisodes } from "../lib/notifyAiredEpisodes.js";

export const handler = async () => {
  try {
    const results = await notifyRecentlyAiredEpisodes();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Air notifications checked", ...results }),
    };
  } catch (err) {
    console.error("notifyAiredEpisodes failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
