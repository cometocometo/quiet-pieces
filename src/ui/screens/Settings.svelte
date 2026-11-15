<script lang="ts">
  import { SURFACES } from '../../engine/backgrounds';
  import { allPictures } from '../../art/catalog';
  import { sfx, music } from '../../audio/audio';
  import { clearAll } from '../../data/db';
  import { app, back, saveSettings } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';
  import Toggle from '../components/Toggle.svelte';

  const save = () => void saveSettings();
  function vol(kind: 'music' | 'sfx', v: number) {
    app.settings[kind] = v; save();
    if (kind === 'sfx') sfx.tap(); else music.want(v > 0);
  }
  async function reset() {
    if (!confirm('Erase all progress, saved puzzles and your pictures on this device? This cannot be undone.')) return;
    await clearAll();
    location.hash = '#/';
    location.reload();
  }
</script>

<main class="settings">
  <header class="top"><button class="icon-btn" onclick={back} aria-label="Back"><Icon name="back" /></button></header>
  <h1>Settings</h1>

  <section>
    <h2>Sound</h2>
    <label class="slider"><span><Icon name="sound" /> Music</span>
      <input type="range" min="0" max="1" step="0.05" value={app.settings.music} oninput={(e) => vol('music', +(e.target as HTMLInputElement).value)} aria-label="Music volume" /></label>
    <label class="slider"><span><Icon name="puzzle" /> Effects</span>
      <input type="range" min="0" max="1" step="0.05" value={app.settings.sfx} oninput={(e) => vol('sfx', +(e.target as HTMLInputElement).value)} aria-label="Sound effects volume" /></label>
    <Toggle bind:checked={app.settings.haptics} label="Vibration" hint="A gentle buzz when pieces click together (phones)." onchange={save} />
  </section>

  <section>
    <h2>Appearance</h2>
    <div class="seg" role="radiogroup" aria-label="Theme">
      {#each [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']] as [v, l]}
        <button role="radio" aria-checked={app.settings.theme === v} class:on={app.settings.theme === v} onclick={() => { app.settings.theme = v as 'system'; save(); }}>{l}</button>
      {/each}
    </div>
    <p class="label">Table</p>
    <div class="surfaces">
      {#each SURFACES as s}
        <button class="surface" class:on={app.settings.surface === s.id} onclick={() => { app.settings.surface = s.id; save(); }}>
          <span class="sw" style:background={s.base}></span>{s.name}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Playing</h2>
    <p class="label">Piece tray</p>
    <div class="seg" role="radiogroup" aria-label="Piece tray">
      {#each [['auto', 'Automatic'], ['on', 'Always'], ['off', 'Never']] as [v, l]}
        <button role="radio" aria-checked={app.settings.tray === v} class:on={app.settings.tray === v} onclick={() => { app.settings.tray = v as 'auto'; save(); }}>{l}</button>
      {/each}
    </div>
    <p class="hint">The tray keeps loose pieces along the bottom of the screen. Automatic uses it on phones and tablets.</p>
    <Toggle bind:checked={app.settings.showTimer} label="Show timer" onchange={save} />
    <Toggle bind:checked={app.settings.outline} label="Clearer piece edges" hint="A bright outline around every piece. Applies to new games." onchange={save} />
    <Toggle bind:checked={app.settings.reduceMotion} label="Reduce motion" hint="Shorter animations, no confetti." onchange={save} />
  </section>

  <section>
    <h2>Photo credits</h2>
    <p class="hint">Photographs are used under Creative Commons licences. Thank you to the photographers.</p>
    <ul class="credits">
      {#each allPictures().filter((p) => p.credit) as p}
        <li><b>{p.title}</b> · {#if p.source}<a href={p.source} target="_blank" rel="noopener">{(p.credit ?? '').replace('Photo: ', '')}</a>{:else}{p.credit}{/if}</li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>About</h2>
    <p class="muted">Quiet Pieces is a calm jigsaw puzzle game. The illustrated pictures are drawn in code, the photographs are credited above, and everything you do stays on this device: no account, no ads, no tracking.</p>
    <p class="muted small">Version 1.0 · Built with PixiJS and Svelte.</p>
    <button class="btn danger" onclick={reset}><Icon name="trash" /> Erase all data</button>
  </section>
</main>

<style>
  .settings { max-width: 640px; margin: 0 auto; padding: calc(12px + var(--safe-top)) 20px calc(40px + var(--safe-bottom)); }
  .top { height: 56px; display: flex; align-items: center; }
  h1 { font-size: 40px; margin: 6px 0 10px; }
  section { margin-top: 18px; padding: 18px 20px; background: var(--card); border-radius: 22px; border: 1px solid var(--line); box-shadow: var(--shadow-1); }
  h2 { font-size: 20px; margin-bottom: 8px; }
  .slider { display: flex; align-items: center; gap: 14px; padding: 10px 0; }
  .slider span { display: flex; align-items: center; gap: 10px; width: 110px; font-weight: 550; }
  input[type='range'] { flex: 1; accent-color: var(--accent); height: 28px; }
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
  .seg button { height: 42px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--bg); font-weight: 600; }
  .seg button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .label { font-weight: 600; margin: 14px 0 4px; }
  .hint { font-size: 13px; color: var(--ink-3); margin: 4px 0 6px; }
  .surfaces { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-top: 8px; }
  .surface { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--bg); font-weight: 550; font-size: 14px; }
  .surface.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
  .sw { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line-2); flex: none; }
  .small { font-size: 13px; }
  .credits { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 6px; font-size: 13.5px; color: var(--ink-2); }
  .credits a { color: inherit; }
  .danger { color: #c0392b; margin-top: 8px; }
</style>
