import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Writes sw.js with the list of every built file, so the game can be precached for offline play. */
function serviceWorker(): Plugin {
  return {
    name: 'quiet-pieces-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = new Set<string>(['./', './index.html']);
      for (const name of Object.keys(bundle)) if (!name.endsWith('.map')) files.add('./' + name);
      const pub = 'public';
      const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.add('./' + relative(pub, p).replace(/\\/g, '/')); } };
      walk(pub);
      // only the Latin font subsets are precached; others load on demand
      // full-size photos are cached the first time they are played, not up front
      const list = [...files].filter((f) => !/-(cyrillic|greek|vietnamese)/.test(f) && !f.endsWith('og.png') && !/photos\/[^/]+\/\d+\.jpg$/.test(f));
      const version = Date.now().toString(36);
      const src = readFileSync('build/sw-template.js', 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `self.__PRECACHE__ = ${JSON.stringify(list)};\nself.__VERSION__ = '${version}';\n${src}` });
    },
  };
}

// The built game is published inside the website at /modern/jigsaw/.
// `base: './'` keeps every asset path relative so it works from any folder,
// and inside an app-store wrapper (Capacitor) later.
export default defineConfig({
  base: './',
  plugins: [svelte(), serviceWorker()],
  resolve: { alias: { $lib: new URL('./src', import.meta.url).pathname } },
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
