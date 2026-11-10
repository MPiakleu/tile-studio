import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.TILE_STUDIO_PREVIEW_PORT || 4173);
createServer(async (_request, response) => {
  try { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(await readFile(new URL('../preview/Tile_Studio_Preview.html', import.meta.url))); }
  catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Run npm run preview:build first.'); }
}).listen(port, '127.0.0.1', () => console.log(`Tile Studio preview: http://127.0.0.1:${port}`));
