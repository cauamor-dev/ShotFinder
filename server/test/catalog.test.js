import test from "node:test";
import assert from "node:assert/strict";
import { Cache } from "../cache.js";
import { createCatalog, safeLink } from "../catalog.js";
import { createApp } from "../index.js";
const config = { tmdbKey: "private-tmdb", watchmodeKey: "private-watchmode" };
const title = {
  id: 42,
  title: "Movie",
  media_type: "movie",
  release_date: "2024-01-01",
  genres: [],
  credits: { cast: [{ name: "Person", character: "Character" }] },
};

test("cache shares concurrent requests, expires and bounds memory", async () => {
  let now = 0,
    calls = 0;
  const cache = new Cache({ ttl: 10, max: 2, now: () => now });
  const load = async () => ++calls;
  assert.deepEqual(
    await Promise.all([cache.get("a", load), cache.get("a", load)]),
    [1, 1],
  );
  now = 11;
  assert.equal(await cache.get("a", load), 2);
  await cache.get("b", load);
  await cache.get("c", load);
  assert.equal(cache.values.size, 2);
  assert.equal(await cache.get("a", load), 5);
});
test("cache retries failures instead of caching outages", async () => {
  const cache = new Cache();
  await assert.rejects(
    cache.get("a", async () => {
      throw Error("outage");
    }),
  );
  assert.equal(await cache.get("a", async () => "recovered"), "recovered");
});
test("unsafe provider links are excluded", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:password@example.com",
    "bad",
  ])
    assert.equal(safeLink(url), null);
  assert.equal(
    safeLink("https://example.com/title"),
    "https://example.com/title",
  );
});
test("streaming uses exact TMDb identity, Brazil and header authentication", async () => {
  const calls = [];
  const catalog = createCatalog(
    {
      async get(url, options) {
        calls.push({ url, options });
        if (url.includes("themoviedb")) return { data: title };
        return {
          data: [
            {
              name: "Netflix",
              region: "BR",
              type: "sub",
              web_url: "https://netflix.com/title/42",
            },
            {
              name: "Netflix",
              region: "BR",
              type: "sub",
              web_url: "https://netflix.com/title/42",
            },
            {
              name: "Store",
              region: "BR",
              type: "rent",
              web_url: "https://example.com/42",
            },
            {
              name: "Other",
              region: "US",
              type: "sub",
              web_url: "https://example.com/42",
            },
            {
              name: "Unsafe",
              region: "BR",
              type: "sub",
              web_url: "javascript:alert(1)",
            },
          ],
        };
      },
    },
    config,
  );
  const data = await catalog.details("movie", 42, "pt");
  assert.equal(data.streaming.length, 2);
  assert.equal(data.cast[0].name, "Person");
  assert.ok(calls[1].url.includes("/title/movie-42/sources/?regions=BR"));
  assert.equal(calls[1].options.headers["X-API-Key"], config.watchmodeKey);
  assert.ok(!calls[1].url.includes(config.watchmodeKey));
  assert.equal(calls[0].options.timeout, 8000);
  await catalog.details("movie", 42, "pt");
  assert.equal(calls.length, 2);
});
for (const [status, expected] of [
  [429, "quota"],
  [401, "unauthorized"],
  [403, "unauthorized"],
  [500, "unavailable"],
]) {
  test(`provider ${status} is distinct from empty availability`, async () => {
    const catalog = createCatalog(
      {
        async get(url) {
          if (url.includes("themoviedb")) return { data: title };
          throw Object.assign(Error("private error"), { response: { status } });
        },
      },
      config,
    );
    const data = await catalog.details("movie", 42, "pt");
    assert.equal(data.title, "Movie");
    assert.equal(data.streaming_status, expected);
  });
}
test("scene search has a fixed request budget and searches movie and TV keywords", async () => {
  const calls = [];
  const catalog = createCatalog(
    {
      async get(url) {
        const path = new URL(url).pathname;
        calls.push(path);
        if (path.includes("/search/keyword"))
          return { data: { results: [{ id: 12 }] } };
        if (path.includes("/discover/movie"))
          return { data: { results: [{ id: 42, title: "Movie" }] } };
        if (path.includes("/discover/tv"))
          return { data: { results: [{ id: 42, name: "TV" }] } };
        return { data: { results: [] } };
      },
    },
    config,
  );
  const result = await catalog.search(
    "space dragon future extra words ignored",
    "en",
    "scene",
  );
  assert.equal(calls.length, 10);
  assert.deepEqual(
    result.map((x) => x.media_type),
    ["movie", "tv"],
  );
});
async function server(
  t,
  http = {
    get() {
      throw Error("must not be called");
    },
  },
) {
  const app = createApp({ http, config });
  const instance = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => instance.once("listening", resolve));
  t.after(() => new Promise((resolve) => instance.close(resolve)));
  return `http://127.0.0.1:${instance.address().port}`;
}
test("rejects malformed body, invalid IDs and foreign origins", async (t) => {
  const base = await server(t);
  for (const value of ["movie/0", "person/42", "tv/nope"])
    assert.equal((await fetch(`${base}/api/titles/${value}`)).status, 400);
  const malformed = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  const foreign = await fetch(`${base}/api/health`, {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(foreign.status, 403);
  const good = await fetch(`${base}/api/health`, {
    headers: { Origin: "http://localhost:3000" },
  });
  assert.equal(good.status, 200);
  assert.equal(
    good.headers.get("access-control-allow-origin"),
    "http://localhost:3000",
  );
  assert.equal(good.headers.get("x-powered-by"), null);
});
test("oversized body is rejected before catalog access", async (t) => {
  const base = await server(t);
  const response = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "a".repeat(9000) }),
  });
  assert.equal(response.status, 413);
});
test("rate limit stops excess requests", async (t) => {
  const base = await server(t);
  for (let i = 0; i < 60; i++)
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/health`)).status, 429);
});
