/**
 * Which episodes count toward list progress (matches show page / stats rules).
 */

export function isCountableEpisode(episode) {
  if (!episode) return false;
  const season = Number(episode.season_number);
  if (!Number.isFinite(season) || season <= 0) return false;
  if (episode.episode_type === "special") return false;
  const title = String(episode.title || "");
  if (/special/i.test(title)) return false;
  return true;
}

export function filterCountableEpisodes(episodes) {
  return (episodes || []).filter(isCountableEpisode);
}

export function countableEpisodeIds(episodes) {
  return filterCountableEpisodes(episodes).map((ep) => ep.id);
}
