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

const PROXY_PREFIXES = [
  '/rest/v1/',
  '/auth/v1/',
  '/storage/v1/',
  '/functions/v1/',
  '/realtime/v1/',
];

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

function sendJson(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
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
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function proxyToSupabase(req, res) {
  const target = new URL(req.url, upstreamUrl);

  const headers = safeHeaders(req.headers);

  const opts = {
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: target.pathname + target.search,
    headers,
  };

  const client = upstreamUrl.protocol === 'https:' ? https : http;
  const upstreamReq = client.request(opts, (upstreamRes) => {
    const outHeaders = { ...upstreamRes.headers };
    // Browsers dislike certain hop-by-hop headers
    delete outHeaders['transfer-encoding'];
    delete outHeaders['connection'];

    res.writeHead(upstreamRes.statusCode || 502, outHeaders);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Proxy error: ' + (e && e.message ? e.message : String(e)));
  });

  // Pipe body
  req.pipe(upstreamReq);
}

const server = http.createServer({ maxHeaderSize: 256 * 1024 }, (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);

    if (u.pathname === '/__doke_proxy_ping') {
      return sendJson(res, 200, { ok: true, upstream: SUPABASE_UPSTREAM });
    }

    if (u.pathname === '/__doke_proxy_pixel.gif') {
      const gif = Buffer.from('R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
      res.writeHead(200, { 'content-type': 'image/gif', 'content-length': String(gif.length), 'cache-control': 'no-store' });
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
