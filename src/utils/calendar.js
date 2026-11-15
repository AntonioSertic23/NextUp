/**
 * Date helpers for the episode calendar. All keys use the viewer's local
 * time zone, so an episode airing at 02:00 local lands on that local day.
 */

/**
 * Local `YYYY-MM-DD` key for a date.
 *
 * @param {Date} date
 * @returns {string}
 */
export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Weeks covering a month, Monday first. Always whole weeks, so days from
 * the previous/next month fill the first and last rows.
 *
 * @param {number} year
 * @param {number} month - 0-11
 * @returns {Array<Array<{ date: Date, key: string, inMonth: boolean }>>}
 */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);

  const weeks = [];
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + w * 7 + d,
      );
      week.push({ date, key: dayKey(date), inMonth: date.getMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * ISO range covering every cell of the month grid: [from, to).
 *
 * @param {number} year
 * @param {number} month - 0-11
 * @returns {{ from: string, to: string }}
 */
export function monthGridRange(year, month) {
  const weeks = buildMonthGrid(year, month);
  const firstDay = weeks[0][0].date;
  const lastDay = weeks[weeks.length - 1][6].date;
  const end = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate() + 1,
  );
  return { from: firstDay.toISOString(), to: end.toISOString() };
}

/**
 * Groups episodes by local air day, each day sorted by air time.
 *
 * @param {Array<{ first_aired?: string|null }>} episodes
 * @returns {Map<string, Array<Object>>}
 */
export function groupEpisodesByDay(episodes) {
  const byDay = new Map();
  for (const ep of episodes || []) {
    if (!ep?.first_aired) continue;
    const aired = new Date(ep.first_aired);
    if (Number.isNaN(aired.getTime())) continue;
    const key = dayKey(aired);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(ep);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => new Date(a.first_aired) - new Date(b.first_aired));
  }
  return byDay;
}

/**
 * Moves a { year, month } pair by `delta` months.
 *
 * @param {{ year: number, month: number }} ym
 * @param {number} delta
 * @returns {{ year: number, month: number }}
 */
export function shiftMonth({ year, month }, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
