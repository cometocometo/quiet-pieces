<script lang="ts">
  import { pack as getPack } from '../../art/catalog';
  import { sfx } from '../../audio/audio';
  import { isUnlocked, MONETISATION } from '../../data/commerce';
  import { app, back, saveFor } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';
  import Thumb from '../components/Thumb.svelte';

  let { id }: { id: string } = $props();
  let p = $derived(getPack(id));
  let done = $derived(p ? p.pictures.filter((x) => app.profile.done[x.id]).length : 0);
  let locked = $derived(p ? MONETISATION && !isUnlocked(p) : false);
</script>

{#if p}
  <main class="pack" style:--accent-c={p.accent}>
    <header class="top">
      <button class="icon-btn" onclick={back} aria-label="Back"><Icon name="back" /></button>
    </header>
    <section class="hero">
      <p class="eyebrow">Collection · {p.pictures.length} pictures</p>
      <h1>{p.title}</h1>
      <p class="muted">{p.blurb}</p>
      <div class="progress" aria-label="{done} of {p.pictures.length} finished">
        <div class="bar"><span style:width="{(done / p.pictures.length) * 100}%"></span></div>
        <span>{done}/{p.pictures.length}</span>
      </div>
    </section>
    <div class="grid">
      {#each p.pictures as pic, i (pic.id)}
        {@const best = app.profile.done[pic.id]}
        {@const save = saveFor(pic.id)}
        <button class="pic" style:animation-delay="{i * 35}ms" disabled={locked}
          onclick={() => { sfx.tap(); app.setup = { pictureId: pic.id }; }}>
          <div class="art">
            <Thumb id={pic.id} alt={pic.title} />
            {#if best}<span class="done"><Icon name="check" size={14} /> {best}</span>{/if}
            {#if save}<span class="wip">{Math.round(save.progress * 100)}%</span>{/if}
          </div>
          <span class="title">{pic.title}</span>
        </button>
      {/each}
    </div>
  </main>
{/if}

<style>
  .pack { max-width: 1120px; margin: 0 auto; padding: calc(12px + var(--safe-top)) 20px calc(40px + var(--safe-bottom)); }
  .top { height: 56px; display: flex; align-items: center; }
  .hero { padding: 8px 0 22px; }
  .hero h1 { font-size: clamp(34px, 6vw, 52px); line-height: 1.05; margin: 6px 0 8px; }
  .hero p { margin: 0; }
  .progress { display: flex; align-items: center; gap: 12px; margin-top: 16px; max-width: 320px; font-weight: 650; font-size: 13.5px; color: var(--ink-2); }
  .bar { flex: 1; height: 6px; border-radius: 6px; background: var(--line); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--accent-c); border-radius: 6px; transition: width .6s var(--ease); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 20px 16px; }
  .pic { border: none; background: none; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 8px; animation: rise .5s var(--ease) both; }
  .art { position: relative; aspect-ratio: 3 / 2; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-1); transition: transform .25s var(--ease), box-shadow .25s; }
  .pic:hover .art { transform: translateY(-3px); box-shadow: var(--shadow-2); }
  .pic:active .art { transform: scale(.98); }
  .title { font-weight: 600; padding: 0 2px; }
  .done, .wip { position: absolute; top: 10px; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .done { left: 10px; background: rgba(255,255,255,.92); color: var(--good); }
  .wip { right: 10px; background: var(--accent); color: #fff; }
  @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
</style>
