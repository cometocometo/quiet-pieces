// Builds the social share image (public/icons/og.png) from a photo, the icon and the headline.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const photo = 'data:image/jpeg;base64,' + readFileSync('public/photos/banff/01.jpg').toString('base64');
const icon = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<html><body style="margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:Georgia,serif">
<img src="${photo}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,20,28,.82) 0%,rgba(14,20,28,.55) 45%,rgba(14,20,28,0) 75%)"></div>
<div style="position:absolute;left:70px;top:70px;display:flex;align-items:center;gap:16px;color:#fff;font-size:34px;font-weight:600">${icon.replace('<svg ', '<svg width="64" height="64" ')}Quiet Pieces</div>
<div style="position:absolute;left:70px;top:205px;width:640px;color:#fff;font-size:66px;line-height:1.04;font-weight:600;letter-spacing:-1px">The world’s most beautiful places, <i style="color:#ffb59a;font-weight:500">one piece at a time.</i></div>
<div style="position:absolute;left:70px;bottom:62px;color:rgba(255,255,255,.9);font:600 26px system-ui">Free jigsaw puzzles · A new one every day · No ads</div>
</body></html>`);
await p.waitForTimeout(300);
await p.screenshot({ path: 'public/icons/og.png' });
await b.close();
