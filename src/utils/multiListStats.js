/**
 * Aggregates list_shows rows into per-list and cross-list analytics.
 * @param {Array<{id: string, name: string, is_default?: boolean}>} lists
 * @param {Array<Object>} rows - list_shows with nested shows
 */
export function buildMultiListAnalytics(lists, rows) {
  const safeRows = rows ?? [];

  const perList = (lists ?? []).map((list) => {
    const listRows = safeRows.filter((r) => r.list_id === list.id);
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    let episodesWatched = 0;
    let episodesTotal = 0;
    let estMinutes = 0;

    for (const row of listRows) {
      const w = row.watched_episodes ?? 0;
      const t = row.total_episodes ?? 0;
      episodesWatched += w;
      episodesTotal += t;
      estMinutes += w * (row.shows?.runtime ?? 0);

      if (row.is_completed) completed += 1;
      else if (w > 0) inProgress += 1;
      else notStarted += 1;
    }

    const showCount = listRows.length;
    const completionPct =
      showCount > 0 ? Math.round((completed / showCount) * 100) : 0;

    return {
      listId: list.id,
      name: list.name,
      isDefault: !!list.is_default,
      showCount,
      completed,
      inProgress,
      notStarted,
      episodesWatched,
      episodesLeft: Math.max(0, episodesTotal - episodesWatched),
      completionPct,
      estWatchHours: Math.floor(estMinutes / 60),
    };
  });

  const showToListIds = new Map();
  for (const row of safeRows) {
    const sid = row.show_id;
    if (!showToListIds.has(sid)) showToListIds.set(sid, new Set());
    showToListIds.get(sid).add(row.list_id);
  }

  const overlapShows = [...showToListIds.values()].filter((s) => s.size > 1).length;
  const uniqueShows = showToListIds.size;
  const totalListEntries = safeRows.length;

  const withShows = perList.filter((p) => p.showCount > 0);
  const busiestList = [...withShows].sort((a, b) => b.showCount - a.showCount)[0] ?? null;
  const mostCompleteList =
    [...withShows].sort((a, b) => b.completionPct - a.completionPct)[0] ?? null;
  const mostToWatchList =
    [...withShows].sort((a, b) => b.episodesLeft - a.episodesLeft)[0] ?? null;

  const totalEpisodesLeft = perList.reduce((s, p) => s + p.episodesLeft, 0);
  const totalEpisodesWatched = perList.reduce((s, p) => s + p.episodesWatched, 0);
  const totalEstHours = perList.reduce((s, p) => s + p.estWatchHours, 0);

  const avgShowsPerList =
    lists.length > 0
      ? Math.round((totalListEntries / lists.length) * 10) / 10
      : 0;

  const defaultList = perList.find((p) => p.isDefault) ?? null;
  const secondaryLists = perList.filter((p) => !p.isDefault);
  const secondaryShowCount = secondaryLists.reduce((s, p) => s + p.showCount, 0);
  const emptyListCount = perList.filter((p) => p.showCount === 0).length;
  const duplicateEntries = Math.max(0, totalListEntries - uniqueShows);

  const backlogRanking = [...withShows]
    .sort((a, b) => b.episodesLeft - a.episodesLeft)
    .slice(0, 3);

  const collectionSharePct =
    totalListEntries > 0 && defaultList
      ? Math.round((defaultList.showCount / totalListEntries) * 100)
      : 0;

  return {
    perList,
    insights: {
      listCount: lists.length,
      uniqueShows,
      totalListEntries,
      overlapShows,
      overlapPct:
        uniqueShows > 0
          ? Math.round((overlapShows / uniqueShows) * 100)
          : 0,
      busiestList,
      mostCompleteList,
      mostToWatchList,
      totalEpisodesLeft,
      totalEpisodesWatched,
      totalEstHours,
      avgShowsPerList,
      defaultList,
      secondaryShowCount,
      secondaryListCount: secondaryLists.length,
      emptyListCount,
      duplicateEntries,
      backlogRanking,
      collectionSharePct,
    },
  };
}
