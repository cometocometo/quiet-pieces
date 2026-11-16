<script lang="ts">
  import { packs, picture, userPictures } from '../../art/catalog';
  import { importUserPicture, prefetchThumbs } from '../../art/pictures';
  import { sfx } from '../../audio/audio';
  import { isUnlocked, MONETISATION } from '../../data/commerce';
  import { dailyPuzzle, formatTime, levelOf, streakAlive, titleFor, today } from '../../data/progress';
  import { app, go, saveFor, toast } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';
  import Thumb from '../components/Thumb.svelte';
  import HeroAssemble from '../components/HeroAssemble.svelte';
  import { install, promptInstall } from '../../app/install.svelte';
  import { onMount } from 'svelte';

  const date = today();
  const daily = dailyPuzzle(date, app.profile.completed);
  const dailyPic = picture(daily.pictureId)!;
  let dailyDone = $derived(app.profile.daily[date]);
  let dailySave = $derived(saveFor(daily.pictureId, date));
  let streak = $derived(streakAlive(app.profile, date));
  let lvl = $derived(levelOf(app.profile.xp));
  let inProgress = $derived(app.saves.filter((s) => !s.daily && picture(s.pictureId)).slice(0, 12));
  let mine = $derived([...userPictures.values()]);
  let fileInput: HTMLInputElement;
  /** First visit (or nothing played yet): show the full welcome. */
  let isNew = $derived(app.profile.completed === 0 && app.saves.length === 0);
  const pictureCount = packs.reduce((n, p) => n + p.pictures.length, 0);
  let showIosTip = $state(false);
  function scrollToCollections() { document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' }); }
  async function addToHome() {
    if (install.available) await promptInstall();
    else showIosTip = !showIosTip;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 5 ? 'Up late?' : h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
  })();
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  function openSetup(pictureId: string, dailyDate?: string) { sfx.tap(); app.setup = { pictureId, daily: dailyDate }; }
  function playDaily() {
    if (dailySave) { sfx.tap(); go({ name: 'play', save: dailySave.id }); return; }
    openSetup(daily.pictureId, date);
  }
  async function onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const pic = await importUserPicture(f);
      app.profile.usedOwnPhoto = true;
      openSetup(pic.id);
    } catch { toast('That file couldn’t be opened as a picture.'); }
    (e.target as HTMLInputElement).value = '';
  }
  const doneCount = (packId: string) => packs.find((p) => p.id === packId)!.pictures.filter((p) => app.profile.done[p.id]).length;
  const total = (packId: string) => packs.find((p) => p.id === packId)!.pictures.length;

  onMount(() => prefetchThumbs(packs.flatMap((p) => p.pictures.slice(0, 1).map((x) => x.id))));
</script>

