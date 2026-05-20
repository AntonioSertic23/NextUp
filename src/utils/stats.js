/**
 * Converts minutes to years, months, days, and hours.
 * @param {number} totalMinutes - Total minutes to convert
 * @returns {Object} Object with years, months, days, hours
 */
export function convertMinutesToTime(totalMinutes) {
  const minutesPerHour = 60;
  const hoursPerDay = 24;
  const daysPerMonth = 30;

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
 * @param {Array} shows - Array of show objects with seasons and episodes
 * @returns {Object} Statistics object
 */
export function calculateStatistics(shows) {
  let totalMinutes = 0;
  let totalEpisodes = 0;
  let totalShows = 0;
  let totalSeasons = 0;
  let completedShows = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const genreCounts = {};
  const networkCounts = {};
  const showWatchTime = [];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  const monthlyActivity = {};

  shows.forEach((show) => {
    const seasons = Array.isArray(show.seasons) ? show.seasons : [];
    const runtime = show.runtime || 0;

    const effectiveSeasons = seasons.filter((s) => {
      if (!s) return false;
      if (s.season_number === 0) return false;
      if (s.title && /special/i.test(s.title)) return false;
      return true;
    });

    let showEpisodes = 0;
    let showTotalEpisodes = 0;
    let showSeasons = 0;
    let hasWatchedEpisodes = false;

    effectiveSeasons.forEach((season) => {
      const episodes = Array.isArray(season.episodes) ? season.episodes : [];
      let seasonHasWatched = false;

      episodes.forEach((ep) => {
        showTotalEpisodes += 1;
        const isWatched =
          !!ep.watched || (ep.plays != null && ep.plays > 0) || !!ep.completed;
        if (isWatched) {
          totalEpisodes += 1;
          showEpisodes += 1;
          totalMinutes += runtime;
          seasonHasWatched = true;
          hasWatchedEpisodes = true;

          if (ep.watched_at) {
            const date = new Date(ep.watched_at);
            if (!isNaN(date.getTime())) {
              dayOfWeekCounts[date.getDay()] += 1;
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              monthlyActivity[monthKey] =
                (monthlyActivity[monthKey] || 0) + 1;
            }
          }
        }
      });

      if (seasonHasWatched) {
        showSeasons += 1;
      }
    });

    if (hasWatchedEpisodes) {
      totalShows += 1;
      totalSeasons += showSeasons;

      if (showEpisodes >= showTotalEpisodes && showTotalEpisodes > 0) {
        completedShows += 1;
      }

      if (show.rating && show.rating > 0) {
        ratingSum += show.rating;
        ratingCount += 1;
      }

      if (show.network) {
        networkCounts[show.network] =
          (networkCounts[show.network] || 0) + showEpisodes;
      }

      showWatchTime.push({
        title: show.title,
        minutes: showEpisodes * runtime,
        seasons: showSeasons,
        episodes: showEpisodes,
      });

      (show.genres ?? "")
        .split(",")
        .filter(Boolean)
        .forEach((genre) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + showEpisodes;
        });
    }
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, episodes: count }));

  const topShows = showWatchTime
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
    .map((show) => ({
      title: show.title,
      hours: Math.floor(show.minutes / 60),
      seasons: show.seasons,
      episodes: show.episodes,
    }));

  const topNetworks = Object.entries(networkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([network, episodes]) => ({ network, episodes }));

  const completionRate =
    totalShows > 0 ? Math.round((completedShows / totalShows) * 100) : 0;

  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : 0;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const watchByDay = dayNames.map((name, i) => ({
    day: name,
    episodes: dayOfWeekCounts[i],
  }));

  const recentMonths = Object.entries(monthlyActivity)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .reverse()
    .map(([month, count]) => ({ month, episodes: count }));

  return {
    totalMinutes,
    totalEpisodes,
    totalShows,
    totalSeasons,
    completedShows,
    completionRate,
    avgRating,
    topGenres,
    topShows,
    topNetworks,
    watchByDay,
    recentMonths,
  };
}
