// Renders the end-of-puzzle fireworks frame by frame at a true 60 fps (independent of how fast this machine draws).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5190 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 760 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5190/table-test.html?n=12&pic=banff/1');
await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
await p.evaluate(async () => {
  const { Fireworks } = await import('/src/engine/fireworks.ts');
  const t = window.table;
  t.app.ticker.stop();
  t['finishSprite'].alpha = 1;
  const f = new Fireworks();
  f.resize(t['W'], t['H']);
  t['confettiLayer'].addChild(f.layer);
  f['skyTarget'] = 0.86;
  window.fw = f;
  window.sim = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) f.step(1 / 60); t.app.render(); };
  window.sim(0.8);
});
const frames = [
  ['launch', async () => { await p.evaluate(() => { fw['launch']('peony'); fw['launch']('chrysanthemum'); fw['launch']('ring'); sim(0.9); }); }],
  ['burst', async () => { await p.evaluate(() => sim(0.45)); }],
  ['spread', async () => { await p.evaluate(() => sim(0.5)); }],
  ['willow', async () => { await p.evaluate(() => { fw['launch']('willow'); fw['launch']('glitter'); sim(2.1); }); }],
  ['droop', async () => { await p.evaluate(() => sim(0.9)); }],
];
for (const [name, run] of frames) { await run(); await p.screenshot({ path: `tests/e2e/out/fw-${name}.png` }); }
console.log('errors', errs, 'sky', await p.evaluate(() => fw['sky'].alpha.toFixed(2)));
await b.close(); await server.close();