<main class="home">
  <header class="top">
    <div class="brand">
      <span class="mark" aria-hidden="true"><Icon name="puzzle" size={18} /></span>
      <span class="word">Quiet Pieces</span>
    </div>
    <div class="actions">
      {#if !isNew}<button class="level" onclick={() => go({ name: 'profile' })} aria-label="Profile, level {lvl.level}">
        <svg viewBox="0 0 36 36" class="ring" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" class="bgc" />
          <circle cx="18" cy="18" r="15.5" class="fg" style:stroke-dasharray="{(lvl.into / lvl.need) * 97.4} 97.4" />
        </svg>
        <span>{lvl.level}</span>
      </button>{/if}
      <button class="icon-btn" onclick={() => go({ name: 'settings' })} aria-label="Settings"><Icon name="settings" /></button>
    </div>
  </header>

  {#if isNew}
    <section class="welcome">
      <div class="pitch">
        <p class="kicker"><span class="dot"></span> Free to play · No ads · No sign-up</p>
        <h1>The world’s most beautiful places, <em>one piece at a time.</em></h1>
        <p class="lede">Real photographs of Banff’s turquoise lakes, quiet coastlines and painted hill towns, cut into satisfying tab-and-blank pieces that click together. A fresh puzzle every day. Plays right here in your browser, even offline.</p>
        <div class="ctas">
          <button class="btn primary big" onclick={playDaily}><Icon name="play" /> Play today’s puzzle</button>
          <button class="btn big" onclick={scrollToCollections}>Browse {pictureCount} pictures</button>
        </div>
        <ul class="trust">
          <li><Icon name="check" size={16} /> {daily.pieces}-piece daily puzzle, about {Math.max(3, Math.round(daily.pieces / 9))} minutes</li>
          <li><Icon name="check" size={16} /> 12 to 1,000 pieces when you want a challenge</li>
          <li><Icon name="check" size={16} /> Your progress saves itself on this device</li>
        </ul>
      </div>
      <div class="showpiece">
        <div class="frame"><HeroAssemble id="banff/1" /></div>
        <span class="float f1"><Icon name="puzzle" size={15} /> Click!</span>
        <span class="float f2"><Icon name="flame" size={15} fill /> Daily streaks</span>
        <span class="caption">Moraine Lake, Banff · real photograph</span>
      </div>
    </section>

    <section class="features" aria-label="Why you’ll like it">
      <div><span class="fi"><Icon name="image" /></span><b>Real places, real photos</b><p>Turquoise Rockies lakes today, more destinations on the way, plus 110 hand-made illustrations.</p></div>
      <div><span class="fi"><Icon name="calendar" /></span><b>A new puzzle every day</b><p>Short and relaxing. Keep a streak going with friends.</p></div>
      <div><span class="fi"><Icon name="puzzle" /></span><b>Pieces that feel right</b><p>Classic tabs and blanks that snap together with a satisfying click.</p></div>
      <div><span class="fi"><Icon name="heart" /></span><b>Calm by design</b><p>No ads, no timers you can’t hide, gentle music. Just you and the picture.</p></div>
    </section>
  {:else}
    <section class="hello">
      <p class="eyebrow">{dateLabel}</p>
      <h1>{greeting}</h1>
      <p class="muted">{titleFor(lvl.level)} · {app.profile.completed} {app.profile.completed === 1 ? 'puzzle' : 'puzzles'} finished</p>
    </section>
  {/if}

  <!-- Daily puzzle -->
  <section class="daily" aria-label="Today's puzzle">
    <button class="daily-card" onclick={playDaily}>
      <div class="daily-art"><Thumb id={daily.pictureId} alt={dailyPic.title} radius={0} size="card" /></div>
      <div class="daily-shade"></div>
      <div class="daily-body">
        <div class="daily-tags">
          <span class="tag"><Icon name="calendar" size={14} /> Daily puzzle</span>
          {#if streak > 0}<span class="tag flame"><Icon name="flame" size={14} fill /> {streak}-day streak</span>{/if}
        </div>
        <h2>{dailyPic.title}</h2>
        <p>{daily.pieces} pieces · a new picture every day</p>
        <span class="btn {dailyDone ? '' : 'primary'} small play">
          {#if dailyDone}<Icon name="check" /> Done in {formatTime(dailyDone)}
          {:else if dailySave}<Icon name="play" /> Continue · {Math.round(dailySave.progress * 100)}%
          {:else}<Icon name="play" /> Play today’s puzzle{/if}
        </span>
      </div>
    </button>
  </section>

  {#if inProgress.length}
    <section>
      <div class="section-head"><h2>Continue</h2></div>
      <div class="scroll-x">
        {#each inProgress as s (s.id)}
          {@const pic = picture(s.pictureId)!}
          <button class="cont" onclick={() => { sfx.tap(); go({ name: 'play', save: s.id }); }}>
            <div class="cont-art"><Thumb id={s.pictureId} alt={pic.title} /></div>
            <div class="bar"><span style:width="{Math.max(3, s.progress * 100)}%"></span></div>
            <span class="cont-title">{pic.title}</span>
            <span class="cont-sub">{s.pieces} pieces · {Math.round(s.progress * 100)}%</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <section id="collections">
    <div class="section-head"><h2>Collections</h2><span class="muted">{packs.length} packs · {packs.reduce((n, p) => n + p.pictures.length, 0)} pictures</span></div>
    <div class="packs">
      {#each packs as p (p.id)}
        {@const n = doneCount(p.id)}
        <button class="pack" onclick={() => { sfx.tap(); go({ name: 'pack', id: p.id }); }} style:--accent-c={p.accent}>
          <div class="pack-art">
            <div class="stack s2"><Thumb id={p.pictures[2].id} radius={12} /></div>
            <div class="stack s1"><Thumb id={p.pictures[1].id} radius={12} /></div>
            <div class="stack s0"><Thumb id={p.pictures[0].id} alt={p.title} radius={12} /></div>
            {#if MONETISATION && !isUnlocked(p)}<span class="lock"><Icon name="lock" size={16} /></span>{/if}
          </div>
          <div class="pack-meta">
            <span class="pack-title">{p.title}</span>
            <span class="pack-sub">{n ? `${n} of ${total(p.id)} done` : p.blurb}</span>
          </div>
          {#if n === total(p.id)}<span class="badge"><Icon name="trophy" size={14} /></span>{/if}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <div class="section-head"><h2>Your pictures</h2></div>
    <div class="scroll-x">
      <button class="mine add" onclick={() => fileInput.click()}>
        <span class="add-icon"><Icon name="upload" size={22} /></span>
        <span>Make a puzzle from a photo</span>
      </button>
      {#each mine as m (m.id)}
        <button class="mine" onclick={() => openSetup(m.id)}>
          <div class="cont-art"><Thumb id={m.id} alt={m.title} /></div>
          <span class="cont-title">{m.title}</span>
        </button>
      {/each}
    </div>
    <input type="file" accept="image/*" bind:this={fileInput} onchange={onFile} hidden />
  </section>

  {#if !install.installed && (install.available || install.ios)}
    <section class="install">
      <div class="ins-icon"><img src="./icons/icon-192.png" alt="" width="56" height="56" /></div>
      <div class="ins-text">
        <b>Put Quiet Pieces on your home screen</b>
        <p>{showIosTip ? 'Tap the Share button in Safari, then “Add to Home Screen”.' : 'Opens like an app, full screen, and works without internet.'}</p>
      </div>
      <button class="btn dark small" onclick={addToHome}>{install.available ? 'Install' : 'How?'}</button>
    </section>
  {/if}

  <footer class="foot">
    <p class="foot-brand"><span class="mark small" aria-hidden="true"><Icon name="puzzle" size={14} /></span> Quiet Pieces</p>
    <p>Free jigsaw puzzles. Your progress stays on this device. No account, no ads, no tracking.</p>
  </footer>
</main>

<style>
  .home { max-width: 1120px; margin: 0 auto; padding: calc(12px + var(--safe-top)) 20px calc(40px + var(--safe-bottom)); }
  .top { display: flex; align-items: center; justify-content: space-between; height: 56px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .mark { width: 32px; height: 32px; border-radius: 10px; background: var(--accent); color: #fff; display: grid; place-items: center; transform: rotate(-8deg); box-shadow: 0 4px 12px -4px var(--accent); }
  .word { font-family: var(--display); font-size: 21px; font-weight: 600; letter-spacing: -0.01em; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .level { position: relative; width: 42px; height: 42px; border: none; background: none; padding: 0; display: grid; place-items: center; font-weight: 700; font-size: 14px; }
  .ring { position: absolute; inset: 0; transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 3; }
  .ring .bgc { stroke: var(--line-2); }
  .ring .fg { stroke: var(--accent); stroke-linecap: round; transition: stroke-dasharray 0.6s var(--ease); }

  .welcome { display: grid; grid-template-columns: 1fr; gap: 28px; padding: 18px 0 8px; align-items: center; }
  @media (min-width: 900px) { .welcome { grid-template-columns: 1.05fr 1fr; gap: 48px; padding: 36px 0 20px; } }
  .kicker { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 14px; padding: 6px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 650; font-size: 13px; }
  .kicker .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px rgba(200,85,61,.18); }
  .pitch h1 { font-size: clamp(36px, 5.6vw, 64px); line-height: 1.02; letter-spacing: -0.025em; font-weight: 600; }
  .pitch h1 em { font-style: italic; color: var(--accent); font-weight: 500; }
  .lede { font-size: clamp(16px, 1.6vw, 18.5px); line-height: 1.55; color: var(--ink-2); margin: 18px 0 24px; max-width: 34em; }
  .ctas { display: flex; flex-wrap: wrap; gap: 10px; }
  .btn.big { height: 54px; padding: 0 26px; font-size: 16px; }
  .trust { list-style: none; padding: 0; margin: 22px 0 0; display: grid; gap: 8px; color: var(--ink-2); font-size: 14.5px; }
  .trust li { display: flex; gap: 10px; align-items: center; }
  .trust :global(svg) { color: var(--good); flex: none; }
  .showpiece { position: relative; }
  @media (max-width: 899px) {
    .showpiece { order: -1; margin: 0 6px; }
    .pitch h1 { font-size: clamp(32px, 8.4vw, 44px); }
    .lede { margin: 14px 0 20px; }
    .ctas .btn { flex: 1 1 100%; }
    .f1 { left: -4px; } .f2 { right: -2px; }
  }
  .frame { aspect-ratio: 3 / 2; border-radius: 22px; transform: rotate(1.5deg); background: radial-gradient(120% 90% at 50% 40%, var(--card), var(--bg-2)); box-shadow: var(--shadow-3); border: 1px solid var(--line); overflow: hidden; }
  .float { position: absolute; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; background: var(--card); box-shadow: var(--shadow-2); font-weight: 650; font-size: 13px; animation: bob 4s ease-in-out infinite; }
  .f1 { top: 8%; left: -10px; color: var(--accent); }
  .f2 { bottom: 14%; right: -8px; color: #e8792f; animation-delay: -2s; }
  .caption { display: block; text-align: center; margin-top: 14px; font-size: 12.5px; color: var(--ink-3); }
  @keyframes bob { 50% { transform: translateY(-6px); } }
  .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 30px; }
  .features div { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 18px; box-shadow: var(--shadow-1); }
  .features b { display: block; font-family: var(--display); font-size: 18px; font-weight: 600; margin: 10px 0 4px; }
  .features p { margin: 0; color: var(--ink-2); font-size: 14px; }
  .fi { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
  .install { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 22px; background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow-1); }
  .ins-icon img { border-radius: 14px; display: block; }
  .ins-text { flex: 1; }
  .ins-text p { margin: 2px 0 0; color: var(--ink-2); font-size: 14px; }
  .foot-brand { display: inline-flex; align-items: center; gap: 8px; font-family: var(--display); font-weight: 600; font-size: 16px; color: var(--ink-2); }
  .mark.small { width: 24px; height: 24px; border-radius: 7px; }
  .hello { padding: 18px 0 18px; }
  .hello h1 { font-size: clamp(32px, 6vw, 46px); line-height: 1.05; margin: 6px 0 6px; }
  .hello p { margin: 0; }

  .daily-card {
    position: relative; display: block; width: 100%; aspect-ratio: 16 / 10; max-height: 460px; border: none; padding: 0; overflow: hidden;
    border-radius: 26px; box-shadow: var(--shadow-2); text-align: left; color: #fff; background: #222;
    transition: transform 0.25s var(--ease), box-shadow 0.25s;
  }
  @media (min-width: 760px) { .daily-card { aspect-ratio: 21 / 9; } }
  .daily-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-3); }
  .daily-card:active { transform: scale(0.99); }
  .daily-art { position: absolute; inset: 0; }
  .daily-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.65) 100%); }
  .daily-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px; }
  .daily-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .tag { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border-radius: 999px; background: rgba(255,255,255,.18); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 12.5px; font-weight: 650; }
  .tag.flame { background: rgba(255, 140, 60, .85); }
  .daily-body h2 { font-size: clamp(26px, 4.4vw, 40px); line-height: 1.05; text-shadow: 0 2px 20px rgba(0,0,0,.35); }
  .daily-body p { margin: 6px 0 14px; opacity: .9; }
  .play { pointer-events: none; }
  .daily-body .btn:not(.primary) { background: rgba(255,255,255,.92); color: #1e1b17; }

  section { margin-top: 30px; }
  .section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
  .section-head h2 { font-size: 24px; }
  .section-head .muted { font-size: 13.5px; }

  .cont, .mine { flex: none; width: 200px; border: none; background: none; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 6px; }
  .cont-art { aspect-ratio: 3 / 2; border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-1); }
  .cont-title { font-weight: 600; font-size: 14.5px; }
  .cont-sub { font-size: 13px; color: var(--ink-3); margin-top: -4px; }
  .bar { height: 4px; border-radius: 4px; background: var(--line); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
  .mine.add { aspect-ratio: auto; height: 133px; border: 1.5px dashed var(--line-2); border-radius: 14px; align-items: center; justify-content: center; color: var(--ink-2); font-weight: 550; font-size: 14px; text-align: center; padding: 14px; }
  .add-icon { width: 44px; height: 44px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; }

  .packs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 22px 18px; }
  .pack { position: relative; border: none; background: none; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 12px; }
  .pack-art { position: relative; aspect-ratio: 3 / 2; margin: 8px 10px 0; }
  .stack { position: absolute; inset: 0; border-radius: 12px; box-shadow: var(--shadow-1); transition: transform 0.35s var(--ease); background: var(--bg-2); }
  .s0 { box-shadow: var(--shadow-2); }
  .s1 { transform: rotate(-4deg) translate(-6px, -4px) scale(0.96); opacity: .85; }
  .s2 { transform: rotate(5deg) translate(8px, -6px) scale(0.92); opacity: .7; }
  .pack:hover .s1 { transform: rotate(-7deg) translate(-14px, -6px) scale(0.96); }
  .pack:hover .s2 { transform: rotate(8deg) translate(16px, -8px) scale(0.92); }
  .pack:hover .s0 { transform: translateY(-3px); }
  .lock { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: grid; place-items: center; }
  .pack-meta { display: flex; flex-direction: column; gap: 2px; padding: 0 2px; }
  .pack-title { font-family: var(--display); font-size: 19px; font-weight: 600; position: relative; padding-left: 14px; }
  .pack-title::before { content: ''; position: absolute; left: 0; top: 0.45em; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-c); }
  .pack-sub { font-size: 13.5px; color: var(--ink-3); }
  .badge { position: absolute; top: 0; left: 2px; width: 28px; height: 28px; border-radius: 50%; background: var(--gold); color: #fff; display: grid; place-items: center; box-shadow: var(--shadow-1); z-index: 2; }

  .foot { margin-top: 48px; text-align: center; color: var(--ink-3); font-size: 13px; }
</style>
