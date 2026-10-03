import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasEpisodeAired, pickLatestAiredByShow } from "../src/utils/aired.js";
import { parseAuthCallback } from "../src/utils/authCallback.js";
import { computeListShowProgress } from "../src/utils/progress.js";
import { compareShows, sortShowsCopy } from "../src/utils/sortShows.js";
import { formatDate, formatEpisodeInfo, getTimeUntil } from "../src/utils/format.js";
import { isCountableEpisode, filterCountableEpisodes } from "../netlify/lib/episodeProgress.js";
import {
  pickTonightShows,
  resolveBingeEpisodeIds,
} from "../src/utils/tonightAndBinge.js";

describe("hasEpisodeAired", () => {
  const now = Date.parse("2026-06-01T12:00:00Z");

  it("returns false when first_aired is missing", () => {
    assert.equal(hasEpisodeAired({}, now), false);
    assert.equal(hasEpisodeAired({ first_aired: null }, now), false);
  });

  it("returns false for future air dates", () => {
    assert.equal(
      hasEpisodeAired({ first_aired: "2026-06-02T00:00:00Z" }, now),
      false,
    );
  });

  it("returns true for past air dates", () => {
    assert.equal(
      hasEpisodeAired({ first_aired: "2026-05-01T00:00:00Z" }, now),
      true,
    );
  });

  it("returns false for invalid dates", () => {
    assert.equal(hasEpisodeAired({ first_aired: "not-a-date" }, now), false);
  });
});

describe("pickLatestAiredByShow", () => {
  const now = Date.parse("2026-06-01T12:00:00Z");

  it("keeps the newest aired episode per show and skips future dates", () => {
    const latest = pickLatestAiredByShow(
      [
        { show_id: "a", first_aired: "2026-01-01T00:00:00Z" },
        { show_id: "a", first_aired: "2026-05-20T00:00:00Z" },
        { show_id: "a", first_aired: "2026-07-01T00:00:00Z" },
        { show_id: "b", first_aired: "2026-04-01T00:00:00Z" },
        { show_id: "c", first_aired: null },
      ],
      now,
    );

    assert.equal(latest.get("a"), "2026-05-20T00:00:00Z");
    assert.equal(latest.get("b"), "2026-04-01T00:00:00Z");
    assert.equal(latest.has("c"), false);
  });
});

describe("parseAuthCallback", () => {
  it("reads an implicit recovery hash", () => {
    const parsed = parseAuthCallback(
      "https://nextup.app/login.html#access_token=abc&refresh_token=def&type=recovery",
    );
    assert.equal(parsed.kind, "recovery");
    assert.equal(parsed.accessToken, "abc");
    assert.equal(parsed.refreshToken, "def");
  });

  it("reads a recovery code only on the login page", () => {
    assert.equal(
      parseAuthCallback("https://nextup.app/login.html?code=xyz").kind,
      "code",
    );
    assert.equal(
      parseAuthCallback("https://nextup.app/?code=trakt").kind,
      "none",
    );
  });
});

describe("computeListShowProgress", () => {
  it("marks completed shows", () => {
    const result = computeListShowProgress({
      is_completed: true,
      watched_episodes: 10,
      total_episodes: 10,
      next_episode: null,
    });
    assert.equal(result.isCompleted, true);
    assert.equal(result.nextEpisodeInfo, "Completed");
    assert.equal(result.episodesLeft, 0);
    assert.equal(result.progressBarPercent, 100);
  });

  it("formats next episode and leftover count", () => {
    const result = computeListShowProgress({
      watched_episodes: 3,
      total_episodes: 10,
      next_episode: {
        season_number: 1,
        episode_number: 4,
        title: "Pilot continued",
        overview: "  hello  ",
      },
    });
    assert.equal(result.isCompleted, false);
    assert.equal(result.nextEpisodeInfo, "S01E04 - Pilot continued");
    assert.equal(result.episodesLeft, 7);
    assert.equal(result.progressBarPercent, 30);
    assert.equal(result.overview, "hello");
  });
});

describe("compareShows / sortShowsCopy", () => {
  const items = [
    {
      added_at: "2026-01-01T00:00:00Z",
      last_watched_at: "2026-03-01T00:00:00Z",
      watched_episodes: 1,
      total_episodes: 10,
      shows: { title: "Beta", year: 2020, rating: 7 },
    },
    {
      added_at: "2026-02-01T00:00:00Z",
      last_watched_at: "2026-05-01T00:00:00Z",
      watched_episodes: 8,
      total_episodes: 10,
      shows: { title: "Alpha", year: 2018, rating: 9 },
    },
  ];

  it("sorts by last_watched_at desc (newest first)", () => {
    const sorted = sortShowsCopy(items, "last_watched_at", "desc");
    assert.equal(sorted[0].shows.title, "Alpha");
    assert.equal(sorted[1].shows.title, "Beta");
  });

  it("sorts by title asc", () => {
    const sorted = sortShowsCopy(items, "title", "asc");
    assert.equal(sorted[0].shows.title, "Alpha");
  });

  it("sorts by episodes_left asc", () => {
    const sorted = sortShowsCopy(items, "episodes_left", "asc");
    assert.equal(sorted[0].shows.title, "Alpha"); // 2 left
  });

  it("sorts by last_aired_at desc and sinks shows with no air date", () => {
    const aired = [
      { ...items[0], last_aired_at: "2026-06-01T00:00:00Z" },
      { ...items[1], last_aired_at: null },
    ];
    const sorted = sortShowsCopy(aired, "last_aired_at", "desc");
    assert.equal(sorted[0].shows.title, "Beta");
    assert.equal(sorted[1].shows.title, "Alpha");
  });

  it("does not mutate the input array", () => {
    const copy = [...items];
    sortShowsCopy(items, "title", "asc");
    assert.deepEqual(items, copy);
  });

  it("compareShows returns 0 for equal titles", () => {
    const a = { shows: { title: "Same" } };
    const b = { shows: { title: "Same" } };
    assert.equal(compareShows(a, b, "title", "asc"), 0);
  });
});

