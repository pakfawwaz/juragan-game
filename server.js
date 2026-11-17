// Minimal static server for Heroku and local play. No dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const PUBLIC = ['index.html', 'css/', 'js/'];

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch (e) { res.writeHead(400); return res.end('Bad request'); }
  const file = path.normalize(path.join(ROOT, rel));
  rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (!PUBLIC.some(p => rel === p || rel.startsWith(p))) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Juragan running on port ${PORT}`));
