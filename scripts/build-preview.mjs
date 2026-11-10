import { build } from 'esbuild';
import * as sass from 'sass';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const result = await build({
  entryPoints: ['preview/Preview.tsx'], bundle: true, format: 'iife', target: ['es2020'],
  outfile: 'preview/tile-studio-preview.js', write: false, minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'preview-scss', setup(buildApi) {
    buildApi.onLoad({ filter: /\.scss$/ }, async args => {
      const source = await readFile(args.path, 'utf8');
      const compiled = sass.compileString(source, { loadPaths: [path.dirname(args.path)], style: 'compressed' });
      return { contents: compiled.css, loader: args.path.endsWith('.module.scss') ? 'local-css' : 'css', resolveDir: path.dirname(args.path) };
    });
  } }]
});
const js = result.outputFiles.find(file => file.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find(file => file.path.endsWith('.css')).text.replace(/<\/style/gi, '<\\/style');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="Tile Studio interactive design preview. Uses the production React components with local sample content."><title>Tile Studio · Interactive Preview</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir('preview', { recursive: true });
await writeFile('preview/Tile_Studio_Preview.html', html);
console.log(`Built standalone preview: preview/Tile_Studio_Preview.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
