<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { app } from './state.svelte';
  import Home from '../ui/screens/Home.svelte';
  import Pack from '../ui/screens/Pack.svelte';
  import Play from '../ui/screens/Play.svelte';
  import Profile from '../ui/screens/Profile.svelte';
  import Settings from '../ui/screens/Settings.svelte';
  import Setup from '../ui/screens/Setup.svelte';

  let key = $derived(JSON.stringify(app.screen));
</script>

{#if !app.ready}
  <div class="splash" out:fade={{ duration: 250 }}><span class="mark"></span></div>
{:else}
  {#key key}
    <div class="screen" in:fade={{ duration: 220, delay: 60 }}>
      {#if app.screen.name === 'home'}<Home />
      {:else if app.screen.name === 'pack'}<Pack id={app.screen.id} />
      {:else if app.screen.name === 'play'}<Play saveId={app.screen.save} />
      {:else if app.screen.name === 'profile'}<Profile />
      {:else if app.screen.name === 'settings'}<Settings />
      {/if}
    </div>
  {/key}
  <Setup />
{/if}

{#if app.toast}
  {#key app.toast.id}
    <div class="toast" role="status" transition:fly={{ y: 20, duration: 220 }}>{app.toast.text}</div>
  {/key}
{/if}

<style>
  .splash { position: fixed; inset: 0; display: grid; place-items: center; background: var(--bg); }
  .mark { width: 44px; height: 44px; border-radius: 13px; background: var(--accent); transform: rotate(-8deg); animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: rotate(-8deg) scale(.9); opacity: .7; } }
  .screen { min-height: 100%; }
  .toast { position: fixed; z-index: 90; left: 50%; bottom: calc(24px + var(--safe-bottom)); transform: translateX(-50%); background: var(--ink); color: var(--bg); padding: 12px 18px; border-radius: 14px; box-shadow: var(--shadow-2); font-weight: 550; }
</style>
