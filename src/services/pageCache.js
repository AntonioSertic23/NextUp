/**
 * Tracks when cached page data (watchlist, stats) is stale after
 * progress changes on another route (e.g. marking episodes on show page).
 */

let watchlistStale = false;
let statsStale = false;

export function invalidateWatchlistAndStats() {
  watchlistStale = true;
  statsStale = true;
}

export function consumeWatchlistStale() {
  const stale = watchlistStale;
  watchlistStale = false;
  return stale;
}

export function consumeStatsStale() {
  const stale = statsStale;
  statsStale = false;
  return stale;
}

export function invalidateStatsOnly() {
  statsStale = true;
}
