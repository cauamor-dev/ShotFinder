export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* O app continua funcionando sem armazenamento local. */
  }
}
export function validTitles(value) {
  return Array.isArray(value)
    ? value
        .filter(
          (x) =>
            x &&
            Number.isInteger(x.id) &&
            ["movie", "tv"].includes(x.media_type) &&
            typeof x.title === "string",
        )
        .slice(0, 100)
    : [];
}
