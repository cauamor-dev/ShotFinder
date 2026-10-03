import test from "node:test";
import assert from "node:assert/strict";
import { selectTitles } from "../search-results.js";
import { loadConfig } from "../config.js";
import { createApp } from "../index.js";

test("a movie and TV show with the same ID remain distinct", () => {
  const movie = { id: 42, media_type: "movie", title: "Movie" };
  const tv = { id: 42, media_type: "tv", name: "TV" };
  assert.deepEqual(selectTitles([movie, tv, movie]), [movie, tv]);
});

test("discovery results infer movies; people never become TV shows", () => {
  const results = selectTitles([
    { id: 1, title: "Movie" },
    { id: 2, name: "Show" },
    { id: 3, media_type: "person", name: "Actor" },
    null,
    { id: "4", title: "Bad ID" },
  ]);
  assert.deepEqual(
    results.map((x) => x.media_type),
    ["movie", "tv"],
  );
});

test("limit counts unique valid titles and preserves provider ranking", () => {
  const entries = Array.from({ length: 8 }, (_, id) => ({
    id: id + 1,
    title: `Movie ${id}`,
  }));
  assert.deepEqual(
    selectTitles([entries[0], entries[0], ...entries], 5).map((x) => x.id),
    [1, 2, 3, 4, 5],
  );
});

test("configuration fails clearly without printing supplied secrets", () => {
  assert.throws(() => loadConfig({ TMDB_API_KEY: "test-private-value" }), {
    message: "Missing environment variables: WATCHMODE_API_KEY",
  });
  assert.throws(
    () =>
      loadConfig({ TMDB_API_KEY: "x", WATCHMODE_API_KEY: "y", PORT: "bad" }),
    /PORT/,
  );
  assert.equal(
    loadConfig({ TMDB_API_KEY: "x", WATCHMODE_API_KEY: "y" }).port,
    5000,
  );
});

async function withServer(t, http) {
  const app = createApp({
    http,
    config: { tmdbKey: "fake", watchmodeKey: "fake" },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

test("autocomplete uses the server and excludes people", async (t) => {
  const requests = [];
  const base = await withServer(t, {
    async get(url) {
      requests.push(new URL(url));
      return {
        data: {
          results: [
            { id: 7, media_type: "movie", title: "Movie" },
            { id: 7, media_type: "tv", name: "Show" },
            { id: 8, media_type: "person", name: "Actor" },
          ],
        },
      };
    },
  });
  const response = await fetch(`${base}/suggestions?text=space&lang=en`);
  assert.equal(response.status, 200);
  assert.deepEqual(
    (await response.json()).map((x) => x.media_type),
    ["movie", "tv"],
  );
  assert.equal(requests[0].searchParams.get("language"), "en-US");
});

test("invalid or blank search avoids provider requests", async (t) => {
  const base = await withServer(t, {
    get() {
      throw new Error("Provider must not be called");
    },
  });
  const post = (text) =>
    fetch(`${base}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  assert.equal((await post(123)).status, 400);
  assert.equal((await post("x".repeat(501))).status, 400);
  assert.deepEqual(await (await post("   ")).json(), []);
  assert.deepEqual(
    await (await fetch(`${base}/suggestions?text=x`)).json(),
    [],
  );
});

test("search preserves movie/TV identity without loading costly details", async (t) => {
  const calls = [];
  const base = await withServer(t, {
    async get(url) {
      const parsed = new URL(url);
      calls.push(parsed.pathname);
      if (parsed.pathname.endsWith("/search/multi"))
        return {
          data: {
            results: [
              { id: 42, media_type: "movie", title: "Movie" },
              { id: 42, media_type: "tv", name: "Show" },
            ],
          },
        };
      if (parsed.pathname.endsWith("/search/keyword"))
        return { data: { results: [] } };
      if (parsed.pathname.endsWith("/credits"))
        return { data: { cast: [{ name: "Actor" }] } };
      return { data: { title_results: [] } };
    },
  });
  const response = await fetch(`${base}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "space", lang: "en" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    (await response.json()).map((x) => x.media_type),
    ["movie", "tv"],
  );
  assert.deepEqual(calls, ["/3/search/multi"]);
});

test("provider failures produce a generic suggestion error", async (t) => {
  const base = await withServer(t, {
    async get() {
      throw new Error("private provider details");
    },
  });
  const response = await fetch(`${base}/suggestions?text=space`);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Não foi possível consultar o catálogo agora.",
    code: "PROVIDER",
  });
});
