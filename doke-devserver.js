#!/usr/bin/env node
/**
 * DOKE local dev server + Supabase proxy (no-CORS) — v4 (auto-port)
 * -----------------------------------------------------------------
 * - Serve arquivos estáticos do projeto (sem dependências).
 * - Faz proxy de /rest/v1/*, /auth/v1/*, /storage/v1/*, /functions/v1/* para o Supabase.
 * - Evita CORS no navegador (same-origin via localhost).
 * - Se a porta estiver ocupada, tenta automaticamente a próxima porta.
 *
 * Uso (Windows/PowerShell):
 *   node .\doke-devserver.js
 *   (ou: $env:PORT=5510; node .\doke-devserver.js)
 *
 * Depois abra no navegador o link que aparecer no terminal.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const START_PORT = Number(process.env.PORT || 5500);
const MAX_TRIES = 40;
const ROOT = __dirname;

// >>> Ajuste aqui se você trocar de projeto Supabase:
const SUPABASE_UPSTREAM = "https://wgbnoqjnvhasapqarltu.supabase.co";

const PROXY_PREFIXES = ["/rest/v1/", "/auth/v1/", "/storage/v1/", "/functions/v1/"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/").split("?")[0] || "/");
  const norm = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return norm.startsWith(path.sep) ? norm.slice(1) : norm;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function serveStatic(req, res) {
  const rel = safePath(req.url || "/");
  let filePath = path.join(ROOT, rel);

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (_) {}

  if ((req.url || "/") === "/" || rel === "") {
    filePath = path.join(ROOT, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!path.extname(filePath)) {
        const tryHtml = filePath + ".html";
        return fs.readFile(tryHtml, (err2, data2) => {
          if (err2) return send(res, 404, "Not found");
          send(res, 200, data2, { "Content-Type": MIME[".html"] || "text/plain" });
        });
      }
      return send(res, 404, "Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
  });
}

function isProxyRoute(urlPath) {
  const p = String(urlPath || "");
  return PROXY_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function proxyToSupabase(req, res) {
  const upstream = new URL(SUPABASE_UPSTREAM);
  const upstreamUrl = new URL(req.url, SUPABASE_UPSTREAM);

  const headers = { ...req.headers };

  headers.host = upstream.host;
  headers.origin = SUPABASE_UPSTREAM;

  const options = {
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: 443,
    method: req.method,
    path: upstreamUrl.pathname + upstreamUrl.search,
    headers,
  };

  const pReq = https.request(options, (pRes) => {
    const outHeaders = { ...pRes.headers };
    outHeaders["cache-control"] = "no-store";
    res.writeHead(pRes.statusCode || 502, outHeaders);
    pRes.pipe(res);
  });

  pReq.on("error", (e) => {
    send(res, 502, `Proxy error: ${e && e.message ? e.message : String(e)}`);
  });

  req.pipe(pReq);
}

function makeServer() {
  return http.createServer((req, res) => {
    const url = req.url || "/";

    if (url.startsWith("/__doke_proxy_ping")) {
      return send(
        res,
        200,
        JSON.stringify({ ok: true, upstream: SUPABASE_UPSTREAM }),
        { "Content-Type": "application/json; charset=utf-8" }
      );
    }

    if (isProxyRoute(url)) return proxyToSupabase(req, res);

    return serveStatic(req, res);
  });
}

function start(port, triesLeft) {
  const server = makeServer();

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE" && triesLeft > 0) {
      const next = port + 1;
      console.log(`[DOKE] Porta ${port} em uso. Tentando ${next}...`);
      try { server.close(); } catch (_) {}
      return start(next, triesLeft - 1);
    }
    console.error("[DOKE] Erro ao iniciar server:", err);
    process.exit(1);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n[DOKE] Dev server ON: http://localhost:${port}/`);
    console.log(`[DOKE] Ping:           http://localhost:${port}/__doke_proxy_ping`);
    console.log(`[DOKE] Login:          http://localhost:${port}/frontend/login.html`);
    console.log(`[DOKE] Supabase proxy -> ${SUPABASE_UPSTREAM}`);
    console.log(`[DOKE] Dica: feche o Live Server pra não brigar por porta.\n`);
  });
}

start(START_PORT, MAX_TRIES);
