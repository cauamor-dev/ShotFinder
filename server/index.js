import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import axios from "axios";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createCatalog } from "./catalog.js";

export function createApp({ http = axios, config = loadConfig() } = {}) {
  const app = express(),
    catalog = createCatalog(http, config);
  const origins = config.origins || [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
  ];
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", "https://image.tmdb.org", "data:"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.headers.origin && !origins.includes(req.headers.origin))
      return res
        .status(403)
        .json({ error: "Origin not allowed.", code: "ORIGIN" });
    next();
  });
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "8kb" }));
  const router = express.Router();
  app.use(
    ["/api", "/search", "/suggestions", "/titles", "/health"],
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Muitas buscas. Aguarde um minuto.",
        code: "RATE_LIMIT",
      },
    }),
  );
  router.get("/health", (req, res) => res.json({ status: "ok" }));
  const normalize = (value) =>
    typeof value === "string" ? value.trim() : null;
  const errorResponse = (res, error) => {
    const status = error.response?.status;
    const code =
      status === 401 || status === 403
        ? "API_KEY"
        : status === 429
          ? "QUOTA"
          : status === 404
            ? "NOT_FOUND"
            : "PROVIDER";
    const messages = {
      API_KEY: "A chave do catálogo não foi autorizada.",
      QUOTA: "O catálogo atingiu o limite de consultas. Tente mais tarde.",
      NOT_FOUND: "Título não encontrado.",
      PROVIDER: "Não foi possível consultar o catálogo agora.",
    };
    return res
      .status(code === "NOT_FOUND" ? 404 : code === "QUOTA" ? 503 : 502)
      .json({ error: messages[code], code });
  };
  router.get("/suggestions", async (req, res) => {
    const text = normalize(req.query.text);
    if (text === null || text.length > 500)
      return res
        .status(400)
        .json({ error: "Invalid search text.", code: "VALIDATION" });
    if (text.length < 2) return res.json([]);
    try {
      res.json(await catalog.suggestions(text, req.query.lang));
    } catch (error) {
      errorResponse(res, error);
    }
  });
  router.post("/search", async (req, res) => {
    const text = normalize(req.body?.text);
    if (text === null || text.length > 500)
      return res
        .status(400)
        .json({ error: "Invalid search text.", code: "VALIDATION" });
    if (!text) return res.json([]);
    const mode = req.body?.mode || "title";
    if (!["title", "scene"].includes(mode))
      return res
        .status(400)
        .json({ error: "Invalid search mode.", code: "VALIDATION" });
    try {
      res.json(await catalog.search(text, req.body?.lang, mode));
    } catch (error) {
      errorResponse(res, error);
    }
  });
  router.get("/titles/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    if (!["movie", "tv"].includes(type) || !/^[1-9]\d{0,8}$/.test(id))
      return res
        .status(400)
        .json({ error: "Invalid title.", code: "VALIDATION" });
    try {
      res.json(await catalog.details(type, Number(id), req.query.lang));
    } catch (error) {
      errorResponse(res, error);
    }
  });
  app.use("/api", router);
  app.use("/", router);
  const dist = fileURLToPath(new URL("../client/dist/", import.meta.url));
  if (existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get("/", (req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.use((req, res) =>
    res.status(404).json({ error: "Route not found.", code: "NOT_FOUND" }),
  );
  app.use((error, req, res, next) => {
    const status =
      error.type === "entity.too.large"
        ? 413
        : error instanceof SyntaxError
          ? 400
          : 500;
    res
      .status(status)
      .json({
        error:
          status === 413
            ? "Request too large."
            : status === 400
              ? "Invalid JSON."
              : "Internal server error.",
        code: "REQUEST",
      });
  });
  return app;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const config = loadConfig();
    createApp({ config }).listen(config.port, () =>
      console.log(`ShotFinder: http://localhost:${config.port}`),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
