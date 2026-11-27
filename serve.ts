// serve.ts — tiny static server for play-testing Kestrel Ridge locally.
// Serves game/ at http://localhost:8080. Node 22 standard library only.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('./game/', import.meta.url).pathname;
const PORT = 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

createServer((req, res) => {
  const path = decodeURIComponent(req.url?.split('?')[0] ?? '/');
  const file = join(ROOT, path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`Kestrel Ridge at http://localhost:${PORT}/`);
});
