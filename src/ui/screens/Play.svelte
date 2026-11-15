<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
  import { pack as getPack, picture } from '../../art/catalog';
  import { buildSheets, loadPicture } from '../../art/pictures';
  import { music, sfx, unlockAudio } from '../../audio/audio';
  import { SURFACES } from '../../engine/backgrounds';
  import { Puzzle } from '../../engine/puzzle';
  import { PlayTable } from '../../engine/table';
  import { deleteSave, getSave, putSave, type SaveRecord } from '../../data/db';
  import { formatTime, levelOf, recordCompletion, titleFor, type CompletionResult } from '../../data/progress';
  import { track } from '../../data/analytics';
  import { app, back, go, refreshSaves, saveProfile, saveSettings, toast } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';
  import Thumb from '../components/Thumb.svelte';

  let { saveId }: { saveId: string } = $props();

  let host: HTMLDivElement;
  let hud = $state<HTMLElement>();
  let table: PlayTable | null = null;
  let rec: SaveRecord | undefined;
  let dailyDate = $state<string | undefined>();
  let loading = $state(true);
  let failed = $state(false);
  let title = $state('');
  let pictureId = $state('');
  let progress = $state(0);
  let elapsed = $state(0);
  let ghost = $state(false);
  let edges = $state(false);
  let menu = $state<null | 'sort' | 'more'>(null);
  let hints = $state(0);
  let rotation = $state(false);
  let usingTray = $state(false);
  let done = $state(false);
  let result = $state<CompletionResult | null>(null);
  let showCard = $state(false);
  let stats = $state({ pieces: 0, ms: 0, moves: 0, hints: 0 });
  let xpShown = $state(0);
  let intro = $state(!app.settings.seenIntro);
  let saveTimer = 0;

  const useTray = () => app.settings.tray === 'on' || (app.settings.tray === 'auto' && matchMedia('(pointer: coarse)').matches && innerWidth < 900);

  onMount(() => {
    let alive = true;
    (async () => {
      rec = await getSave(saveId);
      if (!rec) { go({ name: 'home' }, true); return; }
      dailyDate = rec.daily;
      const pic = picture(rec.pictureId);
      if (!pic) { failed = true; return; }
      title = pic.title; pictureId = pic.id;
      const puzzle = Puzzle.deserialize(rec.data);
      rotation = puzzle.spec.rotation;
      hints = puzzle.hints;
      elapsed = puzzle.elapsed;
      usingTray = useTray();
      try {
        const src = await loadPicture(pic.id, 'full');
        if (!alive) return;
        table = await PlayTable.create(host, puzzle, src, {
          surface: app.settings.surface, outline: app.settings.outline, reduceMotion: app.settings.reduceMotion, tray: usingTray,
        }, {
          progress: (p) => { progress = p.progress; },
          changed: scheduleSave,
          firstMove: () => { unlockAudio(); music.want(app.settings.music > 0); },
          complete: onComplete,
          hintUsed: () => { hints = puzzle.hints; },
        }, buildSheets);
        if (!alive) { table.destroy(); return; }
        if (import.meta.env.DEV || location.search.includes('e2e')) (window as unknown as { __table: PlayTable }).__table = table;
        if (puzzle.elapsed > 0 || puzzle.moves > 0) table.markStarted();
        table.setInsets({ top: (hud?.offsetHeight ?? 64) + 4 });
        loading = false;
      } catch (e) {
        console.error(e);
        failed = true;
      }
    })();
    const clock = setInterval(() => { if (table) elapsed = table.puzzle.elapsed; }, 500);
    const onHide = () => { if (document.hidden) void persist(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      alive = false;
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onHide);
      void persist().then(() => { table?.destroy(); table = null; });
      music.stop();
    };
  });

  function scheduleSave() { clearTimeout(saveTimer); saveTimer = window.setTimeout(persist, 700); }
  async function persist() {
    clearTimeout(saveTimer);
    if (!table || !rec || done) return;
    rec.data = table.puzzle.serialize();
    rec.progress = table.puzzle.progress;
    rec.updatedAt = Date.now();
    await putSave({ ...rec });
  }

  async function onComplete() {
    if (!table || !rec) return;
    done = true;
    menu = null;
    const p = table.puzzle;
    stats = { pieces: p.N, ms: p.elapsed, moves: p.moves, hints: p.hints };
    result = recordCompletion(app.profile, { pictureId: rec.pictureId, pieces: p.N, rotation: p.spec.rotation, hints: p.hints, ms: p.elapsed, daily: rec.daily });
    track('puzzle_complete', { picture: rec.pictureId, pieces: p.N, ms: p.elapsed, hints: p.hints });
    await Promise.all([saveProfile(), deleteSave(rec.id)]);
    await refreshSaves();
    showCard = true;
    // count the experience up
    const target = result.xpGained, t0 = performance.now();
    const step = () => { const t = Math.min(1, (performance.now() - t0) / 1200); xpShown = Math.round(target * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(step); };
    setTimeout(() => requestAnimationFrame(step), 400);
    if (result.levelAfter > result.levelBefore) setTimeout(() => sfx.levelUp(), 1500);
  }

  function nextPicture(): string | null {
    const pk = getPack(picture(pictureId)?.pack ?? '');
    if (!pk) return null;
    const i = pk.pictures.findIndex((x) => x.id === pictureId);
    const order = [...pk.pictures.slice(i + 1), ...pk.pictures.slice(0, i)];
    return (order.find((x) => !app.profile.done[x.id]) ?? order[0])?.id ?? null;
  }
  function playNext() {
    const id = nextPicture();
    if (!id) { go({ name: 'home' }); return; }
    const pk = picture(id)!.pack;
    go({ name: 'pack', id: pk }, true);
    app.setup = { pictureId: id };
  }
  async function share() {
    const blob = await table?.snapshot();
    const text = `I finished “${title}” (${stats.pieces} pieces) in ${formatTime(stats.ms)} on Quiet Pieces.`;
    try {
      const file = blob ? new File([blob], 'quiet-pieces.jpg', { type: 'image/jpeg' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    } catch { /* cancelled */ }
  }

  function toggle(kind: 'ghost' | 'edges') {
    sfx.tap();
    if (kind === 'ghost') { ghost = !ghost; table?.setGhost(ghost); }
    else { edges = !edges; table?.setEdgesOnly(edges); }
  }
  function sort(mode: 'tidy' | 'colour' | 'scatter') {
    menu = null; sfx.tap();
    if (mode === 'tidy') table?.tidy(); else if (mode === 'colour') table?.sortColour(); else table?.scatter();
  }
  function setSurface(id: string) { app.settings.surface = id; table?.setSurface(id); void saveSettings(); }
  function toggleMusic() {
    app.settings.music = app.settings.music > 0 ? 0 : 0.4;
    void saveSettings();
    music.want(app.settings.music > 0);
  }
  function closeIntro() { intro = false; app.settings.seenIntro = true; void saveSettings(); }
  async function leave() { await persist(); back(); }

  let lvl = $derived(levelOf(app.profile.xp));
  const pct = (v: number) => `${Math.floor(v * 100)}%`;
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && menu) menu = null; else if (e.key === 'h' && !done) table?.hint(); else if (e.key === 'p' && !done) toggle('ghost'); else if (e.key === 'e' && !done) toggle('edges'); }} />

