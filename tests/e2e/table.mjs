import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const out = 'tests/e2e/out/';
async function open(query, opts = { viewport: { width: 1400, height: 860 } }) {
  const p = await b.newPage(opts);
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:5198/table-test.html?${query}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  return p;
}
const p = await open('n=48');
console.log('timing 48', await p.evaluate(() => window.timing));
await p.screenshot({ path: out + 't0.png' });
await p.waitForTimeout(2200);
await p.screenshot({ path: out + 't1.png' });
// drag piece 1 next to piece 0 using real mouse events
const pos = await p.evaluate(() => {
  const t = window.table, pz = window.puzzle;
  const cam = t.cam;
  const S = ([x, y]) => [x * cam.k + cam.x, y * cam.k + cam.y];
  const c1 = pz.pieceCentre(1), c0 = pz.pieceCentre(0);
  return { from: S(c1), to: S([c0[0] + pz.cw + 4, c0[1] + 3]) };
});
await p.mouse.move(...pos.from); await p.mouse.down(); await p.mouse.move(...pos.to, { steps: 15 }); await p.mouse.up();
await p.waitForTimeout(300);
console.log('groups after drag', await p.evaluate(() => window.puzzle.groups.size), 'events', JSON.stringify(await p.evaluate(() => window.events.slice(-2))));
await p.mouse.move(700, 430); await p.mouse.wheel(0, -500); await p.waitForTimeout(150);
await p.screenshot({ path: out + 't2.png' });
await p.evaluate(() => window.table.fit(false));
await p.evaluate(() => window.table.tidy()); await p.waitForTimeout(1300);
await p.screenshot({ path: out + 't3.png' });
// solve everything but one by moving groups, then drop the last by mouse
await p.evaluate(() => { const pz = window.puzzle; for (const g of [...pz.groups.values()]) { if (g.pieces.includes(5)) continue; g.x = 0; g.y = 0; g.rot = 0; } for (const g of [...pz.groups.values()]) { if (g.pieces.includes(5) || !pz.groups.has(g.id)) continue; const v = window.table['views'].get(g.id); if (v) window.table['drop'](v); } });
await p.waitForTimeout(400);
await p.screenshot({ path: out + 't4.png' });
const last = await p.evaluate(() => { const t = window.table, pz = window.puzzle, cam = t.cam; const c = pz.pieceCentre(5); const r = pz.col(5), w = pz.row(5); return { from: [c[0] * cam.k + cam.x, c[1] * cam.k + cam.y], to: [((r + 0.5) * pz.cw + 5) * cam.k + cam.x, ((w + 0.5) * pz.ch - 4) * cam.k + cam.y] }; });
await p.mouse.move(...last.from); await p.mouse.down(); await p.mouse.move(...last.to, { steps: 12 }); await p.mouse.up();
await p.waitForTimeout(2400);
await p.screenshot({ path: out + 't5.png' });
console.log('complete?', await p.evaluate(() => JSON.stringify(window.events.slice(-1))));
// phone with tray + rotation
const m = await open('n=80&tray=1&rot=1&pic=coastlines/2&bg=felt-green', { ...devices['iPhone 13'] });
await m.waitForTimeout(500);
await m.screenshot({ path: out + 'm1.png' });
// big puzzle performance
const big = await open('n=1000&pic=little-towns/1&bg=walnut');
console.log('timing 1000', await big.evaluate(() => window.timing));
await big.waitForTimeout(2500);
const fps = await big.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('fps 1000 (software GL)', fps);
await big.screenshot({ path: out + 'big.png' });
console.log('errors', errs);
await b.close(); await server.close();
