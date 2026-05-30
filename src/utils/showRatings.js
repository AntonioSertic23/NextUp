/**
 * Personal show ratings — 5-tier "Hype meter" (not Trakt community stars).
 */

export const HYPE_TIERS = [
  { score: 1, short: "I", label: "Later", hint: "Low priority — maybe someday" },
  { score: 2, short: "II", label: "Fair", hint: "Decent, not a priority" },
  { score: 3, short: "III", label: "Solid", hint: "Worth your time" },
  { score: 4, short: "IV", label: "Love", hint: "One of your go-to shows" },
  { score: 5, short: "V", label: "Peak", hint: "Essential — top of the queue" },
];

export function getTierByScore(score) {
  const n = Number(score);
  return HYPE_TIERS.find((t) => t.score === n) ?? null;
}

export function isValidRatingScore(score) {
  const n = Number(score);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * @param {Array<{ score: number, shows?: { title?: string } }>} rows
 */
export function computePersonalRatingStats(rows) {
  const rated = rows ?? [];
  const totalRated = rated.length;
  if (!totalRated) {
    return {
      totalRated: 0,
      averageScore: 0,
      tierCounts: Object.fromEntries(HYPE_TIERS.map((t) => [t.score, 0])),
      topRated: [],
    };
  }

  let sum = 0;
  const tierCounts = Object.fromEntries(HYPE_TIERS.map((t) => [t.score, 0]));

  for (const row of rated) {
    const s = row.score;
    sum += s;
    if (tierCounts[s] != null) tierCounts[s] += 1;
  }

  const topRated = [...rated]
    .sort((a, b) => b.score - a.score || (a.shows?.title || "").localeCompare(b.shows?.title || ""))
    .slice(0, 8)
    .map((row) => ({
      title: row.shows?.title || "Unknown",
      slugId: row.shows?.slug_id,
      score: row.score,
      tier: getTierByScore(row.score),
    }));

  return {
    totalRated,
    averageScore: (sum / totalRated).toFixed(1),
    tierCounts,
    topRated,
  };
}
