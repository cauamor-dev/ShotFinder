export function loadConfig(env = process.env) {
  const missing = ["TMDB_API_KEY", "WATCHMODE_API_KEY"].filter(
    (key) => !env[key]?.trim(),
  );
  if (missing.length)
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535");
  const origins = (
    env.CLIENT_ORIGIN ||
    "http://localhost:3000,http://localhost:5173,http://localhost:5000"
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    origins.some((x) => {
      try {
        return new URL(x).origin !== x;
      } catch {
        return true;
      }
    })
  )
    throw new Error("CLIENT_ORIGIN must contain valid origins");
  return {
    tmdbKey: env.TMDB_API_KEY.trim(),
    watchmodeKey: env.WATCHMODE_API_KEY.trim(),
    port,
    origins,
  };
}
