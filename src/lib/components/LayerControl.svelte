<script lang="ts">
  import { DATA_URL, select, source, tiles, ui, view } from '#lib/app.svelte.ts';
  import { tileLayerId } from '#lib/data/tiles.ts';
  import { BIOME_COLORS, BIOMES } from '#lib/data/biomes.ts';
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
  // A legend hover never outlives a layer switch (the list unmounts without a mouseleave).
  $effect(() => {
    void view.layer;
    ui.legendBiome = '';
  });

  // The legend of the active data layer, from tiles.json (absent on the preview build).
  const legend = $derived(tiles.index?.layers.find((l) => l.id === tileLayerId(view.layer, view.layerTrait)));
  const gradient = (colors: string[]) => `linear-gradient(to right, ${colors.join(', ')})`;
  const maskNote = (mask?: string) =>
    mask?.startsWith('aoa_hydraulic') ? 'outside the hydraulic AOA' : mask?.startsWith('aoa') ? 'outside the AOA' : 'no value';

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
      {view.layer === 'biome' ? 'Hover a biome to see everywhere it occurs; click it' : 'Ecoregions are colored by their biome; hover a biome below to see all of its ecoregions. Click an ecoregion'} to see its mean distribution of each trait. Olson et al. (2001).
    </p>
    <ul class="biomes">
      {#each BIOMES as name, i (name)}
        {@const id = String(i + 1)}
        <li onmouseenter={() => (ui.legendBiome = id)} onmouseleave={() => (ui.legendBiome = '')}>
          {#if view.layer === 'biome'}
            <button type="button" aria-pressed={view.selection?.kind === 'region' && view.selection.scheme === 'biome' && view.selection.id === id}
              onclick={() => select({ kind: 'region', scheme: 'biome', id, name })}>
              <span class="sw" style="background: {BIOME_COLORS[i]}"></span>{name}
            </button>
          {:else}
            <span class="row"><span class="sw" style="background: {BIOME_COLORS[i]}"></span>{name}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if legend?.type === 'bivariate'}
    <div class="legend">
      <div class="keywrap">
        <img class="pcakey" src="{DATA_URL}/tiles/{legend.key}" alt="" width="64" height="64" />
      </div>
      <div class="note">→ PC{legend.x_axis.pc} {legend.x_axis.name.toLowerCase()}<br />↑ PC{legend.y_axis.pc} {legend.y_axis.name.toLowerCase()}<br /><span class="gray"></span> {maskNote(legend.mask)}</div>
    </div>
  {:else if legend?.type === 'continuous'}
    {@const unit = legend.trait ? source.unit(legend.trait) : (legend.units ?? '')}
    <div class="bar">
      <div class="ramp" style="background: {gradient(legend.colors)}"></div>
      <div class="ticks">
        {#each legend.ticks as t (t.value)}
          {@const at = ((t.value - legend.vmin) / (legend.vmax - legend.vmin)) * 100}
          <span style="left: {at}%; transform: translateX({at <= 0 ? 0 : at >= 100 ? -100 : -50}%)">{t.label}</span>
        {/each}
      </div>
      <p class="note">{legend.trait ? 'Mean of each cell\'s distribution' : legend.title}{unit ? `, ${unit}` : ''}. <span class="gray"></span> {maskNote(legend.mask)}</p>
    </div>
  {:else if legend?.type === 'categorical'}
    <ul class="classes">
      {#each legend.classes as c (c.code)}
        <li><span class="sw" style="background: {c.color}"></span>{c.label}</li>
      {/each}
    </ul>
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
  .biomes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .biomes button, .biomes .row { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 26px; padding: 2px 4px; border: 0; border-radius: 4px; background: none; font: inherit; font-size: 12px; color: #3f3f46; text-align: left; line-height: 1.25; }
  .biomes button { cursor: pointer; }
  .biomes button:hover, .biomes button[aria-pressed='true'] { background: #f4f4f5; color: #18181b; }
  .sw { flex-shrink: 0; width: 12px; height: 12px; border-radius: 2px; }
  .legend { display: flex; gap: 12px; align-items: center; }
  .key { display: grid; grid-template-columns: repeat(3, 16px); grid-template-rows: repeat(3, 16px); }
  .keywrap { flex-shrink: 0; }
  .pcakey { display: block; width: 64px; height: 64px; image-rendering: auto; }
  .bar { display: flex; flex-direction: column; gap: 4px; }
  .ramp { height: 12px; border-radius: 2px; }
  .ticks { position: relative; height: 16px; font-size: 11px; color: #3f3f46; }
  .ticks span { position: absolute; white-space: nowrap; }
  .classes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #3f3f46; }
  .classes li { display: flex; align-items: center; gap: 8px; }
  .gray { display: inline-block; width: 10px; height: 10px; background: #bdbdbd; }
  @media (max-width: 760px) { .card { width: auto; right: 64px; } }
</style>
