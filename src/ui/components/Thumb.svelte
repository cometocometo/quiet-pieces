<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPicture } from '../../art/pictures';

  let { id, alt = '', radius = 14, size = 'thumb' }: { id: string; alt?: string; radius?: number; size?: 'thumb' | 'card' | 'full' } = $props();
  let canvas: HTMLCanvasElement;
  let wrap: HTMLDivElement;
  let loaded = $state(false);

  function draw(src: CanvasImageSource & { width: number; height: number }) {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200, dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d')!;
    // cover-fit
    const a = src.width / src.height, b = canvas.width / canvas.height;
    let sw = src.width, sh = src.height, sx = 0, sy = 0;
    if (a > b) { sw = sh * b; sx = (src.width - sw) / 2; } else { sh = sw / b; sy = (src.height - sh) / 2; }
    c.imageSmoothingQuality = 'high';
    c.drawImage(src, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    loaded = true;
  }

  onMount(() => {
    let alive = true;
    // only load when scrolled into view
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      loadPicture(id, size).then((src) => { if (alive) draw(src as ImageBitmap); }).catch(() => {});
    }, { rootMargin: '200px' });
    io.observe(wrap);
    return () => { alive = false; io.disconnect(); };
  });
</script>

<div class="thumb" bind:this={wrap} style:border-radius="{radius}px" role="img" aria-label={alt}>
  <canvas bind:this={canvas} class:loaded></canvas>
</div>

<style>
  .thumb { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(110deg, var(--bg-2) 30%, var(--line) 50%, var(--bg-2) 70%); background-size: 300% 100%; animation: shimmer 1.4s linear infinite; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.35s var(--ease); display: block; }
  canvas.loaded { opacity: 1; }
  @keyframes shimmer { to { background-position: -150% 0; } }
</style>
