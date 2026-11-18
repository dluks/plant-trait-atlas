<script lang="ts">
  import { GROUPS, TRAITS } from '#lib/data/traits.ts';
  import Histogram from './Histogram.svelte';

  type Series = { p: number[]; color: string; band?: { lo: number[]; hi: number[] } };
  let { seriesFor, onopen }: { seriesFor: (traitId: string) => Series[]; onopen: (id: string) => void } = $props();
</script>

<div class="grid-wrap">
  {#each GROUPS as group (group)}
    <section>
      <h2>{group}</h2>
      <div class="grid">
        {#each TRAITS.filter((t) => t.group === group) as t (t.id)}
          <button type="button" class="trait" onclick={() => onopen(t.id)}>
            <span>{t.name}</span>
            <Histogram series={seriesFor(t.id)} />
          </button>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .grid-wrap { display: flex; flex-direction: column; gap: 18px; }
  h2 { margin: 0 0 10px; font-size: 13px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 16px; }
  .trait {
    display: flex; flex-direction: column; gap: 4px; padding: 4px; margin: -4px;
    border: 0; border-radius: 6px; background: none; text-align: left; cursor: pointer;
    font: inherit; color: #3f3f46;
  }
  .trait:hover, .trait:focus-visible { background: #f4f4f5; }
  .trait span { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
