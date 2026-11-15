// Render pictures through the dev server and save a contact sheet.
// usage: node tests/e2e/art.mjs out.png '[{"gen":"ridges","seed":1,"v":0}]' [width] [cols]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const [out, list, w = '1200', cw = '360'] = process.argv.slice(2);
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
let recipes = list;
if (list.startsWith('catalog:')) {
  const [, from, to] = list.split(':').map(Number);
  const { packs } = await server.ssrLoadModule('/src/art/catalog.ts');
  recipes = JSON.stringify(packs.flatMap((p) => p.pictures.map((x) => x.recipe)).slice(from, to));
}
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1480, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(`http://localhost:5199/art-preview.html?w=${w}&h=${Math.round(w / 1.5)}&cw=${cw}&list=${encodeURIComponent(recipes)}`);
await p.waitForFunction(() => window.__done || document.querySelector('vite-error-overlay'), null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => window.__times)));
await p.screenshot({ path: out, fullPage: true });
if (errs.length) console.log('ERRORS', errs);
await b.close(); await server.close();
