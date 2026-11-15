// End-to-end walk through the real app: home → pack → setup → play → finish → profile → settings.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const base = process.env.BASE;
let server;
if (!base) { server = await createServer({ server: { port: 5196 }, logLevel: 'error' }); await server.listen(); }
const url = base ?? 'http://localhost:5196/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = 'tests/e2e/out/';
const errs = [];
const watch = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); };

async function solve(p) {
  await p.waitForFunction(() => window.__table?.puzzle, null, { timeout: 60000 });
  await p.evaluate(() => {
    const t = window.__table, pz = t.puzzle;
    const keep = 0;
    for (const g of [...pz.groups.values()]) { if (g.pieces.includes(keep)) continue; if (g.tray) pz.takeFromTray(g); g.x = 0; g.y = 0; g.rot = 0; }
    for (const g of [...pz.groups.values()]) { if (g.pieces.includes(keep) || !pz.groups.has(g.id)) continue; const v = t['views'].get(g.id); if (v) { v.c.visible = true; t['drop'](v); } }
    t['layoutTray']();
  });
  await p.waitForTimeout(300);
}

for (const [name, opts] of [['desk', { viewport: { width: 1360, height: 860 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  const p = await b.newPage(opts); watch(p);
  await p.goto(url + '?e2e');
  await p.waitForTimeout(5000);
  await p.waitForSelector('.home');
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}${name}-home.png` });
  await p.click('.pack >> nth=1');
  await p.waitForSelector('.grid .pic');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}${name}-pack.png` });
  await p.click('.grid .pic >> nth=0');
  await p.waitForSelector('[role=dialog] .setup');
  await p.click('.counts button:has-text("24")');
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}${name}-setup.png` });
  await p.click('button:has-text("Start puzzle")');
  await p.waitForSelector('.play');
  await p.waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 60000 });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}${name}-play.png` });
  if (await p.isVisible('button:has-text("Got it")')) await p.click('button:has-text("Got it")');
  // real drag of the first piece toward its neighbour
  const pts = await p.evaluate(() => {
    const t = window.__table, pz = t.puzzle, cam = t.cam;
    const g = pz.group(1);
    if (g.tray) return null;
    const S = ([x, y]) => [x * cam.k + cam.x, y * cam.k + cam.y];
    const a = pz.pieceCentre(0), c = pz.pieceCentre(1);
    return { from: S(c), to: S([a[0] + pz.cw + 3, a[1] + 2]) };
  });
  if (pts) { await p.mouse.move(...pts.from); await p.mouse.down(); await p.mouse.move(...pts.to, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(400); }
  await p.click('[aria-label="Hint"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}${name}-hint.png` });
  await p.click('[aria-label="More options"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}${name}-more.png` });
  await p.keyboard.press('Escape');
  // leave and come back: progress must be kept
  const before = await p.evaluate(() => window.__table.puzzle.groups.size);
  await p.click('[aria-label="Save and leave"]');
  await p.waitForSelector('main.pack'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}${name}-pack-progress.png` });
  await p.click('[aria-label="Back"]');
  await p.waitForSelector('.home'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}${name}-home-continue.png` });
  await p.click('.cont >> nth=0');
  await p.waitForFunction(() => !document.querySelector('.loading') && window.__table, null, { timeout: 60000 });
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => window.__table.puzzle.groups.size);
  console.log(name, 'groups before leaving', before, 'after returning', after);
  await solve(p);
  // drop the last piece by hand
  const last = await p.evaluate(() => { const t = window.__table, pz = t.puzzle, cam = t.cam, g = pz.group(0); if (g.tray) { pz.takeFromTray(g); const v = t['views'].get(g.id); v.c.visible = true; pz.moveCentreTo(g, 0, pz.BW * 0.5, -pz.s); t['syncView'](v); t['layoutTray'](); } const c = pz.pieceCentre(0); return { from: [c[0] * cam.k + cam.x, c[1] * cam.k + cam.y], to: [(pz.cw * 0.5 + 4) * cam.k + cam.x, (pz.ch * 0.5 + 3) * cam.k + cam.y] }; });
  await p.mouse.move(...last.from); await p.mouse.down(); await p.mouse.move(...last.to, { steps: 10 }); await p.mouse.up();
  await p.waitForSelector('.done-card', { timeout: 15000 });
  await p.waitForTimeout(2400);
  await p.screenshot({ path: `${out}${name}-complete.png` });
  await p.click('.done-card button:has-text("Home")');
  await p.waitForSelector('.home');
  await p.click('[aria-label^="Profile"]'); await p.waitForSelector('.profile'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}${name}-profile.png`, fullPage: true });
  await p.goBack(); await p.waitForSelector('.home');
  await p.click('[aria-label="Settings"]'); await p.waitForSelector('.settings'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}${name}-settings.png`, fullPage: true });
  await p.close();
}
// dark mode home
const d = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' }); watch(d);
await d.goto(url); await d.waitForSelector('.home'); await d.waitForTimeout(1800);
await d.screenshot({ path: `${out}dark-home.png` });
console.log('errors', errs);
await b.close(); if (server) await server.close();
