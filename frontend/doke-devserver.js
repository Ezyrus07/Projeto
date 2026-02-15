#!/usr/bin/env node
/**
 * DOKE local dev server + Supabase proxy (no-CORS)
 * -------------------------------------------------
 * Objetivo: rodar o projeto em http://localhost:5500
 * e encaminhar /rest/v1/* e /auth/v1/* (e /storage/v1/*, /functions/v1/*)
 * para o Supabase real, eliminando CORS no navegador.
 *
 * Uso:
 *   1) Feche o Live Server/porta 5500
 *   2) node doke-devserver.js
 *   3) Abra: http://localhost:5500/index.html
 *
 * Observação:
 * - NÃO precisa npm install (sem dependências).
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 5500);
const ROOT = __dirname;

// Mantém o upstream em um único lugar
const SUPABASE_UPSTREAM = "https://wgbnoqjnvhasapqarltu.supabase.co";

// Rotas que devem ser proxy
const PROXY_PREFIXES = [
  "/rest/v1/",
  "/auth/v1/",
  "/storage/v1/",
  "/functions/v1/",
];

// MIME básico (suficiente pro seu projeto)
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
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const norm = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return norm.startsWith(path.sep) ? norm.slice(1) : norm;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function serveStatic(req, res) {
  const rel = safePath(req.url || "/");
  let filePath = path.join(ROOT, rel);

  // Diretório -> tenta index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (_) {}

  // Se pedir "/" -> index.html
  if ((req.url || "/") === "/" || rel === "") {
    filePath = path.join(ROOT, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // fallback: tenta servir o próprio caminho com ".html" se não tiver extensão
      if (!path.extname(filePath)) {
        const tryHtml = filePath + ".html";
        return fs.readFile(tryHtml, (err2, data2) => {
          if (err2) return send(res, 404, "Not found");
          const ext = ".html";
          send(res, 200, data2, { "Content-Type": MIME[ext] || "text/plain" });
        });
      }
      return send(res, 404, "Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
  });
}

function proxyToSupabase(req, res) {
  const upstream = new URL(SUPABASE_UPSTREAM);
  const upstreamUrl = new URL(req.url, SUPABASE_UPSTREAM);

  const headers = { ...req.headers };

  // Ajusta headers pra upstream (evita problemas de host/origin)
  headers.host = upstream.host;
  headers.origin = SUPABASE_UPSTREAM;

  // Alguns navegadores mandam "accept-encoding" e o Node repassa.
  // Deixa, mas se você tiver problema com gzip, comente a linha abaixo:
  // delete headers["accept-encoding"];

  const options = {
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: 443,
    method: req.method,
    path: upstreamUrl.pathname + upstreamUrl.search,
    headers,
  };

  const pReq = https.request(options, (pRes) => {
    // Repassa status e headers
    const outHeaders = { ...pRes.headers };

    // Como é same-origin (proxy), CORS não é necessário, mas manter não atrapalha.
    outHeaders["cache-control"] = "no-store";

    res.writeHead(pRes.statusCode || 502, outHeaders);
    pRes.pipe(res);
  });

  pReq.on("error", (e) => {
    send(res, 502, `Proxy error: ${e && e.message ? e.message : String(e)}`);
  });

  req.pipe(pReq);
}

function isProxyRoute(urlPath) {
  const p = String(urlPath || "");
  return PROXY_PREFIXES.some((prefix) => p.startsWith(prefix));
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  // Ping pro supabase-init.js detectar proxy
  if (url.startsWith("/__doke_proxy_ping")) {
    return send(
      res,
      200,
      JSON.stringify({ ok: true, upstream: SUPABASE_UPSTREAM }),
      { "Content-Type": "application/json; charset=utf-8" }
    );
  }

  if (isProxyRoute(url)) {
    return proxyToSupabase(req, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n[DOKE] Dev server ON: http://localhost:${PORT}/`);
  console.log(`[DOKE] Supabase proxy -> ${SUPABASE_UPSTREAM}`);
  console.log(`[DOKE] (Feche o Live Server se a porta estiver ocupada)\n`);
});
