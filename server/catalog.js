import { Cache } from "./cache.js";
import { selectTitles } from "./search-results.js";
const tmdbBase = "https://api.themoviedb.org/3";
const watchmodeBase = "https://api.watchmode.com/v1";
const ignoredWords = new Set(
  "um uma uns umas com em de o a e do da na no para por os as dos das que ao se sobre sem como sua seu filme série cena homem mulher the and with from that this movie scene".split(
    " ",
  ),
);

export function safeLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function titleCard(item) {
  return {
    id: item.id,
    media_type: item.media_type,
    title: item.title || item.name || "",
    original_title: item.original_title || item.original_name || "",
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    overview: item.overview || "",
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : "",
    rating: Number(item.vote_average) || 0,
    votes: Number(item.vote_count) || 0,
  };
}
export function createCatalog(http, config) {
  const cache = new Cache();
  const streamingCache = new Cache({ ttl: 3_600_000, max: 150 });
  const language = (lang) => (lang === "en" ? "en-US" : "pt-BR");
  const tmdb = async (path, params = {}) => {
    const url = new URL(tmdbBase + path);
    for (const [key, value] of Object.entries({
      api_key: config.tmdbKey,
      ...params,
    }))
      url.searchParams.set(key, value);
    const response = await http.get(url.href, { timeout: 8000 });
    return response.data;
  };
  async function search(text, lang, mode = "title") {
    return cache.get(
      `search:${lang}:${mode}:${text.toLowerCase()}`,
      async () => {
        const data = await tmdb("/search/multi", {
          query: text,
          language: language(lang),
          include_adult: false,
        });
        let items = data.results || [];
        if (
          mode === "scene" &&
          items.filter((x) => ["movie", "tv"].includes(x.media_type)).length < 4
        ) {
          const words = [
            ...new Set(
              text
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, "")
                .split(/\s+/)
                .filter((w) => w.length > 2 && !ignoredWords.has(w)),
            ),
          ].slice(0, 3);
          const discoveries = await Promise.allSettled(
            words.map(async (word) => {
              const keywords = await tmdb("/search/keyword", { query: word });
              const id = keywords.results?.[0]?.id;
              if (!id) return [];
              const [movies, shows] = await Promise.all([
                tmdb("/discover/movie", {
                  with_keywords: id,
                  language: language(lang),
                  include_adult: false,
                }),
                tmdb("/discover/tv", {
                  with_keywords: id,
                  language: language(lang),
                  include_adult: false,
                }),
              ]);
              return [
                ...(movies.results || []).map((x) => ({
                  ...x,
                  media_type: "movie",
                })),
                ...(shows.results || []).map((x) => ({
                  ...x,
                  media_type: "tv",
                })),
              ];
            }),
          );
          items = [
            ...items,
            ...discoveries
              .filter((x) => x.status === "fulfilled")
              .flatMap((x) => x.value),
          ];
        }
        return selectTitles(items, 16).map(titleCard);
      },
    );
  }
  async function suggestions(text, lang) {
    return cache.get(`suggest:${lang}:${text.toLowerCase()}`, async () => {
      const data = await tmdb("/search/multi", {
        query: text,
        language: language(lang),
        include_adult: false,
      });
      return selectTitles(data.results || [], 6).map(titleCard);
    });
  }
  async function streaming(type, id) {
    return streamingCache.get(`${type}:${id}`, async () => {
      const response = await http.get(
        `${watchmodeBase}/title/${type}-${id}/sources/?regions=BR`,
        { timeout: 8000, headers: { "X-API-Key": config.watchmodeKey } },
      );
      const seen = new Set();
      const sources = Array.isArray(response.data) ? response.data : [];
      return sources
        .filter(
          (source) =>
            source.region === "BR" &&
            ["sub", "free", "rent", "buy"].includes(source.type),
        )
        .flatMap((source) => {
          const link = safeLink(source.web_url),
            key = `${source.name}:${source.type}`;
          if (!link || seen.has(key)) return [];
          seen.add(key);
          return [{ name: source.name, type: source.type, url: link }];
        });
    });
  }
  async function details(type, id, lang) {
    const data = await cache.get(`detail:${lang}:${type}:${id}`, () =>
      tmdb(`/${type}/${id}`, {
        language: language(lang),
        append_to_response: "credits",
      }),
    );
    let sources = [],
      streaming_status = "ok";
    try {
      sources = await streaming(type, id);
    } catch (error) {
      const status = error.response?.status;
      streaming_status =
        status === 429
          ? "quota"
          : [401, 403].includes(status)
            ? "unauthorized"
            : "unavailable";
    }
    return {
      ...titleCard({ ...data, media_type: type }),
      runtime: data.runtime || data.episode_run_time?.[0] || null,
      genres: (data.genres || []).map((x) => x.name),
      cast: (data.credits?.cast || [])
        .slice(0, 6)
        .map((x) => ({ name: x.name, character: x.character })),
      streaming: sources,
      streaming_status,
      tmdb_url: `https://www.themoviedb.org/${type}/${id}`,
    };
  }
  return { search, suggestions, details };
}
