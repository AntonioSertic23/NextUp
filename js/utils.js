// ========================================================
// utils.js
// ========================================================

/**
 * Formats a date string or Date object into `DD/MM/YYYY` format.
 *
 * @param {string|Date} input - The date to format.
 * @returns {string} Formatted date string in `DD/MM/YYYY` format.
 */
export function formatDate(input) {
  if (!input) return "";

  const d = input instanceof Date ? input : new Date(input);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats an episode string in the form `SxxExx - Title`.
 *
 * Pads season and episode numbers to 2 digits.
 *
 * @param {number|string} seasonNumber - Season number.
 * @param {number|string} episodeNumber - Episode number.
 * @param {string} [title] - Optional episode title.
 * @returns {string} Formatted episode string, e.g. `S01E05 - Pilot`.
 */
export function formatEpisodeInfo(seasonNumber, episodeNumber, title) {
  if (seasonNumber == null || episodeNumber == null) return "";

  const season = String(seasonNumber).padStart(2, "0");
  const episode = String(episodeNumber).padStart(2, "0");

  return `S${season}E${episode}${title ? ` - ${title}` : ""}`;
}

/**
 * Returns time remaining until a future date in days and hours.
 *
 * @param {string} isoDate - ISO datetime string (e.g. 2025-11-07T02:00:00+00)
 * @returns {string} Formatted time text or "Aired" if date is in the past
 */
export function getTimeUntil(isoDate) {
  if (!isoDate) return "N/A";

  const now = new Date();
  const target = new Date(isoDate);

  const diffMs = target - now;

  if (diffMs <= 0) return "Aired";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h`;
}

/**
 * Converts minutes to years, months, days, and hours.
 * @param {number} totalMinutes - Total minutes to convert
 * @returns {Object} Object with years, months, days, hours
 */
export function convertMinutesToTime(totalMinutes) {
  const minutesPerHour = 60;
  const hoursPerDay = 24;
  const daysPerMonth = 30; // Approximation
  const daysPerYear = 365; // Approximation

  const totalHours = Math.floor(totalMinutes / minutesPerHour);
  const hours = totalHours % hoursPerDay;
  const totalDays = Math.floor(totalHours / hoursPerDay);
  const days = totalDays % daysPerMonth;
  const totalMonths = Math.floor(totalDays / daysPerMonth);
  const months = totalMonths % 12;
  const years = Math.floor(totalMonths / 12);

  return { years, months, days, hours };
}

/**
 * Formats time breakdown into a readable string.
 * @param {Object} time - Object with years, months, days, hours
 * @returns {string} Formatted string
 */
export function formatTimeBreakdown(time) {
  const parts = [];
  if (time.years > 0) {
    parts.push(`${time.years} ${time.years === 1 ? "year" : "years"}`);
  }
  if (time.months > 0) {
    parts.push(`${time.months} ${time.months === 1 ? "month" : "months"}`);
  }
  if (time.days > 0) {
    parts.push(`${time.days} ${time.days === 1 ? "day" : "days"}`);
  }
  if (time.hours > 0) {
    parts.push(`${time.hours} ${time.hours === 1 ? "hour" : "hours"}`);
  }

  if (parts.length === 0) {
    return "0 hours";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const lastPart = parts.pop();
  return `${parts.join(" ")} and ${lastPart}`;
}

/**
 * Calculates statistics from collection data.
 * @param {Array} shows - Array of show objects
 * @returns {Object} Statistics object
 */
export function calculateStatistics(shows) {
  let totalMinutes = 0;
  let totalEpisodes = 0;
  let totalShows = 0;
  let totalSeasons = 0;
  const genreCounts = {};
  const showWatchTime = [];

  shows.forEach((show) => {
    const seasons = Array.isArray(show.seasons) ? show.seasons : [];
    const runtime = show.runtime || 0;

    // Exclude specials
    const effectiveSeasons = seasons.filter((s) => {
      if (!s) return false;
      if (s.season_number === 0) return false;
      if (s.title && /special/i.test(s.title)) return false;
      return true;
    });

    let showEpisodes = 0;
    let showSeasons = 0;
    let hasWatchedEpisodes = false;

    effectiveSeasons.forEach((season) => {
      const episodes = Array.isArray(season.episodes) ? season.episodes : [];
      let seasonHasWatched = false;

      episodes.forEach((ep) => {
        const isWatched =
          !!ep.watched || (ep.plays != null && ep.plays > 0) || !!ep.completed;
        if (isWatched) {
          totalEpisodes += 1;
          showEpisodes += 1;
          totalMinutes += runtime;
          seasonHasWatched = true;
          hasWatchedEpisodes = true;
        }
      });

      if (seasonHasWatched) {
        showSeasons += 1;
      }
    });

    if (hasWatchedEpisodes) {
      totalShows += 1;
      totalSeasons += showSeasons;

      // Track watch time for top shows
      showWatchTime.push({
        title: show.title,
        minutes: showEpisodes * runtime,
        seasons: showSeasons,
        episodes: showEpisodes,
      });

      // Count genres
      (show.genres ?? "")
        .split(",")
        .filter(Boolean)
        .forEach((genre) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + showEpisodes;
        });
    }
  });

  // Get top 3 genres
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, episodes: count }));

  // Get top 3 shows by watch time
  const topShows = showWatchTime
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3)
    .map((show) => ({
      title: show.title,
      hours: Math.floor(show.minutes / 60),
      seasons: show.seasons,
      episodes: show.episodes,
    }));

  return {
    totalMinutes,
    totalEpisodes,
    totalShows,
    totalSeasons,
    topGenres,
    topShows,
  };
}
