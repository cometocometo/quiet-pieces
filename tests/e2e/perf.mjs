import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 860 } });
const n = process.argv[2] || '1000';
await p.goto(`http://localhost:5197/table-test.html?n=${n}&pic=little-towns/1&bg=walnut`);
await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
console.log('timing', await p.evaluate(() => window.timing));
await p.waitForTimeout(3000);
console.log(await p.evaluate(async () => {
  const t = window.table, app = t.app;
  const r0 = performance.now(); for (let i = 0; i < 10; i++) app.renderer.render(app.stage); const render = (performance.now() - r0) / 10;
  const k0 = performance.now(); for (let i = 0; i < 10; i++) t['tick'](); const tick = (performance.now() - k0) / 10;
  return { render: render.toFixed(1), tick: tick.toFixed(2), views: t['views'].size };
}));
await b.close(); await server.close();
