# ShotFinder

Find films and series, keep a watchlist, and see where to watch in Brazil.

React + Vite on the frontend. Node.js + Express on the backend. TMDb provides the catalog; Watchmode provides streaming availability.

## Features

- Title search with debounced, keyboard-accessible autocomplete.
- Optional keyword discovery for short clues, across films and TV.
- Portuguese and English, light and dark themes, responsive layouts.
- Watchlist and recent searches stored locally in the browser.
- Title details, cast, ratings and Brazilian subscription, free, rental and purchase offers.
- Provider details loaded only on demand, with timeouts and bounded in-memory caches.

Clue search uses catalog keywords, not an AI model or image recognition. It works best with short English keywords; results are suggestions, not guaranteed scene matches. Watchlist data is local to each browser and does not sync across devices.

## Run locally

Use Node.js **22.12+** or **24 LTS**.

1. Copy `server/.env.example` to `server/.env` and enter your keys:

```env
TMDB_API_KEY=your_tmdb_v3_key
WATCHMODE_API_KEY=your_watchmode_key
PORT=5000
```

2. In a terminal in `server`:

```sh
npm ci
npm start
```

3. In another terminal in `client`:

```sh
npm ci
npm start
```

Open **http://localhost:3000**. Keep both terminals running. The frontend forwards `/api` requests to port 5000, so no client configuration is needed locally. Never add private keys to client files or commit `.env`.

If the API is hosted elsewhere, set `VITE_API_URL` in `client/.env` before building. The value is public and must contain only the API address. Set `CLIENT_ORIGIN` on the server to the exact allowed frontend origin (comma-separated for multiple origins). Behind a reverse proxy, configure proxy trust for that specific environment before relying on client IP rate limits.

## Production build

```sh
cd client
npm ci
npm run build
cd ../server
npm ci
npm start
```

The server serves the built frontend at **http://localhost:5000** and the API at `/api`. Configure the production origin and HTTPS with your host. A public service needs abuse monitoring and a shared cache/rate-limit store if it runs on multiple instances; current limits and caches are per process.

## Checks

```sh
npm test --prefix server
npm test --prefix client
npm run build --prefix client
npm audit --prefix server
npm audit --prefix client
```

GitHub Actions runs tests, builds the frontend and audits dependencies on pushes and pull requests. Provider calls are mocked in automated tests: they do not prove live key validity or account permissions.

## API

| Method | Endpoint                            | Purpose                                                     |
| ------ | ----------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/health`                       | Server status; does not check provider credentials          |
| GET    | `/api/suggestions?text=...&lang=pt` | Autocomplete                                                |
| POST   | `/api/search`                       | `{ "text": "Interstellar", "lang": "en", "mode": "title" }` |
| GET    | `/api/titles/movie/157336?lang=pt`  | Details and Brazil streaming options                        |

`mode` accepts `title` or `scene`; `lang` accepts `pt` or `en`; media types are `movie` and `tv`. The original `/search` and `/suggestions` routes remain available. Search now returns catalog cards; cast and streaming are returned by the details endpoint.

Search and autocomplete are cached for 5 minutes. Streaming results are cached for 1 hour. Searches do not call Watchmode; opening a title makes one sources request using its exact TMDb identity, which Watchmode may charge as multiple credits. Failed streaming calls are shown separately from valid empty results and are not cached. Search inputs are limited to 500 characters and API traffic to 60 requests/minute/IP.

## Structure

```text
client/src/App.jsx          Search, filters and watchlist
client/src/components/     Title cards, details dialog and icons
client/src/i18n.js          Interface text
client/src/storage.js       Safe browser persistence
server/index.js            Routes, validation and middleware
server/catalog.js          Provider integration
server/cache.js            Bounded cache with expiration
server/test/               API and provider regression tests
```

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability is provided by Watchmode and may change. No video is hosted or played by ShotFinder. DM Sans and Instrument Serif are distributed under the SIL Open Font License; license files are included with the self-hosted fonts.

---

## Português

O ShotFinder busca filmes e séries, guarda uma lista local e consulta onde assistir no Brasil. A busca por pistas usa palavras-chave do catálogo; não é reconhecimento de cenas com IA.

Para rodar: configure `server/.env`, execute `npm ci` e `npm start` em `server`, depois os mesmos comandos em `client`. Abra **http://localhost:3000**. As duas janelas precisam ficar abertas.

Os detalhes e as plataformas são consultados ao abrir um título. Erros de chave, cota ou serviço são diferentes de um resultado válido sem plataformas. Favoritos e histórico ficam apenas no navegador usado.

Ao atualizar uma cópia antiga, guarde o seu `server/.env`, extraia a nova versão em outra pasta, copie somente esse arquivo para a nova pasta `server` e reinstale as dependências nas duas partes. Não reutilize a pasta `node_modules` antiga.
