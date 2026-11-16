<script lang="ts">
  /**
   * Marketing hero: a photograph cut into real jigsaw pieces that fly in and
   * click together, then the seams fade to reveal the finished picture.
   */
  import { onMount } from 'svelte';
  import { loadPicture } from '../../art/pictures';
  import { cutPuzzle, piecePath, tracePath } from '../../engine/geometry';
  import { mulberry32 } from '../../engine/rng';

  let { id, cols = 6, rows = 4 }: { id: string; cols?: number; rows?: number } = $props();
  let canvas: HTMLCanvasElement;
  let ready = $state(false);

  onMount(() => {
    let raf = 0, alive = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    (async () => {
      const img = (await loadPicture(id, 'card')) as ImageBitmap;
      if (!alive) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const c = canvas.getContext('2d')!;
      c.scale(dpr, dpr);
      // board fills the canvas with a margin for pieces flying in
      const m = Math.min(W, H) * 0.06;
      const BW = W - 2 * m, BH = H - 2 * m;
      const cw = BW / cols, ch = BH / rows, s = Math.min(cw, ch), pad = s * 0.36;
      const cut = cutPuzzle(cols, rows, cw, ch, 7);
      const rnd = mulberry32(3);
      // cover-crop the photo onto the board
      const a = img.width / img.height, b = BW / BH;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (a > b) { sw = sh * b; sx = (img.width - sw) / 2; } else { sh = sw / b; sy = (img.height - sh) / 2; }
      const k = sw / BW;
      const pieces = Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const path = new Path2D(); tracePath(path, piecePath(cut, col, row));
        // sprite with bevel
        const sp = document.createElement('canvas');
        sp.width = Math.ceil((cw + 2 * pad) * dpr); sp.height = Math.ceil((ch + 2 * pad) * dpr);
        const g = sp.getContext('2d')!;
        g.scale(dpr, dpr); g.translate(pad, pad);
        g.save(); g.clip(path);
        g.drawImage(img, sx + (col * cw - pad) * k, sy + (row * ch - pad) * k, (cw + 2 * pad) * k, (ch + 2 * pad) * k, -pad, -pad, cw + 2 * pad, ch + 2 * pad);
        const o = s * 0.016;
        g.lineWidth = o * 2; g.translate(o, o); g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke(path);
        g.translate(-2 * o, -2 * o); g.strokeStyle = 'rgba(0,0,0,.3)'; g.stroke(path);
        g.restore();
        g.lineWidth = 0.8; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(path);
        // start somewhere off to the side, turned a little
        const ang = rnd() * Math.PI * 2, dist = Math.max(W, H) * (0.55 + rnd() * 0.35);
        return {
          sp, col, row,
          x0: Math.cos(ang) * dist, y0: Math.sin(ang) * dist, r0: (rnd() - 0.5) * 1.2,
          delay: 250 + (col + row * 0.6 + rnd() * 2.5) * 110,
        };
      });
      const dur = 900, t0 = performance.now();
      const total = Math.max(...pieces.map((p) => p.delay)) + dur;
      const ease = (t: number) => 1 - Math.pow(1 - t, 4);
      ready = true;
      const frame = (now: number) => {
        const t = reduce ? total + 2000 : now - t0;
        c.clearRect(0, 0, W, H);
        const done = t > total;
        if (!done) {
          for (const p of pieces) {
            const u = Math.max(0, Math.min(1, (t - p.delay) / dur));
            const e = ease(u);
            const x = m + p.col * cw - pad + p.x0 * (1 - e), y = m + p.row * ch - pad + p.y0 * (1 - e);
            c.save();
            c.translate(x + cw / 2 + pad, y + ch / 2 + pad); c.rotate(p.r0 * (1 - e)); c.translate(-(cw / 2 + pad), -(ch / 2 + pad));
            c.globalAlpha = Math.min(1, u * 3);
            if (u < 1) { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14 * (1 - e) + 3; c.shadowOffsetY = 8 * (1 - e) + 1; }
            c.drawImage(p.sp, 0, 0, cw + 2 * pad, ch + 2 * pad);
            c.restore();
          }
        } else {
          // finished: the seams melt away into the photograph, then a soft sheen passes over
          const f = Math.min(1, (t - total) / 900);
          for (const p of pieces) c.drawImage(p.sp, m + p.col * cw - pad, m + p.row * ch - pad, cw + 2 * pad, ch + 2 * pad);
          c.globalAlpha = f;
          c.drawImage(img, sx, sy, sw, sh, m, m, BW, BH);
          c.globalAlpha = 1;
          const st = (t - total - 300) / 1400;
          if (st > 0 && st < 1) {
            const x = m - BW * 0.4 + st * BW * 1.8;
            const gr = c.createLinearGradient(x - BW * 0.2, 0, x + BW * 0.2, BH * 0.4);
            gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            c.save(); c.beginPath(); c.rect(m, m, BW, BH); c.clip(); c.fillStyle = gr; c.fillRect(m, m, BW, BH); c.restore();
          }
          if (t - total > 1800 || reduce) return; // stop animating once settled
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })().catch(() => {});
    return () => { alive = false; cancelAnimationFrame(raf); };
  });
</script>

<canvas bind:this={canvas} class:ready aria-hidden="true"></canvas>

<style>
  canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity .4s; }
  canvas.ready { opacity: 1; }
</style>
