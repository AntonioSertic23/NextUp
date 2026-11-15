/**
 * Episode calendar: month grid on wide screens, day-by-day agenda on phones.
 * Both views are rendered; CSS picks one by viewport width.
 */

import { buildMonthGrid, dayKey, groupEpisodesByDay } from "../utils/calendar.js";
import { formatEpisodeInfo } from "../utils/format.js";
import { escapeHtml, posterImg } from "../utils/html.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS_PER_DAY = 3;

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
const agendaDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const showHref = (ep) =>
  `#show?traktIdentifier=${encodeURIComponent(ep.shows?.slug_id ?? "")}`;

const airTime = (ep) => timeFormat.format(new Date(ep.first_aired));

/**
 * @param {{ year: number, month: number }} ym
 * @returns {string}
 */
export function monthLabel({ year, month }) {
  return monthFormat.format(new Date(year, month, 1));
}

/**
 * Page shell: title, month navigation and an empty body.
 *
 * @param {HTMLElement} container
 */
export function renderCalendarShell(container) {
  container.innerHTML = `
    <div class="calendar-header">
      <h2 class="calendar-title">Calendar</h2>
      <div class="calendar-nav">
        <button type="button" class="calendar-nav-btn" data-cal="prev" aria-label="Previous month">&#8249;</button>
        <p class="calendar-month" aria-live="polite"></p>
        <button type="button" class="calendar-nav-btn" data-cal="next" aria-label="Next month">&#8250;</button>
        <button type="button" class="calendar-today-btn" data-cal="today">Today</button>
      </div>
    </div>
    <div class="calendar-body"></div>
  `;
}

function renderChip(ep) {
  const code = formatEpisodeInfo(ep.season_number, ep.episode_number, null);
  const label = `${ep.shows?.title ?? "Show"} — ${formatEpisodeInfo(
    ep.season_number,
    ep.episode_number,
    ep.title,
  )} · ${airTime(ep)}`;
  return `
    <a class="cal-chip" href="${escapeHtml(showHref(ep))}" title="${escapeHtml(label)}">
      <span class="cal-chip-show">${escapeHtml(ep.shows?.title ?? "")}</span>
      <span class="cal-chip-code">${escapeHtml(code)}</span>
    </a>`;
}

function renderGrid(ym, byDay, todayKey) {
  const weeks = buildMonthGrid(ym.year, ym.month);
  const head = WEEKDAYS.map(
    (d) => `<div class="cal-weekday" role="columnheader">${d}</div>`,
  ).join("");

  const cells = weeks
    .flat()
    .map((day) => {
      const eps = byDay.get(day.key) ?? [];
      const shown = eps.slice(0, MAX_CHIPS_PER_DAY);
      const hidden = eps.slice(MAX_CHIPS_PER_DAY);
      const classes = [
        "cal-day",
        day.inMonth ? "" : "is-outside",
        day.key === todayKey ? "is-today" : "",
        eps.length ? "has-episodes" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <div class="${classes}" role="gridcell" aria-label="${escapeHtml(
          agendaDayFormat.format(day.date),
        )}, ${eps.length} episode${eps.length === 1 ? "" : "s"}">
          <span class="cal-day-num">${day.date.getDate()}</span>
          ${shown.map(renderChip).join("")}
          ${
            hidden.length
              ? `<div class="cal-more" hidden>${hidden.map(renderChip).join("")}</div>
                 <button type="button" class="cal-more-btn" data-cal="more">+${hidden.length} more</button>`
              : ""
          }
        </div>`;
    })
    .join("");

  return `
    <div class="cal-grid" role="grid" aria-label="${escapeHtml(monthLabel(ym))}">
      ${head}
      ${cells}
    </div>`;
}

function renderAgenda(ym, byDay, todayKey) {
  const days = [...byDay.keys()]
    .filter((key) => {
      const [y, m] = key.split("-").map(Number);
      return y === ym.year && m - 1 === ym.month;
    })
    .sort();

  if (!days.length) return "";

  return `
    <div class="cal-agenda">
      ${days
        .map((key) => {
          const [y, m, d] = key.split("-").map(Number);
          const date = new Date(y, m - 1, d);
          const isToday = key === todayKey;
          return `
          <section class="cal-agenda-day${isToday ? " is-today" : ""}">
            <h3 class="cal-agenda-date">
              ${escapeHtml(agendaDayFormat.format(date))}
              ${isToday ? `<span class="cal-today-badge">Today</span>` : ""}
            </h3>
            ${byDay
              .get(key)
              .map(
                (ep) => `
              <a class="cal-agenda-row" href="${escapeHtml(showHref(ep))}">
                ${posterImg({ path: ep.shows?.image_poster, className: "cal-agenda-poster" })}
                <span class="cal-agenda-info">
                  <span class="cal-agenda-show">${escapeHtml(ep.shows?.title ?? "")}</span>
                  <span class="cal-agenda-ep">${escapeHtml(
                    formatEpisodeInfo(ep.season_number, ep.episode_number, ep.title),
                  )}</span>
                </span>
                <span class="cal-agenda-time">${escapeHtml(airTime(ep))}</span>
              </a>`,
              )
              .join("")}
          </section>`;
        })
        .join("")}
    </div>`;
}

/**
 * Fills the calendar body for one month.
 *
 * @param {HTMLElement} container - Element from renderCalendarShell
 * @param {{ year: number, month: number }} ym
 * @param {Array<Object>} episodes
 */
export function renderCalendarMonth(container, ym, episodes) {
  container.querySelector(".calendar-month").textContent = monthLabel(ym);

  const byDay = groupEpisodesByDay(episodes);
  const todayKey = dayKey(new Date());
  const body = container.querySelector(".calendar-body");

  const agenda = renderAgenda(ym, byDay, todayKey);
  body.innerHTML = `
    ${renderGrid(ym, byDay, todayKey)}
    ${
      agenda ||
      `<p class="cal-empty">No episodes from your shows air in ${escapeHtml(
        monthLabel(ym),
      )}.</p>`
    }
  `;

  // Desktop grid empty too: say so once, above the grid.
  body.classList.toggle("is-empty", !agenda);
}