describe("format helpers", () => {
  it("formatDate", () => {
    assert.equal(formatDate(""), "");
    const formatted = formatDate(new Date(2026, 7, 5)); // local Aug 5
    assert.equal(formatted, "05/08/2026");
  });

  it("formatEpisodeInfo", () => {
    assert.equal(formatEpisodeInfo(2, 3, "Go"), "S02E03 - Go");
    assert.equal(formatEpisodeInfo(null, 1), "");
  });

  it("getTimeUntil past", () => {
    assert.equal(getTimeUntil("2000-01-01T00:00:00Z"), "Aired");
  });
});

describe("episodeProgress countable", () => {
  it("excludes season 0 and specials", () => {
    assert.equal(isCountableEpisode({ season_number: 0, title: "X" }), false);
    assert.equal(
      isCountableEpisode({ season_number: 1, episode_type: "special" }),
      false,
    );
    assert.equal(
      isCountableEpisode({ season_number: 1, title: "Special Feature" }),
      false,
    );
    assert.equal(
      isCountableEpisode({ season_number: 1, episode_number: 1, title: "Pilot" }),
      true,
    );
  });

  it("filterCountableEpisodes", () => {
    const eps = [
      { id: "a", season_number: 0, title: "S" },
      { id: "b", season_number: 1, title: "E1" },
    ];
    assert.deepEqual(
      filterCountableEpisodes(eps).map((e) => e.id),
      ["b"],
    );
  });
});

describe("pickTonightShows", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");
  const shows = [
    {
      is_completed: false,
      user_rating: 5,
      last_watched_at: "2026-01-01T00:00:00Z",
      watched_episodes: 9,
      total_episodes: 10,
      shows: { id: "s1", title: "Hot" },
      next_episode: { first_aired: "2026-05-01T00:00:00Z" },
    },
    {
      is_completed: false,
      user_rating: 1,
      last_watched_at: "2026-05-28T00:00:00Z",
      watched_episodes: 1,
      total_episodes: 20,
      shows: { id: "s2", title: "Cold" },
      next_episode: { first_aired: "2026-05-01T00:00:00Z" },
    },
    {
      is_completed: true,
      shows: { id: "s3", title: "Done" },
      next_episode: null,
    },
    {
      is_completed: false,
      user_rating: 4,
      last_watched_at: null,
      watched_episodes: 0,
      total_episodes: 8,
      shows: { id: "s4", title: "Fresh" },
      next_episode: { first_aired: "2026-04-01T00:00:00Z" },
    },
  ];

  it("picks up to count active shows and skips completed", () => {
    const picked = pickTonightShows(shows, {
      count: 3,
      nowMs: now,
      random: () => 0,
    });
    assert.equal(picked.length, 3);
    assert.ok(picked.every((p) => !p.is_completed));
  });

  it("respects excludeShowIds", () => {
    const picked = pickTonightShows(shows, {
      count: 3,
      nowMs: now,
      random: () => 0,
      excludeShowIds: ["s1"],
    });
    assert.ok(!picked.some((p) => p.shows.id === "s1"));
  });
});

describe("resolveBingeEpisodeIds", () => {
  const aired = "2020-01-01T00:00:00Z";
  const episodes = [
    { id: "1", season_number: 1, episode_number: 1, watched_at: "x", first_aired: aired },
    { id: "2", season_number: 1, episode_number: 2, watched_at: null, first_aired: aired },
    { id: "3", season_number: 1, episode_number: 3, watched_at: null, first_aired: aired },
    { id: "4", season_number: 2, episode_number: 1, watched_at: null, first_aired: aired },
    { id: "5", season_number: 2, episode_number: 2, watched_at: null, first_aired: "2099-01-01T00:00:00Z" },
  ];

  it("mode next marks one", () => {
    assert.deepEqual(resolveBingeEpisodeIds(episodes, { mode: "next" }), ["2"]);
  });

  it("mode count marks N", () => {
    assert.deepEqual(
      resolveBingeEpisodeIds(episodes, { mode: "count", count: 2 }),
      ["2", "3"],
    );
  });

  it("mode season marks rest of season", () => {
    assert.deepEqual(
      resolveBingeEpisodeIds(episodes, { mode: "season", seasonNumber: 1 }),
      ["2", "3"],
    );
  });

  it("skips unaired", () => {
    assert.deepEqual(
      resolveBingeEpisodeIds(episodes, { mode: "season", seasonNumber: 2 }),
      ["4"],
    );
  });
});
