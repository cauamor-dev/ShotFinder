import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { pathToFileURL } from 'node:url';
import { selectTitles } from './search-results.js';
import { loadConfig } from './config.js';

export function createApp({ http = axios, config = loadConfig() } = {}) {

const app = express();
app.use(cors());
app.use(express.json());

const TMDB_API_KEY = config.tmdbKey;
const WATCHMODE_API_KEY = config.watchmodeKey;

// Cache simples para resultados da Watchmode
const watchmodeCache = {};

// Função para buscar filmes/séries na TMDb por texto
async function searchTMDb(query, lang = 'pt-BR') {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=${lang}&query=${encodeURIComponent(query)}`;
  const res = await http.get(url);
  return res.data.results || [];
}

// Função para buscar keywords na TMDb
async function searchKeywordsTMDb(query) {
  const url = `https://api.themoviedb.org/3/search/keyword?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const res = await http.get(url);
  return res.data.results || [];
}

// Função para buscar filmes/séries por keyword ID
async function discoverByKeyword(keywordId, lang = 'pt-BR') {
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${lang}&with_keywords=${keywordId}`;
  const res = await http.get(url);
  return res.data.results || [];
}

// Função simples de NLP para extrair palavras-chave
function extractKeywords(text) {
  const stopwords = ['um','uma','com','em','de','o','a','e','do','da','na','no','para','por','contra','os','as','dos','das','nas','nos','que','ao','à','às','se','sobre','sob','pelo','pela','pelos','pelas','entre','ou','sem','mas','porém','também','como','sua','seu','suas','seus','daquele','daquela','daqueles','daquelas','este','esta','esses','essas','aquele','aquela','aqueles','aquelas','isso','isto','aquele','aquela','aquele','aquelas','um','uma','uns','umas'];
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.includes(word));
}

// Função para buscar onde assistir na Watchmode (real, com links e cache)
async function getStreamingInfo(title, year = '') {
  const cacheKey = `${title.toLowerCase()}_${year}`;
  if (watchmodeCache[cacheKey]) {
    return watchmodeCache[cacheKey];
  }
  try {
    // 1. Buscar o ID do título na Watchmode
    const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(title)}`;
    const searchRes = await http.get(searchUrl);
    const results = searchRes.data.title_results;
    if (!results || results.length === 0) return [];
    // Tenta filtrar pelo ano se disponível
    let bestMatch = results[0];
    if (year) {
      const match = results.find(r => r.year && r.year.toString() === year.toString());
      if (match) bestMatch = match;
    }
    const watchmodeId = bestMatch.id;
    // 2. Buscar as plataformas de streaming
    const sourcesUrl = `https://api.watchmode.com/v1/title/${watchmodeId}/sources/?apiKey=${WATCHMODE_API_KEY}`;
    const sourcesRes = await http.get(sourcesUrl);
    const sources = sourcesRes.data;
    // Filtra apenas por streaming (não aluguel/compra)
    const streaming = sources.filter(s => s.type === 'sub' && s.region === 'BR');
    // Retorna array de objetos { name, url }
    const platforms = [];
    const seen = new Set();
    for (const s of streaming) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        platforms.push({ name: s.name, url: s.web_url });
      }
    }
    watchmodeCache[cacheKey] = platforms;
    return platforms;
  } catch (e) {
    return [];
  }
}

// Função para buscar elenco principal na TMDb
async function getCast(mediaType, id, lang = 'pt-BR') {
  try {
    let url = '';
    if (mediaType === 'movie') {
      url = `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}&language=${lang}`;
    } else {
      url = `https://api.themoviedb.org/3/tv/${id}/credits?api_key=${TMDB_API_KEY}&language=${lang}`;
    }
    const res = await http.get(url);
    const castArr = res.data.cast || [];
    // Pega os 5 principais atores
    return castArr.slice(0, 5).map(a => a.name).join(', ');
  } catch (e) {
    return '';
  }
}

app.get('/suggestions', async (req, res) => {
  const { text, lang } = req.query;
  if (typeof text !== 'string' || text.trim().length < 2) return res.json([]);
  if (text.length > 500) return res.status(400).json({ error: 'Search text is too long.' });
  try {
    const results = await searchTMDb(text.trim(), lang === 'en' ? 'en-US' : 'pt-BR');
    res.json(selectTitles(results, 6));
  } catch {
    res.status(502).json({ error: 'Unable to load suggestions.' });
  }
});

app.post('/search', async (req, res) => {
  const { text, lang } = req.body;
  if (typeof text !== 'string') return res.status(400).json({ error: 'Search text must be a string.' });
  if (!text.trim()) return res.json([]);
  if (text.length > 500) return res.status(400).json({ error: 'Search text is too long.' });
  // Define o idioma padrão
  const language = lang === 'en' ? 'en-US' : 'pt-BR';
  try {
    // Busca normal por texto
    const resultsText = await searchTMDb(text, language);

    // NLP simples: extrair palavras-chave
    const keywords = extractKeywords(text);
    let resultsKeywords = [];
    for (const word of keywords) {
      const keywordResults = await searchKeywordsTMDb(word);
      for (const kw of keywordResults.slice(0, 2)) { // Limita para evitar excesso de requisições
        const discoverResults = await discoverByKeyword(kw.id, language);
        resultsKeywords.push(...discoverResults);
      }
    }

    // Junta e remove duplicados
    const allResults = [...resultsText, ...resultsKeywords];
    const uniqueResults = selectTitles(allResults);

    // Monta resposta
    const mapped = await Promise.all(uniqueResults.map(async (item) => ({
      id: item.id,
      media_type: item.media_type,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').slice(0, 4),
      overview: item.overview,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '',
      cast: await getCast(item.media_type, item.id, language),
      streaming: await getStreamingInfo(item.title || item.name, (item.release_date || item.first_air_date || '').slice(0, 4))
    })));
    res.json(mapped);
  } catch (e) {
    let msg = 'Erro ao buscar informações';
    if (e.response) {
      if (e.response.status === 401) {
        msg = 'Chave de API inválida ou não autorizada.';
      } else if (e.response.status === 429) {
        msg = 'Limite de requisições atingido. Tente novamente mais tarde.';
      } else if (e.response.status >= 500) {
        msg = 'Erro no servidor externo (TMDb ou Watchmode).';
      } else if (e.response.data && e.response.data.status_message) {
        msg = e.response.data.status_message;
      }
    } else if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
      msg = 'Erro de conexão com as APIs externas.';
    }
    res.status(500).json({ error: msg });
  }
});

return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  createApp({ config }).listen(config.port, () => {
    console.log(`Servidor rodando na porta ${config.port}`);
  });
}
