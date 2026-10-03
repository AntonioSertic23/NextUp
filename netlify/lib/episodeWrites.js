/**
 * Decide how to write Trakt episodes without tripping the two unique keys
 * (`trakt_id` and show + season + episode).
 *
 * A watched sync often returns a new trakt id for an episode we already
 * stored. Upserting on trakt_id then tries to INSERT and hits the slot key.
 * Those rows are updated in place instead.
 *
 * @param {Array<Object>} incoming
 * @param {Array<{id: string, trakt_id: number, season_number: number, episode_number: number}>} existing
 * @returns {{ upserts: Array<Object>, retargets: Array<Object> }}
 */
export function planEpisodeWrites(incoming, existing) {
  const bySlot = new Map();
  for (const row of incoming || []) {
    if (row?.trakt_id == null) continue;
    if (row.season_number == null || row.episode_number == null) continue;
    bySlot.set(`${row.season_number}:${row.episode_number}`, row);
  }

  const deduped = [];
  const seenTrakt = new Set();
  for (const row of bySlot.values()) {
    if (seenTrakt.has(row.trakt_id)) continue;
    seenTrakt.add(row.trakt_id);
    deduped.push(row);
  }

  const existingByTrakt = new Map(
    (existing || []).map((row) => [row.trakt_id, row]),
  );
  const existingBySlot = new Map(
    (existing || []).map((row) => [
      `${row.season_number}:${row.episode_number}`,
      row,
    ]),
  );

  const upserts = [];
  const retargets = [];

  for (const row of deduped) {
    const slotKey = `${row.season_number}:${row.episode_number}`;
    const slotRow = existingBySlot.get(slotKey);

    if (!slotRow || slotRow.trakt_id === row.trakt_id) {
      upserts.push(row);
      continue;
    }

    const traktOwner = existingByTrakt.get(row.trakt_id);
    const traktFree = !traktOwner || traktOwner.id === slotRow.id;
    retargets.push({
      ...row,
      id: slotRow.id,
      trakt_id: traktFree ? row.trakt_id : slotRow.trakt_id,
    });
  }

  return { upserts, retargets };
}
