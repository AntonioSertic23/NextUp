import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthGrid,
  dayKey,
  groupEpisodesByDay,
  monthGridRange,
  shiftMonth,
} from "../src/utils/calendar.js";

describe("buildMonthGrid", () => {
  it("starts on Monday and covers whole weeks", () => {
    // November 2026 starts on a Sunday.
    const weeks = buildMonthGrid(2026, 10);
    assert.equal(weeks[0][0].key, "2026-10-26");
    assert.equal(weeks[0][6].key, "2026-11-01");
    assert.equal(weeks.at(-1)[6].key, "2026-12-06");
    assert.equal(weeks.length, 6);
    for (const week of weeks) assert.equal(week.length, 7);
  });

  it("flags days outside the month", () => {
    const weeks = buildMonthGrid(2026, 10);
    assert.equal(weeks[0][0].inMonth, false);
    assert.equal(weeks[0][6].inMonth, true);
    const inMonth = weeks.flat().filter((d) => d.inMonth).length;
    assert.equal(inMonth, 30);
  });

  it("uses four rows when a month fits exactly", () => {
    // February 2027 starts on a Monday and has 28 days.
    const weeks = buildMonthGrid(2027, 1);
    assert.equal(weeks.length, 4);
    assert.equal(weeks[0][0].key, "2027-02-01");
  });
});

describe("monthGridRange", () => {
  it("spans from the first grid cell to the day after the last", () => {
    const { from, to } = monthGridRange(2026, 10);
    assert.equal(dayKey(new Date(from)), "2026-10-26");
    assert.equal(dayKey(new Date(to)), "2026-12-07");
  });
});

describe("groupEpisodesByDay", () => {
  it("groups by local day and sorts by air time", () => {
    const late = new Date(2026, 10, 15, 21, 0).toISOString();
    const early = new Date(2026, 10, 15, 9, 30).toISOString();
    const next = new Date(2026, 10, 16, 1, 0).toISOString();
    const map = groupEpisodesByDay([
      { id: "a", first_aired: late },
      { id: "b", first_aired: early },
      { id: "c", first_aired: next },
      { id: "d", first_aired: null },
      { id: "e", first_aired: "not a date" },
    ]);
    assert.deepEqual(
      map.get("2026-11-15").map((e) => e.id),
      ["b", "a"],
    );
    assert.deepEqual(
      map.get("2026-11-16").map((e) => e.id),
      ["c"],
    );
    assert.equal(map.size, 2);
  });
});

describe("shiftMonth", () => {
  it("wraps across years", () => {
    assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
    assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  });
});
