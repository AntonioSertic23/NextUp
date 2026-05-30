/**
 * Clears in-memory library caches after Trakt sync or similar bulk updates.
 */
import { invalidateWatchlistAndStats } from "./pageCache.js";
import { invalidateDefaultListIdCache } from "../api/watchlist.js";
import { invalidateListMembershipCache } from "../api/lists.js";
import { setWatchlist } from "../stores/watchlistStore.js";
import {
  setAllCollectionShows,
  setUpcomingEpisodes,
  setAvailableGenres,
} from "../stores/myShowsStore.js";
import { clearStats } from "../stores/statsStore.js";

export function resetLibraryPageCaches() {
  invalidateWatchlistAndStats();
  invalidateDefaultListIdCache();
  invalidateListMembershipCache();
  setWatchlist([], null);
  setAllCollectionShows([], null);
  setUpcomingEpisodes([]);
  setAvailableGenres([]);
  clearStats();
}
