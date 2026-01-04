// ========================================================
// pages/stats.js - Render Statistics Page
// ========================================================

import { getToken } from "../services/authService.js";

/**
 * Converts minutes to years, months, days, and hours.
 * @param {number} totalMinutes - Total minutes to convert
 * @returns {Object} Object with years, months, days, hours
 */
function convertMinutesToTime(totalMinutes) {
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
function formatTimeBreakdown(time) {
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
function calculateStatistics(shows) {
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
      if (s.number === 0) return false;
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
      const genres = Array.isArray(show.genres) ? show.genres : [];
      genres.forEach((genre) => {
        if (!genreCounts[genre]) {
          genreCounts[genre] = 0;
        }
        genreCounts[genre] += showEpisodes;
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

/**
 * Renders statistics on the user's watched shows.
 * @param {HTMLElement} main - The main container element to render stats into
 * @returns {Promise<void>}
 */
export async function renderStats(main) {
  const token = await getToken();

  // Show loading state
  main.innerHTML = "<p class='loading-text'>Loading statistics...</p>";

  // TODO: Commented out until the retrieval and storage of series is moved to Supabase instead of localStorage.
  /* try {
    // Fetch collection
    // const shows = await getStatisticsData(token, null);

    // Calculate statistics
    const stats = calculateStatistics(shows);

    // Convert minutes to time breakdown
    const timeBreakdown = convertMinutesToTime(stats.totalMinutes);
    const timeFormatted = formatTimeBreakdown(timeBreakdown);

    // Create stats container
    const statsDiv = document.createElement("div");
    statsDiv.classList.add("stats-container");

    statsDiv.innerHTML = `
      <div class="stats-section">
        <h2>Statistics</h2>
        
        <div class="stat-card">
          <h3>Total Time Spent Watching TV Shows</h3>
          <p class="stat-value">${stats.totalMinutes.toLocaleString()} minutes</p>
          <p class="stat-description">... which is exactly ${timeFormatted} but who's counting</p>
        </div>

        <div class="stat-card">
          <h3>Episodes Watched</h3>
          <p class="stat-value">You've seen a total of ${stats.totalEpisodes.toLocaleString()} episodes</p>
          <p class="stat-description">... in exactly ${
            stats.totalShows
          } TV shows, ${stats.totalSeasons} seasons</p>
        </div>

        <div class="stat-card">
          <h3>Top 3 Most Watched Genres</h3>
          <div class="top-list">
            ${stats.topGenres
              .map(
                (item, index) => `
              <div class="top-item">
                <span class="rank">${index + 1}.</span>
                <span class="name">${item.genre}</span>
                <span class="count">${item.episodes} episodes</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="stat-card">
          <h3>Top 3 Most Watched Shows</h3>
          <p class="stat-description">You've spent the most time watching:</p>
          <div class="top-list">
            ${stats.topShows
              .map(
                (item, index) => `
              <div class="top-item">
                <span class="rank">${index + 1}.</span>
                <span class="name">${item.title}</span>
                <span class="details">${item.hours} hours ${
                  item.seasons
                } seasons ${item.episodes} episodes</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    main.innerHTML = "";
    main.appendChild(statsDiv);
  } catch (error) {
    console.error("Error loading statistics:", error);
    main.innerHTML = `<p class='error-text'>Error loading statistics: ${error.message}</p>`;
  } */
}
