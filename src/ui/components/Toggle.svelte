<script lang="ts">
  let { checked = $bindable(false), label, hint = '', onchange }: { checked?: boolean; label: string; hint?: string; onchange?: (v: boolean) => void } = $props();
</script>

<label class="row">
  <span class="text"><span class="label">{label}</span>{#if hint}<span class="hint">{hint}</span>{/if}</span>
  <input type="checkbox" role="switch" bind:checked onchange={() => onchange?.(checked)} />
  <span class="track" aria-hidden="true"><span class="knob"></span></span>
</label>

<style>
  .row { display: flex; align-items: center; gap: 14px; padding: 12px 0; cursor: pointer; position: relative; }
  .text { flex: 1; display: flex; flex-direction: column; }
  .label { font-weight: 550; }
  .hint { font-size: 13px; color: var(--ink-3); }
  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .track { width: 48px; height: 28px; border-radius: 999px; background: var(--line-2); position: relative; transition: background 0.2s; flex: none; }
  .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform 0.22s var(--ease); }
  input:checked + .track { background: var(--accent); }
  input:checked + .track .knob { transform: translateX(20px); }
  input:focus-visible + .track { outline: 2.5px solid var(--accent); outline-offset: 2px; }
</style>