<div class="play">
  <div class="host" bind:this={host}></div>

  <header class="hud" bind:this={hud}>
    <button class="icon-btn" onclick={leave} aria-label="Save and leave"><Icon name="back" /></button>
    <div class="status">
      <span class="t">{title}</span>
      <span class="s">
        <span class="pbar"><span style:width={pct(progress)}></span></span>
        {pct(progress)}{#if app.settings.showTimer}<span class="dot">·</span><span class="time">{formatTime(elapsed)}</span>{/if}
      </span>
    </div>
    {#if !done}
      <div class="tools" role="toolbar" aria-label="Puzzle tools">
        <button class="icon-btn" aria-pressed={ghost} onclick={() => toggle('ghost')} title="Show the picture on the board (P)" aria-label="Show picture"><Icon name="eye" /></button>
        <button class="icon-btn" aria-pressed={edges} onclick={() => toggle('edges')} title="Show only edge pieces (E)" aria-label="Edge pieces only"><Icon name="edges" /></button>
        <div class="pop-wrap">
          <button class="icon-btn" aria-expanded={menu === 'sort'} onclick={() => (menu = menu === 'sort' ? null : 'sort')} title="Sort pieces" aria-label="Sort pieces"><Icon name="sort" /></button>
          {#if menu === 'sort'}
            <div class="pop" transition:fly={{ y: -6, duration: 160 }} role="menu">
              <button role="menuitem" onclick={() => sort('tidy')}><Icon name="grid" /> <span><b>Edges first</b><small>Edge pieces closest to the board</small></span></button>
              <button role="menuitem" onclick={() => sort('colour')}><Icon name="palette" /> <span><b>By colour</b><small>Group similar colours together</small></span></button>
              {#if !usingTray}<button role="menuitem" onclick={() => sort('scatter')}><Icon name="shuffle" /> <span><b>Scatter</b><small>Spread the loose pieces out again</small></span></button>{/if}
            </div>
          {/if}
        </div>
        <button class="icon-btn hint" onclick={() => { table?.hint(); }} title="Hint (H). Ask twice to place the piece." aria-label="Hint">
          <Icon name="bulb" />{#if hints}<span class="count">{hints}</span>{/if}
        </button>
        <div class="pop-wrap">
          <button class="icon-btn" aria-expanded={menu === 'more'} onclick={() => (menu = menu === 'more' ? null : 'more')} aria-label="More options"><Icon name="more" /></button>
          {#if menu === 'more'}
            <div class="pop wide" transition:fly={{ y: -6, duration: 160 }}>
              <p class="eyebrow">Table</p>
              <div class="swatches">
                {#each SURFACES as s}
                  <button class="sw" class:on={app.settings.surface === s.id} style:background={s.base} onclick={() => setSurface(s.id)} aria-label={s.name} title={s.name}></button>
                {/each}
              </div>
              <button role="menuitem" onclick={() => { table?.fit(true); menu = null; }}><Icon name="fit" /> <span><b>Fit to screen</b><small>Or double-tap the table</small></span></button>
              <button role="menuitem" onclick={toggleMusic}><Icon name={app.settings.music > 0 ? 'sound' : 'mute'} /> <span><b>Music {app.settings.music > 0 ? 'on' : 'off'}</b><small>Calm generative music</small></span></button>
              {#if rotation}<p class="tip">Tap a piece to turn it. With a mouse, right-click or scroll while dragging.</p>{/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </header>

  {#if loading && !failed}
    <div class="loading" out:fade={{ duration: 300 }}>
      {#if pictureId}<div class="lp"><Thumb id={pictureId} radius={14} /></div>{/if}
      <div class="spinner" aria-hidden="true"></div>
      <p>Cutting the pieces…</p>
    </div>
  {/if}
  {#if failed}
    <div class="loading"><p>This puzzle couldn’t be opened.</p><button class="btn" onclick={() => go({ name: 'home' }, true)}>Back home</button></div>
  {/if}

  {#if intro && !loading && !done}
    <div class="intro" transition:fly={{ y: 20, duration: 300 }} role="dialog" aria-label="How to play">
      <h3>How to play</h3>
      <ul>
        <li><Icon name="puzzle" /> {usingTray ? 'Drag pieces up from the tray onto the table.' : 'Drag pieces together. They click into place.'}</li>
        <li><Icon name="fit" /> {matchMedia('(pointer: coarse)').matches ? 'Pinch to zoom, drag the table to look around.' : 'Scroll to zoom, drag the table to look around.'}</li>
        <li><Icon name="bulb" /> Stuck? Ask for a hint. Ask again to have it placed.</li>
      </ul>
      <button class="btn primary block" onclick={closeIntro}>Got it</button>
    </div>
  {/if}

  {#if showCard && result}
    <div class="done-backdrop" transition:fade={{ duration: 300 }}></div>
    <div class="done-card" role="dialog" aria-label="Puzzle complete" in:scale={{ start: 0.85, duration: 450, easing: backOut }} out:fade={{ duration: 150 }}>
      <p class="eyebrow accent">Puzzle complete</p>
      <h2>{title}</h2>
      {#if result.newBest}<p class="best"><Icon name="trophy" size={16} /> New best time!</p>{/if}
      <div class="stats">
        <div><b>{formatTime(stats.ms)}</b><span>time</span></div>
        <div><b>{stats.pieces}</b><span>pieces</span></div>
        <div><b>{stats.moves}</b><span>moves</span></div>
        <div><b>{stats.hints}</b><span>hints</span></div>
      </div>
      <div class="xp">
        <div class="xp-head"><span>Level {lvl.level} · {titleFor(lvl.level)}</span><b>+{xpShown} XP</b></div>
        <div class="xp-bar"><span style:width="{(lvl.into / lvl.need) * 100}%"></span></div>
        {#if result.levelAfter > result.levelBefore}<p class="lvlup" in:fly={{ y: 8, delay: 1400 }}>Level up! You’re now level {result.levelAfter}.</p>{/if}
      </div>
      {#if result.streak > 0 && dailyDate}<p class="streak"><Icon name="flame" fill size={16} /> {result.streak}-day streak</p>{/if}
      {#if result.newAchievements.length}
        <div class="ach">
          {#each result.newAchievements as a, i}
            <div class="ach-item" in:fly={{ y: 10, delay: 900 + i * 180, easing: cubicOut }}><span class="ai">{a.icon}</span><span><b>{a.title}</b><small>{a.text}</small></span></div>
          {/each}
        </div>
      {/if}
      <div class="actions">
        <button class="btn primary block" onclick={playNext}><Icon name="play" /> Next puzzle</button>
        <div class="row">
          <button class="btn" onclick={share}><Icon name="share" /> Share</button>
          <button class="btn" onclick={() => (showCard = false)}><Icon name="image" /> Admire</button>
          <button class="btn" onclick={() => go({ name: 'home' }, true)}>Home</button>
        </div>
      </div>
    </div>
  {/if}
  {#if done && !showCard && result}
    <button class="btn primary floating" onclick={() => (showCard = true)} transition:fade>Continue</button>
  {/if}
</div>

<style>
  .play { position: fixed; inset: 0; overflow: hidden; background: var(--bg-2); user-select: none; -webkit-user-select: none; }
  .host { position: absolute; inset: 0; }
  .hud {
    position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; gap: 10px;
    padding: calc(10px + var(--safe-top)) 12px 10px; pointer-events: none;
  }
  .hud > * { pointer-events: auto; }
  .status {
    display: flex; flex-direction: column; min-width: 0; padding: 6px 14px; border-radius: 16px;
    background: var(--glass); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid var(--line);
    margin-right: auto; max-width: 46vw;
  }
  .t { font-family: var(--display); font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .s { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 650; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .pbar { width: 48px; height: 4px; border-radius: 4px; background: var(--line-2); overflow: hidden; }
  .pbar span { display: block; height: 100%; background: var(--accent); transition: width .5s var(--ease); }
  .dot { opacity: .5; }
  .tools { display: flex; gap: 8px; }
  @media (max-width: 520px) { .tools { gap: 5px; } .tools :global(.icon-btn) { width: 38px; height: 38px; } .status { max-width: 34vw; padding: 5px 10px; } .t { font-size: 13.5px; } .pbar { display: none; } }
  .hint { position: relative; }
  .count { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; padding: 0 4px; }
  .pop-wrap { position: relative; }
  .pop {
    position: absolute; right: 0; top: calc(100% + 8px); width: 270px; padding: 8px; border-radius: 18px; background: var(--card);
    box-shadow: var(--shadow-3); border: 1px solid var(--line); display: grid; gap: 2px; z-index: 20;
  }
  .pop.wide { width: 300px; padding: 14px 8px 8px; }
  .pop button[role='menuitem'] { display: flex; align-items: center; gap: 12px; text-align: left; padding: 10px; border: none; background: none; border-radius: 12px; }
  .pop button[role='menuitem']:hover { background: var(--bg-2); }
  .pop span { display: flex; flex-direction: column; }
  .pop small { color: var(--ink-3); font-size: 12.5px; }
  .pop .eyebrow { margin: 0 8px 8px; }
  .swatches { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; padding: 0 8px 10px; border-bottom: 1px solid var(--line); margin-bottom: 4px; }
  .sw { aspect-ratio: 1; border-radius: 50%; border: 2px solid var(--line-2); padding: 0; }
  .sw.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--card) inset; }
  .tip { margin: 6px 10px 4px; font-size: 12.5px; color: var(--ink-3); }

  .loading { position: absolute; inset: 0; z-index: 30; display: grid; place-content: center; justify-items: center; gap: 16px; background: var(--bg); color: var(--ink-2); }
  .lp { width: min(320px, 70vw); aspect-ratio: 3 / 2; border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-2); animation: breathe 1.6s ease-in-out infinite; }
  .spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--line-2); border-top-color: var(--accent); animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes breathe { 50% { transform: scale(0.98); opacity: .85; } }

  .intro {
    position: absolute; z-index: 25; left: 50%; bottom: calc(24px + var(--safe-bottom)); transform: translateX(-50%); width: min(380px, calc(100vw - 24px));
    background: var(--card); border-radius: 22px; box-shadow: var(--shadow-3); padding: 20px; border: 1px solid var(--line);
  }
  .intro h3 { font-size: 22px; }
  .intro ul { list-style: none; padding: 0; margin: 12px 0 16px; display: grid; gap: 10px; }
  .intro li { display: flex; gap: 12px; align-items: center; color: var(--ink-2); }
  .intro li :global(svg) { flex: none; color: var(--accent); }

  .done-backdrop { position: absolute; inset: 0; z-index: 40; background: rgba(18, 15, 12, 0.35); }
  .done-card {
    position: absolute; z-index: 41; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto;
    background: var(--card); border-radius: 28px; box-shadow: var(--shadow-3); padding: 26px 24px 22px; text-align: center;
  }
  .accent { color: var(--accent); }
  .done-card h2 { font-size: 30px; line-height: 1.1; margin: 6px 0 4px; }
  .best { display: inline-flex; gap: 6px; align-items: center; color: var(--gold); font-weight: 700; margin: 4px 0 0; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 18px 0; }
  .stats div { display: flex; flex-direction: column; padding: 10px 4px; border-radius: 14px; background: var(--bg-2); }
  .stats b { font-size: 18px; font-variant-numeric: tabular-nums; }
  .stats span { font-size: 12px; color: var(--ink-3); }
  .xp { text-align: left; }
  .xp-head { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }
  .xp-head b { color: var(--accent); font-variant-numeric: tabular-nums; }
  .xp-bar { height: 8px; border-radius: 8px; background: var(--line); overflow: hidden; }
  .xp-bar span { display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, var(--accent), var(--gold)); transition: width 1.2s var(--ease) .4s; }
  .lvlup { margin: 8px 0 0; font-weight: 700; color: var(--gold); text-align: center; }
  .streak { display: inline-flex; gap: 6px; align-items: center; margin: 12px 0 0; color: #e8792f; font-weight: 700; }
  .ach { display: grid; gap: 8px; margin-top: 16px; text-align: left; }
  .ach-item { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 14px; background: var(--accent-soft); }
  .ach-item span:last-child { display: flex; flex-direction: column; }
  .ach-item small { color: var(--ink-2); }
  .ai { font-size: 24px; }
  .actions { display: grid; gap: 10px; margin-top: 20px; }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .row .btn { padding: 0 8px; font-size: 14px; }
  .floating { position: absolute; z-index: 30; left: 50%; bottom: calc(28px + var(--safe-bottom)); transform: translateX(-50%); }
</style>
