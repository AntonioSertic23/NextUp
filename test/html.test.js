import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, imageUrl, posterImg } from "../src/utils/html.js";

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="a('b')">&`),
      "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;",
    );
  });

  it("turns null and undefined into an empty string", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(2024), "2024");
  });
});

describe("imageUrl", () => {
  it("adds https to stored host paths", () => {
    assert.equal(
      imageUrl("media.trakt.tv/shows/1/medium/poster.webp"),
      "https://media.trakt.tv/shows/1/medium/poster.webp",
    );
  });

  it("keeps absolute and root-relative URLs", () => {
    assert.equal(imageUrl("https://a.b/c.png"), "https://a.b/c.png");
    assert.equal(imageUrl("/img/logo.webp"), "/img/logo.webp");
  });

  it("returns empty for missing values", () => {
    for (const v of [null, undefined, "", "  ", "null", "undefined", 5]) {
      assert.equal(imageUrl(v), "");
    }
  });
});

describe("posterImg", () => {
  it("renders a lazy image with escaped alt", () => {
    const html = posterImg({ path: "media.trakt.tv/x.webp", alt: `"Q" & A`, className: "poster" });
    assert.match(html, /^<img class="poster" src="https:\/\/media\.trakt\.tv\/x\.webp"/);
    assert.match(html, /alt="&quot;Q&quot; &amp; A"/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /decoding="async"/);
  });

  it("can load eagerly", () => {
    assert.match(posterImg({ path: "a/b.webp", eager: true }), /loading="eager"/);
  });

  it("renders a placeholder when there is no image", () => {
    const html = posterImg({ path: null, alt: "Show", className: "poster" });
    assert.equal(
      html,
      '<div class="poster img-placeholder" role="img" aria-label="Show"></div>',
    );
  });
});
