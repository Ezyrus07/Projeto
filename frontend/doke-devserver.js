/**
 * Doke DevServer (NO dependencies)
 * - Serves static files (your project folder)
 * - Proxies Supabase endpoints to avoid CORS
 * - Fixes 431 by increasing maxHeaderSize and whitelisting forwarded headers
 *
 * Run (PowerShell):  $env:PORT=5504; node .\doke-devserver.js
 * Run (CMD):        set PORT=5504 && node doke-devserver.js
 *
 * Open:
 *   http://localhost:PORT/__doke_proxy_ping
 *   http://localhost:PORT/frontend/login.html
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 5504);
const ROOT = process.cwd();

// Your Supabase project URL
const SUPABASE_UPSTREAM = process.env.SUPABASE_UPSTREAM || 'https://wgbnoqjnvhasapqarltu.supabase.co';
const upstreamUrl = new URL(SUPABASE_UPSTREAM);
const UPSTREAM_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([502, 503, 504, 520, 522, 524]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);
const upstreamAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  timeout: UPSTREAM_TIMEOUT_MS,
});

const PROXY_PREFIXES = [
  '/rest/v1/',
  '/auth/v1/',
  '/storage/v1/',
  '/functions/v1/',
  '/realtime/v1/',
];

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'apikey,authorization,content-type,prefer,range,x-client-info',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const FORWARD_HEADER_ALLOWLIST = new Set([
  'accept',
  'content-type',
  'content-length',
  'apikey',
  'authorization',
  'prefer',
  'range',
  'x-client-info',
  'x-application-name',
]);

function isProxyPath(p) {
  return PROXY_PREFIXES.some((pre) => p.startsWith(pre));
}

function safeHeaders(inHeaders) {
  const out = {};
  for (const [k, v] of Object.entries(inHeaders || {})) {
    const key = String(k).toLowerCase();
    if (!FORWARD_HEADER_ALLOWLIST.has(key)) continue;
    if (v == null) continue;
    out[key] = v;
  }
  // Ensure upstream host
  out['host'] = upstreamUrl.host;
  // Avoid hop-by-hop headers
  delete out['connection'];
  delete out['transfer-encoding'];
  return out;
}

function shouldRetryStatus(statusCode) {
  return RETRYABLE_STATUS.has(Number(statusCode || 0));
}

function shouldRetryError(err) {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  if (RETRYABLE_ERROR_CODES.has(code)) return true;
  const msg = String(err.message || err || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('socket hang up') || msg.includes('connection reset');
}

function isIdempotent(method) {
  const m = String(method || '').toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

function sendJson(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
    ...CORS_HEADERS,
  });
  res.end(body);
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    default: return 'application/octet-stream';
  }
}

function serveFile(req, res, pathname) {
  // Default route
  let rel = pathname;
  if (rel === '/' || rel === '') rel = '/frontend/index.html';

  // Prevent path traversal
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(400);
    return res.end('Bad path');
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, {
      'content-type': mimeFor(filePath),
      'cache-control': 'no-store',
      ...CORS_HEADERS,
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function proxyToSupabase(req, res) {
  const target = new URL(req.url, upstreamUrl);

  const headers = safeHeaders(req.headers);

  const method = String(req.method || 'GET').toUpperCase();
  const canRetry = isIdempotent(method);
  const maxAttempts = canRetry ? 3 : 1;
  let attempt = 0;

  const baseOpts = {
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
    method,
    path: target.pathname + target.search,
    headers,
    agent: upstreamAgent,
  };

  const client = upstreamUrl.protocol === 'https:' ? https : http;
  const forward = () => {
    attempt += 1;
    const opts = { ...baseOpts };
    const upstreamReq = client.request(opts, (upstreamRes) => {
      const statusCode = Number(upstreamRes.statusCode || 0);
      if (canRetry && attempt < maxAttempts && shouldRetryStatus(statusCode)) {
        upstreamRes.resume();
        setTimeout(forward, 120 * attempt);
        return;
      }

      const outHeaders = { ...upstreamRes.headers };
      // Browsers dislike certain hop-by-hop headers
      delete outHeaders['transfer-encoding'];
      delete outHeaders['connection'];
      outHeaders['access-control-allow-origin'] = '*';
      outHeaders['access-control-allow-headers'] = CORS_HEADERS['access-control-allow-headers'];
      outHeaders['access-control-allow-methods'] = CORS_HEADERS['access-control-allow-methods'];

      res.writeHead(upstreamRes.statusCode || 502, outHeaders);
      upstreamRes.pipe(res);
    });

    upstreamReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      upstreamReq.destroy(new Error('upstream_timeout'));
    });

    upstreamReq.on('error', (e) => {
      if (canRetry && attempt < maxAttempts && shouldRetryError(e)) {
        setTimeout(forward, 120 * attempt);
        return;
      }
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Proxy error: ' + (e && e.message ? e.message : String(e)));
    });

    if (canRetry) {
      upstreamReq.end();
      return;
    }
    req.pipe(upstreamReq);
  };

  forward();
}

const server = http.createServer({ maxHeaderSize: 1024 * 1024 }, (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'cache-control': 'no-store', ...CORS_HEADERS, 'access-control-max-age': '86400' });
      return res.end();
    }

    if (u.pathname === '/__doke_proxy_ping') {
      return sendJson(res, 200, { ok: true, upstream: SUPABASE_UPSTREAM });
    }

    if (u.pathname === '/__doke_proxy_pixel.gif') {
      const gif = Buffer.from('R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
      res.writeHead(200, { 'content-type': 'image/gif', 'content-length': String(gif.length), 'cache-control': 'no-store', ...CORS_HEADERS });
      return res.end(gif);
    }

    if (isProxyPath(u.pathname)) {
      return proxyToSupabase(req, res);
    }

    // Static
    return serveFile(req, res, decodeURIComponent(u.pathname));
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error: ' + (e && e.message ? e.message : String(e)));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[DOKE] DevServer ON: http://localhost:${PORT}`);
  console.log(`[DOKE] Proxy ping:    http://localhost:${PORT}/__doke_proxy_ping`);
  console.log(`[DOKE] Open login:    http://localhost:${PORT}/frontend/login.html`);
});
