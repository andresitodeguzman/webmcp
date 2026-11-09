import http from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const files = new Map([
  ['/', 'index.html'],
  ['/src/app.js', 'src/app.js'],
  ['/src/domain.js', 'src/domain.js'],
  ['/src/tools.js', 'src/tools.js'],
  ['/style.css', 'style.css'],
]);
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
const port = Number(process.env.PORT || 4173);

http.createServer(async (req, res) => {
  const path = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!path || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  try {
    const bytes = await readFile(new URL(path, root));
    res.writeHead(200, {
      'Content-Type': `${mime[path.split('.').pop()]}; charset=utf-8`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(500);
    res.end('Could not read demo asset');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Open http://localhost:${port} (loopback only)`);
});
