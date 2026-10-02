# ShotFinder

Movie and TV discovery with React, Node.js and external catalog APIs. Search by title or text, inspect cast and synopsis, and find subscription streaming links for Brazil.

**Status:** portfolio prototype. Text discovery uses keyword extraction and TMDb search/discovery; this version does not implement an LLM, RAG or reliable scene recognition. Streaming availability depends on Watchmode data and API limits.

## Features

- Portuguese and English interface, light/dark themes and local search history.
- Autocomplete through the backend: API keys stay on the server.
- Movie/TV deduplication by media type and ID, excluding person records.
- Cast, poster, overview and subscription streaming sources in Brazil.
- Automated backend tests with mocked external providers.

## Run locally

Requirements: Node.js 22 or newer, npm, TMDb and Watchmode API accounts.

```bash
git clone https://github.com/cauamor-dev/ShotFinder.git
cd ShotFinder/server
npm ci
cp .env.example .env
```

Set `TMDB_API_KEY` and `WATCHMODE_API_KEY` in `server/.env`, then run:

```bash
npm start
```

In a second terminal:

```bash
cd ShotFinder/client
npm ci
npm start
```

Backend: `http://localhost:5000`. Frontend: `http://localhost:3000`.
For another backend URL, copy `client/.env.example` to `client/.env` and set `REACT_APP_API_URL`; restart the development server or rebuild the client. **Never put provider keys in React environment variables.**

On Windows, replace `cp` with `Copy-Item` in PowerShell or copy the file manually.

## Verify

```bash
cd server
npm test
```

Tests exercise title identity, duplicate removal, invalid input, configuration errors, autocomplete, credits endpoint selection and provider failure responses. They do not require real API keys or contact the providers.

```bash
cd client
npm run build
```

GitHub Actions runs backend tests when this workflow is added to the repository. Frontend visual behavior and real-provider integration still need manual verification with replacement API keys.

## API

| Endpoint | Input | Output |
| --- | --- | --- |
| `POST /search` | JSON `{ "text": "Interstellar", "lang": "en" }` | Up to five titles with `id`, `media_type`, title, year, overview, poster, cast and streaming |
| `GET /suggestions?text=space&lang=en` | Search text, optional language | Up to six movie/TV catalog records |

Short autocomplete inputs return an empty array. Non-string search input and text over 500 characters return HTTP 400. Provider failures during autocomplete return HTTP 502.

## Architecture and limitations

React → Express → TMDb / Watchmode. Preferences and history remain in browser localStorage. Watchmode results are cached in process memory; this is not persistent storage.

The React client currently uses Create React App. There is no authentication, per-user rate limiting, durable cache or validated production deployment. Long descriptions can generate multiple provider requests; provider quotas and partial failures need attention before a public launch.

If credentials have previously been committed, revoke/replace them with the providers. Removing keys from current files does not erase Git history. Install dependencies with `npm ci`; do not commit `node_modules`.

---

<details>
<summary>Português</summary>

## Sobre o projeto

Protótipo Full Stack para descoberta de filmes e séries, com React, Node.js/Express, TMDb e Watchmode. A busca usa texto e extração simples de palavras-chave; não há LLM, RAG ou reconhecimento confiável de cenas nesta versão.

O autocomplete consulta o backend, mantendo as chaves no servidor. Filmes e séries com o mesmo ID são preservados como títulos distintos, e registros de pessoas são excluídos.

## Executar e testar

Use Node.js 22 ou superior. Em `server`, execute `npm ci`, copie `.env.example` para `.env`, preencha as duas chaves de API e execute `npm start`. Em outro terminal, entre em `client`, execute `npm ci` e `npm start`.

Backend na porta 5000; frontend na porta 3000. Para outra URL de backend, configure `REACT_APP_API_URL` no `.env` do cliente. Não coloque chaves de provedores no React.

Execute `npm test` em `server` e `npm run build` em `client`. Os testes de backend simulam os provedores externos. A interface e as integrações reais precisam de verificação manual com novas chaves.

Se as chaves já foram publicadas, substitua-as nos provedores: retirar do código atual não apaga o histórico do Git. Não versione `node_modules`.

</details>
