// ========================================================
// syncNextEpisodes-background.js - Daily scheduled sync
// Background function (up to ~15 min) — scheduled sync often exceeds
// the 30s limit of regular scheduled functions.
// ========================================================

import { runSyncNextEpisodes } from "../lib/syncNextEpisodesCore.js";

export const handler = async () => {
  try {
    const results = await runSyncNextEpisodes();
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error("syncNextEpisodes-background failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
