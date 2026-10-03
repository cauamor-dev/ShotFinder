import test from "node:test";
import assert from "node:assert/strict";
import { readStorage, writeStorage, validTitles } from "../src/storage.js";
import { copy } from "../src/i18n.js";
test("corrupted or blocked local storage never prevents rendering", () => {
  globalThis.localStorage = {
    getItem() {
      return "{broken";
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.deepEqual(readStorage("history", []), []);
  assert.doesNotThrow(() => writeStorage("favorites", []));
  delete globalThis.localStorage;
  assert.equal(readStorage("theme", "dark"), "dark");
});
test("favorites discard corrupted entries and keep movie/TV identity", () => {
  const movie = { id: 1, title: "Film", media_type: "movie" },
    tv = { id: 1, title: "Series", media_type: "tv" };
  assert.deepEqual(
    validTitles([
      null,
      movie,
      tv,
      { id: "1", title: "Bad", media_type: "movie" },
    ]),
    [movie, tv],
  );
  assert.deepEqual(validTitles("bad data"), []);
});
test("all interface strings have both Portuguese and English translations", () => {
  assert.deepEqual(Object.keys(copy.pt).sort(), Object.keys(copy.en).sort());
  for (const value of Object.values(copy.en))
    assert.ok(typeof value === "string" && value.length > 0);
});
