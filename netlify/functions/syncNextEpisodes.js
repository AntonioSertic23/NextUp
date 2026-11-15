// ========================================================
// functions/syncNextEpisodes.js - Manual HTTP trigger
// Profile "Sync New Episodes" posts here. Scheduled cron lives in
// syncNextEpisodes-background.js (Netlify: schedule ≠ HTTP URL).
// ========================================================

import { runSyncNextEpisodes } from "../lib/syncNextEpisodesCore.js";

// Netlify's proxy drops responses that take ~26 s or more, so each call
// works for a limited time and reports where to continue.
const TIME_BUDGET_MS = 15_000;

export const handler = async (event) => {
  let offset = 0;
  try {
    offset = Number(JSON.parse(event.body || "{}").offset) || 0;
  } catch {
    /* no body: start from the beginning */
  }

  try {
    const results = await runSyncNextEpisodes({
      offset,
      deadline: Date.now() + TIME_BUDGET_MS,
    });
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error("syncNextEpisodes failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
