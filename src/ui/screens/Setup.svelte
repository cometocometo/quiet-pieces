<script lang="ts">
  import { picture, pack as getPack } from '../../art/catalog';
  import { removeUserPicture } from '../../art/pictures';
  import { sfx, unlockAudio } from '../../audio/audio';
  import { chooseGrid, PIECE_COUNTS, type PieceStyle } from '../../engine/geometry';
  import { dailyPuzzle, formatTime } from '../../data/progress';
  import { app, go, saveFor, saveSettings, startPuzzle } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Thumb from '../components/Thumb.svelte';
  import Toggle from '../components/Toggle.svelte';

  let pic = $derived(app.setup ? picture(app.setup.pictureId) : undefined);
  let isDaily = $derived(!!app.setup?.daily);
  let save = $derived(app.setup ? saveFor(app.setup.pictureId, app.setup.daily) : undefined);
  let pieces = $state(app.settings.pieces);
  let rotation = $state(app.settings.rotation);
  let style = $state<PieceStyle>(app.settings.style);

  const LEVELS: [number, string][] = [[24, 'Relaxed'], [80, 'Easy'], [200, 'Classic'], [500, 'Challenging'], [Infinity, 'Expert']];
  const level = (n: number) => LEVELS.find(([m]) => n <= m)![1];
  // rough minutes for an average player
  const estimate = (n: number) => { const m = Math.round(Math.pow(n, 1.18) * 0.09 * (rotation ? 1.5 : 1)); return m < 60 ? `about ${Math.max(2, m)} min` : `about ${(m / 60).toFixed(1).replace('.0', '')} h`; };
  let actual = $derived(pic ? (isDaily ? dailyPuzzle(app.setup!.daily, app.profile.completed).pieces : (() => { const g = chooseGrid(pieces, pic.aspect); return g.cols * g.rows; })()) : 0);
  let best = $derived(pic ? app.profile.best[`${pic.id}@${actual}${rotation ? 'r' : ''}`] : undefined);

  async function start() {
    if (!pic) return;
    unlockAudio(); sfx.tap();
    if (isDaily) {
      const d = dailyPuzzle(app.setup!.daily, app.profile.completed);
      await startPuzzle({ pictureId: pic.id, pieces: d.pieces, rotation: false, style: 'classic', daily: { date: d.date, seed: d.seed, cols: d.cols, rows: d.rows } });
      return;
    }
    Object.assign(app.settings, { pieces, rotation, style });
    void saveSettings();
    await startPuzzle({ pictureId: pic.id, pieces, rotation, style });
  }
  function resume() { if (save) { unlockAudio(); sfx.tap(); go({ name: 'play', save: save.id }); } }
  async function removeMine() {
    if (!pic || !confirm('Remove this picture from your collection?')) return;
    await removeUserPicture(pic.id);
    app.setup = null;
  }
</script>

<Sheet open={!!pic} onclose={() => (app.setup = null)} label="Start a puzzle" wide>
  {#if pic}
    <div class="setup">
      <div class="preview"><Thumb id={pic.id} alt={pic.title} radius={16} size="card" /></div>
      <div class="info">
        <p class="eyebrow">{isDaily ? 'Daily puzzle' : (getPack(pic.pack)?.title ?? 'Your picture')}</p>
        <h2>{pic.title}</h2>
        {#if best}<p class="best"><Icon name="trophy" size={15} /> Best: {formatTime(best)}</p>{/if}
        {#if pic.credit}<p class="credit">{#if pic.source}<a href={pic.source} target="_blank" rel="noopener">{pic.credit}</a>{:else}{pic.credit}{/if}</p>{/if}
      </div>

      {#if !isDaily}
        <div class="field">
          <div class="field-head"><span class="label">Pieces</span><span class="muted">{actual} · {level(actual)} · {estimate(actual)}</span></div>
          <div class="counts" role="radiogroup" aria-label="Number of pieces">
            {#each PIECE_COUNTS as n}
              <button role="radio" aria-checked={pieces === n} class:on={pieces === n} onclick={() => { pieces = n; sfx.tap(); }}>{n}</button>
            {/each}
          </div>
        </div>
        <div class="field">
          <span class="label">Piece shape</span>
          <div class="seg" role="radiogroup" aria-label="Piece shape">
            {#each [['classic', 'Classic'], ['organic', 'Organic'], ['square', 'Squares']] as [v, l]}
              <button role="radio" aria-checked={style === v} class:on={style === v} onclick={() => { style = v as PieceStyle; sfx.tap(); }}>
                <svg viewBox="0 0 40 40" aria-hidden="true"><path d={v === 'square' ? 'M8 8h24v24H8z' : v === 'organic' ? 'M8 8h9c-3 -6 9 -6 6 0h9v9c6 -3 6 9 0 6v9h-9c3 6 -9 6 -6 0H8v-9c-6 3 -6 -9 0 -6z' : 'M8 8h9c-2 -5 8 -5 6 0h9v9c5 -2 5 8 0 6v9h-9c2 5 -8 5 -6 0H8v-9c-5 2 -5 -8 0 -6z'} /></svg>
                {l}
              </button>
            {/each}
          </div>
        </div>
        <Toggle bind:checked={rotation} label="Rotate pieces" hint="Pieces start turned. Tap a piece to turn it." />
      {:else}
        <p class="muted daily-note">Everyone gets the same picture and cut today. Finish it to keep your streak going.</p>
      {/if}

      <div class="go">
        {#if save}
          <button class="btn primary block" onclick={resume}><Icon name="play" /> Continue · {Math.round(save.progress * 100)}%</button>
          <button class="btn block" onclick={start}>Start over</button>
        {:else}
          <button class="btn primary block" onclick={start}><Icon name="play" /> Start puzzle</button>
        {/if}
        {#if pic.id.startsWith('mine/')}<button class="btn ghost small" onclick={removeMine}><Icon name="trash" /> Remove picture</button>{/if}
      </div>
    </div>
  {/if}
</Sheet>

<style>
  .setup { display: grid; gap: 16px; }
  .preview { aspect-ratio: 3 / 2; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-2); margin-top: 26px; }
  .info h2 { font-size: 28px; line-height: 1.1; margin-top: 4px; }
  .best { display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 0; color: var(--gold); font-weight: 650; font-size: 14px; }
  .credit { margin: 4px 0 0; font-size: 12.5px; color: var(--ink-3); }
  .credit a { color: inherit; }
  .field { display: grid; gap: 10px; }
  .field-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .field-head .muted { font-size: 13.5px; }
  .label { font-weight: 600; }
  .counts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .counts button, .seg button { height: 42px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--bg); font-weight: 650; font-variant-numeric: tabular-nums; transition: all .15s var(--ease); }
  .counts button.on, .seg button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .seg button { height: 56px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .seg svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linejoin: round; }
  .go { display: grid; gap: 10px; margin-top: 4px; }
  .daily-note { margin: 0; }
</style>
