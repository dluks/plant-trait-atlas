<script lang="ts">
  import { regionsReady, view } from '#lib/app.svelte.ts';
  import { TRAITS } from '#lib/data/traits.ts';
  import { isRegionLayer, type Layer } from '#lib/selection.ts';

  // One list. The active layer is what the map shows and what a click selects:
  // a 1 km cell on the data layers, a whole region on the two region layers.
  const DATA: [Layer, string][] = [
    ['pca', 'PCA · PC1 × PC2'],
    ['trait', 'Trait mean'],
    ['raoq', "Rao's Q"],
    ['fdis', 'Functional dispersion'],
    ['aoa', 'Area of applicability']
  ];
  const REGIONS: [Layer, string][] = [
    ['biome', 'Biomes'],
    ['ecoregion', 'Ecoregions']
  ];
</script>

<div class="card">
  <fieldset>
    <legend class="kicker">Map layer · click selects a cell</legend>
    {#each DATA as [id, name] (id)}
      <label class="opt"><input type="radio" name="layer" value={id} bind:group={view.layer} />{name}</label>
    {/each}
  </fieldset>
  {#if view.layer === 'trait'}
    <select aria-label="Trait" bind:value={view.layerTrait}>
      {#each TRAITS as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
    </select>
  {/if}
  <hr />
  <fieldset>
    <legend class="kicker">Regions · click selects a region</legend>
    {#each REGIONS as [id, name] (id)}
      <label class="opt"><input type="radio" name="layer" value={id} bind:group={view.layer} />{name}</label>
    {/each}
  </fieldset>

  {#if isRegionLayer(view.layer)}
    <p class="note">
      Click a {view.layer === 'biome' ? 'biome' : 'ecoregion'} to see its mean distribution of each trait (Olson et al. 2001).
      {#if !regionsReady[view.layer]}<br /><span class="warn">Preview: boundaries arrive with the data job, so the region picked here is a placeholder.</span>{/if}
    </p>
  {:else if view.layer === 'pca'}
    <div class="legend">
      <div class="key" aria-hidden="true">
        {#each ['#be64ac', '#8c62aa', '#3b4994', '#dfb0d6', '#a5add3', '#5698b9', '#e8e8e8', '#ace4e4', '#5ac8c8'] as c (c)}<div style="background: {c}"></div>{/each}
      </div>
      <div class="note">→ PC1 plant size<br />↑ PC2 cold–dry tolerance<br /><span class="gray"></span> outside AOA</div>
    </div>
  {/if}
</div>

<style>
  .card { position: absolute; left: 16px; top: 16px; z-index: 2; width: 280px; background: #fff; border: 1px solid #d4d4d8; border-radius: 10px; padding: 14px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; max-height: calc(100% - 32px); overflow: auto; }
  fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .kicker { padding: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #52525b; }
  .opt { display: flex; align-items: center; gap: 8px; min-height: 32px; font-size: 14px; cursor: pointer; }
  .opt input { margin: 0; accent-color: #18181b; }
  hr { width: 100%; margin: 0; border: 0; border-top: 1px solid #e4e4e7; }
  select { height: 36px; padding: 0 8px; border: 1px solid #d4d4d8; border-radius: 8px; font: inherit; font-size: 14px; background: #fff; }
  .note { margin: 0; font-size: 12px; color: #52525b; line-height: 1.5; }
  .warn { color: #78350f; }
  .legend { display: flex; gap: 12px; align-items: center; }
  .key { display: grid; grid-template-columns: repeat(3, 16px); grid-template-rows: repeat(3, 16px); }
  .gray { display: inline-block; width: 10px; height: 10px; background: #bdbdbd; }
  @media (max-width: 760px) { .card { width: auto; right: 64px; } }
</style>
