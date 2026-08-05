// Runs every 30 minutes: if an episode’s first_aired just passed
// (same dates as My Shows → Upcoming), send Web Push.

import { notifyRecentlyAiredEpisodes } from "../lib/notifyAiredEpisodes.js";

export const handler = async () => {
  try {
    const results = await notifyRecentlyAiredEpisodes();
    console.log("notifyAiredEpisodes-background:", JSON.stringify(results));
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error("notifyAiredEpisodes-background failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
