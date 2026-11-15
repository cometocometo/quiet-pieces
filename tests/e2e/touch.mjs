// Touch interactions on a phone: tray pull-out, tray scroll, tap to rotate, pinch zoom, hints, sorting.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5195 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ ...devices['iPhone 13'] });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5195/table-test.html?n=48&tray=1&rot=1&pic=garden/1&bg=walnut');
await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
await p.waitForTimeout(500);
const ptr = (type, id, x, y) => p.evaluate(([type, id, x, y]) => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: id === 1, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
}, [type, id, x, y]);
const W = 390, H = 844;
const st = () => p.evaluate(() => ({ tray: window.puzzle.tray.length, order: window.puzzle.order.length, groups: window.puzzle.groups.size, k: +window.table.cam.k.toFixed(3), scroll: Math.round(window.table.trayScroll) }));
console.log('start', await st());
// scroll the tray sideways
await ptr('pointerdown', 1, 300, H - 50);
for (let i = 1; i <= 8; i++) await ptr('pointermove', 1, 300 - i * 25, H - 50);
await ptr('pointerup', 1, 100, H - 50);
console.log('after tray scroll', await st());
// pull a piece up out of the tray
const tx = await p.evaluate(() => { const t = window.table; const it = t['trayList'][1]; return it.x - t.trayScroll; });
await ptr('pointerdown', 1, tx, H - 50);
for (let i = 1; i <= 10; i++) await ptr('pointermove', 1, tx, H - 50 - i * 30);
await ptr('pointerup', 1, tx, H - 350);
await p.waitForTimeout(250);
console.log('after pull-out', await st());
// tap the piece on the table to rotate it
const gid = await p.evaluate(() => window.puzzle.order[window.puzzle.order.length - 1]);
const rot0 = await p.evaluate((g) => window.puzzle.groups.get(g).rot, gid);
const c = await p.evaluate((g) => { const t = window.table, pz = window.puzzle, gr = pz.groups.get(g); const [x, y] = pz.pieceCentre(gr.pieces[0]); return [x * t.cam.k + t.cam.x, y * t.cam.k + t.cam.y]; }, gid);
await ptr('pointerdown', 1, c[0], c[1]); await ptr('pointerup', 1, c[0], c[1]);
await p.waitForTimeout(300);
console.log('rotation', rot0, '->', await p.evaluate((g) => window.puzzle.groups.get(g).rot, gid));
// pinch to zoom
const k0 = (await st()).k;
await ptr('pointerdown', 1, 150, 400); await ptr('pointerdown', 2, 240, 400);
for (let i = 1; i <= 6; i++) { await ptr('pointermove', 1, 150 - i * 10, 400); await ptr('pointermove', 2, 240 + i * 10, 400); }
await ptr('pointerup', 1, 90, 400); await ptr('pointerup', 2, 300, 400);
console.log('pinch zoom', k0, '->', (await st()).k);
await p.evaluate(() => window.table.fit(false));
// hint twice: the second places the piece
await p.evaluate(() => window.table.hint()); await p.waitForTimeout(300);
await p.screenshot({ path: 'tests/e2e/out/touch-hint.png' });
const g0 = (await st()).groups;
await p.evaluate(() => window.table.hint()); await p.waitForTimeout(1200);
console.log('hint placed', g0, '->', (await st()).groups, 'placed pieces', await p.evaluate(() => window.puzzle.placedCount));
// sort the tray by colour, then edges first
await p.evaluate(() => window.table.sortColour()); await p.waitForTimeout(200);
await p.screenshot({ path: 'tests/e2e/out/touch-colour.png' });
await p.evaluate(() => window.table.tidy()); await p.waitForTimeout(200);
const firstEdges = await p.evaluate(() => window.puzzle.tray.slice(0, 5).map((g) => window.puzzle.isEdge[window.puzzle.groups.get(g).pieces[0]]));
console.log('tidy puts edges first', firstEdges.join(''));
// drag a table piece back into the tray
const back = await p.evaluate(() => { const t = window.table, pz = window.puzzle; const g = pz.order.map((id) => pz.groups.get(id)).find((x) => x.pieces.length === 1); if (!g) return null; const [x, y] = pz.pieceCentre(g.pieces[0]); return [x * t.cam.k + t.cam.x, y * t.cam.k + t.cam.y]; });
if (back) {
  const before = (await st()).tray;
  await ptr('pointerdown', 1, back[0], back[1]);
  for (let i = 1; i <= 10; i++) await ptr('pointermove', 1, back[0], back[1] + (H - 50 - back[1]) * i / 10);
  await ptr('pointerup', 1, back[0], H - 50);
  console.log('back to tray', before, '->', (await st()).tray);
}
// resize mid-game (rotate the phone)
await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500);
await p.screenshot({ path: 'tests/e2e/out/touch-landscape.png' });
console.log('errors', errs);
await b.close(); await server.close();
