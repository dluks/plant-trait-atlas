<script lang="ts">
  import { select, view } from '#lib/app.svelte.ts';
  import { BIOMES } from '#lib/data/biomes.ts';
  import { TRAITS } from '#lib/data/traits.ts';
  import type { Layer, Overlay } from '#lib/selection.ts';

  const LAYERS: [Layer, string][] = [
    ['pca', 'PCA · PC1 × PC2'],
    ['trait', 'Trait mean'],
    ['raoq', "Rao's Q"],
    ['fdis', 'Functional dispersion'],
    ['aoa', 'Area of applicability']
  ];
  const OVERLAYS: [Overlay, string][] = [['none', 'None'], ['biome', 'Biomes'], ['ecoregion', 'Ecoregions']];
</script>

<div class="card">
  <label class="kicker" for="layer">Map layer</label>
  <select id="layer" bind:value={view.layer}>
    {#each LAYERS as [id, name] (id)}<option value={id}>{name}</option>{/each}
  </select>
  {#if view.layer === 'trait'}
    <label class="kicker" for="layer-trait">Trait</label>
    <select id="layer-trait" bind:value={view.layerTrait}>
      {#each TRAITS as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
    </select>
  {/if}
  <span class="kicker">Regions</span>
  <div class="seg" role="group" aria-label="Region overlay">
    {#each OVERLAYS as [id, name] (id)}
      <button type="button" aria-pressed={view.overlay === id} onclick={() => (view.overlay = id)}>{name}</button>
    {/each}
  </div>
  {#if view.overlay === 'biome'}
    <label class="kicker" for="biome">Biome</label>
    <select id="biome" onchange={(e) => select({ kind: 'region', scheme: 'biome', id: e.currentTarget.value })}>
      <option value="">Choose a biome</option>
      {#each BIOMES as b (b)}<option value={b}>{b}</option>{/each}
    </select>
    <span class="note">Clickable boundaries arrive with the data job.</span>
  {:else if view.overlay === 'ecoregion'}
    <span class="note">Ecoregion boundaries arrive with the data job.</span>
  {/if}
  {#if view.layer === 'pca'}
    <div class="legend">
      <div class="key" aria-hidden="true">
        {#each ['#be64ac', '#8c62aa', '#3b4994', '#dfb0d6', '#a5add3', '#5698b9', '#e8e8e8', '#ace4e4', '#5ac8c8'] as c (c)}<div style="background: {c}"></div>{/each}
      </div>
      <div class="note">→ PC1 plant size<br />↑ PC2 cold–dry tolerance<br /><span class="gray"></span> outside AOA</div>
    </div>
  {/if}
</div>

<style>
  .card { position: absolute; left: 16px; top: 16px; z-index: 2; width: 300px; background: #fff; border: 1px solid #d4d4d8; border-radius: 10px; padding: 14px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; }
  .kicker { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #52525b; }
  select { height: 40px; padding: 0 8px; border: 1px solid #d4d4d8; border-radius: 8px; font: inherit; font-size: 14px; background: #fff; }
  .seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #d4d4d8; border-radius: 8px; overflow: hidden; }
  .seg button { height: 36px; border: 0; background: #fff; font: inherit; font-size: 13px; cursor: pointer; }
  .seg button + button { border-left: 1px solid #d4d4d8; }
  .seg button[aria-pressed='true'] { background: #18181b; color: #fff; }
  .note { font-size: 12px; color: #52525b; line-height: 1.5; }
  .legend { display: flex; gap: 12px; align-items: center; margin-top: 4px; }
  .key { display: grid; grid-template-columns: repeat(3, 16px); grid-template-rows: repeat(3, 16px); }
  .gray { display: inline-block; width: 10px; height: 10px; background: #bdbdbd; }
  @media (max-width: 760px) { .card { width: auto; right: 64px; } }
</style>
