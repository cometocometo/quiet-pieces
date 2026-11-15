<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from './Icon.svelte';

  let { open, onclose, label, children, wide = false }: { open: boolean; onclose: () => void; label: string; children: Snippet; wide?: boolean } = $props();
  let panel = $state<HTMLDivElement>();

  $effect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    queueMicrotask(() => panel?.focus());
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  });
</script>

{#if open}
  <div class="backdrop" transition:fade={{ duration: 180 }} onclick={onclose} aria-hidden="true"></div>
  <div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={label} tabindex="-1" bind:this={panel}
    transition:fly={{ y: 40, duration: 260, easing: cubicOut }}>
    <button class="close icon-btn" onclick={onclose} aria-label="Close"><Icon name="close" /></button>
    {@render children()}
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(18, 15, 12, 0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 50; }
  .sheet {
    position: fixed; z-index: 51; left: 50%; bottom: 0; transform: translateX(-50%);
    width: min(560px, 100vw); max-height: 92vh; overflow: auto;
    background: var(--card); border-radius: 24px 24px 0 0; box-shadow: var(--shadow-3);
    padding: 22px 22px calc(22px + var(--safe-bottom)); outline: none;
  }
  .sheet.wide { width: min(720px, 100vw); }
  @media (min-width: 700px) {
    .sheet { bottom: auto; top: 50%; transform: translate(-50%, -50%); border-radius: 24px; }
  }
  .close { position: absolute; top: 14px; right: 14px; z-index: 2; }
</style>
