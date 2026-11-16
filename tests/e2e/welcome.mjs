import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5191 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch();
const errs = [];
for (const [name, opts] of [['desk', { viewport: { width: 1360, height: 860 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  const p = await b.newPage(opts);
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:5191/'); await p.waitForSelector('.welcome');
  if (process.env.RETURNING) { await p.evaluate(async () => { const { kvSet } = await import('/src/data/db.ts'); await kvSet('profile', { xp: 900, completed: 7, piecesPlaced: 400, totalTime: 1, best: {}, done: {}, streak: { count: 2, best: 2, last: '' }, daily: {}, achievements: {}, favourites: [] }); }); await p.reload(); await p.waitForSelector('.welcome'); }
  await p.waitForSelector('canvas.ready', { timeout: 30000 });
  await p.waitForTimeout(900); await p.screenshot({ path: `tests/e2e/out/w-${name}-mid.png` });
  await p.waitForTimeout(4500); await p.screenshot({ path: `tests/e2e/out/w-${name}.png` });
  await p.screenshot({ path: `tests/e2e/out/w-${name}-full.png`, fullPage: true });
  await p.close();
}
const og = await b.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto('file://' + process.cwd() + '/public/icons/og.png'); await og.screenshot({ path: 'tests/e2e/out/og-view.png' });
console.log('errors', errs);
await b.close(); await server.close();
