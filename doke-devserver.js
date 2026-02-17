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
const UPSTREAM_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([502, 503, 504, 520, 522, 524]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET"
]);
const UPSTREAM_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  timeout: UPSTREAM_TIMEOUT_MS
});
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey,authorization,content-type,prefer,range,x-client-info",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};
const FORWARD_HEADER_ALLOWLIST = new Set([
  "accept",
  "content-type",
  "content-length",
  "apikey",
  "authorization",
  "prefer",
  "range",
  "x-client-info",
  "x-application-name",
]);

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
  res.writeHead(status, { "Cache-Control": "no-store", ...CORS_HEADERS, ...headers });
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

function safeHeaders(inHeaders, upstreamHost) {
  const out = {};
  for (const [k, v] of Object.entries(inHeaders || {})) {
    const key = String(k).toLowerCase();
    if (!FORWARD_HEADER_ALLOWLIST.has(key)) continue;
    if (v == null) continue;
    out[key] = v;
  }
  out.host = upstreamHost;
  delete out.connection;
  delete out["transfer-encoding"];
  delete out.cookie;
  return out;
}

function shouldRetryProxyStatus(statusCode) {
  return RETRYABLE_STATUS.has(Number(statusCode || 0));
}

function shouldRetryProxyError(err) {
  if (!err) return false;
  const code = String(err.code || "").toUpperCase();
  if (RETRYABLE_ERROR_CODES.has(code)) return true;
  const msg = String(err.message || err || "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("socket hang up") ||
    msg.includes("connection reset")
  );
}

function isIdempotentMethod(method) {
  const m = String(method || "").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function proxyToSupabase(req, res) {
  const upstream = new URL(SUPABASE_UPSTREAM);
  const upstreamUrl = new URL(req.url, SUPABASE_UPSTREAM);

  const headers = safeHeaders(req.headers, upstream.host);
  headers.origin = SUPABASE_UPSTREAM;

  const method = String(req.method || "GET").toUpperCase();
  const canRetry = isIdempotentMethod(method);
  const maxAttempts = canRetry ? 3 : 1;
  let attempt = 0;

  const baseOptions = {
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: 443,
    method,
    path: upstreamUrl.pathname + upstreamUrl.search,
    headers,
    agent: UPSTREAM_AGENT,
  };

  const forward = () => {
    attempt += 1;
    const options = { ...baseOptions };
    const pReq = https.request(options, (pRes) => {
      const statusCode = Number(pRes.statusCode || 0);
      if (canRetry && attempt < maxAttempts && shouldRetryProxyStatus(statusCode)) {
        pRes.resume();
        setTimeout(forward, 120 * attempt);
        return;
      }

      const outHeaders = { ...pRes.headers };
      delete outHeaders.connection;
      delete outHeaders["transfer-encoding"];
      outHeaders["cache-control"] = "no-store";
      outHeaders["access-control-allow-origin"] = "*";
      outHeaders["access-control-allow-headers"] = CORS_HEADERS["Access-Control-Allow-Headers"];
      outHeaders["access-control-allow-methods"] = CORS_HEADERS["Access-Control-Allow-Methods"];
      res.writeHead(pRes.statusCode || 502, outHeaders);
      pRes.pipe(res);
    });

    pReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      pReq.destroy(new Error("upstream_timeout"));
    });

    pReq.on("error", (e) => {
      if (canRetry && attempt < maxAttempts && shouldRetryProxyError(e)) {
        setTimeout(forward, 120 * attempt);
        return;
      }
      send(res, 502, `Proxy error: ${e && e.message ? e.message : String(e)}`);
    });

    if (canRetry) {
      pReq.end();
      return;
    }
    req.pipe(pReq);
  };

  forward();
}

function makeServer() {
  return http.createServer({ maxHeaderSize: 1024 * 1024 }, (req, res) => {
    const url = req.url || "/";

    if (req.method === "OPTIONS") {
      return send(res, 204, "", { "Access-Control-Max-Age": "86400" });
    }

    if (url.startsWith("/__doke_proxy_ping")) {
      return send(
        res,
        200,
        JSON.stringify({ ok: true, upstream: SUPABASE_UPSTREAM }),
        {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      );
    }

    if (url.startsWith("/__doke_proxy_pixel.gif")) {
      const gif = Buffer.from("R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
      return send(
        res,
        200,
        gif,
        {
          "Content-Type": "image/gif",
          "Content-Length": String(gif.length),
          "Access-Control-Allow-Origin": "*"
        }
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
