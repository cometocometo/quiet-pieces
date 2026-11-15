<script lang="ts">
  import { ACHIEVEMENTS, formatTime, levelOf, streakAlive, titleFor, today } from '../../data/progress';
  import { app, back } from '../../app/state.svelte';
  import Icon from '../components/Icon.svelte';

  let lvl = $derived(levelOf(app.profile.xp));
  let earned = $derived(ACHIEVEMENTS.filter((a) => app.profile.achievements[a.id]).length);
  // last five weeks of daily puzzles, Monday-first
  const days = (() => {
    const out: { date: string; label: number; future: boolean }[] = [];
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 28);
    for (let i = 0; i < 35; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      out.push({ date: today(d), label: d.getDate(), future: d > now });
    }
    return out;
  })();
  const hours = (ms: number) => ms < 3600000 ? `${Math.round(ms / 60000)} min` : `${(ms / 3600000).toFixed(1)} h`;
</script>

<main class="profile">
  <header class="top"><button class="icon-btn" onclick={back} aria-label="Back"><Icon name="back" /></button></header>
  <section class="hero">
    <div class="badge">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" class="bgc" />
        <circle cx="60" cy="60" r="52" class="fg" style:stroke-dasharray="{(lvl.into / lvl.need) * 326.7} 326.7" />
      </svg>
      <div class="num"><b>{lvl.level}</b><span>level</span></div>
    </div>
    <div>
      <p class="eyebrow">Your journey</p>
      <h1>{titleFor(lvl.level)}</h1>
      <p class="muted">{lvl.need - lvl.into} XP to level {lvl.level + 1}</p>
    </div>
  </section>

  <section class="stats">
    <div><b>{app.profile.completed}</b><span>puzzles finished</span></div>
    <div><b>{app.profile.piecesPlaced.toLocaleString()}</b><span>pieces placed</span></div>
    <div><b>{hours(app.profile.totalTime)}</b><span>time puzzling</span></div>
    <div><b>{app.profile.streak.best}</b><span>best daily streak</span></div>
  </section>

  <section>
    <div class="head"><h2>Daily puzzles</h2><span class="chip"><Icon name="flame" size={14} fill /> {streakAlive(app.profile)} day streak</span></div>
    <div class="cal" role="grid" aria-label="Daily puzzles in the last five weeks">
      {#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d}<span class="dow">{d}</span>{/each}
      {#each days as d}
        {@const t = app.profile.daily[d.date]}
        <span class="day" class:done={!!t} class:future={d.future} class:today={d.date === today()} title={t ? `${d.date}: ${formatTime(t)}` : d.date}>{d.label}</span>
      {/each}
    </div>
  </section>

  <section>
    <div class="head"><h2>Achievements</h2><span class="muted">{earned} of {ACHIEVEMENTS.length}</span></div>
    <div class="ach">
      {#each ACHIEVEMENTS as a}
        {@const got = app.profile.achievements[a.id]}
        <div class="a" class:got>
          <span class="ai">{got ? a.icon : '🔒'}</span>
          <span class="at"><b>{a.title}</b><small>{a.text}</small></span>
        </div>
      {/each}
    </div>
  </section>
</main>

<style>
  .profile { max-width: 900px; margin: 0 auto; padding: calc(12px + var(--safe-top)) 20px calc(40px + var(--safe-bottom)); }
  .top { height: 56px; display: flex; align-items: center; }
  .hero { display: flex; align-items: center; gap: 22px; padding: 10px 0 8px; }
  .hero h1 { font-size: clamp(30px, 6vw, 44px); line-height: 1.05; margin: 4px 0; }
  .hero p { margin: 0; }
  .badge { position: relative; width: 112px; height: 112px; flex: none; }
  .badge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .badge circle { fill: none; stroke-width: 9; }
  .bgc { stroke: var(--line); }
  .fg { stroke: var(--accent); stroke-linecap: round; }
  .num { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .num b { font-family: var(--display); font-size: 38px; line-height: 1; }
  .num span { font-size: 12px; color: var(--ink-3); text-transform: uppercase; letter-spacing: .1em; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 24px; }
  .stats div { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; box-shadow: var(--shadow-1); }
  .stats b { font-family: var(--display); font-size: 28px; }
  .stats span { color: var(--ink-3); font-size: 13.5px; }
  section { margin-top: 30px; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .head h2 { font-size: 24px; }
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; max-width: 420px; }
  .dow { text-align: center; font-size: 12px; color: var(--ink-3); font-weight: 600; }
  .day { aspect-ratio: 1; border-radius: 10px; display: grid; place-items: center; font-size: 13px; font-weight: 600; background: var(--bg-2); color: var(--ink-3); }
  .day.done { background: var(--accent); color: #fff; }
  .day.today { box-shadow: inset 0 0 0 2px var(--accent); }
  .day.future { opacity: .35; }
  .ach { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
  .a { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--card); border: 1px solid var(--line); opacity: .55; }
  .a.got { opacity: 1; box-shadow: var(--shadow-1); }
  .ai { font-size: 26px; width: 36px; text-align: center; }
  .at { display: flex; flex-direction: column; }
  .at small { color: var(--ink-3); }
</style>
