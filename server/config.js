export function loadConfig(env = process.env) {
  const missing = ['TMDB_API_KEY', 'WATCHMODE_API_KEY'].filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  return { tmdbKey: env.TMDB_API_KEY.trim(), watchmodeKey: env.WATCHMODE_API_KEY.trim(), port };
}
