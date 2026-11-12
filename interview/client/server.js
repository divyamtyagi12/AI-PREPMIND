import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');

const PORT = parseInt(process.env.PORT || '5173', 10);
const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function proxyApiRequest(req, res, targetUrl) {
  try {
    const parsedTarget = new URL(targetUrl);
    const targetPath = parsedTarget.pathname.replace(/\/$/, '') + req.url;
    const isHttps = parsedTarget.protocol === 'https:';
    const lib = isHttps ? import('node:https') : import('node:http');

    lib.then((client) => {
      const headers = { ...req.headers, host: parsedTarget.host };
      const proxyReq = client.request(
        {
          protocol: parsedTarget.protocol,
          hostname: parsedTarget.hostname,
          port: parsedTarget.port || (isHttps ? 443 : 80),
          method: req.method,
          path: targetPath,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('API Proxy Error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Gateway: failed to reach backend API' }));
      });

      req.pipe(proxyReq);
    });
  } catch (err) {
    console.error('Invalid BACKEND_URL:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server configuration error' }));
  }
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // Proxy /api requests if BACKEND_URL is provided
  if (BACKEND_URL && (pathname.startsWith('/api/') || pathname === '/api')) {
    return proxyApiRequest(req, res, BACKEND_URL);
  }

  // Healthcheck endpoint for frontend
  if (pathname === '/healthz' || pathname === '/_health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  // Sanitize path to prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const isHashedAsset = pathname.startsWith('/assets/') && stats.size > 0;

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': isHashedAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    // SPA Fallback: Serve dist/index.html for any non-file client routes (React Router)
    const indexPath = path.join(DIST_DIR, 'index.html');
    fs.readFile(indexPath, (indexErr, content) => {
      if (indexErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error: Build artifacts not found. Please run npm run build first.');
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PrepMind Frontend SPA server listening on http://0.0.0.0:${PORT}`);
  if (BACKEND_URL) {
    console.log(`Proxying /api requests to ${BACKEND_URL}`);
  }
});

