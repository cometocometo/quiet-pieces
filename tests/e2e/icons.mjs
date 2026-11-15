// Render the SVG app icon to the PNG sizes app stores and browsers need.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, pad] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-180', 180, 0], ['icon-maskable-512', 512, 0.12]]) {
  await p.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await p.setContent(`<html><body style="margin:0;background:${pad ? '#c8553d' : 'transparent'};display:grid;place-items:center;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: !pad });
}
// social preview card
await p.setViewportSize({ width: 1200, height: 630 });
await p.setContent(`<html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;background:linear-gradient(135deg,#f6f2eb,#efe2cf);font-family:Georgia,serif">${svg.replace('<svg ', '<svg width="300" height="300" ')}<div><div style="font-size:84px;font-weight:600;color:#23201c;letter-spacing:-2px">Quiet Pieces</div><div style="font:500 34px system-ui;color:#5d574f;margin-top:16px">Calm jigsaw puzzles.<br>A new picture every day.</div></div></body></html>`);
await p.screenshot({ path: 'public/icons/og.png' });
await b.close();
