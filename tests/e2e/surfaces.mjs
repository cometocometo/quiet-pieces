import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5193 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 620 } });
await p.goto('http://localhost:5193/art-preview.html');
await p.evaluate(async () => {
  const { surfaceCanvas, SURFACES } = await import('/src/engine/backgrounds.ts');
  document.body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px">' + SURFACES.map((s) => `<div style="height:300px;font:12px system-ui;color:#fff" id="s-${s.id}">${s.name}</div>`).join('') + '</div>';
  for (const s of SURFACES) { const c = surfaceCanvas(s.id); document.getElementById('s-' + s.id).style.background = `url(${c.toDataURL()}) 0 0 / 300px`; }
});
await p.screenshot({ path: 'tests/e2e/out/surfaces.png' });
await b.close(); await server.close();
